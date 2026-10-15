// 365 Pinball Hero engine tests (node --test games/pinball/engine.test.mjs), 15 Oct 2026. Never deployed
// (**/*.test.mjs is excluded). They play the real engine in node: the world the other parts of the game rely on, a seeded
// game playing out the same every time, no ball ever getting stuck (a fixed batch of random balls and every named
// corner), every major shot being makeable from a flipper with a fair timing window, the plunger, and each feature
// (kickback, hangar, ramp return, orbits and the LOOP, the one-way gates, ball save, tilt, extra ball, bonus, game over).
// The sim tools in tools/pinball do the heavy lifting (and print the full maps); these keep a smaller, fixed batch.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const E = require('./engine.js');
const S = require('../../tools/pinball/sim.cjs');
const Traps = require('../../tools/pinball/traps.cjs');
const Shots = require('../../tools/pinball/shots.cjs');
const Plunger = require('../../tools/pinball/plunger.cjs');
const F = require('../../tools/pinball/features.cjs');

test('a new game: the world and the exports the rest of the game relies on', () => {
  const W = E.newWorld(2, 0, 365);
  for (const k of ['score', 'ball', 'total', 'over', 'demo', 'state', 'balls', 'flippers', 'plunger', 'drops', 'dropsDown', 'lanes',
    'skill', 'skillOpen', 'mult', 'bonus', 'kickback', 'saucerLit', 'saveT', 'tilted', 'spin', 'combo', 'lit', 'dmd', 'events', 'stats']) {
    assert.ok(k in W, 'world has ' + k);
  }
  assert.equal(W.state, 'play');
  assert.equal(W.balls.length, 1);
  const b = W.balls[0];
  for (const k of ['id', 'x', 'y', 'vx', 'vy', 'm', 's', 'z']) assert.ok(k in b, 'ball has ' + k);
  assert.ok(b.x > E.TABLE.shooter.x0, 'the first ball waits in the shooter lane');
  assert.equal(W.flippers.length, 2);
  for (const k of ['x', 'y', 'len', 'r0', 'r1', 'a', 'on']) assert.ok(k in W.flippers[0], 'flipper has ' + k);
  assert.deepEqual(W.drops, [true, true, true, true, true]);
  for (const k of ['bump', 'sling', 'drop', 'lane', 'kick', 'saucer', 'ramp', 'orbitL', 'orbitR', 'save']) assert.ok(k in W.lit, 'lit has ' + k);
  for (const k of ['W', 'H', 'BALL', 'SPEEDS', 'PTS', 'TABLE', 'RAMP', 'DROPS', 'GATES', 'WALLS', 'newWorld', 'step', 'hud', 'rampAt', 'inPocket', 'fmt']) {
    assert.ok(k in E, 'engine exports ' + k);
  }
  assert.equal(E.W, 270); assert.equal(E.H, 446);
  assert.equal(E.newWorld(1, 0, 1).total, 5, 'Gentle has five balls');
  assert.equal(E.newWorld(9, 0, 1).speed, 1, 'an unknown speed falls back to Gentle');
  assert.deepEqual(E.hud(W), { score: 0, lives: 3, wave: 1 });
});

test('the same seed and the same presses play out exactly the same (and another seed does not)', () => {
  function game(seed) {
    const W = E.newWorld(2, 0, seed), drive = S.bot(4242), log = [];
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
  // the seed is what the machine chooses for itself (the skill-shot lane each ball); a game where the player never makes
  // a skill shot can play out the same on two seeds, so compare what the seeds choose
  const lanes = (seed) => Array.from({ length: 12 }, (_, i) => E.newWorld(2, 0, seed + i * 1000).skill).join('');
  assert.notEqual(lanes(7), lanes(8));
});

test('no ball gets stuck: a fixed batch of 120 random balls, 20 seconds each, with the auto-flipper bot', () => {
  let searches = 0;
  const problems = [];
  for (let i = 0; i < 120; i++) {
    const o = Traps.oneBall(i * 37 + 5, 20, false);
    searches += o.searches;
    o.traps.forEach((t) => { if (t.type !== 'quiet') problems.push(i + ':' + t.type + '@' + t.x + ',' + t.y + ' ' + t.what); });
    if (o.drainKind) assert.notEqual(o.drainKind, 'shooter', 'never drains down the shooter lane');
  }
  assert.deepEqual(problems, [], 'no ball rests, circles, wedges, tunnels or leaves the table');
  assert.equal(searches, 0, 'the ball search never has to fire');
});

test('no ball rests in any named corner (a slow ball let go anywhere near one always leaves it)', () => {
  const stuck = [];
  for (const [name, c] of Object.entries(Traps.CORNERS)) {
    for (const held of [false, true]) {
      for (let dx = -12; dx <= 12; dx += 4) for (let dy = -12; dy <= 12; dy += 4) {
        const W = S.world(2, 7, { kickback: false });
        const x = c[0] + dx, y = c[1] + dy;
        if (!S.freeSpot(W, x, y)) continue;
        S.place(W, x, y, 0, 0);
        let still = 0, rest = null;
        S.run(W, 60 * 6, () => ({ left: held, right: held }), (W2) => {
          const b = W2.balls[0]; if (!b) return false;
          if (W2.events.includes('search')) { rest = b; return false; }
          if (b.m === 'free' && !(held && b.y > 360) && Math.abs(b.vx) + Math.abs(b.vy) < 20) still++; else still = 0;
          if (still > 120) { rest = b; return false; }
        });
        if (rest) stuck.push(name + (held ? ' (flippers up)' : '') + ' from ' + x + ',' + y);
      }
    }
  }
  assert.deepEqual(stuck, []);
});

test('every major shot is makeable from a flipper with a timing window of at least 15 ms', () => {
  // the cradle: trap the ball, let go, flip again after a delay (swept in 1/600 s)
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
  // ... but not trivial: most flips that head for the ramp don't make it
  const rampTotal = (right['RAMP made'] || { total: 0 }).total, all = 700;
  assert.ok(rampTotal < all * 0.15, 'the ramp is made from only ' + (100 * rampTotal / all).toFixed(0) + '% of cradle timings');
});

test('the plunger: the weakest pull falls back, a tap is the medium shot, the skill lanes need some pull, full pull goes round', () => {
  for (const sp of [1, 2, 3]) {
    assert.match(Plunger.launch(sp, 8).res, /fell back/, 'a weak pull falls back to the plunger (speed ' + sp + ')');
    assert.match(Plunger.launch(sp, 2).res, /right orbit|bumper|down the playfield/, 'a tap fires the medium shot (speed ' + sp + ')');
    assert.match(Plunger.launch(sp, 60).res, /round the arch/, 'a full pull goes round the arch (speed ' + sp + ')');
  }
  const lanes = new Set();
  for (let f = 20; f <= 45; f++) { const r = Plunger.launch(2, f).res; const m = r.match(/lane (\d)/); if (m) lanes.add(m[1]); }
  assert.deepEqual([...lanes].sort(), ['0', '1', '2'], 'all three top lanes can be reached with some pull');
  // each lane is more than a single frame of hold: the skill shot is a skill, not luck
  let run = 0, best = 0, last = '';
  for (let f = 20; f <= 45; f++) { const r = Plunger.launch(2, f).res; run = r === last ? run + 1 : 1; last = r; if (/lane/.test(r)) best = Math.max(best, run); }
  assert.ok(best >= 3, 'a top lane holds for ' + best + ' frames of pull');
});

for (const name of ['kickback', 'hangar', 'ramp', 'orbits', 'gates', 'save', 'tilt', 'extra', 'bonus', 'over']) {
  test('feature: ' + name, () => {
    for (const sp of [1, 2, 3]) {
      const r = F.checks[name](sp);
      assert.ok(r.ok, E.SPEEDS[sp].name + ': ' + r.detail);
    }
  });
}

test('the speeds are the same table in slower and faster motion', () => {
  const lane = (sp) => Plunger.launch(sp, 32).res;
  assert.equal(lane(1), lane(2));
  assert.equal(lane(3), lane(2));
  // and Gentle really is slower: the same roll down the table takes longer
  const t = (sp) => { const W = S.world(sp, 1, {}); S.place(W, 125, 230, 0, 0); let i = 0; while (W.balls[0].y < 380 && i < 600) { E.step(W, {}); i++; } return i; };
  assert.ok(t(1) > t(2) && t(2) > t(3));
});
