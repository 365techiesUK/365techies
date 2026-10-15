/* 365 Pinball Hero - the camera stills (milestone 2a, 15 Oct 2026), never deployed. Drives tools/pinball/stills3d.html in
 * headless Edge (WebGL on the graphics card through ANGLE/D3D11) and writes, for each camera tilt, a 1080 x 1920 still
 * at one lively moment (a ball up on the warp ramp, lamps lit), a 10-second 30 fps clip of the same play (full size,
 * and a phone copy under 6 MB), a side-by-side compare.jpg, and a check that the ball is never hidden at that angle.
 *
 *   node tools/pinball/stills3d.cjs [--out DIR] [--tilts 20,35,50] [--seed N --frame F] [--quick] [--no-check] [--port 8491]
 *   node tools/pinball/stills3d.cjs --fill [--tilts 28] ...   the game's own close "fill" framing (the default view on the
 *     page): files fill-still-28.png, fill-clip-28.mp4 ...; --tilts defaults to 28, the game's own (FILL_TILT).
 *
 * --quick: stills only (no clips). Without --seed/--frame it searches seeds for the moment first. It serves the repository
 * itself (py -m http.server, stopped by its PID at the end). Run from the repository root. Needs ffmpeg on the PATH;
 * Playwright is borrowed from another project on this PC (PLAYWRIGHT env var to point elsewhere). */
'use strict';
const path = require('path');
const fs = require('fs');
const { spawn, execFileSync } = require('child_process');
const PW = process.env.PLAYWRIGHT || 'D:/claude/365-techies-website-launch-reel/node_modules/playwright-core';
const { chromium } = require(PW);
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const ROOT = path.resolve(__dirname, '../..');

const A = process.argv.slice(2), arg = (k, d) => { const i = A.indexOf('--' + k); return i >= 0 ? A[i + 1] : d; }, flag = (k) => A.includes('--' + k);
const OUT = path.resolve(arg('out', 'D:/claude/retro-rebooted/pinball-m2a'));
const FILLV = flag('fill'), PRE = FILLV ? 'fill-' : '';
const TILTS = arg('tilts', FILLV ? '28' : '20,35,50').split(',').map(Number);
const PORT = +arg('port', 8491), FOV = arg('fov', '');
const LETTER = { 20: 'A', 35: 'B', 50: 'C' };
const CLIP_HALF = 300;   // sim steps either side of the moment (60 a second): 10 seconds in all

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
async function serve() {
  const srv = spawn('py', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore', windowsHide: true });
  for (let i = 0; i < 50; i++) {
    try { const r = await fetch(`http://127.0.0.1:${PORT}/tools/pinball/stills3d.html`); if (r.ok && /3D stills bench/.test(await r.text())) return srv; } catch (e) {}
    await sleep(150);
  }
  stop(srv); throw new Error('port ' + PORT + ' is busy or not serving this repository: pass --port');
}
function stop(srv) { try { execFileSync('taskkill', ['/PID', String(srv.pid), '/T', '/F'], { stdio: 'ignore' }); } catch (e) {} }

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const srv = await serve();
  const browser = await chromium.launch({ executablePath: EDGE, headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-webgl'] });
  const report = { when: new Date().toISOString(), tilts: {} };
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
    const url = (q) => `http://127.0.0.1:${PORT}/tools/pinball/stills3d.html?${q}`;
    const open = async (q) => {
      const t0 = Date.now();
      await page.goto(url(q));
      try { await page.waitForFunction(() => window.__ready === true, null, { timeout: +(process.env.READY_MS || 120000) }); }
      catch (e) { console.error('page never got ready:', errors.join(' | ')); throw e; }
      return Date.now() - t0;
    };

    // 1. the moment
    let seed = +arg('seed', 0), frame = +arg('frame', 0);
    const loadMs = await open('tilt=35&seed=1&frame=2');
    report.gpu = await page.evaluate(() => S3.gpu());
    report.have = await page.evaluate(() => S3.have);
    report.stats = await page.evaluate(() => window.__stats);
    report.pageLoadMs = loadMs;
    if (!seed || !frame) {
      const m = await page.evaluate(() => S3.findMoment());
      if (!m) throw new Error('no lively moment found');
      seed = m.seed; frame = m.frame; report.moment = m;
    }
    report.seed = seed; report.frame = frame;
    console.log('gpu:', report.gpu, '| art:', report.stats.art, '| lamps:', report.stats.lamps, '| build ms:', report.stats.buildMs, '| page load ms:', loadMs);
    console.log('moment: seed', seed, 'frame', frame, report.moment ? JSON.stringify(report.moment) : '');

    const tmp = process.env.STILLS_TMP || path.join(OUT, '_frames');
    for (const tilt of TILTS) {
      const q = `tilt=${tilt}&seed=${seed}&frame=${frame}` + (FOV ? `&fov=${FOV}` : '') + (FILLV ? '&fill=1' : '');
      const R = report.tilts[tilt] = {};
      R.loadMs = await open(q);
      const still = path.join(OUT, `${PRE}still-${tilt}.png`);
      await page.locator('#frame').screenshot({ path: still });
      R.stats = await page.evaluate(() => S3.world.stats());
      console.log(`${PRE}still-${tilt}.png  (load ${R.loadMs} ms, ${R.stats.calls} draw calls, ${R.stats.triangles} triangles)`);

      if (!flag('no-check')) {
        R.bench = await page.evaluate(() => S3.bench(180));
        const pts = await page.evaluate(() => { window.__pts = window.__pts || S3.samplePositions(6, 5400); return window.__pts.length; });
        const hid = await page.evaluate(() => S3.visibility(window.__pts));
        R.positions = pts; R.hidden = hid.length; R.hiddenList = hid.slice(0, 40);
        R.shots = await page.evaluate(() => S3.shotCheck());
        const hiddenShots = Object.keys(R.shots).filter((k) => R.shots[k] !== 'visible');
        console.log(`  frame ${R.bench.avg} ms avg / ${R.bench.p95} ms p95 (${R.bench.calls} calls) | ball hidden at ${hid.length} of ${pts} places | shots hidden: ${hiddenShots.length ? hiddenShots.join(', ') : 'none'}`);
        if (hid.length) console.log('  hidden at:', hid.slice(0, 12).map((h) => `(${h.x},${h.y}${h.z ? ',z' + h.z : ''}) by ${h.by}`).join('; '));
      }

      if (!flag('quick')) {
        const dir = path.join(tmp, String(tilt));
        fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
        const start = Math.max(40, frame - CLIP_HALF);
        await page.evaluate((s) => S3.goTo(s, 40), start);
        const t0 = Date.now();
        for (let i = 0; i < CLIP_HALF; i++) {
          await page.evaluate(() => S3.advance(2, true));
          await page.locator('#frame').screenshot({ path: path.join(dir, 'f' + String(i).padStart(4, '0') + '.jpg'), type: 'jpeg', quality: 93 });
        }
        R.captureSec = Math.round((Date.now() - t0) / 1000);
        const full = path.join(OUT, `${PRE}clip-${tilt}.mp4`), phone = path.join(OUT, `${PRE}clip-${tilt}-phone.mp4`);
        execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '30', '-i', path.join(dir, 'f%04d.jpg'), '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-maxrate', '14M', '-bufsize', '28M', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', full]);
        execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '30', '-i', path.join(dir, 'f%04d.jpg'), '-vf', 'scale=720:1280:flags=lanczos', '-c:v', 'libx264', '-preset', 'slow', '-crf', '21', '-maxrate', '4M', '-bufsize', '8M', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', phone]);
        R.clipMB = +(fs.statSync(full).size / 1048576).toFixed(1); R.phoneMB = +(fs.statSync(phone).size / 1048576).toFixed(1);
        fs.rmSync(dir, { recursive: true, force: true });
        console.log(`  ${PRE}clip-${tilt}.mp4 ${R.clipMB} MB, ${PRE}clip-${tilt}-phone.mp4 ${R.phoneMB} MB (captured in ${R.captureSec} s)`);
      }
    }
    try { fs.rmdirSync(tmp); } catch (e) {}

    // 2. the three side by side
    const imgs = TILTS.map((t) => 'data:image/png;base64,' + fs.readFileSync(path.join(OUT, `${PRE}still-${t}.png`)).toString('base64'));
    const labels = TILTS.map((t) => (LETTER[t] || '') + ' ' + t + '\u00b0');
    const jpg = await page.evaluate(async ([imgs, labels]) => {
      const W = 540, Hh = 960, BAND = 70, GAP = 12, c = document.createElement('canvas');
      c.width = imgs.length * W + (imgs.length + 1) * GAP; c.height = Hh + BAND + GAP; const g = c.getContext('2d');
      g.fillStyle = '#0b0b10'; g.fillRect(0, 0, c.width, c.height);
      for (let i = 0; i < imgs.length; i++) {
        const im = new Image(); im.src = imgs[i]; await im.decode();
        const x = GAP + i * (W + GAP); g.imageSmoothingQuality = 'high'; g.drawImage(im, x, BAND, W, Hh);
        g.fillStyle = '#ffffff'; g.font = 'bold 44px Segoe UI, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(labels[i], x + W / 2, BAND / 2 + 2);
      }
      for (const q of [0.88, 0.8, 0.7, 0.6]) { const d = c.toDataURL('image/jpeg', q); if (d.length * 0.75 < 1.45 * 1048576) return d; }
      return c.toDataURL('image/jpeg', 0.5);
    }, [imgs, labels]);
    fs.writeFileSync(path.join(OUT, PRE + 'compare.jpg'), Buffer.from(jpg.split(',')[1], 'base64'));
    report.compareKB = Math.round(fs.statSync(path.join(OUT, PRE + 'compare.jpg')).size / 1024);
    report.errors = errors.slice(0, 20);
    if (errors.length) console.log('page messages:', errors.slice(0, 8).join(' | '));
    fs.writeFileSync(path.join(OUT, PRE + 'stills3d-report.json'), JSON.stringify(report, null, 1));
    console.log('compare.jpg', report.compareKB, 'KB; report in', path.join(OUT, PRE + 'stills3d-report.json'));
  } finally {
    await browser.close();
    stop(srv);
  }
})().catch((e) => { console.error(e); process.exit(1); });
