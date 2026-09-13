/* 365 Techies — contact forms -> HubSpot Forms API + Slack.
 * Intercepts every <form class="contact-form"> and posts the enquiry straight to
 * HubSpot (creates/updates a contact + records a submission). portalId + formGuid
 * are NOT secrets (they appear in any HubSpot embed code).
 * Also fires a copy to /api/slack-lead.php (server-side relay; webhook stays on the
 * server) so new leads ping the team's Slack instantly. Fire-and-forget: Slack being
 * down never affects the visitor or the HubSpot submission.
 * Mirrors the AI OS field mapping so it hits the same form/list.
 */
(function () {
  var PORTAL = "148562638";
  var GUID = "7563b461-a18e-4193-9938-b505d05fcbad";
  var HOST = "api-eu1.hsforms.com"; // EU portal
  var FAIL = 'Sorry, that didn’t send — please email <a href="mailto:help@365techies.co.uk" style="color:var(--cyan)">help@365techies.co.uk</a> or call 01202 775566.';

  function splitName(full) {
    var p = String(full || "").trim().split(/\s+/).filter(Boolean);
    if (!p.length) return { f: "", l: "" };
    if (p.length === 1) return { f: p[0], l: "" };
    return { f: p[0], l: p.slice(1).join(" ") };
  }
  function val(form, name) {
    var el = form.querySelector('[name="' + name + '"]');
    return el ? String(el.value || "").trim() : "";
  }
  /* 13 Sep 2026 (UX audit item 6): inline messages under the field instead of the browser's vanishing
     bubble. The form keeps its required attributes (semantics, no-JS fallback); with this script running
     it goes novalidate and we say, next to the field, what is missing and keep the message until it is
     fixed. The first problem field takes focus. */
  function fieldWrap(el) { return (el.closest && el.closest(".field")) || el.parentElement; }
  function fieldLabel(el) {
    var w = fieldWrap(el); var s = w && w.querySelector("span");
    return s ? String(s.textContent || "").replace(/\s*\(optional\)/i, "").trim() : "";
  }
  function showErr(el, msg) {
    var w = fieldWrap(el); if (!w) return;
    var m = w.querySelector(".field__msg");
    if (!m) { m = document.createElement("small"); m.className = "field__msg"; m.setAttribute("role", "alert"); w.appendChild(m); }
    m.textContent = msg; w.classList.add("field--error"); el.setAttribute("aria-invalid", "true");
  }
  function clearErr(el) {
    var w = fieldWrap(el); if (!w) return;
    var m = w.querySelector(".field__msg"); if (m) m.remove();
    w.classList.remove("field--error"); el.removeAttribute("aria-invalid");
  }
  function messageFor(el) {
    var name = String(el.name || "").toLowerCase(); var lab = fieldLabel(el).toLowerCase();
    if (name === "name") return "Please add your name.";
    if (name === "email" || el.type === "email") return "Please add your email so we can reply.";
    if (name === "message" || el.tagName === "TEXTAREA") return "Please tell us how we can help.";
    return lab ? "Please fill in " + lab + "." : "Please fill in this field.";
  }
  function validate(form) {
    var problems = [];
    var req = form.querySelectorAll("[required]");
    for (var i = 0; i < req.length; i++) {
      var el = req[i];
      if (el.type === "checkbox" ? !el.checked : !String(el.value || "").trim()) problems.push([el, messageFor(el)]);
    }
    var em = form.querySelector('[name="email"]');
    if (em && String(em.value || "").trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(em.value).trim())) problems.push([em, "That email doesn’t look right — please check it."]);
    return problems;
  }
  function attach(form) {
    try { form.setAttribute("novalidate", ""); } catch (nv) {}
    form.addEventListener("input", function (ev) { if (ev.target && ev.target.name) clearErr(ev.target); });
    form.addEventListener("change", function (ev) { if (ev.target && ev.target.name) clearErr(ev.target); });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var status = form.querySelector(".form-status");
      var btn = form.querySelector('button[type="submit"]') || form.querySelector("button");
      var label = btn ? btn.textContent : "";
      if (val(form, "company_website")) return; // honeypot: silently drop bots
      var problems = validate(form);
      if (problems.length) {
        for (var pi = 0; pi < problems.length; pi++) showErr(problems[pi][0], problems[pi][1]);
        if (status) { status.style.color = "#e06a4a"; status.textContent = problems.length === 1 ? "One thing to check above." : problems.length + " things to check above."; }
        try { problems[0][0].focus({ preventScroll: false }); } catch (fe) {}
        return;
      }
      var email = val(form, "email");
      var nm = splitName(val(form, "name"));
      var topic = val(form, "topic");
      var message = val(form, "message");
      if (topic) message = message ? ("[" + topic + "] " + message) : ("Enquiry: " + topic);

      /* capture EVERY other field (country, dashboard use-case, device, dates…) so
         bespoke forms lose nothing — appended to the message for HubSpot + Slack */
      var extras = [];
      try {
        new FormData(form).forEach(function (v, k) {
          if (["name", "email", "phone", "company", "topic", "message", "company_website"].indexOf(k) !== -1) return;
          var s = String(v || "").trim();
          if (s) extras.push(k + ": " + s);
        });
      } catch (fderr) {}
      /* belt-and-braces: the machine field is the reserve funnel's key datum — never lose it */
      if (!extras.length) { var mach = val(form, "machine"); if (mach) extras.push("machine: " + mach); }
      if (extras.length) message = (message ? message + "\n\n" : "") + extras.join("\n");

      /* funnel attribution (from a11y.js): where this person originally came from and
         which free tools they used before enquiring. First-party data, attached only
         at the moment they choose to contact us. */
      var attribution = "";
      var fn = null;
      try {
        fn = window.ttFunnel && window.ttFunnel();
        if (fn) {
          var bits = [];
          var t1 = fn.attr && fn.attr.first;
          if (t1) {
            var srcBits = [t1.src, t1.med, t1.cam].filter(Boolean).join(" / ");
            bits.push("first seen: " + (t1.d || "?") + " via " +
              (srcBits || (t1.ref ? "referral" : "direct/search")) +
              (t1.ref ? " (" + t1.ref + ")" : "") + ", landed on " + (t1.land || "?"));
          }
          var t2 = fn.attr && fn.attr.last;
          if (t2 && t1 && (t2.src !== t1.src || t2.cam !== t1.cam || t2.ref !== t1.ref || t2.d !== t1.d)) {
            var src2 = [t2.src, t2.med, t2.cam].filter(Boolean).join(" / ");
            bits.push("latest visit: " + (t2.d || "?") + " via " + (src2 || "referral") +
              (t2.ref ? " (" + t2.ref + ")" : ""));
          }
          if (fn.tools && fn.tools.length) bits.push("free tools used: " + fn.tools.join(", "));
          if (bits.length) attribution = "\n\n— journey —\n" + bits.join("\n");
          if (fn.internal) message = "[INTERNAL TEST] " + message;
        }
      } catch (aerr) {}
      if (attribution) message += attribution;

      var fields = [];
      var add = function (n, v) { if (v) fields.push({ name: n, value: String(v) }); };
      add("email", email);
      add("firstname", nm.f);
      add("lastname", nm.l);
      add("phone", val(form, "phone"));
      add("company", val(form, "company"));
      add("message", message);

      /* The Slack relay is the record the team actually reads, so since 13 Sep 2026 (funnel audit
         item 3) its answer is what makes the enquiry a success: HubSpot accepted a labelled test
         submission with 200 yet no contact appeared in the portal, so HubSpot is best-effort now.
         The ping fires once per enquiry: a retry after a failure does not re-ping (or burn the
         relay's rate limit) and remembers whether the first ping got through. */
      var slackP = Promise.resolve(form.dataset.slackOk === "1");
      if (!form.dataset.slackSent) try {
        form.dataset.slackSent = "1";
        /* 13 Sep 2026 (funnel audit item 6): count the enquiry the moment it is sent, alongside the Slack
           ping. generate_lead further down only fires when HubSpot answers OK, which the audit could not
           confirm it does. A form may name its own event with data-ga-event (the Dell picker: dell_reserve,
           with the machine label); every other contact-form is enquiry_sent. Internal visits excluded as
           everywhere else on the site. */
        try {
          if (typeof window.gtag === "function" && !(fn && fn.internal) && localStorage.getItem("tt_internal") !== "1") {
            var evName = form.getAttribute("data-ga-event") || "enquiry_sent";
            var evParams = { form_page: location.pathname, form_topic: topic || "(none)" };
            if (val(form, "machine")) evParams.machine = val(form, "machine").slice(0, 90);
            window.gtag("event", evName, evParams);
          }
        } catch (gerr0) {}
        slackP = fetch("/api/slack-lead.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: val(form, "name"), email: email, phone: val(form, "phone"),
            company: val(form, "company"), topic: topic,
            message: ((fn && fn.internal ? "[INTERNAL TEST] " : "") + val(form, "message")
              + (extras.length ? "\n" + extras.join("\n") : "") + attribution).trim(),
            page: location.href
          })
        }).then(function (r) { return r.json().catch(function () { return {}; }); })
          .then(function (d) { var ok = !!(d && d.ok); if (ok) form.dataset.slackOk = "1"; return ok; })
          .catch(function () { return false; });
      } catch (err) {}

      var body = { fields: fields, context: { pageUri: location.href, pageName: document.title } };
      if (btn) { btn.disabled = true; btn.textContent = "Sending…"; }
      if (status) { status.style.color = "var(--muted)"; status.textContent = "// Sending…"; }

      var hsP = fetch("https://" + HOST + "/submissions/v3/integration/submit/" + PORTAL + "/" + GUID, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      }).then(function (r) { return !!r.ok; }).catch(function () { return false; });

      /* success = the relay OR HubSpot took it; failure only when both did */
      Promise.all([slackP, hsP]).then(function (oks) {
        var res = { ok: !!(oks[0] || oks[1]), slack: !!oks[0], hs: !!oks[1] };
        if (btn) { btn.disabled = false; btn.textContent = label; }
        if (res.ok && !res.hs) { try { console.warn("365: HubSpot did not accept the enquiry; the team has it via Slack"); } catch (e2) {} }
        if (res.ok) {
          if (status) { status.style.color = "#39d353"; status.textContent = form.getAttribute("data-success") || "✓ Thanks — your message is in. We’ll reply within one working day."; }
          try {
            if (typeof window.gtag === "function" && !(fn && fn.internal)) {
              var t1g = fn && fn.attr && fn.attr.first;
              window.gtag("event", "generate_lead", {
                form_page: location.pathname, form_topic: topic || "(none)",
                first_source: (t1g && (t1g.src || (t1g.ref ? "referral" : "direct"))) || "unknown",
                tools_used: (fn && fn.tools && fn.tools.length) || 0
              });
            }
          } catch (gerr) {}
          form.reset();
          delete form.dataset.slackSent;
          delete form.dataset.slackOk;
        } else {
          if (status) { status.style.color = "#e06a4a"; status.innerHTML = FAIL; }
          delete form.dataset.slackSent;   /* both legs failed: a retry may ping again */
        }
      });
    });
  }
  function init() {
    document.querySelectorAll("form.contact-form").forEach(function (f) {
      f.setAttribute("data-hs-do-not-collect", "true"); // stop HubSpot's tracking script double-collecting / hijacking the form
      attach(f);
    });
    /* ?topic=free-business-it-review etc. preselects the enquiry topic, so CTAs
       like "Get a Free IT Review" land on a form already set to the right thing */
    try {
      var t = new URLSearchParams(location.search).get("topic");
      if (t) {
        var want = t.replace(/[-+_]+/g, " ").trim().toLowerCase(); /* URLSearchParams already decoded */
        document.querySelectorAll('form.contact-form select[name="topic"]').forEach(function (sel) {
          for (var i = 0; i < sel.options.length; i++) {
            var txt = sel.options[i].textContent.replace(/\s+/g, " ").trim().toLowerCase();
            if (txt === want || txt.indexOf(want) !== -1 || want.indexOf(txt) !== -1) { sel.selectedIndex = i; break; }
          }
        });
      }
    } catch (perr) {}
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
}());
