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
  assert.deepEqual(Object.keys(E.TABLES).sort(), ['ember', 'orbit']);
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
test('ember: the table, its storeys and toys, and the world the pictures read', () => {
  S.use('ember');
  const T = E.table('ember').T, W = E.newWorld(2, 0, 365);
  assert.equal(T.W, 270); assert.ok(T.H >= 620 && T.H <= 700, 'taller than one screen: ' + T.H);
  assert.equal(W.flippers.length, 4);
  assert.deepEqual(W.flippers.map((f) => f.side), [-1, 1, -1, 1]);
  assert.deepEqual(W.flippers.map((f) => f.storey), [0, 0, 1, 1]);
  assert.equal(W.storeys.length, 2);
  for (const s of W.storeys) for (const k of ['id', 'flippers', 'x0', 'x1', 'y0', 'y1', 'approach']) assert.ok(k in s, 'storey has ' + k);
  assert.ok(W.balls[0].x > T.shooter.x0 && W.balls[0].y > W.storeys[0].approach, 'the first ball waits at the foot of the full-height shooter lane');
  const V = W.toys.volcano;
  for (const k of ['pressure', 'rise', 'hold', 'release', 'land', 'carry', 'busy']) assert.ok(k in V, 'volcano has ' + k);
  for (const k of ['st', 't', 'x', 'y']) assert.ok(k in W.toys.geyser, 'geyser has ' + k);
  assert.equal(W.toys.crabs.length, 3);
  for (const c of W.toys.crabs) for (const k of ['x', 'y', 'vx', 'vy', 'stun', 'hits']) assert.ok(k in c, 'crab has ' + k);
  assert.equal(W.toys.lava.gates.length, 2);
  for (const k of ['open', 't', 'gates']) assert.ok(k in W.toys.lava, 'lava has ' + k);
  for (const k of ['pending', 't', 'gx']) assert.ok(k in W.toys.quake, 'quake has ' + k);
  for (const k of ['crater', 'geyser', 'quake', 'crab', 'lava']) assert.ok(k in W.lit, 'lit has ' + k);
  // no crab path and no geyser inside an approach zone
  const zone = (x, y) => E.inApproach(W, { m: 'free', x, y });
  T.crabs.forEach((c, i) => c.path.forEach((p) => assert.equal(zone(p[0], p[1] + c.r), -1, 'crab ' + i + ' stays out of the approach zones')));
  assert.equal(zone(T.geyser.x, T.geyser.y + T.geyser.r), -1, 'the geyser is above the summit approach line');
  // scores feel like millions
  assert.ok(E.table('ember').PTS.crater >= 100000 && E.table('ember').PTS.skill >= 1000000);
});

test('ember: the same seed and the same presses play out exactly the same (and another seed does not)', () => sameGame('ember'));

test('ember: no ball gets stuck: a fixed batch of 200 random balls, 20 seconds each (gates up, quakes and all)', () => noTraps('ember', 200, 41));

test('ember: no ball rests in any named corner', () => corners('ember', 6));

test('ember: every major shot is makeable from some flipper with a timing window of at least 15 ms', () => {
  S.use('ember');
  const best = (name, ...maps) => Math.max(0, ...maps.map((m) => (m[name] ? m[name].best : 0)));
  const shoreL = Shots.windows(Shots.sweep(2, 0, 'cradle', false, 0, 700));
  const shoreR = Shots.windows(Shots.sweep(2, 1, 'cradle', false, 0, 700));
  const shoreRin = Shots.windows(Shots.sweep(2, 1, 'inlane', false, 300, 1000));
  const sumR = Shots.windows(Shots.sweep(2, 3, 'cradle', true, 0, 700, { lava: true }));
  const sumL = Shots.windows(Shots.sweep(2, 2, 'cradle', true, 0, 700, { lava: true }));
  const sumRup = Shots.windows(Shots.sweep(2, 3, 'cradle', false, 0, 700));
  const want = { 'orbit R': [shoreL], 'orbit L': [shoreR], 'drop target': [shoreL, shoreR], 'RAMP made': [shoreR, shoreRin], CRATER: [sumRup, sumR], 'lava L': [sumR, sumL], 'lava R': [sumL, sumR], crab: [sumL, sumR, shoreL, shoreR] };
  for (const [shot, maps] of Object.entries(want)) assert.ok(best(shot, ...maps) >= 15, shot + ': ' + best(shot, ...maps).toFixed(1) + ' ms');
  // the crater is a skill shot, not a gimme
  assert.ok(best('CRATER', sumRup) <= 60, 'the crater window is ' + best('CRATER', sumRup).toFixed(1) + ' ms');
  // and the lava lanes are made from the far summit flipper, not only lobbed in from their own side
  assert.ok(best('lava L', sumR) >= 15 && best('lava R', sumL) >= 15, 'lava lanes across: ' + best('lava L', sumR).toFixed(1) + ' / ' + best('lava R', sumL).toFixed(1) + ' ms');
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
  assert.ok(t.craters > 0 && t.ramps > 0 && t.orbits > 0 && t.crabs > 0, 'the bot meets the toys');
});
