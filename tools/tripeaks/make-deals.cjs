// 365 TriPeaks - the deals proven winnable when King and Ace join round the corner (k1: Easy and Normal) and when they
// don't (k5: Hard and Expert), by tools/tripeaks/solver.cjs, each solution replayed on a fresh deal before it counts.
// Spread over the PC's cores. Run: node tools/tripeaks/make-deals.cjs [N=4000]  ->  games/tripeaks/deals.js
const fs = require('fs'), path = require('path'), os = require('os');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const LIMIT = 600000;
if (!isMainThread) {
  const S = require('./solver.cjs');
  const out = [];
  for (const [lv, seed] of workerData.jobs) { const r = S.solve(seed, lv, LIMIT); out.push([lv, seed, r.won && S.replay(seed, lv, r.moves) ? 1 : 0]); }
  parentPort.postMessage(out);
} else {
  const N = +(process.argv[2] || 4000), jobs = [];
  for (const lv of [1, 5]) for (let seed = 1; seed <= N; seed++) jobs.push([lv, seed]);
  const W = Math.max(1, Math.min(40, os.cpus().length - 4)), parts = Array.from({ length: W }, () => []);
  jobs.forEach((j, i) => parts[i % W].push(j));
  const t0 = Date.now(), res = [];
  Promise.all(parts.map((p) => new Promise((ok, bad) => { const w = new Worker(__filename, { workerData: { jobs: p } }); w.on('message', (m) => { res.push(...m); ok(); }); w.on('error', bad); }))).then(() => {
    const D = { k1: [], k5: [] };
    res.sort((a, b) => a[1] - b[1]).forEach(([lv, seed, ok]) => { if (ok) D[lv === 1 ? 'k1' : 'k5'].push(seed); });
    for (const k in D) console.log(k, D[k].length, 'of', N);
    console.log('in', Math.round((Date.now() - t0) / 1000) + 's on', W, 'threads');
    fs.writeFileSync(path.join(__dirname, '../../games/tripeaks/deals.js'),
      '/* 365 TriPeaks - deal numbers proven winnable with King and Ace joining round the corner (k1: Easy, Normal) and without\n'
      + ' * (k5: Hard, Expert): each was solved and then replayed move by move on a fresh deal. Built ' + new Date().toISOString().slice(0, 10) + ' by\n'
      + ' * tools/tripeaks/make-deals.cjs (deals 1-' + N + ', solver limit ' + LIMIT + '). */\n'
      + '(function (root) {\n  var D = { k1: [' + D.k1.join(',') + '],\n    k5: [' + D.k5.join(',') + '] };\n'
      + "  if (typeof module !== 'undefined' && module.exports) module.exports = D; else root.TP_DEALS = D;\n})(typeof window !== 'undefined' ? window : this);\n");
  });
}
