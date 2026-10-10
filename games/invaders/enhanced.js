/* 365 Invaders - the ENHANCED picture and sound (3 Oct 2026; owner: "a revamp ... much better with more going on and
 * better graphics, better sound"). The rules are in engine.js; this file only draws and plays them. All the pixel art
 * here is our own, drawn for this game, and every sound is made on the spot - nothing is downloaded.
 *
 * Drawn straight onto the screen at full sharpness (the arcade cabinet passes the scale): the pixel art is blown up to a
 * whole number of screen pixels per game pixel, so it stays crisp, while the glows, sparks, rings and the night sky are
 * drawn smooth. A slow PC is noticed (frame times) and the extras are thinned out. The game's world.fx list says where
 * things happened (kills, hits, pick-ups...) and is turned into explosions here. */
(function () {
  'use strict';
  var E = window.InvEngine, GW = E.WIDTH, PY = E.PY, GROUND = E.GROUND;
  var REDUCED = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  // ---------------------------------------------------------------- a 5 x 7 pixel font (shared with the Classic look)
  var FONT = {
    '0': [14, 17, 19, 21, 25, 17, 14], '1': [4, 12, 4, 4, 4, 4, 14], '2': [14, 17, 1, 2, 4, 8, 31], '3': [31, 2, 4, 2, 1, 17, 14],
    '4': [2, 6, 10, 18, 31, 2, 2], '5': [31, 16, 30, 1, 1, 17, 14], '6': [6, 8, 16, 30, 17, 17, 14], '7': [31, 1, 2, 4, 8, 8, 8],
    '8': [14, 17, 17, 14, 17, 17, 14], '9': [14, 17, 17, 15, 1, 2, 12],
    A: [14, 17, 17, 31, 17, 17, 17], B: [30, 17, 17, 30, 17, 17, 30], C: [14, 17, 16, 16, 16, 17, 14], D: [28, 18, 17, 17, 17, 18, 28],
    E: [31, 16, 16, 30, 16, 16, 31], F: [31, 16, 16, 30, 16, 16, 16], G: [14, 17, 16, 23, 17, 17, 15], H: [17, 17, 17, 31, 17, 17, 17],
    I: [14, 4, 4, 4, 4, 4, 14], J: [7, 2, 2, 2, 2, 18, 12], K: [17, 18, 20, 24, 20, 18, 17], L: [16, 16, 16, 16, 16, 16, 31],
    M: [17, 27, 21, 21, 17, 17, 17], N: [17, 17, 25, 21, 19, 17, 17], O: [14, 17, 17, 17, 17, 17, 14], P: [30, 17, 17, 30, 16, 16, 16],
    Q: [14, 17, 17, 17, 21, 18, 13], R: [30, 17, 17, 30, 20, 18, 17], S: [15, 16, 16, 14, 1, 1, 30], T: [31, 4, 4, 4, 4, 4, 4],
    U: [17, 17, 17, 17, 17, 17, 14], V: [17, 17, 17, 17, 17, 10, 4], W: [17, 17, 17, 21, 21, 21, 10], X: [17, 17, 10, 4, 10, 17, 17],
    Y: [17, 17, 17, 10, 4, 4, 4], Z: [31, 1, 2, 4, 8, 16, 31], '+': [0, 4, 4, 31, 4, 4, 0], '-': [0, 0, 0, 31, 0, 0, 0], '!': [4, 4, 4, 4, 4, 0, 4],
    'x': [0, 0, 17, 10, 4, 10, 17], ':': [0, 4, 4, 0, 4, 4, 0], ' ': [0, 0, 0, 0, 0, 0, 0],
    '%': [31, 17, 10, 4, 10, 17, 31],   // an hourglass: the slow-time capsule
    "'": [4, 4, 8, 0, 0, 0, 0], ',': [0, 0, 0, 0, 0, 4, 8], '.': [0, 0, 0, 0, 0, 0, 4], '/': [1, 2, 2, 4, 8, 8, 16]
  };

  // ---------------------------------------------------------------- our own pixel art, shaded: a body, b light, c shadow, e eyes/lights
  function mirror(half) { return half.map(function (r) { return r + r.split('').reverse().join(''); }); }
  var ART = {
    orb0: ['....bbbb....', '..bbaaaabb..', '.aaeeaaeeaa.', '.aaaaaaaaaa.', '..caaaaaac..', '...c....c...', '..c..cc..c..', '.c........c.'],
    orb1: ['....bbbb....', '..bbaaaabb..', '.aaeeaaeeaa.', '.aaaaaaaaaa.', '..caaaaaac..', '...c....c...', '...c.cc.c...', '..c......c..'],
    moth0: ['bb........bb', '.ab..bb..ba.', '..aaaaaaaa..', '.ac.eaae.ca.', 'aaaaaaaaaaaa', 'c..aaaaaa..c', '...c....c...', '..c......c..'],
    moth1: ['............', 'b...bbbb...b', 'ab.aaaaaa.ba', '.ac.eaae.ca.', '.aaaaaaaaaa.', '...aaaaaa...', '..c.c..c.c..', '.c........c.'],
    bot0: ['..b......b..', '...bbbbbb...', '..a.eaae.a..', '..aaaaaaaa..', 'c.ac.aa.ca.c', 'c..aaaaaa..c', '...c....c...', '..cc....cc..'],
    bot1: ['..b......b..', '...bbbbbb...', '..a.eaae.a..', '..aaaaaaaa..', '..ac.aa.ca..', '.c.aaaaaa.c.', 'c..c....c..c', '...cc..cc...'],
    ship: ['......e......', '.....beb.....', '.....aaa.....', '..c.baaab.c..', '.caaaaaaaaac.', 'aaaaaaaaaaaaa', 'abaaaaaaaaaba', 'cc.cc...cc.cc'],
    saucer0: ['.....bbbbbb.....', '...aaaaaaaaaa...', '..aaaaaaaaaaaa..', '.ae.ae.ae.ae.ae.', 'aaaaaaaaaaaaaaaa', '..ccc..cc..ccc..', '...c........c...'],
    saucer1: ['.....bbbbbb.....', '...aaaaaaaaaa...', '..aaaaaaaaaaaa..', '.ea.ea.ea.ea.ea.', 'aaaaaaaaaaaaaaaa', '..ccc..cc..ccc..', '...c........c...'],
    boss: mirror([
      '......................bb', '...................bbbaa', '................bbbaaaaa', '..............bbaaaaaaaa',
      '............baaaaaaaaaaa', '..........baaaaaccaaaaee', '........baaaaaaccaaaaeee', '......baaaaaaaaaaaaaeeee',
      '....bbaaaaaaaaaaaaaaaeee', '..bbaaalaaaalaaaalaaaaaa', 'bbaaaaaaaaaaaaaaaaaaaaaa', 'aaaaaaaaaaaaaaaaaaaaaaaa',
      'caaaaaaaaaaaaaaaaaaaaaaa', '.ccaaaaaaaaaaaaaaaaaaaaa', '...cccaaaaaaaaaaaaaaaaaa', '......cccaaacccaaacccaaa',
      '........c..c...c...c..cc', '.......c..c....c....c.c.', '......c...c.........c..c', '......................c.'
    ]),
    bomb00: ['.a.', 'a..', '.a.', '..a', '.a.', 'a..', '.a.'], bomb01: ['.a.', '..a', '.a.', 'a..', '.a.', '..a', '.a.'],
    bomb10: ['.a.', '.a.', '.a.', '.a.', '.a.', 'aaa', '.b.'], bomb11: ['.a.', 'aaa', '.a.', '.a.', '.a.', '.a.', '.b.'],
    bomb20: ['.a.', '.a.', 'aaa', '.a.', '.a.', 'aaa', '.b.'], bomb21: ['.a.', 'aaa', '.a.', '.a.', 'aaa', '.a.', '.b.'],
    // the little ones a splitter bursts into (and the Mothership sends down)
    mini0: ['.b..b.', 'aaaaaa', 'aeaaea', '.aaaa.', 'c.cc.c'], mini1: ['b....b', '.aaaa.', 'aeaaea', 'aaaaaa', '.c..c.'],
    // the ten waves' new kinds (10 Oct 2026): the sniper (red eyes, a barrel), the phantom, the carrier (three hits)
    snip0: ['..b......b..', '.bab....bab.', '.aaaaaaaaaa.', 'aaeeaaaaeeaa', 'aaaaaaaaaaaa', '.caa.aa.aac.', '....caac....', '.....cc.....'],
    snip1: ['b..........b', '.bab....bab.', '.aaaaaaaaaa.', 'aaeeaaaaeeaa', 'aaaaaaaaaaaa', 'c.aa.aa.aa.c', '....caac....', '.....cc.....'],
    ghost0: ['...bbbbbb...', '..baaaaaab..', '.aaeeaaeeaa.', '.aaeeaaeeaa.', '.aaaaaaaaaa.', '.aaaaaaaaaa.', '.a.aa..aa.a.', '.c..c..c..c.'],
    ghost1: ['...bbbbbb...', '..baaaaaab..', '.aaeeaaeeaa.', '.aaeeaaeeaa.', '.aaaaaaaaaa.', '.aaaaaaaaaa.', '..aa.aa.aa..', '..c..c..c...'],
    carr0: ['..bbbbbbbb..', '.baaaaaaaab.', 'baaccccccaab', 'aaceeeeeecaa', 'aaccccccccaa', 'aaaaaaaaaaaa', '.ca.c..c.ac.', 'c..c....c..c'],
    carr1: ['..bbbbbbbb..', '.baaaaaaaab.', 'baaccccccaab', 'aaceeeeeecaa', 'aaccccccccaa', 'aaaaaaaaaaaa', '.ca.c..c.ac.', '.c.c....c.c.']
  };
  var PAL = {
    orb: { a: '#ff4fc8', b: '#ffc2f0', c: '#a3247f', e: '#fff7b0', glow: '#ff4fc8' },
    moth: { a: '#36d6ff', b: '#c4f6ff', c: '#1677a8', e: '#ff4a6e', glow: '#36d6ff' },
    bot: { a: '#ffc23a', b: '#fff1b8', c: '#b86d0c', e: '#ff3b3b', glow: '#ffb020' },
    ship: { a: '#45f08a', b: '#d7ffe6', c: '#178a48', e: '#6ae8ff', glow: '#45f08a' },
    saucer: { a: '#ff3f55', b: '#ffb3bd', c: '#8f1023', e: '#ffe24a', glow: '#ff3f55' },
    boss: { a: '#7b4dff', b: '#d2c2ff', c: '#3a1f8f', e: '#ff3fd2', l: '#ffe14a', glow: '#8f63ff' },
    bomb0: { a: '#ff9b3b', b: '#fff0c0', glow: '#ff8a20' }, bomb1: { a: '#ff5ce1', b: '#ffd0f6', glow: '#ff3fd2' }, bomb2: { a: '#8ff7ff', b: '#ffffff', glow: '#40e0ff' },
    mini: { a: '#9dff3a', b: '#eaffc8', c: '#4a9a12', e: '#ff3b6e', glow: '#8cff2a' },
    snip: { a: '#8e98ad', b: '#e6ecf6', c: '#4c5468', e: '#ff2a2a', glow: '#ff3a3a' },
    ghost: { a: '#9d7bff', b: '#efe6ff', c: '#5a3fb8', e: '#ffffff', glow: '#a98cff' },
    carr: { a: '#4f7fd6', b: '#c8dcff', c: '#243f80', e: '#ffe14a', glow: '#5a8cff' }
  };
  var KIND = ['orb', 'moth', 'bot'];
  var ARTK = { sniper: 'snip', phantom: 'ghost', carrier: 'carr' };
  function artOf(v) { return ARTK[v.kind] || KIND[v.type]; }   // which picture: the new kinds have their own
  function phantomAlpha(W, v) {   // a phantom fades out (shots pass through) and back in - in step with engine.phased
    if (v.kind !== 'phantom') return 1;
    var ph = (W.frame + v.c * 37 + v.r * 53) % 160;
    return ph < 110 ? 1 : ph < 118 ? 1 - (ph - 110) / 8 * 0.85 : ph < 154 ? 0.15 : 0.15 + (ph - 154) / 6 * 0.85;
  }
  var CAP = { rapid: { col: '#ffd84a', ch: 'R', name: 'RAPID' }, spread: { col: '#3fe0ff', ch: 'S', name: 'SPREAD' }, shield: { col: '#5cff8a', ch: '+', name: 'SHIELD' },
    laser: { col: '#ff4f7a', ch: 'L', name: 'LASER' }, slow: { col: '#b48cff', ch: '%', name: 'SLOW TIME' } };
  var STEEL = '#dfe8f5', LIME = '#8cff2a';
  function palOf(id) { return id.indexOf('bomb') === 0 ? PAL['bomb' + id.charAt(4)] : PAL[id.replace(/[0-9]+$/, '')]; }
  Object.keys(ART).forEach(function (id) {   // a slip in the art shows up in the console, not as a ragged sprite
    var w = ART[id][0].length; ART[id].forEach(function (r, i) { if (r.length !== w && window.console) console.warn('365 Invaders art', id, 'row', i, r.length, '!=', w); });
  });

  // ---------------------------------------------------------------- caches at a whole number of screen pixels per game pixel
  var K = 0, SPR = {}, HALO = {}, TXT = {}, TXTN = 0;
  function canvas(w, h) { var c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h); return c; }
  function setK(k) { if (k !== K) { K = k; SPR = {}; HALO = {}; TXT = {}; TXTN = 0; shieldCache = []; BG = null; DOTS = {}; } }
  function sprite(id) {
    var c = SPR[id]; if (c) return c;
    var rows = ART[id], pal = palOf(id), w = rows[0].length, h = rows.length;
    c = canvas(w * K, h * K); var x = c.getContext('2d');
    for (var r = 0; r < h; r++) for (var q = 0; q < w; q++) { var ch = rows[r].charAt(q); if (ch !== '.') { x.fillStyle = pal[ch] || pal.a; x.fillRect(q * K, r * K, K, K); } }
    return (SPR[id] = c);
  }
  function tinted(src, colour) { var c = canvas(src.width, src.height), x = c.getContext('2d'); x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = colour; x.fillRect(0, 0, c.width, c.height); return c; }
  function silhouette(id, colour) { var key = 'sil|' + id + '|' + colour; return SPR[key] || (SPR[key] = tinted(sprite(id), colour)); }
  function rim(id) {   // a steel outline one pixel round a picture: an armoured invader (drawn a pixel up and left of it)
    var key = 'rim|' + id, c = SPR[key]; if (c) return c;
    var s = silhouette(id, STEEL), x;
    c = canvas(s.width + 2 * K, s.height + 2 * K); x = c.getContext('2d');
    for (var oy = 0; oy <= 2; oy++) for (var ox = 0; ox <= 2; ox++) if (ox !== 1 || oy !== 1) x.drawImage(s, ox * K, oy * K);
    x.globalCompositeOperation = 'destination-out'; x.drawImage(s, K, K);
    return (SPR[key] = c);
  }
  function cropped(src, key, x0, x1) {   // part of a picture, the same size so it lines up (the Mothership with a gun shot off)
    var c = SPR[key]; if (c) return c;
    c = canvas(src.width, src.height);
    if (x1 > x0) c.getContext('2d').drawImage(src, x0 * K, 0, (x1 - x0) * K, src.height, x0 * K, 0, (x1 - x0) * K, src.height);
    return (SPR[key] = c);
  }
  // which way a diver is turned: a spin as it peels out of the formation, then nose-first down its path (shared with the 3D picture)
  var ANG = typeof WeakMap === 'function' ? new WeakMap() : null;
  function diveAngle(v) {
    var d = v.dv, want;
    if (d.ph === 'peel') { var k = Math.min(1, d.t / 44); want = d.side * Math.PI * 2 * (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2); }
    else if (d.ph === 'dive') want = -Math.atan2(d.vx, Math.max(0.05, d.vy));
    else if (d.ph === 'fly' || d.ph === 'enter' || d.entry) want = Math.max(-0.7, Math.min(0.7, -(d.vx || 0) * 0.32));   // (the bonus stage, the swarm flying in: face to you, banking into its turns - never flipped round)
    else want = -Math.atan2(v.x - d.x, Math.max(0.05, v.y - d.y)) * 0.6;
    if (!ANG) return want;
    var a = ANG.has(d) ? ANG.get(d) : 0, df = want - a;
    df = Math.atan2(Math.sin(df), Math.cos(df)); a += df * (d.ph === 'peel' || d.ph === 'dive' ? 0.3 : 0.12); ANG.set(d, a);   // (banks ease in)
    return a;
  }
  function makeHalo(src, colour, blur) {   // a soft light round a picture
    var pad = Math.ceil(blur * 2.4), c = canvas(src.width + pad * 2, src.height + pad * 2), x = c.getContext('2d'), sil = tinted(src, colour);
    if ('filter' in x) { x.filter = 'blur(' + blur + 'px)'; x.drawImage(sil, pad, pad); x.filter = 'none'; x.globalAlpha = 0.6; x.drawImage(sil, pad, pad); }
    else { x.shadowColor = colour; x.shadowBlur = blur * 2; x.drawImage(sil, pad, pad); }
    return { cv: c, pad: pad };
  }
  var HALON = 0;
  function halo(src, key, colour, blur) {   // ...made once (the score's changing numbers would fill it, so it is emptied now and then)
    var h = HALO[key]; if (h) return h;
    if (++HALON > 400) { HALO = {}; HALON = 1; }
    return (HALO[key] = makeHalo(src, colour, blur));
  }
  var DOTS = {};
  function dot(colour) {   // a round glow, white in the middle
    var d = DOTS[colour]; if (d) return d;
    d = canvas(64, 64); var x = d.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.18, colour); gr.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
    return (DOTS[colour] = d);
  }
  function textCanvas(str, colour, m) {
    var key = str + '|' + colour + '|' + m, c = TXT[key]; if (c) return c;
    if (++TXTN > 300) { TXT = {}; TXTN = 1; }
    str = String(str);
    var px = K * m, w = str.length * 6 - 1;
    c = canvas(w * px, 7 * px); var x = c.getContext('2d'); x.fillStyle = colour;
    for (var i = 0; i < str.length; i++) {
      var ch = str.charAt(i), rows = FONT[ch] || FONT[ch.toUpperCase()] || FONT[' '];   // a small x for "x3"; other letters are capitals
      for (var r = 0; r < 7; r++) for (var q = 0; q < 5; q++) if (rows[r] & (16 >> q)) x.fillRect((i * 6 + q) * px, r * px, px, px);
    }
    return (TXT[key] = c);
  }

  // ---------------------------------------------------------------- drawing helpers (game pixels in, screen pixels out)
  var G = null, S = 3, DW = 0, DH = 0, OX = 0, OY = 0, LOW = false;
  function bx(x) { return Math.round(x * S + OX); }
  function by(y) { return Math.round(y * S + OY); }
  function blit(c, x, y, alpha) { G.imageSmoothingEnabled = false; G.globalAlpha = alpha == null ? 1 : alpha; G.drawImage(c, bx(x), by(y)); }
  function blitRot(c, cx, cy, ang, alpha) {   // a picture turned about its centre (cx, cy in game pixels)
    G.save(); G.imageSmoothingEnabled = false; G.globalAlpha = alpha == null ? 1 : alpha;
    G.translate(Math.round(cx * S + OX), Math.round(cy * S + OY)); G.rotate(ang); G.drawImage(c, -c.width / 2, -c.height / 2); G.restore();
  }
  function glowAt(h, x, y, alpha) { if (LOW) return; G.imageSmoothingEnabled = true; G.globalCompositeOperation = 'lighter'; G.globalAlpha = alpha; G.drawImage(h.cv, bx(x) - h.pad, by(y) - h.pad); G.globalCompositeOperation = 'source-over'; }
  function rect(x, y, w, h, colour, alpha, add) {
    if (add) G.globalCompositeOperation = 'lighter';
    G.globalAlpha = alpha == null ? 1 : alpha; G.fillStyle = colour;
    G.fillRect(bx(x), by(y), Math.max(1, Math.round(w * S)), Math.max(1, Math.round(h * S)));
    if (add) G.globalCompositeOperation = 'source-over';
  }
  function light(x, y, r, colour, alpha) { if (alpha <= 0.01) return; var d = dot(colour), s = r * 2 * S; G.imageSmoothingEnabled = true; G.globalCompositeOperation = 'lighter'; G.globalAlpha = Math.min(1, alpha); G.drawImage(d, x * S + OX - s / 2, y * S + OY - s / 2, s, s); G.globalCompositeOperation = 'source-over'; }
  // a jet of fire (10 Oct 2026; the thrusters): a soft white-hot to red teardrop, drawn added, from (x, y) pointing ang (0 = down)
  var FLAME = null;
  function flameSprite() {
    if (FLAME) return FLAME;
    var c = document.createElement('canvas'); c.width = 32; c.height = 96; var x = c.getContext('2d');
    var g = x.createLinearGradient(0, 0, 0, 96);
    g.addColorStop(0, 'rgba(255,236,190,1)'); g.addColorStop(0.22, 'rgba(255,165,60,0.95)'); g.addColorStop(0.6, 'rgba(255,80,24,0.55)'); g.addColorStop(1, 'rgba(190,20,10,0)');
    x.fillStyle = g; x.beginPath(); x.moveTo(7, 0); x.quadraticCurveTo(-2, 22, 16, 96); x.quadraticCurveTo(34, 22, 25, 0); x.closePath(); x.fill();
    return (FLAME = c);
  }
  function jet(x, y, ang, len, w, alpha) {
    if (len <= 0.1 || alpha <= 0.02) return;
    var c = flameSprite(); G.save(); G.globalCompositeOperation = 'lighter'; G.globalAlpha = Math.min(1, alpha); G.imageSmoothingEnabled = true;
    G.translate(x * S + OX, y * S + OY); G.rotate(ang); G.drawImage(c, -w * S / 2, 0, w * S, len * S); G.restore();
  }
  var flick = function () { return 0.9 + Math.random() * 0.2; };   // (a jet burns steadily)
  function hoverJets(id, x, y, alpha, thr) {   // one short jet out of an invader's underside (x, y: its top left)
    var rows = ART[id], w = rows[0].length, h = rows.length;
    jet(x + w / 2, y + h - 0.5, 0, (2 + 1.6 * thr) * flick(), 2, 0.85 * alpha);
  }
  function plume(id, cx, cy, vx, vy, thr, size) {   // one plume straight back from where it's flying, longer the faster
    var h = ART[id].length * (size || 1), m = Math.hypot(vx, vy);
    if (m < 0.05) { vx = 0; vy = 1; m = 1; }
    vx /= m; vy /= m;
    jet(cx - vx * h * 0.45, cy - vy * h * 0.45, Math.atan2(vx, -vy), (3 + 5 * thr) * flick() * (size || 1), 2.4 * (size || 1), 0.9);
  }
  function text(str, x, y, colour, m, align, glow, alpha) {
    var c = textCanvas(str, colour, m || 1), w = c.width / S;
    var lx = align === 'left' ? x : align === 'right' ? x - w : x - w / 2;
    if (glow && !LOW) glowAt(halo(c, 'txt|' + str + '|' + colour + '|' + (m || 1), colour, K * 1.6), lx, y, glow);
    blit(c, lx, y, alpha);
  }

  // ---------------------------------------------------------------- the sky: deep space, nebulae, three layers of stars, Earth below
  var BG = null, BGW = 0, BGH = 0, VIG = null;
  function buildBG() {
    BG = canvas(DW, DH); BGW = DW; BGH = DH;
    var x = BG.getContext('2d'), gr = x.createLinearGradient(0, 0, 0, DH);
    gr.addColorStop(0, '#08021a'); gr.addColorStop(0.55, '#0a0b2c'); gr.addColorStop(1, '#03040c');
    x.fillStyle = gr; x.fillRect(0, 0, DW, DH);
    [[0.22, 0.30, 0.55, 'rgba(126,44,210,0.22)'], [0.82, 0.52, 0.45, 'rgba(22,150,210,0.16)'], [0.55, 0.12, 0.35, 'rgba(220,60,170,0.12)'], [0.12, 0.75, 0.3, 'rgba(40,90,220,0.12)']].forEach(function (n) {
      var cx = n[0] * DW, cy = n[1] * DH, r = n[2] * DW, g2 = x.createRadialGradient(cx, cy, 0, cx, cy, r);
      g2.addColorStop(0, n[3]); g2.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g2; x.fillRect(0, 0, DW, DH);
    });
    var a = 365; function rnd() { a = (a * 1103515245 + 12345) & 0x7fffffff; return a / 0x7fffffff; }
    for (var i = 0; i < 260; i++) { x.fillStyle = 'rgba(190,200,255,' + (0.05 + rnd() * 0.18).toFixed(2) + ')'; x.fillRect(rnd() * DW, rnd() * DH * 0.92, 1, 1); }
    // Earth's edge along the bottom, with a thin glowing atmosphere
    var R = 700 * S, cx2 = GW / 2 * S, cy2 = (GROUND + 700) * S;
    var pg = x.createLinearGradient(0, GROUND * S, 0, DH); pg.addColorStop(0, '#0d3558'); pg.addColorStop(0.3, '#061a2e'); pg.addColorStop(1, '#02060d');
    x.beginPath(); x.arc(cx2, cy2, R, 0, Math.PI * 2); x.fillStyle = pg; x.fill();
    x.globalCompositeOperation = 'lighter';
    x.beginPath(); x.arc(cx2, cy2, R + 2 * S, Math.PI * 1.2, Math.PI * 1.8); x.lineWidth = 9 * S; x.strokeStyle = 'rgba(60,170,255,0.10)'; x.stroke();
    x.beginPath(); x.arc(cx2, cy2, R + 0.5 * S, Math.PI * 1.2, Math.PI * 1.8); x.lineWidth = 2.2 * S; x.strokeStyle = 'rgba(120,220,255,0.55)'; x.stroke();
    x.globalCompositeOperation = 'source-over';
    VIG = canvas(DW, DH);
    var v = VIG.getContext('2d'), vg = v.createRadialGradient(DW / 2, DH / 2, Math.min(DW, DH) * 0.35, DW / 2, DH / 2, Math.max(DW, DH) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)'); v.fillStyle = vg; v.fillRect(0, 0, DW, DH);
  }
  var STARS = (function () {
    var out = [], a = 2024; function rnd() { a = (a * 1103515245 + 12345) & 0x7fffffff; return a / 0x7fffffff; }
    [[70, 0.004, 1, 0.35], [40, 0.009, 1, 0.6], [16, 0.018, 2, 0.95]].forEach(function (L, li) {
      for (var i = 0; i < L[0]; i++) out.push({ x: rnd() * GW, y: rnd() * GROUND, v: L[1] * (0.8 + rnd() * 0.4), s: L[2], b: L[3] * (0.6 + rnd() * 0.4), p: rnd() * 6.28, layer: li });
    });
    return out;
  })();
  var shoot = null, nextShoot = 0;
  // the jump to hyperspace between waves, and each wave's sector colour (as in the 3D sky, sky3d.js)
  var WARP = 0, warpTo = 0, warpOff = 0, WS = 0, skyT = 0, SECT = '#7c4dff';
  var SECTORS = ['#7c4dff', '#1fd1c1', '#ff3d78', '#ffae3a', '#3dff8a', '#3d8bff', '#ff4fd8', '#c8ff3d'];
  function sectorOf(w) { return w % 5 === 0 ? '#ff2a2a' : SECTORS[(w - 1 - Math.floor(w / 5)) % SECTORS.length]; }
  function drawSky(t, W) {
    if (!BG || BGW !== DW || BGH !== DH) buildBG();
    G.globalAlpha = 1; G.drawImage(BG, OX, OY);
    var dt = skyT ? Math.max(0, Math.min(100, t - skyT)) : 0; skyT = t;
    if (warpOff && t > warpOff) { warpTo = 0; warpOff = 0; }
    WARP += (warpTo - WARP) * (1 - Math.exp(-dt / (warpTo > WARP ? 350 : 450))); if (REDUCED) WARP = 0;
    WS += dt * WARP * WARP * 1.6;
    if (W && W.wave) SECT = sectorOf(W.wave);
    light(GW / 2, 90, 150, SECT, 0.07 + 0.08 * WARP);   // the sector's colour washes the sky
    for (var i = 0; i < STARS.length; i++) {
      var s = STARS[i], y = (s.y + t * s.v + WS * s.v * 40) % (GROUND - 4), a = s.b * (s.layer === 2 ? 0.65 + 0.35 * Math.sin(t / 380 + s.p) : 1);
      G.globalAlpha = a; G.fillStyle = s.layer === 2 ? '#e8eeff' : '#a9b8ff';
      var sz = s.s === 2 ? Math.max(2, Math.round(S * 0.7)) : Math.max(1, Math.round(S * 0.4));
      var len = WARP > 0.02 ? Math.round(WARP * (8 + s.layer * 14) * S) : 0;   // hyperspace: the stars stretch into streaks
      G.fillRect(Math.round(s.x * S + OX), Math.round(y * S + OY) - len, sz, sz + len);
    }
    if (REDUCED) return;
    if (!shoot && t > nextShoot) { shoot = { t0: t, x: 20 + Math.random() * 180, y: 20 + Math.random() * 90, dx: (Math.random() < 0.5 ? -1 : 1) * (0.9 + Math.random() * 0.5) }; nextShoot = t + 6000 + Math.random() * 9000; }
    if (shoot) {
      var k = (t - shoot.t0) / 650; if (k > 1) { shoot = null; return; }
      var hx = shoot.x + shoot.dx * k * 90, hy = shoot.y + k * 40;
      G.globalCompositeOperation = 'lighter';
      for (var j = 0; j < 14; j++) { var f = j / 14; G.globalAlpha = (1 - f) * (1 - k) * 0.8; G.fillStyle = '#cfe3ff'; G.fillRect(Math.round((hx - shoot.dx * f * 22) * S + OX), Math.round((hy - f * 10) * S + OY), Math.max(1, Math.round(S * 0.6)), Math.max(1, Math.round(S * 0.6))); }
      G.globalCompositeOperation = 'source-over';
    }
  }

  // ---------------------------------------------------------------- explosions and the like, from world.fx
  var PS = [], RINGS = [], FLASH = [], FLOAT = [], BANNER = null, SHAKE = 0, SCREEN = null, lastW = null, lastFrame = 0, comboPulse = 0, lastDeflect = -999;
  function reset(W) { PS = []; RINGS = []; FLASH = []; FLOAT = []; BANNER = null; SHAKE = 0; SCREEN = null; lastW = W; lastFrame = W.frame; shieldCache = []; }
  function emit(x, y, n, cols, spd, life, o) {
    o = o || {};
    if (LOW) n = Math.ceil(n / 3); else if (REDUCED) n = Math.ceil(n / 2);
    var cap = LOW ? 220 : 900;
    for (var i = 0; i < n && PS.length < cap; i++) {
      var a = Math.random() * Math.PI * 2, v = spd * (0.25 + Math.random() * 0.85);
      PS.push({ x: x + (o.spread || 0) * (Math.random() - 0.5), y: y + (o.spread || 0) * (Math.random() - 0.5), vx: Math.cos(a) * v + (o.vx || 0), vy: Math.sin(a) * v * (o.flat || 1) + (o.vy || 0),
        life: life * (0.6 + Math.random() * 0.6), max: life, col: cols[i % cols.length], size: o.size || 1, drag: o.drag || 0.94, grav: o.grav || 0, add: o.add !== false });
    }
  }
  function ring(x, y, r1, col, life, w) { RINGS.push({ x: x, y: y, r: 1, r1: r1, col: col, life: life, max: life, w: w || 1 }); }
  function flash(x, y, r, col, life) { FLASH.push({ x: x, y: y, r: r, col: col, life: life, max: life }); }
  function floater(str, x, y, col, m, life) { FLOAT.push({ s: str, x: x, y: y, col: col, m: m || 1, life: life || 70, max: life || 70 }); }
  function shake(a) { SHAKE = Math.max(SHAKE, a); }
  function screen(col, a, life) { SCREEN = { col: col, a: a, life: life, max: life }; }
  function onFx(W, f) {
    var p;
    switch (f.k) {
      case 'kill':
        p = PAL[ARTK[f.kind] || KIND[f.type]];
        emit(f.x, f.y, 18, [p.a, p.b, p.a, p.e], 1.5, 34, { spread: 6 });
        emit(f.x, f.y, 6, ['#ffffff'], 2.4, 16, { size: 0.8 });
        ring(f.x, f.y, 13, p.glow, 18); flash(f.x, f.y, 11, p.glow, 10);
        if (f.mult > 1 || (f.dive && f.pts)) floater('+' + f.pts, f.x, f.y - 6, '#ffe14a', 1, 50);   // (a diver is worth double)
        break;
      case 'armor':   // the armour knocked off: steel shards
        emit(f.x, f.y, 14, [STEEL, '#9aa8c0', '#ffffff', '#6f7c95'], 1.7, 30, { spread: 5, grav: 0.06 });
        ring(f.x, f.y, 9, STEEL, 12); flash(f.x, f.y, 7, '#cfe0ff', 8); shake(0.5); break;
      case 'dive': p = PAL[ARTK[f.kind] || KIND[f.type]]; ring(f.x, f.y, 10, p.glow, 14); flash(f.x, f.y, 8, p.glow, 10); break;
      case 'snipe': flash(f.x, f.y + 2, 6, '#ff3a3a', 8); emit(f.x, f.y + 2, 4, ['#ff6060', '#ffffff'], 0.8, 10, { vy: 0.6 }); break;
      case 'carrierhit': emit(f.x, f.y, 12, [PAL.carr.a, PAL.carr.b, '#ffffff', PAL.carr.e], 1.6, 24, { spread: 5 }); ring(f.x, f.y, 10, PAL.carr.glow, 12); flash(f.x, f.y, 8, '#9fc0ff', 8); shake(0.7); break;
      case 'groupbonus': floater('+1000 GROUP!', f.x, f.y - 8, '#ffe14a', 1, 80); ring(f.x, f.y, 22, '#ffe14a', 24, 1.5); emit(f.x, f.y, 26, ['#ffe14a', '#ffffff'], 1.8, 34); break;
      case 'bonusresult': BANNER = { a: f.perfect ? 'PERFECT!' : 'BONUS STAGE', b: f.hits + ' OF ' + f.total + ' HIT', c: '+' + f.pts + (f.perfect ? ' - ALL OF THEM!' : ''), col: '#ffe14a', life: 200, max: 200 }; if (f.perfect) { screen('#ffe14a', 0.18, 30); shake(3); } break;
      case 'split':
        p = PAL.mini; emit(f.x, f.y, 22, [p.a, p.b, '#ffffff'], 1.8, 30, { spread: 4 }); ring(f.x, f.y, 14, p.glow, 18, 1.5); flash(f.x, f.y, 12, p.glow, 12);
        if (f.why === 'split') floater('SPLIT!', f.x, f.y - 10, p.a, 1, 50);
        break;
      case 'minikill':
        p = PAL.mini; emit(f.x, f.y, 10, [p.a, p.b, p.e], 1.3, 22); ring(f.x, f.y, 7, p.glow, 12); flash(f.x, f.y, 6, p.glow, 8);
        if (f.mult > 1) floater('+' + f.pts, f.x, f.y - 6, '#ffe14a', 1, 50);
        break;
      case 'minigone': emit(f.x, f.y - 2, 5, [LIME, PAL.mini.c], 0.7, 16); break;
      case 'deflect':   // the core's shield while a gun still stands
        emit(f.x, f.y, 6, ['#7fe8ff', '#ffffff'], 1.4, 12, { vy: 0.8 }); ring(f.x, f.y, 6, '#7fe8ff', 10);
        if (W.frame - lastDeflect > 150) { lastDeflect = W.frame; floater('GUNS FIRST!', f.x, f.y + 16, '#7fe8ff', 1, 70); }
        break;
      case 'bosspart':   // a gun blown off the Mothership
        emit(f.x, f.y, 48, [PAL.boss.a, PAL.boss.b, '#ffb03a', '#ffd84a', '#ffffff'], 2.4, 54, { spread: 8 });
        ring(f.x, f.y, 26, '#ffd84a', 26, 1.5); flash(f.x, f.y, 26, '#ffb03a', 22); shake(4.5);
        if (!W.boss || W.boss.L.hp > 0 || W.boss.R.hp > 0) floater('GUN DOWN!', f.x, f.y + 16, '#ffd84a', 1, 80);   // (the second: CORE OPEN says it)
        break;
      case 'coreopen':
        BANNER = { a: 'CORE OPEN', b: 'NOW HIT THE CORE!', col: '#ff3fd2', life: 120, max: 120 };
        ring(f.x, f.y, 40, '#ff3fd2', 34, 2); screen('#ff3fd2', 0.12, 24); break;
      case 'slowoff': ring(W.player.x + 6.5, PY + 3, 20, CAP.slow.col, 20, 1.5); floater('SPEED UP!', W.player.x + 6.5, PY - 16, CAP.slow.col, 1, 60); break;
      case 'shot': flash(f.x, f.y + 3, 4, f.kind === 'rapid' ? '#ffd84a' : '#7fe8ff', 6); break;
      case 'shield': emit(f.x, f.y, 6, ['#7dff8a', '#2fbf5a', '#d7ffe0'], 0.9, 30, { grav: 0.05, add: false }); break;
      case 'top': emit(f.x, f.y, 5, ['#ff7a7a', '#ffffff'], 1, 14); break;
      case 'cancel': ring(f.x, f.y, 7, '#ffd0a0', 12); emit(f.x, f.y, 8, ['#ffb15c', '#ffffff'], 1.6, 18); break;
      case 'ground': emit(f.x, f.y - 1, 6, ['#ffb15c', '#ff6a3d'], 1.1, 18, { vy: -0.6, grav: 0.06 }); flash(f.x, f.y - 1, 5, '#ff8a3d', 8); break;
      case 'die':
        emit(f.x, f.y, 46, ['#45f08a', '#d7ffe6', '#ffd84a', '#ff8a3d', '#ffffff'], 2.2, 60, { spread: 6 });
        ring(f.x, f.y, 30, '#7dffb0', 30, 1.5); ring(f.x, f.y, 18, '#ffffff', 18); flash(f.x, f.y, 34, '#ff9a3d', 26);
        shake(6); screen('#ff3b3b', 0.22, 24); break;
      case 'ufo':
        emit(f.x, f.y, 34, [PAL.saucer.a, PAL.saucer.b, PAL.saucer.e, '#ffffff'], 2, 46, { spread: 10, flat: 0.6 });
        ring(f.x, f.y, 22, '#ff6070', 24); flash(f.x, f.y, 22, '#ff4060', 18); shake(2.5);
        floater(String(f.pts), f.x, f.y - 2, '#ffe24a', 2, 90); break;
      case 'capdrop': ring(f.x, f.y, 9, CAP[f.kind].col, 16); break;
      case 'collect':
        ring(f.x, f.y, 18, CAP[f.kind].col, 22, 1.5); emit(f.x, f.y, 22, [CAP[f.kind].col, '#ffffff'], 1.6, 30);
        floater(CAP[f.kind].name, f.x, f.y - 14, CAP[f.kind].col, 1, 70); break;
      case 'capgone': emit(f.x, f.y - 2, 5, ['#8090b0'], 0.6, 16); break;
      case 'shieldpop': ring(f.x, f.y, 20, '#7fe8ff', 22, 1.5); emit(f.x, f.y, 24, ['#7fe8ff', '#ffffff'], 1.8, 26); shake(2); floater('SHIELD GONE', f.x, f.y - 16, '#7fe8ff', 1, 70); break;
      case 'bosshit': emit(f.x, f.y, 7, [PAL.boss.b, '#ffffff', PAL.boss.e], 1.4, 16); flash(f.x, f.y, 6, '#c08cff', 8); shake(0.8); break;
      case 'rage': ring(f.x, f.y, 44, '#ff4060', 36, 2); screen('#ff2040', 0.16, 30); shake(3); floater('ANGRY!', f.x, f.y + 16, '#ff4060', 2, 80); break;
      case 'bossfire': flash(f.x, f.y, 7, '#ff3fd2', 10); break;
      case 'bossboom': emit(f.x, f.y, 18, [PAL.boss.a, PAL.boss.b, PAL.boss.e, '#ffd84a'], 1.6, 34, { spread: 4 }); flash(f.x, f.y, 14, '#ff9ae8', 14); ring(f.x, f.y, 12, '#ffffff', 14); shake(2.2); break;
      case 'bossdie':
        emit(f.x, f.y, 90, [PAL.boss.a, PAL.boss.b, PAL.boss.e, '#ffd84a', '#ffffff'], 2.8, 80, { spread: 30 });
        ring(f.x, f.y, 60, '#ffffff', 40, 2); ring(f.x, f.y, 40, '#ff3fd2', 32, 2); flash(f.x, f.y, 60, '#ffb0f0', 40);
        shake(9); screen('#ffffff', 0.45, 40); floater('+' + f.pts, f.x, f.y + 10, '#ffe14a', 2, 120); break;
      case 'combo':
        floater('x' + f.n + ' COMBO', W.player.x + 6.5, PY - 18, ['#ffffff', '#ffffff', '#ffe14a', '#ff9a3d', '#ff4fd8'][f.n], f.n >= 3 ? 2 : 1, 70);
        ring(W.player.x + 6.5, PY + 3, 16, '#ffe14a', 18); comboPulse = 30; break;
      case 'extra': floater('1UP', 30, GROUND - 6, '#5cff8a', 2, 90); ring(30, GROUND + 6, 14, '#5cff8a', 24); break;
      case 'wave': if (f.n > 1) { warpTo = 1; warpOff = skyT + 550; } BANNER = f.boss ? { a: 'WARNING', b: 'MOTHERSHIP APPROACHING', col: '#ff4060', life: 150, max: 150, warn: true } : f.name ? { a: 'WAVE ' + f.n, b: f.name.toUpperCase(), c: (f.tip || 'GET READY').toUpperCase(), col: f.bonus ? '#ffe14a' : '#7fe8ff', life: 170, max: 170, y: 134 } : { a: 'WAVE ' + f.n, b: 'GET READY', col: '#7fe8ff', life: 110, max: 110 }; break;
      case 'cleared': if (f.bonus) { warpTo = 1; warpOff = 0; break; } if (!BANNER || BANNER.a !== 'PERFECT!') BANNER = { a: 'WAVE ' + f.n + ' CLEARED', b: '', col: '#5cff8a', life: 140, max: 140 }; warpTo = 1; warpOff = 0; break;
      case 'perfect': BANNER = { a: 'PERFECT!', b: '+500 BONUS', col: '#ffe14a', life: 150, max: 150 }; break;
    }
  }
  function stepFx(W) {
    var i, p;
    for (i = PS.length - 1; i >= 0; i--) { p = PS[i]; p.vx *= p.drag; p.vy = p.vy * p.drag + p.grav; p.x += p.vx; p.y += p.vy; if (--p.life <= 0) PS.splice(i, 1); }
    for (i = RINGS.length - 1; i >= 0; i--) { p = RINGS[i]; if (--p.life <= 0) RINGS.splice(i, 1); }
    for (i = FLASH.length - 1; i >= 0; i--) if (--FLASH[i].life <= 0) FLASH.splice(i, 1);
    for (i = FLOAT.length - 1; i >= 0; i--) { p = FLOAT[i]; p.y -= 0.25; if (--p.life <= 0) FLOAT.splice(i, 1); }
    if (BANNER && --BANNER.life <= 0) BANNER = null;
    if (SCREEN && --SCREEN.life <= 0) SCREEN = null;
    SHAKE *= 0.88; if (SHAKE < 0.15) SHAKE = 0;
    if (comboPulse) comboPulse--;
    // trails: bombs fizz, the ship's engine glows, a power-up sparkles
    if (LOW) return;
    var P = W.player;
    if (W.frame % 3 === 0) W.bombs.forEach(function (b) { var col = b.kind === 3 ? '#ff7ae6' : b.kind === 4 ? '#ff4040' : PAL['bomb' + b.kind].a; emit(b.x + 1.5, b.y + 1, 1, [col], 0.25, 14, { vy: -0.3 }); });
    if (!P.dead && Math.abs(P.vx || 0) > 0.2 && W.frame % 2 === 0) emit(P.x + 6.5 - Math.sign(P.vx) * 6, PY + 7, 1, ['#6ae8ff', '#2fa8ff'], 0.4, 14, { vx: -P.vx * 0.4, vy: 0.4 });
    if (W.power && !P.dead && W.frame % 5 === 0) emit(P.x + Math.random() * 13, PY + Math.random() * 8, 1, [CAP[W.power.kind].col], 0.5, 20, { vy: -0.5 });
    if (W.saucer && W.frame % 4 === 0) emit(W.saucer.x + 8 - W.saucer.dir * 8, E.SAUCER_Y + 4, 1, ['#ff8090', '#ffd0d6'], 0.3, 18, { vx: -W.saucer.dir * 0.3 });
    // divers and the little ones leave a trail; the laser burns; the Mothership smokes where a gun was
    if (W.frame % 2 === 0) W.invaders.forEach(function (v) { if (v.alive && v.dv) emit(v.dv.x + 6, v.dv.y + 3, 1, [PAL[artOf(v)].glow, '#ffffff'], 0.3, 16, { vy: -0.2 }); });
    if (W.frame % 3 === 0) W.minis.forEach(function (m) { emit(m.x + 3, m.y + 1, 1, [LIME], 0.25, 12, { vy: -0.3 }); });
    if (W.beam && !P.dead) emit(W.beam.x + 0.5, W.beam.top + 1, 2, ['#ff4f7a', '#ffffff', '#ffd0dc'], 1.2, 14, { vy: 0.4 });
    var B = W.boss;
    if (B && !B.dead && W.intro === 0 && W.frame % 3 === 0) {
      if (B.L.hp <= 0) { emit(B.x + 15, B.y + 10, 1, ['#555a66', '#7a7f8c'], 0.3, 30, { vy: -0.5, add: false }); if (W.frame % 9 === 0) emit(B.x + 15, B.y + 11, 2, ['#ff8a3d', '#ffd84a'], 0.9, 14); }
      if (B.R.hp <= 0) { emit(B.x + 33, B.y + 10, 1, ['#555a66', '#7a7f8c'], 0.3, 30, { vy: -0.5, add: false }); if (W.frame % 9 === 0) emit(B.x + 33, B.y + 11, 2, ['#ff8a3d', '#ffd84a'], 0.9, 14); }
    }
  }

  // ---------------------------------------------------------------- the world
  var shieldCache = [];
  function shieldCanvas(i, Sh) {
    var c = shieldCache[i];
    if (c && c.ver === Sh.ver && c.px === Sh.px) return c;
    var cv = canvas(Sh.w * K, Sh.h * K), x = cv.getContext('2d');
    for (var yy = 0; yy < Sh.h; yy++) for (var xx = 0; xx < Sh.w; xx++) {
      if (!Sh.px[yy * Sh.w + xx]) continue;
      var edge = yy === 0 || !Sh.px[(yy - 1) * Sh.w + xx];
      x.fillStyle = edge ? '#c8ffd2' : yy < 5 ? '#62f07e' : yy < 11 ? '#3fd463' : '#2aa24c';
      x.fillRect(xx * K, yy * K, K, K);
    }
    c = shieldCache[i] = { cv: cv, ver: Sh.ver, px: Sh.px, halo: null };
    return c;
  }
  function easeOut(k) { return 1 - Math.pow(1 - k, 3); }
  function drawInvaders(W, t) {   // the formation (divers are drawn later, over the shields)
    var shown = W.demo ? W.invaders.length : W.phase === 'spawn' ? W.spawnN : W.invaders.length;
    for (var i = 0; i < W.order.length; i++) {
      var v = W.invaders[W.order[i]]; if (!v.alive || i >= shown || v.dv) continue;
      var yoff = 0, alpha = 1;
      if (!W.demo) {
        var age = W.frame - (W.spawnAt + i + 1);
        if (age < 26) { var k = Math.max(0, age) / 26; yoff = -(1 - easeOut(k)) * 46; alpha = k; }
      }
      var vx = v.x + (v.wx || 0), vy = v.y + (v.wy || 0) + yoff, pa = alpha * phantomAlpha(W, v);
      if (pa > 0.5) hoverJets(artOf(v) + v.f, vx, vy, pa, 0.3 + Math.min(0.4, Math.abs(v.wvx || 0) * 4));
      drawInvader(v, vx, vy, pa, t);
    }
  }
  function drawInvader(v, x, y, alpha, t) {
    var art = artOf(v), id = art + v.f, spr = sprite(id);
    if (v.split) {   // a splitter: it pulses green, ready to burst
      var pz = 0.5 + 0.5 * Math.sin(t / 120 + v.c * 1.7);
      glowAt(halo(spr, 'hs|' + id, LIME, K * 3.2), x, y, (0.55 + 0.45 * pz) * alpha);
      blit(spr, x, y, alpha); blit(silhouette(id, LIME), x, y, (0.2 + 0.3 * pz) * alpha);
      return;
    }
    glowAt(halo(spr, 'h|' + id, PAL[art].glow, K * 2.6), x, y, 0.85 * alpha);
    blit(spr, x, y, alpha);
    if (v.kind === 'carrier' && v.hp < 3) blit(silhouette(id, '#ff4a2a'), x, y, (v.hp === 1 ? 0.45 + 0.2 * Math.sin(t / 60) : 0.25) * alpha);   // damaged: glowing red
    if (v.kind === 'phantom' && alpha < 0.5) blit(silhouette(id, '#c8b8ff'), x, y, 0.12 + 0.08 * Math.sin(t / 40));   // faded: a shimmer
    if (v.armor) {   // steel plated: a bright rim, and the body dulled to metal
      blit(silhouette(id, '#b9c6dc'), x, y, 0.42 * alpha);
      blit(rim(id), x - 1, y - 1, 0.95 * alpha);
    }
  }
  function drawDivers(W, t) {
    for (var i = 0; i < W.invaders.length; i++) {
      var v = W.invaders[i]; if (!v.alive || !v.dv) continue;
      var d = v.dv, id = artOf(v) + v.f, spr = sprite(id), ang = diveAngle(v);
      if ((d.ph === 'fly' || d.ph === 'enter') && (!d.on || d.t < 0)) continue;
      plume(id, d.x + 6, d.y + 4, d.vx || 0, d.vy || 1, Math.max(0.2, Math.min(1, Math.hypot(d.vx || 0, d.vy || 0) / 3.5)));
      glowAt(halo(spr, 'h|' + id, PAL[artOf(v)].glow, K * 2.6), d.x, d.y, 0.95);
      blitRot(spr, d.x + 6, d.y + 4, ang);
      if (v.split) blitRot(silhouette(id, LIME), d.x + 6, d.y + 4, ang, 0.35);
      if (v.armor) { blitRot(silhouette(id, '#b9c6dc'), d.x + 6, d.y + 4, ang, 0.42); blitRot(rim(id), d.x + 6, d.y + 4, ang, 0.95); }
    }
  }
  function drawMinis(W) {
    W.minis.forEach(function (m) {
      var id = 'mini' + m.f, spr = sprite(id);
      jet(m.x + 3, m.y + 0.5, Math.PI - (m.vx || 0) * 0.3, 2.6 * flick(), 1.5, 0.85);
      glowAt(halo(spr, 'h|' + id, PAL.mini.glow, K * 2.2), m.x, m.y, 0.9);
      blit(spr, m.x, m.y);
    });
  }
  function drawBeam(W, t) {   // the laser: from the ship up to whatever it is burning
    var B = W.beam; if (!B || W.player.dead) return;
    var x = B.x + 0.5, top = B.top, h = PY - 1 - top, fl = 0.8 + 0.2 * Math.sin(t / 25);
    rect(x - 3, top, 6, h, '#ff4f7a', 0.16 * fl, true);
    rect(x - 1.5, top, 3, h, '#ff6f95', 0.45 * fl, true);
    rect(x - 0.5, top, 1, h, '#ffffff', 0.95);
    light(x, top, 8 + 2 * Math.sin(t / 40), '#ff4f7a', 0.9);
    light(x, PY - 1, 5, '#ff4f7a', 0.6);
  }
  function drawShip(W, t) {
    var P = W.player;
    if (P.dead || W.over) return;
    if (W.hold > 0 && (W.hold >> 2) & 1) return;
    var spr = sprite('ship'), cx = P.x + 6.5;
    // the engine: a flickering flame under the ship
    var fl = 2 + Math.random() * 2.2 + Math.abs(P.vx || 0);
    rect(P.x + 5, PY + 8, 3, fl, '#ffb347', 0.85, true); rect(P.x + 6, PY + 8, 1, fl + 1.5, '#fff3c0', 0.9, true);
    light(cx, PY + 9 + fl / 2, 5, '#ff9a3d', 0.35);
    glowAt(halo(spr, 'h|ship', PAL.ship.glow, K * 2.6), P.x, PY, 0.8);
    blit(spr, P.x, PY);
    if (W.shieldUp) {   // the shield bubble
      var pulse = 0.55 + 0.25 * Math.sin(t / 160);
      G.globalCompositeOperation = 'lighter';
      G.globalAlpha = pulse; G.strokeStyle = '#7fe8ff'; G.lineWidth = Math.max(1, S * 0.8);
      G.beginPath(); G.ellipse(cx * S + OX, (PY + 3.5) * S + OY, 11 * S, 9 * S, 0, 0, Math.PI * 2); G.stroke();
      G.globalAlpha = pulse * 0.12; G.fillStyle = '#7fe8ff'; G.fill();
      G.globalCompositeOperation = 'source-over';
    }
  }
  function drawShots(W) {
    W.shots.forEach(function (s) {
      var col = W.power && W.power.kind === 'rapid' ? '#ffd84a' : s.spread ? '#7fe8ff' : '#9ff2ff';
      rect(s.x, s.y + 4, 1, 7, col, 0.25, true);          // the trail
      rect(s.x - 1, s.y - 1, 3, 7, col, 0.35, true);      // the glow
      rect(s.x, s.y, 1, 5, '#ffffff', 1);                 // the beam
      light(s.x + 0.5, s.y + 1, 3, col, 0.5);
    });
  }
  function drawBombs(W) {
    W.bombs.forEach(function (b) {
      if (b.kind === 4) {   // a sniper's bolt: a red needle
        light(b.x + 1.5, b.y + 3, 5, '#ff3030', 0.75);
        rect(b.x + 1, b.y, 1.2, 6, '#ff4040', 1); rect(b.x + 1.2, b.y + 1, 0.6, 4, '#ffffff', 0.9);
        return;
      }
      if (b.kind === 3) {   // the Mothership's plasma
        light(b.x + 1.5, b.y + 2, 6, '#ff3fd2', 0.8);
        rect(b.x + 0.5, b.y + 1, 2, 2, '#ffffff', 1);
        return;
      }
      var id = 'bomb' + b.kind + ((b.f >> 3) & 1), spr = sprite(id);
      glowAt(halo(spr, 'h|' + id, PAL['bomb' + b.kind].glow, K * 2), b.x, b.y, 0.9);
      blit(spr, b.x, b.y);
    });
  }
  function drawShields(W) {
    W.shields.forEach(function (Sh, i) {
      var c = shieldCanvas(i, Sh);
      if (!LOW) { if (!c.halo) c.halo = makeHalo(c.cv, '#3fd463', K * 2.2); glowAt(c.halo, Sh.x, Sh.y, 0.4); }   // kept with the shield, replaced when it is hit
      blit(c.cv, Sh.x, Sh.y);
    });
  }
  function drawSaucer(W) {
    var U = W.saucer; if (!U) return;
    var id = 'saucer' + ((W.frame >> 3) & 1), spr = sprite(id);
    jet(U.x + 8 - U.dir * 7, E.SAUCER_Y + 4, U.dir * Math.PI / 2, 4.5 * flick(), 2.4, 0.85);
    glowAt(halo(spr, 'h|' + id, PAL.saucer.glow, K * 2.8), U.x, E.SAUCER_Y, 0.85);
    blit(spr, U.x, E.SAUCER_Y);
  }
  function drawBoss(W, t) {
    var B = W.boss; if (!B) return;
    var y = B.y, x = B.x, alpha = 1;
    if (W.intro > 0) y = B.y - (W.intro / 150) * 75;   // coming down at the start of the wave
    if (B.dead) { x += (Math.random() - 0.5) * 2; y += (Math.random() - 0.5) * 2; alpha = B.dead < 40 ? B.dead / 40 : (B.dead >> 2) & 1 ? 0.7 : 1; }
    // what is left of it: a gun shot off leaves a smoking gap (the shots fly straight through)
    var GL = E.BOSS_GUN_L, GR = E.BOSS_GUN_R, x0 = B.L.hp > 0 ? 0 : GL, x1 = B.R.hp > 0 ? E.BOSS_W : GR, part = x0 + '|' + x1;
    var spr = cropped(sprite('boss'), 'boss|' + part, x0, x1), rage = B.phase === 3, open = B.phase >= 2;
    if (!B.dead) {
      var bh = ART.boss.length, burn = W.intro > 0 ? 2.2 : rage ? 1.4 : 1;
      [0.14, 0.37, 0.63, 0.86].forEach(function (u, j) {
        var gone = (j === 0 && B.L.hp <= 0) || (j === 3 && B.R.hp <= 0);
        if (gone && Math.random() < 0.6) return;
        jet(x + u * E.BOSS_W, y + bh - 1, 0, (gone ? 2.5 : 5 + 3 * burn) * flick(), gone ? 2 : 3.6, 0.9 * alpha);
      });
    }
    glowAt(halo(spr, 'h|boss|' + part + (rage ? 'r' : ''), rage ? '#ff3060' : PAL.boss.glow, K * 3), x, y, (rage ? 0.75 + 0.25 * Math.sin(t / 120) : 0.8) * alpha);
    blit(spr, x, y, alpha);
    if (B.L.hp <= 0) light(x + GL, y + 10, 4 + Math.random() * 1.5, '#ff8a3d', 0.55 * alpha);   // the torn edges glow
    if (B.R.hp <= 0) light(x + GR, y + 10, 4 + Math.random() * 1.5, '#ff8a3d', 0.55 * alpha);
    // the core: shielded while a gun stands, then open and glowing - hotter when it's angry
    if (!open && !B.dead) {
      var sa = 0.35 + 0.15 * Math.sin(t / 140);
      G.globalCompositeOperation = 'lighter'; G.globalAlpha = sa * alpha; G.strokeStyle = '#7fe8ff'; G.lineWidth = Math.max(1, S * 0.7);
      G.beginPath(); G.ellipse((x + 24) * S + OX, (y + 8) * S + OY, 9 * S, 6.5 * S, 0, 0, Math.PI * 2); G.stroke();
      G.globalAlpha = sa * 0.15 * alpha; G.fillStyle = '#7fe8ff'; G.fill(); G.globalCompositeOperation = 'source-over';
      light(x + 24, y + 7, 6, '#ff3fd2', 0.5 * alpha);
    } else light(x + 24, y + 7, (rage ? 10 : 8) + 2.5 * Math.sin(t / (rage ? 70 : 150)), rage ? '#ff2850' : '#ff3fd2', 0.9 * alpha);
    // a hit flashes the part that was hit
    var fl = B.L.flash ? ['L', 0, GL, B.L.flash] : B.R.flash ? ['R', GR, E.BOSS_W, B.R.flash] : B.flash ? ['C', GL, GR, B.flash] : null;
    if (fl) blit(cropped(silhouette('boss', '#ffffff'), 'bossw|' + fl[0], fl[1], fl[2]), x, y, fl[3] / 6 * 0.8);
    if (!B.dead && W.intro === 0) drawBossBar(W);   // its strength, under the scores
  }
  function drawBossBar(W) {   // [left gun][ core ][right gun], right of the combo, under WAVE: the core is grey while it's shielded
    var B = W.boss, bx0 = 72, gw = 22, cw = 48, gp = 2, rage = B.phase === 3;
    rect(bx0 - 1, 15, gw * 2 + cw + gp * 2 + 2, 4, '#000000', 0.6);
    function seg(x, w, k, col) { rect(x, 16, w, 2, '#ffffff', 0.15); if (k > 0) { rect(x, 16, w * k, 2, col, 1); rect(x, 16, w * k, 2, '#ffffff', 0.25, true); } }
    seg(bx0, gw, B.L.hp / B.L.max, '#ffb03a');
    seg(bx0 + gw + gp, cw, B.C.hp / B.C.max, B.phase === 1 ? '#5c6380' : rage ? '#ff4060' : '#ff3fd2');
    seg(bx0 + gw + gp + cw + gp, gw, B.R.hp / B.R.max, '#ffb03a');
  }
  function drawCaps(W, t) {
    W.caps.forEach(function (c) {
      var C = CAP[c.kind], x = c.x + Math.sin(c.t / 9) * 0.8, blink = c.y > GROUND - 30 && (c.t >> 3) & 1;
      light(x, c.y, 9, C.col, 0.45 + 0.2 * Math.sin(t / 140));
      rect(x - 3.5, c.y - 4.5, 7, 9, '#0b1020', 0.92);
      G.globalAlpha = blink ? 0.5 : 1; G.strokeStyle = C.col; G.lineWidth = Math.max(1, Math.round(S * 0.7));
      G.strokeRect(bx(x - 3.5) + 0.5, by(c.y - 4.5) + 0.5, Math.round(7 * S) - 1, Math.round(9 * S) - 1);
      text(C.ch, x, c.y - 3.5, C.col, 1);
    });
  }
  function drawParticles() {
    for (var i = 0; i < PS.length; i++) {
      var p = PS[i], a = Math.max(0, p.life / p.max);
      if (p.add) G.globalCompositeOperation = 'lighter';
      G.globalAlpha = a; G.fillStyle = p.col;
      var sz = Math.max(1, Math.round(p.size * S));
      G.fillRect(Math.round(p.x * S + OX - sz / 2), Math.round(p.y * S + OY - sz / 2), sz, sz);
      if (p.add) G.globalCompositeOperation = 'source-over';
    }
    G.globalCompositeOperation = 'lighter';
    RINGS.forEach(function (r) {
      var k = 1 - r.life / r.max, rad = 1 + (r.r1 - 1) * easeOut(k);
      G.globalAlpha = (1 - k) * 0.8; G.strokeStyle = r.col; G.lineWidth = Math.max(1, r.w * S * (1 - k * 0.5));
      G.beginPath(); G.arc(r.x * S + OX, r.y * S + OY, rad * S, 0, Math.PI * 2); G.stroke();
    });
    G.globalCompositeOperation = 'source-over';
    FLASH.forEach(function (f) { light(f.x, f.y, f.r * (0.6 + 0.4 * f.life / f.max), f.col, f.life / f.max); });
  }

  // ---------------------------------------------------------------- the scores, banners and the bits along the bottom
  function pad5(n) { return ('00000' + Math.min(99999, n)).slice(-5); }
  function drawHud(W, info) {
    text('SCORE', 8, 4, '#8fa3d1', 1, 'left'); text(pad5(W.score), 44, 4, '#ffffff', 1, 'left', 0.35);
    if (W.mult > 1) text('x' + W.mult + ' COMBO', 8, 14, comboPulse && (comboPulse >> 2) & 1 ? '#ffffff' : '#ffe14a', 1, 'left', 0.6);
    if (W.combo > 0 && W.mult < 4) {   // the hits towards the next multiplier: six pips
      var got = W.combo % 6, py0 = W.mult > 1 ? 23 : 14;
      for (var c = 0; c < 6; c++) rect(8 + c * 4, py0, 3, 2, c < got ? '#ffe14a' : '#ffffff', c < got ? 1 : 0.18);
    }
    text('WAVE ' + W.wave, GW / 2 + 2, 4, '#8fa3d1', 1);
    text(pad5(info ? info.best : W.score), GW - 8, 4, '#ffd84a', 1, 'right', 0.35); text('BEST', GW - 44, 4, '#8fa3d1', 1, 'right');
    // the spare ships, and any power with the time it has left
    var n = Math.min(6, W.lives - (W.player.dead ? 0 : 1)), spr = sprite('ship');
    for (var i = 0; i < n; i++) blit(spr, 8 + i * 17, GROUND + 6, 0.9);
    var px = GW - 8;
    if (W.power) {
      var C = CAP[W.power.kind], k = W.power.t / W.power.max, bw = 34;
      rect(px - bw, GROUND + 13, bw, 2, '#ffffff', 0.18); rect(px - bw, GROUND + 13, bw * k, 2, C.col, 1);
      text(C.name, px, GROUND + 4, k < 0.25 && (W.frame >> 3) & 1 ? '#ffffff' : C.col, 1, 'right', 0.4);
      px -= bw + 8;
    }
    if (W.slow > 0) {   // slow time runs alongside a weapon
      var sm = Math.max(1, Math.round(W.sp.power * 0.6)), ks = W.slow / sm, sw = 30;
      rect(px - sw, GROUND + 13, sw, 2, '#ffffff', 0.18); rect(px - sw, GROUND + 13, sw * ks, 2, CAP.slow.col, 1);
      text('SLOW', px, GROUND + 4, ks < 0.25 && (W.frame >> 3) & 1 ? '#ffffff' : CAP.slow.col, 1, 'right', 0.4);
      px -= sw + 8;
    }
    if (W.shieldUp) text('SHIELD', px, GROUND + 6, '#5cff8a', 1, 'right', 0.4);
    if (W.stage && W.phase === 'play') text('HITS ' + W.stage.hits + '/' + W.stage.total, GW / 2 + 2, 15, '#ffe14a', 1, null, 0.5);   // the bonus stage
  }
  function drawBanner() {
    var B = BANNER; if (!B) return;
    var k = 1 - B.life / B.max, a = Math.min(1, k * 6, (1 - k) * 4);
    if (B.warn && (B.life >> 3) & 1) a *= 0.35;
    var m = B.a.length <= 8 ? 3 : 2, y = (B.y || 104) - (1 - Math.min(1, k * 5)) * 8;   // (a wave's name and tip sit below the arriving formation)
    text(B.a, GW / 2, y, B.col, m, null, 0.8 * a, a);
    if (B.b) text(B.b, GW / 2, y + 7 * m + 8, '#ffffff', 1, null, 0.4 * a, a);
    if (B.c) text(B.c, GW / 2, y + 7 * m + 20, B.col, 1, null, 0.5 * a, a);
    if (B.warn) { rect(0, y - 8, GW, 2, '#ff4060', a * 0.6); rect(0, y + 7 * m + 20, GW, 2, '#ff4060', a * 0.6); }
  }
  var PROJ = null;   // the 3D picture's map from a game point to where it is on the screen (overlay mode)
  function drawFloaters() {
    FLOAT.forEach(function (f) { var a = Math.min(1, f.life / f.max * 2), x = f.x, y = f.y; if (PROJ) { var q = PROJ(f.x, f.y); x = q.x; y = q.y; } text(f.s, x, y, f.col, f.m, null, 0.6 * a, a); });
  }

  // ---------------------------------------------------------------- a slow PC: notice it, and thin out the extras
  var lastT = 0, slow = 0;
  function watch(t) {
    if (lastT) { var dt = t - lastT; if (dt > 26 && dt < 250) slow++; else if (slow > 0) slow -= 0.5; }
    lastT = t;
    if (slow > 120 && !LOW) { LOW = true; if (window.console) console.info('365 Invaders: a slower PC - fewer effects'); }
  }

  function draw(g, W, t, mode, info) {
    G = g; S = info.scale; DW = info.dw; DH = info.dh;
    setK(Math.max(1, Math.round(S)));
    if (W !== lastW) reset(W);
    watch(t);
    // what happened since the last picture
    var q = W.fx; if (!W.demo) for (var i = 0; i < q.length; i++) onFx(W, q[i]); q.length = 0;   // the title screen's demo stays still
    var steps = Math.max(0, Math.min(8, W.frame - lastFrame)); lastFrame = W.frame;
    for (var j = 0; j < steps; j++) stepFx(W);
    OX = 0; OY = 0;
    PROJ = info.overlay && info.project ? info.project : null;
    if (info.overlay) {   // the 3D reboot is underneath: only the words, the scores and the flashes go on top
      if (W.boss && !W.boss.dead && W.intro === 0) drawBossBar(W);
      G.imageSmoothingEnabled = false;
      drawHud(W, info); drawFloaters(); drawBanner();
      if (!info.noWash) drawWash(W, t);   // (full screen on a phone: the flash goes over the whole screen instead - washState)
      G.globalAlpha = 1; PROJ = null;
      return;
    }
    if (SHAKE > 0 && info.set && info.set.shake && !REDUCED && mode === 'play') { OX = Math.round((Math.random() * 2 - 1) * SHAKE * S); OY = Math.round((Math.random() * 2 - 1) * SHAKE * S); }
    G.imageSmoothingEnabled = false;
    G.fillStyle = '#000'; G.globalAlpha = 1; G.fillRect(0, 0, DW, DH);
    drawSky(t, W);
    drawSaucer(W); drawBoss(W, t); drawInvaders(W, t); drawShields(W); drawCaps(W, t); drawBeam(W, t); drawBombs(W); drawDivers(W, t); drawMinis(W); drawShots(W); drawShip(W, t);
    drawParticles();
    G.imageSmoothingEnabled = false;
    drawHud(W, info); drawFloaters(); drawBanner();
    drawWash(W, t);
    if (VIG && !LOW) { G.globalAlpha = 1; G.drawImage(VIG, 0, 0); }
    G.globalAlpha = 1;
  }
  function washState(W) {   // a big moment's flash and the slow-time tint, for a whole screen to lay over everything (reboot.js)
    return { col: SCREEN ? SCREEN.col : null, a: SCREEN ? SCREEN.a * SCREEN.life / SCREEN.max : 0, slow: W && W.slow > 0 && !W.demo ? Math.min(1, W.slow / 40) : 0, slowCol: CAP.slow.col };
  }
  function drawWash(W, t) {   // a big moment's flash of colour over everything - and a violet tint while time is slowed
    if (SCREEN) { G.globalCompositeOperation = 'lighter'; G.globalAlpha = SCREEN.a * SCREEN.life / SCREEN.max; G.fillStyle = SCREEN.col; G.fillRect(0, 0, DW, DH); G.globalCompositeOperation = 'source-over'; }
    if (W.slow > 0 && !W.demo) {
      var fade = Math.min(1, W.slow / 40);
      G.globalCompositeOperation = 'lighter'; G.globalAlpha = (0.07 + 0.02 * Math.sin(t / 300)) * fade; G.fillStyle = '#6a3cc8'; G.fillRect(0, 0, DW, DH);
      G.globalCompositeOperation = 'source-over'; G.globalAlpha = 0.5 * fade; G.fillStyle = CAP.slow.col;
      var e = Math.max(1, Math.round(S)); G.fillRect(0, 0, DW, e); G.fillRect(0, DH - e, DW, e); G.fillRect(0, 0, e, DH); G.fillRect(DW - e, 0, e, DH);
    }
  }

  // ---------------------------------------------------------------- sound (Enhanced): placed left-right, with echo on the big ones
  var BEAT = [92, 82, 73, 69];
  function newKindSound(name, A, p) {   // the ten waves' new sounds
    if (name === 'snipe') { A.tone(1900, 0.1, 0.03, { type: 'sawtooth', to: 520, pan: p }); A.noise(0.06, 0.04, 7000, { type: 'highpass', pan: p }); return true; }
    if (name === 'carrierhit') { A.tone(230, 0.14, 0.06, { type: 'square', to: 140, pan: p }); A.noise(0.1, 0.07, 2200, { type: 'bandpass', q: 4, pan: p, verb: 0.25 }); return true; }
    if (name === 'swarm') {   // a wave flying in: a deep roar opening up (the engine bed below carries it on)
      A.noise(1.2, 0.11, 160, { type: 'lowpass', to: 2600, verb: 0.45 }); A.tone(44, 1.5, 0.09, { type: 'sawtooth', to: 66, attack: 0.25 }); A.tone(88, 1.2, 0.03, { type: 'sawtooth', to: 132, attack: 0.3, verb: 0.3 });
      return true;
    }
    if (name === 'groupbonus') { [784, 988, 1175, 1568].forEach(function (f, k) { A.tone(f, 0.1, 0.045, { type: 'square', when: k * 0.06, verb: 0.35 }); }); return true; }
    return false;
  }
  function warpWhoosh(A) {   // the jump to hyperspace: a rising rush of air and a low swell
    A.noise(1.4, 0.08, 300, { type: 'bandpass', q: 1.2, to: 5200, when: 0.45, verb: 0.45 }); A.tone(55, 1.3, 0.06, { type: 'sine', to: 110, when: 0.45 });
  }
  function pan(e) { return e && e.x != null ? Math.max(-0.85, Math.min(0.85, (e.x - GW / 2) / (GW / 2))) : 0; }
  function sound(name, A, e) {
    var p = pan(e), n;
    if (newKindSound(name, A, p)) return;
    switch (name) {
      case 'shoot':
        if (e && e.kind === 'spread') { A.tone(1250, 0.14, 0.022, { type: 'square', to: 300, pan: -0.5 }); A.tone(1300, 0.14, 0.022, { type: 'square', to: 320, pan: 0.5 }); }
        A.tone(e && e.kind === 'rapid' ? 1700 : 1400, 0.12, 0.028, { type: 'square', to: 380, pan: p });
        A.tone(1420, 0.11, 0.016, { type: 'sawtooth', to: 340, pan: p, detune: 12 });
        A.noise(0.04, 0.025, 7000, { type: 'highpass', to: 3000, pan: p });
        break;
      case 'hit':
        A.noise(0.26, 0.15, 4800, { pan: p, verb: 0.25 });
        A.tone(170, 0.2, 0.11, { type: 'sine', to: 42, pan: p });
        A.tone(1900 + Math.random() * 500, 0.09, 0.012, { type: 'triangle', to: 2900, when: 0.02, pan: p, verb: 0.4 });
        break;
      case 'combo': n = (e && e.n) || 2; A.tone(523 * Math.pow(1.26, n - 2), 0.12, 0.04, { type: 'square', verb: 0.3 }); A.tone(784 * Math.pow(1.26, n - 2), 0.16, 0.035, { type: 'square', when: 0.07, verb: 0.3 }); break;
      case 'combobreak': A.tone(330, 0.16, 0.025, { type: 'triangle', to: 160 }); break;
      case 'boom':
        A.noise(1.5, 0.3, 3200, { pan: p, verb: 0.5 }); A.tone(110, 1.3, 0.17, { type: 'sine', to: 26 });
        A.tone(240, 0.7, 0.045, { type: 'sawtooth', to: 40, pan: p }); break;
      case 'beat':
        n = BEAT[(e && e.n) || 0];
        A.tone(n, 0.17, 0.13, { type: 'triangle' }); A.tone(n * 2, 0.09, 0.03, { type: 'square' }); A.tone(150, 0.1, 0.09, { type: 'sine', to: 45 });
        break;
      case 'ufo': n = e && e.n % 2; A.tone(n ? 820 : 640, 0.12, 0.02, { type: 'sawtooth', to: n ? 640 : 820, pan: p }); A.tone(n ? 410 : 320, 0.12, 0.012, { type: 'square', pan: p }); break;
      case 'ufohit':
        A.noise(0.6, 0.18, 5000, { pan: p, verb: 0.45 });
        [880, 1175, 1320, 1760].forEach(function (f, k) { A.tone(f, 0.1, 0.04, { type: 'square', when: k * 0.07, pan: p, verb: 0.35 }); });
        break;
      case 'cancel': A.noise(0.12, 0.06, 6000, { type: 'bandpass', q: 3, pan: p }); A.tone(900, 0.08, 0.02, { type: 'triangle', to: 500, pan: p }); break;
      case 'capdrop': A.tone(880, 0.1, 0.03, { type: 'triangle', to: 1320, pan: p, verb: 0.3 }); A.tone(1320, 0.1, 0.02, { type: 'triangle', to: 1760, when: 0.08, pan: p, verb: 0.3 }); break;
      case 'powerup':
        if (e && e.kind === 'slow') { A.tone(1100, 0.8, 0.04, { type: 'sine', to: 180, verb: 0.6 }); A.tone(1650, 0.8, 0.02, { type: 'triangle', to: 270, verb: 0.6 }); break; }   // time winding down
        [523, 659, 784, 1047, 1319].forEach(function (f, k) { A.tone(f, 0.12, 0.045, { type: 'square', when: k * 0.055, verb: 0.35 }); }); break;
      // the reboot's new play (9 Oct 2026)
      case 'dive': A.tone(1500, 0.55, 0.03, { type: 'sine', to: 380, pan: p, verb: 0.25 }); A.tone(1530, 0.55, 0.016, { type: 'triangle', to: 395, pan: p }); A.noise(0.9, 0.06, 1400, { type: 'bandpass', q: 0.7, to: 260, pan: p, verb: 0.2 }); break;   // a falling whistle on a jet's roar
      case 'armor': A.tone(2100, 0.07, 0.035, { type: 'square', to: 1500, pan: p }); A.noise(0.09, 0.07, 5200, { type: 'bandpass', q: 9, pan: p }); A.tone(3100, 0.18, 0.016, { type: 'triangle', pan: p, verb: 0.35 }); break;   // a clang
      case 'split': A.tone(520, 0.12, 0.04, { type: 'square', to: 1300, pan: Math.max(-0.85, p - 0.3) }); A.tone(780, 0.12, 0.03, { type: 'square', to: 1900, when: 0.03, pan: Math.min(0.85, p + 0.3) }); A.noise(0.12, 0.06, 6000, { pan: p }); break;
      case 'minihit': A.noise(0.12, 0.08, 6500, { pan: p }); A.tone(1200, 0.08, 0.025, { type: 'triangle', to: 2200, pan: p }); break;
      case 'laseron': A.tone(180, 0.22, 0.05, { type: 'sawtooth', to: 1100, pan: p }); A.tone(360, 0.22, 0.03, { type: 'square', to: 2200, pan: p, verb: 0.3 }); break;
      case 'laser': A.tone(1700, 0.06, 0.022, { type: 'sawtooth', to: 1100, pan: p }); A.noise(0.06, 0.04, 4000, { type: 'bandpass', q: 4, pan: p }); break;
      case 'deflect': A.tone(2600, 0.16, 0.025, { type: 'sine', to: 2200, pan: p, verb: 0.4 }); A.tone(3900, 0.12, 0.012, { type: 'triangle', pan: p }); break;   // a ping off the shield
      case 'bosspart':
        A.noise(1.1, 0.26, 3600, { pan: p, verb: 0.5 }); A.tone(120, 0.9, 0.16, { type: 'sine', to: 28, pan: p });
        [988, 784, 659].forEach(function (f, k) { A.tone(f, 0.12, 0.035, { type: 'square', when: 0.25 + k * 0.08, verb: 0.35 }); }); break;
      case 'slowoff': A.tone(260, 0.4, 0.035, { type: 'triangle', to: 900, verb: 0.3 }); break;
      case 'powerdown': A.tone(660, 0.25, 0.03, { type: 'triangle', to: 220 }); break;
      case 'shieldpop': A.noise(0.35, 0.12, 8000, { type: 'bandpass', q: 2, to: 1500, pan: p, verb: 0.3 }); A.tone(1400, 0.32, 0.04, { type: 'sine', to: 300, pan: p }); break;
      case 'warning': for (var k = 0; k < 6; k++) A.tone(k % 2 ? 494 : 392, 0.22, 0.045, { type: 'square', when: k * 0.24, verb: 0.3 }); break;
      case 'bosshit': A.tone(430, 0.08, 0.04, { type: 'square', to: 360, pan: p }); A.noise(0.07, 0.06, 9000, { type: 'bandpass', q: 6, pan: p }); break;
      case 'bossfire': A.tone(280, 0.28, 0.045, { type: 'sawtooth', to: 110, pan: p, verb: 0.25 }); break;
      case 'bossrage': A.tone(110, 0.7, 0.09, { type: 'sawtooth', to: 220, verb: 0.4 }); A.tone(116, 0.7, 0.07, { type: 'sawtooth', to: 233, verb: 0.4 }); break;
      case 'bossdie':
        A.noise(2.4, 0.34, 3000, { verb: 0.6 }); A.tone(90, 2.2, 0.2, { type: 'sine', to: 22 });
        [784, 659, 523, 392, 523, 659, 784, 1047].forEach(function (f, k) { A.tone(f, 0.14, 0.04, { type: 'square', when: 0.5 + k * 0.09, verb: 0.4 }); });
        break;
      case 'extra': [523, 659, 784, 1047, 784, 1047].forEach(function (f, k) { A.tone(f, 0.1, 0.05, { type: 'square', when: k * 0.09, verb: 0.3 }); }); break;
      case 'wave': [392, 523, 659, 784, 1047].forEach(function (f, k) { A.tone(f, 0.14, 0.05, { type: 'triangle', when: k * 0.1, verb: 0.4 }); }); warpWhoosh(A); break;
      case 'perfect': [523, 659, 784, 1047, 1319, 1568].forEach(function (f, k) { A.tone(f, 0.15, 0.05, { type: 'square', when: k * 0.08, verb: 0.45 }); }); warpWhoosh(A); break;
      case 'over': [392, 330, 262, 196].forEach(function (f, k) { A.tone(f, 0.3, 0.06, { type: 'triangle', when: k * 0.26, verb: 0.4 }); }); break;
    }
  }

  // ---------------------------------------------------------------- music: a low space hum that tightens as they come down
  var PAD = null;
  function makePad(a, bus) {
    var g = a.createGain(), f = a.createBiquadFilter(), o1 = a.createOscillator(), o2 = a.createOscillator(), o3 = a.createOscillator(), lfo = a.createOscillator(), lg = a.createGain();
    g.gain.value = 0; f.type = 'lowpass'; f.frequency.value = 200; f.Q.value = 5;
    o1.type = 'sawtooth'; o1.frequency.value = 55; o2.type = 'sawtooth'; o2.frequency.value = 55; o2.detune.value = 11;
    o3.type = 'triangle'; o3.frequency.value = 82.41;
    lfo.frequency.value = 0.13; lg.gain.value = 110; lfo.connect(lg); lg.connect(f.frequency);
    o1.connect(f); o2.connect(f); o3.connect(f); f.connect(g); g.connect(bus || a.destination);
    [o1, o2, o3, lfo].forEach(function (o) { o.start(); });
    return { g: g, f: f, o3: o3 };
  }
  // ---------------------------------------------------------------- the soundtrack (9 Oct 2026): our own music, made on
  // the Threadripper's GPU (ACE-Step, Apache 2.0) - one loop for the waves, one for the Mothership. Each plays from two
  // <audio> players that crossfade a bar before the end (the files are cut on the beat), so the loop has no gap, and the
  // two loops crossfade into each other as the Mothership comes and goes. Slow time plays them slower and lower, like a
  // tape. Nothing loads until an Enhanced game is played with music on; if the files can't play, the space hum stands in.
  var TRACKS = { play: { src: 'music/play.mp3?v=1', xf: 1.95 }, boss: { src: 'music/boss.mp3?v=1', xf: 1.707 } };
  var MUS = null, MUSIC_GAIN = 0.2;
  function makeLoop(a, bus, T) {
    var L = { g: a.createGain(), p: [], cur: 0, failed: false, T: T };
    L.g.gain.value = 0; L.g.connect(bus);
    for (var i = 0; i < 2; i++) {
      var el = new Audio(); el.preload = 'auto'; el.src = T.src;
      if ('preservesPitch' in el) el.preservesPitch = false; else if ('webkitPreservesPitch' in el) el.webkitPreservesPitch = false;
      var g = a.createGain(); g.gain.value = i === 0 ? 1 : 0;
      a.createMediaElementSource(el).connect(g); g.connect(L.g);
      el.addEventListener('error', function () { L.failed = true; });
      L.p.push({ el: el, g: g });
    }
    return L;
  }
  function loopTick(L, a, run, rate) {
    var A = L.p[L.cur], B = L.p[1 - L.cur], now = a.currentTime;
    L.p.forEach(function (q) { if (Math.abs(q.el.playbackRate - rate) > 0.001) q.el.playbackRate = rate; });
    if (!run) { L.p.forEach(function (q) { if (!q.el.paused) q.el.pause(); }); return; }
    if (A.el.paused) { var pr = A.el.play(); if (pr && pr.catch) pr.catch(function () { L.failed = true; }); }
    var d = A.el.duration;
    if (d && isFinite(d) && A.el.currentTime >= d - L.T.xf && B.el.paused) {   // a bar from the end: the other player takes over from the start
      var x = L.T.xf / rate;
      if (B.el.currentTime > 0) { if (B.el.seekable && B.el.seekable.length) B.el.currentTime = 0; else B.el.load(); }   // (a server that can't seek: reload it)
      var pb = B.el.play(); if (pb && pb.catch) pb.catch(function () {});
      B.g.gain.cancelScheduledValues(now); B.g.gain.setValueAtTime(0, now); B.g.gain.linearRampToValueAtTime(1, now + x);
      A.g.gain.cancelScheduledValues(now); A.g.gain.setValueAtTime(1, now); A.g.gain.linearRampToValueAtTime(0, now + x);
      L.cur = 1 - L.cur;
    }
  }
  function restart(L) { L.p.forEach(function (q, i) { q.el.pause(); try { q.el.currentTime = 0; } catch (e) {} q.g.gain.cancelScheduledValues(0); q.g.gain.value = i === L.cur ? 1 : 0; }); }
  // ---------------------------------------------------------------- the thrusters' roar (10 Oct 2026; owner: "hearing the
  // thrusters roar"): a low engine bed - deep rumbling noise and a growl under it - that is barely there while the
  // formation hovers and swells as they fly: the swarm streaming in, divers, the Mothership's engines (full on coming down)
  var THR = null;
  function makeThrust(a, bus) {
    var len = a.sampleRate * 2, buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0), last = 0, i;
    for (i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }   // brown noise: a rumble
    for (i = 0; i < 2000; i++) { var k = i / 2000; d[i] = d[i] * k + d[len - 2000 + i] * (1 - k); }   // (the loop's seam, blended)
    var src = a.createBufferSource(); src.buffer = buf; src.loop = true;
    var f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 300; f.Q.value = 0.8;
    var g = a.createGain(); g.gain.value = 0;
    var o = a.createOscillator(), of = a.createBiquadFilter(), og = a.createGain(); o.type = 'sawtooth'; o.frequency.value = 38; of.type = 'lowpass'; of.frequency.value = 140; og.gain.value = 0;
    src.connect(f); f.connect(g); g.connect(bus); o.connect(of); of.connect(og); og.connect(bus); src.start(); o.start();
    return { f: f, g: g, o: o, og: og };
  }
  function thrustTick(W, A, want) {
    var a = want ? A.ctx() : A.existing(); if (!a) return;
    if (!THR) { if (!want) return; try { THR = makeThrust(a, A.bus()); } catch (e) { THR = { failed: true }; } }
    if (THR.failed) return;
    var hot = 0, n = 0, now = a.currentTime;
    if (want) {
      for (var i = 0; i < W.invaders.length; i++) {
        var v = W.invaders[i]; if (!v.alive) continue; n++;
        var d = v.dv; if (d && d.on !== false && d.t >= 0) hot += d.ph === 'enter' || d.ph === 'dive' ? 1 : 0.4;
      }
      if (W.boss && !W.boss.dead) hot += W.intro > 0 ? 9 : 3;
      hot += W.minis.length * 0.3;
    }
    var k = Math.min(1, hot / 14), slow = W && W.slow > 0 ? 0.8 : 1;
    THR.g.gain.setTargetAtTime(want ? (0.01 * Math.min(1, n / 40) + 0.11 * k) : 0, now, want ? 0.22 : 0.15);
    THR.f.frequency.setTargetAtTime((240 + 1500 * k) * slow, now, 0.3);
    THR.og.gain.setTargetAtTime(want ? 0.004 + 0.035 * k : 0, now, 0.3);
    THR.o.frequency.setTargetAtTime((34 + 20 * k) * slow, now, 0.5);
  }
  var wasBoss = false;
  function frameAudio(W, A, mode, SET) {
    thrustTick(W, A, !!(W && W.enh && !W.demo && !W.attract && mode === 'play' && SET.sound));
    var want = !!(W && W.enh && !W.demo && !W.attract && mode === 'play' && SET.sound && SET.music);
    var a = want ? A.ctx() : A.existing();
    if (!a) return;
    if (want && !MUS) { try { MUS = { play: makeLoop(a, A.bus(), TRACKS.play), boss: makeLoop(a, A.bus(), TRACKS.boss) }; } catch (e) { MUS = { failed: true }; } }
    if (MUS && !MUS.failed && !MUS.play.failed && !MUS.boss.failed) {   // the soundtrack
      var now0 = a.currentTime, bossOn = want && !!W.boss && !W.boss.dead, rate = W && W.slow > 0 ? 0.84 : 1;
      if (bossOn && !wasBoss) restart(MUS.boss);   // each Mothership from the top of its music
      wasBoss = bossOn;
      MUS.play.g.gain.setTargetAtTime(want && !bossOn ? MUSIC_GAIN : 0, now0, want ? 0.5 : 0.15);
      MUS.boss.g.gain.setTargetAtTime(bossOn ? MUSIC_GAIN : 0, now0, 0.5);
      loopTick(MUS.play, a, (want && !bossOn) || MUS.play.g.gain.value > 0.004, rate);
      loopTick(MUS.boss, a, bossOn || MUS.boss.g.gain.value > 0.004, rate);
      if (PAD) PAD.g.gain.setTargetAtTime(0, now0, 0.2);
      return;
    }
    if (!PAD) { if (!want) return; try { PAD = makePad(a, A.bus()); } catch (e) { return; } }
    var now = a.currentTime, tension = 0;
    if (want) {
      if (W.boss) tension = 0.55 + 0.45 * (1 - W.boss.hp / W.boss.max);
      else {
        var low = 0; for (var i = 0; i < W.invaders.length; i++) if (W.invaders[i].alive) low = Math.max(low, W.invaders[i].y + 8);
        tension = Math.max(0, Math.min(1, (low - 90) / (PY - 90)));
      }
      PAD.f.frequency.setTargetAtTime(180 + 950 * tension, now, 0.6);
      PAD.o3.frequency.setTargetAtTime((tension > 0.7 ? 87.31 : 82.41) * (W.slow > 0 ? 0.84 : 1), now, 0.8);   // slow time drags the hum down
    }
    PAD.g.gain.setTargetAtTime(want ? 0.02 + 0.018 * tension : 0, now, want ? 0.8 : 0.2);
  }

  window.InvEnh = { washState: washState, draw: draw, sound: sound, frameAudio: frameAudio, FONT: FONT, ART: ART, PAL: PAL, CAP: CAP, diveAngle: diveAngle, artOf: artOf, ARTK: ARTK, phantomAlpha: phantomAlpha, shake: function () { return SHAKE; }, music: function () { return MUS; } };
})();
