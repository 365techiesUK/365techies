// OLD HARRY ROCKS / HANDFAST POINT - the corsair arena's landform.
//
// WHAT THIS IS. A second arena for the corsair level: the chalk headland at
// Handfast Point (50.6427, -1.9247), its detached stack group, the cliff line
// south to Ballard Point, Ballard Down rising behind, and the Studland Bay
// shore running north toward the Poole Harbour mouth. It is built in the SAME
// coast frame as everything else (origin Bournemouth Pier root, +X bearing 079,
// +Z bearing 169), at its TRUE offset - about 8.7 km on bearing 205 - so every
// bearing, distance and haze value in the scene stays correct by construction
// and nothing has to be re-based. tmp-tr138/ARCH.md sets out why.
//
// IT IS OFF BY DEFAULT. Nothing here runs, and nothing is allocated, unless the
// flag below is set. With the flag off the coast mesh is bit-identical to the
// Bournemouth world, which is the gate this was built against.
//
// ---------------------------------------------------------------------------
// WHERE THE NUMBERS COME FROM, and it is one source, not a sheet
//
// ⚠️ The owner's photographic reference for this place is thin and partly not
// his. tmp-tr124's audit found the two good Old Harry videos have NO originals
// on any drive and carry a third-party promo line, and there is a watermarked
// agency photograph in the library in 25 copies. NONE of that was used here.
//
// The landform is EA LIDAR Composite DSM, 1 m, last return, fetched 2026-09-18
// with the owner's explicit approval for this area - see tmp-tr138/RESULT.md
// for the endpoint, the eight bounding boxes and the byte counts. It is baked
// into arena-oldharry-data.js as decimetres above ODN. The plan shape of the
// coast is therefore MEASURED, not traced from a map and not recalled: the
// waterline below is the +0.6 m ODN contour of that survey, interpolated
// between grid nodes.
//
// The LIDAR corrected the project's own sheet in three places, which is the
// whole value of having fetched it (tmp-tr138/RESULT.md section 3):
//   * the sheet's lat/lon for "Old Harry / Foreland tip" is 60 m out - it lands
//     in water, reading -0.69 m ODN.
//   * the sheet's "Handfast Point cliff top ~23 m" measures 34.3 m there, and
//     the headland reaches 87.5 m.
//   * the sheet's "Ballard Point 98 m" lat/lon also lands in water.
// Sheet positions are gazetteer recall; these are a survey. The survey wins.
//
// ---------------------------------------------------------------------------
// ⚠️ TRAP 5 - CHALK TONE IS UNSOURCED, AND SAYING SO IS THE POINT
//
// This project's founding error was rendering Bournemouth's cliffs white when
// they are yellow-brown Eocene sand. Old Harry genuinely IS chalk, so white is
// right here - which is exactly why it had to be measured rather than assumed.
//
// It could not be. The ONE overcast owner frame that contains Old Harry is
// bournemouth-reference/old-harry-studland/919624356835669.jpg, shot from
// Branksome at 7.18 km. Measured in it (tmp-tr138/RESULT.md section 4), the
// brightest pixel of the stack band across 22 columns averages (225.3, 231.5,
// 227.8) against sky 30-50 px above it at (234.0, 236.3, 228.4) - a residual
// contrast of -3.7% R, -2.0% G, -0.2% B. Koschmieder's liminal threshold is 2%.
// The object is AT AIRLIGHT. There is no chalk in those pixels, only sky.
// So: the tone is UNSOURCED and is declared so.
//
// WHAT WAS PICKED INSTEAD, and why it is defensible rather than invented:
// CHALK below is coast-far.js's own '#C8C6BE', unchanged. That value is already
// in this model for the Purbeck band, and coast-far.js's header states it does
// not pre-blend toward airlight - so it is meant as an ALBEDO and carries over
// to close range correctly. Three independent in-project anchors agree that
// this is the right neighbourhood and that pure white is not:
//   foam        160-182 sRGB   reference/palette.md ("never white")
//   CHALK       200 198 190    coast-far.js - between them
//   pierWhite   235 226 222    coast.js, white PAINT, brighter than rock
// Chalk sits above foam and below white paint, which is the ordering any
// photograph of this coast shows.
//
// ⚠️ REVISIT WHEN THE ORIGINALS SURFACE. The owner says the original Old Harry
// clips exist somewhere. Every colour used here is in the PALETTE block below
// and nowhere else, so tone can be re-measured and changed without touching one
// line of geometry.
//
// MATERIALS: chalk and turf are MAT.PAINTED - i.e. UNTEXTURED. MAT.CLIFF would
// paint craft.js's Bournemouth sandstone texture (texMean 0.699, 0.474, 0.151 -
// a warm brown) onto white chalk, which is the founding error running backwards.
// There is no chalk texture in this project and none was invented. Only the
// Studland beach, which really is sand, takes MAT.SAND.
//
// ---------------------------------------------------------------------------
// >>> CLEANUP
// THE WATER HERE IS A SIGNED DISTANCE FIELD, AND IT IS CORRECT.
//
// ⚠️ Until 20 Sep 2026 this block was a standing warning that the sea at this
// arena was broken and could not be repaired from this file. That was true
// when it was written and has NOT been true since tmp-tr147 (18 Sep 2026).
// It is corrected here rather than deleted, because the reason it was once
// true is worth keeping and because a comment that contradicts its own code is
// how three of this project's defects stayed hidden - `hull.js:30` claimed the
// heave springs were one-sided when they were not. The old wording is
// deliberately not quoted: on this project, prose that repeats a removed string
// puts the string back, and anyone grepping to check this defect is gone should
// find nothing rather than find this paragraph.
//
// WHAT WAS ACTUALLY WRONG. shaders.js baked Bournemouth's mean-high-water table
// and COAST_Z0 into GLSL as compile-time constants, and its shoreline was
// `shoreD = z - (mhw(x) - Z0)` - a function of X alone with the sea at +Z. At
// this arena that clamped out of range and returned about 7,330 m of offshore
// distance: deep open water right up to the chalk, no surf, no break, no bar.
//
// WHAT CHANGED, AND WHEN. tmp-tr147 (18 Sep 2026) replaced it, for this arena
// only, with a signed distance field to the surveyed waterline - src/sea-shore.js
// packed into the water shader's existing `Waves` uniform block and decoded by
// the GPU and by the CPU sampler out of the SAME quantised array, so the two
// cannot drift. shaders.js now emits one of two shoreline templates
// (`shoreVertChunk` / `shoreFragChunk`, gated on `SHORE_ON`), and with the flag
// off each emits the exact text that was inline before - which is how
// Bournemouth stayed bit-identical across that change. Measured at the time:
// -1.7 m at the stack group's centre, +9.2 m thirty metres east of it.
//
// WHAT IS TRUE TODAY - re-run on this tree on 20 Sep 2026, not quoted from a
// report. `EFOIL_ARENA=oldharry node tools/sea-check.mjs` is 32/32 ALL PASSED,
// and four of those checks are precisely the clauses the old warning asserted:
//   * the live shore model matches the arena flag - an arena signed-distance
//     field, 88x87 over 3465x3560 m (39.8x41.4 m cells), 3828 floats packed 2:1;
//   * the arena shoreline faces the sea on more than one side - 1268 shore
//     normals spanning 348.4 deg of the compass;
//   * the shoreline in force actually breaks - of 1004 samples 3-60 m offshore,
//     432 (43%) are breaking and 730 (73%) carry foam, and ZERO of them still
//     read the old open-water distance;
//   * GLSL shore field == CPU shore field - worst distance delta 2.4e-12 m.
// So there IS surf here, there IS a break, and it is this headland's own rather
// than Bournemouth's painted onto Purbeck.
//
// ⚠️ THE ONE PART OF THE OLD WARNING THAT STILL STANDS. Do not "fix" anything
// here by rotating the arena to line up with the +Z convention. Handfast Point
// has sea on BOTH sides and a headland is not expressible as mhw(x) at any
// rotation - which is exactly why the fix was a distance field and not a
// rotation. tmp-tr138/ARCH.md section 3 set that out before tmp-tr147 existed.
// <<< CLEANUP
//
// NO NATIONS AND NO LETTERING. The attackers are corsairs. There is no flag,
// emblem, name or national colour anywhere in this file, and no text: this
// model has no text renderer and none was added.

import { ARENA_GRID, ARENA_STACKS } from './arena-oldharry-data.js';

// ---------------------------------------------------------------------------
// THE FLAG. Guarded on `typeof` exactly as coast-far.js:73 guards ?cdbg=nofar,
// and it reads BOTH the URL and the environment so that:
//   * in a browser, ?arena=oldharry turns it on and nothing else does;
//   * in node, with no EFOIL_ARENA set, it is OFF - so mesh-check, gate-check,
//     module-check, sea-check and the wipeout census all see today's world;
//   * EFOIL_ARENA=oldharry node tools/mesh-check.mjs measures the arena.
export const ARENA_ON = (() => {
  try {
    if (typeof location !== 'undefined' && typeof URLSearchParams !== 'undefined') {
      if ((new URLSearchParams(location.search).get('arena') || '') === 'oldharry') return true;
    }
  } catch { /* a hostile location is not a reason to fail the build */ }
  try {
    if (typeof process !== 'undefined' && process.env && process.env.EFOIL_ARENA === 'oldharry') return true;
  } catch { /* no process: browser */ }
  return false;
})();

// ---------------------------------------------------------------------------
// PALETTE. Every colour the arena uses is here and nowhere else, so tone can be
// revisited without touching geometry (see the TRAP 5 note above).
const hex = (h) => {
  const n = parseInt(h.slice(1), 16);
  const f = (c) => Math.pow(c / 255, 2.2);          // sRGB -> linear, as coast.js
  return [f((n >> 16) & 255), f((n >> 8) & 255), f(n & 255)];
};

export const ARENA_PAL = {
  // UNSOURCED (see header). coast-far.js's own chalk, unchanged.
  chalk: hex('#C8C6BE'),
  // DERIVED from chalk, not measured: weathered and lichened lower faces and
  // anything facing away from the light. 0.78x, kept neutral.
  chalkWeathered: hex('#9C9A94'),
  // DERIVED from chalk: fresh rockfall scar, 1.06x. Used only on the steepest
  // faces, which is where chalk actually spalls.
  chalkFresh: hex('#D4D2CA'),
  // coast-far.js's own Purbeck downland green, unchanged.
  turf: hex('#556B36'),
  // DERIVED from turf: the thin, grazed, chalk-influenced turf of the clifftop,
  // which reads paler than the valley grass. 1.18x with the chalk mixed in.
  turfPale: hex('#6E7F52'),
  // Studland beach. coast.js's own sandDry, unchanged - it is the same
  // Poole Bay sand and there is no reason to author a second one.
  sand: hex('#D7C39B'),
  // >>> BUOYS
  // THE CHANNEL MARKING (gl/gate-buoys.js, tr169). Two colours, and BOTH ARE AUTHORED
  // SIGNAL COLOURS, NOT MEASUREMENTS - which is the same declaration the chalk above makes
  // and for the same reason. There is no photograph of a marked gate at Handfast Point
  // because there is no marked gate at Handfast Point: this is the game's own rule made
  // visible, so there is nothing it could be measured against and nothing was pretended.
  //
  // WHAT THEY HAD TO DO, which is what picked them:
  //   * read against BOTH this arena's backdrops - blue-green sea and near-white chalk -
  //     which rules out anything pale on the float and anything grey anywhere;
  //   * sit apart from every colour already in this palette (chalk C8C6BE, turf 556B36,
  //     sand D7C39B) so a mark can never be mistaken for a piece of the landform;
  //   * NOT reproduce any navigation authority's mark scheme. One orange body is not a
  //     lateral pair and not a cardinal; there is no red/green, no yellow-and-black and no
  //     banding. gate-buoys.js's header carries the full statement.
  markOrange: hex('#D9622C'),
  // The spar and mast. Dark, because a pale one disappears into this project's sky: SKY_HORIZON
  // is the brightest thing in most of these frames and a mast is one or two pixels wide.
  markSpar: hex('#2E3B45'),
  // <<< BUOYS
};

// >>> LASTTAIL
// Threshold the data was baked against: +0.6 m ODN, in decimetres. This is the height the
// waterline is DRAWN at - pushCross() below and sea-shore.js's cross() both interpolate to
// it - and it is exported so that the contour and the classification cannot drift apart.
export const SEA_DM = 6;

// ⚠️ THE CLASSIFICATION THRESHOLD SITS BETWEEN TWO CODES, AND THAT IS A REPAIR, NOT A TASTE.
//
// arena-oldharry-data.js's header says "Land is v > 6 dm", and this test used to read
// `h[p] <= SEA_DM * 0.1`, which says exactly the same thing. It did not DO the same thing.
// `h` is a Float32Array; f32(6 * 0.1) is 0.60000002384185791015625 and the double 6 * 0.1 is
// 0.60000000000000008882, so a node at EXACTLY 6 dm compared GREATER and was classified LAND.
// 217 nodes are affected - 206 in ARENA_GRID, 11 in ARENA_STACKS. All three copies of this
// function carried the identical artefact, so nothing disagreed and nothing caught it. Only
// v == 6 is at the boundary (5 dm lands on 0.5 exactly, 7 dm on 0.69999999), so the artefact
// is uniform and deterministic: what this code has always DONE is "land is v >= 6 dm".
//
// WHICH TIE-BREAK IS RIGHT was measured before choosing, both ways, over both grids
// (tmp-tr179/lasttail/work/thresh2.mjs, thresh3.mjs):
//
//                                        land bodies  sea bodies  1-node specks  1-node pits  land/sea edges
//   land is v >= 6 dm  (what it DOES)         2            1            0             0            1028
//   land is v >  6 dm  (what it SAID)         5            7            1             3            1097
//
// The documented threshold frees 77 nodes on ARENA_GRID - 0.54% less land for 6.7% MORE
// coastline - in 41 components of which 30 are single 20 m cells, i.e. 15 one-cell nicks in
// the shore plus 3 enclosed one-cell pools. That is precisely the "chequerboard of holes,
// every one with a sandy rim" the flood fill below exists to prevent, and surfaceColour()'s
// `nearSea` reaches two cells, so one 20 m pit paints an 80 m patch of sand. On ARENA_STACKS
// today's rule resolves the headland and its three stacks as four clean land bodies.
//
// So the artefact's tie-break is kept, because it is the better coast - but it is now STATED
// instead of emerging from a rounding direction. SEA_H is half a decimetre below the contour,
// where no float width can reach it: wet is v <= 5 dm, land is v >= 6 dm, and the drawn
// contour stays at +0.6 m. Proved node-for-node identical to the old comparison over both
// grids (work/exact.mjs), so this moves no waterline and no judged pixel.
//
// ⚠️ arena-oldharry-data.js's "Land is v > 6 dm" is therefore off by this one tie-break. That
// file is GENERATED ("DO NOT HAND-EDIT - regenerate") and is not editable from here, so the
// correction is recorded at the code that decides it.
export const SEA_H = (SEA_DM - 0.5) * 0.1;
// <<< LASTTAIL

const NODATA = -9999;

// ---------------------------------------------------------------------------
// Decode one run-length row set into a Float32Array of METRES, row-major.
//
// >>> LASTTAIL
// EXPORTED (tmp-tr179). This function and markSea() below used to be private, and the result
// was that the same logic was written out three times: here, transcribed into sea-shore.js,
// and again as `decodeSea` in raid/gate.js. sea-shore.js's own header recorded the wish to
// remove two of the three and could not, because this file exported neither. Both of those
// copies are now gone and call these. Two sources of truth have cost this project real
// defects - a duplicated gate line, a channel marking that silently became hard walls - and
// the float32 artefact above is the sharpest example of all: three copies agreed perfectly,
// which is exactly why nothing caught it.
export function decode(g) {   // <<< LASTTAIL  (`export` added; body unchanged)
  const { nx, nz, rows } = g;
  const h = new Float32Array(nx * nz);
  const ok = new Uint8Array(nx * nz);
  for (let j = 0; j < nz; j++) {
    const toks = rows[j].split(' ');
    let i = 0;
    for (let t = 0; t < toks.length; t++) {
      const s = toks[t], star = s.indexOf('*');
      const v = star < 0 ? +s : +s.slice(0, star);
      const k = star < 0 ? 1 : +s.slice(star + 1);
      for (let q = 0; q < k && i < nx; q++, i++) {
        const p = j * nx + i;
        if (v === NODATA) { h[p] = 0; ok[p] = 0; } else { h[p] = v * 0.1; ok[p] = 1; }
      }
    }
  }
  return markSea({ nx, nz, x0: g.x0, z0: g.z0, step: g.step, h, ok });
}

// Is this node land? No-data counts as sea: the composite's nulls here are all
// offshore, and treating a null as land would build a spike.
//
// ⚠️ "BELOW +0.6 m ODN" IS NOT THE SAME AS "SEA", and the difference is a real
// place. Behind Studland beach lie LITTLE SEA - a freshwater lake about a
// kilometre long - and the dune slacks, all of which the survey reads at or
// below 0.6 m. Taking height alone punched a chequerboard of holes through the
// terrain there and gave every one of them a sandy rim, because the "near the
// waterline" test fired on a lake shore 800 m inland. So the sea is found by
// FLOOD FILL FROM THE EDGE of the grid: water you can reach from open water is
// sea, water you cannot is inland, and inland water is rendered as flat ground
// at its surveyed level. This model has no inland water body and none was
// invented; Little Sea is therefore a flat green pan, which is wrong but is
// wrong quietly, and it is on the "still weak" list.
//
// >>> LASTTAIL
// EXPORTED (tmp-tr179) for the same reason decode() is - see its note above.
export function markSea(G) {
  const { nx, nz, h, ok } = G;
  const wet = (p) => ok[p] === 0 || h[p] < SEA_H;   // SEA_H, not SEA_DM * 0.1: see the note above
  // <<< LASTTAIL
  const sea = new Uint8Array(nx * nz);
  const q = [];
  for (let i = 0; i < nx; i++) {
    for (const j of [0, nz - 1]) { const p = j * nx + i; if (wet(p) && !sea[p]) { sea[p] = 1; q.push(p); } }
  }
  for (let j = 0; j < nz; j++) {
    for (const i of [0, nx - 1]) { const p = j * nx + i; if (wet(p) && !sea[p]) { sea[p] = 1; q.push(p); } }
  }
  while (q.length) {
    const p = q.pop(), j = (p / nx) | 0, i = p - j * nx;
    if (i > 0) { const r = p - 1; if (wet(r) && !sea[r]) { sea[r] = 1; q.push(r); } }
    if (i < nx - 1) { const r = p + 1; if (wet(r) && !sea[r]) { sea[r] = 1; q.push(r); } }
    if (j > 0) { const r = p - nx; if (wet(r) && !sea[r]) { sea[r] = 1; q.push(r); } }
    if (j < nz - 1) { const r = p + nx; if (wet(r) && !sea[r]) { sea[r] = 1; q.push(r); } }
  }
  G.sea = sea;
  return G;
}

const isLand = (G, i, j) => G.sea[j * G.nx + i] === 0;

// Central-difference normal at a grid node, in coast axes. Falls back to
// one-sided differences at the edges.
function nodeNormal(G, i, j, out) {
  const { nx, nz, h, step } = G;
  const at = (a, b) => h[Math.min(nz - 1, Math.max(0, b)) * nx + Math.min(nx - 1, Math.max(0, a))];
  const dx = (at(i + 1, j) - at(i - 1, j)) / (2 * step);
  const dz = (at(i, j + 1) - at(i, j - 1)) / (2 * step);
  const L = Math.hypot(dx, 1, dz) || 1;
  out[0] = -dx / L; out[1] = 1 / L; out[2] = -dz / L;
  return out;
}

// Slope, rise over run, at a grid node.
function nodeSlope(G, i, j) {
  const { nx, nz, h, step } = G;
  const at = (a, b) => h[Math.min(nz - 1, Math.max(0, b)) * nx + Math.min(nx - 1, Math.max(0, a))];
  return Math.hypot((at(i + 1, j) - at(i - 1, j)) / (2 * step),
    (at(i, j + 1) - at(i, j - 1)) / (2 * step));
}

// SURFACE COLOUR, from the survey alone: height and slope decide it, nothing is
// hand-painted and there is no map.
//
// ⚠️ IT IS A CONTINUOUS BLEND, NOT A THRESHOLD LADDER, and that is a fix rather
// than a preference. The first version stepped at slope 0.55 / 0.90 / 1.35, and
// because the slope is evaluated per grid NODE, adjacent columns of the cliff
// face landed either side of a step: the whole 2 km frontage rendered as
// vertical light/dark corduroy, a regular pattern far more visible than the
// thing it was made of. (coast.js's sand texture carries the same scar - "a
// regular grid is far more visible than the texture it is made of".) Blending
// removes the pattern without changing where chalk and turf actually are.
//
// The two knees are the only authored numbers:
//   slope 0.55 (29 deg)  turf stops holding on chalk downland
//   slope 1.20 (50 deg)  bare vertical face, where chalk spalls and stays white
const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// isStack: a detached stack standing in open water. No turf and no beach on one
// - they are bare chalk from the waterline up, which is what makes them stacks
// and not islands. The first render put a green patch on the foot of the middle
// stack, which is what this exists to stop.
// nearSea: within two grid cells of the waterline. Beach sand is only claimed
// where the survey says it is low AND at the water; without this the whole of
// the low ground behind Studland (dune and heath at 1-4 m) rendered as bare
// sand in Bournemouth's own sand texture, a mottled patch a kilometre across.
function surfaceColour(h, slope, isStack, nearSea) {
  const rock = mix3(ARENA_PAL.chalkWeathered, ARENA_PAL.chalkFresh, smooth(0.6, 1.6, slope));
  if (isStack) return [rock, 4];
  const grass = mix3(ARENA_PAL.turfPale, ARENA_PAL.turf, smooth(20, 70, h));
  if (nearSea && h < 4 && slope < 0.14) return [ARENA_PAL.sand, 0];
  return [mix3(grass, rock, smooth(0.55, 1.20, slope)), 4];
}

// ---------------------------------------------------------------------------
// MARCHING SQUARES over one grid, emitting the LAND side only.
//
// The waterline is interpolated along each grid edge that crosses +0.6 m ODN,
// so the traced coast is good to about a metre along grid lines rather than to
// the 20 m grid - which is what makes the headland's plan shape the survey's
// and not the sampler's. Crossing vertices are shared in value (not in index)
// between neighbouring cells, so the surface is closed: it has no cracks.
//
// Returns the number of triangles emitted.
function emitSurface(m, G, OX, OZ, skirtTo, isStack) {
  const { nx, nz, x0, z0, step } = G;
  // Within two cells of the waterline - one cheap dilation of the sea mask.
  const nearSea = new Uint8Array(nx * nz);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    if (isLand(G, i, j)) continue;
    for (let b = Math.max(0, j - 2); b <= Math.min(nz - 1, j + 2); b++)
      for (let a = Math.max(0, i - 2); a <= Math.min(nx - 1, i + 2); a++) nearSea[b * nx + a] = 1;
  }
  const nrm = [0, 0, 0];
  let tris = 0;

  // Per-node cache: position, normal, colour, material.
  const H = (i, j) => G.h[j * nx + i];
  const X = (i) => x0 + i * step + OX;
  const Z = (j) => z0 + j * step + OZ;

  const pushNode = (i, j) => {
    nodeNormal(G, i, j, nrm);
    const h = H(i, j);
    const [col, mat] = surfaceColour(h, nodeSlope(G, i, j), isStack, nearSea[j * nx + i] === 1);
    return m.pushC(X(i), h, Z(j), nrm[0], nrm[1], nrm[2], col, mat);
  };

  // A waterline vertex on the edge from land node (li,lj) to sea node (si,sj).
  // y = 0: the sea plane. The interpolation is on HEIGHT, so it lands where the
  // survey says the +0.6 m contour crosses that edge.
  const pushCross = (li, lj, si, sj) => {
    const hl = H(li, lj), hs = G.ok[sj * nx + si] ? H(si, sj) : -1.0;
    let t = (SEA_DM * 0.1 - hs) / ((hl - hs) || 1);
    t = t < 0.02 ? 0.02 : t > 0.98 ? 0.98 : t;
    const x = X(si) + (X(li) - X(si)) * t;
    const z = Z(sj) + (Z(lj) - Z(sj)) * t;
    nodeNormal(G, li, lj, nrm);
    const [col, mat] = surfaceColour(0.6, nodeSlope(G, li, lj), isStack, true);
    return { i: m.pushC(x, 0, z, nrm[0], nrm[1], nrm[2], col, mat), x, z, col, mat };
  };

  const fan = (poly) => {
    for (let k = 1; k + 1 < poly.length; k++) { m.tri(poly[0], poly[k], poly[k + 1]); tris++; }
  };

  for (let j = 0; j + 1 < nz; j++) {
    for (let i = 0; i + 1 < nx; i++) {
      // corners, counter-clockwise when seen from above with +X right, +Z up
      const c = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]];
      const L = c.map(([a, b]) => isLand(G, a, b));
      const nL = L[0] + L[1] + L[2] + L[3];
      if (nL === 0) continue;

      if (nL === 4) {
        const v = c.map(([a, b]) => pushNode(a, b));
        // Two triangles, wound so the surface faces up (the coast draw disables
        // culling, but a consistent winding keeps the shadow pass honest).
        m.tri(v[0], v[3], v[2]); m.tri(v[0], v[2], v[1]); tris += 2;
        continue;
      }

      // Mixed cell: walk the four corners in order, emitting land corners and a
      // crossing vertex wherever the edge changes side.
      const poly = [];
      const edge = [];
      for (let k = 0; k < 4; k++) {
        const k2 = (k + 1) & 3;
        if (L[k]) poly.push(pushNode(c[k][0], c[k][1]));
        if (L[k] !== L[k2]) {
          const lk = L[k] ? k : k2, sk = L[k] ? k2 : k;
          const cr = pushCross(c[lk][0], c[lk][1], c[sk][0], c[sk][1]);
          poly.push(cr.i); edge.push(cr);
        }
      }
      if (poly.length >= 3) fan(poly);

      // SKIRT. A short vertical curtain under each waterline segment so no gap
      // shows between the land edge and the sea plane at any camera height, and
      // so the chalk reads as a wall standing IN the water rather than a ramp
      // resting on it. It is the cliff's own colour.
      if (skirtTo !== undefined && edge.length === 2) {
        const [a, b] = edge;
        const nx2 = b.z - a.z, nz2 = -(b.x - a.x);
        const nl = Math.hypot(nx2, nz2) || 1;
        const col = a.col, mat = a.mat;
        const a1 = m.pushC(a.x, skirtTo, a.z, nx2 / nl, 0, nz2 / nl, col, mat);
        const b1 = m.pushC(b.x, skirtTo, b.z, nx2 / nl, 0, nz2 / nl, col, mat);
        const a0 = m.pushC(a.x, 0, a.z, nx2 / nl, 0, nz2 / nl, col, mat);
        const b0 = m.pushC(b.x, 0, b.z, nx2 / nl, 0, nz2 / nl, col, mat);
        m.tri(a0, a1, b1); m.tri(a0, b1, b0); tris += 2;
      }
    }
  }
  return tris;
}

// ---------------------------------------------------------------------------
// THE ARENA.
//
// m    a ColourMesh (coast.js). MAT is passed in rather than imported so this
//      file never has to be kept in step with coast.js's material table.
// OX/OZ  the same coast -> world translation every other builder is handed.
//
// Returns { tris, verts } or null when the flag is off.
export function buildOldHarryArena(m, C, MAT, OX, OZ) {
  if (!ARENA_ON) return null;
  const v0 = m.vertexCount, i0 = m.i.length;

  const land = decode(ARENA_GRID);
  const stacks = decode(ARENA_STACKS);

  // The headland, the cliff line, Ballard Down and the Studland shore.
  // Skirt to -6 m: deeper than the -4 m the sea disc ever rises to, so the
  // waterline never shows daylight under it.
  const tLand = emitSurface(m, land, OX, OZ, -6, false);

  // The detached stack group. These are ISLANDS - nothing stitches to them -
  // so they are simply a second, finer pass with a deeper skirt: the stacks
  // stand in about 5 m of water and the skirt is what the player sees at the
  // waterline when the swell drops.
  const tStack = emitSurface(m, stacks, OX, OZ, -9, true);

  return {
    tris: tLand + tStack,
    verts: m.vertexCount - v0,
    indices: [i0, m.i.length],
    landTris: tLand,
    stackTris: tStack,
  };
}

// ---------------------------------------------------------------------------
// STANDALONE MESH, for the day someone builds the arena as a SECOND mesh with
// its own CoastRenderer rather than appending it to the coast (ARCH.md option
// A). Same geometry, same code path; it just brings its own builder.
//
// It needs a ColourMesh, which coast.js does not export, so the caller passes a
// factory: buildArenaMesh(() => new ColourMesh(), MAT).
export function buildArenaMesh(makeMesh, MAT, OX = 0, OZ = 0) {
  const m = makeMesh();
  const r = buildOldHarryArena(m, null, MAT, OX, OZ);
  if (!r) return null;
  const mesh = m.buildC();
  mesh.arena = r;
  return mesh;
}

// The arena's own bounding box in the COAST frame, for anything that needs to
// know where it is without building it (a level loader, a spawn point, a
// minimap). Derived from the baked grids, so it cannot drift from them.
export const ARENA_BOUNDS = {
  x0: ARENA_GRID.x0,
  x1: ARENA_GRID.x0 + (ARENA_GRID.nx - 1) * ARENA_GRID.step,
  z0: ARENA_GRID.z0,
  z1: ARENA_GRID.z0 + (ARENA_GRID.nz - 1) * ARENA_GRID.step,
  // The detached stack group's centre, measured off the LIDAR connected
  // components rather than taken from the sheet (which lands in water).
  stacks: [-4850, 7368],
};
