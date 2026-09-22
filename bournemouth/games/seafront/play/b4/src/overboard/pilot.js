// OVERBOARD - scripted test pilot (tmp-tr197). TEST / DEMO ONLY.
//
// Drives the real hull through the ordinary input path ({ lean, turn, throttle,
// boost }) so a headless suite can prove the rules with the actual boat, and so
// ?obbot=1 can show the passage without a player. It steers from playerPose()
// and the run's objective, exactly as src/rescue/pilot.js does. The RULES never
// read anything this file touches.
//
// TWO STYLES, AND THE SECOND ONE IS AN INSTRUMENT.
//
//   'careful'   closes a loop on the boat's own lateral g and backs the wheel
//               off whenever it goes over `gTarget`. This is the pilot a demo
//               should run: it brings a full boat in.
//   'hooligan'  the same route at full throttle, with no g loop at all and a
//               steady weave laid over the steering. The weave is not colour:
//               the route in is a straight line from the seaward mark to the
//               beach, so a pilot that merely steers at the objective NEVER
//               TURNS and the ejection rule cannot fire at all - measured, and
//               it is what the first version of this file did. A rule nothing
//               can provoke on demand is a rule nobody has tested.
//
// Both are deterministic: no Math.random, no wall clock, all state in a WeakMap
// keyed by the sim, so the same (seed, style) replays bit for bit.
//
// ⚠️ NEVER ASTERN ON THE SAND. hull.js releases the grip of the sand only while
// the throttle is OPEN; commanding reverse while aground is how the raid pilot
// pinned itself on the beach (tmp-tr177), and the rescue suite has asserted
// against it ever since. This pilot checks `aground` before it ever asks for
// reverse, and test-overboard.mjs asserts the same thing.

import { playerPose } from '../player-pose.js';

const P = {
  careful: { turnK: 1.5, gUp: 1.6, gDown: 2.6, gTarget: 0.30, gainMin: 0.18, cruise: 0.55, taxi: 0.16, weave: 0, weaveHz: 0 },
  hooligan: { turnK: 2.6, gUp: 0, gDown: 0, gTarget: 99, gainMin: 1, cruise: 1.0, taxi: 0.30, weave: 1.25, weaveHz: 0.18 },
};
const st = new WeakMap();
const cl = (v, a, b) => (v < a ? a : v > b ? b : v);

export function overboardPilot(sim, run, hull, style = 'careful') {
  const K = P[style] || P.careful;
  let m = st.get(sim);
  if (!m) { m = { gain: 1, out: { lean: 0, turn: 0, throttle: 0, boost: 0 } }; st.set(sim, m); }
  const o = m.out;
  const p = playerPose(sim);

  // The g loop. `latG` is the hull's own |u * r| / g - the same expression
  // boats.js uses for turn spray and the same one the ejection rule reads, so
  // the pilot and the rule are looking at one number and not two.
  const latG = hull && Number.isFinite(hull.u) ? Math.abs(hull.u * (hull.r || 0)) / 9.81 : 0;
  if (K.gUp > 0) {
    m.gain += (latG < K.gTarget ? K.gUp : -K.gDown) * (1 / 120);
    m.gain = cl(m.gain, K.gainMin, 1);
  } else m.gain = 1;

  const obj = run.phase === 'live' ? run.objective(p) : null;
  if (!obj) { o.lean = 0; o.turn = 0; o.throttle = 0; o.boost = 0; return o; }

  const T = run.T;
  const dx = obj.x - p.x, dz = obj.z - p.z;
  const d = Math.hypot(dx, dz);
  let e = Math.atan2(dz, dx) - p.heading;
  e -= Math.PI * 2 * Math.round(e / (Math.PI * 2));
  const R = obj.kind === 'zone' ? run.zone.r * 0.45 : T.pickupRadius * 0.4;
  const vSlow = obj.kind === 'zone' ? T.dropSpeed * 0.7 : T.pickupSpeed * 0.62;
  const speed = Math.abs(p.speed);
  // A 1300 kg RIB does not stop like a foil: give it room proportional to the
  // square of the speed it has to lose, which is what the drag model actually
  // charges for.
  const brake = 8 + speed * speed * 0.55;
  // The weave rides on SIM TIME, which is a fixed-step integer count of ticks,
  // so it is the same on every replay of the same seed.
  const weave = K.weave ? Math.sin((sim.time || 0) * 2 * Math.PI * K.weaveHz) * K.weave : 0;
  const turn = cl(e * K.turnK + weave, -1, 1) * m.gain;
  const aground = !!(hull && hull.aground);

  o.lean = 0;
  o.boost = 0;
  if (Math.abs(e) > 1.3 && d < brake) {
    // Pointing the wrong way and close: come round on a trickle rather than
    // carving at speed through the very people we are here to pick up.
    o.turn = cl(e * 1.2, -1, 1);
    o.throttle = 0.22;
  } else if (d > brake + R) {
    o.turn = turn;
    o.throttle = K.cruise * (1 - 0.35 * Math.min(1, Math.abs(e)));
  } else if (d > R) {
    o.turn = turn;
    if (speed > vSlow + 1.2 && !aground) { o.throttle = 0.35; o.boost = 1; }   // astern, afloat only
    else if (speed > vSlow) o.throttle = 0;
    else o.throttle = K.taxi;
  } else {
    o.turn = 0;
    if (speed > vSlow * 0.8 && !aground) { o.throttle = 0.3; o.boost = 1; }
    else o.throttle = 0;
  }
  return o;
}
