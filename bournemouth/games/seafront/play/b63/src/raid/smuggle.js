// THE DORSET SMUGGLING RUN (tmp-tr170) - the sixth level: rules, HUD and controller.
//
// Owner's brief, in their words: "do the dorset smuggling level".
//
// ===========================================================================================
// THE ONE RULE THIS LEVEL IS BUILT AROUND
// ===========================================================================================
// THIS IS SEIZURE, NOT DESTRUCTION. You come alongside a boat and the run is taken: the cargo
// is seized and the boat is impounded. Nothing in this level is sunk, holed, burned, rammed
// into wreckage or shot at; nobody is killed, hurt, thrown into the water or shown in danger;
// there is no weapon, no projectile, no health, no damage and no casualty anywhere in this
// file or in src/gl/smuggle-boats.js. The FIRE and WATER controls do nothing here.
//
// That is not only the content line this project already holds (tmp-tr161/CONTRACT.md §7).
// It is also what actually happened: the Preventive Service's remedy against a smuggler was
// SEIZURE of the goods and of the vessel. The historically correct mechanic and the one the
// content rules require turn out to be the same mechanic, which is the happiest thing about
// this level.
//
// The score is CARGO SEIZED. Not boats taken - boats are worth having and are worth less. A
// boat that lands her cargo is the failure, and enough of them is the losing condition.
//
// ===========================================================================================
// THE SECOND VERB, AND WHY IT EARNS ITS PLACE
// ===========================================================================================
// A smuggler who saw a Revenue boat coming would SOW THE CROP: the tubs went over the side on
// a weighted rope, sunk, buoyed with a marker, and he ran for it empty. Getting them back was
// called CREEPING - dragging a grapnel along the bottom until it fouled the string.
//
// So: close decisively and you take the boat WITH her cargo. Dither, and her nerve goes, the
// crop is sown and you are left with a choice worth making - chase the empty boat for the
// impound, or stop and creep the tubs for the cargo, which is worth more and costs three
// times the time. That is a real decision every thirty seconds, and it is the reason this is
// a level and not a reskin of the raid.
//
// ===========================================================================================
// WHAT IS IN THIS FILE AND WHY IT IS ALL IN ONE FILE
// ===========================================================================================
//   SmuggleGame   - the rules. PURE: no DOM, no GL, no clock, no location, no Math.random.
//                   A node harness builds it with no environment at all
//                   (tmp-tr170/test-smuggle.mjs).
//   smugglePilot  - a scripted pilot, test and demo only, driving the REAL craft through the
//                   ordinary input path so the suite proves the rules against real physics.
//   SmuggleHud    - the HUD. src/raid/raid-hud.js belongs to another pass and is not touched,
//                   so this level carries its own: its own <style>, its own root, its own
//                   markers and its own cards. Sizes are in PIXELS on purpose (index.html
//                   sets html,body { font: 12px }, so 1rem here is 12px and a .95rem floor
//                   written in rem would have measured as complying at 11.4px). Nothing a
//                   player reads on this layer is under 16px and no touch target is under
//                   44px.
//   initSmuggle   - the controller main.js talks to, inside its // >>> SMUGGLE fence.
//
// COSTS NOTHING WHILE OFF. No GL object is built, no mesh, no DOM and no audio until enter()
// is called, and tick()/frame() are never called with the mode off - the same construction
// the raid uses, and the reason the 19 judged views come back bit-identical.

import { playerPose } from '../player-pose.js';
import { mulberry32, StateHash } from '../rng.js';
import { SMUGGLE, landZ } from './tuning.js';
import { RaidDriver } from './collide.js';
import { SmuggleActors, SmuggleScene } from '../gl/smuggle-boats.js';
import { OVERCAST } from '../gl/craft.js';
import { RaidAudio } from './raid-audio.js';
// >>> PROGRESS
import * as prog from '../ui/progress-store.js';
import { setNext, goNext } from '../ui/next-button.js';
// <<< PROGRESS

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const wrap = (a) => a - TAU * Math.round(a / TAU);

// Every event this level can emit. It is exported because tmp-tr170/test-smuggle.mjs asserts
// that a run produces NOTHING outside it - which is how "no code path can harm a person" is
// checked by driving the game rather than by reading it. There is deliberately no 'sink',
// 'hit', 'hurt', 'kill', 'hurl', 'wreck' or 'swimmer' in this list and there never may be.
export const EVENTS = ['tide', 'sighted', 'seize', 'sow', 'creep', 'crept', 'landed', 'bump', 'away', 'lost', 'held', 'over'];

// ===========================================================================================
// THE RULES
// ===========================================================================================
export class SmuggleGame {
  constructor(opts = {}) {
    this.T = { ...SMUGGLE, ...(opts.tuning || {}) };
    this.hash = new StateHash();
    this.events = [];
    this.newRun(opts.seed ?? this.T.seed);
  }

  newRun(seed) {
    const T = this.T;
    this.seed = seed >>> 0;
    this.rng = mulberry32(this.seed);
    this.tick = 0; this.time = 0; this.score = 0;
    this.phase = 'live';
    this.outcome = null;
    this.player = { x: 0, z: 0, heading: Math.PI / 2, speed: 0, craft: 'efoil', valid: false };
    this.boats = []; this.crops = [];
    this.nextId = 1; this.nextCrop = 1;
    this.tubsSeized = 0; this.tubsCrept = 0; this.tubsLanded = 0;
    this.boatsTaken = 0; this.cropsSown = 0; this.cropsRecovered = 0;
    this.tide = 0;
    this.stats = { closest: 9999, sighted: 0, ran: 0, grounded: 0, bumps: 0 };
    this.hash.reset();
    this.events.length = 0;
    this._plan();
  }

  get playing() { return this.phase === 'live'; }
  get left() { return Math.max(0, this.T.runSec - this.time); }
  get tubsTaken() { return this.tubsSeized + this.tubsCrept; }
  // Cargo still afloat and still in play: on a deck, or on the bottom waiting to be crept.
  get tubsAfloat() {
    let n = 0;
    for (const b of this.boats) if (b.state !== 'gone') n += b.tubs;
    for (const c of this.crops) if (!c.done) n += c.tubs;
    return n;
  }
  // `ships` is the name src/raid/collide.js's RaidDriver.publish() reads. Aliasing rather
  // than renaming `boats` keeps this file's own vocabulary honest - these are not ships and
  // there is no fleet - while reusing the collision glue unchanged, which is worth more than
  // a private copy of it would be.
  get ships() { return this.boats; }
  solid(b) { return b.state !== 'gone'; }

  // ---- THE GUARANTEE ---------------------------------------------------------------------
  // The number of people afloat at the end of a run is the number that started, always. No
  // transition below reduces a crew, there is no array of people in the water, and `harmed`
  // is a counter that is written in exactly one place: here, never.
  // tmp-tr170/test-smuggle.mjs holds this across thousands of ticks and every outcome.
  crewAboard() { let n = 0; for (const b of this.boats) n += b.crew; return n; }
  crewStarted() { let n = 0; for (const b of this.boats) n += b.crew0; return n; }
  get harmed() { return 0; }

  // ---- the plan --------------------------------------------------------------------------
  // The whole night is laid out at construction: which boat, carrying what, from where, for
  // where, and at what second she is released. Deterministic from the seed, so a suite can
  // replay a run exactly and the owner can hand back a seed with a bug in it.
  _plan() {
    const T = this.T, F = T.field, r = this.rng;
    this.queue = [];
    let t = 0;
    for (let ti = 0; ti < T.tides.length; ti++) {
      const tide = T.tides[ti];
      for (let i = 0; i < tide.n; i++) {
        const galley = tide.galleyEvery > 0 && (i % tide.galleyEvery) === (tide.galleyEvery - 1);
        const kind = galley ? 'galley' : 'lugger';
        const row = T.boats[kind];
        // where she is making for, and where she comes from: a shallow slant, never straight
        // down the z axis, so two boats in the same tide are never on the same track.
        const landX = F.xMin + (F.xMax - F.xMin) * r();
        const spawnZ = F.zSpawnMin + (F.zSpawnMax - F.zSpawnMin) * r();
        const spawnX = clamp(landX + (r() - 0.5) * 220, F.xMin - 90, F.xMax + 90);
        this.queue.push({
          at: t, kind, L: row.L, tubs: row.tubs, landX, spawnX, spawnZ,
          speed: tide.speed * row.speedFactor, tide: ti,
        });
        t += tide.gap;
      }
      t += T.tideGapSec - tide.gap;
    }
    this.planTotalTubs = this.queue.reduce((a, q) => a + q.tubs, 0);
  }

  _release(q) {
    const T = this.T;
    const lz = landZ(q.landX);
    const b = {
      id: this.nextId++, kind: q.kind, L: q.L, tide: q.tide,
      x: q.spawnX, z: q.spawnZ, y: 0, heading: Math.atan2(lz - q.spawnZ, q.landX - q.spawnX),
      speed: q.speed, base: q.speed, pitch: 0, roll: 0, phase: (this.nextId * 1.7) % TAU,
      landX: q.landX, landZ: lz,
      tubs: q.tubs, tubs0: q.tubs,
      // The crew. They are here because a boat has a crew, they are drawn, and they are the
      // reason this level is about taking a boat rather than removing one. This number is
      // read, never written - see crewAboard() above.
      crew: q.kind === 'galley' ? 6 : 4, crew0: q.kind === 'galley' ? 6 : 4,
      state: 'running', hold: 0, nerve: 0, seen: false, sowT: 0, unloaded: 0, doneT: 0,
    };
    this.boats.push(b);
    return b;
  }

  // ---- the tick --------------------------------------------------------------------------
  // Signature matches RaidGame.update() so src/raid/collide.js's RaidDriver drives this level
  // with no change to that file. `fire` and `water` arrive and are IGNORED: this level has no
  // weapon and that is checked, not merely stated (test-smuggle.mjs drives a whole run with
  // both held down and asserts the outcome is identical to one with neither).
  update(pose, dt, contacts, fire, water) {
    if (this.phase === 'over') {
      const q = this.player;
      q.x = pose.x; q.z = pose.z; q.heading = pose.heading; q.speed = pose.speed; q.valid = true;
      return;
    }
    const T = this.T;
    this.tick++;
    this.time += dt;
    const p = this.player;
    p.x = pose.x; p.z = pose.z; p.heading = pose.heading; p.speed = pose.speed;
    p.craft = pose.craft || 'efoil'; p.valid = true;

    // release what the night's plan says is due
    while (this.queue.length && this.queue[0].at <= this.time) {
      const q = this.queue.shift();
      const b = this._release(q);
      if (q.tide !== this.tide || (this.tide === 0 && b.id === 1)) {
        this.tide = q.tide;
        this._emit({ type: 'tide', n: q.tide + 1, of: T.tides.length, boats: T.tides[q.tide].n });
      }
    }

    for (const c of contacts || []) {
      this.stats.bumps++;
      // A contact is a BUMP and nothing else: no damage is taken by anyone, by anything, in
      // either direction. collide.js has already done the physics; this is the sound cue.
      this._emit({ type: 'bump', x: c.x, z: c.z, hard: c.speed > 4 });
    }

    for (const b of this.boats) this._stepBoat(b, dt);
    this._stepSeizure(dt);
    this._stepCrops(dt);

    if (this.tubsLanded >= T.loseTubs) this._finish('lost');
    else if (this.time >= T.runSec) this._finish('held');
    else if (!this.queue.length && this._allResolved()) this._finish('held');

    this.hash.num(p.x); this.hash.num(p.z); this.hash.int(this.tubsSeized);
    this.hash.int(this.tubsLanded); this.hash.int(this.boats.length);
  }

  _allResolved() {
    for (const b of this.boats) if (b.state !== 'gone' && b.state !== 'seized') return false;
    for (const c of this.crops) if (!c.done) return false;
    return true;
  }

  _emit(e) { e.tick = this.tick; e.t = this.time; this.events.push(e); }

  // ---- one boat --------------------------------------------------------------------------
  _stepBoat(b, dt) {
    const T = this.T, p = this.player, row = T.boats[b.kind];
    if (b.state === 'gone') return;

    if (b.state === 'seized') {
      // Taken. She lies to, canvas down, until she is out of the way. Nothing happens to her
      // and nothing happens to anyone on board: she is simply no longer part of the night.
      b.speed += (0 - b.speed) * Math.min(1, dt * 1.6);
      b.doneT += dt;
      if (b.doneT > 16) b.state = 'gone';
      return;
    }

    // HER NERVE. She only starts counting once she has actually seen you, and the count eases
    // back (slowly - a skipper who has seen a Revenue boat does not forget) when you sheer off.
    const d = Math.hypot(p.x - b.x, p.z - b.z);
    if (d < this.stats.closest) this.stats.closest = d;
    if (b.state === 'running') {
      if (d < T.warnR) {
        if (!b.seen) { b.seen = true; this.stats.sighted++; this._emit({ type: 'sighted', id: b.id, kind: b.kind, x: b.x, z: b.z, tubs: b.tubs }); }
        b.nerve += dt;
      } else if (b.nerve > 0) {
        b.nerve = Math.max(0, b.nerve - dt * 0.35);
      }
      if (b.nerve >= row.nerveSec && b.tubs > 0) { b.state = 'sowing'; b.sowT = 0; }
    }

    let gx = b.landX, gz = b.landZ, want = b.base;
    if (b.state === 'sowing') {
      // Over the side they go. She holds her head up into it and barely moves while it is
      // happening, which is the window the player has to get alongside and stop it.
      want = b.base * 0.30;
      b.sowT += dt;
      if (b.sowT >= T.sowSec) {
        this._sow(b);
        b.state = 'fleeing';
      }
    } else if (b.state === 'fleeing') {
      // Empty and away: hard seaward, and away from the player rather than across her bow.
      const off = Math.sign(b.x - p.x) || 1;
      gx = b.x + off * 260; gz = T.field.fleeZ + 120;
      want = b.base * row.runFactor;
      if (b.z >= T.field.fleeZ) {
        b.state = 'gone';
        this.stats.ran++;
        this._emit({ type: 'away', id: b.id, kind: b.kind, x: b.x, z: b.z });
        return;
      }
    } else if (b.state === 'landing') {
      // Grounded. The cargo goes up the beach one tub at a time, and every one of them is a
      // tub you did not take. She is still alongside-able the whole time she is doing it.
      want = 0;
      const rate = b.tubs0 / T.landSec;
      const before = Math.floor(b.unloaded);
      b.unloaded = Math.min(b.tubs0, b.unloaded + rate * dt);
      const now = Math.floor(b.unloaded);
      for (let i = before; i < now && b.tubs > 0; i++) {
        b.tubs--; this.tubsLanded++;
        this._emit({ type: 'landed', id: b.id, x: b.x, z: b.z, total: this.tubsLanded, limit: T.loseTubs });
      }
      if (b.tubs <= 0) { b.state = 'fleeing'; b.unloaded = 0; }
    } else if (b.state === 'running' && b.z <= b.landZ) {
      b.state = 'landing';
      this.stats.grounded++;
    }

    // the helm: a rate-limited turn onto the goal, and a speed that eases for a hard turn
    const e = wrap(Math.atan2(gz - b.z, gx - b.x) - b.heading);
    const turn = clamp(e * 1.4, -row.turn, row.turn);
    b.heading = wrap(b.heading + turn * dt);
    if (Math.abs(e) > 0.5) want *= 0.78;
    b.speed += (want - b.speed) * Math.min(1, dt * 0.85);
    b.x += Math.cos(b.heading) * b.speed * dt;
    b.z += Math.sin(b.heading) * b.speed * dt;
    // a laden hull rolls into her turn and sits bow-down under way
    // She is aground: she does not keep going up the beach while her way comes off.
    if (b.state === 'landing') b.z = Math.max(b.z, b.landZ - 1.5);
    b.roll += (-turn * 1.1 - b.roll) * Math.min(1, dt * 2.2);
    b.pitch += ((b.speed * -0.006) - b.pitch) * Math.min(1, dt * 2);
    b.y = (b.tubs > 0 ? -0.30 : -0.02) + 0.10 * Math.sin(this.time * 1.1 + b.phase);
  }

  // ---- sowing the crop -------------------------------------------------------------------
  _sow(b) {
    const T = this.T;
    const c = {
      id: this.nextCrop++, x: b.x, z: b.z, tubs: b.tubs,
      // laid along her track, which is why the marker is not quite where she was
      ax: Math.cos(b.heading), az: Math.sin(b.heading), spread: T.sowSpreadM,
      sinkT: 0, hold: 0, done: false, floating: 0, from: b.id,
    };
    this.crops.push(c);
    this.cropsSown++;
    this._emit({ type: 'sow', id: b.id, crop: c.id, kind: b.kind, x: b.x, z: b.z, tubs: b.tubs });
    b.tubs = 0;
  }

  // ---- alongside -------------------------------------------------------------------------
  _stepSeizure(dt) {
    const T = this.T, p = this.player;
    for (const b of this.boats) {
      if (b.state === 'gone' || b.state === 'seized') { b.hold = 0; continue; }
      const reach = T.seizeR + b.L * 0.35;
      const d = Math.hypot(p.x - b.x, p.z - b.z);
      if (d <= reach) b.hold += dt;
      else b.hold = Math.max(0, b.hold - T.seizeDecay * dt);
      if (b.hold >= T.seizeSec) this._seize(b);
    }
  }

  // THE WHOLE POINT OF THE LEVEL, in eleven lines. She stops, her canvas comes down, her
  // cargo is seized and she is impounded. Her crew are exactly as they were - the only thing
  // that changes about the people on board is that they are now somebody else's problem.
  _seize(b) {
    const T = this.T;
    const tubs = b.tubs;
    const points = tubs * T.score.tub + T.score.boat;
    b.state = 'seized'; b.hold = 0; b.nerve = 0; b.doneT = 0;
    b.tubs = 0;
    this.tubsSeized += tubs;
    this.boatsTaken++;
    this.score += points;
    this._emit({ type: 'seize', id: b.id, kind: b.kind, x: b.x, z: b.z, tubs, points, crew: b.crew });
  }

  // ---- creeping --------------------------------------------------------------------------
  _stepCrops(dt) {
    const T = this.T, p = this.player;
    for (const c of this.crops) {
      if (c.done) continue;
      if (c.sinkT < T.cropSinkSec) { c.sinkT += dt; c.floating = 0; continue; }
      const d = Math.hypot(p.x - c.x, p.z - c.z);
      const slow = p.speed <= T.creepSpeedMax;
      if (d <= T.creepR && slow) {
        if (c.hold <= 0) this._emit({ type: 'creep', crop: c.id, x: c.x, z: c.z, tubs: c.tubs });
        c.hold += dt;
      } else {
        c.hold = Math.max(0, c.hold - T.creepDecay * dt);
      }
      c.floating = Math.min(c.tubs, Math.floor(c.tubs * (c.hold / T.creepSec)));
      if (c.hold >= T.creepSec) {
        c.done = true; c.floating = 0;
        this.tubsCrept += c.tubs;
        this.cropsRecovered++;
        const points = c.tubs * T.score.crept;
        this.score += points;
        this._emit({ type: 'crept', crop: c.id, x: c.x, z: c.z, tubs: c.tubs, points });
      }
    }
  }

  // ---- the end ---------------------------------------------------------------------------
  _finish(outcome) {
    if (this.phase === 'over') return;
    const T = this.T;
    this.phase = 'over';
    this.outcome = outcome;
    let bonus = 0;
    if (outcome === 'held') {
      bonus += Math.round(this.left) * T.score.timeBonus;
      if (this.tubsLanded === 0) bonus += T.score.cleanBonus;
      this.score += bonus;
      this._emit({ type: 'held', tubs: this.tubsTaken, landed: this.tubsLanded, bonus });
    } else {
      this._emit({ type: 'lost', landed: this.tubsLanded, limit: T.loseTubs });
    }
    this._emit({
      type: 'over', outcome, score: this.score, seized: this.tubsSeized, crept: this.tubsCrept,
      landed: this.tubsLanded, boats: this.boatsTaken, sown: this.cropsSown,
      recovered: this.cropsRecovered, bonus, seed: this.seed,
    });
  }
}

// ===========================================================================================
// THE PILOT - test and demo only
// ===========================================================================================
// Drives the real craft through the ordinary input path ({lean, turn, throttle, boost}), the
// same contract src/raid/pilot.js keeps, so tmp-tr170/test-smuggle.mjs proves the rules
// against the real physics rather than against a stand-in. It never presses FIRE or WATER,
// because in this level there is nothing to press them for.
const HELM = {
  speedboat: { rMin: 9, aSteer: 7, vMax: 20, gain: 2.4, damp: 0.45, minThr: 0.34 },
  jetski: { rMin: 4, aSteer: 12, vMax: 18, gain: 2.2, damp: 0.3, minThr: 0.40 },
};
const pst = new WeakMap();

// Which target is worth the most right now: a laden boat close to her beach beats a distant
// one, an empty runner is worth the impound only, and a sown crop is worth its cargo but
// costs the creep. Simple, legible, and good enough to prove a run is winnable.
export function smuggleTarget(g, px, pz) {
  let best = null, bestV = -1e9;
  for (const b of g.boats) {
    if (b.state === 'gone' || b.state === 'seized') continue;
    const d = Math.hypot(b.x - px, b.z - pz);
    const urgency = b.state === 'landing' ? 260 : b.tubs > 0 ? 120 : 20;
    const v = b.tubs * g.T.score.tub + (b.tubs > 0 ? 0 : g.T.score.boat * 0.4) + urgency - d * 1.5;
    if (v > bestV) { bestV = v; best = { kind: 'boat', x: b.x, z: b.z, ref: b, d }; }
  }
  for (const c of g.crops) {
    if (c.done) continue;
    const d = Math.hypot(c.x - px, c.z - pz);
    const v = c.tubs * g.T.score.crept - d * 1.5 - 60;
    if (v > bestV) { bestV = v; best = { kind: 'crop', x: c.x, z: c.z, ref: c, d }; }
  }
  return best;
}

export function smugglePilot(sim, g) {
  let m = pst.get(sim);
  if (!m) { m = { lean: 0, prevErr: 0, out: { lean: 0, turn: 0, throttle: 0, boost: 0, fire: false, water: false } }; pst.set(sim, m); }
  const o = m.out;
  const p = playerPose(sim);
  const efoil = p.craft === 'efoil';
  const s0 = sim.plant && sim.plant.state;
  const wd = efoil && s0 && Number.isFinite(s0.wingDepth) ? s0.wingDepth : 0.24;
  const err = wd - 0.24, der = (err - m.prevErr) * 120; m.prevErr = err;
  m.lean += (clamp(err * 2 + der * 0.6, -1, 1) - m.lean) * 0.15;
  o.lean = efoil ? m.lean : 0; o.boost = 0; o.fire = false; o.water = false;

  const t = smuggleTarget(g, p.x, p.z);
  if (!t || !g.playing) { o.turn = 0; o.throttle = efoil ? 0.45 : 0.3; return o; }
  const e = wrap(Math.atan2(t.z - p.z, t.x - p.x) - p.heading);
  const B = HELM[p.craft];
  const u = Math.max(0, p.speed);
  if (!B) {
    o.turn = clamp(e * 1.6, -1, 1);
    o.throttle = t.d < 14 ? 0.18 : 0.62;
    return o;
  }
  const yawRate = (p.heading - (m.ph ?? p.heading)) * 120; m.ph = p.heading;
  const rate = Math.min(Math.max(u, 0.6) / B.rMin, B.aSteer / Math.max(u, 0.8));
  const want = clamp(e * B.gain - yawRate * B.damp, -2.2, 2.2);
  o.turn = clamp(want / Math.max(rate, 0.12), -1, 1);
  // The approach speed is the whole skill of this level: arrive fast, then STOP ON HER.
  // Creeping wants to be slower still, because the grapnel will not bite at speed.
  const wantSlow = t.kind === 'crop' ? g.T.creepSpeedMax * 0.55 : 4.5;
  let vT = B.vMax;
  vT = Math.min(vT, wantSlow + Math.max(0, t.d - (t.kind === 'crop' ? 6 : 8)) * 0.9);
  if (Math.abs(e) > 0.4) vT = Math.min(vT, 9);
  o.throttle = clamp((vT - u) * 0.35 + 0.12, Math.abs(e) > 0.22 ? B.minThr : 0, 1);
  return o;
}

// ===========================================================================================
// THE HUD
// ===========================================================================================
// ⚠️ SIZES ARE IN PIXELS ON PURPOSE. index.html sets html, body { font: 12px }, so 1rem on
// this page is 12px and the project's ".95rem floor" written in rem would render at 11.4px
// and measure as complying. Every number a player reads below is >= 16px and every pressable
// thing is >= 44px, which is the same correction src/ui/juice.js carries.
//
// None of the three widgets the project bans is used here. The briefing is ONE card; if it
// does not fit it scrolls, and the buttons are PINNED so a way out can never be off the
// bottom of a phone. (The banned names are not written out, because the suite sweeps for
// them and prose that names a thing you did not build reads to a grep as if you had.)
const CSS = `
#sg-root { position: absolute; inset: 0; pointer-events: none; z-index: 30; display: none; overflow: hidden;
  font-family: ui-sans-serif, system-ui, "Segoe UI", Roboto, sans-serif; color: #eef4fa; }
body.smuggle #sg-root { display: block; }
body.smuggle #viewbar, body.smuggle #hint, body.smuggle #rd-door, body.smuggle #rq-door { display: none !important; }
/* A card is centred and the craft bar is centred at the top, so one sits over the other's
   title. While a card is up the bar goes; the moment it closes it is back. */
body.smuggle.sgcard #craftbar, body.smuggle.sgcard #sg-top, body.smuggle.sgcard #sg-prompt,
body.smuggle.sgcard #sg-banner, body.smuggle.sgcard #sg-markers { display: none !important; }
body.clean-render #sg-root { display: none !important; }
.sg-panel { background: rgba(7,11,18,.74); border: 1px solid rgba(255,255,255,.16); border-radius: 12px; backdrop-filter: blur(4px); }
#sg-top { position: absolute; top: 10px; left: 50%; transform: translateX(-50%); display: flex; align-items: center;
  gap: 18px; padding: 8px 20px; white-space: nowrap; }
#sg-top .lab { font-size: 16px; letter-spacing: .10em; color: #b9cbdd; }
#sg-top b { font: 800 26px/1 ui-monospace, "Cascadia Mono", Consolas, monospace; color: #ffd8a0; }
#sg-top.late b { color: #ff9a6a; }
#sg-score { position: absolute; top: 10px; right: 12px; padding: 10px 16px; text-align: right; min-width: 196px; }
#sg-score .v { font: 800 30px/1.05 ui-monospace, Consolas, monospace; color: #ffd8a0; }
#sg-score .r { display: flex; justify-content: space-between; gap: 14px; font-size: 16px; margin-top: 4px; color: #cddced; }
#sg-score .r b { color: #fff; font-weight: 800; }
#sg-cargo { position: absolute; left: 12px; bottom: 16px; padding: 10px 14px; width: 236px; }
#sg-cargo .t { display: flex; justify-content: space-between; font-size: 16px; letter-spacing: .05em; color: #cddced; }
#sg-cargo .t b { color: #fff; }
#sg-cargo .bar { height: 12px; border-radius: 6px; background: rgba(255,255,255,.14); margin: 6px 0 8px; overflow: hidden; }
#sg-cargo .bar i { display: block; height: 100%; width: 0; background: linear-gradient(90deg, #ffb13b, #ff5d4f); transition: width .2s; }
#sg-cargo.bad .t b { color: #ff9a8a; }
#sg-cargo .hint { font-size: 16px; color: #9fb4c9; line-height: 1.3; }
#sg-prompt { position: absolute; left: 50%; bottom: 66px; transform: translateX(-50%); padding: 10px 22px;
  font-size: 19px; font-weight: 800; letter-spacing: .03em; white-space: nowrap; opacity: 0; transition: opacity .15s; }
#sg-prompt.on { opacity: 1; }
#sg-prompt.take { color: #ffd76a; } #sg-prompt.creep { color: #8fd8ff; } #sg-prompt.warn { color: #ff9a6a; }
#sg-banner { position: absolute; left: 50%; top: 30%; transform: translate(-50%, -50%); text-align: center;
  opacity: 0; padding: 14px 34px; white-space: nowrap; pointer-events: none; }
#sg-banner.on { opacity: 1; animation: sgslam .45s cubic-bezier(.2,1.6,.4,1); }
#sg-banner h1 { margin: 0; font-size: 44px; font-weight: 900; letter-spacing: .07em; font-style: italic;
  text-shadow: 0 3px 14px rgba(0,0,0,.55); }
#sg-banner p { margin: 6px 0 0; font-size: 17px; color: #d7e6f3; }
#sg-banner.take h1 { color: #ffd23b; } #sg-banner.sow h1 { color: #ff9a6a; }
#sg-banner.crept h1 { color: #8fd8ff; } #sg-banner.bad h1 { color: #ff5d4f; } #sg-banner.good h1 { color: #6ff0a0; }
#sg-banner.tide h1 { color: #ffcf6e; }
#sg-markers { position: absolute; inset: 0; }
.sg-m { position: absolute; left: 0; top: 0; text-align: center; font-size: 16px; font-weight: 800;
  white-space: nowrap; text-shadow: 0 1px 4px rgba(0,0,0,.95); will-change: transform; color: #ffc46a; }
.sg-m .ico { width: 30px; height: 30px; margin: 0 auto 2px; border-radius: 50%; border: 3px solid currentColor;
  background: rgba(7,11,18,.62); box-sizing: border-box; display: grid; place-items: center; font-size: 16px; }
.sg-m .gb { width: 52px; height: 6px; border-radius: 3px; background: rgba(0,0,0,.55); margin: 2px auto 0;
  overflow: hidden; border: 1px solid rgba(255,255,255,.4); }
.sg-m .gb i { display: block; height: 100%; width: 0; background: currentColor; }
.sg-m.crop { color: #8fd8ff; } .sg-m.empty { color: #b9cbdd; } .sg-m.land { color: #ff5d4f; }
.sg-m.taken { color: #7f93a6; }
.sg-m.edge .ico::after { content: ''; position: absolute; left: 50%; top: 50%; width: 0; height: 0;
  border-top: 7px solid transparent; border-bottom: 7px solid transparent; border-left: 12px solid currentColor;
  transform: translate(-50%, -50%) rotate(var(--a, 0rad)) translateX(24px); }
.sg-m.edge .ico { position: relative; }
#sg-intro, #sg-over { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
  width: min(600px, calc(100% - 28px)); max-height: calc(100% - 20px); box-sizing: border-box;
  padding: 16px 20px 14px; display: none; flex-direction: column; pointer-events: auto; }
#sg-intro.on, #sg-over.on { display: flex; }
#sg-over.on { animation: sgslam .5s cubic-bezier(.2,1.6,.4,1); }
#sg-intro h1, #sg-over h1 { margin: 0 0 2px; font-size: 30px; font-weight: 900; letter-spacing: .10em; color: #ffcf6e; flex: 0 0 auto; }
#sg-intro .sub, #sg-over .why { font-size: 17px; color: #dbe8f4; margin-bottom: 10px; flex: 0 0 auto; }
#sg-intro .body, #sg-over .body { flex: 1 1 auto; overflow-y: auto; overscroll-behavior: contain; }
#sg-intro ul { list-style: none; margin: 0 0 10px; padding: 0; font-size: 16px; line-height: 1.45; text-align: left; }
#sg-intro ul li { margin-bottom: 7px; }
#sg-intro ul b { color: #ffd76a; }
#sg-intro .hist { font-size: 16px; line-height: 1.45; color: #b9cbdd; border-top: 1px solid rgba(255,255,255,.16); padding-top: 9px; }
#sg-intro .hist b { color: #d8e6f4; font-weight: 700; }
#sg-intro .note { font-size: 16px; line-height: 1.4; color: #9fb4c9; margin-top: 8px; font-style: italic; }
#sg-over .big { font: 900 42px/1.1 ui-monospace, Consolas, monospace; color: #ffd76a; margin: 6px 0 10px; }
#sg-over dl { display: grid; grid-template-columns: 1fr auto; gap: 4px 20px; margin: 0 0 12px; text-align: left; font-size: 16px; }
#sg-over dt { color: #b9cbdd; } #sg-over dd { margin: 0; font-weight: 700; text-align: right; }
#sg-foot, #sg-ofoot { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px; flex: 0 0 auto; }
#sg-intro button, #sg-over button { min-height: 44px; padding: 0 18px; border-radius: 999px; border: 0; cursor: pointer;
  font: 800 16px ui-sans-serif, system-ui, sans-serif; letter-spacing: .06em; color: #0b1520; background: #ffc21a; }
#sg-intro button.alt, #sg-over button.alt { background: rgba(255,255,255,.16); color: #eef4fa; }
/* A11Y 2026-09-20: this layer's own rule is "nothing under 16px", and its suite asserts it over
   the font-size declarations in this string - but <small> is 0.8333em of its PARENT, so the one
   <small> on this layer ("RUN IT AGAIN Enter") rendered at 13.33 px and no declaration said so.
   A relative unit that renders under the floor while the check passes is exactly the bug this
   page's 12px root was. Pinned to 16 px; the hint stays subordinate by weight and opacity, the
   way raid-hud.js and rescue-hud.js already do it. */
#sg-intro button small, #sg-over button small { font-size: 16px; font-weight: 600; opacity: .7; }
@keyframes sgslam { 0% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; } 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; } }
@keyframes sgpop { 0% { transform: translate(-50%, 0) scale(.7); opacity: 0; } 20% { transform: translate(-50%, -8px) scale(1.1); opacity: 1; }
  100% { transform: translate(-50%, -46px) scale(1); opacity: 0; } }
@media (prefers-reduced-motion: reduce) { #sg-banner.on, #sg-over.on { animation: none; } }
/* A phone in landscape is ~390 px tall. The cards keep their pinned foot and scroll their
   body; the side panels shrink rather than overlap the controls. */
@media (max-height: 560px) {
  #sg-intro, #sg-over { width: min(760px, calc(100% - 20px)); padding: 12px 16px 12px; }
  #sg-intro h1, #sg-over h1 { font-size: 24px; }
  #sg-banner h1 { font-size: 32px; }
  #sg-cargo { width: 200px; bottom: 10px; }
  #sg-score { min-width: 168px; padding: 8px 12px; }
}
`;

// The one approved name in this level, and it is HERE - in HUD text - and nowhere else. No
// lettering of any kind appears in world geometry (tmp-tr161/CONTRACT.md §7, the same rule
// that governs Harry Paye). Every claim below was checked against a source before it was
// written; the sources are listed in tmp-tr170/RESULT.md.
const HISTORY = 'Isaac Gulliver (c.1745&ndash;1822) ran fifteen luggers into Poole Bay with gin, tea, silk and lace '
  + 'and landed them in the chines along this shore &mdash; Branksome was his favourite, and the track ran inland '
  + 'to Kinson. He was known as the smuggler who never killed a man, ended as a banker, and is buried at Wimborne '
  + 'Minster. Against him stood the <b>Preventive Service</b>: riding officers ashore, Revenue cutters at sea, and '
  + 'a remedy that was <b>seizure</b> &mdash; the goods, and the boat.';
const HISTORY2 = 'A smuggler who saw one coming would <b>sow the crop</b>: the tubs went over the side on a weighted '
  + 'rope, sunk and buoyed, and he ran for it empty. Getting them back was called <b>creeping</b> &mdash; dragging a '
  + 'grapnel until it fouled the string.';
const ANACH = 'The anachronism is deliberate and we are not hiding it: Bournemouth was still open heath in '
  + 'Gulliver’s day, the pier is 1880, and the jetski is later again. The fast rowing galley is a Kent habit '
  + 'borrowed for the game. Same straight face as the Viking raid.';

const h = (tag, attrs, html) => {
  const el = document.createElement(tag);
  if (attrs) for (const k in attrs) el.setAttribute(k, attrs[k]);
  if (html !== undefined) el.innerHTML = html;
  return el;
};

export class SmuggleHud {
  constructor(mount, { onStart, onAgain, onExit, onLevels }) {
    if (!document.querySelector('#sg-style')) {
      const style = h('style', { id: 'sg-style' });
      style.textContent = CSS;
      document.head.appendChild(style);
    }
    const r = this.root = h('div', { id: 'sg-root' });
    r.innerHTML = `
      <div id="sg-markers"></div>
      <div id="sg-top" class="sg-panel"><span class="lab">DARK</span><b>3:20</b><span class="lab">TIDE</span><b class="tide">1</b><span class="lab">INBOUND</span><b class="inb">0</b></div>
      <div id="sg-score" class="sg-panel"><div class="v">0</div>
        <div class="r"><span>TUBS SEIZED</span><b class="tb">0</b></div>
        <div class="r"><span>BOATS IMPOUNDED</span><b class="bt">0</b></div>
        <div class="r"><span>CREPT UP</span><b class="cr">0</b></div></div>
      <div id="sg-cargo" class="sg-panel"><div class="t"><span>TUBS ASHORE</span><b>0 / 26</b></div>
        <div class="bar"><i></i></div>
        <div class="hint">Come alongside and hold her.</div></div>
      <div id="sg-prompt" class="sg-panel"></div>
      <div id="sg-banner" class="sg-panel"><h1></h1><p></p></div>
      <div id="sg-intro" class="sg-panel">
        <h1>THE DORSET SMUGGLING RUN</h1>
        <div class="sub">Boats are coming in from seaward to land contraband on the beach. <b>Intercept them before they do.</b></div>
        <div class="body">
          <ul>
            <li><b>Come alongside and hold station.</b> That is the whole seizure: the cargo is seized and the boat impounded. There is no weapon in this level, nothing is sunk and nobody is hurt.</li>
            <li>Get close and her skipper sees you. Take too long and he <b>sows the crop</b> &mdash; the tubs go over the side on a rope to sink, marked with a buoy &mdash; and he runs for it empty.</li>
            <li><b>Creep</b> a sown crop back up: sit on the marker, slow, and drag for it. It works, and it costs about three times what a seizure would.</li>
            <li>A boat that grounds lands her cargo tub by tub. <b>26 tubs ashore and the run is lost.</b></li>
            <li>You are scored on <b>cargo seized</b>, not on boats taken.</li>
          </ul>
          <div class="hist">${HISTORY}</div>
          <div class="hist" style="border:0;padding-top:8px">${HISTORY2}</div>
          <div class="note">${ANACH}</div>
        </div>
        <div id="sg-foot"><button type="button" data-a="go">CAST OFF</button><button type="button" data-a="levels" class="alt">LEVELS</button></div>
      </div>
      <div id="sg-over" class="sg-panel">
        <h1>THE COAST IS HELD</h1><div class="why"></div><div class="big">0</div>
        <div class="body"><dl></dl></div>
        <div id="sg-ofoot"><button type="button" data-a="next" hidden>NEXT</button><button type="button" data-a="again">RUN IT AGAIN <small>Enter</small></button><button type="button" data-a="levels" class="alt">LEVELS</button><button type="button" data-a="exit" class="alt">FREE RIDE</button></div>
      </div>`;
    mount.appendChild(r);
    const q = (s) => r.querySelector(s);
    this.el = {
      top: q('#sg-top'), time: q('#sg-top b'), tide: q('#sg-top .tide'), inb: q('#sg-top .inb'),
      score: q('#sg-score .v'), tb: q('#sg-score .tb'), bt: q('#sg-score .bt'), cr: q('#sg-score .cr'),
      cargo: q('#sg-cargo'), cargoT: q('#sg-cargo .t b'), cargoBar: q('#sg-cargo .bar i'), cargoHint: q('#sg-cargo .hint'),
      prompt: q('#sg-prompt'), banner: q('#sg-banner'), bh: q('#sg-banner h1'), bp: q('#sg-banner p'),
      markers: q('#sg-markers'), intro: q('#sg-intro'), over: q('#sg-over'),
      next: q('#sg-over [data-a=next]'),
      overH: q('#sg-over h1'), overWhy: q('#sg-over .why'), overBig: q('#sg-over .big'), overDl: q('#sg-over dl'),
    };
    r.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      const a = b.dataset.a;
      if (a === 'go') this.hideIntro();
      // >>> PROGRESS  hide the card first, as every other branch here does.
      else if (a === 'next') { this.hideOver(); goNext(b); }
      // <<< PROGRESS
      else if (a === 'again') { this.hideOver(); onAgain(); }
      else if (a === 'exit') { this.hideOver(); onExit(); }
      else if (a === 'levels') { this.hideOver(); this.hideIntro(); onLevels(); }
    });
    this.pool = []; this.bannerT = -1e9; this.introShown = false;
    this.onStart = onStart;
  }

  showIntro() { this.el.intro.classList.add('on'); document.body.classList.add('sgcard'); this.introShown = true; }
  hideIntro() { this.el.intro.classList.remove('on'); this._card(); }
  hideOver() { this.el.over.classList.remove('on'); this._card(); }
  // exactly one place decides whether a card is up, so the two can never disagree
  _card() { document.body.classList.toggle('sgcard', this.el.intro.classList.contains('on') || this.el.over.classList.contains('on')); }

  banner(g, title, sub, kind, sec) {
    const e = this.el;
    e.bh.textContent = title;
    e.bp.textContent = sub || '';
    e.banner.className = 'sg-panel ' + (kind || '');
    e.banner.classList.add('on');
    this.bannerT = g.time; this.bannerFor = sec || 2.2;
  }
  bannerBusy(g) { return g.time - this.bannerT < this.bannerFor; }

  showOver(e) {
    const el = this.el;
    const won = e.outcome === 'held';
    // >>> PROGRESS  the coast held, so the run counts. A landed run does not.
    prog.complete('smuggle', won);
    setNext(el.next, 'smuggle', won);
    // <<< PROGRESS
    el.overH.textContent = won ? 'THE COAST IS HELD' : 'THE RUN WAS LANDED';
    el.overWhy.textContent = won
      ? (e.landed === 0 ? 'Not one tub got up the beach.' : 'They got some of it ashore, but not enough of it.')
      : `${e.landed} tubs went up the beach. The run got through.`;
    el.overBig.textContent = String(e.score);
    el.overDl.innerHTML = `
      <dt>Tubs seized</dt><dd>${e.seized}</dd>
      <dt>Tubs crept up</dt><dd>${e.crept}</dd>
      <dt>Tubs landed</dt><dd>${e.landed}</dd>
      <dt>Boats impounded</dt><dd>${e.boats}</dd>
      <dt>Crops sown against you</dt><dd>${e.sown}</dd>
      <dt>Crops recovered</dt><dd>${e.recovered}</dd>
      <dt>Bonus</dt><dd>${e.bonus}</dd>
      <dt>People harmed</dt><dd>0</dd>
      <dt>Seed</dt><dd>${e.seed.toString(16)}</dd>`;
    el.over.classList.add('on');
    document.body.classList.add('sgcard');
  }

  _mark(i) {
    let m = this.pool[i];
    if (!m) {
      m = h('div', { class: 'sg-m' }, '<div class="ico"></div><span class="lb"></span><div class="gb"><i></i></div>');
      m.ico = m.querySelector('.ico'); m.lb = m.querySelector('.lb');
      m.gb = m.querySelector('.gb'); m.gi = m.querySelector('.gb i');
      this.el.markers.appendChild(m);
      this.pool[i] = m;
    }
    return m;
  }

  update(g, pose, proj, W, H) {
    const el = this.el, T = g.T;
    const s = Math.max(0, Math.round(g.left));
    el.time.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    el.top.classList.toggle('late', s <= 30);
    el.tide.textContent = String(g.tide + 1);
    let inbound = 0;
    for (const b of g.boats) if (b.state === 'running' || b.state === 'sowing' || b.state === 'landing') inbound++;
    el.inb.textContent = String(inbound + g.queue.length);
    el.score.textContent = String(g.score);
    el.tb.textContent = String(g.tubsSeized);
    el.bt.textContent = String(g.boatsTaken);
    el.cr.textContent = String(g.tubsCrept);
    el.cargoT.textContent = `${g.tubsLanded} / ${T.loseTubs}`;
    el.cargoBar.style.width = `${Math.min(100, (g.tubsLanded / T.loseTubs) * 100).toFixed(1)}%`;
    el.cargo.classList.toggle('bad', g.tubsLanded >= T.loseTubs * 0.6);

    if (g.time - this.bannerT > this.bannerFor) el.banner.classList.remove('on');

    // the prompt: whatever the player is actually doing right now, in one line
    let msg = '', cls = '';
    let best = null;
    for (const b of g.boats) if (b.hold > 0.02 && b.state !== 'seized' && (!best || b.hold > best.hold)) best = b;
    let crop = null;
    for (const c of g.crops) if (!c.done && c.hold > 0.02 && (!crop || c.hold > crop.hold)) crop = c;
    if (best) { msg = `TAKING HER — HOLD STATION  ${Math.round((best.hold / T.seizeSec) * 100)}%`; cls = 'take'; }
    else if (crop) { msg = `CREEPING  ${Math.round((crop.hold / T.creepSec) * 100)}%`; cls = 'creep'; }
    else {
      let sowing = null;
      for (const b of g.boats) if (b.state === 'sowing') sowing = b;
      if (sowing) { msg = 'SHE IS SOWING THE CROP — GET ALONGSIDE'; cls = 'warn'; }
      else {
        let near = null;
        for (const c of g.crops) {
          if (c.done || c.sinkT < T.cropSinkSec) continue;
          const d = Math.hypot(c.x - pose.x, c.z - pose.z);
          if (d < 55 && (!near || d < near.d)) near = { d, c };
        }
        if (near) { msg = near.d <= T.creepR ? 'SLOW DOWN TO CREEP' : 'A CROP IS DOWN HERE — CREEP FOR IT'; cls = 'creep'; }
      }
    }
    el.prompt.textContent = msg;
    el.prompt.className = 'sg-panel ' + cls + (msg ? ' on' : '');
    el.cargoHint.textContent = g.crops.some((c) => !c.done)
      ? 'Creep a sown crop: slow, on the marker.'
      : 'Come alongside and hold her.';

    // markers
    let n = 0;
    if (proj) {
      const put = (x, z, label, cls2, frac, y) => {
        const m = this._mark(n++);
        const pr = proj(x, y || 1.5, z);
        let px = pr.x, py = pr.y, edge = false, ang = 0;
        if (pr.behind || px < 24 || px > W - 24 || py < 24 || py > H - 24) {
          edge = true;
          const a = Math.atan2(z - pose.z, x - pose.x);
          ang = a;
          px = clamp(px, 34, W - 34); py = clamp(py, 34, H - 34);
          if (pr.behind) { px = W / 2 + (x - pose.x > 0 ? 1 : -1) * (W / 2 - 40); py = H - 60; }
        }
        m.className = 'sg-m ' + cls2 + (edge ? ' edge' : '');
        m.style.transform = `translate(${(px - 26).toFixed(0)}px, ${(py - 30).toFixed(0)}px)`;
        m.ico.textContent = label;
        m.lb.textContent = `${Math.round(Math.hypot(x - pose.x, z - pose.z))} m`;
        m.gb.style.display = frac > 0.02 ? 'block' : 'none';
        m.gi.style.width = `${Math.min(100, frac * 100).toFixed(0)}%`;
        if (edge) m.style.setProperty('--a', `${ang}rad`);
      };
      for (const b of g.boats) {
        if (b.state === 'gone') continue;
        // A boat already taken is no longer a job. Her marker is worth having while she is
        // still in sight and is only clutter once she is a speck, so it goes at 150 m - the
        // markers that are left are the ones that are still asking something of the player.
        const d = Math.hypot(b.x - pose.x, b.z - pose.z);
        if (b.state === 'seized' && d > 150) continue;
        const cls2 = b.state === 'seized' ? 'taken' : b.state === 'landing' ? 'land' : b.tubs > 0 ? '' : 'empty';
        put(b.x, b.z, b.state === 'seized' ? '✓' : String(b.tubs || 0), cls2, b.hold / T.seizeSec, 2.5);
      }
      for (const c of g.crops) {
        if (c.done) continue;
        put(c.x, c.z, String(c.tubs), 'crop', c.hold / T.creepSec, 0.8);
      }
    }
    for (let i = n; i < this.pool.length; i++) this.pool[i].style.transform = 'translate(-999px,-999px)';
  }

  destroy() { this.root.remove(); }
}

// ===========================================================================================
// THE CONTROLLER - what main.js's // >>> SMUGGLE fence talks to
// ===========================================================================================
// Ways in: ?mode=smuggle, Shift+J, or THE SMUGGLING RUN in the level picker.
// Ways out: Shift+J again, LEVELS or FREE RIDE on the cards.
//
// KEY CHOICE. Shift+J, because KeyJ is the only letter in the whole project that nothing
// binds: input.js has WASD/arrows/Space, main.js B C E F G H L M P R T U V and the digits,
// hub.js K, rescue Shift+R, raid Z Q X N Shift+L and Enter. A shifted letter that main.js
// already switches on unshifted (G, T, B, ...) would have fired both handlers.
//
// MUTUAL EXCLUSION. Rescue and the raid are left before this level is entered, and frame()
// re-checks every frame: if either of them has come up underneath us (Shift+L, the picker,
// the front-door buttons, the DEFAULT START), this level stands down rather than running two
// modes into the same sim. That is a guard rather than a listener-ordering game, because
// listener order between two capture handlers on window is exactly the sort of thing that
// works until somebody moves an import.
//
// LIGHT. The subject wants weather and the project's `sunDir` is a PROTECTED value that may
// not move (tmp-tr161/CONTRACT.md §6), so it does not move. What this level does instead is
// set the EXISTING `?overcast=` uniform and trim the renderer's exposure, both saved on entry
// and restored exactly on exit, and both reached only from enter(). No shader, no renderer
// and no protected number is touched, and a ?cal= render never enters this level - which is
// why the 19 judged views come back bit-identical. See RESULT.md for the proof.
export function initSmuggle(ctx) {
  const { sim, seaGL, FIXED_DT } = ctx;
  const q = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
  const isCal = q.has('cal');
  const seed0 = q.has('seed') ? (Number(q.get('seed')) >>> 0) : undefined;
  const bot = q.get('smugglebot') === '1';
  const mount = document.querySelector('#stagewrap') || document.body;

  // Looking out to sea and a touch toward the pier, which is where they are coming from and
  // where the pier reads in frame behind them.
  const SEAWARD = Math.atan2(1, -0.25);

  const S = {
    active: false, game: null, hud: null, driver: null, actors: null, scene: new SmuggleScene(),
    audio: null, botOut: null, lastSimTick: 0, runs: 0, frameMs: 0, stats: null,
    prevHeading: sim.startHeading, prevOvercast: 0, prevExposure: 1, introT: 0,
  };

  const seedFor = (run) => ((seed0 ?? SMUGGLE.seed) + run * 7919) >>> 0;
  const hullOf = () => { const c = ctx.craft; return c && c.active ? c.hull : null; };

  function newRun() {
    if (S.driver) S.driver.clear();
    S.game = new SmuggleGame({ seed: seedFor(S.runs) });
    S.driver = new RaidDriver(S.game, ctx.craft ? (l, b, st) => ctx.craft.raidHook(l, b, st) : null);
    S.runs++;
    S.scene.reset();
    S.hud.hideOver();
    S.introT = SMUGGLE.introSec;
    S.hud.showIntro();
    S.game.events.length = 0;
  }

  function leaveOthers() {
    const R = window.efoilRaid;
    if (R && R.active && R.exit) R.exit();
    const Q = window.efoilRescue;
    if (Q && Q.active) { const b = document.querySelector('#rq-over [data-a=exit]'); if (b) b.click(); }
  }

  function enter() {
    if (S.active) return;
    leaveOthers();
    if (!S.hud) S.hud = makeHud();
    if (seaGL && !S.actors) {
      try {
        const t0 = performance.now();
        S.actors = new SmuggleActors(seaGL.gl);
        performance.measure('smuggle:actors', { start: t0, end: performance.now() });
      } catch (e) { console.warn('[smuggle] actors failed:', e.message); }
    }
    if (!S.audio) S.audio = new RaidAudio('norse');
    S.active = true;
    document.body.classList.add('smuggle');
    // DAWN, DIRTY. Saved and restored, never assumed: a player may have arrived with
    // ?overcast= of their own and it must come back exactly as it was.
    S.prevOvercast = OVERCAST.v;
    OVERCAST.v = Math.max(OVERCAST.v, 0.95);
    if (seaGL) { S.prevExposure = seaGL.exposure; seaGL.exposure = S.prevExposure * 0.80; }
    S.prevHeading = sim.startHeading;
    sim.startHeading = SEAWARD;
    ctx.setSea('fresh-sw-breeze');
    ctx.takeInput(bot ? { sample: () => (S.botOut = smugglePilot(sim, S.game)) } : null);
    ctx.restart();
    S.lastSimTick = sim.tick;
    newRun();
    if (ctx.toast) ctx.toast('the smuggling run — come alongside, do not sink them');
  }

  function exit() {
    if (!S.active) return;
    S.active = false;
    if (S.driver) S.driver.clear();
    if (ctx.craft && ctx.craft.raidHook) ctx.craft.raidHook(null, 0, 0);
    document.body.classList.remove('smuggle', 'sgcard');
    OVERCAST.v = S.prevOvercast;
    if (seaGL) seaGL.exposure = S.prevExposure;
    if (S.hud) { S.hud.hideOver(); S.hud.hideIntro(); }
    sim.startHeading = S.prevHeading;
    ctx.setSea(ctx.defaultSea);
    ctx.takeInput(null);
    ctx.restart();
  }

  function again() { ctx.restart(); S.lastSimTick = sim.tick; newRun(); }

  function makeHud() {
    return new SmuggleHud(mount, {
      onStart: () => {}, onAgain: again, onExit: exit,
      onLevels: () => { const b = document.querySelector('#btn-mode'); if (b) b.click(); },
    });
  }

  // ---- events -> HUD and sound ------------------------------------------------------------
  const vol = (x, z) => {
    const p = S.game.player;
    return clamp(1 - Math.hypot(x - p.x, z - p.z) / 240, 0.12, 1);
  };

  function consumeEvents() {
    const g = S.game, hud = S.hud, au = S.audio;
    const snd = (name, v = 1) => { if (au) au.play(name, v); };
    for (const e of g.events) {
      switch (e.type) {
        case 'tide':
          hud.banner(g, `TIDE ${e.n} OF ${e.of}`, `${e.boats} ${e.boats === 1 ? 'boat' : 'boats'} standing in`, 'tide', SMUGGLE.bannerSec);
          snd('bell', 0.8);
          break;
        case 'sighted':
          if (!hud.bannerBusy(g)) hud.banner(g, 'SHE HAS SEEN YOU', 'close her before her nerve goes', 'sow', 1.6);
          snd('tell');
          break;
        case 'seize':
          hud.banner(g, 'SEIZED!', e.tubs ? `${e.tubs} tubs and the boat · +${e.points}` : `boat impounded · +${e.points}`, 'take', 2.4);
          snd('seizure', 1); snd('cheer', 0.8);
          break;
        case 'sow':
          hud.banner(g, 'THE CROP IS SOWN', `${e.tubs} tubs on the bottom — creep for them`, 'sow', 2.4);
          snd('sowcrop', vol(e.x, e.z));
          break;
        case 'creep': snd('creepdrag', vol(e.x, e.z) * 0.9); break;
        case 'crept':
          hud.banner(g, 'CROP RECOVERED', `${e.tubs} tubs up · +${e.points}`, 'crept', 2.2);
          snd('tubup', 1); snd('cheer', 0.5);
          break;
        case 'landed':
          if (!hud.bannerBusy(g) && e.total % 4 === 0) hud.banner(g, 'CARGO ASHORE', `${e.total} of ${e.limit} — they are getting it up the beach`, 'bad', 1.8);
          snd('splash', 0.5);
          break;
        case 'bump': snd('thud', e.hard ? 0.9 : 0.4); break;
        case 'away': snd('expire', 0.5); break;
        case 'lost':
          hud.banner(g, 'THE RUN WAS LANDED', 'it is inland by now', 'bad', 3.0);
          snd('lost');
          break;
        case 'held':
          hud.banner(g, 'THE COAST IS HELD', `${e.tubs} tubs seized · bonus +${e.bonus}`, 'good', 3.0);
          snd('bosssunk'); snd('cheer', 1.2);
          break;
        case 'over': hud.showOver(e); break;
      }
    }
    g.events.length = 0;
  }

  // ---- hooks main.js calls ---------------------------------------------------------------
  S.tick = function () {
    if (sim.tick < S.lastSimTick) {
      if (globalThis.__modeCraftSwitch) globalThis.__modeCraftSwitch = false;
      else newRun();
    }
    S.lastSimTick = sim.tick;
    if (S.introT > 0) {
      S.introT -= FIXED_DT;
      if (S.introT <= 0) S.hud.hideIntro();
    }
    // FIRE and WATER are passed as FALSE, always. This level has no weapon and the driver's
    // signature is the raid's, so the two flags are given their honest value here rather than
    // wired to a control that does nothing.
    S.driver.tick(sim, hullOf(), FIXED_DT, false, false);
    if (S.game.events.length) consumeEvents();
  };

  const clip = new Float32Array(4);
  S.frame = function (cam) {
    const t0 = performance.now();
    // mutual exclusion, re-checked: another mode coming up under us ends this one
    const R = window.efoilRaid, Q = window.efoilRescue;
    if ((R && R.active) || (Q && Q.active)) { exit(); return; }
    const pose = playerPose(sim);
    let proj = null;
    const W = seaGL ? seaGL.W : 1, H = seaGL ? seaGL.H : 1;
    if (cam && seaGL && S.actors) {
      S.scene.fill(S.actors, S.game, pose, cam);
      S.actors.draw(cam, seaGL.vpM, seaGL.sunDir, seaGL.exposure, sim.time);
      S.stats = S.actors.lastStats;
      const m = seaGL.vpM;
      proj = (x, y, z) => {
        clip[0] = m[0] * x + m[4] * y + m[8] * z + m[12];
        clip[1] = m[1] * x + m[5] * y + m[9] * z + m[13];
        clip[3] = m[3] * x + m[7] * y + m[11] * z + m[15];
        const w = clip[3], iw = 1 / (Math.abs(w) < 1e-4 ? 1e-4 : Math.abs(w));
        return { x: (clip[0] * iw * 0.5 + 0.5) * W, y: (0.5 - clip[1] * iw * 0.5) * H, behind: w < 0.1 };
      };
    }
    S.hud.update(S.game, pose, proj, W, H);
    S.frameMs = performance.now() - t0;
  };

  S.enter = enter;
  S.exit = exit;
  S.again = again;

  const isField = (e) => e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA');
  addEventListener('keydown', (e) => {
    if (isField(e)) return;
    if (e.code === 'KeyJ' && e.shiftKey) { S.active ? exit() : enter(); return; }
    if (S.active && e.code === 'Enter' && S.game && S.game.phase === 'over') again();
  }, { capture: true });

  // Headless handle: advance the real sim and the rules with the scripted pilot, exactly as
  // main.js's tick() would, until `until(game)`. Same shape as raid-mode's fastForward.
  S.fastForward = (maxTicks, until) => {
    let n = 0;
    for (; n < maxTicks; n++) {
      const out = smugglePilot(sim, S.game);
      const c = ctx.craft;
      if (c && c.active) { c.step(out, FIXED_DT); c.effects(FIXED_DT); } else sim.step(out, FIXED_DT);
      S.botOut = out;
      S.driver.tick(sim, hullOf(), FIXED_DT, false, false);
      if (S.game.events.length) consumeEvents();
      if (until && until(S.game)) break;
    }
    return n;
  };

  if (!isCal && q.get('mode') === 'smuggle') enter();
  window.efoilSmuggle = S;
  return S;
}
