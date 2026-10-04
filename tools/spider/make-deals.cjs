// 365 Spider - the deals proven winnable at one suit (s1, Easy), two (s2, Normal) and four (s4, Hard and Expert), by
// tools/spider/solver.cjs, each solution replayed on a fresh deal before it counts. Spread over the PC's cores.
// Run: node tools/spider/make-deals.cjs [N=400]  ->  games/spider/deals.js
const fs = require('fs'), path = require('path'), os = require('os');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const LIMIT = 400000;
if (!isMainThread) {
  const S = require('./solver.cjs');
  const out = [];
  for (const [lv, seed] of workerData.jobs) { const r = S.solve(seed, lv, LIMIT); out.push([lv, seed, r.won && S.replay(seed, lv, r.moves) ? r.moves.length : 0]); }
  parentPort.postMessage(out);
} else {
  const N = +(process.argv[2] || 400), jobs = [];
  for (const lv of [1, 3, 5]) for (let seed = 1; seed <= N; seed++) jobs.push([lv, seed]);
  const W = Math.max(1, Math.min(40, os.cpus().length - 4)), parts = Array.from({ length: W }, () => []);
  jobs.forEach((j, i) => parts[i % W].push(j));
  const t0 = Date.now(), res = [];
  Promise.all(parts.map((p) => new Promise((ok, bad) => { const w = new Worker(__filename, { workerData: { jobs: p } }); w.on('message', (m) => { res.push(...m); ok(); }); w.on('error', bad); }))).then(() => {
    const D = { s1: [], s2: [], s4: [] }, KEY = { 1: 's1', 3: 's2', 5: 's4' };
    res.sort((a, b) => a[1] - b[1]).forEach(([lv, seed, len]) => { if (len) D[KEY[lv]].push(seed); });
    for (const k in D) console.log(k, D[k].length, 'of', N);
    console.log('in', Math.round((Date.now() - t0) / 1000) + 's on', W, 'threads');
    fs.writeFileSync(path.join(__dirname, '../../games/spider/deals.js'),
      '/* 365 Spider - deal numbers proven winnable with one suit (s1, Easy), two (s2, Normal) and four (s4, Hard and Expert):\n'
      + ' * each was solved and then replayed move by move on a fresh deal. Built ' + new Date().toISOString().slice(0, 10) + ' by tools/spider/make-deals.cjs (deals 1-' + N + ', solver limit ' + LIMIT + '). */\n'
      + '(function (root) {\n  var D = { s1: [' + D.s1.join(',') + '],\n    s2: [' + D.s2.join(',') + '],\n    s4: [' + D.s4.join(',') + '] };\n'
      + "  if (typeof module !== 'undefined' && module.exports) module.exports = D; else root.SP_DEALS = D;\n})(typeof window !== 'undefined' ? window : this);\n");
  });
}
