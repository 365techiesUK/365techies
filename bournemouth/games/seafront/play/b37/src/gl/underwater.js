// UNDER THE WATER - the renderer's side of it (26 Sep 2026). Built once at start-up with the rest
// of the GL objects (SPEC section 5: nothing is created on a first draw) and used only on a frame
// whose camera is below the local sea surface. renderer.js owns the switch; this file owns:
//   * the SEABED - a polar grid centred on the camera, dropped to the sea shader's own bed;
//   * the MOTES - the suspended sediment that makes Poole Bay water look like water and gives the
//     eye something to judge depth and movement by;
//   * the numbers the post pass needs (post.js `under`): the camera basis, the surface above it,
//     the sun refracted into the water, how much daylight is left at the camera's depth and the
//     water's extinction - which is the VISIBILITY.
//
// ⚠️ THE VISIBILITY IS A CHOICE, AND IT IS CLEARER THAN A REAL DAY. Bournemouth Pier's divers
// report 2-4 m typically and "6-8 m if you're lucky" (Divernet, "Above 18m: diving under
// Bournemouth Pier"). The first cut drew the lucky day, ~7 m, and a boat 5 m from the camera was a
// faint smudge in dark green (26 Sep). So the game draws ~11 m - a hull at 4-5 m clear but hazed,
// gone by 12 m. Say so if asked: it is the game's clear day, not the bay's average.

import { link, uniforms, buffer } from './core.js';
import { waterVert, waterUnderFrag, seabedVert, seabedFrag } from './shaders.js';
import { SeaLife } from './sealife.js';
import { surfSample, makeSurfSlot } from '../sea-surf.js';

export const UNDER = Object.freeze({
  sigma: [0.4, 0.3, 0.32],         // per metre, display space: ~3% contrast left at ~11 m
  margin: 0.08,                    // the camera must be this far below the surface to count as under
  motes: 1400, moteBox: 14,        // suspended particles, wrapped in a cube round the camera
  // UNDER A BREAKING WAVE the water is full of air: the whitewater drives a cloud of bubbles a
  // metre or two down, and for a moment everything is white. `aer` (0..1) is how much of that is
  // over the camera; it whitens and thickens the haze (post pass) and brings up the bubbles.
  bubbles: 1400, bubbleBox: 3.6, bubbleDepth: 1.8,
});

// Seabed grid: the sea's own polar layout, smaller - past ~40 m the haze has taken everything.
const RINGS = 44, SEG = 96, R0 = 0.4, RMAX = 90;

const MOTE_VERT = `#version 300 es
precision highp float;
in vec3 aSeed;
uniform mat4 uViewProj;
uniform vec3 uCam;
uniform float uBox;
uniform float uTime;
uniform float uScale;
uniform float uSurfY;
out float vA;
void main() {
  // Each mote drifts slowly and is wrapped into a box round the camera, so the field is endless.
  vec3 d = aSeed * uBox + vec3(sin(uTime * 0.13 + aSeed.y * 40.0), sin(uTime * 0.09 + aSeed.x * 30.0) * 0.4, cos(uTime * 0.11 + aSeed.z * 50.0)) * 0.6;
  vec3 p = uCam + mod(d - uCam + uBox * 0.5, uBox) - uBox * 0.5;
  vec4 c = uViewProj * vec4(p, 1.0);
  float dist = max(c.w, 0.1);
  gl_Position = c;
  gl_PointSize = clamp(uScale * 0.06 / dist, 1.0, 7.0);
  vA = (p.y < uSurfY - 0.05 ? 1.0 : 0.0) * (1.0 - smoothstep(uBox * 0.3, uBox * 0.5, length(p - uCam)));
}
`;
// Bubbles: the same seeds as the motes, rising through the top of the water column round the
// camera and wrapping back to the bottom of it. Drawn only under whitewater, as many as `aer` says.
const BUBBLE_VERT = `#version 300 es
precision highp float;
in vec3 aSeed;
uniform mat4 uViewProj;
uniform vec3 uCam;
uniform float uBox;
uniform float uDepthB;
uniform float uTime;
uniform float uScale;
uniform float uSurfY;
out float vA;
void main() {
  float rise = 0.35 + 0.6 * fract(aSeed.x * 7.31);
  vec2 h = aSeed.xz * uBox + vec2(sin(uTime * 2.1 + aSeed.y * 60.0), cos(uTime * 1.7 + aSeed.x * 50.0)) * 0.05;
  vec2 xz = uCam.xz + mod(h - uCam.xz + uBox * 0.5, uBox) - uBox * 0.5;
  float y = uSurfY - uDepthB + mod(aSeed.y * uDepthB + uTime * rise, uDepthB);
  vec3 p = vec3(xz.x, y, xz.y);
  vec4 c = uViewProj * vec4(p, 1.0);
  float dist = max(c.w, 0.1);
  gl_Position = c;
  float r = 0.008 + 0.04 * fract(aSeed.z * 13.7) * fract(aSeed.z * 13.7);   // mostly small, a few big
  gl_PointSize = clamp(uScale * r / dist, 1.5, 22.0);
  vA = smoothstep(0.02, 0.3, uSurfY - y) * (1.0 - smoothstep(uBox * 0.3, uBox * 0.5, length(p - uCam)));
}
`;
const BUBBLE_FRAG = `#version 300 es
precision highp float;
in float vA;
out vec4 fragColor;
void main() {
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(q, q);
  if (r2 > 1.0) discard;
  // A bubble is a bright rim and a clear middle, with a glint.
  float a = (smoothstep(0.35, 0.9, r2) * (1.0 - smoothstep(0.9, 1.0, r2)) * 0.8 + 0.12) * vA;
  a += smoothstep(0.05, 0.0, dot(q - vec2(-0.35, 0.35), q - vec2(-0.35, 0.35))) * vA;
  fragColor = vec4(0.9, 0.97, 0.95, min(a, 0.9));
}
`;
const MOTE_FRAG = `#version 300 es
precision highp float;
in float vA;
out vec4 fragColor;
void main() {
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  float a = (1.0 - smoothstep(0.3, 1.0, dot(q, q))) * vA * 0.55;
  if (a < 0.01) discard;
  fragColor = vec4(0.78, 0.86, 0.8, a);
}
`;

export class Underwater {
  // seaChunk: the shared wave-table GLSL (SEA_GLSL.chunk), so the underside uses the sea's own
  // vertex stage and cannot disagree with the surface drawn from above.
  // offsetLoc: the attribute slot the sea's own grid VAO feeds `aOffset` through - the underside
  // draws the SAME VAO, so its program is linked with the attribute pinned to that slot.
  constructor(gl, seaChunk, uboName, uboBinding, offsetLoc) {
    this.gl = gl;
    // The sea seen from below: waterVert + the underside fragment stage.
    this.waterProg = link(gl, waterVert(seaChunk), waterUnderFrag(seaChunk), 'water-under', { aOffset: offsetLoc });
    this.waterU = uniforms(gl, this.waterProg,
      ['uViewProj', 'uCenter', 'uTide', 'uCamPos', 'uSunDir', 'uExposure', 'uOvercast', 'uSurfPhase', 'uSurfSet', 'uSurfCtl']);
    const bi = gl.getUniformBlockIndex(this.waterProg, uboName);
    if (bi !== gl.INVALID_INDEX) gl.uniformBlockBinding(this.waterProg, bi, uboBinding);
    // The seabed.
    this.bedProg = link(gl, seabedVert(seaChunk), seabedFrag(), 'seabed');
    const bb = gl.getUniformBlockIndex(this.bedProg, uboName);   // shoreChunk reads the wave table (seaHs)
    if (bb !== gl.INVALID_INDEX) gl.uniformBlockBinding(this.bedProg, bb, uboBinding);
    this.bedU = uniforms(gl, this.bedProg,
      ['uViewProj', 'uCenter', 'uTide', 'uSunDir', 'uExposure', 'uOvercast', 'uTimeW', 'uSurfPhase', 'uSurfSet', 'uSurfCtl']);
    this._buildBed();
    // The motes.
    this.moteProg = link(gl, MOTE_VERT, MOTE_FRAG, 'motes');
    this.moteU = uniforms(gl, this.moteProg, ['uViewProj', 'uCam', 'uBox', 'uTime', 'uScale', 'uSurfY']);
    this._buildMotes();
    // Pinned to the motes' seed slot: it draws the motes' VAO.
    this.bubbleProg = link(gl, BUBBLE_VERT, BUBBLE_FRAG, 'bubbles', { aSeed: gl.getAttribLocation(this.moteProg, 'aSeed') });
    this.bubbleU = uniforms(gl, this.bubbleProg, ['uViewProj', 'uCam', 'uBox', 'uDepthB', 'uTime', 'uScale', 'uSurfY']);
    this.ss = makeSurfSlot();
    // Poole Bay's own animals (sealife.js), placed round the camera each underwater frame.
    this.life = new SeaLife(gl);
    this.state = null;
    this.stat = { frames: 0 };
  }

  _buildBed() {
    const gl = this.gl;
    const growth = Math.pow(RMAX / R0, 1 / (RINGS - 1));
    const verts = new Float32Array((1 + RINGS * SEG) * 2);
    let v = 2;
    for (let i = 0; i < RINGS; i++) {
      const r = R0 * Math.pow(growth, i);
      for (let s = 0; s < SEG; s++) { const a = (s / SEG) * Math.PI * 2; verts[v++] = Math.cos(a) * r; verts[v++] = Math.sin(a) * r; }
    }
    const idx = new Uint32Array(SEG * 3 + (RINGS - 1) * SEG * 6);
    let n = 0;
    for (let s = 0; s < SEG; s++) { idx[n++] = 0; idx[n++] = 1 + s; idx[n++] = 1 + ((s + 1) % SEG); }
    for (let i = 0; i < RINGS - 1; i++) {
      const a = 1 + i * SEG, b = 1 + (i + 1) * SEG;
      for (let s = 0; s < SEG; s++) {
        const s1 = (s + 1) % SEG;
        idx[n++] = a + s; idx[n++] = b + s; idx[n++] = b + s1; idx[n++] = a + s; idx[n++] = b + s1; idx[n++] = a + s1;
      }
    }
    this.bedCount = n;
    this.bedVao = gl.createVertexArray();
    gl.bindVertexArray(this.bedVao);
    buffer(gl, gl.ARRAY_BUFFER, verts);
    const loc = gl.getAttribLocation(this.bedProg, 'aOffset');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    buffer(gl, gl.ELEMENT_ARRAY_BUFFER, idx);
    gl.bindVertexArray(null);
  }

  _buildMotes() {
    const gl = this.gl, n = UNDER.motes, seeds = new Float32Array(n * 3);
    let s = 0x2545F491;
    const r = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; };
    for (let i = 0; i < n * 3; i++) seeds[i] = r();
    this.moteVao = gl.createVertexArray();
    gl.bindVertexArray(this.moteVao);
    buffer(gl, gl.ARRAY_BUFFER, seeds);
    const loc = gl.getAttribLocation(this.moteProg, 'aSeed');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
  }

  // Is the camera under the water this frame? Returns the state the passes need, or null.
  // Reads the sea through slot 3, the renderer's own.
  probe(sim, cam, basis, tanHalf, sunDir, overcast) {
    const sea = sim && sim.sea;
    if (!sea || !sea.sample) return (this.state = null);
    const surfY = sea.sample(cam.x, cam.z, sim.time, 0, 3).height;
    if (!(cam.y < surfY - UNDER.margin)) return (this.state = null);
    const depth = surfY - cam.y;
    // The sun's direction under water, pointing back UP toward where the light came in:
    // Snell at the surface (1.0 -> 1.333) bends it toward the vertical.
    const sx = sunDir[0], sy = Math.max(0.05, sunDir[1]), sz = sunDir[2];
    const sinA = Math.sqrt(Math.max(0, 1 - sy * sy)), sinW = sinA / 1.333, cosW = Math.sqrt(1 - sinW * sinW);
    const hl = Math.hypot(sx, sz) || 1;
    const sunW = [sx / hl * sinW, cosW, sz / hl * sinW];
    const light = Math.max(0.25, Math.exp(-0.1 * depth)) * (0.55 + 0.45 * Math.min(1, sy * 2)) * (1 - 0.3 * overcast);
    // The whitewater over the camera: the foam the surf model leaves behind a breaking crest, and
    // the crest itself while it breaks. Fades with depth - the bubble cloud is a metre or two deep.
    // Measured through a duck-dive (26 Sep): the foam left over the lens by earlier waves sits at
    // ~0.3-0.4; the breaking crest itself is what should white the picture out as it goes over.
    const W = surfSample(cam.x, cam.z, sim.time, 0, sea.surfCtl, this.ss);
    const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    const crest = W.active ? sm(-0.4, -0.05, W.chi) * (1 - sm(0.5, 2.2, W.chi)) * W.brk * sm(0.1, 0.3, W.amp) : 0;
    const aer = Math.min(1, Math.max((W.foam || 0) * 1.1, crest * 0.95)) * Math.exp(-Math.max(0, depth - 0.6) / 1.4);
    this.state = {
      f: [basis.fx, basis.fy, basis.fz], r: [basis.rx, basis.ry, basis.rz], u: [basis.ux, basis.uy, basis.uz],
      tanHalf, cam: [cam.x, cam.y, cam.z], surfY, sunW, time: sim.time % 1000, light,
      shaft: 1 - overcast, sigma: UNDER.sigma, depth, aer,
    };
    this.stat.frames++;
    return this.state;
  }

  // THE SURFACE FROM BELOW, drawn after everything else (the renderer passes its own grid): it
  // blends over what is already there - the sky and anything above the water, seen through Snell's
  // window - and is a mirror beyond it. It writes depth, so the haze measures the path to the
  // surface and no further.
  drawSurface(sim, cam, vp, vao, count, sunDir, exposure, overcast) {
    const gl = this.gl, W = this.waterU;
    gl.useProgram(this.waterProg);
    gl.uniformMatrix4fv(W.uViewProj, false, vp);
    gl.uniform2f(W.uCenter, cam.x, cam.z);
    gl.uniform1f(W.uTide, sim.sea.tide || 0);
    gl.uniform3f(W.uCamPos, cam.x, cam.y, cam.z);
    gl.uniform3f(W.uSunDir, sunDir[0], sunDir[1], sunDir[2]);
    gl.uniform1f(W.uExposure, exposure);
    if (W.uOvercast) gl.uniform1f(W.uOvercast, overcast);
    if (W.uSurfPhase) {
      const su = sim.sea.surfUniforms(sim.time);
      gl.uniform1f(W.uSurfPhase, su.phase); gl.uniform1f(W.uSurfSet, su.set); gl.uniform1f(W.uSurfCtl, su.ctl);
    }
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(true);
    gl.bindVertexArray(vao);
    gl.disable(gl.CULL_FACE);
    gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_INT, 0);
    gl.bindVertexArray(null);
    gl.disable(gl.BLEND);
  }

  // The seabed and the motes are drawn by the renderer at the right points in its order.
  drawBed(sim, cam, vp, sunDir, exposure, overcast, surf) {
    const gl = this.gl, U = this.bedU;
    gl.useProgram(this.bedProg);
    gl.uniformMatrix4fv(U.uViewProj, false, vp);
    gl.uniform2f(U.uCenter, cam.x, cam.z);
    gl.uniform1f(U.uTide, sim.sea.tide || 0);
    gl.uniform3f(U.uSunDir, sunDir[0], sunDir[1], sunDir[2]);
    gl.uniform1f(U.uExposure, exposure);
    if (U.uOvercast) gl.uniform1f(U.uOvercast, overcast);
    if (U.uTimeW) gl.uniform1f(U.uTimeW, sim.time % 1000);
    if (U.uSurfPhase && surf) { gl.uniform1f(U.uSurfPhase, surf.phase); gl.uniform1f(U.uSurfSet, surf.set); gl.uniform1f(U.uSurfCtl, surf.ctl); }
    gl.bindVertexArray(this.bedVao);
    gl.disable(gl.CULL_FACE);
    gl.drawElements(gl.TRIANGLES, this.bedCount, gl.UNSIGNED_INT, 0);
    gl.bindVertexArray(null);
  }

  drawLife(sim, cam, vp, exposure) {
    const S = this.state;
    if (!S) return;
    this.life.populate(sim, cam, S);
    this.life.draw(cam, vp, S, exposure, sim.time);
  }

  drawBubbles(sim, cam, vp, canvasH) {
    const gl = this.gl, U = this.bubbleU, S = this.state;
    const n = S ? Math.floor(UNDER.bubbles * Math.min(1, S.aer * 1.6)) : 0;
    if (n < 8) return;
    gl.useProgram(this.bubbleProg);
    gl.uniformMatrix4fv(U.uViewProj, false, vp);
    gl.uniform3f(U.uCam, cam.x, cam.y, cam.z);
    gl.uniform1f(U.uBox, UNDER.bubbleBox);
    gl.uniform1f(U.uDepthB, UNDER.bubbleDepth);
    gl.uniform1f(U.uTime, sim.time % 1000);
    gl.uniform1f(U.uScale, canvasH);
    gl.uniform1f(U.uSurfY, S.surfY);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    gl.bindVertexArray(this.moteVao);                 // the motes' seeds, reused
    gl.drawArrays(gl.POINTS, 0, Math.min(n, UNDER.motes));
    gl.bindVertexArray(null);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
  }

  drawMotes(sim, cam, vp, canvasH) {
    const gl = this.gl, U = this.moteU, S = this.state;
    if (!S) return;
    gl.useProgram(this.moteProg);
    gl.uniformMatrix4fv(U.uViewProj, false, vp);
    gl.uniform3f(U.uCam, cam.x, cam.y, cam.z);
    gl.uniform1f(U.uBox, UNDER.moteBox);
    gl.uniform1f(U.uTime, sim.time % 1000);
    gl.uniform1f(U.uScale, canvasH);
    gl.uniform1f(U.uSurfY, S.surfY);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    gl.bindVertexArray(this.moteVao);
    gl.drawArrays(gl.POINTS, 0, UNDER.motes);
    gl.bindVertexArray(null);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
  }
}
