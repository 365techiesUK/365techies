/* 365 Invaders - the PILOT (9 Oct 2026): a player made of code, for the demo that plays on the title screen and films
 * the game, and for the playtest farm that balances it (hundreds of games on the Threadripper's cores). It only reads the
 * world and presses the same keys a player does: left, right, fire.
 *
 * Each step it scores every place the ship could stand: a big minus where a bomb, a diver or a little one would get it
 * on the way there (it plans the move itself, at the ship's real speed), plus whatever it could hit from there (shots
 * aimed ahead of moving targets), plus a capsule it could catch. It goes to the best place and fires when a shot would
 * hit something - not through its own shields.
 * skill 0..1: 1 plays well (the demo); lower re-thinks less often, sees danger later, aims worse, sometimes ignores a
 * bomb, fires through its shields and wastes shots - roughly a beginner at 0.2, a steady player at 0.5.
 *   var p = InvPilot.create(InvEngine, { skill: 0.5, seed: 7 }); ... E.step(W, p.step(W)); */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.InvPilot = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  function rngOf(seed) {   // its own dice (mulberry32), so a farm game replays exactly from its seeds
    var a = seed >>> 0;
    return function () { a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function create(E, opt) {
    opt = opt || {};
    var skill = clamp(opt.skill == null ? 1 : opt.skill, 0, 1), rnd = rngOf(opt.seed == null ? 1 : opt.seed);
    var PY = E.PY, LO = 8, HI = 216 - 13, SY = E.SHIELD_Y, SH = 16;
    var react = Math.round(lerp(10, 1, skill));      // steps between re-thinks
    var lastWx = new WeakMap();                      // each invader's weave when last looked at
    var horizon = lerp(16, 80, skill);               // how far ahead (steps) it sees a bomb coming
    var blind = lerp(0.3, 0, skill);                 // chance a re-think overlooks a bomb
    var noise = lerp(6, 0, skill);                   // aim error, game pixels
    var careful = skill >= 0.45;                     // won't shoot through its own shields, won't waste shots
    var N = Math.floor((HI - LO) / 2) + 1, hz = new Float32Array(N), val = new Float32Array(N);
    var tx = null, wait = 0, aim = 0, risk = 0;

    function shieldAbove(cx) { return !!E.shieldAt(W0, cx, SY, 1, SH); }
    var W0 = null;
    function shipAt(c, t) {   // where the ship is t steps into a straight move to c at full speed
      var x = W0.player.x, d = c - x, s = W0.sp.ship * Math.max(0, t);
      return Math.abs(d) <= s ? c : x + (d > 0 ? s : -s);
    }
    function arrivalHazard(ax, aw, t0, t1, wt) {   // something in the ship's row at x ax..ax+aw from step t0 to t1: mark the plans that meet it
      if (t1 < 0 || t0 > horizon) return;
      for (var i = 0; i < N; i++) {
        var c = LO + i * 2, a = shipAt(c, t0), b = shipAt(c, t1), lo = Math.min(a, b), hi = Math.max(a, b);   // (a straight move: it sweeps lo..hi meanwhile)
        if (ax + aw > lo + 0.5 && ax < hi + 12.5) hz[i] += wt * (1 + 8 / (Math.max(0, t0) + 2));
      }
    }
    function think(W) {
      W0 = W;
      var P = W.player, sp = W.sp, f = W.slow > 0 ? 0.5 : 1, i, c;
      for (i = 0; i < N; i++) { hz[i] = 0; val[i] = 0; }
      // ---- danger: bombs (not the ones a shield will stop), diving invaders, the little ones
      var bv = sp.bomb * f;
      for (var b = 0; b < W.bombs.length; b++) {
        var B = W.bombs[b];
        if (rnd() < blind) continue;
        if (B.y + 7 < SY + SH && E.shieldAt(W, B.x, Math.max(B.y + 4, SY), 3, SY + SH - Math.max(B.y + 4, SY))) continue;   // a shield is in its way
        var t = (PY - (B.y + 7)) / bv, t1 = (PY + 8 - B.y) / bv, ax = B.x + (B.dx || 0) * f * Math.max(0, t);   // from touching the ship's top to passing its bottom
        arrivalHazard(ax - 1, 5, t, t1, 400);
      }
      (W.invaders || []).forEach(function (v) {
        var d = v.dv; if (!v.alive || !d || d.ph !== 'dive' || d.y < 90) return;
        var t = (PY - (d.y + 8)) / Math.max(0.6, d.vy * f);
        if (t > 26) return;   // (it steers at the ship: shoot it while it's up there, side-step at the last moment)
        arrivalHazard(d.x + d.vx * f * Math.max(0, t) - 6, 24, t - 4, t + 16 / Math.max(0.6, d.vy * f), 300);   // (it steers at the ship: a wide berth)
      });
      // the Mothership's death beam (11 Oct 2026): charging, it shows where it will start and which way it will sweep
      var Bo0 = W.boss, Ry = Bo0 && !Bo0.dead && Bo0.ray;
      if (Ry && rnd() >= blind * 0.5) {
        var tStart = Ry.st === 'charge' ? (Ry.n - Ry.t) / f : 0, left = Ry.st === 'charge' ? 120 : Ry.n - Ry.t, bx0 = Bo0.x + Bo0.w / 2;
        for (var kk = 0; kk <= left; kk += 8) {
          var rxk = Math.max(LO, Math.min(HI + 6, bx0 + Ry.dir * 0.6 * kk));
          arrivalHazard(rxk - 9, 18, tStart + kk / f - 6, tStart + (kk + 12) / f, 600);
        }
      }
      (W.minis || []).forEach(function (m) {
        if (m.y < 120) return;
        var t = (PY - (m.y + 5)) / Math.max(0.6, m.vy * f);
        if (t > 18) return;
        arrivalHazard(m.x + m.vx * f * Math.max(0, t) - 5, 16, t - 4, t + 14 / Math.max(0.6, m.vy * f), 250);
      });
      // ---- what it could hit from each place (the shot leads a moving target)
      var shotV = W.power && W.power.kind === 'rapid' ? 6 : 4;
      function addTarget(x0, x1, worth) { for (var k = Math.max(0, Math.ceil((x0 - 6 - LO) / 2)); k < N; k++) { var cx = LO + k * 2 + 6; if (cx >= x1) break; if (cx >= x0 && worth > val[k]) val[k] = worth; } }
      var alive = 0; (W.invaders || []).forEach(function (v) { if (v.alive && !v.dv) alive++; });
      var march = alive ? 2 * W.dir * sp.rate * f / alive : 0;   // how fast one invader drifts sideways (px a step)
      var lowest = {};   // in each column, the one a shot meets first
      function weaveVx(v) {   // how fast its weave is moving it (seen between re-thinks)
        var w = v.wx || 0, e = lastWx.get(v); lastWx.set(v, { w: w, t: W.frame });
        return e && W.frame > e.t ? (w - e.w) / (W.frame - e.t) : 0;
      }
      (W.invaders || []).forEach(function (v) {
        if (!v.alive || (E.phased && E.phased(W, v))) return;   // (a faded phantom: shots go through it to the one behind)
        var bx = E.box(v);
        if (v.dv) {
          var T = (PY - 4 - (bx.y + 8)) / (shotV + Math.max(0, v.dv.vy * f)), lx = bx.x + (v.dv.vx || 0) * f * T;
          if (bx.y > 30 && bx.y < PY - 12) addTarget(lx, lx + bx.w, lerp(22, 60, skill) + bx.y / 4);   // a diver: worth double (a good player goes for it; most keep at the formation)
          return;
        }
        if (!lowest[v.c] || v.y > lowest[v.c].y) lowest[v.c] = v;
      });
      Object.keys(lowest).forEach(function (k) {
        var v = lowest[k], bx = E.box(v), T = (PY - 4 - (bx.y + 8)) / shotV, lx = bx.x + (march + weaveVx(v)) * T;   // (and where its weave is taking it)
        addTarget(lx, lx + bx.w, 20 + bx.y / 8 + Math.max(0, bx.y - 140) * 0.6 + (v.split ? 6 : 0) - (v.armor ? 3 : 0));   // (the low ones first as they get near the ground)
      });
      (W.minis || []).forEach(function (m) {
        var T = (PY - 4 - (m.y + 5)) / (shotV + Math.max(0, m.vy * f)), lx = m.x + m.vx * f * T;
        if (m.y > 40) addTarget(lx, lx + E.MINI_W, 55 + m.y / 4);
      });
      if (W.saucer) { var U = W.saucer, Tu = (PY - 4 - (E.SAUCER_Y + 7)) / shotV, ux = U.x + U.dir * sp.saucer * f * Tu; if (ux > 4 && ux < 204) addTarget(ux + 2, ux + 14, 34); }
      var Bo = W.boss;
      if (Bo && !Bo.dead && !W.intro) {
        var Tb = (PY - 4 - (Bo.y + Bo.h)) / shotV, spd = sp.bossSpeed * (Bo.phase === 3 ? 1.5 : Bo.phase === 2 ? 1.1 : 1) * f;
        var fx0 = Bo.x + Bo.dir * spd * Tb, bounce = fx0 < 8 ? 8 - fx0 : fx0 > 216 - Bo.w ? (216 - Bo.w) - fx0 : 0;
        fx0 += 2 * bounce;   // it turns at the edges
        if (Bo.L) {   // the three-stage Mothership: guns first, then the core
          if (Bo.L.hp > 0) addTarget(fx0 + 3, fx0 + (E.BOSS_GUN_L || 15) - 1, 45);
          if (Bo.R.hp > 0) addTarget(fx0 + (E.BOSS_GUN_R || 33) + 1, fx0 + Bo.w - 3, 45);
          if (Bo.L.hp <= 0 && Bo.R.hp <= 0) addTarget(fx0 + 17, fx0 + 31, 50);
        } else addTarget(fx0 + 6, fx0 + Bo.w - 6, 45);   // (the old single-target one: the farm's "before" engine)
      }
      // ---- a capsule it can get to in time (less keen on one it doesn't need)
      for (var q = 0; q < (W.caps || []).length; q++) {
        var C = W.caps[q], tc = (PY - C.y) / 0.55;
        if (tc < 0) continue;
        var want = C.kind === 'shield' && W.shieldUp ? 8 : C.kind === 'slow' && W.slow > 0 ? 8 : 40 * lerp(0.4, 1, skill);
        for (i = 0; i < N; i++) {
          c = LO + i * 2;
          if (Math.abs(c - P.x) / sp.ship <= tc + 2 && c + 13 > C.x - 3 && c < C.x + 4) val[i] += want;
        }
      }
      // ---- the best place: worth most, safest, not too far
      var best = -1e9, bi = -1;
      for (i = 0; i < N; i++) {
        c = LO + i * 2;
        var score = val[i] - hz[i] - Math.abs(c - P.x) * 0.12 - (Math.abs(c - 104) * 0.01);
        if (careful && shieldAbove(c + 6) && !(W.power && W.power.kind === 'laser')) score -= 6;   // under a shield it can't shoot
        if (score > best) { best = score; bi = i; }
      }
      risk = hz[bi];
      aim = noise ? (rnd() * 2 - 1) * noise : 0;
      tx = LO + bi * 2 + aim;
    }
    function canHit(W) {   // would a shot from here hit something? (same reckoning as think, for the ship where it is)
      var i = clamp(Math.round((W.player.x - LO) / 2), 0, N - 1);
      return val[i] > 0;
    }
    return {
      skill: skill,
      step: function (W) {
        var P = W.player, out = { left: false, right: false, fire: false };
        if (P.dead || W.over) { tx = null; return out; }
        if (--wait <= 0 || tx == null) { think(W); wait = react; }
        else if (skill >= 0.75) {   // a good player keeps an eye out between thoughts
          W0 = W;
          for (var b = 0; b < W.bombs.length; b++) { var B = W.bombs[b]; if (B.y > PY - 30 && B.x + 4 > P.x - 1 && B.x - 1 < P.x + 14) { think(W); wait = react; break; } }
        }
        var d = tx - P.x;
        if (d < -0.6) out.left = true; else if (d > 0.6) out.right = true;
        var laser = W.power && W.power.kind === 'laser';
        var aligned = canHit(W);
        if (risk > 0 && skill >= 0.6 && !laser) {   // no safe place: shoot down the bomb overhead
          var cx = Math.round(P.x + 6);
          for (var k = 0; k < W.bombs.length; k++) { var Bk = W.bombs[k]; if (cx >= Bk.x - 1 && cx <= Bk.x + 3 && Bk.y > PY - 90) { aligned = true; break; } }
        }
        if (laser) out.fire = aligned || (W.beam && skill < 1);
        else if (aligned || !careful) {
          out.fire = true;
          if (careful && E.shieldAt(W, Math.round(P.x + 6), SY, 1, SH)) out.fire = false;   // not through its own shield
          if (!careful && rnd() < 0.5) out.fire = false;
        }
        return out;
      }
    };
  }
  return { create: create };
});
