// AIR TRIM - an ARCADE ASSIST. It is named, it is separately tunable, it is not physics,
// and it says so here rather than hiding inside boats/hull.js. src/assist.js sets the house
// rule for this class of thing: "Every function in here is a named cheat." src/air-spin.js
// (tmp-tr176) is the pattern this file follows, line for line, including the gate, the
// exponential ramp-in and the runtime counters - because that assist shipped, was measured,
// and is auditable, and the fastest way to be wrong here is to invent a second shape.
//
// ---------------------------------------------------------------------------------------
// WHY IT EXISTS: A HULL HAS NO AIRBORNE PITCH AUTHORITY AT ALL
//
// boats/hull.js builds its pitch moment as
//
//     mp += this.kPitch * tauEq * wet          (the dynamic trim moment, rider trim in it)
//     this.q += (mp / this.iPitch - this.q * P.pitchDampAir * (1 - wet)) * dt
//
// and `wet` is the fraction of hull points in the water, which is 0 on every airborne tick
// AND on every ramp-deck tick (the deck carries the craft, it does not wet it). So the rider's
// trim input - the one control a real rider uses in the air, shifting weight fore and aft over
// the footstraps - is multiplied by exactly zero from the toe of the ramp onwards.
//
// What is left is `pitchDampAir`, 0.2 on both hulls, which removes under a quarter of the
// rotation over a 1.3 s flight. tmp-tr179/stuntbal measured the consequence on the stunt
// stage and it is the whole of that level's difficulty:
//
//   * the hull leaves a ramp crest still pitched up ~22 deg, with a nose-down rate that is
//     near-linear in the speed it crossed the lip at: -42 deg/s at 9.5 m/s, 0 at 17.6, +6 at
//     22.7;
//   * nothing opposes that rate, so touchdown pitch is essentially decided at the crest -
//     pitch(launch) + about 0.9 * air * q(launch) - and the rider cannot touch it;
//   * the level accepts att <= landOk, i.e. pitch at touchdown in [-12, +15.6] deg. Re-measured
//     here by sweeping the arrival speed directly (work/band.mjs), the landable band off the
//     entry kicker is 2.30 m/s wide - 14.31 to 16.61 m/s - on a craft that meets a ramp toe
//     anywhere between 7 and 23 m/s depending on sea, heading, wave phase and throttle.
//
// That is the same class of error tmp-tr174 found in the yaw: `Math.max(wet, 0.05)` let a hull
// with nothing under it creep toward the handlebars, and scaling the rider's own weight shift
// by `wet` denies her the one thing she really can do in the air. Both are `wet` applied to a
// term that is not about water.
//
// ---------------------------------------------------------------------------------------
// WHY IT IS AN ASSIST AND NOT A PHYSICS FIX, WHICH IS THE HONEST PART
//
// The physical version of this is a pitching moment from moving the rider's mass along the
// keel: m_r * g * dx about the CG, integrated through the pitch inertia. It could be written.
// It is not written here, for two reasons, and both are measurable rather than tasteful:
//
//   1. THE MODEL HAS NO RIDER MASS TO MOVE. boats/hull.js carries ONE mass and one pitch
//      inertia I_yy = m L^2 / 16; the rider is inside `mass` (the jetski's 440 kg is "~350 kg
//      curb + an 85-90 kg rider") and has no position. A real rider shifting 90 kg through
//      +-0.6 m on a 3.4 m hull makes 530 N m against I_yy = 318 kg m^2, which is 1.66 rad/s^2
//      = 95 deg/s^2 - an ACCELERATION, so what the rider actually commands is a second-order
//      response, and the airtime available (0.87-1.6 s off this course) is barely two time
//      constants of it. Fitting that honestly needs a rider position state, a rate limit on
//      it and a re-derivation of `iPitch`; none of that is in this file's reach, and half of
//      it would be invented anyway.
//   2. A COMMANDED RATE IS WHAT THE CONTROL SHOULD FEEL LIKE. The rider holds the trim key
//      and the nose comes up at a steady rate; let go and it stops where it is. That is an
//      arcade control and calling it physics would be a lie of exactly the kind hull.js:30
//      and test-stunt's two false assertions were.
//
// So the authority is GRANTED OUTRIGHT, by a control the rider already holds, and it is
// labelled. `deg` below is the whole cheat in one number and a probe can read it.
//
// ---------------------------------------------------------------------------------------
// WHAT IT DOES, EXACTLY
//
// While the craft is airborne - the model's OWN test, hull.js's `airTicks > 0`, which needs
// every hull point clear of the water, clear of the sand AND clear of a ramp deck - the TRIM
// input drives a pitch rate that is added to the craft's PITCH ANGLE and to nothing else. It
// does NOT write the hull's pitch rate `q`, and that is deliberate, for air-spin.js's own two
// reasons restated on this axis:
//
//   * IT COMPOSES WITH THE PHYSICS INSTEAD OF REPLACING IT. The rotation the hull carried off
//     the crest goes on integrating into `pitch` underneath this, `pitchDampAir` goes on
//     acting on it, and the two add. Carving a good launch still matters; this adds to it.
//   * THE HULL LANDS WITH THE PITCH RATE THE PHYSICS GAVE IT. There is nothing to withdraw at
//     touchdown: the assist simply stops being applied, and the `q` that enters the water
//     model - the wedge impact, the slam, the porpoising seed - is the value that model would
//     have seen anyway. Writing `q` would hand the water an angular momentum the rider was
//     lent, and it would have to be taken back somewhere.
//
// NOTHING IS COUNTER-ROTATED, and unlike the spin that is not an omission. hull.js carries
// velocity in the horizontal body frame (u along the keel, v across it) and pitch does not
// appear in the translation at all - the world step is R(heading) . (u, v). Pitch enters only
// through the hull points' immersion and the aerodynamic and hydrodynamic terms, every one of
// which is scaled by `wet` or by an immersion depth that is zero in the air. So in flight this
// assist changes the ATTITUDE and nothing else, which is what a rider shifting her weight over
// a 1 s hop does to a 440 kg machine's trajectory: almost nothing. The craft flies the parabola
// it left the ramp on and arrives pointing somewhere else.
//
// The existing +-0.9 rad (51.6 deg) pitch clamp in hull.js is not touched and still binds, so
// this cannot stand a hull on its nose or its transom.
//
// ---------------------------------------------------------------------------------------
// THE NUMBERS, AND WHERE THEY CAME FROM
//
// RATE is derived from what the band actually needs, measured on this tree by sweeping the
// arrival speed at the entry kicker directly (work/band.mjs: the craft is placed 80 m back on
// the ramp's own heading with the surge it is to arrive at, and a proportional hold keeps it
// there while the heave and running trim settle). Touchdown pitch against arrival speed, with
// no rider input at all:
//
//     arrival u   10.5   11.9   13.4   14.1   14.3   14.7   15.7   16.6   16.7   17.5  m/s
//     pitch TD   -15.8  -28.6  -20.6  -12.4   -8.0   +1.8  +10.7   +4.9  +18.5  +16.2  deg
//     airtime     0.89   0.92   1.07   1.18   1.24   1.31   1.39   1.47   1.48   1.54  s
//                                            |<------- LANDS (att <= 0.60) ------>|
//
// The accept band is 27.6 deg of pitch wide (att <= landOk is pitch in [-12, +15.6]) and the
// curve crosses it at about 11 deg per m/s, so the landable band is 2.30 m/s. The HARDEST
// arrival in the reachable range is u 11.44, which touches down at -29.33 deg after 0.88 s of
// air: it needs +17.3 deg to reach -12. With the ramp-in below costing rate*tau, a rate R
// delivers R*(air - tau), so that one arrival alone sets
//
//     R >= 17.3 / (0.88 - 0.12) = 22.8 deg/s
//
// and 25 is the first round number above it. That is a first-order argument, so the band was
// then SWEPT in the real level rather than trusted to it (work/band.mjs, 32 arrival speeds x 5
// trim holds per rate, all on one 0.5 m/s grid so the rows are comparable):
//
//     rate deg/s          0(base)   10     15     20     25     30     40
//     widest band m/s       3.10    4.19   4.94   5.31   9.81   9.81   9.81
//     approaches landable   9/26    19/27  21/27  22/27  26/27  26/27  26/27
//     landed with NO trim   9/26     9/26   9/26   9/26   9/26   9/26   9/26   <- by design
//
// 25 deg/s is the KNEE and it is a sharp one: 20 leaves a hole in the middle of the range
// (the u ~ 11.4 arrival above, the one that needs 22.8) and 25 closes it, after which the band
// covers the whole speed range this ramp can be approached at and 30 and 40 buy exactly
// nothing. It is also, usefully, a little under the -42 to +6 deg/s the crest already imparts
// uncommanded, so the rider is trimming against the launch rather than overruling it.
//
// ⚠️ IT DOES NOT MAKE THE LEVEL EASY, and this is the number that says so. On the finer 0.25
// m/s grid the band before/after is measured on, of the 53 arrival speeds that produce a landing
// at all: 2 cannot be landed under ANY trim hold, 19 are landed by EXACTLY ONE of the five
// holds, 32 by two, and NONE by three or more. On the base tree the same histogram is 37
// landable by none and 15 by ALL FIVE - because the trim key does nothing there, so the approach
// speed decides everything and the rider decides nothing. The rider now always has to pick, and
// on more than a third of approaches there is exactly one right answer. No single hold is a win
// button either: `out` lands 32/51, `out/2` 22/52, `in/2` 14/53, `in` 0/53, none 15/52.
// Holding the key blindly is worse than not holding it: over 2,391 ramp landings taken with
// full trim pinned for the whole flight the grades are 45.6 / 24.3 / 22.2 / 7.9 against the
// no-input 22.8 / 17.8 / 37.9 / 21.5 - blind use roughly doubles the flop rate.
//
// TAU 0.12 s is air-spin.js's, and it is not re-derived: it is a filter on chop, the chop is
// the same chop, and the argument there for an exponential rather than a dwell threshold is
// unchanged on this axis. It costs rate*tau = 3 deg out of a long flight and hands a 67 ms
// wave skip 0.3 deg, which is nothing. There is no extra dead zone for the same reason:
// every input path has already applied its own before `lean` reaches the hull.
//
// ---------------------------------------------------------------------------------------
// THE INPUT IS THE TRIM KEY THAT ALREADY EXISTS, and no new control is invented.
//
// `lean` is input.js's one contract for fore-and-aft trim: W / S on a keyboard, the mouse's
// vertical axis, the touch stick's vertical axis, the gamepad's left stick Y. hull.js's own
// header states the sign - "lean > 0 = S key / mouse up = trim OUT (bow up); lean < 0 = W =
// trim IN" - and this assist keeps it: hold the same key that lifts the bow on the water and
// the bow comes up in the air. Nothing is added to input.js, to the touch layer or to the HUD.
//
// ---------------------------------------------------------------------------------------
// THE GATE: ONLY A FLIGHT THAT LAUNCHED OFF A RAMP DECK IS ARMED
//
// Identical to air-spin.js's, on the same two fields, and for a reason that is if anything
// stronger here. The free world, the rescue, both raids, the Harbour Mouth and the smuggling
// run are all steered and all graded on the attitude the craft lands at, and ui/juice.js's own
// bands were fitted to a free-world corpus in which a rider has no airborne pitch authority at
// all. Ungated, a rider holding the trim key would change the pitch of every chop hop in the
// game - tmp-tr174's free-world corpus records 348 landings off ordinary chop - and the grade
// distribution those bands rest on would move underneath them.
//
// `fromRamp` latches hull.js's own `onRamp` on the last supported tick before a flight, so the
// assist arms for a craft that left a deck and for nothing else. gl/ramps.js's `RAMPS` is EMPTY
// in every level but the stunt stage, so outside that stage `onRamp` is 0 on every tick of
// every craft and this assist is not merely water-inert, it is a NO-OP.
//
// ⚠️ NARROWER THAN THE BRIEF ASKED FOR, and said plainly: the brief said "a real rider shifts
// weight fore and aft in the air", which is true everywhere and not only off a ramp. Setting
// `rampOnly: false` removes the gate. That is a coordinator's call and not a builder's, and
// the cost of making it is that ui/juice.js's four-grade curve has to be re-derived against a
// free world in which the rider can choose her landing attitude.
//
// ---------------------------------------------------------------------------------------
// AUDITABLE AT RUNTIME, the way air-spin.js and foil-ramp.js's flight window both are
//
// The counters below are not decoration. `wetActs` is this file's own claim about itself - the
// number of times the assist has moved a craft that was not airborne - and it must read 0 for
// the life of a session. `deg` is what it has granted since reset, so a probe can ask how much
// of a landing attitude was flown and how much was assisted.
// ---------------------------------------------------------------------------------------

// Degrees per second and seconds. Kept in one exported object so a probe - or a future
// difficulty preset - can read or change them without reaching into the hull.
export const AIR_TRIM = {
  rate: 25,       // deg/s at full trim. See the sweep above.
  tau: 0.12,      // s, exponential ramp-in. air-spin.js's chop filter, unchanged.
  rampOnly: true, // ⚠️ arm only a flight that launched off a ramp deck. See THE GATE above.
};

const DEG = Math.PI / 180;

export class AirTrim {
  constructor(T = AIR_TRIM) { this.T = T; this.reset(); }

  reset() {
    this.rate = 0;         // rad/s the assist is currently granting
    this.air = 0;          // s airborne in the current flight
    this.swept = 0;        // deg of pitch added in the current flight (signed)
    this.deg = 0;          // deg added since reset - the whole cheat, in one number
    this.fromRamp = false; // did the last supported tick have a ramp deck under it?
    this.airTicks = 0;     // ticks offered while airborne
    this.wetTicks = 0;     // ticks offered while NOT airborne
    this.armed = 0;        // airborne ticks the gate allowed
    this.skipped = 0;      // airborne ticks the gate refused (no ramp launch behind them)
    this.wetActs = 0;      // ⚠️ times it moved a craft that was not airborne. MUST STAY 0.
  }

  // Returns the PITCH change in RADIANS to apply this tick, and exactly 0 on every tick the
  // craft is not airborne. `airborne` and `onRamp` are the CALLER'S own tests - this file
  // invents neither. Nothing else on the object is read by the caller.
  step(lean, dt, airborne, onRamp) {
    if (airborne) { this.airTicks++; this.air += dt; } else { this.wetTicks++; }
    const armed = airborne && (!this.T.rampOnly || this.fromRamp);
    if (airborne) { if (armed) this.armed++; else this.skipped++; }
    if (armed) {
      const want = (+lean || 0) * this.T.rate * DEG;
      this.rate += (want - this.rate) * Math.min(1, dt / Math.max(1e-3, this.T.tau));
    } else {
      // NOT a decay. On touchdown the assist rate is dropped outright rather than unwound, so
      // nothing is ever subtracted from a craft that has just landed - the attitude it arrives
      // with is the one it is graded on, and the one the water model then works against.
      this.rate = 0; this.air = 0; this.swept = 0;
    }
    // Latched on the last SUPPORTED tick, which is the only tick that knows what the craft was
    // standing on when it left. A splash-down between two hops clears it, so a bounce off the
    // water after a ramp jump is a new flight and is not armed.
    if (!airborne) this.fromRamp = !!onRamp;
    const d = this.rate * dt;
    if (d === 0) return 0;
    // ⚠️ THE INVARIANT, ENFORCED RATHER THAN ASSERTED. This is the last gate before a non-zero
    // angle leaves the object, and it is the only place the claim "it never moves a craft that
    // is not airborne" is actually made true. Today the branch above cannot reach it with a
    // non-zero rate; it is here so that an edit which broke that would be COUNTED and blocked
    // instead of shipping quietly. A probe reads `wetActs` and it must be 0.
    if (!airborne) { this.wetActs++; return 0; }
    const g = d / DEG;
    this.swept += g; this.deg += Math.abs(g);
    return d;
  }
}
