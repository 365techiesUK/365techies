/* 365 Pinball Hero - the effects (15 Oct 2026, milestone 2a; v2 16 Oct 2026, the next-gen spectacle for Ember Peak):
 * what the table does when something happens - sparks off a bumper, a lamp chase along a sling, the score popping up
 * where it was won, light shows for the big moments, the background light (GI) dipping on a drain and going out on a
 * tilt, and the cabinet shaking on a nudge. Ember Peak adds its own choreography for every new event (the crater, the
 * eruption, the wire rail, the geyser, the crabs, the lava gates, the quake, the pressure), the ASH-CLOUD BLACKOUT (the
 * GI sinks under the ash while the crater holds the ball, then the eruption floods the table with light), TABLE
 * MOVEMENT on the big moments, and queues of GPU particle bursts (particles.js) and screen shockwaves (post.js).
 *
 * window.PinFX (the shared contract; the 3D look draws this state, the flat look may ignore any of it):
 *   PinFX.events(W, list)    after every engine step, with that step's events (pinball.js; demo.js on the title screen)
 *   PinFX.update(W, t, mode) once per drawn frame (t in ms); advances everything by real time, NEVER changes the world
 *   PinFX.state = {
 *     gi: 0..1.5      the background light (1 = normal; under 1 dims it, over 1 is the eruption's flood of light)
 *     flash: 0..1     a whole-table flash (at most 3 a second; never with reduced motion), flashColor its colour (never red)
 *     shake: {x, y}   the camera's shake in table units (|x|, |y| <= 1.5; none with reduced motion; hits and rumbles
 *                     shake nothing while any ball is in a flipper's approach zone - only the player's own nudge does)
 *     table: {pitch, roll, dy, shake}  TABLE MOVEMENT for the renderer to apply to the whole table: pitch and roll in
 *                     degrees (pitch > 0 lifts the far end of the table, roll > 0 drops its right side), dy in table
 *                     units (> 0 lifts the table towards the glass), shake 0..1 (the rumble's strength, for sound or a
 *                     body shake). Only ever non-zero while PinCam.quiet(W) says no ball can reach a flipper soon
 *                     (|pitch| <= 2, |dy| <= 3, |roll| <= 1); when it stops being quiet it settles to 0 in ~0.15 s.
 *     bursts: [{x, y, z, kind, n, color, power, dir}]  particle bursts to hand to PinParticles.burst() (kind: 'lava',
 *                     'sparks', 'steam', 'ash', 'debris', 'confetti'; n is for the MEDIUM tier). The renderer takes them
 *                     (PinParticles.update(dt, PinFX.state) does it); never more than 48 waiting.
 *     shocks: [{x, y, z, power}]  screen shockwaves from a table point, for PinPost.update() (never with reduced motion)
 *     post: {fringe, vignette, warm, sat, ash}  the final pass's grade: fringe 0..1 a brief colour-fringe spike,
 *                     vignette 0..1, warm 0..1 (the lava's glow: oranges, never a red screen), sat (1 = normal), ash 0..1
 *     reduced: bool   reduced motion is on (post.js skips its distortion)
 *     pops: [{x, y, z, text, color, a, s, big}]  score pop-ups (a alpha, s scale; big = a big moment's)
 *     sparks: [{x, y, z, color, a, size}]  CPU sparks (kept for renderers without PinParticles: set PinFX.gpu = true
 *                     and they go to state.bursts instead)
 *     lamps: {lampId: 0..1}  extra brightness on top of PinLamps.level (ids are the table's PinLamps.forTable(id).list)
 *     base: 0..1      how much of PinLamps.level to show: a whole-table light show takes the table over, so it dips
 *   }
 * Positions are table units (x 0..W, y 0..H down the table, z height) of the world's own table (W.tableId). Light shows
 * are DATA (SHOWS below): each has a priority, and a whole-table one ('wide') overrides everything of a lower priority
 * until it ends. The lamps a show uses are found by WHERE they are (near the bumper, along the sling, up the ramp), or by
 * their group (the pressure gauge), so new lamps from lamps.js join in without changes here.
 *
 * Plain ES5. In node: require('./fx.js') (it loads lamps.js and engine.js itself) - tools/pinball/fx-test.cjs. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./engine.js'), function () { return require('./lamps.js'); }, null);
  else root.PinFX = factory(root.PinEngine, function () { return root.PinLamps; }, root);
})(typeof self !== 'undefined' ? self : this, function (E, getLamps, win) {
  'use strict';
  if (!E) return null;
  var fmt = E.fmt, PI = Math.PI;
  var C = { pink: '#ff5cc8', cyan: '#3fe0ff', yellow: '#ffd84a', green: '#5cff6b', orange: '#ff9a2e', blue: '#59b4ff', white: '#ffffff', violet: '#b48cff',
    lava: '#ff8a1e', ember: '#ffb02e', amber: '#ffb347', gold: '#ffd84a', sea: '#2ee6d6', steam: '#e8f6ff', ash: '#6a6670', flood: '#ffe2a0', rock: '#6a6070', crab: '#ff7a3a' };
  var BUMPC = { orbit: [C.pink, C.cyan, C.yellow], ember: [C.orange, C.yellow, C.sea] };
  var DROPC = { orbit: [C.yellow, C.cyan, C.pink, C.cyan, C.yellow], ember: [C.violet, C.violet, C.violet, C.violet, C.violet] };

  // ------------------------------------------------------------------ the light shows, as data
  // pri: a higher one wins; wide: takes over the whole table (local shows below it pause, the base lamps dip to `base`);
  // ms: how long; look: how each lamp's level is worked out (LOOKS); gi: the background light dips to this meanwhile;
  // flash: a whole-table flash this bright (rate limited), flashes: how many (a third of a second apart);
  // shake: a knock to the cabinet; sparks: how many; pop: the score pop's size; word: a pop with words; color: sparks'
  var SHOWS = {
    bumper:   { pri: 1, ms: 380, look: 'ring', r: 32, sparks: 12, shake: 0.22, pop: 'small' },
    sling:    { pri: 1, ms: 340, look: 'chase', sparks: 8, shake: 0.12, pop: 'small', color: C.cyan },
    drop:     { pri: 2, ms: 560, look: 'ring', r: 30, sparks: 16, pop: 'small' },
    spin:     { pri: 1, ms: 320, look: 'ring', r: 30, sparks: 3, pop: 'small', color: C.yellow },
    lane:     { pri: 1, ms: 420, look: 'ring', r: 28, sparks: 8, pop: 'small', color: C.yellow },
    inlane:   { pri: 1, ms: 340, look: 'ring', r: 24, sparks: 5, pop: 'small', color: C.cyan },
    outlane:  { pri: 1, ms: 340, look: 'ring', r: 24, sparks: 5, pop: 'small', color: C.orange },
    eject:    { pri: 2, ms: 420, look: 'ring', r: 36, sparks: 14, color: C.green },
    reset:    { pri: 2, ms: 700, look: 'chase', color: C.green },
    launch:   { pri: 1, ms: 500, look: 'chase', sparks: 8, color: C.white },
    rampin:   { pri: 2, ms: 600, look: 'chase', color: C.pink },
    kickback: { pri: 4, ms: 800, look: 'column', sparks: 18, pop: 'small', color: C.orange, word: 'KICKBACK' },
    saucer:   { pri: 3, ms: 900, look: 'ring', r: 52, sparks: 22, pop: 'big', color: C.green },
    orbit:    { pri: 3, ms: 800, look: 'column', sparks: 14, pop: 'big', color: C.cyan },
    ramp:     { pri: 4, ms: 1200, look: 'chase', sparks: 26, pop: 'big', gi: 0.8, color: C.pink },
    drops:    { pri: 5, ms: 1500, wide: true, look: 'burst', sparks: 36, pop: 'big', gi: 0.55, flash: 0.35, color: C.green },
    newball:  { pri: 3, ms: 1100, wide: true, look: 'sweepUp', color: C.cyan },
    drain:    { pri: 5, ms: 1200, wide: true, look: 'sweepDown', gi: 0.3 },
    ballend:  { pri: 4, ms: 1400, wide: true, look: 'sweepDown', gi: 0.6 },
    combo:    { pri: 6, ms: 1500, wide: true, look: 'spiral', sparks: 34, pop: 'big', gi: 0.5, flash: 0.45, shake: 0.4, surge: 0.16, sat: 0.2, color: C.pink },
    loop:     { pri: 6, ms: 1500, wide: true, look: 'sides', sparks: 30, pop: 'big', gi: 0.5, flash: 0.4, surge: 0.12, sat: 0.15, color: C.cyan },
    mult:     { pri: 6, ms: 1500, wide: true, look: 'sweepUp', sparks: 24, pop: 'big', gi: 0.5, flash: 0.4, color: C.orange },
    save:     { pri: 7, ms: 1300, wide: true, look: 'sweepUp', only: 'blue', sparks: 30, gi: 0.6, surge: 0.15, sat: 0.15, color: C.blue, word: 'BALL SAVED' },
    skill:    { pri: 7, ms: 1800, wide: true, look: 'rain', sparks: 40, pop: 'big', gi: 0.45, flash: 0.6, shake: 0.5, surge: 0.22, sat: 0.25, vig: 0.15, color: C.green },
    jackpot:  { pri: 8, ms: 2200, wide: true, look: 'burst', sparks: 60, pop: 'big', gi: 0.35, flash: 0.7, flashes: 2, shake: 0.9, surge: 0.28, sat: 0.3, vig: 0.2, color: C.yellow },
    extra:    { pri: 9, ms: 2400, wide: true, look: 'spiral', sparks: 60, gi: 0.35, flash: 0.7, flashes: 2, shake: 0.6, surge: 0.32, sat: 0.32, vig: 0.2, color: C.yellow, word: 'EXTRA BALL' },
    // ---- Ember Peak's
    crater:   { pri: 5, ms: 900, look: 'ring', r: 64, sparks: 16, pop: 'big', gi: 0.75, shake: 0.3, color: C.lava },
    ash:      { pri: 8, ms: 2750, wide: true, look: 'ashes', base: 0.12, color: C.ash },            // (its ms is the crater's hold)
    eruption: { pri: 9, ms: 2600, wide: true, look: 'fountain', sparks: 50, flash: 0.25, shake: 1, sat: 0.12, vig: 0.12, color: C.amber, word: 'ERUPTION!' },   // (wave 3: one amber flash, was two of 0.9)
    erupt:    { pri: 5, ms: 1100, look: 'burst', sparks: 24, flash: 0.4, shake: 0.5, color: C.ember },   // a crater's release (not full)
    rail:     { pri: 3, ms: 1700, look: 'chase', sparks: 10, color: C.sea },
    railout:  { pri: 2, ms: 500, look: 'ring', r: 30, sparks: 10, color: C.yellow },
    puff:     { pri: 2, ms: 420, look: 'ring', r: 34, color: C.steam },
    geyser:   { pri: 4, ms: 1000, look: 'column', w: 40, sparks: 12, pop: 'big', color: C.steam },
    crab:     { pri: 3, ms: 600, look: 'ring', r: 34, sparks: 16, shake: 0.2, pop: 'small', color: C.crab },
    lava:     { pri: 5, ms: 1200, look: 'column', w: 26, sparks: 24, flash: 0.35, pop: 'big', surge: 0.22, sat: 0.25, warm: 0.35, vig: 0.15, color: C.ember },
    lavaopen: { pri: 7, ms: 1800, wide: true, look: 'sides', gi: 0.6, sat: 0.2, warm: 0.4, color: C.lava },
    lavaclose:{ pri: 3, ms: 900, look: 'sweepDown', color: C.steam },
    quake:    { pri: 7, ms: 900, wide: true, look: 'flicker', gi: 0.55, color: C.ember },
    overload: { pri: 6, ms: 1500, wide: true, look: 'flicker', gi: 0.5, shake: 0.5, warm: 0.35, color: C.ember },
    pfull:    { pri: 6, ms: 1400, wide: true, look: 'sweepUp', gi: 0.6, flash: 0.35, surge: 0.15, sat: 0.2, warm: 0.3, color: C.yellow },
    pwarn:    { pri: 4, ms: 900, look: 'ring', r: 70, color: C.orange },
    // ---- wave 3 (5 Nov 2026): THE BIG ONE, the goals, the levels and the boss (every flash <= 0.55, at most 2 a second)
    combo2:   { pri: 5, ms: 1000, look: 'ring', r: 46, sparks: 22, pop: 'big', color: C.pink },   // (a combo of 2-3: local, no flash)
    supercombo: { pri: 8, ms: 2000, wide: true, look: 'spiral', sparks: 50, pop: 'big', gi: 0.5, flash: 0.5, surge: 0.18, sat: 0.25, color: C.pink, word: 'SUPER COMBO' },
    superjackpot: { pri: 9, ms: 2600, wide: true, look: 'spiral', sparks: 60, pop: 'big', gi: 0.4, flash: 0.55, shake: 0.8, surge: 0.2, sat: 0.25, vig: 0.2, color: C.gold, word: 'SUPER JACKPOT' },
    mbstart:  { pri: 8, ms: 2000, wide: true, look: 'sweepUp', sparks: 40, gi: 0.6, surge: 0.15, sat: 0.2, warm: 0.3, color: C.amber, word: 'MULTIBALL' },
    mbend:    { pri: 3, ms: 900, look: 'sweepDown', color: C.steam },
    addaball: { pri: 6, ms: 1300, look: 'column', w: 40, sparks: 30, pop: 'big', color: C.sea, word: 'ADD A BALL' },
    lock:     { pri: 6, ms: 1200, look: 'ring', r: 70, sparks: 30, flash: 0.35, pop: 'big', color: C.green, word: 'LOCKED' },
    locklit:  { pri: 4, ms: 800, look: 'ring', r: 60, sparks: 12, color: C.green },
    modelit:  { pri: 4, ms: 800, look: 'ring', r: 60, sparks: 12, color: C.violet },
    divelit:  { pri: 4, ms: 800, look: 'ring', r: 60, sparks: 12, color: C.blue },
    eruptlit: { pri: 4, ms: 800, look: 'ring', r: 60, sparks: 12, color: C.amber },
    rumble:   { pri: 3, ms: 900, look: 'ring', r: 70, shake: 0.3, color: C.ember },
    plugup:   { pri: 4, ms: 900, look: 'ring', r: 34, sparks: 20, color: C.violet },
    plugdown: { pri: 3, ms: 700, look: 'ring', r: 30, color: C.rock },
    plugsave: { pri: 7, ms: 1300, wide: true, look: 'sweepUp', sparks: 30, gi: 0.7, surge: 0.15, color: C.violet, word: 'PLUG SAVE' },
    sealed:   { pri: 4, ms: 900, look: 'ring', r: 60, sparks: 10, color: C.steam },
    unsealed: { pri: 5, ms: 900, look: 'ring', r: 60, sparks: 20, color: C.ember },
    modestart:{ pri: 6, ms: 1500, wide: true, look: 'sides', sparks: 30, gi: 0.6, surge: 0.12, color: C.violet },
    modedone: { pri: 7, ms: 1800, wide: true, look: 'rain', sparks: 40, flash: 0.4, gi: 0.5, surge: 0.2, sat: 0.2, color: C.green, word: 'MODE COMPLETE' },
    modefail: { pri: 3, ms: 900, look: 'sweepDown', gi: 0.75, color: C.steam },
    missiondone: { pri: 8, ms: 2000, wide: true, look: 'burst', sparks: 50, flash: 0.5, gi: 0.5, surge: 0.2, sat: 0.25, color: C.green, word: 'MISSION DONE' },
    stageclear: { pri: 9, ms: 2600, wide: true, look: 'spiral', sparks: 60, flash: 0.55, gi: 0.45, surge: 0.2, sat: 0.28, vig: 0.15, color: C.gold, word: 'STAGE CLEAR' },
    dive:     { pri: 8, ms: 1400, wide: true, look: 'dive', gi: 0.4, vig: 0.25, color: C.blue, word: 'DIVE!' },
    ascend:   { pri: 8, ms: 1600, wide: true, look: 'sweepUp', sparks: 40, gi: 0.6, surge: 0.18, sat: 0.2, color: C.sea, word: 'ASCEND' },
    chamberclear: { pri: 9, ms: 2400, wide: true, look: 'burst', sparks: 60, flash: 0.55, gi: 0.45, surge: 0.2, sat: 0.28, warm: 0.3, color: C.amber, word: 'CHAMBER CLEARED' },
    lavarise: { pri: 8, ms: 1800, wide: true, look: 'flicker', gi: 0.55, warm: 0.45, shake: 0.4, color: C.lava, word: 'THE LAVA RISES' },
    bosshit:  { pri: 6, ms: 900, look: 'ring', r: 70, sparks: 30, flash: 0.35, shake: 0.5, pop: 'big', color: C.ember },
    bossphase:{ pri: 8, ms: 1800, wide: true, look: 'flicker', gi: 0.5, warm: 0.4, shake: 0.5, color: C.ember },
    bossdown: { pri: 10, ms: 2800, wide: true, look: 'fountain', sparks: 60, flash: 0.55, shake: 1, sat: 0.25, vig: 0.15, color: C.amber, word: 'VOLCANO DEFEATED' }
  };
  // which shows a score is credited to first (the pop goes where the best of them happened)
  var RANK = { extra: 0, bumper: 1, spin: 1, sling: 1, inlane: 1, outlane: 1, lane: 2, drop: 3, eject: 1, orbit: 5, saucer: 6, drops: 6, ramp: 7, loop: 7, mult: 4, skill: 8, combo: 8, jackpot: 9,
    rail: 2, crab: 4, geyser: 5, lava: 7, crater: 8, combo2: 6, supercombo: 8, superjackpot: 10, lock: 8, addaball: 6, bosshit: 8, plugsave: 3 };

  // ------------------------------------------------------------------ particles, shockwaves and table movement, as data
  // bursts: [kind, n (medium tier), power, colour, z lift, where ('gates': at both lava gates), dir]; shock: a screen shockwave's power; move: a kick to the table
  // {pitch, dy, roll} (only when quiet); fringe: a colour-fringe spike; trauma: a rumble (0..1)
  var FXD = {
    // 29 Oct 2026 (owner: "more lamps and effects", "camera moves more"): fuller hits, and small table kicks on the everyday
    // hits too (still only while quiet)
    bumper:   { bursts: [['sparks', 22, 1.1], ['lava', 10, 0.5], ['steam', 12, 0.6, C.steam, 8]], shock: 0.15, move: { dy: 0.35 } },
    sling:    { bursts: [['sparks', 16, 0.9], ['lava', 6, 0.4]], move: { roll: 0.25 } },
    drop:     { bursts: [['debris', 40, 1, C.rock], ['sparks', 14, 0.9, C.violet]], move: { pitch: 0.3 } },
    drops:    { bursts: [['debris', 180, 1.3, C.rock], ['sparks', 80, 1.4, C.violet]], shock: 0.5, fringe: 0.3, move: { pitch: 0.7, dy: 1 } },
    crater:   { bursts: [['lava', 80, 0.8], ['steam', 40, 0.7, C.steam, 10]], shock: 0.4, trauma: 0.3, move: { pitch: 0.4, dy: 0.6 } },
    erupt:    { bursts: [['lava', 320, 1.2], ['steam', 80, 0.9, C.steam, 16], ['debris', 40, 1, C.rock], ['sparks', 60, 1.3, C.ember]], shock: 0.7, move: { pitch: 0.9, dy: 1.2 }, fringe: 0.45, trauma: 0.45 },
    eruption: { bursts: [['lava', 520, 1.7], ['lava', 160, 0.6, null, 30, null, [0, 0, 1.6]], ['debris', 260, 1.5, C.rock], ['sparks', 150, 1.6, C.ember], ['sparks', 80, 1.8, C.yellow, 20], ['sparks', 80, 1.5, C.sea, 10], ['steam', 160, 1.2, C.steam, 20], ['ash', 120, 1.2, C.ash, 30]], shock: 1, shock2: 0.7, move: { pitch: 2, dy: 3 }, fringe: 1, trauma: 1 },
    rail:     { bursts: [['sparks', 18, 0.9, C.yellow]] },
    railout:  { bursts: [['sparks', 12, 0.8, C.yellow]] },
    puff:     { bursts: [['steam', 40, 0.5, C.steam, 4]] },
    geyser:   { bursts: [['steam', 220, 0.6, C.steam, 4, null, [0, 0, 2.2]], ['sparks', 20, 1, C.white]], shock: 0.4, move: { pitch: 0.5, dy: 0.8 } },
    crab:     { bursts: [['sparks', 22, 1.1, C.crab], ['debris', 18, 0.9, C.crab]], shock: 0.25, move: { roll: 0.35 } },
    lava:     { bursts: [['lava', 300, 1.4], ['sparks', 80, 1.4, C.ember], ['sparks', 40, 1.2, C.yellow, 8], ['confetti', 70, 1.1]], shock: 0.7, shock2: 0.4, fringe: 0.5, trauma: 0.25, move: { pitch: 0.5, dy: 0.9 } },
    lavaopen: { bursts: [['lava', 200, 1.1, null, 0, 'gates'], ['sparks', 40, 1.2, C.ember, 4, 'gates'], ['steam', 60, 0.8, C.steam, 6, 'gates']], shock: 0.5, fringe: 0.4, trauma: 0.5, move: { dy: 1 } },
    lavaclose:{ bursts: [['steam', 70, 0.8, C.steam, 6, 'gates']] },
    quake:    { bursts: [['ash', 80, 1, C.ash, 10], ['debris', 80, 1.1, C.rock, 30]], fringe: 0.3, trauma: 1, move: { pitch: 0.5 } },
    overload: { bursts: [['steam', 140, 1.2, C.steam, 16], ['lava', 120, 0.9], ['sparks', 50, 1.2, C.ember, 10]], shock: 0.55, fringe: 0.45, trauma: 0.5 },
    pfull:    { bursts: [['steam', 90, 1, C.steam, 16], ['lava', 80, 0.8], ['sparks', 60, 1.3, C.yellow, 10]], shock: 0.45, fringe: 0.35 },
    pwarn:    { bursts: [['steam', 50, 0.8, C.steam, 16]] },
    skill:    { bursts: [['confetti', 240, 1.3], ['sparks', 60, 1.3, C.green, 6]], shock: 0.5, fringe: 0.4 },
    extra:    { bursts: [['confetti', 360, 1.5], ['sparks', 80, 1.5, C.yellow, 10], ['sparks', 60, 1.3, C.sea, 10]], shock: 0.8, shock2: 0.5, fringe: 0.6, trauma: 0.3 },
    save:     { bursts: [['sparks', 70, 1.2, C.blue, 4], ['sparks', 30, 1, C.white, 4]], shock: 0.35, fringe: 0.25 },
    loop:     { bursts: [['sparks', 70, 1.3, C.cyan], ['sparks', 30, 1.1, C.white]], shock: 0.35, fringe: 0.25 },
    combo:    { bursts: [['sparks', 90, 1.4, C.pink], ['confetti', 60, 1.1]], shock: 0.5, fringe: 0.35 },
    jackpot:  { bursts: [['confetti', 220, 1.3], ['sparks', 90, 1.5, C.yellow]], shock: 0.8, shock2: 0.5, fringe: 0.5 },
    launch:   { bursts: [['steam', 24, 0.6, C.steam, 4], ['sparks', 24, 0.9, C.yellow, 4]] },
    drain:    { bursts: [['ash', 30, 0.5, C.ash, 4]] },
    // ---- wave 3
    combo2:   { bursts: [['sparks', 40, 1.2, C.pink]], shock: 0.25 },
    supercombo: { bursts: [['confetti', 200, 1.3], ['sparks', 80, 1.4, C.pink]], shock: 0.6, fringe: 0.4 },
    superjackpot: { bursts: [['confetti', 300, 1.4], ['sparks', 120, 1.6, C.gold, 10], ['lava', 200, 1.2]], shock: 0.9, shock2: 0.6, fringe: 0.5, trauma: 0.3, move: { pitch: 1, dy: 1.5 } },
    mbstart:  { bursts: [['lava', 160, 1.1, null, 0, 'gates'], ['sparks', 60, 1.3, C.amber, 6]], shock: 0.6, fringe: 0.4, trauma: 0.35, move: { pitch: 0.8, dy: 1.2 } },
    addaball: { bursts: [['steam', 160, 0.7, C.steam, 4, null, [0, 0, 2]], ['sparks', 50, 1.2, C.sea, 6]], shock: 0.45, move: { dy: 0.8 } },
    lock:     { bursts: [['sparks', 70, 1.2, C.green, 10], ['steam', 40, 0.7, C.steam, 10]], shock: 0.4 },
    locklit:  { bursts: [['sparks', 24, 0.9, C.green, 10]] },
    modelit:  { bursts: [['sparks', 24, 0.9, C.violet, 10]] },
    divelit:  { bursts: [['sparks', 24, 0.9, C.blue, 10]] },
    eruptlit: { bursts: [['sparks', 30, 1, C.amber, 10], ['steam', 40, 0.8, C.steam, 12]] },
    rumble:   { bursts: [['steam', 70, 0.9, C.steam, 14], ['ash', 30, 0.7, C.ash, 16]], trauma: 0.3 },
    plugup:   { bursts: [['debris', 40, 0.9, C.rock], ['sparks', 30, 1, C.violet, 4]], shock: 0.25 },
    plugdown: { bursts: [['debris', 24, 0.7, C.rock]] },
    plugsave: { bursts: [['sparks', 60, 1.3, C.violet, 4], ['debris', 30, 1, C.rock]], shock: 0.45, fringe: 0.25 },
    sealed:   { bursts: [['steam', 80, 0.8, C.steam, 10], ['debris', 30, 0.8, C.rock, 12]] },
    unsealed: { bursts: [['lava', 100, 1, null, 10], ['debris', 50, 1, C.rock, 12]], shock: 0.4 },
    modestart:{ bursts: [['sparks', 60, 1.2, C.violet, 6]], shock: 0.35 },
    modedone: { bursts: [['confetti', 200, 1.2], ['sparks', 60, 1.3, C.green, 6]], shock: 0.5, fringe: 0.35 },
    modefail: { bursts: [['steam', 40, 0.6, C.steam, 4]] },
    mbend:    { bursts: [['steam', 50, 0.7, C.steam, 6]] },
    missiondone: { bursts: [['confetti', 260, 1.3], ['sparks', 70, 1.4, C.green, 8]], shock: 0.6, fringe: 0.4 },
    stageclear: { bursts: [['confetti', 360, 1.5], ['sparks', 100, 1.5, C.gold, 10], ['sparks', 60, 1.3, C.sea, 10]], shock: 0.8, shock2: 0.5, fringe: 0.5, trauma: 0.3 },
    dive:     { bursts: [['ash', 60, 0.8, C.ash, 10], ['sparks', 40, 1, C.blue, 10]], shock: 0.5, trauma: 0.3, move: { pitch: -0.6, dy: -1 } },
    ascend:   { bursts: [['sparks', 80, 1.3, C.sea, 6], ['steam', 60, 0.8, C.steam, 4]], shock: 0.5, fringe: 0.3 },
    chamberclear: { bursts: [['confetti', 300, 1.4], ['lava', 200, 1.2], ['sparks', 80, 1.4, C.amber, 8]], shock: 0.8, shock2: 0.5, fringe: 0.5, trauma: 0.4 },
    lavarise: { bursts: [['lava', 240, 1, null, 0], ['steam', 120, 1, C.steam, 10]], fringe: 0.3, trauma: 0.6 },
    bosshit:  { bursts: [['debris', 80, 1.2, C.rock, 12], ['sparks', 60, 1.4, C.ember, 10], ['lava', 80, 0.9, null, 10]], shock: 0.6, fringe: 0.35, trauma: 0.35, move: { pitch: 0.6, dy: 0.8 } },
    bossphase:{ bursts: [['lava', 160, 1.1, null, 10], ['ash', 80, 1, C.ash, 20]], shock: 0.6, fringe: 0.4, trauma: 0.6 },
    bossdown: { bursts: [['lava', 900, 1.6], ['debris', 240, 1.5, C.rock], ['sparks', 200, 1.6, C.amber], ['confetti', 240, 1.4], ['steam', 140, 1.2, C.steam, 20]], shock: 1, shock2: 0.7, move: { pitch: 2, dy: 3 }, fringe: 0.8, trauma: 1 }
  };

  // ------------------------------------------------------------------ where things are on each table (built once per table)
  var CTX = {};
  function lampsFor(id) {
    var Lm = null;
    try { Lm = getLamps(); } catch (e) { Lm = null; }
    if (!Lm) return [];
    if (typeof Lm.forTable === 'function') { try { return Lm.forTable(id).list || []; } catch (e) { return []; } }
    return Lm.list || [];
  }
  function ctxFor(id) {
    if (CTX[id]) return CTX[id];
    var Bt = E.table ? E.table(id) : null, T = Bt ? Bt.T : E.TABLE, MID = T.MID;
    var BUMP = Bt ? Bt.BUMPERS : E.BUMPERS, D = Bt ? Bt.DROPS : E.DROPS, R = Bt ? Bt.RAMP : E.RAMP;
    var rampAt = Bt ? function (s) { return Bt.rampAt(s); } : function (s) { return E.rampAt(s); };
    var SEN = T.sensors || {}, CIR = SEN.circles || [], LIN = SEN.lines || [];   // (a level may leave out the sensors, the shooter lane, the slings and the drops)
    D = D || []; BUMP = BUMP || [];
    function sensor(sid) { var s = null; CIR.forEach(function (c) { if (c[0] === sid) s = { x: c[1], y: c[2] }; }); return s || (/^(in|out)/.test(sid) ? { x: /R$/.test(sid) ? MID + 90 : MID - 90, y: T.H * 0.8 } : sid === 'kick' ? null : sid.indexOf('lane') === 0 ? { x: MID, y: T.H * 0.2 } : null); }
    function line(sid) { var s = null; LIN.forEach(function (c) { if (c[0] === sid) s = { x: (c[1] + c[3]) / 2, y: (c[2] + c[4]) / 2 }; }); return s; }
    var X = { id: T.id || id, T: T, B: Bt, MID: MID, TH: T.H, TW: T.W, BUMP: BUMP, D: D, sensor: sensor, list: null };
    X.P = {
      spinL: line('spin') || { x: 18, y: T.H * 0.44 }, orbR: line('orbR') || { x: 232, y: T.H * 0.44 },
      lanes: [sensor('lane0'), sensor('lane1'), sensor('lane2')],
      kick: sensor('kick') || { x: 16, y: T.H - 22 }, save: { x: MID, y: (T.flippers && T.flippers[0] ? T.flippers[0].y : T.H - 50) + 8 }, mid: { x: MID, y: Math.round(T.H * 0.56) },
      drain: { x: MID, y: Math.round(T.H * 0.67) },
      bank: D.length ? { x: (D[0].ax + D[D.length - 1].bx) / 2, y: (D[0].ay + D[D.length - 1].by) / 2 } : { x: MID, y: T.H / 2 },
      rampTop: R ? rampAt(R.L * 0.2) : { x: MID, y: T.H / 3, z: 0 }
    };
    var RP = [];
    if (R) { var en = T.ramp.entry, rx = (en.x0 + en.x1) / 2; RP = [{ x: rx, y: en.y + 62 }, { x: rx, y: en.y }]; for (var s = 0; s <= R.L; s += 12) { var r = rampAt(s); RP.push({ x: r.x, y: r.y }); } }
    X.RAMP_PATH = RP;
    X.DROP_PATH = D.length ? [{ x: D[0].ax, y: D[0].ay }, { x: D[D.length - 1].bx, y: D[D.length - 1].by }] : [X.P.bank, X.P.bank];
    var SH = T.shooter || { cx: T.W - 14, tip: T.H - 30, x0: T.W - 26 };
    X.SHOOT_PATH = [{ x: SH.cx, y: SH.tip }, { x: SH.cx, y: 150 }, { x: SH.cx - 40, y: 60 }];
    X.SH = SH;
    X.slingAt = function (side) { var sl = T.slings && T.slings[side < 0 ? 0 : 1]; if (!sl) return { x: MID + side * 60, y: T.H * 0.78 }; return { x: (sl.a[0] + sl.c[0]) / 2 + (side < 0 ? 4 : -4), y: (sl.a[1] + sl.c[1]) / 2 }; };
    X.slingPath = function (side) { var sl = T.slings && T.slings[side < 0 ? 0 : 1]; if (!sl) { var q = X.slingAt(side); return [q, q]; } return [{ x: sl.a[0], y: sl.a[1] - 14 }, { x: sl.a[0], y: sl.a[1] }, { x: sl.c[0], y: sl.c[1] }, { x: sl.c[0] + (side < 0 ? 8 : -8), y: sl.c[1] + 18 }]; };
    // Ember Peak's toys
    if (T.volcano) X.volc = { x: T.volcano.x, y: T.volcano.y, z: 48 };   // the crater's pool (world3d.js: a 60-unit cone at 0.85, 29 Oct 2026)
    if (T.geyser) X.gey = { x: T.geyser.x, y: T.geyser.y, z: 4 };
    if (T.lava) {
      // (6 units from the gate's middle towards the side it blocks: the lane's mouth, wherever the gate faces)
      X.gates = T.lava.gates.map(function (g) { var x = (g[0] + g[2]) / 2, y = (g[1] + g[3]) / 2, dx = g[5] - x, dy = g[6] - y, l = Math.sqrt(dx * dx + dy * dy) || 1; return { x: x + dx / l * 6, y: y + dy / l * 6, z: 4 }; });
      X.laneTops = [line('lavaL') || X.gates[0], line('lavaR') || X.gates[1]];
    }
    var sky = Bt && Bt.CARRY && Bt.CARRY.sky;
    if (sky) {
      var ra = Bt.carryAt('sky', sky.railAt >= 0 ? sky.railAt : 0);
      X.railAt = { x: ra.x, y: ra.y, z: ra.z };
      var e = sky.P[sky.P.length - 1]; X.railEnd = { x: e[0], y: e[1], z: 0 };
      X.RAIL_PATH = sky.P.filter(function (p) { return p[3] >= (sky.railAt || 0); }).map(function (p) { return { x: p[0], y: p[1] }; });
    }
    if (T.plug) X.plug = { x: T.plug.x, y: T.plug.y, z: 4 };
    X.approach = Bt && Bt.storeys ? Bt.storeys.map(function (st) { return st.approach; }) : [T.H * 0.67];
    CTX[id] = X;
    return X;
  }

  // ------------------------------------------------------------------ the lamps (for the world's table)
  function lampList() {
    if (!X) return [];
    if (!X.list || !X.list.length) { X.list = lampsFor(X.id); X.RIVER = X.list.filter(function (l) { return l.group === 'river'; }).map(function (l) { return { x: l.x, y: l.y, id: l.id }; }); }
    return X.list;
  }
  var NONE = {};
  function ownShows() {   // the big moments the table's lamp set lights itself (PinLamps.forTable(id).shows): their lamps are left to it
    if (!X) return NONE;
    if (X.own) return X.own;
    var Lm = null; try { Lm = getLamps(); } catch (e) { Lm = null; }
    var set = null; try { set = Lm && typeof Lm.forTable === 'function' ? Lm.forTable(X.id) : null; } catch (e) { set = null; }
    if (set && set.list && set.list.length) X.own = set.shows || NONE;
    return X.own || NONE;
  }
  function blue(l) {   // a blue or cyan lamp (the ball save's sweep uses only these)
    var c = String(l.color || ''), m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(c);
    if (!m) return false;
    var r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16);
    return b > 160 && b > r + 40;
  }
  // lamps along a path (a list of points), in order along it: id -> position 0..n-1
  function along(path, width) {
    var L = lampList(), hits = [];
    var acc = 0, segs = [];
    for (var i = 1; i < path.length; i++) {
      var a = path[i - 1], b = path[i], dx = b.x - a.x, dy = b.y - a.y, l = Math.sqrt(dx * dx + dy * dy) || 1;
      segs.push({ a: a, dx: dx, dy: dy, l: l, s0: acc }); acc += l;
    }
    L.forEach(function (lp) {
      var best = 1e9, bs = 0;
      segs.forEach(function (s) {
        var t = ((lp.x - s.a.x) * s.dx + (lp.y - s.a.y) * s.dy) / (s.l * s.l); t = t < 0 ? 0 : t > 1 ? 1 : t;
        var qx = s.a.x + s.dx * t - lp.x, qy = s.a.y + s.dy * t - lp.y, d = Math.sqrt(qx * qx + qy * qy);
        if (d < best) { best = d; bs = s.s0 + t * s.l; }
      });
      if (best <= width) hits.push({ id: lp.id, s: bs });
    });
    hits.sort(function (p, q) { return p.s - q.s; });
    var order = {};
    hits.forEach(function (h, k) { order[h.id] = k; });
    return { order: order, n: hits.length };
  }
  function nearLamps(x, y, r, min) {   // lamps within r of a point (at least `min` of the nearest)
    var L = lampList(), all = L.map(function (l) { var dx = l.x - x, dy = l.y - y; return { id: l.id, d: Math.sqrt(dx * dx + dy * dy) }; });
    all.sort(function (p, q) { return p.d - q.d; });
    var set = {};
    all.forEach(function (o, k) { if (o.d <= r || k < (min || 0)) set[o.id] = o.d; });
    return set;
  }

  // ------------------------------------------------------------------ how a show lights each lamp: (lamp, phase 0..1, show) -> 0..1
  function band(d, f, w) { var e = Math.abs(d - f); return e < w ? 1 - e / w : 0; }
  function hashf(i, n) { var h = Math.imul(i + 11, 374761393) + Math.imul(n + 5, 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  var HOT = { gauge: 1, crater: 1, erupt: 1 };   // the volcano's own lamps (they stay lit through the ash)
  var LOOKS = {
    // the lamps round a point blink (a bumper's ring, a target's lamps) and fade
    ring: function (l, p, s) {
      var d = s.set[l.id]; if (d == null) return 0;
      return (Math.floor(p * 6) % 2 === 0 ? 1 : 0.3) * (1 - 0.6 * p) * (1 - 0.4 * Math.min(1, d / s.r));
    },
    // a light runs along a line of lamps, with a short tail
    chase: function (l, p, s) {
      var k = s.order[l.id]; if (k == null) return 0;
      var f = p * (s.n + 2) - 1, e = f - k;
      return e >= -0.6 && e < 2.2 ? (e < 0 ? 1 + e / 0.6 : 1 - e / 2.2) : 0;
    },
    // a wave up a strip of the table (the kickback's side, an orbit, a lava lane, the geyser's column)
    column: function (l, p, s) {
      if (Math.abs(l.x - s.x) > (s.w || 34)) return 0;
      return band(1 - l.y / s.TH, -0.1 + 1.25 * p, 0.14);
    },
    // rings out from a point across the whole table
    burst: function (l, p, s) {
      var dx = l.x - s.x, dy = l.y - s.y, d = Math.sqrt(dx * dx + dy * dy) / (s.TH * 0.85), f = p * 1.5;
      return Math.max(band(d, f, 0.13), 0.8 * band(d, f - 0.45, 0.13), 0.6 * band(d, f - 0.9, 0.13));
    },
    // a line of light up the table from the flippers to the arch (twice), or down it
    sweepUp: function (l, p, s) {
      if (s.only === 'blue' && !blue(l)) return 0;
      var d = 1 - l.y / s.TH, f = (p * 2) % 1 * 1.3 - 0.15;
      return band(d, f, 0.16) * (p < 0.5 ? 1 : 0.85);
    },
    sweepDown: function (l, p, s) {
      var d = l.y / s.TH, f = p * 1.3 - 0.15;
      return band(d, f, 0.18) * (1 - 0.5 * p);
    },
    // left to right and back, twice
    sides: function (l, p, s) {
      var q = (p * 2) % 1, x = q < 0.5 ? q * 2 : 2 - q * 2;
      return band(l.x / s.TW, -0.1 + 1.2 * x, 0.12);
    },
    // three arms turning round the middle of the table
    spiral: function (l, p, s) {
      var a = Math.atan2(l.y - s.y, l.x - s.x), v = Math.cos(3 * (a - p * PI * 4));
      return v > 0.55 ? (v - 0.55) / 0.45 * (p < 0.85 ? 1 : (1 - p) / 0.15) : 0;
    },
    // lamps light at random, then all fade together (a sparkle, never all at once)
    rain: function (l, p) {
      var tick = Math.floor(p * 22);
      return hashf(l.i != null ? l.i : 0, tick) > 0.55 + 0.25 * p ? 1 - 0.4 * p : 0;
    },
    // a shudder: lamps jump on and off at random, fast (the quake, an overload)
    flicker: function (l, p) {
      var tick = Math.floor(p * 36);
      return hashf((l.i || 0) + 3, tick) > 0.62 ? 1 - 0.5 * p : 0;
    },
    // under the ash: the table dark but for the volcano's own lamps, pulsing faster as the eruption nears
    ashes: function (l, p, s) {
      if (!HOT[l.group]) return 0;
      var ms = p * s.d.ms, per = 260 - 190 * p;
      return Math.floor(ms / per) % 2 ? 1 : 0.25;
    },
    // a dive: rings closing in on the crater (the table drains into it)
    dive: function (l, p, s) {
      var dx = l.x - s.x, dy = l.y - s.y, d = Math.sqrt(dx * dx + dy * dy) / (s.TH * 0.9);
      return Math.max(band(d, 1.1 - 1.3 * p, 0.12), 0.7 * band(d, 1.4 - 1.3 * p, 0.12)) * (p < 0.85 ? 1 : (1 - p) / 0.15);
    },
    // the eruption: rings racing out from the crater, and the whole table glittering
    fountain: function (l, p, s) {
      var dx = l.x - s.x, dy = l.y - s.y, d = Math.sqrt(dx * dx + dy * dy) / (s.TH * 0.9), f = p * 2.2;
      var rings = Math.max(band(d, f, 0.1), 0.85 * band(d, f - 0.35, 0.1), 0.7 * band(d, f - 0.7, 0.1));
      var glitter = hashf(l.i || 0, Math.floor(p * 30)) > 0.5 + 0.4 * p ? 0.9 * (1 - p) : 0;
      return Math.max(rings, glitter, HOT[l.group] ? 1 - p * 0.6 : 0);
    }
  };

  // ------------------------------------------------------------------ the state
  var X = null;   // the world's table (ctxFor)
  var S = {
    W: null, frame: 0, score: 0, clock: 0, last: -1, seed: 12345, seamAt: -1, seamI: 0, maxBall: -1, fountains: 0, jp: null,
    shows: [], flashAt: -1e9, flashQ: [], dipAt: -1e9, warnAt: -1e9, nudgeAt: -1e9,
    sh: { x: 0, y: 0, vx: 0, vy: 0 }, reducedAt: -1e9, reduced: false,
    // Ember Peak: the full eruption (ash, then flood), the rumble, the table's springs, the colour fringe, timed bursts
    full: false, ashAt: -1e9, ashEnd: -1e9, ashEmit: 0, floodAt: -1e9, trauma: 0, fringe: 0, warm: 0, satK: 0, vigK: 0, railEmit: 0, later: [],
    tm: { pitch: { x: 0, v: 0 }, roll: { x: 0, v: 0 }, dy: { x: 0, v: 0 } }, quiet: false
  };
  var state = { gi: 1, flash: 0, flashColor: C.white, shake: { x: 0, y: 0 }, pops: [], sparks: [], lamps: {}, base: 1,
    table: { pitch: 0, roll: 0, dy: 0, shake: 0 }, bursts: [], shocks: [], post: { fringe: 0, vignette: 0.18, warm: 0, sat: 1, ash: 0 }, reduced: false };
  var MAXPOP = 8, MAXSPARK = 240, FLASH_GAP = 510, MAXBURST = 48, MAXSHOCK = 6;   // FLASH_GAP: never more than 2 whole-table flashes a second (wave 3; was 3)
  var FLASH_MAX = 0.55, GI_MAX = 1.2;   // wave 3, the grade cap: no whole-table flash over 0.55, the light never over 1.2
  var LIM = { pitch: 2, dy: 3, roll: 1 };

  function rnd() { S.seed = (S.seed * 1103515245 + 12345) & 0x7fffffff; return S.seed / 0x7fffffff; }
  function reduced() {
    if (api.reduce === true || api.reduce === false) return api.reduce;
    if (S.clock - S.reducedAt < 1000) return S.reduced;
    S.reducedAt = S.clock;
    try {
      S.reduced = win && win.A11y365 ? !!win.A11y365.reduce() : !!(win && win.matchMedia && win.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) { S.reduced = false; }
    return S.reduced;
  }
  function clear() {
    S.shows.length = 0; S.flashQ.length = 0; S.dipAt = -1e9; S.warnAt = -1e9; S.later.length = 0;
    state.pops.length = 0; state.sparks.length = 0; state.flash = 0; state.base = 1; state.bursts.length = 0; state.shocks.length = 0;
    S.sh.x = S.sh.y = S.sh.vx = S.sh.vy = 0; state.shake.x = state.shake.y = 0;
    S.full = false; S.ashAt = S.ashEnd = S.floodAt = -1e9; S.trauma = 0; S.fringe = 0; S.warm = 0; S.satK = 0; S.vigK = 0;
    ['pitch', 'roll', 'dy'].forEach(function (k) { S.tm[k].x = S.tm[k].v = 0; state.table[k] = 0; }); state.table.shake = 0;
    for (var k in state.lamps) if (Object.prototype.hasOwnProperty.call(state.lamps, k)) delete state.lamps[k];   // (a new world may be a different table)
  }
  function adopt(W) {   // a new world (a new game, or the title screen's demo starting again in the same object)
    clear(); S.W = W; S.frame = W ? W.frame : 0; S.score = W ? W.score : 0; state.gi = 1; S.seamAt = -1; S.jp = null;
    S.maxBall = -1; if (W && W.balls) for (var q = 0; q < W.balls.length; q++) S.maxBall = Math.max(S.maxBall, W.balls[q].id);
    X = ctxFor(W && W.tableId ? W.tableId : (E.DEFAULT || 'orbit'));
    X.list = null; X.own = null;   // (the lamp list is looked up again: lamps.js may have loaded since)
  }

  // ------------------------------------------------------------------ making things happen
  function seams() { S.seamAt = S.clock; S.seamI = 0; }
  function startShow(name, at, extra) {
    var d = SHOWS[name]; if (!d || !X) return null;
    // a wide show only starts if nothing wide of a higher priority is running; it replaces lower or equal ones
    if (d.wide) {
      for (var i = S.shows.length - 1; i >= 0; i--) {
        var o = S.shows[i];
        if (!o.d.wide) continue;
        if (o.d.pri > d.pri) return null;
        S.shows.splice(i, 1);
      }
    }
    for (i = S.shows.length - 1; i >= 0; i--) if (S.shows[i].name === name && S.shows[i].key === (extra && extra.key)) S.shows.splice(i, 1);   // the same show restarts
    var s = { name: name, d: d, t0: S.clock, x: at.x, y: at.y, r: d.r || 30, w: d.w, only: d.only, key: extra && extra.key, TH: X.TH, TW: X.TW };
    if (extra && extra.ms) s.d = Object.create(d, { ms: { value: extra.ms } });
    if (d.look === 'ring') s.set = nearLamps(at.x, at.y, s.r, 2);
    if (d.look === 'chase') { var a = along(extra && extra.path || [at, at], extra && extra.width || 20); s.order = a.order; s.n = a.n; }
    S.shows.push(s);
    if (S.shows.length > 24) S.shows.shift();
    if (d.flash) { flash(d.flash, at.color || d.color); if (d.flashes > 1) S.flashQ.push({ at: S.clock + FLASH_GAP + 10, v: d.flash * 0.8, c: d.flash2 || d.color }); }
    if (d.shake) knock((at.x < X.MID ? -1 : 1) * d.shake * 0.6, -d.shake);
    if (d.sat) S.satK = Math.max(S.satK, d.sat);   // the big moments' grade: richer colour, the lava's warmth, the edges drawn in (29 Oct 2026, owner: "bigger light shows")
    if (d.warm) S.warm = Math.max(S.warm, d.warm);
    if (d.vig) S.vigK = Math.max(S.vigK, d.vig);
    return s;
  }
  function flash(v, color) {
    if (reduced()) return false;
    if (S.clock - S.flashAt < FLASH_GAP) return false;
    S.flashAt = S.clock; state.flash = Math.max(state.flash, Math.min(FLASH_MAX, v));
    state.flashColor = safeColor(color);
    return true;
  }
  function safeColor(c) {   // never a red flash: anything reddish becomes white
    var m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(String(c || ''));
    if (!m) return C.white;
    var r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16);
    return r > 150 && g < 140 && b < 200 ? C.white : '#' + m[1] + m[2] + m[3];
  }
  function knock(x, y) {   // a push to the cabinet (the shake is a spring)
    if (reduced()) return;
    S.sh.vx += x * 40; S.sh.vy += y * 40;
  }
  function sparks(n, x, y, z, color, power) {
    power = power || 1;
    if (api.gpu) { burst('sparks', n, x, y, z, color, power); return; }
    for (var i = 0; i < n; i++) {
      var a = rnd() * PI * 2, sp = (40 + rnd() * 110) * power, life = 320 + rnd() * 420;
      state.sparks.push({ x: x, y: y, z: z, color: rnd() < 0.25 ? C.white : color, a: 1, size: 1 + rnd() * 1.6,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: (60 + rnd() * 140) * power, age: 0, life: life });
    }
    if (state.sparks.length > MAXSPARK) state.sparks.splice(0, state.sparks.length - MAXSPARK);
  }
  function burst(kind, n, x, y, z, color, power, dir) {
    if (reduced()) n = Math.ceil(n / 2);
    state.bursts.push({ x: x, y: y, z: z || 0, kind: kind, n: n, color: color || null, power: power || 1, dir: dir || null });
    if (state.bursts.length > MAXBURST) state.bursts.splice(0, state.bursts.length - MAXBURST);
  }
  function shock(x, y, z, power) {
    if (reduced() || !(power > 0)) return;
    state.shocks.push({ x: x, y: y, z: z || 0, power: power });
    if (state.shocks.length > MAXSHOCK) state.shocks.splice(0, state.shocks.length - MAXSHOCK);
  }
  function kick(m, side) {   // a push to the whole table (only while quiet; never with reduced motion); side -1/1 signs the roll
    if (!m || reduced() || !S.quiet) return;
    var w = 12;   // the spring's speed: a push of `a` peaks near a
    if (m.pitch) S.tm.pitch.v += m.pitch * w * 1.6;
    if (m.dy) S.tm.dy.v += m.dy * w * 1.6;
    if (m.roll) S.tm.roll.v += m.roll * (side || 1) * w * 1.6;
  }
  function fxAt(name, at, W, override) {   // a named FXD entry's bursts, shock, table push, fringe and rumble
    var f = override || FXD[name]; if (!f) return;
    (f.bursts || []).forEach(function (b) {
      var pts = b[5] === 'gates' && X.gates ? X.gates : [at];
      pts.forEach(function (p) { burst(b[0], b[1], p.x, p.y, (p.z || 0) + (b[4] || 0), b[3] || at.color, b[2], b[6]); });
    });
    if (f.shock) shock(at.x, at.y, at.z, f.shock);
    if (f.shock2) S.later.push({ at: S.clock + 260, fn: function () { shock(at.x, at.y, at.z, f.shock2); } });
    if (f.move) kick(f.move, at && at.x != null && X ? (at.x < X.MID ? -1 : 1) : 1);
    if (f.fringe && !reduced()) S.fringe = Math.max(S.fringe, f.fringe);
    if (f.trauma && !reduced()) S.trauma = Math.min(1, Math.max(S.trauma, f.trauma));
  }
  function pop(text, x, y, z, color, big, key) {
    if (typeof text === 'number') {   // quick repeats in the same place (a spinner, a bumper rattle) add up in one pop - and so
      // do points scored close together by different parts (the lead, 15 Oct 2026: pops were piling up on each other at the hangar)
      for (var i = state.pops.length - 1; i >= 0; i--) {
        var o = state.pops[i];
        if (o.word || o.age >= 500) continue;
        if ((key && o.key === key && o.age < 380) || (Math.abs(o.x - x) < 26 && Math.abs(o.y - y) < 26)) {
          o.value += text; o.text = fmt(o.value); o.age = Math.min(o.age, 60); return o;
        }
      }
    }
    x = Math.max(26, Math.min(X ? X.SH.x0 - 12 : 232, x));   // (kept clear of the cabinet's sides, so the words never run off the table)
    var p = { x: x, y: y, z0: z, z: z, text: typeof text === 'number' ? fmt(text) : String(text), value: typeof text === 'number' ? text : 0,
      color: color || C.white, a: 0, s: 0, big: !!big, age: 0, life: big ? 1500 : 760, key: key || '', word: typeof text !== 'number' };
    state.pops.push(p);
    if (state.pops.length > MAXPOP) state.pops.splice(0, state.pops.length - MAXPOP);
    return p;
  }

  // what an event is, where it happened and in what colour
  function nearestOf(pts, b) {
    var best = pts[0], bd = 1e9;
    if (!b) return best;
    pts.forEach(function (p) { if (!p) return; var d = (p.x - b.x) * (p.x - b.x) + (p.y - b.y) * (p.y - b.y); if (d < bd) { bd = d; best = p; } });
    return best;
  }
  function ballOf(W) {   // the ball that most likely just did something: the first one on the playfield
    for (var i = 0; i < W.balls.length; i++) if (W.balls[i].m === 'free') return W.balls[i];
    return W.balls[0] || null;
  }
  function jackpotAt(W, b) {   // which jackpot was just collected (lit before, lit no more), else where the ball is
    var J = S.jp, M = W.mb, P = X.P, k;
    if (J && X.laneTops) {
      if (J.lavaL && !(M && M.jp && M.jp.lavaL)) k = X.laneTops[0];
      else if (J.lavaR && !(M && M.jp && M.jp.lavaR)) k = X.laneTops[1];
      else if (J.ramp && !(M && M.jp && M.jp.ramp)) k = P.rampTop;
    }
    if (k) return { x: k.x, y: k.y, z: (k.z || 0) + 10 };
    return b ? { x: b.x, y: b.y, z: 10 } : { x: P.mid.x, y: P.mid.y, z: 10 };
  }
  function where(W, e) {
    var name = typeof e === 'string' ? e : e && e.sfx, b = ballOf(W), at, color, key = '', ex = null, P = X.P, T = X.T, tid = X.id;
    switch (name) {
      case 'bumper': { var bb = X.BUMP[e.i] || X.BUMP[0]; at = { x: bb.x, y: bb.y, z: 20 }; color = (BUMPC[tid] || BUMPC.orbit)[e.i % 3]; key = 'b' + e.i; break; }
      case 'sling': { var sa = X.slingAt(e.side); at = { x: sa.x, y: sa.y, z: 8 }; ex = { path: X.slingPath(e.side), width: 22, key: 's' + e.side }; key = 's' + e.side; break; }
      case 'drop': { var dd = X.D[e.i] || X.D[0]; at = { x: (dd.ax + dd.bx) / 2, y: (dd.ay + dd.by) / 2, z: 10 }; color = (DROPC[tid] || DROPC.orbit)[e.i % 5]; key = 'd' + e.i; break; }
      case 'drops': at = { x: P.bank.x, y: P.bank.y, z: 12 }; break;
      case 'reset': at = P.bank; ex = { path: X.DROP_PATH, width: 26 }; break;
      case 'spin': at = { x: P.spinL.x, y: P.spinL.y, z: 12 }; key = 'spin'; break;
      case 'orbit': case 'loop': { var o = nearestOf([P.spinL, P.orbR], b); at = { x: o.x, y: o.y, z: 14 }; if (name === 'loop') at = { x: X.MID, y: tid === 'orbit' ? 200 : 140, z: 16, px: o.x }; break; }
      case 'lane': case 'mult': { var ln = nearestOf(P.lanes, b); at = { x: ln.x, y: ln.y, z: 8 }; break; }
      case 'skill': { var sk = P.lanes[W.skill] || nearestOf(P.lanes, b); at = { x: sk.x, y: sk.y, z: 10 }; break; }
      case 'inlane': { var il = nearestOf([X.sensor('inL'), X.sensor('inR')], b); at = { x: il.x, y: il.y, z: 6 }; key = 'in'; break; }
      case 'outlane': { var ol = nearestOf([X.sensor('outL'), X.sensor('outR')], b); at = { x: ol.x, y: ol.y, z: 6 }; break; }
      case 'kickback': at = { x: P.kick.x, y: P.kick.y, z: 6 }; break;
      case 'jackpot': if (!T.saucer) { at = jackpotAt(W, b); break; } at = { x: T.saucer.x, y: T.saucer.y, z: 10 }; break;
      case 'saucer': case 'eject': if (!T.saucer) return null; at = { x: T.saucer.x, y: T.saucer.y, z: 10 }; break;
      case 'rampin': if (!X.RAMP_PATH.length) return null; at = { x: X.RAMP_PATH[1].x, y: X.RAMP_PATH[1].y, z: 4 }; ex = { path: X.RAMP_PATH.slice(0, 6), width: 18 }; break;
      case 'combo': case 'supercombo':
        if (X.volc || !X.RAMP_PATH.length) { at = b ? { x: b.x, y: b.y, z: 10 } : { x: P.mid.x, y: P.mid.y, z: 10 }; break; }   // (Ember: any two shots, at the ball)
        at = { x: P.rampTop.x, y: P.rampTop.y, z: (P.rampTop.z || 0) + 14 }; ex = { path: X.RAMP_PATH, width: 20 }; break;
      case 'ramp': at = { x: P.rampTop.x, y: P.rampTop.y, z: (P.rampTop.z || 0) + 14 }; ex = { path: X.RAMP_PATH, width: 20 }; break;
      case 'launch': at = { x: X.SH.cx, y: X.SH.tip - 10, z: 4 }; ex = { path: X.SHOOT_PATH, width: 22 }; break;
      case 'extra': at = { x: P.mid.x, y: P.mid.y, z: 20 }; break;
      case 'save': at = { x: P.save.x, y: P.save.y, z: 10 }; break;
      case 'newball': case 'ballend': case 'drain': at = { x: X.MID, y: P.drain.y, z: 0 }; break;
      // Ember Peak's
      case 'crater': case 'erupt': case 'overload': case 'pressure': if (!X.volc) return null; at = { x: X.volc.x, y: X.volc.y, z: X.volc.z }; break;
      case 'rail': if (!X.railAt) return null; at = { x: X.railAt.x, y: X.railAt.y, z: X.railAt.z }; ex = { path: X.RAIL_PATH, width: 22 }; break;
      case 'railout': if (!X.railEnd) return null; at = { x: X.railEnd.x, y: X.railEnd.y, z: 4 }; break;
      case 'puff': case 'geyser': if (!X.gey) return null; at = { x: X.gey.x, y: X.gey.y, z: 4 }; break;
      case 'crab': { var cr = W.toys && W.toys.crabs && W.toys.crabs[e.i]; if (!cr) return null; at = { x: cr.x, y: cr.y, z: 6 }; key = 'c' + e.i; break; }
      case 'lava': {
        if (!X.laneTops) return null;
        var li = W.lit && W.lit.lava && W.lit.lava[1] > W.lit.lava[0] ? 1 : 0, lt = X.laneTops[li];
        at = { x: lt.x, y: lt.y, z: 6 }; break;
      }
      case 'lavaopen': case 'lavaclose': if (!X.gates) return null; at = { x: X.MID, y: X.gates[0].y, z: 4 }; break;
      case 'quake': case 'quakeend': at = { x: X.MID, y: Math.round(X.TH * 0.22), z: 10 }; break;
      // wave 3: the crater's own (the middle of the table on a table without a volcano)
      case 'superjackpot': case 'lock': case 'locklit': case 'modelit': case 'divelit': case 'eruptlit': case 'rumble': case 'sealed': case 'unsealed':
      case 'bosshit': case 'bossphase': case 'bossdown': case 'dive':
        at = X.volc ? { x: X.volc.x, y: X.volc.y, z: X.volc.z } : { x: P.mid.x, y: Math.round(X.TH * 0.3), z: 12 }; break;
      case 'mbstart': case 'mbend': case 'stageclear': case 'missiondone': case 'modestart': case 'modedone': case 'modefail': case 'ascend': case 'chamberclear': case 'lavarise':
        at = { x: P.mid.x, y: P.mid.y, z: 14 }; break;
      case 'addaball': at = X.gey ? { x: X.gey.x, y: X.gey.y, z: 4 } : { x: P.mid.x, y: P.mid.y, z: 10 }; break;
      case 'plugup': case 'plugdown': case 'plugsave': { var pg = X.plug || P.save; at = { x: pg.x, y: pg.y - 6, z: 4 }; break; }
      default: return null;
    }
    return { name: name, at: at, color: color, key: key, ex: ex };
  }

  // ------------------------------------------------------------------ PinFX.events: one engine step's events
  function events(W, list) {
    if (!W) return;
    if (W !== S.W || W.frame < S.frame) adopt(W);
    var delta = W.score - S.score;
    S.score = W.score; S.frame = W.frame;
    if (!list || !list.length) return;
    var names = {}, best = null, bestRank = -1, i, e, n;
    for (i = 0; i < list.length; i++) { e = list[i]; n = typeof e === 'string' ? e : e && e.sfx; if (n) names[n] = true; }
    S.quiet = quietNow(W);
    for (i = 0; i < list.length; i++) {
      e = list[i]; n = typeof e === 'string' ? e : e && e.sfx;
      if (!n) continue;
      if (n === 'nudge') { S.nudgeAt = S.clock; knock((W.frame & 1 ? 1 : -1) * 1.1, -0.5); continue; }
      if (n === 'warn') { S.warnAt = S.clock; continue; }
      if ((n === 'wall' || n === 'rubber') && e.v > 700) { var hb = ballOf(W); if (hb) sparks(Math.min(10, Math.round(e.v / 220)), hb.x, hb.y, 5, n === 'wall' ? C.white : C.yellow, 0.7); continue; }
      if (n === 'drain' && (names.save || W.balls.length > 0)) continue;   // saved, or other balls still in play: no dip
      if (n === 'drain') S.dipAt = S.clock;
      if (n === 'tick' || n === 'flip' || n === 'search' || n === 'rampfail' || n === 'over' || n === 'tilt' || n === 'quakeend') continue;
      var w = where(W, e); if (!w) continue;
      var show = n, ms = 0;
      // Ember Peak: the pressure event has two levels; the crater with a full pressure is the ASH-CLOUD, and its release
      // the full ERUPTION
      if (n === 'pressure') show = e.level === 'full' ? 'pfull' : 'pwarn';
      if (n === 'crater' && names.lavaopen) {
        var V = W.toys && W.toys.volcano, hold = V && V.release > W.frame ? (V.release - W.frame) * 1000 / 60 : 2750;
        S.full = true; S.ashAt = S.clock; S.ashEnd = S.clock + hold; S.ashEmit = 0;
        startShow('ash', w.at, { ms: hold });
      }
      if (n === 'erupt' && S.full) { show = 'eruption'; S.full = false; S.ashEnd = Math.min(S.ashEnd, S.clock); S.floodAt = S.clock; seams(); }
      if (n === 'combo' && X.volc) show = (e && e.n >= 4) ? 'combo' : 'combo2';   // (Ember: combos are frequent; only a big one takes the table)
      if (n === 'mbstart') seams();
      var d = SHOWS[show], col = w.color || d && d.color || C.white;
      w.at.color = col;
      if (d) {
        startShow(show, w.at, w.ex || (w.key ? { key: w.key } : null));
        if (d.sparks) sparks(reduced() ? Math.ceil(d.sparks / 2) : d.sparks, w.at.px != null ? w.at.px : w.at.x, w.at.y, w.at.z || 6, col, d.pri >= 5 ? 1.6 : 1);
        var word = d.word ? d.word : n === 'mult' ? 'BONUS X' + W.mult : n === 'combo' && e && e.n > 1 ? 'COMBO ' + e.n : n === 'jackpot' && X.volc ? 'JACKPOT' : null;
        if (word) { var wp = pop(word, w.at.x, w.at.y - (d.pop ? 18 : 0), (w.at.z || 6) + (d.pop ? 22 : 6), col === C.flood || col === C.amber ? C.yellow : col, true); if (wp) wp.plate = true; }   // (above the points; wave 3: words on a dark plate)
      }
      fxAt(show, w.at, W);
      var rk = RANK[n];
      if (rk != null && rk > bestRank) { bestRank = rk; best = { w: w, d: d, col: col }; }
    }
    S.jp = W.mb && W.mb.jp ? { lavaL: !!W.mb.jp.lavaL, lavaR: !!W.mb.jp.lavaR, ramp: !!W.mb.jp.ramp } : null;
    // the points this step won pop up where the best of it happened (not while the bonus counts up)
    if (delta > 0 && best && W.state === 'play') {
      var big = best.d && best.d.pop === 'big';
      pop(delta, best.w.at.x, best.w.at.y, (best.w.at.z || 6) + 4, best.col, big, big ? '' : best.w.key || best.w.name);
    }
  }

  // ------------------------------------------------------------------ is the table quiet? (no ball can reach a flipper soon)
  // PinCam.quiet(W) decides when the camera is loaded (it forecasts the balls). Without it: only while every ball is
  // held in the crater, rides a carry with more than 0.9 s left, or rests on the plunger.
  function quietNow(W) {
    if (!W || !X) return false;
    if (typeof api.quiet === 'function') { try { return !!api.quiet(W); } catch (e) { return false; } }
    var cam = win && win.PinCam;
    if (cam && typeof cam.quiet === 'function') { try { return !!cam.quiet(W); } catch (e) { return false; } }
    if (W.state !== 'play' || W.tilted || W.over) return false;
    var V = W.toys && W.toys.volcano, SUB = E.SUB || 10;
    for (var i = 0; i < W.balls.length; i++) {
      var b = W.balls[i];
      if (b.m === 'held' && b.at === 'crater' && V && V.land > W.frame + 54) continue;
      if (b.m === 'ramp' && b.carry && X.B && X.B.CARRY[b.carry]) { var C2 = X.B.CARRY[b.carry]; if ((C2.end - b.ct / SUB) / 60 > 0.9) continue; return false; }
      if (b.m === 'free' && b.x > X.SH.x0 && b.y > X.SH.tip - 30 && Math.abs(b.vy) < 5) continue;
      return false;
    }
    return W.balls.length > 0;
  }
  function inApproach(W) {   // is any ball in a flipper's approach zone (or, on a table without storeys, low on the table)?
    if (!W) return false;
    for (var i = 0; i < W.balls.length; i++) {
      var b = W.balls[i];
      if (E.inApproach && E.table) { if (E.inApproach(W, b) >= 0) return true; }
      else if (b.m === 'free' && b.y > X.approach[0] && b.x < X.SH.x0) return true;
    }
    return false;
  }

  // ------------------------------------------------------------------ PinFX.update: once a frame, by real time
  function update(W, t, mode) {
    t = +t || 0;
    if (W && (W !== S.W || W.frame < S.frame)) adopt(W);
    if (!X) X = ctxFor(E.DEFAULT || 'orbit');
    var dt = S.last < 0 ? 0 : Math.max(0, Math.min(100, t - S.last));
    S.last = t;
    if (mode === 'paused') dt = 0;
    S.clock += dt;
    var k = dt / 1000, i, red = reduced();
    state.reduced = red;
    // points scored with no event to say where (a lit lane rolled again): at the ball
    if (W && W.score > S.score && W.state === 'play') { var bb = ballOf(W); if (bb) pop(W.score - S.score, bb.x, bb.y, 8, C.yellow, false, 'quiet'); }
    if (W) { S.score = W.score; S.frame = W.frame; }
    // timed things (a second shockwave)
    for (i = S.later.length - 1; i >= 0; i--) if (S.clock >= S.later[i].at) { var f = S.later[i].fn; S.later.splice(i, 1); f(); }

    // the shows: drop the finished ones; the wide one in charge (if any) sets the background light
    var top = 0, giShow = 1, baseTo = 1, surge = 0;
    for (i = S.shows.length - 1; i >= 0; i--) {
      var s = S.shows[i];
      if (S.clock - s.t0 >= s.d.ms) { S.shows.splice(i, 1); continue; }
      if (s.d.wide && s.d.pri > top) { top = s.d.pri; baseTo = s.d.base != null ? s.d.base : 0.3; }
      if (s.d.gi != null) giShow = Math.min(giShow, s.d.gi + (1 - s.d.gi) * Math.pow((S.clock - s.t0) / s.d.ms, 3));
      var sp0 = (S.clock - s.t0) / s.d.ms;
      if (s.d.surge && sp0 > 0.5) surge = Math.max(surge, s.d.surge * Math.sin(PI * (sp0 - 0.5) / 0.5));   // the light dips, then surges back over normal
    }
    // the lamps
    var L = lampList(), out = state.lamps;
    for (var id in out) if (Object.prototype.hasOwnProperty.call(out, id)) out[id] = 0;
    for (i = 0; i < S.shows.length; i++) {
      s = S.shows[i];
      if (top && s.d.pri < top) continue;   // a whole-table show pauses everything below it
      if (s.d.wide && ownShows()[s.name]) continue;   // (the lamp set plays its own show for this one: lamps.js, 29 Oct 2026)
      var look = LOOKS[s.d.look]; if (!look) continue;
      var p = (S.clock - s.t0) / s.d.ms;
      for (var j = 0; j < L.length; j++) {
        var v = look(L[j], p, s);
        if (v > 0 && v > (out[L[j].id] || 0)) out[L[j].id] = Math.min(1, v);
      }
    }
    var dark = W && (W.tilted || W.over);
    if (dark) for (id in out) if (Object.prototype.hasOwnProperty.call(out, id)) out[id] = 0;
    state.base += ((top ? baseTo : 1) - state.base) * Math.min(1, k * (top ? 14 : 5));

    // the background light: off on a tilt, low at game over, dimmed while the bonus counts, dips on a drain, the shows';
    // Ember Peak: sinking under the ash while the crater holds the ball, then the eruption's flood of light
    var gi = 1, ashK = 0, floodK = 0;
    if (S.clock < S.ashEnd) ashK = smooth((S.clock - S.ashAt) / 1400);
    var fs = S.clock - S.floodAt;
    if (fs >= 0 && fs < 1800) floodK = smooth(fs / 300) * (1 - smooth(fs / 1800));   // (wave 3: the flood swells in over 0.3 s, not all at once)
    if (W && W.tilted) gi = 0;
    else if (mode === 'over' || (W && W.over)) gi = 0.35;
    else {
      if (W && W.state === 'bonus') gi = 0.6;
      var since = S.clock - S.dipAt;
      if (since < 1700) gi = Math.min(gi, since < 200 ? 0.3 : 0.3 + 0.7 * smooth((since - 200) / 1500));
      if (S.clock - S.warnAt < 260) gi = Math.min(gi, 0.65);
      gi = Math.min(gi, giShow);
      if (surge > 0 && since >= 1700) gi = Math.max(gi, 1 + surge);
      if (ashK > 0) gi = Math.min(gi, 1 - 0.85 * ashK);
      if (floodK > 0) gi = Math.max(gi, 1 + 0.15 * floodK);   // (the eruption's flood: amber, 1.15 - wave 3, the grade cap; it was 1.38)
      gi = Math.min(GI_MAX, gi);
    }
    var gk = gi < state.gi ? 1 - Math.exp(-dt / 50) : floodK > 0.5 ? 1 - Math.exp(-dt / 25) : 1 - Math.exp(-dt / 220);
    state.gi += (gi - state.gi) * gk;
    if (Math.abs(state.gi - gi) < 0.002) state.gi = gi;

    // the ash cloud: ash and steam rising from the crater all through the hold, and a low rumble
    if (ashK > 0 && X.volc) {
      S.ashEmit -= dt;
      if (S.ashEmit <= 0) { S.ashEmit += 160; burst('ash', 22, X.volc.x, X.volc.y, X.volc.z + 4, C.ash, 0.8 + 0.6 * ashK); burst('steam', 6, X.volc.x, X.volc.y, X.volc.z, C.steam, 0.6); }
      if (!red) S.trauma = Math.max(S.trauma, 0.22 * ashK);
    }
    // the wire rail: sparks fly off the ball as it rides
    if (W && X.railAt) {
      S.railEmit -= dt;
      for (i = 0; i < W.balls.length; i++) {
        var rb = W.balls[i];
        if (rb.m === 'ramp' && rb.carry && rb.railed && S.railEmit <= 0) { S.railEmit = 70; sparks(3, rb.x, rb.y, (rb.z || 0) + 2, C.yellow, 0.6); }
      }
    }

    // the lower half alive (one screen, 29 Oct 2026): an ember now and then drifts up off a lava-lit sling, faster as
    // the pressure builds (a particle or two: cheap; none in reduced motion, on a tilt or at game over)
    if (W && X.volc && !red && !dark && W.state !== 'bonus') {
      var V0 = W.toys && W.toys.volcano, pk = V0 ? Math.min(1, V0.pressure || 0) : 0;
      S.slingEmit = (S.slingEmit || 0) - dt;
      if (S.slingEmit <= 0) {
        S.slingEmit += 560 - 320 * pk;
        var sd = rnd() < 0.5 ? -1 : 1, sp = X.slingAt(sd);
        sparks(1 + (pk > 0.6 ? 1 : 0), sp.x + (rnd() - 0.5) * 10, sp.y + (rnd() - 0.5) * 14, 3, C.ember, 0.3);
      }
    }
    // THE BIG ONE (wave 3): seams of light racing down the lava river from the cone, and a lava fountain from the cone
    // for each ball it spits out into the multiball
    lampList();
    if (S.seamAt >= 0 && X.RIVER && X.RIVER.length) {
      var sf = (S.clock - S.seamAt) / 55, R2 = X.RIVER;
      while (S.seamI < R2.length && S.seamI <= sf) { var rp = R2[S.seamI]; burst('sparks', 5, rp.x, rp.y, 1, C.amber, 0.45); if (S.seamI % 2 === 0) burst('lava', 6, rp.x, rp.y, 1, null, 0.35); S.seamI++; }
      for (i = 0; i < R2.length; i++) { var sv = Math.max(0, 1 - Math.abs(sf - i) / 3); if (sv > 0) state.lamps[R2[i].id] = Math.max(state.lamps[R2[i].id] || 0, sv); }
      if (sf > R2.length + 6) S.seamAt = -1;
    }
    if (W && W.balls) {
      var topId = 0; for (i = 0; i < W.balls.length; i++) if (W.balls[i].id > topId) topId = W.balls[i].id;
      if (topId > S.maxBall && S.maxBall >= 0 && W.mb && W.mb.on && X.volc && W.state === 'play') {
        burst('lava', 240, X.volc.x, X.volc.y, X.volc.z + 4, null, 1.3, [0, 0, 1.8]); burst('sparks', 50, X.volc.x, X.volc.y, X.volc.z + 8, C.amber, 1.3);
        shock(X.volc.x, X.volc.y, X.volc.z, 0.4); S.fountains++;
      }
      S.maxBall = Math.max(S.maxBall, topId);
    }
    // the flash (and a second one, a third of a second later)
    for (i = S.flashQ.length - 1; i >= 0; i--) if (S.clock >= S.flashQ[i].at) { flash(S.flashQ[i].v, S.flashQ[i].c); S.flashQ.splice(i, 1); }
    state.flash = red ? 0 : state.flash * Math.exp(-dt / 85);
    if (state.flash < 0.01) state.flash = 0;

    // is the table quiet? (table movement and hit shakes depend on it)
    S.quiet = quietNow(W);
    var appr = inApproach(W), nudged = S.clock - S.nudgeAt < 350;
    // the quake: a rumble all through it, and the table leaning with the pull (only while quiet)
    var Q = W && W.toys && W.toys.quake, rollTo = 0;
    if (Q && Q.t > 0) {
      if (!red) S.trauma = Math.max(S.trauma, 0.8);
      var amp = X.T.quake ? X.T.quake.amp * W.g : 1;
      rollTo = amp > 0 ? Math.max(-1, Math.min(1, Q.gx / amp)) * 0.8 : 0;
    }
    S.trauma = Math.max(0, S.trauma - k * 1.1);
    if (red) S.trauma = 0;

    // the shake: a stiff spring that rings down in about a quarter of a second, plus the rumble; hits and rumbles shake
    // nothing while a ball is in a flipper's approach zone (the player's own nudge always does)
    var sh = S.sh;
    if (red) { sh.x = sh.y = sh.vx = sh.vy = 0; }
    else {
      var n = Math.max(1, Math.ceil(dt / 8)), h = k / n;
      for (i = 0; i < n; i++) {
        sh.vx += (-1100 * sh.x - 22 * sh.vx) * h; sh.vy += (-1100 * sh.y - 22 * sh.vy) * h;
        sh.x += sh.vx * h; sh.y += sh.vy * h;
      }
      if (appr && !nudged) { sh.x = sh.y = sh.vx = sh.vy = 0; }
      sh.x = Math.max(-1.5, Math.min(1.5, sh.x)); sh.y = Math.max(-1.5, Math.min(1.5, sh.y));
      if (Math.abs(sh.x) + Math.abs(sh.y) + (Math.abs(sh.vx) + Math.abs(sh.vy)) * 0.01 < 0.005) sh.x = sh.y = sh.vx = sh.vy = 0;
    }
    var rum = red || (appr && !nudged) ? 0 : S.trauma * S.trauma * 0.9, ct = S.clock / 1000;
    state.shake.x = Math.max(-1.5, Math.min(1.5, sh.x + rum * (Math.sin(ct * 71) * 0.6 + Math.sin(ct * 113 + 1.3) * 0.4)));
    state.shake.y = Math.max(-1.5, Math.min(1.5, sh.y + rum * (Math.sin(ct * 83 + 0.7) * 0.6 + Math.sin(ct * 127 + 2.1) * 0.4)));

    // TABLE MOVEMENT: springs, pushed by the big moments, leaning with the ash's swell and the quake; only while quiet,
    // and settling hard to level the moment it isn't
    var calm = !red && S.quiet, tm = S.tm, holdTo = { pitch: 0.5 * ashK, dy: 1.4 * ashK, roll: rollTo };
    ['pitch', 'dy', 'roll'].forEach(function (key) {
      var sp = tm[key], to = calm ? holdTo[key] : 0, w = calm ? 12 : 32, z = calm ? 0.45 : 1;
      var nn = Math.max(1, Math.ceil(dt / 8)), hh = k / nn;
      for (var q = 0; q < nn; q++) { sp.v += (-w * w * (sp.x - to) - 2 * z * w * sp.v) * hh; sp.x += sp.v * hh; }
      if (!calm) { sp.x *= Math.exp(-dt / 40); if (Math.abs(sp.x) < 0.01) { sp.x = 0; sp.v = 0; } }
      sp.x = Math.max(-2 * LIM[key], Math.min(2 * LIM[key], sp.x));
      if (red) { sp.x = 0; sp.v = 0; }
      state.table[key] = LIM[key] * tanh(sp.x / LIM[key]);   // (a soft limit: big pushes round off, never hit a wall)
    });
    state.table.shake = red ? 0 : S.trauma;

    // the final pass's grade: a brief colour fringe, the ash's vignette and grey, the lava's warmth
    S.fringe = Math.max(0, S.fringe - k * 6.5);
    S.warm = Math.max(floodK * 0.35, ashK * 0.2, S.warm - k * 0.8);   // (wave 3 grade cap: the flood's warmth 0.6 -> 0.35)
    S.satK = Math.max(0, S.satK - k * 0.35); S.vigK = Math.max(0, S.vigK - k * 0.3);
    var post = state.post;
    post.fringe = red ? 0 : S.fringe;
    post.vignette = 0.18 + 0.4 * ashK + S.vigK;
    post.warm = S.warm;
    post.sat = 1 - 0.4 * ashK + 0.2 * floodK + S.satK;
    post.ash = ashK;

    // the pops rise, swell and fade
    var pops = state.pops;
    for (i = pops.length - 1; i >= 0; i--) {
      var o = pops[i]; o.age += dt;
      var q2 = o.age / o.life;
      if (q2 >= 1) { pops.splice(i, 1); continue; }
      var base = o.big ? 1.6 : 1, sw = o.age < 110 ? 0.5 + 0.8 * (o.age / 110) : 1.3 - 0.3 * Math.min(1, (o.age - 110) / 160);
      o.s = base * sw;
      o.a = o.age < 60 ? o.age / 60 : q2 > 0.65 ? (1 - q2) / 0.35 : 1;
      o.z = o.z0 + (o.big ? 26 : 16) * (1 - Math.pow(1 - q2, 2));
    }
    // the sparks fly, fall on to the table and bounce
    var spk = state.sparks;
    for (i = spk.length - 1; i >= 0; i--) {
      var c = spk[i]; c.age += dt;
      if (c.age >= c.life) { spk.splice(i, 1); continue; }
      var drag = Math.exp(-k * 2.2);
      c.vx *= drag; c.vy *= drag; c.vz -= 520 * k;
      c.x += c.vx * k; c.y += c.vy * k; c.z += c.vz * k;
      if (c.z < 0) { c.z = 0; c.vz = -c.vz * 0.35; c.vx *= 0.7; c.vy *= 0.7; }
      c.a = 1 - Math.pow(c.age / c.life, 1.6);
    }
    return state;
  }
  function smooth(x) { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); }
  function tanh(x) { var e = Math.exp(2 * x); return (e - 1) / (e + 1); }

  var api = {
    events: events, update: update, state: state, SHOWS: SHOWS, LOOKS: LOOKS, FX: FXD,
    reduce: null,   // null: follow the site's Reduce motion / the system setting; true or false to force it (tests)
    gpu: false,     // true once the renderer draws PinParticles: CPU sparks then go to state.bursts as 'sparks'
    quiet: null,    // (tests) a function (W) -> bool standing in for PinCam.quiet
    reset: function () { adopt(null); S.fountains = 0; S.clock = 0; S.last = -1; S.flashAt = -1e9; S.nudgeAt = -1e9; state.gi = 1; },
    show: function (name, x, y) { if (!X) X = ctxFor(E.DEFAULT || 'orbit'); return startShow(name, { x: x == null ? X.MID : x, y: y == null ? X.TH / 2 : y }); },   // start a show by name
    debug: function () { return { clock: S.clock, shows: S.shows.map(function (s) { return s.name; }), flashAt: S.flashAt, quiet: S.quiet, trauma: S.trauma, table: X && X.id, fountains: S.fountains, seam: S.seamAt >= 0 }; },
    FLASH_GAP: FLASH_GAP, FLASH_MAX: FLASH_MAX, GI_MAX: GI_MAX,
    version: 2
  };
  return api;
});
