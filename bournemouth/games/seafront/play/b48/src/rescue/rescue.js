// RESCUE ARCADE MODE - the game rules (2026-09-17, tr42).
//
// Pure logic: no DOM, no GL, no clock, no Math.random. It is advanced once per
// FIXED sim tick with the player's pose from playerPose(), so a run is a pure
// function of (seed, pose sequence) and replays bit-for-bit. That is what lets
// tmp-tr42/test-rescue.mjs prove every rule headlessly in Node.
//
// It never reads or writes the physics. The eFoil (or, after the merge, a boat)
// is only ever seen through the pose { x, z, heading, speed, craft }.
//
// Loop: a WAVE places groups of people in trouble offshore -> the player rides
// out, slows right down beside a group and holds there while people climb onto
// the towed sled (one per pickupHold seconds, up to capacity) -> rides back and
// slows in the beach drop-off zone, where they step off and score. Clear every
// person before the clock runs out and the next wave is harder. If the clock
// runs out, the shore team brings the rest in, the run loses a chance, and the
// next wave starts anyway. No chances left ends the shift.

import { mulberry32, StateHash } from '../rng.js';
import { COAST } from '../gl/coast.js';
import { TUNING, ZONE, FIELD, KINDS, waveSpec } from './waves.js';

const PHASES = ['intro', 'live', 'clear', 'timeup', 'over'];

export class RescueGame {
  constructor(opts = {}) {
    this.T = { ...TUNING, ...(opts.tuning || {}) };
    this.zone = { ...ZONE, r: this.T.dropRadius };
    this.hash = new StateHash();
    this.events = [];
    this.newRun(opts.seed ?? this.T.seed, opts.startWave || 1);
  }

  newRun(seed, startWave = 1) {
    const T = this.T;
    this.seed = seed >>> 0;
    this.rng = mulberry32(this.seed);
    this.tick = 0;
    this.time = 0;
    this.score = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.rescued = 0;
    this.handedToShore = 0;
    this.chances = T.chances;
    this.wavesCleared = 0;
    this.fastestWave = null;
    this.groups = [];
    this.aboard = [];
    this.pickT = 0;
    this.dropT = 0;
    this.status = 'idle';      // idle | tooFast | picking | full | dropping | slowForDrop
    this.nearGroup = null;
    this.inZone = false;
    this.hash.reset();
    this.events.length = 0;
    this._startWave(startWave);
  }

  get multiplier() {
    const T = this.T;
    return Math.min(T.streakMultMax, 1 + Math.floor(this.streak / T.streakStep) * T.streakMultStep);
  }

  get peopleInWater() {
    let n = 0;
    for (const g of this.groups) n += g.inWater;
    return n;
  }

  get peopleThisWave() {
    let n = 0;
    for (const g of this.groups) n += g.people.length;
    return n;
  }

  _emit(type, data) { this.events.push({ type, tick: this.tick, ...data }); }

  // ---- wave construction ---------------------------------------------------
  _startWave(n) {
    const spec = waveSpec(n);
    const rng = this.rng;
    this.wave = n;
    this.spec = spec;
    this.phase = 'intro';
    this.phaseT = 0;
    this.pickT = 0;
    this.dropT = 0;
    this.groups = [];
    let pid = 0;
    for (let gi = 0; gi < spec.groups.length; gi++) {
      const kind = spec.groups[gi];
      const K = KINDS[kind];
      let x = 0, z = 0;
      // Up to 16 tries for 30 m separation; the last try is kept regardless, so
      // a crowded late wave still places everyone (deterministically).
      for (let t = 0; t < 16; t++) {
        const cx = FIELD.coastXMin + rng() * (FIELD.coastXMax - FIELD.coastXMin);
        x = cx - COAST.startX;
        z = this.zone.z + spec.near + rng() * (spec.far - spec.near);
        let ok = true;
        for (const g of this.groups) if (Math.hypot(g.x - x, g.z - z) < 30) { ok = false; break; }
        if (ok) break;
      }
      const count = K.people[0] + Math.floor(rng() * (K.people[1] - K.people[0] + 1));
      const wob = 0.8 + rng() * 0.4;
      const g = {
        id: gi, kind, x, z, x0: x, z0: z,
        vx: spec.driftDir[0] * K.drift * spec.drift * wob,
        vz: spec.driftDir[1] * K.drift * spec.drift * wob,
        yaw: rng() * Math.PI * 2,
        people: [],
        inWater: count,
      };
      for (let k = 0; k < count; k++) {
        g.people.push({ id: pid++, group: gi, seat: k, state: 'water', phase: rng() * 6.283 });
      }
      this.groups.push(g);
    }
    this.timer = spec.timeBase + spec.timePerPerson * pid;
    this.timerTotal = this.timer;
    this._emit('wave', { n, people: pid, groups: spec.groups.length, sea: spec.sea, timer: this.timer });
  }

  // ---- the tick ------------------------------------------------------------
  // pose: { x, z, heading, speed, craft } from playerPose(sim). dt: FIXED_DT.
  update(pose, dt) {
    this.tick++;
    this.time += dt;
    const T = this.T;
    const valid = pose && Number.isFinite(pose.x) && Number.isFinite(pose.z) && Number.isFinite(pose.speed);

    switch (this.phase) {
      case 'intro':
        this.phaseT += dt;
        if (this.phaseT >= T.introSec) { this.phase = 'live'; this.phaseT = 0; this._emit('go', { n: this.wave }); }
        break;
      case 'live':
        this.timer -= dt;
        this._drift(dt);
        if (valid) { this._pickup(pose, dt); this._dropoff(pose, dt); }
        if (this.phase !== 'live') break;           // _dropoff may have cleared the wave
        if (this.timer <= 0) this._timeUp();
        break;
      case 'clear':
      case 'timeup':
        this.phaseT += dt;
        this._drift(dt);
        if (this.phaseT >= T.clearSec) {
          if (this.chances <= 0) { this.phase = 'over'; this._emit('over', this.summary()); }
          else this._startWave(this.wave + 1);
        }
        break;
      default: break;  // 'over'
    }
    if (this.phase !== 'live') { this.status = 'idle'; this.nearGroup = null; this.inZone = valid ? this._inZone(pose) : false; }

    const h = this.hash;
    h.int(PHASES.indexOf(this.phase)); h.int(this.wave); h.int(this.score); h.int(this.aboard.length);
    h.num(this.timer, 1000); h.int(this.chances);
    for (const g of this.groups) { h.num(g.x, 1000); h.num(g.z, 1000); h.int(g.inWater); }
  }

  _inZone(p) { return Math.hypot(p.x - this.zone.x, p.z - this.zone.z) <= this.zone.r; }

  _drift(dt) {
    const minZ = this.zone.z + 40;
    const maxX = FIELD.coastXMax + 80 - COAST.startX;
    for (const g of this.groups) {
      if (!g.inWater && g.kind === 'swimmer') continue;
      g.x += g.vx * dt; g.z += g.vz * dt;
      if (g.z < minZ) g.z = minZ;
      if (g.x > maxX) g.x = maxX;
    }
  }

  _pickup(p, dt) {
    const T = this.T;
    let best = null, bd = Infinity;
    for (const g of this.groups) {
      if (!g.inWater) continue;
      const d = Math.hypot(p.x - g.x, p.z - g.z);
      if (d < bd) { bd = d; best = g; }
    }
    this.nearestDist = bd;
    const near = best && bd <= T.pickupRadius ? best : null;
    this.nearGroup = near;
    if (!near) { this.pickT = 0; this.status = 'idle'; return; }
    if (this.aboard.length >= T.capacity) { this.pickT = 0; this.status = 'full'; return; }
    if (p.speed > T.pickupSpeed) {
      // Too fast: progress bleeds away rather than snapping to zero, so a wave
      // bumping the speed over the line for a tick does not cost the hold.
      this.pickT = Math.max(0, this.pickT - dt * 2);
      this.status = 'tooFast';
      return;
    }
    this.status = 'picking';
    this.pickT += dt;
    if (this.pickT >= T.pickupHold) {
      this.pickT = 0;
      const person = near.people.find((q) => q.state === 'water');
      person.state = 'aboard';
      near.inWater--;
      this.aboard.push(person);
      this._emit('pickup', { group: near.id, kind: near.kind, person: person.id, aboard: this.aboard.length });
      if (!near.inWater) this._emit('groupClear', { group: near.id, kind: near.kind });
    }
  }

  _dropoff(p, dt) {
    const T = this.T;
    this.inZone = this._inZone(p);
    if (!this.inZone || !this.aboard.length) { this.dropT = 0; if (this.status === 'dropping' || this.status === 'slowForDrop') this.status = 'idle'; return; }
    if (p.speed > T.dropSpeed) { this.dropT = 0; if (this.status === 'idle') this.status = 'slowForDrop'; return; }
    if (this.status === 'idle' || this.status === 'slowForDrop') this.status = 'dropping';
    this.dropT += dt;
    while (this.dropT >= T.dropEach && this.aboard.length) {
      this.dropT -= T.dropEach;
      const person = this.aboard.shift();
      person.state = 'home';
      this.rescued++;
      this.streak++;
      if (this.streak > this.bestStreak) this.bestStreak = this.streak;
      const pts = Math.round(T.scorePerson * this.wave * this.multiplier);
      this.score += pts;
      this._emit('dropoff', { person: person.id, points: pts, mult: this.multiplier, streak: this.streak });
    }
    if (!this.aboard.length && !this.peopleInWater) this._waveClear();
  }

  _waveClear() {
    const T = this.T;
    const left = Math.max(0, Math.floor(this.timer));
    const timeBonus = left * T.timeBonusPerSec;
    const rapid = this.timer >= this.timerTotal * 0.4 ? T.cleanWaveBonus * this.wave : 0;
    this.score += timeBonus + rapid;
    this.wavesCleared++;
    const took = this.timerTotal - this.timer;
    if (this.fastestWave === null || took < this.fastestWave.sec) this.fastestWave = { n: this.wave, sec: took };
    this.phase = 'clear';
    this.phaseT = 0;
    this.status = 'idle';
    this._emit('clear', { n: this.wave, timeBonus, rapid, took });
  }

  _timeUp() {
    let n = this.aboard.length;
    for (const g of this.groups) {
      for (const q of g.people) if (q.state === 'water') { q.state = 'shore'; n++; }
      g.inWater = 0;
    }
    for (const q of this.aboard) q.state = 'shore';
    this.aboard.length = 0;
    this.handedToShore += n;
    this.chances--;
    this.streak = 0;
    this.timer = 0;
    this.phase = 'timeup';
    this.phaseT = 0;
    this.status = 'idle';
    this._emit('timeup', { n: this.wave, handed: n, chances: this.chances });
  }

  // Where to steer: the nearest group still in the water, unless the sled is
  // full or nobody is left out there, in which case the beach.
  objective(p) {
    const toZone = { kind: 'zone', x: this.zone.x, z: this.zone.z, dist: Math.hypot(p.x - this.zone.x, p.z - this.zone.z) };
    if (this.phase === 'over') return null;
    if (this.aboard.length >= this.T.capacity) return toZone;
    let best = null, bd = Infinity;
    for (const g of this.groups) {
      if (!g.inWater) continue;
      const d = Math.hypot(p.x - g.x, p.z - g.z);
      if (d < bd) { bd = d; best = g; }
    }
    if (best) return { kind: 'group', group: best, x: best.x, z: best.z, dist: bd };
    return this.aboard.length ? toZone : null;
  }

  summary() {
    return {
      score: this.score, rescued: this.rescued, wavesCleared: this.wavesCleared,
      reachedWave: this.wave, bestStreak: this.bestStreak, handedToShore: this.handedToShore,
      fastestWave: this.fastestWave, seconds: Math.round(this.time),
    };
  }
}
