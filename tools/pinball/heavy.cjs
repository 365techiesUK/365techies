/* 365 Pinball Hero - two shared slots for heavy test runs (5 Nov 2026, the wave 3 build). Several build lanes share this
 * PC and its second graphics card, and a farm or a headless browser run beside two others gives false timing failures.
 *
 *   node tools/pinball/heavy.cjs <label> <command> [args...]
 *
 * waits for one of two slots (folders under D:/claude/retro-rebooted/pinball-build/locks/), runs the command with its
 * output passed straight through, frees the slot and exits with the command's own exit code. A slot whose owner process
 * has gone, or that is older than 40 minutes, is taken over. HEAVY_SLOTS and HEAVY_DIR override the defaults; after
 * HEAVY_WAIT minutes (default 30) of waiting it gives up with exit code 75. */
'use strict';
const fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const DIR = process.env.HEAVY_DIR || 'D:/claude/retro-rebooted/pinball-build/locks';
const SLOTS = +process.env.HEAVY_SLOTS || 2, STALE = 40 * 60 * 1000, WAIT = (+process.env.HEAVY_WAIT || 30) * 60 * 1000;
const [label, cmd, ...args] = process.argv.slice(2);
if (!label || !cmd) { console.error('usage: node tools/pinball/heavy.cjs <label> <command> [args...]'); process.exit(2); }
fs.mkdirSync(DIR, { recursive: true });

function alive(pid) { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } }
function take() {
  for (let i = 1; i <= SLOTS; i++) {
    const slot = path.join(DIR, 'slot' + i), own = path.join(slot, 'owner.json');
    try { fs.mkdirSync(slot); fs.writeFileSync(own, JSON.stringify({ label, pid: process.pid, t: Date.now() })); return slot; } catch (e) { /* taken */ }
    try {
      const o = JSON.parse(fs.readFileSync(own, 'utf8'));
      if (!alive(o.pid) || Date.now() - o.t > STALE) fs.rmSync(slot, { recursive: true, force: true });   // the next look takes it
    } catch (e) {
      try { if (Date.now() - fs.statSync(slot).mtimeMs > 60000) fs.rmSync(slot, { recursive: true, force: true }); } catch (e2) { /* gone */ }
    }
  }
  return null;
}

const t0 = Date.now();
let told = 0;
(function look() {
  const slot = take();
  if (!slot) {
    if (Date.now() - t0 > WAIT) { console.error('[heavy] ' + label + ': no free slot after ' + Math.round(WAIT / 60000) + ' min'); process.exit(75); }
    if (Date.now() - told > 60000) { told = Date.now(); console.error('[heavy] ' + label + ': waiting for a free slot...'); }
    return setTimeout(look, 5000);
  }
  const free = () => { try { fs.rmSync(slot, { recursive: true, force: true }); } catch (e) { /* already freed */ } };
  const node = /^node(\.exe)?$/i.test(cmd);   // node itself runs without a shell, so arguments keep their spaces
  const child = spawn(node ? process.execPath : cmd, args, { stdio: 'inherit', shell: !node && process.platform === 'win32' });
  process.on('SIGINT', () => { child.kill(); free(); process.exit(130); });
  process.on('SIGTERM', () => { child.kill(); free(); process.exit(143); });
  child.on('error', (e) => { console.error('[heavy] ' + label + ': ' + e.message); free(); process.exit(1); });
  child.on('exit', (code) => { free(); process.exit(code == null ? 1 : code); });
})();
