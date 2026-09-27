// THE RIDE VIEW (27 Sep 2026). The owner: "when you get actually up on a wave, shouldn't it change
// view so you can actually see yourself surfing on the wave ... with the pier in the background".
//
// Played through the rider's own eyes (pov-cam.js), the ride - the best moment in the level - was
// the one you never saw: the board's nose and the water ahead. So when you stand up the camera goes
// out to film you: behind you and off to one side, raised, looking down the line you are riding.
// Ride toward the pier (the peel on this bank runs that way) and the pier is ahead of you in the
// shot; the wave's face rises on its own side. The hub (boats/hub.js _fpv) blends into this from
// your eyes as you pop up and back to them when the ride ends; the C key / VIEW choice is untouched.
//
// Smoothed on purpose: where the lens points and where it is both follow through critically
// damped springs, so a carve swings the shot rather than jerking it (the trailer's lesson), and the
// board's own heave does not shake it. Read-only on the board. No Math.random.

export const RIDE_VIEW = {
  // OFF until it is finished and tested (the blend out of your eyes went through your own back on
  // the first take, 27 Sep); b44 shipped with it here but switched off.
  on: false,
  inT: 0.9,         // s to blend out of your eyes as you stand up...
  outT: 0.6,        // ...and back into them when the ride ends
  fov: 56 * Math.PI / 180,   // vertical; a filming lens, not the head-cam's 78
  back: 4.4,        // m behind the rider along the line of travel
  side: 2.0,        // m off to one side...
  sideSign: -1,     // ...-1 the beach side (the wave rises behind you), +1 the sea side
  up: 1.7,          // m above the rider's board
  ahead: 5.0,       // m ahead of the rider the lens aims at...
  aimUp: 0.7,       // ...this far up (so you sit in the lower-middle of the frame)
  dirT: 0.55,       // s: how quickly the shot swings to a new line (heavier than the head's)
  posW: 7,          // rad/s: the position spring
  minAbove: 0.7,    // m above the water under the lens, at least
};

const wrap = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

// cam: written (x, y, z, yaw, pitch). h: the SurfBoard. S: this camera's own state. snap: start fresh.
export function rideCamera(S, cam, h, sea, t, dt, snap) {
  const V = RIDE_VIEW;
  dt = Math.max(1 / 240, Math.min(0.1, dt || 1 / 60));
  // The line of travel: where the board is going, not where it points (a board slides on a face).
  const sp = Math.hypot(h.vx || 0, h.vz || 0);
  const dir = sp > 1.2 ? Math.atan2(h.vz, h.vx) : h.heading;
  if (snap || S.dir === undefined) S.dir = dir;
  else S.dir = wrap(S.dir + wrap(dir - S.dir) * Math.min(1, dt / V.dirT));
  const fx = Math.cos(S.dir), fz = Math.sin(S.dir);
  // The side: +Z is offshore on this coast, so "the sea side" is whichever side vector points +Z.
  let rx = -fz, rz = fx;
  if (Math.sign(rz || 1) !== Math.sign(V.sideSign)) { rx = -rx; rz = -rz; }
  const by = h.yDraw !== undefined ? h.yDraw : (h.y || 0);
  const tx = h.x - fx * V.back + rx * V.side, tz = h.z - fz * V.back + rz * V.side;
  let ty = by + V.up;
  if (sea && sea.sample) { const wy = sea.sample(tx, tz, t, 0, 3).height; if (ty < wy + V.minAbove) ty = wy + V.minAbove; }
  // Position through a critically damped spring (no overshoot), fresh on a snap.
  if (snap || S.x === undefined) { S.x = tx; S.y = ty; S.z = tz; S.vx = 0; S.vy = 0; S.vz = 0; }
  else {
    const w = V.posW;
    for (const [p, v, tv] of [['x', 'vx', tx], ['y', 'vy', ty], ['z', 'vz', tz]]) {
      S[v] += (w * w * (tv - S[p]) - 2 * w * S[v]) * dt;
      S[p] += S[v] * dt;
    }
  }
  // Aim ahead of the rider, down the line.
  const ax = h.x + fx * V.ahead, az = h.z + fz * V.ahead, ay = by + V.aimUp;
  cam.x = S.x; cam.y = S.y; cam.z = S.z;
  cam.yaw = Math.atan2(az - S.z, ax - S.x);
  cam.pitch = Math.atan2(ay - S.y, Math.hypot(ax - S.x, az - S.z));
  return true;
}
