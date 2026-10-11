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
// >>> SURFSPRAY
//   ?bdbg=notrail     a SURFBOARD's trail draw skipped (stage 5, 27 Sep 2026): the instrument
//                     for telling the trail from the sea's own shading in a film frame.
const TRAIL_OFF = BDBG === 'notrail';
// <<< SURFSPRAY
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

// >>> SURFSPRAY
// THE WATER A SURFBOARD THROWS, DRAWN AS WATER (stage 5 of the PIER SURF revamp, 27 Sep 2026; the
// look audit, tmp-audit/audit.json: "the spray looks like fog: round, unlit sprites fired sideways
// from the board-centre height"). The board's spray is drawn by a program of its OWN, with its own
// buffer and vertex array (stride 9: position, alpha/size/seed, VELOCITY), made the first time a
// board draws. The jet ski's and the RIB's spray keep SPRAY_VERT / SPRAY_FRAG above, their stride-6
// buffer and their packing loop byte for byte: nothing they run was edited, so their frames cannot
// move (A/B'd: tmp-audit/stage5-spray). No uniform in a shared program gates it - a separate program
// is the stronger guarantee, and it costs nothing a frame: only one craft is ever on screen.
//
// Per sprite, three things the old one lacked:
//   STREAKS   a droplet is smeared along its own motion on the screen over SURF.stretchT seconds -
//             where it will be a 30th of a second on, projected - into an ellipse up to 3x as long
//             as it is wide. A mist puff is big and slow, so it barely stretches.
//   BACKLIGHT droplets scatter forward: looking toward the sun through the sheet, brightness x
//             (1 + 1.4 pow(max(dot(view, sun), 0), 6)) - up to 2.4x - and a little more opaque. The
//             base is held under white (0.80-0.92 of the foam colour) so the glow has room to show.
//   FADE      a droplet (alpha stored NEGATIVE in the pool, the flag - see _surfFx) holds its alpha
//             through its flight and fades only in the last third, so the sheet keeps its top edge;
//             everything else fades as it always did.
// ⚠️ No array in either shader, const or otherwise (the b40 ANGLE/Intel scratch-memory trap).
// ⚠️ SHADER SOURCES ARE TEMPLATE LITERALS: no backtick inside them.
const SURF_SPRAY_VERT = `#version 300 es
precision highp float;
in vec3 aPos;
in vec3 aAux;
in vec3 aVel;
uniform mat4 uViewProj;
uniform float uPx;
uniform vec2 uVp;
uniform vec3 uCam;
uniform vec3 uSun;
uniform float uStretchT;
uniform float uDropPx;
out float vA;
out float vSeed;
out vec2 vDir;
out float vStretch;
out float vLit;
out float vGrain;
void main() {
  vec4 c = uViewProj * vec4(aPos, 1.0);
  gl_Position = c;
  float w = max(c.w, 0.2);
  // A DROPLET (under 0.1 m) is never drawn bigger than uDropPx however close it passes the lens:
  // near the camera a few droplets were most of the pass's pixels (tmp-audit/stage5-spray/cost.mjs).
  float base = clamp(aAux.y * uPx / w, 1.0, aAux.y < 0.1 ? uDropPx : 160.0);
  vec4 c2 = uViewProj * vec4(aPos + aVel * uStretchT, 1.0);
  vec2 d = (c2.xy / max(c2.w, 0.2) - c.xy / w) * 0.5 * uVp;
  float len = length(d);
  vStretch = clamp(1.0 + len / base, 1.0, 3.0);
  // gl_PointCoord runs DOWN the screen; clip space runs up.
  vDir = len > 0.001 ? vec2(d.x, -d.y) / len : vec2(1.0, 0.0);
  gl_PointSize = min(base * vStretch, 160.0);
  float s = max(dot(normalize(aPos - uCam), uSun), 0.0);
  float s2 = s * s;
  vLit = 1.4 * s2 * s2 * s2;
  vA = aAux.x;
  vSeed = aAux.z;
  // The sprite's grain: a mist puff is broken up by it; on a droplet a few pixels across the same
  // sines drew rings (tmp-audit/stage5-spray/out/AB-f201-zoom.jpg), so a droplet barely has any.
  vGrain = aAux.y < 0.1 ? 0.12 : 0.55;
}
`;

const SURF_SPRAY_FRAG = `#version 300 es
precision highp float;
in float vA;
in float vSeed;
in vec2 vDir;
in float vStretch;
in float vLit;
in float vGrain;
out vec4 fragColor;
uniform vec3 uFoam;
void main() {
  vec2 d = gl_PointCoord * 2.0 - 1.0;
  // Into the streak's own frame: along it, and across it squeezed by the stretch - an ellipse
  // base x stretch pixels long and base wide inside the enlarged point.
  vec2 e = vec2(dot(d, vDir), (d.y * vDir.x - d.x * vDir.y) * vStretch);
  float r = dot(e, e);
  if (r > 1.0) discard;
  float n = 0.5 + 0.25 * sin(e.x * 6.0 + vSeed * 3.1) * sin(e.y * 5.0 + vSeed * 1.7) + 0.25 * sin((e.x + e.y) * 9.0 + vSeed);
  float a = vA * (1.0 - smoothstep(0.30, 1.0, r)) * (1.0 - vGrain + vGrain * n);
  vec3 col = uFoam * (0.80 + 0.12 * (1.0 - gl_PointCoord.y)) * (1.0 + vLit);
  fragColor = vec4(min(col, vec3(1.0)), min(1.0, a * (1.0 + 0.25 * vLit)));
  ${SPRAY_MASK ? 'fragColor = vec4(1.0, 0.0, 1.0, 1.0);' : ''}
}
`;

// Every number of the board's water in one table (the jet ski's are SX, above, untouched).
const SURF = {
  // THE FAN: core droplets at twice the old sprite count, and a few mist puffs at its root.
  // ?gfx=lite (window.__gfx.tier, read per frame) keeps the old count of droplets and half the mist.
  dropRate: 1800, dropRateLite: 900, dropSize: 0.07, dropGrow: 0.04, dropAlpha: 0.9,
  mistRate: 90, mistRateLite: 45, mistSize: 0.25, mistGrow: 0.6, mistAlpha: 0.22,
  // Thrown off the OUTSIDE rail at its own water: velocity = board x carry + u x (face x F + back x
  // backward), F the rail's face normal - the outboard direction laid along the water surface, then
  // lifted up0 +- upJ/2 rad toward the surface normal. u = uMax (1 - uLo R^2), uMax = uK (0.5 +
  // throw) m/s capped at uCap: most droplets near the top speed, so every cross-section of the sheet
  // is dense at its upper EDGE. (Tuned on frames: at 43 deg and 5 m/s the sheet flew low and flat
  // at the chase camera - tmp-audit/stage5-spray/out/AB-carve-crops.jpg.)
  face: 0.8, back: 0.5, carry: 0.4, up0: 0.95, upJ: 0.3, uLo: 0.45, uK: 6, uCap: 10,
  floor: 0.3,          // m: a particle dies this far below its OWN spawn height
  // A droplet lives about its flight, at most flightCap s. The pool is a ring (SPRAY_N): a full skid
  // throws ~2,800 sprites a second and wraps it in ~1 s, so the last of the longest flights can be
  // cut short then - the same trade SPRAY_N's note makes for the jet ski's landings.
  flightCap: 1.3,
  // THE RAILS' hiss: droplets too (was 0.14 m growing 0.7 m/s - a fog of its own).
  hissSize: 0.06, hissGrow: 0.1, hissAlpha: 0.55,
  stretchT: 0.033,     // s of motion a droplet is smeared over on the screen (capped at 3x in SURF_SPRAY_VERT)
  dropPx: 0.02,        // x the viewport height: the most a droplet is drawn across, before its streak
  // THE WIPE-OUT'S WHITE WATER: a bloom in the trail ring, radius r0 + r1 (1 - exp(-age / tau)),
  // strength (1 - age / life)^pow - gone after `life` s.
  bloomLife: 2.5, bloomR0: 0.4, bloomR1: 1.6, bloomTau: 0.5, bloomPow: 1.2,
};
// The bloom's radius and strength at an age: the ONE definition (_fillWake reads it twice).
const bloomR = (age) => SURF.bloomR0 + SURF.bloomR1 * (1 - Math.exp(-age / SURF.bloomTau));
const bloomA = (age) => Math.pow(Math.max(0, 1 - age / SURF.bloomLife), SURF.bloomPow);
// <<< SURFSPRAY

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
    // SURFER: gl/surfers.js draws the board and rider; the water it throws and leaves is here (_surfFx).
    if (this.kind === 'surfboard') { this._surfFx(ft, sea, t); return; }
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
    // SURFER: gl/surfers.js draws the board and rider; its trail and its spray are drawn here.
    if (this.kind === 'surfboard') { this._surfDraw(vp, sunDir, exposure, sea, t, viewportH, fovY, cam); return; }
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

  // >>> SURFER
  // THE WATER A SURFBOARD THROWS (27 Sep 2026, the owner: "a pass on the quality of the person and
  // the surfboard and the graphics when they're actually up on the wave ... so that it looks really,
  // really good"). Until now the board threw nothing: a carve at 25 km/h left the face as it found
  // it. The same particle pool and trail ribbon the jet ski's are drawn with, fed by a board's own
  // emitters - scaled to a 2.2 m board and a person, not an engine:
  //   THE FAN     a hard carve throws a sheet off the outside rail, from the back half of the board
  //   THE RAILS   trimming fast, a fine hiss of spray off both rails amidships
  //   THE TRAIL   riding, a narrow white line left on the water; paddling, a faint one
  //   HANDS       paddling hard, a splash either side at each stroke
  //   MOMENTS     standing up, a kick-out (flicked off the back), a duck-dive, and a wipe-out (the big one)
  // READ-ONLY on the board. h: anything with the board's fields (surfer/replay.js runs it on a
  // recorded ride - x, z, heading, vx, vz, r, u, thr, state, yDraw).
  _surfFx(ft, sea, t) {
    const h = this.hull;
    if (!h || !(ft > 0)) return;
    const R = () => this._rnd();
    const ch = Math.cos(h.heading), sh = Math.sin(h.heading);
    const wx = (lx, lz) => h.x + ch * lx - sh * lz, wz = (lx, lz) => h.z + sh * lx + ch * lz;
    const sideX = -sh, sideZ = ch;
    const vx = h.vx || 0, vz = h.vz || 0, sp = Math.hypot(vx, vz), st = h.state | 0;
    const surf = sea ? sea.sample(h.x, h.z, t, 0, 3).height : (h.yDraw || 0);
    const F = this._sf || (this._sf = { last: st, stroke: 0 });
    // >>> SURFSPRAY
    // AIRBORNE (stage 6, surfboard.js: h.air is an object for the flight, null on the water). A board in
    // the air touches no water: no fan, no hiss, and the trail's samples are laid DEAD, so the line
    // breaks where it left the lip and starts again where it lands (the ring never joins a dead
    // sample). A replay's ghost has no `air` unless replay.js records it (see the stage-5 report).
    const air = !!h.air;
    // <<< SURFSPRAY
    const A = this.acc, cap = { n: 220 };
    const emit = (k, rate, fn) => { A[k] += rate * ft; while (A[k] >= 1 && cap.n-- > 0) { A[k] -= 1; fn(); } if (A[k] > 4) A[k] = 0; };
    const burst = (n, fn) => { for (let i = 0; i < n; i++) fn(); };

    // THE TRAIL: a sample every 0.05 s at the tail, with a point ahead for the outer arms.
    const W = this.wk;
    for (let i = 0; i < WAKE_N; i++) { const o = i * WF; if (W[o + 6] > 0 || W[o + 7] > 0) W[o + 8] += ft; }
    this.wAcc += ft;
    if (this.wAcc >= 0.05) {
      this.wAcc = 0;
      const o = this.wi * WF;
      W[o] = wx(-1.0, 0); W[o + 1] = wz(-1.0, 0); W[o + 2] = wx(0.4, 0); W[o + 3] = wz(0.4, 0);
      W[o + 4] = sideX; W[o + 5] = sideZ;
      W[o + 6] = air ? 0 : st === 2 ? 0.55 * cl(sp / 5, 0.3, 1) : st === 0 ? 0.14 * cl((h.u || 0) / 1.5, 0, 1) : 0;
      // The outer arms faint: at 0.3 they drew a wide, hard-edged glassy band across the face (27 Sep).
      W[o + 7] = st === 2 && !air ? 0.06 * cl((sp - 3) / 4, 0, 1) : 0;
      W[o + 8] = 0; W[o + 9] = sp; W[o + 10] = 0.28;
      this.wi = (this.wi + 1) % WAKE_N;
    }

    // >>> SURFSPRAY
    // BACK ON THE WATER (stage 6): a CLEAN landing - the air over, still riding - throws a small
    // splash off both rails, the board's weight coming down: 60 droplets and a few puffs. A bad
    // landing is a wipe-out (state 3, 'landing') and throws the wipe-out's water below instead.
    if (F.air && !air && st === 2) {
      burst(60, () => {
        const s = R() < 0.5 ? 1 : -1, lx = -0.9 + 1.2 * R(), lz = s * (0.25 + 0.1 * R()), out = 1.2 + 2.4 * R();
        const vy = 1.0 + 2.2 * R(), y0 = surf + 0.04;
        const flight = (vy + Math.sqrt(vy * vy + 2 * 9.81 * SURF.floor)) / 9.81;
        this._spawn(wx(lx, lz), y0, wz(lx, lz), vx * 0.5 + sideX * s * out, vy, vz * 0.5 + sideZ * s * out,
          Math.min(SURF.flightCap, flight * (0.85 + 0.4 * R())), SURF.dropSize, SURF.dropGrow, -SURF.dropAlpha, y0 - SURF.floor);
      });
      burst(8, () => {
        const s = R() < 0.5 ? 1 : -1, lx = -0.8 + R(), lz = s * 0.3, out = 0.4 + 0.8 * R();
        this._spawn(wx(lx, lz), surf + 0.05, wz(lx, lz), vx * 0.5 + sideX * s * out, 0.4 + 0.8 * R(), vz * 0.5 + sideZ * s * out,
          0.5 + 0.4 * R(), SURF.mistSize, SURF.mistGrow, SURF.mistAlpha, surf - 0.25);
      });
    }
    F.air = air;
    // <<< SURFSPRAY
    // THE MOMENTS: a change of state throws its own water, once.
    if (st !== F.last) {
      const from = F.last; F.last = st;
      const ring = (n, out0, outR, up0, upR, size, l0, lr, alpha, lx0, lxR) => burst(n, () => {
        const s = R() < 0.5 ? 1 : -1, lx = lx0 + lxR * R(), lz = s * (0.2 + 0.15 * R()), out = out0 + outR * R();
        this._spawn(wx(lx, lz), surf + 0.05, wz(lx, lz), vx * 0.5 + sideX * s * out, up0 + upR * R(), vz * 0.5 + sideZ * s * out,
          l0 + lr * R() * R(), size, 0.9, alpha, surf - 0.15);
      });
      if (st === 2) ring(40, 0.5, 1.5, 0.8, 1.4, 0.2, 0.35, 0.5, 0.55, -0.6, 1.2);             // on your feet
      else if (st === 3) {
        // >>> SURFSPRAY
        // A WIPE-OUT (stage 5): the same 150 thrown the same way - up and out all round, carried on at
        // half the board's speed - but as DROPLETS, each a streak for its own flight, not 0.3 m of fog
        // growing 0.9 m/s (in the replay it read as two cotton-wool balls either side: tmp-audit/
        // stage5-spray/out/A-rp-wipe.jpg); 30 mist puffs at the root; and the white water it leaves
        // on the water, the bloom.
        burst(150, () => {
          const s = R() < 0.5 ? 1 : -1, lx = -0.8 + 1.6 * R(), lz = s * (0.2 + 0.15 * R()), out = 1.0 + 3.2 * R();
          const vy = 1.4 + 3.2 * R(), y0 = surf + 0.05;
          const flight = (vy + Math.sqrt(vy * vy + 2 * 9.81 * SURF.floor)) / 9.81;
          this._spawn(wx(lx, lz), y0, wz(lx, lz), vx * 0.5 + sideX * s * out, vy, vz * 0.5 + sideZ * s * out,
            Math.min(SURF.flightCap, flight * (0.85 + 0.4 * R())), SURF.dropSize, SURF.dropGrow, -SURF.dropAlpha, y0 - SURF.floor);
        });
        ring(30, 0.5, 1.5, 0.5, 1.2, 0.3, 0.5, 0.8, 0.35, -0.8, 1.6);
        this._surfBloom(h, vx, vz);
        // <<< SURFSPRAY
      }
      else if (st === 1) ring(30, 0.3, 1.0, 0.5, 1.2, 0.18, 0.3, 0.4, 0.5, 0.6, 0.5);          // pushed under
      else if (st === 0 && from === 2) {
        // A kick-out: the board flicked round over the back of the wave - a rooster off the tail.
        burst(60, () => {
          const lx = -1.0 + 0.3 * R(), lz = (R() - 0.5) * 0.4, back = 1 + 2.5 * R();
          this._spawn(wx(lx, lz), surf + 0.05, wz(lx, lz), vx * 0.3 - ch * back + sideX * (R() - 0.5) * 1.5, 1.5 + 2.5 * R(),
            vz * 0.3 - sh * back + sideZ * (R() - 0.5) * 1.5, 0.4 + 0.6 * R() * R(), 0.24, 0.9, 0.6, surf - 0.15);
        });
      }
    }

    if (st === 2 && !air) {
      // THE FAN: thrown outboard of the turn. Keyed on the rail letting go (27 Sep 2026, stage 2): since
      // surfboard.js grips its rail, a turn no longer scrubs speed sideways, and past the rail's grip it
      // SKIDS (h.skid 0..1) - that is the sheet of water a snap throws: up to half as much again, thrown
      // harder. The lateral g (speed x yaw rate) stays as the floor, so a carve that holds its rail
      // throws its fan exactly as it did. (The rail only lets go past 1 g, where the floor is already
      // full: a skid is always ON TOP of a full carve fan, never instead of one.)
      const latG = Math.abs(sp * (h.r || 0)) / 9.81, so = (h.r || 0) > 0 ? -1 : 1, sk = cl((h.skid || 0) / 0.3, 0, 1);
      const fan = Math.max(cl((latG - 0.15) / 0.6, 0, 1), sk) * (1 + 0.5 * sk), throwK = Math.min(1, Math.max(latG, sk)) + 0.5 * sk;
      // >>> SURFSPRAY
      // A SHEET, NOT A CLOUD (stage 5, 27 Sep 2026; the look audit: "round, unlit sprites fired
      // sideways from the board-centre height"). It was 900 x fan 0.22 m sprites a second, each
      // GROWING 0.9 m/s - so every one was 0.5-1 m of fog by the time it was seen - born at the sea
      // height under the board's CENTRE and thrown flat outboard plus a random 1.5-5 m/s up, whatever
      // the face was doing. Now:
      //   WHERE  the outside rail's own water: two samples along it (the tail and the middle of its
      //          back half), the height between them at each particle's place, and their mean
      //          normal. On a face the water under the rail is not the water under the centre
      //          (10 cm apart on average on test-surf-spray.mjs's face, where the old spawn missed it).
      //   WHICH WAY  off the rail's face: the outboard direction laid along the water surface, then
      //          lifted off it by up0 +- upJ/2 rad toward the surface normal - so on a face the sheet
      //          leaves square to the face, not square to the horizon - and a little of it backward
      //          (the water is left behind): u x (face normal x 0.8 + backward x 0.5), plus 0.4 of
      //          the board's own velocity, as before. One launch angle (a little jitter), and the
      //          speed leaning hard to the top of its range (1 - uLo R^2), so the fast droplets are
      //          the many and the sheet has an upper EDGE (test-surf-spray.mjs measures it, seen).
      //   HOW LONG  a droplet lives about its own flight - up and back down to 0.3 m under where it
      //          left (its floor: SURF.floor) - so it falls back into the water rather than fading
      //          out in the air; it holds its alpha through the flight (the negative-alpha flag).
      //   WHAT   0.07 m droplets at twice the old count, plus a few 0.25 m mist puffs at the root.
      // ?gfx=lite keeps the old count of droplets (they are ~10x fewer pixels each) and half the mist.
      const fk = fan * smooth(2.5, 5, sp);
      if (fk > 0) {
        const lzR = so * 0.3;
        let hA = surf, hB = surf, nx = 0, ny = 1, nz = 0;
        if (sea) {
          let s = sea.sample(wx(-0.9, lzR), wz(-0.9, lzR), t, 0, 3);
          hA = s.height; nx = s.nx; ny = s.ny; nz = s.nz;
          s = sea.sample(wx(-0.2, lzR), wz(-0.2, lzR), t, 0, 3);
          hB = s.height; nx += s.nx; ny += s.ny; nz += s.nz;
          const l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
          nx /= l; ny /= l; nz /= l;
        }
        // Outboard, laid along the water (the part of it across the normal), unit.
        const ox = sideX * so, oz = sideZ * so, on = ox * nx + oz * nz;
        let tx = ox - nx * on, ty = -ny * on, tz = oz - nz * on;
        const tl = Math.sqrt(tx * tx + ty * ty + tz * tz) || 1;
        tx /= tl; ty /= tl; tz /= tl;
        const uMax = Math.min(SURF.uCap, SURF.uK * (0.5 + throwK));
        const lite = typeof globalThis !== 'undefined' && globalThis.__gfx && globalThis.__gfx.tier === 'lite';
        const K = SURF.face, B = SURF.back, C = SURF.carry;
        emit(0, (lite ? SURF.dropRateLite : SURF.dropRate) * fk, () => {
          const lx = -0.9 + 0.7 * R(), y0 = hA + (hB - hA) * ((lx + 0.9) / 0.7) + 0.03;
          const a = SURF.up0 + SURF.upJ * (R() - 0.5), ca = Math.cos(a), sa = Math.sin(a);
          const r2 = R(), u = uMax * (1 - SURF.uLo * r2 * r2);
          const fx = tx * ca + nx * sa, fy = ty * ca + ny * sa, fz = tz * ca + nz * sa;
          const vy = u * K * fy;
          // Its flight: up and back down to the floor (drag ignored - it only shortens it).
          const flight = (vy + Math.sqrt(Math.max(0, vy * vy + 2 * 9.81 * SURF.floor))) / 9.81;
          this._spawn(wx(lx, lzR), y0, wz(lx, lzR), vx * C + u * (K * fx - B * ch), vy, vz * C + u * (K * fz - B * sh),
            Math.min(SURF.flightCap, flight * (0.85 + 0.4 * R())), SURF.dropSize, SURF.dropGrow, -SURF.dropAlpha, y0 - SURF.floor);
        });
        emit(2, (lite ? SURF.mistRateLite : SURF.mistRate) * fk, () => {
          const lx = -0.9 + 0.7 * R(), y0 = hA + (hB - hA) * ((lx + 0.9) / 0.7) + 0.05;
          const a = SURF.up0 + SURF.upJ * (R() - 0.5), ca = Math.cos(a), sa = Math.sin(a);
          const u = uMax * 0.35 * (0.5 + 0.5 * R());
          const fx = tx * ca + nx * sa, fy = ty * ca + ny * sa, fz = tz * ca + nz * sa;
          this._spawn(wx(lx, lzR), y0, wz(lx, lzR), vx * 0.5 + u * (K * fx - B * ch), u * K * fy, vz * 0.5 + u * (K * fz - B * sh),
            0.5 + 0.5 * R(), SURF.mistSize, SURF.mistGrow, SURF.mistAlpha, y0 - SURF.floor);
        });
      }
      // THE RAILS: a fine hiss either side when trimming fast - droplets now, not 0.14 m of growing fog.
      emit(1, 140 * smooth(4, 8, sp), () => {
        const s = R() < 0.5 ? 1 : -1, lx = 0.1 + 0.5 * R(), lz = s * 0.29, out = 0.8 + 0.8 * R();
        this._spawn(wx(lx, lz), surf + 0.04, wz(lx, lz), vx * 0.6 + sideX * s * out, 0.6 + 0.8 * R(), vz * 0.6 + sideZ * s * out,
          0.25 + 0.25 * R(), SURF.hissSize, SURF.hissGrow, SURF.hissAlpha, surf - 0.1);
      });
      // <<< SURFSPRAY
    } else if (st === 0) {
      // HANDS: paddling hard, a splash either side once a stroke (~0.9 s a stroke at full effort).
      const thr = cl(h.thr || 0, 0, 1);
      F.stroke += ft / (1.25 - 0.45 * thr) * (thr > 0.2 ? 1 : 0);
      if (F.stroke >= 0.5) {
        F.stroke -= 0.5;
        const s = (F.side = -(F.side || 1));
        burst(Math.round(6 + 8 * thr), () => {
          const lx = 0.35 + 0.3 * R(), lz = s * (0.45 + 0.15 * R()), out = 0.3 + 0.6 * R();
          this._spawn(wx(lx, lz), surf + 0.03, wz(lx, lz), vx * 0.5 + sideX * s * out, 0.5 + 0.8 * R(), vz * 0.5 + sideZ * s * out,
            0.2 + 0.25 * R(), 0.1, 0.6, 0.45, surf - 0.08);
        });
      }
    }

    // Integrate the pool (effects() does the same for a boat).
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

  // >>> SURFSPRAY
  // THE WIPE-OUT'S WHITE WATER (stage 5, 27 Sep 2026). The 150-droplet burst is the splash; this is
  // what it leaves on the water: a patch of foam where you went in, pushed into the TRAIL RING (so a
  // replay's save / clear / restore carries it with everything else) as four samples in a row along
  // the line you were travelling, marked W[o + 10] < 0, with a dead sample either side so no trail
  // segment joins it. _fillWake draws the four as one lens: half-width W[o + 9] x bloomR(age) (the
  // ends 0.45 of the middle), strength bloomA(age) - growing from 0.4 m to about 2 m and gone in
  // 2.5 s - each cross-section laid between the sea heights at its own two edges, so a 4 m patch
  // on a wave face lies ON the face and does not cut into it.
  _surfBloom(h, vx, vz) {
    const W = this.wk, sp = Math.hypot(vx, vz);
    const dx = sp > 1 ? vx / sp : Math.cos(h.heading), dz = sp > 1 ? vz / sp : Math.sin(h.heading);
    const lay = (along, prof) => {
      const o = this.wi * WF, x = h.x + dx * along, z = h.z + dz * along;
      W[o] = x; W[o + 1] = z; W[o + 2] = x; W[o + 3] = z; W[o + 4] = -dz; W[o + 5] = dx;
      W[o + 6] = prof > 0 ? 1 : 0; W[o + 7] = 0; W[o + 8] = 0; W[o + 9] = prof; W[o + 10] = prof > 0 ? -1 : 0.28;
      this.wi = (this.wi + 1) % WAKE_N;
    };
    // Centred a little ahead of where the board was: the rider and the board carry on into it.
    lay(0, 0); lay(-1.2, 0.45); lay(0, 1); lay(1.2, 1); lay(2.4, 0.45); lay(0, 0);
  }

  // The board's spray program: made on the FIRST board draw, so no other craft's page ever compiles
  // it. If it will not link, the board falls back to the shared program, exactly as before stage 5.
  _surfGL() {
    if (this._sgl !== undefined) return this._sgl;
    const gl = this.gl;
    try {
      const prog = link(gl, SURF_SPRAY_VERT, SURF_SPRAY_FRAG, 'boat-surfspray', { aPos: 0, aAux: 1, aVel: 2 });
      const u = uniforms(gl, prog, ['uViewProj', 'uFoam', 'uPx', 'uVp', 'uCam', 'uSun', 'uStretchT', 'uDropPx']);
      const data = new Float32Array(SPRAY_N * 9);
      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      const vbo = buffer(gl, gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 36, 0);
      gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 36, 12);
      gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 36, 24);
      gl.bindVertexArray(null);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
      this._sgl = { prog, u, data, vao, vbo };
    } catch (e) {
      console.warn('[gl]', e.message, '- the board keeps the shared spray program');
      this._sgl = null;
    }
    return this._sgl;
  }
  // <<< SURFSPRAY

  // The board's trail and spray: draw()'s own two passes, without a hull (gl/surfers.js has it).
  _surfDraw(vp, sunDir, exposure, sea, t, viewportH, fovY, cam) {
    const gl = this.gl;
    const sun = Math.max(0.35, sunDir[1]) * (1 - 0.3 * OVERCAST.v);
    // The foam colour as three numbers, not an array and a .map() closure every frame (27 Sep 2026).
    const f0 = Math.min(0.97, (0.80 * sun + 0.3) * exposure), f1 = Math.min(0.97, (0.84 * sun + 0.3) * exposure);
    const f2 = Math.min(0.97, (0.86 * sun + 0.3) * exposure);
    this._fillWake(sea, t);
    if (this.wakeVerts && !TRAIL_OFF) {
      gl.useProgram(this.foamProg);
      gl.uniformMatrix4fv(this.foamU.uViewProj, false, vp);
      gl.uniform3f(this.foamU.uFoam, f0, f1, f2);
      gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false); gl.disable(gl.CULL_FACE);
      gl.bindVertexArray(this.wakeVao);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.wakeVbo);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.wakeData, 0, this.wakeVerts * 7);
      gl.drawArrays(gl.TRIANGLES, 0, this.wakeVerts);
      gl.depthMask(true); gl.disable(gl.BLEND);
    }
    // >>> SURFSPRAY
    // Stride 9: position, alpha / size / seed, and the particle's VELOCITY (the streak). A droplet's
    // alpha is stored negative (_surfFx): it holds through the flight and fades in the last third.
    const P = this._surfGL();
    const K = P ? 9 : 6;
    let n = 0;
    const S = this.sp, D = P ? P.data : this.sprayData;
    for (let i = 0; i < SPRAY_N; i++) {
      const q = i * PF;
      if (S[q + 6] <= 0) continue;
      const lf = S[q + 6] / S[q + 7], o = n * K, a0 = S[q + 10], fin = Math.min(1, (S[q + 7] - S[q + 6]) * SX.fadeIn);
      D[o] = S[q]; D[o + 1] = S[q + 1]; D[o + 2] = S[q + 2];
      D[o + 3] = a0 < 0 ? -a0 * smooth(0, 0.35, lf) * fin : a0 * Math.pow(lf, SX.fadePow) * fin;
      D[o + 4] = S[q + 8]; D[o + 5] = (i * 0.618) % 7;
      if (P) { D[o + 6] = S[q + 3]; D[o + 7] = S[q + 4]; D[o + 8] = S[q + 5]; }
      n++;
    }
    this.sprayCount = n;
    if (n && !SPRAY_OFF) {
      const uPx = viewportH / (2 * Math.tan(fovY / 2));
      if (P) {
        const U = P.u;
        gl.useProgram(P.prog);
        gl.uniformMatrix4fv(U.uViewProj, false, vp);
        gl.uniform3f(U.uFoam, f0, f1, f2);
        gl.uniform1f(U.uPx, uPx);
        gl.uniform2f(U.uVp, viewportH * (gl.drawingBufferWidth / Math.max(1, gl.drawingBufferHeight)), viewportH);
        gl.uniform3f(U.uCam, cam ? cam.x : 0, cam ? cam.y : 0, cam ? cam.z : 0);
        gl.uniform3f(U.uSun, sunDir[0], sunDir[1], sunDir[2]);
        gl.uniform1f(U.uStretchT, SURF.stretchT);
        gl.uniform1f(U.uDropPx, Math.max(2, SURF.dropPx * viewportH));
      } else {
        gl.useProgram(this.sprayProg);
        gl.uniformMatrix4fv(this.sprayU.uViewProj, false, vp);
        gl.uniform3f(this.sprayU.uFoam, f0, f1, f2);
        gl.uniform1f(this.sprayU.uPx, uPx);
      }
      gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);
      gl.bindVertexArray(P ? P.vao : this.sprayVao);
      gl.bindBuffer(gl.ARRAY_BUFFER, P ? P.vbo : this.sprayVbo);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, D, 0, n * K);
      gl.drawArrays(gl.POINTS, 0, n);
      gl.depthMask(true); gl.disable(gl.BLEND);
    }
    // <<< SURFSPRAY
    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  // A replay (surfer/replay.js) runs these emitters on a recorded ride: everything they hold, to
  // set aside while it plays and put back after.
  surfFxSave() {
    return { sp: this.sp.slice(), wk: this.wk.slice(), acc: this.acc.slice(), si: this.si, wi: this.wi, wAcc: this.wAcc, seed: this.seed,
      sf: this._sf ? { ...this._sf } : null, hull: this.hull };
  }
  surfFxClear() { this.sp.fill(0); this.wk.fill(0); this.acc.fill(0); this.wAcc = 0; this._sf = null; }
  surfFxRestore(k) {
    this.sp.set(k.sp); this.wk.set(k.wk); this.acc.set(k.acc);
    this.si = k.si; this.wi = k.wi; this.wAcc = k.wAcc; this.seed = k.seed; this._sf = k.sf; this.hull = k.hull;
  }
  // <<< SURFER

  // Five strips from the ring buffer, oldest -> newest, laid on the sea.
  _fillWake(sea, t) {
    const W = this.wk, D = this.wakeData, HS = this.hs, jet = this.kind === 'jetski';
    // SURFER: a board's trail is a rail's width and short-lived (the face it is drawn on moves on).
    const board = this.kind === 'surfboard';
    // >>> SURFSPRAY  a board's centre line fades in 2 s, not 3 (stage 5: the look audit - see geo() below).
    const tw = jet ? 4.5 : board ? 2 : 5, hw0 = jet ? 0.32 : board ? 0.22 : 0.6;
    // <<< SURFSPRAY
    if (board) {
      // SURFER: THE TRAIL SAMPLES ONLY WHAT IT DRAWS (27 Sep 2026, the PIER SURF perf audit). The
      // ring never retires a sample - W[o + 6] is set when it is laid and never zeroed - so all 170
      // stayed "live" for 8.5 s and each cost three sea.sample() a frame (510), while a board's centre
      // line has faded out by 3 s, its side lines by 5 s, and its outer arms (W[o + 7]) are zero unless
      // riding fast. So: decide what can be SEEN first, with no sea reads - the same alphas geo()
      // computes below, and the same test it skips a strip on (a float32 of an alpha under 0.005 is
      // under 0.005 too, so nothing drawn is ever missed) - then sample the water only under a sample
      // that is visible or next to one (a segment is drawn if either end is), and the arms' two
      // points only where an arm is. The vertex buffer is bit-identical over a 26 s paddle-ride-paddle
      // run and on random rings (tmp-audit/perf/fillwake-opt.mjs, 260 fills; tmp-tr161/suites-live/
      // test-surf-perf.mjs). Sea reads a fill: paddling 388 -> 159, riding 510 -> 266. Measured in
      // headless Chrome, paddling (tmp-audit/stage1-perf, A/B on the same tree): 3.4-3.9 -> 0.7-0.9 ms
      // a frame at a 4x CPU throttle, 0.94-1.07 -> 0.23-0.26 ms unthrottled; 1,250 -> 615 us in Node.
      // The jet ski's and the RIB's wakes take the loop below, as before.
      const vis = this._wvis || (this._wvis = new Uint8Array(WAKE_N));
      for (let i = 0; i < WAKE_N; i++) {
        const o = i * WF;
        if (!(W[o + 6] > 0 || W[o + 7] > 0)) { vis[i] = 0; continue; }
        const age = W[o + 8];
        // >>> SURFSPRAY  a wipe-out's bloom (_surfBloom): one strip, its own life; bit 4 = sample its edges.
        if (W[o + 10] < 0) { vis[i] = W[o + 6] * bloomA(age) < 0.005 ? 0 : 5; continue; }
        // <<< SURFSPRAY
        const a0 = W[o + 6] * Math.pow(Math.max(0, 1 - age / tw), 1.3);
        const a1 = W[o + 6] * 1.0 * Math.pow(Math.max(0, 1 - age / 5), 1.4);
        const a3 = W[o + 7] !== 0 ? W[o + 7] * 1.5 * (1 + 1.2 * Math.exp(-age / 0.8)) * Math.pow(Math.max(0, 1 - age / 8), 1.1) : 0;
        vis[i] = (!(a0 < 0.005) || !(a1 < 0.005) ? 1 : 0) | (!(a3 < 0.005) ? 2 : 0);
      }
      for (let i = 0; i < WAKE_N; i++) {
        const o = i * WF;
        if (!(W[o + 6] > 0 || W[o + 7] > 0)) continue;
        const nb = vis[i] | vis[i + 1 < WAKE_N ? i + 1 : 0] | vis[i > 0 ? i - 1 : WAKE_N - 1];
        if (!nb) continue;
        HS[i * 3] = sea ? sea.sample(W[o], W[o + 1], t, 0, 3).height : 0;
        // >>> SURFSPRAY  a bloom: the water under its two edges, where its cross-section is laid.
        if (W[o + 10] < 0) {
          const r = W[o + 9] * bloomR(W[o + 8]);
          HS[i * 3 + 1] = sea ? sea.sample(W[o] + W[o + 4] * r, W[o + 1] + W[o + 5] * r, t, 0, 3).height : 0;
          HS[i * 3 + 2] = sea ? sea.sample(W[o] - W[o + 4] * r, W[o + 1] - W[o + 5] * r, t, 0, 3).height : 0;
        } else
        // <<< SURFSPRAY
        if (nb & 2) {
          const age = W[o + 8], off = W[o + 10] * 0.9 + age * W[o + 9] * TAN_KELVIN;
          HS[i * 3 + 1] = sea ? sea.sample(W[o + 2] + W[o + 4] * off, W[o + 3] + W[o + 5] * off, t, 0, 3).height : 0;
          HS[i * 3 + 2] = sea ? sea.sample(W[o + 2] - W[o + 4] * off, W[o + 3] - W[o + 5] * off, t, 0, 3).height : 0;
        }
      }
    } else {
      for (let i = 0; i < WAKE_N; i++) {
        const o = i * WF;
        if (!(W[o + 6] > 0 || W[o + 7] > 0)) continue;
        const age = W[o + 8], off = W[o + 10] * 0.9 + age * W[o + 9] * TAN_KELVIN;
        HS[i * 3] = sea ? sea.sample(W[o], W[o + 1], t, 0, 3).height : 0;
        HS[i * 3 + 1] = sea ? sea.sample(W[o + 2] + W[o + 4] * off, W[o + 3] + W[o + 5] * off, t, 0, 3).height : 0;
        HS[i * 3 + 2] = sea ? sea.sample(W[o + 2] - W[o + 4] * off, W[o + 3] - W[o + 5] * off, t, 0, 3).height : 0;
      }
    }
    // geo(sample, strip) -> [originX, originZ, centre offset, half width, alpha, height, flip]
    const geo = (o, i, strip, out) => {
      const age = W[o + 8], U = W[o + 9], hb = W[o + 10];
      // >>> SURFSPRAY
      // A WIPE-OUT'S BLOOM (_surfBloom): the centre strip only, W[o + 9] of bloomR(age) wide.
      if (board && hb < 0) {
        out[0] = W[o]; out[1] = W[o + 1]; out[2] = 0; out[3] = strip === 0 ? U * bloomR(age) : 0;
        out[4] = strip === 0 ? W[o + 6] * bloomA(age) : 0; out[5] = HS[i * 3]; out[6] = 1;
        return out;
      }
      // A BOARD'S CENTRE LINE stays a line: it widened 0.45 m a second to 2.6 m, and a flat strip that
      // wide, laid at the height of the water under its middle, showed as a pale straight-edged sheet
      // trailing across the face - the band in the old film (lslow f481). Filmed with ?bdbg=notrail it
      // goes (tmp-audit/stage5-spray/out/band-zoom.jpg); the one thin straight line left is the surf
      // wave's own straight crest, not the trail. The jet ski's and the RIB's are untouched.
      // <<< SURFSPRAY
      if (strip === 0) {
        out[0] = W[o]; out[1] = W[o + 1]; out[2] = 0; out[3] = board ? Math.min(0.6, hw0 + age * 0.15) : Math.min(2.6, hw0 + age * 0.45);
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
    // Two scratch rows, kept (27 Sep 2026): a pair of new Float32Array(7) every frame was garbage for
    // nothing - geo() writes all seven fields before either is read.
    const A = this._fwA || (this._fwA = new Float32Array(7)), B = this._fwB || (this._fwB = new Float32Array(7));
    let v = 0;
    const put = (G, o, edge, kind) => {
      const c0 = G[2] + edge * G[3];
      // >>> SURFSPRAY  a bloom's edge sits on the water under that edge (sampled above), not its middle's.
      const y = board && W[o + 10] < 0 ? HS[(o / WF) * 3 + (edge > 0 ? 1 : 2)] : G[5];
      D[v++] = G[0] + W[o + 4] * c0; D[v++] = y + 0.05; D[v++] = G[1] + W[o + 5] * c0;
      // <<< SURFSPRAY
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
