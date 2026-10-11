// AIR SPIN - an ARCADE ASSIST. It is named, it is separately tunable, it is not physics,
// and it says so here rather than hiding inside boats/hull.js. src/assist.js sets the
// house rule for this class of thing: "Every function in here is a named cheat."
//
// ---------------------------------------------------------------------------------------
// WHY IT EXISTS, AND WHY IT IS NOT A PHYSICS FIX
//
// The stunt stage scores NET YAW SWEPT WHILE AIRBORNE, and rotation is not reachable in
// this model. tmp-tr174 proved that closed-form and the algebra is worth restating, because
// it is what rules out doing this honestly:
//
//     yaw rate capped by lateral grip         r_max = aSteer / u
//     airtime off a face of angle theta       t     = 2 u sin(theta) / g
//     carried rotation                        r_max * t = 2 aSteer sin(theta) / g
//
// THE APPROACH SPEED CANCELS. With the ramp face at 20 deg that ceiling is 47.9 deg on the
// jetski (aSteer 12) and 27.9 deg on the speedboat (aSteer 7), and the measured best is
// 39.6 / 22.0 - 79-83% of a ceiling that is nowhere near a half turn. A 180 would need
// aSteer ~ 45 m/s^2, which is 4.6 g of steering authority on a jet ski.
//
// tmp-tr174 then tried the one real modelling gap - the ramp deck's horizontal reaction is
// applied at the CG with no lever arm, while the same contact's VERTICAL half gets both a
// pitch and a roll moment - and reached 124.9 deg with it. It then decomposed the result,
// found it dominated by incidental roll asymmetry rather than by carving (dead-straight,
// wheel-centred jumps picked up a random 0-32 deg), called it "a lottery, not a trick" and
// did not ship it. That was the right call and this file does not reopen it.
//
// So the rotation is granted OUTRIGHT, by a control the rider holds, and it is labelled.
//
// ---------------------------------------------------------------------------------------
// WHAT IT DOES, EXACTLY
//
// While the craft is airborne - the model's OWN test, hull.js's `airTicks > 0`, which needs
// every hull point clear of the water, clear of the sand AND clear of a ramp deck - the
// steering input drives a yaw rate that is added to the craft's HEADING and to nothing
// else. It does NOT write the hull's yaw rate `r`, and that is deliberate:
//
//   * IT COMPOSES WITH CONSERVATION INSTEAD OF REPLACING IT. hull.js conserves the yaw rate
//     carried off the ramp (tmp-tr174's AIRFEEL fence). That rate goes on integrating into
//     the heading underneath this, so carving into a take-off still helps and the assist
//     adds to it. Total swept yaw is the integral of the two.
//   * THE HULL LANDS WITH THE YAW RATE THE PHYSICS GAVE IT, not with an assist rate that
//     then has to be taken away again. There is nothing to withdraw at touchdown: the
//     assist simply stops being applied, and the `r` that enters the water model is the
//     value the water model would have seen anyway.
//
// THE BODY VELOCITY IS COUNTER-ROTATED BY THE SAME ANGLE, and that is what makes this a
// spin rather than a swerve. hull.js carries velocity in the BODY frame (u along the keel,
// v across it) and the world velocity is R(heading) . (u, v). Rotating the heading by dPsi
// and leaving (u, v) alone would rotate the world velocity with it - the craft would fly a
// circular arc in mid-air and land back near where it launched. Applying R(-dPsi) to (u, v)
// in the same tick leaves the world velocity EXACTLY where it was, so the craft carries on
// down the parabola it left the ramp on while the hull turns underneath the rider. That is
// the identity hull.js's own kinematic coupling (du = aF + v r, dv = aS - u r) already
// expresses; this is the same transform applied in one step instead of integrated.
//
// The one thing it does not model: pitch and roll are body-frame attitudes and are left
// alone, so a craft spun 180 deg while nose-high stays nose-high rather than having its
// attitude rotated about the world vertical. At the pitch angles that actually occur
// (hull.js clamps at +-51.6 deg; p50 at touchdown is 7.7 deg) the difference is small, and
// pretending otherwise would need a quaternion attitude the hull does not have.
//
// ---------------------------------------------------------------------------------------
// THE NUMBERS, AND WHERE THEY CAME FROM (tmp-tr176, SPINCTRL)
//
// RATE is derived from the AIRTIME DISTRIBUTION this model actually produces, measured over
// 6,360 qualifying ramp launches (12 ramps x 5 entry angles x 3 offsets x 3 steering
// scripts x 2 lock leads x 2 craft x 3 sea states) and the 224 launches taken while riding
// the course ramp to ramp:
//
//                    airtime  p10    p50    p90    p95    max
//     jetski                  0.75   1.31   1.68   1.78   2.36
//     speedboat               0.53   0.93   1.22   1.31   1.98
//
// The assist ramps in exponentially, so the angle swept in a flight of t seconds is
// rate * (t - tau * (1 - e^-t/tau)) and NOT rate * t. At 240 deg/s and tau 0.12 s:
//
//     0.067 s  (the MEDIAN free-world chop hop)         3.7 deg  <- nothing, by construction
//     0.34  s  (p90 free-world hop)                      54 deg
//     0.93  s  (speedboat MEDIAN ramp jump)             194 deg  <- a 180 with margin
//     1.31  s  (jetski MEDIAN ramp jump)                286 deg  <- not a 360; needs a launch
//     1.78  s  (jetski p95 ramp jump)                   398 deg  <- a 360 off the big ones
//     2.36  s  (the biggest jump measured)              538 deg
//
// So a 180 is comfortable on a median jump on EITHER craft, a 360 needs a top-decile launch,
// and the difference between the two craft is their own airtime rather than a second table
// of constants. ONE RATE, BOTH HULLS.
//
// TAU 0.12 s is the whole chop filter, and it is why there is no dwell threshold. A dwell
// would put a discontinuity in the feel - nothing at all, and then a control - at an instant
// the rider cannot see. The exponential does the same job continuously: 14 ticks at 120 Hz
// is a visible ramp rather than a step, it costs rate*tau = 28.8 deg out of a long flight
// (under a sixth of a 180), and it hands a 67 ms wave skip 3.7 deg, which is not a pirouette.
// It is also deliberately crisper than either hull's own water-borne yaw lag (tauYaw 0.18
// jetski / 0.40 speedboat), because an arcade control should answer faster than water does.
//
// NO EXTRA DEAD ZONE. Every input path has already applied its own before `turn` reaches the
// hull (mouse 0.10, touch stick 0.08 of stick radius, gamepad 0.12), and a second one here
// would be applied on top and would quietly cost the rider the bottom of the stick.
//
// ---------------------------------------------------------------------------------------
// ⚠️ THE GATE: ONLY A FLIGHT THAT LAUNCHED OFF A RAMP DECK IS ARMED. THIS WAS MEASURED.
//
// The first build of this file had no gate: airborne was airborne. It was then run over
// tmp-tr174's own free-world corpus - 18 rides of 600 s, 2 craft x 3 sea states x 3 held
// turn rates, full throttle, the population the landing grades were derived from - and it
// changed free riding outright:
//
//                                landings   |sideslip| at touchdown   drift heading-to-track
//     without the assist            348      p50 2.53  max  6.04 m/s   p50  7.7  max  53.8 deg
//     ungated assist                171      p50 11.11 max 19.77 m/s   p50 39.3  max 146.7 deg
//
// A rider holding lock now pirouettes off ordinary chop, lands across her own keel, scrubs
// the speed off and jumps half as often. That is the free world, the rescue and both raids,
// all of which are steered and all of which the brief says depend on current turn authority.
//
// A DWELL THRESHOLD CANNOT FIX IT, and this is the measurement that settles it. Free-world
// airborne runs and ramp launches OVERLAP:
//
//     free-world wave hops     p50 0.067   p90 0.342   p95 0.492   p99 0.817   max 1.183 s
//     speedboat ramp jumps     p10 0.53    p50 0.93                            max 1.98  s
//
// Any dwell high enough to sit above an ordinary free-world hop eats a third to a half of a
// speedboat's ramp jump, and any dwell cheap enough to leave the ramp jump intact still fires
// on hundreds of chop skips. There is no cut between the two populations, so the gate cannot
// be the clock. It is the LAUNCH.
//
// `fromRamp` latches hull.js's own `onRamp` on the last supported tick before a flight, so
// the assist arms for a craft that left a deck and for nothing else. gl/ramps.js's `RAMPS`
// is EMPTY in every level but the stunt stage, so outside that stage `onRamp` is 0 on every
// tick of every craft and this assist is not merely water-inert, it is a no-op: the free
// world, the rescue, both raids, the Harbour Mouth and the smuggling run are bit-identical.
// It is the same argument foil-ramp.js makes about itself, and it is checkable rather than
// asserted - `armed`, `skipped` and `wetActs` below all count.
//
// ⚠️ This is NARROWER than the brief asked for; the brief said "in the air", not "off a
// ramp". Setting `rampOnly: false` removes the gate and restores the behaviour in the table
// above, which is a coordinator's call and not a builder's. The numbers are here so it can
// be made with them.
//
// ---------------------------------------------------------------------------------------
// AUDITABLE AT RUNTIME, the way foil-ramp.js's flight window publishes its own counters
//
// The counters below are not decoration. `wetActs` is this file's own claim about itself -
// the number of times the assist has moved a craft that was not airborne - and it must read
// 0 for the life of a session. `deg` and `swept` are what it has actually granted, so a
// probe can ask how much of a rotation was flown and how much was assisted.
// ---------------------------------------------------------------------------------------

// Degrees per second and seconds. Kept in one exported object so a probe - or a future
// difficulty preset - can read or change them without reaching into the hull.
export const AIR_SPIN = {
  rate: 240,      // deg/s at full lock. See the airtime table above.
  tau: 0.12,      // s, exponential ramp-in. The chop filter.
  rampOnly: true, // ⚠️ arm only a flight that launched off a ramp deck. See THE GATE below.
};

// >>> EFOILSPIN
// ---------------------------------------------------------------------------------------
// THE eFOIL'S OWN RATE, AND WHY IT IS NOT THE HULLS'. NOTHING ABOVE THIS LINE CHANGES.
//
// `AIR_SPIN` is untouched, byte for byte, and so is the class below it. boats/hull.js goes on
// constructing `new AirSpin()` with no argument and therefore goes on reading that object.
// tmp-tr179 re-ran tmp-tr176's own envelope sweep on the tree before and after this file was
// edited: jetski 441.9 deg and speedboat 302.6 deg, identical to the digit on both.
//
// WHY A SECOND NUMBER AT ALL - and it is not feel, it is a different constraint in kind.
//
// "ONE RATE, BOTH HULLS" above is right for hulls because a hull's landable rotations are
// CONTINUOUS: boats/hull.js carries a lateral velocity `v`, so a hull that lands 90 deg
// across its keel really does slide, ui/juice.js grades the slide, and everything from 0 to
// 180 is a landing of some quality. A foil has no such state. src/plant.js is surge and
// heave with no sway and no astern, so a misalignment cannot be carried past the landing
// tick at all: it resolves into the component along the board, |V| cos(beta), and what is
// across the board is destroyed. Measured on this tree, a foil keeps enough of its speed to
// go on flying only up to about 44 deg of residual (src/plant.js's wash-out, derived from
// this model's own lift law). SO THE ONLY ROTATION A FOIL CAN LAND IS A WHOLE TURN.
//
// That makes the rate's job binary rather than tasteful: either 360 deg fits inside a jump
// this craft can actually get, or the mechanic is "spin, then wash out". At 240 deg/s it does
// not fit. Measured over 792 qualifying foil ramp launches (12 ramps x 7 approaches x 2
// directions x 6 lock leads x 6 hold lengths):
//
//     eFoil airtime off a ramp   p10 0.65   p50 1.00   p90 1.10   max 1.15 s
//     rotation flown at 240 deg/s                      max 274.1 deg   <- never a turn
//
// The foil's MEDIAN jump is about the speedboat's (1.00 against 0.93 s) and its BEST is barely
// above that median (1.15 against the speedboat's 1.98 and the jetski's 2.36). It is the
// missing tail, not the middle, that decides this: there is no top-decile launch on a foil to
// spend a rotation in. tmp-tr174 §3 measured why - the motor is on the fuselage and plant.js
// gates thrust on `immersed`, so the instant the wing clears the water the craft is coasting
// and the whole climb is paid out of momentum, arriving at the toe at 14 m/s and leaving the
// crest at 11.
//
// THE RATE IS THEN SWEPT, NOT CHOSEN, against air-spin.js's own hull rule - a 360 on a
// TOP-DECILE jump and not on a median one. Landed 360s (residual inside the wash-out, so
// actually ridden away from), by rate:
//
//     rate      330     350     367     380     400     420     450
//     landed    49      80      140     154     141     119      39
//     airtime   1.15    1.10    1.06    1.01    1.01    1.00    1.01   <- p50 of those jumps
//     ramps     2/12    3/12    3/12    4/12    4/12    4/12    4/12
//
// 350 is the rate whose threshold sits exactly on the measured p90 of 1.10 s: below it a turn
// needs the single best jump on the course, above it a median jump will do. It is the round
// number in [340, 378), which is the same bound in closed form once the 27 deg that _steer's
// own carve contributes is taken off (360 = rate*(t - tau) + 27 at t = 1.10 and t = 1.00).
//
// TAU IS THE HULLS' 0.12 s AND IS NOT RE-DERIVED. It is a filter on chop, the foil's chop is
// the same chop, and the argument above for why it is an exponential rather than a dwell is
// unchanged. It costs rate*tau = 42 deg out of a long flight here instead of 28.8.
//
// `rampOnly` is true for the same reason and by a stronger mechanism: the foil's gate is
// src/foil-ramp.js's ramp-flight window, which cannot open without a deck tick.
export const AIR_SPIN_FOIL = {
  rate: 350,      // deg/s at full lock. A whole turn in a top-decile jump; see the table.
  tau: 0.12,      // s. The hulls' chop filter, unchanged.
  rampOnly: true,
};
// <<< EFOILSPIN

const DEG = Math.PI / 180;

export class AirSpin {
  constructor(T = AIR_SPIN) { this.T = T; this.reset(); }

  reset() {
    this.rate = 0;        // rad/s the assist is currently granting
    this.air = 0;         // s airborne in the current flight
    this.swept = 0;       // deg added in the current flight (signed)
    this.deg = 0;         // deg added since reset - the whole cheat, in one number
    this.fromRamp = false; // did the last supported tick have a ramp deck under it?
    this.airTicks = 0;    // ticks offered while airborne
    this.wetTicks = 0;    // ticks offered while NOT airborne
    this.armed = 0;       // airborne ticks the gate allowed
    this.skipped = 0;     // airborne ticks the gate refused (no ramp launch behind them)
    this.wetActs = 0;     // ⚠️ times it moved a craft that was not airborne. MUST STAY 0.
  }

  // Returns the heading change in RADIANS to apply this tick, and exactly 0 on every tick
  // the craft is not airborne. `airborne` and `onRamp` are the CALLER'S own tests - this
  // file invents neither. Nothing else on the object is read by the caller.
  step(turn, dt, airborne, onRamp) {
    if (airborne) { this.airTicks++; this.air += dt; } else { this.wetTicks++; }
    const armed = airborne && (!this.T.rampOnly || this.fromRamp);
    if (airborne) { if (armed) this.armed++; else this.skipped++; }
    if (armed) {
      const want = (+turn || 0) * this.T.rate * DEG;
      this.rate += (want - this.rate) * Math.min(1, dt / Math.max(1e-3, this.T.tau));
    } else {
      // NOT a decay. On touchdown the assist rate is dropped outright rather than unwound,
      // so nothing is ever subtracted from a craft that has just landed - the yaw rate it
      // arrives with is the one hull.js's conservation gave it.
      this.rate = 0; this.air = 0; this.swept = 0;
    }
    // Latched on the last SUPPORTED tick, which is the only tick that knows what the craft
    // was standing on when it left. A splash-down between two hops clears it, so a bounce
    // off the water after a ramp jump is a new flight and is not armed.
    if (!airborne) this.fromRamp = !!onRamp;
    const d = this.rate * dt;
    if (d === 0) return 0;
    // ⚠️ THE INVARIANT, ENFORCED RATHER THAN ASSERTED. This is the last gate before a
    // non-zero angle leaves the object, and it is the only place the claim "it never moves
    // a craft that is not airborne" is actually made true. Today the branch above cannot
    // reach it with a non-zero rate; it is here so that an edit which broke that would be
    // COUNTED and blocked instead of shipping quietly. A probe reads `wetActs` and it must
    // be 0.
    if (!airborne) { this.wetActs++; return 0; }
    const g = d / DEG;
    this.swept += g; this.deg += Math.abs(g);
    return d;
  }
}
