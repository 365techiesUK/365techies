/* 365 Pinball Hero - draw ball paths for view.html (15 Oct 2026). Never deployed.
 *   node tools/pinball/paths.cjs <speed> <steps> x,y,vx,vy [x,y,vx,vy ...]   (writes overlay.js; prints where each ends) */
'use strict';
var S = require('./sim.cjs'), E = S.E, fs = require('fs'), path = require('path');
var a = process.argv.slice(2), sp = +a[0], steps = +a[1], cols = ['#ff0', '#0ff', '#f0f', '#0f0', '#f80', '#fff', '#f44', '#48f'];
var paths = [];
a.slice(2).forEach(function (spec, k) {
  var v = spec.split(',').map(Number), W = S.world(sp, 3, { kickback: false });
  S.place(W, v[0], v[1], v[2], v[3]);
  var pts = [], seen = [];
  for (var i = 0; i < steps && W.balls.length; i++) {
    E.step(W, {}); var b = W.balls[0]; if (b) pts.push([+b.x.toFixed(1), +b.y.toFixed(1)]);
    W.events.forEach(function (e) { var n = typeof e === 'string' ? e : e.sfx; if (n && seen[seen.length - 1] !== n && !/rubber|wall/.test(n)) seen.push(n); });
    W.events.length = 0;
  }
  paths.push({ pts: pts, col: cols[k % cols.length], w: 0.6 });
  console.log(spec + ' -> ' + seen.join(' ') + (W.balls[0] ? ' | ends ' + W.balls[0].x.toFixed(0) + ',' + W.balls[0].y.toFixed(0) : ' | drained'));
});
fs.writeFileSync(path.join(__dirname, 'overlay.js'), 'window.OVERLAY = ' + JSON.stringify({ paths: paths }) + ';\n');
