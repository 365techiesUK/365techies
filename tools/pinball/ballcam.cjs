/* 365 Pinball Hero - the BALL-CAM test clip (29 Oct 2026), never deployed. The most-viewed pinball Short on YouTube is a
 * camera riding inside a real machine (61M views); our 3D table can do that for free. Drives tools/pinball/stills3d.html
 * (headless Chrome, the high tier) and chases the ball from above and behind (clear of the walls and toys), looking where the ball is
 * going (its velocity, smoothed), pulling up and back when it is fast, circling it slowly while it is held. It starts a
 * few seconds before a crater catch (the pilot playing Ember Peak) so the clip has the dive, the sky carry and the wire
 * rail. Writes ballcam.mp4 (1080 x 1920, 30 fps, 18 s) and a contact sheet ballcam-sheet.jpg.
 *
 *   node tools/pinball/ballcam.cjs [--out DIR] [--port 8492] [--secs 18]
 *
 * Serves the repository itself (py -m http.server, stopped by its PID). Needs ffmpeg on the PATH. */
'use strict';
const path = require('path');
const fs = require('fs');
const { spawn, execFileSync } = require('child_process');
const { chromium } = require(process.env.PLAYWRIGHT || 'D:/claude/365-techies-website-launch-reel/node_modules/playwright-core');
const A = process.argv.slice(2), arg = (k, d) => { const i = A.indexOf('--' + k); return i >= 0 ? A[i + 1] : d; };
const OUT = path.resolve(arg('out', 'D:/claude/retro-rebooted/pinball-ember/ballcam'));
const PORT = +arg('port', 8492), SECS = +arg('secs', 18), ROOT = path.resolve(__dirname, '../..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const srv = spawn('py', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore', windowsHide: true });
  const stop = () => { try { execFileSync('taskkill', ['/PID', String(srv.pid), '/T', '/F'], { stdio: 'ignore' }); } catch (e) {} };
  try {
    for (let i = 0; i < 60; i++) { try { if ((await fetch('http://127.0.0.1:' + PORT + '/tools/pinball/stills3d.html')).ok) break; } catch (e) {} await sleep(150); }
    let browser = null;
    for (const exe of [process.env.BROWSER, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].filter(Boolean)) {
      try { browser = await chromium.launch({ headless: true, executablePath: exe, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-webgl'] }); break; } catch (e) {}
    }
    if (!browser) throw new Error('no headless browser would start');
    const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
    const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
    await page.goto('http://127.0.0.1:' + PORT + '/tools/pinball/stills3d.html?table=ember&cam=arcade&tier=high&w=1080&h=1920&frame=2');
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
    const m = await page.evaluate(() => S3.findMoment('craterclip'));
    if (!m) throw new Error('no crater moment found');
    await page.evaluate(([f, s]) => S3.goTo(f, 30, s), [Math.max(60, m.frame - 300), m.seed]);
    // the ball-cam, in the page: smoothed heading, speed-dependent pull-back, a slow orbit while held
    await page.evaluate(() => {
      const st = { shot: 'table', cutAt: 0, hx: 0, hy: -1, ex: null, ey: 0, ez: 0, lx: 0, ly: 0, lz: 0, t: 0, orbit: 0 };
      const mix = (a, b, k) => a + (b - a) * k, clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
      window.BC = function () {
        const W = S3.W, b = W.balls && W.balls[0];
        S3.step(); S3.step();
        st.t += 1000 / 30;
        if (!b) { S3.world.setCam(null); S3.render(st.t); return 'none'; }
        const vx = b.vx || 0, vy = b.vy || 0, sp = Math.hypot(vx, vy), held = b.m === 'held' || sp < 40;
        // the director (polish, 29 Oct 2026): the normal arcade camera low on the table (no walls in the lens near the
        // flippers, and the player sees the save), the ball-cam up top, in the crater and on the rail; each shot held 0.8 s+
        const want = b.m === 'held' || b.m === 'ramp' || b.y < 300 ? 'ball' : 'table';
        if (want !== st.shot && st.t - (st.cutAt || 0) > 800) { st.shot = want; st.cutAt = st.t; if (want === 'ball') st.ex = null; }
        if (st.shot === 'table') { S3.world.setCam(null); S3.render(st.t); return 'table'; }
        const bz = b.at === 'crater' ? 48 : b.m === 'ramp' ? (b.z || 0) : 0;   // the crater's pool is 48 up (camera.js craterZ)
        if (!held) { const k = clamp(sp / 2500, 0.04, 0.16); st.hx = mix(st.hx, vx / sp, k); st.hy = mix(st.hy, vy / sp, k); const n = Math.hypot(st.hx, st.hy) || 1; st.hx /= n; st.hy /= n; }
        else st.orbit += 0.018;
        let hx = st.hx, hy = st.hy;
        if (held) { const c = Math.cos(st.orbit), s = Math.sin(st.orbit); hx = st.hx * c - st.hy * s; hy = st.hx * s + st.hy * c; }
        const back = held ? 85 : 62 + clamp(sp / 45, 0, 30), up = held ? 60 : 42 + clamp(sp / 90, 0, 22);   // a chase cam: above the walls and toys, never inside them
        const ex = clamp(b.x - hx * back, 30, 240), ey = clamp(b.y - hy * back, 12, 470), ez = bz + up;
        const lx = b.x + hx * 18, ly = b.y + hy * 18, lz = bz + 2;
        if (st.ex == null) Object.assign(st, { ex, ey, ez, lx, ly, lz });
        const k = held ? 0.08 : 0.3;
        st.ex = mix(st.ex, ex, k); st.ey = mix(st.ey, ey, k); st.ez = mix(st.ez, ez, k);
        st.lx = mix(st.lx, lx, 0.4); st.ly = mix(st.ly, ly, 0.4); st.lz = mix(st.lz, lz, 0.4);
        S3.world.setCam({ eye: [st.ex, st.ey, st.ez], look: [st.lx, st.ly, st.lz], fov: 58 });
        S3.render(st.t);
        return 'ball:' + b.m + (b.at ? ':' + b.at : '');
      };
    });
    const dir = path.join(OUT, '_frames'); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
    const n = Math.round(SECS * 30), states = {};
    for (let i = 0; i < n; i++) {
      const s = await page.evaluate(() => window.BC());
      states[s] = (states[s] || 0) + 1;
      await page.locator('#frame').screenshot({ path: path.join(dir, 'f' + String(i).padStart(4, '0') + '.jpg'), type: 'jpeg', quality: 93 });
    }
    await browser.close();
    const out = path.join(OUT, 'ballcam.mp4');
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '30', '-i', path.join(dir, 'f%04d.jpg'), '-vf', 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out]);
    const picks = [0.1, 0.25, 0.4, 0.55, 0.7, 0.85].map((f) => path.join(dir, 'f' + String(Math.floor(n * f)).padStart(4, '0') + '.jpg'));
    const inArgs = []; picks.forEach((p) => inArgs.push('-i', p));
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...inArgs, '-filter_complex', picks.map((_, i) => '[' + i + ':v]scale=360:-2[s' + i + ']').join(';') + ';' + picks.map((_, i) => '[s' + i + ']').join('') + 'hstack=inputs=' + picks.length, path.join(OUT, 'ballcam-sheet.jpg')]);
    fs.rmSync(dir, { recursive: true, force: true });
    console.log('ballcam.mp4', (fs.statSync(out).size / 1048576).toFixed(1), 'MB | moment', JSON.stringify(m), '| ball states', JSON.stringify(states), '| errors', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
  } finally { stop(); }
})().catch((e) => { console.error(e); process.exit(1); });
