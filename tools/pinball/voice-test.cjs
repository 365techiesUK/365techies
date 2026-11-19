/* 365 Pinball Hero - tests for the voice (games/pinball/voice.js; 5 Nov 2026, wave 3). Never deployed. speechSynthesis
 * is stubbed; pilot-played Ember Peak games and a script of the goal, level and boss events go through PinVoice.events
 * at 60 steps a second of pretend time. Checks: at least 12 different callouts, never two within 1.5 s, the most
 * important of a crowd is said, a British English voice is chosen, none with Voice off, nothing (and no error) without
 * speechSynthesis, our own words only.
 *
 *   node tools/pinball/voice-test.cjs */
'use strict';
var path = require('path'), G = path.join(__dirname, '../../games/pinball/');
global.self = global;
var E = require(G + 'engine.js'), Pilot = require(G + 'pilot.js'), V = require(G + 'voice.js');
var fails = 0, passes = 0;
function ok(c, what) { if (c) passes++; else { fails++; console.log('FAIL: ' + what); } }
var spoken = [];
function stub() {
  global.SpeechSynthesisUtterance = function (text) { this.text = text; };
  global.speechSynthesis = { speaking: false, pending: false, speak: function (u) { spoken.push(u); }, cancel: function () {},
    getVoices: function () { return [{ lang: 'en-US', name: 'US' }, { lang: 'fr-FR', name: 'FR' }, { lang: 'en-GB', name: 'GB' }]; } };
}
stub();
V.enable(true);
// ---- pilot games on Ember Peak (Classic), plus the run's and the levels' events scripted in
var t = 0, steps = 0;
[1, 2].forEach(function (seed) {
  var W = E.newWorld(2, 0, seed, 'ember');
  while (!W.over && steps < 60 * 60 * 6) {
    E.step(W, Pilot.input(W)); steps++; t += 1000 / 60;
    V.events(W, W.events, t); W.events.length = 0;
  }
});
var W = E.newWorld(2, 0, 3, 'ember');
var script = ['modestart', 'modedone', 'missiondone', 'stageclear', 'divelit', 'dive', 'chamberclear', 'lavarise', 'ascend', 'bossphase', 'sealed', 'unsealed', 'bossdown', { sfx: 'combo', n: 3 }, 'supercombo'];
W.goals = { mode: 'crabs' };
script.forEach(function (e) { for (var k = 0; k < 120; k++) { t += 1000 / 60; V.events(W, k ? [] : [e], t); } });
var said = V.state().said, ids = {};
said.forEach(function (s) { ids[s.id] = (ids[s.id] || 0) + 1; });
var gaps = said.slice(1).map(function (s, i) { return s.t - said[i].t; }), minGap = Math.min.apply(null, gaps);
console.log('callouts: ' + said.length + ', ' + Object.keys(ids).length + ' different: ' + JSON.stringify(ids) + '; min gap ' + Math.round(minGap) + ' ms; ' + Math.round(steps / 3600) + ' min of pilot play');
ok(Object.keys(ids).length >= 12, 'at least 12 different callouts (' + Object.keys(ids).length + ')');
ok(minGap >= 1500, 'never two within 1.5 s (closest ' + Math.round(minGap) + ' ms)');
ok(spoken.length === said.length && spoken.every(function (u) { return u.voice && u.voice.lang === 'en-GB' && u.lang === 'en-GB'; }), 'a British English voice is chosen');
ok(ids.crabhunt === 1, 'a mode start names the mode (CRAB HUNT)');
// ---- the most important of a crowd
V.reset(); spoken.length = 0; t += 5000;
V.events(W, ['save', 'jackpot', 'rumble', 'superjackpot', 'lock'], t);
ok(V.state().said.length === 1 && V.state().said[0].id === 'superjackpot', 'of several at once, the most important is said (' + V.state().said.map(function (s) { return s.id; }).join() + ')');
V.events(W, ['jackpot'], t + 500); V.events(W, [], t + 1000);
ok(V.state().said.length === 1, 'the next waits for the 1.5 s gap');
V.events(W, [], t + 1600);
ok(V.state().said.length === 2 && V.state().said[1].id === 'jackpot', 'and comes after it');
V.events(W, ['save'], t + 1700); V.events(W, [], t + 1700 + 2600 + 1600);
ok(V.state().said.length === 2, 'a callout that waited over 2.5 s is dropped');
// ---- Voice off
V.reset(); spoken.length = 0; V.enable(false);
var W2 = E.newWorld(2, 0, 4, 'ember');
for (var i = 0; i < 60 * 120; i++) { E.step(W2, Pilot.input(W2)); t += 1000 / 60; V.events(W2, W2.events, t); W2.events.length = 0; }
script.forEach(function (e) { t += 2000; V.events(W2, [e], t); });
ok(spoken.length === 0 && V.state().said.length === 0, 'none with Voice off');
// ---- no speechSynthesis
delete global.speechSynthesis; delete global.SpeechSynthesisUtterance;
V.enable(true); V.reset(); var threw = false;
try { script.forEach(function (e) { t += 2000; V.events(W2, [e], t); }); } catch (e) { threw = true; }
ok(!threw && V.state().said.length === 0, 'without speechSynthesis: nothing, and no error');
// ---- our own words
var banned = /cash|bank it|dino|idol|tilt|game over|you lose/i, lines = Object.keys(V.LINES).map(function (k) { return V.LINES[k][1]; });
ok(lines.length >= 20 && lines.every(function (s) { return !banned.test(s) && s.length <= 40; }), 'about 20+ short callouts in our own words (' + lines.length + ')');
console.log(passes + ' passed, ' + fails + ' failed');
process.exit(fails ? 1 : 0);
