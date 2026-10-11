// Deterministic PRNG + state hash.
//
// Nothing inside a physics tick may call Math.random() or read the clock, or
// record/replay stops being a proof of anything.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// FNV-1a over quantised state. Two runs that agree here agree everywhere that
// matters; float noise below 0.1 mm is not drift worth failing a build over.
export class StateHash {
  constructor() { this.h = 0x811c9dc5; }
  reset() { this.h = 0x811c9dc5; }
  int(v) {
    let x = v | 0;
    for (let i = 0; i < 4; i++) {
      this.h ^= (x >>> (i * 8)) & 0xff;
      this.h = Math.imul(this.h, 0x01000193);
    }
  }
  num(v, scale = 10000) {
    this.int(Math.round(v * scale));
  }
  get hex() { return (this.h >>> 0).toString(16).padStart(8, '0'); }
}

export function hashString(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}
