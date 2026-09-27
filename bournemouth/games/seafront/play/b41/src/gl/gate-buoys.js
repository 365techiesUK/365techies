// THE CHANNEL MARKING on the Harbour Mouth gate line (tr169).
//
// WHAT THIS IS. The corsair level's objective is a LINE - raid/gate.js's half-plane through
// the Old Harry stacks on bearing 330 - and until now nothing in the world drew it. The player
// was asked to hold a boundary they could not see. This module floats the marking: twelve
// buoys across the channel the corsairs actually aim for, two taller gateposts at its edges,
// and four sparse outer marks that say the boundary does not stop there.
//
// ---------------------------------------------------------------------------------------
// ⚠️ THE TRAP THIS MODULE EXISTS TO NOT FALL INTO
//
// A row of buoys is a lie about this rule unless it is built carefully. The gate is a
// HALF-PLANE: gateRun(x, z) > 0 is through, at ANY offset along the line, for ever, in both
// directions. A row of twelve buoys reads as a FENCE WITH TWO ENDS, and a player who reads it
// that way will believe a corsair rounding the last buoy has not scored. She has.
//
// So the marking is built to state the rule it is actually marking, and it does that in three
// parts, each of which is true of the level and not decoration:
//
//   1. THE CHANNEL, offsets 120 -> 380. That is not a chosen span: it is TUNING.gate.aimOff
//      exactly - the band a corsair picks her crossing lane inside and nowhere else. So the
//      twelve buoys are a truthful map of where the fight happens, not of where the rule
//      stops.
//   2. THE GATEPOSTS, offsets 100 and 400. Twice the height, a different silhouette, and
//      plainly a different object, so the twelve read as the passage BETWEEN two posts rather
//      than as a fence that ran out of buoys. A doorway implies a wall you cannot see; a
//      fence end implies open ground.
//   3. THE OUTER MARKS, offsets 470, 570, 690, 830 - seaward only, smaller, and spaced at
//      growing intervals (70, 100, 120, 140 m). A marking that stops abruptly reads as a
//      terminus; one that thins out reads as continuing past what you can see, which is what
//      the half-plane does. They run SEAWARD ONLY because the inner flank genuinely is closed:
//      at offset 40 the line passes 5.1 m from the chalk and at offset 0 it is inside the
//      stack group (measured off raid/gate.js's own survey field, not assumed). There is no
//      way round that end, so nothing is marked there.
//
// It is still not a perfect statement of an infinite line - no finite thing is - and the
// honest limit is recorded here rather than glossed: a player who sails 900 m out along the
// channel finds no more marks, and only the rules will tell them the line is still under them.
//
// ---------------------------------------------------------------------------------------
// NO LETTERING, NO NUMBERING, NO AUTHORITY'S MARK SCHEME
//
// There is no text on any of this and this model has no text renderer. There is no number on a
// buoy, no name, no emblem and no third-party mark of any kind. The colours below are ONE
// signal orange plus one dark slate spar, which is deliberately NOT a lateral pair (no
// red/green port and starboard) and NOT a cardinal scheme (no yellow-and-black bands, no
// double-cone topmarks, no banding pattern of any kind), and is not any real navigation
// authority's livery. A player must not be able to mistake this
// for a chart mark, because it is not one: it is this game's own marking of this game's own
// rule.
//
// TWO COLOURS, AND THE SILHOUETTES DO THE WORK. Orange floats read against the sea; a dark
// slate spar reads against the sky, which a pale one does not at this latitude of grey. A
// gatepost is orange drum -> dark spar -> WIDE ORANGE COLLAR (a dumbbell); a channel buoy is
// small orange drum -> short dark mast -> SMALL ORANGE CONE (a pin). Those two silhouettes are
// distinguishable at 240 m in a 405 px frame, which is what makes the posts read as posts
// rather than as the last two buoys.
//
// ---------------------------------------------------------------------------------------
// >>> CLEANUP
// THIS FILE IS NOW THE ONE DEFINITION OF THE GATE LINE. (tmp-tr174)
//
// It used to carry a SECOND copy of raid/gate.js's line, and a note explaining why: gate.js
// imports COAST from coast.js, coast.js imports this file, so importing gate.js from here
// would leave gate.js's module-level `const OX = -COAST.startX` reading undefined. That
// reasoning was right, and the note's own conclusion was right too - the clean fix runs the
// OTHER way, because this file is nearly a leaf. tmp-tr169 declined to make it only because
// gate.js was not that builder's to touch. It is this one's, so it is made.
//
// raid/gate.js now imports GATE_LINE from here and builds its sim-world GATE out of it. THE
// CYCLE QUESTION IS SETTLED BY MEASUREMENT, not by argument: gate.js's transitive import set
// already contained this file (gate.js -> gl/coast.js -> gl/gate-buoys.js), so the direct
// import adds no module to the graph at all, and nothing in this file's own subtree
// (arena-oldharry.js -> arena-oldharry-data.js) reaches back to gate.js or coast.js.
//
// The duplication was never wrong - tmp-tr169 checked it to 1e-9 m for all 18 marks - it was
// two things that had to be edited together. It stopped being merely latent the moment the
// vectors below were normalised (see the next block): one copy would have moved and the other
// would not.
//
// ⚠️ ONE LINE, TWO FRAMES. This module is the COAST frame (origin Bournemouth Pier root, +X
// bearing 079, +Z bearing 169). raid/gate.js's GATE is the SIM WORLD frame, which is the same
// axes shifted by (-COAST.startX, -COAST.startZ). The anchor is therefore `ax`/`az` here and
// `ax + OX`/`az + OZ` there; the direction vectors are frame-independent and are shared as-is.
//
// THE VECTORS ARE DERIVED, NOT TRANSCRIBED. They used to be cos/sin(251 deg) hand-rounded to
// five decimals, which made the pair 1.948 ppm long (|n| = 1.000001947648103) in both copies.
// Deriving them from the bearing makes them unit and perpendicular by construction, so neither
// the length nor the right angle can be lost to a re-rounding.
import { ARENA_ON, ARENA_PAL } from './arena-oldharry.js';

export const GATE_BEARING = 330;                   // into Studland Bay, toward the harbour mouth
const _th = (GATE_BEARING - 79) * Math.PI / 180;   // coast +X is bearing 079
const _nx = Math.cos(_th), _nz = Math.sin(_th);

// THE LINE, in the COAST frame.
export const GATE_LINE = {
  ax: -4845, az: 7371,                  // the Old Harry stack group, from the LIDAR
  nx: _nx, nz: _nz,                     // the way the corsairs are going (bearing 330)
  dx: -_nz, dz: _nx,                    // along the line, seaward (bearing 060)
};
// <<< CLEANUP

// A point ON the line at channel offset `off`, in the COAST frame.
export const markAt = (off) => [GATE_LINE.ax + GATE_LINE.dx * off,
  GATE_LINE.az + GATE_LINE.dz * off];

// ---------------------------------------------------------------------------------------
// THE LAYOUT. Every number here is either a measured fact about the level or a stated choice.
//
// CHANNEL: TUNING.gate.aimOff verbatim. Twelve marks makes the spacing 23.64 m, which is the
// number that decides whether the line reads as a line: at 240 m - the far end of the player's
// view of it from their entry point - 23.6 m subtends 5.6 deg, so consecutive buoys are well
// clear of each other and the eye joins them up. Half as many and it reads as scattered floats.
export const CHANNEL = { off0: 120, off1: 380, n: 12 };
// The gateposts sit 20 m OUTSIDE the aim band, so a corsair crossing at the extreme of her
// allowed lane still crosses INSIDE the posts and the marking never contradicts the rules.
export const POSTS = [100, 400];
// Seaward continuation, at growing gaps. Not a second fence: a fade.
export const OUTER = [470, 570, 690, 830];

// ---------------------------------------------------------------------------------------
// SIZES, in metres above and below the still-water plane (y = 0).
// >>> CLEANUP
// tmp-tr174: this paragraph used to justify the static floats by saying shaders.js's shoreline
// term clamps out of range at this arena and that arena-oldharry.js records it as a known
// wrong. BOTH HALVES ARE NOW FALSE. tmp-tr147 gave the arena its own signed distance field to
// the surveyed waterline, so the shoreline no longer clamps here - `EFOIL_ARENA=oldharry node
// tools/sea-check.mjs` is 32/32 on this tree, and of 1004 samples 3-60 m offshore 432 are
// breaking - and arena-oldharry.js's warning was corrected in the same pass as this one.
//
// THE MARKS STILL DO NOT BOB, and that part of the note stands. It was never the shoreline's
// doing: these floats are baked into the coast mesh at page load, with no per-frame vertex
// path to ride a wave on, which is the same structural reason tmp-tr172 recorded for buoy
// bobbing being out of reach. A moored mark in a real swell moves and this one does not; that
// is a stated limitation, but the reason for it is the mesh, not the sea.
// <<< CLEANUP
const BUOY = { r: 1.10, y0: -0.70, y1: 1.30, mastR: 0.18, mastTop: 3.00, coneR: 0.45, coneTop: 3.80 };
const POST = { r: 1.70, y0: -0.90, y1: 1.80, sparR: 0.30, sparTop: 7.20,
  collarR: 1.15, collarTop: 7.90 };
const OUTM = { r: 1.00, y0: -0.60, y1: 1.40, mastR: 0.16, mastTop: 2.80 };

// >>> BUOYS
// ---------------------------------------------------------------------------------------
// THE COLLISION FOOTPRINT (tr171). Geometry only - the RESPONSE lives in
// raid/buoy-collide.js, because what a mark feels like is a rule and rules do not belong in
// the mesh. What is here is the one thing both files must agree about: how big each mark is
// to the touch, and it lives beside the drum radii above so the two cannot drift apart.
//
// ⚠️ THE SOLID RADIUS IS NOT THE DRUM RADIUS, AND THE TWO CLASSES DISAGREE IN OPPOSITE
// DIRECTIONS. That asymmetry IS the design, and stating it is cheaper than discovering it:
//
//   pin    solid 0.80 m inside a 1.10 m drum   - 0.30 m of forgiveness. You can clip the
//          visible float and be told about it without being stopped by it: the brush reads as
//          a brush. A marker that is solid to its last visible pixel is a bollard.
//   outer  solid 0.75 m inside a 1.00 m drum   - the same bargain, same reason.
//   post   solid 1.90 m around a 1.70 m drum   - 0.20 m of ground tackle. A gatepost is MORE
//          than it looks, which is the correct lie for the one object here that is meant to
//          stop you. It is also the only pair of marks that breaks the horizon, so a player
//          has already been told it is a different kind of thing before they touch it.
//
// Heights are not modelled. Every mark is a full-depth vertical cylinder: the craft in this
// game ride on the surface, a foil that clears a buoy by jumping it is not a mechanic anyone
// asked for, and pretending to a height would be pretending to a precision the sea plane here
// does not have (these floats are static - see the SIZES note above).
export const MARK_R = { pin: 0.80, outer: 0.75, post: 1.90 };

// Every mark, in one list, in the order they are built above: 12 pins, 2 posts, 4 outer.
// `off` is the channel coordinate, so raid/buoy-collide.js can put each one in the world with
// raid/gate.js's OWN gateAt() and there is no second copy of the line arithmetic anywhere.
// The id is a STRING on purpose - raid.js gives ships numeric ids from a counter, so a buoy id
// can never be mistaken for a ship by raid.js `_contact`, which looks its contacts up by id
// and silently ignores one it cannot find. That is what keeps a buoy from scoring a ram.
export function markList() {
  const out = [];
  const step = (CHANNEL.off1 - CHANNEL.off0) / (CHANNEL.n - 1);
  for (let k = 0; k < CHANNEL.n; k++) out.push({ id: `bp${k}`, off: CHANNEL.off0 + k * step, kind: 'pin' });
  POSTS.forEach((off, k) => out.push({ id: `bP${k}`, off, kind: 'post' }));
  OUTER.forEach((off, k) => out.push({ id: `bo${k}`, off, kind: 'outer' }));
  return out;
}

// The middle of the water BETWEEN two neighbouring channel buoys, for the offset nearest
// `off`. Nothing in this project calls it yet. It exists because the ships decision in
// tr171/RESULT.md turns on it: raid/gate.js's `_gateLane` picks a corsair's crossing lane
// anywhere in TUNING.gate.aimOff, so she can and does aim at a point a buoy is standing on,
// and a hull sailing through a mark is the one visual cost of letting ships pass through.
// Snapping the chosen lane to the nearest gap would cost one line in `_gateLane`, is far
// inside `laneJitter` (260 m) so it cannot change the difficulty the 16-seed sweep measured,
// and would make every crossing thread the line instead of walking over it.
// ⚠️ gate.js was not this builder's to edit. The seam is offered, not taken.
export function gateGapCentre(off) {
  const step = (CHANNEL.off1 - CHANNEL.off0) / (CHANNEL.n - 1);
  const k = Math.round((off - CHANNEL.off0) / step - 0.5);
  return CHANNEL.off0 + (k + 0.5) * step;
}
// <<< BUOYS

// ---------------------------------------------------------------------------------------
// PRIMITIVES. Deliberately local and deliberately small: ColourMesh.ctube() has no end caps
// and MeshBuilder.tube() calls push() rather than pushC(), which silently desynchronises the
// colour array (coast.js says so in ctube's own header). These push through pushC only.

// A vertical prism with smooth radial normals and an optional flat top cap. The bottom is left
// open on purpose - it is under water and a cap there is triangles nobody will ever see.
function prism(m, cx, cz, y0, y1, r, seg, col, mat, cap) {
  const low = [], high = [];
  for (let k = 0; k < seg; k++) {
    const a = (k / seg) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    low.push(m.pushC(cx + c * r, y0, cz + s * r, c, 0, s, col, mat));
    high.push(m.pushC(cx + c * r, y1, cz + s * r, c, 0, s, col, mat));
  }
  for (let k = 0; k < seg; k++) {
    const k2 = (k + 1) % seg;
    m.quad(low[k], low[k2], high[k2], high[k]);
  }
  if (!cap) return;
  const top = [];
  for (let k = 0; k < seg; k++) {
    const a = (k / seg) * Math.PI * 2;
    top.push(m.pushC(cx + Math.cos(a) * r, y1, cz + Math.sin(a) * r, 0, 1, 0, col, mat));
  }
  for (let k = 1; k + 1 < seg; k++) m.tri(top[0], top[k], top[k + 1]);
}

// A cone standing on a ring. The topmark, and it is also what caps the mast.
function cone(m, cx, cz, y0, y1, r, seg, col, mat) {
  const h = y1 - y0, sl = Math.hypot(r, h) || 1;
  const ring = [];
  for (let k = 0; k < seg; k++) {
    const a = (k / seg) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    ring.push(m.pushC(cx + c * r, y0, cz + s * r, c * h / sl, r / sl, s * h / sl, col, mat));
  }
  const apex = m.pushC(cx, y1, cz, 0, 1, 0, col, mat);
  for (let k = 0; k < seg; k++) m.tri(ring[k], ring[(k + 1) % seg], apex);
}

// ---------------------------------------------------------------------------------------
// THE THREE KINDS OF MARK.

function channelBuoy(m, x, z, MAT) {
  const O = ARENA_PAL.markOrange, S = ARENA_PAL.markSpar;
  prism(m, x, z, BUOY.y0, BUOY.y1, BUOY.r, 6, O, MAT.PAINTED, true);
  prism(m, x, z, BUOY.y1, BUOY.mastTop, BUOY.mastR, 4, S, MAT.PAINTED, false);
  cone(m, x, z, BUOY.mastTop, BUOY.coneTop, BUOY.coneR, 4, O, MAT.PAINTED);
}

// The gatepost. Twice the buoy's height and two-tone, so the pair brackets the channel and
// reads as a doorway rather than as the last two buoys of a fence.
function gatePost(m, x, z, MAT) {
  const O = ARENA_PAL.markOrange, S = ARENA_PAL.markSpar;
  prism(m, x, z, POST.y0, POST.y1, POST.r, 6, O, MAT.PAINTED, true);
  prism(m, x, z, POST.y1, POST.sparTop, POST.sparR, 6, S, MAT.PAINTED, false);
  prism(m, x, z, POST.sparTop, POST.collarTop, POST.collarR, 6, O, MAT.PAINTED, true);
}

// The outer mark. Same family, visibly smaller, no topmark: "the line is still here, and it is
// thinning out, not stopping".
function outerMark(m, x, z, MAT) {
  const O = ARENA_PAL.markOrange, S = ARENA_PAL.markSpar;
  prism(m, x, z, OUTM.y0, OUTM.y1, OUTM.r, 6, O, MAT.PAINTED, true);
  prism(m, x, z, OUTM.y1, OUTM.mastTop, OUTM.mastR, 4, S, MAT.PAINTED, false);
}

// ---------------------------------------------------------------------------------------
// THE MARKING.
//
// m      a ColourMesh (coast.js). MAT is passed in rather than imported, exactly as
//        arena-oldharry.js does it, so this file never has to track coast.js's material table.
// OX/OZ  the coast -> world translation every other builder is handed.
//
// Returns { tris, verts, marks } or null when the arena flag is off - which is why the 19
// judged views, the census and every gate on the Bournemouth world are untouched by this file.
// >>> CLEANUP
// tmp-tr174: WHERE THE MARKING LIVES IN THE INDEX BUFFER, so the hull obstacle grid can leave
// it alone. Index-buffer half-open ranges [start, end), the same shape and the same purpose as
// pier.js's RAID_RANGES, which the raid already uses to address a slice of this one mesh.
//
// WHY THIS EXISTS. boats/obstacles.js rasterises EVERY non-sand coast triangle between
// y -1.2 and +2.2 m into the player's blocked grid. This file appends the marking to that same
// coast mesh, so the eighteen marks silently became hard walls - 17 blocked cells across the
// gate approach - while the corsairs, who never read that grid, sailed through untouched. It
// was a pure tax on the player and it is measured in tmp-tr174/RESULT.md item 8.
//
// ⚠️ THIS IS NOT THE BUOY COLLISION AND MUST NOT BE CONFUSED WITH IT. raid/buoy-collide.js
// gives a mark a DELIBERATE, calibrated knock - about 9 m of ground off a pin, a solid stop off
// a gatepost - which the owner asked for and which is correct. That is keyed to markList() and
// is untouched by any of this. What the range below removes is the SECOND, unintended
// collision the coast rasteriser inferred from the mesh. After this, hitting a mark still
// knocks you; it is no longer a wall.
//
// A RANGE RATHER THAN A COORDINATE BOX, on purpose: it is recorded from where the geometry
// actually lands, so it follows the marks if anyone moves them. A box would not.
// MAT would have been better still, but every mark is MAT.PAINTED, which pier railings and the
// arena's own chalk also use, and the material table lives in coast.js - another builder's file
// this round.
export const MARK_INDEX_RANGES = [];
// <<< CLEANUP

export function buildGateBuoys(m, C, MAT, OX, OZ) {
  // >>> CLEANUP
  // Cleared on every build so a second buildCoast() cannot leave a stale range behind.
  MARK_INDEX_RANGES.length = 0;
  // <<< CLEANUP
  if (!ARENA_ON) return null;
  const v0 = m.vertexCount, i0 = m.i.length;

  const step = (CHANNEL.off1 - CHANNEL.off0) / (CHANNEL.n - 1);
  let marks = 0;
  for (let k = 0; k < CHANNEL.n; k++) {
    const [x, z] = markAt(CHANNEL.off0 + k * step);
    channelBuoy(m, x + OX, z + OZ, MAT); marks++;
  }
  for (const off of POSTS) {
    const [x, z] = markAt(off);
    gatePost(m, x + OX, z + OZ, MAT); marks++;
  }
  for (const off of OUTER) {
    const [x, z] = markAt(off);
    outerMark(m, x + OX, z + OZ, MAT); marks++;
  }

  // >>> CLEANUP
  // Recorded AFTER the marks are emitted and before anything else touches the mesh. Nothing
  // built later reorders indices outside its own slice (coast.js says so where it reorders,
  // and the ramps fence is appended last precisely to keep earlier offsets valid), so this
  // range still addresses the marking when obstacles.js reads it. Asserted, not assumed:
  // test coverage in tmp-tr174/cleanup/work/item8_verify.mjs checks every triangle in the
  // range is within a mark's radius of a mark centre, and that none outside it is.
  if (m.i.length > i0) MARK_INDEX_RANGES.push([i0, m.i.length]);
  // <<< CLEANUP

  return { tris: (m.i.length - i0) / 3, verts: m.vertexCount - v0, marks,
    indices: [i0, m.i.length], spacing: step };
}
