// ENGINE AUDIO - THE VOICE BANK (tmp-tr166). Everything the craft's engine, its body and the
// water around it are BUILT from. src/boats/engine-audio.js is the state machine that drives
// this; the two were one file until the graph became the bigger of the two jobs.
//
// Same rules as src/raid/raid-audio.js, which is this project's mature audio subsystem and the
// model for every line below: oscillators, ONE shared noise buffer, biquads and envelopes.
// Nothing is sampled, nothing is downloaded, nothing is decoded, and there is no dependency of
// any kind. (Naming the API calls a loader would use is enough to trip the suite's own sweep
// for them, which is why this paragraph says it in words.)
//
// ⚠️ THE ONE IDEA. An engine is not a pitch sweep. A single oscillator whose frequency follows
// rpm is a siren, and the give-away is that it sounds exactly the same pulling as it does
// coasting - the one thing a real engine never does. What changes with LOAD is TIMBRE. At idle
// a four-stroke is not a note at all but a series of separate events dominated by the HALF
// ORDER (the engine repeats every two revolutions, so half the firing frequency is a real
// component and it is what makes an idle lumpy). At cruise it is the firing order itself. Wide
// open it is the firing order plus a hard upper order and the induction roar behind it.
//
// So this is ONE phase-coherent source group through THREE PARALLEL RESONANT PATHS, crossfaded
// on load - the same trick raid-audio.js `_crowd` uses to turn one oscillator bank into
// different vowels, applied to an engine instead of a throat. Sharing the sources is not just
// cheaper: three independent sawtooths at the same frequency would beat against each other and
// the crossfade would phase rather than blend.

// ⚠️ THE TWO CRAFT DO NOT RUN THE SAME CYCLE, and everything in this file forks on it.
//
// The speedboat is a four-stroke - an outboard or sterndrive of that size is one. It fires once
// every TWO revolutions per cylinder, so its firing order is rpm/60 x cylinders/2 and half that
// frequency is a real, audible component.
//
// The jetski is a TWO-STROKE, which is what a personal watercraft of this kind is and what
// people hear in their heads when they hear "jet ski": the ring-ding, the hard bright edge, the
// scream rather than the growl. Three facts follow and all three are in the code below:
//
//   1 it fires ONCE PER REVOLUTION per cylinder, so its firing order is rpm/60 x cylinders -
//     an OCTAVE above where a four-stroke of the same size and revs sits;
//   2 THERE IS NO HALF ORDER. Nothing repeats every two revolutions, so the component that
//     makes a four-stroke idle lumpy does not exist on this engine and `half` is not built;
//   3 the character comes from somewhere else entirely - the EXPANSION CHAMBER (a tuned pipe
//     with a fixed acoustic resonance, which is what "coming on the pipe" means), far more
//     upper-order content, and the ragged, hunting quality of a port-timed engine off the pipe.
//
// `STROKES` is the one place the cycle is written down. It is keyed by craft kind rather than
// inferred, so adding a four-stroke ski or a two-stroke tender later is one line here.
export const STROKES = { speedboat: 4, jetski: 2 };

// The expansion chamber is a physical length of steel, so its resonance sits at ONE frequency
// and does not move with the revs. What moves is the firing order, and the engine "comes on the
// pipe" when the two meet - which a fixed peaking filter gives you for free, with no extra
// logic at all. PIPE_FRAC says where that is as a fraction of the redline: 0.775 of 8000 rpm is
// 6200 rpm, and 6200/60 x 3 cylinders = 310 Hz on the jetski. Below it the engine is flat and
// raspy, through it the note swells and hardens, past it it goes thin again. engine-audio.js
// turns the same number into the `onPipe` scalar that drives the level and the layer mix.
export const PIPE_FRAC = 0.775;
export const PIPE_Q = 3.2, PIPE_DB = 11;        // the fundamental resonance of the chamber
export const PIPE2_MUL = 2.05, PIPE2_Q = 2.0, PIPE2_DB = 6;   // and its second, slightly sharp
//
// ⚠️ THE BODY IS A SEPARATE BUS. A slam, a landing and a knock do not come out of the exhaust,
// so they do not go through the engine chain. They have their own bus with a low resonance and
// a ceiling on the top end - the hull is a box you are standing on - and they DUCK the engine
// for a moment through a node the drive loop never touches (see `duckFor`).

// ⚠️ MAKE-UP GAIN, AND IT IS MEASURED. The three layers are not the same kind of filter: the
// idle path is a LOW-PASS, which keeps everything under its corner, and the mid and top paths
// are BAND-PASSES at Q 1-4, which throw most of the source bank away. Crossfading them with
// equal weights therefore does not crossfade equal loudness - and the first real bounce proved
// it, coming back with a wide-open engine QUIETER than the same boat coasting.
//
// raid-audio.js `_crowd` hit exactly this wall with its formant bank and answered it the same
// way: measure the loss, write the number down, call it make-up gain and never call it taste.
// These come off `bounce/page-layers.js`, which renders each path ALONE through a real
// OfflineAudioContext with the water box out of the way and reads the RMS of the steady second.
//
// The speedboat's are tmp-tr166's, re-measured and unchanged to five places - its bank was not
// touched by the two-stroke work, and that is the check that says so:
//
//     speedboat @110 Hz   low 0.78502   mid 0.24239   top 0.15885
//
// ⚠️ THE JETSKI'S HAD TO BE RE-MEASURED FROM SCRATCH. The two-stroke rebuild deleted the half
// order, added a third-order square, moved every feed weight and put two peaking filters (the
// expansion chamber) in the path. The old numbers were the inverse of a bank that no longer
// exists, and reusing them would have left wide open quiet and the idle shouting - which is
// exactly the defect tmp-tr166's first bounce found. Six firing frequencies, because a FIXED
// chamber resonance means the loss genuinely does move with where the firing order sits:
//
//     jetski        110     160     200     260     310*    360      median
//       low       0.784   0.863   0.693   0.779   1.193   0.894     0.8235
//       mid       0.687   0.667   0.526   0.490   0.616   0.479     0.5710
//       top       0.376   0.287   0.289   0.250   0.241   0.227     0.2685
//                                                 * on the pipe
//
// The numbers below are 0.30 / the median, so all three paths land at the same bed level and
// the LOUDNESS of the engine comes from engG and the load, where it belongs, instead of from an
// accident of filter topology. It is one representative correction, not an exact inverse: the
// loss moves with the firing frequency and with the Q, both of which the drive loop sweeps, and
// on the two-stroke the low path swings 1.7:1 across the range all by itself.
export const MAKEUP = {
  speedboat: { low: 0.382, mid: 1.238, top: 1.887 },
  jetski: { low: 0.364, mid: 0.525, top: 1.117 },
};

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const fin = (v, d = 0) => (Number.isFinite(v) ? v : d);

// Two seconds of noise, made once and shared by every noise voice on the craft. White plus a
// heavily low-passed copy of itself, which is what gives it body: pure white is a hiss and
// nothing here is a hiss. Deterministic xorshift, so the buffer is the same every run.
export function noiseBuffer(ac) {
  const len = Math.max(1, Math.floor(ac.sampleRate * 2));
  const buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
  let s = 0x2545f491, b = 0;
  for (let i = 0; i < len; i++) {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
    const w = ((s >>> 0) / 4294967296) * 2 - 1;
    b = 0.97 * b + 0.03 * w;
    d[i] = w * 0.35 + b * 2.2;
  }
  return buf;
}

// The whole permanent graph for one craft. `master` is the craft's own output gain; `noise` is
// the buffer above. `strokes` is 4 or 2 and forks the source bank, the feed matrix, the pipe
// and the rag - see STROKES above. Returns the bundle engine-audio.js drives, including every
// source it has to stop on teardown.
export function buildEngine(ac, master, noise, jet, strokes = jet ? 2 : 4) {
  const ts = strokes === 2;
  const osc = (type, f) => { const o = ac.createOscillator(); o.type = type; o.frequency.value = f; return o; };
  const gain = (g) => { const n = ac.createGain(); n.gain.value = g; return n; };
  const filt = (type, f, Q) => { const n = ac.createBiquadFilter(); n.type = type; n.frequency.value = f; n.Q.value = Q; return n; };
  const noiseSrc = () => { const n = ac.createBufferSource(); n.buffer = noise; n.loop = true; return n; };

  // ---- the source bank, all locked to the same firing frequency -----------------------------
  // Four-stroke: rpm/60 x cylinders/2.  Two-stroke: rpm/60 x cylinders, an octave above.
  const fire = osc('sawtooth', 30);
  // ⚠️ FOUR-STROKE ONLY, and this is the single most important line in the two-stroke work.
  // A four-stroke's cycle takes TWO revolutions, so half the firing frequency is a real
  // component of its spectrum and it is what makes an idle lumpy. A two-stroke fires every
  // revolution on every cylinder and has no such component at all, so on a two-stroke this
  // node IS NOT BUILT - not built and turned down, not built.
  const half = ts ? null : osc('square', 15);
  const two = osc('sawtooth', 60);       // the second order, only audible on load
  two.detune.value = 9;                  // 9 cents off the saw's own 2nd harmonic, so it beats
  // ⚠️ TWO-STROKE ONLY. A square at the THIRD order: odd harmonics (3f, 9f, 15f...) laid over
  // the saw's complete series. This is the hard bright edge - the "ding" in ring-ding - and it
  // is the component that takes the place of the half order in the bank's node budget.
  const odd = ts ? osc('square', 90) : null;
  const mech = noiseSrc();               // induction and port hash (reed valves on the two-stroke)

  // ---- three parallel paths, crossfaded on LOAD --------------------------------------------
  // Four-stroke: idle / cruise / wide open. Two-stroke: OFF THE PIPE / coming in / on the pipe -
  // same topology, different meaning, because a two-stroke's low-load voice is not a muffled
  // lump but a thin, uneven rasp. Hence the resonant low path rather than a soft one.
  const fLow = filt('lowpass', 300, ts ? 1.6 : 0.7);
  const fMid = filt('bandpass', 400, 1.3);    // cruise: the firing order, and not much else
  const fTop = filt('bandpass', 900, ts ? 2.6 : 2.0);   // hard, resonant, and full of hash
  const gLow = gain(0), gMid = gain(0), gTop = gain(0);
  const feed = (src, dst, g) => { src.connect(gain(g)).connect(dst); };
  if (ts) {
    // No component below `fire` anywhere in the matrix, and far more upper order everywhere.
    feed(fire, fLow, 1.00); feed(two, fLow, 0.30); feed(odd, fLow, 0.10); feed(mech, fLow, 0.34);
    feed(fire, fMid, 1.00); feed(two, fMid, 0.42); feed(odd, fMid, 0.16); feed(mech, fMid, 0.12);
    feed(fire, fTop, 0.70); feed(two, fTop, 0.80); feed(odd, fTop, 0.50); feed(mech, fTop, 0.45);
  } else {
    feed(half, fLow, 0.95); feed(fire, fLow, 0.40); feed(mech, fLow, jet ? 0.30 : 0.45);
    feed(fire, fMid, 1.00); feed(half, fMid, jet ? 0.12 : 0.30); feed(two, fMid, 0.18);
    feed(fire, fTop, 0.80); feed(two, fTop, jet ? 0.45 : 0.65); feed(mech, fTop, 0.40);
  }

  const engMix = gain(1);
  fLow.connect(gLow).connect(engMix);
  fMid.connect(gMid).connect(engMix);
  fTop.connect(gTop).connect(engMix);

  // ---- TWO-STROKE ONLY: the rag, and the pipe -----------------------------------------------
  // THE RAG. Off the pipe a port-timed engine does not run evenly. Scavenging is poor, it skips
  // and picks up, and it hunts - which is why a two-stroke at low load sounds unstable in a way
  // no four-stroke does. Two low-frequency oscillators at incommensurate rates (7.3 and 11.9 Hz
  // never line up) are summed once and then tapped twice: into the engine's own level, and into
  // the firing oscillator's detune in cents. The DEPTH of both is what the drive loop writes,
  // and it writes it to `ragA` / `ragP`, never to `ragAmp.gain` - same discipline as `duck`
  // below, and for the same reason: a per-frame setTargetAtTime and a connected modulator on
  // one AudioParam are fine together (they sum), but two writers on one param are not.
  let rag1 = null, rag2 = null, ragSum = null, ragA = null, ragP = null, ragAmp = null;
  if (ts) {
    rag1 = osc('sine', 7.3); rag2 = osc('triangle', 11.9);
    ragSum = gain(0.5); rag1.connect(ragSum); rag2.connect(ragSum);
    ragAmp = gain(1);                    // in series; its .gain is 1 plus whatever ragA sums in
    ragA = gain(0); ragSum.connect(ragA).connect(ragAmp.gain);
    ragP = gain(0); ragSum.connect(ragP).connect(fire.detune);
    engMix.connect(ragAmp);
  }
  // THE EXPANSION CHAMBER. A fixed acoustic resonance, because the pipe is a fixed length of
  // steel: it does not follow the revs, the revs come up to meet IT. See PIPE_FRAC.
  let pipe = null, pipe2 = null;
  if (ts) {
    pipe = filt('peaking', 310, PIPE_Q); pipe.gain.value = PIPE_DB;
    pipe2 = filt('peaking', 310 * PIPE2_MUL, PIPE2_Q); pipe2.gain.value = PIPE2_DB;
    ragAmp.connect(pipe).connect(pipe2);
  }

  // ---- the water box -----------------------------------------------------------------------
  // An outboard's exhaust leaves through the PROP HUB, so while the leg is down the sea is its
  // silencer; a jet's pump is under water even though its pipe is not. Either way the note
  // opens the instant the propulsor ventilates or the hull flies, and that is the single most
  // recognisable thing a small fast boat does.
  const exhLP = filt('lowpass', 700, 0.6);
  // ⚠️ `duck` exists so a body hit can pull the engine down for a moment WITHOUT touching
  // engG. The drive loop writes engG every frame with setTargetAtTime; a one-shot ramp on the
  // same param would fight it and the two would take turns winning. Nothing in the drive loop
  // ever writes this node.
  const duck = gain(1);
  const engG = gain(0.3);
  (ts ? pipe2 : engMix).connect(exhLP).connect(duck).connect(engG).connect(master);

  // ---- the machinery you hear through the air, not the pipe --------------------------------
  const whine = osc('sine', 800), whineG = gain(0);      // gear mesh / supercharger 1st order
  const whine2 = osc('sine', 1600), whine2G = gain(0);   // blade passing / supercharger 2nd
  whine.connect(whineG).connect(master);
  whine2.connect(whine2G).connect(master);

  // ---- water -------------------------------------------------------------------------------
  const pumpN = noiseSrc(), pumpBP = filt('bandpass', 500, 0.7), pumpG = gain(0);   // thrust
  pumpN.connect(pumpBP).connect(pumpG).connect(master);
  const rushN = noiseSrc(), rushLP = filt('lowpass', 400, 0.3), rushG = gain(0);    // along the hull
  rushN.connect(rushLP).connect(rushG).connect(master);
  const windN = noiseSrc(), windHP = filt('highpass', 900, 0.5), windG = gain(0);   // airborne
  windN.connect(windHP).connect(windG).connect(master);
  // Cavitation: an impeller or a prop that has lost its grip is not silent, it FIZZES - a
  // narrow band of bright noise that arrives with the ventilation and goes with it.
  const fizzN = noiseSrc(), fizzBP = filt('bandpass', 2600, 1.6), fizzG = gain(0);
  fizzN.connect(fizzBP).connect(fizzG).connect(master);

  // ---- the body bus ------------------------------------------------------------------------
  // Not a brick wall: a landing has a bright water slap in it and a knock has a crack. What it
  // does have is a low resonance (the hull is a box) and a ceiling, so nothing on this bus can
  // be mistaken for the engine.
  const bodyRes = filt('peaking', 78, 1.1); bodyRes.gain.value = 7;
  const bodyLP = filt('lowpass', 3200, 0.6), bodyG = gain(1);
  bodyRes.connect(bodyLP).connect(bodyG).connect(master);

  // ⚠️ Nulls are filtered out, not started. Every source in here is stopped on teardown, so a
  // source that never reaches this list is a source that keeps running after a craft switch.
  const sources = [fire, half, two, odd, mech, rag1, rag2, whine, whine2, pumpN, rushN, windN, fizzN]
    .filter(Boolean);
  for (const s of sources) s.start(ac.currentTime);
  return {
    jet, strokes, mk: MAKEUP[jet ? 'jetski' : 'speedboat'], master, engMix, exhLP, duck, engG,
    fire, half, two, odd, mech, fLow, fMid, fTop, gLow, gMid, gTop,
    pipe, pipe2, pipeHz: 0, ragAmp, ragA, ragP,
    whine, whineG, whine2, whine2G,
    pumpBP, pumpG, rushLP, rushG, windHP, windG, fizzBP, fizzG,
    body: bodyRes, bodyG, sources,
  };
}

// A SLAM. The hull coming down on chop: short, tight, over inside a quarter of a second, and
// nothing rings afterwards because nothing left the water long enough to.
export function slamHit(ac, B, noise, k) {
  const t = ac.currentTime, v = clamp(fin(k, 0.5), 0.05, 1), jet = B.jet;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(jet ? 96 : 74, t);
  o.frequency.exponentialRampToValueAtTime(jet ? 46 : 36, t + 0.16);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.85 * v, t + 0.007);
  g.gain.exponentialRampToValueAtTime(0.0002, t + 0.24);
  o.connect(g).connect(B.body); o.start(t); o.stop(t + 0.26);
  const n = ac.createBufferSource(), lp = ac.createBiquadFilter(), ng = ac.createGain();
  n.buffer = noise; n.loop = true;
  lp.type = 'lowpass'; lp.Q.value = 0.8;
  lp.frequency.setValueAtTime(1100, t);
  lp.frequency.exponentialRampToValueAtTime(320, t + 0.22);
  ng.gain.setValueAtTime(0.62 * v, t);
  ng.gain.exponentialRampToValueAtTime(0.0002, t + 0.28);
  n.connect(lp).connect(ng).connect(B.body);
  n.start(t, Math.random() * 1.5); n.stop(t + 0.3);
  return 6;
}

// A LANDING. NOT a louder slam. Three things happen that a slam does not do, and it is the
// three together that say "that thing was in the air":
//   1 the mass arrives - a sub that starts lower and falls further, and takes 0.45 s about it;
//   2 THE STRUCTURE RINGS. A stiffened hull panel is not a string, so its two loudest modes
//     are deliberately NOT harmonically related - 148 and 241 Hz is a ratio of 1.63, which is
//     neither an octave nor a fifth nor anything else a musical instrument would give you.
//     They decay fast, and they are what makes the hit sound like a hull rather than a drum;
//   3 the water goes everywhere - broad and bright at the front, gone in half a second.
export function landingHit(ac, B, noise, k) {
  const t = ac.currentTime, v = clamp(fin(k, 0.5), 0.1, 1), jet = B.jet;
  let n = 0;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(jet ? 78 : 62, t);
  o.frequency.exponentialRampToValueAtTime(jet ? 32 : 26, t + 0.40);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(1.0 * v, t + 0.010);
  g.gain.exponentialRampToValueAtTime(0.0002, t + 0.45);
  o.connect(g).connect(B.body); o.start(t); o.stop(t + 0.48); n += 2;
  for (const p of [[jet ? 196 : 148, 1.00, 0.17], [jet ? 317 : 241, 0.55, 0.115]]) {
    const r = ac.createOscillator(), rg = ac.createGain();
    r.type = 'triangle'; r.frequency.value = p[0]; r.detune.value = (Math.random() * 2 - 1) * 14;
    rg.gain.setValueAtTime(0.0001, t);
    rg.gain.exponentialRampToValueAtTime(0.30 * p[1] * v, t + 0.006);
    rg.gain.exponentialRampToValueAtTime(0.0002, t + p[2]);
    r.connect(rg).connect(B.body); r.start(t); r.stop(t + p[2] + 0.04); n += 2;
  }
  const w = ac.createBufferSource(), lp = ac.createBiquadFilter(), wg = ac.createGain();
  w.buffer = noise; w.loop = true;
  lp.type = 'lowpass'; lp.Q.value = 0.7;
  lp.frequency.setValueAtTime(1900, t);
  lp.frequency.exponentialRampToValueAtTime(240, t + 0.42);
  wg.gain.setValueAtTime(0.0001, t);
  wg.gain.exponentialRampToValueAtTime(0.80 * v, t + 0.012);
  wg.gain.exponentialRampToValueAtTime(0.0002, t + 0.50);
  w.connect(lp).connect(wg).connect(B.body);
  w.start(t, Math.random() * 1.5); w.stop(t + 0.53); n += 3;
  return n;
}

// A KNOCK. The hull hit SOMETHING - a hull, a pile, a groyne - and not the sea. Higher and far
// shorter than either water event, with a hard band-passed crack on the front of it, because
// what you hear first when two hulls touch is the shell, not the mass behind it.
export function knockHit(ac, B, noise, k) {
  const t = ac.currentTime, v = clamp(fin(k, 0.5), 0.05, 1);
  const n = ac.createBufferSource(), bp = ac.createBiquadFilter(), ng = ac.createGain();
  n.buffer = noise; n.loop = true;
  bp.type = 'bandpass'; bp.Q.value = 1.6;
  bp.frequency.setValueAtTime(1150, t);
  bp.frequency.exponentialRampToValueAtTime(430, t + 0.07);
  ng.gain.setValueAtTime(0.55 * v, t);
  ng.gain.exponentialRampToValueAtTime(0.0002, t + 0.09);
  n.connect(bp).connect(ng).connect(B.body);
  n.start(t, Math.random() * 1.5); n.stop(t + 0.11);
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = 'triangle';
  o.frequency.setValueAtTime(152, t);
  o.frequency.exponentialRampToValueAtTime(58, t + 0.11);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.62 * v, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0002, t + 0.14);
  o.connect(g).connect(B.body); o.start(t); o.stop(t + 0.16);
  return 5;
}

// THE OVERRUN BURBLE. A big four-stroke on a shut throttle at speed does not go quiet, it
// pops: unburnt charge lighting in a hot pipe. One short low-passed noise event, called from
// the drive loop behind a gate so it can never become a machine gun.
//
// ⚠️ A TWO-STROKE DOES THIS DIFFERENTLY and the difference is audible, so it is modelled
// rather than reused. Off the throttle a two-stroke does not burble, it FOUR-STROKES: too
// little fresh charge to fire every revolution, so it skips and catches and skips, and what
// you hear is a thin ragged crackle up where the firing order lives, not a soft thud down
// where a big four-stroke's is. Higher, harder, shorter, and through a band rather than a
// lowpass - and a hull's own resonance is not in it, so it goes up brighter.
export function burble(ac, B, noise, k) {
  const t = ac.currentTime, v = clamp(fin(k, 0.5), 0.05, 1), ts = B.strokes === 2;
  const n = ac.createBufferSource(), lp = ac.createBiquadFilter(), g = ac.createGain();
  n.buffer = noise; n.loop = true;
  lp.type = ts ? 'bandpass' : 'lowpass';
  lp.Q.value = ts ? 1.1 : 1.4;
  lp.frequency.value = ts ? 900 : 330;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime((ts ? 0.26 : 0.22) * v, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0002, t + (ts ? 0.045 : 0.075));
  n.connect(lp).connect(g).connect(B.body);
  n.start(t, Math.random() * 1.5); n.stop(t + (ts ? 0.055 : 0.09));
  return 3;
}

// Pull the engine bed down for `hold` seconds. See the ⚠️ on `duck` in buildEngine.
export function duckFor(ac, B, depth, hold) {
  const t = ac.currentTime, g = B.duck.gain;
  g.cancelScheduledValues(t);
  g.setValueAtTime(clamp(1 - fin(depth, 0), 0.05, 1), t);
  g.linearRampToValueAtTime(1, t + Math.max(0.02, fin(hold, 0.12)));
}
