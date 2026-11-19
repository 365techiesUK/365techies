// 365 Pinball Hero - EMBER RUN tests and bot farm (30 Oct 2026, owner: "change how it plays"). node tools/pinball/run-test.cjs
// [--runs 300] [--no-farm]. Unit tests first (offers and mutations follow the seed, upgrades apply and stack in the engine,
// the boss loses HP on crater shots and eruptions, second wind and twin ball, Classic untouched), then the BOT FARM: whole
// runs played by the pilot (games/pinball/pilot.js) with a little human noise (a late flip now and then, a fumble), picking
// upgrades by a fixed priority, spread over worker processes. It prints how far the runs got; the targets and boss HP in
// run.js are tuned from it (the bot's median run ends round 3-4, roughly 5-15% of runs win).
'use strict';
const path = require('path'), os = require('os'), { fork } = require('child_process');
const E = require('../../games/pinball/engine.js'), Pilot = require('../../games/pinball/pilot.js'), Run = require('../../games/pinball/run.js');
const CAP = 60 * 60 * 6;   // a ball kept alive longer than 6 minutes is called drained (the farm's safety net, never reached in tuning)
const PRIORITY = ['net', 'wind', 'tamer', 'gold', 'pump', 'interest', 'forge', 'fire', 'bumper', 'lavakick', 'twin', 'lanes', 'crab'];

// ------------------------------------------------------------ the bot: the pilot, a frame or two late now and then, and the odd fumble
function bot(seed) {
  let s = (seed * 69069 + 1) & 0x7fffffff || 1, q = [], lag = 0, fumble = 0, ball = -1;
  const r = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  return function (W) {
    if (W.ball !== ball || W.frame < 2) { ball = W.ball; lag = Math.floor(r() * 3); q = []; }
    const inp = Pilot.input(W);
    q.push(inp);
    let out = q.length > lag ? q.shift() : {};
    if (fumble > 0) { fumble--; out = Object.assign({}, out, { left: false, right: false }); }
    else if (r() < 1 / 1500) fumble = 3 + Math.floor(r() * 4);
    return out;
  };
}
function playRun(seed, speed) {
  const R = Run.newRun(seed, speed || 2), input = bot(seed);
  let W = Run.startRound(R), n = 0;
  while (true) {
    E.step(W, input(W)); W.events.length = 0; n++;
    if (n > CAP && !W.over) { W.balls.length = 0; n = 0; }   // (see CAP)
    const ph = Run.update(R, W); R.news.length = 0;
    if (ph === 'pick') { const id = PRIORITY.find((p) => R.offer.indexOf(p) >= 0) || R.offer[0]; Run.pick(R, id); W = Run.startRound(R); n = 0; }
    else if (ph === 'over' || ph === 'won') return Run.summary(R);
  }
}

if (process.env.RUN_FARM_WORKER) {   // a worker: play its share of the seeds and send the summaries back
  process.on('message', (m) => { if (m.cal) { Run.TARGET.forEach((t, i) => { Run.TARGET[i] = i ? 100000 : 0; }); Run.HP[4] = Run.HP[8] = 1; }   // --calibrate: every round passes, so each round's spread shows
    const out = m.seeds.map((sd) => { const s = playRun(sd, m.speed); return { seed: sd, won: s.won, reached: s.reached, cleared: s.cleared, score: s.score, rounds: s.rounds, upgrades: s.upgrades }; }); process.send(out); process.exit(0); });
  return;
}

// ------------------------------------------------------------ unit tests
let pass = 0, fail = 0;
function ok(c, name, detail) { if (c) { pass++; console.log('  ok   ' + name); } else { fail++; console.log('  FAIL ' + name + (detail ? ' - ' + detail : '')); } }
function scripted(seed) {   // a run with every round ended by hand (the world's state set directly): offers, picks, mutations
  const R = Run.newRun(seed, 2), seen = [];
  for (let r = 1; r <= 7; r++) {
    const W = Run.startRound(R);
    if (R.boss) { W.stats.craters += 5; W.stats.eruptions += 2; } else W.score += R.target;
    Run.update(R, W); W.over = true; Run.update(R, W);
    seen.push(R.offer.join(',') + '>' + R.mutNext.id); Run.pick(R, R.offer[0]);
  }
  return { R, seen };
}
console.log('EMBER RUN unit tests');
(function () {
  const a = scripted(42), b = scripted(42), c = scripted(43);
  ok(JSON.stringify(a.seen) === JSON.stringify(b.seen), 'the same seed and picks offer the same upgrades and mutations');
  ok(JSON.stringify(a.seen) !== JSON.stringify(c.seen), 'another seed offers others');
  ok(a.seen.every((s) => new Set(s.split('>')[0].split(',')).size === 3), 'each offer is 3 different upgrades');
  ok(new Set(a.R.muts).size === 7, 'seven rounds, seven different mutations');
  ok(Run.UPGRADES.length >= 12 && Run.UPGRADES.every((u) => u.id && u.name && u.text && u.max >= 1), Run.UPGRADES.length + ' upgrades, each with an id, name, line and stack limit');
  ok(Run.MUTATIONS.every((m) => m.id && m.name && m.text), Run.MUTATIONS.length + ' mutations, each with an id, name and line');
  const R = Run.newRun(5, 2); Run.startRound(R);
  ok(!Run.pick(R, 'gold'), 'no pick outside the pick phase');
  const src = require('fs').readFileSync(path.join(__dirname, '../../games/pinball/run.js'), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
  ok(!/Math\.random/.test(src), 'run.js has no Math.random');
})();
(function () {   // upgrades stack into the engine's knobs
  const R = Run.newRun(1, 2); R.ups = { gold: 2, pump: 1, crab: 1, net: 2, bumper: 1, fire: 1, tamer: 1 }; R.muts = ['skitter', 'thin', 'fuse', 'hotcrab', 'crust'];
  const M = Run.mod(R);
  ok(M.x.ramp === 9 && M.x.drop === 3 && M.x.bumper === 4 && M.x.erupt === 2 && M.x.crab === 10, 'score multipliers stack', JSON.stringify(M.x));
  ok(Math.abs(M.press - 1.2) < 1e-9 && Math.abs(M.crab - 0.96) < 1e-9 && M.save === 9 && M.decay > 0, 'pressure, crab speed, ball save, leak', JSON.stringify(M));
  R.ups = { forge: 2, lanes: 1 }; R.muts = ['deadkick']; R.deadKick = true;
  const W = Run.startRound(R);
  ok(W.mult === 3 && W.lanes.filter(Boolean).length === 2 && W.kickback === false && W.mod.noKick && W.total === Run.BALLS[2] && W.extraAt.length === 0, 'a round: forge x3, two lit lanes, dead kickback, the pool of ' + Run.BALLS[2] + ' balls, no extra balls');
})();
(function () {   // the engine applies them: the same presses with and without x4 fumaroles differ by exactly the fumaroles' extra
  const A = E.newWorld(2, 0, 9, 'ember'); A.extraAt = []; A.mod = Run.mod(Run.newRun(1, 2));
  const B = E.clone(A); B.mod.x.bumper = 4; B.mod.x.ramp = 3;
  for (let i = 0; i < 60 * 90 && !A.over; i++) { const inp = Pilot.input(A); E.step(A, inp); E.step(B, inp); A.events.length = 0; B.events.length = 0; }
  const P = E.table('ember').PTS;
  ok(JSON.stringify(A.stats) === JSON.stringify(B.stats) && A.stats.bumpers > 0, 'multipliers change only the score (' + A.stats.bumpers + ' fumaroles, ' + A.stats.ramps + ' ramps)');
  const extra = B.score - A.score, bumpX = 3 * P.bumper * A.stats.bumpers;
  ok(extra >= bumpX && (A.stats.ramps === 0 ? extra === bumpX : extra > bumpX), 'the extra is the fumaroles x4 and the ramps x3', extra + ' vs ' + bumpX);
  // a neutral W.mod (everything x1) plays exactly as a Classic world
  const C = E.newWorld(2, 0, 365, 'ember'), D = E.clone(C); D.mod = { x: {}, press: 1, crab: 1, lava: 1, gey: 1, save: 0, noKick: false, decay: 0 };
  for (let i = 0; i < 60 * 120 && !C.over; i++) { const inp = Pilot.input(C); E.step(C, inp); E.step(D, inp); C.events.length = 0; D.events.length = 0; }
  const strip = (w) => { const o = E.clone(w); delete o.mod; return JSON.stringify(o); };
  ok(strip(C) === strip(D), 'a neutral W.mod steps bit-for-bit as Classic (2 minutes of play)');
})();
(function () {   // Classic: a game recorded before the run hooks went in (30 Oct 2026) still scores the same
  const W = E.newWorld(2, 0, 1, 'ember');
  for (let i = 0; i < 14400 && !W.over; i++) { E.step(W, Pilot.input(W)); W.events.length = 0; }
  ok(!('mod' in W) && W.score === 295399000 && W.frame === 14400, 'Classic Ember Peak, seed 1, 4 minutes: 295,399,000 as before (wave 3: THE BIG ONE)', String(W.score));
  const O = E.newWorld(2, 0, 7, 'orbit');
  for (let i = 0; i < 14400 && !O.over; i++) { E.step(O, Pilot.input(O)); O.events.length = 0; }
  ok(O.score === 346940 && O.frame === 14400, 'Classic orbit table, seed 7: 346,940 @14400 as before (wave 3)', O.score + ' @' + O.frame);
})();
(function () {   // the boss
  const R = Run.newRun(3, 2); R.round = 3; const W = Run.startRound(R);
  ok(R.boss && R.round === 4 && R.hp === Run.HP[4] && R.target === 0, 'round 4 is a boss round with ' + R.hp + ' HP');
  R.hp = R.hpMax = 1000;   // a deep pool for the damage sums: the tuned HP (30) clamps at 0 before the sums are done (30 Oct 2026, review)
  W.stats.craters++; Run.update(R, W);
  ok(R.hp === 1000 - Run.DMG.crater, 'a crater shot does ' + Run.DMG.crater, String(R.hp));
  W.stats.craters++; W.stats.eruptions++; Run.update(R, W);
  ok(R.hp === 1000 - 2 * Run.DMG.crater - Run.DMG.erupt, 'a full eruption does ' + (Run.DMG.crater + Run.DMG.erupt), String(R.hp));
  W.stats.lava++; W.stats.ramps++; Run.update(R, W);
  ok(R.hp === 1000 - 2 * Run.DMG.crater - Run.DMG.erupt - Run.DMG.lava - Run.DMG.ramp, 'lava lane and ramp shots chip at it');
  W.stats.craters += 50; W.stats.eruptions += 50; Run.update(R, W);
  ok(R.hp === 0 && R.hit, 'beaten: the round is won');
  W.over = true; ok(Run.update(R, W) === 'pick' && R.offer.length === 3, 'the score is ignored: on to the pick');
  const R2 = Run.newRun(3, 2); R2.round = 3; const W2 = Run.startRound(R2); W2.score += 1e9; W2.over = true;
  ok(Run.update(R2, W2) === 'over', 'a boss not beaten ends the run, whatever the score');
  const R3 = Run.newRun(3, 2); R3.round = 7; R3.ups.tamer = 1; const W3 = Run.startRound(R3); W3.stats.craters++; Run.update(R3, W3);
  ok(R3.hp === Run.HP[8] - Run.DMG.crater * 1.5, 'VOLCANO TAMER: +50% damage');
  W3.stats.craters += 20; W3.stats.eruptions += 10; Run.update(R3, W3); W3.over = true;
  ok(Run.update(R3, W3) === 'won' && Run.summary(R3).won, 'round 8 boss beaten: RUN WON');
})();
(function () {   // a real round played by the pilot: target, second wind, twin ball, summary
  const R = Run.newRun(11, 2); R.ups = { twin: 1 }; R.wind = 1; R.ups.wind = 1;
  const W = Run.startRound(R); let twin = 0, wind = false;
  // (wave 3: the pilot's balls last a median 251 s, so each ball is drained by hand after 90 s; TWIN BALL now adds a
  // ball to every multiball, so one is started by hand)
  for (let i = 0, f = 0; i < CAP && R.phase === 'play'; i++, f++) {
    if (i === 600) E.api.multiball(W, 2);
    if (W.state === 'play' && f > 60 * 90) { W.balls.length = 0; W.feed = 0; f = 0; }
    E.step(W, Pilot.input(W)); Run.update(R, W); W.events.length = 0; twin = Math.max(twin, W.balls.length + W.feed); R.news.forEach((x) => { if (x.big === 'SECOND WIND') wind = true; }); R.news.length = 0;
  }
  ok(twin >= 3, 'TWIN BALL: a 2-ball multiball gets a third ball');
  ok(R.phase === 'pick' || wind || R.phase === 'over', 'the round ends in a pick or the run ends (' + R.phase + ', second wind used: ' + wind + ')');
  const s = Run.summary(R);
  ok(s.reached === 1 && s.rounds.length === 1 && typeof s.score === 'number', 'summary: reached, rounds, score');
  ok(Run.better({ won: true, cleared: 8, score: 1 }, { won: false, cleared: 7, score: 9e9 }) && !Run.better({ won: false, cleared: 2, score: 5 }, { won: false, cleared: 3, score: 1 }), 'best run: a win beats any loss, then rounds, then score');
  ok(Run.loadBest() === null && Run.saveBest(s) === true, 'no localStorage in node: best run reads null and never throws');
})();
console.log(pass + ' passed, ' + fail + ' failed');

// ------------------------------------------------------------ the bot farm
const argv = process.argv.slice(2), runs = +(argv[argv.indexOf('--runs') + 1] || 0) || 300, speed = +(argv[argv.indexOf('--speed') + 1] || 0) || 2;
if (argv.indexOf('--no-farm') >= 0) { process.exitCode = fail ? 1 : 0; return; }
const nw = Math.max(1, Math.min(os.cpus().length - 2, 40)), t0 = Date.now(), results = [];
let left = nw;
console.log('\nBOT FARM: ' + runs + ' runs at speed ' + speed + ' on ' + nw + ' workers');
for (let w = 0; w < nw; w++) {
  const seeds = []; for (let i = w; i < runs; i += nw) seeds.push(1000 + i * 7919);
  const ch = fork(__filename, [], { env: Object.assign({}, process.env, { RUN_FARM_WORKER: '1' }) });
  ch.on('message', (out) => { results.push(...out); });
  ch.on('exit', () => { if (--left === 0) report(); });
  ch.send({ seeds, speed, cal: argv.indexOf('--calibrate') >= 0 });
}
function report() {
  const N = results.length, reached = Array(10).fill(0), wins = results.filter((r) => r.won).length;
  results.forEach((r) => { reached[r.won ? 9 : r.reached]++; });
  const sorted = results.map((r) => (r.won ? 9 : r.reached)).sort((a, b) => a - b), med = sorted[Math.floor(N / 2)];
  console.log('ended in round: ' + [1, 2, 3, 4, 5, 6, 7, 8].map((r) => r + ':' + reached[r]).join('  ') + '  WON:' + wins);
  console.log('median run ends in round ' + (med === 9 ? 'WON' : med) + '; ' + (100 * wins / N).toFixed(1) + '% of runs won');
  const per = {}; results.forEach((r) => r.rounds.forEach((l) => { (per[l.round] = per[l.round] || []).push(l); }));
  Object.keys(per).forEach((k) => {
    const L = per[k], sc = L.map((l) => l.score).sort((a, b) => a - b), p = (f) => sc[Math.floor(f * (sc.length - 1))];
    console.log('  round ' + k + (L[0].boss ? ' (boss)' : '') + ': played ' + L.length + ', cleared ' + L.filter((l) => l.hit).length + (L[0].boss ? ', damage p25/p50/p75 ' + [0.25, 0.5, 0.75].map((f) => L.map((l) => l.dmg).sort((a, b) => a - b)[Math.floor(f * (L.length - 1))]).join('/') : ', target ' + E.fmt(L[0].target)) + ', score p25/p50/p75 ' + [p(0.25), p(0.5), p(0.75)].map((v) => (v / 1e6).toFixed(1) + 'M').join('/'));
  });
  if (argv.indexOf('--calibrate') >= 0) Object.keys(per).forEach((k) => { const L = per[k], v = L.map((l) => (L[0].boss ? l.dmg : l.score)).sort((a, b) => a - b); console.log('  calibrate round ' + k + ' p10..p40: ' + [0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4].map((f) => v[Math.floor(f * (v.length - 1))]).join(' ')); });
  console.log('farm took ' + ((Date.now() - t0) / 1000).toFixed(0) + ' s');
  const healthy = N === runs && med >= 3 && med <= 4 && wins / N >= 0.05 && wins / N <= 0.15;
  console.log(healthy ? 'farm: in the tuning band' : 'farm: OUTSIDE the tuning band (median round 3-4, 5-15% wins)');
  process.exitCode = fail ? 1 : 0;
}
