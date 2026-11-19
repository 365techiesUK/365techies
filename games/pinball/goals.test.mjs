// 365 Pinball Hero - THE GOALS tests (goals.js, wave 3). node --test games/pinball/goals.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const E = require('./engine.js'), G = require('./goals.js'), Pilot = require('./pilot.js');

function world(speed, seed, mod) { const W = E.newWorld(speed || 2, 0, seed || 1, 'ember'); if (mod) W.mod = mod; return W; }
function step(W, inp) { E.step(W, inp || {}); W.events.length = 0; }
function stepEv(W, inp) { E.step(W, inp || {}); const ev = W.events.slice(); W.events.length = 0; return ev; }

test('a registered plugin with the url goals.js, its state plain data in W.goals', () => {
  assert.ok(E.plugins().some((p) => p.id === 'goals' && p.url === 'goals.js'));
  assert.ok(E.pluginUrls().includes('goals.js'));
  const W = world();
  assert.ok(W.goals && W.next && typeof W.next.text === 'string');
  assert.deepEqual(JSON.parse(JSON.stringify(W.goals)), W.goals);
});

test('W.next is set on every surface step of a pilot game, with a shot the pilot knows', () => {
  const W = world(2, 3);
  let n = 0, set = 0;
  const shots = new Set(['crater', 'ramp', 'orbitL', 'orbitR', 'lavaL', 'lavaR', 'drops', 'crabs', 'pops', 'geyser', 'lanes', 'loop']);
  for (let i = 0; i < 60 * 120 && !W.over; i++) {
    step(W, Pilot.input(W)); n++;
    if (W.next && W.next.text && shots.has(W.next.shot) && W.next.gauge >= 0 && W.next.gauge <= 1) set++;
  }
  assert.equal(set, n);
});

test('the source has no Math.random, Date, sin/cos/pow or timers', () => {
  const src = fs.readFileSync(new URL('./goals.js', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
  assert.ok(!/Math\.(random|sin|cos|pow)|\bDate\b|setTimeout|setInterval|performance/.test(src));
});

test('combos: two major shots within 3 s pay 2 x 250k; the fifth is a SUPER COMBO; the clock runs out', () => {
  const W = world(2, 5);
  for (let i = 0; i < 120; i++) step(W, { fire: i < 40 });   // the ball away
  const s0 = W.score;
  W.stats.ramps++; let ev = stepEv(W);
  assert.equal(W.goals.combo.n, 1); assert.ok(!ev.some((e) => e && e.sfx === 'combo'));
  W.stats.orbits++; ev = stepEv(W);
  const c = ev.find((e) => e && e.sfx === 'combo');
  assert.ok(c && c.n === 2, 'combo 2 event');
  W.stats.lava++; step(W); W.stats.loops++; step(W);
  W.stats.craters++; ev = stepEv(W);
  assert.ok(ev.includes('supercombo'), 'super combo at 5');
  assert.equal(W.goals.superCombos, 1);
  assert.ok(W.score - s0 >= (2 + 3 + 4) * G.COMBO_PTS + G.SUPER_PTS);
  // the clock: 3 s with the ball free and the combo is gone
  for (let i = 0; i < G.COMBO + 2; i++) { W.balls.forEach((b) => { if (b.m !== 'free') b.m = b.m; }); step(W); if (!W.goals.combo.n) break; }
  assert.equal(W.goals.combo.n, 0);
});

test('the combo clock stops while a ball is held', () => {
  const W = world(2, 6);
  for (let i = 0; i < 120; i++) step(W, { fire: i < 40 });
  W.stats.ramps++; step(W);
  const t = W.goals.combo.t, b = W.balls[0], m = b.m; b.m = 'held'; b.hold = 1e6; b.at = 'test';
  for (let i = 0; i < 30; i++) G.step(W);
  assert.equal(W.goals.combo.t, t);
  b.m = m;
});

test('island modes in Classic: MODE at the crater starts CRAB HUNT; 4 crabs complete it, pay 5M and light DIVE', () => {
  const W = world(2, 7);
  for (let i = 0; i < 120; i++) step(W, { fire: i < 40 });
  W.stats.craters++; W.crater.took = 'mode';
  let ev = stepEv(W);
  assert.ok(ev.includes('modestart') && W.goals.mode && W.goals.mode.id === 'crabhunt');
  assert.equal(W.next.text, 'CRAB HUNT'); assert.equal(W.next.shot, 'crabs'); assert.ok(W.next.clock > 0);
  const s0 = W.score;
  W.stats.crabs += 4; ev = stepEv(W);
  assert.ok(ev.includes('modedone') && !W.goals.mode && W.goals.modesDone === 1);
  assert.ok(W.score - s0 >= G.MODE_PTS);
  assert.ok(W.crater.dive && W.goals.diveLit, 'DIVE lit');
  // the next MODE is OBSIDIAN QUARRY; running out of time loses nothing
  W.stats.craters++; W.crater.took = 'mode'; step(W);
  assert.equal(W.goals.mode.id, 'quarry');
  const s1 = W.score, t = W.goals.mode.t;
  for (let i = 0; i <= t + 1 && W.goals.mode; i++) G.step(W);
  assert.ok(!W.goals.mode && W.goals.modesFailed === 1 && W.score === s1);
});

test('no island modes under W.mod.noModes (Ember Run)', () => {
  const W = world(2, 8, { x: {}, noModes: true });
  for (let i = 0; i < 120; i++) step(W, { fire: i < 40 });
  W.stats.craters++; W.crater.took = 'mode'; step(W);
  assert.equal(W.goals.mode, null);
});

test('DIVE waits, unlit, while a multiball is on', () => {
  const W = world(2, 9);
  for (let i = 0; i < 120; i++) step(W, { fire: i < 40 });
  G.dive(W, 1200); step(W);
  assert.ok(W.crater.dive);
  E.api.multiball(W, 2); step(W);
  assert.ok(!W.crater.dive && W.goals.diveLit, 'dark during the multiball, still owed');
});

test('W.next priority: a mission first, then the jackpots, then a mode, then a crater award, then building up', () => {
  const W = world(2, 10);
  for (let i = 0; i < 120; i++) step(W, { fire: i < 40 });
  assert.equal(W.next.shot, 'ramp'); assert.match(W.next.small, /MORE TO ERUPT/);
  E.api.craterLit(W, 'dive', true); step(W);
  assert.equal(W.next.text, 'DIVE IS LIT');
  W.stats.craters++; W.crater.took = 'mode'; step(W);
  assert.equal(W.next.text, 'CRAB HUNT');
  E.api.multiball(W, 2); step(W);
  assert.equal(W.next.text, 'JACKPOT');
  G.mission(W, { id: 'm', text: 'HEAT RAMP X2', small: '0 OF 2', shot: 'ramp', got: 0, need: 2 });
  assert.equal(W.next.text, 'HEAT RAMP X2'); assert.equal(W.next.gauge, 0);
  G.mission(W, null); step(W);
  assert.equal(W.next.text, 'JACKPOT');
});

test('E.clone copies the goals and steps identically', () => {
  const A = world(2, 11);
  for (let i = 0; i < 60 * 40; i++) step(A, Pilot.input(A));
  const B = E.clone(A);
  for (let i = 0; i < 60 * 40; i++) { const inp = Pilot.input(A); step(A, inp); step(B, inp); }
  assert.equal(JSON.stringify(A.goals), JSON.stringify(B.goals));
  assert.equal(A.score, B.score);
});

test('nothing on a level below the surface (T.level)', () => {
  const T = Object.assign({}, E.table('ember').T, { id: 'goalslevel', level: true });
  E.addTable(T);
  const W = E.newWorld(2, 0, 1, 'goalslevel');
  assert.equal(W.goals, undefined);
  for (let i = 0; i < 30; i++) step(W);
  assert.equal(W.goals, undefined);
});
