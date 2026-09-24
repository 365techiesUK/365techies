// BOURNEMOUTH PIER — railings and parapet.
//
// Two entirely different guarding systems, and the split is exactly at s=128.
//
//   NECK  (s 0-128.25) OPEN WHITE RAILINGS (2026-09-17, tmp-tr43; was a SOLID PARAPET).
//   HEAD  (s 128-252.4, TIP outline) an OPEN balustrade: dense white pickets under a broad
//                     DARK capping rail.
//
// pier.js built open post-and-rail along the whole length and called the neck
// parapet "known error 2" in its header. This module is that correction, plus
// the head railing rebuilt to the measured member sizes.
//
// EVIDENCE FOR THE SPLIT (frame 542, column sweep x=150..640): a continuous
// bright solid band from x=560 down to x=230, growing smoothly 25 -> 9 px as
// pure perspective with no step anywhere, and no baluster texture in it at any
// zoom. It vanishes at x=215-225, exactly where the arcade ends and the head
// trestles begin. Confirmed independently in 557, 558 and 566.
//
// EVERY NUMBER BELOW WITH MEDIUM OR HIGH CONFIDENCE comes from two features
// measured at the SAME station in the SAME frame, expressed as a ratio so
// perspective cancels. That is the only method that works on a video still —
// the zip tower reads 8 m against a sourced 18.3 m purely because it sits at
// the far end of a 260 m pier. Cross-station comparisons were refused here.
//
// WHY THE 1.10 m HEAD GUARDING HEIGHT IS TRUSTWORTHY (frame 562). The clear gap
// between balusters is 0.0939 of the overall height as a pure in-frame ratio.
// That ratio only lands on the 100 mm sphere rule if the overall height is
// 1.05-1.15 m: at 1.20 m the gap becomes 108 mm and fails Building Regs, at
// 1.00 m it is 94 mm and unusually tight. Independently, frame 568's waterline
// and silhouettes put a 1.73 m person against a 1.10 m rail with the tide at
// MHWS. Two unrelated routes, same number.
//
// ---------------------------------------------------------------------------
// 2026-08 PASS: EVERYTHING ROUND IS NOW ROUND.
//
// The owner's note was "looks blocky". The root cause across this whole scene
// is that a pbox — an oriented box in pier space — was the only primitive, so
// every thin round member got the bounding box of a cylinder. On a railing that
// is the single loudest "modelled" tell there is: a seaside balustrade is 100%
// round bar and round tube and NOTHING on it is square, so a run of square
// balusters under a square capping reads as a fence around a car park.
//
// m.ctube(ax,ay,az, bx,by,bz, r, col, mat, seg) draws a real round tube in
// WORLD coordinates. It is used here for the capping handrail, the top and
// bottom rails, every post, the landing-stage rails and posts, and the sign
// frame legs. The parapet, its coping, the signage band and lettering and the
// timber bench STAY as boxes — they are genuinely rectangular and a tube would
// be a worse lie than a box (see each in place).
// ⚠️ THE PICKET PANEL WAS ON THAT LIST AND IS NO LONGER A BOX. As of the
// 2026-08-20 pass it is two m.pushC/m.quad quads carrying a hand-derived
// shading normal, because a pbox's shading normal is not a choice this file
// gets to make — see the long block at PICKET_R.
//
// A ctube at seg=5 is TEN triangles against a pbox's twelve, so this pass made
// the file CHEAPER as well as rounder: 3,858 triangles against 4,068 before it.
// Round is not expensive here — it never was, we just had no primitive.
// (3,858 was that pass's total; the current total is at the foot of the file.)
//
// ⚠️ m.tube() (no c) must never be used: it calls push() not pushC(), so the
// colour and material arrays fall out of step with the vertices and the whole
// mesh corrupts with no error anywhere.
//
// WHAT THE HIGHER-ZOOM READ OF THE SAME FRAMES CHANGED, and what it did not:
//
//  CHANGED — the dark capping is a ROUND TUBE, not a 0.18 m flat board. The old
//  0.18 m was recorded in this file as "a VISUAL IMPRESSION, not a measurement"
//  from frame 531 at arm's length. At 3x on that same frame the member has no
//  top edge at all: it is a smooth cylindrical gradient with a highlight along
//  its upper surface, with graffiti scratched around the curve. Frames 524 and
//  652 (652 at 3x is the clearest close-up in the set, with a shackle clamped
//  round it) show the same cylinder. So the capping is a tube whose DIAMETER is
//  the 0.085 m the elevation thickness was already measured at in 562 — one
//  number now explains both readings instead of two numbers explaining one
//  each. Silhouette is unchanged (a tube of dia 0.085 is 0.085 tall in
//  elevation, same as the 0.08 board); only the plan width changes, 0.18 ->
//  0.085, and plan width is visible from the deck, never from the water.
//
//  CONFIRMED, so left alone — the 1.10 m height, the 0.16 m open gap under the
//  capping, the 1.22 m post pitch, the 0.125 m baluster pitch, the 2.4x
//  post-to-baluster hierarchy, and the solid neck parapet. None re-litigated.
//
//  REFUSED — a MID RAIL. The brief for this pass asked for one. Frame 562,
//  column x=240 (a clear gap between balusters, sea behind), reads 133-144
//  UNBROKEN from y=560 to y=647, i.e. from the underside of the top rail to
//  the top of the bottom rail with no bright band anywhere in between. There is
//  no mid rail on the head balustrade and one is not invented. The one place a
//  mid rail IS evidenced is the lower landing stage — frame 531's "2-3 plain
//  horizontal rails" — which had three (2026-09-16: that stage and its
//  railing are retired, no DSM support).
//
// ---------------------------------------------------------------------------
// 2026-08-03 PASS: CORNERS, END POSTS, AND THE STAIR RAKE.
//
// Four frames the file had never opened were read for this pass — 626, 685,
// 618 and 603 — and they settled three things and opened one.
//
//  THE MID-RAIL REFUSAL IS NOW CONFIRMED ON A SECOND FRAME, so it is closed.
//  Frame 626 (x 470-590, y 700-880, threshold L=150) resolves three individual
//  balusters at x 473-478, 502-508 and 532-538, and the columns BETWEEN them
//  read pure background for the whole 120 px from y=760 to y=879 — the entire
//  height from under the top rail to the bottom rail, with not one bright row
//  crossing. Two unrelated frames, same answer: there is no mid rail. This is
//  the second measured finding in this file that contradicts the brief it was
//  written to, and like the first it is not to be "fixed" back.
//
//  THE PANEL'S ERROR IS NOW A NUMBER, not an estimate. The same 626 region
//  gives baluster width 6 px on a 29.5 px pitch = 20.3% coverage, against the
//  21.6% the 0.027/0.125 section-and-pitch pair predicts. So the derived
//  numbers are right and the SOLID panel really is ~4.9x too opaque. Still not
//  fixable inside the budget (see PICKET_R) — but it is now measured twice
//  rather than reasoned once, which is what a future LOD pass needs.
//  ⚠️ 2026-08-20: BOTH COVERAGE FIGURES ARE NORMAL-INCIDENCE FIGURES, and this
//  paragraph did not say so. A run of balusters closes up as 1/cos of the view
//  angle, and from the water this pier is almost never seen square on: at the
//  head camera the visible run passes 68% closed at mid-frame and reaches 100%
//  landward of it. "4.9x too opaque" is true at one angle and an overstatement
//  at every angle the game is played from. See PICKET_R.
//
//  WHAT THE GAME'S OWN VIEWPOINT LOOKS LIKE (frame 603, shot from the water at
//  sea level — the only frame in the set taken from where this game is played).
//  At that angle the balustrade is NOT a bright white band. It is a faint
//  darker-than-sky lattice with people showing through it, because the sky
//  behind is brighter than the paint and four fifths of the run is void. That
//  is the same finding as the paragraph above arriving from the opposite
//  direction, and it is the strongest argument yet that the panel is the one
//  thing left in this file worth spending triangles on the day there are any.
//
//  TWO REAL GEOMETRIC DEFECTS FOUND AND FIXED, both for zero triangles:
//  open corners and a postless corner. Both are consequences of the switch to
//  round primitives and neither existed while everything was a box. See MITRE
//  and the post loop in openRun.
//
//  ONE THING I COULD NOT RESOLVE — frame 618. It is shot on timber pier deck
//  at the LANDWARD end (promenade and beach beyond, at a lower level) and it
//  shows an OPEN white balustrade with base plates, not a solid parapet. That
//  is in direct tension with the neck parapet this file builds from s=0. I
//  could not convert 618's viewpoint to a station — it could equally be the
//  entrance apron ahead of the arcade, or the head looking back — so NOTHING
//  WAS CHANGED. Recorded here so the next pass starts from the tension rather
//  than rediscovering it. Resolve it with a frame that shows the arcade arches
//  and the deck-level guarding in the same shot.
//
// ---------------------------------------------------------------------------
// 2026-08-21 PASS: VERIFICATION, NOT CHANGE. Nothing on this pier moved.
//
// The survey's number-one finding — "the neck balustrade is a solid opaque
// panel, a dark grey stripe where the real one wears a bright airy one" — was
// already answered by the 2026-08-20 pass, and this pass was sent to fix it
// again. It re-measured instead. All four cameras that see the balustrade land
// inside the reference band, the panel-vs-parapet seam that fix could have
// opened was mapped and is 0.05% of frame, and the one number the file was
// still getting wrong turned out to be its own triangle table. What changed:
//
//   1. `?railprobe=picket|parapet` — the previous pass's TEMP query flags are
//      promoted to a documented, permanent instrument and given the parapet,
//      because every brightness claim in this file is a claim about a specific
//      set of pixels and there is no way to identify them from a finished
//      frame. See MEASUREMENT PROBES at the head of the function.
//   2. The verification table, the A/B against `?pold=1`, and the correction
//      that this build's "before" is L 134, not the survey's 119 — the tree had
//      moved. See 2026-08-21 VERIFICATION.
//   3. The triangle table at the foot said 3,942 with the picket panels costing
//      96 as boxes. They have been quads costing 32 since 2026-08-20 and the
//      same pass wrote "the fix SAVES 64 triangles" 300 lines higher up. The
//      total is 3,878. Failure mode 4, caught by adding the nine other lines.
//   4. A measured defect in the NECK PARAPET, reported and deliberately NOT
//      fixed. See the foot of the file.
//
// NOT BUILT HERE, deliberately — see the note at the foot of the file.

export function addRailingsParapet(ctx) {
  const { pbox, at, m, C, MAT, DECK, NECK_HALF, HEAD_W, TIP, WALK } = ctx;
  // `at` and `m` are now load-bearing, not decoration: ctube works in WORLD
  // x/y/z while everything in this file is thought about in station/offset, and
  // at(s, o) -> [worldX, worldZ] is the only bridge. TIP_HALF and HEAD_TOP are
  // no longer destructured because nothing here reads them; the tip railing is
  // set out from HEAD_W and, seaward of s 240.2, from ctx.TIP (2026-09-16: the
  // head deck now ends in the DSM's chamfered, rounded tip at s 252.36).

  // A run either goes ALONG the pier (station varies, offset fixed) or ACROSS
  // it (offset varies), and one flag carries that through every helper below
  // rather than two near-identical bodies.
  //
  // There used to be a `seg` helper here that flipped a pbox's argument order on
  // the same flag. Its only caller was the picket panel, which is no longer a
  // pbox (see PICKET_R), so it is deleted rather than left as a helper nothing
  // calls.
  const ALONG = true, ACROSS = false;

  // =========================================================================
  // MEASUREMENT PROBES — query-string, inert without one, and PERMANENT.
  //
  // Every brightness number in this file is a number about a SPECIFIC SET OF
  // PIXELS, and there is no way to know which pixels those are from a finished
  // frame: the balustrade band, the parapet band and the deck fascia are three
  // pale-over-dark stripes stacked within about 20 px of each other at 200 m,
  // and STATUS.md trap 15 is the record of what happens when a percentage gets
  // attributed to the wrong one of them ("map a mask before you name it").
  // Painting one element flag red gives its exact pixel mask, and reading the
  // UNMODIFIED render through that mask gives that element and nothing else.
  //
  //   ?railprobe=picket     the picket panel in flag red
  //   ?railprobe=parapet    the neck parapet wall + coping in flag red
  //   ?pcol=r,g,b           override the picket colour, LINEAR 0..1
  //   ?pold=1               rebuild the picket panel as the pre-2026-08-20
  //                         pbox, for an honest A/B of the 2026-08-20 fix
  //                         (the same device as `?wdbg=nocloud` for the sky:
  //                         a real before, on this build, not a remembered one)
  //
  // The previous pass left the first three of these in marked "TEMP", with the
  // read sitting 460 lines down next to PICKET_LIFT. They are promoted here,
  // documented, and given the parapet — because this file's OTHER pale band,
  // 128 m of it, had never been masked at all and the 2026-08-20 fix moved the
  // balustrade 70 levels without anyone checking what it now sits next to.
  //
  // Deterministic: they read the URL and nothing else. No Math.random, no Date,
  // no performance.now — a probe render of a given URL is reproducible.
  const FLAG = [1, 0, 0];
  let PROBE = null, PICKET_OLD = false, RAILPROBE = '';
  if (typeof location !== 'undefined') {
    const q = new URLSearchParams(location.search);
    if (q.get('pcol')) PROBE = q.get('pcol').split(',').map(Number);
    PICKET_OLD = !!q.get('pold');
    RAILPROBE = q.get('railprobe') || '';
    if (RAILPROBE === 'picket') PROBE = FLAG;
  }

  // (a, c) in a run's own frame -> a WORLD point at height y. `along` decides
  // which of a and c is the station. Three lines, and they are the whole reason
  // a round member is expressible in this file at all.
  // 2026-09-16: along may also be an OBLIQUE frame {p: [s, o], u: [us, uo]}
  // (unit u), a = metres along u from p, c = metres to its left (-uo, us).
  const wp = (a, c, y, along) => {
    const q = typeof along === 'object'
      ? at(along.p[0] + a * along.u[0] - c * along.u[1], along.p[1] + a * along.u[1] + c * along.u[0])
      : along ? at(a, c) : at(c, a);
    return [q[0], y, q[1]];
  };

  // A horizontal round rail along a run, at height y.
  const rod = (a0, a1, c, y, r, col, mat, along, sides) => {
    const A = wp(a0, c, y, along), B = wp(a1, c, y, along);
    m.ctube(A[0], A[1], A[2], B[0], B[1], B[2], r, col, mat, sides);
  };

  // A vertical round post at (a, c), y0 to y1.
  const stanchion = (a, c, y0, y1, r, col, mat, along, sides) => {
    const P = wp(a, c, y0, along);
    m.ctube(P[0], y0, P[2], P[0], y1, P[2], r, col, mat, sides);
  };

  // =========================================================================
  // NECK, s 0-128.25: OPEN WHITE RAILINGS (built further down, after openRun)
  // =========================================================================
  // 2026-09-17 (tmp-tr43): the SOLID PARAPET, its coping, the dark signage
  // band and its 36 letter blocks are REMOVED. The owner's own overcast video
  // (bournemouth-reference/bournemouth-pier/1338723233808999.mp4 @ 82-90 s and
  // 128-136 s, looking up at the neck from the sand) shows daylight through
  // the whole neck edge: white posts, a white top rail, a bottom rail and dense
  // vertical pickets, with the glazed shelter visible THROUGH them. The
  // "continuous pale band" of frames 542/557/558 is that railing seen at
  // 150 m, and the "lettered dark band" of frame 566 is the glazed shelter
  // standing above the railing (0624 and 566 side by side: same dark band,
  // same height, windows in it). Owner photos outrank the survey frames.
  //
  // PAR_OUT survives ONLY as a station for the head junction runs at S_JUN,
  // which are head geometry and must not move (they were set out against the
  // wall's outer face and still close the neck/head corner at o +-5.48).
  const PAR_OUT = NECK_HALF - 0.02;

  // =========================================================================
  // HEAD AND TIP, s 128-252.4: THE OPEN BALUSTRADE
  // =========================================================================
  //
  // All from frame 562, all as ratios against the deck line at the SAME column:
  //
  //   dark capping top      1.10 m   (the overall guarding height)
  //   capping thickness     0.085 m  -> now read as a TUBE DIAMETER, see header
  //   post cap (domed) top  1.01 m   -> the capping is carried on the posts
  //   white top rail        0.84 m centre, 0.04 dia
  //   white bottom rail     0.18 m centre, 0.04 dia
  //   baluster              0.027 dia at 0.125 pitch  (~8 per metre)
  //   post                  0.066 dia at 1.22 m centres, 9 balusters per bay
  //
  // The post pitch and baluster pitch were re-checked on the raw pixels for this
  // pass and both hold: frame 562 row y=600 gives baluster centres 19 px apart
  // (19 / 155.9 px per m = 0.122 m) and a post 13 px wide against a baluster
  // 5 px wide (2.6:1, against the 2.44:1 the diameters above imply — the
  // difference is bloom on bright objects and applies equally to both).
  //
  // ARITHMETIC SLIP IN THE SOURCE SPEC, corrected here. It records the open gap
  // between the white top rail and the underside of the capping as 0.18 m, but
  // its own derivation is 25.1 px / 155.9 px per m = 0.161 m, and 1.02 - 0.86
  // (top rail upper edge) = 0.16 independently. The gap is taken as the
  // residual of the other two measurements, which agree: 0.16 m. Nothing spans
  // it — the column reads pure background 140 +/- 5 throughout. That open strip
  // of sky under the dark line is half of what makes a pier railing read as a
  // pier railing, so nothing may ever be put in it.
  const RAIL_R = 0.02;        // 0.04 m dia, top and bottom rails, same section
  const POST_R = 0.033;       // 0.066 m dia — 2.4x the baluster, a real hierarchy
  const POST_PITCH = 1.22;

  // CAPPING — a round tube of 0.085 m diameter, superseding the 0.18 m flat
  // board. The old figure was explicitly recorded in this file as "a VISUAL
  // IMPRESSION, not a measurement"; frames 531 and 652 at 3x show a cylinder
  // with no top edge, a highlight running along its upper surface and graffiti
  // curving over it, and 524 shows the same from a third angle. The diameter is
  // not a new measurement either — it is the 0.085 m ELEVATION THICKNESS this
  // file already measured in 562 (13.0 px / 155.9, identical at the post column
  // and mid-bay), which for a tube is the same number. Elevation silhouette is
  // therefore unchanged to within 5 mm; only the plan width moves, and plan
  // width is only ever seen from the deck.
  //
  // Still DARK STAINED TIMBER, not painted metal — 531 shows graffiti scratched
  // into it and it samples #48444E (562) / #564C54 (531). C.pierRoofDark
  // (#43484C) is the right key and MAT.TIMBER the right texture. The white
  // ironwork samples #E1D4D0 / #CBCCD0, which is C.pierRail (#D8D9D4), painted
  // metal, MAT.PAINTED.
  const CAP_R = 0.0425;
  const Y_BOT = 0.18, Y_TOP = 0.84, Y_POST = 1.02;
  const Y_CAP = 1.10 - CAP_R;   // tube AXIS, so the top of the tube is 1.10

  // THE PICKET INFILL IS A PANEL, NOT BALUSTERS — the one deliberate departure,
  // and the one box in the open runs that survives this pass.
  //
  // The real run is 0.027 m balusters at 0.125 m pitch over 334 m of railing:
  // 2,670 balusters. Even as ctubes at seg=3 (six triangles each, the cheapest
  // round thing that exists) that is 16,020 triangles, more than twice the
  // 7,000 budget for this whole file, and at seg=5 it is 26,700. It cannot be
  // built. Halving the density does not rescue it either: to keep the same
  // integrated brightness at 0.25 m pitch the balusters have to go to 0.054 m
  // diameter, which is nearly as fat as the posts and destroys the 2.4:1
  // hierarchy that is the most recognisable thing about this railing close up.
  //
  // The panel is 0.027 m thick, exactly one baluster, and sits in the baluster
  // plane.
  const PICKET_R = 0.0135;

  // =========================================================================
  // 2026-08-20 PASS: THE PANEL WAS NOT TOO OPAQUE. IT WAS UNLIT.
  //
  // The survey ranked this panel the single most visible remaining error on the
  // pier and asked for a colour: "a solid grey slab where the real railing is
  // 21.6% picket and 78.4% void", head camera balustrade band p50 L 119 with
  // 23% of pixels above L 180, against L 190 / 56% in the owner's photograph.
  // Both halves of that measurement reproduce here. The DIAGNOSIS does not.
  //
  // MEASURED FIRST, ON A MASK, BEFORE ANYTHING WAS CHANGED. Rendering the panel
  // in flag red gives an exact pixel mask of it in each judged camera; reading
  // the unmodified render through that mask gives the panel and nothing else:
  //
  //     camera      panel px   panel p50 L   panel p50 rgb    sky behind it
  //     head          10,034      117.1      119,117,113      183,204,216 (L 200)
  //     approach       1,304      122.8      123,123,120
  //     entrance       1,953      119.9      121,120,116
  //     along-neck     6,005      116.1      118,116,112
  //
  // The panel is DEAD FLAT — 119,117,113 on every row of every camera, and it
  // is WARM (B < R) under a sky that is cool (B > R). A flat value that does not
  // move with the view, with the ground-bounce tint at full strength, is the
  // signature of one thing: ndl = 0 and N.y = -1.
  //
  // THE CEILING, MEASURED NOT ARGUED. Re-rendering with the panel colour set to
  // pure white — the brightest vertex colour that exists, mesh-check rejects
  // anything above 1.0 — moves the same masked pixels to L 141.9 / 145.0 /
  // 143.2 / 141.1. So the whole span a colour can reach is L 117 -> L 142, and
  // the target is L 190. **NO COLOUR ON THIS PANEL CAN GET THERE.** The survey's
  // arithmetic (0.216 x 119 + 0.784 x 215 = 194) is right about the number and
  // wrong about the lever: it assumes a panel renders at the value it is
  // painted, and this one renders at 0.62 x ambient x albedo with no sun term
  // at all. This is the project's own failure mode 1 — "TWICE the cause was the
  // LIGHT" — arriving a third time.
  //
  // WHY THERE IS NO SUN TERM, from pier.js:255-265 and confirmed by the flat
  // render. pbox pushes EIGHT vertices: four at y1 with normal (0,+1,0) and
  // four at y0 with normal (0,-1,0), and then draws the four SIDE walls from
  // those same eight. So every vertical face of every pbox on this pier carries
  // a normal that points straight up at its top edge and straight down at its
  // bottom edge and never outward at all. craft.js:412 flips N toward the
  // camera, and this game's camera is at 1.6 m under a 5.47 m deck, so every
  // pbox side wall in the scene resolves to N = (0,-1,0): ndl = 0 always, and
  // `down` = 1 so the warm ground-bounce is applied at full strength. That is
  // the 119,117,113. It is not this file's bug and it is not fixed here — see
  // the note at the foot — but it is why the panel cannot be painted brighter.
  //
  // WHAT THE REAL RUN DOES, and it is not "21.6% void" either. Two things the
  // 21.6% figure leaves out, both of which this scene's fixed geometry decides:
  //
  //  1. COVERAGE IS VIEW-DEPENDENT. 0.027/0.125 = 21.6% is the NORMAL-incidence
  //     figure. Seen at an angle f off the run normal a run of balusters closes
  //     up as 0.027/(0.125 cos f). Every one of the five judged cameras sits off
  //     the pier's east flank looking obliquely along it: at the head camera the
  //     visible run spans f = 18 deg at the tip (coverage 0.23) to past 79 deg
  //     landward (coverage 1.00, i.e. genuinely solid), passing 71 deg — 68%
  //     closed — at mid-frame. The panel is 4.6x too opaque only where the run
  //     is seen square on, which from the water it almost never is.
  //  2. A BALUSTER IS ROUND, SO IT IS NEVER UNIFORMLY SHADED. sunDir
  //     (renderer.js:57) puts the sun 46.0 deg up and, resolved onto this pier's
  //     axis, 0.805 along it toward the tip and 0.593 across it to the WEST. The
  //     judged cameras are all EAST, so the flat panel's outward face is turned
  //     away from the sun — but the cylinders are not: the sun's azimuth is only
  //     55 deg from the head camera's own view azimuth, so a wide sunlit crescent
  //     of every baluster is in plain view. Integrating a Lambertian vertical
  //     cylinder over its visible half, projected-area weighted, gives a mean
  //     ndl of |Sh|(cos a (pi - a) + sin a)/4 for a view-to-sun azimuth a —
  //     0.545 with the sun behind the viewer, 0.359 at the head camera's 55 deg,
  //     0 backlit. The flat panel gives 0 at every angle. THAT is the missing
  //     light, and it is worth more than the void: 0.359 x 0.5 against an
  //     ambient term of 0.143 is a 2.3x lift before any void is added.
  //
  // Put both back and the arithmetic lands on the photograph. At the head
  // camera, pre-tonemap: 0.677 x (lit paint 0.305) + 0.323 x (sky 0.457)
  // = 0.354, which tone-maps to L 186 against the photograph's 190. The
  // survey's normal-incidence route gives 191 from the other end. Two routes,
  // four levels apart, and neither of them is reachable by painting a panel.
  //
  // THE FIX: give the panel the shading normal of the thing it stands in for.
  // A stand-in surface for unresolved geometry is supposed to carry that
  // geometry's aggregate response — that is what a shading normal IS — and this
  // one currently carries (0,-1,0), which is not the panel's geometric normal
  // either, just what pbox's shared vertices happened to leave behind. So the
  // panel stops being a pbox and becomes two quads pushed with an explicit
  // normal, one per face, each carrying the balusters' aggregate lit response
  // instead of pbox's leftover (0,-1,0).
  //
  // WHERE THE 60 DEGREES COMES FROM, and this was MEASURED WRONG FIRST. The
  // obvious normal is the sun's own azimuth: maximum ndl, 0.694. Built that way
  // and rendered, the head camera came back BIMODAL — p50 120.6 but mean 155.5
  // with 41.7% of the band above L 180 — and the entrance camera came back
  // WORSE than the pbox it replaced, 117.3 against 129.2. The cause is
  // craft.js:412 `if (dot(N, V) < 0.0) N = -N;`. A shading normal is only lit
  // over the 180 deg of viewing azimuth on its own side of that flip, and a
  // normal on the sun's azimuth puts that boundary 53.6 deg round from the pier
  // axis — straight through the middle of the head camera's own run. Half the
  // balustrade lit, half not, with a hard seam between them.
  //
  // So the normal is ROTATED AWAY from the sun, toward the face it belongs to,
  // which drags the flip boundary round with it at the cost of ndl:
  //
  //     rotation   ndl     lit sector of the 180 deg the face is seen from
  //        0 deg   0.694                30%
  //       45 deg   0.491                55%
  //       60 deg   0.347                63%
  //       75 deg   0.180                71%   (needs albedo 1.63 — impossible)
  //
  // 60 deg is where that trade stops: the colour needed to hold the target
  // brightness at ndl 0.347 is c = 0.93, and the vertex colour cannot exceed
  // 1.0 (mesh-check rejects it, and a(1.0) = 1.33 is the hard ceiling measured
  // at the top of this block). 60 deg leaves 7% of that headroom; 65 deg leaves
  // 1% and 75 deg is unreachable. It also puts the lit/dark step at 113.6 deg
  // off the pier axis, and the widest azimuth any of the five judged cameras
  // sees this panel at is 106.8 deg — so no judged frame contains the seam.
  //
  // AND THE TRUTH REALLY IS FLAT, which is why one constant is the right model.
  // Coverage and light trade off against each other exactly: as the view swings
  // off the run normal the balusters close up (cover 0.216/|sin theta|) and as
  // it swings toward the sun they light up. Evaluating
  // cover x paint x (ambient + f/2) + (1 - cover) x sky over the whole azimuth
  // circle gives L 180-193 everywhere except a +/-12.5 deg window at "looking
  // straight along the run, away from the sun", where cover hits 1.0 with no
  // light on it and the band collapses to L 120 — which is, exactly, the value
  // the old panel had at EVERY angle. The old panel was right for one view in
  // fourteen.
  //
  // COST: 4 triangles per run against pbox's 12. The fix SAVES 64 triangles.
  //
  // ⚠️ THE SUN IS BAKED IN HERE. SUN below must stay equal to renderer.js:57,
  // which is a PROTECTED value. If the sun ever moves, this normal moves with
  // it or the balustrade lights from nowhere.
  // ⚠️ module-check.mjs stubs m.pushC and m.quad, so it counts these 32
  // triangles as ZERO and will report this module 32 light. mesh-check's whole
  // -mesh total is the one to trust. The foot of this file states both.
  // =========================================================================
  // 2026-08-21 VERIFICATION. THE 2026-08-20 FIX IS IN AND IT LANDS. Re-measured
  // independently, on a tree that had moved under it, and it holds.
  //
  // METHOD, and it is the reason `?railprobe` is now permanent: paint the panel
  // flag red, take the exact pixel mask, then read the UNMODIFIED render
  // through that mask. Two figures per camera — the PANEL alone, and the whole
  // BALUSTRADE BAND, which is each column's panel span grown upward by 39.4% of
  // its own height so it reaches the top of the capping (0.18..0.84 -> 0.18..
  // 1.10) and therefore contains the capping, the posts and the open gap of sky
  // as well as the paint. The BAND is the honest number: it is what the
  // reference box contains.
  //
  //   camera      panel p50 L   BAND p50 L   BAND >L180   panel height px
  //   head           187.4        185.2        58.2%       1 / 13 / 30
  //   approach       193.3        190.0        65.4%       1 /  3 /  5
  //   entrance       191.1        187.2        64.9%       1 /  6 /  7
  //   along-neck     194.2        192.0        74.5%       1 / 22 / 33
  //
  //   photograph 763260589138714, three hand-placed boxes on the picket run:
  //     p50 L 197.7 / 193.7 / 198.0   and   >L180 64.6% / 60.2% / 60.7%
  //   (the survey quoted 190 / 56% from a box it did not record; three of mine
  //   bracket that, so both readings are of the same band.)
  //
  // FOUR CAMERAS, ALL INSIDE THE REFERENCE. The band lands L 185-192 against
  // 194-198, i.e. 2-7 levels low on a reference whose own band is 18-21% CLIPPED
  // (>=254 in some channel — STATUS trap 17), so a few levels low against a
  // clipped reference is the right side to miss on.
  //
  // THE A/B, on this build, not a remembered one. `?pold=1` rebuilds the old
  // pbox in the same frame: head BAND p50 134.4 with 8.4% above L 180, against
  // the quads' 185.2 / 58.2%. Fifty-one levels and seven times the bright share.
  // ⚠️ NOTE THE OLD PANEL MEASURES 134, NOT THE 117-119 THE SURVEY RECORDED.
  // The survey's frames are three hours and several other agents' commits old;
  // craft.js and shaders.js both moved in between. The DEFECT was real and the
  // FIX is real, but do not quote 119 as this build's "before" — quote 134, or
  // re-run `?pold=1` and quote what it gives you today. This is exactly why the
  // ablation is a URL flag and not a paragraph.
  //
  // WHAT IS STILL NOT RIGHT, MEASURED: at the along-neck camera the panel is
  // 22-33 px tall — 6-10 m away — and there the band is 74.5% above L 180
  // against the reference's 60-65%. Its p50 is right; its VARIANCE is not,
  // because a flat quad has none and a real run at 6 m resolves its pickets at
  // about 19 px pitch. That error cannot be closed with a colour, only with
  // 16,020 triangles, and it costs 10 points of bright share on the one camera
  // in five that stands that close.
  // ⚠️ AND THE SURVEY'S OWN REMEDY FOR IT IS BACKWARDS. It says "it is only
  // right beyond ~40 m, keep the current panel value inside that". Inside 40 m
  // the run is seen closer to SQUARE ON, so coverage falls to 0.216 and the
  // band is MOSTLY SKY — brighter, not darker. The azimuth integral above says
  // the same thing and the along-neck camera measures it: 192.0 at 6-10 m
  // against a reference of 194-198. Fading this panel back toward its old dark
  // value at close range would make the nearest camera worse. Do not do it.
  //
  // THE SEAM WAS CHECKED, because a fix that moves one band 51 levels has to be
  // checked against the band it butts into. `?railprobe=parapet` gives the neck
  // parapet's mask, and the parapet's outer face is set 20 mm inboard of a deck
  // edge that stands between it and a camera at 1.6-4 m, so from the water
  // almost none of it is ever seen. There IS a defect there and it is NOT this
  // pass's to fix — see the note at the foot of the file.
  //
  // ⚠️ CORRECTED 2026-08-21, SECOND VERIFICATION PASS. This paragraph used to
  // read "181 / 162 / 170 / 3 px in the four cameras ... 0.05% of frame", from
  // counting pixels that pass the flag test (r > 90, g < 60, b < 60). THAT IS A
  // CORE MASK, NOT A FOOTPRINT, and on this element it is wrong in both
  // directions. The parapet is a few-pixel sliver behind the deck edge, so most
  // of the pixels it touches are PARTIAL COVERAGE — the flag colour arrives
  // diluted by whatever else is in the pixel and never reaches the threshold —
  // while unrelated dark-warm pixels elsewhere in the frame pass the test with
  // no probe running at all. The mask that cannot lie is the DIFFERENCE between
  // the probe render and the clean one, and it says:
  //
  //   camera      flag-test px   TRUE px (probe minus clean)   % of frame
  //   entrance         189                  594                  0.166%
  //   along-neck       175                  487                  0.136%
  //   approach           4                   92                  0.026%
  //   head             170                    0                  0.000%
  //
  // The flag test recalls only 31-35% of the parapet where it is visible, and
  // at the HEAD camera it reports 170 px of a parapet that contributes NOTHING
  // to that frame: all 170 pass the same test in the unmodified render. So the
  // true peak footprint is 0.166% of frame, not 0.05% — three times larger, and
  // still small enough that the conclusion below is unchanged.
  // ⚠️ USE THE DIFFERENCE, NOT THE THRESHOLD, for any element that is thin,
  // occluded, or not MAT.PAINTED. `?railprobe=picket` escapes this because the
  // panel is MAT.PAINTED (t = vColor, so red renders saturated) and is many
  // pixels tall; even there the flag test is deliberately CONSERVATIVE — it
  // recalls 77-94% of the changed pixels and drops the anti-aliased edge, which
  // is the right direction to miss on for a brightness median, and every panel
  // and BAND figure in the table above is unaffected.
  // The "88% of the pier's top edge" that used to end this paragraph is not
  // measured anywhere in this file and has been removed rather than repeated.
  const SUN = (() => {
    const v = [-0.35, 0.72, 0.60];              // renderer.js:57, PROTECTED
    const L = Math.hypot(v[0], v[1], v[2]);
    return [v[0] / L, v[1] / L, v[2] / L];
  })();
  // The pier's own axes in world, taken from `at` rather than from a copy of
  // the axis constant, so this cannot drift out of step with the pier.
  const O0 = at(0, 0), S_AX = at(1, 0), O_AX = at(0, 1);
  const AX_S = [S_AX[0] - O0[0], S_AX[1] - O0[1]];   // [dx, dz] per metre of s
  const AX_O = [O_AX[0] - O0[0], O_AX[1] - O0[1]];   // [dx, dz] per metre of o
  // The sun resolved onto them: 0.559 along the pier toward the tip, -0.412
  // across it to the WEST, 46.0 deg up. Every judged camera is EAST, which is
  // why the flat panel's own outward face never sees the sun at all.
  const SUN_S = SUN[0] * AX_S[0] + SUN[2] * AX_S[1];
  const SUN_O = SUN[0] * AX_O[0] + SUN[2] * AX_O[1];
  const SUN_AZ = Math.atan2(SUN_O, SUN_S);           // -36.4 deg from the axis
  const PICKET_ROT = 60 * Math.PI / 180;
  // One horizontal normal per FACE: the sun's azimuth pulled toward that face's
  // own outward direction by up to 60 deg, and never past it. The cap is the
  // trade above; the "never past it" is free realism — the pier's WEST flank
  // and the tip's SEAWARD face are only 53.6 and 36.4 deg off the sun's azimuth
  // to begin with, so those faces land on their true geometric normal with ndl
  // 0.412 and 0.559 and a lit sector that covers everything they are seen from.
  // Only the east flank, which the sun genuinely never reaches, needs the full
  // 60 deg of rotation. The east flank is also the one every judged camera
  // looks at.
  //
  // Horizontal (not tilted down) on purpose: a downward tilt widens the lit
  // sector only for a viewer close enough for |Vy|/|Vh| to matter — 4 deg at
  // 20 m, nothing at 150 m — and costs ndl at every range, because the sun is
  // 46 deg up and sin(46 deg) is the whole penalty.
  const picketNormal = (outAz) => {
    let d = outAz - SUN_AZ;                     // shortest signed rotation
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    const a = SUN_AZ + Math.max(-PICKET_ROT, Math.min(PICKET_ROT, d));
    const cs = Math.cos(a), sn = Math.sin(a);
    return [cs * AX_S[0] + sn * AX_O[0], 0, cs * AX_S[1] + sn * AX_O[1]];
  };

  // THE COLOUR. pierRail #E4E3DF is the measured PAINT and is PROTECTED, and it
  // stays the colour of every rail and post in this file. The panel is not a
  // painted surface though — it stands in for a run that is part paint and part
  // sky — so its colour is the paint's, LIFTED by the void it has to carry:
  //
  //     truth(t)  = cover(t) x paint x (ambient + f(t)/2) + (1 - cover(t)) x sky
  //     model     = paint x (ambient + 0.347/2)          — one constant
  //     lift      = mean over the azimuth circle of truth(t) / model
  //
  // Every term on the right measured off THIS build, not assumed:
  //
  //     ambient x 0.62 x exposure   0.15965   panel at ndl 0, mask p50, old pbox
  //     0.5 x exposure              0.39521   from the same panel at ndl 0.347
  //     sky behind the balustrade   0.4617    the open gap under the capping,
  //                                           head camera, rgb 184,204,216 L 201
  //     cover(t)                    min(1, 0.216 / |sin(t - 36.4 deg)|)
  //     f(t)                        the cylinder integral, above
  //
  // The pair gives the model back to four decimals — predicted 0.2808 against
  // 0.2807 rendered — so the arithmetic is checked, not asserted. Integrated
  // over the whole azimuth circle the lift runs 0.54 to 1.54 with a MEAN of
  // 1.288, and the truth it is tracking runs L 128 to L 197 with a mean of
  // L 187. 1.288 is that mean: not the value that flatters one camera.
  //
  // The shader's albedo is a(c) = c(0.78 + 0.55c), so the colour carrying the
  // lift is the positive root of a(c) = 1.288 a(pierRail), per channel:
  // c = 0.939, 0.931, 0.896, with 6% of the hard 1.0 ceiling still in hand.
  // ⚠️ It is a LIFT ON THE PROTECTED VALUE, not a replacement for it. Change
  // pierRail and this moves with it, which is the point of writing it this way.
  const PICKET_LIFT = 1.288;
  // PROBE and PICKET_OLD are declared and documented at the head of this
  // function under MEASUREMENT PROBES; `?pcol` and `?railprobe=picket` land
  // here. They used to be read at this line marked "TEMP".
  const PICKET_COL = PROBE || C.pierRail.map((v) => {
    const target = v * (0.78 + 0.55 * v) * PICKET_LIFT;
    // a(c) = 0.55c^2 + 0.78c - target = 0, positive root, clamped to the 0..1
    // mesh-check requires. It clamps at target > 1.33, i.e. lift > 1.41.
    return Math.min(1, (-0.78 + Math.sqrt(0.6084 + 2.2 * target)) / 1.1);
  });

  // Two quads in the baluster plane, 0.027 m apart — the panel keeps its
  // thickness, and each face is drawn separately so the near one always wins
  // the depth test whichever flank the rider is on. Both carry PICKET_N: the
  // aggregate belongs to the balusters, which are vertical whatever direction
  // the run goes, so the ACROSS runs at the tip and the junction take the same
  // normal as the flanks and craft.js's flip handles the backlit ones.
  const picketPanel = (a0, a1, c, along, y0 = Y_BOT, y1 = Y_TOP, pcol = PICKET_COL) => {
    if (PICKET_OLD && typeof along !== 'object') {   // ?pold=1 — the pre-2026-08-20 pbox, for the A/B
      const [q0, q1] = [c - PICKET_R, c + PICKET_R];
      if (along) pbox(a0, a1, q0, q1, DECK + y0, DECK + y1, PICKET_COL, MAT.PAINTED);
      else pbox(q0, q1, a0, a1, DECK + y0, DECK + y1, PICKET_COL, MAT.PAINTED);
      return;
    }
    // >>> NOCAST (tmp-tr136 experiment)
    m.beginNoCast();
    for (const off of [-PICKET_R, PICKET_R]) {
      // The face's own outward azimuth in pier axes: an ALONG run's two faces
      // look across the pier (+-o, +-90 deg), an ACROSS run's look along it
      // (+s = 0, -s = 180 deg). Only ever seen from its own side — the two are
      // 27 mm apart and the near one always wins the depth test — so each can
      // carry the normal that suits the half it is seen from.
      const outAz = typeof along === 'object'
        ? Math.atan2(off > 0 ? along.u[0] : -along.u[0], off > 0 ? -along.u[1] : along.u[1])
        : along ? (off > 0 ? Math.PI / 2 : -Math.PI / 2)
                : (off > 0 ? 0 : Math.PI);
      const N = picketNormal(outAz);
      // MAT.PICKET, 2026-08-29: identical to MAT.PAINTED in the albedo chain
      // (both fall into the t = vColor branch), plus a NEAR-FIELD-ONLY picket
      // pattern in craft.js COAST_FRAG, inert beyond 19 m — the open defect the
      // 2026-08-21 verification measured at the along-neck camera (band 74.5%
      // above L 180 against the reference 60-65%: right p50, no variance).
      // Under a probe the panel stays MAT.PAINTED so ?railprobe=picket renders
      // saturated flag red and ?pcol measures the SETTLED component — every
      // ceiling and lift in this file was derived through that instrument and
      // it must keep reading the same surface it read then.
      const P4 = [
        wp(a0, c + off, DECK + y0, along), wp(a1, c + off, DECK + y0, along),
        wp(a1, c + off, DECK + y1, along), wp(a0, c + off, DECK + y1, along),
      ];
      const q = P4.map((p) => m.pushC(p[0], p[1], p[2], N[0], N[1], N[2], pcol,
        PROBE ? MAT.PAINTED : MAT.PICKET));
      // >>> DECALTIER (tmp-tr136)
      // WIND EACH FACE THE WAY ITS OWN NORMAL POINTS. Both faces were emitted
      // in the same vertex order, so they shared a winding: one pointed out of
      // the panel and one pointed into it. Measured with
      // tmp-tr136/picketwind.mjs against N, which the loop above has already
      // aimed outward for this half: 40 of 104 MAT.PICKET triangles - 38.5% -
      // were wound inward, and a back-face cull deletes exactly those. That is
      // what made CULL_FACE unusable on the pier and it is why the balustrade
      // vanished when it was tried.
      //
      // This changes no vertex and no triangle, only the order of three indices
      // in the ones that were backwards - and it keeps the SPLIT DIAGONAL, because
      // quad(a,b,c,d) triangulates a-c, so quad(d,c,b,a) would also move the
      // diagonal. quad(a,d,c,b) reverses the winding and keeps a-c.
      const ux = P4[1][0] - P4[0][0], uy = P4[1][1] - P4[0][1], uz = P4[1][2] - P4[0][2];
      const vx = P4[2][0] - P4[0][0], vy = P4[2][1] - P4[0][1], vz = P4[2][2] - P4[0][2];
      const fx = uy * vz - uz * vy, fz = ux * vy - uy * vx;
      if (fx * N[0] + fz * N[2] >= 0) m.quad(q[0], q[1], q[2], q[3]);
      else m.quad(q[0], q[3], q[2], q[1]);
      // <<< DECALTIER
    }
    m.endNoCast();
    // <<< NOCAST
  };

  // MITRE — the corner overrun, and it is a BUG FIX, not a refinement.
  //
  // The previous pass reasoned that "a run that stops on the crossing run's
  // CENTRELINE already ends one radius inside the crossing tube, so the two
  // interpenetrate and mitre themselves". That is true only when the crossing
  // run PASSES THROUGH the corner. At every corner in this feature it does not:
  // the flank run stops at s = S_END and the tip run stops at o = RO_W, and
  // those are the SAME POINT, so the two tubes touch at a single point and
  // close nothing. Between them they leave an open quarter-wedge one radius
  // across — 42.5 mm on the capping, which is the most-seen line on the pier —
  // at all six corners: both tip corners, both neck/head corners and both sides
  // of the stair opening. Two boxes butted the same way merely looked solid,
  // which is why this only appeared once the members went round.
  //
  // The fix is to let ONE of the two runs overrun by a capping radius so it
  // genuinely passes through. The flank (ALONG) runs are given the overrun
  // because they are the ones that meet a transverse run at BOTH ends, so three
  // runs' options close all six corners. It costs zero triangles — a tube does
  // not get more expensive for being 42 mm longer — and 42.5 mm of handrail
  // nosing past an end post is what the real detail does anyway.
  const MITRE = 0.0425;             // = CAP_R, one capping radius

  // A run must terminate ON a post, and MIN_GAP is how that is enforced.
  const MIN_GAP = 0.30;

  // One open run. `opt` exists entirely to make CORNERS work, which boxes did
  // not have to care about and tubes do:
  //   noPost0 / noPostEnd — the run starts or ends on a corner post that the
  //     crossing run already builds. Two coincident round posts z-fight over
  //     their whole curved surface; two coincident boxes merely looked solid,
  //     so this is a new hazard that arrived with the new primitive.
  //   ext0 / ext1 — extra length at an end, in metres. Positive pushes the rail
  //     ends further out. Two uses: MITRE at a corner (above), and burying the
  //     junction-run rail ends INSIDE the neck parapet so the handrail visibly
  //     dies into masonry rather than stopping in mid air 20 mm off a wall.
  const openRun = (a0, a1, c, along, opt = {}) => {
    const e0 = a0 - (opt.ext0 || 0), e1 = a1 + (opt.ext1 || 0);
    // Bottom and top rails: the same 0.04 m section, seg=5. At 40 mm a fifth
    // facet is already below a pixel at any range this is seen from.
    rod(e0, e1, c, DECK + Y_BOT, RAIL_R, C.pierRail, MAT.PAINTED, along, 5);
    rod(e0, e1, c, DECK + Y_TOP, RAIL_R, C.pierRail, MAT.PAINTED, along, 5);
    // The capping gets seg=7, the only member in the file above 6. It is the
    // continuous dark line along the top of 268 m of railing and it is the
    // single most-seen edge on the pier from the water; two extra triangles per
    // run to keep it from ever showing a facet is the cheapest good decision
    // available here.
    rod(e0, e1, c, DECK + Y_CAP, CAP_R, C.pierRoofDark, MAT.TIMBER, along, 7);
    // The picket panel — two quads carrying the balusters' aggregate shading
    // normal, NOT a pbox. See the block at PICKET_R for the whole argument.
    picketPanel(a0, a1, c, along);
    // Posts run from below the deck surface to the underside of the capping.
    // The post top at 1.02 sits 5 mm inside the capping tube (underside 1.015),
    // so ctube's open ends are covered and never seen.
    //
    // A run must terminate ON a post, never in mid-bay — that is what makes a
    // railing look built rather than extruded, and at a corner the post is also
    // the only thing wide enough (0.066 against the rails' 0.04) to hide the
    // joint between two runs.
    //
    // BUG FIX THIS PASS. The old rule was "add an end post only if the last
    // pitch post is more than MIN_GAP short of the end", which SILENTLY DROPS
    // THE CORNER POST whenever the pitch happens to land close to the end. It
    // did exactly that on the east flank seaward of the stair: 199.4 + 51 x 1.22
    // = 261.62, only 80 mm short of the 261.7 tip line, so the pier's seaward
    // EAST corner — one of the two corners you see from the water on the way
    // round the head — had no post at all, and the tip run skips it too because
    // it is told the flank owns it. The rule now MOVES the last post to the end
    // instead of dropping the end post, which stretches one bay from 1.22 to at
    // most 1.52 m (invisible) and guarantees a post on every corner. Same 278
    // posts as before; one of them has moved 80 mm and now lands where it
    // belongs. It also puts the last junction-run post exactly on the parapet
    // face, so the balustrade dies into the masonry on a post rather than 80 mm
    // short of one.
    const posts = [];
    for (let a = opt.noPost0 ? a0 + POST_PITCH : a0; a < a1 - 1e-6; a += POST_PITCH) {
      posts.push(a);
    }
    if (!opt.noPostEnd) {
      if (posts.length && a1 - posts[posts.length - 1] < MIN_GAP) posts[posts.length - 1] = a1;
      else posts.push(a1);
    }
    for (const a of posts) {
      stanchion(a, c, DECK - 0.04, DECK + Y_POST, POST_R, C.pierRail, MAT.PAINTED, along, 5);
    }
  };

  // THE CLOSED END. Where a run genuinely stops — not at a corner, not into a
  // wall, but at a free end beside an opening — a tubular railing does not leave
  // the handrail hanging over a void: the capping is returned down to the top
  // rail on the end post. One short vertical tube between the two, which is
  // exactly what the real detail is, and it also caps ctube's open tube ends at
  // the only place in this file where they would otherwise face the camera.
  const closedEnd = (a, c, along) => {
    const A = wp(a, c, DECK + Y_TOP, along), B = wp(a, c, DECK + Y_CAP, along);
    m.ctube(A[0], A[1], A[2], B[0], B[1], B[2], RAIL_R, C.pierRail, MAT.PAINTED, 5);
  };

  // 2026-09-16: the flank line is 0.4 inboard of the MAIN deck edge (ctx.WALK,
  // EA 1 m DSM), per walkway zone; it was HEAD_W, which is the walkways' outer edge.
  const [WZ0, WZ1] = WALK.Z;
  const RO_W = WZ0.deck[0] + 0.4, RO_E = WZ0.deck[1] - 0.4;     // zone 1: -8.1 / +19.9
  const RO_W2 = WZ1.deck[0] + 0.4, RO_E2 = WZ1.deck[1] - 0.4;   // zone 2: -9.2 / +19.0
  const S_END_W = WALK.sChamW(0.4), S_END_E = WALK.sChamE(0.4); // flanks meet the chamfers
  // The neck/head step. 128.25 not 128.0: dead centre of pier.js's 128-128.5
  // boxes, so the junction detail is safely buried if those boxes are not
  // deleted (see the WIRING NOTE). The flank runs start here too, so the corner
  // between flank and junction closes exactly instead of leaving a 0.25 m hole
  // in the capping line at the one place the pier changes width.
  const S_JUN = 128.25;


  // =========================================================================
  // NECK, s 0-128.25: OPEN WHITE RAILINGS (tmp-tr43, 2026-09-17)
  // =========================================================================
  // EVIDENCE (crops in tmp-tr43/ev):
  //  - FORM, OVERCAST. bournemouth-reference/bournemouth-pier/1338723233808999
  //    .mp4 @ 128 s and @ 85 s (ev/z_rail_under.png), looking up at the neck
  //    from the sand: white posts, ONE white top rail, a bottom rail just above
  //    the edge beam, and dense vertical pickets over the full height between
  //    them. No mid rail, no capping of another colour, daylight and the glazed
  //    shelter visible through the whole edge.
  //  - SCALE, SUNLIT, FORM ONLY. Bournemouth Pier from beach.mp4 @ 7.6 s, the
  //    square-on west face at 21.5 +-1.5 px/m (tmp-tr37 ARCHES.md), zoomed 4x
  //    (ev/z_pfb_rail.png): posts 51 px apart = 2.4 m; top rail to edge-beam
  //    top 21.8 px = 1.0 m; bottom rail 3.8 px (0.18 m) above the beam. The
  //    "mid rail" tr37 recorded IS this bottom rail - the pickets barely resolve
  //    at 22 px/m, so it reads as a line part-way down. tr40's "posts ~2 m" was
  //    read unscaled off a foreshortened 360 px frame; the scaled square-on
  //    2.4 m wins.
  //  - PICKET PITCH. @ 128 s a brightness profile along the rail finds about
  //    11-12 pickets per post bay, i.e. ~0.2 m. The panel uses MAT.PICKET, whose
  //    near-field stripes (craft.js, inside 19 m only) are fixed at the head's
  //    0.125 m. Recorded, not changed: that shader is not this file's.
  // BUILT: top rail axis DECK+1.10 (r 0.025), bottom rail axis DECK+Y_BOT
  // (RAIL_R), a MAT.PICKET panel between the two axes, posts every 2.4 m from
  // s 0 (POST_R, foot 40 mm into the slab), all C.pierRail. Centreline
  // o = +-5.45: posts 5.417-5.483 stay inside the 5.5 deck edge, and
  // pier-deck-furniture.js's apron banners (o 5.485-5.545, s 2-8) stand just
  // outboard of the rail they are strapped to. The run stops at S_JUN with NO
  // post of its own: the junction run's post at o +-5.48 (head geometry,
  // unchanged) closes the corner and the rails run MITRE past it.
  // COST per flank: 54 posts x 10 + 2 rails x 10 = 560 triangles, plus a
  // 2-quad panel (4, which module-check's stub counts as 0). Both flanks 1,128.
  // Removed with the parapet: 4 boxes + band + 36 letters = 492.
  {
    const NECK_O = NECK_HALF - 0.05;
    const NECK_TOP_Y = 1.10, NECK_TOP_R = 0.025, NECK_POST_PITCH = 2.4;
    // PANEL TONE. The head's PICKET_COL (pierRail x 1.288 lift) is the mean of
    // pickets against open SKY. From the sea the neck's pickets stand in front
    // of the shelter, deck furniture and far railing, which are darker. First
    // build used PICKET_COL and v0624 (?overcast=1) rendered the band a flat
    // L 201 with posts invisible in it (p90 = p50). Real 0624, same band,
    // columns 60/110/160: post peaks p90 134-146 over infill p50 114-120, so
    // infill/post <= 0.83 in sRGB (an upper bound - the 360 px frame blurs
    // the posts). pierRail x 0.85 linear, PROBE still wins.
    const NECK_PANEL_COL = PROBE || C.pierRail.map((v) => v * 0.85);
    for (const sgn of [-1, 1]) {
      const c = sgn * NECK_O;
      rod(0, S_JUN + MITRE, c, DECK + Y_BOT, RAIL_R, C.pierRail, MAT.PAINTED, ALONG, 5);
      rod(0, S_JUN + MITRE, c, DECK + NECK_TOP_Y, NECK_TOP_R, C.pierRail, MAT.PAINTED, ALONG, 5);
      picketPanel(0, S_JUN, c, ALONG, Y_BOT, NECK_TOP_Y, NECK_PANEL_COL);
      for (let s = 0; s < S_JUN - 0.5; s += NECK_POST_PITCH) {
        stanchion(s, c, DECK - 0.04, DECK + NECK_TOP_Y, POST_R, C.pierRail, MAT.PAINTED, ALONG, 5);
      }
    }

    // ---- THE DECK-EDGE COPING COURSE (2026-09-18, tmp-tr97) --------------
    // The brief for this pass asked for "the deck-edge kerb and toe board".
    // ⚠️ THERE IS NO RAISED KERB AND NO TOE BOARD, and that is a finding, not
    // an omission. E2 - the owner's library photograph 829290465869059.jpg,
    // taken from the beach at deck level with the landward neck edge filling
    // the frame, zoomed in tmp-tr97/ev/_kerb_zoom.jpg - shows the timber deck
    // butting a course of PRECAST COPING STONES whose top is flush with it,
    // with visible vertical joints every 0.7-0.9 m, and the railing standing
    // INBOARD of that course on flared cast base plates bolted through the
    // decking. Nothing stands proud of the walking surface anywhere along it.
    // Building a kerb because the brief named one would be inventing it.
    //
    // What IS there, and is worth 24 triangles because it is the top edge of
    // the pier seen from the water: the coping course is a CLEANER, PALER band
    // at the head of an otherwise heavily stained fascia. E4 measures it - the
    // column luminance profile at x 1150-1190 of the scaled square-on beach
    // frame (21.5 +-1.5 px/m, tmp-tr37/ARCHES.md) reads, below the railing's
    // bottom rail: rows 1820-1825 PALE at L 147-150, rows 1826-1837 dark at
    // L 76-105, rows 1838-1860 fascia at L 145-155. So a 6 px = 0.28 m pale
    // course, a shadow line under its projection, and then tr37's 1.05 m edge
    // beam. Built 0.32 m deep and 60 mm proud, which is what casts that line.
    //
    // TONE: C.pierArch, not C.pierWhite. pier.js builds the deck slab (and so
    // the fascia) in C.pierDeck, which the header table of
    // pier-people-scale.js puts at 90,78,64 through the shader; pierArch is
    // 108,104,92, one clear step paler and still a concrete key. pierWhite at
    // 189,182,178 would make the pier look as though it had a white string
    // course, which no overcast frame supports. ⚠️ pierArch is a PROTECTED
    // VALUE; this uses the key and does not touch the value. Its use COUNT
    // changes - reported in tmp-tr97/RESULT.md.
    //
    // Geometry: OUTBOARD of pier.js's neck deck slab (o +-5.5, y 4.32..DECK),
    // so it adds no shared face plane and no volume inside it, and outboard of
    // pier-deck-furniture.js's timber course, which stops at 5.46. It stops
    // 50 mm short of s 0 and s 128 so its end faces sit in no plane pier.js
    // uses.
    const COPE_D = 0.06;
    for (const sgn of [-1, 1]) {
      const a = sgn * NECK_HALF, b = sgn * (NECK_HALF + COPE_D);
      pbox(0.05, 127.95, Math.min(a, b), Math.max(a, b),
        DECK - 0.30, DECK + 0.02, C.pierArch, MAT.CONCRETE);
    }
  }

  // THE STAIR BREAK. Frame 531: a timber stair descends from the head deck to
  // the lower landing stage on the EAST side, near the seaward end of the head
  // building. The main railing stops, returns around the stair head, and the
  // landing stage below carries a different, lower railing of 2-3 plain
  // horizontal rails with no balusters.
  //
  // The SIDE (east) and the EXISTENCE of the break are evidenced. The STATION
  // is not — frame 531's image position could not be converted to a station.
  // s 196.4-199.4 is chosen, not measured, for one concrete reason: it is the
  // only station near the seaward end of the head building (s 140-215) that has
  // an east landing-stage section underneath it to descend to. pier.js builds
  // those sections on a deterministic gap hash and the section centred s=198
  // passes it (0.62 > 0.55), spanning s 195.1-200.9. If that gap rule changes,
  // this stair head must move with it or it will open onto water.
  // SUPERSEDED 2026-09-16: the stairs are WALK.STAIRS (pier.js builds flights,
  // landings and their handrails). The balustrade opens over each deck-level
  // landing: A west s 128.25-129.2, B west and east s 197.0-199.2.
  const [SA, SB] = WALK.STAIRS;

  // ---- the three flank runs ----------------------------------------------
  // Each owns the corner posts at BOTH its ends; the transverse runs below all
  // set noPost0/noPostEnd where they meet one, so every corner has exactly one
  // post rather than two coincident ones.
  //
  // All three carry MITRE at both ends. Every corner in this feature is a flank
  // run meeting a transverse run, so putting the overrun here and nowhere else
  // closes all six of them: the two neck/head corners at S_JUN, the two sides
  // of the stair opening at ST0 and ST1, and the two tip corners at S_END. The
  // transverse runs are then left ending exactly on the flank CENTRELINE, which
  // is now genuinely inside a tube that passes through. Zero triangles.
  const MM = { ext0: MITRE, ext1: MITRE }, ST = WALK.STEP_S;
  openRun(SA.land[1], ST, RO_W, ALONG, MM);                 // west zone 1, from stair A
  openRun(ST, SB.land[0], RO_W2, ALONG, MM);                // west zone 2, to stair B
  openRun(SB.land[1], S_END_W, RO_W2, ALONG, MM);           // west, stair B to chamfer
  openRun(S_JUN, ST, RO_E, ALONG, MM);                      // east zone 1
  openRun(ST, SB.land[0], RO_E2, ALONG, MM);                // east zone 2, to stair B
  openRun(SB.land[1], S_END_E, RO_E2, ALONG, MM);           // east, stair B to chamfer
  // the jog at the walkway step (deck edge moves 1.1 m out west, 0.9 m in east)
  openRun(RO_W2, RO_W, ST, ACROSS, { noPost0: true, noPostEnd: true });
  openRun(RO_E2, RO_E, ST, ACROSS, { noPost0: true, noPostEnd: true });
  // free ends beside the stair openings
  closedEnd(SA.land[1], RO_W, ALONG);
  for (const [s, c] of [[SB.land[0], RO_W2], [SB.land[1], RO_W2], [SB.land[0], RO_E2], [SB.land[1], RO_E2]]) closedEnd(s, c, ALONG);

  // ---- the end run across the seaward tip ---------------------------------
  // Frame 562 shows the railing turning a TIGHT RADIUS in plan at the rounded
  // tip — a curve, not a mitred corner. ctube CAN now express that curve, since
  // it takes world coordinates and a diagonal chord costs the same as a
  // straight one. (Until 2026-09-16 it was not built because the deck was a
  // square-ended rectangle to s 262; that reason is gone.)
  // 2026-09-16: THE DECK IS NOW ROUNDED (ctx.TIP, from the DSM), so the end
  // run follows it 0.4 m inboard: a return across each walkway end, then the
  // chamfer and six chords per side of the R 10 nose. Each run owns the post at
  // its END; chords are ~1.26 m so each carries one. The flank runs above own
  // the two outer corners.
  {
    const pts = WALK.outline(0.4, 6);   // 2026-09-16: from the west chamfer corner
    for (let i = 0; i + 1 < pts.length; i++) {
      const [s0, o0] = pts[i], [s1, o1] = pts[i + 1];
      const L = Math.hypot(s1 - s0, o1 - o0);
      const fr = { p: [s0, o0], u: [(s1 - s0) / L, (o1 - o0) / L] };
      openRun(0, L, 0, fr, { noPost0: true, noPostEnd: i + 2 === pts.length, ext0: MITRE, ext1: MITRE });
    }
  }

  // ---- returns closing the railing around the stair head ------------------
  // They run INBOARD from the deck edge — the head deck is solid out to o = 24.5
  // in this model, so a return running outboard would float over water. 1.6 m
  // deep, which is a stair width, and the opening between them is 3.0 m.
  // The outboard end (a1 = RO_E) lands on the flank run's own corner post, so it
  // carries noPostEnd and the end-post block never runs. The INBOARD end
  // (a0 = 22.5) is the only genuinely free end in the whole balustrade; its post
  // is the post loop's FIRST iteration, not an end post, so this run is immune to
  // the end-post rule either side of this pass's change to it. Posts land at
  // 22.5 and 23.72, and 23.72 is 0.38 short of the corner post at 24.1 — a tight
  // last bay, but two distinct posts, not a near-coincident pair.
  // The free inboard end also gets a closed end (capping returned to the top
  // rail), which is the only place in the file a capping would otherwise stop
  // over a void.
  // (the inboard returns round the old outboard stair head are retired, 2026-09-16)

  // ---- the neck/head junction --------------------------------------------
  // NEW IN THIS PASS. The pier steps from an 11 m neck to a 39 m head at s=128
  // and the guarding has to turn the step: the head balustrade runs ACROSS from
  // the flank offset in to the neck parapet, and dies into it. Until now there
  // was nothing here at all in this module and only a solid 1.2 m box in
  // pier.js, which is a wall, not a railing.
  //
  // INFERRED, not measured. No frame in the set resolves this junction — the
  // beach frames are too oblique and the deck frames are all seaward of it. What
  // IS certain is the plan geometry: the balustrade cannot simply stop at
  // o = -14.1 in mid air, and the parapet is the only thing for it to die into.
  // The rails and capping are pushed 0.12 m PAST the parapet's outer face
  // (PAR_OUT, itself 20 mm inboard of the deck edge), so the handrail enters
  // masonry instead of ending 20 mm short of it with a visible slot of daylight
  // behind. Both runs skip the post at their outboard end, which the flank run
  // already owns.
  //
  // ⚠️ CAVEAT MEASURED 2026-08-03, and it is the one loose end in this module.
  // The 0.12 m overrun does NOT currently enter masonry, because the parapet is
  // built s 0-128 and these runs are at S_JUN = 128.25. There is no wall at that
  // station: the rail ends float 0.25 m seaward of the parapet's end face, over
  // open head deck. It is invisible TODAY only because pier.js's step boxes
  // (128-128.5, o ±5.5 outward) still bury everything outboard of o = ±5.5 —
  // which leaves exactly 0.14 m of each of the three tubes poking out of the
  // inboard end of those boxes on each flank.
  //
  // It is left alone on purpose rather than papered over. The moment the WIRING
  // NOTE's third item is honoured and those boxes are deleted, the full 0.25 m
  // of floating rail end is exposed, so the fix belongs in that same commit and
  // it is a choice about the PARAPET, not about this overrun: run the parapet's
  // two pboxes to s = 128.5 (coterminous with the step the boxes described, zero
  // extra triangles, and it makes every claim in this paragraph true), or move
  // S_JUN back to 128.0 and give up the fail-safe burial. Do not simply shrink
  // the 0.12 — that reinstates the daylight slot this overrun exists to close.
  // Not decided here because no frame in the set resolves the step, and picking
  // one silently would bury the choice.
  openRun(RO_W, -PAR_OUT, S_JUN, ACROSS, { ext1: 0.12 });   // owns its post: stair A opens beside it
  closedEnd(RO_W, S_JUN, ACROSS);
  openRun(PAR_OUT, RO_E, S_JUN, ACROSS, { noPostEnd: true, ext0: 0.12 });

  // ---- lower landing stage railing and stair rake: RETIRED 2026-09-16 -----
  // They guarded pier.js's outboard stages and the flight down to them, which had
  // no DSM support. The walkway rails and stair handrails are pier.js's (WALK).

  // ---- the bench on the head deck -----------------------------------------
  // Frame 536 showed a tall dark sign frame with a bench set against it; the
  // station was a guess. The 3 m FRAME (two legs + panel) was REMOVED
  // 2026-09-16 at the owner's request: after the rotunda moved to the LIDAR's
  // s 208 it stood alone on open deck, and the DSM shows nothing above 1 m
  // over s 218-241. The bench stays - 0.54 m is below what 1 m cells can see.
  // It stays boxes because it is sawn timber.
  {
    // 2026-09-16: SO was 23.0, over the east walkway now; 1.2 m inside the main deck edge
    const SS = 233.0, SO = WALK.Z[1].deck[1] - 1.2;
    pbox(SS + 0.30, SS + 2.10, SO + 0.10, SO + 0.65, DECK + 0.44, DECK + 0.54,
      C.pierRoofDark, MAT.TIMBER);
    for (const s of [SS + 0.40, SS + 1.90]) {
      pbox(s, s + 0.10, SO + 0.16, SO + 0.58, DECK, DECK + 0.44, C.pierRoofDark, MAT.TIMBER);
    }
  }

  // =========================================================================
  // DELIBERATELY NOT BUILT
  //
  // - Real balusters. 2,670 of them; 16,020 triangles even at the six-triangle
  //   seg=3 minimum, against a 7,000 budget for the whole file. The panel above
  //   is the substitute and the swap point for a future LOD. Its BRIGHTNESS
  //   error is closed — four cameras inside the reference band, verified
  //   2026-08-21 off the pixel mask. What is left is VARIANCE, and only inside
  //   about 15 m: the along-neck camera stands 6-10 m off the run, where a real
  //   railing resolves its pickets at ~19 px pitch and a flat quad cannot, and
  //   the band there is 74.5% above L 180 against a reference 60-65%. That is
  //   the whole remaining case for balusters and it is worth 10 points of
  //   bright share on one camera in five. It does not buy 16,020 triangles.
  // - A MID RAIL on the head balustrade. Asked for; refused on the evidence,
  //   TWICE, and now closed. Frame 562 column x=240 is unbroken background from
  //   the underside of the top rail to the top of the bottom rail, and frame
  //   626 resolves three separate balusters with 120 px of pure background
  //   between them over the same full height. The landing stage and the stair
  //   rake (both retired 2026-09-16) had intermediate rails because the frames show them there and
  //   because neither has picket infill to guard the gap.
  // - Post domed caps, splayed feet and base plates. All three are now clearly
  //   VISIBLE in the frames — 562 at 6x shows a domed post top, a collar where
  //   the top rail passes, a splayed skirt and a rectangular base plate; 524 and
  //   626 show the base plate again, and 618 shows a row of them as bright
  //   rectangles on dark deck — so this is no longer "too small to resolve". It
  //   is a viewpoint decision instead: this game is played from sea level with
  //   the deck 5.47 m up, so the deck edge and the picket panel occlude
  //   everything within 0.2 m of the deck on both flanks, and the post top at
  //   0.066 m is under a pixel past about 30 m. Three more primitives on each of
  //   278 posts is 2,200-3,300 triangles for detail the water never sees, and
  //   frame 603 — the only frame shot from the game's own viewpoint — resolves
  //   no railing detail below the capping line at all. If a deck-level camera is
  //   ever added, the base plate is the first thing to put back.
  // - Railings on the OTHER landing-stage sections. pier.js builds a gap-toothed
  //   run of them down both flanks on a deterministic hash; only the one under
  //   the stair is railed here, because only that one is evidenced (frame 531)
  //   and because a guarded working stage is arguably the landing-stage
  //   feature's own business. They sit at y 2.0-2.5, which is nearly eye level
  //   from an eFoil, so if they are ever wanted they are worth more per triangle
  //   than anything on the deck — about 130 triangles each, roughly 17 sections.
  //   Not taken unasked, and not taken without a frame.
  // - A curved plan at the tip. Now buildable — ctube takes a diagonal — but it
  //   is gated on the tip DECK being rounded first. See the note at the end run.
  // - The stair flight itself. This module builds the BREAK in the guarding,
  //   the returns that frame it and, from this pass, the RAKING HANDRAILS down
  //   to the landing stage (retired 2026-09-16 with the stage); the treads and stringers belong to the
  //   deck/landing-stage feature and building them here would overlap it. The
  //   rake's pitch is the one number in it that is inferred — see the note at
  //   the stair rake for the two constraints that box it in, and for the
  //   warning that it must move if the flight is ever built at another pitch.
  // - A gate anywhere on the neck. None was resolved in any frame, so none is
  //   invented — the parapet runs unbroken from the shore root to s=128.
  // - ⚠️ REPAINTING OR RE-MATERIALLING THE NECK PARAPET, which has a real,
  //   measured defect that this pass deliberately left alone. FOUND 2026-08-21
  //   with `?railprobe=parapet`, and it is an in-frame RATIO so the overcast
  //   still is admissible (STATUS trap 5):
  //
  //     frame 542, same column   parapet face 170-192   arcade below 115-135
  //                              -> the parapet is about 1.42x PALER
  //     render, entrance camera  parapet  91.8          arcade below 138.8   0.66
  //     render, along-neck       parapet  78.8          arcade below 167.8   0.47
  //
  //   ⚠️ RE-MEASURED 2026-08-21, SECOND VERIFICATION PASS, and both render rows
  //   MOVED. They were written as 108.3/111.2 (0.97) and 106.2/107.4 (0.99) a
  //   few minutes before another session brightened the arcade spandrel in
  //   pier-arcade-underside.js, and the parapet figure was additionally read
  //   through the flag-threshold mask corrected at THE SEAM WAS CHECKED above.
  //   Through the difference mask, on the tree as it stands: the parapet is now
  //   0.66 and 0.47 of the arcade below it. The photograph says 1.42. THE
  //   DEFECT IS LARGER THAN IT WAS REPORTED, not smaller, and the decision
  //   below is unchanged — but do not quote 0.97/0.99, and re-measure rather
  //   than quoting 0.66/0.47 either if the arcade module has moved again.
  //
  //   The photograph makes the parapet markedly paler than the arcade; the
  //   render makes it the SAME VALUE. The colour block above chose C.pierWhite
  //   over C.pierArch precisely to carry that distinction and wrote down why —
  //   and then passed MAT.CONCRETE, which is TEXTURE-DOMINANT (`t.rgb * (0.78 +
  //   vColor * 0.55)`), so the concrete texture supplies the value and the pale
  //   key survives only in the 0.78..1.09 modulation term. The intent is in the
  //   comment and it is multiplied out of the pixels. Same shape as STATUS
  //   item 9's cliff palette, on a different surface.
  //
  //   NOT FIXED HERE, and the reason is size, not doubt. The parapet's outer
  //   face sits 20 mm inboard of a deck edge that stands between it and a
  //   camera at 1.6-4 m, so from the water it is 594 / 487 / 92 / 0 pixels in
  //   the four judged cameras (entrance / along-neck / approach / head, by the
  //   difference mask) — a peak of 0.166% of frame, against a picket panel that
  //   is 9,223 px in the head camera alone. The one-word fix (MAT.PAINTED) would roughly
  //   double it and land the ratio, but it also turns 128 m of textured wall
  //   flat, and NOTHING ON DISK SAYS WHETHER THIS WALL IS PAINTED OR BARE
  //   CONCRETE — which is the only fact that decides it. Changing a material to
  //   move a brightness on 0.05% of frame, on evidence that thin, is the move
  //   this project's own failure-mode list opens with. Left for a pass that has
  //   a frame showing the neck parapet close enough to see its surface.
  // - The ornate cast-iron entrance screen at the pier root (frame 652, right
  //   of frame). It is real and it is handsome, but it is at s≈0 behind the
  //   land buildings and it belongs to the approach, not to this feature.
  // - Any change to pier.js's blue fascia banner (lines 147-148), which the
  //   measurements contradict on colour, height and both-flanks. It cannot be
  //   removed from this module; it is recorded here so the wiring pass sees it.
  //
  // TRIANGLE COST — 3,878, against a 7,000 budget.
  //
  // ⚠️ THIS TABLE SAID 3,942 AND WAS WRONG, and it is worth saying why rather
  // than just correcting it, because it is this project's documented failure
  // mode 4 — a comment describing code that does not exist. The 2026-08-20 pass
  // turned the eight picket panels from pboxes into quads and SAVED 64
  // triangles (96 -> 32), said so in its own block ("COST: 4 triangles per run
  // against pbox's 12. The fix SAVES 64 triangles"), and then left this table
  // claiming boxes. Two numbers in one file disagreeing by exactly the size of
  // the change that was made. Re-derived and re-checked this pass against
  // module-check, which is the only external witness available.
  //
  //   278 posts, seg 5                     2,780
  //   8 runs x (2 rails seg 5 + capping seg 7)   272
  //   8 picket panels, 2 quads each             32   <- WAS 96 as boxes
  //   2 closed ends, seg 5                      20
  //   parapet + coping, 4 boxes                 48
  //   signage band, 1 box                       12
  //   36 letter blocks                         432
  //   landing stage, 9 rails + 4 posts         130
  //   stair rake: 2 x (capping 6 + 2 rails 5 + newel 5)  84
  //   sign frame: 2 legs seg 5 + 4 boxes        68
  //                                        -------
  //                                          3,878
  // 2026-09-16: STALE. The landing stage (130) and stair rake (84) lines are
  // retired and the TIP rail replaced the end run; module-check reports 3,724
  // (tmp-tr25p). The table has not been re-derived.
  //
  // ⚠️ module-check.mjs will report 3,846, exactly 32 light, and that is not a
  // discrepancy — it stubs m.pushC and m.quad, so the eight quad panels count
  // as ZERO there. 3,846 is the table above with the panel line struck out, and
  // the other nine lines sum to it to the triangle, which is what makes this
  // table checkable at all. mesh-check's whole-mesh total is the other witness.
  //
  // The 3,058 spare is deliberately BANKED, not spent. There is only one thing
  // in this file worth spending it on and it does not fit: real balusters need
  // 16,020 triangles and the whole budget is 7,000. Everything else that could
  // be bought — post caps, base plates, collars — is detail this game's
  // sea-level camera provably cannot resolve (frame 603). The pier's other
  // features are working to the same total, so the spare is not free either.
  // =========================================================================
}
