// POOLE BAY'S SEA LIFE, for the underwater view (26 Sep 2026). Drawn only while the camera is under
// the water (renderer.js UNDERWATER), in the 3x3 patch of 14 m cells round the camera.
//
// ONLY SPECIES THAT ARE REALLY HERE. The owner asked to "see the wildlife underwater", and the house
// rule is to check every species before drawing it:
//   * Bournemouth Pier's divers (Divernet, "Above 18m: diving under Bournemouth Pier"): "flat sandy
//     expanses", "schools of silvery sand eels", bass ("frequent visitors"), flounders ("including
//     many tiny juveniles"), grey mullet, wrasse on the legs, spider crabs, cuttlefish, and "perhaps
//     thornback rays" - the last two as occasional.
//   * Dorset Wildlife Trust: moon and barrel jellyfish among the eight species recorded in Dorset.
// Rarity follows the sources: sand eels, flounders and jellyfish are common here; a ray or a
// cuttlefish is a lucky sighting. Nothing tropical, nothing invented, and the dolphins are the
// renderer's own pod, not drawn again here.
//
// STATELESS AND DETERMINISTIC. Every creature's position is a closed-form function of its cell,
// its index and the time, so nothing is simulated, nothing drifts, the same cell holds the same
// animals every visit, and no Math.random is used. Read-only on the sim: sea life never touches play.

import { link, uniforms, buffer } from './core.js';
import { MeshBuilder } from './meshes.js';
import { blob, V3 } from './boat-meshes.js';
import { surfBed } from '../sea-surf.js';

// 14 m cells, 3x3 round the camera: ~42 m square populated. The first cut used 36 m cells and a
// school was usually 10-30 m away - beyond the ~11 m visibility - so nothing was ever seen.
const CELL = 14;
const MAX_INST = 420;
const INST = 12;

const hex = (h) => { const n = parseInt(h.slice(1), 16); const f = (c) => Math.pow(c / 255, 2.2); return [f((n >> 16) & 255), f((n >> 8) & 255), f(n & 255)]; };

// ---- the animals --------------------------------------------------------------------------------
// Lengths are adult sizes for the species. A mesh is built along +X (head forward), 1 unit long,
// and scaled per instance.
function fishMesh(back, belly, fin, o = {}) {
  const m = new MeshBuilder(), col = [];
  const h = o.h || 0.13, w = o.w || 0.075;
  const add = (fn, colorFn) => { const n0 = m.vertexCount; fn(); for (let k = n0; k < m.vertexCount; k++) col.push(colorFn(m.v[k * 3], m.v[k * 3 + 1], m.v[k * 3 + 2])); };
  // Countershading: dark back, silver belly - what every open-water fish here wears.
  const shade = (x, y) => { const t = Math.max(0, Math.min(1, (y / h + 1) / 2)); return [0, 1, 2].map((i) => belly[i] + (back[i] - belly[i]) * t * t); };
  // THE BODY: fusiform - a rounded head, deepest a third of the way back, tapering to a narrow
  // tail stalk (the caudal peduncle) that the tail fin grows out of. The first cut was a
  // symmetric lozenge with the tail as a separate blob, and read as a pebble (26 Sep).
  add(() => blob(m, [0, 0, 0], 0.5, h, w, { seg: 18, rings: 10, e1: 0.95,
    deform: (x, y, z) => {
      const t = (x / 0.5 + 1) / 2;                                   // 0 tail .. 1 snout
      const prof = t > 0.62 ? Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.62) / 0.38, 2))) * 0.97 + 0.03
        : 0.14 + 0.86 * Math.pow(Math.sin(Math.PI * 0.5 * t / 0.62), 1.3);
      return [x, y * prof, z * prof];
    } }), shade);
  // The forked tail: two lobes, attached at the stalk.
  for (const sgn of [1, -1]) {
    add(() => blob(m, [-0.55, sgn * h * 0.45, 0], 0.09, h * 0.62, 0.006, { seg: 8, rings: 5, e1: 0.6,
      deform: (x, y, z) => [x + (sgn * y) * 0.35, y, z] }), () => fin);
  }
  add(() => blob(m, [-0.05, h * 0.9, 0], 0.14, h * 0.4, 0.005, { seg: 8, rings: 5, e1: 0.7 }), () => fin);            // first dorsal
  add(() => blob(m, [-0.26, h * 0.62, 0], 0.08, h * 0.28, 0.004, { seg: 6, rings: 4, e1: 0.7 }), () => fin);           // second dorsal
  add(() => blob(m, [-0.24, -h * 0.62, 0], 0.07, h * 0.24, 0.004, { seg: 6, rings: 4, e1: 0.7 }), () => fin);          // anal fin
  for (const sgn of [1, -1]) add(() => blob(m, [0.2, -h * 0.25, sgn * w * 0.95], 0.07, 0.006, h * 0.3, { seg: 6, rings: 4 }), () => fin);   // pectorals
  for (const sgn of [1, -1]) add(() => blob(m, [0.36, h * 0.18, sgn * w * 0.72], 0.028, 0.028, 0.012, { seg: 8, rings: 5 }), () => [0.02, 0.02, 0.02]);  // eyes
  if (o.stripes) {
    for (const y of [0.15, 0.4, 0.62]) add(() => blob(m, [-0.02, h * y, 0], 0.36, 0.01, w * 0.9, { seg: 10, rings: 4,
      deform: (x, yy, z) => { const t = (x / 0.36 + 1) / 2; return [x, yy, z * (0.35 + 0.65 * Math.sin(Math.PI * Math.min(1, t * 1.1)))]; } }), () => o.stripes);
  }
  return { m, col };
}
function flatMesh(top, rim, o = {}) {       // a flounder or a ray: a flat oval body
  const m = new MeshBuilder(), col = [];
  const put = (fn, c) => { const n0 = m.vertexCount; fn(); for (let k = n0; k < m.vertexCount; k++) col.push(c); };
  const n0 = m.vertexCount;
  blob(m, [0, 0, 0], 0.5, 0.05, o.w || 0.32, { seg: 16, rings: 8, e1: 0.8 });
  for (let k = n0; k < m.vertexCount; k++) {
    const y = m.v[k * 3 + 1], x = m.v[k * 3], z = m.v[k * 3 + 2];
    const sp = 0.7 + 0.3 * Math.sin(x * 37 + z * 23) * Math.sin(x * 11 - z * 19);   // mottling
    col.push(y > 0 ? top.map((c) => c * sp) : rim);
  }
  if (o.eyes) for (const z of [0.05, -0.04]) put(() => blob(m, [0.34, 0.05, z], 0.02, 0.02, 0.02, { seg: 8, rings: 5 }), [0.09, 0.07, 0.04]);
  // A flounder's fin fringe all round and its short fanned tail: the outline that gives it away.
  if (o.fringe) {
    const n1 = m.vertexCount;
    blob(m, [0, -0.005, 0], 0.56, 0.012, (o.w || 0.32) * 1.14, { seg: 16, rings: 6 });
    blob(m, [-0.56, 0, 0], 0.1, 0.012, 0.12, { seg: 10, rings: 5, deform: (x, y, z) => [x, y, z * (1.2 - (x + 0.1) * 3)] });
    for (let k = n1; k < m.vertexCount; k++) col.push(o.fringe);
  }
  if (o.tail) put(() => m.tube(-0.45, 0, 0, -1.1, 0, 0, 0.03, 0.006, 6), top);
  return { m, col };
}
// A SPIDER CRAB (Maja): a pear-shaped, knobbly shell narrowing to two horns at the front, slender
// claws, and four pairs of long legs raised at the knee. The first cut had all eight legs pointing
// forward off a round shell, and read as a dark ball with a few sticks (26 Sep).
function crabMesh(shell, leg) {
  const m = new MeshBuilder(), col = [];
  const put = (fn, c) => { const n0 = m.vertexCount; fn(); for (let k = n0; k < m.vertexCount; k++) col.push(c); };
  const n0 = m.vertexCount;
  blob(m, [0, 0.12, 0], 0.42, 0.2, 0.36, { seg: 14, rings: 8,
    deform: (x, y, z) => { const t = (x / 0.4 + 1) / 2; return [x, y * (1.05 - 0.35 * t), z * (1.12 - 0.62 * t)]; } });
  for (let k = n0; k < m.vertexCount; k++) {
    const x = m.v[k * 3], z = m.v[k * 3 + 2];
    const knob = 0.78 + 0.22 * Math.abs(Math.sin(x * 29) * Math.sin(z * 31));          // warty, weedy shell
    col.push(shell.map((c) => c * knob));
  }
  for (const s of [-1, 1]) {
    put(() => m.tube(0.36, 0.14, s * 0.03, 0.56, 0.2, s * 0.09, 0.025, 0.01, 5), shell);                  // the horns
    put(() => blob(m, [0.3, 0.2, s * 0.08], 0.025, 0.025, 0.025, { seg: 6, rings: 4 }), [0.05, 0.03, 0.02]);   // eyes
    // The claws: forward and in, as thick as the legs, a little thicker at the pincer.
    put(() => { m.tube(0.22, 0.08, s * 0.18, 0.44, 0.2, s * 0.36, 0.04, 0.035, 6); m.tube(0.44, 0.2, s * 0.36, 0.66, 0.06, s * 0.26, 0.05, 0.018, 6); }, leg);
    for (let i = 0; i < 4; i++) {
      const x0 = 0.12 - i * 0.14, th = 0.75 - i * 0.5;                                  // front legs reach forward, back legs back
      const dx = Math.sin(th), dz = s * Math.cos(th), z0 = s * (0.26 - Math.abs(i - 1.5) * 0.03);
      const kx = x0 + dx * 0.5, kz = z0 + dz * 0.5, fx = x0 + dx * 1.08, fz = z0 + dz * 1.08;
      put(() => { m.tube(x0, 0.1, z0, kx, 0.34, kz, 0.05, 0.04, 6); m.tube(kx, 0.34, kz, fx, -0.06, fz, 0.04, 0.014, 6); }, leg);
    }
  }
  return { m, col };
}
function jellyMesh(bell, arms, o = {}) {
  const m = new MeshBuilder(), col = [];
  const put = (fn, c) => { const n0 = m.vertexCount; fn(); for (let k = n0; k < m.vertexCount; k++) col.push(c); };
  put(() => blob(m, [0, 0, 0], 0.5, 0.3, 0.5, { seg: 16, rings: 8, deform: (x, y, z) => [x, y < 0 ? y * 0.2 : y, z] }), bell);
  if (o.rings) for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.785; put(() => blob(m, [Math.cos(a) * 0.14, 0.12, Math.sin(a) * 0.14], 0.08, 0.02, 0.08, { seg: 8, rings: 4 }), o.rings); }
  if (o.frills) put(() => { for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; m.tube(Math.cos(a) * 0.12, -0.05, Math.sin(a) * 0.12, Math.cos(a) * 0.05, -0.9, Math.sin(a) * 0.05, 0.07, 0.02, 6); } }, arms);
  else put(() => { for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8; m.tube(Math.cos(a) * 0.46, -0.04, Math.sin(a) * 0.46, Math.cos(a) * 0.5, -0.35, Math.sin(a) * 0.5, 0.006, 0.003, 3); } }, arms);
  return { m, col };
}
function cuttleMesh(body, fin) {
  const m = new MeshBuilder(), col = [];
  const n0 = m.vertexCount;
  blob(m, [0, 0, 0], 0.5, 0.17, 0.24, { seg: 14, rings: 8 });
  for (let k = n0; k < m.vertexCount; k++) { const x = m.v[k * 3]; col.push(body.map((c) => c * (0.8 + 0.2 * Math.sin(x * 40)))); }
  const n1 = m.vertexCount; blob(m, [0, -0.02, 0], 0.48, 0.02, 0.33, { seg: 14, rings: 5 }); for (let k = n1; k < m.vertexCount; k++) col.push(fin);   // the fin skirt
  const n2 = m.vertexCount; for (let i = 0; i < 6; i++) m.tube(0.45, 0, (i - 2.5) * 0.04, 0.72, -0.03, (i - 2.5) * 0.05, 0.025, 0.01, 4); for (let k = n2; k < m.vertexCount; k++) col.push(body);
  return { m, col };
}

// kind: 0 fish (wiggles), 1 flat (flaps the rim), 2 crab, 3 jelly (pulses, translucent)
const SPECIES = {
  sandeel: { len: 0.18, kind: 0, mesh: () => fishMesh(hex('#6F8791'), hex('#D9E2E4'), hex('#8FA3AA'), { h: 0.07, w: 0.045 }), shiny: 1 },
  bass:    { len: 0.55, kind: 0, mesh: () => fishMesh(hex('#4D5A63'), hex('#D5DADB'), hex('#5E6A70'), { h: 0.13, w: 0.07 }), shiny: 0.8 },
  mullet:  { len: 0.5,  kind: 0, mesh: () => fishMesh(hex('#4A535C'), hex('#A9B0B4'), hex('#4F5961'), { h: 0.12, w: 0.075, stripes: hex('#353D44') }), shiny: 0.45 },
  wrasse:  { len: 0.35, kind: 0, mesh: () => fishMesh(hex('#5B6B3E'), hex('#A58C58'), hex('#6A6440'), { h: 0.15, w: 0.08 }), shiny: 0.2 },
  flounder:{ len: 0.32, kind: 1, mesh: () => flatMesh(hex('#9A8662'), hex('#E6E2D6'), { w: 0.34, eyes: true, fringe: hex('#B4A27E') }), shiny: 0 },
  ray:     { len: 0.9,  kind: 1, mesh: () => flatMesh(hex('#7A6E5E'), hex('#E8E4DC'), { w: 0.62, tail: true }), shiny: 0 },
  crab:    { len: 0.2,  kind: 2, mesh: () => crabMesh(hex('#B0704A'), hex('#A0643F')), shiny: 0 },
  moon:    { len: 0.28, kind: 3, mesh: () => jellyMesh(hex('#DCE4EC'), hex('#DCE4EC'), { rings: hex('#B48CC8') }), shiny: 0, alpha: 0.45 },
  barrel:  { len: 0.5,  kind: 3, mesh: () => jellyMesh(hex('#E4EAF0'), hex('#C8D4E6'), { frills: true }), shiny: 0, alpha: 0.5 },
  cuttle:  { len: 0.25, kind: 0, mesh: () => cuttleMesh(hex('#7A6A55'), hex('#A89880')), shiny: 0.1 },
};

// ---- the shader ---------------------------------------------------------------------------------
const VERT = `#version 300 es
precision highp float;
in vec3 aPos; in vec3 aNormal; in vec3 aColor;
in vec4 aI0;   // x y z yaw
in vec4 aI1;   // pitch, phase, scale, kind
in vec4 aI2;   // wiggle amplitude, wiggle rate, shiny, pulse
uniform mat4 uViewProj;
uniform float uTime;
out vec3 vWorld; out vec3 vN; out vec3 vCol; out float vShiny; out float vKind;
void main() {
  vec3 p = aPos, n = aNormal;
  float k = aI1.w, ph = aI1.y, t = uTime;
  if (k < 0.5) {            // fish: a travelling wave down the body, bigger toward the tail
    float amp = aI2.x * smoothstep(0.35, -0.6, p.x);
    p.z += sin(p.x * 6.0 - t * aI2.y + ph) * amp;
  } else if (k < 1.5) {     // flat: the rim of the body ripples
    p.y += sin(p.x * 5.0 - t * aI2.y + ph) * aI2.x * smoothstep(0.1, 0.32, abs(p.z));
  } else if (k < 2.5) {     // crab: legs step
    p.y += max(0.0, sin(t * aI2.y + ph + p.x * 3.0 + sign(p.z) * 1.6)) * aI2.x * smoothstep(0.3, 0.9, abs(p.z));
  } else {                  // jellyfish: the bell pulses
    float s = 1.0 + sin(t * aI2.y + ph) * aI2.x;
    p.xz *= s; p.y *= 2.0 - s;
  }
  p *= aI1.z;
  float cp = cos(aI1.x), sp = sin(aI1.x), cy = cos(aI0.w), sy = sin(aI0.w);
  vec3 q = vec3(p.x * cp - p.y * sp, p.x * sp + p.y * cp, p.z);
  vec3 w = vec3(cy * q.x - sy * q.z, q.y, sy * q.x + cy * q.z) + aI0.xyz;
  vec3 qn = vec3(n.x * cp - n.y * sp, n.x * sp + n.y * cp, n.z);
  vN = vec3(cy * qn.x - sy * qn.z, qn.y, sy * qn.x + cy * qn.z);
  vWorld = w; vCol = aColor; vShiny = aI2.z; vKind = aI1.w;
  gl_Position = uViewProj * vec4(w, 1.0);
}
`;
const FRAG = `#version 300 es
precision highp float;
in vec3 vWorld; in vec3 vN; in vec3 vCol; in float vShiny; in float vKind;
out vec4 fragColor;
uniform vec3 uCamPos; uniform vec3 uSunW; uniform float uSurfY; uniform float uExposure; uniform float uAlpha;
vec3 aces(vec3 x) { const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14; return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0); }
void main() {
  vec3 N = normalize(vN), V = normalize(uCamPos - vWorld);
  if (dot(N, V) < 0.0) N = -N;
  float depth = max(uSurfY - vWorld.y, 0.0);
  vec3 atten = exp(-vec3(0.42, 0.12, 0.14) * depth * 1.2);
  float ndl = max(dot(N, uSunW), 0.0);
  vec3 col = vCol * (0.35 + 0.75 * ndl) * atten * 1.3;
  // Silver fish flash as they turn: a broad mirror-like highlight from the bright water above.
  vec3 R = reflect(-V, N);
  float flash = pow(max(R.y, 0.0), 3.0) * vShiny;
  col += vec3(0.55, 0.75, 0.72) * flash * atten;
  float a = uAlpha;
  if (vKind > 2.5) {
    // A jellyfish is nearly invisible face-on and catches the light at its edges - the rim is what
    // you actually see in the water. Face-on at 0.35 it vanished completely in the haze (26 Sep).
    float rim = 1.0 - abs(dot(N, V));
    a = clamp(uAlpha * (0.45 + 1.4 * rim * rim), 0.0, 0.95);
    col = col * 1.25 + vec3(0.45, 0.55, 0.6) * rim * 0.5 * atten;
  }
  fragColor = vec4(pow(aces(col * uExposure), vec3(1.0 / 2.2)), a);
}
`;
const ATTR = { aPos: 0, aNormal: 1, aColor: 2, aI0: 3, aI1: 4, aI2: 5 };

// ---- deterministic hashing ----------------------------------------------------------------------
function hash(a, b, c) {
  let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1) ^ Math.imul(c | 0, 0x9e3779b1);
  h ^= h >>> 15; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export class SeaLife {
  constructor(gl) {
    this.gl = gl;
    this.prog = link(gl, VERT, FRAG, 'sealife', ATTR);
    this.u = uniforms(gl, this.prog, ['uViewProj', 'uTime', 'uCamPos', 'uSunW', 'uSurfY', 'uExposure', 'uAlpha']);
    this.types = {};
    for (const name in SPECIES) this.types[name] = this._upload(SPECIES[name].mesh());
    this.stat = { instances: 0, species: {} };
    this.near = null;               // the nearest creature to the camera (for a name label)
  }

  _upload({ m, col }) {
    const gl = this.gl, nv = m.vertexCount, data = new Float32Array(nv * 9);
    for (let i = 0; i < nv; i++) data.set([m.v[i * 3], m.v[i * 3 + 1], m.v[i * 3 + 2], m.n[i * 3], m.n[i * 3 + 1], m.n[i * 3 + 2], col[i][0], col[i][1], col[i][2]], i * 9);
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    buffer(gl, gl.ARRAY_BUFFER, data);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 36, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 36, 12);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 36, 24);
    const inst = new Float32Array(MAX_INST * INST);
    const ibo = buffer(gl, gl.ARRAY_BUFFER, inst, gl.DYNAMIC_DRAW);
    for (let j = 0; j < 3; j++) { gl.enableVertexAttribArray(3 + j); gl.vertexAttribPointer(3 + j, 4, gl.FLOAT, false, 48, j * 16); gl.vertexAttribDivisor(3 + j, 1); }
    const idx = m.i.length > 65535 * 3 ? new Uint32Array(m.i) : new Uint16Array(m.i);
    buffer(gl, gl.ELEMENT_ARRAY_BUFFER, idx);
    gl.bindVertexArray(null);
    return { vao, ibo, inst, n: 0, count: m.i.length, big: idx instanceof Uint32Array };
  }

  _add(name, x, y, z, yaw, pitch, phase, wig, rate, pulse) {
    const T = this.types[name], S = SPECIES[name];
    if (T.n >= MAX_INST) return;
    const o = T.n * INST, a = T.inst;
    a[o] = x; a[o + 1] = y; a[o + 2] = z; a[o + 3] = yaw;
    a[o + 4] = pitch; a[o + 5] = phase; a[o + 6] = S.len; a[o + 7] = S.kind;
    a[o + 8] = wig; a[o + 9] = rate; a[o + 10] = S.shiny || 0; a[o + 11] = pulse || 0;
    T.n++;
    const d = Math.hypot(x - this._cx, y - this._cy, z - this._cz);
    if (d < this._nd) { this._nd = d; this.near = { name, x, y, z, d }; }
  }

  // The nearest placed creature of one species this frame (for the film tool and tests), or null.
  nearestOf(name) {
    const T = this.types[name];
    if (!T || !T.n) return null;
    let best = null, bd = 1e9;
    for (let k = 0; k < T.n; k++) {
      const o = k * INST, x = T.inst[o], y = T.inst[o + 1], z = T.inst[o + 2];
      const d = Math.hypot(x - this._cx, y - this._cy, z - this._cz);
      if (d < bd) { bd = d; best = { name, x, y, z, d, yaw: T.inst[o + 3] }; }
    }
    return best;
  }

  // The water column at a point: still-water surface and seabed heights.
  _column(x, z, tide) { const bed = tide - surfBed(x, z); return { bed, top: tide, depth: tide - bed }; }

  // Place every creature for this frame. `U` is underwater.js's state for the frame.
  populate(sim, cam, U) {
    for (const k in this.types) this.types[k].n = 0;
    this.near = null; this._nd = 1e9; this._cx = cam.x; this._cy = cam.y; this._cz = cam.z;
    const t = sim.time, tide = sim.sea.tide || 0;
    const ci = Math.floor(cam.x / CELL), cj = Math.floor(cam.z / CELL);
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) this._cell(ci + di, cj + dj, t, tide);
    let n = 0; for (const k in this.types) { n += this.types[k].n; this.stat.species[k] = this.types[k].n; }
    this.stat.instances = n;
  }

  _cell(i, j, t, tide) {
    const r = (s) => hash(i, j, s);
    const cx = (i + 0.5) * CELL, cz = (j + 0.5) * CELL;
    const home = this._column(cx, cz, tide);
    if (home.depth < 0.7) return;                          // the swash zone: nothing lives in view there
    // A swimming group: a centre on a slow closed path inside the cell, members spread round it.
    const group = (name, s, count, spread, speed, fracLo, fracHi, wig, rate) => {
      const A = CELL * (0.18 + 0.16 * r(s + 1)), w1 = speed / A, w2 = w1 * (0.6 + 0.5 * r(s + 2)), p1 = r(s + 3) * 6.28, p2 = r(s + 4) * 6.28;
      const gx = cx + (r(s + 5) - 0.5) * CELL * 0.4 + Math.sin(t * w1 + p1) * A;
      const gz = cz + (r(s + 6) - 0.5) * CELL * 0.4 + Math.cos(t * w2 + p2) * A * 0.8;
      const vx = Math.cos(t * w1 + p1) * A * w1, vz = -Math.sin(t * w2 + p2) * A * 0.8 * w2;
      const yaw = Math.atan2(vz, vx);
      const col = this._column(gx, gz, tide);
      if (col.depth < 0.6) return;
      const gy = col.bed + 0.25 + (col.depth - 0.55) * (fracLo + (fracHi - fracLo) * (0.5 + 0.5 * Math.sin(t * 0.1 + p1)));
      for (let k = 0; k < count; k++) {
        const a = hash(i * 31 + k, j, s + 7), b = hash(i, j * 17 + k, s + 8), c = hash(i + k, j - k, s + 9);
        const ox = (a - 0.5) * spread * 2, oz = (b - 0.5) * spread, oy = (c - 0.5) * spread * 0.5;
        const cyw = Math.cos(yaw), syw = Math.sin(yaw);
        const x = gx + cyw * ox - syw * oz + Math.sin(t * (0.7 + a) + k) * 0.15;
        const z = gz + syw * ox + cyw * oz + Math.cos(t * (0.6 + b) + k) * 0.15;
        const y = Math.min(col.top - 0.3, Math.max(col.bed + 0.15, gy + oy));
        this._add(name, x, y, z, yaw + (c - 0.5) * 0.3, (a - 0.5) * 0.15, k * 1.7, wig, rate * (0.85 + 0.3 * a), 0);
      }
    };
    // Sand eels: common, in schools low over the sand.
    if (r(10) < 0.35) group('sandeel', 20, 25 + Math.floor(r(11) * 20), 1.3, 0.7, 0.1, 0.45, 0.06, 13);
    // Bass: frequent, small groups cruising mid-water.
    if (r(30) < 0.25) group('bass', 40, 2 + Math.floor(r(31) * 4), 1.2, 0.45, 0.25, 0.6, 0.05, 6);
    // Grey mullet: groups just under the surface.
    if (r(50) < 0.14) group('mullet', 60, 4 + Math.floor(r(51) * 4), 1.4, 0.4, 0.75, 0.95, 0.05, 6);
    // Cuttlefish: an occasional sighting, hovering near the bottom.
    if (r(70) < 0.03) group('cuttle', 80, 1, 0.1, 0.12, 0.08, 0.2, 0.0, 3);
    // Flounders: on the sand, very common; now and then one lifts off and settles again.
    const nf = Math.floor(r(90) * 2.4);
    for (let k = 0; k < nf; k++) {
      const x = cx + (hash(i, j, 91 + k) - 0.5) * CELL, z = cz + (hash(i, j, 95 + k) - 0.5) * CELL;
      const col = this._column(x, z, tide);
      const hop = Math.max(0, Math.sin(t * 0.07 + k * 2.1 + r(99) * 6)) ;
      const lift = hop > 0.97 ? (hop - 0.97) / 0.03 : 0;
      this._add('flounder', x + lift * 1.2, col.bed + 0.02 + lift * 0.25, z, r(97 + k) * 6.28, 0, k, lift > 0 ? 0.03 : 0.004, 4, 0);
    }
    // Spider crabs: on the bottom, walking slowly.
    const nc = r(110) < 0.25 ? 1 + Math.floor(r(111) * 2) : 0;
    for (let k = 0; k < nc; k++) {
      const ang = r(112 + k) * 6.28, walk = t * 0.05 * (0.5 + r(115 + k));
      const x = cx + (hash(i, j, 120 + k) - 0.5) * CELL * 0.8 + Math.cos(ang) * Math.sin(walk) * 2;
      const z = cz + (hash(i, j, 125 + k) - 0.5) * CELL * 0.8 + Math.sin(ang) * Math.sin(walk) * 2;
      const col = this._column(x, z, tide);
      this._add('crab', x, col.bed + 0.02, z, ang + (Math.cos(walk) > 0 ? 0 : Math.PI), 0, k, 0.03, 5, 0);
    }
    // Jellyfish: moon jellies common, drifting mid-water; a barrel jellyfish now and then.
    const nm = Math.floor(r(130) * 1.8);
    for (let k = 0; k < nm; k++) {
      const x = cx + (hash(i, j, 131 + k) - 0.5) * CELL + t * 0.03, z = cz + (hash(i, j, 136 + k) - 0.5) * CELL;
      const col = this._column(x, z, tide);
      const y = col.bed + 0.3 + (col.depth - 0.6) * (0.3 + 0.5 * hash(i, j, 141 + k));
      this._add('moon', x, Math.min(col.top - 0.25, y), z, 0, 0, k * 2, 0.12, 2.2, 0);
    }
    if (r(150) < 0.04) {
      const x = cx + (r(151) - 0.5) * CELL * 0.6 + t * 0.02, z = cz + (r(152) - 0.5) * CELL * 0.6;
      const col = this._column(x, z, tide);
      this._add('barrel', x, Math.min(col.top - 0.5, col.bed + 0.5 + col.depth * 0.4), z, 0, 0, 1, 0.08, 1.6, 0);
    }
    // A thornback ray: a lucky sighting, gliding low over the sand.
    if (r(160) < 0.025) {
      const A = CELL * 0.3, w = 0.25 / A, p = r(161) * 6.28;
      const x = cx + Math.sin(t * w + p) * A, z = cz + Math.sin(2 * (t * w + p)) * A * 0.5;
      const vx = Math.cos(t * w + p), vz = Math.cos(2 * (t * w + p));
      const col = this._column(x, z, tide);
      this._add('ray', x, col.bed + 0.18, z, Math.atan2(vz, vx), 0, 0, 0.06, 2.4, 0);
    }
  }

  draw(cam, vp, U, exposure, time) {
    const gl = this.gl, u = this.u;
    gl.useProgram(this.prog);
    gl.uniformMatrix4fv(u.uViewProj, false, vp);
    gl.uniform1f(u.uTime, time % 1000);
    gl.uniform3f(u.uCamPos, cam.x, cam.y, cam.z);
    gl.uniform3f(u.uSunW, U.sunW[0], U.sunW[1], U.sunW[2]);
    gl.uniform1f(u.uSurfY, U.surfY);
    gl.uniform1f(u.uExposure, exposure);
    gl.disable(gl.CULL_FACE);
    const pass = (translucent) => {
      for (const name in this.types) {
        const T = this.types[name], S = SPECIES[name];
        if (!T.n || (S.kind === 3) !== translucent) continue;
        gl.uniform1f(u.uAlpha, S.alpha || 1);
        gl.bindBuffer(gl.ARRAY_BUFFER, T.ibo);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, T.inst, 0, T.n * INST);
        gl.bindVertexArray(T.vao);
        gl.drawElementsInstanced(gl.TRIANGLES, T.count, T.big ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT, 0, T.n);
      }
    };
    pass(false);
    // The jellyfish WRITE depth, like the surface from below: the post haze reads the depth buffer,
    // and without it a jelly 1 m away was hazed as if it were the seabed 10 m behind it - gone.
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    pass(true);
    gl.depthMask(true); gl.disable(gl.BLEND);
    gl.bindVertexArray(null);
  }
}

// What a creature is called, for the underwater view's label.
export const SEALIFE_NAMES = {
  sandeel: 'Sand eels', bass: 'Bass', mullet: 'Grey mullet', wrasse: 'Wrasse', flounder: 'Flounder',
  ray: 'Thornback ray', crab: 'Spider crab', moon: 'Moon jellyfish', barrel: 'Barrel jellyfish', cuttle: 'Cuttlefish',
};
void V3;
