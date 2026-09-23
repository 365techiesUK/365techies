// VIKING RAID - OFFLINE AUDIO BOUNCE (tr64). DEV TOOL ONLY - nothing in the game imports this.
//
// Nobody had ever HEARD the pier siege: every sound in src/raid/raid-audio.js is built from
// oscillators and filters at the moment it plays, so there is no file anywhere to listen to.
// This renders each cue through an OfflineAudioContext and encodes it as a 16-bit PCM WAV, so
// the owner can play them without playing the game.
//
// IT MUST NEVER RUN IN NORMAL PLAY, and it cannot: no module in src/ imports it, it registers
// no listeners and it does nothing on import. tmp-tr64/drive_audio.json loads it by hand in a
// headless Chrome (`await import('/src/raid/raid-audio-preview.js')`) and writes the files.
//
// HOW IT DRIVES RaidAudio WITHOUT TOUCHING IT. RaidAudio.play() needs three things: this.ac,
// this.out, this.noise, and `ready` true. An OfflineAudioContext reports state 'suspended'
// until it is rendering and its currentTime is stuck at 0, so the instance is built WITHOUT
// the constructor (no gesture listeners), `ready` is shadowed true, and this.ac is a Proxy
// whose currentTime is the scheduling clock this file moves - which is also what lets the
// montage lay cues out over 30 seconds. raid-audio.js itself is untouched, so what is bounced
// is exactly what the game plays, through the same compressor and the same 0.55 master gain.

// tr140: the rig now takes a FACTION, and everything below is bounced as the PIRATE side,
// because that is the side with new voices. `horn`, `bosshorn`, `moor`, `bigsplash`, `collapse`
// and `lost` therefore come out with their crew layer on, which is what the mode plays. The
// Norse versions of those six are unchanged and were bounced in tmp-tr64/audio.

import { RaidAudio } from './raid-audio.js';

// name -> [seconds to render, volume] . The lengths are the cue's own decay plus a little air.
export const CUES = {
  horn: [3.2, 1], bosshorn: [4.0, 1], barrage: [1.4, 1],
  cannon: [1.4, 1], rocket: [1.0, 1], flare: [1.0, 1], torpedo: [1.2, 1],
  boom: [1.8, 1], crack: [0.9, 1], smash: [1.4, 1], lob: [0.8, 1], throw: [0.8, 1],
  splash: [1.4, 1], bigsplash: [2.4, 1], thud: [1.2, 1], moor: [1.4, 1],
  collapse: [4.5, 1], knock: [1.8, 1],
  crackle: [2.2, 1], roar: [3.0, 1], whoomph: [2.0, 1],
  hiss: [2.0, 1], steam: [2.2, 1],
  cheer: [3.0, 1], combo: [1.6, 4], pickup: [1.0, 1], expire: [0.9, 1],
  hurt: [1.2, 1], shield: [0.9, 1], tell: [1.4, 1], lunge: [2.0, 1],
  bosssunk: [4.0, 1], landed: [2.0, 1], lost: [3.2, 1], wave: [1.2, 1],
  // tr140 the corsairs' crew, wordless
  chant: [3.4, 1], jeer: [2.4, 1], warcry: [3.1, 1], crewcry: [2.5, 1], heave: [2.4, 1],
  // tr140 the ship herself
  runout: [1.5, 1], creak: [1.7, 1], block: [1.4, 1], groan: [2.9, 1], canvas: [1.6, 1],
  drum: [1.0, 1], hullsea: [2.1, 1], bell: [4.2, 1],
};

// The six ordinary cues whose PIRATE version now carries a crew layer, at the length the layer
// needs rather than the length the base cue needs.
export const PIRATE_LEN = { horn: 4.8, bosshorn: 4.6, moor: 3.2, bigsplash: 2.8, collapse: 4.8, lost: 3.4 };

// The 30 s battle montage: [second, cue, volume, repeats, gap]. A wave coming in, the flagship's
// barrage, fire on the deck, the hose, a section going, and the crowd on the beach at the end.
//
// The AMBIENCES repeat rather than being turned up. One `crackle`, `roar`, `hiss` or `steam` is
// almost inaudible on its own (true peak 0.02-0.04 of full scale) because the game plays them
// over and over while something is burning or the hose is on. Laying them out at that rate is
// what the mode actually sounds like; raising their gain would not be.
export const MONTAGE = [
  [0.2, 'horn', 1], [1.6, 'horn', 0.7], [2.6, 'moor', 0.9],
  [3.2, 'cannon', 1], [3.9, 'boom', 0.9], [4.6, 'cannon', 0.9], [5.3, 'crack', 0.8],
  [5.0, 'lob', 0.8], [5.8, 'smash', 1], [6.4, 'whoomph', 1],
  [6.6, 'crackle', 1, 26, 0.55], [7.2, 'roar', 1, 9, 1.6],
  [7.4, 'bosshorn', 1], [8.8, 'barrage', 1], [9.4, 'lob', 0.9], [10.0, 'smash', 1],
  [11.0, 'lob', 0.8], [11.6, 'smash', 0.9], [12.2, 'throw', 0.8],
  [12.4, 'hiss', 1, 20, 0.22], [13.0, 'steam', 1, 8, 0.6],
  [15.4, 'knock', 1], [16.2, 'splash', 0.8], [16.8, 'hiss', 1, 10, 0.22],
  [17.4, 'rocket', 1], [17.9, 'boom', 1], [18.4, 'rocket', 0.9], [18.9, 'boom', 0.9],
  [19.4, 'bigsplash', 1], [19.8, 'cheer', 0.8], [20.4, 'combo', 3],
  [21.4, 'crack', 1], [21.8, 'collapse', 1], [24.0, 'bigsplash', 0.9], [24.6, 'crack', 0.7],
  [25.4, 'lunge', 1], [26.6, 'splash', 0.9], [27.0, 'cannon', 1], [27.6, 'boom', 1],
  [28.2, 'cheer', 1.2], [29.0, 'wave', 1],
];

// THE 30 SECOND BOARDING MONTAGE (tr140). The sequence the brief asked to be able to judge as
// a whole: a ship coming up out of the dark, her guns run out, the broadside, the crew's chant,
// a section of the pier going into the sea, and a hull going down with her people on her.
//
// It is played through the PIRATE rig, so `horn` is the bell and the chant behind it, `moor`
// carries the heave, `collapse` carries the roar and `bigsplash` carries the cry - exactly the
// layering the mode gets, with nothing sequenced here that the game does not do itself.
//
// Like MONTAGE, the beds REPEAT rather than being turned up: one `hullsea` or `creak` is almost
// inaudible alone (true peak 0.01-0.03 of full scale) because the ambience pump plays them over
// and over while a hull is alongside. Laying them out at that rate is what the mode sounds like.
export const BOARDING = [
  // 0-6  she comes up out of the dark: sea on a wooden hull, rigging, canvas
  [0.0, 'hullsea', 1, 7, 2.1], [0.4, 'creak', 0.9, 5, 2.6], [1.1, 'block', 0.8],
  [2.2, 'canvas', 0.9], [3.6, 'groan', 0.9], [4.9, 'creak', 0.8],
  // 6-9  the bell, and the chant the boarding party take up behind it
  [6.0, 'horn', 1],
  [8.4, 'jeer', 0.9],
  // 9-14 THE RUN-OUT, then the rolling broadside. The trucks are heard BEFORE the guns.
  [9.6, 'runout', 1], [10.6, 'cannon', 1], [10.75, 'cannon', 0.95], [10.92, 'cannon', 1],
  [11.06, 'cannon', 0.9], [11.24, 'cannon', 1], [11.39, 'cannon', 0.95],
  [11.7, 'boom', 0.9], [12.0, 'boom', 1], [12.35, 'crack', 0.9], [12.6, 'boom', 0.8],
  [13.0, 'smash', 0.9], [13.3, 'whoomph', 0.9], [13.5, 'crackle', 1, 22, 0.62],
  // 14-18 she ties up alongside and they come over the rail
  [14.4, 'moor', 1],
  [16.2, 'chant', 1], [16.4, 'block', 0.8], [17.9, 'creak', 0.9],
  // 18-23 a second broadside at point-blank, and a section of the pier goes
  [18.2, 'runout', 1], [19.2, 'cannon', 1], [19.34, 'cannon', 0.95], [19.5, 'cannon', 1],
  [19.63, 'cannon', 0.9], [19.79, 'cannon', 1],
  [20.3, 'boom', 1], [20.7, 'boom', 0.9], [21.0, 'crack', 1],
  [21.4, 'collapse', 1], [23.4, 'bigsplash', 0.9],
  // 23-30 the player answers: a hull goes down with her crew, and the beach cheers
  [24.4, 'rocket', 1], [24.9, 'boom', 1], [25.4, 'rocket', 0.9], [25.9, 'boom', 0.95],
  [26.5, 'bigsplash', 1], [27.0, 'cheer', 1.1], [27.6, 'combo', 3],
  [28.6, 'hullsea', 0.8], [29.0, 'bell', 0.7],
];

const SR = 44100;

function offline(seconds, sr = SR) {
  const OC = typeof OfflineAudioContext !== 'undefined' ? OfflineAudioContext : webkitOfflineAudioContext;
  return new OC(1, Math.max(1, Math.ceil(seconds * sr)), sr);
}

// A RaidAudio wired to an offline context, plus a handle that moves its clock.
function rig(ac, foe = 'pirate') {
  const a = Object.create(RaidAudio.prototype);
  a.enabled = true;
  a.foe = foe;                 // tr140: without this `this.foe` is undefined and every pirate
  a.last = new Map();          // layer is silently skipped - the bounce would not be the game
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -14; comp.ratio.value = 6;
  const g = ac.createGain(); g.gain.value = 0.55;
  g.connect(comp).connect(ac.destination);
  // the same one-second noise buffer, from the same seed, as RaidAudio._wake()
  const buf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate), d = buf.getChannelData(0);
  let s = 22222;
  for (let i = 0; i < d.length; i++) { s = (s * 16807) % 2147483647; d[i] = (s / 2147483647) * 2 - 1; }
  a.out = g; a.noise = buf;
  const clock = { t: 0 };
  a.ac = new Proxy(ac, {
    get(t, p) {
      if (p === 'currentTime') return clock.t;
      if (p === 'state') return 'running';
      const v = t[p];
      return typeof v === 'function' ? v.bind(t) : v;
    },
  });
  Object.defineProperty(a, 'ready', { value: true, configurable: true });
  return { a, clock };
}

// `norm` lifts a cue's peak to -1 dBFS so it can be listened to on its own. Several cues are
// deliberately quiet IN THE MIX (a fire pot leaving a hand peaks at 0.005 of full scale), and a
// file at that level sounds like silence. The montage is NOT normalised: it is the real mix.
function wav(buffer, norm = 0) {
  const n = buffer.length, ch = buffer.getChannelData(0);
  const out = new DataView(new ArrayBuffer(44 + n * 2));
  const str = (o, t) => { for (let i = 0; i < t.length; i++) out.setUint8(o + i, t.charCodeAt(i)); };
  str(0, 'RIFF'); out.setUint32(4, 36 + n * 2, true); str(8, 'WAVEfmt ');
  out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 1, true);
  out.setUint32(24, buffer.sampleRate, true); out.setUint32(28, buffer.sampleRate * 2, true);
  out.setUint16(32, 2, true); out.setUint16(34, 16, true);
  str(36, 'data'); out.setUint32(40, n * 2, true);
  let peak = 0;
  for (let i = 0; i < n; i++) { const v = Math.abs(ch[i]); if (v > peak) peak = v; }
  const g = norm && peak > 1e-6 ? Math.min(400, norm / peak) : 1;
  let sq = 0;
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, ch[i] * g));
    sq += v * v;
    out.setInt16(44 + i * 2, v < 0 ? v * 0x8000 : v * 0x7FFF, true);
  }
  return { bytes: new Uint8Array(out.buffer), peak, gain: +g.toFixed(2), rms: +Math.sqrt(sq / n).toFixed(4) };
}

const b64 = (bytes) => {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
};

export async function bounceCue(name, foe = 'pirate') {
  const [sec0, v] = CUES[name] || [2, 1];
  const sec = foe === 'pirate' && PIRATE_LEN[name] ? PIRATE_LEN[name] : sec0;
  const ac = offline(sec);
  const { a } = rig(ac, foe);
  a.play(name, v);
  const buf = await ac.startRendering();
  return { name, seconds: sec, ...wav(buf, 0.89) };
}

// The 30 s boarding sequence, NOT normalised: it is the real mix at the real levels.
export async function bounceBoarding(seconds = 31) {
  const ac = offline(seconds);
  const { a, clock } = rig(ac, 'pirate');
  for (const [t, name, v, rep = 1, gap = 0] of BOARDING) {
    for (let k = 0; k < rep; k++) {
      clock.t = t + k * gap;
      a.last.clear();
      a.play(name, v);
    }
  }
  const buf = await ac.startRendering();
  return { name: 'boarding-montage', seconds, ...wav(buf) };
}

export async function bounceMontage(seconds = 31) {
  const ac = offline(seconds);
  const { a, clock } = rig(ac, 'norse');
  for (const [t, name, v, rep = 1, gap = 0] of MONTAGE) {
    for (let k = 0; k < rep; k++) {
      clock.t = t + k * gap;
      a.last.clear();            // the in-game throttle is per real time; here every entry is deliberate
      a.play(name, v);
    }
  }
  const buf = await ac.startRendering();
  return { name: 'battle-montage', seconds, ...wav(buf) };
}

// The boats' engine (src/boats/engine-audio.js) is a continuous synth driven by the hull, not a
// cue: it is bounced by stepping update() over a fake hull that opens the throttle, planes, and
// comes back to idle. Same reason the RaidAudio rig exists - the class is not touched.
export async function bounceEngine(kind, spec, seconds = 12) {
  const { EngineAudio } = await import('../boats/engine-audio.js');
  const ac = offline(seconds);
  const e = Object.create(EngineAudio.prototype);
  e.enabled = true; e.kind = kind; e.v = null; e.gesture = true;
  e.lastTicks = -1; e.stallT = 0; e.lastSlams = 0; e.slamsPlayed = 0; e.frames = 0;
  const clock = { t: 0 };
  e.ac = new Proxy(ac, {
    get(t, p) {
      if (p === 'currentTime') return clock.t;
      if (p === 'state') return 'running';
      const v = t[p];
      return typeof v === 'function' ? v.bind(t) : v;
    },
  });
  e._build();
  if (!e.v) return null;
  const STEP = 1 / 60, N = Math.round((seconds - 0.4) / STEP);
  const h = { ticks: 0, rpm: 0, u: 0, v: 0, r: 0, vent: 0, wet: 1, air: 0, slams: 0, trim: 0, load: 1, gear: 1, spool: 0 };
  for (let i = 0; i < N; i++) {
    const f = i / N;
    // idle, hole shot, on the plane, back to idle
    const thr = f < 0.12 ? 0 : f < 0.5 ? (f - 0.12) / 0.38 : f < 0.8 ? 1 : Math.max(0, 1 - (f - 0.8) / 0.2);
    h.ticks++; h.rpm = thr * 0.95 + 0.05; h.spool = thr; h.load = 1 - 0.3 * thr;
    h.u = thr * (kind === 'jetski' ? 17 : 20); h.wet = 1 - 0.25 * thr;
    h.vent = f > 0.42 && f < 0.48 ? 0.6 : 0;          // one burst of prop ventilation
    if (Math.abs(f - 0.62) < 0.004) h.slams++;        // and one hull slam
    clock.t = i * STEP;
    e.update(h, spec, STEP);
  }
  const buf = await ac.startRendering();
  return { name: 'engine-' + kind, seconds, ...wav(buf) };
}

// What the driver calls. Returns base64 in chunks so one CDP message never carries megabytes.
export async function install() {
  const files = [];
  for (const name of Object.keys(CUES)) files.push(await bounceCue(name));
  files.push(await bounceMontage());
  files.push(await bounceBoarding());
  try {
    const { SPEEDBOAT } = await import('../boats/speedboat.js');
    const { JETSKI } = await import('../boats/jetski.js');
    for (const [k, s] of [['speedboat', SPEEDBOAT], ['jetski', JETSKI]]) {
      const r = await bounceEngine(k, s);
      if (r) files.push(r);
    }
  } catch (e) { files.push({ name: 'engine-FAILED', seconds: 0, bytes: new Uint8Array(0), peak: 0, err: e.message }); }
  const map = new Map();
  for (const f of files) map.set(f.name, b64(f.bytes));
  globalThis.__raidBounce = {
    list: () => files.map((f) => ({ name: f.name, seconds: f.seconds, bytes: f.bytes.length, peak: +f.peak.toFixed(4), gain: f.gain || 1, rms: f.rms || 0, err: f.err || null })),
    chunks: (name) => Math.ceil((map.get(name) || '').length / 700000),
    chunk: (name, i) => (map.get(name) || '').slice(i * 700000, (i + 1) * 700000),
  };
  return globalThis.__raidBounce.list();
}
