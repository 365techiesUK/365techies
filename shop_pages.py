# -*- coding: utf-8 -*-
"""The refurbished Dells IN STOCK, bought online with PayPal (14 Oct 2026) - the pages and the server's catalogue.

From shop_stock.py (one row per machine) this builds:
  /refurbished-dell-for-sale/        the list of machines in stock. noindex while nothing is on sale (a page with nothing
                                     to buy is a thin page), indexed once a machine is live.
  /refurbished-dell-for-sale/<id>/   one page per machine: its own photos, spec, grade, battery health, fixed price, £15 UK
                                     delivery and PayPal's buttons. noindex: a machine sells and is gone; Google Shopping
                                     finds these pages through the feed (api/shop-feed.php), not through search.
  api/shop-catalogue.php             what the server may sell and at what price (api/shop-lib.php reads it; the browser
                                     never sends an amount). Written on every build - never edit it by hand.
build_extra.py calls build(); /dell-hardware/ shows instock_band() above its picker while anything is live.
14 Oct 2026: a machine with shop_checks/<id>.json (shop_report.py, from its own 365 PC Manager report) shows
"Checked by 365 PC Manager" - the scores, drives, battery, speed tests and what the service did, on that machine.
"""
import json
import os
import re

import shop_stock as S

HUB = "refurbished-dell-for-sale"
SITE = "https://365techies.co.uk"
GPC = {"laptop": "328", "desktop": "325"}   # Google's product categories: Laptops, Desktop Computers
STATUSES = ("draft", "live", "sold", "test")
_ID = re.compile(r"^[a-z0-9][a-z0-9-]{1,40}$")
_BASE = os.path.dirname(os.path.abspath(__file__))


def _e(s):
    return (str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;"))


def _machines(dell_machines):
    out = {}
    for row in dell_machines:
        mid, kind, series, name, meta, price, href = row[:7]
        out[mid] = {"kind": kind, "series": series, "name": name, "guide": int(price), "href": href}
    return out


def units(dell_machines):
    """shop_stock.UNITS, checked and filled in. A mistake stops the build: a wrong price or a missing photo must never go live."""
    mach = _machines(dell_machines)
    seen, out = set(), []
    for raw in S.UNITS:
        u = dict(raw)
        uid = u.get("id", "")
        bad = lambda why: SystemExit("*** shop_stock.py %s: %s ***" % (uid or "(no id)", why))
        if not _ID.match(uid):
            raise bad("id must be lower case letters, numbers and dashes")
        if uid in seen:
            raise bad("the same id twice")
        seen.add(uid)
        if u.get("status") not in STATUSES:
            raise bad("status must be one of %s" % ", ".join(STATUSES))
        m = mach.get(u.get("model"))
        if not m:
            raise bad("model %r is not a DELL_MACHINES id in build_extra.py" % u.get("model"))
        u["m"] = m
        u["kind"] = m["kind"]
        u["edition"] = int(u.get("edition", 1))
        u["price"] = int(u.get("price") or m["guide"])
        if u["price"] <= 0:
            raise bad("price must be more than 0")
        u.setdefault("marks", "")
        u.setdefault("extras", "")
        u.setdefault("photos", [])
        u["name"] = "Dell %s (Grade %s)" % (m["name"], u.get("grade", "?"))
        if u["status"] == "test":
            u["name"] = "TEST LISTING - Dell %s" % m["name"]
        if u["status"] in ("live", "sold"):
            for f in ("cpu", "ram", "screen", "windows", "charger"):
                if not str(u.get(f, "")).strip():
                    raise bad("%s is empty" % f)
            if u.get("grade") not in S.GRADES:
                raise bad("grade must be A, B or C")
            if u["kind"] == "laptop" and not str(u.get("battery", "")).strip():
                raise bad("a laptop needs its battery health")
            if not u["photos"]:
                raise bad("a machine on sale needs at least one photo of itself")
            for p in u["photos"]:
                if not os.path.isfile(os.path.join(_BASE, "images", "shop", uid, p)):
                    raise bad("photo images/shop/%s/%s is missing" % (uid, p))
        cf = os.path.join(_BASE, "shop_checks", uid + ".json")
        u["check"] = json.load(open(cf, encoding="utf-8")) if os.path.isfile(cf) else None
        u["slug"] = HUB + "/" + uid
        u["url"] = "%s/%s/%s/" % (SITE, HUB, uid)
        u["imgs"] = ["/images/shop/%s/%s" % (uid, p) for p in u["photos"]]
        out.append(u)
    return out


def live(us):
    return [u for u in us if u["status"] == "live"]


# ---- what Google's feed and the server say about a machine -------------------------------------------------------------
def _feed_title(u):
    m = u["m"]
    t = "Refurbished Dell %s %s, %s, %s RAM, New 1TB Samsung SSD, %s - Grade %s" % (
        m["name"], u["screen"].split(" (")[0], re.sub(r"\s*\(.*\)$", "", u["cpu"]), u["ram"], u["windows"], u.get("grade", ""))
    return t[:150]


def _feed_desc(u):
    bits = ["Professionally refurbished Dell %s %s, checked, cleaned and tested by 365 Techies in Bournemouth." % (u["m"]["name"], u["kind"])]
    bits.append("%s, %s RAM, a brand-new 1TB Samsung 990 PRO SSD, %s screen, %s set up and ready to use." % (u["cpu"], u["ram"], u["screen"], u["windows"]))
    bits.append("Grade %s: %s" % (u.get("grade", ""), S.GRADES.get(u.get("grade"), "")))
    if u["kind"] == "laptop":
        bits.append("Battery health %s." % u.get("battery", ""))
    if u.get("extras"):
        bits.append(u["extras"].rstrip(".") + ".")
    if u.get("marks"):
        bits.append("Marks on this machine: " + u["marks"].rstrip(".") + ".")
    c = u.get("check")
    if c and c.get("score") is not None:
        found = ["health score %s%%" % c["score"]]
        found += ["drive %s" % d["health"].lower() for d in c.get("drives", [])[:1] if d.get("health")]
        found += [cat["note"] for cat in c.get("cats", []) if cat["name"] == "Battery" and cat.get("note")]
        bits.append("Checked by our own 365 PC Manager%s: %s." % ((" on " + c["date"]) if c.get("date") else "", ", ".join(found)))
    bits.append("Comes with %s and 365 PC Manager installed. 12-month guarantee, 5 years on a 365 Techies support plan. "
                "This exact machine is the one in the photos." % u["charger"])
    return " ".join(bits)[:4900]


def write_catalogue(us, path=None):
    """api/shop-catalogue.php: the machines the server may sell (drafts left out) and the feed's words for each."""
    cat = {"delivery": "%.2f" % S.DELIVERY_GBP, "handling": list(S.DISPATCH_DAYS), "transit": list(S.TRANSIT_DAYS), "units": {}}
    for u in us:
        if u["status"] == "draft":
            continue
        cat["units"][u["id"]] = {
            "status": u["status"], "ed": u["edition"], "price": "%.2f" % u["price"], "name": u["name"], "kind": u["kind"],
            "title": _feed_title(u), "desc": _feed_desc(u) if u["status"] != "test" else "", "url": u["url"],
            "images": [SITE + i for i in u["imgs"]], "gpc": GPC[u["kind"]],
            "ptype": "Refurbished Dell > %ss > %s" % (u["kind"].title(), u["m"]["series"]),
        }
    js = json.dumps(cat, ensure_ascii=False, sort_keys=True)
    php = ("<?php\n// WRITTEN BY THE BUILD (shop_pages.py) from shop_stock.py - never edit by hand. The machines api/shop.php may\n"
           "// sell, their prices and what Google's feed says about them. Include-only (.htaccess denies it as a URL).\n"
           "return json_decode('" + js.replace("\\", "\\\\").replace("'", "\\'") + "', true);\n")
    path = path or os.path.join(_BASE, "api", "shop-catalogue.php")
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(php)
    return cat


# ---- the pages -------------------------------------------------------------------------------------------------------------
_CSS = r'''
      .shop [hidden]{display:none!important}
      .shop{padding:1.4rem var(--pad-x) 3rem}
      .shop__in{max-width:1080px;margin:0 auto;display:flex;flex-direction:column;gap:1.3rem}
      .shop__card{border:1px solid var(--line);border-radius:var(--r-xl);background:var(--glass);padding:clamp(1rem,3vw,1.6rem);min-width:0}
      .shop__test{padding:.6rem .9rem;border-radius:var(--r-md);background:rgba(224,179,65,.14);border:1px solid rgba(224,179,65,.45);font-weight:600;margin:0}
      .shop h2{font-size:clamp(1.15rem,2.6vw,1.4rem);margin:0 0 .7rem}
      .shop__note{padding:.85rem 1rem;border-radius:var(--r-md);background:rgba(29,151,227,.1);border:1px solid rgba(29,151,227,.3);line-height:1.55;margin:0}
      .shop a:not(.button){color:var(--cyan-soft)}
      .shop__small{color:var(--muted);font-size:.88rem;line-height:1.55;margin:.9rem 0 0}
      .shopu__grid{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:1.3rem;align-items:start}
      @media (max-width:820px){.shopu__grid{grid-template-columns:minmax(0,1fr)}}
      .shopu__main{position:relative;aspect-ratio:4/3;border-radius:var(--r-lg,14px);overflow:hidden;background:#0b1626;border:1px solid var(--line)}
      .shopu__main img{width:100%;height:100%;object-fit:contain;display:block}
      .shopu__ph{display:flex;align-items:center;justify-content:center;height:100%;color:var(--muted);font-weight:600;text-align:center;padding:1rem}
      .shopu__thumbs{display:flex;flex-wrap:wrap;gap:.45rem;margin:.6rem 0 0;padding:0;list-style:none}
      .shopu__thumbs button{padding:0;border:2px solid transparent;border-radius:8px;background:#0b1626;cursor:pointer;width:72px;aspect-ratio:4/3;overflow:hidden}
      .shopu__thumbs button[aria-current="true"]{border-color:var(--cyan-soft)}
      .shopu__thumbs img{width:100%;height:100%;object-fit:cover;display:block}
      .shopu__price{display:flex;flex-wrap:wrap;align-items:baseline;gap:.2rem .7rem;margin:0}
      .shopu__price b{font-size:clamp(2rem,6vw,2.7rem);line-height:1;color:var(--cyan-soft);font-variant-numeric:tabular-nums}
      .shopu__price span{color:var(--muted)}
      .shopu__avail{margin:.55rem 0 0;font-weight:600}
      .shopu__avail--ok{color:#7be0a5}
      .shopu__avail--no{color:#ffb3a4}
      .shopu__facts{display:flex;flex-wrap:wrap;gap:.4rem .5rem;margin:.75rem 0 0;padding:0;list-style:none}
      .shopu__facts li{font-size:.84rem;padding:.3rem .65rem;border:1px solid var(--line);border-radius:var(--r-pill)}
      .shopu__btns{max-width:420px;margin:1rem 0 0}
      .shopu__status{min-height:1.4em;margin:.6rem 0 0;line-height:1.5}
      .shopu__status--bad{color:#ffb3a4}
      .shopu__spec{width:100%;border-collapse:collapse;font-size:.95rem}
      .shopu__spec th,.shopu__spec td{text-align:left;vertical-align:top;padding:.55rem .4rem;border-bottom:1px solid var(--line)}
      .shopu__spec th{width:34%;color:var(--muted);font-weight:500}
      .shop__list{margin:0;padding-left:1.15rem;display:flex;flex-direction:column;gap:.45rem;line-height:1.55}
      .shopu__done h2{font-size:clamp(1.4rem,3vw,1.8rem)}
      .shoph__grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,250px),1fr));gap:1rem}
      .shoph__item{display:flex;flex-direction:column;border:1px solid var(--line);border-radius:var(--r-xl);background:var(--glass);overflow:hidden;color:inherit;text-decoration:none;min-width:0}
      .shoph__item:hover,.shoph__item:focus-visible{border-color:var(--cyan-soft)}
      .shoph__img{aspect-ratio:4/3;background:#0b1626}
      .shoph__img img{width:100%;height:100%;object-fit:contain;display:block}
      .shoph__body{padding:.8rem .95rem 1rem;display:flex;flex-direction:column;gap:.3rem}
      .shoph__body h3{font-size:1.05rem;margin:0}
      .shoph__body p{margin:0;color:var(--muted);font-size:.88rem;line-height:1.45}
      .shoph__row{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:.3rem;margin-top:.35rem}
      .shoph__row b{font-size:1.35rem;color:var(--cyan-soft)}
      .shoph__badge{font-size:.78rem;font-weight:700;padding:.2rem .55rem;border-radius:var(--r-pill);background:rgba(123,224,165,.14);color:#7be0a5}
      .shoph__item[data-state="sold"],.shoph__item[data-state="held"]{opacity:.62}
      .shoph__item[data-state="sold"] .shoph__badge,.shoph__item[data-state="held"] .shoph__badge{background:rgba(255,179,164,.14);color:#ffb3a4}
      .shopc__head{display:flex;flex-wrap:wrap;align-items:center;gap:1rem 1.4rem;margin:0 0 1.2rem}
      .shopc__ring{--v:0;width:110px;height:110px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;background:conic-gradient(var(--ring) calc(var(--v)*1%),rgba(255,255,255,.08) 0)}
      .shopc__ring b{width:86px;height:86px;border-radius:50%;background:#0b1626;display:flex;align-items:center;justify-content:center;font-size:1.7rem;font-variant-numeric:tabular-nums}
      .shopc__verdict{font-size:1.25rem;font-weight:700}
      .shopc__cats{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,230px),1fr));gap:.7rem 1.4rem;margin:0 0 1.3rem}
      .shopc__cat p{margin:0;display:flex;justify-content:space-between;gap:.5rem;font-weight:600}
      .shopc__bar{height:8px;border-radius:99px;background:rgba(255,255,255,.08);overflow:hidden;margin:.3rem 0 .25rem}
      .shopc__bar i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#1d97e3,#00ce1b)}
      .shopc__cat small{color:var(--muted);font-size:.84rem;line-height:1.4;display:block}
      .shopc__tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,130px),1fr));gap:.6rem;margin:.2rem 0 1.3rem}
      .shopc__tile{border:1px solid var(--line);border-radius:12px;padding:.7rem .6rem;text-align:center}
      .shopc__tile b{display:block;font-size:1.35rem;font-variant-numeric:tabular-nums}
      .shopc__tile span{display:block;color:var(--muted);font-size:.74rem;letter-spacing:.03em;margin-top:.15rem}
      .shopc h3{font-size:1rem;margin:1.2rem 0 .5rem}
      .shopc__drive{border:1px solid var(--line);border-radius:12px;padding:.75rem .9rem;margin:0 0 .6rem;line-height:1.5}
      .shopc__drive small{color:var(--muted);display:block}
      .shopc__did li{list-style:none;position:relative;padding-left:1.4rem}
      .shopc__did li::before{content:"\2713";position:absolute;left:0;color:#7be0a5;font-weight:700}
      .shopc__did{padding-left:0!important}
'''

_UNIT_JS = r'''
(function () {
  var API = '/api/shop.php', root = document.getElementById('shopu'), unit = root.getAttribute('data-unit');
  function el(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function post(b) {
    return fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b), credentials: 'same-origin' })
      .then(function (r) { return r.json().catch(function () { return { ok: false, error: 'http_' + r.status }; }); });
  }
  // this browser's hold token: its own retry is never told someone else is buying the machine
  var hold = '';
  try { hold = localStorage.getItem('shopHold') || ''; } catch (e) {}
  if (!/^[a-f0-9]{32}$/.test(hold)) {
    var a = new Uint8Array(16); (window.crypto || window.msCrypto).getRandomValues(a);
    hold = Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
    try { localStorage.setItem('shopHold', hold); } catch (e) {}
  }
  // the photos
  var main = el('shopmain');
  Array.prototype.forEach.call(document.querySelectorAll('.shopu__thumbs button'), function (b) {
    b.addEventListener('click', function () {
      if (main) { main.src = b.getAttribute('data-src'); main.alt = b.getAttribute('data-alt'); }
      Array.prototype.forEach.call(document.querySelectorAll('.shopu__thumbs button'), function (x) { x.setAttribute('aria-current', x === b ? 'true' : 'false'); });
    });
  });
  function status(t, bad) { var s = el('shopstatus'); s.textContent = t; s.className = 'shopu__status' + (bad ? ' shopu__status--bad' : ''); }
  function avail(t, ok) { var a = el('shopavail'); a.textContent = t; a.className = 'shopu__avail ' + (ok ? 'shopu__avail--ok' : 'shopu__avail--no'); }
  var lastOrder = '';
  function done(r) {
    el('shopbuy').hidden = true;
    var d = el('shopdone'), h;
    if (r.state === 'pending') h = '<h2>Thank you. PayPal is still checking the payment.</h2><p>The machine is yours. As soon as PayPal clears the payment we&rsquo;ll send it and email you the tracking number.</p>';
    else h = '<h2>Thank you &mdash; it&rsquo;s yours.</h2><p>We&rsquo;ll send it within 2 working days by tracked courier and email you the tracking number.</p>';
    h += '<p>' + (r.email ? 'Your order confirmation is on its way to <b>' + esc(r.email) + '</b>. ' : '') + 'PayPal emails you a receipt as well. Any questions, reply to our email or call <a href="tel:+441202775566">01202 775566</a>.</p>';
    d.innerHTML = h; d.hidden = false;
    avail('Sold', false);
    try { d.scrollIntoView({ block: 'start' }); } catch (e) {}
  }
  var WHY = {
    sold: 'Sorry, this machine has just been sold. Nothing was charged.',
    gone: 'Sorry, this machine has just been sold or taken off sale. Nothing was charged.',
    not_uk: 'We can only deliver in the UK. Nothing was charged - choose a UK address in PayPal to buy it.',
    held: 'Someone else is buying this machine right now. If they don&rsquo;t finish, it comes back in about 20 minutes.',
    rate: 'Too many tries from here today - please call 01202 775566.',
    not_set_up: 'Buying online isn&rsquo;t open just now. Please call 01202 775566.'
  };
  function buttons(cfg) {
    var s = document.createElement('script');
    s.src = 'https://www.paypal.com/sdk/js?client-id=' + encodeURIComponent(cfg.client_id) + '&currency=GBP&intent=capture&components=buttons&locale=en_GB';
    s.onerror = function () { status('PayPal’s buttons didn’t load. Check your connection or ad blocker, then refresh the page.', true); };
    s.onload = function () {
      if (!window.paypal || !window.paypal.Buttons) { status('PayPal’s buttons didn’t load. Refresh the page to try again.', true); return; }
      window.paypal.Buttons({
        style: { layout: 'vertical', label: 'buynow', shape: 'rect' },
        createOrder: function () {
          status('');
          return post({ 'do': 'create', unit: unit, hold: hold }).then(function (r) {
            if (r && r.ok && r.id) { lastOrder = r.id; return r.id; }
            var w = r && WHY[r.error];
            if (r && (r.error === 'sold' || r.error === 'held')) avail(r.error === 'sold' ? 'Sold' : 'Someone is buying this right now', false);
            throw new Error(w ? w.replace(/&rsquo;/g, '’') : 'We couldn’t start the payment. Please try again.');
          });
        },
        onShippingAddressChange: function (data, actions) {
          var cc = data && data.shippingAddress && data.shippingAddress.countryCode;
          if (cc && cc !== 'GB') return actions.reject(data.errors && data.errors.COUNTRY_ERROR);
        },
        onApprove: function (data, actions) {
          status('Taking the payment…');
          return post({ 'do': 'capture', order: data.orderID }).then(function (r) {
            status('');
            r = r || {};
            if (r.state === 'sold' || r.state === 'pending' || r.state === 'had') { done(r); return; }
            if (r.state === 'declined' && actions && actions.restart) return actions.restart();
            if (r.state === 'gone') avail('Sold', false);
            status(WHY[r.state] ? WHY[r.state].replace(/&rsquo;/g, '’') : 'PayPal didn’t take the payment, so nothing was charged. Please try again, or call 01202 775566.', true);
          }).catch(function () { status('We couldn’t reach our server. If PayPal shows the payment, we have your order and will email you; otherwise please try again.', true); });
        },
        onCancel: function (data) {
          status('Payment cancelled. Nothing was taken.');
          post({ 'do': 'release', order: (data && data.orderID) || lastOrder, hold: hold });
        },
        onError: function (e) { status((e && e.message && /^[A-Z]/.test(e.message) ? e.message : 'Something went wrong with PayPal. Nothing was taken. Please try again.'), true); }
      }).render('#shopbtns');
    };
    document.head.appendChild(s);
  }
  post({ 'do': 'config', unit: unit, hold: hold }).then(function (c) {
    if (!c || !c.ok) { status('We couldn’t reach our server. Refresh the page in a minute.', true); return; }
    if (c.state === 'sold' || c.state === 'off') { avail(c.state === 'sold' ? 'Sold' : 'Not on sale just now', false); el('shopgone').hidden = false; return; }
    if (c.state === 'held') { avail('Someone is buying this right now', false); status('If they don’t finish, it comes back in about 20 minutes - refresh the page then.'); return; }
    if (!c.client_id) { status(WHY.not_set_up.replace(/&rsquo;/g, '’'), true); return; }
    if (c.env === 'sandbox' || root.getAttribute('data-test') === '1') el('shoptest').hidden = false;
    avail('In stock: this exact machine', true);
    buttons(c);
  }).catch(function () { status('We couldn’t reach our server. Refresh the page in a minute.', true); });
})();
'''

_HUB_JS = r'''
(function () {
  fetch('/api/shop.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"do":"stock"}', credentials: 'same-origin' })
    .then(function (r) { return r.json(); }).then(function (j) {
      if (!j || !j.units) return;
      Array.prototype.forEach.call(document.querySelectorAll('.shoph__item[data-unit]'), function (a) {
        var st = j.units[a.getAttribute('data-unit')], b = a.querySelector('.shoph__badge');
        if (st === 'sold' || st === 'held') { a.setAttribute('data-state', st); if (b) b.textContent = st === 'sold' ? 'Sold' : 'Being bought now'; }
      });
    }).catch(function () {});
})();
'''

HUB_FAQS = [
    ("Is the machine in the photos the one I get?",
     "Yes. Every listing is one real machine, photographed here. The grade, the battery health and any marks we mention are "
     "that machine&rsquo;s, not a stock picture."),
    ("How much is delivery?",
     "&pound;%d to anywhere in the UK, by tracked courier. We send it within %d working days of your order and email you the "
     "tracking number." % (S.DELIVERY_GBP, S.DISPATCH_DAYS[1])),
    ("How do I pay?",
     "Through PayPal, with a PayPal account or a debit or credit card. PayPal takes the payment, so we never see your card details."),
    ("Can I change my mind?",
     "Yes. You have 14 days from delivery, and returning it is free: in our service area we collect it, and anywhere else "
     "in the UK we send you a prepaid returns label. We refund the machine and the standard delivery you paid. "
     "<a href=\"/terms/\">Our terms</a> have the details."),
    ("What guarantee does it come with?",
     "12 months return-to-base, or 5 years for as long as you&rsquo;re on one of our <a href=\"/home-it-support-plans/\">support plans</a>. "
     "That sits on top of your legal rights, never instead of them. <a href=\"/our-guarantees/\">Our guarantees</a>."),
    ("What is 365 PC Manager, and why is it on there?",
     "Our own free app, already installed. It keeps Windows updated and healthy, warns you before small problems become big "
     "ones, and puts a real person one click away. It&rsquo;s yours to keep or remove. <a href=\"/free-pc-health-check/\">About 365 PC Manager</a>."),
    ("Can I see it before I buy?",
     "Yes, if you&rsquo;re in our service area: we&rsquo;ll bring it to your home or business to try. Call "
     "<a href=\"tel:+441202775566\">01202 775566</a> or tell us which one through <a href=\"/dell-hardware/#pick\">our Dell page</a>."),
]


def _hub_content(us, task_head, bc, faq_html):
    on = live(us)
    sold = [u for u in us if u["status"] == "sold"][-6:]
    lede = ("Real refurbished Dell machines on our shelf right now, each with its own photos and a fixed price. A brand-new "
            "1TB Samsung SSD in every one, Windows set up, &pound;%d UK delivery." % S.DELIVERY_GBP)
    head = task_head(bc("Refurbished Dell for sale"), 'Refurbished Dell <em class="grad grad--cyan">in stock now</em>', lede,
                     trust=['<a href="/reviews/">&#9733; Rated 4.9 on Google</a>', "Family-run since 1995", "Free 14-day returns"])
    cards = []
    for u in on + sold:
        img = (u["imgs"][0] if u["imgs"] else "")
        st = "sold" if u["status"] == "sold" else ""
        specs = "%s &middot; %s RAM &middot; new 1TB SSD" % (_e(re.sub(r"\s*\(.*\)$", "", u["cpu"])), _e(u["ram"]))
        extra = ("Grade %s &middot; battery %s" % (_e(u["grade"]), _e(u["battery"]))) if u["kind"] == "laptop" else "Grade %s" % _e(u["grade"])
        if u.get("check") and u["check"].get("score") is not None:
            extra += " &middot; PC Manager score %d%%" % u["check"]["score"]
        cards.append(
            f'          <a class="shoph__item" href="/{HUB}/{u["id"]}/" data-unit="{u["id"]}"' + (f' data-state="{st}"' if st else "") + '>\n'
            f'            <div class="shoph__img">' + (f'<img src="{img}" alt="{_e(u["name"])}" width="400" height="300" loading="lazy" decoding="async">' if img else "") + '</div>\n'
            f'            <div class="shoph__body"><h3>{_e(u["name"])}</h3><p>{_e(u["screen"])}</p><p>{specs}</p><p>{extra}</p>\n'
            f'              <div class="shoph__row"><b>&pound;{u["price"]}</b><span class="shoph__badge">' + ("Sold" if st else "In stock") + '</span></div></div>\n'
            '          </a>')
    if on:
        body = '        <div class="shoph__grid">\n' + "\n".join(cards) + '\n        </div>'
    else:
        body = ('        <p class="shop__note">Our next machines are being got ready right now. In the meantime, every model we sell is on '
                '<a href="/dell-hardware/#pick">our Dell page</a> with a guide price: pick one and we&rsquo;ll find you that exact machine.</p>'
                + ('\n        <div class="shoph__grid">\n' + "\n".join(cards) + '\n        </div>' if cards else ""))
    app = f'''    <section class="shop" aria-label="Refurbished Dell machines in stock">
      <div class="shop__in">
{body}
        <div class="shop__card">
          <h2>Every machine comes with</h2>
          <ul class="shop__list">
            <li>A <b>brand-new 1TB Samsung 990 PRO SSD</b>, fitted and tested by us</li>
            <li><b>Windows 11</b> set up and up to date, ready to switch on and use</li>
            <li><b>365 PC Manager</b>, our free app that keeps it healthy, with a real person one click away</li>
            <li>A <b>12-month guarantee</b>, or <b>5 years</b> while you&rsquo;re on a 365 support plan</li>
            <li><b>&pound;{S.DELIVERY_GBP} UK delivery</b> by tracked courier, and <b>free returns</b> within 14 days</li>
          </ul>
          <p class="shop__small">Can&rsquo;t see the one you want? <a href="/dell-hardware/#pick">See every model with guide prices</a> and we&rsquo;ll find it for you.</p>
        </div>
      </div>
      <style>{_CSS}      </style>
      <script>{_HUB_JS}</script>
    </section>'''
    return "\n".join([head, app, faq_html(HUB_FAQS)])


def _check_card(u):
    """'Checked by 365 PC Manager': what our own full service found on this machine (shop_checks/<id>.json)."""
    c = u.get("check")
    if not c:
        return ""
    score = c.get("score")
    ring = "#00ce1b" if (score or 0) >= 80 else ("#e0b341" if (score or 0) >= 55 else "#e8637e")
    when = (" on " + _e(c["date"])) if c.get("date") else ""
    what = "full service" if c.get("kind") == "service" else "health check"
    parts = [f'        <div class="shop__card shopc" id="pc-manager-check">',
             '          <h2>Checked by 365 PC Manager</h2>',
             f'          <p class="shop__small" style="margin:0 0 1rem">What our own <a href="/free-pc-health-check/">365 PC Manager</a> {what} found on this exact machine{when}, straight from its report.</p>']
    if score is not None:
        parts.append(f'          <div class="shopc__head"><div class="shopc__ring" style="--v:{int(score)};--ring:{ring}"><b>{int(score)}%</b></div>'
                     f'<div><div class="shopc__verdict">{_e(c.get("verdict", ""))}</div><div class="shop__small" style="margin:.2rem 0 0">overall health score</div></div></div>')
    if c.get("cats"):
        cats = "".join(f'<div class="shopc__cat"><p><span>{_e(x["name"])}</span><span>{int(x["value"])}</span></p>'
                       f'<div class="shopc__bar"><i style="width:{max(0, min(100, int(x["value"])))}%"></i></div><small>{_e(x["note"])}</small></div>'
                       for x in c["cats"])
        parts.append(f'          <div class="shopc__cats">{cats}</div>')
    if c.get("bench"):
        tiles = "".join(f'<div class="shopc__tile"><b>{_e(b["v"])}</b><span>{_e(b["l"])}</span></div>' for b in c["bench"])
        parts.append(f'          <h3>Speed tests</h3>\n          <div class="shopc__tiles">{tiles}</div>')
    if c.get("drives"):
        drv = "".join(f'<div class="shopc__drive"><b>{_e(d["name"])}</b> &middot; {_e(d["type"])} &middot; <span style="color:#7be0a5">{_e(d["health"])}</span>'
                      f'<small>{_e(d["hours"])} &middot; {_e(d["written"])} written &middot; {_e(d["speed"])}</small>'
                      + (f'<small>{_e(d["note"])}</small>' if d.get("note") else "") + '</div>' for d in c["drives"])
        parts.append(f'          <h3>Drives</h3>\n          {drv}')
    facts = [(r["k"], r["v"]) for r in c.get("rows", [])] + [(r["k"], r["v"]) for r in c.get("net", [])]
    if facts:
        fr = "".join(f'<tr><th scope="row">{_e(k)}</th><td>{_e(v)}</td></tr>' for k, v in facts)
        parts.append(f'          <h3>What it found</h3>\n          <table class="shopu__spec"><tbody>{fr}</tbody></table>')
    if c.get("suited"):
        parts.append('          <h3>What this machine is well suited to</h3>\n          <ul class="shop__list">'
                     + "".join(f"<li>{_e(x)}</li>" for x in c["suited"]) + "</ul>")
    if c.get("did"):
        parts.append('          <h3>What the service did</h3>\n          <ul class="shop__list shopc__did">'
                     + "".join(f'<li><b>{_e(d["name"])}</b>: {_e(d["detail"])}</li>' for d in c["did"]) + "</ul>")
    if any("backup" in x.get("note", "").lower() for x in c.get("cats", [])):
        parts.append('          <p class="shop__small">A machine that has just been set up has nothing to back up yet, so the protection '
                     'score counts &ldquo;no backup&rdquo; against it. Once it&rsquo;s yours, 365 PC Manager helps you set one up, and '
                     'it&rsquo;s part of every <a href="/home-it-support-plans/">support plan</a>.</p>')
    parts.append("        </div>")
    return "\n".join(parts)


def _unit_content(u, task_head, bc_sub):
    m = u["m"]
    test = u["status"] == "test"
    crumbs = bc_sub("Refurbished Dell for sale", "/%s/" % HUB, _e(u["name"]))
    lede = ("One real machine, photographed here: %s, %s RAM and a brand-new 1TB Samsung SSD. &pound;%d plus &pound;%d UK delivery."
            % (_e(u["cpu"]), _e(u["ram"]), u["price"], 0 if test else S.DELIVERY_GBP)) if not test else "Our own test listing. Please don&rsquo;t buy it."
    head = task_head(crumbs, _e(u["name"]), lede, trust=['<a href="/reviews/">&#9733; Rated 4.9 on Google</a>', "Family-run since 1995", "Free 14-day returns"])
    if u["imgs"]:
        main = f'<img id="shopmain" src="{u["imgs"][0]}" alt="{_e(u["name"])}, photo 1" width="1200" height="900" decoding="async">'
        thumbs = "".join(
            f'<li><button type="button" data-src="{p}" data-alt="{_e(u["name"])}, photo {i}" aria-current="{"true" if i == 1 else "false"}" '
            f'aria-label="Photo {i}"><img src="{p}" alt="" width="72" height="54" loading="lazy" decoding="async"></button></li>'
            for i, p in enumerate(u["imgs"], 1)) if len(u["imgs"]) > 1 else ""
    else:
        main, thumbs = '<div class="shopu__ph">TEST LISTING<br>no photo</div>', ""
    rows = [("Processor", u["cpu"]), ("Memory", u["ram"]), ("Storage", S.SSD), ("Screen", u["screen"]), ("Windows", u["windows"]),
            ("Condition", "Grade %s: %s" % (u.get("grade", ""), S.GRADES.get(u.get("grade"), "")))]
    if u["kind"] == "laptop":
        rows.append(("Battery health", u.get("battery", "")))
    if u.get("extras"):
        rows.append(("Also has", u["extras"]))
    rows.append(("Marks on this machine", u["marks"] or "None worth mentioning"))
    rows.append(("In the box", "%s. 365 PC Manager installed." % u["charger"].rstrip(".")))
    spec = "\n".join(f'              <tr><th scope="row">{_e(k)}</th><td>{_e(v)}</td></tr>' for k, v in rows)
    deliv = 0 if test else S.DELIVERY_GBP
    facts = "".join(f"<li>{x}</li>" for x in (["Grade %s" % _e(u.get("grade", ""))] + (["Battery %s" % _e(u.get("battery", ""))] if u["kind"] == "laptop" else [])
                                                + ["New 1TB Samsung SSD", "12-month guarantee"]
                                                + (['<a href="#pc-manager-check">PC Manager score %d%%</a>' % u["check"]["score"]]
                                                   if u.get("check") and u["check"].get("score") is not None else [])))
    app = f'''    <section class="shop" aria-label="Buy this machine" id="shopu" data-unit="{u["id"]}" data-test="{"1" if test else "0"}">
      <div class="shop__in">
        <p class="shop__test" id="shoptest"{"" if test else " hidden"}>TEST LISTING: please don&rsquo;t buy this. It is for checking that buying works.</p>
        <div class="shopu__grid">
          <div class="shopu__gal">
            <div class="shopu__main">{main}</div>
            {f'<ul class="shopu__thumbs">{thumbs}</ul>' if thumbs else ''}
          </div>
          <div class="shop__card" id="shopbuy">
            <p class="shopu__price"><b>&pound;{u["price"]}</b><span>+ &pound;{deliv} UK delivery</span></p>
            <p class="shopu__avail" id="shopavail">{"Sold" if u["status"] == "sold" else "In stock: this exact machine"}</p>
            <ul class="shopu__facts">{facts}</ul>
            <div class="shopu__btns" id="shopbtns"></div>
            <p class="shopu__status" id="shopstatus" role="status" aria-live="polite"></p>
            <p class="shop__note" id="shopgone" hidden>This one has gone, but we can usually find you another. <a href="/{HUB}/">See what&rsquo;s in stock</a> or <a href="/dell-hardware/#pick">every model with guide prices</a>.</p>
            <p class="shop__small">You&rsquo;re buying from <b>365 Techies Ltd</b>, the family IT business in Bournemouth. Pay with PayPal or a debit or credit card through PayPal, so we never see your card. UK delivery only. <a href="/terms/">Terms</a> &middot; <a href="/privacy-policy/#shop-orders">Privacy</a>.</p>
          </div>
        </div>
        <div class="shop__card shopu__done" id="shopdone" hidden aria-live="polite"></div>
        <div class="shop__card">
          <h2>This machine</h2>
          <table class="shopu__spec">
            <tbody>
{spec}
            </tbody>
          </table>
          <p class="shop__small">Ports, screen connections and upgrade options for the {_e(m["name"])}: <a href="{m["href"]}#{u["model"]}">full model details</a>.</p>
        </div>
{_check_card(u)}
        <div class="shop__card">
          <h2>Delivery, returns and your guarantee</h2>
          <ul class="shop__list">
            <li><b>Delivery:</b> &pound;{S.DELIVERY_GBP} to anywhere in the UK by tracked courier. We send it within {S.DISPATCH_DAYS[1]} working days and email you the tracking number.</li>
            <li><b>Free returns:</b> changed your mind? You have 14 days from delivery. In our service area we collect it; anywhere else in the UK we send you a prepaid returns label. We refund the machine and the standard delivery you paid. <a href="/terms/">Our terms</a>.</li>
            <li><b>Something wrong?</b> You can reject a faulty machine within 30 days for a full refund, and after that we repair or replace it.</li>
            <li><b>Guarantee:</b> 12 months return-to-base, or 5 years while you&rsquo;re on one of our <a href="/home-it-support-plans/">support plans</a>. <a href="/our-guarantees/">Our guarantees</a>.</li>
          </ul>
        </div>
        <div class="shop__card">
          <h2>Rather see it first?</h2>
          <p style="margin:0;line-height:1.6">In our service area we&rsquo;ll bring it to your home or business so you can try it before you buy. Call <a href="tel:+441202775566">01202 775566</a> or text 07520 615332 and mention <b>{u["id"]}</b>.</p>
        </div>
      </div>
      <style>{_CSS}      </style>
      <script>{_UNIT_JS}</script>
    </section>'''
    return "\n".join([head, app])


def _unit_schema_nodes(u):
    if u["status"] == "test":
        return []
    offer = {
        "@type": "Offer", "price": "%.2f" % u["price"], "priceCurrency": "GBP", "url": u["url"],
        "availability": "https://schema.org/SoldOut" if u["status"] == "sold" else "https://schema.org/InStock",
        "itemCondition": "https://schema.org/RefurbishedCondition",
        "seller": {"@type": "Organization", "name": "365 Techies"},
        "shippingDetails": {
            "@type": "OfferShippingDetails",
            "shippingRate": {"@type": "MonetaryAmount", "value": S.DELIVERY_GBP, "currency": "GBP"},
            "shippingDestination": {"@type": "DefinedRegion", "addressCountry": "GB"},
            "deliveryTime": {"@type": "ShippingDeliveryTime",
                             "handlingTime": {"@type": "QuantitativeValue", "minValue": S.DISPATCH_DAYS[0], "maxValue": S.DISPATCH_DAYS[1], "unitCode": "DAY"},
                             "transitTime": {"@type": "QuantitativeValue", "minValue": S.TRANSIT_DAYS[0], "maxValue": S.TRANSIT_DAYS[1], "unitCode": "DAY"}}},
        "hasMerchantReturnPolicy": {"@type": "MerchantReturnPolicy", "applicableCountry": "GB",
                                    "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow", "merchantReturnDays": 14,
                                    # owner 14 Oct 2026: "happy with the free returns" - collected locally, a prepaid label elsewhere
                                    "returnMethod": "https://schema.org/ReturnByMail", "returnFees": "https://schema.org/FreeReturn"},
    }
    return [{"@type": "Product", "@id": u["url"] + "#product", "name": u["name"], "sku": u["id"],
             "description": _feed_desc(u), "brand": {"@type": "Brand", "name": "Dell"},
             "itemCondition": "https://schema.org/RefurbishedCondition",
             "image": [SITE + i for i in u["imgs"]], "offers": offer}]


def build(add, dell_machines, bp, bc, bc_sub, faq_html, graph, crumb, crumb_sub, webpage, faqpage):
    """Register the pages and write the server's catalogue. Returns the checked machines (for instock_band)."""
    us = units(dell_machines)
    write_catalogue(us)
    on = live(us)
    desc = ("Refurbished Dell laptops and desktops in stock at 365 Techies: each one photographed, with a new 1TB Samsung SSD, "
            "Windows set up and a fixed price. Pay by PayPal or card, £%d UK delivery, free 14-day returns." % S.DELIVERY_GBP)

    def hub_schema(s, _desc=desc):
        return graph([crumb(s, "Refurbished Dell for sale"), webpage(s, "Refurbished Dell in stock now", _desc), faqpage(s, HUB_FAQS)])
    add(slug=HUB, title="Refurbished Dell Laptops in Stock | 365 Techies", desc=desc, og_title="Refurbished Dell in stock | 365 Techies",
        schema=hub_schema, content=_hub_content(us, bp.task_head, bc, faq_html),
        robots=None if on else "noindex,follow", nosearch=not on)   # nothing on sale: kept out of search, llms.txt and the sitemap

    for u in us:
        if u["status"] == "draft":
            continue
        d = ("%s for sale: %s, %s RAM, new 1TB Samsung SSD, %s. £%d plus £%d UK delivery, pay by PayPal or card."
             % (u["name"], re.sub(r"\s*\(.*\)$", "", u.get("cpu", "")), u.get("ram", ""), u.get("windows", ""), u["price"], S.DELIVERY_GBP))[:300]

        def unit_schema(s, _u=u, _d=d):
            return graph([crumb_sub(s, "Refurbished Dell for sale", HUB, _u["name"]), webpage(s, _u["name"], _d,
                          image=(_u["imgs"][0] if _u["imgs"] else None))] + _unit_schema_nodes(_u))
        add(slug=u["slug"], title=("%s | 365 Techies" % u["name"])[:70], desc=d, og_title=u["name"],
            og_image=(SITE + u["imgs"][0]) if u["imgs"] else None,
            # one machine sells and is gone: never in search or llms.txt (Google Shopping finds it through the feed)
            schema=unit_schema, content=_unit_content(u, bp.task_head, bc_sub), robots="noindex,follow", nosearch=True)
    return us


def instock_band(us):
    """For /dell-hardware/: a band above the picker while machines are live. Empty when nothing is on sale."""
    on = live(us)
    if not on:
        return ""
    low = min(u["price"] for u in on)
    n = len(on)
    return f'''    <section class="section" aria-label="In stock now" id="in-stock">
      <div class="wrap">
        <div class="shop__note" style="max-width:62rem;margin:0 auto;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:.8rem 1.4rem;padding:1.1rem 1.3rem;border-radius:var(--r-xl);background:rgba(29,151,227,.1);border:1px solid rgba(29,151,227,.3)">
          <p style="margin:0;line-height:1.55"><b>In stock now: {n} machine{"" if n == 1 else "s"} you can buy online</b>, from &pound;{low}. Real photos of each one, a fixed price and &pound;{S.DELIVERY_GBP} UK delivery.</p>
          <a class="button primary" href="/{HUB}/">See what&rsquo;s in stock</a>
        </div>
      </div>
    </section>'''
