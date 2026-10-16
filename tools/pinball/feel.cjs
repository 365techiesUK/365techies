/* 365 Pinball Hero - how the table feels, in real units (15 Oct 2026). Never deployed.
 * A real table is about 20.25 in (514 mm) wide; ours is 270 units, so 1 unit = 1.9 mm and 525 units a second = 1 m/s.
 * Reports, for each speed: the flipper's swing time and tip speed, the ball's speed off the flipper (from the cradle
 * sweep in shots.cjs), what a pop bumper and a slingshot give the ball, and how long a ball takes to roll the length
 * of the table. Real pinball for comparison: a flipper swings up in ~30-50 ms; a ball leaves a flipper at ~3-5 m/s.
 *
 *   node tools/pinball/feel.cjs */
'use strict';
var S = require('./sim.cjs'), E = S.E, T = S.T, Sh = require('./shots.cjs');   // (Ember Peak; --orbit for the old table)
var MS = 0.5144 / 270;   // metres a unit

function ms(v) { return (v * MS).toFixed(2) + ' m/s'; }
function flipper(sp) {
  var W = S.world(sp, 1, {}), f = W.flippers[0], n = 0, wmax = 0, up = 0, down = 0, going = 'up';
  W.onSub = function () {
    n++; wmax = Math.max(wmax, Math.abs(f.w));
    if (going === 'up' && !up && f.a <= f.up + 1e-6) up = n;
    if (going === 'down' && !down && f.a >= f.rest - 1e-6) down = n;
  };
  for (var i = 0; i < 30; i++) E.step(W, { left: true });
  going = 'down'; n = 0;
  for (i = 0; i < 30; i++) E.step(W, {});
  return { upMs: up / 0.6, downMs: down / 0.6, tip: wmax * f.len };
}
function kick(sp, what) {   // a slow ball into a bumper / a sling face: its speed straight after
  var W = S.world(sp, 1, {}), b;
  var bm = T.bumpers[2], sl = T.slings[0];
  if (what === 'bumper') b = S.place(W, bm[0], bm[1] - 15, 0, 60);
  else b = S.place(W, sl.a[0] + 26, sl.a[1] + 14, -120, 40);
  var best = 0;
  for (var i = 0; i < 40; i++) {
    E.step(W, {}); if (!W.balls.length) break;
    var hit = W.events.some(function (e) { return e && e.sfx === what; });
    W.events.length = 0;
    if (hit) { b = W.balls[0]; best = Math.sqrt(b.vx * b.vx + b.vy * b.vy); break; }
  }
  return best;
}
function rollTime(sp) {   // from rest above the shore's approach line to the flipper zone, straight down the middle
  var W = S.world(sp, 1, { noGeyser: true }), y0 = T.storeys[0].approach - 70, y1 = T.flippers[0].y - 24; S.place(W, T.MID, y0, 0, 0);
  for (var i = 0; i < 600; i++) { E.step(W, {}); W.events.length = 0; if (W.balls[0].y > y1) break; }
  return i / 60;
}
[1, 2, 3].forEach(function (sp) {
  var f = flipper(sp), rows = [];
  T.flippers.forEach(function (f, fi) { if (!f.storey) rows = rows.concat(Sh.sweep(sp, fi, 'cradle', false, 0, 700)); });
  var v = rows.map(function (r) { return r.offV; }).filter(function (x) { return x > 300; }).sort(function (a, b) { return a - b; });
  var med = v[Math.floor(v.length / 2)], p90 = v[Math.floor(v.length * 0.9)], mx = v[v.length - 1];
  console.log(E.SPEEDS[sp].name + ' (g ' + E.SPEEDS[sp].g + '):');
  console.log('  flipper up ' + f.upMs.toFixed(0) + ' ms, down ' + f.downMs.toFixed(0) + ' ms, tip ' + f.tip.toFixed(0) + ' u/s = ' + ms(f.tip));
  console.log('  ball off the flipper (cradle shots): median ' + med.toFixed(0) + ' u/s = ' + ms(med) + ', 90% ' + ms(p90) + ', best ' + ms(mx));
  console.log('  pop bumper kick ' + ms(kick(sp, 'bumper')) + ', slingshot ' + ms(kick(sp, 'sling')) + '; middle of the table to the flippers from rest ' + rollTime(sp).toFixed(2) + ' s');
});
