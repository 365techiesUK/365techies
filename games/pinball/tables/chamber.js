/* 365 Pinball Hero - THE MAGMA CHAMBER, as data (wave 3, 5 Nov 2026): the first level INTO THE VOLCANO, below Ember Peak.
 * Our own table, names and theme: a cavern of deep red rock inside the mountain, lit orange by the magma.
 *
 * A level (T.level): reached by a hard cut from Ember Peak's DIVE hold, never a place to lose a ball. descent.js runs
 * it (the goal, the lava clock, the way back up); the engine steps it like any table. Same units as Ember Peak, and THE
 * SAME FRAME: the lower block (flippers, slings, inlanes, outlanes, the foot gates) is copied from tables/ember.js at
 * the same coordinates, so the flippers feel, time and sit on screen exactly as on the surface (the camera relies on
 * it). The chamber is one storey, about 238 wide and 300 tall (y 160-470); above its domed roof is the cavern wall.
 *
 * Above the flippers, built only from the existing toy kit:
 *  - the MAGMA SCOOP (a crater toy, top centre - a little right, where the left flipper's shots go - its mouth down): the way out. Unlit it collects and
 *    sends the ball round the wire rail into the left inlane; lit (ASCEND, the crater's 'boss' lamp on a level) it is
 *    the trip home;
 *  - three VENTS (pop bumpers) on the right;
 *  - the MAGMA CORE, a moving post (the crab toy) walking a short path left of the middle;
 *  - the CINDER LANE up the left side, behind a lava gate: open, a shot up it rides the dome over the scoop (an orbit).
 * The goal (descent.js): light the three vents, then hit the core = CHAMBER CLEARED; the scoop then lights ASCEND.
 * The ball drops in through the roof on to the wire rail: held a second there (T.serve), then down into the left inlane.
 *
 * No shooter lane: the strip right of x 244 is solid rock. `shooter` below only says where that strip starts (the sim
 * tools read it); no ball is ever put there. Nothing here is a real table's layout, toy or name. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.PinTables = root.PinTables || {}; root.PinTables.chamber = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var W = 270, H = 470, BALL = 7, MID = 125, DY = 24;   // DY: Ember Peak's lower part is the old table's, this far down
  function mx(x) { return 2 * MID - x; }
  var PI = 3.141592653589793, D30 = 30 * PI / 180, D22 = 22 * PI / 180;

  // ------------------------------------------------------------ walls: [ax, ay, bx, by, radius, bounce, kind]
  var walls = [
    // the chamber's sides (the same bounce as Ember Peak's beside its orbits and below)
    [6, 196, 6, 286, 2, 0.15, 'wall'], [6, 286, 6, H, 2, 0.35, 'wall'],
    [244, 196, 244, 286, 2, 0.15, 'wall'], [244, 286, 244, H, 2, 0.35, 'wall'],
    // below the bottom edge (never drawn)
    [244, H, 244, H + 40, 2, 0.35, 'apron'], [6, H, 6, H + 40, 2, 0.35, 'apron'],
    // the dome's top corners, cut off: a ball up either side is turned along the dome (over the scoop), not straight back
    [6, 216, 34, 190, 2, 0.3, 'wall'], [244, 216, 216, 190, 2, 0.3, 'wall'],
    // the CINDER LANE's inner wall (its lava gate across the mouth below)
    [50, 214, 50, 236, 2, 0.3, 'wall'],
    // the lower part, copied from Ember Peak: outlane / inlane dividers, the inlane floors and the inlane guides
    [27, 318 + DY, 27, 380 + DY, 2, 0.4, 'wall'], [27, 380 + DY, 76, 399 + DY, 2, 0.3, 'wall'],
    [49, 316 + DY, 46, 282 + DY, 2, 0.2, 'wall'], [mx(49), 316 + DY, mx(46), 282 + DY, 2, 0.2, 'wall'],
    [mx(27), 318 + DY, mx(27), 380 + DY, 2, 0.4, 'wall'], [mx(27), 380 + DY, mx(76), 399 + DY, 2, 0.3, 'wall']
  ];
  var posts = [[27, 318 + DY, 2.5, 0.6], [mx(27), 318 + DY, 2.5, 0.6], [50, 214, 2.5, 0.5]];
  // the domed roof: the inside of a circle meeting the side walls at y 198 (the ball rides it over the scoop)
  var arch = { x: 125, y: 340, R: 185, r: 2, e: 0.3 };

  // the three VENTS (pop bumpers); the slingshots (Ember Peak's)
  var bumpers = [[184, 222, 12], [210, 262, 12], [172, 278, 12]];
  var slings = [
    { side: -1, a: [49, 316 + DY], b: [49, 358 + DY], c: [71, 376 + DY] },
    { side: 1, a: [mx(49), 316 + DY], b: [mx(49), 358 + DY], c: [mx(71), 376 + DY] }
  ];

  // ------------------------------------------------------------ flippers: Ember Peak's pair, exactly
  var flippers = [
    { side: -1, x: 74, y: 404 + DY, len: 40, r0: 6.5, r1: 3.5, rest: D30, up: -D22, storey: 0 },
    { side: 1, x: mx(74), y: 404 + DY, len: 40, r0: 6.5, r1: 3.5, rest: PI - D30, up: PI + D22, storey: 0 }
  ];
  var storeys = [
    { id: 'chamber', name: 'MAGMA CHAMBER', flippers: [0, 1], x0: 0, x1: 244, y0: 0, y1: H, approach: 300 + DY }
  ];

  // no shooter lane (see the header): the rock strip right of x 244
  var shooter = { x0: 244, x1: 266, cx: 255, tip: 428 + DY, travel: 0, curve: [[0, 0], [1, 0]], auto: 0, none: true };
  // the foot gates (Ember Peak's): a ball coming down either side is turned into the inlane
  var gates = [
    [6, 262 + DY, 22, 292 + DY, 2, 20, 268 + DY],
    [244, 262 + DY, mx(22), 292 + DY, 2, mx(20), 268 + DY]
  ];

  // ------------------------------------------------------------ the MAGMA SCOOP (a crater toy; see tables/ember.js)
  // A firm shot into its mouth (straight down the table) is taken. Plain, it holds holdPlain steps and sends the ball
  // round the wire rail (carries.sky, `rail` times faster) into the left inlane; lit (ASCEND) descent.js takes the ball
  // home the moment it is caught. diveCap is never used here (a level has no DIVE).
  var volcano = { x: 140, y: 196, r: 14, e: 0.25, mouth: [0, 1], half: 28, catchV: 250, hold: 72, carry: 'sky',
    halfLit: 45, catchLit: 120, holdLit: 72, holdSuper: 30, holdPlain: 30, rail: 2.1875, diveCap: 300 };

  // ------------------------------------------------------------ carries: [x, y, height, step]
  // the wire rail: up out of the scoop, over the dome to the left, down the left side into the left inlane (its end is
  // Ember Peak's sky carry's, so the ball reaches the left flipper the same way). T.serve starts every ball here.
  var carries = {
    sky: {
      pts: [
        [140, 196, 0, 0], [136, 188, 24, 8], [126, 177, 60, 20], [104, 168, 92, 34], [78, 166, 110, 48], [54, 172, 112, 62],
        [36, 186, 104, 76], [22, 206, 90, 90], [15, 230, 70, 104], [14, 254, 52, 118], [16, 280, 34, 134], [22, 302, 18, 150],
        [30, 316, 6, 166], [35, 324, 0, 175]
      ],
      railAt: 76, out: [120, 360]
    },
    // the way in: the ball drops through the roof on to the top of the wire rail, is held there a second (T.serve),
    // then rolls down the rail into the left inlane (the sky carry's last stretch)
    drop: {
      pts: [[40, 180, 120, 0], [30, 194, 100, 10], [22, 206, 90, 18], [15, 230, 70, 32], [14, 254, 52, 46], [16, 280, 34, 60],
        [22, 302, 18, 74], [30, 316, 6, 86], [35, 324, 0, 92]],
      out: [120, 360]
    }
  };
  var serve = { carry: 'drop', hold: 60 };   // the held start: a second at the top of the rail, then down it

  // ------------------------------------------------------------ the MAGMA CORE: a moving post (the crab toy), left of the middle
  var crabs = [
    { path: [[82, 252], [114, 252]], r: 8, e: 0.4, speed: 18, pause: 40, u0: 0.5, stun: 90 }
  ];

  // ------------------------------------------------------------ the CINDER LANE's lava gate [ax, ay, bx, by, r, a point on
  // the side it blocks when down]: down, a ball can always come out of the lane but not go in; descent.js raises it
  var lava = { gates: [[6, 236, 50, 236, 2, 28, 246]], time: 600, anim: 24 };

  // ------------------------------------------------------------ sensors (Ember Peak's lower ones, and the lane's)
  var sensors = {
    circles: [
      ['inL', 38, 342 + DY, 8], ['inR', mx(38), 342 + DY, 8],
      ['outL', 16, 392 + DY, 8], ['outR', mx(16), 392 + DY, 8]
    ],
    lines: [['lavaL', 8, 222, 48, 222]]
  };

  // ------------------------------------------------------------ the rules' numbers (descent.js reads chamber and ascend)
  var points = {
    bumper: 25000, sling: 1000, inlane: 10000, outlane: 50000, crater: 250000, pressure: 0, crab: 500000,
    lava: 1000000, rail: 50000, chamber: 10000000, ascend: 5000000, vent: 250000
  };
  var names = { scoop: 'MAGMA SCOOP', vents: 'VENTS', core: 'MAGMA CORE', lane: 'CINDER LANE' };
  // the lava clock (seconds, by speed: Gentle, Classic, Fast) and how long the lane's gate opens
  var clock = { 1: 55, 2: 45, 3: 40 };
  var laneOpen = { start: 720, vent: 480 };

  // pilot aim (pilot.js's AIM shape): for each speed, the steps from letting a cradled ball go to the flip that makes
  // each shot, measured with tools/pinball/shots.cjs --table=chamber; the chamber's shot ids and the engine's names
  var aim = {
    1: { lane: [40, 34, 29], F: [{ vents: 37, core: 16, crab: 16 }, { scoop: 23, crater: 23, core: 30, crab: 30, lane: 39, lava: 39, vents: 15 }] },
    2: { lane: [40, 34, 29], F: [{ vents: 33, scoop: 19, crater: 19, core: 14, crab: 14 }, { core: 22, crab: 22, lane: 35, lava: 35, vents: 14 }] },
    3: { lane: [40, 34, 29], F: [{ vents: 30, scoop: 25, crater: 25 }, { core: 28, crab: 28, scoop: 18, crater: 18, lane: 31, lava: 31, vents: 13 }] }
  };

  return {
    id: 'chamber', name: 'The Magma Chamber', rules: 'chamber', level: 1, depth: 1,
    W: W, H: H, BALL: BALL, MID: MID, top: 160,
    walls: walls, posts: posts, arch: arch, bumpers: bumpers, slings: slings, flippers: flippers, storeys: storeys,
    shooter: shooter, gates: gates, sensors: sensors, serve: serve, aim: aim,
    volcano: volcano, carries: carries, crabs: crabs, lava: lava,
    points: points, names: names, clock: clock, laneOpen: laneOpen, bonusScale: 50,
    // the closed spaces no ball can reach (the sim tools' free spot check): the rock strip right of the chamber and the
    // two pockets behind the dome's cut-off corners
    voids: [[[244, 0], [270, 0], [270, 470], [244, 470]], [[6, 190], [6, 216], [34, 190], [36, 176], [20, 184]],
      [[244, 190], [244, 216], [216, 190], [214, 176], [230, 184]]]
  };
});
