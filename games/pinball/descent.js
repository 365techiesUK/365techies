/* 365 Pinball Hero - INTO THE VOLCANO: the levels below Ember Peak (wave 3, 5 Nov 2026). No drawing here; it runs in
 * the page, in the camera's forecast worker and in node (descent.test.mjs, tools/pinball/descent-farm.cjs).
 *
 * The surface (Ember Peak) is the only place a ball can be lost. Sinking a lit crater (DIVE) takes the ball into the
 * DIVE hold; this file then cuts to THE MAGMA CHAMBER (tables/chamber.js), a one-screen level with the same flippers in
 * the same place. Down there:
 *  - a held start: the ball drops on to the wire rail, is held 1 s (T.serve), then rolls into the left inlane;
 *  - the goal: light the three VENTS (pop bumpers; the CINDER LANE behind its lava gate lights the next one), then hit
 *    the MAGMA CORE = CHAMBER CLEARED ('chamberclear': 10,000,000 in Classic; Ember Run gives a ball instead - run.js
 *    sees the event). The scoop then lights ASCEND (the crater's 'boss' lamp, which pushes no event): sinking it pays
 *    the ASCEND award ('ascend') and is the trip home;
 *  - the lava clock: 55 / 45 / 40 s (Gentle / Classic / Fast; T.clock) from the end of the held start. At zero THE
 *    LAVA RISES ('lavarise'): the flippers die (W.tilted) and the ball drains;
 *  - no lost balls: a drain (or the lava) ends the chamber's world (T.level) and the ball goes back up.
 * Going up, the score (and any extra ball earned below) is carried back to the surface and the held ball is let go up
 * the volcano's sky carry into the left inlane (E.api.release). The level changes only from a captured ball: the DIVE
 * hold above; the drain or the scoop below. Never during multiball: a DIVE taken while another ball is in play is let
 * straight back out and DIVE stays lit until one ball is left.
 *
 * CONTRACT v1:
 *   PinDescent.create(E, { speed, seed }) -> D          (seed: mixed into each level's seed; speed: a default only)
 *   D.active(W)   the world to step and draw: W (the page's surface world) or the level below it
 *   D.update(W)   after each step (W: the surface world or the active one): null, 'down' (just cut to the level) or
 *                 'up' (just cut back to the surface)
 *   D.status()    { depth, name, clock, goal, cleared } plus levels (the depth meter's names), dives, clears, vents,
 *                 last ({ how: 'ascend' | 'drain' | 'lava', cleared, secs, score } of the last trip down)
 * The engine plugin 'descent' (registered when this file loads; url 'descent.js' so the forecast worker loads it too):
 *   on the surface W.descent = { dives, clears, below, last }: below is the level's whole world while the ball is down
 *   there (plain data inside the surface world, so E.clone copies the lot); on a level W.descent = { level, dive,
 *   vents: [3], lit, cleared, asc, rose, clock (steps left), opened } and W.next = { shot, text, small, gauge, clock }
 *   (shots 'vents', 'core', 'scoop'). New events (besides the contract's 'chamberclear', 'ascend', 'lavarise'):
 *   { sfx: 'vent', i, n } when a vent lights.
 * Deterministic: integer steps only, no Math.random, Date, sin, cos or pow. Plain ES5. In node:
 * require('./descent.js') (it loads engine.js itself). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./engine.js'));
  else root.PinDescent = factory(root.PinEngine);
})(typeof self !== 'undefined' ? self : this, function (E0) {
  'use strict';
  var E = E0;
  var LEVELS = [{ id: null, name: 'SURFACE' }, { id: 'chamber', name: 'MAGMA CHAMBER' }];
  var NAMES = ['SURFACE', 'MAGMA CHAMBER', '?'];

  function tableOf(W) { return E.table(W.tableId).T; }
  function isLevel(W) { return !!(W && E && E.table && tableOf(W).level); }
  function copy(o) { return o == null ? o : JSON.parse(JSON.stringify(o)); }
  function mix(a, b, c) {   // a whole-number hash (a level's seed from the surface's seed and the dive count)
    var h = Math.imul((a | 0) ^ 0x5bd1e995, 0x9e3779b1) ^ Math.imul((b | 0) + 0x7f4a7c15, 0x85ebca6b) ^ Math.imul((c | 0) + 0x165667b1, 0xc2b2ae35);
    h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12;
    return (h & 0x7ffffff) || 1;
  }
  function msg(W, big, small, steps) { W.dmd = { big: big, small: small || '', t: steps || 120, n: 0 }; }
  function say(W, text) { W.events.push({ say: text }); }
  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function pts(W, key, dflt) { var P = tableOf(W).points || {}; return P[key] != null ? P[key] : dflt; }

  // ---------------------------------------------------------------- state
  function surfaceState() { return { dives: 0, clears: 0, below: null, last: null }; }
  function levelState(W) {
    var T = tableOf(W), secs = (T.clock && T.clock[W.speed]) || 45;
    return { level: T.level, dive: 0, vents: [false, false, false], lit: 0, cleared: false, asc: false, rose: false,
      clock: secs * 60, opened: false, score0: 0 };
  }
  // balls in play besides one in the DIVE hold (and balls waiting to be fed)
  function others(W) {
    var n = W.feed > 0 ? W.feed : 0;
    for (var i = 0; i < W.balls.length; i++) if (!W.balls[i].dive) n++;
    return n;
  }
  function servedYet(W) {   // the held start is over (no ball still held at the top of the rail)
    for (var i = 0; i < W.balls.length; i++) if (W.balls[i].at === 'serve') return false;
    return true;
  }
  function drop(ev, name) {   // take this step's last `name` event out (a DIVE that has to wait)
    for (var i = ev.length - 1; i >= 0; i--) if (ev[i] === name) { ev.splice(i, 1); return; }
  }

  // ---------------------------------------------------------------- the plugin
  function init(W) { W.descent = isLevel(W) ? levelState(W) : surfaceState(); }
  function step(W) {
    if (!W.descent) init(W);   // (a world made before this plugin was registered)
    if (W.descent.level) levelStep(W); else surfaceStep(W);
  }
  // the surface: never during multiball - a DIVE taken while another ball is in play goes straight back out, lit again
  function surfaceStep(W) {
    if (!W.dive || !W.dive.held || others(W) === 0) return;
    if (E.api.release(W)) {
      drop(W.events, 'dive');
      E.api.craterLit(W, 'dive', true); drop(W.events, 'divelit');
      msg(W, 'DIVE WAITS', 'FOR ONE BALL', 120);
    }
  }
  function levelStep(W) {
    var D = W.descent, T = tableOf(W), LO = T.laneOpen || { start: 720, vent: 480 };
    if (D.asc || W.over) return;
    if (!D.opened) { D.opened = true; D.score0 = W.score; E.api.gates(W, -1, LO.start); }
    var ev = W.events, n = ev.length;
    for (var k = 0; k < n; k++) {
      var e = ev[k], nm = typeof e === 'string' ? e : e && e.sfx;
      if (nm === 'bumper') vent(W, e.i);
      else if (nm === 'crab') core(W);
      else if (nm === 'lava') lane(W);
      else if (nm === 'crater' && W.crater.took === 'boss') { ascend(W); break; }
    }
    // the lava clock runs once the held start is over
    if (!D.asc && !D.rose && servedYet(W) && D.clock > 0 && --D.clock === 0) rise(W);
    W.next = nextOf(W);
  }
  function vent(W, i) {
    var D = W.descent, T = tableOf(W), LO = T.laneOpen || { vent: 480 };
    if (D.cleared || D.rose || i == null || i < 0 || i >= D.vents.length || D.vents[i]) return;
    D.vents[i] = true; D.lit++;
    E.api.award(W, pts(W, 'vent', 250000), 'vent');
    W.events.push({ sfx: 'vent', i: i, n: D.lit });
    if (D.lit < D.vents.length) {
      E.api.gates(W, -1, LO.vent);
      msg(W, 'VENT LIT', (D.vents.length - D.lit) + ' TO GO', 90);
    } else { msg(W, 'VENTS LIT', 'HIT THE MAGMA CORE', 150); say(W, 'All three vents lit. Hit the magma core!'); }
  }
  function lane(W) {   // the CINDER LANE lights the next vent
    var D = W.descent;
    if (D.cleared || D.rose) return;
    for (var i = 0; i < D.vents.length; i++) if (!D.vents[i]) { vent(W, i); return; }
  }
  function core(W) {
    var D = W.descent;
    if (D.rose) return;
    if (D.cleared) { msg(W, 'MAGMA CORE', 'SHOOT THE SCOOP', 80); return; }
    if (D.lit < D.vents.length) { msg(W, 'MAGMA CORE', 'LIGHT THE VENTS FIRST', 90); return; }
    D.cleared = true;
    W.events.push('chamberclear');
    var big = pts(W, 'chamber', 10000000);
    if (!W.mod) E.api.award(W, big, 'chamber');   // (Ember Run gives a ball instead: run.js sees 'chamberclear')
    E.api.craterLit(W, 'boss', true);
    E.api.gates(W, -1, 3600);
    msg(W, 'CHAMBER CLEARED', W.mod ? 'SHOOT THE SCOOP: ASCEND' : fmt(big), 180);
    say(W, 'Chamber cleared! Shoot the scoop to ascend.');
  }
  function ascend(W) {
    var D = W.descent, a = pts(W, 'ascend', 5000000);
    D.asc = true;
    E.api.craterLit(W, 'boss', false);
    E.api.award(W, a, 'ascend');
    W.events.push('ascend');
    msg(W, 'ASCEND', fmt(a), 150); say(W, 'Ascend! Back to the surface.');
  }
  function rise(W) {   // THE LAVA RISES: the flippers die and the ball drains (and goes back up: no ball is lost)
    var D = W.descent;
    D.rose = true; W.tilted = true;
    E.api.craterLit(W, 'boss', false);
    E.api.gates(W, -1, 0);
    W.events.push('lavarise');
    msg(W, 'THE LAVA RISES', 'BACK TO THE SURFACE', 9999); say(W, 'The lava rises! Back to the surface.');
  }
  function nextOf(W) {
    var D = W.descent, secs = Math.ceil(D.clock / 60);
    if (D.rose) return { shot: null, text: 'THE LAVA RISES', small: 'BACK TO THE SURFACE', gauge: 0, clock: 0 };
    if (D.cleared) return { shot: 'scoop', text: 'ASCEND', small: 'SHOOT THE MAGMA SCOOP', gauge: 1, clock: secs };
    if (D.lit >= D.vents.length) return { shot: 'core', text: 'HIT THE MAGMA CORE', small: 'CLEAR THE CHAMBER', gauge: 1, clock: secs };
    var left = D.vents.length - D.lit;
    return { shot: 'vents', text: 'LIGHT THE VENTS', small: left + ' MORE · THEN THE CORE', gauge: D.lit / D.vents.length, clock: secs };
  }
  var PLUGIN = { id: 'descent', init: init, step: step, url: 'descent.js' };
  if (E && E.plugin) E.plugin(PLUGIN);

  // ---------------------------------------------------------------- the descent (between steps)
  function create(E2, opt) {
    if (E2 && E2 !== E) { E = E2; }
    if (E && E.plugin) E.plugin(PLUGIN);
    opt = opt || {};
    var D = { S: null };
    function surf(W) {
      if (!W) return D.S;
      if (isLevel(W)) return D.S;
      D.S = W;
      if (!W.descent) init(W);
      return W;
    }
    function down(S) {
      var Ds = S.descent, n = Ds.dives;
      var C = E.newWorld(S.speed || opt.speed || 2, 0, mix(S.seed, n + 1, opt.seed | 0), LEVELS[1].id);
      C.score = S.score; C.ball = S.ball; C.total = S.total; C.extraAt = S.extraAt.slice(); C.demo = !!S.demo;
      if (S.mod) C.mod = copy(S.mod);
      if (!C.descent) init(C);
      C.descent.dive = n + 1; C.descent.score0 = S.score;
      Ds.below = C; Ds.dives = n + 1;
    }
    function up(S, C) {
      var Ds = S.descent, Dc = C.descent || {};
      var how = Dc.asc ? 'ascend' : Dc.rose ? 'lava' : 'drain';
      S.score = C.score; S.total = C.total; S.extraAt = C.extraAt.slice();
      if (Dc.cleared) Ds.clears++;
      Ds.last = { how: how, cleared: !!Dc.cleared, secs: Math.round(C.frame / 6) / 10, score: C.score - (Dc.score0 || 0) };
      Ds.below = null;
      if (!E.api.release(S)) E.api.addBall(S);   // (the held ball goes up the sky carry into the left inlane)
      msg(S, how === 'ascend' ? 'ASCENDED' : 'BACK TO THE SURFACE', Dc.cleared ? 'CHAMBER CLEARED' : 'THE VOLCANO SPITS IT OUT', 150);
    }
    D.active = function (W) {
      var S = surf(W);
      return S && S.descent && S.descent.below ? S.descent.below : W;
    };
    D.update = function (W) {
      var S = surf(W);
      if (!S || !S.descent) return null;
      var C = S.descent.below;
      if (!C) {
        if (S.dive && S.dive.held && !S.over && S.state === 'play' && others(S) === 0) { down(S); return 'down'; }
        return null;
      }
      if (C.over || (C.descent && C.descent.asc)) { up(S, C); return 'up'; }
      return null;
    };
    D.status = function () {
      var S = D.S, Ds = S && S.descent, C = Ds && Ds.below, Dc = C && C.descent;
      return {
        depth: C ? 1 : 0, name: NAMES[C ? 1 : 0], clock: Dc ? Math.ceil(Dc.clock / 60) : null,
        goal: Dc && C.next ? C.next.text : null, cleared: !!(Dc && Dc.cleared),
        levels: NAMES.slice(), dives: Ds ? Ds.dives : 0, clears: Ds ? Ds.clears : 0, vents: Dc ? Dc.lit : 0,
        rose: !!(Dc && Dc.rose), last: Ds ? Ds.last : null
      };
    };
    return D;
  }

  return { create: create, plugin: PLUGIN, LEVELS: LEVELS, NAMES: NAMES, isLevel: isLevel, url: 'descent.js' };
});
