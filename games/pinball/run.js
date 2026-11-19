/* 365 Pinball Hero - EMBER RUN, the run-based mode (30 Oct 2026, owner: "still looks like a revamped Microsoft Pinball
 * ... exactly the same gameplay" - so change how it PLAYS; wave 3, 5 Nov 2026: the build plan's section 4). A run is up
 * to 8 rounds on Ember Peak with ONE POOL OF BALLS for the whole run (Gentle 4, Classic 2, Fast 1; SECOND WIND and a
 * chamber clear add one, 5 at most):
 *  - each round has a MISSION, THE goal, with an arrow on its shot (goals.js shows it as W.next): rounds 1-3 teach the
 *    table (the heat ramp, the obsidian, an eruption), rounds 5-7 are harder, all from the run's seed. A drain before the
 *    mission is done costs a ball (progress is kept); no balls left = the run is over. Done = STAGE CLEAR: a time bonus
 *    (faster pays more; slowness never fails you), then DIVE lights at the crater for 20 s. The round ends at the next
 *    drain, and that ball is not lost. The old score target is an optional STAR;
 *  - rounds 4 and 8 are THE VOLCANO, a boss in three phases with HP in chunks (10, round 8: 14): SEALED (the obsidian
 *    bank cracks the crater open for 20 s; a crater hit = 3 chunks), MAGMA FLOW (one lava gate open at a time, swapping
 *    every 8 s; the lit lava lane = 1 chunk; the crabs walk 1.6x faster), COUNTDOWN (the pressure fills itself over 25 s,
 *    Gentle 32; the crater before it is full = 2 chunks; at full, a quake and it fills again). Every 3M scored in the round
 *    is a chunk too. The kill: VOLCANO DEFEATED and a victory multiball; no ball is lost after it;
 *  - after every round the player picks 1 of 3 UPGRADES and the table MUTATES (one change, kept for the run).
 * Everything comes from the run's seed (our own number stream, no Math.random): the missions, offers and mutations of a
 * round come from mix(seed, round), so TODAY'S ERUPTION (PinRun.daily(date) -> seed) gives everyone the same run. The
 * engine reads the run's changes from W.mod (see the engine's header); a Classic world has none. Each round is a fresh
 * world (E.newWorld) whose score starts at the run's banked score.
 *
 * The page: R = PinRun.newRun(seed, speed[, { daily }]); W = PinRun.startRound(R); every step E.step(W, input) then
 * PinRun.update(R, W) with the world in play (the ACTIVE world: a level below the surface is ignored but for its
 * 'chamberclear') -> R.phase ('play' | 'pick' | 'over' | 'won'); R.news holds announcements to show (the page empties
 * it). In 'pick': R.offer is the 3 upgrade ids, PinRun.pick(R, id), then W = PinRun.startRound(R). PinRun.status(R, W)
 * is the HUD; PinRun.summary(R) the end screen. Plain ES5; in node: require('./run.js'). goals.js is used when it is
 * registered with the engine (feature-detected); without it the missions and the boss still work, with no W.next. */
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
  // (wave 3: the target is now the optional STAR, the round's own score at Classic speed)
  var TARGET = [0, 8000000, 12000000, 16000000, 0, 25000000, 32000000, 40000000, 0];
  var HP = { 4: 10, 8: 14 };   // THE VOLCANO's HP in chunks in each boss round
  var DMG = { crater: 3, lava: 1, countdown: 2, points: 3000000 };   // chunks: a SEALED crater hit, the lit lava lane, a COUNTDOWN crater hit; points a chunk
  var UNIT = 10, NEEDK = { 1: 0.5, 2: 1, 3: 1 }, HPK = { 1: 0.5, 2: 1, 3: 1 }, UNSEAL = { 1: 1800, 2: 1200, 3: 1200 }, PTSK = { 1: 0.5, 2: 1, 3: 1 };   // (Gentle: a chunk every 1.5M)   // Gentle: half the mission counts (at least 1), a smaller volcano   // each chunk is 10 units, so points chip in a unit every 300,000 and the HP bar moves often
  var PHASES = ['', 'SEALED', 'MAGMA FLOW', 'COUNTDOWN'];
  var SAVE0 = { 1: 20, 2: 0, 3: 0 };
  var INTEREST_MAX = 20000000;   // INTEREST: at most 20M a stack a round (it compounded a pilot's billions into a 35B run)   // extra seconds of ball save on every ball of a Gentle run (tuned to the casual bot)
  var COUNTDOWN = { 1: 32, 2: 25, 3: 25 }, DIVE_STEPS = 1200, CLEAR = { base: 2000000, fast: 8000000, secs: 150 };
  // the missions: steps of [what to count, how many] (a W.stats key, or 'bank' for the full obsidian bank)
  var MISSIONS = {
    ramp2: { text: 'HEAT RAMP X2', steps: [['ramps', 2]] },
    obsidian: { text: 'CLEAR THE OBSIDIAN', steps: [['bank', 1]] },
    erupt: { text: 'FILL THE VOLCANO AND ERUPT', steps: [['eruptions', 1]] },
    jackpot2: { text: '2 JACKPOTS', steps: [['jackpots', 2]] },
    crab5: { text: '5 MAGMA CRABS', steps: [['crabs', 5]] },
    loop: { text: 'MAKE A LOOP', steps: [['loops', 1]] },
    lockerupt: { text: 'A LOCK AND AN ERUPTION', steps: [['locks', 1], ['eruptions', 1]] },   // (either order: a later step keeps what came first)
    lava3: { text: '3 LAVA LANES', steps: [['lava', 3]] }
  };
  var TEACH = ['obsidian', 'erupt'], HARD = ['jackpot2', 'crab5', 'loop', 'lockerupt'], HARD1 = ['jackpot2', 'crab5', 'erupt'];   // (Gentle: the casual bot's shots - no loop, lock-then-erupt or lava lanes)
  var WORD = { ramps: 'HEAT RAMPS', bank: 'OBSIDIAN BANKS', eruptions: 'ERUPTIONS', jackpots: 'JACKPOTS', crabs: 'CRABS', loops: 'LOOPS', locks: 'LOCKS', lava: 'LAVA LANES' };
  var SPEEDK = { 1: 0.8, 2: 1, 3: 1.15 };   // Gentle is slower (fewer points a minute), Fast quicker
  var BEST_KEY = 'pinball365.emberRun.best';
  var BALLS = { 1: 4, 2: 2, 3: 1 }, BALLS_MAX = 5;   // the run's pool of balls by speed (SECOND WIND and a chamber clear add one; 5 at most)

  // ------------------------------------------------------------ the upgrades: id, name, one line, how many can stack
  // (wave 3, the deck retune: every card changes play or is clearly worth its slot; multipliers add up, x10 at most)
  var UPGRADES = [
    { id: 'fire', name: 'FIRE BALL', text: 'A full obsidian bank doubles your next crater shot (and boss hit)', max: 1 },
    { id: 'pump', name: 'MAGMA PUMP', text: '+50% volcano pressure, and an overload never quakes', max: 2 },
    { id: 'gold', name: 'GOLD RAMP', text: 'Heat ramp scores x3', max: 3 },
    { id: 'crab', name: 'CRAB WRANGLER', text: 'Crabs score x5 and walk slower', max: 2 },
    { id: 'lavakick', name: 'MAGMA PLUG', text: 'Every ball starts with the obsidian plug up for 15 s', max: 1 },
    { id: 'net', name: 'SAFETY NET', text: 'Every crater shot gives 6 s of ball save', max: 2 },
    { id: 'bumper', name: 'BUMPER BLAST', text: 'Every fumarole pop is worth 100,000', max: 1 },
    { id: 'lanes', name: 'LUCKY LANES', text: 'Two skill lanes start lit on every ball', max: 1 },
    { id: 'twin', name: 'TWIN BALL', text: 'Every multiball gets one more ball', max: 1 },
    { id: 'wind', name: 'SECOND WIND', text: 'One more ball for the run', max: 3 },
    { id: 'interest', name: 'INTEREST', text: '+10% of your banked score after each round (up to 20M)', max: 3 },
    { id: 'forge', name: 'BONUS FORGE', text: 'Every ball starts with the bonus at x2 (stacks)', max: 3 },
    { id: 'tamer', name: 'VOLCANO TAMER', text: '+1 boss chunk every crater hit; eruptions score x2', max: 2 }
  ];
  // ------------------------------------------------------------ the mutations, one after each round: each one you can
  // see on the table (W.mod.tags names them for the lamps)
  var MUTATIONS = [
    { id: 'skitter', name: 'SKITTISH CRABS', text: 'The crabs walk 60% faster' },
    { id: 'quakes', name: 'AFTERSHOCKS', text: 'A quake shakes the table every 45 seconds' },
    { id: 'lavaopen', name: 'MOLTEN LANES', text: 'Both lava gates open for 15 s on every ball' },
    { id: 'heat', name: 'BUILDING HEAT', text: 'The volcano fills itself, slowly' },
    { id: 'crust', name: 'COOLING CRUST', text: 'Volcano pressure slowly leaks away' },
    { id: 'thin', name: 'THIN MAGMA', text: '-20% volcano pressure from every shot' },
    { id: 'crusted', name: 'CRUSTED CRATER', text: 'Each ball starts with the crater sealed until an obsidian target falls' },
    { id: 'hotcrab', name: 'HOT CRABS', text: 'Crabs score x2' }
  ];
  var UP = {}, MU = {};
  UPGRADES.forEach(function (u) { UP[u.id] = u; });
  MUTATIONS.forEach(function (m) { MU[m.id] = m; });

  // ------------------------------------------------------------ our own numbers (the engine's stream)
  function rnd(R) { R.rs = (R.rs * 1103515245 + 12345) & 0x7fffffff; return R.rs / 0x7fffffff; }
  function mix(a, b) { var h = (a | 0) ^ ((b | 0) * 40503); h = (h * 1103515245 + 12345) & 0x7fffffff; return h || 1; }
  function stream(R, salt) { return { rs: mix(R.seed, R.round * 131 + salt) }; }   // a round's own numbers: mix(seed, round)
  // TODAY'S ERUPTION: the seed from a local date ('YYYY-MM-DD', or anything with getFullYear/getMonth/getDate)
  function daily(d) {
    var y, m, dd;
    if (d && typeof d.getFullYear === 'function') { y = d.getFullYear(); m = d.getMonth() + 1; dd = d.getDate(); }
    else { var p = String(d || '').split('-'); y = +p[0] || 2026; m = +p[1] || 1; dd = +p[2] || 1; }
    return mix(mix(y, m * 37), dd * 7919 + 365) % 1000000000 || 1;
  }

  function newRun(seed, speed, opt) {
    seed = (seed == null ? 365 : seed) | 0 || 1;
    var sp = SPEEDK[speed] ? speed : 2;
    return {
      seed: seed, rs: mix(seed, 7), speed: sp, round: 0, rounds: ROUNDS, phase: 'ready', daily: !!(opt && opt.daily),
      banked: 0, start: 0, ups: {}, taken: [], muts: [], deadKick: false, mutNext: null, offer: null,
      wind: 0, hit: false, hp: 0, hpMax: 0, boss: false, seen: null, won: false, news: [], log: [],
      balls: BALLS[sp], ballsMax: BALLS_MAX, lost: 0, cleared: false, endBall: 0, chamberBall: false,
      mission: null, star: null, bs: null, diveT: 0, cause: null
    };
  }
  function n(R, id) { return R.ups[id] || 0; }
  function mu(R, id) { return R.muts.indexOf(id) >= 0; }
  function target(R, r) { return BOSS[r] ? 0 : Math.round(TARGET[r] * SPEEDK[R.speed] / 100000) * 100000; }
  // the engine's knobs for this round, from the upgrades taken and the mutations so far
  function mod(R) {
    var M = { x: {}, press: 1, crab: 1, lava: 1, gey: 1, save: SAVE0[R.speed] || 0, noKick: R.deadKick, decay: 0 };
    function x(k, f) { M.x[k] = Math.min(10, (M.x[k] || 1) + (f - 1)); }   // stacking adds up, x10 at most
    var i;
    M.press = 1 + 0.5 * n(R, 'pump');
    for (i = 0; i < n(R, 'gold'); i++) x('ramp', 3);
    for (i = 0; i < n(R, 'crab'); i++) { x('crab', 5); M.crab *= 0.6; }
    if (n(R, 'bumper')) x('bumper', 20);
    for (i = 0; i < n(R, 'tamer'); i++) x('erupt', 2);
    M.tags = R.muts.slice();
    M.pressRate = R.muts.indexOf('heat') >= 0 ? 0.006 : 0;
    // wave 3 (the engine carries these onto every new ball; the skill shot pays 0.3x in runs; no island modes in runs)
    M.mult0 = Math.min(5, 1 + n(R, 'forge'));
    if (n(R, 'lanes') && R.lanesOff != null) M.lanes0 = [R.lanesOff !== 0, R.lanesOff !== 1, R.lanesOff !== 2];
    M.x.skill = 0.3;
    M.noModes = true;
    R.muts.forEach(function (id) {
      if (id === 'skitter') M.crab *= 1.6;
      else if (id === 'crust') M.decay += 0.0005;   // a share of full pressure a step: full leaks away in about 33 s
      else if (id === 'thin') M.press *= 0.8;
      else if (id === 'hotcrab') x('crab', 2);
    });
    return M;
  }

  // ------------------------------------------------------------ a round
  function goals() {   // goals.js, when it is registered with the engine (the page and the farms load it)
    var P = E.plugins ? E.plugins() : [];
    for (var i = 0; i < P.length; i++) if (P[i].id === 'goals' && P[i].mission) return P[i];
    return null;
  }
  function missionFor(R, r) {   // rounds 1-3 teach (round 1 is always the heat ramp), rounds 5-7 are harder
    if (r === 1) return 'ramp2';
    if (r <= 3) { var k = Math.floor(rnd({ rs: mix(R.seed, 977) }) * 2); return r === 2 ? TEACH[k] : TEACH[1 - k]; }
    var h = (R.speed === 1 ? HARD1 : HARD).slice(), out = [], s2 = { rs: mix(R.seed, 991) };   // one order for rounds 5-7, so they never repeat
    while (h.length) out.push(h.splice(Math.floor(rnd(s2) * h.length), 1)[0]);
    return out[(r - 5) % out.length];
  }
  function need(R, k) { return Math.max(1, Math.round(k * NEEDK[R.speed])); }
  function mtext(R, id) {   // the mission's words, with the count this speed asks for
    var M = MISSIONS[id], st = M.steps[0];
    return M.steps.length === 1 && need(R, st[1]) !== st[1] ? M.text.replace(String(st[1]), String(need(R, st[1]))).replace('1 JACKPOTS', 'A JACKPOT') : M.text;
  }
  function startRound(R) {
    if (R.phase === 'over' || R.phase === 'won') return null;
    R.round++;
    var r = R.round, W = E.newWorld(R.speed, 0, mix(R.seed, r), 'ember');
    R.lanesOff = n(R, 'lanes') ? Math.floor(rnd(stream(R, 5)) * 3) : null;
    W.total = Math.max(1, R.balls); W.extraAt = []; W.score = R.banked; W.mod = mod(R);
    if (R.deadKick) W.kickback = false;
    W.mult = W.mod.mult0;
    if (W.mod.lanes0) W.lanes = W.mod.lanes0.slice();
    R.plugBall = 0; R.crab0 = W.mod.crab; R.press0 = W.mod.pressRate || 0; R.fire = false; R.fireHit = false; R.crust = false;
    R.start = R.banked; R.boss = !!BOSS[r]; R.target = target(R, r);
    R.hit = false; R.offer = null; R.phase = 'play'; R.cleared = false; R.endBall = 0; R.chamberBall = false; R.diveT = 0;
    R.lostHere = 0; R.clearSecs = null;
    R.seen = { craters: 0, eruptions: 0, lava: 0, ramps: 0, multiballs: 0, jackpots: 0, crabs: 0, loops: 0, locks: 0, dd: 0, drops0: 0 };
    R.star = R.boss ? null : { target: R.target, got: false }; R.clearPts = 0;
    R.mission = null; R.bs = null; R.hp = R.hpMax = 0; R.dmg = 0;
    if (R.boss) {
      R.bs = { phase: 1, max: Math.round(HP[r] * HPK[R.speed]) * UNIT, dealt: 0, pc: 0, unsealT: 0, gateT: 0, side: 1, hitF: [], ballDmg: [], ballD: 0 };
      R.hp = R.hpMax = R.bs.max / UNIT;
      E.api.seal(W, true); E.api.craterLit(W, 'boss', true);
      R.news.push({ big: 'THE VOLCANO WAKES', small: 'ROUND ' + r + ' · IT FIGHTS BACK', kind: 'boss' });
    } else {
      var id = missionFor(R, r), M = MISSIONS[id];
      R.mission = { id: id, text: mtext(R, id), k: 0, got: 0, need: need(R, M.steps[0][1]), done: false, early: {} };
      R.news.push({ big: 'ROUND ' + r, small: M.text, kind: 'round' });
    }
    show(R, W);
    return W;
  }
  // the arrow for what is counted, from the table as it is now
  function shotFor(W, what) {
    var C = W.crater, M = W.mb, lit = C && !C.sealed ? C.lit : [], Lv = W.toys.lava;
    if (what === 'ramps') return 'ramp';
    if (what === 'bank') return 'drops';
    if (what === 'crabs') return 'crabs';
    if (what === 'loops') return W.orbitFrom === 'L' ? 'orbitR' : 'orbitL';
    if (what === 'lava' && Lv && Lv.open) return Lv.gates[1] && Lv.gates[1].t > Lv.gates[0].t ? 'lavaR' : 'lavaL';
    if (M) { if (M.superLit) return 'crater'; return M.jp.ramp ? 'ramp' : M.jp.lavaL ? 'lavaL' : 'lavaR'; }
    if (lit.indexOf('erupt') >= 0 || (what === 'locks' && lit.indexOf('lock') >= 0)) return 'crater';
    return 'ramp';
  }
  // THE goal for goals.js (W.next) and the HUD
  function show(R, W) {
    if (W.goals) W.goals.boss = R.bs && !R.cleared ? { phase: R.bs.phase } : null;   // (the lamps' boss-phase inserts read it; integrate, show lane's request)
    var G = goals(); if (!G) return;
    var m = R.mission, B = R.bs, def = null;
    if (B && !R.cleared) {
      var ph = B.phase, sealed = W.crater.sealed;
      def = { id: 'boss', text: ph === 1 ? (sealed ? 'CLEAR THE OBSIDIAN' : 'SHOOT THE CRATER') : ph === 2 ? 'SHOOT THE LIT LAVA LANE' : 'SHOOT THE CRATER', got: Math.floor(B.dealt / UNIT), need: B.max / UNIT, clock: ph === 1 && B.unsealT ? Math.ceil(B.unsealT / 60) : null,
        small: ph === 1 ? (sealed ? 'TO CRACK THE SEAL' : 'BEFORE IT SEALS AGAIN') : ph === 2 ? 'HITS THE VOLCANO' : 'BEFORE IT BLOWS',   // (fix pass: the instruction first; the HUD's other rows already say THE VOLCANO and the phase)
        shot: ph === 1 ? (sealed ? 'drops' : 'crater') : ph === 2 ? (B.side > 0 ? 'lavaR' : 'lavaL') : 'crater' };
    } else if (m && !m.done) {
      var steps = MISSIONS[m.id].steps, st = steps[m.k];
      def = { id: m.id, text: m.text, small: steps.length > 1 ? (m.k + 1) + '/' + steps.length + ' · ' + m.got + ' OF ' + m.need + ' ' + WORD[st[0]] : m.got + ' OF ' + m.need, shot: shotFor(W, st[0]), got: m.got, need: m.need };
    } else if (R.cleared && R.diveT > 0) {
      def = { id: 'dive', text: 'DIVE IS LIT', small: 'SHOOT THE CRATER', shot: 'crater', gauge: 1, clock: Math.ceil(R.diveT / 60) };
    }
    var cur = W.goals && W.goals.mission;
    if (!def ? cur : !cur || cur.text !== def.text || cur.small !== def.small || cur.got !== def.got || cur.shot !== def.shot || cur.clock !== def.clock) G.mission(W, def);
  }
  // after E.step(W, input), with the world in play: the mission, the boss, the pool of balls, the end of the round
  function update(R, W) {
    if (R.phase !== 'play' || !W) return R.phase;
    if (E.table(W.tableId).T.level) return levelUpdate(R, W);   // a level below the surface (descent.js): its drains cost nothing
    var S = W.stats, sn = R.seen, d = {}, T = E.table(W.tableId).T, nd = T.drops ? T.drops.n : 0;
    ['craters', 'eruptions', 'lava', 'ramps', 'multiballs', 'jackpots', 'crabs', 'loops', 'locks'].forEach(function (key) { d[key] = (S[key] || 0) - sn[key]; sn[key] = S[key] || 0; });
    d.bank = nd && W.dropsDown === nd && sn.dd < nd ? 1 : 0; sn.dd = W.dropsDown || 0;
    var play = W.state === 'play';
    if (play && R.plugBall !== W.ball) {   // a new ball: MAGMA PLUG, MOLTEN LANES, CRUSTED CRATER
      R.plugBall = W.ball;
      if (n(R, 'lavakick')) E.api.plug(W, 900);
      if (mu(R, 'lavaopen')) E.api.gates(W, 0, 900);
      if (mu(R, 'crusted') && !R.bs) { E.api.seal(W, true); R.crust = true; }
    }
    if (R.crust && (S.drops > sn.drops0 || !play)) { R.crust = false; if (!R.bs) E.api.seal(W, false); }
    sn.drops0 = S.drops;
    if (mu(R, 'quakes') && play && W.frame % 2700 === 0) E.api.quake(W);   // AFTERSHOCKS
    if (n(R, 'net') && d.craters > 0) E.api.save(W, 6 * n(R, 'net'));   // SAFETY NET
    if (n(R, 'pump') && W.toys.volcano) { var Vp = W.toys.volcano, lim = W.press.level + 0.25; if (Vp.pressure > lim) Vp.pressure = lim; }   // MAGMA PUMP: never up to the overload
    if (n(R, 'fire')) {   // FIRE BALL: a full bank doubles the next crater shot (and boss hit)
      if (d.craters > 0 && R.fire) { R.fire = false; W.mod.x.crater = R.x0c; W.mod.x.erupt = R.x0e; }
      if (d.bank && !R.fire) { R.fire = true; R.x0c = W.mod.x.crater; R.x0e = W.mod.x.erupt; W.mod.x.crater = 2 * (R.x0c || 1); W.mod.x.erupt = 2 * (R.x0e || 1); R.news.push({ big: 'FIRE BALL', small: 'NEXT CRATER SHOT X2', kind: 'up' }); }
    }
    if (d.multiballs > 0 && n(R, 'twin') && W.mb) { E.api.addBall(W); R.news.push({ big: 'TWIN BALL', small: 'ONE MORE BALL', kind: 'up' }); }
    var mine = W.score - R.start;
    // the optional star
    if (R.star && !R.star.got && mine - (R.clearPts || 0) >= R.star.target) { R.star.got = true; R.news.push({ big: 'STAR', small: E.fmt(R.star.target) + ' IN THE ROUND', kind: 'star' }); }
    // the mission: progress is kept across balls
    var m = R.mission;
    if (m && !m.done && play) {
      var steps = MISSIONS[m.id].steps;
      for (var si = m.k + 1; si < steps.length; si++) { var ek = steps[si][0]; if (d[ek] > 0) { m.early = m.early || {}; m.early[ek] = (m.early[ek] || 0) + d[ek]; } }
      for (var guard = 0; guard < 4 && !m.done; guard++) {
        var st = MISSIONS[m.id].steps[m.k], got = d[st[0]] || 0;
        if (got <= 0) break;
        d[st[0]] = 0; m.got = Math.min(m.need, m.got + got);
        if (m.got >= m.need) {
          if (m.k + 1 < MISSIONS[m.id].steps.length) {
            m.k++; m.need = need(R, MISSIONS[m.id].steps[m.k][1]);
            var key = MISSIONS[m.id].steps[m.k][0]; m.got = Math.min(m.need, (m.early && m.early[key]) || 0); d[key] = 0;
            if (m.got >= m.need && m.k + 1 >= MISSIONS[m.id].steps.length) { m.done = true; stageClear(R, W); }
          }
          else { m.done = true; stageClear(R, W); }
        }
      }
    }
    if (R.bs && !R.cleared) boss(R, W, d);
    // the DIVE after STAGE CLEAR (20 s; without goals.js the run keeps the lamp itself)
    if (R.diveT > 0 && d.craters > 0 && W.crater.took === 'dive') R.diveT = 0;   // DIVE taken: the NEXT line stops saying DIVE IS LIT (integrate)
    var cl = W.crater.lit;   // (fix pass: the DIVE clock waits while another crater award comes first, as goals.js's does)
    if (R.diveT > 0 && play && !W.mb && (!cl || !cl.length || cl[0] === 'dive')) { if (--R.diveT === 0 && !goals()) E.api.craterLit(W, 'dive', false); }
    // THE BALL POOL: while a ball is in play the world serves exactly the balls left (a chamber clear may have added one)
    if (play) W.total = W.ball - 1 + Math.max(1, R.balls);
    // a ball has ended: after the round's goal it costs nothing and the round ends; before it, it costs a ball
    if (W.state === 'bonus' && R.endBall !== W.ball) {
      R.endBall = W.ball;
      if (R.bs) { R.bs.ballDmg.push(R.bs.ballD); R.bs.ballD = 0; }
      if (R.cleared) W.total = W.ball;
      else {
        R.balls = Math.max(0, R.balls - 1); R.lost++; R.lostHere++; W.total = W.ball + R.balls;
        R.cause = W.tilted ? 'tilt' : 'drain';
        R.news.push(R.balls > 0 ? { big: 'BALL LOST', small: R.balls + (R.balls === 1 ? ' BALL' : ' BALLS') + ' LEFT', kind: 'lost' } : { big: 'LAST BALL GONE', small: '', kind: 'lost' });
      }
    }
    show(R, W);
    if (!W.over) return R.phase;
    // the round is over
    R.hit = R.cleared;
    R.log.push({ round: R.round, score: W.score - R.start, target: R.target, star: !!(R.star && R.star.got), boss: R.boss, hp: R.hp, hpMax: R.hpMax, dmg: R.dmg,
      phase: R.bs ? R.bs.phase : 0, mission: R.mission ? R.mission.id : null, got: R.mission ? R.mission.got : 0, need: R.mission ? R.mission.need : 0,
      step: R.mission ? R.mission.k : 0, secs: R.clearSecs, lost: R.lostHere, frames: W.frame, hit: R.hit,
      hits: R.bs ? R.bs.hitF.slice() : null, ballDmg: R.bs ? R.bs.ballDmg.slice() : null });
    R.banked = W.score;
    R.deadKick = false;
    if (!R.cleared) { R.phase = 'over'; R.news.push({ big: 'RUN OVER', small: 'ROUND ' + R.round, kind: 'over' }); return R.phase; }
    if (R.round >= R.rounds) { R.won = true; R.phase = 'won'; R.cause = 'won'; R.news.push({ big: 'RUN WON', small: E.fmt(R.banked), kind: 'won' }); return R.phase; }
    var it = n(R, 'interest');
    if (it) { var gain = Math.min(INTEREST_MAX * it, Math.round(R.banked * 0.1 * it / 10) * 10); R.banked += gain; R.news.push({ big: 'INTEREST', small: '+' + E.fmt(gain), kind: 'up' }); }
    R.offer = offers(R);
    var mt = mutate(R); R.mutNext = mt;
    R.news.push({ big: mt.name, small: mt.text, kind: 'mutation' });
    R.phase = 'pick';
    return R.phase;
  }
  // STAGE CLEAR: the time bonus (faster pays more, never less than the base), a held moment, then DIVE for 20 s
  function stageClear(R, W) {
    var secs = W.frame / 60, f = Math.max(0, 1 - secs / CLEAR.secs), pts = Math.round((CLEAR.base + CLEAR.fast * f) * (1 + 0.25 * (R.round - 1)) / 100000) * 100000;
    R.cleared = R.hit = true; R.clearSecs = Math.round(secs * 10) / 10; R.clearPts = pts;
    E.api.award(W, pts, 'clear');
    W.events.push('missiondone', 'stageclear');
    E.api.hitstop(W, 30);   // (only when every ball is held or carried)
    R.diveT = DIVE_STEPS;
    var G = goals(); if (G && G.dive) G.dive(W, DIVE_STEPS); else E.api.craterLit(W, 'dive', true);
    R.news.push({ big: 'STAGE CLEAR', small: '+' + E.fmt(pts) + ' TIME BONUS', kind: 'win' });
  }
  // THE VOLCANO: three phases, HP in chunks; every 3M scored in the round is a chunk too
  function boss(R, W, d) {
    var B = R.bs, V = W.toys.volcano, dmg = 0, took = d.craters > 0 && W.crater.took === 'boss', tame = n(R, 'tamer'), fx = took && R.fireHit ? 2 : 1;
    if (took) R.fireHit = false;
    if (d.bank && n(R, 'fire')) R.fireHit = true;
    var pc = Math.floor((W.score - R.start) * UNIT / (DMG.points * PTSK[R.speed]));
    if (pc > B.pc) { dmg += pc - B.pc; B.pc = pc; }
    if (B.phase === 1) {
      if (d.bank) { E.api.seal(W, false); B.unsealT = UNSEAL[R.speed]; R.news.push({ big: 'THE SEAL CRACKS', small: 'THE CRATER IS OPEN', kind: 'boss' }); }
      if (B.unsealT > 0 && --B.unsealT === 0) E.api.seal(W, true);
      if (took) dmg += (DMG.crater + tame) * UNIT * fx;
    } else if (B.phase === 2) {
      if (--B.gateT <= 0) { B.side = -B.side; E.api.gates(W, -B.side, 0); E.api.gates(W, B.side, 480); B.gateT = 480; }
      dmg += d.lava * DMG.lava * UNIT;
    } else if (B.phase === 3) {
      if (took) { dmg += (DMG.countdown + tame) * UNIT * fx; if (V) V.pressure = 0; }
      else if (V && V.pressure >= W.press.level) { E.api.quake(W); V.pressure = 0; R.news.push({ big: 'THE VOLCANO BLOWS', small: 'IT FILLS AGAIN', kind: 'boss' }); }
    }
    if (dmg <= 0) return;
    dmg = Math.min(dmg, B.max - B.dealt);
    B.dealt += dmg; B.ballD += dmg; R.dmg = B.dealt; R.hp = Math.ceil((B.max - B.dealt) / UNIT);
    if (B.hitF.length < 60) B.hitF.push(W.frame);
    W.events.push('bosshit');
    if (B.dealt >= B.max) {   // the kill
      R.cleared = R.hit = true; R.clearSecs = Math.round(W.frame / 6) / 10;
      E.api.seal(W, false); E.api.craterLit(W, 'boss', false); W.mod.pressRate = R.press0; W.mod.crab = R.crab0;
      W.events.push('bossdown');
      E.api.multiball(W, 3, { save: 20, victory: true });
      R.news.push({ big: 'VOLCANO DEFEATED', small: 'VICTORY MULTIBALL', kind: 'win' });
      return;
    }
    var ph = B.dealt < Math.ceil(B.max * 0.3) ? 1 : B.dealt < Math.ceil(B.max * 0.7) ? 2 : 3;
    if (ph > B.phase) {
      B.phase = ph; W.events.push('bossphase');
      if (ph === 2) {
        E.api.seal(W, false); E.api.craterLit(W, 'boss', false); B.unsealT = 0;
        B.side = 1; E.api.gates(W, -1, 0); E.api.gates(W, 1, 480); B.gateT = 480; W.mod.crab = R.crab0 * 1.6;
      } else {
        W.mod.crab = R.crab0; E.api.craterLit(W, 'boss', true); E.api.gates(W, 0, 0);
        W.mod.pressRate = W.press.level / COUNTDOWN[R.speed]; if (V) V.pressure = 0;
      }
      R.news.push({ big: 'THE VOLCANO · ' + PHASES[ph], small: ph === 2 ? 'THE LAVA GATES OPEN' : 'IT IS ABOUT TO BLOW', kind: 'boss' });
    } else if (dmg >= UNIT) R.news.push({ big: 'VOLCANO HIT', small: '-' + Math.round(dmg / UNIT) + (dmg < 2 * UNIT ? ' CHUNK' : ' CHUNKS'), kind: 'hit' });
  }
  // for the page's test hook (PinRunPage.endRound): the round's mission done, or the volcano down, at once
  function clear(R, W) {
    if (R.phase !== 'play' || R.cleared || !W) return false;
    if (R.bs) { var d0 = { craters: 0, lava: 0, bank: 0 }; R.bs.pc = -R.bs.max; boss(R, W, d0); }
    else if (R.mission) { R.mission.done = true; stageClear(R, W); }
    show(R, W);
    return R.cleared;
  }
  // a level below the surface (THE MAGMA CHAMBER): a chamber clear is one more ball, once a round
  function levelUpdate(R, W) {
    for (var i = 0; i < W.events.length; i++) if (W.events[i] === 'chamberclear' && !R.chamberBall) {
      R.chamberBall = true; R.balls = Math.min(BALLS_MAX, R.balls + 1);
      R.news.push({ big: 'CHAMBER CLEARED', small: 'ONE MORE BALL', kind: 'up' });
    }
    return R.phase;
  }
  // 3 upgrades to choose from (none already at its most), from the round's own numbers
  function offers(R) {
    var st = stream(R, 11), pool = UPGRADES.filter(function (u) { return n(R, u.id) < u.max && !(u.id === 'wind' && (R.round >= R.rounds || R.balls >= BALLS_MAX)); }).map(function (u) { return u.id; }), out = [];
    while (out.length < 3 && pool.length) out.push(pool.splice(Math.floor(rnd(st) * pool.length), 1)[0]);
    return out;
  }
  function mutate(R) {   // a mutation not had yet this run
    var st = stream(R, 13), pool = MUTATIONS.filter(function (m) { return R.muts.indexOf(m.id) < 0; });
    if (!pool.length) pool = MUTATIONS.slice();
    var m = pool[Math.floor(rnd(st) * pool.length)];
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
    var mine = W ? W.score - R.start : 0, m = R.mission, B = R.bs;
    return {
      round: R.round, rounds: R.rounds, boss: R.boss, target: R.target, roundScore: mine,
      progress: B ? B.dealt / B.max : m ? (m.done ? 1 : (m.k + m.got / m.need) / MISSIONS[m.id].steps.length) : 0,
      hp: R.hp, hpMax: R.hpMax, hit: R.hit, wind: R.wind, phase: R.phase, balls: R.balls, ballsMax: R.ballsMax, cleared: R.cleared,
      mission: m ? { id: m.id, text: m.text, got: m.got, need: m.need, step: m.k, steps: MISSIONS[m.id].steps.length, done: m.done, t: R.clearSecs } : null,
      star: R.star ? { target: R.star.target, got: R.star.got } : null,
      boss: B ? { chunks: Math.ceil((B.max - B.dealt) / UNIT), chunksMax: B.max / UNIT, units: B.max - B.dealt, unitsMax: B.max, phase: B.phase, phaseName: PHASES[B.phase], sealed: !!(W && W.crater && W.crater.sealed) } : null,
      dive: R.diveT > 0 ? Math.ceil(R.diveT / 60) : 0, daily: R.daily,
      mutations: R.muts.map(function (id) { return MU[id]; }), upgrades: R.taken.map(function (id) { return UP[id]; }),
      next: R.mutNext
    };
  }
  function summary(R) {
    var cleared = R.log.filter(function (l) { return l.hit; }).length, last = R.log[R.log.length - 1] || null, near = [], next = '';
    if (last && !last.hit) {   // honest near misses only: one short of the mission, or the volcano a chunk or two from down
      if (last.boss && last.hpMax && last.hp <= 2) near.push('The volcano had ' + last.hp + (last.hp === 1 ? ' chunk' : ' chunks') + ' left');
      if (!last.boss && last.mission && last.got >= 1 && last.need - last.got === 1 && last.step === MISSIONS[last.mission].steps.length - 1) near.push('One short: ' + MISSIONS[last.mission].text + ' (' + last.got + ' of ' + last.need + ')');
      next = last.boss ? (last.phase <= 1 ? 'Clear the obsidian targets to crack the volcano, then shoot the crater' : last.phase === 2 ? 'Shoot the lava lane whose gate is open' : 'Hit the crater before the pressure fills')
        : last.mission === 'ramp2' ? 'The heat ramp is the lane in the middle: hold a flipper up to catch the ball, then shoot'
        : last.mission === 'obsidian' ? 'Knock down all three obsidian targets: the plug rises between the flippers too'
        : 'Next time: ' + MISSIONS[last.mission].text.toLowerCase();
    }
    return {
      seed: R.seed, won: R.won, reached: R.round, cleared: cleared, score: R.banked, daily: R.daily,
      cause: R.won ? 'won' : R.cause || 'drain', nearMiss: near, next: next, stars: R.log.filter(function (l) { return l.star; }).length,
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
    newRun: newRun, startRound: startRound, update: update, offers: offers, pick: pick, status: status, summary: summary, daily: daily, clear: clear,
    loadBest: loadBest, saveBest: saveBest, better: better, mod: mod, UNIT: UNIT, SAVE0: SAVE0, NEEDK: NEEDK, HPK: HPK, BALLS: BALLS, BALLS_MAX: BALLS_MAX, MISSIONS: MISSIONS, PHASES: PHASES, missionFor: missionFor,
    UPGRADES: UPGRADES, MUTATIONS: MUTATIONS, UP: UP, MU: MU, TARGET: TARGET, HP: HP, DMG: DMG, ROUNDS: ROUNDS, BOSS: BOSS, SPEEDK: SPEEDK
  };
});
