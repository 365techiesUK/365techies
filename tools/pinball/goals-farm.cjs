/* 365 Pinball Hero - THE GOALS in whole Classic games (wave 3; ported from the audit's 04 farm). Never deployed.
 *   node tools/pinball/goals-farm.cjs [--messy 30] [--lag 20] [--pilot 10] [--speed 2] [--workers 16]
 * Games of Ember Peak with goals.js registered (each capped at 15 minutes of play): how often W.next is set on a play
 * step, modes started and completed, combos and super combos. Acceptance (plan 6.3): W.next on 100% of surface play
 * steps; casual players start at least 1 mode a game and complete 30-60% of those they start; combos at least 1 a game
 * for casual players and at least 5 for the lag bot and the pilot. Run it through heavy.cjs. */
'use strict';
const { fork } = require('child_process');
const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? +argv[i + 1] : d; };

if (process.env.GOALS_FARM_WORKER) {
  const B = require('./run-bots.cjs');
  process.on('message', (m) => {
    const out = m.jobs.map((j) => {
      let steps = 0, set = 0, bad = null;
      const g = B.playGame(j.seed, j.speed, j.bot, { cap: 60 * 60 * 15, onStep: (W) => {
        if (W.state !== 'play') return;
        steps++;
        const n = W.next;
        if (n && n.shot && n.text && n.gauge >= 0 && n.gauge <= 1) set++; else if (!bad) bad = JSON.stringify(n);
      } });
      const G = g.W.goals;
      return Object.assign({}, j, { steps, set, bad, started: G.modesStarted, done: G.modesDone, failed: G.modesFailed, combos: G.combos, supers: G.superCombos, best: G.bestCombo, score: g.score, secs: g.frames / 60 });
    });
    process.send(out); process.exit(0);
  });
  return;
}
const speed = arg('--speed', 2), NW = arg('--workers', 16), jobs = [];
for (const [bot, n] of [['messy', arg('--messy', 30)], ['lag', arg('--lag', 20)], ['pilot', arg('--pilot', 10)]]) for (let i = 0; i < n; i++) jobs.push({ bot, speed, seed: 4000 + i * 17 });
jobs.sort((a, b) => (a.bot === 'pilot' ? 0 : 1) - (b.bot === 'pilot' ? 0 : 1));
const share = Array.from({ length: NW }, () => []), res = [], t0 = Date.now();
jobs.forEach((j, i) => share[i % NW].push(j));
let left = NW;
console.log('GOALS FARM: ' + jobs.length + ' Classic games at speed ' + speed + ' on ' + NW + ' workers');
share.forEach((js) => {
  const ch = fork(__filename, [], { env: Object.assign({}, process.env, { GOALS_FARM_WORKER: '1' }) });
  ch.on('message', (out) => res.push(...out));
  ch.on('exit', () => { if (--left === 0) report(); });
  ch.send({ jobs: js });
});
function report() {
  let okAll = true;
  for (const bot of ['messy', 'lag', 'pilot']) {
    const L = res.filter((r) => r.bot === bot); if (!L.length) continue;
    const steps = L.reduce((a, r) => a + r.steps, 0), set = L.reduce((a, r) => a + r.set, 0), st = L.reduce((a, r) => a + r.started, 0), dn = L.reduce((a, r) => a + r.done, 0);
    const combos = L.reduce((a, r) => a + r.combos, 0) / L.length, mins = L.reduce((a, r) => a + r.secs, 0) / L.length / 60;
    const modesPer = st / L.length, rate = st ? dn / st : 0;
    console.log('  ' + bot.padEnd(6) + ' games ' + L.length + ' (mean ' + mins.toFixed(1) + ' min): W.next on ' + (100 * set / steps).toFixed(2) + '% of play steps; modes started ' + modesPer.toFixed(2) + '/game, completed ' + (100 * rate).toFixed(0) + '% (' + dn + '/' + st + '); combos ' + combos.toFixed(1) + '/game, super combos ' + (L.reduce((a, r) => a + r.supers, 0) / L.length).toFixed(2) + '/game, best ' + Math.max(...L.map((r) => r.best)));
    const bad = L.find((r) => r.bad); if (bad) console.log('    a step with no W.next: ' + bad.bad);
    okAll = okAll && set === steps && (bot !== 'messy' || (modesPer >= 1 && rate >= 0.3 && rate <= 0.6 && combos >= 1)) && (bot === 'messy' || combos >= 5);
  }
  console.log('farm took ' + ((Date.now() - t0) / 1000).toFixed(0) + ' s');
  console.log(okAll ? 'GOALS FARM: PASS' : 'GOALS FARM: some targets missed (see above)');
}
