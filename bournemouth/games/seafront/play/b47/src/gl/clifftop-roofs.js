// The clifftop ROOFLINE - everything above the wall top (tr115, 2026-09-18).
//
// WHY THIS FILE EXISTS. coast.js (the block above PAL) says what reads at
// 300-500 m is "the BROKEN RIBBON: many small buildings, dark roofs against
// white walls, real gaps of open clifftop", and that "the contrast is carried
// by the ROOFS". Three measurements on the shipped REAL_BLD table say the
// stock does not deliver that:
//
//   1. 86.6% of the clifftop roof PLAN AREA (111,543 of 128,790 m2 over the
//      375 rows at x >= 227) is roof form 0, a flat top drawn in the BODY
//      colour. There is no dark roof on it at all - and a horizontal plane
//      34-92 m up is back-facing to an eye at y 2-12 m, so those 299 roof
//      quads contribute nothing to the picture either way.
//   2. 93.3% of the roofline is DEAD FLAT: of the 1894 occupied 1 m bins over
//      x 227..2343, 1767 adjacent pairs differ in top height by < 1 cm. A step
//      larger than 1 m happens once per 22 m.
//   3. The ribbon is not broken horizontally either - 1894 of 2116 m built
//      (89.5%), 14 gaps, longest unbroken run 289 m. That one is NOT fixed
//      here: the footprints are OSM, the gaps are where the real gaps are, and
//      deleting real buildings to manufacture sky is not a repair. What was
//      missing was the VERTICAL break, which is what this file adds.
//
// REFERENCE, form only. Owner drone frame, DJI Mini 5 Pro:
// G:\DJI\DJI FLY\dji_fly_20250923_174906_0003_1758736112725_video.mp4 at
// t = 4.0 s (3840x2160; extracted to tmp-tr115/ev/R_clifftop_0003_t4.png).
// Crop 1400x800 at (0,1200) - the Boscombe/Southbourne clifftop with
// Bournemouth Pier at the left edge: every domestic roof in it is hipped or
// gabled, and chimney stacks stand proud of the ridge on most of them.
// Crop 1500x700 at (2300,1500) - one large villa under re-roofing: a complex
// hip with two dormers and 4 chimney stacks across it and its neighbour; the
// roof plane is TALLER in the image than the wall below it.
// SUNLIT FRAME, so that is FORM ONLY (trap 5). Nothing here invents a colour:
// every element is drawn in an existing PAL entry, and no PAL value moves.
//
// The model's clifftop stock is not that villa stock, though - it is mostly
// big sliced blocks. Of the 195 small flat clifftop rows (<= 460 m2, longest
// side <= 30 m) only 24 stand alone; 171 are slices of a larger building and
// are correctly flat. So the villa roof goes on those 24, and the other 255
// get the seafront-block treatment instead: a parapet with a soffit line, and
// a lift over-run / plant housing breaking the top edge.
//
// SCALE CHECK, so none of this is sub-pixel. C_royalbath renders 900 px at
// 38 deg from 274 m: 1 m = 5.0 px. M_t94 renders 900 px at 18.9 deg from
// 400 m: 1 m = 6.8 px. The 0.85 m parapet is 4-6 px, a 2.4-3.8 m over-run is
// 12-26 px, a 1.1-2.2 m chimney is 6-15 px. The long view X_long_course is
// 1 m = 1.3 px, where only the over-runs survive - stated, not hidden.
//
// DEPTH DISCIPLINE (tr48 found 4 cm steps depth-fight at this range). Nothing
// here is coplanar with anything: the parapet lives entirely ABOVE the wall
// top where no stock surface exists, its soffit is 0.02-0.15 m PROUD of the
// wall so it never meets the flat roof quad (which covers the footprint,
// inboard), the over-run's vertical sides CROSS the roof quad rather than
// lying on it, and a chimney is sunk 0.9 m into the roof volume it stands on.
// The parapet's 0.30 m oversail clears the stock 0.06 m windows by 24 cm, the
// same margin clifftop-facades.js uses for its own 0.32-0.50 m lips - and those
// all sit below yT - 0.23, so they share no height band with this at all.
//
// Nothing is emitted where it would be buried in a neighbouring box, and
// nothing is emitted below the crest sightline, both tested the way
// clifftop-facades.js tests them.

const X_MIN = 227;      // clifftop only; the pier-root and promenade stock is not ours
const GY_MIN = 8;       // and neither is anything standing at promenade level

// deterministic per-building jitter - no Math.random, the mesh must hash the same
const hash1 = (n) => { let h = (n * 2654435761) >>> 0; h ^= h >>> 15; h = (h * 2246822519) >>> 0; h ^= h >>> 13; return ((h >>> 0) % 4096) / 4096; };

export function buildClifftopRoofs(m, REAL_BLD, RS, PAL, MAT, OX, OZ, FLOOR, crestYExact, crestZExact, C, treeMix) {
  const BODY = [PAL.white, PAL.render, PAL.cream, PAL.brick, PAL.stone];
  const V = (x, y, z, nx, ny, nz, c) => m.pushC(x + OX, y, z + OZ, nx, ny, nz, c, MAT.CONCRETE);

  const boxes = [];
  for (let q = 0; q < REAL_BLD.length; q += RS) {
    const [x, z, hu, hv, angM, gy, h, roof, rh, col, k] = REAL_BLD.slice(q, q + RS);
    const ang = angM / 1000;
    boxes.push({ x, z, hu, hv, ca: Math.cos(ang), sa: Math.sin(ang), gy, h, roof, rh, col, k,
      ylo: gy - (gy < 4 ? 1.5 : 6), yhi: gy + h + (roof ? rh : 0) });
  }
  // a point is "buried" if it falls inside some OTHER massing box at that height
  const inside = (px, py, pz, self) => {
    for (const b of boxes) {
      if (b === self || py <= b.ylo || py >= b.yhi) continue;
      const dx = px - b.x, dz = pz - b.z;
      if (Math.abs(dx * b.ca + dz * b.sa) < b.hu - 0.01 && Math.abs(-dx * b.sa + dz * b.ca) < b.hv - 0.01) return true;
    }
    return false;
  };
  // the same crest sightline the stock and the facades module use: an eye at
  // sea level 300 m out cannot see below this height on a face at depth zf
  const sightAt = (x, zf, gy) => {
    if (gy < 4) return -Infinity;
    const cy = crestYExact(x), cz = crestZExact(x);
    if (zf > cz) return -Infinity;
    return cy + Math.max(0, cz - zf) * (cy - 2) / (300 - cz) - 2;
  };

  const ours = boxes.filter((b) => b.x >= X_MIN && b.gy >= GY_MIN);
  const byK = new Map();
  for (const b of ours) { if (!byK.has(b.k)) byK.set(b.k, []); byK.get(b.k).push(b); }
  // a row is a SLICE if another row of the same building abuts it in plan
  const abuts = (a, b) => {
    const dx = b.x - a.x, dz = b.z - a.z;
    return Math.abs(dx * a.ca + dz * a.sa) < a.hu + b.hu + 1.2 && Math.abs(-dx * a.sa + dz * a.ca) < a.hv + b.hv + 1.2;
  };

  const stats = { parapet: 0, hip: 0, chimney: 0, crown: 0, tris: 0 };
  const t0 = m.i.length;

  const hipped = new Set();
  // The DSM's OWN pitched share, per 200 m stretch of the modelled coast, is
  // the only in-range evidence there is for which stretch is residential and
  // which is blocks (counted off the shipped table, tmp-tr115/RESULT.md §2):
  //     200-400  0.0%   400-600 13.9%   600-800  6.9%   800-1000 16.7%
  //    1000-1200 28.2%  1200-1400 17.9%  1400-1600 19.0%  1600-1800 16.0%
  //    1800-2000  0.0%  2000-2200 22.7%  2200-2400 54.2%
  // Exactly one stretch clears 35%, and it is x >= 2200 - which is also the
  // stretch BOTH owner aerials actually show (pitched clay roofs and chimney
  // stacks). x 200-400 reads 0% pitched with tops to 63 m: that is the town
  // centre block strip, and cited_roofs.jpg shows white towers there. For
  // x 400-2200 there is NO aerial evidence either way, so those rows KEEP THE
  // FLAT TOP THE DSM GAVE THEM. They are not guessed at.
  const EVIDENCED_X = 2200;

  // ---- 1. a real roof on the standalone small HOUSES, evidenced stretch only
  // x >= 2200 only. Flat in the table, <= 600 m2, longest side <= 30 m, wall
  // <= 16 m, and with no same-building neighbour abutting it - a whole small
  // building, not a slice of a block. That is 6 rows. It is small because the
  // DSM already got that stretch mostly right: 54.2% of its rows are pitched
  // already, which is why there is little left to repair. Ridge along the
  // LONGER axis; rise 0.55 x half-span, the MEDIAN of the 92 rows the DSM did
  // classify as pitched (p10 0.54, p90 0.96), so this is the table's own pitch
  // and not an invented one. A row that takes a roof here does NOT also take a
  // parapet.
  const capped = [];
  for (const b of ours) {
    if (b.roof !== 0 || b.h < 4) continue;
    const area = 4 * b.hu * b.hv, lng = Math.max(2 * b.hu, 2 * b.hv);
    if (b.x < EVIDENCED_X || area > 600 || lng > 30 || b.h > 16) continue;
    if ((byK.get(b.k) || []).some((o) => o !== b && abuts(b, o))) continue;
    const { x, z, hu, hv, ca, sa } = b, yE = b.gy + b.h;
    const rise = Math.min(3.2, Math.max(1.2, 0.55 * Math.min(hu, hv)));
    const P = (u, v) => [x + u * ca - v * sa, z + u * sa + v * ca];
    const zf = z + Math.abs(hv * ca) + Math.abs(hu * sa);
    if (yE + rise < sightAt(x, zf, b.gy)) continue;
    const rc = (b.col & 1) ? PAL.roofRed : PAL.roof;
    const gable = hash1(b.k * 11 + 5) < 0.25;            // the frame shows mostly hips
    // ridge along u when the box is longer in u, else along v (swap the axes)
    const alongU = hu >= hv;
    const RU = alongU ? ca : -sa, RV = alongU ? sa : ca;  // ridge direction
    const HU = alongU ? hu : hv, HV = alongU ? hv : hu;
    const Q = (u, v) => [x + u * RU - v * RV, z + u * RV + v * RU];
    const r = gable ? HU : Math.max(0, HU - HV);
    const hgt = rise, l = Math.hypot(hgt, HV) || 1, ny = HV / l, nh = hgt / l;
    const A = Q(-HU, HV), B = Q(HU, HV), Cc = Q(HU, -HV), D = Q(-HU, -HV), R0 = Q(-r, 0), R1 = Q(r, 0);
    m.quad(V(A[0], yE, A[1], -RV * nh, ny, RU * nh, rc), V(B[0], yE, B[1], -RV * nh, ny, RU * nh, rc),
      V(R1[0], yE + hgt, R1[1], -RV * nh, ny, RU * nh, rc), V(R0[0], yE + hgt, R0[1], -RV * nh, ny, RU * nh, rc));
    m.quad(V(Cc[0], yE, Cc[1], RV * nh, ny, -RU * nh, rc), V(D[0], yE, D[1], RV * nh, ny, -RU * nh, rc),
      V(R0[0], yE + hgt, R0[1], RV * nh, ny, -RU * nh, rc), V(R1[0], yE + hgt, R1[1], RV * nh, ny, -RU * nh, rc));
    const run = HU - r, le = Math.hypot(hgt, run) || 1;
    const ex = gable ? 1 : hgt / le, ey = gable ? 0 : run / le, ec = gable ? BODY[b.col >> 1] : rc;
    m.tri(V(D[0], yE, D[1], -RU * ex, ey, -RV * ex, ec), V(A[0], yE, A[1], -RU * ex, ey, -RV * ex, ec),
      V(R0[0], yE + hgt, R0[1], -RU * ex, ey, -RV * ex, ec));
    m.tri(V(B[0], yE, B[1], RU * ex, ey, RV * ex, ec), V(Cc[0], yE, Cc[1], RU * ex, ey, RV * ex, ec),
      V(R1[0], yE + hgt, R1[1], RU * ex, ey, RV * ex, ec));
    capped.push({ b, ridgeY: yE + hgt, RU, RV, HU, alongU });
    hipped.add(b);
    stats.hip++;
  }

  // ---- 2. parapet + soffit line on the flat blocks -------------------------
  // A seafront block does not stop dead at the top floor: it carries a solid
  // parapet, and the coping oversails it. The oversail is the point - its
  // soffit faces down, takes no sun, and rules a dark line under the top edge.
  //
  // CUT BACK, 2026-09-18 rebalance. This ran on every visible face and cost
  // 1,988 triangles - half the pass - to move 0.39% of pixels in the long view.
  // It now runs on the MOST SEAWARD face only, which is 279 of the 762 visible
  // faces (37%), for 1,116 triangles. The end faces bought a corner return that
  // no judged camera is square enough to see, and the triangles went to trees,
  // which the reference says carry 58.4% of the real clifftop skyline.
  const PD = 0.30;
  for (const b of ours) {
    if (b.roof !== 0 || b.h < 4 || hipped.has(b)) continue;
    // per BUILDING, not per row: the slices of one block share a parapet, and
    // two neighbouring blocks step against each other. Costs no triangles.
    const PH = 0.62 + hash1(b.k * 23 + 9) * 0.50;
    const { x, z, hu, hv, ca, sa } = b, yT = b.gy + b.h;
    const body = BODY[b.col >> 1];
    const P = (u, v) => [x + u * ca - v * sa, z + u * sa + v * ca];
    const F = [[P(-hu, hv), P(hu, hv), -sa, ca, 2 * hu], [P(hu, -hv), P(-hu, -hv), sa, -ca, 2 * hu],
      [P(hu, hv), P(hu, -hv), ca, sa, 2 * hv], [P(-hu, -hv), P(-hu, hv), -ca, -sa, 2 * hv]];
    let best = null;
    for (const f of F) if (f[4] >= 3 && (!best || f[3] > best[3])) best = f;
    for (const f of best ? [best] : []) {
      const [A, B, nx, nz, w] = f;
      if (nz < -0.45 || w < 3) continue;                 // landward faces are never seen
      const zf = (A[1] + B[1]) * 0.5;
      if (yT + PH < sightAt(x, zf, b.gy)) continue;
      const tx = (B[0] - A[0]) / w, tz = (B[1] - A[1]) / w;
      const pt = (s, d) => [A[0] + tx * s + nx * d, A[1] + tz * s + nz * d];
      // buried behind a neighbour for its whole length? then it is not a top edge
      const mid = pt(w * 0.5, PD), e0 = pt(0.6, PD), e1 = pt(w - 0.6, PD);
      if (inside(mid[0], yT + PH * 0.5, mid[1], b)) continue;
      if (inside(e0[0], yT + PH * 0.5, e0[1], b) && inside(e1[0], yT + PH * 0.5, e1[1], b)) continue;
      const s0 = -PD, s1 = w + PD;                       // oversail the corners so none opens
      const a = pt(s0, PD), e = pt(s1, PD);
      m.quad(V(a[0], yT, a[1], nx, 0, nz, body), V(e[0], yT, e[1], nx, 0, nz, body),
        V(e[0], yT + PH, e[1], nx, 0, nz, body), V(a[0], yT + PH, a[1], nx, 0, nz, body));
      const c0 = pt(s0, 0.02), c1 = pt(s1, 0.02);        // the dark rule under the oversail
      m.quad(V(c0[0], yT, c0[1], 0, -1, 0, body), V(c1[0], yT, c1[1], 0, -1, 0, body),
        V(e[0], yT, e[1], 0, -1, 0, body), V(a[0], yT, a[1], 0, -1, 0, body));
      stats.parapet++;
    }
  }

  // ---- 4. chimney stacks --------------------------------------------------
  // The most characteristic thing on that clifftop and the thing that actually
  // notches the skyline: on the pitched rows the table already has, and on the
  // 24 this file just capped. One stack per row, on the ridge, sunk 0.9 m into
  // the roof so no gap can open under it. Brick, an existing PAL entry.
  const stack = (x, z, ca, sa, ridgeY, up) => {
    const S = 0.48, y0 = ridgeY - 0.9, y1 = ridgeY + up;
    const cor = [[-S, S], [S, S], [S, -S], [-S, -S]].map(([u, v]) => [x + u * ca - v * sa, z + u * sa + v * ca]);
    const N = [[-sa, ca], [ca, sa], [sa, -ca], [-ca, -sa]];
    for (let s = 0; s < 4; s++) {
      const A = cor[s], B = cor[(s + 1) % 4], n = N[s];
      m.quad(V(A[0], y0, A[1], n[0], 0, n[1], PAL.brick), V(B[0], y0, B[1], n[0], 0, n[1], PAL.brick),
        V(B[0], y1, B[1], n[0], 0, n[1], PAL.brick), V(A[0], y1, A[1], n[0], 0, n[1], PAL.brick));
    }
    m.quad(V(cor[0][0], y1, cor[0][1], 0, 1, 0, PAL.brick), V(cor[1][0], y1, cor[1][1], 0, 1, 0, PAL.brick),
      V(cor[2][0], y1, cor[2][1], 0, 1, 0, PAL.brick), V(cor[3][0], y1, cor[3][1], 0, 1, 0, PAL.brick));
    stats.chimney++;
  };
  for (const b of ours) {
    if (b.roof === 0) continue;
    const ridgeY = b.gy + b.h + b.rh;
    const alongU = (b.roof === 1 || b.roof === 3);
    const HU = alongU ? b.hu : b.hv;
    const RU = alongU ? b.ca : -b.sa, RV = alongU ? b.sa : b.ca;
    const f = (hash1(b.k * 13 + 1) - 0.5) * 1.3;          // -0.65..0.65 along the ridge
    const px = b.x + f * HU * RU, pz = b.z + f * HU * RV;
    const up = 1.1 + hash1(b.k * 17 + 2) * 1.1;
    const zf = pz + 0.5;
    if (ridgeY + up < sightAt(b.x, zf, b.gy)) continue;
    if (inside(px, ridgeY + up * 0.5, pz, b)) continue;
    stack(px, pz, b.ca, b.sa, ridgeY, up);
  }
  for (const c of capped) {
    const b = c.b;
    const f = (hash1(b.k * 13 + 1) - 0.5) * 1.3;
    const px = b.x + f * c.HU * c.RU, pz = b.z + f * c.HU * c.RV;
    const up = 1.1 + hash1(b.k * 17 + 2) * 1.1;
    if (c.ridgeY + up < sightAt(b.x, pz + 0.5, b.gy)) continue;
    if (inside(px, c.ridgeY + up * 0.5, pz, b)) continue;
    stack(px, pz, b.ca, b.sa, c.ridgeY, up);
  }

  // ---- 5. CLIFFTOP TREES ---------------------------------------------------
  // THE MEASUREMENT THAT PUT THESE HERE. Owner aerial, a broadside of the
  // clifftop: G:\DJI\DJI FLY\SouthbourneCliffs.mp4 at t = 22 s (1600x2844,
  // also at tmp-tr117/ev/sc_t22.jpg). Taking the topmost non-sky pixel in each
  // of the 1600 columns inside the band y 1150-1400 - which is below the cloud
  // layer, so in that band "sky" is blue and a white pixel is a building - and
  // classifying the pixel 7 px under that edge by luminance:
  //     DARK CANOPY (lum < 105)   934 columns   58.4%
  //     PALE BUILT  (lum >= 150)  589 columns   36.8%
  //     mid tone                   77 columns    4.8%
  //     47 tree runs, longest 174 px; canopy/built alternation 1 per 17 px
  // FIFTY-EIGHT PER CENT OF THE REAL CLIFFTOP SKYLINE IS TREE, and it changes
  // hands with the buildings every 17 px. The model east of x ~ 390 has NONE:
  // coast.js's own buildClifftopPlanting() says it stops where treeMix cubed
  // falls below 0.60 (trees, x < ~390) because no judged camera looked past
  // there. Every camera that judges the clifftop BUILDINGS looks at x 400-2340,
  // so that budget decision is exactly what leaves them a bare ribbon.
  //
  // This is also the only honest way to break that ribbon. The horizontal gaps
  // are OpenStreetMap's and deleting buildings to manufacture sky would be
  // fabrication - but a tree in the front garden OCCLUDES a building without
  // touching REAL_BLD, and occlusion is what the reference shows doing the work.
  //
  // WHAT IS EVIDENCE AND WHAT IS EXTRAPOLATION, said out loud. sc_t22 is the
  // Southbourne clifftop, immediately EAST of the modelled x range, and
  // dji_fly_20250923_174906_0003 at t = 4 s shows that same clifftop from the
  // air with large crowns standing between and above the houses. Both are
  // direct evidence for the eastern end. The middle, x 600-2000, is
  // EXTRAPOLATED along a continuous clifftop and is not separately evidenced.
  // treeMix() is deliberately NOT used to gate density: it is sourced for the
  // cliff FACE (trees against scrub on the slope) and has fallen to 0.15 by
  // x 1160, yet sc_t22 sits at the scrub end of that ramp and still measures
  // 58.4% canopy on the PLATEAU. Face and plateau are different surfaces and
  // treeMix governs one of them; here it only leans the colour.
  //
  // FORM ONLY (trap 5): both frames are sunlit. NO COLOUR IS TAKEN FROM THEM
  // AND NO NEW COLOUR IS CREATED. Crowns use coast.js's own already-calibrated
  // vegetation keys - C.cliffPine, which that file records as rendering
  // (75,81,70) at green index +8.6, C.cliffTop (82,87,70) GI +10.9 and
  // C.cliffScrubDry (83,87,71) GI +9.5 - on MAT.PAINTED, which is what its
  // "MAT.PAINTED, NOT MAT.CLIFF, AND THIS IS THE WHOLE OF THE 150-250 m
  // VEGETATION FIX" note requires of vegetation.
  //
  // FACETED, NOT SMOOTH, for the reason coast.js already measured: a smooth
  // crown reads as a flat dark cut-out. Every triangle carries its own facet
  // normal and takes its colour from whether that facet faces the sun.
  // 8 triangles per crown, closed top and bottom - a player never gets above
  // these, but an open solid is a hole waiting for the first camera that does.
  //
  // A STAND, NOT A CROWN, IS THE UNIT. First tuning put one 8-triangle crown
  // every 11 m with 9.5 m of jitter and they rendered as a row of separate
  // regular spikes - which is precisely the failure coast.js already measured
  // and wrote up ("ONE OBJECT WITH A GAP EITHER SIDE"). The lattice is now
  // 9 m, a stand is 1-3 crowns inside 7 m with radii 0.42-0.58 of their own
  // height, so neighbours OVERLAP, and their heights are spread 0.66-1.08 of
  // the stand height so the top of the mass is notched instead of even.
  const TX0 = 420, TX1 = 2343, SLOT = 9.0;
  // 1-D coherent value noise on a LAT m lattice: stands and clearings, not a
  // per-crown coin flip, which is the mistake coast.js line ~1400 spells out.
  const vnoise = (x, seed, LAT) => {
    const t = x / LAT, i = Math.floor(t), f = t - i, u = f * f * (3 - 2 * f);
    const a = hash1(i * 977 + seed), b = hash1((i + 1) * 977 + seed);
    return a + (b - a) * u;
  };
  // the most seaward CLIFFTOP building face near x, and the ground it stands on
  const nearFront = (x) => {
    let f = -Infinity, g = null;
    for (const b of boxes) {
      if (b.gy < GY_MIN || Math.abs(b.x - x) > 45) continue;
      const e = Math.abs(b.hv * b.ca) + Math.abs(b.hu * b.sa);
      if (b.z + e > f) { f = b.z + e; g = b.gy; }
    }
    return [f, g];
  };
  const SUN = [-0.35, 0.72, 0.60], SL = Math.hypot(SUN[0], SUN[1], SUN[2]);
  const crown = (cx, cy, cz, r, h, ph, cLit, cShade) => {
    const RY = cy + h * 0.52, TY = cy + h, BY = cy - 1.0;   // base sunk 1 m, no gap
    const ring = [];
    for (let k = 0; k < 4; k++) {
      const a = ph + k * Math.PI * 0.5;
      const rr = r * (0.74 + hash1(Math.round(cx * 7 + k * 131 + cz)) * 0.52);
      ring.push([cx + Math.cos(a) * rr, RY, cz + Math.sin(a) * rr]);
    }
    const facet = (P, Q, R) => {
      const ux = Q[0] - P[0], uy = Q[1] - P[1], uz = Q[2] - P[2];
      const vx = R[0] - P[0], vy = R[1] - P[1], vz = R[2] - P[2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const L = Math.hypot(nx, ny, nz) || 1; nx /= L; ny /= L; nz /= L;
      const c = (nx * SUN[0] + ny * SUN[1] + nz * SUN[2]) / SL > 0.12 ? cLit : cShade;
      m.tri(m.pushC(P[0] + OX, P[1], P[2] + OZ, nx, ny, nz, c, MAT.PAINTED),
        m.pushC(Q[0] + OX, Q[1], Q[2] + OZ, nx, ny, nz, c, MAT.PAINTED),
        m.pushC(R[0] + OX, R[1], R[2] + OZ, nx, ny, nz, c, MAT.PAINTED));
    };
    const T = [cx, TY, cz], B = [cx, BY, cz];
    for (let k = 0; k < 4; k++) {
      const A = ring[k], D = ring[(k + 1) % 4];
      facet(T, A, D);
      facet(B, D, A);
    }
    stats.crown++;
  };
  for (let sx = TX0; sx <= TX1; sx += SLOT) {
    const j = Math.round((sx - TX0) / SLOT);
    // 62 m beds with a 19 m ragged edge - continuous stands with real
    // clearings, which is what the reference count found (47 separate runs)
    const stand = vnoise(sx, 11, 62) * 0.72 + vnoise(sx, 29, 19) * 0.28;
    if (stand < 0.42) continue;
    const fr = nearFront(sx), fz = fr[0], fgy = fr[1];
    const cz = crestZExact(sx), cy = crestYExact(sx);
    const zLo = (fz > -Infinity ? fz + 2.5 : cz - 24), zHi = cz - 3.5;
    if (zHi - zLo < 5) continue;                          // no plateau to plant on
    const gy = fgy !== null ? fgy : cy + 1;
    const n = 1 + (hash1(j * 31 + 1) < 0.66 ? 1 : 0) + (hash1(j * 31 + 2) < 0.42 ? 1 : 0);
    const lean = treeMix ? treeMix(sx) : 0.5;
    for (let c = 0; c < n; c++) {
      const px = sx + (hash1(j * 53 + c * 7) - 0.5) * 7.0;
      const pz = zHi - hash1(j * 59 + c * 11) * Math.min(13, zHi - zLo);
      // 7.0-13.5 m: in sc_t22 the crest crowns stand clear above the 2-3
      // storey stock in front of them, which puts them past 9 m
      const h = (7.0 + stand * 4.2) * (0.66 + hash1(j * 67 + c * 13) * 0.42);
      const r = h * (0.42 + hash1(j * 71 + c * 17) * 0.16);
      if (inside(px, gy + h * 0.5, pz, null)) continue;    // never inside a wall
      const t2 = hash1(j * 73 + c * 19) * 0.5 + lean * 0.5;
      crown(px, gy - 0.4, pz, r, h, hash1(j * 79 + c * 23) * 6.283,
        t2 > 0.5 ? C.cliffTop : C.cliffScrubDry, C.cliffPine);
    }
  }

  stats.tris = (m.i.length - t0) / 3;
  return stats;
}
