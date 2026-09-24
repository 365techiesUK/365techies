// VIKING RAID - procedural WebAudio sound effects (tr57). NO samples, nothing downloaded:
// every sound is built from oscillators, one shared noise buffer, filters and envelopes.
//
// Honours the game's sound settings exactly as src/boats/engine-audio.js does: nothing
// is ever created with ?sound=0, ?mute, a ?cal= render or ?clean=1, and no AudioContext
// exists until the first user gesture (pointerdown / keydown / touchstart).
//
// Palette: cannon boom (noise thump + falling sine), rocket whoosh (band-passed noise
// sweep), flare pop, splinter crack (clicky high noise bursts), splash (low-passed
// noise sweeping down), ram thud, war horn (detuned saws through a low-pass with a
// slow swell), cheer (formant-filtered noise with a wobble), combo sting (rising
// arpeggio), power-up chime, hurt thump, shield ping, shark lunge (growling noise
// swell into a splash), flagship horn (deeper, longer), flagship-sunk fanfare, landing.
//
// tr140 THE CORSAIRS. Thirteen more, all pirate-only, in two groups.
//
//   THE CREW, wordless: chant (a four-beat boarding cadence over a rope drum), jeer, warcry,
//   crewcry (a hull going down, from the men on her), heave (a work cadence). Every one is a
//   CROWD - a bank of detuned sawtooth "glottal" oscillators plus breath noise through three
//   parallel band-pass resonators standing in for the first three vocal formants. Moving those
//   three frequencies changes the VOWEL. No words are said in any language and none can be:
//   there is no consonant machinery here at all, and that is deliberate.
//
//   THE SHIP: runout (the guns hauled out on wooden trucks BEFORE a broadside), creak (rope,
//   stick-slip), block (a squealing sheave), groan (the hull working as she rolls), canvas
//   (a sail cracking full, then luffing), bell (inharmonic partials, not a chime), drum,
//   hullsea (sea arriving on a resonant wooden box, which is not the sound of sea).
//
// Nothing about event routing changed for either of those groups. The crew voices are layered
// onto cues the mode ALREADY emits, and the ship's bed comes from ambience(), which the mode's
// existing 240 ms ambience pump calls. Norse is untouched: every tr140 path is fenced behind
// this.foe === 'pirate'.

const Q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();

// tr140: measured first-three-formant centres for a LOW MALE voice, in Hz. These five vowels
// are all the crew can say, and five vowels are not a language - they carry effort and rage
// and nothing else, which is the whole point. /a/ open, /o/ rounded, /e/ front, /u/ closed,
// /i/ bright.
const VOW = { a: [730, 1090, 2440], o: [570, 840, 2410], e: [530, 1840, 2480], u: [300, 870, 2240], i: [270, 2290, 3010] };

export class RaidAudio {
  // tr128: `foe` swaps TWO cues and nothing else. All 35 are procedural - there is not one
  // audio asset in this project - so a faction's voice is two functions, not a sound bank.
  constructor(foe = 'norse') {
    this.foe = foe === 'pirate' ? 'pirate' : 'norse';
    this.enabled = typeof window !== 'undefined' && !!(window.AudioContext || window.webkitAudioContext)
      && !Q.has('cal') && Q.get('clean') !== '1' && Q.get('sound') !== '0' && !Q.has('mute');
    this.ac = null; this.out = null; this.noise = null; this.last = new Map();
    if (!this.enabled) return;
    const wake = () => this._wake();
    for (const e of ['pointerdown', 'keydown', 'touchstart']) addEventListener(e, wake, { passive: true });
  }

  _wake() {
    if (!this.enabled) return;
    if (!this.ac) {
      try {
        const ac = new (window.AudioContext || window.webkitAudioContext)();
        const comp = ac.createDynamicsCompressor();
        comp.threshold.value = -14; comp.ratio.value = 6;
        const g = ac.createGain(); g.gain.value = 0.55;
        g.connect(comp).connect(ac.destination);
        const buf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate), d = buf.getChannelData(0);
        let s = 22222;
        for (let i = 0; i < d.length; i++) { s = (s * 16807) % 2147483647; d[i] = (s / 2147483647) * 2 - 1; }
        this.ac = ac; this.out = g; this.noise = buf;
      } catch { this.enabled = false; return; }
    }
    if (this.ac.state === 'suspended') this.ac.resume();
  }

  get ready() { return this.enabled && this.ac && this.ac.state === 'running'; }

  // throttle a sound id so a swarm cannot stack 40 copies in one frame
  _gate(id, gap) {
    const t = this.ac.currentTime, l = this.last.get(id);
    if (l !== undefined && t - l < gap) return false;
    this.last.set(id, t); return true;
  }

  _env(node, t, a, peak, d, end = 0.0008) {
    const g = this.ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(end, t + a + d);
    node.connect(g).connect(this.out);
    return g;
  }

  _noise(t, dur, type, f0, f1, q, peak, a = 0.004) {
    const ac = this.ac, src = ac.createBufferSource();
    src.buffer = this.noise; src.loop = true;
    const f = ac.createBiquadFilter(); f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    src.connect(f);
    this._env(f, t, a, peak, dur);
    src.start(t, Math.random() * 0.5); src.stop(t + a + dur + 0.05);
  }

  _tone(t, type, f0, f1, dur, peak, a = 0.005) {
    const ac = this.ac, o = ac.createOscillator();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    this._env(o, t, a, peak, dur);
    o.start(t); o.stop(t + a + dur + 0.05);
  }

  // A ship's bell (two strikes) or a boatswain's call (a rising then falling whistle).
  // Generic maritime sounds; nothing here is sampled from anything.
  // tr140: the bell now comes from _bell(), which uses a founder's INHARMONIC partials. The
  // seven sines this used to hold were 1180/2360/3180/4720 Hz - a harmonic series, which is a
  // tubular chime. A bell is the one everyday object whose overtones are deliberately not
  // harmonic, and that is the single thing that makes it recognisable.
  _pipe(t, boss, v) {
    if (!this._gate(boss ? 'bosshorn' : 'horn', 1.5)) return;
    const ac = this.ac;
    if (!boss) {
      this._bell(t, 660, v, 3.1);
      this._bell(t + 0.42, 660, v * 0.9, 3.1);   // struck in pairs, as a watch is struck
      return;
    }
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.26 * v, t + 0.12);
    g.gain.setValueAtTime(0.26 * v, t + 1.5); g.gain.exponentialRampToValueAtTime(0.0006, t + 2.0);
    const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2400; f.Q.value = 6;
    f.connect(g).connect(this.out);
    const o = ac.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(1500, t);
    o.frequency.exponentialRampToValueAtTime(2500, t + 0.55);
    o.frequency.setValueAtTime(2500, t + 0.95);
    o.frequency.exponentialRampToValueAtTime(1400, t + 1.9);
    const tr = ac.createOscillator(), tg = ac.createGain();
    tr.frequency.value = 22; tg.gain.value = 190; tr.connect(tg).connect(o.frequency);
    o.connect(f); o.start(t); o.stop(t + 2.05); tr.start(t); tr.stop(t + 2.05);
  }

  // ==== tr140: THE CREW AND THE SHIP =========================================================
  //
  // A crowd of men, not one man. One synthesised throat shouting is a cartoon; a dozen throats
  // slightly out of tune with each other is a crowd, and a boarding party IS a crowd. There are
  // no words in here and none are possible: the source is a bank of detuned sawtooth "glottal"
  // oscillators plus breath noise, shaped by three parallel band-pass resonators standing in
  // for the first three vocal formants. Sweeping those three frequencies turns the same crowd
  // from an open /a/ shout into a closed /u/ grunt. That is a VOWEL, not a word - it carries
  // effort and aggression and no language at all, which is exactly what is wanted.

  // One bank of voices. `seq` is a list of [dt, vowel, level] breakpoints: the caller supplies
  // enough of them to make sharp attacks, so a shout, a grunt and a swelling roar are all the
  // same twenty-seven nodes with a different shape drawn through them.
  // `bend` is [dt, cents] applied to every voice's detune - a shout rises, a cry falls away.
  //
  // ⚠️ MAKE-UP GAIN. Three band-pass resonators at Q 6.5-11 throw away almost everything a
  // sawtooth bank puts into them: bounced at face value the crew peaked at 0.029 of full scale
  // against a cannon at 0.19, which is a crowd you cannot hear over the guns. MAKEUP is the
  // measured insertion loss of the formant bank, not a taste control - `warcry` was bounced,
  // its true peak read off the WAV, and the number set so it lands at 0.20.
  _crowd(t, o) {
    const ac = this.ac, dur = o.dur, voices = o.voices || 6, peak = (o.peak || 0.3) * 7.0;
    const env = ac.createGain();
    const bank = ac.createGain(); bank.gain.value = 1;
    const V0 = VOW[o.seq[0][1]] || VOW.a;
    const fN = [];
    for (let k = 0; k < 3; k++) {
      const f = ac.createBiquadFilter(); f.type = 'bandpass';
      f.frequency.setValueAtTime(V0[k], t);
      f.Q.value = [6.5, 9, 11][k];
      const g = ac.createGain(); g.gain.value = [1, 0.5, 0.2][k];
      bank.connect(f); f.connect(g); g.connect(env);
      fN.push(f);
    }
    env.gain.setValueAtTime(Math.max(0.0001, peak * o.seq[0][2]), t);
    env.connect(this.out);
    for (let i = 1; i < o.seq.length; i++) {
      const dt = o.seq[i][0], V = VOW[o.seq[i][1]] || VOW.a, lv = o.seq[i][2], tt = t + dt;
      for (let k = 0; k < 3; k++) fN[k].frequency.exponentialRampToValueAtTime(V[k], tt);
      env.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * lv), tt);
    }
    env.gain.exponentialRampToValueAtTime(0.0006, t + dur);
    // two drift oscillators at rates that do not divide into each other, each moving half the
    // voices: one LFO would make the crowd sway in unison, which reads as a chorus effect
    const drift = [];
    for (const r of [o.drift || 3.3, (o.drift || 3.3) * 1.61]) {
      const l = ac.createOscillator(); l.type = 'sine'; l.frequency.value = r;
      const lg = ac.createGain(); lg.gain.value = o.driftCents || 16;
      l.connect(lg); l.start(t); l.stop(t + dur + 0.08);
      drift.push(lg);
    }
    const f0 = o.f0 || 124, spread = o.spread === undefined ? 0.055 : o.spread;
    for (let i = 0; i < voices; i++) {
      const os = ac.createOscillator(); os.type = 'sawtooth';
      const r = voices > 1 ? (i / (voices - 1)) * 2 - 1 : 0;
      os.frequency.value = f0 * (1 + spread * r) * (0.985 + Math.random() * 0.03);
      if (o.bend) {
        os.detune.setValueAtTime(o.bend[0][1], t);
        for (let k = 1; k < o.bend.length; k++) os.detune.linearRampToValueAtTime(o.bend[k][1], t + o.bend[k][0]);
      }
      drift[i % 2].connect(os.detune);
      const g = ac.createGain(); g.gain.value = 1 / voices;
      os.connect(g).connect(bank);
      os.start(t + Math.random() * 0.012); os.stop(t + dur + 0.08);   // ragged onsets
    }
    const rasp = o.rasp === undefined ? 0.5 : o.rasp;
    if (rasp > 0) {                       // breath: a shout is half air
      const src = ac.createBufferSource(); src.buffer = this.noise; src.loop = true;
      const bf = ac.createBiquadFilter(); bf.type = 'bandpass'; bf.frequency.value = 1150; bf.Q.value = 0.6;
      const bg = ac.createGain(); bg.gain.value = rasp * 0.45;
      src.connect(bf).connect(bg).connect(bank);
      src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.08);
    }
    if (o.am) {                           // jeering chops; a steady roar does not
      const l = ac.createOscillator(); l.type = 'sine'; l.frequency.value = o.am[0];
      const lg = ac.createGain(); lg.gain.value = peak * o.am[1];
      l.connect(lg).connect(env.gain); l.start(t); l.stop(t + dur + 0.08);
    }
  }

  // A ship's bell. What makes a bell a bell and not a chime is that its partials are NOT a
  // harmonic series: a founder tunes hum, prime, tierce, quint and nominal, and the tierce is
  // a MINOR third, which is why every bell sounds minor. Each partial gets its own decay (the
  // high ones die first) and a few cents of detune, so the strike beats instead of ringing
  // pure. The old pirate bell used 1180/2360/3180/4720 Hz - octaves and a fifth, a harmonic
  // series, which is a tubular chime, not a bell.
  _bell(t, f, v, dur) {
    const ac = this.ac;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.34 * v, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0006, t + dur);
    g.connect(this.out);
    for (const p of [[0.5, 0.60, -4, 1.0], [1, 1, 0, 0.82], [1.19, 0.58, 7, 0.55],
      [1.5, 0.34, -6, 0.40], [2.0, 0.46, 5, 0.30], [2.5, 0.17, 9, 0.20], [3.01, 0.11, -8, 0.14]]) {
      const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = f * p[0]; o.detune.value = p[2];
      const og = ac.createGain();
      og.gain.setValueAtTime(p[1], t);
      og.gain.exponentialRampToValueAtTime(0.0002, t + dur * p[3]);
      o.connect(og).connect(g); o.start(t); o.stop(t + dur + 0.05);
    }
    this._noise(t, 0.02, 'highpass', 4200, 3000, 1, 0.16 * v, 0.0008);   // clapper on metal
  }

  // A rope drum: a slack head (the pitch drops fast), the slap of the stick, and the shell.
  _drum(t, v, f) {
    this._tone(t, 'sine', f, f * 0.40, 0.26, 0.50 * v, 0.003);
    this._noise(t, 0.08, 'bandpass', 900, 380, 1.1, 0.26 * v, 0.001);
    this._noise(t, 0.32, 'lowpass', 250, 120, 0.9, 0.20 * v, 0.006);
  }

  // Rope and rigging. A creak is STICK-SLIP, not a glide: the rope grips, the tension builds,
  // it lets go, and the resonance jumps. Stepping the band-pass centre with setValueAtTime is
  // what makes it a creak; ramping it would make a slide whistle.
  _creak(t, v, dur, f0, f1, q) {
    const ac = this.ac, src = ac.createBufferSource();
    src.buffer = this.noise; src.loop = true;
    const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    const n = 7;
    for (let i = 1; i <= n; i++) {
      f.frequency.setValueAtTime(f0 + (f1 - f0) * (i / n) * (0.65 + Math.random() * 0.6), t + dur * (i / n) * 0.92);
    }
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.62 * v, t + 0.10);
    g.gain.exponentialRampToValueAtTime(0.0006, t + dur);
    const l = ac.createOscillator(); l.type = 'sawtooth'; l.frequency.value = 4.2 + Math.random() * 3.4;
    const lg = ac.createGain(); lg.gain.value = 0.055 * v;
    l.connect(lg).connect(g.gain); l.start(t); l.stop(t + dur + 0.05);
    src.connect(f).connect(g).connect(this.out);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.06);
  }

  // A block squealing as a sheet runs through it: one very narrow resonance that rises, holds
  // and falls as the load comes on and off, with a fast flutter from the sheave.
  _block(t, v) {
    const ac = this.ac, dur = 0.72, src = ac.createBufferSource();
    src.buffer = this.noise; src.loop = true;
    const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 19;
    f.frequency.setValueAtTime(1350, t);
    f.frequency.exponentialRampToValueAtTime(2250, t + 0.30);
    f.frequency.exponentialRampToValueAtTime(1650, t + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.34 * v, t + 0.07);
    g.gain.exponentialRampToValueAtTime(0.0006, t + dur);
    const l = ac.createOscillator(); l.type = 'triangle'; l.frequency.value = 17 + Math.random() * 9;
    const lg = ac.createGain(); lg.gain.value = 0.05 * v;
    l.connect(lg).connect(g.gain); l.start(t); l.stop(t + dur + 0.05);
    src.connect(f).connect(g).connect(this.out);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.06);
    this._noise(t + dur * 0.55, 0.05, 'bandpass', 2600, 2100, 8, 0.05 * v, 0.004);
  }

  // The hull working as she rolls: three narrow low resonances (the frames) on noise, swelling
  // over a couple of seconds, over a sub that is felt more than heard. This is a big wooden box
  // being twisted - nothing else in the palette sits under 100 Hz for two seconds.
  _groan(t, v, dur) {
    const ac = this.ac;
    for (const p of [[78, 13, 1], [132, 16, 0.65], [211, 11, 0.3]]) {
      const src = ac.createBufferSource(); src.buffer = this.noise; src.loop = true;
      const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = p[1];
      f.frequency.setValueAtTime(p[0], t);
      f.frequency.linearRampToValueAtTime(p[0] * (0.86 + Math.random() * 0.1), t + dur);
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.30 * v * p[2], t + dur * 0.45);
      g.gain.exponentialRampToValueAtTime(0.0006, t + dur);
      src.connect(f).connect(g).connect(this.out);
      src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.06);
    }
    this._tone(t, 'sine', 46, 39, dur * 0.8, 0.13 * v, 0.25);
  }

  // Canvas: the crack as a sail fills, then the luff - the leech shaking, which is noise
  // CHOPPED at a few hertz rather than noise faded in and out.
  _canvas(t, v) {
    this._noise(t, 0.05, 'highpass', 2600, 1100, 0.8, 0.30 * v, 0.0015);
    this._tone(t, 'sine', 240, 120, 0.09, 0.16 * v, 0.002);
    const ac = this.ac, dur = 0.85, src = ac.createBufferSource();
    src.buffer = this.noise; src.loop = true;
    const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 0.8;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.13 * v, t + 0.14);
    g.gain.exponentialRampToValueAtTime(0.0006, t + 0.05 + dur);
    const l = ac.createOscillator(); l.type = 'square'; l.frequency.value = 5.2 + Math.random() * 2.6;
    const lg = ac.createGain(); lg.gain.value = 0.085 * v;
    l.connect(lg).connect(g.gain); l.start(t); l.stop(t + dur + 0.1);
    src.connect(f).connect(g).connect(this.out);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.12);
  }

  // THE GUNS RUNNING OUT. A gun is two tons on wooden trucks hauled up to the port before it
  // can fire, and it is the sound that says "a broadside is coming" - the boom only says it
  // came. The rumble is low-passed noise pushed by TWO amplitude oscillators at rates that do
  // not divide into each other, which is trucks over deck seams rather than a tremolo, and it
  // ends with the carriage brought up hard against the ship's side.
  _runout(t, v) {
    const ac = this.ac, dur = 0.82;
    const src = ac.createBufferSource(); src.buffer = this.noise; src.loop = true;
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 1.2;
    f.frequency.setValueAtTime(150, t); f.frequency.exponentialRampToValueAtTime(235, t + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.30 * v, t + 0.28);
    g.gain.exponentialRampToValueAtTime(0.40 * v, t + dur - 0.06);
    g.gain.exponentialRampToValueAtTime(0.02 * v, t + dur);
    for (const p of [[12.7, 0.15], [21.3, 0.09]]) {
      const l = ac.createOscillator(); l.type = 'sawtooth'; l.frequency.value = p[0];
      const lg = ac.createGain(); lg.gain.value = p[1] * v;
      l.connect(lg).connect(g.gain); l.start(t); l.stop(t + dur + 0.05);
    }
    src.connect(f).connect(g).connect(this.out);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.06);
    this._tone(t + dur, 'sine', 190, 88, 0.16, 0.34 * v, 0.002);            // carriage on the side
    this._noise(t + dur, 0.10, 'bandpass', 520, 300, 3, 0.28 * v, 0.001);   // wood on wood
    this._noise(t + dur, 0.05, 'highpass', 2400, 1600, 1, 0.13 * v, 0.001); // the tackle
  }

  // Sea against a wooden hull, which is not the same sound as sea. `splash` is broadband water;
  // this is water arriving on a resonant box, so it is band-limited and rings at the hull's own
  // low frequency. Deliberately very quiet: it is a bed, not a cue.
  _hullsea(t, v) {
    const ac = this.ac, dur = 1.5;
    const src = ac.createBufferSource(); src.buffer = this.noise; src.loop = true;
    const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.1;
    f.frequency.setValueAtTime(700, t);
    f.frequency.exponentialRampToValueAtTime(260, t + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.19 * v, t + 0.22);
    g.gain.exponentialRampToValueAtTime(0.0006, t + dur);
    const res = ac.createBiquadFilter(); res.type = 'peaking';
    res.frequency.value = 145; res.Q.value = 7; res.gain.value = 11;
    src.connect(f).connect(res).connect(g).connect(this.out);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.06);
  }

  // ---- the five crew voices, built on _crowd ------------------------------------------------

  // THE BOARDING CHANT. Four beats, two stressed, over a rope drum: the rhythm a working
  // crowd keeps, with no tune and no words. The vowel alternates open /a/ on the stress and
  // closed /o/ off it, and the whole thing climbs 80 cents, which is what a crowd winding
  // itself up does. It is a cadence, not a shanty - no melody is stated anywhere.
  //
  // ⚠️ The drum leads the shout by 20 ms (a crowd comes in just behind the beat, which is what
  // makes a cadence feel driven rather than mechanical). That lead is added to the VOICES, not
  // subtracted from the drum: `t` here is already only currentTime + 0.005, so `t - 0.02` is a
  // negative schedule time, and Web Audio throws on those. The bounce harness found this on
  // the first cue it rendered; the node-count tests did not, because a mock does not care.
  _chant(t, v) {
    const beat = 0.62, LEAD = 0.02, seq = [[0, 'a', 0.03]];
    for (let b = 0; b < 4; b++) {
      const on = b % 2 === 0, lv = on ? 1 : 0.55, vw = on ? 'a' : 'o', b0 = b * beat;
      seq.push([b0 + 0.045, vw, lv], [b0 + 0.26, vw, lv * 0.9], [b0 + 0.40, vw, 0.04]);
    }
    this._crowd(t + LEAD, {
      f0: 122, voices: 7, spread: 0.06, rasp: 0.55, peak: 0.30 * v, dur: 4 * beat + 0.25,
      bend: [[0, -40], [4 * beat, 40]], seq,
    });
    for (let b = 0; b < 4; b++) {
      const on = b % 2 === 0;
      this._drum(t + b * beat, (on ? 0.85 : 0.45) * v, on ? 150 : 138);
      if (on) this._noise(t + b * beat, 0.10, 'lowpass', 400, 160, 1.2, 0.16 * v, 0.002);  // boots
    }
  }

  // JEERING as they close. Shorter, brighter vowels than the chant, an irregular chop across
  // the whole crowd (that chop is what laughter and shouting-over-each-other does to a crowd's
  // envelope), and one or two voices pitched up out of it so it is not a single mass.
  _jeer(t, v) {
    this._crowd(t, {
      f0: 134, voices: 7, spread: 0.075, rasp: 0.65, peak: 0.26 * v, dur: 1.75,
      am: [7.4, 0.55], drift: 4.6, driftCents: 26,
      bend: [[0, 30], [0.5, -10], [1.75, -90]],
      seq: [[0, 'e', 0.05], [0.06, 'e', 1], [0.30, 'a', 0.8], [0.55, 'e', 0.35],
        [0.70, 'a', 0.95], [1.05, 'o', 0.5], [1.35, 'e', 0.6], [1.6, 'o', 0.08]],
    });
    this._crowd(t + 0.42, {                       // one man cutting through the rest
      f0: 188, voices: 2, spread: 0.02, rasp: 0.8, peak: 0.13 * v, dur: 0.85,
      bend: [[0, 120], [0.18, 0], [0.85, -240]],
      seq: [[0, 'a', 0.04], [0.05, 'a', 1], [0.28, 'e', 0.7], [0.62, 'o', 0.05]],
    });
    return true;
  }

  // THE ROAR when a section of the pier goes into the sea. The biggest crowd in the file:
  // eight voices, maximum breath, the pitch snapping up 180 cents at the start the way a
  // shout does, then sagging as they run out of air.
  _warcry(t, v) {
    this._crowd(t, {
      f0: 114, voices: 8, spread: 0.085, rasp: 0.95, peak: 0.34 * v, dur: 2.5,
      drift: 2.8, driftCents: 22,
      bend: [[0, -150], [0.22, 30], [1.2, 0], [2.5, -110]],
      seq: [[0, 'o', 0.05], [0.10, 'a', 0.85], [0.30, 'a', 1], [1.20, 'a', 0.9],
        [1.80, 'o', 0.55], [2.25, 'o', 0.08]],
    });
    return true;
  }

  // A HULL GOING DOWN, from the men on her. The crowd thins as it falls - the pitch drops more
  // than four semitones, the vowel closes from /a/ to /u/, and it is cut off rather than faded,
  // because the cue it rides on is a big splash.
  _crewcry(t, v) {
    this._crowd(t, {
      f0: 140, voices: 5, spread: 0.07, rasp: 0.7, peak: 0.27 * v, dur: 1.85,
      drift: 5.1, driftCents: 30,
      bend: [[0, 90], [0.12, 40], [1.85, -430]],
      seq: [[0, 'a', 0.06], [0.05, 'a', 1], [0.45, 'a', 0.8], [0.95, 'o', 0.45],
        [1.40, 'u', 0.18], [1.70, 'u', 0.04]],
    });
    return true;
  }

  // THE HEAVE. A work cadence: a closed, strained /u/ while the weight comes on, then the open
  // /a/ bark as it goes. The rope creak and the block are part of the same gesture - a heave is
  // men AND cordage, and the cordage is what makes it a ship instead of a gym.
  _heave(t, v) {
    this._crowd(t, {
      f0: 118, voices: 6, spread: 0.05, rasp: 0.75, peak: 0.28 * v, dur: 1.55,
      drift: 2.4, driftCents: 14,
      bend: [[0, -90], [0.55, -60], [0.62, 60], [1.55, -30]],
      seq: [[0, 'u', 0.04], [0.14, 'u', 0.30], [0.50, 'u', 0.55], [0.60, 'a', 1],
        [0.82, 'a', 0.82], [1.10, 'o', 0.14], [1.35, 'o', 0.03]],
    });
    this._creak(t, 0.85 * v, 0.62, 230, 560, 11);
    this._block(t + 0.48, 0.7 * v);
    return true;
  }

  // how loud something that far off should be. Same shape as the mode's own vol().
  _att(d) { return Math.max(0.10, Math.min(1, 1 - d / 260)); }

  // ==== tr140 THE SHIP'S OWN BED =============================================================
  //
  // Called from the mode's EXISTING 240 ms ambience pump - the one that already drives
  // crackle/roar/hiss off how much of the pier is burning - and from nowhere else. Norse
  // returns on the first line, so the Viking raid cannot be changed by any of this.
  //
  // Everything here is driven by REAL STATE and keeps no timer of its own: which pirate hulls
  // are alive, how far off they are, whether they are moored or under way, and - for the
  // run-out - each ship's own reload clock `s.bs.t`, which is how the trucks are heard BEFORE
  // the guns rather than under them. The `volley` event is emitted one frame (~16 ms) before
  // the first gun, so hanging a run-out on that event could never have worked.
  //
  // At most TWO voices start per tick, chosen by a rotating cursor, so a seven-ship fleet is
  // not eight simultaneous sources. Run-outs are counted against the same budget, because a
  // ship about to fire matters more than her rigging. Every voice is gated by _gate().
  ambience(g, px, pz) {
    if (!this.ready || this.foe !== 'pirate' || !g || !g.ships) return 0;
    const t = this.ac.currentTime + 0.005;
    let near = 1e9, moor = 1e9, under = 1e9, n = 0, fired = 0;
    const ro = [];
    for (const s of g.ships) {
      if (!(s.state === 'rowing' || (s.moored && s.state === 'landed'))) continue;
      const d = Math.hypot(s.x - px, s.z - pz);
      if (d < near) near = d;
      if (s.moored) { if (d < moor) moor = d; } else if (d < under) under = d;
      n++;
      const bs = s.bs;
      if (bs && bs.q === 0 && bs.t > 0 && bs.t <= 0.95 && d < 260) ro.push([d, s.id]);
    }
    // ⚠️ FOUND BY tmp-tr140/test-audio.mjs, not by ear: reloads are randomised per ship, but
    // nothing STOPS a dozen of them expiring on the same tick, and when the suite lined twelve
    // hulls up it got twelve run-outs in one 240 ms window - about 180 nodes of rumble at once
    // and a mush rather than a warning. Only the two NEAREST are worth hearing; the rest of the
    // fleet runs its guns out in silence, exactly as the rest of the fleet is already drawn
    // without smoke beyond a range.
    ro.sort((p, q) => p[0] - q[0]);
    for (let i = 0; i < ro.length && fired < 2; i++) {
      if (!this._gate('ro' + ro[i][1], 3)) continue;
      this._runout(t, this._att(ro[i][0]) * 0.9); fired++;
    }
    if (!n) return fired;
    // the 'ro' keys are per ship id and a long game makes hundreds; drop the stale ones.
    if (this.last.size > 192) { for (const e of this.last) if (t - e[1] > 30) this.last.delete(e[0]); }
    const bed = [
      ['creak', near, 150, 1.7, (a) => this._creak(t, a * 0.9, 1.15, 270, 700, 12)],
      ['hullsea', near, 130, 2.9, (a) => this._hullsea(t, a)],
      ['groan', near, 115, 4.3, (a) => this._groan(t, a * 0.85, 2.1)],
      ['block', near, 140, 5.9, (a) => this._block(t, a * 0.9)],
      ['canvas', under, 170, 7.3, (a) => this._canvas(t, a * 0.9)],
      ['jeer', near, 95, 11, (a) => this._jeer(t, a * 0.8)],
      ['heave', moor, 150, 8.5, (a) => this._heave(t, a * 0.9)],
      ['bell', near, 220, 29, (a) => this._bell(t, 660, a * 0.5, 3.0)],
    ];
    this.ambN = (this.ambN || 0) + 1;
    for (let k = 0; k < bed.length && fired < 2; k++) {
      const e = bed[(this.ambN + k) % bed.length];
      if (e[1] > e[2] || !this._gate('amb' + e[0], e[3])) continue;
      e[4](this._att(e[1])); fired++;
    }
    return fired;
  }

  play(name, v = 1) {
    if (!this.ready) return;
    const t = this.ac.currentTime + 0.005;
    // tr140 THE CORSAIRS' VOICES RIDE ON CUES THE MODE ALREADY EMITS. Not one event, call
    // site or table outside this file changed to make the crew audible: `bigsplash` is already
    // played on every sinking, `collapse` when a section of the pier goes, `moor` when a hull
    // ties up alongside, `lost` when the pier has burned. Each layer has its own gate, and the
    // ordinary cue still plays underneath - these ADD, they do not replace.
    if (this.foe === 'pirate') {
      // a war horn becomes a ship's bell and the chant the crew take up behind it;
      // a boss horn becomes a boatswain's call, a boarding drum and a roar
      if (name === 'horn') { this._pipe(t, false, v); if (this._gate('chantL', 7)) this._chant(t + 1.05, 0.8 * v); return; }
      if (name === 'bosshorn') {
        this._pipe(t, true, v);
        if (this._gate('bossL', 4)) {
          for (let i = 0; i < 6; i++) this._drum(t + 0.15 + i * 0.44, (i % 2 ? 0.40 : 0.72) * v, i % 2 ? 138 : 150);
          this._warcry(t + 1.15, 0.75 * v);
        }
        return;
      }
      if (name === 'bigsplash' && this._gate('cryL', 1.2)) this._crewcry(t + 0.10, Math.min(1, v));
      else if (name === 'collapse' && this._gate('roarL', 2.5)) this._warcry(t + 0.75, 1);
      else if (name === 'moor' && this._gate('heaveL', 2.5)) this._heave(t + 0.25, Math.min(1, v));
      else if (name === 'lost' && this._gate('jeerL', 3)) this._jeer(t + 0.55, 1);
    }
    switch (name) {
      case 'cannon':
        if (!this._gate(name, 0.06)) return;
        this._noise(t, 0.45, 'lowpass', 900, 90, 0.7, 0.9 * v);
        this._tone(t, 'sine', 120, 38, 0.5, 0.8 * v);
        break;
      // >>> ALLIES (wired at integration; tmp-tr141 called these and left them silent)
      // The allied fleet is the PLAYER'S side, so it must not sound like the corsairs'
      // bosshorn: their call is a pipe answered by a drum and a war cry; this is a pipe
      // answered by the WATCH BELL struck in pairs and a heave - men working, not men
      // coming for you. Built only from tr140's own primitives, so the inharmonic
      // founder's bell and the formant crowd are shared, never re-synthesised.
      // NB no name appears here: the one approved name lives in the HUD and nowhere else,
      // and tmp-tr141's suite asserts exactly that over every file that drives geometry.
      case 'pipe':
        if (!this._gate('pipe', 1.5)) return;
        this._pipe(t, false, v);
        break;
      case 'allyhorn':
        if (!this._gate('allyhorn', 6)) return;
        this._pipe(t, true, v);
        this._bell(t + 0.55, 590, 0.85 * v, 3.4);
        this._bell(t + 0.95, 590, 0.75 * v, 3.4);
        this._heave(t + 1.25, 0.85 * v);
        break;
      // An ally going down is the one moment in the raid that should NOT be exciting:
      // a single low toll and the cry of her crew in the water. No drum, no roar.
      case 'allydown':
        if (!this._gate('allydown', 2.5)) return;
        this._bell(t, 395, 0.7 * v, 4.2);
        this._crewcry(t + 0.35, 0.8 * v);
        break;
      // <<< ALLIES
      case 'rocket':
        if (!this._gate(name, 0.05)) return;
        this._noise(t, 0.35, 'bandpass', 700, 2600, 2.5, 0.35 * v, 0.02);
        this._tone(t, 'square', 180, 90, 0.08, 0.08 * v);
        break;
      case 'flare':
        if (!this._gate(name, 0.05)) return;
        this._tone(t, 'triangle', 600, 1400, 0.08, 0.25 * v);
        this._noise(t, 0.3, 'highpass', 2500, 1200, 0.8, 0.22 * v, 0.01);
        break;
      case 'torpedo':
        this._noise(t, 0.6, 'lowpass', 500, 200, 1, 0.4 * v, 0.03);
        break;
      case 'boom':
        if (!this._gate(name, 0.05)) return;
        this._noise(t, 0.6, 'lowpass', 1600, 120, 0.8, 0.8 * v);
        this._tone(t, 'sine', 90, 32, 0.55, 0.6 * v);
        this.play('crack', v * 0.7);
        break;
      case 'crack':
        if (!this._gate(name, 0.04)) return;
        for (let i = 0; i < 3; i++) this._noise(t + i * 0.035 + Math.random() * 0.02, 0.05, 'highpass', 3000, 1800, 1.5, 0.35 * v, 0.001);
        break;
      case 'splash':
        if (!this._gate(name, 0.05)) return;
        this._noise(t, 0.45 * (0.6 + v * 0.6), 'lowpass', 2600, 300, 0.9, 0.35 * Math.min(1.5, v), 0.01);
        break;
      case 'bigsplash':
        this._noise(t, 1.2, 'lowpass', 3200, 150, 0.7, 0.8 * v, 0.02);
        this._tone(t, 'sine', 70, 30, 0.9, 0.5 * v);
        break;
      case 'thud':
        if (!this._gate(name, 0.08)) return;
        this._tone(t, 'sine', 110, 45, 0.25, 0.7 * v);
        this._noise(t, 0.15, 'lowpass', 700, 200, 1, 0.45 * v);
        break;
      case 'horn':
      case 'bosshorn': {
        if (!this._gate(name, 1.5)) return;
        const boss = name === 'bosshorn', ac = this.ac, dur = boss ? 2.4 : 1.5;
        const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = boss ? 520 : 700; f.Q.value = 2;
        const g = ac.createGain();
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.35);
        g.gain.setValueAtTime(0.35, t + dur - 0.4); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
        f.connect(g).connect(this.out);
        const base = boss ? 73 : 98;
        for (const [m, det] of [[1, -6], [1, 6], [1.5, 0], [0.5, 0]]) {
          const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = base * m; o.detune.value = det;
          const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 5; lg.gain.value = 1.5;
          lfo.connect(lg).connect(o.frequency);
          o.connect(f); o.start(t); o.stop(t + dur + 0.05); lfo.start(t); lfo.stop(t + dur + 0.05);
        }
        break;
      }
      case 'cheer': {
        if (!this._gate(name, 0.6)) return;
        const ac = this.ac;
        for (const [fq, pk] of [[700, 0.16], [1150, 0.12], [2400, 0.07]]) {
          const src = ac.createBufferSource(); src.buffer = this.noise; src.loop = true;
          const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = fq; f.Q.value = 4;
          const g = ac.createGain();
          g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(pk * v, t + 0.12);
          g.gain.setValueAtTime(pk * v, t + 0.6); g.gain.exponentialRampToValueAtTime(0.0008, t + 1.1);
          const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 7 + Math.random() * 4; lg.gain.value = pk * v * 0.5;
          lfo.connect(lg).connect(g.gain);
          src.connect(f).connect(g).connect(this.out);
          src.start(t, Math.random() * 0.5); src.stop(t + 1.2); lfo.start(t); lfo.stop(t + 1.2);
        }
        break;
      }
      case 'combo': {
        const steps = Math.min(6, 2 + Math.floor(v));
        for (let i = 0; i < steps; i++) this._tone(t + i * 0.06, 'triangle', 523 * Math.pow(2, (i * 4 + Math.min(12, v)) / 12), 523 * Math.pow(2, (i * 4 + Math.min(12, v)) / 12), 0.12, 0.16);
        break;
      }
      case 'pickup':
        for (let i = 0; i < 4; i++) this._tone(t + i * 0.05, 'sine', 660 * Math.pow(2, i * 5 / 12), 660 * Math.pow(2, i * 5 / 12), 0.14, 0.2);
        break;
      case 'expire': this._tone(t, 'triangle', 660, 330, 0.25, 0.12); break;
      case 'hurt':
        if (!this._gate(name, 0.15)) return;
        this._tone(t, 'square', 180, 70, 0.22, 0.25 * v);
        this._noise(t, 0.2, 'lowpass', 900, 200, 1, 0.3 * v);
        break;
      case 'shield': this._tone(t, 'sine', 1400, 2200, 0.18, 0.18); break;
      case 'throw':
        if (!this._gate(name, 0.12)) return;
        this._noise(t, 0.18, 'bandpass', 1800, 900, 3, 0.07 * v, 0.02);
        break;
      case 'lunge':
        this._noise(t, 0.5, 'lowpass', 180, 600, 3, 0.45, 0.2);
        this._noise(t + 0.45, 0.6, 'lowpass', 2800, 250, 0.8, 0.5, 0.01);
        break;
      case 'tell': if (!this._gate(name, 0.8)) return; this._tone(t, 'sine', 220, 180, 0.35, 0.12); this._tone(t + 0.18, 'sine', 233, 190, 0.35, 0.12); break;
      case 'bosssunk':
        this.play('bigsplash', 1.4);
        for (let i = 0; i < 6; i++) this._tone(t + 0.3 + i * 0.1, 'triangle', [392, 523, 659, 784, 659, 1046][i], [392, 523, 659, 784, 659, 1046][i], i === 5 ? 0.6 : 0.14, 0.22);
        break;
      case 'landed':
        for (let i = 0; i < 3; i++) this._tone(t + i * 0.16, 'sawtooth', [330, 247, 196][i], [330, 247, 196][i] * 0.98, 0.18, 0.08);
        break;
      // ---- tr60 pier siege ----
      case 'crackle':        // fire ambience: a spatter of short bright clicks over a soft hiss
        if (!this._gate(name, 0.2)) return;
        for (let i = 0; i < 3 + Math.floor(3 * Math.min(1, v)); i++) this._noise(t + Math.random() * 0.22, 0.03, 'bandpass', 2500 + Math.random() * 3000, 1500, 2, 0.12 * Math.min(1.4, v), 0.001);
        this._noise(t, 0.3, 'bandpass', 900, 700, 0.7, 0.05 * Math.min(1.4, v), 0.05);
        break;
      case 'roar':           // a big fire's low roar
        if (!this._gate(name, 0.22)) return;
        this._noise(t, 0.35, 'lowpass', 260, 180, 0.8, 0.22 * Math.min(1.5, v), 0.08);
        break;
      case 'hiss':           // the water cannon
        if (!this._gate(name, 0.2)) return;
        this._noise(t, 0.26, 'highpass', 3200, 2600, 0.6, 0.12, 0.03);
        this._noise(t, 0.26, 'bandpass', 1100, 900, 1.2, 0.07, 0.03);
        break;
      case 'steam':          // water on fire: sizzle
        if (!this._gate(name, 0.14)) return;
        this._noise(t, 0.4, 'highpass', 5200, 3000, 0.8, 0.14 * Math.min(1.3, v), 0.01);
        break;
      case 'whoomph':        // something catches
        if (!this._gate(name, 0.25)) return;
        this._noise(t, 0.5, 'lowpass', 300, 1400, 1.5, 0.45 * v, 0.06);
        break;
      case 'smash':          // clay fire pot breaking
        if (!this._gate(name, 0.08)) return;
        this._noise(t, 0.08, 'bandpass', 2200, 1200, 1.2, 0.3 * v, 0.001);
        this._noise(t + 0.03, 0.35, 'lowpass', 500, 1500, 1, 0.3 * v, 0.03);
        break;
      case 'lob': if (!this._gate(name, 0.15)) return; this._noise(t, 0.25, 'bandpass', 500, 300, 2, 0.08 * v, 0.03); break;
      case 'moor': if (!this._gate(name, 0.5)) return; this._tone(t, 'sine', 90, 60, 0.3, 0.4 * v); this._noise(t, 0.2, 'lowpass', 600, 200, 1, 0.3 * v); break;
      case 'knock':          // a warrior hosed off a ladder: a comic falling whistle, then a splash
        this._tone(t, 'sine', 900, 300, 0.4, 0.12);
        this._noise(t + 0.4, 0.5, 'lowpass', 2600, 300, 0.9, 0.35 * Math.max(0.4, v), 0.01);
        break;
      case 'collapse': {     // a section falls: a long rumble, splintering and a sub drop
        this._noise(t, 2.6, 'lowpass', 400, 60, 0.7, 0.9, 0.05);
        this._tone(t, 'sine', 70, 25, 2.2, 0.7);
        for (let i = 0; i < 6; i++) this._noise(t + 0.1 + i * 0.18 + Math.random() * 0.1, 0.07, 'highpass', 2600, 1400, 1.2, 0.3, 0.001);
        break;
      }
      case 'barrage': this._noise(t, 0.6, 'bandpass', 700, 250, 1.5, 0.3 * v, 0.1); break;
      case 'lost':
        for (let i = 0; i < 4; i++) this._tone(t + i * 0.3, 'sawtooth', [220, 196, 175, 147][i], [220, 196, 175, 147][i] * 0.97, i === 3 ? 0.9 : 0.26, 0.09);
        break;
      case 'wave': this._tone(t, 'square', 392, 392, 0.12, 0.06); this._tone(t + 0.14, 'square', 523, 523, 0.2, 0.06); break;
      // ---- tr140 the corsairs. Each is also its own cue so it can be bounced and heard
      // on its own by src/raid/raid-audio-preview.js; the layers above call the same methods.
      case 'chant': if (!this._gate(name, 4)) return; this._chant(t, v); break;
      case 'jeer': if (!this._gate(name, 1.5)) return; this._jeer(t, v); break;
      case 'warcry': if (!this._gate(name, 2)) return; this._warcry(t, v); break;
      case 'crewcry': if (!this._gate(name, 1.2)) return; this._crewcry(t, v); break;
      case 'heave': if (!this._gate(name, 2)) return; this._heave(t, v); break;
      case 'runout': if (!this._gate(name, 0.5)) return; this._runout(t, v); break;
      case 'creak': if (!this._gate(name, 0.5)) return; this._creak(t, v, 1.15, 270, 700, 12); break;
      case 'block': if (!this._gate(name, 0.5)) return; this._block(t, v); break;
      case 'groan': if (!this._gate(name, 1.2)) return; this._groan(t, v, 2.1); break;
      case 'canvas': if (!this._gate(name, 0.6)) return; this._canvas(t, v); break;
      case 'drum': if (!this._gate(name, 0.12)) return; this._drum(t, v, 150); break;
      case 'hullsea': if (!this._gate(name, 0.8)) return; this._hullsea(t, v); break;
      case 'bell': if (!this._gate(name, 1.2)) return; this._bell(t, 660, v, 3.1); this._bell(t + 0.42, 660, v * 0.9, 3.1); break;
      // >>> SMUGGLE (tmp-tr170)
      // FOUR CUES FOR THE DORSET SMUGGLING RUN, and nothing else in this file is touched.
      // ADDITIVE ONLY: no existing case, table, layer, gate or primitive above is changed by
      // one byte, which is what the suite's NORSE_SIG hashes are there to hold. They are
      // faction-blind on purpose - the smuggling run has no faction - and every one is built
      // out of primitives this file already owns.
      //
      // Nothing here is a weapon sound. There is no shot, no impact on a person, no cry and
      // no pain in any of them: the loudest thing that happens in that level is a rope.
      //   seizure  - a boat is taken. A boatswain's call cut off short by a rope thrown and
      //              caught: the whistle, then the slap of a line on a deck. Not a bang.
      //   sowcrop  - the crop goes over the side. A run of rope through a man's hands, then
      //              the heavy, dull entries of weighted casks one after another.
      //   creepdrag- the grapnel dragging over the bottom. A low band of moving gravel with
      //              the chain ticking through it. It loops while the player is creeping, so
      //              it is gated hard and stays quiet.
      //   tubup    - a tub breaks the surface and comes over the rail: water off wet wood
      //              and a cask on planking.
      case 'seizure':
        if (!this._gate(name, 0.5)) return;
        this._pipe(t, false, v * 0.55);
        this._noise(t + 0.30, 0.10, 'bandpass', 900, 380, 1.4, 0.40 * v, 0.004);
        this._tone(t + 0.32, 'sine', 190, 120, 0.16, 0.22 * v);
        break;
      case 'sowcrop':
        if (!this._gate(name, 0.6)) return;
        this._noise(t, 0.55, 'bandpass', 2100, 700, 1.1, 0.16 * v, 0.05);     // rope running out
        for (let i = 0; i < 5; i++) {
          const d = 0.16 + i * 0.13;
          this._noise(t + d, 0.26, 'lowpass', 520, 150, 0.9, 0.34 * v, 0.006);
          this._tone(t + d, 'sine', 128, 54, 0.22, 0.26 * v);
        }
        break;
      case 'creepdrag':
        if (!this._gate(name, 0.9)) return;
        this._noise(t, 1.05, 'bandpass', 300, 240, 0.9, 0.13 * v, 0.25);
        this._noise(t + 0.10, 0.85, 'highpass', 1600, 2400, 0.7, 0.045 * v, 0.20);
        this._tone(t + 0.02, 'triangle', 92, 78, 0.9, 0.055 * v, 0.20);
        break;
      case 'tubup':
        if (!this._gate(name, 0.4)) return;
        this._noise(t, 0.34, 'lowpass', 1400, 320, 0.8, 0.30 * v, 0.006);
        this._noise(t + 0.22, 0.14, 'bandpass', 1100, 520, 2.2, 0.20 * v, 0.004);
        this._tone(t + 0.24, 'sine', 240, 150, 0.14, 0.18 * v);
        break;
      // <<< SMUGGLE
    }
  }
}
