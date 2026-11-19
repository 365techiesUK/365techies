/* 365 Pinball Hero - the demo pilot's aim table (15 Oct 2026, M2a). Never deployed.
 * The pilot (games/pinball/pilot.js) plays at the game's own 60 steps a second, like a player, so its shots are
 * timed in whole steps. This finds, for each speed:
 *  - plunger: how many steps of hold drop the launch into each top lane (the skill shot);
 *  - cradle:  with the ball cradled on a raised flipper and settled, the pilot lets go and flips again N steps later -
 *             what each N reaches first (ramp made, either orbit, the hangar with the targets down, a drop target).
 * It prints the table pilot.js carries (AIM). Re-run it after the physics lane changes the table:
 *
 *   node tools/pinball/fx-aim.cjs */
'use strict';
var S = require('./sim.cjs'), E = S.E, T = S.T;

function first(W) {   // what this step's events say the ball reached
  for (var k = 0; k < W.events.length; k++) {
    var e = W.events[k], n = typeof e === 'string' ? e : e.sfx;
    if (n === 'ramp' || n === 'combo') return 'ramp';
    if (n === 'rampfail') return 'rollback';
    if (n === 'saucer' || n === 'jackpot') return 'hangar';
    if (n === 'drop') return 'drop';
    if (n === 'orbit' || n === 'loop') return 'orbit';
    if (n === 'drain') return 'drain';
    if (n === 'bumper') return 'bumper';
    if (n === 'skill') return 'skill';
  }
  return null;
}

function plunge(speed, frames) {
  var W = E.newWorld(speed, 0, 5, 'orbit'), res = null, n;
  W.skill = 0; W.skillOpen = true;
  for (n = 0; n < frames; n++) { E.step(W, { fire: true }); W.events.length = 0; }
  for (n = 0; n < 60 * 5 && !res; n++) {
    E.step(W, {});
    var b = W.balls[0];
    if (!b) { res = 'drain'; break; }
    for (var l = 0; l < 3; l++) if (b.inside['lane' + l]) res = 'lane' + l;
    if (!res) { var f = first(W); if (f && f !== 'skill') res = f; }
    W.events.length = 0;
  }
  return res || 'none';
}

function cradleShot(speed, side, delay, dropsDown) {
  var W = S.world(speed, 11, { kickback: false, dropsDown: dropsDown }), f = W.flippers[side], key = side ? 'right' : 'left', inp = {};
  f.a = f.up; f.on = true;
  S.place(W, f.x + Math.cos(f.up) * f.len * 0.7, f.y + Math.sin(f.up) * f.len * 0.7 - 12, 0, 0);
  inp[key] = true;
  for (var n = 0; n < 150; n++) { E.step(W, inp); W.events.length = 0; }
  var res = null, orbitSide = '';
  for (n = 0; n < 60 * 4 && !res; n++) {
    var on = n >= delay && n < delay + 14, i2 = {}; i2[key] = on;
    E.step(W, i2);
    res = first(W);
    if (res === 'orbit') orbitSide = W.orbitFrom || '?';
    if (!W.balls.length) res = res || 'drain';
    if (!res && n > delay + 20) {   // back on a flipper with nothing hit
      var b = W.balls[0];
      if (b && b.y > 380 && b.vy > 0) res = 'nothing';
    }
    W.events.length = 0;
  }
  return res === 'orbit' ? 'orbit' + orbitSide : (res || 'none');
}

var out = {};
[1, 2, 3].forEach(function (speed) {
  var lanes = { lane0: [], lane1: [], lane2: [] };
  for (var fr = 20; fr <= 54; fr++) { var r = plunge(speed, fr); if (lanes[r]) lanes[r].push(fr); }
  var cr = [{}, {}];
  [0, 1].forEach(function (side) {
    for (var d = 0; d <= 50; d++) {
      var a = cradleShot(speed, side, d, false), b = cradleShot(speed, side, d, true);
      [a, b === 'hangar' ? 'hangar' : null].forEach(function (x) { if (x && x !== 'nothing' && x !== 'none') (cr[side][x] = cr[side][x] || []).push(d); });
    }
  });
  out[speed] = { lanes: lanes, cradle: cr };
  console.log('speed ' + speed + ' plunger: ' + JSON.stringify(lanes));
  ['LEFT ', 'RIGHT'].forEach(function (nm, s) { console.log('  ' + nm + ' cradle: ' + JSON.stringify(cr[s])); });
});
// the middle of the longest run of each target, for pilot.js
function mid(a) {
  if (!a || !a.length) return -1;
  var best = [a[0], a[0]], cur = [a[0], a[0]];
  for (var i = 1; i < a.length; i++) { if (a[i] === cur[1] + 1) cur[1] = a[i]; else cur = [a[i], a[i]]; if (cur[1] - cur[0] > best[1] - best[0]) best = cur.slice(); }
  return Math.round((best[0] + best[1]) / 2);
}
var aim = {};
Object.keys(out).forEach(function (sp) {
  var o = out[sp];
  aim[sp] = {
    lane: [mid(o.lanes.lane0), mid(o.lanes.lane1), mid(o.lanes.lane2)],
    L: { ramp: mid(o.cradle[0].ramp), orbit: mid(o.cradle[0].orbitR || o.cradle[0].orbitL), hangar: mid(o.cradle[0].hangar), drop: mid(o.cradle[0].drop) },
    R: { ramp: mid(o.cradle[1].ramp), orbit: mid(o.cradle[1].orbitL || o.cradle[1].orbitR), hangar: mid(o.cradle[1].hangar), drop: mid(o.cradle[1].drop) }
  };
});
console.log('\nvar AIM = ' + JSON.stringify(aim) + ';');
