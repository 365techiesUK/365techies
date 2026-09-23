// OVERBOARD - the rules (tmp-tr197).
//
// Pure logic: no DOM, no GL, no wall clock, no Math.random. It is advanced once
// per FIXED sim tick from (pose, helm), so a passage is a pure function of
// (seed, pose sequence, helm sequence) and replays bit for bit. That is what
// lets suites/test-overboard.mjs prove every rule headlessly in Node, and it is
// the same contract src/rescue/rescue.js keeps.
//
// It never reads or writes the physics. It sees the craft through exactly two
// read-only objects, both built by the caller:
//
//   pose  { x, z, heading, speed, craft }     - src/player-pose.js, unchanged
//   helm  { valid, latG, air, slamId, slamG } - see HELM below
//
// HELM. The four numbers the ejection rule needs, every one of them already
// published by the hull the physics owns and already read by something else in
// the tree, so none of them is a new derivation that could be wrong on its own:
//
//   latG     |u * r| / g, lateral acceleration. boats.js:800 computes exactly
//            this to decide how much water leaves the outer chine, so the
//            spray the player is looking at IS the signal.
//   air      1 while hull.airTicks > 0. hull.js:316.
//   slamId   hull.slams, a monotonic counter. hull.js:407.
//   slamG    hull.slamG, the peak vertical load factor of the current slam
//            event. hull.js:408, and hub.js:117 already shakes the camera with it.
//
// On a craft with no hull (the eFoil) the caller passes zeros and nobody ever
// goes over the side - which is correct rather than a degradation: this is a
// boat level and the boat is what sheds people.
//
// THE LOOP. A day boat leaves the seaward mark with more people aboard than it
// is rated for and has to be brought to the beach drop-off. Drive it hard and
// people go over the side; come about, get alongside slowly, hold there while
// they climb back in, and carry on. Get everyone ashore and it scores well.
// Run the clock out and the shore team brings the rest in and it scores badly.
// Nobody is ever in danger - see the header of passage.js, which is binding.

import { mulberry32, StateHash } from '../rng.js';
import { COAST } from '../gl/coast.js';
import { TUNING, SEATS, ZONE, legSpec, legSpawn } from './passage.js';

const PHASES = ['intro', 'live', 'ashore', 'timeup', 'over'];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// A helm with nothing happening in it. Handed in by the caller when there is no
// hull to read, and used as the default so a caller that forgets cannot crash.
export const HELM_IDLE = Object.freeze({ valid: false, latG: 0, air: 0, slamId: 0, slamG: 0 });

// The ONE place the four helm numbers are read off a hull. mode.js calls it for
// the browser and suites/test-overboard.mjs calls it for the harness, because a
// suite that builds its own copy of this expression is a suite that can agree
// with itself while disagreeing with the game - which is how this project's
// "two implementations of one wrong derivation" has bitten before. Every term
// is a plain read; nothing is computed here that the hull does not publish.
export function helmFromHull(hull) {
  if (!hull || !Number.isFinite(hull.u)) return HELM_IDLE;
  return {
    valid: true,
    latG: Math.abs(hull.u * (hull.r || 0)) / 9.81,
    air: hull.airTicks > 0 ? 1 : 0,
    slamId: hull.slams | 0,
    slamG: Number.isFinite(hull.slamG) ? hull.slamG : 0,
  };
}

export class OverboardRun {
  constructor(opts = {}) {
    this.T = { ...TUNING, ...(opts.tuning || {}) };
    this.zone = { ...ZONE, r: this.T.dropRadius };
    this.hash = new StateHash();
    this.events = [];
    this.newPassage(opts.seed ?? this.T.seed, opts.leg || 1);
  }

  newPassage(seed, leg = 1) {
    const T = this.T;
    this.seed = seed >>> 0;
    this.rng = mulberry32(this.seed);
    this.leg = Math.max(1, leg);
    this.spec = legSpec(this.leg);
    this.spawn = legSpawn(this.spec);
    this.tick = 0;
    this.time = 0;
    this.score = 0;
    this.phase = 'intro';
    this.phaseT = 0;
    this.timer = this.spec.sec;
    this.timerTotal = this.spec.sec;
    this.pickT = 0;
    this.dropT = 0;
    this.status = 'idle';   // idle | tooFast | picking | slowForDrop | dropping
    this.nearPerson = null;
    this.inZone = false;
    this.shedCool = 0;
    this.everOver = 0;
    this.recovered = 0;
    this.broughtIn = 0;
    this.handedToShore = 0;
    this.coldPaid = 0;
    this.worstGrip = 1;
    this.sling = 0;
    this.lastSlamId = null;
    this.people = [];
    const n = Math.min(SEATS.length, this.spec.aboard);
    for (let i = 0; i < n; i++) {
      this.people.push({
        id: i,
        state: 'aboard',          // aboard | water | home | shore
        seat: i,                  // index into SEATS, highest exposure filled first
        // `nerve` spreads the passengers out so a single hard turn sheds ONE of
        // them and not all eight at once. Seeded, so it replays.
        nerve: 0.85 + this.rng() * 0.30,
        phase: this.rng() * 6.283,
        grip: 1,
        cold: 0,
        wasOver: false,
        warnT: -1,                // sim time its grip first fell below warnGrip
        slamT: -1e9,              // sim time of its last slam bite (refractory)
        overT: -1,
        x: 0, z: 0, yaw: 0,
      });
    }
    this.hash.reset();
    this.events.length = 0;
    this._emit('passage', {
      leg: this.leg, aboard: n, rated: T.rated, sec: this.timerTotal,
      offshore: this.spec.offshore, sea: this.spec.sea,
    });
  }

  _emit(type, data) { this.events.push({ type, tick: this.tick, ...data }); }

  get aboard() { return this.people.filter((p) => p.state === 'aboard'); }
  get inWater() { return this.people.filter((p) => p.state === 'water'); }
  get nAboard() { let n = 0; for (const p of this.people) if (p.state === 'aboard') n++; return n; }
  get nWater() { let n = 0; for (const p of this.people) if (p.state === 'water') n++; return n; }
  get nHome() { let n = 0; for (const p of this.people) if (p.state === 'home') n++; return n; }

  // ---- the tick -----------------------------------------------------------
  update(pose, helm, dt) {
    this.tick++;
    this.time += dt;
    const T = this.T;
    const h = helm || HELM_IDLE;
    const valid = !!(pose && Number.isFinite(pose.x) && Number.isFinite(pose.z) && Number.isFinite(pose.speed));
    this.sling = Number.isFinite(h.latG) ? h.latG : 0;

    switch (this.phase) {
      case 'intro':
        this.phaseT += dt;
        if (this.phaseT >= T.introSec) { this.phase = 'live'; this.phaseT = 0; this._emit('go', { leg: this.leg }); }
        break;
      case 'live':
        this.timer -= dt;
        this._grip(pose, h, dt, valid);
        this._water(dt);
        if (valid) { this._recover(pose, dt); this._dropoff(pose, dt); }
        if (this.phase !== 'live') break;      // _dropoff may have ended the passage
        if (this.timer <= 0) this._timeUp();
        break;
      case 'ashore':
      case 'timeup':
        this.phaseT += dt;
        this._water(dt);
        if (this.phaseT >= T.endSec) { this.phase = 'over'; this._emit('over', this.summary()); }
        break;
      default: break;   // 'over'
    }
    if (this.phase !== 'live') { this.status = 'idle'; this.nearPerson = null; }

    let worst = 1;
    for (const p of this.people) if (p.state === 'aboard' && p.grip < worst) worst = p.grip;
    this.worstGrip = this.nAboard ? worst : 1;

    const q = this.hash;
    q.int(PHASES.indexOf(this.phase)); q.int(this.leg); q.int(this.score);
    q.int(this.nAboard); q.int(this.nWater); q.int(this.nHome);
    q.num(this.timer, 1000);
    for (const p of this.people) { q.num(p.grip, 1000); q.num(p.cold, 1000); q.num(p.x, 100); q.num(p.z, 100); }
  }

  // ---- THE EJECTION RULE --------------------------------------------------
  // Read this with passage.js's TUNING block open beside it; the two halves of
  // the rule are documented there and the constants are all named.
  _grip(pose, h, dt, valid) {
    const T = this.T;
    this.shedCool = Math.max(0, this.shedCool - dt);
    const latG = Number.isFinite(h.latG) ? Math.abs(h.latG) : 0;
    const air = h.air ? 1 : 0;
    const excess = latG - T.holdG;

    // A slam is an EVENT, not a load: it is taken once, on the tick the hull's
    // own counter moves, and never integrated. `slamId` is monotonic, so a
    // passage that starts mid-run cannot mistake a stale count for a new slam.
    let bite0 = 0;
    if (Number.isFinite(h.slamId) && h.slamId !== this.lastSlamId) {
      if (this.lastSlamId !== null && h.slamId > this.lastSlamId) {
        const peak = Number.isFinite(h.slamG) ? h.slamG : 0;
        bite0 = Math.max(0, peak - T.slamHoldG) * T.slamBite;
        if (bite0 > 0) this._emit('slam', { g: peak, bite: Math.min(bite0, T.slamBiteMax) });
      }
      this.lastSlamId = h.slamId;
    }

    for (const p of this.people) {
      if (p.state !== 'aboard') continue;
      const seat = SEATS[p.seat] || SEATS[SEATS.length - 1];
      const exp = seat.exp * p.nerve;
      if (excess > 0) p.grip -= excess * exp * T.gripLoss * dt;
      // ⚠️ `!air` on the recovery term is not tidying. Without it a hull in the
      // air counted as STEADY for the recovery half and as airborne for the
      // loss half at the same time, the two nearly cancelled, and a jump took
      // 6.36 s to shift anybody - i.e. airTicks was in the rule in name only.
      // Measured before and after; it is 1.8 s now, which is longer than any
      // jump this hull actually takes, so air SOFTENS a boat rather than
      // emptying it. That is the intended weight and it is why it is stated.
      else if (!air) p.grip += T.gripRecover * dt;
      if (air) p.grip -= T.airLoss * exp * dt;
      if (bite0 > 0 && this.time - p.slamT >= T.slamRefract) {
        // ⚠️ THE CAP IS APPLIED PER PASSENGER AND BEFORE EXPOSURE, so the
        // guarantee it buys - no single event takes a full passenger past the
        // warning band - holds for the most exposed seat in the boat and not
        // just for an average one.
        p.grip -= Math.min(bite0, T.slamBiteMax) * exp;
        p.slamT = this.time;
      }
      p.grip = clamp(p.grip, -0.5, 1);
      if (p.grip < T.warnGrip) { if (p.warnT < 0) p.warnT = this.time; }
      else p.warnT = -1;
    }

    // Whoever is holding on least goes first, and only one person per shedCool:
    // a passage should never be emptied by a single moment.
    if (this.phase !== 'live' || this.shedCool > 0 || !valid) return;
    let worst = null;
    for (const p of this.people) {
      if (p.state !== 'aboard' || p.grip > 0) continue;
      if (!worst || p.grip < worst.grip || (p.grip === worst.grip && p.seat < worst.seat)) worst = p;
    }
    if (!worst) return;
    this._goOver(worst, pose);
  }

  _goOver(p, pose) {
    const T = this.T;
    p.state = 'water';
    p.wasOver = true;
    p.grip = 0;
    p.cold = 0;
    p.overT = this.time;
    // Over the side is over the SIDE: they end up a boat's half-beam outboard
    // and a little astern of where the boat was, not underneath it.
    const side = (p.seat % 2 === 0) ? 1 : -1;
    const ch = Math.cos(pose.heading), sh = Math.sin(pose.heading);
    const lx = -1.2, lz = side * 2.2;
    p.x = pose.x + ch * lx - sh * lz;
    p.z = pose.z + sh * lx + ch * lz;
    p.yaw = pose.heading + side * Math.PI * 0.5;
    this.everOver++;
    this.shedCool = T.shedCool;
    this._emit('overboard', {
      person: p.id, seat: p.seat, aboard: this.nAboard, inWater: this.nWater,
      warned: p.warnT >= 0 ? this.time - p.warnT : 0,
    });
    p.warnT = -1;
  }

  // ---- people in the water ------------------------------------------------
  // Tide and an offshore wind. Cold rises, is floored at 1, and does exactly
  // two things: it slows the climb back aboard and it costs score.
  _water(dt) {
    const T = this.T;
    const minX = T.driftMinCoastX - COAST.startX;
    const vx = T.driftAlong * this.spec.drift, vz = T.driftSeaward * this.spec.drift;
    for (const p of this.people) {
      if (p.state !== 'water') continue;
      p.x += vx * dt; p.z += vz * dt;
      if (p.x < minX) p.x = minX;
      p.cold = Math.min(1, p.cold + T.coldRate * dt);
    }
  }

  _recover(pose, dt) {
    const T = this.T;
    let best = null, bd = Infinity;
    for (const p of this.people) {
      if (p.state !== 'water') continue;
      const d = Math.hypot(pose.x - p.x, pose.z - p.z);
      if (d < bd) { bd = d; best = p; }
    }
    this.nearestDist = bd;
    const near = best && bd <= T.pickupRadius ? best : null;
    this.nearPerson = near;
    if (!near) { this.pickT = 0; if (this.status === 'picking' || this.status === 'tooFast') this.status = 'idle'; return; }
    if (pose.speed > T.pickupSpeed) {
      this.pickT = Math.max(0, this.pickT - dt * 2);
      this.status = 'tooFast';
      return;
    }
    this.status = 'picking';
    this.pickT += dt;
    this.pickNeed = T.pickupHold * (1 + (T.coldHoldMult - 1) * near.cold);
    if (this.pickT >= this.pickNeed) {
      this.pickT = 0;
      near.state = 'aboard';
      // The least exposed FREE seat, not back on the tube they came off. With
      // nine seats and eight people there is exactly one spare place down in
      // the boat, so this is generous for the first recovery and thins out
      // fast - see the withdrawn claim in passage.js's SEATS block.
      near.seat = this._safestFreeSeat(near.seat);
      near.grip = 1;
      near.warnT = -1;
      near.slamT = -1e9;
      this.recovered++;
      this.coldPaid += near.cold;
      this._emit('recovered', { person: near.id, cold: near.cold, aboard: this.nAboard, inWater: this.nWater });
    }
  }

  _safestFreeSeat(fallback) {
    const taken = new Set();
    for (const p of this.people) if (p.state === 'aboard') taken.add(p.seat);
    for (let i = SEATS.length - 1; i >= 0; i--) if (!taken.has(i)) return i;
    return fallback;
  }

  _inZone(p) { return Math.hypot(p.x - this.zone.x, p.z - this.zone.z) <= this.zone.r; }

  _dropoff(pose, dt) {
    const T = this.T;
    this.inZone = this._inZone(pose);
    const aboard = this.aboard;
    if (!this.inZone || !aboard.length) {
      this.dropT = 0;
      if (this.status === 'dropping' || this.status === 'slowForDrop') this.status = 'idle';
      return;
    }
    if (pose.speed > T.dropSpeed) { this.dropT = 0; if (this.status === 'idle') this.status = 'slowForDrop'; return; }
    if (this.status === 'idle' || this.status === 'slowForDrop') this.status = 'dropping';
    this.dropT += dt;
    while (this.dropT >= T.dropEach) {
      const next = this.aboard[0];
      if (!next) break;
      this.dropT -= T.dropEach;
      next.state = 'home';
      this.broughtIn++;
      const pts = next.wasOver
        ? Math.max(0, Math.round(T.scoreRecovered - T.coldPenalty * next.cold))
        : T.scoreAboard;
      this.score += pts;
      this._emit('ashorePerson', { person: next.id, points: pts, wasOver: next.wasOver, left: this.nAboard });
    }
    if (!this.nAboard && !this.nWater) this._finish();
  }

  _finish() {
    const T = this.T;
    const left = Math.max(0, Math.floor(this.timer));
    const timeBonus = left * T.timeBonusPerSec;
    const dry = this.everOver === 0 ? T.dryBonus : 0;
    this.score += timeBonus + dry;
    this.phase = 'ashore';
    this.phaseT = 0;
    this.status = 'idle';
    this._emit('ashore', { leg: this.leg, timeBonus, dry, broughtIn: this.broughtIn, took: this.timerTotal - this.timer });
  }

  // The clock beats you: the shore team brings in whoever is still in the water
  // and the passage scores badly. Nothing else happens to anybody.
  _timeUp() {
    const T = this.T;
    let handed = 0;
    for (const p of this.people) {
      if (p.state === 'water') { p.state = 'shore'; handed++; }
      else if (p.state === 'aboard') { p.state = 'home'; this.broughtIn++; this.score += p.wasOver ? T.scoreRecovered : T.scoreAboard; }
    }
    this.handedToShore += handed;
    this.score -= handed * T.shorePenalty;
    this.timer = 0;
    this.phase = 'timeup';
    this.phaseT = 0;
    this.status = 'idle';
    this._emit('timeup', { leg: this.leg, handed });
  }

  // Where to steer: the nearest person still in the water, else the beach.
  objective(pose) {
    if (this.phase === 'over') return null;
    const toZone = {
      kind: 'zone', x: this.zone.x, z: this.zone.z,
      dist: Math.hypot(pose.x - this.zone.x, pose.z - this.zone.z),
    };
    let best = null, bd = Infinity;
    for (const p of this.people) {
      if (p.state !== 'water') continue;
      const d = Math.hypot(pose.x - p.x, pose.z - p.z);
      if (d < bd) { bd = d; best = p; }
    }
    if (best) return { kind: 'person', person: best, x: best.x, z: best.z, dist: bd };
    return this.nAboard ? toZone : null;
  }

  summary() {
    return {
      score: Math.max(0, this.score),
      leg: this.leg,
      started: this.people.length,
      broughtIn: this.broughtIn,
      wentOver: this.everOver,
      recovered: this.recovered,
      handedToShore: this.handedToShore,
      dry: this.everOver === 0,
      coldPaid: this.coldPaid,
      secondsLeft: Math.max(0, Math.round(this.timer)),
      seconds: Math.round(this.time),
      outcome: this.handedToShore ? 'shore team' : 'all aboard',
    };
  }
}
