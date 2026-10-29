/* 365 Pinball Hero - the messy-human bot (16 Oct 2026, next-gen wave 2), for proving the camera's guarantee. The demo
 * pilot plays tidily (it flips 42 ms ahead and never nudges); real people don't, and note 17 asked for a bot that
 * meets the hard cases. This one, from a seed (no Math.random, so every run repeats):
 *  - flips EARLY and LATE: each time a ball comes at a flipper it picks its own look-ahead - usually 20-60 ms, a quarter
 *    of the time far too early (80-160 ms: the flipper is already up when the ball lands) and a fifth of the time late
 *    (it waits 2-6 steps after the ball is there); now and then it misses altogether;
 *  - HOLDS flippers up: most flips last 5-14 steps, some 20-60, some 1-2.5 seconds;
 *  - CRADLES: a slow ball near a flipper is often caught and held 0.7-2.5 s, then let go and shot;
 *  - CHANGES LANES: while no ball is near any flipper it taps a random flipper button about twice a second;
 *  - NUDGES: now and then at any moment, and often when a ball heads for an outlane or the drain gap (it mostly
 *    stops before a tilt, but not always);
 *  - pulls the plunger by a random amount after a random wait (and sometimes just taps it).
 * One button works every flipper on its side (however many pairs a table has). MessyBot.create(seed, opt) -> function (W) -> input.
 * In node: require('./messybot.cjs'); in a page (camera-preview.html) load it after engine.js: window.MessyBot. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('../../games/pinball/engine.js'));
  else root.MessyBot = factory(root.PinEngine);
})(typeof self !== 'undefined' ? self : this, function (E) {
  'use strict';
  function lcg(seed) {
    var s = (seed >>> 0) % 2147483647 || 1;
    return function () { s = (s * 48271) % 2147483647; return s / 2147483647; };
  }
  function segDist(px, py, ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay, t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    var qx = ax + dx * t - px, qy = ay + dy * t - py;
    return Math.sqrt(qx * qx + qy * qy);
  }
  function create(seed, opt) {
    opt = opt || {};
    var r = lcg(seed * 7919 + 17), nudgeRate = opt.nudge == null ? 1 : opt.nudge;
    function side() { return { press: 0, wait: -1, cradle: 0, after: -1, cool: 0, look: 0.04, late: false, miss: false, rolled: false }; }
    var sides = [side(), side()], pl = { wait: -1, hold: 0 }, nudgeCd = 0, laneCd = 0, upHeld = 0;
    function roll(st) {   // this approach's timing: early, late, normal, or a miss
      var x = r();
      st.late = false; st.miss = false;
      if (x < 0.05) st.miss = true;
      else if (x < 0.25) { st.late = true; st.look = 0.012; }
      else if (x < 0.5) st.look = 0.08 + r() * 0.08;
      else st.look = 0.02 + r() * 0.04;
      st.rolled = true;
    }
    function holdLen() { var x = r(); return x < 0.7 ? 5 + Math.floor(r() * 10) : x < 0.9 ? 20 + Math.floor(r() * 41) : 60 + Math.floor(r() * 91); }
    return function input(W) {
      var Bt = E.table(W.tableId), T = Bt.T, SH = T.shooter, BR = T.BALL, g = W.g, k = Math.sqrt(g / 590);
      var inp = { left: false, right: false, fire: false, up: false }, anyZone = false, danger = false;
      W.balls.forEach(function (b) {
        if (b.m !== 'free' || b.x > SH.x0) return;
        if (E.inApproach(W, b) >= 0) anyZone = true;
        // heading for an outlane or the gap between the bottom flippers
        if (b.y > 560 && b.vy > 80 && (b.x < 30 || b.x > T.W - 50 || (b.y > 625 && b.x > T.MID - 25 && b.x < T.MID + 25))) danger = true;
      });
      for (var s = 0; s < 2; s++) {
        var st = sides[s], sg = s ? 1 : -1, key = s ? 'right' : 'left';
        if (st.cool > 0) st.cool--;
        if (st.press > 0) { st.press--; inp[key] = true; continue; }
        if (st.cradle > 0) { st.cradle--; inp[key] = true; if (st.cradle === 0) st.after = 3 + Math.floor(r() * 25); continue; }
        if (st.after >= 0) { if (st.after-- === 0) { st.press = 5 + Math.floor(r() * 10); inp[key] = true; st.cool = 12; } continue; }
        if (st.wait >= 0) { if (st.wait-- === 0) { st.press = holdLen(); inp[key] = true; st.cool = 12; st.rolled = false; } continue; }
        if (st.cool > 0) continue;
        var hit = false, slow = false;
        for (var fi = 0; fi < W.flippers.length && !hit; fi++) {
          var f = W.flippers[fi];
          if (f.side !== sg) continue;
          var tx = f.x + Math.cos(f.rest) * f.len, ty = f.y + Math.sin(f.rest) * f.len, reach = f.r0 + BR + 1;
          for (var bi = 0; bi < W.balls.length && !hit; bi++) {
            var b = W.balls[bi];
            if (b.m !== 'free' || b.x > SH.x0) continue;
            var dx = b.x - f.x, dy = b.y - f.y;
            if (dx * dx + dy * dy > 120 * 120) continue;
            if (!st.rolled) roll(st);
            var sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
            if (sp < 150 * k && segDist(b.x, b.y, f.x, f.y, tx, ty) < reach + 12) slow = true;
            var n = Math.max(1, Math.ceil(st.look * 120));
            for (var j = 0; j <= n; j++) {
              var tt = j / 120, px = b.x + b.vx * tt, py = b.y + b.vy * tt + 0.5 * g * tt * tt;
              if (segDist(px, py, f.x, f.y, tx, ty) < reach) { hit = true; break; }
            }
          }
        }
        if (slow && r() < 0.012) { st.cradle = 40 + Math.floor(r() * 110); inp[key] = true; st.rolled = false; continue; }
        if (hit) {
          if (st.miss) { st.cool = 30; st.rolled = false; continue; }
          if (st.late) { st.wait = 2 + Math.floor(r() * 5); continue; }
          st.press = holdLen() - 1; inp[key] = true; st.cool = 12; st.rolled = false;
        }
      }
      // changing lanes while nothing is near a flipper
      if (laneCd > 0) laneCd--;
      if (!anyZone && laneCd === 0 && r() < 2 / 60) {
        var sd = sides[r() < 0.5 ? 0 : 1];
        if (sd.press === 0 && sd.cradle === 0) { sd.press = 3 + Math.floor(r() * 6); laneCd = 15; }
      }
      // nudges (a nudge is a press of "up"; held for a few steps)
      if (upHeld > 0) { upHeld--; inp.up = true; }
      else {
        if (nudgeCd > 0) nudgeCd--;
        var rate = (danger ? 0.9 : 0.12) * nudgeRate;
        if (nudgeCd === 0 && W.state === 'play' && r() < rate / 60 && (W.tilt < 1.9 || r() < 0.08)) { upHeld = 3 + Math.floor(r() * 4); inp.up = true; nudgeCd = 30 + Math.floor(r() * 40); }
      }
      // the plunger
      var inLane = W.balls.some(function (b) { return b.m === 'free' && b.x > SH.x0 && b.y > SH.tip - 30 && Math.abs(b.vy) < 30; });
      if (inLane && W.autoT === 0) {
        if (pl.wait < 0 && pl.hold === 0) { pl.wait = 10 + Math.floor(r() * 70); }
        if (pl.wait > 0) pl.wait--;
        else if (pl.wait === 0) { pl.hold = r() < 0.15 ? 1 + Math.floor(r() * 4) : 6 + Math.floor(r() * 50); pl.wait = -1; }
        if (pl.hold > 0) { pl.hold--; inp.fire = true; }
      } else { pl.wait = -1; pl.hold = 0; }
      return inp;
    };
  }
  return { create: create };
});
