/* 365 Pinball Hero - the demo pilot (15 Oct 2026, milestone 2a): a bot that plays the table for the title screen's
 * attract mode (demo.js) and for film captures. PinPilot.input(W) -> the buttons for this step ({ left, right, fire }),
 * worked out from the world alone - no Math.random - so the same world played from the start always plays out the same.
 *
 * How it plays, at the game's own 60 steps a second like a person:
 *  - the plunger: it waits a moment, then holds the plunger for the number of steps that drops the ball into the lit
 *    skill-shot lane (or now and then a full pull round the arch) and lets go;
 *  - a ball coming down on to a flipper is flipped a moment before it lands (a look-ahead from its speed);
 *  - a slow ball is often caught instead: the flipper is held up, the ball rolls into the crook and settles (a cradle),
 *    then the pilot picks a shot - the lit hangar, the ramp when a combo is running, an orbit for a LOOP, otherwise
 *    by turns - lets go and flips again after that shot's delay. The delays (AIM) come from tools/pinball/fx-aim.cjs,
 *    measured on the real engine; re-run it if the table changes.
 * Plain ES5. In node: require('./pilot.js') (it loads engine.js itself). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./engine.js'));
  else root.PinPilot = factory(root.PinEngine);
})(typeof self !== 'undefined' ? self : this, function (E) {
  'use strict';
  if (!E) return null;
  var T = E.TABLE, SH = T.shooter, BR = E.BALL;
  // steps of plunger hold for top lanes 0-2, and steps from letting a cradled ball go to the flip that makes each shot
  // (-1: no clean shot from that flipper at that speed). From tools/pinball/fx-aim.cjs, 15 Oct 2026.
  var AIM = {
    1: { lane: [38, 34, 29], L: { ramp: 21, orbit: 40, hangar: 16, drop: 16 }, R: { ramp: -1, orbit: 40, hangar: 32, drop: 33 } },
    2: { lane: [38, 34, 30], L: { ramp: -1, orbit: 36, hangar: 14, drop: 14 }, R: { ramp: 25, orbit: 36, hangar: 31, drop: 32 } },
    3: { lane: [38, 34, 30], L: { ramp: 22, orbit: 32, hangar: 13, drop: 13 }, R: { ramp: 24, orbit: 32, hangar: 27, drop: 28 } }
  };
  var LOOK = 0.042;   // seconds of look-ahead: the flipper is about 25 ms from rest to up, plus a little

  function hash(a, b, c) {   // 0..1 from three whole numbers
    var h = Math.imul((a | 0) + 0x9e37, 374761393) ^ Math.imul((b | 0) + 7, 668265263) ^ Math.imul((c | 0) + 3, 1274126177);
    h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }

  // the pilot's memory for each world (a WeakMap where there is one); a new game in the same world object starts afresh
  var MEM = typeof WeakMap === 'function' ? new WeakMap() : null, memAny = null;
  function fresh() { return { frame: -1, ball: 0, sides: [side0(), side0()], plWait: -1, plHold: 0, plGoal: 0, shots: 0 }; }
  function side0() { return { mode: 'idle', n: 0, settle: 0, delay: -1, cool: 0, target: '', away: 0 }; }
  function mem(W) {
    var m = MEM ? MEM.get(W) : memAny && memAny.W === W ? memAny.m : null;
    if (!m || W.frame < m.frame || W.ball < m.ball) { m = fresh(); if (MEM) MEM.set(W, m); else memAny = { W: W, m: m }; }
    m.frame = W.frame; m.ball = W.ball;
    return m;
  }

  // where a ball is relative to a flipper at rest: t along it (0 pivot, 1 tip), h its gap above the rubber, vin its
  // speed in towards the flipper
  function rel(f, b) {
    var ux = Math.cos(f.rest), uy = Math.sin(f.rest), nx = uy, ny = -ux;
    if (ny > 0) { nx = -nx; ny = -ny; }
    var dx = b.x - f.x, dy = b.y - f.y, t = (dx * ux + dy * uy) / f.len, tc = t < 0 ? 0 : t > 1 ? 1 : t;
    var r = f.r0 + (f.r1 - f.r0) * tc;
    return { t: t, h: dx * nx + dy * ny - BR - r, vin: -(b.vx * nx + b.vy * ny), sp: Math.sqrt(b.vx * b.vx + b.vy * b.vy) };
  }
  function nearest(W, f) {   // the free ball over this flipper (the lowest, if more than one)
    var best = null, br = null;
    for (var i = 0; i < W.balls.length; i++) {
      var b = W.balls[i];
      if (b.m !== 'free' || b.x > SH.x0) continue;
      var r = rel(f, b);
      if (r.t < -0.3 || r.t > 1.15 || r.h < -BR - 4 || r.h > 110) continue;
      if (!best || b.y > best.y) { best = b; br = r; }
    }
    return best ? { b: best, r: br } : null;
  }

  // which shot to take from a cradle on this side
  function pick(W, m, side) {
    var A = (AIM[W.speed] || AIM[1])[side ? 'R' : 'L'], want = [];
    if (W.saucerLit) want.push('hangar');
    if (W.comboT > 0) want.push('ramp');
    if (W.orbitFrom) want.push('orbit');
    var rota = ['ramp', 'orbit', 'drop', 'ramp', 'hangar', 'orbit'];
    want.push(rota[(m.shots + Math.floor(hash(W.frame, W.score, side) * 3)) % rota.length]);
    want.push('ramp', 'orbit', 'drop');
    for (var i = 0; i < want.length; i++) {
      var k = want[i] === 'hangar' && !W.saucerLit && W.dropsDown < 5 ? 'drop' : want[i];
      if (A[k] >= 0) return { target: k, delay: A[k] };
    }
    return { target: '', delay: 24 };
  }

  function flipSide(W, m, side) {
    var f = W.flippers[side], s = m.sides[side], near = nearest(W, f);
    if (s.cool > 0) s.cool--;
    switch (s.mode) {
      case 'flip':
        if (--s.n <= 0) { s.mode = 'idle'; s.cool = 8; }
        return true;
      case 'cradle':
        s.n++;
        if (!near || near.r.h > 60) { if (++s.away > 24) { s.mode = 'idle'; s.cool = 4; return false; } }
        else s.away = 0;
        if (near && near.r.h < 6 && near.r.sp < 30) s.settle++; else s.settle = 0;
        if (s.settle >= 24 || s.n > 360) {
          var p = pick(W, m, side);
          m.shots++; s.target = p.target; s.delay = s.n > 360 ? 18 : p.delay;
          s.mode = 'release'; s.n = 0;
          return false;
        }
        return true;
      case 'release':
        if (++s.n >= s.delay) { s.mode = 'flip'; s.n = 14; return true; }
        return false;
    }
    // idle: is a ball coming on to this flipper?
    if (!near || s.cool > 0 || W.tilted) return false;
    var r = near.r;
    // a slow ball over the flipper: catch it (most of the time) and line up a shot
    if (r.h < 46 && r.sp < 330 && r.t > -0.2 && r.t < 1 && hash(W.ball * 131 + m.shots, near.b.id, side) < 0.7 && !m.sides[1 - side].mode.match(/cradle|release/)) {
      s.mode = 'cradle'; s.n = 0; s.settle = 0; s.away = 0;
      return true;
    }
    // coming down at it: flip a moment before it lands
    var tGo = 0.08 + 0.5 * hash(W.frame >> 4, near.b.id, side + 9);   // where along a rolling ball is hit: varies the shot
    if ((r.vin > 30 && r.h < 3 + r.vin * LOOK && r.t > 0.05 && r.t < 1.06) || (r.h < 4 && r.t > Math.max(0.3, tGo) && r.t < 1.06)) {
      s.mode = 'flip'; s.n = 10 + Math.floor(hash(W.frame, side, 5) * 8);
      return true;
    }
    return false;
  }

  function waiting(W) {   // a ball sitting on the plunger, ready to go
    for (var i = 0; i < W.balls.length; i++) {
      var b = W.balls[i];
      if (b.m === 'free' && b.x > SH.x0 && b.y > SH.tip - BR - 8 && Math.abs(b.vx) + Math.abs(b.vy) < 40) return true;
    }
    return false;
  }

  function input(W) {
    var inp = { left: false, right: false, fire: false };
    if (!W || W.over || W.state !== 'play') return inp;
    var m = mem(W);
    inp.left = flipSide(W, m, 0);
    inp.right = flipSide(W, m, 1);
    // the plunger: look at it for a moment, pull for the chosen number of steps, let go
    if (m.plHold > 0) { m.plHold--; inp.fire = m.plHold > 0; return inp; }
    if (waiting(W) && W.autoT === 0) {
      if (m.plWait < 0) {
        m.plWait = 30 + Math.floor(hash(W.ball, W.score, 77) * 40);
        var A = AIM[W.speed] || AIM[1], roll = hash(W.ball, W.frame, 3);
        m.plGoal = W.skillOpen && W.skill >= 0 && roll < 0.75 ? A.lane[W.skill] : roll < 0.9 ? 54 : 46;
      }
      if (--m.plWait <= 0) { m.plWait = -1; m.plHold = m.plGoal; inp.fire = true; }
    } else m.plWait = -1;
    return inp;
  }

  return { input: input, AIM: AIM, version: 1 };
});
