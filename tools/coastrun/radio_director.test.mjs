// 365 Coast Run - the Getaway's police radio director (node --test tools/coastrun/radio_director.test.mjs), 22 Oct 2026. The director is lifted
// out of games/coastrun/coastrun.js itself (between "RADIO DIRECTOR {" and "} RADIO DIRECTOR": the very code the game runs) and given:
//  1. the owner's escape to Durdle Door (run 20261021-173602) as its event log (D:/claude/reels/coastrun-play/runs/howto-<run>.json), the way
//     the demo he approved read it (C:/claude-voices/chase_demo.py) - the schedule should be the demo's (its cues file), give or take the half
//     second a lone crash now waits to see if it's a pile-up;
//  2. the same run REPLAYED in engine.js step by step (his inputs, his dice), fed exactly as the game feeds it (radioFeed: W.events and W.cop) -
//     what he'd hear playing it today;
//  3. the rules one at a time.
// The line lengths are the game's own clips' (games/coastrun/radio/radio.json, made by tools/coastrun/make_radio.py).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = fs.readFileSync(path.join(ROOT, 'games/coastrun/coastrun.js'), 'utf8');
const a0 = SRC.indexOf('// RADIO DIRECTOR {'), a1 = SRC.indexOf('// } RADIO DIRECTOR');
assert.ok(a0 > 0 && a1 > a0, 'the director block is marked in coastrun.js');
const { radioDirector, radioFeed } = new Function(SRC.slice(a0, a1) + '\nreturn { radioDirector, radioFeed };')();
const TAB = JSON.parse(fs.readFileSync(path.join(ROOT, 'games/coastrun/radio/radio.json'), 'utf8')).t;
const GAP = 0.22, AFTER = 1.2;
const durOf = (k, v) => TAB[k][v].reduce((d, ln, i) => d + ln[2] + (i ? GAP : 0), 0);
const RUN = '20261021-173602', RUNS = 'D:/claude/reels/coastrun-play/runs';
const CUES = 'D:/claude/coastrun-revamp/voices/police-radio-in-a-real-run-cues.txt';
const have = (f) => fs.existsSync(f);
const cues = () => fs.readFileSync(CUES, 'utf8').split('\n').map((l) => /^\s*([\d.]+)s\s+(\S+)\s+v(\d+)/.exec(l)).filter(Boolean).map((m) => ({ t: +m[1], k: m[2], v: +m[3] }));
const fmt = (p) => p.t.toFixed(1).padStart(6) + 's  ' + p.k.padEnd(11) + ' v' + (p.v + 1);

function compare(name, got, want) {   // side by side, and how close
  const rows = [], n = Math.max(got.length, want.length); let same = 0, worst = 0;
  for (let i = 0; i < n; i++) {
    const g = got[i], w = want[i], ok = g && w && g.k === w.k && g.v + 1 === w.v, dt = ok ? g.t - w.t : null;
    if (ok) { same++; worst = Math.max(worst, Math.abs(dt)); }
    rows.push((g ? fmt(g) : ''.padEnd(23)) + '  |  ' + (w ? w.t.toFixed(1).padStart(6) + 's  ' + w.k.padEnd(11) + ' v' + w.v : '') + (ok ? '   ' + (dt >= 0 ? '+' : '') + dt.toFixed(2) + ' s' : '   <- differs'));
  }
  console.log('\n' + name + ': ' + got.length + ' exchanges (demo ' + want.length + '), ' + same + ' the same in order, worst timing ' + worst.toFixed(2) + ' s\n'
    + '   this director         |  the demo the owner heard\n' + rows.join('\n'));
  return { same, worst };
}
function rulesHold(got) {   // whatever the input: one at a time with a breath after, each moment's exchanges in turn, the cool-downs kept
  const COOL = { nitro: 45, copdown: 18, pileup: 25, ambush: 25, ram: 15, squeeze: 15, check: 20 }, nv = {}, lastT = {};
  for (let i = 0; i < got.length; i++) {
    const p = got[i];
    if (i && !/escaped|busted/.test(p.k)) assert.ok(p.t >= got[i - 1].t + durOf(got[i - 1].k, got[i - 1].v) + AFTER - 1e-9, 'one at a time: ' + fmt(p));
    assert.equal(p.v, (nv[p.k] || 0) % TAB[p.k].length, 'in turn: ' + fmt(p)); nv[p.k] = (nv[p.k] || 0) + 1;
    if (p.k in lastT) assert.ok(p.t - lastT[p.k] >= (COOL[p.k] || 0) - 1e-9, 'cool-down: ' + fmt(p));
    lastT[p.k] = p.t;
  }
}

test('the owner\'s run as its event log (as the demo read it): the demo\'s schedule', { skip: !have(RUNS + '/howto-' + RUN + '.json') && 'no event log here' }, () => {
  const L = JSON.parse(fs.readFileSync(RUNS + '/howto-' + RUN + '.json', 'utf8'));
  const D = radioDirector(TAB, durOf, () => true), got = [], at = new Map();
  for (const e of L.ev) (at.get(e.n) || at.set(e.n, []).get(e.n)).push(e);
  const pile = new Set(L.pops.filter((p) => p.txt.startsWith('PILE-UP')).map((p) => p.n)), sq = new Set(L.pops.filter((p) => p.txt.startsWith('THE SQUEEZE')).map((p) => p.n));
  for (let n = 1; n <= L.steps + 600; n++) {
    const t = n / 60, info = { pile: pile.has(n), sq: sq.has(n), escaped: !L.busted };
    for (const e of at.get(n) || []) D.event(e.e, { n: 1 }, t, info);   // (the log keeps no n: the demo took every jetBoost for the rocket)
    if (sq.has(n)) D.event('near', { n: 3 }, t, info);   // (nor the near misses: the squeeze from its pop-up)
    const p = D.tick(t); if (p) got.push(p);
  }
  const want = cues(), r = compare('From the event log', got, want);
  rulesHold(got);
  assert.equal(got.length, want.length, 'as many exchanges as the demo');
  assert.equal(r.same, want.length, 'the same exchanges, in the same order');
  for (let i = 0; i < got.length; i++) {   // to the step, but for a lone crash's half second (and what that half second pushes on)
    const dt = got[i].t - want[i].t;
    assert.ok(dt > -0.05 && dt < 0.6, fmt(got[i]) + ' vs ' + want[i].t + ' s');
  }
});

test('the owner\'s run REPLAYED in the engine, fed as the game feeds it', { skip: !have(RUNS + '/run-' + RUN + '.json') && 'no recorded run here' }, () => {
  const E = createRequire(import.meta.url)(path.join(ROOT, 'games/coastrun/engine.js'));
  const r = JSON.parse(fs.readFileSync(RUNS + '/run-' + RUN + '.json', 'utf8')), rnd = r.rnd, R = Math.random;
  const W = E.newWorld(r.speed, r.set, r.seed), D = radioDirector(TAB, durOf, () => true), got = [];
  let ri = 0, n = 0, after = 0;
  try {
    for (const [cnt, inp] of r.inputs) for (let q = 0; q < cnt; q++) {
      Math.random = () => (ri < rnd.length && rnd[ri][0] === n ? rnd[ri++][1] : R());
      E.step(W, Object.assign({}, inp)); Math.random = R; n++;
      radioFeed(D, W); const p = D.tick(W.t / 60); if (p) got.push(p);
      W.events.length = 0;
    }
    while (after++ < 600) { const p = D.tick((W.t + after) / 60); if (p) got.push(p); }   // (the last word, if it's still waiting)
  } finally { Math.random = R; }
  assert.equal(n, r.steps, 'every recorded step replayed');
  assert.equal(W.score, r.score, 'the replay is his run (the same score)');
  assert.ok(W.complete && W.cop.escaped, 'he escaped');
  const want = cues(); compare('Replayed in the engine', got, want);
  rulesHold(got);
  assert.equal(got[0].k, 'siren_start'); assert.equal(got[0].v, 0);
  assert.ok(got[0].t > 3 && got[0].t < 3.6, 'the opening exchange at the green light');
  assert.equal(got[got.length - 1].k, 'escaped', 'the last word: escaped');
  assert.ok(Math.abs(got.length - want.length) <= 4, 'about as many as the demo');
});

test('the rules, one at a time', () => {
  const T = (rules) => { const D = radioDirector(TAB, durOf, rules && rules.ready || (() => true)), out = []; return { D, out, run(evs, until) {
    for (let n = 1; n <= until * 60; n++) { const t = n / 60; for (const e of evs) if (Math.round(e[1] * 60) === n) D.event(e[0], e[2] || {}, t, Object.assign({ pile: false, sq: false, escaped: false }, e[3])); const p = D.tick(t); if (p) out.push(p); }
    return out; } }; };
  const L = (k, v) => durOf(k, v);
  // the bigger moment wins; the smaller one, waiting more than 1.5 s for the channel, is dropped
  let o = T().run([['ram', 10], ['stinger', 10], ['alarm', 10.5]], 30);
  assert.deepEqual(o.map((p) => p.k), ['stinger'], 'stinger beats ram; the alarm waited too long');
  // a moment that comes while the channel is busy is said when it's free, within 1.5 s
  o = T().run([['ram', 10], ['alarm', 10 + L('ram', 0) + 1.2 - 1]], 40);
  assert.deepEqual(o.map((p) => p.k), ['ram', 'alarm']); assert.ok(Math.abs(o[1].t - (o[0].t + L('ram', 0) + 1.2)) < 0.02, 'said as the channel frees');
  // cool-downs: a ram 10 s after the last ram stays quiet (15 s), one 20 s after speaks - its second exchange
  o = T().run([['ram', 5], ['ram', 15], ['ram', 25]], 40);
  assert.deepEqual(o.map((p) => p.k + p.v), ['ram0', 'ram1']); assert.ok(Math.abs(o[1].t - 25) < 0.02);
  // the sirens: the first is the start, the rest are lay-bys
  o = T().run([['siren', 3.4], ['siren', 30], ['siren', 60]], 70);
  assert.deepEqual(o.map((p) => p.k + p.v), ['siren_start0', 'ambush0', 'ambush1']);
  // the rocket: only when it's lit from cold (n 1)
  o = T().run([['jetBoost', 5, { n: 0 }], ['jetBoost', 8, { n: 1 }]], 20);
  assert.deepEqual(o.map((p) => p.k + '@' + p.t.toFixed(1)), ['nitro@8.0']);
  // the squeeze only when the engine says this step was one (a third near miss in a row is n 3 too)
  o = T().run([['near', 5, { n: 3 }], ['near', 9, { n: 3 }, { sq: true }]], 20);
  assert.deepEqual(o.map((p) => p.k + '@' + p.t.toFixed(1)), ['squeeze@9.0']);
  // a lone crash waits half a second, then it's a copdown; another down within that half second makes it a pile-up
  o = T().run([['copdown', 10]], 20); assert.deepEqual(o.map((p) => p.k + '@' + p.t.toFixed(2)), ['copdown@10.50']);
  o = T().run([['copdown', 10], ['copdown', 10.3, {}, { pile: true }]], 20); assert.deepEqual(o.map((p) => p.k + '@' + p.t.toFixed(2)), ['pileup@10.30']);
  o = T().run([['copdown', 10], ['copdown', 10.3, {}, { pile: true }], ['copdown', 10.6]], 20); assert.deepEqual(o.map((p) => p.k), ['pileup'], 'one exchange for the lot');
  // busted: never dropped - after 1.5 s of an exchange still on air it cuts in; nothing else after it
  const t0 = 10, d = L('cleared', 0);
  o = T().run([['cleared', t0], ['busted', t0 + 0.5], ['ram', t0 + 3], ['check', t0 + d + 3]], 40);
  assert.deepEqual(o.map((p) => p.k), ['cleared', 'busted']); assert.ok(Math.abs(o[1].t - (t0 + 2)) < 0.02, 'cut in 1.5 s after it was busted');
  o = T().run([['goal', 20, {}, { escaped: true }], ['copdown', 21]], 40); assert.deepEqual(o.map((p) => p.k), ['escaped']);
  // its clips not loaded yet: it waits (as for the channel), then goes
  let ok = false; const X = T({ ready: () => ok }); X.run([['alarm', 5]], 5.5); ok = true;
  for (let n = 331; n <= 600; n++) { const p = X.D.tick(n / 60); if (p) X.out.push(p); }
  assert.deepEqual(X.out.map((p) => p.k + '@' + p.t.toFixed(2)), ['alarm@5.52']);
  // a pause cuts the exchange short: the channel's free a breath later
  const Y = T(); Y.run([['ram', 5]], 6); Y.D.cut(6); Y.run([['alarm', 7.25]], 8);
  assert.deepEqual(Y.out.map((p) => p.k), ['ram', 'alarm']);
});
