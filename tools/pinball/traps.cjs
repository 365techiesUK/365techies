/* 365 Pinball Hero - the trap finder (15 Oct 2026; any table, 16 Oct 2026). Never deployed.
 * Drops thousands of balls at random free spots of the playfield with random speeds and lets the auto-flipper bot
 * (sim.cjs) play each one for up to 20 seconds. Reports every place a ball comes to rest or circles without scoring,
 * gets stuck inside a wall, goes through a wall or a one-way gate the wrong way, leaves the table anywhere but the
 * drain, and how often the engine's "ball search" shake had to fire. It also checks the storeys: every time a ball
 * reaches a flipper it must be inside that flipper's storey's approach zone, and it reports how long before the touch
 * the ball crossed the approach line; and a quake must never pull while a ball is in an approach zone.
 * Writes overlay.js so view.html can show the spots.
 *
 *   node tools/pinball/traps.cjs [balls=3000] [secs=20] [workers=16]       (Ember Peak; --orbit for the old table)
 *   node tools/pinball/traps.cjs --one <ball number>      (replay one ball and print its path; also drawn by view.html)
 *   node tools/pinball/traps.cjs --corners                (slow balls let go around every named corner)
 *   node tools/pinball/traps.cjs --games [n=60]           (whole games played by the bot: searches a minute) */
'use strict';
var path = require('path'), fs = require('fs');
var wt = require('worker_threads');
var S = require('./sim.cjs'), E = S.E;

function oneBall(i, secs, trace) {
  var T = S.T, seed = 1000 + i * 7919, r = S.lcg(seed), speed = 1 + (i % 3);
  var W = S.world(speed, seed, { kickback: r() < 0.5, dropsDown: i % 4 === 3, lava: i % 5 === 4, plug: i % 6 === 2 });   // (wave 3: some with the plug up)
  var x, y, tries = 0;
  do { x = 15 + r() * 245; y = 10 + r() * (T.H - 16); tries++; } while (!S.freeSpot(W, x, y) && tries < 5000);
  var ang = r() * Math.PI * 2, v = r() * r() * 1500;
  var b = S.place(W, x, y, Math.cos(ang) * v, Math.sin(ang) * v);
  if (i % 7 === 6 && W.toys.quake) W.toys.quake.pending = true;   // some balls get a quake as soon as it may come
  if (i % 6 === 5 && W.press) E.api.multiball(W, 3, { save: 0 });   // and some start a 3-ball multiball (two more fed from the shooter lane)
  var out = { i: i, speed: speed, start: [x, y, b.vx, b.vy], traps: [], searches: 0, drained: null, steps: 0, scored: 0, leads: [], touches: 0 };
  var seen = {};
  function log(type, ball, what) {
    var key = type + what;
    if (seen[key]) return;   // once per ball per kind
    seen[key] = 1;
    out.traps.push({ type: type, x: +ball.x.toFixed(1), y: +ball.y.toFixed(1), px: +(ball.px || 0).toFixed(1), py: +(ball.py || 0).toFixed(1), what: what, t: W.frame });
  }
  S.watch(W, log);
  // the storeys: when did the ball last cross into an approach zone, and is every flipper touch inside its storey's zone?
  var watcher = W.onSub, subs = 0, zone = E.inApproach(W, b), since = zone >= 0 ? -1 : 0, touching = [], wasFree = {};
  W.onSub = function (W2) {
    watcher(W2); subs++;
    var bb = W2.balls[0];
    if (!bb) return;
    // (the engine looks before each substep's move, so check where the balls were then - and only balls that were free
    // then: one let go from a hole or a ramp this substep was not being pulled)
    if (W2.toys.quake && W2.toys.quake.gx !== 0 && W2.balls.some(function (o) { return wasFree[o.id] && E.inApproach(W2, { m: o.m, x: o.px, y: o.py }) >= 0; })) log('quake', bb, 'pulling with a ball in an approach zone');
    W2.balls.forEach(function (o) { wasFree[o.id] = o.m === 'free'; });
    var z = E.inApproach(W2, bb);
    // (an arrival counts from crossing the approach line going down; a ball coming up from below into a storey's zone,
    // e.g. up through the summit's flippers from the shore, is moving away from trouble)
    if (z !== zone) { zone = z; since = z >= 0 && bb.vy > 0 && bb.py < W2.storeys[z].approach + 1 ? subs : 0; }
    for (var f = 0; f < W2.flippers.length; f++) {
      var on = bb.m === 'free' && S.flipperDist(W2.flippers[f], bb.x, bb.y) < S.BR + 0.6;
      if (on && !touching[f]) {
        out.touches++;
        var st = W2.flippers[f].storey;
        if (z !== st) log('approach', bb, 'flipper ' + f + ' touched from outside its approach zone (zone ' + z + ')');
        else if (since > 0) { out.leads.push([st, (subs - since) / 600]); since = -1; }
      }
      touching[f] = on;
    }
  };
  var drive = S.bot(seed + 1);
  var hist = [], lastScore = W.score, quiet = 0, last = [x, y], pts = trace ? [] : null;
  var recent = [], pos = {};   // [frame, event] for the scoring events that must never repeat in a tight loop; where each ball was
  out.steps = S.run(W, secs * 60, drive, function (W2) {
    var ev = W2.events;
    for (var k = 0; k < ev.length; k++) {
      var nm = typeof ev[k] === 'string' ? ev[k] : ev[k].sfx;
      if (/^(saucer|jackpot|ramp|combo|orbit|loop|drops|kickback|skill|bumper|crater|geyser|crab|lava)$/.test(nm)) {
        recent.push([W2.frame, nm]);
        while (recent.length && recent[0][0] < W2.frame - 120) recent.shift();
        var same = recent.filter(function (q) { return q[1] === nm; }).length;
        if (same > (nm === 'bumper' ? 40 : 3)) { var b0 = W2.balls[0] || { x: last[0], y: last[1], px: 0, py: 0 }; log('rapid', b0, nm); }
      }
      if (ev[k] === 'search') { out.searches++; log('search', W2.balls[0] || { x: last[0], y: last[1], px: 0, py: 0 }, ''); seen['search'] = 0; }
      if (ev[k] === 'drain') {   // (in a multiball: the ball that has gone, where it was last seen)
        var gone = last;
        Object.keys(pos).forEach(function (id) { if (!W2.balls.some(function (o) { return o.id === +id; })) gone = pos[id]; });
        out.drained = { x: +gone[0].toFixed(1), y: +gone[1].toFixed(1) };
      }
    }
    pos = {}; W2.balls.forEach(function (o) { pos[o.id] = [o.x, o.y]; });
    var bb = W2.balls[0];
    if (!bb) return;
    last = [bb.x, bb.y];
    if (pts) pts.push([+bb.x.toFixed(1), +bb.y.toFixed(1)]);
    if (W2.score !== lastScore) { lastScore = W2.score; quiet = 0; hist.length = 0; return; }
    if (E.inApproach(W2, bb) < 0) quiet++;
    if (quiet === 600) log('quiet', bb, '');   // ten seconds without a single point, away from the flippers
    var cradled = E.nearRaisedFlipper(W2, bb);
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
  var types = {}, cells = {}, drains = {}, totalSteps = 0, searches = 0, n = res.length, leads = [], touches = 0, byStorey = {};
  res.forEach(function (o) {
    totalSteps += o.steps; searches += o.searches; touches += o.touches;
    o.leads.forEach(function (l) { leads.push(l[1]); (byStorey[l[0]] = byStorey[l[0]] || []).push(l[1]); });
    if (o.drainKind) drains[o.drainKind] = (drains[o.drainKind] || 0) + 1; else drains.alive = (drains.alive || 0) + 1;
    o.traps.forEach(function (t) {
      types[t.type] = (types[t.type] || 0) + 1;
      var key = t.type + ' @' + Math.round(t.x / 8) * 8 + ',' + Math.round(t.y / 8) * 8 + (t.what ? ' ' + t.what.replace(/ [\d.]+$/, '') : '');
      if (!cells[key]) cells[key] = { n: 0, balls: [] };
      cells[key].n++; if (cells[key].balls.length < 4) cells[key].balls.push(o.i);
    });
  });
  var mins = totalSteps / 3600;
  leads.sort(function (a, b) { return a - b; });
  console.log('table ' + S.tableId + ': balls ' + n + ', ' + (totalSteps / 60).toFixed(0) + ' ball-seconds simulated (' + secs + ' s max each)');
  console.log('ends: ' + JSON.stringify(drains));
  console.log('ball searches: ' + searches + ' (' + (searches / mins).toFixed(3) + ' a ball-minute)');
  console.log('flipper touches ' + touches + '; from crossing the approach line to the touch: min ' + (leads[0] || 0).toFixed(3) + ' s, 1% ' + (leads[Math.floor(leads.length * 0.01)] || 0).toFixed(3) + ' s, median ' + (leads[leads.length >> 1] || 0).toFixed(3) + ' s (' + leads.length + ' arrivals)');
  Object.keys(byStorey).forEach(function (k) {
    var L = byStorey[k].sort(function (a, b) { return a - b; }), q = function (f) { return (L[Math.floor(L.length * f)] || 0).toFixed(3); };
    console.log('  storey ' + k + ' (' + S.T.storeys[k].id + ', approach y ' + S.T.storeys[k].approach + '): ' + L.length + ' arrivals, min ' + L[0].toFixed(3) + ' s, 1% ' + q(0.01) + ', 5% ' + q(0.05) + ', median ' + q(0.5));
  });
  console.log('problems by kind: ' + JSON.stringify(types));
  var keys = Object.keys(cells).sort(function (a, b) { return cells[b].n - cells[a].n; });
  keys.slice(0, 40).forEach(function (k) { console.log('  ' + String(cells[k].n).padStart(4) + '  ' + k + '   e.g. ball ' + cells[k].balls.join(', ')); });
  var col = { rapid: '#08f', quiet: '#888', search: '#ff0', circling: '#f0f', inside: '#f00', tunnel: '#f80', gate: '#0ff', droptunnel: '#fa0', escaped: '#fff', baddrain: '#0f0', approach: '#f08', quake: '#80f' };
  var dots = [];
  res.forEach(function (o) { o.traps.forEach(function (t) { dots.push([t.x, t.y, col[t.type] || '#f00', 1.6]); }); });
  fs.writeFileSync(path.join(__dirname, 'overlay.js'), 'window.OVERLAY = ' + JSON.stringify({ table: S.tableId, dots: dots.slice(0, 20000) }) + ';\n');
  return { types: types, searches: searches, perMin: searches / mins, drains: drains, leads: leads };
}

// the named corners: a fine grid of slow balls let go around each one with the flippers left alone (and again with
// them held up). Every ball must leave the spot (drain, or come to rest on a raised flipper) within 2 seconds.
var CORNERS = {
  orbit: {
    'roof / left orbit top': [30, 148], 'ramp lane top (left wall)': [106, 130], 'ramp lane top (right wall)': [134, 150],
    'ramp lane mouth': [120, 222], 'shooter gate (top of the lane)': [255, 140], 'right orbit wall top': [220, 148],
    'left orbit foot gate': [20, 285], 'right orbit foot gate': [230, 285], 'left outlane/inlane post': [27, 314],
    'right outlane/inlane post': [223, 314], 'left inlane floor -> flipper': [66, 392], 'right inlane floor -> flipper': [184, 392],
    'left inlane guide top': [46, 280], 'right inlane guide top': [204, 280], 'left sling top': [49, 312], 'right sling top': [201, 312], 'left sling foot': [72, 372], 'right sling foot': [178, 372],
    'between the bumpers': [178, 136], 'bumper / top lanes': [190, 96], 'top lanes': [182, 72],
    'drop targets, left end': [40, 210], 'drop targets, right end': [100, 170], 'hangar (targets up)': [70, 160],
    'arch top': [136, 20], 'arch right shoulder': [240, 60], 'arch left shoulder': [30, 60]
  },
  ember: {
    'arch top': [136, 20], 'arch right shoulder': [240, 60], 'arch left shoulder': [30, 60], 'shooter gate (top of the lane)': [255, 140],
    'top lanes': [182, 72], 'fumarole / top lanes': [190, 96], 'between the fumaroles': [178, 136],
    'volcano top': [84, 90], 'volcano left': [56, 124], 'volcano right': [112, 124], 'volcano mouth': [84, 148],
    'left lava lane top': [42, 150], 'right lava lane top': [208, 150], 'left lava gate': [42, 226], 'right lava gate': [208, 226],
    'left lava wall foot': [58, 226], 'right lava wall foot': [192, 226], 'inside the left lava lane': [42, 200], 'inside the right lava lane': [208, 200],
    'crab A': [137, 150], 'crab B': [85, 252], 'the vent': [175, 204], 'geyser': [104, 204],
    'ramp lane top (left wall)': [128, 200], 'ramp lane top (right wall)': [154, 208], 'ramp lane mouth': [141, 252],
    'drop targets, left end': [158, 232], 'drop targets, right end': [190, 244], 'behind the drop targets': [172, 228],
    'left orbit wall foot': [30, 238], 'right orbit wall foot': [220, 238],
    'left orbit foot gate': [20, 283], 'right orbit foot gate': [230, 283], 'left outlane/inlane post': [27, 338], 'right outlane/inlane post': [223, 338],
    'left inlane floor -> flipper': [66, 416], 'right inlane floor -> flipper': [184, 416], 'left inlane guide top': [46, 304], 'right inlane guide top': [204, 304],
    'left sling top': [49, 336], 'right sling top': [201, 336], 'left sling foot': [72, 396], 'right sling foot': [178, 396],
    'the plug (up with the targets down)': [125, 440]
  }
};
function corners() {
  var bad = [], n = 0, C = CORNERS[S.tableId];
  Object.keys(C).forEach(function (name) {
    var c = C[name];
    [false, true].forEach(function (held) {
      [false, true].forEach(function (down) {
        for (var dx = -24; dx <= 24; dx += 2) for (var dy = -24; dy <= 24; dy += 2) {
          var W = S.world(2, 7, { kickback: false, dropsDown: down, lava: down, noGeyser: !down, plug: down });
          var x = c[0] + dx, y = c[1] + dy;
          if (!S.freeSpot(W, x, y)) { if (!(down && E.inPocket(x, y, W.tableId))) continue; if (S.overlap(W, x, y).pen > -0.5) continue; }
          S.place(W, x, y, 0, 0); n++;
          var still = 0, stuck = null;
          S.run(W, 60 * 8, function () { return { left: held, right: held }; }, function (W2) {
            var bb = W2.balls[0]; if (!bb) return false;
            if (W2.events.indexOf('search') >= 0) { stuck = [bb.x, bb.y]; return false; }
            var onFlipper = held && E.nearRaisedFlipper(W2, bb);
            if (bb.m === 'free' && !onFlipper && Math.abs(bb.vx) + Math.abs(bb.vy) < 20) still++; else still = 0;
            if (still > 120) { stuck = [bb.x, bb.y]; return false; }
          });
          if (stuck) bad.push(name + (held ? ' (flippers up)' : '') + (down ? ' (targets down, gates up, plug up)' : '') + ': from ' + x + ',' + y + ' rests at ' + stuck[0].toFixed(1) + ',' + stuck[1].toFixed(1));
        }
      });
    });
  });
  console.log(n + ' slow balls around ' + Object.keys(C).length + ' corners; ' + bad.length + ' came to rest');
  var by = {};
  bad.forEach(function (l) { var k = l.replace(/: from .*rests at /, ' -> ').replace(/\.\d/g, ''); by[k] = (by[k] || 0) + 1; });
  Object.keys(by).sort(function (a, b) { return by[b] - by[a]; }).slice(0, 40).forEach(function (k) { console.log('  ' + String(by[k]).padStart(4) + '  ' + k); });
  return bad;
}

// whole games, served and plunged by the bot, start to game over (or 10 minutes): how often does the ball search fire?
function games(n, quiet) {
  var Q = ['saves', 'tilts', 'ramps', 'orbits', 'loops', 'saucers', 'skill', 'kickbacks', 'craters', 'eruptions', 'geysers', 'crabs', 'lava', 'quakes', 'bumpers', 'drops', 'multiballs', 'jackpots', 'supers', 'locks', 'plugSaves'];
  var tot = { games: 0, secs: 0, searches: 0, scores: [], at: [], balls: 0 };
  Q.forEach(function (q) { tot[q] = 0; });
  for (var g = 0; g < n; g++) {
    var W = E.newWorld(1 + (g % 3), 0, 77 + g * 31, S.tableId), drive = S.bot(9000 + g), steps = 0;
    while (!W.over && steps < 60 * 600) {
      E.step(W, drive(W)); steps++;
      for (var k = 0; k < W.events.length; k++) if (W.events[k] === 'search') { tot.searches++; if (W.balls[0]) tot.at.push([Math.round(W.balls[0].x), Math.round(W.balls[0].y)]); }
      W.events.length = 0;
    }
    tot.games++; tot.secs += steps / 60; tot.scores.push(W.score); tot.balls += W.total;
    Q.forEach(function (q) { tot[q] += W.stats[q] || 0; });
  }
  tot.scores.sort(function (a, b) { return a - b; });
  if (!quiet) {
    console.log(S.tableId + ': ' + tot.games + ' bot games, ' + (tot.secs / 60).toFixed(0) + ' minutes of play: ' + tot.searches + ' ball searches (' + (tot.searches / (tot.secs / 60)).toFixed(3) + ' a minute)' + (tot.at.length ? ' at ' + JSON.stringify(tot.at.slice(0, 12)) : ''));
    console.log('  median score ' + E.fmt(tot.scores[tot.scores.length >> 1]) + ', a game lasts ' + (tot.secs / tot.games).toFixed(0) + ' s; per game: ' + Q.map(function (q) { return q + ' ' + (tot[q] / tot.games).toFixed(1); }).join(', '));
  }
  return tot;
}

function parallel(N, secs, nw, done) {
  var res = [], left = nw;
  for (var w = 0; w < nw; w++) {
    var wk = new wt.Worker(__filename, { workerData: { from: Math.floor(N * w / nw), to: Math.floor(N * (w + 1) / nw), secs: secs, table: S.tableId } });
    wk.on('message', function (m) { res = res.concat(m); });
    wk.on('exit', function () { if (--left) return; res.sort(function (a, b) { return a.i - b.i; }); done(res); });
  }
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
    fs.writeFileSync(path.join(__dirname, 'overlay.js'), 'window.OVERLAY = ' + JSON.stringify({ table: S.tableId, paths: [{ pts: p, col: 'rgba(255,255,0,0.7)', w: 0.5 }], dots: o.traps.map(function (t) { return [t.x, t.y, '#f00', 2]; }).concat([[o.start[0], o.start[1], '#0f0', 2.5]]) }) + ';\n');
  } else {
    var N = +(args[0] || 3000), secs = +(args[1] || 20), nw = +(args[2] || 16), t0 = Date.now();
    parallel(N, secs, nw, function (res) { summarise(res, secs); console.log('took ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s'); });
  }
} else if (!wt.isMainThread) {
  var d = wt.workerData, out = [];
  S.use(d.table);
  for (var i = d.from; i < d.to; i++) out.push(oneBall(i, d.secs, false));
  wt.parentPort.postMessage(out);
}

module.exports = { oneBall: oneBall, corners: corners, games: games, CORNERS: CORNERS, summarise: summarise };
