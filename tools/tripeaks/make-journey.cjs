// The TriPeaks Journey (4 Oct 2026): 100 levels up Dorset's hills to its highest point, Lewesdon Hill. Every level is a
// deal the solver (solver.cjs) has WON at that level's rules - King and Ace joining (Easy, Normal) or not (Hard,
// Expert) - and its goals come from the solver's line L: star 2 a time, star 3 fewer turns of the deck / no Undo / no Hint.
// Run: node tools/tripeaks/make-journey.cjs  ->  games/tripeaks/journey.js   (SCENES_ONLY=1: just the drawings)
const fs = require('fs'), path = require('path');
const CH = ['St Catherine’s Hill', 'Nine Barrow Down', 'Creech Barrow', 'Hardy Monument', 'Eggardon Hill', 'Bulbarrow Hill',
  'Hambledon Hill', 'Melbury Beacon', 'Pilsdon Pen', 'Lewesdon Hill'];
const SKIES = [['#9fd0f5', '#eef8ff'], ['#93c8f0', '#f4f9ff'], ['#8fc4ec', '#e9f7e4'], ['#86b8e0', '#f3f9e9'], ['#9cc7ee', '#ffe9c4'],
  ['#8ab6e2', '#fff0d0'], ['#93bde6', '#f7efe2'], ['#7aa6d8', '#f4e2c4'], ['#7f9fd6', '#ffd9b0'], ['#3f5aa0', '#ff9f6a']];
// our own drawings, 720 x 190; the banner shows about y 22-168, so nothing that matters sits above y 26
const rep = (n, f) => Array.apply(null, Array(n)).map((_, i) => f(i)).join('');
const CLOUDS = '<g fill="#fff" opacity=".7"><ellipse cx="96" cy="46" rx="36" ry="9"/><ellipse cx="120" cy="40" rx="22" ry="10"/><ellipse cx="610" cy="38" rx="30" ry="8"/><ellipse cx="632" cy="33" rx="18" ry="8"/></g>';
const FAR = '<path d="M0 116 Q120 96 250 108 T520 100 T720 110 L720 130 L0 130 Z" fill="#a8c79a" opacity=".75"/>';
const VALE = '<path d="M0 130 L720 130 L720 190 L0 190 Z" fill="#88b562"/>';
const tree = (x, y, r, c) => '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + (c || '#2f5d2a') + '"/>';
const pine = (x, y, h) => '<rect x="' + (x - 2) + '" y="' + (y - 4) + '" width="4" height="10" fill="#5b4632"/><path d="M' + (x - h * 0.35) + ' ' + (y - 2) + ' L' + x + ' ' + (y - h) + ' L' + (x + h * 0.35) + ' ' + (y - 2) + ' Z" fill="#2f5d2a"/>';
// rings of earth bank round a hilltop: arcs whose ends sit inside the hill's outline (top = the hill's top y)
const ramparts = (cx, top, rx, n) => rep(n, (k) => '<path d="M' + (cx - rx + k * 30) + ' ' + (top + 66 + k * 6) + ' Q' + cx + ' ' + (top - 4 + k * 12) + ' ' + (cx + rx - k * 30) + ' ' + (top + 66 + k * 6) + '" fill="none" stroke="#5f8f43" stroke-width="6"/>');
const SCENES = [
  // St Catherine's Hill: heather and pines on the hill above Christchurch, the Priory's tower far off by the sea
  CLOUDS + '<path d="M0 124 L720 124 L720 140 L0 140 Z" fill="#4c9cc9"/><rect x="520" y="104" width="80" height="22" fill="#d8c8a8"/><path d="M516 106 L560 92 L604 106 Z" fill="#8a7a62"/><rect x="598" y="78" width="20" height="48" fill="#c9b79a"/>' + rep(4, (k) => '<rect x="' + (598 + k * 5.5) + '" y="74" width="3.5" height="5" fill="#c9b79a"/>')
    + '<path d="M0 190 L0 110 Q140 64 300 92 Q380 104 430 190 Z" fill="#8a6b8f"/><path d="M0 190 L0 128 Q150 88 320 112 L360 190 Z" fill="#7c5c82"/>'
    + pine(80, 92, 34) + pine(120, 84, 40) + pine(170, 86, 36) + pine(240, 94, 32) + rep(14, (i) => '<circle cx="' + (20 + i * 26) + '" cy="' + (140 + (i % 3) * 12) + '" r="5" fill="#b07cc0" opacity=".8"/>')
    + '<path d="M430 190 Q520 140 720 150 L720 190 Z" fill="#88b562"/>',
  // Nine Barrow Down: the long Purbeck ridge with its row of old burial mounds on top, the sea beyond
  CLOUDS + '<path d="M0 118 L720 118 L720 130 L0 130 Z" fill="#4c9cc9"/><path d="M0 190 L0 112 Q200 74 420 80 Q600 86 720 110 L720 190 Z" fill="#7fae5a"/>'
    + rep(9, (i) => '<ellipse cx="' + (170 + i * 36) + '" cy="' + (80 - Math.round(Math.sin((i + 1) / 10 * Math.PI) * 4)) + '" rx="14" ry="7" fill="#6c9b4b"/>')
    + '<path d="M0 190 L0 150 Q300 128 720 150 L720 190 Z" fill="#6c9b4b"/>',
  // Creech Barrow: the steep little cone of a hill above the heath
  CLOUDS + FAR + VALE + '<path d="M180 140 Q300 120 340 60 Q360 40 380 60 Q420 120 560 140 Z" fill="#6c9b4b"/><path d="M340 60 Q360 40 380 60 Q370 70 360 66 Q350 70 340 60 Z" fill="#7aa856"/>'
    + rep(8, (i) => tree(60 + i * 18 + (i > 3 ? 520 : 0), 132 - (i % 2) * 4, 9, '#3f6f34')) + '<path d="M0 160 Q360 146 720 162 L720 190 L0 190 Z" fill="#8a6b8f" opacity=".6"/>',
  // Hardy Monument: the tall stone tower on Black Down, like a fluted chimney, looking out to sea
  CLOUDS + '<path d="M0 124 L330 124 L330 140 L0 140 Z" fill="#4c9cc9"/><path d="M200 190 Q360 96 720 112 L720 190 Z" fill="#7aa856"/><path d="M0 190 L0 140 Q200 130 420 190 Z" fill="#6c9b4b"/>'
    + '<path d="M450 112 L458 34 L486 34 L494 112 Z" fill="#8f8a7e"/>' + rep(4, (k) => '<path d="M' + (461 + k * 7) + ' 36 L' + (459 + k * 9) + ' 110" stroke="#76716a" stroke-width="2"/>')
    + '<path d="M454 34 L472 26 L490 34 Z" fill="#76716a"/>' + rep(5, (i) => tree(560 + i * 26, 110 + (i % 2) * 4, 10, '#3f6f34')),
  // Eggardon Hill: the flat-topped hillfort, its ramparts stepping down the side
  CLOUDS + FAR + VALE + '<path d="M100 150 L200 72 L520 70 L620 150 Z" fill="#7aa856"/>' + rep(3, (k) => '<path d="M' + (200 - k * 30) + ' ' + (72 + k * 24) + ' L' + (520 + k * 30) + ' ' + (70 + k * 24) + '" stroke="#5f8f43" stroke-width="6"/>')
    + rep(6, (i) => '<circle cx="' + (240 + i * 50) + '" cy="' + (64 - (i % 2) * 2) + '" r="5" fill="#fff"/><circle cx="' + (245 + i * 50) + '" cy="' + (62 - (i % 2) * 2) + '" r="3" fill="#3a3a3a"/>'),
  // Bulbarrow Hill: the view down over the Blackmore Vale, a patchwork of little fields and hedges
  CLOUDS + '<path d="M0 100 L720 100 L720 190 L0 190 Z" fill="#9cc47a"/>' + rep(24, (i) => '<rect x="' + ((i % 8) * 92 - (i >> 3) * 30) + '" y="' + (106 + (i >> 3) * 16) + '" width="86" height="13" fill="' + ['#8bb866', '#a9cc86', '#94bd6f', '#c4d68f'][i % 4] + '" stroke="#5f8f43" stroke-width="2"/>')
    + '<path d="M0 190 L0 150 Q200 124 420 140 Q560 150 720 190 Z" fill="#6c9b4b"/><rect x="560" y="60" width="4" height="90" fill="#b9bdc3"/><path d="M548 150 L562 60 L576 150" fill="none" stroke="#b9bdc3" stroke-width="2"/>',
  // Hambledon Hill: the great hill with ring on ring of ramparts
  CLOUDS + FAR + VALE + '<path d="M60 150 Q200 60 360 56 Q520 60 660 150 Z" fill="#7aa856"/>' + ramparts(360, 56, 220, 4)
    + rep(4, (i) => '<ellipse cx="' + (300 + i * 40) + '" cy="' + (72 + (i % 2) * 3) + '" rx="7" ry="4" fill="#fbfaf4"/>'),
  // Melbury Beacon: the round chalk hill near Shaftesbury, sheep on its side, white chalk where the path climbs
  CLOUDS + FAR + VALE + '<path d="M120 150 Q240 54 380 52 Q520 56 620 150 Z" fill="#88b562"/><path d="M250 150 Q330 110 360 60" stroke="#efe9dd" stroke-width="6" fill="none"/>'
    + rep(7, (i) => '<ellipse cx="' + (300 + i * 34) + '" cy="' + (96 + (i % 3) * 14) + '" rx="8" ry="5" fill="#fbfaf4"/><circle cx="' + (308 + i * 34) + '" cy="' + (94 + (i % 3) * 14) + '" r="3" fill="#3a3a3a"/>'),
  // Pilsdon Pen: the hillfort ramparts, golden gorse on the slopes, the sea glinting far to the south
  CLOUDS + '<path d="M500 118 L720 118 L720 128 L500 128 Z" fill="#4c9cc9"/>' + FAR + VALE + '<path d="M40 150 Q180 66 330 62 Q480 66 600 150 Z" fill="#7aa856"/>' + ramparts(330, 62, 200, 3)
    + rep(16, (i) => '<circle cx="' + (60 + i * 34) + '" cy="' + (146 - (i % 4) * 6) + '" r="7" fill="#e8c23a"/>'),
  // Lewesdon Hill: the beech wood on top of Dorset's highest hill, the evening sun going down
  '<circle cx="560" cy="88" r="30" fill="#ffd27a" opacity=".95"/>' + '<path d="M0 120 Q160 104 340 116 T720 118 L720 190 L0 190 Z" fill="#7a8f6a"/>'
    + '<path d="M120 160 Q240 66 360 60 Q480 66 600 160 Z" fill="#5f7f48"/>' + rep(9, (i) => tree(270 + i * 22, 66 + Math.abs(4 - i) * 5, 15 + (i % 3) * 3, '#3e5f33'))
    + '<path d="M0 190 L0 160 Q360 140 720 162 L720 190 Z" fill="#55703f"/>'
];
if (process.env.SCENES_ONLY) { module.exports = { chapters: CH, skies: SKIES, scenes: SCENES }; return; }
const S = require('./solver.cjs');
const TD = require('../../games/tripeaks/deals.js');
const used = new Set(), levels = [];
function pick(list, i) { for (let k = 0; k < list.length; k++) { const sd = list[(i * 53 + 7 + k * 11) % list.length]; if (!used.has(sd)) { used.add(sd); return sd; } } throw new Error('ran out'); }
for (let c = 0; c < 10; c++) for (let k = 0; k < 10; k++) {
  const i = c * 10 + k;
  const lv = c < 3 ? 1 : c < 6 ? (k % 3 === 2 ? 1 : 3) : c < 9 ? (k % 3 === 2 ? 3 : 5) : (k % 3 === 1 ? 7 : 5);
  const list = lv <= 3 ? TD.k1 : TD.k5;
  let seed, r;
  for (let t = 0; t < 30; t++) { seed = pick(list, i + t * 97); r = S.solve(seed, lv); if (r.won && S.replay(seed, lv, r.moves)) break; }
  if (!r.won) throw new Error('no winnable deal for level ' + (i + 1));
  const L = r.moves.length, tight = 1.8 - c * 0.06;
  const secs = Math.ceil((L * 4 + 45 + (lv >= 5 ? 30 : 0)) * tight / 15) * 15;
  let third = lv <= 3 && k % 3 === 1 ? 'nohint' : lv !== 7 && k % 3 === 0 ? 'noundo' : 'moves';
  if (third === 'moves' && L + 4 >= 51 && lv !== 7) third = 'noundo';
  const lvl = { seed, lv, secs, L };
  if (third === 'moves') lvl.moves = Math.min(51, L + 4); else lvl.goal = third;
  levels.push(lvl);
}
const out = '/* 365 TriPeaks - the Journey (made by tools/tripeaks/make-journey.cjs on ' + new Date().toISOString().slice(0, 10) + '; do not edit by hand).\n'
  + ' * 10 chapters x 10 levels, each a deal the solver has won at its level (lv 1 Easy, 3 Normal - King and Ace join; 5 Hard, 7 Expert - they don\'t),\n'
  + ' * secs = the two-star time, moves = the three-star limit (or goal noundo / nohint); scenes = our drawings of each chapter. */\n'
  + '(function (root) {\n  var J = { chapters: ' + JSON.stringify(CH) + ',\n    skies: ' + JSON.stringify(SKIES) + ',\n    scenes: ' + JSON.stringify(SCENES) + ',\n    levels: [\n'
  + levels.map((l) => '      ' + JSON.stringify(l)).join(',\n') + '\n    ] };\n'
  + "  if (typeof module !== 'undefined' && module.exports) module.exports = J; else root.TP_JOURNEY = J;\n})(typeof window !== 'undefined' ? window : this);\n";
fs.writeFileSync(path.join(__dirname, '../../games/tripeaks/journey.js'), out);
console.log('levels', levels.length, 'by level', JSON.stringify(levels.reduce((a, l) => (a[l.lv] = (a[l.lv] || 0) + 1, a), {})), 'times', Math.min(...levels.map((l) => l.secs)) + '-' + Math.max(...levels.map((l) => l.secs)) + 's');
