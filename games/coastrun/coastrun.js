/* 365 Coast Run - the picture and the sounds (5 Oct 2026). The road is drawn the way the 80s sit-down racers did it: in
 * slices, from the far distance to the bonnet, each slice a little wider and lower than the one before, bends made by
 * sliding each slice sideways a little more than the last, hills by raising and lowering them. Roadside things and the
 * traffic are flat pictures (art.js) stood on their slice, drawn smaller and paler with distance. The rules are in
 * engine.js; the bar, scores, Hall of Fame and controls are the arcade cabinet (../common/arcade.js). */
(function () {
  'use strict';
  var E = window.CREngine, ART = window.CRArt, A = window.Arcade365;
  var GW = 384, GH = 224, HOR = 100, HF = GW / 2, CAMH = 760, CAMD = 1100, DEPTH = 0.84;
  var SEG = E.SEG, ROAD = E.ROAD, MAXS = E.MAXS;
  var reducedMotion = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var PAL = ART.PAL, LV = 16;

  // ---------------------------------------------------------------- colours fading into each place's haze, worked out once
  var RAMP = {};
  function ramp(pi, col) {
    var key = pi + col, r = RAMP[key]; if (r) return r;
    r = []; for (var i = 0; i < LV; i++) r.push(ART.mix(col, PAL[pi].fog, i / (LV - 1)));
    return (RAMP[key] = r);
  }

  // ---------------------------------------------------------------- the picture's own state (never the game's rules)
  var R = { camX: 0, depth: DEPTH, boostK: 0, low: false, slow: 0, fxN: 0, parts: [], bgKey: null, bgPrev: null, bgFade: 1, demoAcc: 0, lastT: 0,
    goT: -1, bounce: 0, lastV: 0, shownScore: 0, flash: 0, W: null };
  var PJ = [];   // the projected slices, near to far

  function geo(W, s, e, b) {   // where a road is across a slice (its middle, in half-road widths) and how wide; e: 0 near end, 1 far end
    var F = W.fork, fk = s.fk;
    if (fk && fk.a) return { c: F && F.s ? -F.s * F.beta : 0, w: e ? fk.w2 : fk.w1 };
    if (fk && fk.b) { var o = e ? fk.o2 : fk.o1, sd = F ? F.s : 0, be = F ? F.beta : 0; return { c: b * o - sd * o * be, w: 1 }; }
    if (F && F.s && s.i >= F.end) return { c: F.s * 16 * (1 - F.beta), w: 1 };
    return { c: 0, w: 1 };
  }
  function playerShift(W) {   // how far the player's road has been moved across while the camera swings onto it at a fork
    var F = W.fork; if (!F || !F.s || F.beta >= 1) return 0;
    var i = E.segIndex(W.z), s = E.segAt(W, i), p = (W.z - i * SEG) / SEG, o = 16;
    if (s.fk && s.fk.b) o = s.fk.o1 + (s.fk.o2 - s.fk.o1) * p; else if (s.fk && s.fk.a) o = 1;
    return F.s * o * (1 - F.beta);
  }

  function project(W) {
    var camZ = W.z - CAMD, bi = E.segIndex(camZ), bs = E.segAt(W, bi), bp = (camZ - bi * SEG) / SEG;
    var pi = E.segIndex(W.z), ps = E.segAt(W, pi), pp = (W.z - pi * SEG) / SEG, pY = ps.y1 + (ps.y2 - ps.y1) * pp;
    var camY = pY + CAMH + R.bounce, camXw = R.camX * ROAD, D = R.depth;
    var x = 0, dx = -bs.c * bp, last = E.lastIndex(W), F = W.fork, stop = F && !F.s ? F.end : 1e12, N = 0, far = (R.low ? 130 : E.DRAW) * SEG;
    var n0 = R.low ? 130 : E.DRAW;
    for (var n = 0; n < n0; n++) {
      var i = bi + n; if (i > last || i >= stop) break;
      var s = E.segAt(W, i), q = PJ[N] || (PJ[N] = {});
      var z1 = i * SEG - camZ, z2 = z1 + SEG;
      q.seg = s; q.vis = z1 > 30;
      var s1 = D / Math.max(z1, 30) * HF, s2 = D / z2 * HF;
      q.s1 = s1; q.s2 = s2; q.z1 = z1;
      q.x1 = GW / 2 + s1 * (x - camXw); q.x2 = GW / 2 + s2 * (x + dx - camXw);
      q.y1 = Math.round((HOR - s1 * (s.y1 - camY)) * K) / K; q.y2 = Math.round((HOR - s2 * (s.y2 - camY)) * K) / K;   // whole screen pixels: no seams
      x += dx; dx += s.c;
      var fk = Math.max(0, z1 / far - 0.08) / 0.92, fog = 1 - Math.exp(-fk * fk * 4.6);
      q.fog = fog; q.fi = Math.min(LV - 1, Math.round(fog * (LV - 1)));
      N++;
    }
    PJ.n = N; PJ.pY = pY; PJ.camY = camY;
    return N;
  }

  // ---------------------------------------------------------------- one slice of ground and road
  function quad(g, x1, y1, w1, x2, y2, w2, col) { g.beginPath(); g.moveTo(x1 - w1, y1); g.lineTo(x1 + w1, y1); g.lineTo(x2 + w2, y2); g.lineTo(x2 - w2, y2); g.closePath(); g.fillStyle = col; g.fill(); }
  function band(g, xa1, xb1, y1, xa2, xb2, y2, col) { g.beginPath(); g.moveTo(xa1, y1); g.lineTo(xb1, y1); g.lineTo(xb2, y2); g.lineTo(xa2, y2); g.closePath(); g.fillStyle = col; g.fill(); }
  function drawSlice(g, W, q, t) {
    var s = q.seg, pi = s.st, pal = PAL[pi], fi = q.fi, stripe = Math.floor(s.i / 3) % 2;
    var y1 = q.y1, y2 = q.y2;
    if (y2 >= y1 - 0.02 || y2 > GH + 2) return false;   // facing away (beyond a crest) or below the screen
    var hw1 = ROAD * q.s1, hw2 = ROAD * q.s2, yb = Math.min(y1, GH + 1);
    g.fillStyle = ramp(pi, pal.grass[stripe])[fi]; g.fillRect(0, y2, GW, yb - y2);
    var F = W.fork;
    // the roads on this slice (two in a split)
    var roads = s.fk && s.fk.b ? [-1, 1] : [0], k, r, gN, gF;
    var main0 = geo(W, s, 0, roads.length > 1 ? (F && F.s ? F.s : -1) : 0), main1 = geo(W, s, 1, roads.length > 1 ? (F && F.s ? F.s : -1) : 0);
    // the sea, the beach and the land beside it
    if (s.sea && pal.sea) {
      var d = s.sea, sh = s.sh, cx1 = q.x1 + main0.c * hw1, cx2 = q.x2 + main1.c * hw2;
      var shore1 = cx1 + d * sh * hw1, shore2 = cx2 + d * sh * hw2, edge = d < 0 ? -4 : GW + 4;
      var beachIn1 = cx1 + d * (sh - 0.5) * hw1, beachIn2 = cx2 + d * (sh - 0.5) * hw2;
      if (pal.verge && pal.verge !== pal.grass) band(g, cx1, beachIn1, y1, cx2, beachIn2, y2, ramp(pi, pal.verge[stripe])[fi]);
      band(g, beachIn1, shore1, y1, beachIn2, shore2, y2, ramp(pi, pal.beach[stripe])[fi]);
      band(g, shore1, edge, y1, shore2, edge, y2, ramp(pi, pal.sea[(Math.floor(s.i / 2) + ((t / 400) | 0)) % 2])[fi]);
      band(g, shore1 - d * 0.04 * hw1, shore1 + d * (0.07 + 0.04 * Math.sin(s.i * 0.7 + t / 300)) * hw1, y1, shore2 - d * 0.04 * hw2, shore2 + d * 0.08 * hw2, y2, ramp(pi, pal.foam)[fi]);
      if (!R.low && q.fog < 0.75 && (s.i * 7919) % 5 === 0) {   // glints on the water
        var gx = shore1 + d * (0.6 + ((s.i * 31) % 47) / 47 * 8) * hw1, gw = 0.4 * hw1;
        if (gx > -10 && gx < GW + 10) { g.fillStyle = pal.night ? 'rgba(255,210,140,' + (0.5 * (1 - q.fog)) + ')' : 'rgba(255,255,255,' + (0.7 * (1 - q.fog)) + ')'; g.fillRect(gx, y2, gw, Math.max(0.4, (y1 - y2) * 0.4)); }
      }
    }
    for (k = 0; k < roads.length; k++) {
      r = roads[k]; gN = geo(W, s, 0, r); gF = geo(W, s, 1, r);
      var x1 = q.x1 + gN.c * hw1, x2 = q.x2 + gF.c * hw2, w1 = gN.w * hw1, w2 = gF.w * hw2;
      if (x1 + w1 * 1.2 < -20 && x2 + w2 * 1.2 < -20) continue;
      if (x1 - w1 * 1.2 > GW + 20 && x2 - w2 * 1.2 > GW + 20) continue;
      quad(g, x1, y1, w1 * 1.13, x2, y2, w2 * 1.13, ramp(pi, pal.rumble[stripe])[fi]);
      quad(g, x1, y1, w1, x2, y2, w2, ramp(pi, pal.road[stripe])[fi]);
      if (s.line) {   // the start line: a chequered band
        for (var c = 0; c < 12; c++) { var u0 = -1 + c / 6, u1 = u0 + 1 / 6; band(g, x1 + u0 * w1, x1 + u1 * w1, y1, x2 + u0 * w2, x2 + u1 * w2, y2, c % 2 ? '#111' : '#f4f4f4'); }
      } else if (!stripe) {   // lane lines
        var lw = 0.028, lane = ramp(pi, pal.lane)[fi], wl = gN.w, lines = [-1 / 3, 1 / 3];
        if (wl > 1.01) { lines = [-wl / 3, wl / 3]; if (wl > 1.4) lines.push(0); if (wl > 1.55) lines.push(-(wl - 2 / 3), wl - 2 / 3); }
        for (var L = 0; L < lines.length; L++) { var u = lines[L] / gN.w, uF = lines[L] / gN.w; band(g, x1 + (u - lw) * w1, x1 + (u + lw) * w1, y1, x2 + (uF - lw) * w2, x2 + (uF + lw) * w2, y2, lane); }
      }
    }
    // walls and fences along the road, and the barrier at the sea's edge
    if (s.wl || s.wr) {
      var wall = pal.wall, H = pi === 1 ? 300 : 230;
      [s.wl ? -1.42 : 0, s.wr ? 1.42 : 0].forEach(function (u) {
        if (!u) return;
        var a1 = q.x1 + (main0.c + u) * hw1, a2 = q.x2 + (main1.c + u) * hw2, h1 = H * q.s1, h2 = H * q.s2;
        if (pi === 1) {
          band(g, a1, a1, y1, a2, a2, y2, '#000');
          g.beginPath(); g.moveTo(a1, y1); g.lineTo(a2, y2); g.lineTo(a2, y2 - h2); g.lineTo(a1, y1 - h1); g.closePath(); g.fillStyle = ramp(pi, wall[stripe])[fi]; g.fill();
          g.beginPath(); g.moveTo(a1, y1 - h1); g.lineTo(a2, y2 - h2); g.lineTo(a2, y2 - h2 * 1.12); g.lineTo(a1, y1 - h1 * 1.12); g.closePath(); g.fillStyle = ramp(pi, '#7d786d')[fi]; g.fill();
        } else {
          var wood = ramp(pi, pi === 4 ? '#3a3d44' : '#8a6a48')[fi];
          [0.45, 0.85].forEach(function (f) { g.beginPath(); g.moveTo(a1, y1 - h1 * f); g.lineTo(a2, y2 - h2 * f); g.lineTo(a2, y2 - h2 * (f + 0.08)); g.lineTo(a1, y1 - h1 * (f + 0.08)); g.closePath(); g.fillStyle = wood; g.fill(); });
          if (s.i % 2 === 0) { g.fillStyle = wood; g.fillRect(a1 - 0.08 * hw1 * 0.5, y1 - h1, Math.max(0.6, 0.06 * hw1), h1); }
        }
      });
    }
    if (s.sea && pal.edge && s.sh - 0.3 < 3.3) {
      var ue = s.sea * (s.sh - 0.3), e1 = q.x1 + (main0.c + ue) * hw1, e2 = q.x2 + (main1.c + ue) * hw2, eh = (pal.edge === 'quay' ? 70 : 230), k1 = eh * q.s1, k2 = eh * q.s2;
      if (pal.edge === 'railing') {
        var rail = ramp(pi, '#2f7f86')[fi];
        [0.55, 1].forEach(function (f) { g.beginPath(); g.moveTo(e1, y1 - k1 * f); g.lineTo(e2, y2 - k2 * f); g.lineTo(e2, y2 - k2 * (f - 0.07)); g.lineTo(e1, y1 - k1 * (f - 0.07)); g.closePath(); g.fillStyle = rail; g.fill(); });
        if (s.i % 2 === 0) { g.fillStyle = rail; g.fillRect(e1 - 0.02 * hw1, y1 - k1, Math.max(0.5, 0.04 * hw1), k1); }
      } else if (pal.edge === 'fence') {
        var fc = ramp(pi, '#7a5a3c')[fi];
        g.beginPath(); g.moveTo(e1, y1 - k1 * 0.8); g.lineTo(e2, y2 - k2 * 0.8); g.lineTo(e2, y2 - k2 * 0.74); g.lineTo(e1, y1 - k1 * 0.74); g.closePath(); g.fillStyle = fc; g.fill();
        if (s.i % 3 === 0) { g.fillStyle = fc; g.fillRect(e1 - 0.02 * hw1, y1 - k1, Math.max(0.5, 0.045 * hw1), k1); }
      } else {
        g.beginPath(); g.moveTo(e1, y1); g.lineTo(e2, y2); g.lineTo(e2, y2 - k2); g.lineTo(e1, y1 - k1); g.closePath(); g.fillStyle = ramp(pi, '#55585f')[fi]; g.fill();
      }
    }
    return true;
  }

  // ---------------------------------------------------------------- pictures stood on a slice
  var K = 3;   // screen pixels per game unit, this frame
  function mip(m, w) { var want = w * K, j = 0; while (j < m.length - 1 && m[j + 1].width >= want * 0.9) j++; return m[j]; }
  var LIGHTS = [];   // glows to add over the top at night: [x, y, r, colour, alpha]
  function drawSprites(g, W, q, t, cars) {
    var s = q.seg, pal = PAL[s.st], hw1 = ROAD * q.s1, alpha = 1 - q.fog * 0.97, it, j;
    if (alpha < 0.03) return;
    if (s.spr) {
      // outermost first, so things nearer the middle are drawn over them
      var list = s.spr.length > 1 ? s.spr.slice().sort(function (a, b) { return Math.abs(b.x) - Math.abs(a.x); }) : s.spr;
      for (j = 0; j < list.length; j++) {
        it = list[j];
        var S = ART.SPR[it.t]; if (!S) continue;
        var gc = geo(W, s, 0, it.b), X = q.x1 + (gc.c + it.x) * hw1, Y = q.y1, w = S.w * q.s1, h = S.h * q.s1;
        if (X + w / 2 < -4 || X - w / 2 > GW + 4 || Y - h > GH || w * K < 0.8) continue;
        var a = alpha;
        if (it.done) {   // knocked over: thrown up and away
          var dt = W.t - it.done; if (dt > 45) continue;
          Y -= dt * 2.2 - dt * dt * 0.03; X += (it.x > W.x ? 1 : -1) * dt * 1.5; a *= 1 - dt / 45;
        }
        var m = ART.sprite(it.t, it.v, pal.night, pal.tint, it.txt);
        g.globalAlpha = a; g.drawImage(mip(m, w), X - w / 2, Y - h, w, h);
        if (pal.night) {
          if (it.t === 'lamp') LIGHTS.push([X + w * 0.25, Y - h * 0.84, 34 * q.s1 * 10, '#ffd98a', 0.8 * a]);
          else if (it.t === 'yacht') LIGHTS.push([X, Y - h * 0.86, 14 * q.s1 * 10, '#fff2c0', 0.7 * a]);
          else if (it.t === 'buoy') LIGHTS.push([X, Y - h, 12 * q.s1 * 10, it.v ? '#7dff9a' : '#ff6a6a', 0.8 * a]);
        }
        if (it.t === 'lighthouse' || it.t === 'needles') beams.push([X + (it.t === 'needles' ? w * 0.22 : 0), Y - h * (it.t === 'needles' ? 0.57 : 0.77), w, a]);
      }
      g.globalAlpha = 1;
    }
    if (s.coins) for (j = 0; j < s.coins.length; j++) {
      var cn = s.coins[j];
      var gcn = geo(W, s, 0, 0), cxp = q.x1 + (gcn.c + cn.x) * hw1, cy = q.y1, size = (cn.nitro ? 300 : 260) * q.s1;
      if (cn.got) { var gt = W.t - cn.got; if (gt > 18) continue; cy -= gt * 1.2; size *= 1 + gt * 0.05; g.globalAlpha = (1 - gt / 18) * alpha; }
      else g.globalAlpha = alpha;
      if (size * K < 1) { g.globalAlpha = 1; continue; }
      drawCoin(g, cxp, cy - size * 0.75, size, cn.nitro, t + cn.x * 300);
      g.globalAlpha = 1;
    }
    if (cars) for (j = 0; j < cars.length; j++) drawCar(g, W, q, cars[j], alpha, pal);
  }
  var beams = [];
  function drawCoin(g, x, y, size, nitro, t) {
    if (nitro) {   // a nitro bottle: blue with an N
      var bw = size * 0.42, bh = size;
      g.fillStyle = '#0b3d91'; roundRect(g, x - bw / 2, y - bh / 2, bw, bh, bw * 0.3); g.fill();
      g.fillStyle = '#2f7cf6'; roundRect(g, x - bw / 2 + bw * 0.12, y - bh / 2 + bh * 0.08, bw * 0.5, bh * 0.84, bw * 0.2); g.fill();
      g.fillStyle = '#c9d6e8'; g.fillRect(x - bw * 0.22, y - bh * 0.62, bw * 0.44, bh * 0.14);
      if (size > 5) { g.fillStyle = '#ffffff'; g.font = '800 ' + (bw * 0.75) + 'px ' + ART.FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('N', x, y + bh * 0.04); }
      return;
    }
    var sp = Math.cos(t / 160), rx = size * 0.42 * Math.max(0.12, Math.abs(sp)), ry = size * 0.42;
    g.fillStyle = '#b8860b'; g.beginPath(); g.ellipse(x + size * 0.03, y, rx, ry, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = sp > 0 ? '#ffd23f' : '#f2b705'; g.beginPath(); g.ellipse(x, y, rx * 0.92, ry * 0.92, 0, 0, Math.PI * 2); g.fill();
    if (rx > 1.5) { g.fillStyle = '#fff3b0'; g.beginPath(); g.ellipse(x - rx * 0.3, y - ry * 0.3, rx * 0.25, ry * 0.25, 0, 0, Math.PI * 2); g.fill(); }
  }
  function roundRect(g, x, y, w, h, r) { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); }
  function drawCar(g, W, q, c, alpha, pal) {
    var s = q.seg, f = (c.z - s.i * SEG) / SEG, gN = geo(W, s, 0, c.b), gF = geo(W, s, 1, c.b);
    var sc = q.s1 + (q.s2 - q.s1) * f, X = (q.x1 + gN.c * ROAD * q.s1) + ((q.x2 + gF.c * ROAD * q.s2) - (q.x1 + gN.c * ROAD * q.s1)) * f + c.x * ROAD * sc;
    var Y = q.y1 + (q.y2 - q.y1) * f, V = ART.VEH[ART.VEH_ORDER[c.t]], w = V.w * sc, h = V.h * sc;
    if (X + w < -4 || X - w > GW + 4 || w * K < 1) return;
    var m = ART.vehicle(c.t, c.col, pal.tint), hit = W.t - c.hitT < 20 ? Math.sin((W.t - c.hitT) * 1.4) * w * 0.04 : 0;
    g.globalAlpha = alpha; g.drawImage(mip(m, w), X - w / 2 + hit, Y - h, w, h); g.globalAlpha = 1;
    if (pal.night || q.fog > 0.4) {   // tail lights through the dark or the haze
      var ly = Y - h * (1 - m.lights.y), lx = w * (0.5 - m.lights.x);
      LIGHTS.push([X - lx, ly, w * 0.18, '#ff3b30', (pal.night ? 0.9 : 0.4) * alpha]); LIGHTS.push([X + lx, ly, w * 0.18, '#ff3b30', (pal.night ? 0.9 : 0.4) * alpha]);
    }
  }
  var GLOW = {};
  function glowDot(col) {
    var d = GLOW[col]; if (d) return d;
    d = document.createElement('canvas'); d.width = d.height = 64; var x = d.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.2, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
    return (GLOW[col] = d);
  }

  // ---------------------------------------------------------------- the player's car, from behind
  var CAR_LOOK = {
    roadster: { body: '#d7191f', dark: '#8f0d12', light: '#ff5a4e', roof: false, seats: true, h: 0.52 },
    gt: { body: '#b9c4d0', dark: '#6c7a89', light: '#eef3f8', roof: true, glass: 0.3, h: 0.56, wing: true },
    hatch: { body: '#ffc21a', dark: '#c58a00', light: '#ffe27a', roof: true, glass: 0.42, h: 0.74, hatch: true }
  };
  function playerCar(g, W, X, Y, wpx, t) {
    var L = CAR_LOOK[W.car] || CAR_LOOK.roadster, cr = W.crash, yaw = W.steer * 0.55 + W.drift * 0.6, roll = 0, lift = 0;
    if (cr) {
      var p = cr.t / cr.dur;
      if (cr.hard) { yaw = Math.sin(p * Math.PI * 4) * 1.2; lift = Math.sin(Math.min(1, p * 1.6) * Math.PI) * wpx * 0.55; roll = cr.spin * Math.sin(Math.min(1, p * 1.6) * Math.PI) * 1.1; }
      else { yaw = Math.sin(p * Math.PI * 3) * 0.9 * cr.spin; }
    }
    yaw = Math.max(-1.2, Math.min(1.2, yaw));
    var u = wpx / 200;   // the car is drawn in a 200-wide box
    g.save(); g.translate(X, Y - lift); g.rotate(roll * 0.6 + W.steer * 0.03); g.scale(u, u);
    // shadow
    g.fillStyle = 'rgba(0,0,0,' + (0.42 - Math.min(0.3, lift / wpx)) + ')'; g.beginPath(); g.ellipse(0, -2 + lift / u, 106, 12, 0, 0, Math.PI * 2); g.fill();
    var sx = yaw * 22, H = L.h * 200, side = yaw < 0 ? 1 : -1, sw = Math.abs(yaw) * 34;
    // tyres
    g.fillStyle = '#111'; roundRect(g, -98 - (yaw > 0 ? sw * 0.4 : 0), -40, 30, 40, 7); g.fill(); roundRect(g, 68 + (yaw < 0 ? sw * 0.4 : 0), -40, 30, 40, 7); g.fill();
    g.fillStyle = '#2b2b2b'; g.fillRect(-94, -36, 22, 3); g.fillRect(72, -36, 22, 3);
    // the side of the car showing as it turns
    if (sw > 1) {
      g.fillStyle = '#111'; roundRect(g, side > 0 ? 92 : -92 - sw * 0.9, -38, sw * 0.9, 34, 6); g.fill();
      g.fillStyle = L.dark; g.beginPath(); g.moveTo(side * 99, -22); g.lineTo(side * (99 + sw * 0.85), -30); g.lineTo(side * (98 + sw * 0.8), -H * 0.5); g.lineTo(side * 101, -H * 0.46); g.closePath(); g.fill();
    }
    // body
    var bodyG = g.createLinearGradient(0, -H * 0.62, 0, -14); bodyG.addColorStop(0, L.light); bodyG.addColorStop(0.35, L.body); bodyG.addColorStop(1, L.dark);
    g.fillStyle = bodyG; g.beginPath(); g.moveTo(-100, -22); g.lineTo(100, -22); g.lineTo(102, -H * 0.45); g.quadraticCurveTo(98, -H * 0.62, 80 + sx * 0.3, -H * 0.64); g.lineTo(-80 + sx * 0.3, -H * 0.64); g.quadraticCurveTo(-98, -H * 0.62, -102, -H * 0.45); g.closePath(); g.fill();
    // diffuser and exhausts
    g.fillStyle = '#1a1a1a'; g.beginPath(); g.moveTo(-84, -14); g.lineTo(84, -14); g.lineTo(78, -26); g.lineTo(-78, -26); g.closePath(); g.fill();
    g.fillStyle = '#9aa0a6'; g.beginPath(); g.ellipse(-46, -19, 8, 5, 0, 0, Math.PI * 2); g.ellipse(46, -19, 8, 5, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#222'; g.beginPath(); g.ellipse(-46, -19, 5, 3, 0, 0, Math.PI * 2); g.ellipse(46, -19, 5, 3, 0, 0, Math.PI * 2); g.fill();
    // tail lights, bright when braking
    var braking = !cr && (R.braking || W.drift);
    g.fillStyle = braking ? '#ff2a2a' : '#a3121b'; roundRect(g, -94, -H * 0.5, 56, 11, 4); g.fill(); roundRect(g, 38, -H * 0.5, 56, 11, 4); g.fill();
    g.fillStyle = braking ? '#ffd0d0' : '#e2434b'; roundRect(g, -90, -H * 0.5 + 3, 20, 4, 2); g.fill(); roundRect(g, 70, -H * 0.5 + 3, 20, 4, 2); g.fill();
    // number plate
    g.fillStyle = '#f7d417'; roundRect(g, -24, -H * 0.42, 48, 13, 2); g.fill();
    g.fillStyle = '#111'; g.font = '800 10px ' + ART.FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('365 RUN', 0, -H * 0.42 + 7);
    // the top: an open cockpit, or a cabin with a rear window
    if (L.seats) {
      g.fillStyle = '#1b1b1b'; g.beginPath(); g.moveTo(-70 + sx, -H * 0.64); g.lineTo(70 + sx, -H * 0.64); g.lineTo(62 + sx * 1.3, -H * 0.72); g.lineTo(-62 + sx * 1.3, -H * 0.72); g.closePath(); g.fill();
      g.fillStyle = 'rgba(180,220,255,0.35)'; g.beginPath(); g.moveTo(-66 + sx * 1.6, -H * 0.72); g.lineTo(66 + sx * 1.6, -H * 0.72); g.lineTo(58 + sx * 1.9, -H * 0.95); g.lineTo(-58 + sx * 1.9, -H * 0.95); g.closePath(); g.fill();
      [-30, 30].forEach(function (hx, k) {
        g.fillStyle = k ? '#5a3a22' : '#2b1d14'; g.beginPath(); g.ellipse(hx + sx * 1.5, -H * 0.86, 15, 17, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = k ? '#c98d5a' : '#e0b088'; g.fillRect(hx - 6 + sx * 1.5, -H * 0.74, 12, 6);
      });
      g.fillStyle = L.dark; roundRect(g, -76 + sx * 1.1, -H * 0.73, 152, 6, 3); g.fill();
    } else {
      var top = -H * (L.hatch ? 0.98 : 0.9), cw = L.hatch ? 84 : 66, ct = L.hatch ? 74 : 46;
      g.fillStyle = L.body; g.beginPath(); g.moveTo(-cw - 6 + sx, -H * 0.63); g.lineTo(cw + 6 + sx, -H * 0.63); g.lineTo(ct + sx * 1.6, top); g.lineTo(-ct + sx * 1.6, top); g.closePath(); g.fill();
      var gl = g.createLinearGradient(0, top, 0, -H * 0.66); gl.addColorStop(0, '#1d2834'); gl.addColorStop(1, '#5d7286');
      g.fillStyle = gl; g.beginPath(); g.moveTo(-cw + 4 + sx, -H * 0.66); g.lineTo(cw - 4 + sx, -H * 0.66); g.lineTo(ct - 6 + sx * 1.55, top + 6); g.lineTo(-ct + 6 + sx * 1.55, top + 6); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.moveTo(-cw + 14 + sx, -H * 0.67); g.lineTo(-cw + 34 + sx, -H * 0.67); g.lineTo(-ct + 30 + sx * 1.55, top + 7); g.lineTo(-ct + 14 + sx * 1.55, top + 7); g.closePath(); g.fill();
      if (L.wing) { g.fillStyle = '#20262d'; roundRect(g, -92 + sx * 0.6, -H * 0.72, 184, 8, 3); g.fill(); g.fillRect(-60 + sx * 0.4, -H * 0.66, 6, 8); g.fillRect(54 + sx * 0.4, -H * 0.66, 6, 8); }
      if (L.hatch) { g.fillStyle = L.dark; roundRect(g, -ct - 2 + sx * 1.6, top - 6, ct * 2 + 4, 8, 3); g.fill(); g.fillStyle = '#111'; roundRect(g, -40, -H * 0.36, 80, 7, 3); g.fill(); }
    }
    g.restore();
    // boost flames and the drift smoke come from the exhausts and wheels (drawn by the effects)
    return { ex: [X - 46 * u, Y - 19 * u - lift], ex2: [X + 46 * u, Y - 19 * u - lift], wl: [X - 84 * u, Y - lift], wr: [X + 84 * u, Y - lift], u: u };
  }

  // ---------------------------------------------------------------- sparks, smoke, dust and fireworks (on the screen, not in the world)
  function part(o) { if (R.parts.length > (R.low ? 160 : 420)) R.parts.shift(); R.parts.push(o); }
  function burst(x, y, n, o) {
    for (var i = 0; i < n; i++) {
      var a = (o.a0 == null ? 0 : o.a0) + Math.random() * (o.spread == null ? Math.PI * 2 : o.spread), sp = o.sp * (0.4 + Math.random() * 0.8);
      part({ x: x, y: y, vx: Math.cos(a) * sp + (o.vx || 0), vy: Math.sin(a) * sp + (o.vy || 0), g: o.g || 0, life: 0, max: o.life * (0.6 + Math.random() * 0.6), r: o.r * (0.6 + Math.random() * 0.8), col: o.cols[(Math.random() * o.cols.length) | 0], add: !!o.add, grow: o.grow || 0, drag: o.drag || 0.98 });
    }
  }
  function stepParts(dt) {
    var ps = R.parts;
    for (var i = ps.length - 1; i >= 0; i--) {
      var p = ps[i]; p.life += dt; if (p.life >= p.max) { ps.splice(i, 1); continue; }
      p.vx *= p.drag; p.vy = p.vy * p.drag + p.g; p.x += p.vx; p.y += p.vy; p.r += p.grow;
    }
  }
  function drawParts(g) {
    var ps = R.parts;
    for (var i = 0; i < ps.length; i++) {
      var p = ps[i], a = 1 - p.life / p.max;
      if (p.add) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = a; var d = glowDot(p.col); g.drawImage(d, p.x - p.r * 2, p.y - p.r * 2, p.r * 4, p.r * 4); g.globalCompositeOperation = 'source-over'; }
      else { g.globalAlpha = a * 0.8; g.fillStyle = p.col; g.beginPath(); g.arc(p.x, p.y, Math.max(0.2, p.r), 0, Math.PI * 2); g.fill(); }
    }
    g.globalAlpha = 1;
  }
  function takeFx(W, carPos, hwP) {   // what the rules say just happened, turned into sparks and smoke
    var list = W.fx;
    for (var i = 0; i < list.length; i++) {
      var f = list[i]; if (f.n <= R.fxN) continue; R.fxN = f.n;
      var sx = GW / 2 + (f.x + playerShift(W) - R.camX) * hwP, sy = carPos[1] - 8;
      switch (f.k) {
        case 'coin': burst(sx, sy - 14, 10, { sp: 1.6, life: 22, r: 1.6, cols: ['#ffe066', '#fff3b0', '#ffd23f'], add: true, g: 0.04 }); break;
        case 'nitro': burst(sx, sy - 14, 18, { sp: 2.2, life: 28, r: 2.2, cols: ['#5aa9ff', '#bfe0ff', '#2f7cf6'], add: true }); break;
        case 'leaves': burst(sx, sy - 10, 22, { sp: 2.4, life: 40, r: 1.4, cols: f.t2 === 'brolly' ? ['#e63946', '#ffffff', '#1d7fd6'] : f.t2 === 'hay' ? ['#e8c86a', '#d9b450'] : ['#3c8a3a', '#64b852', '#c8641e', '#ffd31a'], g: 0.08, a0: -Math.PI, spread: Math.PI }); break;
        case 'bump': burst(sx, sy - 6, 14, { sp: 2.2, life: 18, r: 1.2, cols: ['#ffd27a', '#ffffff', '#ff9a3c'], add: true, g: 0.05 }); break;
        case 'crash':
          burst(sx, sy - 10, 30, { sp: 3, life: 45, r: 2.2, cols: ['#ffb347', '#ff6a3d', '#ffe08a'], add: true, g: 0.06 });
          burst(sx, sy - 10, 26, { sp: 1.2, life: 70, r: 4, cols: ['#777', '#999', '#555'], grow: 0.12, g: -0.03, drag: 0.96 }); break;
        case 'sparks': burst(sx, sy, 6, { sp: 2.2, life: 14, r: 0.9, cols: ['#ffd27a', '#fff3c4', '#ff9a3c'], add: true, g: 0.08, a0: -Math.PI * 0.9, spread: Math.PI * 0.8 }); break;
        case 'fireworks':
          for (var b = 0; b < 7; b++) (function (b) { setTimeout(function () { burst(40 + Math.random() * (GW - 80), 20 + Math.random() * 50, 46, { sp: 2.2, life: 60, r: 1.6, cols: [['#ff5a5f', '#ffd23f'], ['#5aa9ff', '#ffffff'], ['#7cff8a', '#ffe066']][b % 3], add: true, g: 0.03, drag: 0.97 }); }, b * 260); })(b);
          break;
      }
    }
  }

  // ---------------------------------------------------------------- the whole picture
  function hudText(g, s, x, y, size, col, align, stroke) {
    g.font = '800 ' + size + 'px ' + ART.FONT; g.textAlign = align || 'left'; g.textBaseline = 'alphabetic';
    if (stroke !== false) { g.lineJoin = 'round'; g.lineWidth = Math.max(1, size * 0.16); g.strokeStyle = 'rgba(0,0,0,0.75)'; g.strokeText(s, x, y); }
    g.fillStyle = col; g.fillText(s, x, y);
  }
  function stretchOf(W, i) { for (var j = W.stretch.length - 1; j >= 0; j--) if (i >= W.stretch[j].from && i < W.stretch[j].to) return W.stretch[j]; return null; }

  function draw(g, W, t, mode, info) {
    var t0 = performance.now();
    K = info.scale;
    g.setTransform(K, 0, 0, K, 0, 0); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    var frameDt = R.lastT ? Math.min(0.1, (t - R.lastT) / 1000) : 1 / 60; R.lastT = t;
    if (R.W !== W) { R.W = W; R.camX = W.x; R.fxN = W.fxN || 0; R.parts.length = 0; R.goT = -1; R.shownScore = W.score; R.bgKey = null; }
    // the title screen drives itself along the coast
    if (mode === 'title' && W.demo) {
      R.demoAcc += frameDt;
      var steps = 0;
      while (R.demoAcc > 1 / 60 && steps < 4) { W.time = 60; E.step(W, E.autopilot(W)); W.events.length = 0; R.demoAcc -= 1 / 60; steps++; }
      if (steps === 4) R.demoAcc = 0;
    }
    var live = mode === 'play' || (mode === 'title' && W.demo);
    var pct = W.v / MAXS;
    R.braking = live && (W.v < R.lastV - 25) && !W.timeUp && !W.crash; R.lastV = W.v;
    R.boostK += ((W.boosting ? 1 : 0) - R.boostK) * Math.min(1, frameDt * 4);
    R.depth = DEPTH - 0.07 * R.boostK - 0.035 * pct;
    var targetX = W.x + playerShift(W);
    R.camX += (targetX - R.camX) * Math.min(1, frameDt * 9);
    if (Math.abs(targetX - R.camX) > 1.5) R.camX = targetX;
    R.bounce = live ? Math.sin(t / 55) * pct * 6 + (W.off ? Math.sin(t / 23) * 14 * pct : 0) : 0;
    var shake = (W.shake > 0 && R.shakeOn !== false) ? W.shake * 0.18 : 0;
    if (shake) g.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    LIGHTS.length = 0; beams.length = 0;

    var pi = E.segIndex(W.z), ps = E.segAt(W, pi), here = ps.st;
    // the sky and the hills behind: they slide as the road bends, and cross-fade into the next place
    var key = PAL[here].key;
    if (key !== R.bgKey) { R.bgPrev = R.bgKey; R.bgKey = key; R.bgFade = R.bgPrev ? 0 : 1; R.bgFromSt = R.bgSt; R.bgSt = here; }
    if (R.bgFade < 1) R.bgFade = Math.min(1, R.bgFade + frameDt / 2.2);
    var n = project(W);
    var yShift = Math.max(-14, Math.min(14, -(PJ.pY || 0) * 0.0012));
    var res = Math.min(3, Math.max(1, Math.round(K * 0.8)));
    if (R.bgPrev && R.bgFade < 1) { drawSky(g, W, R.bgFromSt, res, yShift, 1); g.globalAlpha = R.bgFade; drawSky(g, W, here, res, yShift, R.bgFade); g.globalAlpha = 1; }
    else drawSky(g, W, here, res, yShift, 1);

    // the road and everything on it, far to near
    var buckets = {};
    for (var c = 0; c < W.cars.length; c++) { var car = W.cars[c], ci = E.segIndex(car.z); (buckets[ci] || (buckets[ci] = [])).push(car); }
    for (var k = n - 1; k >= 0; k--) {
      var q = PJ[k];
      if (!q.vis) continue;
      drawSlice(g, W, q, t);
      var bc = buckets[q.seg.i]; if (bc && bc.length > 1) bc.sort(function (a, b) { return b.z - a.z; });
      drawSprites(g, W, q, t, bc);
    }
    // light beams and lamps at night, tail lights in the haze
    if (beams.length) for (var bm = 0; bm < beams.length; bm++) drawBeam(g, beams[bm], t, PAL[here]);
    if (LIGHTS.length) {
      g.globalCompositeOperation = 'lighter';
      for (var L = 0; L < LIGHTS.length; L++) { var l = LIGHTS[L], lr = Math.min(l[2], 26); if (lr < 0.3) continue; g.globalAlpha = Math.min(1, l[4]); g.drawImage(glowDot(l[3]), l[0] - lr, l[1] - lr, lr * 2, lr * 2); }
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    }

    // the player's car
    var sP = R.depth / CAMD * HF, hwP = ROAD * sP, carX = GW / 2 + (targetX - R.camX) * hwP, carY = HOR + sP * CAMH - R.bounce * sP * 0.4 + 3;
    if (PAL[here].night) headlights(g, carX, carY, hwP);
    var cp = playerCar(g, W, carX, carY, 720 * sP * 1.02, t);
    // flames when boosting, smoke when drifting, dust off the road
    if (live) {
      if (W.boosting) { burst(cp.ex[0], cp.ex[1], 2, { sp: 1.2, life: 10, r: 2.4, cols: ['#ff9a3c', '#ffd27a', '#5aa9ff'], add: true, vy: 1.4, a0: Math.PI * 0.4, spread: Math.PI * 0.2 }); burst(cp.ex2[0], cp.ex2[1], 2, { sp: 1.2, life: 10, r: 2.4, cols: ['#ff9a3c', '#ffd27a', '#5aa9ff'], add: true, vy: 1.4, a0: Math.PI * 0.4, spread: Math.PI * 0.2 }); }
      if (W.drift && Math.random() < 0.7) { var wsd = W.drift > 0 ? cp.wl : cp.wr; burst(wsd[0], wsd[1] - 4, 1, { sp: 0.6, life: 50, r: 5, cols: ['#e8e8e8', '#d0d0d0', '#f4f4f4'], grow: 0.25, g: -0.05, drag: 0.95, vy: 0.4 }); }
      if (W.off && pct > 0.12 && Math.random() < 0.6) { var dc = PAL[here].sea && Math.abs(W.x) > 1 && Math.sign(W.x) === ps.sea ? PAL[here].verge[0] : PAL[here].grass[0]; burst(Math.random() < 0.5 ? cp.wl[0] : cp.wr[0], cp.wl[1] - 3, 1, { sp: 0.8, life: 34, r: 3.5, cols: [dc, ART.shade(dc, -0.2)], grow: 0.18, g: -0.02, drag: 0.95, vy: 0.6 }); }
      takeFx(W, [carX, carY], hwP);
    }
    stepParts(frameDt * 60);
    drawParts(g);

    if (R.boostK > 0.05) speedLines(g, t, R.boostK);
    if (PAL[here].key === 'jurassic' && !R.low) sunFlare(g, W, R.boostK);
    if (shake) g.setTransform(K, 0, 0, K, 0, 0);
    hud(g, W, t, mode, info, pi);

    // a slow PC: look less far and make fewer sparks
    var took = performance.now() - t0;
    R.slow = R.slow * 0.97 + (took > 14 ? 1 : 0) * 0.03;
    if (!R.low && R.slow > 0.6) R.low = true;
  }
  function drawSky(g, W, st, res, yShift, alpha) {
    var pal = PAL[st], sk = pal.sky, gr = g.createLinearGradient(0, 0, 0, HOR + yShift + 2);
    for (var i = 0; i < sk.length; i++) gr.addColorStop(sk[i][0], sk[i][1]);
    g.fillStyle = gr; g.fillRect(0, 0, GW, HOR + yShift + 2);
    g.fillStyle = pal.fog; g.fillRect(0, HOR + yShift, GW, GH - HOR - yShift);
    var B = ART.bg(pal.key, res), top = HOR - ART.HZ + yShift, bw = ART.BG_W;
    [[B.far, 0.35], [B.near, 0.75]].forEach(function (L) {
      var off = ((W.skyX * L[1] * bw) % bw + bw) % bw, x = -off;
      while (x < GW) { g.drawImage(L[0], x, top, bw, ART.BG_H); x += bw; }
    });
    void alpha;
  }
  function headlights(g, x, y, hw) {   // two soft pools of light on the road ahead
    g.save(); g.globalCompositeOperation = 'lighter';
    [[-0.22, 1], [0.22, 1], [0, 0.6]].forEach(function (b) {
      var cx = x + b[0] * hw, cy = y - (y - HOR) * 0.45;
      g.setTransform(K, 0, 0, K * 0.42, 0, 0);
      var gr = g.createRadialGradient(cx, cy / 0.42, 2, cx, cy / 0.42, hw * 0.75);
      gr.addColorStop(0, 'rgba(255,236,190,' + (0.22 * b[1]) + ')'); gr.addColorStop(1, 'rgba(255,236,190,0)');
      g.fillStyle = gr; g.fillRect(cx - hw, cy / 0.42 - hw, hw * 2, hw * 2);
    });
    g.restore(); g.setTransform(K, 0, 0, K, 0, 0);
  }
  function drawBeam(g, b, t, pal) {   // a lighthouse's turning beam
    var a = Math.sin(t / 900), len = 300, w = 0.12;
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.35 * b[3] * (pal.night || pal.key !== 'bournemouth' ? 1 : 0.4);
    var ang = a * 1.4 + Math.PI, gx = b[0], gy = b[1];
    var gr = g.createRadialGradient(gx, gy, 0, gx, gy, len); gr.addColorStop(0, 'rgba(255,248,210,0.9)'); gr.addColorStop(1, 'rgba(255,248,210,0)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(gx, gy); g.lineTo(gx + Math.cos(ang - w) * len, gy + Math.sin(ang - w) * len * 0.25); g.lineTo(gx + Math.cos(ang + w) * len, gy + Math.sin(ang + w) * len * 0.25); g.closePath(); g.fill();
    g.globalAlpha = 0.8 * b[3]; g.drawImage(glowDot('#fff4c0'), gx - b[2] * 0.12, gy - b[2] * 0.12, b[2] * 0.24, b[2] * 0.24);
    g.restore();
  }
  function speedLines(g, t, k) {
    g.save(); g.globalAlpha = 0.35 * k; g.strokeStyle = '#ffffff'; g.lineWidth = 0.7;
    var r = (t / 16) | 0;
    for (var i = 0; i < 26; i++) {
      var a = ((i * 137.5 + r * 23) % 360) * Math.PI / 180, r0 = 70 + ((i * 53 + r * 17) % 60), r1 = r0 + 30 + ((i * 29) % 40);
      g.beginPath(); g.moveTo(GW / 2 + Math.cos(a) * r0 * 1.6, HOR + Math.sin(a) * r0); g.lineTo(GW / 2 + Math.cos(a) * r1 * 1.6, HOR + Math.sin(a) * r1); g.stroke();
    }
    g.restore();
  }
  function sunFlare(g, W, k) {
    var sx = ((610 - W.skyX * 0.35 * ART.BG_W) % ART.BG_W + ART.BG_W) % ART.BG_W; if (sx > GW + 40) sx -= ART.BG_W;
    if (sx < -60 || sx > GW + 60) return;
    var sy = HOR - 12, cx = GW / 2, cy = HOR + 30;
    g.save(); g.globalCompositeOperation = 'lighter';
    [[0.3, 10, 'rgba(255,200,120,0.18)'], [0.6, 6, 'rgba(255,140,200,0.14)'], [1.25, 14, 'rgba(255,220,150,0.12)'], [1.6, 4, 'rgba(160,220,255,0.16)']].forEach(function (f) {
      g.fillStyle = f[2]; g.beginPath(); g.arc(sx + (cx - sx) * f[0], sy + (cy - sy) * f[0], f[1], 0, Math.PI * 2); g.fill();
    });
    g.restore(); void k;
  }

  // ---------------------------------------------------------------- the dashboard on the screen
  var STAGE_POS = { 0: [0, 0], 1: [1, 0], 2: [1, 1], 3: [2, 0], 4: [2, 1], 5: [2, 2] };
  function hud(g, W, t, mode, info, pi) {
    var tm = Math.ceil(W.time), low = !W.timeUp && W.time <= 10 && W.count <= 0, flash = low && (t / 250 | 0) % 2;
    // time
    hudText(g, 'TIME', 10, 13, 7.5, '#ffe9a8');
    hudText(g, String(tm), 9, 38, 26, flash ? '#ff4d4d' : low ? '#ff9a3c' : '#ffd400');
    // score (rolls up)
    R.shownScore += (W.score - R.shownScore) * 0.2; if (Math.abs(W.score - R.shownScore) < 1) R.shownScore = W.score;
    hudText(g, 'SCORE', GW - 10, 13, 7.5, '#bfe6ff', 'right');
    hudText(g, Math.round(R.shownScore).toLocaleString('en-GB'), GW - 10, 29, 14, '#ffffff', 'right');
    hudText(g, 'STAGE ' + W.stageNo + (W.round > 1 ? '  ·  ROUND ' + W.round : ''), GW - 10, 40, 7, '#bfe6ff', 'right');
    // where you are: this stretch's name and how far to its end
    var st = stretchOf(W, pi), S = E.STAGES[(st && st.id) || 0];
    hudText(g, S.name, GW / 2, 13, 8.5, '#ffffff', 'center');
    if (st) {
      var p = Math.max(0, Math.min(1, (pi - st.from) / (st.to - st.from))), bw = 96, bx = GW / 2 - bw / 2, by = 18;
      g.fillStyle = 'rgba(0,0,0,0.45)'; roundRect(g, bx - 1, by - 1, bw + 2, 6, 3); g.fill();
      g.fillStyle = '#ffd400'; roundRect(g, bx, by, Math.max(2, bw * p), 4, 2); g.fill();
      g.fillStyle = S.next ? '#ffffff' : '#4ade80'; g.beginPath(); g.arc(bx + bw, by + 2, 2.6, 0, Math.PI * 2); g.fill();
    }
    // the route map: the three rows of places, your way through them lit
    routeMap(g, W, 10, GH - 34, t);
    // speed and boost
    var mph = E.mph(W);
    hudText(g, String(mph), GW - 34, GH - 15, 22, W.boosting ? '#7fd8ff' : '#ffffff', 'right');
    hudText(g, 'MPH', GW - 10, GH - 15, 7.5, '#bfe6ff', 'right');
    var bw2 = 64, bx2 = GW - 10 - bw2, by2 = GH - 10;
    g.fillStyle = 'rgba(0,0,0,0.5)'; roundRect(g, bx2 - 1, by2 - 1, bw2 + 2, 6, 3); g.fill();
    var bg2 = g.createLinearGradient(bx2, 0, bx2 + bw2, 0); bg2.addColorStop(0, '#2f7cf6'); bg2.addColorStop(1, '#7fe8ff');
    g.fillStyle = bg2; roundRect(g, bx2, by2, Math.max(1, bw2 * W.boost), 4, 2); g.fill();
    hudText(g, 'BOOST', bx2 - 4, by2 + 5, 6.5, W.boosting ? '#ffffff' : W.boost > 0.25 && ((t / 400 | 0) % 2) ? '#7fe8ff' : '#9fb3c8', 'right');
    // the lights at the start
    if (W.count > 0 || (R.goT >= 0 && W.t - R.goT < 50)) lights(g, W);
    if (W.count <= 0 && R.goT < 0) R.goT = W.t;
    // a fork ahead: which way is which
    var F = W.fork;
    if (F && !F.s && pi > F.a - 150 && pi < F.split && mode !== 'title') {
      var L = E.STAGES[F.next[0]].name, Rn = E.STAGES[F.next[1]].name, side = W.x < -0.15 ? -1 : W.x > 0.15 ? 1 : 0;
      roundRect(g, GW / 2 - 140, 52, 280, 18, 9); g.fillStyle = 'rgba(0,40,20,0.72)'; g.fill();
      hudText(g, '◀ ' + L, GW / 2 - 8, 65, 9, side < 0 ? '#ffd400' : '#ffffff', 'right', false);
      hudText(g, Rn + ' ▶', GW / 2 + 8, 65, 9, side > 0 ? '#ffd400' : '#ffffff', 'left', false);
      g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(GW / 2 - 0.5, 55, 1, 12);
    }
    // a word or two about the controls at the very start of a first game
    if (mode === 'play' && W.stageNo === 1 && W.count <= 0 && W.t - R.goT < 420 && R.goT >= 0 && !document.body.classList.contains('touchy')) {
      hudText(g, '◀ ▶ steer   ·   SPACE boost   ·   ▼ brake (with ◀ ▶ to drift)', GW / 2, GH - 30, 7.5, '#ffffff', 'center');
    }
    banner(g, W, t);
    pops(g, W);
  }
  function routeMap(g, W, x0, y0, t) {
    var dx = 14, dy = 10, route = W.route || [0], here = route[route.length - 1];
    function at(id) { var p = STAGE_POS[id]; return [x0 + 4 + p[0] * dx, y0 + 4 + (p[1] - p[0] / 2) * dy + dy]; }
    g.lineWidth = 1.2; g.strokeStyle = 'rgba(255,255,255,0.22)';
    [[0, 1], [0, 2], [1, 3], [1, 4], [2, 4], [2, 5]].forEach(function (e) { var a = at(e[0]), b = at(e[1]); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); });
    g.strokeStyle = '#ffd400'; g.lineWidth = 1.6;
    for (var i = 1; i < route.length; i++) { var a = at(route[i - 1]), b = at(route[i]); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
    for (var id = 0; id < 6; id++) {
      var p = at(id), on = route.indexOf(id) >= 0, cur = id === here;
      g.fillStyle = cur ? ((t / 300 | 0) % 2 ? '#ffffff' : '#ffd400') : on ? '#ffd400' : 'rgba(255,255,255,0.35)';
      g.beginPath(); g.arc(p[0], p[1], cur ? 2.8 : 2.1, 0, Math.PI * 2); g.fill();
    }
  }
  function lights(g, W) {
    var x = GW / 2 - 36, y = 26, lit = W.count > 180 ? 0 : W.count > 120 ? 1 : W.count > 60 ? 2 : W.count > 0 ? 3 : 4;
    g.fillStyle = '#111'; roundRect(g, x, y, 72, 22, 6); g.fill(); g.fillStyle = '#333'; roundRect(g, x + 2, y + 2, 68, 18, 5); g.fill();
    for (var i = 0; i < 3; i++) {
      var on = lit === 4 ? '#3bff6a' : i < lit ? '#ff2b2b' : '#3a1414', cx = x + 14 + i * 22, cy = y + 11;
      g.fillStyle = on; g.beginPath(); g.arc(cx, cy, 7, 0, Math.PI * 2); g.fill();
      if (lit === 4 || i < lit) { g.globalCompositeOperation = 'lighter'; g.drawImage(glowDot(lit === 4 ? '#3bff6a' : '#ff2b2b'), cx - 16, cy - 16, 32, 32); g.globalCompositeOperation = 'source-over'; }
    }
  }
  var BANNER_COL = { check: ['#ffd400', '#ffffff'], stage: ['#ffffff', '#bfe6ff'], goal: ['#4ade80', '#ffd400'], red: ['#ff4d4d', '#ffffff'], go: ['#3bff6a', '#ffffff'], gold: ['#ffd400', '#ffffff'] };
  function banner(g, W, t) {
    var b = W.banner; if (!b) return;
    var age = W.t - b.t, dur = b.kind === 'go' ? 50 : b.kind === 'red' ? 400 : 160; if (age > dur || age < 0) return;
    var cols = BANNER_COL[b.kind] || BANNER_COL.stage, inK = Math.min(1, age / 10), outK = Math.min(1, (dur - age) / 16), s = 0.7 + 0.3 * inK + (b.kind === 'goal' ? Math.sin(age / 6) * 0.03 : 0);
    g.save(); g.globalAlpha = outK; g.translate(GW / 2, 86); g.scale(s, s);
    hudText(g, b.txt, 0, 0, b.kind === 'go' ? 34 : 24, cols[0], 'center');
    if (b.sub) hudText(g, b.sub, 0, 16, 10, cols[1], 'center');
    g.restore();
  }
  var POP_COL = { near: '#7fe8ff', drift: '#ffb347', gold: '#ffd400', nitro: '#7fb8ff', slip: '#c9b8ff' };
  function pops(g, W) {
    for (var i = 0; i < W.pops.length; i++) {
      var p = W.pops[i], age = W.t - p.t; if (age > 70 || age < 0) continue;
      var a = Math.min(1, (70 - age) / 18), y = 150 - age * 0.5 - i * 0.0, x = GW / 2 + Math.max(-1, Math.min(1, p.x)) * 70;
      g.globalAlpha = a;
      hudText(g, p.txt, x, y, 10, POP_COL[p.kind] || '#ffffff', 'center');
      if (p.sub) hudText(g, p.sub, x, y + 10, 8, '#ffffff', 'center');
      g.globalAlpha = 1;
    }
  }

  // ---------------------------------------------------------------- sounds: one-off effects, and the engine, wind and tyres that follow the car
  function pan(e) { return e && e.x != null ? Math.max(-0.8, Math.min(0.8, e.x * 0.6)) : 0; }
  function sound(name, S, e) {
    var p = pan(e), n = (e && e.n) || 1, i;
    switch (name) {
      case 'count': S.tone(523, 0.32, 0.09, { type: 'square', verb: 0.25 }); break;
      case 'go': S.tone(1046, 0.7, 0.1, { type: 'square', verb: 0.4 }); S.tone(1568, 0.6, 0.04, { type: 'triangle', verb: 0.4 }); break;
      case 'perfect': [784, 988, 1175, 1568].forEach(function (f, k) { S.tone(f, 0.16, 0.05, { type: 'square', when: k * 0.05, verb: 0.4 }); }); break;
      case 'bump': S.noise(0.3, 0.28, 1400, { pan: p, verb: 0.2 }); S.tone(110, 0.22, 0.16, { type: 'sine', to: 45, pan: p }); S.noise(0.12, 0.08, 6000, { type: 'highpass', to: 3000, pan: p }); break;
      case 'crash':
        S.noise(1.4, 0.4, 2600, { verb: 0.5 }); S.tone(80, 1, 0.24, { type: 'sine', to: 25 }); S.noise(0.6, 0.12, 9000, { type: 'highpass', to: 5000, when: 0.08 });
        for (i = 0; i < 4; i++) S.noise(0.12, 0.12, 1800, { when: 0.25 + i * 0.22, pan: (i % 2 ? 0.4 : -0.4) });
        break;
      case 'scrape': S.noise(0.16, 0.07, 3800, { type: 'bandpass', q: 3, to: 2400, pan: p }); S.tone(1900 + Math.random() * 600, 0.08, 0.012, { type: 'sawtooth', pan: p }); break;
      case 'near': S.noise(0.42, 0.16, 500, { type: 'bandpass', q: 1.4, to: 3200, pan: p }); S.tone(880 * Math.pow(1.122, Math.min(n, 9) - 1), 0.14, 0.04, { type: 'triangle', when: 0.05, verb: 0.3 }); break;
      case 'coin': var f0 = 1318 * Math.pow(1.0595, Math.min(n, 12) - 1); S.tone(f0, 0.07, 0.04, { type: 'square', pan: p }); S.tone(f0 * 1.5, 0.16, 0.035, { type: 'square', when: 0.05, pan: p, verb: 0.2 }); break;
      case 'line': [1047, 1319, 1568, 2093].forEach(function (f, k) { S.tone(f, 0.12, 0.04, { type: 'square', when: k * 0.06, verb: 0.35 }); }); break;
      case 'nitro': S.tone(300, 0.4, 0.06, { type: 'sawtooth', to: 1400, verb: 0.3 }); S.noise(0.4, 0.08, 600, { type: 'bandpass', q: 2, to: 5000 }); break;
      case 'boost': S.noise(0.8, 0.14, 300, { type: 'bandpass', q: 1.2, to: 3000, verb: 0.3 }); S.tone(160, 0.6, 0.06, { type: 'sawtooth', to: 320 }); break;
      case 'check': [523, 659, 784, 1047, 784, 1047, 1319].forEach(function (f, k) { S.tone(f, 0.14, 0.055, { type: 'square', when: k * 0.08, verb: 0.4 }); }); break;
      case 'goal':
        [523, 659, 784, 1047, 1319, 1568].forEach(function (f, k) { S.tone(f, 0.2, 0.06, { type: 'square', when: k * 0.09, verb: 0.45 }); });
        [1047, 1319, 1568, 2093].forEach(function (f) { S.tone(f, 1.1, 0.03, { type: 'triangle', when: 0.6, verb: 0.5 }); });
        break;
      case 'tick': S.tone(n <= 5 ? 1320 : 990, 0.07, 0.06, { type: 'square' }); break;
      case 'timeup': [523, 440, 349, 262].forEach(function (f, k) { S.tone(f, 0.3, 0.07, { type: 'triangle', when: k * 0.24, verb: 0.4 }); }); break;
      case 'fork': S.tone(784, 0.14, 0.05, { type: 'triangle', verb: 0.3 }); S.tone(1175, 0.2, 0.05, { type: 'triangle', when: 0.1, verb: 0.3 }); break;
      case 'skid': S.noise(0.35, 0.07, 2600, { type: 'bandpass', q: 9, to: 2200 }); break;
      case 'driftend': S.tone(988, 0.1, 0.04, { type: 'square', verb: 0.3 }); S.tone(1319, 0.16, 0.04, { type: 'square', when: 0.07, verb: 0.3 }); break;
      case 'slip': S.noise(0.5, 0.06, 900, { type: 'bandpass', q: 2, to: 2400 }); break;
      case 'bush': S.noise(0.28, 0.12, 2200, { type: 'bandpass', q: 0.8, to: 600, pan: p }); break;
      case 'extra': [523, 659, 784, 1047].forEach(function (f, k) { S.tone(f, 0.1, 0.05, { type: 'square', when: k * 0.08, verb: 0.3 }); }); break;
    }
  }
  var AU = null;
  function makeAudio(a, bus) {
    var o = {};
    o.g = a.createGain(); o.g.gain.value = 0; o.f = a.createBiquadFilter(); o.f.type = 'lowpass'; o.f.Q.value = 3; o.f.frequency.value = 600;
    o.f.connect(o.g); o.g.connect(bus);
    o.o1 = a.createOscillator(); o.o1.type = 'sawtooth'; o.o2 = a.createOscillator(); o.o2.type = 'square'; o.o3 = a.createOscillator(); o.o3.type = 'triangle';
    var m1 = a.createGain(), m2 = a.createGain(), m3 = a.createGain(); m1.gain.value = 0.5; m2.gain.value = 0.32; m3.gain.value = 0.4;
    o.o1.connect(m1); o.o2.connect(m2); o.o3.connect(m3); m1.connect(o.f); m2.connect(o.f); m3.connect(o.f);
    o.o1.start(); o.o2.start(); o.o3.start();
    var len = Math.floor(a.sampleRate * 2), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    function loop(type, freq, q) { var s = a.createBufferSource(), f = a.createBiquadFilter(), gn = a.createGain(); s.buffer = buf; s.loop = true; f.type = type; f.frequency.value = freq; f.Q.value = q; gn.gain.value = 0; s.connect(f); f.connect(gn); gn.connect(bus); s.start(0, Math.random()); return { f: f, g: gn }; }
    o.wind = loop('bandpass', 900, 0.6); o.skid = loop('bandpass', 2400, 7); o.rumble = loop('lowpass', 160, 1);
    return o;
  }
  var GEARS = [0, 0.19, 0.37, 0.56, 0.76, 0.98, 1.4];
  var BPM = 128, ST16 = 60 / BPM / 4, nextT = 0, stepN = 0;
  var SONG = [[[110, 220], [659, 880, 988, 1319]], [[87.3, 174.6], [659, 880, 1047, 1319]], [[98, 196], [587, 784, 988, 1175]], [[82.4, 164.8], [494, 659, 831, 988]]];
  function frameAudio(W, S, mode, SET) {
    var playing = !!(W && !W.demo && mode === 'play' && SET.sound);
    var a = playing ? S.ctx() : S.existing();
    if (!a) return;
    if (!AU) { if (!playing) return; AU = makeAudio(a, S.bus() || a.destination); }
    var now = a.currentTime, T = 0.06;
    if (!playing) { AU.g.gain.setTargetAtTime(0, now, 0.05); AU.wind.g.gain.setTargetAtTime(0, now, 0.05); AU.skid.g.gain.setTargetAtTime(0, now, 0.05); AU.rumble.g.gain.setTargetAtTime(0, now, 0.05); nextT = 0; return; }
    var pct = W.v / MAXS, gi = 0; while (gi < 5 && pct > GEARS[gi + 1]) gi++;
    var rpm = W.count > 0 ? 0.18 + (W.rev || 0) * 0.75 : Math.min(1.1, 0.28 + 0.72 * (pct - GEARS[gi]) / (GEARS[gi + 1] - GEARS[gi]));
    if (W.timeUp) rpm *= 0.6;
    var f = 46 + rpm * 112 + gi * 6 + (W.boosting ? 18 : 0);
    AU.o1.frequency.setTargetAtTime(f, now, 0.025); AU.o2.frequency.setTargetAtTime(f * 0.501, now, 0.025); AU.o3.frequency.setTargetAtTime(f * 2.003, now, 0.025);
    AU.f.frequency.setTargetAtTime(380 + rpm * 1500 + (W.boosting ? 900 : 0) + (R.braking ? -200 : 0), now, T);
    AU.g.gain.setTargetAtTime(W.crash ? 0.015 : 0.05 + rpm * 0.045, now, T);
    AU.wind.f.frequency.setTargetAtTime(600 + pct * 1800, now, T);
    AU.wind.g.gain.setTargetAtTime(Math.min(0.09, pct * pct * 0.055 + (W.boosting ? 0.03 : 0)), now, T);
    AU.skid.g.gain.setTargetAtTime(W.drift ? 0.045 : 0, now, 0.03);
    AU.rumble.g.gain.setTargetAtTime(W.off && pct > 0.08 ? 0.12 * Math.min(1, pct * 2) : 0, now, 0.04);
    if (!SET.music) { nextT = 0; return; }
    if (!nextT || nextT < now) { nextT = now + 0.06; stepN = 0; }
    while (nextT < now + 0.22) {   // a sunny driving tune: bass on the eighths, an arpeggio, a beat
      var bar = Math.floor(stepN / 16) % 4, s = stepN % 16, ch = SONG[bar], when = nextT - now;
      if (s % 2 === 0) S.tone(ch[0][(s / 2) % 2], ST16 * 1.6, 0.045, { type: 'sawtooth', when: when, attack: 0.004 });
      S.tone(ch[1][s % 4] * (s >= 8 ? 1 : 0.5), ST16 * 0.9, 0.012, { type: 'square', when: when, verb: 0.3 });
      if (s % 4 === 0) S.tone(140, 0.12, 0.11, { type: 'sine', to: 45, when: when });
      if (s === 4 || s === 12) S.noise(0.12, 0.05, 2400, { type: 'bandpass', q: 1.1, when: when });
      if (s % 2 === 1) S.noise(0.03, 0.012, 9000, { type: 'highpass', to: 7000, when: when });
      nextT += ST16; stepN++;
    }
  }

  // ---------------------------------------------------------------- the cabinet
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ART.flush(); });
  var touchy = function () { return document.body.classList.contains('touchy'); };
  A.start({
    id: 'coastrun', store: 'coast365', title: '365 Coast Run', width: GW, height: GH, waveWord: 'stage', alt: true,
    pad: [{ act: 'left', label: '◀' }, { act: 'right', label: '▶' }, { act: 'down', label: 'Brake', cls: 'alt' }, { act: 'fire', label: 'Boost', cls: 'fire' }],
    speeds: { options: [[1, 'Gentle'], [2, 'Classic'], [3, 'Fast']], def: 1 },
    settings: [
      { key: 'car', type: 'seg', label: 'Car', small: 'The Roadster is the all-rounder; the GT is the fastest but slides more; the Hot hatch is quick off the mark and grips best. Changes from your next game.', options: [['roadster', 'Roadster'], ['gt', 'GT'], ['hatch', 'Hot hatch']], def: 'roadster' },
      { key: 'pedal', type: 'seg', label: 'Accelerator', small: 'Automatic: the car goes by itself and you just steer (Brake slows you down). Hold: hold the up arrow to go. Tablets always use Automatic.', options: [['auto', 'Automatic'], ['hold', 'Hold ▲ to go']], def: 'auto' },
      { key: 'music', type: 'switch', label: 'Music', small: 'A sunny driving tune while you play.', def: false },
      { key: 'shake', type: 'switch', label: 'Screen shake', small: 'The screen shakes when you bump or crash.', def: !reducedMotion }
    ],
    picker: { key: 'car', label: 'Choose your car', options: [['roadster', 'Roadster', 'Red · all-rounder'], ['gt', 'GT', 'Silver · fastest'], ['hatch', 'Hot hatch', 'Yellow · grippy']] },
    newWorld: function (speed, set) {
      set = set || {};
      R.shakeOn = set.shake !== false;
      return E.newWorld(speed, { car: set.car, pedal: touchy() ? 'auto' : set.pedal });
    },
    statKey: function (W) { return 'v' + W.diff; },
    hires: function () { return true; },
    step: E.step, hud: E.hud, draw: draw, sound: sound, frameAudio: frameAudio,
    quietSay: function () { return true; },
    overText: function (W) { return 'Time up – stage ' + W.stageNo + (W.round > 1 ? ', round ' + W.round : ''); },
    titleText: 'Race along the coast before the clock runs out. Each <b>checkpoint</b> gives you more time, and at every <b>fork</b> you choose your road &mdash; the Purbeck Hills or the New Forest, then the Jurassic Coast, Poole Harbour by night or the Needles.',
    keysText: '<b>&larr; &rarr;</b> steer &middot; <b>Space</b> boost &middot; <b>&darr;</b> brake (steer as well to drift) &middot; <b>P</b> pause',
    touchText: '<b>&#9664; &#9654;</b> steer &middot; <b>Boost</b> &middot; <b>Brake</b> (hold with a turn to drift) &mdash; the car goes by itself',
    help: [
      '<b>The aim:</b> drive as far as you can before the clock runs out. Each stretch of road ends at a <b>checkpoint</b> that adds time. Reach the <b>goal</b> after three stretches for a time bonus, then go round again &mdash; busier and quicker.',
      '<b>Steer</b> with the <b>&larr; &rarr;</b> arrow keys (or A and D). The car accelerates by itself; press <b>&darr;</b> (or S) to brake. In Settings you can choose to hold <b>&uarr;</b> to go instead.',
      '<b>Forks:</b> at the end of each stretch the road splits &mdash; keep to the <b>left</b> or the <b>right</b> half to choose where you go next. The map in the bottom corner shows your way. Don&rsquo;t hit the sign in the middle!',
      '<b>Bends</b> pull the car outwards &mdash; the faster you go, the harder. Ease off for the sharp ones (the black and white arrows warn you), or <b>drift</b>: hold <b>&darr;</b> while steering at speed and the car slides round, filling your boost.',
      '<b>Boost:</b> hold <b>Space</b> (or Shift, B or X, or the mouse button) for a burst of speed while the blue bar lasts. Fill it by passing cars closely (<b>near misses</b>), sitting in a car&rsquo;s <b>slipstream</b>, drifting, collecting coins and picking up blue <b>N</b> nitro bottles.',
      '<b>Coins</b> lie on the road in lines &mdash; get every coin in a line for a bonus. <b>Near misses</b> one after another score more each time.',
      '<b>Bumps:</b> running into the back of a car slows you right down; hitting a lamp post, palm tree or sign at speed spins you off (on Gentle you just bounce off). Bushes and beach umbrellas only slow you a little. The grass and sand slow you too.',
      '<b>Start:</b> hold boost as the lights turn green for a flying start. <b>Gentle</b> gives you more time and less traffic. <b>P</b> pauses; the game also pauses itself if you click away.'
    ]
  });
})();
