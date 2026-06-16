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
          span.textContent = m[0];
          var tip = document.createElement("span");
          tip.className = "jtip"; tip.setAttribute("role", "tooltip");
          tip.textContent = TERMS[term];
          span.appendChild(tip);
          after.parentNode.replaceChild(span, after);
          break; // one term wrap per text node
        }
      }
    }
  }
})();
