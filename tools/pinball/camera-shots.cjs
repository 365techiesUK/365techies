/* 365 Pinball Hero - pictures of the camera director (16 Oct 2026, next-gen wave 2): serves the worktree on
 * 127.0.0.1 (py -m http.server, stopped by its PID), opens tools/pinball/camera-preview.html in headless Edge
 * (playwright-core from the launch-reel project, --use-angle=d3d11) at chosen moments and saves a PNG of each.
 *
 *   node tools/pinball/camera-shots.cjs <out dir> [port=8491] [name=query ...]
 *
 * Without name=query pairs it takes one picture of each state on seed 3 (calm, aspect 0.5). */
'use strict';
const path = require('path'), fs = require('fs'), { spawn } = require('child_process'), http = require('http');
const pw = require('D:/claude/365-techies-website-launch-reel/node_modules/playwright-core');
const ROOT = path.join(__dirname, '..', '..');
const out = process.argv[2] || path.join(ROOT, 'camera-shots');
const port = +(process.argv[3] || 8491);
let shots = process.argv.slice(4).map((a) => { const i = a.indexOf('='); return [a.slice(0, i), a.slice(i + 1)]; });
if (!shots.length) shots = [
  ['home', 'seed=3&at=900'], ['launch', 'seed=3&find=launch&after=20'], ['launch2', 'seed=3&find=launch2&after=10'],
  ['follow', 'seed=3&find=follow&after=20'], ['closeup', 'seed=3&find=closeup&after=60'], ['rail', 'seed=3&find=rail&after=8'],
  ['drain', 'seed=3&find=drain&after=4'], ['back', 'seed=3&find=back&after=6']
];
function up(url) { return new Promise((res) => { http.get(url, (r) => { r.resume(); res(r.statusCode === 200); }).on('error', () => res(false)); }); }
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const srv = spawn('py', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore', windowsHide: true });
  const base = 'http://127.0.0.1:' + port + '/tools/pinball/camera-preview.html';
  try {
    for (let i = 0; i < 50 && !(await up(base)); i++) await new Promise((r) => setTimeout(r, 200));
    const browser = await pw.chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11'] });
    const page = await browser.newPage({ viewport: { width: 1100, height: 790 } });
    const errs = [];
    page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
    page.on('pageerror', (e) => errs.push(String(e)));
    for (const [name, q] of shots) {
      await page.goto(base + '?' + q);
      await page.waitForFunction(() => window.READY === true, null, { timeout: 120000 });
      const file = path.join(out, 'camera-' + name + '.png');
      await page.screenshot({ path: file });
      const txt = await page.textContent('#info');
      console.log(file, '|', txt.split('\n')[0], '|', (txt.split('\n').find((l) => /look-aheads/.test(l)) || '').trim());
    }
    if (errs.length) console.log('console:', errs.slice(0, 5).join(' | '));
    await browser.close();
  } finally {
    try { process.kill(srv.pid); } catch (e) { /* gone */ }
    spawn('taskkill', ['/PID', String(srv.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
  }
})().catch((e) => { console.error(e); process.exit(1); });
