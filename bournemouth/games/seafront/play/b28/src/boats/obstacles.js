// What a boat can hit (tmp-tr41): the beach floor, and everything solid that
// stands in the water - pier legs, arches, trestles, groynes, Boscombe pier.
//
// THE PIER IS NOT HAND-COPIED HERE. The neck and head are being rebuilt in
// parallel and any leg list typed into this file would go stale on the next
// pass. Instead the occupancy grid is RASTERISED FROM THE REAL COAST MESH
// (buildCoast(), the same geometry the renderer draws): every non-sand triangle
// that reaches into the band a hull and its driver occupy (y -1.2 .. +2.2 m
// about still water) marks the 0.5 m cells its footprint covers. A leg moved by
// a later pass moves the wall with it. Structure whose underside is above 2.2 m
// (the deck, the wide-span soffits) stays passable, as it would be for a RIB.
//
// The beach floor is analytic and mirrors coast.js's lofted ribbon exactly:
// y = 3.0 at the seawall (coast z = 0), 0 at mean high water (z = mhwOffset(x)),
// -0.9 at MHW + 14 m, then a seabed continuing at the same 0.064 slope. Coast
// dry sand above +0.25 m is also a wall, so a boat can ground in the shallows
// and slide but can never be driven up the beach.
//
// >>> SEABED
// ⚠️ THAT PARAGRAPH DESCRIBES BOURNEMOUTH AND ONLY BOURNEMOUTH. `mhwOffset(x)` is
// Bournemouth's table and is meaningless at the Old Harry arena, which is 8.6 km
// along the same frame. The block above the class says what the profile really is,
// what it is read off at the arena, and what was wrong before tmp-tr177.
// <<< SEABED

import { COAST, mhwOffset, MAT } from '../gl/coast.js';
// >>> CLEANUP
// tmp-tr174: the index-buffer range the Harbour Mouth channel marking occupies in the coast
// mesh, so the rasteriser below can skip it. See the block at `build()`. No cycle: this file
// already imports coast.js, and coast.js already imports gate-buoys.js, so it was in this
// module's transitive import set before this line was written.
import { MARK_INDEX_RANGES } from '../gl/gate-buoys.js';
// <<< CLEANUP
// >>> SEABED
// tmp-tr177: the arena's own shoreline, so the seabed below is built in the frame the
// player is actually in. sea-shore.js is THE shore field for the Old Harry arena - the
// same quantised array the water shader decodes - so this is the existing source, not a
// second one. No cycle: sea-shore.js imports gl/coast.js, gl/arena-oldharry.js and
// gl/arena-oldharry-data.js, all of which were already in this module's transitive import
// set, and it imports nothing from boats/. With the arena flag off its build() never runs
// and SHORE_PACK is a zero-length array, so an ordinary Bournemouth page pays nothing.
import { SHORE_ON, shoreField } from '../sea-shore.js';
// The two survey rectangles the field was built from, and the ONLY places it may be
// asked whether a point is land - see WHERE THE FIELD MAY BE TRUSTED below. This is the
// same data module sea-shore.js and gl/arena-oldharry.js both read, and gl/coast.js
// already pulls it into every page through gl/arena-oldharry.js, so it costs nothing.
import { ARENA_GRID, ARENA_STACKS } from '../gl/arena-oldharry-data.js';
// <<< SEABED

const CELL = 0.5;
const Y_LO = -1.2, Y_HI = 2.2;
const DRY_WALL = 0.25;
const key = (ix, iz) => (ix + 20000) * 40000 + (iz + 20000);

// >>> SEABED
// THE SAME PROFILE, IN THE ONLY COORDINATE IT WAS EVER A FUNCTION OF (tmp-tr177).
//
// WHAT WAS WRONG. `ground()` and `blocked()` located the waterline with `mhwOffset(cx)`,
// which is Bournemouth's mean-high-water table and covers coast X -600..2800. The Old
// Harry arena's field box is coast X -8240..-4775, so every sample clamped to the table's
// end value of 38 m and the whole arena came out as flat seabed at the -14 m floor with the
// dry-beach test permanently false. That is the same defect the water shader's surf gradient
// had (tmp-tr176), in the same family, one file along.
//
// WHAT THE PROFILE ACTUALLY IS. Read it as a function of d, the SIGNED DISTANCE OFFSHORE
// of the waterline, and Bournemouth's four branches collapse to three with no number
// changed: d <= 0 is beach, 0 < d <= 14 shoals to -0.9 m, and past that the seabed runs
// out at 0.064 to a -14 m floor. At Bournemouth d is `cz - mhwOffset(cx)` - a straight
// coast with one seaward direction - and the beach ramp rises 3.0 m over the local beach
// width. At the arena there is no such width and no seawall to put 3.0 m on top of, so the
// landward branch is the MIRROR of the shoal the file already has: the one straight line
// -0.9/14 = 0.0643 through the waterline, capped at the same 3.0 m ceiling.
//
// ⚠️ THAT SLOPE IS NOT A NEW NUMBER AND NOT A MEASUREMENT. It is this file's own 0.9/14,
// used landward as well as seaward. Two independent checks say it is in the right place
// rather than merely convenient: Bournemouth's own beach ramp is 3.0/w over the table's
// range w = 35..70 m, i.e. slope 0.043..0.086, and 0.0643 sits inside it; and sea-shore.js
// measured this arena's intertidal run from the LIDAR - 1.45 m of drop over p50 25 m on the
// chalk-backed run and 45 m on the sand-backed one, i.e. 0.058 and 0.032. So the mirror is
// at the steep end of what this headland actually does, which is the conservative direction:
// the dry wall lands 3.9 m inside the waterline rather than further up the sand.
const IN_SLOPE = 0.9 / 14;                      // m per m, the shoal's own slope
const BEACH_RUN = 3.0 / IN_SLOPE;               // 46.67 m: where the mirror meets the 3.0 m cap
const DRY_D = -DRY_WALL / IN_SLOPE;             // -3.89 m: where it passes the dry-sand wall

// ---------------------------------------------------------------------------
// ⚠️ WHERE THE FIELD MAY BE TRUSTED, AND WHY THIS IS NOT BELT AND BRACES
//
// The first draft of this dispatch used sea-shore.js's field box - the UNION of the two
// survey grids - plus enough margin for the profile to bottom out, and it BROKE THE LEVEL.
// sea-shore.js's build() carries a documented weak spot: the 125 m strip east of the land
// grid is covered by no land survey at all, so its sign is taken from the last surveyed
// COLUMN, clamped. Where that column is headland the strip reads as land, and the field's
// linear continuation carries that on east, out over the channel. Measured on this tree
// against raid/gate.js's independent field over the same survey, on a 10 m lattice across
// the box plus 218.75 m: the shore field calls 2,313 nodes (0.231 km2) dry beach that
// gate.js calls more than 20 m of clear water, and 2,311 of those 2,313 lie OUTSIDE BOTH
// SURVEY RECTANGLES. Hung on that, the dry wall closed 1,782 points of the corsair lane
// and stood across open water 200 m from the player's own spawn.
//
// So the arena arm is asked ONLY where the survey has data. Outside both rectangles the
// model has no arena land - buildArenaMesh() builds from these same two grids and nothing
// else - so the right answer there is open water with a flat bed, which is exactly what
// the Bournemouth arm already returns 8.6 km from Bournemouth. That is not a coincidence
// being leaned on: it is stated here so a later reader knows it is the intended path.
//
// This does NOT lose the wall anywhere real. The whole Studland shore - the only sand in
// the arena, and the only place the rasterised grid cannot help because build() skips
// MAT.SAND - is inside the land rectangle. Chalk in the uncovered strip is MAT.PAINTED and
// is therefore still a rasterised wall, as it was before this change.
const OXW = -COAST.startX, OZW = -COAST.startZ;
const rect = (g) => [g.x0 + OXW, g.x0 + (g.nx - 1) * g.step + OXW,
  g.z0 + OZW, g.z0 + (g.nz - 1) * g.step + OZW];
const R_LAND = rect(ARENA_GRID), R_STACK = rect(ARENA_STACKS);
const inR = (R, x, z) => x >= R[0] && x <= R[1] && z >= R[2] && z <= R[3];
const inArena = (wx, wz) => inR(R_LAND, wx, wz) || inR(R_STACK, wx, wz);

// Caller-owned scratch for shoreField(); never allocates, read immediately.
const _sf = [0, 0, 0];
// <<< SEABED

export class Obstacles {
  constructor() {
    this.cells = new Set();
    // >>> CAMCLIP
    // The TOP of whatever marked each cell: the highest vertex of the unclipped triangle. The
    // collision grid never needed it - a hull is inside the band or it is not - but the chase
    // camera does: it flies at 1.9-2.9 m and has to pass OVER a groyne and never THROUGH a
    // pier leg, and those two are the same kind of cell. Written alongside `cells`, never
    // instead of it; `cells` comes out bit-identical, so no hull meets a different wall.
    this.tops = new Map();
    // <<< CAMCLIP
    this.groundSlope = [0, 0];
    this.built = false;
    this.stats = { tris: 0, used: 0, cells: 0, ms: 0 };
  }

  // mesh: { data, index, count, stride } from buildCoast(), in world coordinates
// (coast.js translates by OX/OZ = -COAST.start). stride 40 bytes =
  // pos(3) normal(3) colour(3) material(1).
  build(mesh) {
    const t0 = (typeof performance !== 'undefined' ? performance : Date).now();
    const d = mesh.data, idx = mesh.index, S = mesh.stride / 4;
    const P = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    let used = 0;
    // >>> CLEANUP
    // tmp-tr174: THE CHANNEL MARKING IS NOT A WALL.
    //
    // This loop turns every non-sand triangle in the y band into blocked cells, which is right
    // for pier legs, groynes and trestles - things that really do stop a hull. gate-buoys.js
    // appends the Harbour Mouth marking to this same coast mesh, so eighteen floating marks
    // were silently rasterised into the grid too: 17 blocked cells across the gate approach,
    // where there had been none. The corsairs never read this grid, so the wall applied to the
    // player alone. That is the larger half of the measured 12/16 -> 5/16 difficulty drift.
    //
    // ⚠️ THE MARKS STILL COLLIDE. raid/buoy-collide.js gives them a deliberate, calibrated
    // knock - roughly 9 m of ground lost to a pin, a solid stop to a gatepost - which the owner
    // asked for and which is untouched by this and by anything in this file. Only the
    // INCIDENTAL wall that this rasteriser inferred from the mesh is removed. A mark is still
    // something you hit; it is no longer something you cannot pass.
    //
    // The ranges come from gate-buoys.js itself, recorded where the geometry actually landed,
    // so moving the buoys moves the exemption with them. Empty whenever the arena flag is off,
    // so the Bournemouth world does not even read it. `t` ascends, so the cursor is O(1).
    const SKIP = MARK_INDEX_RANGES;
    let sk = 0;
    // <<< CLEANUP
    for (let t = 0; t < mesh.count; t += 3) {
      // >>> CLEANUP
      while (sk < SKIP.length && t >= SKIP[sk][1]) sk++;
      if (sk < SKIP.length && t >= SKIP[sk][0]) continue;
      // <<< CLEANUP
      const a = idx[t] * S, b = idx[t + 1] * S, c = idx[t + 2] * S;
      if (Math.round(d[a + 9]) === MAT.SAND) continue;
      const ya = d[a + 1], yb = d[b + 1], yc = d[c + 1];
      if (Math.max(ya, yb, yc) < Y_LO || Math.min(ya, yb, yc) > Y_HI) continue;
      P[0][0] = d[a]; P[0][1] = ya; P[0][2] = d[a + 2];
      P[1][0] = d[b]; P[1][1] = yb; P[1][2] = d[b + 2];
      P[2][0] = d[c]; P[2][1] = yc; P[2][2] = d[c + 2];
      const poly = clipY(clipY(P, Y_LO, 1), Y_HI, -1);
      if (poly.length < 3) continue;
      used++;
      const top = Math.max(ya, yb, yc);   // >>> CAMCLIP (see the constructor)
      for (let i = 1; i + 1 < poly.length; i++) this._rasterTri(poly[0], poly[i], poly[i + 1], top);
    }
    this.built = true;
    this.stats = { tris: mesh.count / 3, used, cells: this.cells.size,
      ms: +((typeof performance !== 'undefined' ? performance : Date).now() - t0).toFixed(1) };
    return this;
  }

  // Mark every cell whose centre lies within half a cell diagonal of the
  // triangle's XZ footprint - conservative, and it catches the zero-area
  // footprint of a vertical face.
  _rasterTri(A, B, C, top) {
    const x0 = Math.min(A[0], B[0], C[0]), x1 = Math.max(A[0], B[0], C[0]);
    const z0 = Math.min(A[2], B[2], C[2]), z1 = Math.max(A[2], B[2], C[2]);
    const R = CELL * 0.7072;
    for (let ix = Math.floor((x0 - R) / CELL); ix <= Math.floor((x1 + R) / CELL); ix++) {
      for (let iz = Math.floor((z0 - R) / CELL); iz <= Math.floor((z1 + R) / CELL); iz++) {
        const k = key(ix, iz);
        // >>> CAMCLIP
        // A cell already marked is tested again ONLY when this triangle would raise its top,
        // so the set is unchanged and the extra work is the few taller faces over low ones.
        const had = this.tops.get(k);
        if (had !== undefined && had >= top) continue;
        const px = (ix + 0.5) * CELL, pz = (iz + 0.5) * CELL;
        if (triDist2(px, pz, A, B, C) <= R * R) { this.cells.add(k); this.tops.set(k, top); }
        // <<< CAMCLIP
      }
    }
  }

  // Ground height under a WORLD point; sets groundSlope (world d/dx, d/dz).
  ground(wx, wz) {
    // >>> SEABED
    // THE ARENA'S OWN SEABED. Same profile, same numbers, read off the arena's signed
    // distance offshore instead of Bournemouth's mean-high-water table - see the block at
    // the head of this file. The slope is now a real WORLD vector: the field hands back the
    // unit gradient of d, which is the direction the bed falls away in, and at a headland
    // that is not world +Z anywhere. Dead code with the arena flag off.
    if (SHORE_ON && inArena(wx, wz)) {
      const f = shoreField(wx, wz, _sf), d = f[0];
      let y, dd;
      if (d <= -BEACH_RUN) { y = 3.0; dd = 0; }
      else if (d <= 14) { y = -IN_SLOPE * d; dd = -IN_SLOPE; }
      else { y = Math.max(-14, -0.9 - (d - 14) * 0.064); dd = y > -14 ? -0.064 : 0; }
      this.groundSlope[0] = dd * f[1]; this.groundSlope[1] = dd * f[2];
      return y;
    }
    // <<< SEABED
    const cx = wx + COAST.startX, cz = wz + COAST.startZ;
    const w = mhwOffset(cx);
    let y, dz;
    if (cz <= 0) { y = 3.0; dz = 0; }
    else if (cz <= w) { y = 3.0 * (1 - cz / w); dz = -3.0 / w; }
    else if (cz <= w + 14) { y = -0.9 * (cz - w) / 14; dz = -0.9 / 14; }
    else { y = Math.max(-14, -0.9 - (cz - w - 14) * 0.064); dz = y > -14 ? -0.064 : 0; }
    this.groundSlope[0] = 0; this.groundSlope[1] = dz;
    return y;
  }

  // >>> CAMCLIP
  // Is there STRUCTURE at this world point, at or above height y? For the chase camera only:
  // the rasterised cells and nothing else. The dry-beach wall is deliberately not asked - a
  // camera above the sand is looking down at it, not through it.
  solidAt(wx, wz, y) {
    const t = this.tops.get(key(Math.floor(wx / CELL), Math.floor(wz / CELL)));
    return t !== undefined && t > y;
  }
  // <<< CAMCLIP

  blocked(wx, wz) {
    // >>> SEABED
    // The dry-beach wall, in the arena's frame. Exactly the test the Bournemouth line
    // below makes - "is the analytic ground above DRY_WALL here" - written against the
    // arena's profile instead of the table's, and NOT by calling ground(), because that
    // would leave groundSlope written from whichever outline point asked last.
    //
    // ⚠️ The MAT.SAND skip in build() means Studland beach contributes no cells at all, so
    // before this line there was nothing whatsoever stopping a hull on that shore.
    if (SHORE_ON && inArena(wx, wz)) {
      if (shoreField(wx, wz, _sf)[0] < DRY_D) return true;          // dry beach
      return this.cells.has(key(Math.floor(wx / CELL), Math.floor(wz / CELL)));
    }
    // <<< SEABED
    const cx = wx + COAST.startX, cz = wz + COAST.startZ;
    if (cz < mhwOffset(cx) * (1 - DRY_WALL / 3)) return true;       // dry beach
    // The coast mesh is built in WORLD (sim) coordinates (coast.js OX/OZ), so
    // the grid is keyed on world cells.
    return this.cells.has(key(Math.floor(wx / CELL), Math.floor(wz / CELL)));
  }
}

// Sutherland-Hodgman against one horizontal plane. sign 1 keeps y >= lim.
function clipY(poly, lim, sign) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    const pin = (p[1] - lim) * sign >= 0, qin = (q[1] - lim) * sign >= 0;
    if (pin) out.push(p);
    if (pin !== qin) {
      const f = (lim - p[1]) / (q[1] - p[1]);
      out.push([p[0] + (q[0] - p[0]) * f, lim, p[2] + (q[2] - p[2]) * f]);
    }
  }
  return out;
}

function segDist2(px, pz, a, b) {
  const dx = b[0] - a[0], dz = b[2] - a[2];
  const l2 = dx * dx + dz * dz;
  let f = l2 > 1e-12 ? ((px - a[0]) * dx + (pz - a[2]) * dz) / l2 : 0;
  f = f < 0 ? 0 : f > 1 ? 1 : f;
  const ex = a[0] + dx * f - px, ez = a[2] + dz * f - pz;
  return ex * ex + ez * ez;
}

function triDist2(px, pz, A, B, C) {
  const s1 = (B[0] - A[0]) * (pz - A[2]) - (B[2] - A[2]) * (px - A[0]);
  const s2 = (C[0] - B[0]) * (pz - B[2]) - (C[2] - B[2]) * (px - B[0]);
  const s3 = (A[0] - C[0]) * (pz - C[2]) - (A[2] - C[2]) * (px - C[0]);
  if ((s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0)) {
    // inside, unless the footprint is degenerate (then the edge test decides)
    if (Math.abs(s1) + Math.abs(s2) + Math.abs(s3) > 1e-9) return 0;
  }
  return Math.min(segDist2(px, pz, A, B), segDist2(px, pz, B, C), segDist2(px, pz, C, A));
}
