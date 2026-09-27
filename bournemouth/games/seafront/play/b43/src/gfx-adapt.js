/**
 * THE GRAPHICS SAFETY NET (27 Sep 2026).
 *
 * gfx-tier.js picks a look from the GPU's name - high on an Intel Iris laptop, full on anything
 * it does not know. A name is a guess: an AMD laptop chip, an old Iris on one memory stick, a
 * tablet. So when the look was picked AUTOMATICALLY, this watches the first seconds of play and,
 * if the frames are slow and it is the GPU that is behind (not our own JS), steps down to lite -
 * once, for the rest of the visit - and says so in one line.
 *
 * Never on an explicit ?gfx= (the service bench passes &gfx=full to measure the machine, and
 * that must stay what it asked for), never under ?cal=, never in the film harness (its frames
 * are stepped, not timed), and never while the tab is hidden. A lone hitch (a shader compiling)
 * cannot fool it - the verdict is a median - and anything over 1.5 s is not a frame at all.
 * (First draft dropped every interval over 250 ms as a 'stall', so a machine running at 2 fps -
 * the one that most needs it - was never helped. Caught on a slow software renderer, 27 Sep.)
 *
 * The test is a window of real frames after 3 s of settling: median frame interval over
 * SLOW_MS (under ~33 fps) and more than GPU_MS of it not spent in our own JS.
 */
import { GFXRT, TIERS } from './gfx-tier.js';

const SLOW_MS = 30;      // median frame interval that counts as struggling
const GPU_MS = 12;       // ...of which at least this much is waiting on the GPU, not our JS
const SETTLE_MS = 3000;
const WINDOW = 90;       // frames per verdict (1.5 s at 60 fps, ~3 s at 30)...
const WINDOW_MS = 4000;  // ...or this long, if the frames are that slow (at least MIN_N of them)
const MIN_N = 6;

export function createGfxAdapt({ seaGL, relayout, toast }) {
  const off = { frame() {}, get watching() { return false; } };
  if (!GFXRT.adapt || !seaGL) return off;
  let last = 0, start = 0, win = 0, done = false;
  const iv = [];
  const reset = () => { last = 0; start = 0; win = 0; iv.length = 0; };

  function stepDown(med) {
    done = true;
    const L = TIERS.lite;
    const was = GFXRT.tier;
    if (seaGL.setWaterLite && !seaGL.setWaterLite(true)) return;   // could not build it: stay as we are
    if (seaGL.post && seaGL.post.setNoMsaa) seaGL.post.setNoMsaa(true);
    Object.assign(GFXRT, { tier: 'lite', scale: L.scale, msaa: false, waterLite: true, adapted: true,
      reason: `${GFXRT.reason} -> lite (${was} ran at ${Math.round(1000 / med)} fps)` });
    if (relayout) relayout();
    if (toast) toast('Lighter graphics on, so it runs smoothly on this device');
  }

  return {
    get watching() { return !done; },
    // nowMs: the rAF timestamp; running: the 3D scene is being drawn and the game is not paused
    frame(nowMs, running) {
      if (done) return;
      const hidden = typeof document !== 'undefined' && document.visibilityState !== 'visible';
      if (!running || hidden || globalThis.__film || globalThis.__calCam) { reset(); return; }
      if (last) { const d = nowMs - last; if (d > 0 && d < 1500) iv.push(d); }
      last = nowMs;
      if (!start) start = nowMs;
      if (nowMs - start < SETTLE_MS) { iv.length = 0; win = nowMs; return; }
      if (iv.length < WINDOW && !(nowMs - win >= WINDOW_MS && iv.length >= MIN_N)) return;
      const s = iv.slice().sort((a, b) => a - b), med = s[s.length >> 1];
      iv.length = 0; win = nowMs;
      const P = globalThis.__perf && globalThis.__perf.snapshot ? globalThis.__perf.snapshot() : null;
      const cpu = P ? P.cpuAvgMs : 0;
      if (med > SLOW_MS && med - cpu > GPU_MS) stepDown(med);
    },
  };
}
