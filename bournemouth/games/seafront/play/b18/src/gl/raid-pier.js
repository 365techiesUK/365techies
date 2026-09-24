// VIKING RAID - PIER SIEGE effects (tr60): fire on Bournemouth Pier, smoke columns,
// embers, orange glow, soot/charring and collapse overlays, falling debris, the water
// cannon's stream with spray and steam, fire pots and flaming arrows in flight, ladders,
// mooring lines and the warriors on the ladders (knocked off into the water unharmed).
//
// The pier mesh is STATIC and this file never edits it. Charring is translucent dark shells
// laid just outside a burning section's walls and roof. A FALLEN section is now a REAL GAP
// (tr64): its own above-deck triangles stop being drawn (src/raid/hide-ranges.js), the
// collapse throws the superstructure into the sea in tumbling chunks behind a wall of dust,
// and what this draws afterwards is the burnt deck, broken stumps round its edge, beams
// hanging in the void, planks under the edge and wreckage in the water. Fires are
// kept on the roofs and the walkway ridge, not on the deck where the (static) crowd
// figures stand; the intro says the pier has been evacuated.
//
// COST (tr62). Solid pieces (debris, ruins, ladders, pots, arrows, figures) + translucent soot boxes use
// this program; all smoke, fire, embers, steam and spray are soft sprites (raid-sprites.js, ONE draw). Was: three passes (opaque, alpha smoke/steam/soot, additive flame/
// embers/glow), one instanced draw per mesh per pass in use (<= 18). Meshes are built
// when the raid is first entered (never at page load) and a frame rewrites small
// per-instance buffers. Particles are capped at 1400.
//
// CONTENT. Cartoon: warriors are chunky figures with rounded helmets (no horns), the
// ones hosed off a ladder tumble into the water and swim away (raid.js swimmers).
// No blood, no gore, nobody on the pier.
//
// ⚠️ No backtick may appear inside the GLSL template literals below.

import { link, uniforms, buffer } from './core.js';
import { SECTIONS, SPOTS, DECK, pierAt, pierEdges, ladderEnds, climberPos, sectionCentre, ACROSS } from '../raid/siege.js';
import { Kit as RaidKit } from './raid-kit.js';
import { buildClimber } from './raid-crew.js';
import { RaidSprites } from './raid-sprites.js';   // tr62: soft camera-facing smoke/fire/steam sprites
import { crowdDist } from '../raid/crowd.js';
import { FALL_SEC } from '../raid/hide-ranges.js';   // tr64: when the section's mesh stops being drawn

const ATTR = { aPos: 0, aNormal: 1, aColor: 2, aI0: 3, aI1: 4, aI2: 5, aI3: 6 };
const MAX_INST = 1024, IF = 16, MAX_PARTS = 1400;

const VERT = `#version 300 es
precision highp float;
in vec3 aPos; in vec3 aNormal; in vec3 aColor;
in vec4 aI0; in vec4 aI1; in vec4 aI2; in vec4 aI3;
uniform mat4 uViewProj;
uniform float uTime;
out vec3 vN; out vec3 vCol; out vec3 vW; out float vA; out float vEm;
void main() {
  vec3 p = aPos * aI1.xyz;
  vec3 n = aNormal;
  if (aI3.w > 0.0) {
    float f = aI3.z + uTime * 11.0;
    float k = max(aPos.y, 0.0);
    p.x += sin(f + aPos.y * 3.0) * 0.16 * aI3.w * k * aI1.x;
    p.z += cos(f * 1.3 + aPos.y * 2.0) * 0.16 * aI3.w * k * aI1.z;
    p.y *= 1.0 + 0.22 * aI3.w * sin(f * 1.7);
  }
  float cr = cos(aI3.y), sr = sin(aI3.y);
  p = vec3(p.x, p.y * cr - p.z * sr, p.y * sr + p.z * cr); n = vec3(n.x, n.y * cr - n.z * sr, n.y * sr + n.z * cr);
  float cp = cos(aI1.w), sp = sin(aI1.w);
  p = vec3(p.x * cp - p.y * sp, p.x * sp + p.y * cp, p.z); n = vec3(n.x * cp - n.y * sp, n.x * sp + n.y * cp, n.z);
  float ch = cos(aI0.w), sh = sin(aI0.w);
  p = vec3(p.x * ch - p.z * sh, p.y, p.x * sh + p.z * ch); n = vec3(n.x * ch - n.z * sh, n.y, n.x * sh + n.z * ch);
  vec3 w = p + aI0.xyz;
  vW = w; vN = n; vCol = aColor * aI2.rgb; vA = aI2.a; vEm = aI3.x;
  gl_Position = uViewProj * vec4(w, 1.0);
}
`;

const FRAG = `#version 300 es
precision highp float;
in vec3 vN; in vec3 vCol; in vec3 vW; in float vA; in float vEm;
out vec4 fragColor;
uniform vec3 uCamPos;
uniform vec3 uSunDir;
uniform float uExposure;
vec3 acesR(vec3 x) {
  const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}
void main() {
  vec3 N = normalize(vN);
  vec3 V = normalize(uCamPos - vW);
  if (dot(N, V) < 0.0) N = -N;
  float ndl = max(dot(N, uSunDir), 0.0);
  vec3 lit = vCol * (0.46 + 0.62 * ndl);
  float em = clamp(vEm, 0.0, 1.0);
  vec3 col = mix(lit, vCol * 1.35, em) * (1.0 + max(0.0, vEm - 1.0));
  float h = 1.0 - exp(-length(uCamPos - vW) / 2400.0);
  col = mix(col, vec3(0.80, 0.86, 0.92), h * 0.55 * (1.0 - em));
  fragColor = vec4(pow(acesR(col * uExposure), vec3(1.0 / 2.2)), vA);
}
`;

// ---- tiny mesh kit: positions, normals, vertex colours ------------------------------------
class Kit {
  constructor() { this.p = []; this.n = []; this.c = []; this.i = []; }
  v(x, y, z, nx, ny, nz, c) { this.p.push(x, y, z); this.n.push(nx, ny, nz); this.c.push(c[0], c[1], c[2]); return this.p.length / 3 - 1; }
  box(c, x0, y0, z0, x1, y1, z1) {
    const F = [[[1, 0, 0], [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]]], [[-1, 0, 0], [[x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [x0, y0, z0]]],
      [[0, 1, 0], [[x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0]]], [[0, -1, 0], [[x0, y0, z1], [x0, y0, z0], [x1, y0, z0], [x1, y0, z1]]],
      [[0, 0, 1], [[x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [x0, y0, z1]]], [[0, 0, -1], [[x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0]]]];
    for (const [nn, q] of F) {
      const b = q.map((p) => this.v(p[0], p[1], p[2], nn[0], nn[1], nn[2], c));
      this.i.push(b[0], b[1], b[2], b[0], b[2], b[3]);
    }
    return this;
  }
  // ellipsoid-ish lathe: r(t) along y from y0 to y1, t in [0,1]
  lathe(c, cx, cy, cz, y0, y1, rf, seg = 8, rings = 5, sx = 1, sz = 1) {
    const base = this.p.length / 3;
    for (let j = 0; j <= rings; j++) {
      const t = j / rings, y = y0 + (y1 - y0) * t, r = rf(t);
      const dr = (rf(Math.min(1, t + 0.02)) - rf(Math.max(0, t - 0.02))) / 0.04 / Math.max(1e-3, y1 - y0);
      for (let k = 0; k < seg; k++) {
        const a = (k / seg) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
        const nl = Math.hypot(1, dr);
        this.v(cx + ca * r * sx, cy + y, cz + sa * r * sz, ca / nl, -dr / nl, sa / nl, c);
      }
    }
    for (let j = 0; j < rings; j++) for (let k = 0; k < seg; k++) {
      const a = base + j * seg + k, b = base + j * seg + (k + 1) % seg, d = a + seg, e = b + seg;
      this.i.push(a, d, b, b, d, e);
    }
    return this;
  }
  get tris() { return this.i.length / 3; }
}
const WHITE = [1, 1, 1];
const sphere = (t) => Math.sin(Math.PI * t);
function buildBox() { return new Kit().box(WHITE, -0.5, -0.5, -0.5, 0.5, 0.5, 0.5); }
function buildLadder() {
  const k = new Kit(), w = [0.46, 0.31, 0.16];
  k.box(w, 0, -0.05, -0.32, 1, 0.05, -0.24).box(w, 0, -0.05, 0.24, 1, 0.05, 0.32);
  for (let i = 1; i < 9; i++) k.box(w, i / 9 - 0.012, -0.03, -0.26, i / 9 + 0.012, 0.03, 0.26);
  return k;
}
function buildFigure(foe) {
  // The raider on a ladder (tr67). He is the SAME model as the crews on the ships - built by
  // raid-crew.js into a raid Kit and then copied into this file's simpler vertex kit, which
  // carries no anim code or pivot. Only the geometry crosses over; nothing about the siege,
  // the climb or the ladder changes. +X faces the pier.
  // tr128: `foe` swaps his headgear only, so a pirate ship does not send Vikings up its ladders.
  const k = buildClimber(new RaidKit(), foe === 'pirate' ? { headgear: 'hat' } : {}), c = [];
  for (let i = 0; i < k.col.length; i += 4) c.push(k.col[i], k.col[i + 1], k.col[i + 2]);
  return { p: k.pos, n: k.nrm, c, i: k.idx, tris: k.idx.length / 3 };
}

// tr136: a round shot. 64 triangles of iron ball; at the ranges it is seen from that is
// already generous, and it is built once, on raid entry, like everything else here.
function buildShot() {
  const k = new Kit();
  k.lathe([0.10, 0.105, 0.115], 0, 0, 0, -0.5, 0.5, sphere, 8, 4);
  return k;
}

function buildPot() {
  const k = new Kit(), clay = [0.5, 0.3, 0.18];
  k.lathe(clay, 0, 0, 0, -0.5, 0.45, (t) => (t < 0.8 ? 0.5 * Math.sin(Math.PI * Math.min(1, t / 0.9)) + 0.05 : 0.2), 8, 5);
  return k;
}
function buildArrow() {
  const k = new Kit();
  k.box([0.5, 0.36, 0.2], -0.55, -0.03, -0.03, 0.5, 0.03, 0.03).box([0.8, 0.8, 0.8], -0.6, -0.08, -0.01, -0.4, 0.08, 0.01);
  return k;
}

const C = {
  flameA: [1.0, 0.3, 0.03], flameB: [1.0, 0.55, 0.08], core: [1.0, 0.82, 0.3], ember: [1.0, 0.55, 0.12], glow: [1.0, 0.42, 0.08],
  smoke: [0.13, 0.12, 0.115], smokeL: [0.36, 0.35, 0.36], smokeFar: [0.5, 0.49, 0.5], steam: [0.93, 0.95, 0.97], soot: [0.05, 0.04, 0.035], char: [0.06, 0.055, 0.05],
  wood: [0.36, 0.24, 0.13], burnt: [0.13, 0.1, 0.08], water: [0.72, 0.88, 1.0], rope: [0.3, 0.24, 0.16],
};
const rnd = Math.random;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export class RaidPier {
  constructor(gl, foe = 'norse') {
    this.gl = gl;
    this.foe = foe === 'pirate' ? 'pirate' : 'norse';
    this.prog = link(gl, VERT, FRAG, 'raidPier', ATTR);
    this.u = uniforms(gl, this.prog, ['uViewProj', 'uTime', 'uCamPos', 'uSunDir', 'uExposure']);
    this.meshes = {};
    this.sp = new RaidSprites(gl);
    const defs = { box: buildBox(), ladder: buildLadder(), figure: buildFigure(this.foe), pot: buildPot(), arrow: buildArrow(), shot: buildShot() };
    for (const k in defs) this.meshes[k] = this._mesh(defs[k]);
    this.buckets = new Map();
    this.parts = []; this.lastT = null; this.emit = new Map(); this.falls = [];
    this.lastStats = { draws: 0, tris: 0, instances: 0, parts: 0 };
    this.ruins = SECTIONS.map((_, i) => this._ruin(i));
  }

  _mesh(kit) {
    const gl = this.gl, nv = kit.p.length / 3, d = new Float32Array(nv * 9);
    for (let i = 0; i < nv; i++) {
      d.set([kit.p[i * 3], kit.p[i * 3 + 1], kit.p[i * 3 + 2], kit.n[i * 3], kit.n[i * 3 + 1], kit.n[i * 3 + 2], kit.c[i * 3], kit.c[i * 3 + 1], kit.c[i * 3 + 2]], i * 9);
    }
    return { vbo: buffer(gl, gl.ARRAY_BUFFER, d), ibo: buffer(gl, gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(kit.i)), count: kit.i.length, tris: kit.tris };
  }

  _bucket(mesh, pass) {
    const key = mesh + pass;
    let b = this.buckets.get(key);
    if (b) return b;
    const gl = this.gl, m = this.meshes[mesh];
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, m.vbo);
    gl.enableVertexAttribArray(ATTR.aPos); gl.vertexAttribPointer(ATTR.aPos, 3, gl.FLOAT, false, 36, 0);
    gl.enableVertexAttribArray(ATTR.aNormal); gl.vertexAttribPointer(ATTR.aNormal, 3, gl.FLOAT, false, 36, 12);
    gl.enableVertexAttribArray(ATTR.aColor); gl.vertexAttribPointer(ATTR.aColor, 3, gl.FLOAT, false, 36, 24);
    const inst = new Float32Array(MAX_INST * IF);
    const vb = buffer(gl, gl.ARRAY_BUFFER, inst, gl.DYNAMIC_DRAW);
    for (let j = 0; j < 4; j++) {
      gl.enableVertexAttribArray(ATTR.aI0 + j);
      gl.vertexAttribPointer(ATTR.aI0 + j, 4, gl.FLOAT, false, IF * 4, j * 16);
      gl.vertexAttribDivisor(ATTR.aI0 + j, 1);
    }
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m.ibo);
    gl.bindVertexArray(null);
    b = { vao, vb, inst, n: 0, mesh: m, pass };
    this.buckets.set(key, b);
    return b;
  }

  // pass 0 opaque, 1 alpha, 2 additive
  add(mesh, pass, x, y, z, yaw, sx, sy, sz, pitch, col, a, em = 0, roll = 0, phase = 0, flick = 0) {
    const b = this._bucket(mesh, pass);
    if (b.n >= MAX_INST) return;
    const o = b.n * IF, f = b.inst;
    f[o] = x; f[o + 1] = y; f[o + 2] = z; f[o + 3] = yaw;
    f[o + 4] = sx; f[o + 5] = sy; f[o + 6] = sz; f[o + 7] = pitch;
    f[o + 8] = col[0]; f[o + 9] = col[1]; f[o + 10] = col[2]; f[o + 11] = a;
    f[o + 12] = em; f[o + 13] = roll; f[o + 14] = phase; f[o + 15] = flick;
    b.n++;
  }

  // an oriented box from pier-frame extents
  pbox(pass, s0, s1, o0, o1, y0, y1, col, a, em = 0) {
    const [x, z] = pierAt((s0 + s1) / 2, (o0 + o1) / 2);
    this.add('box', pass, x, (y0 + y1) / 2, z, Math.atan2(0.9943, 0.1063), s1 - s0, y1 - y0, o1 - o0, 0, col, a, em);
  }

  // a stick (box) between two world points
  stick(mesh, pass, ax, ay, az, bx, by, bz, w, col, a, em = 0) {
    const dx = bx - ax, dy = by - ay, dz = bz - az, h = Math.hypot(dx, dz), L = Math.hypot(h, dy);
    if (mesh === 'ladder') this.add(mesh, pass, ax, ay, az, Math.atan2(dz, dx), L, 1, w, Math.atan2(dy, h), col, a, em);
    else this.add(mesh, pass, (ax + bx) / 2, (ay + by) / 2, (az + bz) / 2, Math.atan2(dz, dx), L, w, w, Math.atan2(dy, h), col, a, em);
  }

  _p(mesh, pass, x, y, z, vx, vy, vz, life, size, grow, col, a, em = 0, g = 0, drag = 0, aspect = null, opt = null) {
    if (this.parts.length >= MAX_PARTS) return;
    this.parts.push({ mesh, pass, x, y, z, vx, vy, vz, age: 0, life, size, grow, col, a, em, g, drag, yaw: rnd() * 6.28, spin: (rnd() - 0.5) * 6, aspect, ...(opt || {}) });
  }
  _every(key, t, gap) { const l = this.emit.get(key); if (l !== undefined && t - l < gap && t >= l) return false; this.emit.set(key, t); return true; }

  // WHAT IS LEFT WHERE A SECTION FELL (tr64: a REAL GAP, not a cap).
  //
  // Until tr64 this drew an opaque charcoal SHELL over the section, because the pier mesh
  // still stood inside it - a fallen tower was a tower in a black bag. The section's own
  // above-deck triangles are now skipped by the coast draw (src/raid/hide-ranges.js), so what
  // stands here is the deck slab, its beams and its legs, and nothing else. This dresses that
  // gap: the deck charred black, broken stumps of wall and railing round its edge and at the
  // two torn ends, beams hanging in the void, planks swinging under the edge, and wreckage in
  // the water below. Fixed per section (seeded), so it does not crawl.
  _ruin(i) {
    const sec = SECTIONS[i], [s0, s1, o0, o1, top] = sec.bld, out = [];
    let seed = 1234 + i * 977;
    const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const neck = sec.key === 'shore' || sec.key === 'shelter' || sec.key === 'neck';
    const d0 = sec.s0, d1 = sec.s1;                      // the DECK span: the part now exposed
    const edgeAt = (s) => pierEdges(s) || [-5.5, 5.5];
    // the deck itself, burnt black, in a few pieces so it follows the head's widening outline
    const nC = Math.max(2, Math.round((d1 - d0) / 10));
    for (let k = 0; k < nC; k++) {
      const a = d0 + (d1 - d0) * k / nC, b = d0 + (d1 - d0) * (k + 1) / nC;
      const e = edgeAt((a + b) / 2);
      out.push({ t: 'char', s0: a + 0.04, s1: b - 0.04, o0: e[0] + 0.3, o1: e[1] - 0.3, y0: DECK + 0.02, y1: DECK + 0.14 });
    }
    // stumps: the broken feet of the walls, posts and railings. Along both edges, and a denser
    // ragged row across each torn end where the section met a neighbour that still stands.
    const stump = (s, o, h, w) => { if (crowdDist(s, o) < 3) return; out.push({ t: 'stump', s, o, h, w, lean: (r() - 0.5) * 0.3, yaw: r() * 6.28 }); };
    const nE = Math.max(4, Math.round((d1 - d0) / 3.2));
    for (let k = 0; k < nE; k++) {
      const s = d0 + (d1 - d0) * (k + 0.5) / nE, e = edgeAt(s);
      if (r() < 0.25) continue;                          // a gap-toothed row reads as broken
      stump(s, e[0] + 0.45, 0.5 + r() * (neck ? 1.1 : 1.9), 0.18 + r() * 0.22);
      if (r() > 0.2) stump(s, e[1] - 0.45, 0.5 + r() * (neck ? 1.1 : 1.9), 0.18 + r() * 0.22);
    }
    for (const end of [d0 + 0.5, d1 - 0.5]) {            // the torn ends: taller, jagged
      const e = edgeAt(end), n = Math.max(3, Math.round((e[1] - e[0]) / 2.2));
      for (let k = 0; k < n; k++) {
        const o = e[0] + (e[1] - e[0]) * (k + 0.5) / n;
        stump(end + (r() - 0.5) * 0.7, o, (neck ? 1.0 : 1.6) + r() * (neck ? 1.4 : 2.6), 0.22 + r() * 0.3);
      }
    }
    // beams left hanging over the void, and planks swinging under the deck edge
    for (let k = 0; k < (neck ? 5 : 9); k++) {
      const s = d0 + r() * (d1 - d0), e = edgeAt(s), o = e[0] + r() * (e[1] - e[0]);
      if (crowdDist(s, o) < 4) continue;
      out.push({ t: 'beam', s, o, len: 3 + r() * 5, yaw: r() * 6.28, pitch: 0.35 + r() * 0.7, y: DECK + 0.7 + r() * 1.6 });
    }
    for (let k = 0; k < 8; k++) {
      const side = r() < 0.5 ? -1 : 1, s = d0 + r() * (d1 - d0), e = edgeAt(s);
      const o = side < 0 ? e[0] : e[1];
      if (crowdDist(s, o) < 4) continue;
      out.push({ t: 'hang', s, o, len: 3.5 + r() * 3, lean: 0.25 + r() * 0.35, side });
    }
    for (let k = 0; k < 10; k++) {   // charred wreckage floating below the gap
      const side = r() < 0.5 ? -1 : 1, s = d0 - 3 + r() * (d1 - d0 + 6), e = edgeAt(s);
      out.push({ t: 'float', s, o: side < 0 ? e[0] - 2 - r() * 10 : e[1] + 2 + r() * 10, yaw: r() * 6.28, len: 2 + r() * 2.5 });
    }
    return out;
  }

  // The superstructure coming down (tr64). The section's mesh is still drawn for the first
  // second, so these chunks start INSIDE it, sag and tilt, then break away and fall into the
  // sea; by the time the mesh stops being drawn the eye is on the falling mass and the dust.
  _fallMass(i) {
    const sec = SECTIONS[i], [s0, s1, o0, o1, top] = sec.bld;
    const neck = i < 3, yawP = Math.atan2(0.9943, 0.1063);
    const nS = neck ? 6 : sec.key === 'hall' ? 5 : 4, nO = neck ? 1 : 3, nY = neck ? 1 : 2;
    const dS = (s1 - s0) / nS, dO = (o1 - o0) / nO, dY = (top - DECK) / nY;
    for (let a = 0; a < nS; a++) for (let b = 0; b < nO; b++) for (let c = 0; c < nY; c++) {
      const s = s0 + dS * (a + 0.5), o = o0 + dO * (b + 0.5), y = DECK + dY * (c + 0.5);
      if (!this._crowdOk(s, o, 4)) continue;
      const [x, z] = pierAt(s, o);
      const out = nO > 1 ? (b + 0.5 - nO / 2) / (nO / 2) : (rnd() - 0.5) * 2;
      this._p('box', 0, x, y, z, ACROSS[0] * out * (1.5 + rnd() * 3), 0.4 + rnd(), ACROSS[1] * out * (1.5 + rnd() * 3),
        16, 1, 0, rnd() < 0.7 ? C.char : C.burnt, 1, 0, 9.81, 0,
        [dS * 0.92, dY * 0.9, dO * 0.9], { delay: 0.05 + (a / nS) * 0.55 + rnd() * 0.3, yawFix: yawP, tiltV: (rnd() < 0.5 ? -1 : 1) * (0.3 + rnd() * 0.5) });
    }
  }

  // ---- soft sprite helpers (tr62): smoke, fire, embers, steam, spray, sparks, explosions ----
  smoke(x, y, z, vx, vy, vz, life, r0, r1, a, light = false) {
    this.sp.spawn(x, y, z, vx, vy, vz, life, r0, light ? C.smokeL : C.smoke, a, { r1, col1: C.smokeFar, g: -0.3, drag: 0.3, fadeIn: 0.6 });
  }
  flame(x, y, z, vx, vy, vz, life, r, a = 0.9) { this.sp.spawn(x, y, z, vx, vy, vz, life, r, C.flameB, a, { r1: r * 0.35, col1: C.flameA, frame: 2, add: 0.7, heat: 1, g: -4, fadeIn: 0.04, flick: 0.35, spin: 0 }); }
  ember(x, y, z, vx, vy, vz, life, a = 1) { this.sp.spawn(x, y, z, vx, vy, vz, life, 0.1, C.core, a, { col1: C.flameA, frame: 3, add: 1, heat: 1, g: -0.6, drag: 0.5, stretch: 0.05, fadeIn: 0, flick: 0.5 }); }
  steam(x, y, z, vx, vy, vz, life, r0, r1, a) { this.sp.spawn(x, y, z, vx, vy, vz, life, r0, C.steam, a, { r1, g: -0.5, drag: 0.9, fadeIn: 0.12 }); }
  drops(x, y, z, n, sp, up, r = 0.14) {
    for (let i = 0; i < n; i++) this.sp.spawn(x, y, z, (rnd() - 0.5) * sp, up * (0.4 + rnd() * 0.8), (rnd() - 0.5) * sp, 0.7 + rnd() * 0.5, r, C.water, 0.85, { r1: r * 0.6, frame: 3, g: 9.81, stretch: 0.05, fadeIn: 0, floor: -0.4 });
    for (let i = 0; i < Math.ceil(n / 4); i++) this.steam(x + (rnd() - 0.5) * sp * 0.2, y + 0.3, z + (rnd() - 0.5) * sp * 0.2, (rnd() - 0.5) * sp * 0.3, up * 0.3, (rnd() - 0.5) * sp * 0.3, 0.9 + rnd() * 0.4, r * 3, r * 12, 0.45);
  }
  sparks(x, y, z, n, speed) {
    for (let i = 0; i < n; i++) this.sp.spawn(x, y, z, (rnd() - 0.5) * speed, rnd() * speed * 0.8, (rnd() - 0.5) * speed, 0.4 + rnd() * 0.5, 0.08, C.core, 1, { col1: C.flameA, frame: 3, add: 1, heat: 1, g: 9.81, stretch: 0.045, fadeIn: 0 });
  }
  explode(x, y, z, big = 1) {
    this.sp.spawn(x, y, z, 0, 0, 0, 0.25, 1.2 * big, C.core, 1, { r1: 5 * big, col1: C.flameA, frame: 1, add: 1, heat: 1, fadeIn: 0 });
    for (let i = 0; i < 5 * big; i++) this.flame(x + (rnd() - 0.5) * big, y + rnd() * big, z + (rnd() - 0.5) * big, (rnd() - 0.5) * 5, 2 + rnd() * 3, (rnd() - 0.5) * 5, 0.35 + rnd() * 0.3, 0.9 * big);
    for (let i = 0; i < 5 * big; i++) this.smoke(x + (rnd() - 0.5) * big, y + rnd() * big, z + (rnd() - 0.5) * big, (rnd() - 0.5) * 3, 1.5 + rnd() * 2, (rnd() - 0.5) * 3, 1.8 + rnd(), 0.8 * big, 3.5 * big, 0.6);
    this.sparks(x, y, z, 12 * big, 12);
  }
  _crowdOk(s, o, r = 4) { return crowdDist(s, o) >= r; }

  onEvent(e, game) {
    switch (e.type) {
      case 'smash': {
        if (e.kind === 'shot') {
          // tr136: a hole punched in the structure - splinters, dust, a little fire, no
          // flash. A round shot is not a bomb, so this is smaller than explode() on purpose.
          this.sparks(e.x, e.y, e.z, 5, 5);
          for (let i = 0; i < 9; i++) this._p('box', 0, e.x, e.y, e.z, (rnd() - 0.5) * 11, 1.5 + rnd() * 5, (rnd() - 0.5) * 11, 1.5, 0.15, 0, [0.42, 0.30, 0.16], 1, 0, 9.81);
          for (let i = 0; i < 4; i++) this.smoke(e.x + (rnd() - 0.5) * 1.4, e.y + rnd() * 1.2, e.z + (rnd() - 0.5) * 1.4, (rnd() - 0.5) * 2.4, 1.4 + rnd(), (rnd() - 0.5) * 2.4, 1.5 + rnd(), 0.4, 2.1, 0.5);
          for (let i = 0; i < 2; i++) this.flame(e.x, e.y, e.z, (rnd() - 0.5) * 2, 0.8 + rnd(), (rnd() - 0.5) * 2, 0.35, 0.4);
          break;
        }
        if (e.kind === 'pot') {
          this.explode(e.x, e.y, e.z, 1);
          for (let i = 0; i < 6; i++) this._p('box', 0, e.x, e.y, e.z, (rnd() - 0.5) * 8, 2 + rnd() * 4, (rnd() - 0.5) * 8, 1.2, 0.18, 0, [0.5, 0.3, 0.18], 1, 0, 9.81);
        } else { for (let i = 0; i < 4; i++) this.flame(e.x, e.y, e.z, (rnd() - 0.5) * 3, 1 + rnd() * 2, (rnd() - 0.5) * 3, 0.5, 0.5); this.sparks(e.x, e.y, e.z, 6, 6); }
        break;
      }
      case 'climbFire':
        for (let i = 0; i < 8; i++) this.flame(e.x, e.y + 1, e.z, (rnd() - 0.5) * 3, 1 + rnd() * 3, (rnd() - 0.5) * 3, 0.6, 0.7);
        this.sparks(e.x, e.y + 1, e.z, 8, 7);
        break;
      case 'steam':
        for (let i = 0; i < 3; i++) this.steam(e.x + (rnd() - 0.5) * 2, e.y + rnd(), e.z + (rnd() - 0.5) * 2, (rnd() - 0.5) * 1.5, 2.5 + rnd() * 2, (rnd() - 0.5) * 1.5, 1.6 + rnd(), 0.9, 3.2, 0.6);
        break;
      case 'fireOut':
        for (let i = 0; i < 20; i++) this.steam(e.x + (rnd() - 0.5) * 8, e.y + rnd() * 2, e.z + (rnd() - 0.5) * 8, (rnd() - 0.5) * 3, 3 + rnd() * 3, (rnd() - 0.5) * 3, 2.4 + rnd(), 1.4, 5, 0.65);
        break;
      case 'potDoused':
        for (let i = 0; i < 6; i++) this.steam(e.x, e.y, e.z, (rnd() - 0.5) * 3, 1.5 + rnd() * 2, (rnd() - 0.5) * 3, 1.2, 0.5, 2, 0.6);
        this._p('pot', 0, e.x, e.y, e.z, (rnd() - 0.5) * 2, 1, (rnd() - 0.5) * 2, 2, 0.45, 0, [0.35, 0.22, 0.14], 1, 0, 9.81);
        break;
      case 'spray': this.drops(e.x, 0.1, e.z, 4, 3, 3, 0.12); break;
      case 'knockOff':
        this.falls.push({ x: e.x, y: e.y, z: e.z, sx: e.sx, sz: e.sz, t: 0, T: 0.7, yaw: Math.atan2(e.sz - e.z, e.sx - e.x) });
        this.drops(e.x, e.y, e.z, 10, 5, 3, 0.12);
        break;
      case 'collapse': {
        // the section gives way: deck slabs sag then drop, railings and timbers break away into the sea
        const i = e.section, sec = SECTIONS[i], [s0, s1, o0, o1, top] = sec.bld, neck = i < 3;
        const yawP = Math.atan2(0.9943, 0.1063);
        const nS = Math.max(3, Math.round((s1 - s0) / 5));
        for (let k = 0; k < nS; k++) for (const o of neck ? [-2.8, 2.8] : [o0 + (o1 - o0) * 0.25, o0 + (o1 - o0) * 0.75]) {
          const s = s0 + (s1 - s0) * (k + 0.5) / nS;
          if (!this._crowdOk(s, o, 4.5)) continue;
          const [x, z] = pierAt(s, o);
          this._p('box', 0, x, DECK - 0.3, z, (rnd() - 0.5) * 0.6, -0.3, (rnd() - 0.5) * 0.6, 14, 1, 0, rnd() < 0.5 ? C.burnt : C.char, 1, 0, 9.81, 0,
            [(s1 - s0) / nS * 0.95, 0.45, neck ? 5.2 : (o1 - o0) * 0.45], { delay: 0.4 + rnd() * 1.4, yawFix: yawP, tiltV: (rnd() < 0.5 ? -1 : 1) * (0.25 + rnd() * 0.3) });
        }
        for (let k = 0; k < 12; k++) {
          const s = s0 + rnd() * (s1 - s0), side = rnd() < 0.5 ? -1 : 1, e2 = pierEdges(s), o = side < 0 ? e2[0] : e2[1];
          if (!this._crowdOk(s, o)) continue;
          const [x, z] = pierAt(s, o);
          this._p('box', 0, x, DECK + 0.6, z, ACROSS[0] * side * (1 + rnd() * 2), 0.5 + rnd(), ACROSS[1] * side * (1 + rnd() * 2), 14, 1, 0, C.burnt, 1, 0, 9.81, 0, [2.5 + rnd() * 2, 0.1, 0.12], { delay: rnd() * 1.2 });
        }
        for (let k = 0; k < 30; k++) {
          const s = s0 + rnd() * (s1 - s0), o = o0 + rnd() * (o1 - o0);
          if (!this._crowdOk(s, o)) continue;
          const [x, z] = pierAt(s, o), y = DECK + rnd() * (top - DECK);
          const out = (o - (o0 + o1) / 2) / Math.max(1, (o1 - o0) / 2), long = rnd() < 0.5;
          this._p('box', 0, x, y, z, ACROSS[0] * out * (2 + rnd() * 5) + (rnd() - 0.5) * 3, 2 + rnd() * 6, ACROSS[1] * out * (2 + rnd() * 5) + (rnd() - 0.5) * 3,
            4 + rnd() * 3, 1, 0, rnd() < 0.6 ? C.burnt : C.wood, 1, 0, 9.81, 0, long ? [2.5 + rnd() * 3, 0.25, 0.4] : [1.2, 0.2, 0.9]);
        }
        this._fallMass(i);   // tr64: the superstructure itself breaks up and goes
        const c = sectionCentre(i);
        // tr64: a dust wall the moment it lets go, thrown OUTWARD from both deck edges - not
        // inside the building footprint, where the building itself hides it. The section's mesh
        // stops being drawn FALL_SEC in, and this is what covers the swap: by the time the dust
        // thins, the building is a gap and a cloud of falling timber.
        const d0 = sec.s0, d1 = sec.s1;
        for (let k = 0; k < 30; k++) {
          const ds = d0 + (d1 - d0) * rnd(), de = pierEdges(ds) || [-5.5, 5.5];
          const side = rnd() < 0.5 ? -1 : 1;
          const o = (side < 0 ? de[0] : de[1]) + side * rnd() * 4 - side * 1.5;
          const [dx, dz] = pierAt(ds, o);
          this.smoke(dx, DECK - 0.5 + rnd() * 3.5, dz, ACROSS[0] * side * (2 + rnd() * 5), 1.2 + rnd() * 3, ACROSS[1] * side * (2 + rnd() * 5), 5.5 + rnd() * 3, 3.2, 15, 0.85);
        }
        for (let k = 0; k < 22; k++) this.smoke(c.x + (rnd() - 0.5) * 14, DECK + rnd() * (top - DECK), c.z + (rnd() - 0.5) * 14, (rnd() - 0.5) * 5, 3 + rnd() * 5, (rnd() - 0.5) * 5, 6 + rnd() * 4, 2.5, 10, 0.75);
        for (let k = 0; k < 16; k++) this.flame(c.x + (rnd() - 0.5) * 12, DECK + rnd() * (top - DECK), c.z + (rnd() - 0.5) * 12, (rnd() - 0.5) * 4, 3 + rnd() * 5, (rnd() - 0.5) * 4, 0.9, 1.6 + rnd());
        this.sparks(c.x, DECK + 2, c.z, 50, 16);
        this.sp.spawn(c.x, top, c.z, 0, 0, 0, 0.8, 8, C.core, 0.9, { r1: 26, col1: C.glow, frame: 1, add: 1, heat: 1, fadeIn: 0 });
        break;
      }
      default: break;
    }
  }

  fill(game, sim, pose, cam) {
    const t = sim.time, sea = sim.sea;
    const dt = this.lastT === null ? 0 : clamp(t - this.lastT, 0, 0.1);
    if (this.lastT !== null && (t < this.lastT || t - this.lastT > 0.5)) { this.parts.length = 0; this.falls.length = 0; this.emit.clear(); this.sp.clear(); }
    this.lastT = t;
    for (const b of this.buckets.values()) b.n = 0;
    const cx = cam ? cam.x : pose.x, cz = cam ? cam.z : pose.z;
    const H = (x, z) => sea.sample(x, z, t, 0, 3).height;
    const pier = game.pier, sp = this.sp;
    const wind = [1.2, 0.5];

    // ---- sections: flames, embers, smoke, glow, soot, ruins ----
    pier.sections.forEach((q, i) => {
      const sec = SECTIONS[i], [s0, s1, o0, o1, top] = sec.bld;
      const c = sectionCentre(i), dist = Math.hypot(c.x - cx, c.z - cz);
      const neck = i < 3;
      const soot = Math.max(q.char, 1 - q.hp / q.maxHp) * (q.collapsed ? 0 : 1);
      if (soot > 0.04) {
        const a = Math.min(0.8, 0.9 * soot);
        if (neck) this.pbox(1, s0, s1, -3.0, 3.0, DECK + 2.2, DECK + 3.35, C.soot, a);
        else {
          this.pbox(1, s0, s1, o0 - 0.25, o1 + 0.25, DECK + 0.2, Math.min(top, DECK + 6.7), C.soot, a * 0.85);
          if (top > DECK + 7) this.pbox(1, s0 + 0.2, s1 - 0.2, o0 + 2, o1 - 2, DECK + 6.7, top + 0.15, C.soot, a * 0.85);
        }
      }
      if (q.collapsed) {
        // The ruin only appears once the mesh has gone (FALL_SEC): until then the real
        // structure is still standing there, sagging, behind the dust.
        for (const r of q.collapseT < FALL_SEC ? [] : this.ruins[i]) {
          if (r.t === 'char') this.pbox(0, r.s0, r.s1, r.o0, r.o1, r.y0, r.y1, C.char, 1, 0);
          else if (r.t === 'stump') {   // tr64: a broken foot of wall or railing, two stubs tall
            const [x, z] = pierAt(r.s, r.o);
            this.add('box', 0, x, DECK + r.h * 0.5, z, r.yaw, r.w, r.h, r.w * 0.85, r.lean * 0.4, C.char, 1);
            this.add('box', 0, x + r.lean * 0.5, DECK + r.h + 0.18, z, r.yaw + 0.6, r.w * 0.55, 0.36, r.w * 0.5, r.lean, C.burnt, 1);
          } else if (r.t === 'beam') { const [x, z] = pierAt(r.s, r.o); this.add('box', 0, x, r.y, z, r.yaw, r.len, 0.35, 0.35, r.pitch, C.burnt, 1); }
          else if (r.t === 'hang') { const [x, z] = pierAt(r.s, r.o); const sw = 0.04 * Math.sin(t * 1.3 + r.s); const bx = x + ACROSS[0] * r.side * (r.lean + sw) * r.len, bz = z + ACROSS[1] * r.side * (r.lean + sw) * r.len; this.stick('box', 0, x, DECK - 0.4, z, bx, DECK - 0.4 - r.len, bz, 0.3, C.burnt, 1); }
          else if (dist < 700) { const [x, z] = pierAt(r.s, r.o); this.add('box', 0, x, H(x, z) + 0.06, z, r.yaw + 0.05 * Math.sin(t * 0.7 + r.s), r.len, 0.22, 0.5, 0.05 * Math.sin(t * 1.4 + r.o), C.burnt, 1, 0, 0.05 * Math.cos(t * 1.1 + r.s)); }
        }
        const smoulder = Math.max(0.3, 1 - q.collapseT / 90);
        if (dist < 1500 && this._every('ruin' + i, t, 0.4 / smoulder)) {
          const [x, z] = pierAt(s0 + rnd() * (s1 - s0), (o0 + o1) / 2 + (rnd() - 0.5) * 2);
          this.smoke(x, DECK + 2, z, wind[0] * 0.6, 3.5 + rnd() * 1.5, wind[1] * 0.6, 10, 0.9, 4.5, 0.4 * smoulder, true);
        }
        if (dist < 900) {
          for (let k = 0; k < 4; k++) {
            const [x, z] = pierAt(s0 + (s1 - s0) * (0.15 + 0.23 * k), (o0 + o1) / 2 + (k % 2 ? 1.5 : -1.5));
            sp.put(x, DECK + 1.2, z, 1.8, C.glow, 0.5 * smoulder * (0.6 + 0.4 * Math.sin(t * 3.1 + k * 2)), { frame: 1, add: 1, heat: 1 });
          }
          if (this._every('re' + i, t, 0.3 / smoulder)) { const [x, z] = pierAt(s0 + rnd() * (s1 - s0), (o0 + o1) / 2); this.ember(x, DECK + 1.5, z, wind[0] + (rnd() - 0.5), 2 + rnd() * 2, wind[1] + (rnd() - 0.5), 2.5); }
        }
        return;
      }
      if (q.fire <= 0.005) return;
      const spots = SPOTS[i], N = spots.length, big = neck ? 1 : sec.key === 'hall' ? 1.6 : 1.3;
      for (let k = 0; k < N; k++) {
        const th = (k / N) * 0.75, inten = clamp((q.fire - th) / 0.25, 0, 1);
        if (inten <= 0) continue;
        const [sx, sz] = pierAt(spots[k][0], spots[k][1]), sy = spots[k][2];
        const r0 = big * (0.8 + 1.3 * inten);
        if (dist < 900) {
          for (let f = 0; f < 3; f++) {
            const ox = Math.sin(k * 3.1 + f * 2.3) * 1.2 * big, oz = Math.cos(k * 1.7 + f * 2.9) * 1.2 * big;
            const fl = 0.8 + 0.2 * Math.sin(t * (9 + f * 3) + k * 1.3 + f) + 0.08 * Math.sin(t * 23 + f * 5 + k);
            const r = r0 * (1 - 0.18 * f) * fl;
            sp.put(sx + ox, sy - 0.4 + r * 0.85, sz + oz, r, f === 1 ? C.flameB : C.flameA, 0.95, { frame: 2, add: 0.55, heat: 1 });
          }
          sp.put(sx, sy + r0 * 0.5, sz, r0 * 0.6, C.core, 0.9, { frame: 2, add: 0.8, heat: 1 });
          sp.put(sx, sy + r0 * 0.4, sz, r0 * 2.2, C.glow, 0.28 * inten * (0.85 + 0.15 * Math.sin(t * 11 + k)), { frame: 1, add: 1, heat: 1 });
          if (this._every(`em${i}_${k}`, t, 0.14 / inten)) this.ember(sx + (rnd() - 0.5) * 3, sy + 1, sz + (rnd() - 0.5) * 3, (rnd() - 0.5) * 3 + wind[0], 4 + rnd() * 4, (rnd() - 0.5) * 3 + wind[1], 1.4 + rnd());
        }
        if (this._every(`sm${i}_${k}`, t, 0.4 / (0.4 + inten))) {
          this.smoke(sx + (rnd() - 0.5) * 2, sy + 1.6 * big, sz + (rnd() - 0.5) * 2, wind[0] * (0.6 + rnd() * 0.5), 3.5 + rnd() * 2.5, wind[1] * (0.6 + rnd() * 0.5), 8 + rnd() * 3, big * (1 + 0.8 * inten), big * (6 + 4 * inten), 0.55 + 0.3 * inten, rnd() < 0.25);
        }
      }
      if (q.fire > 0.25 && dist < 1500) {
        sp.put(c.x, top + 1, c.z, 10 + 14 * q.fire * big, C.glow, 0.16 * q.fire * (0.85 + 0.15 * Math.sin(t * 7 + i)), { frame: 1, add: 1, heat: 1 });
      }
    });

    // ---- the raiders' fire in the air ----
    for (const q of game.pierShots) {
      const qd = Math.hypot(q.x - cx, q.z - cz);
      if (qd > 600) continue;
      const h = Math.hypot(q.vx, q.vz), yaw = Math.atan2(q.vz, q.vx), pitch = Math.atan2(q.vy, h);
      if (q.kind === 'pot') {
        this.add('pot', 0, q.x, q.y, q.z, q.age * 4, 1.1, 1.1, 1.1, q.age * 3, [1, 1, 1], 1);
        sp.put(q.x, q.y + 0.7, q.z, 0.75, C.flameB, 0.95, { frame: 2, add: 0.6, heat: 1 });
        sp.put(q.x, q.y + 0.3, q.z, 1.4, C.glow, 0.35, { frame: 1, add: 1, heat: 1 });
        if (this._every('pt' + q.id, t, 0.05)) { this.ember(q.x, q.y + 0.4, q.z, 0, 0.5, 0, 0.5); this.smoke(q.x, q.y + 0.5, q.z, 0, 0.5, 0, 1.2, 0.25, 0.9, 0.35); }
      } else if (q.kind === 'shot') {
        // tr136 ROUND SHOT. The ball plus a thin, short-lived wisp so the eye can follow the
        // FALL OF SHOT - the arc is the whole point of a flat-trajectory gun at this range.
        // The wisp is dropped at the ball's OLD position with no velocity of its own, so it
        // marks the path instead of streaming off the muzzle.
        this.add('shot', 0, q.x, q.y, q.z, 0, 0.55, 0.55, 0.55, 0, [1, 1, 1], 1);
        if (qd < 320 && this._every('rs' + q.id, t, 0.030)) {
          this.smoke(q.x - q.vx * 0.03, q.y - q.vy * 0.03, q.z - q.vz * 0.03, 0, 0.30, 0, 0.95, 0.22, 0.85, 0.34);
        }
      } else {
        this.add('arrow', 0, q.x, q.y, q.z, yaw, 2.2, 2.2, 2.2, pitch, [1, 1, 1], 1);
        const tx = q.x + Math.cos(yaw) * Math.cos(pitch) * 1.1, ty = q.y + Math.sin(pitch) * 1.1, tz = q.z + Math.sin(yaw) * Math.cos(pitch) * 1.1;
        sp.put(tx, ty + 0.15, tz, 0.45, C.flameB, 0.95, { frame: 2, add: 0.7, heat: 1 });
        if (this._every('pa' + q.id, t, 0.04)) this.ember(tx, ty, tz, 0, 0.3, 0, 0.35);
      }
    }

    // ---- the water cannon: a stream of soft drops with mist, spray at the nozzle ----
    for (const w of game.water) {
      const k = Math.min(1, w.age * 4);
      sp.put(w.x, w.y, w.z, 0.22 + 0.25 * k, C.water, 0.8, { frame: 3, vx: w.vx, vy: w.vy, vz: w.vz, stretch: 0.035 });
      if (rnd() < 0.12) this.steam(w.x, w.y, w.z, w.vx * 0.25 + (rnd() - 0.5) * 2, w.vy * 0.25, w.vz * 0.25 + (rnd() - 0.5) * 2, 0.6, 0.3, 1.4, 0.4);
    }
    if (game.spraying && cam) {
      const P = game.player, ch = Math.cos(P.heading), sh = Math.sin(P.heading), boat = P.craft !== 'efoil';
      if (this._every('nz', t, 0.05)) this.steam(P.x + ch * (boat ? 2.6 : 1.1), boat ? 2.0 : 1.5, P.z + sh * (boat ? 2.6 : 1.1), ch * 4 + (rnd() - 0.5) * 2, 1 + rnd(), sh * 4 + (rnd() - 0.5) * 2, 0.4, 0.25, 1.2, 0.45);
    }

    // ---- moored ships: lines, ladders, warriors ----
    const le = {};
    for (const s of game.ships) {
      if (!(s.moored && s.state === 'landed' && s.ladders)) continue;
      if (Math.hypot(s.x - cx, s.z - cz) > 700) continue;
      const ch = Math.cos(s.heading), sh = Math.sin(s.heading), sc = s.L / 16, hy = H(s.x, s.z);
      for (const u of [-0.42, 0.42]) {
        const ax = s.x + ch * u * s.L, az = s.z + sh * u * s.L;
        const e = ladderEnds(s, { u: u * s.L }, le);
        this.stick('box', 0, ax, hy + 1.6 * sc, az, e.tx, e.ty - 0.6, e.tz, 0.07, C.rope, 1);
      }
      for (const l of s.ladders) {
        const e = ladderEnds(s, l, le);
        const up = clamp(l.up, 0, 1), L = Math.hypot(e.tx - e.bx, e.ty - e.by, e.tz - e.bz);
        const ang = (1 - up) * 1.2;
        let tx = e.tx, ty = e.ty, tz = e.tz;
        if (up < 1) {       // swinging up from lying back along the ship
          const dx = (e.tx - e.bx) / L, dy = (e.ty - e.by) / L, dz = (e.tz - e.bz) / L;
          const hx = -dx, hz = -dz, hl = Math.hypot(hx, hz) || 1;
          const bl = Math.min(1.57, ang + 0.3);
          tx = e.bx + (dx * Math.cos(bl) + (hx / hl) * Math.sin(bl) * 0.4) * L; ty = e.by + dy * L * Math.cos(bl) + L * 0.25 * Math.sin(bl); tz = e.bz + (dz * Math.cos(bl) + (hz / hl) * Math.sin(bl) * 0.4) * L;
          if (l.cool > 0 && l.down) { tx = e.bx - dx * L * 0.6; ty = e.by + 0.3; tz = e.bz - dz * L * 0.6; }
        }
        this.stick('ladder', 0, e.bx, e.by + hy, e.bz, tx, ty, tz, 1, [1, 1, 1], 1);
        if (up >= 1 && l.climb > 0.02) {
          const c = climberPos(s, l), yw = Math.atan2(e.tz - e.bz, e.tx - e.bx);
          this.add('figure', 0, c.x, c.y - 0.2 + Math.abs(Math.sin(l.climb * 40)) * 0.08, c.z, yw, 1, 1, 1, 0, [1, 1, 1], 1);
          if (l.climb > 0.7) sp.put(c.x - Math.cos(yw) * 0.2, c.y + 1.3, c.z - Math.sin(yw) * 0.2, 0.45, C.flameB, 0.95, { frame: 2, add: 0.6, heat: 1 });
        }
      }
    }
    // warriors hosed off a ladder: a short tumble into the water (raid.js has them swimming from there)
    this.falls = this.falls.filter((f) => (f.t += dt) < f.T);
    for (const f of this.falls) {
      const k = f.t / f.T, x = f.x + (f.sx - f.x) * k, z = f.z + (f.sz - f.z) * k, y = f.y * (1 - k) + 2.2 * Math.sin(Math.PI * k) - 0.3 * k;
      this.add('figure', 0, x, y, z, f.yaw, 1, 1, 1, 0, [1, 1, 1], 1, 0, k * 5);
      if (k > 0.85 && this._every('fs' + f.sx, t, 1)) this.drops(f.sx, 0.2, f.sz, 14, 5, 4, 0.14);
    }

    // ---- solid debris: pot shards, timbers, sagging deck slabs, railings ----
    const keep = [];
    for (const p of this.parts) {
      p.age += dt;
      if (p.age >= p.life) continue;
      if (p.delay > 0) { p.delay -= dt; p.tilt = (p.tilt || 0) + (p.tiltV || 0) * dt; p.y -= 0.35 * dt; }
      else {
        p.vy -= p.g * dt;
        if (p.drag) { const k = Math.exp(-p.drag * dt); p.vx *= k; p.vz *= k; if (p.g < 0) p.vy *= k; }
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        p.yaw += p.spin * dt;
        if (p.tiltV && !p.wet) p.tilt += p.tiltV * 1.8 * dt;
      }
      if (p.y < 0.1) {
        if (!p.wet) { p.wet = true; this.drops(p.x, 0.2, p.z, p.yawFix !== undefined ? 14 : 6, 4, 4, 0.16); p.vy = 0; p.g = 0; p.vx *= 0.2; p.vz *= 0.2; p.spin *= 0.1; p.life = Math.max(p.life, p.age + 12); }
        p.y = H(p.x, p.z) + 0.05;
      }
      if (p.age > p.life - 1.5 && p.wet) p.y -= (p.age - p.life + 1.5) * 0.3;   // sinks out of sight at the end
      keep.push(p);
      if (cam && (p.x - cam.x) ** 2 + (p.y - cam.y) ** 2 + (p.z - cam.z) ** 2 < 16) continue;
      const f = p.age / p.life, s = p.size * (1 + p.grow * f);
      if (p.aspect) {
        const tilt = p.wet ? 0.04 * Math.sin(p.age * 1.5 + p.yaw) : (p.tilt || 0);
        if (p.yawFix !== undefined) this.add(p.mesh, 0, p.x, p.y, p.z, p.yawFix, p.aspect[0], p.aspect[1], p.aspect[2], p.wet ? 0.03 * Math.sin(p.age) : tilt * 0.3, p.col, 1, 0, p.wet ? 0 : tilt);
        else this.add(p.mesh, p.pass, p.x, p.y, p.z, p.yaw, p.aspect[0], p.aspect[1], p.aspect[2], p.wet ? 0 : p.yaw * 0.7, p.col, p.a, p.em, p.wet ? 0 : p.yaw * 0.3);
      } else this.add(p.mesh, p.pass, p.x, p.y, p.z, p.yaw, s, s, s, 0, p.col, p.a, p.em, 0, p.yaw, 0);
    }
    this.parts = keep;
  }

  draw(cam, vp, sunDir, exposure, time) {
    const gl = this.gl;
    gl.useProgram(this.prog);
    gl.uniformMatrix4fv(this.u.uViewProj, false, vp);
    gl.uniform1f(this.u.uTime, time);
    gl.uniform3f(this.u.uCamPos, cam.x, cam.y, cam.z);
    gl.uniform3f(this.u.uSunDir, sunDir[0], sunDir[1], sunDir[2]);
    gl.uniform1f(this.u.uExposure, exposure);
    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    let draws = 0, tris = 0, instances = 0;
    for (const pass of [0, 1]) {
      if (pass === 0) { gl.disable(gl.BLEND); gl.depthMask(true); }
      else { gl.enable(gl.BLEND); gl.depthMask(false); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); }
      for (const b of this.buckets.values()) {
        if (b.pass !== pass || !b.n) continue;
        gl.bindBuffer(gl.ARRAY_BUFFER, b.vb);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, b.inst, 0, b.n * IF);
        gl.bindVertexArray(b.vao);
        gl.drawElementsInstanced(gl.TRIANGLES, b.mesh.count, gl.UNSIGNED_SHORT, 0, b.n);
        draws++; tris += b.mesh.tris * b.n; instances += b.n;
      }
    }
    gl.bindVertexArray(null);
    gl.disable(gl.BLEND); gl.depthMask(true);
    this.sp.draw(cam, vp, sunDir, exposure, time);
    const q = this.sp.lastStats;
    this.lastStats = { draws: draws + q.draws, tris: tris + q.tris, instances: instances + q.sprites, parts: this.parts.length + q.parts, sprites: q.sprites, meshTris: tris };
  }
}
