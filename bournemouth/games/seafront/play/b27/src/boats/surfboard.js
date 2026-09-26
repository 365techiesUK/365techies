// THE SURFBOARD (26 Sep 2026). The owner: "could we do a realistic surfing level by Bournemouth
// Pier? ... surfers actually sort of go under the water" - then "do the pier surfing, one first,
// and see how that comes out". This is that first one: a paddle board you lie on, push through
// the whitewater under, and stand up on when a wave takes you.
//
// A FOURTH HUB CRAFT, not an eFoil and not a hull.js spec. hull.js assumes an engine (spool,
// rpm, porpoising, and `boost` is its astern gear), so the board is its own small class that
// exposes the fields the hub, the chase camera, the pose provider and the juice read, and
// nothing else. It is never in the K / craft-bar cycle: only the surfing level selects it.
//
// THE PHYSICS IS THE SEA'S, not a script. Every push comes from the same sampler every other
// craft reads (src/sea.js, slot 2 - the hulls' slot; only one craft steps at a time):
//   * GRAVITY DOWN THE FACE. The surface slope times g, along the surface. On the front of a
//     shoaling wave that is what closes the gap between a paddler (~1.5 m/s) and the wave
//     (~3.5 m/s over the bank) - the catch is emergent, not a flag.
//   * THE WATER'S OWN VELOCITY. Drag is on the board's speed RELATIVE to the water, and the
//     water under a breaking wave runs shoreward (sea-surf.js BORE): that is what washes a
//     paddler back when the whitewater hits them, and what a duck-dive gets under.
//   * PADDLING, capped at the sourced human numbers: 1.10-2.00 m/s in the studies, 1.15 m/s
//     held by competitive surfers over six minutes, 1.46-1.52 m/s sprint peak (PMC7907393).
//     Full effort here settles at 1.5 m/s and adds nothing above 2.4 m/s - hands cannot push
//     water that is already going past faster than they move.
//
// FOUR STATES. PRONE (lying down, paddling or waiting), DUCK (under the whitewater, ~1.3 s),
// RIDE (standing, carving) and WIPE (off the board and tumbling, ~1.6 s, then back on it).
// SPACE does the thing that fits the moment: duck-dive when a wave is coming at you, pop up
// when one is carrying you, kick out when you are riding.
//
// NOBODY IS IN DANGER. A wipeout is a tumble and a climb back on. No rip, no injury, nothing
// about the real beach's history; see SPEC-SURF.md's do-not list.
// No Math.random: nothing here may disturb the seeded simulation.

import { surfSample, makeSurfSlot } from '../sea-surf.js';

const G = 9.81;
export const PRONE = 0, DUCK = 1, RIDE = 2, WIPE = 3;
export const STATE_NAME = ['PADDLING', 'DUCK DIVE', 'RIDING', 'WIPEOUT'];

// Along-board and lateral drag per state: a = -(C|v| + C0) v on the velocity relative to the
// water. Prone: a body in the water. Ride: a planing board, fins and rail holding the line.
const DRAG = [
  { cu: 0.30, cu0: 0.25, cv: 1.2, cv0: 1.5 },   // PRONE
  { cu: 0.60, cu0: 0.50, cv: 1.5, cv0: 1.5 },   // DUCK: board and body under water
  { cu: 0.025, cu0: 0.05, cv: 2.0, cv0: 3.0 },  // RIDE
  { cu: 0.80, cu0: 0.80, cv: 0.8, cv0: 0.8 },   // WIPE: tumbling, goes where the water goes
];
// How much of the down-slope pull each state feels. Under water there is no surface to slide
// down; tumbling you are mostly just water.
const K_SLOPE = [0.85, 0, 1.0, 0.3];
// Where on the face the pocket pulls: 0 behind the crest (chi >= 0), peaking on the upper face
// (chi ~ -0.7), gone at the bottom (chi <= -2.4).
function pocketAt(chi) {
  if (chi >= 0 || chi <= -2.4) return 0;
  const x = -chi;                        // 0 at the crest, 2.4 at the bottom of the face
  return x < 0.7 ? x / 0.7 : Math.max(0, 1 - (x - 0.7) / 1.7);
}

export const BOARD = {
  name: 'surfboard', label: 'SURFBOARD', unit: 'mph', unitScale: 2.23694,
  // Paddling: accel at rest, and the speed at which paddling stops adding anything.
  paddleA: 2.8, paddleTop: 2.4,
  // Pop-up: the board has to be carried at least this fast. Under it you are still being
  // overtaken by the wave and standing up just stops you ("too early").
  popU: 2.2,
  // Too late: the nose buries (pearl) on a face steeper than this along the board, or you are
  // in the lip itself (over the falls).
  pearlSlope: 0.62, lipChi: 0.35, lipBrk: 0.9,
  // DUCK: you stay under until the wave has gone over you (+ duckAfter), but not for longer than
  // duckMax - dive too early and you are back up before it arrives, and it takes you anyway.
  duckMin: 0.6, duckMax: 2.4, duckAfter: 0.25, duckDepth: 0.8, duckKeep: 0.3,
  // THE POCKET. The sampled surf train is a smooth single-frequency wave whose front face never
  // passes ~13 deg (sea-surf.js: slope a*k*(1+q) <= ~0.23). A real face near the curl is 30-40
  // deg, and that unresolved steep strip is what actually carries a surfer at wave speed. This
  // stands in for it and is written down as a stand-in: an extra down-face pull along the wave's
  // direction of travel, strongest on the upper face just ahead of the crest, fading to nothing at
  // the bottom of the face and behind the crest, and steeper where the wave is breaking. Because
  // it fades as you run ahead of the crest and vanishes behind it, a rider settles where the pull
  // matches the drag - in the pocket - and falls off the back if they slow down.
  pocket: 0.34, pocketProne: 0.6,
  wipeSec: 1.6,
  // A CARVE (stage 2): a turn held hard enough, long enough, at riding speed - a bottom turn or a
  // top turn. Counted once per turn; turning the other way starts the next one.
  carveRate: 0.55, carveSec: 0.35, carveU: 3.0,
  // The whitewater takes a prone paddler off the board if it is breaking this hard as it passes.
  washBrk: 0.72,
  cam: { dist: 5.2, distSpeed: 2.0, height: 1.9, lookAhead: 2.5, lookH: 0.45, side: 7, fpv: [0.1, 0.9] },
  wake: { stern: -1.1, halfBeam: 0.3, sprayX: 0 },
  // The hub's HUD reads these off every craft; a board has no engine.
  rpmIdle: 0, rpmMax: 0, uHump: 99, uPlane: 99,
};

// Points round the board, in its own frame (x forward), for the pier-leg test.
const OUTLINE = [1.1, 0, 0.55, 0.28, 0.55, -0.28, -1.1, 0.2, -1.1, -0.2];

export class SurfBoard {
  constructor(spec = BOARD) {
    this.spec = spec;
    this.cgX = 0;
    this.ss = makeSurfSlot();
    this.dyn = null;
    this.raidBoost = 0; this.raidStall = 0;
    this.reset(0, 0, 0, null, 0);
  }

  get speed() { return Math.hypot(this.vx, this.vz); }

  setDynamic(list) { this.dyn = list || null; }

  reset(x, z, heading, sea, t) {
    this.x = x; this.z = z; this.heading = heading;
    this.vx = 0; this.vz = 0; this.u = 0; this.v = 0; this.r = 0;
    this.y = 0; this.vy = 0; this.yDraw = 0; this.pitch = 0; this.roll = 0;
    this.airTicks = 0; this.aground = 0; this.hits = 0; this.lastHitSpeed = 0;
    this.slams = 0; this.slamG = 0; this.ticks = 0; this.time = t || 0;
    this.wet = 1; this.thr = 0; this.rpm = 0; this.gear = 0;
    this.state = PRONE; this.stateT = 0; this.cool = 0;
    this.stroke = 0; this.boostWas = 0;
    // What the level reads: the wave under you, and what just happened.
    this.wave = { c: 0, brk: 0, foam: 0, amp: 0, chi: 0, face: false, slope: 0, depth: 0 };
    this.events = [];
    this.ride = null;                 // { t0, x0, z0, top } while standing
    this._duck = null;                // { chi0, crossed, brkMax } while under
    this._chiPrev = 0;
    this.stats = { rides: 0, rideBest: 0, rideTime: 0, ducks: 0, ducksClean: 0, washed: 0, wipes: 0, early: 0 };
    // Read by the surf sound (engine-audio.js SURFER): every crest that goes past you, and how
    // hard it was breaking. Counters, not events - the level empties `events` each tick.
    this.crests = 0; this.crestBrk = 0; this.crestAmp = 0;
    if (sea) this._float(sea, t, 0);
  }

  _emit(type, extra) { this.events.push({ type, t: this.time, ...(extra || {}) }); }

  _set(state) { this.state = state; this.stateT = 0; }

  step(inp, dt, sea, t, obs) {
    const P = this.spec;
    this.ticks++; this.time = t;
    this.stateT += dt;
    if (this.cool > 0) this.cool -= dt;
    // PADDLING is the throttle (arrows, left mouse, scroll, the touch strip) OR leaning forward -
    // W, or the stick pushed up. Lying on a board, those are the same motion, and W is the key a
    // player reaches for. Lean arrives NEGATIVE for forward (input.js: W is -1); a dead zone keeps
    // a mouse resting near the middle of the screen from paddling on its own.
    const thr = Math.max(Math.max(0, Math.min(1, inp.throttle || 0)), Math.max(0, Math.min(1, (-(inp.lean || 0) - 0.3) / 0.7)));
    const turn = Math.max(-1, Math.min(1, inp.turn || 0));
    const press = (inp.boost || 0) > 0.5 && !(this.boostWas > 0.5);
    this.boostWas = inp.boost || 0;
    this.thr = thr;

    // ---- the water here ------------------------------------------------------------------
    const S = sea.sample(this.x, this.z, t, this.state === DUCK ? P.duckDepth : 0, 2);
    const W = surfSample(this.x, this.z, t, 0, sea.surfCtl, this.ss);
    const ch = Math.cos(this.heading), sh = Math.sin(this.heading);
    const slopeAlong = S.slopeX * ch + S.slopeZ * sh;        // + = surface rises ahead
    const face = W.amp > 0.12 && W.chi > -2.6 && W.chi < -0.05;
    // +1 = facing the beach. Offshore is +Z on this coast (sea-surf.js shoreCoords: d grows with
    // z), and the crests run in within a few degrees of it. NOT the orbital velocity's direction,
    // which reverses every trough.
    const toShore = -sh;
    const wv = this.wave;
    wv.c = W.c; wv.brk = W.brk; wv.foam = W.foam; wv.amp = W.amp; wv.chi = W.chi; wv.face = face;
    wv.slope = slopeAlong; wv.depth = S.surfH || W.h; wv.toShore = toShore;
    wv.set = W.active ? W.amp : 0;

    // ---- SPACE: whatever fits the moment -----------------------------------------------------
    const u0 = ch * this.vx + sh * this.vz;
    if (press) {
      if (this.state === RIDE) {
        this._endRide('kickout');
      } else if (this.state === PRONE && this.cool <= 0) {
        const goingIn = toShore > 0.35;
        // TOO LATE is asked FIRST: in the lip you go over the falls whatever speed you have, and
        // a player who waited too long must hear "too late", never "too early".
        const inLip = W.chi > -P.lipChi && W.chi < 0 && W.brk > P.lipBrk;
        if (goingIn && W.amp > 0.12 && (inLip || (u0 >= P.popU && slopeAlong < -P.pearlSlope))) this._late(inLip);
        else if (goingIn && u0 >= P.popU && W.amp > 0.12) this._popUp(slopeAlong, W);
        else if (goingIn && W.amp > 0.12 && face) { this.stats.early++; this._emit('early', { u: u0, c: W.c }); this.cool = 0.4; }
        else this._duckDive(W);
      }
    }

    // ---- steering -------------------------------------------------------------------------
    const sp = Math.hypot(this.vx, this.vz);
    let rate;
    if (this.state === RIDE) rate = Math.min(1.8, 0.45 * sp + 0.4);
    else if (this.state === PRONE) rate = 1.4 / (1 + 0.3 * Math.max(0, sp - 1.5));
    else if (this.state === DUCK) rate = 0.3;
    else rate = 0;
    this.r = turn * rate;
    this.heading += this.r * dt;
    if (this.heading > Math.PI) this.heading -= 2 * Math.PI;
    if (this.heading < -Math.PI) this.heading += 2 * Math.PI;
    const c2 = Math.cos(this.heading), s2 = Math.sin(this.heading);

    // ---- forces ---------------------------------------------------------------------------
    let ax = 0, az = 0;
    const kg = K_SLOPE[this.state];
    ax -= G * S.slopeX * kg; az -= G * S.slopeZ * kg;
    // The water's own velocity. Under a duck-dive most of the bore passes over you.
    const keep = this.state === DUCK ? P.duckKeep : 1;
    const rx = this.vx - S.orbX * keep, rz = this.vz - S.orbZ * keep;
    const ur = c2 * rx + s2 * rz, vr = -s2 * rx + c2 * rz;
    const D = DRAG[this.state];
    const au = -(D.cu * Math.abs(ur) + D.cu0) * ur;
    const av = -(D.cv * Math.abs(vr) + D.cv0) * vr;
    ax += c2 * au - s2 * av; az += s2 * au + c2 * av;
    // Paddling: only lying down, and only while your hands are faster than the water.
    let paddle = 0;
    if (this.state === PRONE && thr > 0) {
      const u = c2 * this.vx + s2 * this.vz;
      paddle = thr * P.paddleA * Math.max(0, Math.min(1, 1 - u / P.paddleTop));
      ax += c2 * paddle; az += s2 * paddle;
    }
    this.stroke = this.state === PRONE ? Math.min(1, 0.15 + thr) : this.state === DUCK ? 0.2 : 0;
    this.vx += ax * dt; this.vz += az * dt;
    // A hard ceiling no wave here can honestly exceed (the sourced 45 km/h riding peak).
    const vmag = Math.hypot(this.vx, this.vz);
    if (vmag > 12.5) { this.vx *= 12.5 / vmag; this.vz *= 12.5 / vmag; }

    const ox = this.x, oz = this.z;
    // THE POCKET (see BOARD.pocket): shoreward (-Z), standing or lying on the face of a live wave.
    if (this.state === RIDE || this.state === PRONE) {
      const env = Math.min(1, Math.max(0, (W.amp - 0.1) / 0.3)) * (0.4 + 0.6 * W.brk);
      const k = this.state === RIDE ? 1 : P.pocketProne;
      this.vz -= G * P.pocket * k * env * pocketAt(W.chi) * dt;
    }
    this.x += this.vx * dt; this.z += this.vz * dt;
    this.u = c2 * this.vx + s2 * this.vz; this.v = -s2 * this.vx + c2 * this.vz;

    // ---- the pier legs and the beach ---------------------------------------------------------
    if (obs && this._hitsSomething(obs)) {
      const hit = Math.hypot(this.vx, this.vz);
      this.x = ox; this.z = oz;
      this.vx *= -0.2; this.vz *= -0.2;
      this.hits++; this.lastHitSpeed = hit;
      if (this.state === RIDE && hit > 2) { this._endRide('pier'); this._wipe('pier'); }
    }
    const depth = S.surfH || W.h;
    this.aground = depth < 0.3 ? 1 : 0;
    if (this.aground) {
      // In the shallows the fins touch: a ride is over and the board stops.
      this.vx *= Math.exp(-dt * 3); this.vz *= Math.exp(-dt * 3);
      if (this.state === RIDE) this._endRide('shallows');
    }

    // ---- state machine ----------------------------------------------------------------------
    // The crest passing over you: chi wraps from just under 0 to just over it.
    const crossed = this._chiPrev < 0 && W.chi >= 0 && W.chi - this._chiPrev < 2;
    this._chiPrev = W.chi;
    if (crossed && W.amp > 0.1) { this.crests++; this.crestBrk = W.brk; this.crestAmp = W.amp; }
    if (this.state === DUCK) {
      const dk = this._duck;
      if (dk) { dk.brkMax = Math.max(dk.brkMax, W.brk); if (crossed && !dk.crossed) { dk.crossed = true; dk.tc = this.stateT; } }
      const done = this.stateT >= P.duckMax || (dk && dk.crossed && this.stateT >= Math.max(P.duckMin, dk.tc + P.duckAfter));
      if (done) {
        this._set(PRONE); this.cool = 0.3;
        if (dk && dk.crossed && dk.brkMax > 0.5) { this.stats.ducksClean++; this._emit('duck_clean'); }
        this._duck = null;
      }
    } else if (this.state === PRONE) {
      // The whitewater arrives and you are still on top: it takes you.
      if (crossed && W.brk > P.washBrk && toShore < 0.2 && W.amp > 0.25) {
        this.stats.washed++; this._emit('washed', { brk: W.brk });
        this._wipe('washed');
      }
    } else if (this.state === RIDE) {
      const R = this.ride;
      const spd = Math.hypot(this.vx, this.vz);
      R.top = Math.max(R.top, spd);
      R.slow = spd < 1.1 ? (R.slow || 0) + dt : 0;
      // Carves: time spent turning hard one way at speed; a turn that lasts carveSec counts once.
      const dir = Math.abs(this.r) >= P.carveRate && spd >= P.carveU ? Math.sign(this.r) : 0;
      if (dir !== 0 && dir === R.turnDir) {
        R.turnT += dt;
        if (!R.counted && R.turnT >= P.carveSec) { R.counted = true; R.carves++; this._emit('carve', { n: R.carves }); }
      } else { R.turnDir = dir; R.turnT = 0; R.counted = false; }
      if (R.slow > 0.6 || W.amp < 0.08) this._endRide('faded');
    } else if (this.state === WIPE) {
      if (this.stateT >= P.wipeSec) { this._set(PRONE); this.cool = 0.3; this._emit('back_on'); }
    }

    this._float(sea, t, dt, S, slopeAlong, -S.slopeX * s2 + S.slopeZ * c2);
    if (this.state === RIDE) {
      const R = this.ride;
      R.dist += Math.hypot(this.x - ox, this.z - oz);
    }
  }

  // Too late: up in the lip (over the falls), or so steep the nose goes under (a pearl).
  _late(inLip) {
    this._emit('pearl', { why: inLip ? 'falls' : 'pearl' });
    this._wipe(inLip ? 'falls' : 'pearl');
  }

  _popUp(slopeAlong, W) {
    this._set(RIDE);
    this.ride = { t0: this.time, x0: this.x, z0: this.z, top: 0, dist: 0, slow: 0, carves: 0, turnDir: 0, turnT: 0, counted: false };
    this._emit('popup', { u: this.u, c: W.c });
  }

  _duckDive(W) {
    this._set(DUCK);
    this.stats.ducks++;
    this._duck = { chi0: W.chi, crossed: false, brkMax: W.brk };
    this._emit('duck');
  }

  _endRide(why) {
    const R = this.ride;
    if (!R) { if (this.state === RIDE) this._set(PRONE); return; }
    const secs = this.time - R.t0;
    this.ride = null;
    this.stats.rides++; this.stats.rideTime += secs;
    if (secs > this.stats.rideBest) this.stats.rideBest = secs;
    // RIDE SCORE: a point a metre, 25 a carve, and the top speed in km/h. Modest on purpose -
    // the ride is the reward; the number is so two rides can be compared.
    const score = Math.round(R.dist + 25 * R.carves + R.top * 3.6);
    this._emit('ride_end', { why, secs, dist: R.dist, top: R.top, carves: R.carves, score });
    if (this.state === RIDE) { this._set(PRONE); this.cool = 0.4; }
  }

  _wipe(why) {
    if (this.state === RIDE) this._endRide(why);
    this._set(WIPE);
    this.stats.wipes++;
    this._emit('wipe', { why });
  }

  _hitsSomething(obs) {
    const ch = Math.cos(this.heading), sh = Math.sin(this.heading);
    for (let i = 0; i < OUTLINE.length; i += 2) {
      const wx = this.x + ch * OUTLINE[i] - sh * OUTLINE[i + 1];
      const wz = this.z + sh * OUTLINE[i] + ch * OUTLINE[i + 1];
      if (obs.blocked(wx, wz)) return true;
    }
    return false;
  }

  // The board sits ON the water (a board with someone lying on it floats awash, deck at the
  // waterline - surfers.js REFERENCE); standing, it planes a little higher. `y` is what the
  // camera and the pose follow; `yDraw` is where the board is actually drawn, which differs only
  // under a duck-dive, so the camera never follows it under the surface.
  _float(sea, t, dt, S0, slopeAlong, slopeAcross) {
    const S = S0 || sea.sample(this.x, this.z, t, 0, 2);
    const sa = slopeAlong ?? 0, sc = slopeAcross ?? 0;
    const surf = S.height;
    this.y = surf;
    let dip = 0;
    if (this.state === DUCK) {
      const P = this.spec, k = this.stateT;
      const down = Math.min(1, k / 0.25);
      dip = P.duckDepth * down;
    }
    const off = this.state === RIDE ? 0.05 : this.state === WIPE ? -0.12 : -0.01;
    this.yDraw = surf + off - dip;
    // Nose-down while diving (the push under), otherwise the water's own tilt.
    const k = dt > 0 ? Math.min(1, dt * 10) : 1;
    let pit = Math.atan(sa) * 0.9;
    if (this.state === DUCK) pit = this.stateT < 0.45 ? -0.5 : 0;
    const rol = this.state === RIDE ? -this.r * 0.35 : Math.atan(sc) * 0.7;
    this.pitch += (pit - this.pitch) * k;
    this.roll += (rol - this.roll) * k;
  }
}
