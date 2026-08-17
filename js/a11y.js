/* ==========================================================================
   365 TECHIES — accessibility toolbar (loads on every page, no dependencies)
   Text size, high contrast, readable font, reduce motion, read-aloud.
   Preferences saved in localStorage. Plus light inline jargon tooltips.
   ========================================================================== */
(function () {
  var root = document.documentElement;
  var KEY = "tt_a11y";
  var state = { text: 0, contrast: false, readable: false, reduce: false };
  try { state = Object.assign(state, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) {}

  function setPressed(name, on) {
    var b = document.querySelector('[data-a11y="' + name + '"]');
    if (b) b.setAttribute("aria-pressed", on ? "true" : "false");
  }
  function apply() {
    root.classList.remove("a11y-text-1", "a11y-text-2", "a11y-text-3");
    if (state.text > 0) root.classList.add("a11y-text-" + state.text);
    root.classList.toggle("a11y-contrast", !!state.contrast);
    root.classList.toggle("a11y-readable", !!state.readable);
    root.classList.toggle("a11y-reduce", !!state.reduce);
    setPressed("contrast", state.contrast);
    setPressed("readable", state.readable);
    setPressed("reduce", state.reduce);
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

  apply(); // apply saved prefs as early as possible (cuts flash)

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(function () {
    apply();
    var wrap = document.getElementById("a11y");
    var toggle = document.getElementById("a11y-toggle");
    var panel = document.getElementById("a11y-panel");
    if (toggle && panel && wrap) {
      toggle.addEventListener("click", function () {
        var willOpen = panel.hasAttribute("hidden");
        if (willOpen) panel.removeAttribute("hidden"); else panel.setAttribute("hidden", "");
        toggle.setAttribute("aria-expanded", willOpen ? "true" : "false");
      });
      document.addEventListener("click", function (e) {
        if (!wrap.contains(e.target) && !panel.hasAttribute("hidden")) {
          panel.setAttribute("hidden", ""); toggle.setAttribute("aria-expanded", "false");
        }
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && !panel.hasAttribute("hidden")) {
          panel.setAttribute("hidden", ""); toggle.setAttribute("aria-expanded", "false"); toggle.focus();
        }
      });
    }

    var synth = window.speechSynthesis || null;
    var reading = false;
    function setRead(on) {
      var rb = document.querySelector('[data-a11y="read"]');
      if (rb) { rb.setAttribute("aria-pressed", on ? "true" : "false"); rb.textContent = on ? "Stop reading" : "Read this page aloud"; }
    }
    function toggleRead() {
      if (!synth) return;
      if (reading) { synth.cancel(); reading = false; setRead(false); return; }
      var main = document.querySelector("main") || document.body;
      var text = (main.innerText || main.textContent || "").replace(/\s+/g, " ").trim().slice(0, 9000);
      if (!text) return;
      var u = new SpeechSynthesisUtterance(text);
      u.rate = 1; u.lang = "en-GB";
      u.onend = function () { reading = false; setRead(false); };
      u.onerror = function () { reading = false; setRead(false); };
      synth.cancel(); synth.speak(u); reading = true; setRead(true);
    }

    document.addEventListener("click", function (e) {
      var b = e.target.closest("[data-a11y]"); if (!b) return;
      var act = b.getAttribute("data-a11y");
      if (act === "text-up") { state.text = Math.min(3, state.text + 1); apply(); save(); }
      else if (act === "text-down") { state.text = Math.max(0, state.text - 1); apply(); save(); }
      else if (act === "contrast") { state.contrast = !state.contrast; apply(); save(); }
      else if (act === "readable") { state.readable = !state.readable; apply(); save(); }
      else if (act === "reduce") { state.reduce = !state.reduce; apply(); save(); }
      else if (act === "read") { toggleRead(); }
      else if (act === "reset") {
        state = { text: 0, contrast: false, readable: false, reduce: false };
        apply(); save(); if (synth) synth.cancel(); reading = false; setRead(false);
      }
    });
    if (!synth) { var rb = document.querySelector('[data-a11y="read"]'); if (rb) rb.style.display = "none"; }
    window.addEventListener("beforeunload", function () { if (synth) synth.cancel(); });

    initJargon();
  });

  /* ---- light inline jargon tooltips (first occurrence only, inside .prose) ---- */
  function initJargon() {
    var TERMS = {
      "MFA": "Multi-factor authentication: a second login step (like a code) so a stolen password is not enough.",
      "two-factor authentication": "A second login step (like a code) on top of your password.",
      "VPN": "A private, encrypted internet connection that keeps your browsing safe, even on public Wi-Fi.",
      "ransomware": "A type of attack that locks your files and demands payment to unlock them.",
      "phishing": "Fake emails or messages that try to trick you into giving away passwords or money.",
      "malware": "Malicious software such as viruses, spyware and ransomware.",
      "the cloud": "Storing your files and email on secure internet servers instead of only on your device.",
      "Microsoft 365": "Microsoft's subscription bundle: Outlook email, Teams, Word, Excel and OneDrive storage.",
      "SSD": "Solid State Drive: fast modern storage that makes an old computer feel new.",
      "firewall": "A security barrier that blocks unwanted or dangerous traffic from the internet.",
      "patching": "Installing the latest updates that fix security holes and bugs.",
      "encryption": "Scrambling data so only the right people can read it.",
      "MSP": "Managed Service Provider: a company that proactively looks after all your IT for a monthly fee.",
      "backup": "A separate, safe copy of your data so you can recover it if something goes wrong."
    };
    var keys = Object.keys(TERMS).sort(function (a, b) { return b.length - a.length; });
    var used = {};
    var scopes = document.querySelectorAll(".prose");
    if (!scopes.length) return;
    var JID = 0;
    function closeTips() {
      var open = document.querySelectorAll(".jterm.is-open");
      for (var o = 0; o < open.length; o++) { open[o].classList.remove("is-open"); open[o].setAttribute("aria-expanded", "false"); }
    }
    document.addEventListener("click", closeTips);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeTips(); });
    var SKIP = { A: 1, BUTTON: 1, H1: 1, H2: 1, H3: 1, H4: 1, SUMMARY: 1, CODE: 1, ABBR: 1 };
    function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
    for (var s = 0; s < scopes.length; s++) {
      var walker = document.createTreeWalker(scopes[s], NodeFilter.SHOW_TEXT, null);
      var nodes = [], n;
      while ((n = walker.nextNode())) nodes.push(n);
      for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        if (!node.nodeValue || node.nodeValue.length < 3) continue;
        var p = node.parentNode;
        if (!p || SKIP[p.nodeName] || (p.closest && p.closest(".jterm"))) continue;
        for (var k = 0; k < keys.length; k++) {
          var term = keys[k];
          if (used[term]) continue;
          var re = new RegExp("\\b" + esc(term) + "\\b", "i");
          var m = re.exec(node.nodeValue);
          if (!m) continue;
          used[term] = 1;
          var after = node.splitText(m.index);
          var matchNode = after.splitText(m[0].length);
          var span = document.createElement("span");
          span.className = "jterm"; span.setAttribute("tabindex", "0");
          span.setAttribute("role", "button");
          span.setAttribute("aria-expanded", "false");
          span.textContent = m[0];
          var tip = document.createElement("span");
          tip.className = "jtip"; tip.setAttribute("role", "tooltip");
          tip.id = "jtip-" + (++JID);
          tip.textContent = TERMS[term];
          span.setAttribute("aria-describedby", tip.id);
          span.addEventListener("click", function (e) {
            e.stopPropagation();
            var willOpen = !this.classList.contains("is-open");
            closeTips();
            if (willOpen) { this.classList.add("is-open"); this.setAttribute("aria-expanded", "true"); }
          });
          span.addEventListener("keydown", function (e) {
            if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") { e.preventDefault(); this.click(); }
          });
          span.appendChild(tip);
          after.parentNode.replaceChild(span, after);
          break; // one term wrap per text node
        }
      }
    }
  }
})();


/* Open external links in a new tab so visitors don't lose the 365 Techies site.
   Skips links that already set a target; keeps any existing rel (e.g. sponsored). */
(function () {
  var host = location.hostname;
  function fix(a) {
    var href = a.getAttribute('href');
    if (!href || a.hasAttribute('target')) return;
    if (href.indexOf('http') !== 0) return;            // skip tel:/mailto:/sms:/# and relative
    var h;
    try { h = new URL(a.href).hostname; } catch (e) { return; }
    if (!h || h === host || h === 'localhost') return; // internal link
    a.setAttribute('target', '_blank');
    var rel = (a.getAttribute('rel') || '').split(/\s+/).filter(Boolean);
    if (rel.indexOf('noopener') === -1) rel.push('noopener');
    a.setAttribute('rel', rel.join(' '));
  }
  function run() { var l = document.getElementsByTagName('a'), i; for (i = 0; i < l.length; i++) fix(l[i]); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();


/* Conversion events -> GA4 (queued via the inline gtag stub; Consent Mode governs sending).
   Measures the contacts that matter: calls, texts, emails, SOS, checker runs, search opens.

   FUNNEL LAYER (2026-07-31): first-party attribution + tool events.
   - visit any page once with ?internal=365 to mark a device internal (events stop;
     ?internal=off unmarks). Nothing else identifies the visitor.
   - tt_attr stores first/last touch (utm_*, external referrer, landing page, date)
     so a lead can say where it originally came from. First-party localStorage only;
     it is sent nowhere until the visitor submits an enquiry form themselves.
   - tool_started fires on the first interaction with any free-tool page (the
     tool-seo section is the marker every tool page carries).
   - window.ttToolDone("slug") is called by tool widgets when a result is shown ->
     report_generated (once per page load per slug).
   - window.ttFunnel() hands forms.js the attribution + tools-used trail. */
(function () {
  var internal = false;
  try {
    var q = new URLSearchParams(location.search);
    if (q.get('internal') === '365') localStorage.setItem('tt_internal', '1');
    if (q.get('internal') === 'off') localStorage.removeItem('tt_internal');
    internal = localStorage.getItem('tt_internal') === '1';
  } catch (e) {}

  function ev(name, params) {
    if (internal) return;
    try { if (typeof window.gtag === 'function') window.gtag('event', name, params || {}); } catch (e) {}
  }

  /* ---- attribution: first touch is written once, last touch on every arrival
     that carries a campaign tag or an external referrer ---- */
  var attr = null;
  try {
    attr = JSON.parse(localStorage.getItem('tt_attr') || 'null');
    var qs = new URLSearchParams(location.search);
    var extRef = '';
    if (document.referrer) {
      var rh = '';
      try { rh = new URL(document.referrer).hostname; } catch (re) {}
      if (rh && rh !== location.hostname) extRef = document.referrer.slice(0, 200);
    }
    var touch = {
      src: (qs.get('utm_source') || '').slice(0, 60),
      med: (qs.get('utm_medium') || '').slice(0, 60),
      cam: (qs.get('utm_campaign') || '').slice(0, 80),
      ref: extRef, land: location.pathname,
      d: new Date().toISOString().slice(0, 10)
    };
    if (!attr || !attr.first) attr = { first: touch };
    else if (touch.src || touch.med || touch.cam || touch.ref) attr.last = touch;
    localStorage.setItem('tt_attr', JSON.stringify(attr));
  } catch (e) {}

  function toolsUsed() {
    try { return JSON.parse(localStorage.getItem('tt_tools') || '[]'); } catch (e) { return []; }
  }
  function noteTool(slug) {
    try {
      var t = toolsUsed();
      if (t.indexOf(slug) === -1) { t.push(slug); localStorage.setItem('tt_tools', JSON.stringify(t.slice(-12))); }
    } catch (e) {}
  }
  window.ttFunnel = function () { return { attr: attr, tools: toolsUsed(), internal: internal }; };

  /* ---- tool_started: first interaction on a tool page ---- */
  var toolPage = document.querySelector('section[aria-label="How this tool works"]')
    ? location.pathname.replace(/^\/|\/$/g, '') : null;
  if (toolPage) {
    var started = false;
    var startOnce = function (e) {
      if (started) return;
      if (!e.target.closest('main')) return;
      if (!e.target.closest('button, input, select, textarea, [role="button"], summary, label')) return;
      started = true;
      noteTool(toolPage);
      ev('tool_started', { tool: toolPage, page: location.pathname });
      document.removeEventListener('click', startOnce, true);
      document.removeEventListener('change', startOnce, true);
    };
    document.addEventListener('click', startOnce, true);
    document.addEventListener('change', startOnce, true);
  }

  /* ---- report_generated: tool widgets call ttToolDone at their result moment ---- */
  var doneFired = {};
  window.ttToolDone = function (slug) {
    slug = String(slug || toolPage || location.pathname.replace(/^\/|\/$/g, ''));
    if (doneFired[slug]) return;
    doneFired[slug] = 1;
    noteTool(slug);
    ev('report_generated', { tool: slug, page: location.pathname });
  };

  /* ---- native share on tool result cards ([data-ttshare] buttons).
     navigator.share opens the phone's own sheet (WhatsApp/email/SMS);
     desktop/Firefox fall back to copying an invite + link. No third-party
     scripts — the GOV.UK lesson is that share WIDGETS go unused, but a
     personal "send this to someone" on a RESULT is a different animal. ---- */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-ttshare]');
    if (!b) return;
    var url = location.origin + location.pathname;
    var text = b.getAttribute('data-share-text') || '';
    var slug = toolPage || location.pathname.replace(/^\/|\/$/g, '');
    var payload = { title: b.getAttribute('data-share-title') || document.title,
                    text: text, url: url };
    if (navigator.share) {
      navigator.share(payload).then(function () {
        ev('share', { tool: slug, method: 'native' });
      }).catch(function () { /* user closed the sheet - not an event */ });
    } else {
      var done = function (ok) {
        var old = b.textContent;
        b.textContent = ok ? 'Link copied — paste it anywhere' : 'Copy failed — copy the address bar';
        setTimeout(function () { b.textContent = old; }, 2600);
        if (ok) ev('share', { tool: slug, method: 'copy' });
      };
      try {
        navigator.clipboard.writeText(text + ' ' + url).then(function () { done(true); },
          function () { done(false); });
      } catch (cerr) { done(false); }
    }
  });
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href], [data-wc-prefill], [data-search-open]');
    if (!a) return;
    if (a.hasAttribute('data-search-open')) { ev('site_search_open', { page: location.pathname }); return; }
    if (a.hasAttribute('data-wc-prefill')) { ev('website_check_prefill', { target_url: a.getAttribute('data-wc-prefill'), page: location.pathname }); return; }
    var href = a.getAttribute('href') || '';
    if (href.indexOf('tel:') === 0) ev('phone_call_click', { link_url: href, page: location.pathname });
    else if (href.indexOf('sms:') === 0) ev('sms_click', { link_url: href, page: location.pathname });
    else if (href.indexOf('mailto:') === 0) ev('email_click', { link_url: href, page: location.pathname });
    else if (href.indexOf('sos.splashtop.com') !== -1 || href.indexOf('/sos/') !== -1) ev('sos_click', { page: location.pathname });
    /* the click that starts a paying Direct Debit plan - the core product's one conversion action */
    else if (href.indexOf('pay.gocardless.com') !== -1) ev('start_plan_click', { link_url: href, page: location.pathname });
  }, true);
  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (f && f.id === 'wc-form') ev('website_check_run', { page: location.pathname });
  }, true);
})();

/* ==========================================================================
   Desktop dropdown menus: click/tap to open (hover-only is hard for older
   users with imprecise mouse control, and impossible on touch laptops).
   First click on a dropdown parent OPENS the panel; a second click follows
   the link. Outside click or Escape closes. Keyboard :focus-within untouched.
   ========================================================================== */
(function () {
  var items = document.querySelectorAll(".has-dropdown");
  if (!items.length) return;
  function closeAll(except) {
    items.forEach(function (it) {
      if (it === except) return;
      it.classList.remove("open");
      var l = it.querySelector("a");
      if (l && l.parentElement === it) l.setAttribute("aria-expanded", "false");
    });
  }
  items.forEach(function (item) {
    var link = item.querySelector("a");
    var panel = item.querySelector(".dropdown");
    if (!link || !panel || link.parentElement !== item) return;
    link.setAttribute("aria-haspopup", "true");
    link.setAttribute("aria-expanded", "false");
    link.addEventListener("click", function (e) {
      if (item.classList.contains("open")) return; // second click follows the link
      e.preventDefault();
      closeAll(item);
      item.classList.add("open");
      link.setAttribute("aria-expanded", "true");
    });
  });
  document.addEventListener("click", function (e) {
    if (!e.target.closest(".has-dropdown")) closeAll(null);
  });
  window.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeAll(null);
  });
})();

/* ==========================================================================
   STATUS STRIP (2026-08-17): the live first slot + a real pause control.
   - Live slot: the Boscombe wave-buoy sea temperature from /api/bm-sea.php,
     shown ONLY when the feed says ok and the reading is under 3h old, always
     with the time it was MEASURED (the sea page's own doctrine). Otherwise the
     slot stays hidden and the strip is simply the seven static items.
   - Pause: WCAG 2.2.2 wants a control for anything that auto-moves >5s;
     hover-pause is unreachable by touch/keyboard. Remembered per session.
   Desktop only by CSS (the strip is display:none under 768px), so no work is
   done on phones: the fetch is skipped when the strip has no layout box.
   ========================================================================== */
(function () {
  var strip = document.querySelector(".status-ticker");
  if (!strip) return;
  var btn = strip.querySelector("[data-tk-pause]");
  var PKEY = "tt_strip_paused";
  function setPaused(on) {
    strip.classList.toggle("is-paused", !!on);
    if (btn) { btn.setAttribute("aria-pressed", on ? "true" : "false"); btn.setAttribute("aria-label", on ? "Play the scrolling strip" : "Pause the scrolling strip"); }
    try { if (on) sessionStorage.setItem(PKEY, "1"); else sessionStorage.removeItem(PKEY); } catch (e) {}
  }
  if (btn) {
    btn.addEventListener("click", function () { setPaused(!strip.classList.contains("is-paused")); });
    try { if (sessionStorage.getItem(PKEY) === "1") setPaused(true); } catch (e) {}
  }
  // Live slot - only if the strip is actually rendered (desktop) and fetch exists.
  if (!("fetch" in window) || strip.offsetParent === null) return;
  var lives = strip.querySelectorAll("[data-tk-live]");
  if (!lives.length) return;
  function show(text) {
    for (var i = 0; i < lives.length; i++) {
      var t = lives[i].querySelector("[data-tk-live-text]");
      if (t) t.textContent = text;
      lives[i].hidden = false;
    }
  }
  function hhmm(iso) {
    var d = new Date(iso); if (isNaN(d)) return "";
    return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  }
  var run = function () {
    fetch("/api/bm-sea.php", { cache: "no-cache" }).then(function (r) { return r.json(); }).then(function (d) {
      var s = d && d.sea;
      if (!s || !s.ok || typeof s.tempC !== "number" || !s.read_at) return;
      var age = Date.now() - new Date(s.read_at).getTime();
      if (!(age >= 0 && age < 3 * 3600 * 1000)) return;           // stale readings stay off the strip
      var temp = (Math.round(s.tempC * 10) / 10).toFixed(1).replace(/\.0$/, "");
      show("SEA " + temp + "°C · BOSCOMBE BUOY " + hhmm(s.read_at));
    }).catch(function () {});
  };
  if ("requestIdleCallback" in window) requestIdleCallback(run, { timeout: 4000 }); else setTimeout(run, 1200);
})();
