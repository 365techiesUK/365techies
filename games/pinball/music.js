/* 365 Pinball Hero - the music (5 Nov 2026, wave 3). No files: every note is made on the spot the way the arcade
 * cabinet's sound kit makes its sounds (../common/arcade.js kit.tone and kit.noise: an oscillator or filtered noise
 * with a short envelope), on the kit's own AudioContext and limiter, through one music gain of its own so the music
 * can duck under a big moment and fade when it is switched off. Without the kit's context (a test) the notes go
 * straight to kit.tone / kit.noise.
 *
 * Layers, chosen at each bar line from the world (each has at least two variations, taking turns every 4 bars):
 *   base       the island groove (kick, off-beat hats, a bass line, a pluck)                 Ember Peak, nothing special
 *   pressure   a rising arpeggio over the groove, louder as the pressure nears the rung        pressure >= half the rung
 *   multiball  double time: 16th hats, a snare, an octave bass and a lead riff, faster tempo   W.mb.on
 *   boss       heavy: a kick on every beat, a low drone and tritone stabs                      opts.boss
 *   chamber    deep and slow: a dark pad, low pulses and dripping notes                         opts.depth > 0, or a T.level table
 * Notes are scheduled a bar ahead on the audio clock (so a slow frame never makes them late); stingers (from sound.js:
 * PinMusic.sting(kind)) land on the next bar line; PinMusic.duck(secs) drops the music 6 dB under a big show.
 *
 * window.PinMusic:
 *   enable(on)                           the Music setting (the page stores it as pin365:music); off fades it out
 *   attach(kit, settings)                sound.js's frame hook hands over the cabinet's kit each frame
 *   update(W, { boss, depth, paused })   once a frame (the page); the world is only read
 *   sting(kind), duck(secs)              from sound.js
 *   state() -> { on, layer, layers, variation, bar, bpm, notes, stings }   for the tests
 * Plain ES5; nothing runs until enable(true), a kit and a world in play. */
(function (root) {
  'use strict';
  var ON = false, KIT = null, SET = null, AC = null, OUT = null, OUTK = 0;
  var S = { bar: 0, next: -1, layer: 'base', layers: ['base'], variation: 0, bpm: 112, notes: 0, stings: 0, duckTo: 0, pend: [], lastT: 0, playing: false };
  var DUCK = 0.5;   // -6 dB
  var BPM = { base: 112, multiball: 138, boss: 100, chamber: 92 };
  // A minor pentatonic over the volcano: the bass roots for each variation's 4-bar turn
  var A1 = 55, RT = { base: [[1, 1, 0.8909, 1.1225], [1, 1.1892, 0.8909, 0.7492]], boss: [[1, 1, 1.0595, 1], [1, 0.9439, 1, 1.4142]], chamber: [[1, 0.8909, 1.1892, 1], [1, 1.1225, 0.7937, 0.8909]], multiball: [[1, 1.1892, 1.3348, 1.1225], [1, 0.8909, 1.1892, 1.3348]] };
  var PENT = [1, 1.1892, 1.3348, 1.4983, 1.7818, 2];   // minor pentatonic ratios (A C D E G A)

  function ctxOf(k) { try { return k && k.ctx ? k.ctx() : null; } catch (e) { return null; } }
  function now() { return AC && AC.currentTime != null ? AC.currentTime : S.lastT; }
  function out() {   // the music's own gain on the kit's bus (made once per AudioContext)
    if (!AC || !AC.createGain) return null;
    if (OUT && OUTK === AC) return OUT;
    try {
      OUT = AC.createGain(); OUT.gain.value = ON ? 1 : 0.0001; OUTK = AC;
      var bus = KIT && KIT.bus ? KIT.bus() : null; OUT.connect(bus || AC.destination);
    } catch (e) { OUT = null; }
    return OUT;
  }
  // a note: like kit.tone, at an absolute time t on the audio clock, into the music's gain
  function tone(f, dur, gain, t, o) {
    o = o || {}; S.notes++;
    var G = out();
    if (!G) { if (KIT && KIT.tone) KIT.tone(f, dur, gain, { type: o.type, to: o.to, when: Math.max(0, t - now()), music: true }); return; }
    try {
      var osc = AC.createOscillator(), gn = AC.createGain();
      osc.type = o.type || 'triangle'; osc.frequency.setValueAtTime(f, t);
      if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + dur);
      gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(gain, t + (o.attack || 0.01)); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gn); gn.connect(G); osc.start(t); osc.stop(t + dur + 0.03);
    } catch (e) {}
  }
  var NB = null;
  function noise(dur, gain, freq, t, o) {   // like kit.noise
    o = o || {}; S.notes++;
    var G = out();
    if (!G) { if (KIT && KIT.noise) KIT.noise(dur, gain, freq, { type: o.type, q: o.q, to: o.to, when: Math.max(0, t - now()), music: true }); return; }
    try {
      if (!NB || NB.sampleRate !== AC.sampleRate) { var len = Math.floor(AC.sampleRate * 0.5), d, seed = 365; NB = AC.createBuffer(1, len, AC.sampleRate); d = NB.getChannelData(0); for (var i = 0; i < len; i++) { seed = (seed * 1103515245 + 12345) & 0x7fffffff; d[i] = seed / 0x3fffffff - 1; } }
      var s = AC.createBufferSource(), fl = AC.createBiquadFilter(), gn = AC.createGain();
      s.buffer = NB; fl.type = o.type || 'highpass'; if (o.q) fl.Q.value = o.q;
      fl.frequency.setValueAtTime(freq, t); if (o.to) fl.frequency.exponentialRampToValueAtTime(o.to, t + dur);
      gn.gain.setValueAtTime(gain, t); gn.gain.exponentialRampToValueAtTime(0.0008, t + dur);
      s.connect(fl); fl.connect(gn); gn.connect(G); s.start(t); s.stop(t + dur + 0.03);
    } catch (e) {}
  }
  // ---------------------------------------------------------------- the instruments
  function kick(t, g) { tone(110, 0.16, g || 0.16, t, { type: 'sine', to: 38, attack: 0.004 }); }
  function hat(t, g, open) { noise(open ? 0.12 : 0.035, g || 0.03, 7000, t, { type: 'highpass', to: 5000 }); }
  function snare(t, g) { noise(0.12, g || 0.07, 1800, t, { type: 'bandpass', q: 0.8, to: 900 }); tone(190, 0.07, 0.03, t, { type: 'triangle', to: 150 }); }
  function bass(f, t, d, g) { tone(f, d, g || 0.06, t, { type: 'triangle' }); tone(f * 2, d * 0.6, (g || 0.06) * 0.25, t, { type: 'square' }); }
  function pluck(f, t, g) { tone(f, 0.18, g || 0.025, t, { type: 'triangle' }); }

  // ---------------------------------------------------------------- one bar of each layer (t: the bar's start, b: a beat)
  var BARS = {
    base: [
      function (t, b, r) {   // A: four on the floor-ish, off-beat hats, a walking bass, a pluck on 4
        for (var k = 0; k < 4; k++) { if (k % 2 === 0) kick(t + k * b); hat(t + k * b + b / 2); }
        bass(A1 * r, t, b * 0.9); bass(A1 * r, t + b * 1.5, b * 0.4); bass(A1 * r * 1.4983, t + b * 2, b * 0.9); bass(A1 * r * 1.3348, t + b * 3, b * 0.9);
        pluck(220 * r * 2, t + b * 3.5);
      },
      function (t, b, r) {   // B: syncopated kick, hats on every 8th (lighter), a bass on the and-of-2
        kick(t); kick(t + b * 1.75, 0.12); kick(t + b * 2.5, 0.12);
        for (var k = 0; k < 8; k++) hat(t + k * b / 2, k % 2 ? 0.03 : 0.015);
        bass(A1 * r, t, b * 1.4); bass(A1 * r * 1.1892, t + b * 2.5, b * 0.5); bass(A1 * r * 1.4983, t + b * 3, b * 0.9);
        pluck(220 * r * 1.4983 * 2, t + b * 1.5); pluck(220 * r * 2, t + b * 3.5, 0.02);
      }
    ],
    pressure: [
      function (t, b, r, k) { for (var i = 0; i < 8; i++) pluck(440 * r * PENT[i % 6], t + i * b / 2, 0.012 + 0.02 * k); },   // up
      function (t, b, r, k) { for (var i = 0; i < 8; i++) pluck(440 * r * PENT[5 - (i % 6)], t + i * b / 2, 0.012 + 0.02 * k); tone(880 * r, b * 3.5, 0.008 + 0.012 * k, t, { type: 'sine' }); }   // down, with a held top
    ],
    multiball: [
      function (t, b, r) {   // A: 16th hats, snare on 2 and 4, an octave bass, a riff
        for (var k = 0; k < 16; k++) hat(t + k * b / 4, k % 4 === 2 ? 0.035 : 0.018);
        for (k = 0; k < 4; k++) { kick(t + k * b, 0.15); if (k % 2) snare(t + k * b); }
        for (k = 0; k < 8; k++) bass(A1 * r * (k % 2 ? 2 : 1), t + k * b / 2, b * 0.4, 0.05);
        [0, 2, 3, 4, 3, 2].forEach(function (n, i) { tone(440 * r * PENT[n], b * 0.4, 0.028, t + i * b * 0.5 + b, { type: 'square' }); });
      },
      function (t, b, r) {   // B: the riff answered an octave up, a fill on 4
        for (var k = 0; k < 16; k++) hat(t + k * b / 4, k % 2 ? 0.02 : 0.03);
        for (k = 0; k < 4; k++) { kick(t + k * b, 0.15); if (k === 1) snare(t + k * b); }
        for (k = 0; k < 4; k++) snare(t + 3 * b + k * b / 4, 0.03 + k * 0.012);
        for (k = 0; k < 8; k++) bass(A1 * r * (k % 2 ? 1.4983 : 1), t + k * b / 2, b * 0.4, 0.05);
        [5, 4, 3, 4, 5].forEach(function (n, i) { tone(440 * r * PENT[n], b * 0.35, 0.026, t + i * b * 0.5, { type: 'square' }); });
      }
    ],
    boss: [
      function (t, b, r) {   // A: a kick on every beat, a low drone, a tritone stab on 3
        for (var k = 0; k < 4; k++) kick(t + k * b, 0.18);
        tone(A1 * r, b * 4, 0.035, t, { type: 'sawtooth', attack: 0.2 });
        tone(A1 * r * 2 * 1.4142, b * 0.5, 0.03, t + b * 2, { type: 'square' }); tone(A1 * r * 2, b * 0.5, 0.03, t + b * 2, { type: 'square' });
        hat(t + b * 3.5, 0.03, true);
      },
      function (t, b, r) {   // B: double kicks, a falling stab line
        for (var k = 0; k < 4; k++) { kick(t + k * b, 0.17); if (k % 2) kick(t + k * b + b / 2, 0.12); }
        tone(A1 * r, b * 4, 0.035, t, { type: 'sawtooth', attack: 0.2 });
        [2, 1.8877, 1.7818, 1.4142].forEach(function (m, i) { tone(A1 * r * m * 2, b * 0.3, 0.028, t + i * b + b / 2, { type: 'square' }); });
      }
    ],
    chamber: [
      function (t, b, r) {   // A: a dark pad, low pulses, drips
        [1, 1.1892, 1.4983].forEach(function (m) { tone(110 * r * m, b * 4, 0.014, t, { type: 'triangle', attack: 0.4 }); });
        tone(A1 * r, b * 0.8, 0.07, t, { type: 'sine' }); tone(A1 * r, b * 0.8, 0.05, t + b * 2, { type: 'sine' });
        tone(1760 * r, 0.12, 0.012, t + b * 1.25, { type: 'sine', to: 1320 * r }); tone(1320 * r, 0.12, 0.01, t + b * 3.5, { type: 'sine', to: 990 * r });
      },
      function (t, b, r) {   // B: the pad moves, a heartbeat pulse
        [1, 1.3348, 1.7818].forEach(function (m) { tone(110 * r * m, b * 4, 0.013, t, { type: 'triangle', attack: 0.5 }); });
        tone(A1 * r, b * 0.3, 0.07, t, { type: 'sine' }); tone(A1 * r, b * 0.3, 0.05, t + b * 0.4, { type: 'sine' });
        tone(A1 * r, b * 0.3, 0.07, t + b * 2, { type: 'sine' }); tone(A1 * r, b * 0.3, 0.05, t + b * 2.4, { type: 'sine' });
        tone(1568 * r, 0.12, 0.012, t + b * 2.75, { type: 'sine', to: 1175 * r });
      }
    ]
  };
  // stingers: a short phrase on the next bar line
  var STING = {
    erupt: [1, 1.4983, 2, 3], multiball: [1, 1.3348, 1.4983, 2], jackpot: [2, 2.3784, 3], super: [2, 2.6697, 3, 4], lock: [1.4983, 2], clear: [1, 1.4983, 2, 2.6697, 3],
    victory: [1, 1.4983, 2, 3, 4], boss: [0.7071, 0.5], dive: [2, 1.4983, 1, 0.5], combo: [2, 2.6697, 3.5636], mode: [1, 1.3348], done: [1.4983, 2, 2.6697]
  };
  function stingAt(kind, t) {
    var P = STING[kind] || STING.jackpot, b = 60 / S.bpm;
    P.forEach(function (m, i) { tone(220 * m, b * (i === P.length - 1 ? 1.5 : 0.35), 0.035, t + i * b * 0.25, { type: 'square' }); tone(220 * m * 1.5, b * 0.3, 0.012, t + i * b * 0.25, { type: 'triangle' }); });
    if (kind !== 'boss' && kind !== 'dive') kick(t, 0.14);
    S.stings++;
  }

  // ---------------------------------------------------------------- which layer, from the world
  function choose(W, o) {
    var T = W && root.PinEngine && root.PinEngine.table && W.tableId ? safeT(W.tableId) : null;
    var depth = o && o.depth > 0, lvl = T && T.level;
    var primary = depth || lvl ? 'chamber' : o && o.boss ? 'boss' : W && W.mb && W.mb.on ? 'multiball' : 'base';
    var V = W && W.toys && W.toys.volcano, L = W && W.press && W.press.level > 0 ? W.press.level : 1, p = V ? (V.pressure || 0) / L : 0;
    var layers = [primary];
    if (primary === 'base' && p >= 0.5) layers.push('pressure');
    return { layers: layers, p: Math.min(1, p) };
  }
  function safeT(id) { try { return root.PinEngine.table(id).T; } catch (e) { return null; } }
  function schedule(W, o, t) {   // one bar at audio time t
    var c = choose(W, o), primary = c.layers[0];
    S.bpm = BPM[primary]; S.layer = primary; S.layers = c.layers;
    var b = 60 / S.bpm, v = Math.floor(S.bar / 4) % 2, roots = RT[primary] || RT.base, r = roots[v][S.bar % 4];
    S.variation = v;
    BARS[primary][v](t, b, r);
    for (var i = 1; i < c.layers.length; i++) BARS[c.layers[i]][Math.floor(S.bar / 2) % 2](t, b, r, c.p);
    S.bar++;
    return 4 * b;
  }

  // ---------------------------------------------------------------- the API
  function fade(to, tau) { var G = out(); if (!G) return; try { G.gain.cancelScheduledValues(now()); G.gain.setTargetAtTime(Math.max(0.0001, to), now(), tau || 0.2); } catch (e) {} }
  var api = {
    enable: function (on) {
      ON = !!on;
      if (!ON) { fade(0.0001, 0.15); S.next = -1; S.pend.length = 0; S.playing = false; }
      else fade(1, 0.2);
      return ON;
    },
    enabled: function () { return ON; },
    attach: function (kit, set) { KIT = kit || KIT; SET = set || SET; var a = ctxOf(KIT); if (a && a !== AC) { AC = a; OUT = null; S.next = -1; } },
    update: function (W, o) {
      o = o || {};
      if (!AC && KIT) AC = ctxOf(KIT);
      if (!AC || AC.currentTime == null) S.lastT = o.t != null ? o.t : (root.performance && performance.now ? performance.now() / 1000 : S.lastT);   // (no audio clock: a test's)
      var play = ON && KIT && W && !o.paused && !(SET && SET.sound === false) && !W.over && W.state !== 'over';
      if (!play) { if (S.playing) { S.playing = false; S.next = -1; if (ON) fade(0.0001, 0.06); } return S; }   // (paused: the bar already scheduled fades out)
      var t = now();
      if (!S.playing || S.next < 0 || S.next < t - 0.05) { S.next = t + 0.08; S.playing = true; fade(1, 0.1); }
      // a bar ahead: keep the next unscheduled bar line within one bar of now
      var guard = 0;
      while (S.next < t + 4 * 60 / S.bpm && guard++ < 4) {
        var start = S.next, len = schedule(W, o, start);
        while (S.pend.length) { stingAt(S.pend.shift(), start); }
        S.next = start + len;
      }
      if (S.duckTo && t >= S.duckTo) { S.duckTo = 0; fade(1, 0.35); }
      return S;
    },
    sting: function (kind) {   // on the next bar line (already scheduled bars keep playing under it)
      if (!ON) return;
      if (S.playing && S.next > now()) {
        var b4 = 4 * 60 / S.bpm, t = S.next - b4, tn = now() + 0.03;
        while (t < tn) t += b4;
        stingAt(kind, t);
      } else S.pend.push(kind);
    },
    duck: function (secs) {
      if (!ON || !(secs > 0)) return;
      var G = out(); S.duckTo = now() + secs;
      if (G) { try { G.gain.cancelScheduledValues(now()); G.gain.setTargetAtTime(DUCK, now(), 0.03); } catch (e) {} }
    },
    state: function () { return { on: ON, layer: S.layer, layers: S.layers.slice(), variation: S.variation, bar: S.bar, bpm: S.bpm, notes: S.notes, stings: S.stings, ducked: !!S.duckTo }; },
    reset: function () { S.bar = 0; S.next = -1; S.notes = 0; S.stings = 0; S.pend.length = 0; S.playing = false; S.duckTo = 0; S.layer = 'base'; S.layers = ['base']; },
    LAYERS: Object.keys(BARS), DUCK: DUCK, version: 1
  };
  root.PinMusic = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : this);
