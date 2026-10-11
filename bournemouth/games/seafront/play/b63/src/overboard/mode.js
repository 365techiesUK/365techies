// OVERBOARD - the controller main.js talks to (tmp-tr197).
//
// Same shape as src/rescue/rescue-mode.js and src/stunt/stunt.js: one place
// that owns enter/exit, everything saved and restored rather than assumed, and
// a headless handle so a suite can drive it. main.js holds exactly three fenced
// hooks - initOverboard(ctx), ob.tick() after each fixed sim step, and
// ob.frame(cam) after the GL scene is drawn. With the mode off, tick and frame
// are never called, no GL object is created and nothing is drawn, so the
// default game renders byte-identically.
//
// Ways in:  ?mode=overboard, or Shift+O, or window.efoilOverboard.enter().
// Ways out: Shift+O again, or FREE RIDE on the summary card, or .exit().
//
// ⚠️ There is NO visible front-door button, and that is deliberate: index.html:314
// hides the rescue's and the raid's for a reason it states (there is a level picker
// now), and this level does not get to reintroduce what that decision removed. It is
// not in the picker either - see the OVERBOARD fence in main.js for why, and for the
// one-line change that would put it there.
// Test/demo URL extras: &seed=<int>, &obleg=<n>, &obbot=1 (the scripted pilot
// flies it), &obbot=hard (the same route driven badly, which is how the
// ejection rule is provoked on demand - see pilot.js).
//
// ⚠️ CALIBRATION. This mode refuses to enter on a ?cal= address, and its front
// door button is not built on one either. That is the same guard rescue-mode.js
// carries in its SHORE fence, and it is there for the same reason: a live
// passage under a measurement render would put casualties, a clock, a HUD and a
// scripted pilot into a frame whose tone numbers are supposed to describe an
// empty sea. Nothing in this level draws anything when it is not entered, so
// the 25 judged views cannot see a pixel of it.

import { playerPose } from '../player-pose.js';
import { OverboardRun, HELM_IDLE, helmFromHull } from './overboard.js';
import { OverboardHud } from './overboard-hud.js';
import { overboardPilot } from './pilot.js';
import { RescueActors } from '../gl/rescue-actors.js';
import { OverboardScene } from '../gl/overboard-scene.js';
import { OVERCAST } from '../gl/craft.js';

// The body classes the other four levels put on <body>. If one of them appears
// while this one is live, this one stands down - they were written before this
// level existed and none of them knows to stand it down itself.
const OTHER_MODES = ['rescue', 'raid', 'smuggle', 'stunt'];

export function initOverboard(ctx) {
  const { sim, seaGL, FIXED_DT } = ctx;
  const q = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
  const isCal = q.has('cal');
  const seed0 = q.has('seed') ? (Number(q.get('seed')) >>> 0) : undefined;
  const startLeg = Math.max(1, Number(q.get('obleg')) || 1);
  const botArg = q.get('obbot');
  const bot = botArg === '1' || botArg === 'hard' || botArg === 'careful';
  const botStyle = botArg === 'hard' ? 'hooligan' : 'careful';
  const mount = (typeof document !== 'undefined' && (document.querySelector('#stagewrap') || document.body)) || null;

  const O = {
    active: false, run: null, actors: null, scene: new OverboardScene(), hud: null,
    runs: 0, leg: startLeg, lastSimTick: 0, stats: null, botStyle,
    prevHeading: sim ? sim.startHeading : 0, prevX: sim ? sim.startX : 0, prevZ: sim ? sim.startZ : 0,
    prevCraft: null,
  };

  // ---- sound, gated exactly as engine-audio.js, raid-audio.js, score.js and
  // rescue-mode.js's WIREMUSIC fence gate theirs. ?cal=, ?clean=1, ?sound=0 and
  // ?mute each mean silence, and a click cannot argue an address out of it.
  const SND_OK = !q.has('cal') && q.get('clean') !== '1' && q.get('sound') !== '0' && !q.has('mute');
  let sndOn = SND_OK;
  O.setSound = (on) => { sndOn = SND_OK && on !== false; return sndOn; };
  let ac = null;
  const wake = () => { if (!sndOn) return; if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch { ac = null; } } };
  if (typeof addEventListener === 'function') {
    addEventListener('pointerdown', wake, { passive: true });
    addEventListener('keydown', wake, { passive: true });
  }
  function blip(freqs, dur = 0.09, type = 'triangle', gain = 0.08) {
    if (!sndOn) return;
    if (!ac || ac.state !== 'running') { if (ac && ac.state === 'suspended') ac.resume(); if (!ac || ac.state !== 'running') return; }
    let t = ac.currentTime;
    for (const f of freqs) {
      const osc = ac.createOscillator(), g = ac.createGain();
      osc.type = type; osc.frequency.value = f;
      g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(g).connect(ac.destination); osc.start(t); osc.stop(t + dur + 0.02);
      t += dur * 0.8;
    }
  }

  const hullOf = () => { const c = ctx.craft; return c && c.active ? c.hull : null; };

  // THE HELM. Four numbers, every one already published by the hull and already
  // read by something else in the tree (see the header of overboard.js). On a
  // craft with no hull this is HELM_IDLE and nobody ever goes over the side,
  // which is correct: this is a boat level and the boat is what sheds people.
  // helmFromHull() lives in overboard.js so the suite reads the hull through the
  // SAME expression the game does. HELM_IDLE is what a craft with no hull gets.
  function helm() { return hullOf() ? helmFromHull(hullOf()) : HELM_IDLE; }

  function seedFor(n) { return ((seed0 ?? 0x0b0a2d17) + n * 7919) >>> 0; }

  function newPassage(leg = O.leg) {
    O.leg = Math.max(1, leg);
    O.run = new OverboardRun({ seed: seedFor(O.runs), leg: O.leg });
    O.runs++;
    O.scene.reset();
    if (O.hud) O.hud.hideOver();
    // The spawn is the LEG's, and it is applied before ctx.restart() so the
    // boat is put on the seaward mark rather than driven there.
    const s = O.run.spawn;
    sim.startX = s.x; sim.startZ = s.z; sim.startHeading = s.heading;
    consumeEvents();
  }

  function leaveOthers() {
    if (typeof window === 'undefined') return;
    const R = window.efoilRaid; if (R && R.active && R.exit) R.exit();
    const G = window.efoilSmuggle; if (G && G.active && G.exit) G.exit();
    const S = window.efoilStunt; if (S && S.active && S.exit) S.exit();
    const Q = window.efoilRescue;
    if (Q && Q.active && typeof document !== 'undefined') {
      const b = document.querySelector('#rq-over [data-a=exit]');
      if (b) b.click();
    }
  }

  function enter() {
    if (O.active) return;
    if (isCal) return;                 // see the header: never under a measurement render
    leaveOthers();
    if (!O.hud && mount) O.hud = makeHud();
    if (seaGL && !O.actors) {
      try { O.actors = new RescueActors(seaGL.gl); } catch (e) { console.warn('[overboard] actors failed:', e.message); }
    }
    O.active = true;
    if (typeof document !== 'undefined') document.body.classList.add('overboard');
    O.prevHeading = sim.startHeading; O.prevX = sim.startX; O.prevZ = sim.startZ;
    // This level is driven in the RIB. It is the boat the fiction is about and
    // the only craft in the build with passenger seats to throw anybody out of.
    const c = ctx.craft;
    if (c) {
      O.prevCraft = c.kind;
      if (c.kind !== 'speedboat') { globalThis.__modeCraftSwitch = true; c.select('speedboat', true); }
    }
    if (ctx.takeInput) ctx.takeInput(bot ? { sample: () => overboardPilot(sim, O.run, hullOf(), O.botStyle) } : null);
    newPassage(startLeg);
    if (ctx.setSea) ctx.setSea(O.run.spec.sea);
    if (ctx.restart) ctx.restart();
    O.lastSimTick = sim.tick;
    if (ctx.toast) ctx.toast('THE TRIP BACK — get them all to the beach — Shift+O to leave');
  }

  function exit() {
    if (!O.active) return;
    O.active = false;
    if (typeof document !== 'undefined') document.body.classList.remove('overboard');
    if (O.hud) O.hud.hideOver();
    sim.startHeading = O.prevHeading; sim.startX = O.prevX; sim.startZ = O.prevZ;
    if (ctx.setSea) ctx.setSea(ctx.defaultSea);
    if (ctx.takeInput) ctx.takeInput(null);
    const c = ctx.craft;
    if (c && O.prevCraft && c.kind !== O.prevCraft) { globalThis.__modeCraftSwitch = true; c.select(O.prevCraft, true); }
    if (ctx.restart) ctx.restart();
  }

  function again(leg) {
    newPassage(leg);
    if (ctx.setSea) ctx.setSea(O.run.spec.sea);
    if (ctx.restart) ctx.restart();
    O.lastSimTick = sim.tick;
  }

  function makeHud() {
    return new OverboardHud(mount, {
      onEnter: enter,
      onAgain: () => again(O.leg),
      onNext: () => again(O.leg + 1),
      onExit: exit,
    });
  }

  function consumeEvents() {
    const r = O.run, hud = O.hud;
    if (!r) return;
    for (const e of r.events) {
      switch (e.type) {
        case 'passage':
          if (hud) {
            hud.banner(`LEG ${e.leg}`,
              `${e.aboard} aboard a boat rated for ${e.rated} · ${Math.round(e.offshore)} m out · ${Math.round(e.sec)} s`,
              '', r.T.introSec * 1000);
          }
          blip([294, 392], 0.13);
          break;
        case 'go': blip([587], 0.15, 'square', 0.05); break;
        case 'overboard':
          if (hud) hud.pop('OVERBOARD!', 'over');
          blip([392, 262], 0.16, 'sawtooth', 0.06);
          break;
        case 'recovered':
          if (hud) hud.pop('BACK ABOARD', 'pick');
          blip([523, 784], 0.08);
          break;
        case 'ashorePerson':
          if (hud) hud.pop(`+${e.points}`);
          blip([880, 1175], 0.07, 'sine', 0.09);
          break;
        case 'slam': break;      // the camera and the audio already say this
        case 'ashore':
          if (hud) {
            hud.banner(e.dry ? 'DRY PASSAGE' : 'ALL ASHORE',
              `time bonus +${e.timeBonus}${e.dry ? `  ·  nobody went over +${e.dry}` : ''}`,
              'good', r.T.endSec * 1000);
          }
          blip([523, 659, 784, 1046], 0.1);
          break;
        case 'timeup':
          if (hud) {
            hud.banner('OUT OF TIME',
              `the shore team brings the rest in · ${e.handed} ${e.handed === 1 ? 'person' : 'people'}`,
              'late', r.T.endSec * 1000);
          }
          blip([440, 330, 247], 0.14, 'sawtooth', 0.05);
          break;
        case 'over': if (hud) hud.showOver(e); break;
        default: break;
      }
    }
    r.events.length = 0;
  }

  // ---- hooks main.js calls -------------------------------------------------
  O.tick = function () {
    if (!O.run) return;
    // Another level took the stage. Those four were written before this one and
    // none of them knows to stand it down, so it stands itself down.
    if (typeof document !== 'undefined') {
      for (const k of OTHER_MODES) if (document.body.classList.contains(k)) { exit(); return; }
    }
    // Any restart path (R, the touch RESET, a replay, a wipe reset) zeroes
    // sim.tick; a fresh ride means a fresh passage. A craft swap restarts the
    // sim too and must NOT, which is what the flag is for.
    if (sim.tick < O.lastSimTick) {
      if (globalThis.__modeCraftSwitch) globalThis.__modeCraftSwitch = false;
      else again(O.leg);
    }
    O.lastSimTick = sim.tick;
    O.run.update(playerPose(sim), helm(), FIXED_DT);
    if (O.run.events.length) consumeEvents();
  };

  const clip = new Float32Array(4);
  O.frame = function (cam) {
    if (!O.run || !O.hud) return;
    const pose = playerPose(sim);
    let proj = null;
    const W = seaGL ? seaGL.W : 1, H = seaGL ? seaGL.H : 1;
    if (cam && seaGL && O.actors) {
      O.scene.fill(O.actors, O.run, sim, pose, hullOf());
      O.actors.draw(cam, seaGL.vpM, seaGL.sunDir, seaGL.exposure, OVERCAST.v, sim.time);
      O.stats = O.actors.lastStats;
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
    O.hud.update(O.run, pose, proj, W, H, cam ? cam.yaw : undefined);
  };

  O.enter = enter;
  O.exit = exit;

  // ---- entry points ---------------------------------------------------------
  if (typeof addEventListener === 'function') {
    addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
      if (e.code === 'KeyO' && e.shiftKey) { O.active ? exit() : enter(); return; }
      if (O.active && e.code === 'Enter' && O.run && O.run.phase === 'over') again(O.leg + 1);
    });
  }

  if (!isCal && mount) O.hud = makeHud();
  if (!isCal && q.get('mode') === 'overboard') enter();

  // Headless handle: advance the real hull and the run together with the
  // scripted pilot, exactly as main.js's tick() would, until `until(run)`.
  O.fastForward = (maxTicks, until) => {
    let n = 0;
    for (; n < maxTicks; n++) {
      const raw = overboardPilot(sim, O.run, hullOf(), O.botStyle);
      if (ctx.craft && ctx.craft.active) ctx.craft.step(raw, FIXED_DT); else sim.step(raw, FIXED_DT);
      O.tick();
      if (until && until(O.run)) break;
    }
    return n;
  };
  if (typeof window !== 'undefined') window.efoilOverboard = O;
  return O;
}
