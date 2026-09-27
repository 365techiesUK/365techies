// The deterministic core: plant + rider + assist + sea + hash.
//
// No DOM, no clock, no Math.random, no allocation in step(). Everything the
// self-test needs to prove determinism, and everything main.js needs to draw a
// frame, lives behind this one object.
//
// Order of operations matters and is the three-layer split in code:
//   ASSIST shapes the input -> RIDER turns intent into a body -> ASSIST clips
//   the command -> PLANT integrates honest physics.
// The plant is never handed an assist, and the assist never reaches into the
// plant.

import { Plant } from './plant.js';
import { Rider } from './rider.js';
import { Assist } from './assist.js';
import { Sea } from './sea.js';
import { StateHash } from './rng.js';
import { BAND } from './params.js';

// >>> EFOILSPIN
// THE FOIL CAN SPIN. src/air-spin.js is imported UNCHANGED - not forked, not extended - so
// the hull path it was written for is provably the same file it was yesterday. What it needs
// from a craft is four things (`turn`, `dt`, "are you airborne", "did you leave a deck") and
// a place to put the radians it returns, and the foil has all four; what it does NOT get from
// a foil for free is the thing that makes a spin a spin rather than a swerve, and that is the
// whole of the work below. See THE TRACK AND THE HEADING at step().
import { AirSpin, AIR_SPIN_FOIL } from './air-spin.js';
// <<< EFOILSPIN

export const FIXED_DT = 1 / 120;      // §3: the ride-height loop runs at 120 Hz
const DOWN_TICKS = 132;               // 1.1 s in the water, then you are back up
const FLOW_TICKS = 360;               // 3 s in the band lights a segment (§5)
// >>> EFOILSPIN
const TAU = Math.PI * 2;              // one whole rotation, which is what a 360 is worth
// <<< EFOILSPIN

export class Sim {
  constructor(params) {
    this.params = params;
    this.sea = new Sea();
    this.plant = new Plant(params.plant);
    this.rider = new Rider(params.rider);
    this.assist = new Assist(params.assist);
    this.hash = new StateHash();
    this._shaped = { lean: 0, turn: 0, throttle: 0, boost: 0 };
    this.cmd = { pitch: 0, throttle: 0, powerScale: 1 };
    // Preallocated and reused. The plant reads it and never stores it.
    this.track = { x: 0, z: 0, ch: 1, sh: 0 };
    // Which way you are pointing when you start. Heading 0 runs ALONG the shore,
    // which puts the entire coast at 90 degrees - outside a 46 degree half-FOV,
    // so the beach, both piers and the cliff were rendering perfectly into a
    // part of the world the camera never looked at. Set by main.js.
    this.startHeading = 0;
    // ...and WHERE you start. tr145: the corsair level is fought at Handfast Point, about 8.6 km
    // from the origin, and COAST.startX/startZ is the FRAME ORIGIN and must not move (a dozen
    // modules read it, and main.js carries a scar about a duplicated spawn literal shifting every
    // calibration camera by 940 m). So the spawn moves instead, exactly as startHeading already
    // does: a mode sets these, calls the restart it was going to call anyway, and the rider - or,
    // through boats/hub.js, the boat - is put down there. Both default to 0, so with no mode
    // touching them every existing path is byte-identical.
    this.startX = 0;
    this.startZ = 0;
    // >>> EFOILSPIN
    // The arcade air-rotation assist. Same class and same ramp-in as the two hulls; its own
    // rate, because a foil's landable set is a whole turn or nothing and 240 deg/s does not
    // reach one in the airtime this craft gets. air-spin.js carries the sweep that set it.
    this.airSpin = new AirSpin(AIR_SPIN_FOIL);
    this.spinBack = 0;    // rad/s the board is being dragged back into line after a landing
    // <<< EFOILSPIN
    this.reset();
  }

  // The ONLY way the sea state changes. Never called from reset() or remount():
  // a rebuilt table is a different ocean, and §5's "state reset, never a scene
  // reload" means falling off must not restart the sea.
  setSeaState(state, seed) { this.sea.setState(state, seed); return this; }

  // THE WAVE-HEIGHT CONTROL (tmp-tr71). Unlike setSeaState() this is safe to
  // call at any time: it scales an additive field, it does not rebuild the wave
  // table, so the ocean does not restart and no ghost or recording is
  // invalidated. It is NOT hashed - it is a scene setting like the sea state,
  // and a replay is expected to be run at the setting it was recorded at.
  setSurfSize(v) { this.sea.setSurf(v); return this; }

  reset() {
    this.tick = 0;
    this.time = 0;
    this.assist.reset();
    this.rider.reset();
    // World track. The plant is longitudinal only - it knows distance along its
    // own heading and nothing about where that heading points. It exists before
    // the plant is seated, because on a wave the plant has to be told where the
    // water is at the origin.
    // >>> EFOILSPIN
    // `spinYaw` is the AIR-SPIN OFFSET: the angle between where the craft POINTS and the
    // direction it is actually TRAVELLING, in radians, unwrapped. It is 0 on every tick of
    // every level with no ramps in it, and 0 on every water-borne tick everywhere. It is
    // declared in the literal rather than assigned afterwards for the same one-hidden-class
    // reason plant.js's state block gives for accelG.
    this.world = { x: this.startX, z: this.startZ, heading: this.startHeading, roll: 0, turnRate: 0, spinYaw: 0 };
    this.spinBack = 0;
    this.airSpin.reset();
    // <<< EFOILSPIN
    this.track.x = 0; this.track.z = 0; this.track.ch = 1; this.track.sh = 0;
    const h0 = this.sea.sample(0, 0, 0, 0, 0).height;
    this.plant.setMast(this.params.assist.mastLength);
    this.plant.setBreachGrace(this.params.assist.breachGrace ?? 0);
    this.plant.reset(this.params.assist.mastLength, h0);
    this.hash.reset();
    this.stats = {
      bandTicks: 0, flightTicks: 0, bestFlightTicks: 0, wipeouts: 0,
      distance: 0, flow: 0, flowProgress: 0, inBand: false, lastCause: '',
    };
  }

  // KINEMATIC heading, not a moment balance.
  //
  // The plant stays 2D and honest. Turning is a game-layer channel bolted on so
  // the chase and FPV cameras have somewhere to point, and it is deliberately
  // not pretending to be carve dynamics - a real carve leans the whole rig,
  // loads the wing harder and costs speed, which is the 7-day craft-dynamics
  // line item in §8. Do not read anything into how a turn feels yet.
  _steer(turnRaw, dt, speed) {
    const w = this.world;
    // Coerced, not trusted. A missing field here used to become NaN heading ->
    // NaN world position -> a NaN sea query, and the only symptom was a metric
    // quietly reading zero. World position is a physics input now that the sea
    // is 2D, so it is worth one `|| 0` to make that failure impossible.
    const turn = turnRaw || 0;
    // You cannot carve standing still; authority builds with speed and falls
    // away again at the top end.
    const authority = Math.min(1, speed / 6) * (1 - Math.min(0.55, speed / 26));
    const targetRate = turn * 0.85 * authority;
    w.turnRate += (targetRate - w.turnRate) * Math.min(1, dt * 4.5);
    w.heading += w.turnRate * dt;
    w.roll += (Math.max(-0.5, Math.min(0.5, w.turnRate * 0.75)) - w.roll) * Math.min(1, dt * 5);
  }

  // >>> EFOILSPIN
  // ---------------------------------------------------------------------------------------
  // THE AIR SPIN, ON A FOIL. One call, three jobs: grant the rotation, hold the track while
  // it is in progress, and settle the board back into line when it lands.
  //
  // THE GATE IS foil-ramp.js's OWN RAMP-FLIGHT WINDOW, NOT A SECOND SIGNAL. `s.rampAir` is
  // the plant's published "the window is open AND the wing is clear of the water", and the
  // window is topped up only by a tick of deck contact, which needs a ramp, which needs the
  // stunt flag. `!s.onRamp` takes the DECK CLIMB out of it - a ramp is a pontoon standing
  // 1.6 m above mean water, so the wing is "out of the water" from the toe onward while the
  // craft is still being carried up the face by timber, and spinning a craft that is standing
  // on something is not a trick, it is a bug. That is the same correction ui/juice.js's
  // craftSample() already makes for the same reason, on the same two fields.
  //
  // So in every level whose ramp table is empty - the free ride, the rescue, both raids, the
  // Harbour Mouth, the smuggling run - `rampAir` is 0 on every tick and this is not merely
  // water-inert, it is a NO-OP: air-spin.js returns 0, spinYaw stays 0, and both `th0` and
  // `th` above are `w.heading`. §4 of RESULT.md measures that rather than asserting it.
  //
  // WHAT IS HANDED TO air-spin.js: exactly what a hull hands it. `turn` is input.js's one
  // contract, already dead-zoned by whichever device produced it; `airborne` and `onRamp` are
  // the CALLER'S tests, which is the contract that file states for itself.
  _airSpin(turn, dt, s, hPre) {
    const w = this.world;
    const air = s.rampAir === 1 && s.onRamp === 0;
    const d = this.airSpin.step(turn, dt, air, s.onRamp === 1);
    if (d !== 0) w.heading += d;
    if (air) {
      // HOLD THE TRACK. Every radian of yaw this tick is claimed as a BODY rotation - the
      // assist's, and _steer()'s carve as well. _steer models a kinematic carve against
      // water, and there is no water under a craft in the air to carve against; what is left
      // of its authority goes into turning the board rather than the flight path, which is
      // the same thing boats/hull.js does when it drops yawGrip to 0 off a ramp. The roll it
      // writes is untouched, so the board still leans into the rotation.
      w.spinYaw += w.heading - hPre;
      this.spinBack = 0;
      return;
    }
    if (w.spinYaw === 0) return;
    if (this.spinBack === 0) {
      // ------------------------------------------------------------------------------
      // LANDING MID-ROTATION. The flight is over and the board is pointing `spinYaw` away
      // from the way it is travelling. Two things happen, and neither of them is a free turn.
      //
      // 1. WHOLE TURNS ARE FREE, AND THE REST IS NOT. A completed rotation leaves the board
      //    pointing exactly where it started, so the residual is `spinYaw` wrapped into
      //    [-pi, pi]; dropping the whole turns moves the track by a multiple of 2 pi, which
      //    is the same direction. That is what makes a 360 a trick and a 340 a mistake.
      // 2. THE WING BITES, AND IT COSTS THE LATERAL HALF OF THE SPEED. The plant has no sway
      //    state and is not given one here: a foil cannot slide sideways the way a planing
      //    hull can, so the misalignment has to resolve on the tick it lands and the only
      //    honest resolution is the projection - the craft keeps the component of its
      //    velocity along the board, |V| cos(residual), and the component across it is
      //    destroyed by the board and the mast. Nothing is fitted in that; it is the cosine.
      //    plant.spinLand() applies it, and owns the one RULE that goes with it.
      //
      // The board is then dragged back into line over `ventFlushTime` - the model's own clock
      // for "the cavity is swept off and the wing is working again", read from the live
      // params rather than copied - by moving the HEADING and never the track, so the craft
      // keeps the momentum it landed with and only the picture changes. None of that happens
      // on THIS tick: stunt/stunt.js reads heading at touchdown to score the rotation, and a
      // decay applied here would quietly shave a few degrees off every trick it measures.
      const res = w.spinYaw - Math.round(w.spinYaw / TAU) * TAU;
      w.spinYaw = res;
      if (res === 0) return;
      this.plant.spinLand(Math.cos(res));
      const back = this.params.plant.ventFlushTime;
      this.spinBack = back > 0 ? res / back : res / dt;
      return;
    }
    // Settling. heading and spinYaw come down together, so `heading - spinYaw` - the track -
    // does not move, and the last step lands exactly on zero rather than asymptotically near
    // it: an offset that never quite closes is a craft that is permanently, invisibly crabbed.
    const step = this.spinBack * dt;
    if (Math.abs(step) >= Math.abs(w.spinYaw)) {
      w.heading -= w.spinYaw; w.spinYaw = 0; this.spinBack = 0;
    } else {
      w.heading -= step; w.spinYaw -= step;
    }
  }
  // <<< EFOILSPIN

  // Back on the board after a wipeout. Session stats survive; the tick counter
  // does not restart, so a replay reproduces this exactly.
  remount() {
    const st = this.stats;
    this.rider.reset();
    this.assist.reset();
    this.plant.setMast(this.params.assist.mastLength);
    this.plant.setBreachGrace(this.params.assist.breachGrace ?? 0);
    // Seat on the LOCAL surface, where you actually fell off - not at y = 0.
    // Note that time is NOT reset: the sea does not restart because you fell.
    const h = this.sea.sample(this.world.x, this.world.z, this.time, 0, 0).height;
    this.plant.reset(this.params.assist.mastLength, h);
    st.flightTicks = 0;
    this.world.roll = 0;
    this.world.turnRate = 0;
    // >>> EFOILSPIN
    // Back on the board pointing where you are going. A rider who fell mid-rotation does not
    // get up still crabbed, and the assist must not carry a latched ramp launch across a
    // wipeout - `reset()` on it clears `fromRamp`, which is what arms the next flight.
    this.world.spinYaw = 0;
    this.spinBack = 0;
    this.airSpin.reset();
    // <<< EFOILSPIN
  }

  step(raw, dt = FIXED_DT) {
    const s = this.plant.state;
    const st = this.stats;

    if (s.mode === 'DOWN' && s.downTicks >= DOWN_TICKS) this.remount();

    // ASSIST 1 - input shaping
    const shaped = this.assist.shapeInput(raw, this._shaped, dt);
    // ASSIST 2 - auto trim
    const trimBias = this.assist.trim(s, dt);
    // RIDER
    const prevPitch = this.rider.pitch;
    this.rider.step(shaped, dt, s.mode === 'FLYING', trimBias);
    // ASSIST 3 - command clip near breach
    this.assist.limitPitchRate(this.rider, prevPitch, s, dt);

    // PLANT. Flow segments raise available power, which is a game-layer
    // modifier riding on the command - not an edit to a sourced constant.
    this.cmd.pitch = this.rider.pitch;
    this.cmd.throttle = this.rider.throttle;
    this.cmd.powerScale = 1 + st.flow * 0.05;
    const wasDown = s.mode === 'DOWN';
    const xBefore = s.x;
    // Fill the track immediately before the plant runs. This is ONE TICK of
    // position lag, chosen deliberately over reordering _steer(): 8.3 ms
    // against a 4 s wave period is negligible, and it preserves the documented
    // order of operations above.
    const t = this.track, w = this.world;
    // >>> EFOILSPIN
    // THE TRACK IS THE DIRECTION OF TRAVEL, AND IT IS NOT ALWAYS THE HEADING.
    //
    // This is the one line that makes a foil spin possible, and it is worth being exact about
    // why. boats/hull.js carries velocity in the BODY frame, so air-spin.js can rotate the
    // heading and counter-rotate (u, v) and leave the world velocity untouched. plant.js has
    // no such pair: it is a longitudinal point mass whose speed is a scalar along one angle,
    // and THIS IS THE LINE THAT PICKS THE ANGLE. tmp-tr176 measured the consequence exactly -
    // "its heading IS its track direction, so a spin becomes a 3.6 m circle" - and it is this
    // expression, not a missing degree of freedom, that made it true.
    //
    // So the foil gets the hull's trick by the other half of the same identity. The heading
    // is rotated and the TRACK IS HELD, which leaves the world velocity exactly where it was:
    // `spinYaw` is that hold, expressed as an offset rather than as a second angle, so that
    // world.heading goes on being the ONE published heading - the one gl/craft.js draws, the
    // one player-pose.js exports and the one stunt/stunt.js's headingOf() scores. Not one of
    // those three files changes, and a rotation is measured on the foil the same way it is
    // measured on a jetski.
    //
    // Everything downstream of here that means "which way is the craft going" reads this and
    // not the heading: the sea query below, the orbital flow the plant resolves onto it, and
    // foil-ramp.js's own contact velocity. With spinYaw 0 - every tick of every ramp-free
    // level, and every water-borne tick anywhere - `th0` IS `w.heading` and the two lines are
    // the bytes that were here.
    const th0 = w.spinYaw !== 0 ? w.heading - w.spinYaw : w.heading;
    t.x = w.x; t.z = w.z; t.ch = Math.cos(th0); t.sh = Math.sin(th0);
    // <<< EFOILSPIN
    this.plant.step(this.cmd, dt, this.sea, this.time, t);

    // Lay the along-track distance the plant just produced down on a heading.
    // >>> EFOILSPIN
    const hPre = w.heading;      // every radian of yaw after this is the air spin's to claim
    // <<< EFOILSPIN
    this._steer(s.mode === 'DOWN' ? 0 : shaped.turn, dt, s.speed);
    // >>> EFOILSPIN
    this._airSpin(shaped.turn, dt, s, hPre);
    const th = w.spinYaw !== 0 ? w.heading - w.spinYaw : w.heading;
    // <<< EFOILSPIN
    const ds = s.x - xBefore;
    this.world.x += Math.cos(th) * ds;
    this.world.z += Math.sin(th) * ds;

    // >>> EFOILAIR
    // THE RAMP'S TWO WRITES ON THE TRACK, and they are the only two things the foil x ramp
    // contact cannot do from inside the plant. src/foil-ramp.js and the RAMP-FLIGHT WINDOW
    // block in plant.js carry the whole argument; this is only where the numbers land.
    //
    //   1. THE HEADING. plant.js is longitudinal - surge and heave, and it deliberately
    //      discards the cross-track part of the orbital flow because it has nowhere to put
    //      it. A slope reaction has a cross-track part too. It is not discarded and no sway
    //      state is invented for it: a lateral force on a point mass whose velocity is
    //      constrained along its heading does not move it sideways, it ROTATES the velocity
    //      at dPsi/dt = a_lat / u. The plant computes that rate; this line integrates it.
    //      raid/collide.js's resolveEfoil already turns a solid contact into a heading
    //      write at this same seam, for the same reason.
    //   2. THE SEPARATION. A ramp is a moored pontoon with a 1.15 m vertical side under the
    //      water, and a foil that arrives below the rim meets that side rather than the
    //      deck. plant.js clamps surge at u >= 0, so the contact spring can bring a craft
    //      to a stop against a pontoon but can never push it back out; this does that, the
    //      way resolveEfoil's "w.x += nx * pen" does it against a longship. It is capped in
    //      foil-ramp.js at SEP_MAX per tick, so it is a correction and never a teleport.
    //
    // Both are written AFTER the along-track distance is laid down, so a contact steers the
    // NEXT tick rather than retroactively bending this one - again resolveEfoil's order.
    // Both guards are false on every tick of every level whose ramp table is empty, which
    // is every level but the stunt stage, so nothing here can move a hash anywhere else.
    if (s.rampYawRate !== 0) this.world.heading += s.rampYawRate * dt;
    if (s.rampSepX !== 0 || s.rampSepZ !== 0) {
      this.world.x += s.rampSepX;
      this.world.z += s.rampSepZ;
    }
    // <<< EFOILAIR

    // ---- session bookkeeping --------------------------------------------
    if (!wasDown && s.mode === 'DOWN') {
      st.wipeouts++;
      st.lastCause = s.wipeoutCause;
      st.flow = Math.max(0, st.flow - 1);
      st.flowProgress = 0;
      if (st.flightTicks > st.bestFlightTicks) st.bestFlightTicks = st.flightTicks;
      st.flightTicks = 0;
    }

    if (s.mode === 'FLYING') {
      st.flightTicks++;
      if (st.flightTicks > st.bestFlightTicks) st.bestFlightTicks = st.flightTicks;
      const inBand = s.wingDepth >= BAND.lo && s.wingDepth <= BAND.hi && !s.ventilated;
      st.inBand = inBand;
      if (inBand) {
        st.bandTicks++;
        st.flowProgress++;
        if (st.flowProgress >= FLOW_TICKS) {
          st.flowProgress = 0;
          st.flow = Math.min(5, st.flow + 1);
        }
      } else {
        st.flowProgress = Math.max(0, st.flowProgress - 2);
      }
    } else {
      st.inBand = false;
    }
    st.distance = s.x;

    // ---- determinism hash ------------------------------------------------
    const h = this.hash;
    h.num(s.x); h.num(s.y); h.num(s.u); h.num(s.w);
    h.num(s.pitch, 100000); h.int(s.ventilated ? 1 : 0);
    h.num(this.world.heading, 100000);
    // world.x/z BECOME PHYSICS INPUTS the moment the sea is 2D - they are where
    // the plant asks the wave table for a height. Leaving them out of the hash
    // would let the track drift while the hash still matched.
    h.num(this.world.x); h.num(this.world.z);

    this.tick++;
    this.time += dt;
  }
}
