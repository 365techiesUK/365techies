// PIER SURF - the controller main.js talks to (26 Sep 2026, stage 1: paddle out, duck-dive,
// catch, ride). Same shape as src/dolphinwatch/mode.js: one place owns enter/exit, everything
// it changes is saved and put back, and main.js holds three fenced hooks - initSurfer(ctx),
// S.tick() after each fixed step and S.frame(cam) after the GL scene.
//
// The tenth level: in the picker (last), and at ?mode=surfer. The 27 Sep 2026 revamp (tmp-audit/,
// the lead's plan) works through it in stages - stage 1, "really easy to play", is the prompts,
// the press buffer (surfboard.js popVerdict) and the paddle-back arrow below.
//
// Where: the EAST bank beside Bournemouth Pier (sea-surf.js ZONE_O +72), the side the local
// guides call the favourite. The waves are the sea's own shoaling train, not a spawner: this
// file only reads them to put the words on screen.
//
// Rules of tone (SPEC-SURF.md, gl/surfers.js): nobody is in danger, a wipeout is a tumble and a
// climb back on, nothing is branded, and the real beach's history is not mentioned.

import { SURF, surfSample, makeSurfSlot, shoreCoords, setFactor, fadeShift } from '../sea-surf.js';
import { DIR as PIER_DIR } from '../gl/pier.js';
import { PRONE, DUCK, RIDE, WIPE } from '../boats/surfboard.js';
import { SurferHud } from './surfer-hud.js';
import { createReplay } from './replay.js';

const OTHER_MODES = ['rescue', 'raid', 'smuggle', 'stunt', 'overboard', 'dolphins'];
export const SURFRUN = {
  waves: 3,          // rides to win
  rideMin: 3.0,      // s standing for a ride to count
  side: 1,           // +1 east bank
  o: 66,             // m alongshore from the pier centreline
  inside: 38,        // m inside the break onset to start: a few lines of whitewater to get through
  // ...but the FIRST run of a visit starts nearer (27 Sep 2026, stage 1): a first-timer's first ride
  // came at a median 71 s, most of it paddling out through 38 m of whitewater (tmp-audit/ease/novice.mjs).
  // Still one line of whitewater to duck-dive: the lesson stays, the wait goes.
  insideFirst: 18,
  surf: 1.0,         // the default size, 1.15 m over the bank
  endSec: 4,
};

// What the level calls out as a ride's multiplier climbs (surfboard.js RIDE_PTS: at 5, 10, 15 s).
export const RIDE_CALL = { 2: '×2  NICE RIDE', 3: '×3  LONG RIDE!', 4: '×4  EPIC RIDE!' };

// Pier space <-> world, as gl/surfers.js does it.
const D0 = PIER_DIR[0], D1 = PIER_DIR[1];
function toWorld(s, o, out) { out[0] = s * D0 + o * D1 - 230; out[1] = s * D1 - o * D0 - 300; return out; }
const _w = [0, 0], _sc = {};
export function worldAt(d, o, out) {
  let s = d + 38;
  for (let i = 0; i < 8; i++) { toWorld(s, o, _w); shoreCoords(_w[0], _w[1], _sc); s += d - _sc.d; }
  return toWorld(s, o, out);
}
// THE NEXT SET (27 Sep 2026, stage 1): seconds until the set envelope is up again, from the same
// closed form the sea uses (setFactor) - 0 while a set is running. For "next set in N s".
export function nextSetIn(t, level = 0.8) {
  if (setFactor(t) >= level) return 0;
  for (let k = 1; k <= 240; k++) if (setFactor(t + k * 0.5) >= level) return k * 0.5;
  return null;
}
// The set-peak time, found from the real clock (gl/surfers.js T_SET_PEAK does the same).
const T_PEAK = (() => { let bt = 0, bv = -1; for (let t = 0; t < 1000; t += 0.5) { const v = setFactor(t); if (v > bv) { bv = v; bt = t; } } return bt; })();
// Outermost d in this column that breaks at the set peak: where the whitewater starts.
export function onsetAt(o, ctl) {
  const slot = makeSurfSlot(), p = [0, 0];
  for (let d = SURF.D_FADE1 + fadeShift(ctl) - 1; d > 8; d -= 2) {   // + the big day's reach
    worldAt(d, o, p);
    surfSample(p[0], p[1], T_PEAK, 0, ctl, slot);
    if (slot.brk > 0) return d;
  }
  return 60;
}

export function initSurfer(ctx) {
  const { sim, seaGL } = ctx;
  const q = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
  const isCal = q.has('cal');
  const mount = (typeof document !== 'undefined' && (document.querySelector('#stagewrap') || document.body)) || null;
  const S = {
    active: false, hud: null, runs: 0, lastSimTick: 0, prevCraft: null, prevSurf: null,
    run: null, onset: 0, arrow: null,
    get game() { return S.run; },
  };
  const probe = makeSurfSlot();
  // THE INSTANT REPLAY (surfer/replay.js): every ride recorded, offered back after it ends, and the
  // run's best one kept for the summary card. The hub asks it for the frame while one plays.
  const RP = createReplay({ sim, hub: () => ctx.craft, mount });
  S.replay = RP;

  const board = () => (ctx.craft && ctx.craft.hulls ? ctx.craft.hulls.surfboard : null);
  const tboost = () => (typeof document !== 'undefined' ? document.getElementById('tboost') : null);
  S.tbLabel = null;

  function spawn() {
    const ctl = sim.sea ? sim.sea.surfCtl : 1;
    S.onset = onsetAt(SURFRUN.o * SURFRUN.side, ctl);
    const p = worldAt(Math.max(24, S.onset - (S.runs === 0 ? SURFRUN.insideFirst : SURFRUN.inside)), SURFRUN.o * SURFRUN.side, [0, 0]);
    sim.startX = p[0]; sim.startZ = p[1];
    sim.startHeading = Math.PI / 2;          // seaward: +Z is offshore here
  }

  function newRun(brief) {
    S.run = { phase: 'live', t: 0, waves: 0, goal: SURFRUN.waves, best: 0, bestPts: 0, score: 0, rides: [], ducks: 0, ducksClean: 0, washed: 0, wipes: 0, early: 0, events: [], endT: 0, lastCrest: -1 };
    S.runs++;
    RP.reset();
    if (S.hud) { S.hud.hideOver(); if (brief) S.hud.showIntro(); }
  }

  function leaveOthers() {
    if (typeof window === 'undefined') return;
    for (const k of ['efoilRaid', 'efoilSmuggle', 'efoilStunt', 'efoilOverboard', 'efoilWatch']) {
      const M = window[k]; if (M && M.active && M.exit) M.exit();
    }
    const Q = window.efoilRescue;
    if (Q && Q.active && typeof document !== 'undefined') { const b = document.querySelector('#rq-over [data-a=exit]'); if (b) b.click(); }
  }

  function enter() {
    if (S.active || isCal) return;
    if (!board()) { if (ctx.toast) ctx.toast('the surfboard is not in this build'); return; }
    leaveOthers();
    if (!S.hud && mount) S.hud = new SurferHud(mount, { onAgain: again, onExit: () => exit(), onReplay: () => RP.play(RP.best) });
    if (ctx.craft) ctx.craft.replay = RP;
    S.active = true;
    { const tb = tboost(); S.tbLabel = tb ? tb.innerHTML : null; }
    if (typeof document !== 'undefined') document.body.classList.add('surfer');
    if (ctx.setSea) ctx.setSea(ctx.defaultSea);
    // The waves have to be on. Put the player's own setting back on the way out.
    if (sim.sea && sim.setSurfSize) { S.prevSurf = sim.sea.surfCtl; if (!(sim.sea.surfCtl >= 0.7)) sim.setSurfSize(SURFRUN.surf); }
    spawn();
    const c = ctx.craft;
    if (c) { S.prevCraft = c.kind; if (c.kind !== 'surfboard') c.select('surfboard', true); }
    if (ctx.takeInput) ctx.takeInput(null);
    newRun(true);
    if (ctx.restart) ctx.restart();
    S.lastSimTick = sim.tick;
    globalThis.__modeCraftSwitch = false;
    // THROUGH YOUR OWN EYES from the start (the owner, 26 Sep: "start the game where you're actually
    // on the board and the camera is where your eyes are"). C / the view bar still change it.
    S.prevCam = ctx.getCamera ? ctx.getCamera() : null;
    if (ctx.setCamera) ctx.setCamera('fpv');
    // The mouse steers, paddles and dives (input.js SURF_MOUSE) while the level is on.
    if (ctx.live) { ctx.live.surf = true; ctx.live.lockX = 0; }
  }

  function exit(quiet) {
    if (!S.active) return;
    S.active = false;
    RP.reset();
    const tb = tboost(); if (tb && S.tbLabel !== null) tb.innerHTML = S.tbLabel;
    if (tb) { tb.classList.remove('sf-go'); tb.classList.remove('sf-wait'); }
    if (typeof document !== 'undefined') { for (const c of ['surfer', 'sf-riding', 'sf-warn', 'pad']) document.body.classList.remove(c); }
    if (S.hud) { S.hud.hideOver(); S.hud.hideIntro(); }
    if (quiet === true) return;
    if (S.prevSurf !== null && sim.setSurfSize) sim.setSurfSize(S.prevSurf);
    sim.startX = 0; sim.startZ = 0; sim.startHeading = 0;
    if (ctx.setSea) ctx.setSea(ctx.defaultSea);
    if (ctx.takeInput) ctx.takeInput(null);
    const c = ctx.craft;
    if (c) c.select(S.prevCraft && S.prevCraft !== 'surfboard' ? S.prevCraft : 'efoil', true);
    if (ctx.restart) ctx.restart();
    globalThis.__modeCraftSwitch = false;
    if (ctx.setCamera && S.prevCam) ctx.setCamera(S.prevCam);
    if (ctx.live) { ctx.live.surf = false; ctx.live.lockX = 0; }
  }

  function again() {
    newRun();
    spawn();
    if (ctx.restart) ctx.restart();
    S.lastSimTick = sim.tick;
  }

  // ---- what just happened on the board, turned into words -----------------------------------
  function consume(B) {
    const r = S.run, hud = S.hud;
    for (const e of B.events) {
      switch (e.type) {
        case 'duck': r.ducks++; break;
        case 'duck_clean': r.ducksClean++; if (hud) hud.pop('CLEAN DUCK-DIVE'); break;
        // A wash just after a duck-dive came up is a dive that went too soon - say so (stage 1).
        case 'washed': r.washed++; if (hud) hud.pop(e.early ? 'TOO EARLY - you came up before it' : 'CAUGHT INSIDE', 'bad'); break;
        case 'early': r.early++; if (hud) hud.pop('TOO EARLY - keep paddling', 'bad'); break;
        case 'back_on': if (hud) hud.pop('BACK ON - paddle out'); break;
        case 'pearl': if (hud) hud.pop(e.why === 'falls' ? 'OVER THE FALLS - too late' : 'PEARLED - too late, nose under', 'bad'); break;
        case 'popup': if (hud) hud.pop('UP AND RIDING!'); break;
        case 'carve': if (hud) hud.pop(`${e.n > 1 ? `CARVE x${e.n}` : 'CARVE!'}  +${e.pts}`); break;
        // The multiplier climbing is the ride getting better: say so, the moment it does.
        case 'ride_mult': if (hud) hud.pop(RIDE_CALL[e.mult] || `×${e.mult}`, 'mult'); break;
        case 'wipe': r.wipes++; break;
        case 'ride_end': {
          // ONE WAVE COUNTS ONCE (stage 1): standing up again on the same face after a kick-out is the
          // same wave (surfboard.js ride.crest) - the level was won 10 s after the first pop-up that way.
          const again = e.crest !== undefined && e.crest === r.lastCrest;
          const ok = e.secs >= SURFRUN.rideMin && r.phase === 'live' && !again;
          if (again && e.secs >= SURFRUN.rideMin && hud) hud.pop('Same wave - catch a new one', 'bad');
          if (ok) r.lastCrest = e.crest;
          const bestBefore = r.rides.reduce((m, x) => (x.ok ? Math.max(m, x.score) : m), 0);
          r.rides.push({ secs: e.secs, dist: e.dist, top: e.top, carves: e.carves, score: e.score, mult: e.mult, kick: e.kickPts > 0, ok });
          if (e.secs > r.best) r.best = e.secs;
          if (ok) {
            r.waves++;
            r.score += e.score;
            if (e.score > r.bestPts) r.bestPts = e.score;
            const cv = e.carves ? ` · ${e.carves} ${e.carves === 1 ? 'carve' : 'carves'}` : '';
            const kk = e.kickPts > 0 ? ` · clean kick‑out +${e.kickPts}` : '';   // a non-breaking hyphen: it wrapped as 'kick- / out'
            const title = r.waves > 1 && e.score > bestBefore ? `BEST RIDE  +${e.score}` : `WAVE ${r.waves}  +${e.score}`;
            if (hud) hud.banner(title, `${e.secs.toFixed(1)} s up · ×${e.mult} · ${Math.round(e.dist)} m · top ${(e.top * 3.6).toFixed(0)} km/h${cv}${kk}`, 'good', 2800);
            if (r.waves >= SURFRUN.waves) { r.phase = 'won'; r.endT = r.t; if (hud) hud.banner('SURF’S UP', `${SURFRUN.waves} waves at the pier`, 'good', SURFRUN.endSec * 1000); }
          } else if (hud && e.why !== 'pier') {
            hud.pop(e.secs < 1 ? 'It rolled away' : `Short one - ${e.secs.toFixed(1)} s`, 'bad');
          }
          if (hud && e.why === 'pier') hud.pop('CLIPPED THE PIER', 'bad');
          // The clip is cut a couple of seconds from now, once the end of the ride is recorded too.
          RP.rideEnded({ popT: e.t - e.secs, endT: e.t, why: e.why, score: e.score, secs: e.secs, mult: e.mult, wave: r.waves, ok });
          break;
        }
        default: break;
      }
    }
    B.events.length = 0;
  }

  // ---- the one line of advice for right now ---------------------------------------------------
  function incomingAt(B, m) {
    // YOU ARE IN THE IMPACT ZONE: the water under you is breaking (brk depends on where you are,
    // not on the crest), and a crest is on its way to you. Checked FIRST, because a probe a few
    // metres out can be seaward of where the wave starts to break and see nothing coming -
    // MEASURED in the running game, 26 Sep: probe brk 0.06-0.16, board brk 0.70-0.90, and the
    // player was washed off with no warning at all.
    const w = B.wave;
    if (w.amp > 0.2 && w.brk > 0.5 && w.chi > (m > 6 ? -2.4 : -1.1) && w.chi < -0.05) return true;
    surfSample(B.x, B.z + m, sim.time, 0, sim.sea.surfCtl, probe);
    // brk 0.25, not 0.5: a wave that is only STARTING to break out there can be fully breaking by
    // the time it reaches you - that is exactly the peak - and it must still be warned about.
    return probe.brk > 0.25 && probe.chi > -1.4 && probe.chi < 0.2 && probe.amp > 0.2;
  }
  // ON A PHONE OR A TABLET (27 Sep 2026, the owner: "on the iPad ... there's no way of standing
  // up on the board ... it says press the space bar, but obviously a phone or an iPad don't have a
  // space bar"). The round button IS the space bar there - it always was - but every line below
  // named keys and mouse buttons, and the button said POP UP the moment a wave was under you,
  // before you were fast enough: tap it then and "too early" is all you get. So on a touch screen
  // the words name the touch controls, and the button only says POP UP when standing up will work.
  const touchUI = () => typeof document !== 'undefined' && document.body.classList.contains('touch');
  // The one test for "a pop-up now would stand you up" - the prompt and the button both use it, and
  // since stage 1 it IS the board's own verdict (surfboard.js popVerdict), so the cue can no longer
  // say POP UP to a press the board would pearl (22% of big-day cues did, tmp-audit/ease/window.mjs).
  const popReady = (B) => B.state === PRONE && B.popV === 'ok';
  // The names of the controls in use (stage 1): a gamepad player was told about SPACE and the mouse.
  const keyNames = () => (ctx.live && ctx.live.mode === 'gamepad'
    ? { pop: 'A', paddle: 'RT or stick up', steer: 'left stick' }
    : { pop: 'right click / SPACE', paddle: 'W / ↑', steer: 'A / D' });
  // WHERE WAVES COME (27 Sep 2026, stage 1). "Wait for a wave" used to be judged from the water under
  // you at this instant - true anywhere nothing was breaking, so after a ride that ended by the pier
  // or near the beach the level said WAIT where no wave would ever come (35 of 40 simulated quick
  // learners sat there ~200 s, tmp-audit/ease/stall.mjs). A good spot is on this bank, far enough
  // out, and where the set peak actually brings a wave (amplitude at the set-peak time).
  const spotSlot = makeSurfSlot(), spotSc = {};
  function goodSpot(B) {
    shoreCoords(B.x, B.z, spotSc);
    if (Math.abs(spotSc.o - SURFRUN.o * SURFRUN.side) >= 30 || spotSc.d <= 18) return false;
    surfSample(B.x, B.z, T_PEAK, 0, sim.sea.surfCtl, spotSlot);
    return spotSlot.amp >= 0.3;
  }
  // The take-off spot the arrow points to: just inside where the set peak starts to break (waiting at
  // onset - 4 m caught 68-71% of set waves against 53% at onset + 10, tmp-audit/ease/spot.mjs).
  // S.home() stays as it was - the suite's bots and the film drivers use it.
  S.peak = () => worldAt(S.onset - 4, SURFRUN.o * SURFRUN.side, [0, 0]);
  // A SET WAVE: the amplitude that is worth paddling for, 0.85 of the set peak's at the take-off spot,
  // so the big day scales itself.
  let gradeCtl = null, gradeA = 0.4;
  function gradeAmp() {
    const ctl = sim.sea.surfCtl;
    if (ctl !== gradeCtl) { const k = S.peak(); surfSample(k[0], k[1], T_PEAK, 0, ctl, spotSlot); gradeA = 0.85 * spotSlot.amp; gradeCtl = ctl; }
    return gradeA;
  }
  const bearingTo = (B, p) => { let a = Math.atan2(p[1] - B.z, p[0] - B.x) - B.heading; while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
  function advise(B) {
    const w = B.wave, facingIn = -Math.sin(B.heading) > 0.35, facingOut = Math.sin(B.heading) > 0.35;
    const T = touchUI(), K = keyNames();
    S.arrow = null;
    if (B.state === WIPE) return ['Off the board - climb back on…', 'warn'];
    if (B.state === DUCK) return ['Under it…', ''];
    if (B.state === RIDE) return [T ? 'RIDING - steer along the wave with your left thumb · KICK OUT to finish' : `RIDING - steer along the wave (${K.steer}) · ${K.pop} to kick out`, 'good'];
    // Whitewater coming at you. A real duck-dive starts one or two body lengths before it hits,
    // so the NOW cue looks 4 m seaward - about a second at the ~3 m/s the whitewater closes on a
    // paddler it is already slowing - and the early warning looks 11 m out.
    // Ready to stand up comes FIRST: facing the beach and carried fast enough, the whitewater behind
    // you is the wave you are catching, and "Whitewater behind you!" over a green POP UP button
    // told the player two things at once (the iPad run, 27 Sep).
    if (popReady(B)) return [T ? 'POP UP! (tap POP UP)' : `POP UP! (${K.pop})`, 'good'];
    // Fast enough but the face is still too steep: a press now would pearl - hold (it is held for you).
    if (B.popV === 'pearl') return [T ? 'HOLD - too steep, wait a moment' : 'HOLD - too steep, wait a moment', 'warn'];
    if (B._popHold > 0) return ['WAIT FOR IT…', 'good'];
    if (incomingAt(B, 4)) return facingOut ? [T ? 'DUCK DIVE NOW! (tap DUCK DIVE)' : `DUCK DIVE NOW! (${K.pop})`, 'warn'] : [T ? 'Whitewater behind you - keep paddling, let it push you' : 'Whitewater behind you - keep paddling, let it push you', 'warn'];
    if (facingOut && incomingAt(B, 11)) return ['Whitewater coming - wait for it… then duck-dive', 'warn'];
    if (facingIn && w.face && w.amp > 0.25) return [T ? 'PADDLE! (paddle strip) - it is lifting you' : `PADDLE! (${K.paddle}) - it is lifting you`, 'good'];
    const spot = goodSpot(B);
    // GRADE THE WAVE (stage 1): 10 m out, 2-3 s before it lifts you - the old PADDLE! came as it was
    // already lifting you, and for waves too small to carry anyone.
    if (facingIn && spot) {
      surfSample(B.x, B.z + 10, sim.time, 0, sim.sea.surfCtl, probe);
      if (probe.chi > -1.2 && probe.chi < -0.2 && probe.amp >= gradeAmp()) return [T ? 'SET WAVE - PADDLE NOW! (paddle strip)' : `SET WAVE - PADDLE NOW! (${K.paddle})`, 'good'];
      if (probe.chi > -1.2 && probe.chi < -0.2 && probe.amp > 0.25) return ['Small one - let it go, wait for the set', ''];
    }
    // Nowhere a wave will come: point the way back to the peak.
    if (!spot) {
      S.arrow = bearingTo(B, S.peak());
      return [T ? 'Paddle back to the peak - steer to the arrow and paddle' : `Paddle back to the peak - follow the arrow (${K.steer}, ${K.paddle})`, ''];
    }
    surfSample(B.x, B.z + 7, sim.time, 0, sim.sea.surfCtl, probe);
    const outside = w.brk < 0.02 && probe.brk < 0.02;
    if (outside && facingOut) return [T ? 'Outside the break - steer round to face the beach and wait for a wave' : `Outside the break - turn to the beach (${K.steer}) and wait for a wave`, ''];
    if (outside && facingIn) {
      const n = nextSetIn(sim.time);
      const when = n === 0 ? ' - the set is here' : n ? ` - next set in ${Math.ceil(n)} s` : '';
      return [T ? `Wait for a wave${when}. When one lifts you, paddle` : `Wait for a wave${when}. When one lifts you, paddle hard`, ''];
    }
    if (outside) return [T ? 'Keep turning to face the beach' : `Keep turning to face the beach (${K.steer})`, ''];
    if (facingOut) return [T ? 'Paddle out - duck-dive the whitewater (tap DUCK DIVE)' : `Paddle out (${K.paddle}) - duck-dive the whitewater (${K.pop})`, ''];
    return [T ? 'Steer round with your left thumb and paddle out to sea' : `Turn round and paddle out to sea (${K.steer})`, ''];
  }

  // ---- hooks main.js calls --------------------------------------------------------------------
  S.tick = function () {
    if (!S.run) return;
    if (typeof document !== 'undefined') {
      for (const k of OTHER_MODES) if (document.body.classList.contains(k)) { exit(true); return; }
    }
    if (sim.tick < S.lastSimTick) {
      if (globalThis.__modeCraftSwitch) globalThis.__modeCraftSwitch = false;
      else again();
    }
    S.lastSimTick = sim.tick;
    const c = ctx.craft;
    if (c && c.kind !== 'surfboard') {
      globalThis.__modeCraftSwitch = true;
      c.select('surfboard', true);
      if (ctx.toast) ctx.toast('PIER SURF is a surfboard level');
      S.lastSimTick = sim.tick;
      return;
    }
    const B = board();
    S.run.t += ctx.FIXED_DT;
    if (B && B.events.length) consume(B);
  };

  S.frame = function () {
    if (!S.run || !S.hud) return;
    const B = board();
    if (!B) return;
    // A replay on screen: the game is held, and none of the live HUD is showing.
    if (RP.playing()) return;
    RP.record(sim.time, B);
    const [msg, kind] = advise(B);
    S.hud.arrow = S.arrow;
    // The rules card names the controls in use: a gamepad gets its own line (surfer-hud.js li.pad).
    if (typeof document !== 'undefined') document.body.classList.toggle('pad', !!(ctx.live && ctx.live.mode === 'gamepad'));
    // A warning always shows. On a phone the REPLAY offer sits where the prompt goes, so while one
    // is up the offer steps aside for it (surfer/replay.js CSS) and comes back after, if still due.
    if (typeof document !== 'undefined') document.body.classList.toggle('sf-warn', kind === 'warn');
    S.hud.update(S.run, B, msg, kind);
    // THE BIG TOUCH BUTTON says what it will do right now (it is SPACE on a phone).
    const tb = tboost();
    if (tb) {
      const w = B.wave, facingIn = -Math.sin(B.heading) > 0.35;
      // POP UP only when a tap will stand you up (popReady - the same test as the prompt), green
      // and pulsing; while a wave is lifting you but you are not up to speed yet it says PADDLE,
      // because a tap then is "too early" (27 Sep 2026, the iPad report - see advise()).
      const ready = popReady(B);
      const lifting = B.state === PRONE && facingIn && w.face && w.amp > 0.12;
      // HOLD: fast enough but too steep, or a press being held (stage 1) - a tap now is not wasted,
      // but the button says the truth: not yet.
      const holding = B.state === PRONE && (B.popV === 'pearl' || B._popHold > 0);
      const lab = B.state === RIDE ? 'KICK<br>OUT' : ready ? 'POP<br>UP' : holding ? 'HOLD' : lifting ? 'PADDLE' : 'DUCK<br>DIVE';
      if (tb.innerHTML !== lab) tb.innerHTML = lab;
      tb.classList.toggle('sf-go', ready);
      tb.classList.toggle('sf-wait', (lifting || holding) && !ready);
    }
    if (S.run.phase === 'won' && S.run.t - S.run.endT > SURFRUN.endSec && !S.hud.overOn) {
      RP.offer(false);
      S.run.replayable = !!RP.best;
      S.hud.showOver(S.run);
    }
  };

  // What the music reads (main.js musicState, SURFER fence): quieter while you wait, full while
  // you ride, and the pulse climbs with the waves you have ridden.
  S.musicState = function () {
    const B = board(), r = S.run;
    if (!B || !r) return {};
    const riding = B.state === RIDE ? 1 : 0;
    return { intensity: 0.35 + 0.65 * riding, pulse: Math.min(1, r.waves / SURFRUN.waves) };
  };

  S.enter = enter; S.exit = exit; S.again = again;
  S.board = board;
  // For probes and the film driver (tmp-tr201/film/shots/surf-driver.mjs): read-only views of the
  // sea the level already reads. Nothing here moves anything.
  const probe2 = makeSurfSlot(), sc2 = {};
  S.probe = (x, z) => surfSample(x, z, sim.time, 0, sim.sea.surfCtl, probe2);
  S.dAt = (x, z) => shoreCoords(x, z, sc2).d;
  S.home = () => worldAt(S.onset + 10, SURFRUN.o * SURFRUN.side, [0, 0]);
  S.pierward = Math.atan2(D0 * SURFRUN.side, -D1 * SURFRUN.side);   // along -o from this bank
  if (typeof addEventListener === 'function') {
    addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
      // The press that ended a replay (main.js dismissBriefing) does nothing else.
      if (e.__briefingAte || RP.playing()) return;
      if (S.active && e.code === 'Enter' && S.hud && S.hud.overOn) again();
      // X: watch the last ride again (or, on the summary card, the best one).
      if (S.active && e.code === 'KeyX' && !e.repeat) RP.play(S.hud && S.hud.overOn ? RP.best : RP.last);
    });
  }
  if (!isCal && q.get('mode') === 'surfer') enter();
  if (typeof window !== 'undefined') window.efoilSurfer = S;
  return S;
}
