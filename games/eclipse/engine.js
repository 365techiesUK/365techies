/* 365 Eclipse - the rules (4 Oct 2026; rebuilt 5 Oct 2026). Our own vertical-scrolling jet shooter. Owner, 5 Oct: "make
 * the 365 Eclipse game more like ... Raiden Fighters Jet ... much better graphics ... a Sega arcade game type standard
 * ... multiple levels". Ideas from that kind of arcade game - every name, picture and sound here is our own.
 * No drawing here (eclipse.js and world3d.js draw it), so the tests run it in node. 60 steps a second; the game's own
 * pixels on a 240 x 320 screen, y down.
 *
 *  Firing    only while you press fire (Space, the mouse button or Fire), shot by shot; a quick tap fires sooner than
 *            holding. Owner, 5 Oct: "I don't like the shooting all the time ... different bonuses, different rockets
 *            and different fire ... a bit like Galaxians".
 *  Pods      lettered pods. GUNS (square): V Vulcan, S Spread, L Laser (goes on through), T Thunder (bends to its
 *            target) - the same letter again powers the gun up (to 4); another letter swaps guns and keeps the power.
 *            ROCKETS (round), fired alongside the gun: R Rockets (a blast where they hit), H Homing, C Cluster (bursts
 *            into a ring of blasts). BONUSES (six-sided): B Bomb, + Shield, W Wingman, x2 double points for 20 s.
 *            Shoot down a whole flight of planes and the last one leaves a pod.
 *  Fighters  Swift (the quickest; Vulcan), Striker (all-round; Spread and Rockets), Titan (slow, with a shield;
 *            Laser), Wraith (Thunder and Homing).
 *  Bombs     the second button: a carpet of blasts that clears the bullets. Up to 7.
 *  Wingmen   W pods: up to two small jets that fly with you and fire when you do (lost if you are hit).
 *  Medals    ground targets leave medals; catch them one after another and each is worth more (100 up to 10,000);
 *            miss one and the value starts again.
 *  Bonuses   QUICK KILL (shot down before it fires), GRAZE (a bullet passing close), and at the end of each stage
 *            the share of enemies destroyed and medals caught.
 *  Stages    HARBOUR, CITY, DESERT BASE, ABOVE THE CLOUDS, ARCTIC SEA, CANYON FORTRESS, ECLIPSE - a mid-boss and a
 *            boss in each (the bosses' guns can be shot off first) - then round again, faster.
 * The game reports what happened in world.events (sounds, {say}) and world.fx (where, for the picture). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.EclEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var WIDTH = 240, HEIGHT = 320;
  var DIFF = {
    1: { name: 'Gentle', lives: 5, shield: 2, bspd: 0.62, brate: 0.55, ehp: 0.85, inv: 150 },
    2: { name: 'Classic', lives: 3, shield: 0, bspd: 0.85, brate: 0.85, ehp: 1, inv: 120 },
    3: { name: 'Fast', lives: 3, shield: 0, bspd: 1.08, brate: 1.1, ehp: 1.12, inv: 110 }
  };
  var SHIPS = {
    swift: { name: 'Swift', speed: 2.9, bombs: 2, gun: 'V', rk: null, shield: 0 },
    striker: { name: 'Striker', speed: 2.4, bombs: 2, gun: 'S', rk: 'R', shield: 0 },
    titan: { name: 'Titan', speed: 1.95, bombs: 3, gun: 'L', rk: null, shield: 1 },
    wraith: { name: 'Wraith', speed: 2.6, bombs: 2, gun: 'T', rk: 'H', shield: 0 }
  };
  // the pods. A P in a drop list (and the pod a whole flight leaves) is the next one from a shuffled bag of these
  var GUNS = { V: 'VULCAN', S: 'SPREAD', L: 'LASER', T: 'THUNDER' };
  var RKTS = { R: 'ROCKETS', H: 'HOMING', C: 'CLUSTER' };
  var BONUS = { B: 'BOMB', D: 'SHIELD', W: 'WINGMAN', X: 'DOUBLE SCORE' };
  var BAG = ['V', 'S', 'L', 'T', 'S', 'L', 'T', 'R', 'H', 'C', 'R', 'H', 'C', 'D', 'X', 'B'];
  var FLIGHTS = { vee: 1, line: 1, swoop: 1, drones: 1, inters: 1, behind: 1 };   // formations that count as a flight
  var MEDALS = [100, 200, 400, 800, 1600, 3200, 6400, 10000];
  var HIT_R = 2.4, GRAZE_R = 11, EXTRA_EVERY = 500000, MAXLV = 4, X2_TIME = 1200;
  // what each enemy is: hit points, size, points, how it shoots, what it leaves. air / ground (ground and sea ride the
  // scrolling land); quick: worth a QUICK KILL bonus; still: stands where it was built
  var TYPES = {
    jet: { hp: 3, r: 7, score: 200, air: 1, quick: 1, fire: { p: 'aim', n: 1, every: 120, speed: 1.8, start: 45 } },
    ace: { hp: 7, r: 8, score: 500, air: 1, quick: 1, fire: { p: 'aim', n: 3, spread: 0.32, every: 85, speed: 1.75, start: 30 } },
    inter: { hp: 4, r: 7, score: 300, air: 1, quick: 1 },
    heli: { hp: 11, r: 10, score: 700, air: 1, quick: 1, fire: { p: 'aim', n: 3, spread: 0.4, every: 72, speed: 1.5, start: 32 } },
    bomber: { hp: 70, r: 20, score: 4000, air: 1, fire: { p: 'ring', n: 12, every: 105, speed: 1.15, start: 55 }, drop: 'MM' },
    carrier: { hp: 30, r: 15, score: 1500, air: 1 },
    gunship: { hp: 90, r: 19, score: 5000, air: 1, fire: { p: 'fan', n: 7, spread: 1.0, every: 82, speed: 1.35, start: 40 }, drop: 'PM' },
    drone: { hp: 2, r: 6, score: 150, air: 1, quick: 1, fire: { p: 'aim', n: 1, every: 150, speed: 1.6, start: 70 } },
    rocket: { hp: 1, r: 4, score: 100, air: 1 },
    tank: { hp: 8, r: 9, score: 500, ground: 1, turret: 1, quick: 1, fire: { p: 'aim', n: 1, every: 105, speed: 1.5, start: 28 } },
    aa: { hp: 10, r: 9, score: 600, ground: 1, turret: 1, still: 1, fire: { p: 'burst', n: 3, every: 95, speed: 1.9, start: 24 } },
    sam: { hp: 12, r: 9, score: 800, ground: 1, still: 1, fire: { p: 'rocket', every: 160, start: 40 } },
    truck: { hp: 4, r: 7, score: 300, ground: 1, drop: 'M' },
    bldg: { hp: 14, r: 12, score: 1000, ground: 1, still: 1, drop: 'M' },
    hangar: { hp: 26, r: 16, score: 2000, ground: 1, still: 1, drop: 'MP' },
    bunker: { hp: 16, r: 10, score: 900, ground: 1, still: 1, turret: 1, fire: { p: 'fan', n: 3, spread: 0.5, every: 98, speed: 1.4, start: 30 }, drop: 'M' },
    boat: { hp: 8, r: 9, score: 600, ground: 1, sea: 1, turret: 1, quick: 1, fire: { p: 'aim', n: 2, spread: 0.2, every: 95, speed: 1.6, start: 30 } },
    destroyer: { hp: 75, r: 20, score: 5000, ground: 1, sea: 1, turret: 1, fire: { p: 'fan', n: 5, spread: 0.8, every: 90, speed: 1.4, start: 40 }, drop: 'MMP' },
    sub: { hp: 22, r: 12, score: 2000, ground: 1, sea: 1, fire: { p: 'ring', n: 10, every: 125, speed: 1.15, start: 62 }, drop: 'M' },
    car: { hp: 10, r: 10, score: 800, ground: 1, drop: 'M' },
    loco: { hp: 22, r: 11, score: 1500, ground: 1, turret: 1, fire: { p: 'aim', n: 3, spread: 0.3, every: 82, speed: 1.6, start: 22 }, drop: 'M' },
    pod: { hp: 14, r: 10, score: 900, ground: 1, still: 1, turret: 1, fire: { p: 'aim', n: 2, spread: 0.25, every: 88, speed: 1.7, start: 26 }, drop: 'M' },
    mid: { hp: 380, r: 24, score: 20000, air: 1, fire: { p: 'mid' }, drop: 'PBMMM' }
  };

  function rngOf(seed) {
    var a = seed >>> 0;
    return function () { a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function fx(W, o) { if (W.fx.length >= 500) W.fx.shift(); W.fx.push(o); }
  function ev(W, o) { W.events.push(o); }
  function say(W, s) { W.events.push({ say: s }); }
  function cap(s) { return s.charAt(0) + s.slice(1).toLowerCase(); }

  // ---------------------------------------------------------------- the stages
  // A script entry: [step, formation, settings]. The land is the picture's business (world3d.js draws each stage's
  // ground to match these places): HARBOUR has the town and docks on the left and the sea on the right, then open sea;
  // CITY, DESERT BASE and CANYON FORTRESS are land (the canyon's river runs down the middle); ABOVE THE CLOUDS and
  // ECLIPSE have no ground (ground guns there ride on station girders); ARCTIC SEA is sea with ice.
  var STAGES = [
    { id: 'harbour', name: 'HARBOUR', scroll: 0.55, mid: 'gunboat', boss: 'leviathan', script: [
      [40, 'vee', { x: 120 }], [120, 'tanks', { xs: [30, 60], dir: 'down' }], [160, 'bldgs', { xs: [24, 62] }], [230, 'boats', { xs: [150, 200] }],
      [300, 'line', { x: 180, n: 5 }], [340, 'convoy', { x: 46, n: 4, dir: 'up' }], [420, 'aa', { xs: [30, 70] }], [470, 'swoop', { side: -1 }],
      [520, 'carrier', { side: 1, drop: 'P' }], [560, 'bldgs', { xs: [20, 50, 78], kind: 'hangar' }], [640, 'helis', { xs: [70, 170] }], [700, 'boats', { xs: [130, 170, 210] }],
      [780, 'vee', { x: 80 }], [840, 'tanks', { xs: [26, 56, 86], dir: 'down' }], [900, 'swoop', { side: 1 }], [960, 'destroyer', { x: 175 }],
      [1060, 'inters', { n: 4 }], [1120, 'bldgs', { xs: [30, 64] }], [1180, 'line', { x: 60, n: 6 }], [1260, 'mid', {}],
      [1300, 'boats', { xs: [140, 200] }], [1360, 'aa', { xs: [24, 60, 92] }], [1420, 'vee', { x: 160 }], [1500, 'carrier', { side: -1, drop: 'W' }],
      [1560, 'helis', { xs: [50, 120, 190] }], [1660, 'destroyer', { x: 150 }], [1700, 'convoy', { x: 50, n: 5, dir: 'down' }], [1780, 'swoop', { side: -1 }],
      [1840, 'subs', { xs: [120, 200] }], [1920, 'line', { x: 120, n: 7 }], [2000, 'bldgs', { xs: [20, 46, 72], kind: 'hangar' }], [2080, 'carrier', { side: 1, drop: 'B' }],
      [2140, 'inters', { n: 5 }], [2220, 'boats', { xs: [80, 130, 180, 220] }], [2300, 'vee', { x: 120 }], [2440, 'boss', {}]
    ] },
    { id: 'city', name: 'CITY', scroll: 0.6, mid: 'bigheli', boss: 'thunderhead', night: 1, script: [
      [40, 'line', { x: 60, n: 5 }], [80, 'line', { x: 180, n: 5 }], [160, 'tanks', { xs: [60, 180], dir: 'up' }], [220, 'aa', { xs: [100, 140] }],
      [300, 'vee', { x: 120 }], [360, 'bldgs', { xs: [30, 100, 210] }], [420, 'train', { cars: 4, dir: 1 }], [520, 'helis', { xs: [60, 180] }],
      [580, 'carrier', { side: -1, drop: 'P' }], [640, 'tanks', { xs: [60, 60, 180, 180], dir: 'down' }], [700, 'swoop', { side: 1 }], [760, 'aa', { xs: [20, 120, 220] }],
      [840, 'inters', { n: 5 }], [900, 'bldgs', { xs: [100, 140], kind: 'hangar' }], [960, 'vee', { x: 60 }], [1000, 'vee', { x: 180 }],
      [1080, 'aces', { n: 3 }], [1180, 'mid', {}], [1220, 'convoy', { x: 180, n: 5, dir: 'up' }], [1300, 'helis', { xs: [40, 120, 200] }],
      [1380, 'train', { cars: 5, dir: -1 }], [1460, 'carrier', { side: 1, drop: 'W' }], [1520, 'swoop', { side: -1 }], [1560, 'bldgs', { xs: [24, 216] }],
      [1640, 'tanks', { xs: [60, 180], dir: 'up' }], [1700, 'line', { x: 120, n: 8 }], [1800, 'aa', { xs: [60, 120, 180] }], [1880, 'aces', { n: 4 }],
      [1980, 'carrier', { side: -1, drop: 'B' }], [2040, 'helis', { xs: [80, 160] }], [2120, 'vee', { x: 120 }], [2260, 'boss', {}]
    ] },
    { id: 'desert', name: 'DESERT BASE', scroll: 0.62, mid: 'bigtank', boss: 'colossus', script: [
      [40, 'vee', { x: 120 }], [110, 'sam', { xs: [40, 200] }], [160, 'hangars', { xs: [60, 180] }], [240, 'tanks', { xs: [100, 140], dir: 'down' }],
      [300, 'swoop', { side: -1 }], [360, 'bldgs', { xs: [30, 210], kind: 'parked' }], [420, 'convoy', { x: 120, n: 6, dir: 'down' }], [480, 'helis', { xs: [60, 180] }],
      [560, 'carrier', { side: 1, drop: 'P' }], [600, 'sam', { xs: [24, 120, 216] }], [680, 'bunkers', { xs: [50, 190] }], [740, 'inters', { n: 5 }],
      [820, 'bldgs', { xs: [40, 80, 160, 200], kind: 'parked' }], [900, 'line', { x: 60, n: 6 }], [940, 'line', { x: 180, n: 6 }], [1020, 'tanks', { xs: [40, 80, 160, 200], dir: 'up' }],
      [1120, 'mid', {}], [1160, 'aces', { n: 3 }], [1240, 'hangars', { xs: [40, 200] }], [1300, 'carrier', { side: -1, drop: 'W' }],
      [1360, 'bunkers', { xs: [80, 160] }], [1420, 'vee', { x: 120 }], [1480, 'sam', { xs: [60, 180] }], [1560, 'helis', { xs: [40, 120, 200] }],
      [1660, 'convoy', { x: 60, n: 5, dir: 'up' }], [1700, 'convoy', { x: 180, n: 5, dir: 'down' }], [1800, 'bomber', { x: 120 }], [1900, 'carrier', { side: 1, drop: 'B' }],
      [1960, 'inters', { n: 6 }], [2060, 'bldgs', { xs: [30, 70, 170, 210], kind: 'parked' }], [2120, 'aces', { n: 4 }], [2280, 'boss', {}]
    ] },
    { id: 'sky', name: 'ABOVE THE CLOUDS', scroll: 0.9, mid: 'gunship', boss: 'stormcrow', air: 1, script: [
      [40, 'vee', { x: 120 }], [100, 'line', { x: 40, n: 6 }], [140, 'line', { x: 200, n: 6 }], [240, 'bomber', { x: 80 }],
      [320, 'swoop', { side: 1 }], [360, 'swoop', { side: -1 }], [440, 'carrier', { side: -1, drop: 'P' }], [480, 'aces', { n: 3 }],
      [580, 'behind', { n: 4 }], [660, 'gunship', { x: 160 }], [760, 'inters', { n: 6 }], [840, 'vee', { x: 60 }], [880, 'vee', { x: 180 }],
      [960, 'bomber', { x: 170 }], [1060, 'behind', { n: 5 }], [1140, 'mid', {}], [1180, 'aces', { n: 4 }], [1260, 'carrier', { side: 1, drop: 'W' }],
      [1320, 'line', { x: 120, n: 8 }], [1420, 'gunship', { x: 70 }], [1500, 'swoop', { side: -1 }], [1540, 'swoop', { side: 1 }],
      [1620, 'behind', { n: 6 }], [1700, 'bomber', { x: 120 }], [1820, 'carrier', { side: -1, drop: 'B' }], [1880, 'inters', { n: 7 }],
      [1980, 'aces', { n: 5 }], [2120, 'boss', {}]
    ] },
    { id: 'arctic', name: 'ARCTIC SEA', scroll: 0.5, mid: 'icebreaker', boss: 'kraken', script: [
      [40, 'line', { x: 120, n: 6 }], [120, 'boats', { xs: [60, 180] }], [200, 'subs', { xs: [80, 160] }], [280, 'vee', { x: 60 }],
      [320, 'vee', { x: 180 }], [400, 'bunkers', { xs: [24, 216] }], [460, 'carrier', { side: 1, drop: 'P' }], [520, 'helis', { xs: [60, 120, 180] }],
      [620, 'destroyer', { x: 70 }], [700, 'subs', { xs: [40, 120, 200] }], [780, 'swoop', { side: 1 }], [840, 'boats', { xs: [40, 100, 160, 220] }],
      [920, 'inters', { n: 5 }], [1000, 'aces', { n: 3 }], [1100, 'mid', {}], [1140, 'subs', { xs: [60, 180] }], [1220, 'carrier', { side: -1, drop: 'W' }],
      [1300, 'destroyer', { x: 170 }], [1380, 'line', { x: 60, n: 7 }], [1460, 'bunkers', { xs: [20, 120, 220] }], [1540, 'helis', { xs: [40, 200] }],
      [1620, 'subs', { xs: [100, 140] }], [1700, 'carrier', { side: 1, drop: 'B' }], [1760, 'boats', { xs: [60, 120, 180] }], [1840, 'aces', { n: 4 }],
      [1940, 'destroyer', { x: 120 }], [2100, 'boss', {}]
    ] },
    { id: 'canyon', name: 'CANYON FORTRESS', scroll: 0.66, mid: 'railgun', boss: 'citadel', script: [
      [40, 'vee', { x: 120 }], [100, 'bunkers', { xs: [30, 210] }], [160, 'boats', { xs: [110, 130] }], [240, 'helis', { xs: [70, 170] }],
      [320, 'aa', { xs: [26, 214] }], [380, 'sam', { xs: [44, 196] }], [440, 'line', { x: 120, n: 7 }], [520, 'carrier', { side: -1, drop: 'P' }],
      [580, 'tanks', { xs: [40, 200], dir: 'down' }], [640, 'swoop', { side: 1 }], [700, 'bunkers', { xs: [24, 60, 180, 216] }], [780, 'inters', { n: 6 }],
      [860, 'train', { cars: 5, dir: 1 }], [940, 'aces', { n: 3 }], [1040, 'mid', {}], [1080, 'sam', { xs: [30, 120, 210] }], [1160, 'carrier', { side: 1, drop: 'W' }],
      [1220, 'helis', { xs: [40, 120, 200] }], [1300, 'boats', { xs: [100, 120, 140] }], [1380, 'bunkers', { xs: [30, 70, 170, 210] }], [1460, 'behind', { n: 5 }],
      [1540, 'aa', { xs: [24, 60, 180, 216] }], [1620, 'carrier', { side: -1, drop: 'B' }], [1680, 'aces', { n: 4 }], [1760, 'bomber', { x: 120 }],
      [1860, 'tanks', { xs: [30, 60, 180, 210], dir: 'up' }], [2000, 'boss', {}]
    ] },
    { id: 'orbit', name: 'ECLIPSE', scroll: 0.8, mid: 'satellite', boss: 'eclipse', air: 1, script: [
      [40, 'drones', { x: 60 }], [80, 'drones', { x: 180 }], [160, 'pods', { xs: [40, 200] }], [240, 'vee', { x: 120 }],
      [300, 'swoop', { side: -1 }], [340, 'swoop', { side: 1 }], [420, 'carrier', { side: 1, drop: 'P' }], [480, 'pods', { xs: [30, 90, 150, 210] }],
      [560, 'drones', { x: 120 }], [620, 'aces', { n: 4 }], [700, 'gunship', { x: 120 }], [800, 'behind', { n: 6 }], [880, 'drones', { x: 40 }],
      [900, 'drones', { x: 200 }], [980, 'inters', { n: 7 }], [1060, 'mid', {}], [1100, 'pods', { xs: [50, 190] }], [1160, 'carrier', { side: -1, drop: 'W' }],
      [1240, 'aces', { n: 5 }], [1320, 'drones', { x: 120 }], [1360, 'gunship', { x: 60 }], [1400, 'gunship', { x: 180 }], [1500, 'carrier', { side: 1, drop: 'B' }],
      [1560, 'behind', { n: 7 }], [1640, 'pods', { xs: [20, 70, 120, 170, 220] }], [1740, 'aces', { n: 6 }], [1900, 'boss', {}]
    ] }
  ];

  // ---------------------------------------------------------------- a new game
  function newWorld(diff, seed, ship) {
    diff = DIFF[diff] ? diff : 1;
    ship = SHIPS[ship] ? ship : 'striker';
    var d = DIFF[diff], sh = SHIPS[ship];
    var W = {
      diff: diff, d: d, shipId: ship, ship: sh, rng: rngOf(seed == null ? (Date.now() ^ (Math.random() * 1e9)) : seed),
      score: 0, lives: d.lives, frame: 0, events: [], fx: [], over: false, loop: 0, stageIdx: -1, stageNo: 0, nextExtra: EXTRA_EVERY,
      p: { x: WIDTH / 2, y: HEIGHT - 44, inv: 0, shield: d.shield + sh.shield, gun: sh.gun, glv: 1, rk: sh.rk, rlv: sh.rk ? 1 : 0, bombs: sh.bombs, dead: 0,
           fireT: 0, cad: 8, rkT: 0, rside: 1, x2: 0, vx: 0, vy: 0, wing: [] },
      bag: [], flights: {},
      shots: [], enemies: [], bullets: [], items: [], beams: [], marks: [],
      medal: 0, graze: 0, clock: 0, si: 0, dist: 0, vs: 0, phase: 'intro', phaseT: 150, boss: null, mid: null,
      bombT: 0, bombX: 0, bombY: 0, freeze: 0, deaths: 0, stageDeaths: 0, touchAnchor: null, id: 0, st: null
    };
    nextStage(W);
    return W;
  }
  function nextStage(W) {
    W.stageIdx++;
    if (W.stageIdx >= STAGES.length) { W.stageIdx = 0; W.loop++; say(W, 'Round ' + (W.loop + 1) + ' - faster!'); }
    W.stageNo++;
    var S = STAGES[W.stageIdx];
    W.stage = S; W.clock = 0; W.si = 0; W.boss = null; W.mid = null; W.stageDeaths = 0; W.vs = S.scroll; W.dist = 0;
    W.enemies = []; W.bullets = []; W.beams = []; W.items = []; W.marks = []; W.flights = {};
    W.st = { foes: 0, killed: 0, medals: 0, caught: 0, quick: 0 };
    W.phase = 'intro'; W.phaseT = 150;
    ev(W, { sfx: 'stage' }); say(W, 'Stage ' + W.stageNo + ': ' + cap(S.name));
    fx(W, { k: 'stage', n: W.stageNo, name: S.name, id: S.id });
  }
  function speedMul(W) { return W.d.bspd * (1 + 0.14 * W.loop); }
  function rateMul(W) { return W.d.brate * (1 + 0.12 * W.loop); }

  // ---------------------------------------------------------------- spawning
  function spawn(W, type, x, y, mv, extra) {
    var T = TYPES[type], hp = Math.ceil(T.hp * W.d.ehp * (1 + 0.25 * W.loop));
    var e = { id: ++W.id, type: type, x: x, y: y, hp: hp, max: hp, r: T.r, t: 0, mv: mv || { m: T.ground ? 'scroll' : 'down', vy: 1 }, fireT: 0, flash: 0, spin: 0,
              vx: 0, vy: 0, ang: Math.PI / 2, tur: Math.PI / 2, fired: false, seen: -1, ground: !!T.ground, sea: !!T.sea };
    if (extra) for (var k in extra) e[k] = extra[k];
    if (type !== 'rocket') W.st.foes++;
    if (T.drop && T.drop.indexOf('M') >= 0) W.st.medals += T.drop.split('M').length - 1;
    W.enemies.push(e);
    return e;
  }
  var HEAD = { down: Math.PI / 2, up: -Math.PI / 2, right: 0, left: Math.PI };
  var FORM = {
    // in the air
    vee: function (W, a) { var off = [0, -1, 1, -2, 2]; for (var i = 0; i < 5; i++) spawn(W, 'jet', a.x + off[i] * 20, -14 - Math.abs(off[i]) * 14, { m: 'swoop', vy: 1.6, turn: 85 + Math.abs(off[i]) * 6, dir: off[i] < 0 ? -1 : off[i] > 0 ? 1 : (W.rng() < 0.5 ? -1 : 1) }); },
    line: function (W, a) { for (var i = 0; i < a.n; i++) spawn(W, 'jet', a.x, -12 - i * 20, { m: 'sine', x0: a.x, amp: 30, f: 0.04, vy: 1.3, ph: i * 0.5 }); },
    swoop: function (W, a) { for (var i = 0; i < 6; i++) spawn(W, 'jet', a.side < 0 ? -14 - i * 16 : WIDTH + 14 + i * 16, 40 + i * 6, { m: 'arc', vx: -a.side * 1.9, vy: 0.25, curl: a.side * 0.012 }); },
    behind: function (W, a) { for (var i = 0; i < a.n; i++) spawn(W, 'jet', 30 + (i * 53) % 180, HEIGHT + 20 + i * 26, { m: 'up', vy: -2.3 - (i % 2) * 0.3 }, { fromBehind: true }); fx(W, { k: 'warn6' }); },
    inters: function (W, a) { for (var i = 0; i < a.n; i++) spawn(W, 'inter', 24 + W.rng() * 192, -12 - i * 22, { m: 'dive', wait: 22 + i * 12 }); },
    aces: function (W, a) { for (var i = 0; i < a.n; i++) spawn(W, 'ace', 40 + i * (160 / Math.max(1, a.n - 1)), -16 - i * 12, { m: 'stop', tx: 40 + i * (160 / Math.max(1, a.n - 1)), ty: 48 + (i % 2) * 24, hold: 170, out: i % 2 ? 1 : -1 }); },
    helis: function (W, a) { a.xs.forEach(function (x, i) { spawn(W, 'heli', x, -18 - i * 10, { m: 'hover', tx: x, ty: 56 + (i % 2) * 26, hold: 300 }); }); },
    bomber: function (W, a) { spawn(W, 'bomber', a.x, -30, { m: 'down', vy: 0.42 }); },
    gunship: function (W, a) { spawn(W, 'gunship', a.x, -26, { m: 'stop', tx: a.x, ty: 72, hold: 420, out: 1 }); },
    carrier: function (W, a) { spawn(W, 'carrier', a.side < 0 ? -24 : WIDTH + 24, 60 + W.rng() * 40, { m: 'cross', vx: (a.side < 0 ? 1 : -1) * 0.75 }, { carry: a.drop || 'P' }); },
    drones: function (W, a) { for (var i = 0; i < 8; i++) spawn(W, 'drone', a.x, -10 - i * 14, { m: 'loop', x0: a.x, vy: 1.1, ph: i * 0.6, r: 34 }); },
    // on the ground and the sea (they scroll with the land)
    tanks: function (W, a) { a.xs.forEach(function (x, i) { var h = HEAD[a.dir] || HEAD.down; spawn(W, 'tank', x, -14 - i * 18, { m: 'drive', v: 0.35, ang: h }, { ang: h }); }); },
    convoy: function (W, a) { var h = HEAD[a.dir] || HEAD.down; for (var i = 0; i < a.n; i++) spawn(W, 'truck', a.x, (a.dir === 'up' ? -14 : -14 - (a.n - 1) * 16) + i * 16 * (a.dir === 'up' ? -1 : 1), { m: 'drive', v: 0.6, ang: h }, { ang: h }); },
    aa: function (W, a) { a.xs.forEach(function (x) { spawn(W, 'aa', x, -14, { m: 'scroll' }); }); },
    sam: function (W, a) { a.xs.forEach(function (x) { spawn(W, 'sam', x, -14, { m: 'scroll' }); }); },
    bldgs: function (W, a) { a.xs.forEach(function (x, i) { spawn(W, a.kind === 'hangar' ? 'hangar' : 'bldg', x, -18 - (i % 2) * 22, { m: 'scroll' }, { look: a.kind === 'parked' ? 'parked' : a.kind || W.stage.id }); }); },
    hangars: function (W, a) { a.xs.forEach(function (x) { spawn(W, 'hangar', x, -22, { m: 'scroll' }, { look: 'hangar' }); }); },
    bunkers: function (W, a) { a.xs.forEach(function (x) { spawn(W, 'bunker', x, -14, { m: 'scroll' }); }); },
    boats: function (W, a) { a.xs.forEach(function (x, i) { spawn(W, 'boat', x, -16 - i * 14, { m: 'drive', v: -0.9, ang: HEAD.up }, { ang: HEAD.up }); }); },
    destroyer: function (W, a) { spawn(W, 'destroyer', a.x, -40, { m: 'drive', v: -0.15, ang: HEAD.up }, { ang: HEAD.up, guns: [{ dy: -12, tur: HEAD.down }, { dy: 12, tur: HEAD.down }] }); },
    subs: function (W, a) { a.xs.forEach(function (x, i) { spawn(W, 'sub', x, 40 + i * 30, { m: 'sub' }, { under: true, ang: HEAD.up }); }); },
    train: function (W, a) {   // a train crossing on its track (the track is a mark on the ground, drawn by the picture)
      var y = -20, dir = a.dir || 1, x0 = dir > 0 ? -24 : WIDTH + 24;
      W.marks.push({ k: 'rail', y: y, at: W.dist });
      spawn(W, 'loco', x0, y, { m: 'drive', v: 0.85, ang: dir > 0 ? 0 : Math.PI }, { ang: dir > 0 ? 0 : Math.PI });
      for (var i = 1; i <= a.cars; i++) spawn(W, 'car', x0 - dir * i * 26, y, { m: 'drive', v: 0.85, ang: dir > 0 ? 0 : Math.PI }, { ang: dir > 0 ? 0 : Math.PI });
    },
    pods: function (W, a) { a.xs.forEach(function (x, i) { spawn(W, 'pod', x, -14 - (i % 2) * 16, { m: 'scroll' }); }); },
    mid: function (W) {
      var S = W.stage, sea = S.mid === 'gunboat' || S.mid === 'icebreaker', grd = S.mid === 'bigtank' || S.mid === 'railgun';
      W.mid = spawn(W, 'mid', 120, -34, sea || grd ? { m: 'drive', v: sea ? -0.2 : 0.05, ang: sea ? HEAD.up : HEAD.down, stopAt: sea ? 90 : 70 } : { m: 'stop', tx: 120, ty: 76, hold: 1500, out: -1 },
        { look: S.mid, sway: !(sea || grd), ground: sea || grd, sea: sea, ang: sea ? HEAD.up : HEAD.down });
      ev(W, { sfx: 'warning' }); say(W, 'Watch out - a big one!'); fx(W, { k: 'warn', text: 'DANGER' });
    },
    boss: function (W) { makeBoss(W, W.stage.boss); }
  };

  // ---------------------------------------------------------------- the bosses: guns you can shoot off, and a core
  // part: [id, dx, dy, r, hp, fire, core]. The picture (world3d.js) builds each boss with its guns at these places.
  var BOSSES = {
    leviathan: { name: 'LEVIATHAN', sea: 1, y: 92, parts: [
      ['g1', -26, -46, 9, 70, { p: 'aim', n: 3, spread: 0.32, every: 70, speed: 1.6 }], ['g2', 26, -46, 9, 70, { p: 'aim', n: 3, spread: 0.32, every: 70, speed: 1.6 }],
      ['g3', -26, 30, 9, 70, { p: 'fan', n: 5, spread: 0.9, every: 92, speed: 1.4 }], ['g4', 26, 30, 9, 70, { p: 'fan', n: 5, spread: 0.9, every: 92, speed: 1.4 }],
      ['a1', -30, -8, 7, 40, { p: 'burst', n: 3, every: 80, speed: 1.9 }], ['a2', 30, -8, 7, 40, { p: 'burst', n: 3, every: 80, speed: 1.9 }],
      ['core', 0, -8, 15, 560, { p: 'ring', n: 16, every: 120, speed: 1.15 }, true]] },
    thunderhead: { name: 'THUNDERHEAD', y: 80, parts: [
      ['r1', -46, -10, 11, 80, { p: 'spiral', every: 7, speed: 1.25 }], ['r2', 46, -10, 11, 80, { p: 'spiral', every: 7, speed: 1.25 }],
      ['s1', -22, 24, 8, 50, { p: 'aim', n: 3, spread: 0.3, every: 66, speed: 1.7 }], ['s2', 22, 24, 8, 50, { p: 'aim', n: 3, spread: 0.3, every: 66, speed: 1.7 }],
      ['core', 0, 0, 16, 600, { p: 'fan', n: 9, spread: 1.3, every: 96, speed: 1.3 }, true]] },
    colossus: { name: 'COLOSSUS', ground: 1, y: 96, parts: [
      ['t1', -36, -40, 9, 80, { p: 'aim', n: 2, spread: 0.2, every: 64, speed: 1.7 }], ['t2', 36, -40, 9, 80, { p: 'aim', n: 2, spread: 0.2, every: 64, speed: 1.7 }],
      ['t3', -36, 34, 9, 80, { p: 'aim', n: 2, spread: 0.2, every: 64, speed: 1.7 }], ['t4', 36, 34, 9, 80, { p: 'aim', n: 2, spread: 0.2, every: 64, speed: 1.7 }],
      ['m1', -18, 12, 8, 60, { p: 'rocket', every: 150 }], ['m2', 18, 12, 8, 60, { p: 'rocket', every: 150 }],
      ['core', 0, -14, 16, 640, { p: 'big', n: 3, spread: 0.5, every: 90, speed: 1.3 }, true]] },
    stormcrow: { name: 'STORMCROW', y: 78, parts: [
      ['e1', -70, 6, 8, 60, { p: 'aim', n: 1, every: 50, speed: 2 }], ['e2', -46, 2, 8, 60, { p: 'aim', n: 1, every: 50, speed: 2 }], ['e3', -22, -2, 8, 60, { p: 'aim', n: 1, every: 50, speed: 2 }],
      ['e4', 22, -2, 8, 60, { p: 'aim', n: 1, every: 50, speed: 2 }], ['e5', 46, 2, 8, 60, { p: 'aim', n: 1, every: 50, speed: 2 }], ['e6', 70, 6, 8, 60, { p: 'aim', n: 1, every: 50, speed: 2 }],
      ['core', 0, -8, 16, 620, { p: 'ring', n: 18, every: 110, speed: 1.1 }, true]] },
    kraken: { name: 'KRAKEN', sea: 1, y: 96, parts: [
      ['l1', -24, -40, 9, 70, { p: 'rocket', every: 130 }], ['l2', 24, -40, 9, 70, { p: 'rocket', every: 130 }],
      ['d1', -30, 2, 8, 60, { p: 'fan', n: 5, spread: 0.8, every: 86, speed: 1.4 }], ['d2', 30, 2, 8, 60, { p: 'fan', n: 5, spread: 0.8, every: 86, speed: 1.4 }],
      ['d3', -24, 36, 8, 60, { p: 'aim', n: 3, spread: 0.3, every: 70, speed: 1.6 }], ['d4', 24, 36, 8, 60, { p: 'aim', n: 3, spread: 0.3, every: 70, speed: 1.6 }],
      ['core', 0, -4, 16, 660, { p: 'spiral', every: 6, speed: 1.2 }, true]] },
    citadel: { name: 'CITADEL', ground: 1, still: 1, y: 84, parts: [
      ['w1', -80, 20, 9, 80, { p: 'fan', n: 4, spread: 0.6, every: 80, speed: 1.5 }], ['w2', 80, 20, 9, 80, { p: 'fan', n: 4, spread: 0.6, every: 80, speed: 1.5 }],
      ['w3', -52, 36, 9, 80, { p: 'aim', n: 3, spread: 0.3, every: 66, speed: 1.7 }], ['w4', 52, 36, 9, 80, { p: 'aim', n: 3, spread: 0.3, every: 66, speed: 1.7 }],
      ['g1', -28, -14, 10, 90, { p: 'spiral', every: 8, speed: 1.2 }], ['g2', 28, -14, 10, 90, { p: 'spiral', every: 8, speed: 1.2 }],
      ['core', 0, 6, 17, 700, { p: 'beam', every: 200 }, true]] },
    eclipse: { name: 'ECLIPSE', y: 96, parts: [
      ['o1', 0, 0, 9, 70, { p: 'aim', n: 2, spread: 0.25, every: 70, speed: 1.7 }], ['o2', 0, 0, 9, 70, { p: 'aim', n: 2, spread: 0.25, every: 70, speed: 1.7 }],
      ['o3', 0, 0, 9, 70, { p: 'aim', n: 2, spread: 0.25, every: 70, speed: 1.7 }], ['o4', 0, 0, 9, 70, { p: 'aim', n: 2, spread: 0.25, every: 70, speed: 1.7 }],
      ['o5', 0, 0, 9, 70, { p: 'aim', n: 2, spread: 0.25, every: 70, speed: 1.7 }], ['o6', 0, 0, 9, 70, { p: 'aim', n: 2, spread: 0.25, every: 70, speed: 1.7 }],
      ['core', 0, 0, 20, 900, { p: 'spiral', every: 5, speed: 1.2 }, true]] }
  };
  function makeBoss(W, kind) {
    var D = BOSSES[kind], mul = W.d.ehp * (1 + 0.3 * W.loop);
    var B = { kind: kind, name: D.name, x: 120, y: D.sea || D.ground ? -110 : -80, ty: D.y, t: 0, phase: 1, enter: 190, dead: 0, parts: [], sea: !!D.sea, ground: !!(D.ground || D.sea), spin: 0 };
    D.parts.forEach(function (q, i) {
      B.parts.push({ id: q[0], dx: q[1], dy: q[2], r: q[3], hp: Math.round(q[4] * mul), max: Math.round(q[4] * mul), fire: q[5], core: !!q[6], alive: true, fireT: 40 + i * 11, flash: 0, x: 0, y: 0, spin: 0, tur: Math.PI / 2 });
    });
    if (D.still) W.vs = 0;   // the fortress: the land stops while you fight it
    W.boss = B;
    ev(W, { sfx: 'warning' }); say(W, 'Warning: ' + cap(B.name) + ' approaching');
    fx(W, { k: 'warn', text: B.name, boss: true });
  }
  function bossStep(W) {
    var B = W.boss, p = W.p;
    B.t++;
    if (B.dead) {
      if (B.dead % 7 === 0) fx(W, { k: 'boom', x: B.x + (W.rng() - 0.5) * 100, y: B.y + (W.rng() - 0.5) * 70, size: 2, ground: B.ground });
      if (--B.dead === 0) { W.boss = null; stageClear(W); }
      return;
    }
    if (B.enter > 0) { B.enter--; B.y += (B.ty - B.y) * 0.035; }
    else if (B.kind === 'leviathan' || B.kind === 'kraken') { B.x = 120 + Math.sin(B.t / 150) * 30; B.y = B.ty + Math.sin(B.t / 97) * 6; }
    else if (B.kind === 'colossus') { B.x = 120 + Math.sin(B.t / 180) * 26; B.y = B.ty + Math.sin(B.t / 120) * 10; }
    else if (B.kind === 'citadel') { B.x = 120; B.y = B.ty; }
    else if (B.kind === 'eclipse') { B.x = 120 + Math.sin(B.t / 170) * 22; B.y = B.ty + Math.cos(B.t / 130) * 12; }
    else { B.x = 120 + Math.sin(B.t / 120) * 46; B.y = B.ty + Math.sin(B.t / 77) * 12; }
    var core = B.parts[B.parts.length - 1], guns = B.parts.some(function (q) { return !q.core && q.alive; });
    if (core.hp < core.max * 0.5 && B.phase === 1) { B.phase = 2; ev(W, { sfx: 'rage' }); say(W, cap(B.name) + ' is angry!'); fx(W, { k: 'rage', x: B.x, y: B.y }); }
    B.spin += B.phase === 2 ? 0.022 : 0.013;
    B.parts.forEach(function (q, i) {
      if (B.kind === 'eclipse' && !q.core) { var a = B.spin + i * Math.PI / 3; q.x = B.x + Math.cos(a) * 58; q.y = B.y + Math.sin(a) * 38; }
      else { q.x = B.x + q.dx; q.y = B.y + q.dy; }
      q.tur = Math.atan2(p.y - q.y, p.x - q.x);
      if (q.flash) q.flash--;
    });
    if (B.enter > 0) return;
    B.parts.forEach(function (q) {
      if (!q.alive || !q.fire) return;
      var f = q.fire;
      if (q.core && guns && B.t % 2) return;   // the core fires half as often while its guns stand
      if (--q.fireT > 0) return;
      var every = (f.every || 60) / rateMul(W) * (B.phase === 2 ? 0.7 : 1);
      if (f.p === 'spiral') {
        q.fireT = Math.max(3, Math.round(every));
        q.spin += B.phase === 2 ? 0.41 : 0.33;
        var arms = B.phase === 2 ? 3 : 2;
        for (var k = 0; k < arms; k++) bullet(W, q.x, q.y, q.spin + k * Math.PI * 2 / arms, f.speed, 'orb');
      } else if (f.p === 'rocket') { q.fireT = Math.round(every); rocket(W, q.x, q.y); if (B.phase === 2) rocket(W, q.x, q.y); }
      else if (f.p === 'beam') { q.fireT = Math.round(every); addBeam(W, q.x, q.y + 14); if (B.phase === 2) { addBeam(W, q.x - 44, q.y + 14); addBeam(W, q.x + 44, q.y + 14); } }
      else { q.fireT = Math.round(every * (0.85 + W.rng() * 0.3)); pattern(W, q.x, q.y, f, B.phase === 2); }
      if (B.phase === 2 && q.core && W.rng() < 0.35 && B.kind !== 'citadel') pattern(W, q.x, q.y, { p: 'ring', n: 14, speed: 1.05 }, false);
    });
  }
  function bossPartHit(W, q, dmg) {
    var B = W.boss;
    if (!q.alive || B.enter > 0 || B.dead) return false;
    var guns = B.parts.some(function (o) { return !o.core && o.alive; });
    q.hp -= dmg * (q.core && guns ? 0.5 : 1); q.flash = 3;
    if (q.hp <= 0) {
      q.alive = false;
      var pts = q.core ? 0 : 5000 * (1 + W.loop);
      addScore(W, pts);
      ev(W, { sfx: q.core ? 'bigboom' : 'boom', x: q.x });
      fx(W, { k: 'boom', x: q.x, y: q.y, size: q.core ? 3 : 2, ground: B.ground, sea: B.sea, part: q.id });
      if (!q.core) { fx(W, { k: 'points', x: q.x, y: q.y, pts: pts }); dropItems(W, q.x, q.y, 'M'); }
      if (!B.parts.some(function (o) { return o.core && o.alive; })) bossDown(W);
    }
    return true;
  }
  function bossDown(W) {
    var B = W.boss, bonus = 100000 * (1 + W.loop);
    B.dead = 160; W.bullets.forEach(function (b) { fx(W, { k: 'pop', x: b.x, y: b.y }); }); W.bullets = []; W.beams = [];
    W.enemies.forEach(function (e) { if (e.type === 'rocket') e.hp = 0; });
    addScore(W, bonus); W.freeze = 26;
    ev(W, { sfx: 'bossdie', x: B.x }); say(W, cap(B.name) + ' destroyed! +' + bonus);
    fx(W, { k: 'bossdie', x: B.x, y: B.y, pts: bonus, ground: B.ground });
  }

  // ---------------------------------------------------------------- enemy fire
  function bullet(W, x, y, ang, speed, kind) {
    if (W.bullets.length > 650) return;
    var s = speed * speedMul(W);
    W.bullets.push({ x: x, y: y, vx: Math.cos(ang) * s, vy: Math.sin(ang) * s, kind: kind || 'orb', r: kind === 'big' ? 4.5 : kind === 'needle' ? 2.2 : 3, t: 0, grazed: false });
  }
  function aimAt(W, x, y) { return Math.atan2(W.p.y - y, W.p.x - x); }
  function pattern(W, x, y, f, angry) {
    var i, a;
    if (f.p === 'aim') { a = aimAt(W, x, y); var n = f.n + (angry ? 2 : 0), sp = (f.spread || 0) + (angry ? 0.2 : 0); for (i = 0; i < n; i++) bullet(W, x, y, a + (n > 1 ? (i / (n - 1) - 0.5) * sp : 0), f.speed, 'needle'); }
    else if (f.p === 'fan') { var m = f.n + (angry ? 2 : 0); for (i = 0; i < m; i++) bullet(W, x, y, Math.PI / 2 + (i / (m - 1) - 0.5) * (f.spread || 1), f.speed, 'orb'); }
    else if (f.p === 'ring') { var k = f.n + (angry ? 6 : 0), off = W.rng() * Math.PI; for (i = 0; i < k; i++) bullet(W, x, y, off + i * Math.PI * 2 / k, f.speed, i % 2 ? 'orb' : 'big'); }
    else if (f.p === 'burst') { a = aimAt(W, x, y); for (i = 0; i < (f.n || 3); i++) W.bullets.length < 650 && W.bullets.push({ x: x - Math.cos(a) * i * 6, y: y - Math.sin(a) * i * 6, vx: Math.cos(a) * f.speed * speedMul(W), vy: Math.sin(a) * f.speed * speedMul(W), kind: 'needle', r: 2.2, t: 0, grazed: false }); }
    else if (f.p === 'big') { a = aimAt(W, x, y); var nb = f.n + (angry ? 2 : 0); for (i = 0; i < nb; i++) bullet(W, x, y, a + (nb > 1 ? (i / (nb - 1) - 0.5) * f.spread : 0), f.speed, 'big'); }
  }
  function rocket(W, x, y) { var e = spawn(W, 'rocket', x, y, { m: 'home' }); e.vx = (W.rng() - 0.5) * 1.2; e.vy = -0.6; e.life = 260; ev(W, { sfx: 'launch', x: x }); }
  function addBeam(W, x, y) { W.beams.push({ x: x, y: y, warn: 60, life: 44, w: 9 }); ev(W, { sfx: 'beamwarn', x: x }); }

  // ---------------------------------------------------------------- the player's weapons
  function shot(W, x, y, ang, sp, dmg, kind, extra) {
    var s = { x: x, y: y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, dmg: dmg, kind: kind };
    if (extra) for (var k in extra) s[k] = extra[k];
    W.shots.push(s); return s;
  }
  var UP = -Math.PI / 2;
  function fire(W, x, y, mini) {   // one round from the gun at (x, y); returns the steps until the next. A wingman fires one small bolt
    var p = W.p, g = p.gun, lv = p.glv, i, n, o;
    if (mini) { shot(W, x, y - 6, UP, 8.5, 1.1, g === 'L' ? 'laser' : g === 'T' ? 'thunder' : 'vulcan', g === 'L' ? { w: 2.4, hit: {} } : g === 'T' ? { life: 60 } : null); return 0; }
    if (g === 'V') {   // VULCAN: quick bolts straight ahead, one more each level (fanning a little at 4)
      n = lv + 1;
      for (i = 0; i < n; i++) { o = i - (n - 1) / 2; shot(W, x + o * 5, y - 9 + Math.abs(o) * 2, UP + (lv >= 4 ? o * 0.06 : 0), 9, 1.9, 'vulcan'); }
      return 7;
    }
    if (g === 'S') {   // SPREAD: a fan that widens
      n = [3, 5, 5, 7][lv - 1]; var sp = [0.34, 0.5, 0.72, 0.92][lv - 1];
      for (i = 0; i < n; i++) shot(W, x, y - 8, UP + (i / (n - 1) - 0.5) * sp, 7.6, 1.6, 'spread');
      return 9;
    }
    if (g === 'L') {   // LASER: long bolts that go on through everything in their way
      n = [1, 2, 2, 3][lv - 1]; var dm = [5, 4.6, 5.6, 4.6][lv - 1], wd = [3.4, 3.4, 5, 5][lv - 1];
      for (i = 0; i < n; i++) shot(W, x + (i - (n - 1) / 2) * 8, y - 12, UP, 10, dm, 'laser', { w: wd, hit: {} });
      return 10;
    }
    // THUNDER: bolts of lightning that bend to the nearest target
    n = lv + 1;
    for (i = 0; i < n; i++) { o = i - (n - 1) / 2; shot(W, x + o * 6, y - 6, UP + o * 0.4, 6.5, 2.6, 'thunder', { life: 70 }); }
    return 12;
  }
  function rockets(W) {   // the rockets go with the gun, while you fire
    var p = W.p, k = p.rk, lv = p.rlv, j;
    if (!k || p.rkT > 0) return;
    if (k === 'R') {   // ROCKETS: straight up, faster and faster, with a blast where they hit
      p.rkT = [24, 22, 20, 18][lv - 1];
      var bl = { blast: 15 + lv * 2, bdmg: 3 };
      if (lv === 1) { p.rside = -p.rside; shot(W, p.x + p.rside * 10, p.y, UP, 2.2, 4, 'rocket', bl); }
      else for (j = 0; j < (lv >= 3 ? 2 : 1); j++) { shot(W, p.x - 10 - j * 7, p.y + j * 4, UP, 2.2, 4, 'rocket', bl); shot(W, p.x + 10 + j * 7, p.y + j * 4, UP, 2.2, 4, 'rocket', bl); }
    } else if (k === 'H') {   // HOMING: missiles that curl round to the nearest enemy
      p.rkT = [30, 26, 26, 22][lv - 1];
      for (j = 0; j < (lv >= 3 ? 4 : 2); j++) shot(W, p.x + (j % 2 ? 9 : -9), p.y + 2, j % 2 ? -0.6 - (j >> 1) * 0.3 : -2.54 + (j >> 1) * 0.3, 2.4, 3.4, 'homing', { life: 150 });
    } else {   // CLUSTER: a shell that bursts into a ring of blasts
      p.rkT = [44, 38, 34, 30][lv - 1];
      shot(W, p.x, p.y - 8, UP, 4.6, 3, 'cluster', { life: 30, n: [5, 6, 8, 10][lv - 1] });
    }
    ev(W, { sfx: 'missile', k: k, x: p.x });
  }
  function nearestTarget(W, x, y) {
    var best = null, bd = 1e9;
    W.enemies.forEach(function (e) { if (e.hp > 0 && e.y > -6 && e.y < HEIGHT && !e.under) { var d = (e.x - x) * (e.x - x) + (e.y - y) * (e.y - y); if (d < bd) { bd = d; best = e; } } });
    if (W.boss && !W.boss.dead && W.boss.enter <= 0) W.boss.parts.forEach(function (q) { if (q.alive) { var d = (q.x - x) * (q.x - x) + (q.y - y) * (q.y - y); if (d < bd) { bd = d; best = q; } } });
    return best;
  }
  function moveShots(W) {
    for (var i = W.shots.length - 1; i >= 0; i--) {
      var s = W.shots[i];
      if (s.kind === 'homing' || s.kind === 'thunder') {
        var tg = nearestTarget(W, s.x, s.y);
        if (tg) { var a = Math.atan2(tg.y - s.y, tg.x - s.x), cur = Math.atan2(s.vy, s.vx), d = Math.atan2(Math.sin(a - cur), Math.cos(a - cur)), turn = s.kind === 'thunder' ? 0.2 : 0.11; cur += clamp(d, -turn, turn); var sp = Math.min(s.kind === 'thunder' ? 8 : 6, Math.hypot(s.vx, s.vy) + 0.3); s.vx = Math.cos(cur) * sp; s.vy = Math.sin(cur) * sp; }
        else s.vy -= 0.25;
      }
      if (s.kind === 'rocket') s.vy = Math.max(-9, s.vy * 1.07);   // a rocket gathers speed
      if (s.life != null && --s.life <= 0) { if (s.kind === 'cluster') burst(W, s); W.shots.splice(i, 1); continue; }
      s.x += s.vx; s.y += s.vy;
      if (s.y < -20 || s.y > HEIGHT + 20 || s.x < -20 || s.x > WIDTH + 20) { W.shots.splice(i, 1); continue; }
      if (shotHits(W, s)) { if (s.blast) blast(W, s); else if (s.kind === 'cluster') burst(W, s); W.shots.splice(i, 1); }
    }
  }
  function blast(W, s) {   // a rocket's blast
    fx(W, { k: 'boom', x: s.x, y: s.y, size: 1, rkt: true }); ev(W, { sfx: 'rkt', x: s.x });
    areaDamage(W, s.x, s.y, s.blast, s.bdmg);
  }
  function burst(W, s) {   // a cluster shell: a ring of small blasts
    for (var i = 0; i < s.n; i++) {
      var a = i * Math.PI * 2 / s.n, bx = s.x + Math.cos(a) * 20, by = s.y + Math.sin(a) * 15;
      fx(W, { k: 'boom', x: bx, y: by, size: 1, rkt: true }); areaDamage(W, bx, by, 11, 2.6);
    }
    ev(W, { sfx: 'cluster', x: s.x });
  }
  function areaDamage(W, x, y, r, dmg) {
    W.enemies.forEach(function (e) { if (e.hp > 0 && !e.under && Math.hypot(e.x - x, e.y - y) < r + e.r) damage(W, e, dmg); });
    if (W.boss && !W.boss.dead) W.boss.parts.forEach(function (q) { if (q.alive && Math.hypot(q.x - x, q.y - y) < r + q.r) bossPartHit(W, q, dmg * 0.6); });
  }
  function shotHits(W, s) {
    var wide = s.w ? s.w / 2 : s.kind === 'rocket' || s.kind === 'cluster' ? 2.5 : 1.5;
    for (var j = 0; j < W.enemies.length; j++) {
      var e = W.enemies[j]; if (e.hp <= 0 || e.y < -8 || e.under) continue;
      if (s.hit && s.hit[e.id]) continue;
      if (Math.abs(e.x - s.x) < e.r + wide && Math.abs(e.y - s.y) < e.r + 5) {
        damage(W, e, s.dmg); fx(W, { k: 'hit', x: s.x, y: e.y + e.r * 0.6, kind: s.kind });
        if (s.hit) { s.hit[e.id] = 1; continue; }   // a laser goes on through
        return true;
      }
    }
    var B = W.boss;
    if (B && !B.dead) for (var k = 0; k < B.parts.length; k++) {
      var q = B.parts[k]; if (!q.alive) continue;
      if (s.hit && s.hit['b' + q.id]) continue;
      if (Math.abs(q.x - s.x) < q.r + wide && Math.abs(q.y - s.y) < q.r + 5) {
        if (bossPartHit(W, q, s.dmg)) { fx(W, { k: 'hit', x: s.x, y: q.y + q.r * 0.6, kind: s.kind }); if (s.hit) { s.hit['b' + q.id] = 1; continue; } return true; }
      }
    }
    return false;
  }
  function damage(W, e, dmg) {
    if (e.hp <= 0) return;
    e.hp -= dmg; e.flash = 3;
    if (e.hp > 0) return;
    var T = TYPES[e.type], x2 = W.p.x2 > 0 ? 2 : 1, pts = T.score * (1 + W.loop) * x2;
    addScore(W, pts);
    if (e.type !== 'rocket') W.st.killed++;
    // QUICK KILL: shot down before it fired, soon after it came into view
    if (T.quick && !e.fired && e.seen >= 0 && W.frame - e.seen < 70) {
      var q = 500 * (1 + W.loop) * x2; addScore(W, q); W.st.quick++;
      fx(W, { k: 'quick', x: e.x, y: e.y, pts: q }); ev(W, { sfx: 'quick' });
    }
    ev(W, { sfx: e.r >= 15 ? 'bigboom' : 'boom', x: e.x, size: e.r });
    fx(W, { k: 'boom', x: e.x, y: e.y, size: e.r >= 20 ? 3 : e.r >= 12 ? 2 : 1, ground: e.ground, sea: e.sea, type: e.type, id: e.id });
    if (T.drop) dropItems(W, e.x, e.y, T.drop);
    if (e.carry) dropItems(W, e.x, e.y, e.carry);
    if (e === W.mid) { W.mid = null; W.freeze = 12; fx(W, { k: 'points', x: e.x, y: e.y, pts: pts }); }
    if (e.fl) flightDown(W, e);
  }
  function tagFlight(W, from) {   // the planes a formation just sent are one flight
    var n = W.enemies.length - from; if (n < 3) return;
    var id = ++W.id; W.flights[id] = { n: n, left: n, broken: false };
    for (var i = from; i < W.enemies.length; i++) W.enemies[i].fl = id;
  }
  function flightDown(W, e) {   // the whole flight shot down: a bonus, and the last plane leaves a pod
    var fl = W.flights[e.fl]; if (!fl || --fl.left > 0) return;
    delete W.flights[e.fl];
    if (fl.broken) return;
    var pts = 300 * fl.n * (1 + W.loop); addScore(W, pts);
    ev(W, { sfx: 'flight' }); fx(W, { k: 'flight', x: e.x, y: e.y, pts: pts });
    dropItems(W, e.x, e.y, 'P');
  }
  function nextPod(W) {
    if (!W.p.rk && W.rng() < 0.5) return 'RHC'.charAt(Math.floor(W.rng() * 3));   // no rockets yet: they come sooner
    if (!W.bag.length) { W.bag = BAG.slice(); for (var i = W.bag.length - 1; i > 0; i--) { var j = Math.floor(W.rng() * (i + 1)), t = W.bag[i]; W.bag[i] = W.bag[j]; W.bag[j] = t; } }
    return W.bag.pop();
  }
  function dropItems(W, x, y, kinds) {
    for (var i = 0; i < kinds.length; i++) {
      var k = kinds.charAt(i), dx = (i - (kinds.length - 1) / 2) * 12;
      if (k === 'M') W.items.push({ x: x + dx, y: y, vx: 0, vy: 0, kind: 'M', t: 0, ground: true });
      else W.items.push({ x: x + dx, y: y, vx: (W.rng() < 0.5 ? -1 : 1) * (0.4 + W.rng() * 0.4), vy: -0.6, kind: k === 'P' ? nextPod(W) : k, t: 0, bounces: 0 });
    }
  }

  // ---------------------------------------------------------------- the player
  function movePlayer(W, input) {
    var p = W.p, sp = W.ship.speed, dx = 0, dy = 0;
    if (input.touch && input.tx != null) {   // a finger: the ship moves as the finger moves (it stays visible above it)
      if (!W.touchAnchor) W.touchAnchor = { fx: input.tx, fy: input.ty, sx: p.x, sy: p.y };
      var tx = W.touchAnchor.sx + (input.tx - W.touchAnchor.fx) * 1.25, ty = W.touchAnchor.sy + (input.ty - W.touchAnchor.fy) * 1.25;
      dx = clamp(tx - p.x, -sp * 2.2, sp * 2.2); dy = clamp(ty - p.y, -sp * 2.2, sp * 2.2);
    } else {
      W.touchAnchor = null;
      if (input.mouseX != null && input.mouseY != null) { dx = clamp(input.mouseX - p.x, -sp * 1.7, sp * 1.7); dy = clamp(input.mouseY - p.y, -sp * 1.7, sp * 1.7); if (Math.abs(dx) < 0.3) dx = 0; if (Math.abs(dy) < 0.3) dy = 0; }
      else {
        if (input.left && !input.right) dx = -sp; else if (input.right && !input.left) dx = sp;
        if (input.up && !input.down) dy = -sp; else if (input.down && !input.up) dy = sp;
        if (dx && dy) { dx *= 0.7071; dy *= 0.7071; }
      }
    }
    p.x = clamp(p.x + dx, 8, WIDTH - 8); p.y = clamp(p.y + dy, 22, HEIGHT - 14);
    p.vx = dx; p.vy = dy;
    // the wingmen follow a moment behind, one either side
    p.wing.forEach(function (w, i) { var tx2 = p.x + (i ? 22 : -22), ty2 = p.y + 10; w.x += (tx2 - w.x) * 0.16; w.y += (ty2 - w.y) * 0.16; });
  }
  function bomb(W) {
    var p = W.p;
    if (p.bombs <= 0 || W.bombT > 0) { ev(W, { sfx: 'empty' }); return; }
    p.bombs--; W.bombT = 96; W.bombX = p.x; W.bombY = p.y - 60; p.inv = Math.max(p.inv, 130);
    W.bullets.forEach(function (b) { fx(W, { k: 'pop', x: b.x, y: b.y }); });
    addScore(W, W.bullets.length * 10);
    W.bullets = []; W.beams = [];
    ev(W, { sfx: 'bomb' }); fx(W, { k: 'bomb', x: p.x, y: p.y, ship: W.shipId });
  }
  function bombStep(W) {
    if (W.bombT <= 0) return;
    W.bombT--;
    W.bullets = [];
    if (W.bombT % 6 === 0 && W.bombT > 20) {   // a carpet of blasts sweeping up the screen
      var k = (96 - W.bombT) / 76, by = HEIGHT - 30 - k * (HEIGHT - 40);
      for (var i = 0; i < 3; i++) { var bx = 30 + W.rng() * 180; fx(W, { k: 'boom', x: bx, y: by + (W.rng() - 0.5) * 30, size: 2, ground: true, bomb: true }); }
      areaDamage(W, 120, by, 140, 9);
    }
  }
  function playerHit(W) {
    var p = W.p;
    if (p.inv > 0 || p.dead) return;
    if (p.shield > 0) {
      p.shield--; p.inv = 90; W.bullets = W.bullets.filter(function (b) { return Math.hypot(b.x - p.x, b.y - p.y) > 40; });
      ev(W, { sfx: 'shield' }); say(W, p.shield ? 'Shield hit - ' + p.shield + ' left' : 'Shield gone!'); fx(W, { k: 'shieldhit', x: p.x, y: p.y, left: p.shield });
      return;
    }
    p.dead = 90; W.lives--; W.deaths++; W.stageDeaths++; p.x2 = 0;
    W.bullets = W.bullets.filter(function (b) { return Math.hypot(b.x - p.x, b.y - p.y) > 70; });
    ev(W, { sfx: 'die', x: p.x }); fx(W, { k: 'die', x: p.x, y: p.y });
    // a level of power and the wingmen are lost; the gun's pod falls where the ship went down, to be caught again
    W.items.push({ x: p.x, y: p.y, vx: 0.7, vy: -1.6, kind: p.gun, t: 0, bounces: 0 });
    p.wing.forEach(function (w) { fx(W, { k: 'boom', x: w.x, y: w.y, size: 1 }); }); p.wing = [];
  }
  function respawn(W) {
    var p = W.p;
    p.x = WIDTH / 2; p.y = HEIGHT - 34; p.inv = W.d.inv; p.glv = Math.max(1, p.glv - 1); if (p.rk) p.rlv = Math.max(1, p.rlv - 1);
    p.bombs = Math.max(p.bombs, W.ship.bombs); p.shield = Math.max(p.shield, W.d.shield + W.ship.shield);
    ev(W, { sfx: 'respawn' }); fx(W, { k: 'respawn', x: p.x, y: p.y });
  }
  function addScore(W, pts) {
    W.score += pts;
    while (W.score >= W.nextExtra) { W.nextExtra += EXTRA_EVERY; W.lives = Math.min(9, W.lives + 1); ev(W, { sfx: 'extra' }); say(W, 'Extra ship!'); fx(W, { k: 'extra' }); }
  }

  // ---------------------------------------------------------------- the step
  function step(W, input) {
    W.frame++;
    input = input || {};
    if (W.over) return;
    if (W.freeze > 0) { W.freeze--; return; }
    var p = W.p;
    W.dist += W.vs * (W.phase === 'clear' ? 2.5 : 1);
    if (p.inv) p.inv--;
    if (p.x2 > 0 && W.phase !== 'clear') p.x2--;
    if (p.dead) {
      if (--p.dead === 0) { if (W.lives <= 0) { W.over = true; ev(W, { sfx: 'over' }); return; } respawn(W); }
    } else {
      movePlayer(W, input);
      if (input.altTap) bomb(W);
      // the gun fires only while you press; a fresh press fires at once, so quick taps beat holding
      if (p.fireT > 0) p.fireT--;
      if (p.rkT > 0) p.rkT--;
      var want = (input.fire || input.tap) && W.phase !== 'clear';
      if (want && input.tap && p.fireT <= p.cad * 0.5) p.fireT = 0;
      if (want && p.fireT <= 0) {
        p.cad = p.fireT = fire(W, p.x, p.y, false);
        p.wing.forEach(function (w) { fire(W, w.x, w.y, true); });
        ev(W, { sfx: 'shot', g: p.gun, x: p.x });
      }
      if (want) rockets(W);
    }
    if (W.phase === 'intro') { if (--W.phaseT <= 0) W.phase = 'play'; }
    else if (W.phase === 'clear') { if (--W.phaseT <= 0) nextStage(W); }
    // the script runs on, paused while a mid-boss or boss is about
    if (W.phase === 'play' && !W.mid && !W.boss) {
      W.clock++;
      var sc = W.stage.script;
      while (W.si < sc.length && sc[W.si][0] <= W.clock) { var s = sc[W.si++], from = W.enemies.length; FORM[s[1]](W, s[2]); if (FLIGHTS[s[1]]) tagFlight(W, from); }
    }
    bombStep(W);
    moveEnemies(W);
    if (W.boss) bossStep(W);
    moveShots(W);
    moveBullets(W);
    moveBeams(W);
    moveItems(W);
    W.enemies = W.enemies.filter(function (e) { return e.hp > 0 && !e.gone; });
    W.marks.forEach(function (m) { m.y += W.vs; }); W.marks = W.marks.filter(function (m) { return m.y < HEIGHT + 40; });
  }
  function moveEnemies(W) {
    var p = W.p;
    W.enemies.forEach(function (e) {
      e.t++; if (e.flash) e.flash--;
      var m = e.mv, ox = e.x, oy = e.y, T = TYPES[e.type];
      if (m.m === 'down') { e.y += m.vy; e.x += m.vx || 0; }
      else if (m.m === 'sine') { e.y += m.vy; e.x = m.x0 + Math.sin(e.t * m.f + m.ph) * m.amp; }
      else if (m.m === 'swoop') {
        if (e.t < m.turn) { e.vx = 0; e.vy = m.vy; }
        else { var ang = Math.atan2(e.vy, e.vx) - m.dir * 0.035; e.vx = Math.cos(ang) * 2; e.vy = Math.sin(ang) * 2; }
        e.x += e.vx; e.y += e.vy;
      } else if (m.m === 'arc') { var a2 = Math.atan2(m.vy, m.vx) + m.curl, spd = Math.hypot(m.vx, m.vy); m.vx = Math.cos(a2) * spd; m.vy = Math.sin(a2) * spd; e.x += m.vx; e.y += m.vy; }
      else if (m.m === 'up') { e.y += m.vy; e.x += Math.sin(e.t / 20) * 0.4; }
      else if (m.m === 'stop' || m.m === 'hover') {
        if (!e.held && (Math.abs(e.y - m.ty) + Math.abs(e.x - m.tx) > 0.6) && e.t < 400) { e.x += (m.tx - e.x) * 0.05; e.y += (m.ty - e.y) * 0.05; }
        else {
          e.held = (e.held || 0) + 1;
          if (e.sway) e.x = m.tx + Math.sin(e.held / 70) * 40;
          if (m.m === 'hover') e.x = m.tx + Math.sin(e.held / 40) * 18;   // a helicopter edges from side to side
          if (e.held > m.hold) { e.y += m.out < 0 ? -1.3 : 1.5; e.leaving = true; }
        }
      } else if (m.m === 'dive') {
        if (e.t < m.wait) e.y += 0.9;
        else { if (!e.vy) { var a3 = aimAt(W, e.x, e.y); e.vx = Math.cos(a3) * 1.3; e.vy = Math.sin(a3) * 1.3; } e.vx *= 1.035; e.vy *= 1.035; e.x += e.vx; e.y += e.vy; }
      } else if (m.m === 'cross') { e.x += m.vx; e.y += W.vs * 0.2; }
      else if (m.m === 'loop') { e.y += m.vy; e.x = m.x0 + Math.cos(e.t * 0.05 + m.ph) * m.r; e.y += Math.sin(e.t * 0.05 + m.ph) * 0.9; }
      else if (m.m === 'home') {   // a rocket: it turns slowly towards you; shoot it down
        var tgt = Math.atan2(p.y - e.y, p.x - e.x), cur = Math.atan2(e.vy, e.vx), dd = Math.atan2(Math.sin(tgt - cur), Math.cos(tgt - cur));
        cur += clamp(dd, -0.03, 0.03); var spr = Math.min(1.9 * speedMul(W) + 0.4, Math.hypot(e.vx, e.vy) + 0.03);
        e.vx = Math.cos(cur) * spr; e.vy = Math.sin(cur) * spr; e.x += e.vx; e.y += e.vy;
        if (--e.life <= 0) { e.gone = true; fx(W, { k: 'boom', x: e.x, y: e.y, size: 1 }); }
      }
      else if (m.m === 'scroll') e.y += W.vs;
      else if (m.m === 'drive') {
        var v = m.v; if (m.stopAt != null && e.y >= m.stopAt) { v = 0; e.y += 0; }
        e.x += Math.cos(e.ang) * Math.abs(v); e.y += (m.stopAt != null && e.y >= m.stopAt ? 0 : W.vs) + Math.sin(e.ang) * Math.abs(v);
        if (e.sway && m.stopAt != null && e.y >= m.stopAt) e.x = 120 + Math.sin(e.t / 90) * 50;
      } else if (m.m === 'sub') {   // a submarine: rises, fires, dives again
        e.y += W.vs;
        if (e.under && e.t > 50 && e.t < 260) { e.under = false; fx(W, { k: 'surface', x: e.x, y: e.y }); ev(W, { sfx: 'surface', x: e.x }); }
        if (!e.under && e.t >= 260) { e.under = true; e.leaving = true; }
      }
      // which way it faces, for the picture: air craft along their flight; ground units along their road
      e.dx = e.x - ox; e.dy = e.y - oy;
      if (T.air && (Math.abs(e.dx) + Math.abs(e.dy) > 0.05) && m.m !== 'stop' && m.m !== 'hover') e.ang = Math.atan2(e.dy, e.dx);
      if (T.turret || e.type === 'mid') e.tur = Math.atan2(p.y - e.y, p.x - e.x);
      if (e.seen < 0 && e.y > 2 && e.y < HEIGHT && e.x > 0 && e.x < WIDTH) e.seen = W.frame;
      if (e.y > HEIGHT + 40 || e.y < -70 || e.x < -50 || e.x > WIDTH + 50) {
        if (e.t > 40 || (m.m === 'up' && e.y < -70)) { e.gone = true; if (e === W.mid) W.mid = null; if (e.fl && W.flights[e.fl]) W.flights[e.fl].broken = true; }
        return;
      }
      // shooting
      var f = T.fire;
      if (f && !e.under && e.y > 4 && e.y < HEIGHT - 70 && !e.leaving && !p.dead && !e.fromBehind) {
        if (e.fireT === 0) e.fireT = Math.round(f.start / rateMul(W) * (0.7 + W.rng() * 0.6));
        if (--e.fireT <= 0) {
          e.fired = true;
          if (f.p === 'rocket') { e.fireT = Math.round(f.every / rateMul(W)); rocket(W, e.x, e.y); }
          else if (f.p === 'mid') {
            e.fireT = Math.round(62 / rateMul(W));
            var c = (e.t) % 360;
            if (c < 120) pattern(W, e.x, e.y + 10, { p: 'aim', n: 5, spread: 0.6, speed: 1.6 }, false);
            else if (c < 240) pattern(W, e.x, e.y, { p: 'ring', n: 16, speed: 1.1 }, false);
            else pattern(W, e.x, e.y + 10, { p: 'fan', n: 7, spread: 1.1, speed: 1.4 }, false);
          } else if (e.type === 'destroyer') {   // two turrets, one each end
            e.fireT = Math.round(f.every / rateMul(W) * (0.8 + W.rng() * 0.4));
            pattern(W, e.x, e.y - 12, { p: 'aim', n: 3, spread: 0.3, speed: 1.6 }, false); pattern(W, e.x, e.y + 12, f, false);
          } else { e.fireT = Math.round(f.every / rateMul(W) * (0.8 + W.rng() * 0.4)); pattern(W, e.x, e.y, f, false); }
        }
      }
      // flying into the player
      if (!p.dead && p.inv <= 0 && !e.ground && !e.under) { var dx = e.x - p.x, dy = e.y - p.y; if (dx * dx + dy * dy < (e.r * 0.8 + HIT_R) * (e.r * 0.8 + HIT_R)) { if (e.type === 'inter' || e.type === 'jet' || e.type === 'rocket' || e.type === 'drone') damage(W, e, 99); playerHit(W); } }
    });
  }
  function moveBullets(W) {
    var p = W.p, alive = !p.dead;
    for (var i = W.bullets.length - 1; i >= 0; i--) {
      var b = W.bullets[i]; if (!b) continue;   // a hit clears the bullets round you, so the list can shrink under us
      b.x += b.vx; b.y += b.vy; b.t++;
      if (b.x < -10 || b.x > WIDTH + 10 || b.y < -10 || b.y > HEIGHT + 10) { W.bullets.splice(i, 1); continue; }
      if (!alive) continue;
      var dx = b.x - p.x, dy = b.y - p.y, d2 = dx * dx + dy * dy, hr = HIT_R + b.r * 0.6;
      if (d2 < hr * hr) { W.bullets.splice(i, 1); playerHit(W); if (p.dead) alive = false; continue; }
      if (!b.grazed && d2 < GRAZE_R * GRAZE_R && p.inv <= 0) {   // GRAZE: a bullet that passes close
        b.grazed = true; W.graze++; addScore(W, 50 + Math.min(450, W.graze * 2));
        ev(W, { sfx: 'graze' }); fx(W, { k: 'graze', x: b.x, y: b.y });
      }
    }
  }
  function moveBeams(W) {
    var p = W.p;
    for (var i = W.beams.length - 1; i >= 0; i--) {
      var b = W.beams[i];
      if (b.warn > 0) { b.warn--; if (!b.warn) ev(W, { sfx: 'beam', x: b.x }); continue; }
      if (--b.life <= 0) { W.beams.splice(i, 1); continue; }
      if (!p.dead && Math.abs(p.x - b.x) < b.w / 2 + 2 && p.y > b.y) playerHit(W);
    }
  }
  function moveItems(W) {
    var p = W.p;
    for (var i = W.items.length - 1; i >= 0; i--) {
      var it = W.items[i];
      it.t++;
      if (it.kind === 'M') { it.y += W.vs; }   // a medal lies on the ground and slides down with it
      else {   // a pod drifts down slowly, bouncing off the sides
        it.vy = Math.min(0.55, it.vy + 0.02); it.x += it.vx; it.y += it.vy;
        if ((it.x < 10 && it.vx < 0) || (it.x > WIDTH - 10 && it.vx > 0)) { it.vx = -it.vx; it.bounces++; }
      }
      var dx = p.x - it.x, dy = p.y - it.y, d = Math.hypot(dx, dy), mag = it.kind === 'M' ? 30 : 16;
      if (!p.dead && d < mag && d > 0.1) { it.x += dx / d * 2.4; it.y += dy / d * 2.4; }   // drawn to the ship when close (a pod only when very close, so you can pick)
      if (!p.dead && d < 11) { W.items.splice(i, 1); pickUp(W, it); continue; }
      if (it.y > HEIGHT + 10) {
        W.items.splice(i, 1);
        if (it.kind === 'M') { if (W.medal > 0) { ev(W, { sfx: 'medalmiss' }); fx(W, { k: 'medalmiss' }); } W.medal = 0; }
      }
    }
  }
  function pickUp(W, it) {
    var p = W.p, k = it.kind, txt;
    if (GUNS[k]) {   // a gun: the same one powers up; another swaps, keeping the power
      if (p.gun !== k) { p.gun = k; txt = GUNS[k] + (p.glv > 1 ? ' ' + p.glv : ''); }
      else if (p.glv < MAXLV) { p.glv++; txt = GUNS[k] + (p.glv === MAXLV ? ' MAX' : ' ' + p.glv); }
      else { addScore(W, 5000); txt = '5000'; }
      ev(W, { sfx: 'power' });
    } else if (RKTS[k]) {
      if (p.rk !== k) { p.rk = k; p.rlv = Math.max(1, p.rlv); txt = RKTS[k] + (p.rlv > 1 ? ' ' + p.rlv : ''); }
      else if (p.rlv < MAXLV) { p.rlv++; txt = RKTS[k] + (p.rlv === MAXLV ? ' MAX' : ' ' + p.rlv); }
      else { addScore(W, 5000); txt = '5000'; }
      p.rkT = 0; ev(W, { sfx: 'power' });
    } else if (k === 'B') { if (p.bombs < 7) p.bombs++; else addScore(W, 5000); txt = 'BOMB'; ev(W, { sfx: 'power' }); }
    else if (k === 'D') { if (p.shield < 3) p.shield++; else addScore(W, 5000); txt = 'SHIELD'; ev(W, { sfx: 'shieldup' }); }
    else if (k === 'X') { p.x2 = X2_TIME; txt = 'DOUBLE SCORE'; ev(W, { sfx: 'power' }); say(W, 'Double points for 20 seconds!'); }
    else if (k === 'W') {
      if (p.wing.length < 2) { p.wing.push({ x: p.x, y: p.y + 20 }); say(W, 'Wingman joined!'); } else addScore(W, 10000);
      txt = 'WINGMAN'; ev(W, { sfx: 'power' });
    } else {   // a medal
      var v = MEDALS[Math.min(MEDALS.length - 1, W.medal)] * (1 + W.loop) * (p.x2 > 0 ? 2 : 1);
      W.medal++; W.st.caught++; addScore(W, v);
      ev(W, { sfx: 'medal', n: W.medal }); fx(W, { k: 'item', x: it.x, y: it.y, text: String(v), kind: 'M', v: v });
      return;
    }
    fx(W, { k: 'item', x: it.x, y: it.y, text: txt, kind: k });
  }
  function stageClear(W) {
    var st = W.st, rate = st.foes ? st.killed / st.foes : 1, mrate = st.medals ? st.caught / st.medals : 1;
    var bonus = Math.round(rate * 50000 + mrate * 30000) * (1 + W.loop) + (W.stageDeaths === 0 ? 50000 : 0) + (rate >= 0.999 ? 100000 : 0);
    addScore(W, bonus);
    W.phase = 'clear'; W.phaseT = 300;
    // the pods still about are yours - but not one that would swap your gun or rockets
    W.items.forEach(function (it) { if (it.kind !== 'M' && !(GUNS[it.kind] && it.kind !== W.p.gun) && !(RKTS[it.kind] && it.kind !== W.p.rk)) pickUp(W, it); }); W.items = [];
    W.vs = W.stage.scroll;
    ev(W, { sfx: 'clear' }); say(W, 'Stage clear! +' + bonus);
    fx(W, { k: 'clear', n: W.stageNo, pts: bonus, perfect: W.stageDeaths === 0, rate: Math.round(rate * 100), mrate: Math.round(mrate * 100), quick: st.quick });
  }

  function hud(W) { return { score: W.score, lives: Math.max(0, W.lives), wave: W.stageNo }; }

  return {
    WIDTH: WIDTH, HEIGHT: HEIGHT, DIFF: DIFF, SHIPS: SHIPS, TYPES: TYPES, STAGES: STAGES, BOSSES: BOSSES, MEDALS: MEDALS, HIT_R: HIT_R, GRAZE_R: GRAZE_R, MAXLV: MAXLV, X2_TIME: X2_TIME,
    GUNS: GUNS, RKTS: RKTS, BONUS: BONUS, FLIGHTS: FLIGHTS,
    newWorld: newWorld, step: step, hud: hud, spawn: spawn, makeBoss: makeBoss, nextStage: nextStage, bomb: bomb, pickUp: pickUp, damage: damage, FORM: FORM
  };
});
