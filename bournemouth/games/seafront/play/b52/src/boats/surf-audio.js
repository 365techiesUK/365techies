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

const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const fin = (x, d = 0) => (Number.isFinite(x) ? x : d);

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

  return {
    surf: true, sources, bus, under, bedG, bedLP, fizG, sprG, sprHP, noise,
    s: 0x51f7ea5, st: -1, crests: -1, strokeT: 0, hand: 1, oneShots: 0,
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
function burst(ac, v, { gain, dur, f0, f1, type = 'bandpass', q = 0.8, pan = 0, attack = 0.01, rate = 1 }) {
  const t = ac.currentTime + 0.005;
  const src = ac.createBufferSource(); src.buffer = v.noise; src.playbackRate.value = rate;
  const f = ac.createBiquadFilter(); f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let last = g;
  if (ac.createStereoPanner && pan) { const p = ac.createStereoPanner(); p.pan.value = pan; g.connect(p); last = p; }
  src.connect(f).connect(g); last.connect(v.bus);
  src.start(t, rnd(v) * 0.8); src.stop(t + dur + 0.05);
  v.oneShots++;
}

function bubbles(ac, v, n) {
  for (let i = 0; i < n; i++) {
    const t = ac.currentTime + 0.05 + i * (0.06 + 0.08 * rnd(v));
    const o = ac.createOscillator(), g = ac.createGain();
    const f = 380 + 520 * rnd(v);
    o.type = 'sine'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 1.9, t + 0.05);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    o.connect(g).connect(v.bus); o.start(t); o.stop(t + 0.09);
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
  lv.spray = live * (state === 2 ? 0.30 * clamp((speed - 1.5) / 5, 0, 1) : 0);
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

export function surfDebug(v) {
  return { surf: true, bed: +v.lv.bed.toFixed(3), fizz: +v.lv.fizz.toFixed(3), spray: +v.lv.spray.toFixed(3),
    under: v.lv.under, oneShots: v.oneShots, crests: v.crests };
}
