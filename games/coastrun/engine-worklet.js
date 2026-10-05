/* 365 Coast Run - the engine, made sample by sample (an AudioWorklet): a high-revving ten-cylinder racing engine.
 * Each cylinder fires a sharp pulse of exhaust in turn (five a revolution); the pulses ring down two short exhaust
 * pipes (delay lines feeding back through a damping filter), a little uneven from cylinder to cylinder (the rasp),
 * with the valve train's hiss on each firing and the straight-cut gears' whine. Lifting off at high revs it pops.
 * Parameters (smoothed here): rpm, throttle 0-1, gain, nitro 0-1. */
class RaceEngine extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'rpm', defaultValue: 6000, minValue: 500, maxValue: 21000, automationRate: 'k-rate' },
      { name: 'throttle', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
      { name: 'gain', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
      { name: 'nitro', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'k-rate' }
    ];
  }
  constructor() {
    super();
    const sr = sampleRate;
    this.rpm = 6000; this.thr = 0; this.g = 0; this.nit = 0;
    this.ph = 0; this.bt = 1e9; this.blen = Math.round(sr * 0.00045); this.pa = 0;
    this.offs = [0, 0.2, 0.4, 0.6, 0.8].map((v, i) => v + [0.003, -0.005, 0.002, -0.003, 0.004][i]);   // the firing points, each a hair off true
    this.amps = [1, 0.84, 0.95, 0.78, 0.9];   // and each cylinder a little different (the rasp)
    this.N = 4096; this.d1 = new Float32Array(this.N); this.d2 = new Float32Array(this.N); this.i1 = 0; this.i2 = 0;
    this.L1 = Math.round(sr * 0.00072); this.L2 = Math.round(sr * 0.00196);   // the short pipe rings at ~1.4 kHz (the scream), the long one fills in below   // two short pipes
    this.lp1 = 0; this.lp2 = 0; this.tone = 0; this.dcx = 0; this.dcy = 0;
    this.seed = 12345; this.pop = 0; this.popAmp = 0; this.wph = 0;
    this.kSmooth = 1 - Math.exp(-1 / (0.011 * sr)); this.kSlow = 1 - Math.exp(-1 / (0.05 * sr));
  }
  rnd() { this.seed = (this.seed * 16807) % 2147483647; return this.seed / 1073741823.5 - 1; }
  process(inputs, outputs, P) {
    const out = outputs[0][0]; if (!out) return true;
    const sr = sampleRate, tr = P.rpm[0], tt = P.throttle[0], tg = P.gain[0], tn = P.nitro[0];
    const TAU = Math.PI * 2;
    for (let n = 0; n < out.length; n++) {
      this.rpm += (tr - this.rpm) * this.kSmooth; this.thr += (tt - this.thr) * this.kSmooth; this.g += (tg - this.g) * this.kSlow; this.nit += (tn - this.nit) * this.kSlow;
      const rev = this.rpm / 60, prev = this.ph;
      this.ph += rev / sr; let wrap = false; if (this.ph >= 1) { this.ph -= 1; wrap = true; }
      for (let c = 0; c < 5; c++) {   // a cylinder fires
        const o = this.offs[c];
        if ((!wrap && prev < o && this.ph >= o) || (wrap && (prev < o || this.ph >= o))) { this.bt = 0; this.pa = this.amps[c] * (0.32 + 0.68 * this.thr) * (1 + 0.1 * this.rnd()); }
      }
      let x = 0;
      if (this.bt < this.blen) {   // the pulse: a sharp thump of pressure (it gives the note its fundamental), a little roughness in it
        const k = this.bt / this.blen;
        x = this.pa * (1 - k) * Math.exp(-k * 2.5) * (1.6 + this.rnd() * 0.25);
        this.bt++;
      }
      x += this.rnd() * 0.012 * (0.3 + this.thr);   // the airflow
      // lifting off at high revs: the odd pop and crackle from the pipes
      if (this.pop > 0) { x += this.popAmp * this.rnd() * Math.exp(-this.pop / (sr * 0.006)); this.pop--; if (this.pop <= 0) this.pop = 0; }
      else if (this.thr < 0.25 && this.rpm > 9000 && this.rnd() > 0.99985) { this.pop = Math.round(sr * 0.03); this.popAmp = 0.9 + this.rnd() * 0.4; }
      // the pipes: each a delay line feeding back through a damping filter
      const r1 = this.d1[(this.i1 - this.L1 + this.N) % this.N]; this.lp1 += (r1 - this.lp1) * 0.5;
      const y1 = x + 0.5 * this.lp1; this.d1[this.i1] = y1; this.i1 = (this.i1 + 1) % this.N;
      const r2 = this.d2[(this.i2 - this.L2 + this.N) % this.N]; this.lp2 += (r2 - this.lp2) * 0.35;
      const y2 = x + 0.55 * this.lp2; this.d2[this.i2] = y2; this.i2 = (this.i2 + 1) % this.N;
      // the gears' whine
      this.wph += rev * 3.6 / sr; if (this.wph > 1) this.wph -= 1;
      let y = y1 * 0.6 + y2 * 0.45 + Math.sin(this.wph * TAU) * (0.03 + 0.02 * this.nit);
      // a hot, hard edge, more of it on the throttle
      y = Math.tanh(y * (1.4 + this.thr * 1.3 + this.nit * 0.7));
      // a gentle top-end roll-off (less fizz), then take out any offset
      this.tone += (y - this.tone) * (0.22 + 0.12 * this.thr + 0.08 * this.nit);
      const dy = this.tone - this.dcx + 0.995 * this.dcy; this.dcx = this.tone; this.dcy = dy;
      out[n] = dy * this.g;
    }
    for (let ch = 1; ch < outputs[0].length; ch++) outputs[0][ch].set(out);
    return true;
  }
}
registerProcessor('race-engine', RaceEngine);

/* The road engine, from a real recording: a V12 sports car's own firings (cut from "Supercar rev" by richwise on freesound.org,
 * sound 478756, CC0) - a run at idle, one mid-rev and one high in the rev range. At every firing the next real firing is
 * played from the set nearest the wanted note (two sets blended between their notes), trimmed shorter as the revs rise, so
 * the car's own exhaust tone holds at any revs; lifting off at high revs, a real pop from its exhaust now and then.
 * The grains arrive by port.postMessage({ data, sets: [{ f0, grains: [[offset, length]...], rms }], pops: [[offset, length]...] }).
 * Parameters as the race engine: rpm (real revs a minute, a V12: six firings a revolution), throttle 0-1, gain, nitro 0-1. */
class GrainEngine extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'rpm', defaultValue: 1000, minValue: 300, maxValue: 12000, automationRate: 'k-rate' },
      { name: 'throttle', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
      { name: 'gain', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
      { name: 'nitro', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'k-rate' }
    ];
  }
  constructor() {
    super();
    const sr = sampleRate, NV = 64;
    this.ready = false; this.rpm = 1000; this.thr = 0; this.g = 0; this.nit = 0; this.ph = 0; this.seed = 7; this.popWait = 0;
    this.vo = new Int32Array(NV); this.vl = new Int32Array(NV); this.vp = new Int32Array(NV); this.vg = new Float32Array(NV); this.vt = new Uint8Array(NV); this.n = 0; this.NV = NV;
    this.dcx = 0; this.dcy = 0; this.lp = 0;
    this.kSmooth = 1 - Math.exp(-1 / (0.012 * sr)); this.kSlow = 1 - Math.exp(-1 / (0.05 * sr));
    this.port.onmessage = (e) => { const d = e.data; this.G = d.data; this.sets = d.sets; this.pops = d.pops || []; this.lf = d.sets.map((s) => Math.log2(s.f0)); this.ix = d.sets.map(() => 0); this.gn = d.sets.map((s) => 0.05 / s.rms); this.ready = true; };
  }
  rnd() { this.seed = (this.seed * 16807) % 2147483647; return this.seed / 2147483647; }
  voice(o, L, g, trim) { if (this.n >= this.NV) return; const i = this.n++; this.vo[i] = o; this.vl[i] = L; this.vp[i] = 0; this.vg[i] = g; this.vt[i] = trim; }
  fire(F) {   // one firing: the next real firing from the nearest set (two, blended), trimmed to suit the revs
    const S = this.sets, lf = Math.log2(F), P = sampleRate / F; let k = 0;
    while (k < S.length - 2 && lf > this.lf[k + 1]) k++;
    const w = lf <= this.lf[k] ? 0 : lf >= this.lf[k + 1] ? 1 : (lf - this.lf[k]) / (this.lf[k + 1] - this.lf[k]);
    const amp = (0.35 + 0.65 * this.thr) * (1 + 0.16 * (this.rnd() - 0.5));
    for (let q = 0; q < 2; q++) {
      const s = k + q, gw = q ? w : 1 - w; if (gw < 0.02) continue;
      const gr = S[s].grains[this.ix[s]]; this.ix[s] = (this.ix[s] + 1) % S[s].grains.length;
      let o = gr[0], L = gr[1], trim = 0; const Lt = Math.floor(2.4 * P);
      if (Lt < L) { o += (L - Lt) >> 1; L = Lt; trim = 1; }
      this.voice(o, L, this.gn[s] * gw * amp, trim);
    }
  }
  process(inputs, outputs, P) {
    const out = outputs[0][0]; if (!out) return true;
    if (!this.ready) { out.fill(0); return true; }
    const sr = sampleRate, tr = P.rpm[0], tt = P.throttle[0], tg = P.gain[0], tn = P.nitro[0], G = this.G, TAU = Math.PI * 2;
    for (let n = 0; n < out.length; n++) {
      this.rpm += (tr - this.rpm) * this.kSmooth; this.thr += (tt - this.thr) * this.kSmooth; this.g += (tg - this.g) * this.kSlow; this.nit += (tn - this.nit) * this.kSlow;
      const F = this.rpm / 60 * 6; this.ph += F / sr;
      if (this.ph >= 1) { this.ph -= 1; this.fire(F); }
      if (this.popWait > 0) this.popWait--;
      else if (this.thr < 0.2 && this.rpm > 3400 && this.pops.length && this.rnd() < 3.5 / sr) {   // a crackle on the overrun
        const p = this.pops[(this.rnd() * this.pops.length) | 0]; this.voice(p[0], p[1], 0.4 + 0.4 * this.rnd(), 0); this.popWait = (0.05 * sr) | 0;
      }
      let y = 0;
      for (let i = 0; i < this.n; i++) {
        const k = this.vp[i]; let s = G[this.vo[i] + k];
        if (this.vt[i]) s *= 0.5 - 0.5 * Math.cos(TAU * (k + 0.5) / this.vl[i]);
        y += s * this.vg[i];
        if (++this.vp[i] >= this.vl[i]) { const j = --this.n; this.vo[i] = this.vo[j]; this.vl[i] = this.vl[j]; this.vp[i] = this.vp[j]; this.vg[i] = this.vg[j]; this.vt[i] = this.vt[j]; i--; }
      }
      // no offset, a harder edge on the throttle and the nitro, a gentle top-end roll-off
      const dy = y - this.dcx + 0.9965 * this.dcy; this.dcx = y; this.dcy = dy;
      let z = Math.tanh(dy * (2 + this.thr * 0.8 + this.nit * 0.8)) * 0.8;
      this.lp += (z - this.lp) * (0.55 + 0.25 * this.thr + 0.15 * this.nit); z = this.lp;
      out[n] = z * this.g;
    }
    for (let ch = 1; ch < outputs[0].length; ch++) outputs[0][ch].set(out);
    return true;
  }
}
registerProcessor('grain-engine', GrainEngine);
