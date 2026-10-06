/* 365 Games - Keep my scores (6 Oct 2026), shared by every game. Owner: carry scores, streaks, trophies, stars and the
 * Hall of Fame name between phones or browsers - "My code" (a code to type in, no sign-in: api/games-code.php) and, for
 * players who want it, their free 365 account (the customer portal's own emailed 6-digit code, pcm-booking.php join /
 * verifycode, with its unticked marketing tick: api/games-acct.php) - then "add Keep my scores to Hearts, Gin, Cribbage,
 * Whist and arcade". One sheet of its own (the gallery's lk-scrim / lk-sheet look, looks.js).
 *
 *   Keep.open()      the sheet (a game's My scores -> Keep my scores)
 *   Keep.sync()      a game has ended: the saved copies (the code's and/or the account's) follow
 *   Keep.refresh()   the My scores button's small line (#sCodeS): in your 365 account / the code / to another phone
 *   Keep.isOpen()    the sheet is showing (a game leaves its keys alone and stops its clock)
 *   Keep.beforeOpen  set by a game: called as the sheet opens (the arcade pauses a running game)
 * A player already signed in to the 365 portal on this phone is linked to their account a moment after the page opens.
 */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  var lastFocus = null, K = {};

  // ---------------------------------------------------------------- the sheet
  var el = document.createElement('div'); el.className = 'lk-scrim kp'; el.id = 'dCode'; el.hidden = true;
  el.innerHTML = '<div class="lk-sheet kp-sheet" role="dialog" aria-modal="true" aria-labelledby="dCodeH"><h2 id="dCodeH">Keep my scores</h2><button class="kp-x" type="button" data-kp-close aria-label="Close">&times;</button>'
    + '<div class="acbox" id="acBox"><p class="mch">In your free 365 account</p>'
    + '<div id="acIn" hidden><p>Signed in as <b id="acName"></b>. Your scores, streaks, trophies and stars are kept in your 365 account &mdash; sign in on any phone or computer and they&rsquo;re there. They update every time you finish a game.</p>'
    + '<p class="acpcm">Your 365 account also runs <a href="/free-pc-health-check/">365 PC Manager</a> &mdash; a free health check for your computer.</p></div>'
    + '<div id="acPick" hidden><p id="acPickQ"></p><div class="lk-row"><button class="lk-btn" type="button" id="acUseAcct">Use my account&rsquo;s scores</button><button class="lk-btn lk-btn2" type="button" id="acUseHere">Keep this phone&rsquo;s scores</button></div></div>'
    + '<div id="acOut"><p class="kp-soft">Never lose them, and carry on from any phone or computer. Free &mdash; we email you a 6-digit code, no password.</p>'
    + '<div id="acStep1"><input id="acEmail" type="email" autocomplete="email" placeholder="Your email address"><input id="acFirst" type="text" autocomplete="given-name" placeholder="Your first name (if you&rsquo;re new)">'
    + '<label class="actick"><input type="checkbox" id="acMkt"> Send me tips and offers from 365 Techies &mdash; you can stop them any time</label><div class="lk-row"><button class="lk-btn" type="button" id="acSend">Email me a code</button></div></div>'
    + '<div id="acStep2" hidden><p>We&rsquo;ve emailed a 6-digit code to <b id="acTo"></b>.</p><input id="acCode" type="text" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="6-digit code">'
    + '<input id="acPhone" type="tel" autocomplete="tel" placeholder="A phone number" hidden><div class="lk-row"><button class="lk-btn" type="button" id="acGo">Sign me in</button></div><button class="linkb" type="button" id="acBack">Use a different email</button></div></div>'
    + '<p class="mcmsg" id="acMsg" role="status" aria-live="polite"></p></div>'
    + '<p class="mch">Or a code, with no account</p><p class="kp-soft">Take your scores, streaks, trophies, Journey stars and Hall of Fame name to another phone &mdash; or from Samsung&rsquo;s browser into Chrome. No sign-in, nothing about you.</p>'
    + '<div class="mcbox" id="mcHave" hidden><span>Your code</span><b id="mcCode"></b><small>Keep it to yourself &mdash; anyone with it can see and change your scores. It updates every time you finish a game.</small><button class="linkb" type="button" id="mcForget">Stop using this code</button></div>'
    + '<div class="lk-row" id="mcGetRow"><button class="lk-btn" type="button" id="mcGet">Get my code</button></div>'
    + '<div class="mcin"><label for="mcIn">Got a code from another phone or browser?</label><div class="mcrow"><input id="mcIn" type="text" inputmode="text" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="9" placeholder="e.g. 7K3P-9QXA"><button class="lk-btn lk-btn2" type="button" id="mcLoad">Bring my scores here</button></div></div>'
    + '<p class="mcmsg" id="mcMsg" role="status" aria-live="polite"></p>'
    + '<div class="lk-row"><button class="lk-btn lk-btn2" type="button" data-kp-close>Done</button></div></div>';
  document.body.appendChild(el);
  function show() { if (!el.hidden) return; if (typeof K.beforeOpen === 'function') try { K.beforeOpen(); } catch (e) {} lastFocus = document.activeElement; el.hidden = false; el.firstChild.scrollTop = 0; var f = el.querySelector('[data-kp-close]'); if (f) try { f.focus({ preventScroll: true }); } catch (e) {} }
  function hide() { if (el.hidden) return; el.hidden = true; if (lastFocus && lastFocus.focus && document.body.contains(lastFocus)) try { lastFocus.focus({ preventScroll: true }); } catch (e) {} }
  el.addEventListener('click', function (e) { var t = e.target; if (t === el || (t.closest && t.closest('[data-kp-close]'))) hide(); });
  document.addEventListener('keydown', function (e) { if (!el.hidden && e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); hide(); } }, true);
  var st = document.createElement('style');
  st.textContent = '.kp [hidden]{display:none!important}.kp-sheet{position:relative;max-width:560px}.kp-x{position:absolute;top:12px;right:12px;width:44px;height:44px;border:0;border-radius:50%;background:rgba(127,127,127,.16);color:inherit;font:400 28px/1 Archivo,sans-serif;cursor:pointer}'
    + '.kp .kp-soft{margin:0 0 10px;color:#5b6b60;font-size:15px;line-height:1.45}.kp .lk-row{margin-top:8px}'
    + '.acbox{margin:8px 0 14px;padding:12px 14px;border-radius:14px;background:#f2f6fb}.mch{margin:8px 0 6px;font-weight:800;font-size:16px;color:#15211a}'
    + '.acbox input[type=email],.acbox input[type=text],.acbox input[type=tel]{display:block;width:100%;box-sizing:border-box;min-height:46px;margin:0 0 8px;padding:0 12px;border:2px solid #e2ded2;border-radius:12px;font:600 17px Archivo,sans-serif;color:#15211a;background:#fff}'
    + '.actick{display:flex;gap:8px;align-items:flex-start;margin:2px 0 4px;font-size:14px;line-height:1.35;color:#5b6b60}.actick input{width:20px;height:20px;flex:none;margin-top:1px}'
    + '.acpcm{font-size:14px;color:#5b6b60}.acpcm a{color:#146c3a;font-weight:700}'
    + '.kp .linkb{border:0;background:none;padding:6px 0 0;color:#5b6b60;font:600 14px Archivo,sans-serif;text-decoration:underline;cursor:pointer}'
    + '.mcbox{display:grid;gap:4px;justify-items:center;margin:10px 0;padding:14px;border-radius:14px;background:#eef6ef;text-align:center}.mcbox span{font-size:14px;color:#5b6b60}'
    + '.mcbox b{font:800 34px/1.1 "Clash Display",Archivo,sans-serif;letter-spacing:.06em;color:#15211a}.mcbox small{font-size:13px;color:#5b6b60;max-width:30em}'
    + '.mcin{margin:14px 0 4px}.mcin label{display:block;font-weight:700;margin:0 0 6px;color:#15211a}.mcrow{display:flex;gap:8px;flex-wrap:wrap}'
    + '.mcrow input{flex:1 1 10em;min-width:0;min-height:46px;padding:0 12px;border:2px solid #e2ded2;border-radius:12px;font:700 20px Archivo,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#15211a;background:#fff}'
    + '.mcrow .lk-btn{flex:1 1 12em}.mcmsg{min-height:1.3em;margin:8px 0 0;font-size:15px;color:#15211a}';
  (document.head || document.documentElement).appendChild(st);

  // ---- My code (owner, 6 Oct 2026): progress to another phone or browser - a code to type in, no sign-in
  var CODE_API = '/api/games-code.php', CODE_RX = /^(sol365|fc365|sp365|tp365|py365|he365|gr365|cr365|wh365|inv365|bb365|ecl365|coast365|cards365|games365):[a-z0-9:_-]{1,40}$|^hof365:player$/;
  var CODE_LOCAL = { 'games365:code': 1, 'games365:app': 1 };   // this phone's own: never sent, never replaced
  function myCode() { try { return localStorage.getItem('games365:code') || ''; } catch (e) { return ''; } }
  function codeKeys() { var o = []; try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && CODE_RX.test(k) && !/:game$/.test(k) && !CODE_LOCAL[k]) o.push(k); } } catch (e) {} return o; }
  function codeData() { var o = {}; codeKeys().forEach(function (k) { try { o[k] = localStorage.getItem(k); } catch (e) {} }); return o; }
  function codeCall(body) { return fetch(CODE_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'same-origin' }).then(function (r) { return r.json().then(function (j) { j._s = r.status; return j; }); }); }
  var codeT = 0;
  function codeSync() { var c = myCode(); if (!c) return; clearTimeout(codeT); codeT = setTimeout(function () { codeCall({ action: 'save', code: c, data: codeData() }).then(function (j) { if (j && j.error === 'no_such_code') { try { localStorage.removeItem('games365:code'); } catch (e) {} } }).catch(function () {}); }, 1200); }
  function codeMsg(t) { $('mcMsg').textContent = t || ''; }
  function codeDraw() { var c = myCode(); $('mcHave').hidden = !c; $('mcGetRow').hidden = !!c; $('mcCode').textContent = c; if ($('sCodeS')) $('sCodeS').textContent = acctOn ? 'in your 365 account' : c ? c : 'to another phone'; }
  var codeAsk = '';
  function openCode() { codeAsk = ''; codeMsg(''); $('mcIn').value = ''; codeDraw(); acctDraw(); show(); }
  $('mcGet').onclick = function () {
    codeMsg('Making your code…'); $('mcGet').disabled = true;
    codeCall({ action: 'new', data: codeData() }).then(function (j) {
      $('mcGet').disabled = false;
      if (!j || !j.code) { codeMsg(j && j.error === 'too_many' ? 'Too many tries just now - have another go in an hour.' : 'Sorry, that didn’t work - check you’re online and try again.'); return; }
      try { localStorage.setItem('games365:code', j.code); } catch (e) {}
      codeDraw(); codeMsg('Done - write it down, or take a photo of it.');
    }).catch(function () { $('mcGet').disabled = false; codeMsg('Sorry, that didn’t work - check you’re online and try again.'); });
  };
  $('mcLoad').onclick = function () {
    var c = ($('mcIn').value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (c.length !== 8) { codeMsg('A code has 8 letters and numbers, like 7K3P-9QXA.'); return; }
    var pretty = c.slice(0, 4) + '-' + c.slice(4);
    if (codeAsk !== c) { codeAsk = c; codeMsg('This replaces the scores on this phone with the ones saved under ' + pretty + '. Tap “Bring my scores here” again to go ahead.'); return; }
    codeMsg('Fetching your scores…'); $('mcLoad').disabled = true;
    codeCall({ action: 'load', code: c }).then(function (j) {
      $('mcLoad').disabled = false;
      if (!j || !j.data) { codeAsk = ''; codeMsg(j && j.error === 'too_many' ? 'Too many tries just now - have another go in an hour.' : 'No scores are saved under ' + pretty + ' - check the code and try again.'); return; }
      try {
        codeKeys().forEach(function (k) { localStorage.removeItem(k); });
        for (var k in j.data) if (CODE_RX.test(k) && !/:game$/.test(k) && !CODE_LOCAL[k] && typeof j.data[k] === 'string') localStorage.setItem(k, j.data[k]);
        localStorage.setItem('games365:code', j.code || pretty);
      } catch (e) { codeMsg('Sorry, this phone wouldn’t store them - is it in private browsing?'); return; }
      codeMsg('Your scores are here - starting again with them…');
      setTimeout(function () { location.reload(); }, 900);
    }).catch(function () { $('mcLoad').disabled = false; codeMsg('Sorry, that didn’t work - check you’re online and try again.'); });
  };
  $('mcForget').onclick = function () {
    var c = myCode(); if (!c) return;
    if (codeAsk !== 'forget') { codeAsk = 'forget'; codeMsg('Tap “Stop using this code” again: the copy saved under ' + c + ' is deleted; your scores stay on this phone.'); return; }
    codeCall({ action: 'forget', code: c }).catch(function () {});
    try { localStorage.removeItem('games365:code'); } catch (e) {}
    codeAsk = ''; codeDraw(); codeMsg('Done - that code no longer works.');
  };

  // ---- Keep my scores in my free 365 account (owner, 6 Oct 2026): the portal's own sign-in - the emailed 6-digit code
  // (pcm-booking.php join / verifycode) and its session (localStorage p365 + p365mid), so joining here is joining 365
  var ACCT_API = '/api/games-acct.php', BK_API = '/api/pcm-booking.php', acctOn = false, acctT = 0, acEmail = '';
  function portalS() { try { var x = JSON.parse(localStorage.getItem('p365') || 'null'); return x && x.wtoken ? x : null; } catch (e) { return null; } }
  function machineId() {   // the portal's mid(), so a session made here is the portal's own
    var m = ''; try { m = localStorage.getItem('p365mid') || ''; } catch (e) {}
    if (!/^[a-f0-9]{32}$/.test(m)) { var a = new Uint8Array(16); (window.crypto || window.msCrypto).getRandomValues(a); m = ''; for (var i = 0; i < 16; i++) m += ('0' + a[i].toString(16)).slice(-2); try { localStorage.setItem('p365mid', m); } catch (e) {} }
    return m;
  }
  function jpost(url, body) { return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store', credentials: 'same-origin' }).then(function (r) { return r.json(); }); }
  function acctCall(body) { var ps = portalS(); body.auth = { wtoken: ps ? ps.wtoken : '', machine: machineId() }; return jpost(ACCT_API, body); }
  function acMsg(t) { $('acMsg').textContent = t || ''; }
  function localPlayed() { var n = 0; codeKeys().forEach(function (k) { if (/:stats$/.test(k)) { try { var x = JSON.parse(localStorage.getItem(k) || '{}'); n += (+x.played || 0); } catch (e) {} } }); return n; }
  function acctDraw() {
    var ps = portalS(); $('acIn').hidden = !(ps && acctOn); $('acOut').hidden = !!(ps && acctOn) || !$('acPick').hidden;
    if (ps && acctOn) $('acName').textContent = ps.name || 'you';
  }
  function acctSync() { if (!acctOn || !portalS()) return; clearTimeout(acctT); acctT = setTimeout(function () { acctCall({ action: 'save', data: codeData() }).catch(function () {}); }, 1500); }
  // a signed-in player meets their account: nothing saved there yet -> keep this phone's; nothing played here -> bring
  // the account's; both -> they choose. The choice is made once per phone (games365:acctlinked).
  function acctLink(fromSheet) {
    return acctCall({ action: 'me' }).then(function (me) {
      if (!me || !me.ok) { acctOn = false; if (fromSheet) acMsg(me && me.error === 'team_member' ? 'That’s a company account - sign in with your own email to keep game scores.' : ''); acctDraw(); return; }
      var linked = false; try { linked = localStorage.getItem('games365:acctlinked') === '1'; } catch (e) {}
      if (linked || !me.at) { acctOn = true; try { localStorage.setItem('games365:acctlinked', '1'); } catch (e) {} if (!me.at) acctSync(); acctDraw(); codeDraw(); return; }
      if (!localPlayed()) { acctBring(); return; }
      $('acPickQ').textContent = 'Your 365 account already has scores saved. Which would you like on this phone?';
      $('acPick').hidden = false; $('acOut').hidden = true; $('acIn').hidden = true;
      if (!fromSheet) { codeAsk = ''; codeMsg(''); codeDraw(); show(); }
    }).catch(function () {});
  }
  function acctBring() {
    acMsg('Bringing your scores…');
    acctCall({ action: 'load' }).then(function (j) {
      if (!j || !j.ok) { acMsg('Sorry, that didn’t work - try again.'); return; }
      try {
        if (j.data) { codeKeys().forEach(function (k) { localStorage.removeItem(k); }); for (var k in j.data) if (CODE_RX.test(k) && !/:game$/.test(k) && !CODE_LOCAL[k] && typeof j.data[k] === 'string') localStorage.setItem(k, j.data[k]); }
        localStorage.setItem('games365:acctlinked', '1');
      } catch (e) { acMsg('Sorry, this phone wouldn’t store them - is it in private browsing?'); return; }
      acMsg('Your scores are here - starting again with them…'); setTimeout(function () { location.reload(); }, 900);
    }).catch(function () { acMsg('Sorry, that didn’t work - check you’re online and try again.'); });
  }
  $('acUseAcct').onclick = acctBring;
  $('acUseHere').onclick = function () { try { localStorage.setItem('games365:acctlinked', '1'); } catch (e) {} $('acPick').hidden = true; acctOn = true; acctSync(); acctDraw(); codeDraw(); acMsg('Done - this phone’s scores are now kept in your account.'); };
  $('acSend').onclick = function () {
    var em = ($('acEmail').value || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { acMsg('Please type your email address.'); return; }
    acEmail = em.toLowerCase(); $('acSend').disabled = true; acMsg('Sending your code…');
    jpost(BK_API, { action: 'join', email: acEmail, machine: machineId() }).then(function (d) {
      $('acSend').disabled = false;
      if (d && (d.ok || d.have_code)) { $('acStep1').hidden = true; $('acStep2').hidden = false; $('acTo').textContent = acEmail; acMsg(d.have_code && !d.ok ? 'Use the code we sent you a moment ago.' : ''); try { $('acCode').focus(); } catch (e) {} return; }
      acMsg(d && d.error === 'bad_email' ? 'That email address doesn’t look right.' : d && /throttle|too_many|slow/.test(d.error || '') ? 'Too many codes just now - try again in an hour.' : 'Sorry, we couldn’t send a code - try again, or ring 01202 775566.');
    }).catch(function () { $('acSend').disabled = false; acMsg('Couldn’t reach us - check you’re online and try again.'); });
  };
  $('acBack').onclick = function () { $('acStep2').hidden = true; $('acStep1').hidden = false; $('acPhone').hidden = true; acMsg(''); };
  $('acGo').onclick = function () {
    var code = ($('acCode').value || '').replace(/[^0-9]/g, '');
    if (code.length !== 6) { acMsg('Please type all 6 digits of the code.'); return; }
    $('acGo').disabled = true; acMsg('Checking…');
    jpost(BK_API, { action: 'verifycode', email: acEmail, code: code, name: ($('acFirst').value || '').trim(), machine: machineId(), shared: 0, marketing: $('acMkt').checked ? 1 : 0, phone: $('acPhone').hidden ? '' : ($('acPhone').value || '').trim() }).then(function (d) {
      $('acGo').disabled = false;
      if (d && d.ok && d.staff) { acMsg('That’s a 365 Techies staff address - use a personal email for your games.'); return; }
      if (d && d.ok && d.team) { acMsg('That’s a company account - sign in with your own email to keep game scores.'); return; }
      if (d && d.ok && d.wtoken) {
        try { localStorage.setItem('p365', JSON.stringify({ wtoken: d.wtoken, name: d.customer || ($('acFirst').value || '').trim(), tier: d.tier, pending: !!d.pending })); } catch (e) {}
        $('acStep2').hidden = true; $('acStep1').hidden = false; acMsg(''); acctLink(true); return;
      }
      if (d && d.error === 'needinfo') {
        if (d.needname) { acMsg('Almost there - please add your first name above, then tap Sign me in again.'); $('acStep2').hidden = true; $('acStep1').hidden = false; $('acSend').hidden = true; $('acStep2').hidden = false; try { $('acFirst').focus(); } catch (e) {} return; }
        if (d.needphone) { $('acPhone').hidden = false; acMsg('Almost there - we just need a phone number to finish setting up your account.'); try { $('acPhone').focus(); } catch (e) {} return; }
      }
      acMsg(d && d.error === 'wrong_code' ? 'That code isn’t right - check and try again.' : d && d.error === 'code_expired' ? 'That code has expired - go back and ask for a fresh one.' : 'Something went wrong - try again, or ring 01202 775566.');
    }).catch(function () { $('acGo').disabled = false; acMsg('Couldn’t reach us - try again.'); });
  };
  // already signed in to the 365 portal on this phone: link up quietly once the table is settled
  if (portalS()) setTimeout(function () { acctLink(false); }, 2500);

  // ---------------------------------------------------------------- for the games
  K.open = openCode;
  K.sync = function () { codeSync(); acctSync(); };
  K.refresh = function () { codeDraw(); };
  K.isOpen = function () { return !el.hidden; };
  K.beforeOpen = null;   // a game's own: e.g. the arcade pauses a running game
  window.Keep = K;
})();
