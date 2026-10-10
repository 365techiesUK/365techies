// 365 Invaders - the ten different waves (10 Oct 2026): shapes, snipers, phantoms, carriers and the bonus stage.
// node --test games/invaders/engine-waves.test.mjs. Never deployed (**/*.test.mjs is excluded).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const E0 = createRequire(import.meta.url)('./engine.js');
// the mechanics tests run calm: no flying in, no weaving (the swarm has its own tests, engine-swarm.test.mjs)
const E = { ...E0, newWorld: (speed, seed, style) => E0.newWorld(speed, seed, style, { calm: true }) };

const idle = {};
function play(W, n, input) { for (let i = 0; i < n && !W.over; i++) { E.step(W, input || idle); W.events.length = 0; } }
function toPlay(W) { let g = 0; while (W.phase !== 'play' && g++ < 400) { E.step(W, idle); W.events.length = 0; } }
function toWave(W, n) { while (W.wave < n) { W.invaders.forEach((v) => { v.alive = false; v.dv = null; }); W.minis = []; W.boss = null; toPlay(W); W.boss = null; E.step(W, idle); play(W, 220); } toPlay(W); }
function still(W) { W.sp = { ...W.sp, rate: 0 }; W.bombT = 1e9; W.saucerT = 1e9; W.diveT = 1e9; W.snipeT = 1e9; }
const kinds = (W) => W.invaders.reduce((o, v) => { o[v.kind] = (o[v.kind] || 0) + 1; return o; }, {});

test('Enhanced has ten different waves, then round again; Retro is always the classic block', () => {
  const want = [[1, 'First contact', 55], [2, 'Chevron', 35], [3, 'Bonus stage', 40], [4, 'Fortress', 29], [6, 'Phantoms', 28], [7, 'Twin fleet', 40], [8, 'Bonus stage', 40], [9, 'Armada', 43]];
  const W = E.newWorld(2, 1, 'enh');
  for (const [n, name, count] of want) { toWave(W, n); assert.equal(W.theme.name, name, 'wave ' + n); assert.equal(W.invaders.length, count, name); }
  toWave(W, 10); assert.ok(W.boss, 'wave 10: the Mothership');
  toWave(W, 11); assert.equal(W.theme.name, 'First contact', 'then round again');
  toWave(W, 12); assert.equal(W.theme.name, 'Chevron');
  const R = E.newWorld(2, 1);
  for (let n = 1; n <= 8; n++) { toWave(R, n); assert.equal(R.invaders.length, 55); assert.ok(R.invaders.every((v) => !v.kind || v.kind === 'std')); }
});

test('each wave has its own kinds: snipers on the chevron, carriers in the fortress, phantoms, the armada has all three', () => {
  const W = E.newWorld(2, 2, 'enh');
  toWave(W, 2); assert.deepEqual(kinds(W), { std: 31, sniper: 4 });
  toWave(W, 4); const k4 = kinds(W); assert.equal(k4.carrier, 3);
  assert.ok(W.invaders.filter((v) => v.kind === 'carrier').every((v) => v.hp === 3 && !v.armor), 'carriers: three hits, no armour');
  assert.ok(W.invaders.filter((v) => v.r === 2 && (v.c === 1 || v.c === 9)).every((v) => v.armor === 1), 'the fortress: an armoured shell');
  toWave(W, 6); assert.equal(kinds(W).phantom, 10);
  toWave(W, 7); assert.equal(kinds(W).sniper, 8);
  toWave(W, 9); const k9 = kinds(W); assert.ok(k9.carrier === 3 && k9.phantom === 7 && k9.sniper >= 2, JSON.stringify(k9));
});

test('snipers fire bolts aimed at the ship', () => {
  const W = E.newWorld(2, 3, 'enh'); toWave(W, 2); still(W); W.shields = [];
  W.player.x = 10; W.snipeT = 1; play(W, 2);
  const b = W.bombs.find((q) => q.kind === 4);
  assert.ok(b, 'a bolt'); assert.ok(b.dx < 0, 'aimed to the left, at the ship');
  W.bombs = []; W.player.x = 200; W.snipeT = 1; play(W, 2);
  assert.ok(W.bombs.find((q) => q.kind === 4).dx > 0, 'and to the right');
  // and it kills like a bomb
  const lives = W.lives; W.bombs = [{ x: W.player.x + 5, y: E.PY - 6, dx: 0, kind: 4, f: 0, src: 'snipe' }]; W.fx.length = 0; play(W, 6);
  assert.equal(W.lives, lives - 1); assert.equal(W.fx.find((f) => f.k === 'die').cause, 'snipe');
});

test('a phantom fades: shots pass straight through it, then it is solid again', () => {
  const W = E.newWorld(2, 4, 'enh'); toWave(W, 6); still(W); W.shields = [];
  const ph = W.invaders.find((v) => v.kind === 'phantom' && v.r === 3);
  W.invaders.forEach((v) => { if (v !== ph) v.alive = false; });
  W.invaders.find((v) => v.r === 0 && v.alive === false).alive = true;   // (one more somewhere, so the wave isn't cleared)
  const b = E.box(ph);
  while (!E.phased(W, ph)) E.step(W, idle);
  W.shots = [{ x: b.x + 6, y: b.y + 14, dx: 0, vy: 4, spread: false }]; play(W, 4);
  assert.ok(ph.alive, 'faded: the shot went through');
  while (E.phased(W, ph)) E.step(W, idle);
  W.shots = [{ x: b.x + 6, y: b.y + 14, dx: 0, vy: 4, spread: false }]; play(W, 4);
  assert.equal(ph.alive, false, 'solid: hit');
});

test('a carrier takes three hits, then bursts into two little ones', () => {
  const W = E.newWorld(2, 5, 'enh'); toWave(W, 4); still(W); W.shields = [];
  const cv = W.invaders.find((v) => v.kind === 'carrier');
  W.invaders.forEach((v) => { if (v !== cv && v.r !== 0) v.alive = false; });
  W.invaders.forEach((v) => { if (v.c !== cv.c && v.r === 0) v.alive = true; else if (v !== cv) v.alive = false; });
  const b = E.box(cv), s0 = W.score; W.fx.length = 0;
  for (let i = 0; i < 3; i++) { W.shots = [{ x: b.x + 6, y: b.y + 12, dx: 0, vy: 4, spread: false }]; play(W, 4); }
  assert.equal(cv.alive, false); assert.equal(W.fx.filter((f) => f.k === 'carrierhit').length, 2);
  assert.equal(W.minis.length, 2, 'two little ones');
  assert.equal(W.score - s0, 10 + 10 + 60);
});

test('the bonus stage: open sky, nobody fires, groups fly their paths; 100 a hit, 1,000 for a whole group', () => {
  const W = E.newWorld(2, 6, 'enh'); toWave(W, 3);
  assert.ok(W.stage); assert.equal(W.shields.length, 0); assert.equal(W.order.length, 0, 'no march');
  let bombs = 0, onScreen = 0;
  for (let i = 0; i < 600; i++) { E.step(W, idle); W.events.length = 0; bombs = Math.max(bombs, W.bombs.length); W.invaders.forEach((v) => { if (v.alive && v.dv && v.dv.on && v.dv.y > 0 && v.dv.y < 200) onScreen++; }); }
  assert.equal(bombs, 0, 'no bombs'); assert.ok(onScreen > 500, 'they fly across the screen');
  // shoot every one of a group that is on screen
  const g = W.stage.groups.findIndex((G, gi) => W.invaders.some((v) => v.alive && v.dv && v.dv.g === gi && v.dv.on) && G.hit === 0 && G.gone === 0);
  const s0 = W.score; let shot = 0; W.fx.length = 0;
  for (let i = 0; i < 400 && W.stage.groups[g].hit + W.stage.groups[g].gone < E.PER_GROUP; i++) {
    for (const v of W.invaders) if (v.alive && v.dv && v.dv.g === g && v.dv.on && v.dv.y > 0) { W.shots.push({ x: Math.round(v.dv.x + 6), y: v.dv.y + 9, dx: 0, vy: 4, spread: false }); shot++; }
    E.step(W, idle); W.events.length = 0; W.shots = W.shots.slice(-12);
  }
  const G = W.stage.groups[g];
  assert.ok(G.hit >= 6, 'most of the group hit: ' + G.hit);
  if (G.hit === E.PER_GROUP) assert.ok(W.fx.some((f) => f.k === 'groupbonus'), 'the group bonus');
  assert.ok(W.score - s0 >= G.hit * 100);
});

test('the bonus stage ends when they have all flown by or been shot, with a result - all forty is worth 10,000 more', () => {
  const W = E.newWorld(1, 7, 'enh'); toWave(W, 3);
  let res = null;
  for (let i = 0; i < 3000 && W.wave === 3; i++) {   // shoot them all
    for (const v of W.invaders) if (v.alive && v.dv && v.dv.on && v.dv.y > 2) W.shots.push({ x: Math.round(v.dv.x + 6), y: v.dv.y + 9, dx: 0, vy: 4, spread: false });
    E.step(W, idle); W.events.length = 0; W.shots = W.shots.slice(-10);
    const r = W.fx.find((f) => f.k === 'bonusresult'); if (r) res = r; W.fx.length = 0;
  }
  assert.ok(res, 'a result'); assert.equal(res.total, 40);
  assert.equal(res.hits, 40); assert.ok(res.perfect); assert.ok(res.pts >= 40 * 100 + 5 * 1000 + 10000);
  assert.equal(W.wave, 4, 'then the next wave');
  // and when they're left alone they fly away and it ends anyway
  const L = E.newWorld(2, 8, 'enh'); toWave(L, 3); let r2 = null;
  for (let i = 0; i < 3000 && L.wave === 3; i++) { E.step(L, idle); L.events.length = 0; const r = L.fx.find((f) => f.k === 'bonusresult'); if (r) r2 = r; L.fx.length = 0; }
  assert.ok(r2); assert.equal(r2.hits, 0); assert.equal(L.wave, 4);
});
