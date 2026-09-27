// Chase and FPV cameras, hand-rolled on the 2D canvas.
//
// This is NOT the §7 production renderer. That is Three.js on WebGL2 with a
// Gerstner water shader and a wake render target, and it stays the plan. This
// exists because you asked to see it from behind and from the rider's eye
// today, and a pinhole projection over flat grey water costs about 300 lines,
// no dependency, no shader compile and nothing against the 400 ms restart
// budget.
//
// Coordinates: X forward along the heading, Y up, Z to the rider's right.
//
// The hard problem in both 3D views is the one §1 cares about - you cannot
// judge a wing you cannot see. Underwater geometry is drawn AFTER the sea, at
// reduced alpha, so depth stays legible; and FPV gets an explicit depth ribbon,
// because from the rider's eye the foil is invisible and there is no honest way
// around that.

import { BAND } from './params.js';
// >>> EFOILSPIN
// THE THROTTLE STRIP'S GEOMETRY, FROM ITS OWN SOURCE OF TRUTH. input.js's header states the
// rule this module was breaking: "index.html has to DRAW the throttle strip exactly where
// input.js GRABS it - one source of truth for the geometry". The depth ribbon was painted at
// a literal `W - 46` that predates the strip, and on a landscape phone that puts 100% of the
// drawn gauge inside the strip's column and 61% of its backing panel under a semi-opaque DOM
// lever that is stacked above the canvas. Reading stripRect() rather than copying 24 and 64
// into this file is the same rule applied a third time; `stripRect` is a pure function of
// (w, h) and the mirror setting, touches no DOM, and imports in node.
import { stripRect } from './input.js';
// <<< EFOILSPIN

const NEAR = 0.12;
const FOG = 190;              // m - nothing is drawn beyond this

// ---- CAMERA DYNAMICS --------------------------------------------------------
// A chase camera that never moves reads as a diagram: the craft slides about in
// front of a rigid frame and nothing about speed or impact is felt. These are
// the only numbers that decide how much is felt, and they all live here so the
// whole camera can be tuned in one place.
//
// Timing was studied against footage of a real powered craft - how the field of
// view opens on the throttle, how the camera is left behind and swings wide
// through a turn. Timing only. Nothing is copied.
//
// EVERY ONE OF THESE IS INERT UNDER ?cal=. The 19 judged views are the
// project's measuring instrument and a camera that breathes would move all of
// them; see calInert and _dynZero() below.
const CAM_RAW = {
  fovBaseDeg:   62,     // deg - the resting chase field of view; every other FOV number is an offset from it
  fovSpeedDeg:  11,     // deg - extra field of view held at reference speed: the steady-state speed rush
  fovSpeedRef:  15,     // m/s - the surge speed that earns all of fovSpeedDeg (about this craft's top end)
  fovAccelDeg:  9,      // deg - extra field of view while actually accelerating, on top of the speed term.
                        // Deliberately the LARGER of the two: a permanent cruise offset is a setting, a
                        // transient one is the thing you feel
  fovAccelRef:  3.0,    // m/s^2 - the surge acceleration that earns all of fovAccelDeg (p99 of free riding is 5)
  fovMaxDeg:    20,     // deg - hard ceiling on total widening. 62 deg at the dock, 82 flat out: the owner asked for
                        // two obviously different pictures, and this is the number that decides how different
  fovRiseHz:    2.4,    // 1/s - how fast the view opens when you get on the power
  fovFallHz:    0.8,    // 1/s - how fast it eases back when you settle; slower than the rise, or it pumps
  accelHz:      7.0,    // 1/s - smoothing on measured surge acceleration; a raw per-frame difference is noise
  accelClamp:   8.0,    // m/s^2 - ceiling on the acceleration the FOV and the trail may see; a remount zeroes the
                        // surge in one frame and unclamped that reads as -300 m/s^2 and lurches the camera a metre

  lagOmega:     6.5,    // rad/s - chase-spring stiffness; higher sits the camera tighter to the craft
  lagZeta:      1.0,    // damping ratio - 1.0 is critically damped; a camera that oscillates is worse than a rigid one
  lagAccel:     0.30,   // s^2 - metres the camera is left behind per m/s^2 of surge acceleration
  lagTurn:      1.80,   // m per rad/s of yaw rate - how wide the camera swings to the OUTSIDE of a turn
  lagMax:       2.00,   // m - clamp on the spring offset AND the target it chases, so no spike can fling the camera off

  shakeDecay:   9.0,    // 1/s - decay of impact shake; a full hit is imperceptible inside 0.4 s and gone by 0.62 s
  shakeCut:     0.004,  // amplitude at which shake is SET TO ZERO, so it lands on zero instead of wandering near it
  shakeFreq:    31.0,   // rad/s - base shake rate; incommensurate multiples of it keep the motion from reading as a buzz
  shakePos:     0.30,   // m of camera-local positional shake at one unit of impact energy
  shakeAng:     0.040,  // rad of yaw and pitch shake at one unit of impact energy (2.3 deg)
  shakeRef:     8.0,    // m/s of speed lost that counts as one unit of impact energy, for the going-in kick below
  shakeScrubRef: 17,    // m/s SCRUBBED OFF by a collision for a full-strength ring. See the block under hitMin
  hitMin:       0.15,   // the floor any registered contact rings at, so a glancing clip still tells you it happened
  shakeMax:     1.05,   // cap on accumulated impact energy. LOWERED from 1.50 in round 5: a ramp landing fires the
                        // slam ring AND the punch's own companion ring, and stacked they reached 53.7 cm where the
                        // hardest single hit in the game is 38.6. This is the real ceiling and it is now honest

  // ---- WHAT AN IMPACT IS SIZED BY, AND WHY IT CHANGED IN ROUND 5 ----------
  // Until now a BOAT's impact ring was sized by CLOSING SPEED, and a planing hull
  // closes at 18-28 m/s on anything at all. Measured on the integrated tree, every
  // impact on every hull came out at the same 44.5 cm and 2.73 deg: a channel pin,
  // a gatepost and a brig were one event as far as the camera was concerned.
  //
  // Speed SCRUBBED separates them, because it is the thing the physics already
  // varies - buoy-collide's `hold` lever exists precisely to decide how much speed
  // a mark takes off you, and the camera was the one instrument not reading it.
  // Driven flat out into each, on flat water, the scrub is:
  //
  //                    pin      gatepost   brig
  //     jetski          3.8       36.4     40.4  m/s
  //     speedboat       4.8       25.1     27.8
  //     eFoil           2.1       14.9     14.8
  //
  // The eFoil never had this bug: its collision ring has always been sized from
  // `d.pu - u`, which IS the scrub. Round 5 gives the boats the same idea and the
  // same named constants, so there is now one answer to "how big was that" for
  // every craft in the game.
  hitDecel:     45,     // m/s^2 of surge deceleration that means a COLLISION; free riding measures at most 19
  wipeScale:    0.55,   // fraction of the speed-derived energy going in the water is worth; softer than hitting a hull

  airMinH:      0.10,   // m of ride height that counts as clear of the water, for the airtime clock
  landAirMin:   0.22,   // s - shorter than this off the water and a touchdown is not a landing
  landFallMin:  0.80,   // m/s of descent below which a touchdown earns no punch at all
  landFallRef:  4.40,   // m/s of descent that earns a full landing punch. RAISED from 3.00 in round 5 for the
                        // same reason the boats' was: measured at the punch over 15 minutes of hard riding on
                        // three seas, an eFoil arrives at p50 2.30, p90 3.30, max 4.24 m/s - so at 3.00
                        // everything from p90 up sat ON the ceiling. At 4.40: p50 31 cm, p90 52, hardest 72
  fallForget:   18,     // m/s per s - how fast the tracked descent is forgotten, so a punch is sized by THIS fall
  punchDip:     0.75,   // m the camera drops at a full landing punch
  punchPitch:   0.080,  // rad the camera noses down at a full landing punch (4.6 deg)
  punchIn:      26.0,   // 1/s - how sharply the punch bottoms out; this is what makes a landing read as a slam
  punchOut:     6.5,    // 1/s - how fast it recovers; slower than punchIn, so it snaps and then settles
  punchCut:     0.004,  // envelope at which the punch is SET TO ZERO, for the same reason as shakeCut
  punchShake:   0.30,   // how much impact shake a full landing punch also fires. Lowered with shakeMax,
                        // for the same stacking reason

  maxStep:      0.05,   // s - the dynamics integrate at no more than this, so a stalled frame cannot blow up the spring

  // ---- NAUSEA GUARDS ------------------------------------------------------
  // The owner asked for arcade-extreme and every number above now delivers that
  // in AMPLITUDE. What makes camera motion sickening is not amplitude, though:
  // it is RATE and ROTATION. A wide lens held steady is just a wide lens, and a
  // big sideways offset is parallax - but a view that spins, or a field of view
  // that pumps, is what the inner ear objects to. So the amplitudes are free to
  // be large and these four are the ceilings that keep it watchable.
  //
  // The high-frequency shake is deliberately NOT rate-limited. At shakeFreq
  // 31 rad/s (4.9 Hz) it reads as an impact and is nowhere near the ~0.2 Hz band
  // that causes motion sickness; rate-limiting it would only turn a rattle into
  // a sway. It is capped in amplitude instead, by shakeAngMax.
  fovRateMax:   14,     // deg/s - ceiling on how fast the field of view may change. The full 20 deg swing
                        // therefore takes at least 1.4 s: the lens opens, it never snaps
  fovPullIn:    1.1,    // m of chase distance given back at full widening. WITHOUT THIS THE TRICK READS BACKWARDS:
                        // a 20 deg wider lens makes the craft 31% smaller on screen, so the first capture of this
                        // round looked less like speed and more like the camera backing off. Pulling in as the lens
                        // opens keeps the CRAFT its size and lets the WORLD stretch, which is the part that sells it
  angRateMax:   1.2,    // rad/s (69 deg/s) - ceiling on how fast the DYNAMICS may rotate the view. The base
                        // chase camera is not touched by this; only the swing and the landing pitch are limited
  angMax:       0.30,   // rad (17 deg) - hard ceiling on how far off its base aim the dynamics may point the
                        // camera. Past this, more offset shows as the craft sliding in frame, not as more spin
  shakeAngMax:  0.09,   // rad (5.2 deg) - amplitude cap on the shake's own rotation, which is exempt from the
                        // rate limit for the reason above
};

// THE BOATS. Same dynamics, same code, one parallel block - and ONLY the numbers
// that differ are written down, so the deltas and the reasons for them are the
// whole of what you read. Measured from the hulls themselves
// (tmp-tr163/probe-boat*.mjs, 180 s per craft per sea at 120 Hz):
//
//                       eFoil      jetski     speedboat
//   top surge           15.2       28.6       20.0   m/s
//   surge accel p95      2.9        4.1        2.0   m/s^2
//   yaw rate p95         ~0.5       0.46       0.36  rad/s
//   chase distance     3.4-4.9    4.6-6.2    8.5-11.5 m
//
// The chase distance is why most of these are LARGER: the same metre of offset
// subtends less than half the angle behind a speedboat that it does behind an
// eFoil, so a number copied across would simply not be seen.
const CAM_BOAT_RAW = {
  ...CAM_RAW,
  fovSpeedDeg:  13,     // deg - a jetski at 103 km/h has more steady-state rush to sell than a foil at 55
  fovAccelDeg:  8,      // deg - ...and less transient, because a hull is heavy and spools up slowly
  fovSpeedRef:  24,     // m/s - between the jetski's 28.6 top end and the speedboat's 20.0
  fovAccelRef:  3.5,    // m/s^2 - jetski p95 is 4.1, speedboat p95 is 2.0

  lagOmega:     5.0,    // rad/s - softer than the eFoil's 6.5; a slower catch-up is what reads as mass
  lagAccel:     0.38,   // s^2 - more trail per m/s^2, because the camera sits 1.3x to 2.3x further back
  lagTurn:      3.40,   // m per rad/s - a boat's signature is slinging wide, and this is the number that does it
  lagMax:       2.60,   // m - the ceiling on that sling; angMax below decides how much of it is rotation and how much parallax
  fovMaxDeg:    22,     // deg - 62 at rest, 84 flat out. Two more than the eFoil, because a jetski is half again as fast
  fovRateMax:   16,     // deg/s - and it may open two degrees a second faster, for the same reason
  fovPullIn:    1.9,    // m - more to give back, because a jetski's chase camera starts 6.2 m out, not 4.9
  angMax:       0.38,   // rad (22 deg) - a boat may point further off its base aim than a foil: it is bigger, slower
                        // and further away, so the same rotation reads as less violent

  shakeDecay:   7.5,    // 1/s - a heavier craft rings a little longer than the eFoil's 9.0
  shakePos:     0.42,   // m - more metres for the same felt knock, again because of the chase distance
  shakeAng:     0.045,  // rad - angle does not care about distance, so this barely moves
  shakeRef:     12.0,   // m/s of speed that counts as one unit for the going-in kick
  shakeScrubRef: 44,    // m/s scrubbed off for a full-strength ring. A brig ram takes 40.4 off a jetski and is the
                        // biggest thing in the game; a gatepost 36.4; a pin 3.8, which lands on the hitMin floor

  // ---- LANDINGS, RE-DERIVED IN ROUND 3 ------------------------------------
  // ROUND 2 GOT THESE FROM A WORLD THAT COULD NOT JUMP. hull.js was applying a
  // buoyancy spring to hull points that had left the water, so the longest airtime
  // reachable in ten minutes of hard riding was 0.192 s and every "landing" was a
  // skip. With that fixed (tmp-tr165, JUICE) the longest is 1.22 s. Re-measured on
  // the fixed hull over 10,800 s - 18 rides, 2 craft x 3 seas x 3 turn rates, full
  // throttle, 2,394 airborne runs - which is deliberately the same rig and the same
  // sample size src/ui/juice.js re-derived its own thresholds on:
  //
  //   airborne runs   p50 0.12 s   p90 0.43 s   p99 0.83 s   longest 1.22 s
  //   >= 0.30 s  497 (one per 22 s)    >= 0.35 s  380 (one per 28 s)
  //   descent at touchdown, air >= 0.35 s:  p10 2.39  p50 3.26  p90 4.87  max 6.89 m/s
  //
  // AND THE SIGNAL CHANGED, not just the numbers. Round 2 scaled the punch by the
  // hull's slam load factor, read on the frame hull.js opens the slam - but that is
  // the load at FIRST CONTACT, and the peak arrives over the 0.1 s window after it.
  // Measured: for a landing off 0.6 s of air the entry figure is p50 3.06 g while
  // the peak is p50 7.11 g. The camera was therefore sizing the biggest arrivals in
  // the game as if they were medium ones, and the only fix that keeps the g scale is
  // to wait 0.1 s for the peak - which is a tenth of a second of latency on the one
  // effect that has to land ON the impact.
  //
  // So the punch is now scaled by the DESCENT SPEED the craft arrived at, which is
  // known immediately, distributes cleanly, and is the same quantity the eFoil path
  // has always used - two craft, one idea. The band below is JUICE's vySoft/vyHard,
  // on purpose: the camera and the landing verdict grade the same arrival the same way.
  landAirMin:   0.35,   // s of airtime before a touchdown is a LANDING at all. One per 28 s of hard riding, and the
                        // same gate src/ui/juice.js grades on, so the two features agree on what a landing is
  landFallMin:  1.8,    // m/s of descent for the faintest dip (JUICE's vySoft). At the gate, p10 is 2.39 m/s
  landFallRef:  9.5,    // m/s for the full dip. RAISED from 6.0 in round 5: ramps are live, and 6.0 m/s is reached
                        // by a 1.85 m drop - so a 2 m hop and a 4.5 m ramp launch produced the SAME 110 cm dip.
                        // At 9.5 a 2 m drop is 60 cm, a 1.2 s wave flight 73 cm and a 4.5 m ramp 105 cm

  // ---- and the hard-slam SHAKE, which is not the same event ----------------
  // A slam with no airtime in front of it is not a landing, so it gets no dip - but a
  // hull that comes down hard has to register as something. It rings the camera instead.
  //
  // ROUND 5 CHANGED WHAT SIZES IT. It used to read the load factor at first contact,
  // and that is a bad instrument twice over: it saturated (a 2 m drop reads 8-9 g
  // against a 9 g reference) and it is not even monotonic - a 4.5 m drop measured
  // 7.02 g at first contact where a 3 m drop measured 17.58, because the figure
  // depends on which 120 Hz tick happens to cross the threshold first. Descent speed
  // has neither fault: 0.5 m 0.0, 1 m 4.09, 2 m 6.05, 3 m 7.52, 4.5 m 9.16 m/s.
  //
  // The TRIGGER is still hull.js's own slam event, which is the hull saying "that was
  // a slam" and is exactly the right thing to trigger on. Only the size changed.
  //
  // hub.js's own _shake() still fires on EVERY slam at up to 6 cm. This needs 3 m/s of
  // descent before it contributes anything at all, so the two do not double up.
  slamFallMin:  3.0,    // m/s of descent before a slam rings the camera; ordinary riding is p50 3.26
  slamFallRef:  15.0,   // m/s for a full ring. Set by the CEILING, not by the floor: a 4.5 m ramp drop arrives at
                        // 9.16 m/s and fires this ring AND the punch's companion one, and at 12.0 the two stacked
                        // to 34.3 cm - level with a brig ram. At 15.0 they stack to 29 cm and the brig stays the
                        // biggest thing in the game, which is the ordering that matters

  punchDip:     1.10,   // m - a bigger dip, for the same reason as shakePos. A 1.2 s flight now lands as a metre
  punchPitch:   0.100,  // rad - a hull coming down noses in harder than a foil does (5.7 deg)
  punchIn:      20.0,   // 1/s - slightly slower to bottom out than the eFoil's 26: weight, not sponginess
  punchOut:     5.0,    // 1/s - and slower to recover, so it settles rather than springs back
};

// Freeze a tuning set and precompute everything derived from it, so there is
// exactly one way a tuning set can come into existence and the per-frame path
// does no conversion. fovBase is written as the original literal expression
// (62 * Math.PI / 180) so the gated camera is bit-identical, not merely close.
function tuned(o) {
  const t = Math.log(o.punchIn / o.punchOut) / (o.punchIn - o.punchOut);
  return Object.freeze({
    ...o,
    fovBase: o.fovBaseDeg * Math.PI / 180,
    fovSpeed: o.fovSpeedDeg * Math.PI / 180,
    fovAccel: o.fovAccelDeg * Math.PI / 180,
    fovMax: o.fovMaxDeg * Math.PI / 180,
    // Peak time and normaliser of the punch envelope exp(-out.t) - exp(-in.t), so
    // punchDip and punchPitch are the metres and radians you actually get at full
    // energy rather than an arbitrary fraction of them.
    punchT: t,
    punchN: 1 / (Math.exp(-o.punchOut * t) - Math.exp(-o.punchIn * t)),
  });
}

export const CAM = tuned(CAM_RAW);
export const CAM_BOAT = tuned(CAM_BOAT_RAW);

// THE PLAYER'S DIAL. One multiplier on every amplitude, so turning the camera
// down is one number and not a second tuning set to keep in step.
//
//   full     what the owner asked for
//   reduced  0.45 of it, which is almost exactly the strength that shipped in the
//            round-3 build - the one they rode and said they could not see much had
//            changed. So it is a real, usable setting, not a token.
//   off      exactly zero: the static camera this project had before any of this
//
// The scale is applied to the OUTPUT (the offsets and the field-of-view delta),
// never to the state, so changing it mid-ride cannot jolt the spring.
export const CAM_LEVELS = { full: 1, reduced: 0.45, off: 0 };

export class View3D {
  constructor(canvas) {
    this.c = canvas;
    this.ctx = canvas.getContext('2d');
    this.mode = 'chase';        // 'chase' | 'fpv'
    this.cam = { x: -6, y: 2.4, z: 0, yaw: 0, pitch: -0.10 };
    this.fovBase = CAM.fovBase;
    this.fovY = this.fovBase;
    // THE CALIBRATION GATE. main.js sets this for any ?cal= render and with it
    // set nothing below moves the camera or the field of view by one bit.
    this.calInert = false;
    // The follow smoothing lives on `base`; the rendered camera is base plus the
    // dynamics offsets. Keeping them apart is what stops the smoother eating its
    // own shake - and with every offset zero, cam IS base, arithmetic for
    // arithmetic, which is what makes the gate provable rather than argued.
    this.base = { x: -6, y: 2.4, z: 0 };
    this._yawBase = 0;
    this.dyn = this._dynNew();
    // The tuning set in force. CAM for the eFoil; boats/hub.js swaps in CAM_BOAT
    // while it owns the frame. One craft is active at a time, so one dyn state and
    // one switched tuning set is the whole of what two craft need.
    this.tune = CAM;
    // The player's camera-motion setting, 0..1. main.js sets it from the URL, from
    // storage, or from prefers-reduced-motion; setMotion() is the only way in.
    this.motion = 1;
    this.motionName = 'full';
    // The angular contribution the dynamics are currently making, kept so it can be
    // RATE-limited rather than applied instantly (see _angStep).
    this._ang = { yaw: 0, pitch: 0 };
    this._dt = 1 / 60;
    // What applyDynamics() last added to a caller-owned pose, so liftDynamics()
    // can take exactly that back off before the caller's own smoother runs. It
    // belongs to that pair alone; the eFoil path has its own scratch below.
    this._applied = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0 };
    this._off = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0 };
    this._p = { x: 0, y: 0, z: 0, on: false };
    this._q = { x: 0, y: 0, z: 0, on: false };
    this.showRibbon = false;
    // Wake trail, pooled. In the reference footage the trailing wake is what
    // sells the speed and tells you the board is flying - without it a flat
    // grey plane gives the eye nothing at all.
    this.tN = 150;
    this.tx = new Float32Array(this.tN);
    this.tz = new Float32Array(this.tN);
    this.tw = new Float32Array(this.tN);   // strength, 0 = unused
    this.ti = 0;
    this.tAccum = 0;
  }

  // A real restart. Pooled arrays are refilled, never reallocated, and the
  // camera smoothing is dropped so R does not fly the chase cam in from
  // wherever the last run ended.
  reset() {
    this.tx.fill(0); this.tz.fill(0); this.tw.fill(0);
    this.ti = 0;
    this.tAccum = 0;
    this.cam.x = -6; this.cam.y = 2.4; this.cam.z = 0;
    this.cam.yaw = 0; this.cam.pitch = -0.10;
    this.roll = 0;
    this.base.x = -6; this.base.y = 2.4; this.base.z = 0;
    this._yawBase = 0;
    this._dynZero();
  }

  pushWake(sim, dt) {
    const s = sim.plant.state, w = sim.world;
    this.tAccum += dt;
    if (this.tAccum < 0.035) return;
    this.tAccum = 0;
    for (let i = 0; i < this.tN; i++) if (this.tw[i] > 0) this.tw[i] -= 0.012;
    if (s.speed < 1.2) return;
    this.tx[this.ti] = w.x; this.tz[this.ti] = w.z;
    this.tw[this.ti] = Math.min(1, s.speed / 9) * (s.mode === 'DOWN' ? 0.35 : 1);
    this.ti = (this.ti + 1) % this.tN;
  }

  _wake(sim) {
    const ctx = this.ctx;
    const sea = sim && sim.sea;
    ctx.lineCap = 'round';
    for (let k = 0; k < this.tN; k++) {
      const i = (this.ti + k) % this.tN;
      const j = (i + 1) % this.tN;
      if (this.tw[i] <= 0 || this.tw[j] <= 0) continue;
      // Foam sits ON the water, so it has to ride the wave it was laid on -
      // otherwise the wake slices through crests like a wire.
      const hi = sea && !sea.isFlat ? sea.sample(this.tx[i], this.tz[i], sim.time, 0, 3).height : 0;
      const hj = sea && !sea.isFlat ? sea.sample(this.tx[j], this.tz[j], sim.time, 0, 3).height : 0;
      const seg = this.seg(this.tx[i], hi + 0.01, this.tz[i], this.tx[j], hj + 0.01, this.tz[j]);
      if (!seg) continue;
      const a = this.tw[i];
      ctx.strokeStyle = `rgba(235,244,252,${0.42 * a})`;
      ctx.lineWidth = 1 + 3.2 * a;
      ctx.beginPath(); ctx.moveTo(seg[0], seg[1]); ctx.lineTo(seg[2], seg[3]); ctx.stroke();
    }
  }

  resize(w, h, dpr) {
    this.dpr = dpr;
    this.W = w; this.H = h;
    this.f = (h / 2) / Math.tan(this.fovY / 2);
  }

  // ---- camera dynamics ---------------------------------------------------
  // All of this writes this.dyn and this.fovY and NOTHING else. It never writes
  // the sim, the plant or the world: the camera is allowed to have opinions
  // about the ride, never about the physics.
  _dynNew() {
    return {
      fov: 0,                      // extra field of view, rad
      acc: 0,                      // smoothed surge acceleration, m/s^2
      ox: 0, oz: 0,                // spring offset from the followed pose, world m
      vx: 0, vz: 0,                // and its velocity
      shake: 0,                    // impact energy still ringing; 0 means perfectly still
      punch: 0, punchT: 0,         // landing-punch amplitude and its own clock
      t: 0,                        // oscillator clock, run only while something is ringing
      pu: 0, pMode: 'FLOAT', pTick: 0,
      air: 0, fall: 0,
      // The boats' side: the hull's own counters, last seen. -1 means "not yet
      // synced to a hull", which is how a park avoids firing on history.
      pHits: -1, pSlams: -1, pAir: 0,
    };
  }

  // A hard stop, never a fade. This is what ?cal= gets, and what a restart gets:
  // an eased-out shake would still be a moved camera on the next frame.
  _dynZero(tune = this.tune) {
    const d = this.dyn;
    d.fov = 0; d.acc = 0;
    d.ox = 0; d.oz = 0; d.vx = 0; d.vz = 0;
    d.shake = 0; d.punch = 0; d.punchT = 0; d.t = 0;
    d.air = 0; d.fall = 0;
    d.pHits = -1; d.pSlams = -1; d.pAir = 0;
    this._applied.x = 0; this._applied.y = 0; this._applied.z = 0;
    this._applied.yaw = 0; this._applied.pitch = 0;
    this._ang.yaw = 0; this._ang.pitch = 0;
    this.fovY = tune.fovBase;
    if (this.H) this.f = (this.H / 2) / Math.tan(this.fovY / 2);
  }

  // Set the player's camera-motion level by name. Anything unknown falls back to
  // full rather than to nothing, because a typo in a URL should not silently
  // disable a feature. 'off' parks the dynamics outright, so the setting is exact
  // from the frame it is chosen rather than after a fade.
  setMotion(name) {
    const m = CAM_LEVELS[name];
    this.motionName = m === undefined ? 'full' : name;
    this.motion = m === undefined ? 1 : m;
    if (this.motion === 0) this._dynZero();
    return this.motionName;
  }

  // Park at rest. Used on a craft change and whenever a view that has no dynamics
  // (the side-on instrument view) owns the frame, so nothing can inherit a frozen
  // field of view or a stale offset from the craft before it.
  parkDynamics() { this._dynZero(); }

  // HOW HARD DID THAT HIT. One answer for every craft: the speed it actually took
  // off you, against this tuning set's reference, with a floor so that a contact the
  // hull bothered to count is never silently nothing. Closing speed is deliberately
  // not used - see the block above hitDecel for what that cost.
  _hitEnergy(scrub) {
    const T = this.tune;
    return Math.max(T.hitMin, Math.min(1.2, Math.max(0, scrub) / T.shakeScrubRef));
  }

  // Ring the camera. energy 1 is a full-speed collision. Public, so a game layer
  // that knows about an impact this file cannot see can simply say so.
  impulse(energy) {
    if (this.calInert || !(energy > 0)) return;
    this.dyn.shake = Math.min(this.tune.shakeMax, this.dyn.shake + energy);
  }

  // Fire the landing punch, energy 0..1. A slam is a dip AND a knock, so it
  // rings the shake as well - that is what separates it from a gentle settle.
  landing(energy) {
    if (this.calInert || !(energy > 0)) return;
    const d = this.dyn, e = Math.min(1, energy);
    if (e >= d.punch) { d.punch = e; d.punchT = 0; }
    this.impulse(e * this.tune.punchShake);
  }

  // Current punch magnitude, 0 when nothing is landing.
  _punchEnv() {
    const d = this.dyn, T = this.tune;
    if (d.punch <= 0) return 0;
    return d.punch * T.punchN *
      (Math.exp(-T.punchOut * d.punchT) - Math.exp(-T.punchIn * d.punchT));
  }

  // ONE STEP OF THE CAMERA PHYSICS, FOR ANY CRAFT.
  //
  //   read:   { u, heading, turn, tick, live } - the only thing the dynamics know
  //           about the craft. u is SURGE (not flow speed: flow speed carries the
  //           wave orbital velocity and differentiates into noise the field of
  //           view would chase). tick is any monotonic step counter; going
  //           backwards means a restart. live false parks every target at zero.
  //   tune:   CAM for the eFoil, CAM_BOAT for a boat.
  //   events: optional, called once the restart guard has passed, with the RAW
  //           surge acceleration, the clamped surge and the clamped step. A craft
  //           fires its own impulse()/landing() from
  //           in here, because what counts as a collision or a landing is the one
  //           thing that genuinely differs between a foil and a planing hull.
  //
  // Writes this.dyn and this.fovY and nothing else. It never writes the sim, a
  // hull, the plant or the world: the camera may have opinions about the ride,
  // never about the physics.
  stepDynamics(read, tune, dtRaw, events) {
    const d = this.dyn;
    this.tune = tune;
    if (this.calInert) { this._dynZero(tune); return; }
    // THE STEP CLAMP LIVES HERE, NOT IN THE CALLERS. It was a caller's job for
    // exactly one round and the boat path promptly passed an unclamped frame time:
    // the spring is integrated semi-implicitly and needs lagOmega * dt < 2, so a
    // single 0.25 s stall frame put it at 6.25 and the offset blew out to 24 m -
    // the camera a quarter of a street away from the craft. One guard, in the one
    // place every craft has to come through.
    const dt = Math.min(Math.max(dtRaw, 1 / 240), tune.maxStep);
    this._dt = dt;                       // applyDynamics() rate-limits with the same step
    if (this.motion === 0) { this._dynZero(tune); return; }

    // A restart rewinds the tick counter. Without this the surge that vanished
    // with it reads as a head-on collision and the camera is thrown on every R.
    if (read.tick < d.pTick) {
      this._dynZero(tune);
      d.pu = Math.max(0, read.u); d.pTick = read.tick;
      return;
    }
    d.pTick = read.tick;

    const live = !!read.live;
    const u = Math.max(0, read.u);
    const accRaw = (u - d.pu) / dt;
    // A craft's own event detection wants the RAW figure; the field of view and
    // the trail want a clamped, smoothed one - see accelClamp.
    const accIn = Math.max(-tune.accelClamp, Math.min(tune.accelClamp, accRaw));
    d.acc += (accIn - d.acc) * (1 - Math.exp(-tune.accelHz * dt));
    if (events && live) events(accRaw, u, dt);
    d.pu = u;

    // ---- field of view ---------------------------------------------------
    const want = live
      ? Math.min(tune.fovMax,
          tune.fovSpeed * Math.min(1, u / tune.fovSpeedRef) +
          tune.fovAccel * Math.min(1, Math.max(0, d.acc) / tune.fovAccelRef))
      : 0;
    d.fov += (want - d.fov) * (1 - Math.exp(-(want > d.fov ? tune.fovRiseHz : tune.fovFallHz) * dt));
    if (want === 0 && d.fov < 1e-7) d.fov = 0;
    // GUARD 1: the field of view may be as wide as it likes, but it may not get
    // there quickly. Applied to the number the eye actually sees - after the
    // player's own scale - so turning the camera down also slows what is left.
    const wantY = tune.fovBase + d.fov * this.motion;
    const step = tune.fovRateMax * (Math.PI / 180) * dt;
    const dF = wantY - this.fovY;
    this.fovY += dF > step ? step : dF < -step ? -step : dF;
    if (this.H) this.f = (this.H / 2) / Math.tan(this.fovY / 2);

    // ---- spring ----------------------------------------------------------
    // The camera trails what the craft just did: back along the heading under
    // acceleration, and out to the OUTSIDE of a turn. Critically damped, so it
    // catches up without ever swinging past - an underdamped chase camera reads
    // as a fault, not as weight.
    let tx = 0, tz = 0;
    if (live) {
      const ch = Math.cos(read.heading), sh = Math.sin(read.heading);
      const trail = -tune.lagAccel * d.acc;             // negative = left behind
      const swing = -tune.lagTurn * (read.turn || 0);   // turning right swings the camera left
      tx = ch * trail - sh * swing;
      tz = sh * trail + ch * swing;
      const len = Math.hypot(tx, tz);
      if (len > tune.lagMax) { const c = tune.lagMax / len; tx *= c; tz *= c; }
    }
    const kk = tune.lagOmega * tune.lagOmega, cc = 2 * tune.lagZeta * tune.lagOmega;
    d.vx += (-kk * (d.ox - tx) - cc * d.vx) * dt; d.ox += d.vx * dt;
    d.vz += (-kk * (d.oz - tz) - cc * d.vz) * dt; d.oz += d.vz * dt;
    // lagMax bounds the STATE as well as the target it is chasing. Clamping only the
    // target bounds the spring in steady state and promises nothing at all about a
    // transient - and "no spike can fling the camera off the craft" has to be a
    // guarantee, not an expectation about how the integrator will behave.
    const off = Math.hypot(d.ox, d.oz);
    if (off > tune.lagMax) {
      const c = tune.lagMax / off;
      d.ox *= c; d.oz *= c; d.vx *= c; d.vz *= c;
    }

    // ---- shake and punch envelopes ---------------------------------------
    if (d.shake > 0) {
      d.shake *= Math.exp(-tune.shakeDecay * dt);
      if (d.shake < tune.shakeCut) d.shake = 0;    // lands ON zero, never an asymptote
    }
    if (d.punch > 0) {
      d.punchT += dt;
      if (d.punchT > tune.punchT && this._punchEnv() < tune.punchCut) { d.punch = 0; d.punchT = 0; }
    }
    // The oscillator clock only runs while something is ringing, so it never
    // grows large enough to cost the sines their precision.
    d.t = (d.shake > 0 || d.punch > 0) ? d.t + dt : 0;
  }

  // THE EFOIL EVENTS. A foil has no slam instrument of its own, so a collision has
  // to be read out of the surge trace and a landing out of the flight mode. A
  // planing hull measures both for itself - see boats/hub.js - which is why the
  // two craft share the dynamics above but not this.
  _efoilEvents(sim, dt, accRaw, u) {
    const d = this.dyn, s = sim.plant.state;
    const T = CAM;
    // Descent, tracked as a decaying minimum, so the punch is sized by the fall
    // that just happened rather than by one the plant has already zeroed.
    d.fall = Math.min(s.w, d.fall + T.fallForget * dt);
    if (s.rideHeight > T.airMinH) d.air += dt;

    // COLLISION. Free riding on the worst sea measures 19 m/s^2 of surge
    // deceleration, so 45 can only be something solid. The DOWN state own drag
    // decay is far above that and is excluded by name rather than by hoping the
    // threshold happens to clear it.
    if (s.mode !== 'DOWN' && d.pMode !== 'DOWN' && -accRaw > T.hitDecel) {
      this.impulse(this._hitEnergy(d.pu - u));
    }
    // GOING IN. One kick on the transition, sized by the speed it happened at.
    if (s.mode === 'DOWN' && d.pMode !== 'DOWN') {
      this.impulse((u / T.shakeRef) * T.wipeScale);
    }
    // LANDING. Leaving flight after real airtime, with the craft coming down.
    if (d.pMode === 'FLYING' && s.mode !== 'FLYING' && d.air > T.landAirMin) {
      const v = -d.fall;
      if (v > T.landFallMin) this.landing((v - T.landFallMin) / (T.landFallRef - T.landFallMin));
    }
    if (s.mode !== 'FLYING') d.air = 0;
    d.pMode = s.mode;
  }

  // THE BOATS' EVENTS, and the reason the two craft share the dynamics but not
  // this. A planing hull already MEASURES what the eFoil has to infer: hull.js
  // counts collisions with the closing speed of each one (hits / lastHitSpeed),
  // counts slams with the vertical load factor they pulled (slams / slamG, in g),
  // and counts the ticks it spends completely clear of the water (airTicks).
  // Reading the hull's own instruments is both cheaper and more honest than
  // guessing at them from the pose.
  //
  // Called from boats/hub.js, which owns the frame while a boat is selected.
  boatEvents(h, dt) {
    const d = this.dyn, T = CAM_BOAT;
    // NO STEP, NO EVENTS. d.fall and d.air are integrators, so a caller that forgets
    // dt would turn them into NaN and the landing punch would then never fire again -
    // a dead feature that still passes a smoke test. Refusing to write anything makes
    // the failure "no punches ever", which tmp-tr163/test-camdyn-boat-r3.mjs fences
    // explicitly ("the punch is ALIVE, not merely rare"). It found exactly this.
    if (!(dt > 0)) return;
    // First frame on a hull, or straight after a park or a reset: adopt its
    // counters silently. Otherwise the camera is kicked by history it never saw.
    if (d.pHits < 0 || h.hits < d.pHits) d.pHits = h.hits;
    if (d.pSlams < 0 || h.slams < d.pSlams) d.pSlams = h.slams;

    // Descent, tracked as a decaying minimum. The hull steps at 120 Hz and this runs
    // once a drawn frame, so the touchdown tick itself is usually missed and vy has
    // already been turned around by the impact by the time it is read. The minimum
    // holds the speed the craft was actually falling at, and forgets it fast enough
    // that the NEXT landing is sized by its own arrival.
    d.fall = Math.min(h.vy, d.fall + T.fallForget * dt);
    if (h.airTicks > 0) d.air += dt;

    // COLLISION. Sized by what the hit TOOK OFF YOU, not by how fast you were closing
    // on it - `d.pu` is last frame's surge and the hull has already resolved the impulse
    // and the raid's hold floor by the time this runs, so the difference is the net scrub.
    // The same call the eFoil makes, two lines up in _efoilEvents.
    // h.u RAW, not clamped at zero: a hard hit REVERSES the surge, and a post leaves a
    // jetski going backwards at 9.4 m/s where a brig leaves it at 13.9. Clamping the
    // current speed up to zero threw exactly that difference away and made the two
    // identical again - which is the same failure as closing speed, one layer down.
    if (h.hits > d.pHits) this.impulse(this._hitEnergy(d.pu - h.u));

    // A HARD SLAM, WITH OR WITHOUT AIR UNDER IT. Rings the camera, never dips it: a dip
    // is what a landing gets. Triggered by the hull's own slam event - that is the hull
    // saying "that was a slam" - and sized by the descent it arrived at, for the reasons
    // in the CAM_BOAT block.
    if (h.slams > d.pSlams) {
      const v = -d.fall;
      if (v > T.slamFallMin) {
        this.impulse(Math.min(1, (v - T.slamFallMin) / (T.slamFallRef - T.slamFallMin)));
      }
    }

    // THE LANDING. Back on the water after real airtime, scaled by the speed it
    // arrived at. See the CAM_BOAT block for where 0.35 s and 1.8-6.0 m/s come from.
    if (d.pAir > 0 && h.airTicks === 0) {
      if (d.air > T.landAirMin) {
        const v = -d.fall;
        if (v > T.landFallMin) this.landing((v - T.landFallMin) / (T.landFallRef - T.landFallMin));
      }
      d.air = 0;
    }
    if (h.airTicks === 0) d.air = 0;
    d.pAir = h.airTicks;
    d.pHits = h.hits; d.pSlams = h.slams;
  }

  // GUARDS 2 and 3, in one place: how fast the dynamics may rotate the view, and
  // how far off its base aim they may point it. `wy`/`wp` are what the dynamics
  // would like; the return is what they are allowed. The BASE camera never passes
  // through here - only the difference the dynamics are adding to it - so steering
  // the craft is as quick as it ever was, however hard this is clamped.
  _angStep(wy, wp, dt) {
    const T = this.tune, a = this._ang;
    const cap = T.angMax;
    const ty = wy > cap ? cap : wy < -cap ? -cap : wy;
    const tp = wp > cap ? cap : wp < -cap ? -cap : wp;
    const step = T.angRateMax * dt;
    const dy = ty - a.yaw, dp = tp - a.pitch;
    a.yaw += dy > step ? step : dy < -step ? -step : dy;
    a.pitch += dp > step ? step : dp < -step ? -step : dp;
    return a;
  }

  // The current dynamics offsets, in world metres and radians, written into `out`.
  // Exactly zero in every field when nothing is ringing and the spring is home,
  // which is what the ?cal= gate relies on.
  // The SLOW terms go out as x/y/z and pitch and are rate-limited by _angStep.
  // The SHAKE's rotation goes out separately as syaw/spitch and is not, because
  // rate-limiting a 4.9 Hz rattle would turn it into a sway - it is capped in
  // amplitude by shakeAngMax instead. Everything is scaled by the player's own
  // motion setting, which is why `off` is exactly zero in every field.
  _dynOffsets(yaw, out) {
    const d = this.dyn, T = this.tune, M = this.motion;
    const env = this._punchEnv();
    out.x = d.ox * M; out.z = d.oz * M; out.y = -T.punchDip * env * M;
    out.pitch = -T.punchPitch * env * M;
    // Give back some chase distance in step with the widening, so the craft keeps its
    // size on screen and it is the WORLD that opens up. Along the camera's own view
    // axis, so it changes the framing and not the aim.
    const pull = T.fovPullIn * (d.fov / T.fovMax) * M;
    if (pull) { out.x += Math.cos(yaw) * pull; out.z += Math.sin(yaw) * pull; }
    out.syaw = 0; out.spitch = 0;
    if (d.shake > 0) {
      const t = d.t, F = T.shakeFreq, A = T.shakePos * d.shake * M;
      const n1 = Math.sin(t * F) * 0.6 + Math.sin(t * F * 1.73 + 1.1) * 0.4;
      const n2 = Math.sin(t * F * 1.31 + 2.4) * 0.6 + Math.sin(t * F * 2.29 + 0.3) * 0.4;
      const n3 = Math.sin(t * F * 0.89 + 3.7) * 0.6 + Math.sin(t * F * 2.11 + 5.2) * 0.4;
      // Sideways in the CAMERA frame, so a hit reads as the rig being knocked off
      // line rather than as the world sliding.
      const cy = Math.cos(yaw), sy = Math.sin(yaw);
      out.x += -sy * n1 * A; out.z += cy * n1 * A; out.y += n2 * A;
      const cap = T.shakeAngMax, g = T.shakeAng * d.shake * M;
      const sYaw = n3 * g, sPit = n1 * g;
      out.syaw = sYaw > cap ? cap : sYaw < -cap ? -cap : sYaw;
      out.spitch = sPit > cap ? cap : sPit < -cap ? -cap : sPit;
    }
    return out;
  }

  // FOR A CRAFT THAT OWNS ITS OWN CAMERA SMOOTHING (boats/hub.js). Take last
  // frame offsets back off the pose BEFORE that smoother runs - a smoother fed
  // its own shake turns a decaying kick into a permanent drift - then put this
  // frame offsets on with applyDynamics() once the pose has been framed.
  liftDynamics(cam) {
    const a = this._applied;
    cam.x -= a.x; cam.y -= a.y; cam.z -= a.z;
    cam.yaw -= a.yaw; cam.pitch -= a.pitch;
    a.x = 0; a.y = 0; a.z = 0; a.yaw = 0; a.pitch = 0;
  }

  // ...and the other half. Inert under ?cal= and at motion 'off', where every
  // offset is already zero.
  //
  // `look` is the point the caller framed its shot on. Given it, the camera is
  // RE-AIMED from wherever the dynamics moved it to - which is what turns a
  // sideways offset into a swing around the craft instead of the craft sliding
  // out of frame. That rotation, and the landing pitch, then go through the rate
  // and excursion guards; the shake's own rotation is added after them.
  applyDynamics(cam, look) {
    if (this.calInert || this.motion === 0) return;
    const o = this._dynOffsets(cam.yaw, this._off);
    const a = this._applied;
    const nx = cam.x + o.x, ny = cam.y + o.y, nz = cam.z + o.z;
    let wy = 0, wp = o.pitch;
    if (look) {
      const dx = look.x - nx, dz = look.z - nz, dy = look.y - ny;
      let dyaw = Math.atan2(dz, dx) - cam.yaw;
      while (dyaw > Math.PI) dyaw -= Math.PI * 2;
      while (dyaw < -Math.PI) dyaw += Math.PI * 2;
      wy += dyaw;
      wp += Math.atan2(dy, Math.hypot(dx, dz)) - cam.pitch;
    }
    const ang = this._angStep(wy, wp, this._dt);
    a.x = o.x; a.y = o.y; a.z = o.z;
    a.yaw = ang.yaw + o.syaw; a.pitch = ang.pitch + o.spitch;
    cam.x += a.x; cam.y += a.y; cam.z += a.z;
    cam.yaw += a.yaw; cam.pitch += a.pitch;
  }

  // ---- camera ------------------------------------------------------------
  update(sim, dt) {
    const s = sim.plant.state, w = sim.world;
    const head = w.heading;
    // >>> EFOILSPIN
    // WHICH HEADING A CAMERA WANTS IS NOT THE SAME QUESTION FOR BOTH CAMERAS, and until the
    // foil could spin the two answers were the same number so nobody had to ask.
    //
    //   FPV keeps `head`, the body heading. You are standing on the board; if the board
    //   turns under you, the world turns. That IS the trick from the rider's eye and taking
    //   it away would be the camera deciding the rotation did not happen.
    //   CHASE takes `track`, the direction of travel. A chase camera trails the flight path,
    //   which is what it has always done - it only looked like "trails the heading" because
    //   the two were identical. Fed the body heading it orbits the craft at 240 deg/s and a
    //   360 is viewed from the front halfway through; fed the track it holds still and the
    //   board rotates inside the frame, which is what the rotation is supposed to look like.
    //
    // The dynamics take `track` for the same reason: lagAccel trails the craft back along
    // where it is GOING and lagTurn swings it to the outside of a turn, and neither of those
    // is a statement about which way the deck is pointing.
    //
    // With spinYaw 0 - every tick of every ramp-free level - `track` IS `head` and every
    // expression below is the one that was here.
    const track = w.spinYaw ? w.heading - w.spinYaw : w.heading;
    // <<< EFOILSPIN
    const cx = w.x, cz = w.z, cy = s.y;
    const down = s.mode === 'DOWN';

    // THE CALIBRATION GATE, first thing and unconditional. stepDynamics() zeroes
    // outright under ?cal= rather than easing out: an ease is still motion, and
    // the 19 judged views must come back bit for bit.
    const ddt = Math.min(Math.max(dt, 1 / 240), CAM.maxStep);   // stepDynamics clamps too; _efoilEvents needs the same figure
    this.stepDynamics(
      // >>> EFOILSPIN
      { u: s.u, heading: track, turn: w.turnRate, tick: sim.tick, live: this.mode === 'chase' },
      // <<< EFOILSPIN
      CAM, ddt, (accRaw, u) => this._efoilEvents(sim, ddt, accRaw, u));

    if (this.mode === 'fpv') {
      // Rider's eye: on the board, roughly shoulder height, looking where the
      // board points. Pitch follows the board so the horizon moves with you.
      const eye = down ? 0.35 : 1.52;
      this.cam.x = cx - Math.cos(head) * 0.15;
      this.cam.z = cz - Math.sin(head) * 0.15;
      this.cam.y = Math.max(0.12, cy + eye);
      this.cam.yaw = head;
      this.cam.pitch = -0.13 + s.pitch * 0.55 - (down ? 0.35 : 0);
      this.roll = w.roll * 0.5;
      return;
    }

    // Chase: framed off real 360-cam-on-a-pole eFoil footage - close, low, and
    // looking at the rider's back rather than at the board. The rider should
    // fill a good part of the frame and the horizon should sit a little above
    // centre. Earlier this sat 6-9 m back and read like a spectator drone.
    const dist = 3.4 + Math.min(1.5, s.speed * 0.09);
    // >>> EFOILSPIN
    const tx = cx - Math.cos(track) * dist;
    const tz = cz - Math.sin(track) * dist;
    // <<< EFOILSPIN
    const ty = Math.max(0.5, cy + 1.35 + Math.min(0.5, s.speed * 0.02));
    const k = Math.min(1, dt * (down ? 2.2 : 5.5));
    const b = this.base;
    b.x += (tx - b.x) * k;
    b.z += (tz - b.z) * k;
    b.y += (ty - b.y) * k;

    // The dynamics ride ON TOP of the follow and are never fed back into it. A
    // smoother that eats its own shake turns a decaying kick into a drift, and
    // with every offset zero the three lines below are exactly `cam = base`.
    //
    // Unlike a boat, the eFoil applies its offsets BEFORE the look-at below, so
    // the spring swings the camera around a rider who stays framed rather than
    // sliding the whole picture. That is the one real difference between the two
    // craft paths, and it is why this does not call applyDynamics().
    const o = this._dynOffsets(this.cam.yaw, this._off);
    this.cam.x = b.x + o.x;
    this.cam.z = b.z + o.z;
    this.cam.y = b.y + o.y;

    // Look at the rider's torso, not the deck - that is what puts the horizon
    // where the footage puts it.
    // >>> EFOILSPIN
    const lx = cx + Math.cos(track) * 1.4, lz = cz + Math.sin(track) * 1.4;
    // <<< EFOILSPIN
    const ly = cy + 0.72;
    // THE BASE AIM: where the camera would look with no dynamics on it at all.
    // Everything below is measured as a difference from this, so the guards can
    // limit what the dynamics add without ever slowing down steering the craft.
    const bdx = lx - b.x, bdz = lz - b.z, bdy = ly - b.y;
    const baseYaw = Math.atan2(bdz, bdx);
    const basePitch = Math.atan2(bdy, Math.hypot(bdx, bdz));
    // ...and where it looks from where the dynamics actually put it. The
    // difference is the swing: the camera slung wide still holds the rider.
    const dx = lx - this.cam.x, dz = lz - this.cam.z, dy = ly - this.cam.y;
    let swing = Math.atan2(dz, dx) - baseYaw;
    while (swing > Math.PI) swing -= Math.PI * 2;
    while (swing < -Math.PI) swing += Math.PI * 2;
    const ang = this._angStep(swing,
      Math.atan2(dy, Math.hypot(dx, dz)) - basePitch + o.pitch, dt);
    let dyaw = baseYaw - this._yawBase;
    while (dyaw > Math.PI) dyaw -= Math.PI * 2;
    while (dyaw < -Math.PI) dyaw += Math.PI * 2;
    this._yawBase += dyaw;
    this.cam.yaw = this._yawBase + ang.yaw + o.syaw;
    this.cam.pitch = basePitch + ang.pitch + o.spitch;
    this.roll = w.roll * 0.28;
  }

  // ---- projection --------------------------------------------------------
  project(wx, wy, wz, out) {
    const c = this.cam;
    const dx = wx - c.x, dy = wy - c.y, dz = wz - c.z;
    const cy = Math.cos(c.yaw), sy = Math.sin(c.yaw);
    // rotate into camera space: forward +X, right +Z
    let fx = dx * cy + dz * sy;
    let rz = -dx * sy + dz * cy;
    const cp = Math.cos(c.pitch), sp = Math.sin(c.pitch);
    const fz = fx * cp + dy * sp;          // depth
    const uy = -fx * sp + dy * cp;         // up
    out.on = fz > NEAR;
    out.z = fz;
    if (out.on) {
      out.x = this.W / 2 + (rz / fz) * this.f;
      out.y = this.H / 2 - (uy / fz) * this.f;
    }
    return out;
  }

  // Clip a segment to the near plane so nothing wraps around behind the camera.
  seg(ax, ay, az, bx, by, bz) {
    const p = this.project(ax, ay, az, this._p);
    const q = this.project(bx, by, bz, this._q);
    if (!p.on && !q.on) return null;
    if (p.on && q.on) return [p.x, p.y, q.x, q.y];
    const t = (NEAR - p.z) / (q.z - p.z);
    const mx = ax + (bx - ax) * t, my = ay + (by - ay) * t, mz = az + (bz - az) * t;
    const m = this.project(mx, my, mz, p.on ? this._q : this._p);
    return p.on ? [p.x, p.y, m.x, m.y] : [m.x, m.y, q.x, q.y];
  }

  poly(pts, fill, stroke) {
    const ctx = this.ctx;
    const proj = [];
    for (let i = 0; i < pts.length; i += 3) {
      const p = this.project(pts[i], pts[i + 1], pts[i + 2], { });
      if (!p.on) return false;                     // whole face behind camera
      proj.push(p.x, p.y);
    }
    ctx.beginPath();
    ctx.moveTo(proj[0], proj[1]);
    for (let i = 2; i < proj.length; i += 2) ctx.lineTo(proj[i], proj[i + 1]);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
    return true;
  }

  horizonY() {
    // Where the sea plane vanishes: project a point a long way out.
    const p = this.project(this.cam.x + Math.cos(this.cam.yaw) * 9000, 0,
      this.cam.z + Math.sin(this.cam.yaw) * 9000, this._p);
    return p.on ? p.y : (this.cam.pitch < 0 ? -1e4 : 1e4);
  }

  // ---- the frame ---------------------------------------------------------
  draw(sim) {
    const ctx = this.ctx, W = this.W, H = this.H;
    const s = sim.plant.state, w = sim.world;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.save();
    if (this.roll) {
      ctx.translate(W / 2, H / 2); ctx.rotate(-this.roll); ctx.translate(-W / 2, -H / 2);
    }

    const hy = this.horizonY();

    // With the GL sea underneath, this layer paints no background at all: the
    // sky, the water and the grid all come off the GPU, and anything drawn here
    // would simply hide them. It must be CLEARED rather than filled, or the 2D
    // canvas stays opaque and the GL canvas is never seen.
    if (this.skipBackground) {
      ctx.clearRect(-W, -H, W * 3, H * 3);
    } else {
      // sky
      const g = ctx.createLinearGradient(0, Math.min(hy, H) - H * 0.9, 0, hy);
      g.addColorStop(0, '#23262b');
      g.addColorStop(1, '#464c55');
      ctx.fillStyle = g;
      ctx.fillRect(-W, -H, W * 3, Math.max(0, Math.min(hy, H)) + H);

      // sea
      const wg = ctx.createLinearGradient(0, hy, 0, H);
      wg.addColorStop(0, '#5a6572');
      wg.addColorStop(1, '#2b3138');
      ctx.fillStyle = wg;
      ctx.fillRect(-W, Math.max(hy, -H), W * 3, H * 2);

      ctx.strokeStyle = 'rgba(220,230,240,0.45)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-W, hy); ctx.lineTo(W * 2, hy); ctx.stroke();

      this._grid(sim);
    }

    this._wake(sim);
    this._craft(sim);
    ctx.restore();

    if (this.mode === 'fpv' || this.showRibbon) this._depthRibbon(s);
  }

  // In WebGL mode the sea, the craft and the wake all come off the GL canvas
  // underneath, and this 2D canvas carries only the depth ribbon - the one
  // thing FPV cannot show you honestly. Everything else on this layer must be
  // cleared every frame or the last canvas-2D frame stays smeared over the GL
  // one for the rest of the session.
  drawRibbonOnly(sim) {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.W, this.H);
    if (this.mode === 'fpv' || this.showRibbon) this._depthRibbon(sim.plant.state);
  }

  // A grid on the water. Flat grey water gives no speed or heading cue at all,
  // so this is instrument, not decoration - and it is what makes turning
  // legible.
  _grid(sim) {
    const ctx = this.ctx;
    const sea = sim.sea;
    const step = 10;
    const ox = Math.floor(this.cam.x / step) * step;
    const oz = Math.floor(this.cam.z / step) * step;
    ctx.lineWidth = 1;

    // Near field follows the actual surface. A flat grid over a wave sea is
    // worse than no grid: the board visibly bobs against a level horizon and
    // the whole thing reads as broken. Sampled coarsely and only close in,
    // because this is a canvas-2D stand-in - the real answer is the water mesh
    // in the WebGL renderer.
    const NEARF = 55;              // m, how far the wave-following grid reaches
    const SEG = 5;                 // m between samples along a line
    const n = (NEARF * 2) / SEG;
    for (let i = -6; i <= 10; i++) {
      const gx = ox + i * step;
      if (Math.abs(gx - this.cam.x) > NEARF + step) continue;
      ctx.strokeStyle = 'rgba(210,225,240,0.13)';
      ctx.beginPath();
      let pen = false;
      for (let j = 0; j <= n; j++) {
        const gz = oz - NEARF + j * SEG;
        const h = sea.isFlat ? 0 : sea.sample(gx, gz, sim.time, 0, 3).height;
        const a = this.seg(gx, h, gz, gx, h, gz + 0.001);
        if (!a) { pen = false; continue; }
        if (pen) ctx.lineTo(a[0], a[1]); else { ctx.moveTo(a[0], a[1]); pen = true; }
      }
      ctx.stroke();
    }
    for (let i = -8; i <= 8; i++) {
      const gz = oz + i * step;
      if (Math.abs(gz - this.cam.z) > NEARF + step) continue;
      ctx.strokeStyle = 'rgba(210,225,240,0.09)';
      ctx.beginPath();
      let pen = false;
      for (let j = 0; j <= n; j++) {
        const gx = ox - NEARF + j * SEG;
        const h = sea.isFlat ? 0 : sea.sample(gx, gz, sim.time, 0, 3).height;
        const a = this.seg(gx, h, gz, gx, h, gz + 0.001);
        if (!a) { pen = false; continue; }
        if (pen) ctx.lineTo(a[0], a[1]); else { ctx.moveTo(a[0], a[1]); pen = true; }
      }
      ctx.stroke();
    }

    // Far field stays flat and faint - at 60 m+ the wave height is well under a
    // pixel and sampling it would cost a lot to change nothing.
    for (let i = -8; i <= 18; i++) {
      const gx = ox + i * step;
      const dist = Math.abs(gx - this.cam.x);
      if (dist < NEARF) continue;
      const fade = 1 - Math.min(1, dist / FOG);
      if (fade <= 0.02) continue;
      ctx.strokeStyle = `rgba(210,225,240,${0.08 * fade})`;
      const a = this.seg(gx, 0, oz - 140, gx, 0, oz + 140);
      if (a) { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(a[2], a[3]); ctx.stroke(); }
    }
  }

  // Craft, in board-local coordinates, transformed by heading + pitch + roll.
  _craft(sim) {
    const ctx = this.ctx;
    const s = sim.plant.state, w = sim.world;
    const head = w.heading, pitch = s.pitch, roll = w.roll;
    const mast = sim.plant.mast;
    const fpv = this.mode === 'fpv';

    const ch = Math.cos(head), sh = Math.sin(head);
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const cr = Math.cos(roll), sr = Math.sin(roll);

    // local (fore, up, right) -> world
    const T = (fx, uy, rz, out) => {
      // roll about the fore axis
      const uy2 = uy * cr - rz * sr;
      const rz2 = uy * sr + rz * cr;
      // pitch about the right axis (nose up positive)
      const fx2 = fx * cp - uy2 * sp;
      const uy3 = fx * sp + uy2 * cp;
      out[0] = w.x + fx2 * ch - rz2 * sh;
      out[1] = s.y + uy3;
      out[2] = w.z + fx2 * sh + rz2 * ch;
      return out;
    };

    const a = [0, 0, 0], b = [0, 0, 0];
    const line = (f1, u1, r1, f2, u2, r2, colour, width) => {
      T(f1, u1, r1, a); T(f2, u2, r2, b);
      const seg = this.seg(a[0], a[1], a[2], b[0], b[1], b[2]);
      if (!seg) return;
      const under = (a[1] + b[1]) / 2 < 0;
      ctx.strokeStyle = colour;
      ctx.globalAlpha = under ? 0.42 : 1;
      ctx.lineWidth = width || 2;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(seg[0], seg[1]); ctx.lineTo(seg[2], seg[3]); ctx.stroke();
      ctx.globalAlpha = 1;
    };
    const quad = (pts, colour) => {
      const flat = [];
      let sum = 0;
      for (let i = 0; i < pts.length; i += 3) {
        T(pts[i], pts[i + 1], pts[i + 2], a);
        flat.push(a[0], a[1], a[2]); sum += a[1];
      }
      ctx.globalAlpha = sum / (pts.length / 3) < 0 ? 0.42 : 1;
      this.poly(flat, colour);
      ctx.globalAlpha = 1;
    };

    const BOARD = '#d7dde6', RIG = '#9aa4b1';
    const WING = s.ventilated ? '#ff8a8a' : '#e8eef6';

    // deck (skip in FPV - you are standing on it, and the near clip eats it)
    if (!fpv) {
      quad([0.95, 0, 0, 0.55, 0, 0.30, -0.68, 0, 0.26, -0.68, 0, -0.26, 0.55, 0, -0.30], BOARD);
      quad([0.95, -0.10, 0, 0.55, -0.10, 0.27, -0.68, -0.10, 0.23, -0.68, -0.10, -0.23, 0.55, -0.10, -0.27], '#aeb7c2');
    } else {
      // In FPV you see the nose of your own board, which is the only attitude
      // reference the rider's eye actually gets.
      quad([1.05, -0.32, 0, 0.62, -0.32, 0.26, 0.30, -0.34, 0.22, 0.30, -0.34, -0.22, 0.62, -0.32, -0.26], BOARD);
    }

    // mast, split at the waterline so the submerged part reads as submerged
    const topY = s.y - 0.10, botY = s.y - 0.10 - mast;
    if (topY > 0 && botY < 0) {
      const t = topY / (topY - botY);
      line(-0.06, -0.10, 0, -0.06, -0.10 - mast * t, 0, RIG, 5);
      line(-0.06, -0.10 - mast * t, 0, -0.06, -0.10 - mast, 0, RIG, 5);
    } else {
      line(-0.06, -0.10, 0, -0.06, -0.10 - mast, 0, RIG, 5);
    }

    // fuselage
    line(-0.34, -0.10 - mast, 0, 0.30, -0.10 - mast, 0, RIG, 3);
    // front wing (swept, so it reads as a wing rather than a stick)
    quad([-0.30, -0.10 - mast, -0.42, -0.18, -0.09 - mast, 0, -0.30, -0.10 - mast, 0.42,
          -0.36, -0.11 - mast, 0.40, -0.26, -0.10 - mast, 0, -0.36, -0.11 - mast, -0.40], WING);
    // rear stabiliser
    quad([0.26, -0.10 - mast, -0.16, 0.26, -0.10 - mast, 0.16, 0.34, -0.11 - mast, 0.14, 0.34, -0.11 - mast, -0.14], WING);

    if (!fpv) this._rider(sim, line, quad);
  }

  _rider(sim, line, quad) {
    const s = sim.plant.state;
    const down = s.mode === 'DOWN';
    const C = down ? '#8d939c' : '#f0f4f9';
    if (down) {
      line(-0.2, 0.10, -0.15, 0.4, 0.06, 0.25, C, 5);
      line(-0.2, 0.10, -0.15, -0.5, 0.06, -0.30, C, 5);
      return;
    }
    const lean = s.pitch * 1.3;
    const hipF = -0.06 - Math.sin(lean) * 0.1, hipU = 0.46;
    const shF = hipF - Math.sin(lean) * 0.52, shU = hipU + Math.cos(lean) * 0.52;

    line(-0.40, 0.02, -0.11, hipF - 0.03, hipU, -0.12, C, 7);   // back leg
    line(0.20, 0.02, 0.11, hipF + 0.03, hipU, 0.12, C, 7);      // front leg

    // Torso as a solid, not a wire. From directly behind, a line reads as a
    // scarecrow; a shoulders-wider-than-hips slab reads as a person's back -
    // which is the whole of what the chase camera looks at.
    quad([hipF, hipU, -0.16, hipF, hipU, 0.16, shF, shU, 0.22, shF, shU, -0.22], C);

    line(shF, shU - 0.04, 0.20, shF + 0.34, shU - 0.26, 0.24, C, 5);   // throttle arm
    line(shF, shU - 0.04, -0.20, shF + 0.30, shU - 0.30, -0.26, C, 5);
    line(shF - Math.sin(lean) * 0.10, shU + Math.cos(lean) * 0.10, 0,
      shF - Math.sin(lean) * 0.24, shU + Math.cos(lean) * 0.24, 0, C, 13);   // head
  }

  // FPV cannot show you the wing. This is the honest compensation: a ribbon of
  // the one number you would otherwise be guessing at. It is a gauge, and a
  // gauge is worse than seeing it - which is the cost of this camera.
  // >>> EFOILSPIN
  // WHERE THE RIBBON GOES. `W - 46` is where it has always been - hard against the right
  // edge - and on a phone the throttle lever is already there: input.js reserves the right
  // `stripRight + stripW` = 88 px of the canvas for it and main.js positions #tthr from
  // exactly that rect. Measured on an 844x390 landscape canvas, the panel spanned x 783-827
  // against a strip at 756-820, so 37 of its 44 px and the WHOLE of the drawn gauge (the
  // band, the ventilation zone and the needle, x 786-824) sat inside the lever, behind a
  // 0.52-alpha fill with a green throttle bar running through it.
  //
  // This puts it back outside the reserved column, 8 px clear, on whichever side the strip
  // is (touchSettings.mirror moves it), and leaves it exactly where it was when it does not
  // intersect it at all.
  //
  // ⚠️ THE COST, STATED: stripRect() describes the strip whether or not the strip is being
  // DRAWN, and this module has no DOM and therefore no way to ask whether touch controls are
  // up. So on desktop, where there is no lever, the gauge also moves 79 px in from the right
  // edge instead of hugging it. I would rather it were conditional; the alternative is either
  // a `document.body.classList` read in a module that has never touched the DOM, or a flag
  // set from src/main.js, which is not mine this round. Nothing else lives in that band on
  // desktop - #panel and #charts are flex siblings beside the canvas, not over it - so the
  // cost is 79 px of inset on a gauge, and no overlap.
  _ribbonX(W, H, panelW) {
    const x = W - 46;
    const st = stripRect(W, H);
    const GAP = 8;
    if (x + 7 + panelW / 2 <= st.x || x + 7 - panelW / 2 >= st.x + st.w) return x;
    return st.x > W / 2
      ? st.x - GAP - panelW / 2 - 7
      : st.x + st.w + GAP + panelW / 2 - 7;
  }
  // <<< EFOILSPIN

  _depthRibbon(s) {
    const ctx = this.ctx, H = this.H, W = this.W;
    const top = H * 0.24, h = H * 0.5;
    const dTo = (d) => top + (d / 1.0) * h;
    // ⚠️ UITAIL 2026-09-20: the two labels go 10 -> 16 px, the project's text floor.
    // This is the one number FPV cannot show you any other way - the comment above says so -
    // and FPV is a player camera (VIEW on the cold row, C on a keyboard). It was 10 px
    // because it is PAINTED INTO THE CANVAS, which tmp-tr174's root re-base could not
    // reach; being out of CSS's way is not the same as being out of the rule.
    //
    // The backing panel grows with the glyph rather than the glyph being squeezed into the
    // panel. It has to hold the widest string this can build: `(wingDepth * 100).toFixed(0)`
    // on an UNCLAMPED wingDepth, so '-12' and '105' are both reachable and four characters
    // is the honest worst case - 38.4 px of ui-monospace at 16 px. 44 px of panel leaves
    // 2.8 px each side. Its top and bottom grow too: a 16 px cap reaches 11.6 px above the
    // baseline and a descender 3.5 px below, and at the old -14 / +28 the number's head and
    // the 'cm' tail both stood outside their own backing and read as floating text on water.
    // Every DRAWN element (the band, the red ventilation zone, the needle) is untouched and
    // still centred on x+7; only the panel and the two baselines move.
    const PANEL_W = 44, PANEL_TOP = 22, PANEL_PAD = 46;   // grown from 34 / 14 / 28
    // >>> EFOILSPIN
    const x = this._ribbonX(W, H, PANEL_W);
    // <<< EFOILSPIN
    ctx.fillStyle = 'rgba(12,14,18,0.55)';
    ctx.fillRect(x + 7 - PANEL_W / 2, top - PANEL_TOP, PANEL_W, h + PANEL_PAD);
    ctx.fillStyle = 'rgba(111,227,160,0.30)';
    ctx.fillRect(x - 8, dTo(BAND.lo), 30, dTo(BAND.hi) - dTo(BAND.lo));
    ctx.fillStyle = 'rgba(255,90,90,0.35)';
    ctx.fillRect(x - 8, top, 30, dTo(0.12) - top);

    const d = Math.max(-0.1, Math.min(1, s.wingDepth));
    ctx.fillStyle = s.ventilated ? '#ff7a7a' : (d >= BAND.lo && d <= BAND.hi ? '#6fe3a0' : '#e8edf4');
    ctx.fillRect(x - 12, dTo(d) - 1.5, 38, 3);
    ctx.font = '16px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText((s.wingDepth * 100).toFixed(0), x + 7, top - 6);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillText('cm', x + 7, top + h + 18);
  }
}
