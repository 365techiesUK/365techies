// The chapters of the four new Journeys (5 Oct 2026): ten real places each, and our own drawings of them (720 x 190;
// common/journey.js paints the sky first, then the drawing; the banner shows about y 22-168, so nothing that matters
// sits above y 26). Routes chosen so no place repeats one of the five older Journeys:
//   Hearts   - east along the seafront, Bournemouth's Lower Gardens to Barton on Sea (a full moon over the last)
//   Gin      - around Poole, from the Quay round the harbour to Branksome Chine
//   Cribbage - Dorset's old market towns and villages, Wareham to Beaminster
//   Whist    - across the Isle of Purbeck, Studland to Tyneham
// Preview: node tools/journeys/preview-scenes.cjs (scratchpad) - draws every banner on one page.
const rep = (n, f) => Array.from({ length: n }, (_, i) => f(i)).join('');
const CLOUDS = '<g fill="#fff" opacity=".7"><ellipse cx="96" cy="46" rx="36" ry="9"/><ellipse cx="120" cy="40" rx="22" ry="10"/><ellipse cx="610" cy="38" rx="30" ry="8"/><ellipse cx="632" cy="33" rx="18" ry="8"/></g>';
const sea = (y, c) => '<path d="M0 ' + y + ' L720 ' + y + ' L720 190 L0 190 Z" fill="' + (c || '#3f95c4') + '"/>'
  + '<path d="M0 ' + (y + 12) + ' Q90 ' + (y + 6) + ' 180 ' + (y + 12) + ' T360 ' + (y + 12) + ' T540 ' + (y + 12) + ' T720 ' + (y + 12) + '" stroke="rgba(255,255,255,.35)" stroke-width="2" fill="none"/>';
const tree = (x, y, r, c) => '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + (c || '#2f5d2a') + '"/>';
// a Bournemouth pine: tall bare trunk, a flat umbrella top
const pine = (x, y, h) => '<rect x="' + (x - 2) + '" y="' + (y - h) + '" width="4" height="' + h + '" fill="#6a4a32"/><ellipse cx="' + x + '" cy="' + (y - h) + '" rx="' + Math.round(h * 0.42) + '" ry="' + Math.round(h * 0.16) + '" fill="#2f5d2a"/><ellipse cx="' + (x + 6) + '" cy="' + (y - h - 4) + '" rx="' + Math.round(h * 0.26) + '" ry="' + Math.round(h * 0.11) + '" fill="#3c6e33"/>';
const hut = (x, y, c) => '<rect x="' + x + '" y="' + y + '" width="22" height="18" fill="' + c + '"/><path d="M' + (x - 2) + ' ' + (y + 1) + ' L' + (x + 11) + ' ' + (y - 8) + ' L' + (x + 24) + ' ' + (y + 1) + ' Z" fill="#f4f1ea"/><rect x="' + (x + 8) + '" y="' + (y + 6) + '" width="6" height="12" fill="rgba(0,0,0,.22)"/>';
const HUTS = ['#e94f4f', '#4fb0e9', '#f2c94c', '#6fcf97', '#bb6bd9', '#f2994a', '#56ccf2', '#eb5757', '#f7f3ea', '#2f80ed'];
const boat = (x, y, c, sail) => '<path d="M' + x + ' ' + y + ' L' + (x + 54) + ' ' + y + ' L' + (x + 46) + ' ' + (y + 11) + ' L' + (x + 7) + ' ' + (y + 11) + ' Z" fill="' + c + '"/>'
  + (sail ? '<rect x="' + (x + 25) + '" y="' + (y - 36) + '" width="2.5" height="36" fill="#5b4a3a"/><path d="M' + (x + 28) + ' ' + (y - 34) + ' L' + (x + 50) + ' ' + (y - 3) + ' L' + (x + 28) + ' ' + (y - 3) + ' Z" fill="' + sail + '"/>' : '<rect x="' + (x + 16) + '" y="' + (y - 9) + '" width="16" height="9" fill="#f4f1ea"/>');
const house = (x, y, w, h, wall, roof) => '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + wall + '"/><path d="M' + (x - 3) + ' ' + y + ' L' + (x + w / 2) + ' ' + (y - h * 0.6) + ' L' + (x + w + 3) + ' ' + y + ' Z" fill="' + roof + '"/>'
  + '<rect x="' + (x + w * 0.2) + '" y="' + (y + h * 0.3) + '" width="' + (w * 0.18) + '" height="' + (h * 0.25) + '" fill="#7fb6d8"/><rect x="' + (x + w * 0.62) + '" y="' + (y + h * 0.3) + '" width="' + (w * 0.18) + '" height="' + (h * 0.25) + '" fill="#7fb6d8"/>';
// a thatched cottage: white walls, a deep rounded straw roof
const cottage = (x, y, w) => '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="22" fill="#f6f1e4"/><path d="M' + (x - 6) + ' ' + (y + 4) + ' Q' + (x + w / 2) + ' ' + (y - 24) + ' ' + (x + w + 6) + ' ' + (y + 4) + ' Z" fill="#c9a25a"/>'
  + '<rect x="' + (x + w * 0.4) + '" y="' + (y + 9) + '" width="' + (w * 0.2) + '" height="13" fill="#6b4f35"/><rect x="' + (x + 6) + '" y="' + (y + 8) + '" width="8" height="7" fill="#7fb6d8"/><rect x="' + (x + w - 14) + '" y="' + (y + 8) + '" width="8" height="7" fill="#7fb6d8"/>';
// a church tower of Purbeck/Dorset stone, battlements on top (pinnacles if asked)
const tower = (x, y, w, h, c, pin) => '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + c + '"/>' + rep(Math.floor(w / 8), (i) => '<rect x="' + (x + i * 8) + '" y="' + (y - 5) + '" width="5" height="5" fill="' + c + '"/>')
  + (pin ? rep(2, (i) => '<path d="M' + (x - 1 + i * (w - 4)) + ' ' + (y - 5) + ' L' + (x + 2 + i * (w - 4)) + ' ' + (y - 17) + ' L' + (x + 5 + i * (w - 4)) + ' ' + (y - 5) + ' Z" fill="' + c + '"/>') : '')
  + '<path d="M' + (x + w / 2 - 4) + ' ' + (y + 14) + ' L' + (x + w / 2 - 4) + ' ' + (y + 8) + ' Q' + (x + w / 2) + ' ' + (y + 3) + ' ' + (x + w / 2 + 4) + ' ' + (y + 8) + ' L' + (x + w / 2 + 4) + ' ' + (y + 14) + ' Z" fill="rgba(0,0,0,.3)"/>';
const fields = '<path d="M0 132 L720 132 L720 190 L0 190 Z" fill="#88b562"/>';
const hills = '<path d="M0 124 Q140 96 300 112 T600 104 T720 114 L720 136 L0 136 Z" fill="#a8c79a" opacity=".8"/>';
const down = (n, svg) => '<g transform="translate(0 ' + n + ')">' + svg + '</g>';
const sun = (x, y, r, c) => '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + (c || '#ffd27a') + '" opacity=".95"/>';
const SAND = (y) => '<path d="M0 ' + y + ' Q360 ' + (y - 8) + ' 720 ' + y + ' L720 190 L0 190 Z" fill="#f2d9a2"/>';
const swan = (x, y) => '<ellipse cx="' + x + '" cy="' + y + '" rx="11" ry="5" fill="#fff"/><path d="M' + (x + 7) + ' ' + (y - 2) + ' Q' + (x + 12) + ' ' + (y - 16) + ' ' + (x + 6) + ' ' + (y - 16) + '" stroke="#fff" stroke-width="3" fill="none"/><path d="M' + (x + 5) + ' ' + (y - 16) + ' L' + (x + 1) + ' ' + (y - 14) + '" stroke="#f2994a" stroke-width="2.5"/>';

const HEARTS = {
  where: 'east along the seafront',
  chapters: ['Lower Gardens', 'Russell-Cotes', 'East Cliff', 'Boscombe Pier', 'Southbourne', 'Tuckton Bridge', 'Mudeford Quay', 'Avon Beach', 'Highcliffe Castle', 'Barton on Sea'],
  // day into evening along the coast, and night - with a full moon - at Barton
  skies: [['#9fd8ff', '#eef8ff'], ['#93cdf6', '#f4f9ff'], ['#8cc6f0', '#fff3d9'], ['#88c0ec', '#ffeccc'], ['#86b6e4', '#ffe1b8'], ['#7fa9dc', '#ffd2a3'], ['#6f93d0', '#ffc28f'], ['#5c78bf', '#ffab7c'], ['#3d4f93', '#f08a73'], ['#101a40', '#2e3f7a']],
  scenes: [
    // Lower Gardens: the stream, the flower beds, the bandstand and the pines
    CLOUDS + '<path d="M0 118 L720 118 L720 190 L0 190 Z" fill="#7fb35a"/>' + pine(60, 120, 64) + pine(130, 118, 76) + pine(600, 120, 70) + pine(668, 118, 60)
      + '<path d="M0 156 Q200 140 360 152 T720 148 L720 166 Q540 158 360 170 T0 172 Z" fill="#5fb0d8"/>'
      + '<rect x="330" y="96" width="70" height="8" fill="#e9e3d2"/>' + rep(6, (i) => '<rect x="' + (334 + i * 12) + '" y="104" width="3" height="20" fill="#e9e3d2"/>') + '<path d="M326 98 Q365 66 404 98 Z" fill="#2f6f5f"/><rect x="328" y="124" width="74" height="5" fill="#d8d0bd"/>'
      + rep(16, (i) => '<circle cx="' + (180 + (i % 8) * 18) + '" cy="' + (132 + Math.floor(i / 8) * 9) + '" r="5" fill="' + ['#e94f4f', '#f2c94c', '#bb6bd9', '#f2994a'][i % 4] + '"/>')
      + rep(16, (i) => '<circle cx="' + (440 + (i % 8) * 18) + '" cy="' + (132 + Math.floor(i / 8) * 9) + '" r="5" fill="' + ['#f2c94c', '#e94f4f', '#56ccf2', '#f7f3ea'][i % 4] + '"/>'),
    // Russell-Cotes: the villa with its little tower on the cliff top, the sea below
    CLOUDS + down(12, sea(120) + '<path d="M0 190 L0 112 L420 104 Q470 104 500 190 Z" fill="#c9905f"/><path d="M0 116 L420 106 L428 116 L0 124 Z" fill="#6f9a4c"/>'
      + '<rect x="160" y="62" width="150" height="46" fill="#f1e2c6"/><path d="M152 64 L235 40 L318 64 Z" fill="#b5523b"/><rect x="290" y="34" width="26" height="74" fill="#efdcbc"/><path d="M286 36 L303 18 L320 36 Z" fill="#b5523b"/>'
      + rep(5, (i) => '<rect x="' + (172 + i * 26) + '" y="74" width="12" height="18" fill="#7fb6d8"/>') + '<rect x="296" y="46" width="14" height="14" fill="#7fb6d8"/>' + pine(110, 110, 60) + pine(380, 106, 54)),
    // East Cliff: the cliff lift's car on its rails down the cliff face, the zig-zag path beside it
    CLOUDS + down(18, sea(124) + SAND(146) + '<path d="M0 190 L0 60 L480 56 Q560 60 600 190 Z" fill="#d79a62"/><path d="M0 64 L480 60 L486 70 L0 74 Z" fill="#6f9a4c"/>'
      + '<path d="M300 66 L410 150" stroke="#7b5a3a" stroke-width="6"/><path d="M308 64 L418 148" stroke="#a07a54" stroke-width="2"/><g transform="translate(352 104) rotate(37)"><rect x="-16" y="-12" width="32" height="22" rx="3" fill="#2f6f9f"/><rect x="-11" y="-8" width="9" height="8" fill="#cfe6f5"/><rect x="2" y="-8" width="9" height="8" fill="#cfe6f5"/></g>'
      + '<path d="M120 72 L220 92 L110 112 L230 132 L130 150" stroke="#e8d4b0" stroke-width="5" fill="none"/>' + pine(60, 66, 36) + pine(250, 62, 38)),
    // Boscombe Pier: the pier's 1950s entrance building, the deck out to sea, surfers on the waves
    CLOUDS + sea(118) + SAND(150) + '<rect x="220" y="104" width="480" height="7" fill="#7b6a5a"/>' + rep(18, (i) => '<rect x="' + (226 + i * 26) + '" y="111" width="3" height="26" fill="#5b4a3a"/>')
      + '<rect x="150" y="80" width="110" height="40" fill="#f4f1ea"/><path d="M140 82 Q205 54 270 82 Z" fill="#2fa3c9"/><rect x="164" y="92" width="80" height="12" fill="#7fb6d8"/><rect x="200" y="62" width="8" height="20" fill="#f4f1ea"/>'
      + rep(3, (i) => '<rect x="' + (420 + i * 90) + '" y="' + (138 + (i % 2) * 6) + '" width="26" height="4" rx="2" fill="' + ['#f2c94c', '#e94f4f', '#f7f3ea'][i] + '"/><circle cx="' + (433 + i * 90) + '" cy="' + (128 + (i % 2) * 6) + '" r="4" fill="#2b2b2b"/><rect x="' + (431 + i * 90) + '" y="' + (131 + (i % 2) * 6) + '" width="4" height="8" fill="#2b2b2b"/>'),
    // Southbourne: clifftop houses, the long promenade and the beach huts below
    CLOUDS + sea(124) + '<path d="M0 190 L0 74 L720 80 L720 190 Z" fill="#cf9a66"/><path d="M0 76 L720 82 L720 92 L0 86 Z" fill="#6f9a4c"/>'
      + rep(6, (i) => house(30 + i * 118, 52, 52, 26, ['#f4f1ea', '#efe3cf', '#f7f3ea'][i % 3], ['#9c5a3c', '#7a6b5a'][i % 2])) + '<rect x="0" y="140" width="720" height="8" fill="#d8d0bd"/>'
      + rep(14, (i) => hut(16 + i * 50, 122, HUTS[i % HUTS.length])) + SAND(160),
    // Tuckton Bridge: the bridge over the Stour, boats moored, the tea gardens' umbrellas on the bank
    CLOUDS + '<path d="M0 110 L720 110 L720 190 L0 190 Z" fill="#7fb35a"/>' + sea(134, '#4f9fbf')
      + '<path d="M140 120 L580 120 L580 128 L140 128 Z" fill="#c9c2b2"/>' + rep(4, (i) => '<path d="M' + (170 + i * 110) + ' 128 Q' + (225 + i * 110) + ' 108 ' + (280 + i * 110) + ' 128" fill="none" stroke="#a9a293" stroke-width="5"/>') + rep(5, (i) => '<rect x="' + (166 + i * 110) + '" y="128" width="8" height="12" fill="#a9a293"/>')
      + boat(40, 150, '#f4f1ea', null) + boat(600, 156, '#2f6f9f', null) + rep(3, (i) => '<path d="M' + (40 + i * 34) + ' 104 L' + (56 + i * 34) + ' 92 L' + (72 + i * 34) + ' 104 Z" fill="' + ['#e94f4f', '#f2c94c', '#56ccf2'][i] + '"/><rect x="' + (55 + i * 34) + '" y="104" width="2" height="10" fill="#5b4a3a"/>') + tree(640, 98, 18, '#3f6f34') + tree(676, 104, 14, '#2f5d2a'),
    // Mudeford Quay: the fishing boats, the lobster pots stacked on the quay, Hengistbury's huts across the Run
    CLOUDS + sea(118) + '<path d="M420 118 Q560 92 720 100 L720 118 Z" fill="#c9a36a"/>' + rep(7, (i) => hut(452 + i * 36, 104, HUTS[(i + 3) % HUTS.length]))
      + '<path d="M0 190 L0 132 L300 132 L320 190 Z" fill="#b8b1a2"/>' + rep(9, (i) => '<rect x="' + (20 + (i % 5) * 28) + '" y="' + (114 - Math.floor(i / 5) * 12) + '" width="24" height="12" rx="3" fill="none" stroke="#2f5d6a" stroke-width="2"/>')
      + boat(360, 146, '#e94f4f', null) + boat(500, 156, '#2f6f9f', null) + boat(600, 142, '#f4f1ea', null) + '<rect x="170" y="104" width="4" height="30" fill="#5b4a3a"/><rect x="250" y="104" width="4" height="30" fill="#5b4a3a"/>',
    // Avon Beach: huts along the sand, and far across the water the Isle of Wight and the Needles
    CLOUDS + sea(116) + '<path d="M520 116 Q600 98 690 104 L700 116 Z" fill="#9fb38a"/><path d="M690 104 L704 116 L700 116 Z" fill="#f4f1ea"/>' + rep(3, (i) => '<path d="M' + (702 + i * 7) + ' 116 L' + (705 + i * 7) + ' ' + (106 + i * 2) + ' L' + (708 + i * 7) + ' 116 Z" fill="#f4f1ea"/>')
      + SAND(138) + rep(16, (i) => hut(10 + i * 44, 120 + (i % 2) * 2, HUTS[(i + 5) % HUTS.length])),
    // Highcliffe Castle: the pale stone castle with its pointed windows, among the pines on the cliff
    CLOUDS + sea(124) + '<path d="M0 190 L0 112 L720 108 L720 190 Z" fill="#6f9a4c"/>'
      + '<rect x="260" y="64" width="200" height="50" fill="#e9dcc2"/><rect x="236" y="44" width="40" height="70" fill="#e2d3b6"/><rect x="444" y="50" width="34" height="64" fill="#e2d3b6"/>' + rep(5, (i) => '<rect x="' + (236 + i * 8) + '" y="39" width="5" height="5" fill="#e2d3b6"/>') + rep(4, (i) => '<rect x="' + (444 + i * 8) + '" y="45" width="5" height="5" fill="#e2d3b6"/>')
      + rep(6, (i) => '<path d="M' + (276 + i * 30) + ' 104 L' + (276 + i * 30) + ' 82 Q' + (283 + i * 30) + ' 72 ' + (290 + i * 30) + ' 82 L' + (290 + i * 30) + ' 104 Z" fill="#7fb6d8"/>') + pine(120, 112, 66) + pine(180, 110, 54) + pine(560, 110, 62) + pine(640, 112, 72),
    // Barton on Sea: the clifftop green at night, a full moon over the sea and the Needles - for shooting the moon
    sun(520, 64, 34, '#fff6d6') + '<circle cx="508" cy="58" r="6" fill="#ebe2c2" opacity=".6"/><circle cx="530" cy="74" r="4" fill="#ebe2c2" opacity=".6"/>' + rep(14, (i) => '<circle cx="' + (40 + i * 49) + '" cy="' + (30 + (i * 37) % 40) + '" r="1.6" fill="#fff"/>')
      + sea(118, '#1d3a66') + rep(7, (i) => '<rect x="' + (500 + (i % 2) * 8 - i * 2) + '" y="' + (124 + i * 8) + '" width="' + (36 + i * 6) + '" height="2.5" rx="1" fill="#fff6d6" opacity="' + (0.8 - i * 0.08).toFixed(2) + '"/>') + '<path d="M620 118 Q660 104 700 108 L706 118 Z" fill="#3d4f6a"/>'
      + '<path d="M0 190 L0 104 Q200 98 380 110 L400 190 Z" fill="#3e5a3a"/><rect x="100" y="94" width="44" height="5" rx="2" fill="#2b2418"/><rect x="100" y="84" width="44" height="4" rx="2" fill="#2b2418"/><rect x="104" y="99" width="4" height="10" fill="#2b2418"/><rect x="136" y="99" width="4" height="10" fill="#2b2418"/>',
  ],
};

const GIN = {
  where: 'around Poole',
  chapters: ['Poole Quay', 'Twin Sails Bridge', 'Hamworthy Beach', 'Holes Bay', 'Upton Country Park', 'Poole Park', 'Baiter', 'Lilliput', 'Canford Cliffs', 'Branksome Chine'],
  skies: [['#9fd8ff', '#eef8ff'], ['#93cdf6', '#f1f9ff'], ['#9ad4ff', '#fff2cc'], ['#8fc4ec', '#e9f7e4'], ['#86b8e0', '#f3f9e9'], ['#9cc7ee', '#ffe9c4'], ['#8ab6e2', '#fff0d0'], ['#7aa6d8', '#f4e2c4'], ['#6f93d0', '#ffd2a3'], ['#3f5aa0', '#ff9f6a']],
  scenes: [
    // Poole Quay: the old red-brick Custom House with its double steps, the fishing boats alongside
    CLOUDS + sea(130, '#3a86b4') + '<path d="M0 118 L720 118 L720 132 L0 132 Z" fill="#b8b1a2"/>'
      + '<rect x="270" y="56" width="140" height="62" fill="#b5523b"/><path d="M262 58 L340 36 L418 58 Z" fill="#7a3a2a"/>' + rep(4, (i) => '<rect x="' + (284 + i * 32) + '" y="70" width="14" height="20" fill="#f4f1ea"/>') + '<rect x="326" y="96" width="28" height="22" fill="#4a2a1f"/>'
      + '<path d="M290 118 L326 100 M390 118 L354 100" stroke="#e9e3d2" stroke-width="6"/>' + house(90, 84, 70, 34, '#f1e2c6', '#7a6b5a') + house(470, 82, 80, 36, '#e8d9c0', '#8c4a35')
      + boat(60, 148, '#e94f4f', null) + boat(180, 154, '#2f6f9f', null) + boat(560, 150, '#f4f1ea', '#f7f3ea'),
    // Twin Sails Bridge: the two leaves of the lifting bridge raised like sails, a yacht going through
    CLOUDS + sea(126, '#3a86b4') + '<path d="M0 116 L250 116 L250 128 L0 128 Z" fill="#c9c2b2"/><path d="M470 116 L720 116 L720 128 L470 128 Z" fill="#c9c2b2"/>'
      + '<path d="M250 116 L300 40 L312 46 L268 120 Z" fill="#e9edf3"/><path d="M470 116 L420 40 L408 46 L452 120 Z" fill="#e9edf3"/><path d="M262 116 L300 52" stroke="#9aa6b4" stroke-width="2"/><path d="M458 116 L420 52" stroke="#9aa6b4" stroke-width="2"/>'
      + boat(330, 150, '#f4f1ea', '#f7f3ea') + rep(4, (i) => '<rect x="' + (20 + i * 50) + '" y="' + (80 + (i % 2) * 10) + '" width="40" height="' + (36 - (i % 2) * 10) + '" fill="' + ['#d8d0bd', '#c9c2b2'][i % 2] + '"/>'),
    // Hamworthy Beach: the little beach in the harbour, the huts, Brownsea's trees across the water
    CLOUDS + sea(118, '#4a9cc6') + '<path d="M380 118 Q520 86 700 100 L720 118 Z" fill="#3f6f34"/>' + rep(6, (i) => tree(420 + i * 46, 102 - (i % 2) * 4, 14, '#2f5d2a'))
      + SAND(140) + rep(9, (i) => hut(30 + i * 40, 124, HUTS[(i + 2) % HUTS.length])) + boat(500, 152, '#f4f1ea', '#e94f4f'),
    // Holes Bay: the reeds and mudflats, wading birds, the railway on its embankment across the bay
    CLOUDS + '<path d="M0 112 L720 112 L720 190 L0 190 Z" fill="#7d9b8c"/>' + sea(130, '#5d9fbf') + '<path d="M0 118 L720 118 L720 126 L0 126 Z" fill="#8a8274"/>'
      + '<rect x="200" y="104" width="190" height="14" rx="3" fill="#3d6fa3"/>' + rep(6, (i) => '<rect x="' + (208 + i * 30) + '" y="107" width="18" height="6" fill="#cfe6f5"/>')
      + rep(30, (i) => '<path d="M' + (i * 24 + 6) + ' 190 L' + (i * 24 + 10) + ' ' + (160 + (i % 4) * 4) + '" stroke="#b9a35a" stroke-width="3"/>')
      + rep(4, (i) => '<ellipse cx="' + (300 + i * 70) + '" cy="' + (148 + (i % 2) * 4) + '" rx="8" ry="5" fill="#f4f1ea"/><path d="M' + (300 + i * 70) + ' ' + (153 + (i % 2) * 4) + ' L' + (300 + i * 70) + ' ' + (164 + (i % 2) * 4) + '" stroke="#e0a400" stroke-width="2"/>'),
    // Upton Country Park: the white Georgian house among the trees, the lawn in front
    CLOUDS + fields + hills + '<rect x="250" y="66" width="220" height="62" fill="#f6f2e8"/><rect x="330" y="50" width="60" height="78" fill="#f1ece0"/><path d="M324 52 L360 34 L396 52 Z" fill="#9a9384"/>'
      + rep(6, (i) => '<rect x="' + (262 + i * 34) + '" y="80" width="14" height="22" fill="#7fb6d8"/>') + rep(4, (i) => '<rect x="' + (338 + i * 13) + '" y="104" width="5" height="24" fill="#e2dccd"/>')
      + tree(140, 104, 34, '#3f6f34') + tree(200, 112, 24, '#2f5d2a') + tree(560, 104, 34, '#3f6f34') + tree(620, 112, 26, '#2f5d2a'),
    // Poole Park: the lake, the swans, and the little train running round it
    CLOUDS + fields + sea(132, '#5fb0d8') + swan(220, 160) + swan(300, 168) + swan(420, 158)
      + '<path d="M0 124 L720 124" stroke="#6b5a44" stroke-width="3"/><rect x="460" y="104" width="34" height="18" rx="3" fill="#2f6f3f"/><rect x="466" y="94" width="10" height="12" fill="#2f6f3f"/><rect x="496" y="108" width="40" height="14" rx="2" fill="#c74b4b"/><rect x="538" y="108" width="40" height="14" rx="2" fill="#f2c94c"/>'
      + rep(5, (i) => '<circle cx="' + (468 + i * 22) + '" cy="124" r="4" fill="#2b2b2b"/>') + tree(80, 104, 28, '#3f6f34') + tree(640, 106, 26, '#3f6f34'),
    // Baiter: the open green by the harbour, kites up, Brownsea far across the water
    CLOUDS + sea(116, '#4a9cc6') + '<path d="M360 116 Q500 98 640 108 L650 116 Z" fill="#3f6f34"/>' + '<path d="M0 132 Q360 122 720 132 L720 190 L0 190 Z" fill="#7fb35a"/>'
      + '<path d="M180 50 L200 70 L180 92 L160 70 Z" fill="#e94f4f"/><path d="M180 92 Q170 120 190 150" stroke="#fff" stroke-width="1.5" fill="none"/><path d="M520 40 L536 56 L520 74 L504 56 Z" fill="#f2c94c"/><path d="M520 74 Q530 110 500 150" stroke="#fff" stroke-width="1.5" fill="none"/>'
      + '<rect x="186" y="150" width="4" height="12" fill="#2b2b2b"/><circle cx="188" cy="146" r="4" fill="#2b2b2b"/><rect x="498" y="150" width="4" height="12" fill="#2b2b2b"/><circle cx="500" cy="146" r="4" fill="#2b2b2b"/>',
    // Lilliput: yachts on their moorings, the wooded shore of Evening Hill
    CLOUDS + sea(108, '#3f8fbf') + '<path d="M0 108 Q160 70 360 84 L380 108 Z" fill="#3f6f34"/>' + rep(5, (i) => house(30 + i * 62, 82 - (i % 2) * 6, 40, 20, '#f4f1ea', '#7a6b5a'))
      + boat(120, 146, '#f4f1ea', '#f7f3ea') + boat(260, 156, '#f4f1ea', '#f7f3ea') + boat(420, 142, '#2f6f9f', '#f7f3ea') + boat(570, 152, '#f4f1ea', '#e9edf3'),
    // Canford Cliffs: the sandy cliffs with pines, the beach below
    CLOUDS + down(20, sea(122) + SAND(148) + '<path d="M240 190 L240 70 Q420 60 720 66 L720 190 Z" fill="#e0b27a"/><path d="M240 74 Q420 62 720 70 L720 80 Q420 72 240 84 Z" fill="#6f9a4c"/>'
      + '<path d="M300 150 Q340 110 330 84" stroke="#c8935a" stroke-width="10" fill="none"/>' + pine(300, 76, 40) + pine(400, 72, 46) + pine(520, 70, 42) + pine(640, 70, 48)),
    // Branksome Chine: the old beach building at the foot of the wooded chine, the sun going down over the sea
    sun(130, 100, 30) + sea(122, '#3a7fae') + SAND(146)
      + '<path d="M260 150 L260 66 Q360 64 430 128 L460 150 Z" fill="#3f6f34"/><path d="M720 150 L720 62 Q620 62 540 128 L500 150 Z" fill="#355f2d"/>' + pine(300, 80, 40) + pine(360, 92, 34) + pine(660, 76, 40) + pine(600, 92, 34)
      + '<rect x="420" y="122" width="120" height="28" fill="#f4f1ea"/><rect x="440" y="110" width="50" height="14" fill="#f4f1ea"/><rect x="428" y="130" width="104" height="9" fill="#7fb6d8"/>',
  ],
};

const CRIBBAGE = {
  where: 'through Dorset’s market towns',
  chapters: ['Wareham', 'Bere Regis', 'Tolpuddle', 'Milton Abbas', 'Blandford Forum', 'Sturminster Newton', 'Stalbridge', 'Cerne Abbas', 'Evershot', 'Beaminster'],
  skies: [['#9fd0f5', '#eef8ff'], ['#93c8f0', '#f4f9ff'], ['#8fc4ec', '#e9f7e4'], ['#86b8e0', '#f3f9e9'], ['#9cc7ee', '#ffe9c4'], ['#8ab6e2', '#fff0d0'], ['#93bde6', '#f7efe2'], ['#7aa6d8', '#f4e2c4'], ['#7f9fd6', '#ffd9b0'], ['#3f5aa0', '#ff9f6a']],
  scenes: [
    // Wareham: the quay on the River Frome, the church tower above the town, boats tied up
    CLOUDS + hills + '<path d="M0 120 L720 120 L720 190 L0 190 Z" fill="#7fb35a"/>' + sea(140, '#4f8fb0') + tower(470, 60, 40, 64, '#cdbb95')
      + rep(5, (i) => house(60 + i * 72, 92, 54, 30, ['#e8d9c0', '#f1e2c6', '#d9c9a8'][i % 3], '#8c4a35')) + '<path d="M0 132 L720 132 L720 140 L0 140 Z" fill="#9a9384"/>'
      + boat(120, 160, '#2f6f9f', null) + boat(300, 164, '#f4f1ea', '#f7f3ea') + boat(520, 158, '#e94f4f', null),
    // Bere Regis: the church with its tall tower, the village round it, the heath behind
    CLOUDS + '<path d="M0 116 Q200 96 420 110 T720 106 L720 136 L0 136 Z" fill="#8a6b8f" opacity=".75"/>' + fields
      + tower(300, 50, 44, 80, '#c9b79a', true) + '<rect x="344" y="88" width="120" height="42" fill="#c9b79a"/><path d="M340 90 L404 66 L468 90 Z" fill="#7a6b5a"/>'
      + rep(3, (i) => '<path d="M' + (360 + i * 36) + ' 120 L' + (360 + i * 36) + ' 104 Q' + (366 + i * 36) + ' 96 ' + (372 + i * 36) + ' 104 L' + (372 + i * 36) + ' 120 Z" fill="#6b5a44"/>')
      + cottage(80, 108, 70) + cottage(560, 108, 80) + tree(220, 112, 22, '#3f6f34') + tree(640, 104, 18, '#2f5d2a'),
    // Tolpuddle: the old sycamore on the green, thatched cottages round it
    CLOUDS + down(14, fields + hills + '<rect x="340" y="80" width="18" height="56" fill="#6a4a32"/><path d="M349 90 L320 70 M349 96 L382 74" stroke="#6a4a32" stroke-width="7"/>'
      + tree(320, 60, 36, '#3f6f34') + tree(372, 56, 40, '#3f6f34') + tree(346, 40, 34, '#4a7d3c') + '<path d="M240 138 Q350 128 460 138 L460 146 L240 146 Z" fill="#9cc47a"/>'
      + cottage(60, 110, 90) + cottage(520, 108, 80) + cottage(620, 112, 70)),
    // Milton Abbas: the wide street of identical white thatched cottages climbing the hill, chestnut trees between
    CLOUDS + '<path d="M0 190 L0 112 Q360 84 720 104 L720 190 Z" fill="#7fb35a"/><path d="M300 190 Q360 130 420 92 L440 92 Q390 130 380 190 Z" fill="#cbbf9f"/>'
      + rep(4, (i) => cottage(60 + i * 56, 134 - i * 12, 42)) + rep(4, (i) => cottage(450 + i * 60, 96 + i * 12, 44))
      + rep(3, (i) => tree(90 + i * 56, 120 - i * 12, 12, '#3f6f34')) + rep(3, (i) => tree(500 + i * 60, 86 + i * 12, 12, '#3f6f34')),
    // Blandford Forum: the Georgian church with its cupola over the market place, the town's brick fronts
    CLOUDS + down(14, fields + '<rect x="300" y="70" width="120" height="66" fill="#e9dcc2"/><rect x="340" y="48" width="40" height="24" fill="#e2d3b6"/><path d="M340 50 Q360 18 380 50 Z" fill="#8fa7a0"/><rect x="358" y="14" width="4" height="10" fill="#8f8a7e"/>'
      + rep(3, (i) => '<path d="M' + (316 + i * 36) + ' 120 L' + (316 + i * 36) + ' 92 Q' + (326 + i * 36) + ' 80 ' + (336 + i * 36) + ' 92 L' + (336 + i * 36) + ' 120 Z" fill="#7fb6d8"/>')
      + rep(3, (i) => house(30 + i * 86, 96, 74, 40, '#b5523b', '#7a3a2a')) + rep(3, (i) => house(450 + i * 86, 96, 74, 40, '#c46a4c', '#7a3a2a'))),
    // Sturminster Newton: the old water mill on the Stour, its wheel turning, the meadow behind
    CLOUDS + fields + hills + sea(146, '#4f8fb0') + '<rect x="250" y="68" width="170" height="78" fill="#e2d3b6"/><path d="M242 70 L335 34 L428 70 Z" fill="#8a7a62"/>' + rep(3, (i) => '<rect x="' + (268 + i * 50) + '" y="86" width="16" height="18" fill="#6b5a44"/>')
      + '<circle cx="450" cy="124" r="30" fill="none" stroke="#6b4f35" stroke-width="5"/>' + rep(8, (i) => '<path d="M450 124 L' + (450 + Math.round(30 * Math.cos(i * Math.PI / 4))) + ' ' + (124 + Math.round(30 * Math.sin(i * Math.PI / 4))) + '" stroke="#6b4f35" stroke-width="3"/>')
      + tree(120, 104, 30, '#3f6f34') + tree(620, 108, 26, '#3f6f34'),
    // Stalbridge: the tall old market cross in the street, houses on either side
    CLOUDS + down(10, fields + '<rect x="0" y="134" width="720" height="10" fill="#cbbf9f"/>' + '<rect x="346" y="40" width="16" height="96" fill="#cdbb95"/><path d="M340 40 L354 18 L368 40 Z" fill="#cdbb95"/><rect x="330" y="124" width="48" height="14" fill="#bcab88"/><rect x="320" y="134" width="68" height="8" fill="#bcab88"/>'
      + '<path d="M346 30 L362 30 M354 22 L354 38" stroke="#bcab88" stroke-width="4"/>' + rep(3, (i) => house(40 + i * 92, 92, 76, 42, ['#e8d9c0', '#d9c9a8'][i % 2], '#7a6b5a')) + rep(3, (i) => house(430 + i * 92, 92, 76, 42, ['#d9c9a8', '#e8d9c0'][i % 2], '#8c4a35'))),
    // Cerne Abbas: the village pond and stone cottages, the steep chalk downs above
    CLOUDS + '<path d="M0 124 Q120 40 300 50 Q480 60 560 124 Z" fill="#7aa856"/><path d="M420 124 Q560 70 720 80 L720 124 Z" fill="#6c9b4b"/>' + fields
      + rep(4, (i) => cottage(70 + i * 90, 114, 64)) + '<ellipse cx="420" cy="160" rx="150" ry="16" fill="#5fb0d8"/>' + swan(380, 162) + swan(460, 158),
    // Evershot: the stone houses along the street, the church tower at the end, the woods behind
    CLOUDS + '<path d="M0 124 Q200 90 420 104 T720 100 L720 130 L0 130 Z" fill="#4e7d3a"/>' + rep(9, (i) => tree(40 + i * 80, 100 - (i % 2) * 6, 22, '#3f6f34')) + fields
      + tower(580, 66, 40, 70, '#c9b79a') + rep(6, (i) => house(30 + i * 88, 102, 70, 34, ['#c9b79a', '#d9c9a8', '#bcab88'][i % 3], '#7a6b5a')),
    // Beaminster: the tall church tower crowded with pinnacles over the town square, evening light
    CLOUDS + down(16, '<path d="M0 124 Q200 92 420 104 T720 100 L720 130 L0 130 Z" fill="#7a8f6a"/>' + fields + tower(330, 34, 52, 100, '#d4a85a', true)
      + rep(3, (i) => '<path d="M' + (338 + i * 16) + ' 29 L' + (342 + i * 16) + ' 18 L' + (346 + i * 16) + ' 29 Z" fill="#d4a85a"/>') + rep(3, (i) => house(40 + i * 92, 96, 76, 40, ['#d4a85a', '#c99a50'][i % 2], '#7a6b5a')) + rep(3, (i) => house(420 + i * 92, 96, 76, 40, ['#c99a50', '#d4a85a'][i % 2], '#8c4a35'))),
  ],
};

const WHIST = {
  where: 'across the Isle of Purbeck',
  chapters: ['Studland Bay', 'Arne', 'Langton Matravers', 'Durlston', 'Dancing Ledge', 'Worth Matravers', 'St Aldhelm’s Head', 'Chapman’s Pool', 'Kimmeridge Bay', 'Tyneham'],
  skies: [['#9fd8ff', '#eef8ff'], ['#8ec9f5', '#ffe9c7'], ['#93c8f0', '#f4f9ff'], ['#9ad4ff', '#fff2cc'], ['#86b8e0', '#f3f9e9'], ['#8cc8f0', '#f1fbff'], ['#9bc9ec', '#ffe2b8'], ['#7fb4e8', '#ffd9a8'], ['#6a86c4', '#f7c99b'], ['#2e3f86', '#ff8a5c']],
  scenes: [
    // Studland Bay: the long sandy beach, the heath and dunes behind it, the white cliffs at the far end
    CLOUDS + sea(116) + SAND(140) + '<path d="M0 140 Q180 112 360 126 Q520 136 720 120 L720 140 Z" fill="#a39060"/>' + rep(12, (i) => '<path d="M' + (30 + i * 58) + ' ' + (134 - (i % 3) * 4) + ' L' + (36 + i * 58) + ' ' + (120 - (i % 3) * 4) + ' L' + (42 + i * 58) + ' ' + (134 - (i % 3) * 4) + '" fill="none" stroke="#7d8f4a" stroke-width="2"/>')
      + '<path d="M600 116 L620 74 Q680 66 720 70 L720 116 Z" fill="#f6f4ee"/><path d="M620 74 Q680 66 720 70 L720 78 Q680 72 622 82 Z" fill="#6f9a4c"/>',
    // Arne: the purple heath, the little old church, Poole Harbour beyond, a sika deer
    CLOUDS + sea(108, '#5d9fbf') + '<path d="M0 118 Q200 104 420 114 T720 112 L720 190 L0 190 Z" fill="#8a6b8f"/>' + rep(18, (i) => '<circle cx="' + (20 + i * 40) + '" cy="' + (150 + (i % 3) * 10) + '" r="7" fill="#b07cc0" opacity=".8"/>')
      + '<rect x="440" y="94" width="80" height="26" fill="#cdbb95"/><path d="M436 96 L480 80 L524 96 Z" fill="#7a6b5a"/><rect x="512" y="80" width="10" height="16" fill="#cdbb95"/>'
      + '<ellipse cx="200" cy="132" rx="20" ry="9" fill="#8a5a36"/><rect x="186" y="138" width="3" height="16" fill="#8a5a36"/><rect x="210" y="138" width="3" height="16" fill="#8a5a36"/><path d="M216 126 L226 108 L230 110 L222 128 Z" fill="#8a5a36"/><path d="M224 108 L220 98 M226 108 L232 98" stroke="#6b4f35" stroke-width="2"/>',
    // Langton Matravers: the stone village and its church tower on the slope, stone walls round the fields
    CLOUDS + '<path d="M0 190 L0 108 Q360 84 720 100 L720 190 Z" fill="#7fb35a"/>' + tower(330, 56, 42, 70, '#bcb3a0') + '<rect x="372" y="88" width="90" height="38" fill="#bcb3a0"/><path d="M368 90 L417 70 L466 90 Z" fill="#6f6a60"/>'
      + rep(5, (i) => house(40 + i * 60, 104, 46, 26, '#c9c0ad', '#6f6a60')) + rep(3, (i) => house(500 + i * 66, 100, 50, 26, '#c9c0ad', '#6f6a60')) + rep(3, (i) => '<path d="M0 ' + (150 + i * 14) + ' L720 ' + (146 + i * 14) + '" stroke="#b5ad98" stroke-width="3"/>'),
    // Durlston: the castle on the headland and the great stone globe on the cliff path, the lighthouse beyond
    CLOUDS + sea(124) + '<path d="M0 190 L0 92 Q300 80 560 96 L600 190 Z" fill="#6f9a4c"/><path d="M560 96 L600 190 L620 190 L578 98 Z" fill="#d9d3c4"/>'
      + '<rect x="150" y="62" width="130" height="34" fill="#cdbb95"/><rect x="250" y="48" width="30" height="48" fill="#c4b28b"/>' + rep(4, (i) => '<rect x="' + (250 + i * 8) + '" y="43" width="5" height="5" fill="#c4b28b"/>') + rep(4, (i) => '<rect x="' + (164 + i * 22) + '" y="72" width="10" height="12" fill="#7fb6d8"/>')
      + '<circle cx="430" cy="100" r="26" fill="#bdb6a6"/><path d="M406 96 Q430 84 454 96 M410 110 Q430 120 450 110 M430 74 Q414 100 430 126" stroke="#9a9384" stroke-width="2" fill="none"/><rect x="408" y="124" width="44" height="6" fill="#9a9384"/>'
      + '<rect x="660" y="96" width="12" height="26" fill="#f4f1ea"/><rect x="658" y="92" width="16" height="6" fill="#2b2b2b"/>',
    // Dancing Ledge: the flat rock shelf at the foot of the cliffs, its square swimming pool cut in the rock
    CLOUDS + sea(108) + '<path d="M0 190 L0 60 Q300 56 720 64 L720 112 Q500 100 360 116 L0 120 Z" fill="#d9cfb8"/><path d="M0 60 Q300 56 720 64 L720 74 Q300 66 0 70 Z" fill="#6f9a4c"/>'
      + '<path d="M120 130 L620 122 L680 150 L80 158 Z" fill="#cbbf9f"/><rect x="300" y="132" width="70" height="16" fill="#5fb0d8"/><rect x="300" y="132" width="70" height="3" fill="#b5ad98"/>' + rep(3, (i) => '<path d="M' + (140 + i * 180) + ' 80 L' + (150 + i * 180) + ' 110" stroke="#b5ad98" stroke-width="4"/>'),
    // Worth Matravers: the village pond with its ducks, the stone cottages round it
    CLOUDS + '<path d="M0 190 L0 110 Q360 92 720 106 L720 190 Z" fill="#7fb35a"/>' + rep(6, (i) => house(30 + i * 116, 92 - (i % 2) * 6, 70, 30, '#c9c0ad', '#6f6a60'))
      + '<ellipse cx="360" cy="156" rx="160" ry="22" fill="#5fb0d8"/>' + rep(4, (i) => '<ellipse cx="' + (290 + i * 44) + '" cy="' + (154 + (i % 2) * 6) + '" rx="8" ry="4" fill="' + ['#f4f1ea', '#8a6b4a'][i % 2] + '"/><circle cx="' + (296 + i * 44) + '" cy="' + (150 + (i % 2) * 6) + '" r="3" fill="' + ['#f4f1ea', '#2f6f3f'][i % 2] + '"/>'),
    // St Aldhelm's Head: the square stone chapel with the cross on its roof, the coastguard lookout on the cliff edge
    CLOUDS + sea(118) + '<path d="M0 190 L0 90 Q360 80 640 92 L680 190 Z" fill="#7fb35a"/><path d="M640 92 L680 190 L700 190 L656 94 Z" fill="#d9d3c4"/>'
      + '<rect x="240" y="64" width="80" height="60" fill="#c9c0ad"/><path d="M236 66 L280 42 L324 66 Z" fill="#a39a86"/><path d="M280 42 L280 26 M272 32 L288 32" stroke="#a39a86" stroke-width="4"/><path d="M272 124 L272 104 Q280 94 288 104 L288 124 Z" fill="#6b5a44"/>'
      + '<rect x="520" y="70" width="40" height="24" fill="#f4f1ea"/><rect x="516" y="66" width="48" height="6" fill="#6f6a60"/><rect x="526" y="76" width="28" height="8" fill="#7fb6d8"/>',
    // Chapman's Pool: the round little cove under the dark cliffs, the fishermen's huts at the water's edge
    CLOUDS + '<path d="M0 190 L0 54 Q120 50 220 90 Q360 150 500 90 Q600 50 720 56 L720 190 Z" fill="#6b6255"/><path d="M0 54 Q120 50 220 90 Q360 150 500 90 Q600 50 720 56 L720 64 Q600 58 500 98 Q360 158 220 98 Q120 58 0 62 Z" fill="#6f9a4c"/>'
      + '<path d="M220 100 Q360 160 500 100 L500 190 L220 190 Z" fill="#3aa3c9"/>' + rep(3, (i) => '<rect x="' + (300 + i * 36) + '" y="' + (128 - (i === 1 ? 4 : 0)) + '" width="26" height="16" fill="#f4f1ea"/><path d="M' + (298 + i * 36) + ' ' + (129 - (i === 1 ? 4 : 0)) + ' L' + (313 + i * 36) + ' ' + (120 - (i === 1 ? 4 : 0)) + ' L' + (328 + i * 36) + ' ' + (129 - (i === 1 ? 4 : 0)) + ' Z" fill="#2f5d6a"/>') + boat(420, 160, '#e94f4f', null),
    // Kimmeridge Bay: the round Clavell Tower on the cliff above the flat rock ledges, the evening sun
    sun(560, 70, 32) + down(10, sea(116) + '<path d="M0 190 L0 76 Q200 70 380 84 L420 190 Z" fill="#5a5448"/><path d="M0 76 Q200 70 380 84 L384 92 Q200 78 0 84 Z" fill="#6f9a4c"/>'
      + '<rect x="200" y="36" width="30" height="42" fill="#d8c8a8"/><path d="M196 38 L234 38 L230 30 L200 30 Z" fill="#c4b28b"/>' + rep(3, (i) => '<rect x="' + (206 + i * 8) + '" y="44" width="4" height="10" fill="#6b5a44"/>') + '<rect x="196" y="76" width="38" height="5" fill="#c4b28b"/>'
      + rep(4, (i) => '<path d="M' + (420 + i * 70) + ' ' + (150 + i * 6) + ' L' + (480 + i * 70) + ' ' + (148 + i * 6) + '" stroke="#6b6255" stroke-width="6" stroke-linecap="round"/>')),
    // Tyneham: the empty village in the valley, the old stone cottages without their roofs, the red phone box
    CLOUDS + '<path d="M0 124 Q160 60 340 80 Q520 60 720 110 L720 136 L0 136 Z" fill="#6c9b4b"/>' + fields
      + rep(4, (i) => '<path d="M' + (90 + i * 120) + ' 136 L' + (90 + i * 120) + ' 104 L' + (120 + i * 120) + ' 86 L' + (150 + i * 120) + ' 104 L' + (150 + i * 120) + ' 136 Z" fill="#c9c0ad"/><rect x="' + (104 + i * 120) + '" y="108" width="10" height="12" fill="#4a463e"/><rect x="' + (126 + i * 120) + '" y="108" width="10" height="12" fill="#4a463e"/>')
      + tower(600, 78, 34, 58, '#bcb3a0') + '<rect x="560" y="112" width="14" height="26" fill="#c62828"/><rect x="562" y="116" width="10" height="16" fill="#e57373"/>' + tree(40, 110, 22, '#3f6f34'),
  ],
};
module.exports = { hearts: HEARTS, gin: GIN, cribbage: CRIBBAGE, whist: WHIST };
