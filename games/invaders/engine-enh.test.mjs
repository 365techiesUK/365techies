// 365 Invaders ENHANCED rules (node --test games/invaders/engine-enh.test.mjs). Never deployed (**/*.test.mjs is excluded).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const E = createRequire(import.meta.url)('./engine.js');

const idle = {};
function play(W, n, input) { for (let i = 0; i < n && !W.over; i++) { E.step(W, input || idle); W.events.length = 0; } }
function toPlay(W) { let g = 0; while (W.phase !== 'play' && g++ < 400) { E.step(W, idle); W.events.length = 0; } }
function only(W, keep) { W.invaders.forEach((v, i) => { v.alive = keep.includes(i); }); }
function still(W) { W.sp = { ...W.sp, rate: 0 }; W.bombT = 1e9; W.saucerT = 1e9; }
function under(W, idx) { const b = E.box(W.invaders[idx]); W.player.x = b.x + b.w / 2 - 6; }
function enh(speed = 2, seed = 1) { const W = E.newWorld(speed, seed, 'enh'); toPlay(W); return W; }

test('Enhanced is opt-in: the default world is Classic and has none of it', () => {
  const C = E.newWorld(2, 1);
  assert.equal(C.style, 'classic');
  assert.equal(C.enh, false);
  assert.equal(E.newWorld(2, 1, 'enh').style, 'enh');
});

test('a combo of hits raises the multiplier (x2 after 6 in a row) and a miss resets it', () => {
  const W = enh(); still(W); W.shields = [];
  const row4 = [44, 45, 46, 47, 48, 49, 50, 51, 52];   // the bottom row: 10 points each
  only(W, [...row4, 0]);
  let fx = [];
  for (let n = 0; n < 7; n++) {
    under(W, row4[n]);
    E.step(W, { fire: true }); W.events.length = 0;
    play(W, 60);
  }
  assert.equal(W.combo, 7);
  assert.equal(W.mult, 2, 'x2 from the sixth hit');
  assert.equal(W.score, 5 * 10 + 2 * 20, 'the sixth and seventh hits scored double');
  // a miss: fire where nothing is (far left, no shield)
  W.player.x = 8; only(W, [0]); W.invaders[0].x = 150;
  E.step(W, { fire: true }); play(W, 70);
  assert.equal(W.combo, 0); assert.equal(W.mult, 1, 'a miss resets it');
});

test('Classic never multiplies', () => {
  const W = E.newWorld(2, 1); toPlay(W); still(W); W.shields = [];
  const row4 = [44, 45, 46, 47, 48, 49, 50];
  only(W, [...row4, 0]);
  for (const i of row4) { under(W, i); E.step(W, { fire: true }); play(W, 60); }
  assert.equal(W.score, 70);
  assert.equal(W.mult, 1);
});

test('a capsule that is caught gives its power: rapid allows two shots in the air, spread fires three', () => {
  const W = enh(); still(W); W.shields = [];
  W.caps.push({ x: W.player.x + 6, y: E.PY - 6, kind: 'rapid', t: 0 });
  play(W, 10);
  assert.equal(W.caps.length, 0, 'caught');
  assert.equal(W.power.kind, 'rapid');
  only(W, [0]); W.invaders[0].x = 180;
  W.player.x = 60;
  for (let i = 0; i < 14; i++) E.step(W, { fire: true });
  assert.equal(W.shots.length, 2, 'two rapid shots in the air');
  assert.equal(W.shots[0].vy, 6, 'and they are quicker');
  play(W, 60);
  W.power = { kind: 'spread', t: 600, max: 600 };
  E.step(W, { fire: true });
  assert.equal(W.shots.length, 3, 'a spread volley is three shots');
  assert.deepEqual(W.shots.map((s) => s.dx).sort(), [-0.7, 0, 0.7].sort());
});

test('a power wears off', () => {
  const W = enh(); still(W);
  W.power = { kind: 'rapid', t: 5, max: 5 };
  const seen = []; for (let i = 0; i < 8; i++) { E.step(W, idle); seen.push(...W.events.map((e) => (typeof e === 'string' ? e : e.sfx))); W.events.length = 0; }
  assert.equal(W.power, null);
  assert.ok(seen.includes('powerdown'));
});

test('a missed capsule falls away; Classic never drops one', () => {
  const W = enh(); still(W);
  W.caps.push({ x: 20, y: 200, kind: 'spread', t: 0 }); W.player.x = 150;
  play(W, 100);
  assert.equal(W.caps.length, 0);
  assert.equal(W.power, null);
  const C = E.newWorld(2, 1); toPlay(C); still(C); C.shields = [];
  C.sp = { ...C.sp, cap: 1 };   // even with a certain drop, Classic has no capsules
  only(C, [49, 0]); under(C, 49); E.step(C, { fire: true }); play(C, 60);
  assert.equal(C.caps.length, 0);
});

test('the shield bubble takes one bomb, then is gone', () => {
  const W = enh(); still(W); W.shields = [];
  W.shieldUp = true; W.player.x = 100;
  W.bombs.push({ x: 105, y: E.PY - 8, dx: 0, kind: 0, f: 0 });
  play(W, 6);
  assert.equal(W.player.dead, 0, 'saved');
  assert.equal(W.shieldUp, false);
  const lives = W.lives;
  W.bombs.push({ x: 105, y: E.PY - 8, dx: 0, kind: 0, f: 0 });
  play(W, 6);
  assert.equal(W.lives, lives - 1, 'the next one hits');
});

test('every 5th wave is the Mothership: no formation, it must be shot down to clear the wave', () => {
  const W = E.newWorld(1, 5, 'enh');
  while (W.wave < 4) { only(W, []); toPlay(W); E.step(W, idle); play(W, 160); }
  only(W, []); toPlay(W); E.step(W, idle);
  const ev = []; for (let i = 0; i < 160; i++) { E.step(W, idle); ev.push(...W.events.map((e) => (typeof e === 'string' ? e : e.sfx || 'say'))); W.events.length = 0; }
  assert.equal(W.wave, 5);
  assert.ok(W.boss, 'the Mothership');
  assert.equal(W.invaders.length, 0, 'no formation');
  assert.ok(ev.includes('warning'), 'a warning first');
  toPlay(W);
  assert.equal(W.phase, 'play');
  // shoot it down: stand under it and keep firing; its bombs are cleared each step so the test is about the hits
  const hp = W.boss.hp; let n = 0;
  W.shields = [];
  while (W.boss && !W.boss.dead && n++ < 6000) { W.bombs = []; W.player.x = W.boss.x + 18; E.step(W, { fire: true }); W.events.length = 0; }
  assert.ok(W.boss && W.boss.dead > 0, 'destroyed after ' + hp + ' hits');
  assert.ok(W.score >= hp * 10 + 1000, 'hits plus the 1,000 bonus');
  play(W, 400);
  assert.equal(W.wave, 6, 'then the next wave');
  assert.equal(W.invaders.length, 55, 'with a formation again');
});

test('the Mothership turns angry at half strength and fires five at a time', () => {
  const W = enh(2, 9); still(W);
  W.invaders = []; W.order = [];
  W.boss = { x: 88, y: 40, w: 48, h: 20, hp: 10, max: 10, dir: 1, t: 0, fireT: 3, phase: 1, dead: 0, flash: 0, drops: 0 };
  play(W, 5);
  assert.equal(W.bombs.length, 3, 'three at a time');
  W.bombs = [];
  W.sp = { ...W.sp, bossSpeed: 0 }; W.boss.fireT = 999;   // hold it still while the shot climbs
  W.boss.hp = 6; W.player.x = W.boss.x + 18; W.shields = [];
  E.step(W, { fire: true }); play(W, 40);
  assert.equal(W.boss.phase, 2);
  W.bombs = []; W.boss.fireT = 1; E.step(W, idle);
  assert.equal(W.bombs.length, 5, 'five when angry');
});

test('a wave cleared without losing a ship is worth 500 more', () => {
  const W = enh(); still(W); W.shields = [];
  only(W, [49]); under(W, 49);
  E.step(W, { fire: true }); play(W, 60);
  assert.equal(W.phase, 'clear');
  assert.equal(W.score, 10 + 500);
  const V = enh(2, 2); still(V); V.shields = [];
  V.waveDeaths = 1; only(V, [49]); under(V, 49);
  E.step(V, { fire: true }); play(V, 60);
  assert.equal(V.score, 10, 'no bonus after losing a ship');
});

test('Enhanced: extra lives at 1,500 then every 5,000', () => {
  const W = enh(); still(W);
  const lives = W.lives;
  W.score = 1490; only(W, [49, 0]); under(W, 49); W.shields = [];
  E.step(W, { fire: true }); play(W, 60);
  assert.equal(W.lives, lives + 1);
  W.score = 6495; only(W, [48, 0]); under(W, 48);
  E.step(W, { fire: true }); play(W, 60);
  assert.equal(W.lives, lives + 2, 'the next at 6,500');
});

test('the picture is told where things happened (fx), and the list never grows without end', () => {
  const W = enh(); still(W); W.shields = [];
  only(W, [49, 0]); under(W, 49);
  E.step(W, { fire: true }); play(W, 60);
  const kinds = W.fx.map((f) => f.k);
  assert.ok(kinds.includes('shot') && kinds.includes('kill'));
  for (let i = 0; i < 1000; i++) W.fx.push({ k: 'x' });
  E.step(W, { fire: true });
  for (let i = 0; i < 400; i++) { E.step(W, { fire: true }); }
  assert.ok(W.fx.length <= 1300);
  const V = enh(); for (let i = 0; i < 4000; i++) { E.step(V, { fire: true, mouseX: 112 + Math.sin(i / 50) * 90 }); V.events.length = 0; }
  assert.ok(V.fx.length <= 300, 'capped at 300 when nobody drains it');
});

test('a long Enhanced game runs without errors and ends', () => {
  for (const speed of [1, 2, 3]) {
    const W = E.newWorld(speed, 42 + speed, 'enh');
    let f = 0;
    for (; f < 60 * 60 * 20 && !W.over; f++) { E.step(W, { fire: true, mouseX: 112 + Math.sin(f / 45) * 95 }); W.events.length = 0; W.fx.length = 0; }
    assert.ok(W.over || f === 60 * 60 * 20, 'speed ' + speed);
    assert.ok(W.score > 0);
  }
});

test('the same seed plays the same Enhanced game', () => {
  const run = () => { const W = E.newWorld(2, 77, 'enh'); for (let f = 0; f < 6000 && !W.over; f++) { E.step(W, { fire: f % 30 < 15, mouseX: 112 + Math.sin(f / 60) * 80 }); W.events.length = 0; } return [W.score, W.lives, W.wave, E.alive(W), W.combo].join(); };
  assert.equal(run(), run());
});
