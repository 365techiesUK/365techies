// 365 Pinball Hero - INTO THE VOLCANO tests (descent.js + tables/chamber.js). node --test games/pinball/descent.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const E = require('./engine.js');
const PD = require('./descent.js');
const P = require('./pilot.js');

const SPEED = 2;
function surface(seed, opt) {
  const W = E.newWorld(SPEED, 0, seed || 7, 'ember');
  if (opt && opt.mod) W.mod = opt.mod;
  // the ball in play on the left flipper's side, not in the shooter lane
  const b = W.balls[0]; b.x = 100; b.y = 380; b.vx = 0; b.vy = 0; b.launched = true; W.skillOpen = false; W.saveArmed = false;
  return W;
}
// a shot straight into a toy: put the ball just outside it, moving in
function shoot(W, x, y, nx, ny, r, v) {
  const b = W.balls.find((o) => o.m === 'free') || E.addBall(W, x, y);
  b.x = x + nx * r; b.y = y + ny * r; b.vx = -nx * v; b.vy = -ny * v; b.launched = true; b.px = b.x; b.py = b.y;
  return b;
}
function diveNow(W) {   // DIVE lit and a firm shot into the crater's mouth
  const V = E.table(W.tableId).T.volcano, l = Math.hypot(V.mouth[0], V.mouth[1]);
  E.api.craterLit(W, 'dive', true);
  shoot(W, V.x, V.y, V.mouth[0] / l, V.mouth[1] / l, V.r + 8, 600);
}
function evNames(W) { return W.events.map((e) => (typeof e === 'string' ? e : e && (e.sfx || (e.say ? 'say' : '')))); }
// step the active world with the pilot (or no buttons) until D.update says something, or n steps
function play(D, W, n, drive, seen) {
  for (let i = 0; i < n; i++) {
    const A = D.active(W);
    E.step(A, drive ? P.input(A) : {});
    if (seen) evNames(A).forEach((e) => { seen[e] = (seen[e] || 0) + 1; });
    A.events.length = 0;
    const t = D.update(W);
    if (t) return { t, i };
  }
  return { t: null, i: n };
}

test('the chamber is registered as a level with the contract fields', () => {
  assert.ok(E.TABLES.chamber, 'PinTables.chamber in the registry');
  const T = E.table('chamber').T;
  assert.ok(T.level, 'T.level');
  assert.equal(T.serve.carry in T.carries, true, 'T.serve names a carry');
  assert.ok(T.serve.hold >= 50 && T.serve.hold <= 70, 'a held start of about 1 s');
  assert.ok(T.aim && T.aim[1] && T.aim[2] && T.aim[3], 'T.aim for every speed');
  const Te = E.table('ember').T;
  assert.deepEqual(T.flippers, Te.flippers, 'the same flippers as Ember Peak');
  assert.deepEqual(T.slings, Te.slings, 'the same slingshots');
  assert.equal(typeof PD.create, 'function');
  assert.ok(E.pluginUrls().indexOf('descent.js') >= 0, 'the plugin is registered with its url');
});

test('a dive cuts down at once, carries the score and W.mod, and starts with a held ball', () => {
  const D = PD.create(E, { speed: SPEED, seed: 3 });
  const mod = { x: { bumper: 2 }, press: 1 };
  const S = surface(11, { mod });
  S.score = 1234560;
  D.update(S);
  diveNow(S);
  let r = null;
  for (let i = 0; i < 30 && !r; i++) { E.step(D.active(S), {}); r = D.update(S); }
  assert.equal(r, 'down');
  const C = D.active(S);
  assert.notEqual(C, S);
  assert.equal(C.tableId, 'chamber');
  assert.equal(C.score, S.score, 'the score goes down exactly');
  assert.ok(S.score >= 1234560 + 500000, '(the crater shot scored on the surface first)');
  assert.deepEqual(C.mod, mod, 'W.mod is passed down');
  assert.notEqual(C.mod, S.mod, '(a copy)');
  assert.equal(C.balls.length, 1);
  assert.equal(C.balls[0].at, 'serve', 'held at the entry');
  assert.equal(S.dive.held, true, 'the surface ball waits in the DIVE hold');
  const st = D.status();
  assert.equal(st.depth, 1); assert.equal(st.name, 'MAGMA CHAMBER'); assert.equal(st.cleared, false);
  assert.equal(st.levels[0], 'SURFACE');
  // the held start: about a second, and the lava clock does not run during it
  const clock0 = C.descent.clock;
  for (let i = 0; i < 55; i++) { E.step(C, {}); C.events.length = 0; }
  assert.equal(C.balls[0].at, 'serve', 'still held after 55 steps');
  assert.equal(C.descent.clock, clock0, 'no lava clock during the held start');
  assert.ok(C.next && C.next.shot === 'vents' && C.next.clock === 45, 'W.next below: light the vents, 45 s at Classic');
});

test('a round trip is deterministic and the score is carried exactly both ways', () => {
  function trip() {
    const D = PD.create(E, { speed: SPEED, seed: 5 });
    const S = surface(21);
    D.update(S);
    diveNow(S);
    let r = play(D, S, 40, false);
    assert.equal(r.t, 'down');
    const C = D.active(S);
    r = play(D, S, 60 * 70, true);   // the pilot plays the chamber until it ends (drain, lava or ascend)
    assert.equal(r.t, 'up');
    assert.equal(D.active(S), S, 'back on the surface');
    assert.equal(S.score, C.score, 'the score comes back up exactly');
    return { score: S.score, frames: C.frame, last: S.descent.last, x: S.balls.map((b) => [b.x, b.y, b.m]) };
  }
  const a = trip(), b = trip();
  assert.deepEqual(a, b, 'the same trip twice is identical');
  assert.ok(a.score > 0);
});

test('no ball is lost below: a drain goes back up the sky carry into the left inlane', () => {
  const D = PD.create(E, { speed: SPEED });
  const S = surface(31);
  D.update(S);
  diveNow(S);
  play(D, S, 40, false);
  const C = D.active(S);
  const ball = S.ball, total = S.total;
  const r = play(D, S, 60 * 30, false);   // no buttons: the ball drains below
  assert.equal(r.t, 'up');
  assert.equal(C.over, true);
  assert.equal(S.descent.last.how, 'drain');
  assert.equal(S.ball, ball, 'no ball used');
  assert.equal(S.total, total);
  assert.equal(S.balls.length, 1);
  E.step(S, {}); S.events.length = 0;
  assert.equal(S.dive.held, false, 'the held ball has been let go');
  // it rides the sky carry and comes off into the left inlane, then plays on
  let free = null;
  for (let i = 0; i < 200 && !free; i++) { E.step(S, {}); S.events.length = 0; const b = S.balls[0]; if (b && b.m === 'free') free = [b.x, b.y]; }
  assert.ok(free, 'the ball is back in play');
  assert.ok(free[0] < 60 && free[1] > 300, 'in the left inlane (' + free + ')');
  assert.equal(S.state, 'play');
});

test('the lava clock ends through a drain (THE LAVA RISES)', () => {
  const D = PD.create(E, { speed: SPEED });
  const S = surface(41);
  D.update(S);
  diveNow(S);
  play(D, S, 40, false);
  const C = D.active(S);
  for (let i = 0; i < 200 && !C.balls.every((b) => b.m === 'free'); i++) { E.step(C, {}); C.events.length = 0; }
  C.descent.clock = 5;
  const seen = {};
  const r = play(D, S, 60 * 40, true, seen);   // even the pilot cannot keep it: the flippers are dead
  assert.equal(seen.lavarise, 1, "'lavarise' once");
  assert.equal(r.t, 'up');
  assert.equal(S.descent.last.how, 'lava');
  assert.ok(C.tilted, 'the flippers died');
});

test('no dive during multiball: DIVE waits until one ball is left', () => {
  const D = PD.create(E, { speed: SPEED });
  const S = surface(51);
  D.update(S);
  E.api.multiball(S, 2, { save: 0 });
  for (let i = 0; i < 120 && S.feed > 0; i++) { E.step(S, {}); S.events.length = 0; }
  assert.ok(S.balls.length >= 2, 'two balls in play');
  diveNow(S);
  const seen = {};
  let went = null;
  for (let i = 0; i < 20; i++) { E.step(S, {}); evNames(S).forEach((e) => { seen[e] = 1; }); S.events.length = 0; if (D.update(S)) went = true; }
  assert.equal(went, null, 'no cut while two balls are in play');
  assert.equal(D.active(S), S);
  assert.equal(S.dive.held, false, 'the ball was let straight back out');
  assert.equal(S.crater.dive, true, 'DIVE is still lit');
  assert.ok(!seen.dive, "no 'dive' event");
});

test('the chamber goal: three vents, the core, then ASCEND through the scoop', () => {
  const D = PD.create(E, { speed: SPEED });
  const S = surface(61);   // a Classic world (no W.mod): the clear pays 10,000,000
  D.update(S);
  diveNow(S);
  play(D, S, 40, false);
  const C = D.active(S), T = E.table('chamber').T;
  for (let i = 0; i < 200 && !C.balls.every((b) => b.m === 'free'); i++) { E.step(C, {}); C.events.length = 0; }
  const seen = {};
  function hit(x, y, r) {   // a firm shot up into a toy from below
    shoot(C, x, y, 0, 1, r + 8, 700);
    for (let i = 0; i < 4; i++) { E.step(C, {}); evNames(C).forEach((e) => { seen[e] = (seen[e] || 0) + 1; }); C.events.length = 0; if (D.update(S)) return true; }
    return false;
  }
  // the core before the vents: nothing
  C.toys.crabs[0].stun = 0;
  hit(C.toys.crabs[0].x, C.toys.crabs[0].y, T.crabs[0].r + 7);
  assert.equal(C.descent.cleared, false);
  assert.equal(T.ventHits, 2, 'two hits light a vent');
  T.bumpers.forEach((bm, i) => {
    hit(bm[0], bm[1], bm[2] + 7);
    assert.ok(C.descent.heat[i] >= 1, 'a hit heats vent ' + i);
    for (let k = 0; k < 4 && !C.descent.vents[i]; k++) hit(bm[0], bm[1], bm[2] + 7);
  });
  assert.equal(C.descent.lit, 3, 'three vents lit');
  assert.ok(seen.ventheat >= 1 && seen.vent === 3, "'ventheat' and three 'vent' events");
  assert.equal(C.next.shot, 'core');
  const before = C.score;
  assert.equal(T.coreHits, 2, 'two hits break the lit core');
  C.toys.crabs[0].stun = 0;
  hit(C.toys.crabs[0].x, C.toys.crabs[0].y, T.crabs[0].r + 7);
  assert.equal(C.descent.cleared, false, 'one hit cracks it');
  assert.equal(seen.corecrack, 1);
  assert.equal(C.next.text, 'HIT THE CORE AGAIN');
  C.toys.crabs[0].stun = 0;
  hit(C.toys.crabs[0].x, C.toys.crabs[0].y, T.crabs[0].r + 7);
  assert.equal(C.descent.cleared, true, 'CHAMBER CLEARED');
  assert.equal(seen.chamberclear, 1);
  assert.ok(C.score - before >= 10000000, 'the clear pays 10,000,000 in Classic');
  assert.equal(C.crater.boss, true, 'ASCEND lit at the scoop');
  assert.equal(C.next.shot, 'scoop');
  const V = T.volcano;
  shoot(C, V.x, V.y, 0, 1, V.r + 8, 600);
  let r = null;
  for (let i = 0; i < 6 && !r; i++) { E.step(C, {}); evNames(C).forEach((e) => { seen[e] = (seen[e] || 0) + 1; }); C.events.length = 0; r = D.update(S); }
  assert.equal(r, 'up', 'the scoop takes the ball home at once');
  assert.equal(seen.ascend, 1);
  assert.equal(S.descent.last.how, 'ascend');
  assert.equal(S.descent.clears, 1);
  assert.equal(S.score, C.score);
  assert.equal(D.status().depth, 0);
});

test('Ember Run: a clear pays no 10,000,000 (run.js gives the ball) and multipliers apply below', () => {
  const D = PD.create(E, { speed: SPEED });
  const S = surface(71, { mod: { x: { vent: 2 } } });
  D.update(S);
  diveNow(S);
  play(D, S, 40, false);
  const C = D.active(S), T = E.table('chamber').T;
  for (let i = 0; i < 200 && !C.balls.every((b) => b.m === 'free'); i++) { E.step(C, {}); C.events.length = 0; }
  const s0 = C.score;
  for (let k = 0; k < 6 && !C.descent.vents[0]; k++) {
    shoot(C, T.bumpers[0][0], T.bumpers[0][1], 0, 1, T.bumpers[0][2] + 15, 700);
    for (let i = 0; i < 4; i++) { E.step(C, {}); C.events.length = 0; }
  }
  assert.ok(C.descent.vents[0], 'vent 0 lit');
  assert.ok(C.score - s0 >= 2 * T.points.vent, 'W.mod.x.vent doubles the vent award');
  C.descent.lit = 3; C.descent.vents = [true, true, true]; C.descent.core = C.descent.coreNeed - 1;
  C.toys.crabs[0].stun = 0;
  const s1 = C.score;
  shoot(C, C.toys.crabs[0].x, C.toys.crabs[0].y, 0, 1, T.crabs[0].r + 15, 700);
  for (let i = 0; i < 4; i++) { E.step(C, {}); C.events.length = 0; }
  assert.equal(C.descent.cleared, true);
  assert.ok(C.score - s1 < 10000000, 'no 10M in a run');
});

test('the plugin leaves a world without it alone, and E.clone copies a world with a level below', () => {
  const D = PD.create(E, { speed: SPEED });
  const S = surface(81);
  delete S.descent;
  D.update(S);
  assert.ok(S.descent && S.descent.below === null);
  diveNow(S);
  play(D, S, 40, false);
  const K = E.clone(S);
  assert.equal(K.descent.below.tableId, 'chamber');
  assert.notEqual(K.descent.below, S.descent.below);
  const C = S.descent.below, C2 = K.descent.below;
  for (let i = 0; i < 600; i++) { E.step(C, P.input(C)); E.step(C2, P.input(C2)); C.events.length = 0; C2.events.length = 0; }
  assert.equal(C.score, C2.score); assert.equal(C.frame, C2.frame);
  assert.deepEqual(C.balls.map((b) => [b.x, b.y]), C2.balls.map((b) => [b.x, b.y]));
});
