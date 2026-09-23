// RESCUE ARCADE MODE - tuning and the wave table (2026-09-17, tr42).
//
// Everything a designer would want to turn lives in this file. The game logic
// (rescue.js) reads it and owns nothing numeric of its own.
//
// FRAME. All positions are the SIM WORLD frame, metres - the frame playerPose()
// reports. Coast/scene = world + (COAST.startX, COAST.startZ). The drop-off is
// placed off the beach from coast.js's own mean-high-water table, READ, never
// copied: a literal would silently drift the moment the coast moves.
//
// People in the water are neutral, generic figures. There is no organisation,
// livery or nationality anywhere in this mode, and the player never harms
// anyone: the only verbs are "pick up" and "drop off".

import { COAST, mhwOffset } from '../gl/coast.js';

export const TUNING = {
  // ---- pickup: slow right down next to them ----
  // Eased 2026-09-17 after the owner's first play ("a bit hard to collect the
  // people"): was radius 7 m, 9 km/h, 1.0 s per person.
  pickupRadius: 12.0,       // m, from the craft to the person/boat centre
  pickupSpeed: 4.5,         // m/s (16 km/h) - at or under this a pickup progresses
  pickupHold: 0.5,          // s per person, held inside the radius at low speed
  capacity: 4,              // people on the towed rescue sled

  // ---- drop-off: bring them to the beach ----
  dropRadius: 22.0,         // m (was 14)
  dropSpeed: 6.0,           // m/s - a gentle arrival, not a stop (was 3.5)
  dropEach: 0.25,           // s per person stepping off (was 0.35)

  // ---- scoring ----
  scorePerson: 100,         // x wave number
  timeBonusPerSec: 10,      // left on the clock when a wave clears
  cleanWaveBonus: 250,      // x wave number, a wave cleared without a miss
  streakStep: 3,            // every 3 people in a row ...
  streakMultStep: 0.5,      // ... adds x0.5
  streakMultMax: 3.0,

  // ---- run ----
  chances: 3,               // a wave that times out costs one
  introSec: 3.0,            // wave banner before the clock starts
  clearSec: 3.5,            // "WAVE CLEAR" pause before the next intro
  seed: 0x5e4c0e42,         // default run seed (?seed= overrides)
};

// The drop-off: 16 m seaward of mean high water, in front of the spawn, where
// the wet sand is still ~0.5-1 m under. coast x 230 is the spawn's along-shore
// station, 70 m clear of the groyne at 300 and 200 m clear of the pier.
const ZONE_COAST_X = 230;
export const ZONE = {
  x: ZONE_COAST_X - COAST.startX,
  z: mhwOffset(ZONE_COAST_X) + 16 - COAST.startZ,
  r: TUNING.dropRadius,
};

// Where casualties may appear, as coast-x along shore and metres seaward of the
// drop-off. Kept east of coast x 110 so nobody is placed under or against the
// pier (root x 0, tip ~28, head wider), and west of 470.
export const FIELD = { coastXMin: 110, coastXMax: 470 };

// Casualty kinds. `people` is a range; drift is m/s multiplied by the wave's
// drift factor (a board catches the wind, a swimmer barely moves).
export const KINDS = {
  swimmer: { people: [1, 1], drift: 0.35, label: 'swimmer' },
  board:   { people: [1, 1], drift: 0.90, label: 'paddleboarder' },
  dinghy:  { people: [2, 4], drift: 0.60, label: 'dinghy' },
};

// Sea states come from the EXISTING preset table (sea-state.js). The free ride's
// default is never touched: this is only applied while a rescue run is live and
// the default is restored on exit.
const SEA_BY_WAVE = (n) => (n <= 2 ? 'poole-bay-modal' : n <= 5 ? 'fresh-sw-breeze' : 'lively');

// Wave n (1-based) -> spec. Deterministic given the rng the caller passes.
//   groups     casualty groups to place
//   near/far   metres seaward of the drop-off the band of placement spans
//   timer      seconds on the clock
//   drift      m/s wind drift factor, along a fixed onshore-ish bearing
export function waveSpec(n) {
  const groups = [];
  groups.push('swimmer');
  groups.push(n === 1 ? 'board' : 'dinghy');
  if (n >= 3) groups.push('swimmer');
  if (n >= 4) groups.push('board');
  if (n >= 5) groups.push('dinghy');
  for (let k = 6; k <= n && groups.length < 8; k += 2) groups.push(k % 4 === 2 ? 'swimmer' : 'board');

  const near = Math.min(170, 70 + (n - 1) * 18);
  const far = Math.min(420, 170 + (n - 1) * 40);
  return {
    n,
    groups,
    near, far,
    // The clock is built from the people ACTUALLY placed (rescue.js), so a
    // 4-person dinghy gets more time than a 2-person one:
    //   timer = timeBase + timePerPerson x people
    // timeBase grows with the placement band (longer rides); the per-person
    // allowance shrinks every wave. Wave 1 with 2 people: 92 + 2 x 40 = 172 s.
    timeBase: Math.round(50 + far / 4),
    timePerPerson: Math.max(22, 40 - 3 * (n - 1)),   // eased 2026-09-17 (was max(16, 34 - 3(n-1)))
    drift: Math.min(1.6, 0.25 * (n - 1)),
    // Wind from the SW (the rougher presets blow from 225 deg), so drift is
    // toward +x along shore and slightly onshore (-z).
    driftDir: [0.92, -0.39],
    sea: SEA_BY_WAVE(n),
  };
}
