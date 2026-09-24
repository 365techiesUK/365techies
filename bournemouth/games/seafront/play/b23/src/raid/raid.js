// VIKING RAID - arcade naval combat rules (tr57; tr52 built the first, turn-back version).
//
// Pure logic: no DOM, no GL, no clock, no Math.random, no sea. It is advanced
// once per FIXED sim tick with the player's pose from playerPose(), the craft
// contacts (collide.js) and the FIRE control, so a run is a pure function of
// (seed, pose sequence, contacts, fire) and replays bit-for-bit. It never writes
// the physics: collide.js's RaidDriver applies what it asks for (bounce, turbo,
// stall, knock-off) and only while the raid is on.
//
// Loop: longships row for the beach in continuous swarms. FIRE auto-aims the
// craft's weapon at the nearest ship ahead; ramming hard hurts them too. A ship
// at 0 hull health lists, breaks up and sinks with a big splash; her crew are
// thrown into the water, grab wreckage and paddle back out to sea. The raiders
// throw spears and axes and loose arrows in arcs the player can dodge; sharks
// cruise, stalk, telegraph and lunge; power-ups float on the water; every third
// wave the jarl's flagship comes with escorts. A ship that lands, or losing all
// health, costs a harvest; no harvests left ends the raid.
//
// tr60 PIER SIEGE: the beach landings are replaced. Ships steer for named sections of
// Bournemouth Pier, moor alongside and send warriors up ladders with fire pots; fire
// spreads and sections collapse (siege.js, mixed in at the bottom). A wave is won when
// its ships are sunk; the pier burning down ends the raid; clearing the final wave saves it.
//
// PEOPLE IN THE WATER are in `swimmers` and are never read by any hit test:
// no shot, missile, ship, craft or shark can harm them. Sharks keep clear of them.

import { mulberry32, StateHash } from '../rng.js';
import { COAST } from '../gl/coast.js';
import { TUNING, FIELD, SIEGE_FIELD, waveSpec, landZ, clearOfGroynes, FOES, shipRow, checkFoes } from './tuning.js';
import { SiegeMethods, SECTIONS, pierAt, pierFrame, pierEdges } from './siege.js';
import { AllyMethods } from './allies.js';
import { GateMethods, GATE_FIELD, gateAt, gateRun } from './gate.js';   // tr145: the corsair level

const PHASES = ['live', 'clear', 'lost', 'over', 'won'];
const STATES = ['rowing', 'sinking', 'landed', 'gone'];
const SHARK_STATES = ['cruise', 'gather', 'stalk', 'tell', 'lunge', 'recover', 'flee', 'bait', 'gone'];
export const PICKUP_KINDS = ['rapid', 'triple', 'heavy', 'torpedo', 'turbo', 'shield', 'repair', 'x2', 'bait', 'douse', 'rebuild', 'water'];
const SIEGE_KINDS = ['douse', 'rebuild', 'water'];
// the pier head's middle: ships spawn on an arc round it
const SIEGE_CENTRE = pierAt(195, 6);
const TIMED = ['rapid', 'triple', 'heavy', 'turbo', 'shield', 'x2'];
const G = 9.81;
const TAU = Math.PI * 2;
const wrap = (a) => a - TAU * Math.round(a / TAU);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const fin = Number.isFinite;

// Longship hit footprint (same capsule the craft collide with, collide.js).
function capE(s, px, pz) {
  const sc = s.L / 16, half = Math.max(0, s.L / 2 - 1.15 * sc);
  const ax = Math.cos(s.heading), az = Math.sin(s.heading);
  const wx = px - s.x, wz = pz - s.z;
  const u = clamp(wx * ax + wz * az, -half, half);
  return { e: Math.hypot(wx - ax * u, wz - az * u), r: 1.7 * sc };
}

export class RaidGame {
  constructor(opts = {}) {
    this.T = { ...TUNING, ...(opts.tuning || {}) };
    // tr128: which faction this RUN is fighting. One run, one fleet - the two are never mixed.
    // Default 'norse', so every existing caller and every existing test is unchanged.
    this.foe = FOES[opts.foe] ? opts.foe : 'norse';
    this.F = FOES[this.foe];
    // tr145: WHICH LEVEL. 'pier' (the default, and every existing caller) is the Bournemouth
    // Pier siege; 'gate' is the corsair level at Old Harry, whose objective is a LINE the
    // raiders must not cross (raid/gate.js). It is an OPTION and not a flag read from the URL
    // so the rules stay pure and a headless suite can build either level with no environment.
    // raid-mode.js is what maps ?arena=oldharry onto it, because it already reads the URL.
    this.level = opts.level === 'gate' ? 'gate' : 'pier';
    // ⚠️ LOUD, AND EARLY. A faction missing a `crew` or `planks` row would sink a ship with
    // nobody in the water and no error at all (tuning.js). Fail at construction instead.
    const bad = checkFoes(FOES, this.T);
    if (bad.length) throw new Error(`raid faction tables are incomplete: ${bad.join('; ')}`);
    this.hash = new StateHash();
    this.events = [];
    this.newRun(opts.seed ?? this.T.seed, opts.startWave || 1);
  }

  // The per-kind ship row for THIS run's faction. Every length, health, speed, crew and plank
  // count a ship has comes through here, so adding a faction is adding a table row.
  // tr141: `fk` is the SHIP'S OWN faction key. It defaults to the run's faction, so every
  // existing call site is unchanged; an allied hull passes 'quay' and gets her own row.
  row(kind, fk) { return shipRow(fk || this.foe, kind, this.T, this.bossCount || 1); }

  newRun(seed, startWave = 1) {
    const T = this.T;
    this.seed = seed >>> 0;
    this.rng = mulberry32(this.seed);
    this.tick = 0; this.time = 0; this.score = 0; this.lives = T.lives;
    this.combo = 0; this.comboT = 0;
    this.player = { x: 0, z: 0, heading: Math.PI / 2, speed: 0, vx: 0, vz: 0, craft: 'efoil', valid: false,
      hp: T.playerHp, maxHp: T.playerHp, downT: 0, stallT: 0, invulnT: 0, reloadT: 0, torpT: 0, kick: 0 };
    this.fx = { rapid: 0, triple: 0, heavy: 0, turbo: 0, shield: 0, x2: 0 };
    this.torpedoes = 0;
    this.ships = []; this.shots = []; this.missiles = []; this.swimmers = []; this.wreck = [];
    this.sharks = []; this.pickups = []; this.baits = [];
    this.nextId = 0;
    this.stats = { sunk: 0, jarlsSunk: 0, bossesSunk: 0, sharksScared: 0, shotsFired: 0, shotsHit: 0, rams: 0,
      damageTaken: 0, landings: 0, wavesCleared: 0, bestCombo: 0, swamped: 0,
      moorings: 0, fireStarts: 0, sectionsLost: 0, firesOut: 0, potsDoused: 0, knockedOff: 0, doused: 0, waterUsed: 0, packets: 0, rebuilt: 0, barrages: 0, sunkMoored: 0,
      volleys: 0, roundsLanded: 0,               // tr136: the pirate broadside
      through: 0,                                // tr145: corsairs past the gate
      allyVolleys: 0, allyHits: 0, allyKills: 0, alliesSunk: 0, foeHitsOnAlly: 0 };   // tr141
    // Which along-shore band sharks and power-ups may be placed in. SIEGE_FIELD is a
    // Bournemouth band; at Old Harry it would have put every shark and every pickup 8.6 km away
    // at the pier, because _spawnPoint clamps into it.
    this.field = this.level === 'gate' ? GATE_FIELD : SIEGE_FIELD;
    this.bossCount = 0; this.boss = null;
    this.pickupT = 4; this.sharkT = 0;
    this.firstWave = startWave;
    this.finalWave = Math.max(T.finalWave, startWave);
    this.outcome = null; this.waveLost0 = 0;
    this._initSiege();
    this._initAllies();
    this._initGate();
    this.lastHit = null; this.lastHurt = null;
    this.hash.reset();
    this.events.length = 0;
    this._startWave(startWave);
  }

  get comboMult() { const T = this.T; return this.combo < 1 ? 1 : Math.min(T.comboMax, 1 + T.comboStep * (this.combo - 1)); }
  get multiplier() { return this.comboMult * (this.fx.x2 > 0 ? 2 : 1); }
  get weapon() { return this.T.weapons[this.player.craft] || this.T.weapons.efoil; }
  get playing() { return this.phase === 'live' || this.phase === 'clear'; }

  // Ships still to deal with this wave (to spawn, or rowing in).
  get incoming() {
    let n = Math.max(0, this.spec.quota - this.spawned);
    for (const s of this.ships) if (!s.ally && s.wave === this.wave && (s.state === 'rowing' || s.moored && s.state === 'landed')) n++;
    return n;
  }

  _emit(type, data) { this.events.push({ type, tick: this.tick, ...data }); }
  _id() { return this.nextId++; }

  // ---- driver hooks (collide.js applies these; nothing here touches physics) ----
  solid(s) { return s.state === 'rowing' || s.state === 'landed'; }
  boatBoost() { return this.fx.turbo > 0 ? this.T.turboBoat : 0; }
  boatStall() { return this.player.stallT > 0 ? 1 : 0; }
  efoilHold() { return this.player.downT > 0; }
  efoilExtraSpeed() { return this.fx.turbo > 0 && this.player.downT <= 0 ? this.T.turboEfoil * Math.min(1, this.fx.turbo) : 0; }
  takeKick() { const k = this.player.kick; this.player.kick = 0; return k; }

  // ---- waves ------------------------------------------------------------------
  _startWave(n) {
    const spec = waveSpec(n);
    this.wave = n; this.spec = spec;
    this.phase = 'live'; this.phaseT = 0; this.waveT = 0; this.waveLandings = 0; this.waveLost0 = this.stats.sectionsLost;
    this.spawned = 0; this.spawnT = spec.gap;
    this.ships = this.ships.filter((s) => s.state === 'sinking' || s.state === 'rowing' || (s.moored && s.state === 'landed'));
    if (spec.boss) this._spawnBoss();
    for (let i = 0; i < spec.openers; i++) this._spawnShip(true);
    this._emit('wave', { n, quota: spec.quota, boss: spec.boss, sharks: spec.sharks, sea: spec.sea });
  }

  _spawnPoint(rMin, rMax, minRun, arc = 1.9) {
    const p = this.player, rng = this.rng;
    for (let k = 0; k < 20; k++) {
      const a = Math.PI / 2 + (rng() * 2 - 1) * arc;
      const r = rMin + rng() * (rMax - rMin);
      const x = p.x + Math.cos(a) * r, z = p.z + Math.sin(a) * r, cx = x + COAST.startX;
      if (cx < this.field.coastXMin || cx > this.field.coastXMax) continue;
      if (this._onPier(x, z, 12)) continue;
      if (z < landZ(x) + minRun) continue;
      return { x, z };
    }
    const x = clamp(p.x + COAST.startX, this.field.coastXMin, this.field.coastXMax) - COAST.startX;
    return { x, z: Math.max(p.z + rMin, landZ(x) + minRun + 40) };
  }

  _onPier(x, z, m = 0) {
    const p = pierFrame(x, z), e = pierEdges(clamp(p.s, 0, SECTIONS[6].s1));
    return !!e && p.s > -m && p.s < SECTIONS[6].s1 + m && p.o > e[0] - m && p.o < e[1] + m;
  }

  // cx = null: a siege ship that picks a berth on the pier; a number: the legacy beach
  // target (tests place still ships this way).
  // tr141: `fk` names the ship's faction row. null/omitted = the run's own foe faction, so
  // every existing caller is byte-identical. FOES[fk].allied is what makes her an ALLY, and
  // s.ally is the boolean every hit test reads from here on.
  _makeShip(kind, x, z, cx = null, fk = null) {
    const spec = this.spec, rng = this.rng;
    const tcx = clearOfGroynes(clamp(cx ?? 500, FIELD.coastXMin, FIELD.coastXMax));
    const tx = tcx - COAST.startX, tz = landZ(tx);
    const R = this.row(kind, fk);                   // tr128: faction table, Norse = the tuning constants
    const L = R.L, hp = R.hp, cruise = spec.speed * R.speedFactor;
    const s = {
      id: this._id(), wave: this.wave, kind, L, hp, maxHp: hp, x, z, tx, tz,
      heading: Math.atan2(tz - z, tx - x), speed: cruise * 0.9, cruise,
      zig: kind === 'ship' && rng() < spec.zigFrac, zigPhase: rng() * TAU,
      state: 'rowing', stateT: 0, spin: 0, kvx: 0, kvz: 0, bumpCool: 0, hitT: -9,
      atkT: 1.2 + rng() * 2.0, ttb: 0, sinkSide: rng() < 0.5 ? -1 : 1, baitAcc: 0, escort: -1,
      slot: -1, sec: -1, wp: 0, gliding: false, moored: false, ladders: null, pierT: 1.5 + rng() * 2.5, retryT: 0, hold: false, siege: cx === null,
      fk: fk || this.foe, ally: !!(FOES[fk] && FOES[fk].allied),
      // tr145: `gate` is "this hull is running for the line"; `through` is "she made it", and
      // she keeps her hull for awayT seconds afterwards so she sails on out instead of winking
      // out of the frame. Both are false in a pier raid and nothing reads them there.
      gate: false, through: false, awayT: 0, lane: undefined, laneT: 0,
    };
    if (s.ally) s.siege = false;                    // an ally never berths at the pier she came to save
    if (this.level === 'gate') { s.gate = s.siege && !s.ally; s.siege = false; }
    s.ttb = Math.hypot(tx - x, tz - z) / cruise;
    if (s.siege) { this._pickSlot(s); this._siegeSteer(s, 0); s.heading = Math.atan2(s.tz - s.z, s.tx - s.x); }
    this.ships.push(s);
    this._emit('spawn', { ship: s.id, kind });
    return s;
  }

  // On an arc round the pier head, seaward: openers close in on the player's side.
  _siegePoint(aMin, aMax, rMin, rMax) {
    const rng = this.rng, P = this.player, [hx, hz] = SIEGE_CENTRE;
    let x = hx, z = hz + rMax;
    for (let k = 0; k < 24; k++) {
      const a = aMin + rng() * (aMax - aMin), r = rMin + rng() * (rMax - rMin);
      x = hx + Math.cos(a) * r; z = hz + Math.sin(a) * r;
      const cx = x + COAST.startX;
      if (cx < this.field.coastXMin || cx > this.field.coastXMax || z < landZ(x) + 90 || this._onPier(x, z, 20)) continue;
      if (P.valid && Math.hypot(x - P.x, z - P.z) < 40) continue;
      break;
    }
    return { x, z };
  }

  _spawnShip(opener = false) {
    const spec = this.spec;
    const G = this.T.gate;
    const at = this.level === 'gate'
      ? (opener ? this._gatePoint(G.spawnR[0] * 0.62, G.spawnR[1] * 0.62, G.spawnOff[0], G.spawnOff[1])
        : this._gatePoint(G.spawnR[0], G.spawnR[1], G.spawnOff[0], G.spawnOff[1]))
      : (opener ? this._siegePoint(0.2, 1.75, 125, 205) : this._siegePoint(0.15, Math.PI - 0.15, spec.spawnR[0], spec.spawnR[1]));
    this.spawned++;
    const kind = spec.jarlEvery && this.spawned % spec.jarlEvery === 0 ? 'jarl' : 'ship';
    return this._makeShip(kind, at.x, at.z, null);
  }

  _spawnBoss() {
    this.bossCount++;
    const G = this.T.gate;
    const at = this.level === 'gate' ? this._gatePoint(G.spawnR[1], G.spawnR[1] + 90, 60, 300)
      : this._siegePoint(1.2, 1.95, 250, 290);
    const b = this._makeShip('boss', at.x, at.z, null);
    this.boss = b;
    const ch = Math.cos(b.heading), sh = Math.sin(b.heading);
    const slots = [[-8, 26], [-8, -26], [-30, 14], [-30, -14], [-50, 0], [16, 34]];
    for (let i = 0; i < this.spec.escorts; i++) {
      const [u, v] = slots[i % slots.length];
      const e = this._makeShip('ship', b.x + ch * u - sh * v, b.z + sh * u + ch * v, null);
      e.cruise = b.cruise * 1.05; e.escort = b.id;
    }
    this._emit('boss', { ship: b.id, hp: b.hp, n: this.bossCount });
  }

  // ---- the tick -------------------------------------------------------------------
  update(pose, dt, contacts = null, fire = false, water = false) {
    this.tick++;
    this.time += dt;
    const T = this.T, P = this.player;
    const valid = !!pose && fin(pose.x) && fin(pose.z) && fin(pose.speed) && fin(pose.heading);
    P.valid = valid;
    if (valid) {
      P.x = pose.x; P.z = pose.z; P.heading = pose.heading; P.speed = pose.speed;
      P.vx = Math.cos(pose.heading) * pose.speed; P.vz = Math.sin(pose.heading) * pose.speed;
      P.craft = pose.craft || 'efoil';
    }
    for (const k of ['downT', 'stallT', 'invulnT', 'reloadT', 'torpT']) if (P[k] > 0) P[k] -= dt;
    for (const k of TIMED) {
      if (this.fx[k] > 0) { this.fx[k] -= dt; if (this.fx[k] <= 0) { this.fx[k] = 0; this._emit('expire', { kind: k }); } }
    }
    if (this.comboT > 0) { this.comboT -= dt; if (this.comboT <= 0) { this.comboT = 0; if (this.combo >= 2) this._emit('comboEnd', { n: this.combo }); this.combo = 0; } }

    switch (this.phase) {
      case 'live': {
        this.waveT += dt;
        const sp = this.spec;
        let live = 0;
        for (const s of this.ships) if (s.state === 'rowing' && s.escort < 0 && s.kind !== 'boss') live++;
        this.spawnT -= dt;
        if (this.spawned < sp.quota && live < sp.maxLive && this.spawnT <= 0) {
          this._spawnShip();
          this.spawnT = sp.gap * (0.8 + this.rng() * 0.4);
        }
        break;
      }
      case 'clear':
        this.phaseT += dt;
        if (this.phaseT >= T.clearSec) this._startWave(this.wave + 1);
        break;
      case 'lost': case 'won':
        this.phaseT += dt;
        if (this.phaseT >= T.lostSec) { this.phase = 'over'; this._emit('over', this.summary()); }
        break;
      default: break;
    }
    const playing = this.playing && valid;

    if (playing || this.phase === 'live') this._alliesTick(dt);
    for (const s of this.ships) this._moveShip(s, dt);
    if (this.level === 'gate') this._gateTick(dt);       // tr145: who is past the line
    if (playing && contacts) for (const c of contacts) this._contact(c);
    if (playing) this._fire(fire);
    this._moveShots(dt);
    if (playing) this._attacks(dt);
    this._moveMissiles(dt, playing);
    if (playing) this._pierAttacks(dt);
    this._movePierShots(dt);
    this._waterTick(dt, water, playing);
    this._fireTick(dt);
    this._pickups(dt, playing);
    this._sharks(dt, playing);
    this._swimmers(dt);
    if (this.phase === 'live') this._checkWave();

    this.ships = this.ships.filter((s) => s.state !== 'gone');
    this.shots = this.shots.filter((q) => !q.dead);
    this.missiles = this.missiles.filter((q) => !q.dead);
    this.sharks = this.sharks.filter((q) => q.state !== 'gone');
    this.swimmers = this.swimmers.filter((q) => !q.dead);
    this.wreck = this.wreck.filter((q) => !q.dead);
    this.pickups = this.pickups.filter((q) => !q.dead);
    this.baits = this.baits.filter((q) => q.t > 0);
    this.pierShots = this.pierShots.filter((q) => !q.dead);
    if (this.boss && this.boss.state !== 'rowing') this.boss = null;

    const h = this.hash;
    h.int(PHASES.indexOf(this.phase)); h.int(this.wave); h.int(this.score); h.int(this.lives); h.int(Math.round(P.hp * 100)); h.int(this.combo);
    for (const s of this.ships) { h.int(s.id); h.int(STATES.indexOf(s.state)); h.int(Math.round(s.hp * 100)); h.num(s.x, 1000); h.num(s.z, 1000); }
    for (const k of this.sharks) { h.int(k.id); h.int(SHARK_STATES.indexOf(k.state)); h.num(k.x, 1000); h.num(k.z, 1000); }
    h.int(this.shots.length); h.int(this.missiles.length); h.int(this.swimmers.length); h.int(this.pickups.length);
    for (const q of this.pier.sections) { h.int(Math.round(q.hp * 100)); h.int(Math.round(q.fire * 1000)); h.int(q.collapsed ? 1 : 0); }
    h.int(this.pierShots.length); h.int(this.water.length); h.int(Math.round(this.tank * 100));
  }

  // ---- longships ----------------------------------------------------------------
  _moveShip(s, dt) {
    const T = this.T;
    if (s.state === 'gone') return;
    s.stateT += dt;
    if (s.bumpCool > 0) s.bumpCool -= dt;
    if (s.kvx || s.kvz) {
      const k = Math.exp(-2.5 * dt);
      s.x += s.kvx * dt; s.z += s.kvz * dt; s.kvx *= k; s.kvz *= k;
      if (Math.abs(s.kvx) + Math.abs(s.kvz) < 0.01) { s.kvx = 0; s.kvz = 0; }
    }
    if (s.spin) { s.heading = wrap(s.heading + s.spin * dt); s.spin *= Math.exp(-1.1 * dt); if (Math.abs(s.spin) < 0.05) s.spin = 0; }
    if (s.state === 'landed') {
      if (s.moored) {                                // tied up: rams shove her, the lines pull her back
        s.x += (s.mx - s.x) * Math.min(1, 1.5 * dt); s.z += (s.mz - s.z) * Math.min(1, 1.5 * dt);
        return;
      }
      if (s.stateT > T.landedStay) s.state = 'gone';
      return;
    }
    if (s.state === 'sinking') {
      s.speed *= Math.exp(-1.2 * dt);
      s.x += Math.cos(s.heading) * s.speed * dt; s.z += Math.sin(s.heading) * s.speed * dt;
      if (s.stateT >= T.sinkSec) s.state = 'gone';
      return;
    }
    // rowing
    if (s.ally) this._allySteer(s, dt);             // tr141: the ally's plan, in the same s.tx/s.tz
    else if (s.gate) this._gateSteer(s, dt);        // tr145: ...and the corsair's, at the line
    else if (s.siege && this._siegeSteer(s, dt)) { this._pierPush(s); return; }
    let want = Math.atan2(s.tz - s.z, s.tx - s.x);
    const lz = landZ(s.x);
    if (s.zig) want += this.spec.zigAngle * clamp((Math.hypot(s.tx - s.x, s.tz - s.z) - 40) / 90, 0, 1) * Math.sin(TAU * s.stateT / this.spec.zigPeriod + s.zigPhase);
    if (Math.abs(s.spin) < 0.6) {
      const e = wrap(want - s.heading), r = T.shipTurnRate * dt;
      s.heading = wrap(s.heading + clamp(e, -r, r));
    }
    s.speed += clamp((s.hold ? s.cruise * 0.15 : s.cruise) - s.speed, -1.2 * dt, 0.8 * dt);
    s.x += Math.cos(s.heading) * s.speed * dt;
    s.z += Math.sin(s.heading) * s.speed * dt;
    if (!s.siege && !s.ally && !s.gate) s.ttb = Math.hypot(s.tx - s.x, s.tz - s.z) / s.cruise;
    if (this.level === 'gate') this._arenaPush(s);  // tr145: the chalk, from the same survey
    else if (s.siege || s.ally) this._pierPush(s);  // an ally is kept off the structure too
    if (s.z <= lz + 6) { s.z = lz + 6; s.speed *= 0.5; }            // no landings any more: she grounds and backs off
  }

  _land(s) {
    s.state = 'landed'; s.stateT = 0; s.ttb = 0; s.speed = 0;
    s.z = landZ(s.x);
    if (!this.playing) return;
    const cost = s.kind === 'boss' ? 2 : 1;
    this.lives = Math.max(0, this.lives - cost);
    this.stats.landings++; this.waveLandings++;
    this.combo = 0; this.comboT = 0;
    this._emit('landed', { ship: s.id, kind: s.kind, lives: this.lives, cost, coastX: Math.round(s.x + COAST.startX) });
    this._checkLost();
  }

  _checkLost() {
    if (this.T.lives > 0 && this.lives <= 0 && this.playing) { this.phase = 'lost'; this.phaseT = 0; }   // tr60: no harvests (lives 0) - only the pier ends the raid
  }

  // ⚠️ tr141: the ally clause is LOAD-BEARING. An allied hull is in this.ships and is 'rowing'
  // for the whole run, so without it the wave never clears and the raid can never be won.
  _checkWave() {
    if (this.spawned < this.spec.quota) return;
    // ⚠️ tr145: `!s.through` is load-bearing in the same way the ally clause is. A corsair past
    // the line is still a rowing hull for awayT seconds while she runs out of the frame; without
    // this the wave would not clear until she had gone, which reads as the game hanging.
    for (const s of this.ships) if (!s.ally && !s.through && s.wave === this.wave && (s.state === 'rowing' || (s.moored && s.state === 'landed'))) return;
    const lost = this.stats.sectionsLost - this.waveLost0;
    const clean = lost === 0;
    const bonus = clean ? this.T.clearBonus * this.wave : 0;
    this.score += bonus;
    this.stats.wavesCleared++;
    const standing = SECTIONS.length - this.collapsedCount;
    if (this.wave >= this.finalWave) {
      // tr145: the gate level is won by holding the line, so what is paid for is the corsairs
      // who never got through - the same shape as the pier's sections left standing.
      const held = this.level === 'gate' ? this.gateLeft : standing;
      const saved = held * this.T.sectionSavedScore;
      this.score += saved;
      this.outcome = 'saved'; this.phase = 'won'; this.phaseT = 0;
      this._emit('clear', { n: this.wave, clean, bonus, landings: lost, lost, final: true });
      if (this.level === 'gate') this._emit('gateHeld', { left: this.gateLeft, through: this.gate.through, points: saved });
      else this._emit('pierSaved', { standing, points: saved, pier: Math.round(100 * this.pierFrac) });
      return;
    }
    this.phase = 'clear'; this.phaseT = 0;
    this._emit('clear', { n: this.wave, clean, bonus, landings: lost, lost, pier: Math.round(100 * this.pierFrac) });
  }

  // A craft touched ship c.id (normal nx,nz from the ship to the craft). Every
  // contact shoves her; a hard one also spins her off course and holes her.
  _contact(c) {
    const s = this.ships.find((q) => q.id === c.id);
    if (!s || !this.solid(s)) return;
    const T = this.T, m = s.kind === 'boss' ? 0.15 : s.kind === 'jarl' ? 0.5 : 1;
    s.kvx -= c.nx * Math.min(3, c.speed * 0.3) * m;
    s.kvz -= c.nz * Math.min(3, c.speed * 0.3) * m;
    const hard = c.speed >= T.knockSpeed && (c.craftSpeed ?? c.speed) >= T.knockCraftSpeed;
    if (s.bumpCool > 0) return;
    s.bumpCool = 0.5;
    this._emit('bump', { ship: s.id, hard, speed: +c.speed.toFixed(2), x: +c.x.toFixed(2), z: +c.z.toFixed(2) });
    // tr141 FRIENDLY FIRE IS OFF. An ally shoves like any hull - she is solid - but ramming her
    // costs her nothing and scores nothing. Otherwise the fastest way to a high score would be
    // to spend the raid ramming your own side.
    if (s.ally) return;
    if (!hard || !(s.state === 'rowing' || s.moored && s.state === 'landed')) return;
    const side = (c.x - s.x) * -Math.sin(s.heading) + (c.z - s.z) * Math.cos(s.heading);
    s.spin = (side > 0 ? -1 : 1) * T.knockSpin * m;
    this.stats.rams++;
    this._score(T.ramScore, false);
    this._damage(s, T.ramDamage, 'ram', c.x, 1.0, c.z);
  }

  _score(base, comboUp) {
    const T = this.T;
    if (comboUp) {
      this.combo++; this.comboT = T.comboWindow;
      if (this.combo > this.stats.bestCombo) this.stats.bestCombo = this.combo;
      if (this.combo >= 2) this._emit('combo', { n: this.combo, mult: this.comboMult });
    } else if (this.combo > 0) this.comboT = Math.max(this.comboT, T.comboWindow * 0.5);
    const pts = Math.round(base * this.multiplier);
    this.score += pts;
    return pts;
  }

  // tr141: `credit` is false when the PLAYER did not cause this - a corsair round into an ally,
  // or an allied round into a corsair. The damage, the sink and the crew in the water are all
  // identical; only the scoring and the combo are the player's, and only when she earned them.
  _damage(s, dmg, how, x, y, z, credit = true) {
    if (!(s.state === 'rowing' || (s.moored && s.state === 'landed')) || !this.playing) return false;
    s.hp -= dmg; s.hitT = this.time;
    const pts = credit ? this._score(this.T.hitScore, false) : 0;
    if (credit) this.lastHit = { ship: s.id, tick: this.tick };
    this._emit('hit', { ship: s.id, kind: s.kind, how, dmg, hp: Math.max(0, +s.hp.toFixed(1)), maxHp: s.maxHp, points: pts, x: +x.toFixed(2), y: +y.toFixed(2), z: +z.toFixed(2), ally: !!s.ally, credit });
    if (s.hp <= 0) this._sink(s, how, credit);
    return true;
  }

  _sink(s, how, credit = true) {
    const T = this.T, rng = this.rng;
    const wasMoored = s.moored;
    this._releaseSlot(s);
    s.state = 'sinking'; s.stateT = 0; s.hp = 0; s.ttb = Infinity; s.moored = false; s.gliding = false;
    // ⚠️ tr141. AN ALLY GOES DOWN THROUGH THIS FUNCTION, not through one of her own, and that is
    // the point: the crew loop at the bottom is the ONLY place a swimmer is ever created, so an
    // allied crew is an ordinary swimmer and every swimmer rule reaches them without a line of
    // new code. What differs is bookkeeping - she is not a kill, she scores nothing, and she
    // does not count towards the wave.
    if (s.ally) {
      this.stats.alliesSunk++;
      if (this.allyFleet) this.allyFleet.sunk++;
      this._emit('allySunk', { ship: s.id, kind: s.kind, how, x: +s.x.toFixed(2), z: +s.z.toFixed(2), left: this._allyLive() - 1 });
      this._sinkDebris(s, rng);
      return;
    }
    this.stats.sunk++;
    if (wasMoored) this.stats.sunkMoored++;
    if (!credit) {
      // sunk by an ALLY, not by the player: she is gone and her crew are in the water, but the
      // score, the combo and the kill banner all belong to whoever actually did it
      this.stats.allyKills++;
      if (this.allyFleet) this.allyFleet.kills++;
      this._emit('allyKill', { ship: s.id, kind: s.kind, how, x: +s.x.toFixed(2), z: +s.z.toFixed(2) });
      this._sinkDebris(s, rng);
      return;
    }
    let base = T.sinkScore;
    if (s.kind === 'jarl') { base = T.jarlScore; this.stats.jarlsSunk++; }
    if (s.kind === 'boss') { base = T.bossScore + T.bossScorePer * (this.bossCount - 1); this.stats.bossesSunk++; }
    const pts = this._score(Math.round(base * (1 + 0.1 * (this.wave - 1))), true);
    this._emit('sink', { ship: s.id, kind: s.kind, how, points: pts, combo: this.combo, mult: this.multiplier, x: +s.x.toFixed(2), z: +s.z.toFixed(2) });
    if (s.kind === 'boss') this._emit('bossSunk', { ship: s.id, points: pts, n: this.bossCount });
    this._sinkDebris(s, rng);
  }

  // The crew and the wreckage of a hull that has gone down - ANY hull, corsair or ally. Split
  // out of _sink in tr141 so that there is exactly ONE place in the game where a swimmer is
  // created, and so that an allied crew cannot be given a path of its own by accident.
  _sinkDebris(s, rng) {
    const ch = Math.cos(s.heading), sh = Math.sin(s.heading), sc = s.L / 16;
    const T = this.T;
    // tr128: the crew and plank counts come from the FACTION row, not from a bare kind lookup.
    // They are validated at construction (checkFoes), so neither can be undefined here.
    const R = this.row(s.kind, s.fk);
    for (let i = 0; i < R.crew; i++) {
      const u = (rng() - 0.5) * s.L * 0.7, side = rng() < 0.5 ? -1 : 1, v = side * 1.5 * sc;
      const out = 2.0 + rng() * 1.5, a = s.heading + side * Math.PI / 2 + (rng() - 0.5) * 1.2;
      this.swimmers.push({ id: this._id(), ship: s.id, x: s.x + ch * u - sh * v, z: s.z + sh * u + ch * v,
        vx: Math.cos(a) * out, vz: Math.sin(a) * out, age: 0, state: 'thrown', stateT: 0, phase: rng() * TAU,
        plank: -1, pu: 0, pv: 0, panicT: 0, wait: 1.2 + rng() * 1.4, grabT: 4 + rng() * 4, dead: false });
    }
    for (let i = 0; i < R.planks; i++) {
      const u = (rng() - 0.5) * s.L * 0.8, v = (rng() - 0.5) * 3 * sc, a = rng() * TAU;
      this.wreck.push({ id: this._id(), x: s.x + ch * u - sh * v, z: s.z + sh * u + ch * v, yaw: rng() * TAU,
        vx: Math.cos(a) * (0.6 + rng()), vz: Math.sin(a) * (0.6 + rng()), age: 0, size: 0.7 + rng() * 0.6, dead: false });
    }
    // sharks nearby come to circle the wreck (never the swimmers - see _sharks)
    for (const k of this.sharks) {
      if (k.state === 'cruise' || k.state === 'stalk' || k.state === 'gather') {
        if (Math.hypot(k.x - s.x, k.z - s.z) < T.shark.gatherR) {
          k.state = 'gather'; k.stateT = 0; k.cx = s.x; k.cz = s.z; k.cr = 14 + rng() * 8; k.gatherT = 14;
        }
      }
    }
  }

  // ---- player weapons ------------------------------------------------------------
  _fire(fire) {
    const T = this.T, P = this.player;
    if (!fire || P.downT > 0) return;
    const W = this.weapon;
    if (P.reloadT <= 1e-6) {
      const tgt = this._aim(W);
      const n = this.fx.triple > 0 ? 3 : 1;
      for (let i = 0; i < n; i++) this._launch(W, tgt, (i - (n - 1) / 2) * T.tripleSpread, W.kind);
      P.reloadT = W.reload * (this.fx.rapid > 0 ? T.rapidFactor : 1);
      this.stats.shotsFired += n;
      this._emit('fire', { kind: W.kind, n, heavy: this.fx.heavy > 0, target: tgt ? tgt.id : -1, x: +P.x.toFixed(2), z: +P.z.toFixed(2), heading: +P.heading.toFixed(3) });
    }
    if (this.torpedoes > 0 && P.torpT <= 1e-6) {
      this._launch(T.torpedo, this._aim({ ...W, range: T.torpedo.range }), 0, 'torpedo');
      this.torpedoes--; P.torpT = T.torpedo.every;
      this._emit('fire', { kind: 'torpedo', n: 1, left: this.torpedoes, x: +P.x.toFixed(2), z: +P.z.toFixed(2), heading: +P.heading.toFixed(3) });
    }
  }

  // Auto-aim: the nearest rowing longship inside the weapon's forward cone and
  // range; else the nearest surfaced shark in the cone; else straight ahead.
  // tr141: `s.ally` here is the no-friendly-fire guarantee at the auto-aim. The player's weapon
  // will not lock onto her own side at all, so she cannot fire on one by accident and cannot
  // farm one on purpose.
  _aim(W) {
    const P = this.player;
    let best = null, bd = Infinity;
    for (const s of this.ships) {
      if (s.ally) continue;
      if (s.state !== 'rowing' && !(s.moored && s.state === 'landed')) continue;
      const dx = s.x - P.x, dz = s.z - P.z, d = Math.hypot(dx, dz);
      if (d > W.range + s.L / 2 || d >= bd) continue;
      if (Math.abs(wrap(Math.atan2(dz, dx) - P.heading)) > W.cone + Math.atan2(s.L / 3, Math.max(1, d))) continue;
      best = s; bd = d;
    }
    if (best) return best;
    for (const k of this.sharks) {
      if (!this._sharkUp(k)) continue;
      const dx = k.x - P.x, dz = k.z - P.z, d = Math.hypot(dx, dz);
      if (d > Math.min(70, W.range) || d >= bd) continue;
      if (Math.abs(wrap(Math.atan2(dz, dx) - P.heading)) > W.cone) continue;
      best = k; bd = d;
    }
    return best;
  }

  _launch(W, tgt, spread, kind) {
    const T = this.T, P = this.player;
    const hx = Math.cos(P.heading), hz = Math.sin(P.heading);
    const muzzle = W.muzzle ?? 2, y0 = kind === 'torpedo' ? -0.2 : (W.y0 ?? 1.2);
    const x0 = P.x + hx * muzzle, z0 = P.z + hz * muzzle;
    let a = P.heading, t = W.range / W.speed;
    if (tgt) {
      const tvx = Math.cos(tgt.heading) * tgt.speed + (tgt.kvx || 0), tvz = Math.sin(tgt.heading) * tgt.speed + (tgt.kvz || 0);
      let tx = tgt.x, tz = tgt.z;
      for (let k = 0; k < 3; k++) { t = Math.max(0.05, Math.hypot(tx - x0, tz - z0) / W.speed); tx = tgt.x + tvx * t; tz = tgt.z + tvz * t; }
      a = Math.atan2(tz - z0, tx - x0);
    }
    a += spread;
    const aimY = tgt ? 1.2 : 0;
    const vy = kind === 'ball' ? (aimY - y0) / t + 0.5 * G * t : kind === 'torpedo' ? 0 : (tgt ? (aimY - y0) / t : -0.15);
    const heavy = this.fx.heavy > 0 && kind !== 'torpedo';
    this.shots.push({
      id: this._id(), kind, x: x0, y: y0, z: z0, vx: Math.cos(a) * W.speed, vy, vz: Math.sin(a) * W.speed, age: 0,
      life: (tgt ? t * 1.25 + 0.25 : t), dmg: W.dmg * (heavy ? T.heavyFactor : 1), splash: W.splash * (heavy ? T.heavyFactor : 1),
      heavy, homing: kind === 'torpedo' ? 0.8 : (W.homing || 0), target: tgt ? tgt.id : -1, dead: false,
    });
  }

  _moveShots(dt) {
    for (const q of this.shots) {
      q.age += dt;
      if (q.homing > 0 && q.target >= 0) {
        const s = this.ships.find((v) => v.id === q.target && (v.state === 'rowing' || v.moored && v.state === 'landed')) || this.sharks.find((v) => v.id === q.target && this._sharkUp(v));
        if (s) {
          const sp = Math.hypot(q.vx, q.vz), cur = Math.atan2(q.vz, q.vx);
          const e = wrap(Math.atan2(s.z - q.z, s.x - q.x) - cur), r = q.homing * dt;
          const na = cur + clamp(e, -r, r);
          q.vx = Math.cos(na) * sp; q.vz = Math.sin(na) * sp;
          if (q.kind !== 'ball' && q.kind !== 'torpedo') q.vy += clamp((1.2 - q.y) * 3 - q.vy, -8 * dt, 8 * dt);
        }
      }
      if (q.kind === 'ball') q.vy -= G * dt;
      q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt;
      let hit = null;
      for (const s of this.ships) {
        if (s.ally) continue;                        // tr141: the player's rounds pass through her own side
        if (s.state !== 'rowing' && !(s.moored && s.state === 'landed')) continue;
        if (Math.abs(s.x - q.x) > s.L / 2 + 4 || Math.abs(s.z - q.z) > s.L / 2 + 4) continue;
        if (q.y > 8 * s.L / 16) continue;
        const c = capE(s, q.x, q.z);
        if (c.e <= c.r + 0.6) { hit = s; break; }
      }
      if (hit) { this._explode(q, hit); q.dead = true; continue; }
      if (q.y < 2.2) {
        for (const k of this.sharks) {
          if (!this._sharkUp(k)) continue;
          if (Math.hypot(k.x - q.x, k.z - q.z) <= 2.2) { this._scareShark(k, q); q.dead = true; break; }
        }
        if (q.dead) continue;
      }
      if ((q.kind !== 'torpedo' && q.y < -0.3) || q.age > q.life) {
        q.dead = true;
        this._emit('splash', { size: q.heavy ? 2 : 1, kind: q.kind, x: +q.x.toFixed(2), z: +q.z.toFixed(2) });
      }
    }
  }

  _explode(q, s) {
    this.stats.shotsHit++;
    this._emit('boom', { kind: q.kind, heavy: q.heavy, ship: s.id, x: +q.x.toFixed(2), y: +Math.max(0.5, q.y).toFixed(2), z: +q.z.toFixed(2) });
    this._damage(s, q.dmg, q.kind, q.x, q.y, q.z);
    for (const o of this.ships) {
      if (o === s || o.ally) continue;               // tr141: splash does not reach an ally either
      if (o.state !== 'rowing' && !(o.moored && o.state === 'landed')) continue;
      const c = capE(o, q.x, q.z);
      if (c.e <= c.r + q.splash) this._damage(o, q.dmg * 0.5, 'splash', q.x, q.y, q.z);
    }
  }

  // ---- the raiders fight back -------------------------------------------------------
  _attacks(dt) {
    const T = this.T, P = this.player, spec = this.spec, rng = this.rng;
    for (const s of this.ships) {
      if (s.ally) continue;                          // tr141: an ally never throws anything at the player
      if (s.state !== 'rowing' && !(s.moored && s.state === 'landed')) continue;
      s.atkT -= dt;
      if (s.atkT > 0) continue;
      const d = Math.hypot(P.x - s.x, P.z - s.z);
      const far = T.attackRange[1] * (s.kind === 'boss' ? 1.4 : 1);
      if (d < T.attackRange[0] || d > far) { s.atkT = 0.4; continue; }
      if (s.kind === 'boss') {
        for (let i = -2; i <= 2; i++) this._throw(s, 'arrow', i * 3.2);
        if (rng() < 0.5) this._throw(s, 'axe', 0);
        s.atkT = 2.4 * spec.attackMul;
      } else {
        const kind = s.kind === 'jarl' ? (rng() < 0.6 ? 'axe' : 'spear') : spec.throwMix[Math.floor(rng() * spec.throwMix.length)];
        this._throw(s, kind, 0);
        if (kind === 'arrow' && rng() < 0.5) this._throw(s, 'arrow', (rng() - 0.5) * 6);
        s.atkT = (T.attackReload[0] + rng() * (T.attackReload[1] - T.attackReload[0])) * spec.attackMul;
      }
    }
  }

  _throw(s, kind, off) {
    const T = this.T, P = this.player, M = T.missiles[kind], rng = this.rng;
    const sc = s.L / 16, side = ((P.x - s.x) * -Math.sin(s.heading) + (P.z - s.z) * Math.cos(s.heading)) >= 0 ? 1 : -1;
    const u = (rng() - 0.5) * s.L * 0.5;
    const x0 = s.x + Math.cos(s.heading) * u - Math.sin(s.heading) * side * 1.6 * sc;
    const z0 = s.z + Math.sin(s.heading) * u + Math.cos(s.heading) * side * 1.6 * sc;
    const y0 = 2.0 * sc;
    let ax = P.x, az = P.z, t = 1;
    for (let k = 0; k < 3; k++) { t = Math.max(0.3, Math.hypot(ax - x0, az - z0) / M.speed); ax = P.x + P.vx * t; az = P.z + P.vz * t; }
    const ex = (rng() - 0.5) * 2 * M.spread, ez = (rng() - 0.5) * 2 * M.spread;
    const nx = -Math.sin(s.heading), nz = Math.cos(s.heading);
    ax += ex + nx * off; az += ez + nz * off;
    this.missiles.push({ id: this._id(), kind, from: s.id, x: x0, y: y0, z: z0, vx: (ax - x0) / t, vy: (1.0 - y0) / t + 0.5 * G * t, vz: (az - z0) / t,
      age: 0, dmg: M.dmg, hitR: M.hitR, dead: false });
    this._emit('throw', { kind, ship: s.id, x: +x0.toFixed(2), z: +z0.toFixed(2) });
  }

  _moveMissiles(dt, playing) {
    const T = this.T, P = this.player;
    const boat = P.craft !== 'efoil';
    for (const m of this.missiles) {
      m.age += dt;
      m.vy -= G * dt;
      m.x += m.vx * dt; m.y += m.vy * dt; m.z += m.vz * dt;
      if (playing && m.vy < 0 && m.y <= 1.8 && m.y > -0.2) {
        if (Math.hypot(m.x - P.x, m.z - P.z) <= m.hitR + (boat ? T.boatHitR : 0)) {
          m.dead = true;
          this._hurt(m.dmg, m.kind, m.x, m.z);
          continue;
        }
      }
      if (m.y < -0.2 || m.age > 8) { m.dead = true; this._emit('splash', { size: 0, kind: m.kind, x: +m.x.toFixed(2), z: +m.z.toFixed(2) }); }
    }
  }

  _hurt(dmg, kind, x, z) {
    const T = this.T, P = this.player;
    if (!this.playing) return;
    if (this.fx.shield > 0) { this._emit('deflect', { kind, x: +x.toFixed(2), z: +z.toFixed(2) }); return; }
    if (P.invulnT > 0) return;
    P.hp -= dmg; this.stats.damageTaken += dmg; P.invulnT = T.invulnSec;
    const heavy = dmg >= T.heavyHit;
    if (heavy) {
      if (P.craft === 'efoil') P.downT = T.downSec;
      else { P.stallT = T.stallSec; P.kick = (this.rng() < 0.5 ? -1 : 1) * T.kickSpin; }
    }
    this.lastHurt = { tick: this.tick, kind, heavy };
    this._emit('hurt', { dmg, kind, heavy, hp: Math.max(0, P.hp), craft: P.craft, x: +x.toFixed(2), z: +z.toFixed(2) });
    if (P.hp <= 0) {                                 // tr60: no harvests - you are out of the fight for a moment
      P.hp = P.maxHp; P.invulnT = T.swampInvulnSec;
      if (P.craft === 'efoil') P.downT = Math.max(P.downT, 2.2); else P.stallT = Math.max(P.stallT, 1.6);
      this.combo = 0; this.comboT = 0; this.stats.swamped++;
      this._emit('swamped', { lives: this.lives, craft: P.craft });
      this._checkLost();
    }
  }

  // ---- power-ups ---------------------------------------------------------------------
  _pickups(dt, playing) {
    const T = this.T, P = this.player, rng = this.rng;
    if (playing) {
      this.pickupT -= dt;
      if (this.pickupT <= 0) {
        this.pickupT = T.pickupEvery[0] + rng() * (T.pickupEvery[1] - T.pickupEvery[0]);
        if (this.pickups.length < T.pickupMax) {
          let kind = PICKUP_KINDS[Math.floor(rng() * PICKUP_KINDS.length)];
          const roll = rng();
          if (P.hp < P.maxHp * 0.5 && roll < 0.3) kind = 'repair';
          else if (this.burningCount > 0 && roll < 0.45) kind = 'douse';
          else if (this.tank < this.T.water.tank * 0.3 && roll < 0.6) kind = 'water';
          else if (this.pierFrac < 0.8 && roll < 0.72) kind = 'rebuild';
          const a = P.heading + (rng() - 0.5) * 1.6, r = 45 + rng() * 60;
          let x = P.x + Math.cos(a) * r, z = P.z + Math.sin(a) * r;
          x = clamp(x + COAST.startX, this.field.coastXMin, this.field.coastXMax) - COAST.startX;
          z = Math.max(z, landZ(x) + 35);
          if (this._onPier(x, z, 8)) { const pf = pierFrame(x, z), e = pierEdges(clamp(pf.s, 0, SECTIONS[6].s1)); const no = pf.o < (e[0] + e[1]) / 2 ? e[0] - 10 : e[1] + 10; [x, z] = pierAt(pf.s, no); }
          this.pickups.push({ id: this._id(), kind, x, z, age: 0, dead: false });
          this._emit('pickupSpawn', { kind, x: +x.toFixed(1), z: +z.toFixed(1) });
        }
      }
    }
    const reach = T.pickupR + (P.craft === 'efoil' ? 0 : 1.5);
    for (const k of this.pickups) {
      k.age += dt;
      if (k.age > T.pickupLife) { k.dead = true; continue; }
      if (playing && Math.hypot(k.x - P.x, k.z - P.z) <= reach) { k.dead = true; this.collect(k.kind, k.x, k.z); }
    }
    for (const b of this.baits) {
      b.t -= dt;
      for (const s of this.ships) {
        if (s.state !== 'rowing' && !(s.moored && s.state === 'landed')) continue;
        const c = capE(s, b.x, b.z);
        if (c.e > c.r + T.baitR) continue;
        s.baitAcc += T.baitDps * dt;
        s.kvx += (rng() - 0.5) * 2 * dt; s.kvz += (rng() - 0.5) * 2 * dt;
        if (s.baitAcc >= 10) { s.baitAcc -= 10; this._damage(s, 10, 'shark', s.x, 0.5, s.z); }
      }
    }
  }

  // Public so tests (and a future debug key) can grant a power-up directly.
  collect(kind, x = this.player.x, z = this.player.z) {
    const T = this.T, U = T.powerups[kind], P = this.player;
    if (!U) return;
    if (TIMED.includes(kind)) this.fx[kind] = U.sec;
    else if (kind === 'torpedo') this.torpedoes += U.count;
    else if (kind === 'repair') P.hp = Math.min(P.maxHp, P.hp + U.hp);
    else if (SIEGE_KINDS.includes(kind)) this._collectSiege(kind);
    else if (kind === 'bait') {
      this.baits.push({ id: this._id(), x, z, t: U.sec });
      for (const k of this.sharks) {
        if (k.state === 'flee' || k.state === 'gone' || k.state === 'lunge') continue;
        if (Math.hypot(k.x - x, k.z - z) < 220) { k.state = 'bait'; k.stateT = 0; k.cx = x; k.cz = z; k.cr = 7 + this.rng() * 5; }
      }
    }
    this._emit('pickup', { kind, label: U.label, x: +x.toFixed(1), z: +z.toFixed(1) });
  }

  // ---- sharks ------------------------------------------------------------------------
  _sharkUp(k) { return k.state !== 'recover' && k.state !== 'flee' && k.state !== 'gone'; }

  _spawnShark() {
    const rng = this.rng, T = this.T.shark;
    const at = this._spawnPoint(60, 150, 40, 2.4);
    const k = { id: this._id(), x: at.x, z: at.z, heading: rng() * TAU, speed: T.cruise, state: 'cruise', stateT: 0,
      cx: at.x, cz: at.z, cr: T.circleR[0] + rng() * (T.circleR[1] - T.circleR[0]), dir: rng() < 0.5 ? -1 : 1,
      cool: 3 + rng() * 4, lx: 1, lz: 0, hitDone: false, gatherT: 0, phase: rng() * TAU };
    this.sharks.push(k);
    this._emit('sharkSpawn', { shark: k.id });
  }

  _sharks(dt, playing) {
    const S = this.T.shark, P = this.player, rng = this.rng;
    if (this.phase !== 'over' && this.phase !== 'lost') {
      let n = 0;
      for (const k of this.sharks) if (k.state !== 'flee') n++;
      this.sharkT -= dt;
      if (n < this.spec.sharks && this.sharkT <= 0) { this._spawnShark(); this.sharkT = 5 + rng() * 4; }
    }
    const boat = P.craft !== 'efoil';
    for (const k of this.sharks) {
      k.stateT += dt; if (k.cool > 0) k.cool -= dt;
      const dP = Math.hypot(P.x - k.x, P.z - k.z);
      let goalX = k.x + Math.cos(k.heading), goalZ = k.z + Math.sin(k.heading), vWant = S.cruise, rate = 1.8;
      const circle = (mul) => {
        const th = Math.atan2(k.z - k.cz, k.x - k.cx) + k.dir * 0.7;
        goalX = k.cx + Math.cos(th) * k.cr; goalZ = k.cz + Math.sin(th) * k.cr; vWant = S.cruise * mul;
      };
      switch (k.state) {
        case 'cruise':
          if (Math.hypot(P.x - k.cx, P.z - k.cz) > 200) { const a = Math.atan2(P.z - k.cz, P.x - k.cx); k.cx += Math.cos(a) * 3 * dt; k.cz += Math.sin(a) * 3 * dt; }
          circle(1);
          if (playing && k.cool <= 0 && dP < S.notice) { k.state = 'stalk'; k.stateT = 0; }
          break;
        case 'gather':
          k.gatherT -= dt; circle(Math.hypot(k.x - k.cx, k.z - k.cz) > k.cr + 10 ? 2.2 : 1.35);
          if (k.gatherT <= 0) { k.state = 'cruise'; k.stateT = 0; k.cx = k.x; k.cz = k.z; }
          break;
        case 'bait': {
          circle(1.7);
          if (!this.baits.some((b) => b.t > 0 && Math.hypot(b.x - k.cx, b.z - k.cz) < 1)) { k.state = 'cruise'; k.stateT = 0; k.cx = k.x; k.cz = k.z; }
          break;
        }
        case 'stalk':
          goalX = P.x; goalZ = P.z; vWant = S.stalk; rate = 2.2;
          if (!playing || dP > S.notice * 1.8 || k.stateT > 12) { k.state = 'cruise'; k.stateT = 0; k.cx = k.x; k.cz = k.z; k.cool = 3; }
          else if (dP < S.tellAt) { k.state = 'tell'; k.stateT = 0; this._emit('sharkTell', { shark: k.id, x: +k.x.toFixed(1), z: +k.z.toFixed(1) }); }
          break;
        case 'tell':
          goalX = P.x + P.vx * 0.6; goalZ = P.z + P.vz * 0.6; vWant = 2.0; rate = 3.0;
          if (k.stateT >= S.tellSec) {
            const lead = Math.min(1.0, dP / S.lunge);
            const ax = P.x + P.vx * lead - k.x, az = P.z + P.vz * lead - k.z, l = Math.hypot(ax, az) || 1;
            k.lx = ax / l; k.lz = az / l; k.heading = Math.atan2(k.lz, k.lx);
            k.state = 'lunge'; k.stateT = 0; k.hitDone = false; k.speed = S.lunge * 0.6;
            this._emit('lunge', { shark: k.id, x: +k.x.toFixed(1), z: +k.z.toFixed(1) });
          }
          break;
        case 'lunge':
          goalX = k.x + k.lx * 10; goalZ = k.z + k.lz * 10; vWant = S.lunge; rate = 0;
          if (playing && !k.hitDone && dP <= S.hitR + (boat ? this.T.boatHitR : 0)) {
            k.hitDone = true;
            this._emit('sharkHit', { shark: k.id, x: +k.x.toFixed(1), z: +k.z.toFixed(1) });
            this._hurt(S.dmg, 'shark', k.x, k.z);
          }
          if (k.stateT >= S.lungeSec) {
            if (!k.hitDone) this._emit('sharkMiss', { shark: k.id });
            k.state = 'recover'; k.stateT = 0; k.cool = S.cool[0] + rng() * (S.cool[1] - S.cool[0]);
          }
          break;
        case 'recover':
          vWant = 3; rate = 1.0;
          if (k.stateT >= S.recoverSec) { k.state = 'cruise'; k.stateT = 0; k.cx = k.x + Math.cos(k.heading) * 20; k.cz = k.z + Math.sin(k.heading) * 20; }
          break;
        case 'flee': {
          const a = Math.atan2(k.z - P.z, k.x - P.x);
          goalX = k.x + Math.cos(a) * 10; goalZ = k.z + Math.sin(a) * 10;
          vWant = k.stateT < 0.8 ? 1 : S.flee; rate = k.stateT < 0.8 ? 0 : 2.5;
          if (k.stateT < 0.8) k.heading = wrap(k.heading + Math.sin(k.stateT * 40) * 6 * dt);
          if (k.stateT >= S.fleeSec) k.state = 'gone';
          break;
        }
      }
      if (rate > 0) {
        const e = wrap(Math.atan2(goalZ - k.z, goalX - k.x) - k.heading);
        k.heading = wrap(k.heading + clamp(e, -rate * dt, rate * dt));
      }
      k.speed += clamp(vWant - k.speed, -12 * dt, 14 * dt);
      k.x += Math.cos(k.heading) * k.speed * dt;
      k.z += Math.sin(k.heading) * k.speed * dt;
      // never up the beach
      const lz = landZ(k.x) + 25;
      if (k.z < lz) { k.z = lz; if (k.state === 'lunge') k.stateT = S.lungeSec; }
      // keep clear of people in the water, always. Pushing out of one swimmer can push the shark
      // into another floating close by (merge fix 2026-09-17: test saw 2.28 m), so repeat the
      // push until it is clear of all of them; a shark wedged between swimmers dives away.
      for (let pass = 0; pass < 6; pass++) {
        let pushed = false;
        for (const w of this.swimmers) {
          const dx = k.x - w.x, dz = k.z - w.z, d = Math.hypot(dx, dz);
          if (d < S.clearSwimmer) {
            const nx = d > 1e-6 ? dx / d : 1, nz = d > 1e-6 ? dz / d : 0;
            k.x = w.x + nx * S.clearSwimmer; k.z = w.z + nz * S.clearSwimmer;
            if (k.state === 'lunge') { k.state = 'recover'; k.stateT = 0; k.cool = S.cool[0]; }
            pushed = true;
          }
        }
        if (!pushed) break;
        if (pass === 5 && this.swimmers.some((w) => Math.hypot(k.x - w.x, k.z - w.z) < S.clearSwimmer)) k.state = 'gone';
      }
      if (!fin(k.x) || !fin(k.z) || !fin(k.heading)) { k.state = 'gone'; }
    }
  }

  _scareShark(k, q) {
    k.state = 'flee'; k.stateT = 0;
    this.stats.sharksScared++; this.stats.shotsHit++;
    const pts = this._score(this.T.sharkScore, true);
    this._emit('sharkShot', { shark: k.id, points: pts, x: +k.x.toFixed(2), z: +k.z.toFixed(2), kind: q.kind });
  }

  // ---- people in the water and wreckage (visual cast; never targets) ---------------------
  _swimmers(dt) {
    const S = this.T.shark, P = this.player;
    for (const p of this.wreck) {
      p.age += dt;
      const k = Math.exp(-0.6 * dt);
      p.vx *= k; p.vz *= k;
      p.x += p.vx * dt; p.z += (p.vz + 0.15) * dt; p.yaw += 0.05 * dt;
      if (p.age > 50) p.dead = true;
    }
    for (const w of this.swimmers) {
      w.age += dt; w.stateT += dt;
      // scramble away from sharks and craft (cartoon panic, faster paddling)
      let tx = 0, tz = 0, threat = false;
      for (const k of this.sharks) {
        if (k.state === 'gone') continue;
        const dx = w.x - k.x, dz = w.z - k.z, d = Math.hypot(dx, dz);
        if (d < S.panicR && d > 1e-6) { tx += dx / d; tz += dz / d; threat = true; }
      }
      const pdx = w.x - P.x, pdz = w.z - P.z, pd = Math.hypot(pdx, pdz);
      if (pd < 12 && pd > 1e-6) { tx += pdx / pd; tz += pdz / pd; threat = true; }
      if (pd < 3 && pd > 1e-6) { w.x = P.x + (pdx / pd) * 3; w.z = P.z + (pdz / pd) * 3; }   // splashed aside, unharmed
      if (threat && w.state !== 'thrown') { w.panicT = 1.5; const l = Math.hypot(tx, tz) || 1; w.pu = tx / l; w.pv = tz / l; if (w.state === 'grab') { w.state = 'swim'; w.plank = -1; } }
      if (w.panicT > 0) w.panicT -= dt;
      let vx = 0, vz = 0;
      switch (w.state) {
        case 'thrown': {
          const k = Math.exp(-2 * dt); w.vx *= k; w.vz *= k; vx = w.vx; vz = w.vz;
          if (w.stateT > 0.7) { w.state = 'bob'; w.stateT = 0; }
          break;
        }
        case 'bob':
          vx = w.vx * 0.2; vz = w.vz * 0.2;
          if (w.stateT > w.wait) {
            let best = null, bd = 25;
            for (const p of this.wreck) { const d = Math.hypot(p.x - w.x, p.z - w.z); if (d < bd) { bd = d; best = p; } }
            w.state = best ? 'toPlank' : 'swim'; w.plank = best ? best.id : -1; w.stateT = 0;
          }
          break;
        case 'toPlank': {
          const p = this.wreck.find((q) => q.id === w.plank);
          if (!p) { w.state = 'swim'; w.stateT = 0; break; }
          const dx = p.x - w.x, dz = p.z - w.z, d = Math.hypot(dx, dz);
          if (d < 1.0) { w.state = 'grab'; w.stateT = 0; break; }
          vx = dx / d * 1.4; vz = dz / d * 1.4;
          break;
        }
        case 'grab': {
          const p = this.wreck.find((q) => q.id === w.plank);
          if (!p || w.stateT > w.grabT) { w.state = 'swim'; w.stateT = 0; break; }
          w.x += (p.x + Math.cos(w.phase) * 0.7 - w.x) * Math.min(1, dt * 4);
          w.z += (p.z + Math.sin(w.phase) * 0.7 - w.z) * Math.min(1, dt * 4);
          break;
        }
        default:   // 'swim': paddle back out to sea
          vx = Math.sin(w.age * 0.7 + w.phase) * 0.3; vz = 1.1;
      }
      if (w.panicT > 0) { vx = vx * 0.3 + w.pu * 2.6; vz = vz * 0.3 + w.pv * 2.6; }
      if (!(w.panicT > 0) && w.state !== 'thrown' && w.z < landZ(w.x) + 20) vz = Math.max(vz, 1.2);
      w.x += vx * dt; w.z += vz * dt;
      if (w.age > 70 || (w.age > 10 && pd > 330) || !fin(w.x) || !fin(w.z)) w.dead = true;
    }
  }

  // ---- queries for HUD / pilot -------------------------------------------------------------
  // ⚠️ tr141: the ally clause here is what stops the scripted pilot (pilot.js) and the HUD's
  // objective marker driving the player at her own side. threats() is the ONE query both read.
  threats() {
    const out = [];
    for (const s of this.ships) if (!s.ally && !s.through && (s.state === 'rowing' || (s.moored && s.state === 'landed'))) out.push(s);
    out.sort((a, b) => a.ttb - b.ttb || a.id - b.id);
    return out;
  }

  objective(p) {
    if (this.phase === 'over' || this.phase === 'lost') return null;
    const t = this.threats();
    if (!t.length) return null;
    const s = t[0];
    return { kind: 'ship', ship: s, x: s.x, z: s.z, dist: Math.hypot(p.x - s.x, p.z - s.z), ttb: s.ttb };
  }

  summary() {
    return { score: this.score, ...this.stats, reachedWave: this.wave, seconds: Math.round(this.time), outcome: this.outcome || 'lost',
      sectionsStanding: SECTIONS.length - this.collapsedCount, sections: SECTIONS.length, pier: Math.round(100 * this.pierFrac), finalWave: this.finalWave,
      accuracy: this.stats.shotsFired ? Math.round((100 * this.stats.shotsHit) / this.stats.shotsFired) : 0,
      allies: this.allySummary(), level: this.level, gate: this.gateSummary(),
      gateLeft: this.level === 'gate' ? this.gateLeft : 0 };
  }
}

// the pier siege (siege.js): sections, fire, ladders, fire pots, the water cannon, repairs
Object.defineProperties(RaidGame.prototype, Object.getOwnPropertyDescriptors(SiegeMethods));
// the quay fleet (allies.js): the arrival beat and the allied ships' plan
Object.defineProperties(RaidGame.prototype, Object.getOwnPropertyDescriptors(AllyMethods));
// the harbour mouth (gate.js): the corsair level's objective, its survey field and its route
Object.defineProperties(RaidGame.prototype, Object.getOwnPropertyDescriptors(GateMethods));
