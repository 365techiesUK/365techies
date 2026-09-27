// THE SCORE - VOICE GRAPHS (tr184). Pure Web Audio graph construction. No game state reaches
// this file and it imports nothing from src/: it is given a context and a destination and it
// returns nodes. src/audio/score.js owns all the driving.
//
// ⚠️ NOT ONE THING IN HERE HAS A FAST ATTACK, and that is the entire design. The game already
// contains 55 cues and every one of them is a transient or a noise burst; the engine is the
// only sustained element and it never holds a pitch, it glides with rpm. So the music is made
// audible not by being in a free frequency band - there isn't one - but by being the one
// sustained, harmonically stable, slowly-moving object in the scene, which is what makes the
// ear file it as a separate stream (Bregman). Put a transient in here and it stops being a
// stream and becomes another cue fighting the engine, and it will lose.
//
// ⚠️ EVERY CYCLE IS AN OSCILLATOR, NOT AN AUTOMATION RAMP. A gain envelope scheduled at 140 bpm
// generates about 280 AudioParam events a minute, and non-Gecko engines linear-scan that list -
// over a seven-minute raid that is a real and growing cost. Here the swells and the filter
// sweeps are sub-audio OscillatorNodes wired into AudioParams, so a bed can run for the whole
// raid and add ZERO events per second. The only automation this file writes is the one-shot
// phase offset below.

// ---------------------------------------------------------------------------------------------
// The one-shot phase offset. An OscillatorNode always starts at phase zero and there is no way
// to ask for another, which would mean every run of a level started with all five swells in
// lockstep - attempt twenty would open exactly like attempt one for the first seventeen
// seconds. An oscillator's phase is the integral of its frequency, so running it very fast for
// two milliseconds advances it by an exact number of cycles and then it carries on normally.
// Two automation events, once, per LFO, and it happens while the master gain is still zero.
const PHASE_DT = 0.002;
export function phaseOffset(osc, t0, hz, frac) {
  const f = Math.max(0, frac % 1);
  osc.frequency.setValueAtTime(f / PHASE_DT, t0);
  osc.frequency.setValueAtTime(hz, t0 + PHASE_DT);
}

// Fold a frequency into [lo, hi] by octaves. Narrow bands are deliberate - the pirate preset's
// band is 1.27 octaves wide because everything sustained has to stay under the crew's first
// formant - so this gives up rather than looping forever if the band cannot hold the pitch.
export function foldToBand(f, lo, hi) {
  let x = f;
  for (let i = 0; i < 12 && x < lo; i++) x *= 2;
  for (let i = 0; i < 12 && x > hi; i++) x /= 2;
  return Math.min(hi, Math.max(lo, x));
}

export const semiToRatio = (s) => Math.pow(2, s / 12);

// White noise with a heavily low-passed copy of itself folded back in. Pure white is a hiss and
// nothing in this game is a hiss; engine-audio-layers.js builds its bank the same way and for
// the same reason. Deterministic xorshift, so two bounces of the same preset are identical.
export function scoreNoise(ac, seed = 0x5f3a91c7) {
  const len = Math.max(1, Math.floor(ac.sampleRate * 3));
  const buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
  let s = seed >>> 0, b = 0;
  for (let i = 0; i < len; i++) {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
    const w = ((s >>> 0) / 4294967296) * 2 - 1;
    b = 0.985 * b + 0.015 * w;
    d[i] = w * 0.3 + b * 2.6;
  }
  return buf;
}

const osc = (ac, type, f) => { const o = ac.createOscillator(); o.type = type; o.frequency.value = f; return o; };
const gain = (ac, g) => { const n = ac.createGain(); n.gain.value = g; return n; };
const filt = (ac, type, f, q) => { const n = ac.createBiquadFilter(); n.type = type; n.frequency.value = f; n.Q.value = q; return n; };

// ---------------------------------------------------------------------------------------------
// ONE BED VOICE.
//
//   oscA \
//         >-- filt ----------- swing --> dest
//   oscB /                       ^
//                                |
//   lfoGain (1/gainPeriod Hz) -> lfoDepth
//   lfoFilt (1/filtPeriod Hz) -> filtDepth -> filt.frequency
//                             \-> driftDepth -> oscA.detune
//
// `swing.gain` carries the voice's steady level and `lfoDepth.gain` its swell depth; both are
// scaled by the density dial, so a voice fades in and out of the texture without ever being
// gated on. The pair is always detuned - two voices per note, never one - because a single
// oscillator with perfect tuning is the single loudest tell that something is a synth patch.
//
// ⚠️ SINE VOICES GET NO FILTER LFO. A sine has no harmonics, so a moving low-pass does nothing
// to it but cost nodes; the movement in a sine voice is the beating against its detuned partner
// and its own swell. This matters: the pirate preset is sines precisely BECAUSE a sine cannot
// leak a harmonic into the crew's formant band however the filter is set, and that guarantee is
// worth more than a moving timbre.
export function buildVoice(ac, dest, o) {
  const a = osc(ac, o.wave, o.f0), b = osc(ac, o.wave, o.f0);
  a.detune.value = o.cents * 0.5; b.detune.value = -o.cents * 0.5;
  const lp = filt(ac, 'lowpass', Math.min(o.ceil, o.cut), 0.7);
  const sw = gain(ac, 0);
  a.connect(lp); b.connect(lp); lp.connect(sw).connect(dest);

  const lg = osc(ac, 'sine', 1 / o.gainPeriod), ld = gain(ac, 0);
  lg.connect(ld).connect(sw.gain);

  let lf = null, fd = null, dd = null;
  if (o.wave !== 'sine') {
    lf = osc(ac, 'sine', 1 / o.filtPeriod);
    fd = gain(ac, Math.min(o.ceil, o.cut) * 0.28);
    lf.connect(fd).connect(lp.frequency);
    dd = gain(ac, 2.2);            // +/- 2.2 cents of drift: the tuning is never quite right
    lf.connect(dd).connect(a.detune);
  }
  return { a, b, lp, sw, lg, ld, lf, fd, dd, f0: o.f0, ceil: o.ceil, cut: Math.min(o.ceil, o.cut) };
}

// The breath. A little noise under a pad is the difference between a sound and a synth patch,
// but it is band-limited and high-passed so it cannot spill into a protected band, and it
// breathes on its own cycle like everything else.
export function buildBreath(ac, dest, o) {
  const src = ac.createBufferSource(); src.buffer = o.buffer; src.loop = true;
  const hp = filt(ac, 'highpass', o.band[0], 0.7);
  const bp = filt(ac, 'bandpass', Math.sqrt(o.band[0] * o.band[1]), o.q);
  const g = gain(ac, 0);
  src.connect(hp).connect(bp).connect(g).connect(dest);
  const lg = osc(ac, 'sine', 1 / o.period), ld = gain(ac, 0);
  lg.connect(ld).connect(g.gain);
  return { src, hp, bp, g, lg, ld };
}

// The shimmer: the pirate preset's only voice above the crew's formants, and the only part of
// that preset a phone speaker can reproduce at all (a phone rolls off hard below ~500 Hz, so
// everything under 250 Hz simply is not there). Two detuned sines through a narrow band-pass -
// quiet, tuned, and sustained, so it is a stream and not a whistle.
export function buildShimmer(ac, dest, o) {
  const a = osc(ac, 'sine', o.f0), b = osc(ac, 'sine', o.f0);
  a.detune.value = o.detune * 0.5; b.detune.value = -o.detune * 0.5;
  const bp = filt(ac, 'bandpass', o.f0, o.q);
  const g = gain(ac, 0);
  a.connect(bp); b.connect(bp); bp.connect(g).connect(dest);
  const lg = osc(ac, 'sine', 1 / o.period), ld = gain(ac, 0);
  lg.connect(ld).connect(g.gain);
  return { a, b, bp, g, lg, ld, hz: o.f0 };
}

// ---------------------------------------------------------------------------------------------
// ONE PULSE. Built and thrown away per hit, which is deliberate: a permanently-running node
// whose gain is re-enveloped hundreds of times accumulates an AudioParam event list that is
// never collected, and the documented fix is to swap the node out. A fresh node per pulse IS
// that fix.
//
// It is a swell, not a knock: attack in the tens of milliseconds and a decay measured in half
// seconds, falling slightly in pitch. A pulse with a click on the front would read as a 56th
// cue rather than as music, and would be the one transient in a design that has none.
export function playPulse(ac, dest, t, o) {
  const a = osc(ac, 'sine', o.hz), b = osc(ac, 'triangle', o.hz);
  b.detune.value = 7;
  const lp = filt(ac, 'lowpass', o.hz * 3.2, 0.9);
  const g = ac.createGain();
  const peak = Math.max(0.0002, o.level), dur = o.decay;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + o.attack);
  g.gain.exponentialRampToValueAtTime(0.0004, t + o.attack + dur);
  a.frequency.setValueAtTime(o.hz * 1.06, t);
  a.frequency.exponentialRampToValueAtTime(o.hz, t + o.attack + dur * 0.6);
  b.frequency.setValueAtTime(o.hz * 1.06, t);
  b.frequency.exponentialRampToValueAtTime(o.hz, t + o.attack + dur * 0.6);
  const bg = gain(ac, 0.35);
  a.connect(lp); b.connect(bg).connect(lp); lp.connect(g).connect(dest);
  const stop = t + o.attack + dur + 0.08;
  a.start(t); a.stop(stop); b.start(t); b.stop(stop);
  return stop;
}
