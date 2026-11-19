/* 365 Pinball Hero - EMBER RUN, the run-based mode (30 Oct 2026, owner: "still looks like a revamped Microsoft Pinball
 * ... exactly the same gameplay" - so change how it PLAYS). A run is up to 8 rounds on Ember Peak, one ball each:
 *  - each round has a TARGET (the round's own score, end-of-ball bonus included). Drain below it = the run is over;
 *    reach it and the ball plays on until it drains (the overflow counts), then the player picks 1 of 3 UPGRADES;
 *  - rounds 4 and 8 are BOSS rounds: THE VOLCANO has hit points (crater shots hurt it, full eruptions hurt it a lot,
 *    lava lanes and heat ramps a little); beat it = the round is won, whatever the score. Round 8's boss = RUN WON;
 *  - after every round the table MUTATES (one change, announced, kept for the rest of the run, except DEAD KICKBACK,
 *    which lasts one round). A new run starts from the plain table.
 * Everything comes from the run's seed (our own number stream, no Math.random), so a run with the same seed and the
 * same picks offers the same upgrades and the same mutations. The engine reads the run's changes from W.mod (see the
 * engine's header); a Classic world has none. Each round is a fresh world (E.newWorld) whose score starts at the run's
 * banked score, with one ball and no extra balls.
 *
 * The page: R = PinRun.newRun(seed, speed); W = PinRun.startRound(R); every step E.step(W, input) then
 * PinRun.update(R, W) -> R.phase ('play' | 'pick' | 'over' | 'won'); R.news holds announcements to show (the page
 * empties it). In 'pick': R.offer is the 3 upgrade ids, PinRun.pick(R, id), then W = PinRun.startRound(R).
 * PinRun.status(R, W) is the HUD; PinRun.summary(R) the end screen. Plain ES5; in node: require('./run.js'). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./engine.js'));
  else root.PinRun = factory(root.PinEngine);
})(typeof self !== 'undefined' ? self : this, function (E) {
  'use strict';
  if (!E) return null;
  var ROUNDS = 8, BOSS = { 4: true, 8: true };
  // Round targets (the round's own score) and boss HP, for Classic speed, from the bot farm (tools/pinball/run-test.cjs,
  // 30 Oct 2026). One ball's score swings a lot (the bot: 3M-10M middle half, flat across rounds), so each target sits at a
  // low percentile that rises round by round (about 10% of balls fall short in round 1, 30% by round 7) and the bosses
  // are the walls. 300 bot runs: median run ends in round 4, 11% win. A person will hit more crater and ramp shots than the
  // bot (the boss falls faster) but has a worse hand over eight balls in a row, so this should play about the same.
  var TARGET = [0, 2000000, 3000000, 3500000, 0, 4500000, 5500000, 6500000, 0];
  var HP = { 4: 30, 8: 55 };   // the volcano's hit points in each boss round
  var DMG = { crater: 20, erupt: 40, lava: 6, ramp: 4 };   // a full eruption is a crater shot too, so it does 60 in all
  var SPEEDK = { 1: 0.8, 2: 1, 3: 1.15 };   // Gentle is slower (fewer points a minute), Fast quicker
  var BEST_KEY = 'pinball365.emberRun.best';
  var BALLS = { 1: 3, 2: 2, 3: 1 }, BALLS_MAX = 5;   // the run's pool of balls by speed (SECOND WIND and a chamber clear add one; 5 at most)

  // ------------------------------------------------------------ the upgrades: id, name, one line, how many can stack
  var UPGRADES = [
    { id: 'fire', name: 'FIRE BALL', text: 'Obsidian targets score x3', max: 3 },
    { id: 'pump', name: 'MAGMA PUMP', text: '+50% volcano pressure from every shot', max: 2 },
    { id: 'gold', name: 'GOLD RAMP', text: 'Heat ramp scores x3', max: 3 },
    { id: 'crab', name: 'CRAB WRANGLER', text: 'Crabs score x5 and walk slower', max: 2 },
    { id: 'lavakick', name: 'MAGMA PLUG', text: 'Every ball starts with the obsidian plug up for 15 s', max: 1 },
    { id: 'net', name: 'SAFETY NET', text: '+6 seconds of ball save every round', max: 3 },
    { id: 'bumper', name: 'BUMPER BLAST', text: 'Fumaroles score x4', max: 3 },
    { id: 'lanes', name: 'LUCKY LANES', text: 'Two skill lanes start lit every round', max: 1 },
    { id: 'twin', name: 'TWIN BALL', text: 'Every multiball gets one more ball', max: 1 },
    { id: 'wind', name: 'SECOND WIND', text: 'One more ball for the run', max: 3 },
    { id: 'interest', name: 'INTEREST', text: '+10% of your banked score after each round', max: 3 },
    { id: 'forge', name: 'BONUS FORGE', text: 'End-of-ball bonus starts at x2 (stacks)', max: 3 },
    { id: 'tamer', name: 'VOLCANO TAMER', text: 'Boss damage +50%; full eruptions score x2', max: 2 }
  ];
  // ------------------------------------------------------------ the mutations, one after each round
  var MUTATIONS = [
    { id: 'skitter', name: 'SKITTISH CRABS', text: 'The crabs walk 60% faster' },
    { id: 'flow', name: 'LONG FLOW', text: 'Lava gates stay open 50% longer' },
    { id: 'hyper', name: 'HYPER GEYSER', text: 'The geyser recharges 3x faster' },
    { id: 'deadkick', name: 'DEAD KICKBACK', text: 'No kickback next round' },
    { id: 'crust', name: 'COOLING CRUST', text: 'Volcano pressure slowly leaks away' },
    { id: 'thin', name: 'THIN MAGMA', text: '-20% volcano pressure from every shot' },
    { id: 'fuse', name: 'SHORT FUSE', text: '-3 seconds of ball save' },
    { id: 'hotcrab', name: 'HOT CRABS', text: 'Crabs score x2' }
  ];
  var UP = {}, MU = {};
  UPGRADES.forEach(function (u) { UP[u.id] = u; });
  MUTATIONS.forEach(function (m) { MU[m.id] = m; });

  // ------------------------------------------------------------ our own numbers (the engine's stream)
  function rnd(R) { R.rs = (R.rs * 1103515245 + 12345) & 0x7fffffff; return R.rs / 0x7fffffff; }
  function mix(a, b) { var h = (a | 0) ^ ((b | 0) * 40503); h = (h * 1103515245 + 12345) & 0x7fffffff; return h || 1; }

  function newRun(seed, speed) {
    seed = (seed == null ? 365 : seed) | 0 || 1;
    return {
      seed: seed, rs: mix(seed, 7), speed: SPEEDK[speed] ? speed : 2, round: 0, rounds: ROUNDS, phase: 'ready',
      banked: 0, start: 0, ups: {}, taken: [], muts: [], deadKick: false, mutNext: null, offer: null,
      wind: 0, windBall: 0, hit: false, hp: 0, hpMax: 0, boss: false, seen: null, twinDone: false, won: false, news: [], log: [],
      balls: BALLS[SPEEDK[speed] ? speed : 2], ballsMax: BALLS_MAX, lost: 0, cleared: false, endBall: 0, chamberBall: false
    };
  }
  function n(R, id) { return R.ups[id] || 0; }
  function target(R, r) { return BOSS[r] ? 0 : Math.round(TARGET[r] * SPEEDK[R.speed] / 100000) * 100000; }
  // the engine's knobs for this round, from the upgrades taken and the mutations so far
  function mod(R) {
    var M = { x: {}, press: 1, crab: 1, lava: 1, gey: 1, save: 0, noKick: R.deadKick, decay: 0 };
    function x(k, f) { M.x[k] = (M.x[k] || 1) * f; }
    var i;
    for (i = 0; i < n(R, 'fire'); i++) x('drop', 3);
    for (i = 0; i < n(R, 'pump'); i++) M.press *= 1.5;
    for (i = 0; i < n(R, 'gold'); i++) x('ramp', 3);
    for (i = 0; i < n(R, 'crab'); i++) { x('crab', 5); M.crab *= 0.6; }
    M.save += 6 * n(R, 'net');
    for (i = 0; i < n(R, 'bumper'); i++) x('bumper', 4);
    for (i = 0; i < n(R, 'tamer'); i++) x('erupt', 2);
    // wave 3 (the engine carries these onto every new ball; the skill shot pays 0.3x in runs; no island modes in runs)
    M.mult0 = Math.min(5, 1 + n(R, 'forge'));
    if (n(R, 'lanes') && R.lanesOff != null) M.lanes0 = [R.lanesOff !== 0, R.lanesOff !== 1, R.lanesOff !== 2];
    x('skill', 0.3);
    M.noModes = true;
    R.muts.forEach(function (id) {
      if (id === 'skitter') M.crab *= 1.6;
      else if (id === 'flow') M.lava *= 1.5;
      else if (id === 'hyper') M.gey /= 3;
      else if (id === 'crust') M.decay += 0.0005;   // a share of full pressure a step: full leaks away in about 33 s
      else if (id === 'thin') M.press *= 0.8;
      else if (id === 'fuse') M.save -= 3;
      else if (id === 'hotcrab') x('crab', 2);
    });
    return M;
  }

  // ------------------------------------------------------------ a round
  function startRound(R) {
    if (R.phase === 'over' || R.phase === 'won') return null;
    R.round++;
    var r = R.round, W = E.newWorld(R.speed, 0, mix(R.seed, r), 'ember');
    R.lanesOff = n(R, 'lanes') ? Math.floor(rnd(R) * 3) : null;
    W.total = Math.max(1, R.balls); W.extraAt = []; W.score = R.banked; W.mod = mod(R);
    if (R.deadKick) W.kickback = false;
    W.mult = W.mod.mult0;
    if (W.mod.lanes0) W.lanes = W.mod.lanes0.slice();
    R.plugBall = 0;
    R.start = R.banked; R.boss = !!BOSS[r]; R.hpMax = R.hp = R.boss ? HP[r] : 0; R.target = target(R, r);
    R.hit = false; R.twinDone = false; R.windBall = 0; R.offer = null; R.phase = 'play';
    R.cleared = false; R.endBall = 0; R.chamberBall = false;
    R.seen = { craters: 0, eruptions: 0, lava: 0, ramps: 0, multiballs: 0 }; R.dmg = 0;
    R.news.push(R.boss ? { big: 'THE VOLCANO WAKES', small: 'ROUND ' + r + ' - BEAT THE BOSS', kind: 'boss' }
      : { big: 'ROUND ' + r, small: 'TARGET ' + E.fmt(R.target), kind: 'round' });
    return W;
  }
  // after E.step(W, input): the target, the boss, the twin ball, second wind, the end of the round
  function update(R, W) {
    if (R.phase !== 'play' || !W) return R.phase;
    if (E.table(W.tableId).T.level) return levelUpdate(R, W);   // a level below the surface (descent.js): its drains cost nothing
    var d = 0, S = W.stats, sn = R.seen, dc = S.craters - sn.craters, de = S.eruptions - sn.eruptions, dl = S.lava - sn.lava, dr = S.ramps - sn.ramps;
    sn.craters = S.craters; sn.eruptions = S.eruptions; sn.lava = S.lava; sn.ramps = S.ramps;
    if (n(R, 'lavakick') && W.state === 'play' && R.plugBall !== W.ball) { R.plugBall = W.ball; E.api.plug(W, 900); }   // MAGMA PLUG: every ball starts with the plug up
    var dm = S.multiballs - (sn.multiballs || 0); sn.multiballs = S.multiballs;
    if (dm > 0 && n(R, 'twin') && W.mb) { E.api.addBall(W); R.news.push({ big: 'TWIN BALL', small: 'ONE MORE BALL', kind: 'up' }); }
    if (R.boss && (dc || dl || dr)) {
      var d = (dc * DMG.crater + de * DMG.erupt + dl * DMG.lava + dr * DMG.ramp) * (1 + 0.5 * n(R, 'tamer'));
      R.dmg += d;
    }
    if (R.boss && R.hp > 0 && d) {
      R.hp = Math.max(0, R.hp - d);
      R.news.push(R.hp > 0 ? { big: 'VOLCANO HIT', small: '-' + d + ' HP', kind: 'hit' } : { big: 'VOLCANO DEFEATED', small: 'ROUND WON', kind: 'win' });
      if (R.hp === 0) R.hit = true;
    }
    var mine = W.score - R.start;
    if (!R.boss && !R.hit && mine >= R.target) { R.hit = true; R.news.push({ big: 'TARGET REACHED', small: 'KEEP IT ALIVE FOR MORE', kind: 'win' }); }
    if (R.hit) R.cleared = true;
    // THE BALL POOL: while a ball is in play the world serves exactly the balls left (a chamber clear may have added one)
    if (W.state === 'play') W.total = W.ball - 1 + Math.max(1, R.balls);
    // a ball has ended: after the round's goal it costs nothing and the round ends; before it, it costs a ball
    if (W.state === 'bonus' && R.endBall !== W.ball) {
      R.endBall = W.ball;
      if (!R.boss && !R.cleared && mine + (W.bonusAdd - W.bonusShow) >= R.target) R.hit = R.cleared = true;   // (the bonus to come counts)
      if (R.cleared) W.total = W.ball;
      else {
        R.balls = Math.max(0, R.balls - 1); R.lost++; W.total = W.ball + R.balls;
        R.news.push(R.balls > 0 ? { big: 'BALL LOST', small: R.balls + (R.balls === 1 ? ' BALL' : ' BALLS') + ' LEFT', kind: 'lost' } : { big: 'LAST BALL GONE', small: '', kind: 'lost' });
      }
    }
    if (!W.over) return R.phase;
    // the round is over
    if (!R.boss && W.score - R.start >= R.target) R.hit = true;
    if (R.hit) R.cleared = true;
    R.log.push({ round: R.round, score: W.score - R.start, target: R.target, boss: R.boss, hp: R.hp, hpMax: R.hpMax, dmg: R.dmg, hit: R.hit });
    R.banked = W.score;
    R.deadKick = false;
    if (!R.cleared) { R.phase = 'over'; R.news.push({ big: 'RUN OVER', small: 'ROUND ' + R.round, kind: 'over' }); return R.phase; }
    if (R.round >= R.rounds) { R.won = true; R.phase = 'won'; R.news.push({ big: 'RUN WON', small: E.fmt(R.banked), kind: 'won' }); return R.phase; }
    var it = n(R, 'interest');
    if (it) { var gain = Math.round(R.banked * 0.1 * it / 10) * 10; R.banked += gain; R.news.push({ big: 'INTEREST', small: '+' + E.fmt(gain), kind: 'up' }); }
    R.offer = offers(R);
    var m = mutate(R); R.mutNext = m;
    R.news.push({ big: m.name, small: m.text, kind: 'mutation' });
    R.phase = 'pick';
    return R.phase;
  }
  // a level below the surface (THE MAGMA CHAMBER): a chamber clear is one more ball, once a round
  function levelUpdate(R, W) {
    for (var i = 0; i < W.events.length; i++) if (W.events[i] === 'chamberclear' && !R.chamberBall) {
      R.chamberBall = true; R.balls = Math.min(BALLS_MAX, R.balls + 1);
      R.news.push({ big: 'CHAMBER CLEARED', small: 'ONE MORE BALL', kind: 'up' });
    }
    return R.phase;
  }
  // 3 upgrades to choose from (none already at its most), from the run's numbers
  function offers(R) {
    var pool = UPGRADES.filter(function (u) { return n(R, u.id) < u.max && !(u.id === 'wind' && R.round >= R.rounds); }).map(function (u) { return u.id; }), out = [];
    while (out.length < 3 && pool.length) out.push(pool.splice(Math.floor(rnd(R) * pool.length), 1)[0]);
    return out;
  }
  function mutate(R) {   // a mutation not had yet this run
    var pool = MUTATIONS.filter(function (m) { return R.muts.indexOf(m.id) < 0; });
    if (!pool.length) pool = MUTATIONS.slice();
    var m = pool[Math.floor(rnd(R) * pool.length)];
    R.muts.push(m.id); if (m.id === 'deadkick') R.deadKick = true;
    return m;
  }
  function pick(R, id) {
    if (R.phase !== 'pick' || !R.offer || R.offer.indexOf(id) < 0) return false;
    R.ups[id] = n(R, id) + 1; R.taken.push(id);
    if (id === 'wind') R.balls = Math.min(BALLS_MAX, R.balls + 1);   // SECOND WIND: one more ball in the pool
    R.offer = null; R.phase = 'ready';
    return true;
  }

  // ------------------------------------------------------------ for the page
  function status(R, W) {
    var mine = W ? W.score - R.start : 0;
    return {
      round: R.round, rounds: R.rounds, boss: R.boss, target: R.target, roundScore: mine,
      progress: R.boss ? (R.hpMax ? 1 - R.hp / R.hpMax : 0) : R.target ? Math.min(1, mine / R.target) : 1,
      hp: R.hp, hpMax: R.hpMax, hit: R.hit, wind: R.wind, phase: R.phase, balls: R.balls, ballsMax: R.ballsMax,
      mutations: R.muts.map(function (id) { return MU[id]; }), upgrades: R.taken.map(function (id) { return UP[id]; }),
      next: R.mutNext
    };
  }
  function summary(R) {
    var cleared = R.log.filter(function (l) { return l.hit; }).length;
    return {
      seed: R.seed, won: R.won, reached: R.round, cleared: cleared, score: R.banked,
      upgrades: R.taken.map(function (id) { return UP[id].name; }), mutations: R.muts.map(function (id) { return MU[id].name; }), rounds: R.log.slice()
    };
  }
  // the best run on this device (a run is better if it got further, then if it scored more)
  function better(a, b) { return !b || (a.won && !b.won) || (a.won === b.won && (a.cleared > b.cleared || (a.cleared === b.cleared && a.score > b.score))); }
  function loadBest() { try { var s = typeof localStorage !== 'undefined' && localStorage.getItem(BEST_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
  function saveBest(sum) {   // -> true if it is the new best
    var b = loadBest();
    if (!better(sum, b)) return false;
    try { if (typeof localStorage !== 'undefined') localStorage.setItem(BEST_KEY, JSON.stringify({ won: sum.won, reached: sum.reached, cleared: sum.cleared, score: sum.score, upgrades: sum.upgrades, seed: sum.seed })); } catch (e) { }
    return true;
  }

  return {
    newRun: newRun, startRound: startRound, update: update, offers: offers, pick: pick, status: status, summary: summary,
    loadBest: loadBest, saveBest: saveBest, better: better, mod: mod, BALLS: BALLS, BALLS_MAX: BALLS_MAX,
    UPGRADES: UPGRADES, MUTATIONS: MUTATIONS, UP: UP, MU: MU, TARGET: TARGET, HP: HP, DMG: DMG, ROUNDS: ROUNDS, BOSS: BOSS, SPEEDK: SPEEDK
  };
});
