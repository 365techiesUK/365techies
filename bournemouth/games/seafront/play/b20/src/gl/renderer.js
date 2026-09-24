// WebGL2 sea renderer: analytic sky + Gerstner water.
//
// Slice 2 of the plan in salvage/gl/STATUS.md. It renders THE SEA and nothing
// else; the craft, wake and depth ribbon are still drawn by view3d.js on a 2D
// canvas stacked on top, using the identical camera. That split is deliberate -
// it gets the water, which is ~90% of the visual payoff, verified on its own
// before any of the craft work starts.
//
// Everything is compiled at construction. §5 makes shader-compile stutter a
// budget failure, so nothing here may be created lazily on first draw.

import { SEA_GLSL, packWaveUBO, UBO_FLOATS } from '../sea-glsl.js';
import { getContext, link, uniforms, buffer, perspective, viewFromYawPitch, multiply } from './core.js';
import { SKY_VERT, SKY_FRAG, waterVert, waterFrag } from './shaders.js';
import { CraftRenderer, CoastRenderer } from './craft.js';
// tmp-tr71: the line-up on the two banks. Scenery only - see the header of
// surfers.js for the rules it obeys. It never touches the sim.
import { Surfers } from './surfers.js';
// >>> DOLPHINS
import { Dolphins } from './dolphins.js';
import { playerPose } from '../player-pose.js';
// <<< DOLPHINS
import { buildCoast } from './coast.js';
import { OVERCAST } from './craft.js';
import { ShadowMap, SHADOW_GLSL } from './shadow.js';
import { loadTextures } from './textures.js';
// >>> POSTFX
// tmp-tr164: the frame-level post chain - scene into a multisampled FBO, then
// one fullscreen triangle that resolves it, smears it toward the direction of
// travel and vignettes it. NOT a tonemap: the ACES curve stays per material,
// exactly where it was. post.js carries the whole argument, including why the
// pass has to put the scene depth back before raid/rescue draw over it.
import { PostFX } from './post.js';
// <<< POSTFX

const RINGS = 72;
const SEG = 128;
const R0 = 0.6;          // m, first ring - dense right under the board
const RMAX = 1700;       // m, out past the haze

export class SeaRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ok = false;
    this.error = null;
    this.exposure = 1.0;
    // THE SUN GOES OVER THE SEA, NOT OVER THE TOWN.
    //
    // This read normalize3(-0.42, 0.16, -0.30) and its comment claimed it
    // matched "the dawn/evening light in the reference clips" - which it did,
    // because it was set from frames 0588 and 0608, the two SUNSET clips that
    // are explicitly ruled out for colour. Two separate passes then tried to
    // fix a "dull" pier by editing the palette, and neither looked at the light.
    //
    // Two things were wrong with it:
    //   Z NEGATIVE. The sea is +Z, so -0.30 put the sun INLAND - due north of
    //   a south-coast beach, which cannot happen at any hour of any day. Every
    //   camera looking shoreward was therefore back-lit, with the sun disc
    //   hanging over Bournemouth.
    //   Y = 0.16 is 9.2 degrees of elevation. Permanent dusk, all day.
    //
    // Measured against sunny drone frame 0657 before and after this change,
    // with NOT ONE PALETTE VALUE ALTERED:
    //   sand p50   114,113,100 -> 182,169,140   (f657: 205,174,155)
    //   sky horiz  197,209,222 -> 129,176,208   (f657: 153,201,214)
    // Both move decisively toward the reference. The pier was never the wrong
    // colour; it was lit from the wrong side of the sky.
    //
    // Now: high (46 deg) and out over the water, which is a real summer
    // afternoon in Poole Bay and the condition every sunny reference frame was
    // shot in.
    this.sunDir = normalize3(-0.35, 0.72, 0.60);

    const gl = getContext(canvas);
    if (!gl) { this.error = 'WebGL2 unavailable'; return; }
    this.gl = gl;

    // Boot timings: performance.measure entries, readable in DevTools and via
    // performance.getEntriesByType('measure'). Near-zero cost, and the only way
    // to tell a 400 ms construction from a 400 ms first draw.
    const mark = (name, fn) => {
      const t0 = performance.now();
      const r = fn();
      performance.measure('gl:' + name, { start: t0, end: performance.now() });
      return r;
    };

    try {
      mark('programs', () => this._buildPrograms());
      mark('grid', () => this._buildGrid());
      mark('ubo', () => this._buildUBO());
      // Craft last: it needs the mast length, and 0.75 m is the default assist
      // value. setMast() picks up any change before the first frame is drawn.
      this.craft = mark('craft', () => new CraftRenderer(gl, 0.75));
      // ⚠️ The mesh is KEPT, not dropped after upload. boats/hub.js needs a CPU
      // copy to rasterise its obstacle grid, and was rebuilding the whole coast
      // a second time to get one - measured 19 Sep 2026 at 256 ms of the 343 ms
      // freeze that landed one frame after the first paint. hub.js takes this
      // one and sets `coastMesh = null` the moment it is done, so the ~11 MB is
      // held for a second at boot rather than for the session.
      const coastMesh = mark('coast:build', () => buildCoast());
      this.coastMesh = coastMesh;
      this.coast = mark('coast', () => new CoastRenderer(gl, coastMesh));
      // The surfers are built here, not lazily: §5's 400 ms restart budget bans
      // creating anything on a first draw. 3 small meshes, 24 instance slots.
      try { this.surfers = mark('surfers', () => new Surfers(gl)); } catch (e) { this.surfers = null; this.surferWarn = String(e); }
      this._surfT = null;
      // >>> DOLPHINS
      // Built here for the same reason the surfers are: nothing may be created on a first draw.
      // NEVER on a ?cal= render. The surfers only happen to sit outside all 25 judged views; a pod
      // roams the bay and could wander into one and change the measurement, so it is not built at
      // all there. ?dolphins=0 turns them off; ?dolphins=busy shortens the breathing for review;
      // ?dolphins=view|ride|flee stage the pod for filming (see dolphin-pod.js _stageOnce).
      this.dolphins = null;
      this._dolT = null;
      {
        const dq = (typeof location !== 'undefined' && typeof URLSearchParams !== 'undefined')
          ? new URLSearchParams(location.search) : null;
        const off = !dq || dq.has('cal') || dq.get('dolphins') === '0';
        if (!off) {
          try {
            // Review handles: view (pod across the chase camera), ride (pod ahead, for a steady
            // boat to find), flee (pod in the craft's path). Not how they normally appear.
            const dv = dq.get('dolphins') || '';
            const stage = ['view', 'ride', 'flee'].find((k) => dv.includes(k)) || null;
            this.dolphins = mark('dolphins', () => new Dolphins(gl, { busy: /busy|view/.test(dv), stage }));
            if (typeof window !== 'undefined') {
              const D = this.dolphins;
              // console and filming handle: efoilDolphins.summon() brings the pod near the craft
              window.efoilDolphins = {
                get pod() { return D.pod; },
                get stats() { return D.lastStats; },
                get mood() { return D.mood; },
                get sim() { return D.sim; },
                summon: (x, z, dist, heading) => { const P = window.efoil && window.efoil.sim ? playerPose(window.efoil.sim) : { x: 0, z: 0 }; D.summon(x ?? P.x, z ?? P.z, dist, heading); return 'pod summoned'; },
                busy: (on = true) => { D.busy = !!on; return D.busy; },
              };
            }
          } catch (e) { this.dolphins = null; this.dolphinWarn = String(e); }
        }
      }
      // <<< DOLPHINS
      this.shadow = mark('shadow', () => new ShadowMap(gl));
      // >>> POSTFX
      // THE CALIBRATION BYPASS, AND IT IS A BYPASS. On a ?cal= address this
      // object is never built: no program, no framebuffer, no resolve, and the
      // two `if (pfx)` tests in draw() are the only trace of the pass anywhere
      // in the calibration command stream. It is deliberately NOT "the pass
      // with its strengths set to zero" - a zero-strength blur still resamples
      // the frame through a texture filter, and a level here and there is
      // exactly the silent corruption of the 19-view instrument the contract
      // warns about. ?post=0 gives the same bypass by hand, for A/B work.
      //
      // ?pnum=blur:0.2,vig:0.3 pins a strength for tuning; absent, the
      // numbers come from the craft's speed. Same namespace convention as
      // wnum/snum in shaders.js and cdbg in craft.js.
      //
      // The failure mode is loud but not fatal, the way the surfers above are:
      // a driver that will not give a complete multisampled framebuffer leaves
      // postWarn set, status() reports it, and the game draws as it did before.
      const q = (typeof location !== 'undefined' && typeof URLSearchParams !== 'undefined')
        ? new URLSearchParams(location.search) : null;
      this.post = null;
      this.postWarn = null;
      if (!q) this.postWarn = 'no location (node import)';
      else if (q.has('cal')) this.postWarn = 'bypassed: ?cal= calibration render';
      else if (q.get('post') === '0') this.postWarn = 'bypassed: ?post=0';
      else {
        const pnum = Object.fromEntries((q.get('pnum') || '').split(',').filter(Boolean)
          .map((kv) => kv.split(':')).filter((p) => p.length === 2 && isFinite(+p[1]))
          .map((p) => [p[0], +p[1]]));
        try {
          this.post = mark('post', () => new PostFX(gl, pnum));
        } catch (e) {
          this.post = null;
          this.postWarn = String(e && e.message || e);
          console.warn('[gl] post pass disabled:', this.postWarn);
        }
      }
      // <<< POSTFX
      this.ok = true;

      // Textures load AFTER the renderer is already drawing. A slow or failed
      // fetch degrades to the untextured look; it never blocks the first frame,
      // and it never breaks the page.
      this.texStatus = 'loading';
      loadTextures(gl).then((r) => {
        this.coast.setTextures(r.textures);
        this.texStatus = `${r.loaded}/${r.expected}`;
      }).catch((e) => {
        this.texStatus = 'failed: ' + e.message;
        console.warn('[gl]', e.message);
      });
    } catch (e) {
      this.error = e.message;
      return;
    }

    this.viewM = new Float32Array(16);
    this.projM = new Float32Array(16);
    this.vpM = new Float32Array(16);

    gl.clearColor(0.06, 0.07, 0.08, 1);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.disable(gl.BLEND);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
  }

  _buildPrograms() {
    const gl = this.gl;
    const chunk = SEA_GLSL.chunk;

    this.skyProg = link(gl, SKY_VERT, SKY_FRAG, 'sky');
    this.skyU = uniforms(gl, this.skyProg,
      ['uCamRight', 'uCamUp', 'uCamFwd', 'uTanHalfFov', 'uAspect', 'uSunDir', 'uExposure', 'uOvercast']);

    this.waterProg = link(gl, waterVert(chunk), waterFrag(chunk, SHADOW_GLSL), 'water');
    this.waterU = uniforms(gl, this.waterProg,
      ['uViewProj', 'uCenter', 'uTide', 'uCamPos', 'uSunDir', 'uExposure', 'uOvercast',
        'uSurfPhase', 'uSurfSet', 'uSurfCtl',
        'uShadowMap', 'uLightViewProj', 'uShadowTexel']);

    if (this.skyU.$missing.length || this.waterU.$missing.length) {
      // Not fatal on its own - a driver may optimise an unused uniform away -
      // but it is always worth knowing about.
      this.warn = `unused/missing uniforms: sky[${this.skyU.$missing}] water[${this.waterU.$missing}]`;
    }

    // Bind the shared wave table to binding point 0.
    const bi = gl.getUniformBlockIndex(this.waterProg, SEA_GLSL.uboName);
    if (bi === gl.INVALID_INDEX) throw new Error('[gl] uniform block "' + SEA_GLSL.uboName + '" not found');
    gl.uniformBlockBinding(this.waterProg, bi, SEA_GLSL.uboBinding);
  }

  // A polar grid centred on the camera: dense underfoot, coarse at the horizon,
  // and it never needs rebuilding because the vertex shader adds the camera
  // position in world space.
  _buildGrid() {
    const gl = this.gl;
    const growth = Math.pow(RMAX / R0, 1 / (RINGS - 1));
    const verts = new Float32Array((1 + RINGS * SEG) * 2);
    verts[0] = 0; verts[1] = 0;
    let v = 2;
    for (let i = 0; i < RINGS; i++) {
      const r = R0 * Math.pow(growth, i);
      for (let s = 0; s < SEG; s++) {
        const a = (s / SEG) * Math.PI * 2;
        verts[v++] = Math.cos(a) * r;
        verts[v++] = Math.sin(a) * r;
      }
    }

    const idx = new Uint32Array(SEG * 3 + (RINGS - 1) * SEG * 6);
    let n = 0;
    for (let s = 0; s < SEG; s++) {          // centre fan
      idx[n++] = 0;
      idx[n++] = 1 + s;
      idx[n++] = 1 + ((s + 1) % SEG);
    }
    for (let i = 0; i < RINGS - 1; i++) {    // ring quads
      const a = 1 + i * SEG, b = 1 + (i + 1) * SEG;
      for (let s = 0; s < SEG; s++) {
        const s1 = (s + 1) % SEG;
        idx[n++] = a + s; idx[n++] = b + s; idx[n++] = b + s1;
        idx[n++] = a + s; idx[n++] = b + s1; idx[n++] = a + s1;
      }
    }
    this.indexCount = n;

    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    buffer(gl, gl.ARRAY_BUFFER, verts);
    const loc = gl.getAttribLocation(this.waterProg, 'aOffset');
    if (loc < 0) throw new Error('[gl] attribute aOffset not found');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    buffer(gl, gl.ELEMENT_ARRAY_BUFFER, idx);
    gl.bindVertexArray(null);
  }

  _buildUBO() {
    const gl = this.gl;
    this.uboData = new Float32Array(UBO_FLOATS);
    this.ubo = gl.createBuffer();
    gl.bindBuffer(gl.UNIFORM_BUFFER, this.ubo);
    gl.bufferData(gl.UNIFORM_BUFFER, this.uboData.byteLength, gl.DYNAMIC_DRAW);
    gl.bindBufferBase(gl.UNIFORM_BUFFER, SEA_GLSL.uboBinding, this.ubo);
  }

  resize(w, h, dpr) {
    const c = this.canvas;
    c.width = Math.max(1, Math.round(w * dpr));
    c.height = Math.max(1, Math.round(h * dpr));
    this.W = w; this.H = h;
    if (this.gl) this.gl.viewport(0, 0, c.width, c.height);
  }

  // cam: the SAME object view3d.js drives, so the two passes cannot disagree.
  draw(sim, cam, fovY, mode = 'chase') {
    if (!this.ok) return;
    const gl = this.gl;
    const aspect = Math.max(0.01, this.W / this.H);

    // ---- shadow pass ----
    // Fill the depth map from the sun before anything is lit. Casters are the
    // opaque geometry only: the water is a receiver, never a caster.
    if (this.shadow) {
      this.shadow.update(cam.x, cam.z, this.sunDir);
      this.shadow.begin();
      // >>> RAID
      // Viking pier siege hides the pier crowd and every fallen section (ranges on globalThis
      // only while the raid runs): no shadows from them either. tr64: was one range, now several.
      // >>> NOCAST (tmp-tr136)
      // The thin decals are not casters. See craft.js noCastRanges for why: they
      // are smaller than the shadow's own bias, so all they can cast is acne on
      // their own wall, and it leaves the shadow test on a knife edge - tmp-tr136
      // section 5f measured 27,700 px of it flipping on a one-ULP change. The
      // raid's hidden ranges merge into the same sorted list and the loop below
      // is the one that was already here.
      const rr = (globalThis.__raidHideRanges && globalThis.__raidHideRanges.length)
        ? globalThis.__raidHideRanges : [];
      // >>> DECALTIER  the clifftop half is always valid (the raid never moves
      // it); the pier half comes from the permutation when one is in force.
      const rd = globalThis.__raidDecalRanges;
      const nc = this.coast
        ? this.coast.noCastRanges.concat(rd ? rd.noCast : this.coast.noCastPier)
        : [];
      // <<< DECALTIER
      const ks = (nc.length || rr.length)
        ? nc.concat(rr).sort((p, q) => p[0] - q[0]) : null;
      // <<< NOCAST
      if (this.coast && ks) {
        let p = 0;
        for (let k = 0; k < ks.length; k++) {
          if (ks[k][0] > p) this.shadow.drawCaster(this.coast.vao, ks[k][0] - p, gl.UNSIGNED_INT, null, p * 4);
          p = ks[k][1];
        }
        if (this.coast.count > p) this.shadow.drawCaster(this.coast.vao, this.coast.count - p, gl.UNSIGNED_INT, null, p * 4);
      } else
      // <<< RAID
      if (this.coast) this.shadow.drawCaster(this.coast.vao, this.coast.count, gl.UNSIGNED_INT, null);
      // >>> CRAFT
      // A driveable boat replaces the eFoil as the caster. this.boats is set by
      // src/boats/hub.js; absent or inactive, the eFoil branch below runs as before.
      if (this.boats && this.boats.active) this.boats.drawShadow(this.shadow); else
      // <<< CRAFT
      if (this.craft) {
        const s = sim.plant.state, w = sim.world;
        const model = this.craft._setModel(w.x, s.y, w.z, w.heading, s.pitch, w.roll);
        for (const mesh of [this.craft.board, this.craft.foil, this.craft.rider]) {
          this.shadow.drawCaster(mesh.vao, mesh.count, gl.UNSIGNED_SHORT, model);
        }
      }
      this.shadow.end(this.canvas.width, this.canvas.height);
    }

    // >>> POSTFX
    // The chain opens HERE and not at the top of draw(), because the shadow
    // pass above binds its own framebuffer and unbinds to null when it is done
    // - anything bound before it would be thrown away. From this line to the
    // matching fence at the bottom of draw(), every pixel lands in the post
    // FBO instead of on the canvas.
    //
    // ⚠️ TWO GATES, AND BOTH ARE THE INSTRUMENT'S. `this.post` is null outright
    // on a ?cal= address. __calCam catches the other route in: main.js's
    // efoilCal.shot() imposes a calibration camera at runtime and then reads
    // the default framebuffer back with readPixels, so with the pass on it
    // would be reading the post-processed frame. Either way `pfx` is null and
    // everything below is the code path that was here before this fence.
    // The `else` arm is the ORIGINAL line, moved inside the fence rather than
    // duplicated, so there is exactly one place that sets this viewport.
    const pfx = (this.post && !globalThis.__calCam) ? this.post : null;
    if (pfx) pfx.begin(this.canvas.width, this.canvas.height);
    else gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    // <<< POSTFX
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // camera basis, matching core.viewFromYawPitch and view3d.project
    const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw);
    const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
    // Must match core.viewFromYawPitch exactly: right = cross(forward, up).
    const fx = cp * cy, fy = sp, fz = cp * sy;
    let rx = -fz, ry = 0, rz = fx;
    const rl = Math.hypot(rx, ry, rz) || 1; rx /= rl; ry /= rl; rz /= rl;
    const ux = ry * fz - rz * fy, uy = rz * fx - rx * fz, uz = rx * fy - ry * fx;

    // ---- sky ----
    gl.useProgram(this.skyProg);
    gl.depthMask(false);
    gl.uniform3f(this.skyU.uCamRight, rx, ry, rz);
    gl.uniform3f(this.skyU.uCamUp, ux, uy, uz);
    gl.uniform3f(this.skyU.uCamFwd, fx, fy, fz);
    gl.uniform1f(this.skyU.uTanHalfFov, Math.tan(fovY / 2));
    gl.uniform1f(this.skyU.uAspect, aspect);
    gl.uniform3f(this.skyU.uSunDir, this.sunDir[0], this.sunDir[1], this.sunDir[2]);
    gl.uniform1f(this.skyU.uExposure, this.exposure);
    if (this.skyU.uOvercast) gl.uniform1f(this.skyU.uOvercast, OVERCAST.v);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.depthMask(true);

    // ---- water ----
    // (dst, table, t) - the Sea object IS the table; its parallel Float64Arrays
    // are the one wave table the CPU sampler reads.
    packWaveUBO(this.uboData, sim.sea, sim.time);
    gl.bindBuffer(gl.UNIFORM_BUFFER, this.ubo);
    gl.bufferSubData(gl.UNIFORM_BUFFER, 0, this.uboData);
    gl.bindBufferBase(gl.UNIFORM_BUFFER, SEA_GLSL.uboBinding, this.ubo);

    // >>> FARBAND
    // 4,000 -> 16,000 m. THIS IS THE ONE LINE OUTSIDE tr132's REMIT AND IT IS
    // FLAGGED FOR THE OWNER'S DECISION - drop this fence and the far band in
    // coast-far.js is still built but entirely clipped away, costing 224
    // triangles of vertex work and zero pixels. Measured, tmp-tr132:
    //   * FAR 4,000 m CLIPS EVERYTHING PAST IT. Probe slabs at 1,000 / 2,000 /
    //     3,000 / 3,500 / 3,900 m render; slabs at 4,200 / 5,000 / 8,670 /
    //     12,420 m are ABSENT (tmp-tr132/pr/P_probe.png). The far side of
    //     Poole Bay is 5.9-13.0 km away, so all of it is outside the stock
    //     frustum. The furthest band vertex is 13,546 m from the spawn;
    //     16,000 covers it from anywhere in the built world.
    //   * THE COST IS A Z-FIGHT RE-ROLL, NOT A PRECISION LOSS, and the control
    //     proves it: far 4,000 -> 4,400 (a 10% change) moves 68,144 px across
    //     the 19 judged views, MORE than 4,000 -> 16,000 moves (59,385 px).
    //     The clifftop facades' 8-22 cm layer offsets already sit on the depth
    //     buffer's quantisation boundary, so ANY projection change re-dices
    //     which coplanar layer wins the tie. dNDC/dz is 0.16327/z^2 at far
    //     4,000 and 0.16000/z^2 at far 16,000 - 2% apart, because the NEAR
    //     plane (0.08 m) sets depth resolution, not the far one.
    //   * ALL 8 measure.py GATES SURVIVE IT: approach_sky 0 px, entrance_sky
    //     0 px, approach_seamid 0 px, arcade_sea 0 px (four bit-identical),
    //     alongneck_sky 1 px / 1 col (cap 4 / 2), head_sky 4 px / 4 cols
    //     (cap 200 / 6), entrance_sand 1 px on a tone gate.
    // REVERT: put 4000 back and delete this fence. Nothing else depends on it.
    // >>> NEARPLANE
    // NEAR 0.08 -> 0.25 m. OUTSIDE tmp-tr136's BRIEF AND FLAGGED FOR DECISION,
    // the same way tr132 flagged the far plane it is nested inside.
    //
    // WHY. Depth resolution at range is LSB * d^2 / near - the NEAR plane sets
    // it, and 0.08 m is absurdly close for a scene whose content runs 1 m to
    // 16 km. At 400 m one depth step is 11.9 cm, so every decal layer on the
    // East Cliff buildings - the stock 6 cm window quads in coast.js, and
    // clifftop-facades.js's 8-22 cm strips, piers and lips - is 0-2 steps in
    // front of the wall it sits on. They TIE, and which pixel ties is decided
    // by where the depth curve happens to fall on the quantisation grid, which
    // every projection change re-rolls.
    //
    // MEASURED, 19 judged views, far 4,000 -> 4,400 (a 10% control):
    //   near 0.08 -> 68,160 px move, max delta 138   (the reported bug)
    //   near 0.25 -> 15,136 px move, max delta 104   (this line, 4.5x fewer)
    //   near 0.50 ->  7,959 px move, max delta  84   (8.6x, but see below)
    //
    // WHY 0.25 AND NOT 0.50, SETTLED BY RENDERING THE FPV FRAME. Do not raise
    // this number without re-running tmp-tr136/mkfpv.py. What clips first is
    // NOT the craft - it is the SEA. The sea grid is centred on the camera with
    // its first ring at R0 = 0.6 m, which looks safe, but Gerstner displacement
    // lifts that ring and in a wipeout the eye is only 0.35 m above the craft
    // (view3d.js:102), so the displaced water comes inside the near plane and
    // is cut away, leaving flat background grey where the sea should be.
    // Measured on the real FPV wipeout camera, ?rdbg=norider (FPV does not draw
    // the rider - craft.js:1542), vs near 0.08:
    //   near 0.25 ->     689 px, max delta  77   clean
    //   near 0.30 ->     700 px, max delta  77   clean
    //   near 0.35 ->  25,976 px, max delta 225   HOLE opens, bottom-right
    //   near 0.50 -> 118,234 px, max delta 226   a THIRD of the frame is void
    // tmp-tr136/fpv050/FPV_wipeout.png is the picture. The board is visible
    // THROUGH the hole - it is not what was clipped, it is what the missing
    // water was hiding. FPV upright is untouched at every value (nearest drawn
    // craft vertex 1.481 m). None of the 19 judged views can see any of this:
    // they are all external calibration cameras.
    // ⚠️ That margin is measured on ONE frozen sea state (the spawn, ?hold=1).
    // A bigger wave brings the surface closer, so 0.30 is NOT safe in general.
    //
    // THIS IS MITIGATION, NOT A CURE. It moves the tie threshold out; it does
    // not remove ties. 15,136 px still move. The cure is a per-layer depth
    // bias in clip space, which is projection-proof by construction and is
    // specified and proven in simulation in tmp-tr136/RESULT.md section 4.
    //
    // REVERT: put 0.08 back and delete this fence. Nothing else depends on it.
    perspective(this.projM, fovY, aspect, 0.25, 16000);
    // <<< NEARPLANE
    // <<< FARBAND
    viewFromYawPitch(this.viewM, cam.x, cam.y, cam.z, cam.yaw, cam.pitch);
    multiply(this.vpM, this.projM, this.viewM);

    gl.useProgram(this.waterProg);
    gl.uniformMatrix4fv(this.waterU.uViewProj, false, this.vpM);
    gl.uniform2f(this.waterU.uCenter, cam.x, cam.z);
    gl.uniform1f(this.waterU.uTide, sim.sea.tide || 0);
    gl.uniform3f(this.waterU.uCamPos, cam.x, cam.y, cam.z);
    gl.uniform3f(this.waterU.uSunDir, this.sunDir[0], this.sunDir[1], this.sunDir[2]);
    gl.uniform1f(this.waterU.uExposure, this.exposure);
    if (this.waterU.uOvercast) gl.uniform1f(this.waterU.uOvercast, OVERCAST.v);
    // ---- surf (tmp-tr71) ---------------------------------------------------
    // TIME NEVER ENTERS THE SHADER, for the same float32 reason sea-glsl.js
    // gives for the wave table: these three come out of the Sea object, wrapped
    // in doubles, so the drawn wave and the ridden wave are the same wave.
    if (this.waterU.uSurfPhase) {
      const su = sim.sea.surfUniforms(sim.time);
      gl.uniform1f(this.waterU.uSurfPhase, su.phase);
      gl.uniform1f(this.waterU.uSurfSet, su.set);
      gl.uniform1f(this.waterU.uSurfCtl, su.ctl);
    }
    if (this.shadow) this.shadow.bind(gl, this.waterProg, this.waterU);

    gl.bindVertexArray(this.vao);
    // The polar grid is symmetric, so back-face culling would remove half of it
    // depending on which way the camera looks. Cheaper to disable than to fix
    // the winding per quadrant.
    gl.disable(gl.CULL_FACE);
    gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_INT, 0);
    gl.bindVertexArray(null);

    // ---- coast ----
    // Before the craft, after the water: it is opaque and mostly far away, so
    // it fills the depth buffer cheaply behind everything else.
    if (this.coast) this.coast.draw(cam, this.vpM, this.sunDir, this.exposure, this.shadow);

    // ---- the line-up (tmp-tr71) -------------------------------------------
    // After the coast, before the craft, into the same depth buffer. It reads
    // the Sea object and writes NOTHING back: no sim state, no obstacle list, no
    // collision shape. A surfer cannot be hit and cannot block a craft.
    if (this.surfers) {
      const t = sim.time;
      const dt = this._surfT === null ? 1 / 60 : Math.max(0, Math.min(0.25, t - this._surfT));
      this._surfT = t;
      this.surfers.update(sim.sea, t, dt);
      // >>> ENVREF  The line-up was the one lit draw in this file that never
      // got the shadow map, so it was lit flat in every condition. It still
      // does not CAST - the depth pass below does not draw it.
      this.surfers.draw(cam, this.vpM, this.sunDir, this.exposure, t, this.shadow);
      // <<< ENVREF
    }

    // >>> DOLPHINS
    // After the surfers, before the craft, into the same depth buffer - the water above has
    // already written its depth, so only what breaks the surface is seen. Read-only on the sim.
    // HIDDEN IN THE RAIDS (raid, pirate and harbour gate all run under body.raid - the only levels
    // with a weapon). The auto-aim only ever picks a ship, but a dolphin surfacing in the line of
    // fire would look like it was being shot at. They are simply not there when anything can fire.
    if (this.dolphins) {
      const inRaid = typeof document !== 'undefined' && document.body && document.body.classList.contains('raid');
      this.dolphins.hidden = inRaid;
      if (!inRaid) {
        const t = sim.time;
        const dt = this._dolT === null ? 1 / 60 : Math.max(0, Math.min(0.25, t - this._dolT));
        this._dolT = t;
        this.dolphins.update(sim.sea, t, dt, playerPose(sim));
        this.dolphins.draw(cam, this.vpM, this.sunDir, this.exposure, t, this.shadow);
      } else {
        this._dolT = null;
      }
    }
    // <<< DOLPHINS

    // ---- craft ----
    // Drawn after the water and depth-tested against it, so the submerged mast
    // and wing are occluded correctly while still being visible through the
    // surface via the shader's own absorption term.
    // >>> CRAFT
    if (this.boats && this.boats.active) {
      this.boats.draw(cam, this.vpM, this.sunDir, this.exposure, this.shadow, mode, sim.sea, sim.time, this.canvas.height, fovY);
    } else
    // <<< CRAFT
    if (this.craft) this.craft.draw(sim, cam, this.vpM, this.sunDir, this.exposure, this.shadow, mode);

    // >>> POSTFX
    // Resolve, smear, vignette, present - and stamp the scene depth back into
    // the default framebuffer so that raid-actors.js and rescue-actors.js,
    // which main.js draws NEXT and into the default framebuffer, still occlude
    // against the pier and the sea. post.js section 3 has the measurements
    // behind that; section 4 is honest about what it does not cover.
    //
    // update() is called here rather than beside begin() because it needs the
    // camera basis, which draw() computes below the fence above. The basis
    // constants are still in scope, and using THEM rather than recomputing is
    // the point: the blur's sharp point cannot disagree with the camera that
    // drew the frame.
    if (pfx) {
      pfx.boats = (this.boats && this.boats.active) ? this.boats : null;
      this._pctx = pfx.update(sim, cam, { rx, ry, rz, ux, uy, uz, fx, fy, fz },
        Math.tan(fovY / 2), aspect);
      // `deferPost` leaves the post FBO BOUND when draw() returns, so whatever
      // main.js draws next - the raid longships, the rescue actors - lands in
      // it and gets smeared and vignetted with the rest of the frame. The
      // caller then owes an applyPost(). It is OFF by default because turning
      // it on is a main.js edit and main.js belongs to another builder; if it
      // is ever on and applyPost() is not called, the canvas stays black, which
      // is the loud failure and not the quiet one.
      if (!this.deferPost) { pfx.end(this._pctx); this._pctx = null; }
    }
    // <<< POSTFX
  }

  // >>> POSTFX
  // Present a deferred post frame. Returns false when there was nothing
  // pending, so a caller can tell "off" from "already done".
  applyPost() {
    if (!this.post || !this._pctx) return false;
    this.post.end(this._pctx);
    this._pctx = null;
    return true;
  }
  // <<< POSTFX

  // Post-construction health report, for the integrator and the console.
  status() {
    if (!this.gl) return { ok: false, error: this.error };
    const gl = this.gl;
    const errs = [];
    let e;
    while ((e = gl.getError()) !== gl.NO_ERROR) errs.push(e);
    return {
      ok: this.ok,
      error: this.error,
      warn: this.warn || null,
      glErrors: errs,
      indexCount: this.indexCount,
      skyLinked: this.skyProg ? gl.getProgramParameter(this.skyProg, gl.LINK_STATUS) : false,
      waterLinked: this.waterProg ? gl.getProgramParameter(this.waterProg, gl.LINK_STATUS) : false,
      textures: this.texStatus || 'none',
      // >>> POSTFX
      // Never "on" as a bare boolean: a pass that built but never resolved a
      // frame, and a pass that was bypassed on purpose, are different answers
      // and only one of them is a bug.
      post: this.post ? { ...this.post.stat, blur: +this.post.blur.toFixed(3) } : (this.postWarn || 'off'),
      // <<< POSTFX
    };
  }
}

function normalize3(x, y, z) {
  const l = Math.hypot(x, y, z) || 1;
  return [x / l, y / l, z / l];
}
