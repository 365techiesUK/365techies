// 365 Pinball Hero - tests for games/pinball/lamps.js (15 Oct 2026), never deployed.
//   node --test tools/pinball/art-lamps.test.cjs
// The inserts' list (worked out from the table data: on the table, clear of the walls, not on top of each other) and
// level() for a few states of the world (it only reads the world; tilt and game over turn everything off).
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../games/pinball/engine.js');
const L = require('../../games/pinball/lamps.js');
const T = E.TABLE;

const idx = (id) => { const i = L.byId[id]; assert.ok(i != null, 'no lamp ' + id); return i; };
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2));
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

test('the list: about 40 inserts, each complete and on the table', () => {
  assert.ok(L.list.length >= 30 && L.list.length <= 48, 'count ' + L.list.length);
  const ids = new Set();
  for (const l of L.list) {
    assert.ok(!ids.has(l.id), 'duplicate ' + l.id); ids.add(l.id);
    assert.ok(['circle', 'arrow', 'triangle', 'rect', 'oval', 'text'].includes(l.shape), l.id + ' shape');
    assert.match(l.color, /^#[0-9a-f]{6}$/i, l.id + ' colour');
    for (const k of ['x', 'y', 'w', 'h', 'rot']) assert.ok(Number.isFinite(l[k]), l.id + ' ' + k);
    assert.ok(l.x > 6 && l.x < T.shooter.x0 && l.y > 0 && l.y < T.H, l.id + ' off the playfield');
    assert.equal(L.list[l.i], l);
    if (l.shape === 'text') assert.ok(l.text, l.id + ' needs its text');
  }
  for (const g of ['lanes', 'skill', 'drops', 'hangar', 'ramp', 'orbitL', 'orbitR', 'kick', 'save', 'mult', 'hero', 'bumpers']) assert.ok(L.groups[g], 'group ' + g);
  assert.equal(L.groups.drops.length, 5); assert.equal(L.groups.hero.length, 5); assert.equal(L.groups.mult.length, 4);
});

test('the inserts sit clear of the walls, posts, bumpers and each other', () => {
  const walls = E.WALLS.concat(E.DROPS);
  for (const l of L.list) {
    const r = 0.5 * Math.min(l.w, l.h);
    for (const w of walls) assert.ok(segDist(l.x, l.y, w.ax, w.ay, w.bx, w.by) > w.r + r, l.id + ' is on a wall');
    for (const p of T.posts) assert.ok(Math.hypot(l.x - p[0], l.y - p[1]) > p[2] + r, l.id + ' is on a post');
    for (const b of T.bumpers) assert.ok(Math.hypot(l.x - b[0], l.y - b[1]) > b[2] + r, l.id + ' is under a bumper');
  }
  for (let i = 0; i < L.list.length; i++) for (let j = i + 1; j < L.list.length; j++) {
    const a = L.list[i], b = L.list[j];
    assert.ok(Math.hypot(a.x - b.x, a.y - b.y) > 0.4 * (Math.max(a.w, a.h) + Math.max(b.w, b.h)), a.id + ' overlaps ' + b.id);
  }
});

test('the shots point the right way: up the ramp, into the hangar, up each orbit', () => {
  const dir = (id) => { const l = L.list[idx(id)]; return [Math.sin(l.rot), -Math.cos(l.rot)]; };
  assert.ok(dir('ramp')[1] < -0.99);
  const h = L.list[idx('hangar')], hd = dir('hangar'), sau = T.saucer;
  const toSaucer = [sau.x - h.x, sau.y - h.y], n = Math.hypot(toSaucer[0], toSaucer[1]);
  assert.ok((hd[0] * toSaucer[0] + hd[1] * toSaucer[1]) / n > 0.8, 'hangar arrow points at the saucer');
  assert.ok(dir('orbitL')[0] < 0 && dir('orbitL')[1] < 0, 'left orbit: up and left');
  assert.ok(dir('orbitR')[0] > 0 && dir('orbitR')[1] < 0, 'right orbit: up and right');
  assert.ok(dir('skill0')[1] > 0.99, 'skill arrows point down into the lanes');
});

test('level(): a new ball, a busy moment, tilt and game over', () => {
  const W = E.newWorld(2, 0, 365);
  const before = JSON.stringify(W);
  let v = L.level(W, 0, 'play');
  assert.equal(v.length, L.list.length);
  assert.equal(JSON.stringify(W), before, 'level() must not change the world');
  for (const x of v) assert.ok(x >= 0 && x <= 1);
  assert.equal(v[idx('kick')], 1, 'kickback lit');
  assert.equal(v[idx('skill' + W.skill)], 1, 'the skill lane blinks (on at t=0)');
  assert.equal(L.level(W, 160, 'play')[idx('skill' + W.skill)], 0, '... and off a beat later');
  assert.equal(v[idx('save')], 0, 'no ball save before the launch');
  for (const id of ['mult2', 'mult3', 'drop0', 'lane0', 'hero0']) assert.equal(v[idx(id)], 0, id + ' off');
  // a busy moment
  Object.assign(W, { lanes: [true, false, false], drops: [false, true, true, true, false], saucerLit: true, mult: 3, saveT: 500, comboT: 100, combo: 2, orbitFrom: 'L' });
  W.lit.drop = [0, 0, 0, 0, 5];
  v = L.level(W, 0, 'play');
  assert.equal(v[idx('lane0')], 1); assert.equal(v[idx('lane1')], 0);
  assert.equal(v[idx('drop0')], 1); assert.equal(v[idx('drop1')], 0); assert.equal(v[idx('drop4')], 1, 'a target just hit flashes (on at t=0)');
  assert.equal(v[idx('mult2')], 1); assert.equal(v[idx('mult3')], 1); assert.equal(v[idx('mult4')], 0);
  assert.equal(v[idx('save')], 1);
  assert.equal(v[idx('hangar')], 1, 'hangar lit'); assert.equal(v[idx('ramp')], 1, 'combo: ramp lit'); assert.equal(v[idx('orbitR')], 1, 'loop waiting: orbits lit');
  assert.equal(v[idx('ramp.p2')] + v[idx('ramp.p1')] >= 2, true, 'combo x2: two ramp lamps');
  // shots that aren't lit show only a dim, slow chase
  const W2 = E.newWorld(2, 0, 365);
  for (let t = 0; t < 3000; t += 50) { const u = L.level(W2, t, 'play'); assert.ok(u[idx('ramp')] <= 0.5 && u[idx('hangar.p0')] <= 0.5); }
  // tilt, game over and the 'over' card: all off
  for (const st of [{ tilted: true }, { over: true }]) {
    const u = L.level(Object.assign(E.newWorld(2, 0, 365), st, { mult: 4, saveT: 300 }), 0, 'play');
    assert.equal(Math.max(...u), 0, JSON.stringify(st));
  }
  assert.equal(Math.max(...L.level(W, 0, 'over')), 0);
});

test('level(): the attract show moves up the table and fills a reused array', () => {
  const out = new Float32Array(L.list.length);
  const centre = (t) => { const v = L.level(null, t, 'title', out); let s = 0, n = 0; L.list.forEach((l, i) => { s += v[i] * l.y; n += v[i]; }); return n ? s / n : NaN; };
  assert.equal(L.level(null, 100, 'title', out), out);
  // early in a wave the lit lamps are low on the table, later higher up
  assert.ok(centre(350) > centre(900), 'the wave sweeps up: ' + centre(350).toFixed(0) + ' -> ' + centre(900).toFixed(0));
  let lit = 0;
  for (let t = 0; t < 16000; t += 100) lit += L.level(null, t, 'title', out).reduce((a, b) => a + (b > 0.5 ? 1 : 0), 0);
  assert.ok(lit > 400, 'the show lights lamps: ' + lit);
});

test('level() is cheap', () => {
  const W = E.newWorld(2, 0, 365), out = new Float32Array(L.list.length), t0 = process.hrtime.bigint();
  for (let i = 0; i < 20000; i++) L.level(W, i * 16, i % 5 ? 'play' : 'title', out);
  const us = Number(process.hrtime.bigint() - t0) / 1000 / 20000;
  assert.ok(us < 20, us.toFixed(2) + ' us a call');
  console.log('level(): ' + us.toFixed(2) + ' us a call');
});
