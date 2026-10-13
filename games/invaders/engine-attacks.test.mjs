// 365 Invaders - the Mothership's attacks (13 Oct 2026; owner: "the mothership's like really boring ... make them much better
// ... more full on"): a power-up as the fight starts, gun volleys, mines, the plasma wall, the bombing run, and the drones that
// stun it. node --test games/invaders/engine-attacks.test.mjs. Never deployed (**/*.test.mjs is excluded).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const E0 = createRequire(import.meta.url)('./engine.js');
const E = { ...E0, newWorld: (speed, seed, style) => E0.newWorld(speed, seed, style, { calm: true }) };

const idle = {};
function play(W, n, input) { for (let i = 0; i < n && !W.over && !W.player.dead; i++) { E.step(W, input || idle); W.events.length = 0; } }
function toBoss(W, wave) {   // straight to a Mothership wave, through its entrance
  W.wave = wave - 1; E.nextWave(W);
  assert.ok(W.boss, 'a boss wave'); let g = 0; while (W.intro > 0 && g++ < 400) { E.step(W, idle); W.events.length = 0; }
  W.bombT = 1e9; W.saucerT = 1e9;
}
function quiet(W) { const B = W.boss; B.fireT = 1e9; B.miniT = 1e9; B.escT = 1e9; B.rayT = 1e9; B.mvT = 1e9; W.sp = { ...W.sp, bossSpeed: 0 }; }   // (only what a test starts)
function shotAt(W, x, y) { W.shots.push({ x: x, y: y, dx: 0, vy: 4, spread: false }); }

test('as the fight starts the Mothership drops a power-up: rapid fire, then spread shot at the next one', () => {
  const W = E.newWorld(2, 3, 'enh'); toBoss(W, 5);
  assert.equal(W.caps.length, 1); assert.equal(W.caps[0].kind, 'rapid');
  const W2 = E.newWorld(2, 3, 'enh'); toBoss(W2, 10);
  assert.equal(W2.caps[0].kind, 'spread');
});

test('gun volleys: each gun still on it fires three shots, aimed at you', () => {
  const W = E.newWorld(2, 4, 'enh'); toBoss(W, 5); quiet(W); W.caps = []; W.player.x = 20;
  W.boss.atk = { k: 'volley', t: 0, n: 50 }; play(W, 45);
  const shots = W.bombs.filter((b) => b.kind === 3);
  assert.equal(shots.length, 6, 'three from each gun'); assert.ok(shots.every((b) => b.dx < 0), 'aimed at the ship (to its left)');
  W.bombs = []; W.boss.L.hp = 0; W.boss.atk = { k: 'volley', t: 0, n: 50 }; play(W, 45);
  assert.equal(W.bombs.filter((b) => b.kind === 3).length, 3, 'a gun shot off fires no more');
});

test('mines: shot down they pay points; left alone they burst into three shards above the shields', () => {
  const W = E.newWorld(2, 5, 'enh'); toBoss(W, 5); quiet(W); W.caps = [];
  W.boss.atk = { k: 'mines', t: 0, n: 46 }; play(W, 40);
  const mines = W.bombs.filter((b) => b.kind === 5);
  assert.equal(mines.length, 3, 'three mines on Classic'); assert.ok(mines.every((m) => m.det < E.SHIELD_Y), 'they burst above the shields');
  const m = mines[0], before = W.score; shotAt(W, Math.round(m.x + 1), m.y + 10); play(W, 4);
  assert.ok(!W.bombs.includes(m), 'shot down'); assert.ok(W.score >= before + 25, 'for points');
  W.player.x = 6; let shards = 0;
  for (let i = 0; i < 600 && W.bombs.some((b) => b.kind === 5); i++) { E.step(W, idle); W.events.length = 0; shards = Math.max(shards, W.bombs.filter((b) => b.src === 'mine').length); }
  assert.ok(shards >= 3, 'a burst is three shards');
});

test('the plasma wall: orbs closer than the ship is wide, one gap the ship fits through - off to one side, so you have to move', () => {
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    const W = E.newWorld(2, seed, 'enh'); toBoss(W, 5); quiet(W); W.caps = []; W.player.x = 40 + seed * 20;
    W.boss.atk = { k: 'curtain', t: 0, n: 44 }; play(W, 32);
    const orbs = W.bombs.filter((b) => b.src === 'curtain');
    assert.ok(orbs.length >= 10, 'a wall of them');
    const at = orbs.map((b) => b.x + 1.5 + b.dx * ((E.PY + 2 - b.y) / b.vy)).sort((a, b) => a - b);   // where each crosses the ship's line
    const gaps = []; for (let i = 1; i < at.length; i++) gaps.push([at[i] - at[i - 1], (at[i] + at[i - 1]) / 2]);
    const wide = gaps.filter((g) => g[0] > 16);   // (the ship is 13 wide, an orb 3)
    assert.equal(wide.length, 1, 'one gap (seed ' + seed + ')');
    assert.ok(Math.abs(wide[0][1] - (W.player.x + 6.5)) >= 15, 'not where the ship already is');
  }
});

test('the bombing run: it comes down low and lays a carpet with gaps wider than the ship, then climbs back', () => {
  const W = E.newWorld(2, 7, 'enh'); toBoss(W, 5); quiet(W); W.caps = []; W.player.x = 200;
  const B = W.boss; B.x = 10; B.dir = 1; B.phase = 2; B.mv = { k: 'run', t: 0, n: 46, st: 'down' };
  let low = 0; const xs = [];
  for (let i = 0; i < 900 && B.mv; i++) { E.step(W, idle); W.events.length = 0; low = Math.max(low, B.oy); W.bombs.forEach((b) => { if (b.src === 'run' && !xs.includes(b.x)) xs.push(b.x); }); W.bombs = W.bombs.filter((b) => b.y < 150); }
  assert.ok(low > 50, 'low over the field'); assert.ok(!B.mv, 'and back up');
  xs.sort((a, b) => a - b); assert.ok(xs.length >= 4, 'a carpet');
  for (let i = 1; i < xs.length; i++) assert.ok(xs[i] - xs[i - 1] >= 20, 'gaps wider than the ship');
});

test('drones: when the core opens a ring of them guards it; shoot them all and it is stunned - no fire, and double damage', () => {
  const W = E.newWorld(2, 8, 'enh'); toBoss(W, 5); quiet(W); W.caps = [];
  const B = W.boss; B.L.hp = 1; B.R.hp = 0; shotAt(W, Math.round(B.x + 8), B.y + B.h + 2); play(W, 4);
  assert.equal(B.phase, 2, 'the core is open'); assert.equal(B.drones.length, 4, 'four drones on Classic');
  quiet(W);
  for (let g = 0; g < 400 && B.drones.length; g++) {   // shoot each one (each takes two hits)
    const D = B.drones[0], p = E.droneXY(B, D); W.shots = []; shotAt(W, Math.round(p.x), p.y + 4); E.step(W, idle); W.events.length = 0;
  }
  assert.equal(B.drones.length, 0, 'all shot down'); assert.ok(B.vent > 0, 'stunned');
  const hp = B.C.hp; W.bombs = []; shotAt(W, Math.round(B.x + 24), B.y + B.h + 2); play(W, 4);
  assert.equal(B.C.hp, hp - 2, 'a hit counts double'); assert.equal(W.bombs.length, 0, 'and it holds its fire');
});

test('a drone takes a shot meant for the core', () => {
  const W = E.newWorld(2, 9, 'enh'); toBoss(W, 5); quiet(W); W.caps = [];
  const B = W.boss; B.L.hp = 1; B.R.hp = 0; shotAt(W, Math.round(B.x + 8), B.y + B.h + 2); play(W, 4); quiet(W);
  const D = B.drones[0]; D.a = Math.PI / 2;   // (right under the core)
  const core = B.C.hp, p = E.droneXY(B, D); shotAt(W, Math.round(p.x), p.y + 6); E.step(W, idle);
  assert.equal(D.hp, 1, 'the drone was hit'); assert.equal(B.C.hp, core, 'not the core');
});

test('a whole Mothership fight still ends - the pilot wins the first one on Classic (seeded)', () => {
  const Pilot = createRequire(import.meta.url)('./pilot.js');
  let won = 0;
  for (const seed of [1, 2, 3, 4, 5]) {
    const W = E0.newWorld(2, seed * 101, 'enh'); W.wave = 4; E0.nextWave(W);
    const p = Pilot.create(E0, { skill: 1, seed });
    for (let i = 0; i < 60 * 240 && !W.over && W.wave === 5; i++) { E0.step(W, p.step(W)); W.events.length = 0; W.fx.length = 0; }
    if (W.wave === 6 || (W.wave === 5 && !W.boss && !W.over)) won++;
  }
  assert.ok(won >= 4, 'won ' + won + ' of 5');
});
