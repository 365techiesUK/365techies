// OVERBOARD - scene assembly (tmp-tr197). Visual only; nothing here ever feeds
// back into the sim or the rules.
//
// NO NEW GL. This file creates no program, no mesh and no buffer: it fills the
// EXISTING RescueActors instance (src/gl/rescue-actors.js) - one program, seven
// instanced draws whatever the passage size - with a different set of
// instances. The swimmer, the seated figure, the beacon and the buoy are the
// same neutral, unbranded figures the rescue level draws, for the same reason:
// there is one place a figure's shape lives and this is not a second one.
//
// Frames. RescueActors places an instance at a world point with a (yaw, pitch,
// roll) of its own. A passenger sits in the BOAT's frame, so the seat offset is
// rotated by the hull's own basis first - the SAME basis boats.js:692 builds
// for the model matrix, written out here rather than imported because that one
// is a private method on a renderer this file must not reach into.
//
// ⚠️ The mode that calls this never runs under ?cal= (mode.js refuses to enter
// on a calibration address, exactly as rescue-mode.js's SHORE fence does), and
// this object is not constructed unless the mode is entered. A calibration
// render therefore cannot reach a line of this file.

import { SEATS } from '../overboard/passage.js';

// Marker paint. The same four the rescue level uses; `cold` is a PALER amber,
// not a colder colour - a person in the water here is uncomfortable, never in
// danger, and the palette must not imply otherwise.
const TINT = {
  amber: [1.0, 0.55, 0.06, 1],
  green: [0.15, 1.0, 0.35, 1],
  red: [1.0, 0.18, 0.12, 1],
  dimGreen: [0.10, 0.55, 0.22, 1],
  cold: [1.0, 0.78, 0.42, 1],
};

// The hull's model basis: forward, up, starboard. Copied from BoatRenderer
// .setModel() rather than shared, and it must stay copied - that method is
// private to a renderer this module has no business holding a reference to.
function hullBasis(h, out) {
  const ch = Math.cos(h.heading), sh = Math.sin(h.heading);
  const cp = Math.cos(h.pitch || 0), sp = Math.sin(h.pitch || 0);
  const cr = Math.cos(h.roll || 0), sr = Math.sin(h.roll || 0);
  const fx = ch * cp, fy = sp, fz = sh * cp;
  const rx = -sh * cr + ch * sp * sr, ry = -cp * sr, rz = ch * cr + sh * sp * sr;
  const ux = fy * rz - fz * ry, uy = fz * rx - fx * rz, uz = fx * ry - fy * rx;
  out.f = [fx, fy, fz];
  out.u = [-ux, -uy, -uz];
  out.r = [rx, ry, rz];
  return out;
}

export class OverboardScene {
  constructor() {
    this.basis = { f: [1, 0, 0], u: [0, 1, 0], r: [0, 0, 1] };
    this.seatsDrawn = 0;
    this.waterDrawn = 0;
  }

  reset() { this.seatsDrawn = 0; this.waterDrawn = 0; }

  // Surface height and tilt at (x, z). Sea slot 3, which the rescue scene also
  // uses: the plant owns 0/1 and sample() is a pure function of (x, z, t), so
  // reading it here cannot perturb the physics.
  _surf(sea, x, z, t) {
    const s = sea.sample(x, z, t, 0, 3);
    return { y: s.height, nx: s.nx, nz: s.nz };
  }

  // actors: RescueActors. run: OverboardRun. hull: the PlaneHull, or null on a
  // craft that has none (then no passenger is drawn, because there is no boat
  // under them to draw one on).
  fill(actors, run, sim, pose, hull) {
    const sea = sim.sea, t = sim.time, T = run.T;
    actors.begin();
    const obj = run.objective(pose);
    this.seatsDrawn = 0;
    this.waterDrawn = 0;

    // ---- the people still aboard ----
    if (hull && Number.isFinite(hull.x)) {
      const B = hullBasis(hull, this.basis);
      const cg = hull.cgX || 0;
      for (const p of run.people) {
        if (p.state !== 'aboard') continue;
        const s = SEATS[p.seat] || SEATS[SEATS.length - 1];
        const lx = s.x - cg, ly = s.y, lz = s.z;
        const wx = hull.x + B.f[0] * lx + B.u[0] * ly + B.r[0] * lz;
        const wy = hull.y + B.f[1] * lx + B.u[1] * ly + B.r[1] * lz;
        const wz = hull.z + B.f[2] * lx + B.u[2] * ly + B.r[2] * lz;
        // ⚠️ PHASE, not zero. The seated figure's one animation is a raised arm
        // that swings on sin(uTime * 6 + phase), baked into the mesh in
        // rescue-actors.js, and a phase of 0 puts EIGHT PEOPLE IN LOCKSTEP -
        // which reads as a chorus rather than as eight people holding on in a
        // seaway. Their own seeded phase is the only lever this scene has over
        // it without editing a mesh that another level shares, and it is used.
        actors.add('seated', wx, wy, wz, hull.heading + s.yaw, hull.pitch || 0, hull.roll || 0, p.phase, 0.95);
        this.seatsDrawn++;
      }
    }

    // ---- the people in the water ----
    for (const p of run.people) {
      if (p.state !== 'water') continue;
      const sf = this._surf(sea, p.x, p.z, t);
      const bob = Math.sin(t * 1.4 + p.id) * 0.04;
      actors.add('swimmer', p.x, sf.y + bob, p.z, p.yaw, 0, 0, p.phase);
      this.waterDrawn++;

      const isObj = obj && obj.kind === 'person' && obj.person === p;
      const here = run.nearPerson === p;
      const tint = here
        ? (run.status === 'picking' ? TINT.green : run.status === 'tooFast' ? TINT.red : TINT.amber)
        : (p.cold > 0.6 ? TINT.cold : TINT.amber);
      const dist = Math.hypot(pose.x - p.x, pose.z - p.z);
      // Same range law the rescue markers use: readable width on screen at
      // 300 m, out of the way when you are alongside.
      const far = dist < 30 ? 0.45 + dist / 55 : Math.min(4, Math.max(1, dist / 60));
      actors.add('beacon', p.x, sf.y, p.z, t * 0.8, 0, 0, 0, (isObj ? 1.15 : 0.85) * far, tint);
      if (dist < 90) {
        const R = T.pickupRadius, n = 10;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + t * 0.25;
          const bx = p.x + Math.cos(a) * R, bz = p.z + Math.sin(a) * R;
          actors.add('buoy', bx, this._surf(sea, bx, bz, t).y, bz, 0, 0, 0, 0, 0.8, tint);
        }
      }
    }

    // ---- the beach drop-off ----
    const Z = run.zone;
    const hot = run.nAboard > 0;
    const ztint = run.inZone && run.status === 'dropping' ? TINT.amber : hot ? TINT.green : TINT.dimGreen;
    const zs = this._surf(sea, Z.x, Z.z, t);
    const zfar = Math.min(4, Math.max(1, Math.hypot(pose.x - Z.x, pose.z - Z.z) / 60));
    actors.add('beacon', Z.x, zs.y, Z.z, -t * 0.6, 0, 0, 0, (hot ? 1.5 : 1.0) * zfar, ztint);
    const nb = 20;
    for (let i = 0; i < nb; i++) {
      const a = (i / nb) * Math.PI * 2;
      const bx = Z.x + Math.cos(a) * Z.r, bz = Z.z + Math.sin(a) * Z.r;
      actors.add('buoy', bx, this._surf(sea, bx, bz, t).y, bz, 0, 0, 0, 0, 1.3 * Math.min(2.5, zfar), ztint);
    }
    return obj;
  }
}
