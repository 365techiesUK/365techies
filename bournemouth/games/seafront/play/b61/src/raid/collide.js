// VIKING RAID - solid longships (tr57). Pure, deterministic, no DOM/GL/clock.
//
// FOOTPRINTS. A longship is an oriented CAPSULE along her keel: radius = her
// half-beam at midships, segment half-length so the rounded ends reach the stem
// and stern posts (the jarl's and the flagship's scale with their length).
// Boats: the hull's own dense outline (hull.js _collideDyn, fenced // >>> RAID).
// eFoil: three points along the board (nose, middle, tail) with a 0.5 m radius.
//
// eFoil RESPONSE. The raid may touch only the sim's world pose and the plant's
// surge speed, and only while in contact: push out along the contact normal,
// reflect the velocity relative to the (moving) ship with restitution, turn the
// heading toward the rebound (limited), keep the speed that survives, add a yaw
// kick. With no contact nothing is written, so the physics hash is untouched.
//
// RaidDriver is the per-tick glue shared by the browser controller and the Node
// tests: collect contacts -> game.update -> publish ship capsules (+ turbo/stall)
// to the boats for their next step.

import { playerPose } from '../player-pose.js';
// >>> BUOYS
// The Harbour Mouth channel marking (tr169) became solid in tr171. buoy-collide.js is a
// rules file like this one and owns the footprints and the feel; this file only publishes
// them and applies the one part of the response a hull cannot apply for itself.
import { buoyCaps, holdHull, markFeel } from './buoy-collide.js';
// <<< BUOYS

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const L0 = 16, BEAM = 1.7;
export const EFOIL_R = 0.5;
const EFOIL_PTS = [0.8, 0, -0.8];

export function shipCap(s, out = {}) {
  const sc = s.L / L0;
  out.id = s.id; out.x = s.x; out.z = s.z; out.heading = s.heading;
  out.r = BEAM * sc; out.half = Math.max(0, s.L / 2 - 1.15 * sc);
  out.vx = Math.cos(s.heading) * s.speed + (s.kvx || 0);
  out.vz = Math.sin(s.heading) * s.speed + (s.kvz || 0);
  out.e = 0.5;
  return out;
}

// Distance from point (px, pz) to capsule d's core segment: { e, nx, nz } (normal out of the ship).
export function capDist(d, px, pz) {
  const ax = Math.cos(d.heading), az = Math.sin(d.heading);
  const wx = px - d.x, wz = pz - d.z;
  const s = clamp(wx * ax + wz * az, -d.half, d.half);
  const ex = wx - ax * s, ez = wz - az * s, e = Math.hypot(ex, ez);
  return e > 1e-6 ? { e, nx: ex / e, nz: ez / e } : { e, nx: -az, nz: ax };
}

// eFoil vs every capsule; writes the sim only on contact. Returns contacts.
export function resolveEfoil(sim, caps, t, out = []) {
  const w = sim.world, st = sim.plant.state;
  for (const d of caps) {
    const reach = d.half + d.r + 2;
    if ((w.x - d.x) ** 2 + (w.z - d.z) ** 2 > reach * reach) continue;
    const ch = Math.cos(w.heading), sh = Math.sin(w.heading);
    let pen = 0, best = null;
    for (const k of EFOIL_PTS) {
      const c = capDist(d, w.x + ch * k, w.z + sh * k);
      const p = d.r + EFOIL_R - c.e;
      if (p > pen) { pen = p; best = c; }
    }
    if (!best) continue;
    const { nx, nz } = best;
    w.x += nx * pen; w.z += nz * pen;
    const u = st.u;
    let vx = ch * u, vz = sh * u;
    const rvx = vx - d.vx, rvz = vz - d.vz, vn = rvx * nx + rvz * nz;
    if (vn >= 0) continue;
    vx -= (1 + d.e) * vn * nx; vz -= (1 + d.e) * vn * nz;
    const sp = Math.hypot(vx, vz);
    let dh = Math.atan2(vz, vx) - w.heading;
    dh -= Math.PI * 2 * Math.round(dh / (Math.PI * 2));
    // >>> BUOYS
    // THREE LITERALS BECAME PER-CAPSULE, AND THE DEFAULTS ARE THE LITERALS THEY REPLACED.
    // A ship capsule carries none of these fields, so `?? 0.9`, `?? 0.8` and the absent
    // hold evaluate to exactly the arithmetic that was here before tr171 - the ship path is
    // unchanged, not approximately unchanged, and test-raid's 116 assertions say so.
    // What they buy is the difference between a marker and a gatepost: see MARK_FEEL in
    // buoy-collide.js for what each one means and why a pin has a floor and a post does not.
    const turn = clamp(dh, -(d.turn ?? 0.9), d.turn ?? 0.9);
    w.heading += turn;
    w.turnRate = clamp((w.turnRate || 0) + Math.sign(turn) * 0.8, -2, 2);
    st.u = Math.max(0, sp * Math.cos(dh - turn)) * (d.keep ?? 0.8);
    // THE FLOOR. A pin may not take more than (1 - hold) of the speed you arrived with,
    // however square the hit. `u` is that speed, read before the reflection above.
    if (d.hold > 0) st.u = Math.max(st.u, Math.abs(u) * d.hold);
    // <<< BUOYS
    out.push({ id: d.id, nx, nz, speed: -vn, craftSpeed: Math.abs(u), x: w.x - nx * EFOIL_R, z: w.z - nz * EFOIL_R, t });
  }
  return out;
}

export class RaidDriver {
  // hook(list, boost, stall): the boats' fenced raidHook; null for Node eFoil-only use.
  constructor(game, hook = null) {
    this.game = game; this.hook = hook; this.caps = []; this.contacts = [];
    // >>> BUOYS
    // How many trailing entries of `caps` were channel marks last tick. See publish().
    this.buoyN = 0;
    // A mark id -> the time it goes solid again. Per DRIVER, not per module: the cap
    // objects are a shared singleton and two games running at once must not be able to
    // soften each other's buoys. Allocated on the first mark contact and never otherwise.
    this.markCool = null;
    this.now = 0;
    // <<< BUOYS
  }

  // After the physics step of this tick. `hull` = the active PlaneHull or null (eFoil).
  tick(sim, hull, dt, fire = false, water = false) {
    const g = this.game, t = sim.time;
    const cs = this.contacts; cs.length = 0;
    const pose = playerPose(sim);
    if (hull) {
      if (hull.dynHits && hull.dynHits.length) {
        for (const c of hull.dynHits) cs.push(c);
        hull.dynHits.length = 0;
      }
    } else {
      const extra = g.efoilExtraSpeed ? g.efoilExtraSpeed() : 0;
      if (extra > 0 && sim.plant.state.mode !== 'DOWN') {
        sim.world.x += Math.cos(sim.world.heading) * extra * dt;
        sim.world.z += Math.sin(sim.world.heading) * extra * dt;
        pose.x = sim.world.x; pose.z = sim.world.z; pose.speed += extra;
      }
      if (g.efoilHold && g.efoilHold() && sim.plant.state.u > 0.5) sim.plant.state.u *= 0.96;
      resolveEfoil(sim, this.caps, t, cs);
      if (cs.length) { pose.x = sim.world.x; pose.z = sim.world.z; pose.heading = sim.world.heading; }
    }
    g.update(pose, dt, cs, fire, water);
    // a heavy hit spins a boat (raid-side write, as the bounce); the eFoil's is the knock-off hold above
    const kick = g.takeKick ? g.takeKick() : 0;
    if (kick && hull) hull.r += kick;
    // >>> BUOYS
    // A hull's pin floor, applied from the contact receipt because hull.js already resolved
    // the hit inside its own 120 Hz step. Same seam as the line above, and it returns
    // immediately on anything that is not a pin - including every ship.
    if (hull && cs.length) holdHull(hull, cs);
    // A touched pin goes soft, so one approach costs one knock and never a grind. `t` is
    // sim.time, the same clock raid.js stamps its own bump cooldowns with.
    this.now = t;
    if (cs.length) this._coolMarks(cs, t);
    // <<< BUOYS
    this.publish(hull);
  }

  publish(hull) {
    const g = this.game, caps = this.caps;
    // >>> BUOYS
    // ⚠️ DROP LAST TICK'S MARKS FIRST, AND THIS IS NOT TIDINESS. The loop below reuses the
    // objects already in `caps` - `shipCap(s, caps[n])` writes INTO the one it is handed.
    // A mark object reused as a ship capsule would come back a ship still carrying the
    // mark's `hold` and `turn`, and the eFoil would then bounce off a longship with a
    // buoy's manners, for the rest of the run, with nothing anywhere saying why. Tracking
    // the count is exact; sniffing the objects by shape would be a guess.
    if (this.buoyN) { caps.length = Math.max(0, caps.length - this.buoyN); this.buoyN = 0; }
    // <<< BUOYS
    let n = 0;
    for (const s of g.ships) {
      if (!g.solid(s)) continue;
      caps[n] = shipCap(s, caps[n]); n++;
    }
    // >>> BUOYS
    // THE CHANNEL MARKING, AT THE HARBOUR MOUTH ONLY. Appended AFTER the ships so every
    // existing index in `caps` is where it was, and gated on the LEVEL rather than on
    // arena-oldharry.js's ARENA_ON: in a browser the two are the same thing (levels.js makes
    // `gate` the only arena level) but ARENA_ON is false in node unless EFOIL_ARENA is set,
    // and a collision the suites cannot reach is a collision nobody can check.
    //
    // ⚠️ AND THIS IS WHERE THE CORSAIRS PASS THROUGH. `caps` is the list the PLAYER's craft
    // collides with - the eFoil through resolveEfoil below, a hull through hull.js
    // _collideDyn. Corsair and allied hulls are steered by raid.js and gate.js and read none
    // of it, so putting the marks here makes them solid to the player and to nobody else.
    // That is deliberate and it is the decision tr171 was asked to make:
    //   * gate.js steers by a waypoint planner with ONE keep-out, the chalk, as a signed
    //     field with a usable gradient (`_gateAvoid` for waypoints, `_arenaPush` for hulls).
    //     Eighteen 1-2 m cylinders have no such gradient and would need their own avoidance;
    //     without it a brig grinds along a mark until the lane timer re-picks, and a corsair
    //     stuck on a buoy never crosses the line.
    //   * that would make the level quietly EASIER, and its difficulty is not a guess:
    //     TUNING.gate.letThrough 3 was measured at 12/16 on a 16-seed sweep and spawnR is
    //     documented as the steepest lever in the level. Collision on the ships would
    //     invalidate that sweep and nothing here would say so.
    //   * a vessel under way steers around a mark; she does not hit it. The wrong thing a
    //     player can SEE is a brig crossing the line where a buoy is standing, and that is
    //     the smaller wrong of the two - it is also fixable without collision, by snapping
    //     the crossing lane to the gap between buoys. gate-buoys.js `gateGapCentre` is that
    //     seam, written and not wired: `_gateLane` lives in gate.js, which this builder was
    //     asked to read and not to edit.
    if (g.level === 'gate') {
      const b = buoyCaps(), cool = this.markCool, now = this.now;
      let k = 0;
      for (const d of b) { if (cool && cool.get(d.id) > now) continue; caps[n++] = d; k++; }
      this.buoyN = k;
    }
    // <<< BUOYS
    caps.length = n;
    if (this.hook) this.hook(n ? caps : null, g.boatBoost ? g.boatBoost() : 0, g.boatStall ? g.boatStall() : 0);
  }

  // >>> BUOYS
  // Stamp the marks just touched. Only classes with a cooldown are stamped, so a gatepost
  // and every ship fall straight through this.
  _coolMarks(contacts, t) {
    for (const c of contacts) {
      const f = markFeel(c.id);
      if (!f || !(f.cool > 0)) continue;
      if (!this.markCool) this.markCool = new Map();
      this.markCool.set(c.id, t + f.cool);
    }
  }
  // <<< BUOYS

  clear() {
    this.caps.length = 0;
    // >>> BUOYS
    this.buoyN = 0; this.markCool = null; this.now = 0;
    // <<< BUOYS
    if (this.hook) this.hook(null, 0, 0);
  }
}
