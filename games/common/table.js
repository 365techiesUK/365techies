/* 365 Games - the card table shared by Solitaire, FreeCell and Spider (3 Oct 2026; Solitaire's screen made general).
 * A game page loads its rules (engine.js), its deal list, its layout file (which calls Table365.start(def)) and this.
 * This file does everything a card game looks and feels like: the bar and buttons, real card elements moved with CSS
 * transforms (dealing, 3D flips, flying to the piles), tap-to-move and drag, Undo, Hint, "No more moves", moving cards
 * up by themselves, the automatic finish, the bouncing-cards win, sounds made on the spot, the pop-up sheets, personal
 * scores, Today's deal and saving the game in this browser. Nothing is sent anywhere.
 *
 * The game's def supplies: id, store (localStorage prefix), title, cards (52/104), face(c, S) -> {r, s}, E (rules:
 * deal, clone, legal, apply, smartMove, hint, stuck, optional finishable/finishStep), layout(W, H, S) -> L {cw, ch,
 * slots: [{key, x, y, cls, text}]}, positions(S, L) -> {card: {x, y, z, up, pile}}, where(S, c) -> {p:'stock'} | from |
 * null, picked(S, from), targets(S, from, L, P) -> [{to, x, y}], dealOrder(S), deckPos(L), cascade(S, L) -> [{c, x, y}],
 * hintLights(S, m) -> {cards, slots}, optional: variant, deals(v), daily(v), autoNext(S, keepDown), slotHtml(key, S),
 * winBonus(S, secs), describe(S), help, valid(s), faceKey(S), noTap(from), bestLabel(v), whyNot(S, from, to|null) and
 * cantPick(S, c) - a plain-words reason when a move is refused or a card won't lift.
 * Pyramid (4 Oct 2026): pairs: true - a tap picks a card up and a second tap on its partner plays the pair (a King, or
 * anything E.smartMove takes on its own, goes at once); partnerCards(S, from) -> the cards that would go with it (they
 * glow when the level allows a Hint), pickSay(S, from) -> what to tell the player. An fx with big: true (a peak or a
 * row cleared) gets the big burst.
 * Every timed step checks `gen` (bumped by a new game, or Undo while cards are still moving) and stops if it changed. */
(function () {
  'use strict';

  var SUIT_CH = ['♠', '♥', '♦', '♣'];
  var RANK_CH = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  var TXT = '︎';   // keep the suit signs as plain text, never coloured emoji
  var PIPS = {
    2: [[50, 0], [50, 100]], 3: [[50, 0], [50, 50], [50, 100]], 4: [[0, 0], [100, 0], [0, 100], [100, 100]],
    5: [[0, 0], [100, 0], [50, 50], [0, 100], [100, 100]], 6: [[0, 0], [100, 0], [0, 50], [100, 50], [0, 100], [100, 100]],
    7: [[0, 0], [100, 0], [50, 25], [0, 50], [100, 50], [0, 100], [100, 100]],
    8: [[0, 0], [100, 0], [50, 25], [0, 50], [100, 50], [50, 75], [0, 100], [100, 100]],
    9: [[0, 0], [100, 0], [0, 33.3], [100, 33.3], [50, 50], [0, 66.7], [100, 66.7], [0, 100], [100, 100]],
    10: [[0, 0], [100, 0], [50, 16.7], [0, 33.3], [100, 33.3], [0, 66.7], [100, 66.7], [50, 83.3], [0, 100], [100, 100]]
  };
  var COURT = {   // a plume for the Jack, a tiara for the Queen, a crown for the King
    11: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20c1.5-7 6-12.5 15-15-2.5 2.6-3.8 5.2-4.3 8.4L18 14c-5.2.2-9.6 2-14 6z"/><circle cx="19" cy="4.6" r="1.7"/></svg>',
    12: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 17 5.4 8.6l4 3.9L12 6.5l2.6 6 4-3.9L20 17z"/><circle cx="5.4" cy="7" r="1.5"/><circle cx="12" cy="4.6" r="1.5"/><circle cx="18.6" cy="7" r="1.5"/><rect x="4" y="18.2" width="16" height="2.4" rx="1"/></svg>',
    13: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17.2 4.2 6.8l4.6 4.3L12 3.6l3.2 7.5 4.6-4.3L21 17.2z"/><rect x="3" y="18.4" width="18" height="2.8" rx="1"/></svg>'
  };
  var RECYCLE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 0 1 15.4-6.4L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.4 6.4L3 16"/><path d="M3 21v-5h5"/></svg>';
  var ICON = {
    app: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M12 8.5v6M9 11.5h6"/><path d="M10.5 18.5h3"/></svg>',
    flame: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12.7 2c.5 2.7-.5 4.5-2 6.2-1.6 1.8-3.6 3.6-3.6 6.7 0 3.6 2.6 6.6 5.8 6.6s5.8-2.8 5.8-6.3c0-2.8-1.4-4.5-2.5-5.9-.2 1.4-.8 2.4-1.9 3 .4-4-.6-7.5-1.6-10.3zM12.3 21c-1.6 0-2.8-1.4-2.8-3.1 0-1.8 1.4-2.8 2.3-4.1.4 1 1.1 1.6 1.9 1.9.1-.5.1-1 0-1.5 1 .9 1.6 2 1.6 3.4 0 1.9-1.3 3.4-3 3.4z"/></svg>',
    more: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2.2"/><circle cx="12" cy="12" r="2.2"/><circle cx="19" cy="12" r="2.2"/></svg>',
    'new': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="3" width="11" height="15" rx="2"/><path d="M9 21h9a2 2 0 0 0 2-2V8"/><path d="M9.5 8v5M7 10.5h5"/></svg>',
    undo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>',
    hint: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V16h5.2v-.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/></svg>',
    stats: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/></svg>',
    set: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
    help: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><path d="M9.2 9.2a2.9 2.9 0 0 1 5.6 1c0 1.9-2.8 2.6-2.8 4.3M12 17.6h.01"/></svg>',
    games: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.6"/></svg>',
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="19" r="2.6"/><path d="m8.3 10.8 7.4-4.3M8.3 13.2l7.4 4.3"/></svg>',
    feedback: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5a2.5 2.5 0 0 1-2.5 2.5H9l-5 4V6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5z"/><path d="M9 9.5h.01M15 9.5h.01M9.2 12.6a3.6 3.6 0 0 0 5.6 0"/></svg>',
    full: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"/></svg>'
  };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); }

  // ---------------------------------------------------------------- the picture cards (5 Oct 2026; owner: "yes do the
  // richer picture cards next"). Our own court figures, drawn here so they are sharp at any size: each a half-length
  // figure in its suit's colours (hearts crimson, diamonds royal blue, spades navy, clubs forest green) with its suit
  // on a cream panel down the robe. The King: beard, jewelled crown, ermine collar, sceptre. The Queen: long hair,
  // tiara, necklace, a rose. The Jack: feathered cap, a staff with a pennant. Every one of the twelve has its own hair.
  // The corner index stays big, so the cards still read at a glance in a column.
  var GOLD = '#d9a520', GOLD_D = '#9c7210', SKIN = '#f2cfae', LINE = '#3a2a1a';
  var ROBE = ['#2b3a6b', '#b3202f', '#2a5aa8', '#2e6b3a'], ROBE_D = ['#1b264a', '#7e1420', '#1c3f7a', '#1d4a26'];
  var JEWEL = ['#2f8fcf', '#2f6fbf', '#d13b3b', '#d13b3b'], INK = ['#17191f', '#c6152f', '#c6152f', '#17191f'];
  var HAIR = { 13: ['#4a4a4a', '#e9e4da', '#7a4a24', '#a85a2a'], 12: ['#2b2118', '#d9a441', '#8a3b1e', '#5a3a22'], 11: ['#3a2a1c', '#c88a3a', '#2b2118', '#b5652e'] };
  var SUIT_PATH = [
    'M5 0C7 3 10 4 10 6.5A2.3 2.3 0 0 1 6 7.6L6.8 10H3.2L4 7.6A2.3 2.3 0 0 1 0 6.5C0 4 3 3 5 0Z',
    'M5 9.6C2 7.4 0 5.4 0 3.2A2.6 2.6 0 0 1 5 2.2A2.6 2.6 0 0 1 10 3.2C10 5.4 8 7.4 5 9.6Z',
    'M5 0L9 5L5 10L1 5Z',
    'M5 .4A2.3 2.3 0 1 1 5 5A2.3 2.3 0 1 1 5 .4ZM2.6 3.6A2.3 2.3 0 1 1 2.6 8.2A2.3 2.3 0 1 1 2.6 3.6ZM7.4 3.6A2.3 2.3 0 1 1 7.4 8.2A2.3 2.3 0 1 1 7.4 3.6ZM4.3 6.2H5.7L6.6 10H3.4Z'];
  function courtArt(r, s, ns) {
    var robe = ROBE[s], robeD = ROBE_D[s], hair = HAIR[r][s], jw = JEWEL[s], o = ' stroke="' + LINE + '" stroke-width=".6"';
    var g = '<rect width="64" height="72" fill="#fbf3dc"/><circle cx="32" cy="27" r="22" fill="' + GOLD + '" opacity=".14"/>'
      + rep(6, function (i) { return '<path d="M' + (i * 12 - 4) + ' 0 L' + (i * 12 + 8) + ' 72" stroke="' + robe + '" stroke-width=".5" opacity=".12"/>'; });
    // the item held at the side, behind the figure's hand
    if (r === 13) g += '<path d="M12 72 L19.4 34" stroke="' + GOLD_D + '" stroke-width="2.8" stroke-linecap="round"/><path d="M12 72 L19.4 34" stroke="' + GOLD + '" stroke-width="1.8" stroke-linecap="round"/>'
      + '<circle cx="19.8" cy="31.6" r="2.7" fill="' + GOLD + '"' + o + '/><path d="M19.8 26.6V29M18.6 27.6H21" stroke="' + GOLD_D + '" stroke-width=".9"/>';
    else if (r === 12) g += '<path d="M13 72 C14 60 16 50 18.4 40" stroke="#3f7a3a" stroke-width="1.5" fill="none"/><path d="M15.4 55 C11 53 10 50 10.5 48 C13.5 49 15 51.5 15.4 55Z" fill="#4f8f45"/>'
      + '<circle cx="18.6" cy="37.4" r="3.6" fill="#d63a4a"' + o + '/><path d="M16.8 37.2 Q18.6 35 20.4 37.4 Q18.6 39.6 17.4 37.8" stroke="#8e1d2c" stroke-width=".7" fill="none"/>';
    else g += '<path d="M13 72 L17.2 29" stroke="#6b4423" stroke-width="2" stroke-linecap="round"/><path d="M17.3 29.4 L29 32.6 L17.8 36.6Z" fill="' + robe + '"' + o + '/>'
      + '<path transform="translate(19.6 31.2) scale(.42)" d="' + SUIT_PATH[s] + '" fill="#fbf3dc"/>';
    // the robe, its cream panel with the suit, and the collar
    g += '<path d="M5 72 C7 53 17 43 32 43 C47 43 57 53 59 72Z" fill="' + robe + '"' + o + '/>'
      + '<path d="M9 72 C11 58 17 50 24 46 L23 72Z M55 72 C53 58 47 50 40 46 L41 72Z" fill="' + robeD + '" opacity=".55"/>'
      + '<path d="M26.5 45 L37.5 45 L40 72 L24 72Z" fill="#f5ead0" stroke="' + GOLD + '" stroke-width="1"/>'
      + '<path transform="translate(27.4 49.6) scale(.92)" d="' + SUIT_PATH[s] + '" fill="' + INK[s] + '"/>'
      + rep(3, function (i) { return '<circle cx="' + (29 + i * 3) + '" cy="61.4" r=".8" fill="' + GOLD + '"/>'; })
      + '<rect x="29" y="36" width="6" height="8" fill="' + SKIN + '"/>';
    if (r === 13) g += '<path d="M13 52 C17 45 24 42.5 32 42.5 C40 42.5 47 45 51 52 C45 48.5 39 47 32 47 C25 47 19 48.5 13 52Z" fill="#fbfaf4"' + o + '/>'
      + [[19, 48.6], [25, 46.4], [32, 46], [39, 46.4], [45, 48.6]].map(function (p) { return '<path d="M' + p[0] + ' ' + p[1] + 'l.7 1.8 -.7 -.5 -.7 .5z" fill="#1a1a1a"/>'; }).join('');
    else if (r === 12) g += '<path d="M20 47 C24 44 28 43.2 32 43.2 C36 43.2 40 44 44 47" stroke="' + GOLD + '" stroke-width="2" fill="none"/>';
    else g += '<path d="M22 46.5 C25 44 28.5 43.3 32 43.3 C35.5 43.3 39 44 42 46.5" stroke="' + GOLD + '" stroke-width="1.6" fill="none"/>';
    // the hand on the item
    g += '<circle cx="' + (r === 12 ? 15.6 : 15.2) + '" cy="' + (r === 12 ? 56 : 52) + '" r="2.5" fill="' + SKIN + '"' + o + '/>';
    // the Queen's long hair falls behind the face
    if (r === 12) g += '<path d="M22.5 28 C22 17 26.5 14.5 32 14.5 C37.5 14.5 42 17 41.5 28 C41.5 35 43 39 44.5 43 L37 41.5 C39 36 39.6 31 39.4 27 C38 21.5 26 21.5 24.6 27 C24.4 31 25 36 27 41.5 L19.5 43 C21 39 22.5 35 22.5 28Z" fill="' + hair + '"' + o + '/>';
    // the face
    g += '<ellipse cx="32" cy="27.5" rx="8.4" ry="9.4" fill="' + SKIN + '"' + o + '/>'
      + '<circle cx="28.8" cy="26.8" r=".95" fill="#2b2b2b"/><circle cx="35.2" cy="26.8" r=".95" fill="#2b2b2b"/>'
      + '<path d="M27.3 24.6 Q28.8 23.8 30.2 24.5M33.8 24.5 Q35.2 23.8 36.7 24.6" stroke="' + (r === 13 && s === 1 ? '#9a9488' : hair) + '" stroke-width=".8" fill="none"/>'
      + '<path d="M32 27.6 L31.1 30.4 L32.7 30.5" stroke="#c99a78" stroke-width=".7" fill="none"/>'
      + '<circle cx="27.4" cy="30.4" r="1.6" fill="#e9827a" opacity=".35"/><circle cx="36.6" cy="30.4" r="1.6" fill="#e9827a" opacity=".35"/>'
      + '<path d="M30 32.6 Q32 34 34 32.6" stroke="' + (r === 12 ? '#c0392b' : '#9a3b3b') + '" stroke-width="' + (r === 12 ? 1.1 : .8) + '" fill="none"/>';
    if (r === 13) g += '<path d="M23.6 28.5 C23.8 37 28 41.5 32 41.5 C36 41.5 40.2 37 40.4 28.5 C38.4 32.6 35.6 34 32 34 C28.4 34 25.6 32.6 23.6 28.5Z" fill="' + hair + '"' + o + '/>'
      + '<path d="M27.8 31.7 Q32 29.8 36.2 31.7 Q32 33.1 27.8 31.7Z" fill="' + hair + '"/>'
      + '<path d="M23.5 27.5 C23.3 19 27 15.6 32 15.6 C37 15.6 40.7 19 40.5 27.5 L39 24 C37 20.6 27 20.6 25 24Z" fill="' + hair + '"' + o + '/>'
      + '<rect x="23" y="13.4" width="18" height="4.4" rx=".8" fill="' + GOLD + '"' + o + '/><path d="M23 13.6 L24.5 5.6 L28 10.6 L32 3.6 L36 10.6 L39.5 5.6 L41 13.6Z" fill="' + GOLD + '"' + o + '/>'
      + '<circle cx="24.5" cy="5.4" r="1.1" fill="' + GOLD + '"/><circle cx="32" cy="3.4" r="1.2" fill="' + GOLD + '"/><circle cx="39.5" cy="5.4" r="1.1" fill="' + GOLD + '"/>'
      + '<circle cx="32" cy="15.6" r="1.4" fill="' + jw + '"/><circle cx="26.6" cy="15.6" r=".9" fill="#fff"/><circle cx="37.4" cy="15.6" r=".9" fill="#fff"/>';
    else if (r === 12) g += '<path d="M24.2 25 C25 18.6 28 17 32 17 C36 17 39 18.6 39.8 25 C37.5 21.5 35 20.6 32 20.6 C29 20.6 26.5 21.5 24.2 25Z" fill="' + hair + '"/>'
      + '<path d="M24.6 17.2 L26.2 10.8 L29.2 14.2 L32 8.6 L34.8 14.2 L37.8 10.8 L39.4 17.2Z" fill="' + GOLD + '"' + o + '/><circle cx="32" cy="13.8" r="1.3" fill="' + jw + '"/>'
      + '<circle cx="26.2" cy="10.4" r=".9" fill="#fff"/><circle cx="32" cy="8.2" r=".9" fill="#fff"/><circle cx="37.8" cy="10.4" r=".9" fill="#fff"/>'
      + '<path d="M27.4 41.6 Q32 45.4 36.6 41.6" stroke="' + GOLD + '" stroke-width="1.1" fill="none"/><circle cx="32" cy="44.6" r="1.3" fill="' + jw + '" stroke="' + GOLD + '" stroke-width=".5"/>';
    else g += '<path d="M23.6 26.4 C23.6 18.8 27.6 16.2 32 16.2 C36.4 16.2 40.4 18.8 40.4 26.4 C39.4 23.2 36.8 21.8 32 21.8 C27.2 21.8 24.6 23.2 23.6 26.4Z" fill="' + hair + '"' + o + '/>'
      + '<path d="M38.4 13.6 C44 8.4 50 6 57 4 C52 9.4 46 12.6 40.4 14.6Z" fill="#fbfaf4"' + o + '/><path d="M40 14.2 C46 10 51 7.4 56 4.6" stroke="#b9b2a2" stroke-width=".5" fill="none"/>'
      + '<path d="M21.4 19.4 C21.8 13 27 10.4 33 10.4 C40 10.4 44.2 13.6 43.6 17.2 C40 18.8 30 19.8 21.4 19.4Z" fill="' + robe + '"' + o + '/>'
      + '<path d="M21.9 18.9 Q32 20.6 43.2 17.2" stroke="' + GOLD + '" stroke-width="1.4" fill="none"/><circle cx="38.6" cy="17.8" r="1.1" fill="' + jw + '"/>';
    return '<svg' + (ns ? ' xmlns="http://www.w3.org/2000/svg" width="52" height="64"' : '') + ' viewBox="6 0 52 64" preserveAspectRatio="xMidYMin slice" aria-hidden="true">' + g + '</svg>';
  }
  function rep(n, f) { var o = ''; for (var i = 0; i < n; i++) o += f(i); return o; }
  // the same picture for the bouncing-cards finish (drawn on a canvas): loaded once, as an image
  var ARTIMG = {};
  function artImg(r, s) {
    var k = r + '_' + s;
    if (!ARTIMG[k]) { var im = new Image(); im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(courtArt(r, s, true)); ARTIMG[k] = im; }
    return ARTIMG[k];
  }


  // ---------------------------------------------------------------- a card as a picture (for the canvas finishes),
  // shared by both card engines: the same paper, border, corners and centre as the real cards
  var PAINTED = {};
  function paintCard(r, s, w, h) {
    var key = r + '_' + s + '_' + w + '_' + h; if (PAINTED[key]) return PAINTED[key];
    var dpr = Math.min(2, window.devicePixelRatio || 1), cv = document.createElement('canvas'), keep = true;
    cv.width = Math.ceil(w * dpr); cv.height = Math.ceil(h * dpr);
    var x = cv.getContext('2d'); x.scale(dpr, dpr);
    var rad = w * 0.08, su = SUIT_CH[s] + TXT, red = s === 1 || s === 2, ink = red ? '#c6152f' : '#17191f';
    function rr(ix, iy, iw, ih, ra) { x.beginPath(); x.moveTo(ix + ra, iy); x.arcTo(ix + iw, iy, ix + iw, iy + ih, ra); x.arcTo(ix + iw, iy + ih, ix, iy + ih, ra); x.arcTo(ix, iy + ih, ix, iy, ra); x.arcTo(ix, iy, ix + iw, iy, ra); x.closePath(); }
    var pg = x.createRadialGradient(w * 0.3, h * 0.12, 0, w * 0.3, h * 0.12, h);
    pg.addColorStop(0, '#ffffff'); pg.addColorStop(0.45, '#fffdf8'); pg.addColorStop(1, '#f1ebdc');
    rr(0.5, 0.5, w - 1, h - 1, rad); x.fillStyle = pg; x.fill(); x.strokeStyle = '#bdb7a6'; x.lineWidth = 1; x.stroke();
    rr(w * 0.035, w * 0.035, w - w * 0.07, h - w * 0.07, rad * 0.7); x.strokeStyle = 'rgba(0,0,0,0.08)'; x.stroke();
    x.fillStyle = ink; x.textBaseline = 'top'; x.textAlign = 'left';
    x.font = '700 ' + Math.round(w * 0.32) + 'px Archivo, Arial, sans-serif'; x.fillText(RANK_CH[r], w * 0.05, h * 0.03);
    x.textAlign = 'right'; x.font = Math.round(w * 0.29) + 'px "Segoe UI Symbol", Arial, sans-serif'; x.fillText(su, w * 0.95, h * 0.03);
    x.save(); x.translate(w * 0.9, h * 0.95); x.rotate(Math.PI); x.textAlign = 'center'; x.textBaseline = 'top';
    x.font = '700 ' + Math.round(w * 0.14) + 'px Archivo, Arial, sans-serif'; x.fillText(RANK_CH[r], 0, 0);
    x.font = Math.round(w * 0.13) + 'px "Segoe UI Symbol", Arial, sans-serif'; x.fillText(su, 0, w * 0.15); x.restore();
    x.textAlign = 'center'; x.textBaseline = 'middle';
    if (r > 10) {   // the picture in its gold frame (the letter until the picture has loaded - and then not kept)
      var fx0 = w * 0.12, fy0 = h * 0.31, fw = w * 0.76, fh = h * 0.62, im = artImg(r, s);
      x.save(); rr(fx0, fy0, fw, fh, w * 0.05); x.clip();
      if (im.complete && im.naturalWidth) { var sc = Math.max(fw / 52, fh / 64); x.drawImage(im, fx0 + (fw - 52 * sc) / 2, fy0, 52 * sc, 64 * sc); }
      else { keep = false; x.fillStyle = '#fbf3dc'; x.fillRect(fx0, fy0, fw, fh); x.fillStyle = ink; x.font = '700 ' + Math.round(w * 0.4) + 'px Georgia, serif'; x.fillText(RANK_CH[r], w / 2, h * 0.58); }
      x.restore();
      rr(fx0, fy0, fw, fh, w * 0.05); x.lineWidth = w * 0.022; x.strokeStyle = '#c9a227'; x.stroke();
    } else { x.fillStyle = ink; x.font = Math.round(w * 0.56) + 'px "Segoe UI Symbol", Arial, sans-serif'; x.fillText(su, w / 2, h * 0.64); }
    if (keep) PAINTED[key] = cv;
    return cv;
  }

  // ---------------------------------------------------------------- the win celebrations (5 Oct 2026; owner: "do the
  // win celebrations ... make it the ultimate"). Five finishes on a canvas over the table; Settings > Win celebration
  // picks one, or "Surprise me" (a different one each time). A tap or a key ends it early.
  //   bounce   - the classic: the cards leap off the piles and bounce away, leaving trails
  //   fountain - they shoot up from the piles in a fountain, spinning, and fall away
  //   whirl    - they spiral out round the middle of the table like a galaxy
  //   rain     - they fly off the top, then flutter down like leaves
  //   rockets  - each card launches like a rocket and bursts into sparks in its suit's colours
  var FINALES = ['bounce', 'fountain', 'whirl', 'rain', 'rockets'];
  var FINALE_NAMES = [['mix', 'Surprise me'], ['bounce', 'Bouncing cards'], ['fountain', 'Card fountain'], ['whirl', 'Card whirl'], ['rain', 'Card rain'], ['rockets', 'Firework cards']];
  function pickFinale(want) {
    if (FINALES.indexOf(want) >= 0) return want;
    var last = ''; try { last = localStorage.getItem('cards365:lastwin') || ''; } catch (e) {}
    var opts = FINALES.filter(function (k) { return k !== last; }), k = opts[Math.floor(Math.random() * opts.length)];
    try { localStorage.setItem('cards365:lastwin', k); } catch (e) {}
    return k;
  }
  // o: { cards: [{r, s, x, y}] (where each card starts, page px), cw, ch, cv / tip (the canvas and its "tap" line - made
  // here if not given), hide(i) (a card leaves the table), show() (the end: put the table back), burst(x, y, cols, big),
  // trail(x, y, cols), sfx(name), done() }
  function finale(kind, o) {
    var W = window.innerWidth, H = window.innerHeight, dpr = Math.min(2, window.devicePixelRatio || 1), k = o.cw / 90, cw = o.cw, ch = o.ch;
    var made = !o.cv, cv = o.cv || document.createElement('canvas'), tip = o.tip || document.createElement('div');
    if (made) {
      cv.style.cssText = 'position:fixed;inset:0;z-index:4500;cursor:pointer'; document.body.appendChild(cv);
      tip.style.cssText = 'position:fixed;left:50%;bottom:22px;z-index:4600;transform:translateX(-50%);padding:8px 16px;border-radius:999px;background:rgba(0,0,0,.55);color:#fff;font:700 15px Archivo,"Segoe UI",sans-serif;pointer-events:none';
      tip.textContent = 'Tap to carry on'; document.body.appendChild(tip);
    }
    tip.hidden = true;
    cv.hidden = false; cv.classList.add('on'); cv.style.opacity = '1'; cv.style.transition = '';
    cv.width = Math.ceil(W * dpr); cv.height = Math.ceil(H * dpr); cv.style.width = W + 'px'; cv.style.height = H + 'px';
    var ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    var q = o.cards.map(function (c, i) { return { i: i, r: c.r, s: c.s, x: c.x, y: c.y }; }), live = [], ended = false, last = -1e9, fr = 0;
    var many = q.length > 60, every = { bounce: many ? 115 : 230, fountain: many ? 34 : 62, whirl: many ? 16 : 28, rain: many ? 14 : 26, rockets: many ? 150 : 240 }[kind] || 200;
    var CX = W / 2, CY = H * 0.46, RED = ['#ff5a6e', '#ffd257', '#ffffff', '#ff9ad0'], BLK = ['#8ff0ff', '#ffffff', '#b9a6ff', '#9dff9a'];
    setTimeout(function () { if (!ended) tip.hidden = false; }, 1200);
    function spawn(n, now) {
      if (o.hide) o.hide(n.i);
      var p = { n: n, x: n.x, y: n.y, born: now, ph: Math.random() * 6.283, img: paintCard(n.r, n.s, cw, ch) };
      if (kind === 'bounce') { p.vx = (Math.random() < 0.5 ? -1 : 1) * (2.5 + Math.random() * 5) * k; p.vy = -(1 + Math.random() * 7) * k; }
      else if (kind === 'fountain') { p.vx = (Math.random() - 0.5) * 7 * k; p.vy = -(9 + Math.random() * 6) * k; p.spin = (Math.random() - 0.5) * 0.24; p.rot = 0; }
      else if (kind === 'whirl') { p.sx = n.x; p.sy = n.y; p.th = Math.atan2(n.y + ch / 2 - CY, n.x + cw / 2 - CX); p.r0 = Math.min(W, H) * 0.06 + Math.random() * 24; }
      else if (kind === 'rain') { p.vy = -(13 + Math.random() * 5) * k; p.vx = (Math.random() - 0.5) * 3 * k; p.up = true; }
      else { p.vx = (Math.random() - 0.5) * 3.2 * k; p.vy = -(10.5 + Math.random() * 4) * k; }
      live.push(p);
    }
    function draw(p, rot, sx) {
      ctx.save(); ctx.translate(p.x + cw / 2, p.y + ch / 2);
      if (rot) ctx.rotate(rot);
      if (sx != null) ctx.scale(Math.max(0.06, Math.abs(sx)), 1);
      ctx.drawImage(p.img, -cw / 2, -ch / 2, cw, ch); ctx.restore();
    }
    function frame(now) {
      if (ended) return;
      fr++;
      if (q.length && now - last > every) { last = now; spawn(q.shift(), now); if (kind === 'rockets' && q.length) spawn(q.shift(), now); }
      if (kind !== 'bounce') {   // the classic leaves trails for ever; the others fade theirs
        ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = 'rgba(0,0,0,' + (kind === 'rain' ? 0.55 : kind === 'whirl' ? 0.22 : 0.35) + ')'; ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = 'source-over';
      }
      live = live.filter(function (p) {
        var a = now - p.born;
        if (kind === 'bounce') {
          p.vy += 0.42 * k; p.x += p.vx; p.y += p.vy;
          if (p.y + ch > H) { p.y = H - ch; p.vy = -p.vy * 0.8; }
          ctx.drawImage(p.img, p.x, p.y, cw, ch);
          return p.x > -cw - 4 && p.x < W + 4;
        }
        if (kind === 'fountain') {
          p.vy += 0.33 * k; p.x += p.vx; p.y += p.vy; p.rot += p.spin;
          draw(p, p.rot, Math.cos(p.ph + a * 0.006));
          return p.y < H + ch && p.x > -cw * 2 && p.x < W + cw;
        }
        if (kind === 'whirl') {
          var th = p.th + a * 0.0024, rr = p.r0 + a * 0.15 * Math.max(0.7, k), e = Math.min(1, a / 700), ee = 1 - Math.pow(1 - e, 3);
          var tx = CX + Math.cos(th) * rr - cw / 2, ty = CY + Math.sin(th) * rr * 0.82 - ch / 2;
          p.x = p.sx + (tx - p.sx) * ee; p.y = p.sy + (ty - p.sy) * ee;
          draw(p, (th + Math.PI / 2) * ee);
          return rr < Math.max(W, H) * 0.9;
        }
        if (kind === 'rain') {
          if (p.up) {
            p.y += p.vy; p.x += p.vx; draw(p, p.vx * 0.05);
            if (p.y < -ch * 1.3) { p.up = false; p.base = Math.random() * (W - cw); p.y = -ch - Math.random() * H * 0.7; p.vy = (1.6 + Math.random() * 1.8) * Math.max(0.8, k); }
            return true;
          }
          var t = now * 0.001;
          p.y += p.vy; p.x = p.base + Math.sin(t * 1.7 + p.ph) * 34 * Math.max(0.8, k);
          draw(p, Math.sin(t * 1.3 + p.ph) * 0.5, Math.cos(t * 2.2 + p.ph));
          return p.y < H + 10;
        }
        // rockets: up, a glowing trail, and at the top a burst in the suit's colours
        p.vy += 0.3 * k; p.x += p.vx; p.y += p.vy;
        var cols = p.n.s === 1 || p.n.s === 2 ? RED : BLK;
        if (o.trail && fr % 2 === 0) o.trail(p.x + cw / 2, p.y + ch, cols);
        if (p.vy > -0.7 * k) { if (o.burst) o.burst(p.x + cw / 2, p.y + ch / 2, cols, true); if (o.sfx && fr % 2 === 0) o.sfx('firework'); return false; }
        draw(p, p.vx * 0.04);
        return true;
      });
      if (!q.length && !live.length) { end(); return; }
      requestAnimationFrame(frame);
    }
    function end() {
      if (ended) return; ended = true;
      cv.classList.remove('on'); tip.hidden = true;
      cv.style.transition = 'opacity .45s'; cv.style.opacity = '0';
      document.removeEventListener('keydown', end);
      setTimeout(function () {
        cv.hidden = true; ctx.clearRect(0, 0, W, H);
        if (made) { cv.remove(); tip.remove(); }
        if (o.show) o.show();
        if (o.done) o.done();
      }, 460);
    }
    cv.onclick = end;
    document.addEventListener('keydown', end);
    setTimeout(end, o.max || 30000);   // a real win fades out by o.max (9 s: critic 3 - 13 to 17 s was a long wait for the score)
    requestAnimationFrame(frame);
    return end;
  }
  // a whole pack spread in the middle of the screen, for a finish with no table under it (a match won, "Watch")
  function packAtCentre(cw, ch) {
    var out = [], W = window.innerWidth, H = window.innerHeight;
    for (var i = 0; i < 52; i++) { var a = i / 52 * Math.PI * 2; out.push({ r: (i % 13) + 1, s: Math.floor(i / 13), x: W / 2 - cw / 2 + Math.cos(a) * cw * 0.9, y: H * 0.46 - ch / 2 + Math.sin(a) * ch * 0.5 }); }
    for (var j = out.length - 1; j > 0; j--) { var r = Math.floor(Math.random() * (j + 1)), t = out[j]; out[j] = out[r]; out[r] = t; }
    return out;
  }
  // numbers that count up on a win card (the last one bumps)
  function countUp(el, to, done) {
    if (!el) return;
    var reduceM = (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) || !!(window.A11y365 && A11y365.reduce()), txt = String(to), m = /\d[\d,]*/.exec(txt);
    if (!m || reduceM) { el.textContent = txt; return; }
    var n = +m[0].replace(/,/g, ''), pre = txt.slice(0, m.index), post = txt.slice(m.index + m[0].length), t0 = 0, dur = Math.min(1200, 500 + n * 2);
    if (n < 2) { el.textContent = txt; return; }
    function f(now) {
      if (!t0) t0 = now;
      var e = Math.min(1, (now - t0) / dur), v = Math.round(n * (1 - Math.pow(1 - e, 3)));
      el.textContent = pre + (m[0].indexOf(',') >= 0 ? v.toLocaleString('en-GB') : v) + post;
      if (e < 1) requestAnimationFrame(f); else { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); if (done) done(); }
    }
    el.textContent = pre + '0' + post;
    requestAnimationFrame(f);
  }

  // one card's face and back, as classes and inner markup (shared with games/common/rivals.js, 5 Oct 2026)
  function cardMarkup(r, s) {
    var su = SUIT_CH[s] + TXT, red = s === 1 || s === 2, mid;
    if (r === 1) mid = '<div class="ace">' + su + (s === 0 ? '<i>365</i>' : '') + '</div>';
    else if (r > 10) mid = '<div class="court art">' + courtArt(r, s) + '</div>';
    else mid = '<div class="pips">' + PIPS[r].map(function (p) {
      return '<span class="pip' + (p[1] > 50 ? ' dn' : '') + '" style="left:' + p[0] + '%;top:' + p[1] + '%">' + su + '</span>';
    }).join('') + '</div>';
    return { cls: (red ? 'red' : 'blk') + ' r' + r, html: '<div class="wig"><div class="flip"><div class="face front"><span class="idx' + (r === 10 ? ' ten' : '') + '">' + RANK_CH[r]
      + '</span><span class="sui">' + su + '</span><span class="su2">' + su + '</span>' + mid + '<span class="cor"><i>' + su + '</i></span></div><div class="face back"></div></div></div>' };
  }

  // ---------------------------------------------------------------- motion (5 Oct 2026; owner: "go to town ... the best
  // ever card animations ... really fun to use and really intuitive"). A card that changes place FLIES: an arc up and
  // over, tilting the way it travels and growing a little as it rises, then settling as it lands. Stacks leave one card
  // after another; a card that turns over turns in the air. Web Animations (CSS transitions are off while it flies).
  // Shared with rivals.js (Table365.fly). Callers skip it with Extra effects off or reduced motion.
  var CAN_FLY = typeof Element !== 'undefined' && !!Element.prototype.animate;
  // 6 Oct 2026 (Petra, playing on a phone: "Response needs to be quicker. Bit slow for me"): every card journey and the waits
  // around it scale by PACE - Settings > Card speed: Quick (0.5, the default) or Relaxed (1, the pace until then).
  // A table sets it in start(); the hand games (rivals.js) never do, so theirs stays as it was.
  var PACE = 1;
  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function easeBack(t) { var c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }   // a spring: past the mark, and back
  var EASE = { inOut: easeInOut, out: easeOut, back: easeBack };
  // el: the card; a, b: {x, y, r (deg), s (scale)} from and to, in board pixels; o: { end: the card's final transform
  // (set on the element - what it shows once landed), delay, dur, lift (px the arc rises), tilt (deg at the top),
  // grow (extra scale at the top), ease ('inOut' | 'out' | 'back'), land (false: no settle), done() }
  function fly(el, a, b, o) {
    o = o || {};
    el.classList.add('flight');
    el.style.transform = o.end;
    if (!CAN_FLY) { el.classList.remove('flight'); return null; }
    var dx = b.x - a.x, dy = b.y - a.y, dist = Math.sqrt(dx * dx + dy * dy);
    var dur = o.dur || Math.round(Math.max(250, Math.min(560, 210 + dist * 0.42)));
    if (!o.noPace) dur = Math.max(90, Math.round(dur * PACE));
    var lift = o.lift != null ? o.lift : Math.min(72, 6 + dist * 0.2), tilt = o.tilt != null ? o.tilt : Math.max(-10, Math.min(10, dx / 28));
    var grow = o.grow != null ? o.grow : 0.07, ease = EASE[o.ease || 'inOut'], ar = a.r || 0, br = b.r || 0, as = a.s || 1, bs = b.s || 1;
    var cx = a.x + dx / 2, cy = a.y + dy / 2 - lift, frames = [], N = 14;
    for (var i = 0; i <= N; i++) {
      var t = i / N, e = ease(t), u = 1 - e, up = Math.sin(Math.PI * Math.max(0, Math.min(1, e)));
      var x = u * u * a.x + 2 * u * e * cx + e * e * b.x, y = u * u * a.y + 2 * u * e * cy + e * e * b.y;
      frames.push({ offset: t, transform: 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) rotate(' + (ar + (br - ar) * e + tilt * up).toFixed(2) + 'deg) scale(' + ((as + (bs - as) * e) * (1 + grow * up)).toFixed(4) + ')' });
    }
    if (el._fl) { try { el._fl.cancel(); } catch (er) {} }
    var an = el.animate(frames, { duration: dur, delay: o.delay || 0, easing: 'linear', fill: 'backwards' });
    el._fl = an;
    an.onfinish = function () {
      if (el._fl !== an) return;
      el._fl = null; el.classList.remove('flight');
      if (o.land !== false) { el.classList.remove('land'); void el.offsetWidth; el.classList.add('land'); clearTimeout(el._lt); el._lt = setTimeout(function () { el.classList.remove('land'); }, 300); }
      if (o.done) o.done();
    };
    an.oncancel = function () { if (el._fl === an) { el._fl = null; el.classList.remove('flight'); } };
    return an;
  }
  function flightTime(an) { try { var tm = an.effect.getTiming(); return (tm.delay || 0) + tm.duration; } catch (e) { return 320; } }
  var MOTION_CSS = ''
    // the game's name is the page's heading (games audit, 5 Oct 2026); on a phone the bar shows only the 365 badge, so
    // the name stays there for screen readers instead of display:none; the keys line goes on touch-only devices
    + 'h1.brand{margin:0}'
    + '.card.kbd,.slot.kbd{outline:3px solid #ffd54a;outline-offset:3px;border-radius:9px}#board:focus,#board:focus-visible{outline:none}.kbd-nav #board:focus-visible{outline:2px dashed rgba(255,213,74,.5);outline-offset:-6px}'
    // a hand fanned out shows only each card's left edge, so the games against the computer put the suit under the
    // rank as well, like a real card's corner (games audit, 5 Oct 2026; critic: Q of spades and Q of clubs looked the same)
    + '.su2{display:none;position:absolute;z-index:2;left:6%;top:calc(2.5% + var(--cw) * .33);font:calc(var(--cw) * .18) / 1 "Segoe UI Symbol","Apple Symbols",Archivo,sans-serif;text-shadow:0 1px 0 #fff,0 0 3px #fff,0 0 2px #fff}.rv365 .su2{display:block}.rv365 .pips{left:25%;right:25%;top:36%}'
    + '.rv365 .card.lift{z-index:2900!important}.rv365 .card.lift .wig{transform:translateY(calc(var(--ch) * -.2))!important}.rv365 .card.lift .front{box-shadow:0 0 0 3px #ffd54a,0 12px 22px rgba(0,0,0,.4)}'
    + '.card.hint.hdest .front,.slot.hint.hdest{box-shadow:0 0 0 3px rgba(255,213,74,.5),0 0 14px 3px rgba(255,210,87,.35)!important;outline:3px dashed #ffd54a;outline-offset:3px}'
    + '.rv365 .rv-plate small{font-size:14px}@media (max-width:700px){.rv365 .rv-plate small{font-size:13px}}'   // (the seat labels a touch bigger, games audit 5 Oct)
    + '.skip365{position:fixed;left:10px;top:-80px;z-index:5000;padding:12px 18px;border-radius:12px;background:#ffd54a;color:#2a2000;font:700 17px/1 Archivo,sans-serif;text-decoration:none}.skip365:focus{top:10px}'
    // narrow cards: only the corner is read in a column, so it gets the room - rank 42% of the card, a big suit in the
    // middle in place of the pips (critic 2: Spider's ranks were 10.6 px on a phone)
    + '#board.tiny .idx{font-size:calc(var(--cw) * .42);letter-spacing:-.06em}#board.tiny .idx.ten{font-size:calc(var(--cw) * .36)}#board.tiny .sui{font-size:calc(var(--cw) * .34)}'
    + '#board.tiny .pips{display:none}#board.tiny .su2{display:block!important;left:50%;top:58%;transform:translate(-50%,-50%);font-size:calc(var(--cw) * .62);text-shadow:none}'
    + '#board.tiny .r1 .su2,#board.tiny .r11 .su2,#board.tiny .r12 .su2,#board.tiny .r13 .su2{display:none!important}'
    + '@media (max-height:520px){.bar{padding-top:4px!important;padding-bottom:4px!important;gap:4px 10px}.tb,.tb.tb2,.tb.tb3{min-height:40px!important}.brand b{width:30px;height:30px}}'   // (a short screen: a slimmer bar leaves the cards more room)
    + '[hidden]{display:none!important}'   // (a .btn display rule beat hidden: 'Today’s deal' stayed on the win sheet - critic 4)
    + '#toast{width:max-content}'   // (centred at 50%, it shrank to half the screen: phone messages ran to 5 lines)
    + '@media (max-width:340px){.rv365 .rv-plate:not(.you) small,.rv365 .rv-plate.mate small{display:none}.rv365 .rv-plate{font-size:11.5px}}'
    + '@media (max-width:600px){.rv365 .rv-plate.tag{padding-left:6px;padding-right:6px}.rv365 .rv-plate.tagl{margin-left:-4px}.rv365 .rv-plate.tagr{margin-left:4px}}'   // (Gin's two pile labels ran together - critic 5)   // (320 px: the side seats' lines overlapped)
    + '.sr365{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}'
    // the bar (games audit, 5 Oct 2026; critic: on a phone nine bare icons meant nothing to a first-timer): the game's
    // name shows and opens the Games list; on a phone the main buttons carry a word and the rest live under More
    + '.brandb{display:flex;align-items:center;gap:9px;padding:0 4px 0 0;border:0;background:none;color:inherit;font:inherit;letter-spacing:inherit;cursor:pointer;border-radius:10px}'
    + '.brandb .caret{font-style:normal;font-size:12px;opacity:.75}'
    + '.tb .sl{display:none}.tb.tbmore{display:none}'
    // every width gets words (games audit pass 3; critic 2: an iPad or a zoomed browser got nine bare icons): the less-used
    // buttons go under More as room runs out - Share, Feedback, Full screen first, then My scores and Settings
    + '@media (max-width:1400px){.tb.tb2.tbx{display:none}.tb.tbmore{display:inline-flex}}'
    + '@media (max-width:1100px){.tb.tb3.tbx{display:none}.tb.tb3 .lbl{display:inline!important}.tb.tb3,.tb.tbmore{padding:0 14px}}'
    + '@media (max-width:860px){.tb.tb3 .lbl,.tb .lbl{display:none!important}.tb .sl{display:inline;font:700 15px/1 Archivo,sans-serif}.tb,.tb.tb2,.tb.tb3{padding:0 12px!important}}'
    + '.sheet{position:relative}.sheet>h2{padding-right:48px}'
    + '.x365{position:absolute;top:12px;right:12px;width:44px;height:44px;border:0;border-radius:50%;background:rgba(127,127,127,.16);color:inherit;font:400 28px/1 Archivo,sans-serif;cursor:pointer;display:grid;place-items:center}'
    + '.x365:hover{background:rgba(127,127,127,.3)}'
    + '.morel{display:grid;gap:8px;margin:4px 0 14px}.morei{display:flex!important;align-items:center;gap:12px;justify-content:flex-start!important;text-align:left}.morei svg{width:24px;height:24px;flex:none}'
    + '@media (max-width:860px){.brand span{display:inline!important;font-size:18px}}'
    + '@media (max-width:480px){.bar{gap:6px 10px}.brand span{font-size:17px}'
    + '.tools{display:grid!important;grid-auto-flow:column;grid-auto-columns:1fr;gap:4px!important;width:100%;margin-left:0!important}'
    + '.tb,.tb.tb2,.tb.tb3{flex-direction:column;justify-content:center;gap:3px;min-height:52px;padding:5px 2px 4px!important}'
    + '.tb .sl{display:block;font:700 12px/1 Archivo,sans-serif;white-space:nowrap}.tb svg{width:21px;height:21px}.tb.tbx{display:none}.tb.tbmore{display:inline-flex}}'
    // a phone with big text (6 Oct 2026, owner's Galaxy S22): Chrome turns the text size into page zoom, so this bar can be
    // 180-300 px wide - the buttons share the row whatever its width, slimmer chips; under 250 px the Games button goes
    // (the game's name at the top opens the same list). 360 px phones and up are as before.
    + '@media (max-width:330px){.bar{padding-left:8px;padding-right:8px;gap:5px 8px}.tools{grid-auto-columns:minmax(0,1fr)!important;gap:3px!important}'
    + '.tb,.tb.tb2,.tb.tb3{min-width:0;min-height:48px;padding:4px 1px 3px!important}.tb .sl{font-size:11px;max-width:100%;overflow:hidden}.tb svg{width:20px;height:20px}'
    + '.info{min-width:0;flex:1 1 100%}.chip{flex:1 1 0;min-width:0!important;padding:2px 4px}.chip small{font-size:10px;letter-spacing:0}.chip span{font-size:15px}.brand span{font-size:16px}}'
    + '@media (max-width:250px){.tb#bGames{display:none}}'
    // a phone that can go full screen (Android): Full screen takes Help's place on the bar; Help is under More (6 Oct 2026)
    + '@media (max-width:480px){body.fs365:not(.app365) .tools .tb#bHelp{display:none}body.fs365:not(.app365) .tools .tb#bFull:not([hidden]){display:inline-flex}}'
    // the folded bar (6 Oct 2026, owner: "once you start the game could that menu hide"): one slim row - the scores, Undo,
    // Hint, Full screen and Menu; the game's name stays for screen readers; sideways there is room for it and New
    + 'body.fold365 .bar{flex-wrap:nowrap;align-items:center;gap:6px 6px;padding:max(4px,env(safe-area-inset-top,0px)) 8px 4px}'
    + 'body.fold365 .info{flex:1 1 auto;min-width:0;gap:4px}body.fold365 .chip{flex:1 1 0;min-width:0!important;max-width:96px;padding:2px 3px;border-radius:9px}'
    + 'body.fold365 .chip small{font-size:10px;letter-spacing:.02em}body.fold365 .chip span{font-size:15px}'
    + 'body.fold365 .tools{display:flex!important;flex:0 0 auto;width:auto!important;gap:4px!important;margin-left:0!important}'
    + 'body.fold365 .tools .tb{display:none!important}'
    + 'body.fold365 .tools .tb#bUndo:not([hidden]),body.fold365 .tools .tb#bHint:not([hidden]),body.fold365 .tools .tb#bMore:not([hidden]),body.fs365.fold365:not(.app365) .tools .tb#bFull:not([hidden])'
    + '{display:inline-flex!important;flex-direction:column;justify-content:center;gap:2px;width:46px;min-width:0;min-height:44px;padding:3px 0 2px!important}'
    + 'body.fold365 .tb .sl{display:block!important;font:700 10.5px/1 Archivo,sans-serif;white-space:nowrap}body.fold365 .tb svg{width:20px;height:20px}body.fold365 .tb .lbl{display:none!important}'
    + '@media (max-width:600px){body.fold365 .brand{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}}'
    + '@media (min-width:601px){body.fold365 .tools .tb#bNew:not([hidden]){display:inline-flex!important;flex-direction:column;justify-content:center;gap:2px;width:46px;min-height:44px;padding:3px 0 2px!important}body.fold365 .brand span{font-size:17px}}'
    + '@media (prefers-reduced-motion:no-preference){body.fold365 .info,body.fold365 .tools{animation:fold365 .28s cubic-bezier(.2,.8,.25,1)}}@keyframes fold365{from{opacity:.25;transform:translateY(-6px)}to{opacity:1;transform:none}}'
    + '@media (max-width:330px){body.fold365 .bar{flex-wrap:wrap}body.fold365 .info{flex:1 1 100%}body.fold365 .chip{max-width:none}body.fold365 .tools{margin-left:auto!important}}'
    // a strong phone (8+ cores, 6 Oct 2026): the full flying-card shadow even on narrow cards (Spider keeps the light one)
    + 'body.rich365 #board.tiny:not(.g-spider) .card.flight .front,body.rich365 #board.tiny:not(.g-spider) .card.flight .back{box-shadow:0 0 0 1px var(--card-edge) inset,0 18px 30px rgba(0,0,0,.4),0 6px 10px rgba(0,0,0,.22)}'
    // the daily streak chip (6 Oct 2026): orange flame = today's deal won; glowing = today's still to play; grey = none yet
    + '.chip.chipst{border:0;color:inherit;font:inherit;cursor:pointer;min-width:52px}.chipst span{display:inline-flex;align-items:center;gap:3px}'
    + '.chipst svg{width:16px;height:16px;color:#ff9a3c;flex:none}.chipst.cold svg{color:rgba(255,255,255,.4)}.chipst:hover{background:rgba(0,0,0,.28)}'
    // (a ring that fades in and out six times, then rests - opacity and transform only, so an idle table costs no battery)
    + '.chipst{position:relative}.chipst.due::after{content:"";position:absolute;inset:-2px;border-radius:11px;box-shadow:0 0 0 3px rgba(255,154,60,.6);opacity:0;pointer-events:none}'
    + '@media (prefers-reduced-motion:no-preference){.chipst.due::after{animation:due365 2.2s ease-in-out 6}.chipst.due svg{animation:flick365 1.1s ease-in-out 12 alternate}}'
    + '@keyframes due365{50%{opacity:1}}@keyframes flick365{from{transform:scale(1)}to{transform:scale(1.14) translateY(-1px)}}'
    + 'body.fold365 .chip.chipst{flex:0 0 auto;min-width:40px!important;max-width:none}body.fold365 .chipst small{display:none}body.fold365 .chip.chipst{justify-content:center}body.fold365 .chipst span{font-size:15px}'
    + '@media (max-width:379px){body.fold365 .info .chip:nth-child(2){display:none}}'   // a narrow phone, folded: Moves gives way to the flame
    + '.stk{text-align:center}.stkbig{display:inline-flex;align-items:center;gap:6px;font:800 54px/1 "Clash Display",Archivo,sans-serif;color:var(--sheet-ink)}.stkbig svg{width:56px;height:56px;color:#ff8a1f}'
    + '.stksub{margin:4px 0 6px;font-weight:700;color:var(--sheet-ink)}#kNote{margin:10px 0 4px}'
    // never on the bar - Add to home screen lives in Menu; launched from the home screen: no Full screen, Help back
    + '.tb.tbapp{display:none!important}body.app365 .tools .tb#bFull{display:none!important}'
    + '.wapp{display:grid;grid-template-columns:auto 1fr;gap:6px 12px;align-items:center;margin:12px 0 4px;padding:12px 14px;border-radius:14px;background:#eef6ef;color:var(--sheet-ink);text-align:left}'
    + '.wapp svg{width:30px;height:30px;color:var(--primary);grid-row:span 2}.wapp p{margin:0;font-size:15px;line-height:1.35}.wapp .btn{justify-self:start}'
    + '.wapp .linkb{grid-column:2;justify-self:start;border:0;background:none;color:var(--sheet-soft);font:600 14px Archivo,sans-serif;text-decoration:underline;cursor:pointer;padding:4px 0}'
    + '.apphow{font-size:17px;line-height:1.6}.apphow svg{width:20px;height:20px;vertical-align:-4px}'
    + '@media (hover:none) and (pointer:coarse){.keys365{display:none}}'
    + '.card .wig{perspective:calc(var(--cw) * 5)}'   // a true 3D turn when a card flips
    + '.front,.back{transition:box-shadow .22s ease}'
    + '.card.flight{transition:none!important;pointer-events:none}'   // a card in the air never catches a click meant for what is under it
    + '.card.flight .front,.card.flight .back{box-shadow:0 0 0 1px var(--card-edge) inset,0 18px 30px rgba(0,0,0,.4),0 6px 10px rgba(0,0,0,.22)}'
    // Spider flies whole runs over a table of 104 cards: a lighter shadow there and on narrow cards keeps a phone at
    // full speed (critic 3: 32-52 fps on a mid-range phone, the time going on painting big blurred shadows)
    + '#board.g-spider .card.flight .front,#board.g-spider .card.flight .back,#board.tiny .card.flight .front,#board.tiny .card.flight .back{box-shadow:0 0 0 1px var(--card-edge) inset,0 5px 9px rgba(0,0,0,.38)}'
    + '.card.land .wig{animation:cardLand .28s ease-out}'
    + '@keyframes cardLand{0%{transform:scale(1.035)}55%{transform:scale(.985)}100%{transform:none}}'
    + '.card.turn .wig{animation:cardTurn .46s cubic-bezier(.3,.7,.3,1)}'
    + '@keyframes cardTurn{0%{transform:none}45%{transform:translateY(-6%) scale(1.08)}100%{transform:none}}'
    // touched: it lifts at once; under the mouse, a card you can move rises a little
    + '.card.press .wig{transform:translateY(-3%) scale(1.035);transition:transform .1s}'
    + '.card.press .front{box-shadow:0 0 0 1px var(--card-edge) inset,0 12px 22px rgba(0,0,0,.34)}'
    + '.card.hov .wig{transform:translateY(-2.5%);transition:transform .14s}'
    + '.card.hov .front{box-shadow:0 0 0 1px var(--card-edge) inset,0 7px 16px rgba(0,0,0,.3)}'
    + '.card.hov{cursor:grab}'
    // while dragging: the place it will land if let go now glows brighter than the rest
    + '.card.can.hot .front{box-shadow:0 0 0 3px #fff,0 0 0 6px #8ff0ff,0 0 30px 10px rgba(143,240,255,.8)!important}'
    + '.slot.can.hot{border-color:#fff;box-shadow:inset 0 0 24px rgba(143,240,255,.55),0 0 0 3px #8ff0ff,0 0 30px 9px rgba(143,240,255,.75)}'
    // the Hint's ghost: a see-through card showing the move
    + '.card.ghost{pointer-events:none;transition:none!important;filter:drop-shadow(0 0 10px rgba(255,210,87,.95))}'
    + '.card.ghost .front{box-shadow:0 0 0 3px rgba(255,210,87,.95),0 0 26px 8px rgba(255,210,87,.55)!important}'
    // a pile of cards exactly on top of each other (the deck, a foundation): one shadow, and an edge showing its thickness
    + '.card.under .front,.card.under .back{box-shadow:none}'
    + '.card.thick1::before,.card.thick2::before,.card.thick3::before{content:"";position:absolute;inset:0;border-radius:calc(var(--cw) * .08);background:#ebe5d4;z-index:-1;pointer-events:none}'
    + '.card.thick1::before{transform:translate(1px,1.5px);box-shadow:0 3px 8px rgba(0,0,0,.22)}'
    + '.card.thick2::before{transform:translate(1.5px,2.5px);box-shadow:.5px 1px 0 #d6cfbc,1px 2px 0 #c8c0ab,0 4px 10px rgba(0,0,0,.26)}'
    + '.card.thick3::before{transform:translate(2px,3.5px);box-shadow:.7px 1.2px 0 #d6cfbc,1.4px 2.4px 0 #c8c0ab,2px 3.6px 0 #b9b19b,0 5px 12px rgba(0,0,0,.3)}'
    // the beginner's nudge: a card that could move bobs gently after a long pause (the easiest level only)
    + '.card.nudge .wig{animation:cardNudge 1.1s ease-in-out 2}'
    + '.card.nudge .front{box-shadow:0 0 0 2px rgba(255,210,87,.8),0 0 18px 4px rgba(255,210,87,.45)}'
    + '@keyframes cardNudge{0%,100%{transform:none}50%{transform:translateY(-5%) rotate(-1.5deg)}}'
    + '@media (prefers-reduced-motion:reduce){.card.land .wig,.card.turn .wig,.card.nudge .wig{animation:none}}'
    + 'body.nofx .card.hov .wig,body.nofx .card.press .wig{transform:none}'
    // a big moment stamped on the table (rivals.js stamp(): a Gin, the Queen of spades, a moon shot...)
    + '.st365{position:fixed;z-index:4400;transform:translate(-50%,-50%) rotate(-4deg);display:flex;flex-direction:column;align-items:center;pointer-events:none;text-align:center;animation:stIn .55s cubic-bezier(.2,1.4,.4,1) both}'
    + '.st365 b{position:relative;font:600 clamp(40px,9vw,96px)/1.05 "Clash Display",Archivo,sans-serif;white-space:nowrap;padding:0 .1em;background:linear-gradient(180deg,#fff6d6,#ffd257 50%,#d89a1e);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 3px 0 rgba(60,35,0,.55)) drop-shadow(0 0 20px rgba(255,210,87,.6))}'
    + '.st365 small{margin-top:8px;padding:6px 16px;border-radius:999px;background:rgba(5,12,28,.78);color:#fff;font:700 clamp(14px,2.2vw,19px)/1.2 Archivo,"Segoe UI",sans-serif;white-space:nowrap}'
    + '.st365.dark b{background:linear-gradient(180deg,#f1eeff,#a9b2d6 50%,#525d84);filter:drop-shadow(0 3px 0 rgba(0,0,0,.6)) drop-shadow(0 0 16px rgba(20,25,60,.7))}'
    + '.st365.red b{background:linear-gradient(180deg,#ffe3e3,#ff6b7a 50%,#b3202f);filter:drop-shadow(0 3px 0 rgba(70,0,10,.55)) drop-shadow(0 0 16px rgba(255,90,110,.55))}'
    + '.st365.blue b{background:linear-gradient(180deg,#eaf7ff,#7fd3ff 50%,#1d6fb3);filter:drop-shadow(0 3px 0 rgba(0,30,60,.55)) drop-shadow(0 0 16px rgba(127,211,255,.6))}'
    + '.st365.small b{font-size:clamp(28px,5.6vw,58px)}'
    + '.st365.moon::before{content:"";position:absolute;left:50%;top:50%;width:min(56vw,380px);aspect-ratio:1;border-radius:50%;z-index:-1;'
    + 'background:radial-gradient(circle at 40% 38%,#fffbe8,#ffeeb4 42%,#e9c86c 68%,rgba(233,200,108,0) 71%),radial-gradient(circle at 62% 64%,rgba(180,150,80,.25) 0 7%,transparent 8%),radial-gradient(circle at 34% 60%,rgba(180,150,80,.2) 0 5%,transparent 6%);'
    + 'box-shadow:0 0 90px 34px rgba(255,236,170,.4);animation:moonRise 1.5s ease-out both}'
    + '.st365.out{animation:stOut .5s ease-in forwards}'
    + '@keyframes stIn{0%{opacity:0;transform:translate(-50%,-50%) scale(2.5) rotate(-12deg)}60%{opacity:1;transform:translate(-50%,-50%) scale(.92) rotate(-3deg)}100%{opacity:1;transform:translate(-50%,-50%) scale(1) rotate(-4deg)}}'
    + '@keyframes stOut{to{opacity:0;transform:translate(-50%,-64%) scale(1.06) rotate(-4deg)}}'
    + '@keyframes moonRise{from{opacity:0;transform:translate(-50%,-10%)}to{opacity:1;transform:translate(-50%,-58%)}}'
    + '#board.shake{animation:boardShake .45s}'
    + '@keyframes boardShake{20%{transform:translate(-7px,3px)}40%{transform:translate(6px,-4px)}60%{transform:translate(-4px,2px)}80%{transform:translate(3px,-1px)}}'
    + '.wincel{display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end}'
    + '.wincel select{min-height:46px;padding:0 10px;border-radius:12px;border:2px solid var(--sheet-line);background:#fff;color:var(--sheet-ink);font:700 15px Archivo,"Segoe UI",sans-serif;cursor:pointer}'
    + '.wincel select:focus-visible{outline:3px solid #22a3ee;outline-offset:2px}'
    + '.tile b.bump,.tiles b.bump{animation:bump .45s ease-out}'
    + '@media (prefers-reduced-motion:reduce){.st365,.st365.out,.st365.moon::before,#board.shake{animation:none}}'
    // the picture cards: the figure fills a slightly larger gold frame (the corner index keeps its place)
    + '.court.art{left:12%;right:12%;top:31%;bottom:7%;display:block;overflow:hidden;background:#fbf3dc}'
    + '.court.art svg{position:absolute;inset:0;width:100%;height:100%;fill:none;stroke:none;filter:none}';
  (function () { var st = document.createElement('style'); st.textContent = MOTION_CSS; (document.head || document.documentElement).appendChild(st); })();

  function start(D) {
    var E = D.E;
    var $ = function (id) { return document.getElementById(id); };
    var reduce = window.A11y365 ? A11y365.reduce() : !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);   // (the site's own Reduce motion too - a11y365.js)
    var V = D.variant || null;   // e.g. Solitaire's one or three cards, Spider's suits
    // what the sprint counts, in this game's words (Spider counts cards in suit order, not cards up to the piles)
    var SPW = D.sprintWords || { pill: 'cards up', sub: 'up to the piles', line: 'As many cards up as you can', board: 'the most cards up to the piles in three minutes' };

    // ------------------------------------------------------------ what this browser remembers (per game)
    function load(k, d) { try { var v = localStorage.getItem(D.store + ':' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
    function save(k, v) { try { localStorage.setItem(D.store + ':' + k, JSON.stringify(v)); } catch (e) {} }
    var SET = { winnable: true, auto: true, sound: true, timer: true, felt: 'green', back: 'navy', fx: true, seenHelp: false, win: 'mix', pace: 'quick' };
    if (V) SET[V.key] = V.def;
    (function () { var s = load('settings', null); if (s && typeof s === 'object') for (var k in SET) if (k in s) SET[k] = s[k]; })();
    if (V && !V.options.some(function (o) { return o[0] === SET[V.key]; })) SET[V.key] = V.def;
    // tables and card backs (5 Oct 2026): one choice for every card game (looks.js keeps it as cards365:look)
    if (window.Looks) {
      var lk = Looks.shared();
      if (lk) { if (Looks.known('felt', lk.felt)) SET.felt = lk.felt; if (Looks.known('back', lk.back)) SET.back = lk.back; }
      if (!Looks.known('felt', SET.felt)) SET.felt = 'green';
      if (!Looks.known('back', SET.back)) SET.back = 'navy';
    }
    // Card speed: Quick (half the time, the default since 6 Oct 2026) or Relaxed; pc() scales a wait the same way
    function setPace() { if (SET.pace !== 'relaxed') SET.pace = 'quick'; PACE = SET.pace === 'relaxed' ? 1 : 0.5; }
    function pc(ms) { return Math.round(ms * PACE); }
    setPace();
    try { if ((navigator.hardwareConcurrency || 0) >= 8 && (!navigator.deviceMemory || navigator.deviceMemory >= 6)) document.body.classList.add('rich365'); } catch (e) {}
    // (only these keys survive a reload: dayBest = the longest daily streak, clocks = clocks beaten - that one was
    // being dropped on every load until 6 Oct 2026)
    function blankStats() { return { v: 1, played: 0, won: 0, streak: 0, bestStreak: 0, best: {}, daily: {}, recent: [], dayBest: 0, clocks: 0 }; }
    var ST = blankStats();
    (function () { var s = load('stats', null); if (s && s.v === 1) for (var k in ST) if (k in s) ST[k] = s[k]; if (!ST.best || typeof ST.best !== 'object') ST.best = {}; })();
    function vKey(v) { return V ? (V.statKey ? V.statKey(v) : 'v' + v) : 'all'; }
    function vOf(s) { return V ? s[V.stateKey || V.key] : 0; }
    // what this game's level allows (4 Oct 2026: Solitaire's Hard has no Hint, Expert no Undo or Hint)
    function rules() { var r = D.rules && S ? D.rules(S) : null; return { undo: !r || r.undo !== false, hint: !r || r.hint !== false }; }

    var S = null, G = null, busy = false, gen = 0;
    function newG(mode, day) {
      // log: the moves, as codes (Solitaire's E.code), so the Hall of Fame can replay a win; limit: a challenge's clock
      return { undo: [], ms: 0, mode: mode || 'deal', day: day || '', started: false, counted: false, undid: 0, keepDown: null, log: [],
               limit: mode === 'clock' ? (D.clockMins ? D.clockMins(S) : 5) * 60000 : mode === 'sprint' ? 180000 : 0, timeUp: false, over: false };   // Spider's clock is longer
    }
    function logMove(m) { if (E.code && G && G.log) { G.log.push(E.code(m)); if (G.log.length > 3000) G.log.length = 3000; } }

    // ------------------------------------------------------------ the page
    buildUI();
    var board = $('board');
    var cardEl = [], slotEl = {}, faceKey = '';
    function makeCard(c) {
      var f = D.face(c, S), k = cardMarkup(f.r, f.s), el = cardEl[c] || document.createElement('div');
      el.className = 'card down ' + k.cls;
      el.setAttribute('data-c', c);
      el.setAttribute('aria-hidden', 'true');
      el.innerHTML = k.html;
      return el;
    }
    function faces() {   // (re)draw the faces when the game's card set changes (Spider's one, two or four suits)
      var k = D.faceKey ? D.faceKey(S) : 'x';
      if (k === faceKey && cardEl.length) return;
      faceKey = k; imgCache = {};
      for (var pr = 11; pr <= 13; pr++) for (var ps = 0; ps < 4; ps++) artImg(pr, ps);   // the pictures, ready for the bouncing finish
      for (var c = 0; c < D.cards; c++) { var el = makeCard(c); if (!el.parentNode) board.appendChild(el); cardEl[c] = el; }
    }

    // ------------------------------------------------------------ where everything sits
    var L = { cw: 90, ch: 126, slots: [] };
    function layout() {
      LW = board.clientWidth; LH = board.clientHeight;   // (the size this layout was made for)
      L = D.layout(board.clientWidth, board.clientHeight, S);
      document.documentElement.style.setProperty('--cw', L.cw + 'px');
      // narrow cards: a bigger corner, one big suit (games audit, 5 Oct 2026 - Spider on a phone). 6 Oct 2026 (Petra: "not
      // clear enough" on a phone): every phone-sized card, up to 64 px - rows of tiny pips were the hard part to read
      board.classList.toggle('tiny', L.cw < 64); board.classList.add('g-' + D.id);
      document.documentElement.style.setProperty('--ch', L.ch + 'px');
      var seen = {};
      (L.slots || []).forEach(function (s) {
        var el = slotEl[s.key];
        if (!el) { el = slotEl[s.key] = document.createElement('div'); board.insertBefore(el, board.querySelector('.card')); }   // in order, under the cards
        el.className = 'slot ' + (s.cls || ''); el.setAttribute('data-slot', s.key);
        if (s.text != null && !el.getAttribute('data-html')) el.textContent = s.text;
        el.style.transform = 'translate3d(' + Math.round(s.x) + 'px,' + Math.round(s.y) + 'px,0)';
        el.style.display = '';
        seen[s.key] = 1;
      });
      for (var k in slotEl) if (!seen[k]) slotEl[k].style.display = 'none';
      imgCache = {};
    }
    var lastP = {};
    var flyFrom = null;   // where cards really are when let go (a drop, or a slide back): they fly from there, not from their pile
    function arcsOn() { return SET.fx && !reduce && Table365.canFly; }
    // cards lying exactly on top of each other: only the top one casts a shadow, with an edge as thick as the pile
    function stacks(P) {
      var at = {}, c, k;
      for (c = 0; c < D.cards; c++) { var p = P[c]; if (!p) continue; k = Math.round(p.x) + '|' + Math.round(p.y); (at[k] = at[k] || []).push(c); }
      for (k in at) {
        var l = at[k], n = l.length;
        if (n > 1) l.sort(function (a, b) { return P[a].z - P[b].z; });
        l.forEach(function (cc, i) {
          var el = cardEl[cc], top = i === n - 1, lv = top && n > 1 ? (n > 15 ? 3 : n > 5 ? 2 : 1) : 0;
          el.classList.toggle('under', !top);
          el.classList.toggle('thick1', lv === 1); el.classList.toggle('thick2', lv === 2); el.classList.toggle('thick3', lv === 3);
        });
      }
    }
    function render(instant) {
      var P = D.positions(S, L), arcs = !instant && arcsOn(), groups = {}, gk = [];
      if (instant) board.classList.add('instant');
      for (var c = 0; c < D.cards; c++) {
        var p = P[c], el = cardEl[c], old = lastP[c], from = flyFrom && flyFrom[c];
        if (!p) { el.style.display = 'none'; continue; }
        el.style.display = '';
        el._z = p.z;
        var turning = !instant && old && !old.up && p.up, endT = 'translate3d(' + p.x + 'px,' + p.y + 'px,0)';
        if (arcs && !el.classList.contains('drag') && (from || (old && old.pile !== p.pile))) {   // it flies: gathered by journey
          var key = from ? 'drop' : String(old.pile);
          if (!groups[key]) { groups[key] = []; gk.push(key); }
          groups[key].push({ el: el, a: from || old, b: p, end: endT, turning: turning, drop: !!from });
          if (!turning) el.classList.toggle('down', !p.up);
          continue;
        }
        if (!el.classList.contains('drag')) el.style.transform = endT;
        el.classList.toggle('down', !p.up);
        if (!instant && old && old.pile !== p.pile) {   // flying to another pile: on top of everything until it lands
          el.style.zIndex = 2000 + p.z; clearTimeout(el._zt);
          el._zt = setTimeout((function (e) { return function () { e.style.zIndex = e._z; e._zt = 0; }; })(el), pc(320));
          flyOn(el);
        } else if (!el._zt) el.style.zIndex = p.z;
        if (turning) turnOn(el);   // turned face up where it lies: it rises as it turns and catches the light
      }
      // the flights: each group (cards leaving one pile for another together) goes one card after another, in arcs; a
      // card turning over turns in the air; a card let go near its place just settles in (a spring if it goes back)
      var my = gen;
      gk.forEach(function (key) {
        var g = groups[key].sort(function (u, v) { return Math.round(u.b.x) - Math.round(v.b.x) || u.b.z - v.b.z; }), gap = Math.min(34, 420 / g.length) * PACE;
        g.forEach(function (f, i) {
          var el = f.el, delay = Math.round(i * gap);
          clearTimeout(el._zt); el.style.zIndex = 2000 + f.b.z;
          var an = Table365.fly(el, f.a, f.b, { end: f.end, delay: delay, ease: f.drop && flyFrom.back ? 'back' : 'inOut', lift: f.drop ? Math.min(26, 4 + Math.abs(f.b.x - f.a.x) * 0.08) : null, tilt: f.drop ? 0 : null });
          var t = Table365.flightTime(an);
          el._zt = setTimeout(function () { el.style.zIndex = el._z; el._zt = 0; }, t + 30);
          if (f.turning) setTimeout(function () { if (my === gen && lastP[+el.getAttribute('data-c')] && lastP[+el.getAttribute('data-c')].up) { el.classList.remove('down'); turnOn(el); } }, delay + (t - delay) * 0.4);
        });
      });
      flyFrom = null;
      lastP = P;
      stacks(P);
      if (D.slotHtml) for (var k in slotEl) { var h = D.slotHtml(k, S); if (h != null) { slotEl[k].setAttribute('data-html', '1'); if (slotEl[k]._h !== h) { slotEl[k].innerHTML = h; slotEl[k]._h = h; } } }
      if (instant) { void board.offsetWidth; board.classList.remove('instant'); }
      bar();
    }
    // a card lifts, tilts and settles as it flies; a card turned over catches the light (Extra effects)
    function flyOn(el) {
      if (!SET.fx || reduce) return;
      el.classList.remove('fly'); void el.offsetWidth; el.classList.add('fly');
      clearTimeout(el._ft); el._ft = setTimeout(function () { el.classList.remove('fly'); }, 420);
    }
    function shineOn(el) {
      if (!SET.fx || reduce) return;
      clearTimeout(el._st); el.classList.remove('shine');
      el._st = setTimeout(function () { el.classList.add('shine'); el._st = setTimeout(function () { el.classList.remove('shine'); }, 800); }, 240);
    }
    // a card turning over rises off the table as it turns, then catches the light
    function turnOn(el) {
      if (!SET.fx || reduce) return;
      el.classList.remove('turn'); void el.offsetWidth; el.classList.add('turn');
      clearTimeout(el._tt); el._tt = setTimeout(function () { el.classList.remove('turn'); }, 480);
      shineOn(el);
    }
    var shownScore = null;
    function bar() {
      $('vMoves').textContent = S.moves;
      $('vScore').textContent = S.score;
      if (shownScore != null && S.score > shownScore && SET.fx && !reduce) { var vs = $('vScore'); vs.classList.remove('bump'); void vs.offsetWidth; vs.classList.add('bump'); }
      shownScore = S.score;
      $('vTime').textContent = clock(G.ms);
      $('chipTime').style.display = SET.timer ? '' : 'none';
      streakChip();
      var R = rules();
      $('bUndo').disabled = !G.undo.length || !R.undo; $('bHint').disabled = !R.hint;
      if (G.mode === 'journey') chal();
      $('bUndo').title = R.undo ? 'Undo (U or Ctrl+Z)' : 'No Undo at this level'; $('bHint').title = R.hint ? 'Show me a move (H)' : 'No hints at this level';
      $('stUndo').hidden = !R.undo;
    }
    function clock(ms) {
      var s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = s % 60;
      return (h ? h + ':' + (m < 10 ? '0' : '') : '') + m + ':' + (x < 10 ? '0' : '') + x;
    }

    // ------------------------------------------------------------ touching the cards
    var drag = null, gestured = false;
    board.addEventListener('pointerdown', function (e) {
      gestured = true;
      touchy = e.pointerType === 'touch'; idle();
      if (busy || (e.button && e.button > 0) || openSheet) return;
      var hit = e.target.closest ? e.target.closest('.card, .slot') : null;
      if (!hit) {   // the deck's place, tapped while its cards are still flying back (they let taps through): still the deck
        var sl = D.hasStock && (L.slots || []).filter(function (q) { return q.key === 'stock'; })[0], br = board.getBoundingClientRect();
        var bx = e.clientX - br.left + board.scrollLeft, by = e.clientY - br.top + board.scrollTop;
        if (sl && bx >= sl.x && bx <= sl.x + L.cw && by >= sl.y && by <= sl.y + L.ch) { e.preventDefault(); unhint(); act({ t: 'draw' }); }
        return;
      }
      var hm = hintM;
      unhint();
      if (hm && hm.m.t === 'move' && (hit.classList.contains('slot') ? hm.slots.indexOf(hit.getAttribute('data-slot')) >= 0 : hm.cards.indexOf(+hit.getAttribute('data-c')) >= 0) && E.legal(S, hm.m)) {
        var hc = hit.classList.contains('card') ? +hit.getAttribute('data-c') : -1, hf = hc >= 0 ? D.where(S, hc) : null;
        if (!(hf && JSON.stringify(hf) === JSON.stringify(hm.m.from))) { e.preventDefault(); act(hm.m); return; }   // the glowing destination: make the hinted move
      }
      if (hit.classList.contains('slot')) { if (hit.getAttribute('data-slot') === 'stock') { e.preventDefault(); act({ t: 'draw' }); } return; }
      var c = +hit.getAttribute('data-c'), from = D.where(S, c);
      if (!from) { var why = D.cantPick ? D.cantPick(S, c) : ''; if (why) { nope(hit); say(why); } return; }   // say why it won't lift
      e.preventDefault();
      if (from.p === 'stock') { act({ t: 'draw' }); return; }
      var cards = D.picked(S, from);
      if (!cards.length) return;
      if (sel && sel.c !== c && !D.pairs) selOff();
      drag = { hm: hm, from: from, cards: cards, c: c, x0: e.clientX, y0: e.clientY, dx: 0, dy: 0, moved: false, id: e.pointerId, base: cards.map(function (k) { return lastP[k]; }) };
      unhov();
      if (SET.fx && !reduce) cards.forEach(function (k) { cardEl[k].classList.add('press'); });
      try { board.setPointerCapture(e.pointerId); } catch (er) {}
    });
    function unpress(d) { if (d) d.cards.forEach(function (k) { cardEl[k].classList.remove('press'); }); }
    // a phone: a tiny buzz as a move lands (a firmer one for a card going up to the piles) - Extra effects only
    var touchy = false;
    function buzz(ms) { if (touchy && SET.fx && !reduce && navigator.vibrate) try { navigator.vibrate(ms); } catch (e) {} }
    // the folding bar (owner, 6 Oct 2026, S22 Ultra: "once you start the game could that menu sort of hide ... and then you
    // could unhide it"): on a phone, once the first move is made - and always with the phone on its side - the bar folds
    // to one slim row; Menu holds the rest. A new game opens it out again (not the win: nothing moves under the finale).
    // The cards glide into the room it gives back. sync = the caller lays the table out itself straight after.
    var phoneQ = window.matchMedia ? matchMedia('(pointer: coarse) and (max-width: 600px), (pointer: coarse) and (max-height: 500px)') : null;
    var sideQ = window.matchMedia ? matchMedia('(orientation: landscape) and (max-height: 500px)') : null;
    var glide = false, foldT = 0;
    function fold(sync) {
      var want = !!(phoneQ && phoneQ.matches && S && G && ((sideQ && sideQ.matches) || G.started));
      if (want === document.body.classList.contains('fold365')) return;
      if (!sync && (busy || drag)) { clearTimeout(foldT); foldT = setTimeout(fold, 300); return; }   // not under a card in the air
      document.body.classList.toggle('fold365', want); glide = !sync;
      var ml = $('bMore') && $('bMore').querySelector('.sl'); if (ml) ml.textContent = want ? 'Menu' : 'More';
      if ($('bMore')) $('bMore').title = want ? 'Menu: new game, games, how to play, my scores, settings and more' : 'More: my scores, settings, share, feedback';
    }
    // the beginner's nudge: on the easiest level of an ordinary game, after a long pause a card that could move bobs once
    var idleT = 0;
    function idle() { clearTimeout(idleT); idleT = setTimeout(nudge, 25000); }
    function nudge() {
      if (!S || S.won || G.over || busy || drag || openSheet || reduce || !SET.fx || G.mode !== 'deal' || !rules().hint) return;
      if (V && vOf(S) !== V.options[0][0]) return;
      var m = E.hint(S); if (!m) return;
      var lit = D.hintLights(S, m) || {}, cs = (lit.cards || []).slice(0, 1);
      cs.forEach(function (c) { if (cardEl[c]) cardEl[c].classList.add('nudge'); });
      setTimeout(function () { cs.forEach(function (c) { if (cardEl[c]) cardEl[c].classList.remove('nudge'); }); }, 2400);
    }
    var hovCards = [];
    function unhov() { hovCards.forEach(function (k) { if (cardEl[k]) cardEl[k].classList.remove('hov'); }); hovCards = []; }
    board.addEventListener('pointerover', function (e) {
      if (e.pointerType !== 'mouse' || drag || busy || !S || S.won || !SET.fx || reduce) return;
      var h = e.target.closest ? e.target.closest('.card') : null, c = h ? +h.getAttribute('data-c') : -1;
      if (hovCards.length && hovCards[0] === c) return;
      unhov();
      if (!h || h.classList.contains('down') || h.classList.contains('flight')) return;
      var from = D.where(S, c); if (!from || from.p === 'stock') return;
      hovCards = D.picked(S, from) || [];
      if (hovCards[0] !== c) hovCards = [c].concat(hovCards.filter(function (k) { return k !== c; }));
      hovCards.forEach(function (k) { cardEl[k].classList.add('hov'); });
    });
    board.addEventListener('pointerleave', unhov);
    board.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
      if (!drag.moved) {
        if (Math.abs(dx) + Math.abs(dy) < 8) return;
        drag.moved = true;
        selOff(); unpress(drag);
        drag.cards.forEach(function (k, i) { var el = cardEl[k]; clearTimeout(el._zt); el._zt = 0; el.classList.add('drag'); el.style.zIndex = 3000 + i; });
        drag.pos = drag.base.map(function (b) { return { x: b.x, y: b.y }; });
        showCan(drag);
        sfx('lift');
      }
      drag.dx = dx; drag.dy = dy;
      hotOn(drag);
      if (SET.fx && !reduce) { if (!dragRAF) dragRAF = requestAnimationFrame(dragLoop); }   // the stack trails and tilts (dragLoop)
      else drag.cards.forEach(function (k, i) { var b = drag.base[i]; cardEl[k].style.transform = 'translate3d(' + (b.x + dx) + 'px,' + (b.y + dy) + 'px,0)'; });
    });
    // a stack in the hand: the top card follows the finger exactly, the ones under it a moment behind, all tilting
    // with the movement - like holding real cards
    var dragRAF = 0;
    function dragLoop() {
      dragRAF = 0;
      var d = drag; if (!d || !d.moved) return;
      var vx = d.dx - (d.pdx == null ? d.dx : d.pdx); d.pdx = d.dx; d.vs = (d.vs || 0) * 0.72 + vx * 0.28;
      var tilt = Math.max(-11, Math.min(11, d.vs * 0.9)), settled = Math.abs(d.vs) < 0.05;
      d.cards.forEach(function (k, i) {
        var b = d.base[i], tx = b.x + d.dx, ty = b.y + d.dy, p = d.pos[i], f = i === 0 ? 1 : 0.45;
        p.x += (tx - p.x) * f; p.y += (ty - p.y) * f;
        if (Math.abs(tx - p.x) > 0.3 || Math.abs(ty - p.y) > 0.3) settled = false;
        cardEl[k].style.transform = 'translate3d(' + p.x.toFixed(1) + 'px,' + p.y.toFixed(1) + 'px,0)';
        cardEl[k].firstChild.style.transform = 'scale(1.05) rotate(' + (tilt * (1 - i * 0.12) - 1).toFixed(2) + 'deg)';
      });
      if (!settled) dragRAF = requestAnimationFrame(dragLoop);
    }
    function endDragLook(d) {
      if (dragRAF) { cancelAnimationFrame(dragRAF); dragRAF = 0; }
      d.cards.forEach(function (k) { cardEl[k].classList.remove('drag'); cardEl[k].firstChild.style.transform = ''; });
      hideCan();
    }
    // while a card is dragged, the places it may legally go glow (a modern touch, and a help to anyone unsure)
    var canEls = [];
    function showCan(d) {
      hideCan();
      D.targets(S, d.from, L, lastP).forEach(function (t) {
        if (!E.legal(S, { t: 'move', from: d.from, to: t.to })) return;
        var best = null, bz = -1;
        for (var c = 0; c < D.cards; c++) {
          var q = lastP[c];
          if (q && d.cards.indexOf(c) < 0 && Math.abs(q.x - t.x) < 0.5 && Math.abs(q.y - t.y) < 0.5 && q.z > bz && cardEl[c].style.display !== 'none') { best = cardEl[c]; bz = q.z; }
        }
        if (!best) (L.slots || []).forEach(function (s) { if (!best && Math.abs(s.x - t.x) < 0.5 && Math.abs(s.y - t.y) < 0.5) best = slotEl[s.key]; });
        if (best) { best.classList.add('can'); best._to = JSON.stringify(t.to); canEls.push(best); }
      });
    }
    function hideCan() { canEls.forEach(function (el) { el.classList.remove('can', 'hot'); }); canEls = []; }
    function hotOn(d) {
      if (!canEls.length) return;
      var t = dropTarget(d), k = t.m ? JSON.stringify(t.m.to) : '';
      canEls.forEach(function (el) { el.classList.toggle('hot', el._to === k); });
    }
    board.addEventListener('pointerup', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var d = drag; drag = null;
      unpress(d);
      if (!d.moved) { tap(d); return; }
      var drop = dropTarget(d);
      if (arcsOn()) { flyFrom = {}; d.cards.forEach(function (k, i) { flyFrom[k] = d.pos ? { x: d.pos[i].x, y: d.pos[i].y } : { x: d.base[i].x + d.dx, y: d.base[i].y + d.dy }; }); flyFrom.back = !drop.m; }
      endDragLook(d);
      if (drop.m) act(drop.m);
      else {   // it springs back - and the player is told why, in plain words (owner, 3 Oct 2026: Kings "just come back")
        render(); sfx('nope'); buzz([5, 45, 5]);
        say(D.whyNot ? D.whyNot(S, d.from, drop.near) : 'That card can’t go there');
      }
    });
    board.addEventListener('pointercancel', function () { if (!drag) return; var d = drag; drag = null; unpress(d); if (d.moved) endDragLook(d); render(); });
    board.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    // the keyboard: the cards that can be lifted now (and the deck), each played as a tap (games audit, 5 Oct 2026)
    kbd(board, {
      busy: function () { return busy || !!drag || !!openSheet || !S; },
      list: function () {
        var out = [], stockDone = false;
        for (var c = 0; c < D.cards; c++) {
          var el = cardEl[c], p = lastP[c]; if (!el || !p || el.style.display === 'none' || el.classList.contains('flight')) continue;
          var from = D.where(S, c); if (!from) continue;
          if (from.p === 'stock') { if (!stockDone) { stockDone = true; out.push({ c: 'stock', el: el, x: p.x, y: p.y, name: 'The deck: turn over cards' }); } continue; }
          if (el.classList.contains('down') || !(D.picked(S, from) || []).length) continue;
          var f = D.face(c, S); out.push({ c: c, el: el, x: p.x, y: p.y, name: cardName(f.r, f.s) });
        }
        if (D.hasStock && !stockDone && slotEl.stock && slotEl.stock.style.display !== 'none') (L.slots || []).forEach(function (s) { if (s.key === 'stock') out.push({ c: 'stock', el: slotEl.stock, x: s.x, y: s.y, name: 'The deck: start it again' }); });
        return out;
      },
      play: function (it) {
        unhint();
        if (it.c === 'stock') { act({ t: 'draw' }); return; }
        var from = D.where(S, it.c); if (!from) return;
        tap({ from: from, cards: D.picked(S, from), c: it.c });
      }
    });
    // Pyramid: the card picked first, waiting for its partner (D.pairs)
    var sel = null;
    function selOff() {
      if (!sel) return;
      if (cardEl[sel.c]) cardEl[sel.c].classList.remove('sel');
      (sel.lit || []).forEach(function (c) { if (cardEl[c]) cardEl[c].classList.remove('can'); });
      sel = null;
    }
    function pairTap(d) {
      if (sel && sel.c === d.c) { selOff(); sfx('place'); return; }   // tapped again: put it down
      if (sel) { var pm = { t: 'move', from: sel.from, to: d.from }; if (E.legal(S, pm)) { selOff(); act(pm); return; } }
      var km = E.smartMove(S, d.from);
      if (km) { selOff(); act(km); return; }
      selOff();
      sel = { c: d.c, from: d.from, lit: rules().hint && D.partnerCards ? D.partnerCards(S, d.from) : [] };
      cardEl[d.c].classList.add('sel'); sfx('lift');
      sel.lit.forEach(function (c) { if (cardEl[c]) cardEl[c].classList.add('can'); });
      if (D.pickSay) say(D.pickSay(S, d.from));
    }
    function tap(d) {
      // the card the Hint is showing, tapped: the hinted move - even one a tap wouldn't normally make (a card back down
      // from a pile, which otherwise needs a drag)
      if (!D.pairs && d.hm && d.hm.m.t === 'move' && JSON.stringify(d.hm.m.from) === JSON.stringify(d.from) && E.legal(S, d.hm.m)) { act(d.hm.m); return; }
      if (D.noTap && D.noTap(d.from)) return;   // e.g. cards come down from the piles by dragging only
      if (D.pairs) { pairTap(d); return; }
      var m = E.smartMove(S, d.from);
      if (m) act(m);
      else { nope(cardEl[d.c]); sfx('nope'); buzz([5, 45, 5]); say(D.whyNot ? D.whyNot(S, d.from, null) : 'No move for that card yet'); }
    }
    function dropTarget(d) {   // the legal place the dragged card overlaps most; near = the place it overlaps most at all
      var b = d.base[0], x = b.x + d.dx, y = b.y + d.dy, best = null, bestA = 0, near = null, nearA = 0;
      D.targets(S, d.from, L, lastP).forEach(function (t) {
        var ox = Math.min(x + L.cw, t.x + L.cw) - Math.max(x, t.x), oy = Math.min(y + L.ch, t.y + L.ch) - Math.max(y, t.y);
        if (ox <= 0 || oy <= 0) return;
        if (ox * oy > nearA) { nearA = ox * oy; near = t.to; }
        if (ox * oy <= bestA) return;
        var m = { t: 'move', from: d.from, to: t.to };
        if (E.legal(S, m)) { best = m; bestA = ox * oy; }
      });
      return { m: best, near: near };
    }
    function nope(el) { if (!el) return; el.classList.remove('nope'); void el.offsetWidth; el.classList.add('nope'); setTimeout(function () { el.classList.remove('nope'); }, 360); }
    function pop(c) { var el = cardEl[c]; if (!el) return; setTimeout(function () { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); setTimeout(function () { el.classList.remove('pop'); }, 380); }, pc(240)); }

    // ------------------------------------------------------------ making moves
    function act(m) {
      if (busy || !S || S.won || G.over) { flyFrom = null; return; }
      selOff(); unhov();
      var snap = { s: E.clone(S), ms: G.ms, n: G.log ? G.log.length : 0 };
      var fx = E.apply(S, m);
      if (!fx) { if (fx === null && m.t === 'draw' && D.noDrawSay) say(D.noDrawSay(S)); sfx('nope'); buzz([5, 45, 5]); render(); return; }
      G.undo.push(snap); if (G.undo.length > 400) G.undo.shift();
      logMove(m);
      var first = !G.started; G.started = true; idle();
      if (first) { clearTimeout(foldT); foldT = setTimeout(fold, 420); }
      if (m.t === 'move') buzz(fx.toFound ? 14 : 8); else buzz(5);
      G.keepDown = m.t === 'move' && m.from && m.from.p === 'f' ? fx.cards[0] : null;   // taken down on purpose: not straight back up
      hideStuck(); unhint();
      effects(fx);
      render();
      after();
    }
    var foundRun = 0;   // cards in a row to the piles: the chime climbs
    function effects(fx) {
      if (fx.t === 'draw') { foundRun = 0; sfx(fx.recycled ? 'shuffle' : (fx.dealt ? 'deal' : 'flip'));
        if (fx.recycled && typeof fx.left === 'number') say(fx.left ? 'Turned over – one more time through the deck after this' : 'Last time through the deck!'); }
      else if (fx.toFound) { foundRun++; sfx('found', foundRun); (fx.popCards || fx.cards).forEach(pop); celebrate(fx); }
      else { foundRun = 0; sfx('slide'); setTimeout(function () { sfx('place'); }, pc(arcsOn() ? 330 : 230)); }   // (as a flying card lands)
      if (fx.flipped && fx.flipped.length) setTimeout(function () { sfx('flip'); }, pc(140));
      if (fx.say) say(fx.say);
    }
    // a card reaching the piles: gold sparkles where it lands and the points it earned floating up; a whole suit
    // finished: a bigger burst and a little fanfare
    function celebrate(fx) {
      var cards = fx.popCards || fx.cards, last = cards[cards.length - 1], gained = shownScore == null ? 0 : S.score - shownScore;
      var whole = typeof fx.big === 'boolean' ? fx.big : ((fx.popCards && fx.popCards.length >= 13) || (cards.length === 1 && D.face(last, S).r === 13)), my = gen;
      setTimeout(function () {
        if (my !== gen || !cardEl[last]) return;
        var r = cardEl[last].getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        if (SET.fx && !reduce) {
          Spark.burst(cx, cy, whole ? 70 : 16, whole ? ['#ffe08a', '#ffffff', '#ffb347', '#8ff0ff', '#ff8ad8'] : ['#ffe08a', '#ffffff', '#ffd257'], whole ? 5.5 : 2.6, whole ? 90 : 46);
          Spark.ring(cx, cy, whole ? r.width * 1.4 : r.width * 0.7, '#ffe08a', whole ? 40 : 22);
        }
        if (gained > 0 && SET.fx && !reduce) {
          var f = document.createElement('div'); f.className = 'floatpts'; f.textContent = '+' + gained;
          f.style.left = cx + 'px'; f.style.top = (r.top - 8) + 'px';
          document.body.appendChild(f); setTimeout(function () { f.remove(); }, 1200);
        }
        if (whole) { sfx('suit'); if (SET.fx && !reduce) pop(last); bigMoment(fx, D.face(last, S).s); }
      }, pc(260));
    }
    // a big moment stamped on the table (5 Oct 2026): a suit completed, a Spider run, a TriPeaks peak, a Pyramid row
    var SUITW = ['Spades', 'Hearts', 'Diamonds', 'Clubs'], stampEl = null;
    function bigMoment(fx, suit) {
      if (!SET.fx || reduce) return;
      buzz([10, 40, 24]);   // a suit, a peak, a run finished: a double tap you can feel
      var txt = D.id === 'tripeaks' ? (/All three/.test(fx.say || '') ? 'All three peaks!' : 'Peak cleared!') : D.id === 'pyramid' ? 'Row cleared!' : D.id === 'spider' ? 'Run complete!' : SUITW[suit] + ' complete!';
      if (stampEl) stampEl.remove();
      var el = stampEl = document.createElement('div'), r = board.getBoundingClientRect();
      el.className = 'st365 small ' + (suit === 1 || suit === 2 ? 'red' : 'gold');
      el.innerHTML = '<b>' + esc(txt) + '</b>';
      el.style.left = (r.left + r.width / 2) + 'px'; el.style.top = (r.top + r.height * 0.45) + 'px';
      document.body.appendChild(el);
      setTimeout(function () { el.classList.add('out'); }, 1000);
      setTimeout(function () { el.remove(); if (stampEl === el) stampEl = null; }, 1520);
    }

    // ------------------------------------------------------------ sparkles: a light layer over the table, running only while there are any
    var Spark = (function () {
      var cv = null, x = null, P = [], RINGS = [], run = 0, dpr = 1, DOT = {};
      function ensure() {
        if (!cv) { cv = $('spark'); x = cv.getContext('2d'); }
        var w = window.innerWidth, h = window.innerHeight, want = Math.min(2, window.devicePixelRatio || 1);
        if (cv.width !== Math.ceil(w * want) || cv.height !== Math.ceil(h * want)) { dpr = want; cv.width = Math.ceil(w * dpr); cv.height = Math.ceil(h * dpr); cv.style.width = w + 'px'; cv.style.height = h + 'px'; }
      }
      function dot(col) {
        if (DOT[col]) return DOT[col];
        var c = document.createElement('canvas'); c.width = c.height = 32; var g = c.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
        gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.25, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
        return (DOT[col] = c);
      }
      function burst(px, py, n, cols, spd, life, o) {
        ensure(); o = o || {};
        for (var i = 0; i < n && P.length < 1400; i++) {
          var a = o.up ? -Math.PI / 2 + (Math.random() - 0.5) * 2.2 : Math.random() * Math.PI * 2, v = spd * (0.3 + Math.random() * 0.9);
          P.push({ x: px, y: py, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: life * (0.6 + Math.random() * 0.6), max: life, col: cols[i % cols.length],
            s: (o.size || 7) * (0.6 + Math.random() * 0.8), g: o.grav == null ? 0.06 : o.grav, star: Math.random() < 0.35 });
        }
        go();
      }
      function ring(px, py, r1, col, life) { ensure(); RINGS.push({ x: px, y: py, r1: r1, col: col, life: life, max: life }); go(); }
      function go() { if (!run) run = requestAnimationFrame(frame); }
      function frame() {
        run = 0;
        x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, cv.width, cv.height);
        x.globalCompositeOperation = 'lighter';
        for (var i = P.length - 1; i >= 0; i--) {
          var p = P[i]; p.vx *= 0.975; p.vy = p.vy * 0.975 + p.g; p.x += p.vx; p.y += p.vy;
          if (--p.life <= 0) { P.splice(i, 1); continue; }
          var a = Math.min(1, p.life / p.max * 1.5), s = p.s * (0.5 + 0.5 * p.life / p.max);
          x.globalAlpha = a; x.drawImage(dot(p.col), p.x - s, p.y - s, s * 2, s * 2);
          if (p.star) { x.fillStyle = '#ffffff'; x.fillRect(p.x - s * 0.9, p.y - 0.6, s * 1.8, 1.2); x.fillRect(p.x - 0.6, p.y - s * 0.9, 1.2, s * 1.8); }
        }
        for (i = RINGS.length - 1; i >= 0; i--) {
          var r = RINGS[i], k = 1 - r.life / r.max;
          if (--r.life <= 0) { RINGS.splice(i, 1); continue; }
          x.globalAlpha = (1 - k) * 0.8; x.strokeStyle = r.col; x.lineWidth = 3 * (1 - k) + 1;
          x.beginPath(); x.arc(r.x, r.y, r.r1 * (1 - Math.pow(1 - k, 3)), 0, Math.PI * 2); x.stroke();
        }
        x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
        if (P.length || RINGS.length || Spark.keep) run = requestAnimationFrame(frame);
      }
      return { burst: burst, ring: ring, go: go, keep: false, clear: function () { P = []; RINGS = []; } };
    })();
    function after() {
      if (S.won) return win();
      if (SET.auto && D.autoNext) {
        var m = D.autoNext(S, G.keepDown);
        if (m) {
          busy = true;
          var my = gen;
          setTimeout(function () { if (my !== gen) return; busy = false; var fx = E.apply(S, m); if (fx) { logMove(m); effects(fx); render(); } after(); }, reduce ? 0 : pc(170));
          return;
        }
      }
      if (E.finishable && E.finishable(S)) { busy = true; say('Finishing it off for you…'); finSteps = 0; var mg = gen; setTimeout(function () { finish(mg); }, reduce ? 0 : pc(420)); return; }
      persist();
      if (G.started && stuckNow()) showStuck();
    }
    var finSteps = 0;
    function finish(my) {
      if (my !== gen) return;
      var m = E.finishStep(S);
      if (!m || ++finSteps > 900) { busy = false; persist(); return; }
      var fx = E.apply(S, m);
      if (fx) { logMove(m); effects(fx); render(); }
      if (S.won) { busy = false; return win(); }
      setTimeout(function () { finish(my); }, reduce ? 0 : pc(m.t === 'draw' ? 50 : 105));
    }
    function undo() {
      if (S && !S.won && !rules().undo) { say('No Undo at this level – every move counts!'); return; }
      if (!G.undo.length || !S || S.won || drag) return;   // after a win the scores are written: no taking it back
      if (busy) { gen++; busy = false; }   // cards still moving by themselves: stop them; the step comes back whole
      var u = G.undo.pop();
      selOff();
      S = u.s; G.undid++; G.keepDown = null;
      if (G.log) G.log.length = Math.min(G.log.length, u.n || 0);
      hideStuck(); unhint(); sfx('place');
      render(); persist();
    }

    // ------------------------------------------------------------ the hint
    var hintT = 0;
    function hint() {
      if (S && !S.won && !rules().hint) { say('No hints at this level – you’re on your own!'); return; }
      if (busy || !S || S.won) return;
      unhint();
      var m = E.hint(S);
      if (D.hintMove) m = D.hintMove(S, m);   // a game may plan ahead (Solitaire: a line that wins - solver.js)
      if (!m) { showStuck(); return; }
      G.hinted = (G.hinted || 0) + 1;
      var lit = D.hintLights(S, m), src = m.from ? (D.picked(S, m.from) || []) : [];
      // the card(s) to move glow; where they'd go glows softer (games audit, 5 Oct 2026); a tap on either makes the move
      (lit.cards || []).forEach(function (c) { if (cardEl[c]) cardEl[c].classList.add('hint', src.length && src.indexOf(c) < 0 ? 'hdest' : 'hsrc'); });
      (lit.slots || []).forEach(function (k) { if (slotEl[k]) slotEl[k].classList.add('hint', 'hdest'); });
      hintM = { m: m, cards: (lit.cards || []).slice(), slots: (lit.slots || []).slice() };
      if (lit.say) say(lit.say); else $('toast').classList.remove('on');   // (no stale message under a hint that has none)
      if (m._note) say(m._note);   // (the plan says no win is left from here)
      if (m.t === 'move' && arcsOn()) ghost(m);
      hintT = setTimeout(unhint, 2800);
    }
    // the Hint shows the move: see-through copies of the cards fly from where they are to where they'd go, twice
    function ghost(m) {
      var to = JSON.stringify(m.to), tg = (D.targets(S, m.from, L, lastP) || []).filter(function (t) { return JSON.stringify(t.to) === to; })[0];
      var cards = D.picked(S, m.from) || [];
      if (!tg || !cards.length || !lastP[cards[0]]) return;
      var b0 = lastP[cards[0]], my = gen;
      [0, 1].forEach(function (rep) {
        setTimeout(function () {
          // (the second showing only while that hint still stands - critic 3: after the move was made it flew a ghost off the table)
          if (my !== gen || (rep && (!hintM || hintM.m !== m))) return;
          cards.forEach(function (k, i) {
            var src = lastP[k]; if (!src || !cardEl[k]) return;
            var g = cardEl[k].cloneNode(true), dst = { x: tg.x + (src.x - b0.x), y: tg.y + (src.y - b0.y) };
            g.className = cardEl[k].className.replace(/\b(hint|hov|press|sel|can|hot|land|turn|fly|pop|shine|nope|flight)\b/g, '') + ' ghost';
            g.removeAttribute('data-c'); g.style.zIndex = 5000 + i; g.style.opacity = '0';
            board.appendChild(g);
            Table365.fly(g, src, dst, { end: 'translate3d(' + dst.x + 'px,' + dst.y + 'px,0)', delay: i * 30, dur: 640, land: false, noPace: true });
            g.animate([{ opacity: 0 }, { opacity: 0.85, offset: 0.12 }, { opacity: 0.85, offset: 0.78 }, { opacity: 0 }], { duration: 760, delay: i * 30, fill: 'both' });
            setTimeout(function () { g.remove(); }, 860 + i * 30);
          });
        }, rep * 950);
      });
    }
    var hintM = null;   // the move the Hint is showing, while it shows
    function unhint() { clearTimeout(hintT); hintM = null; Array.prototype.forEach.call(board.querySelectorAll('.hint'), function (e) { e.classList.remove('hint', 'hdest', 'hsrc'); }); }
    // stuck only when the game's planning Hint agrees there is no move left (Solitaire: the old quick check said 'No more
    // moves found' on deals the planning Hint could still win - games audit, 5 Oct 2026)
    function stuckNow() { if (!E.stuck(S)) return false; return D.hintMove ? !D.hintMove(S, null) : true; }
    function showStuck() { $('stuck').hidden = false; $('toast').classList.remove('on'); }   // (the old hint's message sat on the bar's buttons - critic 3)
    // ------------------------------------------------------------ the challenges (4 Oct 2026): Beat the clock, the 3-minute sprint
    function foundCount() { return D.foundCount ? D.foundCount(S) : 0; }
    function chal() {
      var el = $('chal'); if (!el) return;
      if (G && G.mode === 'journey' && window.Journey && !S.won && Journey.level(G.jl)) {
        el.hidden = false; el.className = 'chal jour';
        el.innerHTML = Journey.goalPill(G.jl, Math.round(G.ms / 1000), S.moves, G.undid, G.hinted);
        return;
      }
      if (!G || !G.limit || S.won) { el.hidden = true; return; }
      var left = Math.max(0, G.limit - G.ms), sp = G.mode === 'sprint';
      el.hidden = false;
      el.className = 'chal' + (left <= 30000 && !G.timeUp ? ' hurry' : '') + (G.timeUp ? ' done' : '');
      el.innerHTML = '<span class="ci" aria-hidden="true">' + (sp ? '&#9889;' : '&#9201;') + '</span><b>' + (G.timeUp ? (sp ? 'Sprint over' : 'Time&rsquo;s up') : clock(left + 999)) + '</b>'
        + '<span class="cl">' + (sp ? foundCount() + ' ' + SPW.pill : (G.timeUp ? 'keep playing for fun' : 'to beat the clock')) + '</span>';
    }
    function timeUp() {
      G.timeUp = true; chal(); persist();
      if (G.mode === 'sprint') {   // three minutes: the game stops and the cards are counted
        G.over = true; busy = false; gen++; hideStuck(); unhint(); sfx('win');
        var cards = foundCount();
        $('spCards').textContent = cards; $('spSub').textContent = 'Today\u2019s 3-minute sprint \u00b7 ' + (cards === 1 ? '1 card' : cards + ' cards') + ' ' + SPW.sub;
        openD('dSprint');
        if (window.HallOfFame && D.hof && cards > 0) HallOfFame.sprint($('spHof'), { day: G.day, secs: Math.round(G.limit / 1000), log: G.log, cards: cards });
        else $('spHof').hidden = true;
      } else { sfx('nope'); say('Time\u2019s up! The clock won this one \u2013 but you can keep playing.'); }
    }
    function hideStuck() { $('stuck').hidden = true; }

    // ------------------------------------------------------------ new games
    function today(d) { d = d || new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
    function dayNumber(d) { return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(2026, 0, 1)) / 864e5); }
    function dailySeed(v) {   // one deal for everyone today; a prime stride so the days don't run through the list in order
      var list = D.deals ? D.deals(v) : null, n = dayNumber(new Date());
      if (!list || !list.length) return 900000 + ((n % 90000) + 90000) % 90000;
      return list[((n * 7919) % list.length + list.length) % list.length];
    }
    function pickSeed(v) {
      var list = SET.winnable && D.deals ? D.deals(v) : null;
      if (!list || !list.length) return D.anySeed ? D.anySeed(v) : 1 + Math.floor(Math.random() * 999999);
      for (var tries = 0; tries < 25; tries++) { var s = list[Math.floor(Math.random() * list.length)]; if (ST.recent.indexOf(s) < 0) return s; }
      return list[Math.floor(Math.random() * list.length)];
    }
    function recordLoss() {
      if (!G || !G.started || G.counted || !S || S.won) return;
      ST.played++; ST.streak = 0; G.counted = true;
      save('stats', ST);
    }
    function newGame(mode, jl) {
      gen++; busy = false;   // stop anything still running from the last game
      selOff();
      recordLoss();
      var v = V ? SET[V.key] : 0, seed, day = '';
      if (mode === 'again') { seed = S.seed; v = vOf(S); if (G.mode === 'journey') jl = G.jl; mode = G.mode === 'daily' || G.mode === 'sprint' || G.mode === 'clock' || G.mode === 'journey' ? G.mode : 'deal'; day = mode === 'daily' || mode === 'sprint' ? G.day : ''; }
      else if (mode === 'journey' && window.Journey && Journey.level(jl)) { var jlv = Journey.level(jl); seed = jlv.seed; v = jlv.lv; }
      else if (mode === 'sprint') { day = today(); seed = D.sprintSeed ? D.sprintSeed(dayNumber(new Date())) : pickSeed(v); v = D.sprintLevel || v; }   // the same deal for everyone today
      else if (mode === 'shared') { seed = shared.seed; v = shared.v; mode = 'deal'; }
      else if (mode === 'daily') { day = today(); seed = dailySeed(v); }
      else seed = pickSeed(v);
      S = E.deal(seed, v);
      G = newG(mode, day);
      if (mode === 'journey') G.jl = jl;
      ST.recent.push(seed); if (ST.recent.length > 60) ST.recent.shift();
      save('stats', ST);
      closeSheets(); hideStuck(); unhint(); chal();
      fold(true); faces(); layout();
      dealOut();
      persist();
    }
    function dealOut() {   // every card starts on the deck, then they fly out one by one
      var P = D.positions(S, L), deck = D.deckPos(L), c;
      board.classList.add('instant');
      for (c = 0; c < D.cards; c++) {
        var el = cardEl[c]; clearTimeout(el._zt); el._zt = 0;
        el.style.visibility = ''; el.style.display = P[c] ? '' : 'none';
        el.style.transform = 'translate3d(' + deck.x + 'px,' + deck.y + 'px,0)'; el.classList.add('down'); el.style.zIndex = 10 + c;
      }
      void board.offsetWidth; board.classList.remove('instant');
      lastP = {};
      if (reduce) { render(true); return; }
      busy = true; bar();
      var my = gen, order = D.dealOrder(S), arcs = arcsOn(), step = (arcs ? Math.max(16, Math.min(34, 1400 / order.length)) : (order.length > 60 ? 26 : 44)) * PACE;   // the whole deal about 1.4 s (Relaxed)
      var wait = arcs ? riffle(deck, my) : 0;   // a quick riffle shuffle first
      order.forEach(function (c, k) {
        setTimeout(function () {
          if (my !== gen) return;
          var p = P[c], el = cardEl[c], endT = 'translate3d(' + p.x + 'px,' + p.y + 'px,0)';
          el.style.zIndex = 600 + k;
          if (k % 2 === 0) sfx('deal');
          if (arcs) {   // dealt in an arc, a little spin, turning face up in the air
            var an = Table365.fly(el, deck, p, { end: endT, dur: 330 + Math.min(160, Math.abs(p.x - deck.x) * 0.12), lift: 26, tilt: (p.x > deck.x ? 1 : -1) * 6 });
            if (p.up) setTimeout(function () { if (my === gen) { el.classList.remove('down'); turnOn(el); } }, Table365.flightTime(an) * 0.45);
            return;
          }
          el.style.transform = endT;
          flyOn(el);
          if (p.up) setTimeout(function () { if (my === gen) { el.classList.remove('down'); shineOn(el); } }, 200);
        }, wait + pc(80) + k * step);
      });
      setTimeout(function () { if (my !== gen) return; busy = false; render(); idle(); }, wait + pc(80) + order.length * step + pc(520));
    }
    // the riffle: the top of the deck splits into two halves that lean apart, then the cards fall back together one by
    // one from alternate sides - like shuffling a real pack. Returns how long it takes (ms).
    function riffle(deck, my) {
      var top = [], c;
      for (c = D.cards - 1; c >= 0 && top.length < 18; c--) if (cardEl[c].style.display !== 'none') top.push(cardEl[c]);
      var T = function (x, y, r) { return 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) rotate(' + r + 'deg)'; }, base = T(deck.x, deck.y, 0);
      top.forEach(function (el, j) {
        var side = j % 2 ? 1 : -1, dx = side * L.cw * 0.6, rise = -4 - (j >> 1) * 0.7, back = 0.58 + j * 0.02;
        el.animate([{ transform: base }, { transform: T(deck.x + dx, deck.y + rise, side * 9), offset: 0.3 }, { transform: T(deck.x + dx * 0.9, deck.y + rise, side * 7), offset: back - 0.06 },
          { transform: T(deck.x, deck.y - 2, 0), offset: back }, { transform: base }], { duration: pc(660), easing: 'ease-in-out' });
      });
      setTimeout(function () { if (my === gen) sfx('shuffle'); }, pc(280));
      return pc(680);
    }

    // ------------------------------------------------------------ winning
    function win() {
      busy = false;
      var secs = Math.max(1, Math.round(G.ms / 1000));
      S.score += D.winBonus ? D.winBonus(S, secs) : 100 + Math.round(Math.max(0, 1200 - secs) / 2);   // more for a quick one
      var rec = recordWin(secs);
      persist(); bar();
      sfx('win'); buzz([16, 60, 16, 60, 30, 80, 140]);   // the win: a little drum roll in the hand
      cascade(function () { showWin(rec); });
    }
    function recordWin(secs) {
      var key = vKey(vOf(S)), b = ST.best[key] || (ST.best[key] = {}), badges = [];
      ST.played++; ST.won++; ST.streak++;
      G.counted = true;
      if (ST.won === 1) badges.push('Your first win!');
      if ([10, 25, 50, 100, 250, 500, 1000].indexOf(ST.won) >= 0) badges.push(ST.won + ' games won!');
      if (ST.streak > ST.bestStreak) { ST.bestStreak = ST.streak; if (ST.streak >= 2) badges.push('Your longest winning streak: ' + ST.streak + ' in a row'); }
      else if (ST.streak >= 2) badges.push(ST.streak + ' wins in a row');
      if (b.time == null || secs < b.time) { if (b.time != null) badges.push('Your fastest win yet!'); b.time = secs; }
      if (b.moves == null || S.moves < b.moves) { if (b.moves != null) badges.push('Your fewest moves yet!'); b.moves = S.moves; }
      if (b.score == null || S.score > b.score) { if (b.score != null) badges.push('Your best score yet!'); b.score = S.score; }
      if (!G.undid) badges.push('Won without using Undo');
      if (G.mode === 'clock' && !G.timeUp) { ST.clocks = (ST.clocks || 0) + 1; badges.push('Beat the clock with ' + clock(G.limit - G.ms) + ' to spare!'); }
      if (G.mode === 'daily' && G.day) {
        ST.daily[G.day] = { won: 1, t: secs, m: S.moves, d: vOf(S) }; badges.push('Today’s deal: done!');
        var dn = dayStreak(); if (dn > (ST.dayBest || 0)) ST.dayBest = dn;   // the daily streak (6 Oct 2026)
        badges.push(dn >= 2 ? 'Daily streak: ' + dn + ' days in a row!' : 'Your daily streak has started – come back tomorrow for day 2');
      }
      save('stats', ST);
      return { secs: secs, badges: badges };
    }
    function showWin(rec) {
      $('dWinSub').textContent = 'Deal #' + S.seed + (D.describe ? ' · ' + D.describe(S) : '') + (G.mode === 'daily' ? ' · today’s deal' : '');
      $('wTime').textContent = clock(rec.secs * 1000); $('wMoves').textContent = S.moves; $('wScore').textContent = S.score;
      $('wBadges').innerHTML = rec.badges.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('');
      $('wDaily').hidden = !!(ST.daily[today()] && ST.daily[today()].won);
      $('wApp').hidden = !(appOK() && !appSnoozed());
      chal(); openD('dWin');
      Table365.countUp($('wScore'), S.score); Table365.countUp($('wMoves'), S.moves);   // the numbers count up
      var hb = $('wHof'); hb.hidden = true; hb.innerHTML = '';
      if (window.HallOfFame && D.hof && G.mode === 'daily') HallOfFame.daily(hb, { day: G.day, lv: vOf(S), secs: rec.secs, log: G.log });
      else if (window.HallOfFame && D.hof && G.mode === 'sprint' && !G.timeUp) HallOfFame.sprint(hb, { day: G.day, secs: rec.secs, log: G.log, cards: foundCount() });
      var jb = $('wJour'); jb.hidden = true; jb.innerHTML = '';
      if (window.Journey && D.journey && G.mode === 'journey') Journey.win(jb, G.jl, { secs: rec.secs, moves: S.moves, undid: G.undid, hinted: G.hinted || 0 });
    }
    // the classic finish: the cards leap off the piles and bounce away, leaving trails
    var imgCache = {};
    function cardImg(c) { var f = D.face(c, S); return paintCard(f.r, f.s, L.cw, L.ch); }   // the card as a picture (for the finishes)
    // fireworks over the bouncing cards
    var fwT = 0;
    function fireworks(on) {
      clearInterval(fwT); fwT = 0;
      var big = $('winBig');
      if (!on) { Spark.keep = false; $('spark').style.zIndex = ''; big.hidden = true; return; }
      $('spark').style.zIndex = '4550';
      big.innerHTML = 'You won!<small>' + esc(D.title) + (S.moves ? ' in ' + S.moves + ' moves' : '') + '</small>'; big.hidden = false;
      if (!SET.fx) return;
      var cols = [['#ffe08a', '#ffffff', '#ffb347'], ['#ff8ad8', '#ffffff', '#ff4fc8'], ['#8ff0ff', '#ffffff', '#3fe0ff'], ['#9dff9a', '#ffffff', '#5cff8a']];
      var shoot = function () {
        var cx = window.innerWidth * (0.15 + Math.random() * 0.7), cy = window.innerHeight * (0.12 + Math.random() * 0.35);
        Spark.burst(cx, cy, 60, cols[Math.floor(Math.random() * cols.length)], 5.2, 85, { grav: 0.05, size: 6 });
        Spark.ring(cx, cy, 60, '#ffffff', 24);
        sfx('firework');
      };
      shoot(); fwT = setInterval(shoot, 650);
    }
    function cascade(done) {   // the win celebration: the one chosen in Settings (or a surprise)
      fireworks(true);
      var finishCascade = done; done = function () { fireworks(false); finishCascade(); };
      if (reduce) { done(); return; }
      var br = board.getBoundingClientRect(), list = D.cascade(S, L).map(function (n) { var f = D.face(n.c, S); return { c: n.c, r: f.r, s: f.s, x: br.left + n.x, y: br.top + n.y }; });
      runFinale(Table365.pickFinale(SET.win), list, done, true);
    }
    // the finish itself; table = the cards leave the table (a win), not a pack in the middle (Settings > Watch)
    function runFinale(kind, list, done, table) {
      return Table365.finale(kind, { cards: list, cw: L.cw, ch: L.ch, cv: $('fx'), tip: $('fxhint'),
        hide: table ? function (i) { var el = cardEl[list[i].c]; if (el) el.style.visibility = 'hidden'; } : null,
        show: table ? function () { for (var i = 0; i < D.cards; i++) cardEl[i].style.visibility = ''; } : null,
        burst: function (x, y, cols, big) { if (!SET.fx) return; Spark.burst(x, y, big ? 64 : 14, cols, big ? 5.4 : 2, big ? 80 : 30, { grav: 0.05, size: 6 }); if (big) Spark.ring(x, y, 70, cols[0], 26); },
        trail: function (x, y, cols) { if (SET.fx) Spark.burst(x, y, 2, cols, 0.9, 22, { grav: 0.02, size: 4 }); },
        sfx: sfx, done: done, max: table ? 9000 : 0 });
    }

    // ------------------------------------------------------------ sound: soft, made on the spot, nothing downloaded
    var AC = null, NOISE = null, OUT = null, ROOM = null;
    function ac() {
      if (!SET.sound || !gestured) return null;
      try {
        if (!AC) {
          var C = window.AudioContext || window.webkitAudioContext; if (!C) return null; AC = new C();
          // one gentle limiter for everything, and a soft room echo for the chimes
          var comp = AC.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3.5; comp.attack.value = 0.005; comp.release.value = 0.2;
          OUT = AC.createGain(); OUT.gain.value = 0.95; OUT.connect(comp); comp.connect(AC.destination);
          // the room echo is built a moment later, not on the first tap (critic 3: a 130-170 ms stall on a phone's first
          // card - 65 ms of it making this echo); the first sounds just play dry
          setTimeout(function () { try {
            var cv = AC.createConvolver(), len = Math.floor(AC.sampleRate * 1.3), ir = AC.createBuffer(2, len, AC.sampleRate);
            for (var ch = 0; ch < 2; ch++) { var dd = ir.getChannelData(ch); for (var j = 0; j < len; j++) dd[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / len, 2.8); }
            cv.buffer = ir; var rm = AC.createGain(); rm.gain.value = 0.28; rm.connect(cv); cv.connect(OUT); ROOM = rm;
          } catch (er) { ROOM = null; } }, 600);
        }
        if (AC.state === 'suspended') AC.resume();
      } catch (e) { return null; }
      return AC;
    }
    function out(a, node, verb) { node.connect(OUT || a.destination); if (verb && ROOM) { var s = a.createGain(); s.gain.value = verb; node.connect(s); s.connect(ROOM); } }
    function tick(freq, dur, gain, q, when, to, type) {   // a filtered burst of noise: cards on felt
      var a = ac(); if (!a) return;
      try {
        if (!NOISE) { var len = Math.floor(a.sampleRate * 0.5); NOISE = a.createBuffer(1, len, a.sampleRate); var d = NOISE.getChannelData(0); for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; }
        var t = a.currentTime + (when || 0), s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
        s.buffer = NOISE; f.type = type || 'bandpass'; f.frequency.setValueAtTime(freq, t); if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur); f.Q.value = q || 1;
        g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
        s.connect(f); f.connect(g); out(a, g); s.start(t, Math.random() * 0.3); s.stop(t + dur + 0.03);
      } catch (e) {}
    }
    function tone(freq, dur, gain, when, type, verb) {
      var a = ac(); if (!a) return;
      try {
        var t = a.currentTime + (when || 0), o = a.createOscillator(), g = a.createGain();
        o.type = type || 'sine'; o.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); out(a, g, verb); o.start(t); o.stop(t + dur + 0.03);
      } catch (e) {}
    }
    var CHIME = [1047, 1175, 1319, 1397, 1568, 1760, 1976, 2093, 2349, 2637, 2794, 3136];   // up the scale, one card at a time
    function sfx(k, n) {
      if (!SET.sound) return;
      var i;
      if (k === 'place') { tick(700, 0.07, 0.6, 0.7, 0, 0, 'lowpass'); tone(150, 0.06, 0.05); }
      else if (k === 'slide') tick(2600, 0.16, 0.16, 0.8, 0, 900);
      else if (k === 'lift') tick(1800, 0.06, 0.12, 1.2, 0, 3000);
      else if (k === 'flip') { tick(3300, 0.04, 0.32, 1.6); tick(1600, 0.03, 0.18, 1); }
      else if (k === 'deal') tick(2300, 0.05, 0.26, 1.3, 0, 1400);
      else if (k === 'shuffle') { for (i = 0; i < 14; i++) tick(1800 + Math.random() * 1600, 0.035, 0.16, 1.3, i * 0.03); tick(900, 0.25, 0.12, 0.8, 0.45, 0, 'lowpass'); }
      else if (k === 'found') { var f = CHIME[Math.min(CHIME.length - 1, Math.max(0, (n || 1) - 1))]; tick(5200, 0.05, 0.2, 2); tone(f, 0.55, 0.045, 0.01, 'sine', 0.5); tone(f * 2, 0.3, 0.015, 0.02, 'triangle', 0.3); }
      else if (k === 'suit') [1047, 1319, 1568, 2093].forEach(function (fq, j) { tone(fq, 0.6, 0.045, 0.08 + j * 0.08, 'triangle', 0.55); });
      else if (k === 'nope') tone(196, 0.13, 0.06, 0, 'triangle');
      else if (k === 'firework') { tick(900, 0.5, 0.22, 0.6, 0, 120, 'lowpass'); tone(70, 0.3, 0.08, 0, 'sine'); for (i = 0; i < 6; i++) tick(5000 + Math.random() * 3000, 0.04, 0.05, 3, 0.25 + Math.random() * 0.35); }
      else if (k === 'win') { [523, 659, 784, 1047, 1319].forEach(function (fq, j) { tone(fq, 0.5, 0.06, j * 0.11, 'triangle', 0.5); tone(fq / 2, 0.5, 0.03, j * 0.11, 'sine'); }); tone(1568, 1.2, 0.05, 0.6, 'sine', 0.7); }
    }

    // ------------------------------------------------------------ pop-up sheets
    var openSheet = null, lastFocus = null;
    // Tab stays inside whichever dialog is open on top - ours, the Hall of Fame, the Journey, Looks, Share
    // (games audit, 5 Oct 2026); the last visible aria-modal in the page is the one on top
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var dl = [].filter.call(document.querySelectorAll('[aria-modal="true"]'), function (x) { return x.getClientRects().length > 0; }).pop();
      if (!dl) return;
      var f = [].filter.call(dl.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'), function (x) { return !x.disabled && x.getClientRects().length > 0; });
      if (!f.length) return;
      var i = f.indexOf(document.activeElement);
      if (e.shiftKey ? i <= 0 : (i < 0 || i === f.length - 1)) { e.preventDefault(); f[e.shiftKey ? f.length - 1 : 0].focus(); }
    }, true);
    function openD(id) {
      closeSheets();
      var d = $(id); d.hidden = false; openSheet = d; lastFocus = document.activeElement;
      // focus the main button without scrolling to it: on a phone a long sheet (How to play) would open at the bottom
      var f = d.querySelector('.btn.go') || d.querySelector('button'); if (f) f.focus({ preventScroll: true });
      var sh = d.querySelector('.sheet'); if (sh) sh.scrollTop = 0;
    }
    function closeSheets() {
      if (!openSheet) return;
      openSheet.hidden = true; openSheet = null;
      if (lastFocus && lastFocus.focus && lastFocus !== document.body && document.body.contains(lastFocus)) { try { lastFocus.focus(); } catch (e) {} }
      else { try { board.focus({ preventScroll: true }); } catch (e) {} }   // (a sheet that opened by itself: back to the cards)
    }
    document.addEventListener('click', function (e) {
      var t = e.target;
      if (t.closest && t.closest('[data-close]')) { closeSheets(); return; }
      if (t.classList && t.classList.contains('scrim')) closeSheets();
    });
    function openNew() {
      var inPlay = G.started && !S.won, dd = ST.daily[today()];
      $('dNewNote').textContent = inPlay ? 'The game you’re playing will count as not won.' : 'Choose how you’d like to play.';
      $('nDealS').textContent = SET.winnable && D.deals ? 'A fresh shuffle you can win' : 'A fresh shuffle';
      $('nDailyS').textContent = (dd && dd.won ? 'Done today ✔ — play it again if you like' : 'The same deal for everyone today') + (D.hof ? ' · race the Hall of Fame' : '');
      $('nAgainS').textContent = 'Deal #' + S.seed + ', from the beginning';
      if (window.Journey && D.journey && $('nJourS')) { var jt = Journey.total(); $('nJourS').textContent = Journey.count() + ' levels ' + (D.journey.where || 'along the Dorset coast') + ' \u00b7 \u2605 ' + jt.stars + ' of ' + jt.max; }
      syncControls();
      openD('dNew');
    }
    function tile(v, label) { return '<div class="tile"><b>' + esc(v) + '</b><span>' + esc(label) + '</span></div>'; }
    function openStats() {
      var rate = ST.played ? Math.round(100 * ST.won / ST.played) + '%' : '–', days = 0, k;
      for (k in ST.daily) if (ST.daily[k] && ST.daily[k].won) days++;
      $('sTiles').innerHTML = tile(ST.won, 'Games won') + tile(rate, 'Win rate') + tile(ST.played, 'Games played')
        + tile(ST.streak, 'Winning streak') + tile(ST.bestStreak, 'Longest streak') + tile(days, 'Today’s deals done') + (D.hof ? tile(ST.clocks || 0, 'Clocks beaten') : '');
      var wk = '', d = new Date(), names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      for (var i = 6; i >= 0; i--) {
        var x = new Date(d.getFullYear(), d.getMonth(), d.getDate() - i), key = today(x), won = ST.daily[key] && ST.daily[key].won;
        wk += '<div class="' + (won ? 'won' : '') + (i === 0 ? ' today' : '') + '"><b>' + (won ? '✔' : '•') + '</b>' + names[x.getDay()] + ' ' + x.getDate() + '</div>';
      }
      $('sWeek').innerHTML = wk;
      var dash = function (v, f) { return v == null ? '–' : (f ? f(v) : v); }, sec = function (s) { return clock(s * 1000); }, out = '';
      var opts = V ? V.options : [[0, '']];
      opts.forEach(function (o, n) {
        var b = ST.best[vKey(o[0])] || {}, lab = V ? ', ' + (V.bestLabel ? V.bestLabel(o[0]) : o[1]) : '';
        if (n > 0 && b.time == null) return;   // the other options only once they have a win
        out += tile(dash(b.time, sec), 'Fastest win' + lab) + tile(dash(b.moves), 'Fewest moves' + lab) + tile(dash(b.score), 'Best score' + lab);
      });
      $('sBest').innerHTML = out;
      openD('dStats');
    }
    function syncControls() {
      if (V) Array.prototype.forEach.call(document.querySelectorAll('[data-var]'), function (b) { b.setAttribute('aria-pressed', String(+b.getAttribute('data-var') === SET[V.key])); });
      Array.prototype.forEach.call(document.querySelectorAll('[data-set]'), function (b) { b.setAttribute('aria-checked', String(!!SET[b.getAttribute('data-set')])); });
      Array.prototype.forEach.call(document.querySelectorAll('[data-pace]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-pace') === SET.pace)); });
      Array.prototype.forEach.call(document.querySelectorAll('[data-felt]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-felt') === SET.felt)); });
      Array.prototype.forEach.call(document.querySelectorAll('[data-back]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-back') === SET.back)); });
      // (keeps the phone marks: fs365 = can go full screen, rich365 = a strong phone, fold365 = the bar folded - 6 Oct 2026)
      document.body.className = 'felt-' + SET.felt + ' back-' + SET.back + (SET.fx ? '' : ' nofx') + ['fs365', 'rich365', 'fold365', 'app365'].filter(function (k) { return document.body.classList.contains(k); }).map(function (k) { return ' ' + k; }).join('');
      if ($('sWin')) $('sWin').value = SET.win;
      var pv = $('sLookPv'); if (pv) { pv.className = 'lkpv lk-f-' + SET.felt; pv.firstChild.className = 'lk-b-' + SET.back; }
    }
    document.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-var],[data-set],[data-felt],[data-back],[data-pace]') : null; if (!b) return;
      if (b.hasAttribute('data-pace')) { SET.pace = b.getAttribute('data-pace'); setPace(); }
      else if (b.hasAttribute('data-var')) SET[V.key] = +b.getAttribute('data-var');
      else if (b.hasAttribute('data-set')) { var k = b.getAttribute('data-set'); SET[k] = !SET[k]; if (k === 'timer') bar(); }
      else if (b.hasAttribute('data-back')) SET.back = b.getAttribute('data-back');
      else SET.felt = b.getAttribute('data-felt');
      if ((b.hasAttribute('data-felt') || b.hasAttribute('data-back')) && window.Looks) Looks.remember(SET.felt, SET.back);
      save('settings', SET); syncControls();
    });

    // ------------------------------------------------------------ buttons and keys
    // Settings > Win celebration: the choice, and Watch - a whole pack does it in the middle of the screen
    $('sWin').addEventListener('change', function () { SET.win = $('sWin').value; save('settings', SET); });
    $('sWinTry').onclick = function () {
      closeSheets();
      var sp = $('spark'); sp.style.zIndex = '4550';
      runFinale(Table365.pickFinale(SET.win), Table365.packAtCentre(L.cw, L.ch), function () { sp.style.zIndex = ''; }, false);
    };
    if (window.Looks) $('sLooks').onclick = function () {
      closeSheets();
      Looks.open({ felt: SET.felt, back: SET.back, pick: function (kind, id) { if (kind === 'felt') SET.felt = id; else SET.back = id; save('settings', SET); syncControls(); } });
    };
    $('bNew').onclick = openNew;
    $('bUndo').onclick = undo;
    $('bHint').onclick = hint;
    $('bStats').onclick = openStats;
    $('bSet').onclick = function () { syncControls(); openD('dSet'); };
    $('bHelp').onclick = function () { openD('dHelp'); };
    // the site's Text size / High contrast / Reduce motion, in Settings too (a11y365.js; games audit, 5 Oct 2026)
    if (window.A11y365) { A11y365.mount($('dSet').querySelector('.sheet')); A11y365.onReduce = function (on) { reduce = on || !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); }; }
    $('skip365').onclick = function (e) { e.preventDefault(); board.focus(); };   // the first Tab stop (games audit, 5 Oct 2026)
    // More (phones): the bar's tucked-away buttons, as big buttons with words (games audit, 5 Oct 2026)
    $('bMore').onclick = function () {
      $('moreL').innerHTML = ['bNew', 'bGames', 'bApp', 'bHint', 'bHelp', 'bStats', 'bSet', 'bShare', 'bFeed', 'bFull'].filter(function (id) { return $(id) && !$(id).hidden && !$(id).getClientRects().length; }).map(function (id) {
        var b = $(id); return '<button class="btn wide morei' + (id === 'bNew' ? ' go' : '') + '" type="button" data-for="' + id + '">' + b.querySelector('svg').outerHTML + '<span>' + esc(b.querySelector('.lbl').textContent) + '</span></button>';
      }).join('');
      var mh = $('dMore').querySelector('h2'); if (mh) mh.textContent = document.body.classList.contains('fold365') ? 'Menu' : 'More';   // (the folded bar calls it Menu)
      openD('dMore');
    };
    $('moreL').onclick = function (e) { var b = e.target.closest && e.target.closest('[data-for]'); if (!b) return; closeSheets(); var t = $(b.getAttribute('data-for')); setTimeout(function () { t.click(); }, 0); };
    $('bBrand').onclick = function () { $('bGames').click(); };
    $('nDeal').onclick = function () { newGame('deal'); };
    $('nDaily').onclick = function () { newGame('daily'); };
    $('nAgain').onclick = function () { newGame('again'); };
    $('wAgain').onclick = function () { newGame('deal'); };
    $('wDaily').onclick = function () { newGame('daily'); };
    $('wStats').onclick = openStats;

    // ---- the daily streak (owner, 6 Oct 2026): days in a row today's deal was won, counted back from today - or from
    // yesterday while today's is still to play, so the streak lives until midnight
    function dayStreak() {
      var d = new Date(), n = 0, i, x;
      if (!(ST.daily[today(d)] && ST.daily[today(d)].won)) d = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
      for (i = 0; i < 1000; i++) { x = new Date(d.getFullYear(), d.getMonth(), d.getDate() - i); if (ST.daily[today(x)] && ST.daily[today(x)].won) n++; else break; }
      return n;
    }
    function doneToday() { var t = ST.daily[today()]; return !!(t && t.won); }
    function streakChip() {
      var c = $('chipStreak'); if (!c) return;
      var n = dayStreak(), done = doneToday();
      $('vStreak').textContent = n;
      c.classList.toggle('cold', !n && !done); c.classList.toggle('due', !!n && !done);
      c.title = done ? 'Daily streak: ' + n + (n === 1 ? ' day' : ' days') + ' - today’s deal is done' : n ? 'Daily streak: ' + n + (n === 1 ? ' day' : ' days') + ' - play today’s deal to keep it going' : 'Daily streak: win today’s deal to start one';
    }
    function openStreak() {
      var n = dayStreak(), done = doneToday(), best = Math.max(ST.dayBest || 0, n), wk = '', d = new Date(), names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      $('kN').textContent = n;
      $('kSub').textContent = (n === 1 ? '1 day in a row' : n + ' days in a row') + (best > n ? ' · your best: ' + best : n ? ' · your best yet!' : '');
      for (var i = 6; i >= 0; i--) {
        var x = new Date(d.getFullYear(), d.getMonth(), d.getDate() - i), key = today(x), won = ST.daily[key] && ST.daily[key].won;
        wk += '<div class="' + (won ? 'won' : '') + (i === 0 ? ' today' : '') + '"><b>' + (won ? '✔' : '•') + '</b>' + names[x.getDay()] + ' ' + x.getDate() + '</div>';
      }
      $('kWeek').innerHTML = wk;
      var inPlay = G.started && !S.won && G.mode !== 'daily';
      $('kNote').textContent = done ? 'Today’s deal is done ✔ Come back tomorrow to make it ' + (n + 1) + '.'
        : (n ? 'Win today’s deal to make it ' + (n + 1) + '.' : 'Win today’s deal to start your streak.') + ' The same deal for everyone today.' + (inPlay ? ' (The game you’re playing will count as not won.)' : '');
      $('kPlay').hidden = done;
      $('kPlay').textContent = G.mode === 'daily' && G.day === today() && G.started && !S.won ? 'Carry on with today’s deal' : 'Play today’s deal';
      openD('dStreak');
    }
    $('chipStreak').onclick = openStreak;
    $('kPlay').onclick = function () { if (G.mode === 'daily' && G.day === today() && G.started && !S.won) { closeSheets(); return; } newGame('daily'); };
    // a gentle word once a day while a streak is waiting on today's deal
    setTimeout(function () {
      try { var n = dayStreak(); if (!n || doneToday() || localStorage.getItem('cards365:stk') === today()) return; localStorage.setItem('cards365:stk', today());
        say('Your ' + n + '-day streak: win today’s deal to keep it going (tap the flame)'); } catch (e) {}
    }, 3200);

    // ---- play it like an app (owner, 6 Oct 2026: "do the install like an app"): the game's own manifest opens it full
    // screen from the home screen. Android: Chrome's own install prompt; otherwise the steps for this browser.
    var MAN = document.querySelector('link[rel="manifest"]'), deferredApp = null, UA = navigator.userAgent || '';
    var IOS = /iPad|iPhone|iPod/.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1), INAPP = /FBAN|FBAV|FB_IAB|FBIOS|Instagram|Messenger/i.test(UA);
    var APPMODE = !!(window.matchMedia && (matchMedia('(display-mode: fullscreen)').matches || matchMedia('(display-mode: standalone)').matches)) || navigator.standalone === true;
    if (APPMODE) document.body.classList.add('app365');
    function appHave() { try { return localStorage.getItem('cards365:app:' + D.id) === '1'; } catch (e) { return false; } }
    function appSnoozed() { try { return Date.now() - (+localStorage.getItem('cards365:appno') || 0) < 14 * 864e5; } catch (e) { return false; } }
    function appOK() { return !!MAN && !APPMODE && !appHave() && !!(window.matchMedia && matchMedia('(pointer: coarse)').matches); }
    function appDone() { try { localStorage.setItem('cards365:app:' + D.id, '1'); } catch (e) {} $('bApp').hidden = true; $('wApp').hidden = true; }
    var SHARE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-label="Share"><path d="M12 3v12"/><path d="m7 8 5-5 5 5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>';
    function appSteps() {
      if (INAPP) return 'You&rsquo;re in Facebook&rsquo;s built-in browser, which can&rsquo;t do this. Tap <b>&#8943;</b> at the top right, choose <b>' + (IOS ? 'Open in Safari' : 'Open in browser') + '</b>, then come back here.';
      if (IOS) return '1. Tap the <b>Share</b> button ' + SHARE + '.<br>2. Scroll down and tap <b>Add to Home Screen</b>.<br>3. Tap <b>Add</b>.';
      if (/SamsungBrowser/i.test(UA)) return 'Tap the <b>menu</b> (&#9776;, bottom right), then <b>Add page to</b> &rarr; <b>Home screen</b>.';
      if (/Android/i.test(UA)) return 'Tap <b>&#8942;</b> at the top right of Chrome, then <b>Add to home screen</b> (or <b>Install app</b>) and <b>Install</b>.';
      return 'Use your browser&rsquo;s menu to <b>install</b> this page as an app.';
    }
    function addApp() {
      if (deferredApp) { var dp = deferredApp; deferredApp = null; try { dp.prompt(); dp.userChoice.then(function (r) { if (r && r.outcome === 'accepted') appDone(); }); } catch (e) {} return; }
      $('appWhy').textContent = D.title + ' on your home screen: one tap opens it full screen, with no address bar - like an app.';
      $('appHow').innerHTML = appSteps(); openD('dApp');
    }
    $('bApp').hidden = !appOK();
    $('bApp').onclick = addApp;
    $('wAppAdd').onclick = function () { closeSheets(); addApp(); };
    $('wAppNo').onclick = function () { try { localStorage.setItem('cards365:appno', String(Date.now())); } catch (e) {} $('wApp').hidden = true; };
    window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferredApp = e; });
    window.addEventListener('appinstalled', appDone);
    if (D.hof) {
      $('nClock').onclick = function () { newGame('clock'); };
      $('nSprint').onclick = function () { newGame('sprint'); };
      var hofOpen = function (o) { closeSheets(); if (window.HallOfFame) HallOfFame.open(o || {}); };
      $('nHof').onclick = function () { hofOpen(); };
      $('sHof').onclick = function () { hofOpen(); };
      $('spHofB').onclick = function () { hofOpen({ board: 'sprint' }); };
      $('spNew').onclick = openNew;
      if (D.journey && window.Journey) {
        Journey.init({ game: D.id, store: D.store, title: D.title, data: D.journey,
          lvName: function (lv) { return D.journeyLevelName ? D.journeyLevelName(lv) : ''; },
          onPlay: function (i) { closeSheets(); newGame('journey', i); },
          onWin: function (n) { if (n === 3 && SET.fx && !reduce) { var r = document.querySelector('#wJour .bigst'); if (r) { var b = r.getBoundingClientRect(); setTimeout(function () { Spark.burst(b.left + b.width / 2, b.top + b.height / 2, 80, ['#ffe08a', '#ffffff', '#ffb347'], 6, 90); }, 1100); } } } });
        $('nJourney').onclick = function () { closeSheets(); Journey.open(); };
      }
      if (window.HallOfFame) HallOfFame.init({ game: D.id, title: D.title, sprintBoard: SPW.board, levels: V ? V.options.map(function (o) { return [o[0], V.newLabel ? V.newLabel(o[0]) : o[1]]; }) : [[0, '']],
        level: function () { return V ? SET[V.key] : 0; }, sfx: function (k, n) { sfx(k, n); },
        burst: function (x, y, place) { if (SET.fx && !reduce) { Spark.burst(x, y, place === 1 ? 90 : 50, ['#ffe08a', '#ffffff', '#ffb347', '#8ff0ff'], 6, 90); Spark.ring(x, y, 120, '#ffe08a', 40); } },
        onPlay: function (m) { newGame(m === 'sprint' ? 'sprint' : 'daily'); } });
    }
    // sharing and feedback (social.js): the bar's two buttons, and the challenge on the win card - the same cards for a friend
    if (window.GameSocial) GameSocial.init({ id: D.id, title: D.title });
    $('bShare').onclick = function () { if (window.GameSocial) GameSocial.share(); };
    $('bGames').onclick = function () { if (window.GameSocial && GameSocial.openGames) GameSocial.openGames(); else location.href = '/games/'; };
    $('bFeed').onclick = function () { if (window.GameSocial) GameSocial.openFeedback('feedback'); };
    if (!window.GameSocial) { $('bShare').hidden = true; $('bFeed').hidden = true; $('wShare').hidden = true; }
    $('wShare').onclick = function () {
      if (!window.GameSocial || !S) return;
      var secs = Math.max(1, Math.round(G.ms / 1000)), daily = G.mode === 'daily';
      var lvl = V && V.info && V.newLabel ? ' (' + V.newLabel(vOf(S)) + ')' : '';
      var text = 'I won ' + (daily ? 'today’s ' + D.title + lvl + ' deal' : D.title + lvl + ' deal #' + S.seed) + ' in ' + clock(secs * 1000) + (S.moves ? ' with ' + S.moves + ' moves' : '')
        + ' – can you beat me? Play the same cards, free with no adverts:';
      GameSocial.share({ text: text, query: '?deal=' + S.seed + (V ? '&v=' + vOf(S) : '') });
    };
    $('stUndo').onclick = undo;
    $('stNew').onclick = openNew;
    $('sReset').onclick = function () { openD('dReset'); };
    $('rYes').onclick = function () { ST = blankStats(); save('stats', ST); G.counted = true; closeSheets(); say('Your scores have been cleared'); };
    function toggleFull() { try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); } catch (e) {} }
    $('bFull').onclick = toggleFull;
    if (!document.fullscreenEnabled) $('bFull').hidden = true; else document.body.classList.add('fs365');
    document.addEventListener('fullscreenchange', function () { $('bFullL').textContent = document.fullscreenElement ? 'Leave full screen' : 'Full screen'; var q = $('bFull').querySelector('.sl'); if (q) q.textContent = document.fullscreenElement ? 'Exit' : 'Full'; });
    document.addEventListener('keydown', function (e) {
      gestured = true;
      if (e.defaultPrevented || (window.GameSocial && GameSocial.isOpen()) || (window.HallOfFame && HallOfFame.isOpen()) || (window.Journey && Journey.isOpen()) || (window.Looks && Looks.isOpen())) return;   // typing feedback / initials, or a key a sheet used
      if (e.key === 'Escape') { if (openSheet) closeSheets(); return; }
      if (openSheet || e.altKey) return;
      var k = (e.key || '').toLowerCase();
      if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); undo(); return; }
      if (e.ctrlKey || e.metaKey) return;
      if (k === 'u') undo();
      else if (k === 'h') hint();
      else if (k === 'n') openNew();
      else if (k === 'f') toggleFull();
      else if ((k === ' ' || k === 'd') && D.hasStock && !(e.target.closest && e.target.closest('button'))) { e.preventDefault(); act({ t: 'draw' }); }
    });

    // ------------------------------------------------------------ little messages, the clock, saving
    var sayT = 0;
    function say(t) {
      var el = $('toast'); if (!t) return;
      el.textContent = t; el.classList.add('on'); clearTimeout(sayT);
      sayT = setTimeout(function () { el.classList.remove('on'); }, Math.min(7000, 1800 + t.length * 55));   // time to read it
    }
    function persist() {
      save('game', { s: S, g: { undo: G.undo.slice(-60), ms: G.ms, mode: G.mode, day: G.day, started: G.started, counted: G.counted, undid: G.undid, log: G.log || [], timeUp: G.timeUp, over: G.over, jl: G.jl, hinted: G.hinted || 0 } });
    }
    var lastTick = Date.now();
    setInterval(function () {
      var now = Date.now(), d = Math.min(2000, now - lastTick); lastTick = now;
      if (!G || !G.started || S.won || G.over || document.hidden || openSheet || (window.GameSocial && GameSocial.isOpen()) || (window.HallOfFame && HallOfFame.isOpen()) || (window.Journey && Journey.isOpen()) || (window.Looks && Looks.isOpen())) return;
      G.ms += d;
      if (G.limit) { chal(); if (G.ms >= G.limit && !G.timeUp) timeUp(); }
      else if (G.mode === 'journey') chal();
      $('vTime').textContent = clock(G.ms);
    }, 1000);
    document.addEventListener('visibilitychange', function () { if (document.hidden && S) persist(); });
    window.addEventListener('pagehide', function () { if (S) persist(); });
    var rz = 0;
    window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(function () { fold(true); layout(); render(true); }, 120); });
    // the bar can wrap to a second row after the table was laid out (the game's name, the chips filling in): lay the
    // table out again whenever its own size changes (critic 5: Hearts opened with a quarter of the hand off the screen)
    // a phone held sideways: one tip a visit (critic 5: the cards got very small)
    function sideTip() { try { if (D.sidewaysOK || sessionStorage.getItem('tip365side')) return; if (window.matchMedia && matchMedia('(orientation: landscape) and (max-height: 450px) and (pointer: coarse)').matches) { say('Tip: turn your phone upright for bigger cards'); sessionStorage.setItem('tip365side', '1'); } } catch (e) {} }
    setTimeout(sideTip, 2600); window.addEventListener('orientationchange', function () { setTimeout(sideTip, 700); });
    var LW, LH;   // (declared here, set by layout() - no initial value, or it would wipe the first layout's)
    if (window.ResizeObserver) new ResizeObserver(function () { if (Math.abs(board.clientWidth - LW) < 2 && Math.abs(board.clientHeight - LH) < 2) return; clearTimeout(rz); rz = setTimeout(function () { var g = glide; glide = false; layout(); render(!g); }, 60); }).observe(board);

    // ------------------------------------------------------------ start
    syncControls();
    // a friend's challenge: ?deal=48213 (and &v= for Solitaire's draw or Spider's suits) opens exactly those cards
    var shared = null;
    try {
      var q = new URLSearchParams(location.search), dn = parseInt(q.get('deal'), 10), dv = parseInt(q.get('v'), 10);
      if (dn > 0 && dn < 10000000) shared = { seed: dn, v: V ? (V.options.some(function (o) { return o[0] === dv; }) ? dv : SET[V.key]) : 0 };
      if (q.has('deal') && window.history && history.replaceState) history.replaceState(null, '', location.pathname);   // a reload carries on, not restarts
    } catch (e) {}
    // from the Games page: ?daily=1 plays Today's deal, ?hof=1 opens the Hall of Fame
    var ask = {};
    try {
      var qa = new URLSearchParams(location.search); ask.daily = qa.get('daily') === '1'; ask.hof = qa.get('hof') === '1';
      if ((qa.has('daily') || qa.has('hof')) && window.history && history.replaceState) history.replaceState(null, '', location.pathname);
    } catch (e) {}
    var saved = load('game', null);
    if (saved && saved.s && saved.g && !saved.s.won && D.valid(saved.s)) {
      S = saved.s; G = newG(saved.g.mode, saved.g.day);
      G.undo = Array.isArray(saved.g.undo) ? saved.g.undo : []; G.ms = +saved.g.ms || 0; G.started = !!saved.g.started; G.counted = !!saved.g.counted; G.undid = +saved.g.undid || 0;
      G.log = Array.isArray(saved.g.log) ? saved.g.log : []; G.timeUp = !!saved.g.timeUp; G.over = !!saved.g.over;
      G.jl = typeof saved.g.jl === 'number' ? saved.g.jl : undefined; G.hinted = +saved.g.hinted || 0;
      fold(true); faces(); layout(); render(true);
      if (G.started && stuckNow()) showStuck();
    } else {
      S = E.deal(1, V ? SET[V.key] : 0); G = newG('deal', '');   // a placeholder for the first layout; replaced straight away
      faces(); layout();
      newGame('deal');
    }
    if (shared) { newGame('shared'); say('Deal #' + shared.seed + ' – the same cards your friend played. Good luck!'); }
    else if (ask.daily && !(G.mode === 'daily' && G.day === today())) newGame('daily');   // today's deal already under way: carry on with it
    if (!SET.seenHelp) { SET.seenHelp = true; save('settings', SET); if (!ask.hof) openD('dHelp'); }
    if (ask.hof && D.hof && window.HallOfFame) { closeSheets(); HallOfFame.open({}); }
    // read-only, for the tests (and later PC Manager): the game as it stands, and whether an automatic run is going
    var hook = { get state() { return E.clone(S); }, get busy() { return busy || !!drag; }, get won() { return !!(S && S.won); } };
    window.GAME365 = hook;
    if (D.id === 'solitaire') window.SOL365 = hook;

    // ------------------------------------------------------------ the page's bar, table and sheets
    function buildUI() {
      var v = V ? V.options.map(function (o) { return '<button type="button" data-var="' + o[0] + '">' + esc(o[1]) + '</button>'; }).join('') : '';
      var vNew = V ? V.options.map(function (o, i) {
        if (!V.info) return '<button type="button" data-var="' + o[0] + '">' + esc(V.newLabel ? V.newLabel(o[0]) : o[1]) + '</button>';
        var st = V.stars ? V.stars(o[0]) : 0, stars = '';
        for (var k = 1; k <= V.options.length; k++) stars += '<i class="' + (k <= st ? 'on' : '') + '"></i>';
        return '<button type="button" data-var="' + o[0] + '" style="--i:' + i + '"><span class="lvtop"><b>' + esc(V.newLabel ? V.newLabel(o[0]) : o[1]) + '</b><span class="lvst" aria-hidden="true">' + stars + '</span></span><small>' + esc(V.info(o[0])) + '</small></button>';
      }).join('') : '';
      var tb = function (id, icon, label, title, cls) { return '<button class="tb' + (cls ? ' ' + cls : '') + '" id="' + id + '" type="button" title="' + esc(title) + '">' + ICON[icon] + '<span class="lbl"' + (id === 'bFull' ? ' id="bFullL"' : '') + '>' + esc(label) + '</span>'
        + ({ bNew: 'New', bGames: 'Games', bUndo: 'Undo', bHint: 'Hint', bHelp: 'Help', bPause: 'Pause', bMore: 'More', bFull: 'Full' }[id] ? '<span class="sl" aria-hidden="true">' + { bNew: 'New', bGames: 'Games', bUndo: 'Undo', bHint: 'Hint', bHelp: 'Help', bPause: 'Pause', bMore: 'More', bFull: 'Full' }[id] + '</span>' : '') + '</button>'; };
      var html = '<a class="skip365" href="#board" id="skip365">Skip to the cards</a><div id="app"><header class="bar"><h1 class="brand"><button class="brandb" type="button" id="bBrand" title="All our games"><b>365</b> <span>' + esc(D.title) + '</span><i class="caret" aria-hidden="true">&#9662;</i></button></h1>'
        + '<div class="info" aria-live="off"><div class="chip" id="chipTime"><small>Time</small><span id="vTime">0:00</span></div><div class="chip"><small>Moves</small><span id="vMoves">0</span></div><div class="chip"><small>Score</small><span id="vScore">0</span></div>'
        + '<button class="chip chipst cold" id="chipStreak" type="button" title="Daily streak: days in a row you won today&rsquo;s deal"><small>Streak</small><span>' + ICON.flame + '<b id="vStreak">0</b></span></button></div>'
        + '<nav class="tools" aria-label="Game">' + tb('bNew', 'new', 'New game', 'New game (N)', 'main') + tb('bGames', 'games', 'Games', 'Switch to another of our games', 'tb3') + tb('bUndo', 'undo', 'Undo', 'Undo (U or Ctrl+Z)') + tb('bHint', 'hint', 'Hint', 'Show me a move (H)')
        + tb('bStats', 'stats', 'My scores', 'My scores', 'tb3 tbx') + tb('bSet', 'set', 'Settings', 'Settings', 'tb3 tbx') + tb('bHelp', 'help', 'How to play', 'How to play')
        + tb('bShare', 'share', 'Share', 'Share this game with a friend', 'tb2 tbx') + tb('bFeed', 'feedback', 'Feedback', 'Tell us what you think, or ask for a new game', 'tb2 tbx') + tb('bFull', 'full', 'Full screen', 'Full screen (F)', 'tb2 tbx') + tb('bApp', 'app', 'Add to home screen', 'Play it like an app: full screen, one tap from your home screen', 'tbx tbapp') + tb('bMore', 'more', 'More', 'More: my scores, settings, share, feedback', 'tbmore') + '</nav></header>'
        + '<main id="board" aria-label="The card table"></main></div>'
        + '<div id="stuck" hidden role="status"><span>' + esc(D.stuckText || 'No more moves found.') + '</span><button class="btn" type="button" id="stUndo">Undo</button><button class="btn go" type="button" id="stNew">New game</button></div>'
        + '<div id="chal" class="chal" hidden role="timer" aria-live="off"></div><div id="toast" role="status" aria-live="polite"></div><canvas id="spark" aria-hidden="true"></canvas><canvas id="fx" hidden></canvas><div id="winBig" hidden aria-hidden="true"></div><div id="fxhint" hidden>Tap anywhere to carry on</div>'
        + sheet('dMore', 'More', '<div class="morel" id="moreL"></div>')
        + sheet('dNew', 'New game', '<p class="soft" id="dNewNote"></p>' + (V ? (V.info ? '<div class="lvls" role="group" aria-label="' + esc(V.label) + '">' + vNew + '</div>' : '<div class="seg" role="group" aria-label="' + esc(V.label) + '">' + vNew + '</div>') : '')
          + '<div class="choice"><button class="btn go" type="button" id="nDeal">New deal<small id="nDealS">A fresh shuffle</small></button>'
          + '<button class="btn" type="button" id="nDaily">Today&rsquo;s deal<small id="nDailyS">The same deal for everyone today</small></button>'
          + '<button class="btn" type="button" id="nAgain">Play this deal again<small id="nAgainS">Start the same cards from the beginning</small></button></div>'
          + (D.hof ? '<p class="chalh">Challenges</p><div class="choice chals">' + (D.journey ? '<button class="btn jourbtn" type="button" id="nJourney">&#129517; The Journey<small id="nJourS">100 levels ' + esc(D.journey.where || 'along the Dorset coast') + '</small></button>' : '') + '<button class="btn" type="button" id="nClock">&#9201; Beat the clock<small>' + (D.clockText || 'Win a fresh deal in 5 minutes, at your level') + '</small></button>'
            + '<button class="btn" type="button" id="nSprint">&#9889; 3-minute sprint<small>' + SPW.line + ' &middot; the same deal for everyone today</small></button>'
            + '<button class="btn hofbtn" type="button" id="nHof">&#127942; Hall of Fame<small>Who&rsquo;s fastest today &mdash; in Dorset and beyond</small></button></div>' : '')
          + '<div class="row"><button class="btn wide" type="button" data-close>Keep playing</button></div>')
        + sheet('dWin', 'You won!', '<p class="soft" id="dWinSub"></p><div class="tiles"><div class="tile"><b id="wTime">0:00</b><span>Time</span></div><div class="tile"><b id="wMoves">0</b><span>Moves</span></div><div class="tile"><b id="wScore">0</b><span>Score</span></div></div>'
          + '<ul class="badges" id="wBadges"></ul><div id="wJour" hidden></div><div id="wHof" hidden></div>'
          + '<div class="wapp" id="wApp" hidden>' + ICON.app + '<p><b>Play it like an app</b> &mdash; full screen, one tap from your home screen.</p><button class="btn go" type="button" id="wAppAdd">Add to home screen</button><button class="linkb" type="button" id="wAppNo">Not now</button></div>'
          + '<div class="row"><button class="btn go wide" type="button" id="wAgain">Play again</button><button class="btn wide" type="button" id="wShare">Challenge a friend</button><button class="btn wide" type="button" id="wDaily">Today&rsquo;s deal</button><button class="btn wide" type="button" id="wStats">My scores</button></div>')
        + sheet('dStreak', 'Daily streak', '<div class="stk"><div class="stkbig">' + ICON.flame + '<b id="kN">0</b></div><p class="stksub" id="kSub"></p><div class="week" id="kWeek"></div><p class="soft" id="kNote"></p>'
          + '<div class="row"><button class="btn go wide" type="button" id="kPlay">Play today&rsquo;s deal</button></div></div>')
        + sheet('dApp', 'Play it like an app', '<p class="soft" id="appWhy"></p><p class="apphow" id="appHow"></p><div class="row"><button class="btn wide" type="button" data-close>OK</button></div>')
        + sheet('dSprint', 'Time\u2019s up!', '<p class="soft" id="spSub"></p><div class="tiles"><div class="tile"><b id="spCards">0</b><span>Cards up</span></div></div><div id="spHof"></div>'
          + '<div class="row"><button class="btn go wide" type="button" id="spNew">New game</button><button class="btn wide" type="button" id="spHofB">Hall of Fame</button></div>')
        + sheet('dStats', 'My scores', (D.hof ? '<button class="btn hofbtn wide" type="button" id="sHof" style="width:100%;margin:2px 0 12px">&#127942; The Hall of Fame<small>Today&rsquo;s fastest, this week&rsquo;s best, all time</small></button>' : '') + '<p class="soft">Kept on this computer only &mdash; nothing is sent anywhere unless you join the Hall of Fame.</p><div class="tiles" id="sTiles"></div><h3 style="margin:16px 0 0;font-size:18px">Today&rsquo;s deal this week</h3><div class="week" id="sWeek"></div><div class="tiles" id="sBest"></div>'
          + '<div class="row"><button class="btn go wide" type="button" data-close>Close</button><button class="btn" type="button" id="sReset">Clear my scores</button></div>')
        + sheet('dSet', 'Settings', (V ? '<div class="set"><div><label>' + esc(V.label) + '</label><small>' + esc(V.small || 'Changes from your next game.') + '</small></div><div class="seg" role="group" aria-label="' + esc(V.label) + '">' + v + '</div></div>' : '')
          + (D.deals ? sw('winnable', 'Deals you can always win', D.winnableSmall || 'Every deal has been played through to a win.') : '')
          + (D.autoNext ? sw('auto', 'Move cards up to the piles for me', 'When it&rsquo;s plainly safe to.') : '')
          + sw('sound', 'Sounds', 'Soft card sounds and chimes.') + sw('timer', 'Show the clock', 'It still keeps your best time.')
          + sw('fx', 'Extra effects', 'Sparkles, cards that lift as they move, fireworks when you win. Switch off on a slower computer.')
          + '<div class="set"><div><label>Card speed</label><small>Quick keeps up with a fast player; Relaxed lets you watch every card&rsquo;s journey.</small></div><div class="seg" role="group" aria-label="Card speed"><button type="button" data-pace="quick">Quick</button><button type="button" data-pace="relaxed">Relaxed</button></div></div>'
           + '<div class="set"><div><label for="sWin">Win celebration</label><small>Surprise me picks a different one each time.</small></div><div class="wincel"><select id="sWin">' + Table365.FINALE_NAMES.map(function (o) { return '<option value="' + o[0] + '">' + o[1] + '</option>'; }).join('') + '</select><button class="btn" type="button" id="sWinTry">Watch</button></div></div>'
          + (window.Looks ? '<div class="set"><div><label>Tables and card backs</label><small>Twelve of each &ndash; the specials are won with Journey stars.</small></div><button class="btn lkbtn" type="button" id="sLooks"><span class="lkpv" id="sLookPv"><i></i></span>Choose</button></div>' : ''
            + '<div class="set"><div><label>Table</label></div><div class="felts" role="group" aria-label="Table"><button type="button" data-felt="green" style="background:#1f7a45" aria-label="Green baize"></button><button type="button" data-felt="blue" style="background:#1f5f9c" aria-label="Blue"></button><button type="button" data-felt="red" style="background:#8e2537" aria-label="Red"></button><button type="button" data-felt="slate" style="background:#45526a" aria-label="Grey"></button>'
          + '<button type="button" data-felt="oak" style="background:repeating-linear-gradient(91deg,#6b4220 0 3px,#7a4c26 3px 6px)" aria-label="Oak table"></button><button type="button" data-felt="night" style="background:radial-gradient(#2a3670,#060918)" aria-label="Night"></button></div></div>'
          + '<div class="set"><div><label>Card backs</label></div><div class="backs" role="group" aria-label="Card backs"><button type="button" data-back="navy" style="background:linear-gradient(155deg,#17447a,#0a2245)" aria-label="365 navy"></button><button type="button" data-back="royal" style="background:linear-gradient(155deg,#8e1d2c,#4a0712)" aria-label="Royal red"></button><button type="button" data-back="sea" style="background:linear-gradient(180deg,#ff9a6a,#ffcf8a 30%,#2aa3c4 52%,#0b5e86)" aria-label="Seaside"></button></div></div>')
          + '<p class="foot">' + esc(D.title) + ' is made by <a href="https://365techies.co.uk/" target="_blank" rel="noopener">365 Techies</a> in Bournemouth. No adverts, no sign-in, nothing to install. Computer playing up? Ring us on <b>01202 775566</b>.</p>'
          + '<div class="row"><button class="btn go wide" type="button" data-close>Done</button></div>')
        + sheet('dHelp', 'How to play', '<ol class="how">' + (D.help || []).map(function (h) { return '<li>' + h + '</li>'; }).join('') + '</ol>'
          + '<p class="soft keys365">Keys, if you like them: arrow keys choose a card and Enter plays it; N new game, U undo, H hint' + (D.hasStock ? ', space turns the deck' : '') + ', F full screen.</p><div class="row"><button class="btn go wide" type="button" data-close>Let&rsquo;s play</button></div>')
        + sheet('dReset', 'Clear my scores?', '<p>Your games won, streaks and best times for ' + esc(D.title) + ' on this computer go back to nothing. This can&rsquo;t be undone.</p><div class="row"><button class="btn wide" type="button" data-close>Keep them</button><button class="btn go wide" type="button" id="rYes" style="background:#a3242f;border-color:#a3242f">Clear them</button></div>');
      var holder = document.createElement('div'); holder.innerHTML = html;
      var frag = document.createDocumentFragment();
      while (holder.firstChild) frag.appendChild(holder.firstChild);
      document.body.insertBefore(frag, document.body.firstChild);   // the page first, in order; the scripts stay after it
    }
    function sheet(id, title, body) { return '<div class="scrim" id="' + id + '" hidden><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="' + id + 'H"><h2 id="' + id + 'H">' + esc(title) + '</h2><button class="x365" type="button" data-close aria-label="Close">&times;</button>' + body + '</div></div>'; }
    function sw(key, label, small) { return '<div class="set"><div><label id="l_' + key + '">' + label + '</label><small>' + small + '</small></div><button class="sw" type="button" role="switch" aria-labelledby="l_' + key + '" data-set="' + key + '"></button></div>'; }
  }

  // ------------------------------------------------------------ playing from the keyboard (games audit, 5 Oct 2026)
  // The table takes focus with Tab; the arrow keys move a ring to the nearest card that way among the ones you can use
  // now, and Enter plays the ringed card exactly as a tap would. A screen reader hears each card's name (the cards
  // themselves stay hidden from it - they're pictures). o.list() -> [{c, el, x, y, name}], o.play(item), o.busy().
  var RANKW = ['', 'Ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jack', 'Queen', 'King'], SUITN = ['spades', 'hearts', 'diamonds', 'clubs'];
  // keyboard or pointer: the table's focus marks only for someone using the keyboard (critic 4: the first How to play,
  // closed with a tap, left a dashed frame round the whole table)
  document.addEventListener('keydown', function (e) { if (/^(Tab|Arrow|Enter|Escape)/.test(e.key)) document.documentElement.classList.add('kbd-nav'); }, true);
  document.addEventListener('pointerdown', function () { document.documentElement.classList.remove('kbd-nav'); }, true);
  function cardName(r, s) { return RANKW[r] + ' of ' + SUITN[s]; }
  function kbd(board, o) {
    var live = document.createElement('div'); live.className = 'sr365'; live.setAttribute('aria-live', 'polite'); document.body.appendChild(live);
    board.tabIndex = 0; board.setAttribute('role', 'application');
    board.setAttribute('aria-label', 'The cards. Arrow keys choose a card, Enter plays it.');
    var cur = null, on = false, ringEl = null, tellT = 0;
    function ring(it) {
      if (ringEl) ringEl.classList.remove('kbd');
      ringEl = null; cur = it || null;
      if (cur && on) { ringEl = cur.el; ringEl.classList.add('kbd'); }
    }
    function tell(t) { clearTimeout(tellT); live.textContent = ''; tellT = setTimeout(function () { live.textContent = t; }, 40); }
    function refresh(announce) {
      var list = o.list();
      if (!list.length) { ring(null); return list; }
      var keep = cur && list.filter(function (it) { return it.c === cur.c; })[0];
      if (!keep && cur) { var nd = 1e9; list.forEach(function (it) { var d = Math.abs(it.x - cur.x) + Math.abs(it.y - cur.y); if (d < nd) { nd = d; keep = it; } }); }
      var was = cur && cur.c;
      ring(keep || list[0]);
      if (announce || (cur && cur.c !== was)) tell(cur.name);
      return list;
    }
    function after(fn, n) { n = n || 0; if (o.busy() && n < 40) setTimeout(function () { after(fn, n + 1); }, 100); else fn(); }
    board.addEventListener('focus', function () { if (!document.documentElement.classList.contains('kbd-nav')) return; on = true; refresh(true); });
    board.addEventListener('blur', function () { on = false; ring(cur); });
    board.addEventListener('pointerdown', function () { on = false; ring(cur); });   // a mouse or a finger: no ring
    board.addEventListener('keydown', function (e) {
      if (e.target !== board || e.altKey || e.ctrlKey || e.metaKey) return;
      var dir = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] }[e.key];
      if (!dir && e.key !== 'Enter') return;
      e.preventDefault(); on = true;
      if (o.busy()) return;
      var list = refresh(false);
      if (!list.length) { tell('No cards to play just now'); return; }
      if (e.key === 'Enter') { o.play(cur); after(function () { if (!refresh(true).length) setTimeout(function () { refresh(true); }, 500); }); return; }   // (says the card again: 'chosen')
      var best = null, bs = 1e9;   // the nearest card that way, keeping to the same row or column where it can
      list.forEach(function (it) {
        if (it.c === cur.c) return;
        var ax = it.x - cur.x, ay = it.y - cur.y, along = dir[0] ? ax * dir[0] : ay * dir[1], across = dir[0] ? Math.abs(ay) : Math.abs(ax);
        if (along <= 2) return;
        var sc = along + across * (dir[1] ? 6 : 2.5); if (sc < bs) { bs = sc; best = it; }   // (up and down keep to the column where they can)
      });
      if (best) { ring(best); tell(best.name); } else tell(cur.name);
    });
    return { refresh: refresh };
  }
  window.Table365 = { kbd: kbd, cardName: cardName, start: start, RECYCLE: RECYCLE, ICON: ICON, cardMarkup: cardMarkup, esc: esc, SUIT_CH: SUIT_CH, RANK_CH: RANK_CH, TXT: TXT, fly: fly, flightTime: flightTime, canFly: CAN_FLY,
    finale: finale, pickFinale: pickFinale, FINALE_NAMES: FINALE_NAMES, packAtCentre: packAtCentre, paintCard: paintCard, countUp: countUp };
})();
