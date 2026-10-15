/* 365 Pinball Hero - feature checks (15 Oct 2026). Never deployed.
 * Plays out each table feature in the real engine and prints what happened: the kickback, the hangar saucer and its
 * targets, the warp ramp's return, the orbits (and a LOOP), the one-way gates, ball save, tilt, extra balls, the bonus
 * count-up and game over. engine.test.mjs asserts the same things; this prints the detail.
 *
 *   node tools/pinball/features.cjs [speed=2] */
'use strict';
var S = require('./sim.cjs'), E = S.E, T = S.T;

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

var checks = {
  kickback: function (sp) {   // a ball down the left outlane with the kickback lit comes back into play
    var W = S.world(sp, 3, { kickback: true });
    S.place(W, 16, 300, 0, 150);
    var r = play(W, 240, {}, function (W2, seen) { return !W2.balls.length || has(seen, 'inlane'); });
    var alive = W.balls.length > 0 && has(r.seen, 'inlane'), b = W.balls[0];
    var W2 = S.world(sp, 3, { kickback: false });
    S.place(W2, 16, 300, 0, 150);
    var r2 = play(W2, 240, {}, function (W3) { return !W3.balls.length; });
    return { ok: has(r.seen, 'kickback') && alive && !W.kickback && r2.stopped,
      detail: 'lit: ' + (has(r.seen, 'kickback') ? 'kicked, ' : 'NOT kicked, ') + (alive ? 'back in play: ' + b.x.toFixed(0) + ',' + b.y.toFixed(0) + ' after ' + (r.n / 60).toFixed(1) + ' s (' + r.seen.filter(function (s) { return /orbit|spin|inlane|lane|bumper|loop/.test(s); }).slice(0, 6).join(' ') + ')' : 'DRAINED') + '; unlit: ' + (r2.stopped ? 'drained' : 'still in play') };
  },
  hangar: function (sp) {   // all five down, shoot the hangar: caught, held, ejected clear, targets back up after
    var W = S.world(sp, 3, { dropsDown: true });
    W.dropsT = 0;
    S.place(W, 90, 220, -500, -700);
    var caught = -1, ejected = -1, clear = -1, reset = -1;
    play(W, 400, {}, function (W2, seen, i) {
      var b = W2.balls[0];
      if (caught < 0 && (has(seen, 'jackpot') || has(seen, 'saucer'))) caught = i;
      if (ejected < 0 && has(seen, 'eject')) ejected = i;
      if (ejected >= 0 && clear < 0 && b && !E.inPocket(b.x, b.y) && b.y > 215) clear = i;
      if (reset < 0 && has(seen, 'reset')) reset = i;
      return !W2.balls.length || reset >= 0;
    });
    // targets wait while a ball is in the way
    var W3 = S.world(sp, 3, { dropsDown: true });
    W3.dropsT = 1; S.place(W3, 75, 165, 0, 0);
    var r3 = play(W3, 3, {});
    return { ok: caught >= 0 && ejected - caught >= 70 && clear > ejected && reset > clear && !has(r3.seen, 'reset'),
      detail: 'caught at ' + caught + ', held ' + (ejected - caught) + ' frames, clear of the hangar ' + (clear - ejected) + ' frames after the eject, targets up ' + (reset - ejected) + ' frames after; with a ball in the way: ' + (has(r3.seen, 'reset') ? 'RESET ANYWAY' : 'waited') };
  },
  ramp: function (sp) {   // up the ramp lane fast: made, comes back to the left inlane and the left flipper
    var W = S.world(sp, 3, {});
    S.place(W, 120, 240, 0, -1500);
    var out = null, landed = null;
    var r = play(W, 400, {}, function (W2, seen) {
      var b = W2.balls[0]; if (!b) return true;
      if (has(seen, 'ramp') && !out) out = [b.x, b.y];
      if (out && b.y > 380 && b.x < 125 && !landed) landed = [b.x, b.y];
      return landed || (out && b.y > 446);
    });
    var W2 = S.world(sp, 3, {});
    S.place(W2, 120, 240, 0, -600);
    var r2 = play(W2, 200, {}, function (W3, seen) { return has(seen, 'rampfail'); });
    return { ok: !!out && has(r.seen, 'inlane') && !!landed && !has(r.seen, 'outlane') && r2.stopped,
      detail: (out ? 'made, off the ramp at ' + out.map(Math.round) : 'NOT made') + (has(r.seen, 'inlane') ? ', through the left inlane' : ', MISSED the inlane') + (landed ? ', on to the left flipper at ' + landed.map(Math.round) : ', NEVER reached the flipper') + '; slow shot ' + (r2.stopped ? 'rolls back' : 'did NOT roll back') };
  },
  orbits: function (sp) {   // up the left orbit, round the arch, down the right orbit into the right inlane; then a LOOP
    var W = S.world(sp, 3, {});
    S.place(W, 18, 240, 0, -1300);
    var path = [];
    var r = play(W, 400, {}, function (W2, seen) {
      var b = W2.balls[0]; if (!b) return true;
      if (path.length < 6 && seen.length && path[path.length - 1] !== seen[seen.length - 1]) path.push(seen[seen.length - 1]);
      return has(seen, 'inlane') || b.y > 400;
    });
    var side = W.balls[0] ? (W.balls[0].x > T.MID ? 'right' : 'left') : 'drained';
    var W2 = S.world(sp, 3, {});
    S.place(W2, 18, 240, 0, -1300);
    var r2 = play(W2, 300, function (W3, i) { if (i === 40) { W3.balls.length = 0; S.place(W3, 232, 240, 0, -1300); } return {}; }, function (W3, seen) { return has(seen, 'loop'); });
    return { ok: has(r.seen, 'orbit') && has(r.seen, 'inlane') && side === 'right' && r2.stopped,
      detail: 'left orbit shot: ' + r.seen.filter(function (s) { return /orbit|spin|inlane|outlane|loop|lane|bumper/.test(s); }).filter(function (s, i, a) { return a.indexOf(s) === i; }).join(' > ') + ', ends in the ' + side + ' inlane; up left then up right inside 3 s: ' + (r2.stopped ? 'LOOP' : 'no loop') };
  },
  gates: function (sp) {   // one-way gates: nothing rests on the shooter gate or gets into the lane from above; orbit feet
    var W = S.world(sp, 3, {}), bad = 0, n = 0;
    for (var x = 246; x <= 262; x += 2) {
      W = S.world(sp, 3, {}); S.place(W, x, 110, -30 + (x - 246) * 4, 200); n++;
      var r = play(W, 300, {}, function (W2) { var b = W2.balls[0]; return !b || b.y > 300; });
      var b = W.balls[0]; if (!b || b.x > T.shooter.x0) bad++;
    }
    // a ball coming down the left orbit goes to the inlane, not the outlane
    var inl = 0, m = 0;
    for (var v = 100; v <= 900; v += 200) for (var xx = 16; xx <= 20; xx += 2) {
      var W3 = S.world(sp, 3, { kickback: false }); S.place(W3, xx, 200, 0, v); m++;
      var r3 = play(W3, 200, {}, function (W4, seen) { return has(seen, 'inlane') || has(seen, 'outlane') || !W4.balls.length; });
      if (has(r3.seen, 'inlane')) inl++;
    }
    return { ok: bad === 0 && inl === m, detail: 'balls dropped on the shooter gate: ' + (n - bad) + '/' + n + ' rolled off into the right orbit; down the left orbit: ' + inl + '/' + m + ' into the inlane' };
  },
  save: function (sp) {   // launch, drain straight away: saved, new ball fires itself
    var W = E.newWorld(sp, 0, 3);
    var r = play(W, 600, function (W2, i) { return { fire: i < 30 }; }, function (W2) { return W2.balls.length && W2.balls[0].launched && W2.balls[0].y < 140; });
    W.balls[0].x = 125; W.balls[0].y = 430; W.balls[0].vx = 0; W.balls[0].vy = 300;
    var r2 = play(W, 400, {}, function (W2, seen) { return has(seen, 'save'); });
    var ballNo = W.ball;
    var r3 = play(W, 200, {}, function (W2, seen) { return has(seen, 'launch'); });
    return { ok: r2.stopped && r3.stopped && ballNo === 1 && W.state === 'play', detail: (r2.stopped ? 'saved' : 'NOT saved') + ', still ball ' + ballNo + ', the new ball ' + (r3.stopped ? 'fired itself after ' + r3.n + ' frames' : 'did NOT fire') };
  },
  tilt: function (sp) {
    var W = E.newWorld(sp, 0, 3);
    play(W, 80, function (W2, i) { return { fire: i < 40 }; });
    var seen = [];
    for (var k = 0; k < 6; k++) { var r = play(W, 6, function (W2, i) { return { up: i === 0 }; }); seen = seen.concat(r.seen); }
    var tilted = W.tilted, f0 = W.flippers[0].a;
    play(W, 10, { left: true });
    var dead = W.flippers[0].a === f0;
    return { ok: has(seen, 'warn') && has(seen, 'tilt') && tilted && dead, detail: 'nudges: ' + seen.filter(function (s) { return /nudge|warn|tilt/.test(s); }).join(' ') + '; flippers ' + (dead ? 'dead' : 'STILL WORK') };
  },
  extra: function (sp) {
    var W = E.newWorld(sp, 0, 3), t0 = W.total, at = E.SPEEDS[sp].extra[0];
    W.score = at - 50; S.place(W, 180, 170, 0, 0);   // a ball onto a bumper scores 100
    W.balls.shift();
    var r = play(W, 30, {}, function (W2, seen) { return has(seen, 'extra'); });
    return { ok: r.stopped && W.total === t0 + 1, detail: 'at ' + E.fmt(at) + ': ' + (r.stopped ? 'extra ball, ' + t0 + ' -> ' + W.total + ' balls' : 'NO extra ball') };
  },
  bonus: function (sp) {
    var W = E.newWorld(sp, 0, 3);
    W.bonus = 12300; W.mult = 3; W.balls.length = 0;
    var s0 = W.score;
    var r = play(W, 600, {}, function (W2, seen) { return has(seen, 'newball'); });
    return { ok: r.stopped && W.score - s0 === 36900 && W.ball === 2 && W.mult === 1, detail: 'bonus 12,300 x 3 counted up to ' + E.fmt(W.score - s0) + ' in ' + r.n + ' frames, then ball ' + W.ball };
  },
  over: function (sp) {
    var W = E.newWorld(sp, 0, 3), n = 0;
    while (!W.over && n < 20) { W.balls.length = 0; play(W, 600, {}, function (W2, seen) { return has(seen, 'newball') || has(seen, 'over'); }); n++; }
    return { ok: W.over && W.state === 'over' && n === E.SPEEDS[sp].balls, detail: 'game over after ' + n + ' drained balls (' + E.SPEEDS[sp].balls + ' a game)' };
  }
};

function all(sp) {
  var fails = 0;
  Object.keys(checks).forEach(function (k) {
    var r = checks[k](sp);
    if (!r.ok) fails++;
    console.log((r.ok ? 'ok   ' : 'FAIL ') + k.padEnd(9) + r.detail);
  });
  return fails;
}
if (require.main === module) process.exitCode = all(+(process.argv[2] || 2)) ? 1 : 0;
module.exports = { checks: checks, play: play, all: all };
