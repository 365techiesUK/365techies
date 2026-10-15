/* 365 Pinball Hero - the table, as data (15 Oct 2026). One table, shared by the rules and physics (engine.js), the flat
 * 8-bit look (flat.js) and, later, the 3D look - so flat and 3D are always the same game. Our own table and theme: a space
 * hero defending a planet from the invaders of 365 Invaders.
 *
 * Units are the flat look's own pixels: the table is 270 wide and 446 tall, y runs DOWN the table (towards the
 * flippers), the ball's radius is 7. The playfield is mirrored about x = 125 below the orbits; the shooter lane is the
 * strip on the right (x 244-266).
 *
 * Kinds: walls (capsules: a line with a radius), the top arch (the upper half of a circle, the ball inside it), posts,
 * pop bumpers, slingshots (the face towards the playfield kicks), flippers, a one-way gate at the top of the shooter
 * lane, five drop targets in front of the hangar (a saucer that holds the ball), the warp ramp (a path with a height:
 * the ball leaves the playfield and follows it), and sensors (rollovers the ball crosses). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PinTable = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var W = 270, H = 446, BALL = 7, MID = 125;
  function mx(x) { return 2 * MID - x; }   // the mirror image across the playfield's middle

  // ------------------------------------------------------------ walls: [ax, ay, bx, by, radius, bounce, kind]
  // kind: 'wall' (metal guide), 'rubber' (a livelier bounce), 'post'
  var walls = [
    // the cabinet's sides and the shooter lane's inner wall; beside the orbits they are dead (a ball shot into an orbit
    // turns up it along the wall instead of bouncing back across the mouth)
    [6, 136, 6, 262, 2, 0.15, 'wall'], [6, 262, 6, 446, 2, 0.35, 'wall'],      // the left side of the cabinet
    [266, 136, 266, 446, 2, 0.35, 'wall'],                                     // the right side (the shooter lane's outer wall)
    [244, 152, 244, 262, 2, 0.15, 'wall'], [244, 262, 244, 446, 2, 0.35, 'wall'],   // the shooter lane's inner wall
    // the orbits' inner walls (their outer walls are the cabinet's side and the shooter lane). They stop well above the
    // orbits' feet, so each orbit's mouth is wide and faces the opposite flipper
    [30, 148, 30, 206, 2, 0.35, 'wall'],
    [mx(30), 148, mx(30), 206, 2, 0.35, 'wall'],
    // the hangar's roof (it slopes down to the left orbit, so nothing ever rests on it). Dead underneath: a ball shot
    // into the hangar loses its bounce on it and drops to the saucer instead of rattling straight back out
    [30, 148, 106, 130, 2, 0.1, 'wall'],
    // the warp ramp's entrance lane
    [106, 130, 106, 218, 2, 0.35, 'wall'],
    [134, 150, 134, 218, 2, 0.35, 'wall'],
    // the top lanes' guides
    // (kept clear of the arch: a ball riding round it passes over them with room to spare, never wedges on one)
    [146, 68, 146, 88, 2, 0.45, 'post'],
    [170, 68, 170, 88, 2, 0.45, 'post'],
    [194, 68, 194, 88, 2, 0.45, 'post'],
    [218, 68, 218, 88, 2, 0.45, 'post'],
    // outlane / inlane dividers and the inlane floors that feed the flippers. Each lane is 17 clear (the ball is 14),
    // so a ball can never wedge across one. Each floor passes just over the top of its flipper's pivot and ends inside
    // the flipper, so a slow ball rolls straight on to the flipper (no little dip at the joint for it to sit in)
    [27, 318, 27, 380, 2, 0.4, 'wall'],
    [27, 380, 76, 399, 2, 0.3, 'wall'],
    [49, 316, 46, 282, 2, 0.2, 'wall'],                // the inlane's guide above the sling: an orbit's return drops in
    [mx(49), 316, mx(46), 282, 2, 0.2, 'wall'],
    [mx(27), 318, mx(27), 380, 2, 0.4, 'wall'],
    [mx(27), 380, mx(76), 399, 2, 0.3, 'wall']
  ];
  var posts = [   // [x, y, radius, bounce]
    [27, 318, 2.5, 0.6], [mx(27), 318, 2.5, 0.6],      // the rubber posts between outlane and inlane
    [106, 218, 2.5, 0.55], [134, 218, 2.5, 0.55]       // the ramp lane's mouth
  ];
  // the top arch: centre, radius (of the wall's line), the wall's radius; the ball runs round the inside of its top half
  var arch = { x: 136, y: 136, R: 130, r: 2, e: 0.3 };

  // ------------------------------------------------------------ pop bumpers (the orbs) and slingshots
  var bumpers = [   // [x, y, radius]
    [156, 124, 12], [202, 118, 12], [180, 160, 12]
  ];
  // slingshots: the triangle's corners top, bottom, flipper end; the face from top to flipper end kicks
  var slings = [
    { side: -1, a: [49, 316], b: [49, 358], c: [71, 376] },
    { side: 1, a: [mx(49), 316], b: [mx(49), 358], c: [mx(71), 376] }
  ];

  // ------------------------------------------------------------ flippers (angles in radians, y down: + is below horizontal)
  var D30 = 30 * Math.PI / 180, D22 = 22 * Math.PI / 180;
  var flippers = [
    { side: -1, x: 74, y: 404, len: 40, r0: 6.5, r1: 3.5, rest: D30, up: -D22 },
    { side: 1, x: mx(74), y: 404, len: 40, r0: 6.5, r1: 3.5, rest: Math.PI - D30, up: Math.PI + D22 }
  ];

  // ------------------------------------------------------------ the shooter lane, its plunger and the one-way gate
  // the plunger's launch speed for each pull (0-1), in units a second on Classic (the other speeds scale it with the
  // table's slope, so a pull lands in the same place on all three). Measured with tools/pinball/plunger.cjs: under ~595
  // the ball falls back; ~600-685 it drops off the arch into the bumpers; ~688-723 it falls into a top lane (right,
  // middle, left: the skill shot); faster goes all round the arch and down the left orbit. The curve spreads that narrow
  // top-lane band over about a quarter of the pull. auto: a quick tap (and ball save) fires this: off the arch, on to the
  // gate and down the right orbit to the right flipper (a safe, medium shot).
  var shooter = { x0: 244, x1: 266, cx: 255, tip: 428, travel: 14,   // (tip and pull kept above the table's bottom edge, so the ball never drops out of the picture)
    curve: [[0, 450], [0.12, 555], [0.25, 613], [0.5, 679], [0.75, 719], [1, 1000]], auto: 640 };
  // one-way gates: [ax, ay, bx, by, radius, a point on the side they block]. A ball on that side moving into the gate
  // bounces off it; from the other side it swings open.
  //  - the top of the shooter lane: a launched ball goes up through; one coming down rolls off to the left
  //  - the foot of each orbit: a ball coming DOWN the orbit is turned into the inlane, not the outlane; going UP (the
  //    kickback firing a ball back up the left outlane) it opens, so the saved ball carries on up the orbit
  // (the shooter gate is dead: an orbit ball coming fast round the arch slides off it into the right orbit, it doesn't
  // bounce back across the top of the table)
  var gates = [
    [244, 152, 266, 140, 1.5, 255, 120, 0.02],
    [6, 262, 22, 292, 2, 20, 268],
    [244, 262, mx(22), 292, 2, mx(20), 268]
  ];

  // ------------------------------------------------------------ the hangar: five drop targets in front of a saucer
  var drops = { a: [37, 203], b: [95, 164], n: 5, r: 2.5 };
  // catchR: a ball whose centre passes this close, slower than maxV (units a second), drops in; hold: steps (60 a second)
  var saucer = { x: 56, y: 172, catchR: 11, maxV: 1800, hold: 75, eject: [330, 640] };
  // the hangar pocket (behind the targets), for "is a ball still in there?" before the targets come back up
  var pocket = [[30, 148], [106, 130], [106, 168], [95, 164], [37, 203], [30, 207]];

  // ------------------------------------------------------------ the warp ramp: [x, y, height]; the ball leaves the playfield
  // where it crosses the entrance line going up, and lands in the left inlane at the far end. Too slow and it rolls back.
  var ramp = {
    entry: { y: 205, x0: 108, x1: 132 },
    path: [
      [120, 205, 0], [120, 172, 12], [119, 142, 28], [114, 112, 38], [102, 86, 40], [84, 66, 40], [62, 55, 40], [42, 58, 40],
      [28, 74, 40], [19, 100, 40], [15, 140, 38], [15, 190, 30], [19, 238, 18], [27, 276, 6], [35, 300, 0]
    ],
    width: 22
  };

  // ------------------------------------------------------------ sensors the ball rolls over
  // circles: [id, x, y, radius]; lines: [id, ax, ay, bx, by] (crossed in either direction)
  var sensors = {
    circles: [
      ['lane0', 158, 79, 7], ['lane1', 182, 79, 7], ['lane2', 206, 79, 7],
      ['inL', 38, 342, 8], ['inR', mx(38), 342, 8],
      ['outL', 16, 392, 8], ['outR', mx(16), 392, 8],
      ['kick', 16, 424, 8]
    ],
    lines: [
      ['spin', 8, 196, 28, 196],        // the comet spinner, across the left orbit
      ['orbR', mx(28), 196, mx(8), 196] // the right orbit's rollover
    ]
  };

  return {
    W: W, H: H, BALL: BALL, MID: MID,
    walls: walls, posts: posts, arch: arch, bumpers: bumpers, slings: slings, flippers: flippers,
    shooter: shooter, gates: gates, drops: drops, saucer: saucer, pocket: pocket, ramp: ramp, sensors: sensors
  };
});
