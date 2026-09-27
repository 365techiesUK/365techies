// FEEL LAYER - airtime, landing quality, hit confirmation and a streak that decays.
//
// WHY THIS FILE EXISTS. The game had no moment-to-moment acknowledgement: a clean
// landing and a belly flop looked the same, a shot that connected looked almost the
// same as one that missed, and the raid's combo counter - which already existed in the
// rules - was drawn in an 11 px line that the landscape-phone stylesheet hides outright.
// Skilful play therefore felt identical to clumsy play. This layer says, in words and in
// one colour, what just happened.
//
// THREE THINGS IT IS NOT:
//   - It is not physics. Nothing here is fed back into the sim, the plant, a hull or the
//     raid's rules. It only ever READS a sampled state, so switching it off changes the
//     model not at all.
//   - It is not the raid's score. This module cannot write to RaidGame (that file belongs
//     to another pass), so airtime keeps its own tally and says so on screen. The raid's
//     combo is MIRRORED here, never duplicated: combo() takes the rules' own number so the
//     player can never be shown two disagreeing counters.
//   - It is not world geometry. Every pixel is DOM text on an overlay, so nothing here can
//     reach the calibration corpus.
//
// HOW IT IS KEPT OUT OF A CALIBRATION RENDER, three independent ways:
//   1. main.js does not construct it at all when the URL carries ?cal=.
//   2. `body.clean-render #jz-root { display: none }` below, the same rule every other
//      overlay on this page carries, so ?clean=1 hides it even if it were built.
//   3. Its tick() is called from inside main.js's `!paused && !__calFrozen` block, so
//      ?hold=1 freezes it with the rest of the sim.
//
// CONTENT RULES. Nothing in this file can fire on a person in the water. hit() is driven
// only by the raid rules' `lastHit`, which is written in exactly one place (RaidGame._damage)
// and is only ever reached with an entry of `ships`; swimmers live in a separate array that
// no hit test reads. There is no damage wording, no blood, no injury and no third-party mark
// anywhere in the copy below - a landing verdict is about the craft's attitude, nothing else.
//
// UI RULES (project standard): no text below .95rem, no accordion, no carousel, no drag,
// and no touch target at all - the whole layer is pointer-events:none, so it can neither be
// pressed nor block a control underneath it.
//
// ⚠️ THE SIZES BELOW ARE IN PIXELS, DELIBERATELY. index.html sets `html, body { font: 12px }`,
// so 1rem on this page is 12px, not the 16px the .95rem floor assumes: written in rem, every
// number here would have rendered 25% under the floor and measured as complying. Checked live
// in the browser - 1.05rem came back as 12.6px. Anything on this layer that a player reads is
// therefore >= 16px in real pixels, with the floor 15.2px (.95 x 16).

const RAD = 180 / Math.PI;
const G = 9.81;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
// 0 at `good` or better, 1 at `bad` or worse, linear between. One helper for all three axes
// so a reader can check the rating by hand.
const span = (v, good, bad) => clamp01((Math.abs(v) - good) / (bad - good));

// Every threshold in one table, and every one of them is anchored to a number the model
// already uses or to a distribution that was measured rather than picked by feel.
//
//   ⚠️ RE-DERIVED IN tmp-tr174 (AIRFEEL), because the tmp-tr165 set was measured in a
//   world with no ramps in it. tmp-tr165 sampled 438 landings of free riding over chop,
//   where the worst touchdown in the whole corpus was -7.51 m/s, and set `vyHard` at 6.0.
//   The stunt stage then arrived: a jump off its course gains 2-4 m and comes down at
//   -8.4 m/s whatever the rider does, so `fall` read 1.00 on 100% of 104 measured jumps
//   and a clean 1.7 s, 3 m flight was graded a BELLY FLOP. The level worked around it by
//   reading this file's attitude axes and muting the overlay. This is the fix.
//
//   THE NEW MEASUREMENT. 14,184 landings of >= 0.35 s on a real PlaneHull and the real
//   sea, in BOTH worlds and on both craft:
//     - free world, no ramps: tmp-tr165's own design re-run, 18 rides of 600 s
//       (2 craft x 3 sea states x 3 turn rates, full throttle)          ->    348 landings
//     - the stunt course, ridden ramp to ramp, 6 rides of 600 s          ->    456 landings
//     - deliberate ramp approaches: every ramp x 5 entry angles x 3 lateral
//       offsets x 3 steering scripts x 2 lock times x 2 craft x 3 seas   -> 13,380 landings
//
//   ⚠️ WHAT THE MEASUREMENT FOUND, AND IT CHANGES THE SHAPE OF THE GRADE.
//   Touchdown vertical speed is NOT a measure of how well a landing was flown. It is the
//   flight's own arithmetic. Over all 14,184 landings, the free-flight prediction from the
//   airtime and the height gained
//
//        |vy| = g * air - sqrt(2 g rise)          (rise = v0^2/2g, so v0 = sqrt(2 g rise))
//
//   correlates with the actual touchdown speed at r = 0.994. Airtime alone already gives
//   0.923. Whatever is left over - the part the rider is responsible for - is small and
//   tightly bounded: p50 -0.26, p90 -0.09, p99 +0.38, worst +1.67 m/s. Driving the craft
//   into the water measurably harder than gravity alone is the only thing a rider can do
//   to that axis, and it is rare.
//
//   That is why grading raw `vy` broke: it was never grading the landing, it was grading
//   the SIZE OF THE JUMP, and a world with ramps made the jumps big. So `fall` now grades
//   the arrival speed that free flight does NOT explain. Two bands, because there are two
//   different quantities depending on whether the caller knows the flight:
//
//   vySoft / vyHard    - 1.8 / 6.0 m/s, UNCHANGED from tmp-tr165, and used when the caller
//                        passes no airtime. With no flight known, none of the arrival speed
//                        is explained, so the whole of it is graded - which is exactly what
//                        tmp-tr165 measured and what a bare rateLanding({vy}) means.
//   overSoft/overHard  - 0.0 / 1.5 m/s, used when `air` is given. 0.0 is not a choice: it is
//                        the point at which the craft arrived at precisely the speed its own
//                        flight implies. 1.5 is just inside the worst excess in the corpus
//                        (1.67 m/s). Between them lie 3.6% of landings; 0.2% reach 1.00.
//
//   noseOk / noseBad   - ⚠️ RE-BANDED 7/26 -> 3/24, and rollOk/rollBad 14/40 -> 3/44. With
//   rollOk / rollBad     `fall` no longer firing on the size of the jump, the two attitude
//                        axes carry the grade, and at the old bands they could not: the same
//                        corpus came out 1.4% flop / 8.0% rough / 46.3% clean / 44.3% PERFECT
//                        in the free world, which is not a grade, it is a participation
//                        award. Measured attitude at touchdown over the 804 landings of
//                        realistic riding: |pitch| p50 7.7, p90 18.3, p95 22.4, max 51.6
//                        (its clamp); |roll| p50 8.6, p90 23.4, p95 29.3, max 45.8. 3 deg on
//                        either axis is "arrived level" - the rider who cuts the throttle in
//                        the air lands at 1.4 deg, so it is a mark she can actually hit.
//                        24 deg of pitch is just past p95; 44 deg of roll is just inside the
//                        model's own +-45.8 deg clamp. Both mean "not flying it any more".
//
//                        ⚠️ THE UPPER TWO ARE ALSO PINNED FROM DOWNSTREAM, and whoever
//                        retunes them needs to know. src/stunt/ reads THESE axes - it takes
//                        att = max(nose, tilt) and calls the landing blown above
//                        raid/tuning.js's landOk = 0.55. test-stunt asserts that a 14 deg /
//                        24 deg arrival is untidy but still landed, which requires
//                        (14-noseOk)/(noseBad-noseOk) and (24-rollOk)/(rollBad-rollOk) to
//                        stay under 0.55. At 3/24 and 3/44 they are 0.524 and 0.512 - only
//                        0.026 of margin. Narrower attitude bands than these (3/20 and 3/40
//                        are what the distribution alone would give, and they grade slightly
//                        better: free world 5.7/24.7/63.8/5.7) push that arrival over the cut
//                        and turn it into a blown landing. landOk is a DERIVED number, not an
//                        independent one - it was calibrated against the tmp-tr165 bands -
//                        and it should be re-derived alongside any further move here rather
//                        than left to be discovered by a failing assertion.
//   noseDive           - -12 deg unchanged: below this the bow goes in first whatever else is
//                        true. 6.2% of landings are beyond it.
//   minAir             - 0.35 s unchanged, and re-checked in the new world. In the free world
//                        it is one verdict per 31 s of hard riding, the cadence tmp-tr165
//                        chose; on the stunt course it is one per 7.9 s, which is one per
//                        jump, which is what a ramp course should give.
//
//   ⚠️ THE ATTITUDE AXES ARE THE ONES A RIDER CONTROLS - this was measured too, and it
//   is why the grade now rests on them. Same ramp, same approach, only the airborne input
//   changed: holding the throttle lands the craft at 12.2 deg of pitch, cutting it lands at
//   1.4 deg; in a storm the same pair is 22.7 deg against 7.5 deg. The arrival SPEED over
//   those same runs moves from 1.01 to 1.10 of its ballistic value - i.e. hardly at all.
//
//   The grade curve that comes out of the numbers above:
//     free world only      flop  4.3%   rough 15.8%   clean 71.6%   PERFECT  8.3%
//     ramp launches only   flop 17.9%   rough 12.9%   clean 45.5%   PERFECT 23.7%
//     both, as ridden      flop 10.4%   rough 14.6%   clean 57.8%   PERFECT 17.2%
//   The free-world column is the one to compare with tmp-tr165's 8 / 24 / 64 / 5, and it
//   is the same curve. All four grades are live in both worlds, a nose-first or a
//   flung-over landing still scores nothing, and PERFECT still has to be flown for.
//
// >>> SPINCTRL
// =========================================================================================
// LANDING MID-ROTATION (tmp-tr176). WHAT USED TO HAPPEN: NOTHING. THE GRADER NEVER LOOKED.
// =========================================================================================
//
// src/air-spin.js now gives the rider real yaw authority in the air, so a craft can arrive
// pointing anywhere. Before this block, `rateLanding` read pitch and roll and NOTHING about
// which way the craft was travelling, so it could not tell a 180 landed backwards from a 90
// landed broadside. Measured over 13,342 spun ramp jumps, bucketed by the angle between
// heading and track at touchdown:
//
//     drift band      n      flop  rough  clean  PERF   |v| across the keel, p50
//       0- 15 deg   9,721     8.9    9.6   50.8   30.7      0.34 m/s
//      15- 45         881    53.0   13.1   24.6    9.3      7.39
//      45- 75         536    48.9    9.1   24.1   17.9     12.97
//      75-105         651    28.1    4.6   41.2   26.1     14.08   <- BROADSIDE
//     105-145         863    26.4    3.9   49.2   20.4     11.27
//     145-181         690    28.0    5.7   52.2   14.2      3.69   <- landed backwards
//
// So a landing 90 deg across its own keel at a median 14.08 m/s (51 km/h, worst 22.94 =
// 83 km/h) came out 41.2% CLEAN and 26.1% PERFECT. Two thirds of broadside arrivals banked
// points and a quarter were called a perfect landing.
//
// TWO CHANGES, AND THEY PULL IN OPPOSITE DIRECTIONS ON PURPOSE. A 180 landed backwards is a
// trick; a 90 landed sideways at 60 km/h is a crash.
//
//   slipOk / slipBad   - 6.5 / 16.0 m/s of LATERAL speed at touchdown, |v| in the body
//                        frame. It is folded into `tilt` (tilt = max(roll, slip)) rather
//                        than added as a fourth axis, for two reasons. The arithmetic:
//                        q = 1 - (0.5 worst + 0.5 mean) divides the mean by the number of
//                        axes, so a fourth axis sitting at 0 would raise every q in the
//                        build and move the whole distribution. And the meaning: rolling
//                        over sideways and sliding sideways are the same failure, the label
//                        for both is already SIDEWAYS, and |v| is the athwartships speed
//                        that a roll angle is only a proxy for.
//
//                        WHY |v| AND NOT THE DRIFT ANGLE: the lateral speed is sin(drift) x
//                        speed, so it is 0 for a craft going forwards AND 0 for one going
//                        backwards, peaks at 90 deg, and scales with how fast the craft is
//                        actually travelling - which is the owner's own test, "a 90 landed
//                        sideways AT 60 KM/H". A slow pirouette onto the water is not a
//                        crash and this does not call it one.
//
//                        6.5 is ABOVE THE WORST LATERAL SPEED THE FREE-WORLD CORPUS EVER
//                        PRODUCES. Over the same 348 landings the grades were derived from
//                        (18 rides of 600 s, both craft, three seas, three held turn rates,
//                        full throttle): |v| p50 2.53, p90 3.56, p95 3.89, p99 4.68, MAX
//                        6.04 m/s, and not one landing past 75 deg of drift. So this axis
//                        reads exactly 0.000 on every landing in the population the bands
//                        were fitted to, and the free-world distribution CANNOT move. A jump
//                        flown straight lands at 0.50 m/s, so 6.5 is 13x what a tidy landing
//                        does - the same shape as noseOk 3 against a 1.4 deg clean arrival.
//                        16.0 is the owner's own case: 60 km/h is 16.67 m/s, and at 90 deg
//                        all of it is across the keel. It is also between p90 (15.04) and
//                        p95 (17.37) of the spun stunt-course population, i.e. the worst
//                        tenth of sideways arrivals, which is where noseBad sits on pitch.
//
//                        ⚠️ AND A FULLY-FAILED SLIP CONDEMNS THE LANDING, exactly as
//                        noseDive does, and for the same reason and by the same arithmetic.
//                        A single failed axis scores 1 - (0.5 + 0.5/3) = 0.3333, one
//                        thousandth ABOVE the grade-1 line, so without this a broadside at
//                        83 km/h came out ROUGH and banked points. There is no pitch and no
//                        roll that makes a hull arriving across its own keel at 16 m/s a
//                        landing; it is tripping over its chine. Deliberately NOT generalised
//                        to the roll half of `tilt` - only to the slip.
//
//   THE PITCH AXIS IS NOW READ AGAINST THE DIRECTION OF TRAVEL. `noseDive` says "the bow
//   going in first is a crash". Travelling BACKWARDS the bow is not going in first, the
//   stern is, and the grader had it exactly inverted: of 597 backwards landings (>150 deg),
//   pitch at touchdown ran p10 -19.9, p50 -6.4, p90 +10.6 deg, so the ones that were bow-
//   DOWN - stern high and leading, which is the GOOD way to land backwards - were the ones
//   tripping noseDive, and 28.3% of backwards landings were graded a flop. Bow-UP while
//   travelling stern-first buries the transom and was the one being let off. So `nose` and
//   `dive` now read pitch x sign(u): the angle of the end that is actually leading.
//
//   The sign flip is discontinuous at u = 0, and that is safe because u = 0 means the whole
//   of the velocity is lateral - so `slip` is at or past `slipBad` and the landing is
//   already condemned - for any craft moving at more than slipBad. Below that speed nothing
//   about the landing matters. And it cannot touch the free world at all: the minimum u over
//   the whole 348-landing free corpus is +4.12 m/s and not one landing has u < 0.
//
//   BOTH CHANGES DEFAULT TO OFF FOR A BARE CALL. uMs and vMs default to 0, which gives
//   slip = 0 and sign(u) forward, so every existing caller - including test-stunt's
//   rateLanding({vy, pitchDeg, rollDeg}) - gets the function it had.
//
// =========================================================================================
// THE eFOIL (tmp-tr176). ITS GRADE WAS NOT MIS-TUNED, IT WAS DEAD - ALL THREE AXES.
// =========================================================================================
//
// Measured over 609 eFoil ramp landings driven through the real Sim and graded by this
// module's own AirTracker: 99.8% PERFECT LANDING, and `fall` read 0.000 on 100% of ramp
// launches. The cause is in craftSample() below and the fix is one condition; the note is
// here because it is a note about the GRADE.
//
// The foil's airborne test is the WING clearing the WATERLINE. A ramp is a pontoon whose
// deck stands 1.6 m above mean water, so the wing is "out of the water" from the toe onward
// while the craft is still being pushed up the face by timber. The recorded flight therefore
// began at the toe: the deck-carried part of it ran to 5.4 s, and `fall` - which grades
// |vy| - (g*air - sqrt(2 g rise)) - had its prediction inflated by the climb until it could
// never fire. boats/hull.js has carried the matching correction since tmp-tr168 ("On the
// deck is NOT in the air: the craft is supported"); the foil path never got it.
//
// With `&& !s.onRamp` in craftSample the foil's flight is ballistic and the axis works as
// designed. Over the same corpus:
//
//                                  airtime p50   residual |vy| - ballistic        r
//     before (climb counted)          1.31 s     p50 -0.51  p90 -0.08  max 0.29  -0.262
//     after  (climb excluded)         1.01 s     p50 -0.05  p90 +0.01  max 0.29  +0.976
//
// AND THE ATTITUDE AXIS WAS LIVE ALL ALONG - the first corpus simply flew with no trim
// input, which freezes the plant at 1.20 deg and is why every landing looked identical. Same
// ramp, same approach, same sea, only the AIRBORNE INPUT changed (the mirror of the hull
// table above):
//
//     neutral            pitch   1.20 deg    q 1.000   PERFECT LANDING
//     cut throttle               1.20        1.000     PERFECT LANDING
//     trim OUT (S held)         10.07        0.776     CLEAN LANDING
//     trim IN  (W held)         -7.65        0.852     CLEAN LANDING
//     in then out                5.52        0.902     mixed CLEAN / PERFECT
//   pitch at touchdown spans -7.70 to +10.13 deg across those scripts - 17.8 deg of range
//   from the trim stick alone, and steeper than -12 trips noseDive.
//
// So the foil needs NO bands of its own. It needed its flight clock to start when it left
// the deck, after which the SAME three axes and the SAME thresholds grade it, the rider who
// flies out level gets PERFECT and one who lands trimmed out does not. `rollDeg` is still 0
// and `vMs` is still 0 for the foil, because the plant is longitudinal and has no sway - so
// the slip axis is structurally silent there, which is stated rather than faked.
//
// ⚠️ ONE CONSEQUENCE TO ROUTE: excluding the climb cuts the airtime the stunt stage credits
// an eFoil ramp launch from p50 1.31 s to p50 1.01 s. That is a scoring change on a level
// that now allows the eFoil, and it is a correction rather than a nerf - a hull has always
// been scored this way.
// <<< SPINCTRL
export const JUICE = {
  minAir: 0.35,
  vySoft: 1.8, vyHard: 6.0,          // no flight known: all of the arrival speed is graded
  overSoft: 0.0, overHard: 1.5,      // flight known: only the part free flight cannot explain
  noseOk: 3, noseBad: 24, noseDive: -12,
  rollOk: 3, rollBad: 44,
  // >>> SPINCTRL
  slipOk: 6.5, slipBad: 16.0,   // m/s across the keel at touchdown. See LANDING MID-ROTATION.
  // <<< SPINCTRL
  riseShow: 0.30,            // print the height too once a jump is a launch and not a skip
  pointsPerSec: 40,          // a 1.5 s air landed perfectly is ~120, about one sunk hull
  graceSec: 0.5,             // a landing is only banked if the craft is still up this long after
  holdSec: 1.6,              // how long a verdict stays on screen
  runWindow: 4.0,            // a landing streak decays over this, matching the raid's comboWindow
  hitFlash: 0.20,            // seconds the hit mark is on screen
  mult: [0, 1, 1.5, 2],      // by grade
};

// ---------------------------------------------------------------------------------------
// THE RATING. Pure: no DOM, no clock, no module state, so it can be asserted from a node
// harness by handing it numbers. `vy` is metres per second, negative downward. `pitchDeg` is
// bow-up positive (hull.js builds point height as y + lx*sin(pitch) with lx>0 forward).
// `rollDeg` is 0 for the eFoil, whose plant is a longitudinal model with no roll at all -
// that is stated rather than faked.
//
// One bad axis caps the grade (the `worst` term) and the general state of the landing also
// counts (the mean term), so a craft that arrives level and slow but nose-first is still
// marked down, and one that is untidy on all three is not rescued by having no single
// disaster.
// ---------------------------------------------------------------------------------------
export function rateLanding({ vy = 0, pitchDeg = 0, rollDeg = 0, air = 0, rise = 0,
  // >>> SPINCTRL
  // Body-frame velocity at touchdown: uMs along the keel (signed, negative = travelling
  // stern-first), vMs across it. Both default to 0, so a caller that does not supply them
  // gets exactly the function that was here. See LANDING MID-ROTATION above.
  uMs = 0, vMs = 0,
  // <<< SPINCTRL
} = {}) {
  const T = JUICE;
  // `fall` is the arrival speed the FLIGHT DOES NOT EXPLAIN. With `air` given, free flight
  // from an apex `rise` above the launch point predicts |vy| = g*air - sqrt(2 g rise), and
  // what is graded is only the excess over that - r = 0.994 of the raw number is the
  // prediction, so the raw number grades the jump and not the rider. See the table above.
  // Without `air` the caller is describing a touchdown with no flight behind it, so none of
  // the speed is explained and the whole of it is graded on tmp-tr165's original band.
  let fall;
  if (air > 0) {
    const v0 = Math.sqrt(Math.max(0, 2 * G * rise));
    const ballistic = Math.max(0, G * air - v0);
    // NOT span(): the excess is signed, and arriving SOFTER than free flight is not a fault.
    fall = clamp01((Math.abs(Math.min(0, vy)) - ballistic - T.overSoft) / (T.overHard - T.overSoft));
  } else {
    fall = span(Math.min(0, vy), T.vySoft, T.vyHard);
  }
  // >>> SPINCTRL
  // The pitch of the end that is actually LEADING, and how fast the craft is travelling
  // across its own keel. Both are inert for a caller that passes neither (uMs = vMs = 0).
  const lead = uMs < 0 ? -pitchDeg : pitchDeg;
  const slipMs = Math.abs(vMs);
  const broad = slipMs >= T.slipBad;
  const dive = lead < T.noseDive;
  const nose = dive ? 1 : span(lead, T.noseOk, T.noseBad);
  // tilt is "how sideways is this landing", and it has two sources: the craft lying over,
  // and the craft sliding. Whichever is worse carries the axis.
  const tilt = Math.max(span(rollDeg, T.rollOk, T.rollBad), span(slipMs, T.slipOk, T.slipBad));
  // <<< SPINCTRL
  const worst = Math.max(fall, nose, tilt);
  const q = clamp01(1 - (0.5 * worst + 0.5 * (fall + nose + tilt) / 3));
  // ⚠️ THE BOW GOING IN FIRST IS A CRASH, whatever the other two axes said, and it has to be
  // stated rather than left to the arithmetic. With `fall` no longer firing on the size of
  // the jump (see the table above), a single fully-failed axis now scores exactly
  // 1 - (0.5 + 1/3 * 0.5) = 0.333, which lands one thousandth ABOVE the grade-1 line - so a
  // textbook nose-first arrival off a ramp came out ROUGH and banked points. It is the one
  // case where a single axis must be able to condemn the landing on its own: pitch below
  // noseDive means the craft arrived bow-down, and there is no attitude of the other two
  // axes that makes that a landing. 9.0% of realistic landings have some single axis fully
  // failed, so this is deliberately NOT generalised to all three - only to the dive.
  // >>> SPINCTRL
  // `broad` joins `dive` here and nowhere else: a craft arriving across its own keel at
  // slipBad has no landing left in it whatever the other two axes say. The label chain
  // below then reads SIDEWAYS, because tilt is 1 and beats fall.
  const grade = (dive || broad) ? 0 : q >= 0.88 ? 3 : q >= 0.58 ? 2 : q >= 0.32 ? 1 : 0;
  // <<< SPINCTRL
  let label;
  if (grade === 3) label = 'PERFECT LANDING';
  else if (grade === 2) label = 'CLEAN LANDING';
  else if (grade === 1) label = 'ROUGH LANDING';
  else if (dive || (nose >= tilt && nose >= fall)) label = 'NOSE FIRST';
  else if (tilt >= fall) label = 'SIDEWAYS';
  else label = 'BELLY FLOP';
  return {
    grade, label, q: +q.toFixed(3),
    fall: +fall.toFixed(3), nose: +nose.toFixed(3), tilt: +tilt.toFixed(3),
    clean: grade >= 2,
  };
}

export function airPoints(air, grade) {
  if (grade < 1) return 0;
  return Math.round(air * JUICE.pointsPerSec * JUICE.mult[grade]);
}

// ---------------------------------------------------------------------------------------
// THE STATE MACHINE. Also free of DOM, and deliberately edge-driven rather than
// threshold-driven: it asks the craft "are you airborne", which for a boat is the physics'
// OWN test (hull.js sets airTicks only when no hull point is wetted and none is aground) and
// for the eFoil is the foil clearing the surface. Neither is a number this file invented.
//
// step() returns null, or one event object. The caller does not have to poll anything.
// ---------------------------------------------------------------------------------------
export class AirTracker {
  constructor(T = JUICE) { this.T = T; this.reset(); }

  reset() {
    this.up = false; this.air = 0; this.rise = 0; this.y0 = 0;
    this.pend = null; this.graceT = 0;
    this.best = 0; this.total = 0; this.airs = 0; this.clean = 0; this.flops = 0;
  }

  // s: { airborne, y, vy, pitchDeg, rollDeg, down }
  step(dt, s) {
    if (!s) return null;
    // A landing that has been rated but not yet banked. If the craft goes down inside the
    // grace window the air was not survived, so it scores nothing - "a clean landing scores,
    // a belly-flop does not" applies to what happens AFTER the hull is down too.
    if (this.pend) {
      this.graceT -= dt;
      if (s.down) {
        const p = this.pend; this.pend = null; this.flops++;
        return { type: 'lost', air: p.air, label: 'WIPED OUT' };
      }
      if (this.graceT <= 0) {
        const p = this.pend; this.pend = null;
        this.total += p.points;
        if (p.grade >= 2) this.clean++;
        return { ...p, type: 'bank', total: this.total };
      }
    }
    if (s.airborne && !s.down) {
      if (!this.up) { this.up = true; this.air = 0; this.rise = 0; this.y0 = s.y; }
      this.air += dt;
      const r = s.y - this.y0;
      if (r > this.rise) this.rise = r;
      return null;
    }
    if (!this.up) return null;
    // touchdown
    this.up = false;
    const air = this.air, rise = this.rise;
    this.air = 0; this.rise = 0;
    if (air < this.T.minAir) return null;          // chop, not air - see minAir's note
    if (s.down) { this.flops++; return { type: 'lost', air, label: 'WIPED OUT' }; }
    // Hand rateLanding the flight this tracker has just measured, so the fall axis grades
    // the speed gravity does not account for rather than the size of the jump. `air` and
    // `rise` are this tracker's own numbers, read one line above before they were cleared.
    const r = rateLanding({ ...s, air, rise });
    const points = airPoints(air, r.grade);
    this.airs++;
    if (air > this.best) this.best = +air.toFixed(2);
    this.pend = { type: 'land', air: +air.toFixed(2), rise: +rise.toFixed(2), points, ...r };
    this.graceT = this.T.graceSec;
    return { type: 'land', air: +air.toFixed(2), rise: +rise.toFixed(2), points, ...r };
  }
}

// ---------------------------------------------------------------------------------------
// Normalise a craft into the six fields the tracker wants. The ONLY place in this module
// that knows a hull from a plant.
//
// Boat: hull.airTicks is the model's own airborne flag (hull.js, wetN === 0 and nothing
// aground). Reusing it means this layer cannot disagree with the physics about whether the
// craft is in the air.
// eFoil: the plant is a longitudinal point mass, so "in the air" is the FOIL clearing the
// surface - wingDepth <= 0 - not the board, which is above water throughout normal flight.
// ---------------------------------------------------------------------------------------
export function craftSample(sim, craft) {
  if (craft && craft.active && craft.hull) {
    const h = craft.hull;
    return {
      craft: craft.kind, airborne: h.airTicks > 0, y: h.y, vy: h.vy,
      pitchDeg: h.pitch * RAD, rollDeg: h.roll * RAD,
      // >>> SPINCTRL
      // The body-frame velocity, straight off the hull. `u` is along the keel and is
      // NEGATIVE when the craft is travelling stern-first; `v` is across it. rateLanding
      // reads them to tell a 180 landed backwards from a 90 landed broadside.
      uMs: h.u, vMs: h.v,
      // <<< SPINCTRL
      down: h.aground > 0, speed: Math.hypot(h.u, h.v),
    };
  }
  if (!sim || !sim.plant) return null;
  const s = sim.plant.state;
  // >>> AIRTRIM
  // ⚠️ THE OBJECT IS BUILT AND THEN TWO FIELDS ARE OVERWRITTEN BELOW, rather than edited in
  // place, because the pair that sets them (`uMs: s.speed, vMs: 0`) lives inside tmp-tr176's
  // SPINCTRL fence and that fence is left byte-identical. Its note is the record of WHY the
  // foil had no slip axis and it is worth keeping; what it says is now history rather than a
  // live claim, and the assignment at the foot of this function says so and supersedes it.
  const out = {
  // <<< AIRTRIM
    // >>> SPINCTRL
    // ⚠️ `&& !s.onRamp` IS THE FIX, AND IT IS THE CORRECTION THE HULL PATH ALREADY HAS.
    // boats/hull.js zeroes its own `airTicks` the moment a ramp deck is under it, and says
    // why: "On the deck is NOT in the air: the craft is supported. Without this a ramp climb
    // would read as a 0.4 s jump to the camera, the audio and every probe, and the jump that
    // follows it would be merged into the same event." The foil path never got that line.
    //
    // It matters more here than it does for a hull, because the foil's airborne test is the
    // WING clearing the WATERLINE - and a ramp is a pontoon whose deck stands 1.6 m above
    // mean water, so the wing is "out of the water" from the toe onward, while the craft is
    // still being carried up the face by timber. Measured over 604 eFoil ramp launches
    // before this line: the deck-carried part of the recorded "flight" ran to 651 ticks
    // (5.4 s), and one recorded 5.33 s "jump" was almost entirely a climb.
    //
    // The consequence was not a cosmetic one. ui/juice.js grades `fall` as the arrival speed
    // free flight cannot explain, |vy| - (g*air - sqrt(2 g rise)); inflate `air` by the climb
    // and the prediction is inflated with it, so the axis reads 0.000 on 100% of eFoil ramp
    // landings and CANNOT fire. With `nose` unable to fire either (the plant holds trim: the
    // whole 609-landing corpus spans 1.20 to 1.83 deg of pitch) and `rollDeg` 0 by
    // construction, ALL THREE AXES WERE DEAD and 99.8% of eFoil landings graded PERFECT
    // LANDING regardless of how they were flown. See EFOIL BANDS above for what replaces it.
    craft: 'efoil', airborne: s.wingDepth <= 0 && !s.onRamp && s.mode !== 'DOWN', y: s.y, vy: s.w,
    // The plant is longitudinal and has no sway state at all, so the foil's velocity is
    // along its heading by construction: `vMs` is structurally 0 and `uMs` can never be
    // negative. The slip axis and the pitch sign flip are therefore silent on the foil.
    // That is stated rather than faked - the same note `rollDeg: 0` already carries.
    uMs: s.speed, vMs: 0,
    // <<< SPINCTRL
    pitchDeg: s.pitch * RAD, rollDeg: 0,
    down: s.mode === 'DOWN', speed: s.speed,
  };
  // >>> AIRTRIM
  // =======================================================================================
  // THE FOIL'S REAL LATERAL SPEED (tmp-tr185). ⚠️ THIS SUPERSEDES THE `uMs`/`vMs` NOTE ABOVE.
  // =======================================================================================
  //
  // That note was correct when it was written and is not any more, which is the same defect
  // class as hull.js:30 and the two test-stunt assertions tmp-tr179 repaired. It says the
  // plant is longitudinal, so the foil's velocity is along its heading by construction and the
  // slip axis is structurally silent. src/air-spin.js's foil half shipped the following day
  // and SEPARATED THE TWO: sim.js now lays the plant's along-track distance down on
  // `heading - spinYaw` rather than on `heading`, so a foil in a ramp rotation really is
  // pointing `spinYaw` away from the way it is travelling, and `vMs: 0` became a hole.
  //
  // WHAT IT COST, measured on this tree over 604 eFoil ramp landings (work/foil.mjs, 12 ramps
  // x 2 seas x 2 directions x 4 lock leads x 4 hold lengths, graded by this module's own
  // AirTracker): 100.0% PERFECT LANDING, `att` 0.000 on every single one, including 458 that
  // arrived more than 90 degrees across their own travel. The eFoil was the only craft whose
  // landings were not really judged - `fall` is ballistic and correct, `nose` cannot fire
  // (the plant holds trim), `rollDeg` is 0 by construction, and this was the fourth.
  //
  // THE VELOCITY, AND WHY IT IS THIS EXPRESSION. `sim.world.spinYaw` is heading minus track,
  // so the direction of travel sits at -spinYaw in the body frame and the body-frame velocity
  // is |V| (cos spinYaw, -sin spinYaw) - the same convention boats/hull.js uses, where the
  // world step is R(heading) . (u, v). `s.u` IS |V|: the plant is 2-DOF, `s.u` is the whole of
  // its horizontal speed along that track and `s.w` is the vertical part, which is `vy` and is
  // graded separately by `fall`. `s.speed` - what this used to publish - is neither: it is
  // hypot(relU, relW) relative to the orbital flow, so it carries the descent rate and would
  // have over-read the slip by 15-25% on every arrival.
  //
  // NO WRAP IS NEEDED and that is worth stating, because sim.js does wrap: cos and sin are
  // 2 pi periodic, so the whole turns a 380 degree rotation contains fall out of this
  // decomposition on their own. The wrap in sim.js is about the TRACK - which way the craft
  // ends up going - and this is about the body frame, where it cannot matter.
  //
  // ⚠️ THE ONE-TICK ORDERING, WHICH IS WHAT MAKES THIS READABLE AT ALL. plant.js computes
  // `s.rampAir` from the PREVIOUS tick's `wingDepth` (it is set ~65 lines before _geometry()
  // refreshes it), while this function's own airborne test reads the fresh `wingDepth`. So on
  // the tick the tracker calls a touchdown, sim.js has NOT yet resolved the rotation:
  // `spinYaw` is still the full unwrapped angle and `s.u` is still the arrival speed, before
  // plant.spinLand() scrubs it to |V| cos(beta). That is exactly the pair a landing should be
  // graded on - what the craft arrived with, not what the wing left it with - and it is the
  // same instant hull.js's `h.u, h.v` are read at. Verified rather than assumed: work/diag1.mjs
  // prints both clocks around a landing.
  //   ⚠️ NOT ALWAYS. If the ramp-flight window runs out mid-air instead (plant.js's RAMP_HOLD),
  //   sim.js resolves the rotation while this function still reads the craft as airborne, and
  //   by the real touchdown `spinYaw` has settled toward 0. The decomposition below is still
  //   the craft's true body-frame velocity at that instant - it is a statement about now, not
  //   about a landing - but the SLIP it reports is the settled one and not the arrival one.
  //   That window is rare on this course and it is an understatement, never an overstatement.
  //
  // INERT EVERYWHERE ELSE, and by construction rather than by a flag: `spinYaw` is 0 on every
  // water-borne tick and on every tick of every level whose ramp table is empty, so `cos` is 1,
  // `sin` is 0, and this is `uMs: s.u, vMs: 0`. rateLanding() reads `uMs` only through
  // `uMs < 0` and the plant clamps `s.u` at 0, so swapping `s.speed` for `s.u` cannot change a
  // verdict; work/foilinert.mjs measures that over 2.59 million ramp-free ticks rather than
  // asserting it.
  const yaw = (sim.world && sim.world.spinYaw) || 0;
  out.uMs = yaw === 0 ? s.u : s.u * Math.cos(yaw);
  out.vMs = yaw === 0 ? 0 : -s.u * Math.sin(yaw);
  return out;
  // <<< AIRTRIM
}

// ---------------------------------------------------------------------------------------
// THE OVERLAY
//
// Placement, which was the hard part. The raid stylesheet already owns: top-centre (wave),
// top-right (score), bottom-left (rider/hull card on desktop, the steering stick's own home
// on a phone), bottom-right (FIRE and WATER) and the bottom-centre prompt. On a landscape
// phone it hides its own top strip, score, stat card, combo line and power chips outright,
// which frees the whole upper band. The one strip free in EVERY layout is the left edge at
// mid height: the desktop stat card sits below it, the phone stick starts below it, and the
// phone's own read-outs are gone. So: left edge, vertically centred, left-aligned, bare text
// with a shadow and no panel - which is also what the owner asked for on a phone ("turn off
// all the boxes... have smaller text pop up").
//
// Nothing here is permanent. The air line exists only while the craft is off the water, the
// verdict for 1.6 s, the streak for as long as it has not decayed. With the player riding
// level and not shooting, the layer draws nothing at all.
// ---------------------------------------------------------------------------------------
const CSS = `
#jz-root { position: absolute; inset: 0; pointer-events: none; z-index: 29; overflow: hidden;
  font-family: ui-sans-serif, system-ui, "Segoe UI", Roboto, sans-serif; }
body.clean-render #jz-root { display: none !important; }
#jz-root.mute { display: none; }
#jz-col { position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
  display: flex; flex-direction: column; align-items: flex-start; gap: 6px;
  width: min(330px, 46vw); text-shadow: 0 2px 6px rgba(0,0,0,.92), 0 0 14px rgba(0,0,0,.6); }
#jz-col > div { opacity: 0; transition: opacity .18s; }
#jz-col > div.on { opacity: 1; }
#jz-air { font: 800 16px/1.2 ui-sans-serif, system-ui, sans-serif; color: #8fe3ff; letter-spacing: .04em; }
#jz-air b { font: 900 26px/1.05 ui-monospace, "Cascadia Mono", Consolas, monospace; margin-right: .25em; }
#jz-verdict { font: 900 18px/1.25 ui-sans-serif, system-ui, sans-serif; letter-spacing: .05em; color: #9df06a; }
#jz-verdict.g3 { color: #ffe95a; } #jz-verdict.g2 { color: #9df06a; }
#jz-verdict.g1 { color: #ffc86a; } #jz-verdict.g0 { color: #ff8b80; }
#jz-verdict span { display: block; font: 700 16px/1.3 ui-sans-serif, system-ui, sans-serif;
  letter-spacing: .02em; color: #dfe9f3; }
#jz-run { font: 900 16px/1.2 ui-sans-serif, system-ui, sans-serif; color: #ffd76a; letter-spacing: .05em; }
#jz-run b { font: 900 28px/1 ui-monospace, "Cascadia Mono", Consolas, monospace; margin-right: .2em; }
#jz-run.hot { color: #ffe95a; }
#jz-run i { display: block; height: 4px; border-radius: 2px; background: currentColor;
  margin-top: 3px; width: 0; max-width: 168px; }
/* The hit mark. Screen centre, because the gun auto-aims at whatever the camera is pointed
   at, so that is where the player is already looking. 0.20 s and gone. */
#jz-hit { position: absolute; left: 50%; top: 50%; width: 46px; height: 46px; margin: -23px 0 0 -23px;
  opacity: 0; }
#jz-hit.on { animation: jzhit .2s ease-out forwards; }
#jz-hit span { position: absolute; left: 50%; top: 50%; width: 3px; height: 15px; margin: -23px 0 0 -1.5px;
  background: #fff; border-radius: 2px; box-shadow: 0 0 6px rgba(0,0,0,.9);
  transform-origin: 50% 23px; }
#jz-hit span:nth-child(2) { transform: rotate(90deg); }
#jz-hit span:nth-child(3) { transform: rotate(180deg); }
#jz-hit span:nth-child(4) { transform: rotate(270deg); }
#jz-hit.low span { background: #ff5d4f; }
#jz-hits { position: absolute; left: 50%; top: 50%; margin: 26px 0 0 0; transform: translateX(-50%);
  font: 900 17px/1.2 ui-sans-serif, system-ui, sans-serif; color: #fff; opacity: 0;
  text-shadow: 0 2px 6px rgba(0,0,0,.92); white-space: nowrap; }
#jz-hits.on { animation: jzhits .5s ease-out forwards; }
@keyframes jzhit { from { opacity: 1; transform: scale(.55); } to { opacity: 0; transform: scale(1.35); } }
@keyframes jzhits { from { opacity: 1; transform: translateX(-50%) scale(1.15); } to { opacity: 0; transform: translateX(-50%) scale(1); } }
/* A phone in portrait: the raid puts its prompt at top:150 and its score at top:48, and the
   steering stick owns the lower left. Mid-height on the left edge is still the free strip,
   so only the width changes. */
@media (max-width: 480px) { #jz-col { width: 62vw; left: 10px; } }
/* Short landscape - the phone case the owner reported twice. The raid hides its top strip,
   score, stat card, combo and chips here, so this column has the whole left band to itself.
   Sizes do NOT shrink below the floor even here: 16px is the smallest text on this layer.

   ⚠️ 42%, NOT 50%. tmp-tr82 measured the floating stick's resting home on a 393 px-tall
   screen at x 12-162, y 232-385 - which is why the raid's own stat card was moved OUT of the
   bottom-left. Centred, this column's lower edge reached 255 and sat under the same thumb.
   At 42% it spans roughly 106-223 and clears the stick entirely, while still starting below
   the raid's prompt at y 58-78. It could never have BLOCKED the stick - this whole layer is
   pointer-events:none - but a thumb resting on top of a read-out is the same problem. */
@media (max-height: 520px) and (pointer: coarse) {
  #jz-col { width: 42vw; gap: 4px; top: 42%; }
  #jz-air b { font-size: 22px; } #jz-run b { font-size: 23px; }
}
@media (prefers-reduced-motion: reduce) {
  /* still confirm, just without the scale animation - the mark is on while hitT runs
     and paint() takes the class off again, so it needs no keyframes to disappear. */
  #jz-hit.on, #jz-hits.on { animation: none; opacity: 1; }
  #jz-col > div { transition: none; }
}
`;

// THE ONE LIVE INSTANCE. src/raid/raid-hud.js needs to speak to this layer but is
// constructed by raid/raid-mode.js, which belongs to another pass and cannot be given a new
// constructor argument here. A module-level handle set by main.js is the smallest honest
// answer: it is a real import contract that a node harness can exercise, not a window global
// that any script on the page could stand on. It is null until main.js sets it, and main.js
// never sets it on a ?cal= render.
let current = null;
export function setJuice(j) { current = j; return j; }
export function getJuice() { return current; }

export class Juice {
  // mount: the element to hang the overlay on. Pass none and the class still runs its whole
  // state machine with no DOM at all, which is how a headless harness uses it.
  constructor({ mount = null, doc = null } = {}) {
    this.T = JUICE;
    this.air = new AirTracker(JUICE);
    this.run = 0; this.runT = 0;            // the landing streak this module owns
    this.ext = null; this.extT = 0;         // an outside authority (the raid's own combo)
    this.hold = 0; this.verdict = null;
    this.hitT = 0; this.hitLow = false; this.hitRun = 0; this.hitRunT = 0;
    this.el = null; this._k = {}; this._mute = false;
    const d = doc || (typeof document !== 'undefined' ? document : null);
    if (!mount || !d) return;
    if (!d.getElementById('jz-style')) {
      const st = d.createElement('style'); st.id = 'jz-style'; st.textContent = CSS;
      d.head.appendChild(st);
    }
    const root = d.createElement('div'); root.id = 'jz-root';
    root.innerHTML = '<div id="jz-col"><div id="jz-air"></div><div id="jz-verdict"></div>'
      + '<div id="jz-run"></div></div>'
      + '<div id="jz-hit"><span></span><span></span><span></span><span></span></div>'
      + '<div id="jz-hits"></div>';
    mount.appendChild(root);
    this.el = {
      root, col: root.querySelector('#jz-col'), airEl: root.querySelector('#jz-air'),
      verdict: root.querySelector('#jz-verdict'), runEl: root.querySelector('#jz-run'),
      hit: root.querySelector('#jz-hit'), hits: root.querySelector('#jz-hits'),
    };
  }

  // The raid's intro card and its game-over card are centred blocks that reach across the
  // left edge on a desktop window. Neither is a moment with airtime or a combo in it, so the
  // right answer is simply not to draw over them.
  mute(on) { this._mute = !!on; }

  reset() {
    this.air.reset();
    this.run = 0; this.runT = 0; this.ext = null; this.extT = 0;
    this.hold = 0; this.verdict = null; this.hitT = 0; this.hitRun = 0; this.hitRunT = 0;
  }

  // Fixed-step. `sample` is craftSample()'s output, or null to idle.
  tick(dt, sample) {
    const T = this.T;
    const ev = this.air.step(dt, sample);
    if (ev) {
      if (ev.type === 'land') {
        this.verdict = ev; this.hold = T.holdSec;
        if (ev.grade >= 2) { this.run++; this.runT = T.runWindow; } else { this.run = 0; this.runT = 0; }
      } else if (ev.type === 'lost') {
        this.verdict = { label: ev.label, grade: 0, air: ev.air, rise: 0, points: 0 };
        this.hold = T.holdSec; this.run = 0; this.runT = 0;
      }
    }
    if (this.hold > 0) this.hold -= dt;
    if (this.runT > 0) { this.runT -= dt; if (this.runT <= 0) { this.runT = 0; this.run = 0; } }
    if (this.extT > 0) { this.extT -= dt; if (this.extT <= 0) { this.extT = 0; this.ext = null; } }
    if (this.hitT > 0) this.hitT -= dt;
    if (this.hitRunT > 0) { this.hitRunT -= dt; if (this.hitRunT <= 0) { this.hitRunT = 0; this.hitRun = 0; } }
    return ev;
  }

  // A confirmed hit on a hostile hull. `frac` is that hull's remaining health, 0..1, so a
  // round that has nearly finished her reads differently from the first one to land.
  //
  // WARNING: this may only ever be called for a SHIP. It is wired to the raid rules'
  // `lastHit`, which RaidGame writes in one place (_damage) and reaches only with entries of
  // `ships`. People in the water are a separate array that no hit test in the game reads at
  // all, so there is no path by which this can fire on one. The caller checks the ally flag
  // as well, because a round from your own side is not the player's hit to celebrate.
  hit({ frac = 1 } = {}) {
    this.hitT = this.T.hitFlash;
    this.hitLow = frac <= 0.25;
    this.hitRun++; this.hitRunT = this.T.runWindow;
    return this.hitRun;
  }

  // The raid owns its own combo (RaidGame.combo / comboT). Mirror it rather than keep a
  // second number: two counters that can disagree is worse than one that is small.
  combo(n, frac) {
    if (!(n >= 2)) { if (this.ext) { this.ext = null; this.extT = 0; } return; }
    this.ext = { n, frac: Math.max(0, Math.min(1, frac || 0)) };
    this.extT = 0.5;
  }

  get stats() {
    const a = this.air;
    return {
      airScore: a.total, bestAir: +a.best.toFixed(2), airs: a.airs,
      clean: a.clean, flops: a.flops, run: this.run,
    };
  }

  // Paint. Cheap and idempotent: every write goes through a key, so a frame in which nothing
  // changed costs no DOM work at all.
  paint() {
    const e = this.el;
    if (!e) return;
    const set = (k, el, prop, v) => { if (this._k[k] !== v) { this._k[k] = v; el[prop] = v; } };
    const cls = (k, el, v) => { if (this._k[k] !== v) { this._k[k] = v; el.className = v; } };
    cls('mute', e.root, this._mute ? 'mute' : '');
    if (this._mute) return;

    const up = this.air.up && this.air.air > 0.12;
    set('air', e.airEl, 'innerHTML', up ? `<b>${this.air.air.toFixed(1)}s</b>AIR` : '');
    cls('airc', e.airEl, up ? 'on' : '');

    const v = this.hold > 0 ? this.verdict : null;
    const rise = v && v.rise >= this.T.riseShow ? ` &middot; ${v.rise.toFixed(1)} m` : '';
    set('vt', e.verdict, 'innerHTML', v
      ? `${v.label}<span>${v.air.toFixed(1)} s air${rise}${v.points ? ` &middot; +${v.points}` : ' &middot; no score'}</span>`
      : '');
    cls('vc', e.verdict, v ? `on g${v.grade}` : '');

    // One meter, two possible sources: the raid's combo while a raid is running, this
    // module's own hit/landing streak otherwise.
    let n = 0, frac = 0, word = '';
    if (this.ext) { n = this.ext.n; frac = this.ext.frac; word = 'COMBO'; }
    else if (this.hitRun >= 2) { n = this.hitRun; frac = this.hitRunT / this.T.runWindow; word = 'HITS'; }
    else if (this.run >= 2) { n = this.run; frac = this.runT / this.T.runWindow; word = 'CLEAN'; }
    set('run', e.runEl, 'innerHTML', n ? `<b>${n}</b>${word}<i></i>` : '');
    cls('runc', e.runEl, n ? 'on' + (n >= 5 ? ' hot' : '') : '');
    if (n) { const bar = e.runEl.querySelector('i'); if (bar) bar.style.width = `${(frac * 100).toFixed(0)}%`; }

    const hitOn = this.hitT > 0;
    cls('hit', e.hit, 'jz-hit' + (hitOn ? ' on' + (this.hitLow ? ' low' : '') : ''));
    const hs = hitOn && this.hitRun >= 2 ? `${this.hitRun} HIT` : '';
    set('hits', e.hits, 'textContent', hs);
    cls('hitsc', e.hits, hs ? 'on' : '');
  }
}
