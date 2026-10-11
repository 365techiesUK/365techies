// src/dolphin-pod.js — what the dolphins DO (24 Sep 2026). gl/dolphins.js draws them.
//
// Split out of gl/dolphins.js for phase 2, when the pod started reacting to the player, so the
// behaviour can be tested in node without a GPU (tmp-tr161/suites-live/test-dolphins.mjs).
// Nothing in here touches WebGL, the DOM or the sim. It reads the sea and the player's pose and
// writes only its own state: not the sim, not its hash, not the obstacle grid. Its own seeded
// RNG, so it never draws from the sim's stream. A dolphin cannot be hit and cannot block a craft.
//
// PHASE 1 (b19) is unchanged when no craft is about: a pod of six roaming open water off the
// start, breathing together every 20-40 s - a surfacing roll, now and then a leap.
//
// PHASE 2: HOW THEY TREAT A CRAFT. One thing decides it - HOW the craft is driven - which is also
// what the marine wildlife-watching codes ask of people on the water: slow and steady, no sudden
// turns, never chase, and let the animals choose to come to you.
//
//   FAST OR ERRATIC -> AVOID. A fast jet ski, or any craft thrown about near them, sends the pod
//     away: they turn off its line and BOLT - each takes one quick, low breath at a sprint, throwing
//     spray, while the craft is still well off - then bunch together and stay down, coming up only
//     for short, low breaths once it has gone by. No leaps. They settle after a few quiet seconds.
//     (Staying down alone was right but invisible: filmed on 24 Sep, a pod that had fled looked
//     exactly like a pod that had simply finished breathing.)
//
//   A STEADY BOAT -> BOW-RIDE. A boat holding its course at a moderate speed draws them in. They
//     sprint to intercept, take station in the pressure wave just ahead of and beside the bow,
//     keep pace barely beating their flukes - they are surfing it, which is why they do it - and
//     roll up to breathe every few seconds, the odd one leaping clear. A sharp turn, a big change
//     of speed, heading for the shore, or simply time, and they peel off to either side and dive.
//
//   Only the speedboat is ridden. The jet ski's bow is small and it is the craft they fear most;
//   the eFoil makes no bow wave at all. The eFoil is near-silent, though, so a rider who drifts
//   up to a pod slowly can sit among them without scattering it.

import { mulberry32 } from './rng.js';
import { SPEEDBOAT } from './boats/speedboat.js';
import { JETSKI } from './boats/jetski.js';

export const MAX_POD = 8;
export const MAX_PUFF = 96;

const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const easeInOut = (t) => t * t * (3 - 2 * t);

// ---------------------------------------------------------------------------------------
// WHERE THE POD LIVES. Open water, clear of the beach and the pier.
//   * the beach is at z ~ -245, so z >= -130 keeps them at least ~115 m out, beyond the surf
//     and the line-up;
//   * the pier crosses the waterline at about (-224, -245) and runs out to its head at about
//     (-207, -86) - the surfers' own toWorld(), with DIR (0.1063, 0.9943) - so waypoints keep
//     60 m clear of that segment;
//   * the home range is centred off the start so a player can actually find them.
export const HOME = { x: 80, z: 60, r: 230 };
export const Z_MIN = -130;
const PIER_A = [55 * 0.1063 - 230, 55 * 0.9943 - 300];
const PIER_B = [215 * 0.1063 - 230, 215 * 0.9943 - 300];
export const PIER_CLEAR = 60;
export function distToPier(x, z) {
  const ax = PIER_A[0], az = PIER_A[1], bx = PIER_B[0] - ax, bz = PIER_B[1] - az;
  const t = Math.max(0, Math.min(1, ((x - ax) * bx + (z - az) * bz) / (bx * bx + bz * bz)));
  return Math.hypot(x - (ax + bx * t), z - (az + bz * t));
}
export const openWater = (x, z) => z >= Z_MIN && distToPier(x, z) >= PIER_CLEAR && Math.hypot(x - HOME.x, z - HOME.z) <= HOME.r;
// Looser, for following a boat: clear of the beach and the pier, but allowed out of the home range.
// They will not follow a boat right out of the bay - see RIDE_RANGE.
const clearOfShore = (x, z) => z >= Z_MIN && distToPier(x, z) >= PIER_CLEAR * 0.8;
const RIDE_RANGE = HOME.r * 1.9;

// Formation slots behind the leader, in the leader's frame: [back, left]. Loose on purpose.
const SLOTS = [[0, 0], [-3.2, 2.6], [-3.4, -2.4], [-6.8, 0.6], [-5.6, 5.0], [-6.2, -4.6], [-9.6, -1.8], [-9.0, 3.2]];

// ---------------------------------------------------------------------------------------
// THE BREATH CYCLE, relative to the local sea surface. Heights are for the body CENTRE line.
// On a 2.9 m animal the back is ~0.27 m above that line and the fin tip ~0.56 m, so:
//   cruise -1.8  everything under                 rise to -0.55  the fin just starts to cut
//   roll  peak -0.07  the back and fin out, the belly still under
// The first pass peaked at +0.06, which put nearly the whole animal above the water: the pod lay
// on the surface like floats instead of arching through it. A surfacing roll shows the top of
// the head, the back and the fin, then the tail stock - never the belly. (A LEAP is the exception.)
export const CRUISE_Y = -1.8, ROLL_BASE = -0.55;
const T_RISE = 2.2, T_ROLL = 1.3, T_LEAP = 1.5, T_DIVE = 2.0;
const ROLL_H = 0.48, LEAP_H = 2.3;
export const CRUISE = 0, RISE = 1, ROLL = 2, LEAP = 3, DIVE = 4;
// Depth of the cruise between breaths, by mood. Avoiding, they go deeper; riding a bow they run
// just under the surface, where the pressure wave is.
const AVOID_Y = -2.6, RIDE_Y = -0.95;
// The longest a dolphin stays down before it must breathe, whatever else is going on. Bottlenose
// routinely dive for a minute or two; this only stops an endless avoid holding them under.
const MAX_DOWN = 70;

// ---------------------------------------------------------------------------------------
// THE CRAFT.
// Where each craft's stem is, from its OWN hull spec, not a guess: the furthest-forward point of
// the hull outline, measured from the CG that the pose reports (hull.js shifts the outline and
// the mesh by -cgX). Measured 24 Sep 2026: speedboat 3.60 m ahead, half-beam 1.22 m; jet ski
// 1.91 m, 0.60 m. The eFoil board's figures are nominal - nothing rides it.
// `poly` is that same collision outline (tubes included) in the CG frame, for the hull test.
function hullOf(P) {
  let mx = 0; for (const p of P.springPts) mx += p[0]; mx /= P.springPts.length;
  let bx = -1e9, hb = 0;
  for (const [x, z] of P.outline) { if (x > bx) bx = x; if (Math.abs(z) > hb) hb = Math.abs(z); }
  return { bow: bx - mx, halfBeam: hb, poly: P.outline.map(([x, z]) => [x - mx, z]) };
}
export const HULL = {
  speedboat: hullOf(SPEEDBOAT), jetski: hullOf(JETSKI),
  efoil: { bow: 0.9, halfBeam: 0.35, poly: [[0.9, 0], [0.5, 0.35], [-0.9, 0.35], [-0.9, -0.35], [0.5, -0.35]] },
};
// Distance from a point to a closed polygon; negative when inside.
function polyDist(poly, x, z) {
  let inside = false, best = 1e9;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ax, az] = poly[j], [bx, bz] = poly[i];
    if ((bz > z) !== (az > z) && x < ax + (bx - ax) * (z - az) / (bz - az)) inside = !inside;
    const ex = bx - ax, ez = bz - az, l2 = ex * ex + ez * ez || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * ex + (z - az) * ez) / l2));
    best = Math.min(best, Math.hypot(x - ax - ex * t, z - az - ez * t));
  }
  return inside ? -best : best;
}

// How much a craft frightens them. Between v0 and v1 (m/s) it goes from ignored to frightening;
// k weights it. The jet ski is feared from a lower speed and hardest - loud, high-pitched and
// driven in sudden turns. The speedboat only once it is past what they will ride alongside; the
// eFoil hardly at all. Any craft thrown about near them (hard turns, bursts of throttle) scares
// them at ANY speed above a crawl - see _threat().
const FEAR = {
  jetski: { v0: 5, v1: 12, k: 1.0 },
  speedboat: { v0: 10.5, v1: 17, k: 0.85 },
  efoil: { v0: 6, v1: 12, k: 0.35 },
};
const AVOID_AT = 0.40, CALM_BELOW = 0.12, CALM_FOR = 6;
// The speed a boat must hold for them to ride it: 3-10.5 m/s, about 6-20 knots.
export const RIDE_V = [3.0, 10.5];
const RIDE_OUT_V = [2.5, 11.0];          // and outside this they drop off
const STEADY_YAW = 0.10, STEADY_ACC = 0.6, STEADY_FOR = 2.5;
const PEEL_YAW = 0.22;                    // a turn this sharp (rad/s, smoothed) and they peel off
const NOTICE = 170;                       // m: how far off a steady boat draws them in

// Stations in the bow wave, per dolphin, in the BOAT's frame measured from the stem:
// [ahead of the stem, to the left], in metres, to the animal's centre - a V either side of the
// bow, in the pressure wave where they surf. NOT dead ahead of the stem: filmed in the game on
// 24 Sep, the chase camera sits behind and above the stern, and everything within about 1.7 m
// of the centreline ahead of the bow was hidden behind the console and the driver - the pod was
// riding perfectly and could not be seen. At 2.2 m and wider they clear the boat's silhouette on
// screen, and every station leaves well over half a metre of water between tail and hull.
const RIDE_SLOTS = [[1.2, 2.2], [1.0, -2.3], [-0.4, 2.8], [-0.6, -2.9], [2.8, 2.6], [2.6, -2.6], [-2.2, 3.7], [-2.4, -3.8]];

export const ROAM = 'roam', AVOID = 'avoid', APPROACH = 'approach', RIDE = 'ride';

export class DolphinPod {
  // stage: null, or a review handle from ?dolphins= - 'view' (pod across the chase camera),
  // 'ride' (pod ahead of the craft, for a steady boat to find) or 'flee' (pod in the craft's path).
  constructor({ count = 6, seed = 0x0d01f1, busy = false, stage = null } = {}) {
    this.busy = busy;          // short breath intervals, for filming and review
    // The leader's wait between breaths, in seconds, when not busy. DOLPHIN WATCH (b22) sets it
    // shorter for its run and puts it back after: a level about FINDING them cannot ask a player
    // to stare at an empty sea for half a minute between sightings. Same one rng draw either way,
    // so every seeded run with the default is the run it always was.
    this.gap = [14, 30];
    this.stage = stage;
    this._placed = false;
    this.rng = mulberry32(seed);
    this.pod = [];
    this.puffs = [];
    this.mood = ROAM; this.moodT = 0; this.calmT = 0; this.lostT = 0; this.outT = 0;
    this.cool = 0; this.threat = 0; this.rideMax = 60;
    this.cr = { ok: false, kind: null, x: 0, z: 0, heading: 0, speed: 0, vs: 0, yaw: 0, acc: 0, steadyT: 0 };
    this.stats = { rides: 0, avoids: 0, peels: 0, aborts: 0 };
    this._seed(Math.max(1, Math.min(MAX_POD, count)));
  }

  _r(a, b) { return a + (b - a) * this.rng(); }

  _seed(n) {
    const r = () => this.rng();
    let x = HOME.x, z = HOME.z;
    this.pod.length = 0;
    this.lead = { x, z, heading: r() * Math.PI * 2, speed: 3.0, wx: x, wz: z, wT: 0, turn: 0 };
    this._pickWaypoint(true);
    for (let i = 0; i < n; i++) {
      const s = SLOTS[i];
      this.pod.push({
        i, slot: s, x: x + s[0], z: z + s[1], heading: this.lead.heading, speed: 3.0,
        yRel: CRUISE_Y, base: CRUISE_Y, vy: 0, pitch: 0, roll: 0, turn: 0,
        len: i === 0 ? 3.0 : this._r(2.4, 3.1),     // adults and a young one or two
        phase: r() * 6.283, stroke: r() * 6.283, rate: 0, amp: 0.066,
        mode: CRUISE, t: 0, from: CRUISE_Y, riseT: T_RISE, rollT: T_ROLL, rollH: ROLL_H, noLeap: false,
        // the leader sets the breathing; each follower answers a beat behind
        delay: i === 0 ? 0 : this._r(0.25, 1.6),
        breathIn: i === 0 ? this._r(3, 8) : 1e9,
        solo: false, downT: 0, peelT: 0, peelH: 0,
        puffed: false,
        jx: this._r(-0.6, 0.6), jz: this._r(-0.6, 0.6),
        water: 0,
      });
    }
  }

  _pickWaypoint(force) {
    const L = this.lead;
    for (let tries = 0; tries < 24; tries++) {
      const a = this.rng() * Math.PI * 2, d = this._r(60, 190);
      const x = L.x + Math.cos(a) * d, z = L.z + Math.sin(a) * d;
      if (openWater(x, z)) { L.wx = x; L.wz = z; L.wT = this._r(20, 45); return; }
    }
    if (force || !openWater(L.wx, L.wz)) { L.wx = HOME.x; L.wz = HOME.z; L.wT = 30; }
  }

  // Move the pod to within sight of a point - the review and filming handle.
  summon(x, z, dist = 45, heading = null) {
    // Settle the mood FIRST: _enter() re-centres the leader and picks a waypoint, which would
    // otherwise undo the placement below.
    if (this.mood !== ROAM) this._enter(ROAM);
    this.cool = 0;
    const d = dist, a = this.rng() * Math.PI * 2;
    let px = x + Math.cos(a) * d, pz = Math.max(Z_MIN + 5, z + Math.sin(a) * d);
    if (distToPier(px, pz) < PIER_CLEAR) { px = HOME.x; pz = HOME.z; }
    this.lead.x = px; this.lead.z = pz;
    this.lead.heading = heading ?? (Math.atan2(z - pz, x - px) + Math.PI / 2);
    for (const d0 of this.pod) {
      const c = Math.cos(this.lead.heading), s = Math.sin(this.lead.heading);
      d0.x = px + c * d0.slot[0] - s * d0.slot[1];
      d0.z = pz + s * d0.slot[0] + c * d0.slot[1];
      d0.heading = this.lead.heading;
    }
    // An explicit heading means "swim that way": aim the waypoint straight down it rather than
    // at a random point, so a summoned pod goes where it was sent.
    if (heading !== null && heading !== undefined) {
      this.lead.wx = px + Math.cos(this.lead.heading) * 300;
      this.lead.wz = pz + Math.sin(this.lead.heading) * 300;
      this.lead.wT = 60;
    } else {
      this._pickWaypoint(true);
    }
    for (const d0 of this.pod) d0.peelT = 0;
    const lead = this.pod[0];
    if (lead) lead.breathIn = 1.5;
  }

  // The review handles: where to put the pod on the first frame, relative to the player.
  _stageOnce(pose) {
    this._placed = true;
    const h = pose.heading, fx = Math.cos(h), fz = Math.sin(h), sx = -fz, sz = fx;
    if (this.stage === 'view') {
      // 15 m ahead of the player and 24.5 m off to the left, swimming ACROSS the chase camera's
      // view: broadside is the angle that shows the tail beat, the arc of the roll and the fin.
      this.summon(pose.x + fx * 15 - sx * 24.5, pose.z + fz * 15 - sz * 24.5, 0, h + Math.PI / 2);
    } else if (this.stage === 'ride') {
      // 45 m ahead and 18 m to the left, travelling the same way: a boat driven straight on finds
      // them off its bow within a few seconds, which is how a real pod usually meets one.
      this.summon(pose.x + fx * 45 - sx * 18, pose.z + fz * 45 - sz * 18, 0, h);
    } else if (this.stage === 'flee') {
      // 60 m dead ahead, crossing the craft's line: open the throttle and run at them. (At 75 m
      // the pod was a speck on screen; at 45 m a jet ski was on them before they could bolt.)
      this.summon(pose.x + fx * 60, pose.z + fz * 60, 0, h + Math.PI / 2);
    }
  }

  // ---- the craft ---------------------------------------------------------------------
  // How it is being driven, smoothed over about a second: turn rate and change of speed.
  // The change of speed is taken from a SMOOTHED speed. A planing hull's surge speed jitters as it
  // pitches through the waves, and differentiating the raw value read that jitter as throttle -
  // measured in the game on 24 Sep: 0.4-0.7 m/s^2 of 'acceleration' from a boat whose speed was
  // rising 0.2 m/s^2, so no boat in any sea ever counted as steady and nothing was ever ridden.
  _track(pose, dt) {
    const C = this.cr;
    if (!pose) { C.ok = false; C.steadyT = 0; return; }
    const kind = pose.craft || 'efoil';
    // A restart or a change of craft teleports the pose. That is not driving; start again.
    const v = pose.speed || 0;
    if (!C.ok || kind !== C.kind || Math.hypot(pose.x - C.x, pose.z - C.z) > 30) {
      this.jumped = C.ok;
      C.ok = true; C.kind = kind; C.yaw = 0; C.acc = 0; C.steadyT = 0; C.vs = v;
    } else if (dt > 0) {
      const k = Math.min(1, dt / 1.2);
      C.yaw += (Math.abs(wrap(pose.heading - C.heading)) / dt - C.yaw) * k;
      const vs = C.vs + (v - C.vs) * Math.min(1, dt / 0.8);
      C.acc += (Math.abs(vs - C.vs) / dt - C.acc) * k;
      C.vs = vs;
    }
    C.x = pose.x; C.z = pose.z; C.heading = pose.heading; C.speed = pose.speed || 0;
    const steady = C.yaw < STEADY_YAW && C.acc < STEADY_ACC && C.speed >= RIDE_V[0] && C.speed <= RIDE_V[1];
    C.steadyT = steady ? C.steadyT + dt : 0;
  }

  _threat(cx, cz) {
    const C = this.cr;
    if (!C.ok) return 0;
    const F = FEAR[C.kind] || FEAR.efoil;
    const dx = cx - C.x, dz = cz - C.z, d = Math.hypot(dx, dz);
    const toward = d > 1 ? (dx * Math.cos(C.heading) + dz * Math.sin(C.heading)) / d : 1;
    const fast = smooth(F.v0, F.v1, C.speed);
    // Erratic = hard turns, and throttle JABS well beyond a boat simply getting up to speed (a
    // RIB pulls about 2-3 m/s^2 off the mark; counting that as erratic had every boat that set
    // off near them scare them away, so nothing was ever ridden).
    const erratic = Math.min(1.5, C.yaw / 0.30 + Math.max(0, C.acc - 3.0) / 2.5) * smooth(2, 6, C.speed);
    const close = 1 - smooth(30, 110, d);
    return F.k * Math.max(fast, 0.6 * erratic) * close * (0.5 + 0.5 * Math.max(0, toward));
  }

  _bow() {
    const C = this.cr, H = HULL[C.kind] || HULL.efoil;
    return [C.x + Math.cos(C.heading) * H.bow, C.z + Math.sin(C.heading) * H.bow];
  }

  // Can they ride this craft, right now? `strict` is for starting; staying on is looser.
  _rideable(strict) {
    const C = this.cr;
    if (!C.ok || C.kind !== 'speedboat') return false;
    if (strict ? C.steadyT < STEADY_FOR : (C.yaw > PEEL_YAW || C.speed < RIDE_OUT_V[0] || C.speed > RIDE_OUT_V[1])) return false;
    // not a boat running at the beach or the pier, and not one far out of the bay
    const [bx, bz] = this._bow();
    const ax = bx + Math.cos(C.heading) * 25, az = bz + Math.sin(C.heading) * 25;
    if (!clearOfShore(bx, bz) || !clearOfShore(ax, az)) return false;
    return Math.hypot(bx - HOME.x, bz - HOME.z) <= RIDE_RANGE;
  }

  _centroid() {
    let x = 0, z = 0, sx = 0, sz = 0;
    for (const d of this.pod) { x += d.x; z += d.z; sx += Math.cos(d.heading); sz += Math.sin(d.heading); }
    const n = this.pod.length || 1;
    return [x / n, z / n, Math.atan2(sz, sx)];
  }

  // ---- moods -------------------------------------------------------------------------
  _enter(m) {
    const prev = this.mood;
    this.mood = m; this.moodT = 0; this.calmT = 0; this.lostT = 0; this.outT = 0;
    const L = this.lead;
    const [cx, cz, ch] = this._centroid();
    if (m === ROAM || m === APPROACH || m === AVOID) {
      // The leader is a point, not an animal; bring it back to where the pod actually is.
      if (prev === RIDE || prev === AVOID || m !== ROAM) { L.x = cx; L.z = cz; L.heading = ch; }
    }
    if (m === AVOID) this.stats.avoids++;
    if (m === RIDE) this._assignStations();
    for (const d of this.pod) {
      d.solo = m === RIDE;
      d.bolt = false;
      if (m === AVOID) {
        // Down, now: a rise already under way is abandoned; a roll in progress finishes.
        if (d.mode === RISE) { d.mode = DIVE; d.t = 0; d.from = d.yRel; }
        d.noLeap = true;
        // The bolt: one quick breath at a sprint as they turn away - only while the craft is still
        // well off. Anything closer just goes down.
        const far = !this.cr.ok || Math.hypot(d.x - this.cr.x, d.z - this.cr.z) > 25 + this.cr.speed * 1.4;
        if (d.mode === CRUISE && far) { d.bolt = true; d.solo = true; d.breathIn = this._r(0.2, 1.2); }
      } else d.noLeap = false;
      if (m === RIDE) {
        d.breathIn = this._r(0.8, 3.0);
        d.peelT = 0;
      } else if (prev === RIDE || prev === AVOID) {
        // back to breathing together: the leader sets it, the others answer
        d.breathIn = d.i === 0 ? this._r(3, 8) : 1e9;
      }
    }
    if (m === RIDE) { this.stats.rides++; this.rideMax = this._r(40, 110); }
    if (m === ROAM && prev !== ROAM) this._pickWaypoint(false);
  }

  // Stations are handed out by SIDE: each animal takes one on the side of the boat it is already
  // on, nearest first, so none has to cross under the hull to reach it. Only the overflow - more
  // on one side than there are stations - crosses, and it does so deep (see the rise guard).
  _assignStations() {
    const C = this.cr, c = Math.cos(C.heading), s = Math.sin(C.heading);
    const [bx, bz] = this._bow();
    const port = [], stbd = [];
    RIDE_SLOTS.slice(0, this.pod.length).forEach((r, k) => (r[1] >= 0 ? port : stbd).push(k));
    const used = new Set();
    const byDist = this.pod.map((d) => ({ d, left: -(d.x - bx) * s + (d.z - bz) * c, dist: Math.hypot(d.x - bx, d.z - bz) }))
      .sort((a, b) => a.dist - b.dist);
    const take = (list) => { for (const k of list) if (!used.has(k)) { used.add(k); return k; } return -1; };
    for (const e of byDist) {
      let k = take(e.left >= 0 ? port : stbd);
      if (k < 0) k = take(e.left >= 0 ? stbd : port);
      e.d.station = k < 0 ? e.d.i : k;
    }
  }

  // Is this animal clear of the craft's hull? A roll must never come up through it. Five points
  // down the body's axis, beak to tail stock, each kept `margin` outside the hull's own collision
  // outline - the body is ~0.26 m in half-width, so 0.5 m leaves a quarter-metre of water.
  _hullClear(d, margin = 0.5) {
    const C = this.cr;
    if (!C.ok) return true;
    const H = HULL[C.kind] || HULL.efoil, c = Math.cos(C.heading), s = Math.sin(C.heading);
    const hc = Math.cos(d.heading), hs = Math.sin(d.heading);
    for (const f of [0.5, 0.25, 0, -0.25, -0.46]) {
      const px = d.x + hc * f * d.len - C.x, pz = d.z + hs * f * d.len - C.z;
      if (polyDist(H.poly, px * c + pz * s, -px * s + pz * c) < margin) return false;
    }
    return true;
  }

  // Off the bow: each to its own side, down, and away. Then they regroup and roam.
  _peel() {
    const C = this.cr;
    this.stats.peels++;
    const c = Math.cos(C.heading), s = Math.sin(C.heading);
    for (const d of this.pod) {
      const left = -(d.x - C.x) * s + (d.z - C.z) * c;
      const side = left >= 0 ? 1 : -1;
      d.peelH = C.heading + side * 1.0;
      d.peelT = this._r(3.5, 6.0);
      if (d.mode === RISE) { d.mode = DIVE; d.t = 0; d.from = d.yRel; }
    }
    this._enter(ROAM);
    this.cool = 35;
  }

  _moods(dt) {
    const C = this.cr;
    const [cx, cz] = this._centroid();
    const th = this.threat = this._threat(cx, cz);
    this.moodT += dt;
    // The craft they were meeting or riding has vanished and another is somewhere else.
    if (this.jumped) {
      this.jumped = false;
      if (this.mood === RIDE) { this._peel(); return; }
      if (this.mood === APPROACH) { this._enter(ROAM); return; }
    }
    this.cool = Math.max(0, this.cool - dt);
    if (this.mood !== AVOID && th > AVOID_AT) {
      if (this.mood === RIDE) this.stats.peels++;
      this._enter(AVOID);
      return;
    }
    switch (this.mood) {
      case AVOID:
        this.calmT = th < CALM_BELOW ? this.calmT + dt : 0;
        if (this.calmT > CALM_FOR) { this._enter(ROAM); this.cool = 25; }
        break;
      case ROAM: {
        if (this.cool > 0 || !this._rideable(true)) break;
        const d = Math.hypot(cx - C.x, cz - C.z);
        // They meet a boat; they do not run one down from behind.
        const ahead = (cx - C.x) * Math.cos(C.heading) + (cz - C.z) * Math.sin(C.heading);
        if (d < NOTICE && !(ahead < -20 && C.speed > 6)) this._enter(APPROACH);
        break;
      }
      case APPROACH: {
        this.lostT = this._rideable(false) ? 0 : this.lostT + dt;
        if (this.lostT > 2) { this._enter(ROAM); this.cool = 15; break; }
        if (this.moodT > 30) { this._enter(ROAM); this.cool = 30; break; }
        const [bx, bz] = this._bow();
        // Fallen behind a boat faster than they can swim: they let it go rather than chase it.
        const behind = (cx - bx) * Math.cos(C.heading) + (cz - bz) * Math.sin(C.heading);
        if (behind < -25 && C.speed > 7.5) { this._enter(ROAM); this.cool = 20; break; }
        const sx = bx + Math.cos(C.heading) * 2, sz = bz + Math.sin(C.heading) * 2;
        for (const d of this.pod) if (Math.hypot(d.x - sx, d.z - sz) < 9) { this._enter(RIDE); break; }
        break;
      }
      case RIDE:
        this.outT = this._rideable(false) ? 0 : this.outT + dt;
        if (this.outT > 0.8 || this.moodT > this.rideMax) this._peel();
        break;
    }
  }

  _leader(dt, time) {
    const L = this.lead, C = this.cr;
    let want, turnCap, speed;
    if (this.mood === AVOID) {
      // Away from the craft AND off its line: to whichever side of its track they already are.
      const [cx, cz] = this._centroid();
      let ax = cx - C.x, az = cz - C.z; const d = Math.hypot(ax, az) || 1; ax /= d; az /= d;
      const nx = -Math.sin(C.heading), nz = Math.cos(C.heading);
      const side = (ax * nx + az * nz) >= 0 ? 1 : -1;
      let fx = ax + 0.9 * side * nx, fz = az + 0.9 * side * nz;
      // ...but never into the beach or the pier: lean toward home when that way is closed.
      if (!openWater(cx + fx * 40, cz + fz * 40)) {
        const hx = HOME.x - cx, hz = HOME.z - cz, hl = Math.hypot(hx, hz) || 1;
        fx += 1.5 * hx / hl; fz += 1.5 * hz / hl;
      }
      want = Math.atan2(fz, fx); turnCap = 0.7; speed = 5.5;
    } else if (this.mood === APPROACH) {
      // Lead pursuit: aim where the bow will be when they get there.
      const [bx, bz] = this._bow();
      const d = Math.hypot(bx - L.x, bz - L.z);
      // They sprint to meet it - bottlenose burst to about 8 m/s - which is why they can only
      // join a fast boat that passes near them, never one that has already gone by.
      const lead = Math.min(8, d / 8);
      const tx = bx + Math.cos(C.heading) * (C.speed * lead + 2), tz = bz + Math.sin(C.heading) * (C.speed * lead + 2);
      want = Math.atan2(tz - L.z, tx - L.x); turnCap = 0.8; speed = 8.0;
    } else if (this.mood === RIDE) {
      // The leader point simply rides the stem; the animals take their own stations.
      const [bx, bz] = this._bow();
      L.x = bx; L.z = bz; L.heading = C.heading; L.speed = C.speed; L.turn = 0;
      return;
    } else {
      L.wT -= dt;
      if (L.wT <= 0 || Math.hypot(L.wx - L.x, L.wz - L.z) < 25) this._pickWaypoint(false);
      want = Math.atan2(L.wz - L.z, L.wx - L.x); turnCap = 0.22;
      speed = 3.0 + 0.4 * Math.sin(time * 0.07);
    }
    const dh = wrap(want - L.heading);
    L.turn = Math.max(-turnCap, Math.min(turnCap, dh * 0.6 * (turnCap / 0.22)));
    L.heading += L.turn * dt;
    // gentle changes of pace while roaming; a quick burst when there is something to do
    L.speed += (speed - L.speed) * Math.min(1, dt * (this.mood === ROAM ? 0.5 : 1.5));
    L.x += Math.cos(L.heading) * L.speed * dt;
    L.z += Math.sin(L.heading) * L.speed * dt;
  }

  update(sea, time, dt, pose) {
    if (!(dt > 0)) return;
    if (this.stage && !this._placed && pose) this._stageOnce(pose);
    this._track(pose, dt);
    this._moods(dt);
    this._leader(dt, time);
    const L = this.lead, C = this.cr, mood = this.mood;
    const lc = Math.cos(L.heading), ls = Math.sin(L.heading);
    const leadDolphin = this.pod[0];
    const riding = mood === RIDE;
    const [bx, bz] = riding ? this._bow() : [0, 0];
    const bc = Math.cos(C.heading), bs = Math.sin(C.heading);
    const cruiseY = mood === AVOID ? AVOID_Y : riding ? RIDE_Y : CRUISE_Y;
    for (const d of this.pod) {
      // ---- horizontal ------------------------------------------------------------------
      let refH, tx, tz, baseV, gain, cap, turnCap;
      if (riding) {
        // a station in the bow wave, drifting a little so they are not parked
        const s = RIDE_SLOTS[d.station ?? d.i];
        const ah = s[0] + 0.45 * Math.sin(time * 0.5 + d.phase);
        const lf = s[1] + 0.30 * Math.sin(time * 0.37 + 2 * d.phase);
        tx = bx + bc * ah - bs * lf; tz = bz + bs * ah + bc * lf;
        refH = C.heading; baseV = C.speed; gain = 1.0; cap = 11.5; turnCap = 1.6;
      } else {
        const sc = mood === AVOID ? 0.65 : mood === APPROACH ? 0.85 : 1;
        tx = L.x + (lc * d.slot[0] - ls * d.slot[1]) * sc + d.jx;
        tz = L.z + (ls * d.slot[0] + lc * d.slot[1]) * sc + d.jz;
        refH = L.heading;
        baseV = d.mode === LEAP ? 5.6 : L.speed;
        gain = 0.35;
        cap = mood === AVOID ? 6.5 : mood === APPROACH ? 8.5 : 5.8;
        turnCap = mood === ROAM ? 0.9 : 1.2;
      }
      if (d.peelT > 0 && !riding) {
        // peeling off the bow: its own line, out to the side, before rejoining the pod
        d.peelT -= dt;
        const dH = wrap(d.peelH - d.heading);
        d.turn = Math.max(-1.2, Math.min(1.2, dH * 2.0));
        d.heading += d.turn * dt;
        d.speed += (5.0 - d.speed) * Math.min(1, dt * 1.5);
      } else {
        // The slot error in the reference frame: along = how far the slot is ahead, lat = to the
        // left. Steer at a point on the slot's line always at least 4 m ahead along the reference
        // heading. Aiming at the slot itself made a dolphin that had surged past it (a leap runs at
        // 5.6 m/s) turn right round and swim back - a U-turn in the middle of the bay. Now it holds
        // the heading and the speed rule below lets it drop back into place.
        const rc = Math.cos(refH), rs = Math.sin(refH);
        const ex = tx - d.x, ez = tz - d.z;
        const along = ex * rc + ez * rs, lat = -ex * rs + ez * rc;
        const ahead = Math.max(along, 0) + (riding ? 3 : 4);
        const aim = Math.atan2(rs * ahead + rc * lat, rc * ahead - rs * lat);
        const dH = wrap(aim - d.heading);
        d.turn = Math.max(-turnCap, Math.min(turnCap, dH * 1.6));
        d.heading += d.turn * dt;
        const wantV = Math.max(1.8, Math.min(cap, baseV + (riding ? along : along - 1.0) * gain));
        d.stationErr = riding ? Math.hypot(ex, ez) : 0;
        d.onStation = riding && d.stationErr < 2;
        d.speed += (wantV - d.speed) * Math.min(1, dt * (riding ? 2.5 : 1.5));
      }
      d.x += Math.cos(d.heading) * d.speed * dt;
      d.z += Math.sin(d.heading) * d.speed * dt;

      // ---- vertical: the breath cycle -------------------------------------------------
      // Never surface right beside a craft - except on the bow, which is the whole point, and
      // where the stations keep them clear of the hull. A dolphin rolling up through a jet ski
      // would look broken.
      const cd = C.ok ? Math.hypot(C.x - d.x, C.z - d.z) : 1e9;
      // On the bow: only from its own station, and never with any part of it over the hull.
      // A full metre from the hull to start a roll, so a rider still easing onto its station cannot
      // drift within reach of the hull during the second or so the roll lasts.
      // Avoiding, the rule looks AHEAD: a breath takes about 1.4 s from starting up to going back
      // under, and a jet ski at 16 m/s closes 22 m in that time - so the craft must still be more
      // than 25 m off when the breath ENDS, not just when it starts.
      const clearFor = mood === AVOID ? Math.max(30, 25 + (C.ok ? C.speed : 0) * 1.4) : 9;
      const near = riding ? !(d.onStation && this._hullClear(d, 1.0)) : (cd < clearFor || !this._hullClear(d));
      const quietEnough = mood !== AVOID || this.threat < 0.2;
      d.base += (cruiseY - d.base) * Math.min(1, dt * 0.8);
      d.t += dt;
      const prevY = d.yRel;
      if (d.mode !== CRUISE) d.downT = 0;
      // Clearance is not only checked once, at the start: an animal still moving across to its
      // station can close on the stem while it rises. Crowding the hull, it goes straight back
      // down - an early dive - rather than roll up against the boat.
      if ((d.mode === RISE || d.mode === ROLL) && C.ok && !this._hullClear(d, 0.6)) {
        d.mode = DIVE; d.t = 0; d.from = d.yRel;
        this.stats.aborts++;          // a false start; the suite holds these to a few per cent
      }
      switch (d.mode) {
        case CRUISE: {
          d.downT += dt;
          d.yRel = d.base + (riding ? 0.05 : 0.12) * Math.sin(time * 0.6 + d.phase);
          d.breathIn -= dt;
          if (!d.solo && d.i !== 0 && leadDolphin && leadDolphin.mode === RISE && leadDolphin.t < 0.05 && d.breathIn > 1e8) {
            d.breathIn = d.delay;                 // answer the leader, a beat behind
          }
          const must = d.downT > MAX_DOWN;
          if (((d.breathIn <= 0 && (quietEnough || d.bolt)) || must) && !near && d.peelT <= 0) {
            d.mode = RISE; d.t = 0; d.from = d.yRel; d.splashed = false;
            // From just under the surface a breath comes up fast; from the deep it takes longer.
            d.riseT = d.bolt ? 0.6 : Math.max(0.5, T_RISE * (ROLL_BASE - d.from) / (ROLL_BASE - CRUISE_Y));
            // bolting: quickest and lowest. avoiding: a quick, low breath. riding: quick, at speed.
            d.rollT = d.bolt ? T_ROLL * 0.6 : mood === AVOID ? T_ROLL * 0.7 : riding ? T_ROLL * 0.8 : T_ROLL;
            d.rollH = mood === AVOID ? ROLL_H * 0.8 : ROLL_H;
          }
          break;
        }
        case RISE: {
          const s = Math.min(1, d.t / d.riseT);
          d.yRel = d.from + (ROLL_BASE - d.from) * easeInOut(s);
          if (s >= 1) {
            // One in twenty, per animal per breath, whether or not ?dolphins=busy is on. At 0.22
            // under busy four of six once went up together - a dolphin show, not a pod travelling.
            // Busy shortens the wait between breaths; it must not change what a breath looks like.
            // On a bow they leap more (porpoising at speed); avoiding, never.
            const pLeap = d.noLeap ? 0 : riding ? (this._hullClear(d, 1.5) ? 0.12 : 0) : 0.05;
            const leap = this.rng() < pLeap;
            d.mode = leap ? LEAP : ROLL; d.t = 0; d.puffed = false;
          }
          break;
        }
        case ROLL: case LEAP: {
          const T = d.mode === LEAP ? T_LEAP : d.rollT, H = d.mode === LEAP ? LEAP_H : d.rollH;
          const s = Math.min(1, d.t / T);
          d.yRel = ROLL_BASE + H * Math.sin(Math.PI * s);
          // the breath, at the moment the blowhole clears
          if (!d.puffed && s > 0.2) { d.puffed = true; this._puff(d); }
          // at speed the back cuts the surface and throws spray
          if (!d.splashed && s > 0.3 && d.speed > 4.5) { d.splashed = true; this._splash(d); }
          if (s >= 1) { d.mode = DIVE; d.t = 0; d.from = ROLL_BASE; }
          break;
        }
        case DIVE: {
          const T = riding ? 1.0 : T_DIVE;
          const s = Math.min(1, d.t / T);
          d.yRel = d.from + (d.base - d.from) * easeInOut(s);
          if (s >= 1) {
            d.mode = CRUISE; d.t = 0;
            if (d.bolt) { d.bolt = false; d.solo = false; d.breathIn = d.i === 0 ? this._r(6, 12) : 1e9; }
            else if (d.solo) d.breathIn = this._r(1.8, 4.5);
            else d.breathIn = d.i === 0
              ? (this.busy ? this._r(1.5, 2.5) : this._r(this.gap[0], this.gap[1]))
              : 1e9;                                  // followers wait for the leader again
          }
          break;
        }
      }
      // Pitch follows the animal's own path, so the arc and the roll come out of the motion
      // rather than being keyed separately: nose up rising, level at the top, nose down diving.
      const vy = (d.yRel - prevY) / dt;
      let wantPitch = Math.atan2(vy, Math.max(1.5, d.speed));
      // THE ROLL IS A PIVOT, not just a bob: nose up as the head breaks the surface, level with
      // the back out, then nose down so the tail stock arches up behind as the head goes under.
      // Path pitch alone stays within a few degrees and reads as a float bobbing.
      if (d.mode === ROLL) wantPitch = 0.26 * Math.cos(Math.PI * Math.min(1, d.t / d.rollT)) - 0.08;
      d.pitch += (wantPitch - d.pitch) * Math.min(1, dt * 7);
      d.roll += ((-d.turn * 0.45) - d.roll) * Math.min(1, dt * 3);
      // Stroke: faster when swimming faster, up to a beat a real animal can hold. Gliding through
      // the roll, as they do when breathing - and on a bow the wave does the work, so they barely
      // beat at all. Avoiding, they drive hard.
      const gliding = d.mode === ROLL ? 0.45 : d.mode === LEAP ? 0.25 : riding ? 0.35 : mood === AVOID ? 1.15 : 1;
      d.rate = 6.2831853 * (0.55 + 0.30 * Math.min(d.speed, 7));
      d.stroke = (d.stroke + d.rate * dt) % 6.2831853;   // integrated - see the shader's note
      d.amp = 0.066 * gliding;
      // sea surface at the animal
      const S = sea && sea.sample ? sea.sample(d.x, d.z, time, 0, 3) : null;
      d.water = S ? S.height : 0;
    }
    this._stepPuffs(dt);
  }

  // ---- breath ------------------------------------------------------------------------
  _puff(d) {
    // The blowhole sits on top of the head, about a fifth of the way back from the beak.
    const c = Math.cos(d.heading), s = Math.sin(d.heading);
    const fwd = (0.5 - 0.20) * d.len;
    const up = 0.08 * d.len;
    const cp = Math.cos(d.pitch), sp = Math.sin(d.pitch);
    const bx = d.x + c * fwd * cp, bz = d.z + s * fwd * cp;
    const by = (d.water || 0) + d.yRel + fwd * sp + up;
    // A plume, not a ball: more, smaller, fainter particles with a spread of rise speeds, so the
    // breath goes up as a column and thins out. Nine fat ones at 0.55 alpha read as a snowball.
    for (let k = 0; k < 12 && this.puffs.length < MAX_PUFF; k++) {
      this.puffs.push({
        x: bx + this._r(-0.05, 0.05), y: by, z: bz + this._r(-0.05, 0.05),
        vx: this._r(-0.45, 0.45) + c * d.speed * 0.25, vy: this._r(1.2, 3.4), vz: this._r(-0.45, 0.45) + s * d.speed * 0.25,
        r0: this._r(0.04, 0.09), age: 0, life: this._r(0.8, 1.5),
      });
    }
  }

  // Spray where a fast-moving back breaks the surface: low, outward and quick, unlike the breath,
  // which goes up and hangs. Same particles, same draw.
  _splash(d) {
    const c = Math.cos(d.heading), s = Math.sin(d.heading), y = (d.water || 0) + 0.05;
    for (let k = 0; k < 10 && this.puffs.length < MAX_PUFF; k++) {
      const along = this._r(-0.25, 0.35) * d.len, side = k % 2 ? 1 : -1;
      this.puffs.push({
        x: d.x + c * along, y, z: d.z + s * along,
        vx: c * d.speed * 0.3 - s * side * this._r(0.6, 1.6), vy: this._r(0.6, 1.7),
        vz: s * d.speed * 0.3 + c * side * this._r(0.6, 1.6),
        r0: this._r(0.06, 0.12), age: 0, life: this._r(0.5, 0.9),
      });
    }
  }

  _stepPuffs(dt) {
    let w = 0;
    for (const p of this.puffs) {
      p.age += dt;
      if (p.age >= p.life) continue;
      p.vy -= 1.2 * dt;                 // a breath rises, slows and hangs
      p.vx *= 1 - dt * 1.2; p.vz *= 1 - dt * 1.2;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      this.puffs[w++] = p;
    }
    this.puffs.length = w;
  }
}
