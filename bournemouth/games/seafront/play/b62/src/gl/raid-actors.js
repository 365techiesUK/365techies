// VIKING RAID - GL cast: longships (with damage, broken masts, break-up and sinking),
// crews, Vikings in the water, wreckage, sharks, projectiles, cartoon fire, smoke,
// splashes, rings and power-up crates (tr52 ships; tr57 combat, sharks, effects).
//
// COST. One program; one instanced draw per mesh type in use (at most 35 whatever
// the swarm size). Every mesh is built once at construction; a frame rewrites small
// per-instance buffers (16 floats each; 25 mesh types). Rowing, raised oars, the lowering sail,
// splintered oars, the leaning broken mast, the hull breaking in two, paddling arms
// and shark tails are animated in the vertex shader from per-instance values.
// Full-detail longships are capped at the 6 nearest inside 190 m and full sharks at
// the 6 nearest inside 160 m (others: low-poly hull / fin only), swimmers drawn at 80,
// particles at 600, and every mesh type at 256 instances.
//
// CONTENT. Cartoon only. Hulls get dark holes and splinters, masts break, the hull
// lists, breaks in two and goes under with a big splash and floating planks. Crews
// in the water bob, splash, grab planks, shake their fists and paddle away. Sharks
// are cartoon fins that thrash and dive. No blood, no gore, no death animation.
// tr59 'Hollywood epic' pass: longships (clinker hulls, dragon prows, shields, stroking oars,
// billowing striped sails, the flagship's raven sail) live in raid-longship.js and the crews
// (bearded warriors, some horned helmets, woad, throwers synced to the rules' throw events) in
// raid-crew.js; three hull LODs. Generic crews; no real-world flags, symbols or text.
//
// It draws AFTER SeaRenderer.draw() into the same frame and depth buffer with the
// renderer's own view-projection (seaGL.vpM), like rescue-actors.js. renderer.js is
// not edited, and this object does not exist while the mode is off.
// Local mesh frame, matching craft.js: +X forward (the bow), +Y up, +Z starboard;
// instance yaw is the sim heading (x += cos h, z += sin h).
//
// ⚠️ No backtick may appear inside the GLSL template literals below.

import { link, uniforms, buffer } from './core.js';
import { Kit, PAINT, ZERO, shield } from './raid-kit.js';
import { L0, buildLongship, buildShipMid, buildShipFar, buildSail, buildSailMid, buildBowWave, buildWakeChevron, slotsOf } from './raid-longship.js';
import { buildBrig, buildBrigMid, buildBrigFar, buildPirateSail, buildPirateSailMid } from './raid-pirate-ship.js';
import { buildSwimmer } from './raid-crew.js';
import { SKY_GLSL } from './shaders.js';

const ATTR = { aPos: 0, aNormal: 1, aColor: 2, aAnim: 3, aPivot: 4, aInst0: 5, aInst1: 6, aInst2: 7, aInst3: 8 };
const MAX_INST = 256;
const INST_FLOATS = 16;
const VFLOATS = 14;

const VERT = `#version 300 es
precision highp float;
in vec3 aPos;
in vec3 aNormal;
in vec4 aColor;
in float aAnim;
in vec3 aPivot;
in vec4 aInst0;   // x, y, z, yaw
in vec4 aInst1;   // pitch, roll, phase, scale
in vec4 aInst2;   // tint rgb, tint amount | ships and sails (amount 0): mast lean, seconds since the last throw, thrower slot mask
in vec4 aInst3;   // anim rate (or ring radius), sail lowered (or ring height; swimmer shield flag), oars raised (swimmer horns flag), damage (0..1; 1..2 breaking up; 3 sinking whole)
uniform mat4 uViewProj;
uniform float uTime;
out vec3 vWorld;
out vec3 vNormal;
out vec4 vColor;
out vec3 vLocal;
out float vDmg;
out float vSail;

vec3 place(vec3 p) {
  float cp = cos(aInst1.x), sp = sin(aInst1.x);
  float cr = cos(aInst1.y), sr = sin(aInst1.y);
  float ch = cos(aInst0.w), sh = sin(aInst0.w);
  vec3 q = vec3(p.x * cp - p.y * sp, p.x * sp + p.y * cp, p.z);
  q = vec3(q.x, q.y * cr - q.z * sr, q.y * sr + q.z * cr);
  return vec3(ch * q.x - sh * q.z, q.y, sh * q.x + ch * q.z);
}
vec3 rotX(vec3 d, float a) { float c = cos(a), s = sin(a); return vec3(d.x, d.y * c + d.z * s, -d.y * s + d.z * c); }
vec3 rotY(vec3 d, float a) { float c = cos(a), s = sin(a); return vec3(d.x * c - d.z * s, d.y, d.x * s + d.z * c); }
vec3 rotZ(vec3 d, float a) { float c = cos(a), s = sin(a); return vec3(d.x * c - d.y * s, d.x * s + d.y * c, d.z); }
vec3 rotAxis(vec3 v, vec3 k, float a) { float c = cos(a), s = sin(a); return v * c + cross(k, v) * s + k * dot(k, v) * (1.0 - c); }
const vec3 MAST_FOOT = vec3(0.3, 1.0, 0.0);
const vec3 OAR_D = vec3(0.0, -0.48, 0.877);

// One oar stroke: x = sweep (blade forward -0.45 at the catch, aft +0.40 at the finish),
// y = lift (blade in the water during the pull, clear during recovery), z = feather (0..1).
vec3 stroke(float phi) {
  float s = fract(phi / 6.2831853);
  if (s < 0.5) {
    return vec3(mix(-0.45, 0.40, smoothstep(0.04, 0.5, s)), mix(0.14, -0.03, smoothstep(0.0, 0.07, s)), 1.0 - smoothstep(0.0, 0.05, s));
  }
  return vec3(mix(0.40, -0.45, smoothstep(0.55, 0.98, s)), mix(-0.03, 0.16, smoothstep(0.5, 0.58, s)) - 0.02 * smoothstep(0.9, 1.0, s), smoothstep(0.5, 0.6, s));
}

void main() {
  vec3 p = aPos;
  vec3 n = aNormal;
  int anim = int(aAnim + 0.5);
  bool crew = anim >= 100;
  if (crew) anim -= 100;
  float phi = uTime * aInst3.x + aInst1.z;
  float up = aInst3.z;
  float dmg = aInst3.w;
  float wreck = clamp(dmg, 0.0, 1.0);
  bool shipInst = aInst2.a < 0.01;
  float lean = shipInst ? aInst2.r : 0.0;
  vSail = 0.0;
  if (crew && dmg > 0.999) {
    // the ship is going down: her crew are already in the water (the rules' swimmers)
    vWorld = vec3(0.0); vNormal = vec3(0.0, 1.0, 0.0); vColor = vec4(0.0); vLocal = vec3(0.0); vDmg = 0.0;
    gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
    return;
  }
  if (anim == 1 || anim == 9) {
    // OAR through its port: stroke (catch, pull, feather, recover); snapped ones hang as stubs
    float side = aPivot.z >= 0.0 ? 1.0 : -1.0;
    vec3 d = p - aPivot;
    if (fract(aPivot.x * 0.37 + aPivot.z * 0.11 + 0.5) < wreck * 0.8) {
      d = anim == 9 ? vec3(0.0) : rotX(d * 0.4, side * 0.5);
    } else {
      vec3 st = stroke(phi);
      float sweep = st.x * (1.0 - up);
      float lift = mix(st.y, 1.35, up);
      if (anim == 9) {
        vec3 ax = normalize(vec3(0.0, OAR_D.y, side * OAR_D.z));
        float fa = side * st.z * 1.35 * (1.0 - up);
        d = rotAxis(d, ax, fa); n = rotAxis(n, ax, fa);
      }
      d = rotY(rotX(d, side * lift), side * sweep);
      n = rotY(rotX(n, side * lift), side * sweep);
    }
    p = aPivot + d;
  } else if (anim == 2) {
    float a = -0.75 * stroke(phi).x * (1.0 - up);      // mid-LOD ROWER leans with his oar
    p = aPivot + rotZ(p - aPivot, a);
    n = rotZ(n, a);
  } else if (anim == 17) {
    // ROWER welded to his oar (tr67). aPivot is the OAR's own port and the fraction of the
    // anim code is this vertex's weight: 0 at his seat, ~0.55 at his shoulders, 1 at his
    // fists. Each vertex takes that share of the oar's own stroke rotation, so the seat stays
    // put, his back swings through the stroke and his fists never leave the handle - and his
    // arms stretch at the catch and draw in at the finish because the weight ramps along them.
    float w = fract(aAnim) * 2.2222;
    float side = aPivot.z >= 0.0 ? 1.0 : -1.0;
    vec3 st = stroke(phi);
    float sweep = st.x * (1.0 - up) * w;
    float lift = mix(st.y * w, 1.35 * w * w * w, up);
    vec3 d = rotY(rotX(p - aPivot, side * lift), side * sweep);
    n = rotY(rotX(n, side * lift), side * sweep);
    p = aPivot + d;
  } else if (anim == 3) {
    // SAIL: lowered, billowing, torn and flapping when battered, falls with the mast
    float f = aInst3.y, bel = aPivot.x, live = 1.0 - f;
    float low = clamp((aPivot.y - p.y) / 6.5, 0.0, 1.0);
    p.x -= bel * f;
    p.y = aPivot.y - (aPivot.y - p.y) * (1.0 - 0.9 * f);
    p.x += bel * (0.16 * sin(uTime * 1.3 + aInst1.z) + 0.06 * sin(uTime * 3.3 + p.z * 0.9 - p.y * 0.4)) * live;
    p.x += sin(uTime * 2.1 + p.z * 0.7 + p.y * 0.5) * 0.05 * live * low;
    float tear = clamp((wreck - 0.3) / 0.5, 0.0, 1.0) * low * low;
    p.x += tear * (0.7 * sin(uTime * 7.0 + p.z * 1.7 + aInst1.z) + 0.3 * sin(uTime * 11.0 + p.z * 3.1));
    p.z += tear * 0.3 * sin(uTime * 5.0 + p.y);
    if (abs(lean) > 0.001) { p = MAST_FOOT + rotX(p - MAST_FOOT, lean); n = rotX(n, lean); }
    vSail = wreck;
  } else if (anim == 4) {
    p.xz *= aInst3.x; p.y *= aInst3.y;          // RING: radius, height
  } else if (anim == 5 || anim == 15) {
    if (anim == 15) {                            // BANNER streaming aft and fluttering
      float dd = length(p.xz - aPivot.xz);
      p.z += sin(uTime * 7.0 - dd * 1.8 + aPivot.y) * 0.13 * dd;
      p.y += sin(uTime * 5.0 - dd * 1.3) * 0.05 * dd;
    }
    if (abs(lean) > 0.001 && (anim == 5 || aPivot.y > 9.0)) { p = MAST_FOOT + rotX(p - MAST_FOOT, lean); n = rotX(n, lean); }   // MAST topples
  } else if (anim == 6) {
    float a = sin(phi + aPivot.z * 3.0) * 0.9;   // SWIMMER arm: paddling / fist-shaking
    p = aPivot + rotX(p - aPivot, a);
    n = rotX(n, a);
  } else if (anim == 7 || anim == 8) {
    float a = sin(phi) * (anim == 8 ? 0.18 : 0.5);   // SHARK tail (7) and rear body (8) sweep
    p = aPivot + rotY(p - aPivot, a);
    n = rotY(n, a);
  } else if (anim == 10) {
    if (aInst3.z < 0.5) p = aPivot;              // swimmer's helmet horns (some only)
  } else if (anim == 11) {
    if (aInst3.y < 0.5) p = aPivot;              // swimmer's shield float (paddling away)
  } else if (anim == 13) {
    float a = -0.25 + 0.55 * max(0.0, sin(uTime * 2.4 + aPivot.x));   // JARL pumps his great axe
    p = aPivot + rotZ(p - aPivot, a);
    n = rotZ(n, a);
  } else if (anim == 14) {
    float a = 0.7 * pow(abs(sin(uTime * 4.0 + (aPivot.z > 0.0 ? 0.0 : 1.5708))), 3.0) - 0.15;   // DRUMMER
    p = aPivot + rotZ(p - aPivot, a);
    n = rotZ(n, a);
  } else if (anim == 16) {
    p.y *= 0.8 + 0.2 * sin(uTime * 5.0 + p.x * 2.5 + p.z);             // bow wave shimmer
  } else if (anim >= 20 && anim < 60) {
    // THROWER: weapon raised and pumping (a roar); on a throw event the arm hurls and the hand is empty for a moment
    bool wp = anim >= 40;
    float slot = float(wp ? anim - 40 : anim - 20);
    float side = aPivot.z >= 0.0 ? 1.0 : -1.0;
    float bit = mod(floor(aInst2.b / pow(2.0, slot) + 0.01), 2.0);
    float tau = aInst2.g;
    float idle = 0.12 + 0.22 * sin(uTime * 3.4 + aPivot.x * 1.7);
    float a = idle;
    bool thrown = false;
    if (shipInst && bit > 0.5 && tau >= 0.0 && tau < 1.3) {
      if (tau < 0.13) a = mix(1.1, -1.8, tau / 0.13);
      else if (tau < 0.5) a = mix(-1.8, -1.35, (tau - 0.13) / 0.37);
      else a = mix(-1.35, idle, smoothstep(0.5, 1.3, tau));
      thrown = tau > 0.04 && tau < 0.95;
    }
    vec3 d = rotX(p - aPivot, side * a);
    n = rotX(n, side * a);
    p = aPivot + ((wp && thrown) ? vec3(0.0) : d);
  }
  if (dmg > 1.0 && dmg < 2.5) {
    // BREAKING UP: bow and stern halves fold up about midships and drift apart
    float b = min(1.0, dmg - 1.0), sx = aPos.x >= 0.0 ? 1.0 : -1.0;
    p = rotZ(p, sx * b * 0.55) + vec3(sx * b * 1.8, 0.0, 0.0);
    n = rotZ(n, sx * b * 0.55);
  }
  vLocal = aPos;
  vDmg = (!crew && (anim == 0 || anim == 5)) ? wreck : 0.0;
  p *= aInst1.w;
  vec3 w = place(p) + aInst0.xyz;
  vWorld = w;
  vNormal = place(n);
  vColor = vec4(mix(aColor.rgb, aInst2.rgb, aInst2.a), aColor.a);
  gl_Position = uViewProj * vec4(w, 1.0);
}
`;

const FRAG = `#version 300 es
precision highp float;
in vec3 vWorld;
in vec3 vNormal;
in vec4 vColor;
in vec3 vLocal;
in float vDmg;
in float vSail;
out vec4 fragColor;
uniform vec3 uCamPos;
uniform vec3 uSunDir;
uniform float uExposure;

${SKY_GLSL}

vec3 acesR(vec3 x) {
  const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}
float hash3(vec3 q) { return fract(sin(dot(q, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }

const vec3 EXTINCT = vec3(0.62, 0.16, 0.30);
const vec3 WATER_IN = vec3(0.012, 0.055, 0.041);

void main() {
  if (vSail > 0.3) {
    // torn sail: ragged holes grow with damage
    vec3 q = vLocal * vec3(1.0, 1.1, 0.9);
    if (hash3(floor(q + 0.35 * sin(q.zxy * 2.3)) + 17.0) < (vSail - 0.3) * 0.62) discard;
  }
  vec3 base = vColor.rgb;
  vec3 col;
  if (vColor.a > 0.5) {
    col = base * 1.35;
  } else {
    if (vDmg > 0.05 && vLocal.y < 1.9 && vLocal.y > -0.3) {
      // holed planking: jagged dark holes ringed by splintered bare wood and a scorch
      vec2 q = vec2(vLocal.x * 0.8, vLocal.y * 1.6);
      vec2 fr = fract(q) - 0.5;
      float h = hash3(vec3(floor(q), vLocal.z > 0.0 ? 1.0 : -1.0));
      float lim = vDmg * 0.55;
      if (h < lim) {
        float rad = length(fr * vec2(1.0, 1.3));
        float jag = 0.16 + 0.16 * h / max(lim, 0.01) + 0.07 * sin(atan(fr.y, fr.x) * 7.0 + h * 40.0);
        if (rad < jag) base = vec3(0.012, 0.009, 0.007);
        else if (rad < jag + 0.09) base = vec3(0.44, 0.31, 0.17);
        else if (rad < jag + 0.2) base *= 0.5;
      }
    }
    vec3 N = normalize(vNormal);
    vec3 V = normalize(uCamPos - vWorld);
    if (dot(N, V) < 0.0) N = -N;
    float ndl = max(dot(N, uSunDir), 0.0);
    vec3 direct = base * (ndl * 0.85 + 0.15);
    vec3 ambient = base * skyColor(normalize(N + vec3(0.0, 0.35, 0.0)), uSunDir) * 0.55;
    col = direct * 0.55 + ambient;
    if (vWorld.y < 0.0) {
      float d = min(-vWorld.y, 3.0) * 2.0;
      vec3 t = exp(-EXTINCT * d);
      col = col * t + WATER_IN * (1.0 - t);
    }
  }
  fragColor = vec4(pow(acesR(col * uExposure), vec3(1.0 / 2.2)), 1.0);
}
`;

function buildBeacon() {
  const k = new Kit();
  for (let i = 0; i < 4; i++) {
    const a0 = (i / 4) * Math.PI * 2, a1 = ((i + 1) / 4) * Math.PI * 2;
    const p0 = [Math.cos(a0), 1.8, Math.sin(a0)], p1 = [Math.cos(a1), 1.8, Math.sin(a1)];
    k.tri([1, 1, 1], [0, 0, 0], p1, p0, 0, ZERO, 1);
    k.tri([1, 1, 1], [0, 2.2, 0], p0, p1, 0, ZERO, 1);
  }
  return k;
}

const blob = (color, rx, ry, rz, seg = 6, rings = 4, emissive = 0) => new Kit().add(color, (b) => b.ellipsoid(0, 0, 0, rx, ry, rz, seg, rings), 0, ZERO, emissive);

function buildRing() {
  const k = new Kit(), N = 40;
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1) / N) * Math.PI * 2;
    const p = (a, y) => [Math.cos(a), y, Math.sin(a)];
    k.quad([1, 1, 1], p(a0, 0), p(a1, 0), p(a1, 1), p(a0, 1), 4, ZERO, 1);
  }
  return k;
}

function buildRocket() {
  const k = new Kit();
  k.add([0.55, 0.56, 0.58], (b) => b.tube(-0.45, 0, 0, 0.35, 0, 0, 0.09, 0.09, 6, true, false));
  k.add([0.75, 0.10, 0.06], (b) => b.tube(0.35, 0, 0, 0.62, 0, 0, 0.09, 0.0, 6, false, false));
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    k.tri([0.75, 0.10, 0.06], [-0.45, c * 0.09, s * 0.09], [-0.2, c * 0.09, s * 0.09], [-0.5, c * 0.28, s * 0.28]);
  }
  k.add([1.0, 0.75, 0.25], (b) => b.ellipsoid(-0.62, 0, 0, 0.22, 0.1, 0.1, 6, 3), 0, ZERO, 1);
  return k;
}

function buildFlare() {
  const k = new Kit();
  k.add([1.0, 0.25, 0.12], (b) => b.ellipsoid(0, 0, 0, 0.26, 0.2, 0.2, 7, 4), 0, ZERO, 1);
  k.add([1.0, 0.85, 0.5], (b) => b.ellipsoid(-0.25, 0, 0, 0.2, 0.09, 0.09, 5, 3), 0, ZERO, 1);
  return k;
}

function buildTorpedo() {
  const k = new Kit();
  k.add([0.18, 0.2, 0.22], (b) => b.tube(-0.9, 0, 0, 0.7, 0, 0, 0.16, 0.16, 7, true, false));
  k.add([0.7, 0.62, 0.2], (b) => b.ellipsoid(0.7, 0, 0, 0.3, 0.16, 0.16, 7, 3));
  k.tri([0.2, 0.2, 0.22], [-0.9, 0, 0], [-1.1, 0.3, 0], [-1.1, -0.3, 0]).tri([0.2, 0.2, 0.22], [-0.9, 0, 0], [-1.1, 0, 0.3], [-1.1, 0, -0.3]);
  return k;
}

function buildArrow() {
  const k = new Kit();
  k.add([0.42, 0.30, 0.16], (b) => b.tube(-0.45, 0, 0, 0.45, 0, 0, 0.02, 0.02, 3, false, false));
  k.add(PAINT.metal, (b) => b.tube(0.45, 0, 0, 0.62, 0, 0, 0.05, 0.0, 4, true, false));
  k.tri([0.85, 0.85, 0.8], [-0.45, 0, 0], [-0.25, 0.08, 0], [-0.5, 0.08, 0]).tri([0.85, 0.85, 0.8], [-0.45, 0, 0], [-0.25, 0, 0.08], [-0.5, 0, 0.08]);
  return k;
}

function buildSpear() {
  const k = new Kit();
  k.add([0.40, 0.28, 0.14], (b) => b.tube(-1.0, 0, 0, 0.8, 0, 0, 0.035, 0.035, 4, true, false));
  k.add(PAINT.metal, (b) => b.tube(0.8, 0, 0, 1.2, 0, 0, 0.08, 0.0, 4, true, false));
  return k;
}

function buildAxe() {
  const k = new Kit();
  k.add([0.40, 0.28, 0.14], (b) => b.tube(-0.35, 0, 0, 0.4, 0, 0, 0.035, 0.035, 4, true, true));
  k.quad(PAINT.metal, [0.28, 0.03, 0.02], [0.28, 0.32, 0.02], [0.5, 0.36, 0.02], [0.5, -0.05, 0.02]);
  k.quad(PAINT.metal, [0.28, 0.03, -0.02], [0.5, -0.05, -0.02], [0.5, 0.36, -0.02], [0.28, 0.32, -0.02]);
  return k;
}

function buildFlash() {
  const k = new Kit();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    k.tri([1, 0.8, 0.3], [0, 0, 0], [0.3, c * 0.25 - s * 0.05, s * 0.25 + c * 0.05], [1.0, c * 0.5, s * 0.5], 0, ZERO, 1);
    k.tri([1, 0.8, 0.3], [0, 0, 0], [1.0, c * 0.5, s * 0.5], [0.3, c * 0.25 + s * 0.05, s * 0.25 - c * 0.05], 0, ZERO, 1);
  }
  return k;
}

// Debris (visual only): tumbling plank splinters, shields and oar pieces that float.
function buildSplinter() {
  const k = new Kit(), c = PAINT.plankB, bare = [0.44, 0.31, 0.17];
  k.quad(c, [-0.6, 0, -0.08], [0.3, 0, -0.08], [0.3, 0, 0.08], [-0.6, 0, 0.08]);
  k.tri(bare, [0.3, 0, -0.08], [0.62, 0, 0.03], [0.3, 0, 0.08]);
  k.quad(PAINT.plankA, [-0.6, -0.05, -0.08], [0.3, -0.05, -0.08], [0.3, -0.05, 0.08], [-0.6, -0.05, 0.08]);
  k.quad(bare, [-0.6, 0, 0.08], [0.3, 0, 0.08], [0.3, -0.05, 0.08], [-0.6, -0.05, 0.08]);
  k.tri(bare, [-0.6, 0, -0.08], [-0.75, 0, 0.0], [-0.6, 0, 0.08]);
  return k;
}
function buildShieldBit() { const k = new Kit(); shield(k, 0, 0, 0, 0.46, PAINT.shieldPairs[0], 1, 8, true, 0, ZERO, true); return k; }
function buildOarBit() {
  const k = new Kit();
  k.add(PAINT.oar, (b) => b.tube(-1.3, 0, 0, 0.8, 0, 0, 0.05, 0.05, 4, true, false));
  k.quad(PAINT.oarBlade, [0.8, 0, -0.1], [1.7, 0, -0.14], [1.7, 0, 0.14], [0.8, 0, 0.1]);
  return k;
}

function buildPlank() {
  const k = new Kit();
  k.box(PAINT.plankB, -0.9, -0.06, -0.17, 0.9, 0.06, 0.17);
  k.box(PAINT.plankA, -0.3, 0.06, -0.55, -0.1, 0.12, 0.45);
  return k;
}

// Low-poly shark: tapered body rings, grey back / pale belly, dorsal and pectoral
// fins, a two-lobed tail sweeping about its root (anim 7), rear body swaying (anim 8).
function buildShark() {
  const k = new Kit();
  const shade = (x, y) => (y > -0.02 ? PAINT.sharkTop : PAINT.sharkBelly);
  const R = [[1.55, 0.02], [1.35, 0.16], [1.0, 0.3], [0.5, 0.4], [0.0, 0.42], [-0.5, 0.36], [-1.0, 0.24], [-1.4, 0.12], [-1.62, 0.06]];
  const SEG = 8;
  const ring = (x, r) => Array.from({ length: SEG }, (_, j) => { const a = (j / SEG) * Math.PI * 2; return [x, Math.sin(a) * r * 0.85, Math.cos(a) * r]; });
  for (let i = 0; i < R.length - 1; i++) {
    const A = ring(R[i][0], R[i][1]), B = ring(R[i + 1][0], R[i + 1][1]);
    const anim = R[i + 1][0] < -0.4 ? 8 : 0;
    for (let j = 0; j < SEG; j++) {
      const j1 = (j + 1) % SEG, c = shade(0, (A[j][1] + A[j1][1]) / 2);
      k.quad(c, A[j], B[j], B[j1], A[j1], anim, [-0.3, 0, 0]);
    }
  }
  const T = PAINT.sharkTop;
  k.tri(T, [0.35, 0.3, 0], [-0.35, 0.28, 0], [-0.25, 1.05, 0]).tri(T, [0.35, 0.3, 0], [-0.25, 1.05, 0], [-0.35, 0.28, 0]);
  k.tri(T, [0.35, 0.3, 0.04], [-0.35, 0.28, 0.04], [-0.25, 1.05, 0]);
  for (const sd of [-1, 1]) k.tri(PAINT.sharkTop, [0.55, -0.18, sd * 0.3], [0.1, -0.2, sd * 0.32], [-0.1, -0.38, sd * 0.85]);
  const piv = [-1.55, 0, 0];
  k.tri(T, [-1.5, 0.02, 0], [-2.2, 0.75, 0], [-1.9, 0.02, 0], 7, piv).tri(T, [-1.5, 0.02, 0], [-1.9, 0.02, 0], [-2.2, 0.75, 0], 7, piv);
  k.tri(T, [-1.5, 0.0, 0], [-1.9, 0.0, 0], [-2.05, -0.5, 0], 7, piv).tri(T, [-1.5, 0.0, 0], [-2.05, -0.5, 0], [-1.9, 0.0, 0], 7, piv);
  k.add([0.02, 0.02, 0.02], (b) => { b.ellipsoid(1.1, 0.12, 0.2, 0.05, 0.05, 0.05, 4, 2); b.ellipsoid(1.1, 0.12, -0.2, 0.05, 0.05, 0.05, 4, 2); });
  return k;
}

function buildFin() {
  const k = new Kit(), T = PAINT.sharkTop;
  k.tri(T, [0.35, 0.3, 0], [-0.35, 0.28, 0], [-0.25, 1.05, 0]).tri(T, [0.35, 0.3, 0], [-0.25, 1.05, 0], [-0.35, 0.28, 0]);
  k.tri(T, [-1.5, 0.02, 0], [-2.2, 0.75, 0], [-1.9, 0.02, 0], 7, [-1.55, 0, 0]).tri(T, [-1.5, 0.02, 0], [-1.9, 0.02, 0], [-2.2, 0.75, 0], 7, [-1.55, 0, 0]);
  return k;
}

function buildCrate() {
  const k = new Kit();
  k.box(PAINT.crate, -0.5, -0.45, -0.5, 0.5, 0.45, 0.5);
  k.box(PAINT.band, -0.52, 0.12, -0.52, 0.52, 0.22, 0.52);
  k.box(PAINT.band, -0.52, -0.22, -0.52, 0.52, -0.12, 0.52);
  return k;
}

// ---------------------------------------------------------------------------
// FACTIONS (tr128). The faction swaps the MESH BEHIND EACH NAME, not the drawing code: a
// pirate run still adds 'ship' / 'shipJarl' / 'shipBoss' / 'shipMid' / 'shipFar' / 'sail'…,
// so RaidScene below, its LOD policy, its thrower-slot mapping and its tint table are all
// untouched and the Viking cast is built from exactly the same calls it always was.
// Only ONE faction's hulls are built per RaidActors, on raid entry - a Viking raid pays
// nothing at all for the pirates, and neither faction spends anything against buildCoast().
export const FOE_MESHES = {
  norse: () => ({
    ship: buildLongship('ship'), shipJarl: buildLongship('jarl'), shipBoss: buildLongship('boss'), shipMid: buildShipMid(), shipFar: buildShipFar(),
    sail: buildSail('ship'), sailJarl: buildSail('jarl'), sailBoss: buildSail('boss'), sailMid: buildSailMid(),
    swimmer: buildSwimmer(new Kit(), false), swimmerLo: buildSwimmer(new Kit(), true),
  }),
  pirate: () => ({
    ship: buildBrig('ship'), shipJarl: buildBrig('jarl'), shipBoss: buildBrig('boss'), shipMid: buildBrigMid(), shipFar: buildBrigFar(),
    sail: buildPirateSail('ship'), sailJarl: buildPirateSail('jarl'), sailBoss: buildPirateSail('boss'), sailMid: buildPirateSailMid(),
    swimmer: buildSwimmer(new Kit(), false, { headgear: 'scarf' }), swimmerLo: buildSwimmer(new Kit(), true, { headgear: 'scarf' }),
  }),
};

export class RaidActors {
  constructor(gl, foe = 'norse') {
    this.gl = gl;
    this.foe = FOE_MESHES[foe] ? foe : 'norse';
    this.prog = link(gl, VERT, FRAG, 'raidActors', ATTR);
    this.u = uniforms(gl, this.prog, ['uViewProj', 'uTime', 'uCamPos', 'uSunDir', 'uExposure']);
    this.types = {};
    const defs = {
      ...FOE_MESHES[this.foe](),
      beacon: buildBeacon(),
      foam: buildWakeChevron(), bowWave: buildBowWave(),
      plank: buildPlank(),
      splinter: buildSplinter(), shieldBit: buildShieldBit(), oarBit: buildOarBit(), shark: buildShark(), fin: buildFin(), crate: buildCrate(),
      ball: blob(PAINT.dark, 0.26, 0.26, 0.26, 8, 5), rocket: buildRocket(), flare: buildFlare(), torpedo: buildTorpedo(),
      arrow: buildArrow(), spear: buildSpear(), axe: buildAxe(),
      puff: blob([0.5, 0.5, 0.5], 1, 1, 1, 10, 6, 1), flame: blob([1.0, 0.45, 0.08], 0.5, 1.0, 0.5, 6, 4, 1), flash: buildFlash(),
      drop: blob(PAINT.white, 1, 1, 1, 5, 3), ring: buildRing(),
    };
    for (const name in defs) this.types[name] = this._upload(defs[name]);
    this.lastStats = { draws: 0, tris: 0, instances: 0 };
  }

  _upload(kit) {
    const gl = this.gl;
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const nv = kit.pos.length / 3;
    const data = new Float32Array(nv * VFLOATS);
    for (let i = 0; i < nv; i++) {
      const o = i * VFLOATS;
      data[o] = kit.pos[i * 3]; data[o + 1] = kit.pos[i * 3 + 1]; data[o + 2] = kit.pos[i * 3 + 2];
      data[o + 3] = kit.nrm[i * 3]; data[o + 4] = kit.nrm[i * 3 + 1]; data[o + 5] = kit.nrm[i * 3 + 2];
      data[o + 6] = kit.col[i * 4]; data[o + 7] = kit.col[i * 4 + 1]; data[o + 8] = kit.col[i * 4 + 2]; data[o + 9] = kit.col[i * 4 + 3];
      data[o + 10] = kit.anim[i];
      data[o + 11] = kit.piv[i * 3]; data[o + 12] = kit.piv[i * 3 + 1]; data[o + 13] = kit.piv[i * 3 + 2];
    }
    buffer(gl, gl.ARRAY_BUFFER, data);
    const S = VFLOATS * 4;
    gl.enableVertexAttribArray(ATTR.aPos); gl.vertexAttribPointer(ATTR.aPos, 3, gl.FLOAT, false, S, 0);
    gl.enableVertexAttribArray(ATTR.aNormal); gl.vertexAttribPointer(ATTR.aNormal, 3, gl.FLOAT, false, S, 12);
    gl.enableVertexAttribArray(ATTR.aColor); gl.vertexAttribPointer(ATTR.aColor, 4, gl.FLOAT, false, S, 24);
    gl.enableVertexAttribArray(ATTR.aAnim); gl.vertexAttribPointer(ATTR.aAnim, 1, gl.FLOAT, false, S, 40);
    gl.enableVertexAttribArray(ATTR.aPivot); gl.vertexAttribPointer(ATTR.aPivot, 3, gl.FLOAT, false, S, 44);
    const inst = new Float32Array(MAX_INST * INST_FLOATS);
    const ibo = buffer(gl, gl.ARRAY_BUFFER, inst, gl.DYNAMIC_DRAW);
    for (let j = 0; j < 4; j++) {
      const loc = ATTR.aInst0 + j;
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, INST_FLOATS * 4, j * 16);
      gl.vertexAttribDivisor(loc, 1);
    }
    const big = nv > 65535;
    buffer(gl, gl.ELEMENT_ARRAY_BUFFER, big ? new Uint32Array(kit.idx) : new Uint16Array(kit.idx));
    gl.bindVertexArray(null);
    return { vao, ibo, inst, n: 0, count: kit.idx.length, tris: kit.tris3, type: big ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT };
  }

  begin() { for (const k in this.types) this.types[k].n = 0; }

  // x, y, z, yaw, pitch, roll, phase, scale, tint [r,g,b,amount] | null, a3x (rate/radius), a3y (furl/height), a3z (oars up), a3w (damage)
  add(type, x, y, z, yaw, pitch = 0, roll = 0, phase = 0, scale = 1, tint = null, row = 0, furl = 0, oarsUp = 0, dmg = 0) {
    const t = this.types[type];
    if (t.n >= MAX_INST) return;
    const o = t.n * INST_FLOATS, a = t.inst;
    a[o] = x; a[o + 1] = y; a[o + 2] = z; a[o + 3] = yaw;
    a[o + 4] = pitch; a[o + 5] = roll; a[o + 6] = phase; a[o + 7] = scale;
    if (tint) { a[o + 8] = tint[0]; a[o + 9] = tint[1]; a[o + 10] = tint[2]; a[o + 11] = tint[3]; }
    else { a[o + 8] = 0; a[o + 9] = 0; a[o + 10] = 0; a[o + 11] = 0; }
    a[o + 12] = row; a[o + 13] = furl; a[o + 14] = oarsUp; a[o + 15] = dmg;
    t.n++;
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
    gl.depthMask(true);
    gl.disable(gl.CULL_FACE);
    let draws = 0, tris = 0, instances = 0;
    for (const name in this.types) {
      const t = this.types[name];
      if (!t.n) continue;
      gl.bindBuffer(gl.ARRAY_BUFFER, t.ibo);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, t.inst, 0, t.n * INST_FLOATS);
      gl.bindVertexArray(t.vao);
      gl.drawElementsInstanced(gl.TRIANGLES, t.count, t.type, 0, t.n);
      draws++; tris += t.tris * t.n; instances += t.n;
    }
    gl.bindVertexArray(null);
    this.lastStats = { draws, tris, instances };
  }

  meshTris() { const o = {}; for (const k in this.types) o[k] = this.types[k].tris; return o; }
}

// ---------------------------------------------------------------------------
// scene assembly from the game state + a visual-only particle system
// ---------------------------------------------------------------------------
const TINT = { amber: [1.0, 0.55, 0.06, 1], red: [1.0, 0.16, 0.10, 1], gold: [1.0, 0.80, 0.10, 1], white: [0.95, 0.97, 1.0, 1],
  cyan: [0.3, 0.95, 1.0, 1], smoke: [0.42, 0.42, 0.44, 1], dark: [0.22, 0.22, 0.23, 1], steam: [0.8, 0.82, 0.84, 1],
  orange: [1.0, 0.45, 0.06, 1], yellow: [1.0, 0.85, 0.2, 1], wood: [0.30, 0.18, 0.08, 1],
  ally: [0.36, 1.0, 0.62, 1] };                    // tr141: the relief fleet's beacon, nothing else is this colour
// tr141: an ALLIED hull at impostor range, tinted so the arrival reads from the horizon - which
// is where the beat happens. It is the same instance channel the jarl and flagship tints use, so
// the allies cost NO new mesh, NO new draw call and NO shader change: they are the corsairs'
// own hulls with a different tint and a different beacon.
const ALLY_FAR = [0.58, 0.96, 0.78, 0.42];
export const PICKUP_TINT = { rapid: [1.0, 0.5, 0.1, 1], triple: [0.95, 0.3, 0.95, 1], heavy: [1.0, 0.18, 0.12, 1], torpedo: [0.1, 0.9, 0.8, 1],
  turbo: [1.0, 0.9, 0.15, 1], shield: [0.3, 0.85, 1.0, 1], repair: [0.3, 1.0, 0.4, 1], x2: [1.0, 0.75, 0.1, 1], bait: [0.75, 0.45, 1.0, 1],
  douse: [0.32, 0.86, 1, 1], rebuild: [0.6, 0.95, 0.4, 1], water: [0.16, 0.55, 1, 1] };   // pier siege pickups (tr60)
const NEAR_LOD = 190, NEAR_MAX = 4, MID_LOD = 480, MID_MAX = 10, SHARK_LOD = 160, SHARK_MAX = 6, SWIM_NEAR = 95, SWIM_NEAR_MAX = 30;
const TRAIL_N = 9, TRAIL_DT = 0.55, MAX_PARTS = 600, SWIM_MAX = 80;

export class RaidScene {
  constructor() {
    this.sprites = null;
    this.trails = new Map(); this.parts = []; this.lastT = null; this.emitT = new Map(); this.rings = []; this.vis = new Map();
    this.slots = { ship: slotsOf('ship'), jarl: slotsOf('jarl'), boss: slotsOf('boss') };
  }

  reset() { this.trails.clear(); this.parts.length = 0; this.rings.length = 0; this.lastT = null; this.emitT.clear(); this.vis.clear(); }

  // visual-only per-ship state: mast topple, last throw, break-up and final-plunge effects
  _vis(id) { let v = this.vis.get(id); if (!v) { v = { mast: false, lean: 0, leanV: 0, side: 1, throws: null, throwT: -1e9, broke: false, gulp: false }; this.vis.set(id, v); } return v; }

  _p(type, x, y, z, vx, vy, vz, life, size, grow, tint, g = 9.81, spin = 0, float = false) {
    if (this.parts.length >= MAX_PARTS) return;
    this.parts.push({ type, x, y, z, vx, vy, vz, age: 0, life, size, grow, tint, g, yaw: Math.random() * 6.28, spin, float, landed: false });
  }

  // tumbling wreckage that lands and floats for a while (visual only; the rules' planks are separate)
  debris(x, y, z, n, spread, type = 'splinter') {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283, sp = (type === 'splinter' ? 3 : 1.5) + Math.random() * 6;
      const life = type === 'splinter' ? 2.5 + Math.random() * 2 : 7 + Math.random() * 4;
      this._p(type, x + (Math.random() - 0.5) * spread, y, z + (Math.random() - 0.5) * spread, Math.cos(a) * sp, 4 + Math.random() * 7, Math.sin(a) * sp, life,
        type === 'splinter' ? 0.7 + Math.random() * 0.9 : 1, 0, null, 9.81, (Math.random() - 0.5) * 16, true);
    }
  }

  splash(x, z, n, power = 1, y = 0) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283, r = Math.random();
      this._p('drop', x + Math.cos(a) * r, y + 0.2, z + Math.sin(a) * r, Math.cos(a) * (1 + 3 * r) * power, (4 + Math.random() * 6) * power, Math.sin(a) * (1 + 3 * r) * power, 0.8 + Math.random() * 0.5, 0.07 + Math.random() * 0.1 * power, 0.3, null);
    }
  }

  ring(x, z, r0, r1, life, tint, h = 0.5, y = 0.1) { if (this.rings.length < 40) this.rings.push({ x, z, y, r0, r1, life, age: 0, tint, h }); }

  boom(x, y, z, big = 1) {
    this._p('flash', x, y, z, 0, 0, 0, 0.12, 1.4 * big, 6, TINT.yellow, 0);
    const S = this.sprites, sk = S ? 1.8 : 1;   // tr62: sparks + fuller soft smoke when sprites are available
    if (S) for (let i = 0; i < 10 * big; i++) S.spawn(x, y, z, (Math.random() - 0.5) * 14, Math.random() * 9, (Math.random() - 0.5) * 14, 0.35 + Math.random() * 0.4, 0.08, [1, 0.82, 0.3], 1, { col1: [1, 0.3, 0.03], frame: 3, add: 1, heat: 1, g: 9.81, stretch: 0.045, fadeIn: 0 });
    for (let i = 0; i < 4 * big; i++) this._p('flame', x + (Math.random() - 0.5), y + Math.random() * 0.6, z + (Math.random() - 0.5), (Math.random() - 0.5) * 4, 2 + Math.random() * 3, (Math.random() - 0.5) * 4, 0.3 + Math.random() * 0.25, 0.45 * big, 1.2, Math.random() < 0.5 ? TINT.orange : TINT.yellow, -2);
    for (let i = 0; i < 4 * big; i++) this._p('puff', x + (Math.random() - 0.5) * 2, y + Math.random(), z + (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 3, 1.5 + Math.random() * 2, (Math.random() - 0.5) * 3, 0.9 + Math.random() * 0.5 * sk, 0.4 * big * sk, 1.0 * sk, TINT.smoke, -0.5);
    for (let i = 0; i < 6 * big; i++) this._p('drop', x, y + 0.5, z, (Math.random() - 0.5) * 12, 4 + Math.random() * 6, (Math.random() - 0.5) * 12, 1.1, 0.12, 0, TINT.wood);
  }

  // Visual reaction to a rules event (controller forwards every event here).
  onEvent(e, game) {
    const P = game.player;
    switch (e.type) {
      case 'fire': {
        const W = e.kind === 'torpedo' ? { muzzle: 2, y0: 0 } : game.T.weapons[P.craft] || game.T.weapons.efoil;
        const ch = Math.cos(e.heading), sh = Math.sin(e.heading), mx = e.x + ch * W.muzzle, mz = e.z + sh * W.muzzle;
        if (e.kind === 'torpedo') { this.splash(mx, mz, 10, 0.6); break; }
        const fwd = e.kind === 'ball' ? 1.0 : 1.6;     // start the flash and smoke clear of the chase camera
        this._p('flash', mx + ch * fwd, W.y0, mz + sh * fwd, ch * 6, 0, sh * 6, 0.08, e.kind === 'ball' ? 1.0 : 0.55, 3, TINT.yellow, 0);
        // Smoke rides forward WITH the craft (+ its own speed) and stays small and short-lived: at
        // 0.3 m x3 growth with no carry the boat drove into its own puffs and a solid white blob
        // filled the chase view on rapid/triple fire (merge fix 2026-09-17).
        const carry = Math.max(0, P.speed || 0);
        for (let i = 0; i < 2; i++) this._p('puff', mx + ch * (fwd + 1.5), W.y0, mz + sh * (fwd + 1.5), ch * (carry + 3 + Math.random() * 2) + (Math.random() - 0.5), 0.5 + Math.random(), sh * (carry + 3 + Math.random() * 2) + (Math.random() - 0.5), 0.3 + Math.random() * 0.2, e.kind === 'ball' ? 0.16 : 0.1, 1.0, TINT.steam, -0.3);
        break;
      }
      case 'gun': {
        // tr136 MUZZLE. A flash outboard along the gun's own normal, then two puffs of smoke.
        //
        // THE SMOKE IS CARRIED WITH THE SHIP. The rules put her velocity on the event (sx, sz)
        // and it is added to every puff, exactly as the player's own bow cannon does two cases
        // up: smoke left standing in the water behind a ship under way strings out into a line
        // of puffs she has already sailed out of, and at chase-camera height that line fills
        // the view. Puffs are also small, short-lived and grow slowly for the same reason.
        const sc = e.sc || 1, nx = e.nx, nz = e.nz;
        this._p('flash', e.x + nx * 0.7 * sc, e.y, e.z + nz * 0.7 * sc, nx * 7, 0.4, nz * 7, 0.075, 0.85 * sc, 3, TINT.yellow, 0);
        for (let i = 0; i < 2; i++) {
          const sp = 3.2 + Math.random() * 2.6;
          this._p('puff', e.x + nx * (1.0 + i * 0.7) * sc, e.y + 0.1 + Math.random() * 0.2, e.z + nz * (1.0 + i * 0.7) * sc,
            e.sx + nx * sp + (Math.random() - 0.5), 0.55 + Math.random() * 0.5, e.sz + nz * sp + (Math.random() - 0.5),
            0.45 + Math.random() * 0.3, 0.30 * sc, 1.5, TINT.smoke, -0.25);
        }
        break;
      }
      case 'struck': break;         // the hole itself is drawn by raid-pier.js on 'smash'
      case 'boom': this.boom(e.x, e.y, e.z, e.heavy ? 2 : 1); this.debris(e.x, e.y, e.z, e.heavy ? 8 : 4, 0.8); break;
      case 'throw': {
        // remember where the rules launched it so the nearest rail warrior on that side hurls it
        const s = game.ships.find((q) => q.id === e.ship);
        if (!s) break;
        const sc = s.L / L0, ch = Math.cos(s.heading), sh = Math.sin(s.heading), dx = e.x - s.x, dz = e.z - s.z, v = this._vis(s.id);
        if (v.throwT !== game.time) { v.throwT = game.time; v.throws = []; }
        v.throws.push([(dx * ch + dz * sh) / sc, -dx * sh + dz * ch >= 0 ? 1 : -1]);
        break;
      }
      case 'hit': if (e.how === 'ram') { this.splash(e.x, e.z, 18, 1.1); this.debris(e.x, 1, e.z, 12, 1.5); } break;
      case 'bump': this.splash(e.x, e.z, e.hard ? 14 : 6, e.hard ? 1 : 0.6); break;
      case 'splash': this.splash(e.x, e.z, e.size ? 16 : 7, e.size ? 1.2 : 0.7); this.ring(e.x, e.z, 0.3, e.size ? 4 : 2, 0.6, TINT.white, 0.25); break;
      case 'sink': {
        const big = e.kind === 'boss' ? 2 : 1;
        this.splash(e.x, e.z, e.kind === 'boss' ? 90 : 40, e.kind === 'boss' ? 2.2 : 1.5); this.ring(e.x, e.z, 2, e.kind === 'boss' ? 40 : 18, 1.4, TINT.white, 0.35);
        this.debris(e.x, 1.5, e.z, 14 * big, 6 * big); this.debris(e.x, 1.2, e.z, 5 * big, 8 * big, 'shieldBit'); this.debris(e.x, 1.2, e.z, 3 * big, 8 * big, 'oarBit');
        break;
      }
      case 'hurt': this.splash(P.x, P.z, e.heavy ? 26 : 10, e.heavy ? 1.3 : 0.8); break;
      case 'deflect': this.ring(P.x, P.z, 2, 6, 0.4, TINT.cyan, 0.15, 1.0); break;
      case 'pickup': this.ring(e.x, e.z, 1, 9, 0.7, PICKUP_TINT[e.kind] || TINT.gold, 0.35); this._p('flash', e.x, 1.2, e.z, 0, 0, 0, 0.18, 2.2, 3, PICKUP_TINT[e.kind] || TINT.gold, 0); break;
      case 'lunge': this.splash(e.x, e.z, 24, 1.3); break;
      case 'sharkHit': this.splash(e.x, e.z, 30, 1.5); this.ring(e.x, e.z, 1, 8, 0.6, TINT.white, 0.6); break;
      case 'sharkShot': this.splash(e.x, e.z, 34, 1.4); this.ring(e.x, e.z, 1, 7, 0.8, TINT.white, 0.5); break;
      case 'bossSunk': this.splash(e.x, e.z, 120, 2.6); this.ring(e.x, e.z, 4, 70, 2.4, TINT.gold, 0.5); break;
      case 'landed': break;
    }
  }

  _every(key, t, gap) { const l = this.emitT.get(key); if (l !== undefined && t - l < gap && t >= l) return false; this.emitT.set(key, t); return true; }

  fill(actors, game, sim, pose, cam) {
    const sea = sim.sea, t = sim.time;
    const dt = this.lastT === null ? 0 : Math.max(0, Math.min(0.1, t - this.lastT));
    if (this.lastT !== null && (t < this.lastT || t - this.lastT > 0.5)) { this.parts.length = 0; this.rings.length = 0; this.emitT.clear(); }
    this.lastT = t;
    const cx = cam ? cam.x : pose.x, cz = cam ? cam.z : pose.z;
    const H = (x, z) => sea.sample(x, z, t, 0, 3).height;
    actors.begin();
    const seen = new Set();

    // ---- longships ----
    // LOD: the boss (inside 450 m) and the NEAR_MAX nearest inside NEAR_LOD get the full hull, crew and
    // sail; the next MID_MAX inside MID_LOD the mid hull and sail; the rest the impostor-level shipFar.
    const byDist = game.ships.map((s) => [Math.hypot(s.x - cx, s.z - cz), s]).sort((a, b) => a[0] - b[0]);
    let nNear = 0, nMid = 0;
    for (const [dist, s] of byDist) {
      seen.add(s.id);
      const sc = s.L / L0, ch = Math.cos(s.heading), sh = Math.sin(s.heading), half = 0.4 * s.L;
      const hb = H(s.x + ch * half, s.z + sh * half), hs = H(s.x - ch * half, s.z - sh * half);
      const c = sea.sample(s.x, s.z, t, 0, 3);
      const landed = s.state === 'landed', sinking = s.state === 'sinking';
      // Beach-grounding cues only; a ship MOORED at the pier (siege, tr60) floats level.
      const grounded = landed && !s.moored;
      let y = (hb + hs + 2 * c.height) / 4 + (grounded ? 0.2 : 0);
      let pitch = Math.atan2(hb - hs, 2 * half) * 0.8 + (grounded ? 0.04 : 0);
      let roll = (-c.nx * sh + c.nz * ch) * 0.5;
      const since = game.time - s.hitT;
      if (since >= 0 && since < 0.35) roll += 0.1 * Math.sin(since * 40) * (1 - since / 0.35);
      let dmg = 1 - Math.max(0, s.hp) / s.maxHp, row = 0, furl = 0, up = 0;
      const v = this._vis(s.id);
      if (s.state === 'rowing') { row = 2.3 * Math.max(0.6, Math.min(1.4, s.speed / Math.max(0.1, s.cruise))); up = s.spin ? Math.min(1, Math.abs(s.spin)) : 0; furl = dmg > 0.66 ? 0.3 : 0; }
      else if (landed) { furl = 1; up = 1; }
      else if (sinking) {
        const f = Math.min(1, s.stateT / game.T.sinkSec), mode = s.id % 3;
        furl = 0.5; up = 1;
        if (mode === 0) {          // breaks in two amidships
          dmg = 1 + Math.min(1, s.stateT / (game.T.sinkSec * 0.6));
          y -= Math.pow(f, 1.7) * 7 * sc; roll += s.sinkSide * Math.min(1, s.stateT / 1.2) * 0.45;
          if (!v.broke && s.stateT > 0.25 && dist < 350) { v.broke = true; this.debris(s.x, y + 1.2 * sc, s.z, 16, 2 * sc, 'splinter'); this.splash(s.x, s.z, 24, 1.4); }
        } else {                   // goes down whole, stern-first (1) or bow-first (2), the other end rearing up
          const sg = mode === 1 ? 1 : -1;
          dmg = 3;
          pitch += sg * Math.min(1, s.stateT / 1.6) * (0.62 - 0.2 * f);
          y -= Math.pow(f, 1.45) * 9.5 * sc;
          roll += s.sinkSide * Math.min(1, s.stateT / 2) * 0.18;
          if (dist < 350 && this._every('rear' + s.id, t, 0.2) && f < 0.8) this.splash(s.x - ch * sg * 0.4 * s.L, s.z - sh * sg * 0.4 * s.L, 4, 1.0);
        }
        if (dist < 350 && this._every('sink' + s.id, t, 0.12)) this.splash(s.x + (Math.random() - 0.5) * s.L * 0.6, s.z + (Math.random() - 0.5) * 3, 5, 0.8);
        if (!v.gulp && f > 0.8 && dist < 350) { v.gulp = true; this.splash(s.x, s.z, 40, 1.8); this.ring(s.x, s.z, 1.5, 12 * sc, 1.3, TINT.white, 0.45); this.debris(s.x, 0.5, s.z, 6, 0.3 * s.L, 'shieldBit'); }
      }
      // the mast breaks at two-thirds damage and topples onto the rail (further as she sinks)
      const full = dmg >= 1 ? 1 : dmg;
      if (!v.mast && full > 0.66 && !landed) {
        v.mast = true; v.lean = 0.05; v.leanV = 0.6; v.side = Math.random() < 0.5 ? 1 : -1;
        if (dist < 350) this.debris(s.x + ch * 0.3 * sc, y + 1.5 * sc, s.z + sh * 0.3 * sc, 8, 0.6, 'splinter');
      }
      if (v.mast) {
        v.leanV += (4.5 * Math.sin(Math.min(1.3, v.lean)) + 0.5) * dt;
        v.lean += v.leanV * dt;
        const stop = sinking ? 1.45 : 1.1;
        if (v.lean > stop) { v.lean = stop; v.leanV = Math.abs(v.leanV) > 0.3 ? -v.leanV * 0.25 : 0; }
      }
      // thrower slots: which warriors hurled at the last 'throw' event, and how long ago
      const lod = (s.kind === 'boss' && dist < 450) || (nNear < NEAR_MAX && dist < NEAR_LOD) ? 'near' : nMid < MID_MAX && dist < MID_LOD ? 'mid' : 'far';
      if (lod === 'near') nNear++; else if (lod === 'mid') nMid++;
      const kindL = lod === 'near' ? s.kind : 'ship';
      let tau = 99, mask = 0;
      if (v.throws && !sinking) {
        tau = game.time - v.throwT;
        if (tau < 0 || tau > 1.3) tau = 99;
        else {
          const slots = this.slots[kindL] || this.slots.ship;
          for (const [u, side] of v.throws) {
            let best = -1, bd = 1e9;
            slots.forEach((sl, i) => { const d = Math.abs(sl.x - u); if (sl.side === side && d < bd) { bd = d; best = i; } });
            if (best >= 0) mask |= 1 << best;
          }
        }
      }
      const shipState = [v.mast ? v.lean * v.side : 0, tau, mask, 0];
      const bodyType = lod === 'near' ? (s.kind === 'boss' ? 'shipBoss' : s.kind === 'jarl' ? 'shipJarl' : 'ship') : lod === 'mid' ? 'shipMid' : 'shipFar';
      const farTint = s.ally ? ALLY_FAR : s.kind === 'boss' ? [0.9, 0.62, 0.1, 0.45] : s.kind === 'jarl' ? [0.1, 0.18, 0.5, 0.4] : null;
      actors.add(bodyType, s.x, y, s.z, s.heading, pitch, roll, s.id * 1.7, sc, lod === 'far' && farTint ? farTint : shipState, row, furl, up, dmg);
      if (lod === 'near') actors.add(s.kind === 'boss' ? 'sailBoss' : s.kind === 'jarl' ? 'sailJarl' : 'sail', s.x, y, s.z, s.heading, pitch, roll, s.id * 1.7, sc, shipState, 0, furl, 0, dmg);
      else if (lod === 'mid') actors.add('sailMid', s.x, y, s.z, s.heading, pitch, roll, s.id * 1.7, sc, farTint || shipState, 0, furl, 0, dmg);
      // cartoon fire and smoke from a battered hull
      if (!sinking && (!landed || s.moored) && dmg > 0.3 && dist < 320) {
        if (this._every('smk' + s.id, t, dmg > 0.66 ? 0.07 : 0.14)) this._p('puff', s.x + (Math.random() - 0.5) * s.L * 0.4, y + 1.2 * sc, s.z + (Math.random() - 0.5) * 2 * sc, (Math.random() - 0.5) * 0.6, 2.2 + Math.random(), (Math.random() - 0.5) * 0.6, 1.6, 0.25 * sc, 2.6, dmg > 0.66 ? TINT.smoke : TINT.steam, -0.3);
        if (dmg > 0.6 && this._every('fir' + s.id, t, 0.07)) this._p('flame', s.x + (Math.random() - 0.5) * s.L * 0.35, y + 1.1 * sc, s.z + (Math.random() - 0.5) * 1.5 * sc, 0, 1.5 + Math.random(), 0, 0.45, 0.55 * sc, 0.8, Math.random() < 0.5 ? TINT.orange : TINT.yellow, -1);
      }
      // tr141: an ALLY always carries her own beacon and it is never red or gold. Without this
      // she would fall through the corsair rules below and an allied jarl would be marked in
      // exactly the colour the game uses for "this one is about to moor and burn your pier".
      if (s.ally) {
        if (s.state === 'rowing') actors.add('beacon', s.x, y + 11.4 * sc + 1.2 + 0.4 * Math.sin(t * 3 + s.id), s.z, t * 0.9, 0, 0, 0,
          (s.kind === 'boss' ? 2.2 : 1.15) * Math.min(5, Math.max(1, dist / 70)), TINT.ally);
      } else if (s.state === 'rowing' && (s.kind !== 'ship' || s.ttb < game.T.landingFlexSec)) {
        const tint = s.ttb < game.T.landingFlexSec ? TINT.red : TINT.gold;
        actors.add('beacon', s.x, y + 11.4 * sc + 1.2 + 0.4 * Math.sin(t * 3 + s.id), s.z, t * 0.9, 0, 0, 0, (s.kind === 'boss' ? 2.2 : 1) * Math.min(5, Math.max(1, dist / 70)), tint);
      }
      // foam trail + bow wave
      let tr = this.trails.get(s.id);
      if (!tr) { tr = { pts: [], last: -1e9 }; this.trails.set(s.id, tr); }
      if (t < tr.last) { tr.pts.length = 0; tr.last = -1e9; }
      const moving = s.speed > 0.8 && s.state === 'rowing';
      if (moving && t - tr.last >= TRAIL_DT) {
        tr.pts.unshift({ x: s.x - ch * half * 1.05, z: s.z - sh * half * 1.05, yaw: s.heading, t, k: sc * Math.min(1.4, s.speed / 3.5) });
        if (tr.pts.length > TRAIL_N) tr.pts.length = TRAIL_N;
        tr.last = t;
      }
      if (dist > 420) continue;
      for (const q of tr.pts) {
        const age = t - q.t;
        if (age > TRAIL_N * TRAIL_DT + 1) continue;
        const k = q.k * (1.0 + age * 0.45) * Math.max(0.2, 1 - age / (TRAIL_N * TRAIL_DT + 1));
        actors.add('foam', q.x, H(q.x, q.z) + 0.03, q.z, q.yaw, 0, 0, 0, k * 1.6);
      }
      if (moving && dist < 320) {
        const bx = s.x + ch * 7.9 * sc, bz = s.z + sh * 7.9 * sc;
        actors.add('bowWave', bx, H(bx, bz) + 0.02, bz, s.heading, 0, 0, 0, sc * Math.min(1.5, 0.45 + s.speed / 5));
      }
    }
    for (const id of this.trails.keys()) if (!seen.has(id)) this.trails.delete(id);
    for (const id of this.vis.keys()) if (!seen.has(id)) this.vis.delete(id);

    // ---- wreckage and people in the water ----
    for (const p of game.wreck) {
      if (Math.hypot(p.x - cx, p.z - cz) > 380) continue;
      actors.add('plank', p.x, H(p.x, p.z) + 0.02, p.z, p.yaw, 0, 0.05 * Math.sin(t * 1.3 + p.id), 0, p.size);
    }
    let nSwim = 0, nSwimNear = 0;
    for (let i = game.swimmers.length - 1; i >= 0; i--) {          // newest first; at most SWIM_MAX drawn
      const w = game.swimmers[i];
      const d = Math.hypot(w.x - cx, w.z - cz);
      if (d > 300) continue;
      if (++nSwim > SWIM_MAX) break;
      let y = H(w.x, w.z) - 0.12 + 0.06 * Math.sin(t * 3 + w.phase);
      if (w.state === 'thrown') y += 1.6 * Math.sin(Math.PI * Math.min(1, w.stateT / 0.7));
      const panic = w.panicT > 0;
      const face = w.state === 'bob' || w.state === 'grab' ? Math.atan2(pose.z - w.z, pose.x - w.x) : Math.atan2(w.vz || (w.state === 'swim' ? 1 : 0), w.vx || 0.01);
      const yaw = panic ? Math.atan2(w.pv, w.pu) : face;
      const rate = panic ? 13 : w.state === 'grab' ? 2 : w.state === 'bob' ? 7 : 5;
      const shrink = w.age > 60 ? Math.max(0.05, 1 - (w.age - 60) / 10) : 1;
      const nearSwim = d < SWIM_NEAR && ++nSwimNear <= SWIM_NEAR_MAX;
      actors.add(nearSwim ? 'swimmer' : 'swimmerLo', w.x, y, w.z, yaw, w.state === 'swim' ? -0.35 : 0, 0.15 * Math.sin(t * 2 + w.phase), w.phase, shrink, null, rate, w.state === 'swim' ? 1 : 0, w.id % 3 === 0 ? 1 : 0);
      if ((panic || w.state === 'thrown') && d < 200 && this._every('sw' + w.id, t, panic ? 0.1 : 0.3)) this.splash(w.x, w.z, 2, 0.35);
    }

    // ---- sharks ----
    const S = game.T.shark;
    const sd = game.sharks.map((k) => [Math.hypot(k.x - cx, k.z - cz), k]).sort((a, b) => a[0] - b[0]);
    sd.forEach(([d, k], i) => {
      if (d > 500) return;
      let y = -0.55, pitch = 0, roll = 0, rate = 5;
      switch (k.state) {
        case 'stalk': rate = 9; break;
        case 'gather': case 'bait': rate = 8; break;
        case 'tell': y = -0.42; rate = 16; roll = 0.12 * Math.sin(t * 12); break;
        case 'lunge': { const f = Math.min(1, k.stateT / S.lungeSec); y = -0.4 + 1.2 * Math.sin(Math.PI * f); pitch = 0.4 * Math.cos(Math.PI * f); rate = 18; break; }
        case 'recover': y = -0.55 - Math.min(2.5, k.stateT * 1.4); rate = 6; break;
        case 'flee': y = k.stateT < 0.8 ? -0.15 : -0.6 - Math.min(2, (k.stateT - 0.8) * 1.2); roll = k.stateT < 0.8 ? 0.7 * Math.sin(k.stateT * 30) : 0; rate = 20; break;
      }
      const hy = H(k.x, k.z);
      const full = i < SHARK_MAX && d < SHARK_LOD;
      actors.add(full ? 'shark' : 'fin', k.x, hy + y, k.z, k.heading, pitch, roll, k.id, 1.6, null, rate);
      if (d < 250) {
        if (k.state === 'tell' && this._every('tell' + k.id, t, 0.06)) { this.splash(k.x + Math.cos(k.heading) * 1.5, k.z + Math.sin(k.heading) * 1.5, 3, 0.7); if (this._every('tr' + k.id, t, 0.35)) this.ring(k.x, k.z, 1, 6, 0.5, TINT.white, 0.3); }
        if ((k.state === 'lunge' || (k.state === 'flee' && k.stateT < 0.8)) && this._every('ln' + k.id, t, 0.05)) this.splash(k.x, k.z, 3, 0.9);
        if ((k.state === 'stalk' || k.state === 'gather') && this._every('wk' + k.id, t, 0.25)) this.splash(k.x - Math.cos(k.heading) * 0.8, k.z - Math.sin(k.heading) * 0.8, 1, 0.3);
      }
    });

    // ---- projectiles ----
    for (const q of game.shots) {
      if (Math.hypot(q.x - cx, q.z - cz) > 450) continue;
      const hsp = Math.hypot(q.vx, q.vz), yaw = Math.atan2(q.vz, q.vx), pitch = Math.atan2(q.vy, hsp);
      const y = q.kind === 'torpedo' ? H(q.x, q.z) - 0.1 : q.y;
      // cartoon scale: projectiles are drawn 2-3x life size so they read at arcade distances
      actors.add(q.kind, q.x, y, q.z, yaw, pitch, 0, 0, (q.kind === 'flare' ? 3.0 : q.kind === 'torpedo' ? 1.6 : q.kind === 'ball' ? 1.5 : 2.3) * (q.heavy ? 1.3 : 1));
      const dq = Math.hypot(q.x - pose.x, q.z - pose.z);
      if ((q.kind === 'rocket' || q.kind === 'flare') && dq > 5) { if (this._every('tr' + q.id, t, 0.035)) this._p('puff', q.x - q.vx * 0.02, q.y, q.z - q.vz * 0.02, 0, 0.3, 0, 0.7, 0.22, 2.4, TINT.steam, 0); }
      else if (q.kind === 'torpedo') { if (this._every('tp' + q.id, t, 0.05)) this._p('drop', q.x, H(q.x, q.z) + 0.1, q.z, (Math.random() - 0.5) * 2, 1.5, (Math.random() - 0.5) * 2, 0.6, 0.2, 0, null); }
      else if (q.heavy && dq > 8 && this._every('hv' + q.id, t, 0.05)) this._p('flame', q.x, q.y, q.z, 0, 0, 0, 0.25, 0.22, 0.5, TINT.orange, 0);
    }
    for (const m of game.missiles) {
      if (Math.hypot(m.x - cx, m.z - cz) > 350) continue;
      const hsp = Math.hypot(m.vx, m.vz), yaw = Math.atan2(m.vz, m.vx);
      const pitch = m.kind === 'axe' ? m.age * 14 : Math.atan2(m.vy, hsp);
      actors.add(m.kind, m.x, m.y, m.z, yaw, pitch, 0, 0, m.kind === 'arrow' ? 2.6 : 2.2);
    }

    // ---- power-ups, bait, shield ----
    for (const k of game.pickups) {
      if (Math.hypot(k.x - cx, k.z - cz) > 500) continue;
      const hy = H(k.x, k.z), tint = PICKUP_TINT[k.kind] || TINT.gold, blink = k.age > game.T.pickupLife - 4 && Math.sin(t * 14) > 0;
      actors.add('crate', k.x, hy + 0.35 + 0.12 * Math.sin(t * 2.5 + k.id), k.z, t * 0.8 + k.id, 0.08 * Math.sin(t * 1.7), 0, 0, 1.3);
      if (!blink) actors.add('beacon', k.x, hy + 1.8 + 0.3 * Math.sin(t * 3 + k.id), k.z, -t * 1.5, 0, 0, 0, 1.1, tint);
      actors.add('ring', k.x, hy + 0.05, k.z, 0, 0, 0, 0, 1, tint, 2.6 + 0.4 * Math.sin(t * 4), 0.35);
    }
    for (const b of game.baits) {
      const hy = H(b.x, b.z);
      actors.add('crate', b.x, hy + 0.25, b.z, t, 0, 0, 0, 0.7, PICKUP_TINT.bait);
      if (this._every('bt' + b.id, t, 0.2)) this.splash(b.x, b.z, 2, 0.4);
    }
    const craftR = pose.craft === 'efoil' ? 2.0 : 4.2;
    if (game.fx.shield > 0 && (game.fx.shield > 2 || Math.sin(t * 16) > 0)) {
      const hy = H(pose.x, pose.z);
      for (let i = 0; i < 3; i++) {      // three thin bands bobbing round the craft: a bubble you can see through
        const ph = t * 2.4 + i * 2.1;
        actors.add('ring', pose.x, hy + 0.15 + (0.9 + 0.8 * Math.sin(ph)) * (pose.craft === 'efoil' ? 1 : 0.7), pose.z, 0, 0, 0, 0, 1, TINT.cyan, craftR * (1 - 0.15 * Math.abs(Math.sin(ph))), 0.07);
      }
    }
    if (game.fx.turbo > 0 && this._every('turbo', t, 0.04)) {
      const ch = Math.cos(pose.heading), sh = Math.sin(pose.heading);
      this._p('drop', pose.x - ch * craftR, H(pose.x, pose.z) + 0.3, pose.z - sh * craftR, -ch * 6 + (Math.random() - 0.5) * 3, 3 + Math.random() * 3, -sh * 6 + (Math.random() - 0.5) * 3, 0.7, 0.25, 0, null);
    }

    // ---- particles and rings ----
    const out = [];
    for (const q of this.parts) {
      q.age += dt;
      if (q.age >= q.life) continue;
      q.vy -= q.g * dt;
      q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt;
      if (q.float && q.vy < 0) {
        const hy = H(q.x, q.z) + 0.04;
        if (q.y <= hy) { q.y = hy; q.vy = 0; q.landed = true; const k = Math.max(0, 1 - dt * 1.5); q.vx *= k; q.vz *= k; }
      }
      if (q.type === 'drop' && q.y < -0.5) continue;
      out.push(q);
      if (cam && (q.x - cam.x) ** 2 + (q.y - cam.y) ** 2 + (q.z - cam.z) ** 2 < 20) continue;   // never splat on the lens
      const f = q.age / q.life;
      const s = q.size * (1 + q.grow * f) * (q.type === 'flash' ? 1 - f * 0.5 : q.type === 'flame' ? 1 - f * 0.7 : 1);
      const S = this.sprites;   // tr62: soft camera-facing sprites instead of opaque blobs (set by raid-mode when the GL sprite system exists)
      if (S && (q.type === 'puff' || q.type === 'flame' || q.type === 'flash' || (q.type === 'drop' && !q.tint))) {
        if (q.type === 'puff') S.put(q.x, q.y, q.z, s * 1.35, q.tint, 0.8 * Math.min(1, q.age * 8) * (1 - f * f), { rot: q.yaw });
        else if (q.type === 'flame') S.put(q.x, q.y, q.z, s * 1.5, q.tint, 0.95 * (1 - f), { frame: 1, add: 0.8, heat: 1 });
        else if (q.type === 'flash') S.put(q.x, q.y, q.z, s * 1.8, q.tint, 1 - f, { frame: 1, add: 1, heat: 1 });
        else S.put(q.x, q.y, q.z, Math.max(0.08, s * 1.1), [0.9, 0.95, 1], 0.85 * (1 - f * f), { frame: 3, vx: q.vx, vy: q.vy, vz: q.vz, stretch: 0.04 });
        continue;
      }
      if (q.float) {
        const fade = Math.min(1, (q.life - q.age) / 0.8);
        actors.add(q.type, q.x, q.y, q.z, q.yaw, q.landed ? 0.06 * Math.sin(t * 1.7 + q.yaw) : q.age * q.spin, q.landed ? 0.06 * Math.sin(t * 1.3 + q.yaw * 2) : q.age * q.spin * 0.6, 0, s * fade, q.tint);
      } else actors.add(q.type, q.x, q.y, q.z, q.yaw, 0, 0, 0, s, q.tint);
    }
    this.parts = out;
    this.rings = this.rings.filter((r) => (r.age += dt) < r.life);
    for (const r of this.rings) {
      const f = r.age / r.life;
      actors.add('ring', r.x, H(r.x, r.z) + r.y - f * r.h * 0.5, r.z, 0, 0, 0, 0, 1, r.tint, r.r0 + (r.r1 - r.r0) * Math.sqrt(f), r.h * (1 - f));
    }
  }
}
