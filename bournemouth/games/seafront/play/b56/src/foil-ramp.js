// FOIL x RAMP CONTACT (tmp-tr174, builder EFOILAIR). The eFoil's way onto a ramp, and
// the reason it cannot be the hull's way.
//
// ---------------------------------------------------------------------------------------
// WHAT ACTUALLY MEETS THE DECK
//
// boats/ramp-collide.js gives a PLANING HULL seven spring points along its bottom, each
// taking a one-sided spring against the deck. That model is right for a hull and wrong for
// a foil, because a foil is not resting on the thing that touches the ramp:
//
//     board          ~0.45-0.70 m ABOVE the water, and it never touches the deck at all
//       |
//      mast          0.60 / 0.75 / 0.90 m of it, depending on the assist preset
//       |
//      wing          0.05-0.41 m BELOW the water in flight  <- THIS is what meets the deck
//
// So the eFoil rides a ramp ON ITS FOIL. The wing is the contact patch and the mast is a
// leg: at the crest the wing is 1.6 m above the water and the board is 2.35 m above it.
// Three things fall straight out of that and none of them needed new code:
//
//   * ONE CONTACT POINT, not seven. A hull's forward points reach the face first and the
//     bow pitches up for free - tmp-tr168 says so, and it is most of what a hull jump looks
//     like. A foil has no such couple here, so it goes up the face at whatever pitch the
//     rider is holding and leaves the crest at the deck's angle. It is a different picture
//     and it is the honest one.
//   * THE DRIVE STOPS AT THE WATERLINE. plant.js gates thrust on `immersed`, and the motor
//     lives on the fuselage beside the wing. The instant the wing clears the water the
//     craft is coasting, so the whole climb is paid for out of momentum. A hull keeps its
//     propulsion all the way up the face.
//   * THE LIFT STOPS TOO, AND STAYS OFF. Wing out of the water latches plant.js's
//     ventilation, which needs `reattachDepth` 0.40 m AND `ventFlushTime` 0.35 s to clear.
//     So a ramp jump is landed on a ventilated wing at 22% lift and the recovery afterwards
//     is real. Nothing here arranges that; it is the plant's existing model meeting a new
//     situation.
//
// ---------------------------------------------------------------------------------------
// THE RIM RULE - YOU HAVE TO BE FLYING TO TAKE A RAMP
//
// A ramp is not only a deck. It is a moored pontoon, and gl/ramps.js builds a VERTICAL SIDE
// from the -D0 footprint edge down to a hidden bottom at -1.6 m. That is a 1.15 m wall all
// the way round, under water, and it is the part of the object a hull can never touch:
// both keels (0.24 m and 0.34 m) are shallower than the 0.45 m rim by construction, which
// is exactly the argument ramps.js makes for why a glancing hull hit is survivable.
//
// A foil is not so lucky. Measured over 6,299 flying ticks per preset on the sea this
// course is ridden in (work/probe-flight.mjs):
//
//     FLYING          wing depth  p50 0.12 m   p95 0.30-0.33 m   max 0.41 m
//     TAXI / FLOAT    wing depth  0.75-0.95 m  (mast, plus however far the board is sunk)
//     the rim         0.45 m
//
// The two populations do not overlap and there is 34 cm of clear water between them. So:
//
//     wing shallower than the rim  ->  it passes over the toe and rides the deck
//     wing deeper  than the rim    ->  it strikes the submerged flank. No launch.
//
// That is not a rule invented to make a mechanic. It is the geometry, and the mechanic it
// produces is the game's own verb: hold the band and the ramp is yours, drop off the foil
// and the pontoon is a wall. 100% of flying ticks clear the rim and 100% of taxiing ones
// do not, on all three mast presets.
//
// ---------------------------------------------------------------------------------------
// ⚠️ THE CONTACT IS SURFACE-RELATIVE, AND THE HULL'S IS NOT. SAY WHY.
//
// gl/ramps.js writes every dimension of the wedge against MEAN WATER - "every footprint
// edge sits D0 = 0.45 m UNDER MEAN WATER", "crest 1.6 m above mean water" - because the
// thing is a MOORED FLOATING PONTOON. A moored pontoon rises and falls with the swell.
//
// The MESH cannot: it is baked into the coast at page load, exactly as gl/stunt-arena.js
// says of its own marks and as tmp-tr172 records for the Harbour Mouth buoys. The hull path
// therefore reads the deck at its baked ABSOLUTE height, and can afford to: its clearance
// against the rim is 0.11-0.21 m and the deck force it applies is one-sided and upward, so
// the worst the wave phase costs it is a slightly longer or shorter face.
//
// The foil cannot afford it. In the absolute frame the flying wing's own margin over the
// rim is 3.9 cm at worst (min wingY -0.607 m against a rim at -0.450 m), while this sea
// moves the surface +-0.41 m with an rms of 0.125 m. An absolute-frame rim test would
// therefore reject about 4% of perfectly good approaches on wave phase alone, and a trough
// arrival would meet a toe 0.15 m above the wing and take a 6 g pop off a standing start.
//
// So this file reads the deck where the pontoon actually is: `deckLocal(a,b) + surfaceH`,
// with the rim at `surfaceH - D0`. The cost is stated rather than hidden - THE DRAWN DECK
// DOES NOT BOB, so the height the foil contacts and the height the mesh is drawn at differ
// by the local wave height, up to 0.41 m and typically 0.125 m. At the crest the board is
// over two metres up, so that is not a visible discrepancy; it is still a real one.
//
// ---------------------------------------------------------------------------------------
// THE FORCE, and it is the same law boats/ramp-collide.js uses
//
//     f      = k * pen  -  c * (vy_wing - v_deck)                 (clamped >= 0)
//     F_horz = -f * (dDeck/dx, dDeck/dz)   plus  MU * f  opposing the slide
//
// with `v_deck = grad . v_horizontal + surfW` - the rate the deck rises under a moving
// point, PLUS the rate the pontoon itself is being lifted by the swell. plant.js already
// takes exactly that care with its hull damper and says why; without it the damper fights
// the climb and a fast approach jumps LESS than a slow one.
//
// STIFFNESS IS NOT A FEEL KNOB HERE. It is set by a static indentation: a foil wing bearing
// on a fendered timber deck sinks PEN_STATIC into it under the craft's own weight, so
// k = m g / PEN_STATIC. At 110 kg that is 49.1 kN/m, a contact period of 0.30 s, and it
// scales with the craft rather than needing a second table - the same reasoning
// ramp-collide.js uses to cover a 440 kg jetski and a 1,300 kg speedboat with one constant.
//
// ---------------------------------------------------------------------------------------
// THE PLANT HAS NO LATERAL DEGREE OF FREEDOM, AND THIS DOES NOT GIVE IT ONE
//
// plant.js is longitudinal: surge and heave, and it deliberately throws away the
// cross-track part of the orbital flow because it has nowhere to put it. A slope reaction
// has a cross-track part too, and dropping it would make a side hit invisible.
//
// It is not dropped and no sway state is added. A lateral force on a point mass whose
// velocity is constrained along its heading does not translate it sideways - it ROTATES the
// velocity, at exactly dPsi/dt = a_lat / u. That is a kinematic identity, not a model, and
// it is the same seam raid/collide.js's resolveEfoil already uses to turn a solid contact
// into a heading change. sim.js applies it; this file only computes it.
//
// ---------------------------------------------------------------------------------------
// NOTHING HERE RUNS WHEN THERE ARE NO RAMPS. `RAMPS` is empty in every level but the stunt
// stage (gl/ramps.js gates it on the stunt flag), and the first line of the step is a
// length test, so free ride, rescue, both raids, the Harbour Mouth and the smuggling run
// take the same branch they always took and the sim hash cannot move. That is proved in
// work/check-identical.mjs rather than asserted here.

import { rampSurface, toLocal, RAMP, RAMPS } from './gl/ramps.js';

// --- contact constants ------------------------------------------------------------------
// PEN_STATIC  m: how far the wing sinks into a fendered timber deck under the craft's own
//             weight. Sets k = m g / PEN_STATIC, i.e. 49.1 kN/m at 110 kg, contact period
//             0.30 s against 0.37 s to cross the 5.63 m face at 15 m/s - so the wing tracks
//             the deck closely without the integrator being asked to swallow a rigid body.
// ZETA        near-critical, so the contact absorbs rather than catapults. ramp-collide.js's
//             own value, and for the same reason.
// V_CLAMP     m/s: the damper's velocity, clamped as ramp-collide.js clamps its own. Its
//             value is 5.0 and this one is NOT, because the quantity is different: the
//             deck rises under the wing at u tan(20 deg), which at the eFoil's 15.5 m/s top
//             speed is 5.6 m/s, so a 5 m/s clamp would bite on an ordinary entry and
//             weaken the damper exactly where it does the work. 8.0 sits above every entry
//             this craft can make and still bounds a drop onto a deck out of a jump.
//             Measured with work/vclamp.mjs, which reads the published R.vRel on every
//             contact tick of the 12 x 8 approach sweep: worst |vRel| 6.66 m/s over 3,278
//             deck-contact ticks, and the clamp binds on NONE of them. At ramp-collide.js's
//             own 5.0 it would have bound, which is why this constant is not inherited.
// PEN_MAX     m: penetration cap. Defensive; the spring never needs more than ~0.05 m.
// MU          deck friction, wet timber. Inherited from ramp-collide.js rather than
//             invented: it is the same pair of materials.
// SEP_MAX     m/tick: the most the flank may push the craft out of the footprint in one
//             tick. 0.30 m at 120 Hz is 36 m/s of extraction, so a boundary overlap is
//             cleared inside a tick and a craft that somehow woke up under a pontoon is
//             out in well under a second. It is a cap on a correction, never a teleport.
// U_YAW       m/s: floor under `u` in a_lat/u, so the identity cannot divide by zero when a
//             craft is barely moving.
// YAW_MAX     rad/s: cap on the ramp's own contribution to turn rate. sim.js's _steer tops
//             out near 0.85 rad/s, so this is deliberately above anything steering can do
//             and below raid/collide.js's +-2 turn-rate clamp.
const PEN_STATIC = 0.022;
const ZETA = 0.9;
const V_CLAMP = 8.0;
const PEN_MAX = 0.35;
const MU = 0.12;
const SEP_MAX = 0.30;
const U_YAW = 4.0;
const YAW_MAX = 1.5;

export const FOIL_RAMP = { PEN_STATIC, ZETA, V_CLAMP, PEN_MAX, MU, SEP_MAX, U_YAW, YAW_MAX };

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// Per-craft contact constants, computed once and cached by the plant. Expressed as a
// function of the craft's own mass so a heavier rider gets a stiffer, better-damped contact
// rather than a softer one.
export function foilRampConst(P, out = {}) {
  out.k = (P.mass * P.g) / PEN_STATIC;
  out.c = 2 * ZETA * Math.sqrt(out.k * P.mass);
  out.mass = P.mass;
  return out;
}

// The result object. Preallocated by the plant and reused - step() allocates nothing.
export function foilRampResult() {
  // `vRel` is the damper's own velocity - the quantity V_CLAMP clamps. It is published
  // because this file makes a claim about it (that the clamp does not bind on an ordinary
  // approach) and a claim in a comment that nothing can measure is just a comment.
  return { hit: 0, fUp: 0, fSurge: 0, yawRate: 0, sepX: 0, sepZ: 0, pen: 0, deckY: 0, rimY: 0, vRel: 0 };
}

const clear = (R) => {
  R.hit = 0; R.fUp = 0; R.fSurge = 0; R.yawRate = 0; R.sepX = 0; R.sepZ = 0;
  R.pen = 0; R.deckY = 0; R.rimY = 0; R.vRel = 0;
  return R;
};

// One foil against the ramp field.
//   wx, wz     world position of the WING (the board's track position, shifted aft by the
//              mast's tilt - see plant.js, where the offset is computed)
//   wingY      world y of the wing        wingW  its vertical velocity
//   surfaceH   local water surface height at the craft, surfW its vertical velocity
//   u          along-track speed          ch, sh the unit heading (cos h, sin h)
// Writes R and returns it. R.hit: 0 open water, 1 on the deck, 2 against the flank.
export function foilRampStep(FC, R, wx, wz, wingY, wingW, surfaceH, surfW, u, ch, sh) {
  clear(R);
  if (!RAMPS.length) return R;
  const S = rampSurface(wx, wz);
  if (!S) return R;

  // The pontoon floats: its deck and its rim are carried by the local surface. See the
  // header for why this differs from the hull path and what it costs.
  const deckY = S.y + surfaceH;
  const rimY = surfaceH - RAMP.D0;
  R.deckY = deckY; R.rimY = rimY;

  const pen = deckY - wingY;
  if (!(pen > 0)) return R;                       // over the deck, in clear air or water
  R.pen = pen;

  const vxw = ch * u, vzw = sh * u;
  const sp = Math.hypot(vxw, vzw);

  if (wingY >= rimY) {
    // ---- ON THE DECK ------------------------------------------------------------------
    // The wing came in over the rim, so the surface under it is the running deck.
    const vDeck = S.gx * vxw + S.gz * vzw + surfW;
    R.vRel = wingW - vDeck;
    const f = Math.max(0, FC.k * Math.min(pen, PEN_MAX)
      - FC.c * clamp(R.vRel, -V_CLAMP, V_CLAMP));
    if (!(f > 0)) return R;
    R.hit = 1;
    R.fUp = f;
    let fx = -f * S.gx, fz = -f * S.gz;
    if (sp > 0.05) { fx -= MU * f * vxw / sp; fz -= MU * f * vzw / sp; }
    R.fSurge = fx * ch + fz * sh;
    const fCross = -fx * sh + fz * ch;
    R.yawRate = clamp((fCross / FC.mass) / Math.max(u, U_YAW), -YAW_MAX, YAW_MAX);
    return R;
  }

  // ---- AGAINST THE SUBMERGED FLANK -----------------------------------------------------
  // The wing arrived below the rim, so the part of the pontoon in front of it is the
  // vertical side, not the deck. The response is a horizontal contact on the nearest face
  // of the footprint. The footprint is a rectangle and therefore convex, so "the nearest
  // face" is always an exit and there is no pocket to be held in.
  const r = S.ramp;
  const [a, b] = toLocal(r, wx, wz);
  // distance to each of the four faces, and the outward normal of the nearest
  let d = a, na = -1, nb = 0;
  if (RAMP.LT - a < d) { d = RAMP.LT - a; na = 1; nb = 0; }
  if (b + RAMP.HW < d) { d = b + RAMP.HW; na = 0; nb = -1; }
  if (RAMP.HW - b < d) { d = RAMP.HW - b; na = 0; nb = 1; }
  const c = Math.cos(r.h), s = Math.sin(r.h);
  const nx = na * c - nb * s, nz = na * s + nb * c;

  R.hit = 2;
  // A spring-damper along the outward normal, with `d` - how far inside the face the wing
  // is - as the penetration. Same law and the same constants as the deck: it is the same
  // pontoon and the same timber.
  const vN = vxw * nx + vzw * nz;                 // closing when negative
  R.vRel = vN;
  const fN = Math.max(0, FC.k * Math.min(d, PEN_MAX) - FC.c * clamp(vN, -V_CLAMP, V_CLAMP));
  let fx = fN * nx, fz = fN * nz;
  // friction along the face, opposing the tangential slide
  const vTx = vxw - vN * nx, vTz = vzw - vN * nz;
  const vT = Math.hypot(vTx, vTz);
  if (vT > 0.05) { fx -= MU * fN * vTx / vT; fz -= MU * fN * vTz / vT; }
  R.fSurge = fx * ch + fz * sh;
  const fCross = -fx * sh + fz * ch;
  R.yawRate = clamp((fCross / FC.mass) / Math.max(u, U_YAW), -YAW_MAX, YAW_MAX);

  // AND the separation, which is the part a force cannot do here. plant.js clamps surge at
  // u >= 0, so a craft driving at a pontoon can be brought to a stop by the spring but can
  // never be pushed back out by it. sim.js applies this to the world track, exactly as
  // raid/collide.js's resolveEfoil applies `w.x += nx * pen` against a solid capsule.
  const sep = Math.min(d + 0.02, SEP_MAX);
  R.sepX = nx * sep; R.sepZ = nz * sep;
  return R;
}
