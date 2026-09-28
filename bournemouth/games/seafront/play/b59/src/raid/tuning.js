// VIKING RAID - arcade naval combat: tuning, weapons, power-ups, sharks, waves (tr57;
// first built as a non-violent turn-back mode in tr52, changed to combat by the owner).
// tr60: the beach landings are REPLACED by a PIER SIEGE - the raiders attack Bournemouth
// Pier (siege.js); fire, the water cannon and the repair power-ups are tuned below.
//
// Everything a designer would want to turn lives in this file; the rules
// (raid.js) read it and own nothing numeric of their own.
//
// FRAME. Positions are the SIM WORLD frame, metres - the frame playerPose()
// reports. Coast/scene = world + (COAST.startX, COAST.startZ); +z is out to sea.
// The landing line is built from coast.js's own mean-high-water table (READ,
// never copied), so it follows the beach if the coast is ever re-surveyed.
//
// CONTENT. Cartoon arcade: longships are holed, list and sink with a big splash;
// their crews end up in the water, grab wreckage and paddle back out to sea.
// People in the water are NEVER targets - no shot, ship or shark can touch them -
// and nobody is hurt: no blood, no gore, no death animation. Generic, cartoon
// Norse raiders only; no modern group, place of origin or crossing is referred to.

import { COAST, mhwOffset } from '../gl/coast.js';

export const TUNING = {
  // ---- run ----
  lives: 0,             // tr60: no harvests any more - the pier is what you can lose
  finalWave: 6,         // clear this wave and the pier is SAVED (the run ends)
  loseCollapsed: 4,     // this many fallen sections (of 7) and the pier has burned down
  playerHp: 100,
  introSec: 6.0,        // the first-run intro card shows this long; play is live from tick 0
  bannerSec: 2.2,
  clearSec: 2.0,        // "WAVE CLEARED" pause (ships of the next wave already on the way)
  lostSec: 3.0,
  seed: 0x7a1d0789,

  // ---- longships ----
  shipLength: 16.0, jarlLength: 21.0, bossLength: 30.0,
  shipHp: 60, jarlHp: 150, bossHp: 900, bossHpPer: 300,    // boss hp = bossHp + bossHpPer x (boss number - 1)
  jarlSpeedFactor: 0.9, bossSpeedFactor: 0.55,
  shipTurnRate: 0.5,    // rad/s steering limit
  landOffset: 12.0,     // m seaward of mean high water: where a longship grounds
  landedStay: 10,       // s a landed ship stays on the beach
  landingFlexSec: 10,   // tr62: was 8 - earlier MOORING warning    // s to tie-up under which the HUD warns MOORING IN n s (raid-actors reads it for the red beacon)
  sinkSec: 4.5,         // listing, breaking up and going under
  crew: { ship: 5, jarl: 7, boss: 10 },   // Vikings thrown into the water
  planks: { ship: 6, jarl: 8, boss: 14 },

  // ---- collision (stage 1) ----
  knockSpeed: 4.0,      // m/s closing speed along the contact normal for a HARD hit
  knockCraftSpeed: 6.0, // m/s craft speed for a hard hit
  knockSpin: 5.0,       // rad/s a rammed ship starts spinning at (decays ~1.1/s)
  ramDamage: 30,        // hp a hard ram takes off (the boss takes the same)

  // ---- player weapons: one FIRE control, auto-aim at the nearest ship in the cone ----
  weapons: {
    speedboat: { name: 'BOW CANNON', kind: 'ball', speed: 62, reload: 0.50, dmg: 34, splash: 3.5, cone: 0.60, range: 150, homing: 0, y0: 1.4, muzzle: 3.2 },
    jetski:    { name: 'ROCKETS', kind: 'rocket', speed: 80, reload: 0.26, dmg: 20, splash: 2.5, cone: 0.70, range: 130, homing: 3.0, y0: 1.1, muzzle: 1.6 },
    efoil:     { name: 'FLARE LAUNCHER', kind: 'flare', speed: 58, reload: 0.42, dmg: 24, splash: 3.0, cone: 0.90, range: 120, homing: 2.2, y0: 1.6, muzzle: 0.6 },
  },
  torpedo: { speed: 32, dmg: 90, splash: 5, range: 160, every: 0.8 },
  hitScore: 10, sinkScore: 150, jarlScore: 400, bossScore: 3000, bossScorePer: 1000, ramScore: 50, sharkScore: 75,
  clearBonus: 250,      // x wave, a wave with no section lost
  potScore: 30, knockScore: 40, fireOutScore: 60, sectionSavedScore: 500,
  comboWindow: 4.0, comboStep: 0.25, comboMax: 5,

  // ---- the Vikings fight back ----
  missiles: {
    arrow: { speed: 40, dmg: 5, hitR: 1.8, spread: 2.8 },
    spear: { speed: 29, dmg: 9, hitR: 2.0, spread: 2.4 },
    axe:   { speed: 25, dmg: 14, hitR: 2.2, spread: 2.0 },
  },
  boatHitR: 1.0,        // extra hit radius for a boat (bigger target than a rider)
  attackRange: [18, 75],
  attackReload: [2.2, 3.8],
  heavyHit: 12,         // dmg at or over this knocks the eFoil rider off / stalls and spins a boat
  downSec: 1.8,         // eFoil: rider off, board brakes, no firing
  stallSec: 1.0,        // boat: engine stalls
  kickSpin: 1.6,        // rad/s yaw kick on a heavy hit (boats)
  invulnSec: 0.6,       // after any hit
  swampInvulnSec: 3.0,  // after losing a harvest to zero health

  // ---- power-ups ----
  powerups: {
    rapid:   { label: 'RAPID FIRE', sec: 8 },
    triple:  { label: 'TRIPLE SHOT', sec: 10 },
    heavy:   { label: 'HEAVY SHOT', sec: 8 },
    torpedo: { label: 'TORPEDOES', count: 4 },
    turbo:   { label: 'TURBO', sec: 6 },
    shield:  { label: 'SHIELD', sec: 8 },
    repair:  { label: 'REPAIR', hp: 45 },
    x2:      { label: 'SCORE x2', sec: 12 },
    bait:    { label: 'SHARK BAIT', sec: 9 },
    douse:   { label: 'DOUSE' },            // puts out every fire on the nearest burning section
    rebuild: { label: 'REBUILD' },          // restores the most damaged standing section
    water:   { label: 'WATER TANK' },       // refills the water cannon
  },
  pickupEvery: [6, 10], pickupLife: 22, pickupR: 6.5, pickupMax: 4,
  rapidFactor: 0.4, tripleSpread: 0.14, heavyFactor: 2.0,
  turboBoat: 1.2,       // boats: thrust x (1 + this) through the fenced hull hook
  turboEfoil: 6.0,      // eFoil: m/s raid-side speed assist along the heading
  baitR: 14,            // a longship this close to the bait gets bumped by the sharks
  baitDps: 10,

  // ---- THE HARBOUR MOUTH: the corsair level at Old Harry (tr145) ----
  // A corsair raiding fleet is standing in for the Poole Harbour mouth and the player, on a
  // fast craft, has to stop them getting past Handfast Point. The objective is a LINE (see
  // raid/gate.js for its geometry and why a half-plane is safe here) and the whole of it is
  // below. The rules own no number of their own, exactly as everywhere else in this file.
  //
  // SCALE. These distances are the PIER RAID'S distances, deliberately: the siege spawns at
  // 170-300 m and the whole arena is a few hundred metres across, and a level whose ships take
  // three minutes to arrive is not the same game. The run here is 240-500 m and the fight is
  // fought inside 600 m of the Old Harry stacks, which is also what keeps the chalk in frame.
  gate: {
    letThrough: 3,        // corsairs past the line and the harbour is lost. MEASURED, not
                          // guessed: at 5 the scripted bot held the line 8/8 with the relief
                          // fleet on, which is not a game. The 16-seed sweep is in
                          // tmp-tr145/RESULT.md; 3 gives 12/16.
    spawnR: [200, 380],   // m of run still to make, at spawn. Also measured, and it is the
                          // steepest lever in the level: 380 -> 350 took the bot from 7/8 to
                          // 4/8 on 8 seeds, so it is left where the run is ~500 s for six
                          // waves rather than tuned on it.
    spawnOff: [-160, 420],   // m along the line at spawn: the southern flank hugs the cliff,
                          // the northern is open sea, so they come up the cliff line and round
                          // the point. -180 rather than -300 because a hull spawned tight
                          // against Ballard's face cuts the corner into Handfast Point.
    spawnClear: 60,       // m of water a spawn point must have (gate.js's own survey field)
    aimOff: [120, 380],   // THE CHANNEL. The gate's anchor is the stack group, so offset 0 IS
                          // Old Harry; 120 m is the first clear water outside it (measured off
                          // the survey field, not guessed). A corsair aims to cross inside this
                          // band and nowhere else, which is what makes the line read as a gate
                          // rather than as an invisible fence.
                          // ⚠️ 380 AND NOT 520, and it is a LOOK fix as much as a balance one:
                          // at 520 the measured crossings had a median offset of 434 m, so the
                          // whole fight drifted seaward and Old Harry was a white smudge on the
                          // beam. At 380 the median is 245 m and the chalk is in the frame.
    crossBy: 90,          // m PAST the line she aims, so she commits instead of loitering on it
    lanePick: 4.0,        // s between lane re-picks; every frame makes a hull weave
    laneJitter: 260,      // m of spread when she picks one
    keep: 26,             // m (x L/16) of chalk a HULL is pushed off - siege.js _pierPush's twin
    wpKeep: 70,           // m of chalk a WAYPOINT is kept off, so she plans round the point
    awaySec: 6,           // s a corsair that is through runs on before she is gone
    entry: { run: 95, off: 320, heading: 1.30 },   // where the player is put down, in gate
                          // coordinates: 95 m inside the line, 320 m out along the channel -
                          // about 330 m from the stacks, facing the way they come in.
    playerBroadside: true,   // ...and with no pier to shoot at, a corsair's battery lays on the
                          // PLAYER when no hull of the other side is in reach. This adds NO hit
                          // test: _roundHitsPlayer (tr136) already tests every round in flight
                          // against the craft, so this only changes where the rounds are aimed.
  },

  // ---- the pirate broadside (tr136) ----
  // A pirate brig already DRAWS twelve guns run out through their ports (raid-pirate-ship.js);
  // this block makes them fire. A volley is a ROLLING one - the guns go off one at a time down
  // the side, not together - because a simultaneous flash reads as a single explosion and a
  // ragged roll reads as a ship's battery.
  //
  // WHAT A ROUND CAN TOUCH, exhaustively: the pier section it was aimed at (structural damage
  // through siege.strike(), plus a little fire through siege.ignite()), the sea (a splash), and
  // the PLAYER's craft through the existing _hurt() meters. THAT IS THE WHOLE LIST. A round has
  // no test against swimmers, against wreckage, against sharks or against other ships, and
  // "people in the water are never targets" is unchanged by this block (tmp-tr136 tests).
  broadside: {
    guns: { ship: 6, jarl: 7, boss: 8 },   // per side; matches the ports drawn on each hull
    fromWave: 2,          // wave 1 has no gunfire at all: the player meets the fleet first
    range: 95,            // m to the section aim point, max
    minRange: 7,
    beamCone: 0.70,       // |cos(angle off the beam)| below this: a broadside fires side-on only
    reload: [12.0, 17.0], // s between volleys, under way
    mooredReload: [9.5, 14.0],
    gap: [0.09, 0.20],    // s between one gun and the next - this is what makes it ROLL
    speed: 58,            // m/s round; the arc is what makes the fall of shot visible
    dmg: 0.45,            // % of that section's maxHp per round that lands. TUNED, not guessed:
                          // see the A/B in tmp-tr136x/RESULT.md - the guns must cost the pier
                          // something real without making the mode unwinnable.
    ignite: 0.018,        // ...and splinters catch: a little fire as well as a hole
    spread: 3.4,          // m aim error at the section
    missFrac: 0.30,       // this share of the volley is laid deliberately short or wide and
                          // falls in the sea. Modelled explicitly rather than by widening the
                          // spread, because the aim point is clamped INTO the section's box to
                          // keep rounds off the static pier crowd (crowdClear, tr62) - so an
                          // unclamped spread could not miss and the fall of shot had no
                          // splashes in it at all (measured: 222 of 225 rounds landed).
    playerR: 2.6,         // m: a round passing this close to the craft hits her
    playerY: [-0.6, 3.4], // ...and only between these heights, so a high round misses
    playerDmg: 9,         // hp - under heavyHit (12), so a single round never knocks the rider off
    smokeSec: 2.4,        // muzzle smoke life
  },

  // ---- THE QUAY FLEET: allied ships (tr141) ----
  // A relief fleet arrives mid-raid and fights the corsairs on the player's side. Every number
  // a designer would turn is here; the AI (raid/allies.js) owns none of its own.
  //
  // TRIGGER. `fromWave` and nothing else. A wave boundary is deterministic (so the balance A/B
  // is measurable and the beat is testable) and EVERY player reaches it; a pier-health trigger
  // reads better but a good player never fires it, and a set piece most players never see is
  // not a set piece. See allies.js for the argument in full.
  allies: {
    on: true,             // the whole feature, off in one place (the A/B in tmp-tr141 uses it)
    faction: 'quay',      // the FOES row her hull, health, crew and plank counts come from
    // ⚠️ WHICH RAID GETS A RELIEF FLEET. Found by the suite, not by eye: without this the quay
    // squadron turned up in a VIKING raid, so a fifteenth-century two-masted square rig sailed
    // in to help against longships. That is exactly the "different centuries in the same fight"
    // sloppiness the content note further down this file exists to prevent. The quay fleet is
    // the same century and the same rig as the corsairs and belongs only in their raid.
    withFoe: ['pirate'],
    fromWave: 3,          // THE TRIGGER
    kinds: ['jarl', 'ship', 'ship'],   // one heavier hull and two consorts: a fleet, not a wall
                          // (three hulls, not six: see the LOD arithmetic in RESULT.md - a
                          // fourth costs 58 drawn triangles and a seventh costs 58 as well)
    spawnR: [400, 470],   // m from the pier head: hull-down, outside NEAR and MID LOD both
    spawnArc: [2.15, 2.95],   // rad about the pier head - the WEST quarter, away from the
                          // corsair spawn arc (raid.js _siegePoint, 0.15..PI-0.15), so the two
                          // fleets converge instead of arriving mixed together
    sightSec: 7.0,        // s the "sails on the horizon" beat holds before the fleet is named
    closeSpeed: 1.30,     // x cruise while standing in: they are coming to help, and fast
    engageR: 150,         // m from the pier head: inside this the fleet is IN the fight and the
                          // guns go live. Until then they sail in silently - that is the beat.
                          // MEASURED: at the first guess (260 m) they went to work on corsairs
                          // still 300 m out and spent the raid chasing sterns round the bay.
    // --- the fighting AI ---
    pickRange: 210,       // m: the farthest corsair an ally will take on. Also measured: 340 m
                          // had her lock a hull she could never reach.
    pickEvery: 1.5,       // s between target re-picks; every frame makes a ship dither
    maxLead: 16,          // s of INTERCEPTION. The station is laid on where the target will be
                          // after the time it takes to get there, not on where he is: a ship
                          // that steers at a moving enemy's beam is in a stern chase and never
                          // arrives. This one number is the difference between 5% and the
                          // station-keeping figure in RESULT.md.
    wMoored: 190, wSoon: 120, soonSec: 12,   // m of "nearness" a moored / nearly-moored hull is worth
    wBoss: 70, wJarl: 30, // ...and a bigger hull
    wTaken: 150,          // m of penalty per ally already on that target: spread the fleet out
    wStick: 40,           // m of hysteresis for the target she already has
    stand: 34,            // m abeam of her target: the broadside station
    lead: 12,             // m ahead along his heading, so she comes up ALONGSIDE, not astern
    flip: 16,             // m she must cross past his centreline before she changes sides
    holdR: 30,            // inside this of the station she runs parallel and fires
    parallel: 90,         // m ahead down his heading she aims while running parallel
    sep: 30, sepGain: 1.4,   // m allies push each other's WAYPOINT apart (never the hull)
    pierKeep: 34,         // m: an ally's waypoint is pushed out of this corridor round the deck
    screenR: 110,         // m seaward of the pier head: where she waits with nothing to fight
    withdrawAt: 0.30,     // hull health below this and she BREAKS OFF for the screen station.
                          // Measured: without it all 48 allies in a 16-seed A/B were sunk, every
                          // one, in every run - the relief fleet was always wiped out and was
                          // never there at the end of the raid.
    rejoinAt: 0.34,       // ...and she does not come back until this, so she does not flicker
                          // in and out of the fight one frame at a time
    // ---- THE ARENA OVERRIDES (tr145) ----
    // tmp-tr141/RESULT.md section 10 listed five things that would have to change to move the
    // relief fleet to Old Harry. Three of them are numbers and they are these; the other two
    // are the rally point (now a per-run value on the game, not a module const) and the
    // keep-out (now gate.js's survey field). NOTHING ELSE CHANGED - not the beat, not the
    // target choice, not the broadside station, not the interception, not a hit test.
    gate: {
      spawnRun: [360, 480],   // m BEYOND the line: the quay fleet comes OUT OF THE HARBOUR,
                          // which is the opposite quarter from the corsairs by construction
                          // rather than by a hand-chosen arc, and is also the truth of it.
      spawnOff: [260, 520],   // m along the channel - open water, clear of the Studland flats
      engageR: 240,       // m from the rally point at which the fleet is IN the fight
      screenR: 70,        // m short of the line she screens when she has nothing to fight
      screenOff: [170, 430],
    },
  },

  // ---- SHIP v SHIP GUNNERY (tr141) ----
  // Before this pass a ship fought the pier and the player and nothing else. This block is the
  // whole of ship-versus-ship: both sides read it, so allied and corsair gunnery cannot drift
  // apart. The round itself, its flight and its muzzle effects are TUNING.broadside's.
  engage: {
    range: 88,            // m: a battery bears on another hull inside this
    minRange: 6,
    dmg: 26,              // hp off the hull per round that hits. TUNED, not guessed - see the
                          // win-rate A/B in tmp-tr141/RESULT.md.
    hitR: 1.0,            // m added to the target's collision capsule for a round-versus-hull hit
    allyReload: [5.5, 8.5],   // s between allied volleys: they are here to fight
    foeReload: [12.0, 16.0],  // ...a corsair is mostly busy with the pier
    foeShare: 0.6,        // chance a corsair with BOTH a section and an ally in reach takes the ally
    foeEngage: 62,        // m: a corsair with the pier still in reach only breaks off for an ally
                          // who has come RIGHT alongside. Without this every corsair standing
                          // off outside pier range - which at wave 4+ is most of them - laid her
                          // whole battery on the relief fleet the moment it appeared.
    lead: true,           // lay the guns ahead of a moving target
  },

  // ---- the pier siege (siege.js) ----
  siege: {
    glideR: 22, glideRate: 0.9, moorDist: 0.9, approachOff: 24, standOff: 45,
    ladders: { ship: 2, jarl: 3, boss: 4 },
    raiseSec: 1.6, climbSec: 4.2, climbCool: 1.8, knockCool: 3.5, climbIgnite: 0.14,   /* tr66: was 0.22 (tr62 0.26) */
    potRange: 70, arrowRange: 95, reload: [5.5, 8.5] /* tr66: was [4.5, 7.0] */, mooredPotEvery: 4.6 /* tr66: was 3.4 */,
    potSpeed: 19, arrowSpeed: 36, potErr: 3, arrowErr: 5, potIgnite: 0.07 /* tr66: was 0.11 */, arrowIgnite: 0.022 /* tr66: was 0.035 */,
    bossRange: 150, barragePots: 3, barrageArrows: 3, barrageEvery: 11.0,   // tr62: was 4 / 4 / 7.0 - the wave-3 flagship was the wall
  },
  fire: {
    grow: 0.030,          // tr66 (owner: "the pier is burning really quickly"): was 0.045 (tr62 0.06)
             // logistic growth /s (0.15 -> 0.9 in ~40 s untended)
    spreadAt: 0.5,        // a section burning above this sets its neighbours alight
    spread: 0.009, /* tr66: was 0.018 (tr64) - the owner watched the whole pier catch */        // /s x (fire - spreadAt) into each standing neighbour
    burnDps: 0.6, /* tr66: was 1.0 (tr64) - a section alight now survives ~2.7x the original */        // % of section health per second at full fire
    charRate: 0.08,
  },
  water: {
    tank: 170, drain: 17, refill: 19,   /* tr66: was 130 / 14 (tr62 100 / 11) */ refillDelay: 0.8,    // ~6 s of spray, ~9 s to refill
    rate: 20, speed: 30, loft: 5.5, jitter: 0.06, cone: 1.1, range: 66, potReach: 54,   /* tr66: was 58 / 48 - easier to hose from a safe line */
    douse: 0.080, /* tr66: was 0.058 (tr64) - one pass should visibly knock a fire back */         // fire off a section per packet that lands on it (20/s -> 0.8/s)
    footprint: 2.5, potR: 2.6, climberR: 2.3,
  },

  // ---- sharks ----
  shark: {
    cruise: 3.5, stalk: 6.5, lunge: 17, flee: 10,
    circleR: [18, 32],
    notice: 48,         // m: a shark this close starts stalking the player
    tellAt: 24,         // m: starts the telegraph this close
    tellSec: 1.3,       // fin speeds up, water churns, warning marker - then the lunge
    lungeSec: 1.2, recoverSec: 2.0, fleeSec: 5.0, cool: [6, 9],
    dmg: 16, hitR: 2.2,
    gatherR: 160,       // m: sinking ships and wreckage within this draw sharks in
    clearSwimmer: 5,    // m: a shark never comes closer than this to a swimmer
    panicR: 22,         // m: swimmers this close to a shark scramble away
  },
};

// Where the ships may land, as coast x (along shore, metres from Bournemouth
// Pier's root toward Boscombe's at 2343). Kept east of 110 so no path crosses
// Bournemouth Pier (head ~ x -35..45) whatever the wave spread.
export const FIELD = { coastXMin: 110, coastXMax: 950 };
// tr60: the siege is fought round Bournemouth Pier (coast x ~0-30); spawns, sharks and
// pickups keep inside this along-shore band.
export const SIEGE_FIELD = { coastXMin: -650, coastXMax: 750 };

// The timber groynes' along-shore stations. COPIED from coast.js GROYNES (a local
// const there, not exported) and used ONLY to nudge a landing point off a groyne.
const GROYNE_X = [300, 492, 643, 816, 988, 1161];
const GROYNE_CLEAR = 22;

export function landZ(worldX) {
  return mhwOffset(worldX + COAST.startX) + TUNING.landOffset - COAST.startZ;
}

export function clearOfGroynes(coastX) {
  for (const g of GROYNE_X) {
    const gx = g + 5;
    if (Math.abs(coastX - gx) < GROYNE_CLEAR) return coastX < gx ? gx - GROYNE_CLEAR : gx + GROYNE_CLEAR;
  }
  return coastX;
}

// ---- FACTIONS (tr128) ---------------------------------------------------------------
// The raid has two factions and a run is one or the other, NEVER a mixed fleet: longships and
// brigs in the same wave would read as a mistake, and "different centuries in the same fight"
// is exactly the sloppiness the content rules exist to prevent.
//
// CONTENT, pirates. Cartoon historical fantasy on the same licence as the Norse raiders:
// generic pirates only; no modern group, nationality, place of origin or crossing is referred
// to; no real flag, arms, badge or insignia; no name, no lettering, no text of any kind. The
// two-masted square rig is a DELIBERATE, DISCLOSED anachronism against the Viking material.
// People in the water are swimmers and are never targets - that guarantee is faction-blind
// (no hit test anywhere reads s.kind or the faction) and pirates inherit it unchanged.
//
// The Norse rows deliberately stay in TUNING above: the shipped test suite reads
// TUNING.shipHp / TUNING.crew.ship / TUNING.planks.ship by name, and a faction whose `ships`
// is null means "use the tuning constants", so a default run is bit-identical to before.
//
// ⚠️ `crew` and `planks` ARE MANDATORY on EVERY kind of EVERY faction. raid.js reads them
// when a hull goes down; a MISSING KEY is `undefined`, the for-loop runs zero times, and the
// ship sinks with nobody in the water and no error at all. checkFoes() below fails loudly
// instead, and RaidGame runs it on construction.
//
// tr141: `quay` is a THIRD faction row and it is an ALLY - `allied: true`. It is a FOES row and
// not a separate list precisely because of the warning above: an allied hull that sinks puts
// allied crew in the water through the same _sink() as any other, and putting her table here
// means checkFoes() validates her crew and plank counts with the SAME guard, at construction,
// with no new code and no second thing to remember. The per-ship `s.ally` boolean is what the
// HIT TESTS read - never the faction - because a hit test that knows about factions is one
// refactor away from knowing about swimmers (tmp-tr136x asserts the five original ones are
// faction-blind, and that assertion is worth keeping true).
export const SHIP_KINDS = ['ship', 'jarl', 'boss'];
export const FOES = {
  // `guns` (tr136) is a faction CAPABILITY, not a ship kind: a longship has no broadside to
  // fire and never will, so the rules ask the faction, never `s.kind`.
  norse: { key: 'norse', name: 'VIKING RAID', foe: 'longship', foes: 'longships', crewName: 'raiders', guns: false, ships: null },
  pirate: {
    key: 'pirate', name: 'PIRATE RAID', foe: 'brig', foes: 'pirate ships', crewName: 'pirates', guns: true,
    ships: {
      ship: { L: 16.0, hp: 60, hpPer: 0, speedFactor: 1.0, crew: 10, planks: 8 },
      jarl: { L: 21.0, hp: 150, hpPer: 0, speedFactor: 0.9, crew: 13, planks: 10 },
      boss: { L: 30.0, hp: 900, hpPer: 300, speedFactor: 0.55, crew: 20, planks: 18 },
    },
  },
  // THE QUAY FLEET (tr141): the allied relief squadron. Same century and same rig as the
  // corsairs, because a relief fleet from a real quay would be; `allied: true` is what makes
  // her friendly, and `guns: true` is what makes her worth watching. Content: generic, like
  // both the others - no flag, badge, nationality or lettering anywhere in her geometry.
  quay: {
    key: 'quay', name: 'THE QUAY FLEET', foe: 'ally', foes: 'the quay fleet', crewName: 'crews',
    guns: true, allied: true,
    ships: {
      // hp is MEASURED, not guessed. A relief fleet of three is outnumbered three or four to
      // one and every corsair whose own guns cannot reach the pier turns them on her, so at the
      // corsair hulls' own health (60/150) the whole fleet was gone inside a minute and the
      // arrival meant nothing. She is also FASTER than a corsair, because a ship that cannot
      // dictate the range cannot fight a broadside action at all.
      ship: { L: 17.0, hp: 300, hpPer: 0, speedFactor: 1.22, crew: 10, planks: 8 },
      jarl: { L: 22.0, hp: 520, hpPer: 0, speedFactor: 1.12, crew: 13, planks: 10 },
      boss: { L: 30.0, hp: 900, hpPer: 0, speedFactor: 0.7, crew: 20, planks: 18 },
    },
  },
};

// Every problem found, as strings. Empty = the tables are complete.
export function checkFoes(F = FOES, T = TUNING) {
  const bad = [];
  for (const key in F) {
    const f = F[key];
    if (f.key !== key) bad.push(`${key}: key field is "${f.key}"`);
    if (!f.name) bad.push(`${key}: no name`);
    for (const kind of SHIP_KINDS) {
      if (f.ships && !f.ships[kind]) { bad.push(`${key}.${kind}: NO ROW - a sunk ship would put nobody in the water`); continue; }
      const r = shipRow(key, kind, T, 1, F);
      for (const field of ['L', 'hp', 'crew', 'planks', 'speedFactor']) {
        if (!Number.isFinite(r[field])) bad.push(`${key}.${kind}.${field} is ${r[field]} (must be a finite number)`);
      }
      if (r.crew < 1) bad.push(`${key}.${kind}.crew is ${r.crew} - a sunk ship would put nobody in the water`);
      if (r.planks < 1) bad.push(`${key}.${kind}.planks is ${r.planks} - a sunk ship would leave no wreckage`);
      if (r.L <= 0) bad.push(`${key}.${kind}.L is ${r.L}`);
    }
  }
  return bad;
}

// The per-kind ship row for a faction, resolved against TUNING for the Norse.
export function shipRow(foeKey, kind, T = TUNING, bossCount = 1, F = FOES) {
  const f = F[foeKey] || F.norse;
  if (f.ships && f.ships[kind]) {
    const r = f.ships[kind];
    return { L: r.L, hp: r.hp + (r.hpPer || 0) * (bossCount - 1), speedFactor: r.speedFactor, crew: r.crew, planks: r.planks };
  }
  return {
    L: kind === 'boss' ? T.bossLength : kind === 'jarl' ? T.jarlLength : T.shipLength,
    hp: kind === 'boss' ? T.bossHp + T.bossHpPer * (bossCount - 1) : kind === 'jarl' ? T.jarlHp : T.shipHp,
    speedFactor: kind === 'boss' ? T.bossSpeedFactor : kind === 'jarl' ? T.jarlSpeedFactor : 1,
    crew: T.crew[kind], planks: T.planks[kind],
  };
}

const SEA_BY_WAVE = (n) => (n <= 3 ? 'poole-bay-modal' : 'fresh-sw-breeze');

// Wave n (1-based) -> spec. Pure; the rng placement happens in raid.js.
// A wave is a QUOTA of longships spawned continuously, never more than maxLive
// rowing at once, a few already close at the start, from several directions.
export function waveSpec(n) {
  return {
    n,
    quota: Math.min(30, 7 + 3 * (n - 1)),
    maxLive: Math.min(12, 5 + n),
    openers: n === 1 ? 5 : 3,
    gap: Math.max(1.0, 3.0 - 0.3 * (n - 1)),
    speed: Math.min(7.5, 4.4 + 0.4 * (n - 1)),
    jarlEvery: n >= 2 ? Math.max(4, 9 - n) : 0,      // every k-th spawn is a jarl's ship
    zigFrac: Math.min(0.4, 0.1 * n),
    zigAngle: 0.45, zigPeriod: Math.max(8, 13 - n),
    spawnR: [170, 300],                              // m from the pier head (tr60)
    minRun: 160,                                     // m a spawn is kept off the landing line
    attackMul: Math.max(0.55, 1 - 0.06 * (n - 1)),   // enemy reload multiplier
    pierMul: Math.max(0.58, 1.3 - 0.135 * (n - 1)),   // tr64: was max(0.6, 1.25 - 0.13(n-1)); a little more air in waves 1-5 so a good run reaches 5-6, wave 6 unchanged      // fire-pot / arrow reload multiplier on the pier
    pierMix: ['arrow', 'pot'],
    throwMix: n <= 1 ? ['arrow'] : n <= 3 ? ['arrow', 'arrow', 'spear'] : ['arrow', 'spear', 'spear', 'axe'],
    sharks: Math.min(6, 1 + Math.floor(n / 2)),
    guns: n >= TUNING.broadside.fromWave,            // tr136, for the HUD; the RULES gate on
                                                     // this.T.broadside.fromWave (siege.js)
    allies: TUNING.allies.on && n >= TUNING.allies.fromWave,   // tr141, for the HUD; the RULES
                                                     // gate on this.T.allies (allies.js)
    boss: n % 3 === 0,
    escorts: 4,
    sea: SEA_BY_WAVE(n),
  };
}

// ---- tmp-tr170 THE DORSET SMUGGLING RUN -----------------------------------------------
// A sixth level, and the ONE mechanic in this project that is not about damage. Nothing in
// the table below has a hit point, a weapon, a reload or a casualty in it, and that is not
// squeamishness: SEIZURE of the goods and of the vessel is what the Preventive Service
// actually did, so the historically accurate rule and the rule this project's content lines
// require turn out to be the same rule. The whole table is additive - not one existing key
// above is read, written or shadowed by it, and checkFoes()/validateTuning() never see it.
//
// FRAME. Sim world metres, exactly as TUNING above: coast = world + (COAST.startX, startZ),
// +z is out to sea, and the landing line comes from landZ() so it follows the surveyed beach.
//
// WHY THE NUMBERS ARE WHAT THEY ARE. Every one of them was driven through the headless
// pilot in tmp-tr170/test-smuggle.mjs rather than chosen by feel: the run has to be winnable
// by a competent player and losable by a careless one, and "sow the crop and run" has to be
// a real threat rather than a decoration, which means nerveSec must be short enough that a
// lazy approach loses the cargo off the deck.
export const SMUGGLE = {
  runSec: 200,              // the dark hours. The run ends when this does.
  introSec: 9.0,            // the briefing card. Play is live from tick 0 behind it.
  bannerSec: 2.4,
  seed: 0x5ec21e,

  // The ground. Kept EAST of Bournemouth Pier (coast x -35..45, i.e. world x -265..-185) so
  // no smuggler's track crosses the pier - the same rule TUNING.FIELD was given for the same
  // reason. xLand is where they are making for; they spawn seaward of zSpawn.
  field: { xMin: -120, xMax: 380, zSpawnMin: 210, zSpawnMax: 400, fleeZ: 560 },
  landOffset: 10.0,         // m seaward of mean high water: where a laden boat grounds

  // THE TIDES. Three of them, each a group released together. `galleyEvery` is 0 for none.
  tides: [
    { n: 3, gap: 8.0, galleyEvery: 0, speed: 5.2 },
    { n: 4, gap: 7.0, galleyEvery: 3, speed: 5.9 },
    { n: 5, gap: 6.0, galleyEvery: 2, speed: 6.5 },
  ],
  tideGapSec: 12,           // s of quiet between one tide and the next

  // THE CRAFT. `tubs` is the cargo she is carrying and therefore the score she is worth;
  // `nerveSec` is how long her skipper will hold his nerve once he has seen you coming.
  boats: {
    lugger: { L: 13.5, tubs: 8, speedFactor: 1.00, nerveSec: 7.0, runFactor: 1.30, turn: 0.42 },
    galley: { L: 11.0, tubs: 5, speedFactor: 1.30, nerveSec: 4.5, runFactor: 1.55, turn: 0.70 },
  },

  // SEIZURE. Come alongside and hold her. There is no weapon and no control to press: the
  // verb is STATION-KEEPING, which is the one thing a jetski is genuinely good at.
  seizeR: 10.0,             // m from her centre line: alongside
  seizeSec: 1.7,            // s held alongside and the run is taken
  seizeDecay: 0.85,         // fraction of a second of gauge lost per second once you drop off
  warnR: 52.0,              // m: she has seen you, and her nerve clock starts

  // SOWING THE CROP. Her nerve goes and the tubs go over the side on their rope, weighted,
  // buoyed and marked for a later recovery. She is then empty, and she runs.
  sowSec: 1.8,              // s the string takes to go over
  sowSpreadM: 18,           // m of sea the string is laid along
  cropSinkSec: 2.0,         // s before the marker is all that is left on the surface

  // CREEPING. Dragging a grapnel along the bottom for a sunken string. It is deliberately
  // DEARER than a seizure - three times the time, and you have to be nearly stopped - so
  // letting a boat sow is a real cost and not a free second chance.
  creepR: 12.0,
  creepSec: 5.2,
  creepSpeedMax: 9.0,       // m/s: you cannot creep at speed, you have to drag
  creepDecay: 1.2,

  // FAILURE. She grounds and gets her cargo up the beach, one tub at a time.
  landSec: 7.0,             // s to land a full boat's cargo
  loseTubs: 26,             // this many tubs ashore and the run is lost

  // SCORE. Cargo seized is the measure. A boat impounded is worth having but it is not the
  // headline, because the headline is the goods.
  score: { tub: 25, crept: 15, boat: 300, timeBonus: 3, cleanBonus: 500 },
};

// >>> STUNT
// ---- tmp-tr173 THE STUNT STAGE: FREESTYLE SCORE ATTACK ---------------------------------
// The seventh level, and the second in this project with no damage model in it. Nothing
// below has a hit point, a weapon or a casualty: the verbs are RIDE, JUMP and LAND. The
// whole table is additive - not one key above is read, written or shadowed by it, and
// checkFoes() / validateTuning() never see it.
//
// ⚠️ EVERY NUMBER HERE WAS MEASURED ON THE COURSE, NOT CHOSEN. The probe is
// tmp-tr173/work/spin.mjs: a real PlaneHull on the real sea, 104 head-on jumps over the
// twelve ramps x nine steering scripts, plus 181 off-axis approaches, plus 100 ramp-to-ramp
// link drives. The figures quoted below are from that run and are reproduced in
// tmp-tr173/RESULT.md.
//
// ---------------------------------------------------------------------------------------
// ⚠️ THE ONE FINDING THAT SHAPED THIS TABLE, AND IT IS A DEFECT IN SOMEBODY ELSE'S FILE
//
// ui/juice.js grades a landing on three normalised axes - fall (vertical speed), nose
// (pitch) and tilt (roll) - and its thresholds were derived, honestly and carefully, from
// 438 landings of FREE RIDING over chop, where the median height gained was 0.09 m and the
// worst touchdown in the whole corpus was -7.51 m/s. A jump off this course's ramps gains
// 2.2-3.9 m and comes down at -8.36 to -8.53 m/s. Measured over all 104 head-on jumps, on
// every one of the nine steering scripts including cutting the throttle and leaning back:
//
//     fall = 1.00 on 100% of them. There is no script, and no rider input, that changes it.
//
// So juice.js's `grade` is PINNED at 0-1 on this course and carries no information about how
// well a big air was landed: it calls a clean 1.7 s, 3 m air a BELLY FLOP. That is not
// juice.js being wrong about the world it measured; it is juice.js being asked about a world
// that did not exist when it was calibrated. It is on the out-of-scope defect list and it is
// not this level's to fix - ui/juice.js is protected.
//
// WHAT THIS LEVEL DOES INSTEAD, and it is reuse rather than a second opinion: it calls the
// SAME rateLanding(), with the SAME thresholds, and reads the two axes that still
// discriminate after a ramp jump - att = max(nose, tilt), juice.js's own normalised attitude
// error. Measured, that separates the populations cleanly where `grade` cannot:
//
//     face-on (the intended line)   att p50 0.18
//     a clipped corner              att p50 1.00
//
// `landOk` is the cut between those two, and it is the only number in this table that is an
// interpretation rather than a measurement.
export const STUNT_RUN = {
  runSec: 120,              // the run. Freestyle: there is nothing to chase and nothing to
                            // reach, so the clock is the only pressure.
  introSec: 7.0,            // the briefing card. Play is live from tick 0 behind it.
  overSec: 2.2,

  // ---- what a trick is worth ----------------------------------------------------------
  // airPts is NOT a new number: it is ui/juice.js's own JUICE.pointsPerSec, imported by
  // src/stunt/stunt.js rather than copied, so the two can never drift. risePts and spinPts
  // are scaled against it so that at the top of each measured range the three axes are
  // comparable and no single one dominates. The original scaling, against a model in which
  // rotation was a lottery:
  //     airtime  max 1.82 s  x 40   = 73
  //     rise     max 3.91 m  x 30   = 117
  //     spin     max 34.3 deg x 2.5 = 86
  //
  // >>> STUNTBAL
  // ⚠️ spinPts RE-DERIVED 2.5 -> 0.2 (tmp-tr179), because src/air-spin.js moved the top of
  // the rotation range by a factor of THIRTEEN and left the weight where it was. At 2.5 the
  // rule this block states was simply false: rotation paid 955 points at the top of the range
  // against airtime's 70 and rise's 103, and took 82% of the points on every trick that
  // rotated at all.
  //
  // RE-MEASURED on the shipped configuration - 18 scripted riders x 120 s x 3 craft through
  // the level's own fastForward(), 197 banked tricks, of which 39 are ramp jumps:
  //
  //     axis      p50      p90      max, as ridden
  //     airtime   0.49 s   1.09 s   1.76 s
  //     rise      0.13 m   0.89 m   3.42 m
  //     |spin|    0.2 deg  130 deg  381.9 deg      (417.2 deg in test-stunt's envelope probe)
  //
  // THE DERIVATION, and it is this block's own rule applied rather than a number picked:
  //     airtime 1.76 x 40 = 70       rise 3.42 x 30 = 103
  // The original put spin BETWEEN the two, at 1.18x airtime and 0.74x rise - i.e. about 80
  // points at the top of its range. 80 / 381.9 = 0.209 and 80 / 417.2 = 0.192, so any value
  // in 0.19-0.21 restores the intent on both the ride maximum and the envelope maximum. 0.2
  // is the round number inside that, and it keeps the original ORDERING as well as the
  // magnitudes: airtime 70 < spin 76 < rise 103, against the original 73 < 86 < 117.
  //
  // WHAT IT DOES TO THE SHARE, pooled over the corpus above:
  //     all 197 banked tricks      air/rise/spin  26/10/64 %  ->  63/24/12 %
  //     the 37 that DID rotate     air/rise/spin  11/ 7/82 %  ->  45/28/27 %
  //     biggest single trick       1.76 s, 3.42 m, 382 deg:  base 1128 -> 249
  //     run score, median / p90    356 / 1581  ->  185 / 605
  // The run scale comes back to roughly what it was before rotation was reachable, which is
  // the scale the rest of this table was calibrated against, rather than three times it.
  //
  // (tmp-tr176 suggested "about 0.2/deg" when it flagged this. The derivation above does not
  // rest on that; that it lands on the same number is worth saying rather than hiding.)
  risePts: 30,              // per metre GAINED after leaving the deck (not height above sea)
  spinPts: 0.2,             // per degree of NET yaw swept while airborne. See above.
  // <<< STUNTBAL

  // ---- ⚠️ ROTATION: WHAT THE ENGINE CAN ACTUALLY RESOLVE ------------------------------
  // hull.js integrates `heading` with no wrapping, so yaw is a clean unwrapped accumulator
  // and a spin is exactly heading(touchdown) - heading(launch). NET, not absolute: integrating
  // |dheading| would turn a wobble into a score.
  //
  // >>> STUNTBAL
  // ⚠️ WHAT STOOD HERE SAID A FULL ROTATION COULD NOT BE REACHED AND THAT THIS LEVEL DID
  // NOT PRETEND IT COULD - described, never quoted, because naming a removed string ships it
  // back. THAT WAS TRUE AND IT IS NOW FALSE. hull.js still damps the yaw-rate TARGET by
  // `wet`, so a hull still adds almost nothing of its own in the air - but src/air-spin.js
  // (tmp-tr176) is an arcade assist that drives the HEADING directly off the steering input
  // while airborne, gated to flights that left a ramp deck. Re-measured on this tree:
  //
  //     test-stunt's own envelope probe, real hull, real ramp  417.2 deg
  //     landed and banked in a real 120 s ride, jetski         381.9 deg
  //     landed and banked in a real 120 s ride, speedboat      215.2 deg
  //     eFoil                                                   27.0 deg   (see below)
  //
  // So a 360 IS earnable, on a jetski, and the HUD may now name one - which is the SAME rule
  // as before rather than a relaxation of it: name no trick the model cannot earn. A backflip,
  // a barrel roll and any flip are still unnameable, because pitch and roll have no air
  // control at all and hull.js clamps them to +-51.6 and +-45.8 deg.
  //
  // ⚠️ THE eFOIL CANNOT EARN EITHER NAME, AND THAT IS STRUCTURAL rather than a tuning gap.
  // air-spin.js is a HULL assist; plant.js is a longitudinal point mass whose heading IS its
  // direction of travel, so rotating it would fly the craft round a circle rather than spin
  // it. Its 27 deg is carried rotation. The two names below are hull names, and saying so is
  // better than letting a foil rider wonder what they are doing wrong.
  //
  // THE LADDER. Every rung is a measured threshold rather than a nice-sounding number:
  spinShow: 12,             // deg: below this it was a wobble, not a rotation, and is not
                            // called. RE-CHECKED rather than inherited: a rider who gives no
                            // air input at all carries at most 10.6 deg through a jump over
                            // the corpus above, and a dead-straight run records 0.1-0.9 deg.
                            // So 12 is still exactly the line between carried wobble and
                            // rider input, and it did not need to move.
  spinBig: 180,             // deg: RE-DERIVED 25 -> 180. 25 was "inside the top decile of what
                            // is reachable at all" against a 34.3 deg ceiling; against a 444
                            // deg ceiling it names a wobble. 180 is a HALF ROTATION - the
                            // first rotation that is a thing rather than a number - it sits at
                            // p75 of the 39 ramp jumps measured (172.9 deg), and BOTH hulls
                            // reach it (jetski 381.9, speedboat 215.2).
  spinFull: 360,            // deg: a full rotation, and the only trick this game names. It is
                            // named because it is earnable - 381.9 deg landed and banked in a
                            // real ride, 417.2 deg in test-stunt's envelope probe - which is
                            // the whole condition for naming it, and test-stunt now asserts
                            // spinFull <= the ceiling it measures rather than trusting this.
  // <<< STUNTBAL

  // ---- landing ------------------------------------------------------------------------
  // >>> SPINCTRL
  // ⚠️ RE-DERIVED 0.55 -> 0.60 (tmp-tr176). tmp-tr174 flagged this number as the one thing
  // in the table that had never been re-derived after ui/juice.js's bands moved under it,
  // and as pinning those bands from downstream with 0.026 of margin. It is a DERIVED
  // quantity - the cut on att at which THIS level's "landed" best reproduces juice.js's own
  // "this was a clean landing" - so it is measured, not chosen.
  //
  // Measured over 808 landings as ridden (the 348-landing free-world corpus plus 460 taken
  // riding the stunt course ramp to ramp with the air-spin assist live), agreement between
  // `att <= landOk` and juice.js's `grade >= 2`:
  //
  //     landOk   0.45   0.50   0.55   0.60   0.65   0.70   0.75
  //     agree    83.8   89.9   94.6   97.0   95.0   92.2   90.1  %
  //     blown    46.0   39.5   34.0   29.3   25.6   22.8   20.7  %
  //
  // 0.60 is the maximum, and it is an interior one - the curve falls away on both sides, so
  // this is a fitted number now rather than an interpretation. It also relieves the pin
  // tmp-tr174 complained about: test-stunt's 14 deg / 24 deg arrival sits at att 0.524, so
  // the headroom goes from 0.026 to 0.076, and the blown arrival it checks (40 / 44) is at
  // att 1.000 and stays blown by 0.40.
  landOk: 0.60,             // att = max(nose, tilt) from rateLanding(). See the block above.
  // <<< SPINCTRL
  // The landing multiplier, continuous over the band that is left: a landing arriving dead
  // level is worth 1.6x one that only just held together.
  landMultMax: 1.6,

  // ---- the combo ----------------------------------------------------------------------
  // ⚠️ comboWindow is NOT ui/juice.js's runWindow (4.0 s). That number matches the raid's
  // combo, where the next target is metres away; here the next ramp is 110 m away. Measured
  // over 100 ramp-to-ramp link drives with a real hull aiming at the next toe:
  //     fastest link anywhere          4.45 s
  //     adjacent pairs (<= 120 m)      p50 10.08 s   p90 15.12 s
  //     all pairs                      p50 13.05 s   max 20.30 s
  // 12.0 s clears the fastest link 2.7x over, keeps a chain through a MEDIAN adjacent link,
  // and drops one on a median cross-course wander - which is the shape "builds across linked
  // tricks and decays when you stop" asks for.
  comboWindow: 12.0,
  comboStep: 0.5,           // multiplier = 1 + step * (linked - 1)
  comboMax: 5.0,            // reached at 9 linked landings

  // ---- the course ---------------------------------------------------------------------
  // Purely presentational: the geometry lives in gl/stunt-arena.js and is never duplicated
  // here. This is the sea state the course is ridden in.
  //
  // >>> STUNTBAL
  // ⚠️ 2026-09-20: 'glass' WAS TRIED HERE AND REJECTED, and the measurement is worth keeping
  // because the next person to look at the unlandable first ramp will think of it too.
  //
  // A hull's pitch at touchdown off one of these ramps is almost entirely decided by the speed
  // it reaches the toe at. Measured over the whole course in the real game (work/p11):
  //
  //     approach u   9.5   15    17    19    21    22.7   m/s
  //     q at the crest  -42  -35   -25   -12    -3    +6   deg/s
  //     pitch at touchdown  -16  -17   -8    +3   +18   +34  deg
  //
  // The level's own accept band is att <= landOk, i.e. pitch in [-12, +15.6], so THE LANDABLE
  // APPROACH BAND IS ABOUT 4 m/s WIDE, near 17.5-20.5. Calming the sea does not widen that
  // band, it only moves the craft along it: on 'glass' the jetski reaches 20.5-22.7 m/s on
  // every heading and lands the entry kicker beautifully while landing the two long rows
  // 18-34 deg TAIL-first, and test-stunt section 8's inshore-row ride goes from 2 banked to 0.
  // On 'flat' every heading is above the band. The bay's own modal chop costs the craft
  // 1.5-3 m/s and that is what keeps most of the course inside the band, so it stays.
  // The entry kicker is fixed where it is actually broken - the run-up - in gl/stunt-arena.js.
  // <<< STUNTBAL
  sea: 'poole-bay-modal',
};
// <<< STUNT
