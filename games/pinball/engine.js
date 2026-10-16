/* 365 Pinball Hero - the rules and the physics (15 Oct 2026, milestone 1; 16 Oct 2026, any table). No drawing here, so
 * the tests run it in node (engine.test.mjs). The arcade cabinet (../common/arcade.js) calls step() 60 times a second;
 * each step runs the physics 10 times (600 a second), small enough that a fast ball never passes through a wall or a
 * flipper. Everything is worked out from the world and the player's buttons alone - no Math.random, and no Math.sin,
 * Math.cos or Math.pow either (browsers may round those differently: sin/cos below are our own, from + - * / only) -
 * so a game with the same seed and the same presses plays out the same everywhere (the playtest farm, the film
 * captures and the camera's look-ahead rely on it). E.clone(W) is a deep copy that steps identically.
 *
 * TABLES ARE DATA. table.js is the old space table ("orbit"); tables/ember.js is Ember Peak. E.newWorld(speed, set,
 * seed, tableId) plays any of them (the game's default is Ember Peak when its file is loaded, else orbit); W.tableId
 * says which; E.table(id) is that table built into things the ball can hit (cached). E.TABLE, RAMP, DROPS, GATES,
 * WALLS, POSTS, BUMPERS, W and H are still the orbit table's, for the old pictures.
 *
 * The ball rolls on a sloping table: "gravity" is the slope's pull down the table, and the speed setting is the slope
 * (Gentle is flatter, so slower; Fast steeper). Flippers are driven: a pressed flipper swings up hard and a hit ball
 * takes the flipper's own speed at the point it touches. A table can have any number of flippers: the left button
 * works every flipper with side -1, the right every one with side 1. Ramps are paths with a height: the ball leaves
 * the playfield and runs along, slowed by the climb; too slow and it rolls back out. Carries are timed paths the ball
 * rides out of play (the volcano's sky shot and wire rail).
 *
 * The toy kit (any table can use it; Ember Peak uses all of it). Each toy is a small state machine stepped by the
 * engine's clock, its state in W.toys for the pictures:
 *  - a crater (W.toys.volcano): a firm shot into its mouth is held for a set number of steps (the release step is
 *    known: W.toys.volcano.release), then carried along a path into an inlane; pressure (0-1.5) rises with shots
 *    and the crater collects it ("rise" is the picture's height for the cone, 0-1);
 *  - a force column (W.toys.geyser): catches a slow ball, puffs (a warning), flings it on;
 *  - moving posts (W.toys.crabs): round targets walking set paths, which never move into a ball;
 *  - moving walls (W.toys.lava): gates that rise to open a lane, and only come down when no ball is in the way
 *    (down, they are one-way, so a ball behind one always gets out);
 *  - gravity tilt (W.toys.quake): a brief sideways pull, only while no ball is below any storey's approach line.
 * Storeys (W.storeys): each storey's flippers, area and approach line; E.inApproach(W, ball) says which storey's
 * approach zone a ball is in.
 *
 * Tuned by simulation (tools/pinball, see its README): thousands of balls dropped anywhere never get stuck, every major
 * shot can be made from a flipper with a fair timing window, the plunger's pull maps to fall back / bumpers / skill
 * lanes / round the arch. The speed setting scales every speed and push with the slope, so Gentle and Fast are the
 * same table in slower or faster motion (the same shot makes the same target on all three).
 *
 * The game reports what happened in world.events (sound names and {say} for screen readers), shows messages on the
 * dot-matrix display (world.dmd) and keeps light timers in world.lit for the pictures. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./table.js'), require('./tables/ember.js'));
  else root.PinEngine = factory(root.PinTable, root.PinTables && root.PinTables.ember);
})(typeof self !== 'undefined' ? self : this, function (ORBIT, EMBER) {
  'use strict';
  var SUB = 10, DT = 1 / 600;
  // the speeds: the table's slope (gravity), balls a game, seconds of ball save, kickback lit again on every ball
  var SPEEDS = {
    1: { name: 'Gentle', g: 470, balls: 5, save: 15, kick: true, extra: [150000, 400000, 1000000] },
    2: { name: 'Classic', g: 590, balls: 3, save: 10, kick: false, extra: [250000, 750000, 2000000] },
    3: { name: 'Fast', g: 720, balls: 3, save: 6, kick: false, extra: [300000, 1000000, 3000000] }
  };
  // Everything below is set for Classic (g 590: a 6.5 degree slope, as on a real table). Gentle and Fast are the same
  // table in slower and faster motion: every speed, push and swing is scaled with the slope (tuning() below). 270 units
  // = a real table's 20.25 in, so 1 unit = 1.9 mm and 525 units a second = 1 m/s.
  var G0 = 590;
  var VMAX = 2600;           // the fastest a ball ever goes (units a second; ~5 m/s)
  var ROLL = 0.08;           // rolling loss, a share of the speed a second
  var REST = 40;             // slower than this into a surface, and the ball doesn't bounce (it rolls along)
  // flipper swing speeds (radians a second), how fast it gets there, bounce, and the rubber's grip on a slow ball
  var FLIP = { up: 42, down: 20, acc: 6000, e: 0.35, grip: 4 };
  // what a pop bumper, a slingshot and the kickback give the ball (units a second: 800 = 1.5 m/s)
  var BUMP = 800, SLING = 700, KICKBACK = 1250;
  var GZ = 3000;             // a ramp's climb: how hard each unit of height pulls the ball back
  var RAMP_FRICTION = 70;
  var STILL_SECS = 3;        // a ball that hasn't moved for this long (and isn't being held on a flipper) is shaken loose
  var DISH = 1400, DISH_DRAG = 4;   // the old table's hangar floor dishes down into its saucer
  var TUNES = {}, K = null;   // the scaled set for each slope (made once), and the one for the world being stepped
  function tuning(g) {
    var t = TUNES[g];
    if (t) return t;
    var k = Math.sqrt(g / G0), k2 = g / G0;
    return (TUNES[g] = {
      k: k, vmax: VMAX * k, roll: ROLL * k, rest: REST * k, up: FLIP.up * k, down: FLIP.down * k, acc: FLIP.acc * k2,
      grip: FLIP.grip * k, bump: BUMP * k, sling: SLING * k, kick: KICKBACK * k, gz: GZ * k2, rampF: RAMP_FRICTION * k2,
      dish: DISH * k2, drag: DISH_DRAG * k
    });
  }
  var PTS = {
    bumper: 100, sling: 10, spin: 100, drop: 500, drops: 5000, saucer: 2500, saucerLit: 15000, ramp: 5000, orbit: 2500, loop: 7500,
    lane: 1000, inlane: 500, outlane: 2000, skill: 25000, lanesDone: 25000, rail: 0
  };
  var NAMES = { ramp: 'WARP RAMP', drops: 'HANGAR OPEN', dropsSub: 'SHOOT IT FOR 15,000', orbit: 'ORBIT', loop: 'LOOP' };

  // ------------------------------------------------------------ our own sin and cos (arithmetic only: the same everywhere)
  var PI = 3.141592653589793, TAU = 6.283185307179586, HPI = 1.5707963267948966;
  var S3 = -1 / 6, S5 = 1 / 120, S7 = -1 / 5040, S9 = 1 / 362880, S11 = -1 / 39916800, S13 = 1 / 6227020800,
    S15 = -1 / 1307674368000, S17 = 1 / 355687428096000, S19 = -1 / 121645100408832000, S21 = 1 / 51090942171709440000;
  function sin(x) {
    x -= TAU * Math.floor(x / TAU + 0.5);                 // -pi .. pi
    if (x > HPI) x = PI - x; else if (x < -HPI) x = -PI - x;   // -pi/2 .. pi/2 (sin(pi - x) = sin x)
    var x2 = x * x;
    return x * (1 + x2 * (S3 + x2 * (S5 + x2 * (S7 + x2 * (S9 + x2 * (S11 + x2 * (S13 + x2 * (S15 + x2 * (S17 + x2 * (S19 + x2 * S21))))))))));
  }
  function cos(x) { return sin(x + HPI); }

  // ------------------------------------------------------------ the tables, each built once into things the ball can hit
  var TABLES = { orbit: ORBIT }, BUILT = {};
  if (EMBER) TABLES.ember = EMBER;
  var DEFAULT = TABLES.ember ? 'ember' : 'orbit';
  function seg(ax, ay, bx, by, r, e, kind) { var dx = bx - ax, dy = by - ay; return { ax: ax, ay: ay, bx: bx, by: by, dx: dx, dy: dy, l2: dx * dx + dy * dy || 1, r: r, e: e, kind: kind }; }
  function oneWay(g, e) {   // a gate [ax, ay, bx, by, r, px, py, e?] with the normal that points to the side it blocks
    var s = seg(g[0], g[1], g[2], g[3], g[4], g[7] == null ? e : g[7], 'gate'), l = Math.sqrt(s.l2), nx = -s.dy / l, ny = s.dx / l;
    if ((g[5] - g[0]) * nx + (g[6] - g[1]) * ny < 0) { nx = -nx; ny = -ny; }
    s.nx = nx; s.ny = ny; return s;
  }
  function measure(P, timed) {   // a path's length along it (and, for a carry, nothing more: it is timed)
    var s = [0];
    for (var i = 1; i < P.length; i++) { var dx = P[i][0] - P[i - 1][0], dy = P[i][1] - P[i - 1][1]; s.push(s[i - 1] + Math.sqrt(dx * dx + dy * dy)); }
    return s;
  }
  function build(T) {
    var B = { T: T, id: T.id };
    var WALLS = T.walls.map(function (w) { return seg(w[0], w[1], w[2], w[3], w[4], w[5], w[6]); });
    T.slings.forEach(function (s, i) {   // two rubber sides, and the kicking face
      WALLS.push(seg(s.a[0], s.a[1], s.b[0], s.b[1], 2.5, 0.55, 'rubber'));
      WALLS.push(seg(s.b[0], s.b[1], s.c[0], s.c[1], 2.5, 0.55, 'rubber'));
      var k = seg(s.a[0], s.a[1], s.c[0], s.c[1], 2.5, 0.55, 'sling'); k.i = i;
      var nx = -k.dy, ny = k.dx, l = Math.sqrt(k.l2); nx /= l; ny /= l;   // the kicking face's normal points out into the playfield
      if ((T.MID - s.a[0]) * nx < 0) { nx = -nx; ny = -ny; }
      k.nx = nx; k.ny = ny; WALLS.push(k);
    });
    B.WALLS = WALLS;
    B.POSTS = T.posts.map(function (p) { return { x: p[0], y: p[1], r: p[2], e: p[3] }; });
    B.BUMPERS = T.bumpers.map(function (b, i) { return { x: b[0], y: b[1], r: b[2], i: i }; });
    B.GATES = T.gates.map(function (g) { return oneWay(g, 0.3); });
    B.DROPS = (function () {   // the targets along the line, with a little gap between each
      var d = T.drops, out = [];
      if (!d) return out;
      var ax = d.a[0], ay = d.a[1], dx = d.b[0] - ax, dy = d.b[1] - ay, gap = 0.035;
      var l = Math.sqrt(dx * dx + dy * dy), fx = dy / l, fy = -dx / l;   // the front (the playfield side)
      if (fx * 1 + fy * 1 < 0) { fx = -fx; fy = -fy; }
      for (var i = 0; i < d.n; i++) {
        var t0 = i / d.n + gap, t1 = (i + 1) / d.n - gap, s = seg(ax + dx * t0, ay + dy * t0, ax + dx * t1, ay + dy * t1, d.r, 0.3, 'drop');
        s.i = i; s.fx = fx; s.fy = fy; out.push(s);
      }
      return out;
    })();
    B.RAMP = T.ramp ? (function () { var s = measure(T.ramp.path); return { P: T.ramp.path, s: s, L: s[s.length - 1], entry: T.ramp.entry }; })() : null;
    B.CARRY = {};
    Object.keys(T.carries || {}).forEach(function (k) {
      var C = T.carries[k];
      B.CARRY[k] = { P: C.pts, end: C.pts[C.pts.length - 1][3], railAt: C.railAt == null ? -1 : C.railAt, out: C.out };
    });
    B.PBOX = T.pocket ? T.pocket.reduce(function (m, p) { return [Math.min(m[0], p[0]), Math.min(m[1], p[1]), Math.max(m[2], p[0]), Math.max(m[3], p[1])]; }, [1e9, 1e9, -1e9, -1e9]) : null;
    B.LAVA = T.lava ? T.lava.gates.map(function (g) { return oneWay(g, 0.3); }) : [];
    if (T.volcano) {
      var V = T.volcano, ml = Math.sqrt(V.mouth[0] * V.mouth[0] + V.mouth[1] * V.mouth[1]);
      B.VOLC = { x: V.x, y: V.y, r: V.r, e: V.e, mx: V.mouth[0] / ml, my: V.mouth[1] / ml, cosHalf: cos(V.half * PI / 180), catchV: V.catchV, hold: V.hold, carry: V.carry };
    } else B.VOLC = null;
    B.GEY = T.geyser || null;
    B.CRABS = (T.crabs || []).map(function (c) { var dx = c.path[1][0] - c.path[0][0], dy = c.path[1][1] - c.path[0][1]; return { d: c, len: Math.sqrt(dx * dx + dy * dy) || 1 }; });
    B.QUAKE = T.quake || null;
    B.PTS = {}; Object.keys(PTS).forEach(function (k) { B.PTS[k] = PTS[k]; });
    Object.keys(T.points || {}).forEach(function (k) { B.PTS[k] = T.points[k]; });
    B.NAMES = {}; Object.keys(NAMES).forEach(function (k) { B.NAMES[k] = NAMES[k]; });
    Object.keys(T.names || {}).forEach(function (k) { B.NAMES[k] = T.names[k]; });
    B.PRESS = T.pressure || null;
    B.BS = T.bonusScale || 1;
    B.storeys = T.storeys;
    B.rampAt = function (sv) { return rampAtR(B.RAMP, sv); };
    B.carryAt = function (name, f) { return carryAtR(B.CARRY[name], f); };
    B.inPocket = function (x, y) { return inPocketR(B, x, y); };
    return B;
  }
  function table(id) { id = TABLES[id] ? id : DEFAULT; return BUILT[id] || (BUILT[id] = build(TABLES[id])); }
  function rampAtR(R, sv) {   // {x, y, z, tx, ty, dz} at a distance along a ramp
    var P = R.P, S = R.s, i = 1;
    sv = Math.max(0, Math.min(R.L, sv));
    while (i < P.length - 1 && S[i] < sv) i++;
    var l = S[i] - S[i - 1] || 1, f = (sv - S[i - 1]) / l, a = P[i - 1], b = P[i];
    return { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f, z: a[2] + (b[2] - a[2]) * f, tx: (b[0] - a[0]) / l, ty: (b[1] - a[1]) / l, dz: (b[2] - a[2]) / l };
  }
  function carryAtR(C, f) {   // {x, y, z} at step f (fractional) of a carry
    var P = C.P, i = 1;
    if (f <= 0) return { x: P[0][0], y: P[0][1], z: P[0][2] };
    if (f >= C.end) { var e = P[P.length - 1]; return { x: e[0], y: e[1], z: e[2] }; }
    while (i < P.length - 1 && P[i][3] < f) i++;
    var a = P[i - 1], b = P[i], u = (f - a[3]) / (b[3] - a[3]);
    return { x: a[0] + (b[0] - a[0]) * u, y: a[1] + (b[1] - a[1]) * u, z: a[2] + (b[2] - a[2]) * u };
  }
  function inPocketR(B, x, y) {   // is a point inside the table's pocket (the old table's hangar)?
    var PB = B.PBOX, p = B.T.pocket;
    if (!PB || x < PB[0] || x > PB[2] || y < PB[1] || y > PB[3]) return false;
    var inside = false;
    for (var i = 0, j = p.length - 1; i < p.length; j = i++) {
      if ((p[i][1] > y) !== (p[j][1] > y) && x < (p[j][0] - p[i][0]) * (y - p[i][1]) / (p[j][1] - p[i][1]) + p[i][0]) inside = !inside;
    }
    return inside;
  }

  // the table being stepped (set by use() at the start of every call that steps a world)
  var B, T, WALLS, POSTS, BUMPERS, GATES, DROPS, ARCH, SH, SAU, RAMP, BR, P, VOLC, GEY, LAVA;
  function use(W) {
    B = table(W.tableId); T = B.T;
    WALLS = B.WALLS; POSTS = B.POSTS; BUMPERS = B.BUMPERS; GATES = B.GATES; DROPS = B.DROPS; ARCH = T.arch; SH = T.shooter;
    SAU = T.saucer || null; RAMP = B.RAMP; BR = T.BALL; P = B.PTS; VOLC = B.VOLC; GEY = B.GEY; LAVA = B.LAVA;
    K = tuning(W.g);
  }
  function inPocket(x, y) { return inPocketR(B, x, y); }

  // ------------------------------------------------------------ a new game
  function rng(W) { W.seed = (W.seed * 1103515245 + 12345) & 0x7fffffff; return W.seed / 0x7fffffff; }
  function zeros(n) { var a = []; for (var i = 0; i < n; i++) a.push(0); return a; }
  function newToys(Bt) {
    var Tt = Bt.T, t = {};
    if (Tt.volcano) t.volcano = { pressure: 0, rise: 0, hold: 0, release: -1, land: -1, carry: 0, busy: false, ball: 0, ready: false, red: false };
    if (Tt.geyser) t.geyser = { st: 'ready', t: 0, x: Tt.geyser.x, y: Tt.geyser.y, ball: 0 };
    if (Tt.crabs) t.crabs = Tt.crabs.map(function (c) {
      var u = c.u0 || 0, a = c.path[0], b = c.path[1];
      return { x: a[0] + (b[0] - a[0]) * u, y: a[1] + (b[1] - a[1]) * u, u: u, dir: 1, vx: 0, vy: 0, stun: 0, wait: 0, hits: 0 };
    });
    if (Tt.lava) t.lava = { open: false, t: 0, gates: Tt.lava.gates.map(function () { return { h: 0, solid: true }; }) };
    if (Tt.quake) t.quake = { pending: false, t: 0, gx: 0, dir: 1, n: 0 };
    return t;
  }
  function newWorld(speed, set, seed, tableId) {
    if (!SPEEDS[speed]) speed = 1;
    var S = SPEEDS[speed], id = TABLES[tableId] ? tableId : DEFAULT, Bt = table(id), Tt = Bt.T;
    var nd = Tt.drops ? Tt.drops.n : 0, drops = [];
    for (var i = 0; i < nd; i++) drops.push(true);
    var W = {
      tableId: id, speed: speed, g: S.g, seed: (seed == null ? 365 : seed) | 0 || 1, frame: 0,
      score: 0, ball: 1, total: S.balls, extraAt: (Tt.extra && Tt.extra[speed] ? Tt.extra[speed] : S.extra).slice(), over: false, demo: false,
      state: 'serve', balls: [], nextId: 1,
      flippers: Tt.flippers.map(function (f) { return { side: f.side, x: f.x, y: f.y, len: f.len, r0: f.r0, r1: f.r1, rest: f.rest, up: f.up, a: f.rest, w: 0, on: false, storey: f.storey || 0, ca: f.rest, c: cos(f.rest), s: sin(f.rest) }; }),
      plunger: { pull: 0, held: false },
      drops: drops, dropsDown: 0, dropsT: 0,
      lanes: [false, false, false], skill: -1, skillOpen: false,
      mult: 1, bonus: 0, kickback: true, saucerLit: false,
      saveT: 0, saveArmed: true, autoT: 0, tilt: 0, tilted: false,
      spin: { a: 0, v: 0, n: 0 }, comboT: 0, combo: 0, orbitT: 0, orbitFrom: '',
      stats: { ramps: 0, loops: 0, orbits: 0, drops: 0, saucers: 0, spins: 0, bumpers: 0, skill: 0, kickbacks: 0, saves: 0, tilts: 0,
        craters: 0, eruptions: 0, geysers: 0, crabs: 0, lava: 0, quakes: 0 },
      bonusShow: 0, bonusT: 0, bonusAdd: 0,
      lit: { bump: zeros(Bt.BUMPERS.length), sling: zeros(Tt.slings.length), drop: zeros(nd), lane: [0, 0, 0], kick: 0, saucer: 0, ramp: 0, orbitL: 0, orbitR: 0, save: 0,
        crater: 0, geyser: 0, quake: 0, crab: zeros(Bt.CRABS.length), lava: zeros(Bt.LAVA.length) },
      toys: newToys(Bt), storeys: Tt.storeys,
      dmd: null, events: [], prevL: false, prevR: false, prevUp: false
    };
    use(W);
    serve(W);
    return W;
  }
  function ballAt(W, x, y) {
    var b = { id: W.nextId++, x: x, y: y, vx: 0, vy: 0, px: x, py: y, m: 'free', s: 0, vs: 0, z: 0, hold: 0, sauCd: 0, still: 0, inside: {}, bump: zeros(BUMPERS.length), slingCd: zeros(T.slings.length), launched: false };
    W.balls.push(b);
    return b;
  }
  function addBall(W, x, y) { use(W); return ballAt(W, x, y); }
  function serve(W) {   // a new ball sits on the plunger
    W.balls.length = 0;
    ballAt(W, SH.cx, SH.tip - BR);
    W.state = 'play'; W.plunger.pull = 0; W.saveArmed = true; W.saveT = 0;
    W.skill = Math.floor(rng(W) * 3); W.skillOpen = true;
  }
  function msg(W, big, small, steps) { W.dmd = { big: big, small: small || '', t: steps || 120, n: 0 }; }
  function say(W, text) { W.events.push({ say: text }); }
  function add(W, pts, bonus) {
    if (W.tilted) return;
    var before = W.score; W.score += pts; W.bonus += (bonus || 0) * B.BS;
    while (W.extraAt.length && before < W.extraAt[0] && W.score >= W.extraAt[0]) {
      W.extraAt.shift(); W.total++; W.events.push('extra'); msg(W, 'EXTRA BALL', 'REPLAY AT ' + fmt(W.score), 150); say(W, 'Extra ball!');
    }
  }
  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

  // ------------------------------------------------------------ the storeys
  function inApproachB(Bt, b) {   // which storey's approach zone a ball is in (-1: none)
    var S = Bt.storeys, SHt = Bt.T.shooter;
    if (b.m !== 'free' || b.x > SHt.x0) return -1;
    for (var i = 0; i < S.length; i++) {
      var s = S[i];
      if (b.y >= s.approach && b.y <= s.y1 && b.x >= s.x0 && b.x <= s.x1) return i;
    }
    return -1;
  }
  function storeyOfB(Bt, x, y) {   // which storey's area a point is in (-1: none, e.g. an orbit lane beside the summit)
    var S = Bt.storeys;
    for (var i = 0; i < S.length; i++) { var s = S[i]; if (y >= s.y0 && y <= s.y1 && x >= s.x0 && x <= s.x1) return i; }
    return -1;
  }
  function anyApproach(W) {
    for (var i = 0; i < W.balls.length; i++) if (inApproachB(B, W.balls[i]) >= 0) return true;
    return false;
  }
  function nearRaisedFlipper(W, b) {   // is the ball on (or right by) a raised flipper - a cradle, not a stuck ball?
    for (var i = 0; i < W.flippers.length; i++) {
      var f = W.flippers[i];
      if (!f.on) continue;
      var dx = b.x - f.x, dy = b.y - f.y, r = f.len + BR + 12;
      if (dx * dx + dy * dy < r * r) return true;
    }
    return false;
  }

  // ------------------------------------------------------------ one step: 1/60 of a second
  function step(W, input) {
    if (W.over) return;
    use(W);
    W.frame++;
    var L = !!(input.left || input.pl), R = !!(input.right || input.pr), plunge = !!(input.fire || input.down || input.pp), nudge = !!input.up;
    if (W.tilted) { L = false; R = false; }
    // the flippers move the lit top lanes along (and make their noise)
    if (L && !W.prevL) { W.events.push({ sfx: 'flip', side: -1 }); rotateLanes(W, -1); }
    if (R && !W.prevR) { W.events.push({ sfx: 'flip', side: 1 }); rotateLanes(W, 1); }
    for (var i = 0; i < W.flippers.length; i++) W.flippers[i].on = W.flippers[i].side < 0 ? L : R;
    W.prevL = L; W.prevR = R;
    if (nudge && !W.prevUp && W.state === 'play') doNudge(W);
    W.prevUp = nudge;
    W.tilt = Math.max(0, W.tilt - 0.3 / 60);

    // the plunger: held, it pulls back; let go, it fires the ball in the lane (a quick tap fires a medium shot)
    var Pl = W.plunger;
    if (W.state === 'play') {
      if (plunge) { Pl.held = true; Pl.pull = Math.min(1, Pl.pull + 1 / 54); }
      else if (Pl.held) { Pl.held = false; fire(W, Pl.pull < 0.12 ? -1 : Pl.pull); Pl.pull = 0; }
      if (W.autoT > 0 && --W.autoT === 0) fire(W, -1);
    } else { Pl.held = false; Pl.pull = 0; }

    toysFrame(W);
    for (var k = 0; k < SUB; k++) sub(W);

    // timers
    var lt = W.lit;
    for (i = 0; i < lt.bump.length; i++) { if (lt.bump[i] > 0) lt.bump[i]--; }
    for (i = 0; i < lt.sling.length; i++) if (lt.sling[i] > 0) lt.sling[i]--;
    ['kick', 'saucer', 'ramp', 'orbitL', 'orbitR', 'crater', 'geyser', 'quake'].forEach(function (n) { if (lt[n] > 0) lt[n]--; });
    for (i = 0; i < lt.drop.length; i++) if (lt.drop[i] > 0) lt.drop[i]--;
    for (i = 0; i < 3; i++) if (lt.lane[i] > 0) lt.lane[i]--;
    for (i = 0; i < lt.crab.length; i++) if (lt.crab[i] > 0) lt.crab[i]--;
    for (i = 0; i < lt.lava.length; i++) if (lt.lava[i] > 0) lt.lava[i]--;
    if (W.comboT > 0 && --W.comboT === 0) W.combo = 0;
    if (W.orbitT > 0 && --W.orbitT === 0) W.orbitFrom = '';
    if (W.saveT > 0) { W.saveT--; lt.save = W.saveT; }
    if (W.dmd && ++W.dmd.n >= W.dmd.t) W.dmd = null;
    // the spinner winds down; every whole turn scores
    var sp = W.spin;
    if (sp.v > 0) {
      sp.a += sp.v; sp.v = Math.max(0, sp.v * 0.985 - 0.004);
      while (sp.a >= 1) { sp.a -= 1; sp.n++; W.stats.spins++; add(W, P.spin, 10); W.events.push('spin'); }
    }
    // the targets come back up a while after they were all knocked down (or the hangar visited), once no ball is in the way
    if (W.dropsT > 0 && --W.dropsT <= 0) {
      if (W.balls.some(function (b) { return b.m !== 'ramp' && (inPocket(b.x, b.y) || nearDrops(b)); })) W.dropsT = 20;
      else { for (i = 0; i < W.drops.length; i++) W.drops[i] = true; W.dropsDown = 0; W.saucerLit = false; W.events.push('reset'); }
    }
    // a ball resting still for too long (not held on a flipper, not in the lane or a hole) is shaken loose
    W.balls.forEach(function (b) {
      if (b.m !== 'free' || b.x > SH.x0) { b.still = 0; return; }
      var held = nearRaisedFlipper(W, b);
      if (Math.abs(b.vx) + Math.abs(b.vy) < 30 && !held) b.still += 1 / 60; else b.still = 0;
      if (b.still > STILL_SECS) { b.still = 0; b.vx = (rng(W) - 0.5) * 300 * K.k; b.vy = -350 * K.k; W.events.push('search'); }
    });

    // the end of a ball
    if (W.state === 'play' && W.balls.length === 0) endOfBall(W);
    else if (W.state === 'bonus') bonusStep(W);
  }

  function rotateLanes(W, dir) {
    var l = W.lanes;
    if (dir < 0) l.push(l.shift()); else l.unshift(l.pop());
  }
  function doNudge(W) {
    var push = (W.frame & 1 ? 1 : -1) * 55 * K.k;
    W.balls.forEach(function (b) { if (b.m === 'free' && b.x < SH.x0) { b.vx += push; b.vy -= 90 * K.k; } });
    W.tilt += 1; W.events.push('nudge');
    if (W.tilt > 3.2 && !W.tilted) {
      W.tilted = true; W.stats.tilts++; W.events.push('tilt'); msg(W, 'TILT', 'BALL LOST', 9999); say(W, 'Tilt! The flippers are off for this ball.');
    } else if (W.tilt > 2.1) { W.events.push('warn'); msg(W, 'DANGER', 'GO EASY ON THE NUDGES', 90); }
  }
  // fire the ball(s) waiting in the shooter lane; pull 0-1, or -1 for the machine's own shot
  function launchSpeed(W, pull) {   // the plunger's curve (the table's data), scaled to the table's slope
    var C = SH.curve, v = SH.auto, i = 1;
    if (pull >= 0) { while (i < C.length - 1 && C[i][0] < pull) i++; v = C[i - 1][1] + (C[i][1] - C[i - 1][1]) * (pull - C[i - 1][0]) / (C[i][0] - C[i - 1][0]); }
    return v * K.k;
  }
  function fire(W, pull) {
    var v = launchSpeed(W, pull), any = false;
    W.balls.forEach(function (b) {
      if (b.m === 'free' && b.x > SH.x0 && b.y > SH.tip - BR - 6 && Math.abs(b.vy) < 60) { b.vy = -v; b.vx = 0; any = true; }
    });
    if (any) W.events.push({ sfx: 'launch', p: pull });
  }

  // ------------------------------------------------------------ the toys, once a step (60 a second)
  function toysFrame(W) {
    var t = W.toys, i;
    var V = t.volcano;
    if (V) {
      var want = V.pressure > 1 ? 1 : V.pressure;
      V.rise += (want - V.rise) * 0.04;   // the cone rises (and settles) smoothly: the picture's height, 0-1
      if (V.rise < 1e-4 && want === 0) V.rise = 0;
      V.hold = V.busy && V.release > W.frame ? V.release - W.frame : 0;
    }
    var G = t.geyser;
    if (G) {
      if (G.st === 'cool' && --G.t <= 0) { G.st = 'ready'; G.t = 0; }
      else if (G.st === 'puff' && G.t > 0) G.t--;
    }
    if (t.crabs) {
      for (i = 0; i < t.crabs.length; i++) crabStep(W, t.crabs[i], B.CRABS[i]);
    }
    var Lv = t.lava;
    if (Lv) {
      if (Lv.open && --Lv.t <= 0) { Lv.open = false; Lv.t = 0; W.events.push('lavaclose'); }
      var anim = T.lava.anim || 30;
      for (i = 0; i < Lv.gates.length; i++) {
        var g = Lv.gates[i];
        if (Lv.open) { g.solid = false; g.h = Math.min(1, g.h + 1 / anim); }
        else {
          if (!g.solid && !ballOnSeg(W, LAVA[i], 2)) g.solid = true;   // it only comes down once no ball is in the way
          if (g.solid) g.h = Math.max(0, g.h - 1 / anim);
        }
      }
    }
    var Q = t.quake;
    if (Q) {
      if (Q.t > 0) {
        if (anyApproach(W)) { Q.t = 0; Q.gx = 0; W.events.push('quakeend'); }
        else {
          Q.t--;
          var QD = B.QUAKE, ph = 1 - Q.t / QD.time;
          Q.gx = Q.t > 0 ? Q.dir * QD.amp * W.g * sin(PI * ph) : 0;
          W.lit.quake = Q.t;
          if (Q.t === 0) W.events.push('quakeend');
        }
      } else if (Q.pending && W.state === 'play' && !anyApproach(W) && W.balls.some(function (b) { return b.m === 'free' && b.x < SH.x0; })) {
        Q.pending = false; Q.t = B.QUAKE.time; Q.dir = -Q.dir; Q.n++; Q.gx = 0; W.stats.quakes++;
        W.events.push('quake'); msg(W, 'QUAKE', 'HOLD ON', 90); say(W, 'Quake!');
      }
    }
  }
  function ballOnSeg(W, s, extra) {
    for (var i = 0; i < W.balls.length; i++) { var b = W.balls[i]; if (b.m !== 'ramp' && nearSeg(b, s, extra)) return true; }
    return false;
  }
  // a crab walks its path, waits at each end, and never steps into a ball (it waits for the ball to move)
  function crabStep(W, c, C) {
    var d = C.d;
    if (c.stun > 0) { c.stun--; c.vx = 0; c.vy = 0; return; }
    if (c.wait > 0) { c.wait--; c.vx = 0; c.vy = 0; return; }
    var nu = c.u + c.dir * d.speed * K.k / 60 / C.len;
    if (nu > 1) nu = 1; else if (nu < 0) nu = 0;
    var a = d.path[0], b = d.path[1], px = a[0] + (b[0] - a[0]) * nu, py = a[1] + (b[1] - a[1]) * nu, lim = BR + d.r + 1.5;
    for (var i = 0; i < W.balls.length; i++) {
      var o = W.balls[i];
      if (o.m === 'ramp') continue;
      var nx = o.x - px, ny = o.y - py, ox = o.x - c.x, oy = o.y - c.y, n2 = nx * nx + ny * ny;
      if (n2 < lim * lim && n2 < ox * ox + oy * oy) { c.vx = 0; c.vy = 0; return; }   // the step would close on a ball
    }
    c.vx = (px - c.x) * 60; c.vy = (py - c.y) * 60; c.x = px; c.y = py; c.u = nu;
    if (nu === 1 || nu === 0) { c.dir = nu === 1 ? -1 : 1; c.wait = d.pause; }
  }

  // ------------------------------------------------------------ the physics: 1/600 of a second
  function sub(W) {
    var g = W.g, Q = W.toys.quake, gx = Q ? Q.gx : 0, i, j, b, f, n = W.balls.length;
    // the quake never pulls while a ball is below an approach line: it stops the moment one gets there
    if (gx !== 0 && anyApproach(W)) { Q.t = 0; Q.gx = 0; gx = 0; W.events.push('quakeend'); }
    // the flippers swing
    for (i = 0; i < W.flippers.length; i++) {
      f = W.flippers[i];
      swing(f);
      if (f.ca !== f.a) { f.ca = f.a; f.c = cos(f.a); f.s = sin(f.a); }
    }
    var tipY = SH.tip + W.plunger.pull * SH.travel;
    for (i = 0; i < n; i++) {
      b = W.balls[i];
      b.px = b.x; b.py = b.y;
      if (b.m === 'held') { holdStep(W, b); continue; }
      if (b.m === 'ramp') { if (b.carry) carryStep(W, b); else rampStep(W, b, g); continue; }
      b.vy += g * DT;
      if (gx !== 0) b.vx += gx * DT;
      var k = 1 - K.roll * DT; b.vx *= k; b.vy *= k;
      var sp2 = b.vx * b.vx + b.vy * b.vy;
      if (sp2 > K.vmax * K.vmax) { var s = K.vmax / Math.sqrt(sp2); b.vx *= s; b.vy *= s; }
      if (b.sauCd > 0) b.sauCd--;
      else if (SAU && inPocket(b.x, b.y)) {   // in the hangar: the dished floor rolls it to the saucer, so it can never rest in a corner
        var hx = SAU.x - b.x, hy = SAU.y - b.y, hl = Math.sqrt(hx * hx + hy * hy) || 1, dk = 1 - K.drag * DT;
        b.vx = b.vx * dk + hx / hl * K.dish * DT; b.vy = b.vy * dk + hy / hl * K.dish * DT;
      }
      b.x += b.vx * DT; b.y += b.vy * DT;
      for (var it = 0; it < 2; it++) collide(W, b, tipY);
      for (j = 0; j < b.bump.length; j++) if (b.bump[j] > 0) b.bump[j]--;
      for (j = 0; j < b.slingCd.length; j++) if (b.slingCd[j] > 0) b.slingCd[j]--;
      if (b.m === 'free') sensors(W, b);
      if (!b.launched && b.y < T.gates[0][1] - 4) { b.launched = true; launched(W); }
    }
    // balls knock into each other (multiball)
    for (i = 0; i < n; i++) for (j = i + 1; j < n; j++) ballBall(W.balls[i], W.balls[j]);
    // drained balls leave the table
    for (i = W.balls.length - 1; i >= 0; i--) {
      if (W.balls[i].y > T.H + BR + 6) { W.balls.splice(i, 1); drained(W); }
    }
    if (W.onSub) W.onSub(W);   // the sim tools (tools/pinball) watch every substep; never set in the game
  }
  function swing(f) {
    var target = f.on ? f.up : f.rest, d = target - f.a;
    if (Math.abs(d) < 1e-6) { f.w = 0; return; }
    var dir = d > 0 ? 1 : -1, wmax = f.on ? K.up : K.down;
    f.w += dir * K.acc * DT;
    if (Math.abs(f.w) > wmax) f.w = dir * wmax;
    if (f.w * dir < 0) f.w = dir * Math.min(wmax, K.acc * DT);   // turning round: start from rest
    var na = f.a + f.w * DT;
    if ((na - target) * dir >= 0) { na = target; f.w = 0; }
    f.a = na;
  }
  function launched(W) {   // the ball has left the shooter lane: ball save starts now (once a ball)
    if (W.saveArmed && !W.tilted) { W.saveArmed = false; W.saveT = SPEEDS[W.speed].save * 60; }
  }
  function drained(W) {
    W.events.push('drain');
    if (W.saveT > 0 && !W.tilted && W.balls.length === 0) {
      W.stats.saves++; W.events.push('save'); msg(W, 'BALL SAVED', 'SHOOT AGAIN', 120); say(W, 'Ball saved - here it comes again');
      ballAt(W, SH.cx, SH.tip - BR); W.autoT = 50; W.saveT = 0;
    }
  }

  // the ball against everything solid. Push it out of the surface; if it was moving into it, bounce (relative to the
  // surface's own movement - a flipper, a crab), with a dead stop for a gentle touch so a ball can rest and roll
  function bounce(b, nx, ny, pen, e, svx, svy) {
    b.x += nx * pen; b.y += ny * pen;
    var rvx = b.vx - (svx || 0), rvy = b.vy - (svy || 0), vn = rvx * nx + rvy * ny;
    if (vn >= 0) return 0;
    var ee = vn > -K.rest ? 0 : e;
    b.vx -= (1 + ee) * vn * nx; b.vy -= (1 + ee) * vn * ny;
    return -vn;
  }
  // a ball balanced dead on top of a round end (a post, the end of a wall) would sit there for ever in a perfect
  // simulation; a real one never does, so it is tipped off (to the side it leans, or towards the middle)
  function tipOff(b, nx, ny) {
    if (ny < -0.995 && b.vx < 3 && b.vx > -3) b.vx += nx > 1e-6 ? 3 : nx < -1e-6 ? -3 : b.x < T.MID ? 3 : -3;
  }
  function nearSeg(b, s, extra) {   // closest point, distance, normal - or null if not touching
    var t = ((b.x - s.ax) * s.dx + (b.y - s.ay) * s.dy) / s.l2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    var qx = s.ax + s.dx * t, qy = s.ay + s.dy * t, dx = b.x - qx, dy = b.y - qy, d2 = dx * dx + dy * dy, lim = BR + s.r + (extra || 0);
    if (d2 >= lim * lim) return null;
    var d = Math.sqrt(d2) || 1e-6;
    return { nx: dx / d, ny: dy / d, pen: lim - d, t: t };
  }
  function collide(W, b, tipY) {
    var i, c, s, hit;
    if (b.m !== 'free') return;   // (taken by the crater on the first pass)
    for (i = 0; i < WALLS.length; i++) {
      s = WALLS[i]; c = nearSeg(b, s); if (!c) continue;
      if (s.kind === 'sling') {
        if (b.slingCd[s.i] === 0 && -(b.vx * c.nx + b.vy * c.ny) > 60 * K.k && c.nx * s.nx + c.ny * s.ny > 0.5) {
          b.x += c.nx * c.pen; b.y += c.ny * c.pen;
          var vn = b.vx * s.nx + b.vy * s.ny;
          b.vx += (K.sling - vn) * s.nx; b.vy += (K.sling - vn) * s.ny;
          b.slingCd[s.i] = 30; W.lit.sling[s.i] = 10; add(W, P.sling, 10); W.events.push({ sfx: 'sling', side: s.i ? 1 : -1 });
          continue;
        }
      }
      hit = bounce(b, c.nx, c.ny, c.pen, s.e);
      if (c.t === 0 || c.t === 1) tipOff(b, c.nx, c.ny);
      if (hit > 380) W.events.push({ sfx: s.kind === 'rubber' || s.kind === 'post' || s.kind === 'sling' ? 'rubber' : 'wall', v: hit });
    }
    for (i = 0; i < POSTS.length; i++) {
      var p = POSTS[i], dx = b.x - p.x, dy = b.y - p.y, lim = BR + p.r, d2 = dx * dx + dy * dy;
      if (d2 >= lim * lim) continue;
      var d = Math.sqrt(d2) || 1e-6;
      hit = bounce(b, dx / d, dy / d, lim - d, p.e);
      tipOff(b, dx / d, dy / d);
      if (hit > 380) W.events.push({ sfx: 'rubber', v: hit });
    }
    // the top arch (the ball inside the top half of a circle)
    var ax = b.x - ARCH.x, ay = b.y - ARCH.y;
    if (ay < 0) {
      var ad = Math.sqrt(ax * ax + ay * ay), alim = ARCH.R - ARCH.r - BR;
      if (ad > alim) { hit = bounce(b, -ax / ad, -ay / ad, ad - alim, ARCH.e); if (hit > 380) W.events.push({ sfx: 'wall', v: hit }); }
    }
    // pop bumpers: a hard kick away
    for (i = 0; i < BUMPERS.length; i++) {
      var Bm = BUMPERS[i], bx = b.x - Bm.x, by = b.y - Bm.y, bl = BR + Bm.r, bd2 = bx * bx + by * by;
      if (bd2 >= bl * bl) continue;
      var bd = Math.sqrt(bd2) || 1e-6, nx = bx / bd, ny = by / bd;
      b.x += nx * (bl - bd); b.y += ny * (bl - bd);
      var vin = b.vx * nx + b.vy * ny;
      if (b.bump[i] === 0) {
        b.vx += (K.bump - vin) * nx; b.vy += (K.bump - vin) * ny; b.bump[i] = 18;
        W.lit.bump[i] = 8; W.stats.bumpers++; add(W, P.bumper, 10); W.events.push({ sfx: 'bumper', i: i });
        addP(W, 'bumper'); skillOver(W);
      } else if (vin < 0) { b.vx -= 1.5 * vin * nx; b.vy -= 1.5 * vin * ny; }
    }
    // one-way gates
    for (i = 0; i < GATES.length; i++) {
      s = GATES[i]; c = nearSeg(b, s); if (!c) continue;
      if ((b.x - s.ax) * s.nx + (b.y - s.ay) * s.ny <= 0) continue;   // on the side it swings open from
      if (b.vx * s.nx + b.vy * s.ny > 0) continue;                    // moving away
      bounce(b, c.nx, c.ny, c.pen, s.e);
    }
    // drop targets that are up (only their fronts knock them down)
    for (i = 0; i < DROPS.length; i++) {
      if (!W.drops[i]) continue;
      s = DROPS[i]; c = nearSeg(b, s); if (!c) continue;
      var front = (b.x - s.ax) * s.fx + (b.y - s.ay) * s.fy > 0;
      hit = bounce(b, c.nx, c.ny, c.pen, s.e);
      if (c.t === 0 || c.t === 1) tipOff(b, c.nx, c.ny);
      if (front && hit > 70 * K.k) dropHit(W, i);
    }
    // the volcano: a firm shot into the crater's mouth is taken; anything else bounces off the cone
    if (VOLC) {
      var vx0 = b.x - VOLC.x, vy0 = b.y - VOLC.y, vl = BR + VOLC.r, vd2 = vx0 * vx0 + vy0 * vy0;
      if (vd2 < vl * vl) {
        var vd = Math.sqrt(vd2) || 1e-6, vnx = vx0 / vd, vny = vy0 / vd, into = -(b.vx * vnx + b.vy * vny);
        if (!W.toys.volcano.busy && !W.tilted && vnx * VOLC.mx + vny * VOLC.my >= VOLC.cosHalf && into >= VOLC.catchV * K.k) { craterCatch(W, b); return; }
        hit = bounce(b, vnx, vny, vl - vd, VOLC.e); tipOff(b, vnx, vny);
        if (hit > 380) W.events.push({ sfx: 'wall', v: hit });
      }
    }
    // the magma crabs (moving posts: the bounce is relative to the crab's own walk)
    var cr = W.toys.crabs;
    if (cr) {
      for (i = 0; i < cr.length; i++) {
        var C = cr[i], Cd = B.CRABS[i].d, cx = b.x - C.x, cy = b.y - C.y, cl = BR + Cd.r, cd2 = cx * cx + cy * cy;
        if (cd2 >= cl * cl) continue;
        var cdd = Math.sqrt(cd2) || 1e-6;
        hit = bounce(b, cx / cdd, cy / cdd, cl - cdd, Cd.e, C.vx, C.vy);
        tipOff(b, cx / cdd, cy / cdd);
        if (hit > 90 * K.k && C.stun === 0) crabHit(W, i);
        else if (hit > 380) W.events.push({ sfx: 'rubber', v: hit });
      }
    }
    // the lava gates, while down (one-way: they stop a ball going in, never one coming out)
    for (i = 0; i < LAVA.length; i++) {
      if (!W.toys.lava.gates[i].solid) continue;
      s = LAVA[i]; c = nearSeg(b, s); if (!c) continue;
      if ((b.x - s.ax) * s.nx + (b.y - s.ay) * s.ny <= 0) continue;
      if (b.vx * s.nx + b.vy * s.ny > 0) continue;
      bounce(b, c.nx, c.ny, c.pen, s.e);
    }
    // the plunger's tip (only in the shooter lane)
    if (b.x > SH.x0 && b.y > tipY - BR) { var pp = b.y - (tipY - BR); bounce(b, 0, -1, pp, 0.2); }
    // the flippers
    for (i = 0; i < W.flippers.length; i++) flipperHit(W, W.flippers[i], b);
  }
  function flipperHit(W, f, b) {
    var cx = f.c, cy = f.s, dx = b.x - f.x, dy = b.y - f.y;
    var t = (dx * cx + dy * cy) / f.len;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    var qx = f.x + cx * f.len * t, qy = f.y + cy * f.len * t, rr = f.r0 + (f.r1 - f.r0) * t;
    var ex = b.x - qx, ey = b.y - qy, d2 = ex * ex + ey * ey, lim = BR + rr;
    if (d2 >= lim * lim) return;
    var d = Math.sqrt(d2) || 1e-6, nx = ex / d, ny = ey / d;
    // the speed of the flipper's surface where the ball touches it
    var px = qx + nx * rr - f.x, py = qy + ny * rr - f.y, svx = -f.w * py, svy = f.w * px;
    bounce(b, nx, ny, lim - d, FLIP.e, svx, svy);
    if (t === 0 || t === 1) tipOff(b, nx, ny);
    if (f.w === 0 && b.vx * b.vx + b.vy * b.vy < 120 * 120 * K.k * K.k) {   // the rubber's grip on a slow ball
      var vt = -b.vx * ny + b.vy * nx, k = vt * K.grip * DT;
      b.vx += k * ny; b.vy -= k * nx;
    }
  }
  function ballBall(a, c) {
    if (a.m !== 'free' || c.m !== 'free') return;
    var dx = c.x - a.x, dy = c.y - a.y, d2 = dx * dx + dy * dy, lim = 2 * BR;
    if (d2 >= lim * lim || d2 === 0) return;
    var d = Math.sqrt(d2), nx = dx / d, ny = dy / d, pen = (lim - d) / 2;
    a.x -= nx * pen; a.y -= ny * pen; c.x += nx * pen; c.y += ny * pen;
    var vn = (c.vx - a.vx) * nx + (c.vy - a.vy) * ny;
    if (vn >= 0) return;
    var j = -(1 + 0.9) * vn / 2;
    a.vx -= j * nx; a.vy -= j * ny; c.vx += j * nx; c.vy += j * ny;
  }

  // ------------------------------------------------------------ ramps, carries and holes
  function rampStep(W, b, g) {
    var r = rampAtR(RAMP, b.s);
    var a = g * r.ty - K.gz * r.dz - (b.vs > 0 ? K.rampF : -K.rampF);
    b.vs += a * DT; b.s += b.vs * DT;
    if (b.s <= 0) {   // not fast enough: it rolls back out of the entrance
      r = rampAtR(RAMP, 0); b.m = 'free'; b.x = r.x; b.y = r.y + 2; b.z = 0;
      b.vx = r.tx * b.vs; b.vy = r.ty * b.vs; W.events.push('rampfail');
      return;
    }
    if (b.s >= RAMP.L) {   // made it: off the far end
      r = rampAtR(RAMP, RAMP.L); b.m = 'free'; b.x = r.x; b.y = r.y; b.z = 0;
      b.vx = r.tx * b.vs; b.vy = r.ty * b.vs;
      rampMade(W);
      return;
    }
    b.x = r.x; b.y = r.y; b.z = r.z; b.vx = r.tx * b.vs; b.vy = r.ty * b.vs;
  }
  function rampMade(W) {
    W.stats.ramps++;
    W.combo = W.comboT > 0 ? Math.min(5, W.combo + 1) : 1; W.comboT = 4 * 60;
    var pts = P.ramp * W.combo;
    add(W, pts, 1000); W.lit.ramp = 60; addP(W, 'ramp');
    if (W.combo > 1) { W.events.push({ sfx: 'combo', n: W.combo }); msg(W, 'COMBO X' + W.combo, fmt(pts), 110); say(W, 'Ramp combo times ' + W.combo); }
    else { W.events.push('ramp'); msg(W, B.NAMES.ramp, fmt(pts), 90); }
  }
  // a carry: the ball rides a timed path out of play (b.ct counts substeps), then is let go with a set speed
  function startCarry(W, b, name) {
    b.m = 'ramp'; b.carry = name; b.ct = 0; b.s = 0; b.vs = 0; b.z = 0; b.railed = false;
  }
  function carryStep(W, b) {
    var C = B.CARRY[b.carry], f = ++b.ct / SUB, V = W.toys.volcano;
    if (f >= C.end) {   // let go at the end of the path, back into play
      var e = C.P[C.P.length - 1];
      b.m = 'free'; b.carry = null; b.x = e[0]; b.y = e[1]; b.z = 0; b.vx = C.out[0] * K.k; b.vy = C.out[1] * K.k; b.vs = 0;
      if (V && V.ball === b.id) { V.busy = false; V.carry = 0; V.ball = 0; }
      W.events.push('railout');
      return;
    }
    var q = carryAtR(C, f);
    b.vx = (q.x - b.x) / DT; b.vy = (q.y - b.y) / DT; b.vs = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
    b.x = q.x; b.y = q.y; b.z = q.z;
    if (V && V.ball === b.id) V.carry = f / C.end;
    if (!b.railed && C.railAt >= 0 && f >= C.railAt) { b.railed = true; W.events.push('rail'); if (P.rail) { add(W, P.rail, 1000); msg(W, 'WIRE RAIL', fmt(P.rail), 90); } }
  }
  function holdStep(W, b) {
    b.vx = 0; b.vy = 0;
    if (b.at === 'crater') {
      b.x = VOLC.x; b.y = VOLC.y;
      if (--b.hold > 0) return;
      startCarry(W, b, VOLC.carry); b.at = null;
      W.events.push('erupt');
      return;
    }
    if (b.at === 'geyser') {
      b.x = GEY.x; b.y = GEY.y;
      if (--b.hold > 0) return;
      b.m = 'free'; b.at = null; b.vx = GEY.fling[0] * K.k; b.vy = GEY.fling[1] * K.k;
      var G = W.toys.geyser; G.st = 'cool'; G.t = GEY.cool; G.ball = 0;
      W.stats.geysers++; W.lit.geyser = 30; add(W, P.geyser, 1000); addP(W, 'geyser');
      W.events.push('geyser'); msg(W, 'GEYSER', fmt(P.geyser), 80);
      return;
    }
    b.x = SAU.x; b.y = SAU.y;
    if (--b.hold > 0) return;   // (counted in substeps)
    // out it goes; it can't be caught again (or pulled back by the dished floor) until it is well clear
    b.m = 'free'; b.vx = SAU.eject[0] * K.k; b.vy = SAU.eject[1] * K.k; b.y += 1; b.sauCd = SUB * 30;
    W.events.push('eject');
    W.dropsT = 60;   // the targets come back up a second after the ball has left
  }
  function nearDrops(b) { for (var i = 0; i < DROPS.length; i++) if (nearSeg(b, DROPS[i], 3)) return true; return false; }
  function dropHit(W, i) {
    W.drops[i] = false; W.dropsDown++; W.stats.drops++; W.lit.drop[i] = 20;
    add(W, P.drop, 200); W.events.push({ sfx: 'drop', i: i }); addP(W, 'drop');
    skillOver(W);
    if (W.dropsDown === DROPS.length) {
      add(W, P.drops, 2000); W.kickback = true; W.lit.kick = 90; W.events.push('drops');
      if (SAU) {
        W.saucerLit = true; msg(W, B.NAMES.drops, B.NAMES.dropsSub, 150); say(W, 'All five targets down - the hangar is open');
        W.dropsT = 20 * 60;   // left open for 20 seconds
      } else {
        addP(W, 'drops'); msg(W, B.NAMES.drops, B.NAMES.dropsSub, 150); say(W, 'All the targets down - the kickback is lit');
        W.dropsT = T.dropsBack || 120;
      }
    }
  }
  // the crater takes the ball: it collects the pressure (a full one is an eruption that raises the lava gates)
  function craterCatch(W, b) {
    var V = W.toys.volcano, PR = B.PRESS;
    b.m = 'held'; b.at = 'crater'; b.hold = VOLC.hold * SUB; b.x = VOLC.x; b.y = VOLC.y; b.vx = 0; b.vy = 0; b.z = 0;
    V.busy = true; V.ball = b.id; V.hold = VOLC.hold; V.release = W.frame + VOLC.hold; V.land = V.release + B.CARRY[VOLC.carry].end; V.carry = 0;
    W.stats.craters++; W.lit.crater = VOLC.hold;
    var p = V.pressure, full = PR && p >= PR.full, pts = P.crater + Math.round(p * P.pressure / 10000) * 10000;
    if (full) pts += P.eruption;
    add(W, pts, 5000);
    W.events.push('crater');
    if (full) {
      W.stats.eruptions++;
      var Lv = W.toys.lava;
      if (Lv) { Lv.open = true; Lv.t = T.lava.time; Lv.gates.forEach(function (g) { g.solid = false; }); W.events.push('lavaopen'); }   // (rising out of the way is always safe)
      msg(W, 'FULL ERUPTION', fmt(pts), VOLC.hold); say(W, 'Full eruption! The lava lanes are open');
    } else msg(W, 'CRATER', fmt(pts), VOLC.hold);
    V.pressure = 0; V.ready = false; V.red = false;
    skillOver(W);
  }
  // the pressure rule: shots add pressure; full, the crater erupts; overdo it and a quake comes (the kickback goes off)
  function addP(W, key) {
    var V = W.toys.volcano, PR = B.PRESS;
    if (!V || !PR || W.tilted || !PR[key]) return;
    var before = V.pressure;
    V.pressure = Math.min(PR.max, before + PR[key]);
    if (before < PR.full && V.pressure >= PR.full) {
      V.ready = true; W.events.push({ sfx: 'pressure', level: 'full' }); msg(W, 'ERUPT NOW', 'SHOOT THE CRATER', 150); say(W, 'Full pressure - shoot the crater to erupt');
    } else if (before < PR.warn && V.pressure >= PR.warn) {
      W.events.push({ sfx: 'pressure', level: 'warn' }); msg(W, 'PRESSURE', 'ERUPT NOW!', 120);
    }
    if (V.pressure >= PR.max) {
      V.pressure = PR.after; W.kickback = false;
      if (W.toys.quake) W.toys.quake.pending = true;
      W.events.push('overload'); msg(W, 'QUAKE COMING', 'KICKBACK OFF', 150); say(W, 'Too much pressure! A quake is coming - the kickback is off.');
    }
    V.red = V.pressure > PR.full;
  }
  function crabHit(W, i) {
    var c = W.toys.crabs[i];
    c.stun = B.CRABS[i].d.stun; c.hits++; c.vx = 0; c.vy = 0;
    W.stats.crabs++; W.lit.crab[i] = 30; add(W, P.crab, 1000); addP(W, 'crab');
    W.events.push({ sfx: 'crab', i: i }); msg(W, 'MAGMA CRAB', fmt(P.crab), 80);
    skillOver(W);
  }

  // ------------------------------------------------------------ what the ball rolls over
  function sensors(W, b) {
    var SC = T.sensors.circles, i, s;
    for (i = 0; i < SC.length; i++) {
      s = SC[i];
      var dx = b.x - s[1], dy = b.y - s[2], inside = dx * dx + dy * dy < s[3] * s[3];
      if (inside && !b.inside[s[0]]) rollover(W, b, s[0]);
      b.inside[s[0]] = inside;
    }
    var SL = T.sensors.lines;
    for (i = 0; i < SL.length; i++) {
      s = SL[i];
      var ex = s[3] - s[1], ey = s[4] - s[2];
      var c0 = ex * (b.py - s[2]) - ey * (b.px - s[1]), c1 = ex * (b.y - s[2]) - ey * (b.x - s[1]);
      if ((c0 < 0) === (c1 < 0)) continue;
      var t = ((b.x - s[1]) * ex + (b.y - s[2]) * ey) / (ex * ex + ey * ey);
      if (t < -0.1 || t > 1.1) continue;
      crossed(W, b, s[0]);
    }
    // the ramp's entrance: crossed going up = onto the ramp
    var en = RAMP && RAMP.entry;
    if (en && b.py >= en.y && b.y < en.y && b.x > en.x0 && b.x < en.x1 && b.vy < 0) {
      b.m = 'ramp'; b.s = 0.01; b.vs = -b.vy; b.z = 0; W.events.push('rampin'); skillOver(W);
      return;
    }
    // the old table's hangar saucer
    if (SAU && b.m === 'free' && b.sauCd === 0) {
      var sx = b.x - SAU.x, sy = b.y - SAU.y;
      if (sx * sx + sy * sy < SAU.catchR * SAU.catchR && b.vx * b.vx + b.vy * b.vy < SAU.maxV * SAU.maxV * K.k * K.k) {
        b.m = 'held'; b.hold = SAU.hold * SUB; b.x = SAU.x; b.y = SAU.y; b.vx = b.vy = 0;
        W.stats.saucers++; W.lit.saucer = SAU.hold;
        // in through a gap: the hangar doors open (any targets still up drop, no points) so the eject has a clear way out
        if (W.dropsDown < DROPS.length) { for (i = 0; i < DROPS.length; i++) W.drops[i] = false; W.dropsDown = DROPS.length; }
        var pts = W.saucerLit ? P.saucerLit : P.saucer;
        add(W, pts, 1500); W.events.push(W.saucerLit ? 'jackpot' : 'saucer');
        msg(W, W.saucerLit ? 'HANGAR JACKPOT' : 'HANGAR', fmt(pts), SAU.hold);
        if (W.saucerLit) say(W, 'Hangar jackpot, 15,000');
        W.saucerLit = false; skillOver(W);
      }
    }
    // the steam geyser: a slow ball in its column is caught (it puffs first, then flings the ball on)
    if (GEY && b.m === 'free' && !W.tilted) {
      var G = W.toys.geyser;
      if (G.st === 'ready') {
        var gx = b.x - GEY.x, gy = b.y - GEY.y, gv = GEY.catchV * K.k;
        if (gx * gx + gy * gy < GEY.r * GEY.r && b.vx * b.vx + b.vy * b.vy < gv * gv) {
          b.m = 'held'; b.at = 'geyser'; b.hold = GEY.puff * SUB; b.x = GEY.x; b.y = GEY.y; b.vx = 0; b.vy = 0;
          G.st = 'puff'; G.t = GEY.puff; G.ball = b.id; W.lit.geyser = GEY.puff;
          W.events.push('puff');
        }
      }
    }
  }
  function skillOver(W) { W.skillOpen = false; }
  function rollover(W, b, id) {
    if (id.indexOf('lane') === 0) {
      var i = +id.charAt(4);
      if (W.skillOpen && i === W.skill) {
        W.stats.skill++; add(W, P.skill, 2000); W.events.push('skill'); msg(W, 'SKILL SHOT', fmt(P.skill), 150); say(W, 'Skill shot! ' + fmt(P.skill));
        addP(W, 'skill');
      }
      skillOver(W);
      add(W, P.lane, 100); W.lit.lane[i] = 30;
      if (!W.lanes[i]) { W.lanes[i] = true; W.events.push('lane'); addP(W, 'lane'); }
      if (W.lanes[0] && W.lanes[1] && W.lanes[2]) {
        W.lanes = [false, false, false];
        if (W.mult < 5) { W.mult++; W.events.push('mult'); msg(W, 'BONUS X' + W.mult, '', 110); say(W, 'Bonus multiplier ' + W.mult); }
        else { add(W, P.lanesDone, 0); W.events.push('mult'); msg(W, 'LANES', fmt(P.lanesDone), 110); }
      }
    } else if (id === 'inL' || id === 'inR') { add(W, P.inlane, 100); W.events.push('inlane'); }
    else if (id === 'outL' || id === 'outR') { if (b.vy > 0) { add(W, P.outlane, 200); W.events.push('outlane'); } }
    else if (id === 'kick') {
      if (W.kickback && b.vy > 0 && !W.tilted) {
        b.vx = 0; b.vy = -K.kick; W.kickback = false; W.lit.kick = 40; W.stats.kickbacks++;
        W.events.push('kickback'); msg(W, 'KICKBACK', '', 90); say(W, 'Kickback!');
      }
    }
  }
  function crossed(W, b, id) {
    if (id === 'spin') {
      var v = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
      W.spin.v = Math.min(0.9, W.spin.v + v / (2400 * K.k));
      W.lit.orbitL = 20;
      if (b.vy < 0) orbit(W, 'L');
    } else if (id === 'orbR') {
      W.lit.orbitR = 20;
      if (b.vy < 0) orbit(W, 'R');
    } else if (id === 'lavaL' || id === 'lavaR') {
      var Lv = W.toys.lava, li = id === 'lavaL' ? 0 : 1;
      if (Lv && Lv.open && b.vy < 0) {
        W.stats.lava++; W.lit.lava[li] = 40; add(W, P.lava, 5000); addP(W, 'lava');
        W.events.push('lava'); msg(W, 'LAVA LANE', fmt(P.lava), 100); say(W, 'Lava lane!');
        skillOver(W);
      }
    }
  }
  // a shot up an orbit. Another orbit shot (either side) inside 4 seconds = a LOOP
  function orbit(W, from) {
    skillOver(W);
    if (W.orbitFrom) {
      W.stats.loops++; add(W, P.loop, 1000); W.events.push('loop'); msg(W, B.NAMES.loop, fmt(P.loop), 100); W.orbitFrom = ''; W.orbitT = 0; addP(W, 'loop'); return;
    }
    W.stats.orbits++; add(W, P.orbit, 500); W.events.push('orbit'); msg(W, B.NAMES.orbit, fmt(P.orbit), 80);
    W.orbitFrom = from; W.orbitT = 4 * 60; addP(W, 'orbit');
  }

  // ------------------------------------------------------------ the end of a ball: the bonus counts up, then the next one
  function endOfBall(W) {
    W.state = 'bonus'; W.bonusT = 0;
    W.bonusAdd = W.tilted ? 0 : W.bonus * W.mult; W.bonusShow = 0;
    W.events.push('ballend');
    msg(W, W.tilted ? 'TILT' : 'BONUS', W.tilted ? 'NO BONUS' : fmt(W.bonus) + (W.mult > 1 ? ' X ' + W.mult : ''), 9999);
  }
  function bonusStep(W) {
    W.bonusT++;
    if (W.bonusT > 40 && W.bonusShow < W.bonusAdd) {
      var stepAmt = Math.max(100, Math.ceil(W.bonusAdd / 50 / 100) * 100);
      var a = Math.min(stepAmt, W.bonusAdd - W.bonusShow);
      W.bonusShow += a; W.tilted = false; add(W, a, 0); if (W.bonusT % 3 === 0) W.events.push('tick');
      if (W.dmd) W.dmd.small = fmt(W.bonusShow);
      return;
    }
    if (W.bonusT < 40 + 70 || (W.bonusShow < W.bonusAdd)) return;
    // next ball
    W.tilted = false; W.tilt = 0; W.mult = 1; W.bonus = 0; W.lanes = [false, false, false]; W.combo = 0; W.comboT = 0;
    if (SPEEDS[W.speed].kick) W.kickback = true;
    W.ball++;
    if (W.ball > W.total) {
      W.ball = W.total; W.over = true; W.state = 'over'; W.dmd = null; W.events.push('over');
      return;
    }
    W.dmd = null; msg(W, 'BALL ' + W.ball, 'PULL AND LET GO', 150); W.events.push('newball');
    serve(W);
  }

  function hud(W) { return { score: W.score, lives: Math.max(0, W.total - W.ball + (W.over ? 0 : 1)), wave: W.ball }; }

  // ------------------------------------------------------------ a deep copy of a world that steps exactly as the original
  // (for the camera's look-ahead, which steps copies in a worker). The tools' onSub hook is left behind; the storeys are
  // the table's own (never changed), so shared.
  function copy(v) {
    if (v === null || typeof v !== 'object') return v;
    var i, o;
    if (Array.isArray(v)) { o = new Array(v.length); for (i = 0; i < v.length; i++) o[i] = copy(v[i]); return o; }
    o = {};
    for (var k in v) {
      if (!Object.prototype.hasOwnProperty.call(v, k) || typeof v[k] === 'function') continue;
      o[k] = k === 'storeys' ? v[k] : copy(v[k]);
    }
    return o;
  }
  function clone(W) { return copy(W); }

  var O = table('orbit');
  return {
    // the old table's, for the old pictures
    W: ORBIT.W, H: ORBIT.H, BALL: ORBIT.BALL, SPEEDS: SPEEDS, PTS: PTS, TABLE: ORBIT, RAMP: O.RAMP, DROPS: O.DROPS, GATES: O.GATES, WALLS: O.WALLS,
    POSTS: O.POSTS, BUMPERS: O.BUMPERS, FLIP: FLIP,
    newWorld: newWorld, step: step, hud: hud, fmt: fmt, addBall: addBall, clone: clone,
    rampAt: function (sv, id) { return rampAtR(table(id || 'orbit').RAMP, sv); },
    inPocket: function (x, y, id) { return inPocketR(table(id || 'orbit'), x, y); },
    // any table
    TABLES: TABLES, DEFAULT: DEFAULT, table: table, sin: sin, cos: cos, SUB: SUB, DT: DT,
    inApproach: function (W, b) { return inApproachB(table(W.tableId), b); },
    storeyOf: function (W, x, y) { return storeyOfB(table(W.tableId), x, y); },
    nearRaisedFlipper: function (W, b) { BR = table(W.tableId).T.BALL; return nearRaisedFlipper(W, b); }
  };
});
