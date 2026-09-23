/**
 * Frame-time meter.
 *
 * Answers one question honestly: is the rig dropping frames, and is it the CPU
 * (sim + our own draw work) or the GPU that is costing the time?
 *
 * - Frame interval comes from rAF timestamps, so it is what a rider actually
 *   sees, including whatever the browser does between our frames.
 * - CPU time is measured around our own frame body, so `interval - cpu` is
 *   roughly the wait on the GPU and the compositor.
 * - There is no library here to ask for draw-call counts, so the WebGL2 context
 *   is wrapped: every drawArrays/drawElements call is counted, with its
 *   triangles, and the counters reset each frame. The wrap is a few adds per
 *   call and is only installed when the meter module is loaded.
 *
 * ⚠️ pointer-events:none on the panel. This game is ridden with a touch
 * throttle and a drag-anywhere camera; an overlay that catches pointers would
 * break the rig while claiming to measure it.
 *
 * On: ?perf=1, or press Y. (NOT F - this rig already uses F for a flat sea,
 * P for pause, G for charts, T for the tuning panel.)
 * Harness: globalThis.__perf.snapshot() / .reset().
 */

const N = 240;   // ~4 s of history at 60fps

export function createPerf(doc, gl, canvas) {
  const interval = new Float32Array(N);
  const cpu = new Float32Array(N);
  let idx = 0, filled = 0, prevStart = 0, tStart = 0, lastPaint = 0;
  let visible = new URLSearchParams(globalThis.location?.search || '').get('perf') === '1';

  // ---- count draw calls without a library -------------------------------
  const count = { calls: 0, tris: 0 };
  let frameCalls = 0, frameTris = 0;
  if (gl && !gl.__perfWrapped) {
    const trisOf = (mode, n) => {
      if (mode === gl.TRIANGLES) return n / 3;
      if (mode === gl.TRIANGLE_STRIP || mode === gl.TRIANGLE_FAN) return Math.max(0, n - 2);
      return 0;                                   // lines and points are not triangles
    };
    const wrap = (name, countArg) => {
      const orig = gl[name];
      if (typeof orig !== 'function') return;
      gl[name] = function (...args) {
        count.calls += 1;
        count.tris += trisOf(args[0], args[countArg]) * (name.endsWith('Instanced') ? (args[args.length - 1] || 1) : 1);
        return orig.apply(this, args);
      };
    };
    wrap('drawArrays', 2);            // (mode, first, count)
    wrap('drawElements', 1);          // (mode, count, type, offset)
    wrap('drawArraysInstanced', 2);
    wrap('drawElementsInstanced', 1);
    gl.__perfWrapped = true;
  }

  // ---- panel -------------------------------------------------------------
  const box = doc.createElement('div');
  box.id = 'perf';
  box.style.cssText = [
    // TOP-left: the bottom-left corner is the hull bar and the water-cannon
    // strip, and a panel parked over them hides the rig's own readouts.
    'position:fixed', 'left:12px', 'top:max(12px,env(safe-area-inset-top))',
    'z-index:60', 'pointer-events:none', 'display:' + (visible ? 'block' : 'none'),
    'font:600 12px/1.45 ui-monospace,Consolas,"SF Mono",monospace',
    'color:#e8f3ff', 'background:rgba(6,14,28,.74)', 'border:1px solid rgba(120,200,255,.3)',
    'border-radius:10px', 'padding:8px 10px', 'white-space:pre', 'letter-spacing:.02em',
  ].join(';');
  const text = doc.createElement('div');
  const spark = doc.createElement('canvas');
  spark.width = 232; spark.height = 42;
  spark.style.cssText = 'display:block;width:232px;height:42px;margin-top:6px';
  box.append(text, spark);
  doc.body.append(box);
  const sctx = spark.getContext('2d');

  let gpuName = '';
  try {
    const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
    if (ext) gpuName = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '');
  } catch { /* masked in most browsers; not important */ }

  // The first 60 frames, kept verbatim. A boot stall is a one-off and the
  // rolling window loses it; this is what tells you WHICH frame froze and how
  // much of it was our own JS.
  const boot = [];

  function frameStart(nowMs) {
    if (prevStart) interval[idx] = nowMs - prevStart;
    prevStart = nowMs;
    tStart = performance.now();
    count.calls = 0; count.tris = 0;
  }

  function frameEnd() {
    cpu[idx] = performance.now() - tStart;
    if (boot.length < 60) {
      boot.push({ n: boot.length, at: +prevStart.toFixed(1), gap: +(interval[idx] || 0).toFixed(1),
                  cpu: +cpu[idx].toFixed(1), calls: count.calls });
    }
    frameCalls = count.calls; frameTris = count.tris;
    idx = (idx + 1) % N;
    if (filled < N) filled += 1;
    if (visible && performance.now() - lastPaint > 250) { paint(); lastPaint = performance.now(); }
  }

  function series() {
    const out = [];
    for (let k = 0; k < filled; k += 1) {
      const j = (idx - 1 - k + N * 2) % N;
      if (interval[j] > 0) out.push([interval[j], cpu[j]]);
    }
    return out.reverse();
  }

  function snapshot() {
    const s = series();
    if (!s.length) return null;
    const ivs = s.map((p) => p[0]).sort((a, b) => a - b);
    const sum = (a) => a.reduce((x, y) => x + y, 0);
    return {
      samples: s.length,
      fps: +(1000 / (sum(ivs) / ivs.length)).toFixed(1),
      avgMs: +(sum(ivs) / ivs.length).toFixed(2),
      medianMs: +ivs[Math.floor(ivs.length * 0.5)].toFixed(2),
      p95Ms: +ivs[Math.floor(ivs.length * 0.95)].toFixed(2),
      worstMs: +ivs[ivs.length - 1].toFixed(2),
      cpuAvgMs: +(sum(s.map((p) => p[1])) / s.length).toFixed(2),
      cpuWorstMs: +Math.max(...s.map((p) => p[1])).toFixed(2),
      over20ms: ivs.filter((v) => v > 20).length,
      over33ms: ivs.filter((v) => v > 33).length,
      calls: frameCalls,
      triangles: Math.round(frameTris),
      dpr: +(globalThis.devicePixelRatio || 1).toFixed(2),
      bufferW: canvas ? canvas.width : 0,
      bufferH: canvas ? canvas.height : 0,
      megapixels: canvas ? +((canvas.width * canvas.height) / 1e6).toFixed(2) : 0,
      gl: !!gl,
      gpu: gpuName,
    };
  }

  function paint() {
    const s = snapshot();
    if (!s) return;
    const pct = (n) => ((n / s.samples) * 100).toFixed(0);
    text.textContent =
      `${s.fps.toFixed(0)} fps   ${s.avgMs.toFixed(1)} ms avg   cpu ${s.cpuAvgMs.toFixed(1)} ms\n` +
      `p95 ${s.p95Ms.toFixed(1)}   worst ${s.worstMs.toFixed(0)}   >20ms ${pct(s.over20ms)}%\n` +
      `${s.calls} calls   ${(s.triangles / 1000).toFixed(0)}k tris   ${s.megapixels} MP @ dpr ${s.dpr}`;

    const data = series().slice(-116);
    const w = spark.width, h = spark.height;
    sctx.clearRect(0, 0, w, h);
    const top = Math.max(33.4, Math.min(66, s.worstMs));
    sctx.fillStyle = 'rgba(120,200,255,.22)';
    sctx.fillRect(0, h - (16.67 / top) * h, w, 1);          // the 60fps line
    for (let k = 0; k < data.length; k += 1) {
      const [iv, cp] = data[k];
      const x = k * 2;
      const bh = Math.min(h, (iv / top) * h);
      sctx.fillStyle = iv > 33.4 ? '#ff6b6b' : iv > 20 ? '#ffd166' : '#49d0ff';
      sctx.fillRect(x, h - bh, 2, bh);
      sctx.fillStyle = 'rgba(255,255,255,.45)';             // the CPU share of that frame
      sctx.fillRect(x, h - Math.min(h, (cp / top) * h), 2, 1);
    }
  }

  function setVisible(v) {
    visible = !!v;
    box.style.display = visible ? 'block' : 'none';
    if (visible) paint();
  }

  // Y, because F is already "flat sea" here. Match on code AND key:
  // synthesised events often carry only one of them.
  doc.addEventListener('keydown', (e) => {
    if (e.code === 'KeyY' || (e.key && e.key.toLowerCase() === 'y')) setVisible(!visible);
  });

  function reset() { idx = 0; filled = 0; prevStart = 0; }

  return { frameStart, frameEnd, snapshot, reset, setVisible, boot,
           get visible() { return visible; } };
}
