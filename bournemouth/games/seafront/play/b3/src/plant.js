// PLANT - honest physics. Never touched for feel (§6).
//
// Longitudinal point-mass model: surge + heave, with body pitch supplied by the
// RIDER layer. Pitch is an input here rather than a moment balance, which is
// exactly what §6 prescribes: "Input does not set angle of attack; it sets a
// target body pitch."
//
// Lift follows L = 1/2 rho V^2 S CL(alpha), rho = 1025.
//
// The number that explains the whole feel (§2): at takeoff speed dL/dV is over
// 500 N per m/s, so a half-metre-per-second wobble is a quarter of the rider's
// weight. This model reproduces that rather than smoothing it away - the HUD
// prints the live figure so you can watch it bite.

// >>> EFOILAIR
// THE RAMPS, FROM THE FOIL'S SIDE. src/foil-ramp.js owns the contact and the argument for
// why it is not boats/ramp-collide.js's contact; this file owns where the force goes.
// Everything it does is a no-op unless gl/ramps.js's table is non-empty, which it is only
// on the stunt stage. Do not read a game rule into the import: with no ramps in the level
// every branch below is the branch that was there before.
import { foilRampConst, foilRampResult, foilRampStep } from './foil-ramp.js';

// THE RAMP-FLIGHT WINDOW, in seconds. See the block at the fail states for what it is and
// for the honest account of what it suspends and why those rules do not describe a ramp.
const RAMP_HOLD = 3.0;      // s: topped up on every tick of deck contact, then it runs out
const RAMP_SETTLE = 0.25;   // s: back in solid water and no longer falling = settled, done
// <<< EFOILAIR

const MODES = { FLOAT: 'FLOAT', TAXI: 'TAXI', FLYING: 'FLYING', DOWN: 'DOWN' };

export class Plant {
  constructor(params) {
    this.p = params;             // live reference to tuning.plant
    this.state = {
      x: 0, y: 0, u: 0, w: 0,    // hull-bottom position and velocity, world m
      pitch: 0,
      // derived, exposed for HUD / telemetry / render
      speed: 0, alpha: 0, gamma: 0, cl: 0, lift: 0, drag: 0, thrust: 0,
      wingDepth: 0, wingY: 0, rideHeight: 0, wetted: 0, powerW: 0,
      ventilated: false, ventTimer: 0, stalled: false, mode: MODES.FLOAT,
      // accelG is assigned every tick and read by tools/probe.mjs. Declaring it
      // here rather than letting the first assignment create it is the
      // difference between one hidden class and two.
      dLdV: 0, accelG: 0, downTicks: 0, wipeoutCause: '',
      // >>> EFOILAIR
      // Ramp contact, declared here for the same one-hidden-class reason accelG is.
      // Every one of them is zero and stays zero in a level with no ramps in it.
      //   onRamp       1 while the foil is carrying the craft on a deck
      //   rampHold     s of ramp-flight window left    rampSettle  s of settled landing
      //   rampAir      1 while airborne inside that window (diagnostic / HUD)
      //   rampYawRate  rad/s the contact is turning the craft, applied by sim.js
      //   rampSepX/Z   m of footprint separation sim.js owes the world track this tick
      //   rampPen      m the wing is inside the pontoon - diagnostic only
      //   rampVRel     m/s the contact damper's own velocity - the quantity foil-ramp.js's
      //                V_CLAMP clamps, published so work/vclamp.mjs can prove it does not
      //                bind on an ordinary approach rather than a comment asserting it
      //   rampHit      0 open water, 1 carried by a deck, 2 against the submerged flank
      //   rampSavedB/D/T  ticks on which the window suppressed BREACH / DROPPED /
      //                TOUCHDOWN - i.e. ticks on which that rule WOULD have ended the run.
      //                Diagnostics, but not decoration: they are what makes the one
      //                judgement in this change auditable at run time and not only in a
      //                report. rampShadow is the breach counter they need, kept separately
      //                so the real one can still be zeroed every tick.
      onRamp: 0, rampHit: 0, rampHold: 0, rampSettle: 0, rampAir: 0,
      rampYawRate: 0, rampSepX: 0, rampSepZ: 0, rampPen: 0, rampVRel: 0,
      rampSavedB: 0, rampSavedD: 0, rampSavedT: 0, rampShadow: 0,
      // <<< EFOILAIR
      // >>> EFOILSPIN
      //   spinLands  times a ramp flight ended with the board off its track at all
      //   spinWash   how many of those the wash-out rule ended. Both are session counters
      //              and are NOT cleared by reset(), so a probe can read the whole ride;
      //              they are declared here for the same one-hidden-class reason as above.
      spinLands: 0, spinWash: 0,
      // <<< EFOILSPIN
    };
    // >>> EFOILAIR
    // Contact constants and the result object, both allocated once. step() allocates
    // nothing, and foilRampStep() writes into _rr rather than returning a fresh object.
    this._rc = foilRampConst(params);
    this._rr = foilRampResult();
    // <<< EFOILAIR
    this.reset();
  }

  reset(mastLength, surfaceH = 0) {
    const s = this.state, p = this.p;
    s.x = 0; s.u = 0; s.w = 0; s.pitch = 0;
    // Floating at rest: hull sits where buoyancy balances weight, RELATIVE TO
    // THE LOCAL SURFACE. On a wave, y = 0 is not where the water is - seating
    // the board at absolute zero on a crest starts it a wave height under.
    s.y = surfaceH - Math.min(p.hullSubMax, (p.mass * p.g) / p.hullStiffness);
    s.speed = 0; s.alpha = 0; s.gamma = 0; s.cl = 0;
    s.lift = 0; s.drag = 0; s.thrust = 0; s.powerW = 0;
    s.accelG = 0;
    s.ventilated = false; s.ventTimer = 0; s.stalled = false; s.mode = MODES.FLOAT;
    s.downTicks = 0; s.wipeoutCause = '';
    // >>> EFOILAIR
    s.onRamp = 0; s.rampHit = 0; s.rampHold = 0; s.rampSettle = 0; s.rampAir = 0;
    s.rampYawRate = 0; s.rampSepX = 0; s.rampSepZ = 0; s.rampPen = 0; s.rampVRel = 0;
    s.rampSavedB = 0; s.rampSavedD = 0; s.rampSavedT = 0; s.rampShadow = 0;
    if (this._rr) {
      const R = this._rr;
      R.hit = 0; R.fUp = 0; R.fSurge = 0; R.yawRate = 0; R.sepX = 0; R.sepZ = 0; R.pen = 0; R.vRel = 0;
    }
    // <<< EFOILAIR
    this.mast = mastLength || p.mastLength;
    this._geometry(surfaceH, 0);
  }

  setMast(m) { this.mast = m; }

  _geometry(surfaceH, pitch) {
    const s = this.state;
    s.wingY = s.y - this.mast * Math.cos(pitch);
    s.wingDepth = surfaceH - s.wingY;
    s.rideHeight = s.y - surfaceH;
  }

  // cmd:   { pitch, throttle }  -- both already shaped by RIDER and ASSIST.
  // track: { x, z, ch, sh } -- the board's world position at the START of this
  //        tick and the unit heading vector (cos h, sin h). Supplied by sim.js,
  //        preallocated and reused; never stored.
  //
  // The plant stays LONGITUDINAL. It has no lateral degree of freedom and does
  // not gain one here: the track is only what turns a 1D along-track model into
  // a 2D query against a 2D sea, and the world-frame orbital flow is resolved
  // back onto the heading before it is used.
  step(cmd, dt, sea, time, track) {
    const p = this.p, s = this.state;

    if (s.mode === MODES.DOWN) {
      // In the water. Drift, slow, and let main.js decide when to reset.
      s.downTicks++;
      // >>> EFOILAIR
      // In the water, the ramp is not touching anything: this branch never queries it, so
      // the published fields have to be cleared or sim.js would keep applying the last
      // separation it was handed. A craft that fell ON a ramp therefore drifts through the
      // footprint while it is down and is pushed clear by the flank rule on the tick it is
      // back on the board - which is measured in work/stuck.mjs, not assumed here.
      s.onRamp = 0; s.rampHit = 0; s.rampHold = 0; s.rampSettle = 0; s.rampAir = 0;
      s.rampYawRate = 0; s.rampSepX = 0; s.rampSepZ = 0; s.rampPen = 0; s.rampVRel = 0; s.rampShadow = 0;
      // <<< EFOILAIR
      s.u *= 0.94; s.w = 0; s.thrust = 0; s.lift = 0; s.powerW = 0;
      const ds = s.u * dt;
      s.x += ds;
      const surf0 = sea.sample(track.x + track.ch * ds, track.z + track.sh * ds, time, 0, 0);
      s.y += (surf0.height - 0.25 - s.y) * 0.08;
      this._geometry(surf0.height, s.pitch);
      s.speed = s.u;
      return;
    }

    s.pitch = cmd.pitch;

    const surf = sea.sample(track.x, track.z, time, 0, 0);
    const surfaceH = surf.height;
    // The water surface's own vertical velocity, captured as a NUMBER before
    // slot 0 is reused later in this tick. Holding `surf` across the
    // integration would alias it against the post-integration re-sample.
    const surfW = surf.orbY;
    this._geometry(surfaceH, s.pitch);

    // ---- flow at the wing ------------------------------------------------
    // Orbital velocity at the wing, not at the surface: exp(-k*d) decay is the
    // whole reason §3 picked Gerstner over FFT. Flat water returns zeroes.
    const orb = sea.sample(track.x, track.z, time, Math.max(0, s.wingDepth), 1);
    // Resolve the world-frame orbital flow onto the heading. The cross-track
    // component is returned and deliberately unused - the plant has nowhere to
    // put it (contract E.5).
    const orbU = orb.orbX * track.ch + orb.orbZ * track.sh;
    const orbW = orb.orbY;
    const relU = s.u - orbU;
    const relW = s.w - orbW;
    const U = Math.hypot(relU, relW);
    const gamma = U > 0.05 ? Math.atan2(relW, relU) : 0;
    const q = 0.5 * p.rho * U * U;

    // Angle of attack: body pitch + fixed wing incidence - climb angle. That
    // last term is the whole reason porpoising can exist: climbing eats alpha.
    const alpha = s.pitch + p.wingIncidence - gamma;

    // ---- lift ------------------------------------------------------------
    const aS = p.alphaStall;
    let cl, stalled = false;
    if (alpha > aS) {
      const over = Math.min((alpha - aS) / (6 * Math.PI / 180), 1);
      cl = (p.cl0 + p.clAlpha * aS) * (1 - (1 - p.clStallDrop) * over);
      stalled = over > 0.15;
    } else if (alpha < -aS) {
      const over = Math.min((-alpha - aS) / (6 * Math.PI / 180), 1);
      cl = (p.cl0 - p.clAlpha * aS) * (1 - (1 - p.clStallDrop) * over);
      stalled = over > 0.15;
    } else {
      cl = p.cl0 + p.clAlpha * alpha;
    }

    const d = s.wingDepth;

    // Immersed fraction. Blended over 6 cm so the integrator is not asked to
    // swallow a step discontinuity; ventilation below does the violent part.
    const immersed = d <= 0 ? 0 : Math.min(1, d / 0.06);

    // Free-surface loss: lift falls off within about a chord of the top.
    const surfLoss = 1 - p.surfaceLossGain *
      Math.exp(-Math.max(0, d) / (p.wingChord * p.surfaceLossScale));

    // Ventilation: latched, with hysteresis, because a real air cavity persists
    // until the wing gets back down into solid water (§2).
    //
    // Depth alone is not enough to recover. The cavity has to be swept off the
    // suction side, and that takes time. Without the flush timer the wing
    // re-attaches the instant it dips below the reattach depth, full lift
    // catches the fall, and a rider whose foil left the water entirely simply
    // carries on - which measured out as zero wipeouts however badly it was
    // flown. An edge you cannot fall off is not an edge.
    if (!s.ventilated) {
      if (d < p.ventDepth) { s.ventilated = true; s.ventTimer = 0; }
    } else {
      s.ventTimer += dt;
      if (d > p.reattachDepth && s.ventTimer > p.ventFlushTime) s.ventilated = false;
    }
    const ventFactor = s.ventilated ? p.ventLiftFactor : 1;

    const clEff = cl * surfLoss * ventFactor * immersed;
    const lift = q * p.wingArea * clEff;

    // ---- drag ------------------------------------------------------------
    const cdi = (clEff * clEff) / (Math.PI * p.oswald * p.aspectRatio);
    const dragWing = q * p.wingArea * (p.cd0Wing * immersed + cdi);
    // Wetted mast = mast - rideHeight. Fly higher and less mast is in the water,
    // so drag falls and you go faster: that is the physical reason a foiler
    // chases the surface, and it is what makes riding the band its own reward
    // rather than a gold star awarded by the game layer.
    //
    // This read `mast + rideHeight` for its whole life, which clamped to 1 the
    // entire time the board was flying and actually fell when it SANK - exactly
    // backwards, and it meant holding the band cost effort and paid nothing you
    // could feel.
    const wetMast = Math.min(1, Math.max(0, this.mast - s.rideHeight) / this.mast);
    const dragMast = q * p.cdaMast * wetMast;

    // Hull. Wetted area collapses as the board unloads, and the drag knee is
    // what makes the pop-up a discontinuity rather than a ramp (§2).
    const sub = Math.max(0, -s.rideHeight);
    const wet = Math.min(1, sub / p.hullWetDepth);
    const knee = wet < p.hullKnee ? wet * (wet / p.hullKnee) : wet;
    const dragHull = q * p.hullCdA * knee;

    const drag = dragWing + dragMast + dragHull;

    // ---- thrust ----------------------------------------------------------
    // Prop efficiency peaks near cruise and falls away either side. That
    // falloff, not raw power, is what puts top speed at ~50 km/h.
    const etaRaw = p.propEtaPeak *
      (1 - Math.pow((U - p.propEtaPeakSpeed) / p.propEtaSpan, 2));
    const eta = Math.min(p.propEtaPeak, Math.max(0.12, etaRaw));
    const powerW = cmd.throttle * p.motorPowerMax * (cmd.powerScale || 1);
    // Motor lives on the fuselage beside the wing: breach it and you lose drive
    // at the exact moment you need it.
    let thrust = Math.min(p.thrustStaticMax, (powerW * eta) / Math.max(U, 0.8)) * immersed;

    // ---- hull support ----------------------------------------------------
    const cDamp = 2 * p.hullDampingZeta * Math.sqrt(p.hullStiffness * p.mass);
    const subEff = Math.min(sub, p.hullSubMax);
    // FIDELITY, NOT FEEL. The damper acts between the hull and the water, so it
    // is driven by the CLOSING velocity (s.w - surfW), not by the board's
    // absolute vertical velocity. Damping against the seabed means a swell
    // rising underneath the board is fought by the damper instead of lifting
    // it, and a board sitting still on a passing wave feels a phantom force.
    // No constant changes: hullDampingZeta and hullStiffness are untouched.
    const fHull = sub > 0 ? Math.max(0, p.hullStiffness * subEff - cDamp * (s.w - surfW)) : 0;

    // >>> EFOILAIR
    // ---- the ramp, if the level has one -----------------------------------
    // THE CONTACT POINT IS THE WING, not the board. It sits mast*cos(pitch) below the board
    // and mast*sin(pitch) AFT of it, because the mast is rigid and pitching the nose up
    // swings the foil back. At the rider's +-9 deg of body pitch that offset is at most
    // 0.12 m against a 5.63 m face, so it changes little - it is here because it is one
    // line and it is where the foil actually is.
    //
    // The wing's vertical velocity is taken as s.w. The exact value carries a
    // mast*sin(pitch)*pitchRate term which is under 0.12 m/s against launch velocities of
    // 5-7 m/s; it is left out and named rather than folded in silently.
    //
    // foilRampStep returns all zeroes the instant gl/ramps.js's table is empty, which is
    // every level but the stunt stage, so nothing below this line runs anywhere else.
    const RR = this._rr;
    if (this._rc.mass !== p.mass) foilRampConst(p, this._rc);
    const mastBack = this.mast * Math.sin(s.pitch);
    foilRampStep(this._rc, RR,
      track.x - track.ch * mastBack, track.z - track.sh * mastBack,
      s.wingY, s.w, surfaceH, surfW, s.u, track.ch, track.sh);
    // <<< EFOILAIR

    // ---- integrate (semi-implicit Euler, fixed dt) ------------------------
    const cg = Math.cos(gamma), sg = Math.sin(gamma);
    // >>> EFOILAIR
    // TWO KEYWORDS AND ONE GUARDED ADDITION. "const" became "let" and the ramp reaction is
    // added afterwards rather than into the expressions, so with RR.hit 0 - which is every
    // tick of every ramp-free level - both lines evaluate to the bytes they always did and
    // the branch is not taken at all. The reaction goes into the SAME accumulators as
    // thrust, drag, lift and the hull spring: a ramp is a force on the craft, not a special
    // case beside it.
    let fx = thrust * Math.cos(s.pitch) - drag * cg - lift * sg;
    let fy = thrust * Math.sin(s.pitch) - drag * sg + lift * cg + fHull - p.mass * p.g;
    if (RR.hit) { fx += RR.fSurge; fy += RR.fUp; }
    // <<< EFOILAIR

    const wPrev = s.w;
    s.accelG = fy / (p.mass * p.g);      // board vertical accel, in g
    s.u += (fx / p.mass) * dt;
    s.w += (fy / p.mass) * dt;
    if (s.u < 0) s.u = 0;
    const ds = s.u * dt;
    s.x += ds;
    s.y += s.w * dt;

    // Re-sample at the POST-integration position. Slot 0 is free again:
    // surfaceH and surfW were consumed above and are plain numbers.
    //
    // On flat water the surface does not move, so computing it once before the
    // integration was invisible. On waves it is one tick (8.3 ms) stale in the
    // touchdown test and in everything the HUD, telemetry and both renderers
    // read off _geometry().
    const surf2 = sea.sample(track.x + track.ch * ds, track.z + track.sh * ds, time, 0, 0);
    const surfaceH2 = surf2.height;

    // ---- fail states -----------------------------------------------------
    // Touchdown: hull slaps down, drag spike, rider catapults (§2).
    //
    // FIDELITY, NOT FEEL. slapSpeed keeps its value and its provenance; what
    // changes is what it is compared against. The relevant quantity is the
    // CLOSING velocity between hull and water, not the board's velocity in the
    // world frame. On the default sea the surface itself moves at 0.244 m/s rms
    // and 0.73 m/s at 3 sigma - 54% of the 1.35 m/s threshold - so an absolute
    // test catapults a rider whose board was stationary while a crest rose to
    // meet it, and lets a board falling onto a retreating trough off a wipeout
    // it earned.
    // >>> EFOILAIR
    // ---------------------------------------------------------------------------------
    // THE RAMP-FLIGHT WINDOW. This is a RULE, of the same class as breachGrace, and it is
    // the one judgement in this change. It is not physics and it does not pretend to be.
    //
    // WHAT IT SUSPENDS: BREACH, DROPPED and TOUCHDOWN, and only while a ramp flight is in
    // progress. WHY, rule by rule:
    //
    //   BREACH    - "the wing is out of the water at speed, so nothing is holding the rider
    //               up". On a deck that premise is false: the foil IS holding the rider up,
    //               on timber instead of water, which is the whole mechanic. In the arc
    //               that deck launched it is true but beside the point - the rule's own
    //               comment says it is a rule rather than a gradient "because the 2D model
    //               has no pitch moment to represent going over the front with", and a ramp
    //               launch is the one case that leaves the water nose-up and in a parabola
    //               the rider set up for. It is the opposite of the event BREACH models.
    //   DROPPED   - "ventilated, above the water, falling faster than 3.2 m/s". That is a
    //               rider who has fallen off the foil. Every ramp landing is ventilated -
    //               the wing really has been out of the water, so the latch is right - and
    //               arrives at 6-9 m/s, so the rule fires on the descent of every jump
    //               before the craft has touched anything at all.
    //   TOUCHDOWN - "the board slapped the water at more than slapSpeed". slapSpeed is
    //               1.35 m/s and was calibrated against porpoising. tmp-tr173 recorded the
    //               same mismatch from the other side: ui/juice.js grades every jetski ramp
    //               landing 1.00 on "fall" because its band came from free riding.
    //
    // WHAT IT DOES NOT SUSPEND: the forces. A landing is still absorbed by the real hull
    // spring, still braked by the real hull drag, and still has to be flown out of on a
    // ventilated wing at 22% lift. The consequence of a hard landing is the recovery, not
    // a free pass.
    //
    // WHY IT CANNOT LEAK: it is topped up ONLY by a tick of deck contact, which needs a
    // ramp, which needs the stunt flag. It runs out RAMP_HOLD seconds later, and sooner
    // than that the moment the wing is back in solid water and the craft has stopped
    // falling. The measured windows, and the longest one ever seen, are in RESULT.md.
    if (RR.hit === 1) {
      s.onRamp = 1; s.rampHold = RAMP_HOLD; s.rampSettle = 0; s.breachTicks = 0;
    } else {
      s.onRamp = 0;
      if (s.rampHold > 0) {
        s.rampHold = Math.max(0, s.rampHold - dt);
        if (s.wingDepth > p.ventDepth && Math.abs(s.w) < 1.5) {
          s.rampSettle += dt;
          if (s.rampSettle >= RAMP_SETTLE) s.rampHold = 0;
        } else s.rampSettle = 0;
      }
    }
    const rampFlight = s.rampHold > 0;
    s.rampAir = (rampFlight && s.wingDepth <= 0) ? 1 : 0;
    s.rampHit = RR.hit;
    s.rampYawRate = RR.yawRate; s.rampSepX = RR.sepX; s.rampSepZ = RR.sepZ;
    s.rampPen = RR.pen; s.rampVRel = RR.vRel;

    const newSub = Math.max(0, surfaceH2 - s.y);
    const wouldTouch = newSub > 0 && sub <= 0 && (wPrev - surf2.orbY) < -p.slapSpeed;
    if (!rampFlight) { if (wouldTouch) this._wipeout('TOUCHDOWN'); }
    else if (wouldTouch) s.rampSavedT++;
    // <<< EFOILAIR
    // Two different things, and the difference is the whole skill gradient:
    //
    //   ventilated (wing shallow, air down the suction side) - survivable, and
    //   catching it is the skill. It costs you lift and drive at once.
    //
    //   breached (wing completely out of the water) - down. At 40 km/h the foil
    //   is the only thing holding a standing rider up; the re-entry loads and
    //   the nose-down pitching moment that follows are not something you ride
    //   out. This is a rule rather than a gradient because the 2D model has no
    //   pitch moment to represent going over the front with.
    // BREACH GRACE - an ASSIST, not physics. The plant still reports the breach
    // honestly; what this changes is how long you are allowed to be out before
    // it counts as down.
    //
    // Measured with tools/wipeout-census.mjs: with zero grace, a pilot with a
    // human 180 ms reaction lag wipes out 36 times a MINUTE on the default
    // preset - one every 1.7 seconds - and 100% of those are BREACH. Not
    // touchdown, not ventilation. The band is 16 cm deep and instant death sits
    // at its top edge, so the smallest overshoot ends the run before anyone can
    // react. That is not difficulty, it is a coin toss.
    //
    // A real foil that momentarily kisses the surface is catchable; you have to
    // be out for a moment at speed before the re-entry loads and the nose-down
    // moment take you. graceTicks is that moment, and it is owned by the assist
    // layer so it can be turned off for the honest case.
    // >>> EFOILAIR
    // "rampFlight" is the only addition to these two rules, and it is false on every tick
    // of every level that has no ramps in it - so this is the block that was here.
    const out = s.wingDepth <= 0 && U > 4;
    s.breachTicks = out ? (s.breachTicks || 0) + 1 : 0;
    if (rampFlight) {
      // Carried by a deck, or inside the arc that deck launched. The two rules are counted
      // rather than silently stepped over: rampSavedB/D say how many ticks this window is
      // actually buying, which is the number the report has to be able to quote.
      s.rampShadow = out ? s.rampShadow + 1 : 0;
      if (out) { if (s.rampShadow > (this.breachGraceTicks || 0)) s.rampSavedB++; }
      else if (s.ventilated && s.rideHeight > 0.05 && s.w < -3.2) s.rampSavedD++;
      s.breachTicks = 0;      // nothing accumulates across the end of the window
    } else {
      s.rampShadow = 0;
      if (out) {
        if (s.breachTicks > (this.breachGraceTicks || 0)) this._wipeout('BREACH');
      } else if (s.ventilated && s.rideHeight > 0.05 && s.w < -3.2) {
        this._wipeout('DROPPED');
      }
    }
    // <<< EFOILAIR

    // ---- bookkeeping -----------------------------------------------------
    // _geometry() is where the whole sea reaches the rest of the plant: wing
    // depth and ride height feed immersed fraction, free-surface loss,
    // ventilation latch and unlatch, the thrust cut, mast and hull wetted drag
    // and its knee, buoyancy and the breach rule - all of it, automatically,
    // with not one of those blocks edited. That the seam already worked is the
    // point of this whole change.
    this._geometry(surfaceH2, s.pitch);
    s.speed = U; s.alpha = alpha; s.gamma = gamma; s.cl = clEff;
    s.lift = lift; s.drag = drag; s.thrust = thrust; s.powerW = powerW;
    s.wetted = wet; s.stalled = stalled;
    // dL/dV at the current operating point - the twitchiness number, live.
    s.dLdV = p.rho * U * p.wingArea * clEff;

    if (s.mode !== MODES.DOWN) {
      s.mode = s.rideHeight > 0.02 ? MODES.FLYING
             : (U > 1.0 ? MODES.TAXI : MODES.FLOAT);
    }
  }

  // >>> EFOILSPIN
  // ---------------------------------------------------------------------------------------
  // LANDING MID-ROTATION, FROM THE PLANT'S SIDE. Called by sim.js on the tick a ramp flight
  // ends with the board pointing `beta` away from the direction it is travelling; `cosB` is
  // cos(beta), and sim.js owns the angle because the angle lives on the world track.
  //
  // THE SCRUB IS NOT A TUNING NUMBER. This model has surge and heave and no sway at all, so
  // there is no state for "sliding sideways" to live in and the misalignment cannot be
  // carried past the landing tick the way a planing hull carries `v`. What the craft keeps is
  // the component of its velocity along the board, |V| cos(beta); the component across it is
  // taken by the board's rail and the mast. Backwards (cos < 0) clamps to 0 for the same
  // reason `s.u` is clamped to 0 everywhere else in this file - the model has no astern.
  //
  // ---------------------------------------------------------------------------------------
  // THE WASH-OUT. ⚠️ This is a RULE, of the same class as the ramp-flight window above and
  // breachGrace before it. It is named, it is counted, and it is not physics.
  //
  // WHY IT HAS TO EXIST: without it a foil that lands 80 degrees across its own travel keeps
  // whatever is left of its speed and goes on riding, and ui/juice.js grades that landing
  // PERFECT - because craftSample() hands the foil `vMs: 0` (structurally true until now: a
  // longitudinal plant really has no sideslip) so the slip axis the hulls are graded on reads
  // exactly 0 for this craft whatever it just did. Granting the rotation without this would
  // therefore reintroduce, on the foil, precisely the defect tmp-tr176 measured and fixed on
  // the hulls: two thirds of broadside arrivals banking points. See §3 of RESULT.md for the
  // one-line change in ui/juice.js that would let the grader see it instead; that file is not
  // mine this round, and a rule the plant can enforce is better than a hole left open.
  //
  // WHAT IT FIRES ON, AND WHY THAT NUMBER: the wing at touchdown is VENTILATED - the plant
  // latched it the moment the foil cleared the water and it needs reattachDepth AND
  // ventFlushTime to clear - so the lift actually available is ventLiftFactor of the full
  // curve. `_ventFlySpeed()` is the speed at which that much lift still carries the craft,
  // out of this file's own lift law and this preset's own constants:
  //
  //     1/2 rho V^2 S (cl0 + clAlpha alphaStall) ventLiftFactor = m g
  //
  // and on the shipped preset that is 7.87 m/s against measured ramp arrivals of 10.7-11.5.
  // If the craft could fly on it before the scrub and cannot after, then nothing is holding
  // the rider up and the rider goes in - which is BREACH's own sentence, for a case BREACH
  // cannot see because the wing is in the water. It is a NEW cause rather than a borrowed
  // one, because calling this a breach would make wipeout-census lie about what breached.
  //
  // IT CANNOT FIRE ON A LANDING THAT WAS ALREADY TOO SLOW TO FLY. The `u0 >= vv` half is what
  // makes that true: the rule may only take away flight the craft actually had, so a gentle
  // arrival off a small ramp is never made a wipeout by an angle.
  _ventFlySpeed() {
    const p = this.p;
    const clMax = p.cl0 + p.clAlpha * p.alphaStall;
    return Math.sqrt((p.mass * p.g) / (0.5 * p.rho * p.wingArea * clMax * p.ventLiftFactor));
  }

  spinLand(cosB) {
    const s = this.state;
    s.spinLands++;
    if (s.mode === MODES.DOWN) return 0;
    const u0 = s.u;
    s.u = cosB > 0 ? u0 * cosB : 0;
    const vv = this._ventFlySpeed();
    if (u0 >= vv && s.u < vv) { this._wipeout('WASHOUT'); s.spinWash++; return 1; }
    return 0;
  }
  // <<< EFOILSPIN

  setBreachGrace(seconds) { this.breachGraceTicks = Math.round(seconds / 0.008333333); }

  _wipeout(cause) {
    const s = this.state;
    if (s.mode === MODES.DOWN) return;
    s.mode = MODES.DOWN;
    s.wipeoutCause = cause;
    s.downTicks = 0;
    s.ventilated = false;
  }

  get MODES() { return MODES; }
}

export { MODES };
