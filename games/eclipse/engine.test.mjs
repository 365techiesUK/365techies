// 365 Eclipse engine tests (node --test games/eclipse/engine.test.mjs). Never deployed (**/*.test.mjs is excluded).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const E = createRequire(import.meta.url)('./engine.js');

const idle = {};
function play(W, n, input) { for (let i = 0; i < n && !W.over; i++) { E.step(W, typeof input === 'function' ? input(W, i) : input || idle); W.events.length = 0; W.fx.length = 0; } }
function toPlay(W) { let g = 0; while (W.phase !== 'play' && g++ < 400) { E.step(W, idle); W.events.length = 0; } }
function calm(W) { W.stage = { ...W.stage, script: [] }; W.enemies = []; W.bullets = []; }   // nothing else turns up
const bot = (W) => {   // keep under the nearest enemy (for long runs with the ship made safe)
  let tx = 120; const t = W.boss && !W.boss.dead ? W.boss.parts.find((q) => q.alive) : W.enemies.filter((e) => e.y > 0).sort((a, b) => b.y - a.y)[0];
  if (t) tx = t.x; return { mouseX: tx, mouseY: 270 };
};

test('a new game: stage 1 Coastline, the chosen ship, lives and shields by difficulty', () => {
  const W = E.newWorld(2, 1, 'titan');
  assert.equal(W.stage.name, 'COASTLINE'); assert.equal(W.stageNo, 1);
  assert.equal(W.shipId, 'titan'); assert.equal(W.p.bombs, 3);
  assert.equal(W.lives, 3); assert.equal(W.p.shield, 1);
  assert.equal(E.newWorld(1, 1).lives, 5); assert.equal(E.newWorld(1, 1).p.shield, 3);
  assert.equal(E.newWorld(3, 1).p.shield, 0);
  assert.equal(E.newWorld(2, 1, 'nonsense').shipId, 'striker');
  assert.equal(E.STAGES.length, 3);
});

test('the ship moves with the keys and the mouse, inside the screen; it fires by itself', () => {
  const W = E.newWorld(2, 1); toPlay(W); calm(W);
  const x0 = W.p.x; play(W, 20, { left: true }); assert.ok(W.p.x < x0);
  play(W, 200, { mouseX: 300, mouseY: -50 }); assert.equal(W.p.x, E.WIDTH - 8); assert.equal(W.p.y, 20);
  W.p.y = 280; play(W, 10, idle); assert.ok(W.shots.length > 0, 'auto-fire');
});

test('fire switches colour (with a moment before the next switch)', () => {
  const W = E.newWorld(2, 1); toPlay(W); calm(W);
  assert.equal(W.p.pol, E.LIGHT);
  E.step(W, { tap: true }); assert.equal(W.p.pol, E.DARK);
  E.step(W, { tap: true }); assert.equal(W.p.pol, E.DARK, 'too soon to switch back');
  play(W, 10); E.step(W, { tap: true }); assert.equal(W.p.pol, E.LIGHT);
});

test('a bullet of your own colour is absorbed into the flare meter; the other colour hits', () => {
  const W = E.newWorld(3, 1); toPlay(W); calm(W);
  const p = W.p;
  W.bullets.push({ x: p.x, y: p.y - 8, vx: 0, vy: 0.5, pol: p.pol, kind: 'orb', r: 3, t: 0 });
  play(W, 3);
  assert.equal(W.bullets.length, 0); assert.ok(p.flare > 0); assert.equal(p.dead, 0);
  const lives = W.lives;
  W.bullets.push({ x: p.x, y: p.y - 3, vx: 0, vy: 0.5, pol: p.pol ^ 1, kind: 'orb', r: 3, t: 0 });
  play(W, 4);
  assert.equal(W.lives, lives - 1, 'Fast has no shield: a life lost'); assert.ok(p.dead > 0);
});

test('Gentle and Classic shields take hits first', () => {
  const W = E.newWorld(1, 1); toPlay(W); calm(W);
  const p = W.p, lives = W.lives;
  for (let k = 0; k < 3; k++) { W.bullets.push({ x: p.x, y: p.y - 3, vx: 0, vy: 0.5, pol: p.pol ^ 1, kind: 'orb', r: 3, t: 0 }); play(W, 100); }
  assert.equal(p.shield, 0); assert.equal(W.lives, lives, 'three shield hits, no life lost');
  W.bullets.push({ x: p.x, y: p.y - 3, vx: 0, vy: 0.5, pol: p.pol ^ 1, kind: 'orb', r: 3, t: 0 }); play(W, 3);
  assert.equal(W.lives, lives - 1);
});

test('your shots do double damage to enemies of the other colour', () => {
  const W = E.newWorld(2, 1); toPlay(W); calm(W);
  const same = E.spawn(W, 'gunship', 60, 60, W.p.pol, { m: 'down', vy: 0 }), other = E.spawn(W, 'gunship', 180, 60, W.p.pol ^ 1, { m: 'down', vy: 0 });
  W.shots.push({ x: 60, y: 80, vx: 0, vy: -5, dmg: 2, pol: W.p.pol, kind: 'vulcan' }, { x: 180, y: 80, vx: 0, vy: -5, dmg: 2, pol: W.p.pol, kind: 'vulcan' });
  W.p.fireT = 1e9;
  play(W, 5, { mouseX: 120, mouseY: 300 });
  assert.equal(same.max - same.hp, 2); assert.equal(other.max - other.hp, 4);
});

test('chains: three of one colour raise the chain and its bonus doubles; mixing colours breaks it', () => {
  const W = E.newWorld(2, 1);
  const s0 = W.score;
  [0, 0, 0].forEach((c) => E.killChain(W, c)); assert.equal(W.chain, 1); assert.equal(W.score - s0, 100);
  [1, 1, 1].forEach((c) => E.killChain(W, c)); assert.equal(W.chain, 2); assert.equal(W.score - s0, 300);
  E.killChain(W, 0); E.killChain(W, 1); assert.equal(W.chain, 0, 'broken');
});

test('medals are worth more each time in a row; missing one starts again', () => {
  const W = E.newWorld(2, 1); toPlay(W); calm(W);
  const p = W.p; let s = W.score;
  for (let i = 0; i < 4; i++) { W.items.push({ x: p.x, y: p.y, vy: 0, kind: 'M', t: 0 }); play(W, 2); }
  assert.equal(W.score - s, 100 + 200 + 300 + 500 + 0 * 1);
  W.items.push({ x: 10, y: E.HEIGHT + 5, vy: 1, kind: 'M', t: 0 }); play(W, 8);
  assert.equal(W.medal, 0, 'missed: back to 100');
});

test('power items raise the weapon to level 4; more shots at higher levels', () => {
  const W = E.newWorld(2, 1, 'striker'); toPlay(W); calm(W);
  const count = () => { W.shots = []; W.p.fireT = 1; E.step(W, idle); return W.shots.length; };
  const n1 = count();
  for (let i = 0; i < 3; i++) { W.items.push({ x: W.p.x, y: W.p.y, vy: 0, kind: 'P', t: 0 }); play(W, 2); }
  assert.equal(W.p.power, 4);
  assert.ok(count() > n1, 'a wider spread');
  const s = W.score; W.items.push({ x: W.p.x, y: W.p.y, vy: 0, kind: 'P', t: 0 }); play(W, 2);
  assert.ok(W.score >= s + 2000, 'a power item at full power is worth points');
});

test('the second button: with flare, homing lasers; without, a bomb that clears the bullets', () => {
  const W = E.newWorld(2, 1); toPlay(W); calm(W);
  W.p.flare = 60; E.step(W, { altTap: true });
  assert.equal(W.p.flare, 0); assert.equal(W.shots.filter((s) => s.kind === 'homing').length, 6);
  for (let i = 0; i < 30; i++) W.bullets.push({ x: 20 + i * 6, y: 100, vx: 0, vy: 0, pol: 1, kind: 'orb', r: 3, t: 0 });
  const bombs = W.p.bombs; E.step(W, { altTap: true });
  assert.equal(W.p.bombs, bombs - 1); assert.equal(W.bullets.length, 0); assert.ok(W.p.inv > 0, 'safe for a moment');
});

test('a full flare meter releases by itself', () => {
  const W = E.newWorld(2, 1); toPlay(W); calm(W);
  W.p.flare = 99.5;
  W.bullets.push({ x: W.p.x, y: W.p.y - 6, vx: 0, vy: 0.5, pol: W.p.pol, kind: 'orb', r: 3, t: 0 });
  play(W, 3);
  assert.equal(W.p.flare, 0); assert.equal(W.shots.filter((s) => s.kind === 'homing').length, 12);
});

test('the stage script brings enemies in, and a mid-boss holds the script until it goes', () => {
  const W = E.newWorld(2, 3); toPlay(W);
  W.p.inv = 1e9;
  play(W, 200, (w) => { w.p.inv = 1e9; return idle; });
  assert.ok(W.enemies.length > 0 || W.clock > 150, 'enemies arrive');
  const W2 = E.newWorld(2, 3); toPlay(W2); W2.si = W2.stage.script.findIndex((s) => s[1] === 'midboss'); W2.clock = W2.stage.script[W2.si][0];
  play(W2, 2, (w) => { w.p.inv = 1e9; return idle; });
  assert.ok(W2.mid, 'the mid-boss is out'); const c = W2.clock;
  play(W2, 100, (w) => { w.p.inv = 1e9; return idle; });
  assert.equal(W2.clock, c, 'the script waits');
});

test('the Leviathan: its turrets can be shot off for a bonus; its core takes half damage while they stand', () => {
  const W = E.newWorld(2, 5); toPlay(W); calm(W); W.p.inv = 1e9;
  E.makeBoss(W, 'leviathan');
  play(W, 170, (w) => { w.p.inv = 1e9; w.p.fireT = 1e9; return idle; });
  const B = W.boss, core = B.parts.find((q) => q.core), t1 = B.parts.find((q) => q.id === 't1');
  W.shots.push({ x: core.x, y: core.y + 4, vx: 0, vy: -1, dmg: 10, pol: core.pol, kind: 'vulcan' });
  play(W, 2, (w) => { w.p.inv = 1e9; w.p.fireT = 1e9; return idle; });
  assert.equal(core.max - core.hp, 5, 'half damage while the turrets stand');
  const s = W.score; t1.hp = 1;
  W.shots.push({ x: t1.x, y: t1.y + 4, vx: 0, vy: -1, dmg: 2, pol: t1.pol, kind: 'vulcan' });
  play(W, 2, (w) => { w.p.inv = 1e9; w.p.fireT = 1e9; return idle; });
  assert.equal(t1.alive, false); assert.ok(W.score >= s + 5000);
});

test('each boss falls when its cores go: stage clear, the next stage, and after three, round again', () => {
  const W = E.newWorld(2, 7); toPlay(W); calm(W);
  for (const [n, boss] of [[1, 'leviathan'], [2, 'halo'], [3, 'eclipse']]) {
    assert.equal(W.stageNo, n);
    E.makeBoss(W, boss);
    play(W, 170, (w) => { w.p.inv = 1e9; return idle; });
    W.boss.parts.forEach((q) => { if (q.core) q.hp = 0.5; });
    W.boss.parts.filter((q) => q.core).forEach((q) => W.shots.push({ x: q.x, y: q.y + 4, vx: 0, vy: -1, dmg: 5, pol: q.pol ^ 1, kind: 'vulcan' }));
    play(W, 3, (w) => { w.p.inv = 1e9; return idle; });
    assert.ok(W.boss && W.boss.dead > 0, boss + ' destroyed');
    play(W, 160 + 270, (w) => { w.p.inv = 1e9; return idle; });
    calm(W); toPlay(W); calm(W);
  }
  assert.equal(W.stageNo, 4); assert.equal(W.loop, 1); assert.equal(W.stage.name, 'COASTLINE');
});

test('the game ends when the last ship is lost', () => {
  const W = E.newWorld(3, 1); toPlay(W); calm(W);
  for (let k = 0; k < 3; k++) { W.p.inv = 0; W.bullets.push({ x: W.p.x, y: W.p.y - 3, vx: 0, vy: 0.5, pol: W.p.pol ^ 1, kind: 'orb', r: 3, t: 0 }); play(W, 260); }
  assert.equal(W.over, true);
});

test('a long run (the ship kept safe) goes through the stages without errors', () => {
  for (const ship of ['swift', 'striker', 'titan']) {
    const W = E.newWorld(2, 11, ship); W.p.power = 4;
    let f = 0; for (; f < 60 * 60 * 9; f++) { W.p.inv = 1e9; E.step(W, bot(W)); W.events.length = 0; W.fx.length = 0; if (W.stageNo >= 3) break; }
    assert.ok(W.stageNo >= 2, ship + ' reached stage ' + W.stageNo);
    assert.ok(W.score > 50000);
  }
});

test('the same seed plays the same game', () => {
  const run = () => { const W = E.newWorld(2, 77, 'swift'); for (let f = 0; f < 5000 && !W.over; f++) { E.step(W, { ...bot(W), tap: f % 300 === 0 }); W.events.length = 0; W.fx.length = 0; } return [W.score, W.lives, W.stageNo, W.chain, W.p.flare].join(); };
  assert.equal(run(), run());
});
