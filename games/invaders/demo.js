/* 365 Invaders - the DEMO (9 Oct 2026; plan: "the game must be able to film itself"). On the title screen the pilot
 * (pilot.js) plays the game behind the title card - no sound, a new game when one ends - and in the 3D look a director
 * cuts between camera shots: the wide view, low behind the ship, close on the formation, chasing a diver, close on the
 * Mothership when its guns go, and now and then the REBOOT swing to flat and back. With reduced motion it plays with
 * the standard view only. Nothing here touches the cabinet (arcade.js): the game steps its own title-screen world.
 *
 * ?director=1 is for filming: no title card, a chosen game (&seed= &speed= &skill= &style=retro &wave=), the camera cuts, and
 * every sound the game makes logged in window.__evlog ({f: step, e: event}) so a capture can render the soundtrack.
 * window.InvDemo shows the director's state (shot, world) to capture scripts; &cuts=0 keeps the standard view; &shot=flyby
 * (or swarm, formation...) holds one shot for a capture. */
(function () {
  'use strict';
  var E = window.InvEngine, Pilot = window.InvPilot, Q = new URLSearchParams(location.search);
  if (!E || !Pilot) return;
  var DIRECTOR = Q.get('director') === '1', CUTS = Q.get('cuts') !== '0', HOLD = DIRECTOR ? Q.get('shot') : null, WIDE = DIRECTOR ? Q.get('wide') : null;   // (&wide=tall: a portrait capture's wide view)
  var REDUCED = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var STEP = 1000 / 60, PY = E.PY;
  var W0 = null, pilot = null, acc = 0, lastT = 0, overAt = 0, step = 0;
  if (DIRECTOR) {
    window.__evlog = [];
    var st = document.createElement('style');   // nothing over the picture but the game's own scores
    st.textContent = '#ov_title,#ov_paused,#ov_over,#toast,#inv3dBtn{display:none!important}';
    document.head.appendChild(st);
  }

  // ---------------------------------------------------------------- the title screen's game
  function renew(W) {   // a fresh game in the same world object (the cabinet keeps hold of it)
    var speed = DIRECTOR && Q.get('speed') ? +Q.get('speed') : W.speed;
    var style = DIRECTOR && Q.get('style') === 'retro' ? 'classic' : W.enh ? 'enh' : 'classic';
    var seed = DIRECTOR && Q.get('seed') && !overAt ? +Q.get('seed') : null;
    var F = E.newWorld(speed, seed, style);
    Object.keys(W).forEach(function (k) { delete W[k]; });
    Object.assign(W, F);
    if (DIRECTOR && Q.get('wave') && !overAt) { W.wave = Math.max(1, +Q.get('wave')) - 1; E.nextWave(W); }   // (&wave=: start further in)
    W.attract = true;   // (the pictures treat it as a real game: wave arrivals, explosions)
    var sk = DIRECTOR && Q.get('skill') ? +Q.get('skill') : 1;
    pilot = Pilot.create(E, { skill: sk, seed: (seed || (Math.random() * 1e9) | 0) * 7 + 3 });
    acc = 0; overAt = 0; step = 0; dirReset();
  }
  function frame(W, t, mode) {
    if (mode !== 'title' || !W) { if (window.Inv3D) window.Inv3D.cam = null; return null; }
    if (W !== W0) { W0 = W; renew(W); lastT = t; overAt = 0; }
    var dt = Math.max(0, Math.min(100, t - lastT)); lastT = t; acc += dt;
    for (var n = 0; acc >= STEP && n < 4; n++) {
      acc -= STEP;
      if (W.over) { if (!overAt) overAt = t; if (t - overAt > 2500) { renew(W); overAt = 0; } continue; }
      E.step(W, pilot.step(W)); step++;
      if (DIRECTOR) for (var i = 0; i < W.events.length; i++) window.__evlog.push({ f: step, e: W.events[i] });
      W.events.length = 0;   // (the title screen stays quiet; the director logs them)
    }
    if (acc > STEP * 4) acc = 0;
    direct(W, t);
    return DIRECTOR ? 'play' : 'title';   // (the director's film gets the screen shake)
  }

  // ---------------------------------------------------------------- the director
  var D = { shot: 'wide', since: 0, until: 0, data: null, seen: 0, nextSwing: 0, swingBack: 0, cam: null, n: 0 };
  function dirReset() { D.shot = 'wide'; D.since = 0; D.until = 0; D.data = null; D.cam = null; D.nextSwing = 0; D.swingBack = 0; }
  var ROTA = ['wide', 'hero', 'wide', 'formation', 'wide', 'flyby'];
  function formationCentre(W) {
    var n = 0, x = 0, y = 0;
    W.invaders.forEach(function (v) { if (v.alive && !v.dv) { n++; x += v.x + 6; y += v.y + 4; } });
    return n ? { x: x / n, y: y / n, n: n } : null;
  }
  var SHOT = {   // each returns the camera for the moment, or null when the shot no longer makes sense
    wide: function () { return null; },
    hero: function (W) { return { zoom: 1.4, fx: W.player.x + 6.5, fy: 135, pitch: 0.3, yaw: (W.player.x - 104) / 104 * -0.12 }; },
    formation: function (W, t) { var c = formationCentre(W); if (!c || c.n < 6) return null; return { zoom: 2.0, fx: c.x, fy: c.y, pitch: -0.05, yaw: 0.28 * Math.sin(t / 2600) }; },
    spot: function (W, t, d) { return { zoom: 2.3, fx: d.x, fy: d.y, pitch: 0.05, yaw: d.side * 0.3 }; },
    tall: function () { return { zoom: 0.84, fx: 112, fy: 116, pitch: 0.05, yaw: 0 }; },   // (a portrait capture: pulled back to the whole formation)
    diver: function (W, t, d) {
      var v = d && d.v;
      if (!v || !v.alive || !v.dv || v.dv.ph === 'back' || v.dv.entry) { v = null; W.invaders.forEach(function (q) { if (!v && q.alive && q.dv && !q.dv.entry && (q.dv.ph === 'peel' || q.dv.ph === 'dive')) v = q; }); if (d) d.v = v; }   // (held for a capture: whichever is diving)
      if (!v) return null; var p = E.pos(v); return { zoom: 2.1, fx: p.x + 6, fy: Math.min(p.y + 4, 175), pitch: 0.12, yaw: -0.3 * v.dv.side }; },
    boss: function (W, t) { var B = W.boss; if (!B || (B.dead && B.dead < 20)) return null; return { zoom: 2.4, fx: B.x + 24, fy: B.y + 16, pitch: -0.12, yaw: 0.22 * Math.sin(t / 1800) }; },
    laser: function (W) { var b = W.beam; if (!b) return null; return { zoom: 1.75, fx: b.x + 0.5, fy: (b.top + PY) / 2, pitch: 0.25, yaw: (b.x - 104) / 104 * -0.3 }; },
    // the swarm (10 Oct 2026; owner: "a cinematic shot ... flying past the aliens with their thrusters going"): ride in with
    // one of a wave as it streams in; and the fly-by - low under the formation, looking up into its fire, sweeping across
    swarm: function (W, t, d) {   // (11 Oct: framing the whole stream, following it slowly, drifting - not chasing ship to ship)
      var n = 0, x = 0, y = 0;
      W.invaders.forEach(function (q) { var e = q.dv; if (q.alive && e && e.ph === 'enter' && e.t > 0 && e.x > -6 && e.x < 210 && e.y > 0) { n++; x += e.x + 6; y += e.y + 4; } });
      if (!n) return null;
      x /= n; y = Math.min(y / n, 160); d = d || {};
      if (d.cx == null) { d.cx = x; d.cy = y; } else { d.cx += (x - d.cx) * 0.035; d.cy += (y - d.cy) * 0.035; }
      var u = (t - D.since) / 1000;
      return { zoom: 1.75 + 0.06 * Math.min(u, 5), fx: d.cx, fy: d.cy, pitch: 0.2, yaw: 0.26 * Math.sin(u * 0.55 + 0.6) };
    },
    flyby: function (W, t) {
      var c = formationCentre(W); if (!c || c.n < 6) return null;
      var k = Math.min(1, (t - D.since) / 5200), e = k * k * (3 - 2 * k), sd = D.n % 2 ? -1 : 1;   // (each pass the other way)
      return { zoom: 2.45, fx: c.x + (e - 0.5) * 96 * sd, fy: c.y + 7, pitch: 0.44, yaw: (0.6 - 1.2 * e) * sd };
    },
    flyer: function (W, t, d) {   // the bonus stage: ride along with one of the flyers
      var v = d && d.v; if (!v || !v.alive || !v.dv || !v.dv.on || v.dv.y < 10 || v.dv.y > 195) { v = null; W.invaders.forEach(function (q) { if (!v && q.alive && q.dv && q.dv.on && q.dv.y > 30 && q.dv.y < 170) v = q; }); if (d) d.v = v; }
      if (!v) return null;
      return { zoom: 1.85, fx: v.dv.x + 6, fy: v.dv.y + 4, pitch: 0.1, yaw: (v.dv.vx || 0) > 0 ? -0.3 : 0.3 };
    }
  };
  function cut(name, t, ms, data) { D.shot = name; D.since = t; D.until = t + ms; D.data = data || null; D.n++; D.snap = true; }
  function direct(W, t) {
    var I = window.Inv3D;
    if (!I) return;
    if (!CUTS || (REDUCED && !DIRECTOR) || !W.enh) { I.cam = null; return; }
    if (HOLD && SHOT[HOLD]) {   // (a capture holding one shot: it starts again whenever it runs out)
      if (D.shot !== HOLD || (SHOT[HOLD](W, t, D.data) === null && t - D.since > 400) || (HOLD === 'flyby' && t - D.since > 5600)) cut(HOLD, t, 1e9, {});
      var hw = SHOT[HOLD](W, t, D.data) || (WIDE && SHOT[WIDE] ? SHOT[WIDE](W, t) : null);
      if (hw && D.cam && !D.snap) ['zoom', 'fx', 'fy', 'yaw', 'pitch'].forEach(function (k) { D.cam[k] += ((hw[k] || 0) - (D.cam[k] || 0)) * 0.12; }); else D.cam = hw ? Object.assign({}, hw) : null;
      D.snap = false; I.cam = D.cam; return;
    }
    if (!D.until) { D.until = t + 5000; D.since = t; D.nextSwing = t + 22000; }
    // the REBOOT swing: to flat, a breath, and back into 3D
    if (I.target > 0.5 && t > D.nextSwing && !W.boss && W.phase === 'play') { I.set(0); D.swingBack = t + 2600; cut('wide', t, 4000); }
    if (D.swingBack && t > D.swingBack) { I.set(1); D.swingBack = 0; D.nextSwing = t + 30000; }
    // what just happened decides the next cut (the fx list is still full: the pictures use it up after this)
    var since = t - D.since, busy = D.shot === 'boss' && t < D.until;
    for (var i = 0; i < W.fx.length && !D.swingBack; i++) {
      var f = W.fx[i];
      if (f.k === 'bosspart' || f.k === 'coreopen' || f.k === 'rage') cut('boss', t, 3600);
      else if (f.k === 'bossdie') cut('boss', t, 4200);
      else if (f.k === 'wave' && f.boss) cut('boss', t, 5000);
      else if (f.k === 'wave' && W.entering) cut('swarm', t, 4600, {});   // (a wave flying in: ride in with it)
      else if (f.k === 'wave') cut('wide', t, 4000);
      else if (f.k === 'die') cut('wide', t, 2500);
      else if (f.k === 'raycharge') cut('boss', t, 4600);   // (11 Oct 2026: its beam - close on it while it charges and sweeps)
      else if (f.k === 'escorts' && !busy && since > 1200) cut('swarm', t, 3200, {});   // (its escorts streaming out: ride with them)
      else if (busy || since < 1500) continue;
      else if (f.k === 'dive') { var v = null; W.invaders.forEach(function (q) { if (q.alive && q.dv && q.dv.ph === 'peel' && q.dv.t < 4) v = q; }); if (v) cut('diver', t, 3400, { v: v }); }
      else if (f.k === 'split') cut('spot', t, 2400, { x: f.x, y: f.y, side: f.x < 112 ? 1 : -1 });
      else if (f.k === 'collect' && f.kind === 'laser') cut('laser', t, 3500);
    }
    if (W.boss && D.shot === 'wide' && t > D.until && !D.swingBack) cut('boss', t, 4000);
    var want = SHOT[D.shot](W, t, D.data);
    if ((want === null && D.shot !== 'wide') || t > D.until) {   // the shot is over (or no longer makes sense): the next in the rota
      var next = W.stage ? (D.shot === 'flyer' ? 'wide' : 'flyer') : ROTA[D.n % ROTA.length];
      cut(next, t, next === 'wide' ? 4500 : 3800, next === 'flyer' ? {} : null);
      want = SHOT[D.shot](W, t, D.data);
      if (want === null && D.shot !== 'wide') { cut('wide', t, 4000); want = null; }
    }
    // a cut is a cut; within a shot the camera follows smoothly and slowly pushes in
    if (!want && WIDE && SHOT[WIDE]) want = SHOT[WIDE](W, t);
    if (want) want.zoom *= 1 + 0.035 * Math.min(1, (t - D.since) / 4000);
    if (want && want.fy != null && !DIRECTOR) want.fy += 0.6 * 128 / want.zoom;   // (on the title screen the card covers the middle: frame the action above it)
    if (D.snap || !want || !D.cam) D.cam = want ? Object.assign({}, want) : null;
    else ['zoom', 'fx', 'fy', 'yaw', 'pitch'].forEach(function (k) { D.cam[k] += ((want[k] || 0) - (D.cam[k] || 0)) * 0.12; });
    D.snap = false;
    I.cam = D.cam;
  }

  window.InvDemo = { frame: frame, director: D, get world() { return W0; }, get step() { return step; }, DIRECTOR: DIRECTOR };
})();
