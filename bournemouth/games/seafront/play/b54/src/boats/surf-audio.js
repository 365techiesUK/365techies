// THE SURF'S SOUND (26 Sep 2026, PIER SURF stage 2). Driven from engine-audio.js, which owns
// the one AudioContext every craft shares, its gesture wake-up and its mute: this file creates
// no context of its own, so the game's master sound switch, ?sound=0, ?mute and the clean
// render all reach it with no new wiring.
//
// WHAT YOU HEAR, all of it from the same sea the board is riding (surfboard.js `wave`, `crests`):
//   * THE BREAK - a low roar that grows the further into the surf zone you are (foam and
//     breaking under the board), and is a distant rumble outside it.
//   * EACH WAVE THAT REACHES YOU - a crash, as loud as the wave was breaking when it went past.
//   * WHITEWATER FIZZ around you, from the foam cover.
//   * PADDLING - soft alternate-hand splashes at the stroke rate.
//   * UNDER A DUCK-DIVE - everything drops to a muffled low-pass and a few bubbles.
//   * RIDING - the board's hiss, rising with speed; a splash as you pop up, kick out or fall.
//
// Nothing here reads a clock or writes to the board. No Math.random: one small generator, so a
// bounce of this file sounds the same twice.
//
// AND A SOUND FOR EVERY REWARD (27 Sep 2026, stage 3). The audit ('show') found carves, the
// multiplier, a counted wave and the win all silent: the HUD said it and the ears heard nothing.
// surfCue() at the bottom plays one short cue per level event, built from the same primitives as
// everything above (burst, bubbles, the one noise buffer) plus a 2-4 oscillator chime. They are a
// UI layer, not the sea: every one sits well under the surf bed (measured offline, not by ear -
// tmp-audit/stage3-feedback/render-cues.mjs) and none is longer than a second except the horn.

const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const fin = (x, d = 0) => (Number.isFinite(x) ? x : d);

// All the reward cues together, in one number (the gain of the `cue` bus below). 27 Sep 2026: set
// from an offline render, not by ear (nobody has listened). With it at 0.5 the loudest 100 ms of the
// loudest cue (the horn, then the wave sting) measured 7.5 dB under the bed's RMS while riding a
// face (-35.5 against -28.0 dBFS), the quietest (duck_clean) 11.4 dB under, and nothing peaked above
// -10.4 dBFS even with ten cues fired at once over the loudest whitewater. Re-run
// tmp-audit/stage3-feedback/render-cues.mjs before moving this, or any cue's gain below.
const CUE_LEVEL = 0.5;

export function buildSurf(ac, master, noise) {
  const sources = [];
  const loop = (rate, off) => {
    const s = ac.createBufferSource(); s.buffer = noise; s.loop = true; s.playbackRate.value = rate;
    s.start(ac.currentTime, off || 0); sources.push(s); return s;
  };
  const bus = ac.createGain(); bus.gain.value = 1;
  const under = ac.createBiquadFilter(); under.type = 'lowpass'; under.frequency.value = 16000; under.Q.value = 0.5;
  bus.connect(under).connect(master);

  // The break: two decorrelated loops so the roar has no audible repeat, low-passed.
  const bedA = loop(1.0, 0), bedB = loop(0.71, 0.37);
  const bedHP = ac.createBiquadFilter(); bedHP.type = 'highpass'; bedHP.frequency.value = 55;
  const bedLP = ac.createBiquadFilter(); bedLP.type = 'lowpass'; bedLP.frequency.value = 600; bedLP.Q.value = 0.4;
  const bedG = ac.createGain(); bedG.gain.value = 0;
  bedA.connect(bedHP); bedB.connect(bedHP);
  bedHP.connect(bedLP).connect(bedG).connect(bus);

  // Whitewater fizz.
  const fizN = loop(0.83, 0.61);
  const fizBP = ac.createBiquadFilter(); fizBP.type = 'bandpass'; fizBP.frequency.value = 3600; fizBP.Q.value = 0.55;
  const fizG = ac.createGain(); fizG.gain.value = 0;
  fizN.connect(fizBP).connect(fizG).connect(bus);

  // The board's hiss when riding.
  const sprN = loop(1.19, 0.13);
  const sprHP = ac.createBiquadFilter(); sprHP.type = 'highpass'; sprHP.frequency.value = 1800;
  const sprG = ac.createGain(); sprG.gain.value = 0;
  sprN.connect(sprHP).connect(sprG).connect(bus);

  // THE REWARD CUES' BUS (27 Sep 2026, stage 3). Every surfCue() voice ends here, and this goes
  // to `master` - the gain the surf bus above ends in - and NOT through `under`. `under` is the
  // sea closing over your head on a duck-dive (380 Hz), and 'duck_clean' fires on the very frame
  // you come up, while it is still shut: a reward chime that arrived muffled is a reward nobody
  // heard. Through `master` it is still this craft's sound and nothing else's: the game's mute is
  // setCraft(null), which fades and unplugs `master`, and ?sound=0 / ?mute / ?cal= / clean=1
  // never build any of this.
  const cue = ac.createGain(); cue.gain.value = CUE_LEVEL;
  cue.connect(master);

  return {
    surf: true, sources, bus, under, bedG, bedLP, fizG, sprG, sprHP, noise, cue,
    s: 0x51f7ea5, st: -1, crests: -1, strokeT: 0, hand: 1, oneShots: 0,
    cues: {}, cueFree: {}, cueDropped: 0,
    lv: { bed: 0, fizz: 0, spray: 0, under: 16000 },
  };
}

function rnd(v) {
  let t = (v.s += 0x6D2B79F5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// A burst of filtered noise: the building block of every one-shot below.
// `at` (s after now) and `out` (a node other than the surf bus) were added 27 Sep 2026 for the
// reward cues, which queue behind each other and go to the cue bus. Both default to what every
// older call already did, so those calls build exactly the graph they built before.
function burst(ac, v, { gain, dur, f0, f1, type = 'bandpass', q = 0.8, pan = 0, attack = 0.01, rate = 1, at = 0, out = null }) {
  const t = ac.currentTime + 0.005 + at;
  const src = ac.createBufferSource(); src.buffer = v.noise; src.playbackRate.value = rate;
  const f = ac.createBiquadFilter(); f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let last = g;
  if (ac.createStereoPanner && pan) { const p = ac.createStereoPanner(); p.pan.value = pan; g.connect(p); last = p; }
  src.connect(f).connect(g); last.connect(out || v.bus);
  src.start(t, rnd(v) * 0.8); src.stop(t + dur + 0.05);
  v.oneShots++;
}

// `at`, `out` and `lvl` added 27 Sep 2026 for the cues; the defaults are the old call exactly.
function bubbles(ac, v, n, at = 0, out = null, lvl = 0.05) {
  for (let i = 0; i < n; i++) {
    const t = ac.currentTime + 0.05 + at + i * (0.06 + 0.08 * rnd(v));
    const o = ac.createOscillator(), g = ac.createGain();
    const f = 380 + 520 * rnd(v);
    o.type = 'sine'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 1.9, t + 0.05);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(lvl, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    o.connect(g).connect(out || v.bus); o.start(t); o.stop(t + 0.09);
    v.oneShots++;
  }
}

// Per drawn frame. h: the SurfBoard. live: 0 when the sim is paused (everything fades).
export function updateSurf(ac, v, h, dt, live) {
  const t = ac.currentTime, set = (p, val, tc) => p.setTargetAtTime(fin(val), t, tc);
  const w = h.wave || {};
  const foam = clamp(fin(w.foam), 0, 1), brk = clamp(fin(w.brk), 0, 1), amp = clamp(fin(w.amp), 0, 2);
  const state = h.state | 0, speed = Math.hypot(fin(h.vx), fin(h.vz));
  // How far into the surf zone you are: 0 outside the break, 1 in the whitewater.
  const inside = clamp(Math.max(foam, brk * 0.8) * clamp(amp / 0.35, 0, 1), 0, 1);
  const lv = v.lv;
  lv.bed = live * (0.10 + 0.34 * inside);
  lv.fizz = live * 0.22 * foam;
  lv.spray = live * (state === 2 && !h.air ? 0.30 * clamp((speed - 1.5) / 5, 0, 1) : 0);   // (no hiss in the air: stage 6)
  lv.under = state === 1 ? 380 : 16000;
  set(v.bedG.gain, lv.bed, 0.35);
  set(v.bedLP.frequency, 480 + 900 * inside, 0.4);
  set(v.fizG.gain, lv.fizz, 0.2);
  set(v.sprG.gain, lv.spray, 0.12);
  set(v.sprHP.frequency, 1500 + 260 * speed, 0.2);
  set(v.under.frequency, lv.under, state === 1 ? 0.04 : 0.18);

  if (!live) return;
  // Each wave that reaches you, as hard as it was breaking.
  if (v.crests < 0) v.crests = h.crests | 0;
  if ((h.crests | 0) > v.crests) {
    v.crests = h.crests | 0;
    const g = 0.12 + 0.55 * clamp(fin(h.crestBrk), 0, 1) * clamp(fin(h.crestAmp) / 0.6, 0, 1);
    burst(ac, v, { gain: g, dur: 1.5, f0: 1600, f1: 260, type: 'lowpass', q: 0.5, attack: 0.05, rate: 0.8 });
  }
  // State changes: into the water, up on the board, off it.
  if (v.st < 0) v.st = state;
  if (state !== v.st) {
    const was = v.st; v.st = state;
    if (state === 1) { burst(ac, v, { gain: 0.25, dur: 0.4, f0: 1400, f1: 300, q: 0.9 }); bubbles(ac, v, 5); }
    else if (state === 2) burst(ac, v, { gain: 0.2, dur: 0.35, f0: 2600, f1: 900, q: 0.7 });
    else if (state === 3) burst(ac, v, { gain: 0.45, dur: 1.0, f0: 1800, f1: 220, type: 'lowpass', q: 0.4, attack: 0.02 });
    else if (state === 0 && was === 2) burst(ac, v, { gain: 0.14, dur: 0.45, f0: 2000, f1: 500, q: 0.7 });
  }
  // Paddling: one hand then the other, faster with more effort.
  if (state === 0 && fin(h.thr) > 0.1) {
    v.strokeT -= dt;
    if (v.strokeT <= 0) {
      v.strokeT = 0.62 / (0.6 + 0.4 * fin(h.thr));
      v.hand = -v.hand;
      burst(ac, v, { gain: 0.05 + 0.05 * fin(h.thr), dur: 0.22, f0: 2400, f1: 900, q: 1.1, pan: 0.35 * v.hand });
    }
  } else v.strokeT = 0.1;
}

// `cues` / `cueDropped` added 27 Sep 2026: how many of each reward cue have played (keyed by the
// name the level passed), so a headless test can prove every kind fires without ears.
export function surfDebug(v) {
  return { surf: true, bed: +v.lv.bed.toFixed(3), fizz: +v.lv.fizz.toFixed(3), spray: +v.lv.spray.toFixed(3),
    under: v.lv.under, oneShots: v.oneShots, crests: v.crests,
    cues: { ...(v.cues || {}) }, cueDropped: v.cueDropped | 0 };
}

// ================================================================================================
// THE REWARD CUES (27 Sep 2026, PIER SURF stage 3).
//
// surfCue(ac, v, kind, arg) - kind is the level's own event name, arg that event's payload:
//   'popup'      a band-noise sweep up and a 90 Hz thump: you are on your feet
//   'move'       a swish and a chime that climbs C D E G (523 / 587 / 659 / 784 Hz) with arg.n, the
//                move's number in this ride, so four moves are a tune; the fifth and on stay on G
//   'ride_mult'  a short major arpeggio, a whole step higher for each of arg.mult 2, 3, 4
//                (x4 adds the octave on top)
//   'wave'       a counted wave: a shimmer and a four-note strum, about 1 s
//   'pb'         a new personal best: three rising notes
//   'horn'       the end of a heat: a contest air horn, about 1.2 s
//   'kickout'    an up-sweep: off the back on your own terms
//   'early'      a soft bloop: not yet
//   'pearl'      a roar and bubbles; arg.why === 'falls' (or kind 'falls') is lower and heavier
//   'duck_clean' bubbles and a rising tick-tick
//   'set'        a low swell: a set is coming
//   'section'    a rising hiss, the lip feathering: the breaking part is closing on you (stage 6)
//   'lost'       a short down-slide: LOST IT ('move_lost', the level's name for it, plays the same)
// Returns true if it will sound, false if not (unknown kind, no cue bus, or dropped - below).
//
// ONE AT A TIME PER LANE. Several events can land in one frame: a ride that ends banks every move
// still waiting (judge.js end()), and the last wave of a heat can be a counted wave, a personal
// best and the horn at once. Played together those are a smear, so each kind (and the three big
// stings, which share one lane) waits for the one before it - moves banked together come out as a
// run up the scale instead of a chord. A cue that would have to wait longer than its lane allows
// is dropped and counted (cueDropped), so a bug that fires an event every frame costs a few cues,
// not a wall of sound.

const MOVE_HZ = [523.25, 587.33, 659.25, 783.99];            // C5 D5 E5 G5
// Seconds a lane stays busy after a cue in it starts.
const CUE_GAP = {
  popup: 0.25, move: 0.13, ride_mult: 0.3, kickout: 0.3, early: 0.25, duck_clean: 0.3, set: 0.8, lost: 0.25, section: 0.7,
  wave: 0.85, pb: 0.7, horn: 1.1, pearl: 0.6, falls: 0.6,
};
const LANE = { wave: 'big', pb: 'big', horn: 'big', pearl: 'wipe', falls: 'wipe' };
const MAXQ = { big: 2.6 };                                   // s a cue may wait in its lane; 0.6 otherwise
const ALIAS = { move_lost: 'lost' };

// One oscillator through its own envelope onto the cue bus: a struck note (f), or a glide (f -> f1).
// `hold` keeps it at full level before the decay (the horn).
function tone(ac, v, { f, f1 = 0, at = 0, dur, gain, type = 'sine', attack = 0.006, hold = 0, out = null }) {
  const t = ac.currentTime + 0.005 + at;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + attack);
  if (hold) g.gain.setValueAtTime(gain, t + attack + hold);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(out || v.cue); o.start(t); o.stop(t + dur + 0.03);
  v.oneShots++;
}

// d: seconds this cue waits in its lane. a: the event's payload (never null here).
const CUES = {
  popup(ac, v, d) {
    burst(ac, v, { gain: 0.14, dur: 0.32, f0: 700, f1: 2600, q: 1.4, attack: 0.03, at: d, out: v.cue });
    tone(ac, v, { f: 90, f1: 60, at: d, dur: 0.2, gain: 0.18, attack: 0.004 });
  },
  move(ac, v, d, a) {
    const hz = MOVE_HZ[clamp((fin(a.n, 1) | 0) - 1, 0, 3)];
    burst(ac, v, { gain: 0.1, dur: 0.2, f0: 1800, f1: 5200, q: 1.0, attack: 0.02, at: d, out: v.cue });
    tone(ac, v, { f: hz, at: d + 0.03, dur: 0.45, gain: 0.14, type: 'triangle' });
    tone(ac, v, { f: hz * 2, at: d + 0.03, dur: 0.3, gain: 0.045 });
  },
  ride_mult(ac, v, d, a) {
    const m = clamp(fin(a.mult, 2) | 0, 2, 4), base = 523.25 * 2 ** ((m - 2) * 2 / 12);
    const steps = m === 4 ? [1, 1.26, 1.498, 2] : [1, 1.26, 1.498];
    steps.forEach((r, i) => tone(ac, v, { f: base * r, at: d + i * 0.07, dur: 0.3, gain: 0.15, type: 'triangle' }));
  },
  wave(ac, v, d) {
    burst(ac, v, { gain: 0.1, dur: 0.5, f0: 3000, f1: 7000, type: 'highpass', q: 0.7, attack: 0.08, at: d, out: v.cue });
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      tone(ac, v, { f, at: d + 0.05 + i * 0.025, dur: 0.92 - i * 0.025, gain: 0.07, type: 'triangle' }));
  },
  pb(ac, v, d) {
    [[523.25, 0.3], [783.99, 0.3], [1046.5, 0.52]].forEach(([f, dur], i) =>
      tone(ac, v, { f, at: d + i * 0.11, dur, gain: 0.15, type: 'triangle' }));
  },
  horn(ac, v, d) {
    // Two saws a few cents apart and a square an octave up, through one low-pass: a contest horn
    // heard from the water, not a klaxon in your ear.
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1500; lp.Q.value = 0.7;
    lp.connect(v.cue);
    tone(ac, v, { f: 233.1, at: d, dur: 1.2, gain: 0.06, type: 'sawtooth', attack: 0.06, hold: 0.8, out: lp });
    tone(ac, v, { f: 235.6, at: d, dur: 1.2, gain: 0.06, type: 'sawtooth', attack: 0.06, hold: 0.8, out: lp });
    tone(ac, v, { f: 466.2, at: d, dur: 1.2, gain: 0.03, type: 'square', attack: 0.06, hold: 0.8, out: lp });
  },
  kickout(ac, v, d) {
    burst(ac, v, { gain: 0.27, dur: 0.4, f0: 500, f1: 3400, q: 1.2, attack: 0.05, at: d, out: v.cue });
    tone(ac, v, { f: 330, f1: 880, at: d, dur: 0.3, gain: 0.12 });
  },
  early(ac, v, d) {
    tone(ac, v, { f: 440, f1: 250, at: d, dur: 0.2, gain: 0.13, attack: 0.012 });
  },
  pearl(ac, v, d, a) {
    const falls = a.why === 'falls';
    burst(ac, v, { gain: 0.34, dur: 0.7, f0: falls ? 1300 : 1700, f1: falls ? 160 : 260, type: 'lowpass', q: 0.5,
      attack: 0.03, rate: falls ? 0.6 : 0.75, at: d, out: v.cue });
    bubbles(ac, v, falls ? 5 : 4, d + 0.05, v.cue, 0.05);
  },
  falls(ac, v, d) { CUES.pearl(ac, v, d, { why: 'falls' }); },
  duck_clean(ac, v, d) {
    bubbles(ac, v, 3, d, v.cue, 0.075);
    tone(ac, v, { f: 900, f1: 1500, at: d + 0.2, dur: 0.07, gain: 0.15 });
    tone(ac, v, { f: 1350, f1: 2250, at: d + 0.29, dur: 0.07, gain: 0.13 });
  },
  set(ac, v, d) {
    burst(ac, v, { gain: 0.24, dur: 0.75, f0: 320, f1: 110, type: 'lowpass', q: 0.7, attack: 0.25, rate: 0.5, at: d, out: v.cue });
    tone(ac, v, { f: 82, f1: 70, at: d, dur: 0.75, gain: 0.07, attack: 0.25 });
  },
  section(ac, v, d) {
    burst(ac, v, { gain: 0.16, dur: 0.6, f0: 1400, f1: 6200, type: 'highpass', q: 0.8, attack: 0.3, at: d, out: v.cue });
  },
  lost(ac, v, d) {
    tone(ac, v, { f: 700, f1: 330, at: d, dur: 0.32, gain: 0.14, type: 'triangle' });
    tone(ac, v, { f: 1050, f1: 495, at: d, dur: 0.26, gain: 0.047 });
  },
};
// The kinds surfCue() plays (plus the alias 'move_lost'), for the level and the tests.
export const SURF_CUES = Object.freeze(Object.keys(CUES));

export function surfCue(ac, v, kind, arg) {
  const k = ALIAS[kind] || kind;
  const play = Object.prototype.hasOwnProperty.call(CUES, k) ? CUES[k] : null;
  if (!ac || !v || !v.surf || !v.cue || !play) return false;
  const lane = LANE[k] || k, now = ac.currentTime;
  const wait = Math.max(0, fin(v.cueFree[lane], -9) - now);
  if (wait > (MAXQ[lane] || 0.6)) { v.cueDropped++; return false; }
  v.cueFree[lane] = now + wait + CUE_GAP[k];
  play(ac, v, wait, arg && typeof arg === 'object' ? arg : {});
  v.cues[kind] = (v.cues[kind] || 0) + 1;
  return true;
}
