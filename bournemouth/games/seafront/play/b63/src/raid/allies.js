// THE QUAY FLEET - ALLIED SHIP AI (tr141).
//
// A relief fleet arrives mid-raid and fights the corsairs ON THE PLAYER'S SIDE. Pure rules:
// no DOM, no GL, no clock, no Math.random. Mixed into RaidGame exactly as SiegeMethods is, and
// advanced once per fixed sim tick, so a run with allies in it still replays bit for bit.
//
// WHY THIS IS A FILE AND NOT A FLAG IN raid.js: an ally needs a whole behaviour - arrive,
// choose an enemy, take station on his beam, run alongside him with her guns bearing, break
// off when he sinks - and none of that belongs in the corsairs' steering. What the ally shares
// with a corsair is the HULL (raid.js moves her, collide.js makes her solid, raid-actors draws
// her) and the BATTERY (siege.js fires her guns). Only the plan is here.
//
// STRUCTURE (the four questions this pass was set, answered in code):
//
//  1. SHIP v SHIP IS NEW. Before tr141 a ship fought the pier and the player and nothing else.
//     _allyPick is the first target selection a ship has ever done against another ship, and
//     siege._roundHitsShip is the hit test that carries it.
//  2. AN ALLY IS A FACTION ROW *AND* A PER-SHIP FLAG. FOES.quay carries her hull table, so
//     checkFoes() validates her crew and plank counts with the SAME guard that exists because
//     a missing row once sank a ship with nobody in the water. s.ally is the boolean the hit
//     tests read, because the hit tests must never read a faction (tmp-tr136x asserts that, and
//     it is right: a hit test that knows about factions is one refactor away from knowing about
//     swimmers).
//  3. THE PLAYER CANNOT HARM AN ALLY. Her weapons do not auto-aim at one, her rounds pass
//     through one, her splash does not reach one and ramming one is a bounce with no damage.
//     Four places in raid.js, each one a single s.ally clause.
//  4. AN ALLY THAT SINKS PUTS HER CREW IN THE WATER through the SAME _sink that a corsair
//     uses, into the SAME this.swimmers list. Every swimmer rule therefore applies to them by
//     construction and not by promise: there is no allied swimmer type to forget about.
//
// CONTENT. The relief fleet is generic: no flag, no badge, no nationality, no lettering, no
// name anywhere in the world geometry. The one place a name appears at all is the HUD copy
// table (raid-hud.js), which is HTML text, never a mesh.

import { pierAt, pierFrame, pierEdges, S_END } from './siege.js';
import { gateAt, gateRun } from './gate.js';                 // tr145: the corsair level

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// THE RALLY POINT - the thing everyone in this fight is arguing about. At the pier it is the
// pier head's middle; at Old Harry it is the middle of the channel the corsairs have to cross.
//
// ⚠️ tr145: this WAS a module-level const evaluated at import (`const HEAD_XZ = pierAt(195, 6)`),
// and tmp-tr141/RESULT.md section 10 called it the single riskiest coupling in the file and said
// it should become a per-run value on the game BEFORE the arena move rather than during it.
// It is now `this.rally`, set in _initAllies from the level. Nothing else about the fleet's
// behaviour changed: the beat, the target choice, the broadside station, the interception, the
// withdrawal and the separation are all still pure geometry that knows nothing about either
// objective.
const PIER_RALLY = pierAt(195, 6);

export const ALLY_STATES = ['none', 'sighted', 'closing', 'fighting'];

export const AllyMethods = {
  _initAllies() {
    // `state` is the ARRIVAL BEAT, not the AI: the AI is per-ship and lives in _allySteer.
    this.allyFleet = { state: 'none', t: 0, n: 0, sunk: 0, volleys: 0, hits: 0, kills: 0 };
    const G = this.T.gate;
    this.rally = this.level === 'gate' ? gateAt(0, (G.aimOff[0] + G.aimOff[1]) / 2) : PIER_RALLY;
  },

  // The arena overrides, or null in a pier raid. One lookup, so every use below is one clause.
  _allyLevel() { return this.level === 'gate' ? this.T.allies.gate : null; },

  // Are the allied guns live? The beat gates them, so the fleet sails in SILENTLY and then
  // opens fire - which is what makes the arrival an event rather than a spawn.
  _alliesFiring() { return !!this.allyFleet && this.allyFleet.state === 'fighting'; },

  // ---- THE ARRIVAL BEAT --------------------------------------------------------------------
  // THE TRIGGER IS A WAVE NUMBER (allies.fromWave), and that is a decision, not a default:
  //   * a wave boundary is deterministic, so the A/B in RESULT.md is measurable at all and the
  //     beat can be tested without driving the pier to a particular health;
  //   * EVERY player sees it. A pier-health threshold ("help comes when you are losing") is more
  //     dramatic but a good player never triggers it, and a level whose set piece only fires for
  //     people who are losing is a set piece most players never see;
  //   * a level designer can place it on the wave they want the fight to turn.
  // The health trigger is one line if the owner wants it (see RESULT.md) and is deliberately not
  // shipped.
  _alliesTick(dt) {
    const A = this.T.allies, F = this.allyFleet;
    if (!A || !A.on || !F) return;
    if (!A.withFoe.includes(this.foe)) return;      // see the note on withFoe in tuning.js
    F.t += dt;
    switch (F.state) {
      case 'none':
        if (this.wave < A.fromWave || !this.playing) return;
        this._spawnAllies();
        F.state = 'sighted'; F.t = 0;
        this._emit('alliesSighted', { n: F.n, wave: this.wave });
        return;
      case 'sighted':
        // hull-down and standing in. The beat holds for its own sake: the player is meant to
        // see sails before anything happens.
        if (F.t >= A.sightSec) { F.state = 'closing'; F.t = 0; this._emit('alliesClosing', { n: this._allyLive() }); }
        return;
      case 'closing': {
        const d = this._allyNearestToHead();
        const L = this._allyLevel();
        if (d < (L ? L.engageR : A.engageR)) { F.state = 'fighting'; F.t = 0; this._emit('alliesEngaged', { n: this._allyLive(), dist: Math.round(d) }); }
        return;
      }
      default: return;
    }
  },

  _allyLive() { let n = 0; for (const s of this.ships) if (s.ally && s.state === 'rowing') n++; return n; },

  _allyNearestToHead() {
    let d = Infinity;
    const [hx, hz] = this.rally;
    for (const s of this.ships) if (s.ally && s.state === 'rowing') d = Math.min(d, Math.hypot(s.x - hx, s.z - hz));
    return d;
  },

  // Hull-down on an arc to the WEST of the pier head - the opposite quarter from the corsair
  // spawn arc (raid.js _siegePoint uses 0.15..PI-0.15), so the two fleets converge rather than
  // arriving mixed together.
  _spawnAllies() {
    const A = this.T.allies, rng = this.rng, F = this.allyFleet, L = this._allyLevel();
    const [hx, hz] = this.rally;
    for (let i = 0; i < A.kinds.length; i++) {
      let px, pz;
      if (L) {
        // AT THE HARBOUR MOUTH the fleet does not need an arc: it comes OUT OF THE HARBOUR, so
        // it spawns BEYOND the gate and sails in across it. That is the opposite quarter from
        // the corsairs by construction rather than by a hand-picked arc, and it is also the
        // truth of where a Poole fleet would come from.
        const run = L.spawnRun[0] + ((i + 0.5) / A.kinds.length) * (L.spawnRun[1] - L.spawnRun[0]) + (rng() - 0.5) * 30;
        const off = L.spawnOff[0] + rng() * (L.spawnOff[1] - L.spawnOff[0]);
        [px, pz] = gateAt(run, off);
      } else {
        const a = A.spawnArc[0] + ((i + 0.5) / A.kinds.length) * (A.spawnArc[1] - A.spawnArc[0]) + (rng() - 0.5) * 0.10;
        const r = A.spawnR[0] + rng() * (A.spawnR[1] - A.spawnR[0]);
        px = hx + Math.cos(a) * r; pz = hz + Math.sin(a) * r;
      }
      const s = this._makeShip(A.kinds[i], px, pz, null, A.faction);
      s.heading = Math.atan2(hz - s.z, hx - s.x);
      s.cruise *= A.closeSpeed;
      s.speed = s.cruise;
      s.atkT = 1e9;                                  // she never throws anything at the player
      s.aly = { tgt: -1, side: 1, holdT: 0, pickT: 0, out: false };
      F.n++;
    }
  },

  // ---- THE FIGHTING AI ----------------------------------------------------------------------
  // Called from _moveShip in place of the siege steer. Sets s.tx/s.tz - the SAME waypoint the
  // ordinary rowing steer consumes - so an ally is turned and driven by exactly the code that
  // turns and drives a corsair. Nothing here writes s.x or s.z.
  _allySteer(s, dt) {
    const A = this.T.allies, a = s.aly || (s.aly = { tgt: -1, side: 1, holdT: 0, pickT: 0, out: false });
    const [hx, hz] = this.rally;
    if (this.allyFleet.state === 'none' || this.allyFleet.state === 'sighted') {
      // standing in from the horizon: straight for the pier head, no manoeuvring at all
      const d = Math.hypot(hx - s.x, hz - s.z) || 1;
      s.tx = s.x + ((hx - s.x) / d) * 400; s.tz = s.z + ((hz - s.z) / d) * 400;
      s.ttb = Infinity;
      return;
    }
    // SHOT TO PIECES: break off. She runs for the screen station, which is outside the
    // corsairs' engagement range, and does not come back until she is above rejoinAt - which
    // she never is, because nothing repairs her. So this is a ship LEAVING THE FIGHT, not a
    // heal: what it buys is that the fleet is still afloat at the end of the raid instead of
    // being wiped out to the last hull every time.
    const frac = s.hp / Math.max(1, s.maxHp);
    if (frac < A.withdrawAt) a.out = true; else if (frac > A.rejoinAt) a.out = false;
    if (a.out) {
      if (a.tgt >= 0) { a.tgt = -1; this._emit('allyWithdraw', { ship: s.id, hp: Math.round(100 * frac) }); }
      const L0 = this._allyLevel();
      const [wx, wz] = L0 ? gateAt(L0.screenR + 90, L0.screenOff[s.id % 2 ? 1 : 0])
        : pierAt(S_END + A.screenR + 60, (s.id % 2 ? 1 : -1) * 70);
      s.tx = wx; s.tz = wz; s.ttb = Infinity;
      this._allyAvoid(s);
      return;
    }
    a.pickT -= dt;
    let t = a.tgt >= 0 ? this.ships.find((o) => o.id === a.tgt) : null;
    if (t && !(t.state === 'rowing' || (t.moored && t.state === 'landed'))) t = null;
    if (!t || a.pickT <= 0) {
      const n = this._allyPick(s, t);
      if (n !== t) { a.holdT = 0; if (n) this._emit('allyEngage', { ship: s.id, target: n.id, kind: n.kind }); }
      t = n; a.tgt = t ? t.id : -1;
      a.pickT = A.pickEvery;                          // re-picking every frame makes a ship dither
    }
    if (!t) {                                         // nothing to fight: screen the objective
      const L1 = this._allyLevel();
      const [sx, sz] = L1 ? gateAt(L1.screenR, L1.screenOff[s.id % 2 ? 1 : 0])
        : pierAt(S_END + A.screenR, (s.id % 2 ? 1 : -1) * 26);
      s.tx = sx; s.tz = sz; s.ttb = Infinity;
      this._allyAvoid(s);
      return;
    }
    // THE BROADSIDE STATION. Not "steer at him" - a ship that steers at her enemy presents her
    // bow, and a bow has no guns in it. The station is a point ABEAM of him at `stand` metres
    // and `lead` metres ahead, so she arrives alongside rather than astern.
    //
    // ⚠️ AND IT IS LAID ON AN INTERCEPTION, not on where he is now. This is the single thing
    // that made the AI work. Steering at a station abeam of a ship doing the same speed as you
    // is a stern chase: measured on the first build, the allies were on station 5% of the time
    // at a mean 130 m from it, following corsairs round the bay for the whole raid and firing
    // seven volleys in 168 s. Projecting him forward over the time it takes to get there makes
    // her cut the corner, which is also what it looks like a ship should do.
    const th = t.heading, ch = Math.cos(th), sh = Math.sin(th);
    const px = -sh, pz = ch;                          // his port/starboard unit
    const rel = (s.x - t.x) * px + (s.z - t.z) * pz;
    // stick to the side she is already on until she is well over on the other one, or she will
    // flip sides every time he yaws through her bearing and sail a figure of eight
    if (rel > A.flip) a.side = 1; else if (rel < -A.flip) a.side = -1;
    const gap = Math.hypot(t.x - s.x, t.z - s.z);
    const tLead = clamp(gap / Math.max(1, s.cruise), 0, A.maxLead);
    const ix = t.x + ch * t.speed * tLead, iz = t.z + sh * t.speed * tLead;
    const stx = ix + px * a.side * A.stand + ch * A.lead;
    const stz = iz + pz * a.side * A.stand + sh * A.lead;
    const ds = Math.hypot(stx - s.x, stz - s.z);
    if (ds < A.holdR) a.holdT += dt; else a.holdT = 0;
    if (a.holdT > 0) {
      // ON STATION: run PARALLEL to him. Aiming far ahead down his heading keeps her lying
      // alongside with her guns bearing for seconds at a time, which is the whole point - a
      // ship that keeps steering at a moving waypoint under her own bow just spins.
      s.tx = stx + ch * A.parallel; s.tz = stz + sh * A.parallel;
    } else { s.tx = stx; s.tz = stz; }
    s.ttb = Infinity;
    this._allyAvoid(s);
  },

  // Which corsair. Nearest is wrong: the ship about to tie up alongside the pier is the one
  // that matters, and a moored one is already doing damage. So the score is a distance PLUS
  // bonuses for being the pier's problem, and a penalty for a hull another ally has already
  // taken on, so three allies do not all pile onto the same enemy.
  _allyPick(s, cur) {
    const A = this.T.allies;
    let best = null, bu = Infinity;
    const taken = new Map();
    for (const o of this.ships) if (o.ally && o !== s && o.aly && o.aly.tgt >= 0) taken.set(o.aly.tgt, (taken.get(o.aly.tgt) || 0) + 1);
    for (const o of this.ships) {
      if (o.ally) continue;
      if (o.state !== 'rowing' && !(o.moored && o.state === 'landed')) continue;
      const d = Math.hypot(o.x - s.x, o.z - s.z);
      if (d > A.pickRange) continue;
      let u = d;
      if (o.moored) u -= A.wMoored;
      else if (o.ttb < A.soonSec) u -= A.wSoon;
      if (o.kind === 'boss') u -= A.wBoss; else if (o.kind === 'jarl') u -= A.wJarl;
      u += (taken.get(o.id) || 0) * A.wTaken;
      if (cur && o.id === cur.id) u -= A.wStick;      // hysteresis: do not swap targets for 1 m
      if (u < bu) { bu = u; best = o; }
    }
    return best;
  },

  // Keep an ally's WAYPOINT (never her position) off the pier and out of her consorts. The
  // corsairs get _pierPush for the hull itself; this is the plan, so she never aims into the
  // structure in the first place.
  _allyAvoid(s) {
    const A = this.T.allies;
    let ax = 0, az = 0;
    for (const o of this.ships) {
      if (o === s || !o.ally || o.state !== 'rowing') continue;
      const dx = s.x - o.x, dz = s.z - o.z, d = Math.hypot(dx, dz);
      if (d > 1e-6 && d < A.sep) { ax += (dx / d) * (A.sep - d); az += (dz / d) * (A.sep - d); }
    }
    s.tx += ax * A.sepGain; s.tz += az * A.sepGain;
    // tr145: at the arena the keep-out is the CHALK, read from the same baked survey the mesh
    // is built from (gate.js). This is the second of tmp-tr141 section 10's five changes, and
    // it is the one function that file said it would be.
    if (this.level === 'gate') { this._gateAvoid(s, this.T.gate.wpKeep); return; }
    const f = pierFrame(s.tx, s.tz);
    if (f.s > -A.pierKeep && f.s < S_END + A.pierKeep) {
      const e = pierEdges(clamp(f.s, 0, S_END - 0.01)) || [-5.5, 5.5];
      const lo = e[0] - A.pierKeep, hi = e[1] + A.pierKeep;
      if (f.o > lo && f.o < hi) {
        const mid = (e[0] + e[1]) / 2, o = f.o < mid ? lo : hi;
        const [nx, nz] = pierAt(f.s, o);
        s.tx = nx; s.tz = nz;
      }
    }
  },

  allySummary() {
    const F = this.allyFleet || {};
    return { state: F.state || 'none', arrived: F.n || 0, live: this._allyLive(), sunk: F.sunk || 0, volleys: F.volleys || 0, kills: F.kills || 0 };
  },
};
