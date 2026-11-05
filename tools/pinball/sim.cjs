/* 365 Pinball Hero - shared helpers for the table sim tools (15 Oct 2026; any table, 16 Oct 2026). Never deployed.
 * Loads the real engine (games/pinball/engine.js) in node and gives the tools what they all need: a quiet world with
 * no ball in it, a way to drop a ball anywhere, a check that a spot is free, a simple auto-flipper bot, and a watcher
 * that looks at every physics substep for a ball inside a wall, through a wall, past a one-way gate the wrong way or
 * off the table. The tools: traps.cjs (where balls get stuck), shots.cjs (what each flipper shot reaches), plunger.cjs
 * (pull -> where the launch goes), features.cjs, feel.cjs. See README.md.
 *
 * Which table: Ember Peak unless a tool is run with --orbit (or --table=<id>); code calls S.use(id). */
'use strict';
var E = require('../../games/pinball/engine.js');
var BR = E.BALL;
var S = module.exports;

// the table the tools work on: --orbit / --table=<id> on the command line (taken out of process.argv), or S.use(id)
var tableId = 'ember';
(function () {
  var a = process.argv;
  for (var i = a.length - 1; i >= 2; i--) {
    if (a[i] === '--orbit') { tableId = 'orbit'; a.splice(i, 1); }
    else if (/^--table=/.test(a[i])) { tableId = a[i].slice(8); a.splice(i, 1); }
  }
})();
function use(id) { tableId = id; S.T = E.table(id).T; S.B = E.table(id); S.tableId = id; return S.T; }
use(tableId);

function lcg(seed) {   // a tiny seeded random for the tools (the engine has its own)
  var s = (seed | 0) || 1;
  return function () { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}

// a world in play with no ball in it (no ball save, so a drain ends the run)
function world(speed, seed, opt) {
  opt = opt || {};
  var W = E.newWorld(speed || 2, 0, seed || 1, opt.table || tableId);
  W.balls.length = 0; W.saveArmed = false; W.saveT = 0; W.skillOpen = false;
  if (opt.kickback != null) W.kickback = !!opt.kickback;
  if (opt.dropsDown) { for (var i = 0; i < W.drops.length; i++) W.drops[i] = false; W.dropsDown = W.drops.length; W.saucerLit = true; W.dropsT = 99999; }
  if (opt.lava && W.toys.lava) { W.toys.lava.open = true; W.toys.lava.t = 999999; W.toys.lava.gates.forEach(function (g) { g.solid = false; g.h = 1; g.t = 999999; }); }
  // wave 3: the OBSIDIAN PLUG up (for good), something lit at the crater (its wider mouth), or a multiball on
  if (opt.plug && W.plug) { W.plug.up = true; W.plug.t = 1e9; }
  if (opt.lit && W.crater) { W.crater.mode = true; W.crater.lit = ['mode']; W.crater.wide = true; }
  if (opt.mb && W.press) E.api.multiball(W, opt.mb, { save: 0 });
  if (opt.noGeyser && W.toys.geyser) { W.toys.geyser.st = 'cool'; W.toys.geyser.t = 1e9; }
  if (opt.crabsStill && W.toys.crabs) W.toys.crabs.forEach(function (c) { c.stun = 1e9; });
  if (opt.noCrabs && W.toys.crabs) W.toys.crabs.forEach(function (c) { c.stun = 1e9; c.x = -500; c.y = -500; });
  return W;
}
function place(W, x, y, vx, vy) {
  var b = E.addBall(W, x, y);
  b.vx = vx || 0; b.vy = vy || 0; b.launched = true;
  return b;
}

// ------------------------------------------------------------ geometry checks
function segDist(px, py, ax, ay, bx, by) {
  var dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1, t = ((px - ax) * dx + (py - ay) * dy) / l2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  var qx = ax + dx * t - px, qy = ay + dy * t - py;
  return Math.sqrt(qx * qx + qy * qy);
}
function cross(ax, ay, bx, by, cx, cy, dx, dy) {   // do segments AB and CD cross (strictly)?
  var d1 = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx), d2 = (dx - cx) * (by - cy) - (dy - cy) * (bx - cx);
  var d3 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax), d4 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}
function flipperDist(f, x, y) {   // how far inside the flipper's outline a point is (+ = outside)
  var cx = Math.cos(f.a), cy = Math.sin(f.a), dx = x - f.x, dy = y - f.y, t = (dx * cx + dy * cy) / f.len;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  var qx = f.x + cx * f.len * t, qy = f.y + cy * f.len * t, rr = f.r0 + (f.r1 - f.r0) * t;
  return Math.sqrt((x - qx) * (x - qx) + (y - qy) * (y - qy)) - rr;
}
function inTri(x, y, a, b, c) {
  function s(p, q, r) { return (p[0] - r[0]) * (q[1] - r[1]) - (q[0] - r[0]) * (p[1] - r[1]); }
  var p = [x, y], d1 = s(p, a, b), d2 = s(p, b, c), d3 = s(p, c, a);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
}
function inPoly(x, y, p) {
  var inside = false;
  for (var i = 0, j = p.length - 1; i < p.length; j = i++) {
    if ((p[i][1] > y) !== (p[j][1] > y) && x < (p[j][0] - p[i][0]) * (y - p[i][1]) / (p[j][1] - p[i][1]) + p[i][0]) inside = !inside;
  }
  return inside;
}
// the deepest overlap of a ball centred at x,y with anything solid (0 = clear); what = the thing
function overlap(W, x, y, placing) {
  var Bt = E.table(W.tableId), T = Bt.T, worst = -1e9, what = '', i, d, s;
  function rec(pen, w) { if (pen > worst) { worst = pen; what = w; } }
  for (i = 0; i < Bt.WALLS.length; i++) { s = Bt.WALLS[i]; d = segDist(x, y, s.ax, s.ay, s.bx, s.by); rec(BR + s.r - d, s.kind + i); }
  for (i = 0; i < Bt.POSTS.length; i++) { s = Bt.POSTS[i]; d = Math.hypot(x - s.x, y - s.y); rec(BR + s.r - d, 'post' + i); }
  for (i = 0; i < Bt.BUMPERS.length; i++) { s = Bt.BUMPERS[i]; d = Math.hypot(x - s.x, y - s.y); rec(BR + s.r - d, 'bumper' + i); }
  for (i = 0; i < Bt.DROPS.length; i++) { if (!W.drops[i]) continue; s = Bt.DROPS[i]; d = segDist(x, y, s.ax, s.ay, s.bx, s.by); rec(BR + s.r - d, 'drop' + i); }
  if (Bt.VOLC) rec(BR + Bt.VOLC.r - Math.hypot(x - Bt.VOLC.x, y - Bt.VOLC.y), 'volcano');
  if (W.toys.crabs) W.toys.crabs.forEach(function (c, k) { rec(BR + Bt.CRABS[k].d.r - Math.hypot(x - c.x, y - c.y), 'crab' + k); });
  // one-way gates (and lava gates that are down) count only when placing a ball (a ball may pass through one way)
  for (i = 0; placing && i < Bt.GATES.length; i++) { s = Bt.GATES[i]; d = segDist(x, y, s.ax, s.ay, s.bx, s.by); rec(BR + s.r - d, 'gate' + i); }
  for (i = 0; placing && i < Bt.LAVA.length; i++) { if (!W.toys.lava.gates[i].solid) continue; s = Bt.LAVA[i]; d = segDist(x, y, s.ax, s.ay, s.bx, s.by); rec(BR + s.r - d, 'lava' + i); }
  var A = T.arch;
  if (y < A.y) rec(Math.hypot(x - A.x, y - A.y) - (A.R - A.r - BR), 'arch');
  for (i = 0; i < W.flippers.length; i++) rec(BR - flipperDist(W.flippers[i], x, y), 'flipper' + i);
  if (y < T.H) { rec(6 + 2 + BR - x, 'leftwall'); rec(x - (266 - 2 - BR), 'rightwall'); }
  return { pen: worst, what: what };
}
// is this a fair place to drop a ball for the trap finder: on the playfield, clear of everything, not in the shooter
// lane, not inside a sling or a closed space, not in the hangar while its targets are up
function freeSpot(W, x, y) {
  var Bt = E.table(W.tableId), T = Bt.T, i;
  if (y > T.H - 6 || x < 15 || x > 257) return false;
  if (x > T.shooter.x0 - 2 && y > 140) return false;
  if (y < T.arch.y && Math.hypot(x - T.arch.x, y - T.arch.y) > T.arch.R - T.arch.r - BR - 1) return false;
  for (i = 0; i < T.slings.length; i++) { var s = T.slings[i]; if (inTri(x, y, s.a, s.b, s.c)) return false; }
  for (i = 0; i < (T.voids || []).length; i++) if (inPoly(x, y, T.voids[i])) return false;
  if (W.dropsDown < W.drops.length && E.inPocket(x, y, W.tableId)) return false;
  return overlap(W, x, y, true).pen <= -0.5;
}

// ------------------------------------------------------------ the watcher: every substep, look for impossible things
function watch(W, log) {
  var Bt = E.table(W.tableId), T = Bt.T, prevDrops = W.drops.slice(), prevLava = W.toys.lava ? W.toys.lava.gates.map(function (g) { return g.solid; }) : [];
  W.onSub = function () {
    for (var k = 0; k < W.balls.length; k++) {
      var b = W.balls[k];
      if (b.m !== 'free') continue;
      if (b.px === b.x && b.py === b.y) { /* just let go from a hole or a carry */ }
      var i, s, before;
      // through a wall's core line
      for (i = 0; i < Bt.WALLS.length; i++) {
        s = Bt.WALLS[i];
        if (cross(b.px, b.py, b.x, b.y, s.ax, s.ay, s.bx, s.by)) log('tunnel', b, s.kind + i);
      }
      // the wrong way through a one-way gate (and a lava gate that is down)
      for (i = 0; i < Bt.GATES.length; i++) {
        s = Bt.GATES[i];
        if (!cross(b.px, b.py, b.x, b.y, s.ax, s.ay, s.bx, s.by)) continue;
        before = (b.px - s.ax) * s.nx + (b.py - s.ay) * s.ny;
        if (before > 0) log('gate', b, 'gate' + i);
      }
      for (i = 0; i < Bt.LAVA.length; i++) {
        if (!prevLava[i] || !W.toys.lava.gates[i].solid) continue;
        s = Bt.LAVA[i];
        if (!cross(b.px, b.py, b.x, b.y, s.ax, s.ay, s.bx, s.by)) continue;
        before = (b.px - s.ax) * s.nx + (b.py - s.ay) * s.ny;
        if (before > 0) log('gate', b, 'lava' + i);
      }
      // through a drop target that is still up
      for (i = 0; i < Bt.DROPS.length; i++) {
        if (!prevDrops[i] || !W.drops[i]) continue;
        s = Bt.DROPS[i];
        if (cross(b.px, b.py, b.x, b.y, s.ax, s.ay, s.bx, s.by)) log('droptunnel', b, 'drop' + i);
      }
      // stuck inside something, or inside a closed space
      var o = overlap(W, b.x, b.y);
      if (o.pen > 2.5) log('inside', b, o.what + ' ' + o.pen.toFixed(1));
      for (i = 0; i < (T.voids || []).length; i++) if (inPoly(b.x, b.y, T.voids[i])) log('inside', b, 'void' + i);
      // off the table (anywhere but the bottom)
      if (b.y < 0 || (b.y < T.H && (b.x < 0 || b.x > T.W))) log('escaped', b, '');
    }
    prevDrops = W.drops.slice();
    if (W.toys.lava) prevLava = W.toys.lava.gates.map(function (g) { return g.solid; });
  };
}

// ------------------------------------------------------------ the auto-flipper bot
// flips a side when a ball is close to any of that side's flippers and coming down, after a short random wait, for a
// random time; now and then it holds a side up to trap (cradle) the ball, and it pulls the plunger for a random time
// when a ball is in the lane
function bot(seed, opt) {
  var r = lcg(seed), hold = [0, 0], wait = [-1, -1], cradle = [0, 0], plunge = -1;
  opt = opt || {};
  return function (W) {
    var inp = { left: false, right: false, fire: false }, SH = E.table(W.tableId).T.shooter;
    for (var side = 0; side < 2; side++) {
      var near = null;
      for (var fi = 0; fi < W.flippers.length && !near; fi++) {
        var f = W.flippers[fi];
        if ((f.side > 0 ? 1 : 0) !== side) continue;
        for (var k = 0; k < W.balls.length; k++) {
          var b = W.balls[k];
          if (b.m !== 'free' || b.x > SH.x0) continue;
          var dx = b.x - f.x, dy = b.y - f.y;
          if (dx * f.side > 6 || dx * -f.side > f.len + 14 || dy < -45 || dy > 30) continue;
          near = b; break;
        }
      }
      if (hold[side] > 0) { hold[side]--; inp[side ? 'right' : 'left'] = true; continue; }
      if (cradle[side] > 0) { cradle[side]--; inp[side ? 'right' : 'left'] = true; continue; }
      if (near && wait[side] < 0 && near.vy > -40) wait[side] = Math.floor(r() * (opt.maxWait || 6));
      if (wait[side] >= 0) {
        if (wait[side]-- === 0) {
          if (r() < (opt.cradle || 0.12)) cradle[side] = 40 + Math.floor(r() * 120);
          else hold[side] = 6 + Math.floor(r() * 14);
          inp[side ? 'right' : 'left'] = true;
          wait[side] = -1;
        }
      }
    }
    var inLane = W.balls.some(function (b) { return b.m === 'free' && b.x > SH.x0 && b.y > SH.tip - 30 && Math.abs(b.vy) < 30; });
    if (inLane) {
      if (plunge < 0) plunge = 1 + Math.floor(r() * 60);
      if (plunge-- > 0) inp.fire = true;
    } else plunge = -1;
    return inp;
  };
}

// run one world with a bot until the ball drains or time runs out; report what happened
function run(W, steps, drive, onStep) {
  for (var n = 0; n < steps; n++) {
    var inp = drive ? drive(W, n) : {};
    E.step(W, inp);
    if (onStep && onStep(W, n) === false) return n;
    W.events.length = 0;
    if (W.state !== 'play' || W.balls.length === 0) return n;
  }
  return steps;
}

S.E = E; S.BR = BR; S.use = use; S.lcg = lcg; S.world = world; S.place = place; S.overlap = overlap; S.freeSpot = freeSpot;
S.watch = watch; S.bot = bot; S.run = run; S.segDist = segDist; S.cross = cross; S.flipperDist = flipperDist; S.inPoly = inPoly;
