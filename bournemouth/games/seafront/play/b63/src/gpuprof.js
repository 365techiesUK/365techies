/**
 * GPU PASS TIMER - ?perf=2 (27 Sep 2026).
 *
 * The Customer jobs session measured the owner's Dell Latitude 3520 (Intel Iris Xe,
 * one memory stick) at 5 fps with ?perf=1: ~180 ms a frame waiting on the GPU,
 * 17.8 ms of our own JS. ?perf=1 can only say "the GPU"; this says WHICH PASS.
 *
 * The frame is cut into named sections by mark(name) calls (renderer.js draw(),
 * main.js frame()); each section is timed on the GPU, and the perf panel shows
 * the average of each over the last ~2 s, plus their total.
 *
 *   timer   EXT_disjoint_timer_query_webgl2: one TIME_ELAPSED query per section,
 *           read back a few frames later. Costs nothing measurable and does not
 *           change the frame. Results from a frame the driver flags as disjoint
 *           (a clock change, a context switch) are thrown away.
 *   finish  the fallback where the extension is not exposed: gl.finish() at every
 *           section boundary and the wall time between them. That SERIALISES the
 *           frame - the fps shown drops - but each section's time is then its own.
 *
 * Off (a no-op object with the same methods) unless the page is opened with
 * ?perf=2. Nothing here draws, and nothing reads the sim.
 * Harness: globalThis.__gprof.report() -> { mode, frames, passes: {name: ms}, total }.
 */

const WIN = 120;          // frames averaged (~2 s at 60 fps, 24 s at 5)

export function createGpuProf(gl, on) {
  const off = { on: false, mark() {}, frameEnd() {}, report() { return null; }, lines() { return []; } };
  if (!on || !gl) return off;

  const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
  const mode = ext ? 'timer' : 'finish';
  const order = [];                 // section names in first-seen order
  const hist = new Map();           // name -> Float32Array ring of per-frame ms
  let frames = 0;

  function push(frameMs) {          // frameMs: Map name -> ms for ONE frame
    for (const [name, ms] of frameMs) {
      if (!hist.has(name)) { hist.set(name, { a: new Float32Array(WIN), n: 0, i: 0 }); order.push(name); }
      const h = hist.get(name);
      h.a[h.i] = ms; h.i = (h.i + 1) % WIN; if (h.n < WIN) h.n += 1;
    }
    // a section that did not run this frame counts as 0 (underwater, a level's actors)
    for (const [name, h] of hist) if (!frameMs.has(name)) { h.a[h.i] = 0; h.i = (h.i + 1) % WIN; if (h.n < WIN) h.n += 1; }
    frames += 1;
  }

  // ---- timer queries ------------------------------------------------------------
  const pool = [];
  let cur = null;                   // { name, q } active
  let frameQ = [];                  // this frame's sections
  const pending = [];               // earlier frames awaiting results
  function take() { return pool.pop() || gl.createQuery(); }

  // ---- finish fallback --------------------------------------------------------
  let fName = null, fT = 0, fMap = new Map();

  function mark(name) {
    if (mode === 'timer') {
      if (cur) gl.endQuery(ext.TIME_ELAPSED_EXT);
      cur = { name, q: take() };
      gl.beginQuery(ext.TIME_ELAPSED_EXT, cur.q);
      frameQ.push(cur);
    } else {
      gl.finish();
      const now = performance.now();
      if (fName) fMap.set(fName, (fMap.get(fName) || 0) + (now - fT));
      fName = name; fT = now;
    }
  }

  function frameEnd() {
    if (mode === 'timer') {
      if (cur) { gl.endQuery(ext.TIME_ELAPSED_EXT); cur = null; }
      if (frameQ.length) pending.push(frameQ);
      frameQ = [];
      // Oldest first: a frame's results come back together or not at all.
      while (pending.length) {
        const f = pending[0];
        const last = f[f.length - 1].q;
        if (!gl.getQueryParameter(last, gl.QUERY_RESULT_AVAILABLE)) break;
        pending.shift();
        const disjoint = gl.getParameter(ext.GPU_DISJOINT_EXT);
        const m = new Map();
        for (const s of f) {
          if (!disjoint) m.set(s.name, (m.get(s.name) || 0) + gl.getQueryParameter(s.q, gl.QUERY_RESULT) / 1e6);
          pool.push(s.q);
        }
        if (!disjoint) push(m);
      }
      if (pending.length > 30) { for (const f of pending.splice(0, pending.length - 30)) for (const s of f) pool.push(s.q); }
    } else {
      if (fName) { gl.finish(); fMap.set(fName, (fMap.get(fName) || 0) + (performance.now() - fT)); }
      if (fMap.size) push(fMap);
      fMap = new Map(); fName = null;
    }
  }

  function report() {
    const passes = {};
    let total = 0;
    for (const name of order) {
      const h = hist.get(name);
      let s = 0; for (let k = 0; k < h.n; k++) s += h.a[k];
      const ms = h.n ? s / h.n : 0;
      passes[name] = +ms.toFixed(2); total += ms;
    }
    return { mode, frames, passes, total: +total.toFixed(2) };
  }

  // For the perf panel: one line per section, biggest first.
  function lines() {
    const r = report();
    if (!r.frames) return [`gpu passes (${mode}): waiting for results`];
    const rows = Object.entries(r.passes).sort((a, b) => b[1] - a[1]);
    return [`gpu passes (${mode}, ${Math.min(r.frames, WIN)} fr)  total ${r.total.toFixed(1)} ms`,
      ...rows.map(([n, ms]) => `  ${n.padEnd(10)} ${ms.toFixed(2).padStart(7)} ms  ${r.total > 0 ? ((ms / r.total) * 100).toFixed(0).padStart(3) : '  0'}%`)];
  }

  return { on: true, mode, mark, frameEnd, report, lines };
}
