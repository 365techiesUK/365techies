/* 365 Pinball Hero - feature checks (15 Oct 2026; Ember Peak's toys, 16 Oct 2026). Never deployed.
 * Plays out each table feature in the real engine and prints what happened. engine.test.mjs asserts the same things;
 * this prints the detail. Shared: the kickback, the ramp, the orbits (and a LOOP), the one-way gates, ball save, tilt,
 * extra balls, the bonus count-up and game over; the old table: its hangar; Ember Peak: the crater and its carry down
 * the wire rail, the geyser, the crabs, the lava gates, the quake, the pressure rule, the storeys and E.clone; wave 3
 * (5 Nov 2026): the eruption ladder and the lock, THE BIG ONE multiball (jackpots, the super jackpot, add-a-ball), the
 * OBSIDIAN PLUG and the heat ramp's capped exit.
 *
 *   node tools/pinball/features.cjs [speed=2]        (Ember Peak; --orbit for the old table) */
'use strict';
var S = require('./sim.cjs'), E = S.E;

// run a world until stop(W, events) says so (or n steps); returns {n, events seen (names), stopped}
function play(W, n, input, stop) {
  var seen = [];
  for (var i = 0; i < n; i++) {
    E.step(W, typeof input === 'function' ? input(W, i) : (input || {}));
    W.events.forEach(function (e) { seen.push(typeof e === 'string' ? e : e.sfx || (e.say ? 'say' : '?')); });
    var r = stop && stop(W, seen, i);
    W.events.length = 0;
    if (r) return { n: i + 1, seen: seen, stopped: true };
  }
  return { n: n, seen: seen, stopped: false };
}
function has(seen, name) { return seen.indexOf(name) >= 0; }
function sens(T, id) { return T.sensors.circles.filter(function (c) { return c[0] === id; })[0]; }
function line(T, id) { return T.sensors.lines.filter(function (c) { return c[0] === id; })[0]; }

var checks = {
  kickback: function (sp) {   // a ball down the left outlane with the kickback lit comes back into play
    var T = S.T, oy = sens(T, 'outL')[2] - 92;
    var W = S.world(sp, 3, { kickback: true, noGeyser: true });
    S.place(W, 16, oy, 0, 150);
    var r = play(W, 600, {}, function (W2, seen) { return !W2.balls.length || has(seen, 'inlane'); });
    var alive = W.balls.length > 0 && has(r.seen, 'inlane'), b = W.balls[0];
    var W2 = S.world(sp, 3, { kickback: false });
    S.place(W2, 16, oy, 0, 150);
    var r2 = play(W2, 240, {}, function (W3) { return !W3.balls.length; });
    return { ok: has(r.seen, 'kickback') && alive && !W.kickback && r2.stopped,
      detail: 'lit: ' + (has(r.seen, 'kickback') ? 'kicked, ' : 'NOT kicked, ') + (alive ? 'back in play: ' + b.x.toFixed(0) + ',' + b.y.toFixed(0) + ' after ' + (r.n / 60).toFixed(1) + ' s (' + r.seen.filter(function (s) { return /orbit|spin|inlane|lane|bumper|loop/.test(s); }).slice(0, 6).join(' ') + ')' : 'DRAINED') + '; unlit: ' + (r2.stopped ? 'drained' : 'still in play') };
  },
  hangar: function (sp) {   // (the old table) all five down, shoot the hangar: caught, held, ejected clear, targets back up after
    var W = S.world(sp, 3, { dropsDown: true });
    W.dropsT = 0;
    S.place(W, 90, 220, -500, -700);
    var caught = -1, ejected = -1, clear = -1, reset = -1;
    play(W, 400, {}, function (W2, seen, i) {
      var b = W2.balls[0];
      if (caught < 0 && (has(seen, 'jackpot') || has(seen, 'saucer'))) caught = i;
      if (ejected < 0 && has(seen, 'eject')) ejected = i;
      if (ejected >= 0 && clear < 0 && b && !E.inPocket(b.x, b.y, W2.tableId) && b.y > 215) clear = i;
      if (reset < 0 && has(seen, 'reset')) reset = i;
      return !W2.balls.length || reset >= 0;
    });
    var W3 = S.world(sp, 3, { dropsDown: true });
    W3.dropsT = 1; S.place(W3, 75, 165, 0, 0);
    var r3 = play(W3, 3, {});
    return { ok: caught >= 0 && ejected - caught >= 70 && clear > ejected && reset > clear && !has(r3.seen, 'reset'),
      detail: 'caught at ' + caught + ', held ' + (ejected - caught) + ' frames, clear of the hangar ' + (clear - ejected) + ' frames after the eject, targets up ' + (reset - ejected) + ' frames after; with a ball in the way: ' + (has(r3.seen, 'reset') ? 'RESET ANYWAY' : 'waited') };
  },
  ramp: function (sp) {   // up the ramp lane fast: made, and off the far end (into an inlane; the old two-storey Ember: the summit)
    var T = S.T, en = T.ramp.entry, y0 = en.y + 35, upper = !!T.storeys[1], fy = T.flippers[0].y;
    var W = S.world(sp, 3, { noGeyser: true, noCrabs: true });
    S.place(W, (en.x0 + en.x1) / 2, y0, 0, -1500);
    var out = null, landed = null;
    var r = play(W, 400, {}, function (W2, seen) {
      var b = W2.balls[0]; if (!b) return true;
      if (has(seen, 'ramp') && !out) out = [b.x, b.y];
      if (!upper && out && b.y > fy - 30 && !landed) landed = [b.x, b.y];
      if (upper && out && E.inApproach(W2, b) === 1 && !landed) landed = [b.x, b.y];
      return landed || (out && b.y > T.H);
    });
    var W2 = S.world(sp, 3, { noCrabs: true });
    S.place(W2, (en.x0 + en.x1) / 2, y0, 0, -600);
    var r2 = play(W2, 200, {}, function (W3, seen) { return has(seen, 'rampfail'); });
    var into = upper ? true : has(r.seen, 'inlane');
    return { ok: !!out && into && !!landed && !has(r.seen, 'outlane') && r2.stopped,
      detail: (out ? 'made, off the ramp at ' + out.map(Math.round) : 'NOT made') + (upper ? '' : has(r.seen, 'inlane') ? ', through an inlane' : ', MISSED the inlane') + (landed ? ', on to the flippers at ' + landed.map(Math.round) : ', NEVER reached the flippers') + '; slow shot ' + (r2.stopped ? 'rolls back' : 'did NOT roll back') };
  },
  orbits: function (sp) {   // up the left orbit, round the arch, down the right orbit into the right inlane; then a LOOP
    var T = S.T, oy = line(T, 'spin')[2] + 44;
    var W = S.world(sp, 3, { noGeyser: true });
    S.place(W, 18, oy, 0, -1300 - (T.H - 446) * 1.2);
    var path = [];
    var r = play(W, 600, {}, function (W2, seen) {
      var b = W2.balls[0]; if (!b) return true;
      if (path.length < 6 && seen.length && path[path.length - 1] !== seen[seen.length - 1]) path.push(seen[seen.length - 1]);
      return has(seen, 'inlane') || b.y > sens(T, 'inL')[2] + 58;
    });
    var side = W.balls[0] ? (W.balls[0].x > T.MID ? 'right' : 'left') : 'drained';
    var W2 = S.world(sp, 3, {});
    S.place(W2, 18, oy, 0, -1300);
    var r2 = play(W2, 300, function (W3, i) { if (i === 40) { W3.balls.length = 0; S.place(W3, T.MID * 2 - 18, oy, 0, -1300); } return {}; }, function (W3, seen) { return has(seen, 'loop'); });
    return { ok: has(r.seen, 'orbit') && has(r.seen, 'inlane') && side === 'right' && r2.stopped,
      detail: 'left orbit shot: ' + r.seen.filter(function (s) { return /orbit|spin|inlane|outlane|loop|lane|bumper/.test(s); }).filter(function (s, i, a) { return a.indexOf(s) === i; }).join(' > ') + ', ends in the ' + side + ' inlane; up left then up right inside 4 s: ' + (r2.stopped ? 'LOOP' : 'no loop') };
  },
  gates: function (sp) {   // one-way gates: nothing rests on the shooter gate or gets into the lane from above; orbit feet
    var T = S.T, bad = 0, n = 0, W;
    for (var x = 246; x <= 262; x += 2) {
      W = S.world(sp, 3, {}); S.place(W, x, 110, -30 + (x - 246) * 4, 200); n++;
      play(W, 300, {}, function (W2) { var b = W2.balls[0]; return !b || b.y > 300; });
      var b = W.balls[0]; if (!b || b.x > T.shooter.x0) bad++;
    }
    // a ball coming down the left orbit goes to the inlane, not the outlane
    var inl = 0, m = 0, gy = T.gates[1][1] - 62;
    for (var v = 100; v <= 900; v += 200) for (var xx = 16; xx <= 20; xx += 2) {
      var W3 = S.world(sp, 3, { kickback: false }); S.place(W3, xx, gy, 0, v); m++;
      var r3 = play(W3, 200, {}, function (W4, seen) { return has(seen, 'inlane') || has(seen, 'outlane') || !W4.balls.length; });
      if (has(r3.seen, 'inlane')) inl++;
    }
    return { ok: bad === 0 && inl === m, detail: 'balls dropped on the shooter gate: ' + (n - bad) + '/' + n + ' rolled off into the right orbit; down the left orbit: ' + inl + '/' + m + ' into the inlane' };
  },
  save: function (sp) {   // launch, drain straight away: saved, new ball fires itself
    var W = E.newWorld(sp, 0, 3, S.tableId);
    play(W, 600, function (W2, i) { return { fire: i < 30 }; }, function (W2) { return W2.balls.length && W2.balls[0].launched && W2.balls[0].y < 140; });
    W.balls[0].x = 125; W.balls[0].y = S.T.H - 16; W.balls[0].vx = 0; W.balls[0].vy = 300;
    var r2 = play(W, 400, {}, function (W2, seen) { return has(seen, 'save'); });
    var ballNo = W.ball;
    var r3 = play(W, 200, {}, function (W2, seen) { return has(seen, 'launch'); });
    return { ok: r2.stopped && r3.stopped && ballNo === 1 && W.state === 'play', detail: (r2.stopped ? 'saved' : 'NOT saved') + ', still ball ' + ballNo + ', the new ball ' + (r3.stopped ? 'fired itself after ' + r3.n + ' frames' : 'did NOT fire') };
  },
  tilt: function (sp) {
    var W = E.newWorld(sp, 0, 3, S.tableId);
    play(W, 80, function (W2, i) { return { fire: i < 40 }; });
    var seen = [];
    for (var k = 0; k < 6; k++) { var r = play(W, 6, function (W2, i) { return { up: i === 0 }; }); seen = seen.concat(r.seen); }
    var tilted = W.tilted, f0 = W.flippers.map(function (f) { return f.a; });
    play(W, 10, { left: true, right: true });
    var dead = W.flippers.every(function (f, i) { return f.a === f0[i]; });
    return { ok: has(seen, 'warn') && has(seen, 'tilt') && tilted && dead, detail: 'nudges: ' + seen.filter(function (s) { return /nudge|warn|tilt/.test(s); }).join(' ') + '; flippers ' + (dead ? 'dead' : 'STILL WORK') };
  },
  extra: function (sp) {
    var W = E.newWorld(sp, 0, 3, S.tableId), t0 = W.total, at = W.extraAt[0], bm = S.T.bumpers[2];
    W.score = at - 50; S.place(W, bm[0], bm[1] + 10, 0, 0);   // a ball onto a bumper scores
    W.balls.shift();
    var r = play(W, 30, {}, function (W2, seen) { return has(seen, 'extra'); });
    return { ok: r.stopped && W.total === t0 + 1, detail: 'at ' + E.fmt(at) + ': ' + (r.stopped ? 'extra ball, ' + t0 + ' -> ' + W.total + ' balls' : 'NO extra ball') };
  },
  bonus: function (sp) {
    var W = E.newWorld(sp, 0, 3, S.tableId);
    W.bonus = 12300; W.mult = 3; W.balls.length = 0;
    var s0 = W.score;
    var r = play(W, 600, {}, function (W2, seen) { return has(seen, 'newball'); });
    return { ok: r.stopped && W.score - s0 === 36900 && W.ball === 2 && W.mult === 1, detail: 'bonus 12,300 x 3 counted up to ' + E.fmt(W.score - s0) + ' in ' + r.n + ' frames, then ball ' + W.ball };
  },
  over: function (sp) {
    var W = E.newWorld(sp, 0, 3, S.tableId), n = 0;
    while (!W.over && n < 20) { W.balls.length = 0; play(W, 600, {}, function (W2, seen) { return has(seen, 'newball') || has(seen, 'over'); }); n++; }
    return { ok: W.over && W.state === 'over' && n === E.SPEEDS[sp].balls, detail: 'game over after ' + n + ' drained balls (' + E.SPEEDS[sp].balls + ' a game)' };
  },

  // ------------------------------------------------------------ Ember Peak's toys
  crater: function (sp) {   // a firm shot into the mouth, nothing lit: held 0.6 s (release step known), skyward on the faster rail, out of play 2.5 s at most, into the left inlane
    var T = S.T, V0 = T.volcano, W = S.world(sp, 3, { noGeyser: true, noCrabs: true });
    S.place(W, V0.x, V0.y + 60, 0, -900);
    var caught = -1, rel = -1, rail = -1, out = -1, inlane = -1, flipper = -1, V = W.toys.volcano, release = -1, land = -1, maxZ = 0, maxY = 0, near = 0;
    var r = play(W, 900, {}, function (W2, seen, i) {
      var b = W2.balls[0]; if (!b) return true;
      if (caught < 0 && has(seen, 'crater')) { caught = W2.frame; release = V.release; land = V.land; }
      if (rel < 0 && has(seen, 'erupt')) rel = W2.frame;
      if (rail < 0 && has(seen, 'rail')) rail = W2.frame;
      // riding: never in an approach zone (the rail's very end is the inlane, on the shore's approach line)
      if (b.m === 'ramp') { maxZ = Math.max(maxZ, b.z); maxY = Math.max(maxY, b.y); if (T.storeys.some(function (s) { return b.y > s.approach + 3 && b.y <= s.y1 && b.x >= s.x0 && b.x <= s.x1; })) near++; }
      if (out < 0 && has(seen, 'railout')) out = W2.frame;
      if (inlane < 0 && has(seen, 'inlane')) inlane = W2.frame;
      if (inlane > 0 && flipper < 0 && b.y > T.flippers[0].y - 30 && b.x < T.MID) flipper = W2.frame;
      return flipper > 0;
    });
    // a soft touch on the mouth bounces off; lit (anything at the crater) the wider mouth takes it; sealed, nothing is taken
    var k = Math.sqrt(E.SPEEDS[sp].g / 590);
    function soft(opt, v) {
      var W2 = S.world(sp, 3, opt);
      if (opt.sealed) E.api.seal(W2, true);
      S.place(W2, V0.x, V0.y + 60, 0, -v * k);
      return play(W2, 120, {}, function (W3, seen) { return has(seen, 'crater'); }).stopped;
    }
    var softOff = soft({ noGeyser: true, noCrabs: true }, 300), softLit = soft({ noGeyser: true, noCrabs: true, lit: true }, 300), sealed = soft({ noGeyser: true, noCrabs: true, lit: true, sealed: true }, 900);
    var held = (rel - caught) / 60, gone = (out - caught) / 60;
    return { ok: caught > 0 && held >= 0.55 && held <= 0.65 && gone <= 2.5 && rel === release && out === land && maxZ > 120 && near === 0 && inlane > out && flipper > 0 && !softOff && softLit && !sealed,
      detail: 'caught; held ' + held.toFixed(2) + ' s (released on step ' + rel + ', W.toys.volcano.release said ' + release + '); up to height ' + maxZ.toFixed(0) + ', on the wire rail ' + ((rail - rel) / 60).toFixed(2) + ' s later, back in play on step ' + out + ' (W.toys.volcano.land said ' + land + '; out of play ' + gone.toFixed(2) + ' s), ' + (near ? near + ' steps in an approach zone while riding, ' : 'never in an approach zone while riding (lowest point y ' + maxY.toFixed(0) + '), ') + (inlane > 0 ? 'through the left inlane' : 'MISSED the inlane') + (flipper > 0 ? ' to the left flipper' : ', NEVER reached the flipper') + '; a soft shot ' + (softOff ? 'WAS TAKEN' : 'bounces off') + ', lit ' + (softLit ? 'is taken (the wider mouth)' : 'STILL BOUNCES') + '; sealed, a firm shot ' + (sealed ? 'WAS TAKEN' : 'bounces off') };
  },
  geyser: function (sp) {   // a slow ball in the column: caught, a puff, flung on; it rests before it catches again
    var G0 = S.T.geyser, W = S.world(sp, 3, { noCrabs: true });
    S.place(W, G0.x, G0.y - 8, 0, 20);
    var puff = -1, fling = -1, v = 0;
    play(W, 120, {}, function (W2, seen) {
      if (puff < 0 && has(seen, 'puff')) puff = W2.frame;
      if (fling < 0 && has(seen, 'geyser')) { fling = W2.frame; var b = W2.balls[0]; v = Math.hypot(b.vx, b.vy); }
      return fling > 0;
    });
    var cool = W.toys.geyser.st;
    // a fast ball goes straight through
    var W2 = S.world(sp, 3, { noCrabs: true });
    S.place(W2, G0.x, G0.y + 30, 0, -900);
    var r2 = play(W2, 40, {}, function (W3, seen) { return has(seen, 'puff'); });
    return { ok: puff > 0 && fling - puff >= 20 && v > 500 && cool === 'cool' && !r2.stopped,
      detail: 'caught, puffed for ' + (fling - puff) + ' steps, flung at ' + v.toFixed(0) + ' u/s, then ' + cool + '; a fast ball ' + (r2.stopped ? 'WAS CAUGHT' : 'passes through') };
  },
  crabs: function (sp) {   // they walk, stop when hit, and never step into a ball (they wait for it)
    var T = S.T, W = S.world(sp, 3, { noGeyser: true }), c = W.toys.crabs[0], x0 = c.x;
    play(W, 60, {});
    var walked = Math.abs(W.toys.crabs[0].x - x0) > 5 || W.toys.crabs[0].wait > 0;
    // a ball held still right in a crab's path: the crab waits, never overlapping it
    var nc = T.crabs.length - 1, W2 = S.world(sp, 3, { noGeyser: true }), C = W2.toys.crabs[nc], d = T.crabs[nc], b = S.place(W2, (d.path[0][0] + d.path[1][0]) / 2, d.path[0][1], 0, 0);
    var worst = 0;
    for (var i = 0; i < 600; i++) {
      b.x = (d.path[0][0] + d.path[1][0]) / 2; b.y = d.path[0][1]; b.vx = 0; b.vy = 0;   // pinned there
      E.step(W2, {}); W2.events.length = 0;
      worst = Math.max(worst, S.BR + d.r - Math.hypot(b.x - C.x, b.y - C.y));
    }
    // a shot into a crab: it stops (stunned) and scores
    var W3 = S.world(sp, 3, { noGeyser: true }), C3 = W3.toys.crabs[nc];
    S.place(W3, C3.x, C3.y + 40, 0, -700);
    var r3 = play(W3, 30, {}, function (W4, seen) { return has(seen, 'crab'); });
    return { ok: walked && worst < 0.01 && r3.stopped && W3.toys.crabs[nc].stun > 0,
      detail: (walked ? 'walking' : 'NOT walking') + '; with a ball in its path it closed to ' + (-worst).toFixed(1) + ' units of it and waited; a shot ' + (r3.stopped ? 'stunned it' : 'MISSED') };
  },
  lava: function (sp) {   // the gates rise on a full eruption; a lane shot scores; they come down only once no ball is in the way
    var T = S.T, W = S.world(sp, 3, { noGeyser: true, noCrabs: true }), V0 = T.volcano;
    W.toys.volcano.pressure = W.press.level;
    S.place(W, V0.x, V0.y + 60, 0, -900);
    var r = play(W, 30, {}, function (W2, seen) { return has(seen, 'lavaopen'); });
    var open = W.toys.lava.open && W.toys.lava.gates.every(function (g) { return !g.solid; });
    // a ball shot up a lane while open
    var G0 = T.lava.gates[0], flat = Math.abs(G0[1] - G0[3]) < Math.abs(G0[0] - G0[2]);   // a gate across the lane's foot, or along its side
    var LX = flat ? (G0[0] + G0[2]) / 2 : (30 + G0[0]) / 2, LY = flat ? G0[1] - 30 : Math.min(G0[1], G0[3]) + 22;   // inside the left lava lane
    var W2 = S.world(sp, 3, { lava: true, noGeyser: true, noCrabs: true });
    S.place(W2, LX, LY, 0, -600);
    var r2 = play(W2, 60, {}, function (W3, seen) { return has(seen, 'lava'); });
    // closing with a ball sitting in the gate's way: it waits
    var W3 = S.world(sp, 3, { lava: true, noGeyser: true, noCrabs: true }), g = T.lava.gates[0];
    W3.toys.lava.gates[0].t = 2;
    var gx = (g[0] + g[2]) / 2, gy = (g[1] + g[3]) / 2, b = S.place(W3, gx, gy, 0, 0), waited = true;
    for (var i = 0; i < 20; i++) { b.x = gx; b.y = gy; b.vx = b.vy = 0; E.step(W3, {}); if (W3.toys.lava.gates[0].solid) waited = false; }
    W3.balls.length = 0; E.step(W3, {});
    var closed = W3.toys.lava.gates[0].solid;
    // closed, a ball inside the lane rolls out through the gate
    var W4 = S.world(sp, 3, { noGeyser: true, noCrabs: true });
    S.place(W4, LX, LY, 0, 0);
    var r4 = play(W4, 240, {}, function (W5) { var bb = W5.balls[0]; return bb && (flat ? bb.y > G0[1] + 10 : bb.x > G0[0] + 10); });
    return { ok: r.stopped && open && r2.stopped && waited && closed && r4.stopped,
      detail: 'full eruption: ' + (open ? 'gates up' : 'gates NOT up') + '; a lane shot ' + (r2.stopped ? 'scores' : 'did NOT score') + '; closing with a ball in the way ' + (waited ? 'waits' : 'CLOSED ON IT') + ', then ' + (closed ? 'closes' : 'did NOT close') + '; a ball inside a closed lane ' + (r4.stopped ? 'rolls out' : 'is STUCK') };
  },
  quake: function (sp) {   // it waits while a ball is below an approach line, pulls sideways, and stops if one gets there
    var T = S.T, W = S.world(sp, 3, { noGeyser: true, noCrabs: true });
    var b = S.place(W, 125, T.storeys[0].approach + 40, 0, 0);
    W.toys.quake.pending = true;
    play(W, 5, {});
    var waited = W.toys.quake.pending && W.toys.quake.t === 0;
    W.balls.length = 0; S.place(W, 100, T.storeys[0].approach - 60, 0, -200);   // up in the field above the approach line
    var r = play(W, 5, {}, function (W2, seen) { return has(seen, 'quake'); });
    var pulled = 0, stopped = false;
    play(W, 60, {}, function (W2, seen) { if (W2.toys.quake.gx !== 0) pulled++; if (has(seen, 'quakeend')) { stopped = true; return true; } });
    var anyIn = W.balls.some(function (o) { return E.inApproach(W, o) >= 0; });
    return { ok: waited && r.stopped && pulled > 10 && stopped && W.toys.quake.gx === 0,
      detail: 'pending with a ball below the approach line: ' + (waited ? 'waited' : 'DID NOT WAIT') + '; with none there it ' + (r.stopped ? 'started' : 'did NOT start') + ', pulled for ' + pulled + ' steps, then stopped' + (anyIn ? ' (a ball reached an approach zone)' : '') };
  },
  pressure: function (sp) {   // shots add pressure: LOCK lights at half the rung, a RUMBLE at 75%, ERUPT NOW at it; overdo it and the quake comes, the kickback goes off, the plug drops
    var W = S.world(sp, 3, { noGeyser: true, noCrabs: true, plug: true }), V = W.toys.volcano, seen = [];
    W.kickback = true;
    S.place(W, 125, 380, 0, 0);
    // eight orbits' worth
    var steps = [];
    for (var i = 0; i < 20 && !W.toys.quake.pending; i++) {
      W.orbitFrom = ''; W.orbitT = 0;
      var b = W.balls[0]; b.x = 18; b.y = S.T.sensors.lines[0][2] + 1; b.vx = 0; b.vy = -900; b.m = 'free';
      E.step(W, {}); W.events.forEach(function (e) { seen.push(typeof e === 'string' ? e : e.sfx); }); W.events.length = 0;
      steps.push(V.pressure.toFixed(2));
    }
    var full = seen.indexOf('pressure') >= 0, over = seen.indexOf('overload') >= 0, PR = S.T.pressure;
    var order = ['locklit', 'rumble', 'eruptlit', 'overload'].map(function (n) { return seen.indexOf(n); }), inOrder = order.every(function (x, j) { return x >= 0 && (j === 0 || x >= order[j - 1]); });
    return { ok: full && over && inOrder && !W.kickback && !W.plug.up && W.toys.quake.pending && Math.abs(V.pressure - W.press.level * PR.after) < 1e-9,
      detail: 'pressure (rung ' + W.press.level + ') ' + steps.join(' ') + ': ' + (inOrder ? 'LOCK lit, a rumble, ' : 'lock/rumble/erupt OUT OF ORDER, ') + (full ? 'ERUPT NOW at the rung' : 'NO prompt') + ', ' + (over ? 'then a quake comes, the kickback is ' + (W.kickback ? 'STILL ON' : 'off') + ' and the plug ' + (W.plug.up ? 'STILL UP' : 'drops') : 'NO quake') };
  },
  ladder: function (sp) {   // a lit LOCK banks a virtual lock (held 1.2 s, half the pressure kept); ERUPT plays its 2.75 s show, then 3 balls (2 + the lock); the rung steps up
    var V0 = S.T.volcano, W = S.world(sp, 3, { noGeyser: true, noCrabs: true }), V = W.toys.volcano, L0 = W.press.level;
    V.pressure = L0 * 0.6; W.lock.lit = true;
    S.place(W, V0.x, V0.y + 60, 0, -900);
    var c1 = -1, r1 = -1;
    play(W, 400, {}, function (W2, seen) { if (c1 < 0 && has(seen, 'crater')) c1 = W2.frame; if (r1 < 0 && has(seen, 'erupt')) r1 = W2.frame; return r1 > 0; });
    var lockOk = W.lock.n === 1 && !W.lock.lit && Math.abs(V.pressure - L0 * 0.3) < 1e-9, lockHold = (r1 - c1) / 60;
    W.balls.length = 0; V.busy = false; V.ball = 0;
    V.pressure = L0;
    S.place(W, V0.x, V0.y + 60, 0, -900);
    var c2 = -1, m2 = -1, n2 = 0;
    play(W, 400, {}, function (W2, seen) { if (c2 < 0 && has(seen, 'crater')) c2 = W2.frame; if (m2 < 0 && has(seen, 'mbstart')) { m2 = W2.frame; n2 = W2.balls.length + W2.feed; } return m2 > 0; });
    var show = (m2 - c2) / 60;
    return { ok: lockOk && lockHold >= 1.15 && lockHold <= 1.25 && show >= 2.7 && show <= 2.8 && n2 === 3 && W.press.n === 1 && W.press.level > L0 && W.lock.n === 0 && !!W.mb && W.saveT > 0,
      detail: 'a lit LOCK ' + (lockOk ? 'banked (half the pressure kept)' : 'NOT BANKED') + ', held ' + lockHold.toFixed(2) + ' s; ERUPT: a ' + show.toFixed(2) + ' s show, then multiball with ' + n2 + ' balls, ball save ' + (W.saveT / 60).toFixed(1) + ' s; the rung ' + L0 + ' -> ' + W.press.level };
  },
  multiball: function (sp) {   // jackpots on both lava lanes and the ramp (5M, +1M each); three light the SUPER JACKPOT (3x, back out in 0.5 s); the geyser adds a ball once; it ends at one ball
    var T = S.T, V0 = T.volcano, en = T.ramp.entry, W = S.world(sp, 3, { noCrabs: true }), got = [];
    E.api.multiball(W, 4, { save: 0 }); W.autoT = 1e9;   // (nobody fires the fed balls: the shots below are placed one at a time)
    function shoot(x, y, vx, vy, stop) {
      W.balls.length = 0; var s0 = W.score; S.place(W, x, y, vx, vy);
      var r = play(W, 400, {}, function (W2, seen) { return stop(W2, seen); });
      return { pts: W.score - s0, r: r };
    }
    var G0 = T.lava.gates[0], LX = (G0[0] + G0[2]) / 2, LY = G0[1] - 30;
    got.push(shoot(LX, LY, 0, -600, function (W2, seen) { return has(seen, 'jackpot'); }).pts);
    got.push(shoot((en.x0 + en.x1) / 2, en.y + 35, 0, -1500, function (W2, seen) { return has(seen, 'jackpot'); }).pts);
    got.push(shoot(2 * T.MID - LX, LY, 0, -600, function (W2, seen) { return has(seen, 'jackpot'); }).pts);
    var superLit = W.mb && W.mb.superLit && W.crater.lit[0] === 'super', c = -1, rel = -1;
    var sup = shoot(V0.x, V0.y + 60, 0, -900, function (W2, seen) { if (c < 0 && has(seen, 'crater')) c = W2.frame; if (rel < 0 && has(seen, 'erupt')) rel = W2.frame; return rel > 0; });
    var P = T.points, jpOk = got[0] === P.lava + P.jackpot && got[1] === P.ramp + P.jackpot + P.jackpotUp && got[2] === P.lava + P.jackpot + 2 * P.jackpotUp;
    var supOk = has(sup.r.seen, 'superjackpot') && sup.pts === 3 * (P.jackpot + 3 * P.jackpotUp) && !W.mb.superLit && W.mb.jp.lavaL && W.mb.jp.ramp, back = (rel - c) / 60;
    W.balls.length = 0; W.toys.volcano.busy = false; W.toys.volcano.ball = 0;
    W.feed = 2; var f0 = W.feed; W.toys.geyser.st = 'ready'; W.toys.geyser.t = 0;
    shoot(T.geyser.x, T.geyser.y, 0, 0, function (W2, seen) { return has(seen, 'geyser'); });
    var added = W.feed === f0 + 1 && W.mb.addUsed;
    W.toys.geyser.st = 'ready'; W.toys.geyser.t = 0;
    shoot(T.geyser.x, T.geyser.y, 0, 0, function (W2, seen) { return has(seen, 'geyser'); });
    var once = W.feed === f0 + 1;
    W.balls.length = 0; W.feed = 1; W.autoT = 0;
    var end = play(W, 5, {}, function (W2, seen) { return has(seen, 'mbend'); });
    return { ok: jpOk && superLit && supOk && back >= 0.45 && back <= 0.55 && added && once && end.stopped && W.mb === null,
      detail: 'jackpots ' + got.map(function (x) { return E.fmt(x); }).join(', ') + (jpOk ? '' : ' (WRONG)') + '; ' + (superLit ? 'SUPER JACKPOT lit at the crater' : 'super NOT lit') + ', worth ' + E.fmt(sup.pts) + (supOk ? '' : ' (WRONG)') + ', back out in ' + back.toFixed(2) + ' s; the geyser ' + (added ? 'added a ball' : 'did NOT add a ball') + (once ? ' once' : ' MORE THAN ONCE') + '; at one ball ' + (end.stopped ? 'the multiball ends' : 'it did NOT end') };
  },
  plug: function (sp) {   // the drop bank raises the OBSIDIAN PLUG (and lights MODE; Gentle also the kickback); a ball down the middle is kicked back up; or it drops after its time
    var T = S.T, d = T.drops, W = S.world(sp, 3, { noGeyser: true, noCrabs: true });
    W.kickback = false; W.drops = [false, false, true]; W.dropsDown = 2;
    var tx = d.a[0] + (d.b[0] - d.a[0]) * 0.83, ty = d.a[1] + (d.b[1] - d.a[1]) * 0.83, nx = -0.316, ny = 0.949;
    S.place(W, tx + nx * 20, ty + ny * 20, -nx * 600, -ny * 600);
    var r = play(W, 60, {}, function (W2, seen) { return has(seen, 'drops'); });
    var up = W.plug.up && has(r.seen, 'plugup') && W.crater.mode && has(r.seen, 'modelit'), kick = W.kickback === !!E.SPEEDS[sp].kick;
    W.balls.length = 0; S.place(W, T.plug.x - 3, T.plug.y - 30, 0, 300);
    var hiY = 1e9, r2 = play(W, 90, {}, function (W2, seen) { var b = W2.balls[0]; if (b) hiY = Math.min(hiY, b.y); return !b; });
    var saved = has(r2.seen, 'plugsave') && has(r2.seen, 'plugdown') && !W.plug.up && hiY < T.storeys[0].approach && !has(r2.seen, 'drain');
    var W3 = S.world(sp, 3, { noGeyser: true, noCrabs: true }); S.place(W3, T.shooter.cx, T.shooter.tip - T.BALL, 0, 0);
    E.api.plug(W3, 120); var r3 = play(W3, 130, {}, function (W4, seen) { return has(seen, 'plugdown'); });
    return { ok: up && kick && saved && r3.stopped && r3.n === 120,
      detail: 'the drop bank ' + (up ? 'raised the plug and lit MODE' : 'did NOT raise the plug / light MODE') + ', the kickback ' + (W.kickback ? 'lit' : 'not lit') + (kick ? '' : ' (WRONG for this speed)') + '; a ball down the middle ' + (saved ? 'is kicked back up (to y ' + hiY.toFixed(0) + ') and the plug drops' : 'was NOT saved') + '; unused, it drops after its time ' + (r3.stopped ? '(' + r3.n + ' steps)' : '(NEVER)') };
  },
  rampcap: function (sp) {   // however hard the ramp is shot, the ball comes off its far end no faster than exitMax (scaled)
    var T = S.T, en = T.ramp.entry, k = Math.sqrt(E.SPEEDS[sp].g / 590), cap = T.ramp.exitMax * k, worst = 0, made = 0;
    [1000, 1250, 1500, 1800, 2200].forEach(function (v) {
      var W = S.world(sp, 3, { noGeyser: true, noCrabs: true }), wasRamp = false;
      S.place(W, (en.x0 + en.x1) / 2, en.y + 35, 0, -v * k);
      W.onSub = function (W2) { var b = W2.balls[0]; if (!b) return; if (wasRamp && b.m === 'free') { worst = Math.max(worst, Math.sqrt(b.vx * b.vx + b.vy * b.vy)); made++; wasRamp = false; W2.onSub = null; } else wasRamp = b.m === 'ramp' && !b.carry; };
      play(W, 200, {});
    });
    return { ok: made >= 4 && worst <= cap * 1.02 + 2, detail: made + ' of 5 hard ramp shots made, the fastest off the far end ' + worst.toFixed(0) + ' u/s (cap ' + cap.toFixed(0) + ')' };
  },
  storeys: function () {   // each storey's flippers inside its own approach zone; the zones never overlap
    var T = S.T, W = S.world(2, 3, {}), bad = [];
    T.storeys.forEach(function (s, i) {
      s.flippers.forEach(function (fi) {
        var f = T.flippers[fi], tip = { m: 'free', x: f.x + Math.cos(f.rest) * f.len, y: f.y + Math.sin(f.rest) * f.len - 10 };
        if (E.inApproach(W, tip) !== i) bad.push('flipper ' + fi + ' not in storey ' + i + "'s zone");
        if ((f.storey || 0) !== i) bad.push('flipper ' + fi + ' says storey ' + f.storey);
      });
    });
    return { ok: bad.length === 0, detail: T.storeys.map(function (s) { return s.id + ' (flippers ' + s.flippers.join(',') + ', approach y ' + s.approach + ')'; }).join('; ') + (bad.length ? ' PROBLEMS: ' + bad.join('; ') : '') };
  },
  clone: function (sp) {   // a copy steps exactly as the original (the camera's look-ahead relies on it)
    var W = E.newWorld(sp, 0, 99, S.tableId), drive = S.bot(5);
    for (var i = 0; i < 900; i++) { E.step(W, drive(W)); W.events.length = 0; }
    var C = E.clone(W), inputs = [], d2 = S.bot(77);
    for (i = 0; i < 1200; i++) { var inp = d2(W); inputs.push(inp); E.step(W, inp); W.events.length = 0; }   // the original plays on with a bot
    for (i = 0; i < 1200; i++) { E.step(C, inputs[i]); C.events.length = 0; }                              // the copy is given the same presses
    var same = JSON.stringify(W) === JSON.stringify(C);
    return { ok: same && C !== W, detail: 'a clone stepped 1,200 times with the same presses ' + (same ? 'matched to the bit' : 'DIFFERED') };
  }
};
var LISTS = {
  orbit: ['kickback', 'hangar', 'ramp', 'orbits', 'gates', 'save', 'tilt', 'extra', 'bonus', 'over', 'clone'],
  ember: ['kickback', 'ramp', 'orbits', 'gates', 'save', 'tilt', 'extra', 'bonus', 'over', 'crater', 'geyser', 'crabs', 'lava', 'quake', 'pressure', 'ladder', 'multiball', 'plug', 'rampcap', 'storeys', 'clone']
};

function all(sp) {
  var fails = 0;
  LISTS[S.tableId].forEach(function (k) {
    var r = checks[k](sp);
    if (!r.ok) fails++;
    console.log((r.ok ? 'ok   ' : 'FAIL ') + k.padEnd(9) + r.detail);
  });
  return fails;
}
if (require.main === module) process.exitCode = all(+(process.argv[2] || 2)) ? 1 : 0;
module.exports = { checks: checks, play: play, all: all, LISTS: LISTS };
