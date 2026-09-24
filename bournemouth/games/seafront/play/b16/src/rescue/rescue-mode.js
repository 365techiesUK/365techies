// RESCUE ARCADE MODE - the controller that main.js talks to (tr42).
//
// main.js holds exactly three fenced hooks: rescue.tick() after each fixed sim
// step, rescue.frame(cam) after the GL scene is drawn, and initRescue(ctx) at
// the bottom. With the mode off, tick/frame are never called, no GL object is
// created and nothing is drawn, so the default game renders byte-identically.
//
// Ways in: ?mode=rescue, Shift+R, or the RESCUE MODE button on the front door.
// Ways out: Shift+R again, or FREE RIDE on the summary card.
// Test/demo URL extras: &seed=<int>, &rescuewave=<n> (start at wave n),
// &rescuebot=1 (the scripted pilot flies it - see pilot.js).

import { playerPose } from '../player-pose.js';
import { RescueGame } from './rescue.js';
import { RescueHud } from './rescue-hud.js';
import { rescuePilot } from './pilot.js';
import { RescueActors, RescueScene } from '../gl/rescue-actors.js';
import { OVERCAST } from '../gl/craft.js';

const SHORE_HEADING = -Math.PI / 2;   // -z is toward the beach from the spawn

export function initRescue(ctx) {
  const { sim, seaGL, FIXED_DT } = ctx;
  const q = new URLSearchParams(location.search);
  const isCal = q.has('cal');
  const seed0 = q.has('seed') ? (Number(q.get('seed')) >>> 0) : undefined;
  const startWave = Math.max(1, Number(q.get('rescuewave')) || 1);
  const bot = q.get('rescuebot') === '1';
  const mount = document.querySelector('#stagewrap') || document.body;

  const R = {
    active: false, game: null, actors: null, scene: new RescueScene(), hud: null,
    runs: 0, lastSimTick: 0, prevHeading: sim.startHeading, stats: null,
  };

  // >>> WIREMUSIC
  // ⚠️ THIS MODULE'S BLIPS HAD NO SOUND GATE OF ANY KIND, and that is a defect and not a style
  // point. engine-audio.js:82 and raid-audio.js:47 both refuse to build under ?cal=, ?clean=1,
  // ?sound=0 and ?mute, and score.js does the same; wake() below did not. So `?sound=0` -
  // which the readme, the help and every other module treat as "the game is silent" - silenced
  // the entire game EXCEPT this level's blips, and a calibration render that ever saw a
  // pointerdown would have built an AudioContext it had no business having. Found while wiring
  // the master sound control, which needs a lever here anyway: this module owns a fourth
  // AudioContext and there is no shared bus in this tree to reach it through.
  // The four flags are read exactly as the other three modules read them.
  const SND_OK = !q.has('cal') && q.get('clean') !== '1' && q.get('sound') !== '0' && !q.has('mute');
  let sndOn = SND_OK;
  // The master dial in main.js calls this. SND_OK is the floor: an address that pinned the
  // sound off cannot be argued out of it by a click.
  R.setSound = (on) => { sndOn = SND_OK && on !== false; return sndOn; };
  // <<< WIREMUSIC
  // ---- audio: tiny synthesized blips, created on the first user gesture ----
  let ac = null;
  const wake = () => { if (!sndOn) return; if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch { ac = null; } } };   // WIREMUSIC: `if (!sndOn) return;`
  addEventListener('pointerdown', wake, { passive: true });
  addEventListener('keydown', wake, { passive: true });
  function blip(freqs, dur = 0.09, type = 'triangle', gain = 0.08) {
    if (!sndOn) return;   // WIREMUSIC
    if (!ac || ac.state !== 'running') { if (ac && ac.state === 'suspended') ac.resume(); if (!ac || ac.state !== 'running') return; }
    let t = ac.currentTime;
    for (const f of freqs) {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type; o.frequency.value = f;
      g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur + 0.02);
      t += dur * 0.8;
    }
  }

  function seedFor(run) { return ((seed0 ?? 0x5e4c0e42) + run * 7919) >>> 0; }

  function newRun() {
    R.game = new RescueGame({ seed: seedFor(R.runs), startWave });
    R.runs++;
    R.scene.reset();
    R.hud.hideOver();
    consumeEvents();
  }

  function enter() {
    if (R.active) return;
    if (!R.hud) R.hud = makeHud();
    if (seaGL && !R.actors) {
      try { R.actors = new RescueActors(seaGL.gl); } catch (e) { console.warn('[rescue] actors failed:', e.message); }
    }
    R.active = true;
    document.body.classList.add('rescue');
    R.prevHeading = sim.startHeading;
    sim.startHeading = SHORE_HEADING;
    ctx.takeInput(bot ? { sample: () => rescuePilot(sim, R.game) } : null);
    ctx.restart();
    R.lastSimTick = sim.tick;
    newRun();
    if (ctx.toast) ctx.toast('RESCUE MODE — Shift+R to leave');
  }

  function exit() {
    if (!R.active) return;
    R.active = false;
    document.body.classList.remove('rescue');
    R.hud.hideOver();
    sim.startHeading = R.prevHeading;
    ctx.setSea(ctx.defaultSea);
    ctx.takeInput(null);
    ctx.restart();
  }

  function makeHud() {
    return new RescueHud(mount, { onEnter: enter, onAgain: () => { ctx.restart(); R.lastSimTick = sim.tick; newRun(); }, onExit: exit });
  }

  function consumeEvents() {
    const g = R.game, hud = R.hud;
    for (const e of g.events) {
      switch (e.type) {
        case 'wave':
          if (sim.sea.stateName !== e.sea) ctx.setSea(e.sea);
          hud.banner(`WAVE ${e.n}`, `${e.people} ${e.people === 1 ? 'person' : 'people'} in the water · ${Math.round(e.timer)} s on the clock`, '', g.T.introSec * 1000);
          blip([330, 440], 0.12);
          break;
        case 'go': blip([660], 0.15, 'square', 0.05); break;
        case 'pickup': hud.pop('PICKED UP', 'pick'); blip([520, 780], 0.08); break;
        case 'groupClear': break;
        case 'dropoff': hud.pop(`+${e.points}${e.mult > 1 ? `  ×${e.mult.toFixed(1)}` : ''}`); blip([880, 1175], 0.07, 'sine', 0.09); break;
        case 'clear':
          hud.banner('WAVE CLEAR', `time bonus +${e.timeBonus}${e.rapid ? `  ·  rapid bonus +${e.rapid}` : ''}`, 'clear', g.T.clearSec * 1000);
          blip([523, 659, 784, 1046], 0.1);
          break;
        case 'timeup':
          hud.banner("TIME'S UP", `the shore team brings the rest in · ${e.chances} ${e.chances === 1 ? 'chance' : 'chances'} left`, 'timeup', g.T.clearSec * 1000);
          blip([440, 330, 247], 0.14, 'sawtooth', 0.05);
          break;
        case 'over': hud.showOver(e, g.seed); break;
      }
    }
    g.events.length = 0;
  }

  // ---- hooks main.js calls -------------------------------------------------
  R.tick = function () {
    // Any restart path (R, the touch RESET button, a replay, a wipe reset)
    // zeroes sim.tick; a fresh ride means a fresh run.
    if (sim.tick < R.lastSimTick) {
      // Same as the raid: changing craft restarts the sim but must not end the rescue run.
      if (globalThis.__modeCraftSwitch) globalThis.__modeCraftSwitch = false;
      else newRun();
    }
    R.lastSimTick = sim.tick;
    R.game.update(playerPose(sim), FIXED_DT);
    if (R.game.events.length) consumeEvents();
  };

  const clip = new Float32Array(4);
  R.frame = function (cam) {
    const pose = playerPose(sim);
    let proj = null;
    const W = seaGL ? seaGL.W : 1, H = seaGL ? seaGL.H : 1;
    if (cam && seaGL && R.actors) {
      R.scene.fill(R.actors, R.game, sim, pose, R.game.T);
      R.actors.draw(cam, seaGL.vpM, seaGL.sunDir, seaGL.exposure, OVERCAST.v, sim.time);
      R.stats = R.actors.lastStats;
      const m = seaGL.vpM;
      proj = (x, y, z) => {
        clip[0] = m[0] * x + m[4] * y + m[8] * z + m[12];
        clip[1] = m[1] * x + m[5] * y + m[9] * z + m[13];
        clip[3] = m[3] * x + m[7] * y + m[11] * z + m[15];
        const w = clip[3];
        const behind = w < 0.1;
        const iw = 1 / (Math.abs(w) < 1e-4 ? 1e-4 : Math.abs(w));
        return { x: (clip[0] * iw * 0.5 + 0.5) * W, y: (0.5 - clip[1] * iw * 0.5) * H, behind };
      };
    }
    R.hud.update(R.game, pose, proj, W, H, cam ? cam.yaw : undefined);
  };

  // ---- entry points ---------------------------------------------------------
  addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
    if (e.code === 'KeyR' && e.shiftKey) { R.active ? exit() : enter(); return; }
    if (R.active && e.code === 'Enter' && R.game && R.game.phase === 'over') { ctx.restart(); R.lastSimTick = sim.tick; newRun(); }
  });

  // The front-door button is not created at all on a calibration render.
  if (!isCal || q.get('mode') === 'rescue') R.hud = makeHud();
  // >>> SHORE
  // tmp-tr175: `!isCal &&` added, which is exactly what tmp-tr174 did to
  // raid-mode.js:535 and what smuggle.js:1050 and stunt.js:662 already read.
  // This auto-entry had no calibration guard, so `?cal=...&mode=rescue` started
  // a live rescue run underneath a measurement render - casualties, timer, HUD
  // and a scripted pilot driving the craft - and every tone number taken from
  // that frame would have been of a different world. It was harmless only
  // because none of the 25 judged URLs carries `mode=`, and this project added
  // six judged views in one day.
  // The makeHud() line above is left as it was: it already has its own isCal
  // term, it is shared verbatim with raid-mode.js:522, and a built-but-inactive
  // HUD is this module's ordinary resting state on any page load with no mode.
  if (!isCal && q.get('mode') === 'rescue') enter();
  // <<< SHORE

  // Headless test handle: advance the real sim and the game together with the
  // scripted pilot, exactly as main.js's tick() would, until `until(game)`.
  R.fastForward = (maxTicks, until) => {
    let n = 0;
    for (; n < maxTicks; n++) {
      sim.step(rescuePilot(sim, R.game), FIXED_DT);
      R.tick();
      if (until && until(R.game)) break;
    }
    return n;
  };
  window.efoilRescue = R;   // console / headless test handle
  return R;
}
