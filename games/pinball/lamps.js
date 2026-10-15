/* 365 Pinball Hero - the lamps (the coloured inserts set into the playfield), 15 Oct 2026, milestone 2a (v2: about 85
 * inserts, always moving).
 *  - PinLamps.list: every insert - where it sits, its shape and colour - worked out FROM THE TABLE DATA (engine.js and
 *    table.js), so if a part moves its lamps move with it. Units are the table's own (x 0-270 left to right, y 0-446 down
 *    the table towards the flippers). rot is in radians, 0 = pointing UP the table (towards smaller y), turning clockwise
 *    as seen from above; w is the insert's width across that direction and h its length along it. text: words printed
 *    ON the insert ('|' between two lines; shape 'text' is a letter-shaped insert).
 *  - PinLamps.tags: the small printed labels beside the inserts ({ text, x, y, rot, size, color }; rot 0 reads left to
 *    right, -PI/2 reads up the table). The art paints them; they are here so one place owns the layout.
 *  - PinLamps.chains: each shot's lamps in order, far end first and the shot's own entrance last (the way the chases run).
 *  - PinLamps.level(W, t, mode[, out]): how bright each lamp should be right now (0-1, a Float32Array in list order),
 *    from the world alone. It only reads the world. The renderer fades each bulb towards it (real bulbs take a moment
 *    to warm up and cool down), so this can switch hard on and off. t is the clock in milliseconds; mode is the
 *    cabinet's ('title' plays the attract show; 'over', a tilt or the end of the game turn everything off).
 *    The lamps are ALWAYS moving: a shot that isn't lit runs a slow, dim chase in towards it, a lit shot blinks and races,
 *    idle groups breathe (dimly - well under half - so lit still reads as lit).
 * Plain ES5. In node: require('./lamps.js') (it loads engine.js itself), for tools/pinball/art-lamps.test.cjs. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./engine.js'));
  else root.PinLamps = factory(root.PinEngine);
})(typeof self !== 'undefined' ? self : this, function (E) {
  'use strict';
  if (!E) throw new Error('lamps.js needs engine.js loaded first');
  var T = E.TABLE, M = T.MID, TH = T.H, A = T.arch, PI = Math.PI;
  var COL = {   // 365 Invaders' own colours, and a few of ours
    lane: '#ffd84a', skill: '#5cff6b', ramp: '#ff4fc8', orbit: '#3fe0ff', hangar: '#5cff6b', kick: '#ff4a3a',
    save: '#ff3b4a', mult: '#ff9a2e', hero: '#59b4ff', orb: '#ff5cc8', moth: '#3fe0ff', bot: '#ffd84a',
    guide: '#fff4d0', loop: '#3fe0ff', inlane: '#ffd84a', lock: '#5cff6b', multi: '#ff5cc8', jackpot: '#ffd84a', xball: '#ff9a2e'
  };
  var list = [], tags = [];
  function rotOf(dx, dy) { return Math.atan2(dx, -dy); }   // a direction on the table -> rot (0 = up the table)
  function add(o) { o.i = list.length; list.push(o); return o; }
  function tag(text, x, y, rot, size, color) { tags.push({ text: text, x: x, y: y, rot: rot || 0, size: size || 4, color: color }); }
  function sensor(id) { var s = null; T.sensors.circles.forEach(function (c) { if (c[0] === id) s = c; }); return s; }
  function line(id) { var s = null; T.sensors.lines.forEach(function (c) { if (c[0] === id) s = c; }); return s; }
  function mx(x) { return 2 * M - x; }

  // ---------------------------------------------------------------- the top lanes: a lamp under each lane, a green
  // skill-shot arrow above it (pointing down into the lane), and a small lamp at the foot of each lane guide
  var guideTop = 1e9, guideFoot = 0, guideX = [];
  T.walls.forEach(function (w) { if (w[6] === 'post') { guideTop = Math.min(guideTop, w[1], w[3]); guideFoot = Math.max(guideFoot, w[1], w[3]); guideX.push(w[0]); } });
  [0, 1, 2].forEach(function (i) {
    var s = sensor('lane' + i);
    add({ id: 'lane' + i, group: 'lanes', shape: 'circle', x: s[1], y: guideFoot + 9.5, w: 9, h: 9, rot: 0, color: COL.lane });
  });
  [0, 1, 2].forEach(function (i) {
    var s = sensor('lane' + i);
    add({ id: 'skill' + i, group: 'skill', shape: 'triangle', x: s[1], y: guideTop - 9, w: 9, h: 8, rot: PI, color: COL.skill });
  });
  guideX.forEach(function (x, k) { add({ id: 'guide' + k, group: 'guides', shape: 'circle', x: x, y: guideFoot + 6, w: 4.5, h: 4.5, rot: 0, color: COL.guide }); });

  // ---------------------------------------------------------------- the loop round the top of the arch (right half; the
  // warp ramp passes over the left half): small lamps along the ball's path, numbered left to right
  [-64, -53, -42, -31].forEach(function (deg, k) {
    var a = deg * PI / 180, r = A.R - 14;
    add({ id: 'loop' + k, group: 'loop', shape: 'circle', x: A.x + Math.cos(a) * r, y: A.y + Math.sin(a) * r, w: 5, h: 5, rot: 0, color: COL.loop });
  });

  // ---------------------------------------------------------------- the hangar: a lamp in front of each drop target,
  // then the shot's arrow (pointing into the hangar) with three progress lamps behind it, and LOCK inside
  var D = E.DROPS, KIND = ['bot', 'moth', 'orb', 'moth', 'bot'], fx = D[0].fx, fy = D[0].fy, toHangar = rotOf(-fx, -fy);
  D.forEach(function (d, i) {
    var cx = (d.ax + d.bx) / 2, cy = (d.ay + d.by) / 2;
    add({ id: 'drop' + i, group: 'drops', shape: 'rect', x: cx + fx * 10, y: cy + fy * 10, w: 9, h: 5, rot: toHangar, color: COL[KIND[i]], kind: KIND[i] });
  });
  var bank = { x: (D[0].ax + D[D.length - 1].bx) / 2, y: (D[0].ay + D[D.length - 1].by) / 2 };
  var chains = {};
  function shot(id, x, y, dx, dy, color, gap) {   // an arrow at (x, y) pointing along (dx, dy), lamps behind it
    var l = Math.sqrt(dx * dx + dy * dy); dx /= l; dy /= l;
    var ids = [];
    for (var k = 2; k >= 0; k--) {
      var d = (gap || 16) + k * 9;
      ids.push(add({ id: id + '.p' + k, group: id, shape: 'circle', x: x - dx * d, y: y - dy * d, w: 6, h: 6, rot: 0, color: color, step: k }).i);
    }
    ids.push(add({ id: id, group: id, shape: 'arrow', x: x, y: y, w: 13, h: 20, rot: rotOf(dx, dy), color: color }).i);
    chains[id] = ids;
    return { dx: dx, dy: dy };
  }
  function chevron(id, k, x, y, rot, color, w) {
    chains[id].push(add({ id: id + '.c' + k, group: id, shape: 'chevron', x: x, y: y, w: w || 10, h: 5, rot: rot, color: color, step: 3 + k }).i);
  }
  shot('hangar', bank.x + fx * 33, bank.y + fy * 33, -fx, -fy, COL.hangar);
  // LOCK, inside the hangar between the saucer and the ramp's lane, along the hangar's roof
  var roof = T.pocket, rdx = roof[1][0] - roof[0][0], rdy = roof[1][1] - roof[0][1], sau = T.saucer;
  var lockX = sau.x + 26, lockY = roof[0][1] + rdy * (lockX - roof[0][0]) / rdx + 15;
  add({ id: 'lock', group: 'features', shape: 'rect', x: lockX, y: lockY, w: 17, h: 7, rot: Math.atan2(rdy, rdx), color: COL.lock, text: 'LOCK' });

  // ---------------------------------------------------------------- the warp ramp: two chevrons up its entrance lane,
  // an arrow under its mouth, three lamps behind; INVASION (the multiball, to come) under them
  var en = T.ramp.entry, rx = (en.x0 + en.x1) / 2, mouth = 0;
  T.posts.forEach(function (p) { if (p[0] >= en.x0 - 4 && p[0] <= en.x1 + 4) mouth = Math.max(mouth, p[1]); });
  var ra = mouth + 18;
  shot('ramp', rx, ra, 0, -1, COL.ramp);
  chevron('ramp', 0, rx, en.y + 7, 0, COL.ramp, 12);
  chevron('ramp', 1, rx, en.y - 6, 0, COL.ramp, 12);
  var rp2 = list[list.length - 6];   // ramp.p2, the far one
  tag('WARP RAMP', rx - 11, ra + 26, -PI / 2, 3.7, '#ff9ae0');
  var sl = T.slings[0], heroY = sl.a[1] - 19, multY = sl.a[1] - 3.5;
  add({ id: 'multi', group: 'features', shape: 'rect', x: rx + 2, y: (rp2.y + rp2.h / 2 + heroY - 6) / 2 + 0.5, w: 40, h: 8, rot: 0, color: COL.multi, text: 'INVASION' });
  // to the right of the ramp's arrow: JACKPOT and EXTRA BALL (to come)
  add({ id: 'jackpot', group: 'features', shape: 'rect', x: rx + 30, y: ra + 5, w: 27, h: 8, rot: 0, color: COL.jackpot, text: 'JACKPOT' });
  add({ id: 'xball', group: 'features', shape: 'rect', x: rx + 30, y: ra + 19, w: 24, h: 12, rot: 0, color: COL.xball, text: 'EXTRA|BALL' });

  // ---------------------------------------------------------------- the orbits: an arrow at the foot of each, pointing up
  // into its mouth (worked out from the left orbit's inner wall and the one-way gate at its foot, then mirrored), and
  // chevrons up the lane itself, two below the spinner (or rollover) and two above
  var ow = null, og = null;
  T.walls.forEach(function (w) { if (w[0] === w[2] && w[0] > 12 && w[0] < M - 40 && Math.min(w[1], w[3]) < 200) ow = w; });
  T.gates.forEach(function (g) { if (Math.max(g[0], g[2]) < M && Math.min(g[1], g[3]) > 180) og = g; });
  var ox = ow ? ow[0] : 30, oy = ow ? Math.max(ow[1], ow[3]) : 206, gy = og ? Math.min(og[1], og[3]) : oy + 56;
  var mY = (oy + gy) / 2, ax = ox + 17, ay = Math.max(mY + 20, gy - 2), adx = ox - ax, ady = mY - ay;
  var sp = line('spin'), laneX = sp ? (sp[1] + sp[3]) / 2 : 18, spinY = sp ? sp[2] : 196;
  shot('orbitL', ax, ay, adx, ady, COL.orbit);
  shot('orbitR', mx(ax), ay, -adx, ady, COL.orbit);
  ['orbitL', 'orbitR'].forEach(function (id, side) {
    var x = side ? mx(laneX) : laneX;
    [oy + 10, oy, spinY - 14, spinY - 26].forEach(function (y, k) { chevron(id, k, x, y, 0, COL.orbit); });
  });
  tag('SPINNER', laneX, (oy + gy) / 2 + 5, -PI / 2, 3.5, '#8ff0ff');
  tag('ORBIT', mx(laneX), (oy + gy) / 2 + 5, -PI / 2, 3.7, '#8ff0ff');
  // the loop lamps join both orbits' chases at their far ends
  chains.loop = [];

  // ---------------------------------------------------------------- the inlanes: two lamps in each, down to the flipper
  var inS = sensor('inL'), inX = inS ? inS[1] : 38;
  [0, 1].forEach(function (k) {
    var y = sl.a[1] - 15 + k * 14;
    add({ id: 'inL' + k, group: 'inlanes', shape: 'circle', x: inX, y: y, w: 6, h: 6, rot: 0, color: COL.inlane, step: k });
    add({ id: 'inR' + k, group: 'inlanes', shape: 'circle', x: mx(inX), y: y, w: 6, h: 6, rot: 0, color: COL.inlane, step: k });
  });

  // ---------------------------------------------------------------- the outlanes: the kickback on the left, the ball
  // save on the right, each an arrow pointing back up with a rollover lamp above it
  var kick = sensor('kick'), outLS = sensor('outL'), olX = kick ? kick[1] + 0.5 : 16.5, olY = outLS ? outLS[2] - 48 : 344;
  add({ id: 'kick', group: 'kick', shape: 'arrow', x: olX, y: olY, w: 10, h: 15, rot: 0, color: COL.kick });
  add({ id: 'saveR', group: 'outlanes', shape: 'arrow', x: mx(olX), y: olY, w: 10, h: 15, rot: 0, color: COL.save });
  add({ id: 'outL', group: 'outlanes', shape: 'circle', x: olX, y: olY - 20, w: 6, h: 6, rot: 0, color: COL.kick });
  add({ id: 'outR', group: 'outlanes', shape: 'circle', x: mx(olX), y: olY - 20, w: 6, h: 6, rot: 0, color: COL.save });
  tag('KICKBACK', olX, olY + 25, -PI / 2, 3.4, '#ffa090');
  tag('BALL SAVE', mx(olX), olY + 26, -PI / 2, 3.4, '#ffa0a8');

  // ---------------------------------------------------------------- SHOOT AGAIN between the flippers (just below their pivots)
  var F = T.flippers[0];
  add({ id: 'save', group: 'save', shape: 'rect', x: M, y: F.y + 8, w: 27, h: 13, rot: 0, color: COL.save, text: 'SHOOT|AGAIN' });

  // ---------------------------------------------------------------- the H-E-R-O-! letters and the bonus multiplier, in the
  // middle of the table above the slings
  ['H', 'E', 'R', 'O', '!'].forEach(function (ch, k) {
    add({ id: 'hero' + k, group: 'hero', shape: 'text', text: ch, x: M + (k - 2) * 15, y: heroY, w: 11, h: 12, rot: 0, color: COL.hero });
  });
  [2, 3, 4, 5].forEach(function (n, k) {
    add({ id: 'mult' + n, group: 'mult', shape: 'rect', text: n + 'X', x: M + (k - 1.5) * 14, y: multY, w: 12, h: 9, rot: 0, color: COL.mult });
  });
  tag('BONUS', M - 1.5 * 14 - 6 - 2.5 - 8, multY + 0.2, 0, 3.6, '#ffc27a');

  // ---------------------------------------------------------------- the pop bumpers: a lamp in each gap between two of
  // them, and a ring of small lamps round each one's base (any that would crowd a neighbour are left out)
  var B = T.bumpers, bc = { x: (B[0][0] + B[1][0] + B[2][0]) / 3, y: (B[0][1] + B[1][1] + B[2][1]) / 3 }, BCOL = ['orb', 'moth', 'bot'];
  [[0, 1], [1, 2], [2, 0]].forEach(function (p, i) {
    var x = (B[p[0]][0] + B[p[1]][0]) / 2, y = (B[p[0]][1] + B[p[1]][1]) / 2, dx = x - bc.x, dy = y - bc.y;
    add({ id: 'bump' + i, group: 'bumpers', shape: 'triangle', x: x, y: y, w: 7, h: 6, rot: rotOf(dx, dy), color: COL[BCOL[i]] });
  });
  B.forEach(function (b, i) {
    var R = b[2] + 6.2;
    for (var k = 0; k < 8; k++) {
      var a = (k / 8) * 2 * PI + i * 0.4, x = b[0] + Math.cos(a) * R, y = b[1] + Math.sin(a) * R, ok = true;
      for (var j = 0; j < list.length && ok; j++) if (Math.hypot(list[j].x - x, list[j].y - y) < 0.5 * Math.max(list[j].w, list[j].h) + 5.5) ok = false;
      for (var q = 0; q < B.length && ok; q++) if (q !== i && Math.hypot(B[q][0] - x, B[q][1] - y) < B[q][2] + 8) ok = false;
      if (ok && y < A.y && Math.hypot(x - A.x, y - A.y) > A.R - 8) ok = false;
      if (!ok) continue;
      add({ id: 'ring' + i + '.' + k, group: 'rings', shape: 'circle', x: x, y: y, w: 4, h: 4, rot: 0, color: COL[BCOL[i]], b: i });
    }
  });

  // ---------------------------------------------------------------- lookups
  var byId = {}, groups = {};
  list.forEach(function (l) { byId[l.id] = l.i; (groups[l.group] = groups[l.group] || []).push(l.i); });
  chains.loop = groups.loop.slice();
  var N = list.length;
  var FEAT = groups.features, HERO = groups.hero, GUIDE = groups.guides, LOOP = groups.loop;
  var KICK = byId.kick, SAVER = byId.saveR, OUTL = byId.outL, OUTR = byId.outR, SAVE = byId.save;
  var INL = [byId.inL0, byId.inL1, byId.inR0, byId.inR1];

  // ---------------------------------------------------------------- how bright each lamp should be
  function blink(t, ms) { return Math.floor(t / ms) % 2 === 0 ? 1 : 0; }
  function frac(v) { return v - Math.floor(v); }
  function breathe(t, ms, ph) { var f = frac(t / ms + ph); return f < 0.5 ? f * 2 : 2 - f * 2; }   // a triangle wave 0-1
  function hash(i, n) { var h = Math.imul(i + 1, 374761393) + Math.imul(n, 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
  // a comet running along a chain of lamps (far end first): head brightness, a fading tail, a floor for the rest
  function comet(out, ch, t, ms, head, floor, rev) {
    var n = ch.length, pos = Math.floor(t / ms) % (n + 2);
    for (var k = 0; k < n; k++) {
      var kk = rev ? n - 1 - k : k, d = pos - kk;
      out[ch[k]] = d === 0 ? head : d === 1 ? head * 0.45 : d === 2 ? head * 0.18 : floor;
    }
  }
  // a shot's chain: 'idle' (a slow, dim chase in towards the shot, so the table always shows where the shots are);
  // 'lit' (the arrow blinks and the lamps race in; count: lamps held on for a combo); 'made' (everything flashes)
  // (the renderer multiplies these by about 2.4 - so an idle glow stays near 0.3, a breath near 0.1)
  var IDLE = 0.3;
  function shotLamps(out, id, t, state, count) {
    var ch = chains[id], a = byId[id], k;
    if (state === 'made') { var f = blink(t, 70); for (k = 0; k < ch.length; k++) out[ch[k]] = f; return; }
    if (state === 'lit') {
      comet(out, ch, t, 60, 1, 0.12);
      out[a] = blink(t, 180) ? 1 : 0.3;
      if (count) for (k = 0; k < 3 && k < count; k++) out[ch[2 - k]] = 1;   // p0 first, then p1, p2
      return;
    }
    comet(out, ch, t, 190, IDLE, 0.02);
  }
  function attract(out, t) {
    // a 24-second show: waves sweeping up the table; a sweep from side to side and back; the shots racing in while the
    // rest sparkles; then rings spinning and everything breathing to the beat
    var c = t % 24000, i, l;
    if (c < 8000) {
      var front = -0.25 + 1.6 * frac(t / 1300);
      for (i = 0; i < N; i++) { l = list[i]; var d = front - (1 - l.y / TH); out[i] = d >= 0 && d < 0.3 ? 1 - d / 0.3 : 0; }
    } else if (c < 11000) {
      var s = (c - 8000) / 1500, fxp = s < 1 ? s : 2 - s, sx = -0.2 + 1.4 * fxp;
      for (i = 0; i < N; i++) { l = list[i]; var e = Math.abs(sx - l.x / T.W); out[i] = e < 0.14 ? 1 - e / 0.14 : 0; }
    } else if (c < 18000) {
      var tick = Math.floor(t / 110);
      for (i = 0; i < N; i++) out[i] = hash(i, tick) > 0.8 ? 0.9 : 0.05;
      ['hangar', 'ramp', 'orbitL', 'orbitR', 'loop'].forEach(function (id) { shotLamps(out, id, t, 'lit'); });
      HERO.forEach(function (k, n) { out[k] = Math.floor(t / 160) % 6 === n ? 1 : 0.2; });
    } else {
      var beat = breathe(t, 900, 0);
      for (i = 0; i < N; i++) { l = list[i]; out[i] = 0.08 + 0.5 * beat * (0.5 + 0.5 * Math.cos((l.x + l.y) * 0.05 - t * 0.004)); }
      for (i = 0; i < 3; i++) rings(out, i, t, 55, 1);
      comet(out, LOOP, t, 80, 1, 0.1);
    }
  }
  function rings(out, b, t, ms, head) {   // a comet round one bumper's ring
    var r = ringsOf[b], n = r.length; if (!n) return;
    var pos = Math.floor(t / ms + b * 3) % n;
    for (var k = 0; k < n; k++) { var d = (pos - k + n) % n; out[r[k]] = d === 0 ? head : d === 1 ? head * 0.4 : head * 0.08; }
  }
  var ringsOf = rings_();
  function rings_() { var r = [[], [], []]; (groups.rings || []).forEach(function (i) { r[list[i].b].push(i); }); return r; }

  function level(W, t, mode, out) {
    out = out || new Float32Array(N);
    var i, k;
    t = t || 0;
    if (mode === 'title') { attract(out, t); return out; }
    for (i = 0; i < N; i++) out[i] = 0;
    if (!W || mode === 'over' || W.over || W.tilted) return out;
    var lit = W.lit || {};
    // the top lanes, the skill shot, the lane guides (a slow chase; all flash when a lane is made)
    var laneHit = false;
    for (i = 0; i < 3; i++) {
      var ln = byId['lane' + i];
      if (lit.lane && lit.lane[i] > 0) { out[ln] = blink(t, 70); laneHit = true; }
      else if (W.lanes && W.lanes[i]) out[ln] = 1;
      else out[ln] = 0.02 + 0.1 * breathe(t, 1800, i * 0.18);
      if (W.skillOpen && W.skill === i) out[byId['skill' + i]] = blink(t, 160);
      else out[byId['skill' + i]] = W.skillOpen ? 0.05 : 0;
    }
    if (laneHit) for (k = 0; k < GUIDE.length; k++) out[GUIDE[k]] = blink(t + k * 40, 80);
    else comet(out, GUIDE, t, 240, IDLE, 0.03, (Math.floor(t / 1440) & 1) === 1);
    // the drop targets: a target that's down lights its lamp; one just hit flashes; the ones still up chase dimly
    var dpos = Math.floor(t / 230) % 7;
    for (i = 0; i < 5; i++) {
      var dl = byId['drop' + i];
      if (lit.drop && lit.drop[i] > 0) out[dl] = blink(t, 60);
      else if (W.drops && !W.drops[i]) out[dl] = 1;
      else out[dl] = dpos === i ? 0.25 : 0.03;
    }
    // the four shots and the loop over the top
    shotLamps(out, 'hangar', t, lit.saucer > 0 ? 'made' : W.saucerLit ? 'lit' : 'idle');
    shotLamps(out, 'ramp', t, lit.ramp > 0 ? 'made' : W.comboT > 0 ? 'lit' : 'idle', W.comboT > 0 ? W.combo : 0);
    var loop = !!W.orbitFrom;
    shotLamps(out, 'orbitL', t, lit.orbitL > 0 ? 'made' : loop ? 'lit' : 'idle');
    shotLamps(out, 'orbitR', t, lit.orbitR > 0 ? 'made' : loop ? 'lit' : 'idle');
    if (lit.orbitL > 0 || lit.orbitR > 0) for (k = 0; k < LOOP.length; k++) out[LOOP[k]] = blink(t, 70);
    else if (loop) comet(out, LOOP, t, 70, 1, 0.12, W.orbitFrom === 'R');
    else comet(out, LOOP, t, 260, IDLE, 0.02, (Math.floor(t / 1560) & 1) === 1);
    // the inlanes: blinking while a ramp combo is running (shoot it again), else a slow drip down to the flippers
    for (k = 0; k < 4; k++) {
      var st = list[INL[k]].step;
      out[INL[k]] = W.comboT > 0 ? blink(t + st * 120, 120) : (Math.floor(t / 420) % 3 === st ? 0.25 : 0.02);
    }
    // the kickback and its outlane, the ball save and its outlane
    if (lit.kick > 0) out[KICK] = blink(t, 80); else if (W.kickback) out[KICK] = 1;
    out[OUTL] = W.kickback ? 0.06 + 0.2 * breathe(t, 1200, 0) : 0.02;
    if (W.saveT > 150) out[SAVE] = out[SAVER] = 1;
    else if (W.saveT > 0) out[SAVE] = out[SAVER] = blink(t, 110);
    else out[SAVER] = 0.02 + 0.1 * breathe(t, 2000, 0.5);
    out[OUTR] = W.saveT > 0 ? blink(t + 55, 110) : 0.02 + 0.1 * breathe(t, 2000, 0);
    // the bonus multiplier: earned ones on, a slow dim chase up the ones still to earn
    var m = W.mult || 1;
    var mpos = Math.floor(t / 380) % (7 - Math.min(m, 5));
    for (i = 2; i <= 5; i++) out[byId['mult' + i]] = m >= i ? 1 : mpos === i - m - 1 ? 0.26 : 0.02;
    // H-E-R-O-! and the features to come (milestone 3): unlit, a slow dim wave so the table never sits still
    for (k = 0; k < HERO.length; k++) out[HERO[k]] = 0.02 + 0.1 * breathe(t, 2600, k * 0.12);
    for (k = 0; k < FEAT.length; k++) out[FEAT[k]] = 0.02 + 0.09 * breathe(t, 3100, k * 0.27);
    // the bumpers: the lamps between them glow in turn, full on a hit; each ring has a slow comet, flashing on a hit
    for (i = 0; i < 3; i++) {
      var bl = byId['bump' + i], hit = lit.bump && (lit.bump[i] > 0 || lit.bump[(i + 1) % 3] > 0);
      out[bl] = hit ? 1 : (Math.floor(t / 420) + i) % 3 === 0 ? 0.3 : 0.06;
      if (lit.bump && lit.bump[i] > 0) { var r = ringsOf[i]; for (k = 0; k < r.length; k++) out[r[k]] = 1; }
      else rings(out, i, t, 150, IDLE);
    }
    return out;
  }

  return { list: list, tags: tags, chains: chains, level: level, byId: byId, groups: groups, colors: COL, version: 2 };
});
