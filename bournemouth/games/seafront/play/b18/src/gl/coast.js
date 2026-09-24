// The Bournemouth coast, built from reference/coast.md.
//
// Every number here is sourced. The research pass that produced that sheet
// corrected FOUR errors in our own SPEC §4, and those corrections are the whole
// value of this file, so they are restated where they bite:
//
//   1. BOTH PIERS ARE GREY REINFORCED CONCRETE, like road bridges. Bournemouth's
//      neck was rebuilt in concrete 1979-81, Boscombe's 1958-60. White Victorian
//      cast-iron filigree is "the single worst error available".
//   2. THE CLIFF IS YELLOW-BROWN EOCENE SAND at ~36 degrees, 60-75% vegetated.
//      It is NOT chalk. "If you render this white you have drawn Old Harry,
//      20 km away."
//   3. THERE IS NO CHINE BETWEEN THE PIERS. The East Cliff is unbroken for 2 km;
//      the only breaks are two zig-zags and one dead lift incline.
//   4. Pier lengths: Bournemouth 260 m, Boscombe 185 m. The spec's 1,000 ft and
//      750 ft are Victorian history and a demolished 1926 steamer head.
//
// Coordinate frame (build sheet §A): origin at Bournemouth Pier root, +X
// along-shore toward Boscombe (bearing 079 deg), +Y up from mean sea level,
// +Z seaward (bearing 169 deg). The whole thing is translated at build time so
// the sim's origin sits mid-course, 250 m out.

import { MeshBuilder } from './meshes.js';
import { buildBournemouthPier } from './pier.js';
// >>> FACADES
import { buildClifftopFacades } from './clifftop-facades.js';
// <<< FACADES
// >>> BEACHSURF
import { buildBeachSurface } from './coast-beach.js';
// <<< BEACHSURF
// >>> CLIFFRELIEF
import { buildCliffRelief } from './coast-cliff.js';
// <<< CLIFFRELIEF
// >>> PROM
import { buildPromenade } from './coast-prom.js';
// <<< PROM
// >>> CLIFFROOF
import { buildClifftopRoofs } from './clifftop-roofs.js';
// <<< CLIFFROOF
// >>> FARBAND
import { buildFarBand } from './coast-far.js';
// <<< FARBAND
// >>> ARENA
// The Old Harry / Handfast Point arena for the corsair level. OFF unless
// ?arena=oldharry (browser) or EFOIL_ARENA=oldharry (node) is set, so with the
// flag clear this import costs one module load and builds nothing at all.
import { buildOldHarryArena, ARENA_ON } from './arena-oldharry.js';
// <<< ARENA
// >>> BUOYS
// The Harbour Mouth gate's channel marking. Same flag, same story as the ARENA
// import above: OFF unless ?arena=oldharry, and with the flag clear this import
// costs one module load and builds nothing.
import { buildGateBuoys } from './gate-buoys.js';
// <<< BUOYS

// >>> RAMPS
// The floating launch ramps (tmp-tr168). Geometry, the placement table and the
// deck height field the hull physics reads all live in one file, so the thing
// the player sees and the thing the player hits cannot drift apart.
import { buildRamps } from './ramps.js';
// <<< RAMPS
// >>> STUNT
// THE STUNT STAGE (tmp-tr173). The course's boundary marking and its pontoon
// rafts; the ramps themselves are the RAMPS import above, whose placement table
// now lives in this file and is empty unless the course is on. OFF unless
// ?arena=stunt (browser) or EFOIL_ARENA=stunt (node), so with the flag clear this
// import costs one module load and builds nothing at all.
import { buildStuntArena } from './stunt-arena.js';
// <<< STUNT

export const COAST = {
  // WHERE THE RIDER STARTS, in coast coordinates. This is the single most
  // consequential number in the scene and it was wrong for the whole project:
  // at 1170 the rider spawned 1,150 m from Bournemouth Pier at a bearing of
  // 175 degrees - a kilometre down the beach, with the pier BEHIND them and
  // nowhere near a 26 degree half-FOV. Every hour spent on the pier was
  // invisible from the only camera that matters, the player's.
  //
  // Now 230 m along the shore and 300 m out: the pier head sits about 230 m
  // away off the bow, which is the distance the whole model was built to be
  // read at, and the rider is in open water rather than the surf zone.
  startX: 230,
  // 300 m out. The old 150 m was chosen to make the CLIFFS subtend a decent
  // angle, which mattered when the coast was the subject. The pier is the
  // subject now, and at 150 m out the rider would start level with the pier
  // head rather than seaward of it, losing the length of the thing entirely.
  startZ: 300,
  bournemouthTip: [28, 260],
  boscombeRoot: 2343,
  boscombeTip: [2332, 185],
};

const hex = (h) => {
  const n = parseInt(h.slice(1), 16);
  // sRGB -> linear, so these sit correctly against the sky and water.
  const f = (c) => Math.pow(c / 255, 2.2);
  return [f((n >> 16) & 255), f((n >> 8) & 255), f(n & 255)];
};

// Palette, straight from the build sheet.
const C = {
  sandDry: hex('#D7C39B'),
  sandDamp: hex('#B49A70'),
  cliffSand: hex('#C9A75E'),
  cliffSandPale: hex('#D9B87A'),
  cliffRust: hex('#A9703C'),
  // ---- CLIFF FACE, RE-INVERTED 2026-08-19 (second pass) -------------------
  // The pass before this one fitted the render chain empirically and then
  // optimised the face's LUMINANCE RATIO to the reference. It hit that number
  // and lost the colour: the face renders B/R 0.905 and G/R 1.053 - a cool
  // grey-green - against a reference face that is B/R 0.53, G/R 0.87, a warm
  // sandstone olive-brown. From the judged shoreward camera that is the
  // difference between "Bournemouth" and "a green bank".
  //
  // THE CHAIN IS NOW EXACT, not fitted. Read out of craft.js rather than
  // curve-fitted, which is what makes the rest of this block predictions
  // instead of guesses:
  //     fade = 1 - smoothstep(120, 320, dist)          -> 0 at 350 m
  //     albedo = mix(vColor, textured, fade)           -> = vColor at 350 m
  //     col = albedo * (amb*0.62 + ndl*0.5*sh)
  //     col = mix(col, air, 1 - exp(-dist/4200))       -> haze 0.0808 at 350 m
  //     out = pow(aces(col), 1/2.2)
  // Collapsed at the shoreward camera that is exactly
  //     out = enc(albedo_linear * K + A)
  //     K = (0.557, 0.583, 0.708)   A = (0.043, 0.056, 0.060)
  // and it reproduces both of the previous pass's measured pairs to the unit:
  // #6F6B42 -> (118,123,97) and #4C482A -> (87,94,81). NOTE the first line:
  // at 350 m the cliff TEXTURE HAS FADED OUT COMPLETELY, so out here the
  // vertex colour is the whole albedo and trap 1 does not apply. It does
  // apply at 150 m, where fade is 0.94 and the texture is back.
  //
  // WHY THE FACE CANNOT BE BOTH DARK AND WARM, which is the fact the previous
  // pass missed. A is the haze, and it is BLUE - it is 8% of horizon sky. An
  // albedo with ZERO blue in it still renders B = 70, because A alone encodes
  // to (55,67,70). So
  //         B/R  >=  70 / R_rendered
  // and the measured reference B/R of 0.53 needs R_rendered = 132. At the
  // previous pass's face R of 88 the best B/R physically available is 0.80,
  // whatever hex is written. Darkening the face to chase the luminance ratio
  // therefore FORCES it grey. That is why every dark key below renders bluer
  // than it reads as a swatch, and why the lever is R and G, not B.
  //
  // MEASURED, on the owner's own southbourne-eastcliff/885017663629672.jpg -
  // the whole East Cliff face, masked between a hand-read crest polyline and
  // the toe, 141,105 face pixels, 2-means in RGB:
  //     bare sand cluster (136,119,84)  10.3% of the face  B/R 0.617 G/R 0.872
  //     vegetation cluster (55,48,29)   89.7%              B/R 0.531 G/R 0.871
  //     bare / vegetation luminance                        2.53 : 1
  //     WITHIN the vegetation, p10 (36,30,14) .. p90 (76,67,45)   2.35 : 1
  // Cross-checked on the summer-sun bournemouth-beach/5598755396821365.jpg,
  // which gives face G/R 1.04, B/R 0.51 from completely different light and
  // a different season.
  //
  // TWO CORRECTIONS TO THE PREVIOUS PASS FALL OUT OF THAT:
  //   * The vegetation is BROWN-OLIVE, not green. G/R 0.87 both times. Ours
  //     renders G/R 1.05, i.e. green. This costs nothing to fix - it is a hue
  //     change at constant luminance - and it is the cheapest real gain here.
  //     ⚠️⚠️ 2026-08-20: THIS BULLET IS SUPERSEDED AND IT IS THE PENDULUM.
  //     Acting on it drove the albedo's own green to a TENTH of the reference's
  //     and produced a cliff with no vegetation in it at all - 0.3-3.6% green
  //     pixels in the land band against a 9.3% median over 177 of the owner's
  //     photographs. The bullet compares ENCODED G/R, which contains the
  //     additive haze floor; the quantity that belongs to this palette is
  //     `vColor * K`, and on that quantity the render was at 0.11-0.48 against
  //     a reference 0.74-1.09. See the calibrated block at the cliff keys
  //     below. Rendered G/R is now 1.03-1.09 again, ON PURPOSE, and the reason
  //     it cannot be 0.87 is written out there. Read that before reverting it.
  //   * The 2.35:1 spread INSIDE the vegetation is the structure the render
  //     has none of: measured on our own frame the vegetated 70% of the face
  //     runs p10 87 to p50 95, a 1.1:1 dead flat. One flat `cliffScrubDry`
  //     over the whole face is why. Hence cliffScrubDamp and cliffGrassDry
  //     below, tied to the gully field so dark sits in the re-entrants and
  //     pale on the spurs - which also puts the maximum contrast next to
  //     itself, where the eye reads it, instead of averaging it away.
  //
  // The face mean is allowed to rise from 0.54 of the beach to about 0.58,
  // which is still inside the previous pass's own stated honest landing point
  // of 0.55-0.58, and buys B/R 0.905 -> 0.64.
  //
  // Every hex is the exact inverse of a chosen RENDERED target through the
  // model above and round-trips to it; the comment is the rendered value.
  // Re-inverted once more after rendering the first set and looking at it. The
  // first set fixed the hue and then flattened the face a second way: it put
  // cliffGrassDry at (141,125,86) against cliffScar at (152,133,95), an 8%
  // difference, so the burnt grass and the bare sand became the same surface
  // and the scars stopped existing. Measured on that render, veg-only p10..p90
  // was 1.33 and the whole face read as one tan bank - the green bank's exact
  // mirror image. This set holds the same hue and pulls the two populations
  // apart: grass 104 luminance against scar 132 and pale scar 157.
  //
  // The matrix was then pulled back DOWN a third time, after rendering the
  // second set: at cliffScrubDry (104,94,75) the face p50 reached 0.61 of the
  // beach and the two read as one continuous tan band in the zoom - the same
  // complaint, in a different colour, as "the cliff and the beach read as one
  // continuous band" that started all of this. The previous pass's LUMINANCE
  // finding was right and is kept; what was wrong was its hue and its
  // flatness. So: matrix back to about 0.54 of the beach, hue held at G/R 0.91
  // instead of 1.05, and the brightness moved off the matrix and onto the
  // scars, which is where the reference puts it too.
  //
  // GREEN IS TRIMMED SEPARATELY ON THE DARK KEYS, because the floor is not
  // grey - it is (55,67,70), so G exceeds R by 12/255 on anything approaching
  // it and the darkest tones drift back toward green on their own. The green
  // albedo on cliffPine and cliffScrubDamp is therefore taken to near zero:
  // measured, that moves face G/R from 0.949 to about 0.91 at no cost in
  // luminance, against a reference 0.871.
  // ---- HUE RE-INVERTED AGAINST THE *ABOVE-HAZE* SIGNAL, 2026-08-20 ---------
  // ⚠️ THE INVERSION ABOVE WAS DONE THROUGH A CHAIN THAT INCLUDES AN ADDITIVE
  // BLUE-GREEN HAZE FLOOR, AND THAT IS WHY THE CLIFF HAS NO GREEN IN IT. This
  // is a chain-inversion error, not a change of taste, and it is measured, not
  // argued.
  //
  // The block above is right that `out = enc(albedo*K + A)` and right that A is
  // blue. What it then does is fit the WHOLE rendered triple to a reference
  // ratio - "reference face is B/R 0.53, G/R 0.87" - without separating the two
  // terms. A is additive and it is large next to a dark albedo, so fitting the
  // SUM to the reference's ratios forces the albedo's own green to nearly zero.
  //
  // MEASURED THIS RUN, and A and K were measured rather than derived: the eight
  // cliff keys were set to #000000 and the scene rendered (that isolates A
  // exactly, because albedo 0 makes col = mix(0, air, haze) = air*haze), then to
  // #B4B4B4 (that gives K). Cliff-face mask, p50, three judged cameras:
  //     camera            haze floor A        #B4 probe
  //     coast   (600 m)   (61, 72, 76)        (174,180,186)
  //     approach(350 m)   (57, 67, 70)        (170,176,183)
  //     entrance(230 m)   (38, 46, 48)        (168,173,179)
  // The approach row reproduces this file's own (55,67,70) to two levels, so
  // the model is the same one - it is the USE of it that was wrong. Rebuilding
  // the palette through that calibration reproduces every rendered value the
  // block above records (cliffPine (75,69,70) exactly, the other seven within
  // 3/255), so what follows is a prediction, not a fit.
  //
  // THE DEFECT, in one line. Divide out A and look at what each key actually
  // REFLECTS - refl = vColor * K, linear:
  //     key               refl G/R   what the sources say it should be
  //     cliffPine           0.106
  //     cliffScrubDamp      0.210    Southbourne veg, winter   0.741
  //     cliffScrubDry       0.477    763 West Cliff wood       0.821
  //     cliffTop            0.490    5598755 East Cliff, sun   1.090
  //     cliffGrassDry       0.636
  // The three keys that carry 89% of the face reflect a quarter to a half of
  // the green they should. cliffPine reflects a TENTH. That is a factor of 4-7,
  // not a tuning disagreement, and it is invisible in the rendered triple
  // because the haze puts the missing green back as a uniform veil - which is
  // exactly what makes the cliff read as a caramel ramp with chocolate lumps
  // rather than as vegetation.
  //
  // The three reference ratios are the same three photographs this file already
  // cites, re-read as reflected linear ratios instead of encoded ones:
  // southbourne-eastcliff/885017663629672.jpg is WINTER (coats, low sun) and
  // gives 0.741; bournemouth-pier/763260589138714.jpg - the owner's photograph
  // from IN THE WATER, i.e. this game's own viewpoint, in summer sun - gives
  // 0.821 on the wooded West Cliff, which is the stretch all four water cameras
  // actually look at; bournemouth-beach/5598755396821365.jpg gives 1.090. Our
  // sun is at 46 deg, i.e. summer midday, so the summer numbers are the
  // admissible ones (trap 5) and 0.80 is deliberately at the CONSERVATIVE end.
  //
  // WHY THE BLUE ALBEDO STAYS AT ~0 rather than going to the reference's
  // B/R 0.24-0.29. The haze already over-supplies blue by about 20 levels at
  // these ranges: push the reference's own reflected triple through this
  // chain and it renders (86,88,81) where the photograph reads (55,48,29).
  // Adding the surface's own blue on top of a veil that is already too blue
  // makes it worse. Zero-blue vegetation is the closest the sum can get.
  //
  // ⚠️ WHAT THIS COSTS, AND IT IS THE HONEST HALF. Rendered G/R now runs
  // 0.93-1.10 where the photographs read 0.87-0.93, because their B sits ~20
  // levels below what this chain can reach. Matching the photographs' ENCODED
  // G/R is provably the same as choosing G - (R+B)/2 = 0, i.e. choosing to have
  // no vegetation at all on the statistic. The two cannot both be had while A
  // is what it is. A is `haze` in craft.js (1 - exp(-dist/4200)) and it is NOT
  // this file's to change - but it is 5.3% at 230 m, which is a great deal of
  // veiling for a clear day at that range, and it is the single constant
  // standing between this cliff and the reference. Say so to whoever owns it.
  //
  // ⚠️ LUMINANCE IS HELD, DELIBERATELY, so this cannot re-open the face:beach
  // ratio three passes have already settled. Each face key below is solved at
  // CONSTANT reflected linear luminance (0.2126R + 0.7152G + 0.0722B): the
  // realised change is, per key, cliffScrubDamp +0.3% / cliffTop +0.3% /
  // cliffScrubDry +1.0% / cliffGrassDry -0.2%, computed through this block's
  // own K = (0.557, 0.583, 0.708). ⚠️ RE-MEASURED 2026-08-21 by the adversarial
  // pass: the line here read "-0.4% / +1.1% / -0.1% / +0.5%" unlabelled, and
  // the first of those has the WRONG SIGN - cliffScrubDamp's reflected
  // luminance goes UP, by +0.27% on the K above and +0.72% on a K measured
  // afresh from a #000000 / #B4B4B4 probe pair. The conclusion is unaffected:
  // every face key holds luminance to about 1%. The other three reproduce.
  // Only cliffPine is solved at constant reflected RED instead, so it gains
  // level as well as hue - it is used ONLY by the crest fringe (grep: the face
  // darkens toward cliffScrubDamp, never toward cliffPine), which is 0.2-0.4%
  // of frame and cannot move any face statistic.
  //
  // WHAT EACH KEY WAS SOLVED TO - target reflected linear G/R, and the mode:
  //     cliffPine       0.84  R    holm oak / pine on the West Cliff (763)
  //     cliffScrubDamp  0.86  L    damp re-entrant scrub, evergreen, greenest
  //     cliffTop        0.85  L    clifftop plateau grass
  //     cliffScrubDry   0.80  L    the bulk of the face, between winter east
  //                                (0.741) and summer west (0.821)
  //     cliffGrassDry   0.70  L    burnt-off grass on the spurs, warmest
  // Every one of those sits inside the 0.741 .. 1.090 the three photographs
  // bracket, and the two that carry the most area sit at the bottom of it.
  //
  // WHAT IT MOVED, measured on renders at 872x399, land band = rows 35-55%,
  // pixels with G - (R+B)/2 > 6, against 177 reference photographs whose
  // p25/MEDIAN/p75/p90 are 1.9 / 9.3 / 28.8 / 54.8%:
  // BEFORE and AFTER are the same tree with only these five hexes reverted and
  // re-rendered, not a reconstructed before, so neither half can drift:
  //     camera        before   after    cliff's share of that band
  //     coast          3.17%   17.86%   15.3%   between the ref median and p75
  //     entrance       4.34%   13.63%   10.9%
  //     along-neck     2.31%   10.25%    -      the reference median, near enough
  //     approach       0.84%    3.86%    3.2%   framing-limited, see below
  //     head           0.25%    0.25%    0.0%   the coast is not in that band
  // ⚠️ THE APPROACH AND HEAD CAMERAS CANNOT REACH THE MEDIAN AND IT IS NOT A
  // COLOUR PROBLEM. The cliff subtends 3.2% of the approach camera's land band
  // and 0.0% of the head camera's - the rest is sky, sea and pier - so 3-4% and
  // 0% ARE their ceilings. Of the cliff pixels that ARE there, 95% and 92% now
  // pass. The reference photographs are mostly shot from the land, where the
  // cliff fills the band. Do not chase the median on those two.
  //
  // ⚠️ WHICH OF THESE NUMBERS SURVIVE THE craft.js TEXTURE-DOMINANCE CHANGE
  // THAT LANDED ALONGSIDE THIS ONE. craft.js replaced
  // `textured = t.rgb * (0.78 + vColor * 0.55)` with a palette-dominant mix
  // while this pass was running. That expression is weighted by
  // `fade = 1 - smoothstep(120, 320, dist)`, and at the COAST (600 m) and
  // APPROACH (~350 m) cameras fade is exactly 0, so albedo == vColor and every
  // number quoted above for those two - the calibration, the per-key rendered
  // values, the green shares, the luminance ratios - is INDEPENDENT of it. The
  // ENTRANCE (~230 m, fade 0.43) and ALONG-NECK figures are not, and should be
  // re-measured against that landing rather than trusted from here. The hexes
  // themselves were solved at the approach camera for exactly this reason.
  //
  // AND THE SETTLED LUMINANCE DID NOT MOVE, which is the check that matters
  // most. Face p50 luminance as a fraction of the same frame's hue-gated beach
  // (trap 11), on a mask built from the pixels the change itself moved:
  //     coast 0.602 -> 0.604 | approach 0.539 -> 0.543 | entrance 0.346 ->
  //     0.354 | head 0.429 -> 0.467 (the head sees mostly fringe, and cliffPine
  //     is the one key solved at constant red rather than constant luminance).
  // Face p10:p90 luminance spread 1.31 -> 1.29, 1.43 -> 1.36, 1.56 -> 1.55,
  // 2.05 -> 2.03. Nothing this file spent three passes on has been disturbed.
  //
  // The comment on each line is the value it now renders at the approach
  // camera, with its green index G - (R+B)/2 - the statistic 177 reference
  // photographs are counted on - and the value it rendered before.
  cliffPine: hex('#3C3600'),       // -> (75,81,70)  GI +8.6 (was 75,69,70  -3.5)
  cliffTop: hex('#474000'),        // -> (82,87,70)  GI+10.9 (was 91,84,70  +3.0)
  cliffScrubDamp: hex('#2E2A00'),  // -> (67,75,70)  GI +6.7 (was 79,72,70  -3.0)
  cliffScrubDry: hex('#494012'),   // -> (83,87,71)  GI +9.5 (was 92,84,71  +1.9)
  cliffGrassDry: hex('#705C28'),   // -> (115,107,78) GI+10.5 (was 118,106,78 +8.4)
  // The two scar keys and the bracken are UNCHANGED and must stay that way.
  // They are bare Eocene sand and iron stain, they are already the right hue,
  // and they already clear the threshold on their own: measured through the
  // same calibration, cliffScar renders (152,134,95) GI +9.9 and cliffScarPale
  // (183,159,113) GI +11.2. The reference agrees the bare ground is not the
  // problem - its own bare-sand cluster (136,119,84) scores GI +9. Greening a
  // slip scar would be a straight error.
  cliffScar: hex('#9C7C45'),       // -> (152,134,95)  GI +9.9  bare Eocene sand
  cliffScarPale: hex('#C89C5C'),   // -> (183,159,113) GI+11.2  a fresh slip scar
  cliffBracken: hex('#86551A'),    // -> (134,102,73)  GI -2.1  dead bracken / iron stain
  //
  // WHAT IS NOT REACHABLE, stated so the next pass does not spend a day on it.
  // The reference's vegetation has a 2.35:1 internal spread and its bare/veg
  // contrast is 2.53:1. Neither is available here. The haze floor is luminance
  // 64 and the brightest a scar can go without passing the beach is about 157,
  // so the widest contrast the whole cliff can hold at 350 m is 2.45:1 and the
  // widest the VEGETATION can hold, given it must stay warm, is about 1.45:1.
  // The lever that is left is adjacency - put the darkest tone in the gullies
  // and the palest on the spurs so the full range sits side by side - and that
  // is what the face loop spends it on. Anything beyond this needs the haze
  // constant in craft.js, which is not this file's to change.
  // The scar cap was RAISED, deliberately, reversing the previous pass. It
  // held cliffScarPale below the beach (172 against 183) on the reasoning that
  // a scar at beach value merges the cliff into the beach. Measured, that is
  // not what the reference does: bare-sand p90 on the East Cliff is (191,167,
  // 125) against a beach p90 of (189,157,120) - the bright scars reach beach
  // brightness exactly. What separates cliff from beach there is the dark
  // vegetation between the scars, not a ceiling on the scars, and dimming them
  // is what turned them into the tan smudges the render shows.
  //
  // Kept defined, never deleted: an undefined key is NaN and renders a whole
  // draw call black in silence, and two other agents are in this directory.
  // Nothing on the face uses these four.
  cliffDarkVeg: hex('#2C3E2C'),
  cliffMidVeg: hex('#7FA05A'),
  cliffScrub: hex('#556B36'),
  cliffCap: hex('#9C9384'),
  concrete: hex('#9A968C'),
  concreteDark: hex('#7C7972'),
  // ---- RE-MEASURED 2026-08-03 FROM SUNNY FOOTAGE ------------------------
  // Two earlier passes sampled OVERCAST stills, found the pier too pale against
  // a grey sky, and darkened these - the substructure had reached #1F1B18,
  // which is near black. The owner's verdict on that look: "this has made the
  // pier look dull".
  //
  // Frame 0657 is a sunny drone shot. The sunlit face of the head building
  // measures #EBE2DE there - p90 over the building region. Its p50 is #7E8B93,
  // which is the region AVERAGE including shadowed elevations, dark glazing and
  // sky behind, and is not the colour of anything. tools/sample-ref.py now
  // reports both and flags a region as MIXED when they disagree, because
  // quoting that median as "the pier colour" is exactly how this went wrong.
  //
  // So the pier really is near-white in sun. The darkening was a property of
  // the weather in the reference, not of the pier.
  copperRoof: hex('#5E8C6A'),      // oxidised copper green - NOT white
  pierRail: hex('#E4E3DF'),        // sourced: "green roof and white railings"
  pierDeck: hex('#8A7F71'),
  pierBeam: hex('#7C7972'),
  pierRust: hex('#33241B'),        // crumbling landing-stage legs
  pierGlass: hex('#4E5C63'),
  // From the owner's low-tide photograph: the substructure is DARK, dense and
  // cross-braced, and it is the dominant texture of the pier seen from the
  // water. The superstructure is white with window rows and a dark barrel roof.
  pierPile: hex('#5A5048'),
  pierBrace: hex('#6A5E52'),
  pierWhite: hex('#EBE2DE'),
  pierRoofDark: hex('#43484C'),
  pierGreenCanopy: hex('#8FA894'),
  pierArch: hex('#9A968C'),        // weathered concrete arcade under the neck
  pierBanner: hex('#2E7FA8'),      // the blue advertising banner on the deck edge
  pierLED: hex('#2B3A66'),         // the big screen on the seaward face of the head
  helterRed: hex('#C4384A'),
  helterCream: hex('#EFE3CB'),
  helterYellow: hex('#E8B93F'),
  prom: hex('#B6B2A8'),
  timberNew: hex('#6E5C38'),
  timberWeathered: hex('#9A968C'),
  timberWet: hex('#39352E'),
  groyneMarker: hex('#8E3A2E'),
  building: hex('#C7C2B6'),
  skylineBlock: hex('#8E8C88'),
};

// Clifftop building stock.
//
// A SEAWARD WALL CANNOT RENDER BRIGHTER THAN ABOUT (196,200,202). Its normal is
// (0,0,1), the sun is normalize(-0.35,0.72,0.60), so n.l = 0.662 and the direct
// term is only a third of albedo; the rest is sky ambient. Measured by render,
// the wall multiplier is (0.420, 0.458, 0.502), so even a pure white tops out
// there. That ceiling is what made every pale body colour collapse together and
// is not something this file can lift.
//
// And it is NOT the material trap. PAL was temporarily set to saturated
// primaries and re-rendered: the buildings came back fully saturated red and
// cyan at 350 m, so the vertex colour arrives intact and the concrete texture
// is already faded out at that range (craft.js fades texture over 120-320 m).
//
// So brightness is not the lever, and the reference agrees it is not the right
// one. What reads at that distance is the BROKEN RIBBON: many small buildings,
// dark roofs against white walls, real gaps of open clifftop. The contrast is
// carried by the ROOFS - a pitched plane faces up, so it gets the cliff's
// multiplier (0.82, 0.96, 1.88) and not the wall's, and a slate on it renders
// (58,60,58) against a wall at (189,193,195). That 3:1 is the silhouette.
//
// Note what that means for the hexes: #45412F looks olive-brown as a swatch and
// renders as neutral dark slate, because it is only ever used on a roof plane.
// Two different multipliers, so two different inversions. The comment on each
// line is the RENDERED value on the surface it is used on.
const PAL = {
  white: hex('#F2F0EA'),    // wall (189,193,195)  stucco hotel, the majority
  render: hex('#D6D2CE'),   // wall (172,175,178)
  cream: hex('#D0BB98'),    // wall (168,158,132)  warm, and now actually distinct
  brick: hex('#99705F'),    // wall (120,82,68)    red brick
  stone: hex('#AEAAA6'),    // wall (140,143,146)
  roof: hex('#45412F'),     // ROOF PLANE (58,60,58)   dark slate
  roofRed: hex('#66432A'),  // ROOF PLANE (105,62,48)  clay tile
  band: hex('#8D8B8B'),     // wall (108,112,118)  recessed window band
};

// Cliff crest height above mean sea level, metres (build sheet §B.2).
const CREST = [
  [0, 9], [130, 19], [230, 24], [430, 28], [930, 30],
  [1030, 32], [1230, 33], [1450, 31], [1780, 32], [2030, 29],
  [2200, 26], [2343, 24], [2700, 22],
];

// Mean-high-water line: how far offshore the waterline sits (§A.5).
const MHW = [
  [0, 38], [300, 45], [600, 52], [900, 58], [1200, 64],
  [1500, 70], [1800, 68], [2100, 50], [2343, 35],
];

const lerpTable = (t, x) => {
  if (x <= t[0][0]) return t[0][1];
  if (x >= t[t.length - 1][0]) return t[t.length - 1][1];
  for (let i = 1; i < t.length; i++) {
    if (x <= t[i][0]) {
      const f = (x - t[i - 1][0]) / (t[i][0] - t[i - 1][0]);
      return t[i - 1][1] + (t[i][1] - t[i - 1][1]) * f;
    }
  }
  return t[t.length - 1][1];
};

export const crestHeight = (x) => lerpTable(CREST, x);
export const mhwOffset = (x) => lerpTable(MHW, x);

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const mix3 = (a, b, t) => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

// Deterministic hash - no Math.random anywhere in this project.
//
// This is WHITE noise: adjacent inputs are completely uncorrelated. Fine for
// picking one value per building, useless for anything spatial.
function noise(x, y) {
  let h = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return h - Math.floor(h);
}

// Smooth (interpolated) value noise, and fBm over it.
//
// The cliff relief was originally displaced with noise() above, which meant
// columns 5 m apart got unrelated displacements - so the face came out as
// jagged chaotic chunks rather than gullies and spurs. Landforms need COHERENT
// noise. This is the difference between a cliff and a voxel pile.
const smoothstep5 = (t) => t * t * (3 - 2 * t);

function snoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const a = noise(xi, yi), b = noise(xi + 1, yi);
  const c = noise(xi, yi + 1), d = noise(xi + 1, yi + 1);
  const u = smoothstep5(xf), v = smoothstep5(yf);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}

// Two octaves is plenty for a landform seen at 150-400 m.
function fbm2(x, y) {
  return snoise(x, y) * 0.65 + snoise(x * 2.7 + 11.3, y * 2.7 - 4.1) * 0.35;
}

// ---------------------------------------------------------------------------
// Material IDs, so one mesh and one draw call can still pick the right texture
// per surface. Kept small and explicit rather than a texture atlas: five
// materials do not justify the packing.
// PICKET (2026-08-29): the head-balustrade stand-in panel ONLY (two quads per
// run, pier-railings-parapet.js picketPanel). In the albedo chain it is
// IDENTICAL to PAINTED (t = vColor, texMean 1, texDom 1 — it falls into the
// same else branch); the one difference is a near-field-only picket pattern in
// craft.js COAST_FRAG, inert beyond 19 m. Nothing else may use this id: the
// pattern assumes a flat vertical quad along a straight run.
export const MAT = { SAND: 0, CLIFF: 1, CONCRETE: 2, TIMBER: 3, PAINTED: 4, PICKET: 5 };

// ---------------------------------------------------------------------------
// DECAL DEPTH TIERS (tmp-tr136).
//
// Every "proud" layer on the clifftop buildings is a DECAL: a flat quad a few
// centimetres in front of the wall it decorates - the stock 0.06 m window
// quads below, Harry Ramsden's 0.10 m panes, and clifftop-facades.js's
// 0.08-0.55 m strips, piers and lips. At the 300-900 m these buildings are
// seen from, a few centimetres is 0-2 depth-buffer steps: one step is 11.9 cm
// at 400 m and 47.7 cm at 800 m (tmp-tr136/depthsim.py, which models
// renderer.js's own float32 matrix). So a decal and its wall TIE - the 8 cm
// strip ties at 46-48% of distances - and which one wins is decided by where
// the depth curve happens to fall on the quantisation grid. Every change to
// the projection matrix re-rolls that. It is the whole of the bug tr132
// reported: 68,160 px of the 19 judged views repaint when the far plane moves
// 10%, and a 10% move repaints MORE than a 4x move, because neither is a
// precision loss - both are the same re-roll.
//
// A METRIC OFFSET CANNOT FIX IT. What a decal buys shrinks as 1/d^2 while what
// the buffer needs is fixed, so holding a layer 2 steps clear at 800 m would
// need 0.95 m of proudness - a balcony, not a window band. Two builders have
// already patched around this by hand without naming it: Harry Ramsden's uses
// 0.10 m "because 0.06 m flickers at the sea cameras", and clifftop-facades.js
// picked 8-22 cm "because at 300-500 m 4 cm steps depth-fight".
//
// So the separation is applied in DEPTH UNITS instead, which is projection-
// proof by construction: craft.js's COAST_VERT subtracts uDepthBias * w from
// gl_Position.z, which is a fixed number of depth-buffer steps at ANY distance
// under ANY near/far pair. A decal's tier is a function of how proud it is, so
// the depth order always agrees with the real geometric order.
//
// The boundaries are set so every offset in use lands clear of the layers it
// overlaps:
//   0.00      -> 0  walls, roofs, massing      0.22      -> 3  facade piers
//   0.06      -> 1  stock window quads         0.30-0.50 -> 4  facade lips
//   0.08-0.15 -> 2  facade strips, curtains,   0.55      -> 5  the slab vstrip
//                   Harry Ramsden's 0.10
// Layers sharing a tier never overlap on one building; where two nearly did
// (the slab's 0.50 lip under its 0.55 vstrip) the 0.52 boundary splits them.
//
// NOT TIERED, on purpose: clifftop-roofs.js. Its header states, and its
// geometry holds to, "nothing here is coplanar with anything" - the parapet
// stands ABOVE the wall top where no stock surface exists, so it competes with
// nothing and needs no bias. If a future change puts a wall decal in the
// parapet's height band, it must be tiered at its 0.30 m proudness.
const DECAL_TIERS = 6;
const DECAL_TIER = (d) => (d <= 0.005 ? 0 : d <= 0.07 ? 1 : d <= 0.15 ? 2
  : d <= 0.26 ? 3 : d <= 0.52 ? 4 : 5);

class ColourMesh extends MeshBuilder {
  constructor() { super(); this.c = []; this.m = []; this.tierMarks = []; this._tier = 0; }
  // Everything emitted from here on belongs to the decal tier for a layer `d`
  // metres proud. Costs one array entry per CHANGE, not per triangle.
  setProud(d) {
    const t = DECAL_TIER(d);
    if (t === this._tier) return;
    this._tier = t;
    this.tierMarks.push([this.i.length, t]);
  }
  // A decal range that is RECORDED WHERE IT IS BUILT and never moved, for
  // blocks that cannot be permuted. The pier is the one that cannot:
  // RAID_RANGES.mask is one byte per pier triangle, positional inside the pier
  // slice, RAID_RANGES.crowdRaw is a contiguous index range recorded mid-build,
  // and hide-ranges.js re-permutes the whole slice by mask on raid entry - so
  // reordering the pier at build time would silently desynchronise all three.
  // The cost of not permuting is one extra draw call per range instead of one
  // per tier, which is why this is used only where a run is already contiguous.
  beginDecal(d) { this._dStart = this.i.length; this._dTier = DECAL_TIER(d); }
  // Same, but naming the tier outright. For surfaces that are EXACTLY coplanar
  // rather than proud: there is no offset to bucket, and which one should win
  // is a modelling decision, not a measurement. Tier 1 is "this is the overlay,
  // it wins".
  beginDecalTier(t) { this._dStart = this.i.length; this._dTier = t; }
  // A range that may be drawn BACK-FACE CULLED. The coast as a whole cannot be
  // (craft.js: "the coast ribbon is single-sided", and the head balustrade
  // stand-in panels are single quads that a global cull deletes), but a run of
  // closed solids can, and without culling every one of them ties against its
  // own back face along its silhouette. Recorded, never moved, same as
  // beginDecal.
  // A range that is drawn normally but NOT into the shadow map. Distinct from
  // beginDecal on purpose: beginDecal also earns a depth bias in the colour
  // pass, and some things that should not cast must not be biased either.
  beginNoCast() { this._nStart = this.i.length; }
  endNoCast() {
    if (this.i.length > this._nStart) {
      (this.noCastOnly || (this.noCastOnly = [])).push([this._nStart, this.i.length]);
    }
  }
  beginCull() { this._cStart = this.i.length; }
  endCull() {
    if (this.i.length > this._cStart) {
      (this.culledRanges || (this.culledRanges = []))
        .push([this._cStart, this.i.length]);
    }
  }
  endDecal() {
    if (this.i.length > this._dStart) {
      (this.fixedDecals || (this.fixedDecals = []))
        .push([this._dStart, this.i.length, this._dTier]);
    }
  }
  // Reorder the triangles of [i0, i1) so each tier is ONE contiguous run, in
  // ascending tier order, and record those runs for CoastRenderer.draw.
  //
  // Same indices, permuted. The vertex buffer, the triangle count and every
  // index OUTSIDE [i0, i1) are untouched, so RAID_RANGES and hide-ranges.js -
  // which address the pier, built ~700 lines after this block - cannot shift.
  // This is the same trick hide-ranges.js already plays on the pier slice.
  permuteDecalTiers(i0, i1) {
    const runs = [];
    let at = i0, tier = 0;
    for (const [ix, t] of this.tierMarks) {
      if (ix < i0 || ix > i1) continue;
      if (ix > at) runs.push([at, ix, tier]);
      at = ix; tier = t;
    }
    if (i1 > at) runs.push([at, i1, tier]);
    const out = [], ranges = [];
    for (let t = 0; t < DECAL_TIERS; t++) {
      const start = i0 + out.length;
      for (const [a, b, rt] of runs) {
        if (rt !== t) continue;
        for (let k = a; k < b; k++) out.push(this.i[k]);
      }
      if (i0 + out.length > start) ranges.push([start, i0 + out.length, t]);
    }
    // ASSERTED, not assumed: a permutation that drops or duplicates a triangle
    // would show up as a hole in a building, which is exactly the class of bug
    // that is hard to see and easy to ship.
    if (out.length !== i1 - i0) {
      throw new Error(`[coast] decal tier permutation lost indices: ${out.length} != ${i1 - i0}`);
    }
    for (let k = 0; k < out.length; k++) this.i[i0 + k] = out[k];
    this.decalTiers = ranges;
    return ranges;
  }
  pushC(x, y, z, nx, ny, nz, col, mat = MAT.PAINTED) {
    const i = this.push(x, y, z, nx, ny, nz);
    this.c.push(col[0], col[1], col[2]);
    this.m.push(mat);
    return i;
  }
  buildC() {
    const n = this.vertexCount;
    const S = 10;
    const data = new Float32Array(n * S);
    for (let k = 0; k < n; k++) {
      data[k * S] = this.v[k * 3]; data[k * S + 1] = this.v[k * 3 + 1]; data[k * S + 2] = this.v[k * 3 + 2];
      data[k * S + 3] = this.n[k * 3]; data[k * S + 4] = this.n[k * 3 + 1]; data[k * S + 5] = this.n[k * 3 + 2];
      data[k * S + 6] = this.c[k * 3]; data[k * S + 7] = this.c[k * 3 + 1]; data[k * S + 8] = this.c[k * 3 + 2];
      data[k * S + 9] = this.m[k];
    }
    return { data, index: new Uint32Array(this.i), count: this.i.length, stride: S * 4,
      decalTiers: this.decalTiers || [], fixedDecals: this.fixedDecals || [],
      culledRanges: this.culledRanges || [], noCastOnly: this.noCastOnly || [] };
  }
  // A round TUBE between two points, in colour.
  //
  // MeshBuilder.tube() cannot be used here: it calls push(), not pushC(), so
  // the colour and material arrays fall out of step with the vertex array and
  // the whole mesh corrupts silently.
  //
  // Needed because thin diagonal things - cables, guys, lattice braces - cannot
  // be drawn as axis-aligned boxes. The zip line was built that way, taking the
  // bounding box of each 9 m segment, which made a 9 x 1 x 9 m block per span
  // and rendered the cable as a chain of boulders.
  ctube(ax, ay, az, bx, by, bz, r, col, mat = MAT.PAINTED, seg = 6) {
    const dx = bx - ax, dy = by - ay, dz = bz - az;
    const L = Math.hypot(dx, dy, dz);
    if (!(L > 1e-6)) return;
    const ux = dx / L, uy = dy / L, uz = dz / L;
    // any vector not parallel to the axis, to build a frame from
    const hx = Math.abs(uy) < 0.9 ? 0 : 1, hy = Math.abs(uy) < 0.9 ? 1 : 0;
    let px = uy * 0 - uz * hy, py = uz * hx - ux * 0, pz = ux * hy - uy * hx;
    const pl = Math.hypot(px, py, pz) || 1;
    px /= pl; py /= pl; pz /= pl;
    const qx = uy * pz - uz * py, qy = uz * px - ux * pz, qz = ux * py - uy * px;
    const ring = [];
    for (let i = 0; i < seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      const c = Math.cos(a) * r, s = Math.sin(a) * r;
      const nx = px * Math.cos(a) + qx * Math.sin(a);
      const ny = py * Math.cos(a) + qy * Math.sin(a);
      const nz = pz * Math.cos(a) + qz * Math.sin(a);
      ring.push([
        this.pushC(ax + px * c + qx * s, ay + py * c + qy * s, az + pz * c + qz * s, nx, ny, nz, col, mat),
        this.pushC(bx + px * c + qx * s, by + py * c + qy * s, bz + pz * c + qz * s, nx, ny, nz, col, mat),
      ]);
    }
    for (let i = 0; i < seg; i++) {
      const A = ring[i], B = ring[(i + 1) % seg];
      this.quad(A[0], B[0], B[1], A[1]);
    }
  }

  // Axis-aligned box, one flat colour.
  box(x0, y0, z0, x1, y1, z1, col, mat = MAT.PAINTED) {
    const f = [
      [[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1], [0,0,1]],
      [[x1,y0,z0],[x0,y0,z0],[x0,y1,z0],[x1,y1,z0], [0,0,-1]],
      [[x1,y0,z1],[x1,y0,z0],[x1,y1,z0],[x1,y1,z1], [1,0,0]],
      [[x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0], [-1,0,0]],
      [[x0,y1,z1],[x1,y1,z1],[x1,y1,z0],[x0,y1,z0], [0,1,0]],
      [[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1], [0,-1,0]],
    ];
    for (const [a, b, c, d, nrm] of f) {
      const i0 = this.pushC(a[0], a[1], a[2], nrm[0], nrm[1], nrm[2], col, mat);
      const i1 = this.pushC(b[0], b[1], b[2], nrm[0], nrm[1], nrm[2], col, mat);
      const i2 = this.pushC(c[0], c[1], c[2], nrm[0], nrm[1], nrm[2], col, mat);
      const i3 = this.pushC(d[0], d[1], d[2], nrm[0], nrm[1], nrm[2], col, mat);
      this.quad(i0, i1, i2, i3);
    }
  }
}

// ---------------------------------------------------------------------------
// tr145: `opts.ranges` is where the pier publishes its raid index ranges. Omitted - which is
// every existing call site - it is pier.js's own RAID_RANGES, so this is byte-identical to
// before. boats/hub.js passes a throwaway, because its mesh is rasterised and discarded and
// must not be allowed to re-point the ranges a running raid is already using.
export function buildCoast(opts = {}) {
  const m = new ColourMesh();
  const OX = -COAST.startX, OZ = -COAST.startZ;   // translate to the sim origin

  // A ridge as two sloping planes and two gable ends - 6 triangles. Defined
  // up here because BOTH the crest tree line and the clifftop skyline need it.
  //   axis 'x'  ridge along the shore: the sea sees a horizontal ridge line,
  //             which is what makes a terrace read as one build.
  //   axis 'z'  ridge running seaward: the sea sees the GABLE, so the
  //             SILHOUETTE is a triangle. That is the characteristic
  //             Bournemouth clifftop villa, and it is also the only cheap way
  //             to stop a row of scrub clumps reading as castellations.
  //
  // The gable ends take their own colour, not the roof's. A gable end is
  // masonry with a thin verge on it, so on the 'z' villas the sea sees a white
  // triangle rising out of a white box - which is the silhouette the reference
  // shows - and not a dark triangle stuck on top of one.
  // MATERIAL IS A PARAMETER, and it defaults to CONCRETE only because the
  // clifftop buildings - the roofs and gable ends this was written for - are
  // masonry. It was HARD-CODED to CONCRETE, and the crest tree line used to
  // draw through here too, so every scrub clump on the crest was given a
  // concrete texture: trap 1, on vegetation. Measured on the entrance camera
  // before the parameter existed, the fringe clumps rendered (85,88,86)
  // (102,104,102) (112,113,110) - B/R 0.98-1.01, i.e. NEUTRAL GREY, against an
  // intended warm dark (75,69,70). They read as pale grey tents standing on a
  // golden bank. The 350 m shoreward camera hid it because craft.js fades the
  // texture out completely past 320 m; at the entrance camera's 200 m fade is
  // still 0.65, so two thirds of the albedo was concrete.
  //
  // ⚠️ THE CREST VEGETATION NO LONGER DRAWS THROUGH HERE - 2026-08-20. It is a
  // lofted canopy ribbon of its own further down this file, and the tents that
  // used this helper were the defect. The parameter STAYS: the caller that is
  // left is the clifftop skyline, whose masonry wants the CONCRETE default, and
  // the next thing that reaches for this helper for anything organic will hit
  // the same trap. Only the CALLER changed; the reasoning above did not.
  const roofRidge = (x0, x1, z0, z1, yE, yR, rc, gc, axis, mat = MAT.CONCRETE) => {
    const P = (x, y, z, n, c) => m.pushC(x + OX, y, z + OZ, n[0], n[1], n[2], c, mat);
    const h = yR - yE;
    if (axis === 'x') {
      const zm = (z0 + z1) * 0.5, dd = (z1 - z0) * 0.5, l = Math.hypot(h, dd) || 1;
      const ns = [0, dd / l, h / l], nl = [0, dd / l, -h / l];
      m.quad(P(x0, yE, z1, ns, rc), P(x1, yE, z1, ns, rc), P(x1, yR, zm, ns, rc), P(x0, yR, zm, ns, rc));
      m.quad(P(x1, yE, z0, nl, rc), P(x0, yE, z0, nl, rc), P(x0, yR, zm, nl, rc), P(x1, yR, zm, nl, rc));
      const nw = [-1, 0, 0], ne = [1, 0, 0];
      m.tri(P(x0, yE, z0, nw, gc), P(x0, yE, z1, nw, gc), P(x0, yR, zm, nw, gc));
      m.tri(P(x1, yE, z1, ne, gc), P(x1, yE, z0, ne, gc), P(x1, yR, zm, ne, gc));
    } else {
      const xm = (x0 + x1) * 0.5, ww = (x1 - x0) * 0.5, l = Math.hypot(h, ww) || 1;
      const np = [ww / l, h / l, 0], nn = [-ww / l, h / l, 0];
      m.quad(P(x1, yE, z0, np, rc), P(x1, yE, z1, np, rc), P(xm, yR, z1, np, rc), P(xm, yR, z0, np, rc));
      m.quad(P(x0, yE, z1, nn, rc), P(x0, yE, z0, nn, rc), P(xm, yR, z0, nn, rc), P(xm, yR, z1, nn, rc));
      const nf = [0, 0, 1], nb = [0, 0, -1];
      m.tri(P(x0, yE, z0, nf, gc), P(x1, yE, z0, nf, gc), P(xm, yR, z0, nf, gc));
      m.tri(P(x1, yE, z1, nb, gc), P(x0, yE, z1, nb, gc), P(xm, yR, z1, nb, gc));
    }
  };

  // ---- 2026-09-17 (tmp-tr47): THE BOURNE VALLEY AT THE PIER ROOT ----------
  // The ribbon below used to run the East Cliff straight through the valley
  // mouth, so the promenade-level buildings by the pier (Harry Ramsden's, the
  // Pier Approach block) read as a white wall stuck into a cliff. EA DSM 1 m,
  // 9 m min-filtered (tmp-tr47/ev/valley_dsm.txt): ground behind the promenade
  // is 4-6 m ODN from X -40 to 90 (Pier Approach, the Lower Gardens mouth),
  // 7-11 m on the Bath Road rise at X 100-140, and the cliff proper only starts
  // at X ~160 with its toe 25-40 m inland of the promenade. valleyFaceRun(x, face)
  // -> [face, run, vk, dT]: in the valley (wv 1) a 2.5 m bank over a 34 m run
  // with no gullies, lobes or crest wander (vk = 1 - wv scales them); dT pushes
  // the toe landward east of X 100 so the prom buildings stand in front of the
  // face. Both are exactly 0 at and outside X -60 / 230, so the ribbon there is
  // bit-identical (checked: tmp-tr47/meshdiff.mjs).
  const VALLEY_ON = true;
  const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const valleyFaceRun = (x, face) => {
    const run = face / Math.tan(36 * Math.PI / 180);   // 36 deg, sourced
    if (!VALLEY_ON || x <= -60 || x >= 230) return [face, run, 1, 0];
    const wv = sstep(-60, -35, x) * (1 - sstep(95, 165, x));
    const dT = 22 * sstep(100, 150, x) * (1 - sstep(195, 230, x));
    return [face + (2.5 - face) * wv, run + (34 - run) * wv, 1 - wv, dT];
  };
  const X0 = -300, X1 = 2700, STEP = 5;

  // ---- beach, promenade and cliff, as one lofted ribbon --------------------
  // §B.2: "a single lofted ribbon along X with per-vertex colour blending
  // sand/vegetation from a noise mask. No mesh detail is needed at 300 m; the
  // colour split does all the work."
  let prev = null;
  // facePro[i] = the BUILT (z, y) of every row of lattice column i, kept so the
  // clifftop planting further down stands on the surface that exists rather
  // than on the expressions it was built from (see the ground() note in the
  // crest vegetation block for what that shortcut cost: 13% floating feet).
  const facePro = [];
  const ribbonStart = m.vertexCount;
  // Face quads (row k >= FACE_K0: toe to plateau), kept for the weld below.
  const FACE_K0 = 5, faceQuads = [];
  for (let x = X0; x <= X1; x += STEP) {
    const H = crestHeight(x);
    const w = mhwOffset(x);
    const [face, run, vk, dT] = valleyFaceRun(x, Math.max(2, H - 3.5));   // tmp-tr47 valley

    // THE VERTICAL ZONING OF THE FACE, measured 2026-08-19 rather than assumed.
    //
    // Three separate sections of the East Cliff in the owner's own photograph
    // southbourne-eastcliff/885017663629672.jpg were classified pixel by pixel
    // into bare sand and vegetation, in four bands from crest (t=1) to toe:
    //
    //     band          near   mid    far  |  mean bare sand
    //     t 1.00-0.75    10%   15%    6%   |   10%
    //     t 0.75-0.50    24%   34%   29%   |   29%
    //     t 0.50-0.25    31%   35%   29%   |   32%
    //     t 0.25-0.00    30%   27%   31%   |   29%
    //
    // and the green class is 31-57% in the TOP band against 2-14% in every band
    // below it. Cross-checked on the West Cliff in bournemouth-beach/
    // 1313887444076023.jpg (sunny, so it also gives the colour): 0.8% bare sand
    // in the crest quarter rising monotonically to 12% at the toe, and a face
    // p50 of (102,106,73) against a beach of (253,235,199) - the cliff is 0.40
    // of the beach and shifted OFF yellow, where ours was rendering identical
    // to it.
    //
    // So the distribution is a STEP, not a ramp. The brief expected vegetation
    // concentrated toward the crest as a gradient over a golden face; the crest
    // half of that is right and the gradient is not. The top ~22% of the face is
    // a dark vegetated fringe - the pine/holm-oak line - and the whole face
    // below it is roughly a third bare golden sand with scrub between.
    //
    // SCAR WIDTH comes from the same photograph: 30 m of cliff over 167 px is
    // 5.6 px/m, and the bare patches run 80-250 px, i.e. 14-45 m. That is what
    // sets the 0.045 noise frequency below - about a 22 m cell.

    // ---- RE-MEASURED 2026-08-19, SAME PHOTOGRAPH, DIFFERENT METHOD ---------
    // The table above was produced by classifying three hand-placed sections.
    // Re-done over the WHOLE face - masked between a hand-read crest polyline
    // and the toe, 141,105 pixels, 2-means in RGB, sky rejected by B > R - the
    // vertical distribution comes out FLAT, and the bare share comes out far
    // lower:
    //     t 0.90-1.00   7.5% bare      t 0.40-0.55  14.3%
    //     t 0.80-0.90   8.4%           t 0.25-0.40  11.8%
    //     t 0.70-0.80   7.3%           t 0.10-0.25   8.2%
    //     t 0.55-0.70   8.4%           t 0.00-0.10  15.6%
    //     whole face   10.3% bare, 89.7% vegetation
    // and the band p50 is (55..60, 49..52, 29..34) at EVERY height, B/R 0.53
    // throughout. The two methods agree on the shape - least bare at t 0.7-0.9,
    // most at the toe and mid-face - and disagree by 3x on the level.
    //
    // Believe the lower number, for a reason that is checkable rather than a
    // preference: at 30% bare the render's own face p75 jumps to (133,122,97)
    // while its p50 sits at (95,100,86), i.e. a third of the face is a separate
    // pale population. The reference has no such split - its p75 is (66,58,38)
    // against a p50 of (56,49,30). So the scars are drawn too WIDE, and because
    // the previous pass also capped them below beach brightness they are too
    // DIM as well: wide and dim is precisely a smudge, which is what renders.
    // Narrower and brighter is the correction, and it is one change, not two.
    //
    // AND THE TOP BAND IS NOT DARKER. p50 (59,52,34) at t 0.90-1.00 against
    // (58,51,31) for the face as a whole. The previous pass darkened the top
    // 22% of the face toward cliffPine on the strength of a "green class" count
    // rather than a tone measurement, which removed the golden brow that the
    // reference actually shows immediately under the crest edge - and that brow
    // is half of what "pine over gold" means. The dark line at the top is the
    // standing crest fringe further down this file, silhouetted against SKY. It
    // is not a stain painted onto the face.

    // The cliff face, with actual relief. Nine rows instead of two, displaced
    // by noise, because a two-row lofted ribbon is a smooth RAMP - which is
    // exactly what it looked like: no gullies, no slump lobes, and a
    // dead-straight crest line running two kilometres.
    //
    // §B.2 describes irregular vegetated slopes with bare sandy scars and
    // gullies. The displacement below is what turns the sourced angle and
    // height into that, and the bell weighting keeps the toe and crest anchored
    // so the profile still honours the 36 degrees and the crest table.
    // NINE rows, not seven: the fringe measured above is the top 22% of the
    // face, which at seven rows falls between two rows and cannot be drawn
    // without swallowing a third of the face. Nine puts two full rows and the
    // top of a third inside it. Costs 2,400 triangles over the whole 3 km.
    const FACE_ROWS = 9;
    const crestDY = (fbm2(x * 0.011, 5.3) - 0.5) * 6.0 * vk;    // crest height wander
    const crestDZ = (fbm2(x * 0.017, 9.1) - 0.5) * 18.0 * vk;   // crest line wander
    const face_rows = [];
    for (let r = 1; r <= FACE_ROWS; r++) {
      const t = r / FACE_ROWS;                 // 0 at the toe, 1 at the crest
      const bell = Math.sin(t * Math.PI);      // relief peaks mid-face
      let z = -20 - dT - run * t;
      let y = 3.5 + face * t;
      // Gullies and spurs: the face pushes in and out along its own contour.
      // The field is KEPT, because the colour below has to use the same one -
      // see there.
      //
      // THE ROW STEP STAYS 0.6 HERE, UNCHANGED. It was taken to 0.13 and put
      // back, and the reason is worth recording because the first diagnosis was
      // wrong and the wrong version nearly shipped.
      //
      // fbm2's coarse octave has a cell of 1 in this coordinate, so 0.6 crosses
      // 5.4 cells over the nine rows: consecutive rows push in and out
      // independently, which is per-row roughness rather than a gully. The
      // complaint it was changed to fix - the face reading as a stack of
      // HORIZONTAL TONAL STRIPES once MAT.CLIFF's texture came off - is real,
      // but it is a TONE complaint, and the tone is fixed below with a separate
      // slice of this same field. Smoothing the RELIEF as well was measured and
      // bought nothing: over all 21,232 face vertices the face's own colour is
      // identical either way (mean linear R 0.1351 vs 0.1352, bare share 11.3%
      // vs 11.4%), and an apparent 0.50 -> 0.57 of beach at 350 m turned out to
      // be one 80 m stretch of shoreline re-arranging, not a shift - the same
      // A/B at the same camera with only the TONE slice reverted gives 0.51.
      // ⚠️ A single 13-degree-lens box at 350 m spans about 80 m of cliff, some
      // 16 vertex columns. That is not enough to call a systematic change, and
      // it read like one. Use the mesh-wide statistic for anything global.
      const gully = fbm2(x * 0.030, 2.7 + r * 0.6);
      z += (gully - 0.5) * 13 * bell * vk;
      // ⚠️ THE TONE FIELD IS A DIFFERENT SLICE OF THE SAME NOISE, AND THAT IS
      // DELIBERATE. `gully` above is sampled per row so it can be roughness;
      // this one steps 0.13 a row, so it crosses 1.2 cells over the whole face
      // and a re-entrant it marks runs from toe to crest. Same function, same
      // 0.030 along-shore frequency, so the along-shore SCALE and character of
      // the two are identical and the tone still reads as belonging to the
      // landform - it is not the independent field the note below warns about,
      // which had a different frequency as well as a different slice.
      //
      // It exists because tone and relief want opposite things here. Relief
      // wants per-row variation - it is the roughness of the face, and there is
      // no measured reason to take it away, so it is left exactly as it was.
      // Tone wants vertical coherence: damp scrub sits in a re-entrant along its
      // whole length, and drawing it from the per-row field painted the face in
      // HORIZONTAL TONAL STRIPES, one per row. That was invisible under
      // MAT.CLIFF's texture and became the most obvious thing on the face the
      // moment the texture came off - see face_rows.push below. Rendered side by
      // side at 150 m, the per-row version carries two hard dark horizontal bands
      // across the right half of the face and this one does not.
      //
      // It is free on every statistic that was already settled: over all 21,232
      // face vertices, mean linear R 0.1352 -> 0.1351, bare share 11.4% -> 11.3%,
      // vegetation p10:p90 2.44:1. It moves tone AROUND the face; it does not
      // move the face.
      const gullyTone = fbm2(x * 0.030, 2.7 + r * 0.13);
      y += (fbm2(x * 0.026, 4.4 + r * 0.9) - 0.5) * 3.8 * bell * vk;
      // Slump lobes: occasional bulges of collapsed material low on the face.
      const lobe = snoise(x * 0.014, 6.6);
      if (lobe > 0.68) z += (lobe - 0.68) * 40 * Math.max(0, 1 - t * 1.6) * vk;
      // Crest wander, applied only near the top so the toe stays put.
      y += crestDY * t * t;
      z += crestDZ * t * t;

      // ---- colour ---------------------------------------------------------
      // The old expression was `mix(sand, scrub, (local*0.55 + t*0.35) * 0.45)`
      // - a smooth ramp that never exceeded a 40% mix toward the scrub, over a
      // sand that already rendered at the beach's own value. That is why the
      // whole 3 km came out as one flat tan bank with no crest line: there was
      // never more than 40% of a colour that was itself only slightly darker
      // than what it was mixing into.
      //
      // Now: a hard fringe at the top, a mostly-vegetated face below it, and
      // bare sand punched through as discrete scars at the measured fractions.

      // 0 across the face, 1 at the very top. 0.88/0.10 puts the transition
      // inside the TOP ROW ONLY, where 0.74/0.15 put it over the top two and a
      // half rows of nine. It is deliberately narrow now: the measurement above
      // says the top band is the same tone as the rest of the face, so this no
      // longer paints a dark band there. All it still does is keep the SCARS
      // off the last metre or so of face, which the same measurement does
      // support (7.3-8.4% bare at t 0.70-0.90, the lowest of any band), and
      // give the standing fringe something to sit on.
      const crest = smoothstep5(clamp((t - 0.88) / 0.10, 0, 1));

      // Bare-sand scars. 0.045 is the 22 m cell the scar widths call for.
      //
      // The row step is 0.10, NOT 0.29, and the lean is ZERO. A real slip scar
      // RUNS DOWN THE FACE - see the crop of 885017663629672, where the bare
      // ground is in near-vertical fans, not horizontal patches. At 0.29 per row
      // the nine rows crossed 2.6 noise cells vertically, so each row got an
      // unrelated slice of the field and the scars came out as horizontal
      // blobs; at 0.10 they cross 0.9 of a cell and a scar persists top to
      // bottom.
      //
      // The lean has to go to zero BECAUSE of that, and this is the part that
      // is not obvious: with the rows decorrelated a lean was invisible, but
      // once they are coherent, any lean at all turns every scar into a
      // continuous diagonal brush stroke across the face. 2.2 was 49 m of
      // lateral shift toe to crest; even 0.6 (13 m) rendered as visible
      // diagonal streaks.
      // TWO OCTAVES, added after looking at the render. One 22 m cell produces
      // one broad soft RAMP per cell - measured on the render, three bright
      // patches across 760 px of cliff, i.e. one scar per ~88 m, each about
      // 60 px wide with a gradient rather than an edge. The reference has many
      // narrow fans 14-45 m across. snoise is smooth value noise, so the part
      // of a cell above a high threshold is always the rounded top of a hill;
      // the finer octave is what cuts that hill into fingers.
      const scarN = snoise(x * 0.045, 12.7 + r * 0.10) * 0.62
        + snoise(x * 0.115, 21.3 + r * 0.26) * 0.38;
      // 0.65, not 0.545, and re-swept for the two-octave field above (adding an
      // octave narrows the peaks, so the same threshold yields less area).
      // Swept in a node harness against the WHOLE-FACE re-measurement rather
      // than the three-section one:
      //     crest -> toe   5.3 / 12.8 / 15.0 / 13.0 %   face mean 10.8%
      //     measured       7.5-8.4 / 8.4-14.3 / 8.2-11.8 / 15.6, mean 10.3%
      // The old 0.545/0.28 on the single-octave field gave 17.3 / 31.0 / 32.0 /
      // 30.5 for a mean of 26.5% - two and a half times the reference, and the
      // pale third of the face that the render's own p75 shows up.
      const scarT = 0.65 + crest * 0.16;
      // ...and the scrub sits in the RE-ENTRANTS. This is why the gully field
      // had to be hoisted out of the displacement above: the previous pass drew
      // the green from an independent noise field, so it landed wherever it
      // liked with respect to the actual landform and read as camouflage
      // blotching rather than as vegetation. Same field, same features - and
      // `gullyTone` is that same field, one slice over, so this still holds.
      // 0.045, not 0.07: a real scar has a fairly hard edge where the
      // vegetation stops, and now that there are fewer of them each one has to
      // hold its own edge or it is just a soft patch again.
      //
      // ⚠️ 0.11 WAS TRIED AND REVERTED, 2026-08-20, so nobody spends the day
      // again. The field is sampled every STEP = 5 m along the shore, so a ramp
      // this narrow saturates inside one cell and a scar's edge is drawn as a
      // staircase of 5 x 2.7 m quads - which became visible the moment the cliff
      // texture came off the face (see face_rows.push). Widening the ramp to
      // 0.11 barely softened the staircase and cost the whole bright tail:
      // measured on the renders below, the share of face pixels above 0.60x the
      // same image's beach luminance - the reference's own bare/vegetation split
      // point, 10.4% on the East Cliff crop - fell from 6.9 / 9.1 / 10.8% at
      // 150 / 200 / 250 m to 4.1 / 6.3 / 9.9%, and the face p10:p90 spread fell
      // 1.93:1 -> 1.81:1. The staircase is a 150 m-with-a-30-degree-lens
      // artefact; the missing scars are visible from the judged cameras. Keep
      // the hard edge. If this is reopened, the lever is STEP, not this number.
      const scar = clamp((scarN - scarT) / 0.045, 0, 1) * clamp(0.35 + gullyTone, 0, 1);

      // The bare sand itself: a weathered face most of the time, a bright fresh
      // slip occasionally. NO LONGER capped below the beach - see the palette
      // note. Measured, the reference's bright scars reach beach brightness
      // (bare p90 (191,167,125) against beach p90 (189,157,120)); what keeps
      // the cliff off the beach is the dark vegetation between them.
      let bare = mix3(C.cliffScar, C.cliffScarPale, snoise(x * 0.033, 5.9));
      // Dead bracken and iron staining, in bands. Sparse: about one 45 m band
      // in seven, and never in the fringe, where the reference shows none.
      // cliffBracken, not cliffRust: cliffRust renders (218,151,84) on a face
      // whose multiplier is (0.82,0.96,1.88) - a hot orange, twice the value of
      // anything around it.
      if (noise(Math.floor(x / 45), 3.7) > 0.86) {
        bare = mix3(bare, C.cliffBracken, 0.45 * (1 - crest));
      }

      // THE VEGETATION IS THREE TONES, NOT ONE, and this is the structural half
      // of this pass. Measured inside the reference's vegetation class alone:
      // p10 (36,30,14) to p90 (76,67,45), a 2.35:1 luminance spread. Measured
      // on our own previous render, the vegetated 70% of the face ran p10 87 to
      // p50 95 - 1.1:1, flat - because `green` was a single constant.
      //
      // The mix is driven by `gullyTone` - the vertically coherent slice of the
      // SAME field, at the SAME along-shore frequency, that displaces the face;
      // see its declaration for why the tone and the relief read different rows
      // of it. That still satisfies the reason the scars use it: tone that tracks
      // the landform reads as wet hollows and dry noses, and tone from an
      // independent field reads as camouflage. High gullyTone is a re-entrant, so
      // damp dark scrub; low is a spur presenting itself to the sun, so burnt-off
      // grass. `dry` uses a second, finer field so the two do not step in
      // lockstep - without it every spur is the same pale and the face gains a
      // rhythm it should not have.
      //
      // This deliberately keeps the MEAN where it is and spends the whole
      // budget on placing the extremes next to each other, because the haze
      // floor caps the total range available: an albedo of pure black still
      // renders (55,67,70) at this distance, so with the brightest scar at 181
      // the widest contrast the cliff can hold is about 2.7:1 whatever is done.
      // Adjacent is where it counts.
      // Centred and STRETCHED about 0.5 rather than built up from (1-gully)
      // directly. fbm2 is an average of value noise, so it clusters hard around
      // its own mean: the first form of this line put 12% of the face in the
      // bottom fifth and 3% in the top, so cliffGrassDry - the whole point of
      // the exercise - appeared on almost nothing. Stretched, the quintiles are
      // 17/20/25/21/17 and all three tones actually get area.
      //
      // RE-CHECKED 2026-08-20, because this line now reads `gullyTone` rather
      // than `gully` and its distribution could have moved. Measured over the
      // 18,656 vegetation-dominated vertices of the real mesh (linear R < 0.22),
      // nearest-key share is damp
      // 27.7% / dry 55.7% / grass 16.5% - all three still carry area, with the
      // common face dominant, which is what this line is for. Vegetation p10:p90
      // in linear R is 2.44:1, against the reference's 2.35:1 measured inside its
      // own vegetation class. That was the structural target and it is met.
      const dry = clamp(0.5 + (0.5 - gullyTone) * 1.55 + (snoise(x * 0.062, 3.4) - 0.5) * 0.85, 0, 1);
      // dry 0 -> damp scrub, 0.5 -> the common face, 1 -> burnt grass.
      const green = mix3(
        mix3(C.cliffScrubDamp, C.cliffScrubDry, clamp(dry * 2.0, 0, 1)),
        C.cliffGrassDry, clamp((dry - 0.5) * 2.0, 0, 1));
      // The top of the face still darkens, but only slightly and only toward
      // the damp scrub - NOT toward cliffPine, which renders (78,76,70), a
      // near-neutral, and made the crest read as a grey bar rather than as the
      // warm brow the reference shows.
      const veg = mix3(green, C.cliffScrubDamp, crest * 0.45);
      // ---- fine mottle, the stand-in for the grain the texture used to carry -
      // Every other field on this face is a landform: gullies at a 33 m cell,
      // scars at 22 m and 8.7 m, the dry/damp split at 16 m. With MAT.CLIFF's
      // texture gone (see below) there was nothing at all between those and the
      // vertex lattice, so the face rendered as large dead-flat plates.
      //
      // 0.098 is a 10.2 m cell - TWO vertex steps at STEP = 5 - and 0.38 a row
      // is 2.6 rows per cell. That is deliberately just above the Nyquist limit
      // of the lattice: anything finer cannot be represented and only aliases
      // into the coarse structure, which is the mistake the scar field's own
      // comment records at 0.29 a row. It is a LUMINANCE jitter, applied to the
      // finished colour rather than to `dry`, so it cannot move the hue or
      // change which of the three vegetation tones a point picked - it is grain,
      // not another population. +/-15% in linear light, about +/-7% encoded.
      // snoise has mean 0.5, so the multiplier has mean 1 and the face mean does
      // not move: measured over the 21,232 face vertices of the real mesh, face
      // linear R mean 0.1337 -> 0.1351 (+1.0%, which is sampling noise on the
      // finite lattice, not a bias) and the bare share 11.3% -> 11.3%.
      const mottle = 1 + (snoise(x * 0.098, 7.9 + r * 0.38) - 0.5) * 0.30;
      const col = mix3(veg, bare, scar).map((v) => v * mottle);
      // ⚠️ MAT.PAINTED, NOT MAT.CLIFF, AND THIS IS THE WHOLE OF THE 150-250 m
      // VEGETATION FIX. Do not "restore the rock texture".
      //
      // The complaint was that at 150-250 m the face renders as a golden dune
      // with no vegetation - measured 145,128,83 against a beach of 167,157,130,
      // i.e. 0.82 of beach luminance where the reference is 0.54-0.58 - and that
      // the palette above only starts landing past 320 m. That is not a palette
      // error and three passes have already been spent proving it: at 600 m,
      // where the texture has faded out entirely, this block renders 99,93,81
      // against its own intended 95,85,72.
      //
      // It is the TEXTURE, and the arithmetic is not close. craft.js:196 does
      //     textured = t.rgb * (0.78 + vColor * 0.55)
      //     albedo   = mix(vColor, textured, 1 - smoothstep(120, 320, dist))
      // and MEASURED off assets/cliff-albedo.png (512x512, every pixel), its
      // LINEAR mean is 0.6058, 0.4131, 0.1288; craft.js:168 samples it twice at
      // x0.62 + x0.55, so t arrives at 1.17x that, 0.709, 0.483, 0.151. The
      // modulation term can only span 0.78..1.11, so on MAT.CLIFF the face's
      // albedo has a FLOOR of 0.553, 0.377, 0.118 in linear light no matter what
      // hex is written here. cliffScrubDamp - the darkest thing on the face - is
      // linear 0.0597, 0.0091, 0.0. The floor is 9.3x brighter than it in red and
      // it is a golden floor, which is precisely "a golden dune". At 200 m, where
      // fade is 0.648, the palette's own 12:1 red range is squeezed to 1.83:1.
      // No vegetation is reachable through that expression at this range.
      //
      // MAT.PAINTED sets t = vColor, so the same line becomes
      //     albedo = mix(vColor, vColor * (0.78 + vColor * 0.55), fade)
      // which is monotonic in vColor with the full 12:1 range intact at every
      // distance, and the measured palette above arrives at 200 m the same way it
      // already arrives at 600 m. The pale-key lift the house rules warn about
      // works FOR this surface rather than against it: the brightest key here is
      // cliffScarPale at linear R 0.609, so its multiplier is 1.113 and the fresh
      // slip scars gain 11% at close range - which is the direction the reference
      // wants, its bare-sand p90 (191,167,125) reaching the beach p90 (189,157,120).
      //
      // WHAT THIS COSTS, stated plainly rather than glossed. The rock grain is
      // gone inside 320 m; the face is now shaded from the vertex field alone, a
      // 5 m x ~3.3 m lattice, which at 200 m is a 26 px cell. That is a real loss
      // of fine detail and it is worth it, because the fine detail was carrying a
      // colour that was wrong by a factor of nine. The vertex field already
      // carries scars at a 22 m and an 8.7 m cell, gullies, and three vegetation
      // tones; a finer octave is added below to stand in for the grain. The cliff
      // is also never seen closer than about 58 m - the toe sits 20 m landward of
      // a waterline that is itself 38-70 m offshore, and the rider is on water.
      //
      // MEASURED, A/B on the same five cameras with only this material changed,
      // face p50 as a fraction of the SAME image's beach p50 (hue-gated, trap 11):
      //     range    MAT.CLIFF          MAT.PAINTED        reference
      //     150 m    0.87x  spread 1.12  0.34x  spread 1.93   0.38x  2.56  (near)
      //     200 m    0.78x         1.18  0.38x         1.86
      //     250 m    0.62x         1.33  0.43x         1.73   0.50x  2.82  (mid)
      //     350 m    0.50x         1.56  0.50x         1.56   - identical
      //     600 m    0.63x         1.30  0.63x         1.30   - identical
      // The 350 m and 600 m rows are identical to the digit, which is the check
      // that matters: craft.js's fade is 0 past 320 m, so this cannot disturb any
      // of the far-range work three passes have already settled.
      //
      // With the tone work in this block finished on top of it, the same three
      // cameras land at 0.41x / 0.44x / 0.50x of beach at 150 / 200 / 250 m,
      // hue B/R 0.529-0.640 and G/R 0.816-0.860, against the East Cliff
      // reference's 0.38x near and 0.50x mid, B/R 0.534-0.618, G/R 0.855-0.862.
      // Face p10:p90 is 1.89 / 1.79 / 1.69 to 1 against the reference's 2.56 and
      // 2.82; the shortfall is the haze floor this file already documents at the
      // palette, not the palette.
      face_rows.push([z, y, col, MAT.PAINTED]);
    }

    const row = [
      // [z, y, colour, material]  seaward -> landward
      [w + 14, -0.9, C.sandDamp, MAT.SAND],   // wet sand, below the waterline
      [w, 0.0, C.sandDamp, MAT.SAND],         // mean high water
      [0, 3.0, C.sandDry, MAT.SAND],          // beach at the seawall
      [-2, 3.5, C.prom, MAT.CONCRETE],        // promenade deck
      [-20, 3.5, C.prom, MAT.CONCRETE],       // back of prom / cliff toe
      // ⚠️ A 0.4 m TOE STEP, and it exists for one reason: `vMat` is a SMOOTHLY
      // INTERPOLATED varying (craft.js:116/125 - no `flat` qualifier), and the
      // fragment shader picks the material with `int(vMat + 0.5)`. So a quad
      // spanning two materials does not blend them, it renders EVERY id in
      // between in bands. With the face now on PAINTED (4) and the prom on
      // CONCRETE (2), the toe quad would otherwise cross id 3 and lay a 1.1 m
      // ribbon of TIMBER texture along three kilometres of cliff foot.
      // Compressing the 2 -> 4 crossing into 0.4 m of slope makes that band
      // 0.14 m, which is 0.7 px at the 200 m these cameras stand at.
      //
      // The colour is face_rows[0]'s own pulled 0.55 toward cliffScrubDamp, NOT
      // face_rows[0]'s own outright. Equal at both ends was tried first and
      // rendered: it makes the lowest 3.6 m of the face one flat plate - measured
      // at 90 m, (42,37,30) held constant over the whole quad against (81,63,35)
      // a row above it - with the hard rectangular edges of the 5 m lattice, i.e.
      // a plinth rather than a cliff foot. With a different tone at each end that
      // band interpolates again, and the direction is the physically right one:
      // the foot is the damp, shaded, wash-fed strip, which is what
      // cliffScrubDamp exists for and what the East Cliff photograph shows behind
      // the hut line.
      [-20 - dT - run * 0.012, 3.5 + face * 0.012,
        mix3(face_rows[0][2], C.cliffScrubDamp, 0.55), MAT.PAINTED],
      ...face_rows,
      // The clifftop plateau. cliffCap rendered (150,154,173) - a pale blue-grey
      // stripe sitting directly on top of the crest, which is the exact opposite
      // of the dark fringe the reference shows there. cliffTop renders (81,86,58)
      // so the fringe and the ground behind it read as one dark mass, and the
      // crest is a hard line rather than a roll-over.
      // MAT.PAINTED to match the face rows above it - see the note on
      // face_rows.push. If this were left on MAT.CLIFF the last quad of the
      // ribbon would cross ids 4 -> 1 and band the crest with concrete and
      // timber; and the plateau is the one surface the crest fringe silhouettes
      // against, so it has to be the same material as the fringe (also PAINTED)
      // or the two read as different substances.
      [-20 - dT - run - 26 + crestDZ, 3.5 + face + 1.5 + crestDY, C.cliffTop, MAT.PAINTED],
    ];
    const cur = row.map(([z, y, col, mat]) => ({ z, y, col, mat }));
    // 2026-09-17 (tmp-tr28): FACE_MONO. The face rows take INDEPENDENT gully,
    // relief and lobe offsets per row, so a row could land seaward of (or below)
    // the one under it. Probe over the whole ribbon: 368 of 6,010 face segments
    // overhung (dz > 0) and 106 fell (dy < 0); at x 60-110 row 11 overhung by
    // 1.0-2.6 m for 50 m. That downward-facing strip is the dark straight-edged
    // band on the face (tmp-tr18 open issue 2; present with planting off, and
    // the weld's 60 deg crease kept both its edges). Each face row now keeps at
    // least 0.4 m of rise and a run of 0.25 x rise landward of the row below
    // (no steeper than ~76 deg); rows already inside that are untouched.
    const FACE_MONO = true;
    if (FACE_MONO) {
      for (let j = FACE_K0 + 1; j < cur.length; j++) {
        const lo = cur[j - 1], p = cur[j];
        if (p.y < lo.y + 0.4) p.y = lo.y + 0.4;
        const zMax = lo.z - 0.25 * (p.y - lo.y);
        if (p.z > zMax) p.z = zMax;
      }
    }
    facePro.push(cur.map((p) => [p.z, p.y]));
    if (prev) {
      for (let k = 0; k < cur.length - 1; k++) {
        const a = prev[k], b = prev[k + 1], c = cur[k + 1], d = cur[k];
        const dy = c.y - b.y, dz = c.z - b.z;
        const l = Math.hypot(dy, dz) || 1;
        const nz = -dy / l, ny = Math.abs(dz / l);
        const i0 = m.pushC(prev.x + OX, a.y, a.z + OZ, 0, ny, nz, a.col, a.mat);
        const i1 = m.pushC(prev.x + OX, b.y, b.z + OZ, 0, ny, nz, b.col, b.mat);
        const i2 = m.pushC(x + OX, c.y, c.z + OZ, 0, ny, nz, c.col, c.mat);
        const i3 = m.pushC(x + OX, d.y, d.z + OZ, 0, ny, nz, d.col, d.mat);
        // ⚠️ WINDING (i3,i2,i1,i0), NOT (i0,i1,i2,i3). THIS IS THE CORDUROY FIX
        // AND IT IS NOT COSMETIC - do not "tidy" it back.
        //
        // The beach rendered as a mass of regular parallel ripples: measured on
        // the side566 camera, a local peak-to-peak of 20.7-21.0 of 255 on a mean
        // of 155, i.e. 13.3-13.6% of the beach's own brightness, in a coherent
        // sawtooth. Structure-tensor coherence over the beach box was 0.831
        // against frame 0566's own sand at 0.459 - the render's detail was RULED
        // and the photograph's is grain.
        //
        // Four hypotheses were eliminated by measurement, and they are the four
        // anyone looks at first, so they are recorded here rather than retried:
        //   * NOT the sand normal map. It is already off here: craft.js fades the
        //     perturbation by smoothstep(0.05, 0.45, graze), and a rider's eye
        //     0.5 m above a beach falling 3 m in 45 m gives graze ~0.037 + 0.53/d,
        //     i.e. under the 0.05 floor beyond about 11 m.
        //   * NOT the sand albedo. Its own sd is 3.7-4.6 of 255 - it cannot make
        //     a 21-level swing - and removing it entirely (MAT.PAINTED on all
        //     three sand rows) left the ripples PIXEL FOR PIXEL unchanged. That
        //     test is the one that settles it.
        //   * NOT the ribbon's tessellation. STEP 5 -> 2 doubled the column count
        //     and the pattern did not move.
        //   * NOT screen-space (mip banding, aliasing). Rendering the same camera
        //     at 400x500 and 1600x2000 put the ripples on the same ground.
        //
        // It was SHADOW ACNE, from this ribbon shadowing itself. shadow.js fills
        // the depth map with cullFace(FRONT) - correct for closed solids, because
        // it pushes acne onto faces the camera cannot see. This ribbon is a
        // single-sided open surface (craft.js:300 disables culling to draw it),
        // and (i0,i1,i2,i3) wound its LIT side as the back face, so it was the
        // side that survived the cull and wrote its own depth. The beach then
        // tested itself against a 0.137 m shadow texel with 0.049 m of bias at
        // ndl 0.76, and the 3x3 PCF stepped 0/9 .. 9/9 across each texel row -
        // which is exactly the sawtooth the scanline shows.
        //
        // Reversing the winding makes the lit side the FRONT face, so the depth
        // pass culls the ribbon and it can no longer shadow itself. Measured on
        // the same scanlines: peak-to-peak 20.7 -> 2.9 and 21.0 -> 2.1, a 7x
        // reduction, and what is left is the albedo's own grain rather than a
        // ruled pattern. Mean |gradient| over the beach box falls 3.98 -> 0.40.
        //
        // Nothing else changes. The main pass does not cull at all, and
        // craft.js:147 flips the interpolated normal toward the camera
        // (`if (dot(N, V) < 0.0) N = -N`), so shading is bit-identical; the
        // ribbon simply stops being a shadow CASTER. That costs nothing that can
        // be seen: the sun is at (-0.35, 0.72, 0.60), i.e. high and out over the
        // sea, so the cliff's own shadow falls landward behind the crest, and
        // shadow.js only covers 140 m around the camera - at the 150-400 m the
        // scene is judged from, this ribbon was never inside the map. Everything
        // that casts a shadow anyone can see - the pier, the groynes, the huts,
        // the clifftop buildings - is a closed box and is unaffected.
        m.quad(i3, i2, i1, i0);
        if (k >= FACE_K0) {
          faceQuads.push([i0, i1, i2, i3, Math.round((prev.x - X0) / STEP), Math.round((x - X0) / STEP), k]);
        }
      }
    }
    cur.x = x;
    prev = cur;
  }
  // The ribbon pushed normals derived from the cross-section only, which assume
  // nothing varies along X. Now that it does, they have to be recomputed from
  // the actual triangles or every gully and lobe stays invisible - correct
  // geometry, flat shading, no apparent change.
  m.smoothNormals(ribbonStart);
  // 2026-09-16 (tmp-tr18): BUT THAT SMOOTHED NOTHING. smoothNormals() averages
  // by vertex INDEX, and every quad above pushes four fresh vertices, so each
  // quad kept its own flat normal. The face rendered as a patchwork of 5 m
  // plates with hard steps (close view tmp-tr18/noplant/S_zslope.png, planting
  // off). FACE_SMOOTH welds the normals of the face quads (rows >= FACE_K0, so
  // beach and prom stay bit-identical) by LATTICE POINT, area-weighted, with a
  // 60 deg crease so the toe and crest keep their edges. Colours were already
  // per lattice point. Positions and triangle count do not change.
  const FACE_SMOOTH = true;
  if (FACE_SMOOTH) {
    const V = m.v, N = m.n, at = new Map(), corners = [];
    for (const [i0, i1, i2, i3, c0, c1, k] of faceQuads) {
      const ax = V[i2 * 3] - V[i0 * 3], ay = V[i2 * 3 + 1] - V[i0 * 3 + 1], az = V[i2 * 3 + 2] - V[i0 * 3 + 2];
      const bx = V[i3 * 3] - V[i1 * 3], by = V[i3 * 3 + 1] - V[i1 * 3 + 1], bz = V[i3 * 3 + 2] - V[i1 * 3 + 2];
      const area = 0.5 * Math.hypot(ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx);
      const q = [N[i0 * 3], N[i0 * 3 + 1], N[i0 * 3 + 2], area];
      for (const [idx, key] of [[i0, c0 * 64 + k], [i1, c0 * 64 + k + 1], [i2, c1 * 64 + k + 1], [i3, c1 * 64 + k]]) {
        if (!at.has(key)) at.set(key, []);
        at.get(key).push(q);
        corners.push([idx, key, q]);
      }
    }
    for (const [idx, key, q] of corners) {
      let sx = 0, sy = 0, sz = 0;
      for (const o of at.get(key)) {
        if (o[0] * q[0] + o[1] * q[1] + o[2] * q[2] < 0.5) continue;
        sx += o[0] * o[3]; sy += o[1] * o[3]; sz += o[2] * o[3];
      }
      const l = Math.hypot(sx, sy, sz);
      if (l > 1e-9) { N[idx * 3] = sx / l; N[idx * 3 + 1] = sy / l; N[idx * 3 + 2] = sz / l; }
    }
  }

  // ---- the crest vegetation ------------------------------------------------
  // AFTER smoothNormals(ribbonStart), deliberately: this is a surface of its
  // own and takes its own smoothNormals call at the end of the block, so the
  // two are never averaged into each other.
  //
  // WHAT WAS HERE AND WHY IT READ AS SCENERY FLATS. 291 discrete `roofRidge`
  // 'z' tents on a 6 m lattice, each a symmetric triangle 5-11 m wide standing
  // on an eave line a flat 1.2 m below the crest. Rendered on the entrance
  // camera - 220-400 m, which is exactly where this is judged - that is a row
  // of dark pyramids on a ruled base line. Measured off that render before the
  // change: the clumps are 30-40 px wide and 15 px tall, i.e. 5-7 m by 2.5 m at
  // the 6 px per metre that camera gives, so the SIZE was right all along.
  // Three separate things made it read wrong and every one is GEOMETRY:
  //   1. each clump was a separate OBJECT with sky between it and the next, so
  //      the eye counted eight of them rather than reading a fringe;
  //   2. each clump was the SAME SHAPE - a symmetric triangle with two straight
  //      facets - so the row had a metronome rhythm;
  //   3. every base sat at exactly crest - 1.2 m, which laid a second RULED
  //      LINE under the ragged top. Real vegetation on a crest has no visible
  //      base at all; the cliff itself hides it.
  // The prose that was here recorded (1) and named two levers - widen the
  // clumps past 12 m, or drop the skip rate - and left both alone. Neither is
  // the fix, because both keep the CLUMP as the unit of construction.
  //
  // WHAT IT IS NOW. One lofted ribbon along the crest whose TOP LINE is the
  // union of overlapping crowns sitting over a low continuous scrub trim. The
  // silhouette is a height field, so it has rounded lumps, hard notches where
  // two crowns meet, real gaps where the density field falls to zero, and no
  // repeated shape anywhere in it. There are no objects left to count.
  //
  // ⚠️ AND IT TOOK TWO PASSES, because the first one only changed the SHAPE of
  // the unit. The version that first stood here still promoted single crowns to
  // tree height on an independent per-crown lottery, so at the entrance and
  // approach cameras it drew four smooth isolated domes, up to 9 m tall on an
  // 8 m width, out of a 0.8 m trim - the eight-cones complaint again with a
  // rounder outline. Four things fixed that and all four are below, at the line
  // they belong to: stands are a CONTINUOUS strength so a group of crowns rises
  // together; a crown is never narrower than 1.2x its height; crowns have two
  // FORMS and sub-crown lobes so no two are alike; and the column step follows
  // the canopy, so the tall crowns are drawn at 0.7 m rather than 1.5 m.
  //
  // ---- MEASURED, on the owner's own photographs -----------------------------
  // The vertical scale in each was taken from the cliff's own crest-to-beach
  // pixel height against a 30 m crest; the along-shore scale was corrected for
  // obliquity from the two ends' implied camera distances (x1.6 on the East
  // Cliff frame, x2.9 on the Durley one). Call the vertical +/-15% and the
  // along-shore +/-30%, and do not read more into them than that.
  //
  // southbourne-eastcliff/885017663629672.jpg - the East Cliff receding from
  // the beach, which is the same geometry as the coast and approach cameras.
  // Sky/land silhouette extracted per column and measured against its own 24 m
  // lower envelope, i.e. how far the fringe stands clear of the LOCAL scrub
  // line rather than off some global datum:
  //     emergent above the scrub line   p90 1.8 m   p99 2.9 m   max 2.9 m
  //     share of shoreline over 1 m     27%
  //     share of shoreline over 2 m      8%
  //     the scrub line's own roughness  sd 0.28 m over a 24 m trend
  //                                     sd 0.56 m over a 63 m trend
  //     emergent clumps                 3.8 per 100 m, 1-11 m wide
  // bournemouth-beach/5598755396821365.jpg (sunny, the East Cliff running away
  // to Hengistbury) and chines-westcliff/1152596746871761.jpg (the West Cliff
  // in silhouette at Durley) give the FORM, and both say the same thing: the
  // crest edge is CONTINUOUSLY vegetated and it is its HEIGHT that varies. It
  // is not a dotted line of separate bushes. The pine and holm-oak crowns stand
  // clear of that edge in loose stands, not singly.
  // chines-westcliff/732442982220475.jpg is an aerial with the beach hut row in
  // frame for scale (2.1 m pitch, this file's own number); crowns measure
  // 3.6-6 m across there, which brackets the 4-10 m used below.
  //
  // WEST IS NOT EAST, and the model now says so. The West Cliff (x < 0 here) is
  // pine and holm oak running right to the crest - bournemouth-pier/
  // 763260589138714.jpg, the owner's photograph from IN THE WATER and the best
  // reference the project has for the judged viewpoint, shows 6-9 m rounded
  // crowns on that skyline. The East Cliff at Southbourne is scrub with the odd
  // 2-3 m bush, and the measurement above IS that stretch. `treeMix` ramps
  // between the two rather than picking one and applying it to 3 km.
  //
  // WHERE THE MODEL LANDS, sampled off these same expressions in a harness at
  // 0.25 m, emergent measured the same way the photograph was - against its own
  // 24 m LOWER envelope, not against a trend:
  //     x 900..1500 (Southbourne, the stretch the photograph IS)
  //         render    p90 1.67 m  p99 3.05 m  max 4.41 m  >1 m 25%  >2 m 6%
  //         photo     p90 1.80 m  p99 2.90 m  max 2.90 m  >1 m 27%  >2 m 8%
  //         and the version before this pass, for comparison:
  //                   p90 1.50 m  p99 2.48 m  max 2.96 m  >1 m 36%  >2 m 3%
  //     x -150..350 (the West Cliff, and which nothing had ever measured)
  //         render    p90 3.59 m  p99 6.98 m  max 8.84 m  >1 m 36%  >2 m 23%
  //         There is no photograph of that stretch square-on to measure
  //         against; the 6-9 m crowns in the from-the-water frame are the only
  //         check, and 8.84 m sits at the top of it. See COULD NOT ESTABLISH.
  //     ⚠️ THIS WINDOW IS NOT WHAT THE JUDGED CAMERAS SEE, and the line above
  //         used to say it was. Projected 2026-08-20 through each camera's own
  //         basis (the same basis that gives the 2.06 px/m used below), the
  //         crest leaves the right-hand edge of the frame at local x = 102
  //         (approach), 130 (entrance), 118 (along-neck) and 37 (head). All
  //         four see x -300..~110; the coast camera picks up x 101..882. So
  //         HALF of -150..350 is off-frame in every water camera, x -300..-150
  //         is in-frame and was never measured, and the tallest crown in the
  //         model (h 8.40 m at x 213) is visible only from the coast camera at
  //         ~420 m. Re-measured over the band the four actually see:
  //     x -300..110 (in-frame for all four water cameras)
  //         render    p90 1.35 m  p99 4.32 m  max 6.08 m  >1 m 15%  >2 m 6%
  //         canopy p50 0.74 m  p90 1.99 m  coverage 99%
  //         i.e. what is JUDGED is a good deal quieter than the -150..350 row,
  //         and closer to the Southbourne photograph than to the 6-9 m crowns.
  //     canopy height above the crest, whole coast: p10 0.25 p50 0.83 p90 2.45
  //     vegetated runs p50 97 m, bare gaps p50 6 m, coverage 93%
  //     emergent clumps over 1 m: east 7.5 per 100 m at a 2.3 m median width,
  //         west 6.0 at 3.3 m (re-counted 2026-08-20; the line said 3.5),
  //         against the photograph's 3.8 per 100 m at
  //         1-11 m. The render has about twice as many because the fine ragged
  //         octave counts as a clump at this threshold; the widths bracket.
  // The p99 and the max on the east are the two that overshoot, and both are
  // one outlier: the reference is 185 m of shoreline and the render is 600 m,
  // so a single 4.4 m bush in the render has nowhere to hide. The share
  // statistics - the ones with a denominator - bracket the photograph.

  const TAN36 = Math.tan(36 * Math.PI / 180);
  // The ribbon's last row puts the plateau 1.5 m above the crest and 26 m
  // behind it (see the row table above), so this is the ground a clump standing
  // landward of the edge actually sits on. Same two numbers, not a guess.
  const PLATEAU_SLOPE = 1.5 / 26;

  // Crest position, from the same expressions the ribbon uses. At t = 1 the
  // bell is sin(pi) = 0 and the lobe's max(0, 1 - 1.6t) = 0, so every mid-face
  // displacement vanishes and the crest is exactly
  // (3.5 + face + crestDY, -20 - run + crestDZ) - which is why it can be
  // recomputed here instead of threaded out of the loop.
  // tmp-tr47: both go through valleyFaceRun, so the canopy follows the valley.
  const crestYExact = (x) => { const [f, , vk] = valleyFaceRun(x, Math.max(2, crestHeight(x) - 3.5));
    return 3.5 + f + (fbm2(x * 0.011, 5.3) - 0.5) * 6.0 * vk; };
  const crestZExact = (x) => { const [, rn, vk, dT] = valleyFaceRun(x, Math.max(2, crestHeight(x) - 3.5));
    return -20 - dT - rn + (fbm2(x * 0.017, 9.1) - 0.5) * 18.0 * vk; };
  // ⚠️ SAMPLE THE CREST ON THE RIBBON'S OWN LATTICE AND INTERPOLATE, do not
  // evaluate the smooth function at this block's finer step. The ribbon only
  // has vertices every STEP = 5 m, so between them the real crest is a straight
  // line while crestYExact is a curve, and the canopy must be pinned to the
  // surface that is actually built, not to the function it was built from.
  // ⚠️ MEASURED 2026-08-20, because this comment used to claim the two differ
  // "by up to ~0.5 m ... that is the whole burial depth below". They do not.
  // snoise is bilinear, so crestYExact is PIECEWISE LINEAR with breakpoints
  // only at multiples of 1/0.011 = 90.9 m and 1/0.0297 = 33.7 m; a 5 m span
  // is exact unless it straddles one. Enumerated at 0.25 m over the whole
  // 3 km the worst error is 0.024 m in Y and 0.194 m in Z (0.14 m of ground
  // height through TAN36) - a tenth of the 0.40 m burial, not all of it.
  // Keep the interpolation: it costs nothing and it is the correct surface.
  // The floating feet that DO exist come from somewhere else - see the ground()
  // note below, which is where the real 13% lives.
  const onLattice = (f, x) => {
    const x0 = X0 + Math.floor((x - X0) / STEP) * STEP;
    const t = (x - x0) / STEP;
    return f(x0) * (1 - t) + f(x0 + STEP) * t;
  };

  // HOW MUCH VEGETATION, and it is deliberately the SAME FIELD the face's tone
  // is drawn from: `gullyTone` at the crest row is fbm2(x * 0.030, 2.7 + 9 *
  // 0.13) = fbm2(x * 0.030, 3.87). High is a re-entrant, so the fringe thickens
  // in the gullies and thins on the spurs, and it thickens over the same
  // gullies the face paints with damp dark scrub. This file already argues the
  // point for the scars: tone that tracks the landform reads as vegetation,
  // tone from an independent field reads as camouflage. Shape is no different -
  // a fringe placed by its own private noise reads as litter on a crest.
  // The second term is an 80 m cell, and its only job is to open the genuinely
  // bare stretches the reference does have.
  // Measured over 2 m samples of the whole 3 km: p05 0.00, p25 0.24, p50 0.40,
  // p75 0.59, p95 0.88, with 11% of the coast below the 0.08 gap threshold.
  const vegDensity = (x) => clamp(0.34
    + 1.55 * (fbm2(x * 0.030, 3.87) - 0.47)
    + 0.80 * (fbm2(x * 0.0125, 17.4) - 0.5), 0, 1);

  // 1 at the pier and west of it, 0.15 from x = 1160 east. See WEST IS NOT EAST.
  const treeMix = (x) => 1.0 - 0.85 * smoothstep5(clamp((x - 60) / 1100, 0, 1));

  // ⚠️ A STAND IS A CONTINUOUS STRENGTH, NOT A PER-CROWN COIN FLIP. This is the
  // correction that matters most in this block, and the old code's own comment
  // is what points at it: it says "trees arrive in STANDS, not singly" and then
  // promotes crowns with
  //     if (noise(j, 8.45) > 0.943 - 0.24 * standAt(cx)) h += 2.4..7.4
  // which is a lottery drawn INDEPENDENTLY for each crown. The stand field only
  // moved those odds from about 1-in-9 to 1-in-4, so it never produced a group;
  // it produced scattered singles at a slightly uneven spacing.
  //
  // MEASURED on that model over x -150..350 - the stretch the entrance and
  // approach cameras actually look at, and NOT the x 900..1500 the previous
  // pass measured: 13 promoted crowns in 500 m, one every 38 m, median width
  // 8.5 m, height:width median 0.71 and MAXIMUM 1.24. Rendered and measured off
  // the approach camera (2.06 px/m along-shore, 1.63 px/m vertical, derived
  // from the camera basis and the crest's own 342 m range), the tallest read
  // about 8 m wide by 9 m tall. Taller than wide, standing alone, sky both sides.
  // That is the eight-cones complaint at a larger scale: the shape of the unit
  // had changed but the unit was still ONE OBJECT WITH A GAP EITHER SIDE, and
  // four of them fill the crest band of the approach camera.
  //
  // chines-westcliff/1152596746871761.jpg - Durley, the cliff in silhouette
  // against the sunset, so FORM ONLY (trap 5) - settles the shape: the pines
  // stand in a loose group eight or so crowns wide, the crowns overlap, and the
  // group reads as ONE ragged mass with sub-crown notches in its top. Between
  // groups the crest is a furry scrub edge, never bare.
  //
  // So the stand field now gives EVERY crown inside a patch its share of tree
  // height. The patch is 0.62 of the old 118 m noise plus 0.38 of the SAME
  // vegDensity that already sets the fringe thickness and the face tone - this
  // file's standing principle that structure tracking the landform reads as
  // vegetation and structure from a private field reads as litter. Folding the
  // density in also decides where the trees are ALLOWED to reach full height,
  // and it moves the judged band: measured at 1 m over x -50..150, the pier
  // approach, which is the middle of two judged cameras, the 118 m noise alone
  // through this same gate peaks at 0.60 and never reaches full strength, while
  // the combined field peaks at 1.00 (means 0.21 and 0.24 - the mean barely
  // moves, the PEAK is the whole point).
  // ⚠️ 2026-08-20, STATE THE ABLATION OR THE NUMBERS DO NOT REPRODUCE. 0.60 and
  // 0.21 are 0.62*fbm2 + 0.38*0.5 through the gate, i.e. the noise with the
  // density held at a neutral 0.5. The literal "118 m noise alone", gate(fbm2),
  // reads 0.71 and 0.136. Either ablation makes the same point - neither
  // reaches full strength where the combined field does - but quote the one
  // that matches the arithmetic. That band is where the owner's own
  // from-the-water photograph (bournemouth-pier/763260589138714.jpg) shows a
  // dark tree mass, so it has to be able to carry a full stand.
  // 0.41 and 0.61 are the 35th and 88th percentile of the combined field over
  // the whole 3 km: 64% of the shoreline is above the lower knee and 11% at
  // full strength. (Enumerated at 1 m: 36.2% below 0.41 and 88.7% below 0.61,
  // so 63.8% and 11.3% - the quoted 35/88 round the wrong way by a point.)
  // That is the STAND field only - what actually reaches the canopy is this
  // times treeMix times the per-crown share, which is why the East Cliff stays
  // low while the West Cliff reaches 9.5 m. ⚠️ MEASURED 2026-08-20 at 0.25 m,
  // canopy top including the ragged octaves: east (x 900..1500) maxes at
  // 5.09 m and west (x -150..350) at 9.51 m. The "3.5 m" this line used to
  // carry for the east is not reachable by any term here - the base scrub
  // alone runs to 2.60 m and the lone-bush term adds up to 1.87 m of it.
  const standStrength = (x, d) => smoothstep5(clamp(
    (0.62 * fbm2(x * 0.0085, 51.3) + 0.38 * d - 0.41) / 0.20, 0, 1));

  // THE CANOPY TOP as the union of overlapping crowns. 3.2 m lattice against
  // crowns 4.0-10.1 m across (enumerated over every kept crown on the 3 km;
  // the "4-12" this line used to claim is the arithmetic bound, not a realised
  // width) means a kept crown always overlaps its neighbours, so
  // the top line is continuous with notches in it rather than a row of separate
  // domes - which is failure mode (1) above, and it is the one that matters.
  // Returns the height AND the index of the crown that won it, so the colour
  // below can vary per crown instead of per column.
  // CROWN_RMAX only bounds the search in x, and it has to cover the widest
  // crown the aspect clamp below can produce. The arithmetic worst case adds
  // 2.60 (scrub) + 7.40 (stand tree) + 1.87 (lone bush) = 11.87 m of height at
  // r >= 0.60 h, i.e. 7.12 m - but the tree and the bush terms are scaled by
  // treeMix and 1 - treeMix, so they cannot both be large. ⚠️ THAT IS AN
  // ARGUMENT, NOT A PROOF, so it is checked: enumerated over every crown index
  // on the whole 3 km the realised worst case is h 8.40 m and r 5.04 m. Nothing
  // is clipped, and a clipped crown would be a vertical wall no reference has.
  // Re-run that enumeration if any height term changes.
  const CROWN_SP = 3.2, CROWN_RMAX = 6.5;
  const crownAt = (x) => {
    let top = 0, win = -1;
    const j0 = Math.floor((x - CROWN_RMAX) / CROWN_SP) - 1;
    const j1 = Math.ceil((x + CROWN_RMAX) / CROWN_SP) + 1;
    for (let j = j0; j <= j1; j++) {
      const cx = (j + 0.5) * CROWN_SP + (noise(j, 11.3) - 0.5) * CROWN_SP * 1.2;
      const d = vegDensity(cx);
      // GAP FILL, and it is west-weighted. The old model left the West Cliff
      // 83% covered with nine bare gaps in 500 m and vegetated runs of 21 m
      // median - a dotted line, which is the one thing both the Durley
      // silhouette and the from-the-water photograph agree the West Cliff is
      // not: there the crest edge is continuously green and only its HEIGHT
      // varies. The East Cliff genuinely does have bare stretches (the
      // Southbourne frame shows them), so the fill is scaled by treeMix and is
      // worth 0.20 at the pier and 0.03 at Southbourne. Measured on THIS model
      // with the term on and off, coverage over x -150..350 goes 90% -> 99%,
      // and over x 900..1500 it goes 88% -> 89%. The east is untouched, which
      // is the point of scaling it by treeMix.
      // ⚠️ RE-MEASURED 2026-08-20 at 0.25 m against the MIN_TOP 0.12 threshold
      // the keep test actually uses: west 82% -> 100%, east 87% -> 89%. The
      // east pair reproduces; the west pair does not, and the direction and
      // size of the effect are the parts that survive. Quote the threshold and
      // the step with a coverage number or it cannot be reproduced.
      if (noise(j, 2.05) > 0.12 + (d + 0.20 * treeMix(cx)) * 0.95) continue;
      // Crown height scales with the density, so a thin stretch is a thin trim
      // and a gully is a thicket. Without this every crown is the same size
      // whatever the field says and the density only turns them on and off.
      let h = (0.28 + noise(j, 6.35) * 1.45) * (0.55 + 0.95 * d);
      let r = 2.0 + noise(j, 4.15) * 2.9;          // 4.0-9.8 m across
      // Every crown in a stand takes a SHARE of the tree height - 10% of them
      // none of it, 28% all of it, the rest graded between. That share is what
      // keeps the top of a group ragged rather than flat: neighbours 3.2 m
      // apart differ by metres, so the union of them has notches in it instead
      // of being a single arc.
      const share = clamp((noise(j, 8.45) - 0.10) / 0.62, 0, 1);
      h += (2.2 + noise(j, 9.7) * 5.2) * treeMix(cx) * standStrength(cx, d) * share;
      // ⚠️ AND A LONE BUSH TERM, WHICH IS THE OPPOSITE OF THE STAND TERM AND HAS
      // TO BE. Making the trees clump cost the EAST the one thing that stretch
      // is measured against: the Southbourne frame's "3.8 emergent clumps per
      // 100 m, 1-11 m wide" standing over the scrub line, which on a scrub cliff
      // ARE independent of one another - they are gorse and bramble, not a wood.
      // Measured after the stand term went in and before this line, x 900..1500
      // emergent over a 24 m lower envelope fell to p90 1.22 m against the old
      // model's 1.50 and the photograph's 1.80. So the independent lottery is
      // kept, and scaled by 1 - treeMix so it is worth nothing at the pier and
      // everything at Southbourne. 18% of kept crowns, which over x 900..1500
      // is 3.8 lone bushes per 100 m against the photograph's 3.8 emergent
      // clumps per 100 m, and 2.6 per 100 m out west where they belong least.
      // With this line back, x 900..1500 reads p90 1.67 m.
      if (noise(j, 21.7) > 0.82) h += (0.7 + noise(j, 19.3) * 1.5) * (1 - treeMix(cx));
      // ⚠️ NO SPIKES. A crown is never narrower than 1.2x its own height. The
      // old `r *= 1.30` was applied to the BASE radius and could not see the
      // height it had just added, which is how a 6.1 m crown ended up 7.6 m
      // tall. chines-westcliff/732442982220475.jpg (aerial, with the beach hut
      // row in frame at this file's own 2.1 m pitch) measures crowns 3.6-6 m
      // across and the from-the-water frame shows 6-9 m ones; nothing in either
      // is a fin. Measured over the whole 3 km, worst height:width is now 0.83
      // against the old model's 1.24.
      r = Math.max(r, h * 0.60);
      const u = (x - cx) / r;
      if (u <= -1 || u >= 1) continue;
      // TWO CROWN FORMS, blended per crown, because the second thing that made
      // the old row read as scenery flats was that every clump was the same
      // shape. form -> 0 is the broad flat-topped plate of a mature pine or a
      // holm oak; form -> 1 is the pointed cone of a young pine. Both are in
      // the Durley frame within twenty metres of each other.
      const form = noise(j, 15.7);
      let p = h * ((1 - form) * Math.pow(1 - u * u, 0.36)
                 + form * Math.pow(1 - Math.abs(u), 0.90));
      // SUB-CROWN LOBES. The sine argument runs over u in -1..1, so the crown
      // carries 2k/2pi = 2.1 to 4.5 bumps across its own width, damped to
      // nothing at its edges so the union stays continuous. On a 12 m crown
      // that is a 2.7-5.7 m wavelength, which at the ~2 px/m these cameras give
      // is 5-11 px - the finest thing on this silhouette that can actually be
      // seen. Amplitude is 11.5% of the crown height: about 1 m on a tall one,
      // i.e. 2 px, which is the difference between an analytic arc and an edge.
      p *= 1 + 0.115 * Math.sin(u * (6.5 + noise(j, 3.1) * 7.5)
                              + noise(j, 7.7) * 6.283) * (1 - u * u);
      if (p > top) { top = p; win = j; }
    }
    return [top, win];
  };

  // The low continuous trim under the crowns - gorse, bramble, burnt grass. It
  // is what stops the gaps between crowns being a dead-flat crest line, and the
  // reference is unambiguous that it is there: on the East Cliff frame the
  // crest edge is fuzzy over its whole visible length. Its roughness is the
  // sd 0.28 m / 0.56 m pair measured above. Same treeMix gap fill as the crowns
  // - the trim and the crowns have to open and close together, or a "gap" is a
  // bare crest with bushes standing in it.
  const scrubTop = (x) => {
    const d = vegDensity(x) + 0.20 * treeMix(x);
    const gate = smoothstep5(clamp((d - 0.08) / 0.30, 0, 1));   // 0 in a real gap
    return gate * (0.30 + 0.95 * fbm2(x * 0.085, 23.1)) * 0.80;
  };

  // ---- STEP, AND IT IS NOW ADAPTIVE ---------------------------------------
  // The silhouette's resolution IS the column step - there is no other lever on
  // a lofted height field - and the old flat 1.5 m spent the whole budget on
  // 0.05-1.2 m scrub (scrubTop itself tops out at 0.95 m over the whole 3 km,
  // and the coarse ragged octave takes a trim column to about 1.18 m; the line
  // said 0.3-1.3) whose own detail is under a pixel at the range this is
  // judged from, while drawing the tall crowns, which are 10-20 px tall, at
  // 3 px a facet. So the step now follows the canopy: 0.7 m wherever the
  // un-ragged canopy stands over FINE_LO, 2.4 m over the low trim, and 7.0 m
  // past x = 1150, where the crest is 670 m from the ad-hoc coast camera
  // (cal=600,1.6,320;560,25,60;50 - re-derived 2026-08-20 from that camera and
  // the crest polyline; the line said 650) and 1,078-1,124 m from the four
  // judged water cameras - 0.64 px per metre, so a 2 m bush is 1.3 px and a
  // finer lattice buys literally nothing.
  // ⚠️ AND x = 1150 PROJECTS OFF THE RIGHT EDGE of every one of those six
  // frames (px 1310 on the coast camera's own 872-wide render, further on the
  // other four), so the far LOD is currently free rather than merely cheap.
  // Re-check that if a camera is ever aimed east of Boscombe.
  // Realised column counts off the built lattice: 0.7 m x 978, 2.4 m x 319,
  // 7.0 m x 221 = 1,519 columns.
  //
  // ⚠️ EVERY RAGGED FREQUENCY IS TIED TO THE STEP THAT SAMPLES IT. This is the
  // trap the scar field records: a cell sampled at less than about three times
  // its own frequency aliases into the coarse structure instead of adding
  // detail. There are three octaves and each is gated to a lattice -
  //   coarse 0.145 -> 6.9 m cell, 2.9 samples at the 2.4 m mid step;
  //   far    0.048 -> 20.8 m cell, 3.0 samples at the 7.0 m far step;
  //   fine   0.440 -> 2.3 m cell, 3.2 samples at the 0.7 m fine step, and its
  //          amplitude ramps in over exactly the FINE_LO..FINE_HI band that
  //          switches the step, so it can only ever exist on the fine lattice.
  //          That coupling is deliberate: it is why the two constants are
  //          shared rather than written out twice.
  // The old 0.20 coarse octave drops to 0.145 because the mid step is now 2.4 m
  // rather than 1.5 m; left at 0.20 it would be sampled 1.7x and alias.
  //
  // WHAT IT COSTS, counted off the built mesh rather than estimated: 5,964
  // triangles for the whole fringe against the old 5,040, from 1,519 columns
  // against the old flat lattice's 1,376. 18% more geometry for a 2.1x finer
  // silhouette exactly where the silhouette is, and it leaves about a thousand
  // triangles of headroom under the 7,000 this block is allowed.
  const VEG_STEP_FINE = 0.7, VEG_STEP_MID = 2.4, VEG_STEP_FAR = 7.0;
  const VEG_LOD_X = 1150, FINE_LO = 1.15, FINE_HI = 2.05;
  const MIN_TOP = 0.12;
  // The un-ragged canopy, split out because the step has to be chosen from a
  // height that does not itself depend on which step was chosen.
  const rawTop = (x) => {
    const [ct, win] = crownAt(x);
    const st = scrubTop(x);
    return [Math.max(ct, st), ct >= st && win >= 0, win];
  };
  const cols = [];
  for (let x = X0; x <= X1; ) {
    const [raw, isCrown, win] = rawTop(x);
    let top = raw, fine = 0;
    if (raw > 0.05) {
      const rf = x < VEG_LOD_X ? 0.145 : 0.048;
      top += (snoise(x * rf, 41.7) - 0.5) * 0.55 * Math.min(1, raw * 0.9);
      fine = x < VEG_LOD_X
        ? smoothstep5(clamp((raw - FINE_LO) / (FINE_HI - FINE_LO), 0, 1)) : 0;
      if (fine > 0) top += (snoise(x * 0.44, 43.1) - 0.5) * 0.70 * fine;
      top = Math.max(0, top);
    }
    cols.push({ x, top, crown: isCrown, win });
    // Look one mid step ahead so a stand is ENTERED on the fine lattice rather
    // than with a 2.4 m quad across the shoulder where it starts to climb.
    let step = x >= VEG_LOD_X ? VEG_STEP_FAR : VEG_STEP_MID;
    if (x < VEG_LOD_X && (raw > FINE_LO || rawTop(x + VEG_STEP_MID)[0] > FINE_LO)) {
      step = VEG_STEP_FINE;
    }
    x += step;
  }

  const vegStart = m.vertexCount;
  let vegSpans = 0;
  {
    let prev = null, prevK = -2;
    for (let k = 0; k < cols.length; k++) {
      const a = cols[k];
      // Keep the column if it or either neighbour carries canopy, so a run ends
      // by TAPERING to nothing rather than with a vertical wall.
      if (!(a.top > MIN_TOP
        || (k > 0 && cols[k - 1].top > MIN_TOP)
        || (k + 1 < cols.length && cols[k + 1].top > MIN_TOP))) {
        prev = null; prevK = -2; continue;
      }
      const x = a.x, top = a.top;
      const cy = onLattice(crestYExact, x), cz = onLattice(crestZExact, x);
      // The fringe's own plan-form wander, so it is not glued to the crest
      // polyline: some of it stands back on the plateau, some spills over the
      // brow. ⚠️ VERIFIED 2026-08-20: this said "250 m cell" and the code has
      // never had one. fbm2(x * 0.028) is a 1/0.028 = 35.7 m base cell with a
      // 13.2 m second octave; amplitude is the only half that was right at
      // +/-3.5 m. 36 m is still four to nine crowns wide, so the wander reads
      // as the fringe leaning in and out of the brow rather than as per-crown
      // jitter - the thing the sentence was defending - but do not quote 250.
      const zw = (fbm2(x * 0.028, 31.5) - 0.5) * 7.0;
      // A tall clump is a DEEP mass, not a tall fin. This is what makes the
      // shading read - the seaward skirt and the ridge get different normals
      // and the sun is out over the sea, so n.l runs 0.91 down to 0.72 across
      // the visible face of a clump.
      const dw = 1.3 + top * 0.55;
      const zR = cz - 1.0 + zw;
      const zF = Math.min(zR + dw, cz + 3.5);      // capped: 2.5 m down the face
      const zB = Math.max(zR - dw, cz - 12.0);     // capped: clear of the villas
      // ⚠️ THE FEET SIT ON THE GROUND AND 0.4 m INTO IT - MOSTLY. This is
      // defect (3),
      // and it is the whole reason there is no base line any more. Seaward of
      // the crest the ground is the 36 degree face, so a foot that far out
      // drops (z - cz) * tan36; landward it is the plateau, which RISES. From
      // a 1.6 m eye at 250-400 m the sight line over the crest climbs about
      // 0.07 per metre and the plateau climbs 0.058, so everything behind the
      // brow at ground level is occluded - which is exactly what a photograph
      // of scrub growing over a cliff edge shows.
      // ⚠️ AND HERE IS WHERE IT IS NOT TRUE, MEASURED 2026-08-20 against the
      // BUILT ribbon triangles rather than against this expression. Landward is
      // exact: every B foot sits 0.40 m under the plateau, 0 floating out of
      // 1,501, because PLATEAU_SLOPE IS the ribbon's own last row. Seaward is
      // not, because ground() assumes a clean 36 degree cone off the crest
      // while the ribbon's row below the crest carries gully, scar and lobe
      // displacement, so the real face is locally steeper. 200 of 1,501 F feet
      // (13.3%; 15.5% inside x -300..110, the band the four water cameras see)
      // stand CLEAR of the built face - p99 +0.69 m, worst +2.94 m in the
      // judged band, +3.04 m at x 2648. Median clearance is -0.40 m, exactly
      // as intended, so this is a tail and not a bias.
      // It has not put the base line back: what shows under a lifted skirt is
      // the cliff face behind it, not sky, and the lifts are per-column and
      // scattered rather than continuous. Rendered and looked at on approach,
      // entrance, along-neck and head, no base line is visible. But the
      // sentence above was written as though the burial were unconditional and
      // it is not. If it ever needs fixing the honest fix is to sample the
      // ribbon's own face row here, the same way onLattice samples its crest -
      // deepening the 0.4 m alone would bury the short crowns.
      const ground = (z) => (z >= cz ? cy - (z - cz) * TAN36
                                     : cy + (cz - z) * PLATEAU_SLOPE);
      // Colour, and it is DELIBERATELY UNCHANGED by the silhouette pass. Same
      // two keys, and the mean over the drawn columns is 0.295 now against
      // 0.319 before the crowns were re-shaped and 0.310 on the tents before
      // that - three lattices, a 0.02 spread, so the fringe's tone against the
      // face has not moved. The mix is tied to the SHAPE: a crown takes a
      // per-crown value from its own index and the low scrub takes a smooth
      // 18 m field, so tone varies within a run instead of being constant over
      // a whole clump - and 72.7% of the drawn columns are now crown-led (1,091
      // of 1,501; re-counted 2026-08-20, the line said 74, and re-counted again
      // 2026-08-21 off an instrumented build, which is where the 1,092 that
      // stood here came from: 1,092 of the 1,519 LATTICE columns are crown-led,
      // 71.9%, but one of them is dropped by the MIN_TOP filter, so the DRAWN
      // figure is 1,091 of 1,501. The percentage was right either way), so most
      // of that variation is per-crown, which is what a stand of several crowns
      // needs in order not to read as one cut-out. The keys are cliffPine
      // (75,69,70) and cliffScrubDry (95,85,72), 20 levels apart, and the
      // palette block above already explains why nothing wider is reachable at
      // this range: the haze floor is (55,67,70) and a darker albedo only buys
      // more blue.
      // ⚠️ MEASURED THIS PASS, off a magenta-masked render, so the next person
      // does not re-open it: the fringe's rendered p50 is (63,53,49) at the
      // entrance camera, (80,73,71) at approach and (85,81,78) at coast. The
      // East Cliff photograph's crest vegetation samples (52-66, 50-59, 29-41).
      // R/G matches - 1.10-1.19 against 1.13 - and the whole error is in BLUE,
      // B/R 0.78-0.92 against 0.62. That is the haze floor, not the palette,
      // and it is exactly what this file already says two paragraphs of the
      // cliff block above. Do not spend a pass on it.
      // ⚠️ 2026-08-20 - HALF OF THAT IS WRONG AND IT IS THE HALF THAT CLOSED
      // THE QUESTION. "The whole error is in BLUE" only follows if you compare
      // the ENCODED triple, which contains the additive haze floor. Divide the
      // floor out and cliffPine was reflecting linear G/R 0.106 against a
      // reference vegetation 0.741-1.090 - the fringe had essentially NO GREEN
      // IN IT, which is why it read as a row of chocolate lumps. Blue is
      // floor-limited and remains so; green never was. Re-measured on the same
      // three cameras with the fringe isolated as the top three rows of the
      // cliff mask, before -> after:
      //     entrance (69,57,50) GI -1.5  ->  (64,66,50) GI +8.5
      //     approach (84,77,72) GI  0.0  ->  (80,85,72) GI +8.5
      //     coast    (92,89,84) GI +0.5  ->  (87,95,84) GI +9.0
      // (GI = G - (R+B)/2, the statistic the 177 reference photographs are
      // counted on. These p50s are 3-row silhouette samples and read brighter
      // than the magenta-mask p50s above, which included the shaded skirt.)
      // The keys are now cliffPine (75,81,70) and cliffScrubDry (83,87,71).
      // The fringe is 0.21% of the approach frame, 0.28% of coast and 0.44% of
      // entrance - a sliver, and all of it silhouette.
      const tMix = a.crown
        ? noise(a.win, 5.25) * 0.46
        : 0.26 + snoise(x * 0.055, 13.9) * 0.40;
      // Sunlit top, shaded skirt, +/-0.08 about that mix. A ridge over a foot,
      // which is the way round the West Cliff photographs show it, and it
      // averages out along the skirt so the mean does not move.
      const colR = mix3(C.cliffPine, C.cliffScrubDry, clamp(tMix + 0.08, 0, 1));
      const colF = mix3(C.cliffPine, C.cliffScrubDry, clamp(tMix - 0.08, 0, 1));
      // MAT.PAINTED, explicitly. roofRidge used to force CONCRETE on the tents
      // and they rendered a neutral pale grey; see the note at roofRidge.
      const P = (y, z, col) => m.pushC(x + OX, y, z + OZ, 0, 1, 0, col, MAT.PAINTED);
      const F = P(ground(zF) - 0.4, zF, colF);
      const R = P(ground(zR) + top, zR, colR);
      const B = P(ground(zB) - 0.4, zB, colF);
      if (prev && prevK === k - 1 && (a.top > MIN_TOP || cols[k - 1].top > MIN_TOP)) {
        // WINDING: (F, F', R', R) puts the geometric normal OUTWARD, i.e. up
        // and seaward, so the lit side is the FRONT face and shadow.js's
        // cullFace(FRONT) depth pass drops it. Same reasoning as the ribbon's
        // corduroy fix - an open single-sided surface that writes its own depth
        // shadow-acnes itself - and the same conclusion: nothing here needs to
        // cast, because the sun is at (-0.35, 0.72, 0.60) and a clifftop tree's
        // shadow falls landward, behind the crest, where no camera can see it.
        m.quad(prev.F, F, R, prev.R);
        m.quad(prev.R, R, B, prev.B);
        vegSpans++;
      }
      prev = { F, R, B }; prevK = k;
    }
  }
  // Smoothed, not faceted: the ridge vertices get the average of the two skirts
  // so the top of a clump is a soft roll rather than a knife edge. This is the
  // second half of "not a tent" - a hard ridge line catching a different value
  // from the skirt is what draws a triangle for the eye.
  m.smoothNormals(vegStart);
  // vegSpans * 4 triangles. Counted at build: see tools/mesh-check.mjs.

  // ---- twelve timber groynes (§B.3) ---------------------------------------
  // Timber, not rock. Exactly twelve, not a field of thirty.
  const GROYNES = [
    [300, 75], [492, 71], [643, 77], [816, 74], [988, 83], [1161, 80],
    [1333, 85], [1507, 85], [1683, 88], [1843, 77], [2002, 79], [2160, 79],
  ];
  for (const [gx, len] of GROYNES) {
    const lean = 0.07;                       // runs out on ~168 deg
    const steps = 14;
    for (let s = 0; s < steps; s++) {
      const t0 = s / steps, t1 = (s + 1) / steps;
      const z0 = t0 * len, z1 = t1 * len;
      const x0 = gx + z0 * lean, x1 = gx + z1 * lean;
      const beachY = 3.0 * (1 - Math.min(1, z0 / mhwOffset(gx)));
      // Colour bands: new timber on top, weathered below, near-black under water
      const col = beachY > 0.6 ? C.timberNew : (beachY > -0.2 ? C.timberWeathered : C.timberWet);
      const top = Math.max(beachY + 1.2, 0.4);
      m.box(x0 + OX, beachY - 1.2, z0 + OZ, x1 + OX, top, z1 + 1.0 + OZ, col, MAT.TIMBER);
    }
    // red marker on the tip
    const tz = len, tx = gx + tz * lean;
    m.box(tx - 0.3 + OX, 0.3, tz + OZ, tx + 0.3 + OX, 2.2, tz + 0.8 + OZ, C.groyneMarker, MAT.TIMBER);
  }

  // ---- beach huts (§B.4) --------------------------------------------------
  // 2.0 x 2.5 m, butted into continuous terraces at Z = -18, in a colour
  // GRADIENT along each terrace - the thing that makes them read as Bournemouth
  // rather than as generic seaside.
  const CLUSTERS = [[150, 650], [1080, 1210], [1380, 1520], [1880, 2280]];
  for (const [ax, bx] of CLUSTERS) {
    const n = Math.floor((bx - ax) / 2.1);
    for (let k = 0; k < n; k++) {
      const hx = ax + k * 2.1;
      const t = k / Math.max(1, n - 1);
      // PASTEL, and this time actually pastel.
      //
      // The comment has always said "pastel gradient"; the code was
      // 0.42 + 0.30*sin() per channel at phases 0 / 2.1 / 4.2, which is a base
      // barely above mid-grey with an amplitude of 0.30 - so the channels swing
      // in near-opposition and the result reaches (0.27, 0.30, 0.72) at t=0.65.
      // That is 78% saturation, i.e. electric indigo, and the ^2.2 to linear
      // then crushes the two low channels and pushes it further still. Four
      // clusters, about 1.1 km of unbroken purple-to-teal ribbon, and it sits
      // in the middle of the player's shoreward view.
      //
      // A pastel is a HIGH base with a SMALL swing: base 0.72 with amplitude
      // 0.10 keeps every channel in 0.62-0.82, so no channel can ever be much
      // more than a quarter away from another and the hue stays a tint rather
      // than a colour. Real Bournemouth huts are pale blue, mint, cream, soft
      // pink and butter yellow - all of them near-white with a wash of hue.
      // The phases are kept, so the sequence along the terrace is unchanged;
      // only its saturation is.
      const a = t * Math.PI * 1.6 + 0.4;
      const col = [
        0.72 + 0.10 * Math.sin(a),
        0.73 + 0.095 * Math.sin(a + 2.1),
        0.74 + 0.09 * Math.sin(a + 4.2),
      ].map((v) => Math.pow(Math.max(0.12, Math.min(0.95, v)), 2.2));
      m.box(hx + OX, 3.5, -18.6 + OZ, hx + 2.0 + OX, 5.7, -16.1 + OZ, col);
      // PITCHED ROOF, GABLE TO THE SEA (2026-09-18, owner: "yes fix the beach huts").
      //
      // This was a flat 0.35 m cap in concreteDark, and it rendered the whole
      // 1.1 km of hut frontage as one unbroken horizontal band - the tmp-tr116
      // pass flagged it as probably a bigger win than anything else it built.
      // Every Bournemouth hut is a gable end facing the water.
      //
      // PITCH, MEASURED, not assumed. bournemouth-beach/1069238371874266.jpg is a
      // ground-level row ("2406", "2407", ...), the only frame in the library where
      // the gable is resolved off-foreshortening. Fitting the bright bargeboard edge
      // on the two most face-on huts: 2407 gives 37.1/54.5 deg, 2408 gives 46.8/49.5
      // - the left/right spread is perspective, the per-hut mean is 45.8 and 48.1.
      // Cross-check from a second, independent frame and method: G:\DJI\DJI FLY\
      // SouthbourneCliffs.mp4 t=22s, tracing the roofline over 710 columns and folding
      // it on its own 19 px autocorrelation period gives 35.7 deg APPARENT, which is a
      // drone looking down, so the true angle is steeper - consistent with ~45.
      // Built at 45 deg exactly: rise = half the roofed width = 1.06 m.
      //
      // The gable end takes the HUT's colour and the slopes take the roof colour,
      // which is what the photograph shows (pale gable with a white verge under a
      // dark slope) and is the same convention as the clifftop villas at roofRidge.
      // CHEAPER THAN WHAT IT REPLACES: roofRidge is 6 triangles against the cap
      // box's 12, so 555 huts give back 3,330.
      roofRidge(hx - 0.06, hx + 2.06, -18.7, -16.0, 5.7, 6.76, C.concreteDark, col, 'z', MAT.CONCRETE);
    }
  }

  // ---- clifftop skyline (§B.9) --------------------------------------------
  // Tall buildings ONLY on the clifftop, never on the beach.
  //
  // The 34 evenly-spaced blocks this replaces are half-diagnosed at PAL above:
  // the vertex colour was arriving intact - proved by setting PAL to saturated
  // primaries and re-rendering - and they still read as grey slabs because
  // three of the four body colours render inside 30/255 of each other and of
  // the sky, and because a full-width BLUE window band took 42% of every floor.
  // Both of those are fixed at PAL. What is fixed here is the other half: form.
  //
  // From the crest crop of southbourne-eastcliff/885017663629672.jpg the real
  // skyline is:
  //   * FINE-GRAINED. Frontages of 8-16 m, not a single 37 m mass.
  //   * CLUMPED. Continuous runs with genuine gaps of open clifftop between
  //     them. The old spacing was 84 m +/- 46 m for 3 km - at 350 m that is a
  //     metronome, and a regular rhythm of equal blocks is the loudest
  //     placeholder tell there is.
  //   * LOW. Mostly 3-5 storeys, with a small minority of taller 1960s blocks.
  //   * ROOFED. Ridges and sea-facing gables carry the silhouette. At 350 m a
  //     window is a pixel and a roof shape is twenty of them.
  //
  // RE-JUDGED 2026-08-19 against a proper crop of that same photograph - the
  // crest band at 0.28-0.62 x, 0.46-0.58 y, which is the only place in the
  // library where the clifftop stock is resolved rather than a smudge. Three
  // corrections, all of them about form, none about colour:
  //   * THE GABLE END TO THE SEA IS THE MINORITY, not the characteristic
  //     case. What the photograph shows is a low, near-continuous band of pale
  //     walls under DARK, SHALLOW, HORIZONTAL roofs, with the odd small gable
  //     breaking it. Built at 100% 'z' gables the render came back as a rank
  //     of white A-frames standing separately along the crest - it reads as a
  //     campsite, and it is the loudest remaining tell in the shoreward view.
  //     Now 45% gable, 55% eaves-to-sea.
  //   * TOO TALL. The villas ran 3-5 storeys above a datum already 3 m over
  //     the crest, so 12-18 m of building stood clear of the cliff. In the
  //     photograph the visible part is more like two storeys and a roof - the
  //     crest cuts the rest off. 2-4 storeys.
  //   * TOO SPARSE. Gaps of 14-76 m between runs made islands. The photograph
  //     has real gaps but they are the exception; the band is mostly closed.

  // A ridge as two sloping planes and two gable ends - 6 triangles. The old
  // pitched roof was five stacked boxes, 60 triangles to draw a staircase, and
  // the open list records that it read as steps rather than as a roof.
  //   axis 'x'  ridge along the shore: the sea sees a horizontal ridge line,
  //             which is what makes a terrace read as one build.
  //   axis 'z'  ridge running seaward: the sea sees the GABLE, a triangle.
  //             The gable end to the sea is the characteristic Bournemouth
  //             clifftop villa and it is the strongest cue available at range.
  //
  // The gable ends take the WALL colour, not the roof colour. A gable end is
  // masonry with a thin verge on it, so on the 'z' villas the sea sees a white
  // triangle rising out of a white box - which is the silhouette the reference
  // shows - and not a dark triangle stuck on top of one.

  // A golden-ratio low-discrepancy sequence, NOT noise(k, s), for the choices
  // that have to hit a proportion.
  //
  // noise() is a sin-based hash, and over the ~33 runs that fit along 3 km it
  // is nowhere near equidistributed. Measured on the sequence it actually
  // produced: a `pick > 0.89` test intended to make 11% of runs tall slabs made
  // TEN OF THIRTY-THREE, and put three of them shoulder to shoulder at x
  // 460-696. That is the row of towers in the render, and no amount of
  // reweighting the threshold fixes a hash that clusters. A golden-ratio
  // sequence hits the intended share exactly at any n and cannot cluster,
  // because consecutive terms are always 0.618 apart.
  //
  // Different irrational increments per stream, or two streams advancing at the
  // same rate would be perfectly correlated - every white building would also
  // be the tall one.
  const seq = (k, inc, ph) => { const v = k * inc + ph; return v - Math.floor(v); };

  // Sea-facing FENESTRATION, as single quads floating 0.06 m proud of the wall.
  //
  // Measured on the entrance camera (95,4,160 -> -6,14,20 fov 50), the clifftop
  // band in the judged box (700,140-884,215) had Sobel edge density 10.0%
  // (th 10) against 50.6% in the same band of photograph 763260589138714.jpg -
  // the walls were arriving as BLANK SLABS while the real East Cliff reads as
  // window grids, balcony rows and bay rhythm. Colour spread already matched
  // (sd 54/59/67 vs 41/48/60), so the missing 40 points are geometry.
  //
  // A window CANNOT be a box here: at ~140 units along 3 km a 12-triangle box
  // per opening is 20-30k triangles. Only the +z face is ever seen from the
  // sea, so each opening is ONE quad, 2 triangles, in PAL.band - which is the
  // palette's recessed-window colour and renders (108,112,118) against a white
  // wall's (189,193,195), an 80-step edge against Sobel threshold 10. The
  // 0.06 m float clears 24-bit depth precision at 350 m by an order of
  // magnitude, so it cannot z-fight, and at 5 px/m (entrance camera) it is
  // invisible as an offset.
  const win = (x0, x1, y0, y1, zf, col) => {
    m.quad(
      m.pushC(x0 + OX, y0, zf + OZ, 0, 0, 1, col, MAT.CONCRETE),
      m.pushC(x1 + OX, y0, zf + OZ, 0, 0, 1, col, MAT.CONCRETE),
      m.pushC(x1 + OX, y1, zf + OZ, 0, 0, 1, col, MAT.CONCRETE),
      m.pushC(x0 + OX, y1, zf + OZ, 0, 0, 1, col, MAT.CONCRETE));
  };

  const FLOOR = 3.05;
  let sx = -300;
  // Every footprint's [x0, x1, zFront, lowest sill y], so the planting below never grows a
  // crown through a wall. Recorded only - it draws nothing.
  const lots = [];
  // 2026-09-17 (tmp-tr39): CLIFF_REAL. Between the piers the stock below is
  // replaced by the real East Cliff buildings (OSM footprints, EA 1 m DSM
  // heights; see REAL_BLD further down). The stock loop still RUNS unchanged,
  // so every hash stream and every run outside the band is identical; a run
  // whose footprints touch [REAL_X0, REAL_X1] is simply cut back out of the
  // mesh. false = the random stock everywhere, byte-identical to before.
  const CLIFF_REAL = true;
  const REAL_X0 = -60, REAL_X1 = 2420;
  for (let k = 0; sx < 2720 && k < 300; k++) {
    const mark = CLIFF_REAL ? [m.v.length, m.n.length, m.c.length, m.m.length, m.i.length, lots.length] : null;
    // Stock mix, weighted off the crest crop. Villas and terraces are the
    // overwhelming majority; the 1960s slabs are the exception that gives the
    // skyline its few tall punctuations, and making them common is what turned
    // the old row into a wall.
    const pick = seq(k, 0.6180339887, 0.31);
    const type = pick > 0.93 ? 3            //  7%  1960s slab, 7-10 storeys
      : pick > 0.70 ? 2                     // 23%  flat-roofed block, 4-6
      : pick > 0.38 ? 1                     // 32%  terrace run, 3-4
      : 0;                                  // 38%  detached villa, 3-5

    // Set back behind the crest, so the cliff itself hides the ground floors.
    // 16-42 m rather than the old 34-68: the reference has them close to the
    // edge, and further back simply hides more of them behind the crest.
    const H = crestHeight(sx) + 3.0;
    const runB = Math.max(2, H - 3.5) / Math.tan(36 * Math.PI / 180);
    const bz = -20 - runB - 16 - noise(k, 7.7) * 26;
    const d = 11 + noise(k, 3.3) * 8;
    const base = H - 6;                     // buried, so no gap can show

    // Body colour per RUN, not per unit: a terrace is one build. White render
    // dominates - see PAL for why the old four-way split was invisible. Brick
    // is deliberately kept OFF the long terrace runs: a 130 m unbroken red mass
    // is what the first attempt produced and it is not a thing that exists on
    // this seafront, where brick is villa-scale.
    const cp = seq(k, 0.7548776662, 0.62);
    const body = cp > 0.50 ? PAL.white : cp > 0.28 ? PAL.render
      : cp > 0.14 ? PAL.cream
      : (cp > 0.05 && type !== 1) ? PAL.brick : PAL.stone;
    const rcol = seq(k, 0.5436890127, 0.17) > 0.74 ? PAL.roofRed : PAL.roof;

    if (type === 0) {
      // Detached and semi-detached villas, mixed roof orientation.
      const units = 2 + Math.floor(noise(k, 1.7) * 4);
      let ux = sx;
      for (let u = 0; u < units; u++) {
        const w = 9 + noise(k * 7 + u, 4.4) * 7;
        // 2-4 storeys, not 3-5. See the re-judgement above: at 3-5 above a
        // datum already 3 m over the crest these stood 12-18 m clear of the
        // cliff, where the photograph shows about two storeys and a roof.
        const top = H + (2 + Math.floor(noise(k * 7 + u, 1.1) * 3)) * FLOOR;
        m.box(ux + OX, base, bz + OZ, ux + w + OX, top, bz + d + OZ, body, MAT.CONCRETE);
        lots.push([ux, ux + w, bz + d, H + 0.8]);
        // Rise PROPORTIONAL to the span the roof actually crosses, so the pitch
        // is constant whichever way the ridge runs - instead of a fixed rise
        // that came out anywhere between 17 and 41 degrees depending on how
        // wide the house happened to be. A shallow pitch on a wide house reads
        // as a flat top at 350 m, which is most of why the villas were not
        // registering at all before that.
        //
        // ROOF ORIENTATION, per unit rather than per run: a real street has
        // both, and switching per run made whole clumps identical. The 0.45
        // is the measured minority share of sea-facing gables in the crest
        // crop - built at 1.0 the row rendered as a rank of white A-frames.
        // A golden-ratio stream again, so the share is exact at any n and
        // cannot clump the way noise() does.
        const gableEnd = seq(k * 7 + u, 0.4142135624, 0.29) < 0.45;
        if (gableEnd) {
          roofRidge(ux, ux + w, bz, bz + d, top, top + clamp(w * 0.34, 2.6, 5.0),
            rcol, body, 'z');
        } else {
          // Eaves to the sea: the silhouette is a low dark horizontal bar on a
          // pale wall, which is what the photograph is mostly made of.
          roofRidge(ux, ux + w, bz, bz + d, top, top + clamp(d * 0.30, 2.6, 5.0),
            rcol, body, 'x');
        }
        // Chimney on about a third of them. Two metres of brick is nothing at
        // 350 m except a notch in the ridge line - which is the point: an
        // unbroken ridge is as synthetic as an unbroken row.
        if (noise(k * 7 + u, 5.5) > 0.66) {
          const cx = ux + w * (0.3 + noise(k * 7 + u, 3.1) * 0.4);
          m.box(cx - 0.5 + OX, top + 1.2, bz + d * 0.45 + OZ,
            cx + 0.5 + OX, top + 4.0, bz + d * 0.45 + 1.1 + OZ, PAL.brick, MAT.CONCRETE);
        }
        // Window grid, aligned to the floors: a ~3.1 m bay rhythm, one sash
        // per bay, sill 0.9 m above each floor. 3.1 m is the Victorian villa
        // bay spacing scaled off the crest crop, and it keeps a 9 m house at
        // 2 bays and a 16 m one at 4 - fine-grained, not a curtain wall. At
        // the entrance camera's ~5 px/m a 1.4 x 1.9 m opening is 7 x 9 px:
        // architecture, not noise. Floors START at H (the crest hides what is
        // below), so nothing is spent on buried storeys.
        //
        // NO 3D canted bays. They were built (full-height, 0.85 m proud) and
        // measured: +0.34 edge points for 856 triangles across the stock,
        // because at the judged cameras the view is near-frontal - a bay's
        // front face has the wall's own colour and normal, and its 0.85 m
        // sides subtend under 2 px. The bay RHYTHM is carried by the window
        // columns instead, which is where those triangles went.
        const vfl = Math.round((top - H) / FLOOR);
        const vnw = Math.max(2, Math.floor((w - 2.0) / 3.1));
        const vpitch = (w - 2.0) / vnw;
        for (let f = 0; f < vfl; f++) {
          const sy = H + f * FLOOR + 0.8;
          for (let q = 0; q < vnw; q++) {
            const wx = ux + 1.0 + vpitch * (q + 0.5);
            win(wx - 0.7, wx + 0.7, sy, sy + 1.9, bz + d + 0.06, PAL.band);
          }
          // String course at each upper floor line: a 0.18 m PAL.stone strip,
          // the stucco band detail every Victorian frontage here carries. At
          // ~5 px/m it rasterises as a 1 px line at (140,143,146) across a
          // (189,193,195) wall - a full-width horizontal edge for 2 triangles.
          if (f > 0) {
            win(ux, ux + w, H + f * FLOOR, H + f * FLOOR + 0.18,
              bz + d + 0.05, PAL.stone);
          }
        }
        // Eaves cornice on the eaves-to-sea houses only: on the gable villas
        // the front wall runs up into the triangle and a dark strip across
        // its base would cut the gable in half. Those houses take a DORMER
        // instead: the box pokes through the lower roof plane and its pale
        // front + sash break the long red run of ridge that the entrance
        // camera sees - the roof band of the judged box was its emptiest part.
        if (!gableEnd) {
          win(ux, ux + w, top - 0.35, top, bz + d + 0.07, PAL.roof);
          if (noise(k * 7 + u, 2.9) > 0.45) {
            const cx = ux + w * 0.5;
            m.box(cx - 0.8 + OX, top + 0.45, bz + d - 1.7 + OZ,
              cx + 0.8 + OX, top + 2.15, bz + d - 0.55 + OZ, body, MAT.CONCRETE);
            win(cx - 0.45, cx + 0.45, top + 1.05, top + 1.95,
              bz + d - 0.49, PAL.band);
          }
        }
        // 1.6-5.0 m between villas, not 2.0-7.5. Semi-detached and narrow
        // side passages are the Bournemouth clifftop norm; wide plots put
        // sky between every house and turned the run into separate objects.
        ux += w + 1.6 + noise(k * 7 + u, 6.3) * 3.4;
      }
      // 10-48 m between runs, not 14-76. The crest crop has real gaps, but
      // they are the exception and the band is mostly closed; at 350 m a
      // 76 m gap is 220 px of empty clifftop between two small buildings.
      sx = ux + 10 + noise(k, 9.4) * 38;
    } else if (type === 1) {
      // Terrace run: many narrow units, but broken into 2-3 SEGMENTS at
      // different eaves heights, each under its own ridge. One ridge over the
      // whole run produced a 130 m flat-topped mass - it is the single cream
      // block on the right of the previous render - and real seafront terraces
      // step every few houses as the ground and the build dates change. The
      // step is what stops a long run reading as one extruded box.
      const units = 5 + Math.floor(noise(k, 1.7) * 8);
      const segs = 2 + Math.floor(noise(k, 5.1) * 2);
      const per = Math.max(2, Math.round(units / segs));
      let ux = sx, u = 0;
      for (let s = 0; s < segs; s++) {
        const top = H + (3 + Math.floor(noise(k * 3 + s, 1.1) * 2)) * FLOOR
          + (s % 2 ? 1.4 : 0);
        const segStart = ux;
        for (let j = 0; j < per; j++, u++) {
          const w = 6.5 + noise(k * 11 + u, 4.4) * 3.5;
          // One unit in six painted off-key. Real terraces are repainted house
          // by house and the break is visible from a long way off.
          const ucol = noise(k * 11 + u, 2.4) > 0.83 ? PAL.cream : body;
          m.box(ux + OX, base, bz + OZ, ux + w + OX, top, bz + d + OZ,
            ucol, MAT.CONCRETE);
          lots.push([ux, ux + w, bz + d, H + 0.8]);
          // Window columns per unit per floor: two on a narrow unit, three
          // past 8.2 m - the terraced-house norm, and the per-unit rhythm is
          // what makes the party-wall grid legible where the paint colour
          // does not change. The judged entrance box lands on one of these
          // runs: blank, it measured 10.0% edge density against the
          // photograph's 50.6; built at 2 columns and 1.7 m sashes it reached
          // 18.6, so the count and the 1.9 m sash height carry the rest.
          // (3D canted bays were tried here first: +0.34 points for 856
          // triangles - see the villa note - and were removed.)
          const tnw = w > 7.6 ? 3 : 2;
          const tfl = Math.round((top - H) / FLOOR);
          for (let f = 0; f < tfl; f++) {
            const sy = H + f * FLOOR + 0.8;
            for (let q = 0; q < tnw; q++) {
              const wx = ux + w * ((q + 0.5) / tnw);
              win(wx - 0.7, wx + 0.7, sy, sy + 1.9, bz + d + 0.06, PAL.band);
            }
          }
          // Roof dormer on 60% of units, mid-unit: a pale box through the
          // lower roof plane with its own sash. The roof band of the judged
          // box was an unbroken red field ~15 px tall; each dormer cuts a
          // 8 x 6 px notch of wall-on-roof edge into it, which is what the
          // reference's broken roofline is made of.
          if (noise(k * 11 + u, 9.6) > 0.34) {
            const cx = ux + w * 0.5;
            m.box(cx - 0.8 + OX, top + 0.45, bz + d - 1.7 + OZ,
              cx + 0.8 + OX, top + 2.15, bz + d - 0.55 + OZ, ucol, MAT.CONCRETE);
            win(cx - 0.45, cx + 0.45, top + 1.05, top + 1.95,
              bz + d - 0.49, PAL.band);
          }
          ux += w;
        }
        // Rise proportional to the depth: a constant 36 degrees.
        roofRidge(segStart, ux, bz, bz + d, top, top + d * 0.36, rcol, body, 'x');
        // Cornice: a 0.35 m PAL.roof strip under the eaves - the eaves shadow
        // line every Victorian terrace carries, one full-length horizontal
        // edge for 2 triangles. Measured on the entrance camera it rasterises
        // 1 px tall, which is exactly what the photograph's eaves line is.
        win(segStart, ux, top - 0.35, top, bz + d + 0.07, PAL.roof);
        // String courses at the upper floor lines, whole segment at a time -
        // same 1 px stucco band as on the villas (see that comment for the
        // rendered numbers).
        for (let f = 1; f < Math.round((top - H) / FLOOR); f++) {
          win(segStart, ux, H + f * FLOOR, H + f * FLOOR + 0.18,
            bz + d + 0.05, PAL.stone);
        }
        // Party-wall stacks, one per segment plus one mid-run.
        for (const f of [0.34, 0.72]) {
          const cx = segStart + (ux - segStart) * f;
          m.box(cx - 0.55 + OX, top + 1.6, bz + d * 0.42 + OZ,
            cx + 0.55 + OX, top + d * 0.36 + 2.2, bz + d * 0.42 + 1.2 + OZ,
            PAL.brick, MAT.CONCRETE);
        }
      }
      sx = ux + 12 + noise(k, 9.4) * 44;
    } else {
      // Flat-roofed stock. Floor banding stays, because it is what the eye uses
      // to read a building's scale - but at 0.26 of the storey and in PAL.band,
      // which renders (118,128,152) against a white wall's (192,204,227). The
      // old band was 0.42 of the storey in a colour that rendered (57,87,142):
      // a 58/42 stripe of pale blue-white and saturated blue, which at 350 m
      // averages to exactly the grey the open list complains about.
      const slab = type === 3;
      const w = slab ? 22 + noise(k, 4.4) * 18 : 15 + noise(k, 4.4) * 14;
      const fl = slab ? 7 + Math.floor(noise(k, 1.1) * 4) : 4 + Math.floor(noise(k, 1.1) * 3);
      m.box(sx + OX, base, bz + OZ, sx + w + OX, H, bz + d + OZ, body, MAT.CONCRETE);
      lots.push([sx - 0.4, sx + w + 0.4, bz + d + 0.85, H + FLOOR * 0.74]);   // parapet / balcony overhang
      // Mullion pitch, one per ~2.7 m: the BIC band of photograph 763 is a
      // colonnade rhythm, verticals every 2-3 m, and it is the verticals the
      // unbroken band strip was missing - a full-width band contributes two
      // horizontal edges per floor and nothing else.
      const nmul = Math.max(2, Math.floor(w / 2.7));
      const mpitch = w / nmul;
      for (let f = 0; f < fl; f++) {
        const y0 = H + f * FLOOR;
        m.box(sx + OX, y0, bz + OZ, sx + w + OX, y0 + FLOOR * 0.74, bz + d + OZ,
          body, MAT.CONCRETE);
        m.box(sx + 0.45 + OX, y0 + FLOOR * 0.74, bz + 0.45 + OZ,
          sx + w - 0.45 + OX, y0 + FLOOR, bz + d - 0.45 + OZ, PAL.band, MAT.CONCRETE);
        // Body-coloured mullions floated 0.05 m proud of the recessed band
        // face (band face bz+d-0.45, mullion bz+d-0.40 - still 0.40 behind
        // the wall plane, so the band stays READ as recessed). Each one cuts
        // the band into window-sized openings and adds two vertical edges.
        for (let mu = 1; mu < nmul; mu++) {
          const mx = sx + mu * mpitch;
          win(mx - 0.4, mx + 0.4, y0 + FLOOR * 0.74, y0 + FLOOR,
            bz + d - 0.40, body);
        }
        // Balcony rows on the 1960s slabs: a slab floor on the East Cliff
        // (Cumberland type) carries a full-width balcony line, and its sunlit
        // top + self-shadowed underside is the strongest horizontal edge the
        // photograph offers. 0.85 m proud, 0.30 m thick, 12 triangles - the
        // one place a box is worth its cost because it SHADOWS the wall.
        if (slab && f > 0) {
          m.box(sx + w * 0.10 + OX, y0 + 0.05, bz + d + OZ,
            sx + w * 0.90 + OX, y0 + 0.35, bz + d + 0.85 + OZ, body, MAT.CONCRETE);
        }
      }
      const top = H + fl * FLOOR;
      // Parapet, and a lift overrun set back from the edge. On a slab the
      // overrun is the only thing that breaks a 40 m flat line.
      m.box(sx - 0.4 + OX, top, bz - 0.4 + OZ, sx + w + 0.4 + OX, top + 0.9,
        bz + d + 0.4 + OZ, body, MAT.CONCRETE);
      m.box(sx + w * 0.32 + OX, top, bz + d * 0.30 + OZ,
        sx + w * 0.62 + OX, top + (slab ? 3.2 : 2.2), bz + d * 0.72 + OZ, body, MAT.CONCRETE);
      // Roofline break on 45% of the flat stock: a raised parapet step over
      // one end. The real skyline's flat roofs step where builds meet; an
      // unbroken 0.9 m parapet line is the same tell as an unbroken ridge.
      // Golden-ratio stream so the share cannot clump (see seq above).
      if (seq(k, 0.3247179572, 0.53) < 0.45) {
        const stepL = seq(k, 0.8392867552, 0.11) < 0.5;
        m.box(sx + (stepL ? 0 : w * 0.62) + OX, top + 0.9, bz - 0.4 + OZ,
          sx + (stepL ? w * 0.38 : w) + OX, top + 1.7, bz + d + 0.4 + OZ,
          body, MAT.CONCRETE);
      }
      sx += w + 12 + noise(k, 9.4) * 44;
    }
    if (mark) {
      let rx0 = Infinity, rx1 = -Infinity;
      for (let q = mark[5]; q < lots.length; q++) { rx0 = Math.min(rx0, lots[q][0]); rx1 = Math.max(rx1, lots[q][1]); }
      if (rx1 > REAL_X0 && rx0 < REAL_X1) {
        m.v.length = mark[0]; m.n.length = mark[1]; m.c.length = mark[2]; m.m.length = mark[3];
        m.i.length = mark[4]; lots.length = mark[5];
      }
    }
  }

  // ---- 2026-09-17 (tmp-tr47): valley floor behind the Pier Approach ---------
  // The ribbon stops 26 m behind its crest. With the valley open, that edge is
  // seen from the water, and the Pavilion, the Lower Gardens kiosks and the town
  // blocks up the valley had nothing under them. Real ground (EA DSM, building
  // table ground column): 5-6 m at the mouth, 2-3 m in the Lower Gardens, 11-18 m
  // at the Square 450-550 m inland. One strip per 5 m lattice column from the
  // ribbon's BUILT plateau row back to Z -600; never below the plateau minus 1 m,
  // so it meets the cliff plateau east of X 110 without a step; behind Z -150
  // it also rises 0.04 m per m east of X 60 (the Bath Road hill). Kept LOW on
  // purpose: a skirt that climbed to the Square's real 11-18 m read as a dark
  // wall from the neck (ev/zoom_owner_neck_a.jpg); the town blocks standing
  // on it are dropped to their real DSM ground instead (buried 6 m).
  if (VALLEY_ON) {
    const SKZ = [-150, -300, -450, -600], SKY = [6.0, 7.0, 8.5, 10.0];
    const PV = (x, z, y) => m.pushC(x + OX, y, z + OZ, 0, 1, 0, C.cliffTop, MAT.PAINTED);
    const colPts = (x) => {
      const fp = facePro[Math.round((x - X0) / STEP)], [pz, py] = fp[fp.length - 1];
      return [[pz, py], ...SKZ.map((z, j) => [z, Math.max(SKY[j] + (j ? Math.max(0, x - 60) * 0.04 : 0), py - 1)])];
    };
    // 2026-09-17 (tmp-tr54): THE DARK BAND. PV's normal is a hard (0,1,0), but
    // the strip rises landward (6 -> 13.6 m) and the coast shader lights both
    // sides: it flips N when dot(N, V) < 0 (craft.js COAST_FRAG). From the neck
    // (eye 7.2 m) every fragment above eye height failed that test with the
    // fake normal, so it rendered ambient-only (47,53,50) while the same
    // colour on the plateau beside it reads olive. The strip now takes its
    // own geometric normals (smoothNormals from skStart, below); positions
    // are unchanged.
    const skStart = m.vertexCount;
    for (let x = -45; x < 150; x += STEP) {
      const A = colPts(x), B = colPts(x + STEP);
      for (let j = 0; j < SKZ.length; j++) {
        m.quad(PV(x, A[j][0], A[j][1]), PV(x + STEP, B[j][0], B[j][1]),
          PV(x + STEP, B[j + 1][0], B[j + 1][1]), PV(x, A[j + 1][0], A[j + 1][1]));
      }
    }
    m.smoothNormals(skStart);
  }

  // ---- the real East Cliff buildings (CLIFF_REAL, tmp-tr39 2026-09-17) -----
  // Replaces the random stock between REAL_X0 and REAL_X1 (the stock loop above
  // cuts its own runs out of that band). One row of REAL_BLD per massing box:
  //   [x, z, hu, hv, ang (mrad), groundY, h, roof, rh, col, building]
  // x/z  centre in coast coordinates, hu/hv half-extents along/across the box's
  //      own u axis, which is at angle ang from +X (towards +Z).
  // h    wall height above groundY (the eave on a pitched roof), rh ridge rise.
  // roof 0 flat, 1 gable ridge along u, 2 gable ridge along v, 3/4 hipped.
  // col  body*2 + (1 = clay roof): body 0 white 1 render 2 cream 3 brick 4 stone.
  // SOURCES. Footprints: OpenStreetMap (c) OpenStreetMap contributors, ODbL
  // (ref-cache/opendata/osm_eastcliff_buildings.json, shifted -0.5 E / +1.5 N m
  // onto the DSM). Heights and roof forms: EA LIDAR composite DSM 1 m, OGL
  // (ref-cache/opendata/eastcliff_dsm.tif): h = p90-95 of the DSM inside the
  // eroded footprint minus p10 of a 2-6 m ring outside it. Blocks over 600 m2 or
  // 34 m long are cut into <= 16 m slices along their long axis, each with its
  // own depth and height, and a slice whose heights are bimodal (>= 4.5 m apart)
  // becomes a podium box plus a narrower upper box: that is where the stepped
  // towers and wings come from. Small buildings take a gable or hip from the DSM
  // profile, or from OSM roof:shape where the DSM is ambiguous. Tables, residuals
  // and the per-building list: tmp-tr39/RESULT.md; generator tmp-tr39/build_table.py
  // and emit.py.
  // PLACEMENT IS CREST-RELATIVE, NOT RIGID. BNG -> coast is fitted on the two
  // pier anchors (tmp-tr39 stage 1) and holds to 2 m there, but the real shore
  // between the piers is a BAY: the real cliff toe runs 50-70 m inland of this
  // file's straight promenade (Z -20) through X 300-1800, and the real crest sits
  // 50-80 m behind crestZExact. A rigid placement would bury the whole skyline
  // behind the modelled cliff. So each building keeps its real X and its real
  // setback from the real crest (and the local crest bearing), measured from
  // crestZExact here; promenade-level ones keep their offset from the real toe.
  // Both offsets taper to the rigid fit at the pier root (X 0-200).
  // COLOUR is the stock palette by building type, not the survey's sunlit readings
  // (trap 5; tmp-tr37/CLIFFTOP.md gives no overcast frame).
  // Every massing box as [x, z, hu, hv, cos, sin], so the planting below can
  // cull a crown or face mound whose footprint would reach inside a wall (the
  // promenade-level buildings by the pier stand on the modelled cliff face).
  // Empty when CLIFF_REAL is false, which leaves the planting untouched.
  const realRects = [];
  const realHit = (x, z, r) => {
    for (const [bx, bz, hu, hv, ca, sa] of realRects) {
      const dx = x - bx, dz = z - bz;
      if (Math.abs(dx * ca + dz * sa) < hu + r && Math.abs(-dx * sa + dz * ca) < hv + r) return true;
    }
    return false;
  };
  if (CLIFF_REAL) {
    const REAL_BLD = [
      -18.4,-550.8,7.1,5.2,998,10,12.6,0,0,2,0,
      -14.2,-500.7,6.1,2.3,-376,10.1,20.3,0,0,0,1,
      -11.6,-494.2,6.2,4.7,-376,10.1,10.8,0,0,0,2,
      -6.3,-531.8,5.5,3.5,-377,10.1,9.6,0,0,9,3,
      -8.2,-485.5,6.1,4.7,-376,10.1,6.2,0,0,2,4,
      -4.6,-472.5,7.6,4.1,-376,10.1,11.5,0,0,1,5,
      -5.6,-479,6.1,2.3,-376,10.1,4.9,0,0,0,6,
      -3.5,-526.6,6.2,2.4,-377,10.1,6.1,2,3.4,3,7,
      -0,-430.2,14.8,5.7,1075,10.1,8.7,0,0,2,8,
      -8.8,-40.5,6.9,15.1,-880,5,10.9,0,0,2,9,
      3.1,-48.6,6.9,18.9,-880,5,7.6,0,0,2,9,
      4.7,-47.3,6.9,13.2,-880,5,12.2,0,0,2,9,
      13.9,-57.7,6.9,16.7,-880,5,4.5,0,0,2,9,
      15.7,-56.2,6.9,12.4,-880,5,10.1,0,0,2,9,
      0,-517.4,7.1,6.2,1192,10.2,7.7,1,3.5,0,10,
      3.5,-508.5,6.2,2.4,-377,10.3,3.5,2,3.6,6,11,
      6.1,-500.6,6.2,4.7,-377,10.6,3.9,2,3.3,2,12,
      11.3,-486.9,6.2,4.7,-376,10.7,2.8,2,1.8,0,13,
      8.7,-494,6.2,2.3,-377,10.6,6.8,0,0,0,13,
      10.2,-530.8,11.3,6.4,894,10.7,14.6,0,0,1,14,
      10.2,-307.9,5.6,4.1,1115,7,9.2,0,0,6,15,
      15.3,-478.6,7.6,2.6,-377,11.3,10.2,0,0,3,16,
      21.4,-458.2,8.8,5.6,-488,11.7,17.7,0,0,0,17,
      29.1,-492.4,11.2,6.3,1212,12.1,13,0,0,1,18,
      26.6,-446.5,8.8,5.5,-485,12.2,17.1,0,0,8,19,
      31,-438,8.8,3.8,-485,10.7,19.1,0,0,2,20,
      23.3,-544.7,6.5,15.3,1051,12.3,27.7,0,0,0,21,
      29.3,-533.2,6.5,14.6,1051,12.3,24,0,0,0,21,
      28.8,-532.9,6.5,11.1,1051,12.3,29.6,0,0,0,21,
      34.8,-521.5,6.5,13.6,1051,12.3,28,0,0,0,21,
      37.1,-522.8,6.5,9.2,1051,12.3,32.1,0,0,0,21,
      41,-510.1,6.5,11.7,1051,12.3,27.9,0,0,0,21,
      44.5,-497.3,6.5,10.8,1051,12.3,23.9,0,0,0,21,
      41.8,-495.7,6.5,5.9,1051,12.3,29.4,0,0,0,21,
      32.9,-459.8,7.7,3.5,1066,12.4,18.1,0,0,0,22,
      35,-429,8.9,2.8,-484,12.5,17.1,0,0,4,23,
      38.5,-462.2,7.8,3.2,1065,12.9,17.7,0,0,2,24,
      37.5,-423.5,8.8,2.8,-485,13,15.4,0,0,1,25,
      40.2,-418.5,8.8,2.8,-484,13.1,15,0,0,0,26,
      44.2,-464.4,7.6,3.7,1034,13.4,17.5,0,0,1,27,
      48.3,-402.7,10.9,2.7,-412,13.7,8.5,0,0,4,28,
      46.4,-411.2,12.7,5.9,-412,13.8,14.3,0,0,3,29,
      46.1,-94.8,8.9,4.8,-63,7,3.8,0,0,0,30,
      46.9,-82.2,7,3.6,-228,7,5.3,0,0,0,31,
      50.1,-397.9,10.9,1.8,-412,13.9,9.5,0,0,4,32,
      50.1,-466.8,7.5,3.5,1017,13.9,17.2,0,0,0,33,
      53.7,-388.7,11,5.6,-446,14.1,13.2,0,0,0,34,
      53.6,-71.7,7,3.6,-720,6.6,4.8,0,0,0,35,
      55.8,-468.8,7.5,3.3,1017,14.2,11.8,2,4.4,3,36,
      60.1,-375.6,10.9,2.9,-485,14.2,8.8,2,7,2,37,
      59.7,-467.9,9.7,6.5,1017,14.6,9.6,1,6.1,1,38,
      62.8,-369.9,10.9,2.9,-485,14.4,12.8,0,0,0,39,
      67.4,-359.7,10.9,3.1,-485,14.2,13.6,0,0,5,40,
      69.4,-450.3,8.7,6.5,1017,14.4,10.3,1,5.9,2,41,
      72.6,-349.9,10.5,5.2,-484,14.2,10.7,2,3.3,0,42,
      71,-426.2,16.1,8.7,-485,14.2,19.1,0,0,0,43,
      62.5,-147.2,22.1,21.3,-1006,7.3,13.7,0,0,2,44,
      86.5,-184.4,22.1,17.8,-1006,7.3,16.9,0,0,2,44,
      86.3,-184.5,22.1,12.4,-1006,7.3,26,0,0,2,44,
      102.4,-209.3,7.4,20.9,-1006,7.3,18.2,0,0,2,44,
      77.1,-341.5,10,3.5,-484,14.2,14,0,0,2,45,
      80,-337.4,9.4,2.6,-703,14.3,14.5,0,0,0,46,
      71.7,-542.4,21.7,8.1,215,14.8,14.7,0,0,0,47,
      100.3,-537.9,7.2,7.1,215,14.8,14.9,0,0,0,47,
      84.5,-331.5,9.4,2.6,-703,14.4,12.8,0,0,4,48,
      87.8,-326.9,9.4,2.6,-703,14.6,13.1,0,0,3,49,
      76.7,-409,5.9,13.5,1094,15,6.8,0,0,0,50,
      74.4,-407.9,5.9,7.6,1094,15,11.7,0,0,0,50,
      86.6,-394.1,11.9,15.5,1094,15,6.5,0,0,0,50,
      82.7,-392.1,11.9,8.2,1094,15,11.6,0,0,0,50,
      104,-312.2,14.1,2.9,-803,17.8,14.5,0,0,1,51,
      88.1,-494.7,6.9,9.2,-77,16.6,18.2,0,0,4,52,
      88.2,-493.6,6.9,3.4,-77,16.6,46.4,0,0,4,52,
      101.9,-494.8,6.9,10.3,-77,16.6,10.8,0,0,4,52,
      101.9,-494.4,6.9,4.3,-77,16.6,19.1,0,0,4,52,
      115.3,-500.8,6.9,15.2,-77,16.6,10.2,0,0,4,52,
      115.7,-495.4,6.9,4.2,-77,16.6,19.2,0,0,4,52,
      129,-502.2,6.9,16.5,-77,16.6,10.5,0,0,4,52,
      129.3,-498.1,6.9,10.7,-77,16.6,16.3,0,0,4,52,
      108.3,-307.4,14.1,2.9,-803,18.3,10.8,2,4.8,3,53,
      102.2,-357.6,14.8,15.1,892,14.9,17,0,0,0,54,
      104.1,-330.7,7.4,26.8,892,14.9,12.1,0,0,0,54,
      113.9,-338.5,7.4,13.1,892,14.9,16.3,0,0,0,54,
      114.1,-319.7,7.4,27.5,892,14.9,9.2,0,0,0,54,
      114,-319.7,7.4,25.7,892,14.9,16.1,0,0,0,54,
      141.1,-313.1,14.8,13.4,892,14.9,17.5,0,0,0,54,
      114.6,-300.4,14.1,5.9,-803,18.6,10.8,2,4.9,0,55,
      119.8,-416.3,16.6,8.5,1065,17.4,18,0,0,4,56,
      121,-293.3,14.1,2.9,-803,18.8,10.5,2,5,2,57,
      125.2,-288.7,14.1,2.9,-803,19.8,8.3,2,5.3,0,58,
      97.5,-32.9,7.7,5.3,-72,3.5,7.3,0,0,0,59,
      128.2,-34.5,23.1,7.2,-72,3.5,7.9,0,0,0,59,
      158.9,-37.3,7.7,7.7,-72,3.5,11.6,0,0,0,59,
      129.4,-284,14.1,2.9,-803,17.2,12.1,2,4.9,5,60,
      134,-398.1,12.8,7.5,-552,18,11.6,0,0,2,61,
      147.2,-251.3,7.5,17.6,-890,15.2,19.5,0,0,1,62,
      165.4,-274.9,22.4,17,-890,21.1,23.5,0,0,1,62,
      168,-233.2,6.5,5.7,-944,21.9,21.1,0,0,0,63,
      179.6,-249,13,5.8,-944,21.9,25.5,0,0,0,63,
      178.9,-335.5,9.4,9.1,-827,21.9,13.6,0,0,7,64,
      178.9,-25.6,12.2,5.4,-77,3.5,8.8,0,0,2,65,
      180.4,-222.9,6.5,9.5,-930,22.6,14.2,0,0,0,66,
      180.5,-222.9,6.5,8.3,-930,22.6,20.5,0,0,0,66,
      188.3,-233.3,6.5,9.6,-930,22.6,20.3,0,0,0,66,
      187.4,-233.9,6.5,7.3,-930,22.6,24.2,0,0,0,66,
      196.1,-243.7,6.5,9.6,-930,22.6,24.2,0,0,0,66,
      199,-23.6,7.9,4,-77,3.5,7.3,0,0,0,67,
      199.6,-321.1,15.7,9.7,-872,22.9,18.3,0,0,4,68,
      200.5,-259.9,15.4,10,649,23,22.8,0,0,2,69,
      193.9,-216,5.8,7.3,666,19.4,28.3,0,0,0,70,
      193.9,-216,5.8,6,666,19.4,34.3,0,0,0,70,
      206.8,-213.8,5.8,13.6,666,19.4,34.5,0,0,0,70,
      215.6,-206.3,5.8,13.3,666,19.4,25.5,0,0,0,70,
      211.9,-201.6,5.8,6.2,666,19.4,34.1,0,0,0,70,
      212.4,-260.8,5.7,3.2,686,23.5,21.2,0,0,1,71,
      217.3,-296.9,11.5,10,699,23.5,14.6,0,0,2,72,
      219.4,-249.3,7.2,4.2,-878,23.8,13.5,0,0,5,73,
      227.3,-235.2,13.7,6.8,-866,24.1,15.3,0,0,0,74,
      220.7,-195.1,6.6,6.6,-947,24.8,25.5,0,0,1,75,
      228.6,-205.7,6.6,6.5,-947,24.8,22.4,0,0,1,75,
      235.5,-217,6.6,6.5,-947,24.8,8.6,0,0,1,75,
      235.9,-216.8,6.6,4.8,-947,24.8,20.7,0,0,1,75,
      243.7,-227.4,6.6,6.7,-947,24.8,23.7,0,0,1,75,
      234.6,-197,15.8,6.2,-924,25,15.9,0,0,4,76,
      238.1,-274.1,10.4,6.1,740,25.3,21.5,0,0,2,77,
      248.4,-234.2,6.6,3.5,696,25.7,7.8,0,0,2,78,
      251.4,-220,6.2,4.1,-868,26,16,0,0,0,79,
      240.4,-116.5,7.3,12.7,-611,27.5,4.6,0,0,0,80,
      240.2,-116.8,7.3,9.4,-611,27.5,13.5,0,0,0,80,
      256.7,-118.6,7.3,16.8,-611,27.5,4.6,0,0,0,80,
      253.5,-123.2,7.3,8.6,-611,27.5,12.8,0,0,0,80,
      272.4,-121.6,7.3,20.9,-611,27.5,4.6,0,0,0,80,
      267,-129.4,7.3,9,-611,27.5,13,0,0,0,80,
      290.8,-120.8,7.3,29.8,-611,27.5,12.8,0,0,0,80,
      298.3,-110.1,7.3,14.2,-611,27.5,19.4,0,0,0,80,
      304.3,-127.1,7.3,33.2,-611,27.5,12.7,0,0,0,80,
      307.5,-122.4,7.3,26.5,-611,27.5,19.2,0,0,0,80,
      316.3,-135.3,7.3,35.5,-611,27.5,11.3,0,0,0,80,
      319.6,-130.6,7.3,28.8,-611,27.5,22.5,0,0,0,80,
      328,-144,7.3,37.7,-611,27.5,10.7,0,0,0,80,
      333,-137,7.3,28.3,-611,27.5,21.5,0,0,0,80,
      323.6,-175.8,7.3,11.7,-611,27.5,8.7,0,0,0,80,
      323.1,-176.4,7.3,9.4,-611,27.5,14.9,0,0,0,80,
      267.9,-304.2,7.6,10.6,-610,27.6,19.9,0,0,2,81,
      280.4,-312.7,7.6,10.8,-610,27.6,9.9,0,0,2,81,
      280.4,-312.7,7.6,9.7,-610,27.6,19.4,0,0,2,81,
      305.4,-329.8,22.7,11.2,-610,27.6,20,0,0,2,81,
      318.9,-71.4,13.5,13.3,769,27.3,9,0,0,3,82,
      297.4,-257.1,7.5,11.4,-784,27.6,22.9,0,0,0,83,
      308,-267.6,7.5,11.4,-784,27.6,10.4,0,0,0,83,
      307.9,-267.7,7.5,10.1,-784,27.6,22.1,0,0,0,83,
      323.8,-283.4,14.9,11.3,-784,27.6,23.6,0,0,0,83,
      339.7,-299.2,7.5,11.3,-784,27.6,12.2,0,0,0,83,
      339.4,-299.5,7.5,9.8,-784,27.6,22,0,0,0,83,
      350.2,-309.7,7.5,11.3,-784,27.6,22.9,0,0,0,83,
      359.5,-207.5,7.7,16.4,1211,27.1,24.7,0,0,1,84,
      359.2,-207.3,7.7,13.9,1211,27.1,36.1,0,0,1,84,
      365.1,-193.1,7.7,13.1,1211,27.1,36.1,0,0,1,84,
      370.5,-178.7,7.7,16.8,1211,27.1,36.1,0,0,1,84,
      362.5,-238.9,6.4,5.5,-607,27.2,14.5,0,0,2,85,
      376.5,-241.2,6.4,11.6,-607,27.2,15.2,0,0,2,85,
      387.7,-247.7,6.4,12.7,-607,27.2,7.8,0,0,2,85,
      387.9,-247.4,6.4,10.7,-607,27.2,14.5,0,0,2,85,
      361.8,-111.8,7.2,7.9,745,27.4,8.4,0,0,1,86,
      363.5,-113.6,7.2,4.4,745,27.4,19.9,0,0,1,86,
      370.4,-99.7,7.2,9.7,745,27.4,7.9,0,0,1,86,
      369.8,-99.1,7.2,8.1,745,27.4,13.8,0,0,1,86,
      380.8,-89.7,7.2,10.4,745,27.4,13.6,0,0,1,86,
      391.3,-79.8,7.2,10.1,745,27.4,8.7,0,0,1,86,
      390.5,-78.9,7.2,6.7,745,27.4,14,0,0,1,86,
      403.2,-71.3,7.2,7.8,745,27.4,8.8,0,0,1,86,
      415.9,-63.9,7.2,7,745,27.4,8.9,0,0,1,86,
      398.6,-266.6,18.2,6.2,-627,27.7,3.8,0,0,0,87,
      399.1,-265.9,18.2,4.3,-627,27.7,9.3,0,0,0,87,
      397.4,-112.8,7.7,29.2,-954,27.9,4.8,0,0,0,88,
      394.5,-114.9,7.7,23.6,-954,27.9,16.2,0,0,0,88,
      405.3,-126.2,7.7,28,-954,27.9,7.2,0,0,0,88,
      402.7,-128,7.7,23.5,-954,27.9,16.3,0,0,0,88,
      413.1,-139.6,7.7,26.7,-954,27.9,7,0,0,0,88,
      411.5,-140.7,7.7,23.3,-954,27.9,15.5,0,0,0,88,
      420.9,-152.9,7.7,25.5,-954,27.9,7,0,0,0,88,
      424.8,-206.2,12.5,8.4,-811,28.4,10.6,3,4.6,2,89,
      444.1,-102.3,7.1,10.3,-1278,28.6,11.3,0,0,2,90,
      447.2,-116.1,7.1,9.2,-1278,28.6,5.7,0,0,2,90,
      444.7,-131.6,7.1,2.3,-1278,28.6,3.8,0,0,2,90,
      458,-235,7.6,5,619,28.8,6.7,0,0,0,91,
      469.5,-171.2,16.2,3.8,-242,28.9,6,1,2.1,0,92,
      475.5,-132.3,7.7,11.8,-64,29.7,29.4,0,0,2,93,
      490.6,-139.3,7.7,5.8,-64,29.7,29.4,0,0,2,93,
      506.4,-133.8,7.7,12.1,-64,29.7,29.4,0,0,2,93,
      510,-194.3,4.3,3.4,362,30.1,6.7,3,1.9,2,94,
      532.5,-231.4,6.2,12.1,-1219,30,4.8,0,0,1,95,
      534.1,-230.8,6.2,8.9,-1219,30,13.9,0,0,1,95,
      535.4,-243.6,6.2,10.5,-1219,30,11.1,0,0,1,95,
      539.6,-255.2,6.2,10.5,-1219,30,4,0,0,1,95,
      539.4,-255.3,6.2,7.8,-1219,30,11.1,0,0,1,95,
      551.6,-313.3,7.1,11.4,-1552,29.8,9.4,0,0,0,96,
      551.2,-313.3,7.1,9.7,-1552,29.8,32,0,0,0,96,
      551.5,-327.4,7.1,10,-1552,29.8,30.4,0,0,0,96,
      533.3,-129.7,6.6,11.6,169,29.8,5.3,0,0,3,97,
      533,-128,6.6,7.7,169,29.8,12.2,0,0,3,97,
      547.1,-132.7,6.6,17,169,29.8,5.6,0,0,3,97,
      547.1,-132.5,6.6,14.2,169,29.8,12.8,0,0,3,97,
      560.2,-131,6.6,17.6,169,29.8,12.8,0,0,3,97,
      579,-170,7.2,4.7,122,30,6.8,3,2.6,2,98,
      585.4,-222.5,7.5,13.5,-1401,30.1,3.1,0,0,1,99,
      585.1,-222.6,7.5,10.9,-1401,30.1,13.6,0,0,1,99,
      593.2,-236.5,7.5,8.2,-1401,30.1,3.8,0,0,1,99,
      592.2,-236.6,7.5,5.8,-1401,30.1,12.9,0,0,1,99,
      597.1,-158.6,7.5,5.3,153,30.3,6.3,3,2.9,0,100,
      606.8,-114.6,10.3,5.3,88,30.6,5.6,3,1.9,6,101,
      615,-155.3,7.3,5.3,61,31,6.7,3,2.9,2,102,
      637.3,-138.7,7.6,19.1,-52,32,19.8,0,0,0,103,
      652.5,-137,7.6,17.7,-52,32,22.2,0,0,0,103,
      666.8,-153.8,7.6,6.7,-52,32,19.3,0,0,0,103,
      681.8,-156.6,7.6,4.4,-52,32,22.1,0,0,0,103,
      697,-155.2,7.6,6.2,-52,32,19.3,0,0,0,103,
      720.4,-141.9,15.1,18.7,-52,32,20.9,0,0,0,103,
      691.7,-251,6.7,6.7,1511,31.9,4.2,0,0,0,104,
      692.4,-251,6.7,4.3,1511,31.9,9.5,0,0,0,104,
      687.6,-237.4,6.7,16,1511,31.9,6.5,0,0,0,104,
      693.3,-237.7,6.7,4.6,1511,31.9,9.5,0,0,0,104,
      685.3,-217.2,13.3,19.5,1511,31.9,3.7,0,0,0,104,
      682.3,-217.1,13.3,14.3,1511,31.9,9.7,0,0,0,104,
      681.7,-197,6.7,6.7,1511,31.9,4.2,0,0,0,104,
      690.7,-73.6,5.2,2.5,50,31.6,8.8,0,0,6,105,
      719.9,-249.3,6.5,15.4,1537,31.9,4.1,0,0,3,106,
      711.7,-249,6.5,5.8,1537,31.9,9.5,0,0,3,106,
      721,-229.8,13,15.8,1537,31.9,6.7,0,0,3,106,
      723.4,-229.9,13,12,1537,31.9,18.1,0,0,3,106,
      721.5,-210.3,6.5,15.8,1537,31.9,3.1,0,0,3,106,
      724.7,-210.4,6.5,11.4,1537,31.9,18.5,0,0,3,106,
      720.1,-197.2,6.5,14,1537,31.9,3.9,0,0,3,106,
      712.6,-314.9,6.5,12.8,-13,31.9,6.2,0,0,0,107,
      712.7,-313,6.5,9.5,-13,31.9,17.4,0,0,0,107,
      725.7,-315,6.5,11.5,-13,31.9,17.4,0,0,0,107,
      738.7,-319.5,6.5,16.7,-13,31.9,17.4,0,0,0,107,
      807.2,-236.5,13.6,15.2,1556,32.6,6.9,0,0,1,108,
      803.9,-236.4,13.6,8.1,1556,32.6,17.8,0,0,1,108,
      807.3,-216,6.8,15.3,1556,32.6,6.2,0,0,1,108,
      805.7,-216,6.8,12.4,1556,32.6,20.5,0,0,1,108,
      807.5,-202.4,6.8,15.3,1556,32.6,6.3,0,0,1,108,
      807.1,-202.4,6.8,13.5,1556,32.6,18.2,0,0,1,108,
      807.7,-335.2,9.3,7.3,136,32.7,4.6,4,7,2,109,
      809,-163.7,6.5,6.4,1,32.7,6.1,4,2.3,3,110,
      797,-127.4,7,29,-8,33.3,12.5,0,0,0,111,
      797.1,-109.4,7,7,-8,33.3,19.3,0,0,0,111,
      811,-115,7,21.9,-8,33.3,11.2,0,0,0,111,
      811.1,-112.8,7,9.3,-8,33.3,19.3,0,0,0,111,
      825,-114,7,21.4,-8,33.3,7.5,0,0,0,111,
      825.1,-109.5,7,6.5,-8,33.3,19.3,0,0,0,111,
      839.1,-111,7,18.2,-8,33.3,8,0,0,0,111,
      839.1,-111.2,7,8,-8,33.3,19.3,0,0,0,111,
      853.1,-110.9,7,17.9,-8,33.3,5.2,0,0,0,111,
      853.1,-109.2,7,10.9,-8,33.3,14.1,0,0,0,111,
      874.1,-108.7,14,6.3,-8,33.3,24.9,0,0,0,111,
      839.6,-218,15.6,19.8,216,32.7,5,0,0,0,112,
      839.8,-219.1,15.6,17.2,216,32.7,10.5,0,0,0,112,
      862.5,-213.4,7.8,19.4,216,32.7,4.2,0,0,0,112,
      861.5,-208.8,7.8,9.6,216,32.7,10.5,0,0,0,112,
      877.6,-209.2,7.8,15.8,216,32.7,4.1,0,0,0,112,
      876.4,-203.5,7.8,6.9,216,32.7,14.1,0,0,0,112,
      892.7,-205.2,7.8,18.5,216,32.7,7.2,0,0,0,112,
      891.9,-201.6,7.8,9.8,216,32.7,13.8,0,0,0,112,
      908.2,-203,7.8,17.6,216,32.7,3.9,0,0,0,112,
      906.4,-194.7,7.8,5.5,216,32.7,14.3,0,0,0,112,
      920.6,-93,7.1,18.1,-1564,33.1,4.9,0,0,4,113,
      923.6,-93,7.1,12.7,-1564,33.1,16.7,0,0,4,113,
      919.9,-107.2,7.1,17.6,-1564,33.1,4.6,0,0,4,113,
      922,-107.2,7.1,11,-1564,33.1,16.4,0,0,4,113,
      915,-121.5,7.1,12.6,-1564,33.1,4.9,0,0,4,113,
      918.7,-121.5,7.1,7.2,-1564,33.1,13.2,0,0,4,113,
      923.7,-135.6,7.1,4.2,-1564,33.1,9.4,0,0,4,113,
      915.8,-149.9,7.1,12,-1564,33.1,6.2,0,0,4,113,
      918.8,-200,8,4.5,-1537,33,8.3,3,2.5,2,114,
      939.4,-208.1,8.9,7.9,-1429,32.6,6,3,4.3,0,115,
      949.5,-240.4,12.9,6.6,-1505,32.9,5.9,3,3.7,0,116,
      961.4,-107.4,14.3,14,-1534,33.2,20.4,0,0,5,117,
      967.3,-202.3,6.8,4.3,205,33.2,3.7,1,2.5,2,118,
      969.1,-149.2,8.6,7.1,1,33.2,9.3,0,0,1,119,
      994,-199.8,13.4,4.5,196,32.6,3.7,1,2.5,0,120,
      1000.4,-105.8,11.3,6.3,-46,32.6,13.6,0,0,9,121,
      1005.6,-150.5,7.5,6.3,-9,32.7,7,3,3.4,2,122,
      1013.6,-246.4,9.5,4.5,66,33.1,7.4,1,2.5,0,123,
      1027.3,-199,11.2,7.4,132,33.9,5.9,3,4.1,0,124,
      1038,-110.5,15,11.8,90,34.3,23.6,0,0,4,125,
      1039.2,-251,10.2,3.8,-1569,34.3,7.5,3,2.3,4,126,
      1058.8,-152.9,7.6,3.5,1567,34.5,6.3,1,2,0,127,
      1066.3,-204.1,16,11.2,-5,34.6,4.9,1,5,1,128,
      1070.1,-155.9,6.4,6,4,34.6,2.8,3,4.3,8,129,
      1088.4,-134.3,6.7,19.6,1508,35.5,3.9,0,0,3,130,
      1086.8,-134.2,6.7,16.5,1508,35.5,17,0,0,3,130,
      1089.3,-120.8,6.7,19.6,1508,35.5,6.9,0,0,3,130,
      1087.5,-120.7,6.7,16.5,1508,35.5,18.3,0,0,3,130,
      1090.2,-107.4,6.7,19.7,1508,35.5,4.3,0,0,3,130,
      1088.4,-107.3,6.7,15.8,1508,35.5,15.9,0,0,3,130,
      1097.1,-205,7.5,6.5,-1565,36,6,0,0,2,131,
      1118.3,-203.8,6.3,6.9,31,36,12.1,0,0,1,132,
      1130.9,-203.3,6.3,6.8,31,36,3.5,0,0,1,132,
      1130.8,-203.1,6.3,5.4,31,36,12.1,0,0,1,132,
      1143.4,-202.9,6.3,6.7,31,36,12,0,0,1,132,
      1134.6,-154.7,8,9.1,1483,36,4.6,0,0,0,133,
      1135.3,-154.7,8,6.8,1483,36,14.7,0,0,0,133,
      1132.8,-138.5,8,12.4,1483,36,5.3,0,0,0,133,
      1135.6,-138.8,8,5.2,1483,36,15.2,0,0,0,133,
      1131.6,-122.5,8,14.9,1483,36,19.6,0,0,0,133,
      1133,-106.6,8,12.1,1483,36,11.3,0,0,0,133,
      1131.3,-257.1,12,8.6,-34,36,12.1,1,4.7,2,134,
      1154.6,-158.8,6.2,5.4,-114,35.4,3.8,3,3,2,135,
      1163.8,-125.6,13.7,12.2,-138,35.1,8.3,1,7,0,136,
      1163.3,-200,6.9,4.8,29,35.1,6,3,3.3,0,137,
      1188.9,-210.4,10.1,5.5,12,34.3,9.3,0,0,4,138,
      1199.8,-247.8,6,3.1,-1534,33.9,5.4,0,0,3,139,
      1194.7,-260,6,8.7,-1534,33.9,7.8,0,0,3,139,
      1195.2,-272,6,8.6,-1534,33.9,5.7,0,0,3,139,
      1195.2,-272,6,7.3,-1534,33.9,10.2,0,0,3,139,
      1187,-168,6.8,5.2,1485,33.8,8.9,0,0,0,140,
      1197.9,-155.3,6.8,16.6,1485,33.8,6.6,0,0,0,140,
      1197.4,-155.3,6.8,13.5,1485,33.8,15.8,0,0,0,140,
      1203.1,-142.1,6.8,20.6,1485,33.8,5,0,0,0,140,
      1205.1,-142.3,6.8,16.3,1485,33.8,14.1,0,0,0,140,
      1198.5,-128.1,6.8,15.1,1485,33.8,4.2,0,0,0,140,
      1213.1,-214.6,9.1,7.8,17,33.8,7,0,0,1,141,
      1224,-170.3,5.9,5.6,1521,34,10.9,1,3.1,4,142,
      1246,-214.1,10.4,6.4,59,33.9,21.2,0,0,3,143,
      1249.2,-273.7,10,4.5,75,33.9,11.9,3,2.5,0,144,
      1255.6,-150.6,14.5,12.2,1485,34,3.2,2,7,0,145,
      1260.2,-172.9,5.7,5.1,1460,34,6.2,0,0,4,146,
      1274.2,-175.7,5.5,5.1,1448,34,3.3,3,2.8,2,147,
      1282,-354.2,13.3,8.8,-976,34,24.7,0,0,0,148,
      1298.5,-244.5,5.4,12.4,1460,34.1,4.4,0,0,0,149,
      1299.4,-244.6,5.4,4.2,1460,34.1,10.5,0,0,0,149,
      1299.5,-233.7,5.4,12.9,1460,34.1,5,0,0,0,149,
      1296.4,-233.4,5.4,8.8,1460,34.1,10.5,0,0,0,149,
      1296.1,-222.4,5.4,13.6,1460,34.1,4.7,0,0,0,149,
      1294.2,-222.2,5.4,10,1460,34.1,12.5,0,0,0,149,
      1280.3,-154.2,7.5,9.1,-121,34.1,6.4,0,0,4,150,
      1280.3,-154.8,7.5,4.2,-121,34.1,15.7,0,0,4,150,
      1295.1,-157.3,7.5,10.4,-121,34.1,6.3,0,0,4,150,
      1294.9,-159.4,7.5,7.1,-121,34.1,18.5,0,0,4,150,
      1310.4,-156.2,7.5,12.6,-121,34.1,6.4,0,0,4,150,
      1309.9,-160.3,7.5,5.2,-121,34.1,15.6,0,0,4,150,
      1317.3,-331.5,13.1,8.7,-1046,34.4,24.6,0,0,2,151,
      1356.4,-195.5,14.6,7.7,1508,34.1,11.8,0,0,1,152,
      1354.1,-154.2,7.4,7.2,1462,33.4,21.2,0,0,0,153,
      1365.5,-140.5,7.4,16.6,1462,33.4,24.8,0,0,0,153,
      1368.8,-125.9,7.4,7.8,1462,33.4,22.5,0,0,0,153,
      1380.1,-196.6,16.7,6.7,1497,33.4,8.2,1,3.7,7,154,
      1402.4,-212.4,13,3.1,-82,34.2,6,1,1.7,2,155,
      1412.2,-155.4,14.8,11.1,-91,33.9,23.1,1,5,1,156,
      1455.2,-176.3,12.5,11.6,1412,32,35.4,0,0,0,157,
      1474.8,-296.7,16.2,4.8,-20,31.8,17.1,0,0,4,158,
      1520.1,-304.6,14.2,11.5,76,33.5,9.3,3,5,2,159,
      1494.4,-162.7,7.1,15.3,27,33.5,51,0,0,0,160,
      1494.4,-163.4,7.1,4.1,27,33.5,59.1,0,0,0,160,
      1508.6,-161.7,7.1,9.3,27,33.5,53.8,0,0,0,160,
      1508.6,-162.9,7.1,6,27,33.5,59,0,0,0,160,
      1522.7,-161.9,7.1,5.9,27,33.5,54,0,0,0,160,
      1536.9,-162.4,7.1,10.1,27,33.5,53.8,0,0,0,160,
      1536.9,-162.3,7.1,5.6,27,33.5,58.9,0,0,0,160,
      1551.1,-161.5,7.1,15.6,27,33.5,57,0,0,0,160,
      1556.8,-213.9,12.1,3.9,1511,33.4,5.9,1,2.2,0,161,
      1578.7,-190.6,7.3,13.5,6,32.1,16.1,0,0,4,162,
      1593.4,-190.6,7.3,13.5,6,32.1,6.4,0,0,4,162,
      1593.4,-190.6,7.3,12,6,32.1,16.4,0,0,4,162,
      1608.1,-190.2,7.3,13.4,6,32.1,5.7,0,0,4,162,
      1608.1,-187.9,7.3,9,6,32.1,13.4,0,0,4,162,
      1591,-290.7,7.8,17.7,-1485,31.9,3.6,0,0,3,163,
      1589.1,-290.9,7.8,12.9,-1485,31.9,12.3,0,0,3,163,
      1592.9,-314.2,15.7,17.6,-1485,31.9,3.7,0,0,3,163,
      1587.5,-314.6,15.7,9.9,-1485,31.9,13.3,0,0,3,163,
      1600.1,-222.4,9.8,8.8,-14,31.7,7.9,3,4.8,0,164,
      1620,-224.9,8.6,5.8,21,31.4,3.8,3,3.2,1,165,
      1658.1,-217.6,11.2,7.2,-1542,32.4,4.2,3,4,6,166,
      1660.6,-294.3,5.8,9.8,125,33.5,32.1,0,0,3,167,
      1672,-292.5,5.8,9.9,125,33.5,29.2,0,0,3,167,
      1672.2,-294,5.8,7,125,33.5,36.3,0,0,3,167,
      1683.4,-291.2,5.8,9.7,125,33.5,32.1,0,0,3,167,
      1682.8,-150.3,7.1,12.5,-1535,33.9,18.3,0,0,0,168,
      1682.6,-150.3,7.1,9.2,-1535,33.9,29.4,0,0,0,168,
      1683.2,-164.5,7.1,12.3,-1535,33.9,30.1,0,0,0,168,
      1683.7,-178.6,7.1,16.4,-1535,33.9,30,0,0,0,168,
      1693.5,-220.5,5.6,4.7,-13,34,6.2,3,2.6,0,169,
      1735.9,-221.8,6.8,9.6,1382,35.2,8.8,0,0,4,170,
      1735.8,-208,6.8,12.1,1382,35.2,8.4,0,0,4,170,
      1728.3,-192.8,6.8,20.1,1382,35.2,6.1,0,0,4,170,
      1725.1,-192.2,6.8,15.1,1382,35.2,13.4,0,0,4,170,
      1731.5,-179.6,6.8,21.3,1382,35.2,14.4,0,0,4,170,
      1734.2,-166.4,6.8,20.3,1382,35.2,3.5,0,0,4,170,
      1733.7,-166.3,6.8,18.1,1382,35.2,12.2,0,0,4,170,
      1768.3,-193.3,10.4,5.3,-325,35.6,14,0,0,2,171,
      1784.4,-322.1,7.1,12.2,1422,35.4,22.4,0,0,0,172,
      1786.8,-308,7.1,10.1,1422,35.4,19.6,0,0,0,172,
      1787.5,-308.1,7.1,8,1422,35.4,22.4,0,0,0,172,
      1816.2,-188.8,6.8,18.4,-1108,34,33.3,0,0,0,173,
      1821.7,-201.3,6.8,16.9,-1108,34,33.4,0,0,0,173,
      1837.5,-208.7,6.8,9,-1108,34,33.3,0,0,0,173,
      1880.4,-220.1,14.6,5.4,-257,32.7,18.8,0,0,5,174,
      1948,-264.7,13.4,6.8,1326,32.5,33.1,0,0,2,175,
      1951.6,-244.9,6.7,7.7,1326,32.5,33.1,0,0,2,175,
      1954.3,-224.8,13.4,9.1,1326,32.5,33,0,0,2,175,
      1957,-204.7,6.7,6.9,1326,32.5,33.1,0,0,2,175,
      1989.6,-286.5,6.1,7.6,-776,32.3,28.3,0,0,1,176,
      1996.3,-297,6.1,10.2,-776,32.3,8,0,0,1,176,
      1997.1,-296.1,6.1,7.9,-776,32.3,27,0,0,1,176,
      2003,-307.5,6.1,7.3,-776,32.3,28.2,0,0,1,176,
      1997.4,-255.1,5.7,8.5,792,32.3,10,0,0,0,177,
      1996.8,-254.5,5.7,6.7,792,32.3,28.5,0,0,0,177,
      2003.2,-244.9,5.7,11.4,792,32.3,9.3,0,0,0,177,
      2002.7,-244.4,5.7,8.6,792,32.3,27.6,0,0,0,177,
      2009.4,-235.1,5.7,8.9,792,32.3,28.4,0,0,0,177,
      2016.1,-200.6,16.6,10.9,720,32,23.5,3,5,5,178,
      2052.5,-279.2,29.8,10.1,583,30.6,27.2,0,0,2,179,
      2130.1,-26.4,13.5,4,77,3.5,3.8,0,0,2,180,
      2156.9,-22.9,13.5,2.9,77,3.5,3.9,0,0,2,180,
      2171.5,-285,5.9,7.3,1270,29.7,8.8,0,0,0,181,
      2172.9,-285.4,5.9,4.7,1270,29.7,16,0,0,0,181,
      2175.1,-273.8,5.9,7.1,1270,29.7,7.2,0,0,0,181,
      2175.2,-273.8,5.9,5.6,1270,29.7,15.1,0,0,0,181,
      2178.6,-262.5,5.9,6.9,1270,29.7,12,0,0,0,181,
      2178.3,-262.4,5.9,5.4,1270,29.7,16.7,0,0,0,181,
      2175.5,-303.9,10.9,7.3,-277,29.7,10,4,7,0,182,
      2176.9,-242.8,8,7.7,1049,29.7,10.3,3,4.2,4,183,
      2182,-335,9.5,6.2,1275,29.6,11.2,3,3.4,2,184,
      2183.1,-225.7,8.9,6.2,-521,29.6,15.1,3,3.4,1,185,
      2179.2,-200.6,7.8,21.9,457,27.8,6,0,0,0,186,
      2180.1,-202.5,7.8,18.5,457,27.8,9.3,0,0,0,186,
      2189.4,-186,7.8,20.4,457,27.8,6.8,0,0,0,186,
      2190.9,-189.1,7.8,13.8,457,27.8,19.6,0,0,0,186,
      2207.5,-187.4,7.8,21.2,457,27.8,11.3,0,0,0,186,
      2209.8,-192.1,7.8,14.5,457,27.8,21.3,0,0,0,186,
      2224.3,-186.4,7.8,15.3,457,27.8,10.3,0,0,0,186,
      2227.4,-192.7,7.8,7.2,457,27.8,23.8,0,0,0,186,
      2241.5,-186.1,7.8,8.7,457,27.8,19.9,0,0,0,186,
      2219.2,-283.8,9.2,5.9,1377,27.2,8.4,3,3.2,5,187,
      2224.5,-313.3,13.8,8.1,-154,27.3,13.5,0,0,2,188,
      2223.7,-262,10.7,13.6,-407,27.3,15.2,0,0,1,189,
      2240.7,-263.1,5.3,5.4,-407,27.3,14.6,0,0,1,189,
      2252.1,-241.4,9.5,6.3,-1526,27.4,8.4,3,3.5,0,190,
      2255.2,-125.8,8.1,3.5,-1204,27.3,10.4,1,1.9,4,191,
      2261.7,-125.1,8.1,3.5,-1174,27.3,11.1,1,1.9,2,192,
      2252.5,-324,7.1,3.5,243,27.3,3.1,0,0,0,193,
      2252.5,-324.1,7.1,2.4,243,27.3,12,0,0,0,193,
      2263.7,-309.9,7.1,14.2,243,27.3,12,0,0,0,193,
      2279.9,-316.2,7.1,4.3,243,27.3,14.6,0,0,0,193,
      2293.7,-312.4,7.1,4.6,243,27.3,11.6,0,0,0,193,
      2268.3,-123.9,8.1,3.5,-1192,27.3,10.8,1,1.9,0,194,
      2273.7,-155.6,6.7,3.9,83,27.3,3.1,1,2.1,4,195,
      2276.7,-193.1,11.3,5.9,89,27.3,11.3,3,3.3,2,196,
      2274.7,-22.3,7.6,3.2,-17,3.5,6.4,0,0,0,197,
      2275,-122.8,8.4,3.4,-1150,27.2,11,1,1.9,1,198,
      2277.9,-242.3,9.7,8.5,162,27.2,8.1,3,4.7,4,199,
      2281,-120.2,8.3,3.3,-1117,27.2,10.6,1,1.8,3,200,
      2287.3,-118.9,9.1,3.3,-1125,27,11.3,1,1.8,0,201,
      2293.4,-115.2,8.3,3.2,-1165,26.9,10.2,1,1.8,1,202,
      2296.3,-161.8,12.1,11.2,-1431,26.8,5.4,3,5,6,203,
      2300,-110.9,9,3.5,-1283,26.7,11.2,1,1.9,2,204,
      2306.4,-96.3,8.6,3.3,-1376,26.5,11,1,1.8,0,205,
      2313.4,-171.5,11.2,5.4,-160,26.4,9,0,0,0,206,
      2312.8,-81.4,9.4,3.5,-1501,26.3,11.3,1,1.9,6,207,
      2316.2,-220.5,14.8,16.8,-1395,26.2,16.8,0,0,2,208,
      2329.9,-240.7,7.4,7,-1395,26.2,17.5,0,0,2,208,
      2326.4,-263.9,14.8,14.3,-1395,26.2,18.2,0,0,2,208,
      2319.4,-70,8.9,3.5,1527,25.9,11.5,1,1.9,1,209,
      2325.8,-70,9.6,3.4,1387,25.6,11.2,1,1.9,0,210,
      2330.3,-118.8,15.5,11.1,-262,25.8,10.9,0,0,7,211,
      2332.8,-64.8,9,3.4,1314,25,10.9,1,1.9,2,212,
      2339.5,-62,9.3,3.3,1285,24.3,10.8,1,1.8,1,213,
      2346.7,-140.8,8,5.4,-468,25.3,5.6,0,0,0,214,
      2346.4,-62.6,9,3.7,1248,24.1,10.4,1,2,6,215,
      2351.9,-65.7,9,3,1114,24.3,9.6,1,1.7,2,216,
      2356.5,-187.8,6.9,4.6,-1003,25,7.4,3,2.5,0,217,
      2359.2,-123.5,11.4,8.1,-666,24.9,6.2,1,6.2,0,218,
      2357.8,-75.9,9.1,3.8,1042,24.7,10,1,2.1,6,219,
      2365,-86.9,8.9,3.3,948,24.6,9.4,1,1.8,3,220,
      2365.2,-189.5,5.3,4.3,-1130,24.6,4.2,4,5,0,221,
      2371.3,-185.2,5,4.8,322,24.4,7.2,3,2.7,1,222,
      2370.4,-98.3,8.8,3.5,794,24.4,11.3,1,2,8,223,
      2362.9,-358.7,7.1,8.5,1245,24.4,17.1,0,0,3,224,
      2377.2,-341.2,14.1,16.5,1245,24.4,17.6,0,0,3,224,
      2379.8,-110.8,6.7,5.8,686,24.2,9.4,1,3.2,0,225,
      2383.6,-187.6,7.3,2.9,232,24.1,8.7,3,1.6,0,226,
      2387.9,-307.5,5.8,6.8,870,24.1,19.2,0,0,4,227,
      2391,-295,5.8,13.9,870,24.1,21.6,0,0,4,227,
      2394.2,-282.5,5.8,7.2,870,24.1,19.2,0,0,4,227,
      2392,-139.9,7.4,7.2,-1494,24.1,10.9,0,0,4,228,
      2392.4,-187.5,5,3.8,-1366,24.1,8.9,3,2.1,0,229,
      2380.7,-30,7.9,13.4,112,3.5,7.4,0,0,0,230,
      2404.4,-28.4,15.8,12.2,112,3.5,7.9,0,0,0,230,
      2427.5,-21.2,7.9,7.6,112,3.5,8,0,0,0,230,
      2401,-160.3,7.3,6.3,-6,24,6.6,3,4,9,231,
      2409.3,-180.5,5.7,4.9,117,24,11.8,0,0,4,232,
      2414.2,-190.5,5.7,4.6,144,23.9,8.9,0,0,3,233,
    ];
    const BODY = [PAL.white, PAL.render, PAL.cream, PAL.brick, PAL.stone];
    const RS = 11;
    const V = (x, y, z, nx, ny, nz, c) => m.pushC(x + OX, y, z + OZ, nx, ny, nz, c, MAT.CONCRETE);
    // quad on a vertical face, A -> B left to right seen from outside
    const wallQ = (ax, az, bx, bz, y0, y1, nx, nz, c) => m.quad(
      V(ax, y0, az, nx, 0, nz, c), V(bx, y0, bz, nx, 0, nz, c),
      V(bx, y1, bz, nx, 0, nz, c), V(ax, y1, az, nx, 0, nz, c));
    // pitched roof with its ridge along the local u axis (ca, sa); hip = hipped ends
    const roofU = (x, z, ca, sa, hu, hv, yE, yR, hip, rc, gc) => {
      const P = (u, v) => [x + u * ca - v * sa, z + u * sa + v * ca];
      const h = yR - yE, r = hip ? Math.max(0, hu - hv) : hu;
      const l = Math.hypot(h, hv) || 1, ny = hv / l, nh = h / l;
      const a = P(-hu, hv), b = P(hu, hv), c = P(hu, -hv), d = P(-hu, -hv), R0 = P(-r, 0), R1 = P(r, 0);
      m.quad(V(a[0], yE, a[1], -sa * nh, ny, ca * nh, rc), V(b[0], yE, b[1], -sa * nh, ny, ca * nh, rc),
        V(R1[0], yR, R1[1], -sa * nh, ny, ca * nh, rc), V(R0[0], yR, R0[1], -sa * nh, ny, ca * nh, rc));
      m.quad(V(c[0], yE, c[1], sa * nh, ny, -ca * nh, rc), V(d[0], yE, d[1], sa * nh, ny, -ca * nh, rc),
        V(R0[0], yR, R0[1], sa * nh, ny, -ca * nh, rc), V(R1[0], yR, R1[1], sa * nh, ny, -ca * nh, rc));
      const run = hu - r, le = Math.hypot(h, run) || 1;
      const ex = hip ? h / le : 1, ey = hip ? run / le : 0, ec = hip ? rc : gc;
      m.tri(V(d[0], yE, d[1], -ca * ex, ey, -sa * ex, ec), V(a[0], yE, a[1], -ca * ex, ey, -sa * ex, ec),
        V(R0[0], yR, R0[1], -ca * ex, ey, -sa * ex, ec));
      m.tri(V(b[0], yE, b[1], ca * ex, ey, sa * ex, ec), V(c[0], yE, c[1], ca * ex, ey, sa * ex, ec),
        V(R1[0], yR, R1[1], ca * ex, ey, sa * ex, ec));
    };
    const HR_FORM = true;   // tmp-tr54, see the k 59 block below
    // >>> DECALTIER  first index of the clifftop building block; the permutation
    // at the end of it reorders ONLY [bldI0, here), so nothing after it shifts.
    const bldI0 = m.i.length;
    // <<< DECALTIER
    let bk = -1, bx0 = Infinity, bx1 = -Infinity, bzf = -Infinity, bsill = 0;
    const flushLot = () => { if (bk >= 0) lots.push([bx0, bx1, bzf, bsill]); };
    for (let q = 0; q < REAL_BLD.length; q += RS) {
      const [x, z, hu, hv, angM, gy, h, roof, rh, col, k] = REAL_BLD.slice(q, q + RS);
      if (k !== bk) { flushLot(); bk = k; bx0 = Infinity; bx1 = -Infinity; bzf = -Infinity; bsill = gy + 0.8; }
      const ang = angM / 1000, ca = Math.cos(ang), sa = Math.sin(ang);
      const body = BODY[col >> 1], rc = (col & 1) ? PAL.roofRed : PAL.roof;
      const P = (u, v) => [x + u * ca - v * sa, z + u * sa + v * ca];
      const low = gy < 4;                     // on the promenade: buried less, all floors seen
      const y0 = gy - (low ? 1.5 : 6), yT = gy + h;
      // four walls (+v, -v, +u, -u) and, when flat, the roof; no underside
      const F = [[P(-hu, hv), P(hu, hv), -sa, ca, 2 * hu], [P(hu, -hv), P(-hu, -hv), sa, -ca, 2 * hu],
        [P(hu, hv), P(hu, -hv), ca, sa, 2 * hv], [P(-hu, -hv), P(-hu, hv), -ca, -sa, 2 * hv]];
      for (const [A, B, nx, nz] of F) wallQ(A[0], A[1], B[0], B[1], y0, yT, nx, nz, body);
      if (roof === 0) {
        const a = P(-hu, hv), b = P(hu, hv), c = P(hu, -hv), d = P(-hu, -hv);
        m.quad(V(a[0], yT, a[1], 0, 1, 0, body), V(b[0], yT, b[1], 0, 1, 0, body),
          V(c[0], yT, c[1], 0, 1, 0, body), V(d[0], yT, d[1], 0, 1, 0, body));
      } else if (roof === 1 || roof === 3) {
        roofU(x, z, ca, sa, hu, hv, yT, yT + rh, roof === 3, rc, body);
      } else {
        roofU(x, z, -sa, ca, hv, hu, yT, yT + rh, roof === 4, rc, body);
      }
      realRects.push([x, z, hu, hv, ca, sa]);
      for (const [px, pz] of [P(-hu, hv), P(hu, hv), P(hu, -hv), P(-hu, -hv)]) {
        bx0 = Math.min(bx0, px); bx1 = Math.max(bx1, px); bzf = Math.max(bzf, pz);
      }
      // Sea-facing fenestration: the face whose normal is most seaward, as the
      // stock does it (one quad per opening, 0.06 m proud, PAL.band), and only
      // on floors that can clear the crest for an eye at sea level 300 m out.
      let best = null;
      for (const f of F) if (!best || f[3] > best[3]) best = f;
      // 2026-09-17 (tmp-tr54): HARRY RAMSDEN'S (w126832413, k 59) takes its real
      // FORM. Owner video 878240841034373 t9.4 from the pier neck, pose-matched
      // (tmp-tr54/pose4.py, cams_matched.json): the long white building on the
      // promenade at the left of that frame projects onto THIS row (x 89-167),
      // not onto w93127302, which is out of frame. Sunlit frame, so form only
      // (trap 5): a ground-floor arcade of round-headed openings on the west
      // part (frame x 0-115 -> coast x < 112), bays 3.1 m as measured off the frame, shopfront openings east of it,
      // and a row of windows along the whole upper storey (a second row where
      // the DSM slice is tall enough). Stock colours: body PAL.white, openings
      // PAL.band. 0.10 m proud (0.06 m flickers at the sea cameras). Premier Inn
      // (k 70) rows: ground 23.4 -> 19.4, the real DSM ground (tmp-tr47 stage 1).
      if (HR_FORM && k === 59 && best[3] >= 0.45) {
        const [A, B, nx, nz, w] = best;
        const tx = (B[0] - A[0]) / w, tz = (B[1] - A[1]) / w, ox = nx * 0.10, oz = nz * 0.10;
        m.setProud(0.10);                                  // >>> DECALTIER
        const at = (s, y) => V(A[0] + tx * s + ox, y, A[1] + tz * s + oz, nx, 0, nz, PAL.band);
        const pane = (s0, s1, ya, yb) => m.quad(at(s0, ya), at(s1, ya), at(s1, yb), at(s0, yb));
        const nb = Math.max(1, Math.round((w - 0.8) / 3.1)), bay = (w - 0.8) / nb;
        const rows = h >= 10 ? 2 : (h >= 6.5 ? 1 : 0);
        for (let j = 0; j < nb; j++) {
          const sc = 0.4 + bay * (j + 0.5);
          if (A[0] + tx * sc < 112) {
            const r = bay * 0.34, ys = gy + 2.1;
            pane(sc - r, sc + r, gy + 0.05, ys);
            for (let i = 0; i < 6; i++) {
              const a0 = Math.PI * i / 6, a1 = Math.PI * (i + 1) / 6;
              m.tri(at(sc, ys), at(sc + r * Math.cos(a0), ys + r * Math.sin(a0)),
                at(sc + r * Math.cos(a1), ys + r * Math.sin(a1)));
            }
          } else {
            pane(sc - bay * 0.33, sc + bay * 0.33, gy + 0.5, gy + 2.9);
          }
          for (let f = 0; f < rows; f++) {
            const sy = gy + 4.0 + f * 3.4;
            pane(sc - 0.6, sc + 0.6, sy, sy + 2.1);
          }
        }
        m.setProud(0);                                     // <<< DECALTIER
        continue;
      }
      if (best[3] < 0.45 || h < 4) continue;
      const [A, B, nx, nz, w] = best;
      const cy = crestYExact(x), cz = crestZExact(x);
      const zf = (A[1] + B[1]) * 0.5;
      const sight = (low || zf > cz) ? -Infinity : cy + Math.max(0, cz - zf) * (cy - 2) / (300 - cz) - 2;
      const nf = Math.max(1, Math.floor((h - 0.6) / FLOOR));
      const nw = Math.floor((w - 1.2) / 3.1);
      if (nw < 1) continue;
      const tx = (B[0] - A[0]) / w, tz = (B[1] - A[1]) / w, ox = nx * 0.06, oz = nz * 0.06;
      const pitch = (w - 1.2) / nw, grp = w >= 14 ? 4 : 1;
      m.setProud(0.06);                                    // >>> DECALTIER
      for (let f = 0; f < nf; f++) {
        const sy = gy + f * FLOOR + 0.8;
        if (sy + 1.9 < sight) continue;
        for (let j = 0; j < nw; j += grp) {
          const n = Math.min(grp, nw - j);
          const s0 = 0.6 + pitch * j + (grp > 1 ? 0.4 : pitch * 0.5 - 0.7);
          const s1 = grp > 1 ? 0.6 + pitch * (j + n) - 0.4 : s0 + 1.4;
          wallQ(A[0] + tx * s0 + ox, A[1] + tz * s0 + oz, A[0] + tx * s1 + ox, A[1] + tz * s1 + oz,
            sy, sy + 1.9, nx, nz, PAL.band);
        }
      }
      m.setProud(0);                                       // <<< DECALTIER
    }
    // >>> FACADES
    buildClifftopFacades(m, REAL_BLD, RS, PAL, MAT, OX, OZ, FLOOR, crestYExact, crestZExact);
    // <<< FACADES
    // >>> CLIFFROOF
    buildClifftopRoofs(m, REAL_BLD, RS, PAL, MAT, OX, OZ, FLOOR, crestYExact, crestZExact, C, treeMix);
    // <<< CLIFFROOF
    // >>> DECALTIER
    // Every decal on these buildings has now been emitted and tagged. Sort the
    // block's triangles into one contiguous run per tier so the renderer can
    // draw each tier with its own depth bias in a handful of draw calls rather
    // than one per building per face.
    m.setProud(0);
    m.permuteDecalTiers(bldI0, m.i.length);
    // <<< DECALTIER
    flushLot();
  }

  // ---- clifftop planting: garden trees in front of the skyline, face scrub ---
  // Open item 3's remainder (2026-09-16). Entrance camera, judged box
  // 700,140-884,215, edge density (mean-L step > 10, tmp-tr2/measure.py) split
  // by row band BEFORE this block:
  //     rows 140-155  21.0%   sky and roofline
  //     rows 155-185  44.2%   the fenestrated walls - already near the photo
  //     rows 185-200  21.8%   lower storeys and the crest
  //     rows 200-215   5.5%   the cliff face t 0.3-1.0: a smooth painted slope
  // Photograph 763's box by 20-row band: 37.8 / 51.2 / 58.2 / 54.7%, and its
  // sunlit slope scrub alone 48.7%. The walls are not what is short; the bottom
  // 40% of the box is, and in 763 that band is shrub and tree canopy on the
  // slope and planting in front of the buildings. G:/DJI 0004 @ 48 s (OVERCAST -
  // form only, no colour taken from it) shows the same arrangement from the
  // cliff path: evergreen crowns and gorse standing across the lower storeys.
  //
  // MEASURED AFTER, all 8 measure.py gates PASS, +4,891 triangles:
  //     box edge 27.69 -> 29.33%   bands 21.0 / 42.9 / 24.5 / 14.3
  //     box colour sd 51.5/56.3/64.7 -> 52.6/56.6/65.3
  //     vegetation (rows 35-55%, G-(R+B)/2 > 6)  entrance 13.10 -> 15.82%,
  //     along-neck 10.53 -> 13.34%, approach 3.70 -> 5.02%, head 0.25 -> 0.25%
  // THAT IS +1.6 POINTS AGAINST A 23-POINT GAP, AND IT IS THE CEILING OF THIS
  // BUDGET, NOT OF THE IDEA. The planting's own pixels measure 24.9% edge where
  // 763's scrub measures 48.7%: at 2.7 px/m a 22-triangle crown has facets of
  // ~9 px, and the photograph's mottle is leaf clusters at 2-3 px. Doubling the
  // face mounds (+7,690 triangles in all) reached only 29.55%. See RESULT.md in
  // tmp-tr6/cliff for the negative results on the way here.
  //
  // BUDGET BY WHERE THE PLAYER LOOKS. treeMix() already says the West Cliff and
  // the pier gardens are wooded and the Southbourne end is scrub; planting rides
  // treeMix() CUBED and stops where that falls below 0.72 (mounds, x < ~290)
  // and 0.60 (trees, x < ~390). Every judged water camera sees x -300..130 and
  // the spawn view little east of 400, so nothing is spent on the 2.3 km that
  // only the far field sees at 300 m and more.
  //
  // Placement fields are fbm2/snoise, i.e. COHERENT - beds, stands and
  // clearings. Per-object size, jitter and a +-0.1 ragged edge on a coherent
  // threshold are white noise, AND so, effectively, are the per-vertex litness
  // and ring radius: they sample snoise 0.77-0.91 lattice units apart, so
  // neighbouring vertices are nearly independent (verifier, 2026-09-16). An
  // earlier line here claimed otherwise. Measured harmless at judged range -
  // edge density 29.42 with it removed against 29.33 with it.
  function buildClifftopPlanting() {
    const NROW = facePro[0].length;          // 16: 5 beach/prom, 1 toe, 9 face, 1 plateau
    const S_CREST = NROW - 2, S_PLAT = NROW - 1;
    // The BUILT surface at coast x, row coordinate s (float; s = 5 + 9t on the
    // face). Past the plateau row the last segment is extended, which is the
    // ribbon's own PLATEAU_SLOPE.
    const surf = (x, s) => {
      const fx = clamp((x - X0) / STEP, 0, facePro.length - 1.0001);
      const i = Math.floor(fx), u = fx - i;
      const si = clamp(Math.floor(s), 5, NROW - 2), v = s - si;
      const at = (Q) => [Q[si][0] + (Q[si + 1][0] - Q[si][0]) * v,
        Q[si][1] + (Q[si + 1][1] - Q[si][1]) * v];
      const a = at(facePro[i]), b = at(facePro[i + 1]);
      return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
    };
    // Most seaward building front over [x0, x1], or -Infinity in a gap.
    const frontAt = (x0, x1) => {
      let f = -Infinity;
      for (const L of lots) if (L[1] > x0 && L[0] < x1 && L[2] > f) f = L[2];
      return f;
    };
    // FACETED, NOT SMOOTH. Every triangle gets its own three vertices and its
    // own facet normal. A smooth-shaded crown rendered as a flat dark cut-out
    // (measured: rows 185-200 of the judged box fell 21.8 -> 17.1% edge where
    // crowns covered the lower storeys); canopy at 2.7 px/m reads by its lit
    // and shaded leaf masses, and a facet is that mass.
    // SUN-DISC GUARD, and why the normal must be CONSTANT across a facet. The
    // coast shader's ambient samples skyColor(normalize(N + 0.4 up)), whose sun
    // disc is x30 within 2.3 deg of the sun. With radial normals 5 pixels of the
    // entrance frame rendered (221,210,57); with a per-vertex guard on a
    // facet+radial blend, 15 still did, because the INTERPOLATED normal swept
    // through the disc between guarded vertices. With one normal per facet the
    // guard is exact: a facet whose ambient sample lands within 6 deg of the sun
    // (renderer.js:57, read-only here) is turned away in azimuth.
    const SUN = [-0.35 / 1.0003, 0.72 / 1.0003, 0.60 / 1.0003];
    const safeN = (nx, ny, nz) => {
      let l = Math.hypot(nx, ny, nz) || 1;
      nx /= l; ny /= l; nz /= l;
      const ax = nx, ay = ny + 0.4, az = nz, al = Math.hypot(ax, ay, az) || 1;
      if ((ax * SUN[0] + ay * SUN[1] + az * SUN[2]) / al > 0.9945) {
        nx += 0.25; nz -= 0.12;
        l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
      }
      return [nx, ny, nz];
    };
    // v = [x, y, z, litness 0..1]. The COLOUR is chosen per facet from its
    // own sun exposure: N.L 0.40 -> 0.85 ramps shade key -> lit key, and each
    // vertex's litness shifts that by +-0.45, so a lit facet still carries a
    // gradient - with +-0.2 every sun-facing facet was one flat bright triangle
    // and the face mounds read as tents.
    // This is the canopy's self-shadow - the interior leaf mass that faces
    // away from the sun is in shade - which the shadow map cannot supply here:
    // it covers 140 m round the camera and the judged clifftop is 140-180 m
    // out. With colour from noise alone the crowns measured as dark flat
    // shapes (rows 185-200: 16.6% edge against 21.8% on the bare walls).
    // 2026-09-16 (tmp-tr18): PLANT_SMOOTH. Those facet normals made every crown
    // a boulder and every 5-triangle mound a shard at 2x and closer (close views
    // tmp-tr18/before/S_zslope.png, S_zwin.png, S_zneck.png). With PLANT_SMOOTH
    // each corner takes a normal radial from its object's centre (ctr), so the
    // shading AND the colour ramp run on across facets. The sun-disc guard stays
    // exact: every interpolated normal lies in the SPHERICAL TRIANGLE of its
    // corner normals, so that whole triangle is tested against NSTAR, the one
    // normal whose ambient sample normalize(N + 0.4 up) is the sun, and against
    // -NSTAR, which the shader's flip toward the camera can turn into it. A
    // triangle within 6 deg keeps the guarded facet normal; its colour still
    // comes from the smooth normals, so no colour seam. The earlier smooth
    // attempts (flat dark cut-outs) took colour from noise, not from N.L.
    const PLANT_SMOOTH = true;
    const PLANT_SEAMS = true;
    const lamS = 0.4 * SUN[1] + Math.sqrt(0.16 * SUN[1] * SUN[1] + 0.84);
    const unit = (x, y, z) => { const l = Math.hypot(x, y, z) || 1; return [x / l, y / l, z / l]; };
    const NSTAR = unit(lamS * SUN[0], lamS * SUN[1] - 0.4, lamS * SUN[2]);
    const NSTAR_NEG = [-NSTAR[0], -NSTAR[1], -NSTAR[2]];
    const d3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const x3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const COS_G = Math.cos(6 * Math.PI / 180), SIN_G = Math.sin(6 * Math.PI / 180);
    const nearP = (P, a, b, c) => {
      if (d3(P, a) > COS_G || d3(P, b) > COS_G || d3(P, c) > COS_G) return true;
      const s0 = d3(P, x3(a, b)), s1 = d3(P, x3(b, c)), s2 = d3(P, x3(c, a));
      if (d3(P, [a[0] + b[0] + c[0], a[1] + b[1] + c[1], a[2] + b[2] + c[2]]) > 0 &&
        ((s0 >= 0 && s1 >= 0 && s2 >= 0) || (s0 <= 0 && s1 <= 0 && s2 <= 0))) return true;
      for (const [u, v] of [[a, b], [b, c], [c, a]]) {
        const g = x3(u, v), gl = Math.hypot(g[0], g[1], g[2]);
        if (gl < 1e-9) continue;
        const pd = d3(P, g) / gl;
        if (Math.abs(pd) >= SIN_G) continue;
        const q = [P[0] - g[0] / gl * pd, P[1] - g[1] / gl * pd, P[2] - g[2] / gl * pd];
        if (d3(x3(u, q), g) >= 0 && d3(x3(q, v), g) >= 0) return true;
      }
      return false;
    };
    const ftri = (A, B, Cc, cShade, cLit, ctr) => {
      const e1x = B[0] - A[0], e1y = B[1] - A[1], e1z = B[2] - A[2];
      const e2x = Cc[0] - A[0], e2y = Cc[1] - A[1], e2z = Cc[2] - A[2];
      const [nx, ny, nz] = safeN(e1y * e2z - e1z * e2y, e1z * e2x - e1x * e2z,
        e1x * e2y - e1y * e2x);
      if (PLANT_SMOOTH && ctr) {
        const nOf = typeof ctr === 'function' ? ctr : (Q) => unit(Q[0] - ctr[0], Q[1] - ctr[1], Q[2] - ctr[2]);
        const nA = nOf(A), nB = nOf(B), nC = nOf(Cc);
        const flat = nearP(NSTAR, nA, nB, nC) || nearP(NSTAR_NEG, nA, nB, nC);
        // 2026-09-17 (tmp-tr28): PLANT_SEAMS. A guarded triangle fell back to
        // its FACET normal, up to ~50 deg off its smooth neighbours - 780 of
        // 4,517 planting triangles (17%), each a hard-edged facet. It now takes
        // the guarded MEAN of its corner normals: still one constant normal, so
        // the sun-disc guard stays exact, but within the corner spread.
        const fN = PLANT_SEAMS ? safeN(nA[0] + nB[0] + nC[0], nA[1] + nB[1] + nC[1], nA[2] + nB[2] + nC[2]) : [nx, ny, nz];
        const S = (Q, n) => m.pushC(Q[0] + OX, Q[1], Q[2] + OZ,
          flat ? fN[0] : n[0], flat ? fN[1] : n[1], flat ? fN[2] : n[2],
          mix3(cShade, cLit, clamp((d3(n, SUN) - 0.40) / 0.45 + (Q[3] - 0.5) * 0.9, 0, 1)), MAT.PAINTED);
        m.tri(S(A, nA), S(B, nB), S(Cc, nC));
        return;
      }
      const ndl = nx * SUN[0] + ny * SUN[1] + nz * SUN[2];
      const V = (Q) => m.pushC(Q[0] + OX, Q[1], Q[2] + OZ, nx, ny, nz,
        mix3(cShade, cLit, clamp((ndl - 0.40) / 0.45 + (Q[3] - 0.5) * 0.9, 0, 1)), MAT.PAINTED);
      m.tri(V(A), V(B), V(Cc));
    };
    const TAU = Math.PI * 2;

    // 2026-09-17 (tmp-tr30): PLANT_ROUND. At the close views a crown's outline
    // was its 6-lobe shoulder hexagon and every face mound a 5-facet tent with
    // a point (tmp-tr28 zcrown, zmound). Under PLANT_ROUND a crown's shoulder
    // ring is 12 (even = today's lobes, odd between them, bulged to the arc but
    // never past the larger neighbour), its top ring 6 (same rule), with a hex
    // cap: 40 tris, not 22. A mound becomes 7 feet on a smooth oval under a
    // 2-vertex ridge (see mound): 9 tris, not 5. Every new crown vertex
    // stays inside the envelope WINDOW_CLEAR caps against (top <= 0.9 h, <= 0.32 W;
    // shoulder <= 0.59 h, <= 0.61 W). false = the geometry below, unchanged.
    const PLANT_ROUND = true;
    // 2026-09-17 (tmp-tr32): PLANT_CLUMPS. Photo 763's clifftop scrub is lit
    // yellow-green clumps 4-11 px across (entrance scale) split by near-black
    // shadow pockets; the model's canopy was one smooth crown per tree and one
    // evenly toned mound per station (entrance box rows 196-215: 9-11% edge).
    // Under PLANT_CLUMPS a crown is a darker, lower under-crown carrying two lit
    // sub-crowns on its seaward side, each with its own centre (its own
    // terminator) and tone; every sub-crown vertex is clamped into the
    // WINDOW_CLEAR envelope of its parent. A face mound gets a shaded skirt
    // (feet litness x0.4: the pocket under a clump), a per-mound tone jitter
    // (neighbours no longer share one 9 m tone field) and, on ~28% of stations,
    // a half-size satellite clump beside it. Colours are mixes of the keys
    // already here. false = the PLANT_ROUND geometry, unchanged.
    const PLANT_CLUMPS = false;   // built and verified 2026-09-17 (tmp-tr32): +5,799 tris / +17,397 verts for a close-up-only gain - owner shipped it OFF
    // Closed ring-to-ring strip by angle (merge walk): lo.length + hi.length
    // triangles, wound as the crown's own bands. aLo/aHi carry one extra
    // entry, the first angle + TAU.
    const band = (lo, aLo, hi, aHi, cShade, cLit, ctr) => {
      const n = lo.length, mm = hi.length;
      for (let i = 0, j = 0; i < n || j < mm;) {
        if (j >= mm || (i < n && aLo[i + 1] <= aHi[j + 1])) {
          ftri(lo[(i + 1) % n], lo[i], hi[j % mm], cShade, cLit, ctr); i++;
        } else {
          ftri(lo[i % n], hi[j], hi[(j + 1) % mm], cShade, cLit, ctr); j++;
        }
      }
    };
    // Between two ring vertices P, Q (radii rP, rQ, angular step da): bulged to
    // the arc through their mean radius, capped at the larger of the two, at
    // the LOWER of their heights. At the mean height the filled notch between
    // two lobes hid 8-9 more window px at entrance / along-neck 1x (tmp-tr30).
    const midV = (cx, cz, a, P, rP, Q, rQ, da, lit) => {
      const rr = Math.min(Math.max(rP, rQ), 0.5 * (rP + rQ) / Math.cos(da / 2));
      return [cx + Math.cos(a) * rr, Math.min(P[1], Q[1]), cz + Math.sin(a) * rr, lit];
    };
    const crownRound = (cx, gy, cz, r, h, ph, cLit, cShade, env, baseK) => {
      const ctr = [cx, gy + 0.45 * h, cz];
      const base = [], aB = [], sh = [], aS = [], rS = [], up = [], aU = [], rU = [];
      for (let k = 0; k < 6; k++) {
        const a = ph + k * TAU / 6, b = a + Math.PI / 6;
        base.push([cx + Math.cos(a) * r * (baseK || 0.75), gy - 0.5, cz + Math.sin(a) * r * (baseK || 0.75), 0.0]);
        aB.push(a);
        const rr = r * (0.78 + 0.44 * snoise(cx * 0.37 + k * 1.37, cz * 0.37 + 3.3));
        const yy = gy + h * (0.50 + 0.18 * (snoise(cx * 0.53 + k * 2.11, cz * 0.53 + 7.9) - 0.5));
        const lit = snoise(cx * 0.9 + k * 0.77, cz * 0.9 + 2.2);
        sh[2 * k] = [cx + Math.cos(b) * rr, yy, cz + Math.sin(b) * rr, lit];
        aS[2 * k] = b; rS[2 * k] = rr;
      }
      for (let k = 0; k < 6; k++) {
        const i = 2 * k + 1, P = sh[2 * k], Q = sh[(2 * k + 2) % 12];
        aS[i] = aS[2 * k] + Math.PI / 6;
        sh[i] = midV(cx, cz, aS[i], P, rS[2 * k], Q, rS[(2 * k + 2) % 12], Math.PI / 3, 0.5 * (P[3] + Q[3]));
      }
      for (let k = 0; k < 3; k++) {
        const a = ph + 0.4 + k * TAU / 3;
        const rr = r * (0.42 + 0.22 * snoise(cx * 0.41 + k * 3.1, cz * 0.41 + 9.7));
        up[2 * k] = [cx + Math.cos(a) * rr, gy + h * (0.80 + 0.2 * (snoise(cx + k * 1.9, cz) - 0.5)),
          cz + Math.sin(a) * rr, 0.85];
        aU[2 * k] = a; rU[2 * k] = rr;
      }
      for (let k = 0; k < 3; k++) {
        const i = 2 * k + 1, P = up[2 * k], Q = up[(2 * k + 2) % 6];
        aU[i] = aU[2 * k] + Math.PI / 3;
        up[i] = midV(cx, cz, aU[i], P, rU[2 * k], Q, rU[(2 * k + 2) % 6], 2 * Math.PI / 3, 0.85);
      }
      if (env) {
        // PLANT_CLUMPS sub-crown: stay inside the parent's WINDOW_CLEAR envelope
        // (seaward <= 0.61 W and laterally <= 0.62 W of the parent centre; above
        // 0.59 h only within 0.32 W seaward; never above 0.9 h). W = 2 env.r.
        for (const v of [...base, ...sh, ...up]) {
          v[0] = clamp(v[0], env[0] - 1.24 * env[3], env[0] + 1.24 * env[3]);
          v[2] = Math.min(v[2], env[2] + 1.22 * env[3]);
          const ya = v[2] - env[2] > 0.64 * env[3] ? 0.59 : 0.9;
          v[1] = Math.min(v[1], env[1] + ya * env[4]);
        }
      }
      aB.push(aB[0] + TAU); aS.push(aS[0] + TAU); aU.push(aU[0] + TAU);
      band(base, aB, sh, aS, cShade, cLit, ctr);          // 18
      band(sh, aS, up, aU, cShade, cLit, ctr);            // 18
      for (let q = 1; q < 5; q++) ftri(up[q + 1], up[q], up[0], cShade, cLit, ctr);   // 4
    };

    // Crown: buried 6-ring, lobed 6-ring shoulder at ~0.5 h, 3-ring at ~0.82 h,
    // one cap. 22 triangles, wound outward (the shadow pass culls FRONT), no
    // underside - the crest hides the foot from every sea camera.
    const crown = (cx, gy, cz, r, h, ph, cLit, cShade) => {
      if (realRects.length && realHit(cx, cz, r)) return;   // CLIFF_REAL: not inside a wall
      if (PLANT_ROUND && PLANT_CLUMPS) {
        // Under-crown: 0.86 r, 0.80 h, lit key pulled 45% toward shade.
        crownRound(cx, gy, cz, r * 0.86, h * 0.80, ph, mix3(cLit, cShade, 0.45), cShade);
        // Two lit sub-crowns either side of seaward (+z), 0.40 r out, r 0.55, h 0.62.
        const env = [cx, gy, cz, r, h];
        for (let k = 0; k < 2; k++) {
          const j = snoise(cx * 1.7 + k * 2.3, cz * 1.7 + 5.1);
          const a = Math.PI / 2 + (k ? 1 : -1) * (0.9 + 0.5 * (j - 0.5));
          const sx = cx + Math.cos(a) * 0.40 * r, sz = cz + Math.sin(a) * 0.40 * r;
          crownRound(sx, gy + 0.22 * h, sz, 0.55 * r, 0.62 * h, ph + 1.1 + k * 2.2,
            mix3(mix3(cLit, C.cliffGrassDry, 0.45 * (1 - j)), cShade, 0.2 * j), cShade, env, 0.45);
        }
        return;
      }
      if (PLANT_ROUND) { crownRound(cx, gy, cz, r, h, ph, cLit, cShade); return; }
      const base = [], sh = [], up = [];
      const ctr = [cx, gy + 0.45 * h, cz];
      for (let k = 0; k < 6; k++) {
        const a = ph + k * TAU / 6, b = a + Math.PI / 6;
        base.push([cx + Math.cos(a) * r * 0.75, gy - 0.5, cz + Math.sin(a) * r * 0.75, 0.0]);
        const rr = r * (0.78 + 0.44 * snoise(cx * 0.37 + k * 1.37, cz * 0.37 + 3.3));
        const yy = gy + h * (0.50 + 0.18 * (snoise(cx * 0.53 + k * 2.11, cz * 0.53 + 7.9) - 0.5));
        const lit = snoise(cx * 0.9 + k * 0.77, cz * 0.9 + 2.2);
        sh.push([cx + Math.cos(b) * rr, yy, cz + Math.sin(b) * rr, lit]);
      }
      for (let k = 0; k < 3; k++) {
        const a = ph + 0.4 + k * TAU / 3;
        const rr = r * (0.42 + 0.22 * snoise(cx * 0.41 + k * 3.1, cz * 0.41 + 9.7));
        up.push([cx + Math.cos(a) * rr, gy + h * (0.80 + 0.2 * (snoise(cx + k * 1.9, cz) - 0.5)),
          cz + Math.sin(a) * rr, 0.85]);
      }
      for (let k = 0; k < 6; k++) {
        const k1 = (k + 1) % 6;
        ftri(base[k1], base[k], sh[k], cShade, cLit, ctr);
        ftri(base[k1], sh[k], sh[k1], cShade, cLit, ctr);
      }
      // shoulder 6 -> upper 3: each upper vertex fans over two shoulder edges
      for (let q = 0; q < 3; q++) {
        const u0 = up[q], u1 = up[(q + 1) % 3];
        const s0 = sh[(2 * q) % 6], s1 = sh[(2 * q + 1) % 6], s2 = sh[(2 * q + 2) % 6];
        ftri(s1, s0, u0, cShade, cLit, ctr);
        ftri(s2, s1, u0, cShade, cLit, ctr);
        ftri(s2, u0, u1, cShade, cLit, ctr);
      }
      ftri(up[2], up[1], up[0], cShade, cLit, ctr);
    };

    // Scrub mound ON the face: 5-ring sampled on the built surface, sunk 0.25 m,
    // and an apex leaning uphill. 5 triangles.
    const mound = (x, s, r, h, ph, cLit, cShade) => {
      const [z0, y0] = surf(x, s);
      if (realRects.length && realHit(x, z0, r)) return;   // CLIFF_REAL: not inside a wall
      const dzds = (surf(x, s + 0.25)[0] - surf(x, s - 0.25)[0]) * 2;   // z per unit s, < 0
      const dyds = (surf(x, s + 0.25)[1] - surf(x, s - 0.25)[1]) * 2;
      const dydx = (surf(x + 1, s)[1] - surf(x - 1, s)[1]) * 0.5;
      const dzdx = (surf(x + 1, s)[0] - surf(x - 1, s)[0]) * 0.5;
      // Local face normal = d/dx x d/ds, turned to face up and out. The apex
      // stands along it, not straight up: on a 36 deg face a vertical apex of
      // shrub height sat BELOW its own uphill foot, so the uphill half of every
      // mound was inside the cliff.
      let nx = dydx * dzds - dzdx * dyds, ny = dzdx * 0 - 1 * dzds, nz = 1 * dyds - dydx * 0;
      if (ny < 0) { nx = -nx; ny = -ny; nz = -nz; }
      const nl = Math.hypot(nx, ny, nz) || 1;
      nx /= nl; ny /= nl; nz /= nl;
      const ctr0 = [x - nx * 0.9 * r, y0 - ny * 0.9 * r, z0 - nz * 0.9 * r];
      // 2026-09-17 (tmp-tr28): the radial normal of an UPHILL foot pointed ~50
      // deg up-slope from the face normal, i.e. away from every sea camera, and
      // craft.js flips a normal facing away (dot(N,V) < 0) - a hard light/dark
      // line across the mound's upper facets: the thin vertical seams. Under
      // PLANT_SEAMS a mound normal is kept within 32 deg of the local face normal.
      const ctr = !PLANT_SEAMS ? ctr0 : (Q) => {
        const q = unit(Q[0] - ctr0[0], Q[1] - ctr0[1], Q[2] - ctr0[2]);
        const c = q[0] * nx + q[1] * ny + q[2] * nz, CM = Math.cos(32 * Math.PI / 180);
        if (c >= CM) return q;
        const tx = q[0] - c * nx, ty = q[1] - c * ny, tz = q[2] - c * nz, tl = Math.hypot(tx, ty, tz) || 1;
        const SM = Math.sqrt(1 - CM * CM);
        return [nx * CM + tx / tl * SM, ny * CM + ty / tl * SM, nz * CM + tz / tl * SM];
      };
      const ring = [];
      for (let k = 0; k < 5; k++) {
        const a = ph + k * TAU / 5;
        const rr = r * (0.75 + 0.50 * snoise(x * 0.57 + k * 1.91, s * 1.3 + 5.5));
        const dx = Math.cos(a) * rr, dz = Math.sin(a) * rr;
        // Row coordinate of this foot. Clamped: where a gully makes the face
        // locally flat in z, dz / dzds explodes, and unclamped it sampled rows
        // far off the ribbon and stood 30-px spikes on the slope.
        // The foot takes BOTH its z and its y from the surface at (x + dx, sk).
        // Placing it at z0 + dz with only y sampled put 26% of mound facets
        // more than 0.3 m inside the face (probe, 3,395 facets): along x the
        // face's z wanders up to ~0.5 m per m with the gullies and the crest
        // line, so the sampled y belonged to a different point on the slope.
        const sk = clamp(s + (dzds < -0.3 ? dz / dzds : 0), s - 1.2, s + 1.2);
        const lit = snoise(x * 0.8 + k * 0.91, s * 2.1 + 4.4);
        // Capped at the crest row: one row past it is 26 m of plateau, and a
        // foot allowed onto it landed inside a building's buried base (probe:
        // 8 feet at x -183, z -45, in a lot fronting at z -38).
        const [fz, fy] = surf(x + dx, clamp(sk, 5.2, S_CREST));
        ring.push([x + dx, fy - 0.25, fz, lit]);
      }
      const tx = (snoise(x * 0.31, s * 0.9 + 6.6) - 0.5) * 0.6 * r;
      if (PLANT_ROUND) {
        // A sea camera sees a face mound nearly ALONG its normal, so its outline
        // is its FOOT RING, not its side profile (tmp-tr30 first try: a 3-ring
        // at 0.68 h over the same 5 feet left zslope's pentagons as they were).
        // So: 7 feet on a smooth oval (radius 1 + e cos 2(a - ph), e 0-0.18,
        // x 0.93-1.07 per foot, not today's independent 0.75-1.25 lobes), and
        // the apex becomes a 2-vertex RIDGE at 0.8 h along the long axis,
        // +-0.35 r(1 + e): a dome from the side. 7 + 2 = 9 tris. Feet as today;
        // a ridge end is kept 0.12 m above the face, sampled as the feet are.
        const e = 0.18 * snoise(x * 0.57, s * 1.3 + 5.5);
        const feet = [], aR = [], rid = [], aM = [];
        for (let k = 0; k < 7; k++) {
          const a = ph + k * TAU / 7;
          const rr = r * (1 + e * Math.cos(2 * (a - ph))) * (0.93 + 0.14 * snoise(x * 0.57 + k * 1.91, s * 1.3 + 5.5));
          const dx = Math.cos(a) * rr, dz = Math.sin(a) * rr;
          const sk = clamp(s + (dzds < -0.3 ? dz / dzds : 0), s - 1.2, s + 1.2);
          const [fz, fy] = surf(x + dx, clamp(sk, 5.2, S_CREST));
          const fl = snoise(x * 0.8 + k * 0.91, s * 2.1 + 4.4);
          feet.push([x + dx, fy - 0.25, fz, PLANT_CLUMPS ? 0.4 * fl : fl]);
          aR.push(a);
        }
        aR.push(aR[0] + TAU);
        const MH = 0.8 * h, L = 0.35 * r * (1 + e);
        const mx = x + nx * MH + tx * 0.8, my = y0 + ny * MH, mz = z0 + nz * MH;
        for (let k = 0; k < 2; k++) {
          const a = ph + k * Math.PI;
          const ux = Math.cos(a), uz = Math.sin(a), dn = ux * nx + uz * nz;
          const p = unit(ux - dn * nx, -dn * ny, uz - dn * nz);
          const v = [mx + p[0] * L, my + p[1] * L, mz + p[2] * L, 0.8];
          const sk = clamp(s + (dzds < -0.3 ? (v[2] - z0) / dzds : 0), s - 1.2, s + 1.2);
          const fy = surf(v[0], clamp(sk, 5.2, S_CREST))[1];
          if (v[1] < fy + 0.12) v[1] = fy + 0.12;
          rid.push(v); aM.push(a);
        }
        aM.push(aM[0] + TAU);
        band(feet, aR, rid, aM, cShade, cLit, ctr);          // 9
        return;
      }
      const top = [x + nx * h + tx, y0 + ny * h, z0 + nz * h, 0.8];
      for (let k = 0; k < 5; k++) ftri(ring[(k + 1) % 5], ring[k], top, cShade, cLit, ctr);
    };

    const plantMix = (x) => { const t = treeMix(x); return t * t * t; };

    // -- scrub mounds on the face, t 0.30-0.97 -----------------------------------
    // 3.4 m stations x 7 rows over s 7.7-13.3 (t 0.30-0.92): the rows the
    // judged box sees are t 0.3-1.0 (projected off the built ribbon at x 90,
    // 110, 130). r 1.5-2.7 m is 4-7 px at 2.7 px/m, the photograph's scrub
    // clump scale; h 0.30-0.50 r, because at 0.55 r they rendered as shards.
    const SCRUB_SP = 3.4;
    for (let j = Math.floor(X0 / SCRUB_SP); j * SCRUB_SP < X1; j++) {
      const x = (j + 0.5) * SCRUB_SP + (noise(j, 31.7) - 0.5) * SCRUB_SP * 0.8;
      if (x < X0 + 6 || x > X1 - 6) continue;
      const pm = plantMix(x);
      if (pm < 0.72) continue;
      for (let q = 0; q < 7; q++) {
        const id = j * 11 + q;
        const s = 7.7 + q * (6.0 / 7) + (noise(id, 17.3) - 0.3) * 0.7;
        const bed = fbm2(x * 0.045, s * 0.85 + 12.9);
        // Garden beds near the pier (bed field, ~22 m along x), blending to
        // the crest's own vegDensity - the gully field - where treeMix falls.
        const want = pm * (bed * 0.8 + 0.14) + (1 - pm) * (0.55 * bed + 0.45 * vegDensity(x)) * 0.8;
        if (want < 0.44 + 0.10 * noise(id, 23.9)) continue;
        const r = 2.1 * (0.7 + 0.6 * noise(id, 41.1));
        const h = r * (0.30 + 0.20 * noise(id, 43.3));
        const tone0 = snoise(x * 0.11, s * 0.7 + 3.1);
        const tone = PLANT_CLUMPS ? clamp(tone0 + (noise(id, 53.1) - 0.5) * 0.8, 0, 1) : tone0;
        mound(x, s, r, h, noise(id, 47.7) * TAU,
          mix3(C.cliffScrubDry, mix3(C.cliffScrub, C.cliffGrassDry, 0.5), 0.6 * (0.6 + 0.4 * tone)),
          mix3(C.cliffScrubDamp, C.cliffPine, tone));
        if (PLANT_CLUMPS && noise(id, 57.3) < 0.28) {
          // Satellite clump: half size, 0.9 r along the face, a shade darker.
          const side = noise(id, 59.9) < 0.5 ? -1 : 1, t2 = clamp(tone + 0.25, 0, 1);
          mound(x + side * 0.9 * r, s - 0.15, 0.5 * r, 0.55 * h, noise(id, 61.7) * TAU,
            mix3(C.cliffScrubDry, mix3(C.cliffScrub, C.cliffGrassDry, 0.5), 0.6 * (0.6 + 0.4 * t2)),
            mix3(C.cliffScrubDamp, C.cliffPine, t2));
        }
      }
    }

    // -- garden trees on the plateau, in front of the walls and in the gaps ------
    // One station per 7 m; stands from a ~50 m fbm2 cell so crowns come in
    // groups (the crest block's own lesson: a per-crown coin flip makes singles).
    const TREE_SP = 7.0;
    const WINDOW_CLEAR = true;
    for (let j = Math.floor(X0 / TREE_SP); j * TREE_SP < X1; j++) {
      const x = (j + 0.5) * TREE_SP + (noise(j, 61.3) - 0.5) * TREE_SP * 0.7;
      if (x < X0 + 8 || x > X1 - 8) continue;
      const stand = smoothstep5(clamp((fbm2(x * 0.019, 71.3) - 0.36) / 0.26, 0, 1));
      const G = plantMix(x) * stand;
      if (plantMix(x) < 0.60) continue;
      if (G < 0.20 + 0.20 * noise(j, 63.1)) continue;
      const W = (4.5 + 3.5 * G) * (0.85 + 0.30 * noise(j, 67.3));
      const zc = surf(x, S_CREST)[0];
      const front = frontAt(x - W * 0.62 - 0.5, x + W * 0.62 + 0.5);
      const gap = !Number.isFinite(front);
      const zMax = zc - 1.5;
      const zMin = gap ? zc - 28 : front + W * 0.62 + 0.5;
      if (zMin > zMax) continue;
      let z = zMax - noise(j, 69.7) * (zMax - zMin) * 0.85;
      const zPlat = surf(x, S_PLAT)[0];
      const gAt = (zz) => surf(x, S_CREST + (zc - zz) / Math.max(1, zc - zPlat))[1];
      let g = gAt(z);
      // In front of a wall the crown stays 2.6-4.8 m (and WINDOW_CLEAR below now
      // caps it lower, so it no longer takes the lowest sash row):
      // at 4.2-5.8 m the wall band of the judged box fell 44.2 -> 40.8% edge
      // as crowns replaced windows, and at 3.0-4.2 it holds 42.9%. In a gap a
      // crown may stand 5-11.5 m, which is where 763's West Cliff pines are.
      let h = (gap ? 6.0 + 4.0 * G : 3.0 + 1.2 * G) * (0.85 + 0.30 * noise(j, 65.9));
      // 2026-09-16 (tmp-tr18): WINDOW_CLEAR. 2.6-4.8 m did not leave the lowest
      // sash row: a crown stands metres IN FRONT of its wall and a camera on the
      // water looks UP at it, so its top lands higher on the wall than its own
      // height (close view tmp-tr18/before/S_zwin.png: the lower half of the
      // lowest row hidden along most of the frontage). Cap h so the top ring
      // (0.9 h, up to 0.32 W seaward of centre) and the shoulder (0.59 h at
      // 0.61 W) project below every overlapping lot's sill - 0.25 m, from an eye
      // 2 m up and 170 m out - lower and nearer than every judged camera
      // (along-neck 2.2 m at ~180 m, entrance 4 m at ~200 m). Under 1.8 m where
      // it stands: move it back to the wall; still under: no crown.
      if (!gap && WINDOW_CLEAR) {
        const lx0 = x - W * 0.62 - 0.5, lx1 = x + W * 0.62 + 0.5;
        const cap = (zz, gg) => {
          let c = Infinity;
          for (const L of lots) {
            if (!(L[1] > lx0 && L[0] < lx1)) continue;
            for (const [a, rho] of [[0.9, 0.32], [0.59, 0.61]]) {
              const kk = Math.max(0, zz + rho * W - L[2]) / 170;
              c = Math.min(c, ((L[3] - 0.25 + 2.0 * kk) / (1 + kk) - gg) / a);
            }
          }
          return c;
        };
        let hc = cap(z, g);
        if (hc < 1.8) { z = zMin; g = gAt(z); hc = cap(z, g); }
        if (hc < 1.8) continue;
        h = Math.min(h, hc);
      }
      const tone = snoise(x * 0.07, 91.3);
      const cShade = mix3(C.cliffPine, C.cliffScrubDamp, 0.6 * tone);
      const cLit = mix3(C.cliffScrubDry, mix3(C.cliffScrub, C.cliffGrassDry, 0.5), 0.6 * (0.6 + 0.4 * tone));
      const ph = noise(j, 71.9) * TAU;
      crown(x, g, z, W * 0.5, h, ph, cLit, cShade);
      if (h > 6.5) {
        const side = noise(j, 73.3) < 0.5 ? -1 : 1;
        crown(x + side * 0.28 * W, g + h * 0.30, z + 0.12 * W, W * 0.33, h * 0.62,
          ph + 0.9, cLit, cShade);
      }
    }
  }

  buildClifftopPlanting();

  // >>> CLIFFRELIEF
  buildCliffRelief({ m, MAT, C, OX, OZ, X0, STEP, facePro, faceQuads,
    snoise, fbm2, noise, mix3, clamp });
  // <<< CLIFFRELIEF

  // ---- 2026-09-18 (tmp-tr99): THE PIER ROOT - PROMENADE APRON AND SEA WALL -
  //
  // The pier's landward end used to stop in mid-air: pier.js started its deck
  // slab at s = 0, which is EXACTLY this ribbon's beach lip (z = 0), so the
  // deck began on open sand with the promenade 1.97 m below it and no wall,
  // kerb or ramp anywhere. STATUS.md has carried "LANDWARD END NOT BUILT"
  // since the arch rebuild.
  //
  // EVIDENCE, all from the EA 1 m DSM tile ref-cache/pier_dsm.tif read in model
  // stations (tmp-tr13/dsm_deck.py's mapping; probes in tmp-tr99/dsm_wall.py
  // and dsm_prof.py, output in tmp-tr99/ev/dsm_wall.txt, dsm_prof.txt):
  //
  //   * A RAISED APRON at 4.78-4.91 ODN wraps the pier entrance. Its seaward
  //     edge - the sea wall - is at s -10 at o +2, -12 at o 0, -16.5 at o -4,
  //     -20 at o -8, -24.5 at o -12, -26 at o -14 on the west flank, and holds
  //     s -17.0..-17.5 from o +16 to +24 on the east flank: a shallow bow,
  //     most seaward on the pier's own line.
  //   * ITS DROP TO THE BEACH is 2.05-2.86 m, median 2.45 (prom 4.78-4.91 over
  //     beach 1.96-2.57), measured at 13 offsets.
  //   * THE PROMENADE EITHER SIDE of that apron is only 3.1-3.6 ODN (o -60..-18
  //     and o +36..+72 at s -22/-25/-28) - which is what this file already
  //     builds at 3.5. So the apron is a LOCAL raised terrace, not a datum
  //     error in the ribbon, and nothing outside it is touched.
  //   * The deck it carries is 4.90 ODN against that 4.80 apron, a 0.10 m
  //     step; the model's DECK is a protected 5.470, so the apron top is
  //     5.470 - 0.10 = 5.37 and keeps the measured relationship at the one
  //     junction this build is about.
  //
  // WHAT IS NOT FROM THE DSM. The bow is built much SHALLOWER than the 10-13 m
  // the DSM shows, because pier-landmarks.js (another builder's file) still has
  // the entrance pavilion at s -9.4..-4.2, whose west corner stands at z -2.58.
  // Ground has to reach past it, so the edge only falls back 3.0 m over the
  // apron's 16.6 m half-width. When the pavilion goes back to its real station
  // (DSM: the entrance block is s -41..-22) the constant below can take the
  // measured fall-back. The RAMP and the beach STEPS are standard seafront
  // arrangements, INFERRED: the DSM shows the level change, not how you cross
  // it. No tone is taken from any frame - every colour here is a palette key
  // this file already uses on the promenade and its structures (trap 5).
  const PIER_APRON = true;
  if (PIER_APRON) {
    const PD = [0.1063, 0.9943];                    // pier.js DIR
    const pat = (s, o) => [s * PD[0] + o * PD[1] + OX, s * PD[1] - o * PD[0] + OZ];
    const sAtZ = (z, o) => (z + o * PD[0]) / PD[1];
    const AP_TOP = 5.37;          // = pier DECK 5.470 - the measured 0.10 step
    const AP_O = 16.6;            // half width: stops 0.4 m short of the o = 17
                                  // post where pier-landmarks.js's promenade
                                  // railing run starts, so no post is buried
    const AP_BACK = -20.0;        // z of the back of the promenade in the ribbon
    const AP_FOOT = 2.55;         // wall foot, under the beach and prom surfaces
    const zEdge = (o) => { const t = Math.abs(o) / AP_O; return 0.90 - 3.0 * t * t; };
    const UP = [0, 1, 0];
    const NF = [PD[0], 0, PD[1]];                       // seaward, along the pier
    const BF = [-PD[0], 0, -PD[1]];                     // landward
    const OF = [PD[1], 0, -PD[0]];                      // +o, along the shore
    const V = (s, o, y, n, col) => {
      const q = pat(s, o);
      return m.pushC(q[0], y, q[1], n[0], n[1], n[2], col, MAT.CONCRETE);
    };
    // C.concreteDark, not C.concrete: the wall is a shaded vertical face
    // under a lit coping, and C.concrete is the SAME linear triple as
    // C.pierArch, which tmp-tr63/prot.mjs counts as a protected key.
    const NSEG = 24;
    const oAt = (i) => -AP_O + (2 * AP_O) * (i / NSEG);

    for (let i = 0; i < NSEG; i++) {
      const o0 = oAt(i), o1 = oAt(i + 1);
      const f0 = sAtZ(zEdge(o0), o0), f1 = sAtZ(zEdge(o1), o1);
      const b0 = sAtZ(AP_BACK, o0), b1 = sAtZ(AP_BACK, o1);
      // paved top
      m.quad(V(f0, o0, AP_TOP, UP, C.prom), V(f1, o1, AP_TOP, UP, C.prom),
        V(b1, o1, AP_TOP, UP, C.prom), V(b0, o0, AP_TOP, UP, C.prom));
      // the sea wall itself
      m.quad(V(f0, o0, AP_TOP, NF, C.concreteDark), V(f1, o1, AP_TOP, NF, C.concreteDark),
        V(f1, o1, AP_FOOT, NF, C.concreteDark), V(f0, o0, AP_FOOT, NF, C.concreteDark));
      // THE KERB LINE. A coping band along the top of the wall, 0.08 m proud
      // and 0.35 m wide - the strongest horizontal at this end of the beach
      // and the line the eye uses to read where the sand stops. Skipped under
      // the pier deck (|o| < 5.6), where the deck slab is 0.10 m above it.
      // Run CONTINUOUS. The first build skipped |o| < 5.6 to stay clear of the
      // deck slab; the stop and start showed as a notch in the wall face
      // (tmp-tr99/ev/sheet_entry_a.jpg). At 5.37-5.45 the band is under the
      // deck's own top at 5.470, so the hidden six quads cost nothing.
      {
        const k0 = sAtZ(zEdge(o0) - 0.35, o0), k1 = sAtZ(zEdge(o1) - 0.35, o1);
        m.quad(V(f0, o0, AP_TOP + 0.08, UP, C.prom), V(f1, o1, AP_TOP + 0.08, UP, C.prom),
          V(k1, o1, AP_TOP + 0.08, UP, C.prom), V(k0, o0, AP_TOP + 0.08, UP, C.prom));
        m.quad(V(f0, o0, AP_TOP + 0.08, NF, C.prom), V(f1, o1, AP_TOP + 0.08, NF, C.prom),
          V(f1, o1, AP_TOP, NF, C.prom), V(f0, o0, AP_TOP, NF, C.prom));
        m.quad(V(k0, o0, AP_TOP + 0.08, BF, C.prom), V(k1, o1, AP_TOP + 0.08, BF, C.prom),
          V(k1, o1, AP_TOP, BF, C.prom), V(k0, o0, AP_TOP, BF, C.prom));
      }
    }
    // the two flank faces, down to the 3.5 promenade beside the apron, and the
    // back retaining face where the apron meets the toe of the valley bank
    for (const sgn of [-1, 1]) {
      const o = sgn * AP_O, n = [sgn * OF[0], 0, sgn * OF[2]];
      m.quad(V(sAtZ(zEdge(o), o), o, AP_TOP, n, C.concreteDark),
        V(sAtZ(AP_BACK, o), o, AP_TOP, n, C.concreteDark),
        V(sAtZ(AP_BACK, o), o, AP_FOOT, n, C.concreteDark),
        V(sAtZ(zEdge(o), o), o, AP_FOOT, n, C.concreteDark));
    }
    m.quad(V(sAtZ(AP_BACK, -AP_O), -AP_O, AP_TOP, BF, C.concreteDark),
      V(sAtZ(AP_BACK, AP_O), AP_O, AP_TOP, BF, C.concreteDark),
      V(sAtZ(AP_BACK, AP_O), AP_O, AP_FOOT, BF, C.concreteDark),
      V(sAtZ(AP_BACK, -AP_O), -AP_O, AP_FOOT, BF, C.concreteDark));

    // THE RAMPS down to the lower promenade, one on each flank. 1.87 m over
    // 14.4 m of shore = 1 in 7.7, which is steep for a ramp and is what the
    // space allows: it has to start clear of the o = -17 railing post at
    // z = -3.8 and finish clear of the kiosk at o = -26, z = -5.8..-9.2, so it
    // runs behind both at z -10..-19. Built on BOTH flanks: with one ramp the
    // east side of the terrace was 20 m of blank retaining wall
    // (tmp-tr99/ev/sheet_entry_a.jpg, F_entry_e). INFERRED, not measured.
    {
      const ZA = -10.0, ZB = -19.0, NR = 8, LOW = 3.5;
      for (const sg of [-1, 1]) {
      const R0 = sg * AP_O, R1 = sg * 31.0;
      for (let i = 0; i < NR; i++) {
        const oA = R0 + (R1 - R0) * (i / NR), oB = R0 + (R1 - R0) * ((i + 1) / NR);
        const yA = AP_TOP + (LOW - AP_TOP) * (i / NR), yB = AP_TOP + (LOW - AP_TOP) * ((i + 1) / NR);
        const g = (yB - yA) / (oB - oA), nl = Math.hypot(g, 1);
        const n = [(-g * OF[0]) / nl, 1 / nl, (-g * OF[2]) / nl];
        const aA = sAtZ(ZA, oA), aB = sAtZ(ZA, oB), bA = sAtZ(ZB, oA), bB = sAtZ(ZB, oB);
        m.quad(V(aA, oA, yA, n, C.prom), V(aB, oB, yB, n, C.prom),
          V(bB, oB, yB, n, C.prom), V(bA, oA, yA, n, C.prom));
        m.quad(V(aA, oA, yA, NF, C.concreteDark), V(aB, oB, yB, NF, C.concreteDark),
          V(aB, oB, LOW - 0.2, NF, C.concreteDark), V(aA, oA, LOW - 0.2, NF, C.concreteDark));
        m.quad(V(bA, oA, yA, BF, C.concreteDark), V(bB, oB, yB, BF, C.concreteDark),
          V(bB, oB, LOW - 0.2, BF, C.concreteDark), V(bA, oA, LOW - 0.2, BF, C.concreteDark));
      }
      }
    }

    // THE GUARD RAILING along the top of the sea wall. A 2.4 m drop onto a
    // public beach has one, and pier-landmarks.js already builds the same
    // white post-and-rail on the lower promenade either side (o +-17..+-34):
    // this carries that line across the terrace, one level up, and stops at
    // the deck, where the pier's own parapet takes over. Height 1.15 m and
    // post pitch 2.4 m are that module's figures, so the two runs match.
    {
      const RY = AP_TOP + 1.15, BY = AP_TOP + 0.55, RT = 0.05;
      const RC = C.pierRail, PC = C.pierRail.map((v) => v * 0.85);
      const VR = (s, o, y, n, col) => {
        const q = pat(s, o);
        return m.pushC(q[0], y, q[1], n[0], n[1], n[2], col, MAT.PAINTED);
      };
      const band = (o0, o1, y0, y1, col) => {
        const f0 = sAtZ(zEdge(o0) - 0.18, o0), f1 = sAtZ(zEdge(o1) - 0.18, o1);
        m.quad(VR(f0, o0, y1, NF, col), VR(f1, o1, y1, NF, col),
          VR(f1, o1, y0, NF, col), VR(f0, o0, y0, NF, col));
        m.quad(VR(f0, o0, y1, BF, col), VR(f1, o1, y1, BF, col),
          VR(f1, o1, y0, BF, col), VR(f0, o0, y0, BF, col));
      };
      for (let i = 0; i < NSEG; i++) {
        const o0 = oAt(i), o1 = oAt(i + 1);
        if (Math.abs((o0 + o1) * 0.5) < 5.8) continue;
        band(o0, o1, BY, RY - RT, PC);
        band(o0, o1, RY - RT, RY, RC);
      }
      for (let k = -6; k <= 6; k++) {
        const o = k * 2.4 + (k < 0 ? -4.6 : 4.6);
        if (Math.abs(o) > AP_O - 0.2) continue;
        const s = sAtZ(zEdge(o) - 0.18, o);
        for (const [n, so] of [[NF, 0.04], [BF, -0.04]]) {
          m.quad(VR(s + so, o - 0.04, RY, n, RC), VR(s + so, o + 0.04, RY, n, RC),
            VR(s + so, o + 0.04, AP_TOP, n, RC), VR(s + so, o - 0.04, AP_TOP, n, RC));
        }
      }
    }

    // BEACH STEPS on the east flank. A 2.4 m wall with no way off it reads as
    // a quay, not a seafront; every promenade frame in ref-cache shows the
    // beach in use. One flight, o +9.4..+13.4, 15 risers of 0.173 m projecting
    // 4.8 m onto the sand. INFERRED (standard going and rise).
    {
      const SO0 = 9.4, SO1 = 13.4, NST = 15, GOING = 0.32;
      const zTop = zEdge((SO0 + SO1) * 0.5);
      const yTop = AP_TOP, yBot = 2.78, dy = (yTop - yBot) / NST;
      for (let k = 0; k < NST; k++) {
        const y = yTop - k * dy, zA = zTop + k * GOING, zB = zA + GOING;
        const a0 = sAtZ(zA, SO0), a1 = sAtZ(zA, SO1), b0 = sAtZ(zB, SO0), b1 = sAtZ(zB, SO1);
        m.quad(V(a0, SO0, y, UP, C.prom), V(a1, SO1, y, UP, C.prom),
          V(b1, SO1, y, UP, C.prom), V(b0, SO0, y, UP, C.prom));
        m.quad(V(b0, SO0, y, NF, C.concreteDark), V(b1, SO1, y, NF, C.concreteDark),
          V(b1, SO1, y - dy, NF, C.concreteDark), V(b0, SO0, y - dy, NF, C.concreteDark));
      }
      for (const [o, sg] of [[SO0, -1], [SO1, 1]]) {
        const n = [sg * OF[0], 0, sg * OF[2]];
        m.quad(V(sAtZ(zTop, o), o, yTop, n, C.concreteDark),
          V(sAtZ(zTop + NST * GOING, o), o, yBot, n, C.concreteDark),
          V(sAtZ(zTop + NST * GOING, o), o, AP_FOOT, n, C.concreteDark),
          V(sAtZ(zTop, o), o, AP_FOOT, n, C.concreteDark));
      }
    }
  }

  // >>> BEACHSURF
  buildBeachSurface(m, C, MAT, OX, OZ, mhwOffset);
  // <<< BEACHSURF

  buildBournemouthPier(m, C, OX, OZ, opts.ranges);
  buildBoscombePier(m, OX, OZ);

  // >>> PROM
  // Called LAST on purpose. Everything this module builds is additive, so
  // putting it after every other builder makes the proof that nothing existing
  // moved a one-liner: the first 169,122 vertices of the new mesh are the
  // whole of the old mesh, byte for byte (tmp-tr116/ev/prefix.txt). The beach
  // huts are inside that prefix.
  buildPromenade(m, C, MAT, OX, OZ, mhwOffset);
  // <<< PROM

  // >>> FARBAND
  // Called after everything else so the mesh's existing index ranges are
  // untouched - RAID_RANGES and hide-ranges.js address the pier by index
  // and must not shift. Removed entirely by ?cdbg=nofar.
  // 2026-09-18: SUPPRESSED IN THE ARENA. coast-far.js draws the Purbeck mass as a
  // bearing-keyed silhouette at its true 8.6 km, which is correct from Bournemouth
  // and is a WALL THROUGH THE TERRAIN once the camera stands at Handfast Point -
  // the band and the arena are the same hills, drawn twice at different fidelities.
  // tmp-tr138 could not fix this from its own files because this call is in the
  // FARBAND fence, and needing ?cdbg=nofar by hand was its top 'still weak' item.
  if (!ARENA_ON) buildFarBand(m, OX, OZ, MAT);
  // <<< FARBAND

  // >>> ARENA
  // Called LAST, after the far band, for the reason the FARBAND fence above
  // states: everything before it keeps the index offsets it already had, so
  // RAID_RANGES and hide-ranges.js still address the pier correctly. Verified
  // rather than asserted - RAID_RANGES.pier, .mask.length and .crowdRaw are
  // identical with the arena on and off (tmp-tr138/RESULT.md section 6).
  //
  // Returns null and touches nothing unless the arena flag is set, which is
  // why every gate, the census and all 19 judged views are unaffected.
  buildOldHarryArena(m, C, MAT, OX, OZ);
  // <<< ARENA

  // >>> BUOYS
  // The gate line's channel marking, AFTER the arena for the reason the two fences
  // above both give: every index range already recorded stays where it was, so
  // RAID_RANGES and hide-ranges.js still address the pier correctly.
  //
  // Returns null and touches nothing unless ARENA_ON, so the 19 judged views, the
  // wipeout census and every Bournemouth gate are unaffected by it. NOT gated on
  // ?cal=: this is world geometry, not a screen effect, and the arena views that
  // measure it are themselves ?cal= renders - gating it off there would make the
  // marking unmeasurable, which is the opposite of what that rule is for.
  buildGateBuoys(m, C, MAT, OX, OZ);
  // <<< BUOYS

  // >>> RAMPS
  // Called LAST, for the reason the two fences above both give: everything
  // before it keeps the index offsets it already had, so pier.js's RAID_RANGES
  // and raid/hide-ranges.js still address the pier correctly.
  //
  // NO OX/OZ. The ramp table is written in SIM WORLD metres, which is the frame
  // this mesh is built in once the OX/OZ translation has been applied to the
  // coast-frame builders above - the same frame boats/obstacles.js keys its grid
  // on, and the frame the hull reads. One table, one frame, no conversion to get
  // wrong between the picture and the physics.
  //
  // Returns null and builds nothing under ?cdbg=noramps, which is the ablation
  // the 19-view report leans on.
  buildRamps(m, C, MAT);
  // <<< RAMPS

  // >>> STUNT
  // THE STUNT COURSE's furniture (tmp-tr173): the boundary ring, the corner and
  // gate posts, and the two pontoon rafts. LAST, for the reason every fence above
  // gives: everything before it keeps the index offsets it already had, so pier.js's
  // RAID_RANGES and raid/hide-ranges.js still address the pier correctly.
  //
  // NO OX/OZ, the same as buildRamps() above and for the same reason: the course
  // table is written in SIM WORLD metres, which is the frame this mesh is built in
  // once the OX/OZ translation has been applied to the coast-frame builders, and the
  // frame boats/obstacles.js keys its grid on.
  //
  // Returns null and touches nothing unless ?arena=stunt, so the 19 judged views, the
  // three Old Harry views, the wipeout census and every Bournemouth gate never see it.
  // NOT gated on ?cal=: this is world geometry, not a screen effect, and the three
  // stunt views that measure it are themselves ?cal= renders - gating it off there
  // would make the course unmeasurable, which is the opposite of what that rule is for.
  buildStuntArena(m, C, MAT);
  // <<< STUNT

  return m.buildC();
}

// §B.1b. BARE deck. No pier-head building. 185 m, not 750 ft.
function buildBoscombePier(m, OX, OZ) {
  const rootX = COAST.boscombeRoot;
  const dir = [-0.0595, 0.9982];            // axis 172.5 deg
  const at = (s, off) => [rootX + s * dir[0] + off * dir[1] + OX, s * dir[1] - off * dir[0] + OZ];
  const DECK = 5.3;
  const halfW = 4.6;

  const [ax, az] = at(0, -halfW), [bx, bz] = at(0, halfW);
  const [cx, cz] = at(185, halfW), [dx, dz] = at(185, -halfW);
  const ring = (yy, nrm) => [
    m.pushC(ax, yy, az, 0, nrm, 0, C.concrete, MAT.CONCRETE),
    m.pushC(bx, yy, bz, 0, nrm, 0, C.concrete, MAT.CONCRETE),
    m.pushC(cx, yy, cz, 0, nrm, 0, C.concrete, MAT.CONCRETE),
    m.pushC(dx, yy, dz, 0, nrm, 0, C.concrete, MAT.CONCRETE),
  ];
  const t = ring(DECK, 1), b = ring(DECK - 1.1, -1);
  m.quad(t[0], t[1], t[2], t[3]);
  m.quad(b[3], b[2], b[1], b[0]);
  m.quad(b[1], b[2], t[2], t[1]);
  m.quad(b[3], b[0], t[0], t[3]);

  for (let s = 10; s < 185; s += 15) {
    const [px, pz] = at(s, 0);
    m.box(px - 1.1, -2, pz - 1.1, px + 1.1, DECK - 1.1, pz + 1.1, C.concreteDark, MAT.CONCRETE);
  }
  // Landward entrance building (blue/cream) - the only structure on it.
  {
    const [px, pz] = at(6, 0);
    m.box(px - 7, DECK, pz - 6, px + 7, DECK + 5.5, pz + 6, C.building);
  }
  // Low lamp columns down the deck. Nothing else: the bare head IS the point.
  for (let s = 30; s < 180; s += 24) {
    for (const off of [-3.6, 3.6]) {
      const [px, pz] = at(s, off);
      m.box(px - 0.13, DECK, pz - 0.13, px + 0.13, DECK + 3.2, pz + 0.13, C.concreteDark, MAT.CONCRETE);
    }
  }
}
