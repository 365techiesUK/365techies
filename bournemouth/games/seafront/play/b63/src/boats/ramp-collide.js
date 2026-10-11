// RAMP CONTACT for the planing hulls (tmp-tr168). The deflection, and the one
// thing that has to be true for a ramp to be a ramp rather than a wall.
//
// THE DEFLECTION IS NOT SCRIPTED. There is no "if near ramp then jump". Every
// hull spring point that finds deck under it takes a one-sided spring-damper
// against that deck, exactly the way hull.js already treats the sand floor, and
// the deck's SLOPE takes its share out of the horizontal:
//
//     f      = kRamp * pen  -  cRamp * (vy_point - v_surface)      (>= 0)
//     F_horz = -f * (dDeck/dx, dDeck/dz)
//
// which is the horizontal component of the surface normal force, N sin(t) =
// N cos(t) tan(t). So the craft pays in speed for exactly the height it gains,
// the launch scales with approach speed and with the face angle, and hitting
// the face at an angle deflects you along it instead of up it. hull.js sums
// f into the SAME accumulators as every other vertical force, so the ramp also
// pitches the bow up as the forward points climb first - which is most of what
// a jump looks like - with no extra code at all.
//
// v_surface is the rate the deck rises UNDER A MOVING POINT, grad . v_horizontal.
// It matters: without it the damper would fight the climb (the hull would be
// pushed down in proportion to how fast it was going up) and a fast approach
// would jump LESS than a slow one. hull.js's water damper takes the same care
// with dh/dt, for the same reason.
//
// WHY THE OBSTACLE WRAPPER EXISTS, and it is not tidiness. A ramp is drawn by
// buildCoast(), and boats/obstacles.js rasterises EVERY non-sand coast triangle
// between y -1.2 m and +2.2 m into its blocked grid. A ramp sits squarely in
// that band, so without this wrapper each one would be a 15 m wall the hull
// bounces off and can never climb. wrapRampObstacles() reports `blocked` false
// inside a ramp footprint and passes ground()/groundSlope() straight through,
// so the beach, the pier legs, the groynes and the dry-sand rule are all exactly
// what they were. The grid itself is never modified: the wrapper is per-hull.
//
// The player's PlaneHull is the ONLY consumer of Obstacles in the project
// (boats/hub.js builds it, nothing else imports it), so this changes the world
// for the player's craft and for nothing else.

import { rampSurface, rampFootprint, RAMPS } from '../gl/ramps.js';

// Contact constants, expressed as factors of the craft's OWN ground numbers so
// they scale between the 440 kg jetski and the 1300 kg speedboat without a
// second table.
//   K_FACTOR  softer than sand: a timber pontoon with fenders, and stiff enough
//             to track the face. The contact period is 2*pi*sqrt(m / (n*k)) =
//             0.30 s on the jetski, against 0.28 s to cross the 5.6 m face at
//             72 km/h, so the hull reaches about 95% of the ideal launch
//             velocity (measured; see tmp-tr168/RESULT.md).
//   ZETA      near-critical, so a landing is absorbed rather than catapulted.
//   V_CLAMP   the damper's velocity, clamped exactly as hull.js clamps its own
//             water damper at P.slamV: it bounds the spike when a craft drops
//             onto the deck out of a jump.
//   PEN_MAX   penetration cap. Defensive: the spring never needs more than
//             ~0.25 m, and the cap means no pathological pose can produce an
//             unbounded force.
//   MU        deck friction, wet timber under a composite hull. Small, but it
//             is what stops a craft sliding sideways off a skirt like ice.
const K_FACTOR = 1.1;
const ZETA = 0.9;
const V_CLAMP = 5.0;
const PEN_MAX = 0.55;
const MU = 0.12;
const FOOT_PAD = 0.6;   // m: covers obstacles.js's half-cell-diagonal rasterisation

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// Per-hull contact constants, computed once.
export function rampConst(P) {
  const n = P.springPts.length;
  const k = P.kGround * K_FACTOR;                       // N/m per point
  const c = 2 * ZETA * Math.sqrt(k * n * P.mass) / n;   // N.s/m per point
  return { k, c, n };
}

// One hull point against the ramp field.
//   yi   world y of the point       vyi  its vertical velocity
//   vxw, vzw  its horizontal world velocity (CG velocity plus the yaw term)
// Returns null in open water, else { f, fx, fz } - f is the vertical force to
// add to that point's share, fx/fz the horizontal reaction on the hull.
export function rampPoint(RC, P, wx, wz, yi, vyi, vxw, vzw) {
  if (!RAMPS.length) return null;
  const S = rampSurface(wx, wz);
  if (!S) return null;
  const pen = S.y - (yi - P.draft);
  if (!(pen > 0)) return null;
  const vSurf = S.gx * vxw + S.gz * vzw;          // the deck rising under the point
  const f = Math.max(0, RC.k * Math.min(pen, PEN_MAX)
    - RC.c * clamp(vyi - vSurf, -V_CLAMP, V_CLAMP));
  if (!(f > 0)) return null;
  // Slope reaction, plus friction opposing the point's slide over the deck.
  let fx = -f * S.gx, fz = -f * S.gz;
  const sp = Math.hypot(vxw, vzw);
  if (sp > 0.05) { fx -= MU * f * vxw / sp; fz -= MU * f * vzw / sp; }
  return { f, fx, fz };
}

// The obstacle wrapper. See the header: a ramp must not also be a wall.
// Created once per (hull, obstacle grid) pair and cached by hull.js.
export function wrapRampObstacles(obs) {
  if (!obs || !RAMPS.length) return obs;
  return {
    get groundSlope() { return obs.groundSlope; },
    ground(wx, wz) { return obs.ground(wx, wz); },
    blocked(wx, wz) {
      if (!obs.blocked(wx, wz)) return false;
      return !rampFootprint(wx, wz, FOOT_PAD);
    },
    get stats() { return obs.stats; },
    get built() { return obs.built; },
    __rampWrapped: obs,
  };
}
