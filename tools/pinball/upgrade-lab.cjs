/* 365 Pinball Hero - the EMBER RUN deck lab (wave 3; ported from the audit's 03 upgrade-lab.cjs). Never deployed.
 *   node tools/pinball/upgrade-lab.cjs [balls=40] [--bot lag] [--speed 2] [--round 5] [--workers 16]
 * One round (default round 5's harder missions, Classic) with ONE ball, the same seeds for every card: the plain table,
 * each card alone and each mutation alone. Prints each one's clear rate against the plain table's, and whether it
 * played bit-identical to the plain table (a card or mutation that changes nothing). Acceptance (plan 6.3): no card or
 * mutation bit-identical to the plain table; each card moves its round's clear rate by +5 to +20 points. Through heavy.cjs. */
'use strict';
const { fork } = require('child_process');
const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const pos = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--')));

if (process.env.UPGRADE_LAB_WORKER) {
  const B = require('./run-bots.cjs'), E = B.E, Run = B.Run;
  function round(cfg, seed, m) {   // one round with one ball; -> { hit, sig }
    const R = Run.newRun(seed, m.speed);
    R.round = m.round - 1; R.balls = 1;
    if (cfg.up) R.ups[cfg.up] = 1;
    if (cfg.up === 'wind') R.balls++;   // (SECOND WIND acts at the pick; INTEREST between rounds, so it plays the round bit-identical by design)
    if (cfg.mut) R.muts = [cfg.mut];
    const W = Run.startRound(R), input = B.bot(m.bot, seed);
    for (let i = 0; i < 60 * 60 * 8 && R.phase === 'play'; i++) {
      E.step(W, input(W)); Run.update(R, W); W.events.length = 0; R.news.length = 0;
      if (R.cleared && R.phase === 'play') { W.balls.length = 0; W.feed = 0; }
    }
    const o = E.clone(W); delete o.mod; delete o.goals; delete o.next;
    return { hit: R.cleared, sig: W.frame + ':' + W.score + ':' + JSON.stringify(o.stats) };
  }
  process.on('message', (m) => { const out = m.jobs.map((j) => Object.assign({}, j, round(j.cfg, j.seed, m))); process.send(out); process.exit(0); });
  return;
}
const N = +(pos[0] || 40), bot = arg('--bot', 'lag'), speed = +arg('--speed', 2), rnd = +arg('--round', 5), NW = +arg('--workers', 16);
const Run = require('../../games/pinball/run.js');
const cfgs = [{ name: 'plain' }].concat(Run.UPGRADES.map((u) => ({ name: u.id, up: u.id })), Run.MUTATIONS.map((m) => ({ name: 'm:' + m.id, mut: m.id })));
const jobs = []; cfgs.forEach((cfg) => { for (let i = 0; i < N; i++) jobs.push({ cfg, seed: 7000 + i * 29 }); });
const share = Array.from({ length: NW }, () => []), res = [], t0 = Date.now();
jobs.forEach((j, i) => share[i % NW].push(j));
let left = NW;
console.log('UPGRADE LAB: round ' + rnd + ', one ball, ' + N + ' seeds a card, bot ' + bot + ', speed ' + speed);
share.forEach((js) => {
  const ch = fork(__filename, [], { env: Object.assign({}, process.env, { UPGRADE_LAB_WORKER: '1' }) });
  ch.on('message', (out) => res.push(...out));
  ch.on('exit', () => { if (--left === 0) report(); });
  ch.send({ jobs: js, bot, speed, round: rnd });
});
function report() {
  const by = {}; res.forEach((r) => { (by[r.cfg.name] = by[r.cfg.name] || {})[r.seed] = r; });
  const base = by.plain, seeds = Object.keys(base), rate = (name) => seeds.filter((s) => by[name][s].hit).length / seeds.length;
  const b = rate('plain'); let same = 0, inBand = 0, cards = 0;
  console.log('  plain'.padEnd(20) + (100 * b).toFixed(0) + '% cleared');
  cfgs.slice(1).forEach((c) => {
    const r = rate(c.name), ident = seeds.every((s) => by[c.name][s].sig === base[s].sig), dpts = 100 * (r - b);
    if (ident) same++;
    if (c.up) { cards++; if (dpts >= 5 && dpts <= 20) inBand++; }
    console.log('  ' + c.name.padEnd(18) + (100 * r).toFixed(0).padStart(3) + '% cleared (' + (dpts >= 0 ? '+' : '') + dpts.toFixed(0) + ' points)' + (ident ? '  BIT-IDENTICAL to the plain table' : ''));
  });
  console.log('bit-identical to the plain table: ' + same + '; cards moving the clear rate +5 to +20 points: ' + inBand + ' of ' + cards);
  console.log('lab took ' + ((Date.now() - t0) / 1000).toFixed(0) + ' s');
}
