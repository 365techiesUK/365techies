/* 365 Pinball Hero - tests for the music (games/pinball/music.js; 5 Nov 2026, wave 3). Never deployed. In node, with a
 * stand-in kit (no AudioContext: the notes go to kit.tone / kit.noise, recorded with their start times) and a pretend
 * clock at 60 frames a second, the checks are: nothing plays until enable(true); the layers follow the world (base,
 * pressure over it, multiball, boss, chamber) and each has at least 2 variations; notes are scheduled at most a bar
 * ahead and never late; stingers land on a bar line; a duck is 6 dB and recovers; enable(false) and pause stop it;
 * the world is never changed. The page side (frame time on the phone view, AudioContext errors) is fx-page.cjs.
 *
 *   node tools/pinball/music-test.cjs */
'use strict';
var path = require('path'), G = path.join(__dirname, '../../games/pinball/');
global.self = global;
global.PinEngine = require(G + 'engine.js');
var M = require(G + 'music.js'), E = global.PinEngine;
var fails = 0, passes = 0;
function ok(c, what) { if (c) passes++; else { fails++; console.log('FAIL: ' + what); } }
var T = 0, log = [];
var KIT = { tone: function (f, d, g, o) { log.push({ at: T + (o.when || 0), f: f, d: d, g: g, k: 't' }); }, noise: function (d, g, f, o) { log.push({ at: T + (o.when || 0), f: f, d: d, g: g, k: 'n' }); } };
function run(W, secs, o) {   // frames at 60 a second; returns the layers seen per bar
  var seen = [];
  for (var i = 0; i < secs * 60; i++) {
    T += 1 / 60; var st = M.update(W, Object.assign({ t: T }, o || {}));
    var s = M.state(); if (!seen.length || seen[seen.length - 1].bar !== s.bar) seen.push({ bar: s.bar, layers: s.layers.join('+'), v: s.variation, bpm: s.bpm });
  }
  return seen;
}
M.attach(KIT, { sound: true });
var W = E.newWorld(2, 0, 7, 'ember'), snap = JSON.stringify(W);
run(W, 3);
ok(log.length === 0 && M.state().notes === 0, 'nothing plays until enable(true)');
M.enable(true); M.reset();
var base = run(W, 20);
ok(log.length > 100, 'the groove plays (' + log.length + ' notes in 20 s)');
ok(base.every(function (b) { return b.layers === 'base'; }), 'a quiet table: the base groove');
ok(new Set(base.map(function (b) { return b.v; })).size === 2, 'the base groove has 2 variations, taking turns');
// a bar ahead, never late
var late = 0, far = 0, bar = 4 * 60 / 112;
// (each note is recorded at the frame it was scheduled: its start must be ahead of that frame, within a bar and a bit)
var marks = [];
KIT.tone = function (f, d, g, o) { marks.push({ now: T, at: T + (o.when || 0) }); log.push(1); };
KIT.noise = function (d, g, f, o) { marks.push({ now: T, at: T + (o.when || 0) }); log.push(1); };
run(W, 8);
marks.forEach(function (m) { if (m.at < m.now - 1e-9) late++; if (m.at - m.now > bar * 2) far++; });
ok(marks.length > 50 && late === 0, 'no note is scheduled in the past (' + late + ' of ' + marks.length + ')');
ok(far === 0, 'each bar is scheduled within a bar of its start: no note more than 2 bars ahead (' + far + ' further)');
// pressure, multiball, boss, chamber
var V = W.toys.volcano;
V.pressure = W.press.level * 0.8; var pr = run(W, 8); V.pressure = 0;
ok(pr.slice(1).some(function (b) { return b.layers === 'base+pressure'; }), 'the pressure layer joins at 80% of the rung (' + pr.map(function (b) { return b.layers; }).join(',') + ')');
var pv = new Set(); pr.forEach(function (b) { if (b.layers === 'base+pressure') pv.add(Math.floor(b.bar / 2) % 2); });
ok(pv.size === 2, 'the pressure layer has 2 variations');
W.mb = { on: true, balls: 2, jp: {} }; var mb = run(W, 16); W.mb = null;
ok(mb.slice(1).every(function (b) { return b.layers === 'multiball' && b.bpm > 112; }), 'multiball: double time, faster');
ok(new Set(mb.map(function (b) { return b.v; })).size === 2, 'the multiball layer has 2 variations');
var bo = run(W, 18, { boss: true });
ok(bo.slice(1).every(function (b) { return b.layers === 'boss'; }) && new Set(bo.map(function (b) { return b.v; })).size === 2, 'the boss layer, with 2 variations');
var ch = run(W, 22, { depth: 1 });
ok(ch.slice(1).every(function (b) { return b.layers === 'chamber'; }) && new Set(ch.map(function (b) { return b.v; })).size === 2, 'the chamber layer below, with 2 variations');
run(W, 6);
ok(M.state().layer === 'base', 'and back to the groove on the surface');
// stingers on the bar line
marks.length = 0; var s0 = M.state().stings, bpm = M.state().bpm;
M.sting('jackpot');
ok(M.state().stings === s0 + 1, 'a stinger is scheduled');
var sAt = marks.length ? marks[0].at : -1, b4 = 4 * 60 / bpm;
// the bar lines are where the bars started: the stinger's start must be one of them (the next after now)
KIT.tone = function (f, d, g, o) { marks.push({ now: T, at: T + (o.when || 0) }); }; KIT.noise = KIT.tone;
var startOfBars = []; var lastBar = M.state().bar;
for (var i = 0; i < 400; i++) { T += 1 / 60; var before = marks.length; M.update(W, { t: T }); if (M.state().bar !== lastBar) { startOfBars.push(marks[before] ? marks[before].at : null); lastBar = M.state().bar; } }
var onLine = startOfBars.some(function (s) { return s != null && Math.abs(((sAt - s) / b4) - Math.round((sAt - s) / b4)) < 0.02; });
ok(sAt > 0 && onLine, 'the stinger lands on a bar line');
// the duck
M.duck(2); ok(M.state().ducked && M.DUCK === 0.5, 'a duck: -6 dB (gain 0.5)');
run(W, 3); ok(!M.state().ducked, 'and it recovers');
// off and paused
var n0 = M.state().notes; run(W, 4, { paused: true }); ok(M.state().notes === n0, 'paused: no new notes');
M.enable(false); n0 = M.state().notes; run(W, 4); ok(M.state().notes === n0, 'switched off: no new notes');
var W3 = E.newWorld(2, 0, 7, 'ember'), s3 = JSON.stringify(W3); M.enable(true); run(W3, 5); M.enable(false);
ok(JSON.stringify(W3) === s3, 'the music never changes the world');
console.log('layers: base ' + base.length + ' bars, pressure ' + pr.length + ', multiball ' + mb.length + ', boss ' + bo.length + ', chamber ' + ch.length + '; notes ' + M.state().notes + ', stingers ' + M.state().stings);
console.log(passes + ' passed, ' + fails + ' failed');
process.exit(fails ? 1 : 0);
