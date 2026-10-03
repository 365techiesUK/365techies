// 365 Bat & Ball engine tests (node --test games/batball/engine.test.mjs). Never deployed (**/*.test.mjs is excluded).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const E = createRequire(import.meta.url)('./engine.js');

const idle = {};
function play(W, n, input) { for (let i = 0; i < n && !W.over; i++) { E.step(W, typeof input === 'function' ? input(W, i) : input || idle); W.events.length = 0; } }
function toPlay(W) { let g = 0; while (W.phase !== 'play' && g++ < 400) { E.step(W, idle); W.events.length = 0; } }
function quiet(W) { W.enemyT = 1e9; W.sp = { ...W.sp, cap: 0, enemy: 1e9 }; }
function clearBricks(W, keep) { W.bricks.forEach((b) => { if (!keep || !keep(b)) { b.alive = false; if (W.grid[b.r]) W.grid[b.r][b.c] = null; } }); W.left = W.bricks.filter((b) => b.alive && b.t !== 'x').length; }
function brickAt(W, r, c, t) {   // put one brick in, by hand
  while (W.grid.length <= r) W.grid.push(new Array(E.COLS).fill(null));
  const b = { r, c, t, x: E.L + c * E.BW, y: E.BRICK_TOP + r * E.BH, hp: t === 's' ? 2 : 1, max: t === 's' ? 2 : 1, alive: true, hit: 0 };
  W.grid[r][c] = b; W.bricks.push(b); if (t !== 'x') W.left++;
  return b;
}
const bot = (W) => { const lo = W.balls.filter((b) => !b.stuck && b.vy > 0).sort((a, b) => b.y - a.y)[0] || W.balls[0]; return { fire: true, mouseX: lo ? lo.x + 2 : 112 }; };

test('every level is 13 bricks across, uses known bricks, has something to break, and no wall of steel blocks the way', () => {
  const known = new Set(['.', ...Object.keys(E.POINTS)]);
  assert.equal(E.LEVELS.length, 12);
  E.LEVELS.forEach((L) => {
    L.map.forEach((row, i) => {
      assert.equal(row.length, 13, L.name + ' row ' + i);
      for (const ch of row) assert.ok(known.has(ch), L.name + ' has an unknown brick ' + ch);
      assert.ok(!/^x{13}$/.test(row), L.name + ' row ' + i + ' is solid steel');
    });
    assert.ok(L.map.join('').replace(/[.x]/g, '').length > 0, L.name + ' has breakable bricks');
  });
  assert.equal(E.LEVELS.filter((L) => L.boss).length, 1);
  assert.ok(E.LEVELS[9].boss, 'level 10 is the Mothership');
});

test('a new game: level 1, the ball on the bat, lives by speed', () => {
  const W = E.newWorld(2, 1);
  assert.equal(W.level, 1);
  assert.equal(W.balls.length, 1);
  assert.ok(W.balls[0].stuck);
  assert.equal(W.lives, 3);
  assert.equal(E.newWorld(1, 1).lives, 5);
  assert.ok(E.newWorld(1, 1).bat.w > E.newWorld(3, 1).bat.w, 'Gentle has the wider bat');
  assert.ok(W.left > 0);
});

test('fire launches the ball upwards; it launches by itself after 5 seconds too', () => {
  const W = E.newWorld(2, 1); toPlay(W);
  E.step(W, { fire: true });
  assert.equal(W.balls[0].stuck, false);
  assert.ok(W.balls[0].vy < 0);
  const V = E.newWorld(2, 1); toPlay(V);
  play(V, 310);
  assert.equal(V.balls[0].stuck, false, 'launched on its own');
});

test('the bat steers by the mouse and stays inside the walls', () => {
  const W = E.newWorld(2, 1); toPlay(W);
  play(W, 60, { mouseX: 20 });
  assert.equal(W.bat.x, E.L + W.bat.w / 2);
  play(W, 60, { mouseX: 300 });
  assert.equal(W.bat.x, E.R - W.bat.w / 2);
  assert.equal(W.balls[0].x + 2, W.bat.x, 'the stuck ball rides along');
});

test('where the ball lands on the bat sets its direction', () => {
  for (const [side, sign] of [[-0.8, -1], [0.8, 1]]) {
    const W = E.newWorld(2, 1); toPlay(W); quiet(W); clearBricks(W);
    brickAt(W, 0, 0, 'w');   // keep the level going
    const b = W.balls[0]; b.stuck = false;
    b.x = W.bat.x + side * W.bat.w / 2 - 2; b.y = E.BAT_Y - 10; b.vx = 0; b.vy = 2;
    play(W, 6, { mouseX: W.bat.x });
    assert.ok(Math.sign(b.vx) === sign && b.vy < 0, 'side ' + side + ': vx ' + b.vx);
  }
});

test('a brick breaks, scores, and the ball bounces back; the ball quickens', () => {
  const W = E.newWorld(2, 1); toPlay(W); quiet(W); clearBricks(W);
  const br = brickAt(W, 6, 6, 'r'); brickAt(W, 0, 0, 'w');
  const b = W.balls[0]; b.stuck = false; b.x = br.x + 6; b.y = br.y + 20; b.vx = 0; b.vy = -2; b.s = 2;
  play(W, 12, { mouseX: b.x + 2 });
  assert.equal(br.alive, false);
  assert.equal(W.score, 80);
  assert.ok(b.vy > 0, 'bounced');
  assert.ok(b.s > 2, 'quicker');
});

test('silver takes two hits, steel never breaks', () => {
  const W = E.newWorld(2, 1); toPlay(W); quiet(W); clearBricks(W);
  const s = brickAt(W, 6, 6, 's'), x = brickAt(W, 2, 2, 'x'); brickAt(W, 0, 12, 'w');
  const b = W.balls[0]; b.stuck = false; b.x = s.x + 6; b.y = s.y + 12; b.vx = 0; b.vy = -2;
  play(W, 8, { mouseX: 112 });
  assert.equal(s.alive, true); assert.equal(s.hp, 1);
  b.x = s.x + 6; b.y = s.y + 12; b.vx = 0; b.vy = -2;
  play(W, 8, { mouseX: 112 });
  assert.equal(s.alive, false);
  b.x = x.x + 6; b.y = x.y + 12; b.vx = 0; b.vy = -2;
  play(W, 8, { mouseX: 112 });
  assert.equal(x.alive, true, 'steel stands');
});

test('fireball goes straight through bricks', () => {
  const W = E.newWorld(2, 1); toPlay(W); quiet(W); clearBricks(W);
  const a = brickAt(W, 6, 6, 'g'), c = brickAt(W, 5, 6, 's'); brickAt(W, 0, 0, 'w');
  W.fireT = 600;
  const b = W.balls[0]; b.stuck = false; b.x = a.x + 6; b.y = a.y + 14; b.vx = 0; b.vy = -2;
  play(W, 14, { mouseX: 112 });
  assert.equal(a.alive, false); assert.equal(c.alive, false, 'silver too, in one go');
  assert.ok(b.vy < 0, 'still going up');
});

test('capsules: W widens, L fires lasers that break bricks, C catches the ball, S slows, M makes three balls, + adds a life', () => {
  const W = E.newWorld(2, 1); toPlay(W); quiet(W);
  const w0 = W.bat.w;
  E.collect(W, { kind: 'W', x: 112, y: 230 }); assert.ok(W.bat.w > w0);
  E.collect(W, { kind: 'L', x: 112, y: 230 }); assert.equal(W.bat.w, w0); assert.equal(W.batPower, 'L');
  E.step(W, { fire: true }); W.events.length = 0;   // launches the stuck ball first
  clearBricks(W); const target = brickAt(W, 9, 1, 'r'); brickAt(W, 0, 12, 'w');
  W.bat.x = target.x + 8 + W.bat.w / 2 - 3.5;   // left cannon under the brick
  W.balls[0].x = 120; W.balls[0].y = 160; W.balls[0].vx = 0; W.balls[0].vy = -0.01;   // parked out of the way
  E.step(W, { fire: true, mouseX: W.bat.x }); play(W, 40, { mouseX: W.bat.x });
  assert.equal(target.alive, false, 'a laser broke it');
  E.collect(W, { kind: 'C', x: 112, y: 230 }); assert.equal(W.batPower, 'C');
  const b = W.balls[0]; b.x = W.bat.x - 2; b.y = E.BAT_Y - 10; b.vx = 0; b.vy = 2;
  play(W, 6, { mouseX: W.bat.x });
  assert.ok(b.stuck, 'caught');
  E.step(W, { fire: true, mouseX: W.bat.x }); assert.ok(!b.stuck, 'fire lets it go');
  b.s = 3; b.vx = 0; b.vy = -3;
  E.collect(W, { kind: 'S', x: 112, y: 230 }); assert.ok(b.s < 3 && Math.abs(Math.hypot(b.vx, b.vy) - b.s) < 1e-9);
  E.collect(W, { kind: 'M', x: 112, y: 230 }); assert.equal(W.balls.length, 3);
  const lives = W.lives; E.collect(W, { kind: '+', x: 112, y: 230 }); assert.equal(W.lives, lives + 1);
});

test('a falling capsule is caught by the bat', () => {
  const W = E.newWorld(2, 1); toPlay(W); quiet(W);
  W.caps.push({ x: W.bat.x, y: E.BAT_Y - 20, kind: 'W', t: 0 });
  const w0 = W.bat.w;
  play(W, 40, { mouseX: W.bat.x });
  assert.equal(W.caps.length, 0); assert.ok(W.bat.w > w0);
});

test('a gold brick always drops a capsule', () => {
  const W = E.newWorld(2, 1); toPlay(W); quiet(W); clearBricks(W);
  const g = brickAt(W, 6, 6, '*'); brickAt(W, 0, 0, 'w');
  const b = W.balls[0]; b.stuck = false; b.x = g.x + 6; b.y = g.y + 12; b.vx = 0; b.vy = -2;
  play(W, 8, { mouseX: 112 });
  assert.equal(g.alive, false); assert.equal(W.caps.length, 1);
});

test('bricks in a run before the ball comes back raise the multiplier; touching the bat resets it', () => {
  const W = E.newWorld(2, 1); toPlay(W); quiet(W); clearBricks(W);
  brickAt(W, 0, 12, 'w');
  for (let i = 0; i < 5; i++) {
    const br = brickAt(W, 6, 2 + i, 'w');
    const b = W.balls[0]; b.stuck = false; b.x = br.x + 6; b.y = br.y + 12; b.vx = 0; b.vy = -2;
    play(W, 8, { mouseX: 20 });
  }
  assert.equal(W.volley, 5); assert.equal(W.mult, 2);
  const b = W.balls[0]; b.x = W.bat.x - 2; b.y = E.BAT_Y - 8; b.vx = 0; b.vy = 2;
  play(W, 6, { mouseX: W.bat.x });
  assert.equal(W.volley, 0); assert.equal(W.mult, 1);
});

test('losing the last ball loses a life; losing the last life ends the game', () => {
  const W = E.newWorld(2, 1); toPlay(W); quiet(W);
  const lives = W.lives;
  const b = W.balls[0]; b.stuck = false; b.x = 20; b.y = 250; b.vx = 0; b.vy = 3;
  play(W, 4, { mouseX: 200 });
  assert.equal(W.lives, lives - 1); assert.equal(W.phase, 'lost');
  play(W, 200, { mouseX: 200 });
  assert.equal(W.phase === 'ready' || W.phase === 'play', true); assert.ok(W.balls[0].stuck);
  W.lives = 1; toPlay(W); E.step(W, { fire: true });
  const c = W.balls[0]; c.x = 20; c.y = 250; c.vx = 0; c.vy = 3;
  play(W, 200, { mouseX: 200 });
  assert.equal(W.over, true);
});

test('clearing the bricks finishes the level: a bonus, then the next level', () => {
  const W = E.newWorld(2, 1); toPlay(W); quiet(W); clearBricks(W);
  const last = brickAt(W, 6, 6, 'w');
  const b = W.balls[0]; b.stuck = false; b.x = last.x + 6; b.y = last.y + 12; b.vx = 0; b.vy = -2;
  play(W, 8, { mouseX: 112 });
  assert.equal(W.phase, 'clear');
  assert.equal(W.score, 10 + 1500, 'the brick, 1,000 and 500 for no lives lost');
  play(W, 200);
  assert.equal(W.level, 2); assert.equal(W.levelName, '365');
});

test('level 10 is the Mothership: hitting it wears it down, its plasma costs a life', () => {
  const W = E.newWorld(1, 3);
  while (W.level < 10) E.nextLevel(W);
  assert.ok(W.boss); assert.equal(W.levelName, 'MOTHERSHIP');
  toPlay(W); quiet(W);
  const M = W.boss, hp = M.hp;
  W.sp = { ...W.sp, bossSpeed: 0, bossFire: 1e9 }; M.fireT = 1e9;
  const b = W.balls[0]; b.stuck = false; b.x = M.x + 22; b.y = M.y + 30; b.vx = 0; b.vy = -2;
  play(W, 12, { mouseX: 20 });
  assert.equal(M.hp, hp - 1); assert.ok(b.vy > 0, 'bounced off');
  const lives = W.lives;
  W.bolts.push({ x: W.bat.x, y: E.BAT_Y - 4, vx: 0, vy: 1.3 });
  play(W, 6, { mouseX: W.bat.x });
  assert.equal(W.lives, lives - 1);
});

test('the Mothership destroyed ends the level with a big bonus', () => {
  const W = E.newWorld(1, 3);
  while (W.level < 10) E.nextLevel(W);
  toPlay(W); quiet(W);
  const M = W.boss; M.hp = 1; W.sp = { ...W.sp, bossSpeed: 0 }; M.fireT = 1e9;
  const b = W.balls[0]; b.stuck = false; b.x = M.x + 22; b.y = M.y + 30; b.vx = 0; b.vy = -2;
  play(W, 12, { mouseX: 20 });
  assert.equal(W.phase, 'clear'); assert.ok(W.score >= 5000);
  play(W, 220);
  assert.equal(W.level, 11); assert.equal(W.boss, null);
});

test('drifting invaders come out of the hatches and the ball knocks them out', () => {
  const W = E.newWorld(3, 5); toPlay(W);
  W.enemyT = 1; play(W, 2, { mouseX: 112 });
  assert.equal(W.enemies.length, 1);
  const e = W.enemies[0], b = W.balls[0]; b.stuck = false; b.x = e.x + 3; b.y = e.y + 14; b.vx = 0; b.vy = -2;
  const s0 = W.score; play(W, 6, { mouseX: 112 });
  assert.equal(W.enemies.length, 0); assert.ok(W.score >= s0 + 100);
});

test('a bot that follows the ball plays a long game without errors, through several levels', () => {
  for (const speed of [1, 2, 3]) {
    const W = E.newWorld(speed, 11 + speed);
    let f = 0; for (; f < 60 * 60 * 10 && !W.over; f++) { E.step(W, bot(W)); W.events.length = 0; W.fx.length = 0; }
    assert.ok(W.level >= 2, 'speed ' + speed + ' reached level ' + W.level);
    assert.ok(W.score > 1000);
  }
});

test('the same seed plays the same game', () => {
  const run = () => { const W = E.newWorld(2, 77); for (let f = 0; f < 8000 && !W.over; f++) { E.step(W, bot(W)); W.events.length = 0; } return [W.score, W.lives, W.level, W.left].join(); };
  assert.equal(run(), run());
});
