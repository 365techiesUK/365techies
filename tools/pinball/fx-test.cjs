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
Lm.forTable('orbit').list.forEach(function (l) { ids[l.id] = l; });
function red(c) { var m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(c); if (!m) return false; var r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16); return r > 150 && g < 140 && b < 200; }

// ------------------------------------------------------------ whole bot games through the effects
function playGame(speed, seed, maxSteps, watch) {
  FX.reset(); FX.reduce = false;
  var W = E.newWorld(speed, 0, seed, 'orbit'), t = (playGame.t || 0) + 5000, n = 0;
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
ok(worst <= 2, 'never more than 2 whole-table flashes in a second (worst ' + worst + ')');   // (wave 3: 2 a second, was 3)
ok(stats.red === 0, 'never a red flash');
ok(stats.maxShake <= 1.5, 'shake within 1.5 units');
ok(stats.badLamp === 0, 'lamp extras are real lamp ids, 0..1');

// ------------------------------------------------------------ single events, on a quiet world
function quietWorld() { FX.reset(); FX.reduce = false; var W = E.newWorld(2, 0, 9, 'orbit'); return W; }
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
  ok(w <= 2 && starts.length >= 5, 'flashes are limited to 2 a second even when spammed (' + starts.length + ' in 3 s, worst ' + w + ')');
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
  var W = E.newWorld(1, 0, 77, 'orbit'); FX.reset();
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
  function run(seed) { var W = E.newWorld(2, 0, seed, 'orbit'), n = 0; while (!W.over && n < 60 * 60 * 6) { E.step(W, Pilot.input(W)); W.events.length = 0; n++; } return { n: n, score: W.score, s: JSON.stringify(W.stats) }; }
  var a = run(31), b = run(31);
  ok(a.n === b.n && a.score === b.score && a.s === b.s, 'the pilot is deterministic for a given world');
  var tot = 0, balls = 0, ramps = 0, hang = 0;
  for (var g = 0; g < 6; g++) { var W = E.newWorld(1, 0, 500 + g, 'orbit'), n = 0; while (!W.over && n < 60 * 60 * 15) { E.step(W, Pilot.input(W)); W.events.length = 0; n++; } tot += n / 60; balls += W.total; ramps += W.stats.ramps; hang += W.stats.saucers; }
  console.log('pilot on Gentle: ' + (tot / balls).toFixed(0) + ' s a ball, ' + (ramps / 6).toFixed(1) + ' ramps and ' + (hang / 6).toFixed(1) + ' hangars a game');
  ok(tot / balls > 25, 'the pilot keeps a ball alive for more than 25 s on average');
  ok(ramps > 6 && hang > 6, 'the pilot makes ramps and hangars');
})();

// ------------------------------------------------------------ the attract mode (demo.js needs a window)
(function attract() {
  global.window = { PinEngine: E, PinPilot: Pilot, PinFX: FX };
  require(G + 'demo.js');
  var D = global.window.PinDemo, W = E.newWorld(1, 0, 5, 'orbit'); W.demo = true;
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

// ============================================================ Ember Peak (16 Oct 2026, the next-gen spectacle)
var LE = Lm.forTable('ember'), idsE = {};
LE.list.forEach(function (l) { idsE[l.id] = l; });
var BE = E.table('ember');
function emberWorld(seed) { FX.reset(); FX.reduce = false; FX.quiet = null; return E.newWorld(2, 0, seed || 9, 'ember'); }
function frameRun(W, t0, n, mode) { var st; for (var i = 1; i <= n; i++) st = FX.update(W, t0 + i * FRAME, mode || 'play'); return st; }
function moveOf(st) { return Math.max(Math.abs(st.table.pitch), Math.abs(st.table.dy), Math.abs(st.table.roll)); }
function hasKind(st, kind, min) { return st.bursts.some(function (b) { return b.kind === kind && b.n >= (min || 1); }); }

// whole bot games on Ember Peak: caps, flash rate, never red, table movement within its limits and ONLY while quiet
(function emberGames() {
  var es = { pops: 0, maxPops: 0, maxSparks: 0, maxBursts: 0, maxShocks: 0, flashes: [], red: 0, badLamp: 0, maxShake: 0, maxMove: { pitch: 0, dy: 0, roll: 0 },
    movedInApproach: 0, shookInApproach: 0, giMin: 1, giMax: 0, kinds: {}, seen: {}, moved: 0 };
  var lastF = 0, seen = new Set(), t = 100000;
  [1, 3].forEach(function (speed) {
    FX.reset(); FX.reduce = false; FX.quiet = null;
    var W = E.newWorld(speed, 0, 777 + speed, 'ember'), n = 0, nudgeT = -1e9;
    while (!W.over && n < 60 * 60 * 5) {
      E.step(W, Pilot.input(W)); n++;
      if (W.events.length) {
        W.events.forEach(function (e) { var nm = typeof e === 'string' ? e : e && e.sfx; if (nm) es.seen[nm] = (es.seen[nm] || 0) + 1; if (nm === 'nudge') nudgeT = t; });
        FX.events(W, W.events);
      }
      W.events.length = 0;
      t += FRAME;
      var st = FX.update(W, t, 'play');
      st.bursts.forEach(function (b) { es.kinds[b.kind] = (es.kinds[b.kind] || 0) + b.n; });
      es.maxBursts = Math.max(es.maxBursts, st.bursts.length); es.maxShocks = Math.max(es.maxShocks, st.shocks.length);
      st.bursts.length = 0; st.shocks.length = 0;   // (what the renderer does each frame)
      es.maxPops = Math.max(es.maxPops, st.pops.length); es.maxSparks = Math.max(es.maxSparks, st.sparks.length);
      es.maxShake = Math.max(es.maxShake, Math.abs(st.shake.x), Math.abs(st.shake.y));
      ['pitch', 'dy', 'roll'].forEach(function (k) { es.maxMove[k] = Math.max(es.maxMove[k], Math.abs(st.table[k])); });
      if (moveOf(st) > 0.05) es.moved++;
      es.giMin = Math.min(es.giMin, st.gi); es.giMax = Math.max(es.giMax, st.gi);
      if (st.flash > lastF + 0.05) { es.flashes.push(t); if (red(st.flashColor)) es.red++; }
      lastF = st.flash;
      var appr = W.balls.some(function (b) { return E.inApproach(W, b) >= 0; });
      if (appr && moveOf(st) > 0.05) es.movedInApproach++;
      if (appr && t - nudgeT > 400 && (Math.abs(st.shake.x) > 0.01 || Math.abs(st.shake.y) > 0.01)) es.shookInApproach++;
      for (var id in st.lamps) { var v = st.lamps[id]; if (!idsE[id] || !(v >= 0 && v <= 1)) es.badLamp++; }
      st.pops.forEach(function (p) { if (!seen.has(p)) { seen.add(p); es.pops++; } });
    }
  });
  var worst = 0;
  es.flashes.forEach(function (a, i) { var c = 0; for (var j = i; j < es.flashes.length && es.flashes[j] < a + 1000; j++) c++; worst = Math.max(worst, c); });
  console.log('Ember bot games: events ' + JSON.stringify(es.seen));
  console.log('  ' + es.pops + ' pops, max ' + es.maxSparks + ' sparks, ' + es.flashes.length + ' flashes (worst second ' + worst + '), max shake ' + es.maxShake.toFixed(2) +
    ', GI ' + es.giMin.toFixed(2) + '-' + es.giMax.toFixed(2) + ', table moved in ' + es.moved + ' frames (max pitch ' + es.maxMove.pitch.toFixed(2) + ', dy ' + es.maxMove.dy.toFixed(2) + ', roll ' + es.maxMove.roll.toFixed(2) + '), particles ' + JSON.stringify(es.kinds));
  ok(es.pops > 30, 'Ember: score pops appear (' + es.pops + ')');
  ok(es.maxPops <= 14 && es.maxSparks <= 240 && es.maxBursts <= 48 && es.maxShocks <= 6, 'Ember: pops, sparks, bursts and shocks stay within their caps');
  ok(worst <= 2 && es.red === 0, 'Ember: at most 2 flashes a second (worst ' + worst + '), never red');
  ok(es.maxShake <= 1.5, 'Ember: shake within 1.5 units');
  ok(es.maxMove.pitch < 2 && es.maxMove.dy < 3 && es.maxMove.roll < 1, 'Ember: table movement within pitch 2, dy 3, roll 1');
  ok(es.movedInApproach === 0, 'Ember: the table never moves while a ball is in a flipper approach zone (' + es.movedInApproach + ' frames)');
  ok(es.shookInApproach === 0, 'Ember: hits never shake the camera while a ball is in an approach zone (' + es.shookInApproach + ' frames)');
  ok(es.badLamp === 0, 'Ember: lamp extras are Ember lamp ids, 0..1');
  ok(es.kinds.sparks > 0 && es.kinds.steam > 0, 'Ember: bot games make particle bursts');
})();

// a full eruption, step by step: the ash cloud (GI down, ash rising, the table swelling), then the flood
(function eruption() {
  var W = emberWorld(), V = W.toys.volcano, b = W.balls[0];
  FX.update(W, 0, 'play');
  b.m = 'held'; b.at = 'crater'; b.x = V.x = BE.T.volcano.x; b.y = BE.T.volcano.y;
  V.busy = true; V.release = W.frame + 165; V.land = V.release + 205;
  FX.events(W, ['crater', 'lavaopen']);
  var st = frameRun(W, 0, 6), sawAsh = hasKind(st, 'ash');
  ok(FX.debug().shows.indexOf('ash') >= 0, 'full crater: the ash cloud show runs');
  var giLow = 1, dyMax = 0, ash = 0;
  for (var i = 6; i < 160; i++) { st = FX.update(W, (i + 1) * FRAME, 'play'); giLow = Math.min(giLow, st.gi); dyMax = Math.max(dyMax, st.table.dy); if (hasKind(st, 'ash')) ash++; st.bursts.length = 0; }
  ok(giLow < 0.25, 'the ash cloud blacks the table out (GI ' + giLow.toFixed(2) + ')');
  ok(st.base < 0.3, 'the base lamps dip under the ash (' + st.base.toFixed(2) + ')');
  ok(sawAsh || ash > 5, 'ash keeps rising from the crater (' + ash + ' bursts)');
  ok(dyMax > 0.5 && dyMax <= 3, 'the table swells while quiet (dy ' + dyMax.toFixed(2) + ')');
  ok(st.post.vignette > 0.4 && st.post.sat < 0.8, 'the ash darkens the edges and greys the picture');
  var gauge = LE.groups.gauge.map(function (k) { return LE.list[k].id; });
  ok(gauge.some(function (id) { return st.lamps[id] > 0.5; }), 'the gauge pulses through the ash');
  // release: the eruption
  b.m = 'ramp'; b.carry = 'sky'; b.ct = 0; b.at = null; V.busy = false;
  st.shocks.length = 0; st.bursts.length = 0; FX.events(W, ['erupt']);
  var t0 = 161 * FRAME, giHi = 0, pitchHi = 0, fr = 0, shocks = 0, lava = 0, debris = 0, flashC = null, words = [], flashN = 0, flashHi = 0, lastF = 0, plated = false;
  for (i = 0; i < 60; i++) {
    st = FX.update(W, t0 + i * FRAME, 'play');
    giHi = Math.max(giHi, st.gi); pitchHi = Math.max(pitchHi, st.table.pitch); fr = Math.max(fr, st.post.fringe);
    shocks += st.shocks.length; st.shocks.length = 0;
    st.bursts.forEach(function (q) { if (q.kind === 'lava') lava += q.n; if (q.kind === 'debris') debris += q.n; }); st.bursts.length = 0;
    if (st.flash > 0.2) flashC = st.flashColor;
    if (st.flash > lastF + 0.05) flashN++; lastF = st.flash; flashHi = Math.max(flashHi, st.flash);
    st.pops.forEach(function (p) { if (p.text === 'ERUPTION!' && p.plate) plated = true; });
    st.pops.forEach(function (p) { if (p.word && words.indexOf(p.text) < 0) words.push(p.text); });
  }
  ok(giHi >= 1.1 && giHi <= 1.2, 'the eruption floods the table with light, at most 1.2 (GI ' + giHi.toFixed(2) + ')');   // (wave 3 grade cap: was > 1.25)
  ok(lava >= 600 && debris >= 200, 'a lava fountain and rock debris (' + lava + ' lava, ' + debris + ' debris)');
  ok(shocks >= 2, 'two shockwaves (' + shocks + ')');
  ok(pitchHi > 1 && pitchHi <= 2, 'the table bucks (pitch ' + pitchHi.toFixed(2) + ' degrees)');
  ok(fr > 0.5, 'a colour-fringe spike (' + fr.toFixed(2) + ')');
  ok(flashC && !red(flashC), 'the eruption flash is not red (' + flashC + ')');
  ok(flashHi > 0.2 && flashHi <= 0.55 && flashN === 1, 'one eruption flash, at most 0.55 (' + flashN + ' at ' + flashHi.toFixed(2) + ')');
  ok(!plated && words.indexOf('ERUPTION!') < 0, 'no ERUPTION! word pop: the display says FULL ERUPTION, one copy (fix pass, review B2)');
  st = frameRun(W, t0 + 60 * FRAME, 150);
  ok(st.gi <= 1.02 && st.post.fringe === 0, 'and it settles (GI ' + st.gi.toFixed(2) + ')');
  // the ball nears a flipper: the table settles to level at once
  b.m = 'ramp'; b.ct = 205 * E.SUB; FX.events(W, ['rail']); kickNow();
  function kickNow() { FX.quiet = function () { return true; }; FX.events(W, ['erupt']); }
  st = frameRun(W, t0 + 210 * FRAME, 8);
  var moving = moveOf(st);
  FX.quiet = null; b.m = 'free'; b.carry = null; b.x = 35; b.y = 545; b.vx = 0; b.vy = 100;
  st = frameRun(W, t0 + 218 * FRAME, 12);
  ok(moving > 0.3 && moveOf(st) < 0.05, 'a ball in the approach zone settles the table within 0.2 s (' + moving.toFixed(2) + ' -> ' + moveOf(st).toFixed(3) + ')');
})();

// every new event gets a reaction: lamps, particles or both, in the right place
(function emberEvents() {
  var list = ['crater', 'erupt', 'rail', 'railout', 'puff', 'geyser', { sfx: 'crab', i: 0 }, 'lava', 'lavaopen', 'lavaclose', 'quake', 'overload', { sfx: 'pressure', level: 'full' }, { sfx: 'pressure', level: 'warn' },
    // wave 3: every new event of CONTRACT v1
    'rumble', 'locklit', 'lock', 'eruptlit', 'mbstart', 'mbend', 'jackpot', 'superjackpot', 'addaball', 'plugup', 'plugdown', 'plugsave', { sfx: 'combo', n: 2 }, { sfx: 'combo', n: 4 }, 'supercombo',
    'modelit', 'modestart', 'modedone', 'modefail', 'missiondone', 'stageclear', 'divelit', 'dive', 'ascend', 'chamberclear', 'lavarise', 'sealed', 'unsealed', 'bosshit', 'bossphase', 'bossdown'];
  var none = [];
  list.forEach(function (e) {
    var W = emberWorld(); FX.update(W, 0, 'play');
    FX.events(W, [e]);
    var st = frameRun(W, 0, 4), lit = Object.keys(st.lamps).filter(function (id) { return st.lamps[id] > 0; });
    if (!lit.length && !st.bursts.length) none.push(typeof e === 'string' ? e : e.sfx + (e.level || ''));
  });
  ok(none.length === 0, 'every Ember event lights lamps or throws particles (none: ' + none.join(' ') + ')');
  var W = emberWorld(); FX.update(W, 0, 'play'); FX.events(W, ['geyser']);
  var st = frameRun(W, 0, 20);
  ok(hasKind(st, 'steam', 200), 'the geyser throws a steam column');
  W = emberWorld(); FX.update(W, 0, 'play'); W.lit.lava = [0, 40]; FX.events(W, ['lava']);
  st = frameRun(W, 0, 3);
  var lb = st.bursts.filter(function (q) { return q.kind === 'lava'; })[0];
  ok(lb && lb.x > BE.T.MID, 'a right lava lane shot erupts on the right (' + (lb && lb.x.toFixed(0)) + ')');
  W = emberWorld(); FX.update(W, 0, 'play'); FX.events(W, ['lavaopen']);
  st = frameRun(W, 0, 3);
  ok(st.bursts.filter(function (q) { return q.kind === 'lava'; }).length === 2, 'the lava gates rising: lava at both gates');
  W = emberWorld(); FX.update(W, 0, 'play'); FX.events(W, [{ sfx: 'drop', i: 2 }]);
  st = frameRun(W, 0, 2);
  ok(hasKind(st, 'debris'), 'an obsidian target bursts into rock');
})();

// the quake: a rumble, and the table leaning with the pull only while quiet
(function quake() {
  var W = emberWorld(), Q = W.toys.quake, b = W.balls[0];
  b.x = 120; b.y = 120; b.m = 'free';   // high on the summit, out of every approach zone
  FX.update(W, 0, 'play'); FX.quiet = function () { return true; };
  Q.t = 30; Q.gx = 0.16 * W.g;
  FX.events(W, ['quake']);
  var roll = 0, sh = 0;
  for (var i = 1; i < 30; i++) { var st = FX.update(W, i * FRAME, 'play'); roll = Math.max(roll, Math.abs(st.table.roll)); sh = Math.max(sh, Math.abs(st.shake.x)); }
  ok(roll > 0.3 && roll <= 1, 'quiet quake: the table leans (' + roll.toFixed(2) + ' degrees)');
  ok(sh > 0.2, 'quake: a rumble (' + sh.toFixed(2) + ')');
  W = emberWorld(); Q = W.toys.quake; FX.update(W, 0, 'play'); FX.quiet = function () { return false; };
  Q.t = 30; Q.gx = 0.16 * W.g; FX.events(W, ['quake']);
  roll = 0; for (i = 1; i < 30; i++) roll = Math.max(roll, moveOf(FX.update(W, i * FRAME, 'play')));
  ok(roll === 0, 'a quake that is not quiet never moves the table');
  FX.quiet = null;
})();

// reduced motion: no shake, no table movement, no flash, no shockwave, no fringe (and half the particles)
(function emberReduced() {
  var W = emberWorld(); FX.reduce = true; FX.quiet = function () { return true; };
  FX.update(W, 0, 'play');
  var mv = 0, fl = 0, sh = 0, shocks = 0, fr = 0, lava = 0;
  for (var i = 0; i < 90; i++) {
    FX.events(W, i % 30 ? ['nudge'] : ['erupt', 'quake', 'geyser', 'lava']);
    var st = FX.update(W, (i + 1) * FRAME, 'play');
    mv = Math.max(mv, moveOf(st)); fl = Math.max(fl, st.flash); sh = Math.max(sh, Math.abs(st.shake.x), Math.abs(st.shake.y)); fr = Math.max(fr, st.post.fringe);
    shocks += st.shocks.length; st.shocks.length = 0;
    st.bursts.forEach(function (q) { if (q.kind === 'lava') lava += q.n; }); st.bursts.length = 0;
  }
  ok(mv === 0 && fl === 0 && sh === 0 && shocks === 0 && fr === 0 && FX.state.reduced === true, 'Ember reduced motion: nothing moves, flashes or ripples');
  ok(lava > 0, 'reduced motion still shows the lava (fewer particles)');
  FX.reduce = false; FX.quiet = null;
})();

// spam: the flash limit holds, nothing red, and the queues stay bounded when nobody takes them
(function emberSpam() {
  var W = emberWorld(); FX.update(W, 0, 'play'); FX.quiet = function () { return true; };
  var starts = [], last = 0, redF = 0, t = 0;
  for (var i = 0; i < 180; i++) {
    FX.events(W, ['erupt', 'lava', { sfx: 'pressure', level: 'full' }, 'crater', 'lavaopen', 'geyser']);
    t += FRAME; var st = FX.update(W, t, 'play');
    if (st.flash > last + 0.05) { starts.push(t); if (red(st.flashColor)) redF++; } last = st.flash;
  }
  var w = 0; starts.forEach(function (a, i) { var c = 0; for (var j = i; j < starts.length && starts[j] < a + 1000; j++) c++; w = Math.max(w, c); });
  ok(w <= 2 && redF === 0, 'Ember spam: at most 2 flashes a second (worst ' + w + '), none red');
  ok(FX.state.bursts.length <= 48 && FX.state.shocks.length <= 6, 'queues bounded (' + FX.state.bursts.length + ' bursts, ' + FX.state.shocks.length + ' shocks)');
  ok(Math.abs(FX.state.table.pitch) <= 2 && Math.abs(FX.state.table.dy) <= 3, 'table movement clamped under spam');
  FX.quiet = null;
})();

// the big moments (29 Oct 2026, owner: "bigger light shows"): Ember's lamp set plays its own whole-table shows (lamps.js), so the
// effects leave those lamps alone; the light dips then surges over normal, the colour richens, the fringe spikes - and the old
// table's lamps still get the effects' own shows
(function bigMoments() {
  ok(LE.shows && LE.shows.extra && LE.shows.eruption, 'Ember lamps declare the shows they light themselves');
  var W = emberWorld(); FX.update(W, 0, 'play'); FX.events(W, ['extra']);
  var lampsLit = 0, giHi = 0, satHi = 0, frHi = 0, vigHi = 0, confetti = 0, st;
  for (var i = 1; i <= 150; i++) {
    st = FX.update(W, i * FRAME, 'play');
    for (var id in st.lamps) if (st.lamps[id] > 0) lampsLit++;
    giHi = Math.max(giHi, st.gi); satHi = Math.max(satHi, st.post.sat); frHi = Math.max(frHi, st.post.fringe); vigHi = Math.max(vigHi, st.post.vignette);
    st.bursts.forEach(function (q) { if (q.kind === 'confetti') confetti += q.n; }); st.bursts.length = 0; st.shocks.length = 0;
  }
  ok(lampsLit === 0, 'Ember extra ball: the effects leave the lamps to the lamp set (' + lampsLit + ' lamp-frames lit)');
  ok(giHi > 1.12 && giHi <= 1.2, 'Ember extra ball: the light surges over normal, at most 1.2 (GI ' + giHi.toFixed(2) + ')');   // (wave 3 grade cap: was 1.2-1.5)
  ok(satHi > 1.2 && satHi <= 1.4, 'Ember extra ball: the colour richens (sat ' + satHi.toFixed(2) + ')');
  ok(frHi > 0.4 && vigHi > 0.3, 'Ember extra ball: a colour-fringe spike and the edges drawn in (fringe ' + frHi.toFixed(2) + ', vignette ' + vigHi.toFixed(2) + ')');
  ok(confetti >= 300, 'Ember extra ball: a big confetti burst (' + confetti + ')');
  st = frameRun(W, 150 * FRAME, 240);
  ok(st.gi <= 1.01 && st.post.sat <= 1.01 && st.post.fringe === 0 && st.post.vignette <= 0.19, 'and it all settles (GI ' + st.gi.toFixed(2) + ', sat ' + st.post.sat.toFixed(2) + ')');
  // everyday hits stay modest: no surge, no fringe, no richer colour
  W = emberWorld(); FX.update(W, 0, 'play'); giHi = 0; satHi = 0; frHi = 0;
  for (i = 1; i <= 120; i++) { if (i % 12 === 1) FX.events(W, [{ sfx: 'bumper', i: i % 3 }, { sfx: 'sling', side: -1 }]); st = FX.update(W, i * FRAME, 'play'); giHi = Math.max(giHi, st.gi); satHi = Math.max(satHi, st.post.sat); frHi = Math.max(frHi, st.post.fringe); }
  ok(giHi <= 1 && satHi <= 1 && frHi === 0, 'everyday hits stay modest (GI ' + giHi.toFixed(2) + ', sat ' + satHi.toFixed(2) + ', fringe ' + frHi.toFixed(2) + ')');
  // reduced motion: no fringe from the big moments either
  W = emberWorld(); FX.reduce = true; FX.update(W, 0, 'play'); FX.events(W, ['extra', 'skill', 'lava']); frHi = 0;
  for (i = 1; i <= 60; i++) frHi = Math.max(frHi, FX.update(W, i * FRAME, 'play').post.fringe);
  ok(frHi === 0, 'reduced motion: no colour fringe on the big moments');
  FX.reduce = false;
  // the old table: its lamps still get the effects' extra ball show
  FX.reset(); FX.reduce = false; W = E.newWorld(2, 0, 9, 'orbit'); FX.update(W, 0, 'play'); FX.events(W, ['extra']);
  lampsLit = 0; for (i = 1; i <= 60; i++) { st = FX.update(W, i * FRAME, 'play'); for (id in st.lamps) if (st.lamps[id] > 0) lampsLit++; }
  ok(lampsLit > 50, 'the old table keeps the effects\' own lamp shows (' + lampsLit + ')');
})();

// the old table is untouched by Ember's effects: no bursts of lava, no table movement
(function orbitStill() {
  FX.reset(); FX.reduce = false; FX.quiet = function () { return true; };
  var W = E.newWorld(2, 0, 9, 'orbit'); FX.update(W, 0, 'play');
  FX.events(W, ['erupt', 'lava', 'geyser', 'crater']);
  var st = frameRun(W, 0, 10);
  ok(st.bursts.length === 0 && moveOf(st) === 0, 'Ember events on the old table do nothing');
  FX.quiet = null;
})();

// ------------------------------------------------------------ wave 3 (5 Nov 2026): THE BIG ONE and the new shows
(function waveThree() {
  FX.reset(); FX.reduce = false; FX.quiet = function () { return true; };
  var W = emberWorld(), t = 0, i, st;
  FX.update(W, t, 'play');
  // a lava-lane jackpot pops JACKPOT at that lane (on a plate), not at the saucer Ember Peak hasn't got
  W.mb = { on: true, balls: 2, jp: { lavaL: true, lavaR: true, ramp: true }, jpValue: 5e6, jpCount: 0 };
  FX.events(W, []);
  W.mb.jp.lavaR = false; W.score += 5000000; FX.events(W, ['jackpot']);
  st = FX.update(W, t += FRAME, 'play');
  var jp = st.pops.filter(function (p) { return p.text === 'JACKPOT'; })[0];
  ok(jp && jp.x > BE.T.MID && jp.plate, 'a right lava lane jackpot shows JACKPOT on a plate at the right lane (' + (jp && jp.x.toFixed(0)) + ')');
  // a lava fountain from the cone for each ball it spits out into the multiball
  FX.reset(); FX.reduce = false; FX.quiet = function () { return true; };
  W = emberWorld(); FX.quiet = function () { return true; }; t = 0; FX.update(W, t, 'play'); FX.events(W, ['mbstart']);
  W.mb = { on: true, balls: 3, jp: { lavaL: true, lavaR: true, ramp: true } };
  var b0 = W.balls[0];
  for (var k = 1; k <= 2; k++) { var nb = JSON.parse(JSON.stringify(b0)); nb.id = b0.id + k; W.balls.push(nb); for (i = 0; i < 20; i++) { st = FX.update(W, t += FRAME, 'play'); st.bursts.length = 0; } }
  ok(FX.debug().fountains === 2, 'a lava fountain for each ball the cone spits out (' + FX.debug().fountains + ')');
  // the seams of light: the river lamps light in turn down the river, with sparks along it
  FX.reset(); FX.reduce = false; W = emberWorld(); t = 0; FX.update(W, t, 'play'); FX.events(W, ['mbstart']);
  var river = Lm.forTable('ember').groups.river.map(function (q) { return Lm.forTable('ember').list[q].id; }), firstLit = {}, sparksN = 0;
  for (i = 0; i < 90; i++) { st = FX.update(W, t += FRAME, 'play'); river.forEach(function (id, q) { if (st.lamps[id] > 0.6 && firstLit[q] == null) firstLit[q] = i; }); st.bursts.forEach(function (q) { if (q.kind === 'sparks' && q.z <= 2) sparksN++; }); st.bursts.length = 0; }
  var order = Object.keys(firstLit).map(Number), inOrder = order.length >= river.length - 1 && order.every(function (q, j) { return j === 0 || firstLit[q] >= firstLit[order[j - 1]]; });
  ok(inOrder && sparksN >= river.length - 1, 'seams of light race down the lava river (' + order.length + '/' + river.length + ' lamps in order, ' + sparksN + ' spark bursts)');
  // the shows for jackpot, super, combo, stage clear, boss, dive and ascend: each one starts something visible; flashes
  // never over 0.55 and never more than 2 in a second, even all at once
  var names = ['superjackpot', 'supercombo', 'stageclear', 'bossdown', 'dive', 'ascend', 'mbstart', 'missiondone', 'chamberclear', 'bosshit', 'bossphase', 'lavarise'];
  names.forEach(function (n) { ok(FX.SHOWS[n] && (FX.FX[n] || FX.SHOWS[n].look), 'a show and effects for ' + n); });
  FX.reset(); FX.reduce = false; W = emberWorld(); t = 0; FX.update(W, t, 'play');
  var starts = [], last = 0, hi = 0;
  for (i = 0; i < 240; i++) {
    FX.events(W, [names[i % names.length], 'jackpot', { sfx: 'combo', n: 5 }, 'erupt']);
    st = FX.update(W, t += FRAME, 'play'); st.bursts.length = 0; st.shocks.length = 0;
    if (st.flash > last + 0.05) starts.push(t); last = st.flash; hi = Math.max(hi, st.flash, 0);
  }
  var w = 0; starts.forEach(function (a, j) { var c = 0; for (var q = j; q < starts.length && starts[q] < a + 1000; q++) c++; w = Math.max(w, c); });
  ok(w <= 2 && hi <= 0.55, 'every show at once: at most 2 flashes a second (worst ' + w + '), none over 0.55 (' + hi.toFixed(2) + ')');
  // the light never goes over 1.2
  var giHi = 0; for (i = 0; i < 300; i++) { if (i % 40 === 0) FX.events(W, ['extra', 'stageclear', 'superjackpot']); st = FX.update(W, t += FRAME, 'play'); giHi = Math.max(giHi, st.gi); st.bursts.length = 0; }
  ok(giHi <= 1.2001, 'the light never goes over 1.2 (' + giHi.toFixed(3) + ')');
  // the table never moves unless the camera says it is quiet
  W = emberWorld(); FX.quiet = function () { return false; }; t = 0; FX.update(W, t, 'play');
  var mv = 0; for (i = 0; i < 120; i++) { if (i % 30 === 0) FX.events(W, ['bossdown', 'superjackpot', 'mbstart']); st = FX.update(W, t += FRAME, 'play'); mv = Math.max(mv, moveOf(st)); st.bursts.length = 0; }
  ok(mv === 0, 'the big shows never move the table while it is not quiet (' + mv + ')');
  FX.quiet = null;
})();

console.log(passes + ' passed, ' + fails + ' failed');
process.exit(fails ? 1 : 0);
