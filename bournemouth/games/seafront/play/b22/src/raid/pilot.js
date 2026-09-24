// VIKING RAID - scripted combat pilot (tr57; tr64 rebuilt for the boats). TEST / DEMO ONLY.
//
// Drives the real craft through the ordinary input path ({lean, turn, throttle, boost}) plus
// the raid's FIRE and WATER controls, so headless tests prove the rules with the actual
// physics and ?raidbot=1 shows the loop without a player. It reads the player only through
// playerPose() plus, on the eFoil, wing depth for the ride-height hold (the attract pilot's
// PD). The GAME never reads anything but the pose.
//
// WHY THIS WAS REBUILT (tr60 and tr62 both concluded it, and tr62 could not measure balance on
// the boats because of it). The old pilot steered `turn = clamp(headingError * 1.6)` and held
// a fixed cruise throttle, which is fine for an eFoil and wrong for a planing hull:
//
//   * A HULL ONLY STEERS ON POWER. jetski.js has steerIdle 0.08 - a jet with the throttle shut
//     has almost no nozzle authority - and speedboat.js 0.55. The old pilot cut the throttle to
//     0.2-0.3 whenever it wanted to hose a fire, at which point the jetski could not turn at
//     all and drifted off the target, sprayed the sea, and tried again.
//   * A HULL TURNS TIGHTEST AT MID SPEED. The available yaw rate is min(u/rMin, aSteer/u):
//     0.88 rad/s at 8 m/s for the speedboat but only 0.35 at 20 m/s (a 57 m circle). Bang-bang
//     steering at full throttle simply cannot hold an orbit at weapon range, so the old pilot
//     overshot, swung back, and sprayed its shots across the sea.
//   * IT DROVE AT THINGS. Closing head-on with a longship at 20 m/s ends in a ram (or wedged
//     between a moored hull and the pier), which is why the un-wedging hack existed.
//
// So the boats now get a real helm: a yaw-rate demand turned into a stick position by the rate
// the hull can actually pull, a speed target that eases off for a turn and for the last few
// metres, and a floor under the throttle whenever it needs to steer. On top of that the plan
// is flown as LINES rather than points - an approach line onto the beam of the target and then
// a strafe past it at weapon range, a hosing run along the pier at cannon range - so the
// target stays inside the weapon cone for seconds at a time instead of flicking through it.
//
// Plan, in order: a ship about to moor; else a burning section with water in the tank (fire is
// the bigger threat once it is really going); else the most urgent longship. Power-ups on the
// way. Never cut across the pier (round the head). Swing off a telegraphing shark, weave under
// missiles, and never sit still against the pier or the shore.

import { playerPose } from '../player-pose.js';
import { sectionAim, pierFrame, pierAt, pierEdges, climberPos, ACROSS, S_END } from './siege.js';

const P = { depth: 0.24, kp: 2, kd: 0.6, cruise: { efoil: 0.55, speedboat: 0.62, jetski: 0.45 }, gain: 1.6, near: { efoil: 12, speedboat: 26, jetski: 20 } };

// Per-craft helm and stand-off geometry. rMin/aSteer are COPIED from speedboat.js / jetski.js
// (the hull's own steering limits) so the demand is never larger than the hull can pull; the
// eFoil is not a hull and keeps the old lean/turn path.
const HELM = {
  speedboat: { rMin: 9, aSteer: 7, vMax: 20, vTurn: 9, vHose: 7.5, gain: 2.4, damp: 0.45, minThr: 0.34, sep: 30, strafe: 0.95, hose: 0.62, ram: 9, keep: 26 },
  jetski: { rMin: 4, aSteer: 12, vMax: 18, vTurn: 8, vHose: 6.5, gain: 2.2, damp: 0.3, minThr: 0.40, sep: 22, strafe: 1.0, hose: 0.60, ram: 8, keep: 18 },
};

// Test-only window on what the pilot thought it was doing (tmp-tr64/diag.mjs reads it). The
// game never sees this and nothing in the app imports it.
export const PILOT_DBG = {};

const st = new WeakMap();
const wrap = (a) => a - Math.PI * 2 * Math.round(a / (Math.PI * 2));
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// >>> PILOT
// THE ESCAPE'S "REVERSE" WAS NOT A REVERSE, AND A BEACHED HULL DOES NOT WANT ONE (tmp-tr177).
// See the two blocks inside the escape below, and the note at `m.backT`.
// `hull` is the active PlaneHull when the caller has one (raid-mode.js passes hullOf(), the
// suite passes its own), and undefined on the eFoil and from any older caller. It is READ
// ONLY, and only for `wet` / `propWet` / `airTicks` - the three fields the hull already
// publishes and src/boats/engine-audio*.js already reads. Nothing here writes to the hull,
// renames a field or changes what one means, and the pilot still steers through the ordinary
// {lean, turn, throttle, boost} contract.
// <<< PILOT
export function raidPilot(sim, game, hull) {
  let m = st.get(sim);
  if (!m) { m = { lean: 0, prevErr: 0, t: 0, out: { lean: 0, turn: 0, throttle: 0, boost: 0, fire: false, water: false } }; st.set(sim, m); }
  const o = m.out;
  m.t += 1 / 120;
  const p = playerPose(sim);
  const efoil = p.craft === 'efoil';
  const s0 = sim.plant && sim.plant.state;
  const wd = efoil && s0 && Number.isFinite(s0.wingDepth) ? s0.wingDepth : P.depth;
  const err = wd - P.depth, der = (err - m.prevErr) * 120; m.prevErr = err;
  m.lean += (clamp(err * P.kp + der * P.kd, -1, 1) - m.lean) * 0.15;
  o.lean = efoil ? m.lean : 0; o.boost = 0; o.fire = false; o.water = false;
  o.throttle = P.cruise[p.craft] ?? 0.5;
  const W = game.T.weapons[p.craft] || game.T.weapons.efoil;
  const WC = game.T.water;
  const B = HELM[p.craft] || null;                       // null on the eFoil
  // >>> PILOT
  // AGROUND IS NOT "SLOW", AND THE HULL ALREADY SAYS SO. Four fields, all of them the hull's
  // own, none renamed, rescaled or written to (src/boats/engine-audio*.js reads the same ones):
  //
  //   hull.aground   the hull's ground-contact flag - `gN > 1`, a real normal force from the
  //                  beach or the seabed. This is what separates aground from merely slow.
  //   hull.wet /     the fraction of hull points, and of STERN points, the water spring has
  //   hull.propWet   wetted. A craft on the sand at the waterline reads both near zero, and
  //                  propWet near zero is WHY the throttle achieves nothing: thrust is
  //                  `thrustMag * propWet`, so the leg out of the water makes none.
  //   hull.airTicks  the hull's "nothing under me at all" counter (incremented only when
  //                  wetN === 0 && gN === 0). It is what keeps a JUMP off a ramp - also wet 0,
  //                  also propWet 0 - from being read as a grounding.
  //
  // Measured on this base: speedboat aground reads wet 0.11 / propWet 0.38, jetski 0.00 / 0.00.
  //
  // DRY AT SOME POINT IN THIS GROUNDING, NOT DRY THIS INSTANT. hull.js's own beached-craft
  // note says the sea "runs over her stern and back off it with every wave", so `wet` and
  // `propWet` flicker at wave period and a grounded craft in the wash can read fully wet for
  // seconds together. Traced at 120 Hz: an instantaneous test cost the escape its gear twice
  // in seven seconds - 0.6 s of shifting each (speedboat.js shiftTime) - and a 1.5 s dwell
  // still classified 9 s of a plain grounding as a pin, because those escapes happened to
  // begin on wet ticks. So the memory is per GROUNDING: `sawDry` is set the first time the leg
  // comes out of the water while she is touching, and cleared only by 1.5 s of unbroken water
  // under her, which is a craft that is properly afloat again. It cannot be set in deep water,
  // because out there the leg is never out of the water at all.
  // `hull` is undefined on the eFoil and from any older caller, so all of this is false there.
  const dry = !!(B && hull && hull.wet < 0.5 && hull.propWet < 0.5 && hull.airTicks === 0);
  const aground = !!(B && hull && hull.aground);
  m.grdAgo = aground ? 0 : (m.grdAgo === undefined ? 99 : m.grdAgo + 1 / 120);
  if (m.grdAgo > 1.5) m.sawDry = false;          // properly afloat again: this grounding is over
  if (dry) m.sawDry = true;                      // the leg came out of the water during it
  const beached = aground && !!m.sawDry;
  // <<< PILOT

  // measured yaw rate and ground speed, for the helm and for the stuck check
  const yawRate = m.prevH === undefined ? 0 : wrap(p.heading - m.prevH) * 120;
  m.prevH = p.heading;
  const u = Math.abs(p.speed);

  const live = game.phase === 'live' || game.phase === 'clear';
  const threats = live ? game.threats() : [];
  const inCone = (x, z, r, cone) => Math.hypot(x - p.x, z - p.z) < r && Math.abs(wrap(Math.atan2(z - p.z, x - p.x) - p.heading)) < cone;
  let gx, gz, spraying = false, ramming = false;

  // the most urgent burning section
  let burn = -1, bu = Infinity;
  if (live && game.pier) game.pier.sections.forEach((q, i) => {
    if (q.collapsed || q.fire < 0.1) return;
    const a = sectionAim(i, p.x, p.z), u2 = Math.hypot(a.x - p.x, a.z - p.z) - 160 * q.fire - 80 * (1 - q.hp / q.maxHp);
    if (u2 < bu) { bu = u2; burn = i; }
  });
  const tankOk = game.tank > 30 || (game.spraying && game.tank > 1);
  const urgent = threats.find((s) => !s.moored && s.ttb < 9 && Math.hypot(s.x - p.x, s.z - p.z) < 170);
  // FIRE IS THE BIGGER THREAT when a section is really going and nothing is about to tie up:
  // a burning section takes the pier down whatever happens to the ships.
  const fireFirst = burn >= 0 && tankOk && !urgent &&
    (game.pier.sections[burn].fire > 0.18 || !threats.length || threats[0].ttb > 10 || game.pier.sections[burn].hp < game.pier.sections[burn].maxHp * 0.5);

  // THE PIER IS A WALL, NOT A WAYPOINT. The old pilot's goals could land on the deck itself,
  // and a planing hull driven into the pier at full throttle simply stops there: the tr64
  // speedboat diagnosis (tmp-tr64/diag.mjs, seed 4) found it pinned at station 224 on the head's
  // east edge for 220 s with the throttle open. Every boat goal is now pushed out of a keep-out
  // corridor round the deck outline, and being inside it overrides everything else.
  // The keep-out is WIDE because the obstacle grid round the pier has pockets a hull can drive
  // into and never leave: hull.js _collide undoes any move that puts an outline point in a
  // blocked cell AND damps the yaw rate by 0.7 every frame it touches, so a boat wedged in a
  // pocket cannot turn, cannot reverse (an outboard will not shift above 2.5 m/s and its surge
  // speed never settles while it is bouncing) and is out of the game for good. That is what
  // happened on speedboat seed 6: frozen at station 193 for three minutes, position and
  // heading identical frame after frame. The physics is not this pass's to change, so the
  // pilot keeps a hull's turning circle clear of the structure and looks ahead as well.
  const corridor = (x, z) => {
    const f = pierFrame(x, z);
    if (!B || f.s < -14 || f.s > S_END + 14) return null;
    const e = pierEdges(clamp(f.s, 0, S_END)) || [-5.5, 5.5];
    const lo = e[0] - B.keep, hi = e[1] + B.keep;
    return f.o > lo && f.o < hi ? { f, lo, hi } : null;
  };
  const safeGoal = (x, z) => {
    const c = corridor(x, z);
    if (!c) return [x, z];
    return pierAt(c.f.s, c.f.o < (c.lo + c.hi) / 2 ? c.lo - 8 : c.hi + 8);
  };

  // ---- where we are trying to be -------------------------------------------------------
  // A hosing run: stand off the burning mass on OUR side of the pier at cannon range and run
  // ALONG it, so the aim point stays in the cone while the boat keeps steerage way.
  const hoseLine = (i) => {
    const a = sectionAim(i, p.x, p.z), pf = pierFrame(a.x, a.z), me = pierFrame(p.x, p.z);
    const side = me.o < 5.5 ? -1 : 1;
    const off = (side < 0 ? -14 : 25) + side * (B ? WC.range * B.hose : 24);
    const d = Math.hypot(a.x - p.x, a.z - p.z);
    if (d < WC.range - 8) {
      spraying = true;
      if (!B) { o.throttle *= d < 30 ? 0.2 : 0.6; return [a.x, a.z]; }
      // keep moving: aim a point further along the pier, turning back at the ends of the run
      m.hoseDir = m.hoseDir === undefined || Math.abs(me.s - pf.s) > 34 ? Math.sign(pf.s - me.s) || 1 : m.hoseDir;
      return pierAt(clamp(me.s + m.hoseDir * 26, pf.s - 30, pf.s + 30), off);
    }
    return pierAt(clamp(me.s, pf.s - 25, pf.s + 25), off);
  };

  if (!threats.length && burn >= 0) {        // tank refilling: hover off the fire
    [gx, gz] = hoseLine(burn);
  } else if (!threats.length) {
    const d = Math.hypot(p.x, p.z);
    gx = d > 60 ? 0 : p.x + Math.cos(p.heading + 0.5) * 30; gz = d > 60 ? 0 : p.z + Math.sin(p.heading + 0.5) * 30;
  } else if (fireFirst) {
    [gx, gz] = hoseLine(burn);
  } else {
    let s = urgent || threats[0];
    if (!urgent && s.ttb > 25) {
      let bd = Infinity;
      for (const q of threats) { const d = Math.hypot(q.x - p.x, q.z - p.z) - (q.moored ? 60 : 0); if (d < bd) { bd = d; s = q; } }
    }
    const dx = s.x - p.x, dz = s.z - p.z, d = Math.hypot(dx, dz);
    if (!B) {
      // eFoil: unchanged from tr57 - it turns on the spot and has no hull to get wedged
      if (d < P.near[p.craft] + s.L / 2) {
        const side = wrap(Math.atan2(dz, dx) - p.heading) > 0 ? -1 : 1;     // peel away from her
        gx = p.x + Math.cos(p.heading + side * 1.2) * 30; gz = p.z + Math.sin(p.heading + side * 1.2) * 30;
      } else {
        const lead = Math.min(3, d / 20);
        gx = s.x + Math.cos(s.heading) * s.speed * lead; gz = s.z + Math.sin(s.heading) * s.speed * lead;
        if (s.moored) { const sf = pierFrame(s.x, s.z), side = s.slot >= 0 && sf.o < 5.5 ? -1 : 1; [gx, gz] = pierAt(sf.s, sf.o + side * 20); if (d < 60) { gx = s.x; gz = s.z; } }
      }
    } else {
      // A BOAT FLIES LINES. Outside weapon range, run at her beam with a lead. Inside it,
      // strafe: hold the range and swing the bow across her so she stays in the cone. Too
      // close, peel off hard - a planing hull cannot turn inside 30 m at speed, and hitting a
      // moored hull alongside the pier is how the old pilot got wedged.
      const bear = Math.atan2(dz, dx);
      const lead = clamp(d / 24, 0, 3.2);
      const aimX = s.x + Math.cos(s.heading) * s.speed * lead, aimZ = s.z + Math.sin(s.heading) * s.speed * lead;
      const hold = clamp(W.range * 0.55, B.sep + 10, 110);
      // a RAM is the play only on a ship about to tie up, close, lined up and already quick
      ramming = !s.moored && s.ttb < 4.5 && d < 55 && u > B.ram && Math.abs(wrap(bear - p.heading)) < 0.5 && !corridor(s.x, s.z);
      const turnSide = wrap(bear - p.heading) > 0 ? 1 : -1;
      if (ramming) { gx = aimX; gz = aimZ; }
      else if (d < B.sep) {                     // break off
        gx = p.x + Math.cos(p.heading - turnSide * 1.25) * 60; gz = p.z + Math.sin(p.heading - turnSide * 1.25) * 60;
      } else if (d < hold) {                    // strafe past at range
        const a2 = bear + turnSide * B.strafe;
        gx = p.x + Math.cos(a2) * 45; gz = p.z + Math.sin(a2) * 45;
      } else if (s.moored) {                    // come at a moored ship from open water, never over the pier
        const sf = pierFrame(s.x, s.z), side = sf.o < 5.5 ? -1 : 1;
        [gx, gz] = pierAt(sf.s, sf.o + side * Math.max(18, B.sep * 0.8));
      } else { gx = aimX; gz = aimZ; }
    }
    // a power-up that is near and roughly on the way. DOUSE, REBUILD and WATER TANK are worth
    // a detour: they act on the pier, which is the thing being lost.
    for (const k of game.pickups) {
      const fix = k.kind === 'douse' || k.kind === 'rebuild' || k.kind === 'water';
      const dk = Math.hypot(k.x - p.x, k.z - p.z);
      const off = Math.abs(wrap(Math.atan2(k.z - p.z, k.x - p.x) - Math.atan2(gz - p.z, gx - p.x)));
      const R = fix ? (B ? 130 : 95) : (B ? 80 : 55), A = fix ? 1.5 : (B ? 1.1 : 1.0);
      if (dk < R && off < A && (fix ? !urgent : s.ttb > (B ? 9 : 12))) { gx = k.x; gz = k.z; break; }
    }
  }

  // never cut across the pier: go round its head
  const me = pierFrame(p.x, p.z), goal = pierFrame(gx, gz);
  if (me.s < S_END + 12 && goal.s < S_END + 12 && me.s > -20 && (me.o < 5.5) !== (goal.o < 5.5) && Math.abs(goal.o - 5.5) > 12) {
    [gx, gz] = pierAt(Math.max(me.s + 12, S_END + 30), me.o < 5.5 ? -30 : 42);
  }
  if (B) [gx, gz] = safeGoal(gx, gz);
  // where we will be in a second and a half counts as well: at 20 m/s a planing hull needs
  // 50 m to turn, so noticing the corridor only on arrival is far too late
  const inside = corridor(p.x, p.z) ||
    (B ? corridor(p.x + Math.cos(p.heading) * u * 1.6, p.z + Math.sin(p.heading) * u * 1.6) : null);
  if (inside) {
    // Already inside the corridor: steer for a BEARING straight out across the pier, never for
    // a point abeam. A point abeam moves with the boat, so a hull that cannot turn inside it
    // orbits it for ever - which is exactly what the speedboat did on seed 6 (round and round
    // at station 193, 9 m/s, full lock, for three minutes). A bearing cannot be orbited.
    const out = inside.f.o < (inside.lo + inside.hi) / 2 ? -1 : 1;
    gx = p.x + ACROSS[0] * out * 140; gz = p.z + ACROSS[1] * out * 140;
    spraying = false;
  } else if (!B && me.s > 30 && me.s < S_END + 8 && me.o > -22 && me.o < 33) {   // eFoil: tangled in the pier
    [gx, gz] = pierAt(me.s + 20, me.o < 5.5 ? -40 : 50);
    spraying = false;
  }

  // ---- the helm -------------------------------------------------------------------------
  let e = wrap(Math.atan2(gz - p.z, gx - p.x) - p.heading);
  for (const k of game.sharks) {
    if ((k.state === 'tell' || k.state === 'lunge') && Math.hypot(k.x - p.x, k.z - p.z) < 30) {
      const b = wrap(Math.atan2(k.z - p.z, k.x - p.x) - p.heading);
      e = b > 0 ? -1.2 : 1.2; o.throttle = Math.min(1, o.throttle + 0.3); spraying = false;
    }
  }
  if (game.missiles.length) e += 0.35 * Math.sin(m.t * 2.3);

  if (!B) o.turn = clamp(e * P.gain, -1, 1);
  else {
    // NEVER GET STUCK. Against the pier, the shore or a hull the throttle is open and nothing
    // moves. Pushing harder is exactly wrong, and so is a short burst of reverse: an outboard
    // spends 0.6 s shifting through neutral before it makes any astern thrust at all
    // (speedboat.js shiftTime), which is why tr60's 2 s un-wedge "helped only a little". So:
    // shut the throttle, back out HARD for three seconds with the helm over, then drive out to
    // open water; if that has not worked, do it again the other way.
    // Two ways to know: the engine is loaded but stopped (u), and the boat is NOT GOING
    // ANYWHERE (ground track). The second matters most - a hull pinned against the pier by the
    // obstacle grid keeps its surge speed while its position never changes, which is how the
    // tr64 speedboat sat at station 193 reading 9 m/s for three minutes.
    m.slowT = (u < 1.5 && o.throttle > 0.1 && live) ? (m.slowT || 0) + 1 / 120 : 0;
    m.hist = m.hist || { x: p.x, z: p.z, t: 0 };
    m.hist.t += 1 / 120;
    let pinned = false;
    if (m.hist.t > 2.0) {
      pinned = live && Math.hypot(p.x - m.hist.x, p.z - m.hist.z) < 9;
      m.hist = { x: p.x, z: p.z, t: 0 };
    }
    if ((m.slowT > 1.5 || pinned) && !(m.escT > 0)) { m.escT = 6.5; m.backT = 3.0; m.escDir = -(m.escDir || (yawRate > 0 ? -1 : 1)); m.slowT = 0; m.escBeach = beached; }
    if (m.escT > 0) {
      m.escT -= 1 / 120;
      spraying = false;
      // >>> PILOT
      // OFF A BEACH: POINT HER AT THE SEA AND LEAVE THE THROTTLE OPEN. Two changes, both only
      // when this escape was flagged as a grounding.
      //
      // 1. THE BEARING. `pierAt(...)` is the right answer for a hull wedged against the
      //    structure and the wrong one for a hull on the sand: computed from the waterline by
      //    the pier root it bears 137 m ALONG the beach for 40 m out of it, so the escape ran
      //    her down the same sand. At Bournemouth +z IS out to sea by construction (coast.js
      //    COAST.startZ - the rider starts "300 m out") and the beach falls the same way, so a
      //    beached escape steers for straight offshore, through safeGoal(), which is the same
      //    pier keep-out every other goal in this file gets.
      //
      // 2. NO REVERSE PHASE. `backT` is zeroed, so the three seconds below are skipped.
      //    ⚠️ THIS IS THE OPPOSITE OF WHAT THE PASS SET OUT TO DO, AND IT IS WHAT MEASURED.
      //    The line below never reached the hull at all (see the note at `m.backT`), so the
      //    obvious repair was to make it a real astern - `boost` plus a positive throttle. On
      //    one craft, driven aground and then held, that is plainly better: afloat in 8.4 s
      //    against 43.8 s. Across 100 seeds of a 420 s raid it was plainly WORSE: time stuck
      //    aground 1.40% -> 3.93%, worst seed 26.19% -> 47.35%, longest recovery 55 s -> 134 s,
      //    and on seed 63 one 15 s grounding that ended 14.2 m offshore became six groundings
      //    that ended 0.8 to 7.4 m offshore. An outboard astern makes about 1.4 m/s, which
      //    leaves her wallowing in the surf where she simply grounds again; ahead, once the leg
      //    finds water, makes enough to clear it. And hull.js's release of the sand's grip is
      //    armed by ANY sustained open throttle (`thrCmd > 0.05`), so it does not need reverse
      //    either - it needs the pilot to stop shutting the throttle. Measured over the same
      //    100 seeds, this version: 1.40% -> 0.78%, worst seed 26.19% -> 9.57%, longest
      //    recovery 55.2 s -> 23.4 s. The full working is in tmp-tr177/pilot/RESULT.md.
      const out = m.escBeach ? safeGoal(p.x, p.z + 160)
        : pierAt(clamp(me.s, 20, S_END + 25) + 25, me.o < 5.5 ? -75 : 85);   // straight out to sea
      // <<< PILOT
      e = wrap(Math.atan2(out[1] - p.z, out[0] - p.x) - p.heading);
      // >>> PILOT
      // The flag latches, so a grounding that completes a moment after the escape starts still
      // counts as one; an escape that never reads `beached` never sets it and keeps the old
      // path exactly, dead reverse and all.
      if (beached) m.escBeach = true;
      if (m.escBeach) m.backT = 0;
      // <<< PILOT
    }
    const rate = Math.min(Math.max(u, 0.6) / B.rMin, B.aSteer / Math.max(u, 0.8));
    const want = clamp(e * B.gain - yawRate * B.damp, -2.2, 2.2);
    o.turn = clamp(want / Math.max(rate, 0.12), -1, 1);
    // speed: full on a straight run, down to a working speed for a turn or the last few metres
    const dG = Math.hypot(gx - p.x, gz - p.z);
    let vT = B.vMax;
    if (Math.abs(e) > 0.3) vT = Math.min(vT, B.vTurn + (B.vMax - B.vTurn) * clamp(1 - (Math.abs(e) - 0.3) / 0.8, 0, 1));
    vT = Math.min(vT, 4 + dG * 0.55);
    // A planing hull's turn radius is max(rMin, u^2/aSteer): it turns TIGHTEST slow. With the
    // goal behind the beam and close, going fast means orbiting it, so come off the power.
    if (Math.abs(e) > 1.0 && dG < 3.2 * Math.max(B.rMin, u * u / B.aSteer)) vT = Math.min(vT, 5.5);
    if (spraying) vT = Math.min(vT, B.vHose);
    if (ramming) vT = B.vMax;
    o.throttle = clamp((vT - u) * 0.35 + 0.15, Math.abs(e) > 0.22 ? B.minThr : 0, 1);
    // >>> PILOT
    // ⚠️ THIS "REVERSE" COMMANDS NO REVERSE, AND NEVER HAS. `o.throttle = -0.9` below meets
    // hull.js's first line of input handling, `thrCmd = clamp(fin(inp.throttle), 0, 1)`, and
    // astern is a SEPARATE channel: `wantRev = inp.boost ? 1 : 0` (hub.js's right-mouse astern
    // raises exactly that pair). So -0.9 clamps to 0, the gear stays AHEAD, the spool winds
    // down, and "back out HARD for three seconds" is a three-second throttle-off. Worse than a
    // no-op on a beach, because hull.js's release of the sand's grip only runs while
    // `thrCmd > 0.05`, so the fake reverse zeroed `beachT` every tick and switched the hull's
    // own way out back off again. Measured on tmp-tr177/base, a speedboat driven aground and
    // then held: ahead full, never free in 90 s, stationary 39%, beachT reached 58.5; on this
    // line, never free in 90 s, stationary 100%, beachT stuck at 0.0; on a real astern
    // (`boost` + throttle 0.9), free in 10.2 s.
    //
    // IT IS LEFT EXACTLY AS IT WAS, deliberately, and this pass ships no reverse at all. A
    // beached escape now sets `backT = 0` above and never reaches here; the other escape - a
    // hull wedged against the pier - keeps it, because a real astern there is a difficulty
    // change measured at a sample size too small to mean anything and not this pass's to
    // spend. Replacing it is a one-line job for someone with that budget: the pair is
    // `o.throttle = 0.9; o.boost = 1;`.
    // <<< PILOT
    if (m.backT > 0) {                       // reverse out of the hole first
      m.backT -= 1 / 120;
      o.throttle = -0.9; o.turn = m.escDir;
    }
  }
  PILOT_DBG.mode = inside ? 'corridor' : m.escT > 0 ? 'escape' : spraying ? 'hose' : ramming ? 'ram' : fireFirst ? 'fire' : threats.length ? 'ship' : 'idle';
  PILOT_DBG.e = e; PILOT_DBG.gx = gx; PILOT_DBG.gz = gz; PILOT_DBG.dG = Math.hypot(gx - p.x, gz - p.z);
  PILOT_DBG.burn = burn; PILOT_DBG.escT = m.escT || 0; PILOT_DBG.shark = 0;
  // >>> PILOT
  // Test-only, the same window as the rest of PILOT_DBG, which nothing in the app reads.
  // `dry` is the leg-out-of-the-water read, `beached` the grounding state the escape branches
  // on, `escBeach` whether the escape now running was flagged as one. `astern` is kept and is
  // always false: this pass ships no reverse, and a probe that starts seeing it means someone
  // has put one back - see the note at `m.backT`.
  PILOT_DBG.dry = dry; PILOT_DBG.beached = beached; PILOT_DBG.astern = !!o.boost; PILOT_DBG.escBeach = !!m.escBeach;
  // <<< PILOT
  for (const k of game.sharks) if ((k.state === 'tell' || k.state === 'lunge') && Math.hypot(k.x - p.x, k.z - p.z) < 30) PILOT_DBG.shark++;
  if (live) {
    for (const s of threats) {
      const dx = s.x - p.x, dz = s.z - p.z, d = Math.hypot(dx, dz);
      if (d < W.range && Math.abs(wrap(Math.atan2(dz, dx) - p.heading)) < W.cone) { o.fire = true; break; }
    }
    if (!o.fire) for (const k of game.sharks) {
      if (k.state !== 'stalk' && k.state !== 'tell' && k.state !== 'lunge') continue;
      const dx = k.x - p.x, dz = k.z - p.z;
      if (Math.hypot(dx, dz) < 60 && Math.abs(wrap(Math.atan2(dz, dx) - p.heading)) < W.cone) { o.fire = true; break; }
    }
    // water: a burning section in reach, a fire pot in the air, a warrior on a ladder
    if (game.tank > 1 && (game.tank > 12 || game.spraying)) {
      // hose ANY burning section that happens to be in the cone and in reach, whatever the plan
      // says - a pass at a ship often crosses a fire, and water spent on the deck is never wasted
      if (burn >= 0) { const a = sectionAim(burn, p.x, p.z); if (inCone(a.x, a.z, WC.range, WC.cone * 0.8)) o.water = true; }
      if (!o.water && live && game.pier) for (let i = 0; i < game.pier.sections.length; i++) {
        const q = game.pier.sections[i];
        if (q.collapsed || q.fire < 0.05) continue;
        const a = sectionAim(i, p.x, p.z);
        if (inCone(a.x, a.z, WC.range, WC.cone * 0.8)) { o.water = true; break; }
      }
      if (!o.water) for (const q of game.pierShots || []) if (q.age > 0.2 && inCone(q.x, q.z, WC.potReach - 8, WC.cone * 0.8)) { o.water = true; break; }
      if (!o.water) for (const s of threats) {
        if (!s.moored || !s.ladders) continue;
        for (const l of s.ladders) if (l.up >= 1 && l.climb > 0.1) { const c = climberPos(s, l); if (inCone(c.x, c.z, WC.range - 10, WC.cone * 0.8)) { o.water = true; break; } }
        if (o.water) break;
      }
    }
  }
  return o;
}
