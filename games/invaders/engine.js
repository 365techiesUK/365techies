/* 365 Invaders - the rules (3 Oct 2026). Our own game in the style of the 1978 arcade classics: our own names, pixel art
 * and sounds. No drawing here, so the tests run it in node (engine.test.mjs). 60 steps a second; sizes in the game's own
 * pixels on a 224 x 256 screen.
 *
 * The world: a formation of 5 rows of 11 invaders that ripples sideways one invader at a time (so it speeds up as it
 * thins out), drops at the edges and fires bombs; four shields that wear away pixel by pixel; one player shot at a time;
 * a mystery ship across the top. Waves start a little lower each time. The game reports what happened in world.events
 * (sound names, {sfx, n} and {say}) for the arcade cabinet (../common/arcade.js) to play. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.InvEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var WIDTH = 224, HEIGHT = 256, PY = 216, GROUND = 239, ROWS = 5, COLS = 11, CELL_X = 16, CELL_Y = 16;
  var LEFT = 8, RIGHT = 216, SAUCER_Y = 26, EXTRA_AT = 1500;
  // the three speeds: 1 Gentle (slower, 5 lives), 2 Classic (the old arcade pace), 3 Fast
  var SPEEDS = {
    1: { name: 'Gentle', lives: 5, rate: 0.6, ship: 1.5, bomb: 1.0, bombs: 2, reload: 80, saucer: 0.6 },
    2: { name: 'Classic', lives: 3, rate: 1.0, ship: 1.0, bomb: 1.25, bombs: 3, reload: 50, saucer: 0.75 },
    3: { name: 'Fast', lives: 3, rate: 1.4, ship: 1.5, bomb: 1.6, bombs: 3, reload: 34, saucer: 1.0 }
  };
  var POINTS = [30, 20, 20, 10, 10];   // by row, top to bottom
  var TYPE = [0, 1, 1, 2, 2];          // the three kinds of invader, by row
  // each kind's width in pixels and where its picture starts inside the 12-pixel cell (to hit what you see)
  var BOX = [{ x0: 2, x1: 10 }, { x0: 0, x1: 12 }, { x0: 0, x1: 12 }];
  // the shield: 22 x 16, rounded top, an arch underneath
  var SHIELD = [
    '....##############....',
    '...################...',
    '..##################..',
    '.####################.',
    '######################',
    '######################',
    '######################',
    '######################',
    '######################',
    '######################',
    '######################',
    '#######........#######',
    '######..........######',
    '#####............#####',
    '#####............#####',
    '#####............#####'
  ];
  var SHIELD_W = 22, SHIELD_H = 16, SHIELD_Y = 190;
  var MYSTERY = [50, 100, 100, 150, 50, 100, 300, 100, 150, 50];

  function rngOf(seed) {   // mulberry32: the same seed, the same game (for the tests)
    var a = seed >>> 0;
    return function () { a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  function newWorld(speed, seed) {
    speed = SPEEDS[speed] ? speed : 1;
    var sp = SPEEDS[speed];
    var W = {
      speed: speed, sp: sp, rng: rngOf(seed == null ? (Date.now() ^ (Math.random() * 1e9)) : seed),
      score: 0, lives: sp.lives, wave: 0, frame: 0, events: [], over: false, landed: false, extraGiven: false,
      player: { x: 104, dead: 0 }, shot: null, bombs: [], booms: [], pops: [], saucer: null, saucerT: 1200, shotsFired: 0,
      invaders: [], order: [], shields: [], phase: 'spawn', phaseT: 0, spawnN: 0, dir: 1, drop: false, ptr: 0, acc: 0,
      bombT: 90, beatN: 0, lastBeat: -99, hold: 0, ufoN: 0
    };
    nextWave(W);
    return W;
  }

  function nextWave(W) {
    W.wave++;
    var top = 48 + 8 * Math.min(W.wave - 1, 5);   // each wave starts a row lower, up to five rows
    W.invaders = []; W.order = [];
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++)
      W.invaders.push({ r: r, c: c, type: TYPE[r], x: 26 + c * CELL_X, y: top + r * CELL_Y, alive: true, f: 0 });
    // the ripple moves the bottom row first, left to right, then the row above
    for (r = ROWS - 1; r >= 0; r--) for (c = 0; c < COLS; c++) W.order.push(r * COLS + c);
    W.shields = [];
    for (var s = 0; s < 4; s++) {
      var px = new Uint8Array(SHIELD_W * SHIELD_H);
      for (var y = 0; y < SHIELD_H; y++) for (var x = 0; x < SHIELD_W; x++) px[y * SHIELD_W + x] = SHIELD[y].charAt(x) === '#' ? 1 : 0;
      W.shields.push({ x: 33 + s * 45, y: SHIELD_Y, w: SHIELD_W, h: SHIELD_H, px: px, ver: 0 });
    }
    W.dir = 1; W.drop = false; W.ptr = 0; W.acc = 0; W.bombs = []; W.shot = null; W.saucer = null;
    W.phase = 'spawn'; W.phaseT = 0; W.spawnN = 0; W.bombT = 90;
  }

  function alive(W) { var n = 0; for (var i = 0; i < W.invaders.length; i++) if (W.invaders[i].alive) n++; return n; }
  function box(inv) { var b = BOX[inv.type]; return { x: inv.x + b.x0, y: inv.y, w: b.x1 - b.x0, h: 8 }; }
  function overlap(a, b) { return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h; }

  // ---------------------------------------------------------------- shields
  function shieldAt(W, x, y, w, h) {   // the first shield pixel inside the box, or null
    for (var s = 0; s < W.shields.length; s++) {
      var S = W.shields[s];
      if (x + w <= S.x || x >= S.x + S.w || y + h <= S.y || y >= S.y + S.h) continue;
      var x0 = Math.max(0, Math.floor(x - S.x)), x1 = Math.min(S.w, Math.ceil(x + w - S.x));
      var y0 = Math.max(0, Math.floor(y - S.y)), y1 = Math.min(S.h, Math.ceil(y + h - S.y));
      for (var yy = y0; yy < y1; yy++) for (var xx = x0; xx < x1; xx++) if (S.px[yy * S.w + xx]) return { s: S, x: xx, y: yy };
    }
    return null;
  }
  function splat(W, hit) {   // knock a ragged hole round the spot
    var S = hit.s;
    for (var dy = -3; dy <= 3; dy++) for (var dx = -3; dx <= 3; dx++) {
      var d = Math.abs(dx) + Math.abs(dy), x = hit.x + dx, y = hit.y + dy;
      if (d > 3 || x < 0 || y < 0 || x >= S.w || y >= S.h) continue;
      if (d <= 1 || W.rng() < 0.55) S.px[y * S.w + x] = 0;
    }
    S.ver++;
  }
  function clearUnder(W, b) {   // an invader marching through a shield wipes it out
    for (var s = 0; s < W.shields.length; s++) {
      var S = W.shields[s], hit = false;
      if (!overlap(b, S)) continue;
      for (var y = Math.max(0, b.y - S.y); y < Math.min(S.h, b.y + b.h - S.y); y++)
        for (var x = Math.max(0, b.x - S.x); x < Math.min(S.w, b.x + b.w - S.x); x++) if (S.px[y * S.w + x]) { S.px[y * S.w + x] = 0; hit = true; }
      if (hit) S.ver++;
    }
  }

  // ---------------------------------------------------------------- the formation's ripple
  function moveOne(W) {
    var n = W.order.length;
    for (var tries = 0; tries <= n; tries++) {
      if (W.ptr >= n) { endCycle(W); if (W.over || W.phase !== 'play') return; }
      var inv = W.invaders[W.order[W.ptr++]];
      if (!inv.alive) continue;
      if (W.drop) inv.y += 8; else inv.x += 2 * W.dir;
      inv.f ^= 1;
      var b = box(inv);
      clearUnder(W, b);
      if (b.y + b.h >= PY + 2) { landed(W); }
      return;
    }
  }
  function endCycle(W) {
    W.ptr = 0;
    if (W.drop) W.drop = false;
    else {
      var minX = 999, maxX = -999;
      for (var i = 0; i < W.invaders.length; i++) {
        var v = W.invaders[i]; if (!v.alive) continue;
        var b = box(v); minX = Math.min(minX, b.x); maxX = Math.max(maxX, b.x + b.w);
      }
      if ((W.dir > 0 && maxX + 2 > RIGHT) || (W.dir < 0 && minX - 2 < LEFT)) { W.drop = true; W.dir = -W.dir; }
    }
    if (W.frame - W.lastBeat >= 6) { W.lastBeat = W.frame; W.events.push({ sfx: 'beat', n: W.beatN }); W.beatN = (W.beatN + 1) & 3; }
  }
  function landed(W) {
    if (W.landed) return;
    W.landed = true; W.lives = 1; killPlayer(W);
  }

  // ---------------------------------------------------------------- the player
  function killPlayer(W) {
    if (W.player.dead) return;
    W.player.dead = 100; W.lives--; W.bombs = [];
    W.events.push('boom');
  }
  function addScore(W, pts) {
    W.score += pts;
    if (!W.extraGiven && W.score >= EXTRA_AT) {
      W.extraGiven = true; W.lives = Math.min(9, W.lives + 1);
      W.events.push('extra'); W.events.push({ say: 'Extra life!' });
    }
  }

  function step(W, input) {
    W.frame++;
    input = input || {};
    var sp = W.sp, P = W.player, i;
    // explosions and floating scores fade whatever else is going on
    for (i = W.booms.length - 1; i >= 0; i--) if (--W.booms[i].t <= 0) W.booms.splice(i, 1);
    for (i = W.pops.length - 1; i >= 0; i--) if (--W.pops[i].t <= 0) W.pops.splice(i, 1);

    if (P.dead) {   // the player's ship is exploding: everything waits
      if (--P.dead === 0) {
        if (W.lives <= 0) { W.over = true; W.events.push('over'); return; }
        W.hold = 40; W.shot = null;
      }
      return;
    }

    // the ship moves (between waves too)
    var target = null;
    if (input.mouseX != null) target = input.mouseX - 6.5;
    var dx = 0;
    if (target != null) { var d = target - P.x; dx = Math.max(-sp.ship * 1.4, Math.min(sp.ship * 1.4, d)); if (Math.abs(d) < 0.5) dx = 0; }
    else if (input.left && !input.right) dx = -sp.ship;
    else if (input.right && !input.left) dx = sp.ship;
    P.x = Math.max(LEFT, Math.min(RIGHT - 13, P.x + dx));

    if (W.hold > 0) { W.hold--; return; }

    if (W.phase === 'spawn') {   // the new wave appears one invader at a time
      W.spawnN = Math.min(W.invaders.length, W.spawnN + 1);
      if (W.spawnN >= W.invaders.length) { W.phase = 'play'; if (W.wave > 1) W.events.push({ say: 'Wave ' + W.wave + ' – here they come' }); }
      return;
    }
    if (W.phase === 'clear') {
      if (--W.phaseT <= 0) nextWave(W);
      return;
    }

    // fire
    if ((input.fire || input.tap) && !W.shot) { W.shot = { x: Math.round(P.x + 6), y: PY - 4 }; W.shotsFired++; W.events.push('shoot'); }
    // the formation
    W.acc += sp.rate;
    while (W.acc >= 1 && W.phase === 'play' && !P.dead) { W.acc -= 1; moveOne(W); }
    if (P.dead) return;

    moveShot(W);
    if (W.phase !== 'play') return;
    moveBombs(W);
    if (P.dead) return;
    dropBombs(W);
    moveSaucer(W);

    if (alive(W) === 0) {
      W.phase = 'clear'; W.phaseT = 150; W.bombs = []; W.shot = null; W.saucer = null;
      W.events.push('wave'); W.events.push({ say: 'Wave ' + W.wave + ' cleared!' });
    }
  }

  function moveShot(W) {
    var s = W.shot; if (!s) return;
    for (var k = 0; k < 4; k++) {   // a pixel at a time, so nothing is jumped over
      s.y -= 1;
      if (s.y < 16) { W.booms.push({ kind: 'top', x: s.x - 3, y: 14, t: 14 }); W.shot = null; return; }
      // an invader
      for (var i = 0; i < W.invaders.length; i++) {
        var v = W.invaders[i]; if (!v.alive) continue;
        var b = box(v);
        if (s.x >= b.x && s.x < b.x + b.w && s.y + 4 > b.y && s.y < b.y + b.h) {
          v.alive = false; addScore(W, POINTS[v.r]);
          W.booms.push({ kind: 'inv', x: v.x, y: v.y, t: 16 });
          W.events.push('hit'); W.shot = null; return;
        }
      }
      // the mystery ship
      var U = W.saucer;
      if (U && s.x >= U.x && s.x < U.x + 16 && s.y < SAUCER_Y + 7 && s.y + 4 > SAUCER_Y) {
        var pts = MYSTERY[Math.floor(W.rng() * MYSTERY.length)];
        addScore(W, pts); W.saucer = null; W.saucerT = 1500;
        W.booms.push({ kind: 'ufo', x: U.x, y: SAUCER_Y, t: 24 });
        W.pops.push({ text: String(pts), x: U.x + 8, y: SAUCER_Y, t: 90 });
        W.events.push('ufohit'); W.shot = null; return;
      }
      // a bomb: both go
      for (var j = 0; j < W.bombs.length; j++) {
        var B = W.bombs[j];
        if (s.x >= B.x - 1 && s.x <= B.x + 3 && s.y < B.y + 7 && s.y + 4 > B.y) {
          W.bombs.splice(j, 1); W.booms.push({ kind: 'small', x: s.x - 3, y: s.y - 2, t: 10 }); W.shot = null; return;
        }
      }
      // a shield
      var hit = shieldAt(W, s.x, s.y, 1, 4);
      if (hit) { splat(W, hit); W.shot = null; return; }
    }
  }

  function dropBombs(W) {
    if (--W.bombT > 0 || W.bombs.length >= W.sp.bombs) return;
    var reload = W.sp.reload * Math.max(0.6, 1 - (W.wave - 1) * 0.06);
    W.bombT = Math.round(reload * (0.6 + W.rng() * 0.8));
    // the lowest invader in each column can drop one; a third of the time it's the column above the ship
    var low = {};
    for (var i = 0; i < W.invaders.length; i++) { var v = W.invaders[i]; if (v.alive && (!low[v.c] || v.y > low[v.c].y)) low[v.c] = v; }
    var cols = Object.keys(low); if (!cols.length) return;
    var shooter = null;
    if (W.rng() < 0.34) {
      var px = W.player.x + 6.5, best = 999;
      cols.forEach(function (k) { var b = box(low[k]), d = Math.abs(b.x + b.w / 2 - px); if (d < best) { best = d; shooter = low[k]; } });
    } else shooter = low[cols[Math.floor(W.rng() * cols.length)]];
    W.bombs.push({ x: shooter.x + 5, y: shooter.y + 8, kind: Math.floor(W.rng() * 3), f: 0 });
  }

  function moveBombs(W) {
    var P = W.player, sp = W.sp;
    for (var i = W.bombs.length - 1; i >= 0; i--) {
      var B = W.bombs[i];
      B.y += sp.bomb; B.f++;
      var hit = shieldAt(W, B.x, B.y + 4, 3, 3);
      if (hit) { splat(W, hit); W.bombs.splice(i, 1); continue; }
      // the ship: its body and its nose
      if (overlap({ x: B.x, y: B.y, w: 3, h: 7 }, { x: P.x + 1, y: PY + 3, w: 11, h: 5 }) || overlap({ x: B.x, y: B.y, w: 3, h: 7 }, { x: P.x + 5, y: PY, w: 3, h: 3 })) {
        W.bombs.splice(i, 1); killPlayer(W); return;
      }
      if (B.y + 7 >= GROUND) { W.booms.push({ kind: 'small', x: B.x - 2, y: GROUND - 6, t: 10 }); W.bombs.splice(i, 1); }
    }
  }

  function moveSaucer(W) {
    var U = W.saucer;
    if (!U) {
      if (--W.saucerT <= 0) {
        if (alive(W) >= 8) { var dir = W.shotsFired % 2 ? -1 : 1; W.saucer = { x: dir > 0 ? -16 : WIDTH, dir: dir }; }
        else W.saucerT = 600;
      }
      return;
    }
    U.x += U.dir * W.sp.saucer;
    if (W.frame % 7 === 0) W.events.push({ sfx: 'ufo', n: W.ufoN++ });
    if (U.x < -18 || U.x > WIDTH + 2) { W.saucer = null; W.saucerT = 1500; }
  }

  function hud(W) { return { score: W.score, lives: Math.max(0, W.lives), wave: W.wave }; }

  return {
    WIDTH: WIDTH, HEIGHT: HEIGHT, PY: PY, GROUND: GROUND, ROWS: ROWS, COLS: COLS, SPEEDS: SPEEDS, POINTS: POINTS, MYSTERY: MYSTERY,
    SHIELD_Y: SHIELD_Y, SAUCER_Y: SAUCER_Y, EXTRA_AT: EXTRA_AT,
    newWorld: newWorld, step: step, hud: hud, alive: alive, box: box, shieldAt: shieldAt, nextWave: nextWave
  };
});
