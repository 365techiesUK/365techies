// 365 Pinball Hero - EMBER RUN tests and bot farm (30 Oct 2026, owner: "change how it plays"; wave 3, 5 Nov 2026: the ball
// pool, missions, STAGE CLEAR, the three-phase volcano, the daily seed). node tools/pinball/run-test.cjs [--runs 120]
// [--speed 2] [--bot pilot|lag|messy] [--no-farm]. Unit tests first (offers, mutations and missions follow the seed,
// upgrades apply in the engine, the pool of balls, missions, the boss, the daily seed, Classic untouched), then the BOT
// FARM: whole runs (tools/pinball/run-bots.cjs: the surface only, a lit DIVE after STAGE CLEAR ends the round) spread
// over worker processes. Acceptance (wave 3): the pilot wins at most 50% of runs.
'use strict';
const path = require('path'), os = require('os'), fs = require('fs'), { fork } = require('child_process');
const E = require('../../games/pinball/engine.js'), Pilot = require('../../games/pinball/pilot.js'), Run = require('../../games/pinball/run.js');
const CAP = 60 * 60 * 6;

if (process.env.RUN_FARM_WORKER) {   // a worker: play its share of the seeds and send the summaries back
  const B = require('./run-bots.cjs');
  process.on('message', (m) => {
    const out = m.seeds.map((sd) => { const r = B.playRun(sd, m.speed, m.bot); const s = r.sum; return { seed: sd, won: s.won, reached: s.reached, cleared: s.cleared, score: s.score, rounds: s.rounds, frames: r.frames, boss: r.R.log.filter((l) => l.boss) }; });
    process.send(out); process.exit(0);
  });
  return;
}

// ------------------------------------------------------------ unit tests
let pass = 0, fail = 0;
function ok(c, name, detail) { if (c) { pass++; console.log('  ok   ' + name); } else { fail++; console.log('  FAIL ' + name + (detail ? ' - ' + detail : '')); } }
function bump(R, W) {   // makes the round's current mission step happen (the world's stats set directly)
  const m = R.mission, st = Run.MISSIONS[m.id].steps[m.k];
  if (st[0] === 'bank') { W.dropsDown = 0; Run.update(R, W); W.dropsDown = E.table('ember').T.drops.n; } else W.stats[st[0]] += st[1];
  Run.update(R, W);
}
function clearRound(R, W) {   // ends a round won, by hand
  if (R.boss) { W.score += Run.HP[R.round] * Run.DMG.points; Run.update(R, W); }
  else for (let i = 0; i < 4 && !R.cleared; i++) bump(R, W);
  W.over = true; return Run.update(R, W);
}
function scripted(seed, opt) {   // a run with every round won by hand: offers, missions, picks, mutations
  const R = Run.newRun(seed, 2, opt), seen = [];
  for (let r = 1; r <= 7; r++) { const W = Run.startRound(R); const mi = R.mission ? R.mission.id : 'boss'; clearRound(R, W); seen.push(mi + ':' + R.offer.join(',') + '>' + R.mutNext.id); Run.pick(R, R.offer[0]); }
  return { R, seen };
}
console.log('EMBER RUN unit tests');
(function () {
  const a = scripted(42), b = scripted(42), c = scripted(43);
  ok(JSON.stringify(a.seen) === JSON.stringify(b.seen), 'the same seed and picks give the same missions, upgrades and mutations');
  ok(JSON.stringify(a.seen) !== JSON.stringify(c.seen), 'another seed gives others');
  ok(a.seen.every((s) => new Set(s.split(':')[1].split('>')[0].split(',')).size === 3), 'each offer is 3 different upgrades');
  ok(new Set(a.R.muts).size === 7, 'seven rounds, seven different mutations');
  const ms = a.seen.map((s) => s.split(':')[0]);
  ok(ms[0] === 'ramp2' && new Set([ms[1], ms[2]]).size === 2 && [ms[1], ms[2]].every((m) => m === 'obsidian' || m === 'erupt') && ms[3] === 'boss'
    && new Set(ms.slice(4)).size === 3 && ms.slice(4).every((m) => ['jackpot2', 'crab5', 'loop', 'lockerupt'].includes(m)), 'missions: rounds 1-3 teach (round 1 the heat ramp), round 4 the boss, rounds 5-7 three different harder ones', ms.join(' '));
  ok(Run.UPGRADES.length >= 12 && Run.UPGRADES.every((u) => u.id && u.name && u.text && u.max >= 1), Run.UPGRADES.length + ' upgrades, each with an id, name, line and stack limit');
  ok(Run.MUTATIONS.every((m) => m.id && m.name && m.text), Run.MUTATIONS.length + ' mutations, each with an id, name and line');
  const R = Run.newRun(5, 2); Run.startRound(R);
  ok(!Run.pick(R, 'gold'), 'no pick outside the pick phase');
  const src = fs.readFileSync(path.join(__dirname, '../../games/pinball/run.js'), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
  ok(!/Math\.(random|sin|cos|pow)|\bDate\b|setTimeout|setInterval/.test(src), 'run.js has no Math.random, Date, sin/cos/pow or timers');
})();
(function () {   // upgrades stack into the engine's knobs
  const R = Run.newRun(1, 2); R.ups = { gold: 2, pump: 1, crab: 1, net: 2, bumper: 1, fire: 1, tamer: 1 }; R.muts = ['skitter', 'thin', 'heat', 'hotcrab', 'crust'];
  const M = Run.mod(R);
  ok(M.x.ramp === 5 && M.x.bumper === 10 && M.x.erupt === 2 && M.x.crab === 6 && M.x.skill === 0.3 && M.noModes === true, 'score multipliers add up (x10 at most); the skill shot pays 0.3x; no island modes', JSON.stringify(M.x));
  ok(Math.abs(M.press - 1.2) < 1e-9 && Math.abs(M.crab - 0.96) < 1e-9 && M.save === 0 && M.decay > 0 && M.pressRate > 0 && M.tags.join() === R.muts.join(), 'pressure, crab speed, leak, BUILDING HEAT, the mutation tags', JSON.stringify(M));
  const Rg = Run.newRun(1, 1); Run.startRound(Rg);
  ok(Run.mod(Rg).save === Run.SAVE0[1] && Rg.mission.need === 1 && Rg.mission.text === 'HEAT RAMP X1', 'Gentle: more ball save, half the mission counts', Rg.mission.text);
  R.ups = { forge: 2, lanes: 1 }; R.muts = ['deadkick']; R.deadKick = true;
  const W = Run.startRound(R);
  ok(W.mult === 3 && W.mod.mult0 === 3 && W.lanes.filter(Boolean).length === 2 && W.mod.lanes0.filter(Boolean).length === 2 && W.kickback === false && W.mod.noKick && W.total === Run.BALLS[2] && W.extraAt.length === 0,
    'a round: forge x3 and two lit lanes on every ball, dead kickback, the pool of ' + Run.BALLS[2] + ' balls, no extra balls');
})();
(function () {   // the engine applies them: the same presses with and without x4 fumaroles differ by exactly the fumaroles' extra
  const A = E.newWorld(2, 0, 9, 'ember'); A.extraAt = []; A.mod = Run.mod(Run.newRun(1, 2));
  const B = E.clone(A); B.mod.x.bumper = 4; B.mod.x.ramp = 3;
  for (let i = 0; i < 60 * 90 && !A.over; i++) { const inp = Pilot.input(A); E.step(A, inp); E.step(B, inp); A.events.length = 0; B.events.length = 0; }
  const P = E.table('ember').PTS;
  ok(JSON.stringify(A.stats) === JSON.stringify(B.stats) && A.stats.bumpers > 0, 'multipliers change only the score (' + A.stats.bumpers + ' fumaroles, ' + A.stats.ramps + ' ramps)');
  const extra = B.score - A.score, bumpX = 3 * P.bumper * A.stats.bumpers;
  ok(extra >= bumpX && (A.stats.ramps === 0 ? extra === bumpX : extra > bumpX), 'the extra is the fumaroles x4 and the ramps x3', extra + ' vs ' + bumpX);
  const C = E.newWorld(2, 0, 365, 'ember'), D = E.clone(C); D.mod = { x: {}, press: 1, crab: 1, lava: 1, gey: 1, save: 0, noKick: false, decay: 0 };
  for (let i = 0; i < 60 * 120 && !C.over; i++) { const inp = Pilot.input(C); E.step(C, inp); E.step(D, inp); C.events.length = 0; D.events.length = 0; }
  const strip = (w) => { const o = E.clone(w); delete o.mod; return JSON.stringify(o); };
  ok(strip(C) === strip(D), 'a neutral W.mod steps bit-for-bit as Classic (2 minutes of play)');
})();
(function () {   // Classic, with no plugin: the pins (wave 3 changed Classic: no ramp combo, the multiball, the plug)
  const W = E.newWorld(2, 0, 1, 'ember');
  for (let i = 0; i < 14400 && !W.over; i++) { E.step(W, Pilot.input(W)); W.events.length = 0; }
  ok(!('mod' in W) && W.score === 295399000 && W.frame === 14400, 'Classic Ember Peak, seed 1, 4 minutes: 295,399,000 as before (wave 3: THE BIG ONE)', String(W.score));
  const O = E.newWorld(2, 0, 7, 'orbit');
  for (let i = 0; i < 14400 && !O.over; i++) { E.step(O, Pilot.input(O)); O.events.length = 0; }
  ok(O.score === 346940 && O.frame === 14400, 'Classic orbit table, seed 7: 346,940 @14400 as before (wave 3)', O.score + ' @' + O.frame);
})();
const G = require('../../games/pinball/goals.js');   // (from here on the goals plugin is registered, as in the page)
(function () {   // the pool of balls
  ok(Run.newRun(1, 1).balls === 3 && Run.newRun(1, 2).balls === 2 && Run.newRun(1, 3).balls === 1, 'the pool: Gentle 3, Classic 2, Fast 1');
  const R = Run.newRun(21, 2), W = Run.startRound(R);
  W.stats.ramps++; Run.update(R, W);
  ok(R.mission.id === 'ramp2' && R.mission.got === 1, 'round 1: HEAT RAMP X2, one counted');
  W.balls.length = 0; W.feed = 0; E.step(W, {}); Run.update(R, W);
  ok(R.balls === 1 && W.total === W.ball + 1 && R.mission.got === 1, 'a drain before the mission is done costs a ball and keeps the progress');
  for (let i = 0; i < 400 && W.state !== 'play'; i++) { E.step(W, {}); Run.update(R, W); }
  ok(W.ball === 2 && W.state === 'play', 'the next ball comes');
  const s0 = W.score; W.stats.ramps++; Run.update(R, W);
  ok(R.cleared && R.mission.done && W.score > s0 && R.news.some((x) => x.big === 'STAGE CLEAR'), 'the mission done: STAGE CLEAR with a time bonus');
  ok(W.crater.dive && W.next && W.next.text === 'STAGE CLEAR' && W.next.shot === 'crater', 'DIVE lit at the crater; THE goal says so');
  W.balls.length = 0; W.feed = 0; E.step(W, {}); Run.update(R, W);
  ok(R.balls === 1 && W.total === W.ball, 'a drain after STAGE CLEAR costs nothing and ends the round');
  let ph = R.phase; for (let i = 0; i < 400 && ph === 'play'; i++) { E.step(W, {}); ph = Run.update(R, W); }
  ok(ph === 'pick' && R.log[0].hit && R.log[0].mission === 'ramp2', 'on to the pick');
  Run.pick(R, R.offer.indexOf('wind') >= 0 ? 'wind' : R.offer[0]);
  // the last ball gone before the mission: the run is over
  const R2 = Run.newRun(22, 3), W2 = Run.startRound(R2); W2.balls.length = 0; W2.feed = 0; let p2 = 'play';
  for (let i = 0; i < 400 && p2 === 'play'; i++) { E.step(W2, {}); p2 = Run.update(R2, W2); }
  ok(p2 === 'over' && R2.balls === 0 && Run.summary(R2).cause === 'drain' && Run.summary(R2).reached === 1, 'Fast: one ball; lost before the mission = the run is over (cause: drain)');
  // SECOND WIND: one more ball, and BONUS FORGE's multiplier on it
  const R3 = Run.newRun(23, 2); R3.ups = { forge: 1 }; Run.startRound(R3); R3.phase = 'pick'; R3.offer = ['wind', 'gold', 'net']; Run.pick(R3, 'wind');
  const W3 = Run.startRound(R3);
  ok(R3.balls === 3 && W3.total === 3, 'SECOND WIND: one more ball in the pool');
  W3.balls.length = 0; W3.feed = 0; for (let i = 0; i < 400 && W3.ball === 1; i++) { E.step(W3, {}); Run.update(R3, W3); }
  ok(W3.ball === 2 && W3.mult === 2, 'SECOND WIND keeps BONUS FORGE: ball 2 starts at x2', 'mult ' + W3.mult);
  // a chamber clear on a level world: one more ball, once a round; 5 at most
  const T = Object.assign({}, E.table('ember').T, { id: 'runtestlevel', level: true }); E.addTable(T);
  const L = E.newWorld(2, 0, 1, 'runtestlevel'); L.events.push('chamberclear'); const b0 = R3.balls;
  Run.update(R3, L); Run.update(R3, L);
  ok(R3.balls === b0 + 1 && R3.phase === 'play', 'a chamber clear: one more ball, once a round');
  L.balls.length = 0; L.over = true; Run.update(R3, L);
  ok(R3.phase === 'play' && R3.balls === b0 + 1, 'a drain below the surface costs nothing, and the level world ending is not the round ending');
  R3.balls = 5; R3.chamberBall = false; Run.update(R3, L);
  ok(R3.balls === 5, 'the pool holds 5 at most');
})();
(function () {   // missions: the time bonus, two-step missions, the star
  const fast = Run.newRun(31, 2), Wf = Run.startRound(fast); Wf.frame = 60 * 20; const f0 = Wf.score; bump(fast, Wf); bump(fast, Wf);
  const slow = Run.newRun(31, 2), Ws = Run.startRound(slow); Ws.frame = 60 * 400; const s0 = Ws.score; bump(slow, Ws); bump(slow, Ws);
  ok(fast.cleared && slow.cleared && Wf.score - f0 > Ws.score - s0 && Ws.score - s0 > 0, 'STAGE CLEAR: faster pays more, slow still clears (' + E.fmt(Wf.score - f0) + ' vs ' + E.fmt(Ws.score - s0) + ')');
  const R = Run.newRun(32, 2); R.round = 4; R.mission = null; const W = Run.startRound(R); R.mission = { id: 'lockerupt', text: 'A LOCK AND AN ERUPTION', k: 0, got: 0, need: 1, done: false, early: {} };
  W.stats.eruptions++; Run.update(R, W);
  ok(!R.cleared && R.mission.k === 0, 'A LOCK AND AN ERUPTION: an eruption alone is not enough');
  W.stats.locks++; Run.update(R, W);
  ok(R.cleared, 'an eruption first and then a lock: done (either order)');
  const R2 = Run.newRun(33, 2), W2 = Run.startRound(R2); W2.score += R2.star.target; Run.update(R2, W2);
  ok(R2.star.got && !R2.cleared, 'the star is optional: reaching the old target does not clear the round');
  const st = Run.status(R2, W2);
  ok(st.balls === 2 && st.ballsMax === 5 && st.mission && st.mission.text === 'HEAT RAMP X2' && st.mission.need === 2 && st.star.got && st.boss === null, 'status: balls, ballsMax, mission, star, boss');
})();
(function () {   // THE VOLCANO
  const R = Run.newRun(3, 2); R.round = 3; const W = Run.startRound(R);
  ok(R.boss && R.round === 4 && R.bs.max === 10 * Run.UNIT && W.crater.sealed && W.crater.boss && W.next.text === 'THE VOLCANO · SEALED' && W.next.shot === 'drops', 'round 4: THE VOLCANO, 10 chunks, SEALED, the arrow on the obsidian');
  W.dropsDown = 3; Run.update(R, W);
  ok(!W.crater.sealed && R.bs.unsealT >= 1199, 'the obsidian bank cracks the seal for 20 s');
  W.stats.craters++; W.crater.took = 'boss'; Run.update(R, W);
  ok(R.bs.dealt === 3 * Run.UNIT && R.bs.phase === 2 && !W.crater.boss && W.toys.lava.gates.some((g) => g.t > 0) && Math.abs(W.mod.crab - R.crab0 * 1.6) < 1e-9, 'a crater hit = 3 chunks: MAGMA FLOW, one gate open, the crabs 1.6x', JSON.stringify(R.bs));
  const side = R.bs.side; for (let i = 0; i < 481; i++) Run.update(R, W);
  ok(R.bs.side === -side, 'the open gate swaps every 8 s');
  W.stats.lava += 4; Run.update(R, W);
  ok(R.bs.dealt === 7 * Run.UNIT && R.bs.phase === 3 && W.crater.boss && W.mod.pressRate > 0, 'lava lanes = 1 chunk each: COUNTDOWN, the pressure fills itself');
  W.toys.volcano.pressure = W.press.level; Run.update(R, W);
  ok(W.toys.volcano.pressure === 0 && W.toys.quake.pending && R.bs.dealt === 7 * Run.UNIT, 'at full: a quake, and it fills again');
  W.stats.craters++; W.crater.took = 'boss'; Run.update(R, W);
  ok(R.bs.dealt === 9 * Run.UNIT, 'a crater hit before it is full = 2 chunks');
  const sc = W.score; W.score = R.start + 3 * Run.DMG.points; Run.update(R, W); W.score = Math.max(W.score, sc);
  ok(R.cleared && R.bs.dealt === 10 * Run.UNIT && W.mb && W.mb.victory && W.mb.balls >= 3 && W.saveT >= 60 * 19, 'points chip in; the kill: VOLCANO DEFEATED and a 3-ball victory multiball with 20 s save');
  W.balls.length = 0; W.feed = 0; let ph = 'play'; for (let i = 0; i < 400 && ph === 'play'; i++) { E.step(W, {}); ph = Run.update(R, W); }
  ok(ph === 'pick' && R.balls === 2, 'no ball lost after the kill: on to the pick');
  const R8 = Run.newRun(3, 2); R8.round = 7; R8.ups.tamer = 1; const W8 = Run.startRound(R8); W8.dropsDown = 3; Run.update(R8, W8); W8.stats.craters++; W8.crater.took = 'boss'; Run.update(R8, W8);
  ok(R8.bs.max === 14 * Run.UNIT && R8.bs.dealt === 4 * Run.UNIT, 'round 8: 14 chunks; VOLCANO TAMER: +1 chunk a crater hit');
  W8.score += 14 * Run.DMG.points; Run.update(R8, W8); W8.over = true;
  ok(Run.update(R8, W8) === 'won' && Run.summary(R8).won && Run.summary(R8).cause === 'won', 'round 8 boss beaten: RUN WON');
  const R2 = Run.newRun(3, 2); R2.round = 3; const W2 = Run.startRound(R2); R2.balls = 1; W2.total = 1; W2.score += 9 * Run.DMG.points; Run.update(R2, W2); W2.over = true;
  const sum = (Run.update(R2, W2), Run.summary(R2));
  ok(R2.phase === 'over' && sum.nearMiss.length === 1 && /1 chunk/.test(sum.nearMiss[0]) && sum.next, 'a boss not beaten ends the run; the near miss is a true one', JSON.stringify(sum.nearMiss));
})();
(function () {   // TODAY'S ERUPTION
  const a = Run.daily('2026-11-05'), b = Run.daily('2026-11-05'), c = Run.daily('2026-11-06');
  ok(a === b && a !== c && a > 0, 'the daily seed: the same date gives the same seed, another date another');
  const A = scripted(a, { daily: true }), B = scripted(b, { daily: true }), C = scripted(c, { daily: true });
  ok(JSON.stringify(A.seen) === JSON.stringify(B.seen) && JSON.stringify(A.seen) !== JSON.stringify(C.seen) && A.R.daily && Run.summary(A.R).daily, 'the same date: the same offers, mutations and missions; a different date not');
})();
(function () {   // a real round played by the pilot (each ball drained by hand after 90 s: pilot balls last a median 251 s)
  const R = Run.newRun(11, 2); R.ups = { twin: 1 };
  const W = Run.startRound(R); let twin = 0;
  for (let i = 0, f = 0; i < CAP && R.phase === 'play'; i++, f++) {
    if (i === 600) E.api.multiball(W, 2);
    if (W.state === 'play' && f > 60 * 90) { W.balls.length = 0; W.feed = 0; f = 0; }
    E.step(W, Pilot.input(W)); Run.update(R, W); W.events.length = 0; twin = Math.max(twin, W.balls.length + W.feed); R.news.length = 0;
  }
  ok(twin >= 3, 'TWIN BALL: a 2-ball multiball gets a third ball');
  ok(R.phase === 'pick' || R.phase === 'over', 'the round ends in a pick or the run ends (' + R.phase + ')');
  const s = Run.summary(R);
  ok(s.reached === 1 && s.rounds.length === 1 && typeof s.score === 'number' && typeof s.cause === 'string' && Array.isArray(s.nearMiss), 'summary: reached, rounds, score, cause, nearMiss');
  ok(Run.better({ won: true, cleared: 8, score: 1 }, { won: false, cleared: 7, score: 9e9 }) && !Run.better({ won: false, cleared: 2, score: 5 }, { won: false, cleared: 3, score: 1 }), 'best run: a win beats any loss, then rounds, then score');
  ok(Run.loadBest() === null && Run.saveBest(s) === true, 'no localStorage in node: best run reads null and never throws');
  ok(G && W.next && typeof W.next.text === 'string', 'goals.js gives the run a NEXT line');
})();
console.log(pass + ' passed, ' + fail + ' failed');

// ------------------------------------------------------------ the bot farm
const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const runs = +arg('--runs', 120), speed = +arg('--speed', 2), botKind = arg('--bot', 'pilot');
if (argv.indexOf('--no-farm') >= 0) { process.exitCode = fail ? 1 : 0; return; }
const nw = Math.max(1, Math.min(os.cpus().length - 2, +arg('--workers', 16))), t0 = Date.now(), results = [];
let left = nw;
console.log('\nBOT FARM: ' + runs + ' runs, bot ' + botKind + ', speed ' + speed + ', on ' + nw + ' workers');
for (let w = 0; w < nw; w++) {
  const seeds = []; for (let i = w; i < runs; i += nw) seeds.push(1000 + i * 7919);
  const ch = fork(__filename, [], { env: Object.assign({}, process.env, { RUN_FARM_WORKER: '1' }) });
  ch.on('message', (out) => { results.push(...out); });
  ch.on('exit', () => { if (--left === 0) report(); });
  ch.send({ seeds, speed, bot: botKind });
}
function report() {
  const N = results.length, reached = Array(10).fill(0), wins = results.filter((r) => r.won).length;
  results.forEach((r) => { reached[r.won ? 9 : r.reached]++; });
  const sorted = results.map((r) => (r.won ? 9 : r.reached)).sort((a, b) => a - b), med = sorted[Math.floor(N / 2)];
  console.log('ended in round: ' + [1, 2, 3, 4, 5, 6, 7, 8].map((r) => r + ':' + reached[r]).join('  ') + '  WON:' + wins);
  console.log('median run ends in round ' + (med === 9 ? 'WON' : med) + '; ' + (100 * wins / N).toFixed(1) + '% of runs won; median run ' + (results.map((r) => r.frames).sort((a, b) => a - b)[N >> 1] / 3600).toFixed(1) + ' min');
  const per = {}; results.forEach((r) => r.rounds.forEach((l) => { (per[l.round] = per[l.round] || []).push(l); }));
  Object.keys(per).forEach((k) => {
    const L = per[k], sc = L.map((l) => l.score).sort((a, b) => a - b), p = (f) => sc[Math.floor(f * (sc.length - 1))], cl = L.filter((l) => l.hit);
    const secs = cl.map((l) => l.secs).sort((a, b) => a - b);
    console.log('  round ' + k + (L[0].boss ? ' (boss)' : '') + ': played ' + L.length + ', cleared ' + cl.length + (secs.length ? ', clear at p50 ' + secs[secs.length >> 1] + ' s' : '') + ', stars ' + L.filter((l) => l.star).length + ', score p25/p50/p75 ' + [p(0.25), p(0.5), p(0.75)].map((v) => (v / 1e6).toFixed(1) + 'M').join('/'));
  });
  console.log('farm took ' + ((Date.now() - t0) / 1000).toFixed(0) + ' s');
  if (botKind === 'pilot') console.log(wins / N <= 0.5 ? 'farm: pilot wins at most 50% - PASS' : 'farm: pilot wins more than 50% - FAIL');
  process.exitCode = fail ? 1 : 0;
}
