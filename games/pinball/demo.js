/* 365 Pinball Hero - the attract mode (15 Oct 2026, milestone 2a; Ember Peak and the camera director, 16 Oct 2026). On
 * the title screen the table plays itself behind the title card: the pilot (pilot.js) plays a real game on the
 * cabinet's own title-screen world at 60 steps a second of real time, the effects (fx.js) see every step's events, and
 * the lamps run their attract show (lamps.js, mode 'title') on top. It is silent - the cabinet only plays sounds in
 * play - and the events are cleared here after the effects have seen them.
 *
 * With the arcade camera (camera.js, window.PinCam) the title screen is the camera's Director: PinCam.update(W, t,
 * 'title') chases the bot's ball, and between the bot's games this file flies the camera over the table - a
 * flythrough of a few seconds, from high over the volcano's crater, round it and down across the island to the
 * flippers (PinDemo.shot(t, aspect) gives the pose while one is running, else null; pinball.js hands it to the 3D
 * picture in place of the camera's own). One flies when the title screen first shows, and again before each new demo
 * game. The world is not stepped during a flythrough (the new game's ball waits on the plunger).
 *
 * When the demo game ends (or after about 90 seconds, at the next quiet moment) a fresh demo game starts IN PLACE: the
 * cabinet holds on to the world object, so it is emptied and refilled, never replaced, and W.demo stays true. The
 * camera's slow motion (the director may ask for some) is honoured: frame(W, t, mode, timeScale).
 *
 * pinball.js's draw calls mode = PinDemo.frame(W, t, mode, timeScale) || mode every frame. Outside the title screen
 * it does nothing and returns null. Plain ES5; needs PinEngine and PinPilot (PinFX and PinCam are used if there). */
(function () {
  'use strict';
  var E = window.PinEngine, Pilot = window.PinPilot;
  if (!E || !Pilot) return;
  var STEP = 1000 / 60, MAXRUN = 90000, HARD = 105000, OVERWAIT = 2500, FLY = 7000;
  var COARSE = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
  var OPT = { tries: COARSE ? 12 : 46 };   // phones: fewer of the pilot's tries on a copy of the world each cradle
  var W0 = null, acc = 0, lastT = -1, startT = 0, overAt = 0, games = 0, flyAt = -1, flyFrom = null;

  function cam() { return window.PinCam && typeof window.PinCam.update === 'function' ? window.PinCam : null; }
  function renew(W, t) {   // a fresh demo game in the same world object
    games++;
    var F = E.newWorld(W.speed || 1, null, 1 + ((games * 7919 + (Date.now() % 100000)) % 2147483000), W.tableId);
    Object.keys(W).forEach(function (k) { delete W[k]; });
    Object.assign(W, F);
    W.demo = true;
    startT = t; overAt = 0; acc = 0;
  }
  function quiet(W) {   // a good moment to cut to a new game: the ball waiting on the plunger, or the bonus counting
    if (W.state === 'bonus') return true;
    var T = E.table ? E.table(W.tableId).T : E.TABLE, b = W.balls.length === 1 ? W.balls[0] : null;
    return !!b && b.x > T.shooter.x0 && b.y > T.shooter.tip - 60;
  }
  // (the flythrough keeps its own clock: the cabinet's first frame can come with t = 0)
  function clock() { return window.performance && performance.now ? performance.now() : Date.now(); }
  function fly(W) { if (cam()) { flyAt = clock(); flyFrom = W; } }   // (no camera: no flythrough)

  // ---------------------------------------------------------------- the flythrough: key poses from the table's own data
  function smoother(u) { u = u < 0 ? 0 : u > 1 ? 1 : u; return u * u * u * (u * (u * 6 - 15) + 10); }
  function keys(W, aspect) {
    var T = E.table ? E.table(W.tableId).T : E.TABLE, C = cam(), H = null;
    try { H = C.home(aspect, W.tableId); } catch (e) { H = null; }
    if (!H) H = { cx: T.W / 2, cy: T.H * 0.55, span: T.W + 20, tilt: 28, yaw: 0, fov: 32 };
    var V = T.volcano || (T.saucer ? { x: T.saucer.x, y: T.saucer.y } : { x: T.W / 2, y: 120 });
    return [
      { cx: V.x + 6, cy: V.y + 18, span: 110, tilt: 54, yaw: -28, fov: 32, at: 0 },
      { cx: V.x + 24, cy: V.y + 46, span: 140, tilt: 48, yaw: 22, fov: 32, at: 0.3 },
      { cx: T.W / 2, cy: T.H * 0.5, span: 210, tilt: 38, yaw: 8, fov: 32, at: 0.65 },
      { cx: H.cx, cy: H.cy, span: H.span, tilt: H.tilt, yaw: H.yaw || 0, fov: H.fov || 32, at: 1 }
    ];   // the lens too, so the flight lands exactly on home (30 Oct 2026: calm/arcade's home is fov 26/24 now)
  }
  function shot(t, aspect) {
    if (flyAt < 0 || !flyFrom || !cam()) return null;
    var u = (clock() - flyAt) / FLY;
    if (u >= 1 || u < 0) { flyAt = -1; return null; }
    var K = keys(flyFrom, aspect || 0.55), i = 1;
    while (i < K.length - 1 && K[i].at < u) i++;
    var a = K[i - 1], b = K[i], f = smoother((u - a.at) / (b.at - a.at)), o = { timeScale: 1, state: 'fly', fly: u };
    ['cx', 'cy', 'span', 'tilt', 'yaw', 'fov'].forEach(function (k) { o[k] = a[k] + (b[k] - a[k]) * f; });
    try { o.zoom = cam().home(aspect, flyFrom.tableId).span / o.span; } catch (e) { o.zoom = 1; }
    return o;
  }

  function frame(W, t, mode, ts) {
    if (mode !== 'title' || !W) { W0 = null; lastT = -1; flyAt = -1; return null; }
    if (W !== W0) { W0 = W; startT = t; overAt = 0; acc = 0; lastT = t; if (W.over || W.frame > 0) renew(W, t); W.demo = true; fly(W); }
    var dt = Math.max(0, Math.min(100, t - lastT)); lastT = t;
    if (flyAt >= 0 && clock() - flyAt < FLY) return mode;   // flying: the world waits
    if (flyAt >= 0) { flyAt = -1; startT = t; acc = 0; }
    acc += dt * (ts > 0 && ts < 1 ? ts : 1);
    for (var n = 0; acc >= STEP && n < 4; n++) {
      acc -= STEP;
      if (W.over) {
        if (!overAt) overAt = t;
        if (t - overAt > OVERWAIT) { renew(W, t); if (window.PinFX) try { window.PinFX.events(W, []); } catch (e) {} fly(W); break; }
        continue;
      }
      if (t - startT > HARD || (t - startT > MAXRUN && quiet(W))) { renew(W, t); fly(W); break; }
      E.step(W, Pilot.input(W, OPT));
      if (W.events.length && window.PinFX) { try { window.PinFX.events(W, W.events); } catch (e) {} }
      W.events.length = 0;   // (the title screen stays quiet)
    }
    if (acc > STEP * 4) acc = 0;   // a slow PC (or a hidden tab coming back): drop the backlog
    return mode;
  }

  window.PinDemo = { frame: frame, shot: shot, version: 2, get games() { return games; }, get flying() { return flyAt >= 0; } };
})();
