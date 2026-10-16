/* 365 Pinball Hero - the sounds (15 Oct 2026, milestone 1). Every sound is made on the spot with the arcade cabinet's
 * sound kit (../common/arcade.js: kit.tone and kit.noise, through its limiter and echo), so nothing is downloaded. The
 * cabinet calls PinSound.sound(name, kit, event) for everything the engine reports in world.events: a name such as
 * 'drain', or an object's sfx ('flip', 'bumper' ...) with the object itself as the event.
 *
 * Two kinds of sound: the machine itself (flippers clacking, pop bumpers thumping, the plunger, rubber and steel being
 * hit - short, a little noise, placed left or right where it happened on the table) and the game's music-box answers
 * (ramps, the hangar, skill shot, extra ball - square and triangle notes like 365 Invaders, with some echo).
 *
 * Ember Peak (16 Oct 2026): the volcano island has its own sounds, made the same way - a deep rumble under the table that
 * grows with the pressure (and swells while the crater holds the ball, and in a quake: PinSound.frame, the cabinet's
 * frameAudio hook, a long-running noise and a sub tone through the cabinet's own limiter), the crater swallowing the
 * ball, the eruption's launch whoosh (a full eruption: a boom with a sub-bass drop and falling rock), the wire rail's
 * rattle, the geyser's warning hiss and blast, the magma crabs' clicks, the lava gates grinding up and down, the quake,
 * the fumaroles' pops (Ember Peak's pop bumpers) and obsidian clinks. The cabinet passes the world as a fourth argument
 * (sound(name, kit, event, world)), so each table gets its own sounds and stereo places.
 * The ball touches walls and rubbers many times a second, and the spinner can turn 50 times a second, so those are
 * scaled by how hard the ball hit and limited to a few a second: they add life without ever clattering. */
(function (root) {
  'use strict';
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function now() { return root.performance && performance.now ? performance.now() : Date.now(); }
  // where things are on the table (x), for the stereo: the table is 270 wide; left of the middle plays on the left
  function panX(x) { return clamp((x - 135) / 135, -1, 1) * 0.8; }
  var E = root.PinEngine, CACHE = {};
  function places(W) {   // each table's stereo places, worked out once from its data
    var id = (W && W.tableId) || 'orbit';
    if (CACHE[id]) return CACHE[id];
    var T = E && E.table ? E.table(id).T : E && E.TABLE;
    var P = {
      ember: !!(T && T.volcano),
      bump: T ? T.bumpers.map(function (b) { return panX(b[0]); }) : [panX(156), panX(202), panX(180)],
      drops: panX(T && T.drops ? (T.drops.a[0] + T.drops.b[0]) / 2 : 66),
      saucer: panX(T && T.saucer ? T.saucer.x : 56),
      lanes: panX(188),
      shooter: panX(T ? T.shooter.cx : 255),
      kick: panX(15), spin: panX(18),
      volcano: panX(T && T.volcano ? T.volcano.x : 90),
      geyser: panX(T && T.geyser ? T.geyser.x : 125),
      rail: panX(16)
    };
    return (CACHE[id] = P);
  }
  var PAN = places(null);

  // a sound that comes often plays only if it hasn't just played (ms since it last did)
  var last = {};
  function ready(key, ms) { var t = now(); if (last[key] && t - last[key] < ms) return false; last[key] = t; return true; }
  // a run of notes, one after another
  function notes(S, list, len, gain, step, opts) {
    list.forEach(function (f, k) {
      var o = { type: (opts && opts.type) || 'square', when: ((opts && opts.when) || 0) + k * step };
      if (opts && opts.pan) o.pan = opts.pan;
      if (opts && opts.verb) o.verb = opts.verb;
      S.tone(f, len, gain, o);
    });
  }
  var tickN = 0, spinN = 0, drainT = 0;
  function drainSound(S) {
    S.tone(330, 0.7, 0.055, { type: 'triangle', to: 55 });
    S.tone(165, 0.7, 0.025, { type: 'square', to: 40, when: 0.05 });
    S.noise(0.5, 0.09, 500, { to: 60 });
  }

  // ---------------------------------------------------------------- Ember Peak's own sounds (true: played)
  var fullAt = 0;   // when the last full eruption began (the crater took the ball at full pressure)
  function ember(name, S, e, W) {
    var k, p, i;
    switch (name) {
      case 'bumper': {   // a fumarole: a pop of gas and a puff of steam, each vent its own pitch
        k = (e && e.i) || 0;
        if (!ready('bump' + k, 35)) return true;
        p = PAN.bump[k] == null ? 0 : PAN.bump[k];
        S.tone(150 + 25 * k, 0.12, 0.16, { type: 'sine', to: 50, pan: p });
        S.noise(0.05, 0.16, 900, { type: 'bandpass', q: 1.2, to: 300, pan: p });
        S.noise(0.22, 0.05, 5200, { type: 'highpass', to: 2400, when: 0.03, pan: p, verb: 0.12 });
        S.tone([523, 622, 698][k % 3], 0.06, 0.022, { type: 'triangle', to: [784, 932, 1047][k % 3], pan: p });
        return true;
      }
      case 'drop': {   // an obsidian target knocked down: a glassy clink and a clunk
        k = (e && e.i) || 0;
        S.noise(0.06, 0.18, 1600, { to: 220, pan: PAN.drops });
        S.tone(2637 - k * 110, 0.12, 0.03, { type: 'triangle', pan: PAN.drops, verb: 0.2 });
        S.tone(3951 - k * 160, 0.07, 0.012, { type: 'sine', when: 0.01, pan: PAN.drops });
        S.tone(170, 0.07, 0.06, { type: 'sine', to: 70, pan: PAN.drops });
        return true;
      }
      case 'drops': {   // all the obsidian down: a ringing run, and the kickback lights
        notes(S, [659, 784, 988, 1319, 1568], 0.12, 0.04, 0.06, { type: 'triangle', pan: PAN.drops * 0.5, verb: 0.35 });
        S.tone(110, 0.5, 0.08, { type: 'sine', to: 55, when: 0.05 });
        return true;
      }
      case 'crater': {   // the crater swallows the ball: a gulp, a thud deep down, then lava bubbling
        S.noise(0.45, 0.16, 3200, { type: 'lowpass', to: 90, pan: PAN.volcano });
        S.tone(420, 0.3, 0.07, { type: 'sine', to: 55, pan: PAN.volcano });
        S.tone(70, 0.25, 0.2, { type: 'sine', to: 32, when: 0.22, pan: PAN.volcano });
        for (i = 0; i < 5; i++) S.tone(180 + ((i * 7) % 5) * 45, 0.07, 0.035, { type: 'sine', to: 320 + i * 30, when: 0.45 + i * 0.13, pan: PAN.volcano, verb: 0.2 });
        return true;
      }
      case 'lavaopen': {   // a full eruption: the lava gates grind up (the boom comes when the crater fires)
        fullAt = now();
        S.tone(48, 0.6, 0.12, { type: 'sawtooth', to: 82 });
        S.noise(0.6, 0.12, 300, { type: 'bandpass', q: 2, to: 900 });
        for (i = 0; i < 6; i++) S.noise(0.04, 0.07, 2400, { type: 'bandpass', q: 3, to: 1200, when: 0.06 + i * 0.09 });
        notes(S, [262, 330, 392, 523, 659, 784], 0.14, 0.04, 0.07, { type: 'square', when: 0.15, verb: 0.3 });
        return true;
      }
      case 'lavaclose': {   // the gates grind back down
        if (!ready('lavagate', 400)) return true;
        S.tone(82, 0.5, 0.09, { type: 'sawtooth', to: 46 });
        S.noise(0.5, 0.09, 900, { type: 'bandpass', q: 2, to: 250 });
        return true;
      }
      case 'erupt': {   // the crater fires the ball skyward: a launch whoosh; after a full eruption, a boom with a sub-bass drop
        var big = fullAt && now() - fullAt < 4500;
        fullAt = 0;
        S.noise(0.7, 0.14, 220, { type: 'bandpass', q: 0.9, to: 5200, pan: PAN.volcano, verb: 0.2 });
        S.tone(140, 0.4, 0.09, { type: 'sawtooth', to: 900, pan: PAN.volcano, verb: 0.15 });
        S.tone(95, 0.3, 0.2, { type: 'sine', to: 40, pan: PAN.volcano });
        if (big) {
          S.tone(90, 1.4, 0.32, { type: 'sine', to: 26, attack: 0.005 });
          S.tone(45, 1.6, 0.18, { type: 'sine', to: 22, when: 0.05 });
          S.noise(1.5, 0.3, 2400, { type: 'lowpass', to: 60, verb: 0.35 });
          for (i = 0; i < 9; i++) S.noise(0.05, 0.08, 3000 + (i % 3) * 900, { type: 'highpass', to: 1400, when: 0.35 + i * 0.11, pan: ((i * 5) % 7 - 3) / 4 });
          notes(S, [523, 659, 784, 1047, 1319, 1568], 0.12, 0.045, 0.07, { when: 0.5, verb: 0.4 });
        }
        return true;
      }
      case 'rail': {   // on to the wire rail down the left side: a metal rattle the length of the ride
        if (!ready('rail', 800)) return true;
        for (i = 0; i < 18; i++) S.tone(2200 + ((i * 37) % 5) * 180, 0.025, 0.012 + 0.006 * (i % 2), { type: 'triangle', when: i * 0.08, pan: PAN.rail });
        S.noise(1.45, 0.035, 3800, { type: 'bandpass', q: 4, to: 2200, pan: PAN.rail });
        return true;
      }
      case 'railout': {   // off the rail into the inlane
        S.tone(160, 0.08, 0.07, { type: 'sine', to: 70, pan: PAN.rail });
        S.noise(0.05, 0.08, 2600, { to: 500, pan: PAN.rail });
        return true;
      }
      case 'puff': {   // the geyser catches the ball: a warning hiss that rises
        if (!ready('puff', 300)) return true;
        S.noise(0.42, 0.08, 1800, { type: 'highpass', to: 6500, pan: PAN.geyser });
        S.tone(90, 0.3, 0.06, { type: 'sine', to: 120, pan: PAN.geyser });
        return true;
      }
      case 'geyser': {   // the geyser blows: a blast of steam and a thump
        S.noise(0.7, 0.2, 7000, { type: 'bandpass', q: 0.7, to: 1300, pan: PAN.geyser, verb: 0.25 });
        S.tone(120, 0.18, 0.15, { type: 'sine', to: 45, pan: PAN.geyser });
        S.tone(1568, 0.2, 0.025, { type: 'triangle', when: 0.15, verb: 0.3 });
        return true;
      }
      case 'crab': {   // a magma crab hit: three quick claw clicks and a little hop
        if (!ready('crab', 120)) return true;
        k = (e && e.i) || 0;
        var c = W && W.toys && W.toys.crabs && W.toys.crabs[k];
        p = c ? panX(c.x) : 0;
        for (i = 0; i < 3; i++) S.tone(1900 + i * 260, 0.018, 0.035, { type: 'square', when: i * 0.045, pan: p });
        S.tone(330, 0.1, 0.04, { type: 'triangle', to: 660, when: 0.12, pan: p });
        return true;
      }
      case 'lava': {   // a lava lane made: a sizzle and a fanfare
        S.noise(0.5, 0.1, 6000, { type: 'highpass', to: 2500, verb: 0.2 });
        notes(S, [392, 523, 659, 784, 1047], 0.09, 0.05, 0.065, { verb: 0.3 });
        [784, 1047, 1319].forEach(function (f) { S.tone(f, 0.6, 0.028, { type: 'triangle', when: 0.33, verb: 0.45 }); });
        return true;
      }
      case 'quake': {   // the quake: the ground rumbles and rocks rattle
        if (!ready('quake', 600)) return true;
        S.noise(1.0, 0.24, 160, { type: 'lowpass', to: 40 });
        S.tone(38, 0.9, 0.22, { type: 'sine', to: 30 });
        S.tone(55, 0.8, 0.08, { type: 'sawtooth', to: 40, when: 0.1 });
        for (i = 0; i < 7; i++) S.noise(0.05, 0.06, 1800 + (i % 3) * 600, { type: 'bandpass', q: 2, to: 600, when: 0.1 + i * 0.12, pan: ((i * 3) % 5 - 2) / 3 });
        return true;
      }
      case 'quakeend': return true;   // (the rumble under the table fades on its own)
      case 'pressure': {   // the pressure gauge: full (ERUPT NOW) is a rising call; past full, a warning
        if (e && e.level === 'warn') {
          S.tone(880, 0.1, 0.04, { type: 'square' }); S.tone(880, 0.1, 0.04, { type: 'square', when: 0.16 });
          S.noise(0.4, 0.06, 1500, { type: 'highpass', to: 5000 });
        } else {
          S.tone(110, 0.6, 0.1, { type: 'sawtooth', to: 220 });
          notes(S, [392, 494, 587, 784], 0.12, 0.045, 0.09, { verb: 0.3 });
        }
        return true;
      }
      case 'overload': {   // too much pressure: a quake is coming, the kickback goes off
        S.tone(660, 0.25, 0.05, { type: 'sawtooth', to: 330 });
        S.tone(520, 0.3, 0.05, { type: 'sawtooth', to: 260, when: 0.28 });
        S.noise(0.8, 0.12, 200, { type: 'lowpass', to: 50, when: 0.1 });
        return true;
      }
      case 'ramp': {   // the summit ramp made: a climbing whoosh and a bright two-note call
        S.tone(220, 0.35, 0.035, { type: 'sawtooth', to: 1400, verb: 0.3 });
        S.noise(0.3, 0.06, 1200, { type: 'bandpass', q: 1, to: 5000, verb: 0.2 });
        S.tone(1319, 0.22, 0.05, { type: 'triangle', when: 0.3, verb: 0.35 });
        S.tone(1976, 0.3, 0.035, { type: 'triangle', when: 0.38, verb: 0.35 });
        return true;
      }
    }
    return false;
  }

  // ---------------------------------------------------------------- the rumble under Ember Peak (every frame)
  // A long-running low noise and a sub tone through the cabinet's own limiter. Its loudness follows the volcano's
  // pressure, swells while the crater holds the ball and in a quake, and fades out away from play or with sound off.
  var RUM = null;
  function rumbleNodes(a, bus) {
    try {
      var len = Math.floor(a.sampleRate * 2), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0), last = 0;
      for (var i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }   // brown noise
      var src = a.createBufferSource(), lp = a.createBiquadFilter(), o = a.createOscillator(), og = a.createGain(), out = a.createGain();
      src.buffer = buf; src.loop = true; lp.type = 'lowpass'; lp.frequency.value = 110; lp.Q.value = 0.8;
      o.type = 'sine'; o.frequency.value = 34; og.gain.value = 0.35; out.gain.value = 0.0001;
      src.connect(lp); lp.connect(out); o.connect(og); og.connect(out); out.connect(bus || a.destination);
      src.start(); o.start();
      return { a: a, out: out, lp: lp, o: o, level: 0 };
    } catch (e) { return null; }
  }
  function rumbleWant(W, mode, set) {   // how loud the rumble should be now (0 - about 0.4)
    var V = W && W.toys && W.toys.volcano;
    if (!V || mode !== 'play' || W.over || (set && set.sound === false)) return 0;
    var p = Math.min(1.5, V.pressure || 0), want = p < 0.05 ? 0 : 0.05 + 0.2 * Math.min(1, p) * Math.min(1, p) + (p > 1 ? 0.24 * (p - 1) : 0);
    if (V.busy && V.hold > 0) want = Math.max(want, 0.12 + 0.25 * (1 - Math.min(1, V.hold / 165)));
    var Q = W.toys.quake; if (Q && Q.t > 0) want = Math.max(want, 0.4);
    if (W.state === 'bonus') want *= 0.3;
    return want;
  }
  function frame(W, S, mode, set) {
    if (!S) return;
    var want = rumbleWant(W, mode, set);
    if (!RUM) {
      if (want <= 0 || !S.ctx) return;
      var a = S.ctx(); if (!a) return;
      RUM = rumbleNodes(a, S.bus && S.bus());
      if (!RUM) return;
    }
    if (Math.abs(want - RUM.level) < 0.004) return;
    RUM.level = want;
    try {
      var t = RUM.a.currentTime;
      RUM.out.gain.setTargetAtTime(Math.max(0.0001, want), t, want > 0 ? 0.25 : 0.4);
      RUM.lp.frequency.setTargetAtTime(90 + 140 * Math.min(1, want / 0.4), t, 0.3);
      RUM.o.frequency.setTargetAtTime(30 + 10 * Math.min(1, want / 0.4), t, 0.5);
    } catch (e) {}
  }

  function sound(name, S, e, W) {
    if (!S) return;
    var k, p;
    PAN = places(W);
    if (PAN.ember && ember(name, S, e, W)) return;
    switch (name) {
      // ---------------------------------------------------------------- the machine
      case 'flip': {   // the flipper's coil: a hard clack and a short thunk, on its own side
        p = ((e && e.side) || 0) * 0.55;
        S.noise(0.045, 0.22, 2600, { type: 'bandpass', q: 1.3, to: 900, pan: p });
        S.tone(150, 0.07, 0.07, { type: 'triangle', to: 70, pan: p });
        break;
      }
      case 'launch': {   // the plunger: a harder pull is a bigger thump and a longer whoosh up the lane
        k = e && e.p >= 0 ? clamp(e.p, 0, 1) : 0.65;   // (-1: a quick tap or the machine's own shot, a medium one)
        S.tone(105 + 45 * k, 0.12, 0.1 + 0.1 * k, { type: 'sine', to: 45, pan: PAN.shooter });
        S.tone(420 + 300 * k, 0.08, 0.018 + 0.02 * k, { type: 'triangle', to: 180, pan: PAN.shooter });
        S.noise(0.22 + 0.25 * k, 0.05 + 0.1 * k, 500 + 1200 * k, { type: 'bandpass', q: 0.8, to: 2600 + 3000 * k, pan: PAN.shooter * 0.8, verb: 0.12 });
        break;
      }
      case 'sling': {   // the slingshot: a snap of rubber and a kick
        p = ((e && e.side) || 0) * 0.6;
        S.noise(0.05, 0.24, 3800, { type: 'highpass', to: 1500, pan: p });
        S.tone(420, 0.06, 0.05, { type: 'square', to: 170, pan: p });
        S.tone(95, 0.06, 0.08, { type: 'sine', to: 50, pan: p });
        break;
      }
      case 'rubber':
      case 'wall': {   // the ball against rubber (a soft thud) or the steel guides (a bright tick), by how hard it hit
        if (!ready('hit', 50)) break;
        k = clamp((((e && e.v) || 400) - 380) / 1400, 0, 1);
        if (name === 'rubber') {
          S.tone(250 + 120 * k, 0.05, 0.025 + 0.045 * k, { type: 'sine', to: 130 });
          S.noise(0.04, 0.04 + 0.09 * k, 1200, { to: 300 });
        } else {
          S.tone(1900 + 600 * k, 0.03, 0.01 + 0.022 * k, { type: 'triangle' });
          S.tone(2870 + 400 * k, 0.02, 0.005 + 0.01 * k, { type: 'sine' });
          S.noise(0.03, 0.03 + 0.07 * k, 4500, { type: 'bandpass', q: 2, to: 2500 });
        }
        break;
      }
      case 'bumper': {   // an orb bumper: a deep thump, and each orb its own little note
        k = (e && e.i) || 0;
        if (!ready('bump' + k, 35)) break;
        p = PAN.bump[k] == null ? panX(180) : PAN.bump[k];
        S.tone(180, 0.16, 0.17, { type: 'sine', to: 55, pan: p });
        S.noise(0.09, 0.15, 1800, { to: 150, pan: p });
        var N = [659, 784, 988][k % 3];
        S.tone(N, 0.08, 0.03, { type: 'square', to: N * 1.5, pan: p, verb: 0.15 });
        break;
      }
      case 'drop': {   // an invader target knocked down: a clunk, and an invader's blip
        k = (e && e.i) || 0;
        S.noise(0.07, 0.2, 1400, { to: 200, pan: PAN.drops });
        S.tone(190, 0.08, 0.07, { type: 'square', to: 80, pan: PAN.drops });
        S.tone(520 + k * 90, 0.06, 0.025, { type: 'square', to: 260 + k * 45, when: 0.02, pan: PAN.drops });
        break;
      }
      case 'reset': {   // the five targets spring back up
        for (k = 0; k < 5; k++) S.noise(0.03, 0.11, 2200, { type: 'bandpass', q: 1.5, to: 800, when: k * 0.035, pan: PAN.drops });
        S.tone(140, 0.08, 0.05, { type: 'square', to: 220, pan: PAN.drops });
        break;
      }
      case 'spin': {   // the comet spinner ticking round (at most 35 ticks a second)
        if (!ready('spin', 28)) break;
        spinN++;
        S.tone(spinN & 1 ? 2400 : 2150, 0.014, 0.022, { type: 'square', pan: PAN.spin });
        break;
      }
      case 'eject': {   // the hangar kicks the ball back out
        S.tone(130, 0.12, 0.2, { type: 'sine', to: 45, pan: PAN.saucer });
        S.noise(0.08, 0.2, 2200, { to: 300, pan: PAN.saucer });
        S.tone(300, 0.12, 0.03, { type: 'square', to: 900, pan: PAN.saucer });
        break;
      }
      case 'kickback': {   // the left outlane fires the ball back up: a big thump and a zap
        S.tone(110, 0.14, 0.22, { type: 'sine', to: 40, pan: PAN.kick });
        S.noise(0.07, 0.22, 2600, { to: 400, pan: PAN.kick });
        S.tone(250, 0.22, 0.04, { type: 'square', to: 1400, pan: PAN.kick * 0.75, verb: 0.2 });
        break;
      }
      case 'nudge': {   // a shove on the cabinet
        S.noise(0.14, 0.25, 420, { to: 60 });
        S.tone(75, 0.14, 0.16, { type: 'sine', to: 40 });
        break;
      }
      case 'search': {   // the machine shakes a stuck ball loose
        S.noise(0.1, 0.12, 600, { to: 80 });
        S.tone(220, 0.1, 0.02, { type: 'square', to: 440 });
        break;
      }

      // ---------------------------------------------------------------- the shots
      case 'rampin': {   // onto the warp ramp: a whoosh that rises as it climbs
        S.noise(0.45, 0.08, 300, { type: 'bandpass', q: 1.4, to: 2400, verb: 0.15 });
        S.tone(160, 0.45, 0.022, { type: 'sawtooth', to: 640, verb: 0.15 });
        break;
      }
      case 'ramp': {   // made it: the warp, and a chime as it lands in the left inlane
        S.tone(300, 0.35, 0.035, { type: 'sawtooth', to: 1800, verb: 0.3 });
        S.noise(0.3, 0.06, 1500, { type: 'bandpass', q: 1, to: 6000, verb: 0.2 });
        S.tone(1568, 0.25, 0.05, { type: 'triangle', when: 0.3, verb: 0.35 });
        S.tone(2093, 0.3, 0.035, { type: 'triangle', when: 0.38, verb: 0.35 });
        break;
      }
      case 'combo': {   // the ramp again, quickly: the warp and a run of notes, higher and longer the bigger the combo
        k = clamp((e && e.n) || 2, 2, 5);
        var base = 523 * Math.pow(2, (k - 2) * 3 / 12);
        S.tone(300 + 100 * k, 0.3, 0.035, { type: 'sawtooth', to: 1800 + 300 * k, verb: 0.3 });
        notes(S, [1, 1.26, 1.5, 2, 2.52, 3].slice(0, k + 1).map(function (m) { return base * m; }), 0.08, 0.045, 0.055, { when: 0.22, verb: 0.3 });
        break;
      }
      case 'rampfail': {   // not fast enough: it rolls back down
        S.noise(0.4, 0.07, 2000, { type: 'bandpass', q: 1.2, to: 250 });
        S.tone(330, 0.35, 0.03, { type: 'triangle', to: 110 });
        S.tone(262, 0.16, 0.025, { type: 'square', when: 0.35 });
        S.tone(196, 0.3, 0.025, { type: 'square', when: 0.52 });
        break;
      }
      case 'saucer':
      case 'jackpot': {   // into the hangar: sucked in with a thud (lit: the jackpot fanfare too)
        S.noise(0.4, 0.14, 3500, { type: 'lowpass', to: 120, pan: PAN.saucer });
        S.tone(500, 0.35, 0.05, { type: 'sine', to: 70, pan: PAN.saucer });
        S.tone(90, 0.1, 0.12, { type: 'sine', to: 50, when: 0.3, pan: PAN.saucer });
        if (name === 'jackpot') {
          notes(S, [523, 659, 784, 1047, 1319], 0.1, 0.05, 0.08, { when: 0.35, verb: 0.3 });
          [1047, 1319, 1568].forEach(function (f) { S.tone(f, 0.8, 0.03, { type: 'triangle', when: 0.78, verb: 0.5 }); });
        }
        break;
      }
      case 'drops': {   // all five invaders down: the hangar opens
        notes(S, [392, 523, 659, 784, 1047], 0.09, 0.045, 0.07, { pan: PAN.drops * 0.5, verb: 0.25 });
        S.noise(0.5, 0.06, 400, { type: 'bandpass', q: 1, to: 3000, when: 0.3, verb: 0.2 });
        break;
      }
      case 'orbit': {   // round an orbit: a sweep
        S.tone(400, 0.3, 0.035, { type: 'triangle', to: 1400 });
        S.noise(0.3, 0.05, 800, { type: 'bandpass', q: 2, to: 4000 });
        break;
      }
      case 'loop': {   // up one orbit and round the other: two sweeps, across from side to side
        S.tone(300, 0.25, 0.035, { type: 'sawtooth', to: 1200, pan: -0.7 });
        S.tone(600, 0.3, 0.035, { type: 'sawtooth', to: 2400, pan: 0.7, when: 0.18, verb: 0.25 });
        S.tone(2093, 0.3, 0.035, { type: 'triangle', when: 0.45, verb: 0.35 });
        break;
      }
      case 'skill': {   // the skill shot: a fanfare
        notes(S, [523, 659, 784, 1047], 0.1, 0.05, 0.075, { verb: 0.25 });
        [1047, 1319, 1568].forEach(function (f) { S.tone(f, 0.6, 0.03, { type: 'triangle', when: 0.32, verb: 0.45 }); });
        break;
      }
      case 'lane': {   // a top lane lit: a ding
        S.tone(1568, 0.3, 0.045, { type: 'triangle', pan: PAN.lanes, verb: 0.2 });
        S.tone(3136, 0.18, 0.012, { type: 'sine', pan: PAN.lanes });
        break;
      }
      case 'mult': {   // all three lanes: the bonus multiplier goes up
        notes(S, [659, 880, 1175, 1760], 0.09, 0.045, 0.06, { pan: PAN.lanes, verb: 0.25 });
        S.tone(1760, 0.4, 0.02, { type: 'triangle', when: 0.24, verb: 0.4 });
        break;
      }
      case 'inlane': {
        S.tone(988, 0.07, 0.028, { type: 'triangle' });
        S.tone(1319, 0.08, 0.024, { type: 'triangle', when: 0.05 });
        break;
      }
      case 'outlane': {   // heading for the drain
        S.tone(196, 0.18, 0.045, { type: 'square', to: 147 });
        S.noise(0.12, 0.05, 900, { to: 200 });
        break;
      }
      case 'save': {   // ball saved: a cheerful jingle (and no drain sound - it came in the same step, just before)
        if (drainT) { clearTimeout(drainT); drainT = 0; }
        notes(S, [784, 988, 1175, 1568], 0.08, 0.045, 0.07, {});
        S.tone(1568, 0.35, 0.03, { type: 'triangle', when: 0.28, verb: 0.35 });
        break;
      }
      case 'extra': {   // an extra ball (and the Hall of Fame's own sound): the knocker, then a run of notes
        S.noise(0.12, 0.3, 500, { to: 60 });
        S.tone(80, 0.15, 0.2, { type: 'sine', to: 40 });
        notes(S, [523, 659, 784, 1047, 784, 1047], 0.1, 0.05, 0.09, { when: 0.12 });
        break;
      }

      // ---------------------------------------------------------------- warnings and the ball's comings and goings
      case 'warn': {   // too many nudges: two short buzzes
        S.tone(150, 0.12, 0.055, { type: 'sawtooth' });
        S.tone(150, 0.12, 0.055, { type: 'sawtooth', when: 0.18 });
        break;
      }
      case 'tilt': {   // TILT: a long, low buzz as the flippers go dead
        S.tone(62, 0.9, 0.08, { type: 'sawtooth' });
        S.tone(65, 0.9, 0.06, { type: 'square' });
        S.noise(0.9, 0.05, 300, { to: 200 });
        break;
      }
      case 'drain': {   // the ball is gone - unless ball save brings it straight back ('save' comes in the same step, so
        // the sound waits for the rest of the step's events before it plays)
        if (drainT) clearTimeout(drainT);
        drainT = setTimeout(function () { drainT = 0; drainSound(S); }, 0);
        break;
      }
      case 'ballend': {   // the end of a ball (after the drain): three falling notes as the bonus comes up
        notes(S, [523, 392, 262], 0.16, 0.035, 0.14, { type: 'triangle', when: 0.35 });
        tickN = 0;
        break;
      }
      case 'tick': {   // the bonus counting up
        tickN++;
        S.tone(900 + (tickN % 8) * 60, 0.03, 0.028, { type: 'square' });
        break;
      }
      case 'newball': {   // the next ball rolls into the shooter lane
        S.tone(659, 0.08, 0.04, { type: 'triangle' });
        S.tone(988, 0.12, 0.04, { type: 'triangle', when: 0.08 });
        S.noise(0.04, 0.12, 2000, { type: 'bandpass', q: 1, to: 800, when: 0.2, pan: PAN.shooter });
        break;
      }
      case 'over': {   // game over
        notes(S, [523, 440, 349, 262], 0.3, 0.055, 0.26, { type: 'triangle' });
        S.tone(131, 0.7, 0.03, { type: 'square', when: 1.05, verb: 0.3 });
        break;
      }
    }
  }

  root.PinSound = { sound: sound, frame: frame, want: rumbleWant, get rumble() { return RUM ? RUM.level : 0; } };
})(typeof self !== 'undefined' ? self : this);
