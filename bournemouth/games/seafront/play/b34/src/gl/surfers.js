// SURFERS ON THE BANKS BESIDE THE PIER — scenery, and only scenery.
//
// The owner's own footage ("Bournemouth Pier Surfers", Nov 2025) shows about a
// dozen people sitting in a line-up hard against the pier's flank, taking off on
// the outer break and paddling back out. That is what this draws.
//
// ---------------------------------------------------------------------------
// THE RULES THIS FILE OBEYS, and they are not negotiable
// ---------------------------------------------------------------------------
//  * IT NEVER AFFECTS PLAY. Nothing here is read by the sim, the plant, the
//    hulls, the rescue mode or the raid. It has no collision shape, it is not in
//    any obstacle list, and it writes to nothing but its own instance buffers.
//    A surfer cannot be hit, cannot be run over and cannot block a craft.
//  * NOBODY IS IN DANGER. They sit, paddle, ride and fall off; a fall is a
//    tumble and a swim back to the board. There is no rescue, no distress, no
//    casualty. The rescue mode has its own people and they are a different
//    thing entirely.
//  * NOBODY IS REAL AND NOTHING IS BRANDED. Neutral wetsuit, neutral board, a
//    plain skin tone, no logo, no text, no livery, no flag, no face.
//  * NO Math.random ANYWHERE. Every per-surfer difference comes from a hash of
//    the surfer's index, so the line-up is the same line-up every session.
//
// ---------------------------------------------------------------------------
// COST
// ---------------------------------------------------------------------------
// One program, THREE instanced draw calls (prone, standing, loose board) for the
// whole line-up whatever it is doing. Meshes are built once in the constructor;
// a frame rewrites at most 14 x 12 floats. Drawn after the coast, into the same
// depth buffer, with the renderer's own view-projection.
//
// ⚠️ No backtick may appear inside the GLSL template literals below.

import { link, uniforms, buffer } from './core.js';
import { MeshBuilder } from './meshes.js';
import { SKY_GLSL } from './shaders.js';
// >>> ENVREF
import { SHADOW_GLSL } from './shadow.js';
import { ENV_OFF, ENV_CONST } from './craft.js';
const CDBG_SURF = (typeof location !== 'undefined' && typeof URLSearchParams !== 'undefined'
  ? (new URLSearchParams(location.search).get('cdbg') || '') : '').split(',');
// <<< ENVREF
import { SURF, surfSample, makeSurfSlot, shoreCoords } from '../sea-surf.js';
// >>> SURFERS
// The set clock. Imported rather than retyped so the break line cannot drift
// from the sea's own set/lull, which is what it is solved against.
import { setFactor } from '../sea-surf.js';
// <<< SURFERS
import { DIR as PIER_DIR } from './pier.js';
// >>> SURFER  the player's own jointed figure (26 Sep 2026); the line-up keeps the figures below.
import { SurferFigure, wipeBoard, swimPoint, wipePhase, rotPoint } from './surfer-figure.js';
// <<< SURFER

const ATTR = { aPos: 0, aNormal: 1, aColor: 2, aAnim: 3, aInst0: 4, aInst1: 5, aInst2: 6 };
const MAX_INST = 24;
const INST_FLOATS = 12;
// >>> SURFERS

// THE STROKE PIVOT. The paddling rotation below turned p.xy about the MODEL
// ORIGIN, which sits under the chest - so the shoulder swung with the arm and
// the figure dislocated itself once per cycle. It was invisible only because
// the arms were buried in the torso. Rotating about the shoulder instead is
// two lines and it is what makes an arm long enough to reach the water
// survivable. ?cdbg=oldmesh puts the origin back, verbatim.
// ⚠️ aAnim tags the PRONE arms only; buildRider's arms are added with the
// default anim 0, so nothing on the standing figure is affected.
// ⚠️ No backtick below this line.
const PIVOT_GLSL = (typeof location !== 'undefined' && typeof URLSearchParams !== 'undefined'
  ? (new URLSearchParams(location.search).get('cdbg') || '') : '').split(',').includes('oldmesh')
  ? 'const vec2 ARM_PIVOT = vec2(0.0, 0.0);\n'
  : 'const vec2 ARM_PIVOT = vec2(0.20, 0.155);\n';

// <<< SURFERS
// >>> SURFBOARDS  (27 Sep 2026)
// THE BOARDS GET THEIR PAINT, AND THE LINE-UP SURFS. The owner: "some work into the other surfers
// so that they have more colourful ... classy surfboards ... look a lot more realistic and ... they
// surf really well on the waves doing different sort of tricks". This file once kept the line-up
// deliberately dull ("scenery beside a pier", PAINT below); the owner has asked for the opposite,
// so the BOARDS carry colour. The wetsuits stay the black a September line-up actually wears.
//
// A board's paint is worked out in the fragment shader from its own model-space position - deck,
// rail and bottom; a stringer, a sprayed rail, a stripe, a two-tone split, a fade - and each
// surfer's look (a design and two colours) rides in the instance (aInst2.yzw), so it costs nothing
// per frame and no two boards in the line-up match. Resin tints, sprayed rails, pastel two-tones,
// racing stripes and wood-stringer longboards: what a beach-break line-up really paddles.
const hexLin = (h) => { const n = parseInt(h.slice(1), 16), f = (c) => Math.pow(c / 255, 2.2); return [f((n >> 16) & 255), f((n >> 8) & 255), f(n & 255)]; };
const BOARD_PAL = ['#F3F1EA', '#EFE4C8', '#C98A2E', '#2FA3A0', '#2D5FA6', '#B8382F', '#E0AC3A',
  '#8FD1B8', '#94C3E8', '#F2B08E', '#A99AD2', '#6B4A2E', '#2C3238', '#E86A4A'];
const PAL = { white: 0, cream: 1, amber: 2, teal: 3, cobalt: 4, red: 5, mustard: 6, mint: 7, sky: 8,
  peach: 9, lilac: 10, wood: 11, charcoal: 12, coral: 13 };
// [design, colour A, colour B]. Designs: 0 a clear resin tint with a white stringer, 1 a white deck
// with sprayed rails, 2 a two-tone split with a pinline, 3 a racing stripe, 4 a longboard (tinted
// deck, darker rails, a wood stringer), 5 a fade from tail to nose. 9 = no paint (vertex colours).
export const BOARD_LOOKS = [
  [0, PAL.amber, PAL.white], [1, PAL.cobalt, PAL.white], [2, PAL.mint, PAL.cream], [3, PAL.red, PAL.charcoal],
  [4, PAL.cream, PAL.wood], [5, PAL.peach, PAL.lilac], [0, PAL.teal, PAL.white], [1, PAL.coral, PAL.white],
  [2, PAL.sky, PAL.white], [3, PAL.mustard, PAL.charcoal], [4, PAL.teal, PAL.wood], [5, PAL.sky, PAL.mint],
  [0, PAL.cobalt, PAL.white], [1, PAL.teal, PAL.white]];
export const PLAYER_BOARD = [3, PAL.teal, PAL.charcoal];
const PLAYER_FX = { banked: 1 };   // the player's figure's extras (gl/surfer-figure.js update's X)
const BOARD_PAL_GLSL = 'const vec3 BPAL[' + BOARD_PAL.length + '] = vec3[' + BOARD_PAL.length + '](\n'
  + BOARD_PAL.map((h) => '  vec3(' + hexLin(h).map((v) => v.toFixed(4)).join(', ') + ')').join(',\n') + ');';
// <<< SURFBOARDS

const VERT = `#version 300 es
precision highp float;
in vec3 aPos;
in vec3 aNormal;
in vec3 aColor;
in float aAnim;
in vec4 aInst0;   // x, y, z, yaw
in vec4 aInst1;   // pitch, roll, phase, scale
in vec4 aInst2;   // stroke amount; SURFBOARDS: board design (+10 = the player's, capped), colour A, colour B
uniform mat4 uViewProj;
uniform float uTime;
// >>> SURFERS
${PIVOT_GLSL}// <<< SURFERS
out vec3 vWorld;
out vec3 vNormal;
out vec3 vColor;
// >>> SURFER  per-vertex roughness: aAnim < 0 carries it (the player's figure only); else the old constant.
out float vRough;
// <<< SURFER
// >>> SURFBOARDS
out vec3 vLocal;   // model-space position, for the board's paint
out float vNy;     // model-space normal y: deck, rail or bottom
out float vTag;    // aAnim: 3 = a board
out vec3 vPaint;   // aInst2.yzw
// <<< SURFBOARDS

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
  // aAnim tags the arms. A paddling stroke swings them about the shoulder line;
  // aInst2.x is how much of a stroke this pose wants (1 prone, 0 riding).
  // SURFBOARDS: 1 and 2 only - 3 is a board, which must not swing.
  if (aAnim > 0.5 && aAnim < 2.5) {
    float a = sin(uTime * 3.4 + aInst1.z + aAnim * 3.14159) * 0.75 * aInst2.x;
    float c = cos(a), s = sin(a);
    // >>> SURFERS  about the shoulder, not about the model origin.
    vec2 q2 = p.xy - ARM_PIVOT;
    p.xy = ARM_PIVOT + vec2(q2.x * c - q2.y * s, q2.x * s + q2.y * c);
    // <<< SURFERS
    n.xy = vec2(n.x * c - n.y * s, n.x * s + n.y * c);
  }
  p *= aInst1.w;
  vec3 w = place(p) + aInst0.xyz;
  vWorld = w;
  vNormal = place(n);
  vColor = aColor;
  vRough = aAnim < 0.0 ? -aAnim : -1.0;   // SURFER: -1 = use ENVC_SURFR, unchanged
  // SURFBOARDS. ⚠️ boardMesh()'s smoothed normals point INTO the hull (measured: the deck's is y -1),
  // which never mattered while the shader turned every normal to face the viewer. The paint needs the
  // outward one to tell deck from bottom, so the hull's is flipped here (not the fin's, which is fine).
  vLocal = aPos; vNy = (aAnim > 2.5 && aPos.y > -0.045) ? -aNormal.y : aNormal.y; vTag = aAnim; vPaint = aInst2.yzw;
  gl_Position = uViewProj * vec4(w, 1.0);
}
`;

// >>> ENVREF  (tmp-tr192, 2026-09-20)
// TWO DEFECTS IN THE SHADER BELOW, both of which this file could not see from
// inside itself because both are absences.
//
//  1. THE SURFERS ARE NEVER SHADOWED. This shader included SKY_GLSL but not
//     SHADOW_GLSL, and its direct term was vColor * (ndl * 0.85 + 0.15) with no
//     sh factor at all - so a surfer in the pier's shadow was lit exactly like
//     one in full sun, in every condition. That is a large part of why they
//     read as stickers pasted on the sea: nothing in the frame agrees with them
//     about where the sun is blocked. They now take the same sunShadow() every
//     other lit surface takes.
//     THEY STILL DO NOT CAST. The shadow DEPTH pass does not draw them, and
//     adding them to it is a draw-call change, not a lighting one. A surfer
//     therefore receives the pier's shadow and throws none of her own. Said
//     out loud rather than left to be discovered.
//     AND THE MAP MAY NOT REACH THEM. shadow.js's map is 140 m half-width
//     around the CAMERA; the line-up sits 100-250 m out. Outside the map
//     sunShadow() returns 1.0, which is the old behaviour exactly - so this is
//     a graceful degrade, not a black surfer at range.
//  2. NO ENVIRONMENT REFLECTION, on the two glossiest things in the scene. Wet
//     neoprene and a wet glassed board are near-mirrors at grazing angles. The
//     same Fresnel-weighted skyColor() term craft.js now carries is applied
//     here, with the same energy conservation: the diffuse loses (1 - F) and
//     the environment is added at F.
//
// WETNESS IS NOT A BAND HERE, and that is deliberate. craft.js measures its wet
// band from the height above the instantaneous local sea surface, because a ski
// is dry over its bow. A surfer in a Bournemouth line-up is SOAKED, all of her,
// continuously - she duck-dives through every set. So there is no height to
// measure from, wetness is 1 everywhere, and inventing a per-instance sea
// elevation to drive a band nobody would see would have meant widening the
// instance buffer, which is another builder's format this round.
// The constants are IMPORTED from craft.js rather than retyped so the refractive
// index and the TIR fraction cannot drift between the two files.
//
// ROUGHNESS IS ONE CONSTANT, NOT A PER-MATERIAL CHANNEL. The vertex format is
// pos/normal/colour/anim and adding a roughness channel to it would be a change
// to the mesh builders, which this pass does not own. 0.09 is the single value:
// a water film over neoprene and a water film over epoxy glass are both close
// to it, and the third material - skin - is rougher but is a few percent of the
// silhouette at the distance the line-up is ever seen from.
//
// ABLATION. ?cdbg=noenv restores the pre-2026-09-20 shader VERBATIM, including
// dropping the SHADOW_GLSL chunk again so the uniform block is the old one too.
// It is craft.js's namespace on purpose: this pass is one change across three
// files and one master switch has to turn all of it off, or the 25-view
// ablation attributes nothing.
// NO BACKTICKS BELOW THIS LINE.
// ?cdbg=surfmask - the same instrument as craft.js's ?cdbg=craftmask, for the
// same reason: this file's brief asserts that the line-up cannot move the
// corpus because update() returns early when dt <= 0 and ?hold=1 freezes the
// sim. That is an argument, not a measurement, and it is the kind of argument
// that is right until a settle loop happens to screenshot frame 1. Painting
// every surfer fragment magenta and counting it over the 25 judged views
// settles it. Compile-time, empty when absent.
const SURF_MASK = CDBG_SURF.includes('surfmask')
  ? '  fragColor = vec4(1.0, 0.0, 1.0, 1.0); return;\n' : '';
const SURF_ENV_SHADOW = ENV_OFF ? '' : SHADOW_GLSL;
const SURF_ENV_CONST = ENV_OFF ? '' : ENV_CONST + `
const float ENVC_SURFR = 0.09;   // a water film over neoprene or glassed epoxy
`;
const SURF_ENV_LIGHT = ENV_OFF ? `
  float ndl = max(dot(N, uSunDir), 0.0);
  vec3 direct = baseCol * (ndl * 0.85 + 0.15);
  vec3 ambient = baseCol * skyColor(normalize(N + vec3(0.0, 0.35, 0.0)), uSunDir) * 0.55;
  vec3 col = direct * 0.55 + ambient;` : `
  // Soaked: the same TIR return craft.js derives, at full strength.
  vec3 alb = baseCol * (1.0 - ENVC_TIR) / (1.0 - baseCol * ENVC_TIR);
  float NdV = max(dot(N, V), 1e-3);
  float RGH = vRough < 0.0 ? ENVC_SURFR : vRough;   // SURFER: identical to before whenever aAnim >= 0
  float fr = ENVC_F0 + (max(1.0 - RGH, ENVC_F0) - ENVC_F0) * pow(1.0 - NdV, 5.0);

  float ndl = max(dot(N, uSunDir), 0.0);
  float sh = sunShadow(vWorld, N, uSunDir);
  vec3 skyAmb = skyColor(normalize(N + vec3(0.0, 0.35, 0.0)), uSunDir);
  // SURFER: the sky light round the player's figure (vRough >= 0) stops short of the sun's disc.
  // Sampled along the normal, it picked the disc up wherever a curve faced the sun, and drew a sharp
  // white line down the back and a spot on each calf - on the b28 figure too (found 26 Sep by
  // painting the figure red: the line stayed). The line-up (-1) is untouched.
  if (vRough >= 0.0) skyAmb = min(skyAmb, vec3(1.3));
  vec3 direct = alb * (ndl * 0.85 * sh + 0.15);
  vec3 ambient = alb * skyAmb * 0.55;

  vec3 Rv = normalize(reflect(-V, N));
  vec3 envM = skyColor(Rv, uSunDir);
  envM -= SUN_TINT * (smoothstep(0.9992, 0.99975, dot(Rv, uSunDir)) * 30.0
                      * (1.0 - smoothstep(0.0, -0.12, Rv.y)));
  vec3 env = mix(envM, skyAmb, RGH);

  vec3 H = normalize(uSunDir + V);
  float alp = RGH * RGH + ENVC_SUNA;
  float al2 = alp * alp;
  float NdH = max(dot(N, H), 0.0);
  float den = NdH * NdH * (al2 - 1.0) + 1.0;
  float dgx = al2 / (ENVC_PI * den * den);
  float vgx = 0.5 / max(mix(2.0 * ndl * NdV, ndl + NdV, alp), 1e-4);
  float lobe = dgx * vgx * ndl * ENVC_SUNE;

  vec3 col = (direct * 0.55 + ambient) * (1.0 - fr)
           + env * fr
           + vec3(1.0) * lobe * fr * sh;`;
// <<< ENVREF

const FRAG = `#version 300 es
precision highp float;
in vec3 vWorld;
in vec3 vNormal;
in vec3 vColor;
in float vRough;   // SURFER
// >>> SURFBOARDS
in vec3 vLocal;
in float vNy;
in float vTag;
in vec3 vPaint;
// <<< SURFBOARDS
out vec4 fragColor;
uniform vec3 uCamPos;
uniform vec3 uSunDir;
uniform float uExposure;

${SKY_GLSL}
${SURF_ENV_SHADOW}
${SURF_ENV_CONST}
vec3 acesS(vec3 x) {
  const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

// >>> SURFBOARDS  a board's paint, from where on the board this is (model space: x to the nose, y up,
// z across) and the surfer's look (design, colour A, colour B). See BOARD_LOOKS.
${BOARD_PAL_GLSL}
vec3 boardPaint(vec3 lp, float ny, vec3 look, vec3 base) {
  int design = int(mod(look.x, 10.0) + 0.5);
  if (design > 8) return base;
  vec3 A = BPAL[int(look.y + 0.5)], B = BPAL[int(look.z + 0.5)], W = BPAL[0];
  if (lp.y < -0.045) return mix(vec3(0.035), A, 0.3);          // the fin, smoked
  float u = clamp((lp.x - 0.15) / 1.12, -1.0, 1.0);
  float hw = 0.03 + 0.26 * sqrt(max(0.0, 1.0 - u * u * (u > 0.0 ? 1.0 : 0.8)));
  float across = clamp(abs(lp.z) / hw, 0.0, 1.0);
  float fw = fwidth(lp.z) * 1.5 + 1e-4;
  float line = 1.0 - smoothstep(0.005, 0.005 + fw, abs(lp.z));   // a centre stringer, 1 cm
  bool deck = ny > 0.3, bottom = ny < -0.3;
  vec3 c;
  if (design == 0) {                  // clear resin tint, white stringer
    c = A * (deck ? 1.0 : 0.82);
    c = mix(c, W, line * 0.85);
  } else if (design == 1) {           // white deck, sprayed rails
    float spray = smoothstep(0.55, 0.95, across);
    c = deck ? mix(W, A, spray) : bottom ? mix(A, W, 0.12) : A;
  } else if (design == 2) {           // two-tone, nose and tail, a white pinline between
    float fu = fwidth(u) * 1.5 + 1e-4;
    c = mix(B, A, smoothstep(0.12 - fu, 0.12 + fu, u));
    c = mix(c, W, 1.0 - smoothstep(0.008, 0.008 + fu, abs(u - 0.12)));
  } else if (design == 3) {           // a racing stripe down the deck, pinlines either side
    float st = 1.0 - smoothstep(0.055, 0.055 + fw, abs(lp.z));
    float pl = 1.0 - smoothstep(0.004, 0.004 + fw, abs(abs(lp.z) - 0.075));
    c = deck ? mix(mix(W, A, st), B, pl) : bottom ? W : A;
  } else if (design == 4) {           // longboard: tinted deck, darker rails, a wood stringer
    float rail = deck ? smoothstep(0.8, 0.95, across) : 1.0;
    c = mix(A, A * 0.55, rail);
    c = mix(c, B, 1.0 - smoothstep(0.009, 0.009 + fw, abs(lp.z)));
  } else {                            // a fade, tail to nose; a white bottom
    c = bottom ? W : mix(A, B, smoothstep(-0.6, 0.6, u));
  }
  return c;
}
// <<< SURFBOARDS

const vec3 EXTINCT = vec3(0.62, 0.16, 0.30);
const vec3 WATER_IN = vec3(0.012, 0.055, 0.041);

void main() {
// >>> ENVREF
${SURF_MASK}// <<< ENVREF
  vec3 N = normalize(vNormal);
  vec3 V = normalize(uCamPos - vWorld);
  // >>> SURFBOARDS
  // THE PLAYER'S OWN BOARD AND BODY ARE SOLID WHERE THE CAMERA CUTS THEM. Looking out of the rider's
  // eyes, the renderer's 0.25 m near plane slices the board under you, and the owner saw into it:
  // "it looks like you've got the board in front of you but it's been chopped off and you can see
  // into it". Where this instance is marked (+10 in the design), a fragment seen from INSIDE its own
  // surface is lit as the deck facing up - so the cut reads as more board, not as a hollow shell.
  vec3 Nout = (vTag > 2.5 && vLocal.y > -0.045) ? -N : N;   // outward (the hull's normals point in)
  bool capIn = vPaint.x > 9.5 && dot(Nout, V) < -0.25;
  // ...and PAINTED as the deck it stands in for, so the stripe runs on to the edge of the view.
  vec3 baseCol = vTag > 2.5 ? boardPaint(vLocal, capIn ? 1.0 : vNy, vPaint, vColor) : vColor;
  // <<< SURFBOARDS
  if (dot(N, V) < 0.0) N = -N;
  if (capIn) N = vec3(0.0, 1.0, 0.0);   // SURFBOARDS
// >>> ENVREF
${SURF_ENV_LIGHT}
// <<< ENVREF
  // Anything below the water line is seen THROUGH water, same extinction the
  // rescue actors use, so a submerged leg does not read as a floating stick.
  if (vWorld.y < 0.0) {
    float dd = min(-vWorld.y, 3.0) * 2.0;
    vec3 t = exp(-EXTINCT * dd);
    col = col * t + WATER_IN * (1.0 - t);
  }
  fragColor = vec4(pow(acesS(col * uExposure), vec3(1.0 / 2.2)), 1.0);
}
`;

// sRGB -> linear, the same convention the rest of the coast uses.
const hex = (h) => {
  const n = parseInt(h.slice(1), 16);
  const f = (c) => Math.pow(c / 255, 2.2);
  return [f((n >> 16) & 255), f((n >> 8) & 255), f(n & 255)];
};

// Deliberately dull. A surfer is scenery beside a pier, not a focal point, and
// a bright wetsuit at 200 m pulls the eye straight off the model.
const PAINT = {
  suit: hex('#23272E'),      // black/charcoal wetsuit
  suitAlt: hex('#2C3340'),
  skin: hex('#C8A183'),
  board: hex('#E8E6DF'),     // plain white/cream deck
  boardAlt: hex('#D8DCDE'),
  rail: hex('#9AA0A4'),
};

class Kit {
  constructor() { this.pos = []; this.nrm = []; this.col = []; this.anim = []; this.idx = []; }
  add(color, fn, anim = 0) {
    const b = new MeshBuilder();
    fn(b);
    const base = this.pos.length / 3;
    for (let i = 0; i < b.v.length; i += 3) {
      this.pos.push(b.v[i], b.v[i + 1], b.v[i + 2]);
      this.nrm.push(b.n[i], b.n[i + 1], b.n[i + 2]);
      this.col.push(color[0], color[1], color[2]);
      this.anim.push(anim);
    }
    for (const k of b.i) this.idx.push(base + k);
    return this;
  }
  get tris3() { return this.idx.length / 3; }
}

// The board. +X is the nose. 2.2 m of soft-top, which is what a Bournemouth
// beach-break line-up is mostly made of.
function board(b, y) {
  b.ellipsoid(0.15, y, 0, 1.12, 0.055, 0.29, 14, 5);
}

// PRONE: paddling, or sitting waiting. Same mesh; the instance pitch and the
// stroke amount tell them apart.
function buildProne() {
  const k = new Kit();
  k.add(PAINT.board, (b) => board(b, 0));
  k.add(PAINT.suit, (b) => b.ellipsoid(-0.05, 0.14, 0, 0.42, 0.11, 0.17, 10, 6));   // torso
  k.add(PAINT.suit, (b) => {                                                         // legs
    for (const s of [-1, 1]) b.tube(-0.42, 0.12, 0.09 * s, -1.00, 0.09, 0.12 * s, 0.075, 0.055, 6);
  });
  k.add(PAINT.skin, (b) => b.ellipsoid(0.42, 0.20, 0, 0.11, 0.10, 0.10, 10, 7));     // head
  // Arms, tagged for the stroke. anim 1 and 2 put them half a cycle apart.
  k.add(PAINT.suit, (b) => b.tube(0.18, 0.16, 0.20, 0.52, 0.02, 0.30, 0.055, 0.045, 6), 1);
  k.add(PAINT.suit, (b) => b.tube(0.18, 0.16, -0.20, 0.52, 0.02, -0.30, 0.055, 0.045, 6), 2);
  return k;
}

// STANDING: up and riding. Knees bent, arms out, weight over the front foot.
function buildRider() {
  const k = new Kit();
  k.add(PAINT.boardAlt, (b) => board(b, 0));
  k.add(PAINT.suit, (b) => {                                                         // legs
    b.tube(0.34, 0.06, 0.03, 0.30, 0.42, 0.10, 0.085, 0.075, 6);
    b.tube(-0.30, 0.06, -0.03, -0.20, 0.42, -0.08, 0.085, 0.075, 6);
  });
  k.add(PAINT.suit, (b) => b.ellipsoid(0.04, 0.68, 0.01, 0.17, 0.26, 0.15, 10, 7));  // torso
  k.add(PAINT.skin, (b) => b.ellipsoid(0.05, 1.00, 0.01, 0.105, 0.115, 0.098, 10, 7)); // head
  k.add(PAINT.suitAlt, (b) => {                                                      // arms out
    b.tube(0.06, 0.82, 0.14, 0.38, 0.86, 0.42, 0.05, 0.042, 6);
    b.tube(0.02, 0.82, -0.14, -0.30, 0.74, -0.44, 0.05, 0.042, 6);
  });
  return k;
}

// A board on its own, for the second after somebody comes off it.
function buildLooseBoard() {
  const k = new Kit();
  k.add(PAINT.board, (b) => board(b, 0));
  k.add(PAINT.rail, (b) => b.ellipsoid(-0.85, -0.10, 0, 0.05, 0.11, 0.02, 6, 4));   // fin
  return k;
}
// >>> SURFERS  (tmp-tr195, 2026-09-20) — THE MESHES

// ---------------------------------------------------------------------------
// WHAT WAS WRONG, and at what distance it mattered.
//
// tmp-tr194/look/prone_zoom.png is a paddler at ~6 m: a black torpedo with a
// tan ball on the front. tmp-tr190/r/surfer_close.png is a standing rider at
// ~40 m with its legs floating free of its body. Both are distances the player
// genuinely reaches.
//
// HOW MUCH DETAIL IS WORTH IT — the judgement call, and the reasoning, because
// the answer is not "as much as possible".
//
// The reference (REFERENCE-NOTES, first section) is ONE clip, and at the
// distance it was shot the owner's own camera resolves these people as
// SILHOUETTES: no limbs, no faces, no board graphics. So the reference cannot
// justify any interior detail at all, and the line-up at 150-250 m is still
// the common case. What makes this worth doing anyway is the cost model: the
// shapes are INSTANCED and built once, so a better shape is nearly free, while
// a per-instance skeleton is not. The budget is therefore not the constraint -
// the risk is. The rule I worked to:
//
//   every change must improve the 200 m SILHOUETTE or leave it alone.
//
// Connected limbs, a pelvis, a neck, a board with an outline and an arm that
// is outside the body all change the silhouette for the better at every
// distance. A face, a texture or a deck graphic would not, and are banned by
// this file's own header besides. Overall extents are held where they were:
// the board is the same 2.24 x 0.58 x 0.11 it was, the standing figure is the
// same ~1.12 m from deck to crown. Nothing here makes the line-up read
// differently at the distance the reference can actually speak to.
//
// WHAT IS NOT DONE, and why. "Nothing displaces water" is the fifth defect in
// the notes and it is NOT fixed here. The water surface belongs to sea-surf.js
// and shaders.js; a foam ring drawn from THIS program would be an opaque disc
// lying on the sea, not a disturbance in it. What is done instead is honest
// and small: the board is dropped INTO the water (see draw()), so the rail is
// genuinely cut by the surface and the shader's own extinction term tints what
// is under it. That is as far as this file can go without owning the sea.
//
// BUDGET. Still ONE program and THREE instanced draws. No second rig, no bone,
// no per-instance skeleton, no Math.random - every per-surfer difference still
// comes from hash1(index). Triangle counts are printed by meshTris() and are
// in the RESULT.
//
// ABLATION: ?cdbg=oldmesh restores the pre-2026-09-20 meshes verbatim, AND the
// old draw() y-offsets, AND the old arm pivot, so the mesh pass can be A/B'd
// on one build at a frozen camera the way the seating pass can.
// ---------------------------------------------------------------------------
const OLD_MESH = CDBG_SURF.includes('oldmesh');

// ---------------------------------------------------------------------------
// THE BOARD. It is the one object in the frame that says "surfer" at a glance
// and it was doing no work: ONE ellipsoid, so from the side a white sliver
// with no rail, no rocker, no nose lift, no fin and a constant width.
//
// PROVENANCE, AND IT IS NOT A MEASUREMENT. The owner's clip resolves a board
// as a few white pixels, so no number below came off it. These are the
// published proportions of the beginner soft-tops a Bournemouth beach-break
// line-up is mostly made of, used the way boat-pwc.js uses the published
// LOA/beam/deadrise of a 3.3-3.5 m class rather than one machine:
//   2.24 m long, 0.58 m wide at 46% back from the nose, 0.105 m thick,
//   0.115 m nose rocker, 0.030 m tail rocker, one 0.16 m centre fin.
// DERIVED, NOT OBSERVED. Said here rather than left to be assumed.
// ---------------------------------------------------------------------------
const BRD_CX = 0.15, BRD_HL = 1.12, BRD_HW = 0.29, BRD_HT = 0.0525;
const BRD_UW = 0.08;                  // station of maximum width, in u
const BRD_NOSE_W = 0.030, BRD_TAIL_W = 0.105;
const BRD_NOSE_RK = 0.115, BRD_TAIL_RK = 0.030;
// u = -1 tail, +1 nose. The two outermost pairs close the ends to a point over
// the last 34 mm, which is shorter than the mesh can resolve anyway.
const BRD_U = [-1, -0.97, -0.90, -0.78, -0.64, -0.50, -0.34, -0.18, -0.02,
  0.08, 0.20, 0.34, 0.48, 0.62, 0.75, 0.86, 0.94, 0.97, 1];
const BRD_RING = 12;

function brdWidth(u) {
  if (u >= BRD_UW) {
    const s = (u - BRD_UW) / (1 - BRD_UW);
    return BRD_NOSE_W + (BRD_HW - BRD_NOSE_W) * Math.pow(Math.max(0, 1 - Math.pow(s, 2.4)), 0.70);
  }
  const s = (BRD_UW - u) / (1 + BRD_UW);
  return BRD_TAIL_W + (BRD_HW - BRD_TAIL_W) * Math.pow(Math.max(0, 1 - Math.pow(s, 2.8)), 0.75);
}

function brdRocker(u) {
  const n = Math.max(0, (u - 0.05) / 0.95), t = Math.max(0, (-0.05 - u) / 0.95);
  return BRD_NOSE_RK * Math.pow(n, 2.4) + BRD_TAIL_RK * Math.pow(t, 2.1);
}

// One station's section. A soft-top is a domed deck over a nearly flat bottom
// with a full, soft rail, so: a superellipse in z (exponent under 1 fills the
// outline out toward the rail) and an asymmetric one in y (the bottom at 0.62
// of the deck's rise).
function brdSection(u, out) {
  const w = brdWidth(u);
  const yr = brdRocker(u);
  const th = BRD_HT * Math.pow(w / BRD_HW, 0.45);
  for (let j = 0; j < BRD_RING; j++) {
    const a = (j / BRD_RING) * Math.PI * 2;
    const c = Math.cos(a), s = Math.sin(a);
    out[j * 2] = w * Math.sign(c) * Math.pow(Math.abs(c), 0.72);
    out[j * 2 + 1] = yr + th * Math.sign(s) * Math.pow(Math.abs(s), 0.85) * (s >= 0 ? 1 : 0.62);
  }
  return out;
}

const _sec = new Float64Array(BRD_RING * 2);
function boardMesh(b, y) {
  const base = b.vertexCount;
  const NS = BRD_U.length;
  for (let i = 0; i < NS; i++) {
    const u = BRD_U[i];
    const x = BRD_CX + u * BRD_HL;
    // The end stations collapse to the centreline so the hull closes.
    const deg = (i === 0 || i === NS - 1);
    brdSection(u, _sec);
    for (let j = 0; j < BRD_RING; j++) {
      const zz = deg ? 0 : _sec[j * 2];
      const yy = deg ? brdRocker(u) : _sec[j * 2 + 1];
      b.push(x, y + yy, zz, 0, 1, 0);       // normals from smoothNormals() below
    }
  }
  for (let i = 0; i < NS - 1; i++) {
    for (let j = 0; j < BRD_RING; j++) {
      const a = base + i * BRD_RING + j;
      const a2 = base + i * BRD_RING + (j + 1) % BRD_RING;
      b.quad(a, a2, a2 + BRD_RING, a + BRD_RING);
    }
  }
  b.smoothNormals(base);
  // The fin. One centre fin under the tail. TWO thin lenses rather than one
  // ellipsoid, because one ellipsoid at these proportions renders as a ball
  // stuck under the board (judge/z_fin.png): the second lens is smaller, lower
  // and set back, which gives the blade a taper and a rake. 0.165 m deep below
  // the hull, 26 mm thick at the root.
  b.ellipsoid(BRD_CX - 0.69, y - 0.035, 0, 0.085, 0.075, 0.014, 10, 6);
  b.ellipsoid(BRD_CX - 0.75, y - 0.105, 0, 0.050, 0.070, 0.011, 10, 6);
}

// ---------------------------------------------------------------------------
// PRONE — paddling, or sitting waiting. The common pose by a wide margin:
// WAIT + PADDLE + BACK is 71-82% of a person's time at every surf size.
//
// FIVE DEFECTS, from REFERENCE-NOTES, with what replaces each:
//  1. A bare skin dome fused straight onto the torso, no neck. -> a tapered
//     neck, and the head moved forward clear of the chest.
//  2. THE ARMS WERE INVISIBLE, and the brief is right that this matters more
//     than everything else here put together: a paddling stroke is the single
//     most recognisable thing about the pose. They were two straight tubes
//     running from (0.18, 0.16, +/-0.20) to (0.52, 0.02, +/-0.30) - i.e. lying
//     along the torso ellipsoid's own surface and ending level with the deck,
//     so from any angle that matters they were inside the body. Now each arm
//     is upper arm, elbow, forearm and hand, and the forearm reaches DOWN
//     THROUGH THE SURFACE: at the catch the hand is 0.38 m under water. The
//     shader's existing extinction term (vWorld.y < 0) then tints it, so the
//     stroke reads as a stroke and not as a stick.
//     ⚠️ AND THE PIVOT WAS WRONG. The stroke rotates p.xy about the MODEL
//     ORIGIN, which is under the chest, so the shoulder itself swung through
//     +/-0.18 m - the figure dislocated its own arm every cycle. The vertex
//     shader now rotates about a fixed shoulder point instead. One line, and
//     it is what makes a longer arm survivable at all.
//  3. Two constant-radius leg tubes with a seam. -> thigh, knee, shin, ankle,
//     foot, and a hip mass bridging them to the torso.
//  4. The board barely read. -> boardMesh() above.
//  5. Nothing displaces water. -> NOT fixed here; see the block above.
// ---------------------------------------------------------------------------
// The stroke pivot, in model space, and it is the LEFT/RIGHT-shared shoulder
// point: both arms leave the torso at the same x and y and differ only in z,
// and the rotation is in the xy plane, so one pivot serves both.
const ARM_PIVOT_X = 0.20, ARM_PIVOT_Y = 0.155;

// Rings r0..r1 of the SAME parametric ellipsoid meshes.js builds. A hood and
// the face below it are then TWO BANDS OF ONE SURFACE and the boundary between
// them is an exact latitude line. The first attempt was a second, slightly
// larger hood ellipsoid overlapping the head, and where two tessellated solids
// cut each other neither has vertices on the intersection curve: it rendered
// as a stair-stepped zigzag across the face at 7 m (judge round 1). This costs
// one mesh fewer as well.
function ellipsoidBand(b, cx, cy, cz, rx, ry, rz, seg, rings, r0, r1) {
  const base = b.vertexCount;
  for (let i = r0; i <= r1; i++) {
    const v = (i / rings) * Math.PI;
    const sv = Math.sin(v), cv = Math.cos(v);
    for (let j = 0; j <= seg; j++) {
      const u = (j / seg) * Math.PI * 2;
      const nx = sv * Math.cos(u), ny = cv, nz = sv * Math.sin(u);
      b.push(cx + nx * rx, cy + ny * ry, cz + nz * rz, nx / rx, ny / ry, nz / rz);
    }
  }
  for (let i = 0; i < r1 - r0; i++) {
    for (let j = 0; j < seg; j++) {
      const a = base + i * (seg + 1) + j;
      const c = a + seg + 1;
      b.quad(a, c, c + 1, a + 1);
    }
  }
}
// A hood down to just below the ear line. Not hair, not a face: a November
// Bournemouth line-up is in hooded suits, and it is what stops the head reading
// as a tan ball stuck on a black torpedo. No feature is drawn on the skin band,
// which this file's header requires.
const HD_SEG = 16, HD_RINGS = 11, HD_HOOD = 6;

function proneArm(b, s) {
  b.tube(0.20, 0.155, 0.150 * s, 0.40, 0.085, 0.265 * s, 0.056, 0.046, 7);   // upper arm
  b.tube(0.40, 0.085, 0.265 * s, 0.52, -0.175, 0.300 * s, 0.045, 0.036, 7);  // forearm, into the water
  b.ellipsoid(0.538, -0.210, 0.302 * s, 0.056, 0.042, 0.040, 9, 6);          // hand
}

function buildProneNew() {
  const k = new Kit();
  k.add(PAINT.board, (b) => boardMesh(b, 0), 3);   // SURFBOARDS: 3 = painted
  k.add(PAINT.suit, (b) => {
    b.ellipsoid(-0.05, 0.145, 0, 0.42, 0.105, 0.165, 12, 7);                 // chest and back
    b.ellipsoid(-0.40, 0.130, 0, 0.16, 0.095, 0.170, 10, 6);                 // hips: the missing bridge
    for (const s of [-1, 1]) {
      b.tube(-0.44, 0.128, 0.085 * s, -0.72, 0.112, 0.112 * s, 0.082, 0.060, 7);  // thigh
      b.tube(-0.72, 0.112, 0.112 * s, -0.99, 0.096, 0.126 * s, 0.058, 0.040, 7);  // shin
      b.ellipsoid(-1.055, 0.090, 0.130 * s, 0.075, 0.032, 0.048, 8, 5);           // foot
    }
    b.tube(0.325, 0.150, 0, 0.400, 0.188, 0, 0.060, 0.052, 7);               // neck
  });
  k.add(PAINT.suitAlt, (b) => ellipsoidBand(b, 0.440, 0.215, 0, 0.105, 0.098, 0.098, HD_SEG, HD_RINGS, 0, HD_HOOD));
  k.add(PAINT.skin, (b) => ellipsoidBand(b, 0.440, 0.215, 0, 0.105, 0.098, 0.098, HD_SEG, HD_RINGS, HD_HOOD, HD_RINGS));
  k.add(PAINT.suit, (b) => proneArm(b, 1), 1);
  k.add(PAINT.suit, (b) => proneArm(b, -1), 2);
  return k;
}

// ---------------------------------------------------------------------------
// STANDING — up and riding. 17-19% of the time, and the pose the 40 m capture
// caught. The arithmetic that broke it, from REFERENCE-NOTES: the legs' TOPS
// were at x 0.30 and x -0.20 against a torso spanning x -0.13 to 0.21, so both
// hips were outside the body and the front one by 90 mm, with no pelvis to
// bridge the gap - which is why tmp-tr190/r/surfer_close.png shows two
// rectangular slabs hanging in space under a floating ellipsoid.
//
// Now: both hips inside a pelvis mass, knees bent, feet apart on the board in
// a surf stance, a neck, and arms with an elbow and a hand. Deck-to-crown is
// held at 1.12 m, which is what the old figure measured, so the silhouette at
// 200 m is the same height it always was.
// ---------------------------------------------------------------------------
function buildRiderNew() {
  const k = new Kit();
  k.add(PAINT.boardAlt, (b) => boardMesh(b, 0), 3);   // SURFBOARDS
  k.add(PAINT.suit, (b) => {
    for (const s of [-1, 1]) {
      const fx = s > 0 ? 0.34 : -0.32;      // front foot toward the nose
      const hx = s > 0 ? 0.075 : -0.035;
      const kx = s > 0 ? 0.255 : -0.215;
      b.tube(hx, 0.440, 0.085 * s, kx, 0.245, 0.105 * s, 0.088, 0.070, 7);   // thigh
      b.tube(kx, 0.245, 0.105 * s, fx, 0.080, 0.075 * s, 0.068, 0.046, 7);   // shin
      b.ellipsoid(fx + (s > 0 ? 0.025 : -0.025), 0.058, 0.072 * s, 0.098, 0.033, 0.054, 8, 5);
    }
    b.ellipsoid(0.02, 0.475, 0.01, 0.145, 0.108, 0.150, 12, 7);              // pelvis
    b.ellipsoid(0.04, 0.700, 0.01, 0.170, 0.228, 0.150, 12, 8);              // torso
    // A shoulder yoke. Without it the torso is one egg and the arms come out
    // of the ribs; shoulders are wider than a chest and that is most of what
    // makes a standing figure read as a person at 40 m.
    b.ellipsoid(0.045, 0.838, 0.008, 0.150, 0.080, 0.172, 14, 7);
    b.tube(0.050, 0.895, 0.008, 0.055, 0.958, 0.004, 0.058, 0.050, 7);       // neck
  });
  k.add(PAINT.suitAlt, (b) => ellipsoidBand(b, 0.055, 1.010, 0.004, 0.102, 0.108, 0.096, HD_SEG, HD_RINGS, 0, HD_HOOD));
  k.add(PAINT.skin, (b) => ellipsoidBand(b, 0.055, 1.010, 0.004, 0.102, 0.108, 0.096, HD_SEG, HD_RINGS, HD_HOOD, HD_RINGS));
  k.add(PAINT.suitAlt, (b) => {
    b.tube(0.050, 0.852, 0.125, 0.240, 0.880, 0.300, 0.052, 0.044, 7);       // lead arm
    b.tube(0.240, 0.880, 0.300, 0.420, 0.835, 0.445, 0.043, 0.034, 7);
    b.ellipsoid(0.455, 0.818, 0.478, 0.050, 0.032, 0.040, 8, 5);
    b.tube(0.020, 0.852, -0.125, -0.160, 0.812, -0.300, 0.052, 0.044, 7);    // trailing arm
    b.tube(-0.160, 0.812, -0.300, -0.330, 0.738, -0.442, 0.043, 0.034, 7);
    b.ellipsoid(-0.363, 0.715, -0.475, 0.050, 0.032, 0.040, 8, 5);
  });
  return k;
}

function buildLooseBoardNew() {
  const k = new Kit();
  k.add(PAINT.board, (b) => boardMesh(b, 0), 3);   // SURFBOARDS
  return k;
}

// <<< SURFERS
// ---------------------------------------------------------------------------
// THE LINE-UP
//
// Positions are in PIER SPACE - o alongshore from the pier centreline, d metres
// seaward of mean high water - so the line-up sits on the banks wherever the
// banks are, and follows SURF if those numbers ever move.
// ---------------------------------------------------------------------------
const D0 = PIER_DIR[0], D1 = PIER_DIR[1];

// Pier space -> world. The inverse of pier.js's at(s, o).
function toWorld(s, o, out) {
  out[0] = s * D0 + o * D1 - 230;
  out[1] = s * D1 - o * D0 - 300;
  return out;
}

const hash1 = (n) => {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};

const WAIT = 0, PADDLE = 1, RIDE = 2, TUMBLE = 3, BACK = 4;

// Where the outer break is, found once from the surf field itself rather than
// written down twice: the shallowest d at which the train is at its limit.
// >>> SURFERS
// ⚠️ KEPT ONLY AS THE ABLATION. This is the pre-2026-09-20 function, verbatim,
// and nothing calls it unless ?cdbg=oldseat is on. Its defects are set out in
// the block below; it is here so the fix can be turned off on ONE build at a
// frozen camera, which is the only way a line-up that the 25-view corpus
// cannot see can be A/B'd at all.
// <<< SURFERS
function findBreak() {
  let best = 104;
  const slot = makeSurfSlot();
  const w = [0, 0];
  for (let d = 150; d > 40; d -= 2) {
    // Station s for this d on the bank: d ~ s - mhw, solved by the same fixed
    // point the rest of the project uses.
    let s = d + 38;
    for (let i = 0; i < 20; i++) {
      toWorld(s, SURF.ZONE_O, w);
      const c = shoreCoords(w[0], w[1], {});
      s += (d - c.d);
    }
    toWorld(s, SURF.ZONE_O, w);
    surfSample(w[0], w[1], 0, 0, 1, slot);
    if (slot.brk > 0.6) { best = d; break; }
  }
  return best;
}
// >>> SURFERS  (tmp-tr195, 2026-09-20)

// ---------------------------------------------------------------------------
// THE BREAK LINE NOW FOLLOWS THE SEA, BECAUSE THE SEA MOVES AND IT DID NOT.
// ---------------------------------------------------------------------------
// THE DEFECT, measured in the running game before anything was touched. Owner:
// "fix the placement first if they're in the foam". They were.
//
//   surfSample(w[0], w[1], 0, 0, 1, slot)
//                         ^        ^
//                      time 0   surf control HARD-CODED to 1
//
// so the break line was solved for a 1.0x sea and for no other, at one instant
// of the set clock, ONCE, in the constructor - which renderer.js:102 runs at
// renderer build time, BEFORE any ?surf= has been applied - and was then never
// recomputed. dBreak came back 110 at every surf size from 0.35x to 2.4x. The
// sea does not stand still: the onset of breaking on the bank crest runs from
// d 30 at 0.35x to d 151 at 1.8x. Every station was dBreak + 4 +/- 7, so above
// about 0.8x the whole line-up sat INSIDE the break, and at the default 1.0x,
// 7 of 14 people were in broken water. This file's own header claimed "a
// line-up sits OUTSIDE the break by definition, where brk is exactly 0". It
// did not.
//
// TIME COLLAPSES TO ONE EXACT SAMPLE, and that is measured, not assumed.
// brk = smoothstep(0.80, 1.00, a / lim). lim = 0.5 * GAMMA_B * h is the
// still-water breaker limit and carries no time at all; a = ampAt(d, o,
// setFactor(t), ctl) carries time ONLY through setFactor, which multiplies the
// deep-water amplitude before the cap. brk is therefore monotonic in setFactor
// and is maximised exactly where setFactor is. Checked over 36 (d, o, ctl)
// combinations x 3000 one-second time samples: max_t brk equalled brk at the
// set peak every time, to better than 1e-9. So "average over several wave
// phases" is not an approximation to make here - it is ONE evaluation, at the
// set peak, and it is exact.
//
// WHY THE PEAK AND NOT THE MEAN. A line-up has to sit outside where the SETS
// break, not outside where the average wave breaks, or every set lands on it.
// setFactor is saturated at 1.0 for 10.4% of a 4000 s run - a condition that
// arrives every minute or two, not a tail case.
//
// PER PERSON, NOT ONE LINE. A break line over a bank is a crescent, not a row.
// At 1.0x the onset is d 125 on the crest (o 72) and d 38 out on the shoulder
// (o 38), because the alongshore envelope and the bar under it are both
// Gaussian in o. One break distance for fourteen different o is the same class
// of error as one break distance for six different surf sizes, only in the
// other coordinate, so each person is seated against the onset at their OWN o.
// That is also what makes this a fix rather than a bigger constant: push
// everybody out by a number that works at 1.0x on the crest and the shoulders
// are then parked in flat water 90 m outside anything that breaks.
// ---------------------------------------------------------------------------

// The one time in the set clock at which setFactor() is at its maximum. Found
// by scanning the real function rather than written down, so it cannot drift
// from SURF.SET_T1 / SET_T2. 2000 evaluations of two sines, once per module
// load; setFactor reaches exactly 1.0 at t = 91.5 s on the shipped constants.
const T_SET_PEAK = (() => {
  let bt = 0, bv = -1;
  for (let t = 0; t < 1000; t += 0.5) { const v = setFactor(t); if (v > bv) { bv = v; bt = t; } }
  return bt;
})();

// Never seat the line-up inside this, whatever the surf is doing. Still-water
// depth on the crest is 0.48 m at d 20 and 0.37 m at d 12: inside 20 m a
// SITTING surfer is standing on the sand, which is a different picture from a
// line-up. At 0.35x the onset can be as shallow as d 7, so this floor does
// real work at the small end.
const D_MIN_HOME = 20;
// How far outside the onset the line-up waits, and how much the line-up is
// staggered in depth. brk falls from 1.0 to 0.0 within about 8 m seaward of the
// onset (measured at 0.7x, 1.0x and 1.8x), so +4 is already clear water while
// +16 is still within sight of the peak. MARGIN > SPREAD/2 is the invariant
// that keeps the SHALLOWEST of the fourteen outside its own break.
const OUT_MARGIN = 10, OUT_SPREAD = 12;

// ?cdbg=oldseat - the pre-2026-09-20 seating, verbatim, for the A/B. It is in
// craft.js's cdbg namespace because that is where this project's ablations
// already live.
const OLD_SEAT = CDBG_SURF.includes('oldseat');

const _bw = [0, 0];
const _bsc = {};
const _bslot = makeSurfSlot();

// Station s for a given (d, o), by the same fixed point the rest of the file
// uses. EIGHT iterations, not twenty: |s(8) - s(20)| is 2.8e-14 m over the
// whole (d 10..200, o 34..110) range this is ever asked for.
function _stationFor(d, o) {
  let s = d + 38;
  for (let i = 0; i < 8; i++) {
    toWorld(s, o, _bw);
    shoreCoords(_bw[0], _bw[1], _bsc);
    s += (d - _bsc.d);
  }
  return s;
}

function _breaking(d, o, ctl) {
  toWorld(_stationFor(d, o), o, _bw);
  surfSample(_bw[0], _bw[1], T_SET_PEAK, 0, ctl, _bslot);
  return _bslot.brk > 0;
}

// The largest d in this alongshore column that is breaking at all when the set
// is at its peak. Coarse 4 m sweep inward from the surf field's own outer fade,
// then six bisections - 56 samples, the same budget the old single scan spent,
// landing within 0.0625 m of the crossing. Agreed with an exhaustive 1 m scan
// to under 1 m at every surf size, which is the 1 m scan's own quantisation.
// Returns 0 when this column never breaks.
function breakOnset(o, ctl) {
  if (!(ctl > 0)) return 0;
  const ao = Math.abs(o);
  let lo = null, hi = 0;
  for (let d = SURF.D_FADE1 - 1; d > 6; d -= 4) {
    if (_breaking(d, ao, ctl)) { lo = d; hi = d + 4; break; }
  }
  if (lo === null) return 0;
  for (let k = 0; k < 6; k++) {
    const m = (lo + hi) * 0.5;
    if (_breaking(m, ao, ctl)) lo = m; else hi = m;
  }
  return lo;
}

// <<< SURFERS
// >>> SURFBOARDS
// THE LINE-UP SURFS - third pass (27 Sep 2026). The owner: "a major, major overhaul ... a lot
// smoother, a lot more realistic ... much better sort of smoother moves, so it looks natural, like
// it's actually happening". The second pass stitched each move from its own curve of position
// against time, and the joins showed: the rider jumped up to a metre across the face from one move
// to the next and the heading snapped with it; the board swung round 180 degrees in one frame to
// go for a wave; every rider on a bank went the same way, so half of them rode INTO the break; and
// the board banked OUT of every turn (roll = -rate put the outside rail down).
//
// Now a ride is a rider STEERING on a wave that moves:
//   * THE WAVE. Its crest is found on the surf field itself (chi = 0, one Newton step a frame), and
//     the rider is f metres in front of it - on the face of the wave that is drawn, staying there
//     however the wave slows or bends round the bank.
//   * THE RIDER. A heading on the face, th (0 along the line away from the curl, + up toward the
//     lip, - down toward the bottom), and a speed over the face, V. They STEER: the rate of turn
//     builds and unwinds (ALPHA), it never switches, up to what the move allows - and the face pays
//     for it: climbing costs speed, dropping gives it back.
//   * THE MOVES only choose where to steer and how hard: a drop, bottom turns, top turns (a sharp
//     snap off the lip), a cutback (all the way round toward the curl and a rebound off the white
//     water - the figure eight), a floater along the top, a small air, trimming with pumps, and a
//     kick-out over the back. When a move is done is decided by where the rider has got to on the
//     face, not by a clock.
//   * THE BOARD points where it is going through the WATER (the wave's own surge taken off), banks
//     INTO the turn by the angle the turn needs (tan = speed x rate of turn / g), and lies on the
//     water's own slope under it.
// Lefts AND rights: each bank breaks as a peak and peels away from its shallowest part both ways,
// so a surfer goes left or right by which side of the peak they sit on (dirFor()).
// Planned when the ride starts, from hash1: the same surfer on the same wave rides it the same way,
// different surfers differently, and nothing is random.
const TO_SHORE = -Math.PI / 2;
const wrapA = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
const clampv = (x, a, b) => Math.min(b, Math.max(a, x));
const GRAV = 9.81;
export const FACE_BOT = 4.6;     // m in front of the crest: the bottom of the ridden face (chi about -1.8)
export const V_TRIM = 4.3;       // m/s over the face, trimming: 5.5-6 m/s over the ground on a 3.7 m/s wave
const ALPHA = 9;                 // rad/s/s: how fast a turn builds, and unwinds
export const NPC_FIGS = 3;       // the nearest this many are drawn as jointed people...
export const NPC_FIG_R = 55;     // ...when they are within this many metres of the camera
export const WIPE_T = 3.2;       // s, a line-up wipeout from the fall to lying on the board again
// Shoreward and along-the-line (+o) as world vectors.
const SHORE_X = -D0, SHORE_Z = -D1, ALONG_X = D1, ALONG_Z = -D0;
// Which way a surfer at alongshore offset o rides: away from their bank's peak (|o| = ZONE_O).
export function dirFor(o) {
  const s = o < 0 ? -1 : 1;
  return (Math.abs(o) >= SURF.ZONE_O ? 1 : -1) * s;
}
// The heading to paddle in on: toward the beach, angled 0.35 rad the way they will ride.
function takeoffYaw(dir) {
  const c = Math.cos(0.35), s = Math.sin(0.35) * dir;
  return Math.atan2(SHORE_Z * c + ALONG_Z * s, SHORE_X * c + ALONG_X * s);
}
// Each move's nominal length (s), for planning a ride; how it is ridden is steer() below.
export const MOVES = {
  drop: { dur: 0.9 }, bottom: { dur: 1.1 }, top: { dur: 1.0 }, cutback: { dur: 2.4 },
  floater: { dur: 1.8 }, air: { dur: 1.4 }, trim: { dur: 1.6 }, kick: { dur: 1.0 },
};
const TRICKS = ['top', 'cutback', 'top', 'floater', 'trim', 'air', 'top', 'cutback', 'trim'];
export function planRide(p, time) {
  const seed = Math.round(time * 7) * 131 + Math.round((p.oHome ?? p.o) * 13);
  const want = 5 + hash1(seed) * 4;
  const moves = []; let t = 0, i = 0;
  const push = (k) => { moves.push({ k, t0: t }); t += MOVES[k].dur; };
  push('drop'); push('bottom');
  while (t < want) { push(TRICKS[Math.floor(hash1(seed + 17 * (++i)) * TRICKS.length)]); if (t < want) push('bottom'); }
  push('kick');
  return { moves, mi: 0, t: 0, mt: 0, ph: 0, pt: 0, len: t, fallAt: 3 + Math.floor(hash1(seed + 5) * 2), falls: hash1(seed + 9) < 0.2,
    tt: -1.1, wm: 1.8, wd: 0, fMin: -0.25, boost: 0, lift: 0, comp: 0.6, carve: 0, snap: 0, back: 0, wide: 0, pump: undefined };
}
// ONE STEP OF THE MOVE BEING RIDDEN: where to steer (R.tt, a heading on the face), how hard (R.wm,
// the most rate of turn it allows; R.wd forces the way round: +1 up through the lip side, -1 down),
// and how the body carries it (comp, carve, snap, back, wide, pump - gl/surfer-figure.js). Returns
// true when the move is done. R.ph is the move's own phase, R.pt when that phase began.
export function steer(p, R) {
  const k = R.moves[R.mi].k, nx = R.moves[R.mi + 1] ? R.moves[R.mi + 1].k : 'kick';
  R.wd = 0; R.boost = 0; R.fMin = -0.25; R.lift = 0; R.pump = undefined;
  R.comp = 0.55; R.carve = 0; R.snap = 0; R.back = 0; R.wide = 0;
  const mt = R.mt, pt = R.mt - R.pt;
  const ph = (n) => { R.ph = n; R.pt = R.mt; };
  switch (k) {
    case 'drop':                  // straight-ish down the face off the take-off, low
      R.tt = -1.15; R.wm = 1.8; R.comp = 0.75;
      return p.f > FACE_BOT * 0.6 || mt > 1.5;
    case 'bottom': {              // down to the bottom of the face, then carve back up it
      if (R.ph === 0) { R.tt = -1.05; R.wm = 2.0; R.comp = 0.6; if (p.f > FACE_BOT * 0.58 || mt > 1.6) ph(1); return false; }
      const hard = nx === 'air' || nx === 'floater' || nx === 'kick';
      R.tt = hard ? 1.1 : nx === 'trim' ? 0.55 : 0.92; R.wm = hard ? 2.5 : 2.2; R.wd = 1; R.comp = 0.95; R.carve = 1;
      return p.th > R.tt - 0.12 || pt > 1.5;
    }
    case 'top':                   // up to the lip, and snap back down off it
      if (R.ph === 0) { R.tt = 0.9; R.wm = 2.0; R.carve = 0.4; R.comp = 0.7; if (p.f < 0.85 || mt > 1.6) ph(1); return false; }
      R.tt = -1.05; R.wm = 3.3; R.wd = -1; R.comp = 0.65; R.snap = 1;
      return p.th < -0.72 || pt > 1.1;
    case 'cutback':               // round toward the curl, then rebound off it: a figure eight
      if (R.ph === 0) { R.tt = 0.5; R.wm = 1.6; R.comp = 0.6; if (p.f < FACE_BOT * 0.42 || mt > 1.1) ph(1); return false; }
      if (R.ph === 1) { R.tt = 2.85; R.wd = 1; R.wm = 1.9; R.comp = 0.85; R.carve = 1; R.back = 0.8; if (p.th > 2.55 || pt > 2.2) ph(2); return false; }
      if (R.ph === 2) { R.tt = 2.9; R.wm = 1.0; R.comp = 0.6; R.back = 1; if (pt > 0.45) ph(3); return false; }
      R.tt = -0.55; R.wd = -1; R.wm = 2.7; R.comp = 0.95; R.carve = 1; R.snap = 0.4;
      return (p.th < 0.05 && p.th > -1.5) || pt > 2.0;
    case 'floater':               // up onto the lip, along the top of it, and down off it
      if (R.ph === 0) { R.tt = 1.0; R.wm = 2.2; R.comp = 0.7; R.carve = 0.4; if (p.f < 0.2 || mt > 1.6) ph(1); return false; }
      if (R.ph === 1) {
        R.tt = 0.05; R.wm = 2.2; R.wd = -1; R.fMin = -0.5; R.wide = 1; R.comp = 0.55;
        R.lift = 0.12 * Math.sin(Math.PI * Math.min(1, pt / 0.8));
        if (pt > 0.8) ph(2);
        return false;
      }
      R.tt = -1.1; R.wm = 2.4; R.comp = 0.9; R.wide = 0.5; R.fMin = -0.5;
      return p.f > FACE_BOT * 0.3 || pt > 1.2;
    case 'air':                   // hard at the lip, off it, turned round in the air, down onto the face
      if (R.ph === 0) {
        R.tt = 1.15; R.wm = 2.6; R.comp = 0.9; R.carve = 0.5;
        if (p.f < 0.1 || mt > 1.6) {
          ph(1);
          // Not fast enough to leave the water: it is a top turn instead, snapped where it stands.
          if (p.V > 3.6) p.air = { y: 0, vy: 1.3 + 0.18 * p.V * Math.max(0, Math.sin(p.th)) };
          else R.moves[R.mi].k = 'top';
        }
        return false;
      }
      if (R.ph === 1) {
        if (p.air) { R.tt = -1.0; R.wd = -1; R.wm = 5.0; R.fMin = -0.6; R.wide = 1; R.comp = 1.0; return false; }
        ph(2);
      }
      R.tt = -0.9; R.wm = 2.0; R.comp = 1.0;
      return pt > 0.35;
    case 'trim': {                // along the line, weaving a little and pumping for speed
      const w = 2 * Math.PI * mt / 1.05;
      R.tt = 0.1 + 0.2 * Math.sin(w); R.wm = 1.4; R.boost = 0.9; R.pump = 0.05 * Math.sin(w + 0.9); R.comp = 0.5;
      return mt > 1.6;
    }
    case 'kick':                  // turn up and over the back of the wave
      R.tt = 1.35; R.wm = 2.1; R.wd = 1; R.fMin = -9; R.comp = 0.6;
      return p.f < -0.7 || mt > 2.5;
  }
  return true;
}
// A board turned the way people turn one: the rate builds (acc, rad/s/s) and eases off as it gets
// there, never more than wMax rad/s. Sitting up it spins quickly; lying down it comes round slowly.
function turnTo(p, target, wMax, acc, step) {
  const want = clampv(wrapA(target - p.yaw) * 2.2, -wMax, wMax);
  p.yr = (p.yr || 0) + clampv(want - (p.yr || 0), -acc * step, acc * step);
  p.yaw = wrapA(p.yaw + p.yr * step);
}
const smooth01 = (x) => { x = clampv(x, 0, 1); return x * x * (3 - 2 * x); };
// <<< SURFBOARDS

// >>> SURFBOARDS  the line-up's people, built here so a suite can run update() without a GL context.
export function makeLineup(count) {
  const people = [];
  for (let i = 0; i < count; i++) {
    const side = i % 2 === 0 ? 1 : -1;
    const j = Math.floor(i / 2);
    const r = hash1(i * 977 + 13), r2 = hash1(i * 4451 + 7);
    people.push({
      side,
      o: side * (SURF.ZONE_O + (j - 3) * 11 + (r - 0.5) * 9),
      // >>> SURFERS  d / dHome / dBreak / dIn / dOut are seated by _reseat().
      d: 0,
      dHome: 0,
      dBreak: 0,
      dIn: 22,
      dOut: 0,
      r2,
      // <<< SURFERS
      state: WAIT,
      t: r * 9,
      phase: r * 6.283,
      scale: 0.94 + r2 * 0.12,
      wipes: r2 > 0.72,      // this one falls off, deterministically
      cool: r * 6,
      paint: BOARD_LOOKS[i % BOARD_LOOKS.length],   // SURFBOARDS
      yaw: TO_SHORE + Math.PI, pitch: 0, roll: 0, rr: 0,   // SURFBOARDS
      // >>> SURFBOARDS  third pass: which foot forward, which way they ride, how they are turning.
      goofy: hash1(i * 313 + 5) < 0.45,
      dir: 0, yr: 0, ps: 0, glide: 0, dk: -1, sub: 0,
      // <<< SURFBOARDS
    });
  }
  return people;
}
// <<< SURFBOARDS

export class Surfers {
  constructor(gl, count = 14) {
    this.gl = gl;
    this.prog = link(gl, VERT, FRAG, 'surfers', ATTR);
    this.u = uniforms(gl, this.prog, ['uViewProj', 'uTime', 'uCamPos', 'uSunDir', 'uExposure',
      // >>> ENVREF  all three are null under ?cdbg=noenv, which omits the chunk.
      'uShadowMap', 'uLightViewProj', 'uShadowTexel']);
      // <<< ENVREF
    // >>> SURFERS  ?cdbg=oldmesh selects the pre-2026-09-20 meshes verbatim.
    this.types = OLD_MESH ? {
      prone: this._upload(buildProne()),
      rider: this._upload(buildRider()),
      loose: this._upload(buildLooseBoard()),
    } : {
      prone: this._upload(buildProneNew()),
      rider: this._upload(buildRiderNew()),
      loose: this._upload(buildLooseBoardNew()),
    };
    // <<< SURFERS
    // >>> SURFER
    // Built here with everything else - SPEC section 5 bans creating GL objects on a first draw.
    // A failure is loud but not fatal: the player falls back to the line-up's own figures.
    try { this.fig = this._uploadFigure(new SurferFigure()); } catch (e) { this.fig = null; this.figWarn = String(e); console.warn('[surfers] figure:', e); }
    // >>> SURFBOARDS  draw slots for the nearest line-up surfers as jointed people (the lod 2 mesh,
    // shared). Each person keeps their own pose; a slot is skinned for whoever is nearest this frame.
    this.npc = [];
    try {
      const proto = new SurferFigure({ lod: 2, data: false });
      for (let i = 0; i < NPC_FIGS; i++) this.npc.push(this._uploadFigureBuf(proto.makeData(), proto.idx, proto.tris));
    } catch (e) { this.npc = null; console.warn('[surfers] line-up figures:', e); }
    // <<< SURFBOARDS
    this._figT = null;
    // <<< SURFER
    this.lastStats = { draws: 0, tris: 0, instances: 0 };
    this._slot = makeSurfSlot();
    this._w = [0, 0];
    this._sc = {};
    // >>> SURFERS
    // NOT findBreak() any more, and NOT in the constructor any more. This runs
    // before ?surf= has been applied (renderer.js:102) so there is no live surf
    // control to solve against yet; _reseat() does it on the first update(),
    // and again whenever the control moves. 0 rather than undefined because the
    // probes look the instance up by `people && dBreak !== undefined`.
    this.dBreak = 0;
    this._seatCtl = -1;
    // >>> SURFER
    // THE PLAYER, when the craft is the surfboard (src/boats/surfboard.js). Set by the craft hub,
    // null otherwise. Drawn with the same three figures as the line-up, so the player looks like
    // one of them. Read-only here, like everything else in this file.
    this.player = null;
    // <<< SURFER

    // <<< SURFERS
    // Half on each bank, spread along it, sitting just outside the break (SURFBOARDS: makeLineup).
    this.people = makeLineup(count);
  }
  // >>> SURFERS

  // Seat the line-up against the break THIS sea makes. Called from update()
  // when the surf control changes, which includes the first frame - the
  // constructor cannot do it because it runs before ?surf= is read.
  //
  // COST, measured: 14 people x 56 samples = 0.58 ms on this machine (node,
  // mean of 20 reps). It runs once at start-up and once per press of [ or ],
  // never per frame. The old code spent 56 samples once, so the steady-state
  // per-frame cost of this change is exactly zero.
  _reseat(ctl) {
    this._seatCtl = ctl;
    if (OLD_SEAT) {
      // THE ABLATION: the pre-2026-09-20 arithmetic, verbatim. One break line,
      // solved at ctl 1 and t 0, cached so that - as before - it does not move
      // when the surf does.
      if (this._oldBreak === undefined) this._oldBreak = findBreak();
      this.dBreak = this._oldBreak;
      for (const p of this.people) {
        p.dBreak = this.dBreak;
        p.dHome = this.dBreak + 4 + (p.r2 - 0.5) * 12;
        p.dIn = 22;
        p.dOut = this.dBreak + 40;
        if (!(p.d > 0)) p.d = this.dBreak + 4 + (p.r2 - 0.5) * 14;
      }
      return;
    }
    // The crest value, reported on the instance for the probes and for nothing
    // else. Every person is seated against their OWN column below.
    this.dBreak = breakOnset(SURF.ZONE_O, ctl);
    for (const p of this.people) {
      const b = breakOnset(p.o, ctl);
      const wasHome = p.dHome;
      p.dBreak = b;
      p.dHome = Math.max(D_MIN_HOME, b + OUT_MARGIN + (p.r2 - 0.5) * OUT_SPREAD);
      // The inside end of a ride. It was a flat 22 m, which at 0.35x is outside
      // the whole line-up and made every ride zero metres long.
      p.dIn = Math.max(12, Math.min(22, p.dHome - 8));
      p.dOut = p.dHome + 26;
      // A SIZE CHANGE MOVES THE WHOLE LINE-UP WITH THE BREAK, rigidly, by the
      // change in this person's OWN home distance - it does not re-place them.
      // MEASURED, and this is a defect the first version of this fix had: the
      // relax term in WAIT walks at 1.35 m/s (BACK) or a 2 s time constant
      // (WAIT), so after a [ then ] the line-up needed 60-90 s to paddle back
      // out and spent that minute inside the break - which is the bug this
      // whole pass exists to remove, reintroduced as a transient. Shifting by
      // the delta keeps everyone the same distance outside the break they were
      // a frame earlier, which is what "the placement tracks the sea" means.
      // The first seat (dHome was 0) still places them outright.
      if (!(p.d > 0) || !(wasHome > 0)) p.d = p.dHome;
      else p.d = Math.min(Math.max(p.d + (p.dHome - wasHome), 12), p.dOut);
    }
  }

  // <<< SURFERS
  _upload(kit) {
    const gl = this.gl;
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const nv = kit.pos.length / 3;
    const data = new Float32Array(nv * 10);
    for (let i = 0; i < nv; i++) {
      data.set([kit.pos[i * 3], kit.pos[i * 3 + 1], kit.pos[i * 3 + 2],
        kit.nrm[i * 3], kit.nrm[i * 3 + 1], kit.nrm[i * 3 + 2],
        kit.col[i * 3], kit.col[i * 3 + 1], kit.col[i * 3 + 2],
        kit.anim[i]], i * 10);
    }
    buffer(gl, gl.ARRAY_BUFFER, data);
    gl.enableVertexAttribArray(ATTR.aPos); gl.vertexAttribPointer(ATTR.aPos, 3, gl.FLOAT, false, 40, 0);
    gl.enableVertexAttribArray(ATTR.aNormal); gl.vertexAttribPointer(ATTR.aNormal, 3, gl.FLOAT, false, 40, 12);
    gl.enableVertexAttribArray(ATTR.aColor); gl.vertexAttribPointer(ATTR.aColor, 3, gl.FLOAT, false, 40, 24);
    gl.enableVertexAttribArray(ATTR.aAnim); gl.vertexAttribPointer(ATTR.aAnim, 1, gl.FLOAT, false, 40, 36);

    const inst = new Float32Array(MAX_INST * INST_FLOATS);
    const ibo = buffer(gl, gl.ARRAY_BUFFER, inst, gl.DYNAMIC_DRAW);
    for (let j = 0; j < 3; j++) {
      const loc = ATTR.aInst0 + j;
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, 48, j * 16);
      gl.vertexAttribDivisor(loc, 1);
    }
    buffer(gl, gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(kit.idx));
    gl.bindVertexArray(null);
    return { vao, ibo, inst, n: 0, count: kit.idx.length, tris: kit.tris3 };
  }

  // >>> SURFER
  // The player's figure: the same vertex layout and program as the line-up, but its vertex buffer is
  // DYNAMIC - the body is skinned on the CPU every frame (gl/surfer-figure.js) - and it has one
  // instance, the board's own transform.
  _uploadFigure(fig) {
    return { fig, ...this._uploadFigureBuf(fig.data, fig.idx, fig.tris) };
  }
  // SURFBOARDS: the same, for a buffer that is not a figure's own (a line-up draw slot).
  _uploadFigureBuf(data, idx, tris) {
    const gl = this.gl;
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const vbo = buffer(gl, gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(ATTR.aPos); gl.vertexAttribPointer(ATTR.aPos, 3, gl.FLOAT, false, 40, 0);
    gl.enableVertexAttribArray(ATTR.aNormal); gl.vertexAttribPointer(ATTR.aNormal, 3, gl.FLOAT, false, 40, 12);
    gl.enableVertexAttribArray(ATTR.aColor); gl.vertexAttribPointer(ATTR.aColor, 3, gl.FLOAT, false, 40, 24);
    gl.enableVertexAttribArray(ATTR.aAnim); gl.vertexAttribPointer(ATTR.aAnim, 1, gl.FLOAT, false, 40, 36);
    const inst = new Float32Array(INST_FLOATS);
    const ibo = buffer(gl, gl.ARRAY_BUFFER, inst, gl.DYNAMIC_DRAW);
    for (let j = 0; j < 3; j++) {
      const loc = ATTR.aInst0 + j;
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, 48, j * 16);
      gl.vertexAttribDivisor(loc, 1);
    }
    buffer(gl, gl.ELEMENT_ARRAY_BUFFER, idx);
    gl.bindVertexArray(null);
    return { vao, vbo, ibo, inst, count: idx.length, data, tris };
  }
  // <<< SURFER

  // SURFBOARDS: `paint` [design, A, B] (none = the vertex colours); `cap` = the player's own.
  _add(type, x, y, z, yaw, pitch, roll, phase, scale, stroke, paint, cap) {
    const t = this.types[type];
    if (t.n >= MAX_INST) return;
    const o = t.n * INST_FLOATS, a = t.inst;
    a[o] = x; a[o + 1] = y; a[o + 2] = z; a[o + 3] = yaw;
    a[o + 4] = pitch; a[o + 5] = roll; a[o + 6] = phase; a[o + 7] = scale;
    a[o + 8] = stroke; a[o + 9] = (paint ? paint[0] : 9) + (cap ? 10 : 0); a[o + 10] = paint ? paint[1] : 0; a[o + 11] = paint ? paint[2] : 0;
    t.n++;
  }

  // Station s for a given (d, o), by the same fixed point used above. Two
  // iterations is plenty here - the beach's along-X gradient is under 0.024.
  _station(d, o) {
    let s = d + 38;
    for (let i = 0; i < 6; i++) {
      toWorld(s, o, this._w);
      shoreCoords(this._w[0], this._w[1], this._sc);
      s += (d - this._sc.d);
    }
    return s;
  }

  // sea: the Sea object the whole game reads. dt: seconds. Visual only.
  update(sea, time, dt) {
    // >>> SURFER  a zero step (paused, or a second camera re-drawing the same instant) keeps the
    // line-up where it is while the player is on a board, instead of hiding it - the player would
    // vanish with it. With no player this line behaves exactly as it always has.
    if (!sea || sea.surfCtl <= 0 || !(dt > 0)) { this._hidden = !(this.player && sea && sea.surfCtl > 0 && this.people[0].wx !== undefined); return; }
    // <<< SURFER
    this._hidden = false;
    this._sea = sea;                  // SURFBOARDS: draw() samples the water under a wipeout's board
    // >>> SURFERS  the break line tracks the sea, so the seating has to too.
    if (this._seatCtl !== sea.surfCtl) this._reseat(sea.surfCtl);
    // <<< SURFERS
    const step = Math.min(dt, 0.1), ctl = sea.surfCtl;
    const w2 = this._w2 || (this._w2 = [0, 0]);
    for (const p of this.people) {
      if (p.oHome === undefined) p.oHome = p.o;
      toWorld(this._station(p.d, p.o), p.o, this._w);
      const S = surfSample(this._w[0], this._w[1], time, 0, ctl, this._slot);
      const px = this._w[0], pz = this._w[1];        // (_station() reuses this._w - keep where they are)
      const chi = S.chi, chiP = p.chiP === undefined ? chi : p.chiP;
      p.chiP = chi;
      p.t += step;
      p.brk = S.brk; p.c = S.c;
      p.lift = 0; p.spin = 0; p.land = 0; p.dip = 0;

      // >>> SURFBOARDS  (third pass: see the block above steer())
      switch (p.state) {
        case WAIT: {
          // Sitting just outside the break, facing out to sea to watch it come, drifting round a
          // little on the swell.
          p.d += clampv((p.dHome - p.d) * 0.5, -0.5, 0.5) * step;
          p.o += clampv((p.oHome - p.o) * 0.3, -0.5, 0.5) * step;
          p.cool -= step;
          turnTo(p, TO_SHORE + Math.PI + 0.25 * Math.sin(p.t * 0.11 + p.phase), 0.5, 1.2, step);
          // GOING FOR ONE. Not when the crest is on you: that was the cue the second pass used, and by
          // then it is too late to turn round and paddle. When the crest BEFORE it has just gone
          // under you (chi through 1.8) the next is about five seconds out - time to turn round
          // sitting up (~2 s), lie down and paddle into it (~2 s). And one surfer per wave: nobody
          // goes while someone on the same bank, going the same way, is already on it.
          if (p.cool <= 0 && S.amp > 0.18 && chiP < 1.8 && chi >= 1.8 && chi - chiP < 1) {
            const dir = dirFor(p.o);
            if (!this.people.some((q) => q !== p && q.side === p.side && q.dir === dir && (q.state === PADDLE || q.state === RIDE))) {
              p.dir = dir; p.state = PADDLE; p.t = 0; p.sub = 0; p.seen = false; p.ps = 0;
            }
          }
          break;
        }
        case PADDLE: {
          const want = takeoffYaw(p.dir);
          if (p.sub === 0) {
            // Turning the board round sitting up: legs beating, hands sculling (the figure's spin).
            turnTo(p, want, 1.5, 3.0, step);
            p.spin = Math.min(1, Math.abs(p.yr) / 1.2);
            if (Math.abs(wrapA(want - p.yaw)) < 0.4) p.sub = 1;
          } else {
            // Down, and paddling in, angled the way they will go.
            turnTo(p, want, 0.7, 2.0, step);
            p.ps += (1.6 - p.ps) * Math.min(1, step * 1.2);
            this._paddle(p, step);
          }
          if (chi < -1.5) p.seen = true;
          if (p.seen && chi > -0.8 && chi < 0.2 && S.amp > 0.12) this._catch(p, S, time, ctl);
          else if ((p.seen && chi > 0.25 && chi < 2) || p.t > 10) { p.state = BACK; p.t = 0; p.glide = 0; p.dk = -1; }   // missed it
          break;
        }
        case RIDE: this._ride(p, S, time, ctl, step); break;
        case TUMBLE:
          // The white water carries swimmer and board in, easing off; the rest is choreography
          // (gl/surfer-figure.js wipeBoard / SurferFigure._wipe).
          p.d -= 1.3 * Math.max(0, 1 - p.t / 1.8) * step;
          if (p.t >= p.wipe.T) {
            p.state = BACK; p.t = 0; p.yaw = wrapA(p.wipe.h0 + p.wipe.turn); p.yr = 0; p.ps = 0; p.glide = 0; p.dk = -1;
            p.pitch = 0; p.roll = 0;
          }
          break;
        case BACK: {
          // Back out to where they sit. A paddler goes where the board points, so the board is
          // turned - gently - toward home and they follow it round; nobody crabs sideways.
          toWorld(this._station(p.dHome, p.oHome), p.oHome, w2);
          const hx = w2[0] - px, hz = w2[1] - pz, dist = Math.hypot(hx, hz);
          const want = Math.atan2(hz, hx), err = wrapA(want - p.yaw);
          turnTo(p, want, 0.9, 1.8, step);
          // Straight off a kick-out the board is still gliding; then the stroke takes over.
          p.glide = Math.max(0, (p.glide || 0) - 2.2 * step);
          const pace = 1.35 * clampv(Math.cos(err), 0.15, 1) * Math.min(1, Math.max(0.3, dist / 4));
          p.ps += (pace - p.ps) * Math.min(1, step * 1.5);
          this._paddle(p, step, Math.max(p.ps, p.glide));
          // DUCK-DIVING whatever breaks on the way out: under it, and out the back.
          // (Not only a breaking one: out of the sets nothing breaks, and a surfer inside the break still
          // goes under a wave of any size rather than be carried back in on it.)
          if (!(p.dk >= 0) && (S.brk > 0.15 || S.foam > 0.3 || (S.amp > 0.28 && p.d < p.dBreak + 5)) && chi > -0.75 && chi < -0.3) p.dk = 0;
          if (p.dk >= 0) {
            p.dk += step;
            p.dip = 0.65 * Math.min(1, p.dk / 0.25) * (1 - smooth01((p.dk - 0.8) / 0.5));
            if (p.dk > 1.35) { p.dk = -1; p.dip = 0; }
          }
          if (dist < 1.6 && !(p.dk >= 0)) { p.state = WAIT; p.t = 0; p.cool = 2 + hash1(Math.round(time) + p.o) * 10; }
          break;
        }
        default: p.state = WAIT;
      }
      // <<< SURFBOARDS
      // >>> SURFERS  the outer clamp is per person now, because the break is.
      if (p.state !== RIDE) {
        if (p.d < 12) p.d = 12;
        if (p.d > p.dOut) p.d = p.dOut;
      }
      // <<< SURFERS
      // >>> SURFBOARDS  WHERE, AND THE WATER UNDER IT. The height is the whole drawn surface - swell
      // and surf together, the sea's own sampler - not the surf field alone, which is what `eta`
      // once was, so a board rose and sank through the swell (27 Sep, second pass).
      toWorld(this._station(p.d, p.o), p.o, this._w);
      p.wx = this._w[0]; p.wz = this._w[1];
      const Wt = sea.sample(p.wx, p.wz, time, 0, 3);
      p.eta = Wt.height;
      const sX = Wt.slopeX, sZ = Wt.slopeZ;
      p.sd = sX * D0 + sZ * D1;                          // the face's slope, up toward the crest
      // How fast the board is turning (the figure leans on it; a carve banks by it).
      const yawNow = p.yaw;
      p.rr += (wrapA(yawNow - (p.yawP ?? yawNow)) / step - p.rr) * Math.min(1, step * 10);
      p.yawP = yawNow;
      // THE BOARD ON THE WATER: pitched and rolled by the slope of the water under it, and banked
      // into a turn - eased, so a passing swell rocks it rather than jerks it.
      const ch = Math.cos(p.yaw), sh = Math.sin(p.yaw);
      let pT = Math.atan(sX * ch + sZ * sh) * 0.9, rT = -Math.atan(-sX * sh + sZ * ch) * 0.8;
      if (p.state === RIDE) { pT += p.pExtra || 0; rT += p.bankT || 0; }
      const kk = Math.min(1, step * (p.state === RIDE ? 14 : 6));
      p.pitch += (pT - p.pitch) * kk; p.roll += (rT - p.roll) * kk;
      const off = p.state === RIDE ? (OLD_MESH ? 0.04 : 0.05) : p.state === WAIT ? (OLD_MESH ? 0.22 : 0.02) : (OLD_MESH ? 0.06 : -0.01);
      p.bx = p.wx; p.bz = p.wz; p.by = p.eta + off + p.lift - p.dip;
      p.byaw = p.yaw; p.bpitch = p.pitch; p.broll = p.roll;
      if (p.state === TUMBLE) {
        // The board where the wipeout has thrown it, on the water where it is; and the water's height
        // where the swimmer comes up (the figure keeps their head at it).
        const Wp = p.wipe, b = wipeBoard(p.t, Wp.T, Wp.turn, Wp.rel, Wp.b);
        const c0 = Math.cos(Wp.h0), s0 = Math.sin(Wp.h0);
        p.bx = p.wx + c0 * b.x - s0 * b.z; p.bz = p.wz + s0 * b.x + c0 * b.z;
        const wb = sea.sample(p.bx, p.bz, time, 0, 3).height;
        const P = swimPoint(Wp.turn);
        const ws = sea.sample(p.wx + c0 * P[0] - s0 * P[2], p.wz + s0 * P[0] + c0 * P[2], time, 0, 3).height;
        p.hs = ws - p.eta; p.hb = wb - p.eta;
        p.by = wb + b.y; p.byaw = Wp.h0 + b.yaw; p.bpitch = b.pitch; p.broll = b.roll;
      }
      // <<< SURFBOARDS
    }
  }

  // >>> SURFBOARDS  the line-up's helpers (third pass).
  // Paddling moves the board the way it points, at v (m/s; default the stroke's own pace).
  _paddle(p, step, v) {
    const s = (v === undefined ? p.ps : v) * step;
    const dx = Math.cos(p.yaw) * s, dz = Math.sin(p.yaw) * s;
    p.d += dx * D0 + dz * D1;           // +d is seaward: the world's (D0, D1)
    p.o += dx * ALONG_X + dz * ALONG_Z;
  }
  // chi (the surf field's own phase: 0 at a crest) at (d, o).
  _chi(d, o, t, ctl) {
    const w = this._w3 || (this._w3 = [0, 0]);
    toWorld(this._station(d, o), o, w);
    return surfSample(w[0], w[1], t, 0, ctl, this._slot3 || (this._slot3 = makeSurfSlot())).chi;
  }
  // One Newton step toward the crest a rider is on (chi = 0), at their own o.
  _crest(p, t, ctl) {
    const c0 = this._chi(p.dc, p.o, t, ctl);
    const k = wrapA(this._chi(p.dc + 0.4, p.o, t, ctl) - this._chi(p.dc - 0.4, p.o, t, ctl)) / 0.8;
    if (k > 0.05 && Math.abs(c0) < 2.6) p.dc += clampv(-c0 / k, -1.2, 1.2);
  }
  // Caught it: the pop-up, on the face, going down it.
  _catch(p, S, time, ctl) {
    p.state = RIDE; p.t = 0;
    p.ride = planRide(p, time);
    p.dc = p.d + Math.max(0.5, -S.chi / 0.3);
    for (let i = 0; i < 4; i++) this._crest(p, time, ctl);
    p.f = clampv(p.dc - p.d, 0.3, FACE_BOT); p.d = p.dc - p.f;
    p.th = -1.0; p.om = 0; p.V = 3.2; p.air = null; p.dcV = -S.c; p.yr = 0;
  }
  // A step of a ride - see the block above steer().
  _ride(p, S, time, ctl, step) {
    const R = p.ride;
    R.t += step; R.mt += step;
    const dc0 = p.dc;
    this._crest(p, time, ctl);
    p.dcV += ((p.dc - dc0) / step - p.dcV) * Math.min(1, step * 5);
    // Where a ride has to end whatever was planned: the wave gone, the beach, the pier, long enough.
    const last = R.moves.length - 1;
    if (R.mi < last && (S.amp < 0.1 || p.d < p.dIn + 2 || Math.abs(p.o) < 16 || R.t > R.len + 4)) { R.mi = last; R.mt = 0; R.ph = 0; R.pt = 0; }
    let n = 0;
    while (steer(p, R) && n++ < 3) {
      if (R.mi >= last) { this._endRide(p); return; }
      R.mi++; R.mt = 0; R.ph = 0; R.pt = 0;
    }
    // A wipeout, on the rides that have one coming: at the committed part of the move.
    if (R.falls && R.mi === R.fallAt && (R.ph >= 1 ? R.mt - R.pt > 0.3 : R.mt > 0.7)) { this._fall(p); return; }
    // STEER: the rate of turn builds toward what the move wants, and unwinds as it gets there.
    let e = wrapA(R.tt - p.th);
    if (R.wd > 0 && e < -0.05) e += 2 * Math.PI; else if (R.wd < 0 && e > 0.05) e -= 2 * Math.PI;
    const acc = (p.air ? 30 : ALPHA) * step;
    p.om += clampv(clampv(e * 3.2, -R.wm, R.wm) - p.om, -acc, acc);
    p.th = wrapA(p.th + p.om * step);
    // SPEED: climbing the face costs it, dropping gives it back; the wave's push holds it near trim.
    if (!p.air) p.V += (-GRAV * clampv(p.sd || 0.1, -0.3, 0.35) * Math.sin(p.th) + 0.8 * (V_TRIM + R.boost - p.V)) * step;
    if (p.f < -0.1) p.V -= 2.5 * step;              // over the back: the wave goes on without them
    p.V = clampv(p.V, 3.0, 7.4);
    // WHERE: on the face, and along the line.
    // The lip is a limit the move sets (a floater or an air may go over it, a turn may not). Reached,
    // it stops the rider; found beyond it (the move has just changed) it eases them back - never a snap.
    let fN = p.f - p.V * Math.sin(p.th) * step;
    if (fN < R.fMin) fN = Math.min(R.fMin, Math.max(fN, p.f + 1.2 * step));
    p.f = Math.min(fN, FACE_BOT + 1.6);
    p.o += p.dir * p.V * Math.cos(p.th) * step;
    p.d = p.dc - p.f;
    if (p.air) {
      p.air.y += p.air.vy * step; p.air.vy -= GRAV * step;
      if (p.air.y <= 0 && p.air.vy < 0) { p.air = null; p.land = 1; }
    }
    p.lift = p.air ? p.air.y : R.lift;
    // THE BOARD POINTS WHERE IT IS GOING THROUGH THE WATER: its own motion over the face, the
    // wave's travel, less the surge of the water it is in.
    const w = this._w3 || (this._w3 = [0, 0]);
    toWorld(this._station(p.d, p.o), p.o, w);
    const Wv = surfSample(w[0], w[1], time, 0, ctl, this._slot3 || (this._slot3 = makeSurfSlot()));
    const vAl = p.dir * p.V * Math.cos(p.th), vD = p.dcV + p.V * Math.sin(p.th);
    const rAl = vAl - 0.7 * (Wv.ux * ALONG_X + Wv.uz * ALONG_Z), rD = vD - 0.7 * (Wv.ux * D0 + Wv.uz * D1);
    p.vb = Math.hypot(rAl, rD);
    const want = Math.atan2(rAl * ALONG_Z + rD * D1, rAl * ALONG_X + rD * D0);
    // Capped: pointing straight up the face at about the wave's own speed a board is barely moving
    // through the water, and its heading would whip round (measured: 14.6 rad/s in a cutback).
    p.yaw = wrapA(p.yaw + clampv(wrapA(want - p.yaw) * 14, -4.2, 4.2) * step);
    // Banked INTO the turn, by the angle that turn needs: tan(bank) = v * rate / g - less a little,
    // because the rider's own weight does some of it (knees and hips over the rail; the figure's
    // lean, gl/surfer-figure.js) and a small wave's carve is on 20-40 degrees of rail, not 55.
    p.bankT = clampv(Math.atan(0.8 * p.vb * p.rr / GRAV), -0.75, 0.75) * (p.air ? 0.3 : 1);
    p.pExtra = p.air ? 0.3 * clampv(p.air.vy / 2, -1, 1) : 0;
  }
  // Over the back: lie down and paddle home, the board still gliding at first.
  _endRide(p) {
    p.state = BACK; p.t = 0; p.glide = Math.min(3, (p.vb || 3) * 0.6); p.ps = 0; p.dk = -1;
    p.air = null; p.lift = 0; p.yr = p.rr;
  }
  // Off. They will come up facing home.
  _fall(p) {
    const w2 = this._w2 || (this._w2 = [0, 0]);
    toWorld(this._station(p.dHome, p.oHome), p.oHome, w2);
    const home = Math.atan2(w2[1] - p.wz, w2[0] - p.wx);
    p.wipe = { T: WIPE_T, h0: p.yaw, turn: wrapA(home - p.yaw), rel: { dy: 0.05 + (p.lift || 0), pitch: p.pitch, roll: p.roll }, b: {} };
    p.state = TUMBLE; p.t = 0; p.air = null; p.lift = 0;
  }
  // The figure's extras for this surfer (gl/surfer-figure.js update's X).
  _fx(p) {
    const X = p.fx || (p.fx = {});
    const R = p.state === RIDE ? p.ride : null;
    X.goofy = p.goofy; X.spin = p.spin || 0; X.land = p.land || 0; X.banked = 1;
    X.comp = R ? R.comp : undefined; X.pump = R ? R.pump : undefined;
    X.carve = R ? R.carve : 0; X.snap = R ? R.snap : 0; X.back = R ? R.back : 0; X.wide = R ? R.wide : 0;
    if (p.state === TUMBLE && p.wipe) { X.wipeT = p.wipe.T; X.wipeTurn = p.wipe.turn; X.wipeRel = p.wipe.rel; X.wipeHs = p.hs || 0; X.wipeHb = p.hb || 0; }
    return X;
  }
  // <<< SURFBOARDS

  // Called after the coast is drawn, with the renderer's own matrices.
  // >>> ENVREF  `shadow` appended - the ShadowMap, or null/undefined on a
  // caller that has none, in which case sunShadow's uniforms stay at their GL
  // defaults and it returns 1.0 the way it did before this pass.
  // <<< ENVREF
  draw(cam, vp, sunDir, exposure, time, shadow) {
    const gl = this.gl;
    for (const k in this.types) this.types[k].n = 0;
    if (this._hidden) { this.lastStats = { draws: 0, tris: 0, instances: 0 }; return; }
    // >>> SURFBOARDS  the nearest few are drawn as jointed people (below), the rest as the figures.
    const figDt = this._npcT === undefined ? 1 / 60 : Math.max(0, Math.min(0.1, time - this._npcT));
    this._npcT = time;
    const near = [];
    if (this.npc && !OLD_MESH) {
      for (const p of this.people) {
        if (p.wx === undefined) continue;
        const d2 = (p.wx - cam.x) ** 2 + (p.wz - cam.z) ** 2;
        if (d2 < NPC_FIG_R * NPC_FIG_R) near.push([d2, p]);
      }
      near.sort((a, b) => a[0] - b[0]);
      near.length = Math.min(near.length, this.npc.length);
    }
    const jointed = new Set(near.map((n) => n[1]));
    const figDraws = [];
    // <<< SURFBOARDS

    for (const p of this.people) {
      if (p.bx === undefined) continue;
      // >>> SURFERS
      // THE BOARD WAS FLYING. WAIT put it 0.22 m above the local sea surface -
      // the hull 0.165 m clear of the water - which is why REFERENCE-NOTES
      // records "the board sits ON the surface like a decal" and why nothing
      // about it reads as wet. A 2.24 x 0.58 x 0.105 m soft-top displaces
      // about 75 kg; with an adult lying on it, it floats AWASH, deck at the
      // waterline. So the board centre belongs at the surface, not above it,
      // and the shader's own vWorld.y < 0 extinction then tints the submerged
      // rail for free. RIDE keeps a positive offset because a board that is
      // planing genuinely is lifted. (SURFBOARDS: those offsets are applied in
      // update() now, into p.by, with the board's whole transform; ?cdbg=oldmesh
      // still restores the old ones with the old meshes.)
      // <<< SURFERS
      // >>> SURFBOARDS  third pass: update() has placed the board (p.bx .. p.broll), on the water,
      // turned the way it is going, banked into its turn; a wipeout's board and swimmer are apart.
      const paint = p.paint;
      const tumble = p.state === TUMBLE && p.wipe;
      const sitting = p.state === WAIT || (p.state === PADDLE && p.sub === 0);
      const dk = p.dk >= 0 ? p.dk : -1;
      if (jointed.has(p)) {
        // A jointed person: their board as a loose board, and the body posed on it (or, in a
        // wipeout, off it - drawn in the wipeout's own frame until they climb back on).
        const F = p.fig || (p.fig = new SurferFigure({ lod: 2, data: false }));
        const me = p.me || (p.me = { state: 0, thr: 0, r: 0, stateT: 0, wave: { foam: 0 } });
        me.state = p.state === RIDE ? 2 : tumble ? 3 : dk >= 0 ? 1 : 0;
        me.thr = p.state === PADDLE ? (p.sub === 0 ? 0 : 1) : p.state === BACK ? 0.8 : 0;
        me.r = p.state === RIDE ? p.rr : 0;
        me.stateT = dk >= 0 ? dk : p.t;
        me.wave.foam = sitting ? 0 : 0.5;
        const ex = F.update(me, figDt, this._fx(p));
        if (tumble) {
          this._add('loose', p.bx, p.by, p.bz, p.byaw, p.bpitch, p.broll, p.phase, p.scale, 0, paint);
          const at = F.rig && F.rig.mount ? [p.bx, p.by, p.bz, p.byaw, p.bpitch, p.broll, p.scale] : [p.wx, p.eta, p.wz, p.wipe.h0, 0, 0, p.scale];
          figDraws.push([F, at, true]);
        } else {
          const pit = ex.abs ? ex.pitch : p.bpitch + ex.pitch, yy = p.by + ex.drop;
          this._add('loose', p.bx, yy, p.bz, p.byaw, pit, p.broll, p.phase, p.scale, 0, paint);
          figDraws.push([F, [p.bx, yy, p.bz, p.byaw, pit, p.broll, p.scale], true]);
        }
        continue;
      }
      // Further off, the rigid figures: lying (sitting is the lying one, tail down), standing, and a
      // loose board. A wipeout's swimmer is under the water, or just a head, until they climb on.
      if (tumble) {
        this._add('loose', p.bx, p.by, p.bz, p.byaw, p.bpitch, p.broll, p.phase, p.scale, 0, paint);
        if (wipePhase(p.t, p.wipe.T).i === 4) this._add('prone', p.bx, p.by, p.bz, p.byaw, p.bpitch - 0.06, p.broll, p.phase, p.scale, 0.3, paint);
      } else if (p.state === RIDE) this._add('rider', p.bx, p.by, p.bz, p.byaw, p.bpitch - 0.08, p.broll, p.phase, p.scale, 0, paint);
      else if (sitting) this._add('prone', p.bx, p.by, p.bz, p.byaw, p.bpitch - 0.25, p.broll, p.phase, p.scale, 0.25, paint);
      else this._add('prone', p.bx, p.by, p.bz, p.byaw, p.bpitch - (dk >= 0 ? 0.3 : 0.06), p.broll, p.phase, p.scale, dk >= 0 ? 0 : 1.0, paint);
      // <<< SURFBOARDS
    }

    // >>> SURFER
    const me = this.player, F = this.fig;
    let figAt = null;
    if (me && F) {
      // The jointed figure: posed from the board's state, skinned, drawn with the board's transform.
      const dt = this._figT === null ? 1 / 60 : Math.max(0, Math.min(0.1, time - this._figT));
      this._figT = time;
      if (me.state === 3) {
        // >>> SURFBOARDS  A WIPEOUT (third pass): the same sequence the line-up has - off, under, up
        // treading water, the board reeled in, climb back on - compressed into the board's 1.6 s.
        // Its frame: at the board's own point (me.x, me.z; where the board will be when it ends),
        // heading me.heading. The board and the swimmer's head sit on the water where they are.
        const W = this._pw || (this._pw = { b: {} });
        if (this._pwLast !== 3) {
          const pb = this._pb || { y: me.yDraw, pitch: me.pitch, roll: me.roll };
          W.rel = { dy: pb.y - (me.y || 0), pitch: pb.pitch, roll: pb.roll };
        }
        const T = (me.spec && me.spec.wipeSec) || 1.6, sea = this._sea;
        const b = wipeBoard(me.stateT || 0, T, 0, W.rel, W.b);
        const ch = Math.cos(me.heading), sh = Math.sin(me.heading), y0 = me.y || 0;
        const bx = me.x + ch * b.x - sh * b.z, bz = me.z + sh * b.x + ch * b.z;
        const wb = sea && sea.sample ? sea.sample(bx, bz, time, 0, 3).height : y0;
        const P = swimPoint(0);
        const ws = sea && sea.sample ? sea.sample(me.x + ch * P[0] - sh * P[2], me.z + sh * P[0] + ch * P[2], time, 0, 3).height : y0;
        F.fig.update(me, dt, { wipeT: T, wipeTurn: 0, wipeRel: W.rel, wipeHs: ws - y0, wipeHb: wb - y0 });
        this._add('loose', bx, wb + b.y, bz, me.heading + b.yaw, b.pitch, b.roll, 0.7, 1, 0, PLAYER_BOARD, true);
        figAt = F.fig.rig && F.fig.rig.mount ? [bx, wb + b.y, bz, me.heading + b.yaw, b.pitch, b.roll] : [me.x, y0, me.z, me.heading, 0, 0];
        F.fig.write(true);
        F.fig.drawAt = figAt;
        // Through the rider's own eyes (src/surfer/pov-cam.js puts the lens in this head), going off,
        // under and coming up the body tumbles and turns round the lens itself, and what is in view is
        // limbs cut open by the near plane (or, turning, the back of their own head) - so from its own
        // eyes it is not drawn until they are up and reaching for the board.
        if (F.fig.rig && F.fig.rig.phase <= 2) {
          const E = F.fig.eyes(), c = rotPoint(E.c, figAt[3], figAt[4], figAt[5]);
          if (Math.hypot(figAt[0] + c[0] - cam.x, figAt[1] + c[1] - cam.y, figAt[2] + c[2] - cam.z) < 0.7) figAt = null;
        }
        // <<< SURFBOARDS
      } else {
        const ex = F.fig.update(me, dt, PLAYER_FX);   // SURFBOARDS: the board banks, so the body need not
        const pit = ex.abs ? ex.pitch : me.pitch + ex.pitch, y = me.yDraw + ex.drop;   // abs: a duck-dive's own pitch
        this._add('loose', me.x, y, me.z, me.heading, pit, me.roll, 0.7, 1, 0, PLAYER_BOARD, true);   // SURFBOARDS: painted, capped
        figAt = [me.x, y, me.z, me.heading, pit, me.roll];
        this._pb = { y, pitch: pit, roll: me.roll };      // SURFBOARDS: where a wipeout starts from
        F.fig.write(true);
      }
      this._pwLast = me.state;
      if (me.state !== 3) F.fig.drawAt = figAt;             // SURFBOARDS: the first-person camera's frame
    } else if (me) {
      // No figure (its build failed): the line-up's own figures, as before.
      if (me.state === 2) this._add('rider', me.x, me.yDraw, me.z, me.heading, me.pitch, me.roll, 0.7, 1, 0);
      else this._add('prone', me.x, me.yDraw, me.z, me.heading, me.pitch, me.roll, 0.7, 1, me.stroke);
    }
    // <<< SURFER
    gl.useProgram(this.prog);
    gl.uniformMatrix4fv(this.u.uViewProj, false, vp);
    gl.uniform1f(this.u.uTime, time);
    gl.uniform3f(this.u.uCamPos, cam.x, cam.y, cam.z);
    gl.uniform3f(this.u.uSunDir, sunDir[0], sunDir[1], sunDir[2]);
    gl.uniform1f(this.u.uExposure, exposure);
    // >>> ENVREF
    if (shadow) shadow.bind(gl, this.prog, this.u);
    // <<< ENVREF
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
      gl.drawElementsInstanced(gl.TRIANGLES, t.count, gl.UNSIGNED_SHORT, 0, t.n);
      draws++; tris += t.tris * t.n; instances += t.n;
    }
    // >>> SURFER
    if (figAt) {
      gl.bindBuffer(gl.ARRAY_BUFFER, F.vbo);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, F.fig.data);
      const a = F.inst;
      a[0] = figAt[0]; a[1] = figAt[1]; a[2] = figAt[2]; a[3] = figAt[3];
      a[4] = figAt[4]; a[5] = figAt[5]; a[6] = 0.7; a[7] = 1; a[8] = 0;
      a[9] = 19; a[10] = 0; a[11] = 0;   // SURFBOARDS: no paint, capped (the first-person view cuts the body too)
      gl.bindBuffer(gl.ARRAY_BUFFER, F.ibo);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, a);
      gl.bindVertexArray(F.vao);
      gl.drawElementsInstanced(gl.TRIANGLES, F.count, gl.UNSIGNED_SHORT, 0, 1);
      draws++; tris += F.fig.tris; instances++;
    }
    // <<< SURFER
    // >>> SURFBOARDS  the nearest line-up surfers, jointed: one draw slot each.
    for (let i = 0; i < figDraws.length; i++) {
      const [NF, at, leash] = figDraws[i], slot = this.npc[i];
      NF.write(leash, slot.data);
      gl.bindBuffer(gl.ARRAY_BUFFER, slot.vbo);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, slot.data);
      const a = slot.inst;
      a[0] = at[0]; a[1] = at[1]; a[2] = at[2]; a[3] = at[3]; a[4] = at[4]; a[5] = at[5];
      a[6] = 0.7; a[7] = at[6]; a[8] = 0; a[9] = 9; a[10] = 0; a[11] = 0;
      gl.bindBuffer(gl.ARRAY_BUFFER, slot.ibo);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, a);
      gl.bindVertexArray(slot.vao);
      gl.drawElementsInstanced(gl.TRIANGLES, slot.count, gl.UNSIGNED_SHORT, 0, 1);
      draws++; tris += slot.tris; instances++;
    }
    // <<< SURFBOARDS
    gl.bindVertexArray(null);
    this.lastStats = { draws, tris, instances };
  }

  meshTris() {
    const o = {};
    for (const k in this.types) o[k] = this.types[k].tris;
    return o;
  }
}
