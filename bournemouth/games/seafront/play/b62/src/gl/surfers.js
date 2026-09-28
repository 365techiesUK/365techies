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
//    (PEOPLE, 27 Sep 2026: the wetsuits are now plain-colour panels and the
//    skin and hair a realistic range, one mix per person from hash1 - still
//    no logo, no text, no face. See SUIT_LOOKS.)
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
// (BOARDS, 27 Sep 2026: SIX - the bodies lying and standing, and a loose board per
// hull, every board in the water in one of those four; the boards' instances go up
// in one bufferSubData. ?cdbg=oldboard puts the three back.)
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
// >>> PEOPLE  (27 Sep 2026, PIER SURF stage 4 "better people": the render half)
// Five changes, one ablation each, in craft.js's ?cdbg= namespace like the rest of this file, so
// every one can be A/B'd on ONE build at a frozen camera (the owner's tree has one dev server):
//   ?cdbg=nocast    the rider and board cast no shadow, and receive without the self-shadow slack
//   ?cdbg=oldwater  the waterline back at world y 0 (the board turned cyan in every trough)
//   ?cdbg=norim     no wet-neoprene rim on the figures
//   ?cdbg=nolook    no palettes: the vertex colours, as before (a hood is still never drawn)
//   ?cdbg=oldpick   the jointed line-up picked as before (nearest three, every frame), the old rider
// All five together draw what the file drew before this pass.
import { ATTRIBS as SHADOW_ATTRIBS } from './shadow.js';
const NOCAST = CDBG_SURF.includes('nocast');
const OLDWATER = CDBG_SURF.includes('oldwater');
const NORIM = CDBG_SURF.includes('norim');
const OLDPICK = CDBG_SURF.includes('oldpick');
// The palettes are off under ?cdbg=oldmesh too: that ablation is "the pre-2026-09-20 meshes verbatim".
const LOOK_ON = !CDBG_SURF.includes('nolook') && !CDBG_SURF.includes('oldmesh');
// <<< PEOPLE
// >>> BOARDS  (27 Sep 2026, PIER SURF stage 5) ?cdbg=oldboard: today's single hull for everyone, the
// leash drawn as it was, and the shaders' text as it was - the whole of the boards pass off at once.
// (?cdbg=oldmesh implies it: those are the pre-2026-09-20 meshes verbatim.)
const OLD_BOARD = CDBG_SURF.includes('oldboard') || CDBG_SURF.includes('oldmesh');
const HULL_SEG = 16;   // outline samples a hull carries in the SurfLooks block (lkHull), u -1..1
const LEASH_R = 0.0055, LEASH_PX = 0.8, LEASH_REACH = 1.2, LEASH_MAX = 3;   // the leash's floor: Surfers.leashR
// THE FINS of the new hulls carry tag 4 (the foamie's keeps 3) and are built wound outward. Everything in
// the shaders that tells a fin from the hull does it by height - under -0.045 m is the paint's smoked
// fin, and the first-person cap's outward normal (FRAG Nout) - and a new hull's fin root is well above
// that, under a deck drawn higher (yOff). So a fin hands the fragment shader a model height under -0.045
// wherever it is: smoked all over, its own normal, never capped - and not one of FRAG's lines changes.
// (Adding "&& vTag < 3.5" to Nout instead moved 9 pixels of the default figure by up to 5 levels under
// SwiftShader - the compiler's choice, not a bug - and the default must draw to the bit as it did.)
const FIN_VS = OLD_BOARD ? '' : '  if (aAnim > 3.5) vLocal.y = min(vLocal.y, -0.05);   // BOARDS: a fin (FIN_VS)' + String.fromCharCode(10);
// <<< BOARDS
import { SURF, surfSample, makeSurfSlot, shoreCoords, fadeShift } from '../sea-surf.js';
// >>> SURFERS
// The set clock. Imported rather than retyped so the break line cannot drift
// from the sea's own set/lull, which is what it is solved against.
import { setFactor } from '../sea-surf.js';
// <<< SURFERS
import { DIR as PIER_DIR } from './pier.js';
// >>> SURFER  the player's own jointed figure (26 Sep 2026); the line-up keeps the figures below.
import { SurferFigure, wipeBoard, swimPoint, wipePhase, rotPoint, FB } from './surfer-figure.js';
// <<< SURFER
// >>> GPUSKIN  (27-28 Sep 2026, PIER SURF stage 6) the jointed figures skinned in the vertex shader.
import { figureGpuMesh, FIG_SB } from './surfer-figure.js';
import { DEPTH_FRAG_SRC } from './shadow.js';
// ?cdbg=cpuskin: the figures skinned on the CPU as before - write() into a vertex buffer sent every frame.
const CPUSKIN = CDBG_SURF.includes('cpuskin');
const ATTR_SKIN = 8;                        // aSkin (VERT_SKIN, and the skinned depth program)
const SB_NPC = 8;                           // the line-up figures one instanced draw can carry (NPC_FIGS is 6)
const BONES_BLOCK = 'SurfBones', BONES_BINDING = 3;   // 0 the wave table, 1 the surf tables, 2 SurfLooks
// <<< GPUSKIN

const ATTR = { aPos: 0, aNormal: 1, aColor: 2, aAnim: 3, aInst0: 4, aInst1: 5, aInst2: 6, aZone: 7 };   // PEOPLE: aZone
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
// <<< SURFBOARDS
// >>> PEOPLE  A MIXED LINE-UP, AND YOUR OWN LOOK (27 Sep 2026)
// Every figure wore the one charcoal suit and one skin tone, so fourteen people read as one person
// fourteen times. Now each carries a LOOK: a suit look (four plain-colour panels - suit, chest panel,
// knee pads, seams - and whether it has a hood, is a shorty, or has a rash vest over it), a skin tone
// and a hair colour. The line-up's come from hash1 of the person's index; the player's from
// `playerLook`, which the level sets. Look 0, skin 0 and hair 0 are the colours the figure is built
// with (gl/surfer-figure.js COL), so the player's default is today's figure exactly.
//
// THE PALETTES ARE A UNIFORM BLOCK, NOT CONST ARRAYS - and the board paint moved in with them. ANGLE's
// Direct3D 11 translator emits a GLSL const array as `static` HLSL, a writable per-thread array that,
// indexed dynamically, lives in scratch memory on Intel: the b40 finding (sea-surf.js SURF_TABLES),
// which cost the owner's Dell (Iris Xe) about 150 ms a frame in the water. BPAL here was the same
// thing, the last one in this program. A block is a constant buffer, read natively at any index.
// Layout (std140, one vec4 a slot so no index picks a component):
//   lkSuit[4 i + 0..3]  look i: (suit, hood) (chest, shorty) (knee, rash vest) (seams, 0)
//   lkSkin[j], lkHair[j]  (colour, 0)      lkBoard[j]  BOARD_PAL, rounded as the old literal was (4 dp)
//   lkHull[16 k + i]  BOARDS: hull k's half-width at u = -1 + i/8 and at the next sample (x, y), for
//                     the paint's outline; [16 k] z, w its centre and half length, [16 k + 1] z its pad
//                     flag (HULL_TABLE; filled in by the constructor, after LOOKS)
// Binding point 2: 0 is the wave table (sea-glsl.js), 1 the surf tables (sea-surf.js).
export const SUIT_LOOKS = [
  { c: ['#252A30', '#1A1E23', '#353B42', '#131518'] },           // 0 the figure's own (surfer-figure.js COL; the constructor re-reads them off the mesh)
  { c: ['#1B1E22', '#141619', '#2B2F34', '#0E0F11'], hood: 1 },   // 1 a hooded winter black
  { c: ['#2B2F36', '#1E2C47', '#3B4048', '#171A1F'] },           // 2 charcoal, a navy chest panel
  { c: ['#1F2328', '#2F6FB5', '#30353B', '#14171A'], vest: 1 },   // 3 a blue rash vest over black
  { c: ['#2E3338', '#1C1F23', '#2E3338', '#15171A'], shorty: 1 }, // 4 a shorty: bare forearms and shins, no knee pad
  { c: ['#202428', '#1F5C63', '#33383E', '#2A6E74'] },           // 5 black, a teal chest panel and taped seams
  { c: ['#2F332C', '#242820', '#3E4238', '#16180F'], hood: 1 },   // 6 a hooded olive-black
  { c: ['#1D2025', '#C9CDD0', '#30353B', '#14171A'], vest: 1 },   // 7 a pale grey rash vest over black
];
// A realistic range: fair to deep brown. 0 is the figure's own (#C8A183).
export const SKIN_TONES = ['#C8A183', '#EACAB0', '#A7744F', '#7A4E33', '#4E3122'];
// Wet hair reads dark: dark brown (the figure's own), black, brown, wet sandy blond, grey.
export const HAIR_COLS = ['#3A2A1F', '#121010', '#5E4028', '#8E6E44', '#6B6560'];
const LOOKS_BLOCK = 'SurfLooks', LOOKS_BINDING = 2;
const LOOKS = (() => {
  const nS = SUIT_LOOKS.length * 4, n = nS + SKIN_TONES.length + HAIR_COLS.length + BOARD_PAL.length;
  const d = new Float32Array(n * 4);
  SUIT_LOOKS.forEach((L, i) => L.c.forEach((h, k) => d.set([...hexLin(h), [L.hood, L.shorty, L.vest, 0][k] || 0], (i * 4 + k) * 4)));
  SKIN_TONES.forEach((h, j) => d.set(hexLin(h), (nS + j) * 4));
  HAIR_COLS.forEach((h, j) => d.set(hexLin(h), (nS + SKIN_TONES.length + j) * 4));
  // The value exactly as the const-array literal printed it, so every board is the colour it was.
  BOARD_PAL.forEach((h, j) => d.set(hexLin(h).map((v) => parseFloat(v.toFixed(4))), (nS + SKIN_TONES.length + HAIR_COLS.length + j) * 4));
  return d;
})();
export const LOOKS_DATA = LOOKS;   // for the suite
const LOOKS_GLSL = `
layout(std140) uniform ${LOOKS_BLOCK} {
  vec4 lkSuit[${SUIT_LOOKS.length * 4}];
  vec4 lkSkin[${SKIN_TONES.length}];
  vec4 lkHair[${HAIR_COLS.length}];
  vec4 lkBoard[${BOARD_PAL.length}];
${OLD_BOARD ? '' : `  vec4 lkHull[${4 * HULL_SEG}];
`}};
`;
// A line-up surfer's look, from their index: the suits are dealt round a shuffle of the eight (the
// order hash1's), 3 places a person, so all eight turn up in fourteen and the next person along a bank
// (index + 2, 6 places on) never wears the same one. Skin and hair weighted toward the lighter tones of
// a September line-up at Bournemouth, but all of them there.
const pickW = (u, w) => { let a = 0; for (let k = 0; k < w.length; k++) { a += w[k]; if (u < a) return k; } return w.length - 1; };
let SUIT_DEAL = null;
export function lineupLook(i) {
  const D = SUIT_DEAL || (SUIT_DEAL = SUIT_LOOKS.map((_, k) => k).sort((a, b) => hash1(a * 7919 + 101) - hash1(b * 7919 + 101)));
  return {
    suit: D[(i * 3) % D.length],
    skin: pickW(hash1(i * 6007 + 31), [0.3, 0.3, 0.2, 0.12, 0.08]),
    hair: pickW(hash1(i * 2687 + 59), [0.3, 0.2, 0.2, 0.2, 0.1]),
  };
}
// The look as a far (rigid) figure's instance carries it: in the paint slot's twenties (see _add).
const lookCode = (L) => (L ? (L.suit | 0) + 8 * ((L.skin | 0) * 8 + (L.hair | 0)) : 0);

// THE VERTEX SHADER'S HALF. Per VERTEX, not per pixel: a figure's colours are its vertex colours
// looked up again, so they blend across a triangle exactly as the vertex colours always did, and
// the fragment shader is untouched by any of it.
//   A JOINTED FIGURE (aAnim < 0) carries a material id in aAnim (gl/surfer-figure.js makeData:
//   aAnim = -(id x 2 + roughness), roughness 0..1.9; ids 0 suit 1 chest 2 knee 3 seams 4 skin
//   5 hair 6 leash 7 hood 8 sole). Data from before the ids reads as id 0 everywhere, and a look is
//   only applied where its index is not 0 - and the JS side forces 0 on a mesh with no ids - so it
//   draws exactly as it did. Its look rides in aInst2.zw: the suit look, skin x 8 + hair (+ 64 x the
//   hood: 1 on, 2 off, 0 the look's own). aZone: the rash vest's and the shorty's share of the vertex,
//   from the bones it is skinned to (_zones).
//   A FAR FIGURE (the rigid meshes, 0 <= aAnim < 2.5) has its material in aAnim's fraction (Kit.add,
//   MAT_STEP 0.04: 0 suit 1 chest 4 skin 7 the hood band 9 a forearm or shin), and its look in the
//   paint slot's twenties. It is always painted: the jointed version of the same person is.
const LOOK_VS = LOOK_ON ? `
  float sF = aAnim < 0.0 ? aInst2.z : lkc - 8.0 * floor((lkc + 0.5) / 8.0);
  float shF = aAnim < 0.0 ? aInst2.w : floor((lkc + 0.5) / 8.0);
  float hmF = floor((shF + 0.5) / 64.0);
  shF -= 64.0 * hmF;
  float skF = floor((shF + 0.5) / 8.0);
  int L = clamp(int(sF + 0.5), 0, ${SUIT_LOOKS.length - 1});
  int SK = clamp(int(skF + 0.5), 0, ${SKIN_TONES.length - 1});
  int HR = clamp(int(shF - 8.0 * skF + 0.5), 0, ${HAIR_COLS.length - 1});
  vec4 s0 = lkSuit[L * 4], s1 = lkSuit[L * 4 + 1], s2 = lkSuit[L * 4 + 2], s3 = lkSuit[L * 4 + 3];
  bool hooded = hmF > 0.5 ? hmF < 1.5 : s0.w > 0.5;
  vec3 skinC = lkSkin[SK].rgb;
  vec3 col = aColor;
  vHide = 0.0;
  if (aAnim < 0.0) {
    // Recoloured RELATIVE to the material's default (look 0's slot, which the constructor sets from
    // the mesh itself), so a shade the figure builds in - the eye-line band, 12% darker skin - carries
    // over to every skin tone and suit.
    float m = floor(-aAnim * 0.5);
    bool suitM = m < 3.5 || (m > 6.5 && m < 7.5);
    int k = (m < 0.5 || m > 6.5) ? 0 : int(m + 0.5);   // the suit slot: 0 suit (and hood) 1 chest 2 knee 3 seams
    if (m > 6.5 && m < 7.5 && !hooded) vHide = 1.0;
    if (((m > 3.5 && m < 4.5) || m > 7.5) && SK > 0) col = skinC * aColor / max(lkSkin[0].rgb, vec3(1e-4));
    if (m > 4.5 && m < 5.5 && HR > 0) col = lkHair[HR].rgb * aColor / max(lkHair[0].rgb, vec3(1e-4));
    if (suitM && L > 0) {
      vec3 shd = aColor / max(lkSuit[min(k, 3)].rgb, vec3(1e-4));
      col = lkSuit[L * 4 + min(k, 3)].rgb * shd;
      col = mix(col, s1.rgb * shd, aZone.x * s2.w);   // a rash vest: the torso and the upper arms
      col = mix(col, skinC, aZone.y * s1.w);          // a shorty: bare forearms and shins
    }
  } else if (aAnim < 2.5) {
    float m = floor(fract(aAnim) * 25.0 + 0.5);
    col = m > 8.5 ? mix(s0.rgb, skinC, s1.w)
        : m > 6.5 ? (hooded ? s0.rgb : lkHair[HR].rgb)
        : m > 3.5 ? skinC
        : m > 0.5 ? s1.rgb : s0.rgb;
  }
  vColor = col;
` : `
  vColor = aColor;
  vHide = (aAnim < 0.0 && floor(-aAnim * 0.5) > 6.5 && floor(-aAnim * 0.5) < 7.5) ? 1.0 : 0.0;
`;
// THE WATER each instance is drawn against, as a plane: y = vWat.x + vWat.y x + vWat.z z. The player's
// board and body (design >= 10) use uWater, sampled under the board in prepare(). A line-up instance
// carries its own water height in aInst1.z + 1000 where the arms' phase is not needed, and its slope
// packed into aInst2.x where their stroke is not (_add); otherwise it falls back to its own height.
const WATER_VS = OLDWATER ? '  vWat = vec3(0.0);\n' : `
  if (design > 9.5 && uWater.w > 0.5) vWat = uWater.xyz;
  else {
    float wy = aInst1.z > 500.0 ? aInst1.z - 1000.0 : aInst0.y;
    vec2 sl = vec2(0.0);
    if (aInst2.x > 1.5) { float q = aInst2.x - 2.0, qz = floor((q + 0.5) / 4096.0); sl = vec2(q - 4096.0 * qz, qz) / 800.0 - 2.5; }
    vWat = vec3(wy - sl.x * aInst0.x - sl.y * aInst0.z, sl);
  }
`;
// <<< PEOPLE

const VERT = `#version 300 es
precision highp float;
in vec3 aPos;
in vec3 aNormal;
in vec3 aColor;
in float aAnim;
in vec4 aInst0;   // x, y, z, yaw
in vec4 aInst1;   // pitch, roll, phase (PEOPLE: or 1000 + the water's height), scale
in vec4 aInst2;   // stroke amount (PEOPLE: or 2 + the water's slope, packed); SURFBOARDS: board design (+10 = the player's, capped;
                  // PEOPLE: + 20 x a far figure's look), colour A, colour B (PEOPLE: a jointed figure's suit look, skin x 8 + hair)
// >>> PEOPLE
in vec2 aZone;    // a jointed figure's rash-vest and shorty shares (_zones); not enabled elsewhere
uniform vec4 uWater;   // the water under the player's board: y = x + y wx + z wz (w: 1 = set)
${LOOKS_GLSL}
// <<< PEOPLE
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
out vec3 vPaint;   // aInst2.yzw (PEOPLE: the design with the look taken off)
// <<< SURFBOARDS
// >>> PEOPLE
flat out vec3 vWat;   // the water plane (WATER_VS)
out float vHide;      // 1 on a hood this look does not have
// <<< PEOPLE

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
  // >>> PEOPLE  what the instance carries (_add): the arms' stroke or the water's slope; the paint,
  // with a far figure's look in its twenties. A far figure's material is aAnim's fraction, so the
  // arm tag is its whole part.
  float tag = floor(aAnim);
  float stroke = aInst2.x < 1.5 ? aInst2.x : 0.0;
  float lkc = floor((aInst2.y + 0.5) / 20.0);
  float design = aInst2.y - 20.0 * lkc;
  // <<< PEOPLE
  // aAnim tags the arms. A paddling stroke swings them about the shoulder line;
  // aInst2.x is how much of a stroke this pose wants (1 prone, 0 riding).
  // SURFBOARDS: 1 and 2 only - 3 is a board, which must not swing.
  if (aAnim > 0.5 && aAnim < 2.5) {
    float a = sin(uTime * 3.4 + aInst1.z + tag * 3.14159) * 0.75 * stroke;
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
  // >>> PEOPLE
${LOOK_VS}${WATER_VS}  // <<< PEOPLE
  // SURFER: -1 = use ENVC_SURFR, unchanged. PEOPLE: a figure's material id taken off (id x 2 + roughness).
  vRough = aAnim < 0.0 ? -aAnim - 2.0 * floor(-aAnim * 0.5) : -1.0;
  // SURFBOARDS. ⚠️ boardMesh()'s smoothed normals point INTO the hull (measured: the deck's is y -1),
  // which never mattered while the shader turned every normal to face the viewer. The paint needs the
  // outward one to tell deck from bottom, so the hull's is flipped here (not the fin's, which is fine).
  vLocal = aPos; vNy = (aAnim > 2.5 && aPos.y > -0.045) ? -aNormal.y : aNormal.y; vTag = aAnim; vPaint = vec3(design, aInst2.zw);
${FIN_VS}  gl_Position = uViewProj * vec4(w, 1.0);
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
` + (NOCAST ? '' : `
const float SURF_SLACK_FIG = 0.03;   // PEOPLE: m along the sun's ray - see SURF_SLACK
`) + (NORIM ? '' : `
const vec3 SURF_SUNC = vec3(1.0);    // PEOPLE: the sun as this shader's direct term and lobe have it (white)
`);
// >>> PEOPLE  SELF-SHADOW ACNE, AND WHAT KEEPS IT OFF (27 Sep 2026). The player's body and board now
// cast (drawShadow), so they land in the map over themselves - and the map is 13.7 cm a texel (280 m
// / 2048), as wide as a forearm, read 3x3 (PCF). A tap a texel toward the sun from a curved limb, or
// from a deck tilted 44 degrees off the light, finds the surface 10-25 cm nearer the sun than the
// fragment asking, far past shadow.js's 2.5-12 cm bias: the board went grey in stripes and the body
// mottled all over (?cdbg=surfsh, tmp-audit/stage4-render/sheet-tune.jpg and sheet-rtune.jpg, row 0).
// Tried first: the receiver's slack alone, craft.js's device (subSlack). It took 0.20-0.30 m to clear
// the stripes, and at that the body's shadow on the deck went with them - lying down the chest is
// within 0.3 m of the board all along it. What clears it is the CASTER's offset instead: these two
// draw into the map with a slope-scaled polygon offset (CAST_OFFSET: 2.5 x the depth's slope per
// texel), which moves back exactly the surfaces that are steep to the light, where acne comes from,
// and leaves a surface facing the sun where it is - so the chest still shadows the deck beside it and
// an arm the chest (sheet-tune.jpg row 1: no stripe left, the shadow of the body on the deck kept).
// The slack is kept for figure fragments only, 3 cm, for the silhouette's last grazing texels; 4 cm
// already took real contact shadow round the feet off (row 2, red), so no more. Slack only ever adds
// light, and the line-up does not cast: on them it changes nothing but the pier's shadow within 3 cm.
const SURF_SLACK = NOCAST ? '' : ', vRough >= 0.0 ? SURF_SLACK_FIG : 0.0';
const CAST_OFFSET = [2.5, 8];   // gl.polygonOffset(factor, units) for the surfer's casters only
// THE WET RIM (item 3). Wet neoprene against a grey sky has a rim of reflected sky round the
// silhouette and a thin catch of sun on the curves facing it: without either, a dark suit against the
// big day's grey wall is a hole. Figures only; the GGX lobe is left as it is. The sky term is weaker
// on the rougher fabric (1 - 0.5 RGH), the sun term is shadowed and needs the sun ON the surface
// (ndl), so a figure back-lit by a low sun gets no glowing edge from it.
const SURF_RIM = (NORIM ? '' : `
  if (vRough >= 0.0) col += skyAmb * (0.10 * pow(1.0 - NdV, 4.0) * (1.0 - 0.5 * RGH))
                          + SURF_SUNC * (0.05 * pow(1.0 - NdV, 6.0) * ndl * sh);`)
  // ?cdbg=surfsh - an instrument, like surfmask: every surfer fragment painted with its sun
  // visibility (white lit, black shadowed; red where the slack admitted light the map would not have).
  + (CDBG_SURF.includes('surfsh') ? `
  { float sh0 = sunShadow(vWorld, N, uSunDir); fragColor = vec4(sh, sh0, sh0, 1.0); return; }` : '');
// <<< PEOPLE
const SURF_ENV_LIGHT = ENV_OFF ? `
  float ndl = max(dot(N, uSunDir), 0.0);
  vec3 direct = baseCol * (ndl * 0.85 + 0.15);
  vec3 ambient = baseCol * skyColor(normalize(N + vec3(0.0, 0.35, 0.0)), uSunDir) * 0.55;
  vec3 col = direct * 0.55 + ambient;` : `
  // Soaked: the same TIR return craft.js derives, at full strength.
  vec3 alb = baseCol * (1.0 - ENVC_TIR) / (1.0 - baseCol * ENVC_TIR);
  float NdV = max(dot(N, V), 1e-3);
  float RGH = vRough < 0.0 ? ${OLD_BOARD ? 'ENVC_SURFR' : 'mix(ENVC_SURFR, 0.8, gPad)'} : vRough;   // SURFER: identical to before whenever aAnim >= 0 (BOARDS: a tail pad is matte)
  float fr = ENVC_F0 + (max(1.0 - RGH, ENVC_F0) - ENVC_F0) * pow(1.0 - NdV, 5.0);

  float ndl = max(dot(N, uSunDir), 0.0);
  float sh = sunShadow(vWorld, N, uSunDir${SURF_SLACK});
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
           + vec3(1.0) * lobe * fr * sh;${SURF_RIM}`;
// <<< ENVREF
// >>> PEOPLE  THE WATERLINE (item 2, 27 Sep 2026). What is under the water was keyed to WORLD y 0, so
// the board turned cyan whenever the swell carried it below mean sea level - in every trough - and
// stayed clear when buried in a wave's face above it. Measured on the first-person view: the deck's
// R/G fell 1.00 -> 0.84 as the camera went from y 0.82 to 0.15. Now it is keyed to the real water
// (WATER_VS): d = the water's height here - this fragment's, extinction only where d > 0 (the same
// curve as before, from the surface down), and along the hull a wet band where it meets the water
// (|d| < 3 cm, 15% darker) with a line of foam 1-2 cm wide on it - faded out where a pixel spans
// more than 3 cm of height, so a far board does not shimmer.
const WL_FOAM = 'vec3(0.62, 0.66, 0.65)';   // lin(206, 212, 210): whitewater, a little brighter than FOAM
// ...and ONLY WHERE THE HULL CROSSES THE WATER STEEPLY - the rail, a buried nose. A deck lying awash
// is parallel to the water, so |d| is under 1 cm over ALL of it at once: the first take painted the
// whole deck foam-grey the moment the board settled (deck-new f61, the stripe left floating). `across`
// is how fast d changes along the surface itself (fwidth(d) over the pixel's size in the world, the
// two screen axes summed in both: 0.5 on a vertical rail, 0 on a deck parallel to the sea), and the
// band and the line fade out below 0.4 and are gone by 0.15 - where the line would be 6 cm and more
// wide along the surface, a smear rather than a line.
const WL_BAND = OLDWATER ? '' : `
  float fwW = fwidth(dW);
  float across = fwW / max(length(dFdx(vWorld)) + length(dFdy(vWorld)), 1e-6);
  float wlK = ${ENV_OFF ? '0.45 + 0.55 * ndl' : '0.45 + 0.55 * ndl * sh'};
  if (vTag > 2.5) {
    float rail = smoothstep(0.15, 0.4, across);
    col *= 1.0 - 0.15 * rail * (1.0 - smoothstep(0.022, 0.03 + fwW, abs(dW)));
    float fl = (1.0 - smoothstep(0.004, 0.009 + fwW, abs(dW))) * (1.0 - smoothstep(0.012, 0.03, fwW)) * rail;
    col = mix(col, ${WL_FOAM} * wlK, fl);
  }`;
// <<< PEOPLE
// >>> BOARDS  (27 Sep 2026, PIER SURF stage 5) THE PAINT KNOWS WHICH HULL IT IS ON. boardPaint() laid
// its designs out along the foamie: u from its centre (0.15) and half length (1.12), and an outline
// hw(u) the stripes, sprayed rails and rail tints are measured across - an approximation that was
// already 4 cm off brdWidth() at the tail. Each board now says which hull it is IN ITS INSTANCE: a tenth
// per hull in the design slot (_add: hullF - 0 the foamie, .1 the thruster, .2 the fish, .3 the long),
// which every existing reading of that slot rounds away (int(mod(x, 10) + 0.5), design > 9.5). The
// foamie (0) takes the old lines verbatim, so today's board is painted to the bit; any other hull its
// own centre, length and outline - lkHull in the SurfLooks block (sixteen samples of hullWidth(), and
// the centre, half length and pad flag in the spare slots), never a const array (the b40 trap). The
// same outline is what the first-person cap (capIn) is painted by, so the deck you look down at is
// right on every hull. NOT A UNIFORM: a uniform set per hull draw cost 0.045 ms of the draw's GPU time
// on the RTX 3090 (tmp-audit/stage5-boards/out/pf-*: ANGLE D3D11 re-sends the program's whole default
// uniform block when one changes between draws) - three times what the three extra draws cost.
// The fins of the new hulls: FIN_VS.
const PAINT_OUTLINE = OLD_BOARD ? `  if (lp.y < -0.045) return mix(vec3(0.035), A, 0.3);          // the fin, smoked
  float u = clamp((lp.x - 0.15) / 1.12, -1.0, 1.0);
  float hw = 0.03 + 0.26 * sqrt(max(0.0, 1.0 - u * u * (u > 0.0 ? 1.0 : 0.8)));
` : `  if (lp.y < -0.045) return mix(vec3(0.035), A, 0.3);          // the fin, smoked (BOARDS: every fin - FIN_VS)
  float u, hw, hk = floor(fract(look.x) * 10.0 + 0.5), pfu = 0.0, pgw = 0.0;
  if (hk < 0.5) {   // the foamie: the paint's own outline, as it always was
    u = clamp((lp.x - 0.15) / 1.12, -1.0, 1.0);
    hw = 0.03 + 0.26 * sqrt(max(0.0, 1.0 - u * u * (u > 0.0 ? 1.0 : 0.8)));
  } else {          // BOARDS: this hull's own centre, length and outline (lkHull[16 k]: w0, w1, cx, hl)
    vec4 h0 = lkHull[int(hk) * ${HULL_SEG}];
    u = clamp((lp.x - h0.z) / h0.w, -1.0, 1.0);
    float f = min((u + 1.0) * ${(HULL_SEG / 2).toFixed(1)}, ${(HULL_SEG - 0.01).toFixed(2)}), fi = floor(f);
    vec4 o = lkHull[int(hk) * ${HULL_SEG} + int(fi)];
    hw = max(mix(o.x, o.y, f - fi), 0.02);
    pfu = fwidth(u) * 1.5 + 1e-4; pgw = fwidth(lp.x * 28.0) + 1e-4;   // (the pad's, out of its per-pixel branch)
  }
`;
// THE TAIL PAD, on the hulls that carry one (lkHull[16 k + 1].z: the thruster and the fish - a longboard and a
// soft-top go without, as they do in the water). EVA foam on the deck from u -0.72 back to the tail,
// 1.6 cm in from the rails: near-black, grooved across every 3.6 cm (the grooves fade out before they
// are under 3 px apart, so they never shimmer), an arch bar down the middle, a lighter lip along the
// kick. The kick itself is geometry (hullSection). Painted on the first-person cap too (ny 1 there).
// And lit as foam, not glass: roughness 0.8 where it is pad (gPad), so the kick does not shine.
const PAINT_PAD_FN = OLD_BOARD ? '' : `// BOARDS: the tail pad (see PAINT_PAD in the JS). gPad: how much of this fragment is pad - the lighting
// takes it as matte foam (RGH), not a wet glassed deck.
float gPad = 0.0;
vec3 tailPad(vec3 lp, float u, float hw, vec3 c, float fw, float fu, float gw) {
  float k = (1.0 - smoothstep(-0.72 - fu, -0.72 + fu, u)) * (1.0 - smoothstep(hw - 0.016 - fw, hw - 0.016 + fw, abs(lp.z)));
  if (k <= 0.0) return c;
  float gx = lp.x * 28.0, gf = fract(gx);
  float gr = (1.0 - smoothstep(0.08, 0.08 + gw, min(gf, 1.0 - gf))) * (1.0 - smoothstep(0.25, 0.5, gw));
  float arch = (1.0 - smoothstep(0.024, 0.024 + fw, abs(lp.z))) * smoothstep(-0.95, -0.92, u) * (1.0 - smoothstep(-0.8, -0.77, u));
  float lip = 1.0 - smoothstep(-0.95, -0.9, u);
  vec3 pad = lkBoard[${PAL.charcoal}].rgb * 0.8 * (1.0 - 0.5 * gr * (1.0 - arch)) * (1.0 + 0.6 * arch + 0.3 * lip);
  gPad = k;
  return mix(c, pad, k);
}
`;
const PAINT_PAD = OLD_BOARD ? '' : `  if (hk > 0.5 && lkHull[int(hk) * ${HULL_SEG} + 1].z > 0.5 && deck && u < -0.68) c = tailPad(lp, u, hw, c, fw, pfu, pgw);
`;
// <<< BOARDS

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
// >>> PEOPLE
flat in vec3 vWat;
in float vHide;
${LOOKS_GLSL}
// <<< PEOPLE
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

${PAINT_PAD_FN}// >>> SURFBOARDS  a board's paint, from where on the board this is (model space: x to the nose, y up,
// z across) and the surfer's look (design, colour A, colour B). See BOARD_LOOKS.
// PEOPLE: the palette is lkBoard in the SurfLooks block (was the const array BPAL - see LOOKS).
vec3 boardPaint(vec3 lp, float ny, vec3 look, vec3 base) {
  int design = int(mod(look.x, 10.0) + 0.5);
  if (design > 8) return base;
  vec3 A = lkBoard[int(look.y + 0.5)].rgb, B = lkBoard[int(look.z + 0.5)].rgb, W = lkBoard[0].rgb;
${PAINT_OUTLINE}  float across = clamp(abs(lp.z) / hw, 0.0, 1.0);
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
${PAINT_PAD}  return c;
}
// <<< SURFBOARDS

const vec3 EXTINCT = vec3(0.62, 0.16, 0.30);
const vec3 WATER_IN = vec3(0.012, 0.055, 0.041);

void main() {
  if (vHide > 0.5) discard;   // PEOPLE: a hood this look does not have
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
  // PEOPLE: below the REAL water (vWat), not below world y 0; under ?cdbg=oldwater vWat is 0 and
  // this is the old test to the bit (0 + 0 x - y = -y).
  float dW = vWat.x + vWat.y * vWorld.x + vWat.z * vWorld.z - vWorld.y;${WL_BAND}
  if (dW > 0.0) {
    float dd = min(dW, 3.0) * 2.0;
    vec3 t = exp(-EXTINCT * dd);
    col = col * t + WATER_IN * (1.0 - t);
  }
  fragColor = vec4(pow(acesS(col * uExposure), vec3(1.0 / 2.2)), 1.0);
}
`;

// >>> GPUSKIN  THE JOINTED FIGURES, SKINNED ON THE GPU (27-28 Sep 2026, PIER SURF stage 6).
// The player's figure and the line-up's nearest were skinned on the CPU (gl/surfer-figure.js write():
// ~6k and ~1.7k vertices through 22 bones) and the whole vertex buffer sent every frame - 238 KB for
// the player and 68 KB a line-up figure (tmp-audit/stage6-gpu). Now each lod's vertex buffer goes up
// ONCE, in the bind pose (surfer-figure.js figureGpuMesh), and a frame sends the bones alone: 22 of
// them as a unit quaternion and a translation (SurferFigure.bones(), 704 bytes a figure), in the
// SurfBones uniform block, binding point 3 - the player's in one buffer, the line-up's in another, all
// of theirs drawn in ONE instanced draw (gl_InstanceID picks the figure's 44 vec4s).
// A BLOCK, NOT A CONST ARRAY, and not the default uniform block: a block is a constant buffer on ANGLE's
// Direct3D 11, read natively at any index (a dynamically indexed const array is the b40 scratch-memory
// trap - sea-surf.js SURF_TABLES); and ANGLE re-sends a program's whole default block to the GPU when a
// uniform in it changes between draws (the BOARDS note above), where a block is bound, not copied.
// VERT_SKIN is VERT with the skinning put where it read aPos and aNormal - the rest of it, and the
// fragment shader (FRAG), are the rigid figures' own text, so a skinned figure is lit, painted, looked
// and watered exactly as before. The rigid draws keep the program they had (this.prog, VERT unchanged,
// "uSkin 0"); the figures draw with progSkin. Its twin for the shadow map: DEPTH_SKIN_VERT.
// THE LEASH is laid in the same shader, from twelve numbers bones() sends in the spare slots (surfer-
// figure.js leashParams): its vertices carry where they are on the cord, not where they are.
// ?cdbg=cpuskin draws the figures the old way, on the CPU, with this.prog.
// No backtick inside the GLSL below.
const SKIN_BLOCK = `layout(std140) uniform ${BONES_BLOCK} { vec4 sbB[${SB_NPC * FIG_SB}]; };
in vec4 aSkin;    // GPUSKIN: its two bones, the second's share, and 1 on the leash
// v turned by the unit quaternion q (x y z w)
vec3 sbRot(vec4 q, vec3 v) { return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v); }
`;
const SKIN_FN = `// A figure's bones: sbB[f + 2 b] bone b's rotation, sbB[f + 2 b + 1].xyz its translation, f its first vec4.
void sbSkin(out vec3 p, out vec3 n) {
  int f = gl_InstanceID * ${FIG_SB};
  if (aSkin.w > 0.5) {
    // THE LEASH (surfer-figure.js write()'s cord): ankle a to plug t, sagging, resting on the deck past x0.
    vec3 a = vec3(sbB[f + 1].w, sbB[f + 3].w, sbB[f + 5].w), t = vec3(sbB[f + 7].w, sbB[f + 9].w, sbB[f + 11].w);
    float sag = sbB[f + 13].w, r = sbB[f + 15].w, x0 = sbB[f + 17].w, base = sbB[f + 19].w, rise = sbB[f + 21].w, span = sbB[f + 23].w;
    vec3 e = t - a, c = a + e * aPos.x;
    c.y -= sag * sin(3.14159265 * aPos.x);
    if (c.x > x0 && abs(c.z) < 0.3) c.y = max(base + rise * clamp((c.x - a.x) / span, 0.0, 1.0), c.y);
    float el = length(e);
    vec3 tn = el > 0.0 ? e / el : vec3(0.0);
    vec3 n1 = cross(abs(tn.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0), tn);
    float l1 = length(n1);
    n1 = l1 > 0.0 ? n1 / l1 : vec3(0.0);
    n = n1 * aPos.y + cross(tn, n1) * aPos.z;
    p = c + n * r;
    return;
  }
  int i0 = f + 2 * int(aSkin.x + 0.5), i1 = f + 2 * int(aSkin.y + 0.5);
  vec4 q0 = sbB[i0];
  p = sbRot(q0, aPos) + sbB[i0 + 1].xyz;
  n = sbRot(q0, aNormal);
  if (aSkin.z > 0.0) {
    vec4 q1 = sbB[i1];
    float w = aSkin.z, v = 1.0 - w;
    p = p * v + w * (sbRot(q1, aPos) + sbB[i1 + 1].xyz);
    n = n * v + w * sbRot(q1, aNormal);
  }
  float nl = length(n);
  if (nl > 0.0) n /= nl;
}
`;
// VERT with the skinning in: null (and the figures stay on the CPU) if VERT no longer has the lines.
const VERT_SKIN = (() => {
  const cuts = [
    ['vec3 place(vec3 p) {', SKIN_BLOCK + SKIN_FN + 'vec3 place(vec3 p) {'],
    ['void main() {\n  vec3 p = aPos;\n  vec3 n = aNormal;\n', 'void main() {\n  vec3 p, n;\n  sbSkin(p, n);\n  vec3 sp = p, sn = n;\n'],
    ['vLocal = aPos; vNy = (aAnim > 2.5 && aPos.y > -0.045) ? -aNormal.y : aNormal.y;', 'vLocal = sp; vNy = (aAnim > 2.5 && sp.y > -0.045) ? -sn.y : sn.y;'],
  ];
  let v = VERT;
  for (const [a, b] of cuts) { if (v.split(a).length !== 2) return null; v = v.replace(a, b); }
  return v;
})();
const DEPTH_SKIN_VERT = `#version 300 es
precision highp float;
in vec3 aPos;
uniform mat4 uLightViewProj;
uniform mat4 uModel;
${SKIN_BLOCK}
// The player's rider into the shadow map (drawShadow): VERT_SKIN's body, position only - the caster
// ranges leave the leash out (casterRanges).
void main() {
  int i0 = 2 * int(aSkin.x + 0.5), i1 = 2 * int(aSkin.y + 0.5);
  vec3 p = sbRot(sbB[i0], aPos) + sbB[i0 + 1].xyz;
  if (aSkin.z > 0.0) { float w = aSkin.z, v = 1.0 - w; p = p * v + w * (sbRot(sbB[i1], aPos) + sbB[i1 + 1].xyz); }
  gl_Position = uLightViewProj * uModel * vec4(p, 1.0);
}
`;
// <<< GPUSKIN

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

// >>> PEOPLE  a far figure's materials (the look's slot for each piece), carried in aAnim's fraction
// so the arm and board tags - its whole part, compared at 0.5 / 2.5 - mean what they always did.
const MAT_STEP = 0.04;
const M_SUIT = 0, M_CHEST = 1, M_SKIN = 4, M_HOOD = 7, M_BARE = 9;   // 9: a forearm or a shin
// <<< PEOPLE
class Kit {
  constructor() { this.pos = []; this.nrm = []; this.col = []; this.anim = []; this.idx = []; }
  add(color, fn, anim = 0, mat = 0) {   // PEOPLE: mat
    const b = new MeshBuilder();
    fn(b);
    const base = this.pos.length / 3;
    for (let i = 0; i < b.v.length; i += 3) {
      this.pos.push(b.v[i], b.v[i + 1], b.v[i + 2]);
      this.nrm.push(b.n[i], b.n[i + 1], b.n[i + 2]);
      this.col.push(color[0], color[1], color[2]);
      this.anim.push(anim + mat * MAT_STEP);
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

// >>> BOARDS  (27 Sep 2026, PIER SURF stage 5) FOUR REAL BOARDS. One hull was every board in the water
// - the player's and all fourteen in the line-up - a 7'4" soft-top with its one fin 43 cm up from the
// tail; design 4, the "longboard" paint, was painted on it too. Now a hull is a SPEC and the builder
// below takes it: the FOAMIE is today's board, number for number and in the same arithmetic order (the
// suite compares the vertex buffers to the bit), and three more are built from published proportions
// the same way the foamie's were - DERIVED, NOT OBSERVED:
//   THRUSTER  6'1" x 19 1/4" (1.85 x 0.49 m), 5.8 cm thick: a pointed nose, a squash tail, hard rails in
//             the tail third, three fins - the rear 9 cm up from the tail, the sides 30 cm up and 3 cm in
//             from the rail, toed in and canted out 6 degrees - and a tail pad with a kick
//   FISH      5'7" x 20 7/8" (1.70 x 0.53 m), 6.4 cm: a full nose, a wide swallow tail (an 11 cm V notch),
//             twin keels near the rails, a pad
//   LONG      9' x 22 1/2" (2.75 x 0.57 m), 7.5 cm: a round nose, soft rails, one 0.22 m fin 20 cm up
// Each is DRAWN higher or lower (yOff) so its deck under the rider's feet is where the foamie's is: the
// figure (gl/surfer-figure.js) stands at DECK whatever it rides, and the physics never sees a hull.
//
// A SPEC. u -1 the tail, +1 the nose; x = cx + u hl on the board's own frame (x to the nose, y up).
//   cx hl hw ht        centre, half length, half width (m); ht the deck's rise over the centre plane - the
//                      bottom is 0.62 of it below, so the board is 1.62 ht thick (the foamie 8.5 cm)
//   uW                 the station of maximum width, in u
//   noseW nA nB        the outline toward the nose: noseW + (hw - noseW) (1 - s^nA)^nB, s 0 at uW, 1 at the tip
//   tailW tA tB        ...and toward the tail
//   noseRk nP tailRk tP  the rocker: noseRk n^nP + tailRk t^tP (n, t: 0 at u = +/-0.05, 1 at the ends)
//   U                  the stations (the first and last close the hull)
//   yOff               drawn this much higher (solved below, not typed)
//   hard               the bottom half of the rail hardens through the tail third (exponent 0.72 -> 0.35)
//   kick               the pad's kick, m at the stringer, rising over u -0.86 .. -0.95 (geometry)
//   swallow            { nd, uA }: the tail's centre pulled forward nd (in u) - a V notch - fading by uA
//   fins               [{ x: m up from the tail (the root's middle), z: m in from the rail where the root's
//                        trailing edge is (0 on the stringer: one fin),
//                        chord, depth, tip, sweep (the tip's trailing edge behind the root's), thick,
//                        toe, cant (rad) }], a fin in from a rail drawn on both
//   pad                1: a tail pad (paint, PAINT_PAD); tailX: the leash plug's x
const DEG = Math.PI / 180;
const FOAMIE = { id: 'foamie', k: 0, type: 'loose', cx: BRD_CX, hl: BRD_HL, hw: BRD_HW, ht: BRD_HT, uW: BRD_UW,
  noseW: BRD_NOSE_W, nA: 2.4, nB: 0.70, tailW: BRD_TAIL_W, tA: 2.8, tB: 0.75,
  noseRk: BRD_NOSE_RK, nP: 2.4, tailRk: BRD_TAIL_RK, tP: 2.1, U: BRD_U, yOff: 0, pad: 0, tailX: -0.86 };
export const HULLS = {
  foamie: FOAMIE,
  thruster: { id: 'thruster', k: 1, type: 'looseThruster', cx: 0.30, hl: 0.925, hw: 0.245, ht: 0.0358, uW: 0,
    noseW: 0.02, nA: 1.6, nB: 0.9, tailW: 0.09, tA: 2.0, tB: 0.75, noseRk: 0.10, nP: 2.0, tailRk: 0.045, tP: 1.8,
    U: [-1, -0.985, -0.96, -0.925, -0.885, -0.84, -0.78, -0.72, -0.62, -0.48, -0.32, -0.16, 0, 0.14, 0.28, 0.42,
      0.56, 0.69, 0.80, 0.89, 0.95, 0.985, 1],
    hard: 1, kick: 0.018, pad: 1,
    fins: [{ x: 0.09, z: 0, chord: 0.100, depth: 0.108, tip: 0.022, sweep: 0.033, thick: 0.0085, toe: 0, cant: 0 },
      { x: 0.30, z: 0.03, chord: 0.108, depth: 0.113, tip: 0.022, sweep: 0.035, thick: 0.0085, toe: 6 * DEG, cant: 6 * DEG }] },
  fish: { id: 'fish', k: 2, type: 'looseFish', cx: 0.22, hl: 0.85, hw: 0.265, ht: 0.0395, uW: 0.06,
    noseW: 0.035, nA: 1.9, nB: 0.8, tailW: 0.12, tA: 2.6, tB: 0.7, noseRk: 0.085, nP: 2.3, tailRk: 0.03, tP: 2.2,
    U: [-1, -0.975, -0.945, -0.91, -0.87, -0.83, -0.78, -0.72, -0.62, -0.48, -0.32, -0.16, 0, 0.14, 0.28, 0.42,
      0.56, 0.69, 0.80, 0.89, 0.95, 0.985, 1],
    hard: 1, kick: 0.015, pad: 1, swallow: { nd: 0.13, uA: -0.80 },
    fins: [{ x: 0.20, z: 0.035, chord: 0.17, depth: 0.095, tip: 0.03, sweep: 0.04, thick: 0.011, toe: 2 * DEG, cant: 4 * DEG }] },
  long: { id: 'long', k: 3, type: 'looseLong', cx: 0.05, hl: 1.375, hw: 0.285, ht: 0.0463, uW: -0.05,
    noseW: 0, nA: 3.5, nB: 0.5, tailW: 0.10, tA: 2.6, tB: 0.6, noseRk: 0.10, nP: 3.0, tailRk: 0.045, tP: 2.4,
    U: [-1, -0.975, -0.93, -0.86, -0.76, -0.64, -0.5, -0.34, -0.18, -0.02, 0.12, 0.26, 0.40, 0.53, 0.645, 0.745,
      0.83, 0.895, 0.94, 0.97, 0.99, 1],
    pad: 0,
    fins: [{ x: 0.20, z: 0, chord: 0.165, depth: 0.22, tip: 0.035, sweep: 0.07, thick: 0.012, toe: 0, cant: 0 }] },
};
export const HULL_IDS = Object.keys(HULLS);
const ss01 = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };   // (smooth01 is declared further down)
const kickAt = (u) => ss01((-0.86 - u) / 0.09);

// The foamie's own three functions, taking a spec. With FOAMIE they are the old lines to the bit.
function brdWidth(u, H = FOAMIE) {
  if (u >= H.uW) {
    const s = (u - H.uW) / (1 - H.uW);
    return H.noseW + (H.hw - H.noseW) * Math.pow(Math.max(0, 1 - Math.pow(s, H.nA)), H.nB);
  }
  const s = (H.uW - u) / (1 + H.uW);
  return H.tailW + (H.hw - H.tailW) * Math.pow(Math.max(0, 1 - Math.pow(s, H.tA)), H.tB);
}

function brdRocker(u, H = FOAMIE) {
  const n = Math.max(0, (u - 0.05) / 0.95), t = Math.max(0, (-0.05 - u) / 0.95);
  return H.noseRk * Math.pow(n, H.nP) + H.tailRk * Math.pow(t, H.tP);
}

// One station's section. A soft-top is a domed deck over a nearly flat bottom
// with a full, soft rail, so: a superellipse in z (exponent under 1 fills the
// outline out toward the rail) and an asymmetric one in y (the bottom at 0.62
// of the deck's rise). BOARDS: a performance board's bottom rail hardens toward
// the tail (H.hard), and a pad's kick rises off the deck (H.kick).
function brdSection(u, out, H = FOAMIE) {
  const w = brdWidth(u, H);
  const yr = brdRocker(u, H);
  const th = H.ht * Math.pow(w / H.hw, 0.45);
  const hard = H.hard ? ss01((-0.4 - u) / 0.35) : 0, kick = H.kick ? H.kick * kickAt(u) : 0;
  for (let j = 0; j < BRD_RING; j++) {
    const a = (j / BRD_RING) * Math.PI * 2;
    const c = Math.cos(a), s = Math.sin(a);
    out[j * 2] = w * Math.sign(c) * Math.pow(Math.abs(c), hard > 0 && s < 0 ? 0.72 - 0.37 * hard : 0.72);
    out[j * 2 + 1] = yr + th * Math.sign(s) * Math.pow(Math.abs(s), 0.85) * (s >= 0 ? 1 : 0.62) + (kick > 0 && s > 0 ? kick * s * s : 0);
  }
  return out;
}

const _sec = new Float64Array(BRD_RING * 2);
function boardMesh(b, y, H = FOAMIE) {
  const base = b.vertexCount;
  const U = H.U, NS = U.length, SW = H.swallow;
  for (let i = 0; i < NS; i++) {
    const u = U[i];
    const x = H.cx + u * H.hl;
    // The end stations collapse to the centreline so the hull closes. (BOARDS: a swallow's tail
    // closes to a line across instead - its two points - and its centre is pulled forward: the notch.)
    const deg = (i === 0 || i === NS - 1), flat = deg && i === 0 && !!SW;
    brdSection(u, _sec, H);
    const wu = SW && u < SW.uA ? brdWidth(u, H) : 0;
    for (let j = 0; j < BRD_RING; j++) {
      // (a swallow's closing line: each bottom vertex on its top twin, so the tail closes)
      const zz = deg && !flat ? 0 : _sec[(flat && j > BRD_RING / 2 ? BRD_RING - j : j) * 2];
      const yy = deg ? brdRocker(u, H) : _sec[j * 2 + 1];
      const xx = wu > 0 ? H.cx + H.hl * (u + (1 - Math.min(1, Math.abs(zz) / wu)) * SW.nd * (SW.uA - u) / (SW.uA + 1)) : x;
      b.push(xx, y + H.yOff + yy + (H.tilt ? H.tilt * (xx - STANCE_MID) : 0), zz, 0, 1, 0);       // normals from smoothNormals() below
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
  if (H !== FOAMIE) return;   // BOARDS: the other hulls' fins are hullFins(), tagged apart
  // The fin. One centre fin under the tail. TWO thin lenses rather than one
  // ellipsoid, because one ellipsoid at these proportions renders as a ball
  // stuck under the board (judge/z_fin.png): the second lens is smaller, lower
  // and set back, which gives the blade a taper and a rake. 0.165 m deep below
  // the hull, 26 mm thick at the root.
  b.ellipsoid(BRD_CX - 0.69, y - 0.035, 0, 0.085, 0.075, 0.014, 10, 6);
  b.ellipsoid(BRD_CX - 0.75, y - 0.105, 0, 0.050, 0.070, 0.011, 10, 6);
}

// THE FINS of the other hulls: a lofted blade each - five stations down the span, a lens of eight
// round each, thicker toward the leading edge - raked back (the leading edge sweeps chord - tip + sweep,
// convex; the trailing edge sweep, concave), tapering to a closed tip. The root is set 12 mm up
// inside the hull, so no seam shows. Toe turns a side fin's leading edge in toward the stringer, cant
// leans its tip out toward the rail. Built wound outward (their normals need no flip; tag 4).
const FIN_T = [0, 0.3, 0.58, 0.82, 1], FIN_R = 8, FIN_EMBED = 0.012;
function hullBottomAt(H, x, z) {   // the drawn hull's bottom at (x, z), from its section
  const u = (x - H.cx) / H.hl, w = brdWidth(u, H), th = H.ht * Math.pow(w / H.hw, 0.45);
  const hard = H.hard ? ss01((-0.4 - u) / 0.35) : 0, e = 0.72 - 0.37 * hard;
  const c = Math.pow(Math.min(1, Math.abs(z) / w), 1 / e), s = Math.sqrt(Math.max(0, 1 - c * c));
  return H.yOff + (H.tilt ? H.tilt * (x - STANCE_MID) : 0) + brdRocker(u, H) - 0.62 * th * Math.pow(s, 0.85);
}
function finMesh(b, x0, y0, z0, f, side) {
  const base = b.vertexCount, N = FIN_T.length, span = f.depth + FIN_EMBED;
  const cc = Math.cos(f.cant), sc = Math.sin(-side * f.cant), ct = Math.cos(f.toe), st = Math.sin(side * f.toe);
  for (let i = 0; i < N; i++) {
    const t = FIN_T[i], last = i === N - 1;
    const le = f.chord / 2 - (f.chord - f.tip + f.sweep) * Math.pow(t, 1.35), te = -f.chord / 2 - f.sweep * t * t;
    const xm = (le + te) / 2, hc = (le - te) / 2, hz = (f.thick / 2) * (1 - 0.6 * t), ly = -span * t;
    for (let k = 0; k < FIN_R; k++) {
      const a = (k / FIN_R) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      const lx = last ? xm : xm + hc * c, lz = last ? 0 : hz * s * (0.72 + 0.28 * c);
      const y1 = ly * cc - lz * sc, z1 = ly * sc + lz * cc;        // cant, about x
      const x2 = lx * ct + z1 * st, z2 = -lx * st + z1 * ct;       // toe, about y
      b.push(x0 + x2, y0 + y1, z0 + z2, 0, -1, 0);
    }
  }
  for (let i = 0; i < N - 1; i++) {
    for (let k = 0; k < FIN_R; k++) {
      const a = base + i * FIN_R + k, a2 = base + i * FIN_R + (k + 1) % FIN_R;
      b.quad(a, a2, a2 + FIN_R, a + FIN_R);
    }
  }
  b.smoothNormals(base);
}
function hullFins(b, y, H) {
  const x0 = H.cx - H.hl;   // the tail (a swallow's points)
  for (const f of H.fins || []) {
    const x = x0 + f.x;
    // (in from the rail where the root ENDS: the outline narrows toward the tail, and a fin set in from
    // it at its middle poked out past the rail behind - the fish's keels by 3 cm, seen from above)
    const ue = (x - f.chord / 2 - H.cx) / H.hl;
    for (const side of f.z > 0 ? [1, -1] : [1]) {
      const z = f.z > 0 ? side * (brdWidth(ue, H) - f.z) : 0;
      finMesh(b, x, y + hullBottomAt(H, x, z) + FIN_EMBED, z, f, side);
    }
  }
}
// The deck's top on the stringer at x, as built (station interpolation aside): the rocker, the half
// thickness, the kick.
function deckTopAt(H, x) {
  const u = (x - H.cx) / H.hl, w = brdWidth(u, H);
  return H.yOff + (H.tilt ? H.tilt * (x - STANCE_MID) : 0) + brdRocker(u, H) + H.ht * Math.pow(w / H.hw, 0.45) + (H.kick ? H.kick * kickAt(u) : 0);
}
// THE DECK UNDER THE FEET. The riding stance's feet are at x 0.22 and -0.42 (gl/surfer-figure.js
// stance(): the ankles; a goofy footer's are the same x), and the figure stands them at DECK whatever
// it rides. So each hull is DRAWN to meet them: raised by yOff and tipped by tilt (a shear, y += tilt
// (x - STANCE_MID); under 2 degrees) until its deck under both feet is where the foamie's is. Solved
// here, not typed. Without the tilt a shortboard's tail rocker - 2.8 cm between the feet where the
// foamie has 0.7 - sank the back foot 1.6 cm into the thruster's pad and floated the front one
// (test-surf-boards.mjs measures the skinned soles on the built deck). The physics never sees any of it.
export const STANCE_X = [0.22, -0.42];
const STANCE_MID = (STANCE_X[0] + STANCE_X[1]) / 2;
for (const id of HULL_IDS) {
  const H = HULLS[id];
  if (H === FOAMIE) continue;
  H.yOff = 0; H.tilt = 0;
  const e = STANCE_X.map((x) => deckTopAt(FOAMIE, x) - deckTopAt(H, x));
  H.tilt = (e[0] - e[1]) / (STANCE_X[0] - STANCE_X[1]);
  H.yOff = (e[0] + e[1]) / 2;
  // The leash plug: on the stringer, in from the tail by the foamie's share of its length (11 cm of
  // 2.24 m: -0.86 of a tail at -0.97) - on a swallow 4 cm ahead of the notch, which is where the deck is.
  H.tailX = plugX(H);
}
function plugX(H) {
  return H.swallow ? H.cx + H.hl * (-1 + H.swallow.nd) + 0.04 : H.cx + H.hl * ((-0.86 - BRD_CX) / BRD_HL); }
// The outline the paint reads (lkHull): each hull's half-width at u = -1 + 2 i / HULL_SEG and the next,
// and in the spare slots of its first two its centre and half length (z, w of 0) and pad flag (z of 1).
export const HULL_TABLE = (() => {
  const d = new Float32Array(4 * HULL_SEG * 4);
  for (const id of HULL_IDS) {
    const H = HULLS[id];
    for (let i = 0; i < HULL_SEG; i++) {
      const o = (H.k * HULL_SEG + i) * 4;
      d[o] = brdWidth(-1 + (2 * i) / HULL_SEG, H); d[o + 1] = brdWidth(-1 + (2 * (i + 1)) / HULL_SEG, H);
    }
    d[H.k * HULL_SEG * 4 + 2] = H.cx; d[H.k * HULL_SEG * 4 + 3] = H.hl; d[(H.k * HULL_SEG + 1) * 4 + 2] = H.pad;
  }
  return d;
})();
// A vertical ray through the hull as built (no fins): its deck (top) and bottom at (x, z), or null.
const _hullB = new Map();
export function hullRay(H, x, z) {
  let b = _hullB.get(H);
  if (!b) { b = new MeshBuilder(); boardMesh(b, 0, H); _hullB.set(H, b); }
  let top = -Infinity, bot = Infinity;
  const V = b.v, I = b.i;
  for (let t = 0; t < I.length; t += 3) {
    const a = I[t] * 3, c = I[t + 1] * 3, d = I[t + 2] * 3;
    const x0 = V[a], z0 = V[a + 2], x1 = V[c], z1 = V[c + 2], x2 = V[d], z2 = V[d + 2];
    const den = (z1 - z2) * (x0 - x2) + (x2 - x1) * (z0 - z2);
    if (Math.abs(den) < 1e-12) continue;
    const l0 = ((z1 - z2) * (x - x2) + (x2 - x1) * (z - z2)) / den, l1 = ((z2 - z0) * (x - x2) + (x0 - x2) * (z - z2)) / den, l2 = 1 - l0 - l1;
    if (l0 < -1e-9 || l1 < -1e-9 || l2 < -1e-9) continue;
    const y = l0 * V[a + 1] + l1 * V[c + 1] + l2 * V[d + 1];
    top = Math.max(top, y); bot = Math.min(bot, y);
  }
  return top > -Infinity ? { top, bot } : null;
}
// THE LEASH PLUG, for gl/surfer-figure.js (a figure's tailAt): on the stringer at tailX, 1 cm proud of
// the deck AS BUILT (the ray above: the kick is in it). The foamie's is the figure's own TAIL,
// [-0.86, DECK + 0.01, 0], so it is left null and the figure draws exactly as it did.
for (const id of HULL_IDS) { const H = HULLS[id]; H.tail = H === FOAMIE ? null : [H.tailX, hullRay(H, H.tailX, 0).top + 0.01, 0]; }
// <<< BOARDS

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

// PEOPLE: `part` 0 the upper arm, 1 the forearm, 2 the hand (each takes its own material); the same
// three shapes as before.
function proneArm(b, s, part) {
  if (part === 0) b.tube(0.20, 0.155, 0.150 * s, 0.40, 0.085, 0.265 * s, 0.056, 0.046, 7);   // upper arm
  if (part === 1) b.tube(0.40, 0.085, 0.265 * s, 0.52, -0.175, 0.300 * s, 0.045, 0.036, 7);  // forearm, into the water
  if (part === 2) b.ellipsoid(0.538, -0.210, 0.302 * s, 0.056, 0.042, 0.040, 9, 6);          // hand
}

// PEOPLE: the same shapes, split by what the look paints them: the chest (a rash vest reads there,
// far off), the rest of the suit, the shins and forearms (bare in a shorty), the hands and feet
// (skin, as the jointed figure's are), the hood band (a hood, or hair). Colours as they were.
// BOARDS: withBoard false - the body alone; its board is drawn as a loose board of its own hull.
function buildProneNew(withBoard = true) {
  const k = new Kit();
  if (withBoard) k.add(PAINT.board, (b) => boardMesh(b, 0), 3);   // SURFBOARDS: 3 = painted
  k.add(PAINT.suit, (b) => b.ellipsoid(-0.05, 0.145, 0, 0.42, 0.105, 0.165, 12, 7), 0, M_CHEST);   // chest and back
  k.add(PAINT.suit, (b) => {
    b.ellipsoid(-0.40, 0.130, 0, 0.16, 0.095, 0.170, 10, 6);                 // hips: the missing bridge
    for (const s of [-1, 1]) b.tube(-0.44, 0.128, 0.085 * s, -0.72, 0.112, 0.112 * s, 0.082, 0.060, 7);  // thigh
    b.tube(0.325, 0.150, 0, 0.400, 0.188, 0, 0.060, 0.052, 7);               // neck
  }, 0, M_SUIT);
  k.add(PAINT.suit, (b) => { for (const s of [-1, 1]) b.tube(-0.72, 0.112, 0.112 * s, -0.99, 0.096, 0.126 * s, 0.058, 0.040, 7); }, 0, M_BARE);   // shins
  k.add(PAINT.suit, (b) => { for (const s of [-1, 1]) b.ellipsoid(-1.055, 0.090, 0.130 * s, 0.075, 0.032, 0.048, 8, 5); }, 0, M_SKIN);   // feet
  k.add(PAINT.suitAlt, (b) => ellipsoidBand(b, 0.440, 0.215, 0, 0.105, 0.098, 0.098, HD_SEG, HD_RINGS, 0, HD_HOOD), 0, M_HOOD);
  k.add(PAINT.skin, (b) => ellipsoidBand(b, 0.440, 0.215, 0, 0.105, 0.098, 0.098, HD_SEG, HD_RINGS, HD_HOOD, HD_RINGS), 0, M_SKIN);
  for (const [s, tag] of [[1, 1], [-1, 2]]) {
    k.add(PAINT.suit, (b) => proneArm(b, s, 0), tag, M_SUIT);
    k.add(PAINT.suit, (b) => proneArm(b, s, 1), tag, M_BARE);
    k.add(PAINT.suit, (b) => proneArm(b, s, 2), tag, M_SKIN);
  }
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
function buildRiderNew(withBoard = true) {   // BOARDS: withBoard, as buildProneNew
  const k = new Kit();
  if (withBoard) k.add(PAINT.boardAlt, (b) => boardMesh(b, 0), 3);   // SURFBOARDS
  // PEOPLE: split by material as buildProneNew is; the shapes are the ones that were here.
  const leg = (s) => {
    const fx = s > 0 ? 0.34 : -0.32;      // front foot toward the nose
    const hx = s > 0 ? 0.075 : -0.035;
    const kx = s > 0 ? 0.255 : -0.215;
    return { fx, hx, kx };
  };
  k.add(PAINT.suit, (b) => {
    for (const s of [-1, 1]) { const { hx, kx } = leg(s); b.tube(hx, 0.440, 0.085 * s, kx, 0.245, 0.105 * s, 0.088, 0.070, 7); }   // thigh
    b.ellipsoid(0.02, 0.475, 0.01, 0.145, 0.108, 0.150, 12, 7);              // pelvis
    b.tube(0.050, 0.895, 0.008, 0.055, 0.958, 0.004, 0.058, 0.050, 7);       // neck
  }, 0, M_SUIT);
  k.add(PAINT.suit, (b) => { for (const s of [-1, 1]) { const { fx, kx } = leg(s); b.tube(kx, 0.245, 0.105 * s, fx, 0.080, 0.075 * s, 0.068, 0.046, 7); } }, 0, M_BARE);   // shin
  k.add(PAINT.suit, (b) => { for (const s of [-1, 1]) { const { fx } = leg(s); b.ellipsoid(fx + (s > 0 ? 0.025 : -0.025), 0.058, 0.072 * s, 0.098, 0.033, 0.054, 8, 5); } }, 0, M_SKIN);   // feet
  k.add(PAINT.suit, (b) => {
    b.ellipsoid(0.04, 0.700, 0.01, 0.170, 0.228, 0.150, 12, 8);              // torso
    // A shoulder yoke. Without it the torso is one egg and the arms come out
    // of the ribs; shoulders are wider than a chest and that is most of what
    // makes a standing figure read as a person at 40 m.
    b.ellipsoid(0.045, 0.838, 0.008, 0.150, 0.080, 0.172, 14, 7);
  }, 0, M_CHEST);
  k.add(PAINT.suitAlt, (b) => ellipsoidBand(b, 0.055, 1.010, 0.004, 0.102, 0.108, 0.096, HD_SEG, HD_RINGS, 0, HD_HOOD), 0, M_HOOD);
  k.add(PAINT.skin, (b) => ellipsoidBand(b, 0.055, 1.010, 0.004, 0.102, 0.108, 0.096, HD_SEG, HD_RINGS, HD_HOOD, HD_RINGS), 0, M_SKIN);
  k.add(PAINT.suitAlt, (b) => {
    b.tube(0.050, 0.852, 0.125, 0.240, 0.880, 0.300, 0.052, 0.044, 7);       // lead arm
    b.tube(0.020, 0.852, -0.125, -0.160, 0.812, -0.300, 0.052, 0.044, 7);    // trailing arm
  }, 0, M_SUIT);
  k.add(PAINT.suitAlt, (b) => {
    b.tube(0.240, 0.880, 0.300, 0.420, 0.835, 0.445, 0.043, 0.034, 7);       // forearms
    b.tube(-0.160, 0.812, -0.300, -0.330, 0.738, -0.442, 0.043, 0.034, 7);
  }, 0, M_BARE);
  k.add(PAINT.suitAlt, (b) => {
    b.ellipsoid(0.455, 0.818, 0.478, 0.050, 0.032, 0.040, 8, 5);             // hands
    b.ellipsoid(-0.363, 0.715, -0.475, 0.050, 0.032, 0.040, 8, 5);
  }, 0, M_SKIN);
  return OLDPICK ? k : riderToCrown(k);
}

// >>> PEOPLE  THE FAR RIDER STANDS AS TALL AS THE NEAR ONE (item 5, 27 Sep 2026). This figure was held
// at 1.12 m deck to crown (the old one's height, above); the jointed rider the nearest three become
// stands 1.29 m in a carve and 1.47-1.49 trimming (measured: tmp-audit/stage4-render/measure-fig.mjs,
// lod 1 and 2 alike). So a rider coming within 55 m grew 15-30% in a frame. Scaled here, once, about
// the feet (x and z too, so it is a bigger person, not a stretched one) to the carve's 1.28 m.
const RIDER_CROWN = 1.28, RIDER_FEET = 0.0525;   // BRD_HT: the deck
function riderToCrown(k) {
  let top = -9;
  for (let v = 0; v < k.anim.length; v++) if (k.anim[v] < 2.5) top = Math.max(top, k.pos[v * 3 + 1]);
  const s = (RIDER_CROWN - RIDER_FEET) / (top - RIDER_FEET);
  for (let v = 0; v < k.anim.length; v++) {
    if (k.anim[v] >= 2.5) continue;             // not the board
    k.pos[v * 3] *= s; k.pos[v * 3 + 1] = RIDER_FEET + (k.pos[v * 3 + 1] - RIDER_FEET) * s; k.pos[v * 3 + 2] *= s;
  }
  return k;
}
// The rigid kits, for the suite (no GL).
// BOARDS: as the game builds them - the bodies alone, and a loose board per hull (under ?cdbg=oldboard,
// today's three: the bodies on their boards and one loose board).
export function lineupKits() {
  if (OLD_BOARD) return { prone: buildProneNew(), rider: buildRiderNew(), loose: buildLooseBoardNew() };
  const K = { prone: buildProneNew(false), rider: buildRiderNew(false) };
  for (const id of HULL_IDS) K[HULLS[id].type] = buildLooseBoardNew(HULLS[id]);
  return K;
}
// <<< PEOPLE

function buildLooseBoardNew(H = FOAMIE) {
  const k = new Kit();
  if (H === FOAMIE) k.add(PAINT.board, (b) => boardMesh(b, 0), 3);   // SURFBOARDS
  else {
    // BOARDS: another hull, and its fins - tagged 4, so FIN_VS hands the fragment shader a height under
    // the fin test: smoked by the paint and never capped, whatever their own height (their normals are
    // built outward; the hull's are turned out by height, VERT vNy and FRAG Nout).
    k.add(PAINT.board, (b) => boardMesh(b, 0, H), 3);
    k.add(PAINT.rail, (b) => hullFins(b, 0, H), 4);
  }
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
  for (let d = SURF.D_FADE1 + fadeShift(ctl) - 1; d > 6; d -= 4) {   // SURFBOARDS: + the big day's reach
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
export const NPC_FIGS = 6;       // the nearest this many are drawn as jointed people... (GPUSKIN, stage 6: was 3)
export const NPC_FIGS_LITE = 3;  // ...this many on the lite look (GPUSKIN: phones keep the count they had)
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

// >>> BOARDS  THE LINE-UP'S BOARDS: a beach-break mix, from hash1 of the person's index - the same
// line-up every session. Whoever's paint is the longboard design (4: a tinted deck, a wood stringer)
// rides a longboard; the rest are dealt soft-tops, thrusters, fish and the odd log, 28 / 42 / 20 / 10
// in the long run - for these fourteen, 5 / 4 / 3 and 2 logs, all four on the +o bank, three on the other.
export function lineupHull(i) {
  if (BOARD_LOOKS[i % BOARD_LOOKS.length][0] === 4) return 'long';
  const r = hash1(i * 1597 + 51);
  return r < 0.28 ? 'foamie' : r < 0.70 ? 'thruster' : r < 0.90 ? 'fish' : 'long';
}
// <<< BOARDS
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
      hull: lineupHull(i),                          // BOARDS: which of the four
      look: lineupLook(i),                          // PEOPLE: suit look, skin, hair
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

// >>> PEOPLE  helpers (27 Sep 2026)
// Does this figure mesh carry material ids (gl/surfer-figure.js makeData: aAnim = -(id x 2 + rough),
// rough under 2)? Any vertex at -2 or below is an id of 1 or more.
function hasMatIds(F) {
  const r = F && F.rough;
  if (!r) return false;
  for (let k = 0; k < r.length; k++) if (r[k] <= -2) return true;
  return false;
}
// The colour each material id is built in (the commonest vertex colour among its vertices - the
// eye-line band is a minority shade of skin), or null on a mesh with no ids. id -> [r, g, b].
export function figDefaults(F) {
  if (!hasMatIds(F)) return null;
  const d = F.makeData(), seen = [];
  for (let k = 0; k < F.count; k++) {
    const q = k * 10, id = Math.floor(-d[q + 9] / 2), r = d[q + 6], g = d[q + 7], b = d[q + 8];
    const L = seen[id] || (seen[id] = []);
    const e = L.find((c) => c[0] === r && c[1] === g && c[2] === b);
    if (e) e[3]++; else L.push([r, g, b, 1]);
  }
  const out = {};
  seen.forEach((L, id) => { if (L) { L.sort((a, b) => b[3] - a[3]); out[id] = L[0].slice(0, 3); } });
  return out;
}
// The figure's index buffer as the shadow caster draws it: [[first index, count], ...]. Left out:
// the hands, the feet and the leash - under a shadow map of 13.7 cm texels a finger, a toe or a 5 mm
// cord is a fraction of one, and they were 1,712 of the 11,188 triangles (lod 1, 27 Sep) - and, for a
// look without one, the hood (material id 7), which that look never draws (vHide). A triangle goes
// if any corner is hood, or all three are hand, foot or leash. null on a mesh without skin weights.
export function casterRanges(F, withHood) {
  const r = F && F.rough, idx = F && F.idx, S = F && F.skin;
  if (!r || !idx || !S || !S.b0 || !FB || FB.HAND_L === undefined) return null;
  const small = new Set([FB.HAND_L, FB.HAND_R, FB.FOOT_L, FB.FOOT_R]);
  for (let b = 16; b < 22; b++) small.add(b);   // the fingers' and thumbs' bones (surfer-figure.js: 16-21)
  const hood = (v) => r[v] < 0 && Math.floor(-r[v] / 2) === 7;
  const tiny = (v) => v >= F.bodyVerts || small.has(S.b0[v]);
  const out = []; let from = 0;
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t], b = idx[t + 1], c = idx[t + 2];
    if ((!withHood && (hood(a) || hood(b) || hood(c))) || (tiny(a) && tiny(b) && tiny(c))) { if (t > from) out.push([from, t - from]); from = t + 3; }
  }
  if (idx.length > from) out.push([from, idx.length - from]);
  return out;
}
// A figure's zones, per vertex, from the bones it is skinned to: x the rash vest's share (the chest
// and the upper arms: from the waist - the pelvis-to-chest blend - to the elbows), y the shorty's (the
// forearms and shins: through the elbow and the knee on). Static - skinning does not change a
// vertex's bones. A mesh without skin weights, and the leash, get 0 (no vest, no bare limb).
export function figZones(F) {
  const n = F.count, z = new Float32Array(n * 2), S = F.skin;
  if (!S || !S.b0 || !S.w1 || S.b0.length < F.bodyVerts || !FB || FB.CHEST === undefined) return z;
  const vest = [FB.CHEST, FB.UARM_L, FB.UARM_R], bare = [FB.FARM_L, FB.FARM_R, FB.SHIN_L, FB.SHIN_R];
  const share = (set, k) => (set.includes(S.b0[k]) ? 1 - S.w1[k] : 0) + (S.b1[k] !== S.b0[k] && set.includes(S.b1[k]) ? S.w1[k] : 0);
  for (let k = 0; k < F.bodyVerts; k++) { z[k * 2] = share(vest, k); z[k * 2 + 1] = share(bare, k); }
  return z;
}
// The water's slope, as a line-up instance carries it in aInst2.x (WATER_VS): 2 + qx + 4096 qz,
// each quantised to 1/800 over -2.5..2.5 - 4001 steps, so the whole is an integer under 2^24 and
// exact in a float. The +2 keeps it clear of a stroke (0..1).
export function packSlope(sx, sz) {
  const q = (s) => Math.round((Math.min(2.5, Math.max(-2.5, s || 0)) + 2.5) * 800);
  return 2 + q(sx) + 4096 * q(sz);
}
// The model matrix place() builds (pitch about z, roll about x, yaw about y, then the scale), column
// major, for shadow.js's depth program. at: [x, y, z, yaw, pitch, roll, scale?].
export function surferModel(at, out) {
  const cp = Math.cos(at[4]), sp = Math.sin(at[4]), cr = Math.cos(at[5]), sr = Math.sin(at[5]);
  const ch = Math.cos(at[3]), sh = Math.sin(at[3]), s = at[6] === undefined ? 1 : at[6];
  out[0] = (ch * cp - sh * sp * sr) * s; out[1] = sp * cr * s; out[2] = (sh * cp + ch * sp * sr) * s; out[3] = 0;
  out[4] = (-ch * sp - sh * cp * sr) * s; out[5] = cp * cr * s; out[6] = (-sh * sp + ch * cp * sr) * s; out[7] = 0;
  out[8] = -sh * cr * s; out[9] = -sr * s; out[10] = ch * cr * s; out[11] = 0;
  out[12] = at[0]; out[13] = at[1]; out[14] = at[2]; out[15] = 1;
  return out;
}
// The shaders, for tools that compile them afresh (tmp-audit/stage4-render: the translated HLSL).
export function surfersShaderSource() { return { vert: VERT, frag: FRAG, skinVert: VERT_SKIN, skinDepth: DEPTH_SKIN_VERT, depthFrag: DEPTH_FRAG_SRC }; }   // GPUSKIN: the skinned two
// WHO IS DRAWN AS A PERSON (item 5): a member is kept at least NPC_HOLD s, and a newcomer takes a
// member's place only when NPC_SWAP m nearer than it. NPC_CONE: never skinned more than this far off
// where the camera looks. NPC_VIEW_R: the sphere, round a person and their board, that must touch
// the picture.
const NPC_HOLD = 1, NPC_SWAP = 6, NPC_CONE = 70 * Math.PI / 180, NPC_VIEW_R = 1.4;
// A member who slips out of the picture is kept while they are within NPC_KEEP_R more of it and for
// NPC_GRACE s - a person riding the edge of the frame as the camera rocks on the swell went in and
// out every few frames, and traded places with the next person each time (pickprobe.mjs, first run:
// #6 joined at 5.36 s and again at 5.63 s, and one swap came straight back inside a second).
const NPC_KEEP_R = 2, NPC_GRACE = 0.4, NPC_GRACE_D = 12;
// <<< PEOPLE

export class Surfers {
  constructor(gl, count = 14) {
    this.gl = gl;
    this.prog = link(gl, VERT, FRAG, 'surfers', ATTR);
    this.u = uniforms(gl, this.prog, ['uViewProj', 'uTime', 'uCamPos', 'uSunDir', 'uExposure',
      // >>> ENVREF  all three are null under ?cdbg=noenv, which omits the chunk.
      'uShadowMap', 'uLightViewProj', 'uShadowTexel',
      // <<< ENVREF
      'uWater']);   // PEOPLE (null under ?cdbg=oldwater, which never reads it)
    // >>> PEOPLE  (the palettes' block is made below, once the figure is built: look 0 is read off it.)
    // The player's look, set by the level: { suit 0-7, skin 0-4, hair 0-4, hood true | false | undefined
    // (undefined: the suit look's own) }. null = look 0 = the figure as it is built.
    this.playerLook = null;
    this._water = new Float32Array(4);   // uWater: the plane under the player's board (prepare)
    this._prep = null;                   // the player's pose for this frame (prepare)
    this._jointed = [];                  // who is drawn as a jointed person, and since when (_pick)
    this.waterAt0 = false;               // true: the player's water plane at world y 0 (tools' A/B, like ?cdbg=oldwater)
    this.castOff = false;                // true: the rider and board cast nothing (tools' A/B, like ?cdbg=nocast)
    this._mBody = new Float32Array(16); this._mBoard = new Float32Array(16);
    // <<< PEOPLE
    // >>> SURFERS  ?cdbg=oldmesh selects the pre-2026-09-20 meshes verbatim.
    this.types = OLD_MESH ? {
      prone: this._upload(buildProne()),
      rider: this._upload(buildRider()),
      loose: this._upload(buildLooseBoard()),
    } : OLD_BOARD ? {
      prone: this._upload(buildProneNew()),
      rider: this._upload(buildRiderNew()),
      loose: this._upload(buildLooseBoardNew()),
    } : {
      // >>> BOARDS  the bodies alone, and a loose board per hull - every board in the water is one of
      // these four draws (at most three more than before; the far figures' boards moved into them).
      prone: this._upload(buildProneNew(false)),
      rider: this._upload(buildRiderNew(false)),
      loose: this._upload(buildLooseBoardNew(), this._boardInst(0)),
      looseThruster: this._upload(buildLooseBoardNew(HULLS.thruster), this._boardInst(1)),
      looseFish: this._upload(buildLooseBoardNew(HULLS.fish), this._boardInst(2)),
      looseLong: this._upload(buildLooseBoardNew(HULLS.long), this._boardInst(3)),
      // <<< BOARDS
    };
    // >>> BOARDS  each draw's hull, as its instances hand it to the paint: a tenth per hull in the
    // design slot (_add; 0 for the foamie and the bodies, so theirs are the numbers they always were).
    for (const name in this.types) {
      const H = HULL_IDS.map((id) => HULLS[id]).find((h) => h.type === name) || FOAMIE;
      this.types[name].hullF = H.k * 0.1;
    }
    // The player's board (setPlayerBoard): today's foamie and paint until the level says otherwise.
    this.playerBoard = { hull: 'foamie', paint: PLAYER_BOARD };
    this._pHull = FOAMIE; this._pPaint = null;
    // <<< BOARDS
    // <<< SURFERS
    // >>> SURFER
    // Built here with everything else - SPEC section 5 bans creating GL objects on a first draw.
    // A failure is loud but not fatal: the player falls back to the line-up's own figures.
    // >>> GPUSKIN  skinned on the GPU (stage 6) - unless ?cdbg=cpuskin, or it cannot be built on this
    // device: then the CPU skins the figures, as before, and nothing else changes.
    this._gpu = false;
    if (!CPUSKIN) try { this._initSkin(); this._gpu = true; } catch (e) { this.skinWarn = String(e); console.warn('[surfers] GPU skinning (the CPU skins the figures instead):', e); }
    // <<< GPUSKIN
    try { this.fig = this._gpu ? this._skinFigure(new SurferFigure()) : this._uploadFigure(new SurferFigure()); } catch (e) { this.fig = null; this.figWarn = String(e); console.warn('[surfers] figure:', e); }
    // >>> SURFBOARDS  draw slots for the nearest line-up surfers as jointed people (the lod 2 mesh,
    // shared). Each person keeps their own pose; a slot is skinned for whoever is nearest this frame.
    // GPUSKIN: on the GPU the slots are only places - one instanced draw carries them all (this._gn).
    this.npc = [];
    try {
      const proto = new SurferFigure({ lod: 2, data: false });
      const zones = figZones(proto);   // PEOPLE
      if (this._gpu) { this._gn = this._skinBufs(figureGpuMesh(2), zones, SB_NPC); for (let i = 0; i < NPC_FIGS; i++) this.npc.push({ slot: i }); }
      else for (let i = 0; i < NPC_FIGS; i++) this.npc.push(this._uploadFigureBuf(proto.makeData(), proto.idx, proto.tris, zones));
      this._npcIds = hasMatIds(proto);   // PEOPLE
    } catch (e) { this.npc = null; console.warn('[surfers] line-up figures:', e); }
    // <<< SURFBOARDS
    // >>> PEOPLE  a look is only sent to a figure whose mesh carries material ids (hasMatIds): on one
    // from before the ids every vertex reads as suit, and a look would paint the face with it.
    this._figIds = !!(this.fig && hasMatIds(this.fig.fig));
    // THE PALETTES' BLOCK: made once, left on binding point 2 (and put back there in draw()). Look 0,
    // skin 0 and hair 0 are the colours the figure is BUILT with, read off its own mesh (figDefaults),
    // so a figure recoloured relative to them (LOOK_VS) can never drift from a palette typed here.
    const looks = LOOKS.slice();
    const fd = this.fig ? figDefaults(this.fig.fig) : null;
    if (fd) {
      for (let k = 0; k < 4; k++) if (fd[k]) looks.set(fd[k], k * 4);
      if (fd[4]) looks.set(fd[4], SUIT_LOOKS.length * 16);
      if (fd[5]) looks.set(fd[5], (SUIT_LOOKS.length * 4 + SKIN_TONES.length) * 4);
    }
    // BOARDS: and the hulls' outlines after the palettes (lkHull) - the block is sized for them.
    const looksAll = new Float32Array(looks.length + HULL_TABLE.length);
    looksAll.set(looks); looksAll.set(HULL_TABLE, looks.length);
    this.looksBuf = buffer(gl, gl.UNIFORM_BUFFER, looksAll, gl.STATIC_DRAW);
    gl.bindBuffer(gl.UNIFORM_BUFFER, null);
    const lbi = gl.getUniformBlockIndex(this.prog, LOOKS_BLOCK);
    if (lbi === gl.INVALID_INDEX) throw new Error('[surfers] uniform block "' + LOOKS_BLOCK + '" not found');
    gl.uniformBlockBinding(this.prog, lbi, LOOKS_BINDING);
    gl.bindBufferBase(gl.UNIFORM_BUFFER, LOOKS_BINDING, this.looksBuf);
    this.looksData = looks;   // for the suite and the probes
    // THE SHADOW CASTERS: position-only vertex arrays over the player's figure buffer and the loose
    // board's, for shadow.js's depth program (attribute aPos only). Built here, not on a first draw.
    this._castFig = this.fig ? (this.fig.sk ? this._castSkinVao(this.fig) : this._castVao(this.fig.vbo, this.fig.ebo)) : null;   // GPUSKIN: with its bones
    // The hood is always in the mesh (surfer-figure.js); a look without one draws none of it
    // (vHide), so it casts none either: the caster's index ranges with the hood's triangles left out.
    this._castRanges = this.fig ? [casterRanges(this.fig.fig, false), casterRanges(this.fig.fig, true)] : null;
    this._castBoard = this._castVao(this.types.loose.vbo, this.types.loose.ebo);
    // BOARDS: and one over each other hull's loose board (the player may be on any of them).
    this._castBoards = { loose: this._castBoard };
    for (const name in this.types) if (name.startsWith('loose') && name !== 'loose') this._castBoards[name] = this._castVao(this.types[name].vbo, this.types[name].ebo);
    // <<< PEOPLE
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
  // >>> BOARDS  ONE INSTANCE BUFFER FOR THE FOUR BOARD DRAWS: hull k's instances at k x MAX_INST, sent
  // in one bufferSubData a frame (draw()) rather than four. Built on first call, here in the constructor.
  _boardInst(k) {
    const gl = this.gl;
    if (!this._bi) { const arr = new Float32Array(4 * MAX_INST * INST_FLOATS); this._bi = { arr, buf: buffer(gl, gl.ARRAY_BUFFER, arr, gl.DYNAMIC_DRAW) }; }
    return { arr: this._bi.arr, buf: this._bi.buf, off: k * MAX_INST };
  }
  // <<< BOARDS
  _upload(kit, share) {   // BOARDS: share - an instance buffer shared by several draws (_boardInst)
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
    const vbo = buffer(gl, gl.ARRAY_BUFFER, data);   // PEOPLE: kept (the board's shadow caster reads it)
    gl.enableVertexAttribArray(ATTR.aPos); gl.vertexAttribPointer(ATTR.aPos, 3, gl.FLOAT, false, 40, 0);
    gl.enableVertexAttribArray(ATTR.aNormal); gl.vertexAttribPointer(ATTR.aNormal, 3, gl.FLOAT, false, 40, 12);
    gl.enableVertexAttribArray(ATTR.aColor); gl.vertexAttribPointer(ATTR.aColor, 3, gl.FLOAT, false, 40, 24);
    gl.enableVertexAttribArray(ATTR.aAnim); gl.vertexAttribPointer(ATTR.aAnim, 1, gl.FLOAT, false, 40, 36);

    const inst = share ? share.arr.subarray(share.off * INST_FLOATS, (share.off + MAX_INST) * INST_FLOATS) : new Float32Array(MAX_INST * INST_FLOATS);
    const ibo = share ? share.buf : buffer(gl, gl.ARRAY_BUFFER, inst, gl.DYNAMIC_DRAW);
    if (share) gl.bindBuffer(gl.ARRAY_BUFFER, ibo);
    for (let j = 0; j < 3; j++) {
      const loc = ATTR.aInst0 + j;
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, 48, (share ? share.off * 48 : 0) + j * 16);
      gl.vertexAttribDivisor(loc, 1);
    }
    const ebo = buffer(gl, gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(kit.idx));
    gl.bindVertexArray(null);
    return { vao, vbo, ebo, ibo, inst, n: 0, count: kit.idx.length, tris: kit.tris3, shared: share ? share.off : -1 };
  }

  // >>> PEOPLE  a position-only vertex array for shadow.js's depth program, over a buffer that is
  // already laid out pos3 nrm3 col3 anim1 (40 bytes a vertex) and its index buffer.
  _castVao(vbo, ebo) {
    const gl = this.gl, vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.enableVertexAttribArray(SHADOW_ATTRIBS.aPos);
    gl.vertexAttribPointer(SHADOW_ATTRIBS.aPos, 3, gl.FLOAT, false, 40, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
    gl.bindVertexArray(null);
    return vao;
  }
  // <<< PEOPLE

  // >>> SURFER
  // The player's figure: the same vertex layout and program as the line-up, but its vertex buffer is
  // DYNAMIC - the body is skinned on the CPU every frame (gl/surfer-figure.js) - and it has one
  // instance, the board's own transform.
  _uploadFigure(fig) {
    return { fig, ...this._uploadFigureBuf(fig.data, fig.idx, fig.tris, figZones(fig)) };   // PEOPLE: zones
  }
  // SURFBOARDS: the same, for a buffer that is not a figure's own (a line-up draw slot).
  // PEOPLE: `zones` (2 floats a vertex, static): the rash vest's and the shorty's share (figZones).
  _uploadFigureBuf(data, idx, tris, zones) {
    const gl = this.gl;
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    // >>> PEOPLE  (bound first so the ARRAY_BUFFER left bound below is still the vertex buffer)
    if (zones) {
      buffer(gl, gl.ARRAY_BUFFER, zones);
      gl.enableVertexAttribArray(ATTR.aZone); gl.vertexAttribPointer(ATTR.aZone, 2, gl.FLOAT, false, 8, 0);
    }
    // <<< PEOPLE
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
    const ebo = buffer(gl, gl.ELEMENT_ARRAY_BUFFER, idx);   // PEOPLE: kept (the figure's shadow caster)
    gl.bindVertexArray(null);
    return { vao, vbo, ebo, ibo, inst, count: idx.length, data, tris };
  }
  // <<< SURFER

  // >>> GPUSKIN  (27-28 Sep 2026, PIER SURF stage 6) the skinned figures' programs and bone buffers.
  // Built in the constructor like everything else here (SPEC section 5: nothing on a first draw); a
  // throw leaves the figures on the CPU (the constructor catches it).
  _initSkin() {
    const gl = this.gl;
    if (!VERT_SKIN) throw new Error('VERT no longer has the lines VERT_SKIN replaces');
    // The bones: SB_NPC figures of FIG_SB vec4s - 5,632 bytes, a third of the smallest block WebGL2
    // allows (MAX_UNIFORM_BLOCK_SIZE >= 16,384), and none of the default uniform block's vectors.
    const bytes = SB_NPC * FIG_SB * 16;
    if (bytes > gl.getParameter(gl.MAX_UNIFORM_BLOCK_SIZE)) throw new Error('SurfBones is ' + bytes + ' bytes: more than a block may be here');
    const bind = (prog, name, at) => {
      const i = gl.getUniformBlockIndex(prog, name);
      if (i === gl.INVALID_INDEX) throw new Error('[surfers] uniform block "' + name + '" not found');
      gl.uniformBlockBinding(prog, i, at);
    };
    this.progSkin = link(gl, VERT_SKIN, FRAG, 'surfersSkin', { ...ATTR, aSkin: ATTR_SKIN });
    this.uSkin = uniforms(gl, this.progSkin, ['uViewProj', 'uTime', 'uCamPos', 'uSunDir', 'uExposure',
      'uShadowMap', 'uLightViewProj', 'uShadowTexel', 'uWater']);
    bind(this.progSkin, BONES_BLOCK, BONES_BINDING);
    bind(this.progSkin, LOOKS_BLOCK, LOOKS_BINDING);
    const dp = link(gl, DEPTH_SKIN_VERT, DEPTH_FRAG_SRC, 'surfersSkinDepth', { aPos: SHADOW_ATTRIBS.aPos, aSkin: ATTR_SKIN });
    this._sd = { prog: dp, u: uniforms(gl, dp, ['uLightViewProj', 'uModel']) };
    bind(dp, BONES_BLOCK, BONES_BINDING);
    // The player's bones and the line-up's, each in a buffer the block's size (a bound range may not be
    // smaller than the block), sent as far as they are used.
    this._sbPd = new Float32Array(FIG_SB * 4);
    this._sbNd = new Float32Array(SB_NPC * FIG_SB * 4);
    this._sbP = buffer(gl, gl.UNIFORM_BUFFER, new Float32Array(bytes / 4), gl.DYNAMIC_DRAW);
    this._sbN = buffer(gl, gl.UNIFORM_BUFFER, new Float32Array(bytes / 4), gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.UNIFORM_BUFFER, null);
    this._nFd = 0;
  }
  // A lod's figure as the GPU draws it: the bind-pose vertex buffer (STATIC - sent once), the skin
  // (bones and shares), the zones, the index buffer, and an instance buffer of `maxInst` instances.
  _skinBufs(G, zones, maxInst) {
    const gl = this.gl;
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    if (zones) { buffer(gl, gl.ARRAY_BUFFER, zones); gl.enableVertexAttribArray(ATTR.aZone); gl.vertexAttribPointer(ATTR.aZone, 2, gl.FLOAT, false, 8, 0); }
    const sk = buffer(gl, gl.ARRAY_BUFFER, G.skin);
    gl.enableVertexAttribArray(ATTR_SKIN); gl.vertexAttribPointer(ATTR_SKIN, 4, gl.FLOAT, false, 16, 0);
    const vbo = buffer(gl, gl.ARRAY_BUFFER, G.data);
    gl.enableVertexAttribArray(ATTR.aPos); gl.vertexAttribPointer(ATTR.aPos, 3, gl.FLOAT, false, 40, 0);
    gl.enableVertexAttribArray(ATTR.aNormal); gl.vertexAttribPointer(ATTR.aNormal, 3, gl.FLOAT, false, 40, 12);
    gl.enableVertexAttribArray(ATTR.aColor); gl.vertexAttribPointer(ATTR.aColor, 3, gl.FLOAT, false, 40, 24);
    gl.enableVertexAttribArray(ATTR.aAnim); gl.vertexAttribPointer(ATTR.aAnim, 1, gl.FLOAT, false, 40, 36);
    const inst = new Float32Array(maxInst * INST_FLOATS);
    const ibo = buffer(gl, gl.ARRAY_BUFFER, inst, gl.DYNAMIC_DRAW);
    for (let j = 0; j < 3; j++) {
      const loc = ATTR.aInst0 + j;
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, 48, j * 16);
      gl.vertexAttribDivisor(loc, 1);
    }
    const ebo = buffer(gl, gl.ELEMENT_ARRAY_BUFFER, G.idx);
    gl.bindVertexArray(null);
    return { vao, vbo, sk, ebo, ibo, inst, count: G.idx.length, tris: G.tris, gpu: true };
  }
  // The player's: the fields _uploadFigure hands back (fig, vao, ibo, inst, count ...), and no data.
  _skinFigure(fig) { return { fig, ...this._skinBufs(figureGpuMesh(fig.lod), figZones(fig), 1) }; }
  // The rider's shadow caster: the position and the skin, for DEPTH_SKIN_VERT.
  _castSkinVao(B) {
    const gl = this.gl, vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, B.vbo);
    gl.enableVertexAttribArray(SHADOW_ATTRIBS.aPos); gl.vertexAttribPointer(SHADOW_ATTRIBS.aPos, 3, gl.FLOAT, false, 40, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, B.sk);
    gl.enableVertexAttribArray(ATTR_SKIN); gl.vertexAttribPointer(ATTR_SKIN, 4, gl.FLOAT, false, 16, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, B.ebo);
    gl.bindVertexArray(null);
    return vao;
  }
  // The skinned program, set up for this frame's figure draws (the rigid program's uniforms, again).
  _useSkin(cam, vp, sunDir, exposure, time, shadow) {
    const gl = this.gl, u = this.uSkin;
    gl.useProgram(this.progSkin);
    gl.uniformMatrix4fv(u.uViewProj, false, vp);
    gl.uniform1f(u.uTime, time);
    gl.uniform3f(u.uCamPos, cam.x, cam.y, cam.z);
    gl.uniform3f(u.uSunDir, sunDir[0], sunDir[1], sunDir[2]);
    gl.uniform1f(u.uExposure, exposure);
    if (shadow) shadow.bind(gl, this.progSkin, u);
    if (u.uWater) { const Wp = this.waterAt0 ? [0, 0, 0, 1] : this._water; gl.uniform4f(u.uWater, Wp[0], Wp[1], Wp[2], Wp[3]); }
  }
  // How many of the line-up are drawn jointed: NPC_FIGS, or NPC_FIGS_LITE on the lite look (phones, and
  // the safety net's step down - window.__gfx is the live state), never more than there are places.
  _npcMax() {
    const lite = typeof globalThis !== 'undefined' && globalThis.__gfx && globalThis.__gfx.tier === 'lite';
    return Math.min(this.npc ? this.npc.length : 0, lite ? NPC_FIGS_LITE : NPC_FIGS);
  }
  // The next jointed line-up figure to draw this frame (draw()): records kept from frame to frame, not
  // two new arrays a figure a frame (the per-frame garbage).
  _fdAdd(F, p, W, x, y, z, yaw, pitch, roll, sc) {
    const FD = this._fd || (this._fd = []);
    const R = FD[this._nFd] || (FD[this._nFd] = { F: null, at: [0, 0, 0, 0, 0, 0, 1], leash: true, who: null, W: null });
    this._nFd++;
    R.F = F; R.who = p; R.W = W; R.leash = true;
    const a = R.at; a[0] = x; a[1] = y; a[2] = z; a[3] = yaw; a[4] = pitch; a[5] = roll; a[6] = sc;
  }
  // <<< GPUSKIN

  // SURFBOARDS: `paint` [design, A, B] (none = the vertex colours); `cap` = the player's own.
  // PEOPLE: `look` a far figure's look (lookCode), in the design slot's twenties; `wat` [height, slope x,
  // slope z] of the water at (x, z) - the height in the phase slot (+ 1000) and the slope in the stroke
  // slot (packSlope), wherever the arms do not need them: every pose but a prone one that strokes,
  // which falls back to its own height in the shader (WATER_VS).
  _add(type, x, y, z, yaw, pitch, roll, phase, scale, stroke, paint, cap, look, wat) {
    const t = this.types[type] || this.types.loose;   // BOARDS: a hull's draw, or (a harness's own types) the one
    if (t.n >= MAX_INST) return;
    const o = t.n * INST_FLOATS, a = t.inst;
    const water = wat && !(type === 'prone' && stroke > 0);   // PEOPLE
    a[o] = x; a[o + 1] = y; a[o + 2] = z; a[o + 3] = yaw;
    a[o + 4] = pitch; a[o + 5] = roll; a[o + 6] = water ? 1000 + wat[0] : phase; a[o + 7] = scale;
    a[o + 8] = water ? packSlope(wat[1], wat[2]) : stroke;
    a[o + 9] = (paint ? paint[0] : 9) + (cap ? 10 : 0) + 20 * (look || 0) + (t.hullF || 0); a[o + 10] = paint ? paint[1] : 0; a[o + 11] = paint ? paint[2] : 0;   // BOARDS: hullF
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
    // >>> SURFER  while a replay of your ride plays (surfer/replay.js) the line-up stays where it is:
    // the sea being drawn is a past one, and the line-up lives in the present.
    if (this.lineupOff) return;
    // <<< SURFER
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
            // GPUSKIN (the per-frame garbage): a loop, not .some() and its closure.
            let busy = false;
            for (let k = 0; k < this.people.length; k++) { const q = this.people[k]; if (q !== p && q.side === p.side && q.dir === dir && (q.state === PADDLE || q.state === RIDE)) { busy = true; break; } }
            if (!busy) {
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
      p.sX = sX; p.sZ = sZ; p.wb = p.eta;                // PEOPLE: the water plane draw() hands the shader
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
        p.hs = ws - p.eta; p.hb = wb - p.eta; p.wb = wb;   // PEOPLE: wb, the water at the board
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
    // Where a ride has to end whatever was planned: the wave gone, the beach, the pier, long enough -
    // and (28 Sep 2026) the whitewater: broken here and 8 m further out too, the bore, where nobody carves
    // (the player's board has the same rule: surfboard.js BOARD.foamProbe). They pull out.
    const last = R.moves.length - 1;
    if (R.mi < last && (S.amp < 0.1 || p.d < p.dIn + 2 || Math.abs(p.o) < 16 || R.t > R.len + 4 || this._inBore(p, S, time, ctl))) { R.mi = last; R.mt = 0; R.ph = 0; R.pt = 0; }
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
  // THE BORE (28 Sep 2026): broken here, and broken 8 m further out as well - inside the break, not at the curl.
  _inBore(p, S, time, ctl) {
    if (!(S.brk > 0.97)) return false;
    const w = this._w4 || (this._w4 = [0, 0]);
    toWorld(this._station(p.d + 8, p.o), p.o, w);
    return surfSample(w[0], w[1], time, 0, ctl, this._slot4 || (this._slot4 = makeSurfSlot())).brk > 0.8;
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

  // >>> PEOPLE  THE PLAYER, POSED BEFORE THE SHADOW PASS (item 1, 27 Sep 2026). The figure was posed
  // and skinned inside draw(), which runs after the shadow map is filled - so it could not cast, and
  // had it cast from there it would have cast LAST frame's pose (a frame late, plain at half speed in
  // a carve). renderer.js now calls this first: the pose, the skinned buffer (uploaded here, once),
  // the board's and the body's transforms and the water plane under the board are settled once a
  // frame, and drawShadow() and draw() both read them. draw() calls it itself for a caller that did
  // not. `sea`: the Sea (update() keeps the last one too); `cam`: kept for that fallback only.
  // >>> BOARDS  THE LEASH NEVER BREAKS INTO DASHES. The cord is a 5.5 mm tube of four sides (gl/surfer-
  // figure.js write()); from the chase camera a few metres back that is well under a pixel across, and a
  // tube thinner than a pixel covers a pixel centre only here and there: it drew as a dotted line past
  // the tail (lmain f421/f541, tmp-audit/look/c421.jpg). So its radius has a floor of LEASH_PX (0.8) px
  // - a square section of radius r is at least 1.41 r wide, over a pixel - taken at the board's
  // distance from the lens plus LEASH_REACH (the cord can be 1.2 m nearer or further than the board's
  // middle, so every part of it clears the floor). And where the floor would make it more than
  // LEASH_MAX (3) times as thick as it is, the cord is not drawn at all: at that distance (about 13 m
  // from the chase camera) a real one is a third of a pixel, and a line drawn there would be a rope.
  // Returns what write() takes: true (its own radius), a radius in the figure's metres (s: the
  // instance's scale), or false. Near the lens it is always true, so the figure is skinned exactly as
  // it was; under ?cdbg=oldboard, always true. _pxK: a pixel's size a metre away (draw()); undefined
  // before the first draw, then the floor starts.
  leashR(x, y, z, cam, s) {
    if (OLD_BOARD || !cam || !(this._pxK > 0)) return true;
    const dx = x - cam.x, dy = y - cam.y, dz = z - cam.z;
    const r = (LEASH_PX * this._pxK * (Math.sqrt(dx * dx + dy * dy + dz * dz) + LEASH_REACH)) / (s || 1);
    return r <= LEASH_R ? true : r <= LEASH_R * LEASH_MAX ? r : false;
  }
  // THE PLAYER'S BOARD, for the level (surfer/mode.js: the locker's BOARD row, shown only once
  // this method exists). opt: { hull: 'foamie' | 'thruster' | 'fish' | 'long', paint? } or null.
  //   hull   anything else - or null - is the foamie, today's board
  //   paint  optional: an index into BOARD_LOOKS (0-13), or a [design 0-5, colour A, colour B] of the
  //          board palette; left out (or not valid) it is today's, PLAYER_BOARD
  // Cosmetic only: the physics (boats/surfboard.js) never sees a hull. The rider stands on the new deck
  // (each hull is drawn at the foamie's deck height under the feet), the leash runs to its plug, the
  // shadow is its shape, and the first-person cap is painted to its outline. Under ?cdbg=oldboard the
  // choice is kept (this.playerBoard) but the foamie is drawn.
  setPlayerBoard(opt) {
    const id = opt && typeof opt.hull === 'string' && HULLS[opt.hull] && Object.prototype.hasOwnProperty.call(HULLS, opt.hull) ? opt.hull : 'foamie';
    const pal = BOARD_PAL.length, P = opt ? opt.paint : null;
    let paint = null;
    if (Number.isInteger(P) && P >= 0 && P < BOARD_LOOKS.length) paint = BOARD_LOOKS[P];
    else if (Array.isArray(P) && P.length === 3 && [0, 1, 2].every((k) => Number.isInteger(P[k]) && P[k] >= 0)
      && P[0] <= 5 && P[1] < pal && P[2] < pal) paint = [P[0], P[1], P[2]];
    this.playerBoard = { hull: id, paint: paint || PLAYER_BOARD };
    this._pHull = OLD_BOARD ? FOAMIE : HULLS[id];
    this._pPaint = paint;
    return this.playerBoard;
  }
  // <<< BOARDS

  // >>> GPUSKIN  THE RIDER IS POSED BEFORE THE CAMERA (27-28 Sep 2026, PIER SURF stage 6). The pose was
  // settled in prepare(), inside the renderer - AFTER the craft hub had framed the shot, so the first-
  // person camera (boats/hub.js _fpv / _pov, surfer/pov-cam.js) put the eyes where last frame's pose had
  // them while the head was drawn where this frame's had it. The hub now calls this first (a fenced line
  // in its _draw), and prepare() takes the pose it left - so the eyes and the drawn head are one pose.
  // A caller that does not (a replay, a tool, a headless suite) is posed by prepare() as before. Returns
  // true if it posed the rider. (Nothing is skinned or sent here: that needs the camera - leashR.)
  poseFigure(time, sea) {
    if (sea && sea.sample) this._sea = sea;
    this._posed = null;
    const me = this.player, F = this.fig;
    if (this._hidden || !me || !F) return false;
    this._pose(time, me, F);
    this._posed = time;
    return true;
  }
  // The pose itself, poseFigure()'s or prepare()'s: the figure updated from the board, the board's and
  // the body's transforms, and where the leash is judged from. Into this._pz, which it returns.
  _pose(time, me, F) {
    const Z = this._pz || (this._pz = { board: null, figAt: null, leashAt: null });
    F.fig.tailAt = (this._pHull || FOAMIE).tail;   // BOARDS: the leash plug of the hull under you (null: the foamie's)
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
      const Ps = swimPoint(0);
      const ws = sea && sea.sample ? sea.sample(me.x + ch * Ps[0] - sh * Ps[2], me.z + sh * Ps[0] + ch * Ps[2], time, 0, 3).height : y0;
      F.fig.update(me, dt, { wipeT: T, wipeTurn: 0, wipeRel: W.rel, wipeHs: ws - y0, wipeHb: wb - y0 });
      Z.board = [bx, wb + b.y, bz, me.heading + b.yaw, b.pitch, b.roll];   // PEOPLE: drawn in draw()
      Z.figAt = F.fig.rig && F.fig.rig.mount ? [bx, wb + b.y, bz, me.heading + b.yaw, b.pitch, b.roll] : [me.x, y0, me.z, me.heading, 0, 0];
      Z.leashAt = [bx, wb, bz];
      F.fig.drawAt = Z.figAt;
      // (PEOPLE: the own-eyes test that hides the body from the lens inside it is camera by camera,
      // so it is in draw().)
      // <<< SURFBOARDS
    } else {
      // SURFBOARDS: the board banks, so the body need not. PEOPLE (27 Sep 2026): the board's own body fx
      // when it writes them (boats/surfboard.js: banked, comp, carve, snap, back every RIDE tick); a
      // replay's ghost board has none, so PLAYER_FX stays the fallback.
      const ex = F.fig.update(me, dt, me.fx || PLAYER_FX);
      const pit = ex.abs ? ex.pitch : me.pitch + ex.pitch, y = me.yDraw + ex.drop;   // abs: a duck-dive's own pitch
      Z.board = [me.x, y, me.z, me.heading, pit, me.roll];   // PEOPLE: drawn in draw(), painted and capped
      Z.figAt = [me.x, y, me.z, me.heading, pit, me.roll];
      this._pb = { y, pitch: pit, roll: me.roll };      // SURFBOARDS: where a wipeout starts from
      Z.leashAt = [me.x, y, me.z];
    }
    this._pwLast = me.state;
    if (me.state !== 3) F.fig.drawAt = Z.figAt;         // SURFBOARDS: the first-person camera's frame
    return Z;
  }
  // <<< GPUSKIN

  prepare(time, sea, cam) {
    const P = this._prep || (this._prep = { t: 0, ok: false, fig: null, cast: null, board: null });
    P.t = time; P.ok = false; P.fig = null; P.cast = null; P.board = null; P.leashAt = null;   // BOARDS: leashAt
    this._water[3] = 0;
    if (sea && sea.sample) this._sea = sea;
    const me = this.player, F = this.fig;
    // >>> GPUSKIN  posed already this frame, before the camera (poseFigure) - or posed here, as it was
    const pre = this._posed === time && !!this._pz;
    this._posed = null;
    // <<< GPUSKIN
    if (this._hidden || !me || !F) return;
    P.ok = true;
    const Z = pre ? this._pz : this._pose(time, me, F);
    let figAt = Z.figAt;
    P.board = Z.board; P.leashAt = Z.leashAt;
    P.leash = this.leashR(Z.leashAt[0], Z.leashAt[1], Z.leashAt[2], cam, 1);
    // BOARDS: true, or a thicker cord far off (or none). GPUSKIN: the bones for the vertex shader - or,
    // on the CPU (?cdbg=cpuskin), the whole body skinned into the vertex buffer, as it was.
    if (this._gpu) F.fig.bones(P.leash, this._sbPd, 0); else F.fig.write(P.leash);
    if (me.state !== 3) F.fig.drawAt = figAt;             // SURFBOARDS: the first-person camera's frame
    // SURFER: the ride view's lens passing through the head (boats/hub.js _rideView sets it): the
    // body is not drawn for those frames. drawAt above still carries the frame for the eyes.
    if (F.fig.hideNear && me.state !== 3) figAt = null;
    P.fig = figAt;
    // The body still casts when it is not drawn for the lens inside it: it is there.
    P.cast = F.fig.drawAt;
    const gl = this.gl;
    // GPUSKIN: 704 bytes of bones (the shadow pass and draw() read them) where 238 KB of vertices went.
    if (this._gpu) { gl.bindBuffer(gl.UNIFORM_BUFFER, this._sbP); gl.bufferSubData(gl.UNIFORM_BUFFER, 0, this._sbPd); }
    else {
      gl.bindBuffer(gl.ARRAY_BUFFER, F.vbo);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, F.fig.data);
    }
    // THE WATER UNDER THE BOARD (item 2): its height at the board and its slope, from the sea the game
    // reads - by CENTRAL differences 0.35 m either way, not sea.sample's analytic slope. Measured
    // (tmp-audit/stage4-render/slope-check.mjs), that slope is not the slope of the height it returns
    // on the big day - off by up to 0.26 from a 2 cm central difference - and a forward difference is
    // off by up to 0.35 on the wall's curve. As a plane (plane-fit.mjs, 3x, 1600 boards) this is within
    // 0.24 cm at the rails half the time and 1.1 cm in 95%; at the nose and tail, 2.6 / 13 cm - a
    // plane cannot follow the wall's curve 1.1 m out, and it does not need to: the band is on the rail.
    const S = this._sea;
    if (S && S.sample) {
      const x = me.x, z = me.z, e = 0.35;
      const h = S.sample(x, z, time, 0, 3).height;
      const sx = (S.sample(x + e, z, time, 0, 3).height - S.sample(x - e, z, time, 0, 3).height) / (2 * e);
      const sz = (S.sample(x, z + e, time, 0, 3).height - S.sample(x, z - e, time, 0, 3).height) / (2 * e);
      const Wp = this._water;
      Wp[0] = h - sx * x - sz * z; Wp[1] = sx; Wp[2] = sz; Wp[3] = 1;
    }
  }

  // THE RIDER AND THE BOARD CAST (item 1): drawn by renderer.js inside the shadow pass, after the
  // craft, with the pose prepare() settled - the same buffer and transforms draw() uses, so the
  // shadow cannot lag the body. gl/boats.js drawShadow returns early for the surfboard; this is it.
  // Culling is off for these two: the figure's lofts are not all wound one way, and the board's hull
  // is wound inward (its normals point in - see vNy), so front-face culling would keep the lit side of
  // some parts and not others. With both faces in the map a lit surface meets its own depth, which the
  // slope-scaled offset (CAST_OFFSET, see SURF_SLACK's note) moves out of its way. Cost: 8,868 of the
  // figure's 11,188 triangles at lod 1 (casterRanges: no hands, feet, leash or unworn hood - one draw
  // as the mesh is laid out today) and the board's 672, into the 2048 map; measured in
  // tmp-audit/stage4-render/perf-swiftshader.txt.
  // Does the player's look have a hood (the shader's `hooded`, for the caster)?
  _playerHood() {
    const L = this._figIds && LOOK_ON ? this.playerLook : null;
    if (!L) return false;
    if (L.hood === true || L.hood === false) return L.hood;
    const s = SUIT_LOOKS[Math.max(0, Math.min(SUIT_LOOKS.length - 1, L.suit | 0))];
    return !!(s && s.hood);
  }
  drawShadow(shadow) {
    const P = this._prep;
    if (NOCAST || this.castOff || !shadow || !P || !P.ok) return;   // castOff: a same-instant A/B handle for tools
    const gl = this.gl;
    gl.disable(gl.CULL_FACE);
    gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(CAST_OFFSET[0], CAST_OFFSET[1]);
    if (P.cast && this._castFig) {
      const m = surferModel(P.cast, this._mBody), keep = this._castRanges && this._castRanges[this._playerHood() ? 1 : 0];
      // GPUSKIN: bent in the vertex shader, so through its own depth program, with the player's bones.
      if (this._gpu) { gl.bindBufferBase(gl.UNIFORM_BUFFER, BONES_BINDING, this._sbP); shadow.drawCasterWith(this._sd.prog, this._sd.u, this._castFig, keep || [[0, this.fig.count]], m); }
      else if (keep) for (const [first, n] of keep) shadow.drawCaster(this._castFig, n, gl.UNSIGNED_SHORT, m, first * 2);
      else shadow.drawCaster(this._castFig, this.fig.count, gl.UNSIGNED_SHORT, m);
    }
    // BOARDS: the player's own hull's caster (the foamie's is _castBoard, as it was).
    if (P.board) { const bt = (this._pHull || FOAMIE).type; shadow.drawCaster((this._castBoards && this._castBoards[bt]) || this._castBoard, (this.types[bt] || this.types.loose).count, gl.UNSIGNED_SHORT, surferModel(P.board, this._mBoard)); }
    gl.disable(gl.POLYGON_OFFSET_FILL);
    gl.enable(gl.CULL_FACE);   // as shadow.begin() left it
  }

  // WHO IS DRAWN AS A PERSON (item 5, 27 Sep 2026). The nearest three within 55 m were picked afresh
  // every frame by distance alone, so two surfers at nearly the same range swapped back and forth -
  // and each join skinned a figure whose pose was however old it was: a rider who had lain down long
  // since knelt, or stood up, as they came in. And a third of it was wasted: tmp-audit/perf/npcview.mjs
  // measured 23-37% of the skinned figures out of the picture (behind the camera, paddling out).
  // Now a member is held: a newcomer takes the farthest member's place only when NPC_SWAP (6) m
  // nearer, and never before that member has had NPC_HOLD (1) s. Nobody out of the picture is
  // skinned - their sphere (NPC_VIEW_R round them and their board) clear of the frustum, or more than
  // 70 degrees off where the camera looks - and a member who leaves it is let go at once: out of
  // sight, the change cannot be seen. A joiner is flagged (_jfresh) so draw() snaps their figure to
  // where they are. A second camera on the same instant (the film's side camera) only fills free
  // places, so the two views do not trade people every frame.
  _pick(crowd, cam, vp, time) {
    const J = this._jointed, max = this._npcMax();   // GPUSKIN: the look's count (NPC_FIGS, or NPC_FIGS_LITE on lite)
    const again = time === this._pickT;
    const step = again || this._pickT === undefined ? 0 : Math.max(0, Math.min(0.25, time - this._pickT));
    this._pickT = time;
    // The frustum's planes (Gribb-Hartmann), from the view-projection: left, right, bottom, top, near.
    const PL = this._planes || (this._planes = new Float64Array(20));
    for (let i = 0; i < 5; i++) {
      const r = i >> 1, sg = i & 1 ? -1 : 1;
      const a = vp[3] + sg * vp[r], b = vp[7] + sg * vp[4 + r], c = vp[11] + sg * vp[8 + r], d = vp[15] + sg * vp[12 + r];
      const l = Math.sqrt(a * a + b * b + c * c) || 1;
      PL[i * 4] = a / l; PL[i * 4 + 1] = b / l; PL[i * 4 + 2] = c / l; PL[i * 4 + 3] = d / l;
    }
    const fx = Math.cos(cam.yaw), fz = Math.sin(cam.yaw), cone = Math.cos(NPC_CONE);
    // The sphere is NPC_VIEW_R, but never wider than 0.15 rad seen from the lens (npcview.mjs's margin):
    // close in, 1.4 m let a surfer 7 m off stay jointed with their centre 12 degrees past the frame's
    // edge (the suite's paddle-out: 9 figure-frames). There a board's tip may still show at the edge
    // for a moment, drawn as the far figure - the price of never skinning what is not in the picture.
    const seen = (p, more = 0) => {
      const x = p.wx, y = (p.eta || 0) + 0.5, z = p.wz;
      const dx = x - cam.x, dz = z - cam.z, L = Math.sqrt(dx * dx + dz * dz);
      const r = Math.min(NPC_VIEW_R + more, 0.15 * L) + (p.state === TUMBLE ? 2 : 0);
      if (L > 3 && dx * fx + dz * fz < cone * L) return false;
      // The side planes and the near one - not the top and bottom: lying in a trough the lens pitches
      // down and the line-up leaves the top of the frame for a second at a time, every swell (pickprobe
      // at 1.8x: the same three traded places every 8 s). Out of the top or bottom is not out of sight.
      for (let i = 0; i < 20; i += 4) if (i !== 8 && i !== 12 && PL[i] * x + PL[i + 1] * y + PL[i + 2] * z + PL[i + 3] < -r) return false;
      return true;
    };
    for (const p of crowd) {
      p._jd = p.wx === undefined ? Infinity : Math.sqrt((p.wx - cam.x) ** 2 + (p.wz - cam.z) ** 2);
      p._jin = false;
    }
    for (let i = J.length - 1; i >= 0; i--) {
      const m = J[i], p = m.p;
      m.out = seen(p) ? 0 : (m.out || 0) + step;
      // (The grace is for people further off than NPC_GRACE_D: one passed close by slides out of the
      // side of the frame and does not come back - measured, the only out-of-picture skinning left
      // was one surfer 8 m away for the 0.3 s of the grace, 5.6 degrees past the frame's edge.)
      const far = p._jd >= NPC_GRACE_D;
      if (!again && (!crowd.includes(p) || !(p._jd < NPC_FIG_R + 5) || !seen(p, far ? NPC_KEEP_R : 0) || m.out > (far ? NPC_GRACE : 0))) { J.splice(i, 1); p._jleft = time; continue; }
      p._jin = true;
    }
    // GPUSKIN: fewer places than members (the safety net has stepped the look down to lite): the farthest go.
    while (J.length > max) {
      let fi = 0;
      for (let i = 1; i < J.length; i++) if (J[i].p._jd > J[fi].p._jd) fi = i;
      J[fi].p._jin = false; J[fi].p._jleft = time; J.splice(fi, 1);
    }
    const C = this._cand || (this._cand = []);
    C.length = 0;
    // ...and not back within NPC_HOLD of being let go: a duck-dive swings the lens under and out again
    // in under a second, and without this the same two people traded places across it (pickprobe at
    // 1.8x: 7 swaps straight back inside a second, every set).
    for (const p of crowd) if (!p._jin && p._jd < NPC_FIG_R && !(time - p._jleft < NPC_HOLD && time >= p._jleft) && seen(p)) C.push(p);
    // Nearest first. GPUSKIN (the per-frame garbage): an insertion sort in place - stable, as sort() is,
    // so the same order - not sort() and its comparator closure a frame.
    for (let i = 1; i < C.length; i++) { const x = C[i]; let j = i - 1; while (j >= 0 && C[j]._jd > x._jd) { C[j + 1] = C[j]; j--; } C[j + 1] = x; }
    for (const p of C) {
      if (J.length < max) { J.push({ p, t0: time, out: 0 }); p._jin = true; p._jfresh = true; continue; }
      if (again) break;
      let far = null;
      for (const m of J) if ((time - m.t0 >= NPC_HOLD || time < m.t0) && (!far || m.p._jd > far.p._jd)) far = m;
      if (!far || far.p._jd - p._jd < NPC_SWAP) break;   // the rest are further still
      far.p._jin = false; far.p._jleft = time; far.p = p; far.t0 = time; far.out = 0; p._jin = true; p._jfresh = true;
    }
  }
  // <<< PEOPLE

  // Called after the coast is drawn, with the renderer's own matrices.
  // >>> ENVREF  `shadow` appended - the ShadowMap, or null/undefined on a
  // caller that has none, in which case sunShadow's uniforms stay at their GL
  // defaults and it returns 1.0 the way it did before this pass.
  // <<< ENVREF
  draw(cam, vp, sunDir, exposure, time, shadow) {
    const gl = this.gl;
    for (const k in this.types) this.types[k].n = 0;
    if (this._hidden) { this.lastStats = { draws: 0, tris: 0, instances: 0 }; return; }
    // >>> PEOPLE  posed once a frame, before the shadow pass (prepare); here only for a caller that did not.
    if (!this._prep || this._prep.t !== time) this.prepare(time, this._sea, cam);
    // <<< PEOPLE
    // >>> SURFBOARDS  the nearest few are drawn as jointed people (below), the rest as the figures.
    const figDt = this._npcT === undefined ? 1 / 60 : Math.max(0, Math.min(0.1, time - this._npcT));
    this._npcT = time;
    // SURFER: a replay (surfer/replay.js lineupOff) draws you alone - drawn over a past sea, the
    // line-up would float in it or sink.
    const crowd = this.lineupOff ? [] : this.people;
    // PEOPLE: who, is _pick's (item 5); ?cdbg=oldpick keeps the old rule, the nearest three by distance.
    const jointed = this._jset || (this._jset = new Set());
    jointed.clear();
    if (this.npc && !OLD_MESH) {
      if (OLDPICK) {
        const near = [];
        for (const p of crowd) {
          if (p.wx === undefined) continue;
          const d2 = (p.wx - cam.x) ** 2 + (p.wz - cam.z) ** 2;
          if (d2 < NPC_FIG_R * NPC_FIG_R) near.push([d2, p]);
        }
        near.sort((a, b) => a[0] - b[0]);
        near.length = Math.min(near.length, this._npcMax());   // GPUSKIN: the look's count
        for (const n of near) jointed.add(n[1]);
      } else {
        this._pick(crowd, cam, vp, time);
        for (const m of this._jointed) jointed.add(m.p);
      }
    }
    this._nFd = 0;   // GPUSKIN: this frame's jointed figures (_fdAdd), in records kept from frame to frame
    // <<< SURFBOARDS

    for (const p of crowd) {
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
      const bh = OLD_BOARD ? FOAMIE : HULLS[p.hull] || FOAMIE;   // BOARDS: their hull
      const tumble = p.state === TUMBLE && p.wipe;
      const sitting = p.state === WAIT || (p.state === PADDLE && p.sub === 0);
      const dk = p.dk >= 0 ? p.dk : -1;
      // >>> PEOPLE  the look, and the water where they are: at the rider (p.wx, p.eta) and, in a
      // wipeout, at the board (p.wb); the slope is the one under the rider (update(): p.sX, p.sZ).
      const lk = lookCode(p.look);
      const wat = p._wat || (p._wat = [0, 0, 0]), watB = p._watB || (p._watB = [0, 0, 0]);
      wat[0] = p.eta || 0; wat[1] = p.sX || 0; wat[2] = p.sZ || 0;
      watB[0] = p.wb === undefined ? wat[0] : p.wb; watB[1] = wat[1]; watB[2] = wat[2];
      // <<< PEOPLE
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
        // >>> PEOPLE  joined this frame: the figure is put where this person is (gl/surfer-figure.js
        // snapTo), not left to play out the pose it was last drawn in - minutes ago, perhaps standing.
        // snapTo() takes update()'s arguments and returns what it does, so on the frame they join it is
        // called INSTEAD of update(). (A figure without it: its transition state is forgotten by hand.)
        F.tailAt = bh.tail;   // BOARDS: the leash plug of their own hull (null: the foamie's, the figure's own)
        const X = this._fx(p), snap = p._jfresh && typeof F.snapTo === 'function';
        if (p._jfresh && !snap) { F.lastState = me.state; F.fromPose = null; F.downT = 9; F.popT = 9; F.sit = sitting ? 1 : 0; F.stillT = sitting ? 2 : 0; }
        p._jfresh = false;
        const ex = snap ? F.snapTo(me, X) : F.update(me, figDt, X);
        // <<< PEOPLE
        if (tumble) {
          this._add(bh.type, p.bx, p.by, p.bz, p.byaw, p.bpitch, p.broll, p.phase, p.scale, 0, paint, false, 0, watB);
          const mount = F.rig && F.rig.mount;
          if (mount) this._fdAdd(F, p, watB, p.bx, p.by, p.bz, p.byaw, p.bpitch, p.broll, p.scale);
          else this._fdAdd(F, p, wat, p.wx, p.eta, p.wz, p.wipe.h0, 0, 0, p.scale);
        } else {
          const pit = ex.abs ? ex.pitch : p.bpitch + ex.pitch, yy = p.by + ex.drop;
          this._add(bh.type, p.bx, yy, p.bz, p.byaw, pit, p.broll, p.phase, p.scale, 0, paint, false, 0, wat);
          this._fdAdd(F, p, wat, p.bx, yy, p.bz, p.byaw, pit, p.broll, p.scale);
        }
        continue;
      }
      // Further off, the rigid figures: lying (sitting is the lying one, tail down), standing, and a
      // loose board. A wipeout's swimmer is under the water, or just a head, until they climb on.
      // PEOPLE: each with their look, and the water they are in (_add puts it where the arms allow).
      // BOARDS: the bodies are drawn alone now, and each board as a loose board of its own hull with the
      // body's own transform - so a far surfer's board is the shape it is when they come near. (Under
      // ?cdbg=oldboard the bodies carry their boards, as before.) The board gets the water plane even
      // under a stroking paddler: its slot is free, the arms' stroke is the body's.
      if (tumble) {
        this._add(bh.type, p.bx, p.by, p.bz, p.byaw, p.bpitch, p.broll, p.phase, p.scale, 0, paint, false, 0, watB);
        if (wipePhase(p.t, p.wipe.T).i === 4) this._add('prone', p.bx, p.by, p.bz, p.byaw, p.bpitch - 0.06, p.broll, p.phase, p.scale, 0.3, paint, false, lk, watB);
      } else {
        const ride = p.state === RIDE;
        const pit = p.bpitch - (ride ? 0.08 : sitting ? 0.25 : dk >= 0 ? 0.3 : 0.06);
        this._add(ride ? 'rider' : 'prone', p.bx, p.by, p.bz, p.byaw, pit, p.broll, p.phase, p.scale, ride ? 0 : sitting ? 0.25 : dk >= 0 ? 0 : 1.0, paint, false, lk, wat);
        if (!OLD_BOARD) this._add(bh.type, p.bx, p.by, p.bz, p.byaw, pit, p.broll, p.phase, p.scale, 0, paint, false, 0, wat);
      }
      // <<< SURFBOARDS
    }

    // >>> SURFER
    const me = this.player, F = this.fig, P = this._prep;
    let figAt = null;
    if (me && F) {
      // PEOPLE: posed in prepare(); the board goes in with the line-up's boards, painted and capped.
      const b = P.board;
      // BOARDS: on the hull and in the paint the level picked (setPlayerBoard); today's by default.
      if (b) this._add((this._pHull || FOAMIE).type, b[0], b[1], b[2], b[3], b[4], b[5], 0.7, 1, 0, this._pPaint || PLAYER_BOARD, true);
      figAt = P.fig;
      // >>> SURFBOARDS  Through the rider's own eyes (src/surfer/pov-cam.js puts the lens in this head),
      // going off, under and coming up in a wipeout the body tumbles and turns round the lens itself,
      // and what is in view is limbs cut open by the near plane (or, turning, the back of their own
      // head) - so from its own eyes it is not drawn until they are up and reaching for the board.
      if (figAt && me.state === 3 && F.fig.rig && F.fig.rig.phase <= 2) {
        const E = F.fig.eyes(), c = rotPoint(E.c, figAt[3], figAt[4], figAt[5]);
        if (Math.hypot(figAt[0] + c[0] - cam.x, figAt[1] + c[1] - cam.y, figAt[2] + c[2] - cam.z) < 0.7) figAt = null;
      }
      // <<< SURFBOARDS
    } else if (me) {
      // No figure (its build failed): the line-up's own figures, as before.
      if (me.state === 2) this._add('rider', me.x, me.yDraw, me.z, me.heading, me.pitch, me.roll, 0.7, 1, 0, null, false, lookCode(this.playerLook));
      else this._add('prone', me.x, me.yDraw, me.z, me.heading, me.pitch, me.roll, 0.7, 1, me.stroke, null, false, lookCode(this.playerLook));
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
    // >>> PEOPLE
    // waterAt0: a same-instant A/B handle for tools - the player's water back at world y 0, as before.
    if (this.u.uWater) { const Wp = this.waterAt0 ? [0, 0, 0, 1] : this._water; gl.uniform4f(this.u.uWater, Wp[0], Wp[1], Wp[2], Wp[3]); }
    gl.bindBufferBase(gl.UNIFORM_BUFFER, LOOKS_BINDING, this.looksBuf);
    // <<< PEOPLE
    // >>> BOARDS  the leash's floor (leashR): a pixel's size in the world per metre away. The frame is
    // drawn at the canvas's size (renderer.js: post.begin(canvas.width, canvas.height)); the view's
    // vertical focal scale is the length of the view-projection's second row (a rotation times P11).
    // Kept for prepare() too, which skins the player's figure before this runs (a frame late there).
    { const P11 = Math.sqrt(vp[1] * vp[1] + vp[5] * vp[5] + vp[9] * vp[9]), Hpx = gl.drawingBufferHeight || 0;
      this._pxK = P11 > 0 && Hpx > 0 ? 2 / (P11 * Hpx) : 0; }
    // prepare() skinned the player with the last frame's pixel size: where the lens or the canvas has
    // changed since (a cut to another camera), the cord is laid again and the buffer sent again - once.
    // Only when that changes what is drawn - its own cord, a thicker one, none - or the thickness by
    // more than a fifth: a lens zooming through a blend changes it a little every frame, and a floor a
    // few per cent off is not worth re-skinning the body for (0.4-0.8 ms, 280 KB) frame after frame.
    if (P && P.ok && P.leashAt && F && !OLD_BOARD) {
      const lr = this.leashR(P.leashAt[0], P.leashAt[1], P.leashAt[2], cam, 1), was = P.leash;
      if (typeof lr === 'number' && typeof was === 'number' ? Math.abs(lr - was) > 0.2 * lr : lr !== was) {
        P.leash = lr;
        // GPUSKIN: on the GPU the cord is twelve numbers in the bones - the 704 bytes again, not the body
        if (this._gpu) { F.fig.bones(lr, this._sbPd, 0); gl.bindBuffer(gl.UNIFORM_BUFFER, this._sbP); gl.bufferSubData(gl.UNIFORM_BUFFER, 0, this._sbPd); }
        else { F.fig.write(lr); gl.bindBuffer(gl.ARRAY_BUFFER, F.vbo); gl.bufferSubData(gl.ARRAY_BUFFER, 0, F.fig.data); }
      }
    }
    // <<< BOARDS
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);
    gl.disable(gl.CULL_FACE);
    let draws = 0, tris = 0, instances = 0;
    // BOARDS: the four board draws' instances, in one upload - up to the last one in use
    if (this._bi) {
      let end = 0;
      for (const name in this.types) { const t = this.types[name]; if (t.shared >= 0 && t.n) end = Math.max(end, t.shared + t.n); }
      if (end) { gl.bindBuffer(gl.ARRAY_BUFFER, this._bi.buf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, this._bi.arr, 0, end * INST_FLOATS); }
    }
    for (const name in this.types) {
      const t = this.types[name];
      if (!t.n) continue;
      if (!(t.shared >= 0)) {
        gl.bindBuffer(gl.ARRAY_BUFFER, t.ibo);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, t.inst, 0, t.n * INST_FLOATS);
      }
      gl.bindVertexArray(t.vao);
      gl.drawElementsInstanced(gl.TRIANGLES, t.count, gl.UNSIGNED_SHORT, 0, t.n);
      draws++; tris += t.tris * t.n; instances += t.n;
    }
    // >>> SURFER
    // GPUSKIN: the figures (the player's and the line-up's) draw with the skinned program, set up once.
    let skinOn = false;
    if (figAt) {
      // PEOPLE: the skinned body went up in prepare(). GPUSKIN: its bones did.
      if (this._gpu) { this._useSkin(cam, vp, sunDir, exposure, time, shadow); skinOn = true; gl.bindBufferBase(gl.UNIFORM_BUFFER, BONES_BINDING, this._sbP); }
      const a = F.inst;
      a[0] = figAt[0]; a[1] = figAt[1]; a[2] = figAt[2]; a[3] = figAt[3];
      a[4] = figAt[4]; a[5] = figAt[5]; a[6] = 0.7; a[7] = 1; a[8] = 0;
      a[9] = 19; a[10] = 0; a[11] = 0;   // SURFBOARDS: no paint, capped (the first-person view cuts the body too)
      // PEOPLE: the player's look (the level's playerLook) - only on a mesh that carries material ids.
      const L = this._figIds ? this.playerLook : null;
      if (L) {
        const ci = (v, n) => Math.max(0, Math.min(n - 1, v | 0));
        a[10] = ci(L.suit, SUIT_LOOKS.length);
        a[11] = ci(L.skin, SKIN_TONES.length) * 8 + ci(L.hair, HAIR_COLS.length) + 64 * (L.hood === true ? 1 : L.hood === false ? 2 : 0);
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, F.ibo);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, a);
      gl.bindVertexArray(F.vao);
      gl.drawElementsInstanced(gl.TRIANGLES, F.count, gl.UNSIGNED_SHORT, 0, 1);
      draws++; tris += F.fig.tris; instances++;
    }
    // <<< SURFER
    // >>> SURFBOARDS  the nearest line-up surfers, jointed: one draw slot each.
    // GPUSKIN: on the GPU, ONE instanced draw for them all - each figure's 704 bytes of bones into the
    // SurfBones buffer (gl_InstanceID picks them) and its 48 bytes of instance, sent in one go each.
    const nFd = this._nFd;
    if (this._gpu && nFd) {
      const G = this._gn, a = G.inst, D = this._sbNd;
      for (let i = 0; i < nFd; i++) {
        const R = this._fd[i], at = R.at, W = R.W, who = R.who, o = i * INST_FLOATS;
        R.F.bones(R.leash && this.leashR(at[0], at[1], at[2], cam, at[6]), D, i * FIG_SB * 4);   // BOARDS: the pixel floor
        a[o] = at[0]; a[o + 1] = at[1]; a[o + 2] = at[2]; a[o + 3] = at[3]; a[o + 4] = at[4]; a[o + 5] = at[5];
        // PEOPLE: the water they are in (height, slope) and their look (on a mesh with ids)
        a[o + 6] = 1000 + W[0]; a[o + 7] = at[6]; a[o + 8] = packSlope(W[1], W[2]); a[o + 9] = 9; a[o + 10] = 0; a[o + 11] = 0;
        if (this._npcIds && who.look) { a[o + 10] = who.look.suit; a[o + 11] = who.look.skin * 8 + who.look.hair; }
      }
      if (!skinOn) { this._useSkin(cam, vp, sunDir, exposure, time, shadow); skinOn = true; }
      gl.bindBuffer(gl.UNIFORM_BUFFER, this._sbN); gl.bufferSubData(gl.UNIFORM_BUFFER, 0, D, 0, nFd * FIG_SB * 4);
      gl.bindBufferBase(gl.UNIFORM_BUFFER, BONES_BINDING, this._sbN);
      gl.bindBuffer(gl.ARRAY_BUFFER, G.ibo); gl.bufferSubData(gl.ARRAY_BUFFER, 0, a, 0, nFd * INST_FLOATS);
      gl.bindVertexArray(G.vao);
      gl.drawElementsInstanced(gl.TRIANGLES, G.count, gl.UNSIGNED_SHORT, 0, nFd);
      draws++; tris += G.tris * nFd; instances += nFd;
    }
    for (let i = 0; !this._gpu && i < nFd; i++) {
      const R = this._fd[i], NF = R.F, at = R.at, leash = R.leash, who = R.who, W = R.W, slot = this.npc[i];
      NF.write(leash && this.leashR(at[0], at[1], at[2], cam, at[6]), slot.data);   // BOARDS: the pixel floor
      gl.bindBuffer(gl.ARRAY_BUFFER, slot.vbo);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, slot.data);
      const a = slot.inst;
      a[0] = at[0]; a[1] = at[1]; a[2] = at[2]; a[3] = at[3]; a[4] = at[4]; a[5] = at[5];
      a[6] = 0.7; a[7] = at[6]; a[8] = 0; a[9] = 9; a[10] = 0; a[11] = 0;
      // >>> PEOPLE  the water they are in (height, slope) and their look (on a mesh with ids).
      a[6] = 1000 + W[0]; a[8] = packSlope(W[1], W[2]);
      if (this._npcIds && who.look) { a[10] = who.look.suit; a[11] = who.look.skin * 8 + who.look.hair; }
      // <<< PEOPLE
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
