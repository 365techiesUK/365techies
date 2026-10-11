// ENGINE AUDIO - PASSING CRAFT (tmp-tr166). The hulls that go by, and the Doppler on them.
//
// WHERE THE TRAFFIC COMES FROM - nothing new is plumbed for this. The raid already hands the
// boats every solid hull in the water as an oriented capsule, because the player's hull has to
// collide with them: raid/collide.js `shipCap` -> RaidDriver.publish -> CraftHub.raidHook ->
// PlaneHull.setDynamic. So `hull.dyn` ALREADY carries { id, x, z, heading, vx, vz, r, half }
// for every hull under way, one physics tick old at worst, and that is exactly a Doppler
// source list. Corsair brigs, the flagship and the ALLIED ships are all in it on equal terms,
// because an ally is solid too (raid.js `solid`). `EngineAudio.setTraffic` can also supply a
// list directly, which is how the suites drive this without a raid.
//
// ⚠️ A capsule carries no craft KIND. So every passer gets the same voice - a bow wave and a
// hull rumble - rather than a guessed engine note that would be wrong for most of them. The
// one source the sim could add, a second powered PWC, does not exist: the only PWC in the
// world is the player's. If one is ever published as a capsule it will be voiced like the rest
// and shifted correctly, but this file does not pretend to know what it is.
//
// ⚠️ A hull that is not moving is skipped. A moored ship's creak, bell and sea are already the
// raid's own ambience bed (raid-audio.js `ambience`) and doubling them here would only muddy
// what is already there.
//
// ⚠️ THE SPEED OF SOUND IS DELIBERATELY WRONG, and it is written down rather than buried in a
// magic multiplier. In air c = 343 m/s, so a hull closing at 8 m/s and then opening at 8 m/s
// swings the pitch about 4.7% end to end - under a semitone, which over a two-second pass
// reads as a fade, not as a pass. DOP_C below makes the same pass worth about a minor third.
// It is a game exaggeration, not physics, and the physics is one line above it.

import { clamp, fin } from './engine-audio-layers.js';

const DOP_C = 96;            // the reference "speed of sound" for the shift (real air: 343)
const RANGE = 120;           // m; past this a hull is inaudible under the player's own engine
const MOVING = 1.0;          // m/s; below this she is moored or drifting, and belongs to ambience

export class Passers {
  // `n` voices, allocated to the nearest movers and HELD BY ID, so a hull keeps her own voice
  // for the whole pass instead of being handed a different one every frame - which is what
  // would happen with a plain nearest-first refill, and it would sound like a stuck record.
  constructor(ac, master, noise, n = 3) {
    this.ac = ac;
    this.slots = [];
    this.sources = [];
    this.n = 0;
    for (let i = 0; i < n; i++) {
      const g = ac.createGain(); g.gain.value = 0;
      // A pass is a left-to-right event where the hardware can do it. StereoPannerNode is not
      // universal and is not in the project's recording mock, so it is optional and the graph
      // is complete and correct without it.
      let pan = null;
      if (typeof ac.createStereoPanner === 'function') {
        pan = ac.createStereoPanner();
        g.connect(pan).connect(master);
      } else {
        g.connect(master);
      }
      const src = ac.createBufferSource(); src.buffer = noise; src.loop = true;
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 520; bp.Q.value = 0.6;
      const bg = ac.createGain(); bg.gain.value = 0.85;
      src.connect(bp).connect(bg).connect(g);
      const osc = ac.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 58;
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 240; lp.Q.value = 0.9;
      const og = ac.createGain(); og.gain.value = 0.5;
      osc.connect(lp).connect(og).connect(g);
      src.start(ac.currentTime, Math.random() * 1.5);
      osc.start(ac.currentTime);
      this.sources.push(src, osc);
      this.slots.push({ id: null, g, bp, osc, lp, pan });
    }
  }

  // Per drawn frame. `p` is the listener: { x, z, vx, vz, rx, rz } in world axes, where
  // (rx, rz) is the CAMERA'S right, which for the chase and FPV cameras is (-sin h, cos h)
  // (gl/core.js viewFromYawPitch: right = cross(forward, up) = (-fz, 0, fx)).
  // Returns how many voices are sounding.
  update(t, list, p, live) {
    const set = (q, v, tc) => q.setTargetAtTime(fin(v), t, tc);
    const want = [];
    if (list && live) {
      for (const d of list) {
        if (!d) continue;
        const dx = fin(d.x) - p.x, dz = fin(d.z) - p.z;
        const dist = Math.hypot(dx, dz);
        if (!(dist < RANGE)) continue;
        const vx = fin(d.vx), vz = fin(d.vz);
        const spd = Math.hypot(vx, vz);
        if (spd < MOVING) continue;
        // Rate of change of the gap: positive is opening, and an opening gap lowers the pitch.
        // d|r|/dt rather than a two-sided source/listener formula - one number for the shift,
        // and symmetric enough at hull speeds.
        const gap = dist > 0.5 ? ((p.x - fin(d.x)) * (p.vx - vx) + (p.z - fin(d.z)) * (p.vz - vz)) / dist : 0;
        want.push({ id: d.id === undefined ? -1 - want.length : d.id, dist, gap, spd, dx, dz });
      }
      want.sort((a, b) => a.dist - b.dist);
      want.length = Math.min(want.length, this.slots.length);
    }
    const taken = new Set();
    for (const s of this.slots) {                       // a hull keeps the voice she has
      if (s.id !== null && !taken.has(s.id) && want.some((w) => w.id === s.id)) taken.add(s.id);
      else s.id = null;
    }
    for (const w of want) {                             // then the gaps are filled
      if (taken.has(w.id)) continue;
      const free = this.slots.find((s) => s.id === null);
      if (!free) break;
      free.id = w.id; taken.add(w.id);
    }
    let n = 0;
    for (const s of this.slots) {
      const w = s.id === null ? null : want.find((q) => q.id === s.id);
      if (!w) { set(s.g.gain, 0, 0.12); continue; }
      n++;
      const dop = clamp(DOP_C / (DOP_C + w.gap), 0.75, 1.35);
      const k = ((((w.id | 0) % 5) + 5) % 5) * 0.2;     // per-hull spread, so two are not one twice
      set(s.bp.frequency, (430 + k * 420) * dop, 0.05);
      set(s.osc.frequency, (54 + k * 40) * dop, 0.05);
      set(s.lp.frequency, 230 * dop, 0.06);
      const att = clamp(1 - w.dist / RANGE, 0, 1);
      const sp = clamp(w.spd / 6, 0, 1);
      set(s.g.gain, 0.34 * att * att * (0.35 + 0.65 * sp), 0.07);
      if (s.pan) set(s.pan.pan, clamp((w.dx * fin(p.rx) + w.dz * fin(p.rz)) / Math.max(1, w.dist), -1, 1), 0.08);
    }
    this.n = n;
    return n;
  }
}
