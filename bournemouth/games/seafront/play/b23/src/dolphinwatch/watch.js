// DOLPHIN WATCH - the rules (b22, 24 Sep 2026). The ninth level, and the owner's own idea:
// "Where do I go for the dolphins? ... Maybe we should add a dolphin finding level."
//
// A pod is somewhere in the bay. Find it, and get them riding your bow for THIRTY SECONDS in
// total. Every time they surface a "Blow!" marker goes up on screen where it happened, so the
// sea tells you where to look. The rules are the real code for meeting dolphins on the water:
// slow down near them, hold a steady course, never chase. Charge at them, or throw the boat
// about near them, and they bolt - THREE of those and the pod leaves the bay and the run is lost.
//
// PURE, like src/dolphin-pod.js, which it reads and never writes: no DOM, no GL, no clock and
// no Math.random. The pod decides everything about the animals - when they breathe, whether a
// boat frightens them, whether they ride it - and this file only WATCHES it and keeps score.
// So the level cannot disagree with the dolphins the player sees in free ride: they are the
// same animals obeying the same rules, and a suite can drive both together in Node.
//
// The ONE thing it asks of the pod is where to START (placePod below), and that goes through
// the pod's own summon() in the mode, not through anything written here.

import { ROLL, LEAP, AVOID, RIDE, APPROACH, openWater, HOME } from '../dolphin-pod.js';
import { mulberry32 } from '../rng.js';

export const WATCH = {
  rideGoal: 30,          // s on the bow, in total, to win
  runSec: 300,           // the clock: generous, because FINDING them is the level
  scares: 3,             // the third bolt and they leave the bay
  gap: [8, 14],          // the leader's wait between breaths for this run (free ride: 14-30)
  podDist: [170, 230],   // m from the spawn to where the pod starts
  blowLife: 4.0,         // s a "Blow!" marker stays up
  blowMerge: 25,         // m: a pod breathing together is ONE marker, not six
  blowNear: 30,          // m: closer than this you can see them - no marker in the way
  sight: 450,            // m: a breath further off than this is not "seen"
  leapSight: 160,        // m: a leap further off than this is not counted as seen
  nervousAt: 0.15,       // the pod's own threat, above which the HUD warns you off
  endSec: 3.0,           // s the result banner holds before the card
  pts: { perSec: 100, leap: 150, calm: 1500, perSecLeft: 5 },
};

// Where the pod starts for a run: `podDist` from the spawn, in open water the pod is allowed
// to be in (dolphin-pod.js openWater: clear of the pier, off the beach, inside its home water).
// Seeded, so a run's seed is the whole of its opening.
export function placePod(seed, spawn) {
  const rng = mulberry32((seed ^ 0x5eed0d01) >>> 0);
  const [d0, d1] = WATCH.podDist;
  for (let k = 0; k < 64; k++) {
    const a = rng() * Math.PI * 2, d = d0 + rng() * (d1 - d0);
    const x = spawn.x + Math.cos(a) * d, z = spawn.z + Math.sin(a) * d;
    if (openWater(x, z)) return { x, z };
  }
  return { x: HOME.x, z: HOME.z };      // never reached from the real spawn; stated, not hidden
}

export class WatchRun {
  constructor({ seed = 0x0d01f1 } = {}) {
    this.seed = seed >>> 0;
    this.T = { ...WATCH, chances: WATCH.scares };   // `chances`: what the score reads (main.js)
    this.phase = 'live';              // live -> done (banner) -> over (card)
    this.time = 0;
    this.timerTotal = WATCH.runSec;
    this.timer = WATCH.runSec;
    this.rideT = 0;
    this.scares = 0;
    this.leaps = 0;
    this.blowsSeen = 0;
    this.rides = 0;
    this.seen = false;
    this.lastSeen = null;             // {x, z, t} - the compass points here
    this.blows = [];                  // on-screen markers: {x, z, age, n}
    this.status = 'search';
    this.threat = 0;
    this.won = null;
    this.why = '';
    this.score = 0;
    this.endT = 0;
    this.events = [];
    this._modes = null;
    this._mood = null;
  }

  get chances() { return Math.max(0, WATCH.scares - this.scares); }   // for the music (main.js)
  get left() { return this.timer; }

  // One fixed step. `pod` is the DolphinPod (read only); `pose` is playerPose(sim).
  update(pod, pose, dt) {
    if (this.phase === 'over') return;
    if (this.phase === 'done') {
      this.endT -= dt;
      this._age(dt);
      if (this.endT <= 0) { this.phase = 'over'; this.events.push({ type: 'over', ...this.summary() }); }
      return;
    }
    this.time += dt;
    this.timer = Math.max(0, WATCH.runSec - this.time);
    this._age(dt);
    if (!pod) return;
    this.threat = pod.threat || 0;
    this._breaths(pod, pose);
    this._moods(pod);
    if (pod.mood === RIDE) {
      this.rideT += dt;
      const [cx, cz] = centroid(pod.pod);
      this.lastSeen = { x: cx, z: cz, t: this.time };
    }
    this.status = this._status(pod, pose);
    if (this.rideT >= WATCH.rideGoal) { this.rideT = WATCH.rideGoal; this._end(true, 'ride'); return; }
    if (this.scares >= WATCH.scares) { this._end(false, 'scared'); return; }
    if (this.timer <= 0) this._end(false, 'time');
  }

  // Every breath, read off the animals themselves: a dolphin whose mode has just become a roll
  // or a leap has just broken the surface. A pod breathing together is ONE marker.
  _breaths(pod, pose) {
    const list = pod.pod, n = list.length;
    if (!this._modes || this._modes.length !== n) { this._modes = list.map((d) => d.mode); return; }
    for (let i = 0; i < n; i++) {
      const d = list[i], was = this._modes[i];
      this._modes[i] = d.mode;
      if (d.mode === was || (d.mode !== ROLL && d.mode !== LEAP)) continue;
      const dist = pose ? Math.hypot(d.x - pose.x, d.z - pose.z) : 0;
      if (dist > WATCH.sight) continue;
      this.blowsSeen++;
      this.lastSeen = { x: d.x, z: d.z, t: this.time };
      if (!this.seen) { this.seen = true; this.events.push({ type: 'spotted', x: d.x, z: d.z, dist }); }
      if (d.mode === LEAP && dist <= WATCH.leapSight) { this.leaps++; this.events.push({ type: 'leap', dist }); }
      if (dist < WATCH.blowNear) continue;
      const m = this.blows.find((b) => b.age < WATCH.blowLife * 0.6 && Math.hypot(b.x - d.x, b.z - d.z) < WATCH.blowMerge);
      if (m) { m.n++; m.x += (d.x - m.x) / m.n; m.z += (d.z - m.z) / m.n; m.age = 0; }
      else this.blows.push({ x: d.x, z: d.z, age: 0, n: 1 });
    }
  }

  _moods(pod) {
    const m = pod.mood, was = this._mood;
    this._mood = m;
    if (was === null || m === was) return;
    if (m === AVOID) { this.scares++; this.events.push({ type: 'scare', n: this.scares, of: WATCH.scares }); }
    else if (m === RIDE) { this.rides++; this.events.push({ type: 'ride', n: this.rides }); }
    else if (m === APPROACH) this.events.push({ type: 'coming' });
    else if (was === RIDE) this.events.push({ type: 'peel', rideT: this.rideT });
  }

  _status(pod, pose) {
    const m = pod.mood;
    if (m === AVOID) return 'scared';
    if (m === RIDE) return 'riding';
    if (m === APPROACH) return 'coming';
    if (this.threat > WATCH.nervousAt) return 'nervous';
    if (!this.seen) return 'search';
    return 'find';
  }

  _age(dt) {
    let w = 0;
    for (const b of this.blows) { b.age += dt; if (b.age < WATCH.blowLife) this.blows[w++] = b; }
    this.blows.length = w;
  }

  _end(won, why) {
    this.won = won; this.why = why;
    this.phase = 'done'; this.endT = WATCH.endSec;
    this.score = this._score();
    this.events.push({ type: won ? 'win' : 'lost', why, scares: this.scares, rideT: this.rideT });
  }

  _score() {
    const P = WATCH.pts;
    let s = Math.round(this.rideT * P.perSec) + this.leaps * P.leap;
    if (this.won) {
      if (this.scares === 0) s += P.calm;
      s += Math.round(this.timer) * P.perSecLeft;
    }
    return s;
  }

  // Where the compass points: the last breath seen, or the pod on the bow. null before a sighting.
  objective(pose) {
    if (!this.lastSeen || !pose) return null;
    const L = this.lastSeen;
    return { x: L.x, z: L.z, dist: Math.hypot(L.x - pose.x, L.z - pose.z), age: this.time - L.t };
  }

  summary() {
    return {
      won: this.won, why: this.why, score: this.score,
      rideT: this.rideT, leaps: this.leaps, scares: this.scares, rides: this.rides,
      calm: this.won && this.scares === 0, seconds: this.time, secondsLeft: this.timer,
    };
  }
}

function centroid(list) {
  let x = 0, z = 0;
  for (const d of list) { x += d.x; z += d.z; }
  const n = list.length || 1;
  return [x / n, z / n];
}
