/* 365 Pinball Hero - the shot map (15 Oct 2026). Never deployed.
 * What can a player hit, and how precise must the timing be? Two set-ups for each flipper:
 *   cradle - the ball is trapped on a raised flipper and settles; the player lets go, the ball rolls down the flipper,
 *            and the player flips again after a delay (swept in 1/600 s substeps, finer than the 60 Hz input, so the
 *            windows are measured properly in milliseconds)
 *   inlane - the ball comes down the inlane (as from an orbit or the ramp) and is flipped after a delay
 * For each delay it records what the ball reaches FIRST: the left orbit (spinner), the right orbit, the warp ramp (made
 * or rolled back), a drop target, the hangar saucer (with the targets down), a bumper, a top lane, a sling, the
 * drain - or nothing (back down to the flippers). Then it prints each outcome's timing windows.
 *
 *   node tools/pinball/shots.cjs [speed=2] [--detail]          (speed 1 Gentle, 2 Classic, 3 Fast) */
'use strict';
var S = require('./sim.cjs'), E = S.E, T = S.T;
var SUBMS = 1000 / 600;

// set up a ball for one shot; returns the world, with W.__flip(sub) to call when the flip should start
function setup(speed, side, kind, dropsDown, inSpeed) {
  var W = S.world(speed, 11, { kickback: false, dropsDown: dropsDown });
  var f = W.flippers[side], key = side ? 'right' : 'left', inp = {};
  if (kind === 'cradle') {
    // drop the ball on the raised flipper and let it settle into the cradle
    f.a = f.up; f.on = true;   // already up
    var tx = f.x + Math.cos(f.up) * f.len * 0.7, ty = f.y + Math.sin(f.up) * f.len * 0.7 - 12;
    S.place(W, tx, ty, 0, 0);
    inp[key] = true;
    for (var n = 0; n < 150; n++) { E.step(W, inp); W.events.length = 0; }
  } else {
    var x = side ? T.MID * 2 - 38 : 38;
    S.place(W, x, 326, 0, inSpeed || 120);
  }
  return W;
}

// run one shot: let go (cradle), flip after `delay` substeps, follow the ball until something happens
function shot(speed, side, kind, delay, dropsDown, inSpeed, trace) {
  var W = setup(speed, side, kind, dropsDown, inSpeed), key = side ? 'right' : 'left';
  var subs = 0, flipped = false, flipN = -1, res = null, b = W.balls[0], maxV = 0, offV = 0, path = trace ? [] : null;
  W.onSub = function () {
    subs++;
    if (!flipped && subs >= delay) { flipped = true; W.flippers[side].on = true; }
  };
  var onKeys = {};
  for (var n = 0; n < 60 * 5 && !res; n++) {
    var inp = {}; inp[key] = flipped;
    var lanes0 = b.inside.lane0 || b.inside.lane1 || b.inside.lane2;
    E.step(W, inp);
    if (flipped && flipN < 0) flipN = n;
    if (!W.balls.length) { res = 'drain'; break; }
    b = W.balls[0];
    if (path) path.push([+b.x.toFixed(1), +b.y.toFixed(1)]);
    var v = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
    if (flipped && b.y > 300 && b.m === 'free') maxV = Math.max(maxV, v);
    if (flipped && !offV && b.y < 340 && b.m === 'free') offV = v;
    var ev = W.events;
    for (var k = 0; k < ev.length && !res; k++) {
      var e = ev[k], nm = typeof e === 'string' ? e : e.sfx;
      if (nm === 'orbit' || nm === 'loop') res = b.x < T.MID ? 'orbit L' : 'orbit R';
      else if (nm === 'ramp' || nm === 'combo') res = 'RAMP made';
      else if (nm === 'rampfail') res = 'ramp rolled back';
      else if (nm === 'drop') res = 'drop target';
      else if (nm === 'saucer' || nm === 'jackpot') res = 'HANGAR';
      else if (nm === 'bumper') res = 'bumper';
      else if (nm === 'sling') res = flipped && n > 3 ? 'sling' : null;
      else if (nm === 'spin') res = null;
    }
    if (!res && !lanes0 && (b.inside.lane0 || b.inside.lane1 || b.inside.lane2)) res = 'top lane';
    W.events.length = 0;
    // back down at the flippers without reaching anything (or caught on the raised flipper)
    if (!res && flipN >= 0 && n > flipN + 20 && b.y > 380 && b.m === 'free') {
      if (Math.abs(b.vx) + Math.abs(b.vy) < 40 && b.y < 400) res = 'cradled'; else if (b.vy > 0) res = 'nothing';
    }
    if (!res && b.x > T.shooter.x0 + 2 && b.y > 160) res = 'shooter lane';
  }
  return { res: res || 'timeout', offV: offV, maxV: maxV, path: path };
}

function sweep(speed, side, kind, dropsDown, inSpeed, maxMs) {
  var rows = [], maxSub = Math.round((maxMs || 500) / SUBMS);
  for (var d = 0; d <= maxSub; d++) rows.push(shot(speed, side, kind, d, dropsDown, inSpeed));
  return rows;
}
// the windows: runs of the same outcome, in ms
function windows(rows) {
  var out = {}, start = 0;
  for (var i = 1; i <= rows.length; i++) {
    if (i < rows.length && rows[i].res === rows[start].res) continue;
    var r = rows[start].res, len = (i - start) * SUBMS;
    if (!out[r]) out[r] = { total: 0, best: 0, at: 0 };
    out[r].total += len; if (len > out[r].best) { out[r].best = len; out[r].at = start * SUBMS; }
    start = i;
  }
  return out;
}

var MAJOR = ['orbit L', 'orbit R', 'RAMP made', 'drop target', 'HANGAR'];
function map(speed, detail) {
  var cases = [];
  [0, 1].forEach(function (side) {
    [['cradle', 0], ['inlane', 60], ['inlane', 300]].forEach(function (k) {
      [false, true].forEach(function (down) {
        var rows = sweep(speed, side, k[0], down, k[1], k[0] === 'cradle' ? 700 : 1000);
        cases.push({ side: side, kind: k[0] + (k[0] === 'inlane' ? ' ' + k[1] : ''), down: down, rows: rows, win: windows(rows) });
      });
    });
  });
  var best = {};
  cases.forEach(function (c) {
    var name = (c.side ? 'RIGHT ' : 'LEFT  ') + c.kind.padEnd(11) + (c.down ? ' targets down' : ' targets up  ');
    var parts = Object.keys(c.win).sort(function (a, b) { return c.win[b].total - c.win[a].total; }).map(function (r) {
      var w = c.win[r]; return r + ' ' + w.best.toFixed(0) + '/' + w.total.toFixed(0);
    });
    var vs = c.rows.map(function (r) { return r.offV; }).filter(Boolean);
    console.log(name + ' | ' + parts.join(', ') + '   (ball off flipper ' + Math.min.apply(null, vs).toFixed(0) + '-' + Math.max.apply(null, vs).toFixed(0) + ' u/s)');
    Object.keys(c.win).forEach(function (r) {
      if (!best[r] || c.win[r].best > best[r].best) best[r] = { best: c.win[r].best, from: name.trim(), at: c.win[r].at };
    });
    if (detail) {
      var line = '', last = '';
      c.rows.forEach(function (r, i) { if (r.res !== last) { line += ' ' + (i * SUBMS).toFixed(0) + 'ms:' + r.res; last = r.res; } });
      console.log('    ' + line);
    }
  });
  console.log('\nlongest window for each major shot (ms; from):');
  MAJOR.forEach(function (m) { var b = best[m]; console.log('  ' + m.padEnd(12) + (b ? b.best.toFixed(1).padStart(6) + '  ' + b.from + ' at ' + b.at.toFixed(0) + ' ms' : '   ---  NOT REACHED')); });
  return { cases: cases, best: best };
}

if (require.main === module && process.argv[2] !== '--fan') {
  var a = process.argv.slice(2);
  map(+(a[0] || 2), a.indexOf('--detail') >= 0);
}
module.exports = { shot: shot, sweep: sweep, windows: windows, map: map, MAJOR: MAJOR, SUBMS: SUBMS };

// draw a fan of shot paths for view.html: node tools/pinball/shots.cjs --fan <side 0|1> <kind cradle|inlane> [speed] [inSpeed] [fromMs] [toMs] [stepMs]
if (require.main === module && process.argv[2] === '--fan') {
  var fs = require('fs'), path = require('path'), A = process.argv.slice(3);
  var side = +A[0], kind = A[1] || 'cradle', sp = +(A[2] || 2), inS = +(A[3] || 300), from = +(A[4] || 0), to = +(A[5] || 600), st = +(A[6] || 10), dn = A[7] === 'down';
  var cols = { 'orbit L': '#0f0', 'orbit R': '#0f0', 'RAMP made': '#0ff', 'ramp rolled back': '#08f', 'drop target': '#f00', HANGAR: '#ff0', bumper: '#f0f', 'top lane': '#fff', sling: '#f80', nothing: '#666', drain: '#444', timeout: '#333' };
  var paths = [], text = [];
  for (var ms = from; ms <= to; ms += st) {
    var r = shot(sp, side, kind, Math.round(ms / SUBMS), dn, inS, true);
    var p = r.path.slice(0, 90);
    paths.push({ pts: p, col: cols[r.res] || '#888', w: 0.5 });
    console.log(ms + 'ms ' + r.res + ' off ' + r.offV.toFixed(0));
  }
  fs.writeFileSync(path.join(__dirname, 'overlay.js'), 'window.OVERLAY = ' + JSON.stringify({ paths: paths, text: text }) + ';\n');
}
