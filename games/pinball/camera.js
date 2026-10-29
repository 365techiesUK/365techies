/* 365 Pinball Hero - the arcade camera director (16 Oct 2026, next-gen wave 2). It decides where the camera looks;
 * world3d.js only applies it. Plain ES5, no drawing: the same file runs in the page, in the forecast worker
 * (forecast-worker.js) and in node (tools/pinball/camera-farm.cjs proves its guarantee over thousands of balls).
 *
 *   PinCam.update(W, t, mode[, aspect]) -> shot   once per drawn frame (t in ms); shot = { cx, cy, span, tilt, yaw,
 *                                                 timeScale, state, zoom, A }
 *   PinCam.frame(shot, aspect) -> { eye, target, up, fov }   THE camera model, in table units (x across, y down the
 *                                                 table, z up out of the playfield; the playfield's own slope is the 3D
 *                                                 picture's business): the camera looks at (cx, cy, 0), tilted `tilt`
 *                                                 degrees from straight down towards the player's end, turned `yaw`
 *                                                 degrees about the table's up axis, far enough back that `span` table
 *                                                 units fill the screen's width at that point. The lens never changes
 *                                                 (fov 32 degrees, vertical): it zooms by moving closer.
 *   PinCam.project(shot, aspect, x, y, z) -> [sx, sy]   the same model: 0..1 across and down the screen
 *   PinCam.quiet()  -> true when no ball can reach any flipper's approach line in the next 0.8 s (fx.js asks before
 *                      moving the table)
 *   PinCam.setMode('calm' | 'arcade' | 'classic')   calm is the default (about 6 push-ins a minute); classic never
 *                      zooms, swings or slows: it only scrolls when the ball is out of the picture
 *   also: setAspect(a), home(aspect), reset(), stats(), info(), configure(opts), forecast(W, input, horizon, pathN),
 *         decided(W, ball), boxes(tableId), director(on)
 *
 * THE GUARANTEE (note 12 as corrected by note 17): game time at exactly 1.0, and every storey's flippers fully on screen
 * and still, for the 0.5 s before any ball can cross a storey's approach line. "Can cross" comes from the engine's own
 * look-ahead: a copy of the world (E.clone) stepped ~2.5 s ahead with the buttons held as they are, in a Web Worker
 * (re-asked on every change of the buttons, and whenever the answer runs out); until an answer arrives the ball counts
 * as close, so the camera never leaves home on a guess and starts home if it is away. If a fresh answer says a ball is
 * now too close for a normal return (a nudge changed its path) the camera CUTS home - counted (aim: under 1 per 100
 * balls). Every move home is the same 0.35 s smootherstep, started 1.45 s before the ball can arrive, so the picture
 * is still for a full second: half a second for the rule, half a second more for a press made early.
 *
 * HOME shows the WHOLE TABLE (Ember Peak is one screen since 29 Oct 2026, the owner's call: 270 x 470, one storey): every
 * storey's flipper box, the ball on the plunger and the top of the arch. In a portrait picture the width-filling shot
 * already shows it all (the table fills the width, the flippers low on the screen, the spare room above the arch); on
 * a wider screen the camera backs off until the arch's top is in. Follow and the close-ups are push-ins from there.
 *
 * States: home; follow (ball high and forecast to stay away; slow, damped, dead-zoned; zoom 1.25 calm, 1.35 arcade, a
 * plain scroll in classic); launch (two moves: the plunger, then up the lane to the skill lanes); closeup (the crater's
 * 2.75 s hold: the dive, then the pull-back over the island in slow motion as the ball fires skyward); rail (following
 * the ball down the wire rail); drain (decided by POSITION: the ball is past every bottom flipper's reach, below the
 * pivots, falling too fast for a nudge to save it, and clear of a lit kickback; slow motion 0.35 for 0.6 s); back (the
 * move home); director (attract and replays: free). Multiball, a tilt and the bonus count stay home. Slow motion only in
 * holds, the rail ride, a decided drain and the director, and never once a ball is under 0.75 s from an approach line. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(function () { return require('./engine.js'); }, null);
  else root.PinCam = factory(function () { return root.PinEngine; }, root);
})(typeof self !== 'undefined' ? self : this, function (getE, G) {
  'use strict';
  var DEG = Math.PI / 180, FOV = 32, TV = Math.tan(FOV * DEG / 2);
  var CFG = {
    tilt: 28,         // home's tilt (degrees from straight down), as the owner picked from the stills
    margin: 0.012,    // the flipper boxes keep this share of the screen clear at every edge
    pad: 4,           // table units round each flipper box: the shake (1.5) and the table's nudge slide (2.5)
    back: 0.35,       // seconds: every move home
    settle: 0.5,      // seconds home and still, at game speed 1.0, before any ball can cross an approach line (the rule)
    early: 0.5,       // and this much more on a normal move home, so a press made up to half a second before the ball
                      // arrives has also seen a still picture for half a second (the farm checks those presses too)
    spare: 0.1,       // seconds of safety on top
    horizon: 200,     // look-ahead, in game steps (3.3 s): more than calm's window plus a refresh's worth
    forecaster: 'auto', // 'auto' (a worker in the page, else in-line) or 'sync'
    latency: 0,       // node only: answers arrive this many updates late (to test "close until an answer arrives")
    craterZ: 48       // table units: the crater's lava pool above the playfield (world3d.js's cone, 60 tall at rest
                      // scale 0.85, since 29 Oct 2026): the dive looks at the pool, not the cone's foot
  };
  var MODES = {
    //          follow zoom, window (s free needed to push in), home dwell between push-ins, push-ins a minute,
    //          crater dive ('all' | 'first' | 'nod' | 'none'), yaw arc, slow motion, launch and drain shots, reach (how far
    //          below the top approach line a ball still counts as "high" enough to follow; the forecast still decides)
    calm:    { follow: 1.25, window: 2.2, dwell: 3.0, perMin: 6, dive: 'first', yaw: 8, slow: true, shots: true, reach: 40 },
    arcade:  { follow: 1.5, window: 1.75, dwell: 0.4, perMin: 20, dive: 'all', yaw: 16, slow: true, shots: true, reach: 110 },
    classic: { follow: 1.0, window: 1.6, dwell: 0.6, perMin: 0, dive: 'none', yaw: 0, slow: false, shots: false, reach: 40 }
  };
  var NEED = Math.ceil((CFG.back + CFG.settle + CFG.early + CFG.spare) * 60);   // steps before an arrival that the move home starts
  var SETTLE = Math.round(CFG.settle * 60);

  // ------------------------------------------------------------ the camera model
  function basis(s, aspect) {
    var T = s.tilt * DEG, Y = (s.yaw || 0) * DEG, tH = TV * aspect, d = s.span / (2 * tH);
    var bx = -Math.sin(Y), by = Math.cos(Y), sT = Math.sin(T), cT = Math.cos(T);   // b: "back", towards the player
    return {
      eye: [s.cx + d * sT * bx, s.cy + d * sT * by, d * cT],
      f: [-sT * bx, -sT * by, -cT], u: [-cT * bx, -cT * by, sT], r: [by, -bx, 0], tH: tH, d: d
    };
  }
  function frame(s, aspect) {
    var b = basis(s, aspect || ASPECT);
    return { eye: b.eye, target: [s.cx, s.cy, 0], up: b.u, fov: FOV, dist: b.d };
  }
  function projectB(b, x, y, z) {
    var vx = x - b.eye[0], vy = y - b.eye[1], vz = z - b.eye[2];
    var dz = vx * b.f[0] + vy * b.f[1] + vz * b.f[2];
    if (dz < 1e-6) return [NaN, NaN];
    return [0.5 + (vx * b.r[0] + vy * b.r[1]) / (dz * b.tH) / 2, 0.5 - (vx * b.u[0] + vy * b.u[1] + vz * b.u[2]) / (dz * TV) / 2];
  }
  function project(s, aspect, x, y, z) { return projectB(basis(s, aspect || ASPECT), x, y, z || 0); }
  // where the screen's centre column meets the playfield at the top and bottom edges (yaw ignored)
  function yEdges(s) {
    var T = s.tilt * DEG, sT = Math.sin(T), cT = Math.cos(T), d = s.span / (2 * TV * ASPECT), y0 = s.cy + d * sT;
    var den = cT - TV * sT;
    return [den > 1e-3 ? y0 - d * cT * (sT + TV * cT) / den : -1e9, y0 - d * cT * (sT - TV * cT) / (cT + TV * sT)];
  }

  // ------------------------------------------------------------ the table's flipper boxes and home
  var BOXES = {}, HOMES = {};
  function boxes(id) {   // per storey: its approach zone and flipper tops, padded (table units, with heights)
    var E = getE(), Bt = E.table(id), T = Bt.T, k = Bt.id;
    if (BOXES[k]) return BOXES[k];
    var p = CFG.pad;
    return (BOXES[k] = T.storeys.map(function (s, i) {
      // the zone's sides stop at the cabinet's walls (8 units in from its edges: the ball never gets nearer)
      var xa = Math.max(s.x0, 8) - p, xb = Math.min(s.x1, T.W - 8) + p;
      var pts = [[xa, s.approach - p, 0], [xb, s.approach - p, 0], [xa, s.y1 + p, 0], [xb, s.y1 + p, 0]];
      T.flippers.forEach(function (f) {
        if ((f.storey || 0) !== i) return;
        var c = Math.cos(f.rest), sn = Math.sin(f.rest);
        pts.push([f.x, f.y, 12], [f.x + c * (f.len + p), f.y + sn * (f.len + p), 12]);
      });
      return { storey: i, id: s.id, pts: pts };
    }));
  }
  function bottomStorey(T) { var b = 0; T.storeys.forEach(function (s, i) { if (s.y1 > T.storeys[b].y1) b = i; }); return b; }
  function homeFor(id, aspect) {
    var E = getE(), T = E.table(id).T, key = T.id + '@' + aspect.toFixed(4);
    if (HOMES[key]) return HOMES[key];
    var pts = [];
    boxes(id).forEach(function (bx) { pts = pts.concat(bx.pts); });
    pts.push([T.shooter.cx + T.BALL, T.storeys[bottomStorey(T)].y1, 0]);   // the ball on the plunger too
    if (T.arch) pts.push([T.arch.x, T.arch.y - T.arch.R, 0]);   // and the top of the table: home is the whole table
    var x0 = 1e9, x1 = -1e9;
    pts.forEach(function (q) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); });
    var cx = (x0 + x1) / 2, m = CFG.margin;
    function at(span, cy) { return { cx: cx, cy: cy, span: span, tilt: CFG.tilt, yaw: 0 }; }
    function placeBottom(span) {   // the lowest point on the bottom margin (the spare room goes up the table)
      var lo = -T.H * 2, hi = T.H * 3;
      for (var n = 0; n < 60; n++) {
        var mid = (lo + hi) / 2, b = basis(at(span, mid), aspect), my = -1e9;
        pts.forEach(function (q) { var v = projectB(b, q[0], q[1], q[2]); my = Math.max(my, isNaN(v[1]) ? 1e9 : v[1]); });
        if (my > 1 - m) lo = mid; else hi = mid;
      }
      return hi;
    }
    function fits(span) {
      var cy = placeBottom(span), b = basis(at(span, cy), aspect);
      return pts.every(function (q) { var v = projectB(b, q[0], q[1], q[2]); return v[0] >= m && v[0] <= 1 - m && v[1] >= m && v[1] <= 1 - m + 1e-6; });
    }
    var lo = 50, hi = 4000;
    for (var n = 0; n < 50; n++) { var mid = (lo + hi) / 2; if (fits(mid)) hi = mid; else lo = mid; }
    var H = at(hi, placeBottom(hi));
    H.zoom = 1;
    return (HOMES[key] = H);
  }

  // ------------------------------------------------------------ the look-ahead (also run inside forecast-worker.js)
  // a ball past every bottom flipper's reach that cannot come back: below the pivots, moving down, too far from any
  // place a flipper can swing through for even two quick nudges to lift it back in, and clear of a lit kickback. Only ever said of a lone ball (in
  // multiball another ball can knock it)
  function decided(W, b) {
    var E = getE(), Bt = E.table(W.tableId), T = Bt.T, st = T.storeys[bottomStorey(T)], k = Math.sqrt(W.g / 590), BR = T.BALL;
    if (b.m !== 'free' || b.x > T.shooter.x0 || b.y < st.approach || b.vy <= 0) return false;
    var up = Math.max(0, 180 * k - b.vy), climb = up * up / (2 * W.g) + 2;   // two nudges: -90 each
    for (var i = 0; i < st.flippers.length; i++) {
      var f = W.flippers[st.flippers[i]];
      if (b.y < f.y + 2) return false;
      for (var n = 0; n <= 8; n++) {   // the flipper's sweep, from rest to up, as nine positions
        var a = f.rest + (f.up - f.rest) * n / 8, tx = Math.cos(a) * f.len, ty = Math.sin(a) * f.len, px = b.x - f.x, py = b.y - f.y;
        var u = (px * tx + py * ty) / (f.len * f.len); u = u < 0 ? 0 : u > 1 ? 1 : u;
        var ex = px - tx * u, ey = py - ty * u;
        if (Math.sqrt(ex * ex + ey * ey) - (f.r0 + BR + 4) < climb) return false;
      }
    }
    if (W.kickback && T.sensors) {
      var ks = T.sensors.circles.filter(function (c) { return c[0] === 'kick'; })[0];
      // a lit kickback can still save any ball on its side of the table until the ball is past the kicker's line
      if (ks && (b.x - T.MID) * (ks[1] - T.MID) > 0 && b.y < ks[2] + ks[3] + climb + 2) return false;
    }
    return true;
  }
  // step a copy of the world ahead with the buttons held; per ball, the steps until it is first inside a storey's
  // approach zone (and which storey); min: the soonest (-1: none within the horizon - then it is at least the horizon);
  // path: every ball's position every 2 steps for the first pathN steps; check: one ball's spot a few steps on (the
  // page compares it with the real game, so a worker that loaded a different engine is caught)
  function forecast(W, input, horizon, pathN) {
    var E = getE(), C = E.clone(W), arrive = {}, storey = {}, path = {}, min = -1, check = null, want = 0, got = 0, k;
    var lone = function () { return C.balls.length === 1; };
    horizon = horizon || CFG.horizon; pathN = pathN == null ? 32 : pathN;
    C.events = [];
    var orig = {};
    C.balls.forEach(function (b) { orig[b.id] = true; want++; });
    for (k = 0; k <= horizon; k++) {
      if (k > 0) { if (C.over) break; E.step(C, input); C.events.length = 0; }
      for (var i = 0; i < C.balls.length; i++) {
        var b = C.balls[i];
        if (k <= pathN && (k & 1) === 0) (path[b.id] || (path[b.id] = [])).push([k, b.x, b.y, b.z || 0]);
        if (arrive[b.id] != null) continue;
        if (E.inApproach(C, b) >= 0 && !(lone() && decided(C, b))) {
          arrive[b.id] = k; storey[b.id] = E.inApproach(C, b);
          if (min < 0) min = k;
          if (orig[b.id]) got++;
        }
      }
      if (k === 4 && C.balls.length) check = { k: 4, id: C.balls[0].id, x: C.balls[0].x, y: C.balls[0].y };
      if (got >= want && k >= pathN && k >= 4) break;
    }
    return { frame: W.frame, horizon: horizon, steps: k, arrive: arrive, storey: storey, min: min, path: path, check: check };
  }

  // ------------------------------------------------------------ asking the look-ahead (a worker in the page; in-line in node)
  var SRC = '';
  try { if (G && G.document && G.document.currentScript) SRC = G.document.currentScript.src || ''; } catch (e) { SRC = ''; }
  var EPOCH = 0, WK, WK_BAD = false, seq = 0, latest = 0, FC = null, PENDING = [], ASKED = null, WARNED = false;
  function engineUrls() {
    var out = [], list = G.document.getElementsByTagName('script');
    for (var i = 0; i < list.length; i++) {
      var s = list[i].src || '';
      if (/\/(table|engine)\.js(\?|#|$)/.test(s) || /\/tables\/[^\/]+\.js(\?|#|$)/.test(s)) out.push(s);
    }
    return out.some(function (s) { return /\/engine\.js(\?|#|$)/.test(s); }) ? out : null;
  }
  function worker() {
    if (WK !== undefined) return WK;
    WK = null;
    try {
      if (CFG.forecaster === 'sync' || !G || typeof G.Worker !== 'function' || !G.document || !SRC) return null;
      var urls = engineUrls();
      if (!urls) return null;
      WK = new G.Worker(SRC.replace(/camera\.js(\?[^#]*)?(#.*)?$/, 'forecast-worker.js$1'));
      WK.onmessage = function (e) { var d = e.data; if (d && d.r && d.id >= latest) { latest = d.id; take(d.r, d.key); } };
      WK.onerror = function () { WK = null; WK_BAD = true; };
      WK.postMessage({ type: 'init', urls: urls.concat([SRC]) });
    } catch (e) { WK = null; }
    return WK;
  }
  function take(r, key) { FC = r; FC.key = key; ASKED = null; }
  function ask(W, key) {
    var input = { left: !!W.prevL, right: !!W.prevR, fire: !!(W.plunger && W.plunger.held), up: !!W.prevUp };
    var id = ++seq, w = !WK_BAD ? worker() : null;
    ASKED = { key: key, frame: W.frame };
    STATS.asks++;
    if (w) { w.postMessage({ type: 'forecast', id: id, key: key, W: getE().clone(W), input: input, horizon: CFG.horizon }); return; }
    var r = forecast(W, input, CFG.horizon, 32);
    STATS.steps += r.steps;
    if (CFG.latency > 0) PENDING.push({ due: CFG.latency, r: r, key: key }); else take(r, key);
  }
  function inputKey(W) {
    return (W.prevL ? 'L' : '-') + (W.prevR ? 'R' : '-') + (W.prevUp ? 'U' : '-') + (W.plunger && W.plunger.held ? 'P' : '-') + W.balls.length + W.state;
  }

  // ------------------------------------------------------------ the director's state
  var ASPECT = 0.55, MODE = 'calm', DIRECTOR = false;
  var STATS, S;
  function freshStats() { return { frames: 0, away: 0, zoomed: 0, pushIns: 0, cuts: 0, emergencies: 0, short: 0, checked: 0, mismatch: 0, asks: 0, steps: 0, states: {}, slow: 0 }; }
  STATS = freshStats();
  function fresh() {
    return { W: null, frame: -1, t: null, state: 'home', pose: null, vel: { cx: 0, cy: 0, span: 0, tilt: 0, yaw: 0 }, from: null,
      t0: 0, homeAt: -1e9, tokens: 2, ts: 1, goalC: null, prev: null, craters: 0, craterRel: -1, craterMode: '', fired: '', lastFire: -1e9,
      drainT: -1, A: 0, Aknown: false, cutFrame: -1e9, stillAt: null, emergFor: -1, ik: '' };
  }
  S = fresh();
  function reset() { S = fresh(); FC = null; ASKED = null; PENDING.length = 0; }
  function home() { return homeFor(S.W ? S.W.tableId : getE().DEFAULT, ASPECT); }
  function zoomOf(p) { return home().span / p.span; }
  function tiltAt(zoom) { return Math.min(40, CFG.tilt + 9 * (zoom - 1) / 1.2); }
  function shotAt(cx, cy, zoom, T) {
    var H = home(), span = H.span / zoom, tilt = tiltAt(zoom);
    var s = { cx: cx, cy: cy, span: span, tilt: tilt, yaw: 0 }, W = T.W, half = span / 2, xl = -10, xr = W + 10;
    s.cx = half * 2 > xr - xl ? (xl + xr) / 2 : Math.max(xl + half, Math.min(xr - half, cx));
    var e = yEdges(s), top = -14, bot = T.H + 14;
    if (e[1] - e[0] > bot - top) s.cy += (top + bot) / 2 - (e[0] + e[1]) / 2;
    else if (e[0] < top) s.cy += top - e[0];
    else if (e[1] > bot) s.cy -= e[1] - bot;
    return s;
  }
  // the closest shot (at a given tilt) that has every point (x, y, height) in the middle (1 - 2 m) of the picture
  function fitShot(pts, tilt, m) {
    var x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    pts.forEach(function (q) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); });
    var s = { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, span: 100, tilt: tilt, yaw: 0 };
    function ext() { var b = basis(s, ASPECT), e = [1e9, -1e9, 1e9, -1e9]; pts.forEach(function (q) { var v = projectB(b, q[0], q[1], q[2]); e[0] = Math.min(e[0], v[0]); e[1] = Math.max(e[1], v[0]); e[2] = Math.min(e[2], v[1]); e[3] = Math.max(e[3], v[1]); }); return e; }
    var lo = 40, hi = 3000;
    for (var n = 0; n < 30; n++) {
      s.span = (lo + hi) / 2;
      var a = -400, c = 1200;   // centre the points up and down
      for (var k = 0; k < 30; k++) { s.cy = (a + c) / 2; var e = ext(); if ((e[2] + e[3]) / 2 > 0.5) a = s.cy; else c = s.cy; }
      var f = ext();
      if (f[0] >= m && f[1] <= 1 - m && f[2] >= m && f[3] <= 1 - m) hi = s.span; else lo = s.span;
    }
    s.span = hi;
    return s;
  }
  function copyShot(p) { return { cx: p.cx, cy: p.cy, span: p.span, tilt: p.tilt, yaw: p.yaw || 0 }; }
  function same(a, b) { return Math.abs(a.cx - b.cx) < 1e-6 && Math.abs(a.cy - b.cy) < 1e-6 && Math.abs(a.span - b.span) < 1e-6 && Math.abs(a.tilt - b.tilt) < 1e-6 && Math.abs((a.yaw || 0) - (b.yaw || 0)) < 1e-6; }
  function smoother(u) { u = u < 0 ? 0 : u > 1 ? 1 : u; return u * u * u * (u * (u * 6 - 15) + 10); }
  function springTo(goal, w, dt) {   // critically damped, per part of the pose
    ['cx', 'cy', 'span', 'tilt', 'yaw'].forEach(function (k) {
      var x = S.pose[k] - (goal[k] || 0), v = S.vel[k], e = Math.exp(-w * dt);
      S.pose[k] = (goal[k] || 0) + (x + (v + w * x) * dt) * e;
      S.vel[k] = (v - w * (v + w * x) * dt) * e;
    });
  }
  function still() { S.vel = { cx: 0, cy: 0, span: 0, tilt: 0, yaw: 0 }; }

  // where the balls are, as far as the camera is concerned: A = steps until any ball can cross an approach line
  // (0: one is inside a zone now), Aknown false while waiting for an answer after something changed
  function sense(W) {
    var E = getE(), lone = W.balls.length === 1, inZone = false, i, b;
    for (i = 0; i < W.balls.length; i++) {
      b = W.balls[i];
      if (E.inApproach(W, b) >= 0 && !(lone && decided(W, b))) inZone = true;
    }
    // the epoch moves on whenever the buttons change or a ball goes into or out of a zone: an answer to a question asked
    // before that is out of date, however late it arrives
    var ik = inputKey(W) + (inZone ? 'z' : '');
    if (ik !== S.ik) { S.ik = ik; EPOCH++; }
    var V = W.toys && W.toys.volcano, craterOnly = lone && V && V.busy && V.ball === W.balls[0].id && V.land > W.frame;
    if (W.state !== 'play' || W.balls.length === 0) { S.A = 1e9; S.Aknown = true; return; }
    if (inZone) { S.A = 0; S.Aknown = true; FC = null; ASKED = null; return; }
    if (craterOnly) { S.A = V.land - W.frame; S.Aknown = true; return; }   // the crater's timetable is exact, whatever the buttons
    var key = ik + '#' + EPOCH;
    for (i = PENDING.length - 1; i >= 0; i--) if (--PENDING[i].due <= 0) { var pd = PENDING.splice(i, 1)[0]; take(pd.r, pd.key); }
    var ok = FC && FC.key === key && FC.frame <= W.frame && W.frame - FC.frame < 600;
    if (ok && FC.check && W.frame === FC.frame + FC.check.k) {   // the worker's engine must match the game's
      var cb = W.balls.filter(function (q) { return q.id === FC.check.id; })[0];
      if (cb && cb.x === FC.check.x && cb.y === FC.check.y) STATS.checked++;
      if (cb && (cb.x !== FC.check.x || cb.y !== FC.check.y)) {
        STATS.mismatch++;
        ok = false; FC = null;
        if (WK) { WK_BAD = true; if (!WARNED && typeof console !== 'undefined') { WARNED = true; console.warn('PinCam: the look-ahead worker disagrees with the game; looking ahead in the page instead'); } }
      }
    }
    if (ok) {
      var A = FC.min >= 0 ? FC.frame + FC.min - W.frame : FC.frame + FC.horizon - W.frame;
      if (FC.min >= 0 && A < 0) ok = false;   // it should have arrived by now: the answer is out of date
      else if (FC.min < 0 && A < FC.horizon - 50) ok = false;   // a 'not within the horizon' answer is refreshed every 50 steps
      else { S.A = A; S.Aknown = true; }
    }
    if (!ok) {
      if (!ASKED || ASKED.key !== key || W.frame - ASKED.frame > 30) ask(W, key);
      var fresh = FC && FC.key === key && FC.frame === W.frame;
      if (fresh) { S.A = FC.min >= 0 ? FC.min : FC.horizon; S.Aknown = true; }
      else { S.A = 0; S.Aknown = false; }
    }
  }
  function leadPath(W, b) {   // the ball now and its next 0.5 s (from the look-ahead), as points
    var pts = [[b.x, b.y]];
    if (FC && FC.path && FC.path[b.id]) FC.path[b.id].forEach(function (q) { var dk = FC.frame + q[0] - W.frame; if (dk >= 0 && dk <= 30) pts.push([q[1], q[2]]); });
    return pts;
  }

  // ------------------------------------------------------------ once per drawn frame
  function update(W, t, mode, aspect) {
    var E = getE();
    if (aspect && Math.abs(aspect - ASPECT) > 1e-4) { ASPECT = aspect; if (S.pose) { S.pose = copyShot(homeFor(W.tableId, ASPECT)); S.state = 'home'; still(); } }
    if (W !== S.W || W.frame < S.frame) { reset(); S.W = W; }
    var T = E.table(W.tableId).T, H = homeFor(W.tableId, ASPECT), M = MODES[MODE];
    var dt = S.t == null ? 0 : Math.max(0, Math.min(0.1, (t - S.t) / 1000));
    S.t = t;
    var newFrame = W.frame !== S.frame;
    S.frame = W.frame;
    if (!S.pose) { S.pose = copyShot(H); S.homeAt = t; }
    S.tokens = Math.min(2, S.tokens + dt * M.perMin / 60);
    sense(W);
    var A = S.A, known = S.Aknown, lone = W.balls.length === 1, b = W.balls[0], V = W.toys && W.toys.volcano;
    var director = (mode === 'title' || DIRECTOR) && MODE !== 'classic';   // classic (and reduce motion) never roams, even in attract
    var playing = W.state === 'play' && !W.over && !W.tilted && W.balls.length > 0;
    if (b && b.x > T.shooter.x0 && b.vy < -200 && S.fired !== b.id + ':' + W.ball) { S.lastFire = W.frame; S.fired = b.id + ':' + W.ball; }

    // ---- what the director would like to show, and the slow motion it asks for
    var want = 'home', goal = H, w = 6, slow = 1, scripted = false;
    if (director && b) {
      want = 'director'; goal = shotAt(b.x, b.y + 30, 1.7, T); goal.tilt = 40; goal.yaw = 9 * Math.sin(t / 4000); w = 3.5;
    } else if (playing && lone) {
      var inLane = b.m === 'free' && b.x > T.shooter.x0, crater = V && V.busy && V.ball === b.id && M.dive !== 'none';
      if (crater) {
        scripted = true;
        if (S.craterRel !== V.release) { S.craterRel = V.release; S.craters++; S.craterMode = M.dive === 'all' || (M.dive === 'first' && S.craters === 1) ? 'dive' : 'nod'; }
        var Vt = T.volcano, C = T.carries[Vt.carry], rel = V.release - W.frame, dive = S.craterMode === 'dive';
        if (b.m === 'held') {   // the hold: dive in (a slow swing round the cone); a nod after the first, in calm
          want = 'closeup'; w = 6;
          var zc = dive ? 2.2 : 1.5;
          goal = shotAt(Vt.x, Vt.y + 4 - CFG.craterZ * Math.tan(tiltAt(zc) * DEG), zc, T);
          if (dive && M.yaw) goal.yaw = M.yaw * Math.sin(Math.PI * Math.max(0, Math.min(1, 1 - rel / Vt.hold)));
          if (dive && M.slow && rel <= 8) slow = 0.5;
        } else if (dive) {      // fired skyward: pull back over the island in slow motion to frame the whole flight onto
          // the wire rail (the shot fitted to the carry's own path, heights and all); home comes as it rides the rail down
          if (S.skyFor !== V.release) {
            var arc = C.pts.filter(function (q) { return q[3] <= C.railAt + 40; }).map(function (q) { return [q[0], q[1], q[2] + T.BALL]; });
            arc.push([Vt.x - Vt.r - 30, Vt.y + Vt.r + 40, 0], [Vt.x + Vt.r + 50, Vt.y + Vt.r + 40, 0]);   // and the island round the cone
            S.sky = fitShot(arc, 33, 0.06); S.skyFor = V.release;
          }
          var f = W.frame - V.release;
          want = 'rail'; goal = S.sky; w = 4;
          if (M.slow && f < 70) slow = 0.5;
        }
      } else if (inLane && M.shots && W.autoT === 0 && b.y > T.shooter.tip - 40 && Math.abs(b.vy) < 60) {
        want = 'launch'; scripted = true; goal = shotAt(T.shooter.cx - 50, T.shooter.tip - 40, 1.6, T); w = 5;            // move 1: the plunger
      } else if (inLane && M.shots && b.vy < -200 && W.frame - S.lastFire < 90) {
        want = 'launch2'; scripted = true; goal = shotAt(T.shooter.cx - 70, Math.max(110, b.y - 90), 1.3, T); w = 7;     // move 2: up the lane with the ball
      } else if (M.shots && (decided(W, b) || (S.state === 'drain' && S.drainId === b.id))) {
        S.drainId = b.id;
        if (S.drainT < 0) S.drainT = t;
        want = 'drain'; scripted = true; goal = shotAt(T.MID, T.H - 30, 1.7, T); w = 10;
        if (M.slow && t - S.drainT < 600) slow = 0.35;
      } else {
        // follow: the ball high up (or out of the home picture) and its next half second
        var pts = leadPath(W, b), x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
        pts.forEach(function (q) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); });
        var off = project(H, ASPECT, b.x, b.y, b.z || 0)[1] < 0.03, high = y0 < topApproach(T) + (M.reach || 40);
        if (high || off) {
          if (!S.goalC || (S.state !== 'follow' && S.state !== 'back')) S.goalC = [(x0 + x1) / 2, (y0 + y1) / 2];
          else {   // the dead zone: re-aim only once the next half second leaves the middle 40% of the picture
            var p0 = project(S.pose, ASPECT, x0, y0, 0), p1 = project(S.pose, ASPECT, x1, y1, 0);
            if (p0[0] < 0.3 || p1[0] > 0.7 || p0[1] < 0.3 || p1[1] > 0.7) S.goalC = [(x0 + x1) / 2, (y0 + y1) / 2];
          }
          var zf = Math.max(1, Math.min(M.follow, H.span / (Math.max(x1 - x0, (y1 - y0) * 0.8) + 90)));
          if (zf > 1.05 || off) { want = 'follow'; goal = shotAt(S.goalC[0], S.goalC[1] + 20, zf, T); w = 4; }
        }
      }
    }
    if (!director && M.shots && S.state === 'drain' && W.state === 'bonus' && t - S.drainT < 1500) {   // the drain shot holds a moment after the ball has gone
      want = 'drain'; goal = shotAt(T.MID, T.H - 30, 1.7, T); w = 6; scripted = true;
    }
    if (want !== 'drain') { S.drainT = -1; S.drainId = 0; }
    var push = H.span / goal.span > 1.1, away = !same(S.pose, H);

    // ---- the guarantee. Leave home only with a fresh answer that leaves time to go, look and come back (and, for an
    // unscripted push-in, a token and the dwell); come home NEED steps before any ball can arrive; too late: cut.
    if (!director && want !== 'home') {
      var win = want === 'follow' ? Math.max(M.window * 60, NEED + 30) : want === 'launch2' ? NEED + 54 : NEED + 27;
      var leaving = S.state === 'home' || S.state === 'back';
      if (!known || A < (leaving ? win : NEED)) { want = 'home'; goal = H; }
      else if (S.state === 'home' && push && !scripted && (S.tokens < 1 || (t - S.homeAt) / 1000 < M.dwell)) { want = 'home'; goal = H; }
    }
    // an EMERGENCY: a fresh answer (after a nudge, mostly) leaves less than the full second of still picture before a
    // ball arrives. Counted once per arrival. If even the half-second rule can't be kept by moving home, CUT.
    var cut = false, emergency = false, left = 0;
    if (!director && playing && known && A > 0 && A < 1e8) {
      left = !away ? 0 : S.state === 'back' ? Math.ceil(Math.max(0, CFG.back - (t - S.t0) / 1000) * 60) + 1 : Math.ceil(CFG.back * 60) + 1;
      var stillFor = !away && S.stillAt != null ? W.frame - S.stillAt : -left;
      if (stillFor + A < SETTLE + Math.round(CFG.early * 60) && S.emergFor !== W.frame + A && (want === 'home' || stillFor + A < NEED - left)) {
        emergency = stillFor + A < SETTLE ? 'rule' : 'short'; S.emergFor = W.frame + A;
        if (emergency === 'rule') STATS.emergencies++; else STATS.short++;
      }
      if (want === 'home' && away && A - SETTLE < left) cut = true;
    }

    // ---- move
    if (cut) {
      S.pose = copyShot(H); still(); S.state = 'home'; S.homeAt = t; STATS.cuts++; S.cutFrame = W.frame; S.stillAt = W.frame;
    } else if (want === 'home') {
      if (!away) { if (S.state !== 'home') { S.state = 'home'; S.homeAt = t; } if (S.stillAt == null) S.stillAt = W.frame; S.pose = copyShot(H); still(); }
      else {
        if (S.state !== 'back') { S.state = 'back'; S.t0 = t; S.from = copyShot(S.pose); }
        var u = smoother((t - S.t0) / 1000 / CFG.back);
        ['cx', 'cy', 'span', 'tilt', 'yaw'].forEach(function (k) { S.pose[k] = S.from[k] + (H[k] - S.from[k]) * u; });
        if (u >= 1) { S.pose = copyShot(H); still(); S.state = 'home'; S.homeAt = t; S.stillAt = W.frame; } else S.stillAt = null;
      }
    } else {
      if (S.state === 'home' && push) { STATS.pushIns++; S.tokens = Math.max(-1, S.tokens - 1); }
      if (S.state === 'back') still();
      if (S.state !== want) S.since = t;
      S.stillAt = null;
      S.state = want;
      // every way in is quick (most of the way in about 0.4 s); then each state tracks at its own, gentler pace
      springTo(goal, t - S.since < 600 ? Math.max(w, 10) : w, dt);
    }

    // ---- slow motion: only where nothing the player does can matter, and exactly 1.0 once a ball is 0.75 s away
    var tsGoal = !director && (S.state === 'closeup' || S.state === 'rail' || S.state === 'drain') ? slow : 1;
    if (!director && (!known || A <= 45)) S.ts = 1;
    else S.ts = tsGoal < S.ts ? Math.max(tsGoal, S.ts - dt * 4) : Math.min(tsGoal, S.ts + dt * 4);
    if (Math.abs(S.ts - 1) < 1e-3) S.ts = 1;

    // ---- the record
    if (newFrame) {
      STATS.frames++;
      if (!same(S.pose, H)) STATS.away++;
      if (zoomOf(S.pose) >= 1.15) STATS.zoomed++;
      if (S.ts < 1) STATS.slow++;
      STATS.states[S.state] = (STATS.states[S.state] || 0) + 1;
    }
    var nx = -1;
    if (FC && FC.min >= 0) Object.keys(FC.arrive).forEach(function (k) { if (FC.arrive[k] === FC.min) nx = FC.storey[k]; });
    return { cx: S.pose.cx, cy: S.pose.cy, span: S.pose.span, tilt: S.pose.tilt, yaw: S.pose.yaw || 0, timeScale: S.ts,
      state: S.state, zoom: zoomOf(S.pose), A: known ? A : -1, next: nx, cut: cut, emergency: cut ? 'rule' : emergency };
  }
  function topApproach(T) { var a = 1e9; T.storeys.forEach(function (s) { a = Math.min(a, s.approach); }); return a; }

  function quiet() { return S.Aknown && S.A > 48; }
  function setMode(m) { if (MODES[m]) MODE = m; }
  function setAspect(a) { if (a > 0.05 && a < 20) ASPECT = a; }
  function configure(o) {
    Object.keys(o || {}).forEach(function (k) { if (k in CFG) CFG[k] = o[k]; });
    NEED = Math.ceil((CFG.back + CFG.settle + CFG.early + CFG.spare) * 60); SETTLE = Math.round(CFG.settle * 60);
    BOXES = {}; HOMES = {};
    if (CFG.forecaster === 'sync' && WK) { try { WK.terminate(); } catch (e) { /* gone */ } WK = null; }
  }
  function stats() { var s = STATS; return JSON.parse(JSON.stringify(s)); }
  function resetStats() { STATS = freshStats(); }
  function info() { return { state: S.state, A: S.A, known: S.Aknown, ts: S.ts, mode: MODE, aspect: ASPECT, forecast: FC, worker: !!WK && !WK_BAD, need: NEED, settle: SETTLE }; }

  return {
    update: update, frame: frame, project: project, quiet: quiet, setMode: setMode, setAspect: setAspect,
    home: function (aspect, id) { return homeFor(id || (S.W ? S.W.tableId : getE().DEFAULT), aspect || ASPECT); },
    reset: function () { reset(); resetStats(); }, stats: stats, resetStats: resetStats, info: info, configure: configure,
    forecast: forecast, decided: decided, boxes: boxes, director: function (on) { DIRECTOR = !!on; },
    MODES: MODES, CFG: CFG, FOV: FOV, yEdges: function (s, aspect) { var a = ASPECT; ASPECT = aspect || a; var r = yEdges(s); ASPECT = a; return r; }
  };
});
