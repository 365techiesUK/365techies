// GL for the driveable boats (tmp-tr41; looks, wake and spray rebuilt tmp-tr51):
// hull + driver meshes, a foam wake laid on the live sea surface, and a spray
// particle pool.
//
// The hull and figure are drawn with the EFOIL CRAFT PROGRAM itself - the
// CraftRenderer's already-linked program, uniform locations and _upload() - so a
// boat is lit, shadowed, dithered and absorbed underwater by exactly the shader
// the board and rider use. No craft shader source is copied or changed.
// Only the foam and spray, which are translucent, get two small programs of
// their own below.
//
// Nothing is drawn unless a boat is selected: the renderer hook reads
// this.active, which is false for the eFoil, so the default frame is the eFoil
// frame. (The meshes are built and uploaded lazily on the first boat draw.)
//
// WAKE (tmp-tr51). A ring buffer of samples dropped every 0.05 s (8.5 s kept),
// each fixed in the world where it was emitted, draws five strips:
//   propwash / jet trail  white turbulent centre strip from the transom, widening
//                         and fading over ~4.5 s (strength = throttle x flow)
//   2 hull-wash lines     the white water off the chines, ~5 deg spread, 3.5 s
//   2 Kelvin arms         the diverging crest lines at the Kelvin half-angle
//                         19.47 deg: lateral offset = age x U_emit x tan(19.47);
//                         they start near the bow shoulder in displacement and
//                         move to the transom as the hull gets on the plane,
//                         strongest at the hump, fading over 8 s
// Heights: one sea sample per sample for the centre strips and one per arm
// (3 x 170 = 510 per frame max). Foam is textured in WORLD xz so it stays put.
//
// SPRAY. A pool of 1600 point sprites, five emitters, rates per second so it is
// frame-rate independent, max 160 spawned per frame:
//   bow sheets     both sides at the wetted forward contact, rises with speed
//   turn spray     thrown OUTBOARD from the outer chine in proportion to lateral g
//   propwash boil  (RIB) at the propeller, with throttle
//   rooster tail   (PWC) from the nozzle, up and back, with throttle and speed
//   slams          a burst on landing from air and on hard wave impacts (hull
//                  vertical speed vs the local sea surface)
// Nothing is emitted when stopped with the throttle closed.
//
// ⚠️ SHADER SOURCES ARE TEMPLATE LITERALS: a backtick inside one ends the string
// and kills the page even though node --check passes.

import { link, uniforms, buffer } from './core.js';
// >>> ENVREF  The craft shader's lighting block, IMPORTED and not re-typed -
// see the note above LIVERY_FRAG's own body. boats.js -> craft.js already
// exists on the line below and craft.js imports nothing from here, so this
// adds no module edge and cannot close the cycle shaders.js warns about.
import { ENV_UNIFORM, ENV_CONST, ENV_LIGHT } from './craft.js';
// <<< ENVREF
import { RIDER_PAINT, OVERCAST } from './craft.js';
import { ribParts, pwcParts, RIB_FX, PWC_FX } from './boat-models.js';
import { pwcBones, PWC_BONES } from './boat-pwc.js';
import { skinPart } from './boat-rider.js';
// >>> RIDERSKIN
// A SECOND import from boat-models.js rather than a widened first one, so the
// existing line merges untouched. ribBones is the speedboat's half of the same
// rig the PWC has always had.
import { ribBones, RIB_BONES } from './boat-models.js';
// <<< RIDERSKIN
import { SKY_GLSL } from './shaders.js';
import { SHADOW_GLSL, ATTRIBS } from './shadow.js';

// >>> SPRAY
// DEBUG SWITCHES for the spray pass, read ONCE at module evaluation.
//
// Compile-time, empty-string-when-absent: with no ?bdbg= in the URL the GLSL
// and the emitter constants emitted below are byte-identical to having no
// switch here at all, so a clean build cannot be a debug build by accident.
//
//   ?bdbg=spraymask   every spray fragment opaque magenta - the COVERAGE
//                     instrument. The corpus cannot see the craft (see the
//                     contract's section 3), so screen coverage measured this
//                     way is the only number this work has.
//   ?bdbg=oldspray    the emitter and sprite constants as they stood before
//                     2026-09-20, VERBATIM - the ablation. Not recomputed
//                     from the new ones: a reconstruction is a second
//                     implementation, not an ablation.
const BDBG = (() => {
  try { return new URLSearchParams(location.search).get('bdbg') || ''; }
  catch { return ''; }          // no location (a module test): no switches
})();
//   ?bdbg=oldmask     both of the above at once. ?bdbg= carries one value, and
//                     without this the coverage of the OLD spray could only be
//                     measured on a different tree - which is not an ablation.
const SPRAY_MASK = BDBG === 'spraymask' || BDBG === 'oldmask';
const SPRAY_OLD = BDBG === 'oldspray' || BDBG === 'oldmask';
//   ?bdbg=nospray     the spray draw skipped altogether. Coverage is not
//                     visibility: this is what the pass is WORTH in pixels.
const SPRAY_OFF = BDBG === 'nospray';
// ?cal= forces the OLD column as well. Belt and braces: the boat renderer is
// already unreachable on the calibration path - main.js ignores ?craft= when
// ?cal= is present, so craftHub.kind stays 'efoil', this.active stays false and
// draw() is never called (measured: craftKind efoil, boatsActive false,
// sprayCount 0 on ?cal=...&craft=jetski). ⚠️ WHOEVER ADDS A ?calcraft= MUST
// DELETE THIS LINE, or they will calibrate against a spray that does not ship.
const SPRAY_CAL = (() => {
  try { return new URLSearchParams(location.search).has('cal'); } catch { return false; }
})();
const SPRAY_LEGACY = SPRAY_OLD || SPRAY_CAL;

// EVERY number this pass moved, with the value that stood before it, in ONE
// table. The legacy column is the LITERAL previous value, never recomputed from
// the new one - a reconstruction in float is a second implementation, not an
// ablation. The R() call ORDER is identical in both columns (see the `Sq` flags
// below), so ?bdbg=oldspray reproduces the pre-2026-09-20 particle stream and
// not merely its statistics.
//
// WHY THESE NUMBERS. Measured first, on a frozen, hand-stepped sim at 63.3 mph:
// the spray was NOT missing and NOT thin. 158 sprites covered 128,361 px of a
// 1280x720 chase frame (14%) and moved it by mean 33 levels. It failed because
// ~150 sprites that GROW to 1.5-2.3 m are a handful of soft fog balls, not a
// droplet cloud: no grain, no plume, no dense root. So the pass trades SIZE and
// LIFETIME for COUNT - smaller, shorter-lived, more of them - which also buys
// back fill rate, because the old sprites were the expensive ones.
//
// Derived, and the line where derivation stops:
//  * Apex. A rooster tail on this 3.3-3.5 m class peaks about 2-3 m above the
//    water at full throttle. Ballistically v = sqrt(2 g h) gives 6.3 m/s for
//    2.0 m and 7.7 m/s for 3.0 m; the pool's own drag (vy *= exp(-0.6 dt)) takes
//    about 8% off the rise, so 5.0-8.6 m/s launches a 1.3-3.7 m spread of
//    trajectories. It was 3.2-6.4 m/s, i.e. 0.5-2.0 m, and measured 1.51 m.
//  * Plume length. The particle leaves the nozzle going aft at 2-4.5 m/s while
//    the hull runs on at 28.3 m/s, so it separates at ~31 m/s: 10 m astern in
//    0.32 s. Life 0.30 + 1.05 R^2 puts the bulk inside that 10 m (R^2 biases
//    short) and lets a thin tail reach ~40 m as mist. It was a flat 0.8-1.4 s,
//    which put EVERY particle out past 25 m, grown huge, right beside the chase
//    camera - which is exactly what the coverage mask showed.
//  * ⚠️ Count is NOT derived. Turning a pump mass flow into a sprite count needs
//    a droplet radius, and there is no source for one here. It comes from a
//    RENDERING requirement, stated as such: the dense core is ~10 m x 2.5 m seen
//    from the side, a 0.3 m sprite projects ~0.07 m2, and covering 25 m2 about
//    2.5 times over needs ~300 sprites in the core, which at a 0.32 s core life
//    is ~900/s. The shipped 1300/s is that, plus 400/s that is where it read -
//    and that last 400 is a judgement, not a calculation. Said plainly here so
//    nobody mistakes the whole number for a derived one.
//  * ⚠️ And there is NO photographic anchor. The owner's 6.1 GB library contains
//    no personal watercraft at all (REFERENCE-NOTES.md). This plume shape is
//    DERIVED, NOT OBSERVED, and nothing in it came from a commercial game or a
//    downloaded clip.
//
// Pool arithmetic is at SPRAY_N below - the pool is a RING and a rate rise can
// silently start cutting the oldest particles short. Read it before moving a rate.
const SX = SPRAY_LEGACY ? {
  bowRateJ: 90, bowRateR: 150, bowL0: 0.4, bowLR: 0.4, bowSq: false,
  bowSizeJ: 0.3, bowSizeR: 0.45, bowGrow: 2.0, bowAlpha: 0.55,
  turnRateJ: 360, turnRateR: 240, turnL0: 0.5, turnLR: 0.5, turnSq: false,
  turnSizeJ: 0.4, turnSizeR: 0.5, turnGrow: 2.2, turnAlpha: 0.6,
  propRate: 45, propSlow: 12, propL0: 0.5, propLR: 0.4, propSq: false,
  propSize: 0.3, propGrow: 1.0, propAlpha: 0.32,
  roostRate: 120, roostSlow: 25, roostUp: 3.2, roostUpR: 3.2,
  roostL0: 0.8, roostLR: 0.6, roostSq: false,
  roostSize: 0.28, roostGrow: 1.5, roostAlpha: 0.4,
  slamBurst: true, slamRateJ: 0, slamRateR: 0, slamTau: 0,
  slamNJ: 45, slamNR: 70, slamL0: 0.7, slamLR: 0.6, slamSq: false,
  slamSizeJ: 0.45, slamSizeR: 0.6, slamGrow: 2.4, slamAlpha: 0.7,
  turnUp: 3.0, slamUp: 3.5, fadePow: 0.7, fadeIn: 12, pool: 1600,
  cap: 160,
} : {
  bowRateJ: 320, bowRateR: 480, bowL0: 0.24, bowLR: 0.40, bowSq: true,
  bowSizeJ: 0.24, bowSizeR: 0.34, bowGrow: 0.85, bowAlpha: 0.58,
  turnRateJ: 2400, turnRateR: 1400, turnL0: 0.28, turnLR: 0.50, turnSq: true,
  turnSizeJ: 0.28, turnSizeR: 0.36, turnGrow: 0.95, turnAlpha: 0.60,
  propRate: 190, propSlow: 45, propL0: 0.32, propLR: 0.50, propSq: true,
  propSize: 0.24, propGrow: 0.75, propAlpha: 0.40,
  roostRate: 1300, roostSlow: 25, roostUp: 5.0, roostUpR: 3.6,
  roostL0: 0.28, roostLR: 0.72, roostSq: true,
  roostSize: 0.28, roostGrow: 0.70, roostAlpha: 0.62,
  slamBurst: false, slamRateJ: 3200, slamRateR: 4200, slamTau: 0.16,
  slamNJ: 0, slamNR: 0, slamL0: 0.42, slamLR: 0.75, slamSq: true,
  slamSizeJ: 0.30, slamSizeR: 0.38, slamGrow: 1.00, slamAlpha: 0.66,
  turnUp: 7.0, slamUp: 6.0, fadePow: 1.35, fadeIn: 45, pool: 2800,
  cap: 300,
};
// A life draw that consumes exactly ONE R() when Sq is false, so the legacy
// column's random stream is the original's, particle for particle.
const LIFE = (L0, LR, sq, R) => (sq ? L0 + LR * R() * R() : L0 + LR * R());
// <<< SPRAY
const FOAM_VERT = `#version 300 es
precision highp float;
in vec3 aPos;
in vec4 aAux;
uniform mat4 uViewProj;
out vec4 vAux;
out vec2 vXZ;
void main() {
  vAux = aAux;
  vXZ = aPos.xz;
  gl_Position = uViewProj * vec4(aPos, 1.0);
}
`;

const FOAM_FRAG = `#version 300 es
precision highp float;
in vec4 vAux;
in vec2 vXZ;
out vec4 fragColor;
uniform vec3 uFoam;
float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y);
}
void main() {
  // vAux: x across (-1..1, +1 outboard on the arms), y strength, z along (m), w kind
  float ax = abs(vAux.x);
  float n = vnoise(vXZ * 1.9) * 0.55 + vnoise(vXZ * 6.1) * 0.3 + vnoise(vXZ * 17.0) * 0.15;
  float a;
  if (vAux.w < 0.5) {
    float edge = 1.0 - smoothstep(0.2 + 0.35 * n, 1.0, ax);
    float churn = smoothstep(0.42 - 0.35 * vAux.y, 0.85, n + 0.22 * (1.0 - ax));
    a = vAux.y * edge * mix(churn, 1.0, 0.3 * vAux.y);
  } else if (vAux.w < 1.5) {
    float edge = 1.0 - smoothstep(0.15, 1.0, ax);
    a = vAux.y * edge * smoothstep(0.45, 0.85, n + 0.2 * vAux.y);
  } else {
    float s = vAux.x;
    float crest = exp(-pow((s - 0.25) / 0.5, 2.0)) + 0.3 * (1.0 - smoothstep(-1.0, 0.25, s));
    float streak = vnoise(vec2(vAux.z * 0.45, s * 2.5));
    a = min(1.0, vAux.y) * crest * smoothstep(0.2, 0.7, n * 0.65 + streak * 0.5);
  }
  if (a < 0.01) discard;
  fragColor = vec4(uFoam, clamp(a, 0.0, 0.93));
}
`;

const SPRAY_VERT = `#version 300 es
precision highp float;
in vec3 aPos;
in vec3 aAux;
uniform mat4 uViewProj;
uniform float uPx;
out float vA;
out float vSeed;
void main() {
  vec4 c = uViewProj * vec4(aPos, 1.0);
  gl_Position = c;
  vA = aAux.x;
  vSeed = aAux.z;
  gl_PointSize = clamp(aAux.y * uPx / max(c.w, 0.2), 1.0, 160.0);
}
`;

const SPRAY_FRAG = `#version 300 es
precision highp float;
in float vA;
in float vSeed;
out vec4 fragColor;
uniform vec3 uFoam;
void main() {
  vec2 d = gl_PointCoord * 2.0 - 1.0;
  float r = dot(d, d);
  if (r > 1.0) discard;
  float n = 0.5 + 0.25 * sin(d.x * 6.0 + vSeed * 3.1) * sin(d.y * 5.0 + vSeed * 1.7) + 0.25 * sin((d.x + d.y) * 9.0 + vSeed);
  // >>> SPRAY
  // The falloff, not the colour. uFoam is already the wake's own near-white
  // (measured [0.876, 0.905, 0.919] at sunDir.y 0.72, exposure 1.0) and a
  // scattering model on a cloud that bright could only darken it. What was
  // wrong is that (1.0 - r) is a smooth gradient from centre to rim, so a
  // sprite is a fog ball and forty of them are a haze. smoothstep(0.30, 1.0)
  // holds the inner 55% of the radius at full alpha and drops the rim fast,
  // so overlapping sprites build a solid mass with a broken edge. The
  // vertical ramp is deepened 0.86 -> 0.82 because a plume shadows its own
  // underside; it is screen-vertical, which is world-vertical for every
  // camera in this game (none of them roll).
  ${SPRAY_LEGACY
    ? 'float a = vA * (1.0 - r) * (0.55 + 0.45 * n);'
      + ' fragColor = vec4(uFoam * (0.86 + 0.14 * (1.0 - gl_PointCoord.y)), a);'
    : 'float a = vA * (1.0 - smoothstep(0.30, 1.0, r)) * (0.45 + 0.55 * n);'
      + ' fragColor = vec4(uFoam * (0.82 + 0.18 * (1.0 - gl_PointCoord.y)), a);'}
  ${SPRAY_MASK ? 'fragColor = vec4(1.0, 0.0, 1.0, 1.0);' : ''}
  // <<< SPRAY
}
`;

// ---------------------------------------------------------------------------
// THE LIVERY PASS (tr153) - the only textured draw on the player's craft.
//
// WHY A SECOND PROGRAM AND NOT A CHANGE TO THE CRAFT'S. Everything above is
// drawn with CraftRenderer's own program, whose vertex shader declares aPos and
// aNormal and nothing else. A UV attribute cannot be added to it without
// editing craft.js, which also drives the eFoil board, foil and rider and is
// the reference for 19 judged views. So the marks get a program of their own,
// here, and the craft program is not touched at all.
//
// The lighting below is a LINE-FOR-LINE COPY of craft.js's FRAG with exactly
// one change: uBaseColor is replaced by the texel, and the texel's alpha comes
// out as the fragment's alpha so the mark's edge blends instead of stair-
// stepping. Copied rather than imported for the same reason aces()/encode() and
// the dither are already duplicated in this tree - craft.js reads SKY_GLSL out
// of shaders.js inside a template literal at module-evaluation time, and a
// shader chunk exported back the other way is a cycle whose symptom is a blank
// screen with no error. If craft.js's lighting is ever edited, edit this too:
// the two must stay identical or a decal will not sit in its own hull's light.
//
// VERTEX FORMAT. This is the only VAO in the project at stride 32 - pos 3,
// normal 3, uv 2. _uploadUV builds it and asserts the UV count against the
// vertex count; every other boat part is still the stride-24 pos+normal buffer
// craft.js's _upload makes, and the two never share a VAO.
//
// ⚠️ SHADER SOURCES ARE TEMPLATE LITERALS: a backtick inside one ends the string
// and kills the page even though node --check passes.

// A VERBATIM COPY of craft.js's DITHER_GLSL, NOT an import - see the note in
// shaders.js for why importing a chunk back across those two files deadlocks.
const DITHER_GLSL = `
vec3 dither8(vec3 q, vec2 frag) {
  float b = fract(52.9829189 * fract(dot(frag, vec2(0.06711056, 0.00583715))));
  vec3 d = fract(b + vec3(0.0, 0.33333333, 0.66666667)) - 0.5;  // +-0.5 LSB
  return q + d * (1.0 / 255.0);
}
`;

// aPos/aNormal keep craft.js's locations so a livery VAO reads the same way any
// other boat VAO does; aUV takes slot 2, which no program that sees these VAOs
// uses for anything else.
const LIV_AT = { aPos: ATTRIBS.aPos, aNormal: ATTRIBS.aNormal, aUV: 2 };
const UV_STRIDE = 32;          // bytes: pos 3 + normal 3 + uv 2, all float32
const LIVERY_URL = 'assets/livery-365.png';
const LIVERY_UNIT = 5;         // 4 is the shadow map (shadow.js bind default)

const LIVERY_VERT = `#version 300 es
precision highp float;
in vec3 aPos;
in vec3 aNormal;
in vec2 aUV;
uniform mat4 uViewProj;
uniform mat4 uModel;
out vec3 vWorld;
out vec3 vNormal;
out vec2 vUV;
void main() {
  vec4 wp = uModel * vec4(aPos, 1.0);
  vWorld = wp.xyz;
  vNormal = mat3(uModel) * aNormal;
  vUV = aUV;
  gl_Position = uViewProj * wp;
}
`;

const LIVERY_FRAG = `#version 300 es
precision highp float;
in vec3 vWorld;
in vec3 vNormal;
in vec2 vUV;
out vec4 fragColor;

uniform vec3 uCamPos;
uniform vec3 uSunDir;
uniform float uRough;
uniform float uExposure;
uniform float uOvercast;
uniform sampler2D uLivery;
${ENV_UNIFORM}
${SKY_GLSL}
${SHADOW_GLSL}
${DITHER_GLSL}
${ENV_CONST}

vec3 aces(vec3 x) {
  const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}
vec3 encode(vec3 c) { return pow(aces(c), vec3(1.0 / 2.2)); }

const vec3 EXTINCT = vec3(0.62, 0.16, 0.30);
const vec3 WATER_IN = vec3(0.012, 0.055, 0.041);

void main() {
  // The atlas is sRGB on upload, so this is already linear - the same space
  // uBaseColor literals are written in.
  vec4 mark = texture(uLivery, vUV);
  // The patch is a quad grid; the mark inside it is a disc or a word. Outside
  // it there is nothing to draw and nothing to blend.
  if (mark.a < 0.004) discard;
  vec3 base = mark.rgb;

  vec3 N = normalize(vNormal);
  vec3 V = normalize(uCamPos - vWorld);
  if (dot(N, V) < 0.0) N = -N;
// >>> ENVREF
// This file's own standing rule was that the lighting here is a LINE-FOR-LINE
// COPY of craft.js's and that the two must be edited together or a decal will
// not sit in its own hull's light. A copy that must stay identical is a copy
// that eventually does not, so the block is now IMPORTED instead. craft.js
// names the albedo uBaseColor; here it comes off the livery atlas, and the one
// #define below binds the two rather than forking the block for one word.
#define uBaseColor base
${ENV_LIGHT}
#undef uBaseColor
// <<< ENVREF

  if (vWorld.y < 0.0) {
    float d = min(-vWorld.y, 3.0) * 2.0;
    vec3 t = exp(-EXTINCT * d);
    col = col * t + WATER_IN * (1.0 - t);
  }

  fragColor = vec4(dither8(encode(col * uExposure), gl_FragCoord.xy), mark.a);
}
`;

const WAKE_N = 170;           // samples, every 0.05 s -> 8.5 s of wake
const WF = 11;                // fields per wake sample
const STRIPS = 5;
// >>> SPRAY
// The pool is a RING that overwrites by spawn order, not by age, so it has to
// hold rate x longest-life or the oldest particle is cut short. Straight-line
// steady state is 1300 (rooster) + ~227 (bow sheets) = 1,527 spawns/s against a
// 1.00 s longest life: 2,800 slots wrap in 1.83 s, which clears it with margin.
// A hard carve adds ~670/s and wraps in 1.26 s, which still clears. A LANDING
// spikes to ~4,500/s and wraps in 0.62 s, so the oldest mist IS cut short for
// about a fifth of a second during a touchdown - which is the right trade, and
// is stated here rather than discovered later.
// The cost is the two per-frame loops that walk every slot - 1,200 more iterations
// of about ten operations - and 58 KB of Float32Array.
const SPRAY_N = SX.pool;
// <<< SPRAY
const PF = 12;                // fields per particle
const TAN_KELVIN = Math.tan(19.47 * Math.PI / 180);
const cl = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, x) => { const t = cl((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

export class BoatRenderer {
  constructor(gl, craft) {
    this.gl = gl;
    this.craft = craft;
    this.active = false;
    this.kind = null;
    this.hull = null;           // the PlaneHull being drawn, set by the hub
    this.fpv = false;
    this.model = new Float32Array(16);
    this.meshes = {};
    this.decals = {};
    this._cg = {};

    const AT = { aPos: 0, aAux: 1 };
    this.foamProg = link(gl, FOAM_VERT, FOAM_FRAG, 'boat-foam', AT);
    this.foamU = uniforms(gl, this.foamProg, ['uViewProj', 'uFoam']);
    this.sprayProg = link(gl, SPRAY_VERT, SPRAY_FRAG, 'boat-spray', AT);
    this.sprayU = uniforms(gl, this.sprayProg, ['uViewProj', 'uFoam', 'uPx']);
    this.liveryProg = link(gl, LIVERY_VERT, LIVERY_FRAG, 'boat-livery', LIV_AT);
    this.liveryU = uniforms(gl, this.liveryProg,
      ['uViewProj', 'uModel', 'uCamPos', 'uSunDir', 'uRough', 'uExposure', 'uOvercast',
        // >>> ENVREF  null under ?cdbg=noenv, which does not declare it.
        'uWaterY',
        // <<< ENVREF
        'uLivery', 'uShadowMap', 'uLightViewProj', 'uShadowTexel']);
    // Null until the atlas has arrived. Nothing waits for it: the craft is
    // already in its livery COLOURS from the first frame and the marks appear
    // when they land, the same contract textures.js keeps for the coast.
    this.livTex = null;
    this.livState = 'idle';

    // Wake: STRIPS x (N-1) quads x 6 verts x (pos 3 + aux 4).
    this.wakeData = new Float32Array(STRIPS * (WAKE_N - 1) * 6 * 7);
    this.wakeVao = gl.createVertexArray();
    gl.bindVertexArray(this.wakeVao);
    this.wakeVbo = buffer(gl, gl.ARRAY_BUFFER, this.wakeData, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 28, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 28, 12);
    this.sprayData = new Float32Array(SPRAY_N * 6);
    this.sprayVao = gl.createVertexArray();
    gl.bindVertexArray(this.sprayVao);
    this.sprayVbo = buffer(gl, gl.ARRAY_BUFFER, this.sprayData, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    this.wk = new Float32Array(WAKE_N * WF); this.wi = 0; this.wAcc = 0;
    this.hs = new Float32Array(WAKE_N * 3);
    this.sp = new Float32Array(SPRAY_N * PF); this.si = 0; this.seed = 1;
    this.acc = new Float32Array(6);
    this._air = 0; this._surfPrev = null; this._slamCool = 0;
    // >>> SPRAY
    this._slamE = 0;            // landing-sheet energy, decays over slamTau
    // <<< SPRAY
    this.wakeVerts = 0; this.sprayCount = 0;
    // The PWC's rider and bars are SKINNED (see boat-pwc.js / boat-rider.js):
    // one bone list, transformed on the CPU, uploaded into the same VAOs. This
    // is the whole of the boat's animation state and it is written from the
    // hull's own published values only.
// >>> RIDERSKIN
    // ONE bone list, sized for whichever craft needs the most - the PWC has
    // 3 + 16, the RIB 2 + 16 - because only one of them is ever on screen.
    this.bones = new Float32Array(Math.max(PWC_BONES, RIB_BONES) * 12);
    this.rs = { tilt: 0, rise: 0, tuck: 0, squat: 0, air: 0, bar: 0 };
    this._rigDirty = true;
    // The hub swaps `kind` by assignment, so there is no hook to mark the rig
    // dirty on a craft change; _skin() compares this instead.
    this._rigKind = null;
// <<< RIDERSKIN
  }

  // LAZY: the hub calls build() on every page, eFoil included; the meshes are
  // made and uploaded on the first boat draw instead (_ensure), so the eFoil page
  // does no boat mesh work. (Building them eagerly changed the default renders:
  // proven by bisection in tmp-tr51, mechanism not identified.)
  build(cgBy) { this._cgBy = cgBy; return this; }

  _ensure() {
    if (this.meshes.speedboat || !this._cgBy) return;
    const cgBy = this._cgBy;
    for (const [kind, fn] of [['speedboat', ribParts], ['jetski', pwcParts]]) {
      this._cg[kind] = cgBy[kind];
      this.meshes[kind] = fn(cgBy[kind]).map((p) => {
        // A part that carries `uv` is a LIVERY DECAL and takes the stride-32
        // path; everything else is the stride-24 buffer craft.js uploads.
// >>> RIDERSKIN
        const built = p.mesh.build();
        const up = p.uv ? this._uploadUV(built, p.uv)
          : { ...this.craft._upload(built), data: built.data };
        const paint = p.mat != null ? RIDER_PAINT[p.mat] : null;
        // THE RIG. `p.skin` is the bone table the model file builds beside the
        // mesh - skinRange() for the bars, the nozzle and the wheel, skinOf()
        // for the rider, DecalSheet.skin() for the mark on her back. It has
        // always been there; nothing carried it onto the part, so _skin()'s
        // `if (!p.skin) continue` skipped every part in the list and the whole
        // rig was dead code. `data` is dropped off the GPU handles here because
        // it lives on `rig.bind` instead.
        const rig = p.skin ? this._dynamic(up, p.uv ? 8 : 6, p.skin) : null;
        const { data, ...gpu } = up;
        return { ...gpu, color: paint ? paint.slice(0, 3) : p.color, rough: paint ? paint[3] : p.rough,
          figure: p.mat != null || p.rider === true, pose: p.pose ?? null,
          decal: !!p.uv, name: p.name || null, ...rig };
// <<< RIDERSKIN
      });
      this.decals[kind] = this.meshes[kind].filter((p) => p.decal);
    }
    this._loadLivery();
    return true;
  }

// >>> RIDERSKIN
  // A skinned part's vertex buffer is rewritten on every frame the pose moves,
  // so its store is re-specified DYNAMIC_DRAW here rather than left on the
  // STATIC_DRAW core.js's buffer() defaults to. The buffer OBJECT is the same
  // one, so the VAO's attribute pointers - set once at upload against this
  // buffer - stay bound and stay valid; only the usage hint and the contents
  // change.
  //
  // `bind` is the pose the vertices were BUILT in and is never written to:
  // skinPart reads it every frame and would compound its own output otherwise.
  // `scratch` is the array the GPU actually reads. `stride` is 6 for an
  // ordinary part and 8 for a livery decal, whose two UV floats sit past the
  // normal and must survive untouched.
  _dynamic(up, stride, skin) {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, up.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, up.data, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    return { skin, stride, bind: up.data, scratch: new Float32Array(up.data) };
  }

// <<< RIDERSKIN
  // THE ONE PLACE A UV ATTRIBUTE ENTERS THIS PROJECT.
  //
  // `mesh` is a MeshBuilder build() - interleaved pos 3 + normal 3, stride 24.
  // `uv` is one [s, t] per vertex IN THE SAME ORDER, built beside the vertices
  // by DecalSheet.patch. They are woven here into stride 32 and the three
  // pointers are set from one constant, so the stride, the offsets and the
  // attribute count cannot drift apart.
  //
  // The assert is the whole safety of the format change: a builder that pushes
  // a vertex without pushing a UV, or the other way round, fails loudly at load
  // instead of silently feeding the shader whatever followed in memory.
  _uploadUV(mesh, uv) {
    const gl = this.gl, n = mesh.data.length / 6;
    if (uv.length !== n * 2) {
      throw new Error(`[gl] livery: ${uv.length / 2} UVs for ${n} vertices - a builder is out of step`);
    }
    const data = new Float32Array(n * 8);
    for (let k = 0; k < n; k++) {
      const s = k * 6, d = k * 8;
      data[d] = mesh.data[s]; data[d + 1] = mesh.data[s + 1]; data[d + 2] = mesh.data[s + 2];
      data[d + 3] = mesh.data[s + 3]; data[d + 4] = mesh.data[s + 4]; data[d + 5] = mesh.data[s + 5];
      data[d + 6] = uv[k * 2]; data[d + 7] = uv[k * 2 + 1];
    }
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const vbo = buffer(gl, gl.ARRAY_BUFFER, data);
    gl.enableVertexAttribArray(LIV_AT.aPos);
    gl.vertexAttribPointer(LIV_AT.aPos, 3, gl.FLOAT, false, UV_STRIDE, 0);
    gl.enableVertexAttribArray(LIV_AT.aNormal);
    gl.vertexAttribPointer(LIV_AT.aNormal, 3, gl.FLOAT, false, UV_STRIDE, 12);
    gl.enableVertexAttribArray(LIV_AT.aUV);
    gl.vertexAttribPointer(LIV_AT.aUV, 2, gl.FLOAT, false, UV_STRIDE, 24);
    buffer(gl, gl.ELEMENT_ARRAY_BUFFER, mesh.index);
    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
// >>> RIDERSKIN
    // `data` goes back with the handles: a skinned decal is skinned FROM the
    // stride-8 array woven here, not from the stride-6 one it arrived on.
    return { vao, vbo, count: mesh.count, verts: n, data };
// <<< RIDERSKIN
  }

  // The atlas: ONE 256x256 RGBA png, baked from the owner's logo file by
  // tools/gen-livery.py. Fetched once, off the main thread where the browser
  // allows it, and uploaded as sRGB because it is colour, not data - the same
  // rule textures.js states for its own albedos. A failure leaves livTex null
  // and the craft simply wears its colours without the marks.
  _loadLivery() {
    if (this.livState !== 'idle') return;
    this.livState = 'loading';
    const gl = this.gl;
    const decode = async () => {
      if (typeof createImageBitmap === 'function' && typeof fetch === 'function') {
        const res = await fetch(LIVERY_URL);
        if (!res.ok) throw new Error('failed to load ' + LIVERY_URL);
        return createImageBitmap(await res.blob(), { premultiplyAlpha: 'none' });
      }
      return new Promise((ok, no) => {
        const img = new Image();
        img.onload = () => ok(img);
        img.onerror = () => no(new Error('failed to load ' + LIVERY_URL));
        img.src = LIVERY_URL;
      });
    };
    decode().then((img) => {
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.SRGB8_ALPHA8, img.width, img.height, 0,
        gl.RGBA, gl.UNSIGNED_BYTE, img);
      // CLAMP, not REPEAT: the atlas has transparent gutters and a decal that
      // sampled across the wrap would drag the wordmark into the roundel.
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.generateMipmap(gl.TEXTURE_2D);
      const ext = gl.getExtension('EXT_texture_filter_anisotropic');
      if (ext) {
        const max = gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
        gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, max));
      }
      gl.bindTexture(gl.TEXTURE_2D, null);
      if (typeof img.close === 'function') img.close();
      this.livTex = tex;
      this.livState = 'ready';
    }).catch((e) => {
      this.livState = 'failed';
      console.warn('[gl]', e.message);
    });
  }

  // Transform every skinned vertex from the bone list and push it into the VAO
  // it was uploaded into. No new VAO, no new draw call, one bufferSubData per
  // moving part - the same thing the wake buffer already does every frame.
// >>> RIDERSKIN
  _skin() {
    const kind = this.kind;
    const write = kind === 'jetski' ? pwcBones : kind === 'speedboat' ? ribBones : null;
    if (!write) return;                                 // the eFoil has no bones here
    const parts = this.meshes[kind];
    if (!parts) return;
    // Skip only when the pose is clean AND the craft has not changed under us:
    // a craft swap leaves the new craft's buffers in ITS bind pose.
    if (!this._rigDirty && this._rigKind === kind) return;
    this._rigDirty = false;
    this._rigKind = kind;
    const gl = this.gl;
    write(this.rs, this._cg[kind] || 0, this.bones);
    for (const p of parts) {
      if (!p.skin) continue;
      // `p.stride` is 8 for a livery decal. Reading it as 6 would walk the UVs
      // as if they were positions and shred the mark.
      skinPart(p.bind, p.skin, this.bones, p.scratch, p.stride);
      gl.bindBuffer(gl.ARRAY_BUFFER, p.vbo);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, p.scratch);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }
// <<< RIDERSKIN

  // >>> SPRAY  _slamE joins the reset: a craft swap or a demo respawn must not
  // carry a landing sheet across with it.
  clearFx() { this.rs.squat = 0; this.rs.air = 0; this.wk.fill(0); this.sp.fill(0); this.acc.fill(0); this._air = 0; this._surfPrev = null; this._slamE = 0; }
  // <<< SPRAY

  fxStats() {
    let live = 0; for (let i = 0; i < WAKE_N; i++) if (this.wk[i * WF + 6] > 0 || this.wk[i * WF + 7] > 0) live++;
    const d = this.decals[this.kind] || [];
    return { wakeSamples: live, sprayLive: this.sprayCount, wakeVerts: this.wakeVerts,
      livery: this.livState, liveryParts: d.length,
      liveryTris: d.reduce((s, p) => s + p.count / 3, 0),
      liveryVerts: d.reduce((s, p) => s + (p.verts || 0), 0) };
  }

  // model = translate * rotY(-heading) * rotZ(pitch) * rotX(roll), the same
  // basis as CraftRenderer._setModel (copied, not shared).
  setModel(x, y, z, heading, pitch, roll) {
    const m = this.model;
    const ch = Math.cos(heading), sh = Math.sin(heading);
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const cr = Math.cos(roll), sr = Math.sin(roll);
    const fx = ch * cp, fy = sp, fz = sh * cp;
    const rx = -sh * cr + ch * sp * sr, ry = -cp * sr, rz = ch * cr + sh * sp * sr;
    const ux = fy * rz - fz * ry, uy = fz * rx - fx * rz, uz = fx * ry - fy * rx;
    m[0] = fx; m[1] = fy; m[2] = fz; m[3] = 0;
    m[4] = -ux; m[5] = -uy; m[6] = -uz; m[7] = 0;
    m[8] = rx; m[9] = ry; m[10] = rz; m[11] = 0;
    m[12] = x; m[13] = y; m[14] = z; m[15] = 1;
    return m;
  }

  _hullModel() {
    const h = this.hull;
    return this.setModel(h.x, h.y, h.z, h.heading, h.pitch, h.roll);
  }

  _fx() { return this.kind === 'jetski' ? PWC_FX : RIB_FX; }

  // Baked driver lean: the pose nearest the hull's roll (leaning into the turn).
  _pose() {
    const F = this._fx(), ref = this.kind === 'jetski' ? 0.4 : 0.2;
    return Math.round((cl(this.hull.roll / ref, -1, 1) + 1) * (F.poses - 1) / 2);
  }

  drawShadow(shadow) {
    if (this.kind === 'surfboard') return;   // SURFER: gl/surfers.js draws the board and rider
    this._ensure();
// >>> RIDERSKIN
    // FIRST pass of the frame (renderer.js:263, against draw's :435), so the
    // skin happens here or the shadow is cast from last frame's pose. _skin()
    // clears _rigDirty, so the call in draw() below is a compare and a return.
    this._skin();
// <<< RIDERSKIN
    const gl = this.gl, parts = this.meshes[this.kind];
    if (!parts || !this.hull) return;
    const model = this._hullModel(), pose = this._pose();
    // Decals stand down. A mark lifted 8-11 mm off the hull is thinner than the
    // shadow map's own bias, so it cannot cast a shadow anyone can see - it can
    // only cast acne on the panel it is painted on. Same reasoning, and the
    // same decision, as the coast's noCastRanges.
    for (const p of parts) {
      if (p.decal) continue;
      if (p.pose == null || p.pose === pose) shadow.drawCaster(p.vao, p.count, gl.UNSIGNED_SHORT, model);
    }
  }

  _spawn(x, y, z, vx, vy, vz, life, size, grow, alpha, floor) {
    const S = this.sp, q = this.si * PF;
    S[q] = x; S[q + 1] = y; S[q + 2] = z; S[q + 3] = vx; S[q + 4] = vy; S[q + 5] = vz;
    S[q + 6] = life; S[q + 7] = life; S[q + 8] = size; S[q + 9] = grow; S[q + 10] = alpha; S[q + 11] = floor;
    this.si = (this.si + 1) % SPRAY_N;
  }

  _rnd() { this.seed = (this.seed * 16807) % 2147483647; return this.seed / 2147483647; }

  // ---- effects, stepped on the frame clock ------------------------------
  effects(ft, spec, sea, t) {
    if (this.kind === 'surfboard') return;   // SURFER: gl/surfers.js draws the board and rider
    const h = this.hull;
    if (!h || !(ft > 0)) return;
    const F = this._fx(), P = spec, jet = this.kind === 'jetski', cg = this._cg[this.kind] || 0;
    const ch = Math.cos(h.heading), sh = Math.sin(h.heading);
    const wx = (lx, lz) => h.x + ch * (lx - cg) - sh * lz, wz = (lx, lz) => h.z + sh * (lx - cg) + ch * lz;
    const u = h.u, au = Math.abs(u), sp = Math.hypot(h.u, h.v);
    const vxH = ch * h.u - sh * h.v, vzH = sh * h.u + ch * h.v;
    const air = h.airTicks > 0, wet = air ? 0 : h.wet, thr = cl(h.thr || 0, 0, 1);
    const planeT = smooth(P.uHump * 0.6, P.uPlane, au);
    const hump = Math.exp(-(((au - P.uHump) / (P.uHump * 0.5)) ** 2));
    const surf = sea ? sea.sample(h.x, h.z, t, 0, 3).height : 0;

    // Wake samples.
    const W = this.wk;
    for (let i = 0; i < WAKE_N; i++) { const o = i * WF; if (W[o + 6] > 0 || W[o + 7] > 0) W[o + 8] += ft; }
    this.wAcc += ft;
    if (this.wAcc >= 0.05) {
      this.wAcc = 0;
      const o = this.wi * WF;
      const ax = F.transom + (F.bow * 0.55 - F.transom) * (1 - planeT);
      W[o] = wx(F.transom, 0); W[o + 1] = wz(F.transom, 0);
      W[o + 2] = wx(ax, 0); W[o + 3] = wz(ax, 0);
      W[o + 4] = -sh; W[o + 5] = ch;
      const flow = cl(sp / 3 + thr * 0.3, 0, 1);
      W[o + 6] = (sp < 0.4 && thr < 0.05) ? 0 : cl(0.15 + 0.85 * thr, 0, 1) * flow * (air ? 0.1 : 0.5 + 0.5 * h.wet) * (jet ? 1 : 0.9);
      W[o + 7] = cl((sp - 0.8) / 3, 0, 1) * (0.55 + 0.45 * hump) * (air ? 0.15 : 1) * (jet ? 0.7 : 1);
      W[o + 8] = 0; W[o + 9] = sp; W[o + 10] = F.chine;
      this.wi = (this.wi + 1) % WAKE_N;
    }

    // >>> SPRAY
    // Spray emitters (rates per second). Every constant comes from SX above, so
    // ?bdbg=oldspray restores the previous emitter EXACTLY - same values, same
    // R() order, same particle stream. The shapes, the gates and the ballistics
    // are untouched: this changes how many, how big, how long and how opaque,
    // and nothing about where the water goes.
    const A = this.acc, cap = { n: SX.cap };
    const emit = (k, rate, fn) => { A[k] += rate * ft; while (A[k] >= 1 && cap.n-- > 0) { A[k] -= 1; fn(); } if (A[k] > 4) A[k] = 0; };
    const R = () => this._rnd();
    const sideX = -sh, sideZ = ch;
    // Bow sheets: the wetted forward contact slides aft as the hull gets up.
    emit(0, wet * (jet ? SX.bowRateJ : SX.bowRateR) * smooth(2, P.uPlane, au), () => {
      const s = R() < 0.5 ? 1 : -1, lx = F.bow * (0.62 - 0.45 * planeT) * (0.8 + 0.3 * R()), lz = s * F.chine * 0.95;
      const out = (1.8 + 0.22 * au) * (0.5 + 0.5 * R()), up = (0.8 + 0.14 * au) * (0.4 + 0.6 * R());
      this._spawn(wx(lx, lz), surf + 0.05, wz(lx, lz), vxH * 0.75 + sideX * s * out, up, vzH * 0.75 + sideZ * s * out,
        LIFE(SX.bowL0, SX.bowLR, SX.bowSq, R), jet ? SX.bowSizeJ : SX.bowSizeR, SX.bowGrow, SX.bowAlpha, surf - 0.15);
    });
    // Turn spray, thrown outboard of the turn from the outer chine.
    const latG = Math.abs(u * (h.r || 0)) / 9.81, so = (h.r || 0) > 0 ? -1 : 1;
    emit(1, wet * (jet ? SX.turnRateJ : SX.turnRateR) * cl(latG - 0.12, 0, 1) * smooth(3, P.uPlane, au), () => {
      const lx = F.transom * (0.1 + 0.6 * R()) + 0.2, lz = so * (F.chine + 0.05);
      const out = (2.5 + 0.2 * au * latG) * (0.5 + 0.5 * R()), up = 1.0 + SX.turnUp * latG * R();
      this._spawn(wx(lx, lz), surf + 0.08, wz(lx, lz), vxH * 0.6 + sideX * so * out, up, vzH * 0.6 + sideZ * so * out,
        LIFE(SX.turnL0, SX.turnLR, SX.turnSq, R), jet ? SX.turnSizeJ : SX.turnSizeR, SX.turnGrow, SX.turnAlpha, surf - 0.15);
    });
    if (!jet) {
      // Propwash boil behind the leg. ⚠️ The RIB got the same density treatment
      // as the ski because it shares this pool and these emitters - but I
      // rendered the JETSKI only and have not looked at the speedboat.
      emit(2, wet * SX.propRate * thr * smooth(0.5, P.uPlane, au) + (au < 2 ? SX.propSlow * thr : 0), () => {
        const lx = F.prop[0] - 0.1, lz = (R() - 0.5) * 0.4;
        this._spawn(wx(lx, lz), surf + 0.05, wz(lx, lz), vxH * 0.45 + sideX * (R() - 0.5), 0.4 + 1.4 * R(), vzH * 0.45 + sideZ * (R() - 0.5),
          LIFE(SX.propL0, SX.propLR, SX.propSq, R), SX.propSize, SX.propGrow, SX.propAlpha, surf - 0.1);
      });
    } else {
      // Rooster tail off the nozzle: the jet leaves a few m/s slower than the hull.
      emit(2, (air ? 0.2 : 1) * SX.roostRate * thr * smooth(P.uHump, P.uPlane * 1.4, au) + (au < 3 ? SX.roostSlow * thr : 0), () => {
        const lx = F.nozzle[0], lz = (R() - 0.5) * 0.1, back = 2 + 2.5 * R(), lat = (R() - 0.5) * 1.4;
        const dirx = au > 0.5 ? vxH / sp : ch, dirz = au > 0.5 ? vzH / sp : sh;
        this._spawn(wx(lx, lz), surf + 0.08, wz(lx, lz), -dirx * back + sideX * lat, (au < 3 ? 0.8 : SX.roostUp) + SX.roostUpR * R() * thr,
          -dirz * back + sideZ * lat, LIFE(SX.roostL0, SX.roostLR, SX.roostSq, R), SX.roostSize, SX.roostGrow, SX.roostAlpha, surf - 0.1);
      });
    }
    // <<< SPRAY
    // Slams: landing from air, or the hull meeting the sea hard.
    this._slamCool -= ft;
    let I = 0;
    if (this._air > 3 && !air) I = cl(this._air / 30, 0.3, 1);
    if (!air && this._surfPrev != null && this._slamCool <= 0) {
      const dv = (h.vy || 0) - (surf - this._surfPrev) / ft;
      if (dv < -1.0 && au > 4) I = Math.max(I, cl((-dv - 1) / 2.5, 0, 1));
    }
    this._surfPrev = surf; this._air = h.airTicks;
// >>> SPRAY
    // THE LANDING SHEET. The detector above is untouched; only the emission is.
    //
    // It was ONE burst of round(I * 45) = 39 sprites, all in a single frame, and
    // a hull dropping out of 0.22 s of air at 28 m/s throws considerably more
    // water than that and throws it over about a quarter of a second, not
    // instantly. So the impulse now charges an energy that decays over
    // slamTau = 0.16 s and drives a rate emitter: integral of rate * E^2 dt with
    // E = exp(-t/tau) is rate * tau / 2 = 3200 * 0.08 = 256 particles per unit-I
    // slam, six and a half times the old burst, front-loaded so the sheet stands
    // up and collapses instead of appearing whole.
    //
    // ⚠️ This DOES NOT touch the airborne gating the brief asked about. A hull
    // out of the water cannot throw water and the wet/0.2 multipliers are right;
    // what was wrong is that the moment it comes back down was worth 39 sprites.
    if (SX.slamBurst) {
      if (I > 0.05 && this._slamCool <= 0) {
        this._slamCool = 0.25;
        const n = Math.round(I * (jet ? SX.slamNJ : SX.slamNR));
        for (let k = 0; k < n; k++) {
          const s = R() < 0.5 ? 1 : -1, lx = F.bow * 0.7 * R(), lz = s * F.chine;
          const out = (2 + 4 * R()) * (0.6 + I), up = 1.5 + SX.slamUp * R() * I;
          this._spawn(wx(lx, lz), surf + 0.1, wz(lx, lz), vxH * 0.7 + sideX * s * out, up, vzH * 0.7 + sideZ * s * out,
            LIFE(SX.slamL0, SX.slamLR, SX.slamSq, R), jet ? SX.slamSizeJ : SX.slamSizeR, SX.slamGrow, SX.slamAlpha, surf - 0.2);
        }
      }
    } else {
      if (I > 0.05 && this._slamCool <= 0) { this._slamCool = 0.25; this._slamE = Math.max(this._slamE, I); }
      const E = this._slamE;
      emit(3, (jet ? SX.slamRateJ : SX.slamRateR) * E * E, () => {
        const s = R() < 0.5 ? 1 : -1, lx = F.bow * 0.7 * R(), lz = s * F.chine;
        const out = (2 + 4 * R()) * (0.6 + E), up = 1.5 + SX.slamUp * R() * E;
        this._spawn(wx(lx, lz), surf + 0.1, wz(lx, lz), vxH * 0.7 + sideX * s * out, up, vzH * 0.7 + sideZ * s * out,
          LIFE(SX.slamL0, SX.slamLR, SX.slamSq, R), jet ? SX.slamSizeJ : SX.slamSizeR, SX.slamGrow, SX.slamAlpha, surf - 0.2);
      });
      this._slamE = E * Math.exp(-ft / SX.slamTau);
    }
// <<< SPRAY

// >>> RIDERSKIN
    // ---- rider and bar pose (BOTH driveable craft) -----------------------
// <<< RIDERSKIN
    // Every term below is READ from the hull the physics publishes - throttle,
    // speed, roll, yaw rate, airborne ticks and the slam impulse I that the
    // spray already uses. Nothing is written back into the hull.
    //   rise  coming onto the plane: up off the seat and weight aft
    //   tuck  at speed: down over the bars, head lower
    //   squat a landing or a hard wave: hips drop, the knees take it
    //   tilt  leans INTO the turn, further over than the hull's own bank
    //   bar   the handlebars, and with them her hands and the jet nozzle
// >>> RIDERSKIN
    // The guard was `if (jet)` because only the PWC had a rig. The RIB driver is
    // now on the SAME 16-bone figure, so the same six numbers drive her - with
    // her own gains, because she sits on a jockey seat behind a wheel and not
    // astride a saddle, and because her arms are longer relative to the reach
    // and will not carry the ski's amplitudes without straightening.
    //
    // NOT GATED ON ?cal=. It does not have to be: this whole block is inside
    // effects(), which renderer.js only reaches through boats.active, and a
    // calibration URL never selects a boat (main.js skips ?craft= when ?cal= is
    // present and the bare-URL jetski start is skipped too). Nothing here is
    // drawn on any of the 19 judged views - proven by rendering them, not by
    // reading this comment.
    {
      const rs = this.rs, lg = (v, tg, tau) => v + (tg - v) * (1 - Math.exp(-ft / tau));
      const riseT = cl(thr * (1 - planeT) * smooth(0.8, P.uHump, au) * (jet ? 1.25 : 0.95), 0, 1);
      const tuckT = smooth(P.uPlane * 1.15, jet ? 23 : 26, au) * (0.35 + 0.65 * thr);
      rs.rise = lg(rs.rise, riseT, 0.22);
      rs.tuck = lg(rs.tuck, tuckT, 0.5);
      rs.air = lg(rs.air, air ? 1 : 0, 0.12);
      rs.squat = Math.max(rs.squat * Math.exp(-ft / 0.2), cl(I * (jet ? 1.1 : 0.95), 0, 1));
      rs.tilt = lg(rs.tilt, jet ? cl(h.roll * 0.62, -0.36, 0.36) : cl(h.roll * 0.45, -0.22, 0.22), 0.12);
      rs.bar = lg(rs.bar, cl((h.r || 0) / 0.9, -1, 1) * (jet ? 0.42 : 0.85), 0.09);
      this._rigDirty = true;
    }
// <<< RIDERSKIN

    // Integrate the pool.
    const S = this.sp, dh = Math.exp(-1.6 * ft), dv2 = Math.exp(-0.6 * ft);
    for (let i = 0; i < SPRAY_N; i++) {
      const q = i * PF;
      if (S[q + 6] <= 0) continue;
      S[q + 6] -= ft;
      S[q + 3] *= dh; S[q + 5] *= dh; S[q + 4] = S[q + 4] * dv2 - 9.81 * ft;
      S[q] += S[q + 3] * ft; S[q + 1] += S[q + 4] * ft; S[q + 2] += S[q + 5] * ft;
      S[q + 8] += S[q + 9] * ft;
      if (S[q + 1] < S[q + 11]) S[q + 6] = 0;
    }
  }

  // ---- the frame --------------------------------------------------------
  draw(cam, vp, sunDir, exposure, shadow, mode, sea, t, viewportH, fovY) {
    if (this.kind === 'surfboard') return;   // SURFER: gl/surfers.js draws the board and rider
    this._ensure();
// >>> RIDERSKIN
    this._skin();                   // no-op unless the pose moved since drawShadow
// <<< RIDERSKIN
    const gl = this.gl, parts = this.meshes[this.kind];
    if (!parts || !this.hull) return;
    const c = this.craft;
    const sun = Math.max(0.35, sunDir[1]) * (1 - 0.3 * OVERCAST.v);
    const foam = [0.80 * sun + 0.3, 0.84 * sun + 0.3, 0.86 * sun + 0.3].map((v) => Math.min(0.97, v * exposure));

    this._fillWake(sea, t);
    if (this.wakeVerts) {
      gl.useProgram(this.foamProg);
      gl.uniformMatrix4fv(this.foamU.uViewProj, false, vp);
      gl.uniform3f(this.foamU.uFoam, foam[0], foam[1], foam[2]);
      gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false); gl.disable(gl.CULL_FACE);
      gl.bindVertexArray(this.wakeVao);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.wakeVbo);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.wakeData, 0, this.wakeVerts * 7);
      gl.drawArrays(gl.TRIANGLES, 0, this.wakeVerts);
      gl.depthMask(true); gl.disable(gl.BLEND);
    }

    gl.useProgram(c.prog);
    gl.uniformMatrix4fv(c.u.uViewProj, false, vp);
    gl.uniform3f(c.u.uCamPos, cam.x, cam.y, cam.z);
    gl.uniform3f(c.u.uSunDir, sunDir[0], sunDir[1], sunDir[2]);
    gl.uniform1f(c.u.uExposure, exposure);
    if (c.u.uOvercast) gl.uniform1f(c.u.uOvercast, OVERCAST.v);
    // >>> ENVREF
    // The instantaneous local sea surface under THIS hull, for the wet band.
    // effects() already samples the same thing for the spray floor, but it is
    // not the same clock: effects() does not run on a frozen page, and the draw
    // must still know where the water is when it does not.
    const envWaterY = sea ? sea.sample(this.hull.x, this.hull.z, t, 0, 3).height : 0;
    if (c.u.uWaterY) gl.uniform1f(c.u.uWaterY, envWaterY);
    // <<< ENVREF
    if (shadow) shadow.bind(gl, c.prog, c.u);
    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.uniformMatrix4fv(c.u.uModel, false, this._hullModel());
    const pose = this._pose();
    for (const p of parts) {
      if (p.decal) continue;                                   // second pass, below
      if (p.figure && (mode === 'fpv' || (p.pose != null && p.pose !== pose))) continue;
      gl.uniform3f(c.u.uBaseColor, p.color[0], p.color[1], p.color[2]);
      gl.uniform1f(c.u.uRough, p.rough);
      gl.bindVertexArray(p.vao);
      gl.drawElements(gl.TRIANGLES, p.count, gl.UNSIGNED_SHORT, 0);
    }

    // ---- LIVERY. The owner's marks, over the hull they are painted on.
    // Last, so every panel is already in the depth buffer; blended, so the edge
    // of a roundel is anti-aliased instead of stair-stepped; depth-TESTED so a
    // mark behind the rider is hidden, but not depth-WRITTEN, because nothing
    // is ever drawn on top of a sticker. The geometry is already lifted clear
    // of the hull in the mesh, so there is no polygon offset and no depth bias
    // to get wrong on a different projection.
    const decs = this.decals[this.kind];
    if (this.livTex && decs && decs.length) {
      gl.useProgram(this.liveryProg);
      gl.uniformMatrix4fv(this.liveryU.uViewProj, false, vp);
      gl.uniformMatrix4fv(this.liveryU.uModel, false, this._hullModel());
      gl.uniform3f(this.liveryU.uCamPos, cam.x, cam.y, cam.z);
      gl.uniform3f(this.liveryU.uSunDir, sunDir[0], sunDir[1], sunDir[2]);
      gl.uniform1f(this.liveryU.uExposure, exposure);
      if (this.liveryU.uOvercast) gl.uniform1f(this.liveryU.uOvercast, OVERCAST.v);
      // >>> ENVREF
      if (this.liveryU.uWaterY) gl.uniform1f(this.liveryU.uWaterY, envWaterY);
      // <<< ENVREF
      if (shadow) shadow.bind(gl, this.liveryProg, this.liveryU);
      gl.activeTexture(gl.TEXTURE0 + LIVERY_UNIT);
      gl.bindTexture(gl.TEXTURE_2D, this.livTex);
      gl.uniform1i(this.liveryU.uLivery, LIVERY_UNIT);
      gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);
      for (const p of decs) {
        if (p.figure && (mode === 'fpv' || (p.pose != null && p.pose !== pose))) continue;
        gl.uniform1f(this.liveryU.uRough, p.rough);
        gl.bindVertexArray(p.vao);
        gl.drawElements(gl.TRIANGLES, p.count, gl.UNSIGNED_SHORT, 0);
      }
      gl.depthMask(true); gl.disable(gl.BLEND);
      gl.activeTexture(gl.TEXTURE0);
    }

    let n = 0;
    const S = this.sp, D = this.sprayData;
    for (let i = 0; i < SPRAY_N; i++) {
      const q = i * PF;
      if (S[q + 6] <= 0) continue;
      const lf = S[q + 6] / S[q + 7], o = n * 6;
      D[o] = S[q]; D[o + 1] = S[q + 1]; D[o + 2] = S[q + 2];
      // >>> SPRAY
      // THE NEAR-FADE WAS EATING THE ROOT. min(1, age * 12) is a fade-IN over the
      // first 1/12 s, which at 28.3 m/s is the first 2.3 m astern of the nozzle -
      // the densest and most important part of the plume, systematically ramped
      // from zero. 45 makes it 0.022 s, i.e. 0.63 m, which is a soft edge at the
      // nozzle rather than a hole in the plume. The fade-OUT exponent goes the
      // other way: 0.7 keeps a particle at 62% alpha at half life, so the long
      // tail hangs about as haze; 1.35 takes it to 39% and the mist thins out
      // instead of milking over the frame.
      D[o + 3] = S[q + 10] * Math.pow(lf, SX.fadePow) * Math.min(1, (S[q + 7] - S[q + 6]) * SX.fadeIn);
      // <<< SPRAY
      D[o + 4] = S[q + 8]; D[o + 5] = (i * 0.618) % 7;
      n++;
    }
    this.sprayCount = n;
    // >>> SPRAY
    if (n && !SPRAY_OFF) {
    // <<< SPRAY
      gl.useProgram(this.sprayProg);
      gl.uniformMatrix4fv(this.sprayU.uViewProj, false, vp);
      gl.uniform3f(this.sprayU.uFoam, foam[0], foam[1], foam[2]);
      gl.uniform1f(this.sprayU.uPx, viewportH / (2 * Math.tan(fovY / 2)));
      gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);
      gl.bindVertexArray(this.sprayVao);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.sprayVbo);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.sprayData, 0, n * 6);
      gl.drawArrays(gl.POINTS, 0, n);
      gl.depthMask(true); gl.disable(gl.BLEND);
    }
    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.disable(gl.CULL_FACE);
  }

  // Five strips from the ring buffer, oldest -> newest, laid on the sea.
  _fillWake(sea, t) {
    const W = this.wk, D = this.wakeData, HS = this.hs, jet = this.kind === 'jetski';
    const tw = jet ? 4.5 : 5, hw0 = jet ? 0.32 : 0.6;
    for (let i = 0; i < WAKE_N; i++) {
      const o = i * WF;
      if (!(W[o + 6] > 0 || W[o + 7] > 0)) continue;
      const age = W[o + 8], off = W[o + 10] * 0.9 + age * W[o + 9] * TAN_KELVIN;
      HS[i * 3] = sea ? sea.sample(W[o], W[o + 1], t, 0, 3).height : 0;
      HS[i * 3 + 1] = sea ? sea.sample(W[o + 2] + W[o + 4] * off, W[o + 3] + W[o + 5] * off, t, 0, 3).height : 0;
      HS[i * 3 + 2] = sea ? sea.sample(W[o + 2] - W[o + 4] * off, W[o + 3] - W[o + 5] * off, t, 0, 3).height : 0;
    }
    // geo(sample, strip) -> [originX, originZ, centre offset, half width, alpha, height, flip]
    const geo = (o, i, strip, out) => {
      const age = W[o + 8], U = W[o + 9], hb = W[o + 10];
      if (strip === 0) {
        out[0] = W[o]; out[1] = W[o + 1]; out[2] = 0; out[3] = Math.min(2.6, hw0 + age * 0.45);
        out[4] = W[o + 6] * Math.pow(Math.max(0, 1 - age / tw), 1.3); out[5] = HS[i * 3]; out[6] = 1;
      } else if (strip <= 2) {
        const s = strip === 1 ? 1 : -1;
        out[0] = W[o]; out[1] = W[o + 1]; out[2] = s * (hb * 0.75 + age * U * 0.09); out[3] = Math.min(1.6, 0.3 + age * 0.25);
        out[4] = W[o + 6] * 1.0 * Math.pow(Math.max(0, 1 - age / 5), 1.4); out[5] = HS[i * 3]; out[6] = s;
      } else {
        const s = strip === 3 ? 1 : -1;
        out[0] = W[o + 2]; out[1] = W[o + 3]; out[2] = s * (hb * 0.9 + age * U * TAN_KELVIN); out[3] = Math.min(1.8, 0.35 + age * 0.18);
        out[4] = W[o + 7] * 1.5 * (1 + 1.2 * Math.exp(-age / 0.8)) * Math.pow(Math.max(0, 1 - age / 8), 1.1); out[5] = HS[i * 3 + (s > 0 ? 1 : 2)]; out[6] = s;
      }
      return out;
    };
    const A = new Float32Array(7), B = new Float32Array(7);
    let v = 0;
    const put = (G, o, edge, kind) => {
      const c0 = G[2] + edge * G[3];
      D[v++] = G[0] + W[o + 4] * c0; D[v++] = G[5] + 0.05; D[v++] = G[1] + W[o + 5] * c0;
      D[v++] = edge * G[6]; D[v++] = G[4]; D[v++] = W[o + 8] * W[o + 9]; D[v++] = kind;
    };
    for (let k = 0; k + 1 < WAKE_N; k++) {
      const i = (this.wi + k) % WAKE_N, j = (i + 1) % WAKE_N, oi = i * WF, oj = j * WF;
      if (!(W[oi + 6] > 0 || W[oi + 7] > 0) || !(W[oj + 6] > 0 || W[oj + 7] > 0)) continue;
      for (let strip = 0; strip < STRIPS; strip++) {
        geo(oi, i, strip, A); geo(oj, j, strip, B);
        if (A[4] < 0.005 && B[4] < 0.005) continue;
        const kind = strip === 0 ? 0 : strip <= 2 ? 1 : 2;
        put(A, oi, -1, kind); put(A, oi, 1, kind); put(B, oj, 1, kind);
        put(A, oi, -1, kind); put(B, oj, 1, kind); put(B, oj, -1, kind);
      }
    }
    this.wakeVerts = v / 7;
  }
}
