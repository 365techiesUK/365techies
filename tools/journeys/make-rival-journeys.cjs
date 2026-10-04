// Makes the Journeys for the games against the computer (5 Oct 2026; owner: "yes do the Journey for the four new
// games"). 100 levels each, 10 chapters of 10. A level is ONE HAND on a set deal against the computer at that level's
// strength, with three targets - one per star - that the search (rival-sim.cjs) has REACHED on that deal: the gold
// target is the best line found, so every star is possible. The 10th level of each chapter is a special one: shoot
// the moon (Hearts), go Gin (Gin Rummy).
//   node tools/journeys/make-rival-journeys.cjs <hearts|gin|cribbage|whist|all>   -> tools/journeys/<game>-levels.json
//   then node tools/journeys/write-rival-journeys.cjs                              -> games/<game>/journey.js
// Runs on worker threads (Gin's search is the slow one).
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const os = require('os'), fs = require('fs'), path = require('path');
const R = require('./rival-sim.cjs');
const TRIES = { hearts: 300, gin: 70, cribbage: 400, whist: 1500 };

// how hard each level is: the computer's strength by chapter (1 Easy, 3 Normal, 5 Hard, 7 Expert)
function lvFor(c, k) { return c < 3 ? 1 : c < 6 ? (k % 3 === 2 ? 1 : 3) : c < 9 ? (k % 3 === 2 ? 3 : 5) : (k % 3 === 1 ? 7 : 5); }
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
// the three targets for a deal, or null if the deal doesn't make a good level
function tiers(game, c, k, x, extra) {
  const boss = k === 9, early = c < 6;
  if (game === 'hearts') {   // points scored this hand (lower is better); 'moon' = take every point
    if (boss && !extra) return null;
    if (!boss && x.best > 0) return null;
    const t2 = clamp(x.bot, 2, 6), t1 = Math.min(12, t2 + [7, 7, 6, 6, 5, 5, 4, 4, 4, 3][c]);
    if (early && x.bot > t1) return null;
    return [t1, t2, boss ? 'moon' : 0];
  }
  if (game === 'gin') {   // points from the hand (a win scores, a loss counts against); 'gin' = go Gin
    if (boss && !x.flag) return null;
    const A = x.best;
    if (A < 8 || (early && x.bot < 1)) return null;
    let t2 = Math.max(2, Math.min(A - 4, Math.max(x.bot, Math.round(A / 2))));
    if (boss) { t2 = Math.min(t2, x.flag.v); if (t2 < 2) return null; }   // the Gin line must earn star 2 as well
    return [1, t2, boss ? 'gin' : A];
  }
  if (game === 'cribbage') {   // points you score this deal
    const A = x.best, t2 = Math.min(x.bot, A - 3);
    if (t2 < 6) return null;   // the Hint's own play should reach at least 6
    const t1 = clamp(Math.round(t2 * [0.55, 0.55, 0.6, 0.6, 0.65, 0.65, 0.7, 0.7, 0.75, 0.75][c]), 4, t2 - 2);
    return [t1, t2, A];
  }
  if (game === 'whist') {   // tricks you and Jo take
    const A = x.best;
    if (A < 9 || (early && x.bot < 7)) return null;
    return [7, Math.max(8, Math.min(x.bot, A - 1)), A];
  }
}
function makeLevel(game, i) {
  const c = Math.floor(i / 10), k = i % 10, lv = lvFor(c, k);
  const base = { hearts: 210000, gin: 330000, cribbage: 450000, whist: 570000 }[game];
  for (let t = 0; t < 400; t++) {
    const seed = base + ((i * 7919 + t * 104729) % 99991) + 1;
    const x = R.search(game, seed, lv, TRIES[game] * (k === 9 && game === 'gin' ? 2 : 1));
    let extra = null;
    if (game === 'hearts' && k === 9) extra = R.moonSearch(seed, lv, 60);
    const t3 = tiers(game, c, k, x, extra);
    if (!t3) continue;
    const gold = game === 'hearts' && k === 9 ? extra : game === 'gin' && k === 9 ? x.flag.line : x.line;
    return { i, level: { seed, lv, t: t3 }, lines: { bot: x.botLine, gold }, tried: t + 1, bot: x.bot, best: x.best };
  }
  throw new Error(game + ' level ' + (i + 1) + ': no deal found');
}

if (!isMainThread) {
  for (const i of workerData.list) parentPort.postMessage(makeLevel(workerData.game, i));
  return;
}
const which = process.argv[2] || 'all', games = which === 'all' ? ['hearts', 'gin', 'cribbage', 'whist'] : [which];
(async () => {
  for (const game of games) {
    const t0 = Date.now(), n = Math.max(1, Math.min(100, os.cpus().length - 2)), out = [];
    const lists = Array.from({ length: n }, () => []);
    for (let i = 0; i < 100; i++) lists[i % n].push(i);
    await Promise.all(lists.filter((l) => l.length).map((list) => new Promise((res, rej) => {
      const w = new Worker(__filename, { workerData: { game, list } });
      w.on('message', (m) => { out[m.i] = m; });
      w.on('error', rej); w.on('exit', res);
    })));
    if (out.filter(Boolean).length !== 100) throw new Error(game + ': missing levels');
    const file = path.join(__dirname, game + '-levels.json');
    fs.writeFileSync(file, JSON.stringify({ game, made: new Date().toISOString().slice(0, 10), levels: out.map((o) => o.level), lines: out.map((o) => o.lines) }));
    const tried = out.reduce((a, o) => a + o.tried, 0);
    console.log(game + ': 100 levels in ' + Math.round((Date.now() - t0) / 1000) + ' s (' + tried + ' deals tried) by computer level ' + JSON.stringify(out.reduce((a, o) => (a[o.level.lv] = (a[o.level.lv] || 0) + 1, a), {})));
    console.log('  first targets: ' + out.slice(0, 12).map((o) => o.level.t.join('/')).join('  ') + '  ...  ' + out.slice(88).map((o) => o.level.t.join('/')).join('  '));
  }
})().catch((e) => { console.error(e); process.exit(1); });
