// THE POST PASS (tmp-tr164). Scene -> framebuffer -> fullscreen triangle.
//
// The game had no post chain at all before this. The only tonemap in the tree
// was, and still is, the per-material aces()/encode() pair in shaders.js,
// craft.js and boats.js; NOTHING was moved into this pass. What this adds is
// two frame-level effects that the per-material path structurally cannot do: a
// speed-scaled zoom blur and a vignette. The GLSL is in shaders.js behind the
// same POSTFX fence; this file is the plumbing.
//
// ---------------------------------------------------------------------------
// WHY THE CHAIN IS SHAPED THE WAY IT IS. Four constraints, all of them measured
// on this machine (RTX 3090 / ANGLE D3D11) on 19 Sep 2026, not assumed:
//
// 1. THE DEFAULT FRAMEBUFFER IS 4x MULTISAMPLED. core.js asks for
//    antialias: true and gets SAMPLES = 4. Rendering the scene into a plain
//    single-sample FBO would throw that away on every railing, stay and mast in
//    the scene. So the scene FBO is MULTISAMPLED TOO, at the same sample count,
//    and is resolved with blitFramebuffer. MSAA survives the post chain.
//
// 2. copyTexSubImage2D CANNOT READ THE DEFAULT FRAMEBUFFER HERE. The obvious
//    cheap route - leave the scene where it is, copy it into a texture, draw
//    the post triangle back over it - is illegal: a copy whose read framebuffer
//    has SAMPLE_BUFFERS > 0 is INVALID_OPERATION, and the default framebuffer
//    has it. MEASURED: gl.getError() == 1282 immediately after the copy.
//    readPixels is special-cased and works, which is why main.js's
//    efoilCal.shot() can do it; copyTexSubImage2D is not.
//
// 3. THE SCENE DEPTH HAS TO BE PUT BACK IN THE DEFAULT FRAMEBUFFER.
//    raid-actors.js and rescue-actors.js draw into the default framebuffer
//    AFTER SeaRenderer.draw() has returned (main.js calls raid.frame() /
//    rescue.frame() next), and they depth-test against the scene. Move the
//    scene into an FBO and the default framebuffer's depth is never written, so
//    a longship would draw in front of the pier it is moored against.
//    Blitting the depth back is not available: MSAA-FBO -> default framebuffer
//    with DEPTH_BUFFER_BIT is INVALID_OPERATION (measured, 1282) because the
//    draw framebuffer is itself multisampled. So the depth is RESOLVED into a
//    depth TEXTURE (MSAA -> single sample, measured legal, error 0) and the
//    post fragment shader writes gl_FragDepth from it. One fullscreen depth
//    write, exact values, no format matching, no extension.
//    The restored depth is sample-resolved, so along a scene silhouette the
//    default framebuffer now holds one depth for all four samples where it used
//    to hold four. Anything drawn afterwards can therefore differ by at most a
//    sub-pixel sliver at a silhouette. Nothing else about it changes.
//
// 4. WHAT IS NOT COVERED, SAID PLAINLY. Because raid and rescue draw after this
//    pass, THEIR actors are not blurred or vignetted. The pass covers everything
//    SeaRenderer draws - sky, water, coast, surfers, the player's craft - which
//    is the whole frame in free ride and everything but the longships and crews
//    in a raid. Closing that needs one line in main.js, which this builder does
//    not own: set seaGL.deferPost = true and call seaGL.applyPost() after
//    raid.frame() / rescue.frame(). The seam is implemented here and is OFF by
//    default, so nothing changes until the owner turns it on.
//
// ---------------------------------------------------------------------------
// THE CALIBRATION BYPASS. renderer.js never constructs this class on a ?cal=
// render, so under calibration there is no FBO, no program, no resolve and no
// extra GL call - the command stream is the one that was there before this file
// existed. Do not weaken that into a zero-strength uniform: a zero-strength
// blur still resamples through a texture filter and would move tone numbers by
// a level here and there, which is exactly the silent corruption the contract
// warns about.

import { link, uniforms } from './core.js';
import { POST_VERT, POST_FRAG } from './shaders.js';

// Speed ramp, m/s. The eFoil tops out near 13.9 m/s (50 km/h), the jetski near
// 27 and the speedboat above it, so one absolute ramp has to serve all three.
// KNEE is walking-pace-on-water: below it nothing smears at all, which keeps
// the front door and every menu-ish moment clean. FULL is short of the jetski's
// top so the last few mph still read as "flat out" rather than as a plateau.
const KNEE = 5.0;
// 2026-09-19, owner's verdict on the first build: "the motion blur looks rubbish."
// It was right. FULL was 22.0, which the jetski clears on any ordinary straight, so
// the frame sat at PEAK smear for most of a run and the effect stopped being a
// speed cue and became the permanent look of the game. 27.0 is just under the
// jetski's 28.6 top, so full smear is now genuinely flat out.
const FULL = 27.0;
// Peak smear, as a fraction of the focus-to-pixel distance. This was 0.11 - about
// 140 px of travel at 1280 wide - which turned the pier and the longships to mush
// and buried the very geometry the rest of this project exists to get right.
// 0.038 is roughly a third of that: enough to read as motion at the edges of vision,
// not enough to destroy a silhouette.
const BLUR_MAX = 0.038;
// Vignette. BASE is always on and is genuinely subtle; SPEED is added on top at
// full smear, and the inner radius tightens from R0_SLOW to R0_FAST with it.
// R0_FAST was 0.50, which closed the frame down hard at speed and compounded the
// soupiness; 0.60 keeps the corners doing the work.
const VIG_BASE = 0.16;
const VIG_SPEED = 0.09;
const R0_SLOW = 0.66;
const R0_FAST = 0.60;
// Smoothing time constant for the strength and for the direction of travel.
// Throttle chop and wave slap move the speed by a few m/s inside a tenth of a
// second; without this the blur flickers and the flicker is the tell.
const TAU = 0.13;

// ---------------------------------------------------------------------------
// SPRAY-ON-LENS DROPLETS: BUILT, JUDGED, CUT. Not "not attempted".
//
// The brief asked for them only if the blur and the vignette landed cleanly,
// and said to drop them if they read as tacky. They were implemented - a
// uniform array of up to eight discs, spawned off the events the sim already
// publishes (PlaneHull.slams with its recorded g for the boats, the eFoil
// crossing into or out of DOWN), each one magnifying what is behind it the way
// a real droplet on glass does. Two rounds of rendered evidence, both at
// 884x405 on the real GPU, in tmp-tr164/shots/:
//
//   F_drops.png        four droplets, r 0.04-0.08 of frame height, the tuned
//                      strength. INVISIBLE. A droplet's magnification is
//                      strongest at mid-radius and there it moved the image by
//                      about two pixels - nothing, over water and sky, which is
//                      almost all of this game's frame and is almost all
//                      low-frequency.
//   G_drops_strong.png the same droplets at the strength needed to SEE them
//                      (centre pull ~1.0, a full inversion). The frame stops
//                      reading as droplets and starts reading as the whole shot
//                      going soft with a wandering focus - because displacing
//                      the sample point also displaces the zoom blur's origin,
//                      so every droplet drags the speed streaks with it.
//
// Between invisible and wrong there was no tuning window. Doing it properly
// needs a separate localised pass with its own meniscus normal that does NOT
// feed the blur origin - a second render target for a garnish, on the effect
// the brief itself called the one most likely to look cheap. So it is out, and
// the uniform array, the spawner and the shader loop went with it rather than
// being left behind a flag: dead code in a per-pixel loop is not free and is
// not honest about what ships.
// ---------------------------------------------------------------------------

export class PostFX {
  // `tune` is the parsed ?pnum= table from renderer.js, or null.
  constructor(gl, tune) {
    this.gl = gl;
    this.tune = tune || {};
    this.w = 0; this.h = 0;
    this.samples = 0;
    this.open = false;          // true between begin() and end()
    // Smoothed state.
    this.blur = 0;
    this.vdir = null;           // unit direction of travel, world space
    this.clock = null;          // performance.now() at the last update()
    this.boats = null;          // set by renderer.js when a boat is driving
    // Reported by renderer.status(), so a broken pass is visible, not silent.
    this.stat = { built: false, frames: 0, samples: 0 };

    // Section 5 of the plan bans creating anything on a first draw, so the
    // program is built now, at construction, with everything else.
    this.prog = link(gl, POST_VERT, POST_FRAG, 'post');
    this.u = uniforms(gl, this.prog, ['uScene', 'uDepth', 'uFocus', 'uBlur', 'uVig',
      'uVigR0', 'uAspect', 'uJitter']);
    // An empty VAO. drawArrays with no enabled attribute arrays is legal, but a
    // VAO left bound by an earlier pass with ITS attributes enabled is not
    // something this pass should be at the mercy of.
    this.vao = gl.createVertexArray();
    // Allocated NOW, at the drawing buffer's current size, for the same reason
    // the program is compiled now: nothing expensive may appear on a first
    // draw. resize() will hand begin() a different size a moment later and it
    // reallocates then, which costs one throwaway pair of framebuffers at boot
    // and buys a first frame that allocates nothing.
    this._alloc(Math.max(1, gl.drawingBufferWidth), Math.max(1, gl.drawingBufferHeight));
    this.stat.built = true;
  }

  // ---- allocation ---------------------------------------------------------
  _alloc(w, h) {
    const gl = this.gl;
    this._free();
    // Match the default framebuffer's sample count, so MSAA is not silently
    // lost and so the colour and depth resolves stay legal.
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    const s = gl.getParameter(gl.SAMPLES) | 0;
    this.samples = Math.max(0, Math.min(s, gl.getParameter(gl.MAX_SAMPLES) | 0));
    this.stat.samples = this.samples;

    this.msFbo = gl.createFramebuffer();
    this.msColor = gl.createRenderbuffer();
    this.msDepth = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.msColor);
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, this.samples, gl.RGBA8, w, h);
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.msDepth);
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, this.samples, gl.DEPTH_COMPONENT24, w, h);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.msFbo);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, this.msColor);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.msDepth);
    const okMs = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;

    this.rsFbo = gl.createFramebuffer();
    this.texColor = this._tex(gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, w, h, gl.LINEAR);
    this.texDepth = this._tex(gl.DEPTH_COMPONENT24, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, w, h, gl.NEAREST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.rsFbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texColor, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.texDepth, 0);
    const okRs = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // A catch that continues is how a tool learns to lie quietly (contract 4).
    // An incomplete framebuffer here is a hard failure: the caller turns the
    // whole pass off rather than drawing the scene into nothing.
    if (!okMs || !okRs) {
      this._free();
      throw new Error('[gl] post framebuffer incomplete (ms ' + okMs + ', resolve ' + okRs
        + ', ' + w + 'x' + h + ', samples ' + this.samples + ')');
    }
    this.w = w; this.h = h;
  }

  _tex(internal, format, type, w, h, filter) {
    const gl = this.gl;
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, format, type, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    // CLAMP_TO_EDGE is load-bearing, not tidiness: the blur walks its samples
    // toward the focus and the jittered first tap can land a hair outside.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);
    return t;
  }

  _free() {
    const gl = this.gl;
    for (const k of ['msFbo', 'rsFbo']) if (this[k]) { gl.deleteFramebuffer(this[k]); this[k] = null; }
    for (const k of ['msColor', 'msDepth']) if (this[k]) { gl.deleteRenderbuffer(this[k]); this[k] = null; }
    for (const k of ['texColor', 'texDepth']) if (this[k]) { gl.deleteTexture(this[k]); this[k] = null; }
    this.w = 0; this.h = 0;
  }

  dispose() {
    const gl = this.gl;
    this._free();
    if (this.prog) { gl.deleteProgram(this.prog); this.prog = null; }
    if (this.vao) { gl.deleteVertexArray(this.vao); this.vao = null; }
  }

  // ---- the frame ----------------------------------------------------------
  // Called where renderer.js used to bind the default framebuffer and clear.
  // Everything SeaRenderer draws between here and end() lands in the MSAA FBO.
  begin(w, h) {
    const gl = this.gl;
    if (w !== this.w || h !== this.h) this._alloc(w, h);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.msFbo);
    gl.viewport(0, 0, w, h);
    this.open = true;
  }

  // Resolve, post, present. `ctx` is what update() returned this frame.
  end(ctx) {
    const gl = this.gl;
    if (!this.open) return;
    this.open = false;
    const w = this.w, h = this.h;

    // 1. Resolve MSAA -> single sample. NEAREST and identical rectangles are
    //    REQUIRED for a multisampled read; a filter or a rescale here is an
    //    INVALID_OPERATION, not a slow path.
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.msFbo);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.rsFbo);
    gl.blitFramebuffer(0, 0, w, h, 0, 0, w, h, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    gl.blitFramebuffer(0, 0, w, h, 0, 0, w, h, gl.DEPTH_BUFFER_BIT, gl.NEAREST);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);

    // 2. The fullscreen triangle, into the default framebuffer.
    this._apply(ctx, w, h);
    this.stat.frames++;
  }

  _apply(ctx, w, h) {
    const gl = this.gl;
    // State this pass changes, saved so that whatever drew before it and
    // whatever draws after it both see what they expect. All of these are
    // client-side cached by the driver, so there is no round trip.
    const pProg = gl.getParameter(gl.CURRENT_PROGRAM);
    const pVao = gl.getParameter(gl.VERTEX_ARRAY_BINDING);
    const pDepth = gl.getParameter(gl.DEPTH_TEST);
    const pMask = gl.getParameter(gl.DEPTH_WRITEMASK);
    const pFunc = gl.getParameter(gl.DEPTH_FUNC);
    const pCull = gl.getParameter(gl.CULL_FACE);
    const pBlend = gl.getParameter(gl.BLEND);
    const pUnit = gl.getParameter(gl.ACTIVE_TEXTURE);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, w, h);
    gl.useProgram(this.prog);
    gl.bindVertexArray(this.vao);
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.BLEND);
    // ALWAYS, with depth writes on: the triangle covers the frame and its job
    // is to stamp the scene depth back down, so it must not be rejected by
    // whatever the default framebuffer's depth happened to be holding.
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.ALWAYS);
    gl.depthMask(true);

    gl.activeTexture(gl.TEXTURE0 + 10);
    gl.bindTexture(gl.TEXTURE_2D, this.texColor);
    gl.activeTexture(gl.TEXTURE0 + 11);
    gl.bindTexture(gl.TEXTURE_2D, this.texDepth);
    gl.uniform1i(this.u.uScene, 10);
    gl.uniform1i(this.u.uDepth, 11);

    gl.uniform2f(this.u.uFocus, ctx.focusX, ctx.focusY);
    gl.uniform1f(this.u.uBlur, ctx.blur);
    gl.uniform1f(this.u.uVig, ctx.vig);
    gl.uniform1f(this.u.uVigR0, ctx.vigR0);
    gl.uniform1f(this.u.uAspect, Math.max(0.01, w / h));
    gl.uniform1f(this.u.uJitter, ctx.blur > 0 ? 1 : 0);

    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // Restore. The textures on units 10 and 11 are left bound - nothing else in
    // the tree uses a unit above 4 (grep: activeTexture) - but the
    // ACTIVE_TEXTURE selector itself is put back, because that one is shared.
    gl.activeTexture(pUnit);
    gl.bindVertexArray(pVao);
    gl.useProgram(pProg);
    gl.depthFunc(pFunc);
    gl.depthMask(pMask);
    if (pDepth) gl.enable(gl.DEPTH_TEST); else gl.disable(gl.DEPTH_TEST);
    if (pCull) gl.enable(gl.CULL_FACE); else gl.disable(gl.CULL_FACE);
    if (pBlend) gl.enable(gl.BLEND); else gl.disable(gl.BLEND);
  }

  // ---- strength and focus -------------------------------------------------
  // Everything below is CPU-side bookkeeping: it reads the sim and the camera
  // and produces the numbers the shader needs. It writes nothing back.
  //
  // SPEED comes from the sim, never from the camera: a camera cut, a restart or
  // a calibration address would otherwise register as a few hundred m/s.
  // DIRECTION comes from the camera, because it is the only source that is
  // right for every craft and every view mode, and a bad frame there costs a
  // misplaced sharp point rather than a full-frame smear.
  update(sim, cam, basis, tanHalfFov, aspect) {
    const now = performance.now();
    const dt = this.clock === null ? 1 / 60 : Math.max(0, Math.min(0.25, (now - this.clock) / 1000));
    this.clock = now;
    const k = 1 - Math.exp(-dt / TAU);

    let speed = 0;
    const hull = this.boats && this.boats.active ? this.boats.hull : null;
    if (hull) speed = Math.abs(hull.speed || 0);
    else if (sim && sim.plant && sim.plant.state) speed = Math.abs(sim.plant.state.speed || 0);
    if (!isFinite(speed)) speed = 0;

    const x = Math.max(0, Math.min(1, (speed - KNEE) / (FULL - KNEE)));
    const target = x * x * (3 - 2 * x);
    this.blur += (target - this.blur) * k;

    // Direction of travel, from the camera's own displacement. Rejected when it
    // is implausible for one frame (a cut, a restart, the first frame), in
    // which case the previous direction is kept and the focus simply lags.
    const px = this._px, py = this._py, pz = this._pz;
    this._px = cam.x; this._py = cam.y; this._pz = cam.z;
    if (px !== undefined && dt > 1e-4) {
      const dx = cam.x - px, dy = cam.y - py, dz = cam.z - pz;
      const len = Math.hypot(dx, dy, dz);
      if (len > 1e-4 && len / dt < 120) {
        const ux = dx / len, uy = dy / len, uz = dz / len;
        if (!this.vdir) this.vdir = [ux, uy, uz];
        else {
          const v = this.vdir;
          v[0] += (ux - v[0]) * k; v[1] += (uy - v[1]) * k; v[2] += (uz - v[2]) * k;
          const l = Math.hypot(v[0], v[1], v[2]) || 1;
          v[0] /= l; v[1] /= l; v[2] /= l;
        }
      }
    }

    // Project the direction of travel through the SAME basis the sky pass uses,
    // so the sharp point cannot disagree with the camera that drew the frame.
    let fx = 0.5, fy = 0.5;
    const v = this.vdir;
    if (v) {
      const f = v[0] * basis.fx + v[1] * basis.fy + v[2] * basis.fz;
      if (f > 0.25) {
        const r = v[0] * basis.rx + v[1] * basis.ry + v[2] * basis.rz;
        const u = v[0] * basis.ux + v[1] * basis.uy + v[2] * basis.uz;
        const ndcX = Math.max(-0.7, Math.min(0.7, (r / f) / Math.max(1e-3, tanHalfFov * aspect)));
        const ndcY = Math.max(-0.7, Math.min(0.7, (u / f) / Math.max(1e-3, tanHalfFov)));
        // Pulled three quarters of the way there: the full vanishing point
        // swings hard in a fast turn and the frame then reads as if the camera,
        // rather than the craft, were the thing spinning.
        fx = 0.5 + 0.5 * ndcX * 0.75;
        fy = 0.5 + 0.5 * ndcY * 0.75;
      }
    }

    const t = this.tune;
    return {
      focusX: fx,
      focusY: fy,
      blur: t.blur !== undefined ? t.blur : BLUR_MAX * this.blur,
      vig: t.vig !== undefined ? t.vig : VIG_BASE + VIG_SPEED * this.blur,
      vigR0: R0_SLOW + (R0_FAST - R0_SLOW) * this.blur,
      speed,
    };
  }
}
