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
  var PI = Math.PI;

  // ================================================================ the old space table ("orbit"), as it was
  function buildOrbit() {
    var Bo = E.table ? E.table('orbit') : null, T = Bo ? Bo.T : E.TABLE, M = T.MID, TH = T.H, A = T.arch;
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
    var D = Bo ? Bo.DROPS : E.DROPS, KIND = ['bot', 'moth', 'orb', 'moth', 'bot'], fx = D[0].fx, fy = D[0].fy, toHangar = rotOf(-fx, -fy);
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

    return { id: 'orbit', list: list, tags: tags, chains: chains, level: level, byId: byId, groups: groups, colors: COL };
  }

  // ================================================================ helpers for the tables built below
  function blinkF(t, ms) { return Math.floor(t / ms) % 2 === 0 ? 1 : 0; }
  function fracF(v) { return v - Math.floor(v); }
  function breatheF(t, ms, ph) { var f = fracF(t / ms + ph); return f < 0.5 ? f * 2 : 2 - f * 2; }
  function hashF(i, n) { var h = Math.imul(i + 1, 374761393) + Math.imul(n, 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
  function cometF(out, ch, t, ms, head, floor, rev) {
    var n = ch.length, pos = Math.floor(t / ms) % (n + 2);
    for (var k = 0; k < n; k++) {
      var kk = rev ? n - 1 - k : k, d = pos - kk;
      out[ch[k]] = d === 0 ? head : d === 1 ? head * 0.45 : d === 2 ? head * 0.18 : floor;
    }
  }
  function rotOfF(dx, dy) { return Math.atan2(dx, -dy); }

  // ================================================================ Ember Peak (16 Oct 2026, NG fast track): about 95 inserts
  // Placed from tables/ember.js: the skill lanes and the loop over the arch; the fumaroles' rings; the PRESSURE GAUGE (nine
  // ticks round the volcano's foot, filling left to right as the pressure builds) and the crater's arrow under it; the
  // geyser; the two lava lanes (an arrow and four chevrons up each, glowing like embers until a full eruption opens
  // them, then racing); the orbits (an arrow at each mouth and chevrons all the way up the lane); the heat ramp; the obsidian targets; and the shore's inlanes, outlanes, ball save, E-R-U-P-T (the
  // pressure again, where the player looks most) and the bonus multiplier.
  function buildEmber() {
    var Be = E.table('ember'), T = Be.T, M = T.MID, TH = T.H, TW = T.W, A = T.arch, IDLE = 0.42;
    var COL = {
      lane: '#ffd84a', skill: '#5cff6b', loop: '#2ee6d6', orbit: '#2ee6d6', ramp: '#ffb02e', obsidian: '#b48cff',
      crater: '#ff8a1e', geyser: '#e8f6ff', lava: '#ff7a1a', inlane: '#ffd84a', kick: '#ff4a3a', save: '#ff3b4a', mult: '#ff9a2e',
      erupt: '#ffb02e', bump: ['#ff9a2e', '#ffd84a', '#2ee6d6'],
      lock: '#5cff6b', eruptC: '#ffb02e', super: '#fff0a0', modeC: '#b48cff', dive: '#3fb8ff', jackpot: '#ffd84a', plug: '#c9a0ff',
      crab: '#ff7a3a', boss: ['#ff9a2e', '#ff6a1e', '#ff4a2a'], combo: ['#ffd84a', '#ffb02e', '#ff8ad8', '#ff5cc8', '#fff0a0'], tags: ['#5cff6b', '#3fe0ff', '#b48cff', '#ffd84a'],
      gauge: ['#ffe45a', '#ffd84a', '#ffcb3a', '#ffbb30', '#ffab28', '#ff9a22', '#ff8a1e', '#ff7a1a', '#ff6a16']
    };
    var list = [], tags = [], chains = {};
    function add(o) { o.i = list.length; list.push(o); return o; }
    function tag(text, x, y, rot, size, color) { tags.push({ text: text, x: x, y: y, rot: rot || 0, size: size || 4, color: color }); }
    function sensor(id) { var s = null; T.sensors.circles.forEach(function (c) { if (c[0] === id) s = c; }); return s; }
    function line(id) { var s = null; T.sensors.lines.forEach(function (c) { if (c[0] === id) s = c; }); return s; }
    function mx(x) { return 2 * M - x; }
    function segD(px, py, w) { var t = ((px - w.ax) * w.dx + (py - w.ay) * w.dy) / w.l2; t = t < 0 ? 0 : t > 1 ? 1 : t; return Math.hypot(px - w.ax - w.dx * t, py - w.ay - w.dy * t); }
    function behind(x, y, dx, dy, ds) { var l = Math.sqrt(dx * dx + dy * dy); dx /= l; dy /= l; return ds.map(function (d) { return [x - dx * d, y - dy * d]; }); }
    // a shot: its lamps (far end first, each a small round lamp) and then its arrow at (x, y) pointing along (dx, dy)
    function shot(id, group, x, y, dx, dy, color, pts, size) {
      var ids = [];
      pts.forEach(function (p, k) { var st = pts.length - 1 - k; ids.push(add({ id: id + '.p' + st, group: group, shape: 'circle', x: p[0], y: p[1], w: 6, h: 6, rot: 0, color: color, step: st }).i); });
      ids.push(add({ id: id, group: group, shape: 'arrow', x: x, y: y, w: size ? size[0] : 13, h: size ? size[1] : 20, rot: rotOfF(dx, dy), color: color }).i);
      chains[id] = ids;
    }
    function chevron(id, group, k, x, y, rot, color, w) {
      chains[id].push(add({ id: id + '.c' + k, group: group, shape: 'chevron', x: x, y: y, w: w || 10, h: 5, rot: rot, color: color, step: 3 + k }).i);
    }

    // ---------------------------------------------------------------- the skill lanes under the arch (a lamp in each, a
    // green arrow above it pointing down into the lane)
    var guideTop = 1e9, guideFoot = 0;
    T.walls.forEach(function (w) { if (w[6] === 'post') { guideTop = Math.min(guideTop, w[1], w[3]); guideFoot = Math.max(guideFoot, w[1], w[3]); } });
    [0, 1, 2].forEach(function (i) { var s = sensor('lane' + i); add({ id: 'lane' + i, group: 'lanes', shape: 'circle', x: s[1], y: guideFoot + 8, w: 9, h: 9, rot: 0, color: COL.lane }); });
    [0, 1, 2].forEach(function (i) { var s = sensor('lane' + i); add({ id: 'skill' + i, group: 'skill', shape: 'triangle', x: s[1], y: guideTop - 9, w: 9, h: 8, rot: PI, color: COL.skill }); });

    // ---------------------------------------------------------------- the loop over the top: four lamps round the arch's
    // left half (the skill lanes take the right), numbered left to right
    [-157, -141, -125, -109].forEach(function (deg, k) {
      var a = deg * PI / 180, r = A.R - 14;
      add({ id: 'loop' + k, group: 'loop', shape: 'circle', x: A.x + Math.cos(a) * r, y: A.y + Math.sin(a) * r, w: 5, h: 5, rot: 0, color: COL.loop });
    });

    // ---------------------------------------------------------------- the volcano: the pressure gauge round its foot
    // (nine ticks, left to right, yellow to deep orange) and the crater's arrow on the line out of its mouth (towards
    // the right flipper, the shot's flipper), with two lamps behind it
    var V = T.volcano, GR = V.r + 14, mu = V.mouth || [0, 1], ml = Math.sqrt(mu[0] * mu[0] + mu[1] * mu[1]), mux = mu[0] / ml, muy = mu[1] / ml;
    function onMouth(d) { return [V.x + mux * (V.r + d), V.y + muy * (V.r + d)]; }
    for (var g = 0; g < 9; g++) {
      var ga = (160 - g * 17.5) * PI / 180, gx = V.x + Math.cos(ga) * GR, gy = V.y + Math.sin(ga) * GR;
      add({ id: 'gauge' + g, group: 'gauge', shape: 'rect', x: gx, y: gy, w: 4, h: 7, rot: rotOfF(Math.cos(ga), Math.sin(ga)), color: COL.gauge[g], step: g });
    }
    var cA = onMouth(28.5);
    shot('crater', 'crater', cA[0], cA[1], -mux, -muy, COL.crater, [onMouth(50.5), onMouth(41.5)], [11, 16]);

    // ---------------------------------------------------------------- the geyser: an arrow and a lamp below it, a lamp above
    var GY = T.geyser;
    shot('geyser', 'geyser', GY.x + 5, GY.y + 24, -5, -24, COL.geyser, [[GY.x + 8.3, GY.y + 40]], [10, 14]);
    // (the top lamp up and to the right, the way it flings the ball, clear of the crater's lamps)
    chains.geyser.push(add({ id: 'geyser.top', group: 'geyser', shape: 'circle', x: GY.x + 12, y: GY.y - 13, w: 5, h: 5, rot: 0, color: COL.geyser, step: 3 }).i);

    // ---------------------------------------------------------------- the lava lanes: an arrow just inside each mouth (above
    // its gate, at the bottom) and four chevrons up it (the chain runs up the lane, the way the ball goes)
    var lg = T.lava.gates[0], lx = (lg[0] + lg[2]) / 2, lbot = Math.min(lg[1], lg[3]) - 12;
    ['lavaL', 'lavaR'].forEach(function (id, s) {
      var x = s ? mx(lx) : lx;
      add({ id: id, group: 'lava', shape: 'arrow', x: x, y: lbot, w: 11, h: 16, rot: 0, color: COL.lava, side: s });
      chains[id] = [list.length - 1];
      [18, 32, 46, 60].forEach(function (d, k) { chevron(id, 'lava', k, x, lbot - d, 0, COL.lava); list[list.length - 1].side = s; });
    });

    // ---------------------------------------------------------------- the orbits: an arrow pointing up into each mouth
    // (from the inner wall's foot and the one-way gate below it), two lamps behind, chevrons all the way up the lane.
    // The gate: the left one-way gate (not the shooter lane's); the wall: the lowest upright wall foot above it at
    // x 12-40 (the orbit's inner wall, not the outlane divider below the gate)
    var ow = null, og = null, sp = line('spin');
    T.gates.forEach(function (gt) { if (Math.max(gt[0], gt[2]) < M) og = gt; });
    var gy0 = Math.min(og[1], og[3]);
    T.walls.forEach(function (w) { var b = Math.max(w[1], w[3]); if (w[0] === w[2] && w[0] > 12 && w[0] < 40 && b < gy0 && (!ow || b > Math.max(ow[1], ow[3]))) ow = w; });
    var ox = ow[0], oy = Math.max(ow[1], ow[3]), mY = (oy + gy0) / 2;
    var ax = ox + 17, ay = Math.max(mY + 20, gy0 - 2), adx = ox - ax, ady = mY - ay, laneX = (sp[1] + sp[3]) / 2, spinY = sp[2];
    ['orbitL', 'orbitR'].forEach(function (id, s) {
      var X = function (x) { return s ? mx(x) : x; }, pts = behind(ax, ay, adx, ady, [25, 16]).map(function (p) { return [X(p[0]), p[1]]; });
      shot(id, id, X(ax), ay, s ? -adx : adx, ady, COL.orbit, pts);
      // (up the lane to just under the arch: one screen, so the lane is short)
      var top = A.y - Math.sqrt(A.R * A.R - (laneX - A.x) * (laneX - A.x)) + 30, foot = oy + 10;
      [0, 1, 2, 3, 4].forEach(function (k) { chevron(id, id, k, X(laneX), foot - (foot - top) * k / 4, 0, COL.orbit); });
    });
    tag('ORBIT', laneX, (oy + gy0) / 2 + 7, -PI / 2, 3.5, '#9ff6ee');
    tag('ORBIT', mx(laneX), (oy + gy0) / 2 + 7, -PI / 2, 3.5, '#9ff6ee');

    // ---------------------------------------------------------------- the heat ramp: an arrow under its mouth, three lamps
    // behind, two chevrons up its lane
    var en = T.ramp.entry, rx = (en.x0 + en.x1) / 2, mouth = 0;
    T.posts.forEach(function (p) { if (p[0] >= en.x0 - 4 && p[0] <= en.x1 + 4) mouth = Math.max(mouth, p[1]); });
    var ra = mouth + 18;
    shot('ramp', 'ramp', rx, ra, 0, -1, COL.ramp, behind(rx, ra, 0, -1, [34, 25, 16]));
    chevron('ramp', 'ramp', 0, rx, en.y + 7, 0, COL.ramp, 12);
    chevron('ramp', 'ramp', 1, rx, en.y - 6, 0, COL.ramp, 12);
    tag('HEAT RAMP', rx - 11, ra + 20, -PI / 2, 3.4, '#ffd08a');

    // ---------------------------------------------------------------- the obsidian targets: a lamp in front of each, the
    // shot's arrow pointing into the bank with three lamps behind it
    var D = Be.DROPS, fx = D[0].fx, fy = D[0].fy, toBank = rotOfF(-fx, -fy);
    D.forEach(function (d, i) {
      var cx = (d.ax + d.bx) / 2, cy = (d.ay + d.by) / 2;
      add({ id: 'drop' + i, group: 'drops', shape: 'rect', x: cx + fx * 15, y: cy + fy * 15, w: 9, h: 5, rot: toBank, color: COL.obsidian });
    });
    var bank = { x: (D[0].ax + D[D.length - 1].bx) / 2, y: (D[0].ay + D[D.length - 1].by) / 2 }, bx = bank.x + fx * 29, by = bank.y + fy * 29;
    shot('obsidian', 'obsidian', bx, by, -fx, -fy, COL.obsidian, behind(bx, by, -fx, -fy, [33, 24, 15]));

    // ---------------------------------------------------------------- the shore: inlanes, outlanes, kickback, ball save
    var sl = T.slings[0], inS = sensor('inL'), inX = inS[1];
    [0, 1].forEach(function (k) {
      var y = sl.a[1] - 15 + k * 14;
      add({ id: 'inL' + k, group: 'inlanes', shape: 'circle', x: inX, y: y, w: 6, h: 6, rot: 0, color: COL.inlane, step: k });
      add({ id: 'inR' + k, group: 'inlanes', shape: 'circle', x: mx(inX), y: y, w: 6, h: 6, rot: 0, color: COL.inlane, step: k });
    });
    var kick = sensor('kick'), outLS = sensor('outL'), olX = kick[1] + 0.5, olY = outLS[2] - 48;
    add({ id: 'kick', group: 'kick', shape: 'arrow', x: olX, y: olY, w: 10, h: 15, rot: 0, color: COL.kick });
    add({ id: 'saveR', group: 'outlanes', shape: 'arrow', x: mx(olX), y: olY, w: 10, h: 15, rot: 0, color: COL.save });
    add({ id: 'outL', group: 'outlanes', shape: 'circle', x: olX, y: olY - 20, w: 6, h: 6, rot: 0, color: COL.kick });
    add({ id: 'outR', group: 'outlanes', shape: 'circle', x: mx(olX), y: olY - 20, w: 6, h: 6, rot: 0, color: COL.save });
    tag('KICKBACK', olX, olY + 25, -PI / 2, 3.4, '#ffa090');
    tag('BALL SAVE', mx(olX), olY + 26, -PI / 2, 3.4, '#ffa0a8');
    var F = T.flippers[0];
    add({ id: 'save', group: 'save', shape: 'rect', x: M, y: F.y + 8, w: 27, h: 13, rot: 0, color: COL.save, text: 'SHOOT|AGAIN' });
    // E-R-U-P-T (the pressure, on the shore) and the bonus multiplier, above the slings
    var eY = sl.a[1] - 19, multY = sl.a[1] - 3.5;
    ['E', 'R', 'U', 'P', 'T'].forEach(function (ch, k) {
      add({ id: 'erupt' + k, group: 'erupt', shape: 'text', text: ch, x: M + (k - 2) * 15, y: eY, w: 11, h: 12, rot: 0, color: COL.erupt, step: k });
    });
    [2, 3, 4, 5].forEach(function (n, k) {
      add({ id: 'mult' + n, group: 'mult', shape: 'rect', text: n + 'X', x: M + (k - 1.5) * 14, y: multY, w: 12, h: 9, rot: 0, color: COL.mult });
    });
    tag('BONUS', M - 1.5 * 14 - 6 - 2.5 - 8, multY + 0.2, 0, 3.6, '#ffc27a');

    // ---------------------------------------------------------------- the slings, lava-lit: three lamps along each kicking
    // face (just off it, towards the middle), glowing like embers, flashing on a kick (one screen: the lower half busy)
    T.slings.forEach(function (S, s) {
      var dx = S.c[0] - S.a[0], dy = S.c[1] - S.a[1], l = Math.sqrt(dx * dx + dy * dy), nx = -S.side * dy / l, ny = S.side * dx / l;
      if (nx * (M - S.a[0]) < 0) { nx = -nx; ny = -ny; }
      [0.25, 0.5, 0.75].forEach(function (u, k) {
        add({ id: 'sling' + s + '.' + k, group: 'slings', shape: 'circle', x: S.a[0] + dx * u + nx * 7, y: S.a[1] + dy * u + ny * 7, w: 5, h: 5, rot: 0, color: COL.lava, side: s, step: k });
      });
    });

    // ---------------------------------------------------------------- the fumaroles (pop bumpers): a lamp in each gap and
    // a ring of small lamps round each base (any that would crowd a neighbour, a lane guide or another insert are left
    // out; at most 4 round each)
    var B = T.bumpers, bc = { x: (B[0][0] + B[1][0] + B[2][0]) / 3, y: (B[0][1] + B[1][1] + B[2][1]) / 3 };
    [[0, 1], [1, 2], [2, 0]].forEach(function (p, i) {
      var x = (B[p[0]][0] + B[p[1]][0]) / 2, y = (B[p[0]][1] + B[p[1]][1]) / 2, dx = x - bc.x, dy = y - bc.y;
      add({ id: 'bump' + i, group: 'bumpers', shape: 'triangle', x: x, y: y, w: 7, h: 6, rot: rotOfF(dx, dy), color: COL.bump[i] });
    });
    B.forEach(function (b, i) {
      var R = b[2] + 6.2, n = 0;
      for (var k = 0; k < 8 && n < 4; k++) {
        var a = (k / 8) * 2 * PI + i * 0.4, x = b[0] + Math.cos(a) * R, y = b[1] + Math.sin(a) * R, ok = true;
        for (var j = 0; j < list.length && ok; j++) if (Math.hypot(list[j].x - x, list[j].y - y) < 0.5 * Math.max(list[j].w, list[j].h) + 5.5) ok = false;
        for (var q = 0; q < B.length && ok; q++) if (q !== i && Math.hypot(B[q][0] - x, B[q][1] - y) < B[q][2] + 8) ok = false;
        if (ok && y < A.y && Math.hypot(x - A.x, y - A.y) > A.R - 8) ok = false;
        T.walls.forEach(function (w) { if (ok && w[6] === 'post' && Math.abs(x - w[0]) < 6 && y < Math.max(w[1], w[3]) + 5) ok = false; });
        Be.WALLS.concat(Be.LAVA, Be.GATES).forEach(function (w) { if (ok && segD(x, y, w) < w.r + 5) ok = false; });
        (T.crabs || []).forEach(function (c) { var w = { ax: c.path[0][0], ay: c.path[0][1], dx: c.path[1][0] - c.path[0][0], dy: c.path[1][1] - c.path[0][1] }; w.l2 = w.dx * w.dx + w.dy * w.dy || 1; if (ok && segD(x, y, w) < c.r + 3.5) ok = false; });
        if (!ok) continue;
        n++;
        add({ id: 'ring' + i + '.' + k, group: 'rings', shape: 'circle', x: x, y: y, w: 4, h: 4, rot: 0, color: COL.bump[i], b: i });
      }
    });
    // ---------------------------------------------------------------- THE BIG ONE and the goals (5 Nov 2026, wave 3): the
    // crater's awards in a crown over its far rim (lit in W.crater.lit's priority order, the one the crater takes next
    // brightest), a JACKPOT at each multiball jackpot shot, the PLUG between the flippers, the four island MODES and the
    // boss's three phases and the COMBO ladder on the shore, the run's mutation tags in the sky, and an arrow at the
    // reachable magma crab (so every NEXT shot has its own lamps). Placed before the river, which steps round them.
    var CR = [['lock', 'LOCK', COL.lock, 218], ['erupt', 'ERUPT', COL.eruptC, 244], ['super', 'SUPER', COL.super, 270], ['mode', 'MODE', COL.modeC, 296], ['dive', 'DIVE', COL.dive, 322]];
    CR.forEach(function (c) {
      var a = c[3] * PI / 180, r = V.r + 15;
      add({ id: 'cr.' + c[0], group: 'crown', shape: 'rect', text: c[1], x: V.x + Math.cos(a) * r, y: V.y + Math.sin(a) * r, w: 12.5, h: 5.6, rot: a + PI / 2, color: c[2], award: c[0] });
    });
    // (each jackpot beside its shot: below each lava lane's mouth, and up the heat ramp's lane)
    add({ id: 'jp.lavaL', group: 'jackpot', shape: 'rect', text: 'JACKPOT', x: lx + 3, y: 238, w: 17, h: 5.4, rot: 0, color: COL.jackpot, jp: 'lavaL' });
    add({ id: 'jp.lavaR', group: 'jackpot', shape: 'rect', text: 'JACKPOT', x: mx(lx) - 3, y: 238, w: 17, h: 5.4, rot: 0, color: COL.jackpot, jp: 'lavaR' });
    add({ id: 'jp.ramp', group: 'jackpot', shape: 'rect', text: 'JACKPOT', x: rx, y: en.y - 21, w: 17, h: 5.4, rot: -PI / 2, color: COL.jackpot, jp: 'ramp' });
    var PG = T.plug || { x: M, y: F.y + 22 };
    add({ id: 'plug', group: 'plug', shape: 'oval', text: 'PLUG', x: M, y: F.y - 17, w: 12, h: 6.4, rot: 0, color: COL.plug });
    // the shore: the four island modes in a row (in the order the crater starts them), the boss's phases (three peaks
    // growing) and the combo ladder (five steps, the fifth the SUPER COMBO) on either side of the river
    var MD = [['CRABS', COL.crab], ['QUARRY', COL.obsidian], ['STORM', COL.orbit], ['HEAT', COL.ramp]], mY = 391.5;
    MD.forEach(function (m, k) { add({ id: 'mode' + k, group: 'modes', shape: 'rect', text: m[0], x: [88, 105.5, 144.5, 162][k], y: mY, w: 15.5, h: 6.4, rot: 0, color: m[1], step: k }); });
    [0, 1, 2].forEach(function (k) { add({ id: 'boss' + k, group: 'boss', shape: 'triangle', x: 89 + k * 9.5, y: 358.5 - k * 0.5, w: 6 + k, h: 5.5 + k, rot: 0, color: COL.boss[k], step: k }); });
    [0, 1, 2, 3, 4].forEach(function (k) { add({ id: 'combo' + k, group: 'combo', shape: k === 4 ? 'oval' : 'circle', x: 139 + k * 6.6, y: 358, w: k === 4 ? 6.4 : 4.6, h: k === 4 ? 6.4 : 4.6, rot: 0, color: COL.combo[k], step: k }); });
    tag('COMBO', 152.2, 352.6, 0, 2.6, '#ffc8f0');
    // the mutation tags (Ember Run's W.mod.tags, in order): four small lenses in the sky over the summit
    [0, 1, 2, 3].forEach(function (k) { add({ id: 'tag' + k, group: 'tags', shape: 'oval', x: 113 + k * 10, y: 27, w: 7, h: 5.2, rot: 0, color: COL.tags[k], step: k }); });
    // the reachable magma crab (the lower walk): an arrow pointing up at it
    var CB = T.crabs && T.crabs[1];
    if (CB) { var cbx = CB.path[0][0] - 15, cby = CB.path[0][1] + CB.r + 10, cbm = (CB.path[0][0] + CB.path[1][0]) / 2; add({ id: 'crabs', group: 'crabs', shape: 'arrow', x: cbx, y: cby, w: 9, h: 12, rot: rotOfF(cbm - cbx, CB.path[0][1] - cby), color: COL.crab }); chains.crabs = [list.length - 1]; }   // (left of the explorer, pointing up at the walk)

    // ---------------------------------------------------------------- the lava river (29 Oct 2026, owner: "more lamps"):
    // bubbles of lava along the printed river (the same line as art3d.js river()), every 12 units from the volcano's foot
    // to the drain, wherever they clear the other lamps, the toys and the walls. In play the lava flows down them.
    var RIV = [[92, 142], [86, 160], [79, 182], [75, 204], [78, 226], [88, 248], [102, 270], [113, 292], [119, 316], [122, 342], [124, 366], [125, 388], [125, 410]];
    var rv = 0, Vk = T.volcano, Gk = T.geyser;
    for (var ri = 0, carry = 0; ri < RIV.length - 1; ri++) {
      var p0 = RIV[ri], p1 = RIV[ri + 1], sl = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
      for (var u = carry; u < sl; u += 12) {
        var rx2 = p0[0] + (p1[0] - p0[0]) * u / sl, ry2 = p0[1] + (p1[1] - p0[1]) * u / sl, ok2 = true;
        for (var j2 = 0; j2 < list.length && ok2; j2++) if (Math.hypot(list[j2].x - rx2, list[j2].y - ry2) < 0.5 * Math.max(list[j2].w, list[j2].h) + 5) ok2 = false;
        if (Vk && Math.hypot(rx2 - Vk.x, ry2 - Vk.y) < Vk.r + 10) ok2 = false;
        if (Gk && Math.hypot(rx2 - Gk.x, ry2 - Gk.y) < (Gk.r || 8) + 9) ok2 = false;
        B.forEach(function (b) { if (ok2 && Math.hypot(b[0] - rx2, b[1] - ry2) < b[2] + 7) ok2 = false; });
        T.posts.forEach(function (p) { if (ok2 && Math.hypot(p[0] - rx2, p[1] - ry2) < p[2] + 5) ok2 = false; });
        Be.WALLS.concat(Be.LAVA, Be.GATES).forEach(function (w) { if (ok2 && segD(rx2, ry2, w) < w.r + 5) ok2 = false; });
        (T.crabs || []).forEach(function (c) { var w = { ax: c.path[0][0], ay: c.path[0][1], dx: c.path[1][0] - c.path[0][0], dy: c.path[1][1] - c.path[0][1] }; w.l2 = w.dx * w.dx + w.dy * w.dy || 1; if (ok2 && segD(rx2, ry2, w) < c.r + 6) ok2 = false; });
        if (ok2) add({ id: 'river' + rv++, group: 'river', shape: 'circle', x: rx2, y: ry2, w: 5, h: 5, rot: 0, color: COL.lava });
      }
      carry = u - sl;
    }
    var byId = {}, groups = {};
    list.forEach(function (l) { byId[l.id] = l.i; (groups[l.group] = groups[l.group] || []).push(l.i); });
    var N = list.length, NDROP = groups.drops.length, LOOP = groups.loop, GAUGE = groups.gauge, ERUPT = groups.erupt;
    var KICK = byId.kick, SAVER = byId.saveR, OUTL = byId.outL, OUTR = byId.outR, SAVE = byId.save;
    var INL = [byId.inL0, byId.inL1, byId.inR0, byId.inR1], ringsOf = [[], [], []];
    (groups.rings || []).forEach(function (i) { ringsOf[list[i].b].push(i); });
    var SLING = [[], []];
    (groups.slings || []).forEach(function (i) { SLING[list[i].side].push(i); });
    var SHOTS = ['crater', 'ramp', 'orbitL', 'orbitR', 'obsidian', 'geyser', 'lavaL', 'lavaR'];
    // THE NEXT SHOT (5 Nov 2026, wave 3): W.next.shot (goals.js) names one shot; its lamps race in and its arrow pulses,
    // and every other shot's idle chase dims to 30%. Each shot id of CONTRACT v1 has its own lamps here.
    var NEXTSET = {
      crater: chains.crater.concat(groups.crown), ramp: chains.ramp.concat([byId['jp.ramp']]), orbitL: chains.orbitL, orbitR: chains.orbitR,
      lavaL: chains.lavaL.concat([byId['jp.lavaL']]), lavaR: chains.lavaR.concat([byId['jp.lavaR']]), drops: chains.obsidian.concat(groups.drops),
      crabs: chains.crabs || [], pops: (groups.bumpers || []).concat(groups.rings || []), geyser: chains.geyser, lanes: groups.lanes.concat(groups.skill), loop: LOOP
    };
    var NEXTARROW = { crater: byId.crater, ramp: byId.ramp, orbitL: byId.orbitL, orbitR: byId.orbitR, lavaL: byId.lavaL, lavaR: byId.lavaR, drops: byId.obsidian, crabs: byId.crabs, geyser: byId.geyser };
    var CROWN = groups.crown, JPS = groups.jackpot, MODES = groups.modes, BOSS = groups.boss, COMBO = groups.combo, TAGS = groups.tags, PLUG = byId.plug;
    var DIM = 1;   // the idle chases' scale this frame: 0.3 while a NEXT shot is named
    function nextOf(W) { var n = W && W.next; return n && typeof n.shot === 'string' && NEXTSET[n.shot] ? n.shot : null; }
    // which island mode an id names (goals.js may use a name, a number or an object: all are understood)
    var MODEKEYS = [/crab/i, /quarr|obsid/i, /storm|orbit/i, /heat|wave|ramp/i];
    function modeIndex(m) {
      if (m == null || m === false) return -1;
      if (typeof m === 'number') return m >= 0 && m < 4 ? m | 0 : -1;
      if (typeof m === 'object') return modeIndex(m.id != null ? m.id : m.name != null ? m.name : m.i != null ? m.i : m.index);
      for (var q = 0; q < 4; q++) if (MODEKEYS[q].test(String(m))) return q;
      return -1;
    }
    function bossPhase(W) {   // 1-3 while the boss is up (goals.js's W.goals.boss or W.goals.mission.boss), else 0
      var G = W.goals, b = G && (G.boss || (G.mission && G.mission.boss));
      var ph = b ? (typeof b === 'number' ? b : b.phase) : 0;
      if (!(ph > 0) && W.crater && W.crater.boss) ph = W.crater.sealed ? 1 : 2;
      return ph > 0 ? Math.min(3, ph | 0) : 0;
    }

    // ---------------------------------------------------------------- the big moments' light shows (29 Oct 2026, owner: "push it
    // further", "bigger light shows"): short whole-table shows, choreographed from where each lamp sits (worked out once
    // here) and started by what the world shows changed (its counters and toys), so level() still only reads the world.
    // The base lamps dip while a show runs; a whole-table blink alternates lamp by lamp (the table's light stays even),
    // so nothing flashes the whole table more than 3 times a second.
    var PX = new Float32Array(N), PY = new Float32Array(N), DV = new Float32Array(N), AV = new Float32Array(N), DB = new Float32Array(N), DM = new Float32Array(N), AM = new Float32Array(N), HB = new Uint8Array(N), KIND = new Uint8Array(N);
    var DMAX = Math.hypot(TW, TH), bnk = { x: bank.x, y: bank.y }, mid = { x: M, y: TH * 0.52 };
    function hueOf(c) { var m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(c || ''); if (!m) return 4; var r = parseInt(m[1], 16) / 255, g2 = parseInt(m[2], 16) / 255, b2 = parseInt(m[3], 16) / 255, mx2 = Math.max(r, g2, b2), mn = Math.min(r, g2, b2), d = mx2 - mn, h; if (d < 0.2) return 4; h = mx2 === r ? ((g2 - b2) / d + 6) % 6 : mx2 === g2 ? (b2 - r) / d + 2 : (r - g2) / d + 4; h *= 60; return h < 20 || h > 330 ? 4 : h < 40 ? 1 : h < 75 ? 0 : h < 140 ? 4 : h < 210 ? 2 : h < 300 ? 3 : 4; }   // 0 gold, 1 orange, 2 teal, 3 violet, 4 the rest
    for (var li = 0; li < N; li++) {
      var Li = list[li], i = li;
      PX[i] = Li.x / TW; PY[i] = Li.y / TH; DV[i] = Math.hypot(Li.x - V.x, Li.y - V.y) / (DMAX * 0.8); AV[i] = (Math.atan2(Li.y - V.y, Li.x - V.x) / (2 * PI) + 1) % 1;
      DB[i] = Math.hypot(Li.x - bnk.x, Li.y - bnk.y) / (DMAX * 0.8); DM[i] = Math.hypot(Li.x - mid.x, Li.y - mid.y) / (DMAX * 0.55); AM[i] = (Math.atan2(Li.y - mid.y, Li.x - mid.x) / (2 * PI) + 1) % 1;
      HB[i] = hueOf(Li.color);
      KIND[i] = Li.group === 'gauge' || Li.group === 'crater' || Li.group === 'erupt' ? 1 : Li.group === 'lava' || Li.group === 'river' || Li.group === 'slings' ? 2 : Li.id === 'save' || Li.id === 'saveR' || Li.id === 'outR' ? 3 : 0;   // 1 the volcano's own, 2 the lava's, 3 the ball save's
    }
    var LANETOP = [list[byId['lavaL.c3']], list[byId['lavaR.c3']]], SKILLAT = [0, 1, 2].map(function (k) { return list[byId['lane' + k]]; });
    // name: [ms, priority, how far the base lamps dip]
    var SHOWDEF = {
      launch: [1400, 3, 0.55], drops: [1000, 4, 0.6], loop: [1000, 4, 0.6], combo: [1300, 5, 0.7], crater: [1000, 5, 0.5], quake: [900, 6, 0.5],
      overload: [1300, 6, 0.85], ready: [1400, 6, 0.75], save: [1500, 7, 0.8], skill: [1700, 7, 0.85], lavashot: [1900, 7, 0.85], lavaopen: [950, 8, 0.85],
      extra: [2400, 9, 0.92], eruption: [2500, 10, 0.92],
      // wave 3 (5 Nov 2026): THE BIG ONE's moments, read from the world's counters like the rest
      lock: [1200, 5, 0.6], plugsave: [1100, 6, 0.7], jackpot: [1600, 8, 0.85], super: [2200, 9, 0.92], mball: [1800, 9, 0.85], dive: [1400, 8, 0.85]
    };
    Object.keys(SHOWDEF).forEach(function (nm) { SHOWDEF[nm][3] = ['launch', 'drops', 'loop', 'combo', 'crater', 'quake', 'overload', 'ready', 'save', 'skill', 'lavashot', 'lavaopen', 'extra', 'eruption', 'lock', 'plugsave', 'jackpot', 'super', 'mball', 'dive'].indexOf(nm); });   // (showLamp switches on a number: quicker than on the name)
    function bandF(d, f, w) { var e = d - f; if (e < 0) e = -e; return e < w ? 1 - e / w : 0; }
    function rings3(d, f, w) { return Math.max(bandF(d, f, w), 0.8 * bandF(d, f - 0.32, w), 0.6 * bandF(d, f - 0.64, w)); }
    function colourWave(i, q) { return bandF(HB[i] * 0.9 + PY[i] * 1.6, q * 6.2 - 0.8, 0.85); }   // the colours in turn (gold, orange, teal, violet, the rest), rolling down the table
    function checker(i, e, ms) { return ((i + Math.floor(e / ms)) & 1) ? 1 : 0.12; }   // half the lamps on, swapping (an even light: never a whole-table flash)
    function fadeEnd(p, from) { return p < from ? 1 : (1 - p) / (1 - from); }
    var LX = new Float32Array(N), LY = new Float32Array(N), RD = 1 / (DMAX * 0.75);
    for (var lj = 0; lj < N; lj++) { LX[lj] = list[lj].x; LY[lj] = list[lj].y; }
    function distTo(i) { var dx = LX[i] - SH.x, dy = LY[i] - SH.y; return Math.sqrt(dx * dx + dy * dy) * RD; }   // (from the show's own point; no Math.hypot: it is slow)
    var SH = { W: null, f: -1, name: '', code: -1, t0: 0, ms: 0, pri: 0, dip: 0, x: 0, y: 0, side: 0, rel: -1, full: false, ashT0: 0, s: null };
    function snapOf(W) {
      var st = W.stats || {}, tq = W.toys || {}, lid = 0, bs = W.balls || [];
      for (var q = 0; q < bs.length; q++) if (bs[q].launched && bs[q].id > lid) lid = bs[q].id;
      return { er: st.eruptions || 0, cr: st.craters || 0, sv: st.saves || 0, sk: st.skill || 0, qk: st.quakes || 0, lv: st.lava || 0, lp: st.loops || 0, tot: W.total || 0,
        cb: W.goals && W.goals.combo ? W.goals.combo.n | 0 : 0, dd: W.dropsDown || 0, lk: st.locks || 0, ps: st.plugSaves || 0, jp: st.jackpots || 0, su: st.supers || 0, mb: st.multiballs || 0, dv: !!(W.dive && W.dive.held), rd: !!(tq.volcano && tq.volcano.ready), pend: !!(tq.quake && tq.quake.pending), lid: Math.max(lid, SH.s ? SH.s.lid : 0) };
    }
    function startShow(name, t, x, y, side) {
      var d = SHOWDEF[name];
      if (SH.name && t - SH.t0 < SH.ms && SH.pri > d[1]) return;   // a bigger show is running
      SH.name = name; SH.code = d[3]; SH.t0 = t; SH.ms = d[0]; SH.pri = d[1]; SH.dip = d[2]; SH.x = x || 0; SH.y = y || 0; SH.side = side || 0;
    }
    function watch(W, t) {   // what changed since the last call: start the show it deserves (a new world, or a jump of over half a second, starts afresh, quietly)
      if (W !== SH.W || W.frame < SH.f || W.frame > SH.f + 30) { SH.W = W; SH.s = null; SH.s = snapOf(W); SH.name = ''; SH.rel = -1; SH.full = false; SH.f = W.frame; return; }
      if (t < SH.t0) SH.name = '';   // (the clock went back)
      SH.f = W.frame;
      var o = SH.s, n = snapOf(W), Vw = W.toys && W.toys.volcano;
      SH.s = n;
      if (n.lid > o.lid) startShow('launch', t);
      if (n.dd >= NDROP && o.dd < NDROP) startShow('drops', t);
      if (n.lp > o.lp) startShow('loop', t);
      if (n.cb > o.cb && n.cb > 1) startShow('combo', t);
      if (n.qk > o.qk) startShow('quake', t);
      if (n.pend && !o.pend) startShow('overload', t);
      if (n.rd && !o.rd) startShow('ready', t);
      if (SH.name === 'ready' && !n.rd) SH.name = '';   // (the pressure gone: the crater took it, or a new ball)
      if (n.sv > o.sv) startShow('save', t);
      if (n.sk > o.sk) { var sa = SKILLAT[W.skill] || SKILLAT[1]; startShow('skill', t, sa.x, sa.y); }
      if (n.lv > o.lv) { var sd = W.lit && W.lit.lava && W.lit.lava[1] > W.lit.lava[0] ? 1 : 0; startShow('lavashot', t, LANETOP[sd].x, LANETOP[sd].y, sd); }
      if (n.cr > o.cr && Vw) { SH.rel = Vw.release; SH.full = n.er > o.er; if (SH.full) { SH.ashT0 = t; startShow('lavaopen', t); } }
      if (n.tot > o.tot) startShow('extra', t);
      if (n.lk > o.lk) startShow('lock', t);
      if (n.ps > o.ps) startShow('plugsave', t);
      if (n.jp > o.jp) startShow('jackpot', t);
      if (n.su > o.su) startShow('super', t);
      if (n.mb > o.mb) startShow('mball', t);
      if (n.dv && !o.dv) startShow('dive', t);
      if (SH.rel >= 0 && W.frame >= SH.rel) { startShow(SH.full ? 'eruption' : 'crater', t); SH.rel = -1; SH.full = false; }
    }
    // how a show lights lamp i at p (0..1 through it), e ms in
    function showLamp(code, i, p, e) {
      var v = 0, k = KIND[i];
      switch (code) {
        case 0:  /* launch */   // a wave up the table from the shore, then rings closing in on the volcano, which lights up
          v = p < 0.6 ? bandF(1 - PY[i], -0.1 + 1.3 * p / 0.6, 0.15) : 0;
          if (p > 0.4) v = Math.max(v, bandF(DV[i], 1.05 - 1.2 * (p - 0.4) / 0.6, 0.12), k === 1 && p > 0.8 ? checker(i, e, 70) : 0);
          return v;
        case 1:  /* drops */ return rings3(DB[i], p * 1.5, 0.12) * fadeEnd(p, 0.7) + (HB[i] === 3 ? 0.5 * checker(i, e, 80) * (1 - p) : 0);
        case 2:  /* loop */ { var q = p, x = q < 0.5 ? q * 2 : 2 - q * 2; return bandF(PX[i], -0.1 + 1.2 * x, 0.18) * (HB[i] === 2 ? 1 : 0.8) + (HB[i] === 2 ? 0.25 * checker(i, e, 90) : 0); }
        case 3:  /* combo */ { var a = AV[i] * 3 - p * 3.5; a -= Math.floor(a); return Math.max(bandF(a, 0.5, 0.26), 0.7 * bandF(DV[i], (p * 2.2) % 1.1, 0.1)) * fadeEnd(p, 0.85); }
        case 4:  /* crater */ return Math.max(rings3(DV[i], p * 1.4, 0.13), k === 1 ? 1 - p : 0) * fadeEnd(p, 0.6);
        case 5:  /* quake */ return Math.max(bandF(PX[i], 0.5 + 0.6 * Math.sin(p * PI * 3), 0.16), k === 1 ? checker(i, e, 60) : 0) * fadeEnd(p, 0.8);
        case 6:  /* overload */   // the hot lamps flicker wildly, everything else holds its breath
          return HB[i] <= 1 || k === 1 ? (hashF(i, Math.floor(e / 45)) > 0.45 ? 1 : 0.1) * fadeEnd(p, 0.75) : 0;
        case 7:  /* ready */ return Math.max(bandF(DV[i], 1.05 - 1.25 * ((p * 2) % 1), 0.12), k === 1 ? checker(i, e, 80) : 0) * fadeEnd(p, 0.85);
        case 8:  /* save */   // the ball save lamps race, two sweeps up the table (teal brightest), then a settle
          if (k === 3) return checker(i, e, 70);
          return bandF(1 - PY[i], -0.15 + 1.3 * ((p * 2) % 1), 0.22) * (HB[i] === 2 ? 1 : 0.85) * fadeEnd(p, 0.85);
        case 9:  /* skill */ {   // rings out of the skill lane, then the colours roll down the table
          var d = distTo(i);
          return Math.max(p < 0.65 ? rings3(d, p * 2.1, 0.11) : 0, p > 0.5 ? colourWave(i, (p - 0.5) / 0.5) : 0) * fadeEnd(p, 0.9);
        }
        case 10:  /* lavashot */ {   // up the lane, rings out of its top, the hot colours roll, then everything chases and settles
          var sx = SH.side ? 1 - PX[i] : PX[i], dl = distTo(i);
          if (p < 0.3) return sx < 0.3 ? bandF(1 - PY[i], -0.1 + 1.4 * p / 0.3, 0.16) : 0;
          if (p < 0.7) return Math.max(rings3(dl, (p - 0.25) * 2.6, 0.12), HB[i] <= 1 ? 0.6 * colourWave(i, (p - 0.3) / 0.4) : 0);
          return (HB[i] <= 1 || k === 2 ? checker(i, e, 90) : 0.5 * checker(i + 1, e, 90)) * fadeEnd(p, 0.75);
        }
        case 11:  /* lavaopen */   // the lava pours out of the volcano down its lanes and the river; rings follow it out
          return k === 2 ? Math.max(bandF(DV[i], p * 1.4, 0.2), p > 0.5 ? 0.6 : 0) : k === 1 ? 1 : 0.7 * bandF(DV[i], p * 1.4 - 0.15, 0.1);
        case 12:  /* extra */ {   // a spiral round the middle, the colours rolling, then the whole table chasing, and a settle
          var b = AM[i] * 4 - p * 5; b -= Math.floor(b);
          if (p < 0.45) return Math.max(bandF(b, 0.5, 0.22), bandF(DM[i], p * 2.4, 0.12));
          if (p < 0.75) return Math.max(colourWave(i, (p - 0.45) / 0.3), 0.4 * bandF(b, 0.5, 0.2));
          return checker(i, e, 85) * fadeEnd(p, 0.85) + (k === 3 ? 0.4 : 0);
        }
        case 13:  /* eruption */ {   // white-hot, rings racing out of the crater with glitter, the colours rolling, a chase, a settle
          if (e < 260) return 1 - 0.3 * (e / 260);
          if (p < 0.55) return Math.max(rings3(DV[i], (e - 260) / (SH.ms * 0.55 - 260) * 1.7, 0.11), hashF(i, Math.floor(e / 60)) > 0.7 ? 0.8 : 0, k === 1 ? 0.9 : 0);
          if (p < 0.78) return Math.max(colourWave(i, (p - 0.55) / 0.23), k ? 0.6 : 0);
          return Math.max(checker(i, e, 80) * fadeEnd(p, 0.84), k === 2 ? 0.5 * (1 - p) * 4 : 0);
        }
        case 14:  /* lock */ return Math.max(rings3(DV[i], p * 1.3, 0.12), KIND[i] === 1 ? 0.8 : 0) * fadeEnd(p, 0.7);
        case 15:  /* plugsave */   // a wave up from the plug between the flippers
          return Math.max(bandF(1 - PY[i], -0.1 + 1.25 * p, 0.2), KIND[i] === 3 ? checker(i, e, 110) : 0) * fadeEnd(p, 0.8);
        case 16:  /* jackpot */ {   // gold rings out of the crater, then the gold lamps chase and settle
          if (p < 0.55) return Math.max(rings3(DV[i], p * 2.2, 0.12), HB[i] === 0 ? 0.5 * checker(i, e, 90) : 0);
          return (HB[i] === 0 || HB[i] === 1 ? checker(i, e, 90) : 0.3 * checker(i + 1, e, 90)) * fadeEnd(p, 0.75);
        }
        case 17:  /* super */ {   // a spiral round the volcano, the colours rolling, a gold chase
          var sa = AV[i] * 3 - p * 4; sa -= Math.floor(sa);
          if (p < 0.5) return Math.max(bandF(sa, 0.5, 0.25), rings3(DV[i], p * 2.4, 0.11), k === 1 ? 1 : 0);
          if (p < 0.78) return Math.max(colourWave(i, (p - 0.5) / 0.28), k === 1 ? 0.8 : 0);
          return checker(i, e, 85) * fadeEnd(p, 0.84);
        }
        case 18:  /* mball */ {   // the multiball under way: both sides racing up the table, the lava lanes hottest
          var sx2 = PX[i] < 0.5 ? PX[i] : 1 - PX[i];
          return Math.max(bandF(1 - PY[i], (p * 2) % 1 * 1.3 - 0.15, 0.16) * (sx2 < 0.3 ? 1 : 0.7), k === 2 ? 0.6 * checker(i, e, 90) : 0) * fadeEnd(p, 0.85);
        }
        case 19:  /* dive */   // the table drains into the crater: rings closing in on it, then dark
          return Math.max(bandF(DV[i], 1.1 - 1.3 * p, 0.14), k === 1 ? 1 - p * 0.5 : 0) * fadeEnd(p, 0.8);
      }
      return v;
    }
    // the wave 3 inserts (THE BIG ONE, the goals) and the NEXT shot
    function waveThree(W, t, out, lit, V, NX, CL, MB, G, CB) {
      var k, i, C = W.crater || {};
      // the crown: every lit award pulses; the one the crater takes next (CL[0]) blinks hard; sealed, all dark but a slow
      // warning; the award just taken (C.took) holds on while the crater has the ball
      for (k = 0; k < CROWN.length; k++) {
        var aw = list[CROWN[k]].award, at = CL.indexOf(aw);
        if (V && V.busy && C.took === aw) out[CROWN[k]] = 1;
        else if (C.sealed) out[CROWN[k]] = aw === 'super' ? 0 : 0.04 + 0.12 * breatheF(t, 1600, k * 0.1);
        else if (at === 0) out[CROWN[k]] = blinkF(t, 120) ? 1 : 0.35;
        else if (at > 0) out[CROWN[k]] = 0.45 + 0.4 * breatheF(t, 700, k * 0.13);
        else if (aw === 'lock' && W.lock && W.lock.n > 0) out[CROWN[k]] = 0.7;   // a lock banked
        else out[CROWN[k]] = 0.02 + 0.06 * breatheF(t, 2200, k * 0.2);
      }
      // the jackpots: lit ones blink; one just collected (lit no more, W.lit.jackpot running) flashes; no multiball, dark
      for (k = 0; k < JPS.length; k++) {
        var key = list[JPS[k]].jp, on = MB && MB.jp && MB.jp[key];
        out[JPS[k]] = on ? (blinkF(t + k * 70, 150) ? 1 : 0.3) : MB && lit.jackpot > 0 ? blinkF(t, 60) : MB ? 0.08 : 0.02 + 0.04 * breatheF(t, 2600, k * 0.3);
      }
      // the plug: up, on (blinking in its last 3 s); a save just made, flashing; down, a dim glow
      var PL = W.plug;
      out[PLUG] = lit.plug > 0 ? blinkF(t, 60) : PL && PL.up ? (PL.t < 180 ? blinkF(t, 140) : 1) : 0.03 + 0.08 * breatheF(t, 2000, 0.3);
      // the island modes: done ones on, the running one blinking, the next one (MODE lit at the crater) pulsing
      var md = G ? modeIndex(G.mode) : -1, done = G ? G.modesDone : 0, nxt = -1;
      if (G && (G.modeLit || C.mode) && md < 0) nxt = (typeof done === 'number' ? done : done && done.length ? done.length : 0) % 4;
      for (k = 0; k < MODES.length; k++) {
        var dn = typeof done === 'number' ? k < done : done && typeof done.indexOf === 'function' ? done.some(function (d) { return modeIndex(d) === k; }) : false;
        out[MODES[k]] = k === md ? (blinkF(t, 160) ? 1 : 0.3) : k === nxt ? 0.3 + 0.6 * breatheF(t, 800, 0) : dn ? 0.85 : 0.03 + 0.05 * breatheF(t, 2400, k * 0.25);
      }
      // the boss's phases: the current peak blinks, the ones beaten stay on
      var bp = bossPhase(W);
      for (k = 0; k < BOSS.length; k++) out[BOSS[k]] = !bp ? 0.02 + 0.05 * breatheF(t, 2800, k * 0.3) : k + 1 < bp ? 0.8 : k + 1 === bp ? (blinkF(t, 220) ? 1 : 0.35) : 0.06;
      // the combo ladder: one step for each shot chained while its clock runs, the next step pulsing; a SUPER COMBO, all
      var cn = CB && CB.t > 0 ? CB.n | 0 : 0;
      for (k = 0; k < COMBO.length; k++) out[COMBO[k]] = cn >= 5 ? blinkF(t + k * 40, 90) : k < cn ? 1 : k === cn && cn > 0 ? 0.25 + 0.5 * breatheF(t, 400, 0) : 0.02 + 0.05 * breatheF(t, 1900, k * 0.15);
      // the mutation tags: one lens for each, in order
      var tg = W.mod && W.mod.tags && W.mod.tags.length ? W.mod.tags.length : 0;
      for (k = 0; k < TAGS.length; k++) out[TAGS[k]] = k < tg ? 0.7 + 0.3 * breatheF(t, 1500, k * 0.25) : 0.015 + 0.05 * breatheF(t, 3000, k * 0.25);
      // the magma crab: racing while CRAB HUNT runs
      if (chains.crabs) out[chains.crabs[0]] = md === 0 ? blinkF(t, 140) : 0.03 + 0.25 * DIM * breatheF(t, 1300, 0);
      // THE NEXT SHOT: its lamps race in (far end first) and its arrow pulses, over everything else
      if (NX) {
        var ns = NEXTSET[NX], na = NEXTARROW[NX];
        if (na != null && chains[NX === 'drops' ? 'obsidian' : NX]) {
          var ch = chains[NX === 'drops' ? 'obsidian' : NX], tmp = NXT || (NXT = new Float32Array(N));
          for (i = 0; i < ch.length; i++) tmp[ch[i]] = 0;
          cometF(tmp, ch, t, 75, 1, 0.35);
          for (i = 0; i < ch.length; i++) out[ch[i]] = Math.max(out[ch[i]], tmp[ch[i]]);
          out[na] = Math.max(out[na], 0.5 + 0.5 * breatheF(t, 560, 0));
          for (i = 0; i < ns.length; i++) if (ch.indexOf(ns[i]) < 0) out[ns[i]] = Math.max(out[ns[i]], 0.3 + 0.5 * breatheF(t, 560, 0));
        } else for (i = 0; i < ns.length; i++) out[ns[i]] = Math.max(out[ns[i]], 0.35 + 0.65 * breatheF(t, 560, (i % 4) * 0.25));
      }
    }
    var NXT = null;
    function shows(W, t, out) {
      watch(W, t);
      var Vw = W.toys && W.toys.volcano, i;
      // under the ash (a full eruption on its way, after the lava pours): the table goes dark but for the volcano and the lava
      if (SH.rel >= 0 && SH.full && Vw && Vw.busy && t - SH.ashT0 > 700) {
        var ak = Math.min(1, (t - SH.ashT0 - 700) / 500), left = Math.max(0, (SH.rel - W.frame) / (T.volcano.hold || 165)), per = 70 + 190 * left;
        for (i = 0; i < N; i++) {
          var kk = KIND[i];
          out[i] = kk === 1 ? (Math.floor((t - SH.ashT0) / per) & 1 ? 1 : 0.25) : kk === 2 ? Math.max(out[i] * (1 - ak), 0.12 + 0.18 * hashF(i, Math.floor(t / 90))) : out[i] * (1 - 0.9 * ak);
        }
      }
      if (!SH.name) return;
      var e = t - SH.t0;
      if (e >= SH.ms || e < 0) { SH.name = ''; return; }
      var p = e / SH.ms, dip = SH.dip * (e < 100 ? e / 100 : p > 0.8 ? (1 - p) / 0.2 : 1), keep = 1 - dip;
      var hot = SH.name === 'ready';   // (full pressure: the gauge and the crater's shot keep their own race under the show)
      for (i = 0; i < N; i++) { var sv = showLamp(SH.code, i, p, e); out[i] = Math.min(1, Math.max(hot && KIND[i] === 1 ? out[i] : out[i] * keep, sv)); }
    }

    // ---------------------------------------------------------------- how bright each lamp should be
    function shotLamps(out, id, t, state, count) {   // 'idle': a slow dim chase in towards the shot; 'lit': racing; 'made': flashing
      var ch = chains[id], a = byId[id], k;
      if (state === 'made') { var f = blinkF(t, 70); for (k = 0; k < ch.length; k++) out[ch[k]] = f; return; }
      if (state === 'lit') {
        cometF(out, ch, t, 60, 1, 0.12);
        out[a] = blinkF(t, 180) ? 1 : 0.3;
        var ai = ch.indexOf(a);
        if (count) for (k = 0; k < 3 && k < count && k < ai; k++) out[ch[ai - 1 - k]] = 1;   // a combo holds lamps on: p0 first
        return;
      }
      cometF(out, ch, t, 190, IDLE * DIM, 0.02 * DIM);
    }
    // the pressure (the gauge round the volcano, E-R-U-P-T on the shore): lit up to the pressure, the next one pulsing,
    // the rest a slow dim chase in towards it. Full: a chase round all of it. Over full: everything blinks (erupt now!).
    // The crater holding the ball (an eruption on its way): a fierce flicker.
    function pressure(out, ids, t, V, full, mb) {   // full: the eruption the pressure builds to (W.press.level); mb: W.mb
      var n = ids.length, k;
      if (!V) { for (k = 0; k < n; k++) out[ids[k]] = 0.03 + 0.1 * breatheF(t, 2400, k * 0.1); return; }
      if (mb && mb.on && !V.busy) { cometF(out, ids, t, 70, 1, 0.3); return; }   // the eruption multiball: a race round it all
      if (V.busy) { for (k = 0; k < n; k++) out[ids[k]] = hashF(ids[k], Math.floor(t / 50)) > 0.35 ? 1 : 0.35; return; }
      if (V.red) { for (k = 0; k < n; k++) out[ids[k]] = (blinkF(t, 90) + k) % 2 ? 1 : 0.2; return; }
      if (V.ready) { cometF(out, ids, t, 60, 1, 0.6); return; }
      var lit = Math.min(n, Math.floor(V.pressure / full * n + 1e-6)), pos = Math.floor(t / 260) % (n + 2);
      for (k = 0; k < n; k++) out[ids[k]] = k < lit ? 1 : k === lit ? 0.08 + 0.32 * breatheF(t, 700, 0) : (pos === k ? 0.12 : 0.03);
    }
    function rings(out, b, t, ms, head) {
      var r = ringsOf[b], n = r.length; if (!n) return;
      var pos = Math.floor(t / ms + b * 3) % n;
      for (var k = 0; k < n; k++) { var d = (pos - k + n) % n; out[r[k]] = d === 0 ? head : d === 1 ? head * 0.4 : head * 0.08; }
    }
    function attract(out, t) {
      // 24 s: waves up the table; a sweep side to side; the shots racing in while the rest sparkles and the gauge fills;
      // then everything breathing, the rings spinning and the loop chasing
      var c = t % 24000, i, l;
      if (c < 8000) {
        var front = -0.25 + 1.6 * fracF(t / 1500);
        for (i = 0; i < N; i++) { l = list[i]; var d = front - (1 - l.y / TH); out[i] = d >= 0 && d < 0.3 ? 1 - d / 0.3 : 0; }
      } else if (c < 11000) {
        var s = (c - 8000) / 1500, fxp = s < 1 ? s : 2 - s, sx = -0.2 + 1.4 * fxp;
        for (i = 0; i < N; i++) { l = list[i]; var e = Math.abs(sx - l.x / TW); out[i] = e < 0.14 ? 1 - e / 0.14 : 0; }
      } else if (c < 18000) {
        var tick = Math.floor(t / 110);
        for (i = 0; i < N; i++) out[i] = hashF(i, tick) > 0.8 ? 0.9 : 0.05;
        SHOTS.forEach(function (id) { shotLamps(out, id, t, 'lit'); });
        var fill = Math.floor((c - 11000) / 7000 * (GAUGE.length + 1));
        for (i = 0; i < GAUGE.length; i++) out[GAUGE[i]] = i < fill ? 1 : 0.05;
        for (i = 0; i < ERUPT.length; i++) out[ERUPT[i]] = Math.floor(t / 160) % 7 === i ? 1 : 0.2;
      } else {
        var beat = breatheF(t, 900, 0);
        for (i = 0; i < N; i++) { l = list[i]; out[i] = 0.08 + 0.5 * beat * (0.5 + 0.5 * Math.cos((l.x + l.y) * 0.05 - t * 0.004)); }
        for (i = 0; i < 3; i++) rings(out, i, t, 55, 1);
        cometF(out, LOOP, t, 80, 1, 0.1);
        cometF(out, GAUGE, t, 70, 1, 0.1);
      }
    }
    function level(W, t, mode, out) {
      out = out || new Float32Array(N);
      var i, k;
      t = t || 0;
      if (mode === 'title') { attract(out, t); return out; }
      for (i = 0; i < N; i++) out[i] = 0;
      if (!W || mode === 'over' || W.over || W.tilted) return out;
      var lit = W.lit || {}, toys = W.toys || {}, V = toys.volcano, full = W.press && W.press.level > 0 ? W.press.level : T.pressure ? T.pressure.full : 1;
      var NX = nextOf(W), CL = (W.crater && W.crater.lit) || [], MB = W.mb || null, GO = W.goals || null, CB = GO && GO.combo ? GO.combo : null;
      DIM = NX ? 0.3 : 1;
      // the skill lanes and the skill shot
      for (i = 0; i < 3; i++) {
        var ln = byId['lane' + i];
        if (lit.lane && lit.lane[i] > 0) out[ln] = blinkF(t, 70);
        else if (W.lanes && W.lanes[i]) out[ln] = 1;
        else out[ln] = 0.02 + 0.1 * breatheF(t, 1800, i * 0.18);
        if (W.skillOpen && W.skill === i) out[byId['skill' + i]] = blinkF(t, 160);
        else out[byId['skill' + i]] = W.skillOpen ? 0.05 : 0;
      }
      // the orbits and the loop over the arch (lit while a LOOP is waiting)
      var loop = !!W.orbitFrom;
      shotLamps(out, 'orbitL', t, lit.orbitL > 0 ? 'made' : loop ? 'lit' : 'idle');
      shotLamps(out, 'orbitR', t, lit.orbitR > 0 ? 'made' : loop ? 'lit' : 'idle');
      if (lit.orbitL > 0 || lit.orbitR > 0) for (k = 0; k < LOOP.length; k++) out[LOOP[k]] = blinkF(t, 70);
      else if (loop) cometF(out, LOOP, t, 70, 1, 0.12, W.orbitFrom === 'R');
      else cometF(out, LOOP, t, 260, IDLE * DIM, 0.02 * DIM, (Math.floor(t / 1560) & 1) === 1);
      // the heat ramp: lit while a combo runs, and while the crater is ready to erupt
      // the heat ramp: lit while its multiball jackpot is (the old ramp combo is gone: goals.js scores combos; a running
      // combo holds its lamps on, one for each shot chained)
      var comboOn = CB && CB.t > 0 && CB.n > 0;
      shotLamps(out, 'ramp', t, lit.ramp > 0 ? 'made' : MB && MB.jp && MB.jp.ramp ? 'lit' : 'idle', comboOn ? CB.n : 0);
      // the obsidian targets: down ones lit, a just-hit one flashing, a dim chase along the ones still up
      var dpos = Math.floor(t / 230) % 7, ndn = 0;
      for (i = 0; i < NDROP; i++) {
        var dl = byId['drop' + i];
        if (lit.drop && lit.drop[i] > 0) out[dl] = blinkF(t, 60);
        else if (W.drops && !W.drops[i]) { out[dl] = 1; ndn++; }
        else out[dl] = dpos === i ? 0.25 : 0.03;
      }
      shotLamps(out, 'obsidian', t, lit.kick > 60 || lit.plug > 0 ? 'made' : ndn >= 3 ? 'lit' : 'idle');
      // the volcano: the crater's shot, the gauge, E-R-U-P-T
      shotLamps(out, 'crater', t, V && V.busy ? 'made' : CL.length && !(W.crater && W.crater.sealed) ? 'lit' : 'idle');
      pressure(out, GAUGE, t, V, full, MB);
      pressure(out, ERUPT, t, V, full, MB);
      // the geyser: puffing (the warning) blinks; cooling down it refills one lamp at a time; ready, a dim chase up it
      var G = toys.geyser, gch = chains.geyser;
      if (G && G.st === 'puff') for (k = 0; k < gch.length; k++) out[gch[k]] = blinkF(t, 60);
      else if (G && G.st === 'cool') { var cf = 1 - G.t / T.geyser.cool; for (k = 0; k < gch.length; k++) out[gch[k]] = cf > (k + 1) / (gch.length + 1) ? 0.22 : 0.02 + 0.04 * breatheF(t, 900, k * 0.2); }
      else cometF(out, gch, t, 210, IDLE * DIM, 0.03 * DIM);
      // the lava lanes: closed, they glow like embers (a dim flicker); open, a race up each lane (brighter as the gate rises)
      var Lv = toys.lava;
      ['lavaL', 'lavaR'].forEach(function (id, s) {
        var ch = chains[id], gt = Lv && Lv.gates[s];
        if (lit.lava && lit.lava[s] > 0) { for (k = 0; k < ch.length; k++) out[ch[k]] = blinkF(t, 60); return; }
        if (W.mb && W.mb.jp && W.mb.jp[id]) { cometF(out, ch, t + s * 90, 50, 1, 0.3); return; }   // its jackpot lit: racing
        if (Lv && Lv.open) {
          cometF(out, ch, t + s * 90, 55, 1, 0.25);
          var hk = 0.4 + 0.6 * (gt ? gt.h : 1);
          for (k = 0; k < ch.length; k++) out[ch[k]] *= hk;
          return;
        }
        for (k = 0; k < ch.length; k++) out[ch[k]] = 0.03 + 0.1 * hashF(ch[k] + s * 7, Math.floor(t / 130));
      });
      // the inlanes: blinking while a ramp combo runs, else a slow drip down to the flippers
      for (k = 0; k < 4; k++) {
        var st = list[INL[k]].step;
        out[INL[k]] = comboOn ? blinkF(t + st * 120, 120) : (Math.floor(t / 420) % 3 === st ? 0.25 : 0.02);
      }
      // the kickback (off, and warning, while a quake is coming), the ball save
      var Q = toys.quake;
      if (lit.kick > 0) out[KICK] = blinkF(t, 80); else if (W.kickback) out[KICK] = 1; else if (Q && Q.pending) out[KICK] = blinkF(t, 110) * 0.45;
      out[OUTL] = W.kickback ? 0.06 + 0.2 * breatheF(t, 1200, 0) : 0.02;
      if (W.saveT > 150) out[SAVE] = out[SAVER] = 1;
      else if (W.saveT > 0) out[SAVE] = out[SAVER] = blinkF(t, 110);
      else out[SAVER] = 0.02 + 0.1 * breatheF(t, 2000, 0.5);
      out[OUTR] = W.saveT > 0 ? blinkF(t + 55, 110) : 0.02 + 0.1 * breatheF(t, 2000, 0);
      // the slings: a kick flashes its three; open lava races down them; else an ember flicker, hotter with the pressure
      var hot = V ? Math.min(1, V.pressure / full) : 0;
      for (i = 0; i < 2; i++) {
        var sg = SLING[i];
        if (lit.sling && lit.sling[i] > 0) { for (k = 0; k < sg.length; k++) out[sg[k]] = 1; continue; }
        if (Lv && Lv.open) { cometF(out, sg, t + i * 120, 90, 0.9, 0.15); continue; }
        for (k = 0; k < sg.length; k++) out[sg[k]] = 0.04 + (0.1 + 0.25 * hot) * hashF(sg[k], Math.floor(t / 150));
      }
      // the bonus multiplier
      var m = W.mult || 1, mpos = Math.floor(t / 380) % (7 - Math.min(m, 5));
      for (i = 2; i <= 5; i++) out[byId['mult' + i]] = m >= i ? 1 : mpos === i - m - 1 ? 0.26 : 0.02;
      // the fumaroles
      for (i = 0; i < 3; i++) {
        var bl = byId['bump' + i], hit = lit.bump && (lit.bump[i] > 0 || lit.bump[(i + 1) % 3] > 0);
        out[bl] = hit ? 1 : (Math.floor(t / 420) + i) % 3 === 0 ? 0.3 : 0.06;
        if (lit.bump && lit.bump[i] > 0) { var r = ringsOf[i]; for (k = 0; k < r.length; k++) out[r[k]] = 1; }
        else rings(out, i, t, 150, IDLE);
      }
      // the lava river: a flow down from the volcano, quicker and hotter with the pressure; racing while the lava is open
      var RV = groups.river;
      if (RV) {
        if (Lv && Lv.open) cometF(out, RV, t, 45, 1, 0.3);
        else { cometF(out, RV, t, 230 - 140 * hot, 0.55 + 0.45 * hot, 0.1 + 0.12 * hot); for (k = 0; k < RV.length; k++) out[RV[k]] = Math.max(out[RV[k]], 0.12 + 0.12 * hashF(RV[k], Math.floor(t / 170))); }
      }
      // a quake: the whole table shudders (each lamp drops out at random, fast)
      if (Q && Q.t > 0) { var qt = Math.floor(t / 40); for (i = 0; i < N; i++) if (hashF(i, qt) < 0.45) out[i] *= 0.2; }
      waveThree(W, t, out, lit, V, NX, CL, MB, GO, CB);
      // the big moments' shows, over everything (29 Oct 2026)
      shows(W, t, out);
      return out;
    }
    // shows: the big moments this set lights itself (fx.js leaves the lamps of its own whole-table shows of these names alone)
    var OWN = { eruption: 1, erupt: 1, lavaopen: 1, extra: 1, save: 1, skill: 1, combo: 1, loop: 1, drops: 1, quake: 1, overload: 1, pfull: 1, lock: 1, plugsave: 1, jackpot: 1, superjackpot: 1, mbstart: 1, dive: 1 };
    return { id: 'ember', list: list, tags: tags, chains: chains, level: level, byId: byId, groups: groups, colors: COL, shows: OWN, next: NEXTSET, showNow: function () { return SH.name && SH.W ? { name: SH.name, t0: SH.t0, ms: SH.ms } : null; } };
  }

  // ================================================================ the sets, one per table, made when first asked for
  var BUILD = { orbit: buildOrbit, ember: buildEmber }, SETS = {};
  function forTable(id) {
    if (!(E.TABLES && E.TABLES[id]) && id !== 'orbit') id = E.DEFAULT || 'orbit';
    if (!SETS[id]) {
      if (BUILD[id] && (id === 'orbit' || E.table)) SETS[id] = BUILD[id]();
      else SETS[id] = { id: id, list: [], tags: [], chains: {}, byId: {}, groups: {}, colors: {}, level: function (W, t, m, out) { return out || new Float32Array(0); } };
    }
    return SETS[id];
  }
  var api = { forTable: forTable, version: 3 };
  function use(id) {   // point PinLamps.list (and the rest) at a table's set
    var s = forTable(id);
    api.id = s.id; api.list = s.list; api.tags = s.tags; api.chains = s.chains; api.byId = s.byId; api.groups = s.groups; api.colors = s.colors;
    return s;
  }
  api.use = use;
  api.level = function (W, t, mode, out) { return forTable(W && W.tableId ? W.tableId : api.id).level(W, t, mode, out); };
  use(E.DEFAULT || 'orbit');
  return api;
});
