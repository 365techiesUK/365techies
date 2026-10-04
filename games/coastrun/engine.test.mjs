// 365 Coast Run engine tests (node --test games/coastrun/engine.test.mjs). Never deployed (**/*.test.mjs is excluded).
// Rebuilt 5 Oct 2026 with the 3D rules (metres): steering to an angle, bends that push you out, drifting that holds the
// bend, jumps over crests, the forks, the clock and checkpoints, the goal, crashes and bumps, near misses, coins, the
// traffic, and a driver that gets round.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const E = createRequire(import.meta.url)('./engine.js');

const quiet = (W) => { W.events.length = 0; W.fx.length = 0; };
function drive(W, n, input) { for (let i = 0; i < n && !W.over; i++) { E.step(W, typeof input === 'function' ? input(W, i) : input || {}); quiet(W); } }
function go(W) { while (W.count > 0) { E.step(W, {}); quiet(W); } }
function findSeg(W, from, ok) { let i = from; while (i < E.lastIndex(W) && !ok(E.segAt(W, i), i)) i++; return ok(E.segAt(W, i), i) ? i : -1; }
function clear(W) { W.cars = []; for (let i = W.base; i <= E.lastIndex(W); i++) { const g = E.segAt(W, i); g.spr = null; g.coins = null; } }

test('a new game: Bournemouth first, the clock by speed, a car and an accelerator', () => {
  const g = E.newWorld(1, { car: 'hatch' }, 1), c = E.newWorld(2, { car: 'nope', pedal: 'hold' }, 1);
  assert.equal(g.stage, 0); assert.equal(E.STAGES[0].name, 'BOURNEMOUTH');
  assert.equal(Math.round(g.time), Math.round(E.STAGES[0].t * 1.3), 'Gentle gives more time'); assert.equal(Math.round(c.time), E.STAGES[0].t);
  assert.equal(g.car, 'hatch'); assert.equal(c.car, 'roadster', 'an unknown car falls back to the Roadster');
  assert.equal(g.auto, true); assert.equal(c.auto, false);
  assert.ok(g.fork && g.fork.next.join() === '1,2', 'the first fork leads to the Purbeck Hills or the New Forest');
  assert.equal(g.count, 200, 'the lights first'); assert.equal(g.v, 0);
  assert.ok(g.cars.length > 0, 'traffic ahead');
});

test('the road is the same every game, joins up, climbs and falls, and has crests', () => {
  const a = E.newWorld(2, {}, 1), b = E.newWorld(2, {}, 999);
  assert.equal(a.segs.length, b.segs.length);
  let lo = 1e9, hi = -1e9, crests = 0;
  for (let i = 0; i < a.segs.length; i++) {
    assert.equal(a.segs[i].k, b.segs[i].k); assert.equal(a.segs[i].y1, b.segs[i].y1);
    if (i) assert.ok(Math.abs(a.segs[i].y1 - a.segs[i - 1].y2) < 1e-9, 'no step in the road at ' + i);
    lo = Math.min(lo, a.segs[i].y1); hi = Math.max(hi, a.segs[i].y1); if (a.segs[i].crest) crests++;
  }
  assert.ok(hi - lo > 8, 'Bournemouth goes up and down: ' + (hi - lo).toFixed(1) + ' m'); assert.ok(crests > 0, 'with crests to jump');
  assert.equal(E.segAt(a, 8).gate.kind, 'start');
  const f = a.fork; assert.equal(f.split - f.a, E.FA); assert.equal(f.end - f.split, E.FB);
  assert.equal(E.segAt(a, f.split).fk.o1, E.OFF0, 'the two roads start side by side'); assert.ok(E.segAt(a, f.end - 1).fk.o2 > 100, 'and end far apart');
});

test('steering: a held key turns the car to an angle and it moves across; let go and it straightens', () => {
  const W = E.newWorld(2, {}, 2); go(W); clear(W);
  const i = findSeg(W, 60, (g, j) => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25].every((d) => Math.abs(E.segAt(W, j + d).k) < 1e-6));
  W.s = i * E.SEG; W.v = 50; W.x = -4;
  drive(W, 30, { right: true });
  assert.ok(W.psi > 0.15, 'pointing right: ' + W.psi.toFixed(2)); assert.ok(W.x > -1.5, 'moved right: ' + W.x.toFixed(2));
  drive(W, 40, {});
  assert.ok(Math.abs(W.psi) < 0.03, 'straight again'); const x0 = W.x; drive(W, 20, {}); assert.ok(Math.abs(W.x - x0) < 0.3, 'and going straight');
});

test('a bend pushes the car outwards, more the faster you go; steering into it holds the line', () => {
  const W = E.newWorld(2, {}, 3); go(W); clear(W);
  const i = findSeg(W, 60, (g, j) => g.k > 1 / 150 && E.segAt(W, j + 12).k > 1 / 150);
  for (const v of [30, 60]) {
    W.s = i * E.SEG; W.v = v; W.x = 0; W.psi = W.phi = 0; drive(W, 12, (w) => { w.v = v; return {}; });
    if (v === 30) W.slow = W.x; else W.fast = W.x;
  }
  assert.ok(W.slow < -0.1, 'a right bend pushes left'); assert.ok(W.fast < W.slow * 2, 'twice the speed, far more push: ' + W.slow.toFixed(2) + ' / ' + W.fast.toFixed(2));
  W.s = i * E.SEG; W.v = 50; W.x = 0; W.psi = W.phi = 0;
  drive(W, 40, (w) => { w.v = 50; return { right: w.x < 0, left: w.x > 1.5 }; });
  assert.ok(Math.abs(W.x) < 3, 'steering keeps it on the road: ' + W.x.toFixed(2));
});

test('drifting: a tap of brake while turning at speed slides the car round the bend, scoring and filling the boost', () => {
  const W = E.newWorld(2, {}, 4); go(W); clear(W);
  const i = findSeg(W, 60, (g, j) => g.k > 1 / 130 && E.segAt(W, j + 20).k > 1 / 130);
  W.s = i * E.SEG; W.v = 55; W.x = -2; W.boost = 0;
  E.step(W, { right: true, brakeTap: true }); quiet(W);
  assert.equal(W.drift, 1, 'a quick tap is enough (it never lasted a whole step)');
  drive(W, 60, { right: true });
  assert.ok(W.psi - W.phi > 0.3, 'the car is sideways: ' + (W.psi - W.phi).toFixed(2));
  assert.ok(Math.abs(W.x) < E.HALF, 'and still on the road round the bend: ' + W.x.toFixed(2));
  assert.ok(W.v > 45, 'keeping most of its speed'); assert.ok(W.boost > 0.2, 'filling the boost');
  const s0 = W.score; E.step(W, {}); assert.equal(W.drift, 0, 'let go to straighten up'); assert.ok(W.score - s0 >= 300, 'points for the drift');
  W.boost = 1; W.v = E.VMAX; drive(W, 60, (w) => { w.x = 0; return { fire: true }; });
  assert.ok(W.v > E.VMAX * 1.1, 'boost goes past full speed'); assert.ok(W.boost < 0.8);
});

test('a crest taken fast throws the car into the air, and the landing scores', () => {
  const W = E.newWorld(2, {}, 5); go(W); clear(W);
  const i = findSeg(W, 50, (g) => g.crest);
  assert.ok(i > 0, 'a crest to try');
  W.s = (i - 10) * E.SEG; W.v = 70; W.x = 0; W.h = E.heightAt(W, W.s); W.vh = 0;
  let flew = 0, landed = 0, s0 = W.score; for (let n = 0; n < 240; n++) { E.step(W, {}); if (W.air) flew++; if (W.events.some((e) => e.sfx === 'land')) landed++; quiet(W); W.v = Math.max(W.v, 60); }
  assert.ok(flew > 20, 'in the air for ' + flew + ' steps'); assert.ok(landed > 0, 'and down again'); assert.ok(W.score - s0 > 500);
  const slow = E.newWorld(2, {}, 5); go(slow); clear(slow); slow.s = (i - 10) * E.SEG; slow.v = 15; slow.h = E.heightAt(slow, slow.s);
  let up = 0; for (let n = 0; n < 200; n++) { E.step(slow, {}); if (slow.air) up++; quiet(slow); slow.v = Math.min(slow.v, 15); }
  assert.equal(up, 0, 'slowly, the car stays on the road');
});

test('a fork: keep left for the left-hand place, right for the right; the checkpoint adds time', () => {
  for (const side of [-1, 1]) {
    const W = E.newWorld(2, {}, 6); go(W);
    W.s = (W.fork.split - 3) * E.SEG; W.x = side * 6; W.v = 40; W.cars = [];
    drive(W, 20, {});
    assert.equal(W.route[1], E.STAGES[0].next[side < 0 ? 0 : 1]);
    assert.ok(Math.abs(W.x - (side * 6 - side * E.OFF0)) < 1.5, 'the car keeps its place, now measured from its own road');
    const n0 = W.stageNo; W.time = 50; drive(W, 900, (w) => ({ left: w.x > 1, right: w.x < -1 }));
    assert.equal(W.stageNo, n0 + 1); assert.ok(W.time > 50, 'time was added at the checkpoint'); assert.equal(W.stage, W.route[1]);
    assert.equal(W.fork && W.fork.s, 0, 'the next fork is the one ahead now');
  }
});

test('hitting the sign in the middle of a fork crashes (Classic) and still picks a road', () => {
  const W = E.newWorld(2, {}, 7); go(W);
  W.s = (W.fork.split - 2) * E.SEG; W.x = 0.2; W.v = 50; W.cars = [];
  let crashed = false; for (let i = 0; i < 30; i++) { E.step(W, {}); if (W.events.some((e) => e.sfx === 'crash')) crashed = true; quiet(W); }
  assert.ok(crashed); assert.equal(W.route.length, 2);
});

test('the goal: a time bonus, round 2 and the road goes on to Bournemouth again', () => {
  const W = E.newWorld(2, {}, 8); go(W);
  for (let k = 0; k < 2; k++) {
    W.s = (W.fork.split - 2) * E.SEG; W.x = -6; W.v = 40; W.cars = []; drive(W, 30, {});
    W.s = (W.fork.end - 1) * E.SEG; W.x = 0; drive(W, 30, {});
  }
  assert.equal(W.route.length, 3); assert.ok(!E.STAGES[W.route[2]].next, 'the third place ends in a goal');
  W.s = (W.goalAt - 3) * E.SEG; W.time = 12.2; W.cars = [];
  const s0 = W.score; let goal = false; for (let i = 0; i < 40; i++) { E.step(W, {}); if (W.events.some((e) => e.sfx === 'goal')) goal = true; quiet(W); }
  assert.ok(goal); assert.equal(W.round, 2); assert.ok(W.score - s0 >= 12000); assert.ok(W.time > 50, 'the clock starts again');
  drive(W, 120, {});
  assert.equal(W.stage, 0); assert.deepEqual(W.route, [0], 'round 2 starts at Bournemouth');
});

test('crashes: a lamp post at speed spins you off on Classic; on Gentle it is a bounce; bushes only slow you', () => {
  for (const sp of [2, 1]) {
    const W = E.newWorld(sp, {}, 9); go(W); W.cars = [];
    const i = findSeg(W, 50, (g) => (g.spr || []).some((p) => p.t === 'lamp' && p.x > 0));
    const lamp = E.segAt(W, i).spr.find((p) => p.t === 'lamp' && p.x > 0);
    W.s = (i - 1) * E.SEG + 1; W.x = lamp.x - 0.3; W.v = 50;
    drive(W, 4, (w) => { w.x = lamp.x - 0.3; return {}; });
    assert.ok(W.crash, 'crashed'); assert.equal(W.crash.hard, sp === 2);
    drive(W, 130, {}); assert.equal(W.crash, null, 'back on the road'); assert.ok(Math.abs(W.x) <= 4.7);
  }
  const W = E.newWorld(2, {}, 10); go(W); W.cars = [];
  const i = findSeg(W, 50, (g) => (g.spr || []).some((p) => p.soft && !p.b));
  const bush = E.segAt(W, i).spr.find((p) => p.soft);
  W.s = (i - 1) * E.SEG + 1; W.x = bush.x; W.v = 50;
  drive(W, 6, (w) => { w.x = bush.x; return {}; });
  assert.equal(W.crash, null); assert.ok(bush.done); assert.ok(W.v < 45);
});

test('traffic: running into the back of a car slows you right down; passing close is a near miss', () => {
  const W = E.newWorld(2, {}, 11); go(W); clear(W);
  W.s = 100 * E.SEG; W.x = 0; W.v = 50;
  W.cars.push({ id: 1, s: W.s + 30, x: 0, tx: 0, v: 30, v0: 30, t: 0, b: 0, col: 0, lc: 9999, hitT: -999, passed: false, ds: 30, spin: 0 });
  let bumped = false; for (let i = 0; i < 90; i++) { if (!bumped) W.x = 0; E.step(W, {}); if (W.events.some((e) => e.sfx === 'bump')) bumped = true; quiet(W); }   // (held in its lane: the road may bend)
  assert.ok(bumped); assert.ok(W.v < 35); assert.equal(W.crash, null, 'not fast enough to crash');
  const N = E.newWorld(2, {}, 12); go(N); clear(N);
  N.s = 100 * E.SEG; N.x = 2.8; N.v = E.VMAX; N.boost = 0;
  N.cars.push({ id: 1, s: N.s + 60, x: 0, tx: 0, v: 28, v0: 28, t: 0, b: 0, col: 0, lc: 9999, hitT: -999, passed: false, ds: 60, spin: 0 });
  const s0 = N.score; let near = false; for (let i = 0; i < 90; i++) { E.step(N, (N.x = 2.8, {})); if (N.events.some((e) => e.sfx === 'near')) near = true; quiet(N); }
  assert.ok(near); assert.ok(N.score - s0 >= 500); assert.ok(N.boost >= 0.1, 'a near miss fills the boost');
});

test('coins, a whole line of them, and nitro', () => {
  const W = E.newWorld(2, {}, 13); go(W); W.cars = [];
  const i = findSeg(W, 50, (g) => (g.coins || []).some((c) => !c.nitro && c.of === 8));
  const first = E.segAt(W, i).coins.find((c) => !c.nitro), line = first.line;
  const s0 = W.score; W.s = (i - 1) * E.SEG; W.x = first.x; W.v = 30; W.boost = 0;
  drive(W, 150, (w) => { w.x = first.x; w.v = 30; w.psi = w.phi = 0; return {}; });
  assert.equal(W.lineGot[line], first.of, 'every coin in the line'); assert.ok(W.score - s0 >= 2500 + 100 * first.of);
  const j = findSeg(W, E.segIndex(W.s), (g) => (g.coins || []).some((c) => c.nitro));
  const nit = E.segAt(W, j).coins.find((c) => c.nitro);
  W.s = (j - 1) * E.SEG + 2; W.x = nit.x; W.boost = 0; W.v = 30; drive(W, 10, (w) => { w.x = nit.x; return {}; });
  assert.ok(nit.got); assert.ok(W.boost >= 0.45);
});

test('walls and the sea wall keep the car on the land; the clock running out ends the game', () => {
  const W = E.newWorld(2, {}, 14); go(W); clear(W);
  const i = findSeg(W, 50, (g) => g.sea && g.sh < 20);
  W.s = i * E.SEG; W.v = 30; W.x = -12; drive(W, 40, { left: true });
  const g = E.segAt(W, E.segIndex(W.s)); assert.ok(W.x >= -(g.sh - 1.5) - 0.3, 'not into the sea');
  W.time = 0.5; drive(W, 2000, {});
  assert.ok(W.timeUp); assert.ok(W.over);
});

test('at a split the other road\'s traffic goes its own way', () => {
  const W = E.newWorld(2, {}, 15); go(W);
  W.s = (W.fork.split - 3) * E.SEG; W.x = 6; W.v = 30;
  drive(W, 40, {});
  assert.equal(W.fork.s, 1);
  W.cars.forEach((c) => { if (E.segIndex(c.s) >= W.fork.split && E.segIndex(c.s) < W.fork.end) assert.ok(c.b === 1 || c.b === -1, 'each car in the split is on one road'); });
  W.time = 99; drive(W, 900, (w) => ({ left: w.x > 1, right: w.x < -1 }));
  assert.equal(W.fork && W.fork.s, 0); assert.ok(W.cars.every((c) => c.b === 0 || (W.fork && E.segIndex(c.s) >= W.fork.split)));
});

test('the driver gets round three stretches at Gentle and Classic, and the score stays within the Hall of Fame limit', () => {
  for (const sp of [1, 2]) for (const seed of [1, 2]) {
    const W = E.newWorld(sp, {}, seed); let goal = false;
    for (let i = 0; i < 60 * 60 * 6 && !W.over && !goal; i++) { E.step(W, E.autopilot(W)); if (W.events.some((e) => e.sfx === 'goal')) goal = true; quiet(W); if (sp === 2) W.time = Math.max(W.time, 5); }
    assert.ok(goal, 'speed ' + sp + ' seed ' + seed + ' reached the goal'); assert.equal(W.round, 2); assert.ok(W.t > 60 * 120, 'it took a few minutes of driving');
    assert.ok(W.score <= 8000 * W.t / 60 + 500000, 'score ' + W.score + ' in ' + Math.round(W.t / 60) + ' s');
  }
  const F = E.newWorld(3, {}, 1); drive(F, 60 * 40, E.autopilot);
  assert.ok(F.score > 0, 'Fast runs');
});
