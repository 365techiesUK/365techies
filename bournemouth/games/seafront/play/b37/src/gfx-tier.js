/**
 * GRAPHICS TIER (27 Sep 2026).
 *
 * The owner's Dell Latitude 3520 (Intel Iris Xe, one memory stick) ran the game at
 * 5 fps, GPU-bound: ~180 ms of GPU a frame at 0.86 MP (measured by the Customer jobs
 * session with ?perf=1). ?perf=2 (src/gpuprof.js) put the WATER pass at 84% of the GPU
 * time on a weak renderer, and three parts of its pixel shader at most of that:
 * the rough far-water reflection lobe (6 cloudy-sky samples a pixel), the clouds in
 * the reflections, and the surf train. See tmp-tr202/.
 *
 * LIGHT is for integrated graphics. It keeps everything that is the GAME - the waves,
 * their shape, the surf you ride, the underwater view - and gives up polish:
 *   scale   the 3D view drawn at 0.7 of its pixels a side (about half the pixels),
 *           scaled up by the browser. The HUD is HTML and stays sharp.
 *   msaa    no multisampling (it is decided when the WebGL context is made).
 *   water   the far water's rough reflection lobe and the clouds IN the water are
 *           left out; the sky above still has its clouds.
 *
 * Picked automatically on an Intel integrated GPU (not Arc), from the renderer string.
 * NOT on SwiftShader or any other software renderer: the headless test suites, the
 * calibration views and the film captures render with one and must keep drawing the
 * full picture. Never under ?cal=.
 *
 * URL: ?gfx=lite | ?gfx=full override the choice. For A/B work, one lever at a time:
 * ?rscale=0.6  ?msaa=0|1  ?wlite=0|1. globalThis.__gfx says what was chosen and why.
 */

function decide() {
  const q = new URLSearchParams(globalThis.location ? location.search : '');
  const cal = q.has('cal');
  const want = q.get('gfx');
  let gpu = '';
  // One throwaway context to read the GPU's name, only when the choice depends on it.
  if (!cal && want !== 'lite' && want !== 'full' && typeof document !== 'undefined') {
    try {
      const c = document.createElement('canvas');
      const g = c.getContext('webgl2') || c.getContext('webgl');
      const e = g && g.getExtension('WEBGL_debug_renderer_info');
      gpu = e ? String(g.getParameter(e.UNMASKED_RENDERER_WEBGL) || '') : '';
      const lose = g && g.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
    } catch { /* masked or unavailable: stay full */ }
  }
  const software = /swiftshader|llvmpipe|basic render|software/i.test(gpu);
  const intelIgp = /intel/i.test(gpu) && !/\barc\b/i.test(gpu) && !software;
  let lite, reason;
  if (cal) { lite = false; reason = 'calibration (?cal=)'; }
  else if (want === 'lite') { lite = true; reason = '?gfx=lite'; }
  else if (want === 'full') { lite = false; reason = '?gfx=full'; }
  else if (intelIgp) { lite = true; reason = 'auto: Intel integrated graphics'; }
  else { lite = false; reason = gpu ? 'auto: ' + (software ? 'software renderer (kept full)' : 'discrete or unknown GPU') : 'auto: GPU name not available'; }

  const num = (k, d, lo, hi) => (q.has(k) && isFinite(+q.get(k)) ? Math.max(lo, Math.min(hi, +q.get(k))) : d);
  const flag = (k, d) => (q.get(k) === '1' ? true : q.get(k) === '0' ? false : d);
  return Object.freeze({
    tier: lite ? 'lite' : 'full',
    reason,
    gpu,
    scale: cal ? 1 : num('rscale', lite ? 0.7 : 1, 0.3, 1),
    msaa: cal ? true : flag('msaa', !lite),
    waterLite: cal ? false : flag('wlite', lite),
  });
}

export const GFX = decide();
if (typeof globalThis !== 'undefined') globalThis.__gfx = GFX;
