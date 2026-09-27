// CLIFF FACE RELIEF - the East Cliff's FORM, toe to crest (tmp-tr114, 2026-09-18).
//
// coast.js builds the face as a nine-row lofted ribbon and spends its whole
// budget on TONE. That work is careful, measured and NOT touched here: nothing
// in this file adds a palette key, changes a key, or contradicts a line of the
// colour block. Every surface below is coloured either by READING BACK the
// ribbon's own vertex colour at the point it stands on (ribs, talus, and the
// rim of every slip) or from the three bare-ground keys that block already
// defines for exactly this purpose - cliffScar "bare Eocene sand",
// cliffScarPale "a fresh slip scar", cliffBracken "dead bracken / iron stain".
// This file is geometry.
//
// WHAT WAS WRONG, and it is a FORM complaint, not a colour one. Rendered on
// tmp-tr114/v0 (C_royalbath, C_carlton, X_ec_t13, X_long_course) the face is a
// smooth tinted ramp: broad soft tonal blotches, no vertical grain, a crest
// that is one long smooth curve, and a toe that is a RULED HORIZONTAL LINE
// running kilometres. The reference is none of those things.
//
// ---- MEASURED, tmp-tr114/meas_form.py, on the owner's own photograph --------
// southbourne-eastcliff/885017663629672.jpg. SUNLIT, so FORM ONLY: not one
// number below is a tone, a colour or a ratio of colours (trap 5). The cliff is
// masked between a per-column sky/land silhouette (B > R + 8) and a per-column
// toe (first bright warm row below the crest), 858 of 880 columns usable, local
// cliff pixel height p10 47 / p50 169 / p90 280 px. Everything is in units of
// the LOCAL CLIFF HEIGHT H, which needs no metric anchor and survives the fact
// that the cliff recedes across the frame.
//
//   FACE GRAIN along-shore, luminance sampled on a line at face fraction t,
//   power-weighted mean period of the along-shore spectrum:
//       t 0.35   0.43 H      contrast sd/mean 0.488
//       t 0.50   0.40 H      contrast sd/mean 0.480
//       t 0.65   0.45 H      contrast sd/mean 0.457
//   That is the light/dark alternation of sunlit spur noses against shaded
//   gully walls, and it is the single strongest signal on the face. The frame
//   is OBLIQUE, so along-shore lengths are foreshortened; coast.js's own crest
//   block corrects this frame by x1.6, which puts the true period at 0.65-0.72 H.
//   At the 24-30 m face this coast carries (reference/coast-research-raw.md §2,
//   "~28 m for the middle two-thirds") that is a 17-21 m pitch. RIB_PITCH is 20.
//
//   CREST ROUGHNESS, residual of the silhouette against a running trend:
//       trend 0.27 H   sd 0.0090 H    notches > 0.03 H on  0.0% of shoreline
//       trend 0.54 H   sd 0.0149 H                         2.8%
//       trend 1.08 H   sd 0.0204 H                         9.5%   (> 0.06 H: 1.2%)
//       trend 2.14 H   sd 0.0288 H                        17.0%   (> 0.06 H: 6.2%)
//
// ---- WHAT THAT SAYS ABOUT THE CREST, AND WHY THIS FILE BARELY TOUCHES IT ----
// The LONG-wave crest wander is already built and is already about right:
// coast.js's crestDY is +-3.0 m on a 91 m cell, which against a 2.14 H (~3.4 H
// true, ~95 m) trend is of the order of the measured 0.029 H = 0.8 m at H 28.
// What is missing is the SHORT wave - coast.js's own note records that the
// crest function is piecewise linear with breakpoints only at 90.9 m and
// 33.7 m, so below ~34 m the model's crest is exactly straight, where the
// photograph carries sd 0.0090-0.0149 H (0.25-0.42 m) at 0.27-0.54 H windows.
// ⚠️ AND THE SILHOUETTE IS NOT THE ROCK. The sky/land boundary measured above
// is the top of the crest fringe, and coast.js already builds that fringe to
// its own measurement (p90 1.35 m emergent, canopy p50 0.74 m, in the band the
// four water cameras see). A second crest-roughness field would DOUBLE-COUNT
// it. So the crest is broken here only as a by-product: a spur that runs to the
// crest carries its own nose over the top, which is the structurally honest way
// to get it and costs no extra triangle.
//
// ---- SOURCED FEATURES, reference/coast-research-raw.md §3 and §4 ------------
// coast.js's header item 3 says the 2 km between the piers is unbroken but for
// "two zig-zags and one dead lift incline". None of the three was built. They
// are the most identifiable thing on this cliff and they are nearly free:
//   * East Cliff Zig Zag   x ~590-620   (OSM, §4 table)   -> built at 605
//   * Toft Zig Zag         x ~1,510     (OSM, §4 table)   -> built at 1510
//   * East Cliff Lift      x ~810       (§4)              -> built at 810
// §4: both zig-zags are "asphalt, ~1.75 m wide, lit ... pale, narrow,
// switchbacking ribbons cut diagonally across the vegetated face - the single
// most recognisable cliff-face motif here after the vegetation". The LIFT is
// "a straight double-track incline gash ~50 m long at ~35 deg, running from
// promenade level to the clifftop", DEAD since 2016: no cars, lower station
// gone, "the track/rails and the stepped concrete terracing flanking both sides
// of the track remain", "an adjacent fresh slump/bulge in the sand face".
// ⚠️ NO CHINE IS INVENTED. Nothing here cuts the crest line.
// ⚠️ The 1.75 m asphalt is sub-pixel at every judged range; what is drawn is the
// CUTTING - the bench and its two batters - which §5 describes as "pale sand
// showing through in slump scars, gullies and along the zig-zag cuttings".
//
// ---- SLIPS, from the owner's own drone clip --------------------------------
// G:\DJI\DJI\Bournemouth Beach Landslide.mp4, frames 0 / 240 / 480 / 760 /
// 1020 / 1280 / 1520 / 1780 (contact sheet tmp-tr114/ref/landslide_sheet.jpg).
// The clip is OVERCAST and NO TONE IS TAKEN FROM IT (trap 5). Form only:
//   * the slip is a broad bare PANEL in the lower-middle of the face, not a
//     narrow vertical fan, and it is bounded above by a hard BACKSCAR where the
//     vegetation mat is truncated and stands proud of the bare ground;
//   * vegetation islands survive stranded INSIDE the panel (the round bush left
//     of centre, present in all eight frames) - so the panel is not a clean
//     shape, and the veg/bare boundary interdigitates;
//   * the material is SLUMPED at the foot: a debris apron runs down behind the
//     hut line, which is what destroys the ruled toe line the render has.
//
// ---- WHAT WAS REFUSED, and why ---------------------------------------------
//   * Cutting real gullies into the face. This file may only ADD geometry
//     (coast.js is fenced), so grain is built as SPUR RIBS standing proud, and
//     the untouched face between two ribs reads as the gully. Cutting would buy
//     nothing more at 150-400 m and would mean editing the ribbon.
//   * A second crest-roughness field. See above: it would double-count the
//     fringe coast.js already measured.
//   * The lift's upper station building, and the 240 m cordoned promenade
//     under the slip (§4). Both are outside this scope - the station is at the
//     clifftop and the cordon is promenade.
//   * Sand-martin burrows (§5, "small dark holes in the bare exposures") and
//     the goats. At the judged 150-400 m a 6 cm hole and a 0.7 m goat are well
//     under a pixel; they would be noise, not detail.
//   * Any relief west of the pier root. coast.js's CREST table is a flat 9 m
//     for x <= 0, i.e. this model has no West Cliff to put grain on, and the
//     ribs there scale to nothing on their own (faceH). Changing that table is
//     not this file's business.
//   * Any tone change. The face's mean albedo is unmoved by construction: ribs
//     and talus carry the ribbon's OWN vertex colour, read back out of the mesh
//     at the lattice point they stand on.

export function buildCliffRelief(ctx) {
  const { m, MAT, C, OX, OZ, X0, STEP, facePro, faceQuads,
    snoise, fbm2, noise, mix3, clamp } = ctx;

  const NCOL = facePro.length;
  const NROW = facePro[0].length;          // 16: 5 beach/prom, 1 toe, 9 face, 1 plateau
  const S_TOE = 5, S_CREST = NROW - 2;     // 5 and 14, the same indices the planting uses
  const sOf = (t) => S_TOE + (S_CREST - S_TOE) * t;

  // ---- the BUILT surface, not the expressions it was built from -------------
  // Same reasoning (and the same code) as buildClifftopPlanting's surf(): the
  // ribbon only has vertices every STEP = 5 m, so between them the real surface
  // is a straight line while the generating functions are curves. Anything
  // pinned to the face has to be pinned to what exists.
  const surf = (x, s) => {
    const fx = clamp((x - X0) / STEP, 0, NCOL - 1.0001);
    const i = Math.floor(fx), u = fx - i;
    const si = clamp(Math.floor(s), S_TOE, NROW - 2), v = clamp(s - si, 0, 1);
    const at = (Q) => [Q[si][0] + (Q[si + 1][0] - Q[si][0]) * v,
      Q[si][1] + (Q[si + 1][1] - Q[si][1]) * v];
    const a = at(facePro[i]), b = at(facePro[i + 1]);
    return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
  };
  // Face height above the toe at x. This is also the VALLEY GUARD: coast.js
  // flattens the cliff to nothing through the Bourne valley (valleyFaceRun's
  // vk), and reading the height off the built profile picks that up for free
  // without threading vk out of the ribbon loop. It also picks up the fact that
  // west of the pier root this model's CREST table is a flat 9 m, i.e. there is
  // no West Cliff here to put relief on - that is coast.js's table and it is
  // not this file's to change.
  const faceH = (x) => surf(x, S_CREST)[1] - surf(x, S_TOE)[1];

  const unit = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
  // Outward (seaward-and-up) unit normal of the BUILT face at (x, t), from the
  // surface's own two tangents, plus the two unit tangents themselves - the
  // smooth-normal maths below needs all three.
  const frame = (x, t) => {
    const s = sOf(t), d = 3.0, ds = 0.30;
    const [z0, y0] = surf(x - d, s), [z1, y1] = surf(x + d, s);
    const [za, ya] = surf(x, Math.max(S_TOE, s - ds));
    const [zb, yb] = surf(x, Math.min(S_CREST, s + ds));
    const Tu = unit([2 * d, y1 - y0, z1 - z0]);      // along shore, +X
    const Tv = unit([0, yb - ya, zb - za]);          // up the slope, landward
    let n = [Tv[1] * Tu[2] - Tv[2] * Tu[1], Tv[2] * Tu[0] - Tv[0] * Tu[2], Tv[0] * Tu[1] - Tv[1] * Tu[0]];
    if (n[2] < 0) n = [-n[0], -n[1], -n[2]];
    return [unit(n), Tu, Tv];
  };
  const nrm = (x, t) => frame(x, t)[0];
  // A point h metres PROUD of the built face at (x, t), along that normal.
  // h is always >= 0: nothing here is allowed to sink into the ribbon.
  const P = (x, t, h) => {
    const [z, y] = surf(x, sOf(t));
    if (!h) return [x, y, z];
    const n = nrm(x, t);
    return [x + n[0] * h, y + n[1] * h, z + n[2] * h];
  };
  // The normal of a surface standing h(x, t) proud of the face, given the two
  // slopes of h in metres per metre along each tangent. This is what makes a
  // rib a smooth swell instead of a stack of flat plates - see PLATES below.
  const nrmH = (x, t, dhdu, dhdv) => {
    const [n, Tu, Tv] = frame(x, t);
    return unit([n[0] - Tu[0] * dhdu - Tv[0] * dhdv,
      n[1] - Tu[1] * dhdu - Tv[1] * dhdv,
      n[2] - Tu[2] * dhdu - Tv[2] * dhdv]);
  };

  // ---- READ THE RIBBON'S OWN COLOUR BACK OUT OF THE MESH --------------------
  // The alternative was to re-evaluate coast.js's colour block here, which
  // would duplicate 200 lines of measured work and would drift the moment
  // either copy changed. faceQuads records, per quad, the vertex indices of its
  // four lattice corners (col, row), and m.c holds those vertices' colours. So
  // a rib standing on the face is painted EXACTLY what the face under it is
  // painted, and the face's mean albedo cannot move.
  const colIdx = new Int32Array(NCOL * NROW).fill(-1);
  for (const q of faceQuads) {
    const [i0, i1, i2, i3, c0, c1, k] = q;
    if (c0 >= 0 && c0 < NCOL) { colIdx[c0 * NROW + k] = i0; colIdx[c0 * NROW + k + 1] = i1; }
    if (c1 >= 0 && c1 < NCOL) { colIdx[c1 * NROW + k + 1] = i2; colIdx[c1 * NROW + k] = i3; }
  }
  const FALLBACK = C.cliffScrubDry;
  const faceCol = (x, t) => {
    const col = clamp(Math.round((x - X0) / STEP), 0, NCOL - 1);
    const row = clamp(Math.round(sOf(t)), S_TOE, NROW - 1);
    const vi = colIdx[col * NROW + row];
    if (vi < 0) return FALLBACK;
    return [m.c[vi * 3], m.c[vi * 3 + 1], m.c[vi * 3 + 2]];
  };

  // ---- SUN-DISC GUARD --------------------------------------------------------
  // The coast shader's ambient samples skyColor(normalize(N + 0.4 up)) and that
  // sky has a x30 sun disc within 2.3 deg of the sun, so a normal whose ambient
  // sample lands on it renders as a lamp (the planting block records the exact
  // (221,210,57) signature). buildClifftopPlanting guards this with one normal
  // per facet, which makes the test exact; these surfaces are SMOOTH SHADED, so
  // an interpolated normal can sit between two guarded corners. The threshold
  // here is therefore 0.9800, not the planting's 0.9945 - acos(0.98) is 11.5
  // deg against the disc's 6.0, so both ends of any edge are pushed more than
  // 5 deg clear of it.
  // AUDITED AT BUILD TIME, not asserted: sunDisc counts every emitted vertex
  // normal AND the three edge midpoints of every triangle that still land
  // inside the disc, and RESULT.md quotes the count.
  const SUN = [-0.35 / 1.0003, 0.72 / 1.0003, 0.60 / 1.0003];
  const ambDot = (n) => {
    const ay = n[1] + 0.4, al = Math.hypot(n[0], ay, n[2]) || 1;
    return (n[0] * SUN[0] + ay * SUN[1] + n[2] * SUN[2]) / al;
  };
  // Rotated in AZIMUTH (about +Y) until clear, in 4 deg steps, so the tilt the
  // surface actually has is preserved and only its heading moves. The planting
  // block's one-shot nudge left 4 of these normals still inside the disc on the
  // first build of this file; this leaves none, which the audit below proves.
  // BLENDED TOWARD +Y, not rotated away. The first attempt rotated the offending
  // normal in azimuth until it was clear, which made things WORSE (4 offenders
  // became 14): a normal swung 40-90 deg away from its unguarded neighbour puts
  // the INTERPOLATED normal halfway between them straight through the disc.
  // +Y's own ambient sample is (0,1,0) -> dot 0.720, a long way clear, and it
  // is only 36 deg off the face normal, so the correction is small, monotone,
  // and moves a guarded normal TOWARD its neighbours rather than away.
  const safeN = (n) => {
    let v = unit(n);
    for (let k = 0; k < 10 && ambDot(v) > 0.96; k++) v = unit([v[0] * 0.75, v[1] + 0.25, v[2] * 0.75]);
    return v;
  };

  // Build-time audit. area/bareArea answer the one question coast.js's colour
  // block would ask of this file: how much BARE GROUND does it add? Its own
  // split point is linear R >= 0.22 (the "vegetation-dominated ... linear R <
  // 0.22" mask in the three-tone vegetation note).
  let tris = 0, sunDisc = 0, area = 0, bareArea = 0;
  const bareBy = {};
  const spend = {};
  let bucket = 'other';
  // ⚠️ WINDING: the SEAWARD side is the FRONT face, matching the ribbon's own
  // (i3,i2,i1,i0) corduroy fix. shadow.js fills the depth map with
  // cullFace(FRONT), so winding it this way keeps these surfaces out of the
  // shadow pass exactly as the ribbon is kept out, and they cannot shadow-acne
  // the face they stand 0.2-3 m off. Shading does not depend on it either way:
  // craft.js flips the shading normal toward the camera and the 2026-09-18
  // facet repair takes |dot(Ni, gN)| with gN itself viewer-oriented, so a flip
  // is invisible to both - but leaving the two inconsistent would be a trap for
  // whoever reads this next.
  //
  // A vertex is [position, normal, colour] and the normal is the SURFACE's own
  // at that corner, not the triangle's.
  const emit = (A, B, D) => {
    const gz = (B[0][0] - A[0][0]) * (D[0][1] - A[0][1]) - (B[0][1] - A[0][1]) * (D[0][0] - A[0][0]);
    const gx = (B[0][1] - A[0][1]) * (D[0][2] - A[0][2]) - (B[0][2] - A[0][2]) * (D[0][1] - A[0][1]);
    const gy = (B[0][2] - A[0][2]) * (D[0][0] - A[0][0]) - (B[0][0] - A[0][0]) * (D[0][2] - A[0][2]);
    if (!(Math.hypot(gx, gy, gz) > 1e-9)) return;
    const V = gz < 0 ? [A, D, B] : [A, B, D];
    const idx = V.map((v) => {
      const n = safeN(v[1]);
      if (ambDot(n) > 0.9945) sunDisc++;
      return m.pushC(v[0][0] + OX, v[0][1], v[0][2] + OZ, n[0], n[1], n[2], v[2], MAT.PAINTED);
    });
    for (let e = 0; e < 3; e++) {
      const a = safeN(V[e][1]), b = safeN(V[(e + 1) % 3][1]);
      if (ambDot(unit([a[0] + b[0], a[1] + b[1], a[2] + b[2]])) > 0.9945) sunDisc++;
    }
    m.tri(idx[0], idx[1], idx[2]);
    const ar = 0.5 * Math.hypot(gx, gy, gz);
    area += ar;
    if ((A[2][0] + B[2][0] + D[2][0]) / 3 >= 0.22) {
      bareArea += ar; bareBy[bucket] = (bareBy[bucket] || 0) + ar;
    }
    tris++; spend[bucket] = (spend[bucket] || 0) + 1;
  };
  const quad = (a, b, c, d) => { emit(a, b, c); emit(a, c, d); };
  // A lofted grid of vertices, emitted as quads. g[i][j].
  const grid = (g) => {
    for (let i = 0; i + 1 < g.length; i++) {
      for (let j = 0; j + 1 < g[i].length; j++) quad(g[i][j], g[i][j + 1], g[i + 1][j + 1], g[i + 1][j]);
    }
  };

  const X_LO = X0 + STEP, X_HI = X0 + (NCOL - 2) * STEP;
  const inRange = (x) => x > X_LO && x < X_HI;
  const H_REF = 28;                                  // the face this coast carries

  // =========================================================================
  // 1. SPUR RIBS - the down-slope drainage grain
  // =========================================================================
  // 20 m pitch, from the 0.65-0.72 H measured period at H ~ 28 (header). A rib
  // is a lofted swell standing proud of the face along its normal, so the face
  // BETWEEN two ribs is the gully and costs nothing.
  //
  // ⚠️ PLATES, AND THIS IS THE ONE THAT HAD TO BE BUILT TWICE. The first build
  // gave every triangle its own facet normal (which is what the planting does,
  // for its own good reason - an exact sun-disc guard). On a landform that
  // rendered as a FIELD OF FLAT ANGULAR PLATES: on C_royalbath and C_carlton
  // each 10 x 7 m quad came out as one uniform tone with a hard edge against
  // its neighbour, so the face read as crumpled paper rather than as grain.
  // The cross-section is now FIVE stations with ANALYTIC normals (nrmH), so a
  // rib is a continuous swell and the only hard edges left in this file are the
  // ones that are supposed to be hard - the backscars and the zig-zag cuts.
  //
  // ⚠️ AND THE PROMINENCE IS TIED TO THE WIDTH, which the first build did not
  // do: hmax was drawn independently of w0, so the tail of the distribution put
  // 3.7 m of relief on a 5 m half-width - a 36 deg flank ON TOP OF a 36 deg
  // face, i.e. vertical. h/w is now 0.13-0.36, so the flank tilt is 7-20 deg.
  // WHY THAT RANGE. The face normal is (0, 0.809, 0.588) and sunDir is
  // (-0.35, 0.72, 0.60), so N.L on the undisturbed face is 0.935. A flank
  // tilted theta about the fall line reads 0.935 cos(theta) -/+ 0.35 sin(theta),
  // i.e. a lit/shaded pair of
  //     theta 10 deg  0.982 / 0.860   ratio 1.14
  //     theta 15 deg  0.994 / 0.812   ratio 1.22
  //     theta 20 deg  0.999 / 0.759   ratio 1.32
  //     theta 35 deg  0.967 / 0.565   ratio 1.71   <- the first build's tail
  // The photograph's own along-shore contrast at mid-face is sd/mean 0.46-0.49,
  // but that is TONE AND SHADING TOGETHER and the ribbon already supplies the
  // tone (its scar, dry/damp and mottle fields). Spending the whole measured
  // contrast on shading alone is how the first build got to 1.71 and to plates.
  const RIB_PITCH = 20;
  bucket = 'ribs';
  let ribsDrawn = 0, ribsSkipped = 0;
  for (let j = 0; ; j++) {
    const x0 = X0 + 20 + j * RIB_PITCH;
    if (x0 > X_HI - 20) break;
    const xc = x0 + (noise(j, 4.1) - 0.5) * RIB_PITCH * 0.55;
    if (!inRange(xc)) continue;
    const H = faceH(xc);
    if (H < 4) { ribsSkipped++; continue; }
    // The rib STRENGTH is a coherent 167 m field, not per-rib white noise: real
    // cliffs have stretches of strong grain and stretches of smooth vegetated
    // slope, and a per-rib lottery gives a uniform corduroy instead.
    const S = clamp(fbm2(xc * 0.006, 31.7) * 1.9 - 0.34, 0, 1);
    if (S < 0.12) { ribsSkipped++; continue; }
    const hs = clamp(H / H_REF, 0, 1.15);
    const w0 = 5.5 + noise(j, 7.3) * 5.0;                 // half width 5.5-10.5 m
    const hmax = w0 * (0.13 + noise(j, 9.9) * 0.23) * S * hs;
    const asym = (noise(j, 15.4) - 0.5) * 0.7;            // one flank steeper
    const t0 = 0.02 + noise(j, 11.2) * 0.10;
    const t1 = 0.70 + noise(j, 13.8) * 0.30;
    const NS = 3, SIG = [-1, -0.5, 0, 0.5, 1];
    // slope length of the built face, for dA/dt in metres per metre
    const slopeLen = Math.max(6, Math.hypot(H, H / Math.tan(0.6283)));
    const prof = (u) => hmax * Math.pow(Math.sin(Math.PI * Math.pow(clamp(u, 0, 1), 0.8)), 0.8);
    const g = [];
    for (let k = 0; k <= NS; k++) {
      const u = k / NS;
      const t = t0 + (t1 - t0) * u;
      // A spur is a FAN: widest and most prominent low, narrowing to its nose.
      // u^0.8 inside the sine puts the peak at u ~ 0.42, not at mid-height.
      const wl = w0 * (1 - 0.45 * u) * (1 - asym), wr = w0 * (1 - 0.45 * u) * (1 + asym);
      // A rib that reaches the crest keeps a little prominence there, which is
      // what carries its nose over the skyline. This is the ONLY thing in this
      // file that touches the crest line - see the header on double-counting.
      const A = (t1 > 0.985 && k === NS) ? hmax * 0.28 : prof(u);
      const dAdv = (prof(u + 0.5 / NS) - prof(u - 0.5 / NS)) / ((t1 - t0) * slopeLen / NS);
      const row = [];
      for (const sg of SIG) {
        const w = sg < 0 ? wl : wr;
        const cs = Math.pow(Math.cos(Math.PI * sg * 0.5), 2);
        const h = A * cs;
        // d/dx of A cos^2(pi s / 2) with s = x / w  ->  -A pi sin(pi s) / (2 w)
        const dhdu = -A * Math.PI * Math.sin(Math.PI * sg) / (2 * w);
        const x = xc + w * sg;
        row.push([P(x, t, h), nrmH(x, t, dhdu, dAdv * cs), faceCol(x, t)]);
      }
      g.push(row);
    }
    grid(g);
    ribsDrawn++;
  }

  // =========================================================================
  // 2. TALUS FILLET AT THE TOE - the ruled line killer
  // =========================================================================
  // The toe is a single straight horizontal edge along three kilometres, and at
  // every judged camera it is the most artificial thing below the crest. A real
  // cliff foot is a ragged fillet of washed-down material. These are low
  // (0.4-1.3 m) and wide (7-17 m), so they cost 8 triangles each and they break
  // the line rather than decorating it.
  // ⚠️ STRICTLY t >= 0. Nothing here goes seaward of the toe row, so the
  // promenade and the beach (other builders) are untouched by construction.
  bucket = 'talus';
  for (let j = 0; ; j++) {
    const x0 = X0 + 12 + j * 24;
    if (x0 > X_HI - 20) break;
    if (noise(j, 21.7) < 0.20) continue;
    const xc = x0 + (noise(j, 23.1) - 0.5) * 12;
    if (!inRange(xc) || faceH(xc) < 4) continue;
    const w = 3.5 + noise(j, 25.3) * 5.0;
    const tTop = 0.09 + noise(j, 27.9) * 0.13;
    const h0 = (0.4 + noise(j, 29.5) * 0.9) * clamp(faceH(xc) / H_REF, 0, 1.2);
    const sk = (noise(j, 31.1) - 0.5) * 0.6;
    const g = [];
    for (let i = 0; i <= 2; i++) {
      const v = i / 2, t = tTop * v;
      const vb = Math.pow(Math.sin(Math.PI * (0.16 + 0.78 * (1 - v))), 0.7);
      const row = [];
      for (let k = 0; k <= 2; k++) {
        const sg = -1 + k, a = Math.PI * (sg - sk) * 0.42;
        const h = Math.max(0, h0 * Math.pow(Math.cos(clamp(a, -1.5707, 1.5707)), 2) * vb);
        const x = xc + w * sg;
        const dhdu = -h0 * vb * Math.PI * 0.42 * Math.sin(2 * clamp(a, -1.5707, 1.5707)) / w;
        // The foot is the damp, shaded, wash-fed strip - coast.js's own toe-quad
        // note says exactly that and pulls it 0.55 toward cliffScrubDamp. This
        // takes a lighter 0.22 of the same move, because the material is FRESH.
        row.push([P(x, t, h), nrmH(x, t, dhdu, 0),
          mix3(faceCol(x, Math.max(0.01, t)), C.cliffScrubDamp, 0.22)]);
      }
      g.push(row);
    }
    grid(g);
  }

  // =========================================================================
  // 3. LANDSLIPS - backscar, slump bulge, slumped apron
  // =========================================================================
  // Form from Bournemouth Beach Landslide.mp4 (header). From a coherent 133 m
  // field, plus ONE FORCED at x 835 because §4 puts "an adjacent fresh
  // slump/bulge in the sand face" beside the lift at 810.
  //
  // THE BACKSCAR IS THE FEATURE. In every frame of the clip the bare panel is
  // read by its top edge: the vegetation mat is truncated and stands 0.6-1.6 m
  // proud of the ground below it, which throws a hard shadow line across the
  // face. That edge is the ONE hard edge a slip is allowed - the ground below
  // it is a smooth slump bulge whose colour FADES to the face colour at its rim.
  //
  // ⚠️ THE FIRST BUILD DREW THE PANEL AS A FLAT VENEER 0.18 m off the face with
  // rectangular boundaries, and it rendered as exactly that: pale rectangular
  // plates pasted onto the cliff. A slip is a BULGE of remobilised sand, not a
  // decal.
  //
  // ⚠️ THE BARE SHARE IS A MEASURED CEILING, NOT A FREE PARAMETER. coast.js
  // measures the reference face at 10.3% bare and records that an earlier pass
  // drew it at 26.5% and rendered "a smudge". The bulges below fade their bare
  // colour out at the rim precisely so they add edge and form without adding a
  // flat slab of bare area - see RESULT.md for the measured share after.
  const cand = [];
  for (let x = X0 + 40; x < X_HI - 40; x += 30) {
    if (fbm2(x * 0.0075, 41.3) > 0.645 && faceH(x) >= 9) cand.push(x);
  }
  const SL = [];
  for (const x of cand) if (!SL.length || x - SL[SL.length - 1] > 90) SL.push(x);
  SL.push(835);
  bucket = 'slips';
  for (const xc of SL) {
    if (!inRange(xc) || faceH(xc) < 9) continue;
    const k = Math.round(xc);
    const hw = 10 + noise(k, 51.3) * 12;                 // half width 10-22 m
    const tb = 0.46 + noise(k, 53.7) * 0.24;             // backscar height
    const scarpH = 0.6 + noise(k, 55.1) * 1.0;
    const pale = mix3(C.cliffScar, C.cliffScarPale, 0.30 + noise(k, 57.3) * 0.45);
    // Dead bracken and iron staining occur on about one bare band in seven -
    // coast.js's own rate, reused rather than re-invented.
    const bare = noise(k, 59.9) > 0.86 ? mix3(pale, C.cliffBracken, 0.4) : pale;
    const NX = 6;
    const tLo = Math.max(0.02, tb - 0.30);
    const bh = 0.7 + noise(k, 65.5) * 1.5;
    // ARCUATE and RAGGED: a crescent in plan, with a noisy rim, so the
    // vegetation fingers back into it the way the clip's stranded bushes do.
    const rim = (u, x) => Math.pow(Math.sin(Math.PI * clamp(u, 0, 1)), 0.55) * (0.86 + 0.14 * snoise(x * 0.09, 63.1));
    const g = [];
    for (let s = 0; s <= 3; s++) {
      const v = s / 3, t = tLo + (tb - tLo) * v;
      const vb = Math.pow(Math.sin(Math.PI * (0.10 + 0.80 * v)), 0.8);
      const row = [];
      for (let i = 0; i <= NX; i++) {
        const u = i / NX, x = xc - hw + 2 * hw * u;
        const ga = rim(u, x), h = bh * ga * vb;
        const du = (bh * vb * (rim(u + 0.06, x + 0.12 * hw) - rim(u - 0.06, x - 0.12 * hw))) / (0.24 * hw);
        row.push([P(x, t, Math.max(0, h)), nrmH(x, t, clamp(du, -0.7, 0.7), 0),
          mix3(faceCol(x, t), bare, clamp(ga * 1.15 - 0.18, 0, 0.72))]);
      }
      g.push(row);
    }
    grid(g);
    // --- the backscar. Its top line WANDERS: a scar whose head is a horizontal
    // line is the same ruled-line error as the toe.
    for (let i = 0; i < NX; i++) {
      const u0 = i / NX, u1 = (i + 1) / NX;
      const xa = xc - hw + 2 * hw * u0, xb = xc - hw + 2 * hw * u1;
      const ga = rim(u0, xa), gb = rim(u1, xb);
      if (ga < 0.25 && gb < 0.25) continue;
      const ta = tb + (snoise(xa * 0.12, 61.7) - 0.5) * 0.045;
      const tbb = tb + (snoise(xb * 0.12, 61.7) - 0.5) * 0.045;
      const nA = nrm(xa, ta), nB = nrm(xb, tbb);
      const ca = faceCol(xa, ta + 0.02), cb = faceCol(xb, tbb + 0.02);
      const ba = bh * ga * 0.62, bb2 = bh * gb * 0.62;
      quad([P(xa, ta - 0.028, ba), nA, mix3(ca, bare, 0.7)],
        [P(xb, tbb - 0.028, bb2), nB, mix3(cb, bare, 0.7)],
        [P(xb, tbb, scarpH * gb + bb2), nB, cb],
        [P(xa, ta, scarpH * ga + ba), nA, ca]);
      quad([P(xa, ta, scarpH * ga + ba), nA, ca],
        [P(xb, tbb, scarpH * gb + bb2), nB, cb],
        [P(xb, tbb + 0.015, scarpH * gb * 0.9 + bb2), nB, cb],
        [P(xa, ta + 0.015, scarpH * ga * 0.9 + ba), nA, ca]);
    }
  }

  // =========================================================================
  // 4. THE TWO ZIG-ZAGS
  // =========================================================================
  // §4 positions, above. Six legs, each ~42 m along the shore and 1/6 of the
  // face in rise - about 1:10, which is what an asphalt path tagged for
  // wheelchairs has to be, and it is why the whole thing occupies only ~50 m of
  // shoreline. Each leg is drawn as a BENCH: an outer batter that catches the
  // sun, the bench itself, and the back cut above it, which is the pale line.
  // These ARE allowed hard edges - a bench cut into a slope has them.
  const zig = (xc) => {
    if (!inRange(xc) || faceH(xc) < 9) return;
    const NL = 6, L = 42, NSEG = 5;
    // dtW 0.055 is a 2.6 m bench on this face's ~47 m slope length, and with
    // the two batters the whole cutting is 4.3 m. It was 5.7 m and that put
    // 2.7% of the WHOLE 3 km face into pale zig-zag, against a reference face
    // that is 10.3% bare in total (coast.js). §4's path is 1.75 m of asphalt;
    // 4.3 m of cutting around it is already the generous reading.
    const tLo = 0.05, tHi = 0.97, dt = (tHi - tLo) / NL, dtW = 0.055;
    const cutC = mix3(C.cliffScar, C.cliffScarPale, 0.42);
    const benchC = mix3(C.cliffScar, C.cliffScrubDry, 0.42);
    for (let i = 0; i < NL; i++) {
      const dir = (i % 2) ? -1 : 1;
      const xs = xc - dir * L * 0.5, xe = xc + dir * L * 0.5;
      for (let s = 0; s < NSEG; s++) {
        const xa = xs + (xe - xs) * (s / NSEG), xb = xs + (xe - xs) * ((s + 1) / NSEG);
        const ta = tLo + dt * (i + s / NSEG), tb2 = tLo + dt * (i + (s + 1) / NSEG);
        if (!inRange(xa) || !inRange(xb)) continue;
        const nA = nrm(xa, ta), nB = nrm(xb, tb2);
        const A = (t, h, c) => [P(xa, t, h), nA, c];
        const B = (t, h, c) => [P(xb, t, h), nB, c];
        // ⚠️ 0.40 / 0.18, NOT 0.85 / 0.48, AND THE OUTER BATTER IS 0.030 OF
        // THE FACE, NOT 0.016. At 0.85 the bench stood nearly a metre off the
        // face on an outer edge only 0.75 m deep, and the zoom render
        // (tmp-tr114/ev/zoom_Z_crest.jpg, first pass, 210 m at a 9 deg lens)
        // showed it for what it was: six PLANKS FLOATING over the slope with
        // their undersides in view. A bench cut into a slope is mostly CUT;
        // this file cannot cut, so the standoff has to be small enough that
        // the fill side reads as a lip rather than a shelf, and the batter
        // long enough to run back down to the face instead of dropping off it.
        quad(A(ta - dtW * 0.5 - 0.030, 0.02, cutC), B(tb2 - dtW * 0.5 - 0.030, 0.02, cutC),
          B(tb2 - dtW * 0.5, 0.40, cutC), A(ta - dtW * 0.5, 0.40, cutC));
        quad(A(ta - dtW * 0.5, 0.40, benchC), B(tb2 - dtW * 0.5, 0.40, benchC),
          B(tb2 + dtW * 0.5, 0.18, benchC), A(ta + dtW * 0.5, 0.18, benchC));
        quad(A(ta + dtW * 0.5, 0.18, cutC), B(tb2 + dtW * 0.5, 0.18, cutC),
          B(tb2 + dtW * 0.5 + 0.022, 0.02, cutC), A(ta + dtW * 0.5 + 0.022, 0.02, cutC));
      }
    }
  };
  bucket = 'zigzag';
  zig(605);      // East Cliff Zig Zag, OSM ~590-620 m
  zig(1510);     // Toft Zig Zag, OSM ~1,510 m

  // =========================================================================
  // 5. THE DEAD EAST CLIFF LIFT INCLINE
  // =========================================================================
  // §4: ~810 m east of Bournemouth Pier, a straight double-track gash ~50 m
  // long at ~35 deg from promenade level to the clifftop. The face this ribbon
  // builds is at 36 deg (coast.js's sourced number), so the incline runs
  // straight up the fall line - a constant x. DEAD: no cars, no lower station.
  // What is built is what §4 says survives - the trackbed, "the track/rails and
  // the stepped concrete terracing flanking both sides of the track".
  bucket = 'lift';
  {
    const xc = 810;
    if (inRange(xc) && faceH(xc) >= 9) {
      // 8.8 m overall, not 12: twin 5 ft 6 in track plus its two walkways is
      // ~4.8 m of trackbed with ~2 m of terracing each side. The first build ran
      // 12 m wide with the bed at 0.72 of the way to cliffScarPale and 0.32 m
      // steps, and on C_carlton (270 m) that rendered as a BRIGHT CARTOON
      // LADDER - seven 6.8 m treads alternating light and dark down the face.
      // Real terracing steps are 1-2 m; at 270 m and 3.3 px/m they cannot be
      // resolved individually, so what is drawn is five shallow ledges whose
      // RISERS give the band its grain, at a tone much nearer the face.
      const NSg = 9, tA = 0.03, tB = 0.995, HW = 2.4;
      const bedC = mix3(C.cliffScar, C.cliffScarPale, 0.38);
      const terC = mix3(C.cliffScar, C.cliffScrubDry, 0.34);
      const railC = mix3(C.cliffScar, C.cliffScrubDamp, 0.62);
      const V = (x, t, h, c) => [P(x, t, h), nrm(x, t), c];
      for (let s = 0; s < NSg; s++) {
        const t0 = tA + (tB - tA) * (s / NSg), t1 = tA + (tB - tA) * ((s + 1) / NSg);
        quad(V(xc - HW, t0, 0.14, bedC), V(xc, t0, 0.30, bedC), V(xc, t1, 0.30, bedC), V(xc - HW, t1, 0.14, bedC));
        quad(V(xc, t0, 0.30, bedC), V(xc + HW, t0, 0.14, bedC), V(xc + HW, t1, 0.14, bedC), V(xc, t1, 0.30, bedC));
        // twin track. At 150-400 m the 5 ft 6 in gauge is far under a pixel, so
        // these are not rails - they are the two dark ballast lines the pair of
        // tracks leaves, and they cost 8 triangles for the whole incline.
        for (const o of [-1.15, 1.15]) {
          quad(V(xc + o - 0.38, t0, 0.40, railC), V(xc + o + 0.38, t0, 0.40, railC),
            V(xc + o + 0.38, t1, 0.40, railC), V(xc + o - 0.38, t1, 0.40, railC));
        }
      }
      // stepped concrete terracing, both flanks. Seven ledges, each a tread and
      // a riser: the riser is what reads at distance, as a stack of short
      // horizontal lines nothing else on this cliff has.
      for (const sgn of [-1, 1]) {
        for (let s = 0; s < 5; s++) {
          const t0 = tA + (tB - tA) * (s / 5), t1 = tA + (tB - tA) * ((s + 1) / 5);
          const tm = t0 + (t1 - t0) * 0.66;
          const xi = xc + sgn * HW, xo = xc + sgn * (HW + 2.0);
          quad(V(xi, t0, 0.19, terC), V(xo, t0, 0.11, terC), V(xo, tm, 0.11, terC), V(xi, tm, 0.19, terC));
          quad(V(xi, tm, 0.19, terC), V(xo, tm, 0.11, terC), V(xo, t1, 0.03, terC), V(xi, t1, 0.03, terC));
        }
      }
    }
  }

  // The ribbon's own face area, for the denominator.
  let faceArea = 0;
  for (let i = 0; i + 1 < NCOL; i++) {
    for (let k = S_TOE; k < NROW - 2; k++) {
      const A0 = facePro[i][k], B0 = facePro[i][k + 1];
      faceArea += STEP * Math.hypot(B0[0] - A0[0], B0[1] - A0[1]);
    }
  }
  return { triangles: tris, spend, ribsDrawn, ribsSkipped, slips: SL.length, sunDisc,
    area: Math.round(area), bareArea: Math.round(bareArea), faceArea: Math.round(faceArea),
    bareBy: Object.fromEntries(Object.entries(bareBy).map(([k, v]) => [k, Math.round(v)])) };
}
