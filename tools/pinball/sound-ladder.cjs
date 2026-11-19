/* 365 Pinball Hero - the sound ladder (5 Nov 2026, wave 3; ported from the arcade and game-feel audit's gain logger,
 * pinball-audit/scratch/02-arcade-game-feel/play.cjs, which wrapped kit.tone and kit.noise). Never deployed.
 * sound.js is loaded in node with a stand-in kit that records every tone and noise, and the checks are:
 *  - the ladder: orbit, loop, heat ramp and lava lane each sum to 0.30-0.50 and to at least twice the flipper; the flipper
 *    is 0.18-0.20; the spinner's tick 0.015 at most (a sound's loudness = the sum of its voices' gains, as in the audit);
 *  - each chained shot plays its reward note one pentatonic step higher (by its own 3 s clock, and from W.goals.combo);
 *    a drain starts the chain again;
 *  - no zero-length ramps: every voice has a duration of at least 10 ms, a positive gain and frequency, a positive
 *    slide target, and starts at 0 s or later;
 *  - every new event of CONTRACT v1 makes a sound, and the big ones ask the music for a stinger.
 *
 *   node tools/pinball/sound-ladder.cjs          (a second; exits 1 on a failure) */
'use strict';
var path = require('path'), G = path.join(__dirname, '../../games/pinball/');
global.self = global;
global.PinEngine = require(G + 'engine.js');
var stings = [];
global.PinMusic = { sting: function (k) { stings.push(k); }, duck: function () {} };
require(G + 'sound.js');
var PS = global.PinSound, E = global.PinEngine;
var fails = 0, passes = 0;
function ok(c, what) { if (c) passes++; else { fails++; console.log('FAIL: ' + what); } }

var log = [];
var KIT = {
  tone: function (f, dur, gain, o) { log.push({ k: 'tone', f: f, dur: dur, gain: gain, o: o || {} }); },
  noise: function (dur, gain, f, o) { log.push({ k: 'noise', f: f, dur: dur, gain: gain, o: o || {} }); }
};
function play(name, e, W) { log = []; PS.sound(name, KIT, e === undefined ? null : e, W); return log; }
function sum(l) { return l.reduce(function (s, v) { return s + v.gain; }, 0); }
var W = E.newWorld(2, 0, 7, 'ember');
var bad = [];
function voicesOk(name, l) {
  l.forEach(function (v) {
    if (!(v.dur >= 0.01) || !(v.gain > 0) || !(v.f > 0) || (v.o.to != null && !(v.o.to > 0)) || (v.o.when != null && !(v.o.when >= 0))) bad.push(name + ' ' + JSON.stringify(v));
  });
}

// ---- the ladder (each shot first in its chain: no chain bonus), on Ember Peak
var G0 = {};
PS.resetChain();
G0.flip = sum(play('flip', { sfx: 'flip', side: -1 }, W));
['orbit', 'loop', 'ramp', 'lava'].forEach(function (n) { PS.resetChain(); G0[n] = sum(play(n, null, W)); });
var sp = 0; for (var i = 0; i < 40 && !sp; i++) { var l = play('spin', { sfx: 'spin' }, W); if (l.length) sp = sum(l); }
G0.spin = sp;
console.log('ladder (summed gain): ' + Object.keys(G0).map(function (k) { return k + ' ' + G0[k].toFixed(3); }).join(', '));
['orbit', 'loop', 'ramp', 'lava'].forEach(function (n) {
  ok(G0[n] >= 0.3 && G0[n] <= 0.5, n + ' sums to 0.30-0.50 (' + G0[n].toFixed(3) + ')');
  ok(G0[n] >= 2 * G0.flip, n + ' is at least twice the flipper (' + (G0[n] / G0.flip).toFixed(2) + 'x)');
});
ok(G0.flip >= 0.18 && G0.flip <= 0.2, 'the flipper sums to 0.18-0.20 (' + G0.flip.toFixed(3) + ')');
ok(G0.spin > 0 && G0.spin <= 0.015, 'the spinner tick is 0.015 at most (' + G0.spin.toFixed(3) + ')');

// ---- the chain: each chained shot one pentatonic step higher
function rewardOf(l) { var r = l.filter(function (v) { return v.o.chain != null; }); return r.length ? r[0] : null; }
PS.resetChain();
var seq = ['ramp', 'orbit', 'loop', 'lava', 'ramp', 'orbit'], steps = [], freqs = [];
seq.forEach(function (n) { var r = rewardOf(play(n, null, W)); steps.push(r ? r.o.chain : -1); freqs.push(r ? r.f : 0); });
var P = PS.PENTA;
ok(steps.join() === '0,1,2,3,4,5', 'shots within 3 s climb one step each (' + steps.join() + ')');
ok(freqs.every(function (f, k) { return Math.abs(f - P[k]) < 0.01; }) && P.every(function (f, k) { return !k || f > P[k - 1]; }), 'each step is the next note of the pentatonic scale, always higher (' + freqs.map(Math.round).join(' ') + ')');
ok(P.every(function (f, k) { if (!k) return true; var c = 1200 * Math.log2(f / P[k - 1]); return c > 190 && c < 310; }), 'pentatonic steps: a tone or a minor third apart');
play('drain', null, W); var r0 = rewardOf(play('orbit', null, W));
ok(r0 && r0.o.chain === 0, 'a drain starts the chain again from the bottom');
for (i = 0; i < 12; i++) play('orbit', null, W);
ok(PS.chain() === P.length - 1, 'the chain stops at the top of the scale (' + PS.chain() + ')');
// goals.js's combo count wins when there is one (n shots chained -> step n-1)
var W2 = E.newWorld(2, 0, 7, 'ember'); W2.goals = { combo: { n: 3, t: 120 } };
var r3 = rewardOf(play('ramp', null, W2));
ok(r3 && r3.o.chain === 2, 'from W.goals.combo: the third shot of a combo plays step 2 (' + (r3 && r3.o.chain) + ')');

// ---- every new event makes a sound (and every voice anywhere is well formed)
var NEW = ['rumble', 'locklit', 'lock', 'eruptlit', 'mbstart', 'mbend', 'jackpot', 'superjackpot', 'addaball', 'plugup', 'plugdown', 'plugsave',
  { sfx: 'combo', n: 2 }, 'supercombo', 'modelit', 'modestart', 'modedone', 'modefail', 'missiondone', 'stageclear', 'divelit', 'dive', 'ascend',
  'chamberclear', 'lavarise', 'sealed', 'unsealed', 'bosshit', 'bossphase', 'bossdown'];
var silent = [];
NEW.forEach(function (e) {
  var n = typeof e === 'string' ? e : e.sfx, l = play(n, typeof e === 'string' ? null : e, W);
  if (n === 'eruptlit') { var l2 = play('pressure', { sfx: 'pressure', level: 'full' }, W); if (!l2.length) silent.push('eruptlit (+pressure full)'); voicesOk(n, l2); return; }
  if (!l.length) silent.push(n);
  voicesOk(n, l);
});
ok(silent.length === 0, 'every new event makes a sound (silent: ' + silent.join(' ') + ')');
// on a table with no volcano (a level below, or the old table) the new events still sound
var WO = E.newWorld(2, 0, 7, 'orbit'), silentO = [];
NEW.forEach(function (e) { var n = typeof e === 'string' ? e : e.sfx; if (['rumble', 'locklit', 'lock', 'eruptlit', 'mbstart', 'mbend', 'superjackpot', 'addaball', 'plugup', 'plugdown', 'plugsave', 'sealed', 'unsealed'].indexOf(n) >= 0) return; if (!play(n, typeof e === 'string' ? null : e, WO).length) silentO.push(n); });
ok(silentO.length === 0, 'the goals, levels and boss events sound on any table (silent: ' + silentO.join(' ') + ')');
['flip', 'orbit', 'loop', 'ramp', 'lava', 'crater', 'erupt', 'quake', 'bumper', 'drop', 'drops', 'launch', 'save', 'extra'].forEach(function (n) { voicesOk(n, play(n, { sfx: n, i: 0, side: 1, p: 0.5 }, W)); });
ok(bad.length === 0, 'no zero-length ramps or empty voices (' + bad.slice(0, 3).join(' | ') + ')');
['lock', 'multiball', 'jackpot', 'super', 'clear', 'victory', 'boss', 'dive'].forEach(function (k) { ok(stings.indexOf(k) >= 0, 'the music is asked for a "' + k + '" stinger'); });

setTimeout(function () {   // (the drain sound waits a tick for a ball save)
  console.log(passes + ' passed, ' + fails + ' failed');
  process.exit(fails ? 1 : 0);
}, 5);
