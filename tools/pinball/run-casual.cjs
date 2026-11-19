/* 365 Pinball Hero - EMBER RUN played by a bot, for tuning the run to casual players (wave 3; ported from the audit's 01
 * runmessy.cjs). Never deployed. node tools/pinball/run-casual.cjs <messy|lag|pilot> [runs=150] [speed=1] [--workers 16]
 * [--json file]. The surface only (run-bots.cjs): a lit DIVE after STAGE CLEAR ends the round. Prints how far runs get,
 * round 1's mission rate, mission times, the boss (phase 1 cleared, kills, the gap between HP changes, balls that did no
 * damage), stars and the run's length. Acceptance (plan 6.3): messy 150 Gentle - at most 10% of runs end in round 1, at
 * least 40% reach round 4, wins 3-10%, median run 3-6 min; lag 30 Classic - wins 20-30%. Run it through heavy.cjs. */
'use strict';
const fs = require('fs'), { fork } = require('child_process');
const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const pos = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--')));

if (process.env.RUN_CASUAL_WORKER) {
  const B = require('./run-bots.cjs');
  process.on('message', (m) => {
    const out = m.seeds.map((sd) => {
      const ballF = []; let bf = 0, lastBall = 1, lastRound = 1;
      const r = B.playRun(sd, m.speed, m.bot, { onStep: (R, W) => { if (R.round !== lastRound) { lastRound = R.round; lastBall = 1; bf = 0; } if (W.ball !== lastBall) { ballF.push(bf); bf = 0; lastBall = W.ball; } if (W.state === 'play') bf++; } });
      const s = r.sum;
      return { seed: sd, won: s.won, reached: s.reached, cleared: s.cleared, score: s.score, frames: r.frames, rounds: s.rounds,
        boss: r.R.log.filter((l) => l.boss), ballF, taken: r.R.taken.slice(), muts: r.R.muts.slice(), cause: s.cause, near: s.nearMiss.length };
    });
    process.send(out); process.exit(0);
  });
  return;
}

const bot = pos[0] || 'messy', N = +(pos[1] || 150), speed = +(pos[2] || 1), NW = +arg('--workers', 16);
const t0 = Date.now(), res = [], share = Array.from({ length: NW }, () => []);
for (let i = 0; i < N; i++) share[i % NW].push(500 + i * 13);
let left = NW;
console.log('EMBER RUN ' + bot + ' x ' + N + ' at speed ' + speed + ' on ' + NW + ' workers');
share.forEach((seeds) => {
  const ch = fork(__filename, [], { env: Object.assign({}, process.env, { RUN_CASUAL_WORKER: '1' }) });
  ch.on('message', (out) => res.push(...out));
  ch.on('exit', () => { if (--left === 0) report(); });
  ch.send({ seeds, speed, bot });
});
const q = (a, p) => { if (!a.length) return NaN; const s = a.slice().sort((x, y) => x - y); return s[Math.floor(p * (s.length - 1))]; };
const pct = (a, b) => (b ? (100 * a / b).toFixed(0) + '%' : '-');
function report() {
  const ends = {}, n = res.length;
  res.forEach((r) => { const k = r.won ? 'WON' : 'r' + r.reached; ends[k] = (ends[k] || 0) + 1; });
  const r1 = res.filter((r) => r.rounds[0]), r1done = r1.filter((r) => r.rounds[0].hit).length;
  const reach4 = res.filter((r) => r.won || r.reached >= 4).length, wins = res.filter((r) => r.won).length;
  const mins = res.map((r) => r.frames / 3600);
  console.log('ends: ' + Object.keys(ends).sort().map((k) => k + ' ' + ends[k]).join(', '));
  console.log('ended in round 1: ' + pct(ends.r1 || 0, n) + '; reached round 4: ' + pct(reach4, n) + '; won: ' + pct(wins, n) + '; median run ' + q(mins, 0.5).toFixed(1) + ' min (p10 ' + q(mins, 0.1).toFixed(1) + ', p90 ' + q(mins, 0.9).toFixed(1) + ')');
  console.log('round 1 mission done: ' + pct(r1done, r1.length));
  const per = {};
  res.forEach((r) => r.rounds.forEach((l) => { (per[l.round] = per[l.round] || []).push(l); }));
  Object.keys(per).forEach((k) => {
    const L = per[k], cl = L.filter((l) => l.hit), secs = cl.map((l) => l.secs);
    const byM = {}; L.forEach((l) => { const id = l.boss ? 'boss' : l.mission; byM[id] = byM[id] || [0, 0]; byM[id][0]++; if (l.hit) byM[id][1]++; });
    console.log('  round ' + k + ': played ' + L.length + ', cleared ' + pct(cl.length, L.length) + (secs.length ? ', clear p50 ' + q(secs, 0.5).toFixed(0) + ' s' : '') + ', stars ' + pct(L.filter((l) => l.star).length, L.length)
      + ', balls lost/round ' + (L.reduce((a, l) => a + l.lost, 0) / L.length).toFixed(2) + '  [' + Object.keys(byM).map((id) => id + ' ' + byM[id][1] + '/' + byM[id][0]).join(', ') + ']');
  });
  const boss = [].concat(...res.map((r) => r.boss));
  if (boss.length) {
    const p1 = boss.filter((b) => b.hit || b.phase >= 2).length, kills = boss.filter((b) => b.hit).length;
    const gaps = [], bd = [];
    boss.forEach((b) => { let f0 = 0; (b.hits || []).forEach((f) => { gaps.push((f - f0) / 60); f0 = f; }); if (!b.hit) gaps.push((b.frames - f0) / 60); (b.ballDmg || []).forEach((x) => bd.push(x)); });
    console.log('boss rounds ' + boss.length + ': phase 1 cleared ' + pct(p1, boss.length) + ', killed ' + pct(kills, boss.length) + ', HP left when lost p50 ' + q(boss.filter((b) => !b.hit).map((b) => b.hp), 0.5)
      + '; gap between HP changes p50 ' + q(gaps, 0.5).toFixed(1) + ' s, p90 ' + q(gaps, 0.9).toFixed(1) + ' s; balls that did no damage ' + pct(bd.filter((x) => x === 0).length, bd.length));
  }
  const balls = [].concat(...res.map((r) => r.ballF)).map((f) => f / 60);
  console.log('ball life (s): p50 ' + q(balls, 0.5).toFixed(0) + ', mean ' + (balls.reduce((a, b) => a + b, 0) / Math.max(1, balls.length)).toFixed(0));
  const ms = [].concat(...res.map((r) => r.rounds.filter((l) => !l.boss && l.hit).map((l) => l.secs)));
  console.log('mission done at p50 ' + q(ms, 0.5).toFixed(0) + ' s = ' + (100 * q(ms, 0.5) / Math.max(1, (balls.reduce((a, b) => a + b, 0) / Math.max(1, balls.length)))).toFixed(0) + '% of the mean ball life');
  const causes = {}; res.forEach((r) => { causes[r.cause] = (causes[r.cause] || 0) + 1; });
  console.log('causes: ' + JSON.stringify(causes) + '; runs with a near miss: ' + res.filter((r) => r.near).length);
  console.log('farm took ' + ((Date.now() - t0) / 1000).toFixed(0) + ' s');
  const out = arg('--json', null); if (out) fs.writeFileSync(out, JSON.stringify(res));
}
