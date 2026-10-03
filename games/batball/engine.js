/* 365 Bat & Ball - the rules (3 Oct 2026). Our own bat-and-ball brick game in the style of the 80s classics (owner: "a
 * revamped version ... as a separate game"): our own name, levels, pixel art and sounds. No drawing here, so the tests
 * run it in node (engine.test.mjs). 60 steps a second; sizes in the game's own pixels on a 224 x 256 screen.
 *
 * A bat at the bottom, balls, and a wall of bricks: coloured ones break at a touch, silver ones take a few hits, steel
 * never breaks, gold always drops a capsule. Where the ball meets the bat sets its angle; every brick quickens it a
 * little. Capsules (one falling at a time): W wider bat, L lasers, C catch, S slow, M three balls, F fireball, + a life.
 * Little invaders drift down from two hatches and bounce the ball. Level 10 of every 12 is the Mothership, which fires
 * at the bat. Bricks broken before the ball comes back to the bat build a run (x2..x4 points, and a rising tune).
 * The game reports what happened in world.events (sounds, {say}) and world.fx (where, for the picture). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BBEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var WIDTH = 224, HEIGHT = 256, L = 8, R = 216, T = 24, BRICK_TOP = 40, BW = 16, BH = 8, COLS = 13, BAT_Y = 230, BAT_H = 6, BALL = 4;
  var GATES = [56, 168], BOSS_W = 48, BOSS_H = 20;
  var SPEEDS = {
    1: { name: 'Gentle', lives: 5, bat: 36, ball: 1.5, max: 2.7, inc: 0.012, keys: 3.4, cap: 0.16, capFall: 0.8, enemy: 1100, enemies: 2, fire: 600, bossHp: 16, bossSpeed: 0.4, bossFire: 150 },
    2: { name: 'Classic', lives: 3, bat: 30, ball: 1.9, max: 3.4, inc: 0.015, keys: 3.2, cap: 0.12, capFall: 1.0, enemy: 720, enemies: 3, fire: 480, bossHp: 22, bossSpeed: 0.6, bossFire: 110 },
    3: { name: 'Fast', lives: 3, bat: 26, ball: 2.3, max: 4.2, inc: 0.02, keys: 3.6, cap: 0.11, capFall: 1.2, enemy: 480, enemies: 3, fire: 420, bossHp: 28, bossSpeed: 0.8, bossFire: 85 }
  };
  // brick letters: w y o g c b p r colours (10..80 points), s silver (several hits), x steel (never), * gold (a capsule)
  var POINTS = { w: 10, y: 20, o: 30, g: 40, c: 50, b: 60, p: 70, r: 80, s: 100, '*': 150, x: 0 };
  var CAPS = [['W', 0.21], ['M', 0.16], ['L', 0.15], ['S', 0.15], ['C', 0.13], ['F', 0.13], ['+', 0.07]];
  var CAP_NAMES = { W: 'Wider bat!', M: 'Three balls!', L: 'Lasers! Press fire', S: 'Slower ball', C: 'Catch! Fire lets go', F: 'Fireball!', '+': 'Extra life!' };
  // our own levels, 13 bricks across
  var LEVELS = [
    { name: 'HELLO', map: ['.............', '.............', 'rrrrrrrrrrrrr', 'ooooooooooooo', 'yyyyyy*yyyyyy', 'ggggggggggggg', 'ccccccccccccc'] },
    { name: '365', map: ['.............', '.ccc.ppp.yyy.', '...c.p...y...', '.ccc.ppp.yyy.', '...c.p.p...y.', '.ccc.ppp.yyy.', '.............', '.s.s.s*s.s.s.'] },
    { name: 'THE PIER', map: ['..........*..', '.........ppp.', '........ppppp', 'wwwwwwwwwwwww', 'ccccccccccccc', 'x..x..x..x..x', 'x..x..x..x..x', '.............', 'bbbbbbbbbbbbb'] },
    { name: 'INVADER', map: ['.....pppp....', '...pppppppp..', '..ppwwppwwpp.', '..pppppppppp.', '...rppppppr..', '....r....r...', '...r..rr..r..', '..r...*....r.'] },
    { name: 'PYRAMID', map: ['......*......', '.....sss.....', '....yyyyy....', '...ooooooo...', '..rrrrrrrrr..', '.ppppppppppp.', 'bbbbbbbbbbbbb'] },
    { name: 'BEACH HUTS', map: ['..r...b...g..', '.rrr.bbb.ggg.', '.www.www.www.', '.w*w.wsw.w*w.', '.www.www.www.', '.............', 'yyyyyyyyyyyyy', 'ooooooooooooo'] },
    { name: 'CHEQUERS', map: ['r.o.y.g.c.b.p', '.s.s.s.s.s.s.', 'p.b.c.g.y.o.r', '.s.s.s.s.s.s.', 'r.o.y.g.c.b.p', '.s.s.*.s.s.s.', 'p.b.c.g.y.o.r'] },
    { name: 'HEART', map: ['..rrr...rrr..', '.rrrrr.rrrrr.', 'rrrpppppppprr', 'rrrrr*r*rrrrr', '.rrrrrrrrrrr.', '..rrrrrrrrr..', '...rrrrrrr...', '....rrrrr....', '.....rrr.....', '......r......'] },
    { name: 'SAILING', map: ['......w......', '.....yww.....', '....yywww....', '...yyywwww...', '..yyyywwwww..', '......w......', '..rrrrrrrrr..', '...rr*rrrr...', 'bbbbbbbbbbbbb', 'ccccccccccccc'] },
    { name: 'MOTHERSHIP', boss: true, map: ['.............', '.............', '.............', '.............', '.............', 's.s.s.s.s.s.s', '.............', 'x...x...x...x'] },
    { name: 'FORTRESS', map: ['xxxx.....xxxx', 'x*.........*x', 'x.ggggggggg.x', 'x.gsssssssg.x', 'x.gs.....sg.x', 'x.gsssssssg.x', 'x.ggggggggg.x', 'x...........x', 'xxxx.....xxxx'] },
    { name: 'RAINBOW', map: ['roygcbproygcb', 'oygcbproygcbp', 'ygcbproygcbpr', 'gcbproygcbpro', 'cbproygcbproy', 'bproygcbproyg', 'proygcbproygc', 's.s.s.*.s.s.s'] }
  ];

  function rngOf(seed) {
    var a = seed >>> 0;
    return function () { a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function fx(W, o) { if (W.fx.length >= 300) W.fx.shift(); W.fx.push(o); }
  function say(W, s) { W.events.push({ say: s }); }

  function newWorld(speed, seed) {
    speed = SPEEDS[speed] ? speed : 1;
    var sp = SPEEDS[speed];
    var W = {
      speed: speed, sp: sp, rng: rngOf(seed == null ? (Date.now() ^ (Math.random() * 1e9)) : seed),
      score: 0, lives: sp.lives, level: 0, loop: 0, frame: 0, events: [], fx: [], over: false, extraAt: 8000,
      bat: { x: WIDTH / 2, w: sp.bat, vx: 0 }, balls: [], bricks: [], grid: [], left: 0, caps: [], lasers: [], laserCd: 0,
      enemies: [], enemyT: 0, bolts: [], boss: null, batPower: '', fireT: 0, volley: 0, mult: 1,
      phase: 'ready', phaseT: 0, stuckT: 0, levelName: '', lostThisLevel: 0
    };
    nextLevel(W);
    return W;
  }
  function levelDef(n) { return LEVELS[(n - 1) % LEVELS.length]; }
  function baseSpeed(W) { return W.sp.ball * (1 + 0.1 * W.loop); }

  function nextLevel(W) {
    W.level++; W.loop = Math.floor((W.level - 1) / LEVELS.length);
    var def = levelDef(W.level);
    W.levelName = def.name;
    W.bricks = []; W.grid = []; W.left = 0;
    for (var r = 0; r < def.map.length; r++) {
      W.grid.push([]);
      for (var c = 0; c < COLS; c++) {
        var t = def.map[r].charAt(c), br = null;
        if (t !== '.' && POINTS[t] != null) {
          br = { r: r, c: c, t: t, x: L + c * BW, y: BRICK_TOP + r * BH, hp: t === 's' ? Math.min(5, 2 + W.loop) : 1, max: 0, alive: true, hit: 0 };
          br.max = br.hp;
          W.bricks.push(br);
          if (t !== 'x') W.left++;
        }
        W.grid[r].push(br);
      }
    }
    W.caps = []; W.lasers = []; W.enemies = []; W.bolts = [];
    W.boss = def.boss ? { x: (WIDTH - BOSS_W) / 2, y: 30, w: BOSS_W, h: BOSS_H, hp: W.sp.bossHp + 6 * W.loop, max: W.sp.bossHp + 6 * W.loop, dir: 1, fireT: 150, flash: 0, dead: 0, drops: 0, t: 0 } : null;
    W.batPower = ''; W.bat.w = W.sp.bat; W.bat.x = WIDTH / 2; W.fireT = 0; W.volley = 0; W.mult = 1; W.lostThisLevel = 0;
    W.enemyT = Math.round(W.sp.enemy * 0.6);
    newBall(W);
    W.phase = 'ready'; W.phaseT = 100;
    W.events.push({ sfx: def.boss ? 'warning' : 'level' });
    say(W, 'Level ' + W.level + ': ' + def.name.charAt(0) + def.name.slice(1).toLowerCase() + (def.boss ? ' - the Mothership is here!' : ''));
    fx(W, { k: 'level', n: W.level, name: def.name, boss: !!def.boss });
  }
  function newBall(W) {
    W.balls = [{ x: W.bat.x - BALL / 2, y: BAT_Y - BALL, vx: 0, vy: 0, s: baseSpeed(W), stuck: true, off: 0, id: W.frame }];
    W.stuckT = 300;
  }

  // ---------------------------------------------------------------- the bat
  function moveBat(W, input) {
    var B = W.bat, sp = W.sp, dx = 0;
    if (input.mouseX != null) dx = clamp(input.mouseX - B.x, -10, 10);
    else if (input.left && !input.right) dx = -sp.keys;
    else if (input.right && !input.left) dx = sp.keys;
    var half = B.w / 2;
    B.x = clamp(B.x + dx, L + half, R - half);
    B.vx = dx;
    W.balls.forEach(function (b) { if (b.stuck) { b.x = clamp(B.x + b.off - BALL / 2, L, R - BALL); b.y = BAT_Y - BALL; } });
  }
  function setVel(b, a) { b.vx = b.s * Math.sin(a); b.vy = -b.s * Math.cos(a); }
  function launch(W, b) {
    var off = b.off / (W.bat.w / 2), a = Math.abs(off) > 0.08 ? clamp(off, -1, 1) * 1.0 : (W.rng() < 0.5 ? -1 : 1) * 0.45;
    b.stuck = false; setVel(b, a);
    W.events.push({ sfx: 'launch', x: b.x });
  }
  function setPower(W, p) {
    if (W.batPower === 'C' && p !== 'C') W.balls.forEach(function (b) { if (b.stuck) launch(W, b); });
    W.batPower = p;
    W.bat.w = p === 'W' ? Math.round(W.sp.bat * 1.5) : W.sp.bat;
    W.bat.x = clamp(W.bat.x, L + W.bat.w / 2, R - W.bat.w / 2);
  }

  // ---------------------------------------------------------------- scoring
  function addScore(W, pts) {
    W.score += pts;
    while (W.score >= W.extraAt) {
      W.extraAt = W.extraAt === 8000 ? 20000 : W.extraAt + 20000;
      W.lives = Math.min(9, W.lives + 1);
      W.events.push('extra'); say(W, 'Extra life!'); fx(W, { k: 'extra' });
    }
  }

  // ---------------------------------------------------------------- bricks
  function bricksAt(W, x, y, w, h) {   // the live bricks under a box
    var out = [], c0 = Math.floor((x - L) / BW), c1 = Math.floor((x + w - 0.001 - L) / BW), r0 = Math.floor((y - BRICK_TOP) / BH), r1 = Math.floor((y + h - 0.001 - BRICK_TOP) / BH);
    for (var r = Math.max(0, r0); r <= r1 && r < W.grid.length; r++) for (var c = Math.max(0, c0); c <= c1 && c < COLS; c++) { var br = W.grid[r][c]; if (br && br.alive) out.push(br); }
    return out;
  }
  // a brick takes a hit; returns true if whatever hit it should bounce
  function hitBrick(W, br, by) {   // by: 'ball' | 'fire' | 'laser'
    var cx = br.x + BW / 2, cy = br.y + BH / 2;
    if (br.t === 'x') { W.events.push({ sfx: 'steel', x: cx }); fx(W, { k: 'steel', x: cx, y: cy }); br.hit = 8; return true; }
    br.hp -= by === 'fire' ? br.hp : 1;
    if (br.hp > 0) { br.hit = 8; W.events.push({ sfx: 'silver', x: cx }); fx(W, { k: 'dent', x: cx, y: cy }); return true; }
    br.alive = false; W.grid[br.r][br.c] = null; W.left--;
    var m = 1;
    if (by !== 'laser') {
      W.volley++;
      m = 1 + Math.min(3, Math.floor((W.volley - 1) / 4));
      if (m > W.mult) { W.mult = m; W.events.push({ sfx: 'combo', n: m }); fx(W, { k: 'combo', n: m }); }
    }
    var pts = (br.t === 's' ? POINTS.s * (1 + W.loop) : POINTS[br.t]) * m;
    addScore(W, pts);
    W.events.push({ sfx: 'brick', n: by === 'laser' ? 1 : W.volley, x: cx, t: br.t });
    fx(W, { k: 'brick', x: cx, y: cy, t: br.t, pts: pts, mult: m });
    if (br.t === '*') dropCap(W, cx, cy, true);
    else dropCap(W, cx, cy, false);
    return by !== 'fire';
  }
  function dropCap(W, x, y, sure) {
    if (W.boss && !sure) return;
    if (!sure && (W.caps.length || W.rng() >= W.sp.cap)) return;
    if (W.caps.length >= 2) return;
    var r = W.rng(), acc = 0, kind = 'W';
    for (var i = 0; i < CAPS.length; i++) { acc += CAPS[i][1]; if (r < acc) { kind = CAPS[i][0]; break; } }
    if (kind === '+' && W.lives >= 6) kind = 'S';
    W.caps.push({ x: x, y: y, kind: kind, t: 0 });
    W.events.push({ sfx: 'capdrop', x: x }); fx(W, { k: 'capdrop', x: x, y: y, kind: kind });
  }
  function collect(W, c) {
    var k = c.kind;
    if (k === 'W' || k === 'L' || k === 'C') setPower(W, k);
    else if (k === 'S') W.balls.forEach(function (b) { var f = baseSpeed(W) / b.s; b.s = baseSpeed(W); b.vx *= f; b.vy *= f; });
    else if (k === 'F') W.fireT = W.sp.fire;
    else if (k === '+') W.lives = Math.min(9, W.lives + 1);
    else if (k === 'M') {
      var add = [];
      W.balls.forEach(function (b) {
        if (b.stuck) launch(W, b);
        [-0.42, 0.42].forEach(function (d) {
          if (W.balls.length + add.length >= 8) return;
          var a = Math.atan2(b.vx, -b.vy) + d;
          var nb = { x: b.x, y: b.y, vx: 0, vy: 0, s: b.s, stuck: false, off: 0, id: W.frame + add.length + 1 };
          setVel(nb, a); if (nb.vy > -0.3 * nb.s) setVel(nb, d);
          add.push(nb);
        });
      });
      W.balls = W.balls.concat(add);
    }
    W.events.push({ sfx: 'powerup', kind: k }); say(W, CAP_NAMES[k]);
    fx(W, { k: 'collect', x: c.x, y: c.y, kind: k });
  }

  // ---------------------------------------------------------------- the step
  function step(W, input) {
    W.frame++;
    input = input || {};
    if (W.over) return;
    if (W.boss && W.boss.flash) W.boss.flash--;
    if (W.boss && W.boss.dead && --W.boss.dead === 0) W.boss = null;
    W.bricks.forEach(function (br) { if (br.hit) br.hit--; });
    if (W.phase === 'clear') { if (--W.phaseT <= 0) nextLevel(W); return; }
    if (W.phase === 'lost') {
      if (--W.phaseT <= 0) {
        if (W.lives <= 0) { W.over = true; W.events.push('over'); return; }
        W.bat.x = WIDTH / 2; newBall(W); W.phase = 'ready'; W.phaseT = 60;
      }
      return;
    }
    moveBat(W, input);
    if (W.phase === 'ready') { if (--W.phaseT <= 0) W.phase = 'play'; return; }

    var fire = input.fire || input.tap;
    if (fire) {
      var stuck = W.balls.filter(function (b) { return b.stuck; });
      if (stuck.length) stuck.forEach(function (b) { launch(W, b); });
      else if (W.batPower === 'L') fireLasers(W);
    }
    if (W.laserCd) W.laserCd--;
    if (W.balls.some(function (b) { return b.stuck; }) && --W.stuckT <= 0) W.balls.forEach(function (b) { if (b.stuck) launch(W, b); });
    if (W.fireT && --W.fireT === 0) { W.events.push('fireout'); }

    for (var i = W.balls.length - 1; i >= 0; i--) {
      var b = W.balls[i];
      if (b.stuck) continue;
      if (moveBall(W, b) === 'lost') {
        W.balls.splice(i, 1);
        fx(W, { k: 'balllost', x: b.x + 2 });
        if (!W.balls.length) { loseLife(W); return; }
      }
      if (W.phase !== 'play') return;
    }
    moveLasers(W);
    moveCaps(W);
    moveEnemies(W);
    if (W.phase !== 'play') return;
    if (W.boss) bossStep(W);
    if (W.phase !== 'play') return;
    if (!W.boss && W.left <= 0) levelClear(W);
  }

  function moveBall(W, b) {
    var n = Math.max(1, Math.ceil(b.s / 0.9)), B = W.bat, fire = W.fireT > 0;
    for (var k = 0; k < n; k++) {
      var dx = b.vx / n, dy = b.vy / n, hits, bounce, j;
      // across
      b.x += dx;
      if (b.x < L) { b.x = L; b.vx = Math.abs(b.vx); wall(W, b); }
      else if (b.x + BALL > R) { b.x = R - BALL; b.vx = -Math.abs(b.vx); wall(W, b); }
      else {
        hits = bricksAt(W, b.x, b.y, BALL, BALL); bounce = false;
        for (j = 0; j < hits.length; j++) if (hitBrick(W, hits[j], fire ? 'fire' : 'ball') || hits[j].t === 'x') bounce = true;
        if (hits.length) speedUp(W, b);
        if (!bounce && hitThing(W, b)) bounce = true;
        if (bounce) { b.x -= dx; b.vx = -b.vx; }
      }
      if (W.phase !== 'play') return null;
      // up and down
      b.y += dy;
      if (b.y < T) { b.y = T; b.vy = Math.abs(b.vy); wall(W, b); }
      else {
        hits = bricksAt(W, b.x, b.y, BALL, BALL); bounce = false;
        for (j = 0; j < hits.length; j++) if (hitBrick(W, hits[j], fire ? 'fire' : 'ball') || hits[j].t === 'x') bounce = true;
        if (hits.length) speedUp(W, b);
        if (!bounce && hitThing(W, b)) bounce = true;
        if (bounce) { b.y -= dy; b.vy = -b.vy; }
      }
      if (W.phase !== 'play') return null;
      // the bat
      var half = B.w / 2;
      if (b.vy > 0 && b.y + BALL >= BAT_Y && b.y + BALL <= BAT_Y + BAT_H + 3 && b.x + BALL > B.x - half && b.x < B.x + half) { batBounce(W, b); return null; }
      if (b.y > HEIGHT) return 'lost';
    }
    return null;
  }
  function wall(W, b) { W.events.push({ sfx: 'wall', x: b.x }); }
  function batBounce(W, b) {
    var B = W.bat;
    b.y = BAT_Y - BALL;
    W.volley = 0; W.mult = 1;
    if (W.batPower === 'C') {
      b.stuck = true; b.off = clamp(b.x + BALL / 2 - B.x, -B.w / 2 + 2, B.w / 2 - 2); W.stuckT = 180;
      W.events.push({ sfx: 'catch', x: b.x }); fx(W, { k: 'catch', x: b.x + 2, y: BAT_Y });
      return;
    }
    var off = clamp((b.x + BALL / 2 - B.x) / (B.w / 2), -1, 1);
    if (Math.abs(off) < 0.06) off = W.rng() < 0.5 ? -0.06 : 0.06;
    setVel(b, off * 1.047);   // up to 60 degrees from straight up, depending on where it lands
    W.events.push({ sfx: 'bat', x: b.x });
    fx(W, { k: 'bat', x: b.x + 2, y: BAT_Y, off: off });
  }
  // the ball meets a drifting invader or the Mothership
  function hitThing(W, b) {
    for (var i = 0; i < W.enemies.length; i++) {
      var e = W.enemies[i];
      if (b.x < e.x + 10 && b.x + BALL > e.x && b.y < e.y + 8 && b.y + BALL > e.y) { killEnemy(W, i); return true; }
    }
    var M = W.boss;
    if (M && !M.dead && b.x < M.x + M.w && b.x + BALL > M.x && b.y < M.y + M.h - 2 && b.y + BALL > M.y + 2) {
      // it moves, so it can run into the ball: push the ball out above or below, and count one hit at a time
      if (!M.flash) bossHit(W, b.x + 2, b.y + 2);
      if (b.y + BALL / 2 > M.y + M.h / 2) { b.y = M.y + M.h - 2; b.vy = Math.abs(b.vy); } else { b.y = M.y + 2 - BALL; b.vy = -Math.abs(b.vy); }
      return false;
    }
    return false;
  }
  function speedUp(W, b) { var s = Math.min(W.sp.max * (1 + 0.1 * W.loop), b.s + W.sp.inc); var f = s / b.s; b.s = s; b.vx *= f; b.vy *= f; }

  function fireLasers(W) {
    if (W.laserCd || W.lasers.length >= 6) return;
    var B = W.bat;
    W.lasers.push({ x: B.x - B.w / 2 + 3, y: BAT_Y - 5 }, { x: B.x + B.w / 2 - 4, y: BAT_Y - 5 });
    W.laserCd = 14;
    W.events.push({ sfx: 'laser', x: B.x }); fx(W, { k: 'laser', x: B.x, w: B.w });
  }
  function moveLasers(W) {
    for (var i = W.lasers.length - 1; i >= 0; i--) {
      var z = W.lasers[i], gone = false;
      z.y -= 5;
      if (z.y < T) { gone = true; fx(W, { k: 'zap', x: z.x, y: T }); }
      else {
        var hits = bricksAt(W, z.x, z.y, 1, 6);
        if (hits.length) { hitBrick(W, hits[0], 'laser'); gone = true; }
        else {
          for (var e = 0; e < W.enemies.length; e++) { var en = W.enemies[e]; if (z.x >= en.x && z.x < en.x + 10 && z.y < en.y + 8 && z.y + 6 > en.y) { killEnemy(W, e); gone = true; break; } }
          var M = W.boss;
          if (!gone && M && !M.dead && z.x >= M.x && z.x < M.x + M.w && z.y < M.y + M.h && z.y + 6 > M.y) { bossHit(W, z.x, z.y); gone = true; }
        }
      }
      if (gone) W.lasers.splice(i, 1);
      if (W.phase !== 'play') return;
    }
  }
  function moveCaps(W) {
    var B = W.bat;
    for (var i = W.caps.length - 1; i >= 0; i--) {
      var c = W.caps[i];
      c.y += W.sp.capFall; c.t++;
      if (c.x - 6 < B.x + B.w / 2 && c.x + 6 > B.x - B.w / 2 && c.y - 3 < BAT_Y + BAT_H && c.y + 3 > BAT_Y) { W.caps.splice(i, 1); collect(W, c); }
      else if (c.y > HEIGHT) W.caps.splice(i, 1);
    }
  }
  function moveEnemies(W) {
    var sp = W.sp, B = W.bat;
    if (!W.boss && --W.enemyT <= 0) {
      W.enemyT = Math.round(sp.enemy * (0.7 + W.rng() * 0.6));
      if (W.enemies.length < sp.enemies) {
        var g = W.rng() < 0.5 ? 0 : 1;
        W.enemies.push({ x: GATES[g] - 5, y: T, t: 0, ph: W.rng() * 6.28, kind: Math.floor(W.rng() * 3), gate: g });
        W.events.push({ sfx: 'gate', x: GATES[g] }); fx(W, { k: 'gate', g: g, x: GATES[g] });
      }
    }
    for (var i = W.enemies.length - 1; i >= 0; i--) {
      var e = W.enemies[i];
      e.t++; e.y += 0.32; e.x = clamp(e.x + Math.sin(e.t / 34 + e.ph) * 0.75, L, R - 10);
      if (e.y + 8 > BAT_Y && e.y < BAT_Y + BAT_H && e.x < B.x + B.w / 2 && e.x + 10 > B.x - B.w / 2) { killEnemy(W, i); continue; }
      if (e.y > HEIGHT) W.enemies.splice(i, 1);
    }
  }
  function killEnemy(W, i) {
    var e = W.enemies[i]; W.enemies.splice(i, 1);
    addScore(W, 100);
    W.events.push({ sfx: 'enemy', x: e.x + 5 }); fx(W, { k: 'enemy', x: e.x + 5, y: e.y + 4, kind: e.kind });
  }

  // ---------------------------------------------------------------- the Mothership (level 10 of every 12)
  function bossStep(W) {
    var M = W.boss, sp = W.sp, B = W.bat;
    if (M.dead) return;
    M.t++;
    M.x += M.dir * sp.bossSpeed * (M.hp < M.max / 2 ? 1.5 : 1);
    if (M.x < L) { M.x = L; M.dir = 1; }
    if (M.x + M.w > R) { M.x = R - M.w; M.dir = -1; }
    if (--M.fireT <= 0) {
      M.fireT = Math.round(sp.bossFire * (M.hp < M.max / 2 ? 0.7 : 1) * (0.8 + W.rng() * 0.4));
      var bx = M.x + M.w / 2;
      W.bolts.push({ x: bx, y: M.y + M.h, vx: clamp((B.x - bx) / 100, -1, 1), vy: 1.3 });
      W.events.push({ sfx: 'bossfire', x: bx }); fx(W, { k: 'bossfire', x: bx, y: M.y + M.h });
    }
    for (var i = W.bolts.length - 1; i >= 0; i--) {
      var z = W.bolts[i];
      z.x += z.vx; z.y += z.vy;
      if (z.y + 3 > BAT_Y && z.y < BAT_Y + BAT_H && z.x + 3 > B.x - B.w / 2 && z.x < B.x + B.w / 2) { W.bolts.splice(i, 1); loseLife(W); return; }
      if (z.y > HEIGHT || z.x < 0 || z.x > WIDTH) W.bolts.splice(i, 1);
    }
  }
  function bossHit(W, x, y) {
    var M = W.boss;
    M.hp--; M.flash = 6;
    addScore(W, 50);
    W.events.push({ sfx: 'bosshit', x: x }); fx(W, { k: 'bosshit', x: x, y: y });
    if ((M.drops === 0 && M.hp <= M.max * 2 / 3) || (M.drops === 1 && M.hp <= M.max / 3)) { M.drops++; dropCap(W, M.x + M.w / 2, M.y + M.h, true); }
    if (M.hp <= 0) {
      var bonus = 5000 * (1 + W.loop);
      M.dead = 150; W.bolts = []; W.balls = [];
      addScore(W, bonus);
      W.events.push({ sfx: 'bossdie', x: M.x + M.w / 2 }); say(W, 'Mothership destroyed! +' + bonus);
      fx(W, { k: 'bossdie', x: M.x + M.w / 2, y: M.y + M.h / 2, pts: bonus });
      W.phase = 'clear'; W.phaseT = 200;
    }
  }

  // ---------------------------------------------------------------- lives and levels
  function loseLife(W) {
    W.lives--; W.phase = 'lost'; W.phaseT = 100;
    W.balls = []; W.caps = []; W.lasers = []; W.bolts = [];
    W.batPower = ''; W.fireT = 0; W.volley = 0; W.mult = 1; W.lostThisLevel++;
    W.events.push({ sfx: 'lost', x: W.bat.x }); fx(W, { k: 'lost', x: W.bat.x, y: BAT_Y + 3, w: W.bat.w });
    W.bat.w = W.sp.bat;
  }
  function levelClear(W) {
    var bonus = 1000 + (W.lostThisLevel === 0 ? 500 : 0);
    addScore(W, bonus);
    W.phase = 'clear'; W.phaseT = 150; W.balls = []; W.caps = []; W.lasers = []; W.enemies = [];
    W.events.push('clear'); say(W, 'Level ' + W.level + ' clear! +' + bonus);
    fx(W, { k: 'clear', n: W.level, pts: bonus, perfect: W.lostThisLevel === 0 });
  }

  function hud(W) { return { score: W.score, lives: Math.max(0, W.lives), wave: W.level }; }

  return {
    WIDTH: WIDTH, HEIGHT: HEIGHT, L: L, R: R, T: T, BRICK_TOP: BRICK_TOP, BW: BW, BH: BH, COLS: COLS, BAT_Y: BAT_Y, BAT_H: BAT_H, BALL: BALL,
    GATES: GATES, SPEEDS: SPEEDS, POINTS: POINTS, LEVELS: LEVELS, CAP_NAMES: CAP_NAMES,
    newWorld: newWorld, step: step, hud: hud, nextLevel: nextLevel, bricksAt: bricksAt, collect: collect, launch: launch
  };
});
