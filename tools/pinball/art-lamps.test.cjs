// 365 Pinball Hero - tests for games/pinball/lamps.js (15 Oct 2026, v2: about 85 inserts; the old table's set), never deployed.
//   node --test tools/pinball/art-lamps.test.cjs
// The inserts' list (worked out from the table data: on the table, clear of the walls, gates, posts, bumpers and
// flippers, not on top of each other or of their printed labels) and level() for a few states of the world (it only
// reads the world; tilt and game over turn everything off; the lamps never stand still).
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../games/pinball/engine.js');
const Lm = require('../../games/pinball/lamps.js');
const L = Lm.forTable('orbit');   // the old space table's set (Ember Peak: the tests at the end)
const T = E.TABLE;

const idx = (id) => { const i = L.byId[id]; assert.ok(i != null, 'no lamp ' + id); return i; };
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2));
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}
// a footprint: an oriented box (centre, half sizes, its axes). Lamps: w across, h along rot (0 = up the table).
// Labels: rot 0 reads left to right; their length is estimated from the font (heavy capitals ~0.78 of the size each).
function boxOf(x, y, hw, hh, ux, uy) { return { x, y, hw, hh, u: [ux, uy], v: [-uy, ux] }; }
const lampBox = (l) => boxOf(l.x, l.y, l.w / 2, l.h / 2, Math.cos(l.rot), Math.sin(l.rot));
const tagBox = (g) => boxOf(g.x, g.y, g.text.length * g.size * 0.39, g.size * 0.5, Math.cos(g.rot), Math.sin(g.rot));
function corners(b) {
  const out = [];
  for (const [s, t] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) out.push([b.x + b.u[0] * b.hw * s + b.v[0] * b.hh * t, b.y + b.u[1] * b.hw * s + b.v[1] * b.hh * t]);
  return out;
}
function outline(b, step) {   // points round the box's edge
  const c = corners(b), pts = [];
  for (let i = 0; i < 4; i++) {
    const a = c[i], d = c[(i + 1) % 4], n = Math.max(1, Math.ceil(Math.hypot(d[0] - a[0], d[1] - a[1]) / (step || 0.5)));
    for (let k = 0; k < n; k++) pts.push([a[0] + (d[0] - a[0]) * k / n, a[1] + (d[1] - a[1]) * k / n]);
  }
  return pts;
}
function inside(b, px, py) { const dx = px - b.x, dy = py - b.y; return Math.abs(dx * b.u[0] + dy * b.u[1]) <= b.hw && Math.abs(dx * b.v[0] + dy * b.v[1]) <= b.hh; }
function gap(a, b) {   // separating-axis test: the clear gap between two boxes (negative = overlapping)
  let best = -Infinity;
  for (const ax of [a.u, a.v, b.u, b.v]) {
    const pa = a.x * ax[0] + a.y * ax[1], pb = b.x * ax[0] + b.y * ax[1];
    const ra = a.hw * Math.abs(a.u[0] * ax[0] + a.u[1] * ax[1]) + a.hh * Math.abs(a.v[0] * ax[0] + a.v[1] * ax[1]);
    const rb = b.hw * Math.abs(b.u[0] * ax[0] + b.u[1] * ax[1]) + b.hh * Math.abs(b.v[0] * ax[0] + b.v[1] * ax[1]);
    best = Math.max(best, Math.abs(pa - pb) - ra - rb);
  }
  return best;
}
function segClear(b, s) {   // the clear gap between a box and a capsule [ax, ay, bx, by, r]
  let d = Infinity;
  for (const p of outline(b)) d = Math.min(d, segDist(p[0], p[1], s[0], s[1], s[2], s[3]));
  const n = Math.ceil(Math.hypot(s[2] - s[0], s[3] - s[1])) + 1;
  for (let k = 0; k <= n; k++) if (inside(b, s[0] + (s[2] - s[0]) * k / n, s[1] + (s[3] - s[1]) * k / n)) return -1;
  return d - s[4];
}
// everything a lamp must keep clear of, as capsules
const obstacles = [];
for (const w of E.WALLS.concat(E.DROPS, E.GATES)) obstacles.push(['wall', [w.ax, w.ay, w.bx, w.by, w.r]]);
for (const p of T.posts) obstacles.push(['post', [p[0], p[1], p[0], p[1], p[2]]]);
for (const b of T.bumpers) obstacles.push(['bumper', [b[0], b[1], b[0], b[1], b[2] + 1.8]]);   // the bumper's base
for (const f of T.flippers) for (const a of [f.rest, f.up]) {   // the flipper down and up (a tapered bat: 4 pieces; it only
  const c = Math.cos(a) * f.len, s = Math.sin(a) * f.len;      // passes over the inserts between, as on a real table)
  for (let q = 0; q < 4; q++) obstacles.push(['flipper', [f.x + c * q / 4, f.y + s * q / 4, f.x + c * (q + 1) / 4, f.y + s * (q + 1) / 4, f.r0 + (f.r1 - f.r0) * q / 4]]);
}
const sau = T.saucer;
obstacles.push(['saucer', [sau.x, sau.y, sau.x, sau.y, 13]]);
const LOGO = boxOf(125, 351, 39, 23, 1, 0);   // the art's 365 PINBALL HERO and the ship under it

test('the list: about 80 inserts, each complete and on the table', () => {
  assert.ok(L.list.length >= 72 && L.list.length <= 96, 'count ' + L.list.length);
  const ids = new Set();
  for (const l of L.list) {
    assert.ok(!ids.has(l.id), 'duplicate ' + l.id); ids.add(l.id);
    assert.ok(['circle', 'arrow', 'triangle', 'rect', 'oval', 'text', 'chevron'].includes(l.shape), l.id + ' shape');
    assert.match(l.color, /^#[0-9a-f]{6}$/i, l.id + ' colour');
    for (const k of ['x', 'y', 'w', 'h', 'rot']) assert.ok(Number.isFinite(l[k]), l.id + ' ' + k);
    assert.ok(l.x > 6 && l.x < T.shooter.x0 && l.y > 0 && l.y < T.H, l.id + ' off the playfield');
    assert.equal(L.list[l.i], l);
    if (l.shape === 'text') assert.ok(l.text, l.id + ' needs its text');
  }
  for (const g of ['lanes', 'skill', 'guides', 'loop', 'drops', 'hangar', 'ramp', 'orbitL', 'orbitR', 'kick', 'outlanes', 'inlanes', 'save', 'mult', 'hero', 'bumpers', 'rings', 'features']) assert.ok(L.groups[g], 'group ' + g);
  assert.equal(L.groups.drops.length, 5); assert.equal(L.groups.hero.length, 5); assert.equal(L.groups.mult.length, 4);
  assert.ok(L.groups.rings.length >= 12, 'bumper rings ' + L.groups.rings.length);
  for (const b of [0, 1, 2]) assert.ok(L.list.filter((l) => l.group === 'rings' && l.b === b).length >= 4, 'ring round bumper ' + b);
  for (const id of ['hangar', 'ramp', 'orbitL', 'orbitR']) {
    const ch = L.chains[id];
    assert.ok(ch.length >= 4 && ch.includes(idx(id)) && ch.includes(idx(id + '.p0')), id + ' chain');
  }
  for (const w of ['LOCK', 'INVASION', 'JACKPOT', 'EXTRA|BALL', 'SHOOT|AGAIN']) assert.ok(L.list.some((l) => l.text === w), 'insert ' + w);
  for (const w of ['WARP RAMP', 'SPINNER', 'ORBIT', 'KICKBACK', 'BONUS']) assert.ok(L.tags.some((g) => g.text === w), 'label ' + w);
  // none of the other table's words
  const banned = /FUEL|HYPERSPACE|GRAVITY|RE-DEPLOY|REDEPLOY|MEDAL|SPACE WARP|BOOSTER|WORMHOLE|LAUNCH RAMP|ATTACK/;
  for (const s of L.list.map((l) => l.text || '').concat(L.tags.map((g) => g.text))) assert.ok(!banned.test(s), 'word ' + s);
});

test('the inserts and labels sit clear of the walls, gates, posts, bumpers, flippers and each other', () => {
  const MARGIN = 0.6, bad = [];
  const check = (ok, msg) => { if (!ok) bad.push(msg); };
  const items = L.list.map((l) => ({ id: l.id, b: lampBox(l) })).concat(L.tags.map((g) => ({ id: 'label ' + g.text, b: tagBox(g) })));
  for (const it of items) {
    for (const [kind, s] of obstacles) { const g = segClear(it.b, s); check(g > MARGIN, it.id + ' is on a ' + kind + ' (' + g.toFixed(2) + ')'); }
    for (const p of corners(it.b)) {
      check(p[0] > 8.5 && p[0] < 241.5, it.id + ' past the side walls');
      if (p[1] < T.arch.y) check(Math.hypot(p[0] - T.arch.x, p[1] - T.arch.y) < T.arch.R - T.arch.r - 1.5, it.id + ' past the arch');
    }
    if (it.id !== 'save') check(gap(it.b, LOGO) > 0.5, it.id + ' is on our name');
  }
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
    const g = gap(items[i].b, items[j].b);
    check(g > MARGIN, items[i].id + ' overlaps ' + items[j].id + ' (' + g.toFixed(2) + ')');
  }
  assert.deepEqual([...new Set(bad)], []);
});

test('the shots point the right way: up the ramp, into the hangar, up each orbit', () => {
  const dir = (id) => { const l = L.list[idx(id)]; return [Math.sin(l.rot), -Math.cos(l.rot)]; };
  assert.ok(dir('ramp')[1] < -0.99);
  const h = L.list[idx('hangar')], hd = dir('hangar');
  const toSaucer = [sau.x - h.x, sau.y - h.y], n = Math.hypot(toSaucer[0], toSaucer[1]);
  assert.ok((hd[0] * toSaucer[0] + hd[1] * toSaucer[1]) / n > 0.8, 'hangar arrow points at the saucer');
  assert.ok(dir('orbitL')[0] < 0 && dir('orbitL')[1] < 0, 'left orbit: up and left');
  assert.ok(dir('orbitR')[0] > 0 && dir('orbitR')[1] < 0, 'right orbit: up and right');
  assert.ok(dir('skill0')[1] > 0.99, 'skill arrows point down into the lanes');
  for (const id of ['ramp', 'orbitL', 'orbitR', 'hangar']) {   // each chain runs towards its shot: the far end first
    const ch = L.chains[id].map((i) => L.list[i]), d = dir(id);
    const along = ch.map((l) => l.x * d[0] + l.y * d[1]);
    for (let k = 1; k < 4; k++) assert.ok(along[k] > along[k - 1], id + ' chain order');
  }
});

test('level(): a new ball, a busy moment, tilt and game over', () => {
  const W = E.newWorld(2, 0, 365, 'orbit');
  const before = JSON.stringify(W);
  let v = L.level(W, 0, 'play');
  assert.equal(v.length, L.list.length);
  assert.equal(JSON.stringify(W), before, 'level() must not change the world');
  for (const x of v) assert.ok(x >= 0 && x <= 1);
  assert.equal(v[idx('kick')], 1, 'kickback lit');
  assert.equal(v[idx('skill' + W.skill)], 1, 'the skill lane blinks (on at t=0)');
  assert.equal(L.level(W, 160, 'play')[idx('skill' + W.skill)], 0, '... and off a beat later');
  assert.equal(v[idx('save')], 0, 'no ball save before the launch');
  // nothing earned yet: those lamps may breathe, but never brighter than half
  for (let t = 0; t < 6000; t += 37) {
    const u = L.level(W, t, 'play');
    for (const id of ['mult2', 'mult3', 'drop0', 'lane0', 'hero0', 'multi', 'xball', 'lock', 'jackpot', 'ramp', 'hangar.p0', 'orbitL.c3', 'loop0', 'inL0', 'saveR'])
      assert.ok(u[idx(id)] <= 0.5, id + ' unlit at ' + t + ': ' + u[idx(id)]);
  }
  // a busy moment
  Object.assign(W, { lanes: [true, false, false], drops: [false, true, true, true, false], saucerLit: true, mult: 3, saveT: 500, comboT: 100, combo: 2, orbitFrom: 'L' });
  W.lit.drop = [0, 0, 0, 0, 5];
  v = L.level(W, 0, 'play');
  assert.equal(v[idx('lane0')], 1); assert.ok(v[idx('lane1')] < 0.5);
  assert.equal(v[idx('drop0')], 1); assert.ok(v[idx('drop1')] < 0.5); assert.equal(v[idx('drop4')], 1, 'a target just hit flashes (on at t=0)');
  assert.equal(v[idx('mult2')], 1); assert.equal(v[idx('mult3')], 1); assert.ok(v[idx('mult4')] < 0.5); assert.ok(v[idx('mult5')] < 0.5);
  assert.equal(v[idx('save')], 1); assert.equal(v[idx('saveR')], 1, 'ball save: its outlane arrow too');
  assert.equal(v[idx('hangar')], 1, 'hangar lit'); assert.equal(v[idx('ramp')], 1, 'combo: ramp lit'); assert.equal(v[idx('orbitR')], 1, 'loop waiting: orbits lit');
  assert.equal(v[idx('ramp.p0')] + v[idx('ramp.p1')], 2, 'combo x2: two ramp lamps held on');
  assert.equal(v[idx('inL0')], 1, 'combo: the inlanes blink (on at t=0)');
  // a bumper hit lights its whole ring
  W.lit.bump = [6, 0, 0];
  v = L.level(W, 0, 'play');
  for (const i of L.groups.rings) if (L.list[i].b === 0) assert.equal(v[i], 1, L.list[i].id);
  // tilt, game over and the 'over' card: all off
  for (const st of [{ tilted: true }, { over: true }]) {
    const u = L.level(Object.assign(E.newWorld(2, 0, 365, 'orbit'), st, { mult: 4, saveT: 300 }), 0, 'play');
    assert.equal(Math.max(...u), 0, JSON.stringify(st));
  }
  assert.equal(Math.max(...L.level(W, 0, 'over')), 0);
});

test('level(): the lamps never stand still, and the idle chases run in towards each shot', () => {
  const W = E.newWorld(2, 0, 365, 'orbit'), a = L.level(W, 0, 'play').slice();
  const moved = new Set();
  for (let t = 50; t < 3200; t += 50) { const u = L.level(W, t, 'play'); u.forEach((x, i) => { if (Math.abs(x - a[i]) > 0.02) moved.add(i); }); }
  const still = L.list.filter((l) => !moved.has(l.i) && l.id !== 'save' && l.id !== 'kick' && l.group !== 'skill').map((l) => l.id);
  assert.deepEqual(still, [], 'never move: ' + still.join(' '));
  // an idle shot's brightest lamp runs from its far end towards the arrow
  for (const id of ['ramp', 'orbitL', 'hangar']) {
    const ch = L.chains[id], firsts = [];
    for (let t = 0; t < 190 * (ch.length + 2); t += 190) { const u = L.level(W, t + 5, 'play'); let best = -1, bi = -1; ch.forEach((i, k) => { if (u[i] > best) { best = u[i]; bi = k; } }); if (best > 0.2) firsts.push(bi); }
    for (let k = 1; k < firsts.length; k++) assert.ok(firsts[k] >= firsts[k - 1], id + ' chase direction ' + firsts.join(','));
  }
});

test('level(): the attract show moves up the table and fills a reused array', () => {
  const out = new Float32Array(L.list.length);
  const centre = (t) => { const v = L.level(null, t, 'title', out); let s = 0, n = 0; L.list.forEach((l, i) => { s += v[i] * l.y; n += v[i]; }); return n ? s / n : NaN; };
  assert.equal(L.level(null, 100, 'title', out), out);
  assert.ok(centre(350) > centre(900), 'the wave sweeps up: ' + centre(350).toFixed(0) + ' -> ' + centre(900).toFixed(0));
  let lit = 0;
  for (let t = 0; t < 24000; t += 100) lit += L.level(null, t, 'title', out).reduce((a, b) => a + (b > 0.5 ? 1 : 0), 0);
  assert.ok(lit > 1500, 'the show lights lamps: ' + lit);
});

test('level() is cheap', () => {
  const W = E.newWorld(2, 0, 365, 'orbit'), out = new Float32Array(L.list.length), t0 = process.hrtime.bigint();
  W.comboT = 50; W.combo = 1; W.orbitFrom = 'L';
  for (let i = 0; i < 20000; i++) L.level(W, i * 16, i % 5 ? 'play' : 'title', out);
  const us = Number(process.hrtime.bigint() - t0) / 1000 / 20000;
  assert.ok(us < 20, us.toFixed(2) + ' us a call');
  console.log('level(): ' + us.toFixed(2) + ' us a call, ' + L.list.length + ' lamps');
});

// ================================================================ Ember Peak's set (16 Oct 2026, the next-gen fast track)
const BE = E.table('ember'), TE = BE.T, LE = Lm.forTable('ember');
const idxE = (id) => { const i = LE.byId[id]; assert.ok(i != null, 'no Ember lamp ' + id); return i; };
const obstaclesE = [];
for (const w of BE.WALLS.concat(BE.DROPS, BE.GATES, BE.LAVA)) if (w.kind !== 'apron') obstaclesE.push(['wall', [w.ax, w.ay, w.bx, w.by, w.r]]);
for (const p of TE.posts) obstaclesE.push(['post', [p[0], p[1], p[0], p[1], p[2]]]);
for (const b of TE.bumpers) obstaclesE.push(['fumarole', [b[0], b[1], b[0], b[1], b[2] + 1.8]]);
for (const f of TE.flippers) for (const a of [f.rest, f.up]) {
  const c = Math.cos(a) * f.len, s = Math.sin(a) * f.len;
  for (let q = 0; q < 4; q++) obstaclesE.push(['flipper', [f.x + c * q / 4, f.y + s * q / 4, f.x + c * (q + 1) / 4, f.y + s * (q + 1) / 4, f.r0 + (f.r1 - f.r0) * q / 4]]);
}
obstaclesE.push(['volcano', [TE.volcano.x, TE.volcano.y, TE.volcano.x, TE.volcano.y, TE.volcano.r + 4]]);
obstaclesE.push(['geyser', [TE.geyser.x, TE.geyser.y, TE.geyser.x, TE.geyser.y, TE.geyser.r + 1]]);
for (const c of TE.crabs) obstaclesE.push(['crab walk', [c.path[0][0], c.path[0][1], c.path[1][0], c.path[1][1], c.r]]);
function inPoly(P, x, y) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > y) !== (P[j][1] > y) && x < (P[j][0] - P[i][0]) * (y - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) c = !c; return c; }

test('Ember Peak: about 80-110 inserts, each complete and on the table, every shot and toy has its lamps', () => {
  assert.equal(LE.id, 'ember');
  assert.ok(LE.list.length >= 80 && LE.list.length <= 160, 'count ' + LE.list.length);
  const ids = new Set();
  for (const l of LE.list) {
    assert.ok(!ids.has(l.id), 'duplicate ' + l.id); ids.add(l.id);
    assert.ok(['circle', 'arrow', 'triangle', 'rect', 'oval', 'text', 'chevron'].includes(l.shape), l.id + ' shape');
    assert.match(l.color, /^#[0-9a-f]{6}$/i, l.id + ' colour');
    for (const k of ['x', 'y', 'w', 'h', 'rot']) assert.ok(Number.isFinite(l[k]), l.id + ' ' + k);
    assert.ok(l.x > 6 && l.x < TE.shooter.x0 && l.y > 0 && l.y < TE.H, l.id + ' off the playfield');
    assert.equal(LE.list[l.i], l);
  }
  for (const g of ['lanes', 'skill', 'loop', 'gauge', 'crater', 'geyser', 'lava', 'orbitL', 'orbitR', 'ramp', 'drops', 'obsidian', 'inlanes', 'kick', 'outlanes', 'save', 'erupt', 'mult', 'bumpers', 'rings', 'slings']) assert.ok(LE.groups[g], 'group ' + g);
  assert.equal(LE.groups.slings.length, 6);
  assert.equal(LE.groups.gauge.length, 9); assert.equal(LE.groups.erupt.length, 5); assert.equal(LE.groups.drops.length, BE.DROPS.length); assert.equal(LE.groups.lava.length, 10);
  assert.ok(LE.groups.rings.length >= 9, 'fumarole rings ' + LE.groups.rings.length);
  for (const id of ['crater', 'ramp', 'orbitL', 'orbitR', 'obsidian', 'geyser', 'lavaL', 'lavaR']) assert.ok(LE.chains[id] && LE.chains[id].length >= 3 && LE.chains[id].includes(idxE(id)), id + ' chain');
  // our words only: none of the banned ones
  const banned = /CASH|BANK IT|DINO|IDOL/i;
  for (const s of LE.list.map((l) => l.text || '').concat(LE.tags.map((g) => g.text))) assert.ok(!banned.test(s), 'word ' + s);
  // the top-level PinLamps follows the default table, and use() switches it
  assert.equal(Lm.use('orbit').id, 'orbit'); assert.equal(Lm.list, L.list);
  assert.equal(Lm.use('ember').id, 'ember'); assert.equal(Lm.list, LE.list);
});

test('Ember Peak: the inserts and labels sit clear of the walls, gates, toys, flippers and each other', () => {
  const MARGIN = 0.6, bad = [];
  const check = (ok, msg) => { if (!ok) bad.push(msg); };
  const items = LE.list.map((l) => ({ id: l.id, b: lampBox(l) })).concat(LE.tags.map((g) => ({ id: 'label ' + g.text, b: tagBox(g) })));
  for (const it of items) {
    for (const [kind, s] of obstaclesE) { const g = segClear(it.b, s); check(g > MARGIN, it.id + ' is on a ' + kind + ' (' + g.toFixed(2) + ')'); }
    for (const p of corners(it.b)) {
      check(p[0] > 8.5 && p[0] < TE.shooter.x0 - 2.5, it.id + ' past the side walls');
      if (p[1] < TE.arch.y) check(Math.hypot(p[0] - TE.arch.x, p[1] - TE.arch.y) < TE.arch.R - TE.arch.r - 1.5, it.id + ' past the arch');
      for (const v of TE.voids) check(!inPoly(v, p[0], p[1]), it.id + ' is under a deck or the obsidian block');
    }
  }
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
    const g = gap(items[i].b, items[j].b);
    check(g > MARGIN, items[i].id + ' overlaps ' + items[j].id + ' (' + g.toFixed(2) + ')');
  }
  assert.deepEqual([...new Set(bad)], []);
});

test('Ember Peak: the shots point the right way and their chases run towards them', () => {
  const dir = (id) => { const l = LE.list[idxE(id)]; return [Math.sin(l.rot), -Math.cos(l.rot)]; };
  const aim = (id, x, y) => { const l = LE.list[idxE(id)], d = dir(id), v = [x - l.x, y - l.y], n = Math.hypot(v[0], v[1]); return (d[0] * v[0] + d[1] * v[1]) / n; };
  assert.ok(aim('crater', TE.volcano.x, TE.volcano.y) > 0.95, 'crater arrow points at the crater');
  assert.ok(aim('geyser', TE.geyser.x, TE.geyser.y) > 0.95, 'geyser arrow points at the geyser');
  const DL = BE.DROPS[BE.DROPS.length - 1], bank = { x: (BE.DROPS[0].ax + DL.bx) / 2, y: (BE.DROPS[0].ay + DL.by) / 2 };
  assert.ok(aim('obsidian', bank.x, bank.y) > 0.95, 'obsidian arrow points at the targets');
  assert.ok(dir('ramp')[1] < -0.99 && dir('lavaL')[1] < -0.99 && dir('lavaR')[1] < -0.99, 'ramp and lava lanes: up');
  assert.ok(dir('orbitL')[0] < 0 && dir('orbitL')[1] < 0 && dir('orbitR')[0] > 0 && dir('orbitR')[1] < 0, 'orbits: up and out');
  for (const id of ['crater', 'ramp', 'orbitL', 'orbitR', 'obsidian']) {   // the far end first, the arrow last
    const ch = LE.chains[id].map((i) => LE.list[i]), d = dir(id), ai = LE.chains[id].indexOf(idxE(id)), along = ch.map((l) => l.x * d[0] + l.y * d[1]);
    for (let k = 1; k <= ai; k++) assert.ok(along[k] > along[k - 1], id + ' chain order');
  }
  for (const id of ['lavaL', 'lavaR']) { const ys = LE.chains[id].map((i) => LE.list[i].y); for (let k = 1; k < ys.length; k++) assert.ok(ys[k] < ys[k - 1], id + ' runs up its lane'); }
});

test('Ember Peak level(): the pressure gauge, the crater, the lava lanes, the quake, tilt and game over', () => {
  const W = E.newWorld(2, 0, 365, 'ember'), V = W.toys.volcano, before = JSON.stringify(W);
  let v = LE.level(W, 0, 'play');
  assert.equal(v.length, LE.list.length);
  assert.equal(JSON.stringify(W), before, 'level() must not change the world');
  for (const x of v) assert.ok(x >= 0 && x <= 1);
  assert.equal(Lm.level(W, 0, 'play').length, LE.list.length, 'PinLamps.level follows W.tableId');
  const G = LE.groups.gauge, ER = LE.groups.erupt;
  const maxOver = (ids, W2, t0, t1) => { let m = 0; for (let t = t0; t < t1; t += 23) { const u = LE.level(W2, t, 'play'); for (const i of ids) m = Math.max(m, u[i]); } return m; };
  // no pressure: nothing on the gauge lit (it may chase dimly)
  assert.ok(maxOver(G, W, 0, 4000) <= 0.5 && maxOver(ER, W, 0, 4000) <= 0.5, 'empty gauge');
  // half: the first four ticks and E-R lit, the far end not (wave 3: the gauge is sized to the eruption ladder's rung, W.press.level)
  const RUNG = W.press.level;
  V.pressure = 0.5 * RUNG; v = LE.level(W, 0, 'play');
  for (let k = 0; k < 4; k++) assert.equal(v[G[k]], 1, 'gauge' + k);
  assert.ok(maxOver(G.slice(5), W, 0, 4000) <= 0.5, 'gauge 5-8 unlit at half pressure');
  assert.equal(v[ER[0]], 1); assert.equal(v[ER[1]], 1); assert.ok(maxOver(ER.slice(3), W, 0, 4000) <= 0.5);
  // full (ERUPT lit at the crater): the crater's shot races and its ERUPT insert blinks, the gauge chases round (wave 3: the
  // ramp no longer lights at full pressure - the NEXT arrow points at the crater instead)
  V.pressure = RUNG; V.ready = true; W.crater.lit = ['erupt'];
  assert.ok(maxOver([idxE('crater')], W, 0, 400) === 1 && maxOver([idxE('cr.erupt')], W, 0, 400) === 1, 'crater and ERUPT lit at full pressure');
  assert.ok(Math.min(...G.map((i) => LE.level(W, 30, 'play')[i])) >= 0.6, 'full gauge: all on');
  // the crater holding the ball: the crater flashes, the gauge flickers
  V.busy = true; v = LE.level(W, 0, 'play');
  assert.ok(LE.chains.crater.every((i) => v[i] === 1), 'crater made: its lamps flash (on at t=0)');
  V.busy = false; V.ready = false; V.pressure = 0; W.crater.lit = [];
  // lava lanes: closed, a dim ember glow that moves; open, a race up the lane
  const lava = LE.groups.lava;
  assert.ok(maxOver(lava, W, 0, 3000) <= 0.15, 'closed lava lanes glow dimly');
  W.toys.lava.open = true; W.toys.lava.gates.forEach((g) => { g.h = 1; });
  assert.ok(maxOver(lava, W, 0, 600) >= 0.95, 'open lava lanes race');
  W.toys.lava.open = false;
  // the geyser puffing blinks
  W.toys.geyser.st = 'puff'; assert.ok(LE.chains.geyser.every((i) => LE.level(W, 0, 'play')[i] === 1), 'geyser puff'); W.toys.geyser.st = 'ready';
  // a quake: the table shudders (lamps drop out at random)
  W.lanes = [true, true, true]; const calm = LE.level(W, 0, 'play').slice();
  W.toys.quake.t = 20; const q = LE.level(W, 0, 'play');
  assert.ok(LE.list.some((l) => q[l.i] < calm[l.i] - 0.3), 'quake shudder'); W.toys.quake.t = 0;
  // tilt, game over and the 'over' card: all off
  for (const st of [{ tilted: true }, { over: true }]) assert.equal(Math.max(...LE.level(Object.assign(E.newWorld(2, 0, 365, 'ember'), st), 0, 'play')), 0, JSON.stringify(st));
  assert.equal(Math.max(...LE.level(W, 0, 'over')), 0);
});

test('Ember Peak level(): the lamps never stand still, and the attract show moves up the table', () => {
  const W = E.newWorld(2, 0, 365, 'ember'), a = LE.level(W, 0, 'play').slice(), moved = new Set();
  for (let t = 50; t < 3200; t += 50) { const u = LE.level(W, t, 'play'); u.forEach((x, i) => { if (Math.abs(x - a[i]) > 0.02) moved.add(i); }); }
  const still = LE.list.filter((l) => !moved.has(l.i) && l.id !== 'save' && l.id !== 'kick' && l.group !== 'skill').map((l) => l.id);
  assert.deepEqual(still, [], 'never move: ' + still.join(' '));
  const out = new Float32Array(LE.list.length);
  const centre = (t) => { const v = LE.level(null, t, 'title', out); let s = 0, n = 0; LE.list.forEach((l, i) => { s += v[i] * l.y; n += v[i]; }); return n ? s / n : NaN; };
  assert.ok(centre(350) > centre(1000), 'the wave sweeps up: ' + centre(350).toFixed(0) + ' -> ' + centre(1000).toFixed(0));
  const t0 = process.hrtime.bigint();
  for (let i = 0; i < 20000; i++) LE.level(W, i * 16, i % 5 ? 'play' : 'title', out);
  const us = Number(process.hrtime.bigint() - t0) / 1000 / 20000;
  assert.ok(us < 20, us.toFixed(2) + ' us a call');
  console.log('Ember level(): ' + us.toFixed(2) + ' us a call, ' + LE.list.length + ' lamps');
});

// ================================================================ the big moments' light shows (29 Oct 2026, owner: "bigger light shows")
test('Ember Peak level(): whole-table shows for the big moments - they take the table over, settle, and never flash it more than 3 times a second', () => {
  const N = LE.list.length, FR = 1000 / 60;
  const trig = {
    launch: (w) => { w.balls[0].launched = true; }, drops: (w) => { w.dropsDown = LE.groups.drops.length; }, loop: (w) => { w.stats.loops++; }, combo: (w) => { w.goals = { combo: { n: 2, t: 120 } }; },
    quake: (w) => { w.stats.quakes++; }, overload: (w) => { w.toys.quake.pending = true; }, ready: (w) => { w.toys.volcano.ready = true; w.toys.volcano.pressure = 1; },
    save: (w) => { w.stats.saves++; }, skill: (w) => { w.stats.skill++; }, lavashot: (w) => { w.stats.lava++; w.lit.lava = [0, 40]; }, extra: (w) => { w.total++; },
    eruption: (w) => { w.stats.craters++; w.stats.eruptions++; w.toys.volcano.release = w.frame + 165; w.toys.volcano.busy = true; },
    // wave 3: THE BIG ONE's moments
    lock: (w) => { w.stats.locks++; }, plugsave: (w) => { w.stats.plugSaves++; }, jackpot: (w) => { w.stats.jackpots++; }, super: (w) => { w.stats.supers++; },
    mball: (w) => { w.stats.multiballs++; }, dive: (w) => { w.dive.held = true; }
  };
  const runOf = (name) => {
    const w = E.newWorld(2, 0, 365, 'ember'), base = [], show = [];
    LE.level(w, 0, 'play'); trig[name](w);
    for (let t = FR, n = 0; n < 330; t += FR, n++) {
      if (name === 'eruption') { w.frame++; if (w.frame >= w.toys.volcano.release) w.toys.volcano.busy = false; }
      const before = JSON.stringify(w), v = LE.level(w, t, 'play');
      assert.equal(JSON.stringify(w), before, name + ': level() must not change the world');
      show.push(Array.from(v)); base.push(LE.showNow() ? LE.showNow().name : '');
    }
    return { show, names: base };
  };
  for (const name of Object.keys(trig)) {
    const r = runOf(name), seen = new Set(r.names.filter(Boolean));
    assert.ok(seen.has(name), name + ': its show runs (' + [...seen].join(' ') + ')');
    let most = 0, bad = 0; const mean = r.show.map((v) => { let s = 0, c = 0; for (const x of v) { if (!(x >= 0 && x <= 1)) bad++; s += x; if (x > 0.8) c++; } most = Math.max(most, c); return s / N; });
    assert.equal(bad, 0, name + ': levels 0..1');
    assert.ok(most >= 7, name + ': lights lamps right across the table (' + most + ' at once)');
    assert.equal(r.names[r.names.length - 1], '', name + ': it ends (and the table settles)');
    // a whole-table flash: the table's mean light rising by 0.2 (of 1) within 150 ms; never more than 3 starting in any second
    const fl = [];
    for (let i = 0; i < mean.length; i++) for (let j = 1; j <= 9 && i - j >= 0; j++) if (mean[i] - mean[i - j] >= 0.2 && (!fl.length || i - fl[fl.length - 1] > 9)) { fl.push(i); break; }
    let worst = 0; fl.forEach((a, i) => { let c = 0; for (let j = i; j < fl.length && fl[j] < a + 60; j++) c++; worst = Math.max(worst, c); });
    assert.ok(worst <= 2, name + ': at most 2 whole-table flashes a second (' + worst + ')');   // (wave 3: 2 a second, everywhere)
    assert.equal(JSON.stringify(runOf(name).show), JSON.stringify(r.show), name + ': the same world and clock light the same show (deterministic)');
  }
  // the ash cloud: after the lava pours, the table goes dark but for the volcano's own lamps (they pulse) and the lava's
  const w = E.newWorld(2, 0, 365, 'ember'), V = w.toys.volcano; w.lanes = [true, true, true];
  LE.level(w, 0, 'play'); w.stats.craters++; w.stats.eruptions++; V.release = w.frame + 165; V.busy = true;
  let v; for (let t = FR; t < 2000; t += FR) { w.frame++; v = LE.level(w, t, 'play'); }
  assert.ok(LE.groups.lanes.every((i) => v[i] < 0.15), 'under the ash the lit lanes go dark');
  assert.ok(LE.groups.gauge.some((i) => v[i] >= 0.25), 'and the gauge still pulses');
  // a bigger show is never cut short by a smaller one; tilt turns a show off
  const w2 = E.newWorld(2, 0, 365, 'ember'); LE.level(w2, 0, 'play'); w2.total++; LE.level(w2, 100, 'play'); w2.stats.loops++; LE.level(w2, 200, 'play');
  assert.equal(LE.showNow().name, 'extra', 'a loop during an extra ball show waits');
  w2.tilted = true; assert.equal(Math.max(...LE.level(w2, 300, 'play')), 0, 'tilt: all off');
  // still cheap with a show running
  const w3 = E.newWorld(2, 0, 365, 'ember'), out = new Float32Array(N); LE.level(w3, 0, 'play', out); w3.total++;
  const t0 = process.hrtime.bigint();
  for (let i = 0; i < 20000; i++) LE.level(w3, 1 + (i % 140) * 16, 'play', out);
  const us = Number(process.hrtime.bigint() - t0) / 1000 / 20000;
  assert.ok(us < 20, us.toFixed(2) + ' us a call during a show');
  console.log('Ember level() during a show: ' + us.toFixed(2) + ' us a call');
});

// ================================================================ wave 3 (5 Nov 2026): THE BIG ONE, the goals and the NEXT shot
const SHOT_IDS = ['crater', 'ramp', 'orbitL', 'orbitR', 'lavaL', 'lavaR', 'drops', 'crabs', 'pops', 'geyser', 'lanes', 'loop'];
const maxIn = (W, ids, t0 = 0, t1 = 3000) => { let m = 0; for (let t = t0; t < t1; t += 17) { const u = LE.level(W, t, 'play'); for (const i of ids) m = Math.max(m, u[i]); } return m; };
const meanIn = (W, ids, t0 = 0, t1 = 3000) => { let s = 0, n = 0; for (let t = t0; t < t1; t += 17) { const u = LE.level(W, t, 'play'); for (const i of ids) { s += u[i]; n++; } } return s / n; };

test('wave 3: the new inserts are there (crown, jackpots, plug, modes, boss, combo, tags, the crab arrow)', () => {
  for (const id of ['cr.lock', 'cr.erupt', 'cr.super', 'cr.mode', 'cr.dive', 'jp.lavaL', 'jp.lavaR', 'jp.ramp', 'plug', 'mode0', 'mode1', 'mode2', 'mode3', 'boss0', 'boss1', 'boss2', 'combo0', 'combo4', 'tag0', 'tag3', 'crabs']) idxE(id);
  assert.equal(LE.groups.crown.length, 5); assert.equal(LE.groups.jackpot.length, 3); assert.equal(LE.groups.modes.length, 4); assert.equal(LE.groups.combo.length, 5); assert.equal(LE.groups.boss.length, 3);
  for (const id of SHOT_IDS) assert.ok(LE.next[id] && LE.next[id].length >= 1, 'NEXT lamps for ' + id);
});

test('wave 3: the NEXT arrow lights exactly the shot W.next names, for every shot id, and dims the other chases', () => {
  for (const id of SHOT_IDS) {
    const W = E.newWorld(2, 0, 365, 'ember'), mine = new Set(LE.next[id]); W.skillOpen = false;   // (the skill shot's own blink is a state, not a chase)
    const before = meanIn(W, LE.next[id]);
    W.next = { shot: id, text: 'NEXT', small: '', gauge: 0, clock: null };
    const snap = JSON.stringify(W);
    assert.ok(maxIn(W, LE.next[id]) >= 0.95, id + ': its lamps light up');
    assert.ok(meanIn(W, LE.next[id]) > 1.8 * before, id + ': brighter than without NEXT (' + before.toFixed(2) + ' -> ' + meanIn(W, LE.next[id]).toFixed(2) + ')');
    for (const o of SHOT_IDS) {
      if (o === id) continue;
      const others = LE.next[o].filter((i) => !mine.has(i));
      if (others.length) assert.ok(maxIn(W, others) <= 0.45, id + ': the ' + o + ' lamps stay dim (' + maxIn(W, others).toFixed(2) + ')');
    }
    assert.equal(JSON.stringify(W), snap, 'level() must not change the world');
  }
  // the idle chases dim to 30% while a NEXT shot is named
  const W = E.newWorld(2, 0, 365, 'ember'), ch = LE.chains.orbitR.filter((i) => i !== idxE('orbitR'));
  const a = maxIn(W, ch); W.next = { shot: 'crater' }; const b = maxIn(W, ch);
  assert.ok(b <= a * 0.35 + 0.01, 'other chases dim to 30% (' + a.toFixed(2) + ' -> ' + b.toFixed(2) + ')');
  W.next = { shot: 'nonsense' }; assert.ok(maxIn(W, ch) >= a - 0.01, 'an unknown shot id changes nothing');
});

test('wave 3: the crater crown follows W.crater.lit (the first blinks hardest), the jackpots W.mb.jp, the plug W.plug', () => {
  const W = E.newWorld(2, 0, 365, 'ember'), I = (id) => [idxE(id)];
  assert.ok(maxIn(W, LE.groups.crown) <= 0.1 && maxIn(W, LE.groups.jackpot) <= 0.1 && maxIn(W, I('plug')) <= 0.15, 'all dim at the start');
  W.crater.lit = ['erupt', 'lock'];
  assert.equal(maxIn(W, I('cr.erupt')), 1); assert.ok(maxIn(W, I('cr.lock')) >= 0.8 && maxIn(W, I('cr.lock')) < 1, 'the second lit award pulses, not full');
  assert.ok(maxIn(W, I('cr.dive')) <= 0.1, 'unlit awards stay dark');
  assert.equal(maxIn(W, LE.chains.crater), 1, 'anything lit lights the crater shot');
  W.crater.lit = []; W.lock.n = 1; assert.ok(Math.abs(maxIn(W, I('cr.lock')) - 0.7) < 0.01, 'a banked lock holds LOCK on');
  W.mb = { on: true, balls: 2, jp: { lavaL: true, lavaR: false, ramp: true }, jpValue: 5e6, jpCount: 0, superLit: false };
  assert.equal(maxIn(W, I('jp.lavaL')), 1); assert.equal(maxIn(W, I('jp.ramp')), 1); assert.ok(maxIn(W, I('jp.lavaR')) <= 0.1, 'a collected jackpot is dark');
  assert.ok(maxIn(W, LE.groups.gauge) === 1, 'the gauge races in multiball');
  W.plug.up = true; W.plug.t = 900; assert.equal(LE.level(W, 0, 'play')[idxE('plug')], 1, 'the plug up: PLUG on');
  // a gauge sized to the rung: at the first rung (0.4) full, not at 40% of 1
  const W2 = E.newWorld(2, 0, 365, 'ember'); W2.toys.volcano.pressure = W2.press.level; W2.toys.volcano.ready = true; W2.crater.lit = ['erupt'];
  assert.ok(Math.min(...LE.groups.gauge.map((i) => LE.level(W2, 30, 'play')[i])) >= 0.6, 'at the rung the whole gauge is lit');
});

test('wave 3: modes, the boss phases, the combo ladder and the mutation tags read W.goals and W.mod.tags (any shape goals.js uses)', () => {
  const W = E.newWorld(2, 0, 365, 'ember'), M = LE.groups.modes;
  for (const mode of ['crabs', 'CRAB HUNT', 0, { id: 'crabs' }]) { W.goals = { mode, modesDone: 0 }; assert.equal(maxIn(W, [M[0]]), 1, 'mode ' + JSON.stringify(mode)); assert.ok(maxIn(W, [M[1]]) <= 0.1); }
  W.goals = { mode: { name: 'HEAT WAVE' }, modesDone: 3 };
  assert.equal(maxIn(W, [M[3]]), 1); assert.ok(maxIn(W, [M[0]]) >= 0.8 && maxIn(W, [M[2]]) >= 0.8, 'done modes stay on');
  W.goals = { mode: null, modesDone: 1, modeLit: true }; assert.ok(maxIn(W, [M[1]]) >= 0.85 && maxIn(W, [M[2]]) <= 0.1, 'the next mode pulses while MODE is lit');
  W.goals = { boss: { phase: 2 } }; const B = LE.groups.boss;
  assert.ok(Math.abs(maxIn(W, [B[0]]) - 0.8) < 0.01 && maxIn(W, [B[1]]) === 1 && maxIn(W, [B[2]]) <= 0.1, 'boss phase 2');
  const W3 = E.newWorld(2, 0, 365, 'ember'); W3.goals = { combo: { n: 3, t: 100 } }; const C = LE.groups.combo, v = LE.level(W3, 0, 'play');   // (a fresh world: no combo show starting)
  assert.ok(v[C[0]] === 1 && v[C[2]] === 1 && v[C[3]] < 1 && v[C[4]] < 0.2, 'combo 3: three steps');
  W.goals = { combo: { n: 3, t: 0 } }; assert.ok(maxIn(W, C) <= 0.1, 'a combo whose clock ran out is dark');
  W.goals = null; W.mod = { tags: ['a', 'b'] }; const TG = LE.groups.tags;
  assert.ok(maxIn(W, [TG[0]]) >= 0.7 && maxIn(W, [TG[1]]) >= 0.7 && maxIn(W, [TG[2]]) <= 0.1, 'two tags: two lenses');
});
