/* 365 Pinball Hero - quick checks of the camera director (16 Oct 2026, next-gen wave 2). About 15 seconds:
 *   node --test tools/pinball/camera-test.cjs
 * The full proof is camera-farm.cjs (thousands of balls); this is the guard for everyday changes. Since 29 Oct 2026 it
 * also pins calm and classic to the full second of still picture and checks arcade's shorter wait with its own farm.
 * Since 30 Oct 2026 (owner: "the full realism rebuild") it pins classic to the old look (tilt 28, fov 32), the player-eye
 * home of calm and arcade (steeper, a longer lens, chosen by screen shape), the ball's size at both ends of it, and that
 * arcade moves steadily (the farm's camSpeed). */
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
    assert.ok(Math.abs(d - F.dist) < 1e-6 && F.fov === 32, 'a shot with no lens of its own has classic\'s');
    const s2 = Object.assign({}, s, { fov: 24 }), F2 = C.frame(s2, a), p2 = C.project(s2, a, s.cx, s.cy, 0);
    assert.ok(F2.fov === 24 && F2.dist > F.dist && Math.abs(p2[0] - 0.5) < 1e-9 && Math.abs(p2[1] - 0.5) < 1e-9, 'a longer lens backs off, the target stays put');
    const s0 = Object.assign({}, s, { yaw: 0 }), q = C.project(s0, a, s.cx + s.span / 2, s.cy, 0);
    assert.ok(Math.abs(q[0] - 1) < 1e-6, 'span fills the width at the target');
  }
});

test('home shows every storey\'s flipper box and the arch top at every screen shape, in every mode', () => {
  const T = E.table('ember').T;
  for (const m of ['calm', 'arcade', 'classic']) for (const a of [0.42, 0.46, 0.5, 0.56, 0.6, 0.75, 1, 1.6, 1.78]) {
    const h = C.home(a, 'ember', m);
    C.boxes('ember').forEach((bx) => bx.pts.forEach((q) => {
      const v = C.project(h, a, q[0], q[1], q[2]);
      assert.ok(v[0] >= 0 && v[0] <= 1 && v[1] >= 0 && v[1] <= 1, m + ' aspect ' + a + ' storey ' + bx.id + ' point ' + q);
    }));
    const top = C.project(h, a, T.arch.x, T.arch.y - T.arch.R, 0);
    assert.ok(top[1] >= 0 && top[1] <= 1, m + ' aspect ' + a + ': the arch top is in');
  }
});

test('classic keeps the old look; calm and arcade the player-eye home, steeper on wide screens (30 Oct 2026)', () => {
  for (const a of [0.46, 1.6]) {
    const h = C.home(a, 'ember', 'classic'), F = C.frame(h, a);
    assert.deepStrictEqual([h.tilt, F.fov, C.homeTilt(a, 'classic'), C.lens(a, 'classic')], [28, 32, 28, 32], 'classic at ' + a);
  }
  for (const m of ['calm', 'arcade']) {
    const p = C.homeTilt(0.46, m), w = C.homeTilt(1.6, m);
    assert.ok(p >= 36 && p <= 42, m + ' portrait tilt ' + p);
    assert.ok(w >= 45 && w <= 50, m + ' wide tilt ' + w);
    assert.ok(C.lens(0.46, m) < 32 && C.lens(1.6, m) < 32, m + ': a longer lens than classic\'s');
    for (const a of [0.46, 0.75, 1.6]) { const h = C.home(a, 'ember', m); assert.ok(Math.abs(h.tilt - C.homeTilt(a, m)) < 1e-9 && C.frame(h, a).fov === C.lens(a, m), m + ' home at ' + a + ' is homeTilt and lens'); }
  }
});

test('the ball stays readable at the far end of the player-eye home (radius 7; px at 1080 x 1920 and 1920 x 1200)', () => {
  const T = E.table('ember').T, f = T.flippers.filter((q) => (q.storey || 0) === 0), fx = (f[0].x + f[1].x) / 2;
  const size = (m, a, W, x, y) => { const h = C.home(a, 'ember', m), p = C.project(h, a, x - T.BALL, y, T.BALL), q = C.project(h, a, x + T.BALL, y, T.BALL); return (q[0] - p[0]) * W; };
  for (const [a, W] of [[0.46, 1080], [1.6, 1920]]) {
    const ay = T.arch.y - T.arch.R + T.BALL + 2, oldFar = size('classic', a, W, T.arch.x, ay), far = size('calm', a, W, T.arch.x, ay);
    assert.ok(far >= oldFar * 0.95, 'aspect ' + a + ': the far ball ' + far.toFixed(1) + ' px against classic\'s ' + oldFar.toFixed(1));
    assert.ok(size('calm', a, W, fx, f[0].y) >= size('classic', a, W, fx, f[0].y) * 0.97, 'aspect ' + a + ': the flipper end stays as large');
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

test('calm and classic keep the full second of still picture; arcade 0.8 s, the rule unchanged (29 Oct 2026; slower moves home 30 Oct)', () => {
  const k = C.timing('classic');
  assert.deepStrictEqual([k.need, k.settle, k.early, k.back, k.spare, k.look], [88, 30, 0.5, 0.35, 0.1, 30], 'classic exactly as before');
  const c = C.timing('calm');   // calm's move home is slower since 30 Oct 2026, so it starts sooner: still a full second of still picture
  assert.deepStrictEqual([c.settle, c.early, c.spare, c.look], [30, 0.5, 0.1, 30], 'calm');
  assert.ok(c.back >= 0.45 && c.need === Math.ceil((c.back + 0.5 + 0.5 + 0.1) * 60), 'calm need ' + c.need);
  const a = C.timing('arcade');
  assert.strictEqual(a.settle, 30, 'the rule: half a second still before any ball can cross an approach line');
  assert.ok(a.need >= a.settle + Math.ceil(a.back * 60) && a.need <= 75, 'arcade turns for home under 1.25 s before an arrival (' + a.need + ' steps)');
  assert.ok(a.back >= 0.35, 'arcade\'s move home is no snap (30 Oct 2026, owner: fast moves lose the game)');
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
  // (away 27% -> 22%, wave 3: THE BIG ONE's multiball is now about 19% of play, and every mode stays home in it)
  assert.ok(out.pushInsPerMin >= 8 && parseFloat(out.away) >= 22, 'arcade moves: ' + out.pushInsPerMin + ' push-ins a minute, away ' + out.away);
  assert.strictEqual(out.pushInsWhileMulti, 0, 'no push-ins while more than one ball is in play');
  assert.ok(out.camSpeed.p99 <= 2.5 && parseFloat(out.camSpeed.over2) < 1, 'and steadily (30 Oct 2026): ' + JSON.stringify(out.camSpeed));
});

test('a small farm keeps the guarantee (the full proof: camera-farm.cjs)', () => {
  const out = JSON.parse(execFileSync(process.execPath, [path.join(__dirname, 'camera-farm.cjs'), '--balls=150', '--workers=8', '--seed=3'], { encoding: 'utf8', maxBuffer: 1 << 24 }));
  assert.strictEqual(out.approaches.bad - out.approaches.badAfterCut, 0, 'approaches');
  assert.strictEqual(out.liveFlips.bad - out.liveFlips.badAfterCut, 0, 'live flips');
  assert.strictEqual(out.decidedSaved, 0, 'decided drains');
  assert.ok(out.pass, JSON.stringify(out.bad));
});

// ------------------------------------------------------------ wave 3 (5 Nov 2026): INTO THE VOLCANO and multiball
require(path.join(ROOT, 'games', 'pinball', 'descent.js'));
test('a level takes its surface\'s home: the flippers at the same place on screen (412 x 915 and 1280 x 900)', () => {
  assert.ok(E.TABLES.chamber, 'tables/chamber.js is registered');
  const T = E.table('ember').T;
  for (const m of ['calm', 'arcade', 'classic']) for (const a of [412 / 915, 1280 / 900]) {
    const he = C.home(a, 'ember', m), hc = C.home(a, 'chamber', m);
    T.flippers.forEach((f) => {
      const tip = [f.x + Math.cos(f.rest) * f.len, f.y + Math.sin(f.rest) * f.len];
      for (const q of [[f.x, f.y], tip]) {
        const pe = C.project(he, a, q[0], q[1], 0), pc = C.project(hc, a, q[0], q[1], 0);
        assert.ok(Math.abs(pe[0] - pc[0]) < 0.03 && Math.abs(pe[1] - pc[1]) < 0.03, m + ' ' + a.toFixed(2) + ': flipper point ' + q + ' at ' + pe + ' vs ' + pc);
      }
    });
  }
});
test('a change of table is a hard cut: the new home on that very frame, no in-between', () => {
  C.configure({ forecaster: 'sync', latency: 0 }); C.setMode('calm'); C.reset();
  const a = 0.5, S = E.newWorld(2, null, 3, 'ember'), L = E.newWorld(2, null, 4, 'chamber');
  let t = 0, shot = null;
  for (let i = 0; i < 90; i++) { E.step(S, {}); S.events.length = 0; shot = C.update(S, t += 1000 / 60, 'play', a); }
  assert.ok(!shot.tableCut);
  E.step(L, {}); L.events.length = 0;
  shot = C.update(L, t += 1000 / 60, 'play', a);
  const h = C.home(a, 'chamber');
  assert.strictEqual(shot.tableCut, true, 'the shot says so');
  assert.ok(Math.abs(shot.cx - h.cx) < 1e-9 && Math.abs(shot.cy - h.cy) < 1e-9 && Math.abs(shot.span - h.span) < 1e-9 && Math.abs(shot.tilt - h.tilt) < 1e-9, 'home at once');
  E.step(S, {}); S.events.length = 0;
  shot = C.update(S, t += 1000 / 60, 'play', a);
  assert.strictEqual(shot.tableCut, true, 'and back up');
  assert.ok(C.stats().tableCuts >= 2);
});
test('no push-ins while more than one ball is in play (calm stays home in multiball)', () => {
  for (const m of ['calm', 'arcade']) {
    C.configure({ forecaster: 'sync', latency: 2 }); C.setMode(m); C.reset();
    const W = E.newWorld(2, null, 17, 'ember'), bot = Messy.create(17);
    let t = 0, multi = 0, away = 0, lastMb = -1e9;
    for (let i = 0; i < 60 * 90 && !W.over; i++) {
      if (W.state === 'play' && !W.mb && W.feed <= 0 && W.balls.length === 1 && W.balls[0].m === 'free' && W.balls[0].x < 240 && W.frame - lastMb > 600) { E.api.multiball(W, 3, {}); lastMb = W.frame; }
      E.step(W, bot(W)); W.events.length = 0;
      const shot = C.update(W, t += 1000 / 60, 'play', 0.5);
      if (W.balls.length + Math.max(0, W.feed) > 1) { multi++; if (shot.state !== 'home' && shot.state !== 'back') away++; }
    }
    assert.ok(multi > 600, m + ': multiball was played (' + multi + ' frames)');
    assert.strictEqual(away, 0, m + ': ' + away + ' frames away from home with more than one ball in play');
  }
});
