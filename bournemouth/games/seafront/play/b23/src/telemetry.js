// Scrolling strip charts.
//
// The kill gate is a judgement call, but it should not be a vibe. Porpoising is
// visible here as a growing oscillation in wing depth against a lagging pitch
// trace, which is the difference between "it feels twitchy" and "here is the
// 1.1 Hz limit cycle, and here is the damping value that kills it".

import { BAND, DEG } from './params.js';

const SPAN = 720;   // 6 s at 120 Hz

class Ring {
  constructor(n) { this.buf = new Float32Array(n); this.n = n; this.i = 0; this.count = 0; }
  push(v) { this.buf[this.i] = v; this.i = (this.i + 1) % this.n; if (this.count < this.n) this.count++; }
  at(k) { return this.buf[(this.i - this.count + k + this.n * 2) % this.n]; }
  clear() { this.i = 0; this.count = 0; this.buf.fill(0); }
}

export class Telemetry {
  constructor(canvas) {
    this.c = canvas;
    this.ctx = canvas.getContext('2d');
    this.lanes = [
      { key: 'depth',  label: 'WING DEPTH',  unit: 'm',    min: -0.1, max: 1.0,  colour: '#6fe3a0', band: true },
      { key: 'alpha',  label: 'ALPHA',       unit: '°',    min: -16,  max: 16,   colour: '#f2c14e', stall: true },
      { key: 'lw',     label: 'LIFT / WEIGHT', unit: '',   min: 0,    max: 2.2,  colour: '#7fb6ff', unity: true },
      { key: 'speed',  label: 'SPEED',       unit: 'km/h', min: 0,    max: 55,   colour: '#cfd6e4' },
      { key: 'power',  label: 'POWER',       unit: 'kW',   min: 0,    max: 5.5,  colour: '#e08d7a' },
    ];
    this.rings = {};
    for (const l of this.lanes) this.rings[l.key] = new Ring(SPAN);
    this.marks = new Ring(SPAN);   // 1 = wipeout tick, 2 = ventilated
    this.dpr = 1;
  }

  clear() {
    for (const k in this.rings) this.rings[k].clear();
    this.marks.clear();
  }

  push(s, weight) {
    this.rings.depth.push(s.wingDepth);
    this.rings.alpha.push(s.alpha / DEG);
    this.rings.lw.push(s.lift / weight);
    this.rings.speed.push(s.speed * 3.6);
    this.rings.power.push(s.powerW / 1000);
    this.marks.push(s.mode === 'DOWN' ? 1 : (s.ventilated ? 2 : 0));
  }

  resize(w, h, dpr) {
    this.dpr = dpr;
    this.c.width = Math.max(1, Math.round(w * dpr));
    this.c.height = Math.max(1, Math.round(h * dpr));
  }

  draw() {
    const ctx = this.ctx, dpr = this.dpr;
    const W = this.c.width / dpr, H = this.c.height / dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const laneH = H / this.lanes.length;
    const padL = 92;
    const plotW = W - padL - 8;

    for (let li = 0; li < this.lanes.length; li++) {
      const l = this.lanes[li];
      const top = li * laneH;
      const h = laneH - 3;
      const ring = this.rings[l.key];
      const yFor = (v) => top + h - ((v - l.min) / (l.max - l.min)) * h;

      ctx.fillStyle = 'rgba(255,255,255,0.025)';
      ctx.fillRect(padL, top, plotW, h);

      if (l.band) {
        ctx.fillStyle = 'rgba(111,227,160,0.16)';
        const y1 = yFor(BAND.hi), y2 = yFor(BAND.lo);
        ctx.fillRect(padL, y1, plotW, y2 - y1);
        ctx.fillStyle = 'rgba(255,90,90,0.16)';
        ctx.fillRect(padL, yFor(0.12), plotW, Math.max(1, yFor(-0.1) - yFor(0.12)));
      }
      if (l.stall) {
        ctx.strokeStyle = 'rgba(255,90,90,0.35)';
        ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
        for (const v of [12, -12]) {
          ctx.beginPath(); ctx.moveTo(padL, yFor(v)); ctx.lineTo(padL + plotW, yFor(v)); ctx.stroke();
        }
        ctx.setLineDash([]);
      }
      if (l.unity) {
        ctx.strokeStyle = 'rgba(255,255,255,0.22)';
        ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(padL, yFor(1)); ctx.lineTo(padL + plotW, yFor(1)); ctx.stroke();
        ctx.setLineDash([]);
      }

      // trace
      ctx.strokeStyle = l.colour;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      const n = ring.count;
      for (let k = 0; k < n; k++) {
        const x = padL + (k / (SPAN - 1)) * plotW;
        const v = Math.max(l.min, Math.min(l.max, ring.at(k)));
        const y = yFor(v);
        k === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();

      // wipeout marks
      ctx.fillStyle = 'rgba(255,90,90,0.5)';
      for (let k = 1; k < n; k++) {
        if (this.marks.at(k) === 1 && this.marks.at(k - 1) !== 1) {
          const x = padL + (k / (SPAN - 1)) * plotW;
          ctx.fillRect(x, top, 1.5, h);
        }
      }

      const last = n ? ring.at(n - 1) : 0;
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.font = '10px ui-monospace, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(l.label, 4, top + 11);
      ctx.fillStyle = l.colour;
      ctx.fillText(last.toFixed(2) + ' ' + l.unit, 4, top + 23);
    }

    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '9px ui-monospace, monospace';
    ctx.textAlign = 'right';
    ctx.fillText('6 s', W - 6, H - 3);
  }
}
