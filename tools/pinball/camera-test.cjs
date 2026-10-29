/* 365 Pinball Hero - quick checks of the camera director (16 Oct 2026, next-gen wave 2). About 15 seconds:
 *   node --test tools/pinball/camera-test.cjs
 * The full proof is camera-farm.cjs (thousands of balls); this is the guard for everyday changes. Since 29 Oct 2026 it
 * also pins calm and classic to the full second of still picture and checks arcade's shorter wait with its own farm. */
'use strict';
const test = require('node:test'), assert = require('node:assert');
const path = require('path'), { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..', '..');
const E = require(path.join(ROOT, 'games', 'pinball', 'engine.js'));
const C = require(path.join(ROOT, 'games', 'pinball', 'camera.js'));
const Messy = require('./messybot.cjs');

test('frame() and project() are one camera model', () => {
  const s = { cx: 120, cy: 300, span: 200, tilt: 33, yaw: 7 };
  for (const a of [0.46, 0.56, 1.2]) {
    const p = C.project(s, a, s.cx, s.cy, 0);
    assert.ok(Math.abs(p[0] - 0.5) < 1e-9 && Math.abs(p[1] - 0.5) < 1e-9, 'the target is the centre');
    const F = C.frame(s, a), d = Math.hypot(F.eye[0] - s.cx, F.eye[1] - s.cy, F.eye[2]);
    assert.ok(Math.abs(d - F.dist) < 1e-6 && F.fov === 32, 'the lens never changes');
    const s0 = Object.assign({}, s, { yaw: 0 }), q = C.project(s0, a, s.cx + s.span / 2, s.cy, 0);
    assert.ok(Math.abs(q[0] - 1) < 1e-6, 'span fills the width at the target');
  }
});

test('home shows every storey\'s flipper box at every screen shape', () => {
  for (const a of [0.42, 0.46, 0.5, 0.56, 0.6, 0.75, 1, 1.78]) {
    const h = C.home(a, 'ember');
    C.boxes('ember').forEach((bx) => bx.pts.forEach((q) => {
      const v = C.project(h, a, q[0], q[1], q[2]);
      assert.ok(v[0] >= 0 && v[0] <= 1 && v[1] >= 0 && v[1] <= 1, 'aspect ' + a + ' storey ' + bx.id + ' point ' + q);
    }));
  }
});

test('the look-ahead is exact: with the buttons held, the real game arrives when it said', () => {
  let checked = 0;
  for (let seed = 1; seed <= 6; seed++) {
    const W = E.newWorld(2, null, seed, 'ember'), bot = Messy.create(seed);
    while (W.frame < 4000 && !W.over) {
      E.step(W, bot(W)); W.events.length = 0;
      if (W.frame % 97 !== 0 || W.balls.length !== 1 || E.inApproach(W, W.balls[0]) >= 0) continue;
      const inp = { left: W.prevL, right: W.prevR, fire: W.plunger.held, up: W.prevUp }, r = C.forecast(W, inp, 200, 0);
      if (r.min < 0) continue;
      const G = E.clone(W);
      let k = 0;
      while (k < r.min) { E.step(G, inp); G.events.length = 0; k++; }
      assert.ok(G.balls.some((b) => E.inApproach(G, b) >= 0), 'seed ' + seed + ' frame ' + W.frame);
      checked++;
    }
  }
  assert.ok(checked > 20);
});

test('attract (director) and every mode run without a fault', () => {
  for (const mode of ['calm', 'arcade', 'classic']) {
    C.configure({ forecaster: 'sync', latency: 2 }); C.setMode(mode); C.reset();
    const W = E.newWorld(2, null, 5, 'ember'), bot = Messy.create(5);
    for (let i = 0; i < 2400; i++) {
      E.step(W, bot(W)); W.events.length = 0;
      const s = C.update(W, i * 1000 / 60, i < 600 ? 'title' : 'play', 0.5);
      assert.ok(isFinite(s.cx) && isFinite(s.cy) && s.span > 0 && s.timeScale > 0 && s.timeScale <= 1);
      if (mode === 'classic') assert.ok(s.timeScale === 1 && Math.abs(s.yaw) < 1e-9);
    }
  }
  C.setMode('calm');
});

test('calm and classic keep the full second of still picture; arcade 0.8 s, the rule unchanged (29 Oct 2026)', () => {
  for (const m of ['calm', 'classic']) {
    const k = C.timing(m);
    assert.deepStrictEqual([k.need, k.settle, k.early, k.back, k.spare, k.look], [88, 30, 0.5, 0.35, 0.1, 30], m);
  }
  const a = C.timing('arcade');
  assert.strictEqual(a.settle, 30, 'the rule: half a second still before any ball can cross an approach line');
  assert.ok(a.need >= a.settle + Math.ceil(a.back * 60) && a.need <= 66, 'arcade turns for home under 1.1 s before an arrival (' + a.need + ' steps)');
});

test('arcade is deterministic: the same game twice gives the same camera, frame for frame', () => {
  const run = () => {
    C.configure({ forecaster: 'sync', latency: 2 }); C.setMode('arcade'); C.reset();
    const W = E.newWorld(2, null, 7, 'ember'), bot = Messy.create(7), out = [];
    for (let i = 0; i < 3000 && !W.over; i++) { E.step(W, bot(W)); W.events.length = 0; const s = C.update(W, i * 1000 / 60, 'play', 0.5); out.push(s.state + s.cx.toFixed(6) + s.span.toFixed(6) + s.yaw.toFixed(6)); }
    return out.join('|');
  };
  assert.strictEqual(run(), run());
  C.setMode('calm');
});

test('a small arcade farm keeps the guarantee and moves', () => {
  const out = JSON.parse(execFileSync(process.execPath, [path.join(__dirname, 'camera-farm.cjs'), '--balls=150', '--workers=8', '--seed=3', '--mode=arcade'], { encoding: 'utf8', maxBuffer: 1 << 24 }));
  assert.strictEqual(out.approaches.bad - out.approaches.badAfterCut, 0, 'approaches');
  assert.strictEqual(out.liveFlips.bad - out.liveFlips.badAfterCut, 0, 'live flips');
  assert.strictEqual(out.earlyFlips.bad - out.earlyFlips.badAfterCut, 0, 'early presses within the 0.1 s arcade promises');
  assert.strictEqual(out.decidedSaved, 0, 'decided drains');
  assert.ok(out.emergenciesPer100Balls < 2.5, 'cuts (150 balls is a small sample: the 600-ball farm holds them under 1): ' + out.emergenciesPer100Balls);
  assert.ok(out.pushInsPerMin >= 10 && parseFloat(out.away) >= 27, 'arcade moves: ' + out.pushInsPerMin + ' push-ins a minute, away ' + out.away);
});

test('a small farm keeps the guarantee (the full proof: camera-farm.cjs)', () => {
  const out = JSON.parse(execFileSync(process.execPath, [path.join(__dirname, 'camera-farm.cjs'), '--balls=150', '--workers=8', '--seed=3'], { encoding: 'utf8', maxBuffer: 1 << 24 }));
  assert.strictEqual(out.approaches.bad - out.approaches.badAfterCut, 0, 'approaches');
  assert.strictEqual(out.liveFlips.bad - out.liveFlips.badAfterCut, 0, 'live flips');
  assert.strictEqual(out.decidedSaved, 0, 'decided drains');
  assert.ok(out.pass, JSON.stringify(out.bad));
});
