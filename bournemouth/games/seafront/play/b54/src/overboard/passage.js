// OVERBOARD - the trip home. Tuning, the seat plan and the leg table (tmp-tr197).
//
// Everything a designer would want to turn lives in this file. The rules module
// (overboard.js) reads it and owns nothing numeric of its own. That is the same
// split src/rescue/waves.js and src/rescue/rescue.js have, and this level is a
// sibling of that one: it reuses its drop-off ZONE and its field bounds rather
// than writing a second copy of the beach down.
//
// FRAME. Positions are the SIM WORLD frame, metres - the frame playerPose()
// reports. Coast/scene = world + (COAST.startX, COAST.startZ). +z is SEAWARD.
//
// ---------------------------------------------------------------------------
// WHAT THIS LEVEL IS, AND THE LINES IT DOES NOT GO NEAR
//
// A day boat has taken on more people than it is rated for and is being brought
// back to the beach in a building swell. The pressure is TIDE, WIND, COLD and
// the CLOCK, and it comes from the player's own driving: people go over the
// side because of how the boat is being driven, and it is the driver's job to
// come about and get them back.
//
// NOBODY IS IN PERIL. Nobody is harmed, nobody is ever shown in danger and
// nothing in the water is a hazard to a person.
// A person over the side gets COLD, which is slow and annoying
// and costs score, and is floored at 1.0 so it can never become anything worse.
// If the clock beats you, the shore team brings the rest in and the passage
// scores badly. That is the entire failure state and it must not be made
// grimmer by anyone who edits this file.
//
// People are neutral, generic figures, drawn by the existing rescue actors. No
// organisation, livery, flag or lettering appears anywhere in this level, and
// the only verbs are "pick up" and "drop off". The 365 Techies marks on the
// player's own boat are the sole branding, exactly as elsewhere.
// ---------------------------------------------------------------------------

import { ZONE, FIELD } from '../rescue/waves.js';
import { COAST } from '../gl/coast.js';

export { ZONE, FIELD };

const HALF_PI = Math.PI / 2;

// ---------------------------------------------------------------------------
// THE SEAT PLAN, in the RIB's DESIGN frame (transom x -2.6, bow tip x +3.2,
// y 0 = static waterline, +z to starboard). boat-models.js ribParts() shifts
// every mesh by -cgX, and so does the scene when it places one of these.
//
// `exp` is EXPOSURE: how much of the boat's motion that seat passes on to the
// person in it. Someone perched on the tube with one hand on a grab line takes
// all of it; someone sitting on the sole between the tubes takes well under
// half. That single number is what makes the seat plan matter - the boat sheds
// the people on the tubes first, every time, measured over eight ejections on a
// real hull (tmp-tr197/demo-ejections.mjs): exposure 1.00 seats emptied first,
// then 0.92, then 0.84, and the two 0.38/0.42 seats down in the boat never lost
// anybody at all.
//
// ⚠️ AND HERE IS THE CLAIM I HAD TO WITHDRAW. I wrote that a recovered person is
// sat down in the boat "so a passage gets steadier as it goes". Only the FIRST
// recovery or two are: there are nine seats and eight people, so exactly one
// low-exposure seat is spare, and after it is filled the least exposed FREE
// seat is whatever the shuffle has left - in the measured run above a recovered
// passenger ended up back in seat 0, the worst seat in the boat. The rule is
// "the least exposed seat that is free", and on a boat this full that is
// sometimes not a good seat. Which is, on reflection, the right answer for an
// overloaded boat and not a defect; but it is not what the comment said.
// ---------------------------------------------------------------------------
export const SEATS = [
  { x: 1.45, y: 0.60, z: 0.90, yaw: -HALF_PI, exp: 1.00 },   // forward tube, starboard
  { x: 1.45, y: 0.60, z: -0.90, yaw: HALF_PI, exp: 1.00 },   // forward tube, port
  { x: 0.20, y: 0.59, z: 0.98, yaw: -HALF_PI, exp: 0.92 },
  { x: 0.20, y: 0.59, z: -0.98, yaw: HALF_PI, exp: 0.92 },
  { x: -1.40, y: 0.58, z: 0.96, yaw: -HALF_PI, exp: 0.84 },
  { x: -1.40, y: 0.58, z: -0.96, yaw: HALF_PI, exp: 0.84 },
  { x: 1.80, y: 0.26, z: 0.00, yaw: 0, exp: 0.42 },          // down in the bow
  { x: -2.05, y: 0.26, z: 0.42, yaw: 0, exp: 0.38 },         // down aft
  { x: -2.05, y: 0.26, z: -0.42, yaw: 0, exp: 0.38 },
];

export const TUNING = {
  // ---- the boat ----
  rated: 6,                 // what a 5.8 m RIB of this class is rated for
  aboard0: 8,               // ... and how many are aboard. Plus the driver the
                            // model already carries: nine souls in a six-seat boat.

  // ---- THE EJECTION RULE ------------------------------------------------
  // Two channels, because the hull publishes two genuinely different things and
  // merging them would make both illegible.
  //
  //   SUSTAINED  lateral acceleration in a turn, |u * r| / g. This is the same
  //              expression boats.js:800 already uses to decide how much water
  //              to throw off the outer chine, so the spray a player sees IS
  //              the signal. It is an integral: a one-tick spike cannot cost a
  //              passenger anything, a held-on hard turn costs them steadily.
  //
  //   IMPULSIVE  a SLAM EVENT, which hull.js:406 already detects and peaks for
  //              the camera shake and the audio (`slams` counter, `slamG` peak
  //              vertical load factor). This is a step, not an integral, and it
  //              is what "too much speed into a set" and a hard arrival off a
  //              wave both come out as.
  //
  // Plus AIR: a hull clear of the water holds nobody on, so grip drains while
  // airTicks > 0.
  //
  // ⚠️ THE FAIRNESS CAP IS LOAD-BEARING, NOT A SAFETY MARGIN. `slamBiteMax`
  // 0.50 is less than 1 - `warnGrip`, so NO SINGLE EVENT CAN TAKE A PASSENGER
  // FROM FULL GRIP TO OVER THE SIDE: the worst slam in the game leaves a fresh
  // passenger at 0.50, which is inside the warning band, and `slamRefract`
  // then gives the player 0.8 s of warning before that passenger can take
  // another bite. A player must always be able to see it coming and drive out
  // of it. test-overboard.mjs asserts both properties and fails if either is
  // tuned away.
  // ⚠️ CALIBRATED AGAINST THE HULL, NOT GUESSED. Driven flat out with alternating
  // full lock for a minute, this RIB's lateral acceleration TOPS OUT at 0.62 g
  // (fresh breeze and lively) to 0.64 g (storm) - measured, tmp-tr197 - which is
  // its own aLatMax of 7.0 m/s^2 less what the turn bleeds off the speed. So the
  // threshold and the drain rate have to be set against 0.63, not against 1.0:
  // the first pass used holdG 0.45 / gripLoss 1.10 and took FIVE SECONDS of
  // maximum lock to shed one person, which is longer than any turn this boat
  // ever holds. At 0.38 / 2.2 the same maximum lock costs a passenger in 1.9 s
  // and warns for 0.9 s of it, and a 0.35 g cruising turn still costs nothing
  // at all, ever.
  holdG: 0.38,              // g of lateral acceleration below which nobody slips
  gripLoss: 2.20,           // grip/s lost per g of excess, at exposure 1
  gripRecover: 0.40,        // grip/s regained when the boat is steady
  airLoss: 0.55,            // grip/s while the hull is clear of the water
  slamHoldG: 1.80,          // vertical load factor a slam must beat to cost anything
  slamBite: 0.22,           // grip per g of excess
  slamBiteMax: 0.50,        // ⚠️ see above. Must stay below 1 - warnGrip.
  slamRefract: 0.80,        // s before the same passenger can take another bite
  warnGrip: 0.55,           // the HUD warns below this
  shedCool: 0.30,           // s, minimum between two people going over

  // ---- the water ----
  // Tide and an offshore wind together. Seaward is +z, and -x is along the
  // beach toward the pier, so a person left in the water gets further out AND
  // further down-shore every second you spend turning round.
  driftSeaward: 0.55,       // m/s
  driftAlong: -0.42,        // m/s
  // Nobody drifts west of the rescue level's own field bound, for the reason
  // that level gives: the pier root is at coast x 0 and the head is wider, and
  // no person in this game is ever placed under or against it.
  driftMinCoastX: FIELD.coastXMin,

  // ---- cold. Slow and expensive. Never anything else. ----
  coldRate: 0.055,          // per second in the water: 0 -> 1 in ~18 s
  coldHoldMult: 1.90,       // at cold 1 the climb back aboard takes 1.9x as long
  coldPenalty: 40,          // score per person, x their cold when recovered

  // ---- recovery alongside (the rescue level's numbers, which the owner tuned) ----
  pickupRadius: 12.0,       // m
  pickupSpeed: 4.5,         // m/s
  pickupHold: 0.55,         // s, before the cold multiplier

  // ---- the beach ----
  dropRadius: 22.0,
  dropSpeed: 6.0,
  dropEach: 0.25,

  // ---- scoring ----
  // Someone you never lost is worth more than someone you lost and got back,
  // so there is never a reason to throw anyone over on purpose.
  scoreAboard: 150,
  scoreRecovered: 120,
  dryBonus: 600,            // nobody went over the side at all
  timeBonusPerSec: 8,
  shorePenalty: 250,        // per person the shore team had to bring in

  // ---- run ----
  introSec: 3.0,
  endSec: 3.5,
  seed: 0x0b0a2d17,
};

// ---------------------------------------------------------------------------
// The legs. Leg 1 is the one the owner plays first, so it is the gentle one.
//
// ⚠️ THE EJECTION RULE DOES NOT CHANGE BETWEEN LEGS AND MUST NOT. It is the one
// thing the player is learning; a rule that moves under them is not a skill.
// A later leg is harder because the sea is bigger, the run is longer and the
// clock is shorter - all of which make the SAME rule harder to satisfy.
// ---------------------------------------------------------------------------
const SEA_BY_LEG = (n) => (n <= 1 ? 'fresh-sw-breeze' : n === 2 ? 'lively' : 'storm');

export function legSpec(n) {
  const leg = Math.max(1, Math.round(n));
  return {
    n: leg,
    aboard: Math.min(SEATS.length, TUNING.aboard0),
    offshore: Math.min(760, 520 + 60 * (leg - 1)),   // m seaward of the drop-off
    alongCoastX: 330,                                 // coast-x the boat starts from
    sec: Math.max(150, 240 - 20 * (leg - 1)),
    drift: Math.min(1.8, 1 + 0.25 * (leg - 1)),
    sea: SEA_BY_LEG(leg),
  };
}

// Where the boat starts this leg, in the sim world frame, pointed at the beach.
// COAST.startX is READ, never written down as a literal: the frame origin has
// moved once already on this project and a literal here would drift silently.
export function legSpawn(spec) {
  const x = spec.alongCoastX - COAST.startX;
  const z = ZONE.z + spec.offshore;
  return { x, z, heading: Math.atan2(ZONE.z - z, ZONE.x - x) };
}
