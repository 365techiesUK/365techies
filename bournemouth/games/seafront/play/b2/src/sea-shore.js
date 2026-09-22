// THE SHORE FIELD - where the sea meets the land, for an arena whose coastline
// is not a function of X.
//
// WHY THIS FILE EXISTS
// Bournemouth's shoreline is expressible as a graph: shoreD = z - (mhw(x) - Z0),
// a straight coast with one seaward direction, and shaders.js bakes the MHW
// table into GLSL as compile-time constants. Handfast Point has sea on BOTH
// sides, so it is not expressible that way at any rotation - tmp-tr138/ARCH.md
// section 3 established that before any of this was written. What replaces it
// here is a SIGNED DISTANCE FIELD to the measured waterline, which expresses a
// headland, a bay or an island equally well.
//
// ---------------------------------------------------------------------------
// THE ONE-TABLE RULE, and how it is kept
//
// The field is built ONCE, quantised ONCE, and packed into ONE Float32Array.
// That array is:
//   * uploaded verbatim into the water shader's existing `Waves` uniform block
//     by sea-glsl.js's packWaveUBO(), and
//   * indexed by shoreField() below, which is what the CPU sampler in
//     sea-surf.js reads.
// Both sides therefore decode the SAME quantised values with the same bilinear
// weights. There is no full-precision reference copy for one side to drift
// toward: the quantised array IS the field. tools/sea-check.mjs gates the two
// implementations against each other at 4,000 points.
//
// ---------------------------------------------------------------------------
// WHY A UNIFORM BLOCK AND NOT A GLSL CONST ARRAY - MEASURED, NOT ASSUMED
//
// A const array is what mhwChunk() and surfChunk() already use, and it was the
// obvious first choice because it needs nothing from renderer.js. It was priced
// first, by injecting N dummy floats into the water fragment shader and timing
// a full page load + render under SwiftShader (tmp-tr147/probe*, three runs
// each, one camera):
//
//        0 floats   5.1 s per render
//    3,000 floats   8.5 s     (+3.4 s)
//   11,124 floats  14.7 s     (+9.6 s)
//
// and, with the array present but read only inside a branch the runtime never
// takes, 16.3 s - i.e. the whole cost is SHADER COMPILATION of the literal, not
// the per-fragment dynamic index, which measured as free. About 0.9 ms of
// compile time per const float. renderer.js's own header makes shader-compile
// stutter a budget failure, so an 11,000-float const array is disqualified by
// its own number.
//
// A texture would be the natural home and is NOT AVAILABLE: renderer.js binds
// the water program's uniforms from a fixed name list (renderer.js:118-121) and
// has no texture path for that program at all, and renderer.js is not a file
// this work owns. The uniform block IS available, because its size and its
// packer both live in sea-glsl.js: UBO_FLOATS and packWaveUBO() are exported
// from there and renderer.js only asks them how big the buffer is.
//
// ---------------------------------------------------------------------------
// THE BUDGET, and why the grid is 88 x 87
//
// GL ES 3.0's guaranteed MAX_UNIFORM_BLOCK_SIZE is 16,384 bytes = 4,096 floats.
// The wave table already holds 64 vec4 (256 floats). That leaves 3,840 floats,
// and std140 pads a bare float[] to 16 bytes an element, so the field is stored
// as vec4[] and indexed by hand.
//
// Two values are packed per float as 11-bit codes (hi*2048 + lo, max 2^22 - 1,
// an integer a float32 carries exactly), which doubles the resolution for three
// ALU ops per tap. 88 x 87 = 7,656 values -> 3,828 floats -> 957 vec4. Total
// block 1,021 vec4 = 16,336 bytes, inside the guaranteed minimum with 48 bytes
// to spare. Cells are 39.8 x 41.4 m.
//
// WHAT THAT RESOLUTION BUYS, measured against exact distance to the 1,242
// waterline segments at 4,000 random points 1-60 m offshore (the surf band):
//
//   cell     floats    d error  p50 / p95 / p99 / max, metres
//   120 m     1,295     3.41  18.31  29.53  48.15
//    80 m     2,860     2.36  10.06  15.72  31.57
//    60 m     5,037     1.75   7.38  10.85  21.29
//    40 m    11,124     0.98   4.59   6.63  13.00   <- this one, packed 2/float
//    30 m    19,728     0.57   3.11   4.62   8.81
//
// 40 m is also about where the representation error crosses under the SOURCE's
// own error: the waterline is a marching-squares contour of a 20 m DSM, so it
// carries ~10 m of staircase against the real coast. And a coarse field is a
// LOW-PASS on the shoreline, which is physically right - a 7.5 s swell has a
// 27 m wavelength over the bank and cannot refract around features much smaller
// than that.
//
// ---------------------------------------------------------------------------
// WHERE THE SHAPE COMES FROM: the same survey the landform does
//
// ARENA_GRID / ARENA_STACKS are the EA LIDAR Composite DSM (1 m, last return)
// baked by tmp-tr138. The waterline here is the +0.6 m ODN contour of that
// survey, found with the SAME edge interpolation arena-oldharry.js's
// pushCross() uses, so the field's zero and the drawn land edge are the same
// line rather than two lines that agree by eye.
//
// >>> LASTTAIL
// ⚠️ decode()/markSea() USED TO BE TRANSCRIBED HERE, and are not any more
// (tmp-tr179). arena-oldharry.js exports both, and this file imports decode()
// from it, so there is one copy of that logic in the tree instead of three and
// the copies cannot drift. tools/sea-check.mjs still gates this field against
// the MESH - it builds the arena through buildArenaMesh() and asserts every
// waterline vertex the geometry emits lands on this field's zero contour - so
// the cross-check that caught a divergence before is unchanged and still runs.
// It is now a check on two READERS of one function rather than on two copies.
// <<< LASTTAIL
//
// ---------------------------------------------------------------------------
// THE OTHER FIELDS OVER THIS SURVEY - the contract, because they are NOT one
// field and must not be assumed to agree (tmp-tr178)
//
// Three things in this tree read the Old Harry survey and hand back "where is
// the land". They are not interchangeable. What each one is, who reads it, and
// what you may rely on:
//
// 1. THIS FILE. 88 x 87 nodes on 39.8 x 41.4 m cells, signed distance to the
//    waterline, quantised to 11 bits over [-120, +520] m (0.313 m per code) and
//    packed into the water shader's existing `Waves` uniform block.
//    Read by: the water shader (GLSL), sea-surf.js's CPU sampler, and
//    boats/obstacles.js's seabed.
//    Why it is coarse: the budget above. 4,096 floats is GL ES 3.0's GUARANTEED
//    MAX_UNIFORM_BLOCK_SIZE and the wave table already has 256 of them, so the
//    cell size is not a taste - it is what fits. Its d error against the exact
//    contour is p50 0.98 m, p95 4.59 m, max 13.0 m.
//    It is the only one of the three that exists on the GPU.
//
// 2. raid/gate.js's `arenaFields()`. TWO fields, one per survey grid, each at
//    that grid's own resolution - 20 m for the land, 2.5 m for the stacks -
//    unquantised Float32, two-pass chamfer, built lazily on first use and only
//    when the corsair level is entered.
//    Read by: `arenaClear`, `arenaAway`, `spawnClear`, `wpKeep`, `keep` and the
//    waypoint planner. Nothing in the draw path reads it.
//    Why it is finer: `spawnClear` is 60 m and has to resolve a stack group
//    140 m across. A 40 m cell cannot do that, so it keeps 2.5 m.
//    Off the grids it returns a PROVABLE LOWER BOUND out to EDGE_MARGIN = 250 m
//    and OPEN = 9999 beyond, and it throws rather than guess. That is a
//    different contract from this file's, which is continuous everywhere.
//
// 3. gl/arena-oldharry.js's `decode()` / `markSea()` / `pushCross()`. NOT a
//    distance field - it is the run-length decode, the sea flood fill and the
//    +0.6 m contour crossing that 1 and 2 are both BUILT FROM. It is the one
//    authority on which node is land, and the mesh is built from it directly.
//
// >>> LASTTAIL
// ⚠️ THE REAL DUPLICATION WAS 3, NOT 1-AND-2, AND IT IS NOW GONE (tmp-tr179).
// decode() + the flood fill existed in THREE places - arena-oldharry.js, this
// file (transcribed) and gate.js's `decodeSea` - because arena-oldharry.js
// exported none of them. It now exports decode(), markSea() and SEA_DM; this
// file and gate.js both call them, and the two transcriptions are deleted.
//
// This was not tidying. The three copies agreed PERFECTLY, and that is exactly
// how a defect survived in all of them at once: `h[p] <= SEA_DM * 0.1` on a
// Float32Array classified 217 nodes at exactly 6 dm as LAND although the data
// file says land is v > 6 dm, and because nothing disagreed, nothing caught it.
// arena-oldharry.js's SEA_H note records the measurement and the decision.
// <<< LASTTAIL
//
// ⚠️ 1 AND 2 CANNOT BE REDUCED TO ONE, and the reason is the budget, not
// tidiness. Deriving 2 from 1 would take spawn clearance from 2.5 m cells to
// 40 m quantised ones at the only place in the arena where it matters. Deriving
// 1 from 2 would need the 20 m chamfer in a uniform block, which is 30,072
// values against a 3,840-float budget. So they stay two, and this is the
// contract between them:
//
//   * They agree about the SIGN everywhere. Measured on a 10 m lattice over the
//     field box + 218.75 m, 156,400 nodes: this file calls land where gate.js
//     reports more than 20 m of clear water at 23 nodes (0.0023 km2), none of
//     them outside a survey rectangle, worst d = -0.6 m against 22 m. Every one
//     of those is inside this field's own p95 sampling error. Before tmp-tr178
//     the same measurement was 2,340 nodes (0.2340 km2), of which 2,317 were
//     outside both rectangles - that was the sign defect, not a difference of
//     purpose, and it is gone.
//   * They DO NOT agree about the MAGNITUDE on the landward side, and they are
//     not meant to. This file's zero is the drawn land's edge, INCLUDING the
//     survey rectangle where land runs off it; gate.js's chamfer measures to the
//     nearest sea node INSIDE its grid and so reads deeper inland near that
//     edge - e.g. at world (-5200, 6300), -70 m here against -164 m there. For
//     gate.js that is the conservative direction (it pushes a hull out harder)
//     and nothing reads it as a distance, so it is left alone.
//   * They do not agree about the FAR FIELD by construction: this file
//     continues linearly along its own gradient forever, gate.js returns OPEN
//     past 250 m. Do not compare them beyond 250 m of a survey rectangle.
//
// ---------------------------------------------------------------------------
// ⚠️ WHAT IS NOT SOURCED, said plainly
//
// THERE IS NO BATHYMETRY HERE. Measured over all 30,072 nodes of the arena DSM:
// of the 8,259 nodes the flood fill calls sea, 6,981 (84.5%) read between -0.8
// and -1.0 m ODN and the deepest reading anywhere is -1.2 m. That is the WATER
// SURFACE at flight time, not a bed. The EA composite gives this arena exactly
// zero subtidal depth.
//
// What it does give is the INTERTIDAL RUN: the horizontal distance from the
// +0.6 m contour to the first node at or below -0.85 m, over which the ground
// drops at least 1.45 m. Measured along the waterline (tmp-tr147/lab12):
//
//   whole arena shoreline                    p50  35 m
//   within 900 m of the stacks (the chalk)   p50  25 m
//   the cliff-backed run                     p50  10 m
//   the sand-backed run                      p50  45 m
//
// and the model's existing inshore law, h = 0.155 d^(2/3), reaches 1.45 m at
// d = 28.6 m. So bedDepth() is kept UNCHANGED at the arena, and that is a
// measurement rather than a copy: the law the model already uses sits inside
// the surveyed spread and within 15% of the headland's own number. The OFFSHORE
// end of the profile (h = 0.2792 sqrt(d), anchored at Bournemouth pier) remains
// UNSOURCED here and is the largest single unknown in the arena's sea.
//
// Also unsourced at this arena: the deep-water wave height (SURF.H0 = 0.92 m is
// Poole Bay's) and the period. Old Harry faces the open Channel and very
// probably gets more; nothing in this project measures it, so nothing here
// claims it.
//
// ⚠️ NO PHOTOGRAPHIC VALIDATION IS POSSIBLE. tmp-tr124's reference audit
// returned NO for Studland and Old Harry: six files, and the two usable videos
// are third-party reposts. The arena's sea is physics-led and says so.

import { ARENA_GRID, ARENA_STACKS } from './gl/arena-oldharry-data.js';
// >>> LASTTAIL
// tmp-tr179: decode() and SEA_DM now come FROM arena-oldharry.js instead of being transcribed
// below it. That file exports decode(), markSea() and SEA_DM as of this round, which is what
// the header above said would remove two of the three copies; this is one of the two.
// markSea() is not named here because decode() is the only entry this file ever used.
import { ARENA_ON, decode, SEA_DM } from './gl/arena-oldharry.js';
// <<< LASTTAIL
import { COAST } from './gl/coast.js';

// Is the arena shore model live? Exactly the arena's own flag: with it off not
// one byte of this file's output reaches the shader, and Bournemouth's sea is
// the one it has always been.
export const SHORE_ON = ARENA_ON;

// >>> LASTTAIL
// THE SURVEY. decode() and markSea() were transcribed here; they are now imported above, so
// this file holds ONE copy of the survey logic - arena-oldharry.js's. Nothing else changed:
// decode() still returns { nx, nz, x0, z0, step, h, ok, sea } and waterline() below still
// reads exactly those fields. NODATA went with the transcription; it was used nowhere else.
// <<< LASTTAIL

// ---------------------------------------------------------------------------
// THE WATERLINE, as oriented segments.
//
// The crossing points are pushCross()'s, to the letter, including its 0.02/0.98
// clamp - so this contour and the vertices the chalk mesh puts at y = 0 are the
// same points, not two independent tracings of one contour.
//
// Each segment also carries a SEAWARD NORMAL, taken from the cell's own sea
// corners. That is what signs the field within one cell of the shore, where a
// nearest-node mask flips inside anything thinner than a cell: measured on this
// data, the nearest-node sign alone put 4 of 27,860 nodes on the wrong side,
// and those 4 produced 157 m of error in the sampled field.
//
// Layout: 6 numbers per segment - ax, az, vx, vz, seaward nx, seaward nz.
function waterline(G) {
  const { nx, nz, x0, z0, step, h, ok, sea } = G;
  const isLand = (i, j) => sea[j * nx + i] === 0;
  const H = (i, j) => h[j * nx + i];
  const X = (i) => x0 + i * step, Z = (j) => z0 + j * step;
  const cross = (li, lj, si, sj) => {
    const hl = H(li, lj), hs = ok[sj * nx + si] ? H(si, sj) : -1.0;
    let t = (SEA_DM * 0.1 - hs) / ((hl - hs) || 1);
    t = t < 0.02 ? 0.02 : t > 0.98 ? 0.98 : t;
    return [X(si) + (X(li) - X(si)) * t, Z(sj) + (Z(lj) - Z(sj)) * t];
  };
  const out = [];
  for (let j = 0; j + 1 < nz; j++) {
    for (let i = 0; i + 1 < nx; i++) {
      const c = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]];
      const L = [isLand(i, j), isLand(i + 1, j), isLand(i + 1, j + 1), isLand(i, j + 1)];
      const n = (L[0] ? 1 : 0) + (L[1] ? 1 : 0) + (L[2] ? 1 : 0) + (L[3] ? 1 : 0);
      if (n === 0 || n === 4) continue;
      let sx = 0, sz = 0, ns = 0;
      for (let k = 0; k < 4; k++) if (!L[k]) { sx += X(c[k][0]); sz += Z(c[k][1]); ns++; }
      sx /= ns; sz /= ns;
      const e = [];
      for (let k = 0; k < 4; k++) {
        const k2 = (k + 1) & 3;
        if (L[k] !== L[k2]) {
          const lk = L[k] ? k : k2, sk = L[k] ? k2 : k;
          e.push(cross(c[lk][0], c[lk][1], c[sk][0], c[sk][1]));
        }
      }
      const push = (a, b) => {
        const vx = b[0] - a[0], vz = b[1] - a[1];
        const len = Math.hypot(vx, vz) || 1;
        let nxv = vz / len, nzv = -vx / len;
        const mx = (a[0] + b[0]) * 0.5, mz = (a[1] + b[1]) * 0.5;
        if (nxv * (sx - mx) + nzv * (sz - mz) < 0) { nxv = -nxv; nzv = -nzv; }
        out.push(a[0], a[1], vx, vz, nxv, nzv);
      };
      if (e.length === 2) push(e[0], e[1]);
      else if (e.length === 4) { push(e[0], e[1]); push(e[2], e[3]); }
    }
  }

  // >>> FIELDS
  // THE SURVEY'S OWN EDGE IS A WATERLINE WHEREVER THE LAND RUNS OFF IT.
  //
  // Marching squares above traces the +0.6 m contour, and that is the WHOLE of
  // the land/water boundary only while the land lies entirely INSIDE the grid.
  // It does not. Measured on this baked data, not assumed:
  //
  //   ARENA_GRID   west 0, north 0, south 0, EAST 36 land nodes - one unbroken
  //                run, j = 70..105, world z 6140..6840, i.e. 700 m of land
  //                meeting the rectangle at world x = -5130.
  //   ARENA_STACKS west 4 land nodes, world z 7100..7107.5 at x = -5145, where
  //                the 2.5 m grid clips a rock the 20 m grid reads as sea.
  //
  // WHY THOSE EDGES ARE SHORE AND NOT A HOLE IN THE DATA. The land the model
  // DRAWS is arena-oldharry.js's cell loop - `i + 1 < nx`, `j + 1 < nz` - so the
  // chalk mesh ENDS at the rectangle and there is open water beyond it. Nothing
  // else builds land here: raid/gate.js's EDGE_MARGIN proof and
  // boats/obstacles.js's rectangle test are both written on the same statement,
  // that every piece of arena land lies inside one of these two rectangles. The
  // rectangle's edge is therefore exactly as much a boundary between the drawn
  // land and the drawn sea as the traced contour is.
  //
  // WHAT LEAVING IT OUT COST, which is the defect this fence exists for. With no
  // segment on that 700 m run the nearest contour to the water east of it was
  // the one on the FAR side of the headland, hundreds of metres away, so |d| was
  // large, and the sign lookup below - which clamped to the last surveyed column
  // - then made it NEGATIVE. The field read LAND over the open Channel: 0.088
  // km2 inside the box and 1.31 km2 more carried out by the linear continuation,
  // reaching -322 m on the line the player enters the gate through. See the
  // block above the sign lookup in build() for the other half of it.
  //
  // The seaward normal is the rectangle's outward normal and needs no centroid
  // test: there is no survey on the far side, so the far side is sea. Where a
  // boundary cell is mixed the land part ends at cross()'s own crossing point -
  // the same point the contour segment in that cell already starts from - so the
  // two meet at a corner of one closed polygon and never overlap.
  const bside = (at, len, onx, onz) => {
    for (let k = 0; k + 1 < len; k++) {
      const p = at(k), q = at(k + 1);
      const lp = isLand(p[0], p[1]), lq = isLand(q[0], q[1]);
      if (!lp && !lq) continue;
      const A = lp ? [X(p[0]), Z(p[1])] : cross(q[0], q[1], p[0], p[1]);
      const B = lq ? [X(q[0]), Z(q[1])] : cross(p[0], p[1], q[0], q[1]);
      const vx = B[0] - A[0], vz = B[1] - A[1];
      if (vx === 0 && vz === 0) continue;
      out.push(A[0], A[1], vx, vz, onx, onz);
    }
  };
  bside((k) => [0, k], nz, -1, 0);           // west edge, sea is -X of it
  bside((k) => [nx - 1, k], nz, 1, 0);       // east edge, sea is +X
  bside((k) => [k, 0], nx, 0, -1);           // north edge, sea is -Z
  bside((k) => [k, nz - 1], nx, 0, 1);       // south edge, sea is +Z
  // <<< FIELDS

  return out;
}

// ---------------------------------------------------------------------------
// THE GRID. Exactly the arena DSM's own box, so the field and the landform
// share a frame and no margin has to be argued for. Outside it the field
// continues at unit rate, which is what a distance field does.
//
// ⚠️ THE BOX IS THE UNION OF BOTH SURVEY GRIDS, NOT THE LAND GRID'S. The
// detached stack group is baked on its own 2.5 m grid running to x = -4775,
// which is 125 m EAST of where the land grid stops. Sized on the land grid
// alone, the arena's signature feature - the stacks - sat outside the field and
// sampled as extrapolation. Caught by a smoke test, not by reasoning.
//
// ⚠️ AND IT IS IN WORLD COORDINATES, NOT COAST ONES. The baked DSM is in the
// COAST frame; the shader samples at P.xz and surfSample() is handed x/z, and
// both of those are WORLD - coast minus the sim origin, exactly as coast.js:610
// translates every builder it calls. Building the field in the coast frame and
// sampling it in the world one put the whole shoreline 380 m out to sea, which
// rendered as a perfectly convincing surf band lying offshore of the beach that
// made it. It cost a render to see and nothing in the numbers would have said
// so, which is why the arena views are in RESULT.md.
const NX = 88, NZ = 87;
const OX = -COAST.startX, OZ = -COAST.startZ;      // coast -> world
const X0 = Math.min(ARENA_GRID.x0, ARENA_STACKS.x0) + OX;
const Z0 = Math.min(ARENA_GRID.z0, ARENA_STACKS.z0) + OZ;
const X1 = Math.max(ARENA_GRID.x0 + (ARENA_GRID.nx - 1) * ARENA_GRID.step,
  ARENA_STACKS.x0 + (ARENA_STACKS.nx - 1) * ARENA_STACKS.step) + OX;
const Z1 = Math.max(ARENA_GRID.z0 + (ARENA_GRID.nz - 1) * ARENA_GRID.step,
  ARENA_STACKS.z0 + (ARENA_STACKS.nz - 1) * ARENA_STACKS.step) + OZ;
const HX = (X1 - X0) / (NX - 1);
const HZ = (Z1 - Z0) / (NZ - 1);

// Quantisation. 11 bits over [-120, +520] m of signed offshore distance.
// The landward end only has to be negative - no water is drawn under the chalk.
// The seaward end is past D_FADE1 = 205 m AND past the depth at which the whole
// surf-zone block switches off (bedDepth(520) = 6.37 m against a 6 m gate), so
// the clamp cannot be seen.
const Q_BITS = 2048;
const D_MIN = -120, D_MAX = 520;
const Q_SCALE = (D_MAX - D_MIN) / (Q_BITS - 1);      // 0.31266 m per code
const N_FLOATS = (NX * NZ) >> 1;                     // 3,828
const N_VEC4 = Math.ceil(N_FLOATS / 4);              // 957

export const SHORE = Object.freeze({
  on: SHORE_ON,
  nx: NX, nz: NZ, x0: X0, z0: Z0, x1: X1, z1: Z1, hx: HX, hz: HZ,
  qBits: Q_BITS, qScale: Q_SCALE, dMin: D_MIN, dMax: D_MAX,
  floats: SHORE_ON ? N_VEC4 * 4 : 0,
  vec4s: SHORE_ON ? N_VEC4 : 0,
});

// ---------------------------------------------------------------------------
// BUILD. Nothing below runs unless the flag is on.
function build() {
  const land = decode(ARENA_GRID);
  const stacks = decode(ARENA_STACKS);
  const segs = new Float64Array(waterline(land).concat(waterline(stacks)));
  const nSeg = segs.length / 6;
  // Coast -> world, once, on the segment ENDPOINTS only: the direction and the
  // seaward normal are vectors and a translation does not touch them.
  for (let o = 0; o < segs.length; o += 6) { segs[o] += OX; segs[o + 1] += OZ; }

  // Segments bucketed on a coarse grid so a node does not have to test all
  // 1,242 of them. Build time is paid at arena level load and is reported by
  // sea-check, so it cannot quietly become a stall.
  const BS = 200;
  const bnx = Math.ceil((X1 - X0) / BS) + 1, bnz = Math.ceil((Z1 - Z0) / BS) + 1;
  const bucket = [];
  for (let i = 0; i < bnx * bnz; i++) bucket.push([]);
  for (let s = 0; s < nSeg; s++) {
    const o = s * 6;
    const ax = segs[o], az = segs[o + 1], bx = ax + segs[o + 2], bz = az + segs[o + 3];
    const i0 = Math.max(0, Math.floor((Math.min(ax, bx) - X0) / BS));
    const i1 = Math.min(bnx - 1, Math.floor((Math.max(ax, bx) - X0) / BS));
    const j0 = Math.max(0, Math.floor((Math.min(az, bz) - Z0) / BS));
    const j1 = Math.min(bnz - 1, Math.floor((Math.max(az, bz) - Z0) / BS));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) bucket[j * bnx + i].push(o);
  }

  // >>> FIELDS
  // THE SIGN AUTHORITY, and why it is no longer one grid with clamped indices.
  //
  // Beyond one DSM cell of the contour the flood-fill mask is the topological
  // authority - that part is unchanged and it is the same mask the landform
  // uses. What changed is WHICH mask is asked, and what happens when none of
  // them covers the point.
  //
  // maskAt() returns +1 sea, -1 land, or 0 meaning "this survey does not cover
  // this point". Inside a grid, and within half a cell of its edge, it is
  // Math.round() on the nearest node - term for term what the old lookup did, so
  // no reading inside a survey moves. Past half a cell it declines to answer
  // instead of clamping, because past half a cell the clamped node is NOT the
  // nearest node and the answer it gives is about somewhere else.
  const maskAt = (G, px, pz) => {
    const fi = (px - G.x0 - OX) / G.step, fj = (pz - G.z0 - OZ) / G.step;
    if (fi < -0.5 || fj < -0.5 || fi > G.nx - 0.5 || fj > G.nz - 0.5) return 0;
    const gi = Math.min(G.nx - 1, Math.max(0, Math.round(fi)));
    const gj = Math.min(G.nz - 1, Math.max(0, Math.round(fj)));
    return G.sea[gj * G.nx + gi] ? 1 : -1;
  };
  // Land grid first, so every point the old lookup answered from it is answered
  // from it still and this change is confined to the 125 m strip east of
  // x = -5130. The stack grid answers there because it is the only survey that
  // reaches it. Where NEITHER covers the point the answer is SEA, and that is
  // not a default - it is the same statement raid/gate.js's EDGE_MARGIN proof
  // and boats/obstacles.js's rectangle test are both built on, and the same one
  // arena-oldharry.js's cell loop implements: all of this arena's land is inside
  // these two rectangles, so outside them there is none.
  //
  // ⚠️ THIS ARM IS ONLY SAFE BECAUSE THE FENCE IN waterline() CLOSES THE
  // CONTOUR AT THE RECTANGLE. Calling the outside sea on its own was tried
  // before this file shipped and rejected, correctly: with the contour open, |d|
  // out there was the distance to the far side of the headland, so flipping its
  // sign put a 240 m discontinuity down x = -5130 and the field drew an invented
  // 711 m shoreline with |grad d| = 11.5. The two halves are one fix. With the
  // boundary segments in, d is ~0 AT the rectangle and grows at unit rate east
  // of it, so there is nothing to flip and no crease to draw.
  const signAt = (px, pz) => maskAt(land, px, pz) || maskAt(stacks, px, pz) || 1;
  // <<< FIELDS

  const pack = new Float32Array(N_VEC4 * 4);
  for (let j = 0; j < NZ; j++) {
    const pz = Z0 + j * HZ;
    for (let i = 0; i < NX; i++) {
      const px = X0 + i * HX;
      // Expanding ring search over the buckets, stopping only once the best
      // distance found is inside the ring already scanned - so it is exact,
      // not a nearest-bucket approximation.
      let best = Infinity, bo = -1, bdx = 0, bdz = 0;
      const ci = Math.min(bnx - 1, Math.max(0, Math.floor((px - X0) / BS)));
      const cj = Math.min(bnz - 1, Math.max(0, Math.floor((pz - Z0) / BS)));
      const rMax = bnx + bnz;
      for (let r = 0; r <= rMax; r++) {
        for (let j2 = cj - r; j2 <= cj + r; j2++) {
          if (j2 < 0 || j2 >= bnz) continue;
          const edge = Math.abs(j2 - cj) === r;
          for (let i2 = ci - r; i2 <= ci + r; i2++) {
            if (i2 < 0 || i2 >= bnx) continue;
            if (r > 0 && !edge && Math.abs(i2 - ci) !== r) continue;
            const b = bucket[j2 * bnx + i2];
            for (let m = 0; m < b.length; m++) {
              const o = b[m];
              const ax = segs[o], az = segs[o + 1], vx = segs[o + 2], vz = segs[o + 3];
              const L2 = vx * vx + vz * vz;
              let t = L2 > 0 ? ((px - ax) * vx + (pz - az) * vz) / L2 : 0;
              t = t < 0 ? 0 : t > 1 ? 1 : t;
              const dx = px - (ax + t * vx), dz = pz - (az + t * vz);
              const dd = dx * dx + dz * dz;
              if (dd < best) { best = dd; bo = o; bdx = dx; bdz = dz; }
            }
          }
        }
        if (bo >= 0 && Math.sqrt(best) <= r * BS) break;
      }
      let d = Math.sqrt(best);
      if (bo >= 0 && (bdx * segs[bo + 4] + bdz * segs[bo + 5]) < 0) d = -d;
      // >>> FIELDS
      // Beyond one DSM cell of the contour the flood-fill mask is the
      // topological authority: it is the same mask the landform uses. signAt()
      // above says which survey is asked and what "no survey" means; the
      // threshold, the Math.abs and the one-cell guard are unchanged.
      //
      // The paragraph that used to stand here priced the eastern strip as
      // "125 x 711 m of water the survey does not cover" getting no surf, and
      // put it on the "still weak" list. That was wrong in kind, not in degree.
      // Measured on the shipped tree before this change, on a 5 m lattice, at
      // points outside BOTH survey rectangles - where the model draws no land at
      // all and raid/gate.js reports 30 to 9999 m of clear water:
      //
      //   0.0882 km2 inside the field box read d < 0, i.e. LAND over open sea;
      //   1.3125 km2 more east of the box, carried there by shoreField()'s own
      //     linear continuation, which does not converge - d reached -1995 m at
      //     2 km east, the limit of the sweep rather than of the error;
      //   the band was world z 6140..6840, the same 700 m run of land on the
      //     east column, and it crosses the gate approach: at z = 6800 the field
      //     read -120 m at the box edge, -225 m at x = -4900 and -322 m at
      //     x = -4803, which is the player's own entry longitude.
      //
      // And the cost was not "no surf". surfTrain() does stop at shoreD <= 0.2,
      // but shaders.js:1493 then takes bedDepth(d, 40) on its LANDWARD branch,
      // d * 3/40, so hShoal went NEGATIVE, max(hShoal, 0) pinned it at 0 and the
      // bed-return term saturated at 1.0 - full suspended-sand shallows over
      // water the same shader was drawing as open sea. A wrong sign is not a
      // missing detail; it is the other answer.
      if (d > ARENA_GRID.step || d < -ARENA_GRID.step) d = signAt(px, pz) * Math.abs(d);
      // <<< FIELDS
      const code = Math.max(0, Math.min(Q_BITS - 1,
        Math.round((Math.max(D_MIN, Math.min(D_MAX, d)) - D_MIN) / Q_SCALE)));
      const idx = j * NX + i, f = idx >> 1;
      pack[f] = (idx & 1) === 0 ? code * Q_BITS : pack[f] + code;
    }
  }
  return { pack, nSeg, segs };
}

const T0 = SHORE_ON && globalThis.performance ? globalThis.performance.now() : 0;
const BUILT = SHORE_ON ? build() : null;

// THE ONE TABLE. sea-glsl.js copies this verbatim into the uniform block and
// shoreField() below decodes it; there is no other copy of the field anywhere.
export const SHORE_PACK = BUILT ? BUILT.pack : new Float32Array(0);
// The waterline itself, kept only so the gates can check the field against the
// contour it was built from. Nothing in the draw or the ride path reads it.
export const SHORE_SEGS = BUILT ? BUILT.segs : new Float64Array(0);
export const SHORE_BUILD_MS = BUILT && globalThis.performance
  ? globalThis.performance.now() - T0 : 0;

// One quantised node, decoded exactly as the GLSL decodes it.
function nodeAt(i, j) {
  const idx = j * NX + i, f = idx >> 1;
  const p = SHORE_PACK[f];
  const hi = Math.floor(p / Q_BITS);
  return ((idx & 1) === 0 ? hi : p - hi * Q_BITS) * Q_SCALE + D_MIN;
}

// ---------------------------------------------------------------------------
// THE SAMPLER. Returns signed distance offshore and the UNIT gradient of it -
// the direction a crest faces - from ONE bilinear cell, four taps, with no
// extra reads for the gradient. That is the point of a distance field: the
// crest direction falls out of the same four numbers, where Bournemouth's
// shoreline needs two further table reads to difference mhw().
//
// PHYSICS NOTE. Making d the only across-shore coordinate makes the crests
// iso-distance contours of the shoreline, i.e. they wrap the headland. That is
// not a convenience: it is the shallow-water refraction limit, where a shoaling
// train turns to run parallel to the depth contours. It is also why SURF.KO,
// the alongshore wavenumber that peels Bournemouth's crests, is dropped here -
// see surfChunk() in sea-surf.js.
//
// out is caller-owned, [d, gx, gz]. Never allocates.
const _g = [0, 0, 0];
export function shoreField(x, z, out) {
  const o = out || _g;
  if (!SHORE_ON) { o[0] = 0; o[1] = 0; o[2] = 1; return o; }
  const cx = x < X0 ? X0 : x > X1 ? X1 : x;
  const cz = z < Z0 ? Z0 : z > Z1 ? Z1 : z;
  const u = (cx - X0) / HX, v = (cz - Z0) / HZ;
  let i = Math.floor(u), j = Math.floor(v);
  if (i > NX - 2) i = NX - 2; if (i < 0) i = 0;
  if (j > NZ - 2) j = NZ - 2; if (j < 0) j = 0;
  const fu = u - i, fv = v - j;
  const a = nodeAt(i, j), b = nodeAt(i + 1, j), c = nodeAt(i, j + 1), e = nodeAt(i + 1, j + 1);
  const lo = a + (b - a) * fu, hi = c + (e - c) * fu;
  const d = lo + (hi - lo) * fv;
  let gx = ((b - a) + ((e - c) - (b - a)) * fv) / HX;
  let gz = ((c - a) + ((e - b) - (c - a)) * fu) / HZ;
  const gl = Math.max(Math.hypot(gx, gz), 1e-6);
  gx /= gl; gz /= gl;
  // OUTSIDE THE BOX the field is continued LINEARLY along its own gradient,
  // d += dot(P - edge, grad), not by adding the raw distance to the box. The
  // difference matters where the coast runs off an edge - the south edge is
  // 1.2 km from the stacks and well inside the water mesh's 1.9 km reach. Unit
  // -rate growth would have cut the surf band off along a straight line there;
  // a gradient continuation carries the band straight on, which is the right
  // answer for a locally straight shore and is exact for one. It is also
  // continuous at the boundary, so the box edge is not a crease.
  o[0] = d + (x - cx) * gx + (z - cz) * gz;
  o[1] = gx; o[2] = gz;
  return o;
}
