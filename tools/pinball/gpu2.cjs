/* Headless test browsers on the SECOND graphics card (5 Nov 2026; owner, 4 Nov: "move the test to the second GPU. That's
 * why we've got two graphics cards"): the first card drives the screens, and test runs on it made video stutter.
 * require('./gpu2.cjs')() -> ['--use-adapter-luid=high,low'] for the card with no display, or [] when there is no second
 * card. The same per-boot cache and finder script as D:/claude/smashbay/tools/gpu.mjs (LUIDs change at every restart). */
'use strict';
const { execSync } = require('child_process'), fs = require('fs'), os = require('os');
const CACHE = os.tmpdir() + '/smashbay-second-gpu.json';
module.exports = function gpuArgs() {
  const boot = Math.round((Date.now() - os.uptime() * 1000) / 60000);   // (minutes: the boot time, give or take)
  try { const c = JSON.parse(fs.readFileSync(CACHE, 'utf8')); if (Math.abs(c.boot - boot) <= 2) return c.luid ? ['--use-adapter-luid=' + c.luid] : []; } catch (e) { /* no cache yet */ }
  let luid = '';
  try { luid = execSync('powershell -NoProfile -ExecutionPolicy Bypass -File D:/claude/smashbay/tools/second_gpu.ps1', { encoding: 'utf8', timeout: 30000 }).trim(); } catch (e) { /* no second card: the default one */ }
  if (!/^-?\d+,\d+$/.test(luid)) luid = '';
  try { fs.writeFileSync(CACHE, JSON.stringify({ boot, luid })); } catch (e) { /* (read-only temp) */ }
  return luid ? ['--use-adapter-luid=' + luid] : [];
};
