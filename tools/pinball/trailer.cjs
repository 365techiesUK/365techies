/* 365 Pinball Hero - the EMBER PEAK TRAILER (30 Oct 2026, wave 2, owner: "look like the most-watched digital pinball on
 * YouTube"), never deployed. One continuous take, no cuts (the owner rejected fast cameras): the game plays all the way
 * through (the pilot, Ember Peak, the high tier, the games room on) while the camera makes only slow eased moves:
 *   (a) an establishing drift across the games room to the cabinet (room wide -> hero),
 *   (b) a slow push onto the backglass and topper, then a tilt and crane down onto the table to the player-eye home,
 *   (c) play at home with ballcam.cjs's calm moves: a push towards the crater for the catch, a follow of the sky carry and
 *       the wire rail from over the middle of the table,
 *   (d) the big moment: that crater catch is a FULL ERUPTION (full pressure, the lava gates rise), found by scanning seeds,
 *   and a slow pull back out to the cabinet in the room to end on.
 * The game's own sounds are rendered offline frame by frame, as in ballcam.cjs. Writes trailer.mp4 (1080 x 1920, 30 fps),
 * trailer.wav and trailer-sheet.jpg (a 2 x 6 contact sheet).
 *
 *   node tools/pinball/trailer.cjs [--out DIR] [--port 8496] [--lead 13] [--probe]   (--probe: every 15th frame only, no video)
 *
 * Serves the repository itself (py -m http.server, stopped by its PID). Needs ffmpeg on the PATH. */
'use strict';
const path = require('path');
const fs = require('fs');
const { spawn, execFileSync } = require('child_process');
const { chromium } = require(process.env.PLAYWRIGHT || 'D:/claude/365-techies-website-launch-reel/node_modules/playwright-core');
const A = process.argv.slice(2), arg = (k, d) => { const i = A.indexOf('--' + k); return i >= 0 ? A[i + 1] : d; }, flag = (k) => A.includes('--' + k);
const OUT = path.resolve(arg('out', 'D:/claude/retro-rebooted/pinball-ember/w2'));
const PORT = +arg('port', 8496), LEAD = +arg('lead', 13), PROBE = flag('probe'), ROOT = path.resolve(__dirname, '../..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const srv = spawn('py', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore', windowsHide: true });
  const stop = () => { try { execFileSync('taskkill', ['/PID', String(srv.pid), '/T', '/F'], { stdio: 'ignore' }); } catch (e) {} };
  try {
    for (let i = 0; i < 60; i++) { try { if ((await fetch('http://127.0.0.1:' + PORT + '/tools/pinball/stills3d.html')).ok) break; } catch (e) {} await sleep(150); }
    let browser = null;
    for (const exe of [process.env.BROWSER, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].filter(Boolean)) {
      try { browser = await chromium.launch({ headless: true, executablePath: exe, args: [...require('./gpu2.cjs')(), '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-webgl'] }); break; } catch (e) {}
    }
    if (!browser) throw new Error('no headless browser would start');
    const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
    const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
    await page.goto('http://127.0.0.1:' + PORT + '/tools/pinball/stills3d.html?table=ember&cam=home&home=calm&tier=high&w=1080&h=1920&frame=2' + arg('q', ''));
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
    // the big moment: a crater catch at full pressure (the engine's 'lavaopen'), one ball, no drain from LEAD s before it to 10 s after
    const m = await page.evaluate((lead) => {
      const E = window.PinEngine, L = Math.round(lead * 60), bot = (W) => (window.PinPilot ? PinPilot.input(W) : {});
      for (let seed = 1; seed <= 60; seed++) {
        const W = E.newWorld(2, {}, seed, 'ember'), drains = [], hits = [];
        for (let f = 1; f <= 16000 && !W.over; f++) {
          E.step(W, bot(W));
          for (const e of W.events) { if (e === 'drain') drains.push(f); if (e === 'lavaopen' && f > L + 30 && W.balls.length === 1) hits.push(f); }
          W.events.length = 0;
          if (hits.length && f > hits[0] + 600) break;
        }
        for (const h of hits) if (!drains.some((d) => d > h - L - 30 && d < h + 600)) return { seed, frame: h, drains: drains.length };
      }
      return null;
    }, LEAD);
    if (!m) throw new Error('no full eruption found');
    console.log('full eruption: seed', m.seed, 'frame', m.frame);
    await page.evaluate(([f, s]) => { S3.world.setRoom(true); S3.goTo(f, 30, s); }, [m.frame - Math.round(LEAD * 60), m.seed]);
    // the game's own sounds, exactly as ballcam.cjs: sound.js into an OfflineAudioContext on the clip's clock
    await page.addScriptTag({ url: '/games/pinball/sound.js' });
    await page.evaluate((secs) => {
      const SR = 48000, OA = new OfflineAudioContext(2, Math.ceil(SR * (secs + 1.5)), SR), A = { t: 0 };
      const ctx = new Proxy(OA, { get: (o, k) => (k === 'currentTime' ? A.t : typeof o[k] === 'function' ? o[k].bind(o) : o[k]) });
      const comp = OA.createDynamicsCompressor(); comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2;
      const BUS = OA.createGain(); BUS.gain.value = 0.9; BUS.connect(comp); comp.connect(OA.destination);
      let s = 9; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647) * 2 - 1;
      const room = OA.createConvolver(), len = Math.floor(SR * 1.6), ir = OA.createBuffer(2, len, SR);
      for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = rnd() * Math.pow(1 - i / len, 2.6); }
      room.buffer = ir; const VERB = OA.createGain(); VERB.gain.value = 0.32; VERB.connect(room); room.connect(BUS);
      const NOISE = OA.createBuffer(1, Math.floor(SR * 1.5), SR); { const d = NOISE.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = rnd(); }
      const route = (node, o) => { let out = node; if (o.pan) { const p = OA.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, o.pan)); node.connect(p); out = p; } out.connect(BUS); if (o.verb) { const g = OA.createGain(); g.gain.value = o.verb; out.connect(g); g.connect(VERB); } };
      const KIT = {
        tone(freq, dur, gain, o) { o = o || {}; const t = A.t + (o.when || 0), os = OA.createOscillator(), gn = OA.createGain(); os.type = o.type || 'square'; os.frequency.setValueAtTime(freq, t); if (o.detune) os.detune.setValueAtTime(o.detune, t); if (o.to) os.frequency.exponentialRampToValueAtTime(o.to, t + dur); gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(gain, t + (o.attack || 0.01)); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur); os.connect(gn); route(gn, o); os.start(t); os.stop(t + dur + 0.03); },
        noise(dur, gain, freq, o) { o = o || {}; const t = A.t + (o.when || 0), sr = OA.createBufferSource(), f = OA.createBiquadFilter(), gn = OA.createGain(); sr.buffer = NOISE; f.type = o.type || 'lowpass'; if (o.q) f.Q.value = o.q; f.frequency.setValueAtTime(freq || 3000, t); f.frequency.exponentialRampToValueAtTime(o.to || 120, t + dur); gn.gain.setValueAtTime(gain, t); gn.gain.exponentialRampToValueAtTime(0.0008, t + dur); sr.connect(f); f.connect(gn); route(gn, o); sr.start(t, (rnd() + 1) * 0.15); sr.stop(t + dur + 0.03); },
        ctx: () => ctx, existing: () => ctx, bus: () => BUS
      };
      const pfx = window.PinFX && PinFX.events ? PinFX.events.bind(PinFX) : null, counts = {};
      window.PinFX.events = function (W, ev) {
        for (const e of ev) { const n = typeof e === 'string' ? e : e && e.sfx; if (!n) continue; counts[n] = (counts[n] || 0) + 1; if (e === 'lavaopen') window.__erupted = A.t; if (e === 'railout' && window.__erupted != null) window.__railout = A.t; try { PinSound.sound(n, KIT, typeof e === 'string' ? undefined : e, W); } catch (x) {} }
        return pfx ? pfx(W, ev) : undefined;
      };
      window.AUD = { A, KIT, OA, counts, frame: () => { try { PinSound.frame(S3.W, KIT, 'play', { sound: true }); } catch (x) {} },
        async render(n) {
          const buf = await OA.startRendering(), L = buf.getChannelData(0), R = buf.getChannelData(1); n = Math.min(n || buf.length, buf.length); const out = new Int16Array(n * 2);
          for (let i = 0; i < n; i++) { out[2 * i] = Math.max(-1, Math.min(1, L[i])) * 32767; out[2 * i + 1] = Math.max(-1, Math.min(1, R[i])) * 32767; }
          const u8 = new Uint8Array(out.buffer); let bin = ''; for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
          return { b64: btoa(bin), sr: buf.sampleRate, n };
        } };
    }, 40);
    // the camera (table units, through world.setCam). The intro is one Catmull-Rom path through the room's framings with a
    // smootherstep over its whole length (it never stops between keys); then ballcam's calm director; then the pull back out.
    await page.evaluate((lead) => {
      const H = S3.world.homes().whole, R = S3.world.roomShots(), V3 = [84, 118, 40], UPT = [0, -1, 0];   // UPT: "up the table", world3d's own default
      const mix = (a, b, k) => a + (b - a) * k, mixV = (a, b, k) => a.map((v, i) => mix(v, b[i], k)), clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
      const ease = (u) => { u = clamp(u, 0, 1); return u * u * u * (u * (u * 6 - 15) + 10); };
      const home = { eye: H.eye, look: H.look, fov: H.fov, up: UPT };
      const drift = { eye: mixV(R.wide.eye, R.hero.eye, 0.35), look: mixV(R.wide.look, R.hero.look, 0.35), fov: mix(R.wide.fov, R.hero.fov, 0.35), up: R.wide.up };
      const glassHi = { eye: [135, 520, 250], look: [135, 0, 175], fov: 40, up: R.glass.up };   // in front of the backglass and topper, standing back a little
      const KEYS = [R.wide, drift, R.hero, glassHi, home], T_IN = Math.max(9, lead - 3.5) * 1000;   // the intro ends a few seconds before the catch
      const cr = (p0, p1, p2, p3, u) => p1.map((_, i) => 0.5 * (2 * p1[i] + (-p0[i] + p2[i]) * u + (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * u * u + (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * u * u * u));
      const along = (k, s) => { const n = KEYS.length - 1, x = clamp(s, 0, 1) * n, i = Math.min(n - 1, Math.floor(x)), u = x - i, g = (j) => KEYS[clamp(j, 0, n)][k]; return k === 'fov' ? cr([g(i - 1)], [g(i)], [g(i + 1)], [g(i + 2)], u)[0] : cr(g(i - 1), g(i), g(i + 1), g(i + 2), u); };
      const st = { n: 0, t: 0, phase: 'intro', shot: 'home', since: 0, from: null, dur: 3000, eye: home.eye.slice(), look: home.look.slice(), fov: home.fov, up: UPT, fl: null, outAt: 0 };
      const target = (b) => {
        if (st.shot === 'crater') return { eye: mixV(V3, H.eye, 0.5), look: mixV(H.look, V3, 0.85) };
        if (st.shot === 'rail' && st.fl) { const D = H.eye.map((v, i) => v - H.look[i]), L = [mix(st.fl[0], 135, 0.3), st.fl[1], st.fl[2] * 0.45]; return { eye: [clamp(L[0] + D[0] * 0.62 + 40, 110, 170), L[1] + D[1] * 0.62, L[2] + D[2] * 0.62], look: L }; }
        return { eye: H.eye.slice(), look: H.look.slice() };
      };
      window.TR = function () {
        const W = S3.W, b = W.balls && W.balls[0];
        AUD.A.t = st.n / 30; S3.step(); AUD.A.t += 1 / 60; S3.step(); AUD.frame(); st.n++;
        st.t += 1000 / 30;
        let cam;
        if (st.phase === 'intro') {
          const s = ease(st.t / T_IN);
          cam = { eye: along('eye', s), look: along('look', s), fov: along('fov', s), up: along('up', s) };
          if (st.t >= T_IN) { st.phase = 'play'; st.since = st.t; }
        } else if (st.phase === 'play') {
          const want = !b ? 'home' : b.at === 'crater' && b.m === 'held' ? 'crater' : b.carry ? 'rail' : 'home';
          if (b && b.carry) { const p = [b.x, b.y, b.z || 0]; st.fl = st.fl ? mixV(st.fl, p, 1 - Math.exp(-(1 / 30) / 0.45)) : p; }
          if (want !== st.shot && (st.t - st.since > 2000 || want !== 'home')) {
            st.from = { eye: st.eye.slice(), look: st.look.slice() }; st.shot = want; st.since = st.t;
            st.dur = want === 'crater' ? 3000 : want === 'rail' ? 2500 : 3500;
            if (want === 'rail' && !st.fl && b) st.fl = [b.x, b.y, b.z || 0];
          }
          if (st.shot !== 'rail' && !(b && b.carry)) st.fl = null;
          const T = target(b), u = st.from ? ease((st.t - st.since) / st.dur) : 1;
          st.eye = st.from ? mixV(st.from.eye, T.eye, u) : T.eye; st.look = st.from ? mixV(st.from.look, T.look, u) : T.look;
          if (u >= 1) st.from = null;
          cam = { eye: st.eye, look: st.look, fov: H.fov, up: UPT };
          if (window.__railout != null && AUD.A.t > window.__railout + 0.5) { st.phase = 'out'; st.outAt = st.t; st.from = { eye: st.eye.slice(), look: st.look.slice(), fov: H.fov, up: UPT }; }
        } else {   // the pull back out to the cabinet in the room: 5 s, then held
          const u = ease((st.t - st.outAt) / 5000), F = st.from, E2 = R.hero;
          cam = { eye: mixV(F.eye, E2.eye, u), look: mixV(F.look, E2.look, u), fov: mix(F.fov, E2.fov, u), up: mixV(F.up, E2.up, u) };
        }
        S3.world.setCam(cam);
        S3.render(st.t);
        return { s: st.phase === 'play' ? st.shot + (st.from ? ':moving' : '') : st.phase, done: st.phase === 'out' && st.t - st.outAt > 6000, t: +(st.t / 1000).toFixed(2) };
      };
    }, LEAD);
    const dir = path.join(OUT, '_frames'); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
    const states = {}, MAX = Math.round(+arg('secs', 36) * 30); let n = 0;
    for (; n < MAX; n++) {
      const s = await page.evaluate(() => window.TR());
      states[s.s] = (states[s.s] || 0) + 1;
      if (!PROBE || n % 15 === 0) await page.locator('#frame').screenshot({ path: path.join(dir, 'f' + String(PROBE ? n / 15 : n).padStart(4, '0') + '.jpg'), type: 'jpeg', quality: 93 });
      if (s.done) { n++; break; }
    }
    const marks = await page.evaluate(() => ({ erupted: window.__erupted, railout: window.__railout }));
    console.log('frames', n, '(' + (n / 30).toFixed(1) + ' s) | eruption at', marks.erupted, 's | rail out at', marks.railout, 's | states', JSON.stringify(states), '| errors', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
    if (PROBE) { await browser.close(); console.log('probe frames in', dir); return; }
    const au = await page.evaluate((n) => AUD.render(Math.ceil(48000 * n / 30)), n), counts = await page.evaluate(() => AUD.counts);
    await browser.close();
    const pcm = Buffer.from(au.b64, 'base64'), hdr = Buffer.alloc(44);
    hdr.write('RIFF', 0); hdr.writeUInt32LE(36 + pcm.length, 4); hdr.write('WAVEfmt ', 8); hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20); hdr.writeUInt16LE(2, 22);
    hdr.writeUInt32LE(au.sr, 24); hdr.writeUInt32LE(au.sr * 4, 28); hdr.writeUInt16LE(4, 32); hdr.writeUInt16LE(16, 34); hdr.write('data', 36); hdr.writeUInt32LE(pcm.length, 40);
    const wav = path.join(OUT, 'trailer.wav'); fs.writeFileSync(wav, Buffer.concat([hdr, pcm]));
    console.log('sounds:', JSON.stringify(counts));
    const out = path.join(OUT, 'trailer.mp4');
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '30', '-i', path.join(dir, 'f%04d.jpg'), '-i', wav, '-map', '0:v', '-map', '1:a', '-shortest', '-c:a', 'aac', '-b:a', '192k', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', '48000', '-vf', 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out]);
    const picks = Array.from({ length: 12 }, (_, i) => path.join(dir, 'f' + String(Math.floor((n - 1) * (i + 0.5) / 12)).padStart(4, '0') + '.jpg'));
    const inArgs = []; picks.forEach((p) => inArgs.push('-i', p));
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...inArgs, '-filter_complex', picks.map((_, i) => '[' + i + ':v]scale=300:-2[s' + i + ']').join(';') + ';' + picks.slice(0, 6).map((_, i) => '[s' + i + ']').join('') + 'hstack=inputs=6[r0];' + picks.slice(6).map((_, i) => '[s' + (i + 6) + ']').join('') + 'hstack=inputs=6[r1];[r0][r1]vstack=inputs=2', path.join(OUT, 'trailer-sheet.jpg')]);
    fs.rmSync(dir, { recursive: true, force: true });
    console.log('trailer.mp4', (fs.statSync(out).size / 1048576).toFixed(1), 'MB,', (n / 30).toFixed(1), 's | moment', JSON.stringify(m));
  } finally { stop(); }
})().catch((e) => { console.error(e); process.exit(1); });
