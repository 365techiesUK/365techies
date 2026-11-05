/* 365 Pinball Hero - the flow farm (ported 5 Nov 2026 from the wave 3 audit, 01 pinball designer). Never deployed.
 * Whole games of Ember Peak played by a bot: per ball, the time in play, where it drained and what touched it last;
 * per shot, where the ball goes next; score by source; how much of the ball time is under the player's control; and
 * (wave 3) THE BIG ONE: eruptions, multiballs, jackpots, plug saves, the first eruption and first multiball.
 *   node tools/pinball/flow.cjs <pilot|lag|messy> [games=10] [speed=2] [--json]
 * Bots: pilot (the tidy demo pilot), lag (the pilot 0-2 frames late each ball, the odd fumble), messy (messybot.cjs:
 * a casual player). rampLed = the share of drains (not saved) that came within 2.5 s of a ramp; outOfPlay = the share
 * of ball time the lowest ball spends held or carried. */
'use strict';
const E = require('../../games/pinball/engine.js');
const Pilot = require('../../games/pinball/pilot.js');
const Messy = require('./messybot.cjs');
const kind = process.argv[2] || 'pilot', G = +(process.argv[3] || 10), speed = +(process.argv[4] || 2);

function lagBot(seed) {   // the pilot, 0-2 frames late each ball, and the odd fumble (as run-test.cjs)
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
const MAJOR = ['crater', 'ramp', 'orbit', 'loop', 'lava', 'drops', 'drop', 'geyser', 'crab', 'skill', 'railout'];
const PRI = ['erupt', 'crater', 'ramp', 'combo', 'loop', 'orbit', 'lava', 'drops', 'drop', 'skill', 'crab', 'geyser', 'spin', 'bumper', 'sling', 'lane', 'mult', 'inlane', 'outlane', 'rail', 'railout', 'kickback'];
const name = e => typeof e === 'string' ? e : e && e.sfx;
const acc = { balls: 0, games: 0, ballSecs: [], outPlay: 0, ctrl: 0, upper: 0, lower: 0, frames: 0, drains: {}, lastBefore: {}, score: {}, stats: {},
  flow: {}, combos: 0, saves: 0, tilts: 0, searches: 0, quakes: 0, eruptions: 0, firstErupt: [], gameScores: [], extra: 0, outlaneEv: 0, kickbacks: 0,
  mbs: 0, firstMb: [], firstLit: [], gamesErupt: 0, jackpots: 0, supers: 0, plugSaves: 0, mbSecs: 0, gameSecs: [] };
function bump(o, k, n) { o[k] = (o[k] || 0) + (n == null ? 1 : n); }

for (let g = 0; g < G; g++) {
  const seed = 1000 + g * 7;
  const W = E.newWorld(speed, null, seed, 'ember');
  const bot = kind === 'messy' ? Messy.create(seed) : kind === 'lag' ? lagBot(seed) : (w => Pilot.input(w));
  let ballStart = -1, last = null, lastScore = { ev: null, f: 0 }, pending = [], prevScore = 0, firstE = -1, playF = 0, firstM = -1, firstL = -1;
  for (let f = 0; f < 60 * 60 * 15 && !W.over; f++) {
    const inp = bot(W);
    const er0 = W.stats.eruptions;
    E.step(W, inp);
    const evs = W.events.map(name).filter(Boolean).filter(e => e !== 'erupt');
    if (W.stats.eruptions > er0) evs.unshift('erupt');
    // score attribution
    const d = W.score - prevScore; prevScore = W.score;
    if (d > 0) {
      let src = W.state === 'bonus' ? 'bonus' : null;
      if (!src) for (const p of PRI) if (evs.includes(p)) { src = p === 'combo' ? 'ramp' : p; break; }
      if (src === 'crater' && evs.includes('erupt')) src = 'erupt';
      bump(acc.score, src || 'other', d);
    }
    if (W.state === 'play') {
      playF++;
      if (W.mb) acc.mbSecs += 1 / 60;
      if (W.balls.length) {
        acc.frames++;
        const b = W.balls.reduce((a, c) => (c.y > a.y ? c : a));
        if (b.m === 'held' || b.m === 'ramp') acc.outPlay++;
        else if (b.x > 244) { /* shooter lane */ }
        else if (E.nearRaisedFlipper(W, b) && Math.abs(b.vx) + Math.abs(b.vy) < 60) acc.ctrl++;
        else if (b.y < 324) acc.upper++; else acc.lower++;
        last = { x: b.x, y: b.y };
        // flow: resolve pending shots
        for (const p of pending) {
          if (p.done) continue;
          const t = (W.frame - p.f) / 60;
          if (evs.includes('drain') || evs.includes('outlane')) { p.done = 'drain'; }
          else if (evs.includes('inlane')) p.done = 'inlane';
          else if (evs.some(e => MAJOR.includes(e) && e !== p.k && !(p.k === 'drops' && e === 'drop') && !(p.k === 'drop' && e === 'drops') && !(p.k === 'crater' && e === 'railout'))) p.done = 'chain';
          else if (b.m === 'free' && b.y > 395 && b.x > 50 && b.x < 200 && b.vy > 0 && t > 0.15) p.done = 'flippers';
          else if (t > 6) p.done = 'loose';
          if (p.done) { acc.flow[p.k] = acc.flow[p.k] || {}; bump(acc.flow[p.k], p.done); bump(acc.flow[p.k], '_t', t); }
        }
        pending = pending.filter(p => !p.done);
      }
    }
    for (const e of evs) {
      if (e === 'launch' && ballStart < 0) ballStart = W.frame;
      if (MAJOR.includes(e) && W.state === 'play') {
        const k = e === 'railout' ? 'crater' : e;
        if (e !== 'crater') pending.push({ k: k, f: W.frame });   // the crater's flow starts when the rail lets it go
        if (PRI.includes(e)) lastScore = { ev: e, f: W.frame };
      } else if (['bumper', 'sling', 'spin'].includes(e)) lastScore = { ev: e, f: W.frame };
      if (e === 'combo') acc.combos++;
      if (e === 'save') acc.saves++;
      if (e === 'tilt') acc.tilts++;
      if (e === 'search') acc.searches++;
      if (e === 'quake') acc.quakes++;
      if (e === 'extra') acc.extra++;
      if (e === 'outlane') acc.outlaneEv++;
      if (e === 'kickback') acc.kickbacks++;
      if (e === 'erupt') { acc.eruptions++; if (firstE < 0) { firstE = playF / 60; acc.firstErupt.push(firstE); } }
      if (e === 'mbstart') { acc.mbs++; if (firstM < 0) { firstM = playF / 60; acc.firstMb.push(firstM); } }
      if (e === 'jackpot') acc.jackpots++;
      if (e === 'eruptlit' && firstL < 0) { firstL = playF / 60; acc.firstLit.push(firstL); }
      if (e === 'superjackpot') acc.supers++;
      if (e === 'plugsave') acc.plugSaves++;
      if (e === 'drain' && last) {
        const k = last.x < 27 ? 'outlane L' : last.x > 223 ? 'outlane R' : 'centre';
        const saved = evs.includes('save');
        bump(acc.drains, k + (saved ? ' (saved)' : ''));
        if (!saved) { const gap = (W.frame - lastScore.f) / 60; bump(acc.lastBefore, gap < 2.5 ? (lastScore.ev || '?') : 'nothing for 2.5 s'); }
      }
      if (e === 'ballend') { acc.balls++; if (ballStart >= 0) acc.ballSecs.push((W.frame - ballStart) / 60); ballStart = -1; pending = []; }
    }
    W.events.length = 0;
  }
  acc.games++; acc.gameScores.push(W.score); acc.gameSecs.push(playF / 60); if (firstE >= 0) acc.gamesErupt++;
  if (firstM < 0) acc.firstMb.push(null);
  if (firstL < 0) acc.firstLit.push(null);
  for (const k of Object.keys(W.stats)) bump(acc.stats, k, W.stats[k]);
  if (firstE < 0) acc.firstErupt.push(null);
}
const q = (a, p) => { const s = a.filter(x => x != null).sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : null; };
const tot = Object.values(acc.score).reduce((a, b) => a + b, 0);
const unsaved = Object.values(acc.lastBefore).reduce((a, b) => a + b, 0);
const medOrNone = (a) => { const s = a.map((x) => (x == null ? Infinity : x)).sort((x, y) => x - y), m = s[Math.floor((s.length - 1) / 2)]; return m === Infinity || m == null ? null : +m.toFixed(1); };
const out = {
  bot: kind, speed, games: acc.games, balls: acc.balls,
  ballSecs: { p10: q(acc.ballSecs, 0.1), p25: q(acc.ballSecs, 0.25), median: q(acc.ballSecs, 0.5), p75: q(acc.ballSecs, 0.75), p90: q(acc.ballSecs, 0.9), mean: +(acc.ballSecs.reduce((a, b) => a + b, 0) / acc.ballSecs.length).toFixed(1) },
  timeShare: { outOfPlay: +(acc.outPlay / acc.frames).toFixed(3), cradled: +(acc.ctrl / acc.frames).toFixed(3), upperField: +(acc.upper / acc.frames).toFixed(3), flipperZone: +(acc.lower / acc.frames).toFixed(3) },
  drains: acc.drains, drainAfter: acc.lastBefore,
  scoreShare: Object.fromEntries(Object.entries(acc.score).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, +(v / tot).toFixed(3)])),
  medianGame: q(acc.gameScores, 0.5), perGame: Object.fromEntries(Object.entries(acc.stats).map(([k, v]) => [k, +(v / acc.games).toFixed(2)])),
  combosPerGame: +(acc.combos / acc.games).toFixed(2), savesPerGame: +(acc.saves / acc.games).toFixed(2), tilts: acc.tilts, searches: acc.searches,
  quakesPerGame: +(acc.quakes / acc.games).toFixed(2), eruptionsPerGame: +(acc.eruptions / acc.games).toFixed(2), extraPerGame: +(acc.extra / acc.games).toFixed(2),
  kickbacksPerGame: +(acc.kickbacks / acc.games).toFixed(2), outlaneEvents: acc.outlaneEv,
  firstEruptionSecs: { median: q(acc.firstErupt.filter(x => x != null), 0.5), none: acc.firstErupt.filter(x => x == null).length },
  bigOne: { gamesWithEruption: +(acc.gamesErupt / acc.games).toFixed(2), medianFirstEruption: medOrNone(acc.firstErupt),
    medianFirstEruptLit: medOrNone(acc.firstLit), multiballsPerGame: +(acc.mbs / acc.games).toFixed(2), firstMbWithin3min: +(acc.firstMb.filter(x => x != null && x <= 180).length / acc.games).toFixed(2),
    medianFirstMb: medOrNone(acc.firstMb), jackpotsPerGame: +(acc.jackpots / acc.games).toFixed(2), supersPerGame: +(acc.supers / acc.games).toFixed(2),
    plugSavesPerGame: +(acc.plugSaves / acc.games).toFixed(2), mbShareOfPlay: +(acc.mbSecs / Math.max(1, acc.gameSecs.reduce((a, b) => a + b, 0))).toFixed(3) },
  rampLed: +((acc.lastBefore.ramp || 0) / Math.max(1, unsaved)).toFixed(2), medianGameSecs: q(acc.gameSecs, 0.5),
  flow: Object.fromEntries(Object.entries(acc.flow).map(([k, o]) => { const n = Object.entries(o).filter(([a]) => a !== '_t').reduce((a, [, v]) => a + v, 0); return [k, { n, inlane: +((o.inlane || 0) / n).toFixed(2), flippers: +((o.flippers || 0) / n).toFixed(2), chain: +((o.chain || 0) / n).toFixed(2), drain: +((o.drain || 0) / n).toFixed(2), loose: +((o.loose || 0) / n).toFixed(2), meanT: +(o._t / n).toFixed(2) }]; }))
};
if (process.argv.includes('--json')) console.log(JSON.stringify(out, null, 1));
else {
  const B = out.bigOne;
  console.log(kind + ' bot, ' + E.SPEEDS[speed].name + ', ' + out.games + ' games (median ' + (out.medianGameSecs || 0).toFixed(0) + ' s, median score ' + E.fmt(out.medianGame) + ')');
  console.log('  THE BIG ONE: games with an eruption ' + (B.gamesWithEruption * 100).toFixed(0) + '%, median first eruption ' + B.medianFirstEruption + ' s (no eruption counts as never; ERUPT first lit at ' + B.medianFirstEruptLit + ' s); multiballs a game ' + B.multiballsPerGame + ', first multiball within 3 min in ' + (B.firstMbWithin3min * 100).toFixed(0) + '% (median ' + B.medianFirstMb + ' s); jackpots a game ' + B.jackpotsPerGame + ', supers ' + B.supersPerGame + ', plug saves ' + B.plugSavesPerGame + '; multiball ' + (B.mbShareOfPlay * 100).toFixed(1) + '% of play');
  console.log('  drains: ' + JSON.stringify(out.drains) + '; ramp-led ' + (out.rampLed * 100).toFixed(0) + '%; after: ' + JSON.stringify(out.drainAfter));
  console.log('  time: out of play ' + (out.timeShare.outOfPlay * 100).toFixed(1) + '%, cradled ' + (out.timeShare.cradled * 100).toFixed(1) + '%; ball secs median ' + (out.ballSecs.median || 0).toFixed(1) + ', mean ' + out.ballSecs.mean + '; searches ' + out.searches + ', saves a game ' + out.savesPerGame + ', quakes a game ' + out.quakesPerGame);
}
module.exports = out;
