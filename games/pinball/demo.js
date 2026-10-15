/* 365 Pinball Hero - the attract mode (15 Oct 2026, milestone 2a). On the title screen the table plays itself behind the
 * title card: the pilot (pilot.js) plays a real game on the cabinet's own title-screen world at 60 steps a second of real
 * time, the effects (fx.js) see every step's events, and the lamps run their attract show (lamps.js, mode 'title') on top.
 * It is silent - the cabinet only plays sounds in play - and the events are cleared here after the effects have seen them.
 * When the demo game ends (or after about 90 seconds, at the next quiet moment) a fresh demo game starts IN PLACE: the
 * cabinet holds on to the world object, so it is emptied and refilled, never replaced, and W.demo stays true.
 *
 * pinball.js's draw calls mode = PinDemo.frame(W, t, mode) || mode every frame. Outside the title screen it does nothing
 * and returns null. Plain ES5; needs PinEngine and PinPilot (PinFX is used if it is there). */
(function () {
  'use strict';
  var E = window.PinEngine, Pilot = window.PinPilot;
  if (!E || !Pilot) return;
  var STEP = 1000 / 60, MAXRUN = 90000, HARD = 105000, OVERWAIT = 2500;
  var W0 = null, acc = 0, lastT = -1, startT = 0, overAt = 0, games = 0;

  function renew(W, t) {   // a fresh demo game in the same world object
    games++;
    var F = E.newWorld(W.speed || 1, null, 1 + ((games * 7919 + (Date.now() % 100000)) % 2147483000));
    Object.keys(W).forEach(function (k) { delete W[k]; });
    Object.assign(W, F);
    W.demo = true;
    startT = t; overAt = 0; acc = 0;
  }
  function quiet(W) {   // a good moment to cut to a new game: the ball waiting on the plunger, or the bonus counting
    if (W.state === 'bonus') return true;
    var b = W.balls.length === 1 ? W.balls[0] : null;
    return !!b && b.x > E.TABLE.shooter.x0 && b.y > 380;
  }

  function frame(W, t, mode) {
    if (mode !== 'title' || !W) { W0 = null; lastT = -1; return null; }
    if (W !== W0) { W0 = W; startT = t; overAt = 0; acc = 0; lastT = t; if (W.over || W.frame > 0) renew(W, t); W.demo = true; }
    var dt = Math.max(0, Math.min(100, t - lastT)); lastT = t; acc += dt;
    for (var n = 0; acc >= STEP && n < 4; n++) {
      acc -= STEP;
      if (W.over) {
        if (!overAt) overAt = t;
        if (t - overAt > OVERWAIT) { renew(W, t); if (window.PinFX) try { window.PinFX.events(W, []); } catch (e) {} }
        continue;
      }
      if (t - startT > HARD || (t - startT > MAXRUN && quiet(W))) { renew(W, t); continue; }
      E.step(W, Pilot.input(W));
      if (W.events.length && window.PinFX) { try { window.PinFX.events(W, W.events); } catch (e) {} }
      W.events.length = 0;   // (the title screen stays quiet)
    }
    if (acc > STEP * 4) acc = 0;   // a slow PC (or a hidden tab coming back): drop the backlog
    return mode;
  }

  window.PinDemo = { frame: frame, version: 1, get games() { return games; } };
})();
