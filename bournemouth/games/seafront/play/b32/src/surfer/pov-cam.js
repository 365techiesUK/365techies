// PIER SURF IN FIRST PERSON (26 Sep 2026). The owner, after the first-person duck-dive: "I think it's
// better if we start the game where you're actually on the board and the camera is where your eyes
// are, so you can see your hands and see the board and all that business as you paddle and
// everything ... more like a simulation, so it's actually like you're actually surfing".
//
// The lens is at the rider's EYES, taken every frame from the figure's own posed skeleton
// (gl/surfer-figure.js eyes()) and carried by the board exactly as gl/surfers.js carries the figure,
// so the view is the drawn body's view: the board's nose ahead, your hands reaching past it and
// pulling through the water, the deck under you as you pop up, the line of the wave as you ride.
// It looks where the face looks, smoothed so the head's own bob reads as motion and not as shake.
// What a real surfer does, and a head-worn camera shows:
//   * LOOKING BACK. Waiting, facing the beach, not paddling, with a wave building behind you: the
//     head turns over the shoulder to watch it come (the figure's head turns with it). Paddle and
//     you face forward again.
//   * GOING UNDER. A duck-dive takes the lens under with the head, looking down the board past the
//     nose. Within a band either side of the surface the lens is kept clear of it, on whichever
//     side the eyes are on - so it goes through in one frame.
//   * A WIPEOUT holds you under for a moment, rolling, looking for the board.
// Read-only on the board and the figure (except the figure's head-turn, lookCtl); writes cam and
// its own state S. No Math.random.

import { surfSample, makeSurfSlot, surfBed } from '../sea-surf.js';

export const POV = Object.freeze({
  fov: 78 * Math.PI / 180,  // vertical: the width of a camera worn on the head
  // A HEAD-STRAP CAMERA, which is how surfing is filmed first-person: on top of the head, a little
  // forward. Not AT the eyes: from there a paddling arm swung inside the renderer's 0.25 m near
  // plane and was cut open - a hollow sleeve across the frame (26 Sep). From the crown every part
  // of the arm stays 0.4 m or more away (measured on the paddling pose), and the view is the same.
  face: 0.03,               // m from the middle of the head toward the face...
  eyeUp: 0.13,              // ...and up to the crown, where the strap holds the camera
  eyeH: 0.17,               // m above the deck at least (lying down, the face is right over it)
  // How far above the face's own line the eyes look: lying down the face points 35 deg down at the
  // deck, but you look up the board at where you are going.
  // Riding, the head looks down the line and the eyes drop to the board under you - a head-cam
  // riding shot has the nose and the front foot along the bottom of the frame.
  raise: [0.3, 0, -0.46, 0],  // PRONE, DUCK (own line), RIDE, WIPE
  raiseSit: -0.28,          // sitting up the face is level; the eyes drop to the board's nose in front
  duckLook: -0.18,          // rad below the board's line, under a duck-dive: down the deck to the nose
  band: 0.35,               // m either side of the surface the lens never sits in
  turnT: 0.12,              // s: how quickly the view follows the head
  glance: 2.5,              // rad over the shoulder, looking back at a wave
  glanceT: 0.5,             // s to turn and look
  minStill: 0.55,           // m of still water needed to take the lens under at all (b29's lesson)
  hold: 0.45,               // s the chase camera's dive stays with the eyes after coming up
});

const wrap = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

// Board frame -> world, the way gl/surfers.js place() carries the board and its rider: pitch (nose
// up +), roll, then heading. `o` adds the board's position.
function place(p, pitch, roll, heading, o) {
  const cp = Math.cos(pitch), sp = Math.sin(pitch), cr = Math.cos(roll), sr = Math.sin(roll);
  const ch = Math.cos(heading), sh = Math.sin(heading);
  let x = p[0] * cp - p[1] * sp, y = p[0] * sp + p[1] * cp, z = p[2];
  const y2 = y * cr - z * sr, z2 = y * sr + z * cr; y = y2; z = z2;
  const wx = ch * x - sh * z, wz = sh * x + ch * z;
  return o ? [o[0] + wx, o[1] + y, o[2] + wz] : [wx, y, wz];
}

// A wave face coming up behind a rider facing the beach: sampled 5-15 m out to sea (+Z offshore).
function waveBehind(S, h, sea, t) {
  const ss = S.ss || (S.ss = makeSurfSlot());
  for (const d of [5, 10, 15]) {
    const W = surfSample(h.x, h.z + d, t, 0, sea.surfCtl, ss);
    if (W.active && W.amp > 0.22 && W.chi > -2.4 && W.chi < -0.15) return true;
  }
  return false;
}

// cam: written (x, y, z, yaw, pitch). h: the SurfBoard. F: the SurferFigure (null -> false). Returns
// true when it placed the camera.
export function povCamera(S, cam, h, F, sea, t, dt) {
  if (!F || !F.pose || !sea || !sea.sample) return false;
  dt = Math.max(1 / 240, Math.min(0.1, dt || 1 / 60));
  const snap = !(Math.abs(t - (S.t ?? -99)) < 0.25);          // first frame, or back after a gap
  S.t = t;
  const st = h.state | 0;
  let eye, yaw, pitch;
  if (st === 3) {
    // Off the board, under the whitewater: beside the board, a little under, rolling and looking for it.
    const ch = Math.cos(h.heading), sh = Math.sin(h.heading);
    const x = h.x - ch * 0.8, z = h.z - sh * 0.8, surf = sea.sample(x, z, t, 0, 3).height;
    const bed = (sea.tide || 0) - surfBed(x, z);
    eye = [x, Math.max(bed + 0.15, surf - 0.45), z];
    yaw = h.heading + 0.4 * Math.sin(t * 2.1);
    pitch = 0.15 + 0.3 * Math.sin(t * 1.6);
  } else {
    const ex = F.ex || { pitch: 0, drop: 0 };
    const bp = ex.abs ? ex.pitch : (h.pitch || 0) + ex.pitch, roll = h.roll || 0;
    const E = F.eyes();
    const p = [0, 1, 2].map((i) => E.c[i] + E.f[i] * POV.face + E.u[i] * POV.eyeUp);
    p[1] = Math.max(p[1], E.deck + POV.eyeH);
    eye = place(p, bp, roll, h.heading, [h.x, h.yDraw + (ex.drop || 0), h.z]);
    const d = st === 1 ? place([Math.cos(POV.duckLook), Math.sin(POV.duckLook), 0], bp, 0, h.heading) : place(E.f, bp, roll, h.heading);
    yaw = Math.atan2(d[2], d[0]);
    // Lying down or sitting up is one state (PRONE); the figure's own sit blend says which.
    const r = st === 0 ? POV.raise[0] + (POV.raiseSit - POV.raise[0]) * Math.min(1, Math.max(0, F.sit || 0)) : POV.raise[st];
    pitch = Math.asin(Math.max(-1, Math.min(1, d[1]))) + r;
  }
  // LOOKING BACK at a wave, waiting to catch it.
  const facingIn = -Math.sin(h.heading) > 0.3;
  const back = st === 0 && facingIn && (h.thr || 0) < 0.25 && waveBehind(S, h, sea, t);
  S.g = snap ? (back ? 1 : 0) : (S.g || 0) + ((back ? 1 : 0) - (S.g || 0)) * Math.min(1, dt / POV.glanceT);
  F.lookCtl = S.g;
  yaw += S.g * POV.glance;
  pitch = pitch * (1 - S.g) + 0.04 * S.g;
  // Smooth where the head points (not where the eyes are: the lens goes with the head).
  if (snap || S.yaw === undefined) { S.yaw = yaw; S.pitch = pitch; }
  else {
    const k = Math.min(1, dt / POV.turnT);
    S.yaw = wrap(S.yaw + wrap(yaw - S.yaw) * k);
    S.pitch += (pitch - S.pitch) * k;
  }
  // Through the surface in one frame, never with the lens in it: WHICH side follows the eyes' own
  // height (a few cm of hysteresis); the band only says how far from the surface the lens then sits.
  const wy = sea.sample(eye[0], eye[2], t, 0, 3).height, band = POV.band;
  const side = eye[1] > wy + 0.03 ? 1 : eye[1] < wy - 0.03 ? -1 : (S.below ? -1 : 1);
  if (Math.abs(eye[1] - wy) < band) eye[1] = wy + side * band;
  S.below = eye[1] < wy;
  cam.x = eye[0]; cam.y = eye[1]; cam.z = eye[2];
  cam.yaw = S.yaw; cam.pitch = Math.max(-1.2, Math.min(0.7, S.pitch));
  return true;
}

// May the lens go under here at all? Still water, decided once as a dive starts.
export function deepEnough(h, sea) {
  return !!sea && surfBed(h.x, h.z) >= POV.minStill;
}
