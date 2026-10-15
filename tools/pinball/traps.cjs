/* 365 Pinball Hero - the trap finder (15 Oct 2026). Never deployed.
 * Drops thousands of balls at random free spots of the playfield with random speeds and lets the auto-flipper bot
 * (sim.cjs) play each one for up to 20 seconds. Reports every place a ball comes to rest or circles without scoring,
 * gets stuck inside a wall, goes through a wall or a one-way gate the wrong way, leaves the table anywhere but the
 * drain, and how often the engine's "ball search" shake had to fire. Writes overlay.js so view.html can show the spots.
 *
 *   node tools/pinball/traps.cjs [balls=3000] [secs=20] [workers=16]
 *   node tools/pinball/traps.cjs --one <ball number>      (replay one ball and print its path; also drawn by view.html)
 *   node tools/pinball/traps.cjs --corners                (slow balls let go around every named corner)
 *   node tools/pinball/traps.cjs --games [n=60]           (whole games played by the bot: searches a minute) */
'use strict';
var path = require('path'), fs = require('fs');
var wt = require('worker_threads');
var S = require('./sim.cjs'), E = S.E, T = S.T;

function oneBall(i, secs, trace) {
  var seed = 1000 + i * 7919, r = S.lcg(seed), speed = 1 + (i % 3);
  var W = S.world(speed, seed, { kickback: r() < 0.5, dropsDown: i % 4 === 3 });
  var x, y, tries = 0;
  do { x = 15 + r() * 245; y = 10 + r() * 430; tries++; } while (!S.freeSpot(W, x, y) && tries < 5000);
  var ang = r() * Math.PI * 2, v = r() * r() * 1500;
  var b = S.place(W, x, y, Math.cos(ang) * v, Math.sin(ang) * v);
  var out = { i: i, speed: speed, start: [x, y, b.vx, b.vy], traps: [], searches: 0, drained: null, steps: 0, scored: 0 };
  var seen = {};
  function log(type, ball, what) {
    var key = type + what;
    if (seen[key]) return;   // once per ball per kind
    seen[key] = 1;
    out.traps.push({ type: type, x: +ball.x.toFixed(1), y: +ball.y.toFixed(1), px: +ball.px.toFixed(1), py: +ball.py.toFixed(1), what: what, t: W.frame });
  }
  S.watch(W, log);
  var drive = S.bot(seed + 1);
  var hist = [], lastScore = W.score, quiet = 0, last = [x, y], pts = trace ? [] : null;
  var recent = [];   // [frame, event] for the scoring events that must never repeat in a tight loop
  out.steps = S.run(W, secs * 60, drive, function (W2) {
    var ev = W2.events;
    for (var k = 0; k < ev.length; k++) {
      var nm = typeof ev[k] === 'string' ? ev[k] : ev[k].sfx;
      if (/^(saucer|jackpot|ramp|combo|orbit|loop|drops|kickback|skill|bumper)$/.test(nm)) {
        recent.push([W2.frame, nm]);
        while (recent.length && recent[0][0] < W2.frame - 120) recent.shift();
        var same = recent.filter(function (r) { return r[1] === nm; }).length;
        if (same > (nm === 'bumper' ? 40 : 3)) { var b0 = W2.balls[0] || { x: last[0], y: last[1], px: 0, py: 0 }; log('rapid', b0, nm); }
      }
      if (ev[k] === 'search') { out.searches++; log('search', W2.balls[0] || { x: last[0], y: last[1], px: 0, py: 0 }, ''); seen['search'] = 0; }
      if (ev[k] === 'drain') out.drained = { x: +last[0].toFixed(1), y: +last[1].toFixed(1) };
    }
    var bb = W2.balls[0];
    if (!bb) return;
    last = [bb.x, bb.y];
    if (pts) pts.push([+bb.x.toFixed(1), +bb.y.toFixed(1)]);
    if (W2.score !== lastScore) { lastScore = W2.score; quiet = 0; hist.length = 0; return; }
    if (bb.y < 360) quiet++;
    if (quiet === 600) log('quiet', bb, '');   // ten seconds without a single point, away from the flippers
    var cradled = (W2.flippers[0].on || W2.flippers[1].on) && bb.y > 360;
    if (bb.m !== 'free' || bb.x > T.shooter.x0 || cradled) { hist.length = 0; return; }
    hist.push(bb.x, bb.y);
    if (hist.length > 480) hist.splice(0, 2);
    if (hist.length === 480) {   // four quiet seconds in a small space: circling or resting
      var x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (var j = 0; j < hist.length; j += 2) { x0 = Math.min(x0, hist[j]); x1 = Math.max(x1, hist[j]); y0 = Math.min(y0, hist[j + 1]); y1 = Math.max(y1, hist[j + 1]); }
      if (x1 - x0 < 24 && y1 - y0 < 24) { log('circling', bb, ''); hist.length = 0; }
    }
  });
  out.scored = W.score;
  if (out.drained) {
    var dx = out.drained.x;
    out.drainKind = dx > T.shooter.x0 ? 'shooter' : dx < 30 ? 'outL' : dx > 220 ? 'outR' : 'middle';
    if (out.drainKind === 'shooter') out.traps.push({ type: 'baddrain', x: dx, y: out.drained.y, what: 'shooter lane', t: W.frame });
  }
  if (trace) out.path = pts;
  return out;
}

function summarise(res, secs) {
  var types = {}, cells = {}, drains = {}, totalSteps = 0, searches = 0, n = res.length;
  res.forEach(function (o) {
    totalSteps += o.steps; searches += o.searches;
    if (o.drainKind) drains[o.drainKind] = (drains[o.drainKind] || 0) + 1; else drains.alive = (drains.alive || 0) + 1;
    o.traps.forEach(function (t) {
      types[t.type] = (types[t.type] || 0) + 1;
      var key = t.type + ' @' + Math.round(t.x / 8) * 8 + ',' + Math.round(t.y / 8) * 8 + (t.what ? ' ' + t.what.replace(/ [\d.]+$/, '') : '');
      if (!cells[key]) cells[key] = { n: 0, balls: [] };
      cells[key].n++; if (cells[key].balls.length < 4) cells[key].balls.push(o.i);
    });
  });
  var mins = totalSteps / 3600;
  console.log('balls ' + n + ', ' + (totalSteps / 60).toFixed(0) + ' ball-seconds simulated (' + secs + ' s max each)');
  console.log('ends: ' + JSON.stringify(drains));
  console.log('ball searches: ' + searches + ' (' + (searches / mins).toFixed(3) + ' a ball-minute)');
  console.log('problems by kind: ' + JSON.stringify(types));
  var keys = Object.keys(cells).sort(function (a, b) { return cells[b].n - cells[a].n; });
  keys.slice(0, 40).forEach(function (k) { console.log('  ' + String(cells[k].n).padStart(4) + '  ' + k + '   e.g. ball ' + cells[k].balls.join(', ')); });
  var col = { rapid: '#08f', quiet: '#888', search: '#ff0', circling: '#f0f', inside: '#f00', tunnel: '#f80', gate: '#0ff', droptunnel: '#fa0', escaped: '#fff', baddrain: '#0f0' };
  var dots = [];
  res.forEach(function (o) { o.traps.forEach(function (t) { dots.push([t.x, t.y, col[t.type] || '#f00', 1.6]); }); });
  fs.writeFileSync(path.join(__dirname, 'overlay.js'), 'window.OVERLAY = ' + JSON.stringify({ dots: dots.slice(0, 20000) }) + ';\n');
  return { types: types, searches: searches, perMin: searches / mins, drains: drains };
}

// the named corners: a fine grid of slow balls let go around each one with the flippers left alone (and again with
// them held up). Every ball must leave the spot (drain, or come to rest on a raised flipper) within 3 seconds.
var CORNERS = {
  'roof / left orbit top': [30, 148], 'ramp lane top (left wall)': [106, 130], 'ramp lane top (right wall)': [134, 150],
  'ramp lane mouth': [120, 222], 'shooter gate (top of the lane)': [255, 140], 'right orbit wall top': [220, 148],
  'left orbit foot gate': [20, 285], 'right orbit foot gate': [230, 285], 'left outlane/inlane post': [27, 314],
  'right outlane/inlane post': [223, 314], 'left inlane floor -> flipper': [66, 392], 'right inlane floor -> flipper': [184, 392],
  'left inlane guide top': [46, 280], 'right inlane guide top': [204, 280], 'left sling top': [49, 312], 'right sling top': [201, 312], 'left sling foot': [72, 372], 'right sling foot': [178, 372],
  'between the bumpers': [178, 136], 'bumper / top lanes': [190, 96], 'top lanes': [182, 72],
  'drop targets, left end': [40, 210], 'drop targets, right end': [100, 170], 'hangar (targets up)': [70, 160],
  'arch top': [136, 20], 'arch right shoulder': [240, 60], 'arch left shoulder': [30, 60]
};
function corners() {
  var bad = [], n = 0;
  Object.keys(CORNERS).forEach(function (name) {
    var c = CORNERS[name];
    [false, true].forEach(function (held) {
      [false, true].forEach(function (down) {
        for (var dx = -24; dx <= 24; dx += 2) for (var dy = -24; dy <= 24; dy += 2) {
          var W = S.world(2, 7, { kickback: false, dropsDown: down });
          var x = c[0] + dx, y = c[1] + dy;
          if (!S.freeSpot(W, x, y)) { if (!(down && E.inPocket(x, y))) continue; if (S.overlap(W, x, y).pen > -0.5) continue; }
          var b = S.place(W, x, y, 0, 0); n++;
          var still = 0, stuck = null;
          S.run(W, 60 * 8, function () { return { left: held, right: held }; }, function (W2) {
            var bb = W2.balls[0]; if (!bb) return false;
            if (W2.events.indexOf('search') >= 0) { stuck = [bb.x, bb.y]; return false; }
            var onFlipper = held && bb.y > 360;
            if (bb.m === 'free' && !onFlipper && Math.abs(bb.vx) + Math.abs(bb.vy) < 20) still++; else still = 0;
            if (still > 120) { stuck = [bb.x, bb.y]; return false; }
          });
          if (stuck) bad.push(name + (held ? ' (flippers up)' : '') + (down ? ' (targets down)' : '') + ': from ' + x + ',' + y + ' rests at ' + stuck[0].toFixed(1) + ',' + stuck[1].toFixed(1));
        }
      });
    });
  });
  console.log(n + ' slow balls around ' + Object.keys(CORNERS).length + ' corners; ' + bad.length + ' came to rest');
  var by = {};
  bad.forEach(function (l) { var k = l.replace(/: from .*rests at /, ' -> ').replace(/\.\d/g, ''); by[k] = (by[k] || 0) + 1; });
  Object.keys(by).sort(function (a, b) { return by[b] - by[a]; }).slice(0, 40).forEach(function (k) { console.log('  ' + String(by[k]).padStart(4) + '  ' + k); });
  return bad;
}

// whole games, served and plunged by the bot, start to game over (or 10 minutes): how often does the ball search fire?
function games(n) {
  var tot = { games: 0, secs: 0, searches: 0, scores: [], at: [], balls: 0, saves: 0, tilts: 0, ramps: 0, orbits: 0, loops: 0, saucers: 0, skill: 0, kickbacks: 0 };
  for (var g = 0; g < n; g++) {
    var W = E.newWorld(1 + (g % 3), 0, 77 + g * 31), drive = S.bot(9000 + g), steps = 0;
    while (!W.over && steps < 60 * 600) {
      E.step(W, drive(W)); steps++;
      for (var k = 0; k < W.events.length; k++) if (W.events[k] === 'search') { tot.searches++; if (W.balls[0]) tot.at.push([Math.round(W.balls[0].x), Math.round(W.balls[0].y)]); }
      W.events.length = 0;
    }
    tot.games++; tot.secs += steps / 60; tot.scores.push(W.score); tot.balls += W.total;
    ['saves', 'tilts', 'ramps', 'orbits', 'loops', 'saucers', 'skill', 'kickbacks'].forEach(function (q) { tot[q] += W.stats[q]; });
  }
  tot.scores.sort(function (a, b) { return a - b; });
  console.log(tot.games + ' bot games, ' + (tot.secs / 60).toFixed(0) + ' minutes of play: ' + tot.searches + ' ball searches (' + (tot.searches / (tot.secs / 60)).toFixed(3) + ' a minute)' + (tot.at.length ? ' at ' + JSON.stringify(tot.at.slice(0, 12)) : ''));
  console.log('  median score ' + E.fmt(tot.scores[tot.scores.length >> 1]) + ', a game lasts ' + (tot.secs / tot.games).toFixed(0) + ' s; per game: ramps ' + (tot.ramps / tot.games).toFixed(1) + ', orbits ' + (tot.orbits / tot.games).toFixed(1) + ', loops ' + (tot.loops / tot.games).toFixed(2) + ', hangar ' + (tot.saucers / tot.games).toFixed(1) + ', skill shots ' + (tot.skill / tot.games).toFixed(2) + ', kickbacks ' + (tot.kickbacks / tot.games).toFixed(1) + ', saves ' + (tot.saves / tot.games).toFixed(1));
  return tot;
}

if (wt.isMainThread && require.main === module) {
  var args = process.argv.slice(2);
  if (args[0] === '--corners') corners();
  else if (args[0] === '--games') games(+(args[1] || 60));
  else if (args[0] === '--one') {
    var o = oneBall(+args[1], +(args[2] || 20), true);
    console.log(JSON.stringify({ i: o.i, speed: o.speed, start: o.start, traps: o.traps, searches: o.searches, drained: o.drained, steps: o.steps, scored: o.scored }));
    var p = o.path, every = Math.max(1, Math.floor(p.length / 60));
    for (var k = 0; k < p.length; k += every) process.stdout.write(k + ':' + p[k][0] + ',' + p[k][1] + '  ');
    console.log();
    fs.writeFileSync(path.join(__dirname, 'overlay.js'), 'window.OVERLAY = ' + JSON.stringify({ paths: [{ pts: p, col: 'rgba(255,255,0,0.7)', w: 0.5 }], dots: o.traps.map(function (t) { return [t.x, t.y, '#f00', 2]; }).concat([[o.start[0], o.start[1], '#0f0', 2.5]]) }) + ';\n');
  } else {
    var N = +(args[0] || 3000), secs = +(args[1] || 20), nw = +(args[2] || 16), t0 = Date.now();
    var res = [], done = 0;
    for (var w = 0; w < nw; w++) {
      var wk = new wt.Worker(__filename, { workerData: { from: Math.floor(N * w / nw), to: Math.floor(N * (w + 1) / nw), secs: secs } });
      wk.on('message', function (m) { res = res.concat(m); });
      wk.on('exit', function () {
        if (++done < nw) return;
        res.sort(function (a, b) { return a.i - b.i; });
        summarise(res, secs);
        console.log('took ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s');
      });
    }
  }
} else if (!wt.isMainThread) {
  var d = wt.workerData, out = [];
  for (var i = d.from; i < d.to; i++) out.push(oneBall(i, d.secs, false));
  wt.parentPort.postMessage(out);
}

module.exports = { oneBall: oneBall, corners: corners, games: games, CORNERS: CORNERS };
