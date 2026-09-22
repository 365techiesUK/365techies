// THE MARKS ARE SOLID (tr171). What it feels like to hit the Harbour Mouth channel marking.
//
// tr169 floated eighteen marks on the gate line and said plainly, under "not verified", that
// you rode straight through every one of them. This is that gap. It is a rules file - pure,
// deterministic, no DOM, no GL, no clock, no Math.random - and it owns exactly one thing: the
// footprints the marks present to a craft, and how hard each class pushes back.
//
// ---------------------------------------------------------------------------------------
// TWO CLASSES, AND THEY MUST NOT FEEL THE SAME
//
//   PIN   the twelve channel buoys and the four seaward marks. A floating marker. Clipping one
//         is a knock: it scrubs a little speed, nudges the bow, rings the foil's camera, and
//         then you are past it. It must never end a run.
//   POST  the two gateposts. Twice the height, the only marks that break the horizon, and the
//         only pair a player has already been told is a different kind of object before they
//         touch one. Hitting one squarely stops you.
//
// The difference is carried by four numbers per class and not by two code paths, so there is
// one response to reason about and one to test.
//
// ---------------------------------------------------------------------------------------
// ⚠️ THE CAMERA DOES THE SHOUTING, AND IT MOVED UNDER THIS FILE
//
// Nothing here calls view3d.js and nothing here should. Both craft already publish an impact
// the camera reads for itself:
//   eFoil   view3d.js `_efoilEvents` fires impulse(min(1.2, (du/shakeRef) * 2)) whenever surge
//           deceleration passes hitDecel 45 m/s^2. Writing st.u IS the signal. energy = du/4.
//   boats   ...DO NOT. ⚠️ MEASURED IN tr171 AND IT IS A PRE-EXISTING GAP, NOT THIS FILE'S.
//           view3d.js `boatEvents` rings the camera off hull.hits / hull.lastHitSpeed, and
//           hull.js increments those ONLY in `_collide`, its FIXED-world path (pier legs, the
//           shore). `_collideDyn` - the path every published capsule goes through - never
//           touches them. So a hull that rams a LONGSHIP gets no impact shake either, today,
//           and has not since the raid was built. Verified by driving a jetski and a speedboat
//           into a longship on the unmodified tree: hull.hits stays 0. tmp-tr171/RESULT.md
//           carries the one-line fix; it belongs to hull.js, which was not this builder's.
//           The marks were deliberately NOT given a private route into that instrument: a buoy
//           that shook the camera while a brig did not would be a worse inconsistency than the
//           silence, and it would double-count the day hull.js is fixed.
// So the tuning below was aimed at what the ARCADE-EXTREME camera now does with that energy on
// the craft that actually receives it - the foil, at shakePos 0.30 m and shakeAng 0.040 rad per
// unit - and NOT at a still picture. A knock that read as a knock on the old camera reads as a
// crash on this one, which is why the scrub numbers here are smaller than they would have been
// in tr169. The measured figures for every craft are in tmp-tr171/RESULT.md.
//
// ---------------------------------------------------------------------------------------
// ⚠️ CORSAIR SHIPS PASS THROUGH THE MARKS. THE PLAYER DOES NOT. This was a decision, not an
// omission, and the reasoning is at the call site in collide.js `publish` where it can be
// argued with. In one line: a hull jammed on a buoy line is a worse bug than a hull sailing
// through a float, and it would silently re-tune a level whose difficulty was MEASURED.
//
// ---------------------------------------------------------------------------------------
// NOTHING HERE MOVES A MARK. The marks are baked into the coast mesh by gl/coast.js at page
// load and there is no per-frame vertex path for them, so a mark cannot be knocked aside, and
// it cannot bob either - see tmp-tr171/RESULT.md on why bobbing was declined rather than
// attempted. A collision that shoved a buoy the player could see standing still would be a
// worse lie than the one it fixed.

import { markList, MARK_R } from '../gl/gate-buoys.js';
import { gateAt } from './gate.js';

// ---------------------------------------------------------------------------------------
// THE RESPONSE, per class. These are the ONLY four levers, and three of them are read by
// collide.js `resolveEfoil` on the capsule itself, exactly as `e` already was.
//
//   e      restitution. How much of the closing speed comes back at you. hull.js reads this
//          too and it is the only lever hull.js exposes, which is why it carries most of the
//          difference between the classes for a boat.
//   turn   rad - the most this obstacle may swing the eFoil's heading. A ship gets 0.9 and can
//          spin you; a pin gets 0.40, because a marker you brushed should not choose your
//          course for you.
//   keep   the fraction of the surviving speed kept. A ship's is 0.8 (collide.js's own literal
//          before tr171, unchanged).
//   hold   THE FLOOR, and it is what makes a pin annoying rather than punishing: a pin may
//          never take more than (1 - hold) of the speed you arrived with, however square the
//          hit. A post has no floor, because a post is allowed to stop you. Ships have no
//          floor either - a longship across the bow SHOULD end your run at speed - and leaving
//          it undefined is what keeps the ship path bit-identical to before.
//   cool   s - AND THIS IS THE ONE THE FIRST DRAFT NEEDED AND DID NOT HAVE. A floor on a single
//          impact does not bound an EPISODE. Measured on the first build: a hull driven square
//          at a pin did not bounce off it once, it GROUND along it, taking a fresh contact
//          every tick, and because each floor is a fraction of the speed at THAT contact the
//          ratchet walked a jetski from 24.6 m/s down to 6.3 - a 75% loss out of a rule that
//          promised at most 45%. So a pin goes soft for `cool` seconds after it is touched:
//          collide.js `publish` simply stops publishing it, and the craft rides on through.
//          One knock per pin per approach, which is what a floating marker does.
//          0.45 s is 9 m at 20 m/s - well past a 1.6 m drum - and it is deliberately close to
//          raid.js's own `s.bumpCool = 0.5` for a ship bump, which exists for the same reason.
//          A POST HAS NO COOLDOWN. Solid means solid: if you sit on a gatepost it keeps
//          stopping you, and that is the difference the two classes are for.
//
// WHY 0.55 FOR A PIN. A dead-square hit on a pin is the worst case and it is the one that
// decides whether this reads as a marker or as a wall. 0.55 leaves you with a little over half
// your speed: measurably slower, obviously hit, still moving, still steering. It is not derived
// from anything - there is no physics here that sets it - and it is a stated choice.
export const MARK_FEEL = {
  pin:   { e: 0.15, turn: 0.40, keep: 0.95, hold: 0.86, cool: 0.45 },
  outer: { e: 0.15, turn: 0.40, keep: 0.95, hold: 0.86, cool: 0.45 },
  post:  { e: 0.35, turn: 1.10, keep: 0.55, hold: 0,    cool: 0 },
};

// A mark is a VERTICAL CYLINDER: `half` 0 makes the capsule both craft already understand
// degenerate to a circle, so no new collision routine was written and none was needed.
// heading is 0 and unused at half 0; vx/vz are 0 and that is load-bearing in a place worth
// naming - boats/engine-audio-doppler.js voices every published capsule as passing traffic and
// skips one whose speed is under MOVING. A buoy with a velocity would sound like an engine.
function capFor(m) {
  const [x, z] = gateAt(0, m.off);
  const f = MARK_FEEL[m.kind];
  return { id: m.id, kind: m.kind, x, z, heading: 0, half: 0, r: MARK_R[m.kind],
    vx: 0, vz: 0, e: f.e, turn: f.turn, keep: f.keep, hold: f.hold };
}

// Built ONCE, lazily, and only when the corsair level actually asks for it - the same bargain
// gate.js makes with its survey field. A pier raid and every suite that does not enter the
// gate never allocates this.
let CAPS = null;
export function buoyCaps() {
  if (!CAPS) CAPS = markList().map(capFor);
  return CAPS;
}
// Test seam only, matching gate.js's resetArenaFields().
export function resetBuoyCaps() { CAPS = null; }

// Is this contact id one of ours? Used by collide.js to apply the pin floor to a HULL, whose
// collision was resolved inside hull.js before the raid ever saw it.
export function markFeel(id) {
  if (typeof id !== 'string') return null;
  const c = buoyCaps();
  for (const d of c) if (d.id === id) return MARK_FEEL[d.kind];
  return null;
}

// THE PIN FLOOR, FOR A HULL. The eFoil's floor is applied inside collide.js `resolveEfoil`
// because the raid owns that response outright. A boat's is not: hull.js `_collideDyn` resolved
// the hit at 120 Hz inside the hull's own step, and the raid only sees the receipt afterwards.
// So the floor is applied here, once, from the receipt - `craftSpeed` on the contact is the
// speed the hull was doing at the instant before the impulse, which is exactly what the floor
// is a fraction of.
//
// ⚠️ THIS WRITES A HULL FIELD FROM THE RAID LAYER, which is a seam and not a habit. The
// precedent is three lines below in collide.js `tick`: `if (kick && hull) hull.r += kick`, the
// raid spinning a hull on a heavy hit. Same seam, same reason - the rules know something about
// this impact that the hull's general-purpose collision cannot. It writes ONLY the surge
// component, only upward, and only on a pin contact; a post contact returns immediately, which
// is what lets a gatepost stop a boat dead.
export function holdHull(hull, contacts) {
  if (!hull || !contacts || !contacts.length) return 0;
  let applied = 0;
  for (const c of contacts) {
    const f = markFeel(c.id);
    if (!f || !(f.hold > 0)) continue;
    const floor = (c.craftSpeed || 0) * f.hold;
    if (hull.u < floor) { hull.u = floor; applied++; }
  }
  return applied;
}
