/* 365 Invaders - the rules (3 Oct 2026; Enhanced added the same evening). Our own game in the style of the 1978 arcade
 * classics: our own names, pixel art and sounds. No drawing here, so the tests run it in node (engine.test.mjs).
 * 60 steps a second; sizes in the game's own pixels on a 224 x 256 screen.
 *
 * Both styles: a formation of 5 rows of 11 invaders that ripples sideways one invader at a time (so it speeds up as it
 * thins out), drops at the edges and fires bombs; four shields that wear away pixel by pixel; a mystery ship across the
 * top; waves start a little lower each time.
 * Classic ('classic', the default here): exactly that - one shot at a time, one extra life at 1,500.
 * Enhanced ('enh', the page's default): the same game plus falling power-up capsules (rapid fire, spread shot, a shield
 * bubble), a combo multiplier for hitting without missing (up to x4), a Mothership boss every 5th wave, a bonus for a
 * wave cleared without losing a ship, and an extra life every 5,000 after the first.
 * The game reports what happened in world.events (sounds and {say}) for the arcade cabinet, and in world.fx (where
 * things happened, for explosions and the like) for the Enhanced picture. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.InvEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var WIDTH = 224, HEIGHT = 256, PY = 216, GROUND = 239, ROWS = 5, COLS = 11, CELL_X = 16, CELL_Y = 16;
  var LEFT = 8, RIGHT = 216, SAUCER_Y = 26, EXTRA_AT = 1500, EXTRA_EVERY = 5000, BOSS_EVERY = 5;
  // the three speeds: 1 Gentle (slower, 5 lives), 2 Classic (the old arcade pace), 3 Fast
  var SPEEDS = {
    1: { name: 'Gentle', lives: 5, rate: 0.6, ship: 1.5, bomb: 1.0, bombs: 2, reload: 80, saucer: 0.6, cap: 0.10, power: 900, bossHp: 24, bossSpeed: 0.45, bossFire: 120 },
    2: { name: 'Classic', lives: 3, rate: 1.0, ship: 1.0, bomb: 1.25, bombs: 3, reload: 50, saucer: 0.75, cap: 0.07, power: 660, bossHp: 34, bossSpeed: 0.6, bossFire: 90 },
    3: { name: 'Fast', lives: 3, rate: 1.4, ship: 1.5, bomb: 1.6, bombs: 3, reload: 34, saucer: 1.0, cap: 0.06, power: 540, bossHp: 44, bossSpeed: 0.8, bossFire: 70 }
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
  var BOSS_W = 48, BOSS_H = 20, BOSS_Y = 40;
  var POWER_NAMES = { rapid: 'Rapid fire!', spread: 'Spread shot!', shield: 'Shield on!' };

  function rngOf(seed) {   // mulberry32: the same seed, the same game (for the tests)
    var a = seed >>> 0;
    return function () { a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  function newWorld(speed, seed, style) {
    speed = SPEEDS[speed] ? speed : 1;
    var sp = SPEEDS[speed], enh = style === 'enh';
    var W = {
      speed: speed, sp: sp, style: enh ? 'enh' : 'classic', enh: enh,
      rng: rngOf(seed == null ? (Date.now() ^ (Math.random() * 1e9)) : seed),
      score: 0, lives: sp.lives, wave: 0, frame: 0, events: [], fx: [], over: false, landed: false,
      extraGiven: false, nextExtra: EXTRA_AT,
      player: { x: 104, dead: 0 }, shots: [], bombs: [], booms: [], pops: [], saucer: null, saucerT: 1200, shotsFired: 0,
      invaders: [], order: [], shields: [], phase: 'spawn', phaseT: 0, spawnN: 0, spawnAt: 0, dir: 1, drop: false, ptr: 0, acc: 0,
      bombT: 90, beatN: 0, lastBeat: -99, hold: 0, intro: 0, ufoN: 0,
      caps: [], power: null, shieldUp: false, combo: 0, mult: 1, boss: null, waveDeaths: 0
    };
    nextWave(W);
    return W;
  }
  function fx(W, o) { if (W.fx.length >= 300) W.fx.shift(); W.fx.push(o); }

  function nextWave(W) {
    W.wave++; W.waveDeaths = 0;
    var bossWave = W.enh && W.wave % BOSS_EVERY === 0;
    var top = 48 + 8 * Math.min(W.wave - 1, 5);   // each wave starts a row lower, up to five rows
    W.invaders = []; W.order = [];
    if (!bossWave) {
      for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++)
        W.invaders.push({ r: r, c: c, type: TYPE[r], x: 26 + c * CELL_X, y: top + r * CELL_Y, alive: true, f: 0 });
      // the ripple moves the bottom row first, left to right, then the row above
      for (r = ROWS - 1; r >= 0; r--) for (c = 0; c < COLS; c++) W.order.push(r * COLS + c);
    }
    W.shields = [];
    for (var s = 0; s < 4; s++) {
      var px = new Uint8Array(SHIELD_W * SHIELD_H);
      for (var y = 0; y < SHIELD_H; y++) for (var x = 0; x < SHIELD_W; x++) px[y * SHIELD_W + x] = SHIELD[y].charAt(x) === '#' ? 1 : 0;
      W.shields.push({ x: 33 + s * 45, y: SHIELD_Y, w: SHIELD_W, h: SHIELD_H, px: px, ver: 0 });
    }
    W.dir = 1; W.drop = false; W.ptr = 0; W.acc = 0; W.bombs = []; W.shots = []; W.saucer = null; W.caps = [];
    W.phase = 'spawn'; W.phaseT = 0; W.spawnN = 0; W.spawnAt = W.frame; W.bombT = 90;
    W.boss = null; W.intro = 0;
    if (bossWave) {
      var hp = W.sp.bossHp + 8 * (W.wave / BOSS_EVERY - 1);   // each Mothership a little tougher
      W.boss = { x: (WIDTH - BOSS_W) / 2, y: BOSS_Y, w: BOSS_W, h: BOSS_H, hp: hp, max: hp, dir: 1, t: 0, fireT: 100, phase: 1, dead: 0, flash: 0, drops: 0 };
      W.intro = 150;
      W.events.push('warning'); W.events.push({ say: 'Wave ' + W.wave + ': the Mothership is coming!' });
    }
    fx(W, { k: 'wave', n: W.wave, boss: bossWave });
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
    fx(W, { k: 'shield', x: S.x + hit.x, y: S.y + hit.y });
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
    beat(W, 6);
  }
  function beat(W, gap) {
    if (W.frame - W.lastBeat >= gap) { W.lastBeat = W.frame; W.events.push({ sfx: 'beat', n: W.beatN }); W.beatN = (W.beatN + 1) & 3; }
  }
  function landed(W) {
    if (W.landed) return;
    W.landed = true; W.lives = 1; W.shieldUp = false; killPlayer(W);
  }

  // ---------------------------------------------------------------- the player
  function killPlayer(W) {
    if (W.player.dead) return;
    W.player.dead = 100; W.lives--; W.bombs = []; W.waveDeaths++;
    W.power = null; W.shieldUp = false; breakCombo(W);
    W.events.push({ sfx: 'boom', x: W.player.x + 6 });
    fx(W, { k: 'die', x: W.player.x + 6.5, y: PY + 4 });
  }
  function addScore(W, pts) {
    W.score += pts;
    if (W.enh) {
      while (W.score >= W.nextExtra) {
        W.nextExtra = W.nextExtra === EXTRA_AT ? EXTRA_AT + EXTRA_EVERY : W.nextExtra + EXTRA_EVERY;
        W.extraGiven = true; W.lives = Math.min(9, W.lives + 1);
        W.events.push('extra'); W.events.push({ say: 'Extra life!' }); fx(W, { k: 'extra' });
      }
    } else if (!W.extraGiven && W.score >= EXTRA_AT) {
      W.extraGiven = true; W.lives = Math.min(9, W.lives + 1);
      W.events.push('extra'); W.events.push({ say: 'Extra life!' });
    }
  }
  // combo: every 6 hits in a row without a miss raises the multiplier, up to x4
  function hitCombo(W) {
    if (!W.enh) return 1;
    W.combo++;
    var m = 1 + Math.min(3, Math.floor(W.combo / 6));
    if (m > W.mult) { W.mult = m; W.events.push({ sfx: 'combo', n: m }); fx(W, { k: 'combo', n: m }); }
    return W.mult;
  }
  function breakCombo(W) {
    if (!W.combo) return;
    var had = W.mult; W.combo = 0; W.mult = 1;
    if (had > 1) { W.events.push('combobreak'); fx(W, { k: 'combobreak' }); }
  }

  function step(W, input) {
    W.frame++;
    input = input || {};
    var sp = W.sp, P = W.player, i;
    // explosions and floating scores fade whatever else is going on
    for (i = W.booms.length - 1; i >= 0; i--) if (--W.booms[i].t <= 0) W.booms.splice(i, 1);
    for (i = W.pops.length - 1; i >= 0; i--) if (--W.pops[i].t <= 0) W.pops.splice(i, 1);

    if (P.dead) {   // the player's ship is exploding: everything waits
      if (W.boss && W.boss.flash) W.boss.flash--;
      if (--P.dead === 0) {
        if (W.lives <= 0) { W.over = true; W.events.push('over'); return; }
        W.hold = 40; W.shots = [];
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
    P.vx = dx;
    if (W.power && --W.power.t <= 0) { W.power = null; W.events.push('powerdown'); fx(W, { k: 'powerdown' }); }
    moveCaps(W);

    if (W.hold > 0) { W.hold--; return; }
    if (W.intro > 0) { if (--W.intro === 0) W.phase = 'play'; return; }   // the Mothership coming down

    if (W.phase === 'spawn') {   // the new wave appears one invader at a time
      W.spawnN = Math.min(W.invaders.length, W.spawnN + 1);
      if (W.spawnN >= W.invaders.length) { W.phase = 'play'; if (W.wave > 1 && !W.boss) W.events.push({ say: 'Wave ' + W.wave + ' – here they come' }); }
      return;
    }
    if (W.phase === 'clear') {
      if (--W.phaseT <= 0) nextWave(W);
      return;
    }

    if (input.fire || input.tap) fire(W);
    // the formation
    if (W.order.length) {
      W.acc += sp.rate;
      while (W.acc >= 1 && W.phase === 'play' && !P.dead) { W.acc -= 1; moveOne(W); }
      if (P.dead) return;
    }

    moveShots(W);
    if (W.phase !== 'play') return;
    moveBombs(W);
    if (P.dead) return;
    if (W.boss) bossStep(W);
    else { dropBombs(W); moveSaucer(W); }

    if (!W.boss && alive(W) === 0) {
      W.phase = 'clear'; W.phaseT = 150; W.bombs = []; W.shots = []; W.saucer = null;
      if (W.enh && W.waveDeaths === 0) {
        addScore(W, 500);
        W.events.push('perfect'); W.events.push({ say: 'Perfect wave! +500' }); fx(W, { k: 'perfect', n: W.wave });
      } else { W.events.push('wave'); W.events.push({ say: 'Wave ' + W.wave + ' cleared!' }); }
      fx(W, { k: 'cleared', n: W.wave });
    }
  }

  // ---------------------------------------------------------------- shots
  function fire(W) {
    var cx = Math.round(W.player.x + 6), y = PY - 4, k = W.enh && W.power ? W.power.kind : '';
    if (k === 'spread') {
      if (W.shots.length) return;
      addShot(W, cx, y, -0.7, 4, true); addShot(W, cx, y, 0, 4, true); addShot(W, cx, y, 0.7, 4, true);
    } else if (k === 'rapid') {
      if (W.shots.length >= 2 || (W.shots.length && W.shots[W.shots.length - 1].y > PY - 50)) return;
      addShot(W, cx, y, 0, 6, false);
    } else {
      if (W.shots.length) return;
      addShot(W, cx, y, 0, 4, false);
    }
    W.shotsFired++;
    W.events.push({ sfx: 'shoot', x: cx, kind: k });
    fx(W, { k: 'shot', x: cx, y: y, kind: k });
  }
  function addShot(W, x, y, dx, vy, spread) { W.shots.push({ x: x, y: y, dx: dx, vy: vy, spread: spread }); }
  function moveShots(W) {
    for (var i = W.shots.length - 1; i >= 0; i--) {
      var s = W.shots[i], res = moveShot(W, s);
      if (!res) continue;
      var j = W.shots.indexOf(s); if (j >= 0) W.shots.splice(j, 1);
      if (res === 'miss' && W.enh && !s.spread) breakCombo(W);
      if (W.phase !== 'play') return;
    }
  }
  function moveShot(W, s) {
    for (var k = 0; k < s.vy; k++) {   // a pixel at a time, so nothing is jumped over
      s.y -= 1; s.x += s.dx / s.vy;
      var sx = Math.round(s.x);
      if (s.y < 16) { W.booms.push({ kind: 'top', x: sx - 3, y: 14, t: 14 }); fx(W, { k: 'top', x: sx, y: 16 }); return 'miss'; }
      if (sx < 0 || sx >= WIDTH) return 'gone';
      // an invader
      for (var i = 0; i < W.invaders.length; i++) {
        var v = W.invaders[i]; if (!v.alive) continue;
        var b = box(v);
        if (sx >= b.x && sx < b.x + b.w && s.y + 4 > b.y && s.y < b.y + b.h) {
          v.alive = false;
          var m = hitCombo(W), pts = POINTS[v.r] * m;
          addScore(W, pts);
          W.booms.push({ kind: 'inv', x: v.x, y: v.y, t: 16 });
          W.events.push({ sfx: 'hit', x: v.x + 6, type: v.type });
          fx(W, { k: 'kill', x: v.x + 6, y: v.y + 4, type: v.type, pts: pts, mult: m });
          maybeDrop(W, v.x + 6, v.y + 6);
          return 'hit';
        }
      }
      // the mystery ship
      var U = W.saucer;
      if (U && sx >= U.x && sx < U.x + 16 && s.y < SAUCER_Y + 7 && s.y + 4 > SAUCER_Y) {
        var mm = hitCombo(W), pts2 = MYSTERY[Math.floor(W.rng() * MYSTERY.length)] * mm;
        addScore(W, pts2); W.saucer = null; W.saucerT = 1500;
        W.booms.push({ kind: 'ufo', x: U.x, y: SAUCER_Y, t: 24 });
        W.pops.push({ text: String(pts2), x: U.x + 8, y: SAUCER_Y, t: 90 });
        W.events.push({ sfx: 'ufohit', x: U.x + 8 });
        fx(W, { k: 'ufo', x: U.x + 8, y: SAUCER_Y + 3, pts: pts2 });
        if (W.enh) maybeDrop(W, U.x + 8, SAUCER_Y + 6, 1);
        return 'hit';
      }
      // the Mothership
      var B = W.boss;
      if (B && !B.dead && W.intro === 0 && sx >= B.x + 2 && sx < B.x + B.w - 2 && s.y < B.y + B.h - 2 && s.y + 4 > B.y + 2) { bossHit(W, sx, s.y); return 'hit'; }
      // a bomb: both go
      for (var j = 0; j < W.bombs.length; j++) {
        var Bo = W.bombs[j];
        if (sx >= Bo.x - 1 && sx <= Bo.x + 3 && s.y < Bo.y + 7 && s.y + 4 > Bo.y) {
          W.bombs.splice(j, 1); W.booms.push({ kind: 'small', x: sx - 3, y: s.y - 2, t: 10 });
          fx(W, { k: 'cancel', x: sx, y: s.y }); W.events.push({ sfx: 'cancel', x: sx });
          return 'gone';
        }
      }
      // a shield
      var hit = shieldAt(W, sx, s.y, 1, 4);
      if (hit) { splat(W, hit); return 'miss'; }
    }
    return null;
  }

  // ---------------------------------------------------------------- power-up capsules (Enhanced)
  function maybeDrop(W, x, y, chance) {
    if (!W.enh || W.caps.length) return;
    if (W.rng() >= (chance == null ? W.sp.cap : chance)) return;
    var r = W.rng(), kind = r < 0.4 ? 'rapid' : r < 0.75 ? 'spread' : 'shield';
    W.caps.push({ x: x, y: y, kind: kind, t: 0 });
    W.events.push({ sfx: 'capdrop', x: x }); fx(W, { k: 'capdrop', x: x, y: y, kind: kind });
  }
  function moveCaps(W) {
    var P = W.player;
    for (var i = W.caps.length - 1; i >= 0; i--) {
      var c = W.caps[i];
      c.y += 0.55; c.t++;
      if (overlap({ x: c.x - 3, y: c.y - 4, w: 7, h: 9 }, { x: P.x, y: PY, w: 13, h: 8 })) {
        W.caps.splice(i, 1);
        if (c.kind === 'shield') W.shieldUp = true;
        else W.power = { kind: c.kind, t: W.sp.power, max: W.sp.power };
        W.events.push({ sfx: 'powerup', kind: c.kind }); W.events.push({ say: POWER_NAMES[c.kind] });
        fx(W, { k: 'collect', x: c.x, y: c.y, kind: c.kind });
      } else if (c.y > GROUND) { W.caps.splice(i, 1); fx(W, { k: 'capgone', x: c.x, y: GROUND }); }
    }
  }

  // ---------------------------------------------------------------- the Mothership (Enhanced, every 5th wave)
  function bossHit(W, x, y) {
    var B = W.boss;
    B.hp--; B.flash = 6;
    var m = hitCombo(W);
    addScore(W, 10 * m);
    W.events.push({ sfx: 'bosshit', x: x });
    fx(W, { k: 'bosshit', x: x, y: y });
    if ((B.drops === 0 && B.hp <= B.max * 2 / 3) || (B.drops === 1 && B.hp <= B.max / 3)) { B.drops++; maybeDrop(W, B.x + B.w / 2, B.y + B.h, 1); }
    if (B.phase === 1 && B.hp <= B.max / 2) {
      B.phase = 2; W.events.push('bossrage'); W.events.push({ say: 'The Mothership is angry!' }); fx(W, { k: 'rage', x: B.x + B.w / 2, y: B.y + B.h / 2 });
    }
    if (B.hp <= 0) {
      var bonus = 1000 * Math.max(1, Math.round(W.wave / BOSS_EVERY));
      B.dead = 150; W.bombs = [];
      addScore(W, bonus);
      W.events.push({ sfx: 'bossdie', x: B.x + B.w / 2 }); W.events.push({ say: 'Mothership destroyed! +' + bonus });
      fx(W, { k: 'bossdie', x: B.x + B.w / 2, y: B.y + B.h / 2, pts: bonus });
    }
  }
  function bossStep(W) {
    var B = W.boss, sp = W.sp;
    B.t++;
    if (B.flash) B.flash--;
    if (B.dead) {
      if (B.dead % 9 === 0) fx(W, { k: 'bossboom', x: B.x + W.rng() * B.w, y: B.y + W.rng() * B.h });
      if (--B.dead === 0) W.boss = null;
      return;
    }
    var spd = sp.bossSpeed * (B.phase === 2 ? 1.5 : 1);
    B.x += B.dir * spd;
    if (B.x < LEFT) { B.x = LEFT; B.dir = 1; }
    if (B.x + B.w > RIGHT) { B.x = RIGHT - B.w; B.dir = -1; }
    B.y = BOSS_Y + Math.sin(B.t / 45) * 6;
    if (--B.fireT <= 0) {
      B.fireT = Math.round(sp.bossFire * (B.phase === 2 ? 0.65 : 1) * (0.8 + W.rng() * 0.4));
      var n = B.phase === 2 ? 5 : 3, cx = B.x + B.w / 2 - 1, by = B.y + B.h;
      for (var k = 0; k < n; k++) W.bombs.push({ x: cx, y: by, dx: (k - (n - 1) / 2) * 0.45, kind: 3, f: 0 });
      W.events.push({ sfx: 'bossfire', x: cx }); fx(W, { k: 'bossfire', x: cx + 1, y: by });
    }
    beat(W, Math.round(14 + 30 * B.hp / B.max));   // the heartbeat quickens as it weakens
  }

  // ---------------------------------------------------------------- bombs
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
    W.bombs.push({ x: shooter.x + 5, y: shooter.y + 8, dx: 0, kind: Math.floor(W.rng() * 3), f: 0 });
  }

  function moveBombs(W) {
    var P = W.player, sp = W.sp;
    for (var i = W.bombs.length - 1; i >= 0; i--) {
      var B = W.bombs[i];
      B.y += sp.bomb; B.x += B.dx || 0; B.f++;
      if (B.x < -4 || B.x > WIDTH + 1) { W.bombs.splice(i, 1); continue; }
      var hit = shieldAt(W, B.x, B.y + 4, 3, 3);
      if (hit) { splat(W, hit); W.bombs.splice(i, 1); continue; }
      // the ship: its body and its nose
      var bb = { x: B.x, y: B.y, w: 3, h: 7 };
      if (overlap(bb, { x: P.x + 1, y: PY + 3, w: 11, h: 5 }) || overlap(bb, { x: P.x + 5, y: PY, w: 3, h: 3 })) {
        W.bombs.splice(i, 1);
        if (W.shieldUp) { W.shieldUp = false; W.events.push({ sfx: 'shieldpop', x: P.x + 6 }); W.events.push({ say: 'Your shield took that one' }); fx(W, { k: 'shieldpop', x: P.x + 6.5, y: PY + 2 }); continue; }
        killPlayer(W); return;
      }
      if (B.y + 7 >= GROUND) { W.booms.push({ kind: 'small', x: B.x - 2, y: GROUND - 6, t: 10 }); fx(W, { k: 'ground', x: B.x + 1, y: GROUND }); W.bombs.splice(i, 1); }
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
    if (W.frame % 7 === 0) W.events.push({ sfx: 'ufo', n: W.ufoN++, x: U.x + 8 });
    if (U.x < -18 || U.x > WIDTH + 2) { W.saucer = null; W.saucerT = 1500; }
  }

  function hud(W) { return { score: W.score, lives: Math.max(0, W.lives), wave: W.wave }; }

  return {
    WIDTH: WIDTH, HEIGHT: HEIGHT, PY: PY, GROUND: GROUND, ROWS: ROWS, COLS: COLS, SPEEDS: SPEEDS, POINTS: POINTS, MYSTERY: MYSTERY,
    SHIELD_Y: SHIELD_Y, SAUCER_Y: SAUCER_Y, EXTRA_AT: EXTRA_AT, EXTRA_EVERY: EXTRA_EVERY, BOSS_EVERY: BOSS_EVERY, BOSS_W: BOSS_W, BOSS_H: BOSS_H,
    POWER_NAMES: POWER_NAMES,
    newWorld: newWorld, step: step, hud: hud, alive: alive, box: box, shieldAt: shieldAt, nextWave: nextWave
  };
});
