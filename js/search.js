/* ==========================================================================
   365 TECHIES — site search (bespoke, client-side, private)
   Lean instant search over a build-time metadata index. Nothing leaves the
   browser. Opens as a command-palette overlay from any [data-search-open]
   trigger, or via "/" and Ctrl/Cmd-K.
   ========================================================================== */
(function () {
  "use strict";

  var INDEX_URL = "/search-index.json?v=8";
  var docs = null;          // loaded index
  var loading = null;       // fetch promise
  var overlay = null;       // DOM
  var input = null, list = null, statusEl = null;
  var results = [];         // current (flattened) result set
  var active = -1;          // keyboard-highlighted index
  var HL_OPEN = String.fromCharCode(1), HL_CLOSE = String.fromCharCode(2);

  /* ---- index loading (lazy: only on first open / idle) ---- */
  function load() {
    if (docs) return Promise.resolve(docs);
    if (loading) return loading;
    loading = fetch(INDEX_URL, { credentials: "omit" })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        docs = (data.pages || []).map(function (p) {
          var hay = (p.t + " " + (p.d || "") + " " + (p.h || "") + " " + p.u.replace(/-/g, " ")).toLowerCase();
          return { u: p.u, t: p.t, c: p.c, d: p.d || "", hay: hay, tl: p.t.toLowerCase() };
        });
        return docs;
      })
      .catch(function () { docs = []; return docs; });
    return loading;
  }

  /* ---- scoring (AND semantics: every token must appear somewhere) ---- */
  function scoreDoc(d, tokens) {
    var score = 0, i, tok, idx;
    for (i = 0; i < tokens.length; i++) {
      tok = tokens[i];
      if (d.tl === tok) { score += 220; continue; }
      idx = d.tl.indexOf(tok);
      if (idx === 0) { score += 90; continue; }
      if (idx > 0) { score += (d.tl.charAt(idx - 1) === " ") ? 60 : 34; continue; }
      var h = d.hay.indexOf(tok);
      if (h === -1) return -1;
      score += (h === 0 || d.hay.charAt(h - 1) === " ") ? 14 : 7;
    }
    score += Math.max(0, 24 - d.t.length / 3);            // prefer shorter/specific titles
    if (d.c === "Free tools" || d.c === "Outlook help") score += 6;
    return score;
  }

  function search(q) {
    if (!docs) return [];
    var tokens = q.trim().toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    if (!tokens.length) return [];
    var out = [], i, s;
    for (i = 0; i < docs.length; i++) {
      s = scoreDoc(docs[i], tokens);
      if (s >= 0) out.push({ d: docs[i], s: s });
    }
    out.sort(function (a, b) { return b.s - a.s || a.d.t.length - b.d.t.length; });
    return out.slice(0, 24).map(function (x) { return x.d; });
  }

  /* ---- rendering ---- */
  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function highlight(text, tokens) {
    var out = text;
    tokens.forEach(function (tok) {
      if (tok.length < 2) return;
      var re = new RegExp("(" + tok.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "ig");
      out = out.replace(re, HL_OPEN + "$1" + HL_CLOSE);
    });
    return esc(out).split(HL_OPEN).join("<mark>").split(HL_CLOSE).join("</mark>");
  }

  function render(q) {
    var tokens = q.trim().toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    active = -1;
    if (!q.trim()) {
      list.innerHTML = "";
      statusEl.textContent = "Type to search " + (docs ? docs.length : "400+") + " pages, tools and guides…";
      results = [];
      return;
    }
    if (!docs) {
      list.innerHTML = "";
      statusEl.textContent = "Loading search…";
      results = [];
      return;
    }
    var found = search(q);
    if (!found.length) {
      list.innerHTML = '<li class="ss-empty" role="presentation">' +
        "<p>No matches for <strong>" + esc(q) + "</strong>.</p>" +
        '<p class="ss-empty__hint">Try fewer or different words — or we’ll find it for you: ' +
        '<a href="tel:+441202775566">call 01202 775566</a> or <a href="sms:+447520615332">text us</a>.</p></li>';
      statusEl.textContent = "No results";
      results = [];
      return;
    }
    var groups = {}, order = [];
    found.forEach(function (d) { if (!groups[d.c]) { groups[d.c] = []; order.push(d.c); } groups[d.c].push(d); });
    var html = "", flat = [];
    order.forEach(function (cat) {
      html += '<li class="ss-group" role="presentation">' + esc(cat) + "</li>";
      groups[cat].forEach(function (d) {
        var idx = flat.length;
        flat.push(d);
        html += '<li class="ss-item" role="option" id="ss-opt-' + idx + '" aria-selected="false" data-i="' + idx + '">' +
          '<span class="ss-item__t">' + highlight(d.t, tokens) + "</span>" +
          (d.d ? '<span class="ss-item__d">' + highlight(d.d, tokens) + "</span>" : "") +
          '<span class="ss-item__go" aria-hidden="true">→</span></li>';
      });
    });
    results = flat;
    list.innerHTML = html;
    statusEl.textContent = results.length + (results.length === 1 ? " result" : " results");
    setActive(0);
  }

  function setActive(i) {
    var items = list.querySelectorAll(".ss-item");
    if (!items.length) return;
    if (i < 0) i = items.length - 1;
    if (i >= items.length) i = 0;
    items.forEach(function (el) { el.setAttribute("aria-selected", "false"); el.classList.remove("is-active"); });
    var el = items[i];
    el.setAttribute("aria-selected", "true");
    el.classList.add("is-active");
    el.scrollIntoView({ block: "nearest" });
    active = i;
    input.setAttribute("aria-activedescendant", "ss-opt-" + i);
  }

  function go(i) {
    var d = results[i != null ? i : active];
    if (!d) return;
    window.location.href = "/" + d.u + (d.u ? "/" : "");
  }

  /* ---- overlay build (once, lazily) ---- */
  function build() {
    if (overlay) return;
    overlay = document.createElement("div");
    overlay.className = "site-search";
    overlay.id = "site-search";
    overlay.setAttribute("hidden", "");
    overlay.innerHTML =
      '<div class="ss-backdrop" data-search-close></div>' +
      '<div class="ss-panel" role="dialog" aria-modal="true" aria-label="Search this website">' +
        '<div class="ss-inputwrap">' +
          '<svg class="ss-mag" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>' +
          '<input type="search" class="ss-input" role="combobox" aria-label="Search this website" aria-expanded="false" aria-controls="ss-list" aria-autocomplete="list" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Search pages, tools, Outlook fixes, your town…" />' +
          '<button type="button" class="ss-close" data-search-close aria-label="Close search"><kbd>Esc</kbd></button>' +
        '</div>' +
        '<ul class="ss-list" id="ss-list" role="listbox" aria-label="Search results"></ul>' +
        '<p class="ss-status" id="ss-status" role="status" aria-live="polite"></p>' +
        '<div class="ss-foot"><span><kbd>↑</kbd><kbd>↓</kbd> navigate</span><span><kbd>↵</kbd> open</span><span><kbd>Esc</kbd> close</span><span class="ss-foot__brand">365 Techies</span></div>' +
      '</div>';
    document.body.appendChild(overlay);
    input = overlay.querySelector(".ss-input");
    list = overlay.querySelector(".ss-list");
    statusEl = overlay.querySelector(".ss-status");

    var t;
    input.addEventListener("input", function () {
      var q = input.value;
      clearTimeout(t);
      t = setTimeout(function () { render(q); }, 55);
    });
    input.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") { e.preventDefault(); setActive(active + 1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setActive(active - 1); }
      else if (e.key === "Enter") { e.preventDefault(); go(); }
      else if (e.key === "Home" && results.length) { e.preventDefault(); setActive(0); }
      else if (e.key === "End" && results.length) { e.preventDefault(); setActive(results.length - 1); }
    });
    list.addEventListener("click", function (e) {
      var li = e.target.closest(".ss-item");
      if (li) go(parseInt(li.getAttribute("data-i"), 10));
    });
    list.addEventListener("mousemove", function (e) {
      var li = e.target.closest(".ss-item");
      if (li) { var i = parseInt(li.getAttribute("data-i"), 10); if (i !== active) setActive(i); }
    });
    overlay.addEventListener("click", function (e) {
      if (e.target.closest("[data-search-close]")) close();
    });
  }

  function open(prefill) {
    build();
    overlay.removeAttribute("hidden");
    input.setAttribute("aria-expanded", "true");
    document.documentElement.classList.add("ss-open");
    if (typeof prefill === "string" && prefill) input.value = prefill;
    render(input.value);
    load().then(function () { if (!overlay.hasAttribute("hidden")) render(input.value); });
    requestAnimationFrame(function () { input.focus(); input.select(); });
  }

  function close() {
    if (!overlay || overlay.hasAttribute("hidden")) return;
    overlay.setAttribute("hidden", "");
    if (input) input.setAttribute("aria-expanded", "false");
    document.documentElement.classList.remove("ss-open");
    var t = document.querySelector("[data-search-open]");
    if (t && typeof t.focus === "function") { try { t.focus(); } catch (e) {} }
  }

  /* ---- triggers + global shortcuts ---- */
  document.addEventListener("click", function (e) {
    var trg = e.target.closest("[data-search-open]");
    if (trg) { e.preventDefault(); open(trg.getAttribute("data-search-prefill") || ""); }
  });
  document.addEventListener("keydown", function (e) {
    var openNow = overlay && !overlay.hasAttribute("hidden");
    if (openNow && e.key === "Escape") { e.preventDefault(); close(); return; }
    if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) { e.preventDefault(); openNow ? close() : open(); return; }
    if (e.key === "/" && !openNow) {
      var el = document.activeElement, tag = el && el.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (el && el.isContentEditable)) return;
      e.preventDefault(); open();
    }
  });

  // warm the index during idle so the first search is instant
  if ("requestIdleCallback" in window) requestIdleCallback(load, { timeout: 6000 });
  else window.addEventListener("load", function () { setTimeout(load, 2500); });

  window.TTSearch = { open: open, close: close };
})();
