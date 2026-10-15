/* 365 Pinball Hero - the rules and the physics (15 Oct 2026, milestone 1). No drawing here, so the tests run it in node
 * (engine.test.mjs). The arcade cabinet (../common/arcade.js) calls step() 60 times a second; each step runs the
 * physics 10 times (600 a second), small enough that a fast ball never passes through a wall or a flipper. Everything
 * is worked out from the world and the player's buttons alone - no Math.random - so a game with the same seed and the
 * same presses plays out the same every time (the playtest farm and the film captures rely on it).
 *
 * The table is table.js. The ball rolls on a sloping table: "gravity" is the slope's pull down the table, and the
 * speed setting is the slope (Gentle is flatter, so slower; Fast steeper). Flippers are driven: a pressed flipper swings
 * up hard and a hit ball takes the flipper's own speed at the point it touches, so a late flip near the tip sends it
 * faster and further across. The warp ramp is a path with a height: the ball leaves the playfield and runs along it,
 * slowed by the climb; too slow and it rolls back out.
 *
 * Tuned by simulation (tools/pinball, see its README): thousands of balls dropped anywhere never get stuck (a ball
 * balanced on a round end is tipped off, the hangar's floor dishes into the saucer), every major shot can be made from
 * a flipper with a fair timing window, and the plunger's pull maps to fall back / bumpers / skill lanes / round the arch.
 * The speed setting scales every speed and push with the slope, so Gentle and Fast are the same table in slower or
 * faster motion (the same shot makes the same target on all three).
 *
 * Milestone 1 rules: pop bumpers, slingshots, the comet spinner, two orbits (left then right = a LOOP), the warp ramp
 * (back-to-back = a COMBO), five invader drop targets that open the hangar (a saucer), three top lanes for the bonus
 * multiplier (the flippers move the lit lanes), a skill shot, a kickback in the left outlane, ball save, tilt, an end-of-ball
 * bonus and extra balls for points. Missions, multiball and Wizard Mode come in milestone 3.
 *
 * The game reports what happened in world.events (sound names and {say} for screen readers), shows messages on the
 * dot-matrix display (world.dmd) and keeps light timers in world.lit for the pictures. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./table.js'));
  else root.PinEngine = factory(root.PinTable);
})(typeof self !== 'undefined' ? self : this, function (T) {
  'use strict';
  var SUB = 10, DT = 1 / 600, BR = T.BALL;
  // the speeds: the table's slope (gravity), balls a game, seconds of ball save, kickback lit again on every ball
  var SPEEDS = {
    1: { name: 'Gentle', g: 470, balls: 5, save: 15, kick: true, extra: [150000, 400000, 1000000] },
    2: { name: 'Classic', g: 590, balls: 3, save: 10, kick: false, extra: [250000, 750000, 2000000] },
    3: { name: 'Fast', g: 720, balls: 3, save: 6, kick: false, extra: [300000, 1000000, 3000000] }
  };
  // Everything below is set for Classic (g 590: a 6.5 degree slope, as on a real table). Gentle and Fast are the same
  // table in slower and faster motion: every speed, push and swing is scaled with the slope (tuning() below), so a shot
  // that makes the ramp on Classic makes it on Gentle too - it just takes 12% longer to get there (and the timing
  // windows are 12% wider). 270 units = a real table's 20.25 in, so 1 unit = 1.9 mm and 525 units a second = 1 m/s.
  var G0 = 590;
  var VMAX = 2600;           // the fastest a ball ever goes (units a second; ~5 m/s)
  var ROLL = 0.08;           // rolling loss, a share of the speed a second
  var REST = 40;             // slower than this into a surface, and the ball doesn't bounce (it rolls along)
  // flipper swing speeds (radians a second), how fast it gets there, bounce, and the rubber's grip on a slow ball (so a
  // ball trapped on a raised flipper settles in about a second, as on a real table, instead of rocking for ever)
  var FLIP = { up: 42, down: 20, acc: 6000, e: 0.35, grip: 4 };
  // what a pop bumper, a slingshot and the kickback give the ball (units a second: 800 = 1.5 m/s)
  var BUMP = 800, SLING = 700, KICKBACK = 1250;
  var GZ = 3000;             // the warp ramp's climb: how hard each unit of height pulls the ball back
  var RAMP_FRICTION = 70;
  var STILL_SECS = 3;        // a ball that hasn't moved for this long (and isn't being held on a flipper) is shaken loose
  // the hangar's floor dishes down into the saucer: its pull on a ball in there (units a second, a second), and how much
  // speed the dish's rough floor takes off a ball rattling round in there (a share a second)
  var DISH = 1400, DISH_DRAG = 4;
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
    lane: 1000, inlane: 500, outlane: 2000, skill: 25000
  };

  // ------------------------------------------------------------ the table, built once into things the ball can hit
  function seg(ax, ay, bx, by, r, e, kind) { var dx = bx - ax, dy = by - ay; return { ax: ax, ay: ay, bx: bx, by: by, dx: dx, dy: dy, l2: dx * dx + dy * dy || 1, r: r, e: e, kind: kind }; }
  var WALLS = T.walls.map(function (w) { return seg(w[0], w[1], w[2], w[3], w[4], w[5], w[6]); });
  T.slings.forEach(function (s, i) {   // two rubber sides, and the kicking face
    WALLS.push(seg(s.a[0], s.a[1], s.b[0], s.b[1], 2.5, 0.55, 'rubber'));
    WALLS.push(seg(s.b[0], s.b[1], s.c[0], s.c[1], 2.5, 0.55, 'rubber'));
    var k = seg(s.a[0], s.a[1], s.c[0], s.c[1], 2.5, 0.55, 'sling'); k.i = i;
    // the kicking face's normal points out into the playfield (towards the middle)
    var nx = -k.dy, ny = k.dx, l = Math.sqrt(k.l2); nx /= l; ny /= l;
    if ((T.MID - s.a[0]) * nx < 0) { nx = -nx; ny = -ny; }
    k.nx = nx; k.ny = ny; WALLS.push(k);
  });
  var POSTS = T.posts.map(function (p) { return { x: p[0], y: p[1], r: p[2], e: p[3] }; });
  var BUMPERS = T.bumpers.map(function (b, i) { return { x: b[0], y: b[1], r: b[2], i: i }; });
  var GATES = T.gates.map(function (g) {   // with the normal that points to the side each one blocks
    var s = seg(g[0], g[1], g[2], g[3], g[4], g[7] == null ? 0.3 : g[7], 'gate'), l = Math.sqrt(s.l2), nx = -s.dy / l, ny = s.dx / l;
    if ((g[5] - g[0]) * nx + (g[6] - g[1]) * ny < 0) { nx = -nx; ny = -ny; }
    s.nx = nx; s.ny = ny; return s;
  });
  var DROPS = (function () {   // the five targets along the line, with a little gap between each
    var d = T.drops, out = [], ax = d.a[0], ay = d.a[1], dx = d.b[0] - ax, dy = d.b[1] - ay, gap = 0.035;
    var l = Math.sqrt(dx * dx + dy * dy), fx = dy / l, fy = -dx / l;   // the front (the playfield side)
    if (fx * 1 + fy * 1 < 0) { fx = -fx; fy = -fy; }
    for (var i = 0; i < d.n; i++) {
      var t0 = i / d.n + gap, t1 = (i + 1) / d.n - gap, s = seg(ax + dx * t0, ay + dy * t0, ax + dx * t1, ay + dy * t1, d.r, 0.3, 'drop');
      s.i = i; s.fx = fx; s.fy = fy; out.push(s);
    }
    return out;
  })();
  var ARCH = T.arch, SH = T.shooter, SAU = T.saucer;
  // the warp ramp, measured: the length along it, its height and direction at every point
  var RAMP = (function () {
    var P = T.ramp.path, s = [0];
    for (var i = 1; i < P.length; i++) s.push(s[i - 1] + Math.sqrt(Math.pow(P[i][0] - P[i - 1][0], 2) + Math.pow(P[i][1] - P[i - 1][1], 2)));
    return { P: P, s: s, L: s[s.length - 1], entry: T.ramp.entry };
  })();
  function rampAt(sv) {   // {x, y, z, tx, ty, dz} at a distance along the ramp
    var P = RAMP.P, S = RAMP.s, i = 1;
    sv = Math.max(0, Math.min(RAMP.L, sv));
    while (i < P.length - 1 && S[i] < sv) i++;
    var l = S[i] - S[i - 1] || 1, f = (sv - S[i - 1]) / l, a = P[i - 1], b = P[i];
    return { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f, z: a[2] + (b[2] - a[2]) * f, tx: (b[0] - a[0]) / l, ty: (b[1] - a[1]) / l, dz: (b[2] - a[2]) / l };
  }
  var PBOX = T.pocket.reduce(function (m, p) { return [Math.min(m[0], p[0]), Math.min(m[1], p[1]), Math.max(m[2], p[0]), Math.max(m[3], p[1])]; }, [1e9, 1e9, -1e9, -1e9]);
  function inPocket(x, y) {   // is a point inside the hangar (the pocket behind the targets)?
    if (x < PBOX[0] || x > PBOX[2] || y < PBOX[1] || y > PBOX[3]) return false;
    var p = T.pocket, inside = false;
    for (var i = 0, j = p.length - 1; i < p.length; j = i++) {
      if ((p[i][1] > y) !== (p[j][1] > y) && x < (p[j][0] - p[i][0]) * (y - p[i][1]) / (p[j][1] - p[i][1]) + p[i][0]) inside = !inside;
    }
    return inside;
  }

  // ------------------------------------------------------------ a new game
  function rng(W) { W.seed = (W.seed * 1103515245 + 12345) & 0x7fffffff; return W.seed / 0x7fffffff; }
  function newWorld(speed, set, seed) {
    if (!SPEEDS[speed]) speed = 1;
    var S = SPEEDS[speed];
    var W = {
      speed: speed, g: S.g, seed: (seed == null ? 365 : seed) | 0 || 1, frame: 0,
      score: 0, ball: 1, total: S.balls, extraAt: S.extra.slice(), over: false, demo: false,
      state: 'serve', balls: [], nextId: 1,
      flippers: T.flippers.map(function (f) { return { side: f.side, x: f.x, y: f.y, len: f.len, r0: f.r0, r1: f.r1, rest: f.rest, up: f.up, a: f.rest, w: 0, on: false }; }),
      plunger: { pull: 0, held: false },
      drops: [true, true, true, true, true], dropsDown: 0, dropsT: 0,
      lanes: [false, false, false], skill: -1, skillOpen: false,
      mult: 1, bonus: 0, kickback: true, saucerLit: false,
      saveT: 0, saveArmed: true, autoT: 0, tilt: 0, tilted: false,
      spin: { a: 0, v: 0, n: 0 }, comboT: 0, combo: 0, orbitT: 0, orbitFrom: '',
      stats: { ramps: 0, loops: 0, orbits: 0, drops: 0, saucers: 0, spins: 0, bumpers: 0, skill: 0, kickbacks: 0, saves: 0, tilts: 0 },
      bonusShow: 0, bonusT: 0, bonusAdd: 0,
      lit: { bump: [0, 0, 0], sling: [0, 0], drop: [0, 0, 0, 0, 0], lane: [0, 0, 0], kick: 0, saucer: 0, ramp: 0, orbitL: 0, orbitR: 0, save: 0 },
      dmd: null, events: [], prevL: false, prevR: false, prevUp: false
    };
    serve(W);
    return W;
  }
  function ballAt(W, x, y) {
    var b = { id: W.nextId++, x: x, y: y, vx: 0, vy: 0, px: x, py: y, m: 'free', s: 0, vs: 0, z: 0, hold: 0, sauCd: 0, still: 0, inside: {}, bump: [0, 0, 0], slingCd: [0, 0], launched: false };
    W.balls.push(b);
    return b;
  }
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
    var before = W.score; W.score += pts; W.bonus += bonus || 0;
    while (W.extraAt.length && before < W.extraAt[0] && W.score >= W.extraAt[0]) {
      W.extraAt.shift(); W.total++; W.events.push('extra'); msg(W, 'EXTRA BALL', 'REPLAY AT ' + fmt(W.score), 150); say(W, 'Extra ball!');
    }
  }
  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

  // ------------------------------------------------------------ one step: 1/60 of a second
  function step(W, input) {
    if (W.over) return;
    W.frame++;
    K = tuning(W.g);
    var L = !!(input.left || input.pl), R = !!(input.right || input.pr), plunge = !!(input.fire || input.down || input.pp), nudge = !!input.up;
    if (W.tilted) { L = false; R = false; }
    // the flippers move the lit top lanes along (and make their noise)
    if (L && !W.prevL) { W.events.push({ sfx: 'flip', side: -1 }); rotateLanes(W, -1); }
    if (R && !W.prevR) { W.events.push({ sfx: 'flip', side: 1 }); rotateLanes(W, 1); }
    W.flippers[0].on = L; W.flippers[1].on = R;
    W.prevL = L; W.prevR = R;
    if (nudge && !W.prevUp && W.state === 'play') doNudge(W);
    W.prevUp = nudge;
    W.tilt = Math.max(0, W.tilt - 0.3 / 60);

    // the plunger: held, it pulls back; let go, it fires the ball in the lane (a quick tap fires a medium shot)
    var P = W.plunger;
    if (W.state === 'play') {
      if (plunge) { P.held = true; P.pull = Math.min(1, P.pull + 1 / 54); }
      else if (P.held) { P.held = false; fire(W, P.pull < 0.12 ? -1 : P.pull); P.pull = 0; }
      if (W.autoT > 0 && --W.autoT === 0) fire(W, -1);
    } else { P.held = false; P.pull = 0; }

    for (var k = 0; k < SUB; k++) sub(W);

    // timers
    var lt = W.lit;
    for (var i = 0; i < 3; i++) { if (lt.bump[i] > 0) lt.bump[i]--; }
    for (i = 0; i < 2; i++) if (lt.sling[i] > 0) lt.sling[i]--;
    ['kick', 'saucer', 'ramp', 'orbitL', 'orbitR'].forEach(function (n) { if (lt[n] > 0) lt[n]--; });
    for (i = 0; i < 5; i++) if (lt.drop[i] > 0) lt.drop[i]--;
    for (i = 0; i < 3; i++) if (lt.lane[i] > 0) lt.lane[i]--;
    if (W.comboT > 0 && --W.comboT === 0) W.combo = 0;
    if (W.orbitT > 0 && --W.orbitT === 0) W.orbitFrom = '';
    if (W.saveT > 0) { W.saveT--; lt.save = W.saveT; }
    if (W.dmd && ++W.dmd.n >= W.dmd.t) W.dmd = null;
    // the spinner winds down; every whole turn scores
    var sp = W.spin;
    if (sp.v > 0) {
      sp.a += sp.v; sp.v = Math.max(0, sp.v * 0.985 - 0.004);
      while (sp.a >= 1) { sp.a -= 1; sp.n++; W.stats.spins++; add(W, PTS.spin, 10); W.events.push('spin'); }
    }
    // the targets come back up a while after the hangar has been visited, once no ball is in the way
    if (W.dropsT > 0 && --W.dropsT <= 0) {
      if (W.balls.some(function (b) { return b.m !== 'ramp' && (inPocket(b.x, b.y) || nearDrops(b)); })) W.dropsT = 20;
      else { for (i = 0; i < 5; i++) W.drops[i] = true; W.dropsDown = 0; W.saucerLit = false; W.events.push('reset'); }
    }
    // a ball resting still for too long (not held on a flipper, not in the lane or the hangar) is shaken loose
    W.balls.forEach(function (b) {
      if (b.m !== 'free' || b.x > T.shooter.x0) { b.still = 0; return; }
      var held = (W.flippers[0].on || W.flippers[1].on) && b.y > 360;
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
  function launchSpeed(W, pull) {   // the plunger's curve (table.js), scaled to the table's slope
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

  // ------------------------------------------------------------ the physics: 1/600 of a second
  function sub(W) {
    var g = W.g, i, j, b, f, n = W.balls.length;
    // the flippers swing
    for (i = 0; i < 2; i++) {
      f = W.flippers[i];
      var target = f.on ? f.up : f.rest, d = target - f.a;
      if (Math.abs(d) < 1e-6) { f.w = 0; continue; }
      var dir = d > 0 ? 1 : -1, wmax = f.on ? K.up : K.down;
      f.w += dir * K.acc * DT;
      if (Math.abs(f.w) > wmax) f.w = dir * wmax;
      if (f.w * dir < 0) f.w = dir * Math.min(wmax, K.acc * DT);   // turning round: start from rest
      var na = f.a + f.w * DT;
      if ((na - target) * dir >= 0) { na = target; f.w = 0; }
      f.a = na;
    }
    var tipY = SH.tip + W.plunger.pull * SH.travel;
    for (i = 0; i < n; i++) {
      b = W.balls[i];
      b.px = b.x; b.py = b.y;
      if (b.m === 'held') { holdStep(W, b); continue; }
      if (b.m === 'ramp') { rampStep(W, b, g); continue; }
      b.vy += g * DT;
      var k = 1 - K.roll * DT; b.vx *= k; b.vy *= k;
      var sp2 = b.vx * b.vx + b.vy * b.vy;
      if (sp2 > K.vmax * K.vmax) { var s = K.vmax / Math.sqrt(sp2); b.vx *= s; b.vy *= s; }
      if (b.sauCd > 0) b.sauCd--;
      else if (inPocket(b.x, b.y)) {   // in the hangar: the dished floor rolls it to the saucer, so it can never rest in a corner
        var hx = SAU.x - b.x, hy = SAU.y - b.y, hl = Math.sqrt(hx * hx + hy * hy) || 1, dk = 1 - K.drag * DT;
        b.vx = b.vx * dk + hx / hl * K.dish * DT; b.vy = b.vy * dk + hy / hl * K.dish * DT;
      }
      b.x += b.vx * DT; b.y += b.vy * DT;
      for (var it = 0; it < 2; it++) collide(W, b, tipY);
      if (b.bump[0] > 0) b.bump[0]--; if (b.bump[1] > 0) b.bump[1]--; if (b.bump[2] > 0) b.bump[2]--;
      if (b.slingCd[0] > 0) b.slingCd[0]--; if (b.slingCd[1] > 0) b.slingCd[1]--;
      sensors(W, b);
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
  // surface's own movement - a flipper), with a dead stop for a gentle touch so a ball can rest and roll
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
    for (i = 0; i < WALLS.length; i++) {
      s = WALLS[i]; c = nearSeg(b, s); if (!c) continue;
      if (s.kind === 'sling') {
        var w = W.balls.indexOf(b);
        if (b.slingCd[s.i] === 0 && -(b.vx * c.nx + b.vy * c.ny) > 60 * K.k && c.nx * s.nx + c.ny * s.ny > 0.5) {
          b.x += c.nx * c.pen; b.y += c.ny * c.pen;
          var vn = b.vx * s.nx + b.vy * s.ny;
          b.vx += (K.sling - vn) * s.nx; b.vy += (K.sling - vn) * s.ny;
          b.slingCd[s.i] = 30; W.lit.sling[s.i] = 10; add(W, PTS.sling, 10); W.events.push({ sfx: 'sling', side: s.i ? 1 : -1 });
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
      var B = BUMPERS[i], bx = b.x - B.x, by = b.y - B.y, bl = BR + B.r, bd2 = bx * bx + by * by;
      if (bd2 >= bl * bl) continue;
      var bd = Math.sqrt(bd2) || 1e-6, nx = bx / bd, ny = by / bd;
      b.x += nx * (bl - bd); b.y += ny * (bl - bd);
      var vin = b.vx * nx + b.vy * ny;
      if (b.bump[i] === 0) {
        b.vx += (K.bump - vin) * nx; b.vy += (K.bump - vin) * ny; b.bump[i] = 18;
        W.lit.bump[i] = 8; W.stats.bumpers++; add(W, PTS.bumper, 10); W.events.push({ sfx: 'bumper', i: i });
        skillOver(W);
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
    // the plunger's tip (only in the shooter lane)
    if (b.x > SH.x0 && b.y > tipY - BR) { var pp = b.y - (tipY - BR); bounce(b, 0, -1, pp, 0.2); }
    // the flippers
    for (i = 0; i < 2; i++) flipperHit(W, W.flippers[i], b);
  }
  function flipperHit(W, f, b) {
    var cx = Math.cos(f.a), cy = Math.sin(f.a), dx = b.x - f.x, dy = b.y - f.y;
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

  // ------------------------------------------------------------ the warp ramp and the hangar
  function rampStep(W, b, g) {
    var r = rampAt(b.s);
    var a = g * r.ty - K.gz * r.dz - (b.vs > 0 ? K.rampF : -K.rampF);
    b.vs += a * DT; b.s += b.vs * DT;
    if (b.s <= 0) {   // not fast enough: it rolls back out of the entrance
      r = rampAt(0); b.m = 'free'; b.x = r.x; b.y = r.y + 2; b.z = 0;
      b.vx = r.tx * b.vs; b.vy = r.ty * b.vs; W.events.push('rampfail');
      return;
    }
    if (b.s >= RAMP.L) {   // made it: drops into the left inlane
      r = rampAt(RAMP.L); b.m = 'free'; b.x = r.x; b.y = r.y; b.z = 0;
      b.vx = r.tx * b.vs; b.vy = r.ty * b.vs;
      rampMade(W);
      return;
    }
    b.x = r.x; b.y = r.y; b.z = r.z; b.vx = r.tx * b.vs; b.vy = r.ty * b.vs;
  }
  function rampMade(W) {
    W.stats.ramps++;
    W.combo = W.comboT > 0 ? Math.min(5, W.combo + 1) : 1; W.comboT = 4 * 60;
    var pts = PTS.ramp * W.combo;
    add(W, pts, 1000); W.lit.ramp = 60;
    if (W.combo > 1) { W.events.push({ sfx: 'combo', n: W.combo }); msg(W, 'COMBO X' + W.combo, fmt(pts), 110); say(W, 'Ramp combo times ' + W.combo); }
    else { W.events.push('ramp'); msg(W, 'WARP RAMP', fmt(pts), 90); }
  }
  function holdStep(W, b) {
    b.vx = 0; b.vy = 0; b.x = SAU.x; b.y = SAU.y;
    if (--b.hold > 0) return;   // (counted in substeps)
    // out it goes; it can't be caught again (or pulled back by the dished floor) until it is well clear
    b.m = 'free'; b.vx = SAU.eject[0] * K.k; b.vy = SAU.eject[1] * K.k; b.y += 1; b.sauCd = SUB * 30;
    W.events.push('eject');
    W.dropsT = 60;   // the targets come back up a second after the ball has left
  }
  function nearDrops(b) { for (var i = 0; i < DROPS.length; i++) if (nearSeg(b, DROPS[i], 3)) return true; return false; }
  function dropHit(W, i) {
    W.drops[i] = false; W.dropsDown++; W.stats.drops++; W.lit.drop[i] = 20;
    add(W, PTS.drop, 200); W.events.push({ sfx: 'drop', i: i });
    skillOver(W);
    if (W.dropsDown === 5) {
      add(W, PTS.drops, 2000); W.saucerLit = true; W.kickback = true; W.lit.kick = 90;
      W.events.push('drops'); msg(W, 'HANGAR OPEN', 'SHOOT IT FOR 15,000', 150); say(W, 'All five targets down - the hangar is open');
      W.dropsT = 20 * 60;   // left open for 20 seconds
    }
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
    var en = RAMP.entry;
    if (b.py >= en.y && b.y < en.y && b.x > en.x0 && b.x < en.x1 && b.vy < 0) {
      b.m = 'ramp'; b.s = 0.01; b.vs = -b.vy; b.z = 0; W.events.push('rampin'); skillOver(W);
    }
    // the hangar's saucer
    if (b.m === 'free' && b.sauCd === 0) {
      var sx = b.x - SAU.x, sy = b.y - SAU.y;
      if (sx * sx + sy * sy < SAU.catchR * SAU.catchR && b.vx * b.vx + b.vy * b.vy < SAU.maxV * SAU.maxV * K.k * K.k) {
        b.m = 'held'; b.hold = SAU.hold * SUB; b.x = SAU.x; b.y = SAU.y; b.vx = b.vy = 0;
        W.stats.saucers++; W.lit.saucer = SAU.hold;
        // in through a gap: the hangar doors open (any targets still up drop, no points) so the eject has a clear way out
        if (W.dropsDown < 5) { for (i = 0; i < 5; i++) W.drops[i] = false; W.dropsDown = 5; }
        var pts = W.saucerLit ? PTS.saucerLit : PTS.saucer;
        add(W, pts, 1500); W.events.push(W.saucerLit ? 'jackpot' : 'saucer');
        msg(W, W.saucerLit ? 'HANGAR JACKPOT' : 'HANGAR', fmt(pts), SAU.hold);
        if (W.saucerLit) say(W, 'Hangar jackpot, 15,000');
        W.saucerLit = false; skillOver(W);
      }
    }
  }
  function skillOver(W) { W.skillOpen = false; }
  function rollover(W, b, id) {
    if (id.indexOf('lane') === 0) {
      var i = +id.charAt(4);
      if (W.skillOpen && i === W.skill) {
        W.stats.skill++; add(W, PTS.skill, 2000); W.events.push('skill'); msg(W, 'SKILL SHOT', fmt(PTS.skill), 150); say(W, 'Skill shot! 25,000');
      }
      skillOver(W);
      add(W, PTS.lane, 100); W.lit.lane[i] = 30;
      if (!W.lanes[i]) { W.lanes[i] = true; W.events.push('lane'); }
      if (W.lanes[0] && W.lanes[1] && W.lanes[2]) {
        W.lanes = [false, false, false];
        if (W.mult < 5) { W.mult++; W.events.push('mult'); msg(W, 'BONUS X' + W.mult, '', 110); say(W, 'Bonus multiplier ' + W.mult); }
        else { add(W, 25000, 0); W.events.push('mult'); msg(W, 'LANES', '25,000', 110); }
      }
    } else if (id === 'inL' || id === 'inR') { add(W, PTS.inlane, 100); W.events.push('inlane'); }
    else if (id === 'outL' || id === 'outR') { if (b.vy > 0) { add(W, PTS.outlane, 200); W.events.push('outlane'); } }
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
    }
  }
  // a shot up an orbit. Another orbit shot (either side) inside 4 seconds = a LOOP: each orbit comes back down the other
  // side to the flipper that shoots the same orbit again (the lead, 15 Oct 2026: up one and then up the other in 3 s was
  // almost never made - the bot made 0.01 a game)
  function orbit(W, from) {
    skillOver(W);
    if (W.orbitFrom) {
      W.stats.loops++; add(W, PTS.loop, 1000); W.events.push('loop'); msg(W, 'LOOP', fmt(PTS.loop), 100); W.orbitFrom = ''; W.orbitT = 0; return;
    }
    W.stats.orbits++; add(W, PTS.orbit, 500); W.events.push('orbit'); msg(W, 'ORBIT', fmt(PTS.orbit), 80);
    W.orbitFrom = from; W.orbitT = 4 * 60;
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

  return {
    W: T.W, H: T.H, BALL: BR, SPEEDS: SPEEDS, PTS: PTS, TABLE: T, RAMP: RAMP, DROPS: DROPS, GATES: GATES, WALLS: WALLS,
    newWorld: newWorld, step: step, hud: hud, rampAt: rampAt, inPocket: inPocket, fmt: fmt,
    addBall: ballAt, POSTS: POSTS, BUMPERS: BUMPERS, FLIP: FLIP
  };
});
