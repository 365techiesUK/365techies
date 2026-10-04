/* 365 Games - the Journey (4 Oct 2026). Owner: "levels ... challenges ... the next generation solitaire, so it keeps them
 * on there"; chapters named after Dorset places. A map of numbered levels along the coast, a chapter at a time: each level
 * is a set deal with star goals (win it; inside a time; in so many moves / without Undo / without Hint). Winning a level
 * opens the next. Progress is kept in this browser (game:journey).
 *
 *   Journey.init({ game, store, title, data: {chapters, levels}, lvName(lv), onPlay(i) })
 *   Journey.open()                  the map
 *   Journey.level(i)                a level's data;  Journey.goalPill(i, G, S)  the goals as shown while playing
 *   Journey.win(box, i, r)          after a win: stars, saved, the win card's box filled (r = {secs, moves, undid, hinted})
 *   Journey.total()                 {stars, max, next} */
(function () {
  'use strict';
  var C = { game: 'solitaire', store: 'sol365', title: 'Solitaire', data: { chapters: [], levels: [] } }, built = false, openEl = null, lastFocus = null, sel = -1;
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); }
  function mmss(s) { s = Math.round(s); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
  var reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  function prog() { try { var p = JSON.parse(localStorage.getItem(C.store + ':journey') || 'null'); return p && p.stars ? p : { stars: {}, best: {} }; } catch (e) { return { stars: {}, best: {} }; } }
  function saveProg(p) { try { localStorage.setItem(C.store + ':journey', JSON.stringify(p)); } catch (e) {} }
  function L() { return C.data.levels; }
  function starsOf(i) { return prog().stars[i] || 0; }
  function unlocked(i) { return i === 0 || starsOf(i - 1) > 0; }
  function total() { var p = prog(), s = 0, next = 0; for (var i = 0; i < L().length; i++) { s += p.stars[i] || 0; if (p.stars[i]) next = i + 1; } return { stars: s, max: L().length * 3, next: Math.min(next, L().length - 1) }; }
  function goals(i) {
    var l = L()[i];
    return ['Win it', 'Win in ' + mmss(l.secs) + ' or less', l.moves ? 'Win in ' + l.moves + ' moves or fewer' : l.goal === 'noundo' ? 'Win without using Undo' : 'Win without using Hint'];
  }
  function earned(i, r) {
    var l = L()[i], n = 1;
    if (r.secs <= l.secs) n++;
    if (l.moves ? r.moves <= l.moves : l.goal === 'noundo' ? !r.undid : !r.hinted) n++;
    return n;
  }

  // ------------------------------------------------------------ the chapters' pictures: our own drawings of the Dorset coast
  var SKY = [['#9fd8ff', '#e9f6ff'], ['#8ec9f5', '#ffe9c7'], ['#7fb4e8', '#ffd9a8'], ['#9ad4ff', '#fff2cc'], ['#6fa8dc', '#cfe9d6'],
    ['#8cc8f0', '#f1fbff'], ['#9bc9ec', '#ffe2b8'], ['#6a86c4', '#f7c99b'], ['#4f6fb3', '#f6a97a'], ['#2e3f86', '#ff8a5c']];
  function scene(c) {
    if (C.data.scenes && C.data.scenes[c] != null) {   // a game that brings its own drawings (FreeCell, Spider): its sky, then its landmark
      var k = (C.data.skies && C.data.skies[c]) || SKY[c % SKY.length], gid = 'jyd' + c;
      return '<svg viewBox="0 0 720 190" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + k[0] + '"/><stop offset="1" stop-color="' + k[1] + '"/></linearGradient></defs>'
        + '<rect width="720" height="190" fill="url(#' + gid + ')"/>' + C.data.scenes[c] + '</svg>';
    }
    var s = SKY[c % SKY.length], id = 'jy' + c;
    var g = '<defs><linearGradient id="' + id + 's" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + s[0] + '"/><stop offset="1" stop-color="' + s[1] + '"/></linearGradient>'
      + '<linearGradient id="' + id + 'w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f8fc0"/><stop offset="1" stop-color="#14567f"/></linearGradient></defs>'
      + '<rect width="720" height="190" fill="url(#' + id + 's)"/>'
      + (c >= 8 ? '<circle cx="560" cy="' + (c === 9 ? 128 : 70) + '" r="34" fill="#ffd27a" opacity=".95"/>' : '<circle cx="610" cy="48" r="22" fill="#fff7d1" opacity=".9"/>')
      + '<path d="M0 120 L720 120 L720 190 L0 190 Z" fill="url(#' + id + 'w)"/>'
      + '<path d="M0 132 Q90 126 180 132 T360 132 T540 132 T720 132" stroke="rgba(255,255,255,.35)" stroke-width="2" fill="none"/>';
    var art = [
      // 1 Bournemouth Pier: the long pier on its legs, the pavilion at the end, the sand
      '<path d="M0 150 Q160 140 300 150 L300 190 L0 190 Z" fill="#f2d9a2"/><rect x="190" y="104" width="400" height="7" fill="#5b4a3a"/>'
        + Array.apply(null, Array(16)).map(function (_, i) { return '<rect x="' + (196 + i * 25) + '" y="111" width="3" height="22" fill="#4a3c30"/>'; }).join('')
        + '<rect x="560" y="80" width="70" height="26" rx="3" fill="#f4f1ea"/><path d="M556 82 L595 64 L634 82 Z" fill="#c74b4b"/><rect x="590" y="88" width="10" height="18" fill="#7fb6d8"/>',
      // 2 Hengistbury Head: the headland, the beach huts along its foot
      '<path d="M340 120 Q420 40 560 52 Q660 60 720 96 L720 124 L340 124 Z" fill="#6f9a4c"/><path d="M340 120 Q430 60 560 64 L560 124 Z" fill="#c9a36a" opacity=".55"/>'
        + ['#e94f4f', '#4fb0e9', '#f2c94c', '#6fcf97', '#bb6bd9', '#f2994a', '#56ccf2', '#eb5757'].map(function (col, i) { return '<rect x="' + (60 + i * 34) + '" y="112" width="26" height="18" fill="' + col + '"/><path d="M' + (57 + i * 34) + ' 113 L' + (73 + i * 34) + ' 102 L' + (89 + i * 34) + ' 113 Z" fill="#f4f1ea"/>'; }).join('')
        + '<path d="M0 132 L380 132 L380 190 L0 190 Z" fill="#f2d9a2"/>',
      // 3 Christchurch Quay: the Priory tower over the water, boats at the quay
      '<path d="M380 120 L380 70 L470 70 L470 120 Z" fill="#d7c7a5"/><rect x="420" y="30" width="34" height="42" fill="#cdbb95"/><path d="M416 32 L437 18 L458 32 Z" fill="#9c8b6c"/>'
        + '<rect x="250" y="88" width="130" height="32" fill="#d7c7a5"/><path d="M0 120 L720 120 L720 126 L0 126 Z" fill="#7a6a55"/>'
        + [[90, '#e94f4f'], [180, '#f4f1ea'], [560, '#2f6f9f']].map(function (b) { return '<path d="M' + b[0] + ' 138 L' + (b[0] + 60) + ' 138 L' + (b[0] + 50) + ' 150 L' + (b[0] + 8) + ' 150 Z" fill="' + b[1] + '"/><rect x="' + (b[0] + 28) + '" y="104" width="3" height="34" fill="#5b4a3a"/><path d="M' + (b[0] + 31) + ' 106 L' + (b[0] + 31) + ' 132 L' + (b[0] + 52) + ' 132 Z" fill="#fff"/>'; }).join(''),
      // 4 Sandbanks: the chain ferry crossing, the houses along the spit
      '<path d="M0 118 L330 118 L330 128 L0 128 Z" fill="#f2d9a2"/>'
        + [0, 1, 2, 3, 4, 5].map(function (i) { return '<rect x="' + (20 + i * 50) + '" y="' + (84 + (i % 2) * 8) + '" width="40" height="' + (34 - (i % 2) * 8) + '" fill="#f7f3ea"/><rect x="' + (26 + i * 50) + '" y="' + (92 + (i % 2) * 8) + '" width="28" height="7" fill="#7fb6d8"/>'; }).join('')
        + '<rect x="430" y="122" width="130" height="16" rx="3" fill="#3d4a5c"/><rect x="460" y="104" width="70" height="20" fill="#e9edf3"/><path d="M380 134 L430 132 M560 132 L640 134" stroke="#2b2b2b" stroke-width="2"/>',
      // 5 Brownsea Island: the island, its trees and the castle
      '<path d="M120 124 Q260 70 420 78 Q560 82 640 124 Z" fill="#4e7d3a"/>'
        + [170, 220, 280, 340, 470, 520, 580].map(function (x, i) { return '<circle cx="' + x + '" cy="' + (92 + (i % 3) * 6) + '" r="' + (18 + (i % 2) * 6) + '" fill="#2f5d2a"/>'; }).join('')
        + '<rect x="372" y="70" width="60" height="44" fill="#d9c9a8"/><rect x="372" y="62" width="10" height="10" fill="#d9c9a8"/><rect x="392" y="62" width="10" height="10" fill="#d9c9a8"/><rect x="412" y="62" width="10" height="10" fill="#d9c9a8"/><rect x="396" y="94" width="12" height="20" fill="#6b5a44"/>',
      // 6 Old Harry Rocks: the chalk stacks, green on top
      '<path d="M420 124 L440 60 Q520 40 720 46 L720 124 Z" fill="#f6f4ee"/><path d="M440 60 Q520 40 720 46 L720 58 Q560 50 446 70 Z" fill="#6f9a4c"/>'
        + '<path d="M300 124 L312 72 L352 70 L362 124 Z" fill="#f6f4ee"/><path d="M312 72 L352 70 L350 78 L313 80 Z" fill="#6f9a4c"/><path d="M230 124 L240 96 L264 96 L270 124 Z" fill="#efece4"/>',
      // 7 Swanage: the hills round the bay, the pier, the steam train's smoke
      '<path d="M0 120 Q120 60 260 84 Q380 50 520 86 Q620 64 720 92 L720 122 L0 122 Z" fill="#5f8f45"/>'
        + '<rect x="300" y="110" width="200" height="6" fill="#5b4a3a"/>' + [0, 1, 2, 3, 4, 5, 6, 7].map(function (i) { return '<rect x="' + (306 + i * 25) + '" y="116" width="3" height="18" fill="#4a3c30"/>'; }).join('')
        + '<rect x="60" y="96" width="70" height="16" rx="3" fill="#2b4d2b"/><rect x="66" y="84" width="16" height="14" fill="#2b4d2b"/><circle cx="74" cy="72" r="9" fill="#eee" opacity=".8"/><circle cx="90" cy="60" r="12" fill="#eee" opacity=".6"/>',
      // 8 Corfe Castle: the ruin on its hill
      '<path d="M140 124 Q300 40 470 124 Z" fill="#6f9a4c"/><path d="M260 68 L270 30 L292 30 L296 50 L316 50 L320 72 Z" fill="#a8a294"/><rect x="300" y="56" width="40" height="22" fill="#9a9384"/><path d="M276 30 L276 22 L286 22 L286 30 Z" fill="#a8a294"/>'
        + '<path d="M0 124 Q100 100 200 124 Z" fill="#5f8f45"/><path d="M440 124 Q600 92 720 110 L720 124 Z" fill="#5f8f45"/>',
      // 9 Lulworth Cove: the round cove inside its cliffs
      '<path d="M0 124 L0 70 Q120 60 220 96 Q360 150 500 96 Q600 60 720 66 L720 124 Z" fill="#e8dfcf"/><path d="M0 70 Q120 60 220 96 Q360 150 500 96 Q600 60 720 66 L720 74 Q600 70 500 104 Q360 154 220 104 Q120 68 0 78 Z" fill="#6f9a4c"/>'
        + '<path d="M220 106 Q360 156 500 106 L500 124 L220 124 Z" fill="#3aa3c9"/>',
      // 10 Durdle Door: the limestone arch, the evening sun behind it
      '<path d="M300 124 L330 60 Q420 30 520 64 L560 124 L510 124 Q490 86 450 84 Q410 84 392 124 Z" fill="#d9c8a6"/><path d="M330 60 Q420 30 520 64 L516 72 Q420 42 334 70 Z" fill="#6f9a4c"/>'
        + '<path d="M560 124 Q640 80 720 90 L720 124 Z" fill="#cbb891"/><path d="M0 124 Q120 96 260 124 Z" fill="#cbb891"/>'
    ];
    return '<svg viewBox="0 0 720 190" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' + g + art[c % art.length] + '</svg>';
  }

  // ------------------------------------------------------------ looks
  var CSS = ''
    + '.jy-scrim{position:fixed;inset:0;z-index:6050;display:grid;place-items:center;padding:12px;background:rgba(1,8,20,.66);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px)}'
    + '.jy-scrim[hidden]{display:none}'
    + '.jy-sheet{position:relative;width:min(760px,100%);height:min(92vh,980px);display:flex;flex-direction:column;border-radius:24px;overflow:hidden;color:#f5f0e1;'
    + 'background:linear-gradient(180deg,#0f2147,#0a1530);border:1px solid rgba(255,210,87,.35);box-shadow:0 30px 80px rgba(0,0,0,.6);font:400 16px/1.4 Archivo,"Segoe UI",sans-serif;animation:jyIn .4s cubic-bezier(.2,.9,.3,1.12)}'
    + '.jy-top{display:flex;align-items:center;gap:14px;padding:16px 18px 12px;border-bottom:1px solid rgba(255,255,255,.08)}'
    + '.jy-top h2{margin:0;font:600 28px/1.05 "Clash Display",Archivo,sans-serif;background:linear-gradient(180deg,#fff6d6,#ffd257 55%,#d89a1e);-webkit-background-clip:text;background-clip:text;color:transparent}'
    + '.jy-top p{margin:2px 0 0;color:#b9c6e4;font-size:14px}'
    + '.jy-bar{height:8px;margin-top:6px;border-radius:99px;background:rgba(255,255,255,.1);overflow:hidden}.jy-bar i{display:block;height:100%;background:linear-gradient(90deg,#ffd257,#ffb347);border-radius:99px;transition:width .8s ease}'
    + '.jy-x{margin-left:auto;width:42px;height:42px;flex:none;border-radius:50%;border:0;background:rgba(255,255,255,.08);color:#fff;font:400 26px/1 Archivo,sans-serif;cursor:pointer}'
    + '.jy-scroll{flex:1;overflow-y:auto;padding:14px 16px 140px;scroll-behavior:smooth}'
    + '.jy-ch{margin:0 0 6px}'
    + '.jy-ban{position:relative;height:150px;border-radius:18px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.35)}.jy-ban svg{display:block;width:100%;height:100%}'
    + '.jy-ban .t{position:absolute;left:0;right:0;bottom:0;padding:22px 16px 10px;background:linear-gradient(180deg,transparent,rgba(5,12,28,.82));display:flex;align-items:flex-end;gap:10px}'
    + '.jy-ban .t b{font:600 22px/1.1 "Clash Display",Archivo,sans-serif;color:#fff;text-shadow:0 2px 8px rgba(0,0,0,.5)}.jy-ban .t small{display:block;color:#d6e0f5;font-size:13px}'
    + '.jy-ban .t em{margin-left:auto;font-style:normal;font-weight:800;color:#ffd257;white-space:nowrap}'
    + '.jy-ch.locked .jy-ban{filter:grayscale(.85) brightness(.6)}.jy-ch.locked .jy-ban .t em{color:#cfd8ef}'
    + '.jy-path{position:relative;height:520px;margin:4px 0 14px}'
    + '.jy-path svg.ln{position:absolute;inset:0;width:100%;height:100%;overflow:visible}'
    + '.jy-node{position:absolute;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:4px;border:0;background:none;padding:0;cursor:pointer;color:#fff;animation:jyNode .45s cubic-bezier(.2,.9,.3,1.3) both;animation-delay:calc(var(--i,0) * 40ms)}'
    + '.jy-node .o{display:grid;place-items:center;width:60px;height:60px;border-radius:50%;font:800 20px Archivo,sans-serif;background:radial-gradient(circle at 35% 30%,#3d5a96,#203a70 60%,#14274f);border:3px solid rgba(255,255,255,.25);box-shadow:0 8px 20px rgba(0,0,0,.4);transition:transform .15s}'
    + '.jy-node:hover .o{transform:scale(1.08)}.jy-node:focus-visible .o{outline:3px solid #7fe8ff;outline-offset:3px}'
    + '.jy-node.done .o{background:radial-gradient(circle at 35% 30%,#fff3c4,#ffd257 45%,#c98c10);color:#3a2800;border-color:#fff3c4}'
    + '.jy-node.cur .o{background:radial-gradient(circle at 35% 30%,#8ff0ff,#1d97e3 55%,#0d5f9a);border-color:#bff6ff;animation:jyCur 1.6s ease-in-out infinite}'
    + '.jy-node.lock{cursor:default}.jy-node.lock .o{background:#2a3550;color:#71809f;border-color:rgba(255,255,255,.1);box-shadow:none}'
    + '.jy-node .st{display:flex;gap:2px;height:14px}.jy-node .st i{width:14px;height:14px;background:rgba(255,255,255,.18);clip-path:polygon(50% 0,62% 35%,100% 38%,70% 60%,80% 100%,50% 78%,20% 100%,30% 60%,0 38%,38% 35%)}'
    + '.jy-node .st i.on{background:linear-gradient(160deg,#fff3c4,#ffd257 50%,#e0a400)}'
    + '.jy-node.sel .o{box-shadow:0 0 0 4px #7fe8ff,0 8px 20px rgba(0,0,0,.4)}'
    + '.jy-card{position:absolute;left:12px;right:12px;bottom:12px;padding:16px 18px;border-radius:18px;background:rgba(8,18,40,.96);border:1px solid rgba(255,210,87,.4);box-shadow:0 -10px 40px rgba(0,0,0,.45);animation:jyUp .3s ease-out}'
    + '.jy-card[hidden]{display:none}'
    + '.jy-card h3{margin:0 0 2px;font:600 21px/1.15 "Clash Display",Archivo,sans-serif;color:#fff}.jy-card .sub{margin:0 0 8px;color:#b9c6e4;font-size:14px}'
    + '.jy-goals{list-style:none;margin:0 0 12px;padding:0;display:grid;gap:5px}.jy-goals li{display:flex;align-items:center;gap:8px;color:#e6ecf8}'
    + '.jy-goals li i{flex:none;width:18px;height:18px;background:rgba(255,255,255,.2);clip-path:polygon(50% 0,62% 35%,100% 38%,70% 60%,80% 100%,50% 78%,20% 100%,30% 60%,0 38%,38% 35%)}.jy-goals li.got i{background:linear-gradient(160deg,#fff3c4,#ffd257 50%,#e0a400)}'
    + '.jy-btn{display:inline-flex;align-items:center;justify-content:center;min-height:52px;padding:0 24px;border-radius:14px;border:0;background:linear-gradient(180deg,#ffe08a,#e0a400);color:#2a1d00;font:800 18px Archivo,sans-serif;cursor:pointer;box-shadow:0 6px 18px rgba(255,200,80,.35)}'
    + '.jy-btn.ghost{background:rgba(255,255,255,.1);color:#fff;box-shadow:none;border:1px solid rgba(255,255,255,.2)}'
    + '.jy-row{display:flex;flex-wrap:wrap;gap:10px}.jy-row .jy-btn{flex:1 1 150px}'
    // the win card: three big stars filling in, one after another
    + '.jy-win{margin:12px 0 0;padding:14px;border-radius:16px;text-align:center;color:#f5f0e1;background:radial-gradient(120% 120% at 50% 0,#24407a,#0b1730);border:1px solid rgba(255,210,87,.4)}'
    + '.jy-win .bigst{display:flex;justify-content:center;gap:10px;margin:2px 0 8px}'
    + '.jy-win .bigst i{width:46px;height:46px;background:rgba(255,255,255,.16);clip-path:polygon(50% 0,62% 35%,100% 38%,70% 60%,80% 100%,50% 78%,20% 100%,30% 60%,0 38%,38% 35%)}'
    + '.jy-win .bigst i.on{background:linear-gradient(160deg,#fff6d6,#ffd257 45%,#d89a1e);animation:jyStar .55s cubic-bezier(.2,.9,.3,1.6) both;animation-delay:calc(var(--i) * 280ms + 200ms)}'
    + '.jy-win p{margin:4px 0 0;color:#dfe6f7}.jy-win .jy-row{margin-top:12px;justify-content:center}'
    + '.jy-ip{display:flex;gap:6px;flex-wrap:wrap;justify-content:center}.jy-ip span{padding:4px 10px;border-radius:999px;background:rgba(255,255,255,.08);font-size:13px}.jy-ip span.got{background:rgba(255,210,87,.18);color:#ffd257}'
    + '@keyframes jyIn{from{opacity:0;transform:translateY(16px) scale(.97)}to{opacity:1;transform:none}}'
    + '@keyframes jyNode{from{opacity:0;transform:translate(-50%,-50%) scale(.4)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}'
    + '@keyframes jyCur{0%,100%{box-shadow:0 0 0 0 rgba(127,232,255,.55),0 8px 20px rgba(0,0,0,.4)}50%{box-shadow:0 0 0 12px rgba(127,232,255,0),0 8px 20px rgba(0,0,0,.4)}}'
    + '@keyframes jyUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}'
    + '@keyframes jyStar{from{opacity:0;transform:scale(.2) rotate(-40deg)}to{opacity:1;transform:none}}'
    + '@media (max-width:520px){.jy-sheet{height:96vh}.jy-path{height:500px}.jy-node .o{width:52px;height:52px;font-size:18px}.jy-ban{height:120px}}'
    + '@media (prefers-reduced-motion:reduce){.jy-sheet,.jy-node,.jy-card,.jy-win .bigst i.on,.jy-node.cur .o{animation:none}.jy-scroll{scroll-behavior:auto}}';

  // the ten stops along each chapter's path (x in % of the width, y in px), a gentle zig-zag
  var POS = [[18, 40], [42, 70], [66, 100], [82, 150], [64, 205], [38, 245], [18, 300], [36, 360], [62, 400], [80, 460]];
  function pathD(w) {
    var pts = POS.map(function (p) { return [p[0] / 100 * w, p[1]]; }), d = 'M' + pts[0][0] + ' ' + pts[0][1];
    for (var i = 1; i < pts.length; i++) { var a = pts[i - 1], b = pts[i], my = (a[1] + b[1]) / 2; d += ' C' + a[0] + ' ' + my + ' ' + b[0] + ' ' + my + ' ' + b[0] + ' ' + b[1]; }
    return d;
  }
  function build() {
    if (built) return; built = true;
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    var h = '<div class="jy-scrim" id="jyMap" hidden><div class="jy-sheet" role="dialog" aria-modal="true" aria-labelledby="jyH">'
      + '<div class="jy-top"><div style="flex:1;min-width:0"><h2 id="jyH">The Journey</h2><p id="jySub"></p><div class="jy-bar"><i id="jyBar" style="width:0"></i></div></div>'
      + '<button class="jy-x" type="button" data-jy-close aria-label="Close">&times;</button></div>'
      + '<div class="jy-scroll" id="jyScroll"></div>'
      + '<div class="jy-card" id="jyCard" hidden></div></div></div>';
    var box = document.createElement('div'); box.innerHTML = h; while (box.firstChild) document.body.appendChild(box.firstChild);
    document.addEventListener('click', function (e) {
      var t = e.target;
      if (t.closest && t.closest('[data-jy-close]')) { close(); return; }
      if (t.classList && t.classList.contains('jy-scrim')) { close(); return; }
      var n = t.closest ? t.closest('[data-jyl]') : null;
      if (n && !n.classList.contains('lock')) { pickLevel(+n.getAttribute('data-jyl')); return; }
      var pl = t.closest ? t.closest('[data-jyplay]') : null;
      if (pl) { var i = +pl.getAttribute('data-jyplay'); close(); if (C.onPlay) C.onPlay(i); }
    });
    document.addEventListener('keydown', function (e) { if (openEl && e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } }, true);
  }
  function draw() {
    var p = prog(), tot = total(), cur = -1, i;
    for (i = 0; i < L().length; i++) if (!p.stars[i] && unlocked(i)) { cur = i; break; }
    $('jySub').textContent = C.title + ' · ' + tot.stars + ' of ' + tot.max + ' stars · ' + L().length + ' levels ' + (C.data.where || 'along the Dorset coast');
    setTimeout(function () { $('jyBar').style.width = Math.round(100 * tot.stars / tot.max) + '%'; }, 60);
    var w = Math.min(728, $('jyScroll').clientWidth || 700) - 32, out = '';
    C.data.chapters.forEach(function (name, c) {
      var first = c * 10, s = 0, open = unlocked(first);
      for (i = first; i < first + 10; i++) s += p.stars[i] || 0;
      out += '<section class="jy-ch' + (open ? '' : ' locked') + '" id="jyC' + c + '"><div class="jy-ban">' + scene(c) + '<div class="t"><div><small>Chapter ' + (c + 1) + '</small><b>' + esc(name) + '</b></div>'
        + '<em>' + (open ? '&#9733; ' + s + ' / 30' : '&#128274; ' + (c ? 'Finish ' + esc(C.data.chapters[c - 1]) : '')) + '</em></div></div>'
        + '<div class="jy-path"><svg class="ln" viewBox="0 0 ' + w + ' 520" preserveAspectRatio="none" aria-hidden="true">'
        + '<path d="' + pathD(w) + '" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="10" stroke-linecap="round"/>'
        + '<path d="' + pathD(w) + '" fill="none" stroke="' + (open ? '#ffd257' : 'rgba(255,255,255,.25)') + '" stroke-width="3" stroke-dasharray="2 12" stroke-linecap="round" opacity=".8"/></svg>';
      for (var k = 0; k < 10; k++) {
        var li = first + k, n = p.stars[li] || 0, lk = !unlocked(li), cls = lk ? 'lock' : n ? 'done' : li === cur ? 'cur' : '';
        var stars = '<span class="st">' + [1, 2, 3].map(function (x) { return '<i class="' + (x <= n ? 'on' : '') + '"></i>'; }).join('') + '</span>';
        out += '<button type="button" class="jy-node ' + cls + (li === sel ? ' sel' : '') + '" data-jyl="' + li + '" style="left:' + POS[k][0] + '%;top:' + POS[k][1] + 'px;--i:' + k + '"'
          + ' aria-label="Level ' + (li + 1) + (lk ? ', locked' : ', ' + n + ' of 3 stars') + '"><span class="o">' + (lk ? '&#128274;' : li + 1) + '</span>' + (lk ? '' : stars) + '</button>';
      }
      out += '</div></section>';
    });
    $('jyScroll').innerHTML = out;
    return cur;
  }
  function pickLevel(i) {
    sel = i;
    Array.prototype.forEach.call(document.querySelectorAll('.jy-node'), function (n) { n.classList.toggle('sel', +n.getAttribute('data-jyl') === i); });
    var l = L()[i], n = starsOf(i), g = goals(i), c = Math.floor(i / 10);
    var best = prog().best[i];
    $('jyCard').innerHTML = '<h3>Level ' + (i + 1) + ' &middot; ' + esc(C.data.chapters[c]) + '</h3>'
      + '<p class="sub">' + esc(C.lvName ? C.lvName(l.lv) : '') + (best ? ' &middot; your best: ' + mmss(best.secs) + ', ' + best.moves + ' moves' : '') + '</p>'
      + '<ul class="jy-goals">' + g.map(function (t, k) { return '<li class="' + (n > k ? 'got' : '') + '"><i></i>' + esc(t) + '</li>'; }).join('') + '</ul>'
      + '<div class="jy-row"><button class="jy-btn" type="button" data-jyplay="' + i + '">' + (n ? 'Play again' : 'Play level ' + (i + 1)) + '</button><button class="jy-btn ghost" type="button" id="jyCardX">Back to the map</button></div>';
    $('jyCard').hidden = false;
    $('jyCardX').onclick = function () { $('jyCard').hidden = true; sel = -1; Array.prototype.forEach.call(document.querySelectorAll('.jy-node.sel'), function (n) { n.classList.remove('sel'); }); };
  }
  function open() {
    build();
    if (!openEl) { lastFocus = document.activeElement; if (C.onOpen) try { C.onOpen(); } catch (e) {} }
    openEl = $('jyMap'); openEl.hidden = false; $('jyCard').hidden = true; sel = -1;
    var cur = draw();
    var target = cur >= 0 ? cur : 0;
    setTimeout(function () {   // glide to the level that's next to play, and offer it
      var node = document.querySelector('[data-jyl="' + target + '"]'), sc = $('jyScroll');
      if (node) sc.scrollTop = Math.max(0, node.offsetTop + node.parentNode.offsetTop - sc.clientHeight / 2 + 40);
      if (cur >= 0) pickLevel(cur);
      var f = document.querySelector('[data-jyplay]') || document.querySelector('.jy-x'); if (f) try { f.focus({ preventScroll: true }); } catch (e) {}
    }, reduce ? 0 : 220);
  }
  function close() {
    if (!openEl) return; openEl.hidden = true; openEl = null;
    if (lastFocus && lastFocus.focus && document.body.contains(lastFocus)) try { lastFocus.focus({ preventScroll: true }); } catch (e) {}
    if (C.onClose) try { C.onClose(); } catch (e) {}
  }

  // ------------------------------------------------------------ while playing, and after a win
  function goalPill(i, secs, moves, undid, hinted) {
    var l = L()[i], okT = secs <= l.secs, okM = l.moves ? moves <= l.moves : l.goal === 'noundo' ? !undid : !hinted;
    return '<span class="ci" aria-hidden="true">&#129517;</span><b style="min-width:0;font-size:18px;color:#fff">Level ' + (i + 1) + '</b>'
      + '<span class="cl" style="color:' + (okT ? '#ffd257' : '#8a96b3') + '">&#9733;&#9733; ' + mmss(Math.max(0, l.secs - secs)) + ' left</span>'
      + '<span class="cl" style="color:' + (okM ? '#ffd257' : '#8a96b3') + '">&#9733;&#9733;&#9733; ' + (l.moves ? Math.max(0, l.moves - moves) + ' moves left' : l.goal === 'noundo' ? (undid ? 'Undo used' : 'no Undo') : (hinted ? 'Hint used' : 'no Hint')) + '</span>';
  }
  function win(box, i, r) {
    build();
    var p = prog(), n = earned(i, r), had = p.stars[i] || 0, g = goals(i), l = L()[i];
    if (n > had) p.stars[i] = n;
    var b = p.best[i]; if (!b || r.secs < b.secs || (r.secs === b.secs && r.moves < b.moves)) p.best[i] = { secs: r.secs, moves: r.moves };
    saveProg(p);
    var last = i === L().length - 1, chapDone = (i % 10) === 9, okT = r.secs <= l.secs, okM = l.moves ? r.moves <= l.moves : l.goal === 'noundo' ? !r.undid : !r.hinted;
    box.hidden = false;
    box.innerHTML = '<div class="jy-win"><div class="bigst">' + [1, 2, 3].map(function (x) { return '<i class="' + (x <= n ? 'on' : '') + '" style="--i:' + (x - 1) + '"></i>'; }).join('') + '</div>'
      + '<p style="font-weight:800;color:#fff;font-size:18px">Level ' + (i + 1) + (n === 3 ? ' &mdash; all three stars!' : ' complete!') + '</p>'
      + '<div class="jy-ip"><span class="got">&#9733; Won</span><span class="' + (okT ? 'got' : '') + '">&#9733; ' + esc(g[1]) + '</span><span class="' + (okM ? 'got' : '') + '">&#9733; ' + esc(g[2]) + '</span></div>'
      + (chapDone && !last ? '<p style="margin-top:8px">Chapter complete &mdash; next stop: <b style="color:#ffd257">' + esc(C.data.chapters[Math.floor(i / 10) + 1]) + '</b></p>' : '')
      + (last ? '<p style="margin-top:8px"><b style="color:#ffd257">You&rsquo;ve finished the Journey!</b></p>' : '')
      + '<div class="jy-row">' + (last ? '' : '<button class="jy-btn" type="button" data-jyplay="' + (i + 1) + '">Next level &rarr;</button>') + '<button class="jy-btn ghost" type="button" id="jyMapB">The Journey map</button></div></div>';
    $('jyMapB').onclick = function () { if (C.onLeave) C.onLeave(); open(); };
    if (C.onWin) C.onWin(n, n > had);
    return n;
  }

  window.Journey = {
    init: function (cfg) { for (var k in cfg) C[k] = cfg[k]; },
    open: open, close: close, isOpen: function () { return !!openEl; },
    level: function (i) { return L()[i]; }, count: function () { return L().length; }, total: total, goalPill: goalPill, win: win
  };
})();
