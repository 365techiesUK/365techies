// The Pyramid Journey (4 Oct 2026): 100 levels through the New Forest to the Solent, Ringwood to Hurst Castle. Every
// level is a deal the solver (solver.cjs) has WON within that level's times through the deck - as often as you like
// (Easy), three (Normal), two (Hard), once (Expert) - and its goals come from the solver's line L: star 2 a time, star 3
// a move limit / no Undo / no Hint.
// Run: node tools/pyramid/make-journey.cjs  ->  games/pyramid/journey.js   (SCENES_ONLY=1: just the drawings)
const fs = require('fs'), path = require('path');
const CH = ['Ringwood', 'Burley', 'Bolderwood', 'Rhinefield', 'Lyndhurst', 'Brockenhurst', 'Beaulieu', 'Buckler’s Hard', 'Lymington', 'Hurst Castle'];
const SKIES = [['#9fd0f5', '#eef8ff'], ['#a7d3f2', '#fff3d6'], ['#8fc4ec', '#e9f7e4'], ['#86b8e0', '#f3f9e9'], ['#9cc7ee', '#ffe9c4'],
  ['#8ab6e2', '#fff0d0'], ['#93bde6', '#f7efe2'], ['#7aa6d8', '#f4e2c4'], ['#7f9fd6', '#ffd9b0'], ['#3f5aa0', '#ff9f6a']];
// our own drawings, 720 x 190; the banner shows about y 22-168, so nothing that matters sits above y 26
const rep = (n, f) => Array.apply(null, Array(n)).map((_, i) => f(i)).join('');
const CLOUDS = '<g fill="#fff" opacity=".7"><ellipse cx="96" cy="46" rx="36" ry="9"/><ellipse cx="120" cy="40" rx="22" ry="10"/><ellipse cx="610" cy="38" rx="30" ry="8"/><ellipse cx="632" cy="33" rx="18" ry="8"/></g>';
const GRASS = '<path d="M0 124 L720 124 L720 190 L0 190 Z" fill="#7fae5a"/><path d="M0 152 Q180 138 360 152 T720 148 L720 190 L0 190 Z" fill="#6c9b4b"/>';
const oak = (x, y, r) => '<rect x="' + (x - 3) + '" y="' + y + '" width="6" height="' + Math.round(r * 0.9) + '" fill="#5b4632"/><circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="#3f6f34"/><circle cx="' + (x - r * 0.5) + '" cy="' + (y + r * 0.2) + '" r="' + r * 0.7 + '" fill="#457a39"/>';
// a New Forest pony, side on, facing left (x, y = its back; s = size)
const pony = (x, y, s, col) => { col = col || '#7a4e2d'; return '<g fill="' + col + '"><ellipse cx="' + x + '" cy="' + y + '" rx="' + 14 * s + '" ry="' + 7 * s + '"/>'
  + '<path d="M' + (x - 10 * s) + ' ' + (y - 3 * s) + ' L' + (x - 18 * s) + ' ' + (y - 15 * s) + ' L' + (x - 24 * s) + ' ' + (y - 12 * s) + ' L' + (x - 16 * s) + ' ' + (y + 2 * s) + ' Z"/>'
  + rep(4, (k) => '<rect x="' + (x - 11 * s + k * 7 * s) + '" y="' + (y + 4 * s) + '" width="' + 2.6 * s + '" height="' + 12 * s + '"/>')
  + '<path d="M' + (x + 13 * s) + ' ' + (y - 2 * s) + ' Q' + (x + 19 * s) + ' ' + (y + 4 * s) + ' ' + (x + 16 * s) + ' ' + (y + 12 * s) + '" stroke="' + col + '" stroke-width="' + 2.4 * s + '" fill="none"/></g>'; };
const cottage = (x, y, w, h) => '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="#f3ecdc"/><path d="M' + (x - 6) + ' ' + (y + 4) + ' Q' + (x + w / 2) + ' ' + (y - h * 0.9) + ' ' + (x + w + 6) + ' ' + (y + 4) + ' Z" fill="#c9a14a"/>'
  + '<rect x="' + (x + w * 0.15) + '" y="' + (y + h * 0.35) + '" width="' + w * 0.16 + '" height="' + h * 0.25 + '" fill="#7fa6c4"/><rect x="' + (x + w * 0.42) + '" y="' + (y + h * 0.45) + '" width="' + w * 0.16 + '" height="' + h * 0.55 + '" fill="#6b4a32"/><rect x="' + (x + w * 0.69) + '" y="' + (y + h * 0.35) + '" width="' + w * 0.16 + '" height="' + h * 0.25 + '" fill="#7fa6c4"/>';
const SEA = (y) => '<path d="M0 ' + y + ' L720 ' + y + ' L720 190 L0 190 Z" fill="#3f8fc0"/><path d="M0 ' + (y + 8) + ' Q90 ' + (y + 3) + ' 180 ' + (y + 8) + ' T360 ' + (y + 8) + ' T540 ' + (y + 8) + ' T720 ' + (y + 8) + '" stroke="rgba(255,255,255,.35)" stroke-width="2" fill="none"/>';
const boat = (x, y) => '<path d="M' + x + ' ' + y + ' L' + (x + 30) + ' ' + y + ' L' + (x + 25) + ' ' + (y + 7) + ' L' + (x + 5) + ' ' + (y + 7) + ' Z" fill="#fff"/><path d="M' + (x + 15) + ' ' + (y - 1) + ' L' + (x + 15) + ' ' + (y - 28) + ' L' + (x + 28) + ' ' + (y - 3) + ' Z" fill="#fff"/>';
const SCENES = [
  // Ringwood: the market town on the Avon, the church tower over the roofs, swans on the river
  CLOUDS + GRASS + rep(6, (i) => '<rect x="' + (110 + i * 80) + '" y="' + (84 + (i % 2) * 8) + '" width="74" height="' + (40 - (i % 2) * 8) + '" fill="' + ['#e8dcc6', '#d9c3a2', '#efe5d4'][i % 3] + '"/><path d="M' + (106 + i * 80) + ' ' + (86 + (i % 2) * 8) + ' L' + (147 + i * 80) + ' ' + (70 + (i % 2) * 8) + ' L' + (188 + i * 80) + ' ' + (86 + (i % 2) * 8) + ' Z" fill="#9c5f45"/>')
    + '<rect x="330" y="40" width="34" height="84" fill="#c9b79a"/>' + rep(4, (k) => '<rect x="' + (330 + k * 9) + '" y="34" width="6" height="7" fill="#c9b79a"/>')
    + '<path d="M0 150 Q360 136 720 152 L720 172 Q360 158 0 170 Z" fill="#4c9cc9"/>' + [[120, 160], [180, 156]].map((p) => '<path d="M' + p[0] + ' ' + p[1] + ' q16 -6 32 0 q-16 8 -32 0 Z" fill="#fff"/><path d="M' + (p[0] + 27) + ' ' + (p[1] - 2) + ' q2 -14 8 -12" stroke="#fff" stroke-width="3" fill="none"/>').join(''),
  // Burley: thatched cottages under the oaks, ponies wandering the green
  CLOUDS + GRASS + oak(70, 84, 30) + oak(640, 80, 34) + cottage(200, 96, 120, 34) + cottage(400, 100, 100, 30) + pony(300, 150, 1.4) + pony(560, 146, 1.2, '#4a3426'),
  // Bolderwood: deer under the old trees
  CLOUDS + GRASS + oak(110, 70, 38) + oak(250, 64, 44) + oak(520, 66, 42) + oak(650, 74, 36)
    + rep(3, (i) => { const x = 330 + i * 70, y = 142 + (i % 2) * 6; return '<g fill="#a36b3e"><ellipse cx="' + x + '" cy="' + y + '" rx="16" ry="7"/><path d="M' + (x - 12) + ' ' + (y - 3) + ' L' + (x - 18) + ' ' + (y - 18) + ' L' + (x - 24) + ' ' + (y - 16) + ' L' + (x - 16) + ' ' + (y + 1) + ' Z"/>' + rep(4, (k) => '<rect x="' + (x - 12 + k * 8) + '" y="' + (y + 4) + '" width="2.6" height="13"/>') + '</g>' + '<path d="M' + (x - 21) + ' ' + (y - 17) + ' l-6 -10 m6 10 l2 -11 m-5 3 l-6 -3" stroke="#5b4632" stroke-width="2" fill="none"/>'; }),
  // Rhinefield: the giant redwoods along the ornamental drive
  CLOUDS + GRASS + rep(7, (i) => { const x = 60 + i * 100, h = 96 + (i % 3) * 14; return '<rect x="' + (x - 5) + '" y="' + (150 - 24) + '" width="10" height="26" fill="#7a4a2e"/><path d="M' + (x - 26) + ' 128 L' + x + ' ' + (128 - h) + ' L' + (x + 26) + ' 128 Z" fill="' + ['#2f5d2a', '#356b30', '#2a5426'][i % 3] + '"/>'; })
    + '<path d="M300 190 Q340 150 360 124 L380 124 Q400 150 440 190 Z" fill="#b8a98e"/>',
  // Lyndhurst: St Michael's church and its tall spire on the hill above the village
  CLOUDS + '<path d="M0 124 Q300 90 720 120 L720 190 L0 190 Z" fill="#7fae5a"/>' + '<rect x="300" y="84" width="140" height="40" fill="#b5653f"/><path d="M294 86 L370 64 L446 86 Z" fill="#7a3f2c"/>'
    + '<rect x="440" y="58" width="34" height="66" fill="#b5653f"/><path d="M438 58 L457 26 L476 58 Z" fill="#7a3f2c"/>' + rep(4, (k) => '<path d="M' + (318 + k * 30) + ' 118 L' + (318 + k * 30) + ' 98 Q' + (326 + k * 30) + ' 90 ' + (334 + k * 30) + ' 98 L' + (334 + k * 30) + ' 118 Z" fill="#efe3c8"/>')
    + oak(120, 96, 32) + oak(620, 92, 34) + rep(5, (i) => '<rect x="' + (40 + i * 46) + '" y="' + (128 + (i % 2) * 6) + '" width="40" height="24" fill="#efe5d4"/><path d="M' + (36 + i * 46) + ' ' + (130 + (i % 2) * 6) + ' L' + (60 + i * 46) + ' ' + (116 + (i % 2) * 6) + ' L' + (84 + i * 46) + ' ' + (130 + (i % 2) * 6) + ' Z" fill="#9c5f45"/>'),
  // Brockenhurst: the watersplash, ponies at the ford
  CLOUDS + GRASS + oak(90, 84, 36) + oak(640, 82, 36) + '<path d="M0 160 Q360 126 720 160 L720 180 Q360 150 0 182 Z" fill="#4c9cc9"/>'
    + '<path d="M300 190 L340 124 L380 124 L420 190 Z" fill="#b8a98e" opacity=".8"/>' + pony(260, 146, 1.3, '#5a3a24') + pony(470, 142, 1.2) + '<rect x="560" y="100" width="4" height="40" fill="#5b4632"/><rect x="540" y="96" width="44" height="12" fill="#fff"/><path d="M546 102 L578 102" stroke="#c0392b" stroke-width="3"/>',
  // Beaulieu: the river below the old abbey's gatehouse, the mill pond
  CLOUDS + GRASS + '<path d="M0 150 Q360 140 720 150 L720 176 Q360 166 0 178 Z" fill="#4c9cc9"/>'
    + '<rect x="250" y="66" width="180" height="58" fill="#b8a58a"/><path d="M244 68 L340 46 L436 68 Z" fill="#6f6a62"/><rect x="420" y="50" width="40" height="74" fill="#b8a58a"/>' + rep(4, (k) => '<rect x="' + (420 + k * 11) + '" y="44" width="7" height="7" fill="#b8a58a"/>')
    + rep(4, (k) => '<path d="M' + (268 + k * 40) + ' 116 L' + (268 + k * 40) + ' 90 Q' + (278 + k * 40) + ' 78 ' + (288 + k * 40) + ' 90 L' + (288 + k * 40) + ' 116 Z" fill="#7fa6c4"/>') + oak(120, 92, 30) + oak(600, 90, 32),
  // Buckler's Hard: the wide green street of brick cottages running down to the river, a sailing ship on the slipway
  CLOUDS + '<path d="M0 124 L720 124 L720 190 L0 190 Z" fill="#7fae5a"/><path d="M0 150 Q360 140 720 150 L720 190 L0 190 Z" fill="#4c9cc9"/>'
    + rep(4, (i) => '<rect x="' + (40 + i * 52) + '" y="' + (90 + i * 6) + '" width="48" height="34" fill="#a95a38"/><path d="M' + (36 + i * 52) + ' ' + (92 + i * 6) + ' L' + (64 + i * 52) + ' ' + (78 + i * 6) + ' L' + (92 + i * 52) + ' ' + (92 + i * 6) + ' Z" fill="#6f3a28"/>')
    + rep(4, (i) => '<rect x="' + (470 + i * 52) + '" y="' + (108 - i * 6) + '" width="48" height="' + (16 + i * 6) + '" fill="#a95a38"/>') + '<path d="M260 124 L460 124 L430 150 L290 150 Z" fill="#9cc47a"/>'
    + '<path d="M300 132 L420 132 L404 148 L316 148 Z" fill="#6b4a32"/><rect x="358" y="70" width="4" height="62" fill="#5b4632"/><path d="M362 74 L396 100 L362 104 Z" fill="#f4f1ea"/><path d="M358 80 L330 104 L358 108 Z" fill="#f4f1ea"/>',
  // Lymington: the harbour full of boats, the cobbled quay and its houses
  CLOUDS + SEA(120) + rep(7, (i) => '<rect x="' + (i * 60) + '" y="' + (78 + (i % 3) * 6) + '" width="56" height="' + (46 - (i % 3) * 6) + '" fill="' + ['#efe5d4', '#d9c3a2', '#f2e8d2', '#c9d6df'][i % 4] + '"/>')
    + '<rect x="0" y="122" width="430" height="10" fill="#9c8f78"/>' + boat(460, 136) + boat(530, 146) + boat(600, 132) + boat(660, 150) + boat(380, 156),
  // Hurst Castle: the round castle on its long shingle spit, the lighthouse, the sun going down over the Solent
  '<circle cx="580" cy="92" r="28" fill="#ffd27a" opacity=".95"/>' + SEA(118) + '<path d="M0 150 Q300 132 520 134 L540 140 Q300 142 0 164 Z" fill="#d8cdb4"/>'
    + '<path d="M480 112 L520 104 L560 112 L560 122 L480 122 Z" fill="#b8b2a6"/>' + '<rect x="380" y="98" width="110" height="34" fill="#a49e92"/><ellipse cx="435" cy="98" rx="30" ry="10" fill="#8f897e"/><rect x="410" y="80" width="50" height="22" fill="#a49e92"/>'
    + '<rect x="520" y="60" width="16" height="64" fill="#fbfaf4"/><rect x="518" y="54" width="20" height="8" fill="#c0392b"/><rect x="522" y="46" width="12" height="8" fill="#ffd27a"/>'
];
if (process.env.SCENES_ONLY) { module.exports = { chapters: CH, skies: SKIES, scenes: SCENES }; return; }
const S = require('./solver.cjs');
const PD = require('../../games/pyramid/deals.js');
const LIST = { 1: PD.p4, 3: PD.p3, 5: PD.p2, 7: PD.p1 };
const used = new Set(), levels = [];
function pick(list, i) { for (let k = 0; k < list.length; k++) { const sd = list[(i * 53 + 7 + k * 11) % list.length]; if (!used.has(sd)) { used.add(sd); return sd; } } throw new Error('ran out'); }
for (let c = 0; c < 10; c++) for (let k = 0; k < 10; k++) {
  const i = c * 10 + k;
  const lv = c < 3 ? 1 : c < 6 ? (k % 3 === 2 ? 1 : 3) : c < 9 ? (k % 3 === 2 ? 3 : 5) : (k % 3 === 1 ? 7 : 5);
  let seed, r;
  for (let t = 0; t < 30; t++) { seed = pick(LIST[lv], i + t * 97); r = S.solve(seed, lv, 3000000); if (r.won && S.replay(seed, lv, r.moves)) break; }
  if (!r.won) throw new Error('no winnable deal for level ' + (i + 1));
  const L = r.moves.length, tight = 1.8 - c * 0.06;
  const secs = Math.ceil((L * 4 + 60 + (lv >= 5 ? 60 : 0)) * tight / 15) * 15;
  const third = lv <= 3 && k % 3 === 1 ? 'nohint' : lv !== 7 && k % 3 === 0 ? 'noundo' : 'moves';
  const lvl = { seed, lv, secs, L };
  if (third === 'moves') lvl.moves = Math.ceil(L * (1.4 - c * 0.02)); else lvl.goal = third;
  levels.push(lvl);
}
const out = '/* 365 Pyramid - the Journey (made by tools/pyramid/make-journey.cjs on ' + new Date().toISOString().slice(0, 10) + '; do not edit by hand).\n'
  + ' * 10 chapters x 10 levels, each a deal the solver has won at its level (lv 1 Easy - as often as you like through the deck, 3 Normal - three\n'
  + ' * times, 5 Hard - twice, 7 Expert - once), secs = the two-star time, moves = the three-star limit (or goal noundo / nohint);\n'
  + ' * scenes = our drawings of each chapter. */\n'
  + '(function (root) {\n  var J = { chapters: ' + JSON.stringify(CH) + ',\n    skies: ' + JSON.stringify(SKIES) + ',\n    scenes: ' + JSON.stringify(SCENES) + ',\n    levels: [\n'
  + levels.map((l) => '      ' + JSON.stringify(l)).join(',\n') + '\n    ] };\n'
  + "  if (typeof module !== 'undefined' && module.exports) module.exports = J; else root.PY_JOURNEY = J;\n})(typeof window !== 'undefined' ? window : this);\n";
fs.writeFileSync(path.join(__dirname, '../../games/pyramid/journey.js'), out);
console.log('levels', levels.length, 'by level', JSON.stringify(levels.reduce((a, l) => (a[l.lv] = (a[l.lv] || 0) + 1, a), {})), 'times', Math.min(...levels.map((l) => l.secs)) + '-' + Math.max(...levels.map((l) => l.secs)) + 's');
