// THE SEA UNDER EVERY CRAFT (28 Sep 2026). PIER SURF's recorded sea (surf-audio.js THE REAL SEA) for
// the other levels too - the owner, after trying it: "do the other levels as well". Same files
// (assets/sea/, loaded once per page), placed by where the craft is and what it is doing:
//   BED     surf on a sandy beach - loud near the shore, a distant wash far out
//   CALM    a calm sea lapping and gulls far off - open water, everywhere
//   RUSH    whitewater close by: the water past the hull or the board, with speed, while it is IN
//           the water (none in the air; an eFoil in flight hears only a thin hiss off the mast)
//   SPLASH  real splashes on a slam, a landing, a wipe-out, a touchdown; a spray on a take-off
// It is a bed UNDER the engines: the boats' own engine, hull rush, slams and wind are unchanged,
// and the recorded splash is laid over the generated slam, not in place of it. On the eFoil (no
// engine; the game was silent there) it is the whole sound.
//
// ⚠️ NOTHING IS BUILT UNTIL THE RECORDINGS ARE IN. The nodes are made by updateSeaBed() the first
// frame the bed file has decoded - so a board with no recordings (plain Node's suites, ?realsea=0,
// a failed fetch) has exactly the graph it had before, and the engine's measured graphs and
// make-up gains are untouched. No Math.random: the craft's own small generator.
import { loadSea, seaBuf, seaStatus, seaWanted, SEA_FILES } from './surf-audio.js';
import { shoreCoords } from '../sea-surf.js';

const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const fin = (x, d = 0) => (Number.isFinite(x) ? x : d);

// Gains on the craft's own master. Set from an offline render against the engines (tmp-audit/realsea/
// render-seabed.mjs), not by ear: under a boat's engine at cruise the bed sits well under it; on the
// eFoil the sea is the sound, at PIER SURF's out-the-back level.
// (First pass measured the boats' sea 8.5-9.5 dB under the engine by the shore and 12.5-13.4 in open
// water - the recorded rush doubling the engine's own hull rush - and the eFoil foiling far out at -40.8.)
export const SEABED_LV = {
  boat: { bedNear: 0.22, bedFar: 0.07, calm: 0.12, rush: 0.15, splash: 0.9 },
  efoil: { bedNear: 0.36, bedFar: 0.12, calm: 0.30, rush: 0.5, hiss: 0.14, splash: 0.8 },
};
const FADE = 2.0;          // s the sea takes to come in once its files are there
const NEAR = 60, FAR = 450; // m seaward of high water: full surf inside NEAR, the far wash beyond FAR

export function makeSeaBed(ac, master, kind) {
  const real = seaWanted();
  if (real) loadSea(ac);
  return { sea: true, kind, real, master, built: false, on: {}, sm: 0, shots: 0, s: 0x2f6e1b3,
    lv: { bed: 0, calm: 0, rush: 0, d: 0 }, sources: [] };
}

function rnd(b) {
  let t = (b.s += 0x6D2B79F5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function build(ac, b) {
  const mk = (to) => { const g = ac.createGain(); g.gain.value = 0; g.connect(to); return g; };
  b.under = ac.createBiquadFilter(); b.under.type = 'lowpass'; b.under.frequency.value = 16000; b.under.Q.value = 0.5;
  b.under.connect(b.master);
  b.bedG = mk(b.under); b.calmG = mk(b.under); b.rushG = mk(b.under);
  b.rushHP = ac.createBiquadFilter(); b.rushHP.type = 'highpass'; b.rushHP.frequency.value = 300; b.rushHP.Q.value = 0.5;
  b.rushHP.connect(b.rushG);
  b.built = true;
}
function loop(ac, b, key, into) {
  const buf = seaBuf(key), f = SEA_FILES[key];
  if (!buf || b.on[key]) return;
  const s = ac.createBufferSource(); s.buffer = buf; s.loop = true;
  s.loopStart = f.loopStart; s.loopEnd = Math.min(f.loopEnd, buf.duration);
  s.start(ac.currentTime + 0.01, f.loopStart + rnd(b) * (s.loopEnd - f.loopStart));
  s.connect(into); b.sources.push(s); b.on[key] = true;
}

// Per frame. st: { x, z, speed (m/s), water (0..1: how much of the craft is in the water),
// air (bool), under (bool: the camera is under the water), live (0 when paused) }.
export function updateSeaBed(ac, b, st, dt) {
  if (!b || !b.real || !ac) return;
  if (!b.built) { if (!seaBuf('bed')) return; build(ac, b); }
  loop(ac, b, 'bed', b.bedG); loop(ac, b, 'gulls', b.calmG); loop(ac, b, 'close', b.rushHP);
  const ready = !!(b.on.bed && b.on.gulls && b.on.close);
  b.sm = clamp(b.sm + (ready ? 1 : -1) * clamp(fin(dt, 1 / 60), 0, 0.25) / FADE, 0, 1);
  const L = SEABED_LV[b.kind === 'efoil' ? 'efoil' : 'boat'], live = fin(st.live, 1), sm = b.sm * live;
  const sc = shoreCoords(fin(st.x), fin(st.z), b._sc || (b._sc = {}));
  const d = fin(sc.d, 1000);
  const near = clamp((FAR - d) / (FAR - NEAR), 0, 1);
  const speed = Math.max(0, fin(st.speed)), water = clamp(fin(st.water, 1), 0, 1);
  const lv = b.lv;
  lv.d = Math.round(d);
  lv.bed = sm * (L.bedFar + (L.bedNear - L.bedFar) * near * near);
  lv.calm = sm * L.calm * (1 - 0.5 * near);
  const rush = st.air ? 0 : water * clamp(speed / 12, 0, 1) * L.rush
    + (b.kind === 'efoil' && !st.air ? (1 - water) * clamp(speed / 10, 0, 1) * L.hiss : 0);
  lv.rush = sm * rush;
  const t = ac.currentTime, set = (p, v, tc) => p.setTargetAtTime(fin(v), t, tc);
  set(b.bedG.gain, lv.bed, 0.6);
  set(b.calmG.gain, lv.calm, 0.8);
  set(b.rushG.gain, lv.rush, 0.15);
  set(b.rushHP.frequency, b.kind === 'efoil' && water < 0.5 ? 1800 : 300 + 40 * speed, 0.2);
  set(b.under.frequency, st.under ? 420 : 16000, st.under ? 0.05 : 0.2);
}

// One recorded splash (the sprite). kind: 'splash' | 'big' | 'spray' | 'pop'; k 0..1 how hard.
// False (and nothing plays) until the sea has come in - the generated hit the caller already
// played is then the whole sound, as before.
export function seaBedSplash(ac, b, kind, k = 1, pan = 0) {
  if (!b || !b.built || !(b.sm > 0.5) || !seaBuf('shots')) return false;
  const L = SEABED_LV[b.kind === 'efoil' ? 'efoil' : 'boat'];
  const ix = SEA_FILES.shots.index;
  const name = kind === 'big' ? 'bigsplash' : kind === 'spray' ? 'spray' : kind === 'pop' ? 'pop'
    : 'splash' + Math.min(6, Math.floor(rnd(b) * 7));
  const e = ix[name];
  if (!e) return false;
  const t0 = ac.currentTime + 0.005, lead = 0.04;
  const src = ac.createBufferSource(); src.buffer = seaBuf('shots');
  const g = ac.createGain(); g.gain.value = L.splash * clamp(fin(k, 1), 0.1, 1.5);
  let last = g;
  if (pan && ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = pan; g.connect(p); last = p; }
  src.connect(g); last.connect(b.under);
  src.start(t0, Math.max(0, e[0] - lead), e[1] + lead);
  b.shots++;
  return true;
}

export function seaBedDebug(b) {
  if (!b) return null;
  const s = seaStatus();
  return { sea: s.state, seaErr: s.err, seaReal: !!b.real, seaBuilt: !!b.built, seaMix: +fin(b.sm).toFixed(3),
    seaLoops: Object.keys(b.on).sort().join(','), shoreD: b.lv.d, sBed: +fin(b.lv.bed).toFixed(3),
    sCalm: +fin(b.lv.calm).toFixed(3), sRush: +fin(b.lv.rush).toFixed(3), seaShots: b.shots | 0 };
}
