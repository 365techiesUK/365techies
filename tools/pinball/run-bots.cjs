/* 365 Pinball Hero - the bots and the whole-run player shared by the EMBER RUN farms (wave 3, 5 Nov 2026): run-test.cjs,
 * run-casual.cjs, hof-cap.cjs, upgrade-lab.cjs and goals-farm.cjs. Never deployed.
 *   bots: 'pilot' (the tidy demo pilot), 'lag' (the pilot 0-2 frames late each ball and the odd fumble, as the old run
 *   farm), 'messy' (messybot.cjs: a casual player, a new one each round).
 *   playRun(seed, speed, kind, opt) plays a whole run and returns { sum, R, frames, rounds: [...] }. opt.pick(R) picks a
 *   card (default: PRIORITY), opt.cap is the most steps a round may take, opt.onStep(R, W) watches every step.
 * The farms play THE SURFACE ONLY: descent.js (the levels lane) is not loaded, so a lit DIVE after STAGE CLEAR counts as
 * the round's end (the ball is drained by hand, which after the clear costs nothing). */
'use strict';
const path = require('path'), fs = require('fs');
const G = path.join(__dirname, '../../games/pinball/');
const E = require(G + 'engine.js'), Pilot = require(G + 'pilot.js');
if (fs.existsSync(G + 'goals.js')) require(G + 'goals.js');   // the goals plugin registers itself with the engine
const Run = require(G + 'run.js'), Messy = require('./messybot.cjs');
const PRIORITY = ['net', 'wind', 'tamer', 'gold', 'pump', 'interest', 'forge', 'fire', 'bumper', 'lavakick', 'plug', 'twin', 'lanes', 'crab'];

function lagBot(seed) {   // the pilot, a frame or two late now and then, and the odd fumble
  let s = (seed * 69069 + 1) & 0x7fffffff || 1, q = [], lag = 0, fumble = 0, ball = -1;
  const r = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  return function (W) {
    if (W.ball !== ball || W.frame < 2) { ball = W.ball; lag = Math.floor(r() * 3); q = []; }
    q.push(Pilot.input(W));
    let out = q.length > lag ? q.shift() : {};
    if (fumble > 0) { fumble--; out = Object.assign({}, out, { left: false, right: false }); }
    else if (r() < 1 / 1500) fumble = 3 + Math.floor(r() * 4);
    return out;
  };
}
function bot(kind, seed) {
  if (kind === 'messy') return Messy.create(seed);
  if (kind === 'lag') return lagBot(seed);
  return (W) => Pilot.input(W);
}
function defaultPick(R) { return PRIORITY.find((p) => R.offer.indexOf(p) >= 0) || R.offer[0]; }
// a whole run on the surface; the round's end on a lit DIVE after STAGE CLEAR (see above)
function playRun(seed, speed, kind, opt) {
  opt = opt || {};
  const R = Run.newRun(seed, speed || 2, opt.daily ? { daily: true } : undefined), cap = opt.cap || 60 * 60 * 30;
  let W = Run.startRound(R), input = bot(kind, seed), n = 0, frames = 0;
  const rounds = [];
  while (true) {
    E.step(W, input(W)); n++; frames++;
    const ph = Run.update(R, W);
    if (opt.onStep) opt.onStep(R, W);
    W.events.length = 0; R.news.length = 0;
    if (ph === 'play' && (n > cap || (R.cleared && W.crater && W.crater.dive && W.state === 'play'))) { W.balls.length = 0; W.feed = 0; if (n > cap) n = 0; }
    if (ph === 'pick' || ph === 'over' || ph === 'won') {
      rounds.push({ round: R.round, frames: n });
      n = 0;
      if (ph !== 'pick') return { sum: Run.summary(R), R, frames, rounds };
      Run.pick(R, (opt.pick || defaultPick)(R));
      W = Run.startRound(R);
      if (kind === 'messy') input = bot(kind, seed + R.round);
    }
  }
}
// a whole Classic game (no W.mod); returns { score, frames, ball, W }
function playGame(seed, speed, kind, opt) {
  opt = opt || {};
  const W = E.newWorld(speed, 0, seed, 'ember'), input = bot(kind, seed), cap = opt.cap || 60 * 60 * 60;
  while (!W.over && W.frame < cap) { E.step(W, input(W)); if (opt.onStep) opt.onStep(W); W.events.length = 0; }
  return { score: W.score, frames: W.frame, ball: W.ball, W };
}
const q = (a, p) => { if (!a.length) return NaN; const s = a.slice().sort((x, y) => x - y); return s[Math.floor(p * (s.length - 1))]; };
module.exports = { E, Pilot, Run, Messy, PRIORITY, bot, lagBot, playRun, playGame, defaultPick, q };
