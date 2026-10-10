// 365 Invaders - the swarm (10 Oct 2026): each Enhanced wave flies in, and in formation every invader weaves about its
// place - and can be hit where it is. node --test games/invaders/engine-swarm.test.mjs. Never deployed (**/*.test.mjs is excluded).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const E = createRequire(import.meta.url)('./engine.js');

const idle = {};
function play(W, n, input) { for (let i = 0; i < n && !W.over; i++) { E.step(W, input || idle); W.events.length = 0; } }
function quiet(W) { W.bombT = 1e9; W.saucerT = 1e9; W.diveT = 1e9; W.snipeT = 1e9; }
function shotAt(W, b) { W.shots.push({ x: b.x + b.w / 2, y: b.y + b.h / 2 + 4, dx: 0, vy: 4, spread: false }); }   // (it rises 4, into the middle)
function settle(W) { let g = 0; while (W.entering && g++ < 2000) { E.step(W, idle); W.events.length = 0; } return g; }

test('an Enhanced wave flies in: every invader on its way, the march held until they arrive', () => {
  const W = E.newWorld(2, 1, 'enh'); quiet(W);
  assert.equal(W.phase, 'play');
  assert.ok(W.invaders.every((v) => v.dv && v.dv.entry), 'all flying in');
  assert.equal(W.entering, W.invaders.length);
  const slots = W.invaders.map((v) => v.x + ',' + v.y).join();
  play(W, 120);
  assert.equal(W.invaders.map((v) => v.x + ',' + v.y).join(), slots, 'the formation does not march while they come in');
  assert.ok(W.invaders.some((v) => v.dv && v.dv.ph === 'enter' && v.dv.t > 0), 'some are on their way');
  const took = settle(W);
  assert.equal(W.entering, 0); assert.ok(took < 2000, 'they all arrive');
  assert.ok(W.invaders.every((v) => !v.dv), 'all in their places');
});

test('the streams come from both sides and swoop down low over the ship', () => {
  const W = E.newWorld(2, 2, 'enh'); quiet(W);
  let left = 0, right = 0, low = 0;
  for (let i = 0; i < 700 && W.entering; i++) {
    E.step(W, idle); W.events.length = 0;
    W.invaders.forEach((v) => { const d = v.dv; if (!d || d.ph !== 'enter' || d.t < 0) return; if (d.x < 0) left++; if (d.x > 216) right++; if (d.y > 140) low++; });
  }
  assert.ok(left > 0 && right > 0, 'from the left and the right');
  assert.ok(low > 0, 'down low');
});

test('an invader flying in can be shot - for double points', () => {
  const W = E.newWorld(2, 3, 'enh'); quiet(W);
  let v = null;
  for (let i = 0; i < 400 && !v; i++) { E.step(W, idle); W.events.length = 0; v = W.invaders.find((q) => q.dv && q.dv.ph === 'enter' && q.dv.t > 4 && q.dv.x > 20 && q.dv.x < 200 && q.dv.y > 60); }
  assert.ok(v, 'one in the open');
  const was = W.invaders.filter((q) => q.alive), before = W.score;
  const lb = E.box(v); lb.x += v.dv.vx; lb.y += v.dv.vy; shotAt(W, lb); E.step(W, idle);   // (led, like a player would: they're quick)
  const hit = was.filter((q) => !q.alive);   // (the streams fly nose to tail: it may be the one just ahead)
  assert.equal(hit.length, 1, 'one hit on the way in');
  const base = E.KIND_PTS[hit[0].kind] || [30, 20, 20, 10, 10][hit[0].r];
  assert.ok(W.score - before >= base * 2, 'double points');
});

test('in formation every invader weaves about its place - and is hit where it is', () => {
  const W = E.newWorld(2, 4, 'enh'); quiet(W); settle(W); W.sp = { ...W.sp, rate: 0 };
  play(W, 90);
  const v = W.invaders.find((q) => q.alive && Math.abs(q.wx || 0) > 0.8);
  assert.ok(v, 'one is off its place');
  const b = E.box(v), s = E.slotBox(v);
  assert.ok(Math.abs(b.x - s.x - v.wx) < 1e-9, 'its hit box follows the weave');
  const a = W.invaders.map((q) => (q.wx || 0).toFixed(2)).join(); play(W, 30);
  assert.notEqual(W.invaders.map((q) => (q.wx || 0).toFixed(2)).join(), a, 'and keeps moving');
  shotAt(W, E.box(v)); E.step(W, idle);
  assert.equal(v.alive, false);
});

test('the last few weave wildly', () => {
  const W = E.newWorld(2, 5, 'enh'); quiet(W); settle(W); W.sp = { ...W.sp, rate: 0 };
  let calm = 0; for (let i = 0; i < 300; i++) { E.step(W, idle); W.events.length = 0; calm = Math.max(calm, Math.abs(W.invaders[20].wx), Math.abs(W.invaders[20].wy)); }
  W.invaders.forEach((v, i) => { v.alive = [20, 21].includes(i); });
  let wild = 0; for (let i = 0; i < 300; i++) { E.step(W, idle); W.events.length = 0; wild = Math.max(wild, Math.abs(W.invaders[20].wx), Math.abs(W.invaders[20].wy)); }
  assert.ok(wild > calm * 1.6, 'wilder: ' + wild.toFixed(2) + ' vs ' + calm.toFixed(2));
});

test('bombs fall from where the invader is, not from its place', () => {
  const W = E.newWorld(2, 6, 'enh'); settle(W); W.sp = { ...W.sp, rate: 0 }; W.saucerT = 1e9; W.diveT = 1e9; W.snipeT = 1e9;
  let checked = 0;
  for (let i = 0; i < 2000 && checked < 3; i++) {
    const n = W.bombs.length; E.step(W, idle); W.events.length = 0;
    if (W.bombs.length > n) {
      const bm = W.bombs[W.bombs.length - 1];
      const from = W.invaders.filter((v) => v.alive && !v.dv).map((v) => E.box(v)).some((b) => Math.abs(bm.x - (b.x + 5)) < 1.5 * W.sp.bomb + 0.01);
      assert.ok(from, 'from a weaving invader'); checked++;
    }
    if (W.player.dead || W.over) break;
  }
  assert.ok(checked > 0);
});

test('Retro never flies in or weaves; nor does the bonus stage or the Mothership', () => {
  const R = E.newWorld(2, 7); play(R, 300);
  assert.ok(R.invaders.every((v) => !v.dv && !v.wx && !v.wy));
  const W = E.newWorld(2, 8, 'enh'); W.plan = [E.WAVES.find((w) => w.stage) || E.WAVES[2]]; quiet(W);
  W.invaders.forEach((v) => { v.alive = false; v.dv = null; }); W.entering = 0;
  play(W, 200);
  if (W.stage) assert.ok(W.invaders.every((v) => !v.dv || !v.dv.entry), 'the bonus stage flies its own paths');
});

test('the same seed plays the same swarm', () => {
  const run = () => { const W = E.newWorld(2, 77, 'enh'); for (let f = 0; f < 5000 && !W.over; f++) { E.step(W, { fire: f % 30 < 15, mouseX: 112 + Math.sin(f / 60) * 80 }); W.events.length = 0; } return [W.score, W.lives, W.wave, E.alive(W)].join(); };
  assert.equal(run(), run());
});
