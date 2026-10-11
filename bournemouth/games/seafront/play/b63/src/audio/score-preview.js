// THE SCORE - OFFLINE BOUNCE (tr184). DEV TOOL ONLY. Nothing in src/ imports this, it
// registers no listeners and it does nothing on import, exactly as src/raid/raid-audio-preview.js
// is arranged and for the same reason.
//
// ⚠️ THIS PROJECT BUILT AN ENTIRE AUDIO SUBSYSTEM AND NEVER ONCE LISTENED TO IT. 94 assertions,
// an OfflineAudioContext harness, measured in detail, never heard. This file exists so that
// does not happen again with the music: every scene below renders to a 16-bit mono WAV a human
// can play. If a claim in score.js's header cannot be heard in one of these files, the claim is
// not evidence.
//
// MONO, ON PURPOSE. The game locks landscape on touch and is aimed at phones, and a phone is a
// single small speaker. A bed that only works in headphones is a bed that does not work, so
// nothing in this module is ever panned and every bounce is one channel.
//
// HOW IT DRIVES Score WITHOUT TOUCHING IT. An OfflineAudioContext reports state 'suspended'
// until it is rendering and its currentTime is stuck at 0, so the context handed to Score is a
// Proxy whose currentTime is the scheduling clock this file moves. Score.forOffline() then
// binds an instance without running the constructor, so no gesture listeners are registered and
// the URL flags are not consulted. score.js itself is untouched: what is bounced is exactly
// what the game would play.

import { Score } from './score.js';

export function offlineScore(sr, seconds, opts = {}) {
  const ac = new OfflineAudioContext(1, Math.ceil(sr * seconds), sr);
  const clock = { t: 0 };
  const prox = new Proxy(ac, {
    get(t, p) {
      if (p === 'currentTime') return clock.t;
      if (p === 'state') return 'running';
      const v = t[p];
      return typeof v === 'function' ? v.bind(t) : v;
    },
  });
  const sc = Score.forOffline(prox, ac.destination, opts);
  return { ac, sc, clock };
}

// 16-bit mono PCM WAV, so the owner can play it.
export function wavOf(pcm, sr) {
  const n = pcm.length, b = new Uint8Array(44 + n * 2), dv = new DataView(b.buffer);
  const str = (o, s) => { for (let i = 0; i < s.length; i++) b[o + i] = s.charCodeAt(i); };
  str(0, 'RIFF'); dv.setUint32(4, 36 + n * 2, true); str(8, 'WAVEfmt ');
  dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
  dv.setUint32(24, sr, true); dv.setUint32(28, sr * 2, true); dv.setUint16(32, 2, true);
  dv.setUint16(34, 16, true); str(36, 'data'); dv.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    const x = Math.max(-1, Math.min(1, pcm[i]));
    dv.setInt16(44 + i * 2, Math.round(x * 32767), true);
  }
  return b;
}

// ---------------------------------------------------------------------------------------------
// THE SCENES. `st(t)` is the state the game would be passing on that frame; `at` is a list of
// [second, fn(score)] for the things a game calls rather than passes.
//
// The long one is first and it is the one that matters: six minutes is most of a raid, and the
// point of listening to it is to satisfy yourself that it does not start to feel like a loop.
// The arithmetic that says it cannot is in test-score.mjs; this is the ear's half of it.
export const SCENES = {
  'bed-long-raid': {
    level: 'raid-norse', sr: 22050, secs: 360, seed: 0x51c0a2,
    note: 'THE BED ALONE, six minutes. No pulse at any point. Intensity drifts slowly so the '
      + 'density and brightness dials are doing something, but nothing here is an event.',
    st: (t) => ({ intensity: 0.32 + 0.26 * Math.sin(t / 47) + 0.12 * Math.sin(t / 113), pulse: null }),
  },

  'bed-two-chords': {
    level: 'raid-norse', sr: 44100, secs: 96, seed: 0x51c0a2,
    note: 'THE SAME BED, with a chord move forced at 22 s and another at 58 s so the movement is '
      + 'audible without waiting for the natural 26-58 s clock. Listen for the voices GLIDING - '
      + 'a chord that arrived would be a transient and would break the whole design.',
    st: () => ({ intensity: 0.5, pulse: null }),
    at: [[22, (s) => { s.nextChord = 0; }], [58, (s) => { s.nextChord = 0; }]],
  },

  'pulse-low': {
    level: 'raid-norse', sr: 44100, secs: 34, seed: 0x7711,
    note: 'THE PULSE at a LOW state value - wave 1 of six, so roughly one every 4 s. Bed held '
      + 'thin underneath so the pulse is what you are listening to.',
    st: () => ({ density: 0.3, brightness: 0.2, pulse: 0 }),
  },

  'pulse-high': {
    level: 'raid-norse', sr: 44100, secs: 34, seed: 0x7711,
    note: 'THE SAME PULSE at a HIGH state value - wave 6, roughly one every 1.5 s. The rate is '
      + 'a game variable, not a tempo: nothing else about the sound changed.',
    st: () => ({ density: 0.3, brightness: 0.2, pulse: 1 }),
  },

  'pulse-sweep': {
    level: 'raid-norse', sr: 44100, secs: 72, seed: 0x7711,
    note: 'THE PULSE walked through all six wave values, one every 12 s. This is the proof that '
      + 'the rate answers the state rather than running to a clock - the gap changes on the very '
      + 'next pulse, never at a bar line, because there is no bar line.',
    st: (t) => ({ density: 0.35, brightness: 0.3, pulse: Math.min(5, Math.floor(t / 12)) / 5 }),
  },

  'bed-and-pulse': {
    level: 'raid-norse', sr: 44100, secs: 120, seed: 0x2b19,
    note: 'BED AND PULSE TOGETHER over a rising siege: waves 1 to 6 and the pier taking damage.',
    st: (t) => ({ intensity: Math.min(1, 0.15 + t / 140), pulse: Math.min(5, Math.floor(t / 20)) / 5 }),
  },

  'smuggle-silence': {
    level: 'smuggle', sr: 44100, secs: 96, seed: 0x9d02,
    note: 'THE SMUGGLING RUN AND ITS SILENCE. Near-nothing to start with, then the player begins '
      + 'to creep at 24 s and the music goes away entirely; the grapnel fouls at 54 s and it '
      + 'comes back. Nothing restarted, so it returns at a place in its own cycles it has never '
      + 'been: there is no seam to hear because there is no seam.',
    st: (t) => ({ intensity: t > 54 ? 0.55 : 0.2, pulse: null }),
    at: [[24, (s) => s.silence(0.7)], [54, (s) => s.resume(1.8)]],
  },

  free: {
    level: 'free', sr: 44100, secs: 12, seed: 0x1111,
    note: 'FREE RIDE. Twelve seconds of nothing, and the file is here so the silence is a '
      + 'deliverable rather than an omission. The engine is the music in free ride.',
    st: () => ({ intensity: 0.8, pulse: 0.5 }),
  },

  rescue: {
    level: 'rescue', sr: 44100, secs: 96, seed: 0x3355,
    note: 'RESCUE - urgency without menace, and no pulse at any point because a ticking clock is '
      + 'menace and there is no antagonist in this level. A swimmer is picked up at 40 s: the '
      + 'settle gesture sends the next chord subdominant-ward, so the player hears that they '
      + 'have made things better. At 66 s the level starts going badly and the answer is to '
      + 'THIN OUT rather than to add threat.',
    st: (t) => ({ intensity: t < 40 ? 0.55 : (t < 66 ? 0.4 : 0.18), pulse: null }),
    at: [[40, (s) => { s.update({ settle: true }, 0); s.nextChord = 0; }]],
  },

  'raid-pirate': {
    level: 'raid-pirate', sr: 44100, secs: 96, seed: 0x6a41,
    note: 'THE PIRATE RAID. Everything sustained is under 250 Hz or above 3.3 kHz and there is '
      + 'nothing in between, because 270-3010 Hz is where the crew\'s three formants live and '
      + 'they are the only thing making the corsairs read as men. On a phone speaker you will '
      + 'hear only the shimmer, which is the point rather than a fault.',
    st: (t) => ({ intensity: Math.min(1, 0.2 + t / 110), pulse: Math.min(5, Math.floor(t / 16)) / 5 }),
  },

  arena: {
    level: 'arena', sr: 44100, secs: 96, seed: 0x4c8e,
    note: 'THE HARBOUR MOUTH. The pulse NEVER changes rate however hard the level gets - it is a '
      + 'clock you can steer to, and all the movement is in the harmony. The state input is '
      + 'swung from 0 to 1 and back to prove the pulse ignores it here by design.',
    st: (t) => ({ intensity: 0.3 + 0.4 * Math.sin(t / 19), pulse: (Math.sin(t / 11) + 1) / 2 }),
  },

  stunt: {
    level: 'stunt', sr: 44100, secs: 122, seed: 0x8f30,
    note: 'THE STUNT STAGE, a whole 120 s run. THE MUSIC IS THE TIMER: density and brightness '
      + 'step up at 90, 60, 30 and 10 seconds remaining. Four states, not a ramp, so a player '
      + 'can learn them and stop looking at the HUD.',
    st: (t) => ({ secondsLeft: Math.max(0, 120 - t), pulse: 0.5 }),
  },
};

export async function renderScene(name) {
  const S = SCENES[name];
  if (!S) throw new Error('no scene ' + name);
  const { ac, sc, clock } = offlineScore(S.sr, S.secs, { seed: S.seed });
  sc.start(S.level);
  const STEP = 1 / 60, N = Math.floor((S.secs - 0.2) / STEP);
  const fired = new Set();
  for (let i = 0; i < N; i++) {
    const t = i * STEP;
    clock.t = t;
    if (S.at) {
      for (let k = 0; k < S.at.length; k++) {
        if (!fired.has(k) && t >= S.at[k][0]) { fired.add(k); S.at[k][1](sc); }
      }
    }
    sc.update(S.st(t), STEP);
  }
  const buf = await ac.startRendering();
  return { name, sr: S.sr, pcm: buf.getChannelData(0), stats: sc.stats(), note: S.note, level: S.level };
}

export const SCENE_NAMES = Object.keys(SCENES);
