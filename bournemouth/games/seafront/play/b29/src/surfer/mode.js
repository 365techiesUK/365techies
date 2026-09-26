// PIER SURF - the controller main.js talks to (26 Sep 2026, stage 1: paddle out, duck-dive,
// catch, ride). Same shape as src/dolphinwatch/mode.js: one place owns enter/exit, everything
// it changes is saved and put back, and main.js holds three fenced hooks - initSurfer(ctx),
// S.tick() after each fixed step and S.frame(cam) after the GL scene.
//
// ⚠️ NOT A LISTED LEVEL YET. The owner asked for "one first, and see how that comes out", so
// this is reachable only at ?mode=surfer (or window.efoilSurfer.enter()) until he says it goes
// in the picker. Nothing here is counted by the level tests and nothing is on the live page.
//
// Where: the EAST bank beside Bournemouth Pier (sea-surf.js ZONE_O +72), the side the local
// guides call the favourite. The waves are the sea's own shoaling train, not a spawner: this
// file only reads them to put the words on screen.
//
// Rules of tone (SPEC-SURF.md, gl/surfers.js): nobody is in danger, a wipeout is a tumble and a
// climb back on, nothing is branded, and the real beach's history is not mentioned.

import { SURF, surfSample, makeSurfSlot, shoreCoords, setFactor } from '../sea-surf.js';
import { DIR as PIER_DIR } from '../gl/pier.js';
import { PRONE, DUCK, RIDE, WIPE } from '../boats/surfboard.js';
import { SurferHud } from './surfer-hud.js';

const OTHER_MODES = ['rescue', 'raid', 'smuggle', 'stunt', 'overboard', 'dolphins'];
export const SURFRUN = {
  waves: 3,          // rides to win
  rideMin: 3.0,      // s standing for a ride to count
  side: 1,           // +1 east bank
  o: 66,             // m alongshore from the pier centreline
  inside: 38,        // m inside the break onset to start: a few lines of whitewater to get through
  surf: 1.0,         // the default size, 1.15 m over the bank
  endSec: 4,
};

// Pier space <-> world, as gl/surfers.js does it.
const D0 = PIER_DIR[0], D1 = PIER_DIR[1];
function toWorld(s, o, out) { out[0] = s * D0 + o * D1 - 230; out[1] = s * D1 - o * D0 - 300; return out; }
const _w = [0, 0], _sc = {};
export function worldAt(d, o, out) {
  let s = d + 38;
  for (let i = 0; i < 8; i++) { toWorld(s, o, _w); shoreCoords(_w[0], _w[1], _sc); s += d - _sc.d; }
  return toWorld(s, o, out);
}
// The set-peak time, found from the real clock (gl/surfers.js T_SET_PEAK does the same).
const T_PEAK = (() => { let bt = 0, bv = -1; for (let t = 0; t < 1000; t += 0.5) { const v = setFactor(t); if (v > bv) { bv = v; bt = t; } } return bt; })();
// Outermost d in this column that breaks at the set peak: where the whitewater starts.
export function onsetAt(o, ctl) {
  const slot = makeSurfSlot(), p = [0, 0];
  for (let d = SURF.D_FADE1 - 1; d > 8; d -= 2) {
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
    run: null, onset: 0,
    get game() { return S.run; },
  };
  const probe = makeSurfSlot();

  const board = () => (ctx.craft && ctx.craft.hulls ? ctx.craft.hulls.surfboard : null);
  const tboost = () => (typeof document !== 'undefined' ? document.getElementById('tboost') : null);
  S.tbLabel = null;

  function spawn() {
    const ctl = sim.sea ? sim.sea.surfCtl : 1;
    S.onset = onsetAt(SURFRUN.o * SURFRUN.side, ctl);
    const p = worldAt(Math.max(24, S.onset - SURFRUN.inside), SURFRUN.o * SURFRUN.side, [0, 0]);
    sim.startX = p[0]; sim.startZ = p[1];
    sim.startHeading = Math.PI / 2;          // seaward: +Z is offshore here
  }

  function newRun(brief) {
    S.run = { phase: 'live', t: 0, waves: 0, best: 0, score: 0, rides: [], ducks: 0, ducksClean: 0, washed: 0, wipes: 0, early: 0, events: [], endT: 0 };
    S.runs++;
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
    if (!S.hud && mount) S.hud = new SurferHud(mount, { onAgain: again, onExit: () => exit() });
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
  }

  function exit(quiet) {
    if (!S.active) return;
    S.active = false;
    const tb = tboost(); if (tb && S.tbLabel !== null) tb.innerHTML = S.tbLabel;
    if (typeof document !== 'undefined') document.body.classList.remove('surfer');
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
        case 'washed': r.washed++; if (hud) hud.pop('CAUGHT INSIDE', 'bad'); break;
        case 'early': r.early++; if (hud) hud.pop('TOO EARLY - keep paddling', 'bad'); break;
        case 'pearl': if (hud) hud.pop(e.why === 'falls' ? 'OVER THE FALLS - too late' : 'PEARLED - too late, nose under', 'bad'); break;
        case 'popup': if (hud) hud.pop('UP AND RIDING!'); break;
        case 'carve': if (hud) hud.pop(e.n > 1 ? `CARVE x${e.n}` : 'CARVE!'); break;
        case 'wipe': r.wipes++; break;
        case 'ride_end': {
          const ok = e.secs >= SURFRUN.rideMin && r.phase === 'live';
          r.rides.push({ secs: e.secs, dist: e.dist, top: e.top, carves: e.carves, score: e.score, ok });
          if (e.secs > r.best) r.best = e.secs;
          if (ok) {
            r.waves++;
            r.score += e.score;
            const cv = e.carves ? ` · ${e.carves} ${e.carves === 1 ? 'carve' : 'carves'}` : '';
            if (hud) hud.banner(`WAVE ${r.waves}  +${e.score}`, `${e.secs.toFixed(1)} s · ${Math.round(e.dist)} m · top ${(e.top * 3.6).toFixed(0)} km/h${cv}`, 'good', 2600);
            if (r.waves >= SURFRUN.waves) { r.phase = 'won'; r.endT = r.t; if (hud) hud.banner('SURF’S UP', `${SURFRUN.waves} waves at the pier`, 'good', SURFRUN.endSec * 1000); }
          } else if (hud && e.why !== 'pier') {
            hud.pop(e.secs < 1 ? 'It rolled away' : `Short one - ${e.secs.toFixed(1)} s`, 'bad');
          }
          if (hud && e.why === 'pier') hud.pop('CLIPPED THE PIER', 'bad');
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
  function advise(B) {
    const w = B.wave, facingIn = -Math.sin(B.heading) > 0.35, facingOut = Math.sin(B.heading) > 0.35;
    if (B.state === WIPE) return ['Off the board - climb back on…', 'warn'];
    if (B.state === DUCK) return ['Under it…', ''];
    if (B.state === RIDE) return ['RIDING - steer along the wave (A / D) · SPACE to kick out', 'good'];
    // Whitewater coming at you. A real duck-dive starts one or two body lengths before it hits,
    // so the NOW cue looks 4 m seaward - about a second at the ~3 m/s the whitewater closes on a
    // paddler it is already slowing - and the early warning looks 11 m out.
    if (incomingAt(B, 4)) return facingOut ? ['DUCK DIVE NOW! (SPACE)', 'warn'] : ['Whitewater behind you!', 'warn'];
    if (facingOut && incomingAt(B, 11)) return ['Whitewater coming - get ready to duck-dive', 'warn'];
    if (facingIn && w.face && B.u >= B.spec.popU && w.amp > 0.12) return ['POP UP! (SPACE)', 'good'];
    if (facingIn && w.face && w.amp > 0.25) return ['PADDLE! (W / ↑) - it is lifting you', 'good'];
    surfSample(B.x, B.z + 7, sim.time, 0, sim.sea.surfCtl, probe);
    const outside = w.brk < 0.02 && probe.brk < 0.02;
    if (outside && facingOut) return ['Outside the break - turn to the beach (A / D) and wait for a wave', ''];
    if (outside && facingIn) return ['Wait for a wave. When one lifts you, paddle hard', ''];
    if (facingOut) return ['Paddle out (W / ↑) - duck-dive the whitewater (SPACE)', ''];
    return ['Turn round and paddle out to sea (A / D)', ''];
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
    const [msg, kind] = advise(B);
    S.hud.update(S.run, B, msg, kind);
    // THE BIG TOUCH BUTTON says what it will do right now (it is SPACE on a phone).
    const tb = tboost();
    if (tb) {
      const w = B.wave, facingIn = -Math.sin(B.heading) > 0.35;
      const lab = B.state === RIDE ? 'KICK<br>OUT'
        : (B.state === PRONE && facingIn && w.face && w.amp > 0.12) ? 'POP<br>UP' : 'DUCK<br>DIVE';
      if (tb.innerHTML !== lab) tb.innerHTML = lab;
    }
    if (S.run.phase === 'won' && S.run.t - S.run.endT > SURFRUN.endSec && !S.hud.overOn) {
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
      if (S.active && e.code === 'Enter' && S.hud && S.hud.overOn) again();
    });
  }
  if (!isCal && q.get('mode') === 'surfer') enter();
  if (typeof window !== 'undefined') window.efoilSurfer = S;
  return S;
}
