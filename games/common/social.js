/* 365 Games - Share and Feedback (4 Oct 2026). Used by every game (table.js, arcade.js) and the Games page.
 * Owner: "people could share the games ... they've got no adverts", and feedback / "request a game" because "each game
 * is in development ... no other game platform you can actually get the game changed".
 *
 *   GameSocial.init({ id, title, onOpen, onClose })   once, from the game (onOpen pauses an arcade game)
 *   GameSocial.share({ text, query })                  share this game (text: the message; query: e.g. '?deal=48213&v=1')
 *   GameSocial.openFeedback('feedback' | 'request')
 *   GameSocial.isOpen()                                the games ignore their own keys while a sheet is open
 *
 * Sharing uses plain links (WhatsApp, Facebook, email) and the device's own share menu on a phone or tablet - no
 * share buttons from Facebook or anyone else, nothing that tracks people, so the games stay cookie-free.
 * Feedback goes to /api/game-feedback.php (stored, then posted to the team's Slack). The sheets bring their own
 * styles (gs-*), so they look the same on a game and on the site's Games page. */
(function () {
  'use strict';
  var API = '/api/game-feedback.php';
  var CFG = { id: 'games', title: '365 Games' }, openEl = null, lastFocus = null, built = false, mode = 'feedback', mood = '', TIE = null;
  function esc(s) { return String(s).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); }
  function $(id) { return document.getElementById(id); }
  var ICON = {
    wa: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#25D366" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2z"/><path fill="#fff" d="M17.3 14.4c-.3-.1-1.7-.8-1.9-.9-.3-.1-.5-.1-.6.1l-.9 1.1c-.2.2-.3.2-.6.1a8 8 0 0 1-2.4-1.5 9 9 0 0 1-1.6-2c-.2-.3 0-.4.1-.6l.4-.5.3-.5v-.5l-.9-2c-.2-.5-.4-.5-.6-.5h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.6-.3z"/></svg>',
    fb: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#1877F2"/><path fill="#fff" d="M13.4 21.9v-7h2.3l.4-2.8h-2.7v-1.8c0-.8.3-1.4 1.4-1.4h1.4V6.4a19 19 0 0 0-2.1-.1c-2.1 0-3.5 1.3-3.5 3.6v2.2H8.3v2.8h2.3v7z"/></svg>',
    mail: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#146c3a" stroke-width="2" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5" fill="#e8f3ec"/><path d="m4 7 8 6 8-6"/></svg>',
    copy: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#3b4a40" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>',
    more: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="#3b4a40"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>'
  };
  var CSS = ''
    + '.gs-scrim{position:fixed;inset:0;z-index:6000;display:grid;place-items:center;padding:16px;background:rgba(2,12,6,.55);-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px)}'
    + '.gs-scrim[hidden]{display:none}'
    + '.gs-sheet{width:min(540px,100%);max-height:calc(100% - 8px);overflow:auto;padding:24px 24px 20px;border-radius:20px;background:#fbfaf5;color:#15211a;box-shadow:0 24px 70px rgba(0,0,0,.5);font:400 17px/1.45 Archivo,"Segoe UI",sans-serif;text-align:left}'
    + '.gs-sheet h2{margin:0 0 6px;font:600 28px/1.15 "Clash Display",Archivo,"Segoe UI",sans-serif;color:#15211a;text-wrap:balance}'
    + '.gs-sheet p{margin:0 0 12px}.gs-soft{color:#5b6b60;font-size:15px}'
    + '.gs-opts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:14px 0 6px}'
    + '.gs-opt{display:flex;align-items:center;gap:12px;min-height:56px;padding:0 16px;border-radius:14px;border:2px solid #e2ded2;background:#fff;color:#15211a;font:700 17px/1.1 Archivo,"Segoe UI",sans-serif;text-decoration:none;cursor:pointer;text-align:left}'
    + '.gs-opt:hover{border-color:#c9c3b3}.gs-opt svg{width:30px;height:30px;flex:none}'
    + '.gs-opt:focus-visible,.gs-btn:focus-visible,.gs-mood:focus-visible,.gs-link:focus-visible,.gs-field input:focus-visible,.gs-field textarea:focus-visible{outline:3px solid #22a3ee;outline-offset:2px}'
    + '.gs-msg{margin:10px 0 0;padding:10px 12px;border-radius:12px;background:#efece2;color:#3b4a40;font-size:15px;white-space:pre-wrap;word-break:break-word}'
    + '.gs-done{min-height:22px;margin:8px 0 0;color:#146c3a;font-weight:700}'
    + '.gs-row{display:flex;flex-wrap:wrap;gap:10px;margin-top:16px}'
    + '.gs-btn{display:inline-flex;align-items:center;justify-content:center;flex:1 1 160px;min-height:52px;padding:0 20px;border-radius:14px;border:2px solid #e2ded2;background:#fff;color:#15211a;font:700 17px/1.1 Archivo,"Segoe UI",sans-serif;cursor:pointer}'
    + '.gs-btn.gs-go{background:#146c3a;border-color:#146c3a;color:#fff}.gs-btn:disabled{opacity:.6;cursor:default}'
    + '.gs-moods{display:flex;gap:8px;margin:0 0 14px;padding:0;border:0}.gs-moods legend{font-weight:700;margin-bottom:8px;padding:0}'
    + '.gs-mood{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;min-height:76px;padding:8px 4px;border-radius:14px;border:2px solid #e2ded2;background:#fff;color:#15211a;font:700 15px/1.15 Archivo,"Segoe UI",sans-serif;cursor:pointer}'
    + '.gs-mood span{font-size:28px;line-height:1}.gs-mood[aria-pressed="true"]{border-color:#146c3a;background:#e8f3ec;box-shadow:0 0 0 2px #146c3a inset}'
    + '.gs-field{display:block;margin:0 0 12px;font-weight:700}.gs-field small{font-weight:400;color:#5b6b60}'
    + '.gs-field input,.gs-field textarea{display:block;width:100%;box-sizing:border-box;margin-top:6px;padding:12px 14px;border-radius:12px;border:2px solid #d8d3c4;background:#fff;color:#15211a;font:400 17px/1.4 Archivo,"Segoe UI",sans-serif}'
    + '.gs-field textarea{min-height:110px;resize:vertical}'
    + '.gs-two{display:grid;grid-template-columns:1fr 1fr;gap:10px}'
    + '.gs-tick{display:flex;align-items:flex-start;gap:10px;margin:-2px 0 14px;font-size:16px;cursor:pointer}.gs-tick input{width:22px;height:22px;flex:none;margin:1px 0 0;accent-color:#146c3a}'
    + '.gs-tick.gs-off{opacity:.5;cursor:default}'
    + '.gs-err{margin:0 0 8px;padding:10px 12px;border-radius:12px;background:#fde8e6;color:#8f1d12;font-weight:700}'
    + '.gs-small{margin:14px 0 0;font-size:14px;color:#5b6b60}.gs-small a,.gs-sheet a.gs-a{color:#146c3a}'
    + '.gs-link{margin:12px 0 0;padding:0;border:0;background:none;color:#146c3a;font:700 16px Archivo,"Segoe UI",sans-serif;text-decoration:underline;cursor:pointer}'
    + '.gs-trap{position:absolute!important;left:-9999px!important;width:1px;height:1px;opacity:0}'
    + '.gs-sheet.gs-wide{width:min(860px,100%)}'
    + '.gs-sheet .gs-cat{margin:18px 0 9px;font:700 13px/1 Archivo,"Segoe UI",sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#5b6b60}'
    // the games menu (4 Oct 2026, after Microsoft's Solitaire app): each game a tile with its own coloured title bar and
    // its cover - colours, glyph and cover come from games.json "look"
    + '.gs-games{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}'
    + '.gs-games.gs-tallg{grid-template-columns:repeat(5,minmax(0,1fr))}'
    + '.gs-games.gs-oneg .gs-game{grid-column:span 2}'
    + '.gs-game{--c1:#146c3a;--c2:#0b3d20;position:relative;display:flex;flex-direction:column;border-radius:14px;overflow:hidden;border:0;background:var(--c2);color:#fff;text-decoration:none;cursor:pointer;text-align:left;padding:0;font:inherit;'
    + 'box-shadow:0 0 0 1px rgba(0,0,0,.06),0 6px 16px rgba(20,30,40,.2);animation:gsIn .45s cubic-bezier(.2,.9,.3,1.15) both;animation-delay:calc(var(--i,0) * 40ms);transition:transform .16s ease,box-shadow .2s}'
    + '.gs-game:hover{transform:translateY(-4px);box-shadow:0 0 0 2px var(--c1),0 16px 30px rgba(20,30,40,.3)}'
    + '.gs-game:focus-visible{outline:3px solid #22a3ee;outline-offset:2px}'
    + '.gs-bar{display:flex;align-items:center;gap:6px;min-height:34px;padding:6px 9px;background:var(--c1);background:linear-gradient(180deg,color-mix(in srgb,var(--c1) 88%,#fff),var(--c1) 55%,color-mix(in srgb,var(--c1) 78%,#000));box-shadow:0 1px 0 rgba(255,255,255,.25) inset}'
    + '.gs-bar svg{flex:none;width:17px;height:17px;filter:drop-shadow(0 1px 1px rgba(0,0,0,.35))}'
    + '.gs-bar b{font:700 14.5px/1.15 Archivo,"Segoe UI",sans-serif;text-shadow:0 1px 2px rgba(0,0,0,.35)}'
    + '.gs-art{position:relative;display:block;overflow:hidden;background:var(--c2)}'
    + '.gs-art::after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(110deg,rgba(255,255,255,0) 30%,rgba(255,255,255,.3) 48%,rgba(255,255,255,0) 62%);transform:translateX(-130%);transition:transform .7s ease}'
    + '.gs-game:hover .gs-art::after{transform:translateX(130%)}'
    + '.gs-game img{display:block;width:100%;height:auto;aspect-ratio:4/3;object-fit:cover;transition:transform .35s ease}'
    + '.gs-tallg .gs-game img{aspect-ratio:600/780}'
    + '.gs-game:hover img{transform:scale(1.05)}'
    + '.gs-game.gs-now{box-shadow:0 0 0 3px #ffd257,0 6px 16px rgba(20,30,40,.25)}'
    + '.gs-game .gs-badge{position:absolute;top:7px;left:7px;padding:4px 8px;border-radius:999px;background:#ffd257;color:#3b2a00;font:800 12px/1 Archivo,"Segoe UI",sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.35)}'
    // the Daily challenges tile (it opens the Games page's Daily challenges): a calendar page, drawn here
    + '.gs-daily .gs-bar{container-type:inline-size}.gs-daily .gs-bar b{font-size:min(14.5px,calc((100cqi - 41px) / 8.9))}'
    + '.gs-art.gs-cal{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:9px;aspect-ratio:600/780;padding:10px;background:radial-gradient(circle at 50% 40%,#ffcf4d 0,#e39b00 40%,#7a4b00 100%)}'
    + '.gs-cal span{display:flex;flex-direction:column;align-items:center;width:76%;border-radius:10px;overflow:hidden;background:#fffdf7;color:#2a1d00;box-shadow:0 8px 18px rgba(60,30,0,.45);transform:rotate(-3deg)}'
    + '.gs-cal em{align-self:stretch;padding:5px 0;background:#d42a2a;color:#fff;text-align:center;font:800 11px/1 Archivo,"Segoe UI",sans-serif;letter-spacing:.1em;text-transform:uppercase;font-style:normal}'
    + '.gs-cal strong{padding:4px 0 6px;font:600 40px/1 "Clash Display",Archivo,"Segoe UI",sans-serif}'
    + '.gs-cal small{color:#fff;font:700 12.5px/1.25 Archivo,"Segoe UI",sans-serif;text-align:center;text-shadow:0 1px 2px rgba(0,0,0,.45)}'
    + '.gs-more{display:inline-block;margin-top:14px;color:#146c3a;font-weight:700}'
    + '.gs-x{position:sticky;top:0;float:right;z-index:2;width:44px;height:44px;margin:-10px -10px 0 10px;border:0;border-radius:50%;background:rgba(21,33,26,.08);color:#15211a;font:400 28px/1 Archivo,sans-serif;cursor:pointer;display:grid;place-items:center}.gs-x:hover{background:rgba(21,33,26,.16)}'
    + '@keyframes gsIn{from{opacity:0;transform:translateY(12px) scale(.97)}to{opacity:1;transform:none}}'
    + '@media (prefers-reduced-motion:reduce){.gs-game{animation:none;transition:none}.gs-game:hover,.gs-game:hover img{transform:none}.gs-art::after{display:none}}'
    + '@media (max-width:700px){.gs-games,.gs-games.gs-tallg{grid-template-columns:repeat(2,minmax(0,1fr))}}'
    + '@media (max-width:460px){.gs-sheet{padding:20px 16px 16px}.gs-two{grid-template-columns:1fr}.gs-opts{grid-template-columns:1fr}.gs-games{gap:10px}}';

  function build() {
    if (built) return; built = true;
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    var h = '<div class="gs-scrim" id="gsShare" hidden><div class="gs-sheet" role="dialog" aria-modal="true" aria-labelledby="gsShareH">'
      + '<h2 id="gsShareH">Share</h2><p class="gs-soft" id="gsShareSub">Send it to a friend &mdash; it&rsquo;s free, with no adverts.</p>'
      + '<div class="gs-opts">'
      + '<a class="gs-opt" id="gsWa" href="#" target="_blank" rel="noopener">' + ICON.wa + 'WhatsApp</a>'
      + '<a class="gs-opt" id="gsFb" href="#" target="_blank" rel="noopener">' + ICON.fb + 'Facebook</a>'
      + '<a class="gs-opt" id="gsMail" href="#">' + ICON.mail + 'Email</a>'
      + '<button class="gs-opt" id="gsCopy" type="button">' + ICON.copy + 'Copy the link</button>'
      + '<button class="gs-opt" id="gsMore" type="button" hidden>' + ICON.more + 'Other ways&hellip;</button>'
      + '</div><p class="gs-done" id="gsDone" role="status" aria-live="polite"></p>'
      + '<p class="gs-soft" style="margin:6px 0 0">What they&rsquo;ll get:</p><p class="gs-msg" id="gsMsg"></p>'
      + '<div class="gs-row"><button class="gs-btn" type="button" data-gs-close>Close</button></div></div></div>'
      + '<div class="gs-scrim" id="gsGames" hidden><div class="gs-sheet gs-wide" role="dialog" aria-modal="true" aria-labelledby="gsGamesH">'
      + '<h2 id="gsGamesH">Our games</h2><p class="gs-soft">All free, with no adverts. Tap one to play, or <a href="/games/" style="color:#146c3a;font-weight:700">see them all on the Games page</a>.</p><div id="gsGamesList"></div>'
      + '<a class="gs-more" href="/games/">See them all on the Games page &rarr;</a>'
      + '<div class="gs-row"><button class="gs-btn" type="button" data-gs-close>Close</button></div></div></div>'
      + '<div class="gs-scrim" id="gsAny" hidden><div class="gs-sheet" role="dialog" aria-modal="true" aria-labelledby="gsAnyH"><h2 id="gsAnyH"></h2><div id="gsAnyB"></div>'
      + '<div class="gs-row"><button class="gs-btn" type="button" data-gs-close>Close</button></div></div></div>'
      + '<div class="gs-scrim" id="gsFeed" hidden><div class="gs-sheet" role="dialog" aria-modal="true" aria-labelledby="gsFeedH">'
      + '<form id="gsForm" novalidate><h2 id="gsFeedH">Tell us what you think</h2><p class="gs-soft" id="gsFeedSub"></p>'
      + '<fieldset class="gs-moods" id="gsMoods"><legend id="gsMoodQ"></legend>'
      + '<button type="button" class="gs-mood" data-mood="love" aria-pressed="false"><span aria-hidden="true">&#128512;</span>Love it</button>'
      + '<button type="button" class="gs-mood" data-mood="ok" aria-pressed="false"><span aria-hidden="true">&#128578;</span>It&rsquo;s OK</button>'
      + '<button type="button" class="gs-mood" data-mood="no" aria-pressed="false"><span aria-hidden="true">&#128577;</span>Not for me</button></fieldset>'
      + '<label class="gs-field"><span id="gsTextQ"></span><textarea id="gsText" maxlength="1000" rows="4"></textarea></label>'
      + '<div class="gs-two"><label class="gs-field">First name <small>(optional)</small><input id="gsName" maxlength="40" autocomplete="given-name" /></label>'
      + '<label class="gs-field">Town <small>(optional)</small><input id="gsTown" maxlength="40" autocomplete="address-level2" /></label></div>'
      + '<label class="gs-tick gs-off" id="gsCreditL"><input type="checkbox" id="gsCredit" disabled /> <span>If we make it, you can mention my first name and town</span></label>'
      + '<label class="gs-field">Email <small>(optional &mdash; only if you&rsquo;d like a reply)</small><input id="gsEmail" type="email" maxlength="120" autocomplete="email" inputmode="email" /></label>'
      + '<label class="gs-tick gs-off" id="gsNotifyL"><input type="checkbox" id="gsNotify" disabled /> <span id="gsNotifyT">Email me when it&rsquo;s ready</span></label>'
      + '<input class="gs-trap" id="gsTrap" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" />'
      + '<p class="gs-err" id="gsErr" role="alert" hidden></p>'
      + '<div class="gs-row"><button class="gs-btn gs-go" type="submit" id="gsSend">Send</button><button class="gs-btn" type="button" data-gs-close>Cancel</button></div>'
      + '<button class="gs-link" type="button" id="gsSwitch"></button>'
      + '<p class="gs-small">We use this only to improve the games and to reply to you &mdash; never for adverts. <a href="/privacy-policy/" target="_blank" rel="noopener">Privacy policy</a></p></form>'
      + '<div id="gsThanks" hidden><h2>Thank you!</h2><p id="gsThanksP">We read every message. The ideas people ask for most are the ones we build next.</p>'
      + '<div class="gs-row"><button class="gs-btn gs-go" type="button" data-gs-close>Back to the game</button></div></div>'
      + '</div></div>';
    // a close cross at the top of every sheet - a first-timer won't know to tap outside it (games audit, 5 Oct 2026)
    h = h.replace(/(<div class="gs-sheet[^"]*" role="dialog"[^>]*>)/g, '$1<button class="gs-x" type="button" data-gs-close aria-label="Close">&times;</button>');
    var box = document.createElement('div'); box.innerHTML = h;
    while (box.firstChild) document.body.appendChild(box.firstChild);

    document.addEventListener('click', function (e) {
      var t = e.target;
      if (t.closest && t.closest('[data-gs-close]')) { close(); return; }
      if (t.classList && t.classList.contains('gs-scrim')) close();
    });
    // Escape closes a sheet - and goes no further, so a game never also reads it as "pause" (the games skip a key whose default is prevented)
    document.addEventListener('keydown', function (e) { if (openEl && e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } }, true);
    Array.prototype.forEach.call(document.querySelectorAll('.gs-mood'), function (b) {
      b.addEventListener('click', function () {
        mood = mood === b.getAttribute('data-mood') ? '' : b.getAttribute('data-mood');
        Array.prototype.forEach.call(document.querySelectorAll('.gs-mood'), function (x) { x.setAttribute('aria-pressed', String(x.getAttribute('data-mood') === mood)); });
      });
    });
    var tie = function (field, tick, label) {   // a tick only means something once its box is filled in
      var f = function () { var on = $(field).value.trim() !== ''; $(tick).disabled = !on; if (!on) $(tick).checked = false; $(label).classList.toggle('gs-off', !on); };
      $(field).addEventListener('input', f); return f;
    };
    TIE = { name: tie('gsName', 'gsCredit', 'gsCreditL'), mail: tie('gsEmail', 'gsNotify', 'gsNotifyL') };
    $('gsSwitch').addEventListener('click', function () { fill(mode === 'request' ? 'feedback' : 'request'); try { $('gsText').focus(); } catch (e) {} });
    $('gsForm').addEventListener('submit', function (e) { e.preventDefault(); send(); });
    $('gsCopy').addEventListener('click', copyLink);
    $('gsMore').addEventListener('click', function () { var d = $('gsShare')._data; if (d && navigator.share) navigator.share(d).catch(function () {}); });
  }

  // ------------------------------------------------------------ sharing
  function pageUrl(q) { return location.origin + location.pathname + (q || ''); }
  function defaultText() {
    return CFG.id === 'games' ? 'Free card games and arcade games from 365 Techies – no adverts, no sign-in:'
      : 'Play ' + CFG.title + ' free – no adverts, no sign-in:';
  }
  function share(o) {
    o = o || {};
    var url = pageUrl(o.query), text = o.text || defaultText(), data = { title: CFG.title, text: text, url: url };
    var touch = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
    if (touch && navigator.share) {   // a phone or tablet: its own share menu, the one people already know
      navigator.share(data).catch(function (err) { if (!err || err.name !== 'AbortError') openShare(data); });
      return;
    }
    openShare(data);
  }
  function openShare(d) {
    build();
    var whole = d.text + ' ' + d.url;
    $('gsShareH').textContent = CFG.id === 'games' ? 'Share our free games' : 'Share ' + CFG.title;
    $('gsWa').href = 'https://wa.me/?text=' + encodeURIComponent(whole);
    $('gsFb').href = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(d.url);
    $('gsMail').href = 'mailto:?subject=' + encodeURIComponent(CFG.id === 'games' ? 'Free games with no adverts' : 'Try this: ' + CFG.title + ', free with no adverts')
      + '&body=' + encodeURIComponent(d.text + '\n\n' + d.url + '\n');
    $('gsMore').hidden = !navigator.share;
    $('gsMsg').textContent = whole; $('gsDone').textContent = '';
    $('gsShare')._data = d;
    show('gsShare');
  }
  function copyLink() {
    var d = $('gsShare')._data; if (!d) return;
    var whole = d.text + ' ' + d.url, done = function () { $('gsDone').textContent = 'Copied – now paste it into a message or an email.'; };
    var old = function () {   // older browsers: copy through a hidden box
      var ta = document.createElement('textarea'); ta.value = whole; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.appendChild(ta); ta.select(); var ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta);
      if (ok) done(); else $('gsDone').textContent = 'Select the message below and copy it.';
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(whole).then(done, old); else old();
  }

  // ------------------------------------------------------------ feedback and requests
  function fill(m) {
    mode = m === 'request' ? 'request' : 'feedback';
    var g = CFG.id !== 'games' ? CFG.title : '';
    $('gsFeedH').textContent = mode === 'request' ? 'Ask us to make a game' : 'Tell us what you think';
    $('gsFeedSub').textContent = mode === 'request'
      ? 'Which game would you like to play next? The ones people ask for most are the ones we make next – and if we make yours, we can let you know.'
      : 'Every one of our games is still being made, so your ideas decide what we add next – new levels, easier settings, anything.';
    $('gsMoods').hidden = mode === 'request' || !g;
    $('gsMoodQ').textContent = g ? 'How do you like ' + g + '?' : '';
    $('gsTextQ').textContent = mode === 'request' ? 'What game would you like us to make?' : (g ? 'What would make ' + g + ' better?' : 'What would make our games better?');
    $('gsText').placeholder = mode === 'request' ? 'For example: Mahjong, Hearts, a word game…' : 'For example: bigger cards, a slower speed, more levels…';
    $('gsNotifyT').textContent = mode === 'request' ? 'Email me if you make it' : 'Email me when it’s ready';
    $('gsSwitch').textContent = mode === 'request' ? (g ? 'Or tell us about ' + g + ' →' : '') : 'Or ask us to make a new game →';
    $('gsSwitch').hidden = !$('gsSwitch').textContent;
    $('gsErr').hidden = true;
  }
  function openFeedback(m) {
    build();
    mood = ''; Array.prototype.forEach.call(document.querySelectorAll('.gs-mood'), function (x) { x.setAttribute('aria-pressed', 'false'); });
    $('gsText').value = ''; $('gsTrap').value = '';
    TIE.name(); TIE.mail();   // name, town and email are kept from last time, so someone writing twice need not retype them
    $('gsForm').hidden = false; $('gsThanks').hidden = true; $('gsSend').disabled = false; $('gsSend').textContent = 'Send';
    fill(m || 'feedback');
    show('gsFeed');
  }
  function fail(t) { $('gsErr').textContent = t; $('gsErr').hidden = false; $('gsSend').disabled = false; $('gsSend').textContent = 'Send'; }
  function send() {
    var text = $('gsText').value.trim(), email = $('gsEmail').value.trim();
    if (mode === 'request' && !text) { fail('Please tell us which game you would like.'); $('gsText').focus(); return; }
    if (mode !== 'request' && !text && !mood) { fail('Tap a face or write a few words first.'); return; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { fail('That email address doesn’t look quite right – please check it, or leave it empty.'); $('gsEmail').focus(); return; }
    $('gsErr').hidden = true; $('gsSend').disabled = true; $('gsSend').textContent = 'Sending…';
    var body = { kind: mode, game: CFG.id, mood: mode === 'request' ? '' : mood, text: text, name: $('gsName').value.trim(), town: $('gsTown').value.trim(),
      email: email, credit: $('gsCredit').checked, notify: $('gsNotify').checked, website: $('gsTrap').value };
    var done = false, timer = setTimeout(function () { if (!done) { done = true; fail('That took too long – please try again in a moment.'); } }, 15000);
    fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'same-origin' })
      .then(function (r) { return r.json().catch(function () { return { ok: false, error: 'http' + r.status }; }); })
      .then(function (j) {
        if (done) return; done = true; clearTimeout(timer);
        if (j && j.ok) {
          $('gsThanksP').textContent = mode === 'request'
            ? 'We read every request. The games people ask for most are the ones we make next' + (body.notify ? ' – and we’ll email you if we make yours.' : '.')
            : 'We read every message. The ideas people ask for most are the ones we build next' + (body.notify ? ' – and we’ll email you when it’s ready.' : '.');
          $('gsForm').hidden = true; $('gsThanks').hidden = false;
          var b = $('gsThanks').querySelector('button'); if (b) { b.textContent = CFG.id === 'games' ? 'Close' : 'Back to the game'; try { b.focus(); } catch (e) {} }
        } else if (j && j.error === 'rate') fail('Thank you – that’s plenty for one day! Please send more tomorrow.');
        else if (j && j.error === 'email') fail('That email address doesn’t look quite right – please check it, or leave it empty.');
        else fail('Sorry, that didn’t send. Please try again in a moment, or ring us on 01202 775566.');
      })
      .catch(function () { if (done) return; done = true; clearTimeout(timer); fail('Sorry, that didn’t send – is the internet connected? Please try again.'); });
  }

  // ------------------------------------------------------------ the games menu (4 Oct 2026, owner: "they can pick other games from within the game")
  // The list is games/games.json - the same one PC Manager and the Games page read. Addresses become paths, so the menu
  // stays on the site the player is on (and inside PC Manager's window).
  // Each game's "look" in games.json gives its tile: colours (c1 the title bar, c2 the deep shade), a white glyph for the
  // bar, and for a card game "cover" - its portrait cover picture (games/img/covers/<id>-v<cover>.svg, our own art).
  var GAMES = null, HEX = /^#[0-9a-f]{6}$/i;
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var DAILY = { c1: '#c98a00', c2: '#4a3000', glyph: '<path d="M6 3h2v2h8V3h2v2h1.5A1.5 1.5 0 0 1 21 6.5v13a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19.5v-13A1.5 1.5 0 0 1 4.5 5H6zM5 9v10h14V9z"/><path d="m12 10.4 1.2 2.4 2.6.4-1.9 1.8.5 2.6-2.4-1.2-2.4 1.2.5-2.6-1.9-1.8 2.6-.4z"/>' };
  function gamePic(g) {   // pic / cover: a new picture's number (images cache for a year)
    var L = g.look || {};
    if (L.cover) return '/games/img/covers/' + g.id + '-v' + L.cover + '.svg';
    return g.id === 'seafront' ? '/bournemouth/games/seafront/media/lv-pirate.webp' : '/games/img/' + g.id + '-v' + (g.pic || 1) + '.webp';
  }
  function gamePath(u) { return String(u || '').replace(/^https?:\/\/(www\.)?365techies\.co\.uk/, ''); }
  function tileStyle(L, i) { return '--i:' + i + (HEX.test(L.c1 || '') && HEX.test(L.c2 || '') ? ';--c1:' + L.c1 + ';--c2:' + L.c2 : ''); }
  function bar(L, title) { return '<span class="gs-bar">' + (L.glyph ? '<svg viewBox="0 0 24 24" fill="#fff" aria-hidden="true">' + L.glyph + '</svg>' : '') + '<b>' + esc(title) + '</b></span>'; }
  var CAT = { 'Card games': 'Card games', 'Arcade': 'Arcade games', 'Seafront': 'Made in Bournemouth' };
  function drawGames() {
    var by = {}, order = [], i = 0;
    GAMES.forEach(function (g) { if (!by[g.cat]) { by[g.cat] = []; order.push(g.cat); } by[g.cat].push(g); });
    $('gsGamesList').innerHTML = order.map(function (c) {
      var list = by[c], tall = list.some(function (g) { return g.look && g.look.cover; });
      var tiles = list.map(function (g) {
        var L = g.look || {}, now = g.id === CFG.id, t = !!L.cover;
        var inner = bar(L, g.title) + '<span class="gs-art"><img src="' + gamePic(g) + '" alt="" loading="lazy" decoding="async" width="' + (t ? 600 : 800) + '" height="' + (t ? 780 : 600) + '" />'
          + (now ? '<span class="gs-badge">Playing now</span>' : '') + '</span>';
        return now ? '<button type="button" class="gs-game gs-now" data-gs-close style="' + tileStyle(L, i++) + '">' + inner + '</button>'
          : '<a class="gs-game" href="' + esc(gamePath(g.url)) + '" title="' + esc(g.sub || '') + '" style="' + tileStyle(L, i++) + '">' + inner + '</a>';
      });
      if (tall) {   // the card games' 10th tile: Today's deal in every card game, on the Games page
        var d = new Date();
        tiles.push('<a class="gs-game gs-daily" href="/games/#daily" style="' + tileStyle(DAILY, i++) + '">' + bar(DAILY, 'Daily challenges')
          + '<span class="gs-art gs-cal"><span><em>' + MONTHS[d.getMonth()] + '</em><strong>' + d.getDate() + '</strong></span><small>Today&rsquo;s deal in every card game</small></span></a>');
      }
      return '<p class="gs-cat">' + esc(CAT[c] || c) + '</p><div class="gs-games' + (tall ? ' gs-tallg' : list.length === 1 ? ' gs-oneg' : '') + '">' + tiles.join('') + '</div>';
    }).join('');
  }
  // a sheet of the page's own (the Games page's Daily challenges and Hall of Fame): GameSocial.sheet({ title, html, wide })
  function sheet(o) {
    build(); o = o || {};
    $('gsAnyH').textContent = o.title || ''; $('gsAnyB').innerHTML = o.html || '';
    var box = $('gsAny').firstChild; box.classList.toggle('gs-wide', !!o.wide); box.scrollTop = 0;
    show('gsAny');
    return $('gsAnyB');
  }
  function openGames() {
    build();
    if (GAMES) drawGames();
    else {
      $('gsGamesList').innerHTML = '<p class="gs-soft">Loading the games…</p>';
      fetch('/games/games.json', { cache: 'no-cache' }).then(function (r) { return r.json(); })
        .then(function (j) { GAMES = (j && j.games) || []; if (openEl && openEl.id === 'gsGames') drawGames(); })
        .catch(function () { $('gsGamesList').innerHTML = '<p class="gs-soft">The list didn’t load &mdash; <a class="gs-a" href="/games/">see the Games page</a>.</p>'; });
    }
    show('gsGames');
  }

  // ------------------------------------------------------------ the sheets themselves
  function show(id) {
    if (openEl && openEl.id !== id) openEl.hidden = true;
    var wasOpen = !!openEl;
    openEl = $(id); openEl.hidden = false;
    if (!wasOpen) { lastFocus = document.activeElement; if (CFG.onOpen) try { CFG.onOpen(); } catch (e) {} }
    var f = openEl.querySelector(id === 'gsFeed' ? '.gs-mood:not([hidden]), textarea' : id === 'gsGames' || id === 'gsAny' ? '.gs-row .gs-btn' : '.gs-opt');
    if (id === 'gsFeed' && $('gsMoods').hidden) f = $('gsText');
    if (f) try { f.focus({ preventScroll: true }); } catch (e) {}
  }
  function close() {
    if (!openEl) return;
    openEl.hidden = true; openEl = null;
    if (lastFocus && lastFocus.focus && document.body.contains(lastFocus)) { try { lastFocus.focus({ preventScroll: true }); } catch (e) {} }
    if (CFG.onClose) try { CFG.onClose(); } catch (e) {}
  }

  window.GameSocial = {
    init: function (cfg) { for (var k in cfg) CFG[k] = cfg[k]; },
    share: share, openFeedback: openFeedback, openGames: openGames, sheet: sheet, close: close,
    isOpen: function () { return !!openEl; }
  };
})();
