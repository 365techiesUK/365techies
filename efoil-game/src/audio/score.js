// THE SCORE (tr184) - a generative state score for the eFoil game. Parts A and B only: the
// BED and the PULSE. Nothing in this file is wired into a level, the UI or main.js; it is a
// self-contained module with a documented interface, and the wiring is somebody else's job.
// Part C - pitch-quantising the existing cues onto the bed's chord - is deliberately NOT built.
//
// NO SAMPLES, NO FILES, NO DEPENDENCIES, exactly like the rest of this project's audio.
//
// =============================================================================================
// WHY A GENERATIVE BED AND NOT A SOUNDTRACK
//
// The raid is about seven minutes. A 60-second loop is seven passes per attempt, so twenty
// attempts is a hundred and forty passes of the same sixty seconds. No amount of vertical
// layering fixes that: layering solves variety WITHIN one playthrough and does nothing about
// the twentieth. So the bed is five sustained voices on deliberately incommensurable cycles -
// Eno's Music for Airports, done with oscillators instead of tape loops - and non-repetition
// becomes a property of the construction rather than a content budget. The periods are pairwise
// coprime integers in tenths of a second; the arithmetic is in score-presets.js and
// test-score.mjs proves it rather than asserting it.
//
// =============================================================================================
// THE CONSTRAINT THAT DECIDES WHETHER THIS WORKS
//
// There is no free frequency band in this game. The jetski's supercharger whine sweeps 680 Hz
// to 3.2 kHz with the throttle and its second partial reaches 6.4 kHz; the firing order runs
// 42.5-200 Hz; the cavitation fizz 1800-3600 Hz. You cannot put the music in the gap because
// there is no gap, there is a moving object that the player's own thumb is steering.
//
// The answer is Bregman stream segregation. Every one of the 55 cues is a transient or a noise
// band, and the engine - the only other sustained thing - never holds a pitch. So the music can
// sit INSIDE the engine's range and still be heard as a separate object, provided it is the one
// thing that is sustained, harmonically stable, synchronous in onset across its own voices, and
// rhythmically unrelated to anything the gameplay emits. All four of those are design
// instructions, not descriptions. ⚠️ If the bed ever grows a transient it stops being a stream
// and becomes a 56th cue competing with the engine, and it will lose.
//
// Two bands are additionally vacated outright, because stream segregation is a perceptual
// argument and those two are not worth risking: the pirate crew's three formants (270 Hz -
// 3010 Hz) and the siege sub below 100 Hz. See score-presets.js.
//
// =============================================================================================
// THE INTERFACE - what the game has to call. This is the whole of it.
//
//   import { Score } from './audio/score.js';
//
//   const score = new Score();            // builds NOTHING yet: no AudioContext, no nodes
//   score.start('raid-norse');            // first call inside a user gesture, like the rest
//   score.update(state, dt);              // once a frame, from the same loop as everything else
//   score.silence();                      // fade out, keep running (smuggling creep)
//   score.resume();                       // fade back in at a different point in the cycle
//   score.setLevel('stunt');              // crossfade to another preset
//   score.duck(0.5, 0.35);                // pull the music down for a slam, like duckFor()
//   score.stop();                         // tear the graph down
//
// LEVELS: 'free' (silence, and it means it), 'rescue', 'raid-norse', 'raid-pirate', 'arena',
// 'smuggle', 'stunt'.
//
// STATE - `update(state, dt)`. Every field is optional; absent means "leave it alone".
//
//   intensity   0..1   the one general arousal dial. Drives density and brightness together
//                      unless either is given explicitly. In a raid this is the pier's damage;
//                      in the rescue it is how the level is going; in the arena, pressure.
//   density     0..1   how many of the bed's voices are sounding. Overrides `intensity`.
//   brightness  0..1   filter openness. Overrides `intensity`. This is the arousal dial that
//                      buys the most per unit of effort - more than moving harmony does.
//   pulse       0..1   THE PULSE RATE VARIABLE, and it is a game variable, not a tempo. Wave
//                      number in a raid ((wave-1)/5); seconds remaining in the stunt run;
//                      distance to the nearest lugger in the smuggling run. `null` or absent
//                      turns the pulse off entirely. There is no sequencer here: each pulse
//                      schedules the next one from the state at the moment it fires, so a
//                      change of state changes the very next gap and it can never get out of
//                      step with the game.
//   secondsLeft number for the stunt stage only: the four discrete steps at 90 / 60 / 30 / 10 s
//                      remaining. Sets density and brightness together. The music is the timer.
//   settle      bool   ask the next chord move to go subdominant-ward and narrow: the rescue's
//                      "you have made things better" gesture. Consumed once.
//   level       string switch preset, same as setLevel().
//
// SILENCE. `silence()` and `resume()` fade the master and leave every cycle running, so coming
// back is at a different phase and there is no seam and no restart artefact. That is what the
// smuggling run needs: the music goes away the moment the player starts creeping, because
// searching is a listening activity, and it comes back when the grapnel fouls.
//
// SETTINGS. `?music=full|bed|off`, then localStorage `efoil.music`, then
// prefers-reduced-motion: reduce -> BED (not OFF: reduced is already below the threshold that
// prompted the request and OFF is one tap away), then FULL. `bed` suppresses the pulse and
// keeps the bed. `off` builds nothing at all - no context, no nodes, no listeners.
//
// ⚠️ Nothing is created under ?sound=0, ?mute, ?cal= or ?clean=1, exactly as engine-audio.js
// and raid-audio.js do it. That invariant is what the 19 judged renders rest on.
//
// =============================================================================================

import { PRESETS, STUNT_STEPS } from './score-presets.js';
import {
  buildVoice, buildBreath, buildShimmer, playPulse,
  phaseOffset, foldToBand, semiToRatio, scoreNoise,
} from './score-voices.js';

const Q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();

export const MUSIC_MODES = ['full', 'bed', 'off'];
const LS_KEY = 'efoil.music';

// Same shape as the camera-motion control in main.js, and for the same reasons: an explicit URL
// override so a capture or a bug report can pin it without touching anyone's storage, then the
// stored choice, then an accessibility default, then the product default.
export function resolveMusicMode(q = Q) {
  const p = (q.get('music') || '').toLowerCase();
  if (MUSIC_MODES.includes(p)) return p;
  try {
    const s = typeof localStorage !== 'undefined' && localStorage.getItem(LS_KEY);
    if (s && MUSIC_MODES.includes(s)) return s;
  } catch { /* private window: storage throws, and that is not an error here */ }
  try {
    if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) return 'bed';
  } catch { /* no matchMedia */ }
  return 'full';
}

export function storeMusicMode(m) {
  if (!MUSIC_MODES.includes(m)) return false;
  try { localStorage.setItem(LS_KEY, m); return true; } catch { return false; }
}

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const lerp = (a, b, k) => a + (b - a) * k;
const fin = (x, d) => (typeof x === 'number' && isFinite(x) ? x : d);

// xorshift32. Seeded, so a bounce is reproducible; seeded from Math.random() by default, so two
// attempts at the same level never hear the same chord sequence - which is half the point.
function rngOf(seed) {
  let s = (seed >>> 0) || 0x9e3779b9;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
}

export class Score {
  constructor(opts = {}) {
    this.mode = MUSIC_MODES.includes(opts.mode) ? opts.mode : resolveMusicMode(opts.query || Q);
    const q = opts.query || Q;
    this.enabled = typeof window !== 'undefined' && !!(window.AudioContext || window.webkitAudioContext)
      && !q.has('cal') && q.get('clean') !== '1' && q.get('sound') !== '0' && !q.has('mute')
      && this.mode !== 'off';
    this.seed = fin(opts.seed, (Math.random() * 0xffffffff) >>> 0);
    this._blank();
    if (!this.enabled) return;
    this._wake = this._wake.bind(this);
    for (const e of ['pointerdown', 'keydown', 'touchstart']) addEventListener(e, this._wake, { passive: true });
  }

  _blank() {
    this.ac = null; this.out = null; this.master = null; this.duckG = null;
    this.bedG = null; this.pulseG = null; this.noise = null;
    this.voices = []; this.breath = null; this.shim = null;
    this.level = null; this.preset = null; this.rng = rngOf(this.seed);
    this.dens = 0.5; this.bright = 0.5; this.pulseState = null;
    this.silent = false; this.pulseN = 0; this.chordN = 0;
    this.nextPulse = 0; this.nextChord = 0; this.fifth = 0; this.rootSemi = 0; this.pulseAt = 0;
    this._pending = null; this._swapAt = 0;
    this._gFrom = 1; this._gTo = 1; this._gT0 = 0; this._gT1 = 0;
    this._settle = false; this._wrote = 0;
    this._cDens = 0.5; this._cBright = 0.35; this._cPulseG = 0;
  }

  _wake() {
    if (!this.enabled || this.ac) return;
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      this._attach(ac, ac.destination);
    } catch { this.enabled = false; return; }
    if (this.ac.state === 'suspended') this.ac.resume();
    // A level asked for before the first gesture is honoured as soon as there is a context.
    if (this.level && !this.preset) this.start(this.level);
  }

  // DEV-TOOL ENTRY POINT. Binds a Score to a context somebody else owns - an OfflineAudioContext
  // for a bounce - without running the constructor, so no gesture listeners are registered and
  // the URL flags are not consulted. src/audio/score-preview.js is the only caller; nothing the
  // game loads calls this, exactly as src/raid/raid-audio-preview.js is arranged.
  static forOffline(ac, dest, opts = {}) {
    const s = Object.create(Score.prototype);
    s.mode = MUSIC_MODES.includes(opts.mode) ? opts.mode : 'full';
    s.enabled = true;
    s.seed = fin(opts.seed, 0x1234abcd);
    s._blank();
    s._attach(ac, dest || ac.destination);
    return s;
  }

  _attach(ac, dest) {
    this.ac = ac; this.out = dest;
    // ONE MUSIC BUS. master carries silence()/resume(); duck carries duck(), which is the same
    // arrangement engine-audio-layers.js uses so a slam can pull the bed down through a node
    // the frame loop never touches. Music ducks DEEPER than the engine does: it is the one
    // thing in the mix that is never carrying information.
    const master = ac.createGain(); master.gain.value = 0;
    const duckG = ac.createGain(); duckG.gain.value = 1;
    const bedG = ac.createGain(); bedG.gain.value = 0;
    const pulseG = ac.createGain(); pulseG.gain.value = 0;
    bedG.connect(duckG); pulseG.connect(duckG);
    duckG.connect(master).connect(dest);
    this.master = master; this.duckG = duckG; this.bedG = bedG; this.pulseG = pulseG;
    this.noise = scoreNoise(ac);
    // master.gain really is 0 here, so the fade tracker has to agree with it or the first
    // fade-in would start from full and the bed would arrive rather than appear.
    this._gFrom = 0; this._gTo = 0; this._gT0 = 0; this._gT1 = 0;
  }

  get ready() { return !!(this.enabled && this.ac && this.master); }
  get playing() { return !!(this.ready && this.preset && this.voices.length); }
  get nodeCount() {
    if (!this.preset) return this.ready ? 4 : 0;
    let n = 4 + this.voices.reduce((a, v) => a + 6 + (v.lf ? 3 : 0), 0);
    if (this.breath) n += 6;
    if (this.shim) n += 6;
    return n;
  }

  setMode(m) {
    if (!MUSIC_MODES.includes(m)) return false;
    this.mode = m;
    if (m === 'off') { this.stop(); this.enabled = false; return true; }
    if (this.ready && this.preset) this._dials(this.ac.currentTime, 0, true);
    return true;
  }

  // ---- build ------------------------------------------------------------------------------
  //
  // `start('free')` is a real, supported call and it produces SILENCE - no voices, no pulse, no
  // sound at all. Free ride has no clock, no threat and no goal, so there is nothing for music
  // to adapt to; any music there would be static music, and the one study that measured this
  // found static music scored BELOW silence on reported tension. The engine is the music in
  // free ride. Being able to be silent and mean it is a feature of this module, not a gap.
  start(level, opts = {}) {
    if (!this.ready) { this.level = level; return false; }
    this.stopVoices();
    this.level = level;
    const P = PRESETS[level] || null;
    this.preset = P;
    if (!P) { this._fade(0, 0.5); return true; }

    const ac = this.ac, t = ac.currentTime + 0.02;
    this.rng = rngOf(fin(opts.seed, this.seed ^ (level.length * 2654435761)));
    this.dens = fin(opts.density, clamp01(lerp(P.dens[0], P.dens[1], 0.35)));
    this.bright = fin(opts.brightness, 0.35);
    this.fifth = 0;
    this.rootSemi = 0;
    this.pulseN = 0; this.chordN = 0; this.nextPulse = 0; this._wrote = 0;
    this.nextChord = t + lerp(P.chordEvery[0], P.chordEvery[1], this.rng());

    const cents = (i) => lerp(P.detune[0], P.detune[1], this.rng()) * (i % 2 ? 1 : -1) * -1;
    for (let i = 0; i < P.voices; i++) {
      const semi = P.iv[i % P.iv.length] + 12 * Math.floor(i / P.iv.length);
      const f0 = foldToBand(P.tonicHz * semiToRatio(semi), P.band[0], P.band[1]);
      const v = buildVoice(ac, this.bedG, {
        wave: P.wave, f0, cents: cents(i), ceil: P.ceil,
        cut: Math.min(P.ceil, f0 * lerp(P.bright[0], P.bright[1], this.bright)),
        gainPeriod: P.cycles.gain[i % 5], filtPeriod: P.cycles.filt[i % 5],
      });
      // Every voice's swell starts at a different point in its own cycle, and the offsets are
      // seeded, so attempt twenty does not open the way attempt one did.
      phaseOffset(v.lg, t, 1 / P.cycles.gain[i % 5], this.rng());
      if (v.lf) phaseOffset(v.lf, t, 1 / P.cycles.filt[i % 5], this.rng());
      v.lg.start(t); if (v.lf) v.lf.start(t);
      // ⚠️ THE VOICES START TOGETHER. Components that share an onset within 15-30 ms fuse into
      // one perceived object; that is exactly what we want the bed to do with ITSELF, so that
      // it reads as one thing and not five. It is also why they must not share an onset with
      // anything the game emits.
      v.a.start(t); v.b.start(t);
      this.voices.push(v);
    }

    if (P.noise) {
      this.breath = buildBreath(ac, this.bedG, {
        buffer: this.noise, band: P.noise.band, q: P.noise.q, period: P.cycles.breath,
      });
      phaseOffset(this.breath.lg, t, 1 / P.cycles.breath, this.rng());
      this.breath.lg.start(t);
      this.breath.src.start(t, this.rng() * 2);
    }
    if (P.shimmer) {
      this.shim = buildShimmer(ac, this.bedG, {
        f0: this._shimHz(), q: P.shimmer.q, detune: P.shimmer.detune, period: P.cycles.shim,
      });
      phaseOffset(this.shim.lg, t, 1 / P.cycles.shim, this.rng());
      this.shim.lg.start(t); this.shim.a.start(t); this.shim.b.start(t);
    }

    this.bedG.gain.setValueAtTime(P.level, t);
    this.pulseG.gain.setValueAtTime(P.pulse ? P.pulse.level : 0, t);
    this._cDens = this.dens; this._cBright = this.bright; this._cPulseG = P.pulse ? P.pulse.level : 0;
    this._dials(t, 0, true);
    this.silent = false;
    // ⚠️ 2.4 s of fade-in. Nothing in this module is allowed to click on, and the one-shot LFO
    // phase offsets above happen inside the first 2 ms of it, while the master is still at zero.
    this._fade(1, fin(opts.fadeIn, 2.4), t);
    return true;
  }

  setLevel(level, fade = 1.2) {
    if (level === this.level && this.playing) return false;
    if (!this.ready) { this.level = level; return false; }
    if (!this.playing) { return this.start(level); }
    this._pending = level;
    this._swapAt = this.ac.currentTime + fade;
    this._fade(0, fade);
    return true;
  }

  // ---- drive ------------------------------------------------------------------------------
  update(st, dt) {
    if (!this.ready) return;
    const t = this.ac.currentTime;
    const s = st || {};

    if (this._pending && t >= this._swapAt) { const L = this._pending; this._pending = null; this.start(L); return; }
    if (s.level && s.level !== this.level && !this._pending) { this.setLevel(s.level); return; }
    if (!this.preset) return;

    if (typeof s.secondsLeft === 'number') {
      const [d, b] = this.stuntDial(s.secondsLeft);
      this.dens = d; this.bright = b;
    } else {
      const g = typeof s.intensity === 'number' ? clamp01(s.intensity) : null;
      if (typeof s.density === 'number') this.dens = clamp01(s.density);
      else if (g !== null) this.dens = clamp01(lerp(this.preset.dens[0], this.preset.dens[1], g));
      if (typeof s.brightness === 'number') this.bright = clamp01(s.brightness);
      else if (g !== null) this.bright = g;
    }
    if (s.settle) this._settle = true;
    this.pulseState = (typeof s.pulse === 'number' && isFinite(s.pulse)) ? clamp01(s.pulse) : null;

    this._dials(t, fin(dt, 1 / 60), false);
    if (t >= this.nextChord) this._chord(t);
    this._pulses(t);
  }

  // The shimmer is part of the chord, not a fixed whistle: it sits on the fifth of whatever the
  // chord currently is, folded up into its own band. A tuned sustained tone that MOVES with the
  // harmony reads as the top of the bed; one that sat still would read as a tone generator.
  _shimHz() {
    const P = this.preset;
    return foldToBand(P.tonicHz * semiToRatio(this.rootSemi + 7), P.shimmer.band[0], P.shimmer.band[1]);
  }

  // The stunt stage's four discrete steps. Discrete on purpose: a smooth ramp over 120 s is a
  // ramp nobody notices, four steps is something a player learns and then stops watching the
  // HUD for.
  stuntDial(secondsLeft) {
    const s = fin(secondsLeft, 999);
    for (const [at, d, b] of STUNT_STEPS) if (s > at) return [d, b];
    return [1, 1];
  }

  // ⚠️ THE DIALS WRITE `.value`, NOT AUTOMATION, AND THAT IS DELIBERATE.
  //
  // A dial scheduled every frame is 60 AudioParam events a second per voice, and non-Gecko
  // engines linear-scan that event list - over a seven-minute raid the list grows without
  // bound and the scan gets slower the longer you play. The documented fix is to swap the node
  // out periodically, which is not something you can do to a sustained voice without a seam.
  //
  // So the smoothing happens HERE, in JavaScript, at frame rate, and the result is written to
  // `.value`. A `.value` write is not an event: it sets the intrinsic value at the next render
  // quantum and leaves no entry behind. With a 0.75 s time constant at 60 fps no single frame
  // ever moves a gain by more than about 2% of the remaining distance, which on a bed voice at
  // 0.18 full-scale is a step of 0.004 - some 48 dB down, and inaudible.
  //
  // The consequence is the one the research asked for: over a whole raid the permanent graph
  // accumulates only the one-shot LFO phase offsets, the chord glides, and the handful of
  // fades. `_wrote` counts the `.value` writes so a suite can see the work; `stats()` reports
  // it, and test-score.mjs counts the real automation events separately.
  _dials(t, dt, force) {
    const P = this.preset;
    if (!P) return;
    const kA = force ? 1 : Math.min(1, Math.max(0, fin(dt, 0)) / 0.75);
    const kB = force ? 1 : Math.min(1, Math.max(0, fin(dt, 0)) / 1.10);
    this._cDens += (this.dens - this._cDens) * kA;
    this._cBright += (this.bright - this._cBright) * kA;
    const n = this.voices.length || 1;
    const bedOnly = this.mode === 'bed';
    for (let i = 0; i < this.voices.length; i++) {
      const v = this.voices[i];
      const w = clamp01(this._cDens * n - i);
      const u = (0.9 / n) * w;
      v.sw.gain.value = 0.55 * u;
      v.ld.gain.value = 0.45 * u;
      // the cutoff target follows the chord as well as the brightness dial, which is why
      // _chord() never has to touch a filter: it moves the pitch and this follows it.
      const tgt = Math.min(v.ceil, Math.max(50, v.f0 * lerp(P.bright[0], P.bright[1], this._cBright)));
      v.cut += (tgt - v.cut) * kB;
      v.lp.frequency.value = v.cut;
      if (v.fd) v.fd.gain.value = v.cut * 0.28;
      this._wrote += v.fd ? 4 : 3;
    }
    if (this.breath) {
      const g = P.noise.level * clamp01(this._cDens * 1.4);
      this.breath.g.gain.value = g * 0.6;
      this.breath.ld.gain.value = g * 0.4;
      this._wrote += 2;
    }
    if (this.shim) {
      // For a sine-voiced preset the brightness dial has nowhere useful to go in the low band,
      // so it drives the shimmer instead: level and swell depth together.
      //
      // ⚠️ THE SHIMMER HAS A FLOOR AND THE OTHER VOICES DO NOT. It is the only part of this
      // module a phone speaker can reproduce, so it must not be the first thing the density dial
      // takes away. Measured: the Harbour Mouth, whose dials sit low by design, came back 20 dB
      // below the Viking raid in the 3-6 kHz band and -57 LUFS through the phone simulation -
      // which is inaudible. It never falls below a quarter of its full level now.
      const g = P.shimmer.level * lerp(0.55, 1, this._cBright) * lerp(0.45, 1, clamp01(this._cDens * 1.25));
      this.shim.g.gain.value = g * 0.6;
      this.shim.ld.gain.value = g * 0.4;
      this._wrote += 2;
    }
    const pg = (P.pulse && !bedOnly) ? P.pulse.level : 0;
    this._cPulseG += (pg - this._cPulseG) * (force ? 1 : kA);
    this.pulseG.gain.value = this._cPulseG;
    this._wrote += 1;
  }

  // THE CHORD. A walk on the circle of fifths inside a window, which guarantees a common tone
  // with the chord before it - move the root by a fifth and the new quintal stack still
  // contains the old fifth. That is the cheap, robust version of Mini Motorways' common-tone
  // chord network, and it is why the bed can change harmony without ever sounding like it cut.
  //
  // ⚠️ THE MOVE IS A GLIDE OF ~2-3.5 SECONDS, PER VOICE, AT DIFFERENT RATES. A chord that
  // arrives is a transient and would break the whole stream-segregation argument; a chord that
  // drifts is still the same sustained object. The per-voice rates differ so it does not sound
  // like a tape slowing down.
  _chord(t) {
    const P = this.preset;
    const span = P.spanFifths;
    let step = this.rng() < 0.5 ? 1 : -1;
    if (this._settle) { step = -1; this._settle = false; }
    let p = this.fifth + step;
    if (p > span || p < -span) p = this.fifth - step;
    this.fifth = p;
    this.rootSemi = ((p * 7) % 12 + 12) % 12;
    for (let i = 0; i < this.voices.length; i++) {
      const v = this.voices[i];
      const semi = this.rootSemi + P.iv[i % P.iv.length] + 12 * Math.floor(i / P.iv.length);
      const f = foldToBand(P.tonicHz * semiToRatio(semi), P.band[0], P.band[1]);
      const glide = lerp(1.9, 3.4, this.rng());
      for (const o of [v.a, v.b]) {
        o.frequency.cancelScheduledValues(t);
        o.frequency.setValueAtTime(v.f0, t);
        o.frequency.exponentialRampToValueAtTime(Math.max(20, f), t + glide);
      }
      v.f0 = f;   // the cutoff follows in _dials(), so no filter automation is written here
      this._wrote += 4;
    }
    if (this.shim) {
      const f = this._shimHz(), g = lerp(2.4, 3.9, this.rng());
      for (const oo of [this.shim.a, this.shim.b]) {
        oo.frequency.cancelScheduledValues(t);
        oo.frequency.setValueAtTime(this.shim.hz || f, t);
        oo.frequency.exponentialRampToValueAtTime(Math.max(20, f), t + g);
      }
      this.shim.bp.frequency.value = f;
      this.shim.hz = f;
    }
    this.chordN++;
    this.nextChord = t + lerp(P.chordEvery[0], P.chordEvery[1], this.rng());
  }

  // THE PULSE. Not a sequencer and not a tempo: each pulse works out when the next one falls
  // from the state at the moment it fires, so the gap answers the game and cannot drift out of
  // step with it. A 150 ms lookahead against ac.currentTime means a late frame cannot make a
  // late pulse.
  _pulses(t) {
    const P = this.preset && this.preset.pulse;
    if (!P || this.mode === 'bed' || this.pulseState === null) { this.nextPulse = 0; return; }
    if (!this.nextPulse) this.nextPulse = t + 0.3;
    const LOOK = 0.15;
    let guard = 0;
    while (this.nextPulse < t + LOOK && guard++ < 8) {
      const when = Math.max(t, this.nextPulse);
      // The pulse sits on the chord's root, folded into its own narrow band. That is the whole
      // of part C's idea applied to the one thing this module owns, and it costs nothing.
      const hz = foldToBand(P.hz * semiToRatio(this.rootSemi), P.hz * 0.8, P.hz * 1.58);
      playPulse(this.ac, this.pulseG, when, { hz, level: 1, attack: P.attack, decay: P.decay });
      this.pulseN++; this.pulseAt = when;
      const gap = lerp(P.slow, P.fast, this.pulseState);
      // The Harbour Mouth's pulse is metronomic BY DESIGN - it is a clock you steer to - and
      // there slow === fast, so it gets no jitter. Everywhere else a trace of unsteadiness is
      // what keeps it from reading as a machine.
      const jit = P.slow === P.fast ? 0 : (this.rng() - 0.5) * 0.05 * gap;
      this.nextPulse = when + gap + jit;
    }
  }

  // ---- level, silence, teardown -----------------------------------------------------------
  _fade(to, sec, at) {
    const t = at !== undefined ? at : this.ac.currentTime;
    const g = this.master.gain, from = this._gain(t);
    g.cancelScheduledValues(t);
    g.setValueAtTime(from, t);
    g.linearRampToValueAtTime(Math.max(0, to), t + Math.max(0.02, sec));
    this._gFrom = from; this._gTo = to; this._gT0 = t; this._gT1 = t + Math.max(0.02, sec);
  }

  _gain(t) {
    if (t >= this._gT1) return this._gTo;
    if (t <= this._gT0) return this._gFrom;
    return lerp(this._gFrom, this._gTo, (t - this._gT0) / (this._gT1 - this._gT0));
  }

  // SILENCE AND RETURN WITHOUT A SEAM. Everything keeps running underneath - the voices, the
  // swells, the filter cycles, the chord clock - so the music that comes back is at a place in
  // its own cycles it has never been before. Nothing restarts, so there is nothing to click.
  silence(fade = 0.7) { if (!this.ready) return false; this._fade(0, fade); this.silent = true; return true; }
  resume(fade = 1.8) { if (!this.ready) return false; this._fade(1, fade); this.silent = false; return true; }

  // Pull the music down for a moment. Same shape as engine-audio-layers.js's duckFor, through a
  // node the frame loop never touches, and deeper than the engine's own duck: the music is the
  // one element in the mix that never carries information, so it is the one that should move.
  duck(depth = 0.6, hold = 0.35) {
    if (!this.ready) return false;
    const t = this.ac.currentTime, g = this.duckG.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(Math.min(1, Math.max(0.02, 1 - clamp01(depth))), t);
    g.linearRampToValueAtTime(1, t + Math.max(0.05, fin(hold, 0.35)));
    return true;
  }

  stopVoices() {
    const t = this.ac ? this.ac.currentTime : 0;
    const kill = (n) => { try { n.stop(t); } catch { /* already stopped */ } try { n.disconnect(); } catch { /* gone */ } };
    for (const v of this.voices) { kill(v.a); kill(v.b); kill(v.lg); if (v.lf) kill(v.lf); try { v.lp.disconnect(); v.sw.disconnect(); v.ld.disconnect(); if (v.fd) v.fd.disconnect(); if (v.dd) v.dd.disconnect(); } catch { /* gone */ } }
    if (this.breath) { kill(this.breath.src); kill(this.breath.lg); try { this.breath.g.disconnect(); } catch { /* gone */ } }
    if (this.shim) { kill(this.shim.a); kill(this.shim.b); kill(this.shim.lg); try { this.shim.g.disconnect(); } catch { /* gone */ } }
    this.voices = []; this.breath = null; this.shim = null;
  }

  stop() {
    if (!this.ac) { this.preset = null; this.level = null; return; }
    this.stopVoices();
    this.preset = null; this.level = null;
    try { this.master.gain.setValueAtTime(0, this.ac.currentTime); } catch { /* gone */ }
    this._gFrom = 0; this._gTo = 0;
  }

  // Everything a suite or a bounce wants to know, in one object.
  stats() {
    return {
      level: this.level, mode: this.mode, playing: this.playing, silent: this.silent,
      voices: this.voices.length, nodes: this.nodeCount, pulses: this.pulseN,
      chords: this.chordN, paramWrites: this._wrote,
      freqs: this.voices.map((v) => Math.round(v.f0 * 100) / 100),
      fifth: this.fifth, rootSemi: this.rootSemi,
      dens: Math.round(this.dens * 1000) / 1000, bright: Math.round(this.bright * 1000) / 1000,
    };
  }
}

export { PRESETS, STUNT_STEPS };
