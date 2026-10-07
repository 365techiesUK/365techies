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
function clear(W) { W.cars = []; W.field = []; for (let i = W.base; i <= E.lastIndex(W); i++) { const g = E.segAt(W, i); g.spr = null; g.coins = null; } }

test('a new game: Bournemouth first, the clock by speed, a car and an accelerator', () => {
  const g = E.newWorld(1, { car: 'hatch' }, 1), c = E.newWorld(2, { car: 'nope', pedal: 'hold' }, 1);
  assert.equal(g.stage, 0); assert.equal(E.STAGES[0].name, 'BOURNEMOUTH');
  assert.equal(Math.round(g.time), Math.round(E.STAGES[0].t * 1.06 + 10), 'Gentle gives a little more time'); assert.equal(Math.round(c.time), Math.round(E.STAGES[0].t * 1.04 + 10), 'Classic: the first stage (and a little: 7 Oct, so nitro is margin, not rent) and ten seconds in hand');
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
  assert.ok(hi - lo > 2 && hi - lo < 12, 'Bournemouth runs nearly flat along the promenade (owner, 6 Oct): ' + (hi - lo).toFixed(1) + ' m'); assert.ok(crests > 0, 'with crests to jump');
  assert.equal(E.segAt(a, 8).gate.kind, 'start');
  const f = a.fork; assert.equal(f.split - f.a, E.FA); assert.equal(f.end - f.split, E.FB);
  assert.equal(E.segAt(a, f.split).fk.o1, E.OFF0, 'the two roads start side by side'); assert.ok(E.segAt(a, f.end - 1).fk.o2 > 100, 'and end far apart');
});

test('steering: a held key turns the car to an angle and it moves across; let go and it straightens', () => {
  const W = E.newWorld(2, {}, 2); go(W); clear(W);
  const i = findSeg(W, 60, (g, j) => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25].every((d) => Math.abs(E.segAt(W, j + d).k) < 1e-6));
  W.s = i * E.SEG; W.v = 50; W.x = -4;
  drive(W, 30, { right: true });
  assert.ok(W.psi > 0.15, 'pointing right: ' + W.psi.toFixed(2)); assert.ok(W.x > -2.2, 'moved right: ' + W.x.toFixed(2));   // (it has weight now: a lane change takes a moment, 6 Oct)
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
  const s0 = W.score; E.step(W, {}); assert.equal(W.drift, 1, 'let go: the slide eases off, not all at once');
  let n = 1; while (W.drift && n < 120) { E.step(W, {}); n++; } quiet(W);
  assert.equal(W.drift, 0, 'and straightens up'); assert.ok(n > 30 && n < 85, 'unwinding over most of a second, not snapping (7 Oct): ' + n + ' steps'); assert.ok(W.score - s0 >= 300, 'points for the drift');
  W.boost = 1; W.v = E.VMAX; drive(W, 60, (w) => { w.x = 0; return { fire: true }; });
  assert.ok(W.v > E.VMAX * 1.1, 'boost goes past full speed'); assert.ok(W.boost < 0.8);
});

test('a drift answers the keys: held it swings wide, caught it straightens quickly, and it eases in rather than snapping', () => {
  const W = E.newWorld(2, {}, 4); go(W); clear(W);
  const i = findSeg(W, 60, (g, j) => g.k > 1 / 130 && E.segAt(W, j + 30).k > 1 / 130);
  W.s = i * E.SEG; W.v = 55; W.x = -2; W.boost = 0;
  const p0 = W.psi; E.step(W, { right: true, brakeTap: true }); quiet(W);
  assert.ok(W.psi - p0 < 0.12, 'no snap sideways on the first step: ' + (W.psi - p0).toFixed(3));
  let prev = 0, rises = 0; for (let n = 0; n < 20; n++) { E.step(W, { right: true }); quiet(W); const a = W.psi - W.phi; if (a > prev) rises++; prev = a; }
  assert.ok(rises >= 15, 'the slide grows step by step: ' + rises);
  drive(W, 30, { right: true }); const full = W.psi - W.phi;
  E.step(W, { left: true }); let n = 1; while (W.drift && n < 60) { E.step(W, { left: true }); n++; } quiet(W);
  assert.ok(full > 0.35, 'held: a full slide ' + full.toFixed(2)); assert.ok(n < 34, 'steering against it catches it quicker than letting go: ' + n + ' steps');
});

test('the flick (8 Oct): steering the other way into an S-bend swings the slide straight through to the other side as one drift, scored once', () => {
  const W = E.newWorld(2, {}, 5); go(W); clear(W);
  const run = (j, a, b, sg, min) => { for (let d = a; d < b; d++) { const g = E.segAt(W, j + d); if (!g || g.fk || g.k * sg < min) return false; } return true; };
  let i = -1, sg = 0;
  for (let j = 60; j < E.lastIndex(W) - 140 && i < 0; j++) for (const s of [1, -1]) if (i < 0 && run(j, 0, 20, s, 1 / 260)) { for (let o = 22; o < 50; o += 2) if (run(j, o, o + 16, -s, 1 / 320)) { i = j; sg = s; break; } }
  assert.ok(i > 0, 'an S-bend to try');
  const into = sg > 0 ? { right: true } : { left: true }, back = sg > 0 ? { left: true } : { right: true };
  W.s = (i - 2) * E.SEG; W.x = -sg * 2; W.v = E.topSpeed(W) * 0.9;
  let ends = 0, flags = [], slips = [], swT = -1, n = 0;
  const tick = (inp) => { E.step(W, inp); W.cars = []; for (const e of W.events) if (e.sfx === 'driftend') ends++; quiet(W); flags.push(W.drift); slips.push(W.psi - W.phi); n++; };
  tick({ ...into, brakeTap: true }); assert.equal(W.drift, sg, 'a drift into the first bend');
  while (n < 240 && swT < 0) { if (E.segAt(W, E.segIndex(W.s) + 3).k * sg < -1 / 400) swT = n; else tick(into); }
  assert.ok(swT > 20, 'held into the first bend until the road turns the other way: ' + swT);
  for (let k = 0; k < 96; k++) tick(back);
  const flip = flags.slice(swT), slip = slips.slice(swT);
  assert.ok(flip.every((f) => f !== 0), 'the drift stays on all the way through straight (no CLEAN DRIFT halfway)');
  assert.equal(flags[flags.length - 1], -sg, 'and now slides the other way'); assert.equal(ends, 0, 'nothing scored yet');
  const near = slip.filter((a) => Math.abs(a) < 6 / 57.3).length; assert.ok(near <= 9, 'it swings through straight, not stopping there: ' + near + ' steps within 6 degrees');
  const peak = slips.slice(0, swT).reduce((m, a) => Math.max(m, a * sg), 0), from = slip.findIndex((a) => a * sg < 0.75 * peak), to = slip.findIndex((a) => a * sg < -0.75 * peak);
  assert.ok(from >= 0 && to > from && to - from < 48, 'side to side in under 0.8 s: ' + (to - from) + ' steps');
  const rel = slips.length; let air = 0; for (let k = 0; k < 240 && W.drift; k++) { tick({}); if (W.air) air++; }   // (this S runs over a crest: the slide waits in the air, 8 Oct)
  for (let k = 0; k < 30; k++) tick({});
  assert.equal(W.drift, 0, 'let go and it straightens'); assert.equal(ends, 1, 'scored once, for the whole S');
  const jump = slips.slice(rel).reduce((m, a, q, s) => (q ? Math.max(m, Math.abs(a - s[q - 1])) : m), 0);
  assert.ok(air > 20 && jump < 0.02, 'over the crest it lands still sliding and unwinds, no snap straight: ' + air + ' steps in the air, biggest step ' + (jump * 57.3).toFixed(2) + ' deg');
});

test('the tyres squeal near the limit in a bend, not on a gentle one', () => {
  const W = E.newWorld(2, {}, 4); go(W); clear(W);
  const i = findSeg(W, 60, (g, j) => g.k > 1 / 130 && E.segAt(W, j + 20).k > 1 / 130);
  W.s = i * E.SEG; W.v = 62; W.x = 0; W.psi = W.phi = 0;
  let most = 0; drive(W, 40, (w) => { w.v = 62; most = Math.max(most, w.slide || 0); return { right: true }; });
  assert.ok(most > 0.5, 'hard round a sharp bend at speed: ' + most.toFixed(2));
  const j = findSeg(W, 60, (g, q) => Math.abs(g.k) < 1 / 2000 && Math.abs(E.segAt(W, q + 20).k) < 1 / 2000);
  W.s = j * E.SEG; W.v = 30; W.x = 0; W.psi = W.phi = 0; W.steer = 0; W.slide = 0; W.drift = 0; W.dk = 0;
  let quietMost = 0; drive(W, 40, (w) => { w.v = 30; quietMost = Math.max(quietMost, w.slide || 0); return {}; });
  assert.ok(quietMost < 0.05, 'cruising on the straight: ' + quietMost.toFixed(2));
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

test('the goal: a time bonus, a love bonus, a rank; then the game is complete, or Space carries on into town', () => {
  const W = E.newWorld(2, {}, 8); go(W);
  for (let k = 0; k < 4; k++) {
    W.s = (W.fork.split - 2) * E.SEG; W.x = -6; W.v = 40; W.cars = []; drive(W, 30, {});
    W.s = (W.fork.end - 1) * E.SEG; W.x = 0; drive(W, 30, {}); while (W.ferry) { E.step(W, {}); quiet(W); }
  }
  assert.equal(W.route.length, 5); assert.ok(!E.STAGES[W.route[4]].next, 'the fifth place ends in a goal');
  W.s = (W.goalAt - 3) * E.SEG; W.time = 12.2; W.cars = []; W.runHearts = 4; W.runAsked = 3;
  const s0 = W.score; let goal = false; for (let i = 0; i < 40; i++) { E.step(W, {}); if (W.events.some((e) => e.sfx === 'goal')) goal = true; quiet(W); }
  assert.ok(goal); assert.equal(W.round, 2); assert.ok(W.score - s0 >= 12000 + 20000, 'time bonus and 5,000 a heart'); assert.ok(W.time > 50, 'the clock starts again');
  assert.ok(W.result && 'SABCD'.includes(W.result.rank), 'a rank: ' + (W.result && W.result.rank)); assert.equal(W.result.love, 20000); assert.equal(W.result.route.length, 5);
  assert.equal(E.STAGES[W.result.route[4]].key, 'lyme', 'all left: Lyme Regis');
  const C = JSON.parse(JSON.stringify(W.complete || null));
  // the goal's moment (7 Oct): the clock stops, the car drives itself, the card stays up - then round 2
  const tFrozen = W.time; drive(W, 200, {});
  assert.ok(W.goalSeq, 'the goal sequence is still on after 3 s'); assert.equal(W.time, tFrozen, 'the clock stops for it'); assert.ok(W.result, 'the results card stays up');
  drive(W, 400, {});
  assert.ok(W.over && W.complete && W.complete.goal === 'LYME REGIS' && 'SABCD'.includes(W.complete.rank), 'no input: the game is complete at the goal');
});

test('crashes: a lamp post at speed is a big crash on Classic; on Gentle a bounce, unless flat out; bushes only slow you', () => {
  for (const [sp, v, big] of [[2, 50, true], [1, 40, false], [1, 62, true]]) {
    const W = E.newWorld(sp, {}, 9); go(W); W.cars = [];
    const i = findSeg(W, 50, (g) => (g.spr || []).some((p) => p.t === 'lamp' && p.x > 0));
    const lamp = E.segAt(W, i).spr.find((p) => p.t === 'lamp' && p.x > 0);
    W.s = (i - 1) * E.SEG + 1; W.x = lamp.x - 0.3; W.v = v;
    drive(W, 6, (w) => { w.x = lamp.x - 0.3; return {}; });
    assert.ok(W.crash, 'crashed'); assert.equal(W.crash.hard, big, 'speed ' + sp + ' at ' + v);
    const s0 = W.s; drive(W, 60, {});
    if (big) assert.ok(W.s - s0 > 25, 'a big crash tumbles on down the road: ' + (W.s - s0).toFixed(0) + ' m');
    let n = 0; while (W.crash && n++ < 400) { E.step(W, {}); quiet(W); }
    assert.equal(W.crash, null, 'back on the road'); assert.ok(Math.abs(W.x) <= 4.7); if (big) assert.ok(W.v < 1, 'from a standstill');
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
  const s0 = N.score; let near = false; for (let i = 0; i < 140; i++) { E.step(N, (N.x = 2.8, {})); if (N.events.some((e) => e.sfx === 'near')) near = true; quiet(N); }
  assert.ok(near); assert.ok(N.score - s0 >= 500); assert.ok(N.boost >= 0.1, 'a near miss fills the boost');
});

test('coins, a whole line of them, and nitro', () => {
  const W = E.newWorld(2, {}, 13); go(W); W.cars = [];
  const i = findSeg(W, 50, (g) => (g.coins || []).some((c) => !c.nitro && !c.pw && c.of === 8));
  const first = E.segAt(W, i).coins.find((c) => !c.nitro && !c.pw), line = first.line;
  const s0 = W.score; W.s = (i - 1) * E.SEG; W.x = first.x; W.v = 30; W.boost = 0;
  drive(W, 150, (w) => { w.x = first.x; w.v = 30; w.psi = w.phi = 0; return {}; });
  assert.equal(W.lineGot[line], first.of, 'every coin in the line'); assert.ok(W.score - s0 >= 2500 + 100 * first.of);
  const j = findSeg(W, E.segIndex(W.s), (g) => (g.coins || []).some((c) => c.nitro));
  const nit = E.segAt(W, j).coins.find((c) => c.nitro);
  W.s = (j - 1) * E.SEG + 2; W.x = nit.x; W.boost = 0; W.v = 30; drive(W, 10, (w) => { w.x = nit.x; return {}; });
  assert.ok(nit.got); assert.ok(W.bottles >= 4, 'a bottle of nitro (earned now, 7 Oct: you start with three)');
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

test('the driver gets round five stretches at Gentle and Classic, and the score stays within the Hall of Fame limit', () => {
  for (const sp of [1, 2]) for (const seed of [1, 2]) {
    const W = E.newWorld(sp, {}, seed); let goal = false;
    for (let i = 0; i < 60 * 60 * 10 && !W.over && !goal; i++) { E.step(W, E.autopilot(W)); if (W.events.some((e) => e.sfx === 'goal')) goal = true; quiet(W); if (sp === 2) W.time = Math.max(W.time, 5); }
    assert.ok(goal, 'speed ' + sp + ' seed ' + seed + ' reached the goal'); assert.equal(W.round, 2); assert.ok(W.t > 60 * 200, 'it took a few minutes of driving');
    assert.ok(W.result.legs.length >= 4, 'a time for each stretch'); assert.ok(W.runAsked >= 5 || W.result.of >= 15, 'she asked for things along the way: ' + W.runAsked);
    assert.ok(W.score <= 8000 * W.t / 60 + 500000, 'score ' + W.score + ' in ' + Math.round(W.t / 60) + ' s');
  }
  const F = E.newWorld(3, {}, 1); drive(F, 60 * 40, E.autopilot);
  assert.ok(F.score > 0, 'Fast runs');
});

test('the runs: the coast first, then the town - each a pyramid, every place once in it, goals at the end', () => {
  assert.deepEqual(E.RUNS.map((r) => r.levels), [5, 5]);
  for (let r = 0; r < E.RUNS.length; r++) {
    const run = E.STAGES.filter((S) => S.run === r), n = E.RUNS[r].levels;
    assert.equal(run.length, n * (n + 1) / 2); assert.equal(run.filter((S) => !S.next).length, n, 'a goal for each end');
    assert.equal(new Set(run.map((S) => S.key)).size, run.length, 'every place once in a run'); assert.equal(E.STAGES[E.RUN_START[r]].level, 1);
    for (const S of run) if (S.next) { const a = E.STAGES[S.next[0]], b = E.STAGES[S.next[1]]; assert.equal(a.level, S.level + 1); assert.equal(b.pos, a.pos + 1); assert.equal(a.pos, S.pos); assert.equal(a.run, r, 'stays in its run'); }
  }
  // the coast first (7 Oct), the town as round 2
  assert.equal(E.RUNS.length, 2); assert.equal(E.RUNS[0].key, 'coast'); assert.equal(E.RUNS[1].key, 'town');
  assert.equal(E.STAGES[0].key, 'bournemouth', 'the coast starts in Bournemouth'); assert.deepEqual(E.STAGES[0].next.map((n) => E.STAGES[n].key), ['sandbanks', 'christchurch']);
  const goals = E.STAGES.filter((S) => S.run === 0 && !S.next).map((S) => S.key); assert.deepEqual(goals, ['lyme', 'jurassic', 'portland', 'weymouth', 'needles'], 'five goals along the coast');
  const T = E.STAGES[E.RUN_START[1]]; assert.equal(T.key, 'bournemouth', 'round 2 back into town from Bournemouth'); assert.deepEqual(T.next.map((n) => E.STAGES[n].key), ['winton', 'charminster']);
  assert.equal(E.nextRun(E.STAGES.find((S) => S.run === 0 && !S.next)), 1, 'the coast leads into town'); assert.equal(E.nextRun(E.STAGES.find((S) => S.run === 1 && !S.next)), 0, 'the town back to the coast');
  for (const k of E.PLACES.map((p) => p.key).filter((k) => k !== 'goldencap')) assert.ok(E.STAGES.some((S) => S.key === k), k + ' is on the map');
});

test('tunnels and bridges: the road keeps level through them, and their walls and railings keep the car in', () => {
  for (const [key, flag, wall] of [['purbeck', 'tun', E.TUN_W], ['christchurch', 'brg', E.BRG_W]]) {
    const W = E.newWorld(2, {}, 16); go(W); W.cars = [];
    const from = E.lastIndex(W) + 1; E.buildStage(W, E.STAGES.find((S) => S.key === key).id);
    const i = findSeg(W, from, (g, j) => g[flag] && E.segAt(W, j + 12)[flag]);
    assert.ok(i > 0, key + ' has one');
    if (flag === 'brg') assert.ok(E.segAt(W, i).y1 >= 8.9, 'the bridge is well above the water');
    assert.ok(!(E.segAt(W, i).spr || []).some((p) => p.h > 0), 'nothing to hit inside');
    W.fork = null; W.s = i * E.SEG; W.v = 40; W.x = 0;
    drive(W, 40, (w) => { w.v = 40; return { left: true }; });
    assert.ok(W.x >= -(wall - E.CAR_W) - 0.01, key + ': held in by the ' + (flag === 'tun' ? 'wall' : 'railing') + ' at ' + W.x.toFixed(2));
  }
});

test('her requests: do what she asks in time for hearts; a knock spoils "careful"; she picks a road at the fork', () => {
  const W = E.newWorld(2, {}, 17); go(W); clear(W);
  W.s = 100 * E.SEG; W.x = 0; W.v = 60; W.reqNext = 1e9;
  W.req = { k: 'pass', txt: '', t0: W.t, dur: 900, goal: 2, have: 0 };
  for (const z of [40, 80]) W.cars.push({ id: z, s: W.s + z, x: 4.6, tx: 4.6, v: 20, v0: 20, t: 0, b: 0, col: 0, lc: 9999, hitT: -999, passed: false, ds: z, spin: 0 });
  const h0 = W.hearts; drive(W, 200, (w) => { w.x = 0; w.v = 60; return {}; });
  assert.equal(W.req, null, 'done'); assert.equal(W.hearts - h0, 3, 'three hearts for doing it quickly');
  W.req = { k: 'clean', txt: '', t0: W.t, dur: 720, goal: 1, have: 0 };
  W.cars.push({ id: 99, s: W.s + 6, x: 0, tx: 0, v: 10, v0: 10, t: 0, b: 0, col: 0, lc: 9999, hitT: -999, passed: false, ds: 6, spin: 0 });
  const h1 = W.hearts; drive(W, 40, (w) => { w.x = 0; return {}; });
  assert.equal(W.req, null, 'over'); assert.equal(W.hearts, h1, 'no hearts after a bump'); assert.ok(W.her.k === 'scared' || W.her.k === 'sad' || W.her.k === 'sulk', 'she minds: ' + W.her.k);
  const F = E.newWorld(2, {}, 18); go(F); F.cars = [];
  F.s = (F.fork.a - 60) * E.SEG; F.v = 40; drive(F, 30, (w) => { w.v = 40; return {}; });
  assert.ok(F.reqSide, 'she says which way'); assert.equal(F.her.k, 'point');
  const want = F.reqSide.side, h2 = F.hearts;
  F.s = (F.fork.split - 3) * E.SEG; F.x = want * 6; drive(F, 20, {});
  assert.equal(F.hearts - h2, 2, 'two hearts for taking her road'); assert.equal(F.reqSide, null);
});

test('requests come along by themselves while you drive', () => {
  const W = E.newWorld(2, {}, 19); let asked = 0;
  for (let i = 0; i < 60 * 60 && !W.over; i++) { E.step(W, E.autopilot(W)); if (W.events.some((e) => e.sfx === 'ask')) asked++; quiet(W); W.time = Math.max(W.time, 30); }
  assert.ok(asked >= 3, 'asked ' + asked + ' times in a minute'); assert.ok(W.hearts > 0, 'and some were done: ' + W.hearts);
});

test('the bonuses: all five turn up on the road', () => {
  const seen = {};
  const W = E.newWorld(2, {}, 1); for (let id = 1; id < 6; id++) E.buildStage(W, id);   // the first few places, end to end
  for (let i = W.base; i <= E.lastIndex(W); i++) for (const c of E.segAt(W, i).coins || []) { if (c.pw) seen[c.pw] = 1; if (c.nitro) seen.nitro = 1; }
  for (const k of ['nitro', 'magnet', 'shield', 'double', 'time']) assert.ok(seen[k], k + ' appears');
});

function bonusAt(W, k) {   // put a bonus of kind k right in front of the car on a clear road
  clear(W); const i = E.segIndex(W.s) + 2, c = { x: 0, pw: k, got: 0 }; E.segAt(W, i).coins = [c]; W.x = 0; return c;
}
test('extra time: three more seconds on the clock', () => {
  const W = E.newWorld(2, {}, 1); go(W); W.s = 60 * E.SEG; W.v = 20;
  const c = bonusAt(W, 'time'), t0 = W.time; drive(W, 30, { up: true });
  assert.ok(c.got); assert.ok(W.time > t0 + 2.2, 'about three seconds more (less the half second driven)');
});
test('the magnet pulls in coins from the other lanes', () => {
  const W = E.newWorld(2, {}, 1); go(W); W.s = 60 * E.SEG; W.v = 25;
  bonusAt(W, 'magnet'); drive(W, 30, { up: true }); assert.ok(W.pw.magnet > 0, 'magnet on');
  const i = E.segIndex(W.s) + 4, far = { x: 4.6, got: 0, line: 99, of: 1 }; E.segAt(W, i).coins = [far]; W.x = -4.6;
  drive(W, 30, (w) => { w.x = -4.6; return { up: true }; }); assert.ok(far.got, 'a coin two lanes away is caught');
  const W2 = E.newWorld(2, {}, 1); go(W2); W2.s = 60 * E.SEG; W2.v = 25; clear(W2);
  const j = E.segIndex(W2.s) + 4, far2 = { x: 4.6, got: 0, line: 99, of: 1 }; E.segAt(W2, j).coins = [far2];
  drive(W2, 30, (w) => { w.x = -4.6; return { up: true }; }); assert.ok(!far2.got, 'without the magnet it is missed');
});
test('the shield: hit the traffic and it goes flying, no crash', () => {
  const W = E.newWorld(2, {}, 1); go(W); W.s = 60 * E.SEG; W.v = 60;
  bonusAt(W, 'shield'); drive(W, 30, { up: true }); assert.ok(W.pw.shield > 0); W.v = 60;
  W.cars = [{ id: 999, s: W.s + 12, x: W.x, tx: W.x, v: 20, v0: 20, t: 0, b: 0, col: 0, lc: 60, hitT: -999, passed: false, ds: 12, spin: 0 }];
  const s0 = W.score; drive(W, 40, { up: true });
  assert.equal(W.crash, null, 'no crash'); assert.ok(W.v > 40, 'still going'); assert.ok(W.score - s0 >= 1000, 'a smash scores');
});
test('double points doubles what you score while it lasts', () => {
  const A = E.newWorld(2, {}, 1), B = E.newWorld(2, {}, 1); go(A); go(B);
  for (const W of [A, B]) { W.s = 60 * E.SEG; W.v = E.VMAX; clear(W); }
  B.pw.double = 600; const a0 = A.score, b0 = B.score;
  drive(A, 120, { up: true }); drive(B, 120, { up: true });
  assert.ok(B.score - b0 > (A.score - a0) * 1.8, 'about twice the points');
});
test('nitro takes you well past full speed', () => {
  const W = E.newWorld(2, {}, 1); go(W); W.s = 60 * E.SEG; W.v = E.VMAX; W.boost = 1; clear(W);
  drive(W, 150, (w) => { w.x = 0; return { up: true, fire: true }; });
  assert.ok(W.v > E.VMAX * 1.15, 'over 15% past full speed: ' + Math.round(W.v / E.VMAX * 100) + '%');
});

test('time up (7 Oct): the car stops in a few seconds, Space ends it at once, and rolling over a checkpoint on zero saves you', () => {
  // no checkpoint in reach: the brakes, stopped and over well inside 6 s (it used to roll on for ~32 s)
  let W = E.newWorld(2, {}, 4); go(W); W.cars = []; W.v = 63; W.time = 0.02; let n = 0;
  while (!W.over && n++ < 60 * 20) { W.cars = []; W.x = 0; E.step(W, {}); quiet(W); }
  assert.ok(W.over && n < 60 * 6, 'over in ' + (n / 60).toFixed(1) + ' s');
  // Space: a fresh press ends it straight away
  W = E.newWorld(2, {}, 4); go(W); W.cars = []; W.v = 63; W.time = 0.02;
  for (let i = 0; i < 90; i++) { W.cars = []; W.x = 0; E.step(W, {}); quiet(W); }
  assert.ok(W.timeUp && !W.over); E.step(W, { fire: true }); assert.ok(W.over, 'Space skips to the result');
  // a checkpoint in reach: you roll for it, and making it puts you back in the race
  W = E.newWorld(2, {}, 4); go(W); W.cars = [];
  W.s = (W.fork.split - 2) * E.SEG; W.x = -6; W.v = 40; drive(W, 30, {}); W.s = (W.fork.end - 1) * E.SEG; W.x = 0; drive(W, 5, {});   // (on to the second place, its checkpoint ahead)
  const ci = findSeg(W, E.segIndex(W.s), (g) => g.gate && g.gate.kind === 'check');
  assert.ok(ci > 0, 'a checkpoint ahead');
  W.s = (ci - 30) * E.SEG; W.x = 0; W.v = 40; W.time = 0.02;
  let saved = false; for (let i = 0; i < 600 && !W.over; i++) { W.cars = []; W.x = 0; E.step(W, {}); if (W.banner && W.banner.txt === 'JUST MADE IT!') saved = true; quiet(W); }
  assert.ok(saved && !W.timeUp && !W.over && W.time > 20, 'just made it: back in the race with ' + W.time.toFixed(0) + ' s');
});

test('drifting (7 Oct): a drift held into the bend keeps its speed, a good one gives a shove coming out, and a bounce no longer stops you dead', () => {
  const W = E.newWorld(2, {}, 3); go(W); W.cars = []; W.field = [];
  const i = findSeg(W, E.segIndex(W.s) + 40, (g, j) => Math.abs(g.k) > 1 / 180 && Math.abs(E.segAt(W, j + 20).k) > 1 / 180);
  assert.ok(i > 0, 'a bend');
  const into = E.segAt(W, i).k > 0 ? 1 : -1, top = E.topSpeed(W);
  W.s = (i - 2) * E.SEG; W.x = -into * 2; W.v = top * 0.9; W.autoDrift = true;
  const key = into > 0 ? { right: true } : { left: true };
  drive(W, 3, { ...key, down: true }); assert.ok(W.drift, 'a drift started');
  const v0 = W.v; drive(W, 60, (w) => { w.cars = []; return into * w.x < 2.2 ? key : {}; });
  assert.ok(W.drift && v0 - W.v < 2, 'a second held in the drift loses under 2 m/s: lost ' + (v0 - W.v).toFixed(2));
  const vEnd = W.v; drive(W, 90, (w) => { w.cars = []; return {}; });   // let go: it straightens (over most of a second now), and comes out with a shove
  assert.ok(!W.drift, 'the drift ended');
  // a bounce on Gentle: down to about half speed, still moving
  const B = E.newWorld(1, {}, 9); go(B); B.cars = [];
  const li = findSeg(B, 50, (g) => (g.spr || []).some((p) => p.t === 'lamp' && p.x > 0)), lamp = E.segAt(B, li).spr.find((p) => p.t === 'lamp' && p.x > 0);
  B.s = (li - 1) * E.SEG + 1; B.x = lamp.x - 0.3; B.v = 40; drive(B, 6, (w) => { w.x = lamp.x - 0.3; return {}; });
  assert.ok(B.crash && !B.crash.hard, 'a bounce'); let n = 0; while (B.crash && n++ < 100) { E.step(B, {}); quiet(B); }
  assert.ok(B.v > 12, 'still moving after a bounce: ' + B.v.toFixed(1) + ' m/s');
});

test('carrying on from a goal (7 Oct): Space in the goal moment, and round 2 goes back into town', () => {
  const W = E.newWorld(2, {}, 8); go(W);
  for (let k = 0; k < 4; k++) { W.s = (W.fork.split - 2) * E.SEG; W.x = 6; W.v = 40; W.cars = []; drive(W, 30, {}); W.s = (W.fork.end - 1) * E.SEG; W.x = 0; drive(W, 30, {}); while (W.ferry) { E.step(W, {}); quiet(W); } }
  W.s = (W.goalAt - 3) * E.SEG; W.time = 12; W.cars = [];
  let n = 0; while (!W.goalSeq && n++ < 60) { E.step(W, {}); quiet(W); }
  assert.ok(W.goalSeq, 'the goal'); assert.equal(E.STAGES[W.route[4]].key, 'needles', 'all right: the Needles');
  drive(W, 90, {}); E.step(W, { fire: true }); quiet(W); assert.ok(!W.goalSeq && !W.over, 'carried on');
  drive(W, 700, {}); assert.equal(W.stage, E.RUN_START[1]); assert.equal(E.STAGES[W.stage].key, 'bournemouth', 'round 2: into town'); assert.equal(W.round, 2);
});
