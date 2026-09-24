// ENGINE AUDIO for the driveable boats (tmp-tr50, rebuilt tmp-tr166). Procedural WebAudio
// only: oscillators, one generated noise buffer and filters - no samples, no files, no
// dependencies. The graph lives in ./engine-audio-layers.js and the passing hulls in
// ./engine-audio-doppler.js; this file is the state machine that drives both.
//
//  - Starts only after a user gesture (pointerdown / keydown), and only while a boat is the
//    active craft. Silent (voices stopped, context suspended) on the eFoil, on a craft switch
//    the old voices are torn down, on a hidden tab it suspends, on pagehide it closes. Never
//    created on ?cal renders, clean=1, or with ?sound=0 / ?mute (the game has no other sound
//    setting; rescue mode keeps its own AudioContext and is not touched).
//
// WHAT tmp-tr166 CHANGED, and why. The old engine was ONE sawtooth whose frequency followed
// rpm, through a low-pass that opened a little with throttle. That is a siren with a filter on
// it, and its tell is that 20 km/h sounded identical whether you were pinned wide open or
// coasting with the throttle shut. Three things replace it:
//
//  1 RPM / LOAD LAYERS. An idle, a mid and a top voice, crossfaded on LOAD and not on speed -
//    one phase-coherent source bank through three parallel resonant paths (see the header of
//    engine-audio-layers.js for why they share their sources).
//
//  2 A REAL LOAD AXIS. `load` here is not the throttle lever. It is what the engine is being
//    ASKED for: the throttle sets the ceiling, and inside that ceiling the engine is loaded
//    when it is actually doing something - holding a big drag at speed (hold), or pushing the
//    hull up to speed (pull, straight off the hull's own measured acceleration). Shut the
//    throttle and it goes to zero however fast the boat is still travelling, which is the
//    whole point; open it at 20 km/h and it goes to one. Rpm and load are then INDEPENDENT:
//    rpm sets the pitch, load sets the timbre, and that is what makes an engine sound alive.
//
//  3 WATER. `hull.vent` is the sim's own ventilation state - the same number the HUD's
//    VENTILATED band is drawn from - and with `propWet` and `airTicks` it makes `open`: the
//    propulsor has lost the water. A ventilating impeller cannot LOAD the engine, so the load
//    collapses (the rpm has already flared in the sim), the exhaust unmuffles because it no
//    longer exits under water, the pump roar drops out and the cavitation fizz arrives. Leave
//    the water entirely and the hull rush is replaced by wind.
//
// Plus: Doppler on hulls passing the player, and a body bus for slams, LANDINGS after real
// airtime, knocks and the overrun burble - none of which come out of the exhaust, so none of
// which go through the engine chain.
//
// WHAT tmp-tr182 CHANGED. The engine above was a four-stroke and said so, on BOTH craft. That
// is right for the speedboat and wrong for the jetski: a personal watercraft of this kind is a
// TWO-STROKE, and the two-stroke is the sound people actually associate with a jet ski. The
// speedboat is untouched to the last decimal place - its measured make-up gains re-measure
// identically - and the jetski now runs a genuine two-stroke:
//
//   - the firing order is rpm/60 x cylinders instead of rpm/60 x cylinders/2, an OCTAVE up:
//     85-400 Hz where it used to be 42.5-200 Hz;
//   - THE HALF ORDER IS GONE. Not turned down - the oscillator is not built, because nothing
//     on a two-stroke repeats every two revolutions. Measured at idle, the energy at that
//     order fell from 0.0218 to 0.0000;
//   - an EXPANSION CHAMBER: two fixed peaking resonances at 310 and 636 Hz, which the firing
//     order climbs up to meet. That is what "coming on the pipe" is, and it is what makes the
//     top of the rev range arrive all at once instead of fading in;
//   - a third-order square in the bank and a much higher top-path centre, for the hard bright
//     edge, and a RAG - an unstable level and a hunting note off the pipe, which is what a
//     port-timed engine does when it has nothing to burn evenly.
//
// Every continuous parameter is driven with setTargetAtTime so nothing clicks. Every one-shot
// is scheduled at currentTime or later; nothing is ever scheduled at a negative time.

import {
  clamp, fin, noiseBuffer, buildEngine, slamHit, landingHit, knockHit, burble, duckFor,
  STROKES, PIPE_FRAC,
} from './engine-audio-layers.js';
import { Passers } from './engine-audio-doppler.js';

const AIR_MIN = 18;      // physics ticks (120 Hz) out of the water before it counts as airtime
const AIR_FULL = 108;    // 0.9 s airborne is as big a landing as the scale goes

// How sharply the two-stroke comes on and off the pipe, as a fraction of the tuned frequency.
// ⚠️ ASYMMETRIC ON PURPOSE, and this is the shape of the whole two-stroke experience: below the
// tuned rpm the returning pressure wave arrives too late and there is nothing there at all, so
// the engine falls off a cliff (0.26); above it the wave arrives early and the engine goes thin
// but keeps pulling to the limiter, so it fades slowly (0.45). An engine that came off the pipe
// as fast as it came on would be unplayable, and it would also be wrong.
const PIPE_LO = 0.26, PIPE_HI = 0.45;

export class EngineAudio {
  constructor() {
    const q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
    this.enabled = typeof window !== 'undefined' && !!(window.AudioContext || window.webkitAudioContext)
      && !q.has('cal') && q.get('clean') !== '1' && q.get('sound') !== '0' && !q.has('mute');
    this.ac = null; this.kind = null; this.v = null; this.gesture = false;
    this.lastTicks = -1; this.stallT = 0; this.lastSlams = 0; this.slamsPlayed = 0; this.frames = 0;
    this.landings = 0; this.knocks = 0; this.passN = 0; this.trafficList = null;
    if (!this.enabled) return;
    // >>> RESUME
    // ⚠️ TWO DEFECTS HERE, AND TOGETHER THEY ARE WHY AN iPAD HEARD NO ENGINE. Reported by the
    // owner after the music was fixed: "you can't hear the engine of the jet ski. But apart
    // from that, everything else seems fine."
    //
    //   1. THE LISTENER LIST HAD NO `touchstart`. It was pointerdown + keydown. score.js's
    //      equivalent list is ['pointerdown', 'keydown', 'touchstart'] - whoever wrote that one
    //      knew touchstart was needed, and this one never got it. A tap that is consumed by the
    //      touch UI (the stick and the throttle strip both preventDefault) need not produce a
    //      pointerdown at all, so on a tablet this could go a whole session without one gesture.
    //
    //   2. `_build()` OPENS WITH `if (this.v || ...) return;` AND THE resume() IS INSIDE IT.
    //      So the first gesture built the graph and every later gesture returned at that guard
    //      without ever resuming. If the context was created suspended - which is what iOS does
    //      when the graph is built before a real activation - nothing could ever wake it.
    //      Identical in shape to the bug just fixed in score.js._wake().
    //
    // So: resume FIRST, on every gesture, before _build() gets a chance to return early.
    const onGesture = () => {
      this.gesture = true;
      if (this.ac && this.kind && this.ac.state === 'suspended') {
        this.ac.resume().catch(() => { /* a refused resume is not fatal; the next tap retries */ });
      }
      if (this.kind) this._build(); else if (this.ac && this.ac.state === 'running') this.ac.suspend();
    };
    for (const e of ['pointerdown', 'keydown', 'touchstart']) {
      addEventListener(e, onGesture, { passive: true, capture: true });
    }
    // <<< RESUME
    addEventListener('pagehide', () => this.close());
    document.addEventListener('visibilitychange', () => {
      if (!this.ac) return;
      if (document.hidden) this.ac.suspend(); else if (this.kind && this.v) this.ac.resume();
    });
  }

  // kind: 'speedboat' | 'jetski' | null (eFoil). Old voices always go.
  setCraft(kind) {
    this._teardown();
    this.kind = this.enabled ? kind || null : null;
    if (this.kind && this.gesture) this._build();
    else if (this.ac && this.ac.state === 'running') this.ac.suspend();
  }

  // An explicit traffic list for the Doppler voices, if anything ever has one that is not on
  // the hull. update() prefers this and otherwise falls back to hull.dyn, which the raid fills.
  setTraffic(list) { this.trafficList = list && list.length ? list : null; }

  close() {
    this._teardown();
    if (this.ac) { try { this.ac.close(); } catch { /* already closed */ } }
    this.ac = null; this.kind = null;
  }

  _teardown() {
    const v = this.v;
    this.v = null;
    this.lastU = undefined; this.accel = 0; this.engLoad = 0; this.airPeak = 0;
    this.lastHits = undefined; this.landT = -9;
    if (!v) return;
    try { v.master.gain.setTargetAtTime(0, this.ac.currentTime, 0.03); } catch { /* closed */ }
    const stopAt = this.ac ? this.ac.currentTime + 0.15 : 0;
    for (const s of v.sources) { try { s.stop(stopAt); } catch { /* stopped */ } }
    setTimeout(() => { try { v.master.disconnect(); } catch { /* gone */ } }, 250);
  }

  // ⚠️ Everything the drive loop needs is created HERE or lazily in update(), never only in the
  // constructor. src/raid/raid-audio-preview.js bounces this class by Object.create-ing the
  // prototype and setting a fixed handful of fields, exactly as the raid rig does - a field
  // that only the constructor set would be undefined on that path and the bounce would be
  // silent rather than loud.
  _build() {
    if (this.v || !this.kind || !this.enabled) return;
    try {
      if (!this.ac) this.ac = new (window.AudioContext || window.webkitAudioContext)();
      if (this.ac.state === 'suspended') this.ac.resume();
    } catch { this.enabled = false; return; }
    const ac = this.ac, jet = this.kind === 'jetski', t = ac.currentTime;
    if (!this.noise) this.noise = noiseBuffer(ac);

    const master = ac.createGain(); master.gain.value = 0;
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    master.connect(comp).connect(ac.destination);
    master.gain.setTargetAtTime(jet ? 0.32 : 0.36, t, 0.25);

    const v = buildEngine(ac, master, this.noise, jet, STROKES[this.kind] || (jet ? 2 : 4));
    v.pass = new Passers(ac, master, this.noise, 3);
    v.sources = v.sources.concat(v.pass.sources);
    this.v = v;
    this.lastSlams = -1; this.lastHits = undefined;
    this.lastU = undefined; this.accel = 0; this.engLoad = 0; this.airPeak = 0; this.landT = -9;
  }

  // Throttle a one-shot so a bad frame cannot stack copies of it. Same shape as
  // raid-audio.js `_gate`; the id set here is fixed and small, so it needs no pruning.
  _gate(id, gap) {
    if (!this.gates) this.gates = new Map();
    const t = this.ac.currentTime, l = this.gates.get(id);
    if (l !== undefined && t - l < gap) return false;
    this.gates.set(id, t); return true;
  }

  // Per drawn frame while a boat is active. h: PlaneHull, P: its parameter block.
  update(h, P, ft) {
    const v = this.v, ac = this.ac;
    if (!v || !ac || !h || !P) return;
    this.frames = fin(this.frames, 0) + 1;
    const t = ac.currentTime, set = (param, val, tc) => param.setTargetAtTime(fin(val), t, tc);
    const dt = clamp(fin(ft, 1 / 60), 1 / 480, 0.25);

    // Paused / frozen loop (no physics ticks): fade out, come back when it runs.
    if (h.ticks === this.lastTicks) this.stallT = fin(this.stallT, 0) + dt; else this.stallT = 0;
    this.lastTicks = h.ticks;
    const live = this.stallT < 0.25 ? 1 : 0;

    // ---- the two axes: rpm sets the pitch, load sets the timbre ------------------------------
    const rpmN = clamp(fin(h.rpm), 0, 1.15);
    const rpmAbs = P.rpmIdle + rpmN * (P.rpmMax - P.rpmIdle);
    const demand = clamp(fin(h.spool), 0, 1);
    const speed = Math.abs(fin(h.u));
    const uRated = P.uRated || 20;

    // Acceleration off the hull itself, smoothed over ~0.12 s. `lastU` is seeded on the first
    // frame so a craft that starts with way on does not read as a 20 m/s^2 launch.
    if (this.lastU === undefined) { this.lastU = speed; this.accel = 0; }
    const aRaw = (speed - this.lastU) / dt;
    this.lastU = speed;
    this.accel = fin(this.accel, 0) + (aRaw - fin(this.accel, 0)) * clamp(dt / 0.12, 0, 1);

    // LOAD. `hold` is the throttle this speed costs just to hold it (planing drag is roughly
    // quadratic), `pull` is what the engine is doing about it beyond that. Wide open at top
    // speed is full load (hold = 1) and so is a hole shot from rest (pull = 1), which is
    // correct - they are the same engine working just as hard at very different rpm. Coasting
    // is zero at any speed, because `demand` multiplies the lot.
    const hold = Math.min(1, (speed / uRated) ** 2);
    const pull = clamp(this.accel / (uRated / 5), -1.5, 1.5);
    const loadT = clamp(demand * (0.22 + 0.78 * clamp(hold + Math.max(0, pull), 0, 1)), 0, 1);
    this.engLoad = fin(this.engLoad, 0) + (loadT - fin(this.engLoad, 0)) * clamp(dt / 0.09, 0, 1);

    // ---- water ------------------------------------------------------------------------------
    const vent = clamp(fin(h.vent), 0, 1);
    const airT = Math.max(0, fin(h.airTicks, 0));
    const air = clamp(airT / 24, 0, 1);                       // 0.2 s clear of the sea = fully out
    const propWet = clamp(fin(h.propWet, 1), 0, 1);
    const wet = clamp(fin(h.wet, 1), 0, 1);
    const open = clamp(Math.max(vent, air, 1 - propWet), 0, 1);
    // A ventilating propulsor cannot load the engine. The sim has already let the rpm flare
    // (hull.js: rpmUp drops to 0.12 s while vent > 0.5); this is the other half of that.
    const load = this.engLoad * (1 - 0.85 * open);
    this.openN = open; this.loadEff = load;       // read by debug() and by the audio suite
    // Overrun: revs up, throttle SHUT. Hollow, quieter, and it burbles. ⚠️ It has to want the
    // throttle nearly closed, not merely "less than full" - a half-throttle cruise is the most
    // ordinary thing a boat does and it is not an overrun.
    const overrun = clamp((0.25 - demand) * 4, 0, 1) * clamp((rpmN - 0.2) * 2.5, 0, 1);

    // ---- pitch ------------------------------------------------------------------------------
    // ⚠️ THE FIRING ORDER, AND THE WHOLE POINT OF THE TWO-STROKE WORK.
    //   four-stroke: rpm/60 x cylinders/2  - one bang every TWO revolutions per cylinder;
    //   two-stroke:  rpm/60 x cylinders    - one bang every revolution per cylinder, an OCTAVE
    //                                        above the same engine treated as a four-stroke.
    // `2 / strokes` is that in one term. On the jetski (3 cylinders, 1700-8000 rpm) it moves
    // the engine from 42.5-200 Hz to 85-400 Hz, which is the difference between a growl and a
    // scream and is exactly what a jet ski does. An idle hunts, so the wobble is scaled out as
    // the revs come up; on the two-stroke the `rag` below does far more of that job.
    const ts = v.strokes === 2;
    // The two-stroke's idle wobble is almost all taken over by the `rag` below, which is a
    // better model of the same thing, so the old sine is scaled back rather than left to fight it.
    const wob = 1 + (ts ? 0.004 : 0.014) * Math.sin(this.frames * 0.37) * (1 - clamp(rpmN, 0, 1));
    const f = rpmAbs / 60 * (P.cylinders || 4) * (2 / (v.strokes || 4)) * wob;
    set(v.fire.frequency, f, 0.03);
    if (v.half) set(v.half.frequency, f / 2, 0.03);   // four-stroke only; a two-stroke has none
    set(v.two.frequency, f * 2, 0.03);
    if (v.odd) set(v.odd.frequency, f * 3, 0.03);     // two-stroke only: the hard upper edge

    // ---- ON THE PIPE ---------------------------------------------------------------------
    // The chamber's resonance is fixed (see PIPE_FRAC in engine-audio-layers.js) and is written
    // into the two peaking filters ONCE, the first frame a parameter block arrives - it is a
    // length of steel, not a parameter. `onPipe` is then just how close the firing order has
    // come to it, and it is what makes a two-stroke feel like a two-stroke to drive: nothing,
    // nothing, nothing, then the whole engine arrives at once.
    let onPipe = 0;
    if (ts && v.pipe) {
      if (!v.pipeHz) {
        v.pipeHz = Math.max(40, (P.rpmMax || 8000) * PIPE_FRAC / 60 * (P.cylinders || 3));
        v.pipe.frequency.setValueAtTime(v.pipeHz, t);
        v.pipe2.frequency.setValueAtTime(v.pipeHz * 2.05, t);
      }
      const dev = f / v.pipeHz - 1;
      const w = dev < 0 ? dev / PIPE_LO : dev / PIPE_HI;
      onPipe = Math.exp(-w * w);
    }
    this.onPipeN = onPipe;                            // read by debug() and by the audio suite

    // ---- THE RAG ---------------------------------------------------------------------------
    // Off the pipe and off the load a port-timed engine runs unevenly, and that instability is
    // half of what people recognise. It goes away as the pipe comes in and as the load comes
    // on, which is why a two-stroke sounds ragged at the slipway and dead clean at full chat.
    // ⚠️ The depth nodes are written here; `ragAmp.gain` itself never is. See engine-audio-layers.
    // ⚠️ `engLoad`, not `load`: the rag is about the engine having nothing to burn evenly, and a
    // ventilating engine on a wide throttle has plenty - it screams, it does not stumble. So the
    // demand-side load is the right term here and `open` kills the rag outright.
    if (ts && v.ragA) {
      const rag = (1 - onPipe) * (1 - 0.65 * fin(this.engLoad, 0)) * clamp(1.15 - rpmN, 0, 1) * (1 - open);
      // ⚠️ The AMPLITUDE depth is the big one and the PITCH depth is deliberately small. When a
      // two-stroke skips a firing it loses that cycle's push entirely - the level drops a lot -
      // but the flywheel absorbs most of the speed change, so the note only sags about a
      // percent. 18 cents IS about a percent. Making the pitch depth match the amplitude depth
      // would give a 10 Hz vibrato, which is a synthesiser, not an engine.
      set(v.ragA.gain, 0.30 * rag * live, 0.10);      // how much the level lurches
      set(v.ragP.gain, 18 * rag * live, 0.10);        // and how far it sags, in cents
    }

    // ---- the crossfade ----------------------------------------------------------------------
    // A triangular partition on LOAD: the three weights sum to 1 across the whole range, so the
    // voice changes without the level jumping. The idle layer is additionally scaled out by rpm
    // - a lumpy half-order bark is an IDLE thing, not a 5000 rpm thing - and the overrun feeds
    // the mid path, because a shut throttle at speed is mechanical and induction noise with a
    // hollow pipe behind it, not a bark and not silence.
    //
    // ⚠️ THE UNLOADED SCREAM. `load` collapsing under ventilation would otherwise hand the
    // weight to the IDLE layer, and a free-revving engine at 6000 rpm is not an idle - it is a
    // thin, hard, bright scream with no grunt under it. The `open` term puts that weight on the
    // TOP path instead. Found by bouncing it: the ventilation burst came back DULLER than wide
    // open, when the whole point of ventilating is that the note goes up and gets raw.
    //
    // ⚠️ ON THE TWO-STROKE the pipe is a fourth term on top of all of that, and it acts like
    // load without being load: on the pipe the engine is hard and top-heavy whatever the
    // throttle is doing, and off it there is no bottom end to fall back on, so the low path is
    // pulled out from under it rather than left to sit there sounding like an idle.
    const wIdle = clamp(1 - load / 0.45, 0, 1) * (1 - 0.55 * rpmN) * (1 - 0.8 * open)
      * (ts ? 1 - 0.85 * onPipe : 1);
    const wMid = clamp(1 - Math.abs(load - 0.45) / 0.45, 0, 1) + 0.45 * overrun * rpmN;
    const wTop = clamp((load - 0.45) / 0.45, 0, 1) + 0.55 * open * rpmN
      + (ts ? 0.55 * onPipe * (0.35 + 0.65 * load) : 0);
    set(v.fLow.frequency, clamp(f * (ts ? 2.4 : 3) + 55, 55, ts ? 2600 : 1400), 0.05);
    set(v.fMid.frequency, clamp(f * 2.2 + 40, 60, 2600), 0.05);
    set(v.fMid.Q, 1.2 + 1.0 * load, 0.08);
    // The top path is centred much higher on the two-stroke, and higher again on the pipe -
    // this is the "much stronger upper-harmonic content" in one line.
    set(v.fTop.frequency, clamp(f * (ts ? 4.2 : 3.4) + (ts ? 520 : 380) * load + 500 * open
      + (ts ? 700 * onPipe : 0), 140, 5200), 0.05);
    set(v.fTop.Q, (ts ? 2.6 : 1.8) + (ts ? 2.4 : 1.8) * load, 0.08);
    set(v.gLow.gain, v.mk.low * wIdle * live, 0.05);       // mk = measured make-up, see MAKEUP
    set(v.gMid.gain, v.mk.mid * wMid * live, 0.05);
    set(v.gTop.gain, v.mk.top * wTop * live, 0.05);

    // The water box, and the level. A two-stroke's pipe exits above the waterline on a ski and
    // is never silenced the way an outboard's under-water leg is, so it starts more open; and
    // it opens further again on the pipe, because that is where the chamber is passing energy.
    set(v.exhLP.frequency, clamp((v.jet ? (ts ? 1200 : 900) : 520) + (v.jet ? 2400 : 3000) * open
      + 950 * load - 260 * overrun + (ts ? 1400 * onPipe : 0), 200, 6500), 0.06);
    set(v.engG.gain, (0.16 + 0.40 * load + 0.14 * rpmN + 0.18 * open
      + (ts ? 0.22 * onPipe * (0.4 + 0.6 * load) : 0)) * live, 0.05);

    // ---- machinery and water ----------------------------------------------------------------
    if (v.jet && ts) {
      // ⚠️ A TWO-STROKE SKI HAS NO SUPERCHARGER - that is a four-stroke ski's answer to a
      // two-stroke's power, and leaving a 24th-order blower whine on top of this engine would
      // give the whole thing away. What is left is the pump itself: a three-blade impeller
      // driven STRAIGHT off the crank with no reduction, so its blade-passing frequency is the
      // third crank order - which on a three-cylinder two-stroke lands on the firing order and
      // thickens it, exactly as it does on the water.
      set(v.whine.frequency, rpmAbs / 60 * 3, 0.04);
      set(v.whine2.frequency, rpmAbs / 60 * 6, 0.04);
      // And it is a WATER pump, so unlike a blower it goes away when the intake sucks air.
      set(v.whineG.gain, 0.030 * rpmN * rpmN * (0.35 + 0.65 * load) * (1 - 0.75 * open) * live, 0.08);
      set(v.whine2G.gain, 0.012 * rpmN * rpmN * rpmN * (0.4 + 0.6 * load) * (1 - 0.8 * open) * live, 0.08);
      set(v.pumpBP.frequency, 260 + 1100 * rpmN, 0.05);
      set(v.pumpG.gain, (0.05 + 0.55 * load + 0.08 * (1 - open) * clamp(speed / 25, 0, 1)) * live, 0.06);
    } else if (v.jet) {
      // A supercharger is geared off the crank, so its pitch tracks rpm exactly; what rises
      // with rpm^2 is how much of it you HEAR, because the blade loading does.
      set(v.whine.frequency, rpmAbs / 60 * 24, 0.04);
      set(v.whine2.frequency, rpmAbs / 60 * 48, 0.04);
      // ⚠️ `open` is in here because a blower is GEARED TO THE CRANK. When the pump ventilates
      // the engine free-revs and the blower spins harder, so its whine must not fall away with
      // the load - the bounce caught this: a ventilating jet came back duller than a wet one.
      set(v.whineG.gain, 0.040 * rpmN * rpmN * (0.45 + 0.55 * Math.max(load, 0.9 * open)) * live, 0.08);
      set(v.whine2G.gain, 0.014 * rpmN * rpmN * rpmN * (0.6 + 0.4 * open) * live, 0.08);
      // The pump's roar is THRUST, so it follows load and stops dead when the intake sucks
      // air - which is exactly what ventilation is on a jet.
      set(v.pumpBP.frequency, 260 + 1100 * rpmN, 0.05);
      set(v.pumpG.gain, (0.05 + 0.55 * load + 0.08 * (1 - open) * clamp(speed / 25, 0, 1)) * live, 0.06);
    } else {
      set(v.whine.frequency, rpmAbs / 60 * 1.98 * 13, 0.04);  // pinion x gear ratio 1.98
      set(v.whine2.frequency, rpmAbs / 60 * 1.98 * 3, 0.04);  // blade passing, three-blade prop
      set(v.whineG.gain, 0.013 * rpmN * (0.4 + 0.6 * load) * live, 0.1);
      set(v.whine2G.gain, 0.020 * rpmN * load * (1 - open) * live, 0.1);
      set(v.pumpBP.frequency, 180 + 520 * load, 0.08);
      set(v.pumpG.gain, 0.14 * load * (1 - 0.8 * open) * clamp(speed / 6, 0.2, 1) * live, 0.08);
    }
    const sp = clamp(speed / (v.jet ? 27 : 21), 0, 1.2);
    set(v.rushLP.frequency, 250 + 2600 * sp, 0.1);
    set(v.rushG.gain, 0.6 * Math.pow(sp, 1.5) * (0.25 + 0.75 * wet) * (1 - 0.9 * air) * live, 0.12);
    set(v.windHP.frequency, 700 + 900 * sp, 0.1);            // out of the water there is only air
    set(v.windG.gain, 0.16 * air * Math.pow(sp, 1.2) * live, 0.08);
    set(v.fizzBP.frequency, 1800 + 1800 * rpmN, 0.06);       // cavitation, with the ventilation
    set(v.fizzG.gain, 0.10 * vent * (0.3 + 0.7 * rpmN) * (1 - air) * live, 0.05);
    // The coin flip sits AFTER the gate so Math.random() is touched at most 8 times a second,
    // and a burble that loses the flip still spends its slot - which is what makes the pops
    // irregular instead of metronomic.
    if (overrun > 0.35 && live && this._gate('burble', 0.12) && Math.random() < 0.6) burble(ac, v, this.noise, overrun);

    // ---- the body: landings, slams, knocks ---------------------------------------------------
    // The landing is found from the PEAK airtime seen since the last one, not from a single
    // frame's airTicks: update() runs on drawn frames and the sim on 120 Hz ticks, so a dropped
    // frame would otherwise lose the whole event.
    let landed = 0;
    if (airT > 0) this.airPeak = Math.max(fin(this.airPeak, 0), airT);
    else if (fin(this.airPeak, 0) > 0) {
      if (this.airPeak >= AIR_MIN) landed = clamp(this.airPeak / AIR_FULL, 0.18, 1);
      this.airPeak = 0;
    }
    const slams = fin(h.slams, 0), hits = fin(h.hits, 0);
    if (this.lastSlams < 0 || slams < this.lastSlams) this.lastSlams = slams;   // first frame, or a reset
    if (this.lastHits === undefined || hits < this.lastHits) this.lastHits = hits;
    if (landed && live) {
      const g = clamp((fin(h.slamG, 2) - 1.2) / 3.5, 0.25, 1);
      landingHit(ac, v, this.noise, Math.max(landed, g));
      duckFor(ac, v, 0.55 * Math.max(landed, g), 0.22);
      this.landT = t; this.landings = fin(this.landings, 0) + 1; this.slamsPlayed = fin(this.slamsPlayed, 0) + 1;
    }
    // A landing also trips the sim's slam detector, because coming down IS a slam. Only one of
    // the two is played, or every landing arrives twice.
    if (slams > this.lastSlams && live && !(t - fin(this.landT, -9) < 0.2) && this._gate('slam', 0.07)) {
      const k = clamp((fin(h.slamG, 2) - 1.5) / 3, 0.15, 1);
      slamHit(ac, v, this.noise, k);
      duckFor(ac, v, 0.30 * k, 0.14);
      this.slamsPlayed = fin(this.slamsPlayed, 0) + 1;
    }
    this.lastSlams = slams;
    // A knock is a different event from a slam: the hull hit SOMETHING, not the sea.
    if (hits > this.lastHits && live && this._gate('knock', 0.09)) {
      knockHit(ac, v, this.noise, clamp(fin(h.lastHitSpeed, 2) / 8, 0.15, 1));
      this.knocks = fin(this.knocks, 0) + 1;
    }
    this.lastHits = hits;

    // ---- hulls going past --------------------------------------------------------------------
    if (v.pass) {
      const hd = fin(h.heading, 0), ch = Math.cos(hd), sh = Math.sin(hd);
      const u = fin(h.u), sv = fin(h.v);
      this.passN = v.pass.update(t, this.trafficList || h.dyn || null, {
        x: fin(h.x), z: fin(h.z),
        vx: ch * u - sh * sv, vz: sh * u + ch * sv,
        rx: -sh, rz: ch,                      // the camera's right (gl/core.js viewFromYawPitch)
      }, live);
    }
  }

  // Debug snapshot for headless checks (window.efoil.craft.audio.debug()).
  debug() {
    const v = this.v, ac = this.ac;
    return {
      enabled: this.enabled, gesture: this.gesture, kind: this.kind, state: ac ? ac.state : 'none', voices: !!v,
      slamsPlayed: this.slamsPlayed, landings: this.landings, knocks: this.knocks, passers: this.passN,
      load: +fin(this.engLoad, 0).toFixed(3), loadEff: +fin(this.loadEff, 0).toFixed(3),
      open: +fin(this.openN, 0).toFixed(3), accel: +fin(this.accel, 0).toFixed(2),
      strokes: v ? v.strokes : 0, pipeHz: v ? +fin(v.pipeHz, 0).toFixed(1) : 0,
      onPipe: +fin(this.onPipeN, 0).toFixed(3),
      ...(v ? { fireHz: +v.fire.frequency.value.toFixed(1), lowHz: +v.fLow.frequency.value.toFixed(0),
        midHz: +v.fMid.frequency.value.toFixed(0), topHz: +v.fTop.frequency.value.toFixed(0),
        gLow: +v.gLow.gain.value.toFixed(3), gMid: +v.gMid.gain.value.toFixed(3), gTop: +v.gTop.gain.value.toFixed(3),
        exhLP: +v.exhLP.frequency.value.toFixed(0), engGain: +v.engG.gain.value.toFixed(3),
        whineHz: +v.whine.frequency.value.toFixed(0), whineGain: +v.whineG.gain.value.toFixed(4),
        pumpGain: +v.pumpG.gain.value.toFixed(3), rushGain: +v.rushG.gain.value.toFixed(3),
        windGain: +v.windG.gain.value.toFixed(3), fizzGain: +v.fizzG.gain.value.toFixed(3),
        duck: +v.duck.gain.value.toFixed(3), master: +v.master.gain.value.toFixed(3) } : {}),
    };
  }
}
