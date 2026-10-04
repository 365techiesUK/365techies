/* 365 Games - the Games page as a launcher (4 Oct 2026). Owner: "get the game stuff looking a bit better" (after
 * Microsoft's Solitaire & Casual Games app). Built by games_hub_page.py; this file brings it to life:
 *   - the "you" card: wins, today's challenges, days in a row, Journey stars, initials from the Hall of Fame
 *   - the Daily challenges tile: today's date, this week's ticks, and a sheet with Today's deal in every card game
 *   - each tile's ribbon (Carry on / Today done / New) and score line
 *   - the Hall of Fame sheet, and a gentle tilt and shine under the mouse
 * Everything is read from the games' own saves in this browser (localStorage) - nothing is sent anywhere. Each tile
 * says what it needs: data-id, data-kind (card | rival | arcade), data-store (the game's save prefix), data-added,
 * data-hof, data-pic. The sheets are social.js's (GameSocial.sheet). /games/#daily and /games/#hof open them. */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); }
  function ymd(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function ago(n) { return new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - n); }
  function mmss(s) { s = Math.round(+s || 0); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
  var NOW = new Date(), T = ymd(NOW);
  var MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var DAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // ------------------------------------------------------------ what this browser knows about each game
  var games = [].slice.call(document.querySelectorAll('.gt[data-id]')).map(function (li) {
    var a = li.querySelector('a.gt-link'), d = li.dataset;
    var g = { li: li, id: d.id, kind: d.kind || '', store: d.store || '', hof: d.hof === '1', added: d.added || '', pic: d.pic || '',
      tall: li.classList.contains('gt--tall'), href: a ? a.getAttribute('href') : '', title: (li.querySelector('.gt-name') || {}).textContent || d.id };
    var st = g.store ? get(g.store + ':stats') : null;
    if (!st || st.v !== 1) st = null;
    g.played = st ? +st.played || 0 : 0; g.won = st ? +st.won || 0 : 0;
    g.daily = st && st.daily && typeof st.daily === 'object' ? st.daily : {};
    g.best = 0;
    if (g.kind === 'arcade' && st && st.best) for (var k in st.best) if (st.best[k] && +st.best[k].score > g.best) g.best = +st.best[k].score;
    var sv = g.store && (g.kind === 'card' || g.kind === 'rival') ? get(g.store + ':game') : null;
    g.inPlay = !!(sv && sv.s && sv.g && sv.g.started && (g.kind === 'card' ? !sv.s.won : sv.s.phase !== 'over'));
    g.inDaily = g.inPlay && sv.g.mode === 'daily' && sv.g.day === T;
    g.stars = 0;
    var j = (g.kind === 'card' || g.kind === 'rival') && g.store ? get(g.store + ':journey') : null;   // (the games against the computer have a Journey too, from 5 Oct)
    if (j && j.stars && typeof j.stars === 'object') for (var n in j.stars) g.stars += +j.stars[n] || 0;
    return g;
  });
  var cards = games.filter(function (g) { return g.kind === 'card' || g.kind === 'rival'; });
  function wonOn(g, day) { var x = g.daily[day]; return !!(x && x.won); }
  function anyWon(day) { return cards.some(function (g) { return wonOn(g, day); }); }
  var doneToday = cards.filter(function (g) { return wonOn(g, T); }).length;
  var run = 0;
  for (var i = anyWon(T) ? 0 : 1; i < 1000 && anyWon(ymd(ago(i))); i++) run++;   // today not done yet doesn't break the run
  var week = [];
  for (var w = 6; w >= 0; w--) { var dw = ago(w); week.push({ on: anyWon(ymd(dw)), now: w === 0, ch: DAY[dw.getDay()].charAt(0), name: DAY[dw.getDay()].slice(0, 3) }); }

  // ------------------------------------------------------------ the tiles: a ribbon and a score line each
  games.forEach(function (g) {
    var me = g.li.querySelector('.gt-me'), rib = g.li.querySelector('.gt-rib'), t = '', r = null;
    if (g.kind === 'card') t = g.played ? 'Won ' + g.won + ' of ' + g.played + (g.stars ? ' · ★ ' + g.stars : '') : g.stars ? '★ ' + g.stars + ' Journey stars' : '';
    else if (g.kind === 'rival') t = g.played ? 'Won ' + g.won + ' of ' + g.played + (g.played === 1 ? ' match' : ' matches') + (g.stars ? ' · ★ ' + g.stars : '') : g.stars ? '★ ' + g.stars + ' Journey stars' : '';
    else if (g.kind === 'arcade' && g.best) t = 'Best ' + g.best.toLocaleString('en-GB');
    if (me) me.textContent = t;
    if (g.inPlay) r = ['Carry on', ''];
    else if (wonOn(g, T)) r = ['Today ✓', 'ok'];
    else if (g.added && !g.played && !g.best && (Date.parse(T) - Date.parse(g.added)) / 864e5 < 30) r = ['New', 'new'];
    if (rib && r) { rib.textContent = r[0]; rib.className = 'gt-rib' + (r[1] ? ' ' + r[1] : ''); rib.hidden = false; }
  });

  // ------------------------------------------------------------ the Daily challenges tile
  if ($('ghDaily')) {
    $('ghCalM').textContent = MONTH[NOW.getMonth()];
    $('ghCalD').textContent = NOW.getDate();
    $('ghCalW').textContent = DAY[NOW.getDay()];
    $('ghWeek').innerHTML = week.map(function (d) {
      return '<span class="' + (d.on ? 'on' : '') + (d.now ? ' now' : '') + '"><i>' + (d.on ? '✓' : '') + '</i>' + d.ch + '</span>';
    }).join('');
    $('ghDailyMe').textContent = doneToday === cards.length && cards.length ? 'All ' + cards.length + ' done today!' : doneToday + ' of ' + cards.length + ' done today';
    $('ghDaily').setAttribute('aria-label', 'Daily challenges: ' + doneToday + ' of ' + cards.length + ' done today');
    $('ghDaily').addEventListener('click', openDaily);
  }

  // ------------------------------------------------------------ the "you" card
  var played = games.some(function (g) { return g.played > 0 || g.best > 0; });
  var won = cards.reduce(function (a, g) { return a + g.won; }, 0), stars = cards.reduce(function (a, g) { return a + g.stars; }, 0);
  var p = get('hof365:player'), ini = p && p.ini ? String(p.ini).replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() : '';
  var h = NOW.getHours(), hello = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  if ($('ghMe')) {
    if (ini) $('ghAv').textContent = ini;
    if (played) {
      $('ghHi').textContent = hello + (ini ? ', ' + ini.split('').join('.') + '.' : '');
      var left = cards.length - doneToday;
      $('ghSub').textContent = !left ? 'Every daily challenge done today – well played!'
        : doneToday ? left + (left === 1 ? ' daily challenge' : ' daily challenges') + ' still to win today.'
        : 'Today’s daily challenges are waiting – a new deal in every card game.';
      var tile = function (v, l, cls) { return '<li' + (cls ? ' class="' + cls + '"' : '') + '><b>' + esc(v) + '</b><small>' + esc(l) + '</small></li>'; };
      $('ghStats').innerHTML = tile(won, won === 1 ? 'game won' : 'games won') + tile(doneToday + ' of ' + cards.length, 'done today')
        + (run ? tile(run, run === 1 ? 'day in a row' : 'days in a row') : '') + (stars ? tile('★ ' + stars, 'Journey stars', 'gold') : '');
      $('ghStats').hidden = false;
    } else {
      $('ghHi').textContent = hello + ' – pick a game and play';
    }
    if (games.some(function (g) { return g.hof; }) && window.GameSocial && GameSocial.sheet) { $('ghHof').hidden = false; $('ghHof').addEventListener('click', openHof); }
  }

  // ------------------------------------------------------------ the sheets
  function thumb(g) { return g.pic ? '<img src="' + esc(g.pic) + '" alt="" loading="lazy" decoding="async"' + (g.tall ? ' width="44" height="57"' : ' class="wide" width="64" height="48"') + ' />' : ''; }
  function row(g, note, link, label, cls) {
    return '<li class="gh-li' + (cls ? ' ' + cls : '') + '">' + thumb(g) + '<span class="gh-li__t"><b>' + esc(g.title) + '</b><small>' + esc(note) + '</small></span>'
      + '<a class="gh-go' + (cls === 'ok' ? ' soft' : '') + '" href="' + esc(link) + '">' + esc(label) + '</a></li>';
  }
  function openDaily() {
    if (!window.GameSocial || !GameSocial.sheet) return;
    var rows = cards.map(function (g) {
      var x = g.daily[T], what = g.kind === 'rival' ? 'Today’s match' : 'Today’s deal', link = g.href + '?daily=1';
      if (x && x.won) return row(g, (g.kind === 'rival' ? 'Won ✓' : 'Done ✓' + (x.t ? ' in ' + mmss(x.t) : '')), link, 'Play again', 'ok');
      if (g.inDaily) return row(g, what + ' – under way', link, 'Carry on');
      if (x) return row(g, 'Played – not won this time', link, 'Try again');
      return row(g, g.inPlay ? what + ' – starting it ends the game you’re playing' : what + ' – not played yet', link, 'Play');
    }).join('');
    var wk = '<div class="gh-week" aria-hidden="true">' + week.map(function (d) { return '<span class="' + (d.on ? 'on' : '') + (d.now ? ' now' : '') + '"><i>' + (d.on ? '✓' : '') + '</i>' + d.name + '</span>'; }).join('') + '</div>';
    GameSocial.sheet({ title: 'Daily challenges',
      html: '<p class="gs-soft">' + DAY[NOW.getDay()] + ' ' + NOW.getDate() + ' ' + MONTH[NOW.getMonth()] + ' – the same cards for everyone today. Win one to tick it off, and to get into its Hall of Fame.</p>'
        + wk + '<p style="margin:6px 0 0"><b>' + doneToday + ' of ' + cards.length + ' done today</b>' + (run ? ' · ' + run + (run === 1 ? ' day' : ' days') + ' in a row' : '') + '</p>'
        + '<ul class="gh-list" role="list">' + rows + '</ul>' });
  }
  function openHof() {
    if (!window.GameSocial || !GameSocial.sheet) return;
    var withHof = games.filter(function (g) { return g.hof && g.href; });
    var c = withHof.filter(function (g) { return g.kind !== 'arcade'; }), a = withHof.filter(function (g) { return g.kind === 'arcade'; });
    GameSocial.sheet({ title: 'Hall of Fame',
      html: '<p class="gs-soft">The best players in Dorset and beyond. Only initials and a town are ever shown &mdash; never a name.</p>'
        + (c.length ? '<p class="gh-li-h">Card games &ndash; today&rsquo;s deal</p><ul class="gh-list" role="list">' + c.map(function (g) {
          return row(g, g.kind === 'rival' ? 'Today’s best wins' : 'Today’s fastest wins', g.href + '?hof=1', 'See it');
        }).join('') + '</ul>' : '')
        + (a.length ? '<p class="gh-li-h">Arcade &ndash; top scores</p><ul class="gh-list" role="list">' + a.map(function (g) {
          return row(g, 'On the game’s start screen', g.href, 'Open');
        }).join('') + '</ul>' : '') });
  }
  if (location.hash === '#daily') openDaily();
  else if (location.hash === '#hof') openHof();

  // ------------------------------------------------------------ a gentle tilt and shine under the mouse (not on touch, not with reduced motion)
  var fine = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;
  var calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (fine && !calm) [].forEach.call(document.querySelectorAll('.gt-link'), function (el) {
    el.addEventListener('pointermove', function (e) {
      var r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      el.style.setProperty('--rx', ((0.5 - y) * 6).toFixed(2) + 'deg'); el.style.setProperty('--ry', ((x - 0.5) * 8).toFixed(2) + 'deg');
      el.style.setProperty('--mx', (x * 100).toFixed(1) + '%'); el.style.setProperty('--my', (y * 100).toFixed(1) + '%');
    });
    el.addEventListener('pointerleave', function () { ['--rx', '--ry', '--mx', '--my'].forEach(function (k) { el.style.removeProperty(k); }); });
  });
})();
