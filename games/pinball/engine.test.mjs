// 365 Pinball Hero engine tests (node --test games/pinball/engine.test.mjs), 15 Oct 2026; both tables, 16 Oct 2026.
// Never deployed (**/*.test.mjs is excluded). They play the real engine in node: the world the other parts of the game
// rely on, a seeded game playing out the same every time (and a clone stepping identically), our own sin and cos, no
// ball ever getting stuck (a fixed batch of random balls and every named corner), every major shot being makeable from
// a flipper with a fair timing window, the plunger, each feature and, on Ember Peak, every toy and the storeys. The sim
// tools in tools/pinball do the heavy lifting (and print the full maps); these keep a smaller, fixed batch.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const E = require('./engine.js');
const S = require('../../tools/pinball/sim.cjs');
const Traps = require('../../tools/pinball/traps.cjs');
const Shots = require('../../tools/pinball/shots.cjs');
const Plunger = require('../../tools/pinball/plunger.cjs');
const F = require('../../tools/pinball/features.cjs');

// ============================================================ both tables
test('the engine: tables as data, our own sin and cos, nothing a browser may round differently', () => {
  assert.ok(['ember', 'orbit'].every((k) => E.TABLES[k]), 'the registry holds the old table and Ember Peak (and any table file loaded with them)');
  assert.equal(E.DEFAULT, 'ember', 'the game plays Ember Peak when its file is loaded');
  assert.equal(E.newWorld(2, 0, 1).tableId, 'ember');
  assert.equal(E.newWorld(2, 0, 1, 'orbit').tableId, 'orbit');
  assert.equal(E.newWorld(2, 0, 1, 'nope').tableId, 'ember', 'an unknown table falls back to the default');
  assert.equal(E.table('ember'), E.table('ember'), 'each table is built once');
  for (let x = -20; x <= 20; x += 0.0137) {
    assert.ok(Math.abs(E.sin(x) - Math.sin(x)) < 1e-14 && Math.abs(E.cos(x) - Math.cos(x)) < 1e-14, 'sin/cos at ' + x);
  }
  const src = readFileSync(new URL('./engine.js', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
  assert.doesNotMatch(src, /Math\.(sin|cos|tan|pow|exp|log|atan2?|hypot|random)\b/, 'the physics uses only arithmetic (and sqrt)');
});

// ============================================================ the old table ("orbit"), as before
test('orbit: a new game: the world and the exports the rest of the game relies on', () => {
  S.use('orbit');
  const W = E.newWorld(2, 0, 365, 'orbit');
  for (const k of ['score', 'ball', 'total', 'over', 'demo', 'state', 'balls', 'flippers', 'plunger', 'drops', 'dropsDown', 'lanes',
    'skill', 'skillOpen', 'mult', 'bonus', 'kickback', 'saucerLit', 'saveT', 'tilted', 'spin', 'combo', 'lit', 'dmd', 'events', 'stats',
    'tableId', 'toys', 'storeys']) {
    assert.ok(k in W, 'world has ' + k);
  }
  assert.equal(W.state, 'play');
  assert.equal(W.balls.length, 1);
  const b = W.balls[0];
  for (const k of ['id', 'x', 'y', 'vx', 'vy', 'm', 's', 'z']) assert.ok(k in b, 'ball has ' + k);
  assert.ok(b.x > E.TABLE.shooter.x0, 'the first ball waits in the shooter lane');
  assert.equal(W.flippers.length, 2);
  for (const k of ['x', 'y', 'len', 'r0', 'r1', 'a', 'on', 'side', 'storey']) assert.ok(k in W.flippers[0], 'flipper has ' + k);
  assert.deepEqual(W.drops, [true, true, true, true, true]);
  for (const k of ['bump', 'sling', 'drop', 'lane', 'kick', 'saucer', 'ramp', 'orbitL', 'orbitR', 'save']) assert.ok(k in W.lit, 'lit has ' + k);
  for (const k of ['W', 'H', 'BALL', 'SPEEDS', 'PTS', 'TABLE', 'RAMP', 'DROPS', 'GATES', 'WALLS', 'POSTS', 'BUMPERS', 'FLIP', 'newWorld', 'step', 'hud', 'rampAt', 'inPocket', 'fmt', 'addBall',
    'clone', 'table', 'TABLES', 'inApproach', 'storeyOf', 'nearRaisedFlipper', 'sin', 'cos']) {
    assert.ok(k in E, 'engine exports ' + k);
  }
  assert.equal(E.W, 270); assert.equal(E.H, 446);
  assert.equal(E.TABLE.id, 'orbit');
  assert.equal(E.newWorld(1, 0, 1, 'orbit').total, 5, 'Gentle has five balls');
  assert.equal(E.newWorld(9, 0, 1, 'orbit').speed, 1, 'an unknown speed falls back to Gentle');
  assert.deepEqual(E.hud(W), { score: 0, lives: 3, wave: 1 });
});

function sameGame(tableId) {
  function game(seed) {
    const W = E.newWorld(2, 0, seed, tableId), drive = S.bot(4242), log = [];
    for (let i = 0; i < 60 * 90 && !W.over; i++) {
      E.step(W, drive(W));
      for (const e of W.events) log.push(W.frame + ':' + (typeof e === 'string' ? e : JSON.stringify(e)));
      W.events.length = 0;
    }
    return { score: W.score, ball: W.ball, frame: W.frame, pos: W.balls.map((b) => [b.x, b.y, b.vx, b.vy]), log: log.join('|') };
  }
  const a = game(7), b = game(7);
  assert.ok(a.score > 0 && a.log.length > 100, 'the bot played');
  assert.deepEqual(a, b);
  // the seed is what the machine chooses for itself (the skill-shot lane each ball)
  const lanes = (seed) => Array.from({ length: 12 }, (_, i) => E.newWorld(2, 0, seed + i * 1000, tableId).skill).join('');
  assert.notEqual(lanes(7), lanes(8));
}
test('orbit: the same seed and the same presses play out exactly the same (and another seed does not)', () => sameGame('orbit'));

function noTraps(tableId, n, step) {
  S.use(tableId);
  let searches = 0;
  const problems = [];
  for (let i = 0; i < n; i++) {
    const o = Traps.oneBall(i * step + 5, 20, false);
    searches += o.searches;
    o.traps.forEach((t) => { if (t.type !== 'quiet') problems.push(i + ':' + t.type + '@' + t.x + ',' + t.y + ' ' + t.what); });
    if (o.drainKind) assert.notEqual(o.drainKind, 'shooter', 'never drains down the shooter lane');
  }
  assert.deepEqual(problems, [], 'no ball rests, circles, wedges, tunnels, leaves the table, or reaches a flipper from outside its approach zone');
  assert.equal(searches, 0, 'the ball search never has to fire');
}
test('orbit: no ball gets stuck: a fixed batch of 120 random balls, 20 seconds each, with the auto-flipper bot', () => noTraps('orbit', 120, 37));

function corners(tableId, stepXY) {
  S.use(tableId);
  const stuck = [];
  for (const [name, c] of Object.entries(Traps.CORNERS[tableId])) {
    for (const held of [false, true]) {
      for (let dx = -12; dx <= 12; dx += stepXY) for (let dy = -12; dy <= 12; dy += stepXY) {
        const W = S.world(2, 7, { kickback: false, noGeyser: true });
        const x = c[0] + dx, y = c[1] + dy;
        if (!S.freeSpot(W, x, y)) continue;
        S.place(W, x, y, 0, 0);
        let still = 0, rest = null;
        S.run(W, 60 * 6, () => ({ left: held, right: held }), (W2) => {
          const b = W2.balls[0]; if (!b) return false;
          if (W2.events.includes('search')) { rest = b; return false; }
          if (b.m === 'free' && !(held && E.nearRaisedFlipper(W2, b)) && Math.abs(b.vx) + Math.abs(b.vy) < 20) still++; else still = 0;
          if (still > 120) { rest = b; return false; }
        });
        if (rest) stuck.push(name + (held ? ' (flippers up)' : '') + ' from ' + x + ',' + y);
      }
    }
  }
  assert.deepEqual(stuck, []);
}
test('orbit: no ball rests in any named corner (a slow ball let go anywhere near one always leaves it)', () => corners('orbit', 4));

test('orbit: every major shot is makeable from a flipper with a timing window of at least 15 ms', () => {
  S.use('orbit');
  const left = Shots.windows(Shots.sweep(2, 0, 'cradle', false, 0, 700));
  const right = Shots.windows(Shots.sweep(2, 1, 'cradle', false, 0, 700));
  const rightDown = Shots.windows(Shots.sweep(2, 1, 'cradle', true, 0, 700));
  const rightIn = Shots.windows(Shots.sweep(2, 1, 'inlane', false, 300, 1000));
  const best = (name, ...maps) => Math.max(0, ...maps.map((m) => (m[name] ? m[name].best : 0)));
  assert.ok(best('orbit R', left) >= 15, 'the right orbit from the left flipper: ' + best('orbit R', left).toFixed(1) + ' ms');
  assert.ok(best('orbit L', right) >= 15, 'the left orbit from the right flipper: ' + best('orbit L', right).toFixed(1) + ' ms');
  assert.ok(best('drop target', left, right) >= 15, 'the drop targets');
  assert.ok(best('HANGAR', rightDown) >= 15, 'the hangar (targets down): ' + best('HANGAR', rightDown).toFixed(1) + ' ms');
  const ramp = best('RAMP made', right, rightIn);
  assert.ok(ramp >= 15, 'the warp ramp: ' + ramp.toFixed(1) + ' ms');
  const rampTotal = (right['RAMP made'] || { total: 0 }).total, all = 700;
  assert.ok(rampTotal < all * 0.15, 'the ramp is made from only ' + (100 * rampTotal / all).toFixed(0) + '% of cradle timings');
});

test('orbit: the plunger: the weakest pull falls back, a tap is the medium shot, the skill lanes need some pull, full pull goes round', () => {
  S.use('orbit');
  for (const sp of [1, 2, 3]) {
    assert.match(Plunger.launch(sp, 8).res, /fell back/, 'a weak pull falls back to the plunger (speed ' + sp + ')');
    assert.match(Plunger.launch(sp, 2).res, /right orbit|bumper|down the playfield/, 'a tap fires the medium shot (speed ' + sp + ')');
    assert.match(Plunger.launch(sp, 60).res, /round the arch/, 'a full pull goes round the arch (speed ' + sp + ')');
  }
  const lanes = new Set();
  for (let f = 20; f <= 45; f++) { const r = Plunger.launch(2, f).res; const m = r.match(/lane (\d)/); if (m) lanes.add(m[1]); }
  assert.deepEqual([...lanes].sort(), ['0', '1', '2'], 'all three top lanes can be reached with some pull');
  let run = 0, best = 0, last = '';
  for (let f = 20; f <= 45; f++) { const r = Plunger.launch(2, f).res; run = r === last ? run + 1 : 1; last = r; if (/lane/.test(r)) best = Math.max(best, run); }
  assert.ok(best >= 3, 'a top lane holds for ' + best + ' frames of pull');
});

for (const name of F.LISTS.orbit) {
  test('orbit feature: ' + name, () => {
    S.use('orbit');
    for (const sp of [1, 2, 3]) { const r = F.checks[name](sp); assert.ok(r.ok, E.SPEEDS[sp].name + ': ' + r.detail); }
  });
}

test('orbit: the speeds are the same table in slower and faster motion', () => {
  S.use('orbit');
  const lane = (sp) => Plunger.launch(sp, 32).res;
  assert.equal(lane(1), lane(2));
  assert.equal(lane(3), lane(2));
  const t = (sp) => { const W = S.world(sp, 1, {}); S.place(W, 125, 230, 0, 0); let i = 0; while (W.balls[0].y < 380 && i < 600) { E.step(W, {}); i++; } return i; };
  assert.ok(t(1) > t(2) && t(2) > t(3));
});

// ============================================================ Ember Peak
test('ember: the table (one screen, one storey), its toys, and the world the pictures read', () => {
  S.use('ember');
  const T = E.table('ember').T, W = E.newWorld(2, 0, 365);
  assert.equal(T.W, 270); assert.ok(T.H >= 446 && T.H <= 470, 'one screen tall: ' + T.H);
  assert.equal(W.flippers.length, 2);
  assert.deepEqual(W.flippers.map((f) => f.side), [-1, 1]);
  assert.deepEqual(W.flippers.map((f) => f.storey), [0, 0]);
  assert.equal(W.storeys.length, 1);
  for (const s of W.storeys) for (const k of ['id', 'flippers', 'x0', 'x1', 'y0', 'y1', 'approach']) assert.ok(k in s, 'storey has ' + k);
  assert.ok(W.balls[0].x > T.shooter.x0 && W.balls[0].y > W.storeys[0].approach, 'the first ball waits at the foot of the shooter lane');
  const V = W.toys.volcano;
  for (const k of ['pressure', 'rise', 'hold', 'release', 'land', 'carry', 'busy']) assert.ok(k in V, 'volcano has ' + k);
  assert.ok(T.volcano.y < T.H * 0.35 && T.volcano.x > 60 && T.volcano.x < 125, 'the volcano stands in the upper left middle');
  for (const k of ['st', 't', 'x', 'y']) assert.ok(k in W.toys.geyser, 'geyser has ' + k);
  assert.ok(W.toys.crabs.length >= 2 && W.toys.crabs.length <= 3, 'two or three crabs');
  for (const c of W.toys.crabs) for (const k of ['x', 'y', 'vx', 'vy', 'stun', 'hits']) assert.ok(k in c, 'crab has ' + k);
  assert.equal(W.toys.lava.gates.length, 2);
  for (const k of ['open', 't', 'gates']) assert.ok(k in W.toys.lava, 'lava has ' + k);
  for (const k of ['pending', 't', 'gx']) assert.ok(k in W.toys.quake, 'quake has ' + k);
  for (const k of ['crater', 'geyser', 'quake', 'crab', 'lava', 'ramp', 'orbitL', 'orbitR', 'drop', 'kick', 'save']) assert.ok(k in W.lit, 'lit has ' + k);
  assert.ok(T.ramp && T.ramp.entry && T.ramp.path.length > 4 && T.carries[T.volcano.carry], 'the ramp and the sky carry');
  // no crab path and no geyser inside the approach zone
  const zone = (x, y) => E.inApproach(W, { m: 'free', x, y });
  T.crabs.forEach((c, i) => c.path.forEach((p) => assert.equal(zone(p[0], p[1] + c.r), -1, 'crab ' + i + ' stays out of the approach zone')));
  assert.equal(zone(T.geyser.x, T.geyser.y + T.geyser.r), -1, 'the geyser is above the approach line');
  // scores feel like millions
  assert.ok(E.table('ember').PTS.crater >= 100000 && E.table('ember').PTS.skill >= 1000000);
});

test('ember: the same seed and the same presses play out exactly the same (and another seed does not)', () => sameGame('ember'));

test('ember: no ball gets stuck: a fixed batch of 200 random balls, 20 seconds each (gates up, quakes and all)', () => noTraps('ember', 200, 41));

test('ember: no ball rests in any named corner', () => corners('ember', 6));

test('ember: every major shot is makeable from a flipper with a timing window of at least 15 ms', () => {
  S.use('ember');
  const best = (name, ...maps) => Math.max(0, ...maps.map((m) => (m[name] ? m[name].best : 0)));
  const L = Shots.windows(Shots.sweep(2, 0, 'cradle', false, 0, 700));
  const R = Shots.windows(Shots.sweep(2, 1, 'cradle', false, 0, 700));
  const Lg = Shots.windows(Shots.sweep(2, 0, 'cradle', true, 0, 700, { lava: true }));
  const Rg = Shots.windows(Shots.sweep(2, 1, 'cradle', true, 0, 700, { lava: true }));
  const want = { 'orbit R': [L], 'orbit L': [R], 'drop target': [L, R], 'RAMP made': [L, R], CRATER: [L, R], 'lava L': [Rg, Lg], 'lava R': [Lg, Rg], crab: [L, R] };
  for (const [shot, maps] of Object.entries(want)) assert.ok(best(shot, ...maps) >= 15, shot + ': ' + best(shot, ...maps).toFixed(1) + ' ms');
  // the crater is a skill shot, not a gimme
  assert.ok(best('CRATER', L, R) <= 60, 'the crater window is ' + best('CRATER', L, R).toFixed(1) + ' ms');
  // the lava lanes are made from the far flipper (a cross-table shot)
  assert.ok(best('lava L', Rg) >= 15 && best('lava R', Lg) >= 15, 'lava lanes across: ' + best('lava L', Rg).toFixed(1) + ' / ' + best('lava R', Lg).toFixed(1) + ' ms');
});

test('ember: the plunger: weak falls back, a tap goes down the right orbit, each skill lane holds for 3+ frames, full pull goes round', () => {
  S.use('ember');
  for (const sp of [1, 2, 3]) {
    assert.match(Plunger.launch(sp, 8).res, /fell back/, 'a weak pull falls back (speed ' + sp + ')');
    assert.match(Plunger.launch(sp, 2).res, /right orbit/, 'a tap fires the safe medium shot (speed ' + sp + ')');
    assert.match(Plunger.launch(sp, 60).res, /round the arch/, 'a full pull goes round the arch (speed ' + sp + ')');
  }
  const runs = {};
  let last = '', run = 0;
  for (let f = 20; f <= 46; f++) {
    const r = Plunger.launch(2, f).res, m = r.match(/lane (\d)/), key = m ? m[1] : '';
    run = key && key === last ? run + 1 : 1; last = key;
    if (key) runs[key] = Math.max(runs[key] || 0, run);
  }
  assert.deepEqual(Object.keys(runs).sort(), ['0', '1', '2'], 'all three skill lanes can be reached');
  for (const k of Object.keys(runs)) assert.ok(runs[k] >= 3, 'lane ' + k + ' holds for ' + runs[k] + ' frames of pull');
});

for (const name of F.LISTS.ember) {
  test('ember feature: ' + name, () => {
    S.use('ember');
    for (const sp of name === 'storeys' ? [2] : [1, 2, 3]) { const r = F.checks[name](sp); assert.ok(r.ok, E.SPEEDS[sp].name + ': ' + r.detail); }
  });
}

test('ember: whole bot games: the ball search never fires', () => {
  S.use('ember');
  const t = Traps.games(6, true);
  assert.equal(t.searches, 0, 'ball searches in ' + (t.secs / 60).toFixed(0) + ' minutes of play');
  assert.ok(t.craters > 0 && t.ramps > 0 && t.orbits > 0 && t.crabs > 0 && t.geysers > 0, 'the bot meets the toys: ' + ['craters', 'ramps', 'orbits', 'crabs', 'geysers'].map((k) => k + ' ' + t[k]).join(', '));
});

// ============================================================ wave 3 (5 Nov 2026): CONTRACT v1, the engine side
const Pilot = require('./pilot.js');
const tick = (W, n, inp) => { const seen = []; for (let i = 0; i < n; i++) { E.step(W, typeof inp === 'function' ? inp(W, i) : inp || {}); W.events.forEach((e) => seen.push(typeof e === 'string' ? e : e.sfx || (e.say ? 'say' : '?'))); W.events.length = 0; } return seen; };
const DUMMY = {   // a plugin that uses the API every way it may: points, the crater's lamp, hitstop while the ball is held
  id: 'dummy', url: 'dummy.js',
  init(W) { W.dummy = { n: 0, craters: 0 }; },
  step(W) {
    const d = W.dummy; if (!d) return;
    d.n++;
    if (d.n % 600 === 0) E.api.award(W, 1000, 'dummy');
    if (W.events.indexOf('crater') >= 0) { d.craters++; E.api.hitstop(W, 4); E.api.craterLit(W, 'mode', d.craters % 2 === 1); }
  }
};

test('contract v1: the engine exports, the API and the new world fields', () => {
  for (const k of ['plugin', 'unplug', 'pluginUrls', 'plugins', 'addTable']) assert.equal(typeof E[k], 'function', 'E.' + k);
  for (const k of ['award', 'multiball', 'addBall', 'gates', 'plug', 'save', 'craterLit', 'seal', 'release', 'quake', 'hitstop']) assert.equal(typeof E.api[k], 'function', 'E.api.' + k);
  const W = E.newWorld(2, 0, 1, 'ember');
  assert.deepEqual(W.press, { level: 0.5, n: 0 });
  assert.deepEqual(W.lock, { lit: false, n: 0 });
  assert.equal(W.mb, null);
  assert.deepEqual(W.crater, { lit: [], sealed: false, wide: false, took: null, mode: false, dive: false, boss: false });
  assert.deepEqual(W.plug, { up: false, t: 0 });
  assert.deepEqual(W.dive, { held: false });
  assert.equal(W.hit, 0); assert.equal(W.feed, 0);
  assert.equal(W.next, undefined, 'W.next and W.goals belong to goals.js: the engine never writes them');
  for (const id of Object.keys(E.TABLES)) assert.ok(E.TABLES[id].walls, 'registry: ' + id + ' is a table');
  const src = readFileSync(new URL('./engine.js', import.meta.url), 'utf8');
  const head = src.slice(0, src.indexOf('(function (root'));
  for (const name of ['E.plugin', 'E.pluginUrls', 'E.api', 'award', 'multiball', 'addBall', 'gates', 'plug', 'save', 'craterLit', 'seal', 'release', 'quake', 'hitstop',
    'pressRate', 'mult0', 'lanes0', 'x.skill', 'noModes', 'tags', 'W.press', 'W.lock', 'W.mb', 'W.crater', 'W.plug', 'W.dive', 'W.hit', 'T.level', 'T.serve', 'T.aim', 'upTap']) assert.ok(head.includes(name), 'the header documents ' + name);
});

test('contract v1: a plugin runs at newWorld and after every step, its state in W[id]; E.clone and 3 minutes of pilot play stay deterministic with and without it', () => {
  function run(withPlugin) {
    if (withPlugin) E.plugin(DUMMY); else E.unplug('dummy');
    const W = E.newWorld(2, 0, 4242, 'ember'), inputs = [];
    W.total = 99;
    let C = null;
    for (let f = 0; f < 60 * 180; f++) {
      if (f === 60 * 60) C = E.clone(W);
      const inp = Pilot.input(W);
      if (C) inputs.push(inp);
      E.step(W, inp); W.events.length = 0;
    }
    for (const inp of inputs) { E.step(C, inp); C.events.length = 0; }
    return { W, C };
  }
  try {
    for (const withPlugin of [false, true]) {
      const a = run(withPlugin), b = run(withPlugin);
      assert.equal(a.W.frame, 60 * 180, 'still playing after 3 minutes');
      assert.equal(a.W.score, b.W.score, (withPlugin ? 'with' : 'without') + ' the plugin: the same seed and presses give the same score');
      assert.equal(a.W.frame, b.W.frame);
      assert.equal(a.C.score, a.W.score, 'a clone given the same presses ends on the same score');
      assert.equal(a.C.frame, a.W.frame);
      assert.equal(JSON.stringify(a.C), JSON.stringify(a.W), 'and the same world, to the bit');
      if (withPlugin) {
        assert.ok(a.W.dummy && a.W.dummy.n === a.W.frame, 'the plugin stepped once a step: ' + (a.W.dummy && a.W.dummy.n));
        assert.ok(a.W.stats.craters > 0 && a.W.dummy.craters === a.W.stats.craters, 'it saw every crater shot');
      } else assert.equal(a.W.dummy, undefined);
    }
    E.plugin(DUMMY);
    assert.deepEqual(E.pluginUrls(), ['dummy.js']);
  } finally { E.unplug('dummy'); }
  assert.deepEqual(E.pluginUrls(), []);
});

test('contract v1: a T.level table served by a carry: held, carried in, and a drain ends that world (no bonus count)', () => {
  const T = { id: 'testlevel', name: 'TEST LEVEL', level: true, W: 200, H: 300, BALL: 7, MID: 100,
    walls: [[0, 0, 0, 300, 2, 0.3, 'wall'], [200, 0, 200, 300, 2, 0.3, 'wall'], [0, 0, 200, 0, 2, 0.3, 'wall']],
    flippers: [{ side: -1, x: 60, y: 270, len: 30, r0: 6, r1: 3.5, rest: 0.5, up: -0.4 }, { side: 1, x: 140, y: 270, len: 30, r0: 6, r1: 3.5, rest: 2.64, up: 3.54 }],
    storeys: [{ id: 'test', name: 'TEST', flippers: [0, 1], x0: 0, x1: 200, y0: 0, y1: 300, approach: 200 }],
    carries: { drop: { pts: [[100, 20, 40, 0], [100, 60, 0, 30]], out: [0, 200] } }, serve: { carry: 'drop', hold: 30 } };
  E.addTable(T);
  const W = E.newWorld(2, 0, 3, 'testlevel'), b = W.balls[0];
  assert.equal(W.tableId, 'testlevel');
  assert.equal(b.m, 'held', 'served: held at the start of the carry');
  tick(W, 29); assert.equal(W.balls[0].m, 'held');
  tick(W, 3); assert.equal(W.balls[0].m, 'ramp', 'then on the carry');
  tick(W, 32); assert.equal(W.balls[0].m, 'free', 'then let go');
  const seen = tick(W, 300);
  assert.ok(seen.includes('drain'), 'it drains between the flippers');
  assert.ok(W.over && W.state === 'over', 'the drain ends the level world');
  assert.ok(!seen.includes('ballend') && !seen.includes('over'), 'no bonus count, no game-over');
});

test('contract v1: the dive hold: a lit DIVE keeps the ball at the crater until E.api.release (or diveCap steps)', () => {
  S.use('ember');
  const V0 = S.T.volcano;
  for (const release of [true, false]) {
    const W = S.world(2, 3, { noGeyser: true, noCrabs: true });
    E.api.craterLit(W, 'dive', true);
    assert.deepEqual(W.crater.lit, ['dive']); assert.ok(W.crater.wide);
    S.place(W, V0.x, V0.y + 60, 0, -900);
    const s1 = tick(W, 30);
    assert.ok(s1.includes('crater') && s1.includes('dive') && W.dive.held && W.crater.took === 'dive' && !W.crater.dive, 'taken into the dive hold');
    const s2 = tick(W, 200);
    assert.ok(!s2.includes('erupt') && W.balls[0].m === 'held', 'still held after 200 steps');
    if (release) {
      assert.ok(E.api.release(W));
      const s3 = tick(W, 2);
      assert.ok(s3.includes('erupt') && W.balls[0].m === 'ramp' && !W.dive.held, 'released into the sky carry');
    } else {
      const s3 = tick(W, V0.diveCap);
      assert.ok(s3.includes('erupt') && !W.dive.held, 'nobody released it: let go after diveCap steps');
    }
  }
});

test('contract v1: hitstop only while every ball is captured, and the crater release step moves with it', () => {
  S.use('ember');
  const V0 = S.T.volcano, W = S.world(2, 3, { noGeyser: true, noCrabs: true });
  S.place(W, 125, 300, 0, 0);
  assert.equal(E.api.hitstop(W, 10), false, 'a free ball: no hitstop');
  assert.equal(W.hit, 0);
  W.balls.length = 0; S.place(W, V0.x, V0.y + 60, 0, -900);
  tick(W, 12);
  const V = W.toys.volcano, rel = V.release;
  assert.ok(W.balls[0].m === 'held');
  assert.equal(E.api.hitstop(W, 10), true);
  const x = W.balls[0].x, hold = W.balls[0].hold;
  tick(W, 10);
  assert.equal(W.hit, 0); assert.equal(W.balls[0].hold, hold, 'the hold did not count down while frozen'); assert.equal(W.balls[0].x, x);
  assert.equal(V.release, rel + 10, 'the release step moved on by the hitstop');
  let out = -1; for (let i = 0; i < 100 && out < 0; i++) { if (tick(W, 1).includes('erupt')) out = W.frame; }
  assert.equal(out, V.release, 'released on the step W.toys.volcano.release says');
});

test('contract v1: W.mod: mult0 and lanes0 carry onto each new ball (BONUS FORGE, LUCKY LANES); noKick keeps the kickback lamp honest; x.skill', () => {
  S.use('ember');
  const W = E.newWorld(2, 0, 9, 'ember');
  W.mod = { x: { skill: 0.3 }, mult0: 3, lanes0: [true, false, true], noKick: true };
  W.total = 2; W.kickback = true;
  tick(W, 1);
  assert.equal(W.kickback, false, 'no kickback lamp under noKick');
  W.balls.length = 0;
  for (let i = 0; i < 2000 && W.ball === 1; i++) tick(W, 1);
  assert.equal(W.ball, 2); assert.equal(W.mult, 3, 'ball 2 starts at bonus x3'); assert.deepEqual(W.lanes, [true, false, true]);
  W.balls.length = 0; W.skillOpen = true; W.skill = 1; W.lanes = [false, false, false];
  const ln = S.T.sensors.circles.find((c) => c[0] === 'lane1'), s0 = W.score;
  E.addBall(W, ln[1], ln[2] - 12).vy = 120;
  tick(W, 10);
  assert.equal(W.stats.skill, 1);
  assert.equal(W.score - s0, Math.round(S.T.points.skill * 0.3) + S.T.points.lane, 'the skill shot at x0.3');
});

test('contract v1: input.upTap nudges once per tap (3 short taps = 3 nudges); a held nudge button nudges once', () => {
  let W = E.newWorld(2, 0, 9, 'ember');
  assert.equal(tick(W, 3, { upTap: 1 }).filter((e) => e === 'nudge').length, 3);
  W = E.newWorld(2, 0, 9, 'ember');
  assert.equal(tick(W, 3, { up: true }).filter((e) => e === 'nudge').length, 1);
  W = E.newWorld(2, 0, 9, 'ember');
  assert.equal(tick(W, 1, { upTap: 3 }).filter((e) => e === 'nudge').length, 3, 'three taps inside one step');
});

test('contract v1: the rest of the API: award, addBall, gates, plug, save, seal, quake', () => {
  S.use('ember');
  const W = S.world(2, 3, { noGeyser: true, noCrabs: true });
  S.place(W, 125, 300, 0, 0);
  W.mod = { x: { boss: 2 } };
  const s0 = W.score; E.api.award(W, 1000, 'boss'); assert.equal(W.score - s0, 2000, 'award scores through add() and W.mod.x');
  E.api.gates(W, -1, 100); tick(W, 1);
  assert.ok(W.toys.lava.gates[0].t > 0 && !W.toys.lava.gates[0].solid && W.toys.lava.gates[1].t === 0, 'gates(-1) opens the left gate only');
  E.api.gates(W, 0, 0); tick(W, 40); assert.ok(!W.toys.lava.open, 'steps 0 lowers them');
  E.api.plug(W, 60); assert.ok(W.plug.up && W.plug.t === 60);
  E.api.save(W, 5); assert.ok(W.saveT >= 300);
  E.api.seal(W, true); assert.ok(W.crater.sealed);
  E.api.craterLit(W, 'boss', true); tick(W, 1); assert.deepEqual(W.crater.lit, ['boss']); assert.equal(W.crater.wide, false, 'sealed: lit but not wider (it does not catch)');
  E.api.seal(W, false); E.api.craterLit(W, 'boss', false);
  E.api.quake(W); assert.ok(W.toys.quake.pending);
  E.api.addBall(W); assert.equal(W.feed, 1);
  let fed = false; for (let i = 0; i < 10 && !fed; i++) { tick(W, 1); fed = W.balls.length === 2; }
  assert.ok(fed, 'addBall feeds a ball into the shooter lane');
});
