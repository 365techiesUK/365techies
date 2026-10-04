/* 365 Games - the Hall of Fame (4 Oct 2026). Owner: "high scores go into a Hall of Fame ... initials and like where they
 * are ... the next generation solitaire, so it keeps them on there"; picks: open to everyone, a "365 member" badge for
 * signed-in customers, initials + town, Dorset chapters for the Journey.
 *
 *   HallOfFame.init({ game, title, levels: [[1,'Easy'],...], level: () => lv, sfx, burst, onPlay(mode) })
 *   HallOfFame.open({ board, lv })          the Hall of Fame itself
 *   HallOfFame.daily(box, { day, lv, secs, log })   after a win of Today's deal: fills the win card's box, sends the win
 *   HallOfFame.sprint(box, { day, secs, log, cards })
 * The arcade games (kind: 'arcade', levels = their speeds, e.g. [['v1','Gentle'],...]):
 *   HallOfFame.run()                         when a game starts: asks the server for a one-off ticket (a promise of it)
 *   HallOfFame.score(box, { lv, score, wave, secs, run })   at game over: fills the game-over card's box, sends the score
 *
 * The server (api/games-hof.php) REPLAYS every card-game win from its moves before it counts, so the boards can be
 * trusted; an arcade score must come back on its own game's ticket, in no less real time than it claims.
 * The player: a random id + secret key kept in this browser (for the Hall of Fame they asked to join - nothing else),
 * their initials and town, and their "show me" tick. A customer signed in to the 365 portal on this browser is
 * recognised by the server: their initials and town come from their account, with the member badge. */
(function () {
  'use strict';
  var API = '/api/games-hof.php';
  var C = { game: 'solitaire', title: 'Solitaire', levels: [[1, 'Easy']], level: function () { return 1; } };
  var who = null, built = false, openEl = null, lastFocus = null, tab = 'today', lv = 1, pending = null, req = 0;
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); }
  function load() { try { var p = JSON.parse(localStorage.getItem('hof365:player') || 'null'); return p && /^[a-f0-9]{24}$/.test(p.id) ? p : null; } catch (e) { return null; } }
  function save(p) { try { localStorage.setItem('hof365:player', JSON.stringify(p)); } catch (e) {} }
  function hex(n) { var a = new Uint8Array(n); (window.crypto || window.msCrypto).getRandomValues(a); return Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); }
  function me() { var p = load(); return p ? { player: p.id, key: p.key } : {}; }
  function auth() {   // the 365 portal's own sign-in on this browser, if any: the server checks it
    try { var s = JSON.parse(localStorage.getItem('p365') || '{}') || {}, m = localStorage.getItem('p365mid') || ''; return s.wtoken ? { wtoken: s.wtoken, machine: m } : null; } catch (e) { return null; }
  }
  function call(body) {
    var b = Object.assign({ game: C.game }, me(), body), a = auth(); if (a) b.auth = a;
    return fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b), credentials: 'same-origin' })
      .then(function (r) { return r.json().catch(function () { return { ok: false, error: 'http' + r.status }; }); })
      .catch(function () { return { ok: false, error: 'offline' }; });
  }
  function whoami() { return who ? Promise.resolve(who) : call({ action: 'whoami' }).then(function (j) { if (j && j.ok) who = j; return j; }); }
  function lvVal(s) { return /^\d+$/.test(String(s)) ? +s : String(s); }   // card levels are numbers, arcade speeds keys like 'v2'
  function arcade() { return C.kind === 'arcade'; }
  function fmt(n) { return Number(n || 0).toLocaleString('en-GB'); }
  function lvName(v) { var o = C.levels.filter(function (x) { return x[0] === v; })[0]; return o ? o[1] : ''; }
  function mono(ini) { return esc(String(ini || '?').split('').join('.')) + '.'; }

  // ------------------------------------------------------------ looks: dark navy and gold, a cut above the rest of the game
  var CSS = ''
    + '.hf-scrim{position:fixed;inset:0;z-index:6100;display:grid;place-items:center;padding:14px;background:rgba(1,6,18,.62);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px)}'
    + '.hf-scrim[hidden]{display:none}'
    + '.hf-sheet{position:relative;width:min(620px,100%);max-height:calc(100% - 8px);overflow:auto;padding:22px 22px 18px;border-radius:24px;color:#f5f0e1;'
    + 'background:radial-gradient(120% 70% at 50% -10%,#24407a 0%,#0d1b38 46%,#070f22 100%);border:1px solid rgba(255,210,87,.35);'
    + 'box-shadow:0 0 0 1px rgba(255,255,255,.04) inset,0 30px 80px rgba(0,0,0,.6),0 0 60px rgba(255,200,80,.12);font:400 16px/1.4 Archivo,"Segoe UI",sans-serif;animation:hfPop .38s cubic-bezier(.2,.9,.3,1.15)}'
    + '.hf-head{display:flex;align-items:center;gap:14px;margin:0 0 12px}'
    + '.hf-cup{width:58px;height:58px;flex:none;filter:drop-shadow(0 4px 14px rgba(255,200,80,.45))}'
    + '.hf-cup .sh{animation:hfShine 3.2s ease-in-out infinite}'
    + '.hf-head h2{margin:0;font:600 30px/1.05 "Clash Display",Archivo,sans-serif;background:linear-gradient(180deg,#fff6d6,#ffd257 55%,#d89a1e);-webkit-background-clip:text;background-clip:text;color:transparent}'
    + '.hf-head p{margin:3px 0 0;color:#b9c6e4;font-size:14px}'
    + '.hf-tabs{display:flex;gap:6px;overflow-x:auto;padding:2px;margin:4px 0 10px;scrollbar-width:none}'
    + '.hf-tabs button,.hf-lvs button{flex:none;min-height:40px;padding:0 14px;border-radius:999px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);color:#dfe6f7;font:700 14px Archivo,"Segoe UI",sans-serif;cursor:pointer}'
    + '.hf-tabs button[aria-pressed="true"]{background:linear-gradient(180deg,#ffe08a,#e0a400);color:#2a1d00;border-color:transparent;box-shadow:0 4px 14px rgba(255,200,80,.35)}'
    + '.hf-lvs{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px}.hf-lvs button{min-height:34px;font-size:13px}'
    + '.hf-lvs button[aria-pressed="true"]{border-color:#ffd257;color:#ffd257;background:rgba(255,210,87,.1)}'
    + '.hf-list{list-style:none;margin:0;padding:0;display:grid;gap:6px;min-height:120px}'
    + '.hf-row{display:grid;grid-template-columns:42px 54px 1fr auto;align-items:center;gap:10px;padding:8px 12px 8px 8px;border-radius:14px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.06);animation:hfRow .42s cubic-bezier(.2,.9,.3,1.1) both;animation-delay:calc(var(--i,0) * 50ms)}'
    + '.hf-rank{display:grid;place-items:center;width:34px;height:34px;border-radius:50%;font:800 15px Archivo,sans-serif;color:#cfd8ef;background:rgba(255,255,255,.08)}'
    + '.hf-row.r1 .hf-rank{background:radial-gradient(circle at 35% 30%,#fff3c4,#ffd257 45%,#c98c10);color:#3a2800;box-shadow:0 0 16px rgba(255,210,87,.6)}'
    + '.hf-row.r2 .hf-rank{background:radial-gradient(circle at 35% 30%,#ffffff,#c9d3e3 50%,#8a97ad);color:#1d2638}'
    + '.hf-row.r3 .hf-rank{background:radial-gradient(circle at 35% 30%,#ffd9b0,#d98a4e 50%,#8f4f1e);color:#2b1404}'
    + '.hf-row.r1{background:linear-gradient(90deg,rgba(255,210,87,.16),rgba(255,255,255,.04));border-color:rgba(255,210,87,.35)}'
    + '.hf-ini{font:800 18px/1 "Clash Display",Archivo,sans-serif;letter-spacing:.04em;color:#fff}'
    + '.hf-who{min-width:0}.hf-who b{display:block;font:600 15px/1.2 Archivo,sans-serif;color:#eef2fb;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
    + '.hf-who small{display:block;color:#93a3c6;font-size:12.5px}'
    + '.hf-v{text-align:right;font:800 18px/1.1 Archivo,sans-serif;color:#ffd257;font-variant-numeric:tabular-nums}.hf-v small{display:block;font:500 12px Archivo,sans-serif;color:#93a3c6}'
    + '.hf-mem{display:inline-flex;align-items:center;gap:3px;margin-left:6px;padding:2px 7px;border-radius:999px;background:linear-gradient(180deg,#1d97e3,#0d6fb0);color:#fff;font:800 10.5px/1.4 Archivo,sans-serif;letter-spacing:.04em;vertical-align:2px}'
    + '.hf-row.you{border-color:#7fe8ff;box-shadow:0 0 0 1px #7fe8ff inset,0 0 22px rgba(127,232,255,.25);animation:hfRow .42s cubic-bezier(.2,.9,.3,1.1) both,hfYou 2.4s ease-in-out .6s infinite}'
    + '.hf-sep{text-align:center;color:#6f80a6;font-size:13px;letter-spacing:.3em}'
    + '.hf-empty{display:grid;place-items:center;gap:10px;padding:26px 8px;text-align:center;color:#b9c6e4}'
    + '.hf-foot{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;margin-top:14px;padding-top:12px;border-top:1px solid rgba(255,255,255,.08);color:#b9c6e4;font-size:14px}'
    + '.hf-foot b{color:#fff}.hf-link{border:0;background:none;padding:0;color:#7fe8ff;font:700 14px Archivo,sans-serif;text-decoration:underline;cursor:pointer}'
    + '.hf-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:50px;padding:0 20px;border-radius:14px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.08);color:#fff;font:700 16px Archivo,sans-serif;cursor:pointer;flex:1 1 160px}'
    + '.hf-btn.gold{background:linear-gradient(180deg,#ffe08a,#e0a400);color:#2a1d00;border-color:transparent;box-shadow:0 6px 18px rgba(255,200,80,.35)}'
    + '.hf-row2{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px}'
    + '.hf-x{position:absolute;top:12px;right:12px;width:40px;height:40px;border-radius:50%;border:0;background:rgba(255,255,255,.08);color:#fff;font:400 24px/1 Archivo,sans-serif;cursor:pointer}'
    + '.hf-btn:focus-visible,.hf-tabs button:focus-visible,.hf-lvs button:focus-visible,.hf-link:focus-visible,.hf-x:focus-visible,.hf-in:focus-visible,.hf-sel:focus-visible{outline:3px solid #7fe8ff;outline-offset:2px}'
    // the join form: three big letter boxes, like an arcade high-score table
    + '.hf-letters{display:flex;gap:10px;justify-content:center;margin:14px 0 6px}'
    + '.hf-in{width:62px;height:72px;border-radius:14px;border:2px solid rgba(255,210,87,.5);background:rgba(255,255,255,.06);color:#ffd257;text-align:center;font:800 34px "Clash Display",Archivo,sans-serif;text-transform:uppercase;caret-color:#ffd257}'
    + '.hf-lab{display:block;margin:12px 0 6px;font-weight:700;color:#eef2fb}'
    + '.hf-sel{width:100%;min-height:50px;padding:0 14px;border-radius:12px;border:1px solid rgba(255,255,255,.2);background:#0f1f40;color:#fff;font:600 17px Archivo,sans-serif}'
    + '.hf-tick{display:flex;gap:10px;align-items:flex-start;margin:14px 0 4px;color:#dfe6f7;cursor:pointer}.hf-tick input{width:22px;height:22px;flex:none;margin:1px 0 0;accent-color:#ffd257}'
    + '.hf-err{margin:10px 0 0;padding:9px 12px;border-radius:12px;background:rgba(255,80,80,.14);color:#ffb3b3;font-weight:700}'
    + '.hf-note{margin:10px 0 0;color:#93a3c6;font-size:13.5px}.hf-note a{color:#7fe8ff}'
    // the result on the win card
    + '.hf-res{margin:12px 0 0;padding:14px;border-radius:16px;color:#f5f0e1;background:radial-gradient(120% 120% at 50% 0,#24407a,#0b1730);border:1px solid rgba(255,210,87,.4);text-align:center;animation:hfPop .5s cubic-bezier(.2,.9,.3,1.2)}'
    + '.hf-res .big{display:block;font:800 44px/1 "Clash Display",Archivo,sans-serif;background:linear-gradient(180deg,#fff6d6,#ffd257 55%,#d89a1e);-webkit-background-clip:text;background-clip:text;color:transparent}'
    + '.hf-res p{margin:6px 0 0;color:#dfe6f7}.hf-res .hf-row2{justify-content:center}'
    + '@keyframes hfPop{from{opacity:0;transform:translateY(14px) scale(.96)}to{opacity:1;transform:none}}'
    + '@keyframes hfRow{from{opacity:0;transform:translateX(-14px)}to{opacity:1;transform:none}}'
    + '@keyframes hfYou{0%,100%{box-shadow:0 0 0 1px #7fe8ff inset,0 0 10px rgba(127,232,255,.15)}50%{box-shadow:0 0 0 1px #7fe8ff inset,0 0 26px rgba(127,232,255,.4)}}'
    + '@keyframes hfShine{0%,60%{transform:translateX(-30px)}100%{transform:translateX(60px)}}'
    + '@media (max-width:460px){.hf-sheet{padding:18px 14px 14px}.hf-row{grid-template-columns:36px 46px 1fr auto;gap:8px}.hf-head h2{font-size:25px}.hf-in{width:54px;height:64px;font-size:30px}}'
    + '@media (prefers-reduced-motion:reduce){.hf-sheet,.hf-row,.hf-res,.hf-row.you{animation:none}.hf-cup .sh{animation:none}}';
  var CUP = '<svg class="hf-cup" viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="hfg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3c4"/><stop offset=".5" stop-color="#ffd257"/><stop offset="1" stop-color="#b87b0c"/></linearGradient>'
    + '<clipPath id="hfc"><path d="M18 8h28v14c0 9-6 16-14 16s-14-7-14-16z"/></clipPath></defs>'
    + '<path d="M18 12H9c0 9 5 14 11 15M46 12h9c0 9-5 14-11 15" fill="none" stroke="#ffd257" stroke-width="3.5" stroke-linecap="round"/>'
    + '<path d="M18 8h28v14c0 9-6 16-14 16s-14-7-14-16z" fill="url(#hfg)"/><g clip-path="url(#hfc)"><rect class="sh" x="12" y="4" width="8" height="40" fill="rgba(255,255,255,.55)" transform="rotate(20 16 24)"/></g>'
    + '<path d="M28 38h8v8h-8z" fill="#d89a1e"/><rect x="20" y="46" width="24" height="7" rx="2" fill="url(#hfg)"/><rect x="17" y="53" width="30" height="5" rx="2" fill="#b87b0c"/>'
    + '<path d="M32 14l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5-3.6-3.5 5-.7z" fill="#fff8e1"/></svg>';

  function build() {
    if (built) return; built = true;
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    var lvls = C.levels.map(function (o) { return '<button type="button" data-hflv="' + o[0] + '">' + esc(o[1]) + '</button>'; }).join('');
    var h = '<div class="hf-scrim" id="hfBoard" hidden><div class="hf-sheet" role="dialog" aria-modal="true" aria-labelledby="hfH">'
      + '<button class="hf-x" type="button" data-hf-close aria-label="Close">&times;</button>'
      + '<div class="hf-head">' + CUP + '<div><h2 id="hfH">Hall of Fame</h2><p id="hfSub"></p></div></div>'
      + '<div class="hf-tabs" role="group" aria-label="Which board">'
      + '<button type="button" data-hftab="today">Today</button><button type="button" data-hftab="week">This week</button><button type="button" data-hftab="alltime">All time</button>'
      + (arcade() ? '' : '<button type="button" data-hftab="sprint">3-minute sprint</button>') + '<button type="button" data-hftab="town">My town</button></div>'
      + '<div class="hf-lvs" id="hfLvs" role="group" aria-label="Level">' + lvls + '</div>'
      + '<p class="hf-note" id="hfWhat" style="margin:0 0 10px"></p>'
      + '<ol class="hf-list" id="hfList" aria-live="polite"></ol>'
      + '<div class="hf-foot" id="hfFoot"></div></div></div>'
      + '<div class="hf-scrim" id="hfJoin" hidden><div class="hf-sheet" role="dialog" aria-modal="true" aria-labelledby="hfJH">'
      + '<button class="hf-x" type="button" data-hf-close aria-label="Close">&times;</button>'
      + '<div class="hf-head">' + CUP + '<div><h2 id="hfJH">Join the Hall of Fame</h2><p>Your initials and your town &mdash; nothing else is ever shown.</p></div></div>'
      + '<div id="hfJoinBody"></div></div></div>';
    var box = document.createElement('div'); box.innerHTML = h; while (box.firstChild) document.body.appendChild(box.firstChild);
    document.addEventListener('click', function (e) {
      var t = e.target;
      if (t.closest && t.closest('[data-hf-close]')) { close(); return; }
      if (t.classList && t.classList.contains('hf-scrim')) { close(); return; }
      var b = t.closest ? t.closest('[data-hftab],[data-hflv]') : null; if (!b) return;
      if (b.hasAttribute('data-hftab')) tab = b.getAttribute('data-hftab'); else lv = lvVal(b.getAttribute('data-hflv'));
      draw();
    });
    document.addEventListener('keydown', function (e) { if (openEl && e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } }, true);
  }
  function show(id) {
    if (openEl && openEl.id !== id) openEl.hidden = true;
    if (!openEl) { lastFocus = document.activeElement; if (C.onOpen) try { C.onOpen(); } catch (e) {} }
    openEl = $(id); openEl.hidden = false;
    var f = openEl.querySelector(id === 'hfJoin' ? '.hf-in' : '[data-hftab][aria-pressed="true"]') || openEl.querySelector('button'); if (f) try { f.focus({ preventScroll: true }); } catch (e) {}
  }
  function close() {
    if (!openEl) return; openEl.hidden = true; openEl = null;
    if (lastFocus && lastFocus.focus && document.body.contains(lastFocus)) try { lastFocus.focus({ preventScroll: true }); } catch (e) {}
    if (C.onClose) try { C.onClose(); } catch (e) {}
    if (pending) { var p = pending; pending = null; p(null); }
  }

  // ------------------------------------------------------------ the boards
  var WHAT = {
    today: 'Today&rsquo;s deal at this level &mdash; the same cards for everyone. Fastest win first.',
    week: 'Points for every one of Today&rsquo;s deals won this week &mdash; more for a harder level and a quicker win.',
    alltime: 'The quickest wins of Today&rsquo;s deal, ever, at this level.',
    sprint: 'Today&rsquo;s 3-minute sprint: the most cards up to the piles in three minutes.',
    town: 'Today&rsquo;s deal at this level, just for your town.'
  };
  var WHAT_ARC = {
    today: 'Today&rsquo;s highest scores at this speed.',
    week: 'The highest scores this week at this speed.',
    alltime: 'The highest scores ever at this speed.',
    town: 'Today&rsquo;s highest scores at this speed, just for your town.'
  };
  function draw() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-hftab]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-hftab') === tab)); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-hflv]'), function (b) { b.setAttribute('aria-pressed', String(lvVal(b.getAttribute('data-hflv')) === lv)); });
    $('hfLvs').hidden = !arcade() && (tab === 'week' || tab === 'sprint');
    $('hfWhat').innerHTML = arcade() ? WHAT_ARC[tab] : tab === 'sprint' && C.sprintBoard ? 'Today&rsquo;s 3-minute sprint: ' + C.sprintBoard + '.' : WHAT[tab];
    $('hfSub').textContent = C.title + ' · ' + (tab === 'town' && who && who.town ? who.town : 'Dorset and beyond');
    var my = ++req, list = $('hfList');
    list.innerHTML = '<li class="hf-empty">Loading the scores&hellip;</li>';
    whoami().then(function () {
      if (tab === 'town' && !(who && who.town)) { list.innerHTML = '<li class="hf-empty">Join the Hall of Fame and pick your town to see the board for it.</li>'; foot(); return; }
      return call({ action: 'board', board: tab, lv: lv, town: who && who.town }).then(function (j) {
        if (my !== req) return;
        if (!j || !j.ok) { list.innerHTML = '<li class="hf-empty">The scores didn&rsquo;t load &mdash; check the internet connection and try again.</li>'; return; }
        if (!j.rows.length && arcade()) {
          list.innerHTML = '<li class="hf-empty"><span>' + (tab === 'week' ? 'No scores yet this week at this speed.' : tab === 'alltime' ? 'No scores yet at this speed.' : 'No scores yet today at this speed &mdash; be the first!') + '</span>'
            + (C.onPlay ? '<button class="hf-btn gold" type="button" data-hfplay="play">Play now</button>' : '') + '</li>';
        } else if (!j.rows.length) {
          var play = tab === 'sprint' ? 'sprint' : (tab === 'week' || tab === 'alltime' || tab === 'today' || tab === 'town') ? 'daily' : '';
          list.innerHTML = '<li class="hf-empty"><span>' + (tab === 'sprint' ? 'No one has run today&rsquo;s sprint yet.' : tab === 'week' ? 'No wins yet this week.' : 'No one has won it yet &mdash; be the first!') + '</span>'
            + (C.onPlay && play ? '<button class="hf-btn gold" type="button" data-hfplay="' + play + '">' + (play === 'sprint' ? 'Run today&rsquo;s sprint' : 'Play today&rsquo;s deal') + '</button>' : '') + '</li>';
        } else {
          var out = j.rows.map(rowHtml);
          if (j.mine && j.mine.rank > j.rows.length) out.push('<li class="hf-sep" aria-hidden="true">&middot; &middot; &middot;</li>', rowHtml(j.mine, j.rows.length));
          list.innerHTML = out.join('');
        }
        foot();
      });
    });
  }
  function rowHtml(r, i) {
    return '<li class="hf-row r' + r.rank + (r.you ? ' you' : '') + '" style="--i:' + (i == null ? r.rank - 1 : i) + '"><span class="hf-rank">' + r.rank + '</span>'
      + '<span class="hf-ini">' + mono(r.ini) + '</span><span class="hf-who"><b>' + esc(r.town) + (r.m ? '<span class="hf-mem" title="A 365 Techies member">365 MEMBER</span>' : '') + '</b>'
      + '<small>' + (r.you ? 'That&rsquo;s you!' : '&nbsp;') + '</small></span><span class="hf-v">' + esc(r.v) + '<small>' + esc(r.sub) + '</small></span></li>';
  }
  function foot() {
    var p = load(), f = $('hfFoot');
    if (who && who.shown && p) {
      f.innerHTML = 'You appear as <b>' + mono(who.ini) + ' &middot; ' + esc(who.town) + '</b>' + (who.member ? ' <span class="hf-mem">365 MEMBER</span>' : ' <button class="hf-link" type="button" id="hfRename">Change</button>')
        + ' <button class="hf-link" type="button" id="hfForget">Take my name off</button>';
      if ($('hfRename')) $('hfRename').onclick = function () { join({ rename: true }); };
      $('hfForget').onclick = forget;
    } else f.innerHTML = (arcade() ? 'Finish a game to join the Hall of Fame.' : 'Win Today&rsquo;s deal or run the 3-minute sprint to join the Hall of Fame.') + (who && who.member ? ' You&rsquo;re signed in, so you&rsquo;ll show with the <span class="hf-mem">365 MEMBER</span> badge.' : '');
  }
  function forget() {
    if (!window.confirm('Take your initials and all your scores off the Hall of Fame? This can’t be undone.')) return;
    call({ action: 'forget' }).then(function () {
      try { localStorage.removeItem('hof365:player'); } catch (e) {}
      who = null; draw();
    });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-hfplay]') : null; if (!b) return;
    var m = b.getAttribute('data-hfplay'); close(); if (C.onPlay) C.onPlay(m);
  });
  function open(o) {
    build(); o = o || {};
    tab = o.board || 'today'; lv = o.lv != null ? o.lv : (C.level ? C.level() : 1);
    if (arcade() && tab === 'sprint') tab = 'today';
    if (!C.levels.some(function (x) { return x[0] === lv; })) lv = C.levels[0][0];
    show('hfBoard'); draw();
  }

  // ------------------------------------------------------------ joining: initials, town, the tick (returns a promise of true / false)
  function join(o) {
    build(); o = o || {};
    return whoami().then(function () {
      var p = load() || {}, w = who || {}, towns = (w.towns || []).map(function (t) { return '<option' + (t === (w.town || p.town) ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join('');
      var ini = String(w.ini || p.ini || '').split('');
      var body = w.member
        ? '<p>You&rsquo;re signed in to your 365 account, so you&rsquo;ll be shown as <b>' + mono(w.ini) + (w.town ? ' &middot; ' + esc(w.town) : '') + '</b> with the <span class="hf-mem">365 MEMBER</span> badge.</p>'
          + (w.town ? '' : '<label class="hf-lab" for="hfTown">Your town</label><select class="hf-sel" id="hfTown">' + towns + '</select>')
        : '<label class="hf-lab">Your initials</label><div class="hf-letters">'
          + [0, 1, 2].map(function (i) { return '<input class="hf-in" id="hfI' + i + '" maxlength="1" autocomplete="off" autocapitalize="characters" inputmode="text" aria-label="Initial ' + (i + 1) + (i === 2 ? ' (optional)' : '') + '" value="' + esc(ini[i] || '') + '" />'; }).join('')
          + '</div><label class="hf-lab" for="hfTown">Your town</label><select class="hf-sel" id="hfTown"><option value="">Choose your town&hellip;</option>' + towns + '</select>';
      $('hfJoinBody').innerHTML = body
        + (o.rename ? '' : '<label class="hf-tick"><input type="checkbox" id="hfShow" /> <span>Show my initials and town in the Hall of Fame. I can take them off at any time.</span></label>')
        + '<p class="hf-err" id="hfErr" hidden></p>'
        + '<div class="hf-row2"><button class="hf-btn gold" type="button" id="hfGo">' + (o.rename ? 'Save' : 'Put me in the Hall of Fame') + '</button><button class="hf-btn" type="button" data-hf-close>' + (o.rename ? 'Cancel' : 'Not now') + '</button></div>'
        + '<p class="hf-note">Only your initials and town are shown &mdash; never your name. <a href="/privacy-policy/" target="_blank" rel="noopener">Privacy policy</a></p>';
      // letters: one per box, jump along as you type, back on Backspace
      [0, 1, 2].forEach(function (i) {
        var el = $('hfI' + i); if (!el) return;
        el.addEventListener('input', function () { el.value = el.value.replace(/[^a-z]/gi, '').toUpperCase().slice(-1); if (el.value && $('hfI' + (i + 1))) $('hfI' + (i + 1)).focus(); });
        el.addEventListener('keydown', function (e) { if (e.key === 'Backspace' && !el.value && i > 0) { $('hfI' + (i - 1)).focus(); } });
      });
      show('hfJoin');
      return new Promise(function (resolve) {
        pending = resolve;
        $('hfGo').onclick = function () {
          var ini2 = w.member ? w.ini : [0, 1, 2].map(function (i) { return $('hfI' + i).value; }).join(''), town = $('hfTown') ? $('hfTown').value : w.town;
          var err = function (t) { $('hfErr').textContent = t; $('hfErr').hidden = false; };
          if (!w.member && ini2.length < 1) return err('Type at least one initial.');
          if (!town) return err('Choose your town (or "Elsewhere in the UK").');
          if (!o.rename && !$('hfShow').checked) return err('Tick the box to show your initials and town.');
          var pl = load() || { id: hex(12), key: hex(16) };
          pl.ini = ini2.toUpperCase(); pl.town = town;
          if (o.rename) {
            call({ action: 'rename', ini: pl.ini, town: town }).then(function (j) {
              if (!j.ok) return err(j.error === 'ini' ? 'Please choose different initials.' : 'That didn’t save - please try again.');
              save(pl); who = null; pending = null; close(); open({ board: tab, lv: lv });
            });
            return;
          }
          save(pl); who = null; pending = null;
          close(); resolve(true);
        };
      });
    });
  }

  // ------------------------------------------------------------ after a win of Today's deal, or the end of a sprint
  function result(box, body) {
    build();
    box.hidden = false;
    box.innerHTML = '<div class="hf-res"><p style="margin:0">Sending your ' + (body.mode === 'sprint' ? 'sprint' : body.mode === 'score' ? 'score' : 'win') + ' to the Hall of Fame&hellip;</p></div>';
    var p = load();
    if (!p || !p.ini) {   // not joined yet: ask, right here
      box.innerHTML = '<div class="hf-res">' + CUP.replace('class="hf-cup"', 'class="hf-cup" style="width:46px;height:46px"')
        + '<p style="font-weight:700;color:#fff">' + (body.mode === 'score' ? 'You scored ' + fmt(body.score) + '!' : body.mode === 'sprint' ? body.cards + ' cards in three minutes!' : 'You won today&rsquo;s ' + esc(lvName(body.lv)) + ' deal!') + '</p>'
        + '<p>Put your initials in the Hall of Fame and see where you rank in Dorset.</p>'
        + '<div class="hf-row2"><button class="hf-btn gold" type="button" id="hfJoinBtn">Join the Hall of Fame</button></div></div>';
      $('hfJoinBtn').onclick = function () { join().then(function (yes) { if (yes) send(box, body); }); };
      return;
    }
    send(box, body);
  }
  function send(box, body) {
    var p = load();
    box.innerHTML = '<div class="hf-res"><p style="margin:0">Checking your ' + (body.mode === 'sprint' ? 'sprint' : body.mode === 'score' ? 'score' : 'win') + ' and sending it to the Hall of Fame&hellip;</p></div>';
    call(Object.assign({ action: 'submit', ini: p.ini, town: p.town }, body)).then(function (j) {
      if (!j || !j.ok) {
        var why = { ini: 'Those initials can’t be used - choose others.', town: 'Choose your town first.', rate: 'That’s plenty for today - try again tomorrow!', offline: 'No internet connection - your win is still saved on this computer.', day: 'That deal is from another day.', replay: 'That game couldn’t be checked, so it wasn’t added.', run: 'That game couldn’t be checked (was the internet off when it started?), so it wasn’t added.', 'not-won': 'That game couldn’t be checked, so it wasn’t added.', time: 'That time couldn’t be checked, so it wasn’t added.' }[j && j.error] || 'The Hall of Fame didn’t answer - try again later.';
        box.innerHTML = '<div class="hf-res"><p style="margin:0">' + esc(why) + '</p>' + (j && (j.error === 'ini' || j.error === 'town') ? '<div class="hf-row2"><button class="hf-btn gold" type="button" id="hfFix">Change my initials</button></div>' : '') + '</div>';
        if ($('hfFix')) $('hfFix').onclick = function () { try { var pl = load(); pl.ini = ''; save(pl); } catch (e) {} result(box, body); };
        return;
      }
      who = null;
      var place = j.rank, of = j.count, town = j.townRank && j.townCount > 1 ? ' &middot; #' + j.townRank + ' of ' + j.townCount + ' in ' + esc(j.town) : (j.townRank === 1 ? ' &middot; first in ' + esc(j.town) + '!' : '');
      box.innerHTML = '<div class="hf-res"><span class="big" id="hfBig">#' + place + '</span>'
        + '<p><b style="color:#fff">' + (body.mode === 'sprint' ? 'in today&rsquo;s sprint' : 'today at ' + esc(lvName(body.lv))) + '</b> of ' + of + (of === 1 ? ' player' : ' players') + town + '</p>'
        + (body.mode === 'score' && j.everRank && j.everRank <= 10 && j.everCount > 1 && j.improved !== false ? '<p>&#11088; <b style="color:#ffd257">#' + j.everRank + ' of all time</b> at this speed!</p>' : '')
        + (j.improved === false ? '<p>Your best today still stands.</p>' : '')
        + '<div class="hf-row2"><button class="hf-btn gold" type="button" id="hfSee">See the Hall of Fame</button></div></div>';
      $('hfSee').onclick = function () { open({ board: body.mode === 'sprint' ? 'sprint' : 'today', lv: body.lv }); };
      // the number counts up, and a top-three place earns a burst of gold
      var el = $('hfBig'), n = Math.max(of, place), k = 0, steps = Math.min(18, n - place);
      if (steps > 0 && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) {
        var t = setInterval(function () { k++; el.textContent = '#' + Math.round(n - (n - place) * k / steps); if (k >= steps) clearInterval(t); }, 45);
      }
      if (place <= 3 && C.burst) setTimeout(function () { var r = el.getBoundingClientRect(); C.burst(r.left + r.width / 2, r.top + r.height / 2, place); }, 500);
      if (C.sfx) C.sfx(place <= 3 ? 'suit' : 'found', 3);
    });
  }

  window.HallOfFame = {
    init: function (cfg) { for (var k in cfg) C[k] = cfg[k]; },
    open: open, join: join, isOpen: function () { return !!openEl; },
    daily: function (box, r) { result(box, { mode: 'daily', day: r.day, lv: r.lv, secs: r.secs, log: r.log }); },
    sprint: function (box, r) { result(box, { mode: 'sprint', day: r.day, lv: 1, secs: r.secs, log: r.log, cards: r.cards }); },
    // the arcade games: a ticket when a game starts, the score at game over (the ticket may still be on its way)
    run: function () { return call({ action: 'run' }).then(function (j) { return j && j.ok ? j.run : null; }); },
    // today's top score at a speed, for the title screen: the row, false if no one has scored yet, null if it didn't load
    top: function (lv) { return call({ action: 'board', board: 'today', lv: lv }).then(function (j) { return j && j.ok ? (j.rows[0] || false) : null; }); },
    score: function (box, r) {
      Promise.resolve(r.run).then(function (run) { result(box, { mode: 'score', lv: r.lv, score: r.score, wave: r.wave, secs: r.secs, run: run || '' }); });
    }
  };
})();
