/* 365 Techies — contact forms -> HubSpot Forms API.
 * Intercepts every <form class="contact-form"> and posts the enquiry straight to
 * HubSpot (creates/updates a contact + records a submission). portalId + formGuid
 * are NOT secrets (they appear in any HubSpot embed code). No token, no server.
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
  function attach(form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var status = form.querySelector(".form-status");
      var btn = form.querySelector('button[type="submit"]') || form.querySelector("button");
      var label = btn ? btn.textContent : "";
      var email = val(form, "email");
      if (!email) {
        if (status) { status.style.color = "#e06a4a"; status.textContent = "Please add your email so we can reply."; }
        return;
      }
      var nm = splitName(val(form, "name"));
      var topic = val(form, "topic");
      var message = val(form, "message");
      if (topic) message = message ? ("[" + topic + "] " + message) : ("Enquiry: " + topic);

      var fields = [];
      var add = function (n, v) { if (v) fields.push({ name: n, value: String(v) }); };
      add("email", email);
      add("firstname", nm.f);
      add("lastname", nm.l);
      add("phone", val(form, "phone"));
      add("company", val(form, "company"));
      add("message", message);

      var body = { fields: fields, context: { pageUri: location.href, pageName: document.title } };
      if (btn) { btn.disabled = true; btn.textContent = "Sending…"; }
      if (status) { status.style.color = "var(--muted)"; status.textContent = "// Sending…"; }

      fetch("https://" + HOST + "/submissions/v3/integration/submit/" + PORTAL + "/" + GUID, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, d: d }; });
      }).then(function (res) {
        if (btn) { btn.disabled = false; btn.textContent = label; }
        if (res.ok) {
          if (status) { status.style.color = "#39d353"; status.textContent = "✓ Thanks — your message is in. We’ll reply within one working day."; }
          form.reset();
        } else if (status) {
          status.style.color = "#e06a4a"; status.innerHTML = FAIL;
        }
      }).catch(function () {
        if (btn) { btn.disabled = false; btn.textContent = label; }
        if (status) { status.style.color = "#e06a4a"; status.innerHTML = FAIL; }
      });
    });
  }
  function init() {
    document.querySelectorAll("form.contact-form").forEach(function (f) {
      f.setAttribute("data-hs-do-not-collect", "true"); // stop HubSpot's tracking script double-collecting / hijacking the form
      attach(f);
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
}());
