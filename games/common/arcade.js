/* 365 Games - the arcade cabinet shared by the 80s-style games (3 Oct 2026; 365 Invaders first). The same bar and pop-up
 * sheets as the card games (table.css, plus arcade.css), and underneath them: a fixed 60-steps-a-second game loop drawn
 * at the game's own small size and blown up with crisp square pixels, keyboard / mouse / touch controls, Pause (also when
 * the window loses focus), sounds made on the spot, a Gentle / Classic / Fast speed, and personal scores kept in this
 * browser only. Nothing is sent anywhere.
 *
 * The game's def supplies: id, store, title, width, height (the game's own pixels), speeds {options, def}, newWorld(speed),
 * step(world, input), draw(g, world, t), hud(world) -> {score, lives, wave}, sound(name, kit, event), help (list), and
 * optionally titleText, keysText, touchText, legend [{rows, colour, text}], overText(world).
 * The game reports what happened by pushing onto world.events: a sound name, {sfx, ...} or {say: 'words'};
 * world.over = true ends the game. */
(function () {
  'use strict';
  function esc(s) { return String(s).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); }
  var ICON = {
    play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l12.5-7.5z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="4.5" width="4" height="15" rx="1"/><rect x="14" y="4.5" width="4" height="15" rx="1"/></svg>',
    stats: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/></svg>',
    set: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
    help: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><path d="M9.2 9.2a2.9 2.9 0 0 1 5.6 1c0 1.9-2.8 2.6-2.8 4.3M12 17.6h.01"/></svg>',
    full: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"/></svg>',
    'new': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>'
  };

  // pixel art: rows of '#' and '.' -> a small canvas the size of the art, in one colour
  function sprite(rows, colour) {
    var h = rows.length, w = rows[0].length, cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    var x = cv.getContext('2d'); x.fillStyle = colour;
    for (var r = 0; r < h; r++) for (var c = 0; c < w; c++) if (rows[r].charAt(c) === '#') x.fillRect(c, r, 1, 1);
    return cv;
  }

  function start(D) {
    var $ = function (id) { return document.getElementById(id); };
    function load(k, d) { try { var v = localStorage.getItem(D.store + ':' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
    function save(k, v) { try { localStorage.setItem(D.store + ':' + k, JSON.stringify(v)); } catch (e) {} }
    var SET = { speed: D.speeds.def, sound: true };
    var EXTRA = D.settings || [];   // the game's own settings: {key, type: 'seg'|'switch', label, small, options, def}
    EXTRA.forEach(function (o) { SET[o.key] = o.def; });
    (function () { var s = load('settings', null); if (s && typeof s === 'object') for (var k in SET) if (k in s) SET[k] = s[k]; })();
    if (!D.speeds.options.some(function (o) { return o[0] === SET.speed; })) SET.speed = D.speeds.def;
    EXTRA.forEach(function (o) { if (o.type === 'seg' && !o.options.some(function (x) { return x[0] === SET[o.key]; })) SET[o.key] = o.def; });
    // which best-score slot a game counts towards (a game with styles keeps each style's scores apart)
    var WORD = D.waveWord || 'wave', WORDC = WORD.charAt(0).toUpperCase() + WORD.slice(1);   // what a game calls its stages
    function skey(w) { return D.statKey ? D.statKey(w) : 'v' + w.speed; }
    function skeyFor(speed) { return D.statKeyFor ? D.statKeyFor(SET, speed) : 'v' + speed; }
    function blank() { return { v: 1, played: 0, waves: 0, best: {}, daily: {} }; }
    var ST = blank();
    (function () { var s = load('stats', null); if (s && s.v === 1) for (var k in ST) if (k in s) ST[k] = s[k]; })();
    function today(d) { d = d || new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }

    buildUI();
    var cv = $('screen'), g = cv.getContext('2d'), stage = $('stage'), pad = $('pad');
    // the game draws at its own size on a hidden canvas; the screen shows it blown up with square pixels
    var buf = document.createElement('canvas'); buf.width = D.width; buf.height = D.height;
    var bg = buf.getContext('2d'), mid = document.createElement('canvas'), mg = mid.getContext('2d');
    var W = null, mode = 'title';   // title | play | paused | over
    var input = { left: false, right: false, fire: false, tap: false, up: false, down: false, mouseX: null };   // tap: a press too quick to last a whole step still counts
    var gestured = false;

    // ------------------------------------------------------------ the screen: as big as fits, whole-number pixels when it can
    function fit() {
      var bw = stage.clientWidth - 16, bh = stage.clientHeight - 16 - (pad.offsetParent ? pad.offsetHeight + 10 : 0);
      var dpr = Math.min(3, window.devicePixelRatio || 1);
      var s = Math.max(0.5, Math.min(bw / D.width, bh / D.height)), whole = Math.floor(s * dpr) / dpr;
      if (whole * dpr >= 2 && whole / s > 0.86) s = whole;   // a whole number of screen pixels per game pixel looks crisper
      var cssW = Math.floor(D.width * s), cssH = Math.floor(D.height * s);
      cv.style.width = cssW + 'px'; cv.style.height = cssH + 'px';
      cv.width = Math.round(cssW * dpr); cv.height = Math.round(cssH * dpr);
      $('screenwrap').style.width = cssW + 'px'; $('screenwrap').style.height = cssH + 'px';
      draw(performance.now());
    }
    window.addEventListener('resize', fit);
    // the space can change without a resize (the bar re-wraps once the fonts arrive): measure again whenever it does
    if (window.ResizeObserver) new ResizeObserver(function () { fit(); }).observe(stage);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { fit(); });

    // ------------------------------------------------------------ controls: keyboard, mouse, touch
    var KEYS = { arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right', ' ': 'fire', arrowup: 'up', w: 'up', arrowdown: 'down', s: 'down' };
    document.addEventListener('keydown', function (e) {
      gestured = true;
      if (e.key === 'Escape' && openSheet) { closeSheets(); return; }
      if (openSheet || e.altKey || e.ctrlKey || e.metaKey) return;
      var k = (e.key || '').toLowerCase();
      if (k === 'p' || k === 'escape') { togglePause(); e.preventDefault(); return; }
      if (k === 'f') { toggleFull(); return; }
      if ((k === 'n' || k === 'enter') && (mode === 'title' || mode === 'over')) { e.preventDefault(); begin(); return; }
      if (k === 'enter' && mode === 'paused') { e.preventDefault(); resume(); return; }
      var a = KEYS[k];
      if (!a) return;
      e.preventDefault();   // Space never presses whichever button has focus, arrows never scroll
      if (mode === 'title' || mode === 'over') { if (a === 'fire') begin(); return; }
      if (mode === 'paused') { if (a === 'fire') resume(); return; }
      input[a] = true; if (a === 'fire') input.tap = true; if (a === 'left' || a === 'right') input.mouseX = null;
    });
    document.addEventListener('keyup', function (e) { var a = KEYS[(e.key || '').toLowerCase()]; if (a) { input[a] = false; e.preventDefault(); } });
    function logicalX(clientX) { var r = cv.getBoundingClientRect(); return (clientX - r.left) / r.width * D.width; }
    var touching = null;
    stage.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'mouse' || touching === e.pointerId) input.mouseX = logicalX(e.clientX);
    });
    cv.addEventListener('pointerdown', function (e) {
      gestured = true;
      if (mode === 'title' || mode === 'over') { begin(); return; }
      if (mode === 'paused') { resume(); return; }
      input.mouseX = logicalX(e.clientX); input.fire = true; input.tap = true;
      if (e.pointerType !== 'mouse') touching = e.pointerId;   // a finger on the screen: the ship follows it and fires
      try { cv.setPointerCapture(e.pointerId); } catch (er) {}
      e.preventDefault();
    });
    function lift(e) { if (e.pointerType !== 'mouse' && touching === e.pointerId) { touching = null; input.mouseX = null; } input.fire = false; }
    cv.addEventListener('pointerup', lift); cv.addEventListener('pointercancel', lift);
    cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-pad]'), function (b) {
      var a = b.getAttribute('data-pad');
      var on = function (e) { e.preventDefault(); gestured = true; if (mode === 'title' || mode === 'over') { if (a === 'fire') begin(); return; } if (mode === 'paused') { resume(); return; } input[a] = true; if (a === 'fire') input.tap = true; input.mouseX = null; b.classList.add('on'); };
      var off = function (e) { e.preventDefault(); input[a] = false; b.classList.remove('on'); };
      b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off);
      b.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    });
    var touchy = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
    if (touchy) document.body.classList.add('touchy');
    window.addEventListener('pointerdown', function (e) {   // a touch laptop: show the buttons on the first touch
      if (e.pointerType === 'touch' && !document.body.classList.contains('touchy')) { document.body.classList.add('touchy'); fit(); }
    }, true);

    // ------------------------------------------------------------ the loop: 60 steps a second, whatever the screen's rate
    var last = 0, acc = 0, STEP = 1000 / 60;
    function frame(t) {
      requestAnimationFrame(frame);
      if (!last) last = t;
      var dt = Math.min(250, t - last); last = t;
      if (mode === 'play') {
        acc += dt;
        var n = 0;
        while (acc >= STEP && n < 8) { D.step(W, input); input.tap = false; acc -= STEP; n++; handle(); if (mode !== 'play') break; }
        if (n === 8) acc = 0;   // a slow PC: drop the backlog rather than race to catch up
      } else acc = 0;
      draw(t);
      if (D.frameAudio && W) { try { D.frameAudio(W, KIT, mode, SET); } catch (e) {} }   // music that follows the game
    }
    function draw(t) {
      if (!W) return;
      var info = { best: Math.max(W.score || 0, (ST.best[skey(W)] || {}).score || 0), set: SET };
      if (D.hires && D.hires(SET, W)) {   // the game draws straight onto the screen at full sharpness (it is told the scale)
        g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        info.scale = cv.width / D.width; info.dw = cv.width; info.dh = cv.height;
        g.save(); D.draw(g, W, t || 0, mode, info); g.restore();
        return;
      }
      bg.save(); D.draw(bg, W, t || 0, mode, info); bg.restore();
      g.setTransform(1, 0, 0, 1, 0, 0);
      var dev = cv.width / D.width;   // screen pixels per game pixel
      if (Math.abs(dev - Math.round(dev)) < 0.02 || dev < 1) { g.imageSmoothingEnabled = false; g.drawImage(buf, 0, 0, cv.width, cv.height); }
      else {   // in between (2.9x, say): square pixels at the next whole size, then a gentle shrink, so no column comes out thinner
        var k = Math.ceil(dev);
        if (mid.width !== D.width * k) { mid.width = D.width * k; mid.height = D.height * k; }
        mg.imageSmoothingEnabled = false; mg.drawImage(buf, 0, 0, mid.width, mid.height);
        g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(mid, 0, 0, cv.width, cv.height);
      }
    }
    function handle() {   // what the game says happened this step
      var ev = W.events;
      if (ev && ev.length) {
        for (var i = 0; i < ev.length; i++) {
          var e = ev[i];
          if (typeof e === 'string') sfx(e);
          else if (e && e.say) say(e.say, !!(D.quietSay && D.quietSay(W)));   // a game that shows its own messages on screen keeps these for screen readers only
          else if (e && e.sfx) sfx(e.sfx, e);
        }
        ev.length = 0;
      }
      hud();
      if (W.over) gameOver();
    }
    var lastHud = '';
    function hud() {
      var h = D.hud(W), b = (ST.best[skey(W)] || {}).score || 0, key = h.score + '|' + h.lives + '|' + h.wave + '|' + b;
      if (key === lastHud) return; lastHud = key;
      $('vScore').textContent = h.score; $('vBest').textContent = Math.max(b, h.score); $('vLives').textContent = h.lives; $('vWave').textContent = h.wave;
    }

    // ------------------------------------------------------------ game states
    function begin() {
      closeSheets();
      W = D.newWorld(SET.speed, SET);
      mode = 'play'; acc = 0; last = 0; input.fire = false;
      showOverlay('');
      $('bPause').disabled = false; setPauseBtn();
      try { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); cv.focus({ preventScroll: true }); } catch (e) {}
      lastHud = ''; hud();
    }
    function togglePause() { if (mode === 'play') pause(); else if (mode === 'paused') resume(); }
    function pause() {
      if (mode !== 'play') return;
      mode = 'paused'; input.left = input.right = input.fire = input.up = input.down = false;
      setPauseBtn(); showOverlay('paused'); sfx('pause');
    }
    function resume() {
      if (mode !== 'paused') return;
      closeSheets(); mode = 'play'; last = 0; setPauseBtn(); showOverlay('');
      try { cv.focus({ preventScroll: true }); } catch (e) {}
    }
    function setPauseBtn() { var p = mode === 'paused'; $('bPause').innerHTML = (p ? ICON.play : ICON.pause) + '<span class="lbl">' + (p ? 'Carry on' : 'Pause') + '</span>'; }
    function gameOver() {
      mode = 'over';
      var h = D.hud(W), key = skey(W), b = ST.best[key] || (ST.best[key] = {}), badges = [], d = today();
      ST.played++; ST.waves += Math.max(0, h.wave - 1);
      if (ST.played === 1) badges.push('Your first game!');
      if (b.score == null || h.score > b.score) { if (b.score != null && h.score > 0) badges.push('Your best score yet!'); b.score = h.score; }
      if (b.wave == null || h.wave > b.wave) { if (b.wave != null && h.wave > 1) badges.push('Your furthest yet: ' + WORD + ' ' + h.wave); b.wave = h.wave; }
      if (ST.daily[d] == null || h.score > ST.daily[d]) ST.daily[d] = h.score;
      var keep = Object.keys(ST.daily).sort().slice(-60), nd = {}; keep.forEach(function (k) { nd[k] = ST.daily[k]; }); ST.daily = nd;
      save('stats', ST);
      setPauseBtn(); $('bPause').disabled = true;
      $('oScore').textContent = h.score; $('oWave').textContent = h.wave; $('oBest').textContent = b.score;
      $('oWhy').textContent = D.overText ? D.overText(W) : 'Game over';
      $('oBadges').innerHTML = badges.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('');
      showOverlay('over'); lastHud = ''; hud();
      setTimeout(function () { if (mode === 'over') try { $('oPlay').focus({ preventScroll: true }); } catch (e) {} }, 600);
    }
    function showOverlay(which) { ['title', 'paused', 'over'].forEach(function (k) { $('ov_' + k).hidden = k !== which; }); }
    document.addEventListener('visibilitychange', function () { if (document.hidden) pause(); });
    window.addEventListener('blur', function () { pause(); });

    // ------------------------------------------------------------ sound: made on the spot, nothing downloaded
    var AC = null, NOISE = null, BUS = null, VERB = null;
    function ac() {
      if (!SET.sound || !gestured) return null;
      try { if (!AC) { var C = window.AudioContext || window.webkitAudioContext; if (!C) return null; AC = new C(); chain(AC); } if (AC.state === 'suspended') AC.resume(); } catch (e) { return null; }
      return AC;
    }
    // everything plays through one gentle limiter (so a big explosion never distorts), with an echo send for size
    function chain(a) {
      try {
        var comp = a.createDynamicsCompressor();
        comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2;
        BUS = a.createGain(); BUS.gain.value = 0.9; BUS.connect(comp); comp.connect(a.destination);
        var room = a.createConvolver(), len = Math.floor(a.sampleRate * 1.6), ir = a.createBuffer(2, len, a.sampleRate);
        for (var c = 0; c < 2; c++) { var d = ir.getChannelData(c); for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
        room.buffer = ir; VERB = a.createGain(); VERB.gain.value = 0.32; VERB.connect(room); room.connect(BUS);
      } catch (e) { BUS = a.destination; VERB = null; }
    }
    function route(a, node, opts) {   // opts.pan: -1 (left) .. 1 (right); opts.verb: how much echo
      var out = node;
      if (opts.pan && a.createStereoPanner) { var p = a.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, opts.pan)); node.connect(p); out = p; }
      out.connect(BUS || a.destination);
      if (opts.verb && VERB) { var s = a.createGain(); s.gain.value = opts.verb; out.connect(s); s.connect(VERB); }
    }
    var KIT = {
      tone: function (freq, dur, gain, opts) {   // opts: {type, to (slide to this pitch), when (seconds from now), pan, verb, attack}
        var a = ac(); if (!a) return; opts = opts || {};
        try {
          var t = a.currentTime + (opts.when || 0), o = a.createOscillator(), gn = a.createGain();
          o.type = opts.type || 'square'; o.frequency.setValueAtTime(freq, t);
          if (opts.detune) o.detune.setValueAtTime(opts.detune, t);
          if (opts.to) o.frequency.exponentialRampToValueAtTime(opts.to, t + dur);
          gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(gain, t + (opts.attack || 0.01)); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
          o.connect(gn); route(a, gn, opts); o.start(t); o.stop(t + dur + 0.03);
        } catch (e) {}
      },
      noise: function (dur, gain, freq, opts) {   // opts: {type: lowpass|bandpass|highpass, q, to (end frequency), when, pan, verb}
        var a = ac(); if (!a) return; opts = opts || {};
        try {
          if (!NOISE) { var len = Math.floor(a.sampleRate * 1.5), dd; NOISE = a.createBuffer(1, len, a.sampleRate); dd = NOISE.getChannelData(0); for (var i = 0; i < len; i++) dd[i] = Math.random() * 2 - 1; }
          var t = a.currentTime + (opts.when || 0), s = a.createBufferSource(), f = a.createBiquadFilter(), gn = a.createGain();
          s.buffer = NOISE; f.type = opts.type || 'lowpass'; if (opts.q) f.Q.value = opts.q;
          f.frequency.setValueAtTime(freq || 3000, t); f.frequency.exponentialRampToValueAtTime(opts.to || 120, t + dur);
          gn.gain.setValueAtTime(gain, t); gn.gain.exponentialRampToValueAtTime(0.0008, t + dur);
          s.connect(f); f.connect(gn); route(a, gn, opts); s.start(t, Math.random() * 0.3); s.stop(t + dur + 0.03);
        } catch (e) {}
      },
      ctx: function () { return ac(); },          // for a game's own long-running sounds (music)
      existing: function () { return AC; },       // ...and to fade them out even when sound has just been switched off
      bus: function () { return BUS; }
    };
    function sfx(name, e) { if (!SET.sound) return; if (name === 'pause') { KIT.tone(440, 0.08, 0.04, { type: 'triangle' }); return; } D.sound(name, KIT, e); }

    // ------------------------------------------------------------ sheets
    var openSheet = null, lastFocus = null;
    function openD(id) {
      if (mode === 'play') pause();
      closeSheets();
      var d = $(id); d.hidden = false; openSheet = d; lastFocus = document.activeElement;
      var f = d.querySelector('.btn.go') || d.querySelector('button'); if (f) f.focus();
    }
    function closeSheets() { if (!openSheet) return; openSheet.hidden = true; openSheet = null; if (lastFocus && lastFocus.focus && document.body.contains(lastFocus)) { try { lastFocus.focus(); } catch (e) {} } }
    document.addEventListener('click', function (e) {
      var t = e.target;
      if (t.closest && t.closest('[data-close]')) { closeSheets(); return; }
      if (t.classList && t.classList.contains('scrim')) { closeSheets(); return; }
      var b = t.closest ? t.closest('[data-speed],[data-set],[data-opt]') : null; if (!b) return;
      if (b.hasAttribute('data-speed')) SET.speed = +b.getAttribute('data-speed');
      else if (b.hasAttribute('data-opt')) SET[b.getAttribute('data-opt')] = b.getAttribute('data-val');
      else { var k = b.getAttribute('data-set'); SET[k] = !SET[k]; }
      save('settings', SET); sync();
      if (mode === 'title' && W) { W = D.newWorld(SET.speed, SET); W.demo = true; lastHud = ''; hud(); }
    });
    function speedName(v) { var o = D.speeds.options.filter(function (x) { return x[0] === v; })[0]; return o ? o[1] : ''; }
    function sync() {
      Array.prototype.forEach.call(document.querySelectorAll('[data-speed]'), function (b) { b.setAttribute('aria-pressed', String(+b.getAttribute('data-speed') === SET.speed)); });
      Array.prototype.forEach.call(document.querySelectorAll('[data-set]'), function (b) { b.setAttribute('aria-checked', String(!!SET[b.getAttribute('data-set')])); });
      Array.prototype.forEach.call(document.querySelectorAll('[data-opt]'), function (b) { b.setAttribute('aria-pressed', String(SET[b.getAttribute('data-opt')] === b.getAttribute('data-val'))); });
      $('tSpeed').textContent = speedName(SET.speed) + (D.styleName ? ' · ' + D.styleName(SET) : '');
    }
    function tile(v, label) { return '<div class="tile"><b>' + esc(v) + '</b><span>' + esc(label) + '</span></div>'; }
    function openStats() {
      var out = '', d = today();
      D.speeds.options.forEach(function (o) {
        var b = ST.best[skeyFor(o[0])] || {};
        out += tile(b.score == null ? '–' : b.score, o[1] + ': best score') + tile(b.wave == null ? '–' : b.wave, o[1] + ': furthest ' + WORD);
      });
      $('sTiles').innerHTML = tile(ST.played, 'Games played') + tile(ST.waves, WORDC + 's cleared') + tile(ST.daily[d] == null ? '–' : ST.daily[d], 'Today’s best') + out;
      $('sWhich').textContent = D.styleName ? ' Best scores shown for the ' + D.styleName(SET) + ' game (change it in Settings).' : '';
      openD('dStats');
    }
    $('bNew').onclick = function () { begin(); };
    $('bPause').onclick = togglePause;
    $('bStats').onclick = openStats;
    $('bSet').onclick = function () { sync(); openD('dSet'); };
    $('bHelp').onclick = function () { openD('dHelp'); };
    $('oPlay').onclick = begin; $('tPlay').onclick = begin; $('pGo').onclick = resume;
    $('oStats').onclick = openStats;
    $('sReset').onclick = function () { openD('dReset'); };
    $('rYes').onclick = function () { ST = blank(); save('stats', ST); closeSheets(); say('Your scores have been cleared'); lastHud = ''; if (W) hud(); };
    function toggleFull() { try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); } catch (e) {} }
    $('bFull').onclick = toggleFull;
    if (!document.fullscreenEnabled) $('bFull').hidden = true;
    document.addEventListener('fullscreenchange', function () { $('bFullL').textContent = document.fullscreenElement ? 'Leave full screen' : 'Full screen'; setTimeout(fit, 150); });
    var sayT = 0;
    function say(t, quiet) { var el = $('toast'); if (!t) return; el.textContent = t; el.classList.toggle('quiet', !!quiet); el.classList.add('on'); clearTimeout(sayT); sayT = setTimeout(function () { el.classList.remove('on'); }, Math.min(6000, 1600 + t.length * 50)); }

    // ------------------------------------------------------------ start: the title screen, with the invaders drawn behind it
    sync();
    W = D.newWorld(SET.speed, SET); W.demo = true; hud();
    $('bPause').disabled = true;
    showOverlay('title');
    fit();
    requestAnimationFrame(frame);
    window.ARCADE365 = { get world() { return W; }, get mode() { return mode; }, begin: begin, input: input, pause: pause, resume: resume };

    function buildUI() {
      var tb = function (id, icon, label, title, cls) { return '<button class="tb' + (cls ? ' ' + cls : '') + '" id="' + id + '" type="button" title="' + esc(title) + '">' + ICON[icon] + '<span class="lbl"' + (id === 'bFull' ? ' id="bFullL"' : '') + '>' + esc(label) + '</span></button>'; };
      var speeds = D.speeds.options.map(function (o) { return '<button type="button" data-speed="' + o[0] + '">' + esc(o[1]) + '</button>'; }).join('');
      var row = function (o) {   // one of the game's own settings
        if (o.type === 'seg') return '<div class="set"><div><label>' + esc(o.label) + '</label><small>' + esc(o.small || '') + '</small></div><div class="seg" role="group" aria-label="' + esc(o.label) + '">'
          + o.options.map(function (x) { return '<button type="button" data-opt="' + esc(o.key) + '" data-val="' + esc(x[0]) + '">' + esc(x[1]) + '</button>'; }).join('') + '</div></div>';
        return '<div class="set"><div><label id="l_' + esc(o.key) + '">' + esc(o.label) + '</label><small>' + esc(o.small || '') + '</small></div><button class="sw" type="button" role="switch" aria-labelledby="l_' + esc(o.key) + '" data-set="' + esc(o.key) + '"></button></div>';
      };
      var segRows = (D.settings || []).filter(function (o) { return o.type === 'seg'; }).map(row).join('');
      var swRows = (D.settings || []).filter(function (o) { return o.type !== 'seg'; }).map(row).join('');
      var legend = (D.legend || []).map(function (l, i) { return '<li><span class="lg" data-lg="' + i + '"></span>' + esc(l.text) + '</li>'; }).join('');
      var html = '<div id="app" class="arcade"><header class="bar"><div class="brand"><b>365</b><span>' + esc(D.title.replace(/^365 /, '')) + '</span></div>'
        + '<div class="info"><div class="chip"><small>Score</small><span id="vScore">0</span></div><div class="chip"><small>Best</small><span id="vBest">0</span></div>'
        + '<div class="chip"><small>Lives</small><span id="vLives">0</span></div><div class="chip"><small>' + WORDC + '</small><span id="vWave">1</span></div></div>'
        + '<nav class="tools" aria-label="Game">' + tb('bNew', 'new', 'New game', 'New game (N)', 'main') + tb('bPause', 'pause', 'Pause', 'Pause (P)') + tb('bStats', 'stats', 'My scores', 'My scores')
        + tb('bSet', 'set', 'Settings', 'Settings') + tb('bHelp', 'help', 'How to play', 'How to play') + tb('bFull', 'full', 'Full screen', 'Full screen (F)') + '</nav></header>'
        + '<main id="stage"><div id="screenwrap"><canvas id="screen" tabindex="-1" aria-label="' + esc(D.title) + ' game screen"></canvas>'
        + '<div class="ov" id="ov_title"><div class="ovbox"><h1>' + esc(D.title) + '</h1>' + (legend ? '<ul class="legend">' + legend + '</ul>' : '')
        + '<p>' + (D.titleText || '') + '</p>'
        + '<button class="btn go big" id="tPlay" type="button">' + ICON.play + ' Play</button>'
        + (D.keysText ? '<p class="soft k-keys">' + D.keysText + '</p>' : '') + (D.touchText ? '<p class="soft k-touch">' + D.touchText + '</p>' : '')
        + '<p class="soft">Speed: <b id="tSpeed"></b> &middot; change it in Settings</p></div></div>'
        + '<div class="ov" id="ov_paused" hidden><div class="ovbox"><h2>Paused</h2><p>Take your time &mdash; the game waits for you.</p><button class="btn go big" id="pGo" type="button">' + ICON.play + ' Carry on</button></div></div>'
        + '<div class="ov" id="ov_over" hidden><div class="ovbox"><h2 id="oWhy">Game over</h2><div class="tiles"><div class="tile"><b id="oScore">0</b><span>Score</span></div><div class="tile"><b id="oWave">1</b><span>' + WORDC + '</span></div><div class="tile"><b id="oBest">0</b><span>Your best</span></div></div>'
        + '<ul class="badges" id="oBadges"></ul><div class="row"><button class="btn go wide big" id="oPlay" type="button">' + ICON.play + ' Play again</button><button class="btn wide" id="oStats" type="button">My scores</button></div></div></div>'
        + '</div><div class="pad" id="pad"><button type="button" data-pad="left" aria-label="Move left">&#9664;</button><button type="button" data-pad="fire" class="fire">Fire</button><button type="button" data-pad="right" aria-label="Move right">&#9654;</button></div>'
        + '</main></div><div id="toast" role="status" aria-live="polite"></div>'
        + sheet('dStats', 'My scores', '<p class="soft">Kept on this computer only &mdash; nothing is sent anywhere.<span id="sWhich"></span></p><div class="tiles" id="sTiles"></div><div class="row"><button class="btn go wide" type="button" data-close>Close</button><button class="btn" type="button" id="sReset">Clear my scores</button></div>')
        + sheet('dSet', 'Settings', '<div class="set"><div><label>Speed</label><small>Gentle is slower, with more lives. Changes from your next game.</small></div><div class="seg" role="group" aria-label="Speed">' + speeds + '</div></div>'
          + segRows
          + '<div class="set"><div><label id="l_sound">Sounds</label><small>Arcade sound effects, made in the game.</small></div><button class="sw" type="button" role="switch" aria-labelledby="l_sound" data-set="sound"></button></div>'
          + swRows
          + '<p class="foot">' + esc(D.title) + ' is made by <a href="https://365techies.co.uk/" target="_blank" rel="noopener">365 Techies</a> in Bournemouth. No adverts, no sign-in, nothing to install. Computer playing up? Ring us on <b>01202 775566</b>.</p>'
          + '<div class="row"><button class="btn go wide" type="button" data-close>Done</button></div>')
        + sheet('dHelp', 'How to play', '<ol class="how">' + (D.help || []).map(function (h) { return '<li>' + h + '</li>'; }).join('') + '</ol><div class="row"><button class="btn go wide" type="button" data-close>Got it</button></div>')
        + sheet('dReset', 'Clear my scores?', '<p>Your scores for ' + esc(D.title) + ' on this computer go back to nothing. This can&rsquo;t be undone.</p><div class="row"><button class="btn wide" type="button" data-close>Keep them</button><button class="btn go wide danger" type="button" id="rYes">Clear them</button></div>');
      var holder = document.createElement('div'); holder.innerHTML = html;
      var frag = document.createDocumentFragment(); while (holder.firstChild) frag.appendChild(holder.firstChild);
      document.body.insertBefore(frag, document.body.firstChild);
      (D.legend || []).forEach(function (l, i) {
        var c = sprite(l.rows, l.colour), el = document.querySelector('[data-lg="' + i + '"]');
        c.style.width = (l.rows[0].length * 3) + 'px'; c.style.height = (l.rows.length * 3) + 'px'; el.appendChild(c);
      });
    }
    function sheet(id, title, body) { return '<div class="scrim" id="' + id + '" hidden><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="' + id + 'H"><h2 id="' + id + 'H">' + esc(title) + '</h2>' + body + '</div></div>'; }
  }

  window.Arcade365 = { start: start, sprite: sprite };
})();
