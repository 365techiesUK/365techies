/* 365 Pinball Hero - the Hall of Fame plausibility cap against bot play (wave 3, ported from the audit's 05 hof-forge.cjs).
 * Never deployed. The server (api/games-hof.php) refuses an arcade score when score > rate * secs + base, secs being the
 * cabinet's play time (games/common/arcade.js: steps played / 60). This farm plays whole Classic games and whole EMBER
 * RUN runs with every bot (pilot, lag, messy) at every speed, reads the pinball rate and base from the PHP itself, and checks:
 *  - every game and run passes with 2x headroom (2 x score <= rate * secs + base);
 *  - a score 10x too high is refused (10 x the highest-rate game's and run's score, at their own secs);
 *  - the ball / round count passes the server's wave rule (wave <= secs / 2 + 5).
 * It also prints the highest points a second seen, per bot and speed, so a new rate can be set at 2x it.
 *   node tools/pinball/hof-cap.cjs [--games 17] [--runs 17] [--workers 16] [--rate R --base B]   (per bot x speed)
 * Run it through heavy.cjs: node tools/pinball/heavy.cjs hof node tools/pinball/hof-cap.cjs */
'use strict';
const fs = require('fs'), path = require('path'), { fork } = require('child_process');
const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? +argv[i + 1] : d; };

if (process.env.HOF_CAP_WORKER) {
  const B = require('./run-bots.cjs');
  process.on('message', (m) => {
    const out = m.jobs.map((j) => {
      if (j.type === 'game') { const g = B.playGame(j.seed, j.speed, j.bot); return Object.assign({}, j, { score: g.score, secs: Math.round(g.frames / 60), wave: g.ball }); }
      const r = B.playRun(j.seed, j.speed, j.bot);
      return Object.assign({}, j, { score: r.sum.score, secs: Math.round(r.frames / 60), wave: r.sum.reached, won: r.sum.won });
    });
    process.send(out); process.exit(0);
  });
  return;
}

const php = fs.readFileSync(path.join(__dirname, '../../api/games-hof.php'), 'utf8');
const line = php.split('\n').find((l) => /^\s*'pinball'\s*=>/.test(l)) || '';
const RATE = arg('--rate', +((line.match(/'rate'\s*=>\s*(\d+)/) || [])[1] || 0)), BASE = arg('--base', +((line.match(/'base'\s*=>\s*(\d+)/) || [])[1] || 0));
const NG = arg('--games', 17), NR = arg('--runs', 17), NW = arg('--workers', 16);
const jobs = [];
for (const bot of ['pilot', 'lag', 'messy']) for (const speed of [1, 2, 3]) {
  for (let i = 0; i < NG; i++) jobs.push({ type: 'game', bot, speed, seed: 2000 + i * 31 + speed * 7 });
  for (let i = 0; i < NR; i++) jobs.push({ type: 'run', bot, speed, seed: 3000 + i * 37 + speed * 11 });
}
jobs.sort((a, b) => (a.bot === 'pilot' ? 0 : 1) - (b.bot === 'pilot' ? 0 : 1));   // the long pilot games first
const t0 = Date.now(), res = [], share = Array.from({ length: NW }, () => []);
jobs.forEach((j, i) => share[i % NW].push(j));
let left = NW;
console.log('HOF CAP: ' + jobs.length + ' games and runs on ' + NW + ' workers; pinball rate ' + RATE + ' pts/s, base ' + BASE);
share.forEach((js) => {
  const ch = fork(__filename, [], { env: Object.assign({}, process.env, { HOF_CAP_WORKER: '1' }) });
  ch.on('message', (out) => res.push(...out));
  ch.on('exit', () => { if (--left === 0) report(); });
  ch.send({ jobs: js });
});
function report() {
  const cap = (r) => RATE * r.secs + BASE, rate = (r) => r.score / Math.max(1, r.secs);
  const rows = {};
  res.forEach((r) => { const k = r.type + ' ' + r.bot + ' ' + ['', 'Gentle', 'Classic', 'Fast'][r.speed]; (rows[k] = rows[k] || []).push(r); });
  Object.keys(rows).sort().forEach((k) => {
    const L = rows[k], rt = L.map(rate).sort((a, b) => a - b), sc = L.map((r) => r.score).sort((a, b) => a - b), sx = L.map((r) => r.secs).sort((a, b) => a - b);
    console.log('  ' + k.padEnd(20) + ' n ' + L.length + '  pts/s median ' + Math.round(rt[L.length >> 1]) + ' max ' + Math.round(rt[L.length - 1])
      + '  score median ' + (sc[L.length >> 1] / 1e6).toFixed(1) + 'M max ' + (sc[L.length - 1] / 1e6).toFixed(1) + 'M  secs median ' + sx[L.length >> 1]
      + '  2x-headroom fails ' + L.filter((r) => 2 * r.score > cap(r)).length + '  plain refusals ' + L.filter((r) => r.score > cap(r)).length);
  });
  const top = res.slice().sort((a, b) => rate(b) - rate(a)), topG = top.find((r) => r.type === 'game'), topR = top.find((r) => r.type === 'run');
  // the rate needed: the base covers the start; for each game, (2 x score - base) / secs
  const need = Math.max(...res.map((r) => (2 * r.score - BASE) / Math.max(1, r.secs)));
  const fails = res.filter((r) => 2 * r.score > cap(r)), plain = res.filter((r) => r.score > cap(r));
  const waveBad = res.filter((r) => r.wave > Math.floor(r.secs / 2) + 5);
  const tenG = 10 * topG.score > cap(topG), tenR = 10 * topR.score > cap(topR);
  const tenShare = res.filter((r) => 10 * r.score > cap(r)).length / res.length;
  console.log('highest pts/s: ' + Math.round(rate(top[0])) + ' (' + top[0].type + ' ' + top[0].bot + ' speed ' + top[0].speed + ', ' + (top[0].score / 1e6).toFixed(1) + 'M in ' + top[0].secs + ' s)');
  console.log('highest game ' + Math.round(rate(topG)) + ' pts/s, highest run ' + Math.round(rate(topR)) + ' pts/s; with base ' + BASE + ' the rate for 2x headroom on every one is ' + Math.ceil(need));
  console.log('2x headroom: ' + (res.length - fails.length) + '/' + res.length + ' pass; plain refusals ' + plain.length + '; wave rule refusals ' + waveBad.length);
  console.log('10x too high refused: top game ' + tenG + ', top run ' + tenR + '; 10x refused for ' + (100 * tenShare).toFixed(0) + '% of all games and runs');
  console.log('farm took ' + ((Date.now() - t0) / 1000).toFixed(0) + ' s');
  const okAll = res.length === jobs.length && !fails.length && !waveBad.length && tenG && tenR;
  console.log(okAll ? 'HOF CAP: PASS' : 'HOF CAP: FAIL');
  process.exitCode = okAll ? 0 : 1;
}
