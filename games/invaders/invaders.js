/* 365 Invaders - the look and the sound (3 Oct 2026). The rules are in engine.js (window.InvEngine); the cabinet - bar,
 * scores, settings, controls, the game loop - is ../common/arcade.js. All the pixel art below is our own, drawn for this
 * game; the sounds are made on the spot. Classic space look: black sky, a few stars, coloured rows. */
(function () {
  'use strict';
  var E = window.InvEngine, A = window.Arcade365;

  // ---------------------------------------------------------------- pixel art (12 x 8 invaders, two frames each)
  var ART = {
    // the orb: top row, 30 points
    orb: [[
      '....####....',
      '..########..',
      '.##..##..##.',
      '.##########.',
      '..########..',
      '...#....#...',
      '..#..##..#..',
      '.#........#.'
    ], [
      '....####....',
      '..########..',
      '.##..##..##.',
      '.##########.',
      '..########..',
      '...#....#...',
      '...#.##.#...',
      '..#......#..'
    ]],
    // the moth: rows 2-3, 20 points
    moth: [[
      '##........##',
      '.##..##..##.',
      '..########..',
      '.##.####.##.',
      '############',
      '#..######..#',
      '...#....#...',
      '..#......#..'
    ], [
      '............',
      '#...####...#',
      '##.######.##',
      '.##.####.##.',
      '.##########.',
      '...######...',
      '..#.#..#.#..',
      '.#........#.'
    ]],
    // the bot: rows 4-5, 10 points
    bot: [[
      '..#......#..',
      '...######...',
      '..#.####.#..',
      '..########..',
      '#.##.##.##.#',
      '#..######..#',
      '...#....#...',
      '..##....##..'
    ], [
      '..#......#..',
      '...######...',
      '..#.####.#..',
      '..########..',
      '..##.##.##..',
      '.#.######.#.',
      '#..#....#..#',
      '...##..##...'
    ]],
    ship: [
      '......#......',
      '.....###.....',
      '.....###.....',
      '..#.#####.#..',
      '.###########.',
      '#############',
      '#############',
      '##.##...##.##'
    ],
    shipBoom: [[
      '..#....#..#..',
      '#...#.....#.#',
      '..#..##.#....',
      '.#.#####..#..',
      '...######.#..',
      '#.#######..#.',
      '.###########.',
      '##.##.#.##.##'
    ], [
      '#.....#....#.',
      '..#.#...#....',
      '.#...#...#.#.',
      '...###.#.....',
      '#..####.##..#',
      '..#######.#..',
      '.####.######.',
      '#.###.#.###.#'
    ]],
    saucer: [
      '.....######.....',
      '...##########...',
      '..############..',
      '.##.##.##.##.##.',
      '################',
      '..###..##..###..',
      '...#........#...'
    ],
    boom: [
      '#...#..#...#',
      '.#...##...#.',
      '..#......#..',
      '##........##',
      '..#......#..',
      '.#..#..#..#.',
      '#...#..#...#',
      '............'
    ],
    // invader bombs, 3 x 7, three kinds with a few frames each
    bombs: [
      [['.#.', '#..', '.#.', '..#', '.#.', '#..', '.#.'], ['.#.', '..#', '.#.', '#..', '.#.', '..#', '.#.']],
      [['.#.', '.#.', '.#.', '.#.', '.#.', '###', '.#.'], ['.#.', '###', '.#.', '.#.', '.#.', '.#.', '.#.']],
      [['.#.', '.#.', '###', '.#.', '.#.', '###', '.#.'], ['.#.', '###', '.#.', '.#.', '###', '.#.', '.#.']]
    ]
  };
  var COL = { orb: '#ff5cc8', moth: '#3fe0ff', bot: '#ffd84a', ship: '#5cff6b', shield: '#3fd94f', saucer: '#ff4040', shot: '#ffffff', bomb: '#ffb15c', ground: '#3fd94f', text: '#ffffff' };
  var KIND = ['orb', 'moth', 'bot'];
  var SPR = {};
  function sprites() {
    if (SPR.ready) return;
    KIND.forEach(function (k) { SPR[k] = [A.sprite(ART[k][0], COL[k]), A.sprite(ART[k][1], COL[k])]; });
    SPR.ship = A.sprite(ART.ship, COL.ship);
    SPR.shipBoom = [A.sprite(ART.shipBoom[0], COL.ship), A.sprite(ART.shipBoom[1], COL.ship)];
    SPR.saucer = A.sprite(ART.saucer, COL.saucer);
    SPR.boom = A.sprite(ART.boom, '#ffffff');
    SPR.boomRed = A.sprite(ART.boom, COL.saucer);
    SPR.bombs = ART.bombs.map(function (k) { return k.map(function (f) { return A.sprite(f, COL.bomb); }); });
    SPR.ready = true;
  }

  // ---------------------------------------------------------------- a 5 x 7 pixel font for the words on the screen
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
    Y: [17, 17, 17, 10, 4, 4, 4], Z: [31, 1, 2, 4, 8, 16, 31], '+': [0, 4, 4, 31, 4, 4, 0], '-': [0, 0, 0, 31, 0, 0, 0], '!': [4, 4, 4, 4, 4, 0, 4], ' ': [0, 0, 0, 0, 0, 0, 0]
  };
  function text(g, s, cx, y, colour, align) {   // align: centred (default), 'left' or 'right' of cx
    s = String(s).toUpperCase();
    var wd = s.length * 6 - 1, x = Math.round(align === 'left' ? cx : align === 'right' ? cx - wd : cx - wd / 2);
    g.fillStyle = colour || COL.text;
    for (var i = 0; i < s.length; i++) {
      var rows = FONT[s.charAt(i)] || FONT[' '];
      for (var r = 0; r < 7; r++) for (var c = 0; c < 5; c++) if (rows[r] & (16 >> c)) g.fillRect(x + i * 6 + c, y + r, 1, 1);
    }
  }

  // ---------------------------------------------------------------- the sky: a few stars that twinkle (the same every visit)
  var STARS = (function () {
    var out = [], a = 365;
    function r() { a = (a * 1103515245 + 12345) & 0x7fffffff; return a / 0x7fffffff; }
    for (var i = 0; i < 70; i++) out.push({ x: Math.floor(r() * E.WIDTH), y: Math.floor(r() * (E.GROUND - 4)), p: r() * 6.28, b: 0.25 + r() * 0.5 });
    return out;
  })();

  // shields drawn once and again only when they change
  var shieldCache = [];
  function shieldCanvas(i, S) {
    var c = shieldCache[i];
    if (c && c.ver === S.ver && c.px === S.px) return c.cv;
    var cv = (c && c.cv) || document.createElement('canvas'); cv.width = S.w; cv.height = S.h;
    var x = cv.getContext('2d'); x.clearRect(0, 0, S.w, S.h); x.fillStyle = COL.shield;
    for (var yy = 0; yy < S.h; yy++) for (var xx = 0; xx < S.w; xx++) if (S.px[yy * S.w + xx]) x.fillRect(xx, yy, 1, 1);
    shieldCache[i] = { cv: cv, ver: S.ver, px: S.px };
    return cv;
  }

  function pad5(n) { return ('00000' + Math.min(99999, n)).slice(-5); }
  function draw(g, W, t, mode, info) {
    sprites();
    g.fillStyle = '#000'; g.fillRect(0, 0, E.WIDTH, E.HEIGHT);
    for (var i = 0; i < STARS.length; i++) {
      var s = STARS[i], a = s.b * (0.55 + 0.45 * Math.sin(t / 700 + s.p));
      g.fillStyle = 'rgba(170,190,255,' + a.toFixed(2) + ')'; g.fillRect(s.x, s.y, 1, 1);
    }
    // the mystery ship
    if (W.saucer) g.drawImage(SPR.saucer, Math.round(W.saucer.x), E.SAUCER_Y);
    // the invaders, appearing one at a time at the start of a wave
    var shown = W.demo ? W.invaders.length : (W.phase === 'spawn' ? W.spawnN : W.invaders.length);
    for (i = 0; i < W.invaders.length; i++) {
      var v = W.invaders[W.order[i]]; if (!v.alive || i >= shown) continue;
      g.drawImage(SPR[KIND[v.type]][v.f], v.x, v.y);
    }
    // explosions
    W.booms.forEach(function (b) {
      if (b.kind === 'inv') g.drawImage(SPR.boom, b.x, b.y);
      else if (b.kind === 'ufo') g.drawImage(SPR.boomRed, b.x + 2, b.y - 1);
      else { g.fillStyle = b.kind === 'top' ? COL.saucer : '#ffffff'; for (var k = 0; k < 6; k++) g.fillRect(b.x + ((k * 5) % 7), b.y + ((k * 3) % 5), 1, 1); }
    });
    // shields
    W.shields.forEach(function (S, k) { g.drawImage(shieldCanvas(k, S), S.x, S.y); });
    // the ship
    var P = W.player;
    if (P.dead) g.drawImage(SPR.shipBoom[(Math.floor(P.dead / 6)) & 1], Math.round(P.x), E.PY);
    else if (!W.over && !(W.hold > 0 && (W.hold >> 2) & 1)) g.drawImage(SPR.ship, Math.round(P.x), E.PY);
    // shots
    W.fx.length = 0;   // where things happened: only the Enhanced picture uses it
    W.shots.forEach(function (s) { g.fillStyle = COL.shot; g.fillRect(Math.round(s.x), Math.round(s.y), 1, 4); });
    W.bombs.forEach(function (B) { var fr = SPR.bombs[B.kind]; g.drawImage(fr[(B.f >> 3) % fr.length], Math.round(B.x), Math.round(B.y)); });
    // the ground and the spare ships
    // the score along the top, the old arcade way (the bar stays one row, so the screen gets the height)
    text(g, 'SCORE', 8, 4, '#8fa3d1', 'left'); text(g, pad5(W.score), 44, 4, '#ffffff', 'left');
    text(g, 'WAVE ' + W.wave, E.WIDTH / 2 + 2, 4, '#8fa3d1');
    text(g, pad5(info ? info.best : W.score), E.WIDTH - 8, 4, '#ffd84a', 'right'); text(g, 'BEST', E.WIDTH - 44, 4, '#8fa3d1', 'right');
    g.fillStyle = COL.ground; g.fillRect(0, E.GROUND, E.WIDTH, 1);
    for (i = 0; i < Math.min(8, W.lives - (P.dead ? 0 : 1)); i++) g.drawImage(SPR.ship, 8 + i * 17, E.GROUND + 5);
    // floating scores and the wave banner
    W.pops.forEach(function (p) { text(g, p.text, p.x, p.y, COL.saucer); });
    if (W.phase === 'clear') text(g, 'WAVE ' + W.wave + ' CLEARED', E.WIDTH / 2, 120, '#5cff6b');
    else if (W.phase === 'spawn' && !W.demo) text(g, 'WAVE ' + W.wave, E.WIDTH / 2, 30, '#ffffff');
  }

  // ---------------------------------------------------------------- sounds (made on the spot: nothing is downloaded)
  var BEAT = [92, 82, 73, 69];
  function sound(name, S, e) {
    switch (name) {
      case 'shoot': S.tone(1100, 0.16, 0.035, { type: 'square', to: 220 }); break;
      case 'hit': S.noise(0.2, 0.14, 5000); S.tone(320, 0.12, 0.025, { type: 'square', to: 90 }); break;
      case 'boom': S.noise(1.1, 0.28, 2600); S.tone(160, 0.8, 0.05, { type: 'sawtooth', to: 40 }); break;
      case 'beat': S.tone(BEAT[(e && e.n) || 0], 0.1, 0.09, { type: 'square' }); break;
      case 'ufo': S.tone(e && e.n % 2 ? 780 : 620, 0.11, 0.022, { type: 'sawtooth', to: e && e.n % 2 ? 620 : 780 }); break;
      case 'ufohit': [880, 660, 990, 1320].forEach(function (f, k) { S.tone(f, 0.09, 0.05, { type: 'square', when: k * 0.08 }); }); break;
      case 'extra': [523, 659, 784, 1047, 784, 1047].forEach(function (f, k) { S.tone(f, 0.1, 0.05, { type: 'square', when: k * 0.09 }); }); break;
      case 'wave': [392, 523, 659, 784, 1047].forEach(function (f, k) { S.tone(f, 0.13, 0.05, { type: 'triangle', when: k * 0.1 }); }); break;
      case 'over': [392, 330, 262, 196].forEach(function (f, k) { S.tone(f, 0.28, 0.06, { type: 'triangle', when: k * 0.25 }); }); break;
    }
  }

  // Enhanced (3 Oct 2026, the default): power-ups, combos, the Mothership, a glowing hi-res picture and fuller sound -
  // enhanced.js. Retro: the plain game as it first went live, drawn small and blown up. Each keeps its own best scores.
  var X = window.InvEnh, current = null;
  var reducedMotion = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  A.start({
    id: 'invaders', store: 'inv365', title: '365 Invaders', width: E.WIDTH, height: E.HEIGHT,
    speeds: { options: [[1, 'Gentle'], [2, 'Classic'], [3, 'Fast']], def: 1 },
    settings: [
      { key: 'style', type: 'seg', label: 'Game', small: 'Enhanced has power-ups, combos and a Mothership every fifth wave. Retro is the plain game. Changes from your next game.',
        options: [['enh', 'Enhanced'], ['retro', 'Retro']], def: 'enh' },
      { key: 'music', type: 'switch', label: 'Music', small: 'A low space hum that builds as the invaders come down (Enhanced).', def: true },
      { key: 'shake', type: 'switch', label: 'Screen shake', small: 'The screen shakes when something big blows up (Enhanced).', def: !reducedMotion }
    ],
    newWorld: function (speed, set) { current = E.newWorld(speed, null, set && set.style === 'retro' ? 'classic' : 'enh'); return current; },
    hires: function (set, W) { return W ? W.enh : set.style !== 'retro'; },
    step: E.step, hud: E.hud,
    draw: function (g, W, t, mode, info) { current = W; return W.enh ? X.draw(g, W, t, mode, info) : draw(g, W, t, mode, info); },
    sound: function (name, kit, e) { return current && current.enh ? X.sound(name, kit, e) : sound(name, kit, e); },
    frameAudio: X.frameAudio,
    quietSay: function (W) { return W.enh; },   // Enhanced draws its own banners and labels
    statKey: function (W) { return (W.enh ? 'e' : 'v') + W.speed; },
    statKeyFor: function (set, speed) { return (set.style === 'retro' ? 'v' : 'e') + speed; },
    // the Hall of Fame's boards: the same slots as My scores (Enhanced e1-e3, Retro v1-v3)
    hofLevels: [['e1', 'Gentle'], ['e2', 'Classic'], ['e3', 'Fast'], ['v1', 'Retro · Gentle'], ['v2', 'Retro · Classic'], ['v3', 'Retro · Fast']],
    styleName: function (set) { return set.style === 'retro' ? 'Retro' : 'Enhanced'; },
    overText: function (W) { return W.landed ? 'They landed!' : 'Game over'; },
    titleText: 'Stop the invaders before they reach the ground. Catch the falling capsules for <b>rapid fire</b>, a <b>spread shot</b> or a <b>shield</b> &mdash; and watch out for the Mothership.',
    keysText: '<b>&larr; &rarr;</b> or the mouse to move &middot; <b>Space</b> or click to fire &middot; <b>P</b> to pause',
    touchText: 'Tap <b>&#9664; &#9654;</b> to move and <b>Fire</b> to shoot &mdash; or drag on the screen',
    legend: [
      { rows: ART.saucer, colour: COL.saucer, text: '= ? mystery' },
      { rows: ART.orb[0], colour: COL.orb, text: '= 30 points' },
      { rows: ART.moth[0], colour: COL.moth, text: '= 20 points' },
      { rows: ART.bot[0], colour: COL.bot, text: '= 10 points' }
    ],
    help: [
      '<b>The aim:</b> shoot every invader before they reach the ground. Clear them all and a new wave comes, starting a little lower.',
      '<b>Move</b> with the <b>&larr; &rarr;</b> arrow keys (or A and D), or just move the mouse. On a tablet, use the &#9664; &#9654; buttons or drag on the screen.',
      '<b>Fire</b> with the <b>Space bar</b>, a mouse click or the Fire button. One shot at a time, so make each one count.',
      '<b>Hide behind the green shields.</b> They wear away when they are hit, from either side.',
      '<b>Points:</b> 10, 20 or 30 for an invader (the higher up, the more) and 50 to 300 for the red mystery ship across the top. An extra life at 1,500 points.',
      '<b>Capsules</b> sometimes fall when an invader is hit. Catch one with your ship: <b>R</b> rapid fire (two quicker shots), <b>S</b> spread shot (three at once), <b>+</b> a shield bubble that takes one hit.',
      '<b>Combos:</b> hit six in a row without missing for double points, then triple and four times. A miss starts it again.',
      '<b>The Mothership</b> arrives every fifth wave. Keep hitting it &mdash; watch its bar at the top. A wave cleared without losing a ship is worth 500 more, and there is an extra life every 5,000 points.',
      '<b>Settings:</b> <b>Speed</b> &mdash; Gentle is slower with five lives, Classic is the old arcade pace, Fast is for experts. <b>Game</b> &mdash; Enhanced, or Retro for the plain game without the extras.',
      '<b>P</b> pauses. The game also pauses itself if you click away to another window.'
    ]
  });
})();
