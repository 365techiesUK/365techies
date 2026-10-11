/**
 * GRAPHICS TIER (27 Sep 2026).
 *
 * The owner's Dell Latitude 3520 (Intel Iris Xe, one memory stick) ran the game at
 * 5 fps, GPU-bound: ~180 ms of GPU a frame at 0.86 MP (measured by the Customer jobs
 * session with ?perf=1). The root cause was ANGLE turning the sea's const tables into
 * per-pixel scratch arrays on Intel (b40, sea-surf.js SURF_TABLES) - after that fix the
 * same Dell ran lite at 57 fps (8.9 ms of GPU) and full at 45 fps (18.4 ms: just over its
 * ~17.7 ms display interval, so every other frame waited a refresh).
 *
 * Three looks. Each keeps everything that is the GAME - the waves, the surf you ride, the
 * underwater view - and differs only in polish:
 *   full   the 3D view at full resolution, multisampled, every water effect
 *   high   full water at full resolution, WITHOUT multisampling (owner, 27 Sep: "the better
 *          quality if we possibly can"). MEASURED on the Dell, Chrome, 27 Sep 16:28: 56 fps held
 *          at the display's rate, 17.9 ms avg, p95 18.5, no frame over 20 ms; GPU 12.8 ms
 *          (water 7.25, post 1.85, shadow 1.67, coast 1.23, sky 0.62) against full's 18.4 -
 *          multisampling was 3.4 ms of water and 2 ms of post on that chip.
 *   lite   the 3D view at 0.7 of its pixels a side, no multisampling, and the far water's
 *          rough reflection lobe and the clouds IN the water left out (the sky keeps its clouds)
 *
 * Picked from the WebGL renderer string (pickTier below):
 *   Intel Iris / Iris Xe / Iris Plus   high   (the Dell's class)
 *   Intel Arc                          full   (discrete, or Meteor Lake's ~2x Iris Xe)
 *   any other Intel (UHD, HD)          lite   (2-3x slower than Iris Xe)
 *   anything else                      full
 * NOT on SwiftShader or any other software renderer: the headless test suites, the calibration
 * views and the film captures render with one and must keep drawing the full picture.
 *
 * A SAFETY NET when the look was picked automatically (gfx-adapt.js): if a few seconds in the
 * game is running slowly and it is the GPU that is behind, it steps down to lite by itself.
 * Never on an explicit ?gfx=, never under ?cal=.
 *
 * URL: ?gfx=full | high | lite override the choice. For A/B work, one lever at a time:
 * ?rscale=0.6  ?msaa=0|1  ?wlite=0|1 (?gfxadapt=1 makes the safety net watch any tier but lite). globalThis.__gfx is the LIVE state (it changes if the
 * safety net steps down): tier, scale, msaa, waterLite, reason, adapt.
 */

export const TIERS = Object.freeze({
  full: Object.freeze({ scale: 1, msaa: true, waterLite: false }),
  high: Object.freeze({ scale: 1, msaa: false, waterLite: false }),
  lite: Object.freeze({ scale: 0.7, msaa: false, waterLite: true }),
});

// The choice itself, pure, so a test can ask it about any GPU. q: URLSearchParams-like (get/has).
export function pickTier(gpu, q) {
  const cal = !!(q && q.has('cal'));
  const want = q ? q.get('gfx') : null;
  const software = /swiftshader|llvmpipe|basic render|software/i.test(gpu || '');
  const intel = /intel/i.test(gpu || '') && !software;
  let tier, reason, auto = false;
  if (cal) { tier = 'full'; reason = 'calibration (?cal=)'; }
  else if (want && TIERS[want]) { tier = want; reason = '?gfx=' + want; }
  else {
    auto = true;
    if (intel && /\barc\b/i.test(gpu)) { tier = 'full'; reason = 'auto: Intel Arc graphics'; }
    else if (intel && /\biris\b/i.test(gpu)) { tier = 'high'; reason = 'auto: Intel Iris graphics'; }
    else if (intel) { tier = 'lite'; reason = 'auto: Intel integrated graphics'; }
    else { tier = 'full'; reason = gpu ? 'auto: ' + (software ? 'software renderer (kept full)' : 'discrete or unknown GPU') : 'auto: GPU name not available'; }
  }
  const T = TIERS[tier];
  const num = (k, d, lo, hi) => (q && q.has(k) && isFinite(+q.get(k)) ? Math.max(lo, Math.min(hi, +q.get(k))) : d);
  const flag = (k, d) => (q && q.get(k) === '1' ? true : q && q.get(k) === '0' ? false : d);
  return {
    tier,
    reason,
    gpu: gpu || '',
    scale: cal ? 1 : num('rscale', T.scale, 0.3, 1),
    msaa: cal ? true : flag('msaa', T.msaa),
    waterLite: cal ? false : flag('wlite', T.waterLite),
    // the safety net may step an automatic choice down; it never overrides one the URL made
    // (?gfxadapt=1 forces it to watch - for testing the step-down on a slow software renderer)
    adapt: !cal && tier !== 'lite' && ((auto && !software) || !!(q && q.get('gfxadapt') === '1')),
    adapted: false,
    // false while the safety net is still watching, true once it has decided (or never will):
    // a bench waits for it before timing (gfx-adapt.js)
    settled: !(!cal && tier !== 'lite' && ((auto && !software) || !!(q && q.get('gfxadapt') === '1'))),
  };
}

function decide() {
  const q = new URLSearchParams(globalThis.location ? location.search : '');
  const want = q.get('gfx');
  let gpu = '';
  // One throwaway context to read the GPU's name, only when the choice depends on it. Asked for
  // with the game's OWN attributes (gl/core.js): on a two-GPU laptop a default request can be
  // handed the integrated chip while the game's high-performance context runs on the other one.
  if (!q.has('cal') && !(want && TIERS[want]) && typeof document !== 'undefined') {
    try {
      const c = document.createElement('canvas');
      const attrs = { alpha: false, antialias: true, depth: true, powerPreference: 'high-performance' };
      const g = c.getContext('webgl2', attrs) || c.getContext('webgl', attrs);
      const e = g && g.getExtension('WEBGL_debug_renderer_info');
      gpu = e ? String(g.getParameter(e.UNMASKED_RENDERER_WEBGL) || '') : '';
      const lose = g && g.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
    } catch { /* masked or unavailable: stay full */ }
  }
  return pickTier(gpu, q);
}

// The choice the page STARTED with (the context's multisampling is fixed by it), frozen...
export const GFX = Object.freeze(decide());
// ...and the live state, which the safety net (gfx-adapt.js) may step down.
export const GFXRT = { ...GFX };
if (typeof globalThis !== 'undefined') globalThis.__gfx = GFXRT;
