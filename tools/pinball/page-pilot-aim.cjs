/* 365 Pinball Hero - the demo pilot's aim table for any table (16 Oct 2026, NG fast track). Never deployed.
 * The pilot (games/pinball/pilot.js) plays at the game's own 60 steps a second, like a player, so its shots are timed
 * in whole steps. For each speed this finds:
 *  - plunger: how many steps of hold drop the launch into each top lane (the skill shot);
 *  - cradle:  with the ball cradled on a raised flipper and settled, the pilot lets go and flips again N steps later -
 *             what each N reaches first. Every flipper of the table (Ember Peak: the shore's 0 and 1, the summit's 2
 *             and 3). The crabs are taken off the table while it measures (they walk, so they would make the windows
 *             change with where they are), and the lava gates are measured both down and up.
 * It prints the AIM table pilot.js carries for the table. Re-run it after the table changes:
 *
 *   node tools/pinball/page-pilot-aim.cjs            (Ember Peak; --orbit for the old space table) */
'use strict';
var S = require('./sim.cjs'), E = S.E, T = S.T, TID = S.tableId;

function first(W) {   // what this step's events say the ball reached
  for (var k = 0; k < W.events.length; k++) {
    var e = W.events[k], n = typeof e === 'string' ? e : e.sfx;
    if (n === 'ramp' || n === 'combo') return 'ramp';
    if (n === 'rampfail') return 'rollback';
    if (n === 'crater') return 'crater';
    if (n === 'lava') return 'lava';
    if (n === 'puff') return 'geyser';
    if (n === 'saucer' || n === 'jackpot') return 'hangar';
    if (n === 'drop') return 'drop';
    if (n === 'crab') return 'crab';
    if (n === 'orbit' || n === 'loop') return 'orbit';
    if (n === 'drain') return 'drain';
    if (n === 'bumper') return 'bumper';
    if (n === 'lane') return 'lane';
  }
  return null;
}

function plunge(speed, frames) {
  var W = E.newWorld(speed, 0, 5, TID), res = null, n;
  W.skill = 0; W.skillOpen = true;
  if (W.toys.crabs) W.toys.crabs.forEach(function (c) { c.stun = 1e9; c.x = -500; c.y = -500; });
  for (n = 0; n < frames; n++) { E.step(W, { fire: true }); W.events.length = 0; }
  for (n = 0; n < 60 * 5 && !res; n++) {
    E.step(W, {});
    var b = W.balls[0];
    if (!b) { res = 'drain'; break; }
    for (var l = 0; l < 3; l++) if (b.inside['lane' + l]) res = 'lane' + l;
    if (!res) { var f = first(W); if (f && f !== 'lane') res = f; }
    W.events.length = 0;
  }
  return res || 'none';
}

function cradleShot(speed, fi, delay, opt) {
  var W = S.world(speed, 11, { kickback: false, dropsDown: opt.dropsDown, lava: opt.lava, noCrabs: true }), f = W.flippers[fi], key = f.side < 0 ? 'left' : 'right', inp = {};
  W.flippers.forEach(function (g) { if (g.side === f.side) { g.a = g.up; g.on = true; } });
  if (W.toys.volcano) W.toys.volcano.pressure = opt.full ? 1 : 0.3;
  S.place(W, f.x + Math.cos(f.up) * f.len * 0.7, f.y + Math.sin(f.up) * f.len * 0.7 - 12, 0, 0);
  inp[key] = true;
  for (var n = 0; n < 150; n++) { E.step(W, inp); W.events.length = 0; }
  var b0 = W.balls[0];
  if (!b0 || Math.abs(b0.vx) + Math.abs(b0.vy) > 30) return 'unsettled';
  var res = null, orbitSide = '', storey = f.storey || 0, st = W.storeys && W.storeys[storey];
  for (n = 0; n < 60 * 4 && !res; n++) {
    var on = n >= delay && n < delay + 14, i2 = {}; i2[key] = on;
    E.step(W, i2);
    res = first(W);
    if (res === 'orbit') orbitSide = W.orbitFrom || '?';
    if (!W.balls.length) res = res || 'drain';
    if (!res && n > delay + 20) {   // back down on its own flippers with nothing hit, or dropped to the storey below
      var b = W.balls[0];
      if (b && b.m === 'free' && b.vy > 0 && b.y > f.y - 30 && b.y < f.y + 40) res = 'nothing';
      if (b && b.m === 'free' && st && b.y > st.y1 + 10) res = 'down';
    }
    W.events.length = 0;
  }
  return res === 'orbit' ? 'orbit' + orbitSide : (res || 'none');
}

// the middle of the longest run of each target (the most forgiving delay), and the run's length
function mid(a) {
  if (!a || !a.length) return -1;
  var best = [a[0], a[0]], cur = [a[0], a[0]];
  for (var i = 1; i < a.length; i++) { if (a[i] === cur[1] + 1) cur[1] = a[i]; else cur = [a[i], a[i]]; if (cur[1] - cur[0] > best[1] - best[0]) best = cur.slice(); }
  return Math.round((best[0] + best[1]) / 2);
}
function run(a) {
  if (!a || !a.length) return 0;
  var best = 1, cur = 1;
  for (var i = 1; i < a.length; i++) { if (a[i] === a[i - 1] + 1) cur++; else cur = 1; if (cur > best) best = cur; }
  return best;
}

var aim = {}, NF = E.table(TID).T.flippers.length;
[1, 2, 3].forEach(function (speed) {
  var lanes = { lane0: [], lane1: [], lane2: [] };
  for (var fr = 14; fr <= 54; fr++) { var r = plunge(speed, fr); if (lanes[r]) lanes[r].push(fr); }
  console.log('speed ' + speed + ' plunger: ' + JSON.stringify(lanes));
  var A = { lane: [mid(lanes.lane0), mid(lanes.lane1), mid(lanes.lane2)], F: [] };
  for (var fi = 0; fi < NF; fi++) {
    var hits = {};
    for (var d = 0; d <= 50; d++) {
      var a = cradleShot(speed, fi, d, {}), b = cradleShot(speed, fi, d, { lava: true }), c = TID === 'orbit' ? cradleShot(speed, fi, d, { dropsDown: true }) : null;
      [a, b === 'lava' ? 'lava' : null, c === 'hangar' ? 'hangar' : null].forEach(function (x) { if (x && !/^(nothing|none|down|unsettled|drain)$/.test(x)) (hits[x] = hits[x] || []).push(d); });
    }
    var out = {};
    Object.keys(hits).forEach(function (k) { var kk = /^orbit/.test(k) ? 'orbit' : k; if (!out[kk] || run(hits[k]) > out[kk].n) out[kk] = { d: mid(hits[k]), n: run(hits[k]) }; });
    var row = {};
    Object.keys(out).forEach(function (k) { if (out[k].n >= 1 && !/^(bumper|rollback|lane)$/.test(k)) row[k] = out[k].d; });
    A.F.push(row);
    console.log('  flipper ' + fi + ': ' + Object.keys(hits).map(function (k) { return k + ' ' + JSON.stringify(hits[k]); }).join('; '));
  }
  aim[speed] = A;
});
console.log('\n// ' + TID + ', from tools/pinball/page-pilot-aim.cjs\n' + JSON.stringify(aim) + ';');
