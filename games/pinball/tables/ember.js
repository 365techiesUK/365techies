/* 365 Pinball Hero - Ember Peak, as data (16 Oct 2026, the next-gen "fast track"; ONE SCREEN, 29 Oct 2026). A sunny
 * volcano island waking up: bright blue sky, turquoise sea, black rock, glowing orange lava. Our own table, names and
 * theme.
 *
 * Shared by the rules and physics (engine.js) and the pictures, in the same units and kinds as the old space table
 * (table.js): 270 wide, 470 tall (one screen: the owner's call of 29 Oct 2026, so the home view is full size on a
 * phone), y runs DOWN the table, the ball's radius is 7, the playfield is mirrored about x = 125 and the shooter lane is
 * the strip on the right (x 244-266).
 *
 * ONE STOREY, one pair of flippers (storeys below; the camera relies on them). The lower part is the old tested table's
 * (flippers, slings, inlanes, outlanes, kickback), moved 24 down. Above it, left to right:
 *  - the left ORBIT (with the spinner) and, inside it, the left LAVA LANE behind its gate;
 *  - the VOLCANO, a cone in the upper left middle with its crater mouth facing the flippers, and under it, out in the
 *    open, the STEAM GEYSER and a magma crab walking;
 *  - the HEAT RAMP's lane, right of the middle, climbing over the fumaroles and down over the right orbit into the
 *    right inlane;
 *  - the OBSIDIAN drop targets across the foot of the vent (a channel between the ramp lane and the right lava lane,
 *    down which the fumaroles drop the ball on to the vent's floor, which rolls it out to the right). Below them a
 *    second crab walks across in front of the right orbit's mouth;
 *  - the three FUMAROLES (pop bumpers) and the three skill lanes top right, the right lava lane and the right orbit.
 *
 * Toys (data here, stepped by the engine's clock; their state is in W.toys for the pictures):
 *  volcano - a cone with a crater: a firm shot into its mouth is held 2.75 s, then carried skyward (carries.sky) and
 *            down the WIRE RAIL along the left side into the left inlane. Rises with pressure (picture only).
 *  geyser  - a steam column: catches a slow ball, puffs (a warning), then flings it up into the skill lanes.
 *  crabs   - magma crabs: small round targets walking set paths, never in the approach zone, never into a ball.
 *  lava    - two gates across the lava lanes, down (one-way: a ball can always come out) until a full eruption raises
 *            them for a frenzy.
 *  quake   - a brief tilt of gravity, only while no ball is below the approach line.
 * Nothing here is a real table's layout, toy or name. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.PinTables = root.PinTables || {}; root.PinTables.ember = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var W = 270, H = 470, BALL = 7, MID = 125, DY = 24;   // DY: the lower part is the old table's, this far down
  function mx(x) { return 2 * MID - x; }
  var PI = 3.141592653589793, D30 = 30 * PI / 180, D22 = 22 * PI / 180;

  // ------------------------------------------------------------ walls: [ax, ay, bx, by, radius, bounce, kind]
  var walls = [
    // the cabinet's sides and the shooter lane's inner wall (dead beside the orbits, so a ball turns up them)
    [6, 136, 6, 286, 2, 0.15, 'wall'], [6, 286, 6, H, 2, 0.35, 'wall'],
    [266, 136, 266, H, 2, 0.35, 'wall'],
    [244, 152, 244, 286, 2, 0.15, 'wall'], [244, 286, 244, H, 2, 0.35, 'wall'],
    // below the table's bottom edge (never drawn): a draining ball can't slip along under the flippers into the lane
    [244, H, 244, H + 40, 2, 0.35, 'apron'], [6, H, 6, H + 40, 2, 0.35, 'apron'], [266, H, 266, H + 40, 2, 0.35, 'apron'],
    // the orbits' inner walls (also the lava lanes' outer walls: dead beside them, so a ball shot into one turns up it)
    [30, 150, 30, 214, 2, 0.15, 'wall'], [30, 214, 30, 232, 2, 0.35, 'wall'],
    [mx(30), 150, mx(30), 214, 2, 0.15, 'wall'], [mx(30), 214, mx(30), 232, 2, 0.35, 'wall'],
    // the lava lanes: each runs up inside its orbit into the arch, its mouth at the bottom (beside the orbit's, a
    // steeper shot) with the lava gate across it
    [54, 150, 54, 222, 2, 0.3, 'wall'], [mx(54), 150, mx(54), 222, 2, 0.3, 'wall'],
    // the skill lanes' guides under the arch
    [146, 68, 146, 88, 2, 0.45, 'post'], [170, 68, 170, 88, 2, 0.45, 'post'],
    [194, 68, 194, 88, 2, 0.45, 'post'], [218, 68, 218, 88, 2, 0.45, 'post'],
    // the heat ramp's lane
    [128, 204, 128, 244, 2, 0.35, 'wall'], [154, 212, 154, 244, 2, 0.35, 'wall'],
    // the vent's floor: just behind the obsidian targets (closer than a ball, so nothing gets in behind them), sloping
    // down from the ramp lane to the right, where a ball dropped down the vent rolls off into the field
    [154, 229.8, 190.6, 241.9, 2, 0.3, 'wall'],
    // the lower part: outlane / inlane dividers, the inlane floors and the inlane guides (the old table's, moved down)
    [27, 318 + DY, 27, 380 + DY, 2, 0.4, 'wall'], [27, 380 + DY, 76, 399 + DY, 2, 0.3, 'wall'],
    [49, 316 + DY, 46, 282 + DY, 2, 0.2, 'wall'], [mx(49), 316 + DY, mx(46), 282 + DY, 2, 0.2, 'wall'],
    [mx(27), 318 + DY, mx(27), 380 + DY, 2, 0.4, 'wall'], [mx(27), 380 + DY, mx(76), 399 + DY, 2, 0.3, 'wall']
  ];
  var posts = [   // [x, y, radius, bounce]
    [27, 318 + DY, 2.5, 0.6], [mx(27), 318 + DY, 2.5, 0.6],
    [128, 244, 2.5, 0.55], [154, 244, 2.5, 0.55]
  ];
  var arch = { x: 136, y: 136, R: 130, r: 2, e: 0.3 };

  // the fumaroles (pop bumpers), under the skill lanes; the slingshots
  var bumpers = [[156, 124, 12], [202, 118, 12], [180, 160, 12]];
  var slings = [
    { side: -1, a: [49, 316 + DY], b: [49, 358 + DY], c: [71, 376 + DY] },
    { side: 1, a: [mx(49), 316 + DY], b: [mx(49), 358 + DY], c: [mx(71), 376 + DY] }
  ];

  // ------------------------------------------------------------ flippers (the old table's pair)
  var flippers = [
    { side: -1, x: 74, y: 404 + DY, len: 40, r0: 6.5, r1: 3.5, rest: D30, up: -D22, storey: 0 },
    { side: 1, x: mx(74), y: 404 + DY, len: 40, r0: 6.5, r1: 3.5, rest: PI - D30, up: PI + D22, storey: 0 }
  ];
  // one storey: its flippers, the area, and the approach line (a ball below it can soon reach the flippers)
  var storeys = [
    { id: 'island', name: 'EMBER PEAK', flippers: [0, 1], x0: 0, x1: 244, y0: 0, y1: H, approach: 300 + DY }
  ];

  // ------------------------------------------------------------ the shooter lane, its gate, the orbits' foot gates
  // the plunger's launch speed for each pull (units a second on Classic), measured with tools/pinball/plunger.cjs: under
  // ~612 the ball falls back; ~612-703 it drops off the arch's shoulder down the right orbit to the right inlane;
  // ~704-739 it falls into a skill lane (right, middle, left); from ~756 it goes all round the arch and down the left
  // orbit. The curve spreads the narrow lane band over 0.3 of the pull. auto: a quick tap (and ball save) fires this: down the right orbit to the right flipper (a safe, medium shot).
  var shooter = { x0: 244, x1: 266, cx: 255, tip: 428 + DY, travel: 14,
    curve: [[0, 470], [0.12, 575], [0.25, 640], [0.45, 698], [0.5, 704], [0.8, 740], [0.83, 758], [1, 1020]], auto: 660 };
  var gates = [
    [244, 152, 266, 140, 1.5, 255, 120, 0.02],
    [6, 262 + DY, 22, 292 + DY, 2, 20, 268 + DY],
    [244, 262 + DY, mx(22), 292 + DY, 2, mx(20), 268 + DY]
  ];

  // ------------------------------------------------------------ the obsidian drop targets (three, across the vent's foot,
  // facing the left flipper, the vent's floor right behind them)
  var drops = { a: [157, 236], b: [187, 246], n: 3, r: 2.5 };

  // ------------------------------------------------------------ the heat ramp: from right of the middle up over the
  // fumaroles and down over the right orbit into the right inlane (a path with a height: too slow and it rolls back out)
  var ramp = {
    entry: { y: 238, x0: 130, x1: 152 },
    path: [
      [141, 238, 0], [141, 212, 10], [143, 186, 22], [150, 164, 32], [164, 148, 40], [184, 140, 46], [204, 140, 48],
      [222, 146, 48], [232, 162, 46], [234, 190, 40], [234, 230, 30], [231, 262, 18], [223, 300, 6], [215, 324, 0]
    ],
    width: 22,
    exitMax: 450   // the fastest it comes off the far end (Classic, scaled with the slope): a held-up flipper catches it
  };

  // ------------------------------------------------------------ the volcano and its crater
  // mouth: the crater takes a ball whose contact is within `half` degrees of the mouth's direction (down the table,
  // towards the flippers) and that comes in at least catchV (units a second, Classic); a softer touch bounces.
  // hold: steps (60 a second) in the crater before the carry. carry: which path the ball is fired along.
  // Wave 3 (5 Nov 2026): the hold depends on what the shot takes - hold (ERUPT: the full show), holdLit (a lit award:
  // LOCK, MODE, DIVE, the boss), holdSuper (the SUPER JACKPOT), holdPlain (nothing lit) - and every carry but the
  // eruption's rides `rail` times faster. While anything is lit the mouth is wider (halfLit degrees) and takes a softer
  // shot (catchLit). diveCap: steps a DIVE ball is held if nothing calls E.api.release.
  var volcano = { x: 84, y: 118, r: 22, e: 0.25, mouth: [0.2, 1], half: 15, catchV: 300, hold: 165, carry: 'sky',
    halfLit: 25, catchLit: 200, holdLit: 72, holdSuper: 30, holdPlain: 36, rail: 1.75, diveCap: 300 };

  // ------------------------------------------------------------ carries: timed paths the ball rides out of play
  // [x, y, height, step from the start]; out: the ball's speed when it is let go at the end (Classic); railAt: the
  // step it lands on the wire rail. The crater's: skyward out of the crater, over the left side and down the wire rail
  // (above the left orbit) into the left inlane, never in the approach zone until it is let go.
  var carries = {
    sky: {
      pts: [
        [84, 118, 0, 0], [82, 112, 30, 8], [76, 100, 90, 22], [66, 86, 145, 38], [52, 76, 172, 54], [36, 76, 172, 70],
        [24, 86, 150, 86], [16, 104, 112, 100], [14, 128, 72, 112],
        [14, 180, 60, 124], [15, 230, 46, 138], [17, 270, 32, 150], [23, 300, 16, 162], [30, 316, 6, 170], [35, 324, 0, 175]
      ],
      railAt: 112, out: [120, 360]
    }
  };

  // ------------------------------------------------------------ the steam geyser (under the volcano, above the approach line)
  // a ball slower than catchV inside r is caught; it puffs for `puff` steps (the warning), then is flung (Classic
  // speed) up past the volcano into the skill lanes; the geyser rests `cool` steps before it can catch again
  var geyser = { x: 104, y: 204, r: 10, catchV: 260, puff: 24, fling: [420, -900], cool: 360 };

  // ------------------------------------------------------------ the magma crabs: round targets walking set paths
  // path: the two ends; speed: units a second (Classic); pause: steps at each end; u0: where each starts (0-1);
  // stun: steps a hit crab stays still. Each path keeps well clear of every wall and of the approach zone.
  var crabs = [
    { path: [[124, 150], [150, 150]], r: 7, e: 0.4, speed: 20, pause: 40, u0: 0, stun: 150 },
    { path: [[74, 252], [96, 252]], r: 7, e: 0.4, speed: 16, pause: 50, u0: 0.5, stun: 150 }
  ];

  // ------------------------------------------------------------ the lava gates: [ax, ay, bx, by, radius, a point on the side
  // they block when down]. Down, each is one-way (a ball inside its lane always comes out); raised, the lane is open.
  // time: steps the gates stay up after a full eruption; anim: steps the picture takes to raise or lower them.
  var lava = { gates: [[30, 222, 54, 222, 2, 42, 234], [mx(30), 222, mx(54), 222, 2, mx(42), 234]], time: 1200, anim: 30 };

  // the quake: gravity tips sideways by up to amp of the slope's pull, for `time` steps, only while no ball is below
  // the approach line (it waits; and it stops at once if a ball gets there)
  var quake = { amp: 0.16, time: 48 };

  // the OBSIDIAN PLUG: a post between the flippers' tips, raised by the obsidian drop bank for `time` steps or one
  // save (any touch kicks the ball back up the middle at `kick`, Classic speed); the quake drops it
  var plug = { x: 125, y: 451, r: 4.5, kick: 1050, time: 1200 };

  // ------------------------------------------------------------ sensors: circles [id, x, y, r]; lines [id, ax, ay, bx, by]
  var sensors = {
    circles: [
      ['lane0', 158, 79, 7], ['lane1', 182, 79, 7], ['lane2', 206, 79, 7],
      ['inL', 38, 342 + DY, 8], ['inR', mx(38), 342 + DY, 8],
      ['outL', 16, 392 + DY, 8], ['outR', mx(16), 392 + DY, 8],
      ['kick', 16, 424 + DY, 8]
    ],
    lines: [
      ['spin', 8, 196 + DY, 28, 196 + DY], ['orbR', mx(28), 196 + DY, mx(8), 196 + DY],
      ['lavaL', 32, 158, 52, 158], ['lavaR', mx(52), 158, mx(32), 158]
    ]
  };

  // ------------------------------------------------------------ the rules' numbers
  var points = {
    bumper: 5000, sling: 1000, spin: 10000, drop: 25000, drops: 500000, ramp: 400000, orbit: 250000, loop: 750000,
    lane: 25000, inlane: 10000, outlane: 50000, skill: 1000000, saucer: 0, saucerLit: 0,
    crater: 500000, pressure: 3000000, eruption: 5000000, crab: 150000, geyser: 250000, lava: 2000000, lanesDone: 500000, rail: 100000,
    jackpot: 5000000, jackpotUp: 1000000
  };
  // pressure each shot adds. THE BIG ONE (wave 3, 5 Nov 2026): an eruption needs ladder[n] (the n-th eruption; the last
  // rung for every one after); LOCK lights at lockAt of it, the volcano RUMBLES at rumble, the warning comes at +warn
  // and the quake (the bust) at +bust, leaving after x the rung. full: the old fixed threshold (the ladder's fallback).
  var pressure = { orbit: 0.08, loop: 0.12, ramp: 0.12, drop: 0.03, drops: 0.15, crab: 0.06, geyser: 0.05, skill: 0.1,
    lava: 0.05, bumper: 0.02, lane: 0.02, full: 1, ladder: [0.5, 0.75, 1, 1.25], lockAt: 0.5, rumble: 0.75, warn: 0.25, bust: 0.5, after: 0.6 };
  var names = { ramp: 'HEAT RAMP', drops: 'OBSIDIAN', dropsSub: 'KICKBACK LIT', dropsPlug: 'PLUG UP', orbit: 'ORBIT', loop: 'LOOP' };
  var extra = { 1: [10000000, 30000000, 80000000], 2: [20000000, 60000000, 150000000], 3: [25000000, 80000000, 200000000] };

  return {
    id: 'ember', name: 'Ember Peak', rules: 'ember',
    W: W, H: H, BALL: BALL, MID: MID,
    walls: walls, posts: posts, arch: arch, bumpers: bumpers, slings: slings, flippers: flippers, storeys: storeys,
    shooter: shooter, gates: gates, drops: drops, ramp: ramp, sensors: sensors,
    volcano: volcano, carries: carries, geyser: geyser, crabs: crabs, lava: lava, quake: quake, plug: plug,
    points: points, pressure: pressure, names: names, extra: extra, bonusScale: 50, dropsBack: 120,
    // the closed spaces no ball can reach (for the sim tools' "free spot" check): none on this table
    voids: []
  };
});
