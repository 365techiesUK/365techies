/* 365 Pinball Hero - Ember Peak, as data (16 Oct 2026, the next-gen "fast track"). A sunny volcano island waking up:
 * bright blue sky, turquoise sea, black rock, glowing orange lava. Our own table, names and theme.
 *
 * Shared by the rules and physics (engine.js) and the pictures, in the same units and kinds as the old space table
 * (table.js): 270 wide, 680 tall (about one and a half screens), y runs DOWN the table, the ball's radius is 7, the
 * playfield is mirrored about x = 125 and the shooter lane is the strip on the right (x 244-266), here the full height.
 *
 * TWO STOREYS, each with its own flippers (storeys below; the camera relies on them):
 *  - the SHORE (lower storey): today's tested flippers, slings, inlanes, outlanes and kickback, moved 234 down. Above
 *    the slings: the two orbits' mouths (long lanes up each side to the top arch: the camera's best follow moments), the
 *    SUMMIT RAMP's lane in the middle (a ramp up over the summit deck into the summit field), the OBSIDIAN drop targets
 *    on the left and a magma crab walking on the right;
 *  - the SUMMIT (upper storey): a smaller pair of flippers at y 292, the volcano and its crater top left, three
 *    fumaroles (pop bumpers) and the three skill lanes top right, two lava lanes behind gates at the sides, two magma
 *    crabs and the steam geyser in the middle. A ball that leaves the summit between its flippers drops to the shore.
 *
 * Toys (data here, stepped by the engine's clock; their state is in W.toys for the pictures):
 *  volcano - a cone with a crater: a firm shot into its mouth is held 2.75 s, then carried skyward (carries.sky) and
 *            down the WIRE RAIL along the left side into the shore's left inlane. Rises with pressure (picture only).
 *  geyser  - a steam column: catches a slow ball, puffs (a warning), then flings it up into the fumaroles.
 *  crabs   - magma crabs: small round targets walking set paths, never in an approach zone, never into a ball.
 *  lava    - two gates across the lava lanes, down (one-way: a ball can always come out) until a full eruption raises
 *            them for a frenzy.
 *  quake   - a brief tilt of gravity, only while no ball is below any approach line.
 * Nothing here is a real table's layout, toy or name. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.PinTables = root.PinTables || {}; root.PinTables.ember = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var W = 270, H = 680, BALL = 7, MID = 125, DY = 234;   // DY: the shore is the old table's lower part, this far down
  function mx(x) { return 2 * MID - x; }
  var PI = 3.141592653589793, D30 = 30 * PI / 180, D22 = 22 * PI / 180;

  // ------------------------------------------------------------ walls: [ax, ay, bx, by, radius, bounce, kind]
  var walls = [
    // the cabinet's sides and the shooter lane's inner wall (dead beside the orbits, so a ball turns up them)
    [6, 136, 6, 496, 2, 0.15, 'wall'], [6, 496, 6, H, 2, 0.35, 'wall'],
    [266, 136, 266, H, 2, 0.35, 'wall'],
    [244, 152, 244, 496, 2, 0.15, 'wall'], [244, 496, 244, H, 2, 0.35, 'wall'],
    // below the table's bottom edge (never drawn): a draining ball can't slip along under the flippers into the lane
    [244, H, 244, H + 40, 2, 0.35, 'apron'], [6, H, 6, H + 40, 2, 0.35, 'apron'], [266, H, 266, H + 40, 2, 0.35, 'apron'],
    // the orbits' inner walls, the full height of the summit: also the summit's sides and the shore's upper field's sides
    // (dead beside the lava lanes, so a ball shot into one turns up it)
    [30, 150, 30, 250, 2, 0.15, 'wall'], [30, 250, 30, 440, 2, 0.35, 'wall'],
    [mx(30), 150, mx(30), 250, 2, 0.15, 'wall'], [mx(30), 250, mx(30), 440, 2, 0.35, 'wall'],
    // the lava lanes: each runs up beside the summit's side wall into the arch. Its mouth is on its inner side, facing
    // the opposite summit flipper (as the orbits' mouths face the opposite shore flipper), with the lava gate across it;
    // its floor slopes down to the gate, so a ball in the lane always rolls out (a down gate lets it through)
    [54, 150, 54, 166, 2, 0.15, 'wall'], [mx(54), 150, mx(54), 166, 2, 0.15, 'wall'],
    [30, 236, 54, 248, 2, 0.3, 'wall'], [mx(30), 236, mx(54), 248, 2, 0.3, 'wall'],
    // the skill lanes' guides under the arch
    [146, 68, 146, 88, 2, 0.45, 'post'], [170, 68, 170, 88, 2, 0.45, 'post'],
    [194, 68, 194, 88, 2, 0.45, 'post'], [218, 68, 218, 88, 2, 0.45, 'post'],
    // the summit deck: a floor sloping in to each summit flipper (ending inside its pivot, as the shore's inlane floors
    // do) and the deck's underside back out to the side wall (a ceiling from below: nothing can rest on it)
    [30, 266, 86, 287, 2, 0.3, 'wall'], [mx(30), 266, mx(86), 287, 2, 0.3, 'wall'],
    [86, 297, 30, 333, 2, 0.35, 'wall'], [mx(86), 297, mx(30), 333, 2, 0.35, 'wall'],
    // the obsidian block: its roof slopes down to the ramp lane (a ball on it rolls off into the lane), and the wall
    // just behind the drop targets (closer than a ball, so nothing ever gets in behind them)
    [30, 378, 106, 404, 2, 0.3, 'wall'], [34.4, 431.3, 98.4, 409.3, 2, 0.3, 'wall'],
    // the summit ramp's lane
    [106, 404, 106, 452, 2, 0.35, 'wall'], [134, 412, 134, 452, 2, 0.35, 'wall'],
    // the shore: outlane / inlane dividers, the inlane floors and the inlane guides (the old table's, moved down)
    [27, 318 + DY, 27, 380 + DY, 2, 0.4, 'wall'], [27, 380 + DY, 76, 399 + DY, 2, 0.3, 'wall'],
    [49, 316 + DY, 46, 282 + DY, 2, 0.2, 'wall'], [mx(49), 316 + DY, mx(46), 282 + DY, 2, 0.2, 'wall'],
    [mx(27), 318 + DY, mx(27), 380 + DY, 2, 0.4, 'wall'], [mx(27), 380 + DY, mx(76), 399 + DY, 2, 0.3, 'wall']
  ];
  var posts = [   // [x, y, radius, bounce]
    [27, 318 + DY, 2.5, 0.6], [mx(27), 318 + DY, 2.5, 0.6],
    [106, 452, 2.5, 0.55], [134, 452, 2.5, 0.55]
  ];
  var arch = { x: 136, y: 136, R: 130, r: 2, e: 0.3 };

  // the fumaroles (pop bumpers), under the skill lanes; the shore's slingshots
  var bumpers = [[156, 124, 12], [202, 118, 12], [180, 160, 12]];
  var slings = [
    { side: -1, a: [49, 316 + DY], b: [49, 358 + DY], c: [71, 376 + DY] },
    { side: 1, a: [mx(49), 316 + DY], b: [mx(49), 358 + DY], c: [mx(71), 376 + DY] }
  ];

  // ------------------------------------------------------------ flippers: the shore's pair, then the summit's smaller pair
  // (the left button works every flipper with side -1, the right every one with side 1)
  var flippers = [
    { side: -1, x: 74, y: 404 + DY, len: 40, r0: 6.5, r1: 3.5, rest: D30, up: -D22, storey: 0 },
    { side: 1, x: mx(74), y: 404 + DY, len: 40, r0: 6.5, r1: 3.5, rest: PI - D30, up: PI + D22, storey: 0 },
    { side: -1, x: 84, y: 292, len: 30, r0: 5.5, r1: 3, rest: D30, up: -D22, storey: 1 },
    { side: 1, x: mx(84), y: 292, len: 30, r0: 5.5, r1: 3, rest: PI - D30, up: PI + D22, storey: 1 }
  ];
  // the storeys: which flippers, the area, and the approach line (a ball in the storey below it can soon reach those
  // flippers). "Home" for the camera is the storey whose approach zone the ball reaches next.
  var storeys = [
    { id: 'shore', name: 'SHORE', flippers: [0, 1], x0: 0, x1: 244, y0: 336, y1: H, approach: 534 },
    { id: 'summit', name: 'SUMMIT', flippers: [2, 3], x0: 30, x1: 220, y0: 0, y1: 336, approach: 216 }
  ];

  // ------------------------------------------------------------ the shooter lane (the full height), its gate, the orbits' foot gates
  // the plunger's launch speed for each pull (units a second on Classic), measured with tools/pinball/plunger.cjs: under
  // ~804 the ball falls back; ~804-860 it drops off the arch's shoulder down the right orbit to the right inlane;
  // ~876-904 it falls into a skill lane (right, middle, left); faster goes all round the arch and down the left orbit.
  // The curve spreads the narrow lane band over a quarter of the pull. auto: a quick tap (and ball save) fires this:
  // down the right orbit to the right flipper (a safe, medium shot).
  var shooter = { x0: 244, x1: 266, cx: 255, tip: 428 + DY, travel: 14,
    curve: [[0, 640], [0.12, 750], [0.25, 812], [0.45, 866], [0.5, 874], [0.75, 906], [1, 1130]], auto: 832 };
  var gates = [
    [244, 152, 266, 140, 1.5, 255, 120, 0.02],
    [6, 262 + DY, 22, 292 + DY, 2, 20, 268 + DY],
    [244, 262 + DY, mx(22), 292 + DY, 2, mx(20), 268 + DY]
  ];

  // ------------------------------------------------------------ the obsidian drop targets (five, on the left of the shore's field)
  var drops = { a: [36, 436], b: [100, 414], n: 5, r: 2.5 };

  // ------------------------------------------------------------ the summit ramp: from the shore's middle up over the summit
  // deck into the summit field (a path with a height, as the old warp ramp: too slow and it rolls back out)
  var ramp = {
    entry: { y: 440, x0: 108, x1: 132 },
    path: [
      [120, 440, 0], [120, 414, 8], [116, 388, 18], [106, 364, 28], [90, 344, 36], [70, 330, 40], [52, 314, 42],
      [42, 294, 42], [40, 272, 40], [44, 252, 30], [52, 236, 14], [62, 226, 0]
    ],
    width: 22
  };

  // ------------------------------------------------------------ the volcano and its crater
  // mouth: the crater takes a ball whose contact is within `half` degrees of the mouth's direction (down the table,
  // towards the summit flippers) and that comes in at least catchV (units a second, Classic); a softer touch bounces.
  // hold: steps (60 a second) in the crater before the carry. carry: which path the ball is fired along.
  var volcano = { x: 90, y: 118, r: 22, e: 0.25, mouth: [0, 1], half: 18, catchV: 300, hold: 165, carry: 'sky' };

  // ------------------------------------------------------------ carries: timed paths the ball rides out of play
  // [x, y, height, step from the start]; out: the ball's speed when it is let go at the end (Classic); railAt: the
  // step it lands on the wire rail. The crater's: skyward out of the crater, over the left side and down the wire rail
  // (above the left orbit) into the shore's left inlane, far from every flipper until it is let go.
  var carries = {
    sky: {
      pts: [
        [90, 118, 0, 0], [88, 112, 30, 8], [82, 100, 90, 22], [72, 86, 145, 38], [58, 76, 172, 54], [42, 76, 172, 70],
        [30, 86, 150, 86], [20, 104, 112, 100], [16, 128, 72, 112],
        [16, 200, 64, 128], [16, 300, 56, 148], [16, 400, 46, 168], [17, 470, 36, 182], [22, 505, 22, 192],
        [30, 526, 8, 200], [35, 536, 0, 205]
      ],
      railAt: 112, out: [120, 360]
    }
  };

  // ------------------------------------------------------------ the steam geyser (in the summit field, above its approach line)
  // a ball slower than catchV inside r is caught; it puffs for `puff` steps (the warning), then is flung (Classic
  // speed); the geyser rests `cool` steps before it can catch again
  var geyser = { x: 125, y: 204, r: 10, catchV: 260, puff: 24, fling: [300, -900], cool: 360 };

  // ------------------------------------------------------------ the magma crabs: round targets walking set paths
  // path: the two ends; speed: units a second (Classic); pause: steps at each end; u0: where each starts (0-1);
  // stun: steps a hit crab stays still. Each path keeps well clear of every wall and of every approach zone.
  var crabs = [
    { path: [[80, 204], [110, 204]], r: 7, e: 0.4, speed: 22, pause: 40, u0: 0, stun: 150 },
    { path: [[138, 198], [168, 198]], r: 7, e: 0.4, speed: 22, pause: 40, u0: 0.5, stun: 150 },
    { path: [[150, 380], [192, 380]], r: 7, e: 0.4, speed: 26, pause: 30, u0: 0.2, stun: 150 }
  ];

  // ------------------------------------------------------------ the lava gates: [ax, ay, bx, by, radius, a point on the side
  // they block when down]. Down, each is one-way (a ball inside its lane always comes out); raised, the lane is open.
  // time: steps the gates stay up after a full eruption; anim: steps the picture takes to raise or lower them.
  var lava = { gates: [[54, 166, 54, 248, 2, 66, 207], [mx(54), 166, mx(54), 248, 2, mx(66), 207]], time: 1200, anim: 30 };

  // the quake: gravity tips sideways by up to amp of the slope's pull, for `time` steps, only while no ball is below
  // any approach line (it waits; and it stops at once if a ball gets there)
  var quake = { amp: 0.16, time: 48 };

  // ------------------------------------------------------------ sensors: circles [id, x, y, r]; lines [id, ax, ay, bx, by]
  var sensors = {
    circles: [
      ['lane0', 158, 79, 7], ['lane1', 182, 79, 7], ['lane2', 206, 79, 7],
      ['inL', 38, 342 + DY, 8], ['inR', mx(38), 342 + DY, 8],
      ['outL', 16, 392 + DY, 8], ['outR', mx(16), 392 + DY, 8],
      ['kick', 16, 424 + DY, 8]
    ],
    lines: [
      ['spin', 8, 430, 28, 430], ['orbR', mx(28), 430, mx(8), 430],
      ['lavaL', 32, 158, 52, 158], ['lavaR', mx(52), 158, mx(32), 158]
    ]
  };

  // ------------------------------------------------------------ the rules' numbers (a light re-skin: full missions come next)
  var points = {
    bumper: 5000, sling: 1000, spin: 10000, drop: 25000, drops: 500000, ramp: 400000, orbit: 250000, loop: 750000,
    lane: 25000, inlane: 10000, outlane: 50000, skill: 1000000, saucer: 0, saucerLit: 0,
    crater: 500000, pressure: 3000000, eruption: 5000000, crab: 150000, geyser: 250000, lava: 2000000, lanesDone: 500000, rail: 100000
  };
  // pressure each shot adds (full = 1; up to 1.5, when the quake comes)
  var pressure = { orbit: 0.08, loop: 0.12, ramp: 0.12, drop: 0.02, drops: 0.15, crab: 0.06, geyser: 0.05, skill: 0.1,
    lava: 0.05, bumper: 0.005, lane: 0.02, full: 1, warn: 1.25, max: 1.5, after: 0.6 };
  var names = { ramp: 'SUMMIT RAMP', drops: 'OBSIDIAN', dropsSub: 'KICKBACK LIT', orbit: 'ORBIT', loop: 'LOOP' };
  var extra = { 1: [10000000, 30000000, 80000000], 2: [20000000, 60000000, 150000000], 3: [25000000, 80000000, 200000000] };

  return {
    id: 'ember', name: 'Ember Peak', rules: 'ember',
    W: W, H: H, BALL: BALL, MID: MID,
    walls: walls, posts: posts, arch: arch, bumpers: bumpers, slings: slings, flippers: flippers, storeys: storeys,
    shooter: shooter, gates: gates, drops: drops, ramp: ramp, sensors: sensors,
    volcano: volcano, carries: carries, geyser: geyser, crabs: crabs, lava: lava, quake: quake,
    points: points, pressure: pressure, names: names, extra: extra, bonusScale: 50, dropsBack: 120,
    // the closed spaces no ball can reach (for the sim tools' "free spot" check): the deck blocks, the obsidian block
    voids: [
      [[30, 266], [86, 287], [86, 297], [30, 333]],
      [[220, 266], [164, 287], [164, 297], [220, 333]],
      [[30, 378], [106, 404], [106, 412], [98.4, 409.3], [34.4, 431.3], [30, 431.3]]
    ]
  };
});
