/**
 * THE GRAPHICS SAFETY NET (27 Sep 2026).
 *
 * gfx-tier.js picks a look from the GPU's name - high on an Intel Iris laptop, full on anything
 * it does not know. A name is a guess: an AMD laptop chip, an old Iris on one memory stick, a
 * tablet. So when the look was picked AUTOMATICALLY, this watches the first seconds of play and,
 * if it is the GPU that cannot keep up, steps down to lite - once, for the rest of the visit - and
 * says so in one line.
 *
 * ⚠️ SLOW FRAMES ARE NOT A SLOW GPU (b43's mistake, caught by the Customer jobs session the same
 * day: it stepped an RTX 3090 down to lite). A page capped at 30 fps - Chrome's Energy Saver on
 * battery, a 30 Hz display, a remote session - shows a steady 33.3 ms frame whatever the GPU is,
 * and "median over 30 ms with our JS small" passed on every one of them. So the evidence now is:
 *   * where the browser has GPU timer queries (EXT_disjoint_timer_query_webgl2 - Chrome, Edge):
 *     the GPU's own time for each frame's work. Steps down only if its median is over GPU_SLOW_MS.
 *   * where it does not: the frame interval, but only when it is slower than any cap in use
 *     (median over NOQ_SLOW_MS, under ~22 fps). A 30 fps cap never gets there; a laptop at 5 fps
 *     (the owner's Dell before b40) does.
 *
 * It DECIDES ONCE: after SETTLE_MS of play, one verdict (a window of frames), then it stops
 * watching - window.__gfx.settled goes true either way, so a bench can wait for it and time
 * after it (bench.html does, up to 8 s). Never on an explicit ?gfx= (the bench's own diagnostic
 * runs pass one), never under ?cal=, never in the film harness (its frames are stepped, not
 * timed), and never while the tab is hidden. Anything over 1.5 s is not a frame at all.
 * (First draft dropped every interval over 250 ms as a 'stall', so a machine running at 2 fps -
 * the one that most needs it - was never helped. Caught on a slow software renderer, 27 Sep.)
 */
import { GFXRT, TIERS } from './gfx-tier.js';

const GPU_SLOW_MS = 20;  // GPU time per frame (timer queries) that counts as not keeping up
const NOQ_SLOW_MS = 45;  // without timers: frame interval that no fps cap explains...
const NOQ_CPU_MS = 12;   // ...and more than this of it not our own JS
const SETTLE_MS = 3000;
const WINDOW = 90;       // frames per verdict...
const WINDOW_MS = 4000;  // ...or this long, if the frames are that slow (at least MIN_N of them)
const MIN_N = 6;

export function createGfxAdapt({ seaGL, relayout, toast }) {
  const off = { frameStart() {}, frame() {}, get watching() { return false; } };
  if (!GFXRT.adapt || !seaGL) { GFXRT.settled = true; return off; }
  GFXRT.settled = false;
  const gl = seaGL.gl;
  const ext = gl && gl.getExtension ? gl.getExtension('EXT_disjoint_timer_query_webgl2') : null;
  let last = 0, start = 0, win = 0, done = false, waits = 0;
  const iv = [], gpu = [], pending = [], pool = [];
  let q = null;
  const reset = () => { last = 0; start = 0; win = 0; iv.length = 0; gpu.length = 0; };

  function finish() {
    done = true; GFXRT.settled = true;
    if (q && ext) { try { gl.endQuery(ext.TIME_ELAPSED_EXT); } catch { /* not active */ } q = null; }
    for (const p of pending) gl.deleteQuery(p);
    for (const p of pool) gl.deleteQuery(p);
    pending.length = 0; pool.length = 0;
  }

  function stepDown(why) {
    const L = TIERS.lite;
    const was = GFXRT.tier;
    if (seaGL.setWaterLite && !seaGL.setWaterLite(true)) { finish(); return; }   // could not build it: stay as we are
    if (seaGL.post && seaGL.post.setNoMsaa) seaGL.post.setNoMsaa(true);
    Object.assign(GFXRT, { tier: 'lite', scale: L.scale, msaa: false, waterLite: true, adapted: true,
      reason: `${GFXRT.reason} -> lite (${was}: ${why})` });
    finish();
    if (relayout) relayout();
    if (toast) toast('Lighter graphics on, so it runs smoothly on this device');
  }

  // GPU time: one TIME_ELAPSED query around each frame's GL work (only while watching). With
  // ?perf=2 the pass timer owns the extension (queries cannot nest), so its totals are used instead.
  const gprofOn = () => !!(globalThis.__gprof && globalThis.__gprof.on);
  function pollQueries() {
    while (pending.length) {
      const p = pending[0];
      if (!gl.getQueryParameter(p, gl.QUERY_RESULT_AVAILABLE)) break;
      pending.shift();
      if (!gl.getParameter(ext.GPU_DISJOINT_EXT)) gpu.push(gl.getQueryParameter(p, gl.QUERY_RESULT) / 1e6);
      pool.push(p);
    }
  }

  return {
    get watching() { return !done; },
    // Before the frame's GL work.
    frameStart() {
      if (done || !ext || gprofOn() || q) return;
      q = pool.pop() || gl.createQuery();
      gl.beginQuery(ext.TIME_ELAPSED_EXT, q);
    },
    // After it. nowMs: the rAF timestamp; running: the 3D scene is drawn and the game not paused.
    frame(nowMs, running) {
      if (done) return;
      if (q) { gl.endQuery(ext.TIME_ELAPSED_EXT); pending.push(q); q = null; }
      if (ext && !gprofOn()) pollQueries();
      if (ext && gprofOn()) { const r = globalThis.__gprof.report(); if (r && r.frames) gpu.push(r.total); }
      const hidden = typeof document !== 'undefined' && document.visibilityState !== 'visible';
      if (!running || hidden || globalThis.__film || globalThis.__calCam) { reset(); return; }
      if (last) { const d = nowMs - last; if (d > 0 && d < 1500) iv.push(d); }
      last = nowMs;
      if (!start) start = nowMs;
      if (nowMs - start < SETTLE_MS) { iv.length = 0; gpu.length = 0; win = nowMs; return; }
      if (iv.length < WINDOW && !(nowMs - win >= WINDOW_MS && iv.length >= MIN_N)) return;
      const med = (a) => { const s = a.slice().sort((x, y) => x - y); return s[s.length >> 1]; };
      const fm = med(iv);
      const P = globalThis.__perf && globalThis.__perf.snapshot ? globalThis.__perf.snapshot() : null;
      const cpu = P ? P.cpuAvgMs : 0;
      const noTimer = !ext || (gpu.length < MIN_N && ++waits > 3);   // timers that never answer: judge without them
      if (ext && gpu.length >= MIN_N) {
        const gm = med(gpu);
        if (gm > GPU_SLOW_MS) stepDown(`GPU ${gm.toFixed(0)} ms a frame, ${Math.round(1000 / fm)} fps`);
        else finish();
      } else if (noTimer) {
        if (fm > NOQ_SLOW_MS && fm - cpu > NOQ_CPU_MS) stepDown(`${Math.round(1000 / fm)} fps`);
        else finish();
      } else {
        // timers exist but no results yet (they lag a few frames): give it another window
        iv.length = 0; win = nowMs;
      }
    },
  };
}
