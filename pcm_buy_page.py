# -*- coding: utf-8 -*-
"""/pc-manager-buy/ - buy "Unlock everything" for 365 PC Manager with PayPal (12 Oct 2026, after Lemon Squeezy declined).

The app's Buy button opens this page with ?install=<the PC's anonymous id>. It asks api/pcm-plus-pp.php for the price for
that PC's country, shows PayPal's own buttons (PayPal or card), and when the buyer approves, our server takes the payment,
makes the key and emails it - the page shows it too. noindex: a checkout, reached from the app. build_extra.py calls
buy_page_content().
"""

FAQS = [
    ("Who am I paying?",
     "365 Techies Ltd, the family IT business in Bournemouth, England that makes 365 PC Manager (UK company 11073501). PayPal "
     "takes the payment, so we never see your card or bank details."),
    ("Does it renew?",
     "No. It lasts 12 months and then simply stops. You are never charged again unless you choose to buy another."),
    ("Can I get my money back?",
     "Yes: within 30 days, no questions asked, even if you have used it. Reply to the email your key came in, or write to "
     "info@365techies.co.uk. <a href=\"/pc-manager-licence/#refunds\">Our refund promise</a>."),
    ("Is it a subscription to support?",
     "No. It is software only: it switches on three extra features in 365 PC Manager. It does not include phone calls, visits "
     "or remote help."),
]

_CSS = r'''
      .pbuy [hidden]{display:none!important}
      .pbuy{padding:1.4rem var(--pad-x) 3rem}
      .pbuy__in{max-width:760px;margin:0 auto;display:flex;flex-direction:column;gap:1.1rem}
      .pbuy__card{border:1px solid var(--line);border-radius:var(--r-xl);background:var(--glass);padding:clamp(1.2rem,3vw,1.8rem)}
      .pbuy__price{display:flex;flex-wrap:wrap;align-items:baseline;gap:.3rem .9rem;margin:0 0 .4rem}
      .pbuy__price b{font-size:clamp(2rem,5vw,2.6rem);line-height:1;color:var(--cyan-soft);font-variant-numeric:tabular-nums}
      .pbuy__price span{color:var(--muted)}
      .pbuy__facts{display:flex;flex-wrap:wrap;gap:.4rem .6rem;margin:.6rem 0 0;padding:0;list-style:none}
      .pbuy__facts li{font-size:.86rem;padding:.3rem .65rem;border:1px solid var(--line);border-radius:var(--r-pill)}
      .pbuy h2{font-size:1.2rem;margin:0 0 .6rem}
      .pbuy__adds{margin:0;padding-left:1.15rem;display:flex;flex-direction:column;gap:.5rem;line-height:1.55}
      .pbuy__btns{max-width:420px;margin:.4rem 0 0}
      .pbuy__small{color:var(--muted);font-size:.88rem;line-height:1.55;margin:.9rem 0 0}
      .pbuy__small a,.pbuy__note a,.pbuy__done a{color:var(--cyan-soft)}
      .pbuy__note{padding:.85rem 1rem;border-radius:var(--r-md);background:rgba(29,151,227,.1);border:1px solid rgba(29,151,227,.3);line-height:1.55}
      .pbuy__test{padding:.6rem .9rem;border-radius:var(--r-md);background:rgba(224,179,65,.14);border:1px solid rgba(224,179,65,.45);font-weight:600}
      .pbuy__status{min-height:1.4em;margin:.7rem 0 0;line-height:1.5}
      .pbuy__status--bad{color:#ffb3a4}
      .pbuy__done{scroll-margin-top:calc(var(--header-h) + var(--ticker-h) + 1rem)}
      .pbuy__done h2{font-size:clamp(1.4rem,3vw,1.8rem)}
      .pbuy__key{display:flex;flex-wrap:wrap;align-items:center;gap:.6rem;margin:.6rem 0}
      .pbuy__key code{font:600 clamp(1.1rem,3.4vw,1.45rem)/1.2 var(--mono,monospace);letter-spacing:.06em;padding:.55rem .8rem;border-radius:var(--r-md);background:rgba(255,255,255,.06);border:1px solid var(--line)}
'''

_JS = r'''
(function () {
  var API = '/api/pcm-plus-pp.php';
  function el(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function post(b) {
    return fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b), credentials: 'same-origin' })
      .then(function (r) { return r.json().catch(function () { return { ok: false, error: 'http_' + r.status }; }); });
  }
  var m = /[?&]install=([a-f0-9]{8,32})/i.exec(location.search), install = m ? m[1].toLowerCase() : '';
  var t = /[?&]cc=([a-z]{2})(?:&|$)/i.exec(location.search), testCc = t ? t[1].toUpperCase() : '';   // the server honours it with PayPal TEST keys only
  var card = el('pbuycard'), done = el('pbuydone');
  function status(t, bad) { var s = el('pbuystatus'); s.textContent = t; s.className = 'pbuy__status' + (bad ? ' pbuy__status--bad' : ''); }
  var WHY = {
    uk: 'In the UK, 365 PC Manager comes with our support plans instead. <a href="/home-it-support-plans/">See the plans</a>.',
    not_here: 'Unlock everything isn’t on sale in your country yet. 365 PC Manager stays free to use, and the app will offer it when it is.',
    no_sale: 'Unlock everything isn’t on sale in your country. 365 PC Manager stays free to use.',
    off: 'Unlock everything isn’t on sale just now. 365 PC Manager stays free to use in the meantime.',
    not_set_up: 'Unlock everything isn’t on sale just now. 365 PC Manager stays free to use in the meantime.'
  };
  function showDone(r) {
    card.hidden = true; done.hidden = false;
    var h;
    if (r.state === 'made') {
      h = '<h2>Thank you. Here is your key.</h2>'
        + '<div class="pbuy__key"><code id="pbuykey">' + esc(r.key) + '</code><button type="button" class="button secondary" id="pbuycopy">Copy</button></div>'
        + '<p>In 365 PC Manager, open <b>Unlock everything</b> and type it where it says “Got your key?”. It works for 12 months on up to 3 PCs and does not renew.</p>'
        + '<p>We’ve also emailed it to <b>' + esc(r.email) + '</b>' + (r.note === 'email failed' ? ' — if it doesn’t arrive, write to <a href="mailto:info@365techies.co.uk">info@365techies.co.uk</a> and we’ll send it again' : '') + '. Keep that email: it’s your receipt and your way to ask for a refund within 30 days.</p>';
    } else if (r.state === 'had') {
      h = '<h2>Thank you. Your key is on its way.</h2><p>We’ve emailed it to <b>' + esc(r.email) + '</b>. If it doesn’t arrive in a few minutes, check your junk folder, or write to <a href="mailto:info@365techies.co.uk">info@365techies.co.uk</a>.</p>';
    } else if (r.state === 'pending') {
      h = '<h2>Thank you. PayPal is still checking the payment.</h2><p>Your key will be emailed to you as soon as it clears. If it hasn’t arrived within a few days, write to <a href="mailto:info@365techies.co.uk">info@365techies.co.uk</a>.</p>';
    } else {
      card.hidden = false; done.hidden = true;
      status('PayPal didn’t take the payment, so nothing was charged. Please try again, or write to info@365techies.co.uk.', true);
      return;
    }
    done.innerHTML = h;
    var cb = el('pbuycopy');
    if (cb) cb.onclick = function () { try { navigator.clipboard.writeText(el('pbuykey').textContent); cb.textContent = 'Copied'; } catch (e) {} };
    try { done.scrollIntoView({ block: 'start' }); } catch (e) {}
  }
  function buttons(cfg) {
    var s = document.createElement('script');
    s.src = 'https://www.paypal.com/sdk/js?client-id=' + encodeURIComponent(cfg.client_id) + '&currency=USD&intent=capture&components=buttons';
    s.onerror = function () { status('PayPal’s buttons didn’t load. Check your connection or ad blocker, then refresh the page.', true); };
    s.onload = function () {
      if (!window.paypal || !window.paypal.Buttons) { status('PayPal’s buttons didn’t load. Refresh the page to try again.', true); return; }
      window.paypal.Buttons({
        style: { layout: 'vertical', label: 'pay', shape: 'rect' },
        createOrder: function () {
          status('');
          return post({ 'do': 'create', install: install, test_cc: testCc }).then(function (r) {
            if (r && r.ok && r.id) return r.id;
            throw new Error(r && r.error === 'rate' ? 'Too many tries from here today - please write to info@365techies.co.uk.' : 'We couldn’t start the payment. Please try again.');
          });
        },
        onApprove: function (data) {
          status('Taking the payment…');
          return post({ 'do': 'capture', order: data.orderID }).then(function (r) { status(''); showDone(r || {}); })
            .catch(function () { status('We couldn’t reach our server. If PayPal shows the payment, your key will be emailed; otherwise please try again.', true); });
        },
        onCancel: function () { status('Payment cancelled. Nothing was taken.'); },
        onError: function (e) { status((e && e.message && /^[A-Z]/.test(e.message) ? e.message : 'Something went wrong with PayPal. Nothing was taken. Please try again.'), true); }
      }).render('#pbuybtns');
    };
    document.head.appendChild(s);
  }
  post({ 'do': 'config', install: install, test_cc: testCc }).then(function (c) {
    if (!c || !c.ok) { status('We couldn’t reach our server. Refresh the page in a minute.', true); return; }
    if (!c.available) { el('pbuyoffer').hidden = true; el('pbuywhy').innerHTML = WHY[c.reason] || WHY.off; el('pbuywhy').hidden = false; return; }
    el('pbuyamt').textContent = 'US$' + c.usd;
    el('pbuylocal').textContent = c.local ? '(about ' + c.local + ')' : '';
    if (c.env === 'sandbox') el('pbuytest').hidden = false;
    buttons(c);
  }).catch(function () { status('We couldn’t reach our server. Refresh the page in a minute.', true); });
})();
'''


def buy_page_content(task_head, bc, faq_html):
    head = task_head(bc("Unlock everything"), 'Unlock everything for <em class="grad grad--cyan">365 PC Manager</em>',
                     "One key for 12 months on up to 3 PCs. Paid once, and it does not renew. 365 PC Manager stays free "
                     "whether you buy it or not.",
                     trust=["Paid once, no renewal", "30-day refund", "Software only"])
    app = f'''    <section class="pbuy" aria-label="Buy Unlock everything">
      <div class="pbuy__in">
        <p class="pbuy__test" id="pbuytest" hidden>TEST MODE: PayPal&rsquo;s sandbox. No real money is taken.</p>
        <div class="pbuy__card" id="pbuycard">
          <div id="pbuyoffer">
            <p class="pbuy__price"><b id="pbuyamt">US$19.99</b><span id="pbuylocal"></span><span>paid once</span></p>
            <ul class="pbuy__facts"><li>12 months</li><li>Up to 3 PCs</li><li>Does not renew</li><li>30-day refund</li></ul>
            <h2 style="margin-top:1.3rem">What it adds</h2>
            <ul class="pbuy__adds">
              <li><b>The full automatic service</b>, whenever you choose to run it: Windows, driver and app updates, a deep clean, security and repair checks and a performance check.</li>
              <li><b>Switching off programs that start with Windows</b>, from the app&rsquo;s Start-up page.</li>
              <li><b>Tidying old backups</b>: removing Windows File History copies older than 30 days. It asks first and always keeps your latest backup.</li>
            </ul>
            <h2 style="margin-top:1.3rem">Pay with PayPal or a card</h2>
            <div class="pbuy__btns" id="pbuybtns"></div>
            <p class="pbuy__status" id="pbuystatus" role="status" aria-live="polite"></p>
            <p class="pbuy__small">You&rsquo;re buying from <b>365 Techies Ltd</b>, the family IT business in Bournemouth, England that makes 365 PC Manager. PayPal takes the payment, so we never see your card. Your key is shown here and emailed to you. <a href="/pc-manager-licence/">Licence and 30-day refunds</a> &middot; <a href="/privacy-policy/#unlock-everything">Privacy</a>.</p>
          </div>
          <p class="pbuy__note" id="pbuywhy" hidden></p>
        </div>
        <div class="pbuy__card pbuy__done" id="pbuydone" hidden aria-live="polite"></div>
      </div>
      <style>{_CSS}      </style>
      <script>{_JS}</script>
    </section>'''
    return "\n".join([head, app, faq_html(FAQS)])
