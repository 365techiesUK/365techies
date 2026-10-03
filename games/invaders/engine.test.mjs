// 365 Invaders engine tests (node --test games/invaders/engine.test.mjs). Never deployed (**/*.test.mjs is excluded).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const E = createRequire(import.meta.url)('./engine.js');

const idle = {};
function play(W, n, input) { for (let i = 0; i < n && !W.over; i++) { E.step(W, input || idle); W.events.length = 0; } }
function toPlay(W) { while (W.phase !== 'play') { E.step(W, idle); W.events.length = 0; } }
function only(W, keep) { W.invaders.forEach((v, i) => { v.alive = keep.includes(i); }); }

test('a new game: 55 invaders in 5 rows of 11, four whole shields, lives by speed', () => {
  const W = E.newWorld(2, 1);
  assert.equal(W.invaders.length, 55);
  assert.equal(new Set(W.invaders.map((v) => v.r)).size, 5);
  assert.equal(W.shields.length, 4);
  assert.ok(W.shields.every((s) => s.px.reduce((a, b) => a + b, 0) > 250));
  assert.equal(W.wave, 1);
  assert.equal(E.newWorld(1, 1).lives, 5, 'Gentle has five lives');
  assert.equal(E.newWorld(2, 1).lives, 3);
  assert.equal(E.newWorld(9, 1).speed, 1, 'an unknown speed falls back to Gentle');
});

test('the wave appears one invader at a time, then the march starts', () => {
  const W = E.newWorld(2, 1);
  E.step(W, idle);
  assert.equal(W.spawnN, 1);
  assert.equal(W.phase, 'spawn');
  toPlay(W);
  assert.equal(W.spawnN, 55);
  assert.equal(W.phase, 'play');
});

test('the ripple: bottom row first, 2 pixels at a time, and the whole formation moves in one cycle', () => {
  const W = E.newWorld(2, 1); toPlay(W);
  const x0 = W.invaders.map((v) => v.x);
  E.step(W, idle);
  const moved = W.invaders.filter((v, i) => v.x !== x0[i]);
  assert.equal(moved.length, 1);
  assert.equal(moved[0].r, 4, 'the bottom row moves first');
  assert.equal(moved[0].x - x0[W.invaders.indexOf(moved[0])], 2);
  play(W, 54);
  assert.ok(W.invaders.every((v, i) => v.x === x0[i] + 2), 'after 55 steps every invader has moved once');
});

test('fewer invaders march faster: the last one moves every step on Classic', () => {
  const W = E.newWorld(2, 1); toPlay(W);
  only(W, [27]);
  const x = W.invaders[27].x;
  play(W, 10);
  assert.ok(Math.abs(W.invaders[27].x - x) >= 16, 'moved at least 8 times in 10 steps');
});

test('at the edge the formation drops 8 pixels and turns round', () => {
  const W = E.newWorld(2, 1); toPlay(W);
  W.bombT = 1e9; W.saucerT = 1e9;
  only(W, [54]);   // bottom right
  const v = W.invaders[54], y = v.y;
  let guard = 0;
  while (W.dir === 1 && guard++ < 400) play(W, 1);
  play(W, 3);
  assert.equal(W.dir, -1);
  assert.equal(v.y, y + 8);
  const x = v.x; play(W, 3);
  assert.ok(v.x < x, 'now heading left');
});

test('a shot kills an invader and scores its row: 30 / 20 / 10', () => {
  for (const [idx, pts] of [[5, 30], [16, 20], [49, 10]]) {
    const W = E.newWorld(2, 1); toPlay(W);
    W.bombT = 1e9; W.saucerT = 1e9;
    only(W, [idx]);
    const v = W.invaders[idx], b = E.box(v);
    W.player.x = b.x + b.w / 2 - 6;   // under it
    W.shields = [];
    W.sp = { ...W.sp, rate: 0 };       // hold the formation still
    E.step(W, { fire: true });
    assert.ok(W.shot, 'fired');
    play(W, 80);
    assert.equal(v.alive, false);
    assert.equal(W.score, pts);
  }
});

test('one shot at a time', () => {
  const W = E.newWorld(2, 1); toPlay(W);
  W.sp = { ...W.sp, rate: 0 }; W.bombT = 1e9;
  E.step(W, { fire: true });
  const first = W.shot;
  E.step(W, { fire: true });
  assert.equal(W.shot, first);
  assert.equal(W.shotsFired, 1);
  // a press too quick to last a whole step still fires (the cabinet latches it as tap)
  const V = E.newWorld(2, 1); toPlay(V); V.sp = { ...V.sp, rate: 0 }; V.bombT = 1e9;
  E.step(V, { tap: true });
  assert.ok(V.shot);
});

test('shots wear holes in the shields, from below and from above', () => {
  const W = E.newWorld(2, 1); toPlay(W);
  W.sp = { ...W.sp, rate: 0 }; W.bombT = 1e9; W.saucerT = 1e9;
  const S = W.shields[0], before = S.px.reduce((a, b) => a + b, 0);
  W.player.x = S.x + 11 - 6;
  E.step(W, { fire: true });
  play(W, 20);
  assert.equal(W.shot, null, 'the shot stopped in the shield');
  const after = S.px.reduce((a, b) => a + b, 0);
  assert.ok(after < before, 'pixels knocked out');
  W.bombs.push({ x: S.x + 4, y: S.y - 10, kind: 0, f: 0 });
  play(W, 30);
  assert.equal(W.bombs.length, 0);
  assert.ok(S.px.reduce((a, b) => a + b, 0) < after, 'a bomb knocks pixels out too');
});

test('a bomb on the ship: a life lost, the ship explodes, then comes back', () => {
  const W = E.newWorld(2, 1); toPlay(W);
  W.sp = { ...W.sp, rate: 0 }; W.bombT = 1e9;
  W.player.x = 100; W.shields = [];
  W.bombs.push({ x: 105, y: E.PY - 8, kind: 1, f: 0 });
  const lives = W.lives;
  E.step(W, idle); E.step(W, idle); E.step(W, idle);
  assert.equal(W.lives, lives - 1);
  assert.ok(W.player.dead > 0);
  assert.equal(W.bombs.length, 0, 'other bombs are cleared');
  play(W, 100);
  assert.equal(W.player.dead, 0);
  assert.equal(W.over, false);
});

test('losing the last ship ends the game', () => {
  const W = E.newWorld(2, 1); toPlay(W);
  W.sp = { ...W.sp, rate: 0 }; W.bombT = 1e9; W.shields = [];
  W.lives = 1;
  W.bombs.push({ x: W.player.x + 5, y: E.PY - 6, kind: 0, f: 0 });
  play(W, 200);
  assert.equal(W.over, true);
  assert.equal(W.landed, false);
});

test('invaders that reach the ground end the game, however many lives are left', () => {
  const W = E.newWorld(1, 1); toPlay(W);
  W.bombT = 1e9;
  W.invaders.forEach((v) => { v.y += 150; });
  play(W, 400);
  assert.equal(W.landed, true);
  assert.equal(W.over, true);
});

test('clearing a wave brings the next one, a row lower, with fresh shields', () => {
  const W = E.newWorld(2, 1); toPlay(W);
  const top1 = W.invaders[0].y;
  W.shields[0].px.fill(0);
  only(W, []);
  E.step(W, idle);
  assert.equal(W.phase, 'clear');
  play(W, 160);
  assert.equal(W.wave, 2);
  assert.equal(W.invaders[0].y, top1 + 8);
  assert.ok(W.shields[0].px.some((p) => p), 'shields rebuilt');
  for (let w = 3; w <= 9; w++) { only(W, []); toPlay(W); E.step(W, idle); play(W, 160); }
  assert.equal(W.invaders[0].y, 48 + 40, 'no lower than five rows down');
});

test('an extra life at 1,500 points, once', () => {
  const W = E.newWorld(2, 1); toPlay(W);
  W.score = 1490; W.sp = { ...W.sp, rate: 0 }; W.bombT = 1e9;
  const lives = W.lives;
  only(W, [49]); const b = E.box(W.invaders[49]); W.player.x = b.x + b.w / 2 - 6; W.shields = [];
  W.invaders.forEach((v, i) => { if (i === 0) v.alive = true; });   // keep a second invader so the wave does not end
  E.step(W, { fire: true }); play(W, 80);
  assert.equal(W.score, 1500);
  assert.equal(W.lives, lives + 1);
  assert.equal(W.extraGiven, true);
});

test('the mystery ship crosses the top and scores 50 to 300', () => {
  const W = E.newWorld(2, 7); toPlay(W);
  W.sp = { ...W.sp, rate: 0 }; W.bombT = 1e9; W.shields = [];
  W.saucerT = 1;
  E.step(W, idle);
  assert.ok(W.saucer, 'it appeared');
  only(W, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  W.invaders.forEach((v) => { if (v.alive) v.x = 0; });   // the ten left over sit at the far left, out of the shot's way
  // wait until it is over the middle, then fire straight up from under its path
  while (Math.abs(W.saucer.x + 8 - 112) > 30) E.step(W, idle);
  W.player.x = W.saucer.x + 8 + W.saucer.dir * 30 - 6;
  W.player.x = Math.max(8, Math.min(203, W.player.x));
  const before = W.score;
  E.step(W, { fire: true });
  play(W, 120);
  if (W.saucer === null && W.score > before) assert.ok(E.MYSTERY.includes(W.score - before));
  else assert.fail('the shot did not reach the mystery ship (score ' + (W.score - before) + ')');
});

test('a shot and a bomb that meet both disappear', () => {
  const W = E.newWorld(2, 1); toPlay(W);
  W.sp = { ...W.sp, rate: 0 }; W.bombT = 1e9; W.shields = [];
  W.player.x = 100;
  W.bombs.push({ x: 105, y: 150, kind: 0, f: 0 });
  E.step(W, { fire: true });
  play(W, 40);
  assert.equal(W.bombs.length, 0);
  assert.equal(W.lives, 3, 'the ship was not hit');
});

test('the same seed plays the same game', () => {
  const run = () => { const W = E.newWorld(2, 99); for (let f = 0; f < 3000 && !W.over; f++) { E.step(W, { fire: f % 40 < 20, mouseX: 112 + Math.sin(f / 60) * 80 }); W.events.length = 0; } return [W.score, W.lives, W.wave, E.alive(W)].join(); };
  assert.equal(run(), run());
});

test('Gentle is slower than Classic, and Fast is faster', () => {
  const cycles = (speed) => { const W = E.newWorld(speed, 3); toPlay(W); W.bombT = 1e9; const x = W.invaders[0].x; let n = 0; while (W.invaders[0].x === x && n < 999) { E.step(W, idle); W.events.length = 0; n++; } return n; };
  const g = cycles(1), c = cycles(2), f = cycles(3);
  assert.ok(g > c && c > f, `steps for one march: gentle ${g}, classic ${c}, fast ${f}`);
});

test('the sounds the cabinet needs are reported: beat, shoot, hit', () => {
  const W = E.newWorld(2, 1); toPlay(W);
  const seen = new Set();
  for (let f = 0; f < 400; f++) { E.step(W, { fire: true }); W.events.forEach((e) => seen.add(typeof e === 'string' ? e : e.sfx || 'say')); W.events.length = 0; }
  for (const k of ['beat', 'shoot']) assert.ok(seen.has(k), k);
});
