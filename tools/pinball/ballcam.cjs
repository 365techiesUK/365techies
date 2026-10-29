/* 365 Pinball Hero - the CALM CINEMATIC test clip (29 Oct 2026; calm since 30 Oct 2026: the owner rejected the fast chase
 * cam, "moves quite quickly ... you lose track of the pinball game"), never deployed. Drives tools/pinball/stills3d.html
 * (headless Chrome, the high tier) from the player-eye table view (camera.js's calm home), with slow eased dollies only
 * (2.5-3.5 s smootherstep, never a cut): a push towards the volcano for the crater catch, a follow alongside the sky
 * carry and the wire rail from high over the middle of the table (never near a wall), and home again. It starts a
 * few seconds before a crater catch (the pilot playing Ember Peak) so the clip has the dive, the sky carry and the wire
 * rail. Writes ballcam.mp4 (1080 x 1920, 30 fps, 18 s, with the game's own sounds rendered offline frame by frame),
 * ballcam.wav and a contact sheet ballcam-sheet.jpg.
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
    await page.goto('http://127.0.0.1:' + PORT + '/tools/pinball/stills3d.html?table=ember&cam=home&home=calm&tier=high&w=1080&h=1920&frame=2');
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
    const m = await page.evaluate(() => S3.findMoment('craterclip'));
    if (!m) throw new Error('no crater moment found');
    await page.evaluate(([f, s]) => S3.goTo(f, 30, s), [Math.max(60, m.frame - 300), m.seed]);
    // the game's own sounds (29 Oct 2026, owner: "add game sound"): sound.js plays every engine event, as in the cabinet,
    // into an OfflineAudioContext whose clock is the clip's clock (each sound lands on its frame); rendered at the end
    await page.addScriptTag({ url: '/games/pinball/sound.js' });
    await page.evaluate((secs) => {
      const SR = 48000, OA = new OfflineAudioContext(2, Math.ceil(SR * (secs + 1.5)), SR), A = { t: 0 };
      const ctx = new Proxy(OA, { get: (o, k) => (k === 'currentTime' ? A.t : typeof o[k] === 'function' ? o[k].bind(o) : o[k]) });
      const comp = OA.createDynamicsCompressor(); comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2;
      const BUS = OA.createGain(); BUS.gain.value = 0.9; BUS.connect(comp); comp.connect(OA.destination);
      let s = 9; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647) * 2 - 1;   // a fixed echo and noise (repeatable)
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
      window.PinFX.events = function (W, ev) {   // every engine event this step: the cabinet's own dispatch, then the effects
        for (const e of ev) { const n = typeof e === 'string' ? e : e && e.sfx; if (!n) continue; counts[n] = (counts[n] || 0) + 1; try { PinSound.sound(n, KIT, typeof e === 'string' ? undefined : e, W); } catch (x) {} }
        return pfx ? pfx(W, ev) : undefined;
      };
      window.AUD = { A, KIT, OA, counts, frame: () => { try { PinSound.frame(S3.W, KIT, 'play', { sound: true }); } catch (x) {} },
        async render() {
          const buf = await OA.startRendering(), n = buf.length, L = buf.getChannelData(0), R = buf.getChannelData(1), out = new Int16Array(n * 2);
          for (let i = 0; i < n; i++) { out[2 * i] = Math.max(-1, Math.min(1, L[i])) * 32767; out[2 * i + 1] = Math.max(-1, Math.min(1, R[i])) * 32767; }
          const u8 = new Uint8Array(out.buffer); let bin = ''; for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
          return { b64: btoa(bin), sr: buf.sampleRate, n };
        } };
    }, SECS);
    // the calm camera, in the page (30 Oct 2026, owner on the chase cam: "moves quite quickly ... you lose track of the
    // pinball game"): the player-eye table view most of the time; a slow eased push towards the volcano for the crater
    // catch; a slow follow alongside the sky carry and the wire rail from the middle of the table (high, never near a
    // wall); a slow dolly home. Every move is a smootherstep of 2.5-3.5 s from wherever the camera is: no cuts, no snaps
    await page.evaluate(() => {
      const H = S3.world.homes().whole, V3 = [84, 118, 40];   // home (camera.js's player-eye home) and the crater's pool
      const mix = (a, b, k) => a + (b - a) * k, mixV = (a, b, k) => a.map((v, i) => mix(v, b[i], k)), clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
      const ease = (u) => { u = clamp(u, 0, 1); return u * u * u * (u * (u * 6 - 15) + 10); };
      const st = { n: 0, t: 0, shot: 'home', since: 0, from: null, dur: 3000, eye: H.eye.slice(), look: H.look.slice(), fl: null };
      const target = (b) => {
        if (st.shot === 'crater') return { eye: mixV(V3, [H.eye[0], H.eye[1], H.eye[2]], 0.5), look: mixV(H.look, V3, 0.85) };   // half way in, still high over the table
        if (st.shot === 'rail' && st.fl) { const D = H.eye.map((v, i) => v - H.look[i]), L = [mix(st.fl[0], 135, 0.3), st.fl[1], st.fl[2] * 0.45]; return { eye: [clamp(L[0] + D[0] * 0.62 + 40, 110, 170), L[1] + D[1] * 0.62, L[2] + D[2] * 0.62], look: L }; }   // home's angle at 0.62 of its distance, aimed a little in from the ball towards the middle and below it in the sky, so the table (not the cabinet's side or the sky) fills the picture (the long lens: any nearer is a close-up)
        return { eye: H.eye.slice(), look: H.look.slice() };
      };
      window.BC = function () {
        const W = S3.W, b = W.balls && W.balls[0];
        AUD.A.t = st.n / 30; S3.step(); AUD.A.t += 1 / 60; S3.step(); AUD.frame(); st.n++;
        st.t += 1000 / 30;
        const want = !b ? 'home' : b.at === 'crater' && b.m === 'held' ? 'crater' : b.carry ? 'rail' : 'home';
        if (b && b.carry) { const p = [b.x, b.y, b.z || 0]; st.fl = st.fl ? mixV(st.fl, p, 1 - Math.exp(-(1 / 30) / 0.45)) : p; }   // the rail's look point trails the ball softly
        if (want !== st.shot && (st.t - st.since > 2000 || want !== 'home')) {
          st.from = { eye: st.eye.slice(), look: st.look.slice() }; st.shot = want; st.since = st.t;
          st.dur = want === 'crater' ? 3000 : want === 'rail' ? 2500 : 3500;
          if (want === 'rail' && !st.fl && b) st.fl = [b.x, b.y, b.z || 0];
        }
        if (st.shot !== 'rail' && !(b && b.carry)) st.fl = null;
        const T = target(b), u = st.from ? ease((st.t - st.since) / st.dur) : 1;
        st.eye = st.from ? mixV(st.from.eye, T.eye, u) : T.eye; st.look = st.from ? mixV(st.from.look, T.look, u) : T.look;
        if (u >= 1) st.from = null;
        S3.world.setCam({ eye: st.eye, look: st.look, fov: H.fov });
        S3.render(st.t);
        return st.shot + (st.from ? ':moving' : '');
      };
    });
    const dir = path.join(OUT, '_frames'); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
    const n = Math.round(SECS * 30), states = {};
    for (let i = 0; i < n; i++) {
      const s = await page.evaluate(() => window.BC());
      states[s] = (states[s] || 0) + 1;
      await page.locator('#frame').screenshot({ path: path.join(dir, 'f' + String(i).padStart(4, '0') + '.jpg'), type: 'jpeg', quality: 93 });
    }
    const au = await page.evaluate(() => AUD.render()), counts = await page.evaluate(() => AUD.counts);
    await browser.close();
    const pcm = Buffer.from(au.b64, 'base64'), hdr = Buffer.alloc(44);
    hdr.write('RIFF', 0); hdr.writeUInt32LE(36 + pcm.length, 4); hdr.write('WAVEfmt ', 8); hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20); hdr.writeUInt16LE(2, 22);
    hdr.writeUInt32LE(au.sr, 24); hdr.writeUInt32LE(au.sr * 4, 28); hdr.writeUInt16LE(4, 32); hdr.writeUInt16LE(16, 34); hdr.write('data', 36); hdr.writeUInt32LE(pcm.length, 40);
    const wav = path.join(OUT, 'ballcam.wav'); fs.writeFileSync(wav, Buffer.concat([hdr, pcm]));
    console.log('sounds:', JSON.stringify(counts));
    const out = path.join(OUT, 'ballcam.mp4');
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '30', '-i', path.join(dir, 'f%04d.jpg'), '-i', wav, '-map', '0:v', '-map', '1:a', '-shortest', '-c:a', 'aac', '-b:a', '192k', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', '48000', '-vf', 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out]);
    const picks = [0.1, 0.25, 0.4, 0.55, 0.7, 0.85].map((f) => path.join(dir, 'f' + String(Math.floor(n * f)).padStart(4, '0') + '.jpg'));
    const inArgs = []; picks.forEach((p) => inArgs.push('-i', p));
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...inArgs, '-filter_complex', picks.map((_, i) => '[' + i + ':v]scale=360:-2[s' + i + ']').join(';') + ';' + picks.map((_, i) => '[s' + i + ']').join('') + 'hstack=inputs=' + picks.length, path.join(OUT, 'ballcam-sheet.jpg')]);
    fs.rmSync(dir, { recursive: true, force: true });
    console.log('ballcam.mp4', (fs.statSync(out).size / 1048576).toFixed(1), 'MB | moment', JSON.stringify(m), '| ball states', JSON.stringify(states), '| errors', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
  } finally { stop(); }
})().catch((e) => { console.error(e); process.exit(1); });
