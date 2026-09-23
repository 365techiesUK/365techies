// VIKING RAID - THE PIER SIEGE (tr60). Pure rules: no DOM, no GL, no clock, no Math.random.
//
// The raid's goal is now to DEFEND BOURNEMOUTH PIER. Longships steer for named
// sections of the pier from several directions, MOOR alongside, raise ladders and
// send warriors up with fire pots; from range they lob fire pots and loose flaming
// arrows. Fire has an intensity per section, grows, SPREADS along the deck to the
// neighbouring sections, burns their health down, and a section at 0 health
// COLLAPSES (and then acts as a firebreak). The player fights back by sinking or
// ramming ships before they tie up, with a WATER CANNON (limited tank) that douses
// fire, knocks fire pots out of the air and knocks warriors off ladders into the
// water (they splash and paddle away - never harmed), and with DOUSE / REBUILD /
// WATER power-ups. The pier burns down (lost) when enough sections have fallen or
// its health is gone; clearing the final wave saves it.
//
// FRAME. Sim world metres (coast - (COAST.startX, COAST.startZ)). Pier station s runs
// seaward from the root, offset o across it (+ east), exactly pier.js's at(s, off).
// DIR and DECK are COPIED from pier.js (local consts there, not exported); HEAD and
// TIP are imported, so the section stations follow the model if it is re-surveyed.
//
// These methods are mixed into RaidGame (raid.js) and read/write its state.

import { HEAD, TIP } from '../gl/pier.js';
import { COAST } from '../gl/coast.js';
import { crowdClear, CROWD_CLEAR } from './crowd.js';   // tr62: keep raid effects clear of the static pier crowd

const DIR = [0.1063, 0.9943];          // COPIED: pier.js DIR (pier axis)
export const DECK = 5.47;              // COPIED: pier.js DECK (deck top, m)
const OX = -COAST.startX, OZ = -COAST.startZ;
const G = 9.81, TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const wrap = (a) => a - TAU * Math.round(a / TAU);

export const PIER_HEADING = Math.atan2(DIR[1], DIR[0]);           // seaward along the axis
export const pierAt = (s, o) => [s * DIR[0] + o * DIR[1] + OX, s * DIR[1] - o * DIR[0] + OZ];
export function pierFrame(x, z) { const wx = x - OX, wz = z - OZ; return { s: wx * DIR[0] + wz * DIR[1], o: wx * DIR[1] - wz * DIR[0] }; }
// across-axis unit (+o, east) in world x/z
export const ACROSS = [DIR[1], -DIR[0]];
export const S_END = TIP.S_END;

// Deck outline [oWest, oEast] at station s incl. the lower walkways; null off the pier.
// Neck 11 m (NECK_HALF 5.5); head walkway outer edges from pier.js WALK (zones at s 191.5).
export function pierEdges(s) {
  if (s < 0 || s > TIP.S_END) return null;
  if (s < 128) return [-5.5, 5.5];
  if (s < 191.5) return [-14.0, 25.6];
  if (s < TIP.WALK_S) return [-14.9, 24.6];
  return TIP.edges(s, 0);
}

// THE SECTIONS, landward to seaward. deck = [s0, s1] of the section; bld = the burnable
// mass the flames sit on and the soot overlays wrap: [s0, s1, o0, o1, yTop].
// Neck: the covered walkway (s 16.5-127.7, 3.0 m ridge); hall and tower block from
// HEAD (walls o -3..15, eaves DECK+6.5, crown DECK+8.8, tower TB_T / lantern LN_T); the
// range and rotunda (RANGE_S1 198, ROT_S 208); the zip-wire tower at s 245.8 o 4.5.
export const SECTIONS = [
  { key: 'shore', name: 'THE SHORE SPANS', short: 'SHORE', s0: 36, s1: 68, bld: [38, 68, -2.6, 2.6, DECK + 3.1], hp: 90, moor: [] },
  { key: 'shelter', name: 'THE SHELTER RUN', short: 'SHELTER', s0: 68, s1: 98, bld: [68, 98, -2.6, 2.6, DECK + 3.1], hp: 90, moor: [84] },
  { key: 'neck', name: 'THE SEA SPANS', short: 'SPANS', s0: 98, s1: 128, bld: [98, 127.7, -2.6, 2.6, DECK + 3.1], hp: 90, moor: [113] },
  { key: 'hall', name: 'THE HALL', short: 'HALL', s0: 128, s1: HEAD.HALL_S1, bld: [140, HEAD.HALL_S1, -3, 15, DECK + 8.8], hp: 160, moor: [141, 159] },
  { key: 'tower', name: 'THE TOWER', short: 'TOWER', s0: HEAD.HALL_S1, s1: HEAD.MASS_S1, bld: [HEAD.TB_S0, HEAD.MASS_S1, -3, 15, HEAD.ROOF_T], hp: 110, moor: [176.5] },
  { key: 'rotunda', name: 'THE ROTUNDA', short: 'ROTUNDA', s0: HEAD.MASS_S1, s1: 216, bld: [HEAD.MASS_S1, 212, -3, 15, DECK + 5.2], hp: 130, moor: [195, 212] },
  { key: 'zip', name: 'THE ZIP-WIRE TOWER', short: 'ZIP TOWER', s0: 216, s1: TIP.S_END, bld: [241, 250.5, 0, 9, DECK + 17.3], hp: 110, moor: [230] },
];
export const HEAD_SECTIONS = [3, 4, 5, 6];

// Flame spots per section (s, o, y), lit in order as the fire grows.
export const SPOTS = SECTIONS.map((sec) => {
  const [s0, s1, o0, o1, y1] = sec.bld, out = [];
  const n = sec.key === 'hall' ? 7 : sec.key === 'tower' || sec.key === 'zip' ? 3 : 4;
  for (let i = 0; i < n; i++) {
    const f = (i + 0.5) / n, k = (i * 7) % n / n;
    let s = s0 + (s1 - s0) * (0.15 + 0.7 * ((i * 3) % n + 0.5) / n);
    let o = o0 + (o1 - o0) * (0.2 + 0.6 * k);
    let y = y1;
    [s, o] = crowdClear(s, o, s0 + 1, s1 - 1, o0, o1);   // tr62: never burn over a visitor
    if (sec.key === 'hall') y = DECK + 6.5 + 2.3 * (1 - Math.pow((o - 6) / 9, 2));
    if (sec.key === 'zip') y = DECK + 6 + 11 * f;
    if (sec.key === 'tower') y = DECK + 7 + 6 * f;
    out.push([s, o, y]);
  }
  return out;
});

// Mooring slots (ship centre) either side of each section's moor stations, plus the
// nose slot reserved for the flagship. topO/topY: where the ladders reach the pier.
function buildSlots() {
  const out = [];
  SECTIONS.forEach((sec, i) => {
    for (const s0 of sec.moor) {
      const s = crowdClear(s0, pierEdges(s0)[1], sec.s0 + 3, sec.s1 - 3, pierEdges(s0)[1], pierEdges(s0)[1], CROWD_CLEAR + 1)[0];   // tr62: ladders never reach a visitor
      const e = pierEdges(s);
      for (const side of [-1, 1]) {
        const edge = side < 0 ? e[0] : e[1];
        const neck = s < 128;
        out.push({ id: out.length, sec: i, s, o: edge + side * (neck ? 2.9 : 3.0), side, topO: edge, topY: neck ? DECK + 1.0 : (s < 191.5 ? DECK - 3.45 : DECK - 2.45) + 1.0,
          heading: PIER_HEADING, boss: false });
      }
    }
  });
  out.push({ id: out.length, sec: 6, s: TIP.S_END + 4.2, o: TIP.C, side: 0, topO: TIP.C, topY: DECK + 1.0, heading: PIER_HEADING + Math.PI / 2, boss: true });
  return out;
}
export const SLOTS = buildSlots();

export function slotXZ(sl) { return pierAt(sl.s, sl.o); }

// Ladder base (on the ship) and top (at the pier edge), world; `f` = how far it is raised.
export function ladderEnds(s, lad, out = {}) {
  const sl = SLOTS[s.slot], sc = s.L / 16;
  const ch = Math.cos(s.heading), sh = Math.sin(s.heading);
  let bx = s.x + ch * lad.u, bz = s.z + sh * lad.u;
  const p = pierFrame(bx, bz);
  let tx, tz;
  if (sl.boss) { [tx, tz] = pierAt(TIP.S_END - 0.8, p.o); }
  else { [tx, tz] = pierAt(p.s, sl.topO); }
  const dx = tx - bx, dz = tz - bz, d = Math.hypot(dx, dz) || 1;
  bx += (dx / d) * 1.3 * sc; bz += (dz / d) * 1.3 * sc;
  out.bx = bx; out.by = 1.1 * sc; out.bz = bz; out.tx = tx; out.ty = sl.topY; out.tz = tz;
  return out;
}
const _le = {};
export function climberPos(s, lad) {
  const e = ladderEnds(s, lad, _le), k = clamp(lad.climb, 0, 1) * 0.92;
  return { x: e.bx + (e.tx - e.bx) * k, y: e.by + (e.ty - e.by) * k + 0.9, z: e.bz + (e.tz - e.bz) * k };
}

// Is (x, y, z) on section i's burnable mass (with a margin)?
function inBld(i, x, y, z, m) {
  const b = SECTIONS[i].bld, p = pierFrame(x, z);
  return p.s >= b[0] - m && p.s <= b[1] + m && p.o >= b[2] - m && p.o <= b[3] + m && y <= b[4] + 1.5 && y >= DECK - 4.5;
}
export function sectionAt(x, z, m = 0) {
  const p = pierFrame(x, z), e = pierEdges(p.s);
  if (!e || p.o < e[0] - m || p.o > e[1] + m) return -1;
  for (let i = 0; i < SECTIONS.length; i++) if (p.s >= SECTIONS[i].s0 && p.s < SECTIONS[i].s1) return i;
  return p.s < SECTIONS[0].s0 && p.s > SECTIONS[0].s0 - 10 ? 0 : -1;
}
// Nearest point of section i's burnable mass to (x, z), at a sensible aim height.
export function sectionAim(i, x, z) {
  const b = SECTIONS[i].bld, p = pierFrame(x, z);
  const s = clamp(p.s, b[0] + 1, b[1] - 1), o = clamp(p.o, b[2] + 0.5, b[3] - 0.5);
  const [ax, az] = pierAt(s, o);
  return { x: ax, y: Math.min(b[4], DECK + 5), z: az };
}
export function sectionCentre(i) {
  const b = SECTIONS[i].bld, [x, z] = pierAt((b[0] + b[1]) / 2, (b[2] + b[3]) / 2);
  return { x, z, y: b[4] };
}

export const SiegeMethods = {
  _initSiege() {
    this.pier = {
      sections: SECTIONS.map((d, i) => ({ i, hp: d.hp, maxHp: d.hp, fire: 0, peak: 0, char: 0, collapsed: false, collapseT: 0, burnT: 0 })),
      occ: SLOTS.map(() => -1),
      burningT: -99,
    };
    this.pierShots = []; this.water = [];
    this.tank = this.T.water.tank; this.sprayT = 0; this.sprayAcc = 0; this.spraying = false;
  },

  get pierHp() { let h = 0; for (const q of this.pier.sections) h += Math.max(0, q.hp); return h; },
  get pierMaxHp() { let h = 0; for (const q of this.pier.sections) h += q.maxHp; return h; },
  get pierFrac() { return this.pierHp / this.pierMaxHp; },
  get collapsedCount() { let n = 0; for (const q of this.pier.sections) if (q.collapsed) n++; return n; },
  get burningCount() { let n = 0; for (const q of this.pier.sections) if (!q.collapsed && q.fire > 0.05) n++; return n; },

  // ---- where a ship goes ------------------------------------------------------------
  _pickSlot(s) {
    const rng = this.rng, occ = this.pier.occ, P = pierFrame(s.x, s.z);
    let best = -1, bw = -1;
    for (const sl of SLOTS) {
      if (occ[sl.id] >= 0 || this.pier.sections[sl.sec].collapsed) continue;
      if (sl.boss !== (s.kind === 'boss')) continue;
      const tipFront = P.s > TIP.S_END - 5;
      const sideOk = sl.boss || tipFront || (sl.side < 0 ? P.o < 5.5 : P.o > 5.5) || (sl.s < 128 && (sl.side < 0 ? P.o < 0 : P.o > 0));
      if (!sideOk) continue;
      const [x, z] = slotXZ(sl);
      const w = (0.35 + rng()) / (40 + Math.hypot(x - s.x, z - s.z));
      if (w > bw) { bw = w; best = sl.id; }
    }
    if (s.slot >= 0 && s.slot !== best && occ[s.slot] === s.id) occ[s.slot] = -1;
    s.slot = best;
    if (best >= 0) { occ[best] = s.id; s.sec = SLOTS[best].sec; s.wp = 0; }
    else if (s.sec < 0 || this.pier.sections[s.sec].collapsed) s.sec = this._nearestStanding(s.x, s.z);
    s.retryT = 3;
  },

  _nearestStanding(x, z) {
    let best = -1, bd = Infinity;
    this.pier.sections.forEach((q, i) => {
      if (q.collapsed) return;
      const c = sectionCentre(i), d = Math.hypot(c.x - x, c.z - z);
      if (d < bd) { bd = d; best = i; }
    });
    return best;
  },

  // Rowing steer for a ship with a target: waypoints, glide in, tie up. Returns true
  // when it moved the ship itself (the glide), false to let the normal rowing run.
  _siegeSteer(s, dt) {
    const T = this.T.siege;
    if (s.slot < 0) {
      s.retryT -= dt;
      if (s.retryT <= 0) this._pickSlot(s);
      if (s.slot < 0) {                                   // no berth free: stand off and bombard
        const i = s.sec >= 0 ? s.sec : this._nearestStanding(s.x, s.z);
        if (i < 0) { s.tx = s.x + Math.cos(s.heading) * 50; s.tz = s.z + Math.sin(s.heading) * 50; s.ttb = Infinity; return false; }
        const c = sectionCentre(i), p = pierFrame(s.x, s.z), side = p.o < 5.5 ? -1 : 1;
        const [tx, tz] = pierAt(clamp(p.s, SECTIONS[i].s0, SECTIONS[i].s1 + 20), (side < 0 ? -14 : 25) + side * T.standOff);
        s.tx = tx; s.tz = tz; s.ttb = Infinity;
        if (Math.hypot(tx - s.x, tz - s.z) < 10) s.hold = true; else s.hold = false;
        void c;
        return false;
      }
    }
    if (this.pier.sections[SLOTS[s.slot].sec].collapsed) { this._pickSlot(s); return false; }
    s.hold = false;
    const sl = SLOTS[s.slot], [sx, sz] = slotXZ(sl);
    const d = Math.hypot(sx - s.x, sz - s.z);
    if (s.gliding && Math.abs(s.spin) > 0.6) s.gliding = false;           // rammed off her approach
    if (!s.gliding && d < T.glideR && s.wp >= 2) s.gliding = true;
    if (s.gliding) {
      const k = 1 - Math.exp(-dt * T.glideRate);
      const nx = s.x + (sx - s.x) * k, nz = s.z + (sz - s.z) * k;
      s.speed = Math.hypot(nx - s.x, nz - s.z) / Math.max(1e-6, dt);
      s.x = nx; s.z = nz;
      let want = sl.heading;
      if (!sl.boss && Math.abs(wrap(want + Math.PI - s.heading)) < Math.abs(wrap(want - s.heading))) want += Math.PI;
      const e = wrap(want - s.heading), r = 0.9 * dt;
      s.heading = wrap(s.heading + clamp(e, -r, r));
      s.ttb = Math.log(Math.max(1, d / T.moorDist)) / T.glideRate;
      if (d < T.moorDist && Math.abs(e) < 0.12) this._moor(s);
      return true;
    }
    // waypoints: 0 = round the pier head if in front of it, 1 = off the berth, 2 = the berth
    const P = pierFrame(s.x, s.z);
    const off = sl.boss ? [sl.s + 30, sl.o] : [sl.s + (P.s > sl.s ? 12 : -12), sl.o + sl.side * T.approachOff];
    if (s.wp === 0) {
      const mySide = P.o < 5.5 ? -1 : 1;
      if (!sl.boss && mySide !== sl.side) {                // berth on the far side: row round the pier head
        const ahead = P.s > TIP.S_END + 18;
        const [wx, wz] = pierAt(TIP.S_END + 30, (ahead ? sl.side : mySide) < 0 ? -32 : 42);
        s.tx = wx; s.tz = wz;
        if (ahead && Math.hypot(wx - s.x, wz - s.z) < 16) s.wp = 1;
      } else s.wp = 1;
    }
    if (s.wp === 1) {
      const [wx, wz] = pierAt(off[0], off[1]);
      s.tx = wx; s.tz = wz;
      if (Math.hypot(wx - s.x, wz - s.z) < 12 || d < T.glideR * 0.9) s.wp = 2;
    }
    if (s.wp === 2) { s.tx = sx; s.tz = sz; }
    const [ax, az] = pierAt(off[0], off[1]);
    const rest = s.wp >= 2 ? Math.max(0, d - T.glideR) : Math.hypot(ax - s.x, az - s.z) + Math.hypot(sx - ax, sz - az) - T.glideR;
    s.ttb = rest / Math.max(0.5, s.cruise) + Math.log(T.glideR / T.moorDist) / T.glideRate;
    return false;
  },

  _moor(s) {
    const T = this.T.siege, sl = SLOTS[s.slot], rng = this.rng;
    const [sx, sz] = slotXZ(sl);
    s.x = sx; s.z = sz; s.speed = 0; s.kvx = 0; s.kvz = 0; s.spin = 0;
    s.state = 'landed'; s.moored = true; s.gliding = false; s.stateT = 0; s.ttb = 0;
    s.mx = sx; s.mz = sz;
    const n = T.ladders[s.kind];
    s.ladders = [];
    for (let i = 0; i < n; i++) s.ladders.push({ u: (n === 1 ? 0 : (i / (n - 1) - 0.5)) * s.L * 0.55, up: 0, climb: 0, cool: 0.4 + i * 0.7 + rng() * 0.4, down: 0 });
    s.pierT = Math.min(s.pierT, 1.5);
    this.stats.moorings++;
    this._emit('moored', { ship: s.id, kind: s.kind, section: sl.sec, name: SECTIONS[sl.sec].name, x: +sx.toFixed(2), z: +sz.toFixed(2) });
  },

  _castOff(s) {
    if (s.slot >= 0 && this.pier.occ[s.slot] === s.id) this.pier.occ[s.slot] = -1;
    s.state = 'rowing'; s.moored = false; s.ladders = null; s.gliding = false; s.stateT = 0; s.slot = -1; s.sec = -1; s.wp = 0;
    const out = Math.atan2(s.z - (pierAt(150, 5)[1]), s.x - pierAt(150, 5)[0]);
    s.heading = wrap(out); s.speed = s.cruise * 0.5;
    this._pickSlot(s);
    this._emit('castOff', { ship: s.id });
  },

  _releaseSlot(s) {
    if (s.slot >= 0 && this.pier.occ[s.slot] === s.id) this.pier.occ[s.slot] = -1;
    if (s.ladders) for (const l of s.ladders) l.up = 0;
    s.ladders = null;
  },

  // Keep a ship's keel (bow, middle, stern) outside the pier deck outline.
  _pierPush(s) {
    const r = 1.7 * (s.L / 16) + 0.4, ch = Math.cos(s.heading), sh = Math.sin(s.heading), half = s.L * 0.42;
    let push = 0;
    for (const u of [-half, 0, half]) {
      const p = pierFrame(s.x + ch * u, s.z + sh * u);
      if (p.s < -r || p.s > TIP.S_END + r) continue;
      const e = pierEdges(clamp(p.s, 0, TIP.S_END - 0.01));
      if (!e) continue;
      const lo = e[0] - r, hi = e[1] + r;
      if (p.o <= lo || p.o >= hi) continue;
      const mid = (e[0] + e[1]) / 2, dp = p.o < mid ? lo - p.o : hi - p.o;
      if (Math.abs(dp) > Math.abs(push)) push = dp;
    }
    if (push) { s.x += push * ACROSS[0]; s.z += push * ACROSS[1]; }
  },

  // ---- ignition, the fire model, collapse ------------------------------------------------
  ignite(i, amount, how) {
    const q = this.pier.sections[i];
    if (!q || q.collapsed || !this.playing) return;
    const was = q.fire;
    q.fire = Math.min(1, q.fire + amount);
    if (q.fire > q.peak) q.peak = q.fire;
    if (was <= 0.02 && q.fire > 0.02) { this.stats.fireStarts++; this._emit('ignite', { section: i, how, name: SECTIONS[i].name }); }
  },

  // STRUCTURAL damage to a standing section (tr136). ignite() above was the only way into the
  // pier's health and it only ever set fire; a round shot is a hole, not a flame, so the guns
  // needed an entry point of their own. This is deliberately ignite()'s twin - same signature,
  // same three guards, same section record, same _collapse() - so cannon damage runs through
  // the siege's own health and collapse system and there is no parallel model to keep in step.
  // `amount` is a PERCENTAGE of that section's maxHp, so it scales with the big head sections
  // exactly as the burn rate does (_fireTick below uses the same maxHp/100 convention).
  strike(i, amount, how) {
    const q = this.pier.sections[i];
    if (!q || q.collapsed || !this.playing) return 0;
    const before = q.hp;
    q.hp = Math.max(0, q.hp - amount * (q.maxHp / 100));
    q.char = Math.min(1, q.char + 0.04);
    this.stats.roundsLanded++;
    this._emit('struck', { section: i, name: SECTIONS[i].name, how, dmg: +(before - q.hp).toFixed(2), hp: +q.hp.toFixed(1), maxHp: q.maxHp });
    if (q.hp <= 0) this._collapse(i);
    return before - q.hp;
  },

  _fireTick(dt) {
    const F = this.T.fire, secs = this.pier.sections, playing = this.playing;
    const add = new Float64Array(secs.length);
    for (let i = 0; i < secs.length; i++) {
      const q = secs[i];
      if (q.collapsed) { q.collapseT += dt; continue; }
      if (q.fire <= 0) continue;
      q.burnT += dt;
      q.fire = Math.min(1, q.fire + F.grow * q.fire * (1.15 - q.fire) * dt);
      if (q.fire > q.peak) q.peak = q.fire;
      q.char = Math.min(1, q.char + F.charRate * q.fire * dt);
      if (q.fire > F.spreadAt) {
        const amt = F.spread * (q.fire - F.spreadAt) * dt;
        if (i > 0 && !secs[i - 1].collapsed) add[i - 1] += amt;
        if (i < secs.length - 1 && !secs[i + 1].collapsed) add[i + 1] += amt;
      }
      if (playing) q.hp -= F.burnDps * q.fire * (q.maxHp / 100) * dt;
      if (q.hp <= 0 && playing) this._collapse(i);
    }
    for (let i = 0; i < secs.length; i++) if (add[i] > 0) this.ignite(i, add[i], 'spread');
    if (playing && this.burningCount >= 3 && this.time - this.pier.burningT > 25) {
      this.pier.burningT = this.time;
      this._emit('pierBurning', { burning: this.burningCount });
    }
  },

  _collapse(i) {
    const q = this.pier.sections[i];
    q.hp = 0; q.collapsed = true; q.fire = 0; q.char = 1; q.collapseT = 0;
    this.stats.sectionsLost++;
    this.combo = 0; this.comboT = 0;
    const c = sectionCentre(i);
    this._emit('collapse', { section: i, name: SECTIONS[i].name, x: +c.x.toFixed(2), z: +c.z.toFixed(2), left: SECTIONS.length - this.collapsedCount });
    for (const s of this.ships) if (s.moored && s.sec === i && s.state === 'landed') this._castOff(s);
    this._checkPier();
  },

  _checkPier() {
    if (!this.playing) return;
    if (this.collapsedCount >= this.T.loseCollapsed || this.pierHp <= 0) { this.outcome = 'lost'; this.phase = 'lost'; this.phaseT = 0; this._emit('pierLost', { collapsed: this.collapsedCount }); }
  },

  // ---- the raiders' fire: pots and flaming arrows, ladders ---------------------------------
  _pierAttacks(dt) {
    const T = this.T, S = T.siege, spec = this.spec, rng = this.rng;
    for (const s of this.ships) {
      const moored = s.moored && s.state === 'landed';
      if (s.state !== 'rowing' && !moored) continue;
      if (moored && s.ladders) this._ladders(s, dt);
      this._broadside(s, dt);          // tr136: the pirate guns, on their own timer
      // tr141: an ALLY has a battery and nothing else in this function. She never lobs a fire
      // pot, never looses a flaming arrow and never raises a ladder - she came to save the pier.
      if (s.ally) continue;
      s.pierT -= dt;
      if (s.pierT > 0) continue;
      let i = s.sec;
      if (i < 0 || this.pier.sections[i].collapsed) i = s.sec = this._nearestStanding(s.x, s.z);
      if (i < 0) { s.pierT = 2; continue; }
      const c = sectionAim(i, s.x, s.z), d = Math.hypot(c.x - s.x, c.z - s.z);
      const mul = spec.pierMul;
      if (s.kind === 'boss') {
        if (d > S.bossRange) { s.pierT = 0.5; continue; }
        const head = [3, 4, 5, 6].filter((k) => !this.pier.sections[k].collapsed);
        if (!head.length) head.push(i);
        for (let k = 0; k < S.barragePots; k++) this._lob(s, head[k % head.length], 'pot', 3.5);
        for (let k = 0; k < S.barrageArrows; k++) this._lob(s, head[(k + 1) % head.length], 'farrow', 5);
        s.pierT = S.barrageEvery * mul;
        this.stats.barrages++;
        this._emit('barrage', { ship: s.id, x: +s.x.toFixed(1), z: +s.z.toFixed(1) });
        continue;
      }
      if (moored) { this._lob(s, i, 'pot', 2.5); s.pierT = S.mooredPotEvery * mul * (0.8 + rng() * 0.4); continue; }
      if (d < S.potRange && spec.pierMix.includes('pot') && rng() < 0.6) {
        this._lob(s, i, 'pot', S.potErr);
        if (s.kind === 'jarl') this._lob(s, i, 'pot', S.potErr);
        s.pierT = (S.reload[0] + rng() * (S.reload[1] - S.reload[0])) * mul;
      } else if (d < S.arrowRange) {
        const n = 2 + (rng() < 0.5 ? 1 : 0);
        for (let k = 0; k < n; k++) this._lob(s, i, 'farrow', S.arrowErr);
        s.pierT = (S.reload[0] + rng() * (S.reload[1] - S.reload[0])) * mul;
      } else s.pierT = 0.5 + rng() * 0.5;
    }
  },

  // ---- THE BROADSIDE (tr136) ----------------------------------------------------------------
  // One ship's battery, on its own timer beside the pots and arrows. A volley is ROLLING: the
  // guns go off one at a time down the engaged side, ~0.09-0.20 s apart, so six guns take about
  // a second and read as a ship's battery rather than one explosion.
  //
  // It fires only when the section is ON THE BEAM, which is what a broadside means and what
  // makes it legible: the player can see which way a brig is lying and know whether her guns
  // bear. A moored ship is broadside-on by construction, so she is the one who hammers.
  //
  // NO TARGETING HAPPENS HERE beyond "which pier section". The aim point comes from
  // SECTIONS[i].bld - a fixed box of pier geometry - and from nothing else. This function never
  // reads this.swimmers, this.wreck, this.sharks or any other ship.
  _broadside(s, dt) {
    const B = this.T.broadside, spec = this.spec, rng = this.rng;
    // Faction capability, then the wave gate. The gate is read from THIS GAME'S tuning, not
    // from spec.guns: waveSpec() is a pure function over the module-level TUNING, so a spec
    // flag could not be turned off by opts.tuning and the A/B measurement in RESULT.md could
    // not be taken at all. spec.guns exists for the HUD; this line is the authority.
    // tr141: an ALLIED battery is gated by the ARRIVAL BEAT instead - she sails in silently and
    // opens fire when the fleet is in the fight, which is what makes the arrival an event.
    if (s.ally) { if (!this._alliesFiring() || (s.aly && s.aly.out)) return; }   // ...and a hull that has broken off does not fire
    else if (!this.F.guns || this.wave < B.fromWave) return;
    if (!s.bs) s.bs = { t: B.reload[0] * (0.5 + rng()), q: 0, gap: 0, side: 1, sec: -1, ship: -1, player: false, fired: 0 };
    const bs = s.bs;
    if (bs.q > 0) {                                              // a volley is rolling: keep it rolling
      bs.gap -= dt;
      while (bs.q > 0 && bs.gap <= 0) {
        this._gun(s, bs.sec, bs.side, bs.fired++);
        bs.q--;
        bs.gap += B.gap[0] + rng() * (B.gap[1] - B.gap[0]);
      }
      if (bs.q <= 0) {
        const E = this.T.engage;
        const r = (bs.ship >= 0 || bs.player) ? (s.ally ? E.allyReload : E.foeReload) : s.moored ? B.mooredReload : B.reload;
        bs.t = (r[0] + rng() * (r[1] - r[0])) * (s.ally ? 1 : spec.pierMul);
        this._emit('volleyEnd', { ship: s.id, ally: !!s.ally });
      }
      return;
    }
    bs.t -= dt;
    if (bs.t > 0) return;
    const tgt = this._bsTarget(s);
    if (!tgt) { bs.t = 1.0; return; }
    const dx = tgt.x - s.x, dz = tgt.z - s.z, d = Math.hypot(dx, dz) || 1e-6;
    const ch = Math.cos(s.heading), sh = Math.sin(s.heading);
    const along = (dx * ch + dz * sh) / d;                       // 0 = dead abeam, +-1 = end-on
    if (Math.abs(along) > B.beamCone) { bs.t = 1.0; return; }    // her guns do not bear
    bs.side = (dx * -sh + dz * ch) >= 0 ? 1 : -1;                // which battery is engaged (+1 = starboard)
    bs.sec = tgt.sec; bs.ship = tgt.ship; bs.player = !!tgt.player;
    if (tgt.ship < 0 && !tgt.player) s.sec = tgt.sec;
    bs.q = (B.guns[s.kind] || B.guns.ship);
    bs.gap = 0; bs.fired = 0;
    this.stats.volleys++;
    if (s.ally) { this.stats.allyVolleys++; if (this.allyFleet) this.allyFleet.volleys++; }
    this._emit('volley', { ship: s.id, section: bs.sec, name: bs.sec >= 0 ? SECTIONS[bs.sec].name : '', guns: bs.q, side: bs.side,
      moored: !!s.moored, ally: !!s.ally, target: bs.ship, atPlayer: !!bs.player, x: +s.x.toFixed(2), z: +s.z.toFixed(2) });
  },

  // WHAT THIS BATTERY IS LAID ON: a pier section, or another hull. This is the FIRST target
  // selection a ship has ever made against another ship - before tr141 a ship fought the pier
  // and the player and nothing else - so it is a function of its own and not a clause.
  //
  // Returns { sec, ship, x, z }: `sec` >= 0 is a pier section, `ship` >= 0 is a hull id, never
  // both. It reads this.ships, this.pier and nothing else; there is no expression in it
  // referring to swimmers, wreckage or sharks, and there is no list here but the ships.
  //
  // AN ALLY NEVER RETURNS A SECTION. She came to save the pier: shooting at it would be the
  // single worst bug this feature could have, so it is not reachable rather than unlikely.
  _bsTarget(s) {
    const B = this.T.broadside, E = this.T.engage, rng = this.rng;
    const enemy = this._nearestEnemyShip(s, E.range);
    if (s.ally) return enemy ? { sec: -1, ship: enemy.id, x: enemy.x, z: enemy.z } : null;
    // A CORSAIR: the pier is her objective and stays her objective. She breaks off for an ally
    // who has come right alongside (foeEngage), and otherwise only when the pier is out of her
    // reach - see the note on foeEngage in tuning.js for what happened without that clause.
    const close = enemy && Math.hypot(enemy.x - s.x, enemy.z - s.z) < E.foeEngage;
    if (close && rng() < E.foeShare) return { sec: -1, ship: enemy.id, x: enemy.x, z: enemy.z };
    let i = s.sec;
    if (i < 0 || this.pier.sections[i].collapsed) i = this._nearestStanding(s.x, s.z);
    if (i < 0) return enemy ? { sec: -1, ship: enemy.id, x: enemy.x, z: enemy.z } : this._bsPlayer(s);
    const a = sectionAim(i, s.x, s.z);
    const d = Math.hypot(a.x - s.x, a.z - s.z);
    if (d > B.range || d < B.minRange) return enemy ? { sec: -1, ship: enemy.id, x: enemy.x, z: enemy.z } : this._bsPlayer(s);
    return { sec: i, ship: -1, x: a.x, z: a.z };
  },

  // tr145 - THE LAST RESORT, and the corsair level's whole answer to "what do twelve guns run
  // out do when there is no pier?" A corsair with no hull of the other side in reach and no
  // structure in reach lays her battery on the PLAYER'S CRAFT.
  //
  // ⚠️ THIS ADDS NO HIT TEST, and that is the point. _roundHitsPlayer (tr136) already tests
  // EVERY round in flight against the craft; all this changes is where the rounds are aimed, so
  // the count of hit tests in the game is exactly what tmp-tr136x and tmp-tr141 left it at and
  // the no-target argument is untouched. It is also gated on the LEVEL, so a pier raid - where
  // a corsair always has a pier to shoot at while there is one standing - is bit-identical.
  _bsPlayer(s) {
    const P = this.player, E = this.T.engage;
    if (this.level !== 'gate' || !this.T.gate.playerBroadside) return null;
    if (s.ally || !P.valid || !this.playing) return null;
    const d = Math.hypot(P.x - s.x, P.z - s.z);
    if (d > E.range || d < E.minRange) return null;
    return { sec: -1, ship: -1, player: true, x: P.x, z: P.z };
  },

  // The player as a target with a hull's shape, so _gun's existing three-step lead works on her
  // unchanged. L = 4 m is the craft, not a ship: it only sets the height the round is laid at.
  _playerTarget() {
    const P = this.player;
    return { id: -1, x: P.x, z: P.z, heading: P.heading, speed: P.speed, L: 4 };
  },

  // The nearest hull on the OTHER SIDE, inside `range`. `o.ally !== s.ally` is the whole
  // side test and it is a per-ship boolean, never a faction lookup.
  _nearestEnemyShip(s, range) {
    let best = null, bd = range;
    for (const o of this.ships) {
      if (o === s || !!o.ally === !!s.ally) continue;
      if (o.state !== 'rowing' && !(o.moored && o.state === 'landed')) continue;
      const d = Math.hypot(o.x - s.x, o.z - s.z);
      if (d < bd && d > this.T.engage.minRange) { bd = d; best = o; }
    }
    return best;
  },

  // One gun. `n` is its index down the side, so the roll runs fore to aft.
  // tr141: the gun lays on the ship's CURRENT volley target - a pier section (i >= 0) or a hull
  // (s.bs.ship >= 0). The muzzle geometry, the roll and the round are identical either way.
  _gun(s, i, side, n) {
    const B = this.T.broadside, rng = this.rng, sc = s.L / 16;
    const tShip = s.bs && s.bs.ship >= 0 ? this.ships.find((o) => o.id === s.bs.ship)
      : (s.bs && s.bs.player ? this._playerTarget() : null);
    if (!tShip && (i < 0 || !this.pier.sections[i] || this.pier.sections[i].collapsed)) return;
    const guns = B.guns[s.kind] || B.guns.ship;
    // THE MUZZLE. The drawn ports run x = -4.6..+4.4 at half-beam 1.70 in the 16 m reference
    // frame (raid-pirate-ship.js); 1.70 x L/16 is also the collision capsule radius the rules
    // already hardcode at raid.js:52, so the rules and the model agree without importing GL.
    const u = (-4.6 + (9.0 * n) / Math.max(1, guns - 1)) * sc;
    const v = side * 1.70 * sc;
    const ch = Math.cos(s.heading), sh = Math.sin(s.heading);
    const x0 = s.x + ch * u - sh * v, z0 = s.z + sh * u + ch * v, y0 = 1.45 * sc;
    // THE AIM POINT is a box of pier geometry and nothing else: the section's burnable extent,
    // low down on the structure rather than up on the roof, jittered by the aim spread.
    let tx, tz, ty, short = rng() < B.missFrac;      // laid short or wide: this one is a splash
    if (tShip) {
      // A HULL. The aim point is the enemy's waterline, led by his own velocity over the round's
      // flight - the same three-step lead the thrown weapons use - and jittered by the spread.
      const E = this.T.engage, ts2 = tShip.L / 16;
      const tvx = Math.cos(tShip.heading) * tShip.speed, tvz = Math.sin(tShip.heading) * tShip.speed;
      let ax = tShip.x, az = tShip.z, ft = 0.3;
      for (let k = 0; k < 3; k++) { ft = Math.max(0.15, Math.hypot(ax - x0, az - z0) / B.speed); ax = tShip.x + (E.lead ? tvx * ft : 0); az = tShip.z + (E.lead ? tvz * ft : 0); }
      const sp = B.spread * 0.55;
      tx = ax + (rng() - 0.5) * 2 * sp + (short ? (rng() - 0.5) * 22 : 0);
      tz = az + (rng() - 0.5) * 2 * sp + (short ? (rng() - 0.5) * 22 : 0);
      ty = short ? -0.2 : 0.9 * ts2;
    } else {
      // THE AIM POINT is a box of pier geometry and nothing else: the section's burnable extent,
      // low down on the structure rather than up on the roof, jittered by the aim spread.
      const b = SECTIONS[i].bld, a = sectionAim(i, s.x, s.z), p = pierFrame(a.x, a.z);
      const [ts, to] = crowdClear(clamp(p.s + (rng() - 0.5) * 2 * B.spread, b[0], b[1]), clamp(p.o + (rng() - 0.5) * 2 * B.spread, b[2] - 1, b[3] + 1), b[0], b[1], b[2] - 1, b[3] + 1);
      const wide = short ? (p.o > b[3] ? 1 : -1) * (7 + rng() * 9) : 0;
      [tx, tz] = pierAt(ts + (short ? (rng() - 0.5) * 14 : 0), to + wide);
      ty = short ? -0.2 : DECK + 0.4 + rng() * 2.2;
    }
    const t = Math.max(0.22, Math.hypot(tx - x0, tz - z0) / B.speed);
    this.pierShots.push({ id: this._id(), kind: 'shot', from: s.id, sec: tShip ? -1 : i, tship: tShip && tShip.id >= 0 ? tShip.id : -1,
      fromAlly: !!s.ally, x: x0, y: y0, z: z0,
      vx: (tx - x0) / t, vy: (ty - y0) / t + 0.5 * G * t, vz: (tz - z0) / t, age: 0, flight: t, dead: false });
    // The event carries the SHIP'S OWN VELOCITY so the muzzle smoke is launched with her and
    // travels with her. tr59's hull smoke was left in the water behind a moving ship and filled
    // the chase camera with a trail of puffs she had already sailed out of.
    this._emit('gun', { ship: s.id, section: i, n, side, x: +x0.toFixed(2), y: +y0.toFixed(2), z: +z0.toFixed(2),
      nx: +(-sh * side).toFixed(3), nz: +(ch * side).toFixed(3), sx: +(ch * s.speed).toFixed(2), sz: +(sh * s.speed).toFixed(2), sc: +sc.toFixed(3), ally: !!s.ally });
  },

  _lob(s, i, kind, err) {
    const S = this.T.siege, rng = this.rng, sc = s.L / 16;
    const a = sectionAim(i, s.x, s.z), b = SECTIONS[i].bld;
    const p = pierFrame(a.x, a.z);
    const [ts, to] = crowdClear(clamp(p.s + (rng() - 0.5) * 2 * err, b[0], b[1]), clamp(p.o + (rng() - 0.5) * 2 * err, b[2] - 1, b[3] + 1), b[0], b[1], b[2] - 1, b[3] + 1);   // tr62
    const [tx, tz] = pierAt(ts, to);
    const ty = b[4] - 0.5 - rng() * 1.5;
    const ch = Math.cos(s.heading), sh = Math.sin(s.heading), u = (rng() - 0.5) * s.L * 0.5;
    const x0 = s.x + ch * u, z0 = s.z + sh * u, y0 = (s.moored ? 2.6 : 2.2) * sc;
    const speed = kind === 'pot' ? S.potSpeed : S.arrowSpeed;
    const t = Math.max(0.7, Math.hypot(tx - x0, tz - z0) / speed);
    this.pierShots.push({ id: this._id(), kind, from: s.id, sec: i, x: x0, y: y0, z: z0, vx: (tx - x0) / t, vy: (ty - y0) / t + 0.5 * G * t, vz: (tz - z0) / t,
      age: 0, flight: t, dead: false });
    this._emit('lob', { kind, ship: s.id, section: i, x: +x0.toFixed(2), z: +z0.toFixed(2) });
  },

  _movePierShots(dt) {
    const S = this.T.siege;
    for (const q of this.pierShots) {
      q.age += dt;
      q.vy -= G * dt;
      q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt;
      if (q.kind === 'shot' && this._roundHitsPlayer(q)) continue;   // tr136; see the note on it
      if (q.kind === 'shot' && this._roundHitsShip(q)) continue;     // tr141; see the note on it
      if (q.age >= q.flight) {
        q.dead = true;
        // tr145: `|| q.sec < 0` is a round that was never aimed at a section - a hull round
        // (tship >= 0) or a round laid on the PLAYER at the harbour mouth, where there is no
        // pier within 8 km. Without it inBld(-1, ...) reads SECTIONS[-1] and throws inside the
        // sim loop; the balance harness found that on its very first run, which is the argument
        // for running the bot before believing anything.
        if (q.kind === 'shot' && (q.tship >= 0 || q.sec < 0)) { this._emit('splash', { size: 1, kind: 'shot', x: +q.x.toFixed(2), z: +q.z.toFixed(2) }); continue; }
        const i = q.sec, onIt = inBld(i, q.x, q.y, q.z, 2.0);
        if (onIt && !this.pier.sections[i].collapsed) {
          if (q.kind === 'shot') {
            const B = this.T.broadside;
            this.strike(i, B.dmg, 'shot');                 // the hole
            this.ignite(i, B.ignite, 'shot');              // ...and the splinters catch
          } else this.ignite(i, q.kind === 'pot' ? S.potIgnite : S.arrowIgnite, q.kind);
          this._emit('smash', { kind: q.kind, section: i, x: +q.x.toFixed(2), y: +q.y.toFixed(2), z: +q.z.toFixed(2) });
        } else this._emit('splash', { size: q.kind === 'shot' ? 1 : 0, kind: q.kind, x: +q.x.toFixed(2), z: +q.z.toFixed(2) });
      } else if (q.y < -0.3) { q.dead = true; this._emit('splash', { size: q.kind === 'shot' ? 1 : 0, kind: q.kind, x: +q.x.toFixed(2), z: +q.z.toFixed(2) }); }
    }
  },

  // THE ONE NEW HIT TEST IN tr136, AND THE ONLY ONE. A round in flight can strike the
  // PLAYER'S CRAFT, and nothing else that floats.
  //
  // Read this function's inputs, because they are the whole safety argument: the round `q`,
  // `this.player`, `this.T`. It does not reference this.swimmers, this.wreck, this.sharks or
  // this.ships, and it cannot - there is no list here to iterate. People in the water are in
  // `swimmers`, which this function has no expression referring to, so a round that passes
  // through a crowd of them does nothing at all. tmp-tr136x/test-pirate.mjs proves that four
  // ways: by extracting this body from the source, by firing at point-blank over a swimmer, by
  // packing swimmers along the whole impact line of a volley, and by running waves end to end
  // and counting removals.
  //
  // It is also bounded in height (B.playerY), so a round arcing over the rider's head misses,
  // and its damage is under T.heavyHit, so one round never knocks a rider off on its own.
  _roundHitsPlayer(q) {
    const B = this.T.broadside, P = this.player;
    if (!P.valid || !this.playing) return false;
    if (q.y < B.playerY[0] || q.y > B.playerY[1]) return false;
    const r = B.playerR + (P.craft === 'efoil' ? 0 : this.T.boatHitR);
    if (Math.hypot(q.x - P.x, q.z - P.z) > r) return false;
    q.dead = true;
    this._hurt(B.playerDmg, 'shot', q.x, q.z);
    this._emit('roundHitPlayer', { x: +q.x.toFixed(2), y: +q.y.toFixed(2), z: +q.z.toFixed(2) });
    return true;
  },

  // THE SECOND NEW HIT TEST, and the only other one in the game's history (tr141). A round in
  // flight can strike a HULL ON THE OTHER SIDE from the ship that fired it - and nothing else
  // that floats.
  //
  // Read its inputs, because they are the whole safety argument: the round `q`, `this.ships`,
  // `this.T`. IT HAS EXACTLY ONE LIST AND THAT LIST IS this.ships. There is no expression here
  // referring to this.swimmers, this.wreck or this.sharks, so a round crossing a crowd of people
  // in the water does nothing at all to them - the same argument, and the same tests, as
  // _roundHitsPlayer above.
  //
  // `o.ally === q.fromAlly` is the CROSS-SIDE rule and it does two jobs. It is the answer to
  // "what happens when an ally and a corsair are both in the round's path" - the round ignores
  // its own side entirely and goes on to the first hull of the other side - and it stops a
  // crowded anchorage of corsairs sinking each other by accident, which reads as a bug and not
  // as drama. Neither fleet can commit friendly fire, exactly as the player cannot.
  _roundHitsShip(q) {
    if (q.tship < 0 && q.sec >= 0) return false;
    for (const o of this.ships) {
      if (o.id === q.from || !!o.ally === !!q.fromAlly) continue;
      if (o.state !== 'rowing' && !(o.moored && o.state === 'landed')) continue;
      const sc = o.L / 16, half = Math.max(0, o.L / 2 - 1.15 * sc);
      if (Math.abs(o.x - q.x) > o.L / 2 + 4 || Math.abs(o.z - q.z) > o.L / 2 + 4) continue;
      if (q.y > 6 * sc || q.y < -0.6) continue;
      const ax = Math.cos(o.heading), az = Math.sin(o.heading);
      const wx = q.x - o.x, wz = q.z - o.z;
      const u = clamp(wx * ax + wz * az, -half, half);
      if (Math.hypot(wx - ax * u, wz - az * u) > 1.7 * sc + this.T.engage.hitR) continue;
      q.dead = true;
      if (q.fromAlly) this.stats.allyHits++; else this.stats.foeHitsOnAlly++;
      if (q.fromAlly && this.allyFleet) this.allyFleet.hits++;
      this._damage(o, this.T.engage.dmg, 'shot', q.x, Math.max(0.5, q.y), q.z, false);
      this._emit('shipStruck', { ship: o.id, kind: o.kind, ally: !!o.ally, fromAlly: !!q.fromAlly,
        x: +q.x.toFixed(2), y: +Math.max(0.5, q.y).toFixed(2), z: +q.z.toFixed(2) });
      return true;
    }
    return false;
  },

  _ladders(s, dt) {
    const S = this.T.siege;
    for (const l of s.ladders) {
      if (l.cool > 0) { l.cool -= dt; continue; }
      if (l.up < 1) { l.up = Math.min(1, l.up + dt / S.raiseSec); continue; }
      l.climb += dt / S.climbSec;
      if (l.climb >= 1) {
        l.climb = 0; l.cool = S.climbCool;
        this.ignite(s.sec, S.climbIgnite, 'ladder');
        const e = ladderEnds(s, l, {});
        this._emit('climbFire', { ship: s.id, section: s.sec, x: +e.tx.toFixed(2), y: +e.ty.toFixed(2), z: +e.tz.toFixed(2) });
      }
    }
  },

  // ---- the water cannon ----------------------------------------------------------------------
  _waterTick(dt, water, playing) {
    const W = this.T.water, P = this.player;
    const want = playing && water && P.downT <= 0;
    if (want && this.tank > 0) {
      if (!this.spraying) this._emit('sprayOn', {});
      this.spraying = true; this.sprayT = 0;
      this.sprayAcc += dt;
      while (this.sprayAcc >= 1 / W.rate && this.tank > 0) {
        this.sprayAcc -= 1 / W.rate;
        this._emitPacket();
        this.tank = Math.max(0, this.tank - W.drain / W.rate);
        this.stats.waterUsed += W.drain / W.rate;
      }
      if (this.tank <= 0) this._emit('tankEmpty', {});
    } else {
      if (this.spraying) this._emit('sprayOff', {});
      this.spraying = false; this.sprayAcc = 0;
      this.sprayT += dt;
      if (this.sprayT > W.refillDelay) this.tank = Math.min(W.tank, this.tank + W.refill * dt);
    }
    this._moveWater(dt);
  },

  // Auto-aim: a fire pot in the air, else a warrior on a ladder, else the nearest
  // burning section, inside the nozzle's cone and reach; else straight ahead.
  _waterAim() {
    const W = this.T.water, P = this.player;
    const inCone = (x, z, r) => { const d = Math.hypot(x - P.x, z - P.z); return d <= r && Math.abs(wrap(Math.atan2(z - P.z, x - P.x) - P.heading)) <= W.cone ? d : -1; };
    let best = null, bd = Infinity;
    for (const q of this.pierShots) {
      if (q.age < 0.15) continue;
      const t = Math.hypot(q.x - P.x, q.z - P.z) / W.speed;
      const x = q.x + q.vx * t, z = q.z + q.vz * t, y = q.y + q.vy * t - 0.5 * G * t * t;
      const d = inCone(x, z, W.potReach);
      if (d >= 0 && d < bd && y > 0.5) { bd = d; best = { x, y, z, kind: 'pot', id: q.id }; }
    }
    if (best) return best;
    for (const s of this.ships) {
      if (!(s.moored && s.state === 'landed' && s.ladders)) continue;
      for (const l of s.ladders) {
        if (l.up < 1 || l.climb < 0.04) continue;
        const c = climberPos(s, l), d = inCone(c.x, c.z, W.range);
        if (d >= 0 && d < bd) { bd = d; best = { x: c.x, y: c.y, z: c.z, kind: 'climber' }; }
      }
    }
    if (best) return best;
    this.pier.sections.forEach((q, i) => {
      if (q.collapsed || q.fire <= 0.01) return;
      const a = sectionAim(i, P.x, P.z), d = inCone(a.x, a.z, W.range + 6);
      if (d >= 0 && d < bd) { bd = d; best = { ...a, kind: 'fire', section: i }; }
    });
    return best;
  },

  _emitPacket() {
    const W = this.T.water, P = this.player, boat = P.craft !== 'efoil';
    const ch = Math.cos(P.heading), sh = Math.sin(P.heading);
    const x0 = P.x + ch * (boat ? 2.4 : 0.9), z0 = P.z + sh * (boat ? 2.4 : 0.9), y0 = boat ? 2.0 : 1.5;
    const aim = this._waterAim();
    const id = this._id();
    const jit = (((id * 2654435761) >>> 0) % 1000) / 1000 - 0.5, jit2 = (((id * 40503 + 7) >>> 0) % 1000) / 1000 - 0.5;
    let a = P.heading + jit * W.jitter, vh = W.speed, vy = W.loft, t;
    if (aim) {
      const d = Math.max(3, Math.hypot(aim.x - x0, aim.z - z0));
      a = Math.atan2(aim.z - z0, aim.x - x0) + jit * W.jitter;
      vh = Math.min(W.speed, Math.max(14, d / 0.35));
      t = d / vh;
      vy = (aim.y + jit2 * 0.8 - y0) / t + 0.5 * G * t;
    }
    this.water.push({ id, x: x0, y: y0, z: z0, vx: Math.cos(a) * vh + P.vx * 0.5, vy, vz: Math.sin(a) * vh + P.vz * 0.5, age: 0, dead: false, aim: aim ? aim.kind : 'none' });
    this.stats.packets++;
  },

  _moveWater(dt) {
    const W = this.T.water, secs = this.pier.sections;
    for (const w of this.water) {
      w.age += dt;
      w.vy -= G * dt;
      w.x += w.vx * dt; w.y += w.vy * dt; w.z += w.vz * dt;
      // fire pots in the air
      for (const q of this.pierShots) {
        if (q.dead) continue;
        if ((q.x - w.x) ** 2 + (q.y - w.y) ** 2 + (q.z - w.z) ** 2 <= W.potR * W.potR) {
          q.dead = true; w.dead = true; this.stats.potsDoused++;
          const pts = this._score(this.T.potScore, false);
          this._emit('potDoused', { kind: q.kind, points: pts, x: +q.x.toFixed(2), y: +q.y.toFixed(2), z: +q.z.toFixed(2) });
          break;
        }
      }
      if (w.dead) continue;
      // warriors on ladders (knocked into the water, unharmed)
      for (const s of this.ships) {
        if (!(s.moored && s.state === 'landed' && s.ladders)) continue;
        if (Math.abs(s.x - w.x) > s.L && Math.abs(s.z - w.z) > s.L) continue;
        for (const l of s.ladders) {
          if (l.up < 1 || l.climb < 0.04) continue;
          const c = climberPos(s, l);
          if ((c.x - w.x) ** 2 + (c.y - w.y) ** 2 + (c.z - w.z) ** 2 <= W.climberR * W.climberR) { this._knockOff(s, l, c); w.dead = true; break; }
        }
        if (w.dead) break;
      }
      if (w.dead) continue;
      // burning (or not) pier sections
      if (w.y < DECK + 18 && w.y > DECK - 4.5) {
        for (let i = 0; i < secs.length; i++) {
          if (secs[i].collapsed || !inBld(i, w.x, w.y, w.z, W.footprint)) continue;
          w.dead = true;
          const q = secs[i];
          if (q.fire > 0) {
            q.fire = Math.max(0, q.fire - W.douse);
            this.stats.doused += W.douse;
            if (this.stats.packets % 4 === 0) this._emit('steam', { section: i, x: +w.x.toFixed(2), y: +w.y.toFixed(2), z: +w.z.toFixed(2) });
            if (q.fire <= 0) {
              q.fire = 0;
              if (q.peak >= 0.15) {             // a real fire, not a spark: counts, scores and cheers
                this.stats.firesOut++;
                const pts = this._score(this.T.fireOutScore * (q.peak > 0.5 ? 2 : 1), true);
                this._emit('fireOut', { section: i, name: SECTIONS[i].name, points: pts, peak: +q.peak.toFixed(2), x: +w.x.toFixed(2), y: +w.y.toFixed(2), z: +w.z.toFixed(2) });
              }
              q.peak = 0; q.burnT = 0;
            }
          }
          break;
        }
      }
      if (!w.dead && (w.y < -0.2 || w.age > 4)) { w.dead = true; if (w.y < 0 && this.stats.packets % 3 === 0) this._emit('spray', { x: +w.x.toFixed(2), z: +w.z.toFixed(2) }); }
    }
    this.water = this.water.filter((w) => !w.dead);
  },

  _knockOff(s, l, c) {
    const S = this.T.siege, rng = this.rng;
    l.climb = 0; l.up = 0; l.cool = S.knockCool; l.down = 1;
    this.stats.knockedOff++;
    const e = ladderEnds(s, l, {});
    const ax = e.bx - e.tx, az = e.bz - e.tz, al = Math.hypot(ax, az) || 1;
    const x = e.bx + (ax / al) * 1.8, z = e.bz + (az / al) * 1.8;
    this.swimmers.push({ id: this._id(), ship: s.id, x, z, vx: (ax / al) * 2.4, vz: (az / al) * 2.4 + 0.6, age: 0, state: 'thrown', stateT: 0,
      phase: rng() * TAU, plank: -1, pu: 0, pv: 0, panicT: 0, wait: 0.8 + rng() * 0.8, grabT: 3, dead: false, fromLadder: true, fx: c.x, fy: c.y, fz: c.z });
    const pts = this._score(this.T.knockScore, false);
    this._emit('knockOff', { ship: s.id, points: pts, x: +c.x.toFixed(2), y: +c.y.toFixed(2), z: +c.z.toFixed(2), sx: +x.toFixed(2), sz: +z.toFixed(2) });
  },

  // ---- repair power-ups -----------------------------------------------------------------------
  _collectSiege(kind) {
    const P = this.player, secs = this.pier.sections;
    if (kind === 'water') { this.tank = this.T.water.tank; return { tank: this.tank }; }
    if (kind === 'douse') {
      let best = -1, bd = Infinity;
      secs.forEach((q, i) => { if (q.collapsed || q.fire <= 0) return; const c = sectionAim(i, P.x, P.z), d = Math.hypot(c.x - P.x, c.z - P.z); if (d < bd) { bd = d; best = i; } });
      if (best >= 0) { secs[best].fire = 0; secs[best].peak = 0; this.stats.firesOut++; this._emit('fireOut', { section: best, name: SECTIONS[best].name, points: 0, how: 'douse', x: +sectionCentre(best).x.toFixed(2), y: 12, z: +sectionCentre(best).z.toFixed(2) }); }
      return { section: best };
    }
    if (kind === 'rebuild') {
      let best = -1, bf = 1;
      secs.forEach((q, i) => { if (q.collapsed) return; const f = q.hp / q.maxHp; if (f < bf - 1e-9) { bf = f; best = i; } });
      if (best >= 0) { const q = secs[best]; q.hp = q.maxHp; q.char *= 0.3; q.fire = Math.min(q.fire, 0.1); this.stats.rebuilt++; }
      return { section: best };
    }
    return null;
  },
};
