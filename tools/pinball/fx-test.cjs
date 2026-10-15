/* 365 Pinball Hero - tests for the effects, the demo pilot and the attract mode (15 Oct 2026, M2a). Never deployed.
 * Real engine events from whole bot games go through fx.js at 60 frames a second of pretend time, and the checks are:
 * pops land where the points were won and show them, sparks and pops stay within their caps, the background light dips
 * on a drain and goes out on a tilt, never more than 3 whole-table flashes in any second, never a red one, the shake
 * stays within 1.5 units, reduced motion means no shake and no flash, update() never changes the world, the pilot is
 * deterministic and keeps a ball alive, and the attract mode steps the title world in place at 60 steps a second.
 *
 *   node tools/pinball/fx-test.cjs            (about 10 seconds; exits 1 on a failure) */
'use strict';
var path = require('path'), G = path.join(__dirname, '../../games/pinball/');
var E = require(G + 'engine.js'), Lm = require(G + 'lamps.js'), FX = require(G + 'fx.js'), Pilot = require(G + 'pilot.js');
var fails = 0, passes = 0;
function ok(cond, what) { if (cond) passes++; else { fails++; console.log('FAIL: ' + what); } }
var FRAME = 1000 / 60, ids = {};
Lm.list.forEach(function (l) { ids[l.id] = l; });
function red(c) { var m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(c); if (!m) return false; var r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16); return r > 150 && g < 140 && b < 200; }

// ------------------------------------------------------------ whole bot games through the effects
function playGame(speed, seed, maxSteps, watch) {
  FX.reset(); FX.reduce = false;
  var W = E.newWorld(speed, 0, seed), t = (playGame.t || 0) + 5000, n = 0;
  while (!W.over && n < maxSteps) {
    E.step(W, Pilot.input(W)); n++;
    var ev = W.events.slice();
    if (W.events.length) FX.events(W, W.events);
    W.events.length = 0;
    t += FRAME;
    var st = FX.update(W, t, 'play');
    if (watch) watch(W, st, t, ev);
  }
  playGame.t = t;
  return W;
}
var stats = { pops: 0, maxPops: 0, maxSparks: 0, flashes: [], maxShake: 0, giMin: 1, red: 0, badLamp: 0, badPop: 0, popsAt: 0, scored: 0, drains: 0, dips: 0 };
var lastFlash = 0, seenPops = new Set();
[1, 2, 3].forEach(function (speed) {
  playGame(speed, 4242 + speed, 60 * 60 * 4, function (W, st, t, ev) {
    stats.maxPops = Math.max(stats.maxPops, st.pops.length);
    stats.maxSparks = Math.max(stats.maxSparks, st.sparks.length);
    stats.maxShake = Math.max(stats.maxShake, Math.abs(st.shake.x), Math.abs(st.shake.y));
    stats.giMin = Math.min(stats.giMin, st.gi);
    if (st.flash > lastFlash + 0.05) { stats.flashes.push(t); if (red(st.flashColor)) stats.red++; }
    lastFlash = st.flash;
    for (var id in st.lamps) { var v = st.lamps[id]; if (!ids[id] || !(v >= 0 && v <= 1)) stats.badLamp++; }
    st.pops.forEach(function (p) {
      if (!isFinite(p.x) || !isFinite(p.y) || !isFinite(p.z) || !(p.a >= 0 && p.a <= 1) || !(p.s > 0) || !p.text) stats.badPop++;
      if (!seenPops.has(p)) { seenPops.add(p); stats.pops++; if (p.x >= 0 && p.x <= 270 && p.y >= 0 && p.y <= 446) stats.popsAt++; }
    });
    if (ev.indexOf('drain') >= 0 && W.balls.length === 0 && ev.indexOf('save') < 0) stats.drains++;
  });
});
// the most flashes in any one second
var worst = 0;
stats.flashes.forEach(function (a, i) { var c = 0; for (var j = i; j < stats.flashes.length && stats.flashes[j] < a + 1000; j++) c++; worst = Math.max(worst, c); });
console.log('bot games: ' + stats.pops + ' pops (max ' + stats.maxPops + ' at once), max ' + stats.maxSparks + ' sparks, ' + stats.flashes.length + ' flashes (worst second ' + worst + '), max shake ' + stats.maxShake.toFixed(2) + ', lowest GI ' + stats.giMin.toFixed(2));
ok(stats.pops > 50, 'score pops appear in bot games (' + stats.pops + ')');
ok(stats.popsAt === stats.pops, 'every pop is on the table');
ok(stats.badPop === 0, 'pops are well formed');
ok(stats.maxPops <= 14 && stats.maxSparks <= 240, 'pops and sparks stay within their caps');
ok(worst <= 3, 'never more than 3 whole-table flashes in a second (worst ' + worst + ')');
ok(stats.red === 0, 'never a red flash');
ok(stats.maxShake <= 1.5, 'shake within 1.5 units');
ok(stats.badLamp === 0, 'lamp extras are real lamp ids, 0..1');

// ------------------------------------------------------------ single events, on a quiet world
function quietWorld() { FX.reset(); FX.reduce = false; var W = E.newWorld(2, 0, 9); return W; }
function frames(W, t0, n, mode) { var st; for (var i = 1; i <= n; i++) st = FX.update(W, t0 + i * FRAME, mode || 'play'); return st; }
(function bumper() {
  var W = quietWorld(); FX.update(W, 0, 'play');
  var b = E.BUMPERS[1];
  W.score += 100; FX.events(W, [{ sfx: 'bumper', i: 1 }]);
  var st = frames(W, 0, 3);
  var p = st.pops[0];
  ok(p && p.text === '100' && Math.abs(p.x - b.x) < 1 && Math.abs(p.y - b.y) < 1, 'a bumper hit pops "100" at the bumper');
  ok(st.sparks.length >= 10 && st.sparks.every(function (s) { return Math.abs(s.x - b.x) < 30 && Math.abs(s.y - b.y) < 30; }), 'a bumper hit throws sparks from the bumper');
  var near = Object.keys(st.lamps).filter(function (id) { return st.lamps[id] > 0; });
  ok(near.length >= 2 && near.every(function (id) { var l = ids[id]; return Math.hypot(l.x - b.x, l.y - b.y) < 60; }), 'a bumper hit flashes the lamps round that bumper (' + near.join(' ') + ')');
  W.score += 100; FX.events(W, [{ sfx: 'bumper', i: 1 }]);
  st = frames(W, 3 * FRAME, 2);
  ok(st.pops.length === 1 && st.pops[0].text === '200', 'quick repeats add up in one pop');
  st = frames(W, 5 * FRAME, 90);
  ok(st.pops.length === 0 && st.sparks.length === 0, 'pops and sparks are gone after 1.5 s');
})();
(function sling() {
  var W = quietWorld(); FX.update(W, 0, 'play');
  W.score += 10; FX.events(W, [{ sfx: 'sling', side: -1 }]);
  var seen = {}, order = [];
  for (var i = 1; i < 22; i++) { var st = FX.update(W, i * FRAME, 'play'); for (var id in st.lamps) if (st.lamps[id] > 0.5 && !seen[id]) { seen[id] = 1; order.push(id); } }
  ok(order.length >= 2, 'a sling runs a chase along its lamps (' + order.join(' ') + ')');
})();
(function ramp() {
  var W = quietWorld(); FX.update(W, 0, 'play');
  W.score += 5000; FX.events(W, ['ramp']);
  var st = frames(W, 0, 6), p = st.pops[0];
  ok(p && p.big && p.text === '5,000', 'a ramp makes a big pop of 5,000');
  var lit = 0, ord = []; for (var i = 7; i < 70; i++) { st = FX.update(W, i * FRAME, 'play'); for (var id in st.lamps) if (st.lamps[id] > 0.6 && ord.indexOf(id) < 0) ord.push(id); }
  ok(ord.length >= 3 && ord.indexOf('ramp.p2') >= 0 && ord.indexOf('ramp') > ord.indexOf('ramp.p2'), 'a ramp sweeps up its arrow (' + ord.slice(0, 6).join(' ') + ')');
})();
(function drain() {
  var W = quietWorld(); FX.update(W, 0, 'play');
  W.balls.length = 0; FX.events(W, ['drain']);
  var st = frames(W, 0, 18);
  ok(st.gi <= 0.36, 'a drain dips the GI to about 0.3 (' + st.gi.toFixed(2) + ')');
  st = frames(W, 18 * FRAME, 150);
  ok(st.gi >= 0.97, 'and it recovers (' + st.gi.toFixed(2) + ')');
  W.balls.length = 0; FX.events(W, ['drain', 'save']);
  st = frames(W, 168 * FRAME, 10);
  ok(st.gi > 0.55, 'a saved ball does not dip the GI right down (' + st.gi.toFixed(2) + ')');
  var blueOnly = Object.keys(st.lamps).filter(function (id) { return st.lamps[id] > 0; }).every(function (id) { return /^#(59b4ff|3fe0ff)/i.test(ids[id].color); });
  ok(blueOnly, 'the ball save sweep lights only blue lamps');
})();
(function tilt() {
  var W = quietWorld(); FX.update(W, 0, 'play');
  W.tilted = true; FX.events(W, ['tilt']);
  var st = frames(W, 0, 30);
  ok(st.gi < 0.02 && st.flash === 0, 'a tilt turns the GI off, no flash');
  ok(Object.keys(st.lamps).every(function (id) { return st.lamps[id] === 0; }), 'and no lamp extras while tilted');
})();
(function flashRate() {
  var W = quietWorld(); FX.update(W, 0, 'play');
  var t = 0, starts = [], last = 0;
  for (var i = 0; i < 180; i++) {   // a jackpot every frame for 3 seconds
    FX.events(W, ['jackpot', 'skill', { sfx: 'combo', n: 3 }]);
    t += FRAME; var st = FX.update(W, t, 'play');
    if (st.flash > last + 0.05) starts.push(t); last = st.flash;
    if (red(st.flashColor)) starts.red = 1;
  }
  var w = 0; starts.forEach(function (a, i) { var c = 0; for (var j = i; j < starts.length && starts[j] < a + 1000; j++) c++; w = Math.max(w, c); });
  ok(w <= 3 && starts.length >= 6, 'flashes are limited to 3 a second even when spammed (' + starts.length + ' in 3 s, worst ' + w + ')');
  ok(!starts.red, 'no red flash');
})();
(function reducedMotion() {
  var W = quietWorld(); FX.reduce = true; FX.update(W, 0, 'play');
  var mx = 0, fl = 0;
  for (var i = 0; i < 60; i++) { FX.events(W, i % 10 ? ['nudge'] : ['jackpot', 'extra']); var st = FX.update(W, (i + 1) * FRAME, 'play'); mx = Math.max(mx, Math.abs(st.shake.x), Math.abs(st.shake.y)); fl = Math.max(fl, st.flash); }
  ok(mx === 0 && fl === 0, 'reduced motion: no shake, no flash');
  FX.reduce = false;
  W = quietWorld(); FX.update(W, 0, 'play'); W.frame = 3; FX.events(W, ['nudge']);
  var m2 = 0; for (i = 1; i < 30; i++) { var s2 = FX.update(W, i * FRAME, 'play'); m2 = Math.max(m2, Math.abs(s2.shake.x)); }
  ok(m2 > 0.5 && m2 <= 1.5, 'a nudge shakes the table (' + m2.toFixed(2) + ' units)');
})();
(function readOnly() {
  var W = E.newWorld(1, 0, 77); FX.reset();
  for (var i = 0; i < 600; i++) { E.step(W, Pilot.input(W)); if (W.events.length) FX.events(W, W.events); W.events.length = 0; }
  var before = JSON.stringify(W);
  for (i = 0; i < 120; i++) FX.update(W, i * FRAME, i % 2 ? 'play' : 'title');
  ok(JSON.stringify(W) === before, 'update() never changes the world');
})();
(function paused() {
  var W = quietWorld(); FX.update(W, 0, 'play'); W.score += 5000; FX.events(W, ['ramp']);
  var st = frames(W, 0, 5), age = st.pops[0].age;
  st = frames(W, 5 * FRAME, 120, 'paused');
  ok(st.pops.length && st.pops[0].age === age, 'effects hold still while paused');
})();

// ------------------------------------------------------------ the pilot
(function pilot() {
  function run(seed) { var W = E.newWorld(2, 0, seed), n = 0; while (!W.over && n < 60 * 60 * 6) { E.step(W, Pilot.input(W)); W.events.length = 0; n++; } return { n: n, score: W.score, s: JSON.stringify(W.stats) }; }
  var a = run(31), b = run(31);
  ok(a.n === b.n && a.score === b.score && a.s === b.s, 'the pilot is deterministic for a given world');
  var tot = 0, balls = 0, ramps = 0, hang = 0;
  for (var g = 0; g < 6; g++) { var W = E.newWorld(1, 0, 500 + g), n = 0; while (!W.over && n < 60 * 60 * 15) { E.step(W, Pilot.input(W)); W.events.length = 0; n++; } tot += n / 60; balls += W.total; ramps += W.stats.ramps; hang += W.stats.saucers; }
  console.log('pilot on Gentle: ' + (tot / balls).toFixed(0) + ' s a ball, ' + (ramps / 6).toFixed(1) + ' ramps and ' + (hang / 6).toFixed(1) + ' hangars a game');
  ok(tot / balls > 25, 'the pilot keeps a ball alive for more than 25 s on average');
  ok(ramps > 6 && hang > 6, 'the pilot makes ramps and hangars');
})();

// ------------------------------------------------------------ the attract mode (demo.js needs a window)
(function attract() {
  global.window = { PinEngine: E, PinPilot: Pilot, PinFX: FX };
  require(G + 'demo.js');
  var D = global.window.PinDemo, W = E.newWorld(1, 0, 5); W.demo = true;
  var ref = W, t = 1000, evSeen = 0, real = FX.events;
  FX.events = function (w, l) { evSeen += l.length; return real(w, l); };
  ok(D.frame(W, t, 'play') === null, 'outside the title it does nothing');
  for (var i = 0; i < 60 * 30; i++) { t += FRAME; D.frame(W, t, 'title'); }
  ok(W.frame >= 60 * 30 - 4 && W.frame <= 60 * 30 + 4, 'the title world is stepped 60 times a second (' + W.frame + ' steps in 30 s)');
  ok(W.events.length === 0 && evSeen > 20, 'events go to the effects and are cleared (' + evSeen + ')');
  // jump to 100 s: a fresh game in the same object
  var g0 = D.games;
  for (i = 0; i < 60 * 80; i++) { t += FRAME; D.frame(W, t, 'title'); }
  ok(D.games > g0 && W === ref && W.demo === true, 'after ~90 s a fresh demo game starts in the same world object (games ' + D.games + ')');
  W.over = true; for (i = 0; i < 200; i++) { t += FRAME; D.frame(W, t, 'title'); }
  ok(!W.over && W.demo === true, 'a finished demo game is replaced');
  t += 5000; var f0 = W.frame; D.frame(W, t, 'title');
  ok(W.frame - f0 <= 4, 'a long gap never runs a burst of steps');
  FX.events = real;
})();

console.log(passes + ' passed, ' + fails + ' failed');
process.exit(fails ? 1 : 0);
