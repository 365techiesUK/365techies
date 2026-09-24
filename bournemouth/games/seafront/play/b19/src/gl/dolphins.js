// src/gl/dolphins.js — a pod of bottlenose dolphins in the bay (24 Sep 2026).
//
// Bottlenose dolphins genuinely come into Poole Bay, so they belong in a game about the real
// seafront. The owner asked for "really realistic". In a deliberately low-poly game that has to
// mean the right SHAPE and the right MOVEMENT, not photo-real skin: a photo-real animal next to
// the blocky vikings would read as pasted in. What sells a dolphin is how it moves, and that is
// exactly where game dolphins usually go wrong:
//
//   1. THE TAIL BEATS UP AND DOWN. Cetacean flukes are horizontal and the body flexes in the
//      vertical plane. Sharks sweep side to side. The game's shark tail (raid-kit anim codes 7/8)
//      is the wrong motion to reuse - a dolphin animated like a fish reads as a fish.
//   2. MOST OF THE BEND IS IN THE REAR THIRD. The head and chest are near-rigid; the tail stock
//      (peduncle) does the work. A whole-body wiggle looks like an eel.
//   3. THE SURFACING ROLL. Blowhole, then the curve of the back and the dorsal fin, then the
//      tail stock arching, then gone. A smooth arc - not a leap every time.
//   4. A PUFF OF BREATH at the moment the blowhole clears, and PODS that surface together.
//
// HOW IT IS BUILT, following gl/surfers.js - the other thing in the water that is not the player:
//   * One lofted mesh built once at construction (no allocation on a draw).
//   * The swimming is a travelling wave computed in the VERTEX SHADER. Each vertex carries its
//     station along the body (0 at the beak, 1 at the fluke tips) in aAnim, which is the rower
//     trick raid-kit already uses. Measured this week: the game is CPU-bound and the GPU is all
//     but idle (0.034 ms of shading at 1080p on a 3090), so the animation goes where it is free.
//     The CPU cost is one pod update and one sea sample per dolphin per frame.
//   * Read-only on the sim. It samples the sea and the player's pose and writes NOTHING back -
//     not the sim hash, not the obstacle grid. A dolphin cannot be hit and cannot block a craft.
//   * Its own seeded RNG (mulberry32), so it never draws from the sim's stream.
//   * Driven by sim.time, like the surfers, so it freezes with a pause or a level briefing.
//
// WHAT THE WATER DOES TO IT, and why that is right: renderer.js draws the sea OPAQUE and FIRST,
// with depth writes on. So anything below the surface is hidden and a cruising dolphin is
// invisible until it breaks the surface. That is what the bay actually looks like - Poole Bay is
// not tropical-clear, and from a boat you mostly see the back and fin roll through. So this does
// not fight the water shader; it leans on it.
//
// WHERE IT IS SHOWN is decided by the renderer, not here: never on a ?cal= render (a roaming pod
// could wander into one of the 25 fixed measurement views and change them), and never in the
// raid, pirate or harbour-gate levels - the only levels with a weapon. The auto-aim itself cannot
// pick a dolphin (raid.js `_aim` only ever chooses a ship), but a dolphin surfacing in the line of
// fire would LOOK like it was being shot at, and a dolphin must never be, or seem to be, a target.
// See the DOLPHINS fence in renderer.js.
//
// Frame: the sim's own world metres, the same frame the surfers sample and draw in. The beach is
// at z = -245 (tuning.landZ), so the open sea runs toward +z, and the craft starts at (0, 0).

import { link, uniforms, buffer } from './core.js';
import { SKY_GLSL } from './shaders.js';
import { SHADOW_GLSL } from './shadow.js';
import { ENV_OFF, ENV_CONST } from './craft.js';
import { mulberry32 } from '../rng.js';

const ATTR = { aPos: 0, aNormal: 1, aColor: 2, aAnim: 3, aInst0: 4, aInst1: 5, aInst2: 6 };
const MAX_POD = 8;
const INST_FLOATS = 12;

// sRGB hex -> linear, the convention the coast and the surfers use.
const lin = (h) => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255].map((c) => Math.pow(c, 2.2));
// Bottlenose countershading: a darker grey dorsal CAPE, mid-grey flanks, a pale belly.
// NEUTRAL greys. The first pass used blue-greys (0x40494f / 0x74808a) and, with the sky reflected
// in the wet skin on top, the pod rendered navy blue - plastic toys, not animals. A real
// bottlenose is grey; whatever blue it shows in sunshine comes from the sky, which the lighting
// already adds, so the albedo must not add more.
const CAPE = lin(0x4b4f53);
const FLANK = lin(0x8b9094);
const BELLY = lin(0xe6e3de);

// ---------------------------------------------------------------------------------------
// THE SHAPE. All in fractions of body length; the instance scale is the length in metres.
// Mesh frame: +x is the nose, +y up, +z the dolphin's left. u = 0.5 - x runs 0 at the beak
// to about 0.93 at the fluke insertion. Rows: [u, half-width, half-height, centre y].
// The two proportions that make it a BOTTLENOSE and not a generic fish:
//   * the short beak with a distinct crease into a rounded MELON (u 0.06 -> 0.15), and
//   * a tail stock far deeper than it is wide (u 0.74: 0.030 wide, 0.052 deep) - the keel.
const PROFILE = [
  [0.000, 0.004, 0.004, -0.010],
  [0.030, 0.013, 0.012, -0.010],
  [0.060, 0.018, 0.017, -0.008],
  [0.085, 0.022, 0.024, -0.004],
  [0.110, 0.036, 0.042, 0.006],
  [0.150, 0.052, 0.058, 0.010],
  [0.200, 0.066, 0.071, 0.008],
  [0.270, 0.080, 0.084, 0.004],
  [0.340, 0.088, 0.092, 0.000],
  [0.420, 0.087, 0.091, -0.002],
  [0.500, 0.080, 0.086, -0.002],
  [0.580, 0.068, 0.078, 0.000],
  [0.660, 0.050, 0.066, 0.004],
  [0.740, 0.030, 0.052, 0.006],
  [0.810, 0.018, 0.036, 0.004],
  [0.870, 0.012, 0.022, 0.002],
  [0.925, 0.009, 0.012, 0.000],
];
const U_END = PROFILE[PROFILE.length - 1][0];

// Catmull-Rom through the table, so the melon and the keel are curves rather than kinks.
function profile(u) {
  const P = PROFILE, n = P.length;
  if (u <= P[0][0]) return [P[0][1], P[0][2], P[0][3]];
  if (u >= P[n - 1][0]) return [P[n - 1][1], P[n - 1][2], P[n - 1][3]];
  let i = 0;
  while (i < n - 2 && P[i + 1][0] < u) i++;
  const t = (u - P[i][0]) / (P[i + 1][0] - P[i][0]);
  const out = [];
  for (let k = 1; k <= 3; k++) {
    const p0 = P[Math.max(i - 1, 0)][k], p1 = P[i][k], p2 = P[i + 1][k], p3 = P[Math.min(i + 2, n - 1)][k];
    const t2 = t * t, t3 = t2 * t;
    out.push(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3));
  }
  return out;
}

const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mixC = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

class Mesh {
  constructor() { this.pos = []; this.nrm = []; this.col = []; this.anim = []; this.idx = []; }
  v(x, y, z, nx, ny, nz, c, u) {
    const i = this.pos.length / 3, l = Math.hypot(nx, ny, nz) || 1;
    this.pos.push(x, y, z); this.nrm.push(nx / l, ny / l, nz / l);
    this.col.push(c[0], c[1], c[2]); this.anim.push(u);
    return i;
  }
  tri(a, b, c) { this.idx.push(a, b, c); }
  quad(a, b, c, d) { this.idx.push(a, b, c, a, c, d); }
  get tris() { return this.idx.length / 3; }
}

const RING = 18;
const STATIONS = 34;

function skinColour(u, s) {
  // s is the height round the ring: +1 the spine, -1 the belly.
  let c = mixC(FLANK, BELLY, smooth(-0.15, -0.70, s));
  c = mixC(c, CAPE, smooth(0.20, 0.75, s));
  // the beak and throat are pale underneath, as the real animal's are
  if (u < 0.13 && s < 0.1) c = mixC(c, BELLY, 0.5);
  return c;
}

function buildBody(m) {
  const us = [];
  for (let k = 0; k < STATIONS; k++) us.push(U_END * Math.pow(k / (STATIONS - 1), 0.92));
  const rings = [];
  const eps = 0.004;
  for (const u of us) {
    const [hw, hh, cy] = profile(u);
    const [hwA, hhA, cyA] = profile(Math.max(0, u - eps));
    const [hwB, hhB, cyB] = profile(Math.min(U_END, u + eps));
    const du = Math.min(U_END, u + eps) - Math.max(0, u - eps) || 1;
    const dhw = (hwB - hwA) / du, dhh = (hhB - hhA) / du, dcy = (cyB - cyA) / du;
    const x = 0.5 - u;
    const ring = [];
    for (let j = 0; j < RING; j++) {
      const ph = (j / RING) * Math.PI * 2;
      const s = Math.sin(ph), c = Math.cos(ph);
      // Outward normal = T_phi x T_u for P(u, phi) = (0.5 - u, cy + hh sin, hw cos):
      //   ( hh * hw' cos^2 + hw sin (cy' + hh' sin),  hw sin,  hh cos )
      const nx = hh * dhw * c * c + hw * s * (dcy + dhh * s);
      ring.push(m.v(x, cy + hh * s, hw * c, nx, hw * s, hh * c, skinColour(u, s), u));
    }
    rings.push(ring);
  }
  for (let k = 0; k < rings.length - 1; k++) {
    const a = rings[k], b = rings[k + 1];
    for (let j = 0; j < RING; j++) {
      const j2 = (j + 1) % RING;
      m.quad(a[j], b[j], b[j2], a[j2]);
    }
  }
  // beak tip and tail caps
  const [, , cy0] = profile(0);
  const tip = m.v(0.5 + 0.003, cy0, 0, 1, 0, 0, FLANK, 0);
  for (let j = 0; j < RING; j++) m.tri(tip, rings[0][j], rings[0][(j + 1) % RING]);
  const [, , cyE] = profile(U_END);
  const tail = m.v(0.5 - U_END - 0.004, cyE, 0, -1, 0, 0, FLANK, U_END);
  const last = rings[rings.length - 1];
  for (let j = 0; j < RING; j++) m.tri(tail, last[(j + 1) % RING], last[j]);
}

// A thin shape built as two faces with outward normals, sitting on an outline sampled at
// `levels` points between a leading edge and a trailing edge. `at(t, side)` returns the mesh
// point for level t (0 base -> 1 tip) on the leading (side 0) or trailing (side 1) edge.
function thinFin(m, levels, at, normal, thick, colour) {
  for (const sgn of [1, -1]) {
    const rows = [];
    for (let k = 0; k <= levels; k++) {
      const t = k / levels, th = thick(t) * sgn;
      const L = at(t, 0), T = at(t, 1);
      rows.push([
        m.v(L[0] + normal[0] * th, L[1] + normal[1] * th, L[2] + normal[2] * th, normal[0] * sgn, normal[1] * sgn, normal[2] * sgn, colour(t, sgn), 0.5 - L[0]),
        m.v(T[0] + normal[0] * th, T[1] + normal[1] * th, T[2] + normal[2] * th, normal[0] * sgn, normal[1] * sgn, normal[2] * sgn, colour(t, sgn), 0.5 - T[0]),
      ]);
    }
    for (let k = 0; k < levels; k++) {
      const [a, b] = rows[k], [c, d] = rows[k + 1];
      if (sgn > 0) m.quad(a, b, d, c); else m.quad(a, c, d, b);
    }
  }
}

// Interpolate along a polyline of [u, value] points by a 0..1 parameter.
function along(pts, t) {
  const f = t * (pts.length - 1), i = Math.min(Math.floor(f), pts.length - 2), r = f - i;
  return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * r, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * r];
}

function buildDorsal(m) {
  // Falcate: a leading edge that sweeps back to the tip, a CONCAVE trailing edge. Height about a
  // tenth of body length - 0.29 m on a 2.9 m animal, which is right for an adult bottlenose.
  const H = 0.100;
  const lead = [[0.440, 0.000], [0.480, 0.040], [0.520, 0.072], [0.565, 0.093], [0.605, 0.101]];
  const trail = [[0.590, 0.000], [0.585, 0.020], [0.592, 0.045], [0.600, 0.075], [0.605, 0.101]];
  const top = (u) => { const [, hh, cy] = profile(u); return cy + hh - 0.006; };
  thinFin(m, 8, (t, side) => {
    const [u, h] = along(side === 0 ? lead : trail, t);
    return [0.5 - u, top(u) + (h / 0.101) * H, 0];
  }, [0, 0, 1], (t) => 0.009 * (1 - t) + 0.0012, () => CAPE);
}

function buildFlukes(m) {
  // Horizontal flukes, total span about a quarter of body length, swept back, with the median
  // notch in a concave trailing edge. They take the body-wave station of each vertex, so the
  // shader's wave pitches them - which is exactly the fluke stroke.
  const lead = [[0.915, 0.000], [0.935, 0.045], [0.955, 0.085], [0.975, 0.112], [0.990, 0.120]];
  const trail = [[0.972, 0.000], [0.975, 0.012], [0.985, 0.040], [0.990, 0.070], [0.992, 0.100], [0.990, 0.120]];
  const [, , cy] = profile(U_END);
  for (const side of [1, -1]) {
    thinFin(m, 8, (t, e) => {
      const [u, z] = along(e === 0 ? lead : trail, t);
      return [0.5 - u, cy, z * side];
    }, [0, 1, 0], (t) => 0.004 * (1 - 0.6 * t) + 0.001, (t, sgn) => (sgn > 0 ? CAPE : FLANK));
  }
}

function buildPectorals(m) {
  // Paddle flippers low on the flanks behind the head, swept back and angled down.
  const u0 = 0.265;
  const [hw, hh, cy] = profile(u0);
  const phRoot = -0.42;
  for (const side of [1, -1]) {
    const root = [0.5 - u0, cy + hh * Math.sin(phRoot), hw * Math.cos(phRoot) * side];
    const dir = [-0.52, -0.46, 0.72 * side];
    const dl = Math.hypot(...dir);
    const d = dir.map((x) => x / dl);
    const len = 0.13;
    // the paddle's plane holds the span direction and the body axis, so its normal is
    // cross(d, x) = (0, d.z, -d.y) - turned to point up so the top face is the grey one
    let n = [0, d[2], -d[1]];
    const nl = Math.hypot(...n) || 1;
    n = n.map((x) => x / nl);
    if (n[1] < 0) n = n.map((x) => -x);
    thinFin(m, 6, (t, e) => {
      const c = [root[0] + d[0] * len * t, root[1] + d[1] * len * t, root[2] + d[2] * len * t];
      const half = 0.024 * (1 - 0.55 * t) * Math.sqrt(Math.max(0, 1 - Math.pow(t, 6)));
      return e === 0 ? [c[0] + half, c[1], c[2]] : [c[0] - half, c[1], c[2]];
    }, n, () => 0.003, (t, sgn) => (sgn > 0 ? FLANK : BELLY));
  }
}

function buildDolphin() {
  const m = new Mesh();
  buildBody(m); buildDorsal(m); buildFlukes(m); buildPectorals(m);
  return m;
}

// ---------------------------------------------------------------------------------------
// SHADERS
const VERT = `#version 300 es
precision highp float;
in vec3 aPos;
in vec3 aNormal;
in vec3 aColor;
in float aAnim;
in vec4 aInst0;   // x, y, z, yaw
in vec4 aInst1;   // pitch, roll, stroke phase (integrated on the CPU), body length (m)
in vec4 aInst2;   // unused, stroke amplitude (x length), local water y, unused
uniform mat4 uViewProj;
uniform float uTime;
out vec3 vWorld;
out vec3 vNormal;
out vec3 vColor;
out float vWaterY;
vec3 place(vec3 p) {
  float cp = cos(aInst1.x), sp = sin(aInst1.x);
  float cr = cos(aInst1.y), sr = sin(aInst1.y);
  float ch = cos(aInst0.w), sh = sin(aInst0.w);
  vec3 q = vec3(p.x * cp - p.y * sp, p.x * sp + p.y * cp, p.z);
  q = vec3(q.x, q.y * cr - q.z * sr, q.y * sr + q.z * cr);
  return vec3(ch * q.x - sh * q.z, q.y, sh * q.x + ch * q.z);
}
void main() {
  vec3 p = aPos;
  vec3 n = aNormal;
  // THE STROKE: a travelling wave in the VERTICAL plane. Near-rigid forward of u 0.40, the bend
  // concentrated in the tail stock and largest at the flukes. K sets a wave longer than the
  // body, so the flukes lag the peduncle - which is what pitches them through each beat.
  float u = aAnim;
  float t0 = clamp((u - 0.40) / 0.60, 0.0, 1.0);
  float S = t0 * t0 * (3.0 - 2.0 * t0);
  float env = S * sqrt(S);
  float dS = (t0 > 0.0 && t0 < 1.0) ? 6.0 * t0 * (1.0 - t0) / 0.60 : 0.0;
  float denv = 1.5 * sqrt(max(S, 0.0)) * dS;
  const float K = 2.3;
  // The stroke PHASE is integrated on the CPU and arrives in aInst1.z. It must not be
  // uTime * rate: the rate follows the animal's speed, and a rate change at t = 100 s would
  // jump that product by tens of radians - the tail would teleport mid-beat.
  float th = aInst1.z - K * u;
  float A = aInst2.y;
  // plus a small recoil forward, in counter-phase, so the head is not a dead block
  float dy = A * env * sin(th) - 0.14 * A * (1.0 - u) * sin(th + 0.4);
  float dydu = A * (denv * sin(th) - K * env * cos(th))
             + 0.14 * A * sin(th + 0.4) + 0.14 * A * K * (1.0 - u) * cos(th + 0.4);
  p.y += dy;
  // mesh x runs nose(+) to tail(-): d/dx = -d/du. Turn the normal with the local slope.
  float a = atan(-dydu);
  float ca = cos(a), sa = sin(a);
  n = vec3(n.x * ca - n.y * sa, n.x * sa + n.y * ca, n.z);
  p *= aInst1.w;
  vec3 w = place(p) + aInst0.xyz;
  vWorld = w;
  vNormal = place(n);
  vColor = aColor;
  vWaterY = aInst2.z;
  gl_Position = uViewProj * vec4(w, 1.0);
}
`;

// Lighting is the surfers' model verbatim (wet GGX lobe, sky reflection, the sun shadow), with
// a roughness for dolphin skin: smooth and glossy when wet, not a mirror.
const D_SHADOW = ENV_OFF ? '' : SHADOW_GLSL;
const D_CONST = ENV_OFF ? '' : ENV_CONST + `
// 0.13 at first, which made the skin a near-mirror of the blue sky over the whole body. Wet
// dolphin skin is smooth, but not chrome: 0.22 keeps a sheen and lets the grey through.
const float ENVC_DOLPHR = 0.22;
`;
const D_LIGHT = ENV_OFF ? `
  float ndl = max(dot(N, uSunDir), 0.0);
  vec3 direct = vColor * (ndl * 0.85 + 0.15);
  vec3 ambient = vColor * skyColor(normalize(N + vec3(0.0, 0.35, 0.0)), uSunDir) * 0.55;
  vec3 col = direct * 0.55 + ambient + vColor * vec3(0.30, 0.34, 0.36) * max(-N.y, 0.0);` : `
  vec3 alb = vColor * (1.0 - ENVC_TIR) / (1.0 - vColor * ENVC_TIR);
  float NdV = max(dot(N, V), 1e-3);
  float fr = ENVC_F0 + (max(1.0 - ENVC_DOLPHR, ENVC_F0) - ENVC_F0) * pow(1.0 - NdV, 5.0);
  float ndl = max(dot(N, uSunDir), 0.0);
  float sh = sunShadow(vWorld, N, uSunDir);
  vec3 skyAmb = skyColor(normalize(N + vec3(0.0, 0.35, 0.0)), uSunDir);
  vec3 direct = alb * (ndl * 0.85 * sh + 0.15);
  vec3 ambient = alb * skyAmb * 0.55;
  vec3 Rv = normalize(reflect(-V, N));
  vec3 envM = skyColor(Rv, uSunDir);
  envM -= SUN_TINT * (smoothstep(0.9992, 0.99975, dot(Rv, uSunDir)) * 30.0
                      * (1.0 - smoothstep(0.0, -0.12, Rv.y)));
  vec3 env = mix(envM, skyAmb, ENVC_DOLPHR);
  vec3 H = normalize(uSunDir + V);
  float alp = ENVC_DOLPHR * ENVC_DOLPHR + ENVC_SUNA;
  float al2 = alp * alp;
  float NdH = max(dot(N, H), 0.0);
  float den = NdH * NdH * (al2 - 1.0) + 1.0;
  float dgx = al2 / (ENVC_PI * den * den);
  float vgx = 0.5 / max(mix(2.0 * ndl * NdV, ndl + NdV, alp), 1e-4);
  float lobe = dgx * vgx * ndl * ENVC_SUNE;
  // LIGHT FROM BELOW. The sea throws sky back up onto anything just above it, and a dolphin's
  // belly is genuinely white. Without this the underside faces the dark water, gets almost no
  // light, and the countershading - the pale flash when one rolls or leaps - never shows.
  ambient += alb * vec3(0.30, 0.34, 0.36) * max(-N.y, 0.0);
  vec3 col = (direct * 0.55 + ambient) * (1.0 - fr) + env * fr + vec3(1.0) * lobe * fr * sh;`;

const FRAG = `#version 300 es
precision highp float;
in vec3 vWorld;
in vec3 vNormal;
in vec3 vColor;
in float vWaterY;
out vec4 fragColor;
uniform vec3 uCamPos;
uniform vec3 uSunDir;
uniform float uExposure;
${SKY_GLSL}
${D_SHADOW}
${D_CONST}
vec3 acesD(vec3 x) {
  const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}
const vec3 EXTINCT = vec3(0.62, 0.16, 0.30);
const vec3 WATER_IN = vec3(0.012, 0.055, 0.041);
void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(uCamPos - vWorld);
  if (dot(N, V) < 0.0) N = -N;
${D_LIGHT}
  // Below the LOCAL water level - not a flat y = 0 - so the waterline follows the swell the
  // animal is rolling through. Same extinction as the surfers and the rescue actors.
  if (vWorld.y < vWaterY) {
    float dd = min(vWaterY - vWorld.y, 3.0) * 2.0;
    vec3 t = exp(-EXTINCT * dd);
    col = col * t + WATER_IN * (1.0 - t);
  }
  fragColor = vec4(pow(acesD(col * uExposure), vec3(1.0 / 2.2)), 1.0);
}
`;

// The breath: soft camera-facing particles, alpha-blended, drawn after the pod.
const PUFF_VERT = `#version 300 es
precision highp float;
in vec2 aCorner;
in vec4 aP;       // x, y, z, radius
in float aA;      // alpha
uniform mat4 uViewProj;
uniform vec3 uRight;
uniform vec3 uUp;
out vec2 vUV;
out float vA;
void main() {
  vec3 w = aP.xyz + (uRight * aCorner.x + uUp * aCorner.y) * aP.w;
  vUV = aCorner;
  vA = aA;
  gl_Position = uViewProj * vec4(w, 1.0);
}
`;
const PUFF_FRAG = `#version 300 es
precision highp float;
in vec2 vUV;
in float vA;
out vec4 fragColor;
uniform float uExposure;
void main() {
  float r2 = dot(vUV, vUV);
  if (r2 > 1.0) discard;
  float a = vA * (1.0 - r2) * (1.0 - r2);
  vec3 c = vec3(0.86, 0.89, 0.91) * min(1.0, uExposure * 1.1);
  fragColor = vec4(c * a, a);
}
`;
const MAX_PUFF = 96;

// ---------------------------------------------------------------------------------------
// WHERE THE POD LIVES. Open water, clear of the beach and the pier.
//   * the beach is at z ~ -245, so z >= -130 keeps them at least ~115 m out, beyond the surf
//     and the line-up;
//   * the pier crosses the waterline at about (-224, -245) and runs out to its head at about
//     (-207, -86) - the surfers' own toWorld(), with DIR (0.1063, 0.9943) - so waypoints keep
//     60 m clear of that segment;
//   * the home range is centred off the start so a player can actually find them.
const HOME = { x: 80, z: 60, r: 230 };
const Z_MIN = -130;
const PIER_A = [55 * 0.1063 - 230, 55 * 0.9943 - 300];
const PIER_B = [215 * 0.1063 - 230, 215 * 0.9943 - 300];
const PIER_CLEAR = 60;
function distToPier(x, z) {
  const ax = PIER_A[0], az = PIER_A[1], bx = PIER_B[0] - ax, bz = PIER_B[1] - az;
  const t = Math.max(0, Math.min(1, ((x - ax) * bx + (z - az) * bz) / (bx * bx + bz * bz)));
  return Math.hypot(x - (ax + bx * t), z - (az + bz * t));
}
const openWater = (x, z) => z >= Z_MIN && distToPier(x, z) >= PIER_CLEAR && Math.hypot(x - HOME.x, z - HOME.z) <= HOME.r;

// Formation slots behind the leader, in the leader's frame: [back, left]. Loose on purpose.
const SLOTS = [[0, 0], [-3.2, 2.6], [-3.4, -2.4], [-6.8, 0.6], [-5.6, 5.0], [-6.2, -4.6], [-9.6, -1.8], [-9.0, 3.2]];

// The breath cycle, relative to the local sea surface. Heights are for the body CENTRE line.
// On a 2.9 m animal the back is ~0.27 m above that line and the fin tip ~0.56 m, so:
//   cruise -1.8  everything under                 rise to -0.55  the fin just starts to cut
//   roll  peak -0.07  the back and fin out, the belly still under
// The first pass peaked at +0.06, which put nearly the whole animal above the water: the pod lay
// on the surface like floats instead of arching through it. A surfacing roll shows the top of
// the head, the back and the fin, then the tail stock - never the belly. (A LEAP is the exception.)
const CRUISE_Y = -1.8, ROLL_BASE = -0.55;
const T_RISE = 2.2, T_ROLL = 1.3, T_LEAP = 1.5, T_DIVE = 2.0;
const ROLL_H = 0.48, LEAP_H = 2.3;
const CRUISE = 0, RISE = 1, ROLL = 2, LEAP = 3, DIVE = 4;
const easeInOut = (t) => t * t * (3 - 2 * t);

export class Dolphins {
  constructor(gl, { count = 6, seed = 0x0d01f1, busy = false, view = false } = {}) {
    this.gl = gl;
    this.busy = busy;          // short breath intervals, for filming and review
    // ?dolphins=view: on the first update, put the pod 14 m ahead of the player swimming across
    // the chase camera's view. For filming and review only - it is not how they normally appear.
    this.view = view;
    this._placed = false;
    this.rng = mulberry32(seed);
    this.prog = link(gl, VERT, FRAG, 'dolphins', ATTR);
    this.u = uniforms(gl, this.prog, ['uViewProj', 'uTime', 'uCamPos', 'uSunDir', 'uExposure',
      'uShadowMap', 'uLightViewProj', 'uShadowTexel']);
    this.mesh = this._upload(buildDolphin());
    this.puffProg = link(gl, PUFF_VERT, PUFF_FRAG, 'dolphinPuff', { aCorner: 0, aP: 1, aA: 2 });
    this.pu = uniforms(gl, this.puffProg, ['uViewProj', 'uRight', 'uUp', 'uExposure']);
    this._makePuff();
    this.pod = [];
    this._seed(Math.max(1, Math.min(MAX_POD, count)));
    this.hidden = false;
    this.lastStats = { draws: 0, tris: 0, instances: 0, puffs: 0 };
  }

  get meshTris() { return this.mesh.tris; }

  _r(a, b) { return a + (b - a) * this.rng(); }

  _seed(n) {
    const r = () => this.rng();
    let x = HOME.x, z = HOME.z;
    this.pod.length = 0;
    this.lead = { x, z, heading: r() * Math.PI * 2, speed: 3.0, wx: x, wz: z, wT: 0, turn: 0 };
    this._pickWaypoint(true);
    for (let i = 0; i < n; i++) {
      const s = SLOTS[i];
      this.pod.push({
        i, slot: s, x: x + s[0], z: z + s[1], heading: this.lead.heading, speed: 3.0,
        yRel: CRUISE_Y, vy: 0, pitch: 0, roll: 0, turn: 0,
        len: i === 0 ? 3.0 : this._r(2.4, 3.1),     // adults and a young one or two
        phase: r() * 6.283, stroke: r() * 6.283,
        mode: CRUISE, t: 0,
        // the leader sets the breathing; each follower answers a beat behind
        delay: i === 0 ? 0 : this._r(0.25, 1.6),
        breathIn: i === 0 ? this._r(3, 8) : 1e9,
        puffed: false,
        jx: this._r(-0.6, 0.6), jz: this._r(-0.6, 0.6),
      });
    }
  }

  _pickWaypoint(force) {
    const L = this.lead;
    for (let tries = 0; tries < 24; tries++) {
      const a = this.rng() * Math.PI * 2, d = this._r(60, 190);
      const x = L.x + Math.cos(a) * d, z = L.z + Math.sin(a) * d;
      if (openWater(x, z)) { L.wx = x; L.wz = z; L.wT = this._r(20, 45); return; }
    }
    if (force || !openWater(L.wx, L.wz)) { L.wx = HOME.x; L.wz = HOME.z; L.wT = 30; }
  }

  // Move the pod to within sight of a point - the review and filming handle.
  summon(x, z, dist = 45, heading = null) {
    const d = dist, a = this.rng() * Math.PI * 2;
    let px = x + Math.cos(a) * d, pz = Math.max(Z_MIN + 5, z + Math.sin(a) * d);
    if (distToPier(px, pz) < PIER_CLEAR) { px = HOME.x; pz = HOME.z; }
    this.lead.x = px; this.lead.z = pz;
    this.lead.heading = heading ?? (Math.atan2(z - pz, x - px) + Math.PI / 2);
    for (const d0 of this.pod) {
      const c = Math.cos(this.lead.heading), s = Math.sin(this.lead.heading);
      d0.x = px + c * d0.slot[0] - s * d0.slot[1];
      d0.z = pz + s * d0.slot[0] + c * d0.slot[1];
      d0.heading = this.lead.heading;
    }
    // An explicit heading means "swim that way": aim the waypoint straight down it rather than
    // at a random point, so a summoned pod goes where it was sent.
    if (heading !== null && heading !== undefined) {
      this.lead.wx = px + Math.cos(this.lead.heading) * 300;
      this.lead.wz = pz + Math.sin(this.lead.heading) * 300;
      this.lead.wT = 60;
    } else {
      this._pickWaypoint(true);
    }
    const lead = this.pod[0];
    if (lead) lead.breathIn = 1.5;
  }

  update(sea, time, dt, pose) {
    if (!(dt > 0)) return;
    if (this.view && !this._placed && pose) {
      // 15 m ahead of the player and 24 m off to the left, swimming ACROSS the chase camera's
      // view: broadside is the angle that shows the tail beat, the arc of the roll and the fin.
      // At about 3 m/s the first breath comes up left of the rider and the second right of him,
      // both inside the frame. (An earlier diagonal-away placement left them as specks by the
      // horizon within seconds; a nearer crossing left the frame before the second breath.)
      this._placed = true;
      const h = pose.heading, fx = Math.cos(h), fz = Math.sin(h), sx = -fz, sz = fx;
      this.summon(pose.x + fx * 15 - sx * 24.5, pose.z + fz * 15 - sz * 24.5, 0, h + Math.PI / 2);
    }
    const L = this.lead;
    // ---- the leader wanders between waypoints in open water ---------------------------
    L.wT -= dt;
    if (L.wT <= 0 || Math.hypot(L.wx - L.x, L.wz - L.z) < 25) this._pickWaypoint(false);
    const want = Math.atan2(L.wz - L.z, L.wx - L.x);
    let dh = Math.atan2(Math.sin(want - L.heading), Math.cos(want - L.heading));
    const turn = Math.max(-0.22, Math.min(0.22, dh * 0.6));
    L.turn = turn;
    L.heading += turn * dt;
    L.speed += ((3.0 + 0.4 * Math.sin(time * 0.07)) - L.speed) * Math.min(1, dt * 0.5);
    L.x += Math.cos(L.heading) * L.speed * dt;
    L.z += Math.sin(L.heading) * L.speed * dt;

    const lc = Math.cos(L.heading), ls = Math.sin(L.heading);
    const leadDolphin = this.pod[0];
    for (const d of this.pod) {
      // ---- horizontal: hold a loose slot in the formation --------------------------------
      const tx = L.x + lc * d.slot[0] - ls * d.slot[1] + d.jx;
      const tz = L.z + ls * d.slot[0] + lc * d.slot[1] + d.jz;
      const ex = tx - d.x, ez = tz - d.z;
      // The slot error in the POD's frame: along = how far the slot is ahead, lat = to the left.
      // Steer at a point on the slot's line always at least 4 m ahead along the pod's heading.
      // Aiming at the slot itself made a dolphin that had surged past it (a leap runs at 5.6 m/s)
      // turn right round and swim back - a U-turn in the middle of the bay. Now it holds the
      // pod's heading and the speed rule below lets it drop back into place.
      const along = ex * lc + ez * ls, lat = -ex * ls + ez * lc;
      const ahead = Math.max(along, 0) + 4;
      const aim = Math.atan2(ls * ahead + lc * lat, lc * ahead - ls * lat);
      const dH = Math.atan2(Math.sin(aim - d.heading), Math.cos(aim - d.heading));
      d.turn = Math.max(-0.9, Math.min(0.9, dH * 1.6));
      d.heading += d.turn * dt;
      const baseV = d.mode === LEAP ? 5.6 : L.speed;
      const wantV = Math.max(1.8, Math.min(5.8, baseV + (along - 1.0) * 0.35));
      d.speed += (wantV - d.speed) * Math.min(1, dt * 1.5);
      d.x += Math.cos(d.heading) * d.speed * dt;
      d.z += Math.sin(d.heading) * d.speed * dt;

      // ---- vertical: the breath cycle -------------------------------------------------
      // Never surface right under a craft - real ones do not, and a dolphin rolling up through
      // the jetski would look broken. (How they REACT to a craft is the next step, not this one.)
      const near = pose && Math.hypot(pose.x - d.x, pose.z - d.z) < 9;
      d.t += dt;
      const prevY = d.yRel;
      switch (d.mode) {
        case CRUISE: {
          d.yRel = CRUISE_Y + 0.12 * Math.sin(time * 0.6 + d.phase);
          d.breathIn -= dt;
          if (d.i !== 0 && leadDolphin && leadDolphin.mode === RISE && leadDolphin.t < 0.05 && d.breathIn > 1e8) {
            d.breathIn = d.delay;                 // answer the leader, a beat behind
          }
          if (d.breathIn <= 0 && !near) { d.mode = RISE; d.t = 0; d.from = d.yRel; }
          break;
        }
        case RISE: {
          const s = Math.min(1, d.t / T_RISE);
          d.yRel = d.from + (ROLL_BASE - d.from) * easeInOut(s);
          if (s >= 1) {
            // One in twenty, per animal per breath, whether or not ?dolphins=busy is on. At 0.22
            // under busy four of six once went up together - a dolphin show, not a pod travelling.
            // Busy shortens the wait between breaths; it must not change what a breath looks like.
            const leap = this.rng() < 0.05;
            d.mode = leap ? LEAP : ROLL; d.t = 0; d.puffed = false;
          }
          break;
        }
        case ROLL: case LEAP: {
          const T = d.mode === LEAP ? T_LEAP : T_ROLL, H = d.mode === LEAP ? LEAP_H : ROLL_H;
          const s = Math.min(1, d.t / T);
          d.yRel = ROLL_BASE + H * Math.sin(Math.PI * s);
          // the breath, at the moment the blowhole clears
          if (!d.puffed && s > 0.2) { d.puffed = true; this._puff(d, sea, time); }
          if (s >= 1) { d.mode = DIVE; d.t = 0; }
          break;
        }
        case DIVE: {
          const s = Math.min(1, d.t / T_DIVE);
          d.yRel = ROLL_BASE + (CRUISE_Y - ROLL_BASE) * easeInOut(s);
          if (s >= 1) {
            d.mode = CRUISE; d.t = 0;
            d.breathIn = d.i === 0
              ? (this.busy ? this._r(1.5, 2.5) : this._r(14, 30))
              : 1e9;                                  // followers wait for the leader again
          }
          break;
        }
      }
      // Pitch follows the animal's own path, so the arc and the roll come out of the motion
      // rather than being keyed separately: nose up rising, level at the top, nose down diving.
      const vy = (d.yRel - prevY) / dt;
      let wantPitch = Math.atan2(vy, Math.max(1.5, d.speed));
      // THE ROLL IS A PIVOT, not just a bob: nose up as the head breaks the surface, level with
      // the back out, then nose down so the tail stock arches up behind as the head goes under.
      // Path pitch alone stays within a few degrees and reads as a float bobbing.
      if (d.mode === ROLL) wantPitch = 0.26 * Math.cos(Math.PI * Math.min(1, d.t / T_ROLL)) - 0.08;
      d.pitch += (wantPitch - d.pitch) * Math.min(1, dt * 7);
      d.roll += ((-d.turn * 0.45) - d.roll) * Math.min(1, dt * 3);
      // stroke: faster when swimming faster; gliding through the roll, as they do when breathing
      const gliding = d.mode === ROLL ? 0.45 : d.mode === LEAP ? 0.25 : 1;
      d.rate = 6.2831853 * (0.55 + 0.30 * d.speed);
      d.stroke = (d.stroke + d.rate * dt) % 6.2831853;   // integrated - see the shader's note
      d.amp = 0.066 * gliding;
      // sea surface at the animal
      const S = sea && sea.sample ? sea.sample(d.x, d.z, time, 0, 3) : null;
      d.water = S ? S.height : 0;
    }
    this._stepPuffs(dt);
  }

  // ---- breath ------------------------------------------------------------------------
  _makePuff() {
    const gl = this.gl;
    this.puffs = [];
    this.puffData = new Float32Array(MAX_PUFF * 5);
    this.puffVao = gl.createVertexArray();
    gl.bindVertexArray(this.puffVao);
    buffer(gl, gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]));
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0);
    this.puffVbo = buffer(gl, gl.ARRAY_BUFFER, this.puffData, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 20, 0); gl.vertexAttribDivisor(1, 1);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 20, 16); gl.vertexAttribDivisor(2, 1);
    gl.bindVertexArray(null);
  }

  _puff(d, sea, time) {
    // The blowhole sits on top of the head, about a fifth of the way back from the beak.
    const c = Math.cos(d.heading), s = Math.sin(d.heading);
    const fwd = (0.5 - 0.20) * d.len;
    const up = 0.08 * d.len;
    const cp = Math.cos(d.pitch), sp = Math.sin(d.pitch);
    const bx = d.x + c * fwd * cp, bz = d.z + s * fwd * cp;
    const by = (d.water || 0) + d.yRel + fwd * sp + up;
    // A plume, not a ball: more, smaller, fainter particles with a spread of rise speeds, so the
    // breath goes up as a column and thins out. Nine fat ones at 0.55 alpha read as a snowball.
    for (let k = 0; k < 12 && this.puffs.length < MAX_PUFF; k++) {
      this.puffs.push({
        x: bx + this._r(-0.05, 0.05), y: by, z: bz + this._r(-0.05, 0.05),
        vx: this._r(-0.45, 0.45) + c * d.speed * 0.25, vy: this._r(1.2, 3.4), vz: this._r(-0.45, 0.45) + s * d.speed * 0.25,
        r0: this._r(0.04, 0.09), age: 0, life: this._r(0.8, 1.5),
      });
    }
  }

  _stepPuffs(dt) {
    let w = 0;
    for (const p of this.puffs) {
      p.age += dt;
      if (p.age >= p.life) continue;
      p.vy -= 1.2 * dt;                 // a breath rises, slows and hangs
      p.vx *= 1 - dt * 1.2; p.vz *= 1 - dt * 1.2;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      this.puffs[w++] = p;
    }
    this.puffs.length = w;
  }

  // ---- draw --------------------------------------------------------------------------
  _upload(mesh) {
    const gl = this.gl;
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const nv = mesh.pos.length / 3;
    const data = new Float32Array(nv * 10);
    for (let i = 0; i < nv; i++) {
      data.set([mesh.pos[i * 3], mesh.pos[i * 3 + 1], mesh.pos[i * 3 + 2],
        mesh.nrm[i * 3], mesh.nrm[i * 3 + 1], mesh.nrm[i * 3 + 2],
        mesh.col[i * 3], mesh.col[i * 3 + 1], mesh.col[i * 3 + 2],
        mesh.anim[i]], i * 10);
    }
    buffer(gl, gl.ARRAY_BUFFER, data);
    gl.enableVertexAttribArray(ATTR.aPos); gl.vertexAttribPointer(ATTR.aPos, 3, gl.FLOAT, false, 40, 0);
    gl.enableVertexAttribArray(ATTR.aNormal); gl.vertexAttribPointer(ATTR.aNormal, 3, gl.FLOAT, false, 40, 12);
    gl.enableVertexAttribArray(ATTR.aColor); gl.vertexAttribPointer(ATTR.aColor, 3, gl.FLOAT, false, 40, 24);
    gl.enableVertexAttribArray(ATTR.aAnim); gl.vertexAttribPointer(ATTR.aAnim, 1, gl.FLOAT, false, 40, 36);
    const inst = new Float32Array(MAX_POD * INST_FLOATS);
    const ibo = buffer(gl, gl.ARRAY_BUFFER, inst, gl.DYNAMIC_DRAW);
    for (let j = 0; j < 3; j++) {
      const loc = ATTR.aInst0 + j;
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, 48, j * 16);
      gl.vertexAttribDivisor(loc, 1);
    }
    const idx = nv > 65535 ? new Uint32Array(mesh.idx) : new Uint16Array(mesh.idx);
    buffer(gl, gl.ELEMENT_ARRAY_BUFFER, idx);
    gl.bindVertexArray(null);
    return { vao, ibo, inst, count: mesh.idx.length, type: nv > 65535 ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT, tris: mesh.tris };
  }

  draw(cam, vp, sunDir, exposure, time, shadow) {
    const gl = this.gl;
    // lastStats is updated in place: this runs every frame and allocates nothing.
    const st = this.lastStats;
    if (this.hidden || !this.pod.length) { st.draws = 0; st.tris = 0; st.instances = 0; st.puffs = 0; return; }
    const M = this.mesh, a = M.inst;
    let n = 0;
    for (const d of this.pod) {
      // Anything whose whole body is well under the surface cannot be seen through the opaque
      // water and is not submitted at all.
      if (d.yRel + 0.62 * (d.len / 2.9) < -0.05 && d.mode === CRUISE) continue;
      const o = n * INST_FLOATS;
      a[o] = d.x; a[o + 1] = (d.water || 0) + d.yRel; a[o + 2] = d.z; a[o + 3] = d.heading;
      a[o + 4] = d.pitch; a[o + 5] = d.roll; a[o + 6] = d.stroke; a[o + 7] = d.len;
      a[o + 8] = 0; a[o + 9] = d.amp || 0.066; a[o + 10] = d.water || 0; a[o + 11] = 0;
      n++;
    }
    let draws = 0;
    if (n) {
      gl.useProgram(this.prog);
      gl.uniformMatrix4fv(this.u.uViewProj, false, vp);
      gl.uniform1f(this.u.uTime, time);
      gl.uniform3f(this.u.uCamPos, cam.x, cam.y, cam.z);
      gl.uniform3f(this.u.uSunDir, sunDir[0], sunDir[1], sunDir[2]);
      gl.uniform1f(this.u.uExposure, exposure);
      if (shadow) shadow.bind(gl, this.prog, this.u);
      gl.enable(gl.DEPTH_TEST);
      gl.depthMask(true);
      gl.disable(gl.CULL_FACE);
      gl.bindBuffer(gl.ARRAY_BUFFER, M.ibo);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, a, 0, n * INST_FLOATS);
      gl.bindVertexArray(M.vao);
      gl.drawElementsInstanced(gl.TRIANGLES, M.count, M.type, 0, n);
      draws++;
    }
    // the breath, soft and alpha-blended, after the bodies
    const np = Math.min(this.puffs.length, MAX_PUFF);
    if (np) {
      const P = this.puffData;
      for (let i = 0; i < np; i++) {
        const p = this.puffs[i], k = p.age / p.life;
        P[i * 5] = p.x; P[i * 5 + 1] = p.y; P[i * 5 + 2] = p.z;
        P[i * 5 + 3] = p.r0 + k * 0.45;
        P[i * 5 + 4] = 0.30 * (1 - k) * (1 - k) * Math.min(1, p.age * 12);
      }
      // camera basis, matching core.viewFromYawPitch (see renderer.js)
      const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw), cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
      const fx = cp * cy, fy = sp, fz = cp * sy;
      let rx = -fz, rz = fx; const rl = Math.hypot(rx, rz) || 1; rx /= rl; rz /= rl;
      const ux = -rz * fy, uy = rz * fx - rx * fz, uz = rx * fy;
      gl.useProgram(this.puffProg);
      gl.uniformMatrix4fv(this.pu.uViewProj, false, vp);
      gl.uniform3f(this.pu.uRight, rx, 0, rz);
      gl.uniform3f(this.pu.uUp, ux, uy, uz);
      gl.uniform1f(this.pu.uExposure, exposure);
      gl.enable(gl.DEPTH_TEST);
      gl.depthMask(false);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.puffVbo);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, P, 0, np * 5);
      gl.bindVertexArray(this.puffVao);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, np);
      gl.disable(gl.BLEND);
      gl.depthMask(true);
      draws++;
    }
    gl.bindVertexArray(null);
    st.draws = draws; st.tris = M.tris * n; st.instances = n; st.puffs = np;
  }
}
