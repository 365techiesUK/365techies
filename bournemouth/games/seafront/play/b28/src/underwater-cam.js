// THE UNDERWATER CAMERA (26 Sep 2026) - the fourth view, after SIDE, CHASE and FPV. One camera for
// every craft: the eFoil (main.js, after view3d.update) and the boats and the surfboard (boats/hub.js),
// so they cannot drift apart.
//
// It sits below the surface, behind and a little to one side of the craft, and looks up at what
// is in the water: the eFoil's mast and wing, a hull and its propeller wash, a surfer's legs and
// board - and whatever swims past. It is held between the seabed and the surface by what the sea
// sampler actually says at its spot, so it cannot poke through either. Where the water is too
// shallow to be under it with any room (the last metres to the beach), it declines and the caller
// keeps its ordinary camera.
//
// Reads the sea (slot 3, the renderer's, outside the tick) and the surf bed; writes only `cam` and
// its own smoothing state `S`.

import { surfBed } from './sea-surf.js';

export const UCAM = Object.freeze({
  back: 3.6,        // m behind the craft
  side: 1.4,        // m to its right
  dip: 1.6,         // m below the surface, where the water allows - deep enough to look UP at the hull
  minWater: 1.15,   // m of STILL water needed to go under...
  keepWater: 0.95,  // ...and to stay under (the gap stops it flickering as waves pass)
  bedGap: 0.3,      // never closer to the sand than this
  surfGap: 0.35,    // never closer to the surface than this
  lookAhead: 1.2,   // aim a little ahead of the craft...
  lookDown: 0.2,    // ...and just below its waterline (the hull, the board)
});
// The eFoil's interest is further down - the mast and the wing - and it is SMALL: at 4 m the haze
// left it a grey smudge (26 Sep review take), so this camera sits in close.
export const UCAM_FOIL = Object.freeze({ ...UCAM, back: 2.4, side: 0.8, dip: 1.2, lookDown: 0.6 });

function wrap(a) { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; }

// S: this camera's smoothing state (any object; reset by clearing it). T: { x, y, z, heading }, the
// craft, y being its waterline. Returns false when the water here is too shallow - the caller
// then draws its ordinary view.
export function underCamera(S, cam, T, sea, t, dt, o = UCAM) {
  if (!sea || !sea.sample) return false;
  dt = Math.max(1 / 240, Math.min(0.1, dt || 1 / 60));
  if (S.yaw === undefined) { S.yaw = T.heading; S.init = false; }
  S.yaw += wrap(T.heading - S.yaw) * Math.min(1, dt * 2.0);
  const c = Math.cos(S.yaw), s = Math.sin(S.yaw);
  // Behind, and to the right (the right vector is (-sin, cos)).
  const px = T.x - c * o.back - s * o.side, pz = T.z - s * o.back + c * o.side;
  const tide = sea.tide || 0;
  const surf = sea.sample(px, pz, t, 0, 3).height, bed = tide - surfBed(px, pz);
  // STILL-water depth, with a gap between going under and staying under: the instantaneous depth
  // swings half a metre with every wave in the surf zone and the view flickered in and out.
  const still = tide - bed;
  if (still < (S.under ? o.keepWater : o.minWater)) { S.init = false; S.under = false; return false; }
  S.under = true;
  const want = Math.max(bed + o.bedGap, Math.min(surf - o.surfGap, surf - Math.min(o.dip, (surf - bed) * 0.5)));
  // RIGID in the horizontal: only the yaw above is smoothed. Smoothing the position too made it
  // trail a fast craft by metres (an eFoil at speed was 6.3 m off, and lost in the haze).
  S.x = px; S.z = pz;
  S.y = S.init ? S.y + (want - S.y) * Math.min(1, dt * 3) : want;
  S.init = true;
  // After smoothing, clamp against the water where the camera actually IS - a crest passing over
  // must not lift it out, a trough must not leave it above the surface.
  const surf2 = sea.sample(S.x, S.z, t, 0, 3).height, bed2 = tide - surfBed(S.x, S.z);
  cam.x = S.x; cam.z = S.z;
  cam.y = Math.max(bed2 + o.bedGap * 0.8, Math.min(S.y, surf2 - o.surfGap * 0.7));
  const lx = T.x + c * o.lookAhead, lz = T.z + s * o.lookAhead, ly = T.y - o.lookDown;
  cam.yaw = Math.atan2(lz - cam.z, lx - cam.x);
  cam.pitch = Math.atan2(ly - cam.y, Math.hypot(lx - cam.x, lz - cam.z));
  return true;
}
