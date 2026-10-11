// THE DOLPHINS' VOICES (26 Sep 2026). The owner: "is there any chance we can make the dolphins so
// they can make the dolphin noises that they make?"
//
// What you actually hear from a boat, in order of how often:
//   * THE BLOW. Every time a dolphin surfaces it breathes out through its blowhole: a sharp, wet
//     "pfff" with a short breath in after it. It is the sound people on the water hear, and it is
//     played at the exact moment the pod's own breath puff is drawn (dolphin-pod.js sets
//     d.puffed as the blowhole clears), so the sound and the spray come together.
//   * THE SPLASH as a leaping dolphin goes back in.
//   * WHISTLES and CLICKS. Bottlenose dolphins whistle (roughly 4-20 kHz sweeps, half a second to
//     a second long) and click, but they do it UNDER water - from a boat you hear them faintly at
//     best, when the animals are right beside you. So they are played only when the pod is within
//     a few boat lengths, quietly, and low-passed as if coming through the water. That is the one
//     piece of licence in this file, and it is kept small on purpose.
//
// READ ONLY. It reads the pod (positions, modes, the puffed flag, the mood) and the player's pose,
// and writes nothing back: the dolphins behave exactly as they did without it. It owns no
// AudioContext - Dolphin Watch's module hands it the one it already owns, which is already gated
// on ?cal / ?clean=1 / ?sound=0 / ?mute and reached by the game's master sound switch.
// No Math.random: variation comes from its own small generator, so nothing here can disturb the
// seeded simulation.

import { ROLL, LEAP, DIVE, RIDE, APPROACH } from '../dolphin-pod.js';

const HEAR = 180;          // m: a blow further off than this is not heard
const NEAR = 28;           // m: whistles and clicks only when the pod is this close
const WHISTLE_GAP = [2.5, 7.0];   // s between whistles while they are near
const CLICK_CHANCE = 0.35;        // of a whistle slot being a click train instead

export class DolphinVoice {
  constructor(seed = 0x5eaf00d) {
    this.s = seed >>> 0;
    this.prev = [];        // per dolphin: { puffed, mode }
    this.nextCall = 2.0;   // s until the next whistle/click slot
    this.noise = null;     // one second of white noise, made on first use
    this.out = null;       // this module's own gain into the destination
    this.stats = { blows: 0, splashes: 0, whistles: 0, clicks: 0 };
  }

  _r() {                   // mulberry32
    let t = (this.s += 0x6D2B79F5) >>> 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  _init(ac) {
    if (this.out && this.out.context === ac) return;
    // LOUDER (26 Sep, the owner: "a bit louder so you can hear them"): blows +3.3 dB, splashes
    // +2.8 dB, whistles and clicks +6 dB, and the whole voice +0.9 dB.
    this.out = ac.createGain(); this.out.gain.value = 1.0;
    this.out.connect(ac.destination);
    const n = ac.sampleRate, b = ac.createBuffer(1, n, n), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = this._r() * 2 - 1;
    this.noise = b;
  }

  // Loudness and stereo position of a sound at (x, z), heard from the pose.
  _place(pose, x, z) {
    const dx = x - pose.x, dz = z - pose.z, dist = Math.hypot(dx, dz);
    // +turn is to the right, toward local +Z: the right vector is (-sin h, cos h)
    const pan = dist > 0.5 ? Math.max(-0.9, Math.min(0.9, (-dx * Math.sin(pose.heading) + dz * Math.cos(pose.heading)) / dist)) : 0;
    const gain = 1 / (1 + Math.pow(dist / 14, 1.6));
    return { dist, pan, gain };
  }

  _chain(ac, gain, pan) {
    const g = ac.createGain(); g.gain.value = 0;
    let last = g;
    if (ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = pan; g.connect(p); last = p; }
    last.connect(this.out);
    return g;
  }

  // THE BLOW: a sharp wet exhale (band-passed noise, falling) and a short soft inhale after it.
  blow(ac, level, pan) {
    const t = ac.currentTime + 0.01, v = level * (0.85 + 0.3 * this._r());
    const g = this._chain(ac, v, pan);
    const src = ac.createBufferSource(); src.buffer = this.noise; src.playbackRate.value = 0.9 + 0.2 * this._r();
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.9;
    bp.frequency.setValueAtTime(1900, t); bp.frequency.exponentialRampToValueAtTime(700, t + 0.35);
    const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 220;
    src.connect(bp).connect(hp).connect(g);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + 0.018);                 // the "p" of pfff
    g.gain.exponentialRampToValueAtTime(v * 0.35, t + 0.12);
    g.gain.exponentialRampToValueAtTime(0.0008, t + 0.42);
    // the breath in: quieter, darker, after a beat
    const t2 = t + 0.5 + 0.1 * this._r();
    g.gain.setValueAtTime(0.0008, t2);
    g.gain.linearRampToValueAtTime(v * 0.28, t2 + 0.12);
    g.gain.exponentialRampToValueAtTime(0.0008, t2 + 0.38);
    bp.frequency.setValueAtTime(900, t2); bp.frequency.linearRampToValueAtTime(1300, t2 + 0.3);
    src.start(t); src.stop(t2 + 0.45);
    this.stats.blows++;
  }

  splash(ac, level, pan) {
    const t = ac.currentTime + 0.01;
    const g = this._chain(ac, level, pan);
    const src = ac.createBufferSource(); src.buffer = this.noise; src.playbackRate.value = 0.7;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(3500, t); lp.frequency.exponentialRampToValueAtTime(600, t + 0.6);
    src.connect(lp).connect(g);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(level, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0008, t + 0.7);
    src.start(t); src.stop(t + 0.75);
    this.stats.splashes++;
  }

  // A WHISTLE: a frequency-modulated sweep with a quieter second harmonic, muffled as if through
  // the water. Four contour shapes, as in the signature whistles bottlenose dolphins make.
  whistle(ac, level, pan) {
    const t = ac.currentTime + 0.01, dur = 0.45 + 0.55 * this._r();
    const g = this._chain(ac, level, pan);
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 9000; lp.Q.value = 0.5;
    lp.connect(g);
    const f0 = 5500 + 2500 * this._r(), shape = Math.floor(this._r() * 4);
    for (const [mult, amp] of [[1, 1], [2, 0.18]]) {
      const o = ac.createOscillator(), og = ac.createGain(); o.type = 'sine'; og.gain.value = amp;
      const f = o.frequency;
      f.setValueAtTime(f0 * mult, t);
      if (shape === 0) f.exponentialRampToValueAtTime(f0 * 1.8 * mult, t + dur);                    // rise
      else if (shape === 1) f.exponentialRampToValueAtTime(f0 * 0.6 * mult, t + dur);               // fall
      else if (shape === 2) { f.exponentialRampToValueAtTime(f0 * 1.6 * mult, t + dur * 0.45); f.exponentialRampToValueAtTime(f0 * 0.9 * mult, t + dur); }  // up-down
      else { f.exponentialRampToValueAtTime(f0 * 0.75 * mult, t + dur * 0.3); f.exponentialRampToValueAtTime(f0 * 1.5 * mult, t + dur); }  // dip-rise
      o.connect(og).connect(lp); o.start(t); o.stop(t + dur + 0.05);
    }
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(level, t + 0.03);
    g.gain.setValueAtTime(level, t + dur - 0.06); g.gain.linearRampToValueAtTime(0, t + dur);
    this.stats.whistles++;
  }

  // A CLICK TRAIN: very short broadband clicks speeding up, the "creak" of echolocation.
  clicks(ac, level, pan) {
    const t = ac.currentTime + 0.01, dur = 0.35 + 0.4 * this._r();
    const g = this._chain(ac, 1, pan);
    const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2500; hp.connect(g);
    g.gain.value = level;
    // ⚠️ THE RATE IS CAPPED AND SO IS THE COUNT. Uncapped, rate *= 1.12 makes the gaps a
    // geometric series with a finite sum (about 9 / the starting rate): any `dur` longer than that
    // sum and this loop never ends - the whole game freezes. Found rendering the sounds offline
    // before release (26 Sep), not by luck in play.
    let tt = t, rate = 12 + 10 * this._r();
    for (let k = 0; k < 90 && tt < t + dur; k++) {
      const src = ac.createBufferSource(); src.buffer = this.noise;
      const cg = ac.createGain();
      cg.gain.setValueAtTime(1, tt); cg.gain.exponentialRampToValueAtTime(0.001, tt + 0.004);
      src.connect(cg).connect(hp); src.start(tt, this._r() * 0.9, 0.006);
      tt += 1 / rate; rate = Math.min(rate * 1.12, 160);
    }
    this.stats.clicks++;
  }

  // Once per fixed step. `dolphins` is the renderer's Dolphins (for .hidden and .sim), `pose` the
  // player's pose, `ac` a RUNNING AudioContext or null (then only the edge memory is kept up to
  // date, so nothing queued plays late when the sound comes on).
  update(dolphins, pose, dt, ac) {
    const P = dolphins && dolphins.sim, list = P ? P.pod : null;
    if (!list || !pose) return;
    const live = !!ac && !dolphins.hidden;
    if (live) this._init(ac);
    let nearest = 1e9;
    for (let i = 0; i < list.length; i++) {
      const d = list[i], p = this.prev[i] || (this.prev[i] = { puffed: d.puffed, mode: d.mode });
      if (live) {
        const pl = this._place(pose, d.x, d.z);
        nearest = Math.min(nearest, pl.dist);
        if (d.puffed && !p.puffed && (d.mode === ROLL || d.mode === LEAP) && pl.dist < HEAR) this.blow(ac, 0.8 * pl.gain, pl.pan);
        if (p.mode === LEAP && d.mode === DIVE && pl.dist < 90) this.splash(ac, 0.55 * pl.gain, pl.pan);
      }
      p.puffed = d.puffed; p.mode = d.mode;
    }
    if (!live) return;
    // whistles and clicks: only close, and mostly when they are coming to you or on the bow
    const social = P.mood === RIDE || P.mood === APPROACH;
    this.nextCall -= dt;
    if (this.nextCall <= 0) {
      this.nextCall = WHISTLE_GAP[0] + (WHISTLE_GAP[1] - WHISTLE_GAP[0]) * this._r() * (social ? 1 : 1.8);
      if (nearest < NEAR) {
        const d = list[Math.floor(this._r() * list.length)], pl = this._place(pose, d.x, d.z);
        const lvl = Math.min(1, 1.4 / (1 + nearest / 6));
        if (this._r() < CLICK_CHANCE) this.clicks(ac, 0.1 * lvl, pl.pan);
        else this.whistle(ac, 0.09 * lvl, pl.pan);
      }
    }
  }
}
