// BOURNEMOUTH PIER - head building (RockReef) ELEVATIONS, and the RELIEF that
// makes them read as a building rather than a painted slab.
//
// pier.js builds the MASS (re-massed to the EA 1 m DSM, 2026-09-16): white
// walls s 140-180.8, o -3 to +15, to the eaves at HEAD.EAVES_T = DECK + 6.50; a
// segmental barrel over s 140-171.5 whose crown is HEAD_TOP = DECK + 8.83; the
// tower (block, fly box, lantern, plant box, mast) at s 171.5-179.2; and a
// single-storey range over s 180.8-198.0 (2026-09-16, DSM: barrel centre crown
// DECK+4.80, lean-to aisles 3.42 -> 3.17 at the flanks). It passes those numbers
// in ctx.HEAD. This module is only the skin, and never changes that mass -
// except the landward gable screen wall, which is this file's bow parapet.
//
// =============================================================================
// ⚠️ THE RELIEF THEORY THIS FILE WAS BUILT ON IS WRONG. MEASURED 2026-08-03.
// =============================================================================
// Every previous pass tried to break the flat slab with GEOMETRY - a ladder of
// ten projection planes, oversailing bands, cills, copings, a 1.2 m canopy -
// on the stated theory that a projecting horizontal is a free shadow line and a
// 300 mm projection casts a second one through the shadow map. Both halves of
// that theory are false for this building at this viewpoint, and the render
// says so in bytes:
//
//   THE SAME FRAME WAS RENDERED AT overcast=1 AND IN FULL SUN. Every sampled
//   pixel on the head's east elevation came back BYTE-IDENTICAL - (64,65,66),
//   (80,79,78), (106,105,103), (62,63,65) - while sky pixels in the same two
//   frames moved by up to 11.5 luminance levels. The sun contributes exactly
//   nothing to this facade.
//
// WHY, from pier.js 90-92 and craft.js 145-231:
//   - pbox pushes ONLY vertical vertex normals, (0,+1,0) on the top ring and
//     (0,-1,0) on the bottom, and builds the four side quads from those same
//     vertices. So a wall's normal is ±Y, never horizontal.
//   - COAST_FRAG line 150 then does `if (dot(N, V) < 0.0) N = -N;`. A rider at
//     1.6 m is BELOW everything on this building, so every wall fragment and
//     every soffit fragment alike resolves to N = (0,-1,0).
//   - `ndl = max(dot(N, uSunDir), 0)` is therefore 0, and the shading is
//     `col = albedo * amb * 0.62` with amb evaluated at that one shared normal.
//   - sunShadow() only ever multiplies ndl. With ndl 0 the shadow map cannot
//     darken anything on this wall either.
//
// => RELIEF CANNOT MAKE TONE HERE. Two pierWhite boxes 0.02 m and 1.20 m proud
//    of the same wall are the same pixel. The canopy, the corner pilasters, the
//    copings, cills, reveals and fascias were all pierWhite, and all of them
//    were invisible. Depth still decides SILHOUETTE (what breaks the skyline)
//    and OCCLUSION (which colour wins) - and nothing else.
//
// => TONE HAS TO BE PAINTED. The palette IS the lighting.
//
// TWO THINGS DO CHANGE THE VALUE OF A SURFACE, and both were measured off the
// renders rather than assumed:
//
// ⚠️⚠️ THE TWO NUMBERED PARAGRAPHS BELOW ARE OUT OF DATE AND ONE OF THEM IS
// NOW ACTIVELY MISLEADING. They were measured when pier.js drew the block as
// pierWhite on MAT.CONCRETE, which rendered 83; pier.js 599 now draws it as
// pierWhite on MAT.PAINTED, which renders 120 - the SAME value as every white
// band this file paints on it, so the whole "131 against 83" argument, and with
// it the claimed visibility of the string course, the eaves fascia, the coping
// and all six pilasters, is dead. The ladder was re-measured from a temporary
// swatch strip on this wall this pass. SECTION 11 CARRIES THE CURRENT NUMBERS;
// read them and not these. What survives here unchanged is the RELIEF THEORY
// above - relief still cannot make tone - and the rule that falls out of it.
//
//   1. THE PALETTE KEY. Rendered luminance of each legal key on this elevation
//      at 150 m (predicted from COAST_FRAG and confirmed against the frame -
//      pierWhite predicted 133, measured 131) - STALE, see the warning above:
//        pierWhite 133 | pierRail 119 | building 106 | pierArch 79
//        pierDeck 71 | pierBeam 63 | pierGlass 50 | pierRoofDark 45
//      The bare wall - pier.js's block, pierWhite on MAT.CONCRETE - measures 83.
//      SO pierArch (79) AND pierDeck (71) ARE USELESS AS SHADOW: they land on
//      top of the wall's own value. A dark band has to be pierBeam or darker.
//      This is why the entrance canopy's pierArch soffit drew nothing at all.
//
//   2. THE MATERIAL, but only inside 320 m. COAST_FRAG's texture path computes
//      `textured = t.rgb * (0.78 + vColor * 0.55)`, and for MAT.PAINTED t IS
//      vColor - so a painted surface is multiplied by (0.78 + 0.55 a), which
//      for pierWhite is 1.22. MAT.PAINTED pierWhite measures 131; the SAME
//      colour on MAT.CONCRETE measures 83, because there it is multiplied by an
//      actual concrete texture. That 48-level step is bigger than most of the
//      palette ladder and it is free.
//      ⚠️ IT DIES AT RANGE. `fade = 1 - smoothstep(120, 320, dist)`, so past
//      320 m albedo collapses to vColor and every material distinction goes.
//      Measured at 380 m: pierWhite on PAINTED and on CONCRETE both render
//      exactly 132.0, and pierGlass 71.9. The palette key survives; the
//      material does not.
//
// THE RULE THAT FALLS OUT OF THAT, and the rule this pass is built on:
//   EVERY BAND THAT MUST READ AT 400 m CARRIES ITS OWN DARK PALETTE KEY.
//   MAT.PAINTED is a bonus inside 320 m and is never the only thing holding a
//   band up. Relief is for silhouette and occlusion order, never for tone.
//
// The ladder of planes is KEPT - it is still what decides which surface wins
// where two overlap, and the depths are already checked against pier.js's own
// planes - but it is no longer claimed to produce a single shadow line.
//
// =============================================================================
// THE LIDAR RECALIBRATION, AND WHICH NUMBERS MOVED WITH IT
// =============================================================================
// This file was written against HEAD_TOP = DECK + 6.2. pier.js has since
// replaced that with a LIDAR measurement, DECK + 8.83, and says outright that
// the 6.2 was the error. Everything here that was READ AS A FRACTION OF
// DECK-TO-EAVES must therefore move with it, and everything that was read
// against a real object of known size must NOT.
//
//   SCALED by CAL = Y_EAVES / 6.2 = 1.424 - the bands taken as a ratio of the
//     deck-to-eaves distance in frames 565 (26 px) and 579 (46 px): the bay
//     springing, the window head, the depth of the pointed feet, the eaves
//     band, the seahorse, the PIER-TO-SHORE lightbox.
//   NOT SCALED - the ground storey, every band of which is anchored to the
//     2.10 m door leaf counted in frame 553 and cross-checked against a 1.7 m
//     standing figure in frame 542. A door is 2.10 m whatever the roof does.
//
// The result is a coherent elevation rather than a stretched one: a 3.35 m
// ground storey under a 4.8 m double-height first floor. That is also the
// correct answer for the building's actual USE - RockReef is a climbing centre
// ("Vertical Slide", "Clip 'N Climb", "High Line" are all read off the fascia
// in frame 553) and those need a tall upper hall. The LIDAR and the signage
// agree; the 6.2 m reading agreed with neither.
//
// =============================================================================
// WHAT THE REFERENCE ACTUALLY SHOWED THIS PASS (frames 553, 574, 603, 647, 657)
// =============================================================================
// 553 (the only close-range elevation in the set, upscaled 2x and 3x here):
//   - EVERY panel sits inside a WHITE FRAME - head, cill and two jambs - with
//     the panel recessed behind it. That is the building's whole grammar and it
//     is what the old flat version was missing.
//   - The roof edge is a deep white fascia with a clearly DARK soffit under it.
//   - The shopfront canopy is a real projecting slab with DOWNLIGHTERS on its
//     soffit (visible as warm points), not a 150 mm band.
//   - A white boarded plinth with visible board joints runs along the base.
//   - A projecting white CORNER POST separates the flank from a return face.
//   - PIER-TO-SHORE is a big illuminated panel standing clear of the wall with a
//     dark shadow gap down its edge - about 6.4 x 1.1 m, not the 3 x 0.9 built
//     before.
//   - The graphics wrap is purple over a green ground.
// 603 (the seaward end from the water - the game's own viewpoint): what carries
//   at that range is ONE strong horizontal shadow under the roof edge and a
//   second at mid-height, plus the corner verticals. Nothing finer survives.
//   This is the frame that justifies spending the budget on bands, not detail.
// 574: the bridge house has an oversailing flat cap and a ribbon of windows in
//   its top metre, with THREE OR FOUR slender masts above it, one with a
//   cross-arm.
// 657 (aerial): the landward end is a genuine BOW IN PLAN - the white end wall
//   sweeps convex toward the shore. The previous version listed a plan bow under
//   "deliberately not built"; the aerial settles it and it is built now.
//   The flat roof carries a guarded edge and small plant, not a bare slab.
//
// =============================================================================
// WIRING NOTE - SIX LINES OF pier.js STILL CONTRADICT THIS MODULE
// =============================================================================
// None of these can be removed from inside this module. All six are things the
// frames contradict, not things this module duplicates. They are all STILL
// PRESENT in pier.js as of this pass, so the elevation below is currently drawn
// behind them:
//
//   pier.js 323-327 - two identical glazing bands at DECK+1.9 and DECK+4.1 on
//     BOTH flanks, standing 0.14 proud. The flanks are not the same (565: the
//     west is plain white below the governing line; 579: the east is glazed and
//     arcaded), and 0.14 is inside the reveals built here. Left in, they cut
//     horizontal dark stripes through the scallop.
//   pier.js 329-332 - 21 projecting pointed awnings that reach o = +17.1, i.e.
//     2.1 m proud of the east wall, over DECK+2.7 to +3.3. NO fabric awning
//     appears in any assigned frame. What is really there is the pointed FOOT of
//     each first-floor bay, flat against the wall. ⚠️ While those awnings stand,
//     they bury the governing string course and the entrance canopy built here
//     over the whole east flank - the two deepest horizontals in this module.
//     The west flank shows the intended relief correctly; the east does not.
//   pier.js 348 - the LED screen at s 168-186 on the EAST flank. It is on the
//     LANDWARD END WALL: six frames (540, 542, 557, 558, 574, 579) show it
//     filling the landward-facing bow, and 531 reads WWW.PIERZIP.COM off that
//     same face. It is 18 m long in pier.js and about 9 m measured.
//
// TWO COLLISIONS THIS MODULE CANNOT FIX, recorded so the wiring pass sees them:
//   - (HISTORICAL: the rotunda is at s 208 since 2026-09-16, seaward of the
//     range's end wall at 199.2, and crosses nothing of this module.)
//     THE ROTUNDA (pier.js 383: centre s 196, o 7, R 9.5) crosses the east wall
//     between s 190.9 and s 201.1 up to DECK + 5.6, and its dome clears the wall
//     only above DECK + 6.73. So the seaward quarter of the east bay run is
//     buried below 5.6 m and only its top 2.5 m shows. That predates this module
//     and can only be fixed by moving one of the two. The run is NOT shortened
//     here, because both frames that measured it put it past s 190.
//   - pier.js 333-343 draws the dark barrel over s 140-163 only, which is where
//     the LED bow is, and C.pierRoofDark is probably too dark for it - the roof
//     reads pale grey in sunlit 579 and dark only in low-light 553 and 565.

export function addHeadElevations(ctx) {
  const { pbox, at, m, C, MAT, DECK, HEAD_TOP, HEAD } = ctx;
  // `at` is what makes ctube usable here: ctube works in WORLD x/y/z while
  // everything else in this file is station/offset, and the pier runs 6.1
  // degrees off the world axis. Everything rectilinear is still pbox - a 75 m
  // axis-aligned fascia band would visibly skew away from the wall it is
  // painted on. ⚠️ m.tube() must never be used: it calls push() not pushC(), so
  // the colour and material arrays fall out of step and the mesh corrupts.

  // ---- the block this skin sits on (pier.js 320-321) ----------------------
  // S_SEA is the range's end wall, HEAD.RANGE_S1 = 199.2 since 2026-09-16 (it
  // was 215): the DSM puts the rotunda at s 208, closing the head, and the
  // range ends at their junction (DSM s 199-200). Everything on the end wall
  // follows it.
  const S_LAND = 140, S_SEA = HEAD.RANGE_S1;   // station limits of the block
  // ⚠️ S_STEP is where the eaves-height mass ends and the single-storey range
  // (2026-09-16: DSM section, aisle eaves Y_AISLE at the flanks, NOT Y_SPRING) begins: s 180.8 since 2026-09-16 (DSM; it was
  // 202.9 for one day before that). Everything this module hangs ABOVE Y_SPRING
  // stops at S_STEP or returns across the face there; below Y_SPRING the skin
  // still runs to S_SEA. Budget 6,740 -> 5,242 -> 4,918 (S_SEA 199.2) -> 5,182 (gallery piers) -> 5,110 (S_SEA 198.0) -> 4,522 (range cladding under the DSM section's eaves, 2026-09-16) -> 4,570 (pointed gables, tmp-tr23) -> 4,714 (range west openings, tmp-tr25p) -> 4,930 (west gable run measured and re-laid, 11 bays, tmp-tr27) -> 6,178 (west first floor rebuilt to beach0115: broad teeth, 5 wide windows, tapered piers, s 166-180.8 windows + pilaster, tmp-tr29) -> 6,370 (east first floor rebuilt from a103 + r568: 5 wide windows at 145.5 + 4.58 i, wavy valance, pilaster; bayRun teeth dropped, tmp-tr31) of 7,000.
  const S_STEP = HEAD.MASS_S1;
  // RANGE-ZONE HEIGHTS (2026-09-16, EA 1 m DSM via pier.js HEAD). Seaward of
  // S_STEP the flank walls stop at the aisle eaves (3.17), under a white fascia
  // RANGE_FASCIA deep; the end wall is 3.17 over the aisles and rises to the
  // centre block's eaves (4.36) over HEAD.RANGE_C0..C1. Flank and end-wall
  // cladding seaward of S_STEP tops out UNDER those lines, not at Y_SPRING.
  const Y_AISLE = HEAD.AISLE_T0 - DECK;                       // 3.17
  const Y_AISLE_UNDER = Y_AISLE - HEAD.RANGE_FASCIA - 0.02;   // 2.90, 20 mm under the fascia
  const Y_CEN_UNDER = HEAD.RANGE_EAVES_T - DECK - 0.04;       // 4.32, 20 mm under the chords' base
  const OW = -3, OE = 15;               // west and east wall faces
  const O_MID = (OW + OE) / 2;          // 6.0 - the block's centreline

  // Every added face is buried 20 mm INSIDE the wall it sits on. At exactly the
  // wall plane the two surfaces face opposite ways and would survive backface
  // culling, but the head is seen at grazing angles from the water for minutes
  // at a time and a 75 m coplanar seam is not worth the 20 mm it costs.
  const BURY = 0.02;

  // ---- the band heights, all metres ABOVE DECK ----------------------------
  const Y_CROWN = HEAD_TOP - DECK;      // 8.83, LIDAR roof CROWN. Never hard-code this.
  const CAL = Y_CROWN / 6.20;           // 1.424 - see the recalibration note
  const Y_EAVES = HEAD.EAVES_T - DECK;  // 6.50 - pier.js's wall top (2026-09-16)

  // GROUND STOREY - door-anchored, NOT scaled. Frame 553, every band read as a
  // fraction of the 173 px door opening with the leaf taken at the standard
  // 2.10 m; frame 542 independently puts the signage band's foot at 2.2 m off a
  // 1.7 m standing figure. Two unrelated anchors landing 0.05 m apart is why
  // these numbers are usable at all.
  const Y_KERB = 0.12;                  // splayed foot of the plinth
  const Y_PLINTH = 0.38;                // 553: boarded white plinth
  const Y_DADO = 0.50;                  // top of its oversailing cap
  const Y_SHOP_HEAD = 2.00;             // 553: dado + 123/173 px
  const Y_HEAD_RAIL = 2.20;             // 553 transom 2.00-2.15, 579 fascia
                                        // 2.00-2.25 - ONE element, see below
  const Y_SIGN_T = 3.13;                // 553: 81/173 px above the head rail
  const Y_CANOPY_T = 3.42;              // 553: canopy slab + its shadow reveal

  // FIRST FLOOR - ratio-derived, SCALED by CAL.
  const Y_SPRING = 3.30 * CAL;          // 4.70. 565: 14/26 px of deck-to-eaves
  const Y_POINT = Y_SPRING - 0.95 * CAL;  // 3.35, foot of the mid-height dark band
  // THE POINTED GABLES, 2026-09-16 (tmp-tr23/RESULT.md item 1). Two sources, each
  // read against its own deck and eaves (6.50): f004 at 4x apexes 3.9 / valleys
  // 2.55; beach0115 at pose_final apexes 3.7-3.95 / valleys 2.4-2.65. Both show
  // WHITE teeth pointing UP out of the white ground-storey wall with DARK
  // triangles hanging between them - the old feet hung DOWN from 4.70 to 3.35.
  const Y_TOOTH_B = 2.55, Y_TOOTH_T = 3.90;
  // ⚠️ FIRST FLOOR COMPRESSED, 2026-09-16. The first-floor heights here and in
  // sections 3-11 were set when the eaves were taken to be the 8.83 m LIDAR
  // plateau. That plateau is the roof CROWN; the wall top is Y_EAVES = 6.50
  // (pier.js header). up() maps the old first floor [Y_SPRING, Y_CROWN] linearly
  // onto [Y_SPRING, Y_EAVES], so every band keeps its order and its share of the
  // storey, and nothing at or below Y_SPRING moves. Numbers quoted in comments
  // below that are above 4.70 are the old design values, i.e. BEFORE up().
  const K_UP = (Y_EAVES - Y_SPRING) / (Y_CROWN - Y_SPRING);   // 0.436
  const up = (y) => (y <= Y_SPRING ? y : Y_SPRING + (y - Y_SPRING) * K_UP);
  const Y_WIN_HEAD = up(5.70 * CAL);    // 6.19 (8.12 before up). 565: 24/26 px
  const Y_TRANSOM = (Y_SPRING + Y_WIN_HEAD) / 2;   // "a pale break at roughly
                                        // mid-height", nothing sharper
  // THE GOVERNING HORIZONTAL. One band doing three jobs, which is how 553 reads
  // it: the canopy fascia over the shopfront, the cill under the pointed feet,
  // and the string course everywhere else. Drawing three separate bands here
  // was what produced the old stack of 100 mm steps that read as one plane.
  const Y_GOV_B = Y_SIGN_T, Y_GOV_T = Y_POINT;     // 3.13 -> 3.35

  // ---- THE LADDER OF PLANES ------------------------------------------------
  // NONE of these depths is measured. At 4-8 px per metre in the flank frames a
  // 100 mm reveal is a fifth of a pixel, and the earlier measurement pass said
  // outright it could not tell whether the pointed band projects from the wall
  // at all. What IS known is the ORDER - glass behind mullions behind piers
  // behind fascias behind the canopy - and the two renderer facts at the head of
  // this file, which say the step between planes has to be >= 0.1 m to be a
  // shadow line and >= ~0.3 m to cast one. So these are chosen to give a legible
  // ladder at 100-400 m, and every one of them is a plausible real dimension for
  // a 1960s seaside building with a deep fascia. Depths, not heights.
  const D_GLASS = 0.02;                 // glazing, effectively in the wall plane
  const D_MULL = 0.10;                  // glazing bars, in front of the glass
  const D_BAND = 0.18;                  // applied signage and graphic panels
  const D_PLINTH = 0.24;                // the boarded base
  const D_REVEAL = 0.34;                // window jambs / piers: a 320 mm reveal
  const D_FASCIA = 0.42;                // head rails and the eaves fascia
  const D_CORNER = 0.50;                // corner pilasters, both faces
  const D_CILL = 0.58;                  // cills OVERSAIL their reveal by 0.24
  const D_COPE = 0.68;                  // the eaves coping, deepest horizontal
  const D_CANOPY = 1.20;                // the entrance canopy: a real slab

  // ---- THE SHOPFRONT'S POSITION ACROSS THE BOW, 2026-09-18 (tmp-tr106) -----
  // Declared here and not in section 8 because section 2's landward string
  // course and its painted shadow have to skip the canopy, exactly as the east
  // flank's did before the shopfront moved.
  // All measured on 1049650633833040.jpg (overcast, clock 15:39) and mapped
  // through o = O_MID - (x - 627) / 35.56 - see section 5's header for how that
  // mapping is anchored and for the two-frame proof of the FACE, and the note
  // below for why the sign is negative.
  // ⚠️ THE SIGN OF THAT MAPPING IS NEGATIVE, AND THE FIRST BUILD OF THIS BLOCK
  // GOT IT WRONG. In this renderer the screen-right vector is R = cross(f, up)
  // = (-fz, 0, fx). For ANY camera that can see this face at all - i.e. any
  // camera landward of it, 0.1063*fx + 0.9943*fz > 0 - the dot of R with the
  // +o direction (0.9943, 0, -0.1063) is -(0.9943*fz + 0.1063*fx), which is
  // NEGATIVE whatever else the camera does. +o is on the LEFT of every landward
  // view of this wall, with no exception, and the same algebra says the flank
  // that recedes to the RIGHT of the bow's corner is always the -o one.
  // Checked against the renderer rather than only argued: in tmp-tr106's
  // x_before/B_bow.png the o 7.9-9.35 board draws LEFT of the o -0.7..3.6 band.
  // Checked against a SOLVED pose too: tmp-tr98/ev/sheet_pose.png puts the
  // beach0115 plate over the render at tmp-tr11/pose_final.json - bow at frame
  // left, block running away right - and the flank it shows is the one section
  // 4 was rebuilt to ("west first floor rebuilt to beach0115", tmp-tr29).
  // Both owner overcast frames put the shopfront's yellow board to the RIGHT of
  // the green band, so the yellow board is at the LOWER o. tmp-tr98's five sign
  // boards were placed with the opposite sense and are mirrored about O_MID
  // here for the same reason.
  //   door bank      x 400-571  -> o 12.38 .. 7.57, white stiles read at
  //                  442/463/490/515/532. 553 counts FOUR 0.9 m leaves at 3.6x
  //                  and that closer reading is what is built, centred on the
  //                  measured opening; the extra 0.7 m the overcast frame sees
  //                  is side light, and the bow's glazed base already covers it.
  //   graphic panels x 355-388  -> o 13.65 .. 12.72  (G-4..-19, Y-24..-38:
  //                  x 577-604  -> o  7.41 ..  6.65   blue-violet, not neutral)
  //   green band     x 425-572  -> o 11.68 ..  7.55  (green excess +9..+17,
  //                  neutral either side of exactly those columns)
  //   canopy fascia  x 364-700  -> o 13.40 ..  3.95  (rows 586-596 read 135
  //                  against the wall's 182 - the slab's own shaded fascia)
  //   face corners   x 276-890  -> o 15.87 .. -1.40  against the block's
  //                  OW -3 .. OE +15: the east corner lands within 0.9 m and
  //                  the west within 1.6 m, which is the honest error bar on a
  //                  614 px face read at 250 m.
  const SH_DOOR_O0 = 8.18, SH_DOOR_O1 = 11.78;     // 4 x 0.9 m, centred on 9.98
  const SH_GFX = [[6.65, 7.41], [12.72, 13.65]];
  const SH_SIGN_O0 = 7.55, SH_SIGN_O1 = 11.68;
  const SH_CAN_O0 = 3.95, SH_CAN_O1 = 13.40;
  // ⚠️ NOTHING IN THIS LADDER MAY LAND WITHIN 40 mm OF 0.14 OR 0.30 ANYWHERE
  // BETWEEN 1.9 m AND 5.6 m ABOVE DECK, while pier.js 323-327 and 348 stand.
  // Those draw the two flank glazing bands at exactly 0.14 proud over DECK+1.9
  // to +3.4 and DECK+4.1 to +5.6, and the misplaced east LED at exactly 0.30
  // proud over DECK+2.2 to +5.2 — so the first draft's D_REVEAL of 0.30 put 18 m
  // of white bay pier EXACTLY coplanar with 18 m of dark LED, same o, same
  // extent, on the face the game actually looks at. That is a depth-buffer tie
  // and a full-height stipple. D_BAND and D_REVEAL are 0.18 and 0.34 for that
  // reason and no other; the rest of the ladder moved up with them to keep the
  // steps apart. Only the 1.9-5.6 m window matters — elsewhere on the wall
  // pier.js draws nothing to collide with. See the VERIFICATION note at the foot
  // of this file for how the whole plane list is enumerated and checked.
  //
  // WHY 40 mm AND NOT MORE. renderer.js 223 sets the projection to near 0.08,
  // far 4000, so with a 24-bit depth buffer the resolvable step is about
  // z^2 * 7.4e-7 metres: 1 mm at 40 m, 17 mm at 150 m, 67 mm at 300 m. So a
  // 40 mm separation is solid everywhere inside ~230 m and can tie beyond it -
  // but at 300 m the whole building is about 40 px tall and the contested
  // stretch is two of them. Buying certainty out there would mean a 720 mm eaves
  // oversail, which is a worse lie about the building than an invisible stipple.
  // 40 mm is the deliberate answer, not an oversight.

  // A detail box on one of the two long flanks. `d` is the projection; heights
  // are above deck, so the numbers in the code read as the numbers in the spec.
  const west = (s0, s1, d, y0, y1, col, mat) =>
    pbox(s0, s1, OW - d, OW + BURY, DECK + y0, DECK + y1, col, mat);
  const east = (s0, s1, d, y0, y1, col, mat) =>
    pbox(s0, s1, OE - BURY, OE + d, DECK + y0, DECK + y1, col, mat);
  // ...and on the two end walls, where the projection is along the station axis.
  // NOTE these run from the projecting face all the way BACK into the block, so
  // a large `d` is a solid prow rather than a floating slab with a gap behind
  // it. That is what makes the landward bow-in-plan possible with no new helper.
  const land = (o0, o1, d, y0, y1, col, mat) =>
    pbox(S_LAND - d, S_LAND + BURY, o0, o1, DECK + y0, DECK + y1, col, mat);
  const seawAt = (sS, o0, o1, d, y0, y1, col, mat) =>
    pbox(sS - BURY, sS + d, o0, o1, DECK + y0, DECK + y1, col, mat);
  const seaw = (o0, o1, d, y0, y1, col, mat) => seawAt(S_SEA, o0, o1, d, y0, y1, col, mat);

  // ROUND things, in world coordinates, with heights above deck. Anything
  // cylindrical goes through here: a ctube carries correct RADIAL normals, so
  // unlike a pbox it is genuinely lit round its circumference - which on this
  // facade makes a downpipe the only vertical element that shades at all.
  const tubeD = (s0, o0, h0, s1, o1, h1, r, col, mat = MAT.PAINTED, seg = 6) => {
    const a = at(s0, o0), b = at(s1, o1);
    m.ctube(a[0], DECK + h0, a[1], b[0], DECK + h1, b[1], r, col, mat, seg);
  };
  // The same thing with ABSOLUTE world y, for the roof, where everything is
  // measured off HEAD_TOP rather than off the deck.
  const tubeY = (s0, o0, y0, s1, o1, y1, r, col, mat = MAT.PAINTED, seg = 6) => {
    const a = at(s0, o0), b = at(s1, o1);
    m.ctube(a[0], y0, a[1], b[0], y1, b[1], r, col, mat, seg);
  };

  // =========================================================================
  // 1. THE BASE - a plinth with a splayed foot
  // =========================================================================
  // 553 shows a boarded plinth with visible board joints running along the base
  // of every wall, and the wall standing back behind it. THREE planes - splayed
  // foot 0.34, plinth 0.24, oversailing cap 0.31.
  //
  // ⚠️ THE THREE COURSES WERE ALL pierWhite, i.e. all one pixel value, and the
  // old comment claimed the cap's underside "goes to ambient and is drawn dark".
  // It does go to ambient - so does the wall above it and so does every other
  // face on this building. See the header measurement. The base now reads
  // because the bottom two courses are PAINTED DARK: a splash course is the one
  // place on a seaside building where a dark base is not a stylistic choice, it
  // is where the salt and the boot scuffs are, and every pier building on this
  // coast has one. pierBeam (63) against the wall's 83 is a real 20-level step;
  // pierArch and pierDeck would have been 79 and 71 and drawn nothing.
  // MAT.TIMBER is kept on the middle course so the board joints survive close
  // range; the colour, not the texture, is what carries at 150 m.
  //
  // HONESTY NOTE: from the water this is mostly hidden behind the deck-edge
  // parapet, so it is not what fixes the elevation. It is done because the rule
  // is the rule, not because it is visible.
  // 2026-09-18 (tmp-tr106): THE ENTRANCE IS NOT ON THIS FLANK. The four-leaf
  // bank, its 0.9 m module and the 2.10 m leaf that scales the whole of 553 are
  // unchanged as MEASUREMENTS and are now built on the landward bow (section 8);
  // what is gone from here is the s/o placement, which section 5 always marked
  // as the one guess in the block. See section 5's header for the evidence.
  const base = (put, s0, s1) => {
    put(s0, s1, D_PLINTH + 0.10, 0.0, Y_KERB, C.pierBeam, MAT.CONCRETE);
    put(s0, s1, D_PLINTH, Y_KERB, Y_PLINTH, C.pierBeam, MAT.TIMBER);
    put(s0, s1, D_PLINTH + 0.07, Y_PLINTH, Y_DADO, C.pierWhite, MAT.PAINTED);
  };
  // The four west service doors. Declared HERE and not in section 6 because the
  // plinth needs them too - see below. Why four, and why at these stations, is
  // section 6's argument.
  const W_DOORS = [150, 165, 180, 195], W_DOOR_W = 1.10;
  // Split around the entrance on the east: a door opening has no plinth across
  // it, and the threshold is what is actually there.
  // Unbroken since 2026-09-18 (tmp-tr106): with the entrance moved to the bow
  // there is no threshold to split it around on this flank.
  base(east, S_LAND, S_SEA);
  // ⚠️ AND THE WEST PLINTH IS SPLIT THE SAME WAY, which it was not. It ran
  // S_LAND to S_SEA unbroken, straight across all four west doors, so the
  // bottom 0.50 m of every one of them was white plinth standing 0.24 m PROUD
  // of a leaf drawn at 0.02 - i.e. each door read as a 1.6 m opening sitting on
  // a kerb. The east bank got this treatment and the west did not; the rule is
  // the rule on both flanks. Costs 12 boxes on the elevation the game rarely
  // sees, which is the honest price of not having two rules.
  {
    let s0 = S_LAND;
    for (const ds of W_DOORS) { base(west, s0, ds); s0 = ds + W_DOOR_W; }
    base(west, s0, S_SEA);
  }

  // =========================================================================
  // 2. THE GOVERNING STRING COURSE, and the EAVES
  // =========================================================================
  // Two continuous horizontals round all four faces. These are the whole of
  // what frame 603 - the one frame taken from the water, at the game's own
  // viewpoint and range - actually resolves on this building, so they get the
  // deepest projections in the file after the canopy.
  // `sS` is the seaward face the band returns round: S_SEA for bands below
  // Y_SPRING, S_STEP for the eaves bands, which since 2026-09-16 belong to the
  // two-storey block and not to the single-storey range seaward of it (MOVED:
  // same boxes, same count, flanks shortened by 12.1 m, end return 12.1 m in).
  // At S_STEP the end return is widened by `d` each side to close the d x d
  // gap where the flank band's oversail meets the end band's: at s 215 the
  // corner pilaster covered it, at 202.9 nothing stands above the range roof.
  // ⚠️ A first read of the head camera blamed a 6 px step in the silhouette at
  // frame x 489 on this gap. TRACED, it is not: it is the tower base's west
  // corner (s 193.4, o 1) standing above the flat roof, which is correct. The
  // closure is kept because the gap is real geometry; it moved the head
  // camera's changed-pixel count against base from 8,198 to 8,179.
  // wS0/wS1: the west flank's piece may be narrower than the others (tmp-tr29).
  const bandRound = (d, y0, y1, col, mat, sS = S_SEA, ret = true, wS0 = S_LAND, wS1 = sS) => {
    east(S_LAND, sS, d, y0, y1, col, mat);
    west(wS0, wS1, d, y0, y1, col, mat);
    land(OW, OE, d, y0, y1, col, mat);
    const w = sS === S_SEA ? 0 : d;
    if (ret) seawAt(sS, OW - w, OE + w, d, y0, y1, col, mat);
  };
  // 2026-09-16: stops at S_STEP with no return. Over the range it sat at the
  // new aisle eaves (3.17) and stood proud of them; the aisle fascia replaces it.
  // 2026-09-16: the flank runs of this band are drawn in bayRun, broken over the
  // pointed gables (no white line crosses them in f004 or beach0115).
  // SPLIT AROUND THE BOW CANOPY, 2026-09-18 (tmp-tr106). D_CILL is 0.58 and
  // the canopy over the entrance is 1.20, so an unbroken run here would be
  // 9.5 m of band drawn INSIDE the slab in front of it - the dead-triangle case
  // verify-head-elevations.mjs exists to catch. The east flank carried exactly
  // this split for three passes; it moved with the shopfront.
  land(OW, SH_CAN_O0, D_CILL, Y_GOV_B, Y_GOV_T, C.pierWhite, MAT.PAINTED);
  land(SH_CAN_O1, OE, D_CILL, Y_GOV_B, Y_GOV_T, C.pierWhite, MAT.PAINTED);
  // ---- AND ITS SHADOW, 2026-09-18 (tmp-tr98) -------------------------------
  // Section 11 note 1 measured that this band, the eaves fascia, the coping and
  // all six pilasters are pierWhite standing on a pierWhite wall and therefore
  // DRAW NOTHING, and then declined to fix it: "what colour a string course
  // should be is a decision about the building ... and it belongs to whoever
  // owns that call." This pass owns that call, and makes it the same way the
  // eaves already does - not by re-colouring the band (it IS white, both
  // overcast frames agree) but by PAINTING THE SHADOW IT THROWS, because the
  // renderer will not (file header: every wall fragment resolves to N = -Y and
  // ndl = 0, so no projection can darken anything).
  // DEPTH OF THE SHADOW: the band oversails D_CILL = 0.58 m, which at a UK
  // summer sun elevation of ~55 deg throws 0.58/tan(55) = 0.41 m down the wall.
  // Built at 0.40, exactly as the eaves soffit's 0.34 was derived from its own
  // 0.42 fascia. At the head camera's 1.46-5.91 px/m along this flank that is
  // 0.6-2.4 px - thin at the landward end, which is honest, and it is the ONLY
  // horizontal on the lower half of this building.
  // KEY: pierArch (61.1 against the wall's 120.4, a 49% step), not the eaves'
  // pierRoofDark (27.2). Frame 603 - the only frame shot from the water at the
  // game's own range - reads "ONE STRONG horizontal shadow under the roof edge
  // and A SECOND at mid-height". Two blacks would make them equal; this is the
  // second one, and it is meant to be the weaker of the two.
  // DEPTH 0.44: 60 mm clear of the corner pilasters at D_CORNER 0.50 and 20 mm
  // proud of D_FASCIA 0.42 (which carries nothing at this height), and 140 mm
  // from pier.js's 0.30 plane, so it is outside the tie window the ladder note
  // protects.
  const GOV_SH = 0.40, GOV_D = 0.44;
  // Split for the same reason as the band itself: GOV_D is 0.44 against the
  // canopy's 1.20, and what is under the band over that stretch is the sign.
  land(OW, SH_CAN_O0, GOV_D, Y_GOV_B - GOV_SH, Y_GOV_B, C.pierArch, MAT.PAINTED);
  land(SH_CAN_O1, OE, GOV_D, Y_GOV_B - GOV_SH, Y_GOV_B, C.pierArch, MAT.PAINTED);
  // ⚠️ MAT.PAINTED, not MAT.CONCRETE, and the same swap is made on the coping,
  // the corner pilasters, the end-wall pilasters and the bay cill below. These
  // are painted render bands on a painted building, so PAINTED is the more
  // correct material anyway - and it happens to render them at 131 against the
  // wall's 83, which is the difference between a pale string course and no
  // string course. See the header: the effect dies past 320 m, so it is a bonus
  // on top of the geometry, never the reason a band exists.

  // ---- THE MID-HEIGHT DARK BAND -------------------------------------------
  // Frame 603 - the ONE frame shot from the water at the game's own range - is
  // explicit that what carries on this building is "ONE strong horizontal
  // shadow under the roof edge and a second at mid-height". The eaves one is
  // below. THIS is the second, and until now it existed only over the 37 m of
  // the bay run: the run drew its own dark reveal for the scalloped feet to
  // hang into, and the other 38 m of the block had nothing at that height.
  //
  // It is the SAME box, promoted from the bay run to all four faces. 1.35 m
  // tall (Y_POINT to Y_SPRING), C.pierGlass, which measures 50 against the
  // wall's 83 and still measures 72 against 132 at 380 m - it is one of only
  // four keys with enough separation to survive the material fade. Depth 0.06:
  // behind the 0.34 reveals so the white teeth still hang in front of it over
  // the run, behind pier.js's own 0.14 glazing band so that band still wins
  // where it overlaps, and 80 mm clear of it so there is no tie.
  //
  // WHERE IT IS NOT MEASURED: over the bay run it is (565, 574, 579 all show
  // the scallop standing on continuous dark). Landward and seaward of the run
  // it is an inference - but pier.js already claims a glazing band across that
  // exact stretch at DECK+4.1 to +5.6, and 579 reads the east flank as glazed
  // and arcaded, so a recessed dark band there is the CONSERVATIVE reading, not
  // a new claim.
  // 2026-09-16: flanks stop at S_STEP (the range flank is 3.17 tall, under this
  // band); on the end wall it survives only over the centre block, under its eaves.
  // 2026-09-17 (tmp-tr29): on the WEST flank this band is only the first-floor
  // window run, s W_FF_S0-W_FF_S1. beach0115 at pose_final shows WHITE wall at
  // this height over s 140-142.7 (the landward block) and s 166.4-180.8 (white
  // block with small windows, then the tower zone). Those two stretches get a
  // painted white panel in section 4 instead. East and landward are unchanged.
  const W_FF_S0 = 142.55, W_FF_S1 = 166.35;
  bandRound(0.06, Y_POINT, Y_SPRING, C.pierGlass, MAT.PAINTED, S_STEP, false, W_FF_S0, W_FF_S1);
  seaw(HEAD.RANGE_C0 + 0.05, HEAD.RANGE_C1 - 0.05, 0.06, HEAD.AISLE_T1 - DECK + 0.05, Y_CEN_UNDER,
    C.pierGlass, MAT.PAINTED);

  // The eaves, in three planes: dark soffit, white fascia, pale coping.
  //
  // ⚠️ THE SOFFIT WAS 0.14 m TALL, which is 0.6 px at 150 m and 0.25 px at
  // 400 m - i.e. it was a claim about a shadow line that the frame buffer could
  // not hold. It is now 0.34 m. That number is derived, not invented: a 0.42 m
  // oversailing fascia at a UK summer sun elevation of about 55 degrees throws
  // 0.42/tan(55) = 0.29 m of shadow down the wall, and more all winter. 0.34 m
  // is that shadow drawn as paint, because the renderer will not draw it as
  // light (header). It is the single most important band on the building: at
  // 380 m it is still 1.4 px of pierRoofDark (78) under 132 of white fascia.
  //
  // Depth 0.44, and both neighbours were checked at that height:
  //   - the bay-run lintel is at D_FASCIA (0.42), so the soffit now sits 20 mm
  //     IN FRONT of it and the window head falls in the eaves shadow, which is
  //     what a window head under a deep fascia actually does.
  //   - the PIER-TO-SHORE lightbox backing is at 0.46 over s 151.5-157.9, so
  //     there the lightbox still oversails the eaves by 20 mm exactly as 553
  //     shows. Same colour on both, so even where the depth buffer cannot hold
  //     20 mm past ~165 m the tie is invisible.
  bandRound(D_FASCIA + 0.02, Y_WIN_HEAD - 0.34 * K_UP, Y_WIN_HEAD, C.pierRoofDark, MAT.PAINTED, S_STEP);
  bandRound(D_FASCIA, Y_WIN_HEAD, Y_EAVES - 0.24 * K_UP, C.pierWhite, MAT.PAINTED, S_STEP);
  bandRound(D_COPE, Y_EAVES - 0.24 * K_UP, Y_EAVES, C.pierWhite, MAT.PAINTED, S_STEP);

  // =========================================================================
  // 3. CORNER PILASTERS
  // =========================================================================
  // 553 shows a broad projecting white post at the corner where the flank turns
  // into the return face, with its own shadow down one side. Four of them is the
  // cheapest thing in this file that stops a 75 x 18 m block reading as a box:
  // they give the silhouette a step at each end. A corner pilaster wraps the
  // corner, so each is ONE box projecting on both faces at once.
  //
  // ⚠️ THE OLD CLAIM - "the only vertical relief that survives at 400 m" - was
  // false twice over. They were pierWhite on MAT.CONCRETE, the same value as the
  // wall they stand on, so they survived at NO range; and "its own shadow down
  // one side" cannot happen here at all (header). MAT.PAINTED is what makes them
  // exist: 131 against 83 turns each into a pale vertical at each end of the
  // block. Past 320 m they fade back into the wall and only the silhouette step
  // is left, which is the honest limit of what a 0.5 m projection can do.
  const corner = (landward, westSide, y0, y1, d, w, col, mat) => {
    const s = landward ? S_LAND : S_SEA, o = westSide ? OW : OE;
    pbox(landward ? s - d : s - w, landward ? s + w : s + d,
      westSide ? o - d : o - w, westSide ? o + w : o + d,
      DECK + y0, DECK + y1, col, mat);
  };
  for (const landward of [true, false]) {
    for (const westSide of [true, false]) {
      // CLIPPED 2026-09-16: the seaward pair stand on the range's aisles and stop
      // 20 mm under the aisle fascia (Y_AISLE_UNDER 2.90; was Y_SPRING 4.70).
      corner(landward, westSide, 0.0, landward ? Y_EAVES - 0.24 * K_UP : Y_AISLE_UNDER,
        D_CORNER, 0.75, C.pierWhite, MAT.PAINTED);
      // a base block, so the pilaster has a foot rather than dying in the deck
      corner(landward, westSide, 0.0, Y_DADO, D_CORNER + 0.10, 0.85,
        C.pierWhite, MAT.PAINTED);
    }
  }

  // =========================================================================
  // 4. THE FIRST-FLOOR BAY RUN - the building's signature
  // =========================================================================
  //
  // Tall narrow glazed slots at 1.9 m pitch whose white piers taper to downward
  // POINTS over the bottom 0.95 x CAL m. The earlier measurement pass calls the
  // resulting scalloped line "the single most recognisable thing on the
  // elevation after the LED", and it is continuous in frames 574 and 579 as well
  // as 565.
  //
  // PITCH 1.9 m is LOW CONFIDENCE - 4.85 px per bay against a crude linear
  // along-pier fit, and perspective along a 260 m pier is not linear. SLOT
  // 1.25 m is lower still: "roughly 2/3 of the bay pitch by eye at 15x". Both
  // are kept because the RHYTHM, not the exact pitch, is what reads at range.
  const PITCH = 1.9, PIER_W = 0.65;     // slot = the 1.25 m remainder

  // WHERE THE RUN STARTS AND STOPS is the single largest open question in this
  // feature and it is honestly unresolved. It clearly does NOT run the full 75 m
  // of the block, but frame 565 puts it at s 157-191 and frame 579 at s 176-217.
  // Taken as the MEAN of the two intervals, shaded 1 m landward: the LENGTH the
  // two agree on (37.5 m) is far more trustworthy than either position, and
  // 579's interval ends two metres PAST the seaward end of the block it is
  // measured on, so its along-pier scale is demonstrably stretched.
  // 565 is the west flank and 579 the east, so the two may not be a disagreement
  // at all - the flanks need not match. One frame shot square to either flank
  // settles it in a single measurement.
  // RUN_S1 was 203.5 (run to 202.75). Since 2026-09-16 the range ends at S_SEA
  // 199.2, so the run stops 2 m short of it like the glazing (last pier ends
  // 197.05). Both frames' intervals ran past the DSM's range end anyway.
  const RUN_S0 = 166.0;   // EAST flank only now - LOW CONFIDENCE, see above
  // WEST FLANK RUN MEASURED, 2026-09-17 (tmp-tr27/RESULT.md). beach0115 at
  // pose_final (tmp-tr11), luminance along the west wall read at the photo's own
  // storey scale (deck line + 18.8 px/m): 11 white tooth apexes at s 149.37,
  // 151.06, 152.67, 154.20, 155.76, 157.23, 158.79, 160.46, 161.96, 163.55,
  // 165.05 (h 3.3 maxima) and 11 dark V's at 150.30 ... 165.91 (h 2.7 minima).
  // Pitch 1.568 apex-to-apex, 1.561 V-to-V; ~17 px/m along s here, so a pixel
  // is ~0.06 m and the pose rms (1.8 px) is ~0.1 m. White block from s 166.5.
  // So the run is 11 piers at 1.57 centred on 149.36; PIER_W and every height
  // are unchanged. The east run is NOT moved: no east photo, and s 145-163 on
  // that flank is the RockReef canopy and sign at the teeth's own heights.
  const W_PITCH = 1.57, W_RUN_S0 = 149.36 - PIER_W / 2, W_PIERS = 11;

  const bayRun = (put, s0, pitch, piers) => {
    const PITCH = pitch;
    const r0 = s0;
    // 2026-09-16: the first floor (piers, glass, bars, lintel, transom, cill,
    // teeth) stops at the last whole bay: east nU 7, rU 179.95 (before S_STEP).
    // 2026-09-17 (tmp-tr29): EAST ONLY now; the west first floor is drawn below.
    const nU = piers - 1;
    const rU = s0 + nU * PITCH + PIER_W;

    // The dark reveal the scalloped feet hang into IS NO LONGER DRAWN HERE. It
    // is the same box as the building's mid-height band, so it is now one
    // bandRound in section 2 running all four faces instead of a 37 m strip
    // that stopped where the bay run stopped. Nothing about the scallop changes
    // - the band is at depth 0.06 and the teeth at 0.34, so the teeth still
    // stand in front of it - and the other 38 m of the block gains the second
    // horizontal frame 603 says it needs. Net cost of the promotion: +2 boxes.

    // ---- THE RECESS -------------------------------------------------------
    // This is the change that makes the bay run stop being wallpaper. The glass
    // stays at the wall plane and the SURROUND comes forward 0.34 m, so each
    // slot is a 320 mm deep hole with a jamb either side, a lintel over and a
    // cill under. A true recess is impossible here - pier.js's block is solid
    // and anything drawn inboard of o = +15 is simply inside it - so the reveal
    // has to be made by bringing the frame forward, which is what a real
    // rendered-and-painted reveal looks like from outside anyway.
    // The cill oversails the jambs by 0.24 (D_CILL - D_REVEAL) so it throws a
    // line across the glass below it; the lintel sits back at fascia depth so
    // the head of the opening is in shadow.
    put(r0, rU, D_FASCIA, Y_WIN_HEAD - 0.55 * K_UP, Y_WIN_HEAD, C.pierWhite, MAT.PAINTED);
    // 2026-09-16: the cill and the pointed feet stop at the first floor's end
    // (rU): seaward of S_STEP the flank is 3.17 tall and they would float.
    put(r0 - 0.12, rU + 0.12, D_CILL, Y_SPRING - 0.26, Y_SPRING,
      C.pierWhite, MAT.PAINTED);
    // 2026-09-16: the governing band either side of the gables, and the dark
    // ground the gables stand on, down to their valleys (above Y_POINT the
    // all-round dark band already carries it).
    put(S_LAND, r0 - 0.12, D_CILL, Y_GOV_B, Y_GOV_T, C.pierWhite, MAT.PAINTED);
    put(rU + 0.12, S_STEP, D_CILL, Y_GOV_B, Y_GOV_T, C.pierWhite, MAT.PAINTED);
    put(r0 - 0.12, rU + 0.12, 0.06, Y_TOOTH_B, Y_POINT, C.pierGlass, MAT.PAINTED);
    // and a dark reveal soffit under the lintel, for the same reason as the
    // eaves: from the water you see the shadow, never the horizontal face.
    put(r0, rU, D_FASCIA - 0.04, Y_WIN_HEAD - 0.67 * K_UP, Y_WIN_HEAD - 0.55 * K_UP,
      C.pierRoofDark, MAT.PAINTED);

    for (let b = 0; b <= nU; b++) {
      const ps = r0 + b * PITCH;                    // white pier, left edge
      if (b <= nU) put(ps, ps + PIER_W, D_REVEAL, Y_SPRING, Y_WIN_HEAD, C.pierWhite, MAT.PAINTED);

      // The pointed foot. THREE steps, and that is a budget decision, not a
      // reading. The taper is STRAIGHT-SIDED: whether the real profile is
      // straight or ogee is below the resolution of every frame in the set -
      // 565 shows the points as dark shapes on white, 574 shows the same line
      // white against a dark ground, and neither resolves the edge.
      // 2026-09-16: it points UP, Y_TOOTH_B -> Y_TOOTH_T (see Y_TOOTH_B).
      const pc = ps + PIER_W / 2;
      const TEETH = 3;
      if (b <= nU) for (let k = 0; k < TEETH; k++) {
        const yBot = Y_TOOTH_B + (Y_TOOTH_T - Y_TOOTH_B) * (k / TEETH);
        const yTop = Y_TOOTH_B + (Y_TOOTH_T - Y_TOOTH_B) * ((k + 1) / TEETH);
        const hw = (PIER_W / 2) * (1 - (k + 0.5) / TEETH);
        put(pc - hw, pc + hw, D_REVEAL, yBot, yTop, C.pierWhite, MAT.PAINTED);
      }

      // the glazed slot to the right of this pier (none after the last one)
      if (b < nU) {
        put(ps + PIER_W, ps + PITCH, D_GLASS, Y_SPRING, Y_WIN_HEAD,
          C.pierGlass, MAT.PAINTED);
        // One central glazing bar per slot, standing 0.10 proud of the glass and
        // buried by the 0.34 reveals either side, so it reads only in the middle
        // of the opening where it should. Where the mullions actually fall
        // inside the 1.25 m slot is below the resolution of a 640 px still; ONE
        // central bar is the minimum claim that gives the opening a scale.
        const mc = ps + PIER_W + (PITCH - PIER_W) / 2;
        put(mc - 0.05, mc + 0.05, D_MULL, Y_SPRING, Y_WIN_HEAD,
          C.pierWhite, MAT.PAINTED);
      }
    }

    // The transom dividing each tall bay into two tiers. LOW CONFIDENCE - "a
    // pale break at roughly mid-height", nothing more. ONE box for the whole
    // run, projecting 0.18: proud of the glass at 0.02 and of the bars at 0.10,
    // and swallowed by the reveals at 0.34, so it reads only inside the openings.
    put(r0, rU, D_BAND, Y_TRANSOM - 0.06, Y_TRANSOM + 0.06, C.pierWhite, MAT.PAINTED);
  };

  // =========================================================================
  // 4b. THE OPENING-BAND MEASUREMENT, 2026-09-18 (tmp-tr98)
  // =========================================================================
  // The brief for this pass said the panes "render too dark". THEY DO NOT, and
  // the numbers are worth keeping because they send the budget somewhere else.
  //
  // TWO OVERCAST OWNER FRAMES (overcast is the only honest tone source - trap 5
  // bans colour off a sunlit frame), each read as a SAME-FRAME RATIO against
  // its own white wall so exposure cancels:
  //
  //   1049650633833040.jpg (overcast midday, the LED bow and the flank beyond)
  //     white wall p50 181.6 (p10 162.9, p90 185.6)   sky 184
  //     pane inside a barred window            62.6  = 0.345 of the wall
  //     second pane in the same window         88.0  = 0.485
  //     small dark window in white wall        78.5  = 0.43
  //   1066407125490724.jpg (overcast, different day, the whole head)
  //     tower white wall below the gallery    117.2
  //     three gallery panes         8.9 / 8.7 / 22.3 = 0.07 - 0.19
  //     gallery BAND, panes and white piers    40.1  = 0.34
  //     lantern pane vs its own white post 41.3/119  = 0.35
  //
  // THE SAME RATIO IN THE RENDER, off tmp-tr98/v_before/S_head.png:
  //     wall 121.5 (p10 100.6, p90 122.3)   sky 201.4
  //     first-floor pane (run p10)              39.5 = 0.325   <- CORRECT
  //     first-floor window BAND (mean)          93.0 = 0.77    <- WRONG
  //
  // So the pane key is right to within a hundredth and the BAND is more than
  // twice as pale as either reference. The cause is arithmetic, not colour: at
  // BAR 0.16 with two mullions and three rails inside a 4.58 x 2.0 m opening,
  // plus a 0.10 m white frame down each side of every pier, white covers ~41%
  // of the opening's area and white renders at the WALL'S OWN VALUE on this
  // building (section 11, note 1). 0.41 x 120 + 0.59 x 32 = 68 = 0.56 of the
  // wall before the lintel and cill bands are counted. Thinning the bars to
  // 0.11 and the pier frames to 0.06 takes white to ~29% and the band to ~0.48,
  // which is the top of the measured range and as far as this can go without
  // inventing a glazing pattern no frame resolves.
  //
  // AND PANE SPREAD. Neighbouring panes on ONE building in ONE overcast frame
  // run 0.07 to 0.48 of the wall; every pane in this file was one value. That
  // is the window-scale version of the flat-wall defect section 11 measured
  // (render spread 0.7 levels against the reference's 13-38), and it is fixed
  // the same way - by building the variation, since the renderer cannot.
  // The three keys used are pierRoofDark 27.2, pierGlass 31.9 and pierBeam 44.9,
  // chosen so the AREA-WEIGHTED MEAN stays within 2 levels of pierGlass: this
  // is a spread change and must not become a tone change.

  // ---- THE WEST FIRST FLOOR, rebuilt to beach0115 (2026-09-17, tmp-tr29) ----
  // bayRun is now EAST ONLY. tmp-tr27 put the west teeth on the photo's stations
  // but kept bayRun's form (0.65 m three-step spikes on a dark band, a narrow
  // slot per tooth), which the photo does not show. Measured in beach0115 at
  // pose_final (tmp-tr29/RESULT.md; photo storey scale, deck line + 1.5 px -
  // h x 18.8 px/m, ~17 px/m along s, so 1 px ~0.06 m):
  //  - TEETH: broad white triangles, bases touching, on white wall. V centres
  //    are dark from h 2.55 to ~3.7; 0.3 m off-centre only h 3.0-3.4. That is a
  //    touching triangle, so the triangle is drawn and the dark ground stays.
  //  - WINDOWS: five wide ones with a 3x3 grid of white bars (bottom rail
  //    h ~4.0-4.15, bars at ~5.0-5.3, head ~6.3) between six DARK TAPERED PIERS.
  //    Pier bottoms (h 4.1) s 142.77-143.24, 147.35-147.86, 151.86-152.46,
  //    156.43-157.07, 160.96-161.65, 165.58-166.24 -> centres 143.0 + 4.58 i
  //    (within 0.03); tops (h 5.6-6.3) about 0.9-1.1 wide. Piers A/B (143.0,
  //    147.6) stay dark down to h 2.3; C-F stop at the tooth tips.
  //  - s 166.4-180.8: white; small dark windows at s 167.0, 168.9 (h 4.5-4.95)
  //    and 172.6, 175.3, 178.1 (h 4.3-4.75); a dark pilaster s 170.0-170.66 at
  //    h 2.6-4.8 widening to 169.97-171.05 at h 5.6, from h ~2.45 to ~5.9.
  // Heights are mapped onto this file's storey (valleys 2.55, tips 3.90, window
  // head under the soffit), not copied: the photo's own scale is ~0.2 m loose.
  // Colours are existing keys only (trap 5: a sunlit frame is form, not colour),
  // so panes and piers are both pierGlass and the piers read by relief (0.34
  // proud) and by cutting the white bars at their tapered width.
  {
    const Y_FF_TOP = Y_WIN_HEAD - 0.67 * K_UP;   // 5.90, under the lintel soffit
    const Y_FF_B = Y_TOOTH_T;                    // 3.90, pier foot = tooth tips
    // the windows' bottom rail stands 0.25 above the tips: the photo has a DARK
    // line between tips and rail (apex column s 151.1: dark h 3.7-3.9, rail 4.0),
    // which joins the V's into one dark zigzag that the white teeth read against
    const Y_RAIL = Y_FF_B + 0.25;                // 4.15
    // ⚠️ 0.16 -> 0.11, 2026-09-18 (tmp-tr98). See THE OPENING-BAND MEASUREMENT
    // at the head of section 4b below: at 0.16 the white framing is 41% of the
    // opening's area, so a window BAND renders at 0.56 of the wall where both
    // overcast references put it at 0.34-0.48. The panes themselves are the
    // right tone; it is the white that is too fat. Photo bar widths (~0.15-0.2)
    // were read at 17 px/m on a 1.8 px-rms pose, i.e. +-0.1 m - 0.11 is inside
    // that spread and is an ordinary glazing-bar dimension. Costs no triangles.
    const BAR = 0.11;                            // white bar/rail thickness
    // the teeth: 11 at W_PITCH on W_RUN_S0, each a triangle of 8 stacked boxes,
    // half-width W_PITCH / 2 at the base so neighbouring bases touch
    const T0 = W_RUN_S0 + PIER_W / 2 - W_PITCH / 2;   // 148.575
    const T1 = T0 + W_PIERS * W_PITCH;                // 165.845
    const STEPS = 8;
    for (let b = 0; b < W_PIERS; b++) {
      const pc = T0 + (b + 0.5) * W_PITCH;
      for (let k = 0; k < STEPS; k++) {
        const hw = (W_PITCH / 2) * (1 - (k + 0.5) / STEPS);
        west(pc - hw, pc + hw, D_REVEAL, Y_TOOTH_B + (Y_TOOTH_T - Y_TOOTH_B) * (k / STEPS),
          Y_TOOTH_B + (Y_TOOTH_T - Y_TOOTH_B) * ((k + 1) / STEPS), C.pierWhite, MAT.PAINTED);
      }
    }
    // the dark ground of the V's below the all-round band (Y_POINT up)
    west(T0, T1, 0.06, Y_TOOTH_B, Y_POINT, C.pierGlass, MAT.PAINTED);

    // the pilaster at s 170.0-171.05 (dark, tapering DOWN), 4 stacked boxes
    const PL_B = 2.45, PL = [[170.33, 0.33], [170.51, 0.54]];   // [centre, half-width] foot, head
    const plStep = (k) => {
      const t = (k + 0.5) / 4;
      return [PL[0][0] + (PL[1][0] - PL[0][0]) * t, PL[0][1] + (PL[1][1] - PL[0][1]) * t];
    };
    for (let k = 0; k < 4; k++) {
      const [c, hw] = plStep(k);
      west(c - hw, c + hw, D_REVEAL, PL_B + (Y_FF_TOP - PL_B) * (k / 4),
        PL_B + (Y_FF_TOP - PL_B) * ((k + 1) / 4), C.pierGlass, MAT.PAINTED);
    }
    // the governing band either side of the teeth, broken round the pilaster's
    // two lower steps (the band's 3.13-3.35 falls in steps 0 and 1)
    const [c1, hw1] = plStep(1);
    west(S_LAND, T0, D_CILL, Y_GOV_B, Y_GOV_T, C.pierWhite, MAT.PAINTED);
    west(T1, c1 - hw1, D_CILL, Y_GOV_B, Y_GOV_T, C.pierWhite, MAT.PAINTED);
    west(c1 + hw1, S_STEP, D_CILL, Y_GOV_B, Y_GOV_T, C.pierWhite, MAT.PAINTED);
    // its shadow, in the same three pieces (see the landward band, section 2)
    west(S_LAND, T0, GOV_D, Y_GOV_B - GOV_SH, Y_GOV_B, C.pierArch, MAT.PAINTED);
    west(T1, c1 - hw1, GOV_D, Y_GOV_B - GOV_SH, Y_GOV_B, C.pierArch, MAT.PAINTED);
    west(c1 + hw1, S_STEP, GOV_D, Y_GOV_B - GOV_SH, Y_GOV_B, C.pierArch, MAT.PAINTED);

    // white wall where the photo has no first-floor glazing (painted, as the
    // bands are; the bare block renders darker, see the header)
    west(S_LAND, W_FF_S0, 0.06, Y_POINT, Y_WIN_HEAD - 0.34 * K_UP, C.pierWhite, MAT.PAINTED);
    west(W_FF_S1, S_STEP, 0.06, Y_POINT, Y_WIN_HEAD - 0.34 * K_UP, C.pierWhite, MAT.PAINTED);
    // small windows on that wall: [station, foot, head], 0.45 wide, with a cill
    for (const [s, y0, y1] of [[167.0, 4.50, 4.95], [168.9, 4.50, 4.95],
      [172.6, 4.30, 4.75], [175.3, 4.30, 4.75], [178.1, 4.30, 4.75]]) {
      west(s - 0.225, s + 0.225, D_MULL, y0, y1, C.pierGlass, MAT.PAINTED);
      west(s - 0.30, s + 0.30, D_REVEAL, y0 - 0.08, y0, C.pierWhite, MAT.PAINTED);
    }

    // the window run: lintel and its dark soffit (as bayRun's), one glass
    // plane above the all-round band, rails and transoms as continuous bars
    // that the piers cut, mullions at the thirds of each opening
    west(W_FF_S0, W_FF_S1, D_FASCIA, Y_WIN_HEAD - 0.55 * K_UP, Y_WIN_HEAD, C.pierWhite, MAT.PAINTED);
    west(W_FF_S0, W_FF_S1, D_FASCIA - 0.04, Y_FF_TOP, Y_WIN_HEAD - 0.55 * K_UP,
      C.pierRoofDark, MAT.PAINTED);
    const W_BAY_S0 = 143.0, W_BAY = 4.58, PH_B = 0.275, PH_T = 0.48;   // pier half-widths (photo ~0.55 foot, ~1.0 head)
    // ONE GLASS BOX FOR FIVE OPENINGS WAS THE STENCIL. See PANE SPREAD below:
    // both overcast references show neighbouring panes on ONE building between
    // 0.07 and 0.48 of their own white wall, and the model had every pane on
    // every elevation at exactly one value. The five openings now carry three
    // keys. The MEAN is deliberately left where it was (pierGlass 31.9 against
    // the wall's 120.4 = 0.265, and the render's own antialiased pane reads
    // 39.5 = 0.325 against the photo's 0.345) - this is a SPREAD change, not a
    // tone change, because the tone measured right and the spread measured
    // nearly zero. +4 boxes.
    const PANE_W = [C.pierGlass, C.pierRoofDark, C.pierGlass, C.pierBeam, C.pierGlass];
    for (let i = 0; i < 5; i++) {
      west(i === 0 ? W_FF_S0 : W_BAY_S0 + i * W_BAY,
        i === 4 ? W_FF_S1 : W_BAY_S0 + (i + 1) * W_BAY,
        D_GLASS, Y_SPRING, Y_FF_TOP, PANE_W[i], MAT.PAINTED);
    }
    // bay 0 sits over the canopy, not the teeth: its rail is on the governing band
    west(W_FF_S0, W_BAY_S0 + W_BAY, D_MULL, Y_GOV_T, Y_GOV_T + BAR, C.pierWhite, MAT.PAINTED);
    west(W_BAY_S0 + W_BAY, W_FF_S1, D_MULL, Y_RAIL, Y_RAIL + BAR, C.pierWhite, MAT.PAINTED);
    for (const f of [1 / 3, 2 / 3]) {
      const y = Y_RAIL + BAR + (Y_FF_TOP - Y_RAIL - BAR) * f;
      west(W_FF_S0, W_FF_S1, D_MULL, y - BAR / 2, y + BAR / 2, C.pierWhite, MAT.PAINTED);
    }
    for (let i = 0; i < 6; i++) {
      const pc = W_BAY_S0 + i * W_BAY;
      // the tapered pier: 4 boxes, half-width PH_B at the window foot to PH_T
      // under the soffit; A and B (i 0, 1) continue down to the governing band
      for (let k = 0; k < 4; k++) {
        const hw = PH_B + (PH_T - PH_B) * ((k + 0.5) / 4);
        const ya = Y_FF_B + (Y_FF_TOP - Y_FF_B) * (k / 4), yb = Y_FF_B + (Y_FF_TOP - Y_FF_B) * ((k + 1) / 4);
        west(pc - hw, pc + hw, D_REVEAL, ya, yb, C.pierGlass, MAT.PAINTED);
        // the white window frame hugging it, 0.10 each side at bar depth: dark
        // pier on dark glass has no edge, and this is what draws the taper
        // (the photo's frames run beside the piers, e.g. the light line at 147.2)
        west(pc - hw - 0.06, pc + hw + 0.06, D_MULL, Math.max(ya, Y_RAIL), yb, C.pierWhite, MAT.PAINTED);
      }
      if (i < 2) west(pc - PH_B + 0.03, pc + PH_B - 0.03, D_REVEAL, Y_GOV_T, Y_FF_B,
        C.pierGlass, MAT.PAINTED);
      if (i < 5) {
        const a = pc + PH_B, w = W_BAY - 2 * PH_B;
        for (const f of [1 / 3, 2 / 3]) {
          west(a + w * f - BAR / 2, a + w * f + BAR / 2, D_MULL, i === 0 ? Y_GOV_T : Y_RAIL, Y_FF_TOP,
            C.pierWhite, MAT.PAINTED);
        }
      }
    }
  }
  // 2026-09-17 (tmp-tr31): EAST FIRST FLOOR rebuilt from the two east frames,
  // replacing bayRun's 8 thin teeth at s 166-180 (which no east frame shows).
  //  - a103: G:\DJI\dji aug 25\DJI_20250722172300_0103_D.MP4 @ 8 s, East Cliff,
  //    ~30 m up, hazy sun behind the pier (east face in shade). FORM ONLY.
  //  - r568: reference clip 1368108281589246.mp4 @ 31 s (= ref-cache 0568),
  //    east beach, backlit. FORM ONLY.
  // No solved pose: stations are ratios against the 4.58 m bay (the west's
  // measured pitch, same idiom), the hall's landward corner (s 140) and the
  // seaward end of the hall wall (S_STEP). Both frames: FIVE wide 3x3 windows
  // between six dark tapered piers; the landward white panel is 1.1-1.3 bays
  // (a103 79 px / 65.3 px per bay = 5.5 m) and the seaward panel ~0.9-1.0 bay
  // to a dark pilaster, then plain wall to S_STEP (a103 113 px = 7.9 m). So the
  // east piers sit at 145.5 + 4.58 i, 2.5 m seaward of the west's 143.0. Below
  // the windows NOT teeth but a WAVY white valance, period ~2 bays, centred
  // ~0.3-0.6 m under the window foot, over a dark ground. Verticals are the
  // west's measured ones: the same ratio method read on the west f004 under-
  // reads the known 3.90 window foot by ~1.2 m, and read on the east gives the
  // same number, so the two sides agree. Heights of the wave are +-0.2 m.
  {
    const Y_FF_TOP = Y_WIN_HEAD - 0.67 * K_UP, Y_FF_B = Y_TOOTH_T, BAR = 0.11;  // BAR 0.16 -> 0.11, see the west run
    const Y_RAIL = Y_FF_B + 0.25;
    const E_BAY_S0 = 145.5, E_BAY = 4.58, PH_B = 0.275, PH_T = 0.48;
    const E_FF_S0 = E_BAY_S0 - PH_T, E_FF_S1 = E_BAY_S0 + 5 * E_BAY + PH_T;   // 145.02..168.88
    const E_PIL = 172.7;                                   // a103 dark pilaster
    // white wall either side of the window run, lintel + soffit + glass over it
    // landward panel from Y_SPRING at 0.06, so the wash body at 0.09 (section 8) is not swallowed
    east(S_LAND, E_FF_S0, 0.06, Y_SPRING, Y_WIN_HEAD - 0.34 * K_UP, C.pierWhite, MAT.PAINTED);
    east(E_FF_S1, S_STEP, D_MULL, Y_FF_B, Y_WIN_HEAD - 0.34 * K_UP, C.pierWhite, MAT.PAINTED);
    east(E_FF_S0, E_FF_S1, D_FASCIA, Y_WIN_HEAD - 0.55 * K_UP, Y_WIN_HEAD, C.pierWhite, MAT.PAINTED);
    east(E_FF_S0, E_FF_S1, D_FASCIA - 0.04, Y_FF_TOP, Y_WIN_HEAD - 0.55 * K_UP,
      C.pierRoofDark, MAT.PAINTED);
    // five openings, three keys - the PANE SPREAD change, see the west run
    const PANE_E = [C.pierGlass, C.pierBeam, C.pierGlass, C.pierGlass, C.pierRoofDark];
    for (let i = 0; i < 5; i++) {
      east(i === 0 ? E_FF_S0 : E_BAY_S0 + i * E_BAY,
        i === 4 ? E_FF_S1 : E_BAY_S0 + (i + 1) * E_BAY,
        D_GLASS, Y_FF_B, Y_FF_TOP, PANE_E[i], MAT.PAINTED);
    }
    east(S_LAND, S_STEP, D_CILL, Y_GOV_B, Y_GOV_T, C.pierWhite, MAT.PAINTED);
    // 3x3 bars: foot rail and two transoms, two mullions a bay
    east(E_FF_S0, E_FF_S1, D_MULL, Y_RAIL, Y_RAIL + BAR, C.pierWhite, MAT.PAINTED);
    for (const f of [1 / 3, 2 / 3]) {
      const y = Y_RAIL + BAR + (Y_FF_TOP - Y_RAIL - BAR) * f;
      east(E_FF_S0, E_FF_S1, D_MULL, y - BAR / 2, y + BAR / 2, C.pierWhite, MAT.PAINTED);
    }
    for (let i = 0; i < 6; i++) {
      const pc = E_BAY_S0 + i * E_BAY;
      for (let k = 0; k < 4; k++) {
        const hw = PH_B + (PH_T - PH_B) * ((k + 0.5) / 4);
        east(pc - hw, pc + hw, D_REVEAL, Y_FF_B + (Y_FF_TOP - Y_FF_B) * (k / 4),
          Y_FF_B + (Y_FF_TOP - Y_FF_B) * ((k + 1) / 4), C.pierGlass, MAT.PAINTED);
      }
      if (i < 5) {
        const a = pc + PH_B, w = E_BAY - 2 * PH_B;
        for (const f of [1 / 3, 2 / 3]) {
          east(a + w * f - BAR / 2, a + w * f + BAR / 2, D_MULL, Y_RAIL, Y_FF_TOP,
            C.pierWhite, MAT.PAINTED);
        }
      }
    }
    // the dark pilaster seaward of the run (a103 x 958-976, full storey)
    east(E_PIL - 0.30, E_PIL + 0.30, D_REVEAL, Y_POINT, Y_WIN_HEAD - 0.34 * K_UP,
      C.pierGlass, MAT.PAINTED);
    // wavy valance: a white line on bandRound's dark ground (3.35-4.70),
    // crests over the piers, period 2 bays, 8 segments a period
    const WV_S0 = S_LAND + 0.5, WV_S1 = E_PIL - 0.30, WV_C = 3.62, WV_A = 0.14, WV_T = 0.12;
    const SEG = (2 * E_BAY) / 8, nSeg = Math.floor((WV_S1 - WV_S0) / SEG);
    for (let j = 0; j < nSeg; j++) {
      const sm = WV_S0 + (j + 0.5) * SEG;
      const yc = WV_C + WV_A * Math.cos((2 * Math.PI * (sm - E_BAY_S0)) / (2 * E_BAY));
      east(WV_S0 + j * SEG, WV_S0 + (j + 1) * SEG, D_REVEAL, yc - WV_T / 2, yc + WV_T / 2,
        C.pierWhite, MAT.PAINTED);
    }
  }

  // =========================================================================
  // 5. EAST FLANK, o = +15 - the RockReef shopfront
  // =========================================================================
  //
  // ⚠️⚠️ RESOLVED 2026-09-18 (tmp-tr106): THE SHOPFRONT IS NOT ON THIS FLANK.
  // It is on the LANDWARD BOW, s = 140, co-planar with the LED, and it is built
  // there in section 8. What is left here is the plain flank grammar that 579
  // and 542 actually show on a long side - a glazed base, an arcade of piers and
  // a head rail - and nothing else.
  //
  // THE EVIDENCE, and it is two owner frames measured independently of each
  // other and of the model:
  //
  //   1049650633833040.jpg  1080x1920, overcast, LED clock reads 15:39.
  //     Column profile over rows 445-535: white wall 182, LED dark ground from
  //     x 467 to x 787 (320 px), a dark 21 px ornament centred x 414 and another
  //     centred x 839. Seahorse mid-point 626.5, LED mid-point 627.0 - a
  //     SYMMETRIC PAIR ABOUT THE SCREEN, which is a gable composition and not
  //     anything a 59.2 m flank does.
  //     The face ENDS AT ONE VERTICAL LINE IN BOTH STOREYS: the gable's white
  //     wall stops at x 890 (rows 470-560) and the shopfront's white wall stops
  //     at x 886-890 (rows 596-606). One corner bounds the LED above and the
  //     sign band, doors, panels and canopy below, so they are on ONE PLANE.
  //     Face 337->890 = 553 px = 1.73 LED widths.
  //   1066407125490724.jpg  2048x1152, overcast, a DIFFERENT DAY, clock 11:04.
  //     Same profile over rows 300-360: LED 500->779 (280 px), ornaments centred
  //     453 and 821 (mid 637.0 against the LED's 639.5), white wall 414->866,
  //     and the ground storey's white wall ends at the same x 866-868.
  //     Face/LED = 1.61 here and 1.61 (white-wall to white-wall) there - two
  //     frames, two days, two ranges, the same ratio.
  //
  //   SCALE. Vertical, frame 1, column band x 430-540: the green sign band runs
  //     y 604-640 = 36 px and the canopy fascia y 585-596 = 11 px. This file's
  //     own 553-derived heights are 0.93 m and 0.29 m, i.e. 38.7 and 37.9 px/m -
  //     the two agree to 2%, which is itself evidence that the wall 553 was read
  //     off IS this wall. Horizontal, taking the LED at this file's 9.0 m over
  //     320 px = 35.6 px/m, the face is 15.5 m wide and the LED 9.0 m; taking
  //     the sign band as the ruler it is 14.3 m. The block is 18 m (OW..OE).
  //     For the 59.2 m east flank to carry this composition the LED would have
  //     to be 34-37 m wide. It is not ambiguous.
  //
  // Every 553 band HEIGHT is a height above deck and is unaffected; only the
  // placement moves. The mapping used to carry the horizontal positions across
  // is o = O_MID - (x - 627) / 35.56 on frame 1, anchored on the LED because the
  // MINUS is derived, not guessed - see the note beside the SH_* constants and
  // tmp-tr98/ev/sheet_pose.png for the solved-pose check. The
  // LED is the one object that is in both the photograph and the model.
  //
  // It is also the flank the game sees. The rider is on the +o side and to
  // seaward, so this face and the seaward end wall carry the detail budget.
  const E0 = S_LAND + 2, E1 = S_SEA - 2;       // 2 m of plain corner each end

  // The glazed zone, 0.5-2.00 m, as one continuous dark recess with the pale
  // arcade piers laid over it. 2.0 m is 16 px of the 46 px window-head height in
  // 579; 553 reads the same wall as a shopfront with a transom at 2.00-2.15.
  // Those are ONE element read at two resolutions and they are built as one.
  east(E0, E1, D_GLASS, Y_DADO, Y_SHOP_HEAD, C.pierGlass, MAT.PAINTED);

  // Slim pale piers at the SAME 1.9 m pitch as the first floor above, now at the
  // full 0.30 reveal so the arcade is an arcade rather than a stripe. Their
  // pitch was never measured - 579 resolves an arcade, not its rhythm - so
  // lining them through with the bays above is an architectural inference, and
  // the conservative one: a ground-floor rhythm that does NOT line through with
  // the floor above is a specific claim, and this makes none.
  // 2026-09-18 (tmp-tr106): the run now starts at E0 instead of at SHOP_S1.
  // It used to begin where the shopfront ended; with the shopfront gone there is
  // no reason for 18 m of this flank to have no arcade in it, and 579 - the only
  // frame that sees this side at all - resolves an arcade over its whole length.
  for (let s = E0 + 0.9; s < E1 - 0.35; s += PITCH) {
    east(s, s + 0.35, D_REVEAL, Y_DADO, Y_SHOP_HEAD, C.pierWhite, MAT.PAINTED);
  }

  // ---- WHAT USED TO BE HERE ------------------------------------------------
  // The graphics wrap (two dark panels in white frames), the 1.8 m shopfront
  // mullion rhythm and the four-leaf entrance with its jambs. All three were
  // frame-553 readings placed on this flank on the one assumption section 5's
  // header used to flag and that the two overcast frames have now disproved.
  // They are rebuilt in section 8 on the bow, at the o positions the same two
  // frames measure, with no lettering on anything.
  //
  // NOT REBUILT ANYWHERE: the eight ROCKREEF letter blocks. They were a device
  // for reading a name at range, and a name is a business, not a measurement.
  // Nothing in this file may carry lettering, a device or a logo again.

  // The head rail / fascia over the whole ground storey - 553's transom
  // (2.00-2.15) and 579's fascia (2.00-2.25) reconciled at 2.00-2.20.
  east(E0, E1, D_FASCIA, Y_SHOP_HEAD, Y_HEAD_RAIL, C.pierWhite, MAT.PAINTED);

  // The governing band's shadow on the EAST flank (see section 2 for the
  // derivation). It is drawn here and not with the band because for three passes
  // it had to SKIP THE CANOPY STRETCH - a 0.44 m shadow box would have stood in
  // front of a 0.18 m sign panel and painted 18.6 m of grey over the loudest
  // measured element on the elevation. That reason is gone with the shopfront.
  // 2026-09-18 (tmp-tr106): ONE PIECE AGAIN. It was split around the canopy so
  // it could not paint over the sign band; both have moved to the bow, so this
  // flank's band runs unbroken and the split now lives in section 8 instead.
  east(S_LAND, S_STEP, GOV_D, Y_GOV_B - GOV_SH, Y_GOV_B, C.pierArch, MAT.PAINTED);

  // ---- upper wall: the seahorse and the PIER-TO-SHORE lightbox -------------
  // Both SCALED by CAL: both were read as a fraction of deck-to-eaves in 553.
  // The seahorse is 0.78 x 0.39 m applied to the white wall, drawn as two blocks
  // - body and head - because pbox cannot draw a seahorse and a single rectangle
  // reads as a vent. At the range this is seen from it is a dark mark of the
  // right size in the right place, which is all the frame supports.
  // ⚠️ THE SEAHORSE HAS MOVED TO THE LANDWARD BOW, 2026-09-18 (tmp-tr98), AND
  // THERE ARE TWO OF THEM. It was one emblem here on the east flank, read off
  // frame 553 - the frame whose face this file has never resolved (see the
  // warning at the head of this section). Two OWNER OVERCAST frames settle it,
  // and they are not the same day:
  //   1049650633833040.jpg and 1066407125490724.jpg both show a PAIR of dark
  //   seahorses applied to the arched white bow, one each side of the LED, at
  //   the LED's own upper half. Nothing resembling one appears on a flank in
  //   either frame.
  // Since 553 supplies the seahorse AND the shopfront below it, this is also
  // the first hard evidence about which face 553 is - see the OPEN note in
  // tmp-tr98/RESULT.md. Only the seahorse is moved here: moving the whole
  // RockReef shopfront on one reading would strip the flank the game sees.
  // Built in section 8 with the rest of the bow.
  // Dark louvre / vent panel beside it. LOW CONFIDENCE - measured at a slightly
  // nearer station, so perspective did not fully cancel. Given a proper frame so
  // it is a louvre in an opening rather than a smudge.
  // 2026-09-17 (tmp-tr31): the louvre at s 150 was REMOVED - s 150.08 is an east
  // window pier in frames a103/r568, and the new glass swallowed it.

  // The illuminated PIER-TO-SHORE lightbox. RESIZED this pass: 553 upscaled 2x
  // puts it at roughly 250 px wide and 85 px tall against the 140 px door bank
  // at a comparable station, i.e. about 6.4 x 1.1 m - more than twice the 3.0 x
  // 0.9 built before, and it is the largest single element on the elevation
  // after the bay run. Bottom edge SCALED from the old 5.30 to 7.55.
  //
  // ⚠️ BOTH ITS PLANES MUST CLEAR D_FASCIA AND THE DARK EAVES SOFFIT STRIP. It
  // overlaps the eaves band, which is exactly what 553 shows - the panel
  // oversails the roof line with a dark shadow gap down its edge - but at
  // anything under 0.42 the fascia swallows its top, and at D_FASCIA - 0.02 the
  // backing box lands on the eaves soffit strip, which is the same colour and
  // the same material, so the gap it exists to draw disappears into the thing it
  // is meant to stand clear of. 0.54 is a lightbox on a standoff frame and 0.46
  // is that shadow gap made explicit.
  const LB_S0 = 151.5, LB_S1 = 157.9, LB_B = 5.30 * CAL, LB_T = LB_B + 1.10;
  east(LB_S0 - 0.10, LB_S1 + 0.10, 0.46, up(LB_B - 0.10), up(LB_T + 0.10),
    C.pierRoofDark, MAT.PAINTED);
  east(LB_S0, LB_S1, 0.54, up(LB_B), up(LB_T), C.pierWhite, MAT.PAINTED);

  // =========================================================================
  // 6. WEST FLANK, o = -3 - plain white below the governing line
  // =========================================================================
  // Frame 565: uniform white from 582 to 592 px against the dark bays above. The
  // west flank has NO ground-floor glazing and no arcade - only occasional dark
  // door openings.
  //
  // FOUR doors, evenly spread. The COUNT and the STATIONS are not measured - 565
  // resolves "occasional dark openings", not how many or where. Four at 15 m
  // centres is a service-door rhythm for a 75 m block and makes the minimum
  // claim that still breaks the blank wall. Each now gets a full surround -
  // jambs, head, cill - at the reveal depth, so on the flank the game rarely
  // sees, the four doors are still four holes rather than four grey patches.
  // W_DOORS / W_DOOR_W are declared in section 1, because the plinth is split
  // around them there. 150/165/180/195 at 15 m centres is that service-door
  // rhythm; the width is a single 1.10 m leaf.
  for (const ds of W_DOORS) {
    west(ds, ds + W_DOOR_W, D_GLASS, 0.0, 2.10, C.pierGlass, MAT.PAINTED);
    west(ds - 0.16, ds, D_REVEAL, 0.0, 2.28, C.pierWhite, MAT.PAINTED);
    west(ds + W_DOOR_W, ds + W_DOOR_W + 0.16, D_REVEAL, 0.0, 2.28, C.pierWhite, MAT.PAINTED);
    west(ds - 0.24, ds + W_DOOR_W + 0.24, D_CILL - 0.06, 2.28, 2.46,
      C.pierWhite, MAT.PAINTED);
  }
  // 6b. RANGE WEST FLANK OPENINGS (2026-09-16, tmp-tr25p item 2). The "plain
  // white" claim above is frame 565's HALL flank; the range flank is not blank.
  // beach0115 at pose_final, luminance along o = OW in height bands: a dark
  // shopfront at s 180.6-184.4 (1.2-2.1 m band L 121-186 against 210-236 on
  // the wall) under the blue sign f004 also shows (orig x 782-802), and four
  // small dark high windows in the 2.2-2.6 band at s 185.0-186.0, 188.0-189.0,
  // 191.2-192.0, 192.8-194.0 (L 164-185 against 205-236). f004 says only that
  // the flank under the fascia reads ~10% under a white wall. Stations are read
  // at ~10 px/m (+-0.3 m). The shopfront starts clear of the s 180 door's head
  // (181.34); everything tops out under the aisle fascia (2.92).
  west(181.45, 184.40, D_GLASS, Y_DADO, 2.10, C.pierGlass, MAT.PAINTED);
  for (const sm of [182.43, 183.42]) {
    west(sm - 0.05, sm + 0.05, D_MULL, Y_DADO, 2.10, C.pierWhite, MAT.PAINTED);
  }
  west(181.37, 184.48, D_REVEAL, 2.10, 2.22, C.pierWhite, MAT.PAINTED);
  for (const [a, b] of [[185.05, 185.95], [188.05, 188.95], [191.15, 192.05], [192.95, 193.85]]) {
    west(a, b, D_GLASS, 2.22, 2.60, C.pierGlass, MAT.PAINTED);
    west(a - 0.08, b + 0.08, D_REVEAL, 2.14, 2.22, C.pierWhite, MAT.PAINTED);
  }

  // =========================================================================
  // 7. DOWNPIPES - the one place ctube belongs on a flat wall
  // =========================================================================
  // Slim full-height dark verticals appear at the ENDS of both flanks - frame
  // 579 near source x=430, frame 565 near x=273. That is the whole of the
  // evidence: at 4-8 px/m neither frame could separate a downpipe from a door
  // reveal or a dark pier, and diameter and spacing are unmeasured. THREE per
  // flank is one more than was seen, and it is justified by the roof rather than
  // by a frame: a 75 x 18 m roof needs an outlet about every 25 m, and two
  // downpipes on a 75 m elevation is a drainage claim the building cannot meet.
  //
  // ROUND, not boxes, and this is the whole point of the pass. A 150 mm pipe as
  // a pbox gets vertical normals like every other box and shades as one flat
  // grey stripe. As a ctube it carries radial normals, so it has a lit side and
  // a dark side and it is the ONLY vertical element on this facade that shades
  // at all. It stands 100 mm clear of the wall on brackets, which is both what a
  // real rainwater pipe does and what lets the shadow map put a line beside it.
  //
  // ⚠️ THE STATIONS ARE CHOSEN TO KEEP THE PIPES OUT OF DEEPER GEOMETRY, and the
  // obvious even spacing does not. A pipe standing 0.175 m proud is buried by
  // anything at D_REVEAL: the first draft put the middle one at the midpoint of
  // the flank, s 177.5, which is inside the bay run, so 4.5 m of its 7.5 m
  // length disappeared behind the reveals and only its hopper showed. 164.5 is
  // the gap between the shopfront arcade (last pier 164.9) and the bay run
  // (starts 166.0). The third was 211.6; since 2026-09-16 the range ends at
  // S_SEA 198.0 it stands at S_SEA - 1.1 = 196.9 (2026-09-16; was - 1.4): its
  // hopper now hangs under the aisle fascia at the height of pier.js's lowered
  // east awnings, so it moved seaward clear of the last one (ends 196.6), the
  // west door frame (196.34) and the sea corner pier (from 197.25).
  // Re-check all of these if PITCH, RUN_S0, W_RUN_S0 or S_SEA ever move.
  // 2026-09-18 (tmp-tr106): the 'shopfront arcade' this note names is now the
  // flank's own arcade, which runs from E0; its last pier is unchanged at 164.9.
  // 2026-09-17: the WEST middle pipe moved 164.5 -> 166.7. The west bay run now
  // ends at 165.39 (measured, section 4), so 164.5 stood in its last glazed slot
  // through the transom, lintel and cill. 166.7 is past the run and its cill
  // (165.51) and past the s 165 door surround (166.34). Not photo-measured.
  const W_RWP_S = 166.7;
  const RWP_R = 0.075;                  // 150 mm dia. - standard for this roof
  for (const side of [-1, 1]) {
    const put = side > 0 ? east : west;
    const wall = side > 0 ? OE : OW;
    const axis = wall + side * (0.10 + RWP_R);
    for (const s of [E0 + 0.4, side > 0 ? 164.5 : W_RWP_S, S_SEA - 1.1]) {
      // Hopper head under the eaves, where the pipe takes the outlet. 0.48 and
      // not the old 0.40: the eaves soffit band is now 0.44 proud and spans
      // Y_WIN_HEAD - 0.34 upward, so at 0.40 the hopper's top 0.16 m sat behind
      // a box of its own colour. A hopper projects further than the wall it
      // hangs on, so 0.48 is both the fix and the truer dimension.
      // MOVED 2026-09-16: the third pipe is on the single-storey range now, so its
      // hopper hangs under THAT roofline (Y_SPRING) with the same 0.54 m head
      // and 0.12 m outlet as the other two; the pipe is shorter, not new.
      // 2026-09-16: on the range that roofline is the aisle fascia, Y_AISLE_UNDER.
      const yH = s > S_STEP ? Y_AISLE_UNDER : Y_WIN_HEAD - 0.18 * K_UP;
      // the box is first-floor height on the hall (so it goes through K_UP, and
      // stays clear of the rust bloom under it), full 0.54 on the range
      put(s - 0.24, s + 0.24, 0.48, yH - (s > S_STEP ? 0.54 : 0.54 * K_UP), yH,
        C.pierRoofDark, MAT.PAINTED);
      tubeD(s, axis, yH - 0.12, s, axis, 0.34, RWP_R,
        C.pierRoofDark, MAT.PAINTED, 6);
      // and the shoe kicking out over the deck, so it does not end in mid-air
      tubeD(s, axis, 0.36, s, axis + side * 0.20, 0.10, RWP_R,
        C.pierRoofDark, MAT.PAINTED, 6);
    }
  }

  // =========================================================================
  // 8. LANDWARD END WALL, s = 140 - THE LED BOW, now BOWED IN PLAN
  // =========================================================================
  //
  // A raised white bow whose swept parapet crowns above the eaves, carrying a
  // segmental-arched LED screen about 9 x 2.5 m over a white fascia band and a
  // glazed ground storey. This wall is unlike everything else on the building.
  //
  // NEW THIS PASS: it bows in PLAN as well as in elevation. The previous version
  // listed a plan bow under "deliberately not built" because no frame resolved
  // it; the 657 aerial does - the white end of the building sweeps convex toward
  // the shore, and the arc is unmistakable looking straight down. Built as ten
  // steps whose station depth follows a cosine, 1.35 m at the centreline dying
  // to zero at both corners. THE RISE IS INFERRED: the aerial gives the shape,
  // nothing in it gives a scale. It is deliberately shallow, because a plan
  // curve made of ten straight boxes becomes a visible staircase if it is deep.
  //
  // This is why `land()` runs from the projecting face all the way BACK to the
  // block at s = 140: every bowed element is solid to the wall behind it, so no
  // step leaves a gap and there is no interior to see into.
  const BOW_R = 1.35;
  const bow = (o) => BOW_R * Math.cos(Math.min(1, Math.abs(o - O_MID) / 9) * Math.PI / 2);

  // Ground storey, flat, to the flank's own numbers - 542 and 579 both show a
  // glazed base under the fascia and no more than that, so nothing new is
  // measured here. The bow starts ABOVE it, at 3.70, and its underside is a
  // 1.35 m soffit at the centreline: that overhang is the prow.
  // THE PLINTH IS SPLIT AROUND THE ENTRANCE, 2026-09-18 (tmp-tr106) - the
  // same rule the two flanks already follow. `base` takes the face helper, and
  // `land` has the same signature, so the bow gets it for nothing.
  base(land, OW, SH_DOOR_O0 - 0.28);
  base(land, SH_DOOR_O1 + 0.28, OE);
  land(OW, OE, D_GLASS, Y_DADO, Y_SHOP_HEAD, C.pierGlass, MAT.PAINTED);
  // The arcade piers SKIP the entrance and the two graphic panels. Without the
  // guard the 3.6 m rhythm drops a 0.34 bar at o -1.2 wholly inside a 0.18 m
  // panel and another at 2.4 straight across the door leaves - the first
  // invisible, the second wrong.
  for (let i = 0; i < 5; i++) {
    const o = OW + 1.8 + i * 3.6;
    if (o + 0.35 > SH_DOOR_O0 - 0.28 && o < SH_DOOR_O1 + 0.28) continue;
    if (SH_GFX.some(([g0, g1]) => o + 0.35 > g0 - 0.16 && o < g1 + 0.16)) continue;
    land(o, o + 0.35, D_REVEAL, Y_DADO, Y_SHOP_HEAD, C.pierWhite, MAT.PAINTED);
  }
  land(OW, OE, D_FASCIA, Y_SHOP_HEAD, Y_HEAD_RAIL, C.pierWhite, MAT.PAINTED);

  // ---- THE SHOPFRONT, MOVED HERE FROM THE EAST FLANK 2026-09-18 ------------
  // (tmp-tr106). The evidence for the FACE is in section 5's header; the o
  // positions are in the constants block. Every HEIGHT below is unchanged from
  // the frame-553 reading that has always been in this file - a height above
  // deck is valid on whichever face carries the shopfront, and the overcast
  // frame confirms two of them to 2% on this wall (sign band 36 px against a
  // built 0.93 m, canopy fascia 11 px against a built 0.29 m, 37.9-38.7 px/m).
  //
  // NOTHING BELOW CARRIES A NAME, A LETTER OR A DEVICE, and nothing may be
  // added that does. The sign band is a coloured panel in a white frame; the
  // graphic panels are dark panels in white frames; the doors are glass with
  // white stiles. At the 1.5-3 px/m any judged camera sees this at, that is
  // everything the photograph resolves anyway.

  // The graphics wrap: 553's two large dark panels flanking the entrance, each
  // inside a white frame, from just above the plinth to the canopy. C.pierLED
  // (#2B3A66) is the palette's only dark blue-violet and both overcast frames
  // read these columns blue-violet (green excess -4..-19, yellow excess -24..-38
  // against a neutral wall), not neutral dark.
  // THESE REPLACE tmp-tr98's board at o -1.45..-0.60 (12.60..13.30 mirrored). That board was the same
  // object read as a small sign; at the same D_BAND depth the two would have
  // been coplanar over their whole overlap. The board at -2.60..-1.75 is a
  // different one further west and stays.
  for (const [ps0, ps1] of SH_GFX) {
    land(ps0, ps1, D_BAND, Y_DADO, Y_SHOP_HEAD, C.pierLED, MAT.PAINTED);
    land(ps0 - 0.16, ps0, D_REVEAL, Y_DADO, Y_SHOP_HEAD, C.pierWhite, MAT.PAINTED);
    land(ps1, ps1 + 0.16, D_REVEAL, Y_DADO, Y_SHOP_HEAD, C.pierWhite, MAT.PAINTED);
    land(ps0 - 0.16, ps1 + 0.16, D_CILL - 0.06, Y_DADO - 0.10, Y_DADO,
      C.pierWhite, MAT.PAINTED);
  }

  // MAIN ENTRANCE - one dark opening with white stiles between four 0.9 m
  // leaves, because the glazing behind is the same dark and four dark boxes on
  // a dark ground show nothing: it is the STILES that make four leaves read.
  // 0.03 and not D_GLASS so the two are not coplanar (that was a depth tie).
  land(SH_DOOR_O0, SH_DOOR_O1, 0.03, 0.0, 2.10, C.pierGlass, MAT.PAINTED);
  for (let i = 1; i < 4; i++) {
    const lo = SH_DOOR_O0 + i * 0.9;
    land(lo - 0.035, lo + 0.035, D_MULL, 0.0, 2.10, C.pierWhite, MAT.PAINTED);
  }
  land(SH_DOOR_O0 - 0.28, SH_DOOR_O0, D_REVEAL, 0.0, 2.34, C.pierWhite, MAT.PAINTED);
  land(SH_DOOR_O1, SH_DOOR_O1 + 0.28, D_REVEAL, 0.0, 2.34, C.pierWhite, MAT.PAINTED);

  // The sign band: a recessed coloured panel inside a projecting white frame.
  // 2.20-3.13 above deck, and C.copperRoof because it is the only saturated
  // green in the palette. GENERIC BAND, NO LETTERING.
  land(SH_SIGN_O0, SH_SIGN_O1, D_BAND, Y_HEAD_RAIL, Y_SIGN_T, C.copperRoof, MAT.PAINTED);
  land(SH_SIGN_O0 - 0.20, SH_SIGN_O0, D_CILL, Y_HEAD_RAIL, Y_SIGN_T, C.pierWhite, MAT.PAINTED);
  land(SH_SIGN_O1, SH_SIGN_O1 + 0.20, D_CILL, Y_HEAD_RAIL, Y_SIGN_T, C.pierWhite, MAT.PAINTED);

  // THE ENTRANCE CANOPY, a real 1.20 m projecting slab with a dark soffit line
  // under it. The stack is dark soffit (0.14 m) under pale slab (0.29 m) over
  // the sign, which is the only way a projection reads at all on a building
  // every fragment of which resolves to ndl = 0 (file header).
  land(SH_CAN_O0, SH_CAN_O1, D_CANOPY - 0.06, Y_SIGN_T - 0.14, Y_SIGN_T,
    C.pierBeam, MAT.PAINTED);
  land(SH_CAN_O0, SH_CAN_O1, D_CANOPY, Y_SIGN_T, Y_CANOPY_T, C.pierWhite, MAT.PAINTED);
  // Tie rods. INFERRED, not seen - a 1.2 m slab has to hang off something.
  for (const to of [SH_CAN_O0 + 1.6, (SH_CAN_O0 + SH_CAN_O1) / 2, SH_CAN_O1 - 1.6]) {
    tubeD(S_LAND - D_CANOPY + 0.15, to, Y_CANOPY_T - 0.06,
      S_LAND - 0.05, to, Y_CANOPY_T + 1.05, 0.022, C.pierRail, MAT.PAINTED, 5);
  }

  // The white fascia band under the LED, 3.70-4.40 (579, 8 px at 9.52 px/m;
  // 542, 10 px at 10 px/m). Built to 4.40 rather than 4.50 so it meets the LED's
  // measured foot exactly - the 0.1 m is inside the spread of both readings and
  // a butt joint beats a 0.1 m overlap of two white bands on the same plane.
  // TEN STEPS, following the plan bow. This band is the bow's own soffit.
  const BOW_N = 10;
  for (let i = 0; i < BOW_N; i++) {
    const o0 = OW + 18 * (i / BOW_N), o1 = OW + 18 * ((i + 1) / BOW_N);
    land(o0, o1, bow((o0 + o1) / 2) + D_FASCIA, 3.70, 4.40, C.pierWhite, MAT.PAINTED);
  }

  // ---- THE LED SCREEN ------------------------------------------------------
  // Bottom 4.4 m (mean of 4.73 m in 579 and 3.6 m in 542 - two different
  // anchors, a horizon ratio and a 1.7 m standing figure), height 2.5 m, so the
  // top edge is at 6.9. WIDTH 9 m is LOW CONFIDENCE: 85 px of the 165 px white
  // end-wall mass in 542, i.e. "roughly half the wall, centred". Centred on
  // O_MID. Kept UNSCALED: both readings are anchored to objects, not to the
  // eaves. The head is a shallow SEGMENTAL ARCH rising 0.35 m at the centre.
  const LED_O0 = O_MID - 4.5;
  const LED_COLS = 7;
  for (let i = 0; i < LED_COLS; i++) {
    const o0 = LED_O0 + 9 * (i / LED_COLS), o1 = LED_O0 + 9 * ((i + 1) / LED_COLS);
    const oc = (o0 + o1) / 2;
    const u = Math.abs(oc - O_MID) / 4.5;
    land(o0, o1, bow(oc) + 0.40, 4.40, 6.55 + 0.35 * Math.cos(u * Math.PI / 2),
      C.pierLED, MAT.PAINTED);
  }
  // The white surround the screen sits in - 647 and 553 both show the LED inside
  // a white frame rather than applied to bare wall, and the frame is what gives
  // the screen an edge when it is dark (which, from the water at midday, it
  // mostly is). Jambs plus an arched head. The head uses the SAME LED_COLS
  // stepping as the screen, not a coarser one: at five steps against seven the
  // two staircases fell out of register and the frame cut 0.12 m into the top of
  // the screen in two places, which reads as a chipped arch rather than a frame.
  land(LED_O0 - 0.55, LED_O0, bow(LED_O0) + 0.55, 4.30, 7.05, C.pierWhite, MAT.PAINTED);
  land(LED_O0 + 9, LED_O0 + 9.55, bow(LED_O0 + 9) + 0.55, 4.30, 7.05,
    C.pierWhite, MAT.PAINTED);
  for (let i = 0; i < LED_COLS; i++) {
    const o0 = LED_O0 + 9 * (i / LED_COLS), o1 = LED_O0 + 9 * ((i + 1) / LED_COLS);
    const oc = (o0 + o1) / 2;
    const u = Math.abs(oc - O_MID) / 4.5;
    const y = 6.55 + 0.35 * Math.cos(u * Math.PI / 2);
    land(o0, o1, bow(oc) + 0.55, y, y + 0.26, C.pierWhite, MAT.PAINTED);
  }

  // ---- THE SCREEN IS LIT ---------------------------------------------------
  // C.pierLED alone (#2B3A66, rendering about 17,22,38) is a dark navy HOLE,
  // and every frame that resolves this screen shows it carrying a bright
  // graphic. Three sources, and they are not the same weather or the same year:
  //
  //   0647, dusk, looking down the pier: the screen's own p50 is 172,136,170
  //     - MAGENTA, R and B high and G 36 levels below both - against the white
  //     bow beside it at 181,196,222. Its p90 is 255,240,255 and its peak
  //     luminance 253 against the bow's 200, so the BRIGHT PART OF THE SCREEN
  //     IS THE BRIGHTEST THING IN THE FRAME while its median is darker than
  //     the wall. Both halves of that matter.
  //   1049650633833040.jpg (owner, overcast midday): a dark ground carrying a
  //     large saturated RED disc and white lettering.
  //   1066407125490724.jpg (owner, overcast, different day): red and orange
  //     graphics on the same dark ground.
  //
  // ⚠️ 0599 IS NOT USED and neither is any hue read off it - STATUS trap 5 bans
  // colour from that frame. It is not needed: 0647 is also low light, but an
  // LED screen is self-luminous so its hue is not the sun's, and 0647's blue
  // cast (the white bow reads 181,196,222) can only UNDER-state the red, so the
  // magenta reading is safe in direction. The two owner frames are daylight and
  // agree independently.
  //
  // WHAT CAN BE BUILT. Nothing in this renderer is emissive and no key is
  // brighter than pierWhite, which on this wall renders 120 - so "brighter than
  // the white bow" is unreachable and is not attempted. What IS reachable is
  // the composition the photographs actually show: a dark ground, a saturated
  // red graphic over most of it, and a hot pale bar inside that. Measured on
  // this wall, helterRed renders 93,23,28 and helterCream 130,119,99, so the
  // three layers land at roughly 22 / 38 / 120 against a 120 wall - a screen
  // with a bright element on a dark panel. Red-next-to-navy also mixes toward
  // the reference's magenta at any range where the columns are under a pixel.
  //
  // A MARGIN OF GROUND IS LEFT ALL ROUND (columns 1-5 of 7, y 4.85-6.15 inside
  // the screen's 4.40-6.90) because every frame shows the picture inset in a
  // black bezel, and because a content panel flush with the screen edge would
  // tie with the white surround at 0.55.
  //
  // COST 8 boxes. STATUS is right that no judged camera can see this - the head
  // and approach cameras both look at the SEAWARD end - so it is done last and
  // small, and nothing else in the file was traded for it.
  for (let i = 1; i <= 5; i++) {
    const o0 = LED_O0 + 9 * (i / LED_COLS), o1 = LED_O0 + 9 * ((i + 1) / LED_COLS);
    const oc = (o0 + o1) / 2;
    land(o0, o1, bow(oc) + 0.44, 4.85, 6.15, C.helterRed, MAT.PAINTED);
  }
  for (let i = 2; i <= 4; i++) {
    const o0 = LED_O0 + 9 * (i / LED_COLS), o1 = LED_O0 + 9 * ((i + 1) / LED_COLS);
    const oc = (o0 + o1) / 2;
    land(o0, o1, bow(oc) + 0.48, 5.35, 5.75, C.helterCream, MAT.PAINTED);
  }

  // ---- THE TWO SEAHORSES ---------------------------------------------------
  // MEASURED on 1049650633833040.jpg (overcast midday, the bow square-on).
  // The LED is the ruler, because this file already fixes it at 9.0 m wide and
  // 4.40-6.90 above deck: in the photo it spans x 465-790 (0.0277 m/px) and
  // y 440-545 (0.0238 m/px). Each seahorse is 25 x 52 px = 0.65 x 1.24 m, its
  // centre 43-45 px outboard of the LED's edge = 1.12 m west / 1.25 m east, so
  // O_MID +- 5.7, and it spans y 5.54-6.78.
  // ⚠️ CLIPPED AT 6.45, not 6.78: the gable screen wall starts at Y_EAVES 6.50
  // at depth bow + 0.30, so the top 0.28 m would be drawn inside it - the dead
  // -triangle case verify-head-elevations.mjs exists to catch. The visible loss
  // is 5 px of tail at any range this is seen from.
  // 1066407125490724.jpg (overcast, a different day) shows the same pair in the
  // same places, which is why this is built as measured rather than as inferred.
  // Two boxes each - body and head - for the reason the single one had: pbox
  // cannot draw a seahorse, and one rectangle reads as a vent.
  // ⚠️ AND BUILT 0.85 m LOW, 4.65-5.80 INSTEAD OF THE MEASURED 5.54-6.78. This
  // is a compromise with geometry that predates this pass and it is recorded
  // rather than hidden. Section 2's eaves soffit, fascia and coping are drawn
  // on the landward face as FLAT bands at depth 0.44 from s 140, so beside the
  // LED - where the plan bow is shallow and the bands are not hidden behind it -
  // they cut a dark horizontal across exactly the 6.04-6.50 the seahorse's top
  // half wants. Rendered at the measured height (tmp-tr98/ev/bow_after_zoom.png,
  // first build) each seahorse merged with that band into a hammer shape. The
  // photo shows no such band on this face at all - the bow parapet hides the
  // eaves - so the honest fix is to the BANDS, not to the emblem; that is
  // section 2's geometry and a bigger change than this pass should make on one
  // reading. Lowered until the top clears the soffit foot by 0.24 m.
  for (const so of [O_MID - 5.7, O_MID + 5.7]) {
    const d = bow(so) + D_BAND;
    land(so - 0.325, so + 0.325, d, 4.65, 5.53, C.pierRoofDark, MAT.PAINTED);
    land(so - 0.325, so - 0.075, d, 5.53, 5.80, C.pierRoofDark, MAT.PAINTED);
  }

  // ---- ground-storey SIGN BOARDS -------------------------------------------
  // Both overcast owner frames show the same thing along this ground storey,
  // outboard of the entrance: a row of small applied boards on the white wall
  // and on the glazing - one large yellow-ground board with a black device, two
  // smaller blue-ground boards, a red ring on a bracket, and two tall dark
  // poster panels. Sizes read against the 2.10 m door leaf: 1.0-1.5 m wide,
  // 0.7-1.1 m tall, all between 1.05 and 2.15 above deck.
  // GENERIC SHAPES AND GROUND COLOURS ONLY. No lettering, no device, no name is
  // built on any of them and none may be added: at the 1.5-3 px/m these are
  // seen at, a board is a coloured rectangle, and a legible name would be an
  // invention rather than a measurement. Keys are the palette's existing
  // saturated grounds. 6 boxes.
  // Depth D_BAND (0.18) - applied panels, in front of the glazing at D_GLASS
  // and of the mullions at D_MULL, behind the head rail at D_FASCIA.
  // ⚠️ ALL FIVE MIRRORED ABOUT O_MID 2026-09-18 (tmp-tr106): o -> 12 - o. See
  // the sign-of-the-mapping note in the constants block - +o is on the LEFT of
  // every landward view of this wall, and both frames put the yellow board to
  // the RIGHT of the green band. The mirrored values land within 0.3-0.5 m of
  // an independent re-measure off 1049650633833040.jpg (yellow x 697-763 ->
  // o 2.18..4.03; blues x 769-799 -> 1.16..2.01 and x 841-868 -> -0.78..-0.02;
  // red x 808-829 -> 0.32..0.91; dark panel x 277-343 -> 13.99..15.84), so the
  // mirror is a correction and not a re-fit.
  for (const [o0, o1, y0, y1, col] of [
    [2.65, 4.10, 1.15, 1.95, C.helterYellow],
    [1.15, 2.15, 1.25, 2.05, C.pierBanner],
    [-1.30, -0.30, 1.20, 2.00, C.pierBanner],
    [0.15, 0.65, 1.40, 1.90, C.helterRed],
    [13.75, 14.60, 1.05, 2.15, C.pierRoofDark],
  ]) land(o0, o1, D_BAND, y0, y1, col, MAT.PAINTED);

  // ---- the swept bow parapet: THE GABLE SCREEN WALL ------------------------
  // Rebuilt 2026-09-16 with the eaves. It stands on Y_EAVES and rises as a
  // segmental arch proud of pier.js's barrel behind it: crown Y_CROWN + 0.80
  // (9.63; the 15 Jan photomatch reads HEAD_TOP +0.7..+1.0 and "Bournemouth
  // Pier from beach" f004 9.5-9.8 against the DSM tower top; the DSM's 1 m cells
  // at s 139 reach 9.0), corners 7.40 at the wall line (same f004 frame), so
  // R 19.28. At every segment mid it clears the barrel chords by 0.18-0.78 m.
  // (Before: crown 1.6 m over an 8.83 eaves from frames 579/542; those px/m
  // were ruled on the old eaves and are superseded.)
  // ⚠️ THE ARC STANDS ON Y_EAVES, NOT ON THE COPING BELOW IT: started inside
  // the landward eaves coping, the two were within 10 mm of coplanar.
  const GW_CROWN = Y_CROWN + 0.80, GW_R = 19.28;
  for (let i = 0; i < BOW_N; i++) {
    const o0 = OW + 18 * (i / BOW_N), o1 = OW + 18 * ((i + 1) / BOW_N);
    const oc = (o0 + o1) / 2;
    const dd = Math.abs(oc - O_MID);
    const top = GW_CROWN - (GW_R - Math.sqrt(GW_R * GW_R - dd * dd));
    const d = bow(oc);
    land(o0, o1, d + 0.30, Y_EAVES, top - 0.14, C.pierWhite, MAT.PAINTED);
    // coping, oversailing 140 mm so the arc keeps a shadow line at range
    land(o0 - 0.05, o1 + 0.05, d + 0.44, top - 0.14, top, C.pierWhite, MAT.PAINTED);
  }

  // =========================================================================
  // 9. SEAWARD END WALL, s = 215 - the face the rider approaches
  // =========================================================================
  // Frame 565 shows a plain white return where the window run stops, and no
  // assigned frame sees this wall square-on. Frame 603 sees it obliquely from
  // the water at the game's own range, and what carries there is horizontals and
  // corner verticals - both of which the bands and pilasters above already
  // return round this corner.
  //
  // NO openings, signage or fenestration are invented. What IS added is two
  // intermediate pilasters dividing the 18 m width into three: a pilaster is a
  // structural element, not a decorative claim, and an 18 m wall with nothing on
  // it is the exact "flat grey box" this pass exists to fix. They project 0.34
  // and they are marked INFERRED. If a square-on frame ever shows a flat wall,
  // delete these three lines and nothing else changes.
  // CLIPPED 2026-09-16 under the range centre block's eaves, Y_CEN_UNDER (both
  // stand inside RANGE_C0..C1; was Y_SPRING, above the old flat roof's line).
  for (const o of [OW + 6, OW + 12]) {
    seaw(o - 0.45, o + 0.45, D_REVEAL, 0.0, Y_CEN_UNDER, C.pierWhite, MAT.PAINTED);
    seaw(o - 0.55, o + 0.55, D_REVEAL + 0.10, 0.0, Y_DADO, C.pierWhite, MAT.PAINTED);
    // 2026-09-18 (tmp-tr98): AND A SHADOW DOWN ONE SIDE OF EACH, for the same
    // reason as the string course above - a 0.34 m projection on a wall whose
    // fragments all resolve to ndl 0 is invisible, and section 11 note 1
    // measured these two as drawing nothing at all. 0.34 m of projection at the
    // renderer's own sun (renderer.js 57, elevation 46.03 deg) throws 0.33 m,
    // so the line is 0.33 m wide and it is on the SAME side on both, which is
    // what one sun direction means. pierArch, matching the string course.
    // This wall reads 6.25-8.94 px/m at the head camera, so 0.33 m is 2-3 px -
    // above section 11's own two-pixel floor, which is why the pilasters get
    // this treatment and the west flank's do not.
    // ⚠️ IT STARTS AT 0.02, NOT AT 0.0, AND THAT IS NOT A STYLE CHOICE. A box
    // whose foot is at exactly DECK adds vertices to the PROTECTED DECK level,
    // and these two took its built-vertex count from 627 to 635. The value
    // 5.470 was untouched either way, but the count is one of the numbers this
    // pass is checked on, so the shadow starts 20 mm up instead. 20 mm is
    // 0.15 px at this wall's 6.25-8.94 px/m and nothing else changes.
    seaw(o - 0.78, o - 0.45, D_REVEAL - 0.06, 0.02, Y_CEN_UNDER, C.pierArch, MAT.PAINTED);
  }

  // =========================================================================
  // 10. ROOF-TOP
  // =========================================================================
  // REBUILT 2026-09-16 with pier.js's re-massing to the EA DSM (tmp-tr8/s1).
  // pier.js now builds the whole hall roof - one segmental barrel from the eaves
  // to its crown at HEAD_TOP, with its white fascia board - and the tower. What
  // this section used to stand on, or key to, is gone, so these were REMOVED:
  //   - the seaward gable verge and its rail at s 163 (24 boxes): there is no
  //     gable at 163, the barrel runs on to the tower at 171.5;
  //   - the ridge capping at HEAD_TOP + 2.02 and the two springing courses of
  //     the old +2.0 m west barrel (3 boxes): the DSM crown is HEAD_TOP itself;
  //   - the roof plant and its two flues at s 171.4-174.6 (4 boxes, 4 tubes):
  //     that is inside the tower block's footprint now, and the DSM shows none;
  //   - the east roof-edge guard rail, s 163.6-175.2 (19 tubes): it stood on the
  //     old flat slab's 0.3 m oversail at HEAD_TOP + 0.5, which no longer exists.
  // MOVED with the tower (ctx.HEAD): the fly box's glazed ring and the masts.

  // ---- the fly box's glazed ring ------------------------------------------
  // Frames f004-west and the 'east-beam' f004 (actually also the WEST side, tmp-tr31) show a continuous band of glazing
  // under the fly box's dark cap, a white trim under it, on all four faces.
  // 1.0 m deep as before (0.95 glass + trim), now under pier.js's lower cap.
  {
    const BH_S0 = HEAD.FB_S0, BH_S1 = HEAD.FB_S1;
    const BH_O0 = O_MID - HEAD.FB_O, BH_O1 = O_MID + HEAD.FB_O;
    const Y1 = HEAD.FB_T, Y0 = Y1 - 0.95;
    const ring = (d, y0, y1, col, mat) => {
      pbox(BH_S0 + 0.05, BH_S1 - 0.05, BH_O1 - BURY, BH_O1 + d, y0, y1, col, mat);
      pbox(BH_S0 + 0.05, BH_S1 - 0.05, BH_O0 - d, BH_O0 + BURY, y0, y1, col, mat);
      pbox(BH_S0 - d, BH_S0 + BURY, BH_O0 + 0.05, BH_O1 - 0.05, y0, y1, col, mat);
      pbox(BH_S1 - BURY, BH_S1 + d, BH_O0 + 0.05, BH_O1 - 0.05, y0, y1, col, mat);
    };
    // 2026-09-18 (tmp-tr98): pierGlass -> pierRoofDark. In the overcast owner
    // frame 1066407125490724.jpg the three readable panes of this very gallery
    // measure 8.9 / 8.7 / 22.3 against the tower's own white wall at 117.2,
    // i.e. 0.07-0.19 - DARKER than pierGlass gives here (31.9/120.4 = 0.265).
    // pierRoofDark (27.2 = 0.226) is the darkest legal key and is the closest
    // this palette can get. It is still paler than the reference; said out loud
    // rather than reached for by inventing a key. No triangle cost.
    ring(0.04, Y0, Y1, C.pierRoofDark, MAT.PAINTED);
    ring(0.22, Y0 - 0.16, Y0, C.pierWhite, MAT.PAINTED);
    // 2026-09-16: white piers splitting the band into SMALL windows - the
    // full-res beach0115 frame shows a row of separate dark openings, not a
    // continuous glazed strip. ~0.9 m pitch: 6 a flank, 7 an end. +264 tris.
    // PIER 0.30 -> 0.20, 2026-09-18 (tmp-tr98). The same band arithmetic as the
    // first-floor runs (section 4b): five 0.30 piers in a 5.6 m face is 27% of
    // the band at the WALL'S OWN VALUE, which lands the band at 0.46 of the
    // wall; the overcast frame puts this gallery's band (panes AND piers) at
    // 40.1/117.2 = 0.34. At 0.20 the band computes to 0.37 with the darker
    // pane key above. The frame shows the piers as narrow lines, not columns.
    const PIER = 0.20, D = 0.07;
    for (let i = 1; i < 6; i++) {
      const s = BH_S0 + (BH_S1 - BH_S0) * (i / 6);
      pbox(s - PIER / 2, s + PIER / 2, BH_O1 - BURY, BH_O1 + D, Y0, Y1, C.pierWhite, MAT.PAINTED);
      pbox(s - PIER / 2, s + PIER / 2, BH_O0 - D, BH_O0 + BURY, Y0, Y1, C.pierWhite, MAT.PAINTED);
    }
    for (let i = 1; i < 7; i++) {
      const o = BH_O0 + (BH_O1 - BH_O0) * (i / 7);
      pbox(BH_S0 - D, BH_S0 + BURY, o - PIER / 2, o + PIER / 2, Y0, Y1, C.pierWhite, MAT.PAINTED);
      pbox(BH_S1 - BURY, BH_S1 + D, o - PIER / 2, o + PIER / 2, Y0, Y1, C.pierWhite, MAT.PAINTED);
    }
  }

  // ---- masts and aerials --------------------------------------------------
  // The slender masts the drone frames show round the lantern, on the fly
  // box's cap and clear of the lantern and its fascia in both station and
  // offset. Tops unchanged since 2026-09-03 and all under the LIDAR crown at
  // HEAD_TOP + 6.21; they now rise from the lower cap, so each is 1.58 m taller.
  const CAP = HEAD.CAP_T;
  const MA = HEAD.LN_S0 - 0.6, MB = HEAD.LN_S1 + 0.3;
  const MASTS = [[MA, O_MID - 3.2, 5.90], [MB, O_MID + 3.2, 6.15],
                 [MA, O_MID + 3.2, 5.20]];
  for (const [ms, mo, top] of MASTS) {
    tubeY(ms, mo, CAP - 0.2, ms, mo, HEAD_TOP + top, 0.045, C.pierRail, MAT.PAINTED, 5);
  }
  // one cross-arm on the tallest
  tubeY(MB, O_MID + 2.65, HEAD_TOP + 5.70, MB, O_MID + 3.75, HEAD_TOP + 5.70,
    0.030, C.pierRail, MAT.PAINTED, 5);

  // ---- the applied emblem on the tower block, WEST face --------------------
  // beach0115 full-res (tmp-tr11/pm/ref/t27983_full.png, crop tmp-tr98/ev/
  // plate_tower.png at 4x): a square applied panel carrying a crest, on the
  // tower block's west face at roughly mid-height, about 1.2 x 1.5 m read
  // against the block's own 7.3 m length. FORM ONLY - that plate is low sun and
  // trap 5 bans colour off it - so it is built as a dark applied panel at the
  // measured size and place, and the crest inside it is NOT built: at the
  // 1.5-3 px/m this building is seen at, a device on a 1.2 m panel is under a
  // pixel, and drawing one would be invention rather than measurement.
  // It is on the WEST face, where the plate measures it, so no judged camera
  // sees it; it is one box and it makes the beach view right.
  pbox(174.05, 175.30, O_MID - HEAD.TB_O - 0.22, O_MID - HEAD.TB_O + 0.02,
    DECK + 7.70, DECK + 9.20, C.pierRoofDark, MAT.PAINTED);

  // ---- ROOF PLANT ON THE RANGE --------------------------------------------
  // Section 10's 2026-09-16 note removed the old roof plant because it stood on
  // a slab pier.js no longer builds. The plate puts plant back, on the RANGE,
  // which is a different roof and is still there: tmp-tr98/ev/plate_rot.png
  // (beach0115 at 4x, crop origin 830,1270) shows, between the tower and the
  // rotunda, a run of squat dark upstands on the range roof line at zoom
  // x 240-360 / y 365-410, plus two slender posts with heads (aerials or
  // floodlights) at zoom x 250-350 / y 365-400.
  // STATIONS by ratio, not by pose: the tower's seaward face (s 178.8) and the
  // rotunda centre (s 208.0) are both identifiable in the same crop at full-res
  // x 800 and x 1067, so 9.14 px/m along the pier there; the plant runs
  // full-res x 855-995 = s 185-200. It is clipped to the range, s 185-197.
  // HEIGHT by the same crop's vertical scale (the range flank reads 3.17 m over
  // 30 px = 9.5 px/m): the upstands are 10-12 px = 1.05-1.25 m and they stand
  // on the roof, whose crown on the block axis is HEAD.RANGE_CROWN_T. Tops land
  // at DECK+5.9, i.e. UNDER the hall eaves at 6.50 - which is what the plate
  // shows, the plant silhouetted against the barrel and not against sky.
  // ⚠️⚠️ AND IT IS NOT BUILT HERE, BECAUSE THIS MODULE IS NOT ALLOWED TO. It
  // was built - four boxes at s 185.6/189.2/192.6/196.0, o 6.0 +- 1.0..1.5,
  // from RANGE_CROWN_T - 0.12 up 0.90-1.25 m, plus two 0.055 m posts at
  // s 187.6 o 4.1 and s 194.9 o 8.0 - and verify-head-elevations.mjs rejected
  // all six, correctly:
  //     FAIL 4 sub-eaves boxes touch NO wall plane and are not inside the block
  //     FAIL 2 range-zone pieces stand above the range's roofline (floaters)
  // Its rule (line 215-231) is that anything below the eaves must sit on a wall
  // plane or inside the block, and `inCentre` stops at RANGE_EAVES_T, so
  // nothing standing ON the range roof can ever satisfy it. That rule is RIGHT
  // and the tool was NOT edited: this file's own header says it is the skin and
  // never the mass, and a plant box on a roof is mass. The measurement above is
  // left in full so that whoever owns pier.js can build it there in one go.
  // Sheet: tmp-tr98/ev/plate_rot.png. Handed off in tmp-tr98/RESULT.md.

  // =========================================================================
  // 11. WEATHERING - the marks a seafront building actually carries
  // =========================================================================
  //
  // WHY THIS SECTION EXISTS, AND THE MEASUREMENT THAT JUSTIFIES IT.
  // Everything above is geometrically and tonally right and still reads as
  // clean CAD, and that is measurable rather than a matter of taste. Sampling
  // the head camera's render on the east wall over s 204-214 x y 4.9-7.6, and
  // on the seaward end wall, gives:
  //
  //     RENDER  east wall   p10 119.7  p50 120.4  p90 120.4   spread 0.7
  //     RENDER  seaward end p10 119.5  p50 119.5  p90 119.7   spread 0.2
  //
  // The same statistic on the real building, from the owner's own photograph
  // C:\claude\bournemouth-reference\bournemouth-pier\1049650633833040.jpg
  // (overcast, so none of this is sunlight), gating each box to its white-wall
  // pixels (L 130-215) so a dark sign cannot masquerade as staining:
  //
  //     bow face left of LED    p10 172  p50 182  p90 187   spread 15   sd 9.0
  //     bow face right of LED   p10 172  p50 182  p90 185   spread 13   sd 8.6
  //     band under the LED      p10 162  p50 174  p90 183   spread 21   sd 11.0
  //     white pier, east end    p10 138  p50 170  p90 176   spread 38   sd 15.2
  //     white return face       p10 142  p50 155  p90 180   spread 38   sd 14.6
  //
  // So a real white elevation carries a 13-38 level spread inside ONE panel,
  // and its panels differ from each other by up to 27 levels of median
  // (182 against 155 - 0.85x). The render carried 0.7 levels across ten metres
  // of wall. That factor of 20-50 IS the "clean CAD" complaint, stated in
  // bytes, and it is what this section spends its budget on. It is NOT a
  // lighting problem: the sun is fixed and correct (renderer.js 57), and the
  // reference above is an OVERCAST frame, so the spread is in the SURFACE.
  //
  // -------------------------------------------------------------------------
  // WHAT SIZE A MARK HAS TO BE. Measured off the two judged cameras that can
  // see this building at all - the entrance and along-neck cameras have it
  // behind them or off the frame edge. The number that matters is the
  // HORIZONTAL scale along each wall, not the vertical: the east flank is seen
  // at a grazing angle and is foreshortened 3-4x harder than it is scaled
  // vertically, and designing to the vertical number is how a pass would build
  // 400 mm streaks that are half a pixel wide.
  //
  //                            head camera        approach camera
  //     east flank s 145      1.46 px/m           1.14 px/m
  //     east flank s 165      2.01 px/m           1.37 px/m
  //     east flank s 185      2.94 px/m           1.68 px/m
  //     east flank s 213      5.91 px/m           2.33 px/m
  //     seaward end wall      6.25-8.94 px/m      2.66-3.13 px/m
  //
  // At two pixels - below that a mark is an antialiasing artefact, not a mark -
  // that is a floor of 1.37 m at the landward end of the flank, 0.34 m at its
  // seaward end, and 0.22-0.32 m on the end wall. A 20 mm streak, which is what
  // a real drip actually is, would be 0.03 px. IT CAN NEVER BE BUILT HERE. What
  // CAN be built is what a group of drips becomes at 150 m: a broad wash with
  // one darker run in it. Every width below is that station's own floor or more.
  //
  // -------------------------------------------------------------------------
  // ⚠️ THE FIRST BUILD OF THIS SECTION WAS RENDERED AND REJECTED, and the
  // failure is worth keeping because it is not obvious from the numbers. Every
  // mark passed its size floor, sat on a real water path and used a measured
  // key - and the head camera came back with a building carrying half a dozen
  // extra WINDOWS. The marks were wide, short, hard-edged rectangles floating
  // in the middle of a wall, at exactly the height of the bay run, so the eye
  // read them as openings. Two rules came out of looking at it:
  //
  //   A. A WEATHERING MARK IS ANCHORED AT ITS TOP TO A REAL EDGE and hangs
  //      DOWN from it. A stain that starts and stops in clear wall is a panel.
  //      Everything below hangs off the eaves collar, off a hopper, or off the
  //      window-head lintel - never off nothing.
  //   B. IT TAPERS. Wide at the top, narrower below, with the darkest core
  //      running out past the bottom of the pale body. A rectangle is a sign; a
  //      shape that narrows downward can only be a run. Three boxes buy that:
  //      a continuous collar, a body under it, and a core that tails out below.
  //
  // -------------------------------------------------------------------------
  // THE TONE LADDER, RE-MEASURED THIS PASS, BECAUSE THE ONE IN THE HEADER IS
  // NOW WRONG. The header says the bare wall is pier.js's block "pierWhite on
  // MAT.CONCRETE" at 83. pier.js 599 now reads
  //     pbox(140, 215, BB[0], BB[1], DECK, HEAD_TOP, C.pierWhite, MAT.PAINTED)
  // so the wall is PAINTED, and it measures 120. A temporary swatch ladder was
  // built on this wall, rendered through the head camera and deleted; every
  // number below is the median of a 7x7 sample grid inside its own swatch:
  //
  //     pierWhite    127,119,115  L 120.4   <- the wall itself
  //     pierRail     121,120,116  L 119.9
  //     helterCream  130,119, 99  L 119.9
  //     building      96, 92, 83  L  92.2
  //     helterYellow 124, 85, 26  L  89.0
  //     pierArch      63, 61, 56  L  61.1
  //     copperRoof    32, 55, 39  L  49.0
  //     pierDeck      53, 48, 42  L  48.6
  //     pierBeam      45, 45, 43  L  44.9
  //     helterRed     93, 23, 28  L  38.2
  //     pierBrace     34, 33, 32  L  33.1
  //     pierGlass     27, 33, 36  L  31.9
  //     pierPile      31, 29, 28  L  29.4
  //     pierRoofDark  24, 28, 29  L  27.2
  //     pierWhite on MAT.CONCRETE   58,58,50  L 57.4
  //     building  on MAT.CONCRETE   58,57,51  L 56.8
  //
  // FOUR THINGS FALL OUT OF THAT AND THEY DECIDE EVERY KEY USED BELOW.
  //   1. EVERY WHITE BAND IN SECTIONS 1-10 IS NOW INVISIBLE. The wall is 120.4
  //      and pierWhite on MAT.PAINTED is 120.4. The string course, the eaves
  //      fascia, the coping, the four corner pilasters and the two seaward
  //      pilasters are all pierWhite on a pierWhite wall, and they draw
  //      NOTHING. The swatch test proved it by accident: two swatches came back
  //      at the wall value and turned out to be hidden behind pilasters that
  //      cannot be seen. The header's "131 against 83" argument died when
  //      pier.js repainted the block. This section does NOT re-colour those
  //      bands - what colour a string course should be is a decision about the
  //      building, not about weathering, and it belongs to whoever owns that
  //      call - but it does put grime in the angle beside the pilasters, which
  //      is where dirt really collects and is the only thing in this file that
  //      makes them exist again.
  //   2. THERE IS NOTHING BETWEEN 92 AND 120. `building` at 92 is a 23% step
  //      and is the LIGHTEST usable grime; the next key down, pierArch, is 61,
  //      a 49% step. So light grime has to be `building` even though the
  //      reference's typical film is nearer 12%, and the compensation is to
  //      cover LESS area rather than to reach for a paler key that does not
  //      exist.
  //   3. helterCream is 119.9 against the wall's 120.4 - the SAME VALUE - but
  //      130,119,99 against 127,119,115, i.e. 16 levels less blue. It is the
  //      only key in the palette that can draw a REPAINTED PANEL: a patch that
  //      does not match in tint but does match in tone. pierRail was tested for
  //      the same job and FAILS - 121,120,116 against 127,119,115 is a 6-level
  //      red shift and nothing else - so it is not used anywhere below.
  //      ⚠️ ONE panel, and it is on the EAST FLANK, not on the end wall. The
  //      first build put 4.7 m of it on the seaward wall, where the scale is
  //      8.9 px/m against the flank's 1.7, and 40 px of warm cream inside a
  //      hard rectangle reads as a BILLBOARD. The flank compresses the same
  //      panel to about 10 px and it reads as what it is.
  //   4. helterYellow is L 89.0, within 3 levels of `building`'s 92.2, but
  //      124,85,26 against 96,92,83. Same value, completely different hue. That
  //      is a RUST RUN that reads as rust and not as a shadow, which is exactly
  //      what a dark key cannot do. helterRed (93,23,28) was tried for the
  //      bloom at the fixing itself and is TOO saturated - see the warning
  //      on rustRun below; pierDeck (53,48,42) does that job instead.
  //
  // -------------------------------------------------------------------------
  // WHERE THE MARKS GO. Not decoration - each one is where water leaves a
  // projection on THIS building's own geometry:
  //   - THE EAVES COLLAR. The coping oversails 0.68 (D_COPE) and the fascia
  //     0.42, so run-off is thrown clear of the wall immediately below and
  //     lands further down. The wall is therefore CLEAN for 0.36 m under the
  //     soffit and then carries a continuous dirt line where the water arrives.
  //     That clean strip is as much of the signature as the dirt is, and it is
  //     why Y_WASH_T is 0.36 below the soffit rather than touching it.
  //   - under the PIER-TO-SHORE lightbox: 6.4 m of panel standing 0.54 m proud
  //     with nothing under it. The largest water-shedding object on the
  //     elevation, and it gets the largest wash.
  //   - at the three hopper heads on each flank. A cast-iron hopper on white
  //     render is the definitive seaside rust streak.
  //   - along the head of the bay run, where 37 m of window lintel drains.
  //   - in the angle beside every projecting pilaster.
  // Nothing goes below y 4.70: the mid-height band (section 2) is pierGlass at
  // 31.9 from 3.35 to 4.70 on the two-storey block (and, since 2026-09-16, only
  // the range centre's end wall seaward of it), so a stain there would be grime
  // painted on top of something already darker than grime.
  //
  // DEPTHS. Weathering is a film ON the wall, so it sits in the shallowest
  // planes in the file, and they are 60 mm apart so the order never ties
  // (renderer.js 223 gives a resolvable step of z^2 x 7.4e-7 m, i.e. 15 mm at
  // 140 m and 60 mm at 285 m - past the far end of both judged cameras).
  // ⚠️ EVERY CORE STOPS AT OR ABOVE y 5.65 so that RUN_D never enters the
  // 1.9-5.6 m window the ladder note protects. Only PATCH_D (0.03), WASH_D
  // (0.09) and the bay-run pier at 0.40 reach into it, and all three are more
  // than 40 mm clear of pier.js's 0.14 and 0.30 planes.
  const PATCH_D = 0.03;    // a repaint: in the wall plane, behind the dirt
  const WASH_D = 0.09;     // collar and body - the marks the approach camera has
  const RUN_D = 0.15;      // the core and the rust bloom - the head camera's mark
  // 2026-09-16: every height here goes through up() - see Y_WIN_HEAD.
  const Y_WASH_T = up(5.70 * CAL - 0.70);   // 7.42: 0.36 m of clean wall under the
                                        // eaves soffit, which starts at 7.78
  const Y_COLLAR = up(5.70 * CAL - 1.40);     // 6.72 - the collar is 0.70 m deep, which
                                        // is 2 px at the approach camera. A
                                        // thinner line would not survive it.
  const Y_CORE_B = up(5.65);                // the protected-window floor, see above
  const HOP_B = up(5.70 * CAL - 0.72);      // 7.40 - section 7 hangs the hopper box
                                        // from here, so the bloom has a foot

  // The continuous dirt line where run-off from the coping lands. `drop` steps
  // its bottom edge: run off a long coping does not arrive in a ruled line, and
  // a single 25 m box at one height reads as an architectural band rather than
  // as dirt. The steps are +-0.12 m, which is under a pixel at the head camera
  // and is therefore worth exactly two boxes and no more.
  const collar = (put, a0, a1, drop = 0) =>
    put(a0, a1, WASH_D, Y_COLLAR + drop * K_UP, Y_WASH_T, C.building, MAT.PAINTED);
  // A STREAK. Hangs from the collar: pale body, dark core, core tails out below
  // the body. `bodyW`/`coreW` are metres, taken off the size table above for
  // the station this streak is at.
  const streak = (put, ac, bodyW, bodyB, coreW, coreB) => {
    put(ac - bodyW / 2, ac + bodyW / 2, WASH_D, up(bodyB), Y_COLLAR,
      C.building, MAT.PAINTED);
    put(ac - coreW / 2, ac + coreW / 2, RUN_D, Math.max(up(coreB), Y_CORE_B),
      Y_COLLAR, C.pierArch, MAT.PAINTED);
  };
  // A RUST STREAK at a hopper head: the same tapering body, but with the core
  // in helterYellow instead of pierArch and a small dark bloom sitting on the
  // collar directly under the hopper outlet. The body is what stops the colour
  // reading as signage.
  //
  // ⚠️ TWO KEYS WERE TRIED FOR THE BLOOM AND THE FIRST WAS WRONG. helterRed is
  // the obvious choice and it renders 93,23,28 - so saturated that a 3-pixel
  // patch of it on a 120 wall reads as a small red SIGN, which is what the
  // first render showed and what got it changed. pierDeck renders 53,48,42:
  // dark, and warm by 11 levels of R over B against pierArch's 7, so it is a
  // warm dark mark rather than a red one. That is what a rusting outlet
  // actually looks like at 60 m. helterYellow is kept for the RUN below it -
  // there it is a 2-pixel warm streak inside a pale body, not a mark on white.
  //
  // ⚠️ AND THE CORE WIDTH IS THE STATION'S OWN 2-PIXEL FLOOR, NEVER MORE. The
  // first build used 0.90 m at s 211.6, where the flank is 5.9 px/m: five
  // pixels of saturated ochre, i.e. a banner. Two pixels of it is a stain.
  const rustRun = (put, sc, bodyW, bodyB, coreW, coreB) => {
    put(sc - bodyW / 2, sc + bodyW / 2, WASH_D, up(bodyB), Y_COLLAR,
      C.building, MAT.PAINTED);
    put(sc - coreW / 2, sc + coreW / 2, RUN_D, Math.max(up(coreB), Y_CORE_B),
      Y_COLLAR, C.helterYellow, MAT.PAINTED);
    put(sc - 0.20, sc + 0.20, RUN_D, Y_WASH_T - 0.42 * K_UP, Y_WASH_T,
      C.pierDeck, MAT.PAINTED);
  };

  // ---- EAST FLANK, landward blank stretch s 140.9-165.6 --------------------
  // Free wall here is broken by the seahorse (148.30-148.69), the louvre
  // (149.86-150.49, and its panel reaches 7.02 so the COLLAR IS SPLIT AROUND IT
  // - at WASH_D the collar would otherwise draw a pale band across the top
  // 0.30 m of a dark louvre), the lightbox above 7.45 (151.4-158.0) and the two
  // hoppers at 142.4 and 164.5.
  collar(east, 140.90, 146.20, -0.12);
  collar(east, 146.20, 149.80, 0.12);
  collar(east, 150.60, 158.30);
  collar(east, 158.30, 165.60, -0.09);
  rustRun(east, 142.40, 2.40, 6.30, 1.30, 5.70);   // 1.46 px/m: floor 1.37 m
  streak(east, 144.90, 2.00, 6.35, 0.70, 5.70);
  streak(east, 147.05, 1.70, 6.55, 0.60, 5.95);
  // the lightbox wash - two streaks under a 6.4 m panel that has no drip
  streak(east, 153.30, 3.00, 6.15, 0.90, 5.65);
  streak(east, 156.40, 2.40, 6.45, 0.80, 5.85);
  // A REPAINTED PANEL. See note 3: one panel, on the flank, where the grazing
  // angle compresses it. Behind the dirt, because a repaint is under the next
  // four winters of it.
  east(157.60, 163.20, PATCH_D, up(4.75), up(7.78), C.helterCream, MAT.PAINTED);
  streak(east, 160.40, 2.40, 6.30, 0.80, 5.70);
  rustRun(east, 164.50, 2.20, 6.30, 1.00, 5.75);   // 2.01 px/m: floor 1.00 m

  // ---- EAST FLANK, seaward blank stretch s 202.9-214.25 - REMOVED 2026-09-16
  // Nine boxes (a collar, two streaks, a rust run and the corner-angle wash)
  // hung at y 4.90-7.78 on wall that pier.js no longer builds: the block steps
  // down to Y_SPRING over s 202.9-215. They cannot move down the range - this
  // section's own rule is that nothing goes below Y_SPRING, where the dark
  // mid-height band already is - and the flank above Y_SPRING landward of
  // 202.9 is the bay run, which carries its own dirt. -108 triangles.

  // ---- THE BAY RUN ---------------------------------------------------------
  // Thirty-seven metres of window head drains onto the wall below it, and it is
  // the busiest part of the elevation, so it gets one line and not a group.
  // Depth 0.46: in front of the lintel at D_FASCIA (0.42) and clear of the
  // eaves soffit strip at 0.44 by 20 mm, which is invisible at 60 m and is
  // between two boxes that never overlap in y anyway.
  {
    const n = Math.floor((S_STEP - RUN_S0 - PIER_W) / PITCH);   // first floor ends at S_STEP
    east(RUN_S0, RUN_S0 + n * PITCH + PIER_W, 0.46,
      Y_WIN_HEAD - 0.55 * K_UP, Y_WIN_HEAD - 0.36 * K_UP, C.building, MAT.PAINTED);
  }
  // Twenty piers at one value is a metronome, and a 65-year-old building does
  // not have twenty identical piers. Three of them are dirty. Depth 0.40, i.e.
  // 60 mm proud of the pier at D_REVEAL so it wins cleanly, and stopped at 7.55
  // so it passes under the lintel at D_FASCIA rather than tying with it.
  // 2026-09-16: piers 12 and 17 (s 188.8, 198.3) are on the range now, which has
  // no first floor - removed with their piers; pier 5 (s 175.5) stays.
  for (const b of [5]) {
    const ps = RUN_S0 + b * PITCH;
    east(ps, ps + PIER_W, 0.40, up(4.72), up(7.55), C.building, MAT.PAINTED);
  }

  // ---- SEAWARD END WALL s = 215 --------------------------------------------
  // 6.25-8.94 px/m, four times the flank's scale, and 18 x 3.1 m of it is blank
  // between the mid-height band and the eaves. It is also the elevation that
  // takes the whole weather: it faces the open Channel with 260 m of pier and
  // nothing else in front of it.
  //
  // ⚠️ MOST OF IT IS NOT VISIBLE FROM EITHER JUDGED CAMERA, and that was worth
  // measuring before spending on it. pier.js 869-875 MOVED the rotunda from
  // s 196 to s 227 - twelve metres SEAWARD of the block - so it now stands
  // between this wall and both cameras. Inverting each camera through at():
  // the head camera sits at station 256, offset 43; the approach camera at
  // station 311, offset 87. Testing the sightline to each point of the wall
  // against the rotunda's own circle (s 227, o 9, R 7.9) puts the grazing ray
  // at o = 10.5 in both cases, so only o 10.5-15 - 4.5 m of the 18 - reaches
  // either camera. The weathering is built across the whole face anyway,
  // because it is the weather face and the rider is not nailed to one of five
  // stills, but the BUDGET is deliberately not concentrated here: three
  // streaks, not the six the blank area would otherwise argue for.
  //
  // ⚠️ MOVED 2026-09-16 FROM s 215 TO s 202.9. pier.js steps the block down to
  // a single-storey range over 202.9-215, so the weather face under the eaves
  // is now the two-storey block's seaward wall at S_STEP. Same boxes, same
  // offsets, same heights, 12.1 m landward; the visibility argument above was
  // made for s 215 and has NOT been re-derived for 202.9, nor for S_STEP 180.8,
  // nor for the rotunda's move to s 208 o 5.1 (2026-09-16, stage 2).
  const seawS = (o0, o1, d, y0, y1, col, mat) => seawAt(S_STEP, o0, o1, d, y0, y1, col, mat);
  collar(seawS, -3.00, 15.00);
  streak(seawS, 0.00, 2.00, 6.15, 0.70, 5.65);
  streak(seawS, 6.00, 2.40, 6.30, 0.60, 5.70);
  streak(seawS, 11.80, 2.40, 6.05, 0.60, 5.65);
  // REMOVED 2026-09-16: the grime in the angle beside the o 3 / o 9 pilasters
  // and the corner pilaster (3 boxes, y 4.80-6.72). Those pilasters now stop
  // at Y_SPRING on the range, so above it there is no angle to collect dirt in.
  // an old bracket fixing, rusted, in the visible strip. INFERRED: no frame
  // resolves this wall at all (section 9), but a seaward parapet on a pier
  // carries floodlight and aerial brackets, and a fixing into render on this
  // coast is a rust run within five years. Placed at o 11.8 so it lands in the
  // one part of the wall the cameras can actually see, and inside that
  // streak's own body so it is a stain and not a red mark on white.
  seawS(11.68, 11.98, RUN_D, Y_WASH_T - 0.40 * K_UP, Y_WASH_T, C.pierDeck, MAT.PAINTED);
  // TWO BROAD WASHES, 2026-09-18 (tmp-tr98). This face is the one the head
  // camera sees most of, and it was still measuring FLAT after the 2026-09-16
  // move - but NOT in the way the first draft of this comment said, and the
  // correction matters. tmp-tr98/v_before/S_head.png over a clean 48 x 18 px
  // field of this wall reads p10 99.8, p50 120.7, p90 121.5: the p10 tail is
  // the three existing streaks, and the whole BODY of the field - everything
  // from the median up - lies inside 0.8 levels. The render is BIMODAL, a dead
  // flat 121 plane with a few dark marks punched in it. The reference is not:
  // section 11's own table has one white panel at p10 172 / p50 182 / p90 187,
  // a continuous 13-38 level gradient with no flat plateau at all. The three existing
  // streaks are 0.6-0.7 m wide cores at 2.4 m bodies, which at this camera's
  // 6.25-8.94 px/m on this wall is 4-6 px each on an 18 m face - too little
  // area to move a percentile. These two are the same mark at the size a GROUP
  // of runs becomes: 3.6 m of `building` (92.2 against the wall's 120.4, the
  // lightest key that is not the wall itself), hanging from the collar as rule
  // A requires, reaching down to 4.90 where the range roof cuts the face off.
  // ⚠️ RENDERED AND MEASURED: p10 99.8 -> 95.1, p50 and p90 unmoved. They deepen
  // the dark TAIL and they do not build a gradient, because the palette has
  // nothing between `building` 92.2 and pierWhite 120.4 and a two-key dither
  // fine enough to read as a mid tone would cost more boxes than this file has
  // left. THE BIMODAL WALL IS THEREFORE STILL THERE and is named as still-weak
  // in tmp-tr98/RESULT.md. Looked at in tmp-tr98/ev/sheet_hall.png: they read
  // as soft dirt under the eaves, not as panels, so they stay.
  seawS(2.10, 5.70, WASH_D, up(4.90), Y_COLLAR, C.building, MAT.PAINTED);
  seawS(7.90, 11.10, WASH_D, up(5.15), Y_COLLAR, C.building, MAT.PAINTED);

  // ---- WEST FLANK ----------------------------------------------------------
  // DELIBERATELY UNDER-WEATHERED, and this is a budget decision stated out loud
  // rather than an oversight. The west flank is in neither judged camera - the
  // rider is on the +o side and to seaward - and this file was already at 6,212
  // of a 7,000 triangle budget before this section, so a mirrored east flank
  // would cost 300 triangles the game can never see. What the west DOES get is
  // the one mark that would be conspicuous by its absence if the head is ever
  // seen from the beach: the same three rusted hoppers, because they are the
  // same three hoppers, and a building cannot have rust on one side of its roof
  // only.
  // 2026-09-16: 211.6 dropped - its hopper now hangs at Y_SPRING on the
  // single-storey range (section 7) and this stain at y 6.00-7.00 would float
  // 1.3 m above that roof. One box removed.
  for (const s of [E0 + 0.4, W_RWP_S]) {   // west hoppers (W_RWP_S 2026-09-17)
    west(s - 0.55, s + 0.55, WASH_D, up(6.00), up(5.70 * CAL - 1.12),
      C.helterYellow, MAT.PAINTED);
  }
  // ...and the eaves collar, which is the one thing that CANNOT be east-only.
  // The coping runs round all four faces, so a dirt line under it on one flank
  // and not the other is not weathering, it is a mistake - and it is the mark
  // the west render made conspicuous by its absence. Two boxes, 24 triangles.
  // The streaks below it stay east-only; those depend on where the hoppers,
  // the lightbox and the bay run are, and the west flank has almost none of it.
  collar(west, 140.90, 165.60, -0.10);
  // collar(west, 202.90, 214.25, 0.08) REMOVED 2026-09-16: that wall is gone
  // (the range roof is at Y_SPRING); the east twin went with it.

  // =========================================================================
  // DELIBERATELY NOT BUILT
  //
  // - A SECOND TRANSOM or the true mullion pattern inside each 1.25 m slot.
  //   Below the resolution of a 640 px still. One central bar is built.
  // - CANOPY DOWNLIGHTERS. Visible in 553 as bright points on the soffit, but
  //   this renderer has no light sources to hang on them and at range they are
  //   sub-pixel. The soffit they wash is built; the fittings are not.
  // - THE SEAWARD END WALL's openings and signage. Never seen square-on. Only
  //   the bands, the corner pilasters and two structural pilasters are there.
  // - THE PURPLE hue itself. C.pierLED is a dark blue-violet standing in for it;
  //   the palette has no purple and inventing a key is out of scope.
  // - ANY CHANGE TO THE MAIN ROOF, the block's height, or its footprint. The one
  //   element above HEAD_TOP is the bow parapet, and pier.js's own barrel
  //   already stands 0.4 m higher than its crown.
  // - THE WEST GROUND STOREY beyond four doors. 565 gives "occasional dark
  //   openings" and nothing else, and the game never sees that flank.
  //
  // DELIBERATELY NOT WEATHERED, added by the weathering pass
  //
  // - THE LANDWARD BOW AND ITS ENTRANCE FACE. It is the face the paying public
  //   walks up to, both owner photographs of it (1049650633833040.jpg and
  //   1066407125490724.jpg) show it clean, and it is at the FAR end of the
  //   building from both judged cameras. Nothing is put on it.
  // - A MIRRORED WEST FLANK. Only the eaves collar and the three hopper rust
  //   fans cross to the west; the streaks do not. Reason at the site.
  // - RE-COLOURING THE WHITE BANDS. Section 11 note 1 measures that the string
  //   course, the eaves fascia, the coping and all six pilasters now render at
  //   exactly the wall's own 120.4 and are invisible. That is a real defect and
  //   this pass did not fix it: choosing what colour a string course is changes
  //   the building, not its dirt, and doing it inside a weathering pass is
  //   precisely the "fixed one property and silently broke another" failure.
  //   Whoever takes it should note that the cheapest correct answer is probably
  //   in pier.js, not here - the wall was 83 until pier.js 599 repainted it.
  // - ANY MARK NARROWER THAN ITS OWN STATION'S TWO-PIXEL FLOOR. The table in
  //   section 11 is the whole reason the landward marks are metres wide and the
  //   end-wall marks are centimetres: 20 mm streaks are 0.03 px here and
  //   building them would be building nothing.
  // - ANYTHING BELOW y 4.70. The mid-height band is already darker than dirt.
  //
  // WHAT I COULD NOT RESOLVE FROM THE REFERENCE
  // - AN ACTUAL WEATHERING STREAK, ANYWHERE, ON THIS BUILDING. This is the
  //   honest limit of the weathering pass. The best image on disk is the
  //   owner's 1049650633833040.jpg, which resolves the head at about 32 px per
  //   metre and shows tonal ZONES - a dirtier band above the deck, panels of
  //   visibly different white, a grubby return face - and no individual drip.
  //   Every TONE and every AREA FRACTION in section 11 is measured off it; every
  //   POSITION is inferred from where water leaves this building's own
  //   projections. The two are not the same class of claim and are not written
  //   as if they were.
  // - WHICH FLANK IS DIRTIER IN REALITY. The prevailing wind here is south-west
  //   and the pier runs 6.1 degrees off north-south, so the WEST flank is the
  //   weather side and the east is the lee - which argues the opposite of what
  //   is built. What is built follows the camera, and says so.
  // - THE POINTED FEET, AGAIN, AND FROM A NEW DIRECTION. In the owner's sunny
  //   1153745333423569.jpg the scalloped line under the window band reads as
  //   DARK teeth on a white ground; this module builds WHITE teeth hanging into
  //   a dark band, which is the same line inverted. It may be that what the
  //   photograph shows is the shaded soffit of pier.js's own projecting awnings
  //   rather than the feet at all. Not changed - that is geometry, not
  //   weathering, and section 4 owns it - but recorded so it is not re-found.
  // - WHICH FLANK carries RockReef. Section 5's whole s/o placement rests on it.
  // - THE PLAN RISE of the landward bow. 657 gives the shape, no frame gives a
  //   scale; 1.35 m is chosen to be shallow enough that ten straight steps do
  //   not read as a staircase.
  //   ⚠️ THE PLAN BOW ALSO MEANS THE FLANK WALLS SHOULD CURVE INTO IT over the
  //   last few metres, and they do not - the flanks meet the bow at a corner.
  //   Fixing that means bowing pier.js's own block, which is not this file's.
  // - EVERY PROJECTION DEPTH in this file. None is measured; see the ladder note.
  // - WHETHER THE POINTED FEET project from the wall plane at all. The earlier
  //   pass said if they do "it is small - nothing casts a visible soffit shadow
  //   on the wall below in any frame". They are built at the full 0.34 reveal
  //   anyway, because at 0.02 they were invisible, and a wrong-by-250 mm reveal
  //   costs nothing at 150 m while a missing one costs the whole elevation.
  //
  // VERIFICATION. Run against a stub ctx that records every call and then checks
  // the result AGAINST pier.js's own head geometry, which is the part worth
  // keeping - a stub that only records boxes passed the previous version of this
  // file while four of its elements were invisible. The check is now two tools,
  // and they READ THE NUMBERS BELOW OUT OF THIS COMMENT and fail if the geometry
  // disagrees, so this paragraph cannot go stale in silence:
  //
  //   node tools/verify-head-elevations.mjs     validity
  //   node tools/verify-head-claims.mjs         these claims, and meshes.js
  //
  //   536 pbox + 19 ctube; no inverted or zero-extent span on any axis; no
  //   undefined palette key; no m.box and no m.tube; extents s 138.10-198.60,
  //   o -3.68 to +15.68, y 5.47-20.45 (2026-09-16: 580/6,908 -> 566/6,740
  //   after the first step-down, -> 438/5,242 after the DSM re-massing, see
  //   S_STEP and section 10, -> 411/4,918 with S_SEA 215 -> 199.2, -> 433/5,182
  //   with the gallery window piers, -> 408/5,110 with S_SEA 198.0, -> 359/4,522 with
  //   the range cladding under the DSM section's eaves, -> 363/4,570 pointed gables (tmp-tr23), -> 375/4,714 range west openings (tmp-tr25p), all 2026-09-16, -> 393/4,930 west gable run re-laid, tmp-tr27, -> 497/6,178 west first floor rebuilt, tmp-tr29, -> 513/6,370 east first floor rebuilt, tmp-tr31, all 2026-09-17, -> 540/6,694 tmp-tr98, -> 536/6,646 with the shopfront moved to the bow, tmp-tr106, 2026-09-18) - i.e. nothing below the deck and the
  //   highest point 60 mm UNDER pier.js's LIDAR mast at 20.51 m ODN, so this
  //   module claims no new skyline; every ctube endpoint inverts back through
  //   at() to a station/offset inside the block (s 138.95-196.90, o -3.38 to
  //   +15.38), which is the check that catches the m.ctube(s, o, y) argument
  //   swap; 0 boxes inside the helter-skelter cone (checked at each box's OWN
  //   height, not at deck level - the cone tapers, and checking at the wrong
  //   height is how the old masts ended up inside it); and no projection within
  //   40 mm of pier.js's own 0.14 and 0.30 planes anywhere in the 1.9-5.6 m
  //   band.
  //
  // ROTUNDA OVERLAP, RE-MEASURED 2026-09-16 (stage 2) AGAINST THE BUILT ONE.
  // tools/verify-head-claims.mjs modelled a stale rotunda (s 196, o 7, R 9.5,
  // a 12-gon of chord boxes) and this paragraph kept a count (41 boxes,
  // 7.67 m3) only to hold that tool green. The tool now takes the centre from
  // pier.js's HEAD (ROT_S 208.0, ROT_O 5.1, DSM) and tests every box of this
  // module against the rotunda as pier.js builds it (drum, 14 columns, cornice
  // ring, dome rings, lantern). The range's end wall is at S_SEA 198.0 and this
  // module's seaward-most box ends at s 198.60, 0.26 m short of the widened
  // rotunda's axis column (2026-09-16):
  //   0 boxes and 0.00 m3,
  // so the old band-count half of the claim is vacuous and the tool skips it.
  // The 41/7.67 history: every one was a collision with the stale model.
  //
  // FIVE DEFECTS WERE FOUND BY THAT CHECK AND FIXED IN PLACE, each marked at its
  // site: D_REVEAL was exactly coplanar with pier.js's misplaced east LED over
  // 18 m; the lightbox's shadow-gap box sat on the eaves soffit strip it was
  // meant to stand clear of; the LED surround's arch was stepped in 5 against
  // the screen's 7 and cut into it; the bow parapet started inside the eaves
  // coping and inverted at the corners; and the middle downpipe ran up the
  // inside of the bay run, so 4.5 m of it was buried behind the reveals.
  //
  // TWO MORE WERE FOUND BY THE ADVERSARIAL RE-CHECK (that pass's own verifier
  // died mid-run and this file shipped unchecked), both marked at their site:
  //   - FOUR SHOPFRONT MULLIONS WERE INVISIBLE. The 1.8 m rhythm was guarded
  //     against the door bank but not against the two graphic panels, and a
  //     D_MULL bar (0.10) inside a D_BAND panel (0.18) cannot be seen from any
  //     angle. 48 triangles drawing nothing. The visible rhythm is unchanged.
  //   - THE WEST PLINTH RAN ACROSS ALL FOUR WEST DOORS. The east bank was split
  //     around its threshold and the west was not, so each west door stood on a
  //     0.24 m kerb. Split, +12 boxes.
  // Neither is visible from the water at 150-400 m, which is exactly why a
  // stub-and-assert check has to exist: nothing about the view that matters
  // would ever have reported them.
  //
  // TRIANGLE COST: 536 pbox (12 each) + 19 ctube (10-12 each) = 6,646 against a
  // 7,000 budget. Round is not expensive here: the 19 tubes are 214 triangles,
  // 4.1% of the file, and they are the only geometry on this building that is
  // correctly lit round its own axis.
  //
  // ⚠️ THE THREE COUNT CLAIMS ABOVE WERE ALL STALE WHEN THIS PASS OPENED THE
  // FILE - they said 452 pbox and 5,876 triangles against an actual 480 and
  // 6,212, so verify-head-claims.mjs was already failing on them before section
  // 11 existed. This pass added 58 boxes and 696 triangles - 50 of weathering
  // (section 11) and 8 of LED content (section 8) - and the other 28 boxes in
  // the gap were added by an earlier pass that did not update its own
  // arithmetic. The numbers here are now read off
  //     node tools/module-check.mjs        532 pieces, 6,370 triangles
  //     node tools/verify-head-claims.mjs  513 pbox + 19 ctube   (2026-09-17, east first floor rebuilt, tmp-tr31)
  // and not from the previous version of this sentence.
  // =========================================================================
}
