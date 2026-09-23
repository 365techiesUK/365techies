// VIKING RAID - soft sprite particles (tr62). Replaces the faceted opaque smoke "cabbages"
// and flat white hit discs with camera-facing, alpha-blended sprites: smoke, steam, spray,
// fire, embers, sparks, glows and explosion cores, all in ONE instanced draw.
//
// Premultiplied alpha, blendFuncSeparate(ONE, ONE_MINUS_SRC_ALPHA, ZERO, ONE): a sprite's
// `add` (0..1) moves it from normal "over" blending (smoke) to purely additive (fire, sparks)
// inside the same draw; destination alpha is left alone. Depth test on, depth write off,
// drawn after every opaque raid actor, sorted back to front. Anything within ~6 m of the
// camera fades out (nearFade, mirrored in the vertex shader) so nothing blocks the view.
//
// The 2x2 sprite atlas (smoke puff, soft glow, flame tongue, spark) is generated in code
// on raid entry (never at page load) and bound on texture unit 11, restored afterwards.
// ⚠️ No backtick may appear inside the GLSL template literals below.

import { link, uniforms, buffer } from './core.js';

export const MAX_SPRITES = 1600;
export const NEAR_FADE = [2.5, 6.0];
const IF = 16, UNIT = 11;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
// 0 inside NEAR_FADE[0] m of the camera (less 0.7 of the sprite radius), 1 beyond NEAR_FADE[1]
export function nearFade(d, r = 0) { const t = clamp01((d - 0.7 * r - NEAR_FADE[0]) / (NEAR_FADE[1] - NEAR_FADE[0])); return t * t * (3 - 2 * t); }
export const FRAME = { smoke: 0, glow: 1, flame: 2, spark: 3 };

const VERT = `#version 300 es
precision highp float;
in vec2 aCorner;
in vec4 aI0; in vec4 aI1; in vec4 aI2; in vec4 aI3;
uniform mat4 uViewProj; uniform vec3 uCamPos; uniform vec3 uRight; uniform vec3 uUp; uniform vec2 uNear;
out vec2 vUV; out vec4 vCol; out float vAdd; out float vHeat; out float vHaze; out float vFrame;
void main() {
  vec3 c = aI0.xyz; float r = aI0.w;
  float d = length(c - uCamPos);
  float t = clamp((d - 0.7 * r - uNear.x) / (uNear.y - uNear.x), 0.0, 1.0);
  float fade = t * t * (3.0 - 2.0 * t);
  vec3 v = aI2.xyz * aI2.w;
  vec2 sv = vec2(dot(v, uRight), dot(v, uUp));
  float sl = length(sv);
  vec2 ax; vec2 ext = vec2(r);
  if (sl > 0.02) { ax = sv / sl; ext.x = r + 0.5 * sl; c -= v * 0.5; }
  else { ax = vec2(cos(aI3.x), sin(aI3.x)); }
  vec2 o = ax * (aCorner.x * ext.x) + vec2(-ax.y, ax.x) * (aCorner.y * ext.y);
  gl_Position = uViewProj * vec4(c + uRight * o.x + uUp * o.y, 1.0);
  vUV = aCorner * 0.5 + 0.5;
  vCol = vec4(aI1.rgb, aI1.a * fade);
  vAdd = aI3.y; vFrame = aI3.z; vHeat = aI3.w;
  vHaze = 1.0 - exp(-d / 2400.0);
}
`;

const FRAG = `#version 300 es
precision highp float;
in vec2 vUV; in vec4 vCol; in float vAdd; in float vHeat; in float vHaze; in float vFrame;
uniform sampler2D uTex; uniform vec3 uSunDir; uniform float uExposure;
out vec4 fragColor;
vec3 acesR(vec3 x) {
  const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}
void main() {
  vec2 tile = vec2(mod(vFrame, 2.0), floor(vFrame / 2.0));
  vec4 tx = texture(uTex, (vUV * 0.96 + 0.02 + tile) * 0.5);
  float a = vCol.a * tx.r;
  if (a < 0.002) discard;
  float sun = 0.72 + 0.4 * max(uSunDir.y, 0.0);
  vec3 smoke = vCol.rgb * mix(0.62, 1.12, clamp(vUV.y * 0.8 + tx.g * 0.45, 0.0, 1.0)) * sun;
  smoke = mix(smoke, vec3(0.80, 0.86, 0.92), vHaze * 0.55);
  vec3 hot = vCol.rgb * (0.9 + 1.6 * tx.g);
  vec3 col = pow(acesR(mix(smoke, hot, vHeat) * uExposure), vec3(1.0 / 2.2));
  fragColor = vec4(col * a, a * (1.0 - vAdd));
}
`;

// ---- procedural atlas: R = coverage, G = shade/core --------------------------------------
function hash(x, y) { const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return h - Math.floor(h); }
function vnoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
const fbm = (x, y) => 0.5 * vnoise(x, y) + 0.25 * vnoise(x * 2.1, y * 2.1) + 0.125 * vnoise(x * 4.3, y * 4.3) + 0.0625 * vnoise(x * 8.7, y * 8.7);
const sstep = (e0, e1, x) => { const t = clamp01((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };
export function buildAtlas(T = 64) {
  const W = T * 2, data = new Uint8Array(W * W * 4);
  for (let f = 0; f < 4; f++) {
    const tx = f % 2, ty = f >> 1;
    for (let j = 0; j < T; j++) for (let i = 0; i < T; i++) {
      const x = (i + 0.5) / T * 2 - 1, y = (j + 0.5) / T * 2 - 1, r = Math.hypot(x, y);
      let cov = 0, g = 0;
      if (f === 0) {          // billowy smoke puff with a noisy edge
        const n = fbm(x * 2.2 + 3, y * 2.2 + 7), edge = 0.55 + 0.38 * n;
        cov = sstep(edge, edge - 0.42, r) * (0.55 + 0.45 * fbm(x * 4 + 11, y * 4 + 5));
        g = clamp01(0.25 + 0.9 * fbm(x * 3 + 1, y * 3 - 2) + 0.35 * y);
      } else if (f === 1) {   // soft glow
        cov = Math.exp(-r * r * 3.2) * sstep(1.0, 0.8, r); g = Math.exp(-r * r * 10);
      } else if (f === 2) {   // flame tongue, wide at the bottom
        const h = (y + 1) / 2, w = 0.62 * Math.sqrt(sstep(0, 0.28, h)) * Math.pow(1 - h, 0.9);
        const dx = Math.abs(x + 0.18 * (fbm(h * 3 + 2, 4.1) - 0.5) * h * 2);
        cov = sstep(w + 0.02, w * 0.35, dx) * sstep(1.0, 0.75, h) * (0.75 + 0.25 * fbm(x * 5, h * 6));
        g = clamp01(1.1 - h * 1.4 - dx * 1.2);
      } else {                // spark / droplet
        cov = Math.exp(-r * r * 7) * sstep(1.0, 0.6, r); g = Math.exp(-r * r * 30);
      }
      const o = ((ty * T + j) * W + tx * T + i) * 4;
      data[o] = Math.round(clamp01(cov) * 255); data[o + 1] = Math.round(clamp01(g) * 255); data[o + 2] = 0; data[o + 3] = 255;
    }
  }
  return { W, data };
}

export class RaidSprites {
  constructor(gl) {
    this.gl = gl;
    this.prog = link(gl, VERT, FRAG, 'raidSprites', { aCorner: 0, aI0: 1, aI1: 2, aI2: 3, aI3: 4 });
    this.u = uniforms(gl, this.prog, ['uViewProj', 'uCamPos', 'uRight', 'uUp', 'uNear', 'uTex', 'uSunDir', 'uExposure']);
    const { W, data } = buildAtlas();
    const prevUnit = gl.getParameter(gl.ACTIVE_TEXTURE);
    gl.activeTexture(gl.TEXTURE0 + UNIT);
    this.tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, W, W, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAX_LEVEL, 4);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.activeTexture(prevUnit);
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    buffer(gl, gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]));
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0);
    this.inst = new Float32Array(MAX_SPRITES * IF);
    this.vb = buffer(gl, gl.ARRAY_BUFFER, this.inst, gl.DYNAMIC_DRAW);
    for (let j = 0; j < 4; j++) { gl.enableVertexAttribArray(1 + j); gl.vertexAttribPointer(1 + j, 4, gl.FLOAT, false, IF * 4, j * 16); gl.vertexAttribDivisor(1 + j, 1); }
    gl.bindVertexArray(null);
    this.parts = []; this.list = []; this.lastT = null;
    this.lastStats = { draws: 0, tris: 0, sprites: 0, parts: 0 };
  }

  clear() { this.parts.length = 0; this.list.length = 0; this.lastT = null; }

  // A one-frame sprite. o: { frame, add, heat, vx, vy, vz, stretch, rot }
  put(x, y, z, r, col, a, o = {}) {
    if (this.list.length >= MAX_SPRITES || a <= 0.002 || r <= 0) return;
    this.list.push({ x, y, z, r, cr: col[0], cg: col[1], cb: col[2], a, vx: o.vx || 0, vy: o.vy || 0, vz: o.vz || 0, st: o.stretch || 0, rot: o.rot || 0, add: o.add || 0, frame: o.frame || 0, heat: o.heat || 0 });
  }

  // A living particle. o: { frame, add, heat, g (m/s2, negative rises), drag, r1 (end radius), col1 (end colour), fadeIn, stretch, spin, flick }
  spawn(x, y, z, vx, vy, vz, life, r0, col, a, o = {}) {
    if (this.parts.length >= MAX_SPRITES) return;
    this.parts.push({ x, y, z, vx, vy, vz, age: 0, life, r0, r1: o.r1 === undefined ? r0 : o.r1, col, col1: o.col1 || col, a, frame: o.frame || 0, add: o.add || 0, heat: o.heat || 0,
      g: o.g || 0, drag: o.drag || 0, fadeIn: o.fadeIn === undefined ? 0.12 : o.fadeIn, stretch: o.stretch || 0, rot: Math.random() * 6.283, spin: o.spin === undefined ? (Math.random() - 0.5) * 0.8 : o.spin, flick: o.flick || 0, floor: o.floor });
  }

  _update(dt, t) {
    const keep = [];
    for (const p of this.parts) {
      p.age += dt;
      if (p.age >= p.life) continue;
      p.vy -= p.g * dt;
      if (p.drag) { const k = Math.exp(-p.drag * dt); p.vx *= k; p.vz *= k; p.vy *= k; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.rot += p.spin * dt;
      if (p.floor !== undefined && p.y < p.floor) continue;
      keep.push(p);
      const f = p.age / p.life, e = 1 - f;
      let a = p.a * Math.min(1, p.fadeIn > 0 ? p.age / p.fadeIn : 1) * (p.add >= 0.5 ? e : 1 - f * f);
      if (p.flick) a *= 1 - p.flick * 0.5 * (1 + Math.sin(t * 23 + p.rot * 9));
      const c0 = p.col, c1 = p.col1;
      this.put(p.x, p.y, p.z, p.r0 + (p.r1 - p.r0) * Math.sqrt(f), [c0[0] + (c1[0] - c0[0]) * f, c0[1] + (c1[1] - c0[1]) * f, c0[2] + (c1[2] - c0[2]) * f], a,
        { frame: p.frame, add: p.add, heat: p.heat, vx: p.vx, vy: p.vy, vz: p.vz, stretch: p.stretch, rot: p.rot });
    }
    this.parts = keep;
  }

  draw(cam, vp, sunDir, exposure, time) {
    const gl = this.gl;
    const dt = this.lastT === null ? 0 : Math.min(0.1, Math.max(0, time - this.lastT));
    if (this.lastT !== null && (time < this.lastT || time - this.lastT > 0.5)) this.parts.length = 0;
    this.lastT = time;
    this._update(dt, time);
    const L = this.list, cx = cam.x, cy = cam.y, cz = cam.z;
    let n = 0;
    for (const s of L) { s.d = Math.hypot(s.x - cx, s.y - cy, s.z - cz); if (nearFade(s.d, s.r) > 0.001) L[n++] = s; }
    L.length = n;
    L.sort((p, q) => q.d - p.d);
    const f = this.inst;
    for (let i = 0; i < n; i++) {
      const s = L[i], o = i * IF;
      f[o] = s.x; f[o + 1] = s.y; f[o + 2] = s.z; f[o + 3] = s.r;
      f[o + 4] = s.cr; f[o + 5] = s.cg; f[o + 6] = s.cb; f[o + 7] = s.a;
      f[o + 8] = s.vx; f[o + 9] = s.vy; f[o + 10] = s.vz; f[o + 11] = s.st;
      f[o + 12] = s.rot; f[o + 13] = s.add; f[o + 14] = s.frame; f[o + 15] = s.heat;
    }
    this.lastStats = { draws: n ? 1 : 0, tris: 2 * n, sprites: n, parts: this.parts.length };
    L.length = 0;
    if (!n) return;
    // camera right/up from the view-projection rows (column-major)
    const m = vp, rl = Math.hypot(m[0], m[4], m[8]) || 1, ul = Math.hypot(m[1], m[5], m[9]) || 1;
    gl.useProgram(this.prog);
    gl.uniformMatrix4fv(this.u.uViewProj, false, vp);
    gl.uniform3f(this.u.uCamPos, cx, cy, cz);
    gl.uniform3f(this.u.uRight, m[0] / rl, m[4] / rl, m[8] / rl);
    gl.uniform3f(this.u.uUp, m[1] / ul, m[5] / ul, m[9] / ul);
    gl.uniform2f(this.u.uNear, NEAR_FADE[0], NEAR_FADE[1]);
    gl.uniform3f(this.u.uSunDir, sunDir[0], sunDir[1], sunDir[2]);
    gl.uniform1f(this.u.uExposure, exposure);
    const prevUnit = gl.getParameter(gl.ACTIVE_TEXTURE);
    gl.activeTexture(gl.TEXTURE0 + UNIT);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.uniform1i(this.u.uTex, UNIT);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vb);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, f, 0, n * IF);
    gl.enable(gl.DEPTH_TEST); gl.depthMask(false); gl.disable(gl.CULL_FACE);
    gl.enable(gl.BLEND); gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE);
    gl.bindVertexArray(this.vao);
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, n);
    gl.bindVertexArray(null);
    gl.disable(gl.BLEND); gl.depthMask(true);
    gl.activeTexture(prevUnit);
  }
}
