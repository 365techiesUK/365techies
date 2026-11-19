/* 365 Pinball Hero - the plunger map (15 Oct 2026). Never deployed.
 * Holds the plunger for 1..60 frames (the pull grows 1/54 a frame, so 54 frames is a full pull), lets go, and reports
 * where the launched ball first gets to: back down onto the plunger, one of the three top lanes (the skill shot),
 * a bumper, round the arch and down the left orbit, the hangar roof, the warp ramp's lane, and so on.
 * A quick tap (under 0.12 of a pull) fires the machine's own medium shot.
 *
 *   node tools/pinball/plunger.cjs [speed=2]      (Ember Peak; --orbit for the old table) */
'use strict';
var S = require('./sim.cjs'), E = S.E;

function launch(speed, frames) {
  var T = S.T, W = E.newWorld(speed, 0, 5, S.tableId);
  if (W.toys.geyser) { W.toys.geyser.st = 'cool'; W.toys.geyser.t = 1e9; }
  W.skill = 1; W.skillOpen = true;
  var res = null, top = 999, n, b, pull = 0;
  for (n = 0; n < frames; n++) { E.step(W, { fire: true }); W.events.length = 0; }
  pull = W.plunger.pull;
  for (n = 0; n < 60 * 6 && !res; n++) {
    E.step(W, {});
    if (!W.balls.length) { res = 'drain'; break; }
    b = W.balls[0];
    top = Math.min(top, b.y);
    var ev = W.events;
    for (var k = 0; k < ev.length && !res; k++) {
      var e = ev[k], nm = typeof e === 'string' ? e : e.sfx;
      if (nm === 'skill') res = 'SKILL SHOT (lane ' + W.skill + ')';
      else if (nm === 'bumper') res = 'bumper';
      else if (nm === 'rampin') res = 'ramp lane';
      else if (nm === 'saucer' || nm === 'jackpot') res = 'hangar';
      else if (nm === 'drop') res = 'drop target';
      else if (nm === 'sling') res = 'sling';
      else if (nm === 'spin') res = 'round the arch, down the left orbit';
      else if (nm === 'crater') res = 'crater';
      else if (nm === 'crab') res = 'crab';
      else if (nm === 'puff') res = 'geyser';
    }
    if (!res) {
      for (var l = 0; l < 3; l++) if (b.inside['lane' + l]) res = 'top lane ' + l;
      if (b.inside.inR) res = 'down the right orbit to the inlane';
      if (b.x > T.shooter.x0 && b.y > T.shooter.tip - 28 && b.vy > 0 && top < T.shooter.tip - 8 && Math.abs(b.vy) < 300 && n > 20) res = 'fell back to the plunger';
      var inR = T.sensors.circles.filter(function (c) { return c[0] === 'inR'; })[0];
      if (b.x < T.shooter.x0 - 4 && b.y > inR[2] + 4 && !res) res = 'down the playfield';
      if (!res && T.lava && b.x > 30 && b.x < 54 && b.y > 196 && b.y < 262) res = 'round the arch, down the left lava lane';
    }
    W.events.length = 0;
  }
  return { frames: frames, pull: pull, res: res || 'timeout', top: top };
}

function map(speed) {
  var out = [], last = '';
  for (var f = 1; f <= 60; f++) {
    var r = launch(speed, f);
    out.push(r);
    if (r.res !== last) { console.log(('hold ' + f + ' frames').padEnd(16) + (' pull ' + r.pull.toFixed(2)).padEnd(11) + ' -> ' + r.res); last = r.res; }
  }
  return out;
}
if (require.main === module) map(+(process.argv[2] || 2));
module.exports = { launch: launch, map: map };
