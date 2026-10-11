// BOURNEMOUTH PIER - the LANDMARKS AT THE ENTRANCE, on the promenade.
//
// Everything in this file sits LANDWARD of the pier root (s < 0). Nothing here
// stands on the pier deck; nothing here may touch it. That is not a stylistic
// choice - the five other pier-*.js modules all live at s >= 0, and the whole
// reason tools/module-check.mjs exists is that modules built in isolation put
// geometry in each other's volume. Staying strictly on the far side of s = 0
// is what makes this file safe to build in parallel with them.
//
// ---------------------------------------------------------------------------
// WHY A FERRIS WHEEL IS HERE AT ALL
//
// Frame 0657 (sunny drone shot, looking seaward straight down the pier axis)
// is the single most recognisable image in the whole reference set, and the
// biggest object in it is not the pier: it is a LARGE WHITE OBSERVATION WHEEL
// standing on the promenade at the pier entrance, centred on the pier's own
// centreline, with the pier running away exactly through the middle of it.
// A model of Bournemouth Pier that omits it is missing the thing a viewer
// would name first.
//
// ---------------------------------------------------------------------------
// ⚠️ SEASONALITY - READ THIS BEFORE TREATING THE WHEEL AS PERMANENT
//
// The wheel is NOT a permanent structure. Frames 0599, 0652 and 0558 are all
// low-sun, thin-crowd, coats-on frames with no wheel anywhere in them; 0657 is
// a packed-beach summer frame with one.
//
// ⚠️ BUT DO NOT OVER-READ THOSE THREE. An earlier version of this note claimed
// 0599 was "a drone shot from essentially the same place as 0657" showing "no
// base, ballast or hardstanding where one would be". That is wrong and the
// argument built on it does not stand. 0599 is 640x360 and shot from perhaps
// 20 m up almost directly OVER the pier entrance looking seaward down the axis
// - not from 50 m up and 90 m landward, which is where 0657 is. The wheel's
// station is BEHIND that camera, so 0599 cannot show its absence; 0652 and
// 0558 look along the beach and miss the site too. What those frames do show,
// and what this file leans on, is the promenade railing, the lamp columns and
// the entrance boardwalk.
//
// The real evidence for seasonality is the index, and it is enough on its own:
//
// The reference index lists the wheel in four videos - 587 ("big wheel
// ashore"), 600 and 667 (both "big wheel" over Pier Approach), and 657 - out
// of 84. Verified against PIER-INDEX.json: 84 entries, exactly those four
// carry a wheel. (587 is a NIGHT frame and 600/667 are rainbows, so "all
// busy-season" overstates it - what the four support is only that the wheel is
// present in a twentieth of the footage.) So: a RECURRENT SEASONAL
// INSTALLATION rather than a structure. It is built here because
// the owner asked for the 0657 look specifically, and because the wheel is
// what makes that composition read as Bournemouth - but if this scene is ever
// dated to the off season, the honest thing is to switch it off, not to defend
// it as permanent.
//
// ---------------------------------------------------------------------------
// HOW THE SIZE AND POSITION WERE DERIVED   (all from frame 0657, 716 x 894)
//
// There is nothing of known size next to the wheel, so the wheel was measured
// against the PIER, by first solving the drone camera and then reading the
// wheel through it.
//
//   1. HORIZON. The sea/sky edge is at row 215 (found numerically as the row
//      of maximum vertical gradient, in two independent column bands, both
//      giving 215). The image centre row is 447, so f*tan(pitch) = 232 px.
//
//   2. SCALE ON THE DECK PLANE. The neck is 11 m wide (given). Measured on an
//      8x crop: 49 px across at row 440, 58 px at row 470. For a point on a
//      plane the camera height above that plane falls out as
//        h = (y - y_horizon) / (px_per_m * sqrt(1 + tan^2 pitch))
//      ⚠️ The 50.5 m and 48.4 m first written here were computed with the
//      sqrt term set to 1, i.e. before step 3 knew the pitch. Carried through
//      properly at pitch 12.9 they are 49.2 m and 47.1 m - still a 4% spread,
//      which is about as good as two hand-read edges on a 716 px frame get,
//      and still centred on the 48.2 m that step 3 settles on. Corrected here
//      rather than deleted, because the two rows disagreeing by 4% is the only
//      honest error bar this solution has.
//
//   3. PITCH AND FOCAL LENGTH. Two identified stations 134 m apart on a known
//      object: the neck/head junction s = 128 at row 436 (where the deck stops
//      being 11 m wide) and the seaward end of the head deck s = 262 at row
//      355. Solving those with the horizon constraint gives
//        pitch 12.9 deg,  f = 1010 px,  camera 48.2 m above the deck plane.
//      A 13 degree depression is a shallow, near-level drone shot, which is
//      exactly why the wheel's base falls off the bottom of the frame.
//
//   4. THE WHEEL. Hub at (371, 714); rim half-width 235 px measured at hub
//      height. Feeding those back through the camera, with the only assumption
//      being that the bottom of the rim clears the promenade by about 3 m (a
//      transportable wheel's loading platform):
//        RADIUS 15.3 m  ->  DIAMETER ~31 m
//        HUB 18.3 m above the promenade
//        60 m from the camera nadir, against 93 m for the pier root
//        -> the wheel centre stands ~32 m LANDWARD of the pier root
//        lateral offset from the pier centreline: +1.0 m, i.e. ON the axis.
//
//      CONFIDENCE. Diameter: good, +-4 m. It is insensitive to the pitch and
//      focal length (they nearly cancel) and depends mostly on the camera
//      height, which two independent neck readings agreed on. 31 m also lands
//      squarely on the standard transportable-wheel sizes, which is a useful
//      independent sanity check rather than the source of the number.
//      Lateral position: good, +-2 m, and it is the one quantity that needs no
//      camera solution at all - it is a straight ratio against the measured
//      rim radius.
//      DISTANCE LANDWARD: WEAK, +-8 m at best. The drone's 13 degree sight
//      line means height and distance trade off against each other almost
//      exactly, and the reading depends on the assumed 3 m rim clearance.
//
//   5. WHERE IT IS ACTUALLY BUILT, and why - REWRITTEN 2026-09-18 (tmp-tr106).
//      BUILT AT s = -17.4, ON THE AXIS, STANDING ON THE 5.37 TERRACE.
//
//      ⚠️ THE OLD NOTE HERE WAS WRONG ABOUT THE GROUND AND THE ERROR MATTERED.
//      It said "beyond z = -20 the lofted ribbon starts climbing the cliff toe
//      at 36 degrees", and built the wheel at -14.4 to stay off that slope.
//      There is no 36 degree slope at the pier. coast.js's `valleyFaceRun`
//      (line 655) takes the ribbon's x at the pier - the pier root is at world
//      x = OX = -COAST.startX = -230, i.e. COAST x = 0 - where `wv` is 1, so
//      face collapses from 30 m to 2.5 m and run stretches from 41 m to 34 m.
//      The ground behind z = -20 at the pier rises 2.5 m over 34 m: 4.2
//      degrees. It is open ground, not a cliff. Every "it cannot go there"
//      argument built on that sentence has to be re-made, and this one was.
//
//      WHAT DECIDES IT INSTEAD IS THE EA DSM (ref-cache/pier_dsm.tif, model
//      mapping from tmp-tr13/dsm_deck.py: model o = DSM o + 14.6, ROOT_E
//      408890, ROOT_N 90695, DE .316, DN -.949; probe tmp-tr106/dsm_land.py,
//      output tmp-tr106/ev/dsm_land.txt). Read down the pier's own axis:
//
//        s   -14 -16 -18 -20 -22 -24 -26 -28 -30 -32 ...  ODN at o = 0
//            4.8 4.9 6.8 4.6 9.7 12.4 14.1 14.5 15.0 15.7
//
//      From s = -22 landward the axis is INSIDE A BUILDING that rises to 18.4
//      ODN - the entrance block, footprint o -8..+28 by s -22..-50 (see the
//      pavilion note below). The only open terrace on the axis is s -14..-21,
//      at 4.6-4.9 ODN. That is 4.80 +- 0.15, which is exactly the apron level
//      coast.js now builds at 5.37 model (= DECK 5.470 - the measured 0.10 m
//      deck-to-terrace step, tmp-tr99). So the wheel stands at 5.37, not at
//      the 3.5 lower promenade, and its rim foot clears that terrace by the
//      3.0 m the camera solution assumed - unchanged, because raising the base
//      raises the hub with it.
//
//      ⚠️ WHAT THIS GIVES UP. 0657 reads the pavilion as standing BEHIND the
//      wheel, which puts the wheel landward of the building's front. The DSM
//      says the ground that would need is the building. The wheel's own
//      confidence note grades its STATION weak (+-8 m) and its LATERAL good
//      (+-2 m), so the axis is kept and the station is moved to the only part
//      of the axis that is open ground. The wheel is therefore built SEAWARD
//      of the pavilion's front instead of landward of it. Stated, not hidden.
//
//      It is also now clear of the pier deck, which since tmp-tr99 starts at
//      s = -16.0: every gondola is landward of -16.4 and both ballast pads are
//      outboard of |o| = 5.8 against an 11 m deck. Nothing of the wheel stands
//      on, or hangs over, the deck.
//
// ---------------------------------------------------------------------------
// WHAT THE FRAMES DO NOT ESTABLISH, and is therefore NOT built
//
//   - Gondola count. Counting cells around the rim in 0657 gives roughly
//     8 per quadrant, and a numerical brightness sweep around the rim was too
//     noisy against bright sand to confirm it. 32 is built as the reading that
//     matches both the cell count and the ~2.2 m pods measured against the rim.
//   - Any livery, signage or lighting on the wheel. 0657 is a daylight frame
//     and shows white structure and pale pods, nothing more.
//   - Whether the entrance pavilion behind it is enclosed or a canopy - see
//     the note on it below.
//   - The promenade CROWD. 0657's promenade is packed, but pier-people-scale.js
//     already owns every human figure in this scene and has a measured
//     proportion system. Adding a second, different one here is precisely the
//     "two modules building the same feature" failure module-check exists to
//     catch. Extending that module's station range below 0 is the right fix,
//     and it belongs in that file, not this one.
//
// ---------------------------------------------------------------------------

const TAU = Math.PI * 2;

export function addPierLandmarks(ctx) {
  const { pbox, at, m, C, MAT } = ctx;

  // The promenade deck top in coast.js: row [-2, 3.5] .. [-20, 3.5] of the
  // lofted beach/prom/cliff ribbon. Everything here stands on it, so it is
  // read from there rather than guessed - a landmark floating 300 mm above the
  // prom is as obvious as one buried in it.
  const PROM_Y = 3.5;
  // Flat promenade in the model runs z = -2 .. -20. Seaward of z = -2 the ribbon
  // steps down to the beach; landward of z = -20 it rises, but at the PIER it
  // rises only 2.5 m over 34 m (4.2 degrees) - see header note 5. The lamps, the
  // promenade railing and the kiosks all stand on this level and are unchanged.
  //
  // ---- THE RAISED APRON, 2026-09-18 (tmp-tr106) ----------------------------
  // coast.js (tmp-tr99) builds a raised terrace at the pier mouth: |o| <= 16.6,
  // from a bowed seaward edge back to z = -20, top 5.37. That IS the ground the
  // wheel and the pavilion stand on - EA DSM 4.78-4.91 ODN across 13 offsets,
  // and 4.6-4.9 straight down the axis. Building them at PROM_Y buried them
  // 1.87 m; both now sit on AP_Y.
  const AP_Y = 5.37;
  // Everything that stands on the terrace is nevertheless built DOWN FROM 3.5,
  // not from 5.37. The terrace only reaches z = -20; behind that the ribbon is
  // 3.5 rising, and a mass that starts at 5.37 would float there. Starting at
  // PROM_Y makes the overhang a retaining base instead, which is what the real
  // terrace edge is.

  // ⚠️ THE 6.1 DEGREE DRIFT. The pier runs 6.1 degrees off shore-normal, so
  // coast z = s*0.9943 - o*0.1063: a run built along the pier's own OFFSET axis
  // moves 0.107 m seaward for every metre along the shore. Over a 46 m run of
  // promenade railing that is 4.9 m - which walks one end of it clean off the
  // promenade and 2.7 m out onto the sloping beach, floating it 0.7 m in the
  // air. Anything that runs ALONG THE SHORE therefore has to have its station
  // solved per position to hold a constant distance from the seawall. Compact
  // objects (the wheel, the pavilion) are small enough in o not to care.
  const stationAtZ = (z, o) => (z + o * 0.1063) / 0.9943;

  // World point from pier station/offset/height. ctube works in WORLD
  // coordinates while everything else here is in pier space; without this a
  // round object cannot be placed on a pier that runs 6.1 degrees off axis.
  const wp = (s, o, y) => { const q = at(s, o); return [q[0], y, q[1]]; };
  const tube = (A, B, r, col, mat, seg) =>
    m.ctube(A[0], A[1], A[2], B[0], B[1], B[2], r, col, mat, seg);

  // A flat triangle in world space with a correct outward normal. Used for the
  // pavilion roof: a pitched plane cannot be made of boxes, and a stepped
  // stack of tapering boxes reads as a ziggurat the moment the sun is low.
  const tri3 = (A, B, Cp, col, mat) => {
    let nx = (B[1] - A[1]) * (Cp[2] - A[2]) - (B[2] - A[2]) * (Cp[1] - A[1]);
    let ny = (B[2] - A[2]) * (Cp[0] - A[0]) - (B[0] - A[0]) * (Cp[2] - A[2]);
    let nz = (B[0] - A[0]) * (Cp[1] - A[1]) - (B[1] - A[1]) * (Cp[0] - A[0]);
    const l = Math.hypot(nx, ny, nz) || 1;
    nx /= l; ny /= l; nz /= l;
    // Roof planes face up and out. If the cross product came out pointing
    // down, the winding is backwards and the facet would be culled - swap two
    // corners rather than negating the normal, or the triangle is lit right
    // and drawn away anyway.
    const flip = ny < 0;
    if (flip) { nx = -nx; ny = -ny; nz = -nz; }
    const a = m.pushC(A[0], A[1], A[2], nx, ny, nz, col, mat);
    const b = m.pushC(B[0], B[1], B[2], nx, ny, nz, col, mat);
    const c = m.pushC(Cp[0], Cp[1], Cp[2], nx, ny, nz, col, mat);
    if (flip) m.tri(a, c, b); else m.tri(a, b, c);
  };

  // =========================================================================
  // THE OBSERVATION WHEEL
  // =========================================================================
  //
  // MEASURED (frame 0657, through the camera solution in the header):
  const WHEEL_R = 15.3;          // rim radius, +-2 m
  const HUB_H = 18.3;            // hub above the promenade, +-2 m
  const WHEEL_S = -17.4;         // measured -32, built at -17.4: see header 5.
                                 // Was -14.4, which since tmp-tr99 put the wheel
                                 // astride the new deck (s >= -16).
  const WHEEL_O = 0.0;           // measured +1.0 m off the pier centreline;
                                 // 1 m is below what a 716 px frame resolves,
                                 // and dead-centre is what the shot reads as.
  const HUB_Y = AP_Y + HUB_H;    // 23.67. Rim top ~39 m, which puts it above the
                                 // clifftop skyline - as in 0657, where it
                                 // towers over everything ashore. Rim FOOT is
                                 // 8.37, i.e. 3.0 m over the 5.37 terrace, which
                                 // is the clearance the camera solution assumed:
                                 // raising the base raised the hub with it, so
                                 // the solve is unchanged, not re-fitted.

  // INFERRED, not measured. The wheel's PLANE is set across the pier's own
  // offset axis, which is 6.1 degrees off shore-parallel. In 0657 the wheel
  // projects as a near-perfect circle looking straight down the pier axis, so
  // its plane is within a few degrees of perpendicular to that axis - which is
  // all the frame can say. 6 degrees over a 31 m wheel is 3 m of depth
  // difference end to end, below the reference's resolution, and building it
  // in pier space keeps every bound in this file comparable with the other
  // pier modules in module-check.
  const N = 32;                  // rim nodes / gondolas - see header
  const CHORD_S = 0.9;           // half the rim truss width, i.e. 1.8 m across
  const INNER_DROP = 2.8;        // inner chord sits this far inside the rim -
                                 // deep enough that the gondolas hang between
                                 // the chords without fouling either
  const R_CHORD = 0.16;          // 320 mm rim chord
  const R_SPOKE = 0.06;          // 120 mm spoke - 0657 shows chunky rods, not
                                 // hairline cables
  const HUB_R = 1.6;             // spokes run TANGENT to this circle, which is
                                 // what makes the crossed spider web in 0657.
                                 // Radial spokes would read as a bicycle wheel
                                 // and this plainly is not one.

  const node = (i) => {
    const th = (i / N) * TAU;    // i = 0 at the top, i = N/2 at the bottom, so
                                 // a gondola sits at the loading platform
    return { o: WHEEL_O + WHEEL_R * Math.sin(th),
             y: HUB_Y + WHEEL_R * Math.cos(th), th };
  };

  // ---- rim: a triangular-section truss, two outer chords and one inner ----
  for (let i = 0; i < N; i++) {
    const a = node(i), b = node((i + 1) % N);
    const rIn = WHEEL_R - INNER_DROP;
    const aIn = { o: WHEEL_O + rIn * Math.sin(a.th), y: HUB_Y + rIn * Math.cos(a.th) };
    const bIn = { o: WHEEL_O + rIn * Math.sin(b.th), y: HUB_Y + rIn * Math.cos(b.th) };
    // the two outer chords, one either side of the wheel plane
    for (const ds of [-CHORD_S, CHORD_S]) {
      tube(wp(WHEEL_S + ds, a.o, a.y), wp(WHEEL_S + ds, b.o, b.y),
        R_CHORD, C.pierRail, MAT.PAINTED, 5);
    }
    // the inner chord, on the plane
    tube(wp(WHEEL_S, aIn.o, aIn.y), wp(WHEEL_S, bIn.o, bIn.y),
      R_CHORD * 0.85, C.pierRail, MAT.PAINTED, 5);
    // cross member closing the truss at every node, and the lacing down to the
    // inner chord that makes the rim read as a truss rather than a hoop
    tube(wp(WHEEL_S - CHORD_S, a.o, a.y), wp(WHEEL_S + CHORD_S, a.o, a.y),
      R_CHORD * 0.6, C.pierRail, MAT.PAINTED, 4);
    tube(wp(WHEEL_S - CHORD_S, a.o, a.y), wp(WHEEL_S, bIn.o, bIn.y),
      R_CHORD * 0.5, C.pierRail, MAT.PAINTED, 4);
    tube(wp(WHEEL_S + CHORD_S, a.o, a.y), wp(WHEEL_S, bIn.o, bIn.y),
      R_CHORD * 0.5, C.pierRail, MAT.PAINTED, 4);
  }

  // ---- spokes -------------------------------------------------------------
  // Tangent to the hub circle, in both rotational directions, to both hub
  // flanges. arccos(HUB_R / WHEEL_R) is 84 degrees, so the spokes leave the hub
  // almost tangentially and cross their neighbours several times on the way
  // out - which is the pattern in 0657 and the single feature that stops a
  // wheel this size looking like a wagon wheel.
  const BETA = Math.acos(HUB_R / WHEEL_R);
  for (let i = 0; i < N; i++) {
    const a = node(i);
    for (const sgn of [-1, 1]) {
      const tt = a.th + sgn * BETA;
      const to = WHEEL_O + HUB_R * Math.sin(tt);
      const ty = HUB_Y + HUB_R * Math.cos(tt);
      for (const ds of [-0.55, 0.55]) {
        tube(wp(WHEEL_S + ds * 1.6, a.o, a.y), wp(WHEEL_S + ds, to, ty),
          R_SPOKE, C.pierRail, MAT.PAINTED, 4);
      }
    }
  }

  // ---- hub ----------------------------------------------------------------
  tube(wp(WHEEL_S - 1.9, WHEEL_O, HUB_Y), wp(WHEEL_S + 1.9, WHEEL_O, HUB_Y),
    0.45, C.pierBeam, MAT.PAINTED, 10);
  for (const ds of [-0.55, 0.55]) {
    tube(wp(WHEEL_S + ds - 0.2, WHEEL_O, HUB_Y), wp(WHEEL_S + ds + 0.2, WHEEL_O, HUB_Y),
      HUB_R, C.pierRail, MAT.PAINTED, 12);
  }

  // ---- support A-frames and ballast base -----------------------------------
  // Not measurable: in 0657 the legs are directly behind the wheel and read
  // only as a pale mass around the hub. This is the standard transportable
  // arrangement - two A-frames straddling the wheel plane, bearing at the
  // hub, feet on a ballast base.
  //
  // ⚠️ THE 2.0 m SPLAY IS TIGHTER STILL THAN THE 4.0 IT REPLACES - 83 degrees
  // from horizontal against 78. It is set by the terrace, not by the reference,
  // and the terrace got smaller when the numbers got better: the pads have to
  // fit between the pavilion's front at s = -20.2 and the pier deck at s = -16,
  // which is 4.2 m of usable station against the 9.2 m the old note assumed.
  // The whole leg arrangement is INFERRED - in 0657 the legs are directly
  // behind the wheel and read only as a pale mass around the hub.
  //
  // FOOT_O 6.8 -> 7.2 for a measured reason, not an aesthetic one: the pad is
  // 2.8 m across, so at 6.8 its inner edge stood at o = 5.4 against pier.js's
  // 11 m deck half-width of 5.5, i.e. a 0.1 m by 2.2 m by 0.08 m sliver of
  // ballast inside the deck slab. tools/module-check.mjs fails at 0.01 cubic
  // metres and that is 0.045. At 7.2 the inner edge is 5.8 and clear.
  const BEAR_O = 2.4;            // bearing either side of the wheel plane
  const FOOT_O = 7.2;
  const FOOT_S = 2.0;
  const BASE_Y = AP_Y + 0.9;
  for (const so of [-1, 1]) {
    const bear = wp(WHEEL_S, WHEEL_O + so * BEAR_O, HUB_Y);
    const f0 = wp(WHEEL_S - FOOT_S, WHEEL_O + so * FOOT_O, BASE_Y);
    const f1 = wp(WHEEL_S + FOOT_S, WHEEL_O + so * FOOT_O, BASE_Y);
    tube(bear, f0, 0.34, C.pierRail, MAT.PAINTED, 6);
    tube(bear, f1, 0.34, C.pierRail, MAT.PAINTED, 6);
    // tie across the A at a third height, plus one diagonal
    const t0 = wp(WHEEL_S - FOOT_S * 0.62, WHEEL_O + so * (BEAR_O + (FOOT_O - BEAR_O) * 0.62),
      AP_Y + (HUB_H - 0.9) * 0.38 + 0.9);
    const t1 = wp(WHEEL_S + FOOT_S * 0.62, WHEEL_O + so * (BEAR_O + (FOOT_O - BEAR_O) * 0.62),
      AP_Y + (HUB_H - 0.9) * 0.38 + 0.9);
    tube(t0, t1, 0.16, C.pierRail, MAT.PAINTED, 5);
    tube(t0, f1, 0.13, C.pierRail, MAT.PAINTED, 5);
    // Ballast: a transportable wheel is not bolted down, it is weighted down.
    // 0.4 m of overhang, and the pad runs from PROM_Y so that the 0.6 m of its
    // east end that overruns the apron's z = -20 back edge (the 6.1 degree
    // drift costs 0.91 m of station at o = +8.6) is a retaining nib standing on
    // the rising ground rather than a slab floating over it.
    pbox(WHEEL_S - FOOT_S - 0.4, WHEEL_S + FOOT_S + 0.4,
      WHEEL_O + so * FOOT_O - 1.4, WHEEL_O + so * FOOT_O + 1.4,
      PROM_Y, BASE_Y, C.pierBeam, MAT.CONCRETE);
  }
  // bearing-to-bearing tie across the top
  tube(wp(WHEEL_S, WHEEL_O - BEAR_O, HUB_Y), wp(WHEEL_S, WHEEL_O + BEAR_O, HUB_Y),
    0.2, C.pierRail, MAT.PAINTED, 6);

  // ---- gondolas -----------------------------------------------------------
  // Pods hang from a pivot just inside the outer chords and stay LEVEL, so
  // their boxes are axis-aligned in pier space - which is what pbox gives.
  // 2.2 m wide is what the pods measure against the rim in 0657 (25 px on the
  // far side of the wheel, at 15.8 px/m there); the depth and height are
  // inferred to suit.
  //
  // ⚠️ THE PIVOT RADIUS IS NOT THE RIM RADIUS. Hung at WHEEL_R - 0.35 the pods
  // rendered HALF OUTSIDE the rim - at the 3 o'clock station the cabin's
  // outboard face sat 0.75 m proud of the chord it hangs from, which no wheel
  // has ever looked like. The cabin swings inside the rim, so the pivot has to
  // be a cabin half-width plus clearance in from it.
  const G_PIVOT_R = WHEEL_R - 1.45;
  const G_W = 1.02, G_D = 0.95, G_H = 2.1, G_DROP = 0.6;
  for (let i = 0; i < N; i++) {
    const th = (i / N) * TAU;
    const po = WHEEL_O + G_PIVOT_R * Math.sin(th);
    const py = HUB_Y + G_PIVOT_R * Math.cos(th);
    const top = py - G_DROP;
    tube(wp(WHEEL_S, po, py), wp(WHEEL_S, po, top), 0.06, C.pierRail, MAT.PAINTED, 4);
    // Shell, then the glazed band. The band is pushed a hair proud in s so it
    // does not z-fight the shell, and kept well inside it in o and y: from the
    // water the wheel is seen nearly face-on, so the band is most of what the
    // pod shows, and a full-height one turns 32 pale pods into 32 black
    // rectangles. 0657's pods are PALE with a dark slot, not dark boxes.
    pbox(WHEEL_S - G_D, WHEEL_S + G_D, po - G_W, po + G_W,
      top - G_H, top, C.pierWhite, MAT.PAINTED);
    pbox(WHEEL_S - G_D - 0.03, WHEEL_S + G_D + 0.03, po - G_W * 0.66, po + G_W * 0.66,
      top - G_H * 0.70, top - G_H * 0.28, C.pierGlass, MAT.PAINTED);
  }

  // =========================================================================
  // THE ENTRANCE PAVILION
  // =========================================================================
  //
  // WHAT 0657 SHOWS: immediately behind the wheel, a broad low pale mass with
  // a faceted, repeatedly PEAKED roof - a run of pitched triangular facets
  // with pale spikes at the apexes - sitting across the pier's centreline.
  // Sampled colour on the sunlit facets is #7A533F and on the shaded ones
  // #4D413A: both WARM, which says one roof material lit two ways, not two
  // materials. That light/dark split is deliberately NOT baked in here - it is
  // a lighting artefact of that one afternoon and the renderer does its own.
  //
  // ⚠️ WHAT 0657 COULD NOT SHOW, AND THE DSM CAN - REBUILT 2026-09-18
  // (tmp-tr106). The drone's 13 degree sight line makes size and distance trade
  // off exactly: the same image row fitted "a 21 m wide pavilion 12 m tall at
  // the pier root, or a 26 m one 24 m tall out in the Pier Approach square".
  // The LOW/NEAR reading was built, at s -9.4..-4.2. That was the wrong half of
  // the bracket, and since tmp-tr99 moved the deck start to s = -16.0 it was
  // also standing ON the pier: 30 m of 12.7 m building parked across the deck,
  // its own base buried 1.87 m in the new apron, hiding every one of that pass's
  // s -16 works - the gateway, the jamb posts, the end return and most of the
  // new parapet - from every seaward camera.
  //
  // THE EA DSM RESOLVES IT. ref-cache/pier_dsm.tif in model coordinates
  // (tmp-tr13/dsm_deck.py's mapping; probe tmp-tr106/dsm_land.py, raw output
  // tmp-tr106/ev/dsm_land.txt). A block stands clear of a 4.7-5.0 ODN terrace:
  //
  //    s     o -12  -8   -4    0   +4   +8  +12  +16  +20  +24  +28  +32
  //   -20      2.5  4.8  5.1  4.6  6.2  3.3  4.7  4.9  4.9  4.8  4.3  2.6
  //   -22      2.5  2.5  4.8  9.7  9.8  9.5 10.3 11.6 11.4 10.9  8.1  4.8
  //   -24      4.6  7.0  9.8 12.4 12.3 12.2 12.2 12.4 12.4 10.1  6.9  4.8
  //   -28      4.8 10.4 12.5 14.5 14.8 14.9 14.8 15.0 14.5 12.4 11.5  4.8
  //   -34      6.8 12.1 14.5 16.1 17.0 18.3 18.4 17.2 15.9 14.2 12.1 10.7
  //   -44      6.6  8.9 11.9 12.5 14.2 13.9 13.8 13.6 12.5 11.1  8.9  4.9
  //   -52      4.8  4.9  5.4  6.2  7.5  5.0  5.0  6.1  5.0  4.9  4.9  4.8
  //
  // So: SEAWARD FACE BETWEEN s -20 AND -22 (the row at -20 is all terrace, the
  // row at -22 is all building), 28 m DEEP to s -50, 36 m WIDE over o -8..+28,
  // and 12-18.4 ODN - i.e. 7-13.5 m above its own terrace, not the 9.2 m the
  // 0657 bracket inferred but in the same register. The FAR reading was right
  // about the station and the NEAR reading was right about the height.
  //
  // WHAT IS BUILT, AND THE THREE PLACES IT FALLS SHORT OF THAT:
  //   * seaward face at s = -20.2, not -21. 0.8 m seaward, so the wheel's
  //     ballast can land between it and the deck. Under a degree from the water.
  //   * 11.6 m deep, not 28. Depth is free in triangles here (the roof is four
  //     corners and an apex per bay whatever the depth) but the model's ground
  //     behind z = -20 rises 2.5 m over 34 m and the DSM's terrace does not, so
  //     past about 12 m the ribbon starts eating the walls. 11.6 m is where it
  //     stops being a slab and has not yet started being buried.
  //   * o -8..+28 IS the DSM footprint and is built as measured. It is 10 m
  //     east of where 0657 was read as putting it, and it still straddles the
  //     pier centreline, which is what that frame actually constrains. The
  //     DSM's own o origin is good to about +-2 m (tmp-tr99's sea-wall probe
  //     puts the pier root nearer o +2 than o 0).
  //
  // Heights are the old ones + the 1.87 m the base moved up, which lands the
  // apex at 14.57 model = 14.00 ODN against the DSM's 12.2-14.8 over the
  // seaward third of the block. Not re-fitted - shifted, and then checked.
  const PV_S0 = -31.8, PV_S1 = -20.2;
  const PV_OW = -8.0, PV_OE = 28.0;        // 36 m, DSM footprint
  const PV_EAVE = 10.07, PV_FASCIA = 10.57, PV_APEX = 14.57;

  // From PROM_Y, not from AP_Y: see the AP_Y note. The bottom 1.87 m is buried
  // where the terrace is and is a retaining base where the ribbon has fallen
  // away behind z = -20.
  pbox(PV_S0, PV_S1, PV_OW, PV_OE, PROM_Y, PV_EAVE, C.building, MAT.PAINTED);
  pbox(PV_S0 - 0.08, PV_S1 + 0.08, PV_OW + 0.4, PV_OE - 0.4,
    AP_Y + 1.7, AP_Y + 3.8, C.pierGlass, MAT.PAINTED);
  pbox(PV_S0 - 0.6, PV_S1 + 0.6, PV_OW - 0.6, PV_OE + 0.6,
    PV_EAVE, PV_FASCIA, C.pierWhite, MAT.PAINTED);

  // Four pyramidal bays. This is the shape in 0657 - repeating triangular
  // facets, not one long ridge - and four is what fits the measured width at
  // the pitch the frame shows.
  const BAYS = 5;                 // 5 over 36 m = 7.2 m bays, which is the 7.5 m
                                  // the 4-bay/30 m version had. The COUNT is not
                                  // measured; the bay WIDTH is what 0657 shows.
  const e0 = PV_S0 - 0.6, e1 = PV_S1 + 0.6;
  const PW = PV_OE - PV_OW + 1.2;
  for (let b = 0; b < BAYS; b++) {
    const o0 = PV_OW - 0.6 + PW * (b / BAYS);
    const o1 = PV_OW - 0.6 + PW * ((b + 1) / BAYS);
    const om = (o0 + o1) * 0.5, sm = (e0 + e1) * 0.5;
    const apex = wp(sm, om, PV_APEX);
    const c = [wp(e0, o0, PV_FASCIA), wp(e1, o0, PV_FASCIA),
               wp(e1, o1, PV_FASCIA), wp(e0, o1, PV_FASCIA)];
    // ROOF COLOUR, and why it is not the measured one. The sunlit roof facets
    // in 0657 sample at #8B645D (p75, white wheel members masked out; re-read
    // and confirmed at #8E645D), which is almost exactly C.pierDeck #8A7F71 -
    // so pierDeck is the measured answer. Rendered, it goes to near-black:
    // these facets are steep, the scene light is duller than that afternoon,
    // and a linear albedo of 0.26 on a 45 degree plane has nothing left.
    //
    // ⚠️ C.pierArch #9A968C WAS TRIED HERE AND IS NOT ENOUGH. It is 12% lighter
    // than pierDeck, not the 25% the first pass claimed, and rendered the bays
    // still came out at #2D3742 - four black cones, which is exactly the error
    // this note says is the worse one. C.building #C7C2B6 is 29% lighter again
    // and lands the same facets at #5A636E: a pale slate pyramid that reads as
    // a pavilion roof from the water instead of a black tent. It is also the
    // warmer of the two, which is the right direction - every sample off this
    // roof, lit or shaded, is warm. The MEASURED value stays recorded here; do
    // not "correct" the build back to it without re-rendering and looking.
    for (let k = 0; k < 4; k++) tri3(c[k], c[(k + 1) % 4], apex, C.building, MAT.PAINTED);
    // the pale spike at each apex - clearly visible in 0657 and the detail
    // that makes the roof read as peaked rather than merely hipped
    tube(wp(sm, om, PV_APEX - 0.2), wp(sm, om, PV_APEX + 1.6),
      0.22, C.pierWhite, MAT.PAINTED, 5);
  }

  // =========================================================================
  // THE PROMENADE EDGE
  // =========================================================================
  //
  // MEASURED as present, not as dimensioned: white post-and-rail along the top
  // of the beach either side of the pier mouth, with a gap where the pier
  // starts. Frames 0558, 0599 and 0652 all show it plainly; none of them shows
  // it well enough to measure, so the 1.18 m height and 2.4 m post pitch are
  // the standard UK seafront guarding figures and are INFERRED.
  //
  // Built BAY BY BAY, each bay's station solved from stationAtZ, because this
  // is the longest shore-parallel run in the file and a single straight box
  // from o = -34 to o = +34 would drift 7.3 m across the promenade.
  const RAIL_Z = -3.8;           // 1.8 m back from the prom lip at z = -2
  const RAIL_TOP = PROM_Y + 1.18, RAIL_MID = PROM_Y + 0.62;
  const PITCH = 2.4;
  // The gap clears the pier mouth and the raised apron (coast.js, |o| <= 16.6,
  // which stops 0.4 m short of the o = 17 post on purpose). It no longer has to
  // clear the entrance pavilion: since 2026-09-18 that stands at z = -20..-32,
  // 16 m landward of this railing's z = -3.8, and nothing is driven through it.
  for (const [oa, ob] of [[-34, -17], [17, 34]]) {
    for (let o = oa; o < ob - 0.01; o += PITCH) {
      const p = Math.min(o + PITCH, ob);
      const s0 = stationAtZ(RAIL_Z, o), s1 = stationAtZ(RAIL_Z, p);
      // Each bay is its own short box, so the run follows the shore in steps
      // of 0.26 m instead of drifting 7.3 m over its length.
      const a = Math.min(s0, s1), b = Math.max(s0, s1);
      pbox(a - 0.05, b + 0.05, o, p, RAIL_TOP - 0.07, RAIL_TOP + 0.05,
        C.pierRail, MAT.PAINTED);
      pbox(a - 0.04, b + 0.04, o, p, RAIL_MID - 0.05, RAIL_MID + 0.05,
        C.pierRail, MAT.PAINTED);
      pbox(s0 - 0.06, s0 + 0.06, o - 0.06, o + 0.06, PROM_Y, RAIL_TOP,
        C.pierRail, MAT.PAINTED);
    }
  }

  // Lamp columns. 0599 and 0652 show tall columns along the promenade edge;
  // the 5.7 m height is INFERRED from the standard, not read off a frame.
  for (const o of [-30, -22, 22, 30]) {
    const s = stationAtZ(-4.2, o);
    tube(wp(s, o, PROM_Y), wp(s, o, PROM_Y + 5.7), 0.11, C.pierRail, MAT.PAINTED, 5);
    pbox(s - 0.3, s + 0.3, o - 0.16, o + 0.16, PROM_Y + 5.7, PROM_Y + 5.95,
      C.pierRail, MAT.PAINTED);
  }

  // Seafront kiosks. 0657's promenade carries a run of low booths with pale
  // awnings either side of the pier mouth. Present and countable-ish; not
  // measurable. Built as plain low units because that is all the frame
  // supports, and kept clear of the pavilion and the wheel's ballast.
  for (const o of [-42, -34, -26, 26, 34, 42]) {
    const s = stationAtZ(-7.5, o);
    pbox(s - 1.7, s + 1.7, o - 2.2, o + 2.2, PROM_Y, PROM_Y + 2.9,
      C.pierWhite, MAT.PAINTED);
    pbox(s - 2.2, s + 2.2, o - 2.6, o + 2.6, PROM_Y + 2.9, PROM_Y + 3.15,
      C.pierGreenCanopy, MAT.PAINTED);
  }
}
