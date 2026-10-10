# -*- coding: utf-8 -*-
"""/order-microsoft-365/ - order Microsoft 365 licences on our own site (9 Oct 2026, owner: "yes build it with option B").

The page collects the plan, how many people, the business, who signs, Microsoft's Customer Agreement and the 12-month
term, then hands the customer to GoCardless's own page for the Direct Debit. The order waits in the staff portal for a
person to press "Order in Pax8" (api/m365-order.php + api/m365-order-lib.php). Products and prices come from
software_offers.py - the one place they live. build_extra.py calls order_page() and the plans file writer.
"""
import json
import software_offers as so

FAQS = [
    ("Do you see my bank details?",
     "No. The Direct Debit is set up on GoCardless&rsquo;s own secure page, and your bank details stay with them. "
     "Payments are covered by the Direct Debit Guarantee, and GoCardless emails you the date and amount before each one."),
    ("When do you take the first payment?",
     "Only once your licences are in place. We check your order, place it with Microsoft within one working day and then "
     "start the monthly Direct Debit. GoCardless tells you the date before anything is taken."),
    ("Can I cancel?",
     "Microsoft lets licences be cancelled or reduced within 7 days of the order. After that they run until the end of the "
     "12 months, then renew for another year unless you tell us before the renewal date. You can add people at any time."),
    ("We already have Microsoft 365. Can we move it to you?",
     "Yes, without starting again. Choose &ldquo;Already on Microsoft 365&rdquo; and we&rsquo;ll ring you. Your Microsoft 365 "
     "admin approves one link from Microsoft that lets us look after it, and your email, files and Teams stay exactly where they are."),
    ("Is this for home users?",
     "These are Microsoft&rsquo;s business plans, for businesses, sole traders, charities and clubs in the UK. For Microsoft 365 "
     "at home, add it to a home support plan for &pound;4.85 a person a month &mdash; <a href=\"/home-it-support-plans/\">see the home plans</a>."),
]


def _plans_json():
    out = {}
    for k in so.ORDERABLE:
        p = so.PRODUCTS[k]
        out[k] = {"name": so._plain(p["name"]), "price": p["price"]}
    return json.dumps(out, ensure_ascii=False)


def _plan_cards():
    cells = []
    for i, k in enumerate(so.ORDERABLE):
        p = so.PRODUCTS[k]
        cells.append(
            f'''            <label class="moplan">
              <input type="radio" name="plan" value="{k}"{' checked' if i == 0 else ''} />
              <span class="moplan__box">
                <span class="moplan__name">{p["name"]}</span>
                <span class="moplan__price"><b>&pound;{p["price"]}</b> {p["per"]}</span>
                <span class="moplan__what">{p["what"]}</span>
              </span>
            </label>''')
    return "\n".join(cells)


_CSS = r'''
      .moapp [hidden]{display:none!important}
      .moapp{padding:1.6rem var(--pad-x) 3rem}
      .moapp__in{max-width:900px;margin:0 auto}
      .moform fieldset{border:1px solid var(--line);border-radius:var(--r-xl);background:var(--glass);padding:clamp(1.1rem,3vw,1.8rem);margin:0 0 1.2rem;min-width:0}
      .moform legend{font-family:var(--font-display);font-weight:600;font-size:1.25rem;padding:0 .4rem}
      .moform .mohint{margin:.1rem 0 1rem;color:var(--muted);font-size:.93rem;line-height:1.55}
      .moform .mohint a,.modone a,.monote a{color:var(--cyan-soft)}
      .moplans{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:.75rem}
      .moplan{display:block;cursor:pointer;position:relative}
      .moplan input{position:absolute;opacity:0;width:1px;height:1px}
      .moplan__box{display:flex;flex-direction:column;gap:.35rem;height:100%;padding:.95rem 1rem;border:1px solid var(--line);border-radius:var(--r-lg);background:rgba(255,255,255,.025);transition:border-color .15s,background .15s}
      .moplan input:checked + .moplan__box{border-color:var(--cyan);background:rgba(29,151,227,.12);box-shadow:0 0 0 1px var(--cyan)}
      .moplan input:focus-visible + .moplan__box{outline:2px solid var(--cyan-soft);outline-offset:2px}
      .moplan__name{font-weight:600;line-height:1.3}
      .moplan__price{font-size:.88rem;color:var(--muted)}
      .moplan__price b{font-size:1.15rem;color:var(--cyan-soft);font-variant-numeric:tabular-nums}
      .moplan__what{font-size:.86rem;color:var(--muted);line-height:1.5}
      .moqty{display:flex;align-items:center;gap:.6rem;margin:1.1rem 0 0;flex-wrap:wrap}
      .moqty label{font-weight:600}
      .moqty__ctl{display:flex;align-items:center;border:1px solid var(--line);border-radius:var(--r-pill);overflow:hidden}
      .moqty__ctl button{width:2.6rem;height:2.6rem;border:0;background:rgba(255,255,255,.05);color:inherit;font-size:1.3rem;cursor:pointer}
      .moqty__ctl input{width:4.2rem;height:2.6rem;border:0;background:transparent;color:inherit;text-align:center;font-size:1.05rem;font-variant-numeric:tabular-nums;-moz-appearance:textfield}
      .moqty__ctl input::-webkit-outer-spin-button,.moqty__ctl input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
      .mogrid{display:grid;grid-template-columns:1fr 1fr;gap:0 1rem}
      .mogrid .field--wide{grid-column:1/-1}
      @media (max-width:640px){.mogrid{grid-template-columns:1fr}}
      .moradios{display:flex;flex-direction:column;gap:.45rem;margin:0 0 .9rem}
      .moradio,.mocheck{display:flex;gap:.7rem;align-items:flex-start;line-height:1.5;cursor:pointer}
      .moradio input,.mocheck input{margin-top:.28rem;width:1.15rem;height:1.15rem;flex:none;accent-color:var(--cyan)}
      .mochecks{display:flex;flex-direction:column;gap:.85rem}
      .mocheck a{color:var(--cyan-soft)}
      .monote{margin:.2rem 0 .9rem;padding:.75rem .9rem;border-radius:var(--r-md);background:rgba(29,151,227,.1);border:1px solid rgba(29,151,227,.3);font-size:.92rem;line-height:1.55}
      .moerr{display:block;margin:.4rem 0 0;font-size:.85rem;color:#ffb3a4}
      .mosum{display:flex;flex-wrap:wrap;justify-content:space-between;gap:.4rem 1rem;align-items:baseline;padding:1rem 1.2rem;border-radius:var(--r-lg);border:1px solid rgba(0,206,27,.35);background:rgba(0,206,27,.07);margin:0 0 1rem}
      .mosum b{font-size:1.05rem}
      .mosum__price{font-size:1.4rem;font-weight:700;color:var(--green-soft);font-variant-numeric:tabular-nums}
      .mosum__small{flex-basis:100%;font-size:.86rem;color:var(--muted)}
      .mogo{width:100%}
      .mogo[disabled]{opacity:.6;cursor:wait}
      .mostatus{margin:.8rem 0 0;font-size:.95rem;line-height:1.5}
      .mostatus--bad{color:#ffb3a4}
      .mosafe{display:flex;flex-wrap:wrap;gap:.6rem 1rem;align-items:center;justify-content:center;margin:.9rem 0 0;font-size:.86rem;color:var(--muted);text-align:center}
      .modone{border:1px solid var(--line);border-radius:var(--r-xl);background:var(--glass);padding:clamp(1.3rem,3vw,2rem)}
      .modone h2{margin:0 0 .6rem;font-size:clamp(1.4rem,3vw,1.8rem)}
      .modone p{line-height:1.6}
      .modone__sum{padding:.8rem 1rem;border-radius:var(--r-md);background:rgba(255,255,255,.04);border:1px solid var(--line);margin:.8rem 0}
      .monext{padding:0 var(--pad-x) 2.5rem}
      .monext__in{max-width:900px;margin:0 auto}
      .monext ol{margin:0;padding-left:1.2rem;display:flex;flex-direction:column;gap:.7rem;line-height:1.55}
      .monext b{display:block}
      .monext span{color:var(--muted)}
'''

_JS = r'''
(function () {
  var PLANS = __PLANS__;
  var API = '/api/m365-order.php';
  var form = document.getElementById('moform'), done = document.getElementById('modone');
  if (!form || !done) return;
  var qs = {};
  location.search.replace(/^\?/, '').split('&').forEach(function (kv) { if (!kv) return; var i = kv.indexOf('='); qs[decodeURIComponent(i < 0 ? kv : kv.slice(0, i))] = i < 0 ? '' : decodeURIComponent(kv.slice(i + 1).replace(/\+/g, ' ')); });
  function el(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function pence(s) { return Math.round(parseFloat(s) * 100); }
  function money(p) { return '£' + (p / 100).toFixed(2); }
  function post(body) {
    return fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'same-origin' })
      .then(function (r) { return r.json().catch(function () { return { ok: false, error: 'http_' + r.status }; }); });
  }
  function plan() { var r = form.querySelector('input[name="plan"]:checked'); return r ? r.value : ''; }
  function qty() { var n = parseInt(el('moqty').value, 10); return isNaN(n) ? 0 : n; }
  function sum() {
    var p = PLANS[plan()], n = qty(), box = el('mosum');
    if (!p || n < 1 || n > 300) { box.innerHTML = '<b>Choose a plan and how many people (1 to 300).</b>'; return; }
    box.innerHTML = '<b>' + n + ' × ' + esc(p.name) + '</b><span class="mosum__price">' + money(pence(p.price) * n) + ' a month</span>'
      + '<span class="mosum__small">' + money(pence(p.price)) + ' per person a month, on a 12-month term. No VAT to add. Nothing is taken until your licences are set up.</span>';
  }
  // ---- the plan from the button they pressed (?plan=m365-standard), and how many people
  if (qs.plan && PLANS[qs.plan]) { var pr = form.querySelector('input[name="plan"][value="' + qs.plan + '"]'); if (pr) pr.checked = true; }
  if (qs.qty && /^\d{1,3}$/.test(qs.qty)) el('moqty').value = Math.max(1, Math.min(300, parseInt(qs.qty, 10)));
  Array.prototype.forEach.call(form.querySelectorAll('input[name="plan"]'), function (r) { r.addEventListener('change', sum); });
  el('moqty').addEventListener('input', sum);
  el('moless').addEventListener('click', function () { el('moqty').value = Math.max(1, qty() - 1); sum(); });
  el('momore').addEventListener('click', function () { el('moqty').value = Math.min(300, Math.max(1, qty() + 1)); sum(); });
  // ---- "your email today": who with, and the note for people already on Microsoft 365
  function nowWith() {
    var r = form.querySelector('input[name="email_now"]:checked'), v = r ? r.value : '';
    el('monowwrap').hidden = !(v === 'host' || v === 'google' || v === 'microsoft' || v === 'other');
    el('momsnote').hidden = v !== 'microsoft';
  }
  Array.prototype.forEach.call(form.querySelectorAll('input[name="email_now"]'), function (r) { r.addEventListener('change', nowWith); });

  var WORDS = { required: 'Please fill this in.', 'long': 'That is too long.', email: 'That email address doesn’t look right.',
    phone: 'Please give a phone number we can ring.', domain: 'That doesn’t look like a website address. Leave it empty if you don’t have one.',
    crn: 'A company number is 8 characters, like 01234567 or SC123456. Leave it empty if you don’t have one.',
    qty: 'Between 1 and 300 people.', plan: 'Choose a plan.', agree: 'Please tick this to carry on.' };
  function clearErrs() {
    Array.prototype.forEach.call(form.querySelectorAll('.field--error'), function (n) { n.classList.remove('field--error'); });
    Array.prototype.forEach.call(form.querySelectorAll('.moerr'), function (n) { n.remove(); });
  }
  function err(name, code) {
    var inp = form.querySelector('[name="' + name + '"]'); if (!inp) return null;
    var wrap = inp.closest('.field') || inp.closest('.mocheck') || inp.closest('.moradios') || inp.closest('.moqty') || inp.closest('.moplans');
    if (!wrap) return null;
    if (wrap.classList.contains('field')) wrap.classList.add('field--error');
    if (!wrap.querySelector('.moerr') && !(wrap.nextElementSibling && wrap.nextElementSibling.classList.contains('moerr'))) {
      var m = document.createElement('span'); m.className = 'moerr'; m.textContent = WORDS[code] || (code === 'required' ? WORDS.required : 'Please check this.');
      if (wrap.classList.contains('field')) wrap.appendChild(m); else wrap.parentNode.insertBefore(m, wrap.nextSibling);
    }
    return inp;
  }
  function val(n) { var i = form.querySelector('[name="' + n + '"]'); return i ? String(i.value || '').trim() : ''; }
  function ticked(n) { var i = form.querySelector('[name="' + n + '"]'); return !!(i && i.checked); }
  function collect() {
    var r = form.querySelector('input[name="email_now"]:checked');
    return { 'do': 'create', plan: plan(), qty: String(qty()), biz: val('biz'), crn: val('crn'), street: val('street'), street2: val('street2'),
      city: val('city'), postcode: val('postcode'), domain: val('domain'), email_now: r ? r.value : '', now_with: val('now_with'),
      first: val('first'), last: val('last'), email: val('email'), phone: val('phone'), notes: val('notes'),
      signatory: ticked('signatory'), mca: ticked('mca'), term: ticked('term'), terms: ticked('terms'), website: val('website') };
  }
  function check(b) {
    var e = {};
    if (!PLANS[b.plan]) e.plan = 'plan';
    if (!(+b.qty >= 1 && +b.qty <= 300)) e.qty = 'qty';
    ['biz', 'street', 'city', 'postcode', 'first', 'last', 'phone'].forEach(function (k) { if (!b[k]) e[k] = 'required'; });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email)) e.email = b.email ? 'email' : 'required';
    if (!b.email_now) e.email_now = 'required';
    ['signatory', 'mca', 'term', 'terms'].forEach(function (k) { if (!b[k]) e[k] = 'agree'; });
    return e;
  }
  function showErrs(e) {
    var first = null;
    Object.keys(e).forEach(function (k) { var i = err(k, e[k]); if (i && !first) first = i; });
    if (first) { try { first.focus({ preventScroll: true }); } catch (x) {} first.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  }
  function status(t, bad) { var s = el('mostatus'); s.textContent = t; s.className = 'mostatus' + (bad ? ' mostatus--bad' : ''); }
  var busy = false;
  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    if (busy) return;
    clearErrs(); status('');
    var b = collect(), e = check(b);
    if (Object.keys(e).length) { showErrs(e); status('Please check the boxes marked above.', true); return; }
    busy = true; var go = el('mogo'); go.disabled = true; go.textContent = 'Saving your order…';
    post(b).then(function (r) {
      if (r && r.ok && r.url) { go.textContent = 'Opening the Direct Debit page…'; status('Taking you to GoCardless’s secure page…'); location.href = r.url; return; }
      busy = false; go.disabled = false; go.textContent = 'Continue to the Direct Debit';
      if (r && r.ok) { showDone({ state: 'waiting', dd: 'none', plan: PLANS[b.plan].name, qty: +b.qty, monthly: money(pence(PLANS[b.plan].price) * b.qty), biz: b.biz, first: b.first, email: b.email }, 'nolink'); return; }
      if (r && r.error === 'invalid' && r.fields) { showErrs(r.fields); status('Please check the boxes marked above.', true); return; }
      status(r && r.error === 'rate' ? 'There have been a lot of orders from here today. Please ring us on 01202 775566 and we’ll take it over the phone.'
        : 'Something went wrong and nothing was ordered. Please try again, or ring us on 01202 775566.', true);
    }).catch(function () {
      busy = false; go.disabled = false; go.textContent = 'Continue to the Direct Debit';
      status('We couldn’t reach our server, so nothing was ordered. Check your connection and try again, or ring 01202 775566.', true);
    });
  });

  // ---- back from GoCardless (?order=..&k=..&dd=done|left), or from the link in their email
  function showDone(o, why) {
    form.hidden = true; done.hidden = false;
    var s = '<div class="modone__sum"><b>' + esc(o.qty) + ' × ' + esc(o.plan) + '</b> for ' + esc(o.biz) + ' · ' + esc(o.monthly) + ' a month</div>';
    var h;
    if (o.state === 'cancelled') {
      h = '<h2>This order was cancelled</h2>' + s + '<p>If that’s not right, ring us on <a href="tel:+441202775566">01202 775566</a>.</p>';
    } else if (o.dd === 'ready' || o.state === 'ready' || o.state === 'ordered' || o.state === 'done') {
      h = '<h2>Thank you' + (o.first ? ', ' + esc(o.first) : '') + '. Your order is in.</h2>' + s
        + '<p><b>✓ Your Direct Debit is set up.</b> We’ll check your order and place it with Microsoft within one working day, then ring you to set up your email and your people. '
        + 'Nothing is taken until your licences are in place, and GoCardless emails you before each payment.</p>'
        + '<p>We’ve emailed a copy of your order to ' + esc(o.email) + '. Questions? Ring <a href="tel:+441202775566">01202 775566</a>.</p>';
    } else if (why === 'nolink') {
      h = '<h2>Thank you' + (o.first ? ', ' + esc(o.first) : '') + '. Your order is in.</h2>' + s
        + '<p>We couldn’t open the Direct Debit page just now, so we’ll email you a secure link to set it up within one working day. Nothing is ordered until it’s done.</p>'
        + '<p>Questions? Ring <a href="tel:+441202775566">01202 775566</a>.</p>';
    } else if (why === 'checking') {
      h = '<h2>Checking your Direct Debit…</h2>' + s + '<p>This takes a few seconds.</p>';
    } else {
      h = '<h2>Your order is saved, but the Direct Debit isn’t set up yet</h2>' + s
        + '<p>We can’t place the order with Microsoft until it is. It takes about two minutes on GoCardless’s secure page, and you’ll need your bank sort code and account number.</p>'
        + '<p><button type="button" class="button primary" id="moresume">Set up the Direct Debit</button></p>'
        + '<p class="mostatus" id="moresst" role="status"></p><p>Rather do it over the phone? Ring <a href="tel:+441202775566">01202 775566</a>.</p>';
    }
    done.innerHTML = h;
    var rb = el('moresume');
    if (rb) rb.onclick = function () {
      rb.disabled = true; rb.textContent = 'Opening…';
      post({ 'do': 'resume', id: qs.order, k: qs.k }).then(function (r) {
        if (r && r.ok && r.url) { location.href = r.url; return; }
        if (r && r.ok && r.order) { showDone(r.order); return; }
        rb.disabled = false; rb.textContent = 'Set up the Direct Debit';
        el('moresst').textContent = 'That didn’t work just now. Please try again in a minute, or ring 01202 775566.'; el('moresst').className = 'mostatus mostatus--bad';
      }).catch(function () { rb.disabled = false; rb.textContent = 'Set up the Direct Debit'; });
    };
    try { done.scrollIntoView({ block: 'start' }); } catch (x) {}
  }
  if (qs.order && qs.k) {
    form.hidden = true; done.hidden = false;
    done.innerHTML = '<h2>Checking your order…</h2>';
    var tries = 0;
    var ask = function () {
      post({ 'do': 'status', id: qs.order, k: qs.k }).then(function (r) {
        if (!r || !r.ok) { done.innerHTML = '<h2>We couldn’t find that order</h2><p>The link may be out of date. Ring us on <a href="tel:+441202775566">01202 775566</a> and we’ll sort it out.</p>'; return; }
        var o = r.order;
        // straight back from GoCardless: the bank's answer can take a few seconds to reach us
        if (qs.dd === 'done' && o.dd === 'waiting' && tries < 4) { tries++; showDone(o, 'checking'); setTimeout(ask, 3000); return; }
        showDone(o);
      }).catch(function () { done.innerHTML = '<h2>We couldn’t reach our server</h2><p>Refresh the page in a minute, or ring 01202 775566.</p>'; });
    };
    ask();
    return;
  }
  sum(); nowWith();
})();
'''


def order_page_content(task_head, bc_sub, faq_html, gc_badge):
    plans_js = _JS.replace("__PLANS__", _plans_json())
    head = task_head(bc_sub("Microsoft 365 plans", "/which-microsoft-365-plan/", "Order"),
                     'Order Microsoft 365 <em class="grad grad--cyan">for your business</em>',
                     "Choose your plan and how many people, tell us about your business, then set up a Direct Debit on "
                     "GoCardless&rsquo;s secure page. A person checks every order before we place it with Microsoft, then "
                     "we ring you to set up your email.",
                     trust=["UK businesses, sole traders and charities", "No VAT to add", "Checked by a person before we order"])
    app = f'''    <section class="moapp" aria-label="Order form">
      <div class="moapp__in">
        <form class="moform" id="moform" novalidate>
          <input type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0" />
          <fieldset>
            <legend>1. Your plan</legend>
            <p class="mohint">Per person a month. Not sure which? <a href="/which-microsoft-365-plan/">Compare the plans</a> or ring <a href="tel:+441202775566">01202 775566</a>.</p>
            <div class="moplans" role="radiogroup" aria-label="Plan">
{_plan_cards()}
            </div>
            <div class="moqty">
              <label for="moqty">How many people?</label>
              <div class="moqty__ctl">
                <button type="button" id="moless" aria-label="One fewer">&minus;</button>
                <input type="number" id="moqty" name="qty" value="1" min="1" max="300" inputmode="numeric" aria-describedby="moqtyh" />
                <button type="button" id="momore" aria-label="One more">+</button>
              </div>
              <span class="mohint" id="moqtyh" style="margin:0">One licence for each person who needs email or the apps.</span>
            </div>
          </fieldset>
          <fieldset>
            <legend>2. Your business</legend>
            <p class="mohint">Microsoft needs the business&rsquo;s name and address to set up the account.</p>
            <div class="mogrid">
              <label class="field field--wide"><span>Business name</span><input type="text" name="biz" autocomplete="organization" maxlength="120" required /></label>
              <label class="field field--wide"><span>Address</span><input type="text" name="street" autocomplete="address-line1" maxlength="120" required /></label>
              <label class="field field--wide"><span>Address line 2 (optional)</span><input type="text" name="street2" autocomplete="address-line2" maxlength="120" /></label>
              <label class="field"><span>Town</span><input type="text" name="city" autocomplete="address-level2" maxlength="60" required /></label>
              <label class="field"><span>Postcode</span><input type="text" name="postcode" autocomplete="postal-code" maxlength="12" required /></label>
              <label class="field"><span>Company number (if you&rsquo;re a limited company)</span><input type="text" name="crn" maxlength="12" /></label>
              <label class="field"><span>Your website or email domain (if you have one)</span><input type="text" name="domain" placeholder="e.g. yourbusiness.co.uk" maxlength="100" autocapitalize="off" spellcheck="false" /></label>
            </div>
          </fieldset>
          <fieldset>
            <legend>3. Your email today</legend>
            <div class="moradios" role="radiogroup" aria-label="Your email today">
              <label class="moradio"><input type="radio" name="email_now" value="none" /> <span>We don&rsquo;t have business email yet</span></label>
              <label class="moradio"><input type="radio" name="email_now" value="host" /> <span>From our web host or internet provider</span></label>
              <label class="moradio"><input type="radio" name="email_now" value="google" /> <span>Google Workspace (Gmail for business)</span></label>
              <label class="moradio"><input type="radio" name="email_now" value="microsoft" /> <span>We already have Microsoft 365</span></label>
              <label class="moradio"><input type="radio" name="email_now" value="other" /> <span>Something else, or not sure</span></label>
            </div>
            <label class="field" id="monowwrap" hidden><span>Who is it with? (optional)</span><input type="text" name="now_with" maxlength="80" placeholder="e.g. BT, GoDaddy, another IT company" /></label>
            <p class="monote" id="momsnote" hidden>We&rsquo;ll move it to us without starting again: your Microsoft 365 admin approves one link from Microsoft, and your email, files and Teams stay where they are. We&rsquo;ll ring you to do it together.</p>
            <p class="mohint" style="margin:0">Moving email from somewhere else? We do that for you, as part of setting you up.</p>
          </fieldset>
          <fieldset>
            <legend>4. You</legend>
            <div class="mogrid">
              <label class="field"><span>First name</span><input type="text" name="first" autocomplete="given-name" maxlength="60" required /></label>
              <label class="field"><span>Last name</span><input type="text" name="last" autocomplete="family-name" maxlength="60" required /></label>
              <label class="field"><span>Email</span><input type="email" name="email" autocomplete="email" maxlength="160" required /></label>
              <label class="field"><span>Phone</span><input type="tel" name="phone" autocomplete="tel" maxlength="30" required /></label>
              <label class="field field--wide"><span>Anything we should know? (optional)</span><textarea name="notes" maxlength="1000" rows="3" placeholder="e.g. the email addresses you want, or a good time to ring"></textarea></label>
            </div>
          </fieldset>
          <fieldset>
            <legend>5. Agree and continue</legend>
            <div class="mochecks">
              <label class="mocheck"><input type="checkbox" name="signatory" /> <span>I can agree this for the business: I own it, run it or have its permission.</span></label>
              <label class="mocheck"><input type="checkbox" name="mca" /> <span>I accept the <a href="https://www.microsoft.com/licensing/docs/customeragreement" target="_blank" rel="noopener">Microsoft Customer Agreement</a>. Microsoft asks every business customer to.</span></label>
              <label class="mocheck"><input type="checkbox" name="term" /> <span>I understand the licences are on a 12-month term: they can be cancelled or reduced within 7 days of the order, then they run for the 12 months and renew each year unless I tell you to stop.</span></label>
              <label class="mocheck"><input type="checkbox" name="terms" /> <span>I agree to the <a href="/terms/" target="_blank" rel="noopener">365 Techies terms</a> and have read the <a href="/privacy-policy/" target="_blank" rel="noopener">privacy policy</a>.</span></label>
            </div>
          </fieldset>
          <div class="mosum" id="mosum" aria-live="polite"></div>
          <button type="submit" class="button primary button--lg mogo" id="mogo">Continue to the Direct Debit</button>
          <p class="mostatus" id="mostatus" role="status" aria-live="polite"></p>
          <div class="mosafe"><span>Next: GoCardless&rsquo;s secure page for your bank details. We never see them.</span>{gc_badge()}</div>
        </form>
        <div class="modone" id="modone" hidden aria-live="polite"></div>
      </div>
      <style>{_CSS}      </style>
      <script>{plans_js}</script>
    </section>'''
    nxt = '''    <section class="monext" aria-label="What happens next">
      <div class="monext__in">
        <h2 class="section-title" style="font-size:1.5rem;margin:0 0 1rem">What happens next</h2>
        <ol>
          <li><b>We check your order</b><span>A person reads every order and places it with Microsoft within one working day.</span></li>
          <li><b>We ring you to set it up</b><span>Your email on your own domain, your people and their logins, and moving your old email across if you have some.</span></li>
          <li><b>Then the monthly Direct Debit starts</b><span>Nothing is taken until your licences are in place. GoCardless emails you before each payment.</span></li>
        </ol>
      </div>
    </section>'''
    return "\n".join([head, app, nxt, faq_html(FAQS)])
