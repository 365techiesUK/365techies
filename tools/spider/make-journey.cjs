// The Spider Journey (4 Oct 2026): 100 levels west along the Jurassic Coast, Osmington to Lyme Regis. Every level is a deal
// the solver (solver.cjs) has WON at that level - one suit, then two (Normal), then four (Hard, Expert) - and its goals are
// sized from the solver's line L: star 2 a time, star 3 a move limit / no Undo / no Hint.
// Run: node tools/spider/make-journey.cjs  ->  games/spider/journey.js
const fs = require('fs'), path = require('path');
const S = require('./solver.cjs');
const SD = require('../../games/spider/deals.js');
const CH = ['Osmington White Horse', 'Weymouth Beach', 'Nothe Fort', 'Portland Bill', 'Burton Bradstock', 'Bridport',
  'West Bay', 'Golden Cap', 'Charmouth', 'Lyme Regis'];
const SKIES = [['#9fd0f5', '#eef8ff'], ['#8fcaf2', '#fff4d8'], ['#93c2ec', '#eaf5ff'], ['#7fb2e2', '#e6f2fb'], ['#94c4ee', '#fff0cf'],
  ['#8cbbe6', '#f6efe0'], ['#86b6e4', '#ffe9c2'], ['#7aa6dc', '#ffe1b4'], ['#6f93cf', '#ffd2a6'], ['#3d4f96', '#ff9a66']];
// our own drawings, 720 x 190; the banner shows about y 22-168, so nothing that matters sits above y 26
const CLOUDS = '<g fill="#fff" opacity=".7"><ellipse cx="96" cy="46" rx="36" ry="9"/><ellipse cx="120" cy="40" rx="22" ry="10"/><ellipse cx="610" cy="38" rx="30" ry="8"/><ellipse cx="632" cy="33" rx="18" ry="8"/></g>';
const SEA = (y) => '<path d="M0 ' + y + ' L720 ' + y + ' L720 190 L0 190 Z" fill="#3f8fc0"/><path d="M0 ' + (y + 8) + ' Q90 ' + (y + 3) + ' 180 ' + (y + 8) + ' T360 ' + (y + 8) + ' T540 ' + (y + 8) + ' T720 ' + (y + 8) + '" stroke="rgba(255,255,255,.35)" stroke-width="2" fill="none"/>';
const rep = (n, f) => Array.apply(null, Array(n)).map((_, i) => f(i)).join('');
const SCENES = [
  // Osmington White Horse: King George III riding, cut in the chalk of the hill above Weymouth
  CLOUDS + '<path d="M0 112 Q120 92 260 104 T720 100 L720 130 L0 130 Z" fill="#a8c79a" opacity=".8"/><path d="M0 160 Q170 52 400 58 T720 128 L720 190 L0 190 Z" fill="#7fae5a"/>'
    + '<g fill="#fbfaf4"><ellipse cx="360" cy="96" rx="44" ry="14"/><path d="M396 92 L414 66 L424 70 L408 98 Z"/><ellipse cx="424" cy="66" rx="12" ry="6" transform="rotate(-25 424 66)"/>'
    + '<rect x="326" y="104" width="6" height="26"/><rect x="340" y="106" width="6" height="24"/><rect x="376" y="106" width="6" height="24"/><rect x="390" y="104" width="6" height="26"/>'
    + '<path d="M318 92 Q300 100 304 120 L310 120 Q308 104 322 98 Z"/><circle cx="360" cy="62" r="7"/><path d="M354 68 L366 68 L370 88 L350 88 Z"/></g>'
];
// the rest are built one at a time, so each can use loops
SCENES[1] = CLOUDS + rep(6, (i) => '<rect x="' + (i * 46) + '" y="' + (72 + (i % 2) * 6) + '" width="44" height="' + (50 - (i % 2) * 6) + '" fill="' + ['#f2e8d2', '#e9dcc0'][i % 2] + '"/>'
    + rep(3, (k) => '<rect x="' + (i * 46 + 6 + k * 13) + '" y="' + (82 + (i % 2) * 6) + '" width="7" height="10" fill="#7fa6c4"/>'))
  + SEA(120) + '<path d="M0 138 Q360 128 720 140 L720 190 L0 190 Z" fill="#e8cf8f"/>'
  + '<rect x="300" y="52" width="36" height="88" fill="#f1e6c8"/><rect x="296" y="52" width="44" height="8" fill="#3c8c6e"/><rect x="296" y="128" width="44" height="12" fill="#3c8c6e"/>'
  + '<path d="M300 52 Q318 30 336 52 Z" fill="#c9a14a"/><circle cx="318" cy="76" r="11" fill="#fffaf0" stroke="#2f3b46" stroke-width="2"/><path d="M318 76 L318 69 M318 76 L323 78" stroke="#2f3b46" stroke-width="2"/><rect x="312" y="96" width="12" height="20" fill="#c0392b"/>'
  + rep(7, (i) => '<rect x="' + (420 + i * 40) + '" y="122" width="30" height="20" fill="' + ['#e74c3c', '#f1c40f', '#3498db', '#2ecc71', '#e67e22', '#9b59b6', '#1abc9c'][i] + '"/><path d="M' + (418 + i * 40) + ' 123 L' + (435 + i * 40) + ' 112 L' + (452 + i * 40) + ' 123 Z" fill="#f4f1ea"/>');
// Nothe Fort: the round stone fort on its headland, the harbour mouth, boats
SCENES[2] = CLOUDS + SEA(118) + '<path d="M120 124 Q300 70 560 96 L640 124 Z" fill="#7aa856"/>'
  + '<path d="M230 122 L230 88 Q370 62 510 88 L510 122 Z" fill="#c9b79a"/><path d="M230 88 Q370 62 510 88 L510 96 Q370 70 230 96 Z" fill="#b19f80"/>'
  + rep(6, (i) => '<rect x="' + (256 + i * 42) + '" y="' + (98 - Math.round(Math.sin((i + 0.5) / 6 * Math.PI) * 8)) + '" width="16" height="9" fill="#5a4e3c"/>')
  + '<rect x="368" y="40" width="3" height="32" fill="#5a4e3c"/><path d="M371 41 L398 47 L371 53 Z" fill="#c0392b"/>'
  + [[80, 140], [610, 146], [670, 136]].map(function (b) { return '<path d="M' + b[0] + ' ' + b[1] + ' L' + (b[0] + 30) + ' ' + b[1] + ' L' + (b[0] + 25) + ' ' + (b[1] + 7) + ' L' + (b[0] + 5) + ' ' + (b[1] + 7) + ' Z" fill="#fff"/><path d="M' + (b[0] + 15) + ' ' + (b[1] - 1) + ' L' + (b[0] + 15) + ' ' + (b[1] - 26) + ' L' + (b[0] + 28) + ' ' + (b[1] - 3) + ' Z" fill="#fff"/>'; }).join('');
// Portland Bill: the red and white lighthouse on the rocks at the tip of the island, the stone obelisk
SCENES[3] = CLOUDS + SEA(112) + '<path d="M0 190 L0 128 Q160 116 300 122 L560 124 Q640 130 720 150 L720 190 Z" fill="#8d8a80"/><path d="M0 140 Q200 130 420 136 L720 160 L720 190 L0 190 Z" fill="#76736a"/>'
  + '<path d="M362 124 L370 46 L398 46 L406 124 Z" fill="#fbfaf4"/><path d="M366 92 L402 92 L404 108 L364 108 Z" fill="#c0392b"/><path d="M368 64 L400 64 L401 76 L367 76 Z" fill="#c0392b"/>'
  + '<rect x="370" y="32" width="28" height="14" fill="#2f3b46"/><rect x="374" y="34" width="20" height="10" fill="#ffd27a"/><path d="M366 32 L384 22 L402 32 Z" fill="#2f3b46"/>'
  + '<path d="M470 124 L478 84 L486 124 Z" fill="#e9e4d6"/><rect x="560" y="112" width="40" height="12" fill="#e9e4d6"/><path d="M556 112 L580 102 L604 112 Z" fill="#8a7a62"/>';
// Burton Bradstock: the golden sandstone cliffs over Hive Beach, layer on layer
SCENES[4] = CLOUDS + SEA(122) + '<path d="M0 150 Q360 140 720 152 L720 190 L0 190 Z" fill="#cdb98f"/>'
  + '<path d="M250 150 L270 64 L720 58 L720 150 Z" fill="#d9a24a"/><path d="M262 80 L720 74 L720 66 L266 72 Z" fill="#7aa856"/><path d="M266 72 L720 66 L720 58 L270 64 Z" fill="#6c9b4b"/>'
  + rep(6, (i) => '<path d="M' + (258 - i * 2) + ' ' + (94 + i * 10) + ' L720 ' + (90 + i * 10) + '" stroke="' + (i % 2 ? '#c4893a' : '#e7b965') + '" stroke-width="3"/>')
  + '<path d="M0 150 L0 104 Q90 96 180 110 L230 150 Z" fill="#a8c79a"/>';
// Bridport: the town hall with its white cupola, the brick shops, Colmer's Hill and its pines behind
SCENES[5] = CLOUDS + '<path d="M0 112 Q120 96 240 106 T480 100 T720 108 L720 130 L0 130 Z" fill="#a8c79a" opacity=".8"/>'
  + '<path d="M500 124 Q560 58 600 54 Q640 58 700 124 Z" fill="#7aa856"/>' + rep(6, (i) => '<path d="M' + (582 + i * 7) + ' 56 L' + (585 + i * 7) + ' 36 L' + (588 + i * 7) + ' 56 Z" fill="#2f5d2a"/>')
  + '<path d="M0 120 L720 120 L720 190 L0 190 Z" fill="#7fae5a"/>'
  + rep(6, (i) => '<rect x="' + (40 + i * 74) + '" y="' + (80 + (i % 3) * 6) + '" width="70" height="' + (44 - (i % 3) * 6) + '" fill="' + ['#b5653f', '#d9c3a2', '#a95a38'][i % 3] + '"/>' + rep(2, (k) => '<rect x="' + (52 + i * 74 + k * 28) + '" y="' + (90 + (i % 3) * 6) + '" width="12" height="12" fill="#efe3c8"/>'))
  + '<rect x="196" y="64" width="80" height="60" fill="#b5653f"/><rect x="222" y="40" width="28" height="26" fill="#f6f1e6"/><path d="M220 42 Q236 22 252 42 Z" fill="#5b6f7a"/><circle cx="236" cy="54" r="7" fill="#fffaf0" stroke="#2f3b46" stroke-width="1.6"/>'
  + rep(3, (k) => '<path d="M' + (204 + k * 24) + ' 124 L' + (204 + k * 24) + ' 98 Q' + (212 + k * 24) + ' 88 ' + (220 + k * 24) + ' 98 L' + (220 + k * 24) + ' 124 Z" fill="#efe3c8"/>');
// West Bay: the great golden East Cliff, its fluted face, the harbour wall and boats
SCENES[6] = CLOUDS + SEA(124) + '<path d="M0 154 Q360 146 720 156 L720 190 L0 190 Z" fill="#cdb98f"/>'
  + '<path d="M360 152 L376 52 L720 46 L720 152 Z" fill="#d9a24a"/><path d="M376 52 L720 46 L720 40 L378 46 Z" fill="#6c9b4b"/>'
  + rep(16, (i) => '<path d="M' + (392 + i * 20) + ' ' + (54 - i * 0.4) + ' L' + (386 + i * 20) + ' 150" stroke="#c4893a" stroke-width="3" opacity=".7"/>')
  + '<path d="M60 150 L60 132 L300 132 L300 140 L74 140 L74 150 Z" fill="#9c8f78"/>'
  + [[120, 120], [200, 116]].map(function (b) { return '<path d="M' + b[0] + ' ' + b[1] + ' L' + (b[0] + 34) + ' ' + b[1] + ' L' + (b[0] + 28) + ' ' + (b[1] + 8) + ' L' + (b[0] + 6) + ' ' + (b[1] + 8) + ' Z" fill="#fff"/><rect x="' + (b[0] + 10) + '" y="' + (b[1] - 8) + '" width="12" height="8" fill="#3c6e8c"/>'; }).join('');
// Golden Cap: the highest cliff on the south coast, green below and its golden top
SCENES[7] = CLOUDS + SEA(130) + '<path d="M80 172 Q260 44 400 40 Q520 40 700 172 Z" fill="#7aa856"/><path d="M200 172 Q320 110 420 120 Q520 110 640 172 Z" fill="#6c9b4b"/>'
  + '<path d="M292 76 Q346 36 404 36 Q468 38 528 80 Q470 68 410 70 Q350 68 292 76 Z" fill="#e2b04a"/><path d="M292 76 Q350 68 410 70 Q470 68 528 80 Q470 74 410 76 Q350 74 292 80 Z" fill="#c4893a"/>'
  + '<rect x="402" y="28" width="6" height="12" fill="#efe9dd"/>' + rep(5, (i) => '<path d="M' + (120 + i * 26) + ' 172 L' + (140 + i * 26) + ' ' + (150 - i * 8) + '" stroke="#5f8f43" stroke-width="2" opacity=".6"/>');
// Charmouth: the fossil beach, a great ammonite on the shingle, the dark cliffs of Black Ven
SCENES[8] = CLOUDS + SEA(116) + '<path d="M0 124 L0 56 Q90 44 200 62 L300 128 Z" fill="#5f6b73"/><path d="M0 80 Q120 70 240 92" stroke="#7d8a92" stroke-width="5" fill="none"/>'
  + '<path d="M0 134 Q360 120 720 132 L720 190 L0 190 Z" fill="#b9ad96"/>' + rep(18, (i) => '<circle cx="' + ((i * 97) % 720) + '" cy="' + (150 + (i * 13) % 30) + '" r="' + (3 + i % 3) + '" fill="#a2967f"/>')
  + '<circle cx="380" cy="118" r="35" fill="#8a7d66"/><circle cx="380" cy="118" r="35" fill="none" stroke="#6e6250" stroke-width="2"/>'
  + '<path d="' + rep(73, (i) => { const t = i / 72 * Math.PI * 6.2, r = 2 + t * 1.55; return (i ? 'L' : 'M') + (380 + Math.cos(t) * r).toFixed(1) + ' ' + (118 + Math.sin(t) * r).toFixed(1) + ' '; }) + '" fill="none" stroke="#e9dfc9" stroke-width="3" stroke-linecap="round"/>'
  + rep(16, (i) => { const a = i / 16 * Math.PI * 2; return '<path d="M' + (380 + Math.cos(a) * 31).toFixed(1) + ' ' + (118 + Math.sin(a) * 31).toFixed(1) + ' L' + (380 + Math.cos(a) * 35).toFixed(1) + ' ' + (118 + Math.sin(a) * 35).toFixed(1) + '" stroke="#6e6250" stroke-width="2"/>'; });
// Lyme Regis: the Cobb's long curved harbour wall at sunset, the town climbing the hill
SCENES[9] = '<circle cx="560" cy="96" r="30" fill="#ffd27a" opacity=".95"/>' + SEA(116) + '<path d="M0 118 L0 60 Q80 50 170 78 L260 118 Z" fill="#6c8a52"/>'
  + rep(7, (i) => { const x = 10 + i * 30, y = 64 + i * 7; return '<rect x="' + x + '" y="' + y + '" width="26" height="22" fill="' + ['#f2e8d2', '#e9dcc0', '#f6efe2'][i % 3] + '"/><path d="M' + (x - 3) + ' ' + y + ' L' + (x + 13) + ' ' + (y - 10) + ' L' + (x + 29) + ' ' + y + ' Z" fill="' + ['#8a6a55', '#6f7d86', '#9c6b4e'][i % 3] + '"/><rect x="' + (x + 8) + '" y="' + (y + 6) + '" width="9" height="8" fill="#7fa6c4"/>'; })
  + '<path d="M120 150 Q330 104 540 126 Q610 132 660 116" stroke="#9c8f78" stroke-width="16" fill="none" stroke-linecap="round"/><path d="M120 144 Q330 98 540 120 Q610 126 660 110" stroke="#b9ad96" stroke-width="5" fill="none" stroke-linecap="round"/>'
  + [[330, 132], [420, 138]].map(function (b) { return '<path d="M' + b[0] + ' ' + b[1] + ' L' + (b[0] + 26) + ' ' + b[1] + ' L' + (b[0] + 21) + ' ' + (b[1] + 6) + ' L' + (b[0] + 5) + ' ' + (b[1] + 6) + ' Z" fill="#fff"/><path d="M' + (b[0] + 13) + ' ' + (b[1] - 1) + ' L' + (b[0] + 13) + ' ' + (b[1] - 22) + ' L' + (b[0] + 24) + ' ' + (b[1] - 3) + ' Z" fill="#fff"/>'; }).join('');

// SCENES_ONLY=1: just the drawings, for a look at them (no solving)
if (process.env.SCENES_ONLY) { module.exports = { chapters: CH, skies: SKIES, scenes: SCENES }; return; }
const used = new Set(), levels = [];
function pick(list, i) { for (let k = 0; k < list.length; k++) { const sd = list[(i * 53 + 7 + k * 11) % list.length]; if (!used.has(sd)) { used.add(sd); return sd; } } throw new Error('ran out'); }
for (let c = 0; c < 10; c++) for (let k = 0; k < 10; k++) {
  const i = c * 10 + k;
  const lv = c < 3 ? 1 : c < 6 ? (k % 3 === 2 ? 1 : 3) : c < 9 ? (k % 3 === 2 ? 3 : 5) : (k % 3 === 1 ? 7 : 5);
  const list = lv === 1 ? SD.s1 : lv === 3 ? SD.s2 : SD.s4;
  let seed, r;
  for (let t = 0; t < 30; t++) { seed = pick(list, i + t * 97); r = S.solve(seed, lv); if (r.won && S.replay(seed, lv, r.moves)) break; }
  if (!r.won) throw new Error('no winnable deal for level ' + (i + 1));
  const L = r.moves.length, tight = 1.8 - c * 0.06;
  const secs = Math.ceil((L * 3 + 90 + (lv >= 5 ? 120 : 0)) * tight / 15) * 15;
  const third = lv <= 3 && k % 3 === 1 ? 'nohint' : lv !== 7 && k % 3 === 0 ? 'noundo' : 'moves';
  const lvl = { seed, lv, secs, L };
  if (third === 'moves') lvl.moves = Math.ceil(L * (1.6 - c * 0.03)); else lvl.goal = third;
  levels.push(lvl);
}
const out = '/* 365 Spider - the Journey (made by tools/spider/make-journey.cjs on ' + new Date().toISOString().slice(0, 10) + '; do not edit by hand).\n'
  + ' * 10 chapters x 10 levels, each a deal the solver has won at its level (lv 1 Easy - one suit, 3 Normal - two, 5 Hard and 7 Expert - four),\n'
  + ' * secs = the two-star time, moves = the three-star limit (or goal noundo / nohint); scenes = our drawings of each chapter. */\n'
  + '(function (root) {\n  var J = { chapters: ' + JSON.stringify(CH) + ',\n    skies: ' + JSON.stringify(SKIES) + ',\n    scenes: ' + JSON.stringify(SCENES) + ',\n    levels: [\n'
  + levels.map((l) => '      ' + JSON.stringify(l)).join(',\n') + '\n    ] };\n'
  + "  if (typeof module !== 'undefined' && module.exports) module.exports = J; else root.SP_JOURNEY = J;\n})(typeof window !== 'undefined' ? window : this);\n";
fs.writeFileSync(path.join(__dirname, '../../games/spider/journey.js'), out);
console.log('levels', levels.length, 'by level', JSON.stringify(levels.reduce((a, l) => (a[l.lv] = (a[l.lv] || 0) + 1, a), {})), 'times', Math.min(...levels.map((l) => l.secs)) + '-' + Math.max(...levels.map((l) => l.secs)) + 's');
