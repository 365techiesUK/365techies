// BOURNEMOUTH PIER - the people on it, and the gulls on the coping.
//
// An empty pier is the strongest single tell that this is a model, and the
// measurement pass confirmed it the hard way: of eighteen reference frames
// read, not one shows a deck with nobody visible somewhere in the same shot.
// A human figure is also the only object in the whole scene whose size the
// viewer already knows, so the population is what gives the 260 m of concrete
// its scale. That is why this file exists and why the distribution below
// matters far more than the geometry of any one figure.
//
// ---------------------------------------------------------------------------
// THE RULER
//
// Everything vertical here chains off ONE number: an adult is 1.75 m against a
// deck standing 5.47 m above the water. That number was NOT taken from a pixel
// count, and the reason is worth recording. Three independent attempts to
// measure a figure against the deck-to-water column or against a railing all
// returned 2.4-2.9 m. Three frames agreeing on the same absurd answer is the
// tell: a 10 px dark silhouette against a bright sky blooms about 1.5 px at
// each end, and the railing it is measured against loses its lower half into
// the dark deck. The honest result is a bracket of 1.4-2.1 m, and the standard
// 1.75 m survives inside it. So the sourced figure is KEPT, not corrected. Do
// not "fix" it from a 640 px still.
//
// 1.75 m is retained here as the population MEAN, exactly as before, so the
// scale this file lends the pier has not moved. What HAS changed is the spread
// about it - see STATURE below, where the old code and the old comment
// disagreed by a factor of two.
//
// What the same-station ratio method DID resolve, and resolved well, is
// everything horizontal - spacing, pitch, clump size, density - plus the
// ratios between figures of different kinds standing next to each other. Head
// pitch against head width, child against the adult beside her, clump length
// against clump gap: those are immune to both bloom and perspective, and they
// are where the value in this file sits.
//
// ---------------------------------------------------------------------------
// ⚠️ HOW BIG THESE ACTUALLY ARE. MEASURED THIS PASS, AND THE OLD ANSWER WAS
// WRONG BY AN ORDER OF MAGNITUDE.
//
// This file used to say "a figure is 2-6 px tall at the 150-400 m these are
// seen from", and every economy in it - three boxes, no arms, a cube head, one
// leg box - was justified against that number. It was never checked against a
// camera. Projected through main.js's own camera maths (`efoilCal.shot`, fov
// is VERTICAL, render 872 x 399) the five judged cameras give:
//
//   camera        px per rad   nearest people    range      HEIGHT of a 1.75 m
//                              in frame                     figure, in pixels
//   approach 46       470      head railing      88-127 m        6.7 - 9.4
//   entrance 50       428      head west flank      61 m           16.5
//   along-neck 52     409      neck walkers      56- 95 m        7.5 - 13.5
//   head 40           548      head east rail    20- 61 m       18.3 - 55.2
//   head 40           548      zip-tower knot       33 m           36.1
//
// So the crowd on the head railing - the one this file calls "the one that
// sells it" - is 18-55 px tall in the head camera, not 3. Its HEAD alone is
// 2.3-6.9 px. At that size a three-box figure is not an economical
// abstraction, it is a Lego minifig, and rendering it and looking is exactly
// what it looks like. The 2-6 px reading is still true for zones A, B and C in
// the approach camera, and those zones are still built to it.
//
// ---------------------------------------------------------------------------
// ⚠️⚠️ AND HOW BIG THEY ACTUALLY RENDER. THE TABLE ABOVE IS A PROJECTION, NOT A
// MEASUREMENT, AND IT OVER-READS THIS CROWD BY A FACTOR OF THREE.
//
// Everything above is `stature / range * pxPerRad` with an occlusion fraction
// applied by hand. Nothing in this file had ever been measured OFF A RENDER.
// Method, and it is cheap enough that any future pass should repeat it: render
// the five judged cameras, set CROWD to 0.0, render them again, and difference.
// Every pixel that moves is a person and nothing else is. Both halves must be
// rendered back to back and the pair checked on a people-free control box
// first - four other modules were being edited during this run and the first
// pair straddled a shaders.js write, which put cloud drift and sea glitter into
// the difference and inflated every number below by 5-20x. The pair these come
// from reads 0 px of difference over a 24,000 px substructure control and a
// 18,000 px sky control, so it is clean.
//
//   camera        crowd pixels   share of frame   blobs   BLOB HEIGHT, px
//                 (872 x 399)                             p50   p90   max
//   approach            349          0.100%         65      2     5     9
//   entrance             32          0.009%         10      1     3     3
//   along-neck           23          0.007%          8      1     3     3
//   head              2,635          0.757%        136      2    13    19
//   arcade               97          0.028%          5      4     7     8
//
// ⚠️⚠️ THE TABLE ABOVE IS SUPERSEDED. IT WAS MEASURED ON THE FOUR-BOX FIGURE,
// THIS FILE NOW BUILDS FIVE, AND THE DIFFERENCE HAS SINCE BEEN RE-RUN. The
// previous note here said the pixel column was stale but "the blob HEIGHTS are
// safe: no vertical station moved except the chin". THAT REASONING IS WRONG and
// the re-run says so. Widening the torso 25% (F_WCHEST) MERGES neighbouring
// figures into one connected component, and a blob that runs along the head
// railing inherits the railing's slope in the image - so its height grows
// without any station moving. Re-measured 2026-08-21, same method (render,
// CROWD 0.0, render again, difference; sky control box 100,20-700,100 shows 0
// changed pixels, so the pair is clean), 872 x 399:
//
//   camera        crowd pixels   share of frame   blobs   BLOB HEIGHT, px
//                                                         p50   p90   max
//   approach            597          0.172%         53      2     8     9
//   entrance             38          0.011%         11      2     3     3
//   along-neck           27          0.008%          8      1     3     3
//   head              7,866          2.261%         86      3    21    35
//   arcade              106          0.030%          5      4     7     8
//
// Restricted to blobs no wider than 12 px - the ones that are one figure rather
// than a merged run - the head camera reads n 66, p50 2, p90 14, max 34. So the
// MEDIAN figure is still 2 px, which is the finding that governs this file, but
// "the biggest is 19" is not true and the yoke's honest-limit note below is
// quoted against a number that has moved. A clean isolated single figure at
// x 165-177 does measure 19 px; the frame also carries figures up to ~30.
//
// ⚠️ 308 of the head camera's changed pixels are BELOW the deck line and every
// one of them is DARKER with the crowd present. That is the crowd's shadow on
// the substructure and the sea, not a leak - but it means a "people-free
// control box" under the pier is not people-free, and the next pass must not
// treat it as one.
//
// THREE THINGS FOLLOW, and they should govern every future pass on this file.
//
//   1. THE HEAD CAMERA IS 91% OF EVERYTHING THIS FILE DOES. 7,866 of the 8,634
//      crowd pixels in all five judged frames are in that one view (it was
//      2,635 of 3,136 = 84% on the four-box figure). The other four cameras
//      together are 768 px - about a third of one thumbnail.
//   2. THE MEDIAN FIGURE IS 2 PIXELS AND THE BIGGEST SINGLE ONE IS ABOUT 30.
//      Not 18-55, and not the 19 this note used to claim - see the re-run
//      above. The
//      projection above is right about the geometry and wrong about the result,
//      because it applies the occlusion fraction to a figure it has already
//      placed at the nearest possible range: the nearest figures are also the
//      ones the deck edge crops hardest. At 2 px the ONLY properties that can
//      read are the pixel's tone and whether the row it sits in has gaps.
//      Silhouette work below about 10 px is spent on nothing.
//   3. THE CROWD BREAKS THE SKY LINE IN ONE CAMERA ONLY. Measured as the
//      top-of-silhouette row, column by column, over the connected pier mass
//      (so drifting cloud cannot enter it): the crowd raises that line on
//      15.1% of columns in the HEAD camera, median 7 px and up to 17 - and on
//      ZERO columns in the approach, entrance and along-neck cameras.
//      ⚠️ THE 15.1% IS NORMALISED BY THE PIER-MASS COLUMNS, NOT BY FRAME WIDTH,
//      and it was written here without saying so. Re-measured 2026-08-21 over
//      the whole 872-column frame it is 2.6% of columns, median 8 px, max 18 -
//      the same 23 columns, the same notches, a different denominator. Quote
//      the denominator or the row is unreproducible. In the
//      approach camera the 597 crowd pixels are real and clearly visible, but
//      they sit against the deck and the railing, BELOW the top rail, so they
//      register as tone and colour rather than as notches in the skyline.
//
// The 128 m straight line this crowd is meant to break is broken by it only
// where the head camera looks along the head railing. That is not a defect to
// fix here - it is the deck edge and the parapets of three other modules doing
// what they are built to do, and it is measured so the next pass does not spend
// a day on a silhouette nobody can see.
//
// ---------------------------------------------------------------------------
// ⚠️ AND WHERE THE DECK EDGE CUTS THEM OFF. Also measured this pass, by
// similar triangles from each camera eye through the top of the occluder that
// stands between it and the figure. Every judged camera sits BELOW the deck
// (eye 1.6-4.0 m against a 5.47 m deck), so every figure is cropped:
//
//   figure at ...      occluder                  visible above, as a fraction
//                                                of stature, worst..best cam
//   head railing       head rail top   DECK+0.84      0.49 .. 0.64
//   neck walkers       neck parapet    DECK+1.15      0.68 .. 0.76
//   kiosk apron        neck parapet    DECK+1.15      0.84 .. hidden
//
// TWO CONSEQUENCES, and they set the whole budget of this file:
//
//   1. NOTHING BELOW 0.49 OF STATURE IS EVER VISIBLE from a judged camera. The
//      leg box spans 0 to 0.52 of stature. It is 924 triangles that no judged
//      camera can see. It is KEPT - see NECK_LEGS - but a future pass looking
//      for budget now knows exactly where it is and what it is insuring.
//   2. EVERY TRIANGLE THAT DOES ANY WORK IS BETWEEN 0.49 AND 1.00 OF STATURE.
//      That is where the shoulder box went, and where the YOKE box went after
//      it (0.818-0.870), and it is why both went there rather than into arms,
//      a split leg pair, or a waist.
//
// ⚠️ THE TABLE ABOVE WAS CALLED OPTIMISTIC HERE AND THE RE-RUN WITHDRAWS THAT.
// It puts the head railing at 0.49-0.64 of stature visible, which on the
// nearest figure would be 27-35 px. This note used to answer "the measured
// maximum blob in that camera is 19 px" and rule the table an upper bound. The
// 2026-08-21 CROWD-0 difference measures the maximum at 35 px (34 among blobs
// no wider than 12 px), which is INSIDE the table's own 27-35 band. So the
// table is not optimistic; the 19 px reading it was refuted with was.
// ⚠️ AND THE OCCLUDER STATION IS ALSO WRONG. This note, and the table above,
// call the head-edge occluder "the DECK+0.84 rail". Measured on
// pier-railings-parapet.js's built ctubes: the east head rail's posts run
// y 5.43-6.49 and its top rail sits at y 6.53, i.e. DECK+1.02 and DECK+1.06,
// not DECK+0.84. That module was edited AFTER this file, so the station may
// have moved under it - but DECK+0.84 is not what is built now, and a 0.22 m
// taller rail crops every figure on that run harder than the table assumes.
//
// ---------------------------------------------------------------------------
// WHAT IS DELIBERATELY NOT BUILT (a gap stated beats a number invented)
//
//   - ARMS AS BOXES. Still not built, and the reason CHANGED this pass. The old
//     reason was that an arm hanging clear of the torso adds about 0.08 m of
//     extra silhouette - 2.5 px on the nearest figure in the head camera and
//     under half a pixel everywhere else - for two more boxes per person,
//     1,848 triangles, twice what the shoulder box cost, for a tenth of the
//     effect. That arithmetic still holds. What was WRONG was the assumption
//     underneath it: that a figure without arm boxes is a figure without arms.
//     The arms of a standing person are not a separate silhouette hanging clear
//     of the trunk, they are IN the trunk's outline - they are what stops a
//     real body tapering from shoulder to hip. This file modelled the trunk at
//     bare-chest breadth and so built a figure with its arms amputated, which
//     is exactly what "bottle-shaped" describes. The arms are now carried by
//     F_WCHEST for zero triangles. Boxes for them remain a bad trade.
//   - A SPLIT LEG PAIR. The gap between a pair of legs is 1.7 px on the
//     nearest figure - and it sits at 0.1-0.5 of stature, which the section
//     above shows is behind the deck edge in every judged camera. Zero.
//   - A WAIST BOX. Same reason: 0.52-0.62 of stature is behind the rail.
//   - GULLS ON THE LAMP COLUMNS. The brief asked for them. Not one of the
//     eighteen frames shows a bird on a lamp head. Building them would be
//     inventing, so they are not built. Perched gulls on the deck-edge coping
//     ARE built, from f636, at medium-low confidence and in small numbers.
//   - GULLS IN FLIGHT. Not measured. Several frames show specks over the water
//     that are as likely to be sensor noise as birds; nothing countable.
//   - THE LOWER LANDING STAGES. Nobody was observed on either of them; they
//     read as closed or derelict in f605 and f659. They stay unpopulated, and
//     that emptiness is itself correct.
//   - PUSHCHAIRS, DOGS AND MOBILITY AIDS. All three appear in the frames
//     (f562 dog on a lead, f599 and f552 pushchairs) but none could be
//     dimensioned. The family knot on the apron is built as people only.
//   - CLUSTERS AT THE PARASOLS. f588 and f599 show the open head deck largely
//     clear of people between the parasols; the population is pressed against
//     the railings instead. The parasols are explicitly NOT used as seeding
//     points, which is the opposite of the obvious thing to do.
// ---------------------------------------------------------------------------

// DENSITY IS A SESSION PARAMETER, NOT A CONSTANT - the single most important
// caveat in the measurement pass. Five of the eighteen frames (f588, f639,
// f562, f645, f618) show a genuinely EMPTY stretch of deck at dusk. A
// permanently crowded pier is as false as an empty one. 1.0 is the busy-day
// dressing the measured densities describe; about 0.35 reproduces the dusk
// frames. When this file is eventually driven from time-of-day, this is the
// knob - it scales every zone's headcount and nothing else.
const CROWD = 1.0;

// Set false to drop the leg box from neck figures. The measurement pass
// recommends it and the evidence is good: f636 shows people on the neck as
// head-and-upper-torso only above the white balustrade and the blue banner
// band, legs never visible from beach level, cropped at about 1.15 m above the
// deck - and the occlusion table in the header now puts a hard number on that,
// 0.68-0.76 of stature for the neck. It is left TRUE anyway. The saving is 15
// boxes - 180 triangles out of a 7000 budget - and the cost of being wrong is a
// row of legless torsos floating over the deck the first time a replay camera
// rises above the parapet. Not a trade worth taking at that price.
const NECK_LEGS = true;

export function addPeopleAndScale(ctx) {
  // m, TIP_HALF and HEAD_TOP are part of the agreed ctx contract and are
  // destructured for that reason. Nothing here uses them: every figure is an
  // oriented box in pier space, so m.box would skew it by 6.1 degrees; the tip
  // half-width is irrelevant because pier.js already decks 128-262 at full head
  // width; and nobody stands on the head building's roof.
  const { pbox, m, C, MAT, DECK, NECK_HALF, HEAD_W, TIP_HALF, HEAD_TOP, TIP, WALK } = ctx;

  // ⚠️ MAT.PAINTED IS NOT A PASS-THROUGH, AND THE OLD COMMENT HERE SAID IT WAS.
  // It read "no texture is bound for PAINTED, so it is flat colour". Half of
  // that is true and the conclusion drawn from it is not. craft.js:377 sets
  // `t = vec4(vColor, 1.0)` for mat == 4 and then craft.js:384 runs every
  // material through the SAME expression, `textured = t.rgb * (0.78 + vColor *
  // 0.55)`. For PAINTED that is x -> x*(0.78 + 0.55x): a tone curve, not a
  // pass-through. Its GAIN, the bracket (0.78 + 0.55x), passes through 1.0 at
  // x = 0.40, so it LIFTS every key paler than that and CRUSHES every key
  // darker, and it applies at full strength over the whole range a judged
  // camera sees a person - `fade` is 1.0 out to 120 m and only reaches 0 at
  // 320 m, and these figures are at 20-160 m. The right reason to use PAINTED
  // is still the second half
  // of the old comment - sand or concrete UVs on a 3 px figure would crawl as
  // the camera moves - but the colour a key renders at must be PREDICTED
  // through that curve, not read off the palette.
  //
  // Computed through the curve and ACES at the exposure that reproduces the
  // measured head-building wall (127,119,115 from pierWhite), every key the
  // three tables below use, sunlit, as 8-bit RGB:
  //
  //   pierLED       14, 22, 54   pierRoofDark  27, 30, 33   pierPile   43,36,30
  //   pierGlass     34, 45, 51   pierBrace     57, 47, 37   helterRed 154,21,31
  //   pierBanner    16, 78,124   pierBeam      75, 72, 65   pierDeck   90,78,64
  //   copperRoof    47, 92, 57   pierArch     108,104, 92   building  157,152,139
  //   helterYellow 187,143, 24   pierRail     183,183,179
  //   pierWhite    189,182,178   helterCream  192,183,161
  //
  // ⚠️ THOSE ARE ALBEDO VALUES AND THE AIR TAKES THE SATURATION BACK OUT.
  // Do not read the chroma above as what a figure renders at 200 m. Measured on
  // the rendered head camera, the helterRed figure at 21 m comes back as
  // (80,39,43) - chroma 43, not the 133 the table implies - and the
  // helterYellow one as (114,91,56), chroma 59. Haze and the desaturated
  // ambient in craft.js do that, and it is why the crowd measures chroma p50 13
  // / p90 73 in the head camera against f657's real sunlit distant people at
  // p50 18-44 / p90 34-64. The table is for ORDERING and for spotting keys that
  // collide; it is not a prediction of the pixel.
  //
  // ⚠️ THE PALE END IS ONE TONE WEARING THREE NAMES. pierRail, pierWhite and
  // helterCream come out within 6/255 of each other in luma - they are the same
  // grey in the palette (linear luma 0.774 / 0.779 / 0.782) and no material
  // curve separates them. The head table below spends three of its sixteen
  // slots on two of those names (helterCream x2, pierRail x1); counted on the
  // deal the file actually builds, that is 9 of 83 heads - 10.8% - rendering as
  // one value. ⚠️ DO NOT READ THE 24% FIGURE QUOTED AT THE HEAD TABLE AS THIS
  // NUMBER: that 24.1% is the PALE GROUP, and it only reaches 24.1% by counting
  // the 11 `building` heads, which are a genuinely separate level (157,152,139
  // against 189-192). Written as one sentence once, and it was wrong: three
  // slots do not carry 24% of the crowd. Neither figure is a defect worth
  // surgery - the deal still realises eight distinct head tones from nine keys -
  // but the next pass must not widen this table again believing three names buy
  // three tones.
  const P = MAT.PAINTED;

  // =========================================================================
  // DETERMINISM
  // =========================================================================
  // The sim replays must match frame for frame, so nothing in this file may
  // touch Math.random, Date or performance.now. Every station, offset, stature,
  // facing, lean and colour comes out of this integer hash of the figure index.
  //
  // It is the xorshift/2654435761 idiom, the same family as pier.js's
  // `((s * 7919) % 100) / 100` at the landing stages. It is multi-stream rather
  // than that one-liner because a single figure needs eight or nine independent
  // draws, and taking the one-liner six times from neighbouring inputs
  // correlates visibly - you get whole clumps of tall people in red coats.
  // Math.imul is used throughout because plain `*` on 32-bit-sized integers
  // silently goes through doubles and loses the low bits that carry the
  // randomness.
  //
  // STREAM NUMBERS IN USE, so a new one cannot silently collide with an old:
  //   21 leg colour   22 top colour   23 head colour
  //   30 sex bit      31/33 stature   32 facing jitter
  //   34 lean bearing 35 lean size    36 leg stance   37/38 head turn
  //   39/40 BUILD (girth), summed for a triangular draw - see `bk` in `stand`
  //   46 party bearing  47 party spacing   (shared by every zone that clumps)
  //   41-45 zone A    51-53 zone C    61-64 zone D    71-78 zone E
  //   81-82 gulls
  const rnd = (i, k) => {
    let h = Math.imul(i + 0x9e37, 2654435761) ^ Math.imul(k + 0x85eb, 2246822519);
    h = Math.imul(h ^ (h >>> 15), 2246822519);
    h ^= h >>> 13;
    h = Math.imul(h, 3266489909);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };

  // =========================================================================
  // PROPORTIONS
  // =========================================================================
  // Stature is the only figure in this block taken from anywhere but standard
  // anthropometry, and even it is sourced rather than measured (see the header).
  // The rest are the usual fractions of stature. Where the frames cannot
  // discriminate a fraction from anything else it is marked; where the new
  // pixel budget in the header means a fraction now DOES resolve, it has been
  // set from anthropometry rather than left at a convenient round number.
  const ADULT = 1.75;
  const CHILD = 1.20;    // f599 kiosk family: an 18 px figure beside adults at
                         // 24-29 px on the same ground plane -> 0.69 x 1.75.
                         // LOW CONFIDENCE - one frame, one small silhouette.
  const TODDLER = 0.90;  // f552 promenade group, roughly half the adult
                         // silhouette. LOW CONFIDENCE, not resolvable further.

  // ---- the four vertical stations a figure is cut at ----------------------
  const F_HIP = 0.520;   // leg/torso split, 0.91 m on an adult
  const F_CHEST = 0.700; // top of the torso box / bottom of the full-width
                         // shoulder box. WAS 0.755, which is where chest
                         // BREADTH peaks - the right station for a bare torso
                         // and the wrong one for a silhouette, because the
                         // upper arm hangs outside the ribcage and holds the
                         // body out at very nearly bideltoid width all the way
                         // down to the elbow at 0.63 of stature. Measured on
                         // the reference walker (see F_WCHEST) the silhouette
                         // stays within 5% of its maximum from the shoulder
                         // down to 0.58 of stature - a full-width band 0.16-0.18
                         // of stature tall against the 0.090 this file built.
                         // 0.700 is the mid-humerus, and it makes the band
                         // 0.118 - still short of the reference, but the rest
                         // of the difference is forearm and is behind the deck
                         // edge in every judged camera.
  const F_ACR = 0.818;   // ACROMION - the top of the full-width shoulder box.
                         // REPLACES F_SHO 0.845, the deltoid CROWN, which used
                         // to be both the shoulder-box top and the head-box
                         // bottom. The crown is a rounded bulge on the OUTER
                         // end of a shoulder that slopes about 25 degrees down
                         // and out from the neck; carrying a full-width box up
                         // to it modelled that bulge as a plateau 0.45 m wide,
                         // and the plateau is the flange in "bottle-shaped".
                         // The 0.027 of stature between 0.818 and 0.845 is now
                         // the bottom of the yoke box below.
  const F_NECK = 0.870;  // C7 / the base of the neck, and the CHIN. The head
                         // box is now the true head, vertex to chin, 0.130 of
                         // stature - see the yoke note in `stand`.
  const F_HEADH = 0.125; // head height FLOOR, 0.22 m. Only binds for children
                         // and toddlers, whose headK pushes the chin below
                         // F_NECK; for an adult F_NECK governs and the head box
                         // comes out 0.130 of stature.

  // ---- and the four widths ------------------------------------------------
  const F_WLEG = 0.160;  // 0.28 m across both legs at mid-thigh. Was
                         // F_WHIP * 0.88 = 0.30 m, which is hip BREADTH, not
                         // leg width; the legs are narrower than the hips.
  // ⚠️ THIS CONSTANT WAS A BARE-TORSO MEASUREMENT ON A CLOTHED SILHOUETTE, AND
  // IT IS WHAT MADE THE CROWD READ AS BOTTLES.
  //
  // It was 0.171 (0.30 m), documented above as the mean of waist breadth (0.28)
  // and chest breadth (0.32). Both numbers are right and both are measurements
  // of a NAKED TRUNK. The silhouette of a standing person is not the trunk: the
  // arms hang OUTSIDE the ribcage and fill the taper in, so a real standing
  // adult is very nearly parallel-sided from the shoulder to the hip. The file
  // then compounded it by calling the inverted trapezoid "the single strongest
  // 'this is an adult human' cue in a silhouette" - true of an anatomy plate,
  // false of a person in a coat, and it went into the geometry unchecked.
  //
  // MEASURED THIS PASS, on the owner's own photograph of this exact subject,
  // bournemouth-reference/bournemouth-pier/926506622814109.jpg, by a
  // centre-anchored horizontal silhouette scan against a per-row background:
  //
  //   subject                        crop          shoulder  mid-torso  ratio
  //   walking man, rucksack     1770,625-1855,805    45 px      36 px    0.80
  //   standing woman, open coat  870,660- 970,760    30 px      28 px    0.93
  //
  //   this file, before                                                  0.667
  //
  // ⚠️ THE STATURE IN THIS PARENTHESIS WAS WRONG AND IS CORRECTED. It read
  // "the man's stature reads 129 px in that crop, so his mid-torso is 0.279 of
  // stature against a bideltoid 0.257 - the arms really do carry it past the
  // bare-trunk figure." Re-measured 2026-08-21 on the same frame: the top of
  // his hair is at y 635 and the sole of his lower shoe at y 782, so he is
  // 145-147 px, not 129. 129 px is the distance from his head to the WET-SAND
  // LINE at y 764, which crosses the frame ABOVE both of his shoes. His
  // mid-torso is therefore 36/146 = 0.247 of stature and his shoulder 45/146 =
  // 0.308 - he is a broader man than the anthropometric fractions this file
  // builds, not a narrower one, and his mid-torso does NOT exceed bideltoid.
  // ⚠️ NONE OF THAT MOVES THE CONSTANT. The number F_WCHEST is set from is the
  // RATIO 36/45 = 0.80 inside one frame, which is stature-free; it was
  // re-measured this pass and reproduces exactly (shoulder 44-48 px over rows
  // 669-681, mid-torso 36-38 px over rows 696-700). Only the parenthesis was
  // wrong, and it is the kind of wrong this project keeps shipping.
  // The photograph is OVERCAST, so per trap 5 nothing
  // absolute is taken from it; a width RATIO inside one frame is exactly the
  // same-station method this file already trusts for everything horizontal.
  //
  // 0.213 / 0.257 = 0.829, inside the measured 0.80-0.93 bracket and at the
  // conservative end of it. It costs ZERO triangles.
  const F_WCHEST = 0.213; // 0.373 m - trunk WITH THE ARMS AT THE SIDES.
  const F_WSHO = 0.257;  // Shoulder (bideltoid) breadth, 0.45 m. Consistent
                         // with the 1.0 m clump pitch measured in f647 leaving
                         // a body-width gap between neighbours - which is the
                         // only frame evidence for it.
  const F_WYOKE = 0.150; // THE YOKE - one box across the sloping shoulder,
                         // between the acromion and the chin. Its width is not
                         // an anatomical breadth; it is the width the reference
                         // silhouette's own head-to-shoulder RAMP passes
                         // through. On the walker above that ramp climbs from
                         // 17 px (neck) to 45 px (full shoulder) over 10 rows -
                         // 0.069 of his stature, NOT the 0.078 written here
                         // before, which divided by the wrong stature; see the
                         // correction at F_WCHEST - and reads 26 px at its
                         // midpoint, 0.578 of the shoulder. 0.578 x 0.257 =
                         // 0.149. The geometric mean of the head and shoulder
                         // widths is 0.150, which is the same number by a
                         // different route, so 0.150 is used.
  const F_WHEAD = 0.087; // HEAD BREADTH, 0.152 m. Was 0.097 (0.170 m), which is
                         // between head breadth and head LENGTH and so read
                         // wide from every azimuth. Measured on the built
                         // geometry, the old head box came out 0.19-0.235 m
                         // across and averaged 0.525 of its own torso's width
                         // against an anatomical 0.152/0.450 = 0.338. That
                         // single ratio is most of the minifig read.
  const F_DHEAD = 0.112; // head length front-to-back, 0.196 m
  const F_DEPTH = 0.132; // body depth at the CHEST, 0.23 m.
  // ⚠️ A SHOULDER IS NOT AS DEEP AS A CHEST, and treating it as one is what
  // paints the bright bar. The sun here is fixed at normalize3(-0.35, 0.72,
  // 0.60), so a horizontal top face takes N.L = 0.720 while a vertical face whose
  // normal pointed straight at the head camera would take 0.175 - 4.1x.
  // ⚠️⚠️ THAT ARGUMENT DOES NOT SURVIVE THE ABLATION. K_DSHO IS PAYING FOR A
  // SURFACE NO JUDGED CAMERA RENDERS. Verified 2026-08-21: (a) no box face here
  // has N.L 0.175 - these boxes are PIER-space axis-aligned, so the two faces the
  // head camera sees are s+ (N.L 0.559) and o+ (N.L 0, in shadow), against a top
  // face at 0.720, i.e. 1.29x not 4.1x; (b) decisively, EVERY judged camera eye is
  // 1.6-4.0 m and every acromion is at DECK + 1.43 = 6.90 m, so the sunlit top
  // plate is back-facing and behind its own front face in all five views - it is
  // never drawn. Rendered A/B at fov 5 with K_DSHO/K_DYOKE forced to 1.00: crowd
  // luminance p50/p90/max moves 164/188/196 -> 161/187/196, so no bright bar
  // appears or disappears; the only thing that changes is silhouette area, +3.3%.
  // The projected-ratio bill below is therefore this constant's WHOLE effect.
  // The constants are still left alone here - that is the owner's call - but the
  // trade is now priced honestly. The old shoulder box was
  // 0.45 x 0.23 m and its head covered 0.152 x 0.196, leaving 0.0737 m2 of
  // sunlit horizontal plate drawn straight across the figure at shoulder
  // height. Fore-and-aft the body at the acromion is scapula to clavicle,
  // about 0.16 m, not the 0.23 m of the chest; at the neck base it is about
  // 0.145. Those are sourced, not measured off a frame - no frame in this
  // project resolves a shoulder in plan - but they are the right direction and
  // they cost nothing.
  //
  // ⚠️⚠️ K_DSHO PAYS FOR THE PLATE WITH THE SILHOUETTE, AND NOBODY MEASURED
  // THE BILL. Projected through the head camera - the one that carries 91% of
  // this file's pixels - a box of plan w x d seen along a pier-space bearing
  // (vs, vo) is (Es.|vo| + Eo.|vs|) wide, so making the shoulder box 30%
  // shallower than the chest NARROWS ITS PROJECTION at every oblique bearing.
  // Computed over the 22 east-rail figures as built:
  //
  //   torso / shoulder, PROJECTED       min     p50     max
  //   old file (F_WCHEST 0.171, KS 1)  0.724   0.767   0.894
  //   as built (F_WCHEST 0.213, KS .7) 0.902   0.965   1.176
  //   F_WCHEST 0.213 with K_DSHO 1.00  0.858   0.880   0.945
  //
  // The bracket this file measured off the photograph is 0.80-0.93 and the
  // constant was set to 0.829 IN PLAN. In the camera the crowd renders at a
  // p50 of 0.965, with 18 of 22 figures OUTSIDE the bracket on the far side
  // (re-counted 2026-08-21: 18, not 16; min/p50/max 0.902/0.964/1.176 reproduce) -
  // the widest part of the figure is now the waist, not the shoulders. Read on
  // the rendered pixels (CROWD-0 difference at fov 5) a clean figure measures
  // head 25 px, yoke 29, shoulder 41, torso 43-46: an inverted taper.
  // F_WCHEST alone would have landed at 0.880; K_DSHO is what carries it past.
  // ⚠️ AND K_DSHO REPEATS THE EXACT MISTAKE F_WCHEST WAS CORRECTING.
  // Scapula-to-clavicle 0.16 m is a SKELETAL depth. The deltoid and the arm sit
  // fore and aft of it, so no clothed person is shallower at the shoulder than
  // at the chest, which is what 0.70 builds. Both numbers are left alone here
  // because K_DSHO is doing real work on the sunlit plate and because this is
  // not the file that measured it - but the next pass owns this trade, and it
  // must judge it on the PROJECTED ratio, not the plan one.
  const K_DSHO = 0.70;   // 0.161 m at the acromion
  const K_DYOKE = 0.62;  // 0.143 m at the neck base (written as 0.145 before;
                         // 0.62 x 0.132 x 1.75 is 0.1432)

  // Children carry a proportionally larger head, and at this range the
  // silhouette IS the figure, so the head is scaled less than the body:
  // 0.85 against the body's 0.686 gives this multiplier on F_HEADH/F_WHEAD.
  const HEADK_CHILD = 1.24;
  const HEADK_TODDLER = 1.45;   // INVENTED. The spec gives the child ratio only;
                                // a toddler's head is proportionally larger
                                // again, and this is a guess, not a reading.

  // Feet sit slightly proud of the slab so no sole is coplanar with the deck's
  // top face. The neck gets the larger offset because pier-deck-furniture.js
  // lays a timber wearing course to DECK + 0.045 there, and a figure based at
  // DECK would stand with its feet inside the boards.
  const foot = (s) => (s < 128 ? DECK + 0.05 : DECK + 0.02);

  // =========================================================================
  // CLOTHING
  // =========================================================================
  // INDICATIVE, NOT MEASURED in absolute colour, and flagged as such by the
  // measurement pass. Most usable video frames are dusk, backlit or overcast,
  // so figures read as near-black silhouettes; only f562, f652, f635 and f636
  // carry real colour. Those four show ordinary UK seaside dress - dark
  // navy/black outerwear dominant with roughly one high-chroma item (red, pink,
  // hi-vis yellow) per five or six people.
  //
  // ⚠️ THE OLD TABLE DID NOT PRODUCE WHAT ITS OWN COMMENT CLAIMED. It said
  // "twelve slots, eight dark, two pale, two bright, gives one bright in six",
  // i.e. 17% bright. Counted on the geometry this file actually builds, the
  // realised split was 61% dark, 16% pale, 23% BRIGHT - one bright in 4.4. The
  // hash does not deal a 12-entry table evenly over 83 draws, and nobody had
  // ever counted the deal. This table is 18 slots and the realised split is
  // asserted in the report, not in a comment.
  //
  // Widened from 8 distinct keys to 13. Eight keys over 83 people is 10 people
  // per coat, and four of the eight (pierRoofDark, pierPile, pierBrace,
  // pierBeam) render within 0.13 of each other in linear luma, so the crowd
  // effectively had THREE tones: dark, white, red. pierGlass, pierLED and
  // pierBanner are the navy/denim end that a real seaside crowd is mostly
  // wearing and that the palette already carries for other reasons.
  // ⚠️ A NAVY/DENIM RE-DEAL WAS TRIED 2026-08-29 AND MEASURED INEFFECTIVE -
  // DO NOT RE-TRY AT THE DEAL LEVEL. Motivation: a CROWD-0 difference on the
  // head camera (clean pair, 0 changed px in the sky control) read crowd
  // chroma p50 15 / p90 25 against f657's real sunlit crowds at p50 18-31 /
  // p90 38-60, measured on two promenade boxes, clip-gated per trap 17 -
  // which reproduces the p50 18-44 / p90 34-64 quoted further up. The trial:
  // one pierPile -> pierLED and the pierBeam slot -> pierBanner, 2 of 18
  // slots, table length unchanged (the hash indexes by length, so changing
  // the length silently re-deals every figure). Measured: 107 crowd pixels
  // changed in the head camera, 928 in a fov-10 rail zoom, every one inside
  // the crowd mask - and the population chroma DID NOT MOVE: p50 15 / p90 26
  // after against 15 / 25 before. Two slots re-colour ~11% of figures and
  // the median pixel never changes hands; moving the p50 would take a
  // wholesale re-deal AGAINST the "dark navy/black outerwear dominant" dress
  // note above. The deficit is not this table's: the desaturated ambient and
  // haze compress albedo chroma about 3x (helterRed 133 renders at 43,
  // measured above), so dark outerwear lands at chroma 10-20 where the real
  // crowd's lands at 18-31. That is the same sky-ambient disease
  // renderer.js's ambient block documents and STATUS.md carries as open
  // item 2. Fix it there; this table is not the lever.
  //
  // ⚠️ 2026-09-16 RE-DEAL - A DRESS DISTRIBUTION FIX, NOT A CHROMA FIX. Same
  // 15 keys, same 18 slots, same length (a PERMUTATION of the old table), so
  // no figure outside this table is re-dealt. Why:
  //   - The hash does not deal 18 slots evenly either. Counted on the built
  //     geometry (tmp-tr6/crowd/tools/census.mjs, 77 standing + 6 seated = 83),
  //     figures per slot index are 7 3 3 3 3 2 2 6 5 3 9 5 5 4 4 4 7 8.
  //     The old order put helterRed and helterYellow on the 7 and the 8 and
  //     realised BRIGHT 20/83 = 24% - one in 4.2, not the "one bright in six"
  //     its own comment promised - with DARK only 21/83 = 25% against the
  //     "dark outerwear dominant" note above.
  //   - Reference: DJI_20250427143543_0033_D.MP4, 27 Apr 14:35, SUNNY, high
  //     sun. 33 people read off 6 frames at 1:1, duplicates across frames
  //     dropped; 9 bare torso / swimwear, 24 dressed. Dressed upper garments
  //     read DARK 11 (46%), MID 5 (21%), PALE 6 (25%), BRIGHT 2 (8%, a teal
  //     and a pink tee). Wilson 95% intervals at n = 24: dark 28-65%, bright
  //     2-26%. Old deal dark 25% sat OUTSIDE its interval, bright 24% on the
  //     edge; a pixel instrument on the same masks read bright 1/27, dark 48%.
  //     Categories on key albedo: dark L* < 36, pale L* >= 66, bright = sRGB
  //     saturation >= 0.45 and not dark.
  //   - The new order puts the heavy slots on black and the light slots on
  //     colour. Realised: DARK 33 (40%), MID 22 (27%), PALE 18 (22%), BRIGHT
  //     10 (12%) - one in 8.3, between the sunny reference's one in 12 and
  //     the f562/f635/f636 note's one in 5-6. Every share is inside the
  //     reference's interval. Seasonal caveat: the reference is SPRING, coats
  //     and t-shirts in one frame; a July crowd would read paler and brighter.
  //   - Expected side effect, stated: fewer red/yellow figures lowers crowd
  //     chroma a little further. That deficit belongs to open item 2 (see the
  //     paragraph above); do not undo this to chase it.
  // If you reorder this table, re-run the census - the slot weights, not the
  // slot counts, decide what the crowd wears.
  const TOPS = [
    C.pierRoofDark,                                   // slot 0  x7  black / charcoal
    C.pierPile, C.pierPile,                           // slots 1-2 x3 very dark brown
    C.helterYellow, C.pierBanner,                     // slots 3-4 x3 yellow, denim
    C.pierGlass, C.pierBrace,                         // slots 5-6 x2 slate, brown
    C.pierRoofDark,                                   // slot 7  x6  black / charcoal
    C.building,                                       // slot 8  x5  stone
    C.pierDeck,                                       // slot 9  x3  khaki
    C.pierRoofDark,                                   // slot 10 x9  black / charcoal
    C.helterCream,                                    // slot 11 x5  cream
    C.pierLED,                                        // slot 12 x5  navy
    C.helterRed,                                      // slot 13 x4  red
    C.copperRoof, C.pierBeam,                         // slots 14-15 x4 olive, grey
    C.pierArch,                                       // slot 16 x7  pale grey
    C.pierWhite,                                      // slot 17 x8  white
  ];
  // Legs read darker than tops in every colour frame - jeans and dark trousers,
  // no exceptions worth modelling. One pale slot for summer trousers, because
  // f562 has one and a leg row of nothing but black is its own kind of comb.
  const LEGS = [C.pierRoofDark, C.pierRoofDark, C.pierRoofDark,
                C.pierPile, C.pierPile, C.pierGlass, C.pierGlass,
                C.pierLED, C.pierBrace, C.pierBeam, C.pierDeck, C.pierWhite];

  // ⚠️ THE HEAD TABLE IS THE BIGGEST DELIBERATE CHANGE IN THIS FILE, AND IT
  // OVERTURNS A CLAIM THAT WAS WRITTEN HERE AS A PRINCIPLE.
  //
  // The old table was [cream, cream, cream, roofDark] and the comment above it
  // said "a PALE HEAD over a DARK TORSO - that contrast is the whole reason a
  // 36-triangle figure reads as a person at all". Counted on the built
  // geometry, 82% of heads came out the single key C.helterCream. In the head
  // camera that is a row of twenty-two identical pale tan cubes along one
  // railing, and it is the loudest thing in the frame.
  //
  // Checked against the owner's own photograph of this exact subject -
  // bournemouth-reference/bournemouth-pier/926506622814109.jpg, the pier deck
  // crowd behind the railing, read at the same relative scale - roughly one
  // head in ten reads pale (one blonde in the group), the rest read as dark
  // hair. That frame is OVERCAST, so per trap 5 no absolute colour is taken
  // from it; what is taken is the SAME-STATION RATIO of head tone to the torso
  // beneath it in one frame, which is the method this file already trusts for
  // everything horizontal.
  //
  // The compromise, counted on the 83 figures this file actually builds:
  // 24% pale (building / helterCream / pierRail), 12% mid grey (pierArch), and
  // 64% dark-to-brown across five keys. Not the photograph's 10% pale,
  // because from below a high sun the crown of the head is the lit surface and
  // because a quarter of the crowd still carrying the pale-head device is what
  // keeps a 4 px figure in the approach camera reading as a person at all. The
  // principle in the old comment is downgraded from "every figure" to "a
  // quarter of them", deliberately, with the frame that says so named above.
  const HEADS = [
    C.pierRoofDark, C.pierRoofDark, C.pierRoofDark,   // dark hair, hat, hood
    C.pierPile, C.pierPile, C.pierBrace, C.pierBrace, // dark and mid brown
    C.pierDeck, C.pierBeam, C.pierArch, C.pierArch,   // mid brown, grey, fair
    C.building, C.building,                           // sunlit fair hair
    C.helterCream, C.helterCream, C.pierRail,         // pale skin, blond, white
  ];

  // =========================================================================
  // ONE FIGURE
  // =========================================================================
  // FACING. pbox is axis-aligned IN PIER SPACE, so a figure genuinely cannot
  // rotate. Facing is expressed instead as the footprint of the rotated body.
  //
  //   a = 0       shoulders along the pier axis: square to a SIDE railing,
  //               looking out over the water. The railing posture.
  //   a = PI/2    shoulders across the pier: a walker, or someone at the
  //               seaward end railing looking straight out to sea.
  //
  // ⚠️ THE FOOTPRINT IS AN ELLIPSE, NOT THE BOUNDING BOX OF A ROTATED
  // RECTANGLE. The old code took the bounding box and its comment said that
  // "at 45 degrees that over-reads the silhouette by about 50 mm, which is a
  // quarter of a pixel at 150 m". Two things were wrong with that.
  //   - The nearest figures are at 20-60 m, not 150 (header), where the same
  //     error is 1.5-6 px.
  //   - Worse, the over-read is not 50 mm. A 0.45 x 0.23 rectangle turned 45
  //     degrees bounds to 0.481 x 0.481, and a SQUARE plan projects 0.481 to
  //     0.680 m wide depending on where the camera stands - so a figure could
  //     render 51% wider than a human being. Measured on the built geometry the
  //     torso box reached 0.517 x 0.515 m in plan, a 0.73 m diagonal.
  // A human torso in plan is an ellipse, not a rectangle. Its support along
  // each axis is sqrt((w.cos a)^2 + (d.sin a)^2)/2, which is exact at a = 0,
  // never over-reads, and still gives every figure in a clump a slightly
  // different width - which is why the bounding box was there in the first
  // place. This change makes the whole crowd narrower and costs nothing.
  const A_ACROSS = 0, A_ALONG = Math.PI / 2;

  // ⚠️ AND THE BOX STILL HAS CORNERS. The ellipse footprint fixes the box's
  // DIMENSIONS; it cannot fix the fact that an axis-aligned box viewed from 45
  // degrees presents its diagonal. Measured on the built geometry, through the
  // head camera's own plan bearing - its screen-horizontal makes 51 degrees
  // with the head crowd's shoulder line, so the corner is close to worst case:
  //
  //     true elliptical torso section      0.335 m wide
  //     the box that bounds it             0.463 m wide     +38%
  //     the old bounding-box geometry      0.570 m wide     +70%
  //
  // A box cannot be right at every bearing, so it is made right ON AVERAGE.
  // For a rectangle a x b the mean projected width over all bearings is
  // (2/pi)(a+b); for the ellipse it bounds it is that ellipse's perimeter/pi.
  // Torso 0.450 x 0.231: 0.3493 / 0.4335 = 0.806. Head 0.152 x 0.196:
  // 0.1747 / 0.2215 = 0.789. The two agree, so ONE factor does both.
  //
  // The trade this makes, stated rather than hidden: dead square-on a figure
  // now reads about 19% narrower than a real one, and at 45 degrees about 11%
  // wider, against 0% and +38% before. It is the right trade because square-on
  // is one bearing and oblique is all the others, and because the render's
  // nearest figure measured 16 px wide on a 55 px body - 0.29 of its own height
  // where a real person averages 0.22 - which is most of what "brick" means.
  const PLAN_K = 0.80;

  // ⚠️ WHERE A LEAN IS ANCHORED, and why it is the shoulder and not the feet.
  //
  // Nobody stands vertical, and a row of vertical boxes is a picket fence. But
  // a lean cannot simply be hung off the soles: every stand-off, pitch, gap and
  // keep-out in this file was read off HEADS AND SHOULDERS in a photograph, not
  // off feet, and swinging the top of the figure out by 0.16 m would push the
  // head-railing crowd through pier-railings-parapet.js's rail at o 24.10 and
  // the neck walkers through pier.js's shelter glazing at |o| 4.91-5.09. Both
  // clearances are recorded in this file as having ALREADY been got wrong once.
  //
  // Anchoring at 0.80 of stature - the middle of the shoulder box - makes the
  // (s, o) passed to `stand` the position of the SHOULDERS. The feet swing
  // inboard instead. ⚠️ THE ARITHMETIC THAT USED TO BE ON THIS LINE WAS STALE:
  // it read "at most 0.80 x 1.95 x 0.115 = 0.18 m" against a LEAN_RAIL cap of
  // 0.115 rad that the block below had already raised to 0.160. Re-measured on
  // the built geometry rather than re-derived: the largest head-box-centre to
  // foot-box-centre plan offset over the 77 standing figures is 0.248 m, p50
  // 0.085 and p90 0.178. 0.248 is still inside the 0.30 m keep-out padding and
  // well inside the 0.60 m minimum spacing, so the conclusion survives - but it
  // survives on a measurement now, not on a superseded constant. It also happens
  // to be what leaning on a railing actually looks like: chest at the rail,
  // feet half a metre back. Every clearance in this file got BETTER, not worse:
  // Measured on the BUILT geometry after PLAN_K, not from arithmetic: the
  // walker's worst reach went 4.89 -> 4.805 against an obstruction at 4.91, the
  // head rail's 24.09 -> 23.915, and the seaward end rail's 261.50 -> 261.371
  // against posts whose centreline is at 261.682.
  // ⚠️ THE HEAD-RAIL CLEARANCE OF 171 mm DOES NOT EXIST AND NEITHER DOES THE
  // 24.0865 IT IS SUBTRACTED FROM. Re-measured 2026-08-21 on
  // pier-railings-parapet.js's own built ctubes over s 215-258: ONE centreline,
  // o 24.0984, carrying posts at r 0.033 (inner face 24.0654), two mid rails at
  // r 0.020 (24.0784) and the top rail at r 0.0425 (24.0559). The nearest built
  // face is 24.0559. Against the crowd's outermost box at o 23.9150 that is
  // 141 mm, or 150 mm if only the posts are counted. 24.0865 is not any of
  // them. The gap is still positive and comfortable - a whole-module
  // penetration sweep against all five other pier modules finds ZERO
  // intersecting box pairs - but 171 mm is a number this mesh does not carry.
  // (That module was written after this line, so it may have moved underneath
  // it. Measure it, do not inherit it.)
  // ⚠️ THE THREE NUMBERS ABOVE ARE THE SAME MEASUREMENTS QUOTED AGAIN AT THEIR
  // OWN CALL SITES, and this copy went stale once already: it read 261.354
  // while the call site 660 lines down had been re-measured in the same pass.
  // If you re-measure one, re-measure both - a number that appears twice is a
  // number that will disagree with itself. It did it again, in the other
  // direction: the head-rail clearance was written as 155 mm here and 159 mm at
  // two other sites, and 24.0865 - 23.931 is 155. All three were then written as
  // 171 mm, and 171 mm is ALSO wrong - see the block immediately above. VERIFIED
  // 2026-08-21 by an independent pass, off both modules' built geometry: the
  // head-rail clearance is 141 mm (nearest built rail face o 24.0559 against the
  // crowd's outermost box at o 23.9150). All three sites now carry 141.
  //
  // ⚠️ ALL THREE MOVED THIS PASS AND TWO OF THEM IMPROVED. Widening the torso
  // to carry the arms (F_WCHEST) and giving every figure a hashed build (bk)
  // both push outward; making the shoulder box shallower than the chest
  // (K_DSHO) pulls in, and at the bearings these crowds actually stand it wins.
  // Head rail 155 -> 141 mm clear (the 171 that stood here was measured against a
  // rail face this mesh does not carry), seaward end 274 -> 278 mm, and only the neck
  // walkers lost ground, 112 -> 105 mm. Re-measured on the built geometry, not
  // re-derived.
  const LEAN_ANCHOR = 0.80;

  // Counted, not estimated, and returned at the end so the box budget for this
  // feature can be asserted from outside instead of taken on trust. The caller
  // is free to ignore it.
  let boxes = 0;

  // lnS/lnO are the lean, in radians, along and across the pier.
  const stand = (s, o, h, a, i, headK = 1, legs = true, lnS = 0, lnO = 0) => {
    const ca = Math.abs(Math.cos(a)), sa = Math.abs(Math.sin(a));
    // ⚠️ BUILD. Every width in this file used to be a fixed fraction of h, so
    // the crowd had SIXTY-EIGHT HEIGHTS AND ONE BODY: measured on the built
    // geometry before this pass, the mean plan width over the visible band
    // 0.49-1.00 of stature ran p10 0.1325 to p90 0.1388 - a 4.7% spread, all of
    // it inherited from stature. Real adults vary in girth at a fixed height:
    // bideltoid breadth has sd/mean about 5.8%, and a coat or a rucksack widens
    // a silhouette further without touching it at all. Two hashed uniforms
    // summed give a triangular draw on [0.85, 1.15], sd 0.15/sqrt(6) = 0.061 -
    // the anthropometric figure, and clothing means erring narrow is the safe
    // side for the railing clearances below.
    // NOT applied to the head: head breadth has sd/mean about 4% and is only
    // weakly tied to build, and a hashed head would just make the smallest
    // figures pin-headed at 3 px.
    const bk = 1 + (rnd(i, 39) + rnd(i, 40) - 1) * 0.15;
    const D = h * F_DEPTH * bk;
    const fy = foot(s);
    const anchor = h * LEAN_ANCHOR;
    // Contrapposto. The legs get a small extra sideways offset of their own, so
    // the body is not a stack of boxes sharing one centreline. +/- 0.035 m
    // against a leg box 0.22 m wide and a torso box that WIDENED THIS PASS from
    // 0.24 m to 0.30 m (F_WCHEST). ⚠️ THAT SWALLOWED THE EFFECT THIS COMMENT
    // USED TO CLAIM. At full stance the leg box's outer edge is now 0.035 +
    // 0.112 = 0.147 m from the centreline against a torso half-width of
    // 0.149 - the legs no longer stand proud of the torso at all, where they
    // used to break its outline by 27 mm. The offset survives as a leg-to-torso
    // AXIS offset, which still stops the figure being one centred stack for a
    // replay camera, but it is no longer a silhouette feature and this comment
    // no longer claims it is. It was always behind the deck edge in every
    // judged camera, so nothing a judged camera sees has changed.
    const stance = (rnd(i, 36) - 0.5) * 0.07;
    const put = (w, d, y0, y1, col, xs = 0, xo = 0) => {
      const es = 0.5 * PLAN_K * Math.hypot(w * ca, d * sa);
      const eo = 0.5 * PLAN_K * Math.hypot(w * sa, d * ca);
      const ym = (y0 + y1) * 0.5 - fy - anchor;      // signed height off the anchor
      const ds = s + ym * lnS + xs, dop = o + ym * lnO + xo;
      pbox(ds - es, ds + es, dop - eo, dop + eo, y0, y1, col, P);
      boxes++;
    };
    // Legs as ONE box, not two. The gap between a pair of legs is 0.10 m -
    // 3.1 px on the very nearest figure in the head camera and 1.7 px on a
    // typical one - and it sits between 0.1 and 0.5 of
    // stature, which the occlusion table in the header shows is behind the deck
    // edge from every judged camera. See NECK_LEGS for why the box survives.
    if (legs) {
      put(h * F_WLEG * bk, D * 0.78, fy, fy + h * F_HIP,
        LEGS[Math.floor(rnd(i, 21) * LEGS.length)], stance * 0.5, stance);
    }
    // ⚠️ THE YOKE, AND WHY THE OLD TWO-STEP LADDER READ AS A BOTTLE.
    //
    // The old ladder was chest 0.520-0.755 at 0.171 wide, shoulders
    // 0.755-0.845 at 0.257, head 0.845-1.000 at 0.087. The head railing crops
    // these figures at roughly 0.62-0.65 of stature (the occlusion table's
    // 0.49 is an upper bound and the header says so), so what a judged camera
    // is shown is: a NARROW sliver of chest, a SHORT WIDE slab, then a NARROW
    // head. Narrow-wide-narrow, with the wide part only 0.090 of stature tall
    // and sitting directly under the head. That is not an abstraction of a
    // person, it is the profile of a bottle, and the surveyor's word for it
    // was "bottle-shaped bollards".
    //
    // Three things were wrong and all three are geometry, not colour:
    //   1. the sliver below the slab was a bare-trunk width - see F_WCHEST;
    //   2. the slab was too short - see F_CHEST;
    //   3. the step from the slab to the head happened in ONE jump, at one
    //      height, across a fully sunlit horizontal plate - see K_DSHO.
    // The yoke fixes (3). It is one box between the acromion and the chin at
    // the width the reference's own shoulder ramp passes through, and it turns
    // the single 0.257 -> 0.087 step into 0.257 -> 0.150 -> 0.087.
    //
    // ⚠️ IT IS THE ONLY BOX THIS PASS ADDS, AND IT IS BOUGHT AT THE PRICE THE
    // HEADER REJECTED ARMS AT. 77 standing figures, 924 triangles, the same
    // count as the leg box and half what a pair of arms would cost. The header
    // rejects arms because an arm adds 0.08 m of silhouette at the SIDE of a
    // figure, where the box already over-reads at oblique bearings. The yoke
    // adds nothing to the silhouette's width, and it sits between 0.818 and
    // 0.870 of stature - inside the 0.49-1.00 band that every judged camera
    // sees, and above the deck edge in all of them.
    //
    // ⚠️ WHAT IT DOES TO THE SUNLIT PLATE, CORRECTED. This claimed "it removes
    // 0.036 m2 of the 0.0737 m2 sunlit plate". IT REMOVES NONE OF IT. Stacking
    // a nested box on top of another does not delete horizontal area: the total
    // exposed top face is (shoulder footprint - head footprint) whatever sits
    // between them, and measured on the 77 built figures the yoke changes that
    // total slightly WORSE, because the head box is
    // deeper than the yoke (F_DHEAD 0.112 against K_DYOKE x F_DEPTH 0.082) and
    // overhangs it. ⚠️ THE SIZE OF THAT WAS WRONG HERE: it read -0.00026 m2.
    // Re-measured 2026-08-21 over the 77 built figures, PLAN_K included, as
    // (sho - sho∩yoke) + (yoke - yoke∩head) against (sho - sho∩head): the mean
    // exposed top face goes 0.03180 -> 0.03334 m2, i.e. +0.00154 m2 - SIX TIMES
    // the figure quoted. Direction and conclusion unchanged, magnitude was not. What the yoke actually does is SPLIT the plate in two and
    // move part of it up: measured, 0.0100 m2 of the 0.0318 m2 that used to be
    // one bar at shoulder height is now a separate, 42% narrower bar (on the
    // nominal widths 0.150/0.257; 35% on the built AABB o-extents) 0.052 of
    // stature higher. A 31% smaller bright bar at the bottle shoulder, not a
    // deleted one. The reduction from 0.0737 to 0.0430 is K_DSHO's, not the
    // yoke's.
    // ⚠️ AND EVERY AREA IN m2 IN THIS BLOCK IGNORES PLAN_K. PLAN_K = 0.80 is
    // applied to BOTH plan axes, so what is built is 0.64x the raw arithmetic:
    // the real plate on a mean figure is 0.0333 m2 as built with the yoke
    // (0.0318 without it), not 0.0430. The raw figures
    // are kept because they are what the anatomy is quoted in, but they are not
    // measurements of this mesh.
    //
    // ⚠️ HONEST LIMIT, stated because this file's rule is to state them: the
    // yoke is 0.052 of stature. On the head camera's biggest measured blob,
    // 19 px, that is 1.8 px, and on the p50 blob of 2 px it is nothing. It
    // buys the ~15% of blobs above 10 px and no others. If a later pass wants
    // the 924 triangles back, this is where they are and this is what they do.
    //
    // min() twice rather than straight constants because a toddler's headK
    // pushes its chin below the acromion; taking the lower of the two at each
    // joint means no box ever inverts or floats, at any headK. Checked at
    // headK 1.00 / 1.24 / 1.45: the yoke comes out 0.052 / 0.030 / 0.030 of
    // stature and every box keeps y0 < y1.
    const hh = h * F_HEADH * headK;
    const chin = fy + Math.min(h - hh, h * F_NECK);
    const acr = Math.min(fy + h * F_ACR, chin - 0.03 * h);
    const top = TOPS[Math.floor(rnd(i, 22) * TOPS.length)];
    // Torso, shoulders, yoke. Widths 0.213 -> 0.257 -> 0.150: the body is
    // near parallel-sided from hip to shoulder because the arms are in the
    // silhouette (F_WCHEST), then the shoulder line slopes away to the neck
    // over 0.052 of stature (F_WYOKE). A single constant-width torso box is a
    // brick and a two-step one is a bottle; rendering both and looking at them
    // is how each was diagnosed.
    put(h * F_WCHEST * bk, D, fy + h * (legs ? F_HIP : F_HIP - 0.02), fy + h * F_CHEST, top);
    put(h * F_WSHO * bk, D * K_DSHO, fy + h * F_CHEST, acr, top);
    // The yoke wears the TOP colour, not the head colour: at the base of the
    // neck what a camera sees is a collar, a hood or a coat shoulder, not skin.
    put(h * F_WYOKE * bk, D * K_DYOKE, acr, chin, top);
    // A HEAD IS NOT BOLTED SQUARE TO THE SHOULDERS. +/- 0.035 m of hashed
    // offset - a turn or a tilt - and it is worth having for the same reason
    // the lean is: set against the owner's photograph of this crowd
    // (bournemouth-reference/bournemouth-pier/926506622814109.jpg, the deck
    // crowd behind the railing, matched to the render at the same scale) the
    // single thing that still read as manufactured was every head sitting dead
    // centre on its own shoulders. 0.035 m is 1.1 px on the nearest figure and
    // a third of the head's own width, so it never leaves the shoulders.
    put(h * F_WHEAD * headK, h * F_DHEAD * headK, chin, fy + h,
      HEADS[Math.floor(rnd(i, 23) * HEADS.length)],
      (rnd(i, 37) - 0.5) * 0.07, (rnd(i, 38) - 0.5) * 0.07);
  };

  // ⚠️ ADULT STATURE. THE OLD COMMENT DESCRIBED A DISTRIBUTION THE OLD CODE DID
  // NOT PRODUCE, and it is worth spelling out because it is the exact failure
  // this project keeps repeating.
  //
  // The old line was `ADULT + (rnd - 0.5) * 0.18` and the comment said
  // "+/- 0.09 m is about 1.3 standard deviations of real adult stature". A
  // uniform draw over +/- 0.09 has a standard deviation of 0.18/sqrt(12) =
  // 0.052 m. Measured on the built geometry: 68 standing adults, min 1.660,
  // max 1.837, sd 0.0486. Real mixed-sex UK adult stature has sd ~0.098 - the
  // mixture of N(1.775, 0.070) for men and N(1.635, 0.065) for women. So the
  // crowd was built with HALF the height spread of a real crowd, and the
  // comment had confused a half-range with a standard deviation.
  //
  // Replaced with the mixture itself: a sex bit worth +/- 0.070 m (half the
  // 0.140 m male-female difference) plus a within-sex draw. Two uniforms summed
  // are triangular, which is a far better stand-in for a normal than one
  // uniform and still costs two hash calls; 0.167 x sqrt(2/12) = 0.068 m sd,
  // so the total is sqrt(0.070^2 + 0.068^2) = 0.0976 - the real figure.
  //
  // ⚠️ THE MEAN OF THE DISTRIBUTION IS STILL EXACTLY 1.75. The sex offset is
  // symmetric and the triangular draw is centred, so the ruler this whole file
  // chains off has not moved and the pier's apparent scale has not moved with
  // it. Only the spread changed. Do not "centre" this on 1.705, the true
  // mixed-sex mean - that would silently make the pier read 2.6% bigger.
  //
  // THE REALISED SAMPLE IS NOT THE DISTRIBUTION, and this file's own house rule
  // is to quote what is built. Counted on the built geometry, 68 standing
  // adults: mean 1.7371, sd 0.0953, p10 1.606, p50 1.734, p90 1.884, min 1.532,
  // max 1.941. The sd is the intended 0.0976 to within the sampling error and
  // the mean is 1.1 standard errors low, so nothing here needs correcting -
  // but "exactly 1.75" describes the draw, not the crowd, and a future pass
  // measuring the crowd should expect 1.737 and not think it has found a bug.
  const SEX_HALF = 0.070, STAT_TRI = 0.167;
  const adultH = (i) => ADULT + (rnd(i, 30) < 0.5 ? SEX_HALF : -SEX_HALF)
    + (rnd(i, 31) + rnd(i, 33) - 1) * STAT_TRI;

  // Nobody stands exactly square to anything. +/- 0.25 rad of scatter on every
  // facing, on top of whichever of the two base angles the posture calls for.
  const jitter = (i, a) => a + (rnd(i, 32) - 0.5) * 0.5;

  // A lean, as a bearing and a magnitude, both hashed. The magnitude floor is
  // 0.30 of the cap rather than zero: a distribution that reaches zero puts a
  // few figures back on the picket fence, and one dead-vertical figure in a
  // leaning row is more conspicuous than none.
  //
  // CAPS. Quiet standing holds the trunk within about 2-4 degrees of vertical;
  // someone with their forearms on a railing is well past that. 0.070 rad is
  // 4.0 degrees, 0.160 rad is 9.2 degrees. Both are INFERRED from posture, not
  // measured off a frame - at 5-9 px in the approach camera no frame in this
  // project could resolve a 4 degree lean to argue with them. What IS measured
  // is the size of the effect, on the built geometry, in the camera that shows
  // it: at a 0.115 rad cap the head-railing crowd's head box sat a mean 42 mm
  // off its own chest box, 1.3 px on the nearest figure, which was too quiet
  // to see. At 0.160 it is 67 mm and 2.1 px, and the built geometry still
  // clears the rail by 141 mm (re-measured 2026-08-21; 171 was against a rail face
  // this mesh does not carry) because PLAN_K took 20% off every plan first and
  // because K_DSHO then took 30% off the shoulder box's depth.
  // Realised over the 77 standing figures, re-counted on the built geometry
  // this pass: p50 4.3 degrees, p90 9.3, max 13.1. (The p90 and max were
  // written here as 9.9 and 13.4; the p50 was exact. Small, but this file's
  // whole method is that a number in a comment is checkable, so it is checked.)
  const LEAN_STAND = 0.070;   // standing about
  const LEAN_WALK = 0.050;    // walking - a walker's trunk is more upright
  const LEAN_RAIL = 0.160;    // leaning on a railing
  const leanOf = (i, cap) => {
    const th = rnd(i, 34) * Math.PI * 2;
    const r = cap * (0.30 + 0.70 * rnd(i, 35));
    return [Math.cos(th) * r, Math.sin(th) * r];
  };

  // WHERE THE k-th MEMBER OF A PARTY STANDS, relative to its anchor.
  // Drawing a bearing PER MEMBER puts two of a party of three within 0.2 m of
  // each other about one time in six - the same collision the apron's rejection
  // sampler exists to catch, arriving one level up, and the first version of
  // this pass shipped it: the two-dimensional nearest-neighbour minimum over
  // the whole population came out at 0.533 m - two bodies in one place, since
  // a shoulder is 0.45 m wide. Re-measured this pass on the built geometry:
  // 0.676 m between foot-box centres and 0.636 m between head-box centres,
  // which is the honest pair because the head carries its own +-0.035 m turn on
  // top of the lean. Zero pairs under the 0.60 m floor the f652 pair supports,
  // either way. (It was written here as 0.707 m, which is neither of the two
  // things the geometry measures.) The party gets ONE
  // bearing and its members are spread evenly around it, at the radius that
  // makes their MUTUAL spacing the 0.70-0.95 m measured on f652's pair:
  // n members on a circle of radius R stand 2.R.sin(pi/n) apart, so R is
  // solved for the spacing rather than guessed.
  const member = (g, k, party) => {
    if (party < 2) return [0, 0];
    const R = (0.70 + rnd(g, 47) * 0.25) / (2 * Math.sin(Math.PI / party));
    const th = rnd(g, 46) * Math.PI * 2 + (k * 2 * Math.PI) / party;
    return [Math.cos(th) * R, Math.sin(th) * R];
  };
  // At a railing the lean is not a free bearing: it goes over the rail. The
  // outboard component is always toward the rail (sgn), between 0.35 and 1.0 of
  // the cap; the along-rail component is free but half the size - a sway
  // between companions rather than a lean onto anything.
  const leanRail = (i, sgn) => [
    (rnd(i, 34) - 0.5) * LEAN_RAIL,
    sgn * LEAN_RAIL * (0.35 + 0.65 * rnd(i, 35)),
  ];

  const N = (base) => Math.max(0, Math.round(base * CROWD));

  // =========================================================================
  // ZONE A - THE KIOSK APRON, s 0-16
  // =========================================================================
  // f599 puts 10-15 figures milling around the ticket kiosk at the pier root:
  // the single densest knot in the frame outside the head, and one of the two
  // ends of a distribution that is BIMODAL, not a smooth curve. Seeding people
  // on a smooth density function along s is the mistake this zone exists to
  // avoid.
  //
  // No railing to line up on here, so facings are fully mixed rather than 70%
  // outward - people are queuing, arriving and standing about, not looking at
  // the sea.
  //
  // ⚠️ Nothing in this zone is visible from the along-neck or head cameras, and
  // only its top 0.16 of stature clears the parapet in the entrance camera (see
  // the occlusion table). It is built for the approach camera and for the
  // scale it lends the root, and it should never be the place a pass spends
  // effort.
  {
    // THE FAMILY KNOT. f599 shows a group of five at the kiosk - the only
    // multi-generation group anywhere in the eighteen frames that could be
    // counted. Two adults, two school-age children, one toddler, all inside
    // about 1.6 m, which is what a family actually occupies. The pushchair the
    // frame also shows is NOT built (see the omissions in the header).
    const fs = 13.4, fo = -3.7;
    const KNOT = [[fs, fo], [fs + 0.75, fo + 0.15], [fs + 0.30, fo - 0.80],
                  [fs + 1.15, fo - 0.65], [fs - 0.45, fo + 0.55]];

    // MINIMUM SPACING. Two independent uniform draws are not the same thing as
    // two people deciding where to stand: eight figures scattered over a 15 x 9 m
    // apron collide sooner than the area suggests, and this hash duly delivered
    // one - the old i = 3 and i = 4 landed 0.06 m apart in BOTH s and o, which
    // renders as a single fused 0.9 m wide blob, i.e. the apron silently lost a
    // person. Rejection-sampled against a 0.60 m floor on centre-to-centre
    // distance, seeded with the family knot so nobody is placed inside it. 0.60
    // because the measured pair in f652 stand 0.70 m apart and a shoulder is
    // 0.45 m wide, so anything under 0.60 is two bodies in one place. Eight
    // attempts, then the last draw is taken - a bounded loop cannot wedge.
    // THE APRON IS NOT EMPTY DECK. The kiosk push below handles the one thing in
    // the middle; these are the three obstacles OUTBOARD of it that the push
    // cannot reach, and a figure dropped in any of them renders as a person
    // standing inside a sign. Footprints taken from the modules that build them,
    // padded 0.30 m - one body half-width - so a shoulder cannot clip either.
    // [s0, s1, o0, o1]
    const APRON_KEEPOUT = [
      // pier-deck-furniture.js free-standing black totem sign (f590_03), which
      // it builds at s 2.28-2.52, o 2.75-3.65 from deck to DECK+2.40.
      [1.98, 2.82, 2.45, 3.95],
      // pier-deck-furniture.js lamp column at s 12 AND its sign arm, which
      // projects inboard to o -3.65 at DECK+1.55 to +2.20 - adult head height
      // exactly, so a figure under it is a head inside a sign board.
      [11.63, 12.37, -5.06, -3.35],
      // pier.js's own lamp column on the opposite edge, s 11.93-12.07, o 4.6.
      [11.63, 12.37, 4.22, 4.97],
    ];
    const inKeepout = (s, o, k) => s > k[0] && s < k[1] && o > k[2] && o < k[3];

    // PEOPLE ARRIVE IN TWOS AND THREES, and the old loop placed eight
    // independent singles. Rejection sampling against a 0.60 m floor makes that
    // worse rather than better: it is an active repulsion, so what it produces
    // is the most evenly spread arrangement the apron will hold - the very
    // even-comb tell zone E is built to avoid, arriving by the back door. Only
    // the GROUP ANCHOR is rejection-sampled now; members sit 0.70-0.95 m off it
    // at a hashed bearing, which is the f652 pair spacing.
    const ADULTS = N(8);
    const taken = KNOT.slice();
    let placedA = 0, gi = 0;
    while (placedA < ADULTS && gi < 12) {
      let s = 0, o = 0;
      for (let a = 0; a < 8; a++) {
        const q = gi * 16 + a;
        s = 0.8 + rnd(q, 41) * 15.2;
        o = -4.7 + rnd(q, 42) * 9.4;
        // Push clear of the entrance kiosk. pier.js builds it at s 6-11, |o| <
        // 1.7; pier-deck-furniture.js replaces it with a 4.24 m octagon on the
        // same spot. 2.9 m clears both, and the far edge of the push stays inside
        // the parapet's inner face at 5.22.
        if (s > 4.4 && s < 12.6 && Math.abs(o) < 2.9) {
          o = (o < 0 ? -1 : 1) * (2.9 + rnd(q, 43) * 1.8);
        }
        // 1.90 m between GROUP ANCHORS, not 0.60 m between people. A member
        // sits up to 0.55 m off its own anchor, so two groups 1.10 m apart can
        // still put two bodies 0.15 m apart - measured, on the first build of
        // this pass, as a 0.533 m nearest-neighbour minimum. 1.90 - 2 x 0.55 =
        // 0.80 m, comfortably past the 0.60 m floor the f652 pair supports.
        if (taken.every((p) => Math.hypot(p[0] - s, p[1] - o) >= 1.90) &&
            APRON_KEEPOUT.every((k) => !inKeepout(s, o, k))) break;
      }
      // Safety net. With this hash and CROWD <= 1 no figure ever needs it - that
      // is asserted, not assumed - but a hash change must not be able to ship a
      // figure inside a sign, so anything still in furniture is slid INBOARD
      // past it. Inboard rather than outboard for all three: the outboard edge
      // of the lamp keepout is 4.97, past the 4.7 the apron draw allows.
      for (const k of APRON_KEEPOUT) {
        if (inKeepout(s, o, k)) o = o >= 0 ? k[2] - 0.05 : k[3] + 0.05;
      }
      // 1, 2 or 3 - the same party sizes f636 and f652 show on the neck. The
      // apron is busier, so pairs and threes are commoner here than singles.
      const r = rnd(gi, 45);
      const party = Math.min(r < 0.30 ? 1 : (r < 0.75 ? 2 : 3), ADULTS - placedA);
      for (let k = 0; k < party; k++) {
        const [ms, mo] = member(gi, k, party);
        const ps = s + ms, po = o + mo;
        taken.push([ps, po]);
        const idx = 100 + placedA;
        const [ls, lo] = leanOf(idx, LEAN_STAND);
        stand(ps, po, adultH(idx), jitter(idx, rnd(idx, 44) < 0.5 ? A_ACROSS : A_ALONG),
          idx, 1, true, ls, lo);
        placedA++;
      }
      gi++;
    }
    // The family knot itself, verbatim from f599. Its five members face each
    // other, so they lean toward each other too - one shared inward bearing
    // rather than five free ones, which is what a group talking looks like.
    const KH = [adultH(200), adultH(201), CHILD, CHILD * 0.94, TODDLER];
    const KK = [1, 1, HEADK_CHILD, HEADK_CHILD, HEADK_TODDLER];
    const KA = [A_ALONG, A_ALONG, A_ALONG, A_ACROSS, A_ACROSS];
    for (let k = 0; k < 5; k++) {
      const [ps, po] = KNOT[k];
      const dx = fs + 0.35 - ps, dy = fo - 0.15 - po, L = Math.hypot(dx, dy) || 1;
      const mag = LEAN_STAND * (0.4 + 0.6 * rnd(200 + k, 35));
      stand(ps, po, KH[k], jitter(200 + k, KA[k]), 200 + k, KK[k], true,
        (dx / L) * mag, (dy / L) * mag);
    }
  }

  // =========================================================================
  // ZONE B - THE SEATED ROW UNDER THE SHELTER, s 47-92
  // =========================================================================
  // A seated figure is a DIFFERENT silhouette from a standing one, and the
  // measurement pass rates it third of the three things that sell this feature,
  // because it is what says "furnished" rather than "populated".
  //
  //   crown 1.30 m above deck - f647 and f636 read the seated occupants at a
  //   little over 0.7 of the standing figures beside them, 0.72 x 1.75 = 1.26,
  //   and a standard 0.45 m bench seat is consistent. LOW CONFIDENCE, so the
  //   conservative 1.30 is used rather than pushing it further.
  //   spacing 0.9 m - f636, 4-5 seated torsos over a bench run about 1.2x the
  //   standing clump pitch measured in the same frame. LOW CONFIDENCE.
  //
  // These sit on the blue bench pier-deck-furniture.js builds along the back
  // wall of its canopy at s 47.4-91.6, o 4.72-5.34, seat top DECK + 0.50 - the
  // only seating positively identified anywhere on the pier. If that module is
  // ever unwired these figures read as seated on nothing, which at 250 m is
  // still a low blob at the right height; the alternative is losing the seated
  // silhouette entirely, which is worse.
  //
  // HONESTLY: from a water-level camera almost none of this is visible. The
  // bench is behind a solid royal-blue dado running to DECK + 1.20, so a crown
  // at 1.30 shows 0.10 m of head. Six figures at TWO boxes each is 144
  // triangles spent mostly for the deck-level and replay cameras, and they are
  // the one population here that did NOT get the third box - spending 72 more
  // triangles on a shoulder line nobody can see would be the opposite of what
  // the occlusion table says to do.
  {
    const SEAT_Y = DECK + 0.50;      // the modelled bench top
    // 2026-09-18 (tmp-tr97): 4.95 -> 4.72. Two reasons, and the first is a
    // gate failure, not a nicety. (a) pier-deck-furniture.js's benches gained a
    // BACK at o 5.00-5.09 this pass, and a torso centred on 4.95 reaches 5.19,
    // so module-check reported 0.04 m3 of figures inside the backrest across 6
    // box pairs. (b) 4.72 is where a seated person's trunk actually is - 0.28 m
    // in front of the back board, on a seat that runs 4.42-5.14. The old 4.95
    // was set when the bench was a lean-to against a solid parapet and the
    // figure had nothing to sit back against.
    const SEAT_O = 4.72;             // on the bench, back against the back board
    const seat = (s, i) => {
      const h = adultH(i);
      // Seated: shoulders span s, because they face across the deck seaward -
      // f647 and f636 both show the row square to the walkway.
      const a = jitter(i, A_ACROSS);
      const ca = Math.abs(Math.cos(a)), sa = Math.abs(Math.sin(a));
      // Same ellipse footprint as `stand`, and the same reason.
      const put = (w, d, y0, y1, col) => {
        const es = 0.5 * PLAN_K * Math.hypot(w * ca, d * sa);
        const eo = 0.5 * PLAN_K * Math.hypot(w * sa, d * ca);
        pbox(s - es, s + es, SEAT_O - eo, SEAT_O + eo, y0, y1, col, P);
        boxes++;
      };
      const crown = DECK + 1.30 * (h / ADULT);
      const hh = h * F_HEADH;
      // Torso only - the thighs are omitted. They lie flat under a canopy the
      // camera looks up at from outside, so they are never in any frame the
      // game can produce.
      // The head box takes the neck with it here too, 1.25 x head height, so a
      // seated figure and a standing one share the same head-on-neck aspect.
      put(h * F_WSHO, h * F_DEPTH, SEAT_Y + 0.02, crown - hh * 1.25,
        TOPS[Math.floor(rnd(i, 22) * TOPS.length)]);
      put(h * F_WHEAD, h * F_DHEAD, crown - hh * 1.25, crown,
        HEADS[Math.floor(rnd(i, 23) * HEADS.length)]);
    };
    // Two groups of three rather than a row of six: benches fill in knots with
    // an empty stretch between, and f636's run of 4-5 was one such knot, not
    // the whole bench. The 0.9 m pitch carries the same +/- 0.12 m scatter the
    // head railing gets, for the same reason - six seats at exactly 0.900 m is
    // a comb.
    const groups = [52.4, 78.6];
    let k = 0;
    for (const g of groups) {
      for (let j = 0; j < N(3); j++) {
        seat(g + j * 0.9 + (rnd(300 + k, 78) - 0.5) * 0.24, 300 + k);
        k++;
      }
    }
  }

  // =========================================================================
  // ZONE C - THE NECK, s 17-126. SPARSE, AND THE GAPS ARE THE POINT
  // =========================================================================
  // 0.07 figures per metre of deck edge per side (f599 axial drone: 8-12 on the
  // busier flank and 5-8 on the quieter one over the visible neck; f636 side-on
  // shows singles and pairs at 10-20 m intervals). LOW CONFIDENCE, but the
  // SHAPE is not in doubt: the distribution sags hard through s 50-120, and
  // long genuinely empty stretches here are correct. Seeding this zone at
  // anything like the head's density is what makes a modelled pier read wrong.
  //
  // EAST CARRIES TWICE THE WEST. f599 shows roughly double the figures on the
  // flank on which the head widens - the +o side, per the given head span of
  // -14.5 to +24.5. That asymmetry is MEASURED, not assumed, and it costs
  // nothing to honour.
  //
  // Walkers use the two clear strips between the central shelter and each deck
  // edge - roughly |o| 3.4 to 5.0 given the 5.5 m half-width, favouring the
  // middle of the strip. Capped at 4.8 here so nobody walks through pier.js's
  // shelter columns at |o| 5.0.
  {
    const walk = (seed, sgn, want) => {
      let placed = 0, p = 0;
      while (placed < want && p < 60) {
        const s = 17 + rnd(seed + p, 51) * 109;
        const r = rnd(seed + p, 53);
        // Singles, pairs, and the odd three - f636's "singles and pairs",
        // f652 and f562's isolated pairs. Never a queue.
        const party = r < 0.46 ? 1 : (r < 0.88 ? 2 : 3);
        // THE PARTY IS SHIFTED INTO THE STRIP, NOT SQUASHED INTO IT. Clamping
        // each member separately - which is what this used to do - pushes the
        // outboard one back onto the cap and closes a measured 0.70 m pair down
        // to 0.50 m. Two of the three sub-0.60 m pairs in the whole population
        // came from exactly that, at s 26.6 on both flanks. Clamping the RUN
        // and stepping members off it keeps the pitch and only moves the group.
        const span = (party - 1) * 0.7;
        const oLo = Math.max(3.0, Math.min(4.62 - span, 3.4 - span / 2 + rnd(seed + p, 52) * 1.4));
        for (let k = 0; k < party && placed < want; k++) {
          // 0.7 m shoulder centre to shoulder centre - f652, where the two
          // figures' silhouettes overlap by about a third of a shoulder width
          // at 115-120 px tall each; f562's pair reads the same.
          const o = (oLo + k * 0.7) * sgn;
          // 4.62, not 4.8. The cap applies to the body CENTRE, and a shoulder
          // adds to it, so a 4.8 cap put figures out to |o| 5.07 - straight
          // through pier.js's shelter glazing at |o| 4.94-5.04 and its columns
          // at 4.91-5.09. Two figures were measurably inside the glass.
          // The cap now sits on `oLo` above, so the whole party is inside it by
          // construction and no member can be squashed onto it. Worst reach,
          // recomputed for the ellipse footprint, PLAN_K and the shoulder-
          // anchored lean: the analytic worst case is 4.62 + 0.196 + 0.012 =
          // 4.828, and the value the built geometry ACTUALLY reaches, measured
          // over every walker box, is 4.805 - clearing pier.js's columns at
          // 4.91 by 105 mm where the old geometry cleared them by 20. (4.798
          // and 112 mm before this pass widened the torso and gave every figure
          // a build; this is the one clearance of the three that got worse, and
          // 7 mm of a 105 mm margin is the whole cost.)
          const i = seed * 977 + placed;
          // Walkers face along the axis, so their shoulders span the deck.
          const [ls, lo] = leanOf(i, LEAN_WALK);
          stand(s + k * 0.10, o, adultH(i), jitter(i, A_ALONG), i, 1, NECK_LEGS, ls, lo);
          placed++;
        }
        p++;
      }
    };
    walk(1, +1, N(10));    // east flank, the busy one
    walk(2, -1, N(5));     // west flank, half of it - the measured 2:1
  }

  // =========================================================================
  // ZONE C2 - THE PEOPLE STOPPED AT THE NECK RAILING (2026-09-18, tmp-tr97)
  // =========================================================================
  // The neck had WALKERS and nothing else. Every frame of the neck in the
  // owner's library has people STOPPED at the rail as well, and they are a
  // different silhouette from a walker: square to the railing, shoulders along
  // it, trunk tipped over it, often a pair shoulder to shoulder.
  //   E3, library bournemouth-pier/912848664179905.jpg (crop
  //     tmp-tr97/ev/_deck_912848664179905.jpg): a knot of six to eight walking
  //     the rail line, and one figure stopped square to it with forearms on the
  //     top rail.
  //   E5, tmp-tr97/frames/1606837873553673_03.jpg: two stopped at the apron
  //     rail looking down at the beach, 0.4 m apart.
  //   E1, library 1143360484462054.jpg: the same at the seaward end.
  // SUNLIT / LOW SUN in all three, so this is FORM ONLY - stance and spacing,
  // no tone and no colour.
  //
  // WHY THIS ZONE EXISTS RATHER THAN A FLAG ON ZONE C: zone C's whole design is
  // the strip BETWEEN the shelter and the edge, with a hard cap at |o| 4.62 on
  // the body centre, and it is right about that - a walker does not walk with
  // their shoulder against a railing. A leaner does. Putting them in zone C
  // would mean widening that cap for everybody, which is the cap that keeps 15
  // walkers out of the lamp columns.
  //
  // OFFSET 5.02, which is a clearance, not a measurement. The railing
  // centreline is 5.45; a person standing at a railing has their trunk about
  // 0.4 m in from it. 5.02 with an A_ACROSS footprint reaches o 5.11, and the
  // head, leaning by up to LEAN_RAIL, reaches 5.27 - clear of the picket panel
  // at 5.4365-5.4635 and the posts at 5.417-5.483 by 0.15 m.
  //
  // STATIONS ARE CHOSEN, NOT MEASURED, and they are chosen to dodge
  // pier-deck-furniture.js: lamps now stand every 6.5 m alternating flanks at
  // |o| 4.95-5.09, lifebuoys at 5.04-5.14, the telescope at s 96, bins at
  // s 16 / 16.6 / 63.5 / 88 / 120, sign boards at s 21 / 45 / 70 / 103 and the
  // deck-edge benches over s 51.6-55.0 and 77.8-81.2. Every knot below sits at
  // least 1.4 m clear of all of them in s, which is 4x the figures' own
  // 0.34 m reach. module-check is the check that this held.
  {
    const RAIL_STAND_O = 5.02;
    // s, flank, party. East carries twice the west, the same 2:1 zone C uses
    // and from the same frame (f599).
    const KNOTS = [[34.6, +1, 2], [48.6, +1, 1], [60.8, +1, 2], [93.2, +1, 1],
      [113.6, +1, 2], [29.4, -1, 1], [67.6, -1, 2], [107.0, -1, 1]];
    let ki = 0;
    for (const [s0, sgn, party] of KNOTS) {
      for (let k = 0; k < N(party); k++) {
        const i = 600 + ki;
        // 0.80 m shoulder centre to shoulder centre for a stopped pair, which
        // is tighter than zone C's 0.70 m walking pitch because they are side
        // by side rather than in file. E5's pair reads about 0.8 shoulder
        // widths apart; that is a ratio inside one frame, so it is safe.
        const s = s0 + k * 0.80 + (rnd(i, 79) - 0.5) * 0.20;
        const o = sgn * (RAIL_STAND_O - rnd(i, 71) * 0.10);
        // Square to the rail: shoulders along the pier, so the facing is
        // A_ACROSS, with one in four turned along it to talk to a companion.
        const a = jitter(i, rnd(i, 73) < 0.75 ? A_ACROSS : A_ALONG);
        const [lS, lO] = leanRail(i, sgn);
        if (rnd(i, 74) < 0.12) {
          stand(s, o, CHILD * (0.92 + rnd(i, 75) * 0.16), a, i, HEADK_CHILD,
            NECK_LEGS, lS, lO);
        } else {
          stand(s, o, adultH(i), a, i, 1, NECK_LEGS, lS, lO);
        }
        ki++;
      }
    }

    // ---- PRAMS ----------------------------------------------------------
    // E1 shows a family at the entrance kiosk with a pram, and a second one
    // further out; E5's apron has another. They are built because a pram is the
    // one object in a pier crowd that is unmistakably a pier crowd - a
    // knee-high box beside an adult reads as a family at any range that
    // resolves the adult at all.
    // SIZE IS SOURCED, NOT MEASURED: a UK pushchair is about 0.85 m long,
    // 0.55 m wide over the wheels, with the hood at 1.00 m. E1's pram beside
    // the woman at the kiosk is consistent with that (its top reaches a little
    // over half her hip height) but the frame does not resolve it to better
    // than +-25%, so no ratio is quoted.
    // NOT built: BIKES and FISHING RODS. The brief asked for both "if the
    // frames show them". Eighteen vidframes, four library videos and eleven
    // library photographs of this pier were looked at this pass and NOT ONE
    // shows a bicycle on the deck or a rod over the rail. They are not built.
    //
    // ⚠️ THE PRAM IS IN THIS FILE AND NOT IN pier-deck-furniture.js ON PURPOSE.
    // pier.js records RAID_RANGES.crowdRaw around the addPeopleAndScale call
    // and the siege hides exactly that index range, so anything that belongs to
    // a person has to be built inside this function or the raid will leave it
    // standing on a burning empty pier. A pram belongs to a person.
    const pram = (ps, po) => {
      pbox(ps - 0.42, ps + 0.42, po - 0.27, po + 0.27, DECK + 0.28, DECK + 0.62,
        C.pierRoofDark, P);
      pbox(ps - 0.30, ps + 0.12, po - 0.24, po + 0.24, DECK + 0.60, DECK + 1.00,
        C.pierRoofDark, P);
      boxes += 2;
    };
    pram(11.4, 3.55);      // zone A, the kiosk apron family
    pram(35.4, 4.10);      // mid-neck, east
    pram(76.2, -4.05);     // mid-neck, west
  }

  // =========================================================================
  // ZONE D - ALONGSIDE THE HEAD BUILDING, s 130-214
  // =========================================================================
  // f599 and f557 show figures thinning through the mid-neck then thickening
  // from the neck/head junction seaward. This zone is the rising limb of that
  // gradient - moderate, not dense - so the count is biased toward the seaward
  // end with a fractional power rather than spread evenly.
  //
  // The strips are what is left after the head building (o -3 to 15), the
  // rotunda and the helter skelter are taken out: o -13.6 to -5.5 on the west,
  // o 17.2 to 23.6 on the east. (2026-09-16: the rotunda now closes the head at
  // s 199.9-216.1, o -3.0 to 13.2, inside the building's own band; the helter
  // skelter is gone.)
  //
  // The 2:1 east:west split is EXTRAPOLATED here. It was measured on the neck,
  // not on the head, and the head's own asymmetry could not be read from the
  // oblique frames.
  //
  // They were the only zone still seeded as independent singles, so they read
  // as a row of evenly-spread posts along the flank. Clumped now, on the same
  // 1/2/3 party rule and the same 0.70-0.95 m member spacing zones A and C use,
  // because there is no reason people would stand differently here.
  //
  // ⚠️ THE REASON GIVEN FOR DOING THAT WORK WAS FALSE, AND THE CLUMPING IS KEPT
  // ANYWAY. This comment used to open "These are the largest figures in the
  // ENTRANCE camera - 16.5 px at 61 m". Measured off the render by the CROWD 0
  // difference described in the header, the WHOLE crowd contributes 32 pixels
  // in 10 blobs to the entrance camera, none taller than 3 px, and every one of
  // those 32 sits at x 210-482 - the NECK. The head band of that frame, x 0-160
  // y 120-270, which is exactly where this zone projects, carries ZERO pixels.
  // This zone is not visible in the entrance camera at all. Two things kill it:
  // the east head railing
  // at o 24.5 crops these figures from an eye at y 4 m, and what is left lands
  // against the head building's near-black shopfront dado rather than the sky,
  // so a dark figure on a dark band has no edge to find. The clumping stays
  // because it costs nothing and because the APPROACH camera does see this
  // flank - but nobody should spend another hour here on the entrance camera's
  // account.
  {
    const flank = (seed, o0, o1, want) => {
      let placed = 0, g = 0;
      while (placed < want && g < 12) {
        const u = rnd(seed + g, 61);
        const s = 130 + 84 * Math.pow(u, 0.55);
        const r = rnd(seed + g, 64);
        const party = Math.min(r < 0.42 ? 1 : (r < 0.85 ? 2 : 3), want - placed);
        // The ANCHOR is inset by the party radius so no member is ever clamped
        // onto the strip edge - the same squash that closed a walker pair to
        // 0.50 m, and it did it here too, at s 210.8 against the o 17.2 edge.
        // 0.60 m covers the largest radius `member` can return.
        const o = (o0 + 0.60) + rnd(seed + g, 62) * ((o1 - 0.60) - (o0 + 0.60));
        for (let k = 0; k < party; k++) {
          const j = seed * 977 + placed;
          const [ms, mo] = member(seed * 100 + g, k, party);
          const [ls, lo] = leanOf(j, LEAN_STAND);
          stand(s + ms, o + mo,
            adultH(j), jitter(j, rnd(j, 63) < 0.5 ? A_ACROSS : A_ALONG), j, 1, true, ls, lo);
          placed++;
        }
        g++;
      }
    };
    // 2026-09-16: the strips end 0.4 inside the MAIN deck edge (ctx.WALK, the
    // narrower zone), not at the old HEAD_W edge, which is now over the walkways.
    flank(11, 17.2, Math.min(WALK.Z[0].deck[1], WALK.Z[1].deck[1]) - 0.4, N(5));
    flank(12, Math.max(WALK.Z[0].deck[0], WALK.Z[1].deck[0]) + 0.4, -5.5, N(2));
  }

  // =========================================================================
  // ZONE E - THE HEAD RAILINGS. THIS IS THE ONE THAT SELLS IT
  // =========================================================================
  // The head railing is the one edge that is never empty in any frame read, and
  // it is also the silhouette a rider sees from the water. Everything else in
  // this file is secondary to getting this line right - and the header's pixel
  // table is why: these are the 18-55 px figures, they are the only people in
  // the scene big enough to be judged as figures rather than as specks, and
  // they are cropped at 0.49-0.64 of stature so what is judged is the chest,
  // the shoulders and the head. Nothing else.
  //
  // It is laid out as CLUMPS WITH REAL GAPS, never as an even comb. f605
  // counted discrete runs west to east at 3, 3, 8, 4, 6 people separated by
  // clear voids; f652 and f562 show isolated pairs; f599 a family knot of five.
  // An evenly spaced line is the second strongest tell after an empty deck, and
  // it is what you get for free if you just step a loop.
  //
  //   clump pitch    1.0 m    f647, heads along the railing at 5 px where the
  //                           LED screen spans ~90 px for its 18 m modelled
  //                           width -> 0.20 m/px. Cross-checked perspective-free
  //                           at 1.0-1.3 head-widths in f605. NOTE: that 0.20
  //                           m/px rests on the LED screen's 18 m, which is an
  //                           unverified MODEL number, not a sourced one - if
  //                           pier.js's screen width changes, this pitch scales
  //                           with it.
  //   clump size     2-8, modal 3   (f605 runs above)
  //   gap            1.6-3.0 m, midpoint 2.2   (f605, 8-15 px voids against the
  //                           5 px person pitch). LOW CONFIDENCE.
  //   stand-off      0.40 m body centre to rail line - f635 shows forearms
  //                           resting on the top rail with the torso within
  //                           about one body depth of it, and f639 and f618
  //                           show the identical posture. HIGH CONFIDENCE.
  //                           That reading is of a TORSO, which is why the lean
  //                           is anchored at 0.80 of stature: the shoulders sit
  //                           at the measured 0.40 and the feet fall back.
  //   facing         70% square to the rail with their backs to the deck
  //                           (f635, f639, f618, f645); the rest turned along
  //                           the axis or inward to a companion (f652, f599).
  //                           HIGH CONFIDENCE.
  //
  // The resulting density comes out at roughly 0.55-0.65 people per metre on
  // the east rail, which is the QUIET-DAY reading from f605 rather than f647's
  // 0.9 peak. Deliberate: the pass could not fully separate people from railing
  // furniture on the f605 parapet - the blob row there is suspiciously regular
  // in pitch and some of it may be finials - so the 0.9 peak rests mainly on a
  // single frame and is not used as the baseline.
  // Built, measured on the geometry: 22 figures over the 40 m east run, 0.55/m,
  // in clumps of 4,4,3,3,4,3,1 at a 0.70-1.24 m pitch separated by voids of
  // 2.34 / 2.86 / 3.05 / 3.21 / 3.24 / 3.98 m.
  // That is f605's "3, 3, 8, 4, 6 separated by clear voids" and it is right.
  //
  // ⚠️ THIS IS THE ONE LEVER IN THE FILE WITH ANY LEVERAGE LEFT, AND IT IS NOT
  // A SILHOUETTE LEVER. The render audit in the header measures the head camera
  // at 2,635 of the 3,136 crowd pixels in all five judged frames - 84% of
  // everything this file does - and this run is most of that. Two honest
  // observations for whoever picks it up, neither acted on here:
  //   - CROWD is documented at the top as "the busy-day dressing the measured
  //     densities describe", and this run is seeded at f605's QUIET-day
  //     reading. The two do not describe the same afternoon. Raising this run
  //     alone from N(22) to f647's 0.9/m is N(36) - 14 more figures and 672
  //     more triangles - and every one of them lands inside the 84%.
  //   - Set against f605 at matched figure size, the real crowd on this edge
  //     reads as a merged serrated fringe where the render reads as separated
  //     posts. Most of that difference is projection, not population: f605
  //     looks at the head nearly end-on, so both flanks, the seaward end and
  //     the open deck all pile into one 8 m band. It is NOT evidence for a
  //     denser rail and must not be quoted as if it were.
  // Neither is a reason to move a measured density without an owner's word.
  //
  // WHICH railing the head crowd stands on could not be separated: f605 is too
  // oblique and f647 shows the flank facing the neck. The instruction was to
  // populate both and accept the ambiguity, so all three edges carry people -
  // the east flank heavily, the west sparsely, the seaward end moderately.
  {
    const SIZES = [2, 2, 3, 3, 3, 3, 4, 4, 5, 6, 7, 8];
    // `along` maps a distance down the run, plus a stand-off jitter, to (s, o);
    // `aBase` is the outward posture for that edge, and `outward` is the sign of
    // the lean over the rail in whichever coordinate that edge runs across.
    // The jitter is +/- 0.12 m about the measured 0.40 m stand-off. It is NOT
    // measured - the frames only support the 0.40 - but a line of people at one
    // identical stand-off is dead straight, and a dead straight line of people
    // is the same tell as an evenly spaced one. 0.12 m keeps every figure inside
    // the "within about one body depth of the rail" that f635, f639 and f618 do
    // support.
    const railRun = (seed, len, want, along, aBase, outward, acrossS = false) => {
      let t = rnd(seed, 71) * 2.5, placed = 0, c = 0;
      while (t < len && placed < want && c < 40) {
        const n = Math.min(SIZES[Math.floor(rnd(seed + c, 72) * SIZES.length)],
          want - placed);
        for (let k = 0; k < n && t + k < len; k++) {
          const i = seed * 977 + placed;
          // The 1.0 m pitch is a MEAN, not a spacing anyone stands to. Without
          // the +/- 0.15 m every neighbour in a clump is exactly 1.000 m from
          // the next, which is the even-comb tell again one level down - the
          // clumps read right and the people inside them read as railings.
          // f605's cross-check was a range, 1.0-1.3 head-widths, not a value.
          const [s, o] = along(t + k * 1.0 + (rnd(i, 78) - 0.5) * 0.30,
            (rnd(i, 77) - 0.5) * 0.24);
          // 30% turn away from the rail - along the axis or in to a companion.
          const a = jitter(i, rnd(i, 73) < 0.70 ? aBase : aBase + Math.PI / 2);
          // Lean over the rail. `acrossS` swaps the two components for the
          // seaward end run, whose outboard direction is +s rather than +o.
          const [lA, lB] = leanRail(i, outward);
          const ls = acrossS ? lB : lA, lo = acrossS ? lA : lB;
          // Roughly one in nine of the railing crowd is a child. That fraction
          // is INVENTED - the frames resolve children only in the f599 family
          // knot - but a crowd of uniformly adult-height figures reads as a
          // fence of posts, which is the very ambiguity that made f605 hard to
          // count in the first place.
          if (rnd(i, 74) < 0.11) {
            stand(s, o, CHILD * (0.92 + rnd(i, 75) * 0.16), a, i, HEADK_CHILD,
              true, ls, lo);
          } else {
            stand(s, o, adultH(i), a, i, 1, true, ls, lo);
          }
          placed++;
        }
        t += n * 1.0 + 1.6 + rnd(seed + c, 76) * 1.4;
        c++;
      }
    };

    // THE RAIL LINE ITSELF - not the stand-off line. Read this before "fixing"
    // the second 0.4 in the two flank calls below as a double subtraction: it
    // is not one. pier-railings-parapet.js builds the east head rail on ONE
    // centreline at o 24.0984 - HEAD_W[1] - 0.4 is 24.10, and that is what RO_E
    // is. The further -0.4 in the call is the MEASURED 0.40 m body-centre
    // stand-off from that rail. Both are checkable on the built geometry: the
    // crowd line lands at o 23.7 and the outermost box any figure reaches is
    // 23.9150, clearing the nearest built rail face (o 24.0559, the top rail at
    // r 0.0425) by 141 mm.
    // ⚠️ THE RAIL HEIGHT QUOTED HERE WAS ALSO WRONG. This read "its top at
    // DECK + 0.84", conflating a height with the o-offset HEAD_W[1] - 0.4.
    // Measured 2026-08-21 on that module's built ctubes over s 215-258: posts
    // run y 5.430-6.490 and the top rail sits at y 6.527, i.e. DECK + 1.06.
    // The occlusion table in the header carries the same correction.
    // 2026-09-16: the balustrade is 0.4 inside the MAIN deck edge (ctx.WALK, zone 2
    // over these stations), not HEAD_W, which is now the walkways outer edge.
    const RO_E = WALK.Z[1].deck[1] - 0.4, RO_W = WALK.Z[1].deck[0] + 0.4;

    // East flank, s 217-257. The near-continuous line. East because the neck's
    // measured 2:1 asymmetry points that way, because the head widens on that
    // side, and because a rider on the east flank passes directly under the zip
    // wire - it is the flank this game actually shows.
    // 2026-09-16: the head deck now ends at ctx.TIP (DSM); both flank runs stop
    // 1 m short of the walkway end (s 240.6) instead of running on to s 257.
    const FL = Math.min(40, TIP.WALK_S - 1.0 - 217);
    railRun(21, FL, N(22), (t, j) => [217 + t, RO_E - 0.4 + j], A_ACROSS, +1);
    // West flank, sparse.
    railRun(22, FL, N(8), (t, j) => [217 + t, RO_W + 0.4 - j], A_ACROSS, -1);
    // The seaward end railing. People go to the end of a pier to look at the
    // sea, so this edge gets a moderate line facing straight out - shoulders
    // across the pier.
    //
    // STATION CORRECTED. This was s 258.8, from an assumed end rail at s 259.2
    // "from the 262 m tip". That assumption was never checked against the module
    // that actually builds the rail: pier-railings-parapet.js puts its end run at
    // S_END = 261.7 (pier.js builds no end railing at all - its two railRun calls
    // are both flank runs). Seven figures were therefore standing 2.9 m short of
    // the railing they are posed as leaning on, in the middle of the tip deck,
    // which is exactly the "seated on nothing" failure zone B worries about.
    // 261.2 restores the measured 0.40 m stand-off (0.5 m to the rail centreline).
    // Headroom check, redone for the ellipse footprint, PLAN_K and the
    // shoulder-anchored lean, and taken off the BUILT geometry rather than from
    // an arithmetic worst case: the deepest box on this run reaches s 261.371
    // (261.375 before this pass; 261.354 before that), inboard and 129 mm
    // better than the 261.50 the old bounding-box footprint reached.
    // ⚠️ THE POST STATION WAS QUOTED HERE AS 261.667 AND THAT IS A SOURCE
    // NUMBER, NOT A BUILT ONE - it is S_END 261.7 minus the 0.033 post radius,
    // and pier-railings-parapet.js insets its end run. Measured on that
    // module's built ctubes: the posts stand on o-spaced centrelines at
    // s 261.682, so their near face is 261.649 and the clearance is 278 mm
    // (261.649 - 261.371; the 274 that stood here was against the 261.375 this
    // run superseded - re-measured 2026-08-21).
    // 2026-09-16: the end-rail run at s 261.2 stood over open water once the
    // deck ended at s 252.36; removed. 2026-09-16 (tmp-tr25p item 5): the new
    // rounded tip rail has its own figures, ZONE E2 below.
  }

  // =========================================================================
  // ZONE E2 - THE TIP NOSE RAIL (2026-09-16, tmp-tr25p item 5)
  // =========================================================================
  // Five figures at the R 10 nose rail, in two clumps, facing out to sea and
  // leaning over the rail as the flank runs do. Same 0.40 m body-centre
  // stand-off from the rail centreline (TIP outline inset 0.4, the line
  // pier-railings-parapet.js builds the nose rail on), i.e. radius R - 0.8 about
  // (TIP.SC, TIP.C). The bearings are chosen, not measured: clear of zone F's
  // east knot (nearest 248.6 / 10.6) and of the tower (pod edge s 248.25).
  {
    const r = TIP.R - 0.8;
    const bearings = [-38, -24, -3, 11, 25];   // degrees, 0 = straight out to sea
    for (let k = 0; k < bearings.length && k < N(5); k++) {
      const i = 500 + k, th = bearings[k] * Math.PI / 180;
      const s = TIP.SC + r * Math.cos(th), o = TIP.C + r * Math.sin(th);
      const mag = LEAN_RAIL * (0.35 + 0.65 * rnd(i, 35));
      const h = k === 3 ? CHILD * (0.92 + rnd(i, 75) * 0.16) : adultH(i);
      stand(s, o, h, jitter(i, A_ALONG - th), i, k === 3 ? HEADK_CHILD : 1, true,
        Math.cos(th) * mag, Math.sin(th) * mag);
    }
  }

  // =========================================================================
  // ZONE F - THE WATCHING KNOT AT THE ZIP TOWER, s 245-255
  // =========================================================================
  // f605 and f647 put the unbroken crowd on the open head deck seaward of the
  // buildings AND around the zip-tower base. People watch a zip launch; this is
  // a knot facing the tower rather than a line facing the sea. Five of them,
  // clear of the tower (2026-09-16 A-frame: leg foot s 239.4 o 8.4, stair s 245-247.5).
  //
  // ⚠️ THIS ZONE'S JUSTIFICATION WAS WRONG AND IT IS WORTH SAYING SO PLAINLY.
  // It used to read "At 36 px in the head camera these are the second largest
  // figures in the scene and, unlike zone E, they stand in the OPEN - the
  // occlusion table has no deck edge between them and that camera, so all five
  // are visible from the sole up. They are the only figures in this file whose
  // legs do any work."
  //
  // Every judged camera sits BELOW the deck, so "in the open" does not mean
  // unoccluded - it means the whole width of the head deck edge is between the
  // eye and the figure, and that is the worst occluder on the pier, not the
  // best. Worked through for the head camera: eye at pier (s 256.0, o 43.0) and
  // y 3.0 m, this knot at (s 251, o 7). The sight line crosses the east head
  // edge at o 24.5 about halfway along, so a 6.31 m rail top there puts the ray
  // at 9.44 m ODN by the time it reaches the knot - 2.22 m above the crown of a
  // 1.75 m figure standing on a 5.47 m deck. Rendered at fov 13 on that exact
  // bearing, one head shows beside the tower leg and nothing else does.
  //
  // The knot is KEPT. It is five figures and twenty boxes, it is correct for
  // f605 and f647, and a replay or drone camera above the parapet sees all of
  // it. But it is not "the second largest figures in the scene", its legs do no
  // more work than any other zone's, and no pass should spend effort here
  // expecting the head camera to show it.
  {
    const spots = [[247.2, 11.0], [247.9, 11.8], [248.6, 10.6],
                   [253.6, 3.4], [254.4, 4.1]];
    // Watching something: the whole knot leans the same way, toward the tower
    // at (245.8, 4.5) - pier.js ZS/ZO, moved there from (251, 7) on 2026-09-16
    // off the DSM - rather than each at a free bearing. A group all facing one
    // thing is what makes it read as a group watching a thing.
    for (let i = 0; i < spots.length && i < N(5); i++) {
      const [s, o] = spots[i];
      const e = TIP.edges(s + 0.4, 1.0);   // 2026-09-16: s 253.6/254.4 are past the tip
      if (!e || o < e[0] || o > e[1]) continue;
      const dx = 245.8 - s, dy = 4.5 - o, L = Math.hypot(dx, dy) || 1;
      const mag = LEAN_STAND * (0.35 + 0.65 * rnd(400 + i, 35));
      stand(s, o, adultH(400 + i), jitter(400 + i, A_ACROSS), 400 + i, 1, true,
        (dx / L) * mag, (dy / L) * mag);
    }
  }

  // =========================================================================
  // GULLS ON THE DECK-EDGE COPING
  // =========================================================================
  // MEDIUM-LOW CONFIDENCE, one frame. f636 shows white perched blobs on the
  // neck's deck-edge coping reading about 1.3-1.5x a nearby human head-blob in
  // the same frame; 1.4 x 0.22 m head = 0.31 m of body plus legs. The SOURCED
  // herring gull standing height of 0.35-0.45 m is the anchor and is NOT
  // overruled by that blob measurement - the same-station ratio only has to
  // agree with it, and it does.
  //
  //   standing height  0.40 m above the coping (sourced, held)
  //   body length      0.50 m - blob aspect in f636 read roughly 1.2:1, wider
  //                    than tall; the sourced 0.55-0.60 m body length is
  //                    trimmed for a tucked perched posture. LOW CONFIDENCE.
  //   spacing          4 m, irregular - f636 shows 4 blobs across roughly 137
  //                    px of coping where the human clump pitch in the same
  //                    region implies ~0.13 m/px, so 3.5-5.5 m. LOW CONFIDENCE.
  //
  // THEY ALL FACE THE SAME WAY. Real gulls on a rail face into the wind, and a
  // row of gulls facing randomly reads as wrong instantly - it is the one thing
  // about a perched line that a viewer notices without knowing why. One wind
  // direction for the whole pier, a few degrees of scatter on top.
  //
  // Placed only on the NECK coping, in three short runs with long empty
  // stretches between, and mostly on the WEST flank - the quiet one, carrying
  // half the people. That is not a measurement, it is the obvious reason gulls
  // sit where they sit, and it is the only inference in this block.
  //
  // GEOMETRY ALL BUT UNTOUCHED. The gulls are 18 boxes at DECK+1.15 on the neck
  // coping, which the occlusion table puts right at the crop line of every
  // judged camera - they are the one population whose silhouette genuinely is a
  // 1-2 px blob, and a two-box white lozenge is the correct amount of geometry
  // for that. ⚠️ ONE COORDINATE DID MOVE and this paragraph used to deny it: the
  // head box top went COPE_Y + 0.36 -> + 0.40 so the crown finally stands at the
  // 0.40 m this block's own table calls "sourced, held". See the note at the
  // head box. Nine boxes, no new triangles, and MEASURED at zero rendered
  // pixels in all five judged cameras - see the correction there.
  //
  // NO GULLS ON THE LAMP COLUMNS. The brief asked for them and eighteen frames
  // do not support them. See the header.
  {
    // The two modules that build this edge disagree about the coping top by
    // 90 mm: pier.js's rail cap runs DECK+1.15 to DECK+1.24 at o 5.11-5.29,
    // pier-railings-parapet.js's cope tops out at DECK+1.15 at o 5.22-5.50.
    // Basing the birds at DECK+1.21, o 5.30 puts them a few centimetres inside
    // pier.js's cap and a few above the parapet's - perched either way, never
    // floating conspicuously, and 90 mm at 150 m is well under a pixel anyway.
    // CORRECTED to the parapet's coping top, DECK + PAR_H = DECK + 1.15. At the
    // old DECK + 1.21 the bird's body started at 1.27 - 120 mm clear of that
    // coping and 30 mm clear of pier.js's rail cap as well, so it perched on
    // NOTHING against either module. At 1.15 the 60 mm gap that stands in for
    // the legs is measured from the surface the bird is actually on, and if
    // pier.js's neck railing survives (the parapet module says it must not) the
    // feet are buried in its cap rather than hovering over it. o 5.30 with a
    // 0.12 m half-extent keeps the whole bird inside the coping's 5.175-5.525.
    //
    // ⚠️ CORRECTED AGAIN 2026-09-18 (tmp-tr97), BECAUSE THE PERCH MOVED OUT
    // FROM UNDER THEM. tmp-tr43 removed the solid parapet and its DECK+1.15
    // coping and put an OPEN RAILING there instead, whose top rail is a tube of
    // radius 0.025 on the axis DECK+1.10 at o +-5.45. Against that railing the
    // gulls as left by the last pass were wrong in BOTH coordinates:
    //   y: the perch surface was DECK+1.15 against a rail top of DECK+1.125 -
    //      25 mm of air under every bird, which is the "~20 mm above the new
    //      rail" on the open list at the head of STATUS.md.
    //   o: 5.30 against a rail centreline of 5.45, with the body only 0.08 m
    //      wide in o (WIND 0, so the bird lies along the pier). The bird
    //      occupied 5.22-5.38 and the rail 5.425-5.475: it did not touch the
    //      rail AT ALL. It was standing on nothing, 150 mm inboard of the only
    //      thing on the pier a gull can stand on, and the y error hid inside
    //      the o error.
    // Both fixed here, and written as expressions on the railing's own numbers
    // rather than as constants, so that if that module moves the rail again the
    // birds move with it. ⚠️ THESE THREE MUST MATCH pier-railings-parapet.js's
    // NECK_O / NECK_TOP_Y / NECK_TOP_R. They are duplicated rather than shared
    // because ctx carries no railing geometry, and a wrong duplicate is at
    // least visible; the alternative was another hidden 150 mm.
    const RAIL_C = NECK_HALF - 0.05;          // = NECK_O, the rail centreline
    const RAIL_TOP = DECK + 1.10 + 0.025;     // = NECK_TOP_Y + NECK_TOP_R
    const COPE_Y = RAIL_TOP, COPE_O = RAIL_C;
    const WIND = 0.0;   // one direction per session; 0 = along the pier axis,
                        // which is roughly into a south-westerly at this site.
    const gull = (s, sgn, i) => {
      const a = WIND + (rnd(i, 81) - 0.5) * 0.30;
      const ca = Math.abs(Math.cos(a)), sa = Math.abs(Math.sin(a));
      const L = 0.50, W = 0.16;
      const es = (L * ca + W * sa) * 0.5, eo = (L * sa + W * ca) * 0.5;
      const o = COPE_O * sgn;
      // Body. The grey mantle is not built - at these ranges a gull is 1-2 px
      // and a second colour on it would never resolve.
      pbox(s - es, s + es, o - eo, o + eo, COPE_Y + 0.06, COPE_Y + 0.26,
        C.pierWhite, P);
      // Head block, forward and up. Two boxes total, which is what turns a
      // white lozenge into a bird.
      // ⚠️ CORRECTED TO THE SOURCED HEIGHT. The header states 0.40 m standing
      // height above the coping and calls it "sourced, held" - and then the
      // geometry topped out at COPE_Y + 0.36, because 0.06 of leg gap plus a
      // 0.20 body plus a head that ended at 0.36 was never added up against the
      // number the comment was defending. 0.40 puts the crown where the sourced
      // 0.35-0.45 m herring gull actually stands. The head box is 0.16 m tall
      // and clears the 0.26 body top by 0.14 m of head and neck, which is the
      // right proportion for a tucked perched posture.
      // ⚠️ AND IT IS WORTH NOTHING IN ANY JUDGED FRAME, WHICH THIS COMMENT USED
      // TO OBSCURE. It read "It is 0.3 px at 150 m". Recomputed: 0.04 m at 150 m
      // is 0.125 px in the approach camera (470 px/rad) and 0.146 px in the head
      // camera (548 px/rad), and 0.3 px would need a range of about 70 m.
      // MEASURED rather than projected - the five judged cameras rendered at
      // COPE_Y + 0.36 and at + 0.40 back to back in one browser session are
      // BYTE-IDENTICAL, 0 px of difference in all five. So this is a
      // bookkeeping correction and nothing else: it is made because a stated
      // source the geometry ignores is how this project has gone wrong before,
      // not because anybody can see it. Do not spend a second pass here.
      pbox(s + es * 0.55 - 0.05, s + es * 0.55 + 0.05, o - 0.05, o + 0.05,
        COPE_Y + 0.24, COPE_Y + 0.40, C.pierWhite, P);
      boxes += 2;
    };
    // Three runs, irregular spacing inside each, long voids between - the same
    // clump-and-gap rule the people follow, because gulls do it too.
    const runs = [[58, -1, 4], [96, -1, 3], [34, +1, 2]];
    let g = 0;
    for (const [s0, sgn, n] of runs) {
      let s = s0;
      for (let k = 0; k < N(n); k++) {
        gull(s, sgn, 500 + g);
        s += 3.5 + rnd(500 + g, 82) * 2.0;   // 3.5-5.5 m, irregular
        g++;
      }
    }
  }

  return boxes;
}
