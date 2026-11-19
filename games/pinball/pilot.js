/* 365 Pinball Hero - the demo pilot (15 Oct 2026, milestone 2a; any table, 16 Oct 2026): a bot that plays the table
 * for the title screen's attract mode (demo.js), for film captures and for the camera's sim-farm tests.
 * PinPilot.input(W) -> the buttons for this step ({ left, right, fire }), worked out from the world alone - no
 * Math.random - so the same world played from the start always plays out the same.
 *
 * How it plays, at the game's own 60 steps a second like a person:
 *  - the plunger: it waits a moment, then holds the plunger for the number of steps that drops the ball into the lit
 *    skill-shot lane (or now and then a full pull round the arch) and lets go;
 *  - a ball coming down on to a flipper - ANY flipper (a table may have more than one pair) - is flipped a
 *    moment before it lands (a look-ahead from its speed). A button works every flipper on its side, so each side
 *    watches all of its flippers and acts for the one the ball is coming to;
 *  - a slow ball is often caught instead: the flipper is held up, the ball rolls into the crook and settles (a cradle),
 *    then the pilot picks a shot and lets go, flipping again that shot's delay later. Ember Peak (one screen since
 *    29 Oct 2026, one pair of flippers): the crater when the pressure is full (the eruption), the lava lanes while
 *    they are open, the orbits for a LOOP, the heat ramp during a combo; else a round of the heat ramp, the orbits,
 *    the obsidian targets, the crater and now and then the geyser. The old table: the hangar, the ramp, the orbits,
 *    the targets.
 *  - the delays start from AIM (measured by tools/pinball/page-pilot-aim.cjs; re-run it if a table changes). Then,
 *    with the ball still held, it tries each candidate delay on a copy of the world (E.clone steps exactly as the
 *    game will), one try a step, and lets go the moment one makes the shot - so it really hits the crater and the
 *    loops, not just roughly. At most a dozen tries; none good, it takes the measured delay anyway.
 * Wave 3 (5 Nov 2026): THE one goal (W.next.shot, from goals.js or descent.js) comes first from a cradle when this
 * flipper has aim for it; anything lit at the crater (ERUPT, LOCK, MODE, DIVE, the super jackpot) and the multiball's
 * jackpots come next; in a multiball (3 or 4 balls) it flips whichever ball comes down and cradles only while one ball
 * is free; a table it has no AIM for brings its own (T.aim, the same shape).
 * Plain ES5. In node: require('./pilot.js') (it loads engine.js itself). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./engine.js'));
  else root.PinPilot = factory(root.PinEngine);
})(typeof self !== 'undefined' ? self : this, function (E) {
  'use strict';
  if (!E) return null;
  // for each table and speed: steps of plunger hold for top lanes 0-2, and for each flipper (by index) the steps from
  // letting a cradled ball go to the flip that makes each shot. Ember Peak: tools/pinball/page-pilot-aim.cjs, 29 Oct
  // 2026, the one-screen table (crabs off the table, lava measured up), re-measured unchanged 5 Nov 2026 after the wave 3
  // table changes; the old table: tools/pinball/fx-aim.cjs, 15 Oct 2026. A table not listed here brings its own (T.aim).
  var AIM = {
    ember: {
      1: { lane: [40, 34, 29], F: [{ drop: 35, crater: 16, ramp: 26, orbit: 40 }, { lava: 37, drop: 16, ramp: 23, geyser: 27, orbit: 40 }] },
      2: { lane: [40, 34, 29], F: [{ orbit: 36, ramp: 22, drop: 31, lava: 34 }, { drop: 14, crater: 27, lava: 34, orbit: 36 }] },
      3: { lane: [40, 34, 29], F: [{ crater: 13, drop: 29, lava: 30, orbit: 32, ramp: 34 }, { drop: 13, ramp: 19, lava: 30, orbit: 32 }] }
    },
    orbit: {
      1: { lane: [38, 34, 29], F: [{ ramp: 21, orbit: 40, hangar: 16, drop: 16 }, { orbit: 40, hangar: 32, drop: 33 }] },
      2: { lane: [38, 34, 30], F: [{ orbit: 36, hangar: 14, drop: 14 }, { ramp: 25, orbit: 36, hangar: 31, drop: 32 }] },
      3: { lane: [38, 34, 30], F: [{ ramp: 22, orbit: 32, hangar: 13, drop: 13 }, { ramp: 24, orbit: 32, hangar: 27, drop: 28 }] }
    }
  };
  var NOSH = { x0: 1e9, tip: -1e9 };   // (a level with no shooter lane)
  var LOOK = 0.042;   // seconds of look-ahead: the flipper is about 25 ms from rest to up, plus a little
  var PRESS = 15;     // steps a flip is held
  var TRIES = 46;     // at most this many tries on a copy of the world for one cradled shot (one a step)

  function hash(a, b, c) {   // 0..1 from three whole numbers
    var h = Math.imul((a | 0) + 0x9e37, 374761393) ^ Math.imul((b | 0) + 7, 668265263) ^ Math.imul((c | 0) + 3, 1274126177);
    h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  function tableOf(W) { return E.table ? E.table(W.tableId).T : E.TABLE; }
  function aimOf(W) { var A = AIM[W.tableId] || tableOf(W).aim || AIM.orbit; return A[W.speed] || A[1] || A[2]; }   // (a new table brings its own: T.aim)
  // W.next.shot (goals.js) -> the aim key that makes it
  var NEXT = { crater: 'crater', ramp: 'ramp', orbitL: 'orbit', orbitR: 'orbit', loop: 'orbit', lavaL: 'lava', lavaR: 'lava', drops: 'drop', geyser: 'geyser', crabs: 'crab',
    scoop: 'crater', vents: 'vents', core: 'crab', lane: 'lava' };   // (the chamber: reached() reports its toys' engine names; integrate, levels lane's request)
  function freeBalls(W, SH) { var n = 0; for (var i = 0; i < W.balls.length; i++) { var b = W.balls[i]; if (b.m === 'free' && b.x < SH.x0) n++; } return n; }

  // the pilot's memory for each world (a WeakMap where there is one); a new game in the same world object starts afresh
  var MEM = typeof WeakMap === 'function' ? new WeakMap() : null, memAny = null;
  function fresh() { return { frame: -1, ball: 0, sides: [side0(), side0()], plWait: -1, plHold: 0, plGoal: 0, shots: 0, tries: 0, hits: 0 }; }
  function side0() { return { mode: 'idle', n: 0, settle: 0, delay: -1, cool: 0, target: '', away: 0, fi: -1, cand: null, ci: 0, list: null, res: null }; }
  function mem(W) {
    var m = MEM ? MEM.get(W) : memAny && memAny.W === W ? memAny.m : null;
    if (!m || W.frame < m.frame || W.ball < m.ball) { m = fresh(); if (MEM) MEM.set(W, m); else memAny = { W: W, m: m }; }
    m.frame = W.frame; m.ball = W.ball;
    return m;
  }

  // where a ball is relative to a flipper at rest: t along it (0 pivot, 1 tip), h its gap above the rubber, vin its
  // speed in towards the flipper
  function rel(f, b, BR) {
    var ux = Math.cos(f.rest), uy = Math.sin(f.rest), nx = uy, ny = -ux;
    if (ny > 0) { nx = -nx; ny = -ny; }
    var dx = b.x - f.x, dy = b.y - f.y, t = (dx * ux + dy * uy) / f.len, tc = t < 0 ? 0 : t > 1 ? 1 : t;
    var r = f.r0 + (f.r1 - f.r0) * tc;
    return { t: t, h: dx * nx + dy * ny - BR - r, vin: -(b.vx * nx + b.vy * ny), sp: Math.sqrt(b.vx * b.vx + b.vy * b.vy) };
  }
  function nearest(W, T, f) {   // the free ball over this flipper (the lowest, if more than one)
    var best = null, br = null, BR = T.BALL, SH = T.shooter || NOSH, reach = Math.max(70, f.len * 2.75);
    for (var i = 0; i < W.balls.length; i++) {
      var b = W.balls[i];
      if (b.m !== 'free' || b.x > SH.x0) continue;
      var r = rel(f, b, BR);
      if (r.t < -0.3 || r.t > 1.15 || r.h < -BR - 4 || r.h > reach) continue;
      if (!best || b.y > best.y) { best = b; br = r; }
    }
    return best ? { b: best, r: br } : null;
  }
  // of this side's flippers, the one a ball is most pressingly over (the smallest gap)
  function watch(W, T, side) {
    var best = null;
    for (var i = 0; i < W.flippers.length; i++) {
      var f = W.flippers[i];
      if ((f.side < 0 ? 0 : 1) !== side) continue;
      var n = nearest(W, T, f);
      if (n && (!best || n.r.h < best.n.r.h)) best = { fi: i, f: f, n: n };
    }
    return best;
  }

  // ---------------------------------------------------------------- which shot to take from a cradle
  function wants(W, m, fi) {
    var T = tableOf(W), f = T.flippers[fi], A = aimOf(W).F[fi] || {}, list = [], k = m.shots + Math.floor(hash(W.frame, W.score, fi) * 3);
    var Tt = W.toys || {}, V = Tt.volcano, L = Tt.lava, G = Tt.geyser;
    if (W.tableId === 'orbit' || !T.storeys) {
      if (W.saucerLit) list.push('hangar');
      if (W.comboT > 0) list.push('ramp');
      if (W.orbitFrom) list.push('orbit');
      list.push(['ramp', 'orbit', 'drop', 'ramp', 'hangar', 'orbit'][k % 6], 'ramp', 'orbit', 'drop');
    } else if ((f.storey || 0) > 0) {   // the summit: the crater above all (pressure; full, the eruption)
      if (L && L.open) list.push('lava');
      if (V && !V.busy) list.push('crater');
      if (G && G.st === 'ready' && k % 4 === 3) list.unshift('geyser');
      list.push('crater', 'lava', 'geyser');
    } else {   // Ember Peak's one pair: the crater when anything is lit there (ERUPT, LOCK, MODE, DIVE, the super jackpot),
      // the multiball's jackpots, the open lava lanes, loops; else a round of the ramp, orbits, targets, the crater and the geyser
      var Cr = W.crater, M = W.mb;
      if (V && !V.busy && Cr && Cr.lit && Cr.lit.length && !Cr.sealed) list.push('crater');
      else if (V && !V.busy && !Cr && V.ready) list.push('crater');
      if (M && M.jp) { if (M.jp.lavaL || M.jp.lavaR) list.push('lava'); if (M.jp.ramp) list.push('ramp'); }
      if (L && L.open) list.push('lava');
      if (W.orbitFrom) list.push('orbit');
      if (W.comboT > 0) list.push('ramp');
      var rota = ['ramp', 'orbit', 'drop', 'crater', 'orbit', 'ramp', 'drop', 'geyser'], pick = rota[k % 8];
      if (pick === 'drop' && W.dropsDown >= (W.drops || []).length) pick = 'orbit';
      if (pick === 'geyser' && !(G && G.st === 'ready')) pick = 'crater';
      list.push(pick, 'orbit', 'ramp', 'drop', 'crater');
    }
    // THE one goal (W.next, from goals.js on the surface or descent.js below): first, when this flipper has aim for it
    var nx = W.next && W.next.shot ? NEXT[W.next.shot] || W.next.shot : null;
    if (nx && A[nx] >= 1) list.unshift(nx);
    var out = [], seen = {};
    for (var i = 0; i < list.length; i++) {
      var t = list[i];
      if (t === 'hangar' && !W.saucerLit && W.dropsDown < (W.drops || []).length) t = 'drop';
      if (seen[t]) continue;
      seen[t] = true; out.push({ target: t, delay: A[t] >= 1 ? A[t] : -1 });
    }
    return out;
  }
  // what a step's events say the ball reached first
  function reached(ev) {
    for (var k = 0; k < ev.length; k++) {
      var e = ev[k], n = typeof e === 'string' ? e : e && e.sfx;
      if (n === 'ramp' || n === 'combo') return 'ramp';
      if (n === 'rampfail') return 'rollback';
      if (n === 'crater') return 'crater';
      if (n === 'lava') return 'lava';
      if (n === 'puff') return 'geyser';
      if (n === 'saucer' || n === 'jackpot') return 'hangar';
      if (n === 'drop') return 'drop';
      if (n === 'crab') return 'crab';
      if (n === 'orbit' || n === 'loop') return 'orbit';
      if (n === 'drain') return 'drain';
    }
    return null;
  }
  // a try on a copy of the world: let this side go now, flip `d` steps later; what does it reach first?
  function trial(W, side, d) {
    if (!E.clone) return null;
    var C = E.clone(W), key = side ? 'right' : 'left', res = null, end = d + PRESS + 45;
    for (var n = 0; n < end && !res; n++) {
      var inp = {}; inp[key] = n >= d && n < d + PRESS;
      E.step(C, inp);
      res = reached(C.events); C.events.length = 0;
      if (!res && !C.balls.length) res = 'drain';
      if (C.over) break;
    }
    return res;
  }
  function candidates(list, most) {   // the measured delays first (a step or two either side), then every other delay
    var out = [], seen = {};
    function put(d) { if (d >= 1 && d <= 46 && !seen[d]) { seen[d] = true; out.push(d); } }
    [0, -1, 1, -2, 2, 3].forEach(function (o) { list.forEach(function (w, i) { if (i < 3 && w.delay >= 1) put(w.delay + o); }); });
    for (var d = 1; d <= 46; d++) put(d);
    return out.slice(0, most);
  }
  function choose(list, res) {   // the most wanted shot that a try made, or null
    for (var i = 0; i < list.length; i++) if (res[list[i].target]) return { target: list[i].target, delay: res[list[i].target] };
    return null;
  }

  function flipSide(W, m, side, T, opt) {
    var s = m.sides[side], w = watch(W, T, side), near = null;
    if (s.fi >= 0 && s.mode !== 'idle') { var f0 = W.flippers[s.fi]; near = f0 ? nearest(W, T, f0) : null; }
    else if (w) near = w.n;
    if (s.cool > 0) s.cool--;
    switch (s.mode) {
      case 'flip':
        if (--s.n <= 0) { s.mode = 'idle'; s.cool = 8; s.fi = -1; }
        return true;
      case 'cradle':
      case 'aim':
        s.n++;
        if (!near || near.r.h > 60) { if (++s.away > 24) { s.mode = 'idle'; s.cool = 4; s.fi = -1; return false; } }
        else s.away = 0;
        if (s.mode === 'cradle') {
          if (near && near.r.h < 6 && near.r.sp < 30) s.settle++; else s.settle = 0;
          if (s.settle < 24 && s.n <= 360) return true;
          var list = wants(W, m, s.fi);
          m.shots++;
          s.list = list; s.res = {}; s.ci = 0;
          var guess = null;
          for (var g = 0; g < list.length && !guess; g++) if (list[g].delay >= 1) guess = list[g];
          s.target = guess ? guess.target : ''; s.delay = guess ? guess.delay : 18;
          if (s.n > 360) { s.mode = 'release'; s.n = 0; return false; }
          s.cand = opt.look === false ? [] : candidates(list, opt.tries || TRIES); s.mode = 'aim';
        }
        // aim: one try a step on a copy of the world, the ball still held. The most wanted shot made: taken at once;
        // otherwise, when the tries are used up, the most wanted shot any try made (or the measured delay)
        if (s.ci < s.cand.length && near && near.r.sp < 30) {
          var d = s.cand[s.ci++], got = trial(W, side, d);
          m.tries++;
          if (got && !s.res[got]) s.res[got] = d;
          if (got && got === s.list[0].target) { m.hits++; s.target = got; s.delay = d; s.mode = 'release'; s.n = 0; return false; }
          if (s.ci < s.cand.length) return true;
        }
        var best = choose(s.list, s.res || {});
        if (best) { m.hits++; s.target = best.target; s.delay = best.delay; }
        s.mode = 'release'; s.n = 0;
        return false;
      case 'release':
        if (++s.n >= s.delay) { s.mode = 'flip'; s.n = PRESS - 1; return true; }
        return false;
    }
    // idle: is a ball coming on to one of this side's flippers?
    if (!w || s.cool > 0 || W.tilted) return false;
    var r = w.n.r;
    // a slow ball over the flipper: catch it (most of the time) and line up a shot (one cradle at a time)
    var other = m.sides[1 - side].mode;
    // (a slow ball over the flipper, or one coming down the inlane on to its pivot end: held up, it rolls into the crook)
    var slow = r.h < 46 && r.sp < 330 && r.t > -0.2 && r.t < 1, inl = r.h < (opt.inH || 40) && r.t > -0.45 && r.t < (opt.inT || 0.3) && r.sp < (opt.inV || 900);
    // (in a multiball - 3 or 4 balls - it cradles only while this is the one free ball: the others held, on the ramp
    // or a carry, or waiting in the shooter lane; otherwise it just keeps flipping whichever ball comes down)
    if ((slow || (opt.inlane !== false && inl)) && hash(W.ball * 131 + m.shots, w.n.b.id, side) < (opt.catchP || 0.85) && !/cradle|aim|release/.test(other) && freeBalls(W, T.shooter || { x0: 1e9 }) === 1) {
      s.mode = 'cradle'; s.n = 0; s.settle = 0; s.away = 0; s.fi = w.fi;
      return true;
    }
    // coming down at it: flip a moment before it lands
    var tGo = 0.08 + 0.5 * hash(W.frame >> 4, w.n.b.id, side + 9);   // where along a rolling ball is hit: varies the shot
    if ((r.vin > 30 && r.h < 3 + r.vin * LOOK && r.t > 0.05 && r.t < 1.06) || (r.h < 4 && r.t > Math.max(0.3, tGo) && r.t < 1.06)) {
      s.mode = 'flip'; s.n = 10 + Math.floor(hash(W.frame, side, 5) * 8); s.fi = w.fi;
      return true;
    }
    return false;
  }

  function waiting(W, T) {   // a ball sitting on the plunger, ready to go
    var SH = T.shooter || NOSH, BR = T.BALL;
    for (var i = 0; i < W.balls.length; i++) {
      var b = W.balls[i];
      if (b.m === 'free' && b.x > SH.x0 && b.y > SH.tip - BR - 8 && Math.abs(b.vx) + Math.abs(b.vy) < 40) return true;
    }
    return false;
  }

  // opt.look: false skips the tries on a copy of the world (cheaper; the measured delays only)
  function input(W, opt) {
    var inp = { left: false, right: false, fire: false };
    if (!W || W.over || W.state !== 'play') return inp;
    opt = opt || {};
    var m = mem(W), T = tableOf(W);
    inp.left = flipSide(W, m, 0, T, opt);
    inp.right = flipSide(W, m, 1, T, opt);
    // the plunger: look at it for a moment, pull for the chosen number of steps, let go
    if (m.plHold > 0) { m.plHold--; inp.fire = m.plHold > 0; return inp; }
    if (waiting(W, T) && W.autoT === 0) {
      if (m.plWait < 0) {
        m.plWait = 30 + Math.floor(hash(W.ball, W.score, 77) * 40);
        var A = aimOf(W), roll = hash(W.ball, W.frame, 3);
        m.plGoal = W.skillOpen && W.skill >= 0 && roll < 0.75 ? A.lane[W.skill] : roll < 0.9 ? 54 : 46;
      }
      if (--m.plWait <= 0) { m.plWait = -1; m.plHold = m.plGoal; inp.fire = true; }
    } else m.plWait = -1;
    return inp;
  }
  // what the pilot is doing on each side (for the camera and the tests): 'idle' | 'flip' | 'cradle' | 'aim' | 'release'
  function state(W) { var m = W && (MEM ? MEM.get(W) : memAny && memAny.W === W ? memAny.m : null); return m ? { left: m.sides[0].mode, right: m.sides[1].mode, target: m.sides[0].target || m.sides[1].target, tries: m.tries, hits: m.hits } : null; }

  return { input: input, state: state, AIM: AIM, version: 2 };
});
