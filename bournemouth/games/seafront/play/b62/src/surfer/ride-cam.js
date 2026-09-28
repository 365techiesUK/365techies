// THE RIDE VIEW (27 Sep 2026). The owner: "when you get actually up on a wave, shouldn't it change
// view so you can actually see yourself surfing on the wave ... with the pier in the background".
//
// Played through the rider's own eyes (pov-cam.js), the ride - the best moment in the level - was
// the one you never saw: the board's nose and the water ahead. So when you stand up the camera goes
// out to film you. The hub (boats/hub.js _rideView) blends into this from your eyes as you pop up and
// back to them when the ride ends; the C key / VIEW choice is untouched.
//
// TWO SHOTS (stage 2 of the PIER SURF revamp, 27 Sep 2026). The first ride view had one, LINE:
// behind you, off the sea side, looking down the line with the pier ahead. The audit measured it on
// the staged big-day ride (tmp-audit/show/camlab.mjs): it sees the wave's face almost edge-on - the
// sine of the lens's angle to the face 0.12 (7 deg) - so a 1.9 m face read as flat water ("15 s of a
// man standing on flat water"), filling 28% of the frame. And the drop, the steepest second of the
// ride, was spent inside the 0.9 s blend out of your head. Now:
//   FACE  from the beach side, a little ahead of you and low, aimed past you at the crest: you ride
//         up the face toward the lens. Measured on the same ride (tmp-audit/stage2-cam/lab.mjs, the
//         real camera path): sine 0.79, the face 42% of the picture's height (LINE 0.12, 15-18%).
//         As you stand - the drop - and after every move you bank. It looks back at the wave, so
//         the pier is behind it: on that 11.3 s ride a 3 s hold kept the pier in the picture 67% of
//         the time (LINE alone 100%). The hold is 1.5 s (27 Sep 2026): the drop is FACE's, and the
//         pier is in the picture 80% of the ride - PIER SURF's own view (2 s 75%, 1.2 s 82%).
//   LINE  the first shot, the pier ahead of you, swung back round to 1.2 s after FACE's hold, its aim
//         turned toward the open shoulder (the unbroken wall you are riding toward).
// RIDE_VIEW.shot picks one of them for the whole ride ('face' / 'line') or both in turn ('auto'), so
// the level can offer "ride cam: FACE / LINE".
//
// Smoothed on purpose: where the lens is follows a critically damped spring told how fast the board
// is going (so it does not trail at speed), the line it films swings rather than jerks (the trailer's
// lesson), and the board's own heave does not shake it. Read-only on the board. No Math.random.

import { shoreCoords, SURF } from '../sea-surf.js';

export const RIDE_VIEW = {
  // b44 shipped this switched off: the first take's blend out of your eyes went through your own
  // back. On from b45 (the blend arcs over your shoulder - `arc` below - and the side is the sea's).
  on: true,
  // 'cinema' (28 Sep 2026, the default): THE DIRECTOR - five shots picked by what you are doing (RIDE_VIEW.cine,
  // cinemaCamera below). 'auto': FACE as you stand and after each banked move, then LINE - the ride view as it
  // was. 'face' / 'line': that one only.
  shot: 'cinema',
  inT: 0.9,         // s to blend out of your eyes as you stand up...
  outT: 0.6,        // ...and back into them when the ride ends
  // The blend LOOKS at you first (hub._rideView): its aim is all the shot's by this fraction of the
  // blend (0.27 s of the 0.9). Aimed where the eyes were aimed all the way out, the lens filmed the
  // back of your own head for a third of a second (lmain f85: 15% of the frame) - on the drop.
  aimK: 0.3,
  clipMin: 2.0,     // m: kept out of the pier (hub._unclip) the lens comes no nearer you than this
  // ---- LINE: behind you, off the sea side, down the line --------------------------------------
  fov: 56 * Math.PI / 180,   // vertical; a filming lens, not the head-cam's 78
  back: 4.4,        // m behind the rider along the line of travel
  side: 2.0,        // m off to one side...
  sideSign: 1,      // ...+1 the sea side: your front, the board, the pier and the big wheel behind
                    // you (-1, the beach side, filmed your back; both scouted 27 Sep)
  up: 1.7,          // m above the rider's board
  ahead: 5.0,       // m ahead of the rider the lens aims at...
  aimUp: 0.7,       // ...this far up (so you sit in the lower-middle of the frame)
  // ...turned 40% of the way toward the open shoulder (stage 2's 60/40): riding down the face at an
  // angle your line points partly at the beach; the wave you ride, and the pier, do not.
  open: 0.4,
  // The rider's middle is held within this fraction of the half-frame of the picture's middle (this
  // much less on a portrait phone), by a soft limit - see rideCamera. It holds LINE's shoulder aim
  // and a swing between the shots.
  keep: 0.55, keepNarrow: 0.1,
  dirT: 0.55,       // s: how quickly the shot swings to a new line (heavier than the head's)
  posW: 7,          // rad/s: the position spring
  minAbove: 0.7,    // m above the water under the lens, at least
  arc: 1.3,         // m the blend path lifts at its middle, up and over your shoulder (hub._rideView)
  hideNear: 0.6,    // m: blending, a lens this close to the eyes is inside the head - the body is not drawn
  // A NARROW SCREEN (a phone held upright). Off to one side and aiming ahead of you, the shot put you
  // 12 deg off the middle of the picture - fine at 16:9 (43 deg either side), half out of it on a
  // portrait phone (14 deg either side at 390x844). Found filming the Shorts cut, 27 Sep. As the
  // screen narrows (aspect 1.2 -> 0.5) the lens comes in behind you and aims closer to you:
  // ...and LINE's shoulder aim (`open`) goes: at 390x844 it alone put you 0.43 of the way to the edge,
  // an arm out of the picture on the carves (tmp-audit/stage2-cam film-p f457-f607, 27 Sep).
  narrow: { side: 0.6, ahead: 0.7, back: 1.2, open: 1 },   // fractions off side / ahead / open, and metres further back
  // ---- FEELING THE SPEED (27 Sep 2026, stage 5), times the player's CAMERA MOTION dial (view3d.js
  // CAM_LEVELS: full 1, reduced 0.45, off 0 - reaching rideCamera as S.motion; OFF is the shot exactly
  // as it was, and so is a caller that sets nothing - the suites). No roll: that was tried and rejected.
  feel: {
    fovAdd: 7 * Math.PI / 180,   // the lens opens this much from v0 to v1 m/s...
    v0: 4, v1: 7,
    // ...the aim trails a turn by lag x yaw rate x speed metres (the shot swings). The plan's 0.35 put
    // the aim 2 m off (22 deg) on a hard carve and whipped the FACE-LINE swing to 7.8 deg a frame
    // (test-surf-cam); 0.12, smoothed over 0.4 s and at most 1 m (11 deg), stays a swing. None on a
    // portrait phone: its picture is 14 deg either side, and the lag alone pushed you 0.44 out.
    lag: 0.12,
    lagT: 0.4,        // s: the yaw rate it trails, smoothed
    lagMax: 1.0,      // m at most
    kick: 0.15,       // m: ...and a banked move nudges the lens toward the outside of its turn,
    kickT: 0.4,       // s: settling back over this long
  },
  // ---- THE END OF A RIDE (stage 5): a beat, then a cut to your eyes (boats/hub.js _rideView) - never
  // the 0.6 s pull back in through your own head (the b52 kick-out, lmain f978-f994).
  hero: {
    kick: 1.6,        // s: a kick-out's hero hold, at most (any paddling ends it sooner)...
    other: 0.8,       // ...the wave running out from under you (outran, over the back, the shallows)
    swing: 40 * Math.PI / 180,   // the lens swings this far round toward your front (the sea side)...
    inT: 0.4,         // ...over this long...
    slow: 0.6,        // ...and the position spring slows by this much, so it settles on you
  },
  wipe: { t: 0.35, push: 0.3, pushT: 0.3, shake: 0.08 },   // a fall: pushed in 30% with a shake, then the cut
  // ---- FACE: from the beach side, the wave's face behind you --------------------------------------
  face: {
    fov: 44 * Math.PI / 180,   // vertical: a longer lens, so the face stands up behind you
    ahead: 3.0,       // m ahead of the rider along the line of travel...
    beach: 5.5,       // ...and toward the beach (-Z on this coast)
    up: 0.9,          // m above the board at least (it sits on the face, below the rider's water)...
    minAbove: 0.7,    // ...and this far above the water under the lens
    riderUp: 0.9,     // m: "the rider" is the middle of the standing body...
    aim: 0.35,        // ...and the lens aims this far from there to the crest
    aimMax: 3.0,      // m: at most this far off the rider (a bigger wave behind would pull you out of shot)
    reach: 30, n: 13, // the crest: 13 heights 0-30 m seaward (2.5 m apart), refined through a parabola
    crestT: 0.25,     // s: how quickly the aim follows the crest (a new crest is a new aim, not a jump)
    // A PORTRAIT PHONE: 2.5 m further toward the beach and half the ahead offset, so the rider and
    // the crest both fit 10.6 deg either side of the middle (a 44 deg lens at 390x844).
    narrow: { beach: 2.5, ahead: 0.5 },
    hold: 1.5,        // s of FACE from the pop-up (the drop, and the first turn off the bottom)...
    moveHold: 1.2,    // ...and after each move banked (the board's ride.movesBanked), once swung round...
    ease: 1.2,        // ...then this long to swing round to LINE...
    inT: 1.0,         // ...and this long to swing back to FACE on a move (0.6 whipped 7.4 deg a frame)
  },
  // ---- THE DIRECTOR (28 Sep 2026) ----------------------------------------------------------------------
  // The owner: "when you're ... doing a stunt or ... surfing a wave ... the camera angles can change so it's
  // like a cinematic sort of look ... a really good angle on it so you can see what you're doing". The
  // trailers' film cameras (tmp-tr201/film/shots/trailer-cine.mjs: W on the water, A the drone, H the beach
  // telephoto), brought into the game with FACE and LINE, and a director that picks one by the moment:
  //   the drop            WATER  low on the water ahead of you, looking back up the face: the wave's size
  //   down the line       LINE   (the pier ahead), and every lineT s a DRONE interlude - high behind you
  //   a move banked       FACE   (as before: the face behind you, the crest over you)
  //   an AIR              SIDE   a CUT to the beach telephoto, side-on, for the flight and a moment after -
  //                              and a cut back out of it
  //   the kick-out        DRONE  up and back, the wave running on to the pier (the hub's hero hold)
  //   a nose ride         NOSE   side-on from the beach, close: you out on the front of the longboard
  // Everything but the air shot is a SWING round you (swingT), never through you, never a cut while you steer.
  // Each shot: `a` m along your line of travel (+ ahead), `beach` m toward the beach (-Z), `sea` m off to the
  // sea side; `up` m over the board (or over the water under the lens, water: true), at least minAbove
  // over the water; aimed at `aim` - the rider (up aimUp) or a point `ahead` m down the line; `fov`
  // vertical. `narrow`: the same on a phone held upright (aspect 0.5 and under), linearly between.
  cine: {
    dropT: 1.8,       // s of WATER from the pop-up (the drop, and the bottom turn after it)
    moveHold: 1.4,    // s of FACE from a banked move
    airAfter: 0.7,    // s the SIDE shot holds after the landing
    noseWalk: 0.7, noseAfter: 0.8,   // NOSE from this far out along the board, held this long after you walk back
    lineT: 4.5, droneT: 3.0,   // s of LINE before a DRONE interlude, and its length
    swingT: 1.1,      // s a swing takes at least (LINE <-> FACE was 1.0-1.2: under 6.5 deg a frame)...
    swingW: 1.9,      // ...and longer when it has further to go round you: this many rad/s on average
    // THE WAVE IN THE WAY: the low shots (WATER, FACE) sit on the beach side, below the crest - a rider up over
    // the lip was hidden by the wave itself (the director's first film, 28 Sep: 0.4 s of nothing but water; the
    // classic ride view had it too, ~0.7 s before each air). The water is looked at `los` places along the line
    // from the lens to you, and the lens lifted till that line clears it by losClear m - up in losUp s, down
    // again in losDown s.
    // (0.88: the lip right beside you - the two further out missed it, 0.12 s hidden in FACE on the air ride)
    los: [0.35, 0.7, 0.88], losClear: 0.25, losUp: 0.08, losDown: 0.7,
    shots: {
      water: { a: 9, beach: 3, sea: 0, up: 0.8, water: true, minAbove: 0.55, aim: 'rider', aimUp: 1.0, fov: 50,
               narrow: { a: 7, beach: 2, fov: 58 } },
      drone: { a: -11, beach: 4, sea: 0, up: 7, minAbove: 3, aim: 'line', ahead: 6, aimUp: 0.6, fov: 50,
               narrow: { beach: 2, fov: 56 } },
      side:  { a: 3, beach: 16, sea: 0, up: 2.2, minAbove: 1.0, aim: 'rider', aimUp: 0.9, fov: 22,
               narrow: { beach: 14, fov: 30 } },
      // NOSE RIDING (28 Sep 2026): the longboard's classic picture - side-on from the beach, close and low, the
      // whole board and you out on the front of it, toes over the nose
      nose:  { a: 1.2, beach: 7, sea: 0, up: 0.9, minAbove: 0.6, aim: 'rider', aimUp: 0.7, fov: 34,
               narrow: { beach: 6.5, fov: 44 } },
    },
  },
};

const wrap = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// An angle off the middle of the picture, squeezed smoothly (same slope at the knee) toward `lim`.
const soft = (off, lim) => {
  const a = Math.abs(off), knee = 0.6 * lim;
  return a <= knee ? off : Math.sign(off) * (knee + (lim - knee) * Math.tanh((a - knee) / (lim - knee)));
};

// THE CREST seaward of the rider: heights at `n` points from 0 to `reach` m out along +Z (offshore on
// this coast), the highest refined through the parabola on it and its neighbours. Writes S.ck (m
// out) and S.cy (height). 13 samples a frame (the lead's budget); nothing per pixel.
function findCrest(S, sea, x, z, t) {
  const F = RIDE_VIEW.face, n = F.n, step = F.reach / (n - 1);
  const H = S.hs || (S.hs = new Float64Array(n));
  let i0 = 0;
  for (let i = 0; i < n; i++) {
    H[i] = sea.sample(x, z + i * step, t, 0, 3).height;
    if (H[i] > H[i0]) i0 = i;
  }
  let k = i0 * step, y = H[i0];
  if (i0 > 0 && i0 < n - 1) {
    const a = H[i0 - 1], b = H[i0], c = H[i0 + 1], den = a - 2 * b + c;
    if (den < -1e-9) { const d = clamp(0.5 * (a - c) / den, -0.5, 0.5); k += d * step; y = b - 0.25 * (a - c) * d; }
  }
  S.ck = k; S.cy = y;
}

// THE OPEN SHOULDER: which way along the wave is still unbroken. The surf's phase carries
// +SURF.KO * o (sea-surf.js: Snell's alongshore wavenumber), so on a line of equal depth a crest
// arrives first where KO * o is largest - the break peels toward falling KO * o, and that way is
// the shoulder (on this bank: toward the pier - the staged ride goes from o 76 to o 30). A unit
// vector into out[], or false where the shore has no alongshore coordinate (the arena: o is 0).
const _s0 = {}, _s1 = {};
export function shoulder(x, z, out) {
  shoreCoords(x, z, _s0); const o0 = _s0.o;
  shoreCoords(x + 1, z, _s1); const gx = _s1.o - o0;
  shoreCoords(x, z + 1, _s1); const gz = _s1.o - o0;
  const g = Math.hypot(gx, gz), s = -Math.sign(SURF.KO);
  if (!(g > 1e-6) || !s) return false;
  out[0] = s * gx / g; out[1] = s * gz / g;
  return true;
}
const _sh = [0, 0];

// WHICH SHOT: 0 = FACE, 1 = LINE. FACE for `hold` s from a pop-up (a new h.ride) and `moveHold` s
// from each move the board banks. THE MOVES: the board's ride.movesBanked, a count (the level empties
// h.events every tick, so an event is gone before a camera could read it). Until the board has it,
// FACE only follows the pop-up. A stand-in with no ride at all (a test's) gets FACE from `snap`.
function shotGoal(S, h, t, snap) {
  const V = RIDE_VIEW, F = V.face, R = h.ride || null;
  if (snap) { S.ride = null; S.faceTo = t + F.hold; S.moves = 0; }
  if (R && R !== S.ride) {
    S.ride = R;
    const age = R.t0 !== undefined && h.time !== undefined ? Math.max(0, h.time - R.t0) : 0;
    S.faceTo = t + F.hold - age;
    S.moves = typeof R.movesBanked === 'number' ? R.movesBanked : 0;
  }
  if (R && typeof R.movesBanked === 'number') {
    // the hold is FACE's own 1.2 s: it starts once the swing back to FACE (F.inT, from LINE) is done
    if (R.movesBanked > S.moves) S.faceTo = Math.max(S.faceTo, t + F.inT * (S.w || 0) + F.moveHold);
    S.moves = R.movesBanked;   // followed down as well as up, so a recount never swallows the next move
  }
  if (V.shot === 'face') return 0;
  if (V.shot === 'line') return 1;
  return t < S.faceTo ? 0 : 1;
}

// cam: written - the lens (x, y, z), its aim (yaw, pitch; and the point, ax / ay / az), the rider it
// films (lx / ly / lz), its vertical lens (fov) and which shot it is in (shot: 0 FACE .. 1 LINE).
// h: the SurfBoard. S: this camera's own state. snap: start fresh. aspect: width / height (16:9).
export function rideCamera(S, cam, h, sea, t, dt, snap, aspect) {
  if (RIDE_VIEW.shot === 'cinema') return cinemaCamera(S, cam, h, sea, t, dt, snap, aspect);
  const V = RIDE_VIEW, F = V.face, asp = aspect || 16 / 9;
  const nw = clamp((1.2 - asp) / 0.7, 0, 1);
  dt = clamp(dt || 1 / 60, 1 / 240, 0.1);
  snap = snap || S.dir === undefined;
  // The line of travel: where the board is going, not where it points (a board slides on a face).
  const sp = Math.hypot(h.vx || 0, h.vz || 0);
  const dir = sp > 1.2 ? Math.atan2(h.vz, h.vx) : h.heading;
  if (snap) S.dir = dir;
  else S.dir = wrap(S.dir + wrap(dir - S.dir) * Math.min(1, dt / V.dirT));
  const fx = Math.cos(S.dir), fz = Math.sin(S.dir);
  // The side: +Z is offshore on this coast, so "the sea side" is whichever side vector points +Z.
  let rx = -fz, rz = fx;
  if (Math.sign(rz || 1) !== Math.sign(V.sideSign)) { rx = -rx; rz = -rz; }
  const by = h.yDraw !== undefined ? h.yDraw : (h.y || 0);

  // THE SHOT, eased: toward LINE over F.ease, back toward FACE (a move) over F.inT.
  const goal = shotGoal(S, h, t, snap);
  const w0 = snap || S.w === undefined ? goal : S.w;
  S.w = snap || S.w === undefined ? goal : goal > S.w ? Math.min(goal, S.w + dt / F.ease) : Math.max(goal, S.w - dt / F.inT);
  const s = S.w * S.w * (3 - 2 * S.w), s0 = w0 * w0 * (3 - 2 * w0);

  // LINE AIMS 60/40 down your line and the way the open shoulder lies. Only the aim: turning the whole
  // shot as well kept you in the middle but swung the lens round from 36 deg off your tail (the sea
  // side, your front - the side the owner chose) to 7 (your back) on the staged ride's line.
  let ux = fx, uz = fz;
  const open = V.open * (1 - V.narrow.open * nw);
  if (open > 0 && shoulder(h.x, h.z, _sh)) {
    const bx = fx * (1 - open) + _sh[0] * open, bz = fz * (1 - open) + _sh[1] * open, bl = Math.hypot(bx, bz);
    if (bl > 0.3) { ux = bx / bl; uz = bz / bl; }
  }
  // WHERE THE LENS GOES, as (along the line of travel, off to the sea side) round the rider.
  const side = V.side * (1 - V.narrow.side * nw), ahead = V.ahead * (1 - V.narrow.ahead * nw), back = V.back + V.narrow.back * nw;
  const fAhead = F.ahead * (1 - F.narrow.ahead * nw), fBeach = F.beach + F.narrow.beach * nw;
  const la = -back, lc = side;
  const fa = fAhead - fBeach * fz, fc = -fBeach * rz;   // the beach is -Z: along -fz, across -rz
  // FROM ONE TO THE OTHER ROUND YOU, NOT THROUGH YOU. Straight across, FACE (ahead, beach side) to
  // LINE (behind, sea side) passes 1.7 m from the rider at head height; swung round on a circle it
  // stays 4.8 m or more out, behind you - the pier comes into the shot as it goes. The way round is
  // chosen as a swing starts and kept to its end (a carve mid-swing must not flip it to the other side).
  const aF = Math.atan2(fc, fa), aL = Math.atan2(lc, la), dF = Math.hypot(fa, fc), dL = Math.hypot(la, lc);
  let da = wrap(aL - aF);
  if (w0 <= 0 || w0 >= 1 || !S.arc) S.arc = da < 0 ? -1 : 1;
  else if (Math.sign(da) !== S.arc) da += S.arc * 2 * Math.PI;
  // THE HERO HOLD (S.hero 0..1, set by the hub after a kick-out): round toward your front - straight
  // out on the sea side (+pi/2 here) - by at most RIDE_VIEW.hero.swing.
  const hero = clamp(S.hero || 0, 0, 1), sw = V.hero.swing;
  const round = (q, out) => {
    let ang = aF + da * q;
    // (sw x cos(ang): zero on the sea side and the beach side, smooth all the way round - the clamp of
    // wrap(pi/2 - ang) flipped +40 to -40 deg where the lens crossed the beach side, a 9-10 deg jerk in
    // one frame of the hold; the b53 review)
    if (hero > 0) ang += sw * hero * Math.cos(ang);
    const dist = dF + (dL - dF) * q, oa = Math.cos(ang) * dist, oc = Math.sin(ang) * dist;
    out[0] = fx * oa + rx * oc; out[1] = fz * oa + rz * oc;
    return out;
  };
  const o1 = round(s, _o1), o0 = round(s0, _o0);
  // FEELING THE SPEED (V.feel): the yaw rate, smoothed; the way the last real turn went; a banked move.
  const M = clamp(S.motion || 0, 0, 1), FE = V.feel;
  const r = h.r || 0;
  S.rr = snap || S.rr === undefined ? r : S.rr + (r - S.rr) * Math.min(1, dt / FE.lagT);
  if (Math.abs(S.rr) > 0.3) S.turnSign = Math.sign(S.rr);
  const mb = h.ride && typeof h.ride.movesBanked === 'number' ? h.ride.movesBanked : 0;
  if (snap || S.mb === undefined) { S.mb = mb; S.kk = 0; }
  if (mb > S.mb) S.kk = 1;
  S.mb = mb;
  S.kk *= Math.exp(-dt / FE.kickT);
  // The outside of a turn with the heading increasing (turnSign +1) is the (fz, -fx) side.
  const kq = FE.kick * M * S.kk * (S.turnSign || 0);
  const tx = h.x + o1[0] + fz * kq, tz = h.z + o1[1] - fx * kq;
  let ty = by + F.up + (V.up - F.up) * s, floor = -Infinity;
  const minA = F.minAbove + (V.minAbove - F.minAbove) * s;
  if (sea && sea.sample) { floor = sea.sample(tx, tz, t, 0, 3).height + minA; if (ty < floor) ty = floor; }
  // Position through a critically damped spring (no overshoot), fresh on a snap. It is told how fast
  // the spot it chases is moving (the board's own velocity along the water), so it does not trail
  // behind at speed: without that the lens sat 6 m back at 6 m/s instead of 4.4, and further on a
  // faster ride - you got smaller the better you surfed. Heave (y) is left to the spring alone.
  // A SWING between the shots is fed forward too (the change of the offset round the rider this frame,
  // from the shot alone - a carve's turn is still left to the spring): at its fastest the swing moves
  // the spot 20 m/s round you, and chasing that the spring cut 5 m inside the circle, toward you.
  const swx = (o1[0] - o0[0]) / dt, swz = (o1[1] - o0[1]) / dt;
  if (snap || S.x === undefined) { S.x = tx; S.y = ty; S.z = tz; S.vx = h.vx || 0; S.vy = 0; S.vz = h.vz || 0; }
  else {
    const w = V.posW * (1 - V.hero.slow * hero);
    for (const [p, v, tp, tv] of [['x', 'vx', tx, (h.vx || 0) + swx], ['y', 'vy', ty, 0], ['z', 'vz', tz, (h.vz || 0) + swz]]) {
      S[v] += (w * w * (tp - S[p]) + 2 * w * (tv - S[v])) * dt;
      S[p] += S[v] * dt;
    }
  }
  // ...but never below the water's clearance: FACE sits 0.9 m over your board, on the face, and a
  // wave lifting the water under the lens outran the spring - 0.59 m clear on a 6 m/s run (27 Sep).
  if (S.y < floor) { S.y = floor; if (S.vy < 0) S.vy = 0; }

  // WHERE IT AIMS. FACE: 35% of the way from you to the crest behind you, so you and the face both
  // fit; the crest's offset follows through a short lag (a new crest found is a new aim, not a jump).
  const ry = by + F.riderUp;
  let cz = 0, cy = 0;
  if (sea && sea.sample && s < 1) {
    findCrest(S, sea, h.x, h.z, t);
    cz = Math.min(F.aimMax, F.aim * S.ck); cy = clamp(F.aim * (S.cy - ry), -F.aimMax, F.aimMax);
  }
  if (snap || S.az === undefined) { S.az = cz; S.ay = cy; }
  else if (s < 1) { const k = Math.min(1, dt / F.crestT); S.az += (cz - S.az) * k; S.ay += (cy - S.ay) * k; }
  // LINE: ahead of you along its line, a little up.
  // The aim TRAILS a turn (V.feel.lag): off to the outside of it by lag x yaw rate x speed.
  const lag = clamp(-FE.lag * S.rr * sp * M, -FE.lagMax, FE.lagMax) * (1 - nw);
  const ax = h.x + ux * ahead * s - fz * lag, az = h.z + S.az * (1 - s) + uz * ahead * s + fx * lag;
  const ay = (ry + S.ay) * (1 - s) + (by + V.aimUp) * s;
  const sv = clamp((sp - FE.v0) / (FE.v1 - FE.v0), 0, 1);
  const fov = F.fov + (V.fov - F.fov) * s + FE.fovAdd * M * sv * sv * (3 - 2 * sv);
  let yaw = Math.atan2(az - S.z, ax - S.x), pitch = Math.atan2(ay - S.y, Math.hypot(ax - S.x, az - S.z));
  // THE RIDER STAYS IN SHOT, whatever the lens is doing: the middle of the body no further off the
  // middle of the picture than V.keep of the way to its edge (less on a narrow screen), eased in
  // past 60% of that (a soft limit - a hard one kinks the pan where it starts to act). It holds LINE's
  // shoulder aim, which alone put you 0.46 of the half-frame out at 16:9 (0.83 on the S-turns), and a
  // swing, where the aim moved on ahead of a lens still coming round (you were 1.16 out).
  const keep = V.keep - V.keepNarrow * nw;
  const offY = wrap(Math.atan2(h.z - S.z, h.x - S.x) - yaw);
  yaw += offY - soft(offY, keep * Math.atan(Math.tan(fov / 2) * asp));
  const offP = Math.atan2(ry - S.y, Math.hypot(h.x - S.x, h.z - S.z)) - pitch;
  pitch += offP - soft(offP, keep * fov / 2);
  // ...and the aim point is put on that line (the hub re-aims from the blended lens at it).
  const D = Math.max(1, Math.hypot(ax - S.x, ay - S.y, az - S.z)), cp = Math.cos(pitch);
  cam.x = S.x; cam.y = S.y; cam.z = S.z;
  cam.yaw = yaw; cam.pitch = pitch;
  cam.ax = S.x + Math.cos(yaw) * cp * D; cam.ay = S.y + Math.sin(pitch) * D; cam.az = S.z + Math.sin(yaw) * cp * D;
  cam.lx = h.x; cam.ly = ry; cam.lz = h.z;
  cam.fov = fov;
  cam.shot = s;
  return true;
}
const _o1 = [0, 0], _o0 = [0, 0];

// ---------------------------------------------------------------- THE DIRECTOR (RIDE_VIEW.cine, 28 Sep 2026)
// WHICH SHOT, from what the board is doing (see RIDE_VIEW.cine). Returns { want, cut }; keeps its own
// state in S (cs the shot, cUntil when the moment's shot may end, cLineT when LINE began...).
function cineGoal(S, h, t, snap) {
  const C = RIDE_VIEW.cine, R = h.ride || null, air = !!h.air;
  if (snap || !S.cs) { S.cs = null; S.cRide = null; S.cUntil = -1; S.cLineT = t; S.cMoves = 0; S.cAir = false; }
  let want = S.cs || 'water', cut = false;
  if (R && R !== S.cRide) {
    S.cRide = R;
    const age = R.t0 !== undefined && h.time !== undefined ? Math.max(0, h.time - R.t0) : 0;
    want = 'water'; S.cUntil = t + C.dropT - age;
    S.cMoves = typeof R.movesBanked === 'number' ? R.movesBanked : 0;
  }
  // AN AIR: a cut to the beach telephoto as the board leaves the lip, held to airAfter s past the landing
  if (air && !S.cAir) { want = 'side'; cut = !!S.cs; S.cUntil = Infinity; }
  else if (!air && S.cAir) S.cUntil = t + C.airAfter;
  S.cAir = air;
  // A NOSE RIDE (a longboard walked out past noseWalk of the way): the longboard's own shot
  const nose = !air && (h.walk || 0) >= C.noseWalk;
  if (nose) { want = 'nose'; S.cUntil = t + C.noseAfter; }
  // A MOVE banked: FACE, as the ride view always did (not over a nose ride: its HANG FIVE is the nose shot's)
  const mb = R && typeof R.movesBanked === 'number' ? R.movesBanked : 0;
  if (mb > (S.cMoves || 0) && !air && !nose && S.cs !== 'side' && S.cs !== 'nose') { want = 'face'; S.cUntil = t + C.swingT + C.moveHold; }
  S.cMoves = mb;
  if ((S.hero || 0) > 0) want = 'drone';                        // the kick-out's hero hold: up and back
  else if (!air && t >= S.cUntil) {
    // between moments: LINE, and every lineT s of it a DRONE interlude of droneT s
    if (S.cs === 'line') { if (t - S.cLineT > C.lineT) { want = 'drone'; S.cUntil = t + C.swingT + C.droneT; } }
    else want = 'line';
  }
  // ...and out of the air shot by a cut too: SIDE is 16 m off on the beach side, LINE behind you - more than
  // half way round, too far to swing in 1.1 s, and straight back to the view you steer by, as you land.
  if (S.cs === 'side' && want !== 'side') cut = true;
  return { want, cut };
}

// ONE SHOT's target this frame, into out: its offset round the rider (ox, oz), its height (y) and the
// water's floor under it, its aim (ax, ay, az) and lens (fov, radians). fx/fz: the line of travel;
// rx/rz: the sea side; ux/uz: LINE's aim line (leaned toward the open shoulder); by: the board's height.
// (swinging: a shot that sits over the board, not the water, is not asked for its water - the swing asks
// for the water where the lens is now instead: the ride cam's budget is 14 sea samples a frame)
function cineShot(id, S, h, sea, t, fx, fz, rx, rz, ux, uz, by, nw, out, swinging) {
  const V = RIDE_VIEW, F = V.face, C = V.cine;
  let a, beach, sea0, up, water = false, minA, aim, ahead = 0, aimUp = 0, fov;
  if (id === 'line') {
    a = -(V.back + V.narrow.back * nw); sea0 = V.side * (1 - V.narrow.side * nw); beach = 0; up = V.up; minA = V.minAbove;
    aim = 'line'; ahead = V.ahead * (1 - V.narrow.ahead * nw); aimUp = V.aimUp; fov = V.fov;
  } else if (id === 'face') {
    a = F.ahead * (1 - F.narrow.ahead * nw); beach = F.beach + F.narrow.beach * nw; sea0 = 0; up = F.up; minA = F.minAbove;
    aim = 'crest'; fov = F.fov;
  } else {
    const T = C.shots[id], N = T.narrow || {};
    const L = (k) => (T[k] || 0) + ((N[k] !== undefined ? N[k] : (T[k] || 0)) - (T[k] || 0)) * nw;
    a = L('a'); beach = L('beach'); sea0 = L('sea'); up = T.up; water = !!T.water; minA = T.minAbove;
    aim = T.aim; ahead = T.ahead || 0; aimUp = T.aimUp || 0; fov = L('fov') * Math.PI / 180;
  }
  out.ox = fx * a + rx * sea0; out.oz = fz * a + rz * sea0 - beach;
  const wh = sea && sea.sample && (water || !swinging) ? sea.sample(h.x + out.ox, h.z + out.oz, t, 0, 3).height : -1e9;
  out.minA = minA;
  out.floor = wh + minA;
  out.y = Math.max(out.floor, water ? wh + up : by + up);
  if (aim === 'rider') { out.ax = h.x; out.ay = by + aimUp; out.az = h.z; }
  else if (aim === 'line') { out.ax = h.x + ux * ahead; out.ay = by + aimUp; out.az = h.z + uz * ahead; }
  else { out.ax = h.x; out.ay = by + F.riderUp + (S.cay || 0); out.az = h.z + (S.caz || 0); }   // FACE: toward the crest
  out.fov = fov;
  return out;
}
const _cT = {};

// THE DIRECTOR'S CAMERA: the same outputs as rideCamera, the same rules - a spring told how fast the board is
// going, swings round you (the way chosen as a swing starts and kept), the lens over the water, you kept in
// the picture by the soft limit - with five shots and the director above picking them.
export function cinemaCamera(S, cam, h, sea, t, dt, snap, aspect) {
  const V = RIDE_VIEW, F = V.face, C = V.cine, FE = V.feel, asp = aspect || 16 / 9;
  const nw = clamp((1.2 - asp) / 0.7, 0, 1);
  dt = clamp(dt || 1 / 60, 1 / 240, 0.1);
  snap = snap || S.dir === undefined;
  const sp = Math.hypot(h.vx || 0, h.vz || 0);
  const dir = sp > 1.2 ? Math.atan2(h.vz, h.vx) : h.heading;
  if (snap) S.dir = dir; else S.dir = wrap(S.dir + wrap(dir - S.dir) * Math.min(1, dt / V.dirT));
  const fx = Math.cos(S.dir), fz = Math.sin(S.dir);
  let rx = -fz, rz = fx;
  if (Math.sign(rz || 1) !== Math.sign(V.sideSign)) { rx = -rx; rz = -rz; }
  const by = h.yDraw !== undefined ? h.yDraw : (h.y || 0);
  let ux = fx, uz = fz;
  const open = V.open * (1 - V.narrow.open * nw);
  if (open > 0 && shoulder(h.x, h.z, _sh)) {
    // (faded in and out, not switched: the classic LINE's `bl > 0.3` switch never meets a board heading away
    // from the shoulder, but the kick-out's DRONE does - a 2.5 m jump of the aim in one frame, 9 deg)
    const bx = fx * (1 - open) + _sh[0] * open, bz = fz * (1 - open) + _sh[1] * open, bl = Math.hypot(bx, bz);
    const k = clamp((bl - 0.3) / 0.3, 0, 1), kk = k * k * (3 - 2 * k);
    if (bl > 1e-6) {
      const vx = (bx / bl) * kk + fx * (1 - kk), vz = (bz / bl) * kk + fz * (1 - kk), vl = Math.hypot(vx, vz);
      if (vl > 1e-6) { ux = vx / vl; uz = vz / vl; }
    }
  }
  // THE SHOT: a new one starts a swing from wherever the lens is now (a snapshot round the rider), or a cut
  const g = cineGoal(S, h, t, snap);
  if (g.want !== S.cs) {
    const prev = S.cs;
    S.cf = prev && !g.cut && !snap && S.cur ? { ...S.cur } : null;
    S.cs = g.want; S.ct0 = t; S.cArc = 0;
    S.cDur = C.swingT;
    if (S.cf) {   // (the way round is decided now: how far it is sets how long it takes)
      const T0 = cineShot(S.cs, S, h, sea, t, fx, fz, rx, rz, ux, uz, by, nw, _cT, true);
      S.cDur = Math.max(C.swingT, Math.abs(wrap(Math.atan2(T0.oz, T0.ox) - S.cf.ang)) / C.swingW);
    }
    if (g.want === 'line') S.cLineT = t + C.swingT;
    if (g.cut) S.cCut = true;
  }
  // FACE's aim toward the crest, followed through a short lag (only while FACE is in the picture)
  if (sea && sea.sample && (S.cs === 'face' || (S.cf && S.cf.id === 'face'))) {
    findCrest(S, sea, h.x, h.z, t);
    const ry0 = by + F.riderUp, cz = Math.min(F.aimMax, F.aim * S.ck), cy = clamp(F.aim * (S.cy - ry0), -F.aimMax, F.aimMax);
    if (S.caz === undefined || snap) { S.caz = cz; S.cay = cy; } else { const k = Math.min(1, dt / F.crestT); S.caz += (cz - S.caz) * k; S.cay += (cy - S.cay) * k; }
  }
  const T = cineShot(S.cs, S, h, sea, t, fx, fz, rx, rz, ux, uz, by, nw, _cT, !!S.cf);
  const angT = Math.atan2(T.oz, T.ox), distT = Math.hypot(T.ox, T.oz);
  let ang = angT, dist = distT, yRel = T.y - by, ax = T.ax - h.x, ay = T.ay - by, az = T.az - h.z, fov = T.fov, floor = T.floor;
  let q = 1;
  if (S.cf) {
    q = clamp((t - S.ct0) / (S.cDur || C.swingT), 0, 1);
    const e = q * q * (3 - 2 * q), f0 = S.cf;
    let da = wrap(angT - f0.ang);
    if (!S.cArc) S.cArc = da < 0 ? -1 : 1;
    // (the way round is kept only across the back of the circle: a target that drifts past the swing's own
    // start - a small angle changing sign - is not a turn the other way round; unwrapping that was a 9 deg
    // one-frame jump in the kick-out's DRONE, test-surf-cinema.mjs)
    else if (Math.sign(da) !== S.cArc && Math.abs(da) > Math.PI / 2) da += S.cArc * 2 * Math.PI;
    ang = f0.ang + da * e; dist = f0.dist + (distT - f0.dist) * e; yRel = f0.yRel + (yRel - f0.yRel) * e;
    ax = f0.ax + (ax - f0.ax) * e; ay = f0.ay + (ay - f0.ay) * e; az = f0.az + (az - f0.az) * e; fov = f0.fov + (fov - f0.fov) * e;
    if (q >= 1) S.cf = null;
  }
  const ox = Math.cos(ang) * dist, oz = Math.sin(ang) * dist;
  S.cur = { id: S.cs, ang, dist, yRel, ax, ay, az, fov };
  // mid-swing, the floor is the water under where the lens is now, not where the shot will put it
  if (q < 1 && sea && sea.sample) floor = sea.sample(h.x + ox, h.z + oz, t, 0, 3).height + Math.min(T.minA, V.minAbove);
  const tx = h.x + ox, tz = h.z + oz;
  let ty = Math.max(by + yRel, floor);
  // THE WAVE IN THE WAY (C.los): the height the lens needs for its line to you to clear the water between
  const ryL = by + F.riderUp;
  let need = -Infinity;
  if (sea && sea.sample) for (const f of C.los) {
    const w = sea.sample(tx + (h.x - tx) * f, tz + (h.z - tz) * f, t, 0, 3).height + C.losClear;
    need = Math.max(need, (w - ryL * f) / (1 - f));
  }
  const lift = Math.max(0, need - ty);
  if (snap || S.los === undefined) S.los = lift;
  else S.los += (lift - S.los) * Math.min(1, dt / (lift > S.los ? C.losUp : C.losDown));
  ty += S.los;
  // the spring, fed forward with the board's velocity and the swing's own motion; a cut snaps it
  const swx = S.pox === undefined || snap ? 0 : (ox - S.pox) / dt, swz = S.poz === undefined || snap ? 0 : (oz - S.poz) / dt;
  S.pox = ox; S.poz = oz;
  if (snap || S.x === undefined || S.cCut) {
    S.x = tx; S.y = ty; S.z = tz; S.vx = h.vx || 0; S.vy = 0; S.vz = h.vz || 0; S.cCut = false;
  } else {
    const w = V.posW;
    for (const [p, v, tp, tv] of [['x', 'vx', tx, (h.vx || 0) + (q < 1 ? swx : 0)], ['y', 'vy', ty, 0], ['z', 'vz', tz, (h.vz || 0) + (q < 1 ? swz : 0)]]) {
      S[v] += (w * w * (tp - S[p]) + 2 * w * (tv - S[v])) * dt;
      S[p] += S[v] * dt;
    }
  }
  if (S.y < floor) { S.y = floor; if (S.vy < 0) S.vy = 0; }
  // FEELING THE SPEED: the lens opens with speed, as much as the player's CAMERA MOTION allows
  const M = clamp(S.motion || 0, 0, 1), sv = clamp((sp - FE.v0) / (FE.v1 - FE.v0), 0, 1);
  fov += FE.fovAdd * M * sv * sv * (3 - 2 * sv);
  // THE AIM, and the rider held in the picture by the soft limit
  const ry = by + F.riderUp;
  const AX = h.x + ax, AY = by + ay, AZ = h.z + az;
  let yaw = Math.atan2(AZ - S.z, AX - S.x), pitch = Math.atan2(AY - S.y, Math.hypot(AX - S.x, AZ - S.z));
  const keep = V.keep - V.keepNarrow * nw;
  const offY = wrap(Math.atan2(h.z - S.z, h.x - S.x) - yaw);
  yaw += offY - soft(offY, keep * Math.atan(Math.tan(fov / 2) * asp));
  const offP = Math.atan2(ry - S.y, Math.hypot(h.x - S.x, h.z - S.z)) - pitch;
  pitch += offP - soft(offP, keep * fov / 2);
  const D = Math.max(1, Math.hypot(AX - S.x, AY - S.y, AZ - S.z)), cp = Math.cos(pitch);
  cam.x = S.x; cam.y = S.y; cam.z = S.z;
  cam.yaw = yaw; cam.pitch = pitch;
  cam.ax = S.x + Math.cos(yaw) * cp * D; cam.ay = S.y + Math.sin(pitch) * D; cam.az = S.z + Math.sin(yaw) * cp * D;
  cam.lx = h.x; cam.ly = ry; cam.lz = h.z;
  cam.fov = fov;
  cam.shot = S.cs === 'face' ? 0 : 1;   // (the ride view's own measure: 0 FACE .. 1 the rest)
  cam.cine = S.cs; cam.cineQ = q;
  return true;
}
