# -*- coding: utf-8 -*-
r"""365 Techies own-branded booking app (replaces the SimplyBook widget iframe).

Talks ONLY to our own proxy, api/pcm-booking.php:
  pubservices / pubslots   - public, read-only, rate-limited (browse before signing in)
  join / verifycode        - existing PROVEN passwordless code flow (proves inbox ownership,
                             creates the SimplyBook client + customer record + portal session)
  book                     - existing PROVEN authed booking action

So a stranger can never drop junk in the diary, every booking creates a portal account
(the funnel win), and returning visitors with a live session book in one tap.

SimplyBook stays the invisible diary engine; its name never appears.
Self-contained CSS/JS in the section - no styles.css edit, so no CSSV bump needed.

HARD-WON RULES (adversarial review, 2026-07-25 - do not regress):
 * NEVER post the typed phone number as join's `mobile`: the server only accepts UK mobiles
   there, so a landline would hard-fail and NO code would ever be emailed. The code goes by
   email only; the number travels via verifycode/book instead.
 * ALWAYS clear a rejected session (localStorage p365) and fall back to the email+code form.
   A stale token otherwise dead-ends a returning customer forever.
 * Wording must not promise a confirmation email with a calendar file until $CF_LIVE is on
   in api/pcm-review.php.
"""

BOOKING_APP = r'''    <section class="section section--alt" id="book" aria-label="Online booking">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// BOOK ONLINE</p>
          <h2 class="section-title section-title--center" data-title>Pick a time that suits you<span class="title-underline title-underline--center"></span></h2>
          <p class="lede lede--center" data-reveal>Live availability from our own diary. Book in about a minute &mdash; and you&rsquo;ll get a customer portal to manage it in.</p>
        </div>

        <div class="bk" id="bk" data-reveal>
          <ol class="bk__rail" id="bkrail" aria-label="Booking steps">
            <li class="bk__railstep is-on" data-s="1"><span aria-hidden="true">1</span>Service</li>
            <li class="bk__railstep" data-s="2"><span aria-hidden="true">2</span>Time</li>
            <li class="bk__railstep" data-s="3"><span aria-hidden="true">3</span>Details</li>
            <li class="bk__railstep" data-s="4"><span aria-hidden="true">4</span>Done</li>
          </ol>

          <p class="bk__sr" id="bkstatus" role="status" aria-live="polite"></p>

          <div class="bk__panel" id="bkpanel">
            <div class="bk__load">
              <span class="bk__sk"></span><span class="bk__sk"></span><span class="bk__sk"></span>
              <p class="bk__loadtx">Checking our diary&hellip;</p>
            </div>
          </div>

          <p class="bk__foot">
            Rather talk to a person? Call <a href="tel:+441202775566"><strong>01202&nbsp;775566</strong></a> &mdash;
            a real local techie will book it with you.
          </p>
        </div>

        <noscript>
          <p class="bk__foot">Our booking page needs JavaScript. Please call <a href="tel:+441202775566"><strong>01202 775566</strong></a> and we&rsquo;ll book it for you in a minute.</p>
        </noscript>
      </div>

      <style>
        .bk{--bk-on:#0f6ea8;max-width:900px;margin:0 auto;background:var(--glass);border:1px solid var(--line);border-radius:18px;overflow:hidden}
        .bk__rail{display:flex;list-style:none;margin:0;padding:0;border-bottom:1px solid var(--line);background:rgba(255,255,255,.02)}
        .bk__rail li{flex:1 1 0;display:flex;align-items:center;justify-content:center;gap:.5rem;padding:.85rem .4rem;font:600 .82rem/1 var(--font-display);color:var(--muted);border-right:1px solid var(--line);transition:color .3s,background .3s}
        .bk__rail li:last-child{border-right:0}
        .bk__rail li span{width:24px;height:24px;border-radius:999px;border:1px solid rgba(125,170,220,.42);display:grid;place-items:center;font:700 .75rem/1 var(--font-mono);flex:0 0 auto;transition:all .3s}
        .bk__railstep.is-on{color:var(--ink);background:rgba(29,151,227,.1)}
        .bk__railstep.is-on span{background:var(--bk-on);border-color:var(--bk-on);color:#fff}
        .bk__railstep.is-done span{background:rgba(29,151,227,.2);border-color:var(--cyan);color:var(--cyan-soft)}
        .bk__sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
        .bk__panel{padding:1.4rem 1.2rem;min-height:230px}
        .bk__h{font:700 1.15rem/1.3 var(--font-display);margin:0 0 .25rem}
        .bk__h:focus{outline:none}
        .bk__sub{color:var(--muted);font-size:.9rem;margin:0 0 1.1rem}
        .bk__grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:.7rem}
        .bk__svc{text-align:left;background:rgba(255,255,255,.03);border:1px solid rgba(125,170,220,.42);border-radius:14px;padding:.9rem 1rem;min-height:64px;cursor:pointer;color:inherit;font:inherit;transition:transform .2s,border-color .2s,background .2s}
        .bk__svc:hover,.bk__svc:focus-visible{transform:translateY(-2px);border-color:var(--cyan);background:rgba(29,151,227,.09);outline:2px solid var(--cyan-soft);outline-offset:2px}
        .bk__svc strong{display:block;font-size:1rem;margin-bottom:.15rem}
        .bk__svcd{display:block;color:var(--muted);font-size:.84rem;line-height:1.45;margin:.1rem 0 .3rem}
        .bk__svc em{font-style:normal;color:var(--muted);font-size:.82rem;font-family:var(--font-mono)}
        .bk__days{display:flex;gap:.45rem;overflow-x:auto;padding:.15rem .15rem .7rem;scrollbar-width:thin}
        .bk__day{flex:0 0 auto;min-width:82px;min-height:56px;text-align:center;background:rgba(255,255,255,.03);border:1px solid rgba(125,170,220,.42);border-radius:12px;padding:.55rem .5rem;cursor:pointer;color:inherit;font:inherit;transition:background .2s,border-color .2s}
        .bk__day:hover,.bk__day:focus-visible{border-color:var(--cyan);outline:2px solid var(--cyan-soft);outline-offset:2px}
        .bk__day[aria-pressed="true"]{background:var(--bk-on);border-color:var(--bk-on);color:#fff}
        .bk__day b{display:block;font:700 .9rem/1.3 var(--font-display)}
        .bk__day i{font-style:normal;font-size:.74rem;font-family:var(--font-mono);color:var(--muted)}
        .bk__day[aria-pressed="true"] i{color:#e8f4ff}
        .bk__times{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:.5rem;margin-top:.5rem}
        .bk__t{background:rgba(255,255,255,.03);border:1px solid rgba(125,170,220,.42);border-radius:10px;padding:.7rem .3rem;min-height:46px;cursor:pointer;color:inherit;font:600 .95rem/1 var(--font-mono);transition:background .18s,border-color .18s}
        .bk__t:hover,.bk__t:focus-visible{border-color:var(--cyan);background:rgba(29,151,227,.12);outline:2px solid var(--cyan-soft);outline-offset:2px}
        .bk__field{display:block;margin-bottom:.75rem}
        .bk__field span{display:block;font-size:.84rem;color:var(--ink-2,var(--muted));margin-bottom:.25rem}
        .bk__field input,.bk__field textarea{width:100%;box-sizing:border-box;padding:.7rem .75rem;border-radius:10px;border:1px solid rgba(125,170,220,.42);background:rgba(255,255,255,.05);color:inherit;font:inherit}
        .bk__field textarea{resize:vertical;min-height:64px}
        .bk__field input:focus,.bk__field textarea:focus{border-color:var(--cyan);outline:2px solid var(--cyan-soft);outline-offset:1px}
        .bk__opt{font-size:.8rem;color:var(--muted);font-weight:400}
        .bk__code{letter-spacing:.4em;font-family:var(--font-mono);font-size:1.3rem;text-align:center}
        .bk__btn{display:inline-flex;align-items:center;gap:.5rem;background:var(--bk-on);color:#fff;border:0;border-radius:999px;padding:.8rem 1.5rem;min-height:46px;font:700 .95rem/1 var(--font-display);cursor:pointer;text-decoration:none;transition:filter .2s,transform .2s}
        .bk__btn:hover:not(:disabled){filter:brightness(1.15);transform:translateY(-1px)}
        .bk__btn:focus-visible{outline:2px solid var(--cyan-soft);outline-offset:3px}
        .bk__btn:disabled{opacity:.6;cursor:default}
        .bk__back{background:none;border:0;color:var(--cyan-soft);font:inherit;font-size:.88rem;cursor:pointer;padding:.6rem .3rem;text-decoration:underline}
        .bk__back:hover{color:var(--ink)}
        .bk__row{display:flex;align-items:center;gap:.9rem;flex-wrap:wrap;margin-top:1rem}
        .bk__pick{background:rgba(29,151,227,.1);border:1px solid rgba(29,151,227,.4);border-radius:12px;padding:.65rem .9rem;font-size:.9rem;margin-bottom:1rem}
        .bk__pick b{font-family:var(--font-display)}
        .bk__note{color:var(--muted);font-size:.84rem;margin:.9rem 0 0;line-height:1.55}
        .bk__note a{color:var(--cyan-soft)}
        .bk__err{color:#ffb4b4;font-size:.9rem;margin:.7rem 0 0;min-height:1.2em}
        .bk__ok{text-align:center;padding:.5rem 0}
        .bk__tick{width:60px;height:60px;border-radius:999px;background:rgba(60,220,130,.16);border:1px solid rgba(60,220,130,.55);display:grid;place-items:center;margin:0 auto .8rem;font-size:1.8rem;color:#7fe8b4;animation:bktick .5s cubic-bezier(.2,1.4,.4,1)}
        .bk__opts{display:flex;align-items:flex-start;gap:.55rem;margin:.2rem 0 .9rem;font-size:.85rem;color:var(--muted);line-height:1.5}
        .bk__opts input{margin-top:.2rem;flex:0 0 auto;width:18px;height:18px}
        .bk__foot{text-align:center;color:var(--muted);font-size:.88rem;margin:1rem auto 0;max-width:620px}
        .bk__foot a{color:var(--cyan-soft);text-decoration:none}.bk__foot a:hover{text-decoration:underline}
        .bk__load{display:grid;gap:.6rem;padding:.4rem 0}
        .bk__sk{display:block;height:48px;border-radius:12px;background:linear-gradient(90deg,rgba(255,255,255,.04),rgba(255,255,255,.1),rgba(255,255,255,.04));background-size:200% 100%;animation:bksh 1.3s linear infinite}
        .bk__loadtx{text-align:center;color:var(--muted);font-size:.86rem;margin:.3rem 0 0}
        .bk__empty{color:var(--muted);font-size:.92rem;line-height:1.6}
        @keyframes bksh{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @keyframes bktick{from{transform:scale(.4);opacity:0}to{transform:scale(1);opacity:1}}
        @media(max-width:560px){.bk__rail li{font-size:.72rem;padding:.7rem .2rem;gap:.3rem}.bk__rail li span{width:20px;height:20px;font-size:.68rem}.bk__panel{padding:1.1rem .85rem}}
        @media(prefers-reduced-motion:reduce){.bk__sk,.bk__tick{animation:none}.bk__svc:hover,.bk__btn:hover{transform:none}}
      </style>

      <script>
      (function () {
        var API = '/api/pcm-booking.php';
        var P = document.getElementById('bkpanel');
        var ST = document.getElementById('bkstatus');
        if (!P) return;
        var S = { svcId: 0, svcName: '', mins: 0, days: [], dayIx: 0, date: '', time: '',
                  email: '', name: '', phone: '', note: '', refby: '', mk: false, shared: false };
        var busyFlag = false;

        var _mid = '';
        function mid() {
          // memoised: if localStorage is blocked (private mode / strict privacy settings) a
          // fresh id per call would make verifycode and book disagree and every booking fail
          if (_mid) return _mid;
          var m = '';
          try { m = localStorage.getItem('p365mid') || ''; } catch (e) {}
          if (!/^[a-f0-9]{32}$/.test(m)) {
            var a = new Uint8Array(16); crypto.getRandomValues(a); m = '';
            for (var i = 0; i < 16; i++) m += ('0' + a[i].toString(16)).slice(-2);
            try { localStorage.setItem('p365mid', m); } catch (e) {}
          }
          _mid = m; return _mid;
        }
        function rawSess() { try { return JSON.parse(localStorage.getItem('p365') || '{}') || {}; } catch (e) { return {}; } }
        function sess() { var s = rawSess(); return (s && s.wtoken && !s.staff && !s.stoken) ? s : null; }
        function saveSess(o) {
          try {
            var cur = rawSess();
            if (cur && (cur.staff || cur.stoken)) return;   // never clobber a staff session
            var m = {}; var k;
            for (k in cur) if (Object.prototype.hasOwnProperty.call(cur, k)) m[k] = cur[k];
            for (k in o) if (Object.prototype.hasOwnProperty.call(o, k)) m[k] = o[k];
            localStorage.setItem('p365', JSON.stringify(m));
          } catch (e) {}
        }
        function dropSess() {
          try { localStorage.removeItem('p365'); } catch (e) {}
          // clear the HttpOnly session cookie too, or the portal's next boot
          // re-adopts the session this person just walked away from
          post({ action: 'weblogout' }).catch(function () {});
        }
        function esc(s) { var d = document.createElement('div'); d.textContent = String(s == null ? '' : s); return d.innerHTML.split('"').join('&quot;').split("'").join('&#39;'); }
        function say(m) { if (ST) ST.textContent = m || ''; }
        function post(body) {
          return fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store' })
            .then(function (r) { return r.json(); });
        }
        function rail(n) {
          var li = document.querySelectorAll('#bkrail .bk__railstep');
          for (var i = 0; i < li.length; i++) {
            var s = +li[i].getAttribute('data-s');
            li[i].className = 'bk__railstep' + (s === n ? ' is-on' : (s < n ? ' is-done' : ''));
          }
        }
        function loading(msg) {
          busyFlag = true; say(msg);
          P.innerHTML = '<div class="bk__load"><span class="bk__sk"></span><span class="bk__sk"></span><span class="bk__sk"></span><p class="bk__loadtx">' + esc(msg) + '</p></div>';
        }
        function focusH(sel) {
          var h = P.querySelector(sel || '.bk__h');
          if (h) { if (!h.hasAttribute('tabindex')) h.setAttribute('tabindex', '-1'); try { h.focus({ preventScroll: true }); } catch (e) {} }
        }
        // retry resumes where it FAILED - never dumps the customer back to step 1 having
        // silently thrown away the service and time they already chose
        function oops(msg, retry, label) {
          busyFlag = false; say(msg);
          P.innerHTML = '<p class="bk__h">Sorry &mdash; that didn&rsquo;t work</p><p class="bk__empty">' + esc(msg) + '</p>' +
            '<p class="bk__note">Please call <a href="tel:+441202775566"><strong>01202 775566</strong></a> and we&rsquo;ll book it with you in a minute &mdash; it takes us about the same time.</p>' +
            '<div class="bk__row"><button class="bk__btn" id="bkretry">' + esc(label || 'Try again') + '</button></div>';
          document.getElementById('bkretry').onclick = retry || step1;
          focusH();
        }
        function netMsg(r) {
          if (r && r.error === 'busy') return 'We’re a bit busy right now — give it a minute and try again.';
          return 'We couldn’t reach our booking system just now.';
        }
        function fmtT(t) {
          var p = String(t).split(':'), h = +p[0], m = p[1] || '00';
          var ap = h >= 12 ? 'pm' : 'am', hh = h % 12; if (hh === 0) hh = 12;
          return hh + ':' + m + ap;
        }
        function minsTxt(m) {
          if (!m) return 'an hour';
          if (m < 60) return m + ' minutes';
          var h = Math.floor(m / 60), r = m % 60;
          return h + (h === 1 ? ' hour' : ' hours') + (r ? ' ' + r + ' minutes' : '');
        }

        // ---------- step 1: service ----------
        function step1() {
          rail(1); loading('Loading our services…');
          post({ action: 'pubservices' }).then(function (r) {
            if (!r || !r.ok || !r.services || !r.services.length) return oops(r && r.error === 'busy' ? netMsg(r) : 'We couldn’t load the list of services just now.', step1);
            busyFlag = false; say('Step 1 of 4. Choose a service.');
            var h = '<p class="bk__h">What can we help with?</p><p class="bk__sub">Choose the appointment that fits best &mdash; not sure? Pick the closest and we&rsquo;ll sort it on the day.</p><div class="bk__grid">';
            for (var i = 0; i < r.services.length; i++) {
              var s = r.services[i];
              h += '<button type="button" class="bk__svc" data-id="' + (+s.id) + '" data-n="' + esc(s.name) + '" data-m="' + (+s.mins) + '"><strong>' + esc(s.name) + '</strong>'
                 + (s.desc ? '<span class="bk__svcd">' + esc(s.desc) + '</span>' : '')
                 + '<em>about ' + esc(minsTxt(+s.mins)) + '</em></button>';
            }
            h += '</div><p class="bk__note">Every visit includes our promises: we phone before we arrive or connect, and the diagnosis is always free.</p>';
            P.innerHTML = h;
            var bs = P.querySelectorAll('.bk__svc');
            for (var j = 0; j < bs.length; j++) bs[j].onclick = function () {
              S.svcId = +this.getAttribute('data-id'); S.svcName = this.getAttribute('data-n'); S.mins = +this.getAttribute('data-m');
              step2();
            };
            focusH();
          }, function () { oops('We couldn’t reach our booking system just now.', step1); });
        }

        // ---------- step 2: time ----------
        function step2(fresh) {
          rail(2); loading('Finding your free appointments…');
          var q = { action: 'pubslots', eventId: S.svcId };
          if (fresh) q.fresh = 1;
          post(q).then(function (r) {
            if (!r || !r.ok) return oops(netMsg(r), function () { step2(fresh); });
            S.days = r.days || []; S.dayIx = 0;
            busyFlag = false;
            if (!S.days.length) {
              say('No online slots for that service.');
              P.innerHTML = '<p class="bk__h">No free slots online right now</p><p class="bk__empty">Our online diary is full for the next few weeks &mdash; but we almost always have room, and cancellations come up daily.</p>' +
                '<p class="bk__note">Call <a href="tel:+441202775566"><strong>01202&nbsp;775566</strong></a> and we&rsquo;ll find you a time.</p>' +
                '<div class="bk__row"><button type="button" class="bk__back" id="bkb">&#8592; Choose a different service</button></div>';
              document.getElementById('bkb').onclick = step1; focusH(); return;
            }
            say('Step 2 of 4. Choose a day and time.');
            renderDays();
          }, function () { oops('We couldn’t reach our booking system just now.', function () { step2(fresh); }); });
        }
        function renderDays() {
          var h = '<p class="bk__h">When suits you?</p><p class="bk__sub">' + esc(S.svcName) + ' &middot; about ' + esc(minsTxt(S.mins)) + ' &middot; live availability</p>';
          h += '<div class="bk__days" id="bkdays" role="group" aria-label="Available days">';
          for (var i = 0; i < S.days.length; i++) {
            var d = S.days[i], p = String(d.n).split(' ');
            h += '<button type="button" class="bk__day" aria-pressed="' + (i === S.dayIx) + '" data-i="' + i + '"><b>' + esc(p[0]) + '</b><i>' + esc(p.slice(1).join(' ')) + '</i></button>';
          }
          h += '</div><div class="bk__times" id="bktimes"></div>';
          h += '<div class="bk__row"><button type="button" class="bk__back" id="bkb">&#8592; Choose a different service</button></div>';
          P.innerHTML = h;
          var ds = P.querySelectorAll('.bk__day');
          for (var j = 0; j < ds.length; j++) ds[j].onclick = function () { pickDay(+this.getAttribute('data-i'), this); };
          document.getElementById('bkb').onclick = step1;
          renderTimes();
          focusH();
        }
        function pickDay(ix, btn) {
          // update in place: a full re-render would scroll the day strip back to the start
          // and throw focus to the heading mid-choice
          S.dayIx = ix;
          var ds = P.querySelectorAll('.bk__day');
          for (var i = 0; i < ds.length; i++) ds[i].setAttribute('aria-pressed', (+ds[i].getAttribute('data-i') === ix));
          renderTimes();
          if (btn) { try { btn.scrollIntoView({ block: 'nearest', inline: 'center' }); } catch (e) {} try { btn.focus({ preventScroll: true }); } catch (e) {} }
        }
        function renderTimes() {
          var tw = document.getElementById('bktimes'); if (!tw) return;
          var day = S.days[S.dayIx] || { t: [] }, th = '';
          for (var k = 0; k < day.t.length; k++) th += '<button type="button" class="bk__t" data-t="' + esc(day.t[k]) + '">' + esc(fmtT(day.t[k])) + '</button>';
          tw.innerHTML = th || '<p class="bk__empty">No times left on that day &mdash; try another.</p>';
          var ts = tw.querySelectorAll('.bk__t');
          for (var m = 0; m < ts.length; m++) ts[m].onclick = function () {
            S.date = S.days[S.dayIx].d; S.time = this.getAttribute('data-t'); step3();
          };
        }

        // ---------- step 3: details ----------
        function whenTxt() {
          var d = S.days[S.dayIx];
          return (d ? d.n : S.date) + ' at ' + fmtT(S.time);
        }
        function pickBox() {
          return '<div class="bk__pick"><b>' + esc(S.svcName) + '</b><br>' + esc(whenTxt()) + ' &middot; about ' + esc(minsTxt(S.mins)) + '</div>';
        }
        function step3(msg) {
          rail(3); busyFlag = false;
          var s = sess();
          if (s && s.wtoken) {
            say('Step 3 of 4. Confirm your booking.');
            P.innerHTML = pickBox() +
              '<p class="bk__h">Ready when you are' + (s.name || s.customer ? ', ' + esc(String(s.name || s.customer).split(' ')[0]) : '') + '</p>' +
              '<p class="bk__sub">You&rsquo;re already signed in, so that&rsquo;s all we need.</p>' +
              '<label class="bk__field"><span>Anything we should know before we come? <em class="bk__opt">(optional)</em></span><textarea id="bkno" rows="2" placeholder="e.g. it&rsquo;s very slow since an update &mdash; and the address if we&rsquo;re coming to you"></textarea></label>' +
              // a referred friend who JOINED first (via the card QR -> /join/) books signed
              // in - without this, their referral could never be recorded
              '<label class="bk__field"><span>Did someone recommend us? <em class="bk__opt">(optional)</em></span>' +
              '<input id="bkref" type="text" autocomplete="off" placeholder="Their name &mdash; we&rsquo;d like to thank them"></label>' +
              '<div class="bk__row"><button type="button" class="bk__btn" id="bkgo">Confirm this booking</button><button type="button" class="bk__back" id="bkb">&#8592; Pick another time</button></div>' +
              '<p class="bk__err" id="bkerr"></p>' +
              '<p class="bk__note">Not ' + esc(String(s.name || s.customer || 'you').split(' ')[0]) + '? <button type="button" class="bk__back" id="bknot" style="padding:0">Use a different email</button></p>';
            document.getElementById('bkb').onclick = step2;
            document.getElementById('bknot').onclick = function () { dropSess(); step3(); };
            document.getElementById('bkgo').onclick = function () {
              if (busyFlag) return;
              S.note = (document.getElementById('bkno').value || '').trim();
              var rfEl = document.getElementById('bkref');
              S.refby = rfEl ? (rfEl.value || '').trim() : '';
              this.disabled = true; doBook(s.wtoken);
            };
            focusH(); return;
          }
          say('Step 3 of 4. Your details.');
          P.innerHTML = pickBox() +
            '<p class="bk__h">Your details</p>' +
            '<p class="bk__sub">' + (msg ? esc(msg) + ' ' : '') + 'We&rsquo;ll email you a 6-digit code to check we&rsquo;ve got your address right &mdash; that also sets up your customer portal.</p>' +
            '<label class="bk__field"><span>Your name</span><input id="bkn" type="text" autocomplete="name" placeholder="Jane Smith" value="' + esc(S.name) + '"></label>' +
            '<label class="bk__field"><span>Email address</span><input id="bke" type="email" autocomplete="email" inputmode="email" placeholder="jane@example.com" value="' + esc(S.email) + '"></label>' +
            '<label class="bk__field"><span>Best number to reach you on <em class="bk__opt">(landline is fine)</em></span><input id="bkp" type="tel" autocomplete="tel" placeholder="01202 775566" value="' + esc(S.phone) + '"></label>' +
            '<label class="bk__field"><span>Anything we should know? <em class="bk__opt">(optional)</em></span><textarea id="bkno" rows="2" placeholder="e.g. it&rsquo;s very slow since an update &mdash; and the address if we&rsquo;re coming to you">' + esc(S.note) + '</textarea></label>' +
            // Asked ONLY of people not already signed in - a returning customer doesn't
            // need it, and this is the single question that makes referrals countable.
            '<label class="bk__field"><span>Did someone recommend us? <em class="bk__opt">(optional)</em></span>' +
            '<input id="bkref" type="text" autocomplete="off" placeholder="Their name &mdash; we&rsquo;d like to thank them" value="' + esc(S.refby) + '"></label>' +
            '<p class="bk__note" style="margin:-.35rem 0 .9rem">If a friend sent you, your first Computer Service &amp; Health Check is on us &mdash; and they get a month free on their support plan.</p>' +
            '<label class="bk__opts"><input type="checkbox" id="bksh"' + (S.shared ? ' checked' : '') + '><span>I&rsquo;m using a shared or public computer (we&rsquo;ll sign you out quickly)</span></label>' +
            '<label class="bk__opts"><input type="checkbox" id="bkm"' + (S.mk ? ' checked' : '') + '><span>Send me the occasional plain-English tip on staying safe online. No spam, unsubscribe any time.</span></label>' +
            '<div class="bk__row"><button type="button" class="bk__btn" id="bkgo">Send my code</button><button type="button" class="bk__back" id="bkb">&#8592; Pick another time</button></div>' +
            '<p class="bk__err" id="bkerr"></p>' +
            '<p class="bk__note">We use your details only to arrange and manage your appointment. We never email you a link to sign in &mdash; only a code you type in yourself, so if anyone ever rings asking for it, it&rsquo;s a scam.</p>';
          document.getElementById('bkb').onclick = step2;
          document.getElementById('bkgo').onclick = sendCode;
          focusH();
        }
        function grabDetails() {
          S.name = (document.getElementById('bkn').value || '').trim();
          S.email = (document.getElementById('bke').value || '').trim().toLowerCase();
          S.phone = (document.getElementById('bkp').value || '').trim();
          S.note = (document.getElementById('bkno').value || '').trim();
          var rf = document.getElementById('bkref');
          S.refby = rf ? (rf.value || '').trim() : '';
          S.mk = !!document.getElementById('bkm').checked;
          S.shared = !!document.getElementById('bksh').checked;
        }
        function sendCode() {
          if (busyFlag) return;
          grabDetails();
          var err = document.getElementById('bkerr'), go = document.getElementById('bkgo');
          if (S.name.length < 2) { err.textContent = 'Please tell us your name.'; document.getElementById('bkn').focus(); return; }
          if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(S.email)) { err.textContent = 'That email address doesn’t look right.'; document.getElementById('bke').focus(); return; }
          if (S.phone.replace(/[^0-9]/g, '').length < 9) { err.textContent = 'Please give us a number we can reach you on.'; document.getElementById('bkp').focus(); return; }
          busyFlag = true; go.disabled = true; err.textContent = ''; go.textContent = 'Sending…';
          // NOTE: the phone is deliberately NOT sent as `mobile` - the server only accepts UK
          // mobiles there and a landline would block the code email entirely. It goes as
          // `bk_phone`, which nothing ever texts: it is parked with the name so that a customer
          // who never finds the code can still be rung back. Before this they left no trace at
          // all - warmest lead the site makes, straight through the floor.
          post({ action: 'join', email: S.email, bk_name: S.name, bk_phone: S.phone,
                 bk_what: S.svcName || '', bk_when: whenTxt() }).then(function (r) {
            busyFlag = false;
            if (r && (r.ok || r.have_code)) return codeBox(r && !r.ok && r.have_code);
            go.disabled = false; go.textContent = 'Send my code';
            err.textContent = (r && r.error === 'throttled') ? 'That’s a few codes now — please wait a little, or call 01202 775566 and we’ll book it for you.'
              : 'We couldn’t send your code. Please check the address, or call 01202 775566.';
          }, function () { busyFlag = false; go.disabled = false; go.textContent = 'Send my code'; err.textContent = 'We couldn’t reach our system just now.'; });
        }
        function codeBox(already) {
          rail(3); say('Check your email for a 6-digit code.');
          P.innerHTML = pickBox() +
            '<p class="bk__h">Check your email</p><p class="bk__sub">' + (already ? 'We&rsquo;ve already sent a code to ' : 'We&rsquo;ve sent a 6-digit code to ') +
            '<strong>' + esc(S.email) + '</strong> from <strong>info@365techies.co.uk</strong>. It usually lands within a minute &mdash; please check your junk folder too.</p>' +
            '<label class="bk__field"><span>Your 6-digit code</span><input id="bkc" class="bk__code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="12" placeholder="000000"></label>' +
            '<div class="bk__row"><button type="button" class="bk__btn" id="bkgo">Confirm my booking</button><button type="button" class="bk__back" id="bkre">Send it again</button><button type="button" class="bk__back" id="bkb">&#8592; Change my details</button></div>' +
            '<p class="bk__err" id="bkerr"></p>';
          document.getElementById('bkb').onclick = function () { step3(); };
          document.getElementById('bkre').onclick = function () {
            if (busyFlag) return;
            var e2 = document.getElementById('bkerr'); busyFlag = true; this.disabled = true;
            // send the details on the RESEND too. Someone clicking "send it again" is the
            // likeliest person in the whole funnel to give up, so this is the last record we
            // may ever get of them - it must not arrive emptier than the first one.
            post({ action: 'join', email: S.email, bk_name: S.name, bk_phone: S.phone,
                   bk_what: S.svcName || '', bk_when: whenTxt() }).then(function (r) {
              busyFlag = false;
              e2.textContent = (r && (r.ok || r.have_code)) ? 'Sent — give it a moment, and do check your junk folder.'
                : 'We couldn’t send another code just now. Please call 01202 775566.';
            }, function () { busyFlag = false; e2.textContent = 'We couldn’t send another code just now.'; });
          };
          document.getElementById('bkgo').onclick = verify;
          var c = document.getElementById('bkc');
          var tmr = null;
          c.oninput = function () {
            // sanitise first (a pasted "123 456" would otherwise jam), then auto-submit on a
            // short delay so a mistyped digit can be corrected without burning an attempt
            var v = (this.value || '').replace(/[^0-9]/g, '').slice(0, 6);
            if (v !== this.value) this.value = v;
            if (tmr) clearTimeout(tmr);
            if (v.length === 6) tmr = setTimeout(function () { verify(); }, 450);
          };
          c.focus();
        }
        function verify() {
          if (busyFlag) return;
          var ci = document.getElementById('bkc'); if (!ci) return;
          var code = (ci.value || '').replace(/[^0-9]/g, '');
          var err = document.getElementById('bkerr'), go = document.getElementById('bkgo');
          if (code.length !== 6) { err.textContent = 'Please type all six digits.'; return; }
          busyFlag = true; go.disabled = true; go.textContent = 'Checking…'; err.textContent = '';
          post({ action: 'verifycode', email: S.email, code: code, name: S.name, phone: S.phone,
                 machine: mid(), marketing: S.mk ? 1 : 0, shared: S.shared ? 1 : 0 })
            .then(function (r) {
              busyFlag = false;
              if (r && r.ok && r.staff) {   // staff address: not a customer booking route
                go.disabled = false; go.textContent = 'Confirm my booking';
                err.textContent = 'That’s a 365 staff address — please use the staff diary, or book with a customer email here.';
                return;
              }
              if (!r || !r.ok || !r.wtoken) {
                go.disabled = false; go.textContent = 'Confirm my booking';
                err.textContent = (r && r.error === 'wrong_code') ? 'That code doesn’t match — please check and try again.'
                  : ((r && r.error === 'code_expired') ? 'That code has expired — tap “Send it again” for a fresh one.'
                  : 'We couldn’t check that code just now.');
                ci.value = ''; ci.focus();
                return;
              }
              saveSess({ wtoken: r.wtoken, name: r.customer || S.name, customer: r.customer || S.name, tier: r.tier || 'free' });
              doBook(r.wtoken);
            }, function () { busyFlag = false; go.disabled = false; go.textContent = 'Confirm my booking'; err.textContent = 'We couldn’t reach our system just now.'; });
        }

        // ---------- book + confirm ----------
        function doBook(wtoken) {
          loading('Putting you in the diary…');
          post({ action: 'book', wtoken: wtoken, machine: mid(), eventId: S.svcId, date: S.date, time: S.time, phone: S.phone, note: S.note, refby: S.refby })
            .then(function (r) {
              busyFlag = false;
              if (r && r.ok) return step4(r);
              var e = r && r.error;
              // a rejected session must NEVER leave a returning customer looping: bin it and
              // fall back to the email+code form, keeping the slot they already chose
              if (e === 'expired' || e === 'needsignin' || e === 'not_registered' || e === 'no_client') {
                dropSess();
                return step3(e === 'no_client'
                  ? 'We need to double-check your details for this one.'
                  : 'Your sign-in had expired, so we just need to check your email again.');
              }
              if (e === 'slot_taken') {
                say('That slot has just gone.');
                P.innerHTML = '<p class="bk__h">That slot has just gone</p><p class="bk__empty">Someone booked it while you were typing &mdash; sorry! Here are the times still free.</p>' +
                  '<div class="bk__row"><button type="button" class="bk__btn" id="bkgo">See free times</button></div>';
                document.getElementById('bkgo').onclick = function () { step2(true); }; focusH(); return;
              }
              if (e === 'too_many') {
                say('Booking limit reached.');
                P.innerHTML = '<p class="bk__h">You&rsquo;ve a few appointments booked already</p><p class="bk__empty">You have several visits in the diary, so we&rsquo;d rather arrange this one with you personally &mdash; that way we can make sure the order makes sense.</p>' +
                  '<p class="bk__note">Please call <a href="tel:+441202775566"><strong>01202&nbsp;775566</strong></a> &mdash; we&rsquo;ll sort it in a minute.</p>'; focusH(); return;
              }
              if (r && r.needphone) {
                say('We need a phone number.');
                P.innerHTML = pickBox() + '<p class="bk__h">One last thing</p><p class="bk__sub">We need a number so we can ring you before we arrive.</p>' +
                  '<label class="bk__field"><span>Best number to reach you on</span><input id="bkp2" type="tel" autocomplete="tel" placeholder="01202 775566" value="' + esc(S.phone) + '"></label>' +
                  '<div class="bk__row"><button type="button" class="bk__btn" id="bkgo">Confirm my booking</button></div><p class="bk__err" id="bkerr"></p>';
                document.getElementById('bkgo').onclick = function () {
                  var v = (document.getElementById('bkp2').value || '').trim();
                  if (v.replace(/[^0-9]/g, '').length < 9) { document.getElementById('bkerr').textContent = 'That number doesn’t look right.'; return; }
                  S.phone = v; this.disabled = true; doBook(wtoken);
                };
                focusH(); return;
              }
              oops('We couldn’t finish that booking.', function () { doBook(wtoken); }, 'Try that booking again');
            }, function () { oops('We couldn’t reach our booking system just now.', function () { doBook(wtoken); }, 'Try that booking again'); });
        }
        function step4(r) {
          rail(4);
          var pend = !!(r && r.pending);
          say(pend ? 'Booking requested.' : 'You are booked in.');
          var rep = (r && r.repeats) ? +r.repeats : 0;
          P.innerHTML = '<div class="bk__ok"><div class="bk__tick" aria-hidden="true">&#10003;</div>' +
            '<p class="bk__h">' + (pend ? 'Booking requested' : 'You&rsquo;re booked in') + '</p>' +
            '<p class="bk__sub">' + esc(S.svcName) + '<br><strong>' + esc(r && r.when ? r.when : whenTxt()) + '</strong></p></div>' +
            // a recurring service books a whole series - say so plainly rather than let
            // the customer discover it from a confirmation listing a dozen dates
            (rep ? '<div class="bk__pick" style="margin-top:.2rem"><b>This is a repeating service.</b> It has booked <b>' + rep + ' visits</b>'
                 + (r.last ? ', the last on ' + esc(r.last) : '') + '. If you only wanted the one, ring <a href="tel:+441202775566" style="color:var(--cyan-soft)"><strong>01202&nbsp;775566</strong></a> and we&rsquo;ll sort it in a minute &mdash; no bother at all.</div>' : '') +
            '<p class="bk__note">' + (pend
              ? 'We&rsquo;ll confirm this by email shortly &mdash; if anything clashes we&rsquo;ll ring you to rearrange.'
              : 'You&rsquo;ll get a confirmation email shortly, and it&rsquo;s in your portal right now.') + '</p>' +
            '<p class="bk__note"><strong>What happens next:</strong> we&rsquo;ll phone you before we arrive &mdash; or before we connect, for a remote session. We never turn up or connect out of the blue.</p>' +
            '<div class="bk__row"><a class="bk__btn" href="/portal/">Open your customer portal</a><button type="button" class="bk__back" id="bkb">Book something else</button></div>' +
            '<p class="bk__note">Your portal is where you can move or cancel this appointment, see any reports we write for you, and use our free tools.</p>';
          document.getElementById('bkb').onclick = function () { S.date = ''; S.time = ''; S.note = ''; step1(); };
          focusH();
          try { if (window.gtag) gtag('event', 'booking_complete', { service: S.svcName }); } catch (e) {}
        }

        step1();
      })();
      </script>
    </section>'''
