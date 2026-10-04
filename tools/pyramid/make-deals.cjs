// 365 Pyramid - the deals proven winnable at each level, by tools/pyramid/solver.cjs, each solution replayed on a fresh
// deal before it counts. One search per deal finds the fewest times through the deck that wins it (one, two, three or
// four): a deal won in two is a deal for Hard (twice) and everything easier. Spread over the PC's cores.
// Run: node tools/pyramid/make-deals.cjs [N=4000]  ->  games/pyramid/deals.js
const fs = require('fs'), path = require('path'), os = require('os');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const LIMIT = 3000000;
if (!isMainThread) {
  const S = require('./solver.cjs');
  const out = [];
  const STRICT = { 1: 7, 2: 5, 3: 3, 4: 1 };   // the line is replayed at the hardest level it is listed for
  for (const seed of workerData.jobs) { const r = S.solve(seed, 1, LIMIT); out.push([seed, r.won && S.replay(seed, STRICT[r.passes], r.moves) ? r.passes : 0]); }
  parentPort.postMessage(out);
} else {
  const N = +(process.argv[2] || 4000), jobs = [];
  for (let seed = 1; seed <= N; seed++) jobs.push(seed);
  const W = Math.max(1, Math.min(40, os.cpus().length - 4)), parts = Array.from({ length: W }, () => []);
  jobs.forEach((j, i) => parts[i % W].push(j));
  const t0 = Date.now(), res = [];
  Promise.all(parts.map((p) => new Promise((ok, bad) => { const w = new Worker(__filename, { workerData: { jobs: p } }); w.on('message', (m) => { res.push(...m); ok(); }); w.on('error', bad); }))).then(() => {
    // p1: once through the deck (Expert), p2: twice (Hard), p3: three times (Normal), p4: Easy (as often as you like)
    const D = { p1: [], p2: [], p3: [], p4: [] };
    res.sort((a, b) => a[0] - b[0]).forEach(([seed, passes]) => { if (!passes) return; for (let k = passes; k <= 4; k++) D['p' + k].push(seed); });
    for (const k in D) console.log(k, D[k].length, 'of', N);
    console.log('in', Math.round((Date.now() - t0) / 1000) + 's on', W, 'threads');
    fs.writeFileSync(path.join(__dirname, '../../games/pyramid/deals.js'),
      '/* 365 Pyramid - deal numbers proven winnable going through the deck once (p1, Expert), twice (p2, Hard), three times (p3,\n'
      + ' * Normal) and up to four (p4, Easy): each was solved and then replayed move by move on a fresh deal. Built ' + new Date().toISOString().slice(0, 10) + '\n'
      + ' * by tools/pyramid/make-deals.cjs (deals 1-' + N + ', solver limit ' + LIMIT + '). */\n'
      + '(function (root) {\n  var D = { p1: [' + D.p1.join(',') + '],\n    p2: [' + D.p2.join(',') + '],\n    p3: [' + D.p3.join(',') + '],\n    p4: [' + D.p4.join(',') + '] };\n'
      + "  if (typeof module !== 'undefined' && module.exports) module.exports = D; else root.PY_DEALS = D;\n})(typeof window !== 'undefined' ? window : this);\n");
  });
}
