// BOURNEMOUTH PIER - what stands ON the neck deck.
//
// Lamp columns, the balustrade, the edge canopy, the entrance kiosk and gates,
// the bin, the telescope, the lifebuoys, and the deck's own timber surface.
// Everything here comes from a measurement pass over the owner's own on-deck
// and drone footage (frames 562, 590, 599, 618, 645, 651, 652, 664, 679, 685).
//
// THE RULER. Every dimension in this file is chained off ONE measurement: the
// balustrade is 1.10 m above the deck. That came from a woman leaning ON the
// railing in f618 - rail top at 0.66 of her standing height, at the SAME
// station, so perspective cancels exactly and the camera never has to be known.
// Two other methods were tried and thrown away: the horizon/eye-height solve
// gave 0.79-0.91 m in three separate frames, which is nonsense for a public
// pier balustrade, because these phone videos have real barrel distortion and
// the railing line curves. Where two objects in the same frame stood a few
// metres apart, the apparent heights were divided by (base row - horizon) to
// cancel the small difference in distance before taking the ratio.
//
// WHAT THE CAMERA CAN ACTUALLY SEE, and why it shapes this file. view3d.js puts
// the chase camera at craft height + 1.35 m and the FPV eye at 1.52 m, so the
// camera never gets above about 2.4 m. The deck is at 5.47 m and the railing's
// top rail at DECK + 1.10 = 6.57 m, so the SKYLINE the player judges the neck
// on is 6.57 m, not the deck. (This line said 6.62 m, the top of a solid
// parapet coping; tmp-tr43 removed that parapet and put open railings back, and
// the number moves 50 mm. It also said "the deck top is at 6.75 m" once, which
// is neither.) THE WALKING SURFACE IS NEVER IN FRAME - you always look up at
// the pier from below, although since tmp-tr43 you DO see strips of it through
// the open railing. So everything here is
// built to read as a SILHOUETTE against the sky or as a band along the deck
// edge, and three measured items that live flat on the deck are deliberately
// not built (see the omissions at the bottom).
//
// ⚠️ AND THAT HAS A COROLLARY THIS FILE MISSED FOR EIGHTEEN DAYS: an object
// shorter than 1.15 m above the deck, or on the far flank, contributes NOTHING.
// Before 2026-08-20 every lamp, bin, telescope, lifebuoy and apron banner in
// this file was one or the other, and the neck rendered as 128 m of perfectly
// straight edge. See the FOURTH PASS note below.
//
// ---------------------------------------------------------------------------
// INTEGRATION - what in pier.js this supersedes. This file does NOT edit
// pier.js and never z-fights with it; where the two disagree the geometry is
// offset so both can coexist.
//
// SETTLED 2026-08-19, re-read against pier.js on disk rather than assumed:
//   THE GLAZED SHELTER at s 4-46 is GONE. pier.js now carries the deletion note
//     in its place and hands the whole covered walkway to this file ("One
//     canopy, one owner"). That removes the 30 m of green roof this file's
//     canopy used to stand INSIDE, and it removes the full-width roof that was
//     shading 42 m of the neck deck in the drone view. Section 7 is measured on
//     the assumption that it is gone, and it is.
//   THE TICKET KIOSK BOX and its copper-green roof slab are GONE too, so the
//     green fin that used to poke through this file's octagonal drum, and the
//     grey wall stub running seaward to s 11, are both gone with it.
//   THE NECK railRun is gone; pier-railings-parapet.js owns that edge.
//
// CLOSED 2026-08-19 BY VERIFICATION, and it had been recorded here as open:
//   pier.js's lamp columns at +o are GONE from the neck, so there is no longer
//     any doubling to leave in. Measured, not read off a comment: pier.js was
//     loaded on its own with all six addPier*() imports stubbed out, and it
//     contributes ZERO vertices above the neck deck (s 0-128, |o| <= 5.5,
//     y > 5.6). Its lamp loop now runs on the HEAD only, at off = HEAD_W[1]-1.6
//     = 22.9. The reference reading that put OUR lamps at -o is unaffected -
//     lamps on the open railed edge, canopy opposite, LED screen on the canopy
//     side - it just no longer has a competitor. NOTE that module-check.mjs
//     matches /^pier-.*\.js$/ and so does NOT load pier.js: any claim in this
//     file about pier.js has to be checked by loading pier.js directly.
//
// STILL OPEN:
//   pier.js's neck deck slab, built with the default MAT.CONCRETE. The walking
//     surface is timber; this file lays a timber wearing course over it rather
//     than touching that line. (It runs SPINE_TOP..DECK, i.e. entirely below
//     deck, which is why it does not show in the vertex count above.)
//
// ⚠️ OPENED 2026-08-20, AND IT IS A CLAIM IN pier.js THAT THIS FILE HAS NOW
// DELIBERATELY OVERTURNED - read this before "restoring" anything.
//   pier.js:523-541 deleted its own neck lamp run and gives the reason in full:
//   "the reference puts the lamps on the OPEN railed edge with the covered
//   walkway opposite, so ONE line of columns, at -o. Keeping both gave a lamp
//   on each edge every 22 m for the whole neck - six columns nothing in the
//   footage supports". Deleting pier.js's run was RIGHT and stays deleted; the
//   reason attached to it is not, and it is the same dead premise section 3
//   inherited. Section 7 re-measured the canopy as 3.20 m and CENTRAL, so there
//   is no "walkway opposite" - there are two open railed edges, and the owner's
//   own 1074080244723412.jpg shows columns standing on both of them. This file
//   now builds 22 m per flank STAGGERED by 11 m, which is not the mirrored pair
//   pier.js rejected: no two columns share a station, and the 11 m apparent
//   pitch is measured off f624 to 1.9% (section 3).
//   AND A REAL INCONSISTENCY IS LEFT BEHIND, flagged rather than fixed because
//   the line is not in this file. ⚠️ RE-READ 2026-08-20 AND THE REFERENCE HAD
//   ALREADY GONE STALE - pier.js was edited again after this file was written,
//   so check it before quoting it. It is now pier.js:574-582, the loop runs
//   s 134..244 (not "134-246"), and the head lantern is no longer the
//   0.6 x 0.6 x 0.25 slab described here: that file measured it off its own
//   frame 1066407125490724.jpg and rebuilt it as a 0.15 m shaft to DECK+3.55,
//   a 0.42 m outboard BRACKET, and a 0.78 x 0.22 x 0.13 lantern topping out at
//   DECK+3.85. So the two runs still disagree, but differently: head 3.85 m
//   with a bracket, neck 4.60 m with the lantern nearly over the shaft. Both
//   are visible in the head camera. They are 18 m apart across the deck (head
//   lamps at o 22.9, neck at 5.02) so they never stand side by side. Whoever
//   reconciles them should reconcile the HEIGHT and the BRACKET together - the
//   0.25 m swan-neck reach built below is short enough that from a camera
//   square to the pier the lantern reads as centred on the shaft, which is the
//   "grey mallet" pier.js has just spent a pass removing from its own run.
// ---------------------------------------------------------------------------
//
// ONE GEOMETRY RULE, because it drives several odd-looking numbers below.
// craft.js:256 DISABLES backface culling for the coast pass, so a face pointing
// away from you is still rasterised. Two faces in the same plane therefore
// z-fight whichever way they point, and "it faces away, it will be culled" is
// not available as an argument here. Every solid in this file is sized so that
// it shares no face plane with a neighbour: bands overlap in y by 40-60 mm
// rather than butting, nested slabs are inset 5 mm, the roof steps lap, and the
// lifebuoy ring's uprights are wider than its cross bars. The only faces left
// in a shared plane are the ones at exactly deck level, and the timber wearing
// course (DECK-0.06 .. DECK+0.045) buries every one of those.
// 252 boxes + 12 octagonal tubes, 3,216 triangles, checked pairwise.
// (Was 212 + 12 / 2,736 before the fourth pass. Budget for this file is 7,000.)
//
// VERIFICATION PASS. Measured against a stub ctx and against pier.js's boxes
// replayed into the same frame. Six defects found and fixed in place, each
// marked "VERIFY FIX" at the line:
//   1. all six lamp LANTERNS floated 20 mm above their brackets;
//   2. the head balustrade had no posts, so 134 m of band on both edges stood
//      on nothing with a 0.10 m gap under it;
//   3. the entrance kiosk hovered 0.10 m off the deck, all seven boxes;
//   4. a 0.10 m slot ran the length of the canopy roof, open to the sky;
//   5. the litter bin's face was coplanar with pier.js's rails, above deck;
//   6. the timber course's ends were coplanar with the deck slab's ends.
// The header's earlier claim that NOTHING here shares a face plane with pier.js
// was wrong on (5) and (6). What is true after the fix: the only shared planes
// left are at deck level, inside the timber course, plus pier.js's own head
// railing posts which this file does not own.
//
// SECOND VERIFICATION PASS, 2026-08-16, after sections 7 and 8 were re-measured.
// Every pair of boxes in this file was tested for a shared face plane WITH the
// other two axes actually overlapping - the previous pass checked by hand and
// missed the biggest one in the file. Four more defects found and fixed, each
// marked "VERIFY FIX" at the line:
//   7. the canopy's two innermost roof steps were coplanar over their whole
//      length: 26.8 m2, down the ridge, the worst z-fight this file has had;
//   8. the eaves beams' seaward end caps sat in the roof steps' end plane;
//   9. the dado and its glazing shared both s planes, 28 times;
//  10. the three landward gable steps were all cut at one s.
// What is left, RE-COUNTED 2026-08-19 and the earlier tally was wrong on both
// the number and the objects, then RE-RUN 2026-08-20 after the fourth pass
// changed sections 3, 4, 6, 9 and 10.
//
// ⚠️ AND THE FOURTH PASS'S OWN TALLY DID NOT REPRODUCE. Re-run by an
// independent verifier 2026-08-20 with exactly the method this comment states -
// every pair, a shared face plane, the OTHER TWO axes genuinely overlapping,
// 1e-6 tolerance - the file as that pass shipped it gave 37 pairs and
// 0.1199 m2, not the 43 / 0.1217 written here, and the claim that "every one is
// in SECTION 9" was wrong by eleven: the pass had just created one shared
// o-plane PER LAMP COLUMN (swan-neck inboard reach 0.13 = lantern slab 2's
// lc - 0.120), 0.00108 m2 each. Those eleven are fixed at the line in section 3
// and the count is now:
//     26 pairs, 0.1080 m2, largest 0.0054 m2
//   20 of them in SECTION 9, the entrance gates at s 11.6: the vertical bars
//     stop at DECK+2.00 and the two head rails also START at DECK+2.00, so each
//     bar's top face sits in a rail's bottom plane, 0.09 x 0.06 m a time; the
//     rest are the stiles' and bars' bottom faces meeting at y = DECK, which
//     the timber course buries.
//   6 of them in SECTION 7 - each adjacent pair of canopy roof steps runs the
//     full 16.320..127.880 and so shares BOTH s end planes while lapping 20 mm
//     in o and 14 mm in y, 0.0003 m2 an end. Small, but it means the line below
//     claiming sections 7 and 8 share no plane with anything is FALSE, and it
//     has been false since the second verification pass wrote it.
// ⚠️ THE RE-RUN EARNED ITS KEEP AND THE NEXT PASS SHOULD DO IT TOO. It caught
// three new shared planes this pass had just created and would otherwise have
// shipped: the lamp sign board's outboard face in the shaft's own plane
// (0.046 m2 x 4, the largest this file has ever had), the gate head rail's end
// in the outer bar's face (0.0126 m2 x 2), and the lifebuoy cross bars' ends in
// the uprights' end planes (0.004 m2 x 6, which pre-dated this pass and which
// the 2026-08-19 audit missed while asserting the gates were the only site).
// Left alone deliberately - it is 0.15 m2 of horizontal face inside a black
// gate at the pier entrance, under a pixel from any camera this game uses, and
// moving the rail would cost the gate its measured 2.00 m head height.
// ⚠️ "Nothing in sections 7 or 8 shares a plane with anything, in either
// direction, and that part of the claim does reproduce" stood here until
// 2026-08-20 and it does NOT reproduce - see the six section-7 roof-step pairs
// listed above. Left unfixed deliberately: closing them means giving each roof
// step its own s extent, which moves the ridge's landward and seaward ends and
// so moves the only measured thing about the canopy's length. 0.0018 m2 in
// total, at the two ends of a 111 m run, is not worth that.
//
// THIRD PASS, 2026-08-19: "THE CANOPY DOES NOT READ FROM THE WATER".
// Diagnosed by rendering rather than by argument, and the diagnosis was not
// what the brief assumed. The canopy was not missing and its size was not
// wrong. Sampled straight out of the render, a 150 m side elevation gave the
// whole above-deck structure 13 px, of which the canopy's green was ONE, at
// #66766F - and the 1.5 m band under it, its glazing, was #293236, the darkest
// thing on the pier. Two causes, both fixed in section 7 and both measured:
//   1. a 0.42 m WHITE eaves beam lay across a 0.85 m roof band and occluded
//      most of the green. The band is now 0.06 m white and 0.66 m green.
//   2. the glazing was C.pierGlass, at 0.35 of sky brightness. Both side
//      elevations measure it as the BRIGHTEST thing above the deck, 0.80-0.85
//      of sky. It is C.pierRail now, and the reason is physical, not cosmetic.
// Re-rendered: the green band is 3 px at 150 m and 2 px at 172 m, contiguous,
// on a pale band, and findable at 400 m. Before: 1 px, on black.
//
// ⚠️ AND THE CAMERA NAMES IN THE BRIEF DO NOT SAY WHAT THEY SOUND LIKE. Two of
// the four judged cameras do NOT look at the neck at all, which is worth
// knowing before concluding an object on the neck is missing:
//     approach   coast (120,300)  -> station 311, offset +87. That is 49 m
//                PAST the tip. The neck is 250-310 m away and behind the head;
//                the canopy is present in it, 1-2 px, at x 555-600.
//     along-neck coast (45,140)   -> station 144, offset +30. CORRECTED
//                2026-08-19: that is where the camera STANDS - beside the head,
//                5.4 m outboard of HEAD_W[1] = 24.5, not inside it - and the
//                earlier note here, that this camera "does not look at the neck
//                at all", is wrong. Its AIM point, coast (8,9,60), inverts to
//                station 60.5, offset +1.6: the middle of the neck, seen from
//                84 m away and very oblique. The canopy IS in that frame and
//                does read - 2-4 px of green over x 404-476, measured on the
//                render. pier-arcade-underside.js's note on this camera is
//                still worth reading, but do not use it to excuse an object on
//                the neck being invisible here.
//     entrance   coast (95,160)   -> station 169, offset +78, looking at the
//                entrance 172 m away. THIS is the judged camera that sees the
//                neck, and it is the one to judge the canopy on.
//     head       coast (70,250)   -> station 256, offset +43.
//     arcade     at(55,26)        -> station 55, offset +26, 26 m off the neck
//                and square to it. ADDED to the list 2026-08-20: it is the
//                NEAREST of the five to the neck and the only one that sees a
//                clean length of deck edge against sky, so it is the camera the
//                skyline is judged on. All five stand at POSITIVE o.
// ---------------------------------------------------------------------------
//
// FOURTH PASS, 2026-08-20: "THE DECK EDGE IS THE MOST-SEEN SURFACE AND IT IS
// BARE." Diagnosed by rendering the five cameras first, and the diagnosis was
// not the one the brief assumed. Nothing was missing. Everything was in the
// wrong PLACE, in two systematic ways that this file had no reason to notice
// because each section was verified on its own:
//   1. EVERY object in sections 3-6 and 10 stood on the -o flank, and all five
//      judged cameras stand at +o (+26 to +87). Ten metres of pier and a 1.15 m
//      parapet in between.
//   2. Every object was measured against a 1.10 m PICKET SCREEN, and the neck
//      edge was later settled as a 1.15 m SOLID PARAPET. Against a picket
//      screen a 1.40 m bin and a 1.25 m lifebuoy are visible objects; against a
//      wall they are 0.25 m and nothing. The lamp columns, at 3.50 m, were
//      0.15 m taller than the 3.35 m canopy ridge standing 5 m BEHIND them,
//      which is not enough, so they rendered below it.
// MEASURED, not asserted: with the same skyline-relief scan run on the arcade
// camera over the full 884 px frame - topmost non-sky row per column, against
// an 80th-percentile local baseline - the neck's top edge scored max rise
// 1.0 px and ZERO events before this pass, and max rise 32 px and 5 events
// after. On a square-on 150 m side elevation the run scores 10 events, and at
// 250 m it still scores 12 along the neck. That is the whole finding.
//
// ⚠️ AND ONE THING THE FOURTH PASS DID NOT NOTICE, MEASURED BY THE VERIFIER
// 2026-08-20 ON THE RENDER: THE 11 m RHYTHM DOES NOT REACH THE ARCADE CAMERA.
// The stagger only reads where BOTH flanks clear the central canopy ridge, and
// that depends on how steeply you look up at the pier:
//   arcade, 26 m off, eye 3.0 m - the sightline to a far-flank lantern top
//     (10.07 m at o -5.02) crosses o = 0 at 8.93 m against a ridge at 8.835 m.
//     0.10 m of a 0.16 m lantern. Measured on the render: the two near-flank
//     columns in frame give 51 and 63 px of skyline relief, the two far-flank
//     columns in frame give 2 px each. The visible pitch there is 22 m.
//   beach/water, 63 m off, eye 1.6 m - the same sightline crosses o = 0 at
//     9.49 m, 0.66 m clear. Rendered at that station the run shows three
//     columns at an 11 m pitch with the far pair standing visibly SHORTER
//     than the near one, which is the signature f624 should show and does.
// So the rhythm is right at the range the owner judges from (150-400 m) and
// halves inside about 35 m. Nothing to fix - it is what a real central canopy
// would do - but do not re-measure the pitch on the arcade camera and conclude
// the columns are at 22 m.
// ---------------------------------------------------------------------------

export function addDeckFurniture(ctx) {
  // m, TIP_HALF and HEAD_TOP are part of the agreed ctx contract and are
  // destructured for that reason; nothing on the deck needs them - every solid
  // here is an oriented box in pier space, so m.box would skew it by 6.1 deg.
  const { pbox, m, C, MAT, DECK, NECK_HALF, HEAD_W, TIP_HALF, HEAD_TOP } = ctx;

  // The railing line pier.js already uses. Keeping the same offset means the
  // picket infill below lands in the plane of the existing rails instead of
  // beside them.
  const RAIL_O = NECK_HALF - 0.3;
  const P = MAT.PAINTED;          // painted metal takes no texture, just colour

  // =========================================================================
  // 1. THE DECK SURFACE IS TIMBER, NOT CONCRETE
  // =========================================================================
  // The single biggest correction in this feature. pier.js line 189 builds the
  // neck deck with the default MAT.CONCRETE; every one of the ten on-deck
  // frames and both overhead drone frames show a TIMBER deck, weathered warm
  // brown with a dark shadow gap between each board. There are no concrete bay
  // joints anywhere on the neck. The substructure is concrete; the surface you
  // walk on is not.
  //
  // BOARD DIRECTION CORRECTED 2026-08-16: LONGITUDINAL, not transverse.
  // This file used to say the boards run ACROSS the pier. f590 settles it the
  // other way and it is not close. f590 is a drone shot down the pier axis over
  // the landward apron: every board line CONVERGES on a single vanishing point
  // at the kiosk. Parallel lines only converge when they run away from the
  // camera, so the boards run ALONG the pier, in s. Transverse boards in that
  // shot would have drawn a ladder of horizontals with no convergence at all.
  // f599's foreground apron shows the same convergence from a second altitude.
  // RE-CHECKED 2026-08-16 on the re-extracted f590 at 4x, both over the open
  // apron and in the strip beside the kiosk: convergence in both, longitudinal
  // confirmed, and the boards are narrow with a deep dark groove between them
  // rather than wide planks with a hairline joint.
  // BOARD PITCH 0.16 m, SETTLED 2026-08-19. The file carried two readings that
  // disagreed - 0.27 m from an adult shoe length lying on the boards, 0.20 m
  // from counting balustrade pickets as a second ruler - and asked for a third.
  // Here it is, and it is the first one that does not depend on guessing the
  // size of something else in the frame.
  //   METHOD: autocorrelate a horizontal luminance profile across the landward
  //   apron in f599, at four separate rows, after removing a 25 px moving mean
  //   so the deck's own large-scale shading cannot dominate. The boards run
  //   ALONG the pier, so a horizontal scan crosses them square. f599's camera
  //   is already solved in section 7 (6.74 m above the deck, horizon row 138),
  //   so the scale at row r is simply (r - 138) / 6.74 px per metre - no ruler
  //   object is needed at all.
  //     rows 315-323  scale 26.9 px/m  peak lag 4-5 px  ->  0.149-0.186 m
  //     rows 330-338  scale 29.1 px/m  peak lag 4-5 px  ->  0.138-0.172 m
  //     rows 345-353  scale 31.3 px/m  peak lag 5 px    ->  0.160 m  (r=0.50,
  //                                                        with its 2nd
  //                                                        harmonic at lag 10)
  //     rows 300-310  scale 24.8 px/m  peak lag 3-4 px  ->  0.121-0.161 m
  //   Four rows, four different scales, one answer: 0.16 m. The clean harmonic
  //   at lag 10 in the best-conditioned row is what rules out the usual failure
  //   here, which is locking onto half the true period.
  //   It also lands on the real-world number - UK pier decking is 145 mm face
  //   at about 155-160 mm pitch - which the 0.27 m shoe reading never did.
  //   0.27 is retired. 0.20 stands as a weak second and is consistent to 25%.
  // Still not BUILT as joints - see the omissions, the reason has not changed
  // and 0.16 m makes it worse: 800 boxes, not 474.
  //
  // AND THE DIRECTION COMES OUT OF THE SHADER FOR FREE, which is why no joint
  // geometry is built. MAT.TIMBER's UVs are the world-planar pair
  // (worldX, worldY) x 0.42 (craft.js:182-184). On a horizontal deck worldY is
  // constant, so V is frozen and only U moves: the sample runs along one row of
  // the timber tile and smears it along world Z. That is a defect on any other
  // flat surface in this scene and an accident in our favour here, because the
  // pier axis is only 6.1 degrees off world Z - so the striations run within 6
  // degrees of the boards' real direction. They are GRAIN, not joints: the
  // generator's 12 planks lie along V, which is frozen, and what survives is
  // its fbm(u*60) grain at 60 cycles per 2.38 m tile, about 0.04 m. So the deck
  // reads as longitudinal timber grain rather than as discrete boards.
  // The frozen V was checked, not assumed: the deck top sits at
  // y = DECK + 0.045 = 5.515, V = 2.3163, plank fraction 0.796 - clear of the
  // generator's gap bands at <0.035 and >0.965, so the whole 128 m does not
  // sample the black joint line and go black; and V < 0.35 puts it in the
  // NEW-timber band rather than the weathered one.
  //
  // ⚠️ AND THAT LAST CHOICE IS WRONG, MEASURED 2026-08-19, BUT IT IS NOT SAFE
  // TO CHANGE FROM THIS FILE. Worth writing out in full because it is the only
  // remaining error in the deck and the next person will reach for the tint.
  //   The frozen V lands on ONE texel of gen-textures.mjs's timber tile, and
  //   that texel can be computed exactly: v = 0.3163, plank 3, age 0.411 ->
  //   mix(NEW #6E5C38, WEATHERED #9A968C, 0.206) = #776849. Through the
  //   texture-dominant shader with the C.pierDeck tint that renders #7B6B4A.
  //   Against the two measurements this file already records - f590 p50
  //   #A79791 sunlit, f599 p50 #685551 low sun - the HUE error is entirely in
  //   one channel: normalised for exposure, G-B is 33 in the render and 4-6 in
  //   both frames. The deck is far too YELLOW, not too grey.
  //   THE TINT CANNOT FIX IT. The shader is albedo = t * (0.78 + 0.55*vColor),
  //   so a vertex colour can only scale a channel between 0.78 and 1.33. All
  //   eighteen palette keys were tried against both references: the best
  //   (C.pierLED) moves G-B from 33 to 27.5 and darkens everything; C.pierDeck
  //   sits mid-table. The error is in the TEXTURE, not the tint, and swapping
  //   in an odd key to buy 17% of it would be a lie about what was measured.
  //   WHAT WOULD FIX IT: the generator's WEATHERED band is #9A968C, which IS
  //   the measured deck. A deck top anywhere in 5.60 <= y < 6.48 samples it -
  //   e.g. y = DECK + 0.18 gives texel #969083, rendering #9B9485, with G-B
  //   down to 15 and R-G to 7. That is a 180 mm timber wearing deck on bearers,
  //   which is physically right.
  //   WHY IT IS NOT DONE HERE: DECK is this file's ruler. Every dimension in it
  //   is chained off the balustrade standing 1.10 m above the walking surface,
  //   and pier-railings-parapet.js's PAR_H = 1.15 is measured from DECK too.
  //   Raising the walking surface 180 mm silently shortens that parapet to
  //   0.97 m, sinks this file's own lamps, bin, telescope, gates and kiosk by
  //   180 mm, and sinks pier-people-scale.js's figures to their ankles. One
  //   module cannot move a datum four modules share. The real fix is one line
  //   in tools/gen-textures.mjs - widen the NEW band's v < 0.35 threshold, or
  //   desaturate NEW - and that file is not this one.
  //
  // Laid 0.06 m PROUD of the concrete edge beam so the board ends show as a
  // thin timber nosing capping the fascia - that strip is the only part of the
  // timber the game camera can ever see, and MAT.TIMBER's world-planar UVs are
  // correct on a vertical face like it.
  // VERIFY FIX: the run was 0..128, so the course's two end faces sat in the
  // same planes as the neck slab's own ends (s 0 and s 128) and the head slab's
  // landward face - about 2 m2 of coplanar face that the course cannot bury,
  // because it IS the course. Started 50 mm in and carried 50 mm onto the head
  // slab (which pier.js builds full width from 128), so neither end matches a
  // plane pier.js uses; 128.05 also clears its 128.5 deck step.
  //
  // INTEGRATION FIX 2026-08-03: the course ran the FULL width, o +-5.56, which
  // put 7.0 m3 of timber inside pier-railings-parapet.js's parapet foot along
  // the whole 128 m - decking under a wall - and shared a bottom face plane
  // with it at y = DECK-0.06.
  //
  // ⚠️ THE PARAPET IS GONE AND THIS PARAGRAPH WAS WRITTEN FOR IT. Corrected
  // 2026-09-18 (tmp-tr97). It used to read: "The edge is now a solid concrete
  // parapet: nothing of the deck surface is visible from the water at all, so
  // the nosing has nothing left to do and the course stops at the parapet's
  // inner face", and it stopped the timber at NECK_HALF - 0.28 = 5.22.
  // tmp-tr43 removed that parapet and put OPEN WHITE RAILINGS back on both neck
  // edges, from the owner's own overcast under-neck video, so the premise is
  // false twice over: there is 0.18 m of clear daylight under the railing's
  // bottom rail, and the pickets above it are a 0.027 m bar at 0.2 m pitch. The
  // deck surface IS seen from the water now, in strips, and it stopped 0.28 m
  // short of the edge - a bare concrete margin all along both flanks.
  // The course now runs to o +-5.46, i.e. up to the coping course
  // pier-railings-parapet.js builds at 5.50-5.56 and just inside the railing
  // posts at 5.417-5.483 (round ctubes, which pass through it). It is still
  // laid NOT proud of the edge: E2 (library 829290465869059.jpg, deck level,
  // close) shows the timber butting a precast coping whose top is flush with
  // it, not oversailing it, so there is no timber nosing to build.
  const PAR_IN = NECK_HALF - 0.04;
  pbox(0.05, 128.05, -PAR_IN, PAR_IN, DECK - 0.06, DECK + 0.045,
    C.pierDeck, MAT.TIMBER);

  // =========================================================================
  // 2. THE BALUSTRADE IS A PICKET SCREEN, NOT POST-AND-RAIL
  // =========================================================================
  // pier.js railRun() builds posts every 2.6 m with two horizontal rails. The
  // real thing is a close-spaced picket screen: vertical bars at roughly
  // 0.11-0.13 m pitch (the 100 mm sphere rule), a rounded top rail, a mid rail,
  // a decorative panel band in the lower third, and heavier posts with flared
  // base plates at intervals. At any distance a picket screen reads as a PALE
  // SOLID BAND; post-and-rail reads as a see-through comb. This changes the
  // pier's read from the water more than anything else in this feature.
  //
  // Built as a solid band rather than as bars, deliberately: true 0.12 m pitch
  // over 127 m of neck on both edges is 2,116 boxes - four times this whole
  // feature's budget - to produce, at the ranges this game is played at, the
  // same pale band one box gives. The measured pitch is recorded here so a
  // future near-field pass can spend the triangles where they land.
  //
  // Heights: top of screen 1.02, decorative band 0.10-0.44, both taken from the
  // 1.10 m rail top and its mid rail at 0.55. The bands overlap in y by 40 mm
  // so no two faces are coplanar with each other or with pier.js's rails.
  const picketRun = (s0, s1, off) => {
    pbox(s0 + 0.06, s1 - 0.06, off - 0.035, off + 0.035, DECK + 0.10, DECK + 0.44, C.pierWhite, P);
    // VERIFY FIX: was (s0, s1), which matched railRun()'s extents exactly and
    // so put this band's end caps in railRun's end planes at s 1, 128 and 262.
    // Trimmed 20 mm; the lateral plane the comment above cares about is unchanged.
    pbox(s0 + 0.02, s1 - 0.02, off - 0.025, off + 0.025, DECK + 0.40, DECK + 1.02, C.pierRail, P);
  };
  // ---- NECK PICKETS WITHDRAWN AT INTEGRATION, 2026-08-03 -------------------
  // This module and pier-railings-parapet.js were written in parallel from
  // different frame sets and reached OPPOSITE readings of the same neck edge:
  // an open picket screen here, a solid concrete parapet there. Neither author
  // could see the other, and tools/module-check.mjs measured the collision at
  // 27.46 m3 over 705 box pairs - a picket fence buried inside a concrete wall
  // for the whole 128 m.
  //
  // Frame 542 settles it for the NECK: a continuous pale concrete mass with a
  // coping and vertical staining, no daylight through it. That also agrees with
  // known error 2 in pier.js, which was drawn from six independent frames. So
  // the parapet wins here and these two runs are withdrawn.
  //
  // ⚠️ AND FRAME 542 WAS WRONG, 2026-09-17 (tmp-tr43). The "continuous pale
  // concrete mass" is the picket RAILING seen at about 150 m: the owner's own
  // overcast video 1338723233808999 @85 s and @128 s, looking up at the neck
  // from the sand, shows white posts, a top rail, a bottom rail and dense
  // vertical pickets with daylight and the glazed shelter visible THROUGH them.
  // The parapet, its coping, its signage band and its 36 letter blocks are all
  // REMOVED from pier-railings-parapet.js, and that module now builds the open
  // railing this section was originally right about. These two runs STAY
  // WITHDRAWN anyway, and the reason is unchanged from the paragraph above the
  // commented-out calls: the railing belongs to ONE module, and it is the other
  // one. Two modules building the same edge is exactly what module-check
  // exists to catch. Restoring these would put a second picket screen 30 mm
  // inside the first. (Kept as a record of the reading, not as dead code to
  // revive - see the 2026-09-18 note in section 1 for the same correction
  // applied to the timber course, which DID have to move.)
  //
  // NOT a judgement that the pickets do not exist - white vertical bars ARE
  // visible along the nearer part of the neck in 542. What could not be
  // established at 640 px is their HEIGHT relative to the parapet: standing on
  // top of it, or the far edge's balustrade seen over it. Re-measure from a
  // frame taken from the deck rather than the beach before restoring them.
  // picketRun(1, 128, -RAIL_O);
  // picketRun(1, 128, RAIL_O);

  // The heavier posts. f645_08 and f685_05 show them at wide intervals with
  // flared circular base plates bolted through the decking. The interval itself
  // was NOT measurable - 8 m is a plausible rhythm, not a reading. The base
  // plates are not built: a 0.34 m disc lying flat at deck level cannot be seen
  // from a camera that never rises above 2.4 m.
  // VERIFY FIX: this was a bare neck-only loop, which left the head's screen -
  // built below at the same DECK+0.10 sill - standing on nothing at all for
  // 134 m on both edges. Pulled out as a helper so the head can be posted too.
  // The posts start 50 mm BELOW deck rather than at it: at DECK their bottom
  // faces were coplanar with the deck slab's top face, which the timber course
  // buries on the neck but there is no timber course on the head.
  const picketPosts = (s0, s1, off) => {
    for (let s = s0; s <= s1 + 1e-9; s += 8) {
      pbox(s - 0.07, s + 0.07, off - 0.07, off + 0.07, DECK - 0.05, DECK + 1.28, C.pierRail, P);
    }
  };
  // Withdrawn with the neck picket runs above - posts for a screen that is no
  // longer built would stand alone in the parapet.
  // picketPosts(4, 124, -RAIL_O);
  // picketPosts(4, 124, RAIL_O);

  // The same screen carried round the head. INFERRED, not measured - my frames
  // are all on the neck - but the head railings are visibly the same white
  // balustrade in the drone footage, and leaving the head as a comb while the
  // neck reads solid would look like a modelling accident. Matches railRun()'s
  // own extents exactly so the two sit in one plane.
  // Withdrawn too: pier-railings-parapet.js builds the head balustrade at these
  // same two offsets, from frames that actually show the head. This module's
  // own comment admits the head screen was INFERRED from neck frames.
  // picketRun(128, 262, HEAD_W[0] + 0.4);
  // picketRun(128, 262, HEAD_W[1] - 0.4);
  // VERIFY FIX: and its posts, which were missing entirely. Without them the
  // whole head balustrade was one floating band with a 0.10 m daylight gap
  // under it, and it read differently from the neck for no reason.
  // picketPosts(132, 258, HEAD_W[0] + 0.4);
  // picketPosts(132, 258, HEAD_W[1] - 0.4);

  // =========================================================================
  // 3. LAMP COLUMNS  - REBUILT 2026-08-20
  // =========================================================================
  // THE COLUMNS ARE THE NECK'S ONLY SKYLINE. From the water the deck edge is a
  // solid parapet and the canopy behind it is 3.35 m of pale band; over 128 m
  // nothing else stands above the line. So the lamps carry the whole sense of
  // scale, and this build had two GEOMETRY errors that between them made every
  // one of them invisible from every camera the game is judged on. Both were
  // found by rendering the five cameras and looking, not by argument.
  //
  // ⚠️ ERROR 1: THE LANTERN STOOD 0.15 m ABOVE THE CANOPY RIDGE, and the
  // canopy is nearer the water than the lamps are, so 0.15 m is not enough.
  // Worked through for the arcade camera (26 m, eye 3.0 m, the closest of the
  // five): the ridge at o 0 is at y DECK+3.35 = 8.82 and subtends
  // (8.82-3.0)/26 = 0.2238 rad; the old lantern top at o -4.7 is at 8.97 but
  // 5 m further away, so it subtends (8.97-3.0)/31 = 0.1926. The lamp rendered
  // BELOW the roof it is supposed to stand over. Confirmed in the baseline
  // render: no lamp appears anywhere on the neck in approach, entrance or
  // arcade, and the only one visible in along-neck is 12 m from the camera.
  //
  // ⚠️ ERROR 2: EVERY LAMP WAS ON THE FLANK THE PLAYER NEVER SEES. Inverting
  // ctx.at, all five judged cameras stand at POSITIVE o - approach +87,
  // entrance +78, head +43, along-neck +30, arcade +26 - and every lamp was at
  // o = -4.7, i.e. across 10 m of pier and behind the far parapet.
  //   The -o choice was not a measurement and this file said so: it rested on
  //   "the lamps line the OPEN railed edge and the canopy occupies the other
  //   one". Section 7 then RE-MEASURED the canopy as 3.20 m wide and CENTRAL,
  //   which leaves open railed deck on BOTH flanks and removes the entire
  //   reason for the choice. Nothing replaced it, so the lamps stayed on the
  //   blind side by inertia.
  //
  // ---- SIDE: BOTH, STAGGERED. Now measured, not inferred ------------------
  // C:\claude\bournemouth-reference\bournemouth-pier\1074080244723412.jpg (the
  // owner's own elevated shot down the neck, 810x1440) settles it directly: it
  // shows a row of columns standing on the far deck edge BEYOND the shelter AND
  // two much larger ones on the near deck edge in front of it, interleaved
  // along the run. Lamps on both flanks. That also explains the pitch below.
  //
  // ---- PITCH: 22 m PER FLANK, 11 m APPARENT. f624, and it is the frame ----
  // ---- this file asked for -----------------------------------------------
  // The old comment retired the pixel counts and asked for "one frame shot
  // square to the neck from the beach with three consecutive columns in shot".
  // f624 is that frame - the neck almost square-on from the sand, six columns
  // in one view - and it is well conditioned because the deck-to-roof height
  // changes 60% across it, so the depth field is measurable rather than
  // assumed.
  //   METHOD. For points on a straight line under a pinhole, the apparent
  //   height of a fixed vertical (here deck line to roof top, px) goes as 1/z,
  //   and image x is then LINEAR in px. Measured px at four columns:
  //       x  20  110  230  288   ->   px  24  21  18  15
  //   least squares gives px = (762.6 - x)/30.8, r ~ 1 px.
  //   The six columns that break the roof line sit at x = 7, 92, 158, 213, 258,
  //   298, i.e. px = 24.53, 21.77, 19.63, 17.84, 16.38, 15.08. Station is
  //   affine in 1/px, and the five gaps in 1/px are
  //       0.00516  0.00501  0.00511  0.00500  0.00526
  //   - equal to 1.9% (coefficient of variation; the max-min spread is 5.2%).
  //   That part reproduces exactly on a re-run.
  //   ⚠️ BUT "no free parameter fitted to make them so" DOES NOT. THE SELECTION
  //   IS THE FREE PARAMETER, and an independent re-measure of the same frame
  //   2026-08-20 found it. Summing the darkness deficit over the 12 rows above
  //   the local roof line, column by column, f624 carries at least ten posts
  //   breaking that line, not six:
  //       x    7   29   34   92   99  159  205  214  246  258  298
  //       sig 349   82   38  196   83  204   60  132   46   93   55
  //   The six taken above are 7 / 92 / 159 / 214 / 258 / 298 - and x = 29 (82)
  //   and x = 99 (83) are STRONGER than the accepted x = 298 (55) and about
  //   level with the accepted x = 258 (93). Adding them destroys the even
  //   spacing: the eleven gaps in 1/px run 0.0012 to 0.0053, not 0.0050-0.0053.
  //   So the 11 m pitch is a reading of the six STRONGEST posts, not of every
  //   post in the frame, and it is only safe if the weaker ones are the far
  //   flank seen past the shelter - which is consistent with two staggered rows
  //   but is NOT demonstrated by this frame. Treat 11 m as measured to a factor
  //   of about two, not to 1.9%. What IS solid is that a straight 22 m single
  //   row cannot produce six evenly spaced posts across 56 m of this frame.
  //   Converting through the depth field (camera 63 m
  //   off the near edge, f ~ 462 px for a 360x640 portrait phone frame) gives
  //   11.3 m of pitch, and 12.5 m if f is taken 20% longer. NOT 22 m.
  //   BUT a side elevation cannot tell the two flanks apart, and two rows at
  //   22 m staggered by 11 m project to exactly this. That reading keeps the
  //   22 m per flank this file has always carried, agrees with the owner photo
  //   above, and is what a central canopy demands - it splits the deck into two
  //   separate walkways and each has to be lit. Built as 22 m per flank,
  //   staggered: s 12 at -o, 23 at +o, 34 at -o ... 122 at -o. Eleven columns.
  //
  // ---- HEIGHT: DECK + 4.60 m to the top of the lantern --------------------
  // The old 3.50 came from three horizon-normalised reads on ON-DECK frames
  // (2.9 f618, 3.5 f685, 3.9 f651). Those are retired, and the reason is not
  // that they are noisy: in all three the column BASE is out of frame, so the
  // station is unknown and the 1.10 m railing used as the ruler is at a
  // different distance from the lamp. Every frame that sees the lamp AND the
  // canopy in one view contradicts them, because 3.50 puts the lantern below
  // the 3.35 ridge and all of them show it clearly above.
  //   The measurement that needs no camera solve at all is the CLEARANCE over
  //   the canopy roof, read as a fraction of the deck-to-roof height in the
  //   same image column:
  //     own photo 909322331199205.jpg (2048x1152, SUNNY, the neck seen from the
  //       beach - obliquely, not square-on; the neck runs off to the right of
  //       the head and the reading below is taken on it at x 1650-2048): roof
  //       top row 632, deck row 660, lantern top row 620.5 -> clearance
  //       11.5 px on 28 px = 0.411 x 3.35 = 1.38 m.
  //       ⚠️ THE "= 0.394" WRITTEN HERE WAS ARITHMETIC, NOT A READING: 11.3/28
  //       is 0.4036 and 632-620.5 is 11.5, not 11.3. Independently re-measured
  //       2026-08-20 off the same file - roof 632.5, lantern 622.5, deck 659 -
  //       gives 10.0 px on 26.5 = 0.377 -> 1.26 m. So the honest bracket from
  //       this frame is 1.26-1.38 m, and the built 1.25 m sits just under it.
  //     f624, five columns: 6-11 px on 15-24.5 px = 0.398..0.459 -> 1.33..1.54
  //       of the ROOF-line clearance, 1.00 m once the roof's extra 4.3 m of
  //       depth is taken off
  //     f542: 21 px on 26 px, the loosest of the three
  //   Absolute solves, each carrying its own camera height and focal length:
  //     f624 (5 columns, D 63 m)                  4.27 - 4.45 m
  //     own photo 909322331199205 near flank      4.67 m
  //     own photo 909322331199205 far flank       5.07 m   (bases are hidden
  //                                                behind the shelter roof, so
  //                                                far is the likelier reading)
  //     f651 on-deck, ruler at the same station   4.32 m
  //     f542 (one column, flank unknown)          5.1 - 6.5 m   <- the fifth
  //   ⚠️ THE FIFTH SOLVE WAS MISSING FROM THIS LIST while the line under it
  //   said "the median of five". It is restored above, because leaving it out
  //   also made the spread look tighter than it is. With all five, midpoints
  //   4.36 / 4.67 / 5.07 / 4.32 / 5.80 -> median 4.67, which is the number
  //   quoted; the median of the FOUR that were listed is 4.51.
  //   Built at 4.60. Two things this used to claim and does not:
  //     - NOT "inside every one of those". 4.60 is above f624's 4.27-4.45 and
  //       below f542's 5.1-6.5. It is inside the 909 pair and above f651.
  //     - NOT "five solves that agree to +-0.4 m". The five span 4.27 to 6.5.
  //       +-0.4 m round 4.60 excludes f542 outright and clips 909's far flank.
  //       The omissions list at the bottom of this file already says the height
  //       is not established to better than +-0.4 m; this line contradicted it.
  //   What survives, and it is what the build rests on: 4.60 gives 1.25 m of
  //   clearance over the 3.35 ridge against 1.26-1.38 m re-measured in 909 and
  //   ~1.00 m from f624, and a 4.6 m column is a standard UK 5 m lighting
  //   column allowing for the lantern. NOT a LIDAR number, and the sign of the
  //   old error is the part that is not in doubt - 3.50 put the lantern UNDER
  //   the roof it stands over, and every frame shows it clear of it.
  //
  // ⚠️ NOT A COLOUR CHANGE, AND THAT WAS CHECKED FIRST. C.pierRail renders at
  // 0.57 of sky in this scene; f542's lamp columns measure 0.56-0.62 of their
  // own sky once the sub-pixel blur is divided out (darkest column pixel 128 on
  // a 191 sky over a ~1.5 px column sampled in 2 px). The value was already
  // right. What was wrong was the silhouette.
  //
  // OFFSET: o 5.02, i.e. 0.20 m inboard of the parapet's inner face at 5.22,
  // which is where a column bolted through the deck beside a wall stands. It is
  // also 0.06 m outboard of pier-people-scale.js's walker cap (centre 4.62 plus
  // a 0.27 m shoulder = 4.89), so no figure walks through a column.
  const LAMP_O = NECK_HALF - 0.48;
  const lampColumn = (s, off, board) => {
    // Inboard is -o on the east flank and +o on the west, so every offset below
    // is written as a signed reach rather than as a fixed sign.
    const din = off > 0 ? -1 : 1;
    const span = (a, b) => [Math.min(a, b), Math.max(a, b)];

    // Tapered shaft, 0.14 m at the root to 0.10 m at the top - the standard
    // root/top pair for a 5 m column, and consistent with f542's column
    // reading 1-1.5 px at 9.2 px/m. The two segments overlap by 80 mm so their
    // ends are never coplanar. The bottom face at DECK is buried inside the
    // timber wearing course (section 1), which is the case it was laid for.
    pbox(s - 0.07, s + 0.07, off - 0.07, off + 0.07, DECK, DECK + 2.30, C.pierRail, P);
    pbox(s - 0.05, s + 0.05, off - 0.05, off + 0.05, DECK + 2.22, DECK + 4.34, C.pierRail, P);

    // The swan neck that throws the lantern inboard over the walkway, in two
    // steps. f645 and f651 both show the lantern offset from the column axis
    // and canted; 1074080244723412.jpg shows the curve clearly on the near
    // column. The CANT is still not built - pbox is axis-aligned in pier space.
    const [a1, b1] = span(off + din * 0.02, off + din * 0.16);
    pbox(s - 0.042, s + 0.042, a1, b1, DECK + 4.18, DECK + 4.30, C.pierRail, P);
    // Carried to 4.46 so it laps 20 mm INTO the lantern's lowest slab without
    // matching any of its faces - the same fix as VERIFY FIX 1, which is what
    // stopped six lantern heads hanging detached against the sky.
    // VERIFY FIX (2026-08-20, second verifier): the inboard reach was 0.13,
    // which is exactly lc - 0.120, i.e. the same plane as the MIDDLE lantern
    // slab's inboard face - and s and y both overlap there, so every one of the
    // eleven columns carried a 0.072 x 0.015 = 0.00108 m2 shared face plane,
    // 0.0119 m2 over the run. The pass that built this asserted in the header
    // that every shared plane left in the file was in section 9; it was not.
    // 0.135 clears the lantern's 0.120 and 0.150 half-widths by 15 mm either
    // way and changes no measured dimension - the swan neck is inferred.
    const [a2, b2] = span(off + din * 0.135, off + din * 0.30);
    pbox(s - 0.036, s + 0.036, a2, b2, DECK + 4.26, DECK + 4.46, C.pierRail, P);

    // THE LANTERN IS A FLAT ELLIPSE, NOT A BOX, and it is now sized off the
    // only frame that resolves one against clean sky at a known scale:
    // 909322331199205.jpg at 10x shows a flat disc 5.5 source px across and
    // 1.5 px thick where the scale is 8.6 px/m -> 0.64 x 0.17 m. Built 0.62
    // long by 0.30 across by 0.16 thick. Three nested slabs approximate the
    // ellipse in plan, each inset 5 mm in y so no two faces are coplanar.
    const lc = off + din * 0.25;
    pbox(s - 0.310, s + 0.310, lc - 0.085, lc + 0.085, DECK + 4.440, DECK + 4.600, C.pierRail, P);
    pbox(s - 0.265, s + 0.265, lc - 0.120, lc + 0.120, DECK + 4.445, DECK + 4.595, C.pierRail, P);
    pbox(s - 0.185, s + 0.185, lc - 0.150, lc + 0.150, DECK + 4.450, DECK + 4.590, C.pierRail, P);

    // The information / warning board bolted to the column, facing ALONG the
    // deck: a dark blue header band over a yellow hazard panel. f651 puts it at
    // 0.44-0.71 of that column's own height; 1074080244723412.jpg puts a board
    // on its near column at 0.23-0.49. Built at 2.05-3.00 m, which is f651's
    // band on a 4.60 m column (2.02-3.27) trimmed at the top, and which also
    // clears pier-people-scale.js's tallest figure - adultH is ADULT 1.75 plus
    // up to 0.09 of jitter, so DECK+1.84, and the board starts at DECK+2.05.
    // No board can contain a face any more, which the old 1.55-2.20 band could:
    // it sat at adult head height exactly, and pier-people-scale.js:308-311
    // still carries an APRON_KEEPOUT box written to dodge it. That keepout is
    // now stale in the safe direction - it excludes more deck than it needs to -
    // so it is left alone rather than chased into another module.
    // Narrowed 1.10 -> 0.90 m for the same reason: at 1.10 the panel reached
    // o 3.97, well inside the walkers' strip.
    // On alternate columns only - the frames show boards on some, not all.
    if (board) {
      // -0.062 and -0.020, not -0.05 and -0.05. At -0.05 the yellow panel's
      // outboard face landed in the plane of the shaft's upper segment (off
      // +- 0.05) with s and y both overlapping - 0.046 m2, the largest shared
      // plane this file has ever had, and it would have shipped had the
      // pairwise audit not been re-run. Both reaches are now inside the lower
      // shaft (off +- 0.07) and match no face of either segment; the two panels
      // also differ from each other in o so they cannot fight where they lap.
      const [c0, c1] = span(off + din * -0.062, off + din * 0.85);
      const [d0, d1] = span(off + din * -0.020, off + din * 0.90);
      pbox(s - 0.058, s + 0.058, c0, c1, DECK + 2.05, DECK + 2.68, C.helterYellow, P);
      pbox(s - 0.064, s + 0.064, d0, d1, DECK + 2.64, DECK + 3.00, C.pierBanner, P);
    }
  };
  // ---- PITCH CORRECTED 2026-09-18 (tmp-tr97): 22 m per flank -> 13 m -------
  // 6.5 m of apparent pitch out of two 13 m rows, not 11 m out of two 22 m
  // rows. THREE INDEPENDENT READINGS NOW AGREE AND THE OLD 22 IS THE OUTLIER:
  //   1. E4, "Bournemouth Pier from beach.mp4" @7.6 s, the only SCALED
  //      square-on elevation (21.5 +-1.5 px/m over x 900-1700, tr37). Lamp
  //      posts break the roof line at source x 920, 1115, 1242, 1390, 1535,
  //      1650; the gaps are 195/127/148/145/115 px = 9.1/5.9/6.9/6.7/5.3 m
  //      APPARENT. Two staggered rows put that at about 13 m per flank.
  //   2. tr37 ARCHES.md section 4, read independently off the same clip:
  //      "staggered between the two deck edges, at about 12-14 m pitch along
  //      each edge".
  //   3. THIS FILE'S OWN RE-MEASURE OF f624, 300 lines above. It found ELEVEN
  //      posts breaking the roof line across 56 m of that frame, not the six
  //      the 11 m figure was fitted to, and said in terms: "Treat 11 m as
  //      measured to a factor of about two". Eleven posts over 56 m is 5.1 m
  //      apparent, which is the same answer as 1 and 2.
  // The 22 m row was a reading of the six STRONGEST posts in one frame. The
  // alternation is unchanged and is still why this is one loop rather than two.
  let lampIndex = 0;
  for (let s = 12; s < 128; s += 6.5) {
    lampColumn(s, (lampIndex % 2 === 0 ? -1 : 1) * LAMP_O, lampIndex % 3 === 0);
    lampIndex++;
  }

  // =========================================================================
  // 4. LITTER BIN
  // =========================================================================
  // 1.40 x 0.61 x 0.61, a modern seafront compacting-bin profile with a red
  // branded decal, standing hard against the railing. Height from the horizon-
  // normalised ratio against the 1.10 m railing in f685 (1.37 x), plan width
  // from the 148 px/m transverse scale in the same frame.
  //
  // A SECOND BIN, 2026-08-20, and it is evidenced rather than assumed. The old
  // note said "exactly ONE was measured, near the neck/head junction - whether
  // there are others is unknown, so exactly one is built", and the omissions
  // list at the bottom refused a second. The owner's own photograph
  // C:\claude\bournemouth-reference\bournemouth-pier\1074080244723412.jpg shows
  // a bin standing against the balustrade in the MIDDLE of the neck, next to a
  // lamp column and nowhere near the head - a different station from the
  // measured one. Its height against the balustrade in that frame: the bin's
  // top stands 65 image px above the 1.10 m rail top where the rail itself
  // measures 165 px, so 1.10 + 0.43 = 1.53 m, which the built 1.40 is inside.
  // So: two bins, s 120 and s 62.
  //
  // WHICH FLANK. Never measured, for either bin - the photo shows a bin on the
  // open-deck side and section 7's central canopy makes BOTH flanks open deck,
  // so the frames cannot separate them. The measured bin is left exactly where
  // it was rather than moved on a coin toss; the new one takes +o, which is the
  // flank all five judged cameras stand on. That is a tie-break on an unmeasured
  // quantity, not a finding, and it is recorded as one.
  const litterBin = (bs, sgn) => {
    // 0.07, not 0.05: it clears pier-railings-parapet.js's inner face at 5.22,
    // and it used to clear pier.js's neck rails (+-0.045 posts, +-0.05 rails,
    // +-0.09 cap) before those were deleted. The lid oversails 30 mm to 5.16,
    // still 60 mm clear of the wall.
    const oOut = sgn * (RAIL_O - 0.07);         // face nearest the parapet
    const oIn = oOut - sgn * 0.61;
    const o0 = Math.min(oOut, oIn), o1 = Math.max(oOut, oIn);
    pbox(bs - 0.305, bs + 0.305, o0, o1, DECK, DECK + 1.30, C.pierRoofDark, P);
    pbox(bs - 0.355, bs + 0.355, o0 - 0.03, o1 + 0.03, DECK + 1.28, DECK + 1.40, C.pierRoofDark, P);
    pbox(bs - 0.29, bs + 0.29, oIn - 0.02, oIn + 0.02, DECK + 0.55, DECK + 1.05, C.helterRed, P);
  };
  litterBin(120, -1);       // the measured one, left where it was
  litterBin(63.5, +1);      // 1074080244723412.jpg, mid-neck; +o so it is seen
  // ⚠️ THE "HALF-FIXED" NOTE THAT USED TO END THIS SECTION IS OBSOLETE, and it
  // is removed rather than left to mislead (2026-09-18, tmp-tr97). It argued
  // that a 1.40 m bin shows only 0.25 m above "the DECK+1.15 coping", and
  // recommended raising it to 1.53 m to buy back 0.13 m of silhouette. THERE IS
  // NO COPING. tmp-tr43 removed the solid parapet from
  // pier-railings-parapet.js and put an open picket railing back in its place,
  // so the whole 1.40 m of this bin now stands against 0.18 m of daylight and
  // 0.92 m of 21%-coverage picket. The bin is a visible object again at its
  // measured height, which is the case the 1.40 m f685 reading was taken for,
  // and raising it to chase an obstruction that no longer exists would be
  // spending a measurement to fix a stale comment. Height LEFT AT 1.40.

  // =========================================================================
  // 5. COIN-OPERATED PEDESTAL TELESCOPE
  // =========================================================================
  // Royal blue, 1.5 m overall: a drum plinth about 0.55 across by 0.35 tall, a
  // column, and the binocular head. 1.6 x the adjacent railing in f645, held
  // down slightly because it stands about 0.6 m nearer the camera than the
  // railing it was measured against - low confidence throughout.
  // ITS STATION IS UNKNOWN. It is on the neck, against the railing, with the
  // town skyline behind it so it looks back at the land. s 96 is a placement,
  // not a measurement. The drum is built square: at 0.55 m across, from the
  // water, a 12-sided drum costs 12 boxes to look identical.
  //
  // MOVED TO +o, 2026-08-20. Its FLANK was never measured either - f645 shows
  // it against a railing with the town behind it, which fixes which way it
  // POINTS and says nothing about which edge it stands on - and with the canopy
  // central both edges are open railed deck. On -o it sat behind 10 m of pier
  // and a 1.15 m parapet from all five judged cameras, so the only saturated
  // blue object on a 128 m grey neck rendered nowhere. Same tie-break as the
  // second bin above, same status: a choice on an unmeasured quantity.
  {
    const ts = 96, to = RAIL_O - 0.35;
    pbox(ts - 0.275, ts + 0.275, to - 0.275, to + 0.275, DECK, DECK + 0.35, C.pierBanner, P);
    pbox(ts - 0.11, ts + 0.11, to - 0.11, to + 0.11, DECK + 0.33, DECK + 1.25, C.pierBanner, P);
    pbox(ts - 0.17, ts + 0.17, to - 0.25, to + 0.25, DECK + 1.23, DECK + 1.50, C.pierBanner, P);
  }

  // =========================================================================
  // 6. LIFEBUOY STATIONS
  // =========================================================================
  // A red post and a red/white ring on the railing (f645_07, f645_08, f685_05).
  // Physically small, but on a grey pier the only saturated colour along the
  // whole neck, so worth 5 boxes each. The ring is four bars in the plane of
  // the railing, alternating red and white, which is what a lifebuoy reads as
  // from any distance this game is played at. COUNT AND STATIONS ARE NOT
  // MEASURED - three, evenly spread, is a placement.
  //
  // ⚠️ HISTORY, CORRECTED 2026-09-18 (tmp-tr97). This block was rebuilt on
  // 2026-08-20 "for the edge that is actually there", meaning a 1.15 m SOLID
  // PARAPET: it moved the stations inboard to o +-5.09 to get them out of the
  // wall, and raised the ring to DECK+0.86..1.58 so that 0.43 m of it stood
  // clear of a coping at DECK+1.15. THAT PARAPET NO LONGER EXISTS - tmp-tr43
  // removed it and put an open picket railing back, from the owner's own
  // overcast under-neck video. Both moves happen to survive the change and the
  // geometry is LEFT ALONE, for reasons that are now different ones:
  //   1. o +-5.09 is 0.36 m inboard of the railing centreline at 5.45 and
  //      clears the posts (5.417-5.483) and the picket panel (5.4365-5.4635)
  //      outright, so the station is free of the edge rather than dug out of a
  //      wall. It is still inside pier-people-scale.js's walker reach (4.805).
  //   2. the ring at DECK+0.86..1.58 straddles the railing's top rail at
  //      DECK+1.10, which is where a seafront lifebuoy on an open railing
  //      actually hangs, and 0.48 m of it stands above the rail against sky.
  // COUNT AND STATIONS ARE STILL NOT MEASURED - three, evenly spread,
  // alternating flanks, is a placement. No frame in the set shows a lifebuoy
  // on the neck railing at a readable station.
  // FLANKS ALTERNATED for the same reason as the bin and the telescope: the
  // count is unchanged at three and the flank was never measured.
  const lifebuoy = (s, sgn) => {
    // The four bars lap at the ring's corners, so the uprights are made 10 mm
    // wider in o than the cross bars: at the corner the two would otherwise
    // present faces in one plane, and a red and a white face fighting over a
    // 7 cm patch is exactly the kind of flicker the eye finds on a grey pier.
    // The cross bars are also stopped 20 mm INSIDE the uprights (0.31 against
    // 0.33) so their end faces are buried rather than coplanar - the previous
    // build shared the s = +-0.33 planes six times over, which this file's own
    // pairwise audit missed.
    const oc = sgn * 5.09;              // 0.13 m inboard of the wall's inner face
    pbox(s - 0.05, s + 0.05, oc - 0.05, oc + 0.05, DECK, DECK + 1.72, C.helterRed, P);
    pbox(s - 0.33, s - 0.21, oc - 0.045, oc + 0.045, DECK + 0.92, DECK + 1.52, C.pierWhite, P);
    pbox(s + 0.21, s + 0.33, oc - 0.045, oc + 0.045, DECK + 0.92, DECK + 1.52, C.helterRed, P);
    pbox(s - 0.31, s + 0.31, oc - 0.035, oc + 0.035, DECK + 1.46, DECK + 1.58, C.helterRed, P);
    pbox(s - 0.31, s + 0.31, oc - 0.035, oc + 0.035, DECK + 0.86, DECK + 0.98, C.pierWhite, P);
  };
  lifebuoy(26, +1);
  lifebuoy(74, -1);
  lifebuoy(118, +1);

  // =========================================================================
  // 6b. THE ROUND DOMED LITTER BINS, and 6c. THE GENERIC SIGN BOARDS
  // =========================================================================
  // NEW 2026-09-18 (tmp-tr97), both from E1 - library
  // bournemouth-pier/1143360484462054.jpg, low sun, straight down the neck axis
  // (crop tmp-tr97/ev/_shelter_axial.jpg). LOW SUN, so FORM AND SIZE ONLY.
  //
  // BINS. E1 shows a PAIR of them, one on each flank at very nearly the same
  // station, hard against the railing near the landward end of the first
  // shelter run: dark round drums with a domed lid and a pale band near the
  // foot. They are NOT the same object as section 4's two bins, which came from
  // f685 and 1074080244723412 and are 1.40 m square-section compactors; these
  // are the ordinary round seafront bin, and a pier carries both.
  //   SIZE, same-frame ratio so perspective cancels: the right-hand bin spans
  //   y 512-620 = 108 px where a person standing 0.6 m from it spans y 520-700
  //   = 180 px. At ADULT 1.75 m that is 102.9 px/m, so the bin is 1.05 m tall
  //   and 40 px = 0.39 m across. Built 1.06 m to the top of the dome, 0.42 m
  //   diameter. LOW CONFIDENCE on the station - E1 resolves "near the start of
  //   the first shelter run", which is s 14-18, not a number.
  // Round, and built round: m.ctube(seg = 8) draws an 8-sided drum for 16
  // triangles, which is cheaper than the 3 boxes section 4's square bin needs
  // and is the right shape. The two bands overlap in y and differ in radius, so
  // no two faces are coplanar.
  const roundBin = (bs, sgn) => {
    const bo = sgn * (NECK_HALF - 0.43);          // 0.43 m in from the deck edge
    const q = ctx.at(bs, bo);
    m.ctube(q[0], DECK, q[1], q[0], DECK + 0.92, q[1], 0.21, C.pierRoofDark, P, 8);
    m.ctube(q[0], DECK + 0.10, q[1], q[0], DECK + 0.20, q[1], 0.225, C.helterYellow, P, 8);
    m.ctube(q[0], DECK + 0.88, q[1], q[0], DECK + 1.06, q[1], 0.175, C.pierRoofDark, P, 8);
  };
  roundBin(16.0, -1);
  roundBin(16.6, +1);
  roundBin(88.0, +1);

  // SIGN BOARDS. ⚠️ GENERIC BY RULE: a plain coloured panel on a post, with no
  // text, no logo, no mark and no business name anywhere on this pier. The
  // real boards carry operator and safety wording; reproducing any of it would
  // put a real business's name in the game, and at the ranges this is judged
  // from a board is a rectangle of colour either way.
  //   E1 and E5 (library video 1606837873553673.mp4, frames
  //   tmp-tr97/frames/1606837873553673_01/_03.jpg) both show slim posts at the
  //   deck edge carrying a portrait panel roughly a metre tall, pale with a
  //   coloured border, at chest-to-head height. E3 (library
  //   912848664179905.jpg, crop ev/_deck_912848664179905.jpg) shows a bigger
  //   landscape board on its own post at about 2.0-3.4 m, facing ALONG the
  //   deck. E2 (829290465869059.jpg) shows a small yellow-and-white one at
  //   about 2.2-2.8 m.
  //   Sizes are read against the 1.10 m railing at the same station in each
  //   frame and are good to about +-20%. Stations are placements, not
  //   measurements, and are spread so no two land in one camera's foreground.
  // The panel faces ALONG the pier (its normal is +-s), which is what all three
  // frames show and what makes it visible from a camera off the flank; a panel
  // facing across the deck would present its edge and cost 12 triangles for a
  // line. Post and panel differ in o at every face so nothing is coplanar.
  const signBoard = (ss, sgn, wide) => {
    const so = sgn * (NECK_HALF - 0.62);
    const hw = wide ? 0.62 : 0.34, y0 = wide ? DECK + 2.00 : DECK + 0.98;
    const y1 = wide ? DECK + 3.30 : DECK + 2.02;
    pbox(ss - 0.035, ss + 0.035, so - 0.035, so + 0.035, DECK, y1 - 0.06, C.pierRoofDark, P);
    pbox(ss - 0.022, ss + 0.022, so - hw, so + hw, y0, y1, C.pierWhite, P);
    pbox(ss - 0.030, ss + 0.030, so - hw * 0.88, so + hw * 0.88, y0 + 0.04, y0 + 0.22,
      wide ? C.helterRed : C.pierBanner, P);
  };
  signBoard(21.0, +1, false);
  signBoard(45.0, -1, true);
  signBoard(70.0, +1, false);
  signBoard(103.0, -1, false);

  // =========================================================================
  // 7. THE GLAZED SHELTER - three runs, TWIN-PITCH ridged roof, glazed sides
  // =========================================================================
  // REBUILT 2026-09-18 (tmp-tr97). tr38 replaced the old twin-pitch covered
  // walkway with a FLAT 3.2 m slab on a single central screen. The flat slab is
  // wrong and the central screen is wrong, and both are settled by the owner's
  // own footage rather than by argument.
  //
  // SUNLIT / LOW-SUN FRAMES BELOW ARE FORM ONLY. No tone is taken from them.
  //
  // E1, library bournemouth-pier/1143360484462054.jpg (2907x1441), low sun,
  // looking straight down the neck axis (crops tmp-tr97/ev/_axial_hi.jpg and
  // _shelter_axial.jpg): the roof is a continuous RIDGED twin pitch of
  // translucent panels divided by transverse glazing bars, with a pale eaves
  // fascia each side and a ridge capping. It is not a slab and it is not flat.
  // E2, library 829290465869059.jpg, the same shelter side-on from the beach at
  // deck level (crop ev/_deck_829290465869059.jpg): under the eaves a GLAZED
  // SCREEN of large panes in slim frames, under that a SOLID DADO panel, and
  // SEATS inside it with people on them; some bays carry poster panels; the
  // runs end on a plain post. E3, library 912848664179905.jpg, the same from
  // the other side, confirms the pane/bar rhythm and the roof underside.
  //
  // WIDTH, E1, measured rather than asserted: at the near end the roof spans
  // 495 px where the deck spans 1010 px, and the deck is 11 m, so 5.4 m
  // uncorrected. The roof plane stands ~3.5 m nearer a drone 10-15 m above the
  // deck, i.e. a 1.30-1.54x magnification, so the true width is 3.5-4.2 m.
  // Built 3.60 (HALF 1.80). That is at the top of the earlier pass's 3.20 and
  // of tr37's DSM "2-3 m", which 1 m cells understate on a thin roof.
  //
  // PITCH, E1: ridge (620,575), eaves (375,620) and (870,630) in the same crop,
  // so a half-width of 245 px against a rise of 47 px, about 11-15 deg. A
  // 1.80 m half-width at that pitch puts the ridge 0.35-0.50 m over the eaves.
  //
  // HEIGHTS, E4 (Bournemouth Pier from beach.mp4 @7.6 s, the only SCALED
  // square-on elevation, 21.5 +-1.5 px/m, tmp-tr37/ARCHES.md). Column
  // luminance profile at x 1150-1190, deck datum row 1822:
  //     rows 1745-1748  bright line, the topmost roof edge      +3.49 m
  //     rows 1761-1784  bright band, the glazing                +2.67 .. +1.75
  //     rows 1785-1793  dark line, the glazing foot / dado head
  //     rows 1794-1797  bright line, the railing top rail       +1.21 m
  // Built: eaves fascia DECK+2.86..3.06, ridge DECK+3.50, glazing head +2.62,
  // glazing foot +0.95, dado +0.06..+0.98. The topmost line lands on the
  // measured +3.49 and the glazing head on the measured +2.67 to 50 mm.
  //
  // THE ROOF SLOPES ARE STEPPED, NOT SLANTED, and that is a deliberate
  // approximation: pbox is axis-aligned in pier space, so a true slope needs
  // m.quad, which module-check's stub counts as zero triangles. Three steps per
  // side over a 0.44 m rise is 0.147 m per step - 0.5 px at the 150 m the pier
  // is judged from and 2.7 px at the closest judged camera (arcade, 26 m),
  // where the real roof's transverse glazing bars are themselves about that
  // size. Each step differs from its neighbour in BOTH o and y, so no two share
  // a face plane.
  //
  // SCREENS MOVED OFF THE CENTRE LINE to o +-1.70, which is where the photos
  // put them and where they have to be if the roof is to stand on anything. The
  // central screen tr38 built was a fin down the middle of an open deck.
  //
  // THE PANES STILL RENDER DARK AND THIS BUILD DOES NOT FIX IT.
  // Measured again this pass rather than repeated from tr43: the sun in this
  // scene resolves to 0.412 across the pier to the WEST (renderer.js:57 through
  // the pier axis), so the EAST face of anything on this pier is turned away
  // from the sun, and all five judged cameras stand at +o. On top of that
  // craft.js:873 runs a real shadow map and the roof shadows the screen under
  // it, so ndl and sh are both zero on the east glazing whatever normal it
  // carries. The picket panel's rotated-normal trick (pier-railings-parapet.js)
  // works only because that panel stands in the open at o +-5.45 where
  // sunShadow passes; it cannot rescue a surface under a roof. The albedo is
  // already at C.pierRail, which tr43 measured as within a few levels of the
  // ceiling. THE REMAINING ERROR IS THAT REAL GLASS IS TRANSPARENT AND THIS
  // SCENE HAS NO TRANSPARENCY - it belongs to craft.js, not here.
  // What this build DOES change for the better: the glazing is no longer 1.6 m
  // in from the canopy edge but 0.10 m in, so the only part of it the roof's
  // own overhang shadows is the top 0.12 m rather than all of it.
  //
  // Clearances: pier-people-scale.js walks figures at |o| 3.0-4.62 and seats
  // them at o 4.95; lamps, bins, lifebuoys and banners are at |o| >= 4.1. The
  // roof (|o| <= 1.80) and the screens (|o| 1.675-1.725) touch none of them.
  {
    const RUNS = [[13.0, 36.0], [38.0, 78.0], [80.0, 120.0]];
    const PITCH = 3.0;
    const HALF = 1.80;                 // eaves half-width, E1
    const SCR = 1.70;                  // screen centreline, 0.10 m in from the eaves
    const OVER = 0.15;                 // roof overhang past the end posts
    const EAVE_BOT = DECK + 2.86, EAVE_TOP = DECK + 3.06;
    const RIDGE_TOP = DECK + 3.50;
    const STEPS = 3;                   // steps per slope
    // TONE. Unchanged from tr43 and for the reason it recorded: overcast 0624
    // (tmp-tr43/ev/z0624_shelter.png, column x 110) reads sky 175, PANES 157
    // (0.90 of sky, the brightest thing on the pier), the frame round them -
    // posts, mullions, head beam, kick rail - DARK at ~65, railing 108, fascia
    // ~62. So glazing C.pierRail, frame C.pierRoofDark. The DADO is the one new
    // key: E2 shows a strong saturated blue panel below the glass, and
    // C.pierBanner is the only blue in the legal palette.
    const GLAZE = C.pierRail, FRAME = C.pierRoofDark, DADO = C.pierBanner;
    for (const [r0, r1] of RUNS) {
      const n = Math.max(1, Math.round((r1 - r0) / PITCH));
      const p = (r1 - r0) / n;
      // ---- the roof: an eaves fascia each side, then STEPS boxes per slope
      // climbing inboard to the ridge, then a ridge capping over the joint.
      for (const sgn of [-1, 1]) {
        const a = sgn * SCR, b = sgn * HALF;
        pbox(r0 - OVER, r1 + OVER, Math.min(a, b), Math.max(a, b),
          EAVE_BOT, EAVE_TOP, C.pierGreenCanopy, P);
        for (let k = 0; k < STEPS; k++) {
          const oA = sgn * SCR * (1 - k / STEPS), oB = sgn * SCR * (1 - (k + 1) / STEPS);
          const yTop = EAVE_TOP + (RIDGE_TOP - EAVE_TOP) * ((k + 1) / STEPS);
          pbox(r0 - OVER, r1 + OVER, Math.min(oA, oB), Math.max(oA, oB),
            EAVE_BOT + 0.04 * (k + 1), yTop, C.pierGreenCanopy, P);
        }
      }
      // The ridge capping: 0.16 m wide, lapping both top steps in y so its
      // bottom face is inside them, and stopped inside the roof at both ends.
      pbox(r0 - OVER + 0.02, r1 + OVER - 0.02, -0.08, 0.08,
        RIDGE_TOP - 0.06, RIDGE_TOP + 0.05, FRAME, P);
      // ---- the two glazed screens, and the seats inside them
      for (const sgn of [-1, 1]) {
        const c = sgn * SCR;
        pbox(r0 + 0.07, r1 - 0.07, c - 0.025, c + 0.025, DECK + 0.95, DECK + 2.62, GLAZE, P);
        pbox(r0 + 0.07, r1 - 0.07, c - 0.05, c + 0.05, DECK + 2.62, EAVE_BOT, FRAME, P);
        pbox(r0 + 0.07, r1 - 0.07, c - 0.04, c + 0.04, DECK + 0.90, DECK + 0.98, FRAME, P);
        pbox(r0 + 0.07, r1 - 0.07, c - 0.035, c + 0.035, DECK + 0.06, DECK + 0.92, DADO, P);
        for (let k = 0; k <= n; k++) {
          const s = r0 + k * p;
          pbox(s - 0.07, s + 0.07, c - 0.07, c + 0.07, DECK, EAVE_BOT, FRAME, P);   // post
          if (k < n) {                     // mullion: two panes per bay, E2
            const sm = s + p / 2;
            pbox(sm - 0.025, sm + 0.025, c - 0.04, c + 0.04, DECK + 0.95, DECK + 2.62, FRAME, P);
          }
        }
        // THE SEAT INSIDE, E2: a bench run against the dado, back to the glass,
        // facing out across the shelter. One slab - the legs are behind the
        // seat front from every angle a camera below the deck can reach, which
        // is the argument the deck-edge benches below are already built on.
        // Top at DECK+0.45, 0.42 deep, so a seated figure's 1.30 m crown (see
        // pier-people-scale.js zone B) clears the dado head at 0.98.
        const sa = c - sgn * 0.09, sb = c - sgn * 0.51;
        pbox(r0 + 0.35, r1 - 0.35, Math.min(sa, sb), Math.max(sa, sb),
          DECK + 0.39, DECK + 0.45, C.pierRoofDark, MAT.TIMBER);
      }
      // POSTER BAYS, E2: some bays carry a printed panel instead of glass. Two
      // per run on the +o face, which is the face every judged camera sees.
      // GENERIC - a plain panel, no text, no mark, no business name.
      // ⚠️ TONE SET BY LOOKING, AND THE FIRST CHOICE WAS REJECTED. Built first
      // in C.helterYellow, because E2's posters are strongly coloured prints.
      // Rendered (tmp-tr97/ev/ba_entrance.png, ba_arcade.png) that put a row of
      // saturated orange blocks along a grey neck at 155 m, reading as lit
      // windows - helterYellow comes through the shader at 187,143,24, which is
      // the most saturated warm key in the palette and much too strong for a
      // 1.2 m panel on a 40 m run. C.helterCream (192,183,161) is a printed
      // sheet catching the light, which is what a poster reads as at the range
      // this pier is judged from, and it keeps the BAY rhythm - the point of
      // building them at all - without inventing a colour nobody can see.
      for (const bk of [1, n - 2]) {
        if (bk < 0 || bk >= n) continue;
        const s0p = r0 + bk * p + 0.10, s1p = r0 + (bk + 1) * p - 0.10;
        pbox(s0p, s1p, SCR + 0.026, SCR + 0.055, DECK + 1.05, DECK + 2.35,
          C.helterCream, P);
      }
    }
  }

  // NO CONFLICT WITH pier-people-scale.js (re-checked 2026-09-17 for the
  // three-run shelter): its figures walk at |o| 3.0-4.62 and the shelter's
  // canopy stops at |o| 1.60, so every figure is on open deck.
  //
  // The blue-painted benches against the parapet. Two knots rather than a run:
  // the seating identified in the frames comes in groups with empty stretches
  // between, and pier-people-scale.js independently sits six figures at
  // o = 4.95 over s 52.4-54.2 and 78.6-80.4. Those figures used to sit on this
  // file's lean-to bench at o 4.50-5.12; with the canopy moved to the middle of
  // the deck that bench would have gone with it and left six torsos floating
  // 0.50 m above the boards, so the bench stays where the people are - which is
  // also where a seafront bench belongs, back to the parapet. Legs omitted:
  // they are behind the bench's own front board from every angle below deck.
  // BACK ADDED 2026-09-18 (tmp-tr97). The seat was one slab, which against a
  // solid 1.15 m parapet was all you could ever have seen of it. With that
  // parapet gone (tmp-tr43) the bench stands against an open railing, and E1
  // (library 1143360484462054.jpg, the axial frame) and E5
  // (tmp-tr97/frames/1606837873553673_03.jpg) both show a bench with a clear
  // BACK against the rail - the back is the part of a seafront bench that reads
  // at any distance, because it is the only vertical in it. 0.44 m of back
  // above a 0.50 m seat is a standard bench; the top lands at DECK+0.94, under
  // the top rail at 1.10, so it does not break the railing line.
  // Legs still omitted: they are behind the bench's own front board from every
  // angle below deck, and that argument is unchanged.
  for (const [b0, b1] of [[51.6, 55.0], [77.8, 81.2]]) {
    pbox(b0, b1, 4.42, 5.14, DECK + 0.38, DECK + 0.50, C.pierBanner, P);
    pbox(b0 + 0.05, b1 - 0.05, 5.00, 5.09, DECK + 0.50, DECK + 0.94, C.pierBanner, P);
  }

  // =========================================================================
  // 8. THE LANDWARD ENTRANCE KIOSK
  // =========================================================================
  // NOW GENUINELY OCTAGONAL, 2026-08-16. f599 and f590 both look down on this
  // from a drone and it is unmistakably an eight-sided glazed drum: chamfered
  // corners, a white frame with a mullion on every facet, dark glazing in the
  // upper panels and lit poster panels below, a dark signage band under the
  // eaves, a white eaves fascia, and a shallow pointed roof over it.
  //
  // THE ROOF IS NOT GREEN. This needs saying twice because two separate
  // sources say it is - pier.js builds it in C.copperRoof, and the brief for
  // this pass describes "a pointed GREEN roof". Sampled off f599 over rows
  // 216-231 the roof is p50 #393031: R > G, i.e. warm, and nowhere near green
  // in either the raw sample or after white balance. And it should be white
  // balanced, because f599 is an hour before sunset - the kiosk's OWN white
  // eaves fascia, six pixels below the roof in the same frame, samples #6C5F60,
  // so "white" is reading R/G = 1.14 warm. Divide it out and the roof is
  // #323031: a NEUTRAL DARK GREY. That is C.pierRoofDark, and it resolves the
  // ambiguity the previous pass left open (it had settled on C.pierRust, the
  // brown, and flagged that it could not rule out pierRoofDark). The green in
  // the sourced description belongs to the pier-HEAD building.
  //
  // SIZE, RE-MEASURED and it comes down. The two earlier estimates - 4.2-4.5 m
  // from adults standing beside it, then 3.6 m from a camera solve - both used
  // the horizon at row 129, and both are superseded by section 7's corrected
  // row 138 and the drone height that falls out of it (6.74 m above the deck,
  // cross-checked against a second frame). The vertical scale at the kiosk is
  // then (297 - 138) / 6.74 = 23.4 px per metre, and horizontal scale is the
  // same number because it is f/d either way. Measured off f599:
  //     roof, the widest thing on it   x 257..338 = 81 px -> 3.46 m
  //     drum body, rows 255-295        x 264..326 = 62 px -> 2.65 m
  //     base row 297, apex row 210     = 87 px          -> 3.72 m tall
  // A regular octagon presents 1.848 r across when a facet faces you, which is
  // what f599 shows (a central facet and a chamfer each side), so r_roof = 1.87
  // and r_body = 1.43. The roof therefore oversails by about 0.42 m, which is
  // large for a kiosk and is exactly what the crop looks like.
  //
  // BUILT WITH m.ctube(seg = 8), NOT WITH pbox. The previous pass reasoned that
  // an octagon was unaffordable because pbox is axis-aligned in pier space, so
  // each facet can only be drawn as the bounding box of its chord and the union
  // of eight of those IS the circumscribed square - 24 boxes to draw a square.
  // That is correct about pbox and it is the wrong primitive: ctube already
  // draws an n-sided prism in WORLD coordinates for 2n triangles, so a facetted
  // band costs 16 triangles against the square band's 12. Eight bands and the
  // roof come to 192 triangles for the whole kiosk. The ring's flats land on
  // the world axes rather than the pier's, 6.1 degrees out - invisible on a
  // 4 m drum, and the alternative is a square.
  // ctube is UNCAPPED, so the roof steps are open rings; the apex is closed
  // with one small pbox. Every band overlaps its neighbour in y and differs in
  // radius, so no two share a face plane.
  //
  // Centred at s 6.6. pier.js's old kiosk box at s 6-11 and its copper roof
  // slab are BOTH GONE as of 2026-08-16, verified against pier.js on disk
  // 2026-08-19, so the green fin that used to poke through this drum and the
  // grey wall stub running seaward to s 11 are gone with them. This drum now
  // stands alone at the pier entrance.
  //
  // RE-CHECKED 2026-08-19 and NOT changed, because the only new evidence is a
  // frame the project's own rules bar for colour. Sampled off the re-extracted
  // f599 the roof is p50 #3D3331 and the kiosk's own white eaves fascia is
  // #685858, so "white" is reading R/G = R/B = 1.18 warm; dividing that out
  // gives a roof of #343331, NEUTRAL DARK GREY, which reconfirms C.pierRoofDark
  // to within a bit. The poster band under the glazing white-balances to
  // #3A3943, a dark blue-grey, against the C.pierBanner #2E7FA8 it is built in
  // - a big miss, and C.pierRoofDark would be the closest key by RGB distance
  // (20 against pierLED's 38 and pierGlass's 52). It is LEFT ALONE anyway:
  // f599 is an hour before sunset and the drone looks seaward, so this face of
  // the kiosk is backlit and everything on it reads dark. Recolouring a panel
  // from a sunset frame is STATUS trap 5 exactly, and it is the mistake that
  // once got the whole palette darkened and rejected. A midday frame of the
  // entrance would settle it in one sample.
  {
    const ks = 6.6;
    const kp = ctx.at(ks, 0);                       // world XZ of the kiosk axis
    // r is the across-CORNERS half-width; across flats is 2 r cos(22.5) = 1.848 r.
    const band = (r, y0, y1, col) =>
      m.ctube(kp[0], y0, kp[1], kp[0], y1, kp[1], r, col, P, 8);
    // Bands bottom-up. Every height is a row read off the f599 crop divided by
    // the 23.4 px/m above, so they are measurements, not a proportioning
    // scheme; the rows are given so the next pass can re-read the same pixels.
    // Sitting ON the deck, not 0.10 m above it as an earlier version did; the
    // bottom face that produces is inside the timber wearing course, which is
    // the case the course was laid to cover.
    band(1.49, DECK, DECK + 0.20, C.pierWhite);           // plinth, rows 292-297
    band(1.45, DECK + 0.17, DECK + 1.10, C.pierBanner);   // posters, rows 271-292
    band(1.50, DECK + 1.06, DECK + 1.21, C.pierWhite);    // transom, rows 268-271
    band(1.43, DECK + 1.18, DECK + 1.97, C.pierGlass);    // glazing, rows 250-268
    band(1.51, DECK + 1.93, DECK + 2.06, C.pierWhite);    // head rail, rows 247-250
    band(1.47, DECK + 2.02, DECK + 2.38, C.pierRoofDark); // signage, rows 241-249
    // The narrow red strip under the eaves. The previous pass called this an
    // ORANGE fascia and reached for helterYellow; at 7x on f599 it is a red
    // strip UNDER a white eaves board, with the dark lettered band below it.
    // Confirmed numerically as well as by eye - R-G runs 19-26 across rows
    // 238-242 where the bands either side of it sit at 8-12. helterRed is the
    // palette's only red and is the honest key.
    band(1.53, DECK + 2.34, DECK + 2.47, C.helterRed);
    band(1.87, DECK + 2.44, DECK + 2.64, C.pierWhite);    // eaves, rows 236-239
    // Shallow pointed roof, four rings to the apex, plus a cap because ctube
    // has no ends. C.pierRoofDark for the reason set out at the top of this
    // section - measured neutral dark grey, NOT green and NOT the brown the
    // previous pass used.
    for (let k = 0; k < 4; k++) {
      const t0 = k / 4, t1 = (k + 1) / 4;
      band(1.84 * (1 - t0 * 0.88), DECK + 2.60 + 1.06 * t0, DECK + 2.64 + 1.06 * t1,
        C.pierRoofDark);
    }
    pbox(ks - 0.22, ks + 0.22, -0.22, 0.22, DECK + 3.64, DECK + 3.72, C.pierRoofDark, P);
  }

  // =========================================================================
  // 9. THE ORNATE CAST-IRON ENTRANCE GATES
  // =========================================================================
  // Black, scrollwork-headed gates and a screen across the full deck width,
  // immediately seaward of the kiosk - a genuinely Victorian-looking element in
  // an otherwise 1979 concrete pier, and a strong silhouette at the pier
  // entrance. 2.0 m high: 110 px against the 120 px of the adult standing at
  // the railing just beyond, corrected for his being nearer the camera. Low
  // confidence, and missing from pier.js entirely.
  //
  // Standing OPEN, with a 1.9 m gap on the centreline - which is how every
  // frame shows them, people walking through. Bars at 0.57 m rather than the
  // true ironwork pitch: at the entrance station, seen from the water, a denser
  // screen costs boxes to produce the same dark band. The scrollwork heads are
  // not attempted.
  {
    // 11.6 was set 0.2 m clear of pier.js's kiosk roof, which ended at 11.4.
    // That roof is gone; the station is kept because it is also 1.3 m clear of
    // the shelter's first post at s 13.0 (2026-09-17) and 5.0 m clear of
    // this file's own kiosk drum, and nothing measured put it anywhere else.
    const gs = 11.6;
    // GATE_O, not RAIL_O, 2026-08-20. At RAIL_O = 5.20 the two outer stiles
    // spanned o 5.07..5.33 and pier-railings-parapet.js's wall starts at 5.22,
    // so 0.11 m of each stile was buried in concrete - 0.07 m3 and the last
    // inter-module overlap this file had. 5.08 puts the outer face at 5.21,
    // 10 mm clear of the wall face rather than through it and not coplanar with
    // it either. The screen still lands on the parapet; it no longer enters it.
    const GATE_O = NECK_HALF - 0.42;
    for (const o of [-GATE_O, -0.95, 0.95, GATE_O]) {
      pbox(gs - 0.13, gs + 0.13, o - 0.13, o + 0.13, DECK, DECK + 2.30, C.pierRoofDark, P);
    }
    for (let o = -5.05; o <= -1.04; o += 0.57) {
      pbox(gs - 0.045, gs + 0.045, o - 0.03, o + 0.03, DECK, DECK + 2.00, C.pierRoofDark, P);
      pbox(gs - 0.045, gs + 0.045, -o - 0.03, -o + 0.03, DECK, DECK + 2.00, C.pierRoofDark, P);
    }
    // Carried 60 mm PAST the stile centreline, into the stile's own 0.26 m of
    // width. At exactly -GATE_O the rail's end face landed in the plane of the
    // outermost vertical bar's outboard face at -5.08 - the one shared plane
    // narrowing the screen created, 0.0126 m2 a side.
    pbox(gs - 0.06, gs + 0.06, -GATE_O - 0.06, -0.95, DECK + 1.86, DECK + 2.00, C.pierRoofDark, P);
    pbox(gs - 0.06, gs + 0.06, 0.95, GATE_O + 0.06, DECK + 1.86, DECK + 2.00, C.pierRoofDark, P);
  }

  // =========================================================================
  // 10. APRON SIGNAGE
  // =========================================================================
  // The yellow RockReef and orange Key West banner boards are fixed to the
  // RAILING OF THE LANDWARD APRON (f599_02) - not along the neck edge. I am not
  // confident enough to say a neck banner does not exist (the known-errors
  // header already records a signage band on the parapet), but the only banners
  // I could positively identify are these two, here, above deck level.
  // ⚠️ "which is where pier.js runs its blue banner" stood in this line until
  // 2026-08-20 and is FALSE: C.pierBanner does not appear in pier.js at all,
  // and pier.js loaded on its own with all six addPier*() imports stubbed
  // contributes ZERO vertices above the neck deck (s 0-128, |o| <= 5.5,
  // y > 5.6) - re-verified this pass, 4,288 vertices, none of them there. The
  // rest of the header's reading of pier.js does reproduce; this sentence did
  // not, and it was the reason given for leaving a neck banner alone.
  //
  // ⚠️ MOVED OUTBOARD 2026-08-20, and this was a real defect. At o +-5.24..5.28
  // both boards were INSIDE pier-railings-parapet.js's wall, which spans
  // 5.22..5.48 - 6 m x 0.8 m x 0.04 m each, 0.38 m3, and the larger half of the
  // 0.55 m3 of inter-module overlap module-check reports. A banner buried in a
  // concrete wall renders as nothing at all, which is why two 6 m coloured
  // boards at the pier root have never appeared in any render.
  // Now fixed to the wall's OUTER face: PAR_OUT is NECK_HALF-0.02 = 5.48, so
  // 5.485..5.545 stands 5 mm proud of it (no shared face plane) and stops
  // 0.15 m below the coping, which oversails to 5.525 over DECK+1.06..1.15 and
  // would otherwise clash. Nothing about the reading changed - only the face.
  const BAN_I = NECK_HALF - 0.015, BAN_O = NECK_HALF + 0.045;
  pbox(2, 8, -BAN_O, -BAN_I, DECK + 0.20, DECK + 1.00, C.helterYellow, P);
  pbox(2, 8, BAN_I, BAN_O, DECK + 0.20, DECK + 1.00, C.helterRed, P);

  // The free-standing black totem sign on the apron deck (f590_03).
  pbox(2.28, 2.52, 2.75, 3.65, DECK, DECK + 2.40, C.pierRoofDark, P);
  pbox(2.22, 2.29, 2.85, 3.55, DECK + 0.90, DECK + 2.20, C.pierWhite, P);

  // =========================================================================
  // DELIBERATELY NOT BUILT
  // =========================================================================
  // - THE PLANK JOINTS. Real, but they live on the deck TOP, and the camera
  //   never rises above 2.4 m against a 5.47 m deck, so no frame of this game
  //   can contain one. At the pitch settled this pass (0.16 m, section 1) a
  //   joint per board over the 10.4 m of course is 800 boxes, 9,600 triangles -
  //   more than the whole 7,000 budget for this file, for pixels that do not
  //   exist. And the shader already supplies the DIRECTION for nothing: the
  //   frozen V leaves fbm(u*60) grain running within 6 degrees of the boards.
  //   (The word "transverse" was in this line and is wrong - see section 1.)
  // - THE COVERED WALKWAY'S TRANSVERSE GLAZING RIBS. f599 looks straight down
  //   the roof and they are the clearest thing on it: pale bars running ACROSS
  //   the slope at roughly 1 m, which is what gives the roof its ridged read
  //   from the air. Not built. 111 m of run at 1 m needs two boxes per rib to
  //   follow the pitch, 222 boxes and 2,664 triangles, and from the water the
  //   roof is seen from BELOW and side-on where a 1 m rib is under a pixel at
  //   any range this game is played at. Worth revisiting only for a fly-over.
  // - THE FLUSH CIRCULAR WHITE DECK PLATES, up to 1.2 m across. Same reason:
  //   flush in the decking, invisible from below. Their purpose is unidentified
  //   anyway - access hatches or rooflights over the space below.
  // - BALUSTRADE BASE PLATES and canopy post base plates, for the same reason.
  // - THE SECOND, LOWER, RUSTY RAIL outboard of the white balustrade in places.
  //   It belongs to the lower landing-stage edge, and pier.js's landing stages
  //   are deliberately gap-toothed, so a continuous rail would float in the air
  //   where a section is missing. Needs the stage geometry to drive it.
  // - BENCHES ON THE OPEN NECK DECK. None were positively identified from the
  //   video stills. 1074080244723412.jpg now shows three of them plainly -
  //   backless slatted seats set against the shelter's dado, which is what the
  //   two runs in section 7 already are - so the SHAPE is confirmed. Still not
  //   extended: their rhythm along the run is not measurable in that one frame,
  //   and a bench seat at DECK+0.50 is 0.65 m BELOW the parapet coping, so
  //   extending the run buys the skyline nothing at all.
  // - EXTRA LIFEBUOYS beyond the measured three, and any lamp column spacing
  //   other than 22 m PER FLANK.
  //   ⚠️ THIS LINE USED TO FORBID A SECOND LITTER BIN AND ANY CHANGE TO THE
  //   LAMP SPACING, AND BOTH WERE OVERTURNED 2026-08-20 ON NEW EVIDENCE, not on
  //   a second opinion about the old evidence:
  //     the bin, by 1074080244723412.jpg, which shows one mid-neck where the
  //       measured one is at the neck/head junction - a different station, so a
  //       second bin is now observed rather than invented (section 4);
  //     the spacing, by f624, which is exactly the frame the old section-3 note
  //       asked for and could not find - the neck square-on from the beach with
  //       six consecutive columns in one view. It measures an 11 m apparent
  //       pitch to 1.9%, which two 22 m rows staggered by 11 m reproduce
  //       exactly, so the 22 m itself still stands (section 3).
  //
  // WHAT COULD NOT BE ESTABLISHED FROM THE FOOTAGE
  // - THE SHELTER'S LANDWARD END (updated 2026-09-17). The DSM puts it at s -4;
  //   the model's kiosk (s 6.6) and gates (s 11.6) occupy that stretch of the
  //   centre line, so section 7 starts at s 13.0. The roof-pitch note that stood
  //   here is void: the canopy is flat (frame "Pier from beach" @7.6 s).
  // - WHETHER THE PALE FLANKS IN f599/f657 ARE AN EAVES BEAM AT ALL. They could
  //   equally be the lit outer roof slope, or the open deck beyond the canopy.
  //   (VOID 2026-09-17: flat canopy, no eaves or gutter fascia now.) It was
  //   built as a 0.08 m white capping on the gutter fascia, which is the
  //   reading that costs the elevation almost nothing if it is wrong. A 0.42 m
  //   white beam is the reading that cost the canopy its whole read from the
  //   water, and that one IS now ruled out - f542 and f624 both show the roof
  //   band unbroken green from the glazing head up.
  // - THE DECK'S TRUE TONE. Both references (f590 #A79791, f599 #685551) are
  //   far less yellow than anything the timber texture can produce at the
  //   deck's height. The full arithmetic, and why the fix belongs in
  //   tools/gen-textures.mjs and not here, is in section 1.
  // - WHETHER THE CANOPY IS GLAZED OR SHEETED. f599's roof is uniform sage with
  //   pale bars; f636's soffit is pale and even. Either a translucent green
  //   glazing system or a sheeted roof with pale purlins fits. Built as a solid
  //   roof, which is the safer of the two from the water.
  // - THE KIOSK ROOF'S TRUE HUE. Measured neutral dark grey after white
  //   balance, and definitely not green, but f599 is the only frame that sees
  //   the roof at all and it is an hour before sunset. A midday frame would
  //   confirm C.pierRoofDark against C.pierRust properly.
  // - WHICH FLANK ANY SINGLE OBJECT STANDS ON. Not one frame in the set fixes
  //   it, and the reason is structural rather than bad luck: every usable frame
  //   is either a side elevation, which cannot separate the two flanks at all,
  //   or a drone shot down the axis, which shows both and identifies neither
  //   against a compass. Section 3's old "-o" was explicitly a RELATIVE
  //   arrangement and its anchor was deleted when section 7 made the canopy
  //   central. Where an object's flank is unmeasured and its count is one, this
  //   file now puts it on +o, and says so at the line: it is a tie-break on an
  //   unmeasured quantity in favour of the flank the game is played from, not a
  //   finding. What would settle it: one frame with a shadow of known time, or
  //   any frame that shows the LED screen and a lamp column together.
  // - THE LAMP HEIGHT TO BETTER THAN +-0.4 m. Five solves land at 4.27-4.45
  //   (f624), 4.32 (f651), 4.67 and 5.07 (the two flank readings of
  //   909322331199205.jpg) and 5.1-6.5 (f542, which is the loosest and depends
  //   entirely on which flank its one column is on). Built at 4.60, the median.
  //   What is NOT in doubt is the sign of the old error: every frame that sees
  //   a column and the canopy together shows the column well clear of the roof,
  //   and 3.50 put it under.
  //
  // ⚠️ AND ONE THING FOR ANOTHER FILE, FOUND WHILE MEASURING THE LAMPS AND
  // RECORDED HERE BECAUSE IT WOULD OTHERWISE BE LOST. Two of the owner's own
  // photographs contradict section 7's CENTRAL twin-pitch canopy:
  //     C:\claude\bournemouth-reference\bournemouth-pier\1074080244723412.jpg
  //     C:\claude\bournemouth-reference\bournemouth-pier\909322331199205.jpg
  // Both show the covered walkway as a MONO-PITCH LEAN-TO hard against ONE deck
  // edge - blue panelled dado, glazed upper, roof sloping away from the deck,
  // the pier's own edge beam directly under it - with the whole open timber
  // deck and its balustrade on the other side. In 909322331199205.jpg the lamp
  // columns' bases are hidden BEHIND that roof, which is only possible if the
  // shelter reaches the edge. Section 7 reached "central" from f599 (people on
  // open deck both sides, seen down the axis) and it is a careful, fully
  // documented reading, so this is NOT being changed from here on one pass's
  // say-so - and section 7 is what the lamp height above is calibrated against,
  // so overturning it would move that too. Flagged, not acted on.
}
