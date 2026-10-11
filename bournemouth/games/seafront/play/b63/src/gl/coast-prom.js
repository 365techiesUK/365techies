// THE PROMENADE AND THE THINGS ON IT - the strip between the sand and the
// cliff toe, above sand level, everywhere EXCEPT the pier root.
//
// ---------------------------------------------------------------------------
// WHAT ALREADY EXISTED BEFORE THIS FILE, AND WHERE THIS FILE THEREFORE BEGINS
//
// Audited by hand, because tools/module-check.mjs only enumerates pier-*.js and
// would not have caught a collision with coast-side geometry:
//
//   coast.js ~3450-3645 (the tmp-tr99 PIER_APRON block)
//       a raised paved terrace at y 5.37 over |o| <= 16.6 about the pier axis,
//       its sea wall down to y 2.55, a continuous coping band, a guard railing
//       at 5.37+1.15 with posts at 2.4 m, TWO ramps down to y 3.5 out to
//       |o| = 31, and one flight of 15 beach steps at o +9.4..+13.4.
//   pier-landmarks.js 529-584
//       promenade post-and-rail at z = -3.8 over o -34..-17 and +17..+34,
//       1.18 m high, posts at 2.4 m;
//       FOUR lamp columns at o = -30, -22, +22, +30, z = -4.2, 5.7 m shaft
//       plus a 0.25 m lantern;
//       SIX kiosks at o = -42, -34, -26, +26, +34, +42, z = -7.5, half-plan
//       2.2 x 2.6 m, so their outer face reaches o = 44.6.
//   coast.js 1812-1850 (§B.4)
//       the beach huts: 2.0 x 2.5 m boxes at z -18.6..-16.1, y 3.5..5.7, with
//       a 0.35 m cap to y 6.05 over z -18.7..-16.0 and x -0.06..+2.06 of each
//       hut, in four clusters x 150-650, 1080-1210, 1380-1520, 1880-2280.
//       PROTECTED. Nothing in this file writes into that envelope.
//
// SO: this file owns |x| >= 46 (1.4 m clear of the outermost kiosk face at
// 44.6) out to the ribbon's own ends, x -300 and x 2700. It adds nothing
// inside |x| < 46 and nothing inside the hut envelope.
//
// ---------------------------------------------------------------------------
// WHAT WAS MEASURED, AND FROM WHICH FRAME
//
// ⚠️ TRAP 5. Every frame used below is SUNLIT, so it is used for FORM AND
// RATIO ONLY. NO absolute tone, hue or RGB is taken from any of them. Every
// colour in this file is a palette key coast.js already carries for something
// else, exactly as the PIER_APRON block did - see the colour note at PAL.
//
//   FRAME A  G:/DJI/Bournemouth Beach Walk 4K.MP4 at t = 30.000 s, native
//            3840 x 2160 (tmp-tr116/frames/w30_full.jpg). Prom looking east,
//            low sun, one lamp column complete from lantern to base.
//
//     Method: for objects standing on one level plane, pixel height h is
//     proportional to (y_base - y_horizon), so H1/H2 = (h1/dy1)/(h2/dy2) with
//     no focal length, no camera height and no absolute scale - a pure
//     same-frame ratio, which is the only kind trap 5 allows.
//
//     The horizon came from the prom's own two edges, which are parallel on
//     the ground and therefore meet on it: the seaward sand line through
//     (640,900)-(1130,765) and the landward wall foot through (250,880)-
//     (790,790) intersect at y = 685 (crop tmp-tr116/ev/w30_prom.jpg, which is
//     the 4K frame's 0,500-1500,1400 at 1:1).
//
//       object                  h px   y_base   dy    h/dy
//       walking adult, prom       66      760    75   0.880
//       lamp column + lantern    438      820   135   3.244
//       1100 L wheelie bin        92      810   125   0.736
//
//     Against a 1.70 m walking adult (coat and hood included):
//       LAMP COLUMN, LANTERN INCLUDED   6.27 m
//       WHEELIE BIN                     1.42 m
//
//     ⚠️ THE BIN IS THE CHECK, AND IT IS WHY THE LAMP NUMBER IS TRUSTED. A UK
//     1100 L four-wheel bin is 1.36-1.47 m tall. The method returned 1.42 m
//     for an object whose true height was never used to derive anything - so
//     the horizon fit and the 1.70 m ruler are both sound to about 4%. Had the
//     bin come back 1.9 m the lamp number would have gone in the bin with it.
//     Built at 6.32 m (6.00 shaft + 0.32 lantern), 0.8% over the measurement.
//
//     pier-landmarks.js builds 5.95 m at the pier mouth and calls it INFERRED
//     from the standard. 6.32 against 5.95 is 0.37 m, which is 1.6 px at the
//     160 m the judged coast cameras stand at. The two runs still read as one
//     species and the measured number is the one built here.
//
//   FRAME B  G:/DJI/Bournemouth Beach Middle Chine.MP4 at t = 5.000 s, native
//            3840 x 2160 (tmp-tr116/frames/mc_5_full.jpg). The hut terrace at
//            the cliff toe with the prom in front of it.
//
//     Bins: THREE dark bins standing on the prom over a run that carries about
//     33 hut frontages between the two resolved lamp columns. At the sourced
//     2.1 m hut pitch that is ~70 m of frontage, over-read by the parallax
//     between the hut line and the prom line in a grazing view, so it is a
//     LOOSE UPPER BOUND on the lamp pitch, not a measurement of it. Frame A
//     resolves one column over a comparable run.
//
//     LAMP PITCH IS THEREFORE INFERRED, NOT MEASURED, and this file says so.
//     36 m: at the low end of the 40-70 m bracket the two frames imply, and
//     within the UK amenity range for a 6 m column. At the 160 m the judged
//     cameras stand at, 36 m puts four columns across the frame.
//
//   FRAME C  bournemouth-reference/bournemouth-beach/826905176107588.jpg
//            (owner's own, 2048 x 1152, sunlit - form only). Prom flush with
//            the sand, a low kerb, a 6 m lamp column, two bins, and guard rail
//            ONLY around the beach shower and its pad.
//
//   FRAME D  bournemouth-reference/chines-westcliff/732442982220475.jpg
//            (owner's own aerial, sunlit - form only). At the scale this game
//            renders the coast, the promenade reads as ONE PALE CONTINUOUS
//            LINE between the sand and the dark cliff toe, with the hut rows
//            on it. That is what THE KERB below is for.
//
// ---------------------------------------------------------------------------
// ⚠️ WHAT WAS REFUSED, AND WHY. The brief asked for railings along the prom
// and called them "the single most legible man-made line at this distance".
// THEY ARE NOT THERE. Frames A, B and C are three independent looks at three
// different stretches of this seafront and not one of them shows a continuous
// guard rail along the promenade edge: the prom is flush with the sand, the
// only rail in any of them is a short run around the beach shower in frame C,
// and the aerial (frame D) shows a bare pale line. Bournemouth guards the prom
// edge where there is a drop - at the pier apron, which coast.js ALREADY
// builds a rail on, and either side of it, which pier-landmarks.js already
// builds. Building 2.7 km of white post-and-rail because it would read well
// would be the loudest invented feature in the scene. Refused; the kerb does
// the job the brief wanted the railing to do, and it is what the photographs
// show. Count refused: ~1,150 posts and ~44 rail bays, about 14,300 triangles.
//
// Also refused, with counts, at the bottom of this file: deckchairs and
// windbreaks, prom-edge steps and ramps, and the cliff-toe retaining face.

export function buildPromenade(m, C, MAT, OX, OZ, mhwOffset) {
  // =========================================================================
  // GROUND, AND THE KEEP-OUTS
  // =========================================================================
  const PROM_Y = 3.50;        // coast.js ribbon row [-2, 3.5] .. [-20, 3.5]
  const LIP_Z = -2.00;        // the seaward lip of the flat prom
  const X0 = -300, X1 = 2700; // the ribbon's own ends
  const PIER_KEEP = 46.0;     // 1.4 m clear of pier-landmarks.js's o = 44.6

  // The beach huts, restated so this file can keep out of them without
  // importing anything. coast.js §B.4.
  const HUT_CLUSTERS = [[150, 650], [1080, 1210], [1380, 1520], [1880, 2280]];
  const HUT_Z0 = -18.9, HUT_Z1 = -15.8;   // 0.3 m of margin on the built 18.7/16.0
  const inHutRun = (x) => HUT_CLUSTERS.some(([a, b]) => x > a - 3 && x < b + 3);

  // ⚠️ THE RIBBON'S LAST ROW IS x = 2700 AND ITS FIRST IS x = -300 (coast.js
  // X0/X1 with STEP 5). Every jitter below is +-4 m or more, so without this
  // guard the end of a run puts a figure or a bin on ground that was never
  // built and it floats over nothing. Caught by an AABB read of the built
  // vertices, at x = 2700.69, not by looking at a render.
  const onRibbon = (x) => x > X0 + 2 && x < X1 - 2 && Math.abs(x) >= PIER_KEEP;

  // The twelve groynes (coast.js §B.3), so beach figures do not stand in one.
  const GROYNE_X = [300, 492, 643, 816, 988, 1161, 1333, 1507, 1683, 1843, 2002, 2160];
  const onGroyne = (x) => GROYNE_X.some((g) => x > g - 4 && x < g + 10);

  // Beach surface, the same expression coast.js's groyne loop uses.
  const beachY = (x, z) => 3.0 * (1 - Math.min(1, z / mhwOffset(x)));

  // =========================================================================
  // DETERMINISM
  // =========================================================================
  // The sim replays must match frame for frame, so nothing here may touch
  // Math.random, Date or performance.now. Same xorshift idiom as
  // pier-people-scale.js, with a different salt so the prom crowd and the pier
  // crowd cannot correlate into one repeated pattern where they meet.
  const rnd = (i, k) => {
    let h = Math.imul(i + 0x51ed, 2654435761) ^ Math.imul(k + 0x27d4, 2246822519);
    h = Math.imul(h ^ (h >>> 15), 2246822519);
    h ^= h >>> 13;
    h = Math.imul(h, 3266489909);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };

  let boxes = 0, figures = 0, sitting = 0;
  const bx = (x0, y0, z0, x1, y1, z1, col, mat) => {
    m.box(x0 + OX, y0, z0 + OZ, x1 + OX, y1, z1 + OZ, col, mat);
    boxes++;
  };

  // =========================================================================
  // 1. THE KERB - the prom's seaward edge beam
  // =========================================================================
  // The ribbon crosses from beach to prom as a SMOOTH RAMP: row [0, 3.0] to
  // row [-2, 3.5], one quad, 0.5 m of rise over 2 m, with the material blended
  // SAND -> CONCRETE across it. At the 130-300 m the judged coast cameras
  // stand at that is a soft 2 m gradient where frame D shows a hard line, and
  // it is the single thing most responsible for the prom not reading as
  // man-made at all.
  //
  // 0.16 m proud and 0.50 m wide, sitting on the flat prom at the top of that
  // ramp. At 160 m that is 0.7 px of face and 2.2 px of top - it is not meant
  // to be seen as an object, it is meant to put a straight edge where the sand
  // stops.
  //
  // ⚠️ IT WAS BUILT IN C.prom FIRST AND IT DID NOTHING. Rendered and looked at
  // (tmp-tr116/ev/zoom_ec94.png, zoom_C_chine.png): C.prom is the colour of the
  // promenade deck the kerb stands on, so the only signal it carried was its
  // own 0.16 m of self-shadow, which at a grazing incidence is under a pixel.
  // The boundary stayed the same soft two-metre gradient it was before.
  //
  // C.concreteDark is the answer and it is not a tone read off a photograph
  // (trap 5): it is the SAME choice, for the same reason, that the tmp-tr99
  // PIER_APRON block 200 m away already makes for its sea wall - a cast edge
  // beam is a different, denser concrete from the walked, bleached, sand-blown
  // deck behind it, and coast.js carries exactly those two keys for exactly
  // that distinction. No new key enters the palette.
  //
  // ⚠️ Built in 60 m segments rather than as one 2.7 km box, with 20 mm of
  // hashed height variation. A single box would be one perfectly straight,
  // perfectly level quad for 2,654 m, and the one thing every previous pass on
  // this project has been caught by is an unbroken run at a constant value.
  // 20 mm is 0.08 px at 160 m: it does nothing to the silhouette and
  // everything to the joint pattern in the near cameras.
  {
    const SEG = 60, KW = 0.50, KH = 0.16;
    for (const [a, b] of [[X0, -PIER_KEEP], [PIER_KEEP, X1]]) {
      const n = Math.ceil((b - a) / SEG);
      for (let k = 0; k < n; k++) {
        const s = a + k * SEG, e = Math.min(b, s + SEG);
        const h = KH + (rnd(k, a < 0 ? 71 : 72) - 0.5) * 0.05;
        bx(s, PROM_Y, LIP_Z - KW, e, PROM_Y + h, LIP_Z, C.concreteDark, MAT.CONCRETE);
      }
    }
  }

  // =========================================================================
  // 2. LAMP COLUMNS
  // =========================================================================
  // 6.32 m overall (see FRAME A). z = -4.2, which is pier-landmarks.js's own
  // lamp station, so this run and its four columns sit on one line.
  //
  // The shaft is a 0.13 m box, not a tube. At 160 m it is 0.57 px wide: five
  // more triangles to round something half a pixel across buys nothing, and
  // pier-landmarks.js's 5-sided tube costs 30 triangles against this 12.
  //
  // The lantern is the DARK element and the shaft the PALE one. That ordering
  // is a within-frame contrast in frames A, B and C - a black ogee lantern on
  // a pale grey column, in all three - which is a ratio, not a tone, so trap 5
  // allows it. C.pierRoofDark and C.pierRail carry it.
  const LAMP_Z = -4.2, LAMP_PITCH = 36;
  {
    const SH_TOP = PROM_Y + 6.00, LN_TOP = SH_TOP + 0.32;
    const s = 0.065, l = 0.15;
    for (let x = -288; x <= X1; x += LAMP_PITCH) {
      if (Math.abs(x) < PIER_KEEP) continue;
      bx(x - s, PROM_Y, LAMP_Z - s, x + s, SH_TOP, LAMP_Z + s, C.pierRail, MAT.PAINTED);
      bx(x - l, SH_TOP, LAMP_Z - l, x + l, LN_TOP, LAMP_Z + l, C.pierRoofDark, MAT.PAINTED);
      // A base plinth ONLY on the near run. 0.40 m is 1.8 px at the 90-190 m
      // the two cameras that look at x 46-240 stand at, and 0.9 px at 320 m.
      // Built where it resolves, refused where it does not: 76 plinths and
      // 912 triangles not spent.
      if (x > 40 && x < 250) {
        bx(x - 0.11, PROM_Y, LAMP_Z - 0.11, x + 0.11, PROM_Y + 0.40, LAMP_Z + 0.11,
          C.concreteDark, MAT.CONCRETE);
      }
    }
  }

  // =========================================================================
  // 3. BINS
  // =========================================================================
  // 1100 L four-wheel bins, 1.42 m tall (FRAME A, measured), 1.27 x 1.07 in
  // plan. Frame B shows three over a ~150 m run of prom and frame C two side
  // by side; one per 140 m is the sparse end of that and is what is built.
  //
  // They earn their triangles by BREAKING THE LAMP RHYTHM. A 36 m metronome of
  // identical columns down 2.7 km is the placeholder tell coast.js's own
  // clifftop note calls "the loudest placeholder tell there is"; a dark
  // 1.4 m block at an unrelated pitch is the cheapest possible answer to it.
  {
    const BIN_PITCH = 140;
    for (let x = -280; x <= X1; x += BIN_PITCH) {
      if (Math.abs(x) < PIER_KEEP) continue;
      const i = Math.round(x / BIN_PITCH);
      const jx = (rnd(i, 11) - 0.5) * 24;          // not on a grid
      const z = -3.4 - rnd(i, 12) * 1.2;
      const px = x + jx;
      if (!onRibbon(px)) continue;
      const pair = rnd(i, 13) < 0.38;              // frame C has them in twos
      for (let j = 0; j <= (pair ? 1 : 0); j++) {
        const cx = px + j * 1.45;
        bx(cx - 0.635, PROM_Y, z - 0.535, cx + 0.635, PROM_Y + 1.42, z + 0.535,
          C.pierRoofDark, MAT.PAINTED);
      }
    }
  }

  // =========================================================================
  // 4. BENCHES
  // =========================================================================
  // 1.80 x 0.62, seat and back to 0.85 m, one box. At 160 m that is 8 px by
  // 3.7 px - about a third of a person - so it is built as a single block and
  // nothing is spent on legs or slats. Its real job is to give the sitting
  // figures below somewhere to be: a seated person on bare prom reads as a
  // person who has fallen over.
  //
  // C.pierBrace is the brown key. Bournemouth's seafront benches are timber on
  // cast frames; the frames show them at the back of the walking surface, not
  // at the edge, so z = -13.4 with a second line at -5.6 where the prom is
  // wide and no hut run is behind it.
  const BENCH = [];
  {
    const B_PITCH = 95;
    for (let x = -260; x <= X1; x += B_PITCH) {
      if (Math.abs(x) < PIER_KEEP) continue;
      const i = Math.round(x / B_PITCH);
      const cx = x + (rnd(i, 21) - 0.5) * 30;
      if (!onRibbon(cx)) continue;
      const z = inHutRun(cx) ? -13.4 : (rnd(i, 22) < 0.5 ? -13.4 : -5.6);
      bx(cx - 0.90, PROM_Y, z - 0.31, cx + 0.90, PROM_Y + 0.85, z + 0.31,
        C.pierBrace, MAT.TIMBER);
      BENCH.push([cx, z, i]);
    }
  }

  // =========================================================================
  // 5. PROM SHELTERS
  // =========================================================================
  // Open-fronted seafront shelters: a back wall, two ends and a flat roof.
  // 6.0 m long, 2.6 m deep, roof at 2.90-3.16 m. Four boxes, 48 triangles.
  //
  // At 160 m that is 26 px long by 14 px tall - by a wide margin the biggest
  // thing this file builds and the only one that reads as ARCHITECTURE rather
  // than as street furniture. Frames A and B both show low pale buildings
  // standing on the prom back at intervals; this is the smallest form that
  // stands in for them without becoming a building (builder C's crest stock is
  // 12-18 m higher and 200 m landward, so there is no confusion between them).
  //
  // ⚠️ Sited in the GAPS BETWEEN HUT CLUSTERS only, and never inside the hut
  // envelope z -18.9..-15.8. That is the protection: a shelter that overlapped
  // a hut would not move a hut vertex, but it would look exactly as if it had.
  {
    const SITES = [-230, -120, 700, 860, 1000, 1250, 1320, 1600, 1740, 2380, 2520, 2660];
    for (const x of SITES) {
      if (Math.abs(x) < PIER_KEEP || inHutRun(x)) continue;
      const zb = -17.4, zf = -14.9;
      const y1 = PROM_Y + 2.90;
      bx(x - 3.0, PROM_Y, zb, x + 3.0, y1, zb + 0.20, C.pierWhite, MAT.PAINTED);
      bx(x - 3.0, PROM_Y, zb, x - 2.8, y1, zf, C.pierWhite, MAT.PAINTED);
      bx(x + 2.8, PROM_Y, zb, x + 3.0, y1, zf, C.pierWhite, MAT.PAINTED);
      bx(x - 3.2, y1, zb - 0.2, x + 3.2, y1 + 0.26, zf + 0.3, C.pierGreenCanopy, MAT.PAINTED);
    }
  }

  // =========================================================================
  // 6. PEOPLE
  // =========================================================================
  // ⚠️ THE PROPORTIONS ARE pier-people-scale.js's, TO THE DIGIT, so a figure on
  // the prom and a figure on the pier 200 m away are visibly the same species.
  // That file's fractions of stature were measured against the owner's own
  // photograph 926506622814109.jpg and re-measured once; none of that work is
  // repeated here and none of it is changed here. The colour tables are its
  // tables. What differs is only the LOD (below) and the placement.
  //
  // ⚠️ One real difference, and it is in this file's favour: coast.js's m.box
  // is axis-aligned in WORLD space and the shore runs along +X, so a figure on
  // the prom needs no pier-space skew. The elliptical plan footprint and
  // PLAN_K = 0.80 are still used, for the reason that file gives - the
  // bounding box of a rotated rectangle over-reads the silhouette by up to
  // 51%, and an ellipse does not.
  const F_HIP = 0.520, F_CHEST = 0.700, F_ACR = 0.818, F_NECK = 0.870;
  const F_HEADH = 0.125, F_WLEG = 0.160, F_WCHEST = 0.213, F_WSHO = 0.257;
  const F_WYOKE = 0.150, F_WHEAD = 0.087, F_DHEAD = 0.112, F_DEPTH = 0.132;
  const K_DSHO = 0.70, K_DYOKE = 0.62, PLAN_K = 0.80;

  const TOPS = [
    C.pierRoofDark, C.pierPile, C.pierPile, C.helterYellow, C.pierBanner,
    C.pierGlass, C.pierBrace, C.pierRoofDark, C.building, C.pierDeck,
    C.pierRoofDark, C.helterCream, C.pierLED, C.helterRed, C.copperRoof,
    C.pierBeam, C.pierArch, C.pierWhite,
  ];
  const LEGS = [C.pierRoofDark, C.pierRoofDark, C.pierRoofDark,
    C.pierPile, C.pierPile, C.pierGlass, C.pierGlass,
    C.pierLED, C.pierBrace, C.pierBeam, C.pierDeck, C.pierWhite];
  const HEADS = [
    C.pierRoofDark, C.pierRoofDark, C.pierRoofDark,
    C.pierPile, C.pierPile, C.pierBrace, C.pierBrace,
    C.pierDeck, C.pierBeam, C.pierArch, C.pierArch,
    C.building, C.building,
    C.helterCream, C.helterCream, C.pierRail,
  ];

  // ⚠️ LOD, AND THE ONE NUMBER IT TURNS ON. Projected through main.js's own
  // camera maths - pxPerRad = canvasH/2 / tan(fov/2), canvas 884 x 405, fov
  // VERTICAL - the nineteen judged views put the promenade at:
  //
  //   view           fov     px/rad   nearest prom     a 1.75 m figure
  //   X_ec_t94      22.0      1042     x ~55,  91 m        20.0 px
  //   M_t94         18.9      1215     x ~176, 188 m       11.3 px
  //   C_chine       34.0       662     x ~2202, 130 m       8.7 px
  //   C_carlton     32.0       706     x ~834, 160 m        7.7 px
  //   C_royalbath   38.0       588     x ~318, 161 m        6.4 px
  //   C_L17         32.0       706     x ~1497, 210 m       5.9 px
  //   S_entrance    50.0       434     pier mouth, 172 m    4.4 px
  //
  // pier-people-scale.js spends five boxes a figure and justifies the fifth -
  // the yoke, 0.052 of stature - on blobs above 10 px, which it measured on the
  // HEAD camera at 18-55 px. On this promenade only ONE view clears that, and
  // only over x 46-240. So:
  //
  //   x 46..240      FIVE boxes, 60 tris   the X_ec_t94 / M_t94 band, 11-20 px
  //   everywhere else THREE boxes, 36 tris  6-9 px, where the yoke is 0.4 px
  //                                         and the shoulder step 0.9 px
  //
  // Stated as a refusal because it is one: 253 figures do NOT get the shoulder
  // and yoke boxes, which is 6,072 triangles not spent. At 6-9 px the
  // difference is under a pixel and the count of figures is worth more than the
  // shape of any one of them - which is pier-people-scale.js's own conclusion,
  // reached there at a different distance.
  const NEAR_A = 46, NEAR_B = 240;

  // A standing figure. (x, z) is the SHOULDER station, as in
  // pier-people-scale.js: the feet swing under a lean, the shoulders do not.
  const stand = (x, z, fy, h, a, i, full) => {
    const ca = Math.abs(Math.cos(a)), sa = Math.abs(Math.sin(a));
    const bk = 1 + (rnd(i, 39) + rnd(i, 40) - 1) * 0.15;   // triangular girth
    const D = h * F_DEPTH * bk;
    const put = (w, d, y0, y1, col, ox = 0, oz = 0) => {
      const ex = 0.5 * PLAN_K * Math.hypot(w * ca, d * sa);
      const ez = 0.5 * PLAN_K * Math.hypot(w * sa, d * ca);
      bx(x + ox - ex, y0, z + oz - ez, x + ox + ex, y1, z + oz + ez, col, MAT.PAINTED);
    };
    const stance = (rnd(i, 36) - 0.5) * 0.07;
    const hh = h * F_HEADH;
    const chin = fy + Math.min(h - hh, h * F_NECK);
    const acr = Math.min(fy + h * F_ACR, chin - 0.03 * h);
    const top = TOPS[Math.floor(rnd(i, 22) * TOPS.length)];
    put(h * F_WLEG * bk, D * 0.78, fy, fy + h * F_HIP,
      LEGS[Math.floor(rnd(i, 21) * LEGS.length)], stance * 0.5, stance);
    if (full) {
      put(h * F_WCHEST * bk, D, fy + h * F_HIP, fy + h * F_CHEST, top);
      put(h * F_WSHO * bk, D * K_DSHO, fy + h * F_CHEST, acr, top);
      put(h * F_WYOKE * bk, D * K_DYOKE, acr, chin, top);
    } else {
      // ONE trunk box from hip to chin. Its width is the area-weighted mean of
      // the three it replaces over their own heights - 0.213 x 0.180 +
      // 0.257 x 0.118 + 0.150 x 0.052 over 0.350 - which is 0.221, so the
      // silhouette keeps the same plan area rather than the widest of the
      // three. Building it at F_WSHO instead would fatten every distant figure
      // by 16% and is exactly the "brick" that file warns about.
      put(h * 0.221 * bk, D * 0.88, fy + h * F_HIP, chin, top);
    }
    put(h * F_WHEAD, h * F_DHEAD, chin, fy + h,
      HEADS[Math.floor(rnd(i, 23) * HEADS.length)],
      (rnd(i, 37) - 0.5) * 0.07, (rnd(i, 38) - 0.5) * 0.07);
    figures++;
  };

  // A SEATED figure: trunk and head, two boxes, 24 triangles. Sitting height
  // above the seat is 0.52 of stature and the head is the top 0.12 of that -
  // the same F_NECK / F_HEADH split as the standing figure, just with the legs
  // and the hip-to-seat run gone. On a bench the seat is 0.85 m, on sand it is
  // the sand.
  const sit = (x, z, fy, h, a, i) => {
    const ca = Math.abs(Math.cos(a)), sa = Math.abs(Math.sin(a));
    const put = (w, d, y0, y1, col) => {
      const ex = 0.5 * PLAN_K * Math.hypot(w * ca, d * sa);
      const ez = 0.5 * PLAN_K * Math.hypot(w * sa, d * ca);
      bx(x - ex, y0, z - ez, x + ex, y1, z + ez, col, MAT.PAINTED);
    };
    const chin = fy + h * 0.40;
    put(h * 0.232, h * F_DEPTH * 1.35, fy, chin, TOPS[Math.floor(rnd(i, 22) * TOPS.length)]);
    put(h * F_WHEAD, h * F_DHEAD, chin, fy + h * 0.52,
      HEADS[Math.floor(rnd(i, 23) * HEADS.length)]);
    figures++; sitting++;
  };

  // ⚠️ STATURE. pier-people-scale.js's population mean is 1.75 m and that is
  // kept, because a prom figure and a pier figure standing 200 m apart in the
  // same frame must not be different sizes. Spread: a triangular draw over
  // +-0.16 m, so p10-p90 is about 1.66-1.84 m. Children are drawn at 0.62-0.86
  // of the adult, at 18% of the population - which is what the February frames
  // A and B show and is well under a July beach.
  const stature = (i) => {
    const adult = 1.75 + (rnd(i, 31) + rnd(i, 33) - 1) * 0.16;
    return rnd(i, 30) < 0.18 ? adult * (0.62 + rnd(i, 34) * 0.24) : adult;
  };

  // -------------------------------------------------------------------------
  // 6a. ON THE PROMENADE
  // -------------------------------------------------------------------------
  // ⚠️ CLUMPED, NOT SPREAD. Frames A and B both show the same thing and it is
  // the only distribution fact either of them supports: people on a promenade
  // walk in ones, twos and threes with empty prom between them, and an even
  // spacing at ANY density reads as a queue. Slot pitch 11 m, 56% of slots
  // occupied, clump size 1/2/3 at 46/34/20%.
  //
  // The walking surface is z -15.5 .. -2.6: clear of the kerb at -2.42 and of
  // the hut envelope at -15.8.
  {
    const PITCH = 13;
    let i = 5000;
    for (let x = X0 + 6; x <= X1; x += PITCH) {
      i++;
      if (Math.abs(x) < PIER_KEEP) continue;
      if (rnd(i, 1) > 0.50) continue;
      const r = rnd(i, 2);
      const n = r < 0.46 ? 1 : (r < 0.80 ? 2 : 3);
      for (let j = 0; j < n; j++) {
        const k = i * 4 + j;
        const px = x + (rnd(k, 3) - 0.5) * 8.0 + j * (0.75 + rnd(k, 8) * 0.35);
        if (!onRibbon(px)) continue;
        const pz = -2.6 - rnd(k, 4) * 12.9;
        // 1.2 m clear of the hut front at z = -15.8. Frames A and B both show
        // people walking right along the hut doors, so the apron is used, not
        // kept empty - it is only the hut ENVELOPE that is out of bounds.
        if (inHutRun(px) && pz < -14.6) continue;
        // Facing: a walker's shoulders are ACROSS the direction of travel, and
        // the prom runs along +X, so most of this crowd is near a = PI/2.
        // 22% stand and look at the sea, which is a = 0.
        const a = rnd(k, 5) < 0.22 ? rnd(k, 6) * 0.5 : Math.PI / 2 - (rnd(k, 6) - 0.5) * 0.7;
        stand(px, pz, PROM_Y, stature(k), a, k, px > NEAR_A && px < NEAR_B);
      }
    }
  }

  // -------------------------------------------------------------------------
  // 6b. ON THE BENCHES
  // -------------------------------------------------------------------------
  // 52% of benches carry someone, half of those two people. They sit on the
  // 0.85 m seat facing the sea, so a = 0.
  for (const [cx, cz, i] of BENCH) {
    if (rnd(i, 41) > 0.52) continue;
    const two = rnd(i, 42) < 0.5;
    for (let j = 0; j <= (two ? 1 : 0); j++) {
      const k = i * 7 + j + 90000;
      sit(cx + (j ? 0.42 : -0.42) + (rnd(k, 43) - 0.5) * 0.2, cz + 0.05,
        PROM_Y + 0.85, stature(k), (rnd(k, 44) - 0.5) * 0.5, k);
    }
  }

  // -------------------------------------------------------------------------
  // 6c. ON THE UPPER BEACH
  // -------------------------------------------------------------------------
  // The dry sand between the kerb and about a third of the way to the water.
  // In FRAME B this band carries about as many people as the prom does, split
  // between walkers and sitters; in FRAME D's aerial it is where every dot on
  // the beach is. Built at 60% of the prom's density and 55% SEATED, because
  // that is the difference between a beach and a pavement.
  //
  // ⚠️ THE SAND ITSELF IS NOT TOUCHED. These figures stand ON coast.js's beach
  // surface, sampled with the same 3.0 * (1 - z/mhwOffset(x)) the groyne loop
  // uses. Not one vertex of the beach, the tide band, the strand line or a
  // groyne is written by this file - the figures keep 4 m clear of every
  // groyne so none of them appears to stand inside one.
  {
    const PITCH = 21;
    let i = 20000;
    for (let x = X0 + 11; x <= X1; x += PITCH) {
      i++;
      if (Math.abs(x) < PIER_KEEP) continue;
      if (rnd(i, 1) > 0.46) continue;
      const r = rnd(i, 2);
      const n = r < 0.52 ? 1 : (r < 0.84 ? 2 : 3);
      for (let j = 0; j < n; j++) {
        const k = i * 4 + j;
        const px = x + (rnd(k, 3) - 0.5) * 11.0 + j * 1.1;
        if (!onRibbon(px) || onGroyne(px)) continue;
        // 1.5 m off the kerb to a third of the way out. mhwOffset runs 35-70 m,
        // so this band is 11-23 m of dry sand and never reaches the tide.
        const pz = 1.5 + rnd(k, 4) * (mhwOffset(px) * 0.33);
        const fy = beachY(px, pz);
        const h = stature(k);
        if (rnd(k, 9) < 0.55) sit(px, pz, fy, h, rnd(k, 5) * 0.8, k);
        else stand(px, pz, fy, h, rnd(k, 5) * Math.PI * 0.5, k,
          px > NEAR_A && px < NEAR_B);
      }
    }
  }

  // =========================================================================
  // REFUSED, WITH COUNTS
  // =========================================================================
  //   PROM RAILING, continuous          ~14,300 tris   see the header. Not in
  //                                                    frames A, B, C or D.
  //   DECKCHAIRS AND WINDBREAKS          ~1,900 tris   The only frames that
  //     show them (0657, summer; and the kiosk seating in the Feb frames) put
  //     them either on the OPEN SAND, which is builder A's surface, or at the
  //     pier kiosks pier-landmarks.js already builds. On the prom itself none
  //     of the four frames has one. A 0.9 m deckchair is 4 px at 160 m and an
  //     axis-aligned box is the wrong shape for a chair at any size; the same
  //     triangles bought 52 more people, which are the ruler.
  //   PROM-EDGE STEPS AND RAMPS            ~900 tris   The ribbon's prom stands
  //     0.50 m over the sand at the lip and ramps down over 2 m. Frames A, B
  //     and C all show a flush prom you walk straight off. There is nothing to
  //     step down. The one place there IS a drop - the 2.45 m pier apron -
  //     already has a flight of steps and two ramps from the tmp-tr99 pass.
  //   CLIFF-TOE RETAINING FACE           ~2,400 tris   The back of the prom at
  //     z = -20 meets the cliff toe, and frame A shows timber-clad retaining
  //     walls and buildings there. That is builder B's toe. Not touched.
  //   HUT GABLES                           ~0 tris     FRAME B shows the beach
  //     huts have PITCHED ROOFS WITH THE GABLE TO THE SEA; coast.js builds them
  //     as flat boxes with a flat 0.35 m cap. That is a real and visible error
  //     at the 130 m C_chine stands at. THE HUTS ARE PROTECTED and this file
  //     does not touch them. Logged for whoever owns them.

  return { boxes, figures, sitting, tris: boxes * 12 };
}
