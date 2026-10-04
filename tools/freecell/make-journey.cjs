// The FreeCell Journey (4 Oct 2026): 100 levels through inland Dorset to the coast. Every level is a deal the solver
// (solver.cjs) has WON at that level's rules - four free cells, then three (Hard), then two (Expert) - and its goals
// are sized from the solver's line L: star 2 a time, star 3 a move limit / no Undo / no Hint.
// Run: node tools/freecell/make-journey.cjs  ->  games/freecell/journey.js
const fs = require('fs'), path = require('path');
const S = require('./solver.cjs');
const FD = require('../../games/freecell/deals.js');
const CH = ['Wimborne Minster', 'Kingston Lacy', 'Badbury Rings', 'Cranborne Chase', 'Gold Hill', 'Sherborne Abbey',
  'Dorchester', 'Maiden Castle', 'Abbotsbury', 'Chesil Beach'];
// our own drawings, 720 x 190, sea or fields at y 120+ drawn by the map (journey.js scene()); these are the landmarks
const SKIES = [['#9fd0f5', '#eef8ff'], ['#a7d3f2', '#fff3d6'], ['#8fc4ec', '#e9f7e4'], ['#86b8e0', '#f3f9e9'], ['#9cc7ee', '#ffe9c4'],
  ['#8ab6e2', '#fff0d0'], ['#93bde6', '#f7efe2'], ['#7aa6d8', '#f4e2c4'], ['#7f9fd6', '#ffd9b0'], ['#3f5aa0', '#ff9f6a']];
// far hills and a few clouds behind the inland chapters, so each drawing has some depth
const BACK = '<g fill="#fff" opacity=".7"><ellipse cx="96" cy="46" rx="36" ry="9"/><ellipse cx="120" cy="40" rx="22" ry="10"/><ellipse cx="610" cy="36" rx="30" ry="8"/><ellipse cx="632" cy="31" rx="18" ry="8"/></g>'
  + '<path d="M0 108 Q110 86 240 100 T500 94 T720 102 L720 124 L0 124 Z" fill="#a8c79a" opacity=".75"/>';
const FIELD = BACK + '<path d="M0 120 L720 120 L720 190 L0 190 Z" fill="#7fae5a"/><path d="M0 150 Q180 136 360 150 T720 146 L720 190 L0 190 Z" fill="#6c9b4b"/>';
const SCENES = [
  // Wimborne Minster: the two towers of the minster over the town, the river in front
  FIELD + '<rect x="250" y="60" width="200" height="62" fill="#c9a77a"/><rect x="250" y="44" width="44" height="30" fill="#bf9a6b"/><rect x="406" y="34" width="48" height="40" fill="#bf9a6b"/>'
    + '<path d="M246 46 L272 30 L298 46 Z" fill="#8a6a45"/>' + [0, 1, 2, 3].map(function (i) { return '<rect x="' + (406 + i * 13) + '" y="28" width="8" height="7" fill="#bf9a6b"/>'; }).join('')
    + '<circle cx="430" cy="52" r="8" fill="#efe3c8"/><path d="M430 52 L430 47 M430 52 L434 53" stroke="#2b2b2b" stroke-width="1.6"/>'
    + [0, 1, 2, 3, 4].map(function (i) { return '<path d="M' + (268 + i * 36) + ' 112 L' + (268 + i * 36) + ' 92 Q' + (276 + i * 36) + ' 82 ' + (284 + i * 36) + ' 92 L' + (284 + i * 36) + ' 112 Z" fill="#8a6a45" opacity=".55"/>'; }).join('')
    + '<path d="M0 158 Q200 150 400 160 T720 156 L720 172 Q520 166 400 174 T0 172 Z" fill="#4c9cc9"/>',
  // Kingston Lacy: the house among the trees, the lawn
  FIELD + '<rect x="270" y="66" width="180" height="58" fill="#e7d9c4"/><path d="M262 68 L360 44 L458 68 Z" fill="#9c8b74"/>'
    + Array.apply(null, Array(6)).map(function (_, i) { return '<rect x="' + (284 + i * 28) + '" y="80" width="12" height="16" fill="#7fa6c4"/>'; }).join('')
    + [120, 170, 560, 610].map(function (x, i) { return '<circle cx="' + x + '" cy="' + (96 - (i % 2) * 8) + '" r="' + (30 + (i % 2) * 8) + '" fill="#3f6f34"/>'; }).join(''),
  // Badbury Rings: the rings of the old hillfort on its hill, a clump of trees on top
  BACK + '<path d="M0 120 L720 120 L720 190 L0 190 Z" fill="#88b562"/><ellipse cx="360" cy="124" rx="300" ry="44" fill="#7aa856"/><ellipse cx="360" cy="118" rx="230" ry="34" fill="none" stroke="#5f8f43" stroke-width="6"/>'
    + '<ellipse cx="360" cy="114" rx="160" ry="24" fill="none" stroke="#5f8f43" stroke-width="6"/>' + [320, 350, 380, 405].map(function (x, i) { return '<circle cx="' + x + '" cy="' + (98 - (i % 2) * 6) + '" r="' + (16 + (i % 2) * 5) + '" fill="#2f5d2a"/>'; }).join(''),
  // Cranborne Chase: the rolling downs and the old woods
  BACK + '<path d="M0 110 Q160 70 330 104 T720 96 L720 190 L0 190 Z" fill="#8bb866"/><path d="M0 140 Q200 104 420 136 T720 128 L720 190 L0 190 Z" fill="#76a453"/>'
    + [60, 100, 140, 520, 560, 600, 640].map(function (x, i) { return '<circle cx="' + x + '" cy="' + (100 + (i % 3) * 5) + '" r="' + (20 + (i % 2) * 6) + '" fill="#355f2c"/>'; }).join(''),
  // Gold Hill: the cobbled street climbing past the cottages, the wall at the top
  BACK + '<path d="M0 112 L720 112 L720 190 L0 190 Z" fill="#a9cc86"/><path d="M0 124 Q240 116 480 126 T720 122 L720 190 L0 190 Z" fill="#94bd6f"/>'
    + '<path d="M0 92 L720 156 L720 190 L0 190 Z" fill="#86b25f"/><path d="M0 92 L720 156 L720 172 L0 108 Z" fill="#b8a98e"/><path d="M0 100 L720 164" stroke="#9c8d72" stroke-width="2" stroke-dasharray="6 7"/>'
    + [0, 1, 2, 3, 4, 5, 6].map(function (i) { var x = 34 + i * 96, g = 92 + (x + 42) * 64 / 720; return '<rect x="' + x + '" y="' + (g - 40) + '" width="84" height="40" fill="' + ['#efe6d2', '#e9dcc0', '#f3ecdc'][i % 3] + '"/>'
      + '<path d="M' + (x - 6) + ' ' + (g - 38) + ' Q' + (x + 42) + ' ' + (g - 66) + ' ' + (x + 90) + ' ' + (g - 38) + ' Z" fill="#c9a14a"/><rect x="' + (x + 12) + '" y="' + (g - 30) + '" width="13" height="11" fill="#7fa6c4"/><rect x="' + (x + 58) + '" y="' + (g - 30) + '" width="13" height="11" fill="#7fa6c4"/><rect x="' + (x + 35) + '" y="' + (g - 20) + '" width="13" height="20" fill="#6b4a32"/>'; }).join(''),
  // Sherborne Abbey: the abbey's tower and its long roof
  FIELD + '<rect x="200" y="74" width="320" height="50" fill="#d8b783"/><path d="M196 76 L360 56 L524 76 Z" fill="#8a6e48"/><rect x="330" y="34" width="60" height="46" fill="#d2ae76"/>'
    + '<path d="M326 36 L334 26 L344 36 M376 36 L386 26 L394 36" stroke="#8a6e48" stroke-width="4" fill="none"/>' + [0, 1, 2, 3, 4, 5, 6].map(function (i) { return '<path d="M' + (222 + i * 42) + ' 112 L' + (222 + i * 42) + ' 92 Q' + (232 + i * 42) + ' 82 ' + (242 + i * 42) + ' 92 L' + (242 + i * 42) + ' 112 Z" fill="#7fa6c4"/>'; }).join(''),
  // Dorchester: the high street and its town clock
  FIELD + [0, 1, 2, 3, 4, 5, 6].map(function (i) { return '<rect x="' + (60 + i * 86) + '" y="' + (76 + (i % 3) * 8) + '" width="80" height="' + (48 - (i % 3) * 8) + '" fill="' + ['#e8dcc6', '#d9c3a2', '#efe5d4'][i % 3] + '"/>'; }).join('')
    + '<rect x="340" y="42" width="40" height="82" fill="#c9b08a"/><circle cx="360" cy="64" r="12" fill="#fffaf0" stroke="#5b4a3a" stroke-width="2"/><path d="M360 64 L360 56 M360 64 L366 66" stroke="#2b2b2b" stroke-width="2"/><path d="M336 44 L360 26 L384 44 Z" fill="#5b6f7a"/>',
  // Maiden Castle: the great earthwork ramparts
  BACK + '<path d="M0 120 L720 120 L720 190 L0 190 Z" fill="#86b25f"/><path d="M60 124 Q360 30 660 124 Z" fill="#79a654"/><path d="M110 124 Q360 46 610 124" fill="none" stroke="#5f8f43" stroke-width="8"/>'
    + '<path d="M170 124 Q360 62 550 124" fill="none" stroke="#5f8f43" stroke-width="8"/><path d="M230 124 Q360 80 490 124" fill="none" stroke="#5f8f43" stroke-width="8"/>',
  // Abbotsbury: the chapel on its hill, the swans on the water
  '<path d="M0 118 L720 118 L720 190 L0 190 Z" fill="#4c9cc9"/><path d="M380 120 Q480 40 620 120 Z" fill="#7aa856"/><rect x="480" y="54" width="34" height="26" fill="#d8c6a2"/><path d="M476 56 L497 40 L518 56 Z" fill="#9c8b74"/>'
    + [[120, 150], [190, 140], [250, 158]].map(function (p) { return '<path d="M' + p[0] + ' ' + p[1] + ' q20 -8 40 0 q-20 10 -40 0 Z" fill="#fff"/><path d="M' + (p[0] + 34) + ' ' + (p[1] - 2) + ' q2 -18 10 -16" stroke="#fff" stroke-width="4" fill="none"/><path d="M' + (p[0] + 44) + ' ' + (p[1] - 18) + ' l6 2" stroke="#f2994a" stroke-width="3"/>'; }).join(''),
  // Chesil Beach: the long bank of shingle between the lagoon and the sea, the evening sun
  '<circle cx="560" cy="96" r="32" fill="#ffd27a" opacity=".95"/><path d="M0 120 L720 120 L720 190 L0 190 Z" fill="#2f6f9f"/><path d="M0 132 Q360 112 720 126 L720 140 Q360 128 0 148 Z" fill="#d8cdb4"/>'
    + '<path d="M0 148 Q360 128 720 140 L720 190 L0 190 Z" fill="#4c9cc9"/><path d="M0 120 Q120 96 240 112 L240 120 L0 120 Z" fill="#7a9a54"/>'
];
const used = new Set(), levels = [];
const ALL = []; for (let n = 1; n <= 32000; n++) if (n !== 11982) ALL.push(n);
function pick(list, i) { for (let k = 0; k < list.length; k++) { const sd = list[(i * 53 + 7 + k * 11) % list.length]; if (!used.has(sd)) { used.add(sd); return sd; } } throw new Error('ran out'); }
for (let c = 0; c < 10; c++) for (let k = 0; k < 10; k++) {
  const i = c * 10 + k;
  const lv = c < 3 ? 1 : c < 6 ? (k % 3 === 2 ? 1 : 3) : c < 9 ? (k % 3 === 2 ? 3 : 5) : (k % 2 ? 7 : 5);
  const list = lv === 5 ? FD.c3 : lv === 7 ? FD.c2 : ALL;
  let seed, r;
  for (let t = 0; t < 30; t++) { seed = pick(list, i + t * 97); r = S.solve(seed, lv, 60000); if (r.won && S.replay(seed, lv, r.moves)) break; }
  if (!r.won) throw new Error('no winnable deal for level ' + (i + 1));
  const L = r.moves.length, tight = 1.7 - c * 0.07;
  const secs = Math.ceil((L * 3 + 60 + (lv >= 5 ? 60 : 0)) * tight / 15) * 15;
  const third = lv === 1 && k % 3 === 1 ? 'nohint' : lv !== 7 && k % 3 === 0 ? 'noundo' : 'moves';
  const lvl = { seed, lv, secs, L };
  if (third === 'moves') lvl.moves = Math.ceil(L * (1.6 - c * 0.045)); else lvl.goal = third;
  levels.push(lvl);
}
const out = '/* 365 FreeCell - the Journey (made by tools/freecell/make-journey.cjs on ' + new Date().toISOString().slice(0, 10) + '; do not edit by hand).\n'
  + ' * 10 chapters x 10 levels, each a deal the solver has won at its level (lv 1 Easy, 3 Normal - four cells; 5 Hard - three; 7 Expert - two),\n'
  + ' * secs = the two-star time, moves = the three-star limit (or goal noundo / nohint); scenes = our drawings of each chapter. */\n'
  + '(function (root) {\n  var J = { chapters: ' + JSON.stringify(CH) + ',\n    skies: ' + JSON.stringify(SKIES) + ',\n    scenes: ' + JSON.stringify(SCENES) + ',\n    levels: [\n'
  + levels.map((l) => '      ' + JSON.stringify(l)).join(',\n') + '\n    ] };\n'
  + "  if (typeof module !== 'undefined' && module.exports) module.exports = J; else root.FC_JOURNEY = J;\n})(typeof window !== 'undefined' ? window : this);\n";
fs.writeFileSync(path.join(__dirname, '../../games/freecell/journey.js'), out);
console.log('levels', levels.length, 'by level', JSON.stringify(levels.reduce((a, l) => (a[l.lv] = (a[l.lv] || 0) + 1, a), {})), 'times', Math.min(...levels.map((l) => l.secs)) + '-' + Math.max(...levels.map((l) => l.secs)) + 's');
