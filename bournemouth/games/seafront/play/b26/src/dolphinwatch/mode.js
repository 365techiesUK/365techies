// DOLPHIN WATCH - the controller main.js talks to (b22, 24 Sep 2026).
//
// Same shape as src/overboard/mode.js: one place that owns enter/exit, everything saved and
// restored rather than assumed, and a headless handle. main.js holds three fenced hooks -
// initWatch(ctx), dw.tick() after each fixed sim step, dw.frame(cam) after the GL scene - and
// one more for free ride, dw.freeTick(), which is the one-time "Dolphins spotted!" message.
//
// Ways in:  ?mode=dolphins, the DOLPHIN WATCH row in the level picker, window.efoilWatch.enter().
// Ways out: FREE RIDE or CHOOSE LEVEL on the summary card, another level from the picker, .exit().
// No keyboard shortcut, deliberately: every Shift+letter this game has not spent is a driving
// key with Shift held, and a level that started because someone boosted would be a defect.
//
// THE DOLPHINS ARE NOT BUILT HERE. They are the renderer's (src/gl/renderer.js DOLPHINS fence),
// the same pod free ride has, so this level can only ever show the animals the rest of the game
// shows. It moves them once per run - summon() to a seeded spot out of sight - shortens their
// leader's wait between breaths, and puts that back when it leaves.
//
// ⚠️ CALIBRATION. Never enters on a ?cal= address, and the renderer builds no pod there anyway.

import { playerPose } from '../player-pose.js';
import { WatchRun, WATCH, placePod } from './watch.js';
import { WatchHud } from './watch-hud.js';
import { ROLL, LEAP } from '../dolphin-pod.js';
// >>> DOLPHINVOICE
import { DolphinVoice } from './dolphin-voice.js';
// <<< DOLPHINVOICE

// The body classes the other levels put on <body>. If one appears while this level is live,
// this one stands down - quietly, because that level has already set the world up for itself.
const OTHER_MODES = ['rescue', 'raid', 'smuggle', 'stunt', 'overboard'];
const DEFAULT_GAP = [14, 30];
const SPOT_RANGE = 300;       // m: free ride's "Dolphins spotted!" - a breath this close

export function initWatch(ctx) {
  const { sim, seaGL, FIXED_DT } = ctx;
  const q = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
  const isCal = q.has('cal');
  const seed0 = q.has('seed') ? (Number(q.get('seed')) >>> 0) : undefined;
  const mount = (typeof document !== 'undefined' && (document.querySelector('#stagewrap') || document.body)) || null;

  const W = {
    active: false, run: null, hud: null, runs: 0, lastSimTick: 0, prevCraft: null,
    spotted: false, _freeModes: null,
    get game() { return W.run; },           // what main.js's music reads
  };

  // ---- sound, gated exactly as the other levels gate theirs --------------------------
  const SND_OK = !isCal && q.get('clean') !== '1' && q.get('sound') !== '0' && !q.has('mute');
  let sndOn = SND_OK;
  W.setSound = (on) => { sndOn = SND_OK && on !== false; return sndOn; };
  let ac = null;
  const wake = () => { if (!sndOn) return; if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch { ac = null; } } };
  if (typeof addEventListener === 'function') {
    addEventListener('pointerdown', wake, { passive: true });
    addEventListener('keydown', wake, { passive: true });
    // DOLPHINVOICE: and on a touch - a tap the touch controls consume need not produce a
    // pointerdown (engine-audio.js RESUME: that is why an iPad once heard no engine).
    addEventListener('touchstart', wake, { passive: true });
  }
  // >>> DOLPHINVOICE
  // THE POD'S OWN SOUNDS - the blow as each one surfaces, the splash off a leap, and faint
  // whistles and clicks when they are right beside you (src/dolphinwatch/dolphin-voice.js says
  // what is real and what is licence). In free ride AND in this level: the pod is the same
  // animals in both. It uses THIS module's context, so the game's master sound switch
  // (main.js applySound -> W.setSound) and the ?cal / ?clean / ?sound=0 / ?mute gate above
  // reach it with no new wiring, and there is no sixth AudioContext. Silent in a clean render
  // and whenever the renderer has hidden the pod (the raids). Read-only on the pod.
  const voice = new DolphinVoice();
  W.voice = voice;
  function voiceTick() {
    const D = seaGL && seaGL.dolphins;
    if (!D || isCal) return;
    let live = null;
    if (sndOn && ac && typeof document !== 'undefined' && !document.body.classList.contains('clean-render')) {
      if (ac.state === 'suspended') ac.resume();
      if (ac.state === 'running') live = ac;
    }
    voice.update(D, playerPose(sim), FIXED_DT, live);
  }
  // <<< DOLPHINVOICE
  function blip(freqs, dur = 0.09, type = 'sine', gain = 0.07) {
    if (!sndOn) return;
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

  const pod = () => (seaGL && seaGL.dolphins ? seaGL.dolphins.sim : null);
  const seedFor = (n) => ((seed0 ?? 0x0d01f1a5) + n * 7919) >>> 0;

  // `brief`: the rules card, on the way in only. PLAY AGAIN goes straight back to the water.
  function newRun(brief) {
    W.run = new WatchRun({ seed: seedFor(W.runs) });
    W.runs++;
    const P = pod();
    if (P) {
      const s = placePod(W.run.seed, { x: sim.startX || 0, z: sim.startZ || 0 });
      P.summon(s.x, s.z, 0, null);
      P.gap = WATCH.gap;
    }
    if (W.hud) { W.hud.hideOver(); if (brief) W.hud.showIntro(); }
    consumeEvents();
  }

  function leaveOthers() {
    if (typeof window === 'undefined') return;
    const R = window.efoilRaid; if (R && R.active && R.exit) R.exit();
    const G = window.efoilSmuggle; if (G && G.active && G.exit) G.exit();
    const S = window.efoilStunt; if (S && S.active && S.exit) S.exit();
    const O = window.efoilOverboard; if (O && O.active && O.exit) O.exit();
    const Q = window.efoilRescue;
    if (Q && Q.active && typeof document !== 'undefined') {
      const b = document.querySelector('#rq-over [data-a=exit]');
      if (b) b.click();
    }
  }

  function enter() {
    if (W.active || isCal) return;
    if (!pod()) { if (ctx.toast) ctx.toast('the dolphins are switched off on this page'); return; }
    leaveOthers();
    if (!W.hud && mount) W.hud = makeHud();
    W.active = true;
    if (typeof document !== 'undefined') document.body.classList.add('dolphins');
    // SPEEDBOAT ONLY: the pod rides a boat's bow wave and nothing else (dolphin-pod.js
    // _rideable), so on any other craft this level could not be won.
    const c = ctx.craft;
    if (c) { W.prevCraft = c.kind; if (c.kind !== 'speedboat') c.select('speedboat', true); }
    if (ctx.takeInput) ctx.takeInput(null);
    if (ctx.setSea) ctx.setSea(ctx.defaultSea);
    newRun(true);
    if (ctx.restart) ctx.restart();
    W.lastSimTick = sim.tick;
    // The craft change above is this level's own and is already behind us. Left set, the flag
    // would swallow the player's first R and the run would carry on instead of starting over.
    globalThis.__modeCraftSwitch = false;
  }

  // `quiet`: another level has already taken the stage and set the world up for itself, so
  // only this level's own things are undone - not the sea, the input, the craft or the sim.
  function exit(quiet) {
    if (!W.active) return;
    W.active = false;
    if (typeof document !== 'undefined') document.body.classList.remove('dolphins');
    if (W.hud) { W.hud.hideOver(); W.hud.hideIntro(); }
    const P = pod(); if (P) P.gap = DEFAULT_GAP;
    if (quiet === true) return;
    if (ctx.setSea) ctx.setSea(ctx.defaultSea);
    if (ctx.takeInput) ctx.takeInput(null);
    const c = ctx.craft;
    if (c && W.prevCraft && c.kind !== W.prevCraft) c.select(W.prevCraft, true);
    if (ctx.restart) ctx.restart();
    globalThis.__modeCraftSwitch = false;
  }

  function again() {
    newRun();
    if (ctx.restart) ctx.restart();
    W.lastSimTick = sim.tick;
  }

  function makeHud() {
    return new WatchHud(mount, { onStart: () => {}, onAgain: again, onExit: () => exit() });
  }

  function consumeEvents() {
    const r = W.run, hud = W.hud;
    if (!r) return;
    for (const e of r.events) {
      switch (e.type) {
        case 'spotted':
          if (hud) hud.banner('DOLPHINS SPOTTED', 'Head for the blow — and slow right down as you get close', 'good', 3500);
          blip([523, 784], 0.12);
          break;
        case 'leap': if (hud) hud.pop('LEAP!'); blip([988], 0.08); break;
        case 'coming': if (hud) hud.pop('THEY’VE SEEN YOU'); break;
        case 'ride': if (hud) hud.pop('ON THE BOW!'); blip([659, 880, 1047], 0.09); break;
        case 'peel': if (hud) hud.pop('They peeled off', 'bad'); break;
        case 'scare':
          if (hud && e.n < e.of) {
            hud.banner('SCARED THEM', `${e.n} of ${e.of} — slow down near the pod, and never chase`, 'bad', 3500);
          }
          blip([392, 262], 0.16, 'sawtooth', 0.05);
          break;
        case 'win':
          if (hud) hud.banner('BOW RIDERS', 'Thirty seconds on the bow', 'good', WATCH.endSec * 1000);
          blip([523, 659, 784, 1046], 0.1);
          break;
        case 'lost':
          if (hud) {
            if (e.why === 'scared') hud.banner('THE POD HAS LEFT THE BAY', 'Three scares', 'bad', WATCH.endSec * 1000);
            else hud.banner('OUT OF TIME', 'The pod has moved on', 'bad', WATCH.endSec * 1000);
          }
          blip([440, 330, 247], 0.14, 'sawtooth', 0.05);
          break;
        case 'over': if (hud) hud.showOver(e); break;
        default: break;
      }
    }
    r.events.length = 0;
  }

  // ---- hooks main.js calls --------------------------------------------------------------
  W.tick = function () {
    voiceTick();   // DOLPHINVOICE
    if (!W.run) return;
    if (typeof document !== 'undefined') {
      for (const k of OTHER_MODES) if (document.body.classList.contains(k)) { exit(true); return; }
    }
    // Any restart path (R, the touch RESET, a wipe reset) zeroes sim.tick: a fresh ride is a
    // fresh run. A craft change restarts the sim too and must not, which is what the flag is for.
    if (sim.tick < W.lastSimTick) {
      if (globalThis.__modeCraftSwitch) globalThis.__modeCraftSwitch = false;
      else again();
    }
    W.lastSimTick = sim.tick;
    const c = ctx.craft;
    if (c && c.kind !== 'speedboat' && W.run.phase === 'live') {
      globalThis.__modeCraftSwitch = true;
      c.select('speedboat', true);
      if (ctx.toast) ctx.toast('DOLPHIN WATCH is a speedboat level — they ride a boat’s bow wave');
      W.lastSimTick = sim.tick;
      return;
    }
    W.run.update(pod(), playerPose(sim), FIXED_DT);
    if (W.run.events.length) consumeEvents();
  };

  const clip = new Float32Array(4);
  const waterAt = (x, z) => (sim.sea && sim.sea.sample ? sim.sea.sample(x, z, sim.time, 0, 1).height : 0);
  W.frame = function (cam) {
    if (!W.run || !W.hud) return;
    const pose = playerPose(sim);
    let proj = null;
    const Wd = seaGL ? seaGL.W : 1, Hd = seaGL ? seaGL.H : 1;
    if (cam && seaGL) {
      const m = seaGL.vpM;
      proj = (x, y, z) => {
        clip[0] = m[0] * x + m[4] * y + m[8] * z + m[12];
        clip[1] = m[1] * x + m[5] * y + m[9] * z + m[13];
        clip[3] = m[3] * x + m[7] * y + m[11] * z + m[15];
        const w = clip[3];
        const behind = w < 0.1;
        const iw = 1 / (Math.abs(w) < 1e-4 ? 1e-4 : Math.abs(w));
        return { x: (clip[0] * iw * 0.5 + 0.5) * Wd, y: (0.5 - clip[1] * iw * 0.5) * Hd, behind };
      };
    }
    W.hud.update(W.run, pose, proj, Wd, Hd, cam ? cam.yaw : undefined, waterAt);
  };

  // FREE RIDE: "Dolphins spotted!", once a visit, the first time they breathe within sight of
  // a player who is actually driving. Not in any level, not in the attract demo, not in a
  // clean render. From the owner, 24 Sep: a whole free-ride session in the speedboat, every
  // camera tried, and never once saw them - they were there, surfacing for a second or two
  // every half minute, and nothing said so. The message says WHERE, because that was the gap.
  W.freeTick = function (isDemo) {
    voiceTick();   // DOLPHINVOICE: before the one-time message's early returns
    if (W.spotted || W.active || isCal || typeof document === 'undefined') return;
    const b = document.body.classList;
    if (b.contains('clean-render') || (isDemo && isDemo())) { W._freeModes = null; return; }
    for (const k of OTHER_MODES) if (b.contains(k)) { W._freeModes = null; return; }
    const P = pod();
    if (!P) return;
    const list = P.pod;
    if (!W._freeModes || W._freeModes.length !== list.length) { W._freeModes = list.map((d) => d.mode); return; }
    const pose = playerPose(sim);
    for (let i = 0; i < list.length; i++) {
      const d = list[i], was = W._freeModes[i];
      W._freeModes[i] = d.mode;
      if (d.mode === was || (d.mode !== ROLL && d.mode !== LEAP)) continue;
      const dx = d.x - pose.x, dz = d.z - pose.z, dist = Math.hypot(dx, dz);
      if (dist > SPOT_RANGE) continue;
      W.spotted = true;
      let rel = Math.atan2(dz, dx) - pose.heading;
      while (rel > Math.PI) rel -= 2 * Math.PI;
      while (rel < -Math.PI) rel += 2 * Math.PI;
      // +rel is to starboard (the same sense the rescue compass uses on screen).
      const where = Math.abs(rel) < 0.6 ? 'ahead' : Math.abs(rel) > 2.5 ? 'behind you'
        : rel > 0 ? 'to your right' : 'to your left';
      if (ctx.toast) ctx.toast(`Dolphins spotted! ${Math.round(dist / 10) * 10} m ${where}`);
      return;
    }
  };

  W.enter = enter;
  W.exit = exit;
  W.again = again;

  if (typeof addEventListener === 'function') {
    addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
      if (W.active && e.code === 'Enter' && W.run && W.run.phase === 'over') again();
    });
  }

  if (!isCal && q.get('mode') === 'dolphins') enter();
  if (typeof window !== 'undefined') window.efoilWatch = W;
  return W;
}
