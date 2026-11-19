/* 365 Pinball Hero - THE GOALS (wave 3, 5 Nov 2026; the build plan's section 4, item 7). One goal engine for Ember Peak,
 * an engine plugin (E.plugin, id 'goals', url 'goals.js'); its state is plain data in W.goals, so E.clone copies it.
 *  - W.next = { shot, text, small, gauge 0..1, clock secs or null }: THE one goal, on every surface step, chosen in this
 *    order: 1. a mission or boss phase (run.js sets it: PinGoals.mission(W, def)); 2. the multiball jackpots, or the super
 *    jackpot; 3. an active island mode; 4. a crater award (ERUPT, LOCK, MODE, DIVE); 5. building up ("HEAT RAMP",
 *    "2 MORE TO ERUPT"). The page shows it as NEXT: text · small; the pilot aims for W.next.shot.
 *  - COMBOS: any two major shots (crater, heat ramp, either orbit, the loop, either lava lane, the full obsidian bank)
 *    within 3.0 s. The clock stops while a ball is held, carried or on the ramp. Combo n pays n x 250,000 and pushes
 *    { sfx: 'combo', n }; the fifth is a SUPER COMBO, 5,000,000 and 'supercombo'.
 *  - ISLAND MODES (Classic only: W.mod.noModes turns them off): the obsidian bank lights MODE at the crater (the
 *    engine), and the crater starts the next of four in turn - CRAB HUNT (crabs x3), OBSIDIAN QUARRY (obsidian x4),
 *    ORBIT STORM (the lava gates open; orbits, loops or lava lanes x3), HEAT WAVE (heat ramp x2; one fewer each than the
 *    plan's numbers, tuned to the casual bot). Each lasts 30 s
 *    (Gentle 40 s) and stacks with multiball; done = 5,000,000 x the modes done so far and DIVE lights; run out = nothing
 *    lost. Events 'modestart', 'modedone', 'modefail'.
 *  - DIVE (PinGoals.dive(W, steps)): lit at the crater for a while, never during a multiball (it waits, unlit, until only
 *    one ball is left).
 * On a level below the surface (T.level) it does nothing: descent.js writes W.next there. Shots are read from W.stats
 * (and the obsidian bank from W.dropsDown), never from W.events, so it counts right whether or not the caller empties
 * the events every step. No Math.random, Date, sin/cos/pow or timers. Plain ES5; in node: require('./goals.js'). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./engine.js'));
  else root.PinGoals = factory(root.PinEngine);
})(typeof self !== 'undefined' ? self : this, function (E) {
  'use strict';
  if (!E) return null;
  var COMBO = 180, SUPER = 5, COMBO_PTS = 250000, SUPER_PTS = 5000000, MODE_PTS = 5000000, DIVE_STEPS = 1200, MODE_DIVE = 2700;   // (MODE_DIVE: a done mode's DIVE in Classic stays lit longer than STAGE CLEAR's 20 s: integrate, so a casual player reaches the chamber in half of Classic Gentle games)
  var MODES = [
    { id: 'crabhunt', name: 'CRAB HUNT', shot: 'crabs', count: ['crabs'], need: 3, word: 'CRABS' },
    { id: 'quarry', name: 'OBSIDIAN QUARRY', shot: 'drops', count: ['drops'], need: 4, word: 'OBSIDIAN' },
    { id: 'storm', name: 'ORBIT STORM', shot: 'orbitL', count: ['orbits', 'loops', 'lava'], need: 3, word: 'ORBITS', gates: true },
    { id: 'heatwave', name: 'HEAT WAVE', shot: 'ramp', count: ['ramps'], need: 2, word: 'HEAT RAMPS' }
  ];
  var NAMES = { crater: 'CRATER', ramp: 'HEAT RAMP', orbitL: 'LEFT ORBIT', orbitR: 'RIGHT ORBIT', lavaL: 'LEFT LAVA LANE', lavaR: 'RIGHT LAVA LANE',
    drops: 'OBSIDIAN', crabs: 'MAGMA CRABS', pops: 'FUMAROLES', geyser: 'GEYSER', lanes: 'TOP LANES', loop: 'LOOP' };
  var STATS = ['craters', 'ramps', 'orbits', 'loops', 'lava', 'drops', 'crabs', 'eruptions', 'jackpots', 'locks', 'multiballs', 'bumpers', 'geysers'];

  function fmt(n) { return E.fmt(n); }
  function tableOf(W) { return E.table(W.tableId).T; }
  function surface(W) { var T = tableOf(W); return !T.level && !!T.volcano; }
  function snap(W) { var s = {}; for (var i = 0; i < STATS.length; i++) s[STATS[i]] = W.stats[STATS[i]] || 0; return s; }
  function fresh(W) {
    return { mode: null, modeLit: false, modesDone: 0, modeIdx: 0, modesStarted: 0, modesFailed: 0, mission: null, combo: { n: 0, t: 0 },
      combos: 0, superCombos: 0, bestCombo: 0, diveLit: false, diveT: 0, diveOwn: false, banks: 0, shots: [], s: snap(W), dd: W.dropsDown || 0 };
  }
  function init(W) {
    if (!surface(W)) return;
    W.goals = fresh(W);
    W.next = nextOf(W);
  }
  // the major shots made this step, as shot ids (and the bank of obsidian), from the stats
  function shotsOf(W, g) {
    var S = W.stats, o = g.s, out = [], i, n, T = tableOf(W), nd = T.drops ? T.drops.n : 0;
    for (i = 0; i < S.craters - o.craters; i++) out.push('crater');
    for (i = 0; i < S.ramps - o.ramps; i++) out.push('ramp');
    for (i = 0; i < S.orbits - o.orbits; i++) out.push(W.orbitFrom === 'R' ? 'orbitR' : 'orbitL');
    for (i = 0; i < S.loops - o.loops; i++) out.push('loop');
    for (i = 0; i < S.lava - o.lava; i++) out.push(W.lit.lava && W.lit.lava[1] > W.lit.lava[0] ? 'lavaR' : 'lavaL');
    n = W.dropsDown || 0;
    if (nd && n === nd && g.dd < nd) { out.push('drops'); g.banks++; }
    g.dd = n;
    return out;
  }
  function anyCaught(W) { for (var i = 0; i < W.balls.length; i++) if (W.balls[i].m !== 'free') return true; return false; }

  function step(W) {
    if (!W.goals) { if (!surface(W)) return; W.goals = fresh(W); }
    var g = W.goals, S = W.stats, i, k;
    var shots = shotsOf(W, g), d = {};
    for (i = 0; i < STATS.length; i++) { k = STATS[i]; d[k] = (S[k] || 0) - g.s[k]; }
    g.s = snap(W); g.shots = shots;
    var play = W.state === 'play' && !W.tilted;
    // combos: the clock stops while a ball is held, carried or on the ramp
    if (g.combo.t > 0 && !anyCaught(W)) { if (--g.combo.t === 0) g.combo.n = 0; }
    for (i = 0; i < shots.length && play; i++) {
      g.combo.n = g.combo.t > 0 ? g.combo.n + 1 : 1; g.combo.t = COMBO;
      if (g.combo.n >= 2) {
        g.combos++; if (g.combo.n > g.bestCombo) g.bestCombo = g.combo.n;
        if (g.combo.n === SUPER) { g.superCombos++; E.api.award(W, SUPER_PTS, 'combo'); W.events.push('supercombo'); say(W, 'SUPER COMBO', fmt(SUPER_PTS)); }
        else { E.api.award(W, g.combo.n * COMBO_PTS, 'combo'); W.events.push({ sfx: 'combo', n: g.combo.n }); say(W, 'COMBO X' + g.combo.n, fmt(g.combo.n * COMBO_PTS)); }
      }
    }
    if (W.state !== 'play') { g.combo.n = 0; g.combo.t = 0; }
    modes(W, g, d);
    if (d.craters > 0 && W.crater.took === 'dive') { g.diveLit = false; g.diveT = 0; }   // taken
    if (g.diveLit && g.diveT > 0 && play && !W.mb && --g.diveT === 0) g.diveLit = false;
    diveLamp(W, g);
    W.next = nextOf(W);
  }
  function say(W, big, small) { W.dmd = { big: big, small: small || '', t: 90, n: 0 }; }

  // ------------------------------------------------------------ the island modes (Classic)
  function modes(W, g, d) {
    var noModes = !!(W.mod && W.mod.noModes), m = g.mode;
    g.modeLit = !noModes && !!W.crater.mode;
    if (noModes) { if (m) g.mode = null; return; }
    if (W.state !== 'play') { if (m) { g.mode = null; g.modesFailed++; W.events.push('modefail'); } return; }   // (a mode ends with its ball)
    if (d.craters > 0 && W.crater.took === 'mode') {
      if (m) m.t += 600;   // MODE again while one runs: 10 more seconds
      else {
        var def = MODES[g.modeIdx % MODES.length], secs = W.speed === 1 ? 40 : 30;
        g.modeIdx++; g.modesStarted++;
        m = g.mode = { id: def.id, i: (g.modeIdx - 1) % MODES.length, got: 0, need: def.need, t: secs * 60 };
        if (def.gates) E.api.gates(W, 0, m.t);
        W.events.push('modestart'); say(W, def.name, def.need + ' ' + def.word + ' IN ' + secs + ' S');
        return;
      }
    }
    if (!m) return;
    var D = MODES[m.i];
    for (var i = 0; i < D.count.length; i++) m.got += Math.max(0, d[D.count[i]] || 0);
    if (m.got >= m.need) {
      g.modesDone++; g.mode = null;
      var pts = MODE_PTS * g.modesDone;
      E.api.award(W, pts, 'mode'); W.events.push('modedone'); say(W, D.name + ' DONE', fmt(pts));
      dive(W, MODE_DIVE);
      return;
    }
    if (--m.t <= 0) { g.mode = null; g.modesFailed++; W.events.push('modefail'); say(W, D.name, 'TIME UP'); }
  }
  // ------------------------------------------------------------ DIVE at the crater, never during a multiball
  function dive(W, steps) {
    var g = W.goals; if (!g) return;
    if (steps > 0) { g.diveLit = true; g.diveT = steps | 0; } else { g.diveLit = false; g.diveT = 0; }
    g.diveOwn = true;
    diveLamp(W, g);
  }
  function diveLamp(W, g) {   // a DIVE lit through PinGoals.dive follows g.diveLit, dark during a multiball (one lit
    if (!g.diveOwn) return;   // straight through E.api.craterLit is left alone)
    var want = g.diveLit && !W.mb && W.state === 'play';
    if (want !== !!W.crater.dive && !W.dive.held) E.api.craterLit(W, 'dive', want);
    if (!g.diveLit) g.diveOwn = false;
  }

  // ------------------------------------------------------------ THE one goal
  function nextOf(W) {
    var g = W.goals, V = W.toys.volcano, C = W.crater, M = W.mb, T = tableOf(W), mi = g && g.mission;
    if (mi && mi.text) return { shot: mi.shot || null, text: mi.text, small: mi.small || '', gauge: mi.need ? Math.min(1, (mi.got || 0) / mi.need) : (mi.gauge || 0), clock: mi.clock != null ? mi.clock : null };
    if (M) {
      if (M.superLit) return { shot: 'crater', text: 'SUPER JACKPOT', small: 'CRATER · ' + fmt(3 * M.jpValue), gauge: 1, clock: null };
      var order = [['ramp', 'ramp'], ['lavaL', 'lavaL'], ['lavaR', 'lavaR']];
      for (var i = 0; i < order.length; i++) if (M.jp[order[i][0]]) return { shot: order[i][1], text: 'JACKPOT', small: NAMES[order[i][1]] + ' · ' + fmt(M.jpValue), gauge: (3 - (M.jp.ramp ? 1 : 0) - (M.jp.lavaL ? 1 : 0) - (M.jp.lavaR ? 1 : 0)) / 3, clock: null };
    }
    if (g && g.mode) {
      var D = MODES[g.mode.i];
      return { shot: D.shot, text: D.name, small: g.mode.got + ' OF ' + g.mode.need + ' ' + D.word, gauge: g.mode.got / g.mode.need, clock: Math.ceil(g.mode.t / 60) };
    }
    if (C && !C.sealed) {
      for (var j = 0; j < C.lit.length; j++) {
        var aw = C.lit[j];
        if (aw === 'erupt') return { shot: 'crater', text: 'ERUPT', small: 'SHOOT THE CRATER', gauge: 1, clock: null };
        if (aw === 'lock') return { shot: 'crater', text: 'LOCK IS LIT', small: 'SHOOT THE CRATER', gauge: V ? Math.min(1, V.pressure / W.press.level) : 0, clock: null };
        if (aw === 'mode') return { shot: 'crater', text: 'MODE IS LIT', small: 'CRATER · ' + MODES[(g ? g.modeIdx : 0) % MODES.length].name, gauge: 0, clock: null };
        if (aw === 'dive') return { shot: 'crater', text: 'DIVE IS LIT', small: 'CRATER · INTO THE VOLCANO', gauge: 1, clock: g && g.diveT ? Math.ceil(g.diveT / 60) : null };
      }
    }
    // building up: the obsidian when the bank is nearly down, else the heat ramp towards the eruption
    var nd = T.drops ? T.drops.n : 0;
    if (nd && !W.plug.up && W.dropsDown >= nd - 2 && W.dropsDown < nd) return { shot: 'drops', text: NAMES.drops, small: (nd - W.dropsDown) + ' MORE FOR THE PLUG', gauge: W.dropsDown / nd, clock: null };
    if (V && W.press) {
      var gain = ((T.pressure && T.pressure.ramp) || 0.12) * (W.mod && W.mod.press > 0 ? W.mod.press : 1), need = Math.max(0, W.press.level - V.pressure);
      var n = Math.max(1, Math.ceil(need / gain - 1e-9));
      return { shot: 'ramp', text: NAMES.ramp, small: n + ' MORE TO ERUPT', gauge: Math.min(1, V.pressure / W.press.level), clock: null };
    }
    return { shot: 'ramp', text: NAMES.ramp, small: '', gauge: 0, clock: null };
  }

  // ------------------------------------------------------------ for run.js: a mission or boss phase as THE goal
  // def = { id, text, small, shot, got, need, gauge, clock } (plain data), or null to clear it. W.next follows at once.
  function mission(W, def) {
    if (!W.goals) { if (!surface(W)) return null; W.goals = fresh(W); }
    var m = null;
    if (def) { m = {}; for (var k in def) if (Object.prototype.hasOwnProperty.call(def, k) && typeof def[k] !== 'function' && typeof def[k] !== 'object') m[k] = def[k]; }
    W.goals.mission = m;
    W.next = nextOf(W);
    return m;
  }

  var G = { id: 'goals', url: 'goals.js', init: init, step: step, mission: mission, dive: dive, next: nextOf, MODES: MODES, NAMES: NAMES,
    COMBO: COMBO, COMBO_PTS: COMBO_PTS, SUPER_PTS: SUPER_PTS, MODE_PTS: MODE_PTS };
  E.plugin(G);
  return G;
});
