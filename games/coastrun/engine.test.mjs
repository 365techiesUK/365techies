// 365 Coast Run engine tests (node --test games/coastrun/engine.test.mjs). Never deployed (**/*.test.mjs is excluded).
// 5 Oct 2026: the road and its forks, the clock and checkpoints, the goal and the next round, crashes and bumps, near
// misses, coins, drifting, the traffic, and a driver that gets round at every speed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const E = createRequire(import.meta.url)('./engine.js');

const quiet = (W) => { W.events.length = 0; W.fx.length = 0; };
function drive(W, n, input) { for (let i = 0; i < n && !W.over; i++) { E.step(W, typeof input === 'function' ? input(W, i) : input || {}); quiet(W); } }
function go(W) { while (W.count > 0) { E.step(W, {}); quiet(W); } }
const evs = (W, f) => { const out = []; for (let i = 0; i < 1e5 && !W.over; i++) { E.step(W, f(W)); out.push(...W.events); W.fx.length = 0; W.events.length = 0; if (out.some((e) => e && e.done)) break; } return out; };

test('a new game: Bournemouth first, the clock by speed, a car and an accelerator', () => {
  const g = E.newWorld(1, { car: 'hatch' }, 1), c = E.newWorld(2, { car: 'nope', pedal: 'hold' }, 1);
  assert.equal(g.stage, 0); assert.equal(E.STAGES[0].name, 'BOURNEMOUTH');
  assert.equal(Math.round(g.time), Math.round(66 * 1.3), 'Gentle gives more time'); assert.equal(Math.round(c.time), 66);
  assert.equal(g.car, 'hatch'); assert.equal(c.car, 'roadster', 'an unknown car falls back to the Roadster');
  assert.equal(g.auto, true); assert.equal(c.auto, false);
  assert.ok(g.fork && g.fork.next.join() === '1,2', 'the first fork leads to the Purbeck Hills or the New Forest');
  assert.equal(g.count, 200, 'the lights first'); assert.equal(g.v, 0);
  assert.ok(g.cars.length > 0, 'traffic ahead');
});

test('the road is the same every game (whatever the traffic), and joins up', () => {
  const a = E.newWorld(2, {}, 1), b = E.newWorld(2, {}, 999);
  assert.equal(a.segs.length, b.segs.length);
  for (let i = 0; i < a.segs.length; i++) { assert.equal(a.segs[i].c, b.segs[i].c); assert.equal(a.segs[i].y1, b.segs[i].y1); }
  for (let i = 1; i < a.segs.length; i++) assert.equal(a.segs[i].y1, a.segs[i - 1].y2, 'no step in the road at ' + i);
  assert.equal(E.segAt(a, 14).gate.kind, 'start');
  const f = a.fork; assert.equal(f.split - f.a, E.FA); assert.equal(f.end - f.split, E.FB);
  assert.equal(E.segAt(a, f.split).fk.o1, 1, 'the two roads start side by side'); assert.ok(E.segAt(a, f.end - 1).fk.o2 > 10, 'and end far apart');
});

test('a fork: keep left for the left-hand place, right for the right; the checkpoint adds time', () => {
  for (const side of [-1, 1]) {
    const W = E.newWorld(2, {}, 3); go(W);
    W.z = (W.fork.split - 3) * E.SEG; W.x = side * 0.8; W.v = E.MAXS * 0.6; W.cars = [];
    drive(W, 20, {});
    assert.equal(W.route[1], E.STAGES[0].next[side < 0 ? 0 : 1]);
    assert.ok(Math.abs(W.x - (side * 0.8 - side)) < 0.2, 'the car keeps its place, now measured from its own road');
    const t0 = W.time, n0 = W.stageNo;
    W.time = 50; drive(W, 400, {});
    assert.equal(W.stageNo, n0 + 1); assert.ok(W.time > 50, 'time was added at the checkpoint'); assert.equal(W.stage, W.route[1]);
    assert.equal(W.fork && W.fork.s, 0, 'the next fork is the one ahead now'); void t0;
  }
});

test('hitting the sign in the middle of a fork crashes (Classic) and still picks a road', () => {
  const W = E.newWorld(2, {}, 4); go(W);
  W.z = (W.fork.split - 2) * E.SEG; W.x = 0.05; W.v = E.MAXS * 0.8; W.cars = [];
  let crashed = false; for (let i = 0; i < 30; i++) { E.step(W, {}); if (W.events.some((e) => e.sfx === 'crash')) crashed = true; quiet(W); }
  assert.ok(crashed); assert.equal(W.route.length, 2);
});

test('the goal: a time bonus, round 2 and the road goes on to Bournemouth again', () => {
  const W = E.newWorld(2, {}, 5); go(W);
  for (let k = 0; k < 2; k++) {
    W.z = (W.fork.split - 2) * E.SEG; W.x = -0.7; W.v = E.MAXS * 0.6; W.cars = []; drive(W, 30, {});
    W.z = (W.fork.end - 1) * E.SEG; W.x = 0; drive(W, 30, {});   // out of the split: the next fork is ahead
  }
  assert.equal(W.route.length, 3); const last = W.route[2]; assert.ok(!E.STAGES[last].next, 'the third place ends in a goal');
  W.z = (W.goalAt - 3) * E.SEG; W.time = 12.2; W.cars = [];
  const s0 = W.score; let goal = false; for (let i = 0; i < 20; i++) { E.step(W, {}); if (W.events.some((e) => e.sfx === 'goal')) goal = true; quiet(W); }
  assert.ok(goal); assert.equal(W.round, 2); assert.ok(W.score - s0 >= 12000, 'a thousand a second left over'); assert.ok(W.time > 50, 'the clock starts again');
  drive(W, 120, {});
  assert.equal(W.stage, 0); assert.deepEqual(W.route, [0], 'round 2 starts at Bournemouth');
});

test('crashes: a lamp post at speed spins you off on Classic; on Gentle it is a bounce; bushes only slow you', () => {
  for (const sp of [2, 1]) {
    const W = E.newWorld(sp, {}, 6); go(W);
    let i = 100; while (!(E.segAt(W, i).spr || []).some((p) => p.t === 'lamp' && p.x > 0)) i++;
    const lamp = E.segAt(W, i).spr.find((p) => p.t === 'lamp' && p.x > 0);
    W.z = (i - 1) * E.SEG + 150; W.x = lamp.x - 0.05; W.v = E.MAXS * 0.8; W.cars = [];
    E.step(W, {}); E.step(W, {});
    assert.ok(W.crash, 'crashed'); assert.equal(W.crash.hard, sp === 2);
    drive(W, 130, {}); assert.equal(W.crash, null, 'back on the road'); assert.ok(Math.abs(W.x) <= 0.67);
  }
  const W = E.newWorld(2, {}, 7); go(W);
  let i = 100; while (!(E.segAt(W, i).spr || []).some((p) => p.soft && !p.b)) i++;
  const bush = E.segAt(W, i).spr.find((p) => p.soft);
  W.z = (i - 1) * E.SEG + 150; W.x = bush.x; W.v = E.MAXS * 0.8; W.cars = []; W.drift = 0;
  E.step(W, {}); E.step(W, {});
  assert.equal(W.crash, null); assert.ok(bush.done); assert.ok(W.v < E.MAXS * 0.75);
});

test('traffic: running into the back of a car slows you right down; passing close is a near miss', () => {
  const W = E.newWorld(2, {}, 8); go(W);
  W.cars = []; W.z = 200 * E.SEG; W.x = 0; W.v = E.MAXS * 0.7;
  W.cars.push({ id: 1, z: W.z + 900, x: 0, tx: 0, v: E.MAXS * 0.45, v0: E.MAXS * 0.45, t: 0, b: 0, col: 0, lc: 9999, hitT: -999, passed: false, dz: 900 });
  let bumped = false; for (let i = 0; i < 60; i++) { E.step(W, {}); if (W.events.some((e) => e.sfx === 'bump')) bumped = true; quiet(W); }
  assert.ok(bumped); assert.ok(W.v < E.MAXS * 0.5); assert.equal(W.crash, null, 'not fast enough to crash');
  const N = E.newWorld(2, {}, 9); go(N);
  N.cars = []; N.z = 200 * N.SEG || 200 * E.SEG; N.x = 0.36; N.v = E.MAXS; N.boost = 0;
  N.cars.push({ id: 1, z: N.z + 2000, x: -0.04, tx: -0.04, v: E.MAXS * 0.4, v0: E.MAXS * 0.4, t: 0, b: 0, col: 0, lc: 9999, hitT: -999, passed: false, dz: 2000 });
  const s0 = N.score; let near = false; for (let i = 0; i < 60; i++) { E.step(N, {}); if (N.events.some((e) => e.sfx === 'near')) near = true; quiet(N); }
  assert.ok(near); assert.ok(N.score - s0 >= 500); assert.ok(N.boost >= 0.1, 'a near miss fills the boost');
});

test('coins, a whole line of them, and nitro', () => {
  const W = E.newWorld(2, {}, 10); go(W); W.cars = [];
  let i = 100; while (!(E.segAt(W, i).coins || []).some((c) => !c.nitro && c.of === 8)) i++;   // a straight line of eight
  const first = E.segAt(W, i).coins.find((c) => !c.nitro), line = first.line;
  const s0 = W.score; W.z = (i - 2) * E.SEG; W.x = first.x; W.v = E.MAXS * 0.5; W.boost = 0;
  drive(W, 60, (w) => { w.x = first.x; w.v = E.MAXS * 0.5; return {}; });
  assert.equal(W.lineGot[line], first.of, 'every coin in the line'); assert.ok(W.score - s0 >= 2500 + 100 * first.of);
  let j = 100; while (!(E.segAt(W, j).coins || []).some((c) => c.nitro)) j++;
  const nit = E.segAt(W, j).coins.find((c) => c.nitro);
  W.z = (j - 1) * E.SEG + 100; W.x = nit.x; W.boost = 0; W.v = E.MAXS * 0.5; drive(W, 3, {});
  assert.ok(nit.got); assert.ok(W.boost >= 0.45);
});

test('drifting: brake while steering at speed to slide round, scoring and filling the boost; boost uses it up', () => {
  const W = E.newWorld(2, {}, 11); go(W); W.cars = [];
  W.z = 300 * E.SEG; W.v = E.MAXS; W.boost = 0;
  E.step(W, { left: true, down: true }); assert.equal(W.drift, -1);
  drive(W, 60, (w) => { w.x = 0; return { left: true, down: true }; }); assert.ok(W.v > E.MAXS * 0.6, 'a drift keeps most of the speed'); assert.ok(W.boost > 0.15);
  const s0 = W.score; E.step(W, {}); assert.equal(W.drift, 0); assert.ok(W.score - s0 >= 500, 'points for the drift');
  W.boost = 1; W.v = E.MAXS; drive(W, 60, (w) => { w.x = 0; return { fire: true }; });
  assert.ok(W.v > E.MAXS * 1.1, 'boost goes past full speed'); assert.ok(W.boost < 0.8);
});

test('walls and the sea wall keep the car on the land; the clock running out ends the game', () => {
  const W = E.newWorld(2, {}, 12); go(W); W.cars = [];
  let i = 200; while (!(E.segAt(W, i).sea && E.segAt(W, i).sh < 2.3)) i++;
  W.z = i * E.SEG; W.v = E.MAXS * 0.5; W.x = -1.5; drive(W, 40, { left: true });
  const s = E.segAt(W, E.segIndex(W.z)); assert.ok(W.x >= -(s.sh - 0.3) - 0.05, 'not into the sea');
  W.time = 0.5; drive(W, 2000, {});
  assert.ok(W.timeUp); assert.ok(W.over);
});

test('at a split the other road\'s traffic goes its own way', () => {
  const W = E.newWorld(2, {}, 13); go(W);
  W.z = (W.fork.split - 3) * E.SEG; W.x = 0.7; W.v = E.MAXS * 0.5;
  drive(W, 10, {});
  assert.equal(W.fork.s, 1);
  W.cars.forEach((c) => { if (E.segIndex(c.z) >= W.fork.split && E.segIndex(c.z) < W.fork.end) assert.ok(c.b === 1 || c.b === -1, 'each car in the split is on one road'); });
  W.time = 99; drive(W, 400, {});
  assert.equal(W.fork && W.fork.s, 0); assert.ok(W.cars.every((c) => c.b === 0 || (W.fork && E.segIndex(c.z) >= W.fork.split)));
});

test('the driver gets round three stretches at every speed, and the score stays within the Hall of Fame limit', () => {
  for (const sp of [1, 2]) for (const seed of [1, 2, 3]) {
    const W = E.newWorld(sp, {}, seed); let goal = false;
    for (let i = 0; i < 60 * 60 * 5 && !W.over && !goal; i++) { E.step(W, E.autopilot(W)); if (W.events.some((e) => e.sfx === 'goal')) goal = true; quiet(W); }
    assert.ok(goal, 'speed ' + sp + ' seed ' + seed + ' reached the goal'); assert.equal(W.round, 2); assert.ok(W.t > 60 * 120, 'it took a few minutes of driving');
    assert.ok(W.score <= 8000 * W.t / 60 + 300000, 'score ' + W.score + ' in ' + Math.round(W.t / 60) + ' s');
  }
  const F = E.newWorld(3, {}, 1); drive(F, 60 * 40, E.autopilot);
  assert.ok(F.stageNo >= 1 && F.score > 0, 'Fast runs');
});
