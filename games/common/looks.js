/* 365 Games - tables and card backs (5 Oct 2026). Owner: "yes do the card backs and table colours next" (after
 * Microsoft's Solitaire app, where you pick a theme and a card back). Our own designs only: twelve tables and twelve
 * card backs, most free, a few won with Journey stars (all the card games' Journeys count together).
 * One choice for every card game: it is kept as cards365:look and each game starts with it.
 *
 *   Looks.open({ felt, back, pick(kind, id) })   the gallery; pick() is called when a design is chosen
 *   Looks.shared()                               {felt, back} chosen last in any game, or null
 *   Looks.remember(felt, back)                   keep the choice for every game
 *   Looks.known(kind, id)                        a design that exists (kind 'felt' | 'back')
 *   Looks.stars()                                Journey stars, all games together
 *   Looks.newlyUnlocked()                        names of specials unlocked since last asked (for the Journey's win card)
 * The table and card-back styles for every design are made here (body.felt-<id>, body.back-<id> .back), so a new
 * design needs no change to table.css. */
(function () {
  'use strict';
  var STORES = ['sol365', 'fc365', 'sp365', 'tp365', 'py365', 'he365', 'gr365', 'cr365', 'wh365'];
  function svg(s) { return 'url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140" preserveAspectRatio="xMidYMid slice">' + s + '</svg>') + '")'; }
  function rep(n, f) { var o = ''; for (var i = 0; i < n; i++) o += f(i); return o; }

  // ---------------------------------------------------------------- the tables
  // a, b: the felt's light and dark; primary: the sheets' buttons; bg: a table with its own look (else felt a -> b)
  var WAVES = svg('<path d="M0 30 Q12 24 25 30 T50 30 T75 30 T100 30" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="2"/><path d="M0 100 Q12 94 25 100 T50 100 T75 100 T100 100" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="2"/>').replace('preserveAspectRatio%3D%22xMidYMid%20slice%22', '');
  var TABLES = [
    { id: 'green', name: 'Green baize', a: '#1f7a45', b: '#0b3d20', primary: '#146c3a' },
    { id: 'blue', name: 'Blue', a: '#1f5f9c', b: '#0a2547', primary: '#1a5da3' },
    { id: 'red', name: 'Red', a: '#8e2537', b: '#3b0c16', primary: '#8e2537' },
    { id: 'slate', name: 'Grey', a: '#45526a', b: '#141a25', primary: '#34465f' },
    { id: 'teal', name: 'Teal', a: '#1c7f7a', b: '#07302e', primary: '#13605c' },
    { id: 'plum', name: 'Plum', a: '#6c2d70', b: '#230826', primary: '#5e2462' },
    { id: 'oak', name: 'Oak table', a: '#8a5a2b', b: '#3d220c', primary: '#7a4a1e', bar: 'rgba(30, 16, 4, .6)', tex: true,
      bg: 'radial-gradient(120% 90% at 50% 30%, rgba(255, 220, 170, .22), rgba(0, 0, 0, .5)), repeating-linear-gradient(91deg, rgba(0, 0, 0, .12) 0 2px, transparent 2px 9px, rgba(255, 255, 255, .04) 9px 11px, transparent 11px 23px), linear-gradient(180deg, #7a4a22, #5a3416)' },
    { id: 'night', name: 'Night sky', a: '#1b2350', b: '#060918', primary: '#2b3a8a', bar: 'rgba(4, 6, 20, .6)', tex: true,
      bg: 'radial-gradient(1px 1px at 12% 18%, rgba(255, 255, 255, .7), transparent 60%), radial-gradient(1px 1px at 78% 12%, rgba(255, 255, 255, .6), transparent 60%), radial-gradient(1.5px 1.5px at 42% 8%, rgba(255, 240, 200, .7), transparent 60%), radial-gradient(1px 1px at 90% 40%, rgba(255, 255, 255, .5), transparent 60%), radial-gradient(120% 90% at 50% 30%, #1f2a60, #060918)' },
    { id: 'harbour', name: 'Poole Harbour', stars: 20, a: '#1e6f9e', b: '#052538', primary: '#155c86',
      bg: WAVES + ' 0 0 / 220px 160px, radial-gradient(120% 90% at 50% 30%, #2378a8, #052538)' },
    { id: 'heath', name: 'Purbeck heath', stars: 50, a: '#5c3b6b', b: '#1b0d24', primary: '#5a3468',
      bg: 'radial-gradient(circle at 20% 30%, rgba(231, 166, 217, .16) 0 1.5px, transparent 2px) 0 0 / 14px 14px, radial-gradient(circle at 70% 75%, rgba(150, 190, 110, .14) 0 1.5px, transparent 2px) 0 0 / 18px 18px, radial-gradient(120% 90% at 50% 30%, #6a4579, #1b0d24)' },
    { id: 'sunset', name: 'Pier at sunset', stars: 80, a: '#c0566a', b: '#2a1640', primary: '#a2445e', bar: 'rgba(30, 10, 30, .55)',
      bg: 'radial-gradient(60% 40% at 50% 26%, rgba(255, 214, 140, .55), transparent 70%), linear-gradient(180deg, #e48a62 0%, #b24a6a 32%, #5a2a5e 66%, #1e1238 100%)' },
    { id: 'velvet', name: 'Velvet and gold', stars: 120, a: '#5c1426', b: '#120409', primary: '#8c6a1a', bar: 'rgba(20, 4, 8, .6)',
      bg: 'repeating-linear-gradient(45deg, rgba(217, 165, 32, .05) 0 1px, transparent 1px 16px), repeating-linear-gradient(-45deg, rgba(217, 165, 32, .05) 0 1px, transparent 1px 16px), radial-gradient(120% 90% at 50% 30%, #64182b, #120409)' }
  ];

  // ---------------------------------------------------------------- the card backs
  // bg: the back's own picture; pill: the "365" badge in the middle (its fill, ring and letters; top for a picture back)
  var STARS = rep(26, function (i) { return '<circle cx="' + ((i * 37) % 97 + 2) + '" cy="' + ((i * 53) % 128 + 4) + '" r="' + (i % 4 ? 0.8 : 1.4) + '" fill="#fff" opacity="' + (i % 3 ? 0.65 : 0.95) + '"/>'; });
  var BACKS = [
    { id: 'navy', name: '365 navy', pill: ['#0a2245', '#22c3ee', '#22c3ee'],
      bg: 'radial-gradient(circle at 50% 50%, rgba(255, 255, 255, .14), rgba(255, 255, 255, 0) 55%), repeating-linear-gradient(45deg, rgba(34, 195, 238, .28) 0 2px, transparent 2px 10px), repeating-linear-gradient(-45deg, rgba(34, 195, 238, .28) 0 2px, transparent 2px 10px), linear-gradient(155deg, #17447a, #0a2245)' },
    { id: 'royal', name: 'Royal red', pill: ['#4a0712', '#e3b44a', '#ffd98a'],
      bg: 'radial-gradient(circle at 50% 50%, rgba(255, 220, 140, .22), rgba(255, 255, 255, 0) 50%), radial-gradient(circle at 0 0, rgba(255, 214, 120, .35) 0 2px, transparent 3px) 0 0 / 12px 12px, radial-gradient(circle at 6px 6px, rgba(255, 214, 120, .22) 0 3px, transparent 4px) 0 0 / 12px 12px, linear-gradient(155deg, #8e1d2c, #4a0712)' },
    { id: 'sea', name: 'Seaside', pill: ['#0b5e86', '#fff3c4', '#fff3c4', '66%'],
      bg: 'radial-gradient(circle at 50% 38%, #ffe7a3 0 12%, rgba(255, 200, 90, .45) 13%, transparent 28%), repeating-radial-gradient(ellipse at 50% 120%, rgba(255, 255, 255, .22) 0 2px, transparent 2px 9px), linear-gradient(180deg, #ff9a6a 0%, #ffcf8a 30%, #2aa3c4 52%, #0b5e86 100%)' },
    { id: 'huts', name: 'Beach huts', pill: ['#fbf6ea', '#1d3557', '#1d3557'],
      bg: 'linear-gradient(180deg, rgba(0, 0, 0, 0) 0 78%, #f2d9a2 78%), linear-gradient(90deg, #e94f4f 0 17%, #fbf6ea 17% 20.75%, #4fb0e9 20.75% 37.75%, #fbf6ea 37.75% 41.5%, #f2c94c 41.5% 58.5%, #fbf6ea 58.5% 62.25%, #6fcf97 62.25% 79.25%, #fbf6ea 79.25% 83%, #bb6bd9 83%)' },
    { id: 'tartan', name: 'Tartan', pill: ['#174a2e', '#ffd65a', '#ffd65a'],
      bg: 'repeating-linear-gradient(0deg, rgba(190, 30, 45, .55) 0 5px, transparent 5px 16px), repeating-linear-gradient(90deg, rgba(190, 30, 45, .55) 0 5px, transparent 5px 16px), repeating-linear-gradient(0deg, rgba(255, 214, 90, .45) 0 1px, transparent 1px 8px), repeating-linear-gradient(90deg, rgba(255, 214, 90, .45) 0 1px, transparent 1px 8px), linear-gradient(#174a2e, #174a2e)' },
    { id: 'heather', name: 'Heather', pill: ['#33173f', '#e7a6d9', '#f3d3ec'],
      bg: 'radial-gradient(circle at 3px 3px, #e7a6d9 0 1.6px, transparent 2px) 0 0 / 9px 9px, radial-gradient(circle at 7px 7px, #b07cc0 0 1.6px, transparent 2px) 0 0 / 9px 9px, linear-gradient(160deg, #6b3a7d, #33173f)' },
    { id: 'forest', name: 'Forest', pill: ['#123020', '#a6dc8c', '#d6f5c8'],
      bg: 'repeating-linear-gradient(60deg, rgba(160, 220, 140, .25) 0 2px, transparent 2px 12px), repeating-linear-gradient(-60deg, rgba(160, 220, 140, .25) 0 2px, transparent 2px 12px), linear-gradient(160deg, #2e6b3a, #123020)' },
    // the specials, won with Journey stars: pictures of the coast
    { id: 'chalk', name: 'Old Harry', stars: 10, pill: ['#14567f', '#ffffff', '#ffffff', '86%'],
      bg: svg('<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fd0f5"/><stop offset="1" stop-color="#eaf7ff"/></linearGradient></defs><rect width="100" height="140" fill="url(#s)"/>'
        + '<ellipse cx="22" cy="26" rx="12" ry="4" fill="#fff" opacity=".8"/><ellipse cx="74" cy="18" rx="10" ry="3" fill="#fff" opacity=".8"/><rect y="92" width="100" height="48" fill="#2f8fc0"/>'
        + '<path d="M0 54 Q24 48 46 56 L50 96 L0 96 Z" fill="#f6f4ee"/><path d="M0 54 Q24 48 46 56 L46 61 Q24 54 0 60 Z" fill="#6f9a4c"/>'
        + '<path d="M58 96 L60 68 L72 67 L75 96 Z" fill="#f6f4ee"/><path d="M60 68 L72 67 L72 71 L60 72 Z" fill="#6f9a4c"/><path d="M82 96 L84 80 L92 80 L93 96 Z" fill="#efece4"/><path d="M84 80 L92 80 L92 83 L84 83 Z" fill="#6f9a4c"/>'
        + '<path d="M0 104 Q12 100 25 104 T50 104 T75 104 T100 104" fill="none" stroke="rgba(255,255,255,.45)" stroke-width="1.5"/>') + ' center / cover' },
    { id: 'lighthouse', name: 'Portland lighthouse', stars: 30, pill: ['#14567f', '#ffffff', '#ffffff', '88%'],
      bg: svg('<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fc4f0"/><stop offset="1" stop-color="#fff2cc"/></linearGradient></defs><rect width="100" height="140" fill="url(#s)"/>'
        + '<path d="M50 30 L96 8 L96 22 Z M50 30 L4 8 L4 22 Z" fill="#fff6c4" opacity=".55"/><rect y="104" width="100" height="36" fill="#2f8fc0"/><path d="M14 112 Q40 98 70 104 Q86 106 92 116 L14 116 Z" fill="#6b6255"/>'
        + '<path d="M42 104 L45 36 L55 36 L58 104 Z" fill="#fbfaf4"/><path d="M44.2 54 L55.8 54 L56.4 66 L43.6 66 Z M43.1 78 L56.9 78 L57.5 90 L42.5 90 Z" fill="#d12a2a"/>'
        + '<rect x="44" y="26" width="12" height="11" fill="#2b2b2b"/><rect x="45.5" y="28" width="9" height="7" fill="#ffd257"/><path d="M42 26 L50 18 L58 26 Z" fill="#d12a2a"/><rect x="41" y="36" width="18" height="2" fill="#2b2b2b"/>') + ' center / cover' },
    { id: 'pier', name: 'Pier lights', stars: 60, pill: ['#10264f', '#ffd257', '#ffe9a8', '88%'],
      bg: svg('<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b1640"/><stop offset="1" stop-color="#2a3b78"/></linearGradient></defs><rect width="100" height="140" fill="url(#s)"/>' + STARS
        + '<circle cx="74" cy="26" r="9" fill="#fff6d6"/><rect y="96" width="100" height="44" fill="#10264f"/><rect x="0" y="88" width="100" height="3" fill="#3b2f29"/>' + rep(9, function (i) { return '<rect x="' + (4 + i * 11) + '" y="91" width="1.6" height="12" fill="#3b2f29"/>'; })
        + '<path d="M0 70 Q12 80 25 70 Q37 80 50 70 Q62 80 75 70 Q87 80 100 70" fill="none" stroke="#5a4a3a" stroke-width=".8"/>' + rep(16, function (i) { var x = i * 6.6 + 1, y = 70 + Math.sin(((x % 25) / 25) * Math.PI) * 9.6; return '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="1.6" fill="' + ['#ffd257', '#ff8ad8', '#8ff0ff', '#9dff9a'][i % 4] + '"/>'; })
        + '<path d="M0 110 Q12 106 25 110 T50 110 T75 110 T100 110" fill="none" stroke="rgba(255,214,90,.35)" stroke-width="1.5"/>') + ' center / cover' },
    { id: 'starry', name: 'Starry night', stars: 100, pill: ['#0a1240', '#bcd2ff', '#e6eeff', '74%'],
      bg: svg('<defs><radialGradient id="s" cx=".5" cy=".3" r=".9"><stop offset="0" stop-color="#2a3d8f"/><stop offset="1" stop-color="#070b2a"/></radialGradient></defs><rect width="100" height="140" fill="url(#s)"/>' + STARS
        + '<circle cx="50" cy="44" r="16" fill="#fff6d6"/><circle cx="57" cy="39" r="14" fill="#16215c"/><path d="M14 18 L34 30" stroke="#fff" stroke-width="1" opacity=".8"/>'
        + rep(5, function (i) { return '<path d="M' + (20 + i * 15) + ' ' + (88 + (i % 2) * 10) + ' l2 5 5 0 -4 3 2 5 -5 -3 -5 3 2 -5 -4 -3 5 0z" fill="#ffd257" opacity=".85"/>'; })) + ' center / cover' },
    { id: 'gold', name: 'Gold leaf', stars: 150, pill: ['#111111', '#d9a520', '#f5d77a'],
      bg: svg('<defs><pattern id="p" width="20" height="14" patternUnits="userSpaceOnUse"><path d="M0 14 A10 10 0 0 1 20 14" fill="none" stroke="#d9a520" stroke-width="1.1"/><path d="M4 14 A6 6 0 0 1 16 14" fill="none" stroke="#b8860b" stroke-width=".9"/><path d="M8 14 A2 2 0 0 1 12 14" fill="none" stroke="#f5d77a" stroke-width=".9"/></pattern></defs>'
        + '<rect width="100" height="140" fill="#121212"/><rect width="100" height="140" fill="url(#p)"/><rect x="5" y="5" width="90" height="130" fill="none" stroke="#d9a520" stroke-width="1.5"/><rect x="8" y="8" width="84" height="124" fill="none" stroke="#b8860b" stroke-width=".6"/>') + ' center / cover' }
  ];

  // ---------------------------------------------------------------- the styles: every table and back, and the gallery
  var css = '';
  TABLES.forEach(function (t) {
    css += 'body.felt-' + t.id + '{--felt-a:' + t.a + ';--felt-b:' + t.b + ';--primary:' + t.primary + (t.bar ? ';--bar:' + t.bar : '') + '}';
    if (t.bg) css += 'body.felt-' + t.id + '{background:' + t.bg + ';background-color:' + t.b + '}';
    if (t.tex || t.bg) css += 'body.felt-' + t.id + '::before{opacity:.12}';
  });
  BACKS.forEach(function (b) {
    var p = b.pill, pill = 'background:' + p[0] + ';border-color:' + p[1] + ';color:' + p[2] + ';top:' + (p[3] || '50%') + ';box-shadow:0 0 10px ' + p[1] + '66';
    css += 'body.back-' + b.id + ' .back{background:' + b.bg + '}body.back-' + b.id + ' .back::after{' + pill + '}';
    css += '.lk-b-' + b.id + '{background:' + b.bg + '}.lk-b-' + b.id + '::after{' + pill + '}';
  });
  TABLES.forEach(function (t) { css += '.lk-f-' + t.id + '{background:' + (t.bg || 'radial-gradient(120% 90% at 50% 30%,' + t.a + ',' + t.b + ')') + ';background-color:' + t.b + '}'; });
  css += ''
    + '.lk-scrim{position:fixed;inset:0;z-index:6040;display:grid;place-items:center;padding:12px;background:rgba(2,10,6,.5);-webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px)}'
    + '.lk-scrim[hidden]{display:none}'
    + '.lk-sheet{width:min(820px,100%);max-height:calc(100% - 8px);overflow:auto;padding:22px 22px 18px;border-radius:20px;background:#fbfaf5;color:#15211a;box-shadow:0 24px 70px rgba(0,0,0,.5);font:400 16px/1.4 Archivo,"Segoe UI",sans-serif;animation:lkIn .35s cubic-bezier(.2,.9,.3,1.12)}'
    + '.lk-sheet h2{margin:0 0 4px;font:600 28px/1.15 "Clash Display",Archivo,"Segoe UI",sans-serif}'
    + '.lk-soft{margin:0;color:#5b6b60;font-size:15px}.lk-star{display:inline-flex;align-items:center;gap:6px;margin-top:8px;padding:5px 12px;border-radius:999px;background:#fff6dc;color:#6a4b00;font-weight:700;font-size:14px}'
    + '.lk-h{margin:18px 0 8px;font:700 13px/1 Archivo,"Segoe UI",sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#5b6b60}'
    + '.lk-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px}'
    + '.lk-tile{position:relative;display:flex;flex-direction:column;align-items:center;gap:6px;padding:8px 6px 8px;border-radius:14px;border:2px solid #e2ded2;background:#fff;color:#15211a;font:700 14.5px/1.15 Archivo,"Segoe UI",sans-serif;text-align:center;cursor:pointer;transition:transform .15s,border-color .15s,box-shadow .15s}'
    + '.lk-tile:hover{transform:translateY(-2px);border-color:#c9c3b3;box-shadow:0 8px 18px rgba(20,40,30,.14)}'
    + '.lk-tile:focus-visible{outline:3px solid #22a3ee;outline-offset:2px}'
    + '.lk-tile[aria-pressed="true"]{border-color:#146c3a;box-shadow:0 0 0 2px #146c3a inset}'
    + '.lk-tile[aria-pressed="true"]::after{content:"\\2713";position:absolute;top:-8px;right:-8px;display:grid;place-items:center;width:24px;height:24px;border-radius:50%;background:#146c3a;color:#fff;font-size:14px;box-shadow:0 2px 6px rgba(0,0,0,.3)}'
    + '.lk-tile.lk-locked{background:#f4f2ea;color:#7a8076}.lk-tile.lk-locked .lk-card,.lk-tile.lk-locked .lk-felt{filter:grayscale(.75) brightness(.85)}'
    + '.lk-lock{display:inline-flex;align-items:center;gap:3px;padding:2px 7px;border-radius:999px;background:#fff6dc;color:#6a4b00;font-size:13px}'
    + '.lk-card{position:relative;width:62px;height:87px;border-radius:7px;border:3px solid #fbfaf4;box-shadow:0 0 0 1px #cfc9b8,0 2px 6px rgba(0,0,0,.25);overflow:hidden}'
    + '.lk-card::after{content:"365";position:absolute;left:50%;transform:translate(-50%,-50%);padding:2px 6px;border-radius:999px;border:1.5px solid;font:700 11px/1 Archivo,sans-serif}'
    + '.lk-felt{position:relative;width:100%;aspect-ratio:4/3;border-radius:10px;box-shadow:inset 0 0 0 1px rgba(0,0,0,.12);overflow:hidden}'
    + '.lk-felt .lk-card{position:absolute;width:32%;height:auto;aspect-ratio:5/7;top:18%;border-width:2px;box-shadow:0 2px 4px rgba(0,0,0,.35)}'
    + '.lk-felt .lk-card::after{display:none}.lk-felt .lk-c1{left:16%;transform:rotate(-8deg)}'
    + '.lk-felt .lk-c2{left:46%;transform:rotate(7deg);background:#fffdf7;display:grid;place-items:center;color:#c6152f;font:700 22px/1 Georgia,serif}'
    + '.lk-msg{min-height:22px;margin:12px 0 0;color:#6a4b00;font-weight:700}'
    + '.lk-row{display:flex;gap:10px;margin-top:10px}.lk-btn{flex:1;min-height:52px;border-radius:14px;border:2px solid #146c3a;background:#146c3a;color:#fff;font:700 17px Archivo,"Segoe UI",sans-serif;cursor:pointer}'
    + '.lk-btn:focus-visible{outline:3px solid #22a3ee;outline-offset:2px}'
    // the Settings row: a small picture of the table and back in use, on the Choose button
    + '.btn.lkbtn{display:inline-flex;align-items:center;gap:10px;min-height:48px;padding:0 14px 0 8px}'
    + '.lkpv{position:relative;flex:none;width:46px;height:34px;border-radius:7px;overflow:hidden;box-shadow:inset 0 0 0 1px rgba(0,0,0,.15)}'
    + '.lkpv i{position:absolute;left:13px;top:4px;width:19px;height:26px;border-radius:3px;border:1.5px solid #fbfaf4;box-shadow:0 1px 3px rgba(0,0,0,.35)}'
    + '@keyframes lkIn{from{opacity:0;transform:translateY(14px) scale(.98)}to{opacity:1;transform:none}}'
    + '@media (max-width:760px){.lk-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}'
    + '@media (max-width:460px){.lk-sheet{padding:18px 14px 14px}.lk-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.lk-card{width:54px;height:76px}}'
    + '@media (prefers-reduced-motion:reduce){.lk-sheet{animation:none}.lk-tile{transition:none}.lk-tile:hover{transform:none}}';
  var st = document.createElement('style'); st.textContent = css; (document.head || document.documentElement).appendChild(st);

  // ---------------------------------------------------------------- stars, the shared choice, unlocks
  function get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function put(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function stars() {
    var n = 0;
    STORES.forEach(function (s) { var j = get(s + ':journey'); if (j && j.stars && typeof j.stars === 'object') for (var k in j.stars) n += +j.stars[k] || 0; });
    return n;
  }
  function list(kind) { return kind === 'felt' ? TABLES : BACKS; }
  function find(kind, id) { return list(kind).filter(function (x) { return x.id === id; })[0] || null; }
  function known(kind, id) { return !!find(kind, id); }
  function open_(x, n) { return !x.stars || n >= x.stars; }
  function shared() { var s = get('cards365:look'); return s && typeof s === 'object' ? s : null; }
  function remember(felt, back) { put('cards365:look', { felt: felt, back: back }); }
  function newlyUnlocked() {
    var n = stars(), seen = get('cards365:unlocked') || [], now = [], out = [];
    TABLES.concat(BACKS).forEach(function (x) { if (x.stars && n >= x.stars) { now.push(x.id); if (seen.indexOf(x.id) < 0) out.push(x.name + (TABLES.indexOf(x) >= 0 ? ' table' : ' card back')); } });
    put('cards365:unlocked', now);
    return out;
  }

  // ---------------------------------------------------------------- the gallery
  var built = false, C = null, lastFocus = null, el = null;
  function esc(s) { return String(s).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); }
  function build() {
    if (built) return; built = true;
    el = document.createElement('div'); el.className = 'lk-scrim'; el.hidden = true;
    el.innerHTML = '<div class="lk-sheet" role="dialog" aria-modal="true" aria-labelledby="lkH"><h2 id="lkH">Tables and card backs</h2>'
      + '<p class="lk-soft">Tap one to use it &mdash; your choice is used in all our card games.</p><span class="lk-star" id="lkStars"></span>'
      + '<p class="lk-h">Card backs</p><div class="lk-grid" id="lkBacks" role="group" aria-label="Card backs"></div>'
      + '<p class="lk-h">Tables</p><div class="lk-grid" id="lkFelts" role="group" aria-label="Tables"></div>'
      + '<p class="lk-msg" id="lkMsg" role="status" aria-live="polite"></p><div class="lk-row"><button class="lk-btn" type="button" data-lk-close>Done</button></div></div>';
    document.body.appendChild(el);
    el.addEventListener('click', function (e) {
      var t = e.target;
      if (t === el || (t.closest && t.closest('[data-lk-close]'))) { close(); return; }
      var b = t.closest ? t.closest('[data-lk]') : null; if (!b) return;
      var kind = b.getAttribute('data-lk'), id = b.getAttribute('data-id'), x = find(kind, id), n = stars();
      if (!x) return;
      if (!open_(x, n)) { document.getElementById('lkMsg').textContent = 'Win ' + x.stars + ' Journey stars to use ' + x.name + ' – you have ' + n + '. Every card game’s Journey counts.'; return; }
      if (kind === 'felt') C.felt = id; else C.back = id;
      remember(C.felt, C.back);
      if (C.pick) C.pick(kind, id);
      document.getElementById('lkMsg').textContent = '';
      draw();
    });
    document.addEventListener('keydown', function (e) { if (!el.hidden && e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } }, true);
  }
  function lock(x) { return '<span class="lk-lock">&#128274; &#9733; ' + x.stars + '</span>'; }
  function draw() {
    var n = stars();
    document.getElementById('lkStars').innerHTML = '&#9733; ' + n + ' Journey ' + (n === 1 ? 'star' : 'stars') + ' &middot; win stars to unlock the specials';
    document.getElementById('lkBacks').innerHTML = BACKS.map(function (b) {
      var ok = open_(b, n);
      return '<button type="button" class="lk-tile' + (ok ? '' : ' lk-locked') + '" data-lk="back" data-id="' + b.id + '" aria-pressed="' + (b.id === C.back) + '"' + (ok ? '' : ' aria-label="' + esc(b.name) + ', locked: ' + b.stars + ' Journey stars"') + '>'
        + '<span class="lk-card lk-b-' + b.id + '"></span><span>' + esc(b.name) + '</span>' + (ok ? '' : lock(b)) + '</button>';
    }).join('');
    document.getElementById('lkFelts').innerHTML = TABLES.map(function (t) {
      var ok = open_(t, n);
      return '<button type="button" class="lk-tile' + (ok ? '' : ' lk-locked') + '" data-lk="felt" data-id="' + t.id + '" aria-pressed="' + (t.id === C.felt) + '"' + (ok ? '' : ' aria-label="' + esc(t.name) + ', locked: ' + t.stars + ' Journey stars"') + '>'
        + '<span class="lk-felt lk-f-' + t.id + '"><span class="lk-card lk-c1 lk-b-' + esc(C.back) + '"></span><span class="lk-card lk-c2">A&#9829;</span></span><span>' + esc(t.name) + '</span>' + (ok ? '' : lock(t)) + '</button>';
    }).join('');
  }
  function open(cfg) {
    build(); C = cfg || {}; lastFocus = document.activeElement;
    document.getElementById('lkMsg').textContent = '';
    draw(); el.hidden = false; el.firstChild.scrollTop = 0;
    var f = el.querySelector('.lk-tile[aria-pressed="true"]') || el.querySelector('.lk-tile'); if (f) try { f.focus({ preventScroll: true }); } catch (e) {}
  }
  function close() {
    if (!el || el.hidden) return; el.hidden = true;
    if (lastFocus && lastFocus.focus && document.body.contains(lastFocus)) try { lastFocus.focus({ preventScroll: true }); } catch (e) {}
    if (C && C.onClose) try { C.onClose(); } catch (e) {}
  }

  window.Looks = { tables: TABLES, backs: BACKS, open: open, close: close, isOpen: function () { return !!(el && !el.hidden); },
    shared: shared, remember: remember, known: known, stars: stars, newlyUnlocked: newlyUnlocked };
})();
