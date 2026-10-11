// The side-on instrument (§8).
//
// Deliberately austere. If the foil is not fun on featureless grey water, no
// amount of Bournemouth rescues it and the project dies on day five - so this
// view gets no coastline, no colour, and nothing to look at except the thing
// you are trying to judge. It is an INSTRUMENT first and a picture second, and
// every decision below is settled that way.
//
// Concessions, all instrument rather than decoration:
//   - the water is drawn semi-transparent, because you cannot judge a foil you
//     cannot see;
//   - distance ticks pass, because a featureless plane gives no speed cue at
//     all and speed is half the control problem;
//   - the ruler, the green band and the ventilation line FOLLOW THE SURFACE,
//     because wing depth is measured from the local water and drawing the
//     gauges at absolute depth would make them lie by up to a wave height.
//
// The camera datum stays fixed: screen row `waterY` is world Y = 0, mean water
// level. Following the surface vertically would hide exactly the motion the
// rider is fighting.
//
// Longitudinal, like the plant. A screen column's along-track coordinate `xs`
// is mapped onto the world line through the board on the CURRENT heading:
//   wx = world.x + cos(h) * (xs - s.x),  wz = world.z + sin(h) * (xs - s.x)
// so a turn sweeps the profile round rather than scrolling a fixed lane.
//
// Sea slot discipline: this file uses slot 2 and nothing else. Slots 0 and 1
// belong to the plant, slot 3 to the WebGL renderer.

import { BAND } from './params.js';
import { mulberry32 } from './rng.js';

const N_PARTICLES = 260;
const COL_PX = 3;              // profile resolution, screen px per sample
const VENT_DEPTH = 0.12;       // the line drawn on the gauge (params.ventDepth)

// ⚠️ THE TEXT FLOOR ON A CANVAS (UITAIL, 2026-09-20).
// tmp-tr174 re-based the page to 16 px and took 128 rendered text sizes under the floor
// down to six declared exceptions - but a root font size cannot reach text PAINTED into a
// canvas, so the four labels in this file (the distance ticks, BAND, VENTILATION and the
// depth ruler) were still 10 px and 9 px. This view is not instrumentation: VIEW on the
// cold row and C on a keyboard both cycle into it, so a player reads these.
//
// One constant for all four, so the next person changes one number and not four - and so
// that a grep for the floor finds this file. 16 px is the floor, not a target: the ruler's
// rows are 0.5 * ppm apart and ppm is clamped to [90, 190] in resize(), so the tightest
// spacing this view can produce is 45 px and a 16 px row has no way to collide with its
// neighbour. The two sizes were checked against every string these labels can build:
// '2200 m' is the longest tick label at 6 characters (57.6 px), 'VENTILATION' the longest
// gauge label at 11 (105.6 px), both right-aligned 8 px off a canvas at least 884 px wide.
const LABEL_FONT = '16px ui-monospace, monospace';

export class Renderer {
  constructor(canvas) {
    this.c = canvas;
    this.ctx = canvas.getContext('2d');
    this.dpr = 1;
    this.camX = 0;
    this.showBand = true;
    this.showRuler = true;
    this.W = 1; this.H = 1; this.ppm = 120; this.waterY = 0;

    // Pooled. §5 budgets zero GC pauses in the loop.
    this.px = new Float32Array(N_PARTICLES);
    this.py = new Float32Array(N_PARTICLES);
    this.pu = new Float32Array(N_PARTICLES);
    this.pw = new Float32Array(N_PARTICLES);
    this.pl = new Float32Array(N_PARTICLES);
    this.pi = 0;
    this.rng = mulberry32(0x5eaf01);
    this.wake = new Float32Array(160);
    this.wakeX = new Float32Array(160);
    this.wi = 0;

    // The sampled surface profile, one entry per COL_PX of screen width.
    // Grown only in resize(), never in a frame.
    this.nCols = 0;
    this.colY = new Float32Array(1);
    this.colX = new Float32Array(1);
  }

  reset() {
    this.pl.fill(0);
    this.wake.fill(0);
    this.wakeX.fill(0);
    this.rng = mulberry32(0x5eaf01);
  }

  // w/h are CSS pixels, already measured off the laid-out element. Only the
  // backing store is set here - the element's size is CSS's business, and
  // writing it back from here is how you get a resize feedback loop.
  resize(w, h, dpr) {
    this.dpr = dpr;
    this.c.width = Math.max(1, Math.round(w * dpr));
    this.c.height = Math.max(1, Math.round(h * dpr));
    this.W = w; this.H = h;
    this.ppm = Math.max(90, Math.min(190, h * 0.17));
    this.waterY = h * 0.54;

    const n = Math.ceil(w / COL_PX) + 2;
    if (n > this.colY.length) {
      this.colY = new Float32Array(n);
      this.colX = new Float32Array(n);
    }
    this.nCols = n;
  }

  emit(x, y, u, w, life) {
    const i = this.pi;
    this.px[i] = x; this.py[i] = y; this.pu[i] = u; this.pw[i] = w; this.pl[i] = life;
    this.pi = (this.pi + 1) % N_PARTICLES;
  }

  stepParticles(dt) {
    for (let i = 0; i < N_PARTICLES; i++) {
      if (this.pl[i] <= 0) continue;
      this.pl[i] -= dt;
      this.pw[i] -= 9.81 * dt * 0.55;
      this.px[i] += this.pu[i] * dt;
      this.py[i] += this.pw[i] * dt;
    }
  }

  // ---- the sampled surface -------------------------------------------------
  // One sea.sample per COL_PX of width, once per frame, outside the tick.
  _profile(sim) {
    const w = sim.world, s = sim.plant.state;
    const ch = Math.cos(w.heading), sh = Math.sin(w.heading);
    const inv = 1 / this.ppm;
    for (let i = 0; i < this.nCols; i++) {
      const xs = this.camX + (i * COL_PX) * inv;
      const along = xs - s.x;
      const q = sim.sea.sample(w.x + ch * along, w.z + sh * along, sim.time, 0, 2);
      this.colX[i] = xs;
      this.colY[i] = q.height;
    }
  }

  // Surface height at an along-track coordinate, read off the profile that was
  // just sampled. Linear between columns; clamped at the edges so a wake tick
  // or a particle just off screen still gets an answer instead of a NaN.
  _surfAt(xs) {
    const n = this.nCols;
    if (n < 2) return 0;
    const f = (xs - this.camX) * this.ppm / COL_PX;
    if (f <= 0) return this.colY[0];
    if (f >= n - 1) return this.colY[n - 1];
    const i = f | 0, t = f - i;
    return this.colY[i] + (this.colY[i + 1] - this.colY[i]) * t;
  }

  spawnSpray(sim, dt) {
    const s = sim.plant.state, w = sim.world, r = this.rng;
    const surf = sim.sea.sample(w.x, w.z, sim.time, 0, 2).height;
    // Hull spray while the board is still wetted - this is what the pop-up
    // looks like ending.
    if (s.wetted > 0.02 && s.speed > 1.5) {
      const n = Math.min(4, Math.floor(s.wetted * s.speed * dt * 26));
      for (let i = 0; i < n; i++) {
        this.emit(s.x - 0.7, surf + 0.02, -s.speed * (0.15 + r() * 0.3),
          1.0 + r() * 2.2 * s.wetted, 0.35 + r() * 0.4);
      }
    }
    // Mast spray, and the rooster tail that tells you the wing is close to
    // the surface before the HUD does.
    if (s.speed > 4 && s.rideHeight > 0) {
      const n = s.wingDepth < 0.3 ? 3 : 1;
      for (let i = 0; i < n; i++) {
        this.emit(s.x - 0.35, surf, -s.speed * (0.1 + r() * 0.25),
          0.6 + r() * (s.wingDepth < 0.3 ? 3.0 : 1.1), 0.25 + r() * 0.35);
      }
    }
    if (s.mode === 'DOWN' && r() < 0.25) {
      this.emit(s.x, surf, (r() - 0.5) * 3, 1 + r() * 3, 0.5 + r() * 0.5);
    }
  }

  draw(sim, dt = 1 / 60) {
    const ctx = this.ctx, W = this.W, H = this.H, ppm = this.ppm;
    const s = sim.plant.state;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    // Camera follow, as a time constant rather than a per-frame fraction. A
    // fixed 0.14 per frame means the camera lags twice as far at 30 fps as at
    // 120, and falls off the board entirely if frames are sparse.
    const targetCam = s.x - (W * 0.34) / ppm;
    this.camX += (targetCam - this.camX) * (1 - Math.exp(-dt / 0.16));
    const sx = (wx) => (wx - this.camX) * ppm;
    const sy = (wy) => this.waterY - wy * ppm;

    this._profile(sim);
    const surfBoard = this._surfAt(s.x);

    // sky
    const g = ctx.createLinearGradient(0, 0, 0, this.waterY);
    g.addColorStop(0, '#23262b');
    g.addColorStop(1, '#3a3f47');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, this.waterY);

    // distance ticks on the horizon - a speed cue that does not move with the
    // water, so surface motion and forward motion stay separable by eye
    // ⚠️ UITAIL 2026-09-20: 10 -> 16 px, the project's text floor. This is drawn to the
    // canvas rather than styled in CSS, so tmp-tr174's root re-base could not reach it and
    // it sat under the floor while every DOM label in the build was lifted above it. It is
    // read by a player - the side view is one of the three cameras VIEW cycles - so the
    // floor applies. The TICK is unchanged; only the label's size and its baseline move.
    // The baseline goes waterY-15 -> waterY-17 because a 16 px glyph's descender reaches
    // 3.5 px below the baseline and the major tick's top is at waterY-11: at -15 the two
    // touched. Measured at 884x405 and at 900x500, the two canvas sizes this project uses.
    ctx.fillStyle = 'rgba(255,255,255,0.13)';
    ctx.font = LABEL_FONT;
    ctx.textAlign = 'center';
    // ⚠️ THE GAUGE COLUMN IS RESERVED, and this is a real collision, not a precaution.
    // The tick label sits on a SCREEN-FIXED row (waterY - 17) while BAND and VENTILATION
    // FOLLOW THE SURFACE - that is the whole point of those two, see _band below - so the
    // two share a row whenever the water at the right-hand edge sits in a narrow band near
    // the datum. At 9/10 px there was about 8 px of slack and it never showed. At 16 px
    // there is not: measured with actualBoundingBox* off the live context at 740x360, the
    // tick label and VENTILATION overlapped at 16 of the 93 columns the tick can occupy.
    // Found by this pass's own check (tmp-tr177/uitail/work/cameras.mjs) AFTER the size
    // change, which is to say the size change caused it.
    // The tick yields, because it is the transient one: it scrolls past every 50 m, while
    // the other two readouts are permanent and pinned to the edges. The TICK MARK is still
    // drawn everywhere - only its number is dropped, and only while it is inside one of
    // their columns. Both edges, because the depth ruler on the left follows the surface at
    // the BOARD for the same reason VENTILATION follows it at the right-hand edge, and the
    // swept check found the left-hand collision as soon as it was looked for: at a surface
    // of 0.10-0.14 m the tick number and the '-0.0 m' row came within 0.4 px.
    // The two columns are measured, not guessed, so they track the font.
    const rulerR = 26 + ctx.measureText('-0.0 m').width;
    const gaugeL = this.W - 8 - ctx.measureText('VENTILATION').width;
    const first = Math.floor(this.camX / 10) * 10;
    const lastX = this.camX + W / ppm + 10;
    for (let m = first; m < lastX; m += 10) {
      const X = sx(m);
      const major = m % 50 === 0;
      ctx.fillRect(X, this.waterY - (major ? 11 : 5), 1, major ? 11 : 5);
      if (!major) continue;
      const label = m + ' m';
      const half = ctx.measureText(label).width / 2;
      if (X - half < rulerR || X + half > gaugeL) continue;
      ctx.fillText(label, X, this.waterY - 17);
    }

    // craft first, water over the top of it
    this._craft(s, sim.rider, sx, sy, ppm, ctx);

    // particles above water
    this._particles(ctx, sx, sy, true);

    // ---- the sea, as a sampled profile ------------------------------------
    const wg = ctx.createLinearGradient(0, this.waterY - 0.9 * ppm, 0, H);
    wg.addColorStop(0, 'rgba(96,107,120,0.80)');
    wg.addColorStop(1, 'rgba(46,52,60,0.94)');
    ctx.fillStyle = wg;
    ctx.beginPath();
    ctx.moveTo(0, sy(this.colY[0]));
    for (let i = 1; i < this.nCols; i++) ctx.lineTo(i * COL_PX, sy(this.colY[i]));
    ctx.lineTo((this.nCols - 1) * COL_PX, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fill();

    // waterline
    ctx.strokeStyle = 'rgba(220,230,240,0.55)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, sy(this.colY[0]));
    for (let i = 1; i < this.nCols; i++) ctx.lineTo(i * COL_PX, sy(this.colY[i]));
    ctx.stroke();

    // wake, hung off the local surface rather than a fixed row
    ctx.strokeStyle = 'rgba(220,230,240,0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < this.wake.length; i++) {
      const k = (this.wi + i) % this.wake.length;
      if (this.wake[k] <= 0) continue;
      const y0 = sy(this._surfAt(this.wakeX[k]));
      const X = sx(this.wakeX[k]);
      ctx.moveTo(X, y0);
      ctx.lineTo(X, y0 + this.wake[k] * 10);
    }
    ctx.stroke();

    // sub-surface reference marks, so depth reads as depth. 1.15 m BELOW THE
    // LOCAL SURFACE - a fixed row would read as a false horizon on a wave.
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (let m = first; m < lastX; m += 5) {
      ctx.fillRect(sx(m), sy(this._surfAt(m) - 1.15), 14, 1);
    }

    if (this.showBand) this._band(ctx, sy);
    this._ventLine(ctx, sy);
    if (this.showRuler) this._ruler(ctx, sy, surfBoard, sx(s.x));

    // particles below water (dimmed by being drawn after the sea)
    this._particles(ctx, sx, sy, false);

    // the wing, redrawn faintly over the water so its depth is always legible
    this._wingGhost(s, sx, sy, ppm, ctx);
  }

  // The green band, as a ribbon that follows the surface. BAND.lo/hi are wing
  // depths BELOW THE LOCAL WATER, so on a wave the band is a curved strip - and
  // drawing it as two straight lines would have it say "you are in the band"
  // while the plant said otherwise.
  _band(ctx, sy) {
    const n = this.nCols;
    ctx.beginPath();
    ctx.moveTo(0, sy(this.colY[0] - BAND.lo));
    for (let i = 1; i < n; i++) ctx.lineTo(i * COL_PX, sy(this.colY[i] - BAND.lo));
    for (let i = n - 1; i >= 0; i--) ctx.lineTo(i * COL_PX, sy(this.colY[i] - BAND.hi));
    ctx.closePath();
    ctx.fillStyle = 'rgba(111,227,160,0.10)';
    ctx.fill();

    ctx.strokeStyle = 'rgba(111,227,160,0.35)';
    ctx.setLineDash([6, 5]); ctx.lineWidth = 1;
    this._ribbon(ctx, sy, BAND.lo);
    this._ribbon(ctx, sy, BAND.hi);
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(111,227,160,0.55)';
    ctx.font = LABEL_FONT;                                   /* UITAIL 10 -> 16 px */
    ctx.textAlign = 'right';
    // +12 -> +16: the label hangs under the upper band line, and the gap has to keep pace
    // with the glyph or a 16 px cap height climbs back over the line it is labelling.
    ctx.fillText('BAND', this.W - 8, sy(this.colY[n - 1] - BAND.hi) + 16);
  }

  // The edge you are riding. Same argument as the band: it is a depth, so it
  // follows the water.
  _ventLine(ctx, sy) {
    ctx.strokeStyle = 'rgba(255,90,90,0.4)';
    ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
    this._ribbon(ctx, sy, VENT_DEPTH);
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,120,120,0.55)';
    ctx.font = LABEL_FONT;                                   /* UITAIL 10 -> 16 px */
    ctx.textAlign = 'right';
    // -4 -> -6: this one sits ABOVE its line, so the clearance is the descender (3.5 px at
    // 16 px) rather than the cap height. Two pixels is what keeps it off the dashes.
    ctx.fillText('VENTILATION', this.W - 8, sy(this.colY[this.nCols - 1] - VENT_DEPTH) - 6);
  }

  // One stroked polyline at a constant depth under the sampled surface.
  _ribbon(ctx, sy, depth) {
    ctx.beginPath();
    ctx.moveTo(0, sy(this.colY[0] - depth));
    for (let i = 1; i < this.nCols; i++) ctx.lineTo(i * COL_PX, sy(this.colY[i] - depth));
    ctx.stroke();
  }

  // The depth scale. Zeroed on the surface AT THE BOARD, because the number it
  // has to let you read off is the wing's depth and that is measured from the
  // water the board is sitting on - not from the water at the left margin and
  // not from mean sea level. A faint leader runs from the scale to the board so
  // the datum is never ambiguous.
  _ruler(ctx, sy, surfBoard, boardScreenX) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.13)';
    ctx.setLineDash([2, 5]); ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(26, sy(surfBoard));
    ctx.lineTo(Math.max(26, boardScreenX), sy(surfBoard));
    ctx.stroke();
    ctx.restore();

    // UITAIL 9 -> 16 px. This is the number the whole view exists to let you read, and it
    // was the smallest text in the build. Only the three MAJOR rows carry a label (0.0,
    // -0.5, -1.0), so the vertical spacing is 0.5 * ppm = 45 px at worst - see LABEL_FONT.
    // The +3 baseline nudge is unchanged: it centres the glyph on its tick, and at 16 px
    // half the cap height is 5.8 px, so +5 is what puts the row's middle on the line.
    ctx.font = LABEL_FONT;
    ctx.textAlign = 'left';
    for (let d = 0; d <= 1.0001; d += 0.1) {
      const y = sy(surfBoard - d);
      const major = Math.abs(d * 10 - Math.round(d * 10)) < 1e-6 && Math.round(d * 10) % 5 === 0;
      ctx.fillStyle = major ? 'rgba(255,255,255,0.34)' : 'rgba(255,255,255,0.16)';
      ctx.fillRect(6, y, major ? 16 : 9, 1);
      if (major) ctx.fillText('-' + d.toFixed(1) + ' m', 26, y + 5);
    }
  }

  _particles(ctx, sx, sy, above) {
    ctx.fillStyle = above ? 'rgba(235,242,250,0.55)' : 'rgba(200,215,230,0.28)';
    for (let i = 0; i < N_PARTICLES; i++) {
      if (this.pl[i] <= 0) continue;
      // "Above water" is above the LOCAL surface, not above y = 0.
      const isAbove = this.py[i] > this._surfAt(this.px[i]);
      if (isAbove !== above) continue;
      const a = Math.min(1, this.pl[i] * 2);
      ctx.globalAlpha = a * (above ? 0.6 : 0.35);
      ctx.fillRect(sx(this.px[i]), sy(this.py[i]), 1.6, 1.6);
    }
    ctx.globalAlpha = 1;
  }

  _craft(s, rider, sx, sy, ppm, ctx) {
    const bx = sx(s.x), by = sy(s.y);
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(-s.pitch);

    const L = 1.63 * ppm, T = 0.11 * ppm;

    // board
    ctx.fillStyle = '#d7dde6';
    ctx.beginPath();
    ctx.roundRect(-L * 0.42, -T, L, T, [T * 0.5, T * 0.9, T * 0.35, T * 0.35]);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(-L * 0.42, -T * 0.28, L, T * 0.28);

    // mast + fuselage + wings
    const mast = (this.mast || 0.75) * ppm;
    ctx.fillStyle = '#9aa4b1';
    ctx.fillRect(-0.10 * ppm, 0, 0.045 * ppm, mast);
    ctx.fillRect(-0.30 * ppm, mast - 0.02 * ppm, 0.62 * ppm, 0.035 * ppm);

    // front wing (aerofoil-ish)
    ctx.fillStyle = s.ventilated ? '#ff8a8a' : '#e8eef6';
    ctx.beginPath();
    ctx.moveTo(-0.30 * ppm, mast);
    ctx.quadraticCurveTo(-0.16 * ppm, mast - 0.045 * ppm, 0.02 * ppm, mast + 0.004 * ppm);
    ctx.quadraticCurveTo(-0.16 * ppm, mast + 0.03 * ppm, -0.30 * ppm, mast);
    ctx.fill();
    // rear stabiliser
    ctx.fillRect(0.24 * ppm, mast - 0.012 * ppm, 0.10 * ppm, 0.022 * ppm);

    // rider
    this._rider(ctx, ppm, rider, s);
    ctx.restore();
  }

  _rider(ctx, ppm, rider, s) {
    const down = s.mode === 'DOWN';
    const lean = down ? 0.9 : (rider ? rider.pitch * 1.6 : 0);
    const hipX = -0.12 * ppm, hipY = -0.42 * ppm;
    ctx.strokeStyle = down ? '#8d939c' : '#f0f4f9';
    ctx.lineWidth = Math.max(2, 0.035 * ppm);
    ctx.lineCap = 'round';

    const torso = 0.52 * ppm;
    const shX = hipX - Math.sin(lean) * torso * 0.35;
    const shY = hipY - Math.cos(lean) * torso;

    ctx.beginPath();                    // legs
    ctx.moveTo(-0.30 * ppm, -0.12 * ppm);
    ctx.lineTo(hipX - 0.05 * ppm, hipY + 0.04 * ppm);
    ctx.moveTo(0.06 * ppm, -0.12 * ppm);
    ctx.lineTo(hipX + 0.05 * ppm, hipY + 0.04 * ppm);
    ctx.stroke();

    ctx.beginPath();                    // torso
    ctx.moveTo(hipX, hipY);
    ctx.lineTo(shX, shY);
    ctx.stroke();

    ctx.beginPath();                    // throttle arm
    ctx.moveTo(shX, shY);
    ctx.lineTo(shX + 0.24 * ppm, shY + 0.16 * ppm);
    ctx.stroke();

    ctx.beginPath();                    // head
    ctx.fillStyle = ctx.strokeStyle;
    ctx.arc(shX - Math.sin(lean) * 0.11 * ppm, shY - Math.cos(lean) * 0.11 * ppm, 0.085 * ppm, 0, 7);
    ctx.fill();
  }

  // Faint overlay so the wing never disappears into the water fill - this is an
  // instrument, not a lighting decision.
  _wingGhost(s, sx, sy, ppm, ctx) {
    if (s.wingDepth <= 0) return;
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.translate(sx(s.x), sy(s.y));
    ctx.rotate(-s.pitch);
    const mast = (this.mast || 0.75) * ppm;
    ctx.strokeStyle = s.ventilated ? 'rgba(255,120,120,0.9)' : 'rgba(232,238,246,0.75)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-0.30 * ppm, mast);
    ctx.lineTo(0.02 * ppm, mast);
    ctx.stroke();
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  pushWake(sim, dt) {
    const s = sim.plant.state;
    if (s.speed < 1) return;
    this.wakeX[this.wi] = s.x;
    this.wake[this.wi] = Math.min(1, s.speed / 12) * (s.wetted > 0.05 ? 1 : 0.45);
    this.wi = (this.wi + 1) % this.wake.length;
  }
}
