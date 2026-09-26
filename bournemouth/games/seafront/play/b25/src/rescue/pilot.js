// RESCUE - scripted test pilot (2026-09-17, tr42). TEST / DEMO ONLY.
//
// Drives the real sim through the ordinary input path ({lean, turn, throttle,
// boost}) so headless tests can prove the rules with the actual craft, and
// ?rescuebot=1 can show the loop without a player. It steers using playerPose()
// and the game's objective. The one eFoil-specific read is wing depth for the
// ride-height hold (the attract pilot's PD, main.js ATTRACT); on a craft without
// one it simply holds lean 0. The GAME never reads anything but the pose.

import { playerPose } from '../player-pose.js';

const P = { depth: 0.24, kp: 2, kd: 0.6, cruise: 0.45, taxi: 0.2, brakeLean: -0.5 };
const st = new WeakMap();

export function rescuePilot(sim, game) {
  let m = st.get(sim);
  if (!m) { m = { lean: 0, prevErr: 0, out: { lean: 0, turn: 0, throttle: 0, boost: 0 } }; st.set(sim, m); }
  const o = m.out;
  const p = playerPose(sim);
  const s = sim.plant && sim.plant.state;
  const wd = s && Number.isFinite(s.wingDepth) ? s.wingDepth : P.depth;
  const err = wd - P.depth;
  const der = (err - m.prevErr) * 120; m.prevErr = err;
  m.lean += (Math.max(-1, Math.min(1, err * P.kp + der * P.kd)) - m.lean) * 0.15;

  const obj = game.phase === 'live' ? game.objective(p) : null;
  if (!obj) { o.lean = P.brakeLean; o.turn = 0; o.throttle = 0; o.boost = 0; return o; }

  const T = game.T;
  const dx = obj.x - p.x, dz = obj.z - p.z;
  const d = Math.hypot(dx, dz);
  let e = Math.atan2(dz, dx) - p.heading;
  e -= Math.PI * 2 * Math.round(e / (Math.PI * 2));
  const R = obj.kind === 'zone' ? game.zone.r * 0.5 : T.pickupRadius * 0.45;
  const vSlow = obj.kind === 'zone' ? T.dropSpeed * 0.7 : T.pickupSpeed * 0.7;
  const brake = 6 + p.speed * 2.6;
  const turn = Math.max(-1, Math.min(1, e * 1.6));

  if (d > brake + R && Math.abs(e) < 1.2) {          // cruise on the foil
    o.lean = m.lean; o.throttle = P.cruise; o.turn = turn;
  } else if (d > R) {                                 // shed speed, then taxi in
    if (p.speed > vSlow + 0.6) { o.lean = P.brakeLean; o.throttle = 0; o.turn = turn; }
    else { o.lean = 0; o.throttle = P.taxi; o.turn = turn; }
  } else {                                            // hold
    o.lean = P.brakeLean; o.throttle = 0; o.turn = 0;
  }
  o.boost = 0;
  return o;
}
