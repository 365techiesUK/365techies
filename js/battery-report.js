/* Laptop battery health checker (19 Oct 2026). Reads the battery-report.html that Windows' own `powercfg /batteryreport`
   saves and turns it into plain English: health (full charge capacity / design capacity), charge cycles, how fast the
   battery is wearing (Battery capacity history) and how long it runs now against when new (Battery life estimates).
   The file is read HERE, in the browser (FileReader + DOMParser): nothing is uploaded, nothing about the battery is sent.
   Built against 60 real reports (Windows 10 and 11, HP, Dell, Lenovo, ASUS, MSI, Microsoft Surface, Acer, Huawei):
   the report's labels are English everywhere, but numbers follow the PC's region ("45,600", "32.560", "60 000"), so a
   capacity is read as its digits. Dates in the report are always YYYY-MM-DD. There is no official "pass mark" for battery
   health, so the words describe the wear and the running time; they never call a battery good or bad by a standard. */
(function () {
  'use strict';
  var root = document.getElementById('check');
  if (!root || !window.DOMParser || !window.FileReader) return;
  var $ = function (s) { return root.querySelector(s); };
  var out = $('.brc-out'), input = $('#brc-file'), drop = $('.brc-drop');
  root.classList.add('brc--js');

  // ---------------------------------------------------------------- reading the report
  var txt = function (el) { return el ? (el.textContent || '').replace(/\s+/g, ' ').trim() : ''; };
  var num = function (s) { var d = String(s || '').replace(/[^\d]/g, ''); return d ? parseInt(d, 10) : null; };
  var iso = function (s) { var m = /(\d{4})-(\d{2})-(\d{2})/.exec(s || ''); return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null; };
  var hms = function (s) { var m = /(\d+):(\d{2}):(\d{2})/.exec(s || ''); return m ? (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]) : null; };

  function sectionTables(doc, heading) {   // the tables between an <h2> with this text and the next <h2>
    var all = doc.querySelectorAll('h2, table, .nobatts'), on = false, got = [], none = false;
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (el.tagName === 'H2') { if (on) break; on = txt(el).toLowerCase() === heading; continue; }
      if (!on) continue;
      if (el.classList && el.classList.contains('nobatts')) none = true; else got.push(el);
    }
    return { tables: got, none: none, found: on || got.length > 0 || none };
  }

  function bodyRows(table) {
    var rows = [], trs = table.querySelectorAll('tr');
    for (var i = 0; i < trs.length; i++) if (!(trs[i].parentNode && trs[i].parentNode.tagName === 'THEAD')) rows.push(trs[i]);
    return rows;
  }

  function parse(text) {
    var doc = new DOMParser().parseFromString(text, 'text/html');
    var r = { batteries: [], history: [], life: null, product: '', reportDate: null };
    var inst = sectionTables(doc, 'installed batteries');
    if (!inst.found) return { error: 'notreport' };
    if (inst.none) { r.none = true; return r; }
    var t = inst.tables[0];
    if (!t) return { error: 'notreport' };
    var rows = bodyRows(t), cols = 0, data = {};
    rows.forEach(function (tr) {
      var tds = tr.querySelectorAll('td'); if (tds.length < 2) return;
      var lab = txt(tr.querySelector('.label') || tds[0]).toUpperCase();
      data[lab] = [];
      for (var c = 1; c < tds.length; c++) data[lab].push(txt(tds[c]));
      cols = Math.max(cols, tds.length - 1);
    });
    for (var c = 0; c < cols; c++) {
      var g = function (k) { return (data[k] || [])[c] || ''; };
      var b = { name: g('NAME'), maker: g('MANUFACTURER'), chem: g('CHEMISTRY'), design: num(g('DESIGN CAPACITY')),
                full: num(g('FULL CHARGE CAPACITY')), cycles: num(g('CYCLE COUNT')) };
      if (b.design || b.full) r.batteries.push(b);
    }
    if (!r.batteries.length) return { error: 'nonumbers' };
    // the report's own header table: the laptop's model and when the report was made (never its computer name)
    var labs = doc.querySelectorAll('td.label');
    for (var i = 0; i < labs.length; i++) {
      var k = txt(labs[i]).toUpperCase(), v = labs[i].nextElementSibling;
      if (k === 'SYSTEM PRODUCT NAME') r.product = txt(v).replace(/^(\S+)\s+\1\b/i, '$1');   // Windows often repeats the maker: "HP HP ProBook"
      if (k === 'REPORT TIME') r.reportDate = iso(txt(v));
    }
    // Battery capacity history: one row per period, "2024-01-01 - 2024-01-08" or one date
    var hist = sectionTables(doc, 'battery capacity history').tables[0];
    if (hist) bodyRows(hist).forEach(function (tr) {
      var tds = tr.querySelectorAll('td'); if (tds.length < 3) return;
      var when = txt(tds[0]), d = iso(when), full = num(txt(tds[1])), design = num(txt(tds[2]));
      if (d && full && design) r.history.push({ d: d, full: full, design: design, pct: 100 * full / design });
    });
    r.history.sort(function (a, b) { return a.d - b.d; });
    // Battery life estimates: the "Since OS install" row, active use at full charge and at design capacity
    var lt = sectionTables(doc, 'battery life estimates').tables;
    for (var j = lt.length - 1; j >= 0 && !r.life; j--) {
      bodyRows(lt[j]).forEach(function (tr) {
        if (r.life || !/since os install/i.test(txt(tr))) return;
        var cells = [].filter.call(tr.querySelectorAll('td'), function (td) { return !td.classList.contains('colBreak'); });
        var now = hms(txt(cells[1])), was = hms(txt(cells[3]));
        if (now && was) r.life = { now: now, was: was };
      });
    }
    return r;
  }

  // ---------------------------------------------------------------- words
  var en = function (n) { return Math.round(n).toLocaleString('en-GB'); };
  var dur = function (s) { var h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60); if (m === 60) { h++; m = 0; } return (h ? h + ' h ' : '') + m + ' min'; };
  var day = function (d) { return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  function chemistry(c) {   // the report's own codes, as seen in 60 real reports: LION, LIon, Li-I, LIO, LiON / LiP
    if (/^li-?(on|o|i|ion)?$/i.test(c)) return 'Lithium-ion';
    if (/^li-?p(o|oly|olymer)?$/i.test(c)) return 'Lithium polymer';
    return c;
  }

  function band(p) {
    if (p >= 95) return ['Like new', 'ok'];
    if (p >= 80) return ['Normal wear', 'ok'];
    if (p >= 60) return ['Noticeably worn', 'warn'];
    if (p >= 40) return ['Badly worn', 'bad'];
    return ['Worn out', 'bad'];
  }

  function ring(p, tone) {
    var C = 2 * Math.PI * 52, k = Math.max(0, Math.min(100, p)) / 100;
    return '<svg class="brc-ring" viewBox="0 0 120 120" role="img" aria-label="Battery health ' + Math.round(p) + '%">' +
      '<circle cx="60" cy="60" r="52" class="brc-ring__bg"/>' +
      '<circle cx="60" cy="60" r="52" class="brc-ring__fg brc-' + tone + '" stroke-dasharray="' + (C * k).toFixed(1) + ' ' + C.toFixed(1) + '" transform="rotate(-90 60 60)"/>' +
      '<text x="60" y="62" class="brc-ring__n">' + (p > 100 ? '100' : Math.round(p)) + '%</text><text x="60" y="82" class="brc-ring__s">health</text></svg>';
  }

  function trend(h) {   // the full charge capacity as a % of new, over the report's history (a month or more of it)
    if (h.length < 2 || (h[h.length - 1].d - h[0].d) / 864e5 < 30) return '';
    var t0 = +h[0].d, t1 = +h[h.length - 1].d, span = Math.max(1, t1 - t0);
    var top = Math.max(105, Math.ceil(Math.max.apply(null, h.map(function (x) { return x.pct; })) / 5) * 5);
    var W = 600, H = 170, L = 44, R = 12, T = 12, B = 30;
    var X = function (d) { return L + (W - L - R) * ((+d - t0) / span); }, Y = function (p) { return T + (H - T - B) * (1 - Math.max(0, p) / top); };
    var pts = h.map(function (x) { return X(x.d).toFixed(1) + ',' + Y(x.pct).toFixed(1); }).join(' ');
    var grid = [0, 50, 100].map(function (g) { return '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(g) + '" y2="' + Y(g) + '" class="brc-g' + (g === 100 ? ' brc-g--new' : '') + '"/>' +
      '<text x="' + (L - 6) + '" y="' + (Y(g) + 4) + '" class="brc-ax" text-anchor="end">' + g + '%</text>'; }).join('');
    return '<figure class="brc-trend"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Full charge capacity as a share of new, from ' +
      day(h[0].d) + ' (' + Math.round(h[0].pct) + '%) to ' + day(h[h.length - 1].d) + ' (' + Math.round(h[h.length - 1].pct) + '%)">' + grid +
      '<text x="' + (W - R) + '" y="' + (Y(100) - 6) + '" class="brc-ax" text-anchor="end">when new</text>' +
      '<polyline points="' + pts + '" class="brc-line"/>' +
      '<text x="' + L + '" y="' + (H - 8) + '" class="brc-ax">' + day(h[0].d) + '</text>' +
      '<text x="' + (W - R) + '" y="' + (H - 8) + '" class="brc-ax" text-anchor="end">' + day(h[h.length - 1].d) + '</text></svg>' +
      '<figcaption>How much it held on a full charge, as a share of new, from the report&rsquo;s own history.</figcaption></figure>';
  }

  function render(r, how) {
    var b = r.batteries, design = 0, full = 0;
    b.forEach(function (x) { design += x.design || 0; full += x.full || 0; });
    var p = design ? 100 * full / design : 0, pr = Math.round(Math.min(p, 100)), bd = band(pr);   // the words follow the % shown (79.6 shows as 80%)
    var notes = [], h = r.history;
    var flat = h.length > 1 && h.every(function (x) { return Math.abs(x.pct - 100) < 0.2; });
    var lines = [];
    lines.push('<p class="brc-lead">It holds <strong>' + pr + '%</strong> of the charge it held when new, so on a full charge it runs for about <strong>' +
      (pr >= 99 ? 'as long as' : pr + '% as long as') + '</strong> it did new.' + (p > 100.5 ? ' It reads a little above its design capacity, which is common on a newer or recently calibrated battery: count it as 100%.' : '') + '</p>');
    if (p < 60) lines.push('<p>If it no longer gets you through what you need it for, a new battery is worth it. If the laptop also switches itself off with charge still showing, see <a href="/laptop-shuts-down-at-30-percent-battery/">laptop shuts down at 30%</a>.</p>');
    if (r.life && r.life.was > 0) lines.push('<p><strong>From how you use it:</strong> Windows works out about <strong>' + dur(r.life.now) + '</strong> of use on a full charge now, against about ' + dur(r.life.was) + ' when the battery was new (its own estimate since Windows was installed).</p>');
    if (h.length > 1 && !flat) {
      // from the start of the history to TODAY's figure (the one in the ring), so the sentence and the ring agree
      var days = ((r.reportDate || h[h.length - 1].d) - h[0].d) / 864e5;
      var avg = function (xs) { return xs.reduce(function (s, x) { return s + x.pct; }, 0) / xs.length; };
      var a = avg(h.slice(0, Math.min(3, h.length))), z = Math.min(p, 100);
      if (days >= 90 && a - z > 0.5) lines.push('<p><strong>How fast it&rsquo;s wearing:</strong> down from about ' + Math.round(a) + '% in ' + h[0].d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }) +
        ' to ' + Math.round(z) + '% now, roughly <strong>' + Math.max(1, Math.round((a - z) / (days / 365.25))) + '% a year</strong>. Heat and sitting at 100% all day wear it fastest.</p>');
    }
    if (flat && Math.abs(p - 100) < 0.2) notes.push('This laptop reports the same figure for its full charge as for when it was new, all through the report&rsquo;s history. Some laptops do that, so the report can&rsquo;t show the wear here: your laptop maker&rsquo;s own battery check can (see below).');
    if (r.reportDate && (Date.now() - r.reportDate) / 864e5 > 31) notes.push('This report was made on ' + day(r.reportDate) + '. Make a fresh one for today&rsquo;s figures.');
    var facts = [['Design capacity', en(design) + ' mWh', 'what it held new'], ['Full charge capacity', en(full) + ' mWh', 'what it holds now']];
    var cyc = b.map(function (x) { return x.cycles; }).filter(function (x) { return x !== null && x !== undefined; });
    facts.push(['Charge cycles', cyc.length ? en(cyc.reduce(function (s, x) { return s + x; }, 0)) : 'Not reported', cyc.length ? 'full charges so far' : 'this laptop leaves it blank']);
    if (b.length === 1 && b[0].chem && b[0].chem !== '-') facts.push(['Battery type', esc(chemistry(b[0].chem)), (b[0].maker && b[0].maker !== '-' ? 'made by ' + esc(b[0].maker) : 'as the battery reports it')]);
    var per = b.length > 1 ? '<p class="brc-small">' + b.length + ' batteries: ' + b.map(function (x, i) {
      return 'battery ' + (i + 1) + ' at ' + (x.design ? Math.round(Math.min(100, 100 * x.full / x.design)) : '?') + '%';
    }).join(', ') + '. The figure above is for them together.</p>' : '';
    out.innerHTML =
      '<div class="brc-res brc-res--' + bd[1] + '">' +
        '<div class="brc-res__top">' + ring(p, bd[1]) +
          '<div><p class="mono brc-eyebrow">' + (how === 'manual' ? 'FROM THE NUMBERS YOU TYPED' : 'YOUR BATTERY REPORT' + (r.product ? ' &middot; ' + esc(r.product).toUpperCase() : '')) + '</p>' +
          '<h3 class="brc-head">' + bd[0] + '</h3>' + lines.join('') + per + '</div></div>' +
        '<dl class="brc-facts">' + facts.map(function (f) { return '<div><dt>' + f[0] + '</dt><dd>' + f[1] + '</dd><dd class="brc-small">' + f[2] + '</dd></div>'; }).join('') + '</dl>' +
        (flat ? '' : trend(h)) +
        (notes.length ? notes.map(function (n) { return '<p class="brc-note">' + n + '</p>'; }).join('') : '') +
        '<p class="brc-app">Want this without typing a command? Our free <a href="#battery-app">365 PC Manager app</a> shows the battery&rsquo;s health and charge cycles on its This PC page.</p>' +
        '<p class="brc-again"><button type="button" class="button secondary brc-reset">Check another report</button></p>' +
      '</div>';
    out.hidden = false;
    out.querySelector('.brc-reset').addEventListener('click', reset);
    try { out.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) { out.scrollIntoView(); }
    try { if (typeof window.gtag === 'function') window.gtag('event', 'battery_report_read', { how: how }); } catch (e) { /* analytics never matters */ }
  }

  function say(msg) {
    out.innerHTML = '<div class="brc-res brc-res--msg"><p>' + msg + '</p><p class="brc-again"><button type="button" class="button secondary brc-reset">Try again</button></p></div>';
    out.hidden = false;
    out.querySelector('.brc-reset').addEventListener('click', reset);
  }

  var MSG = {
    notreport: 'That file doesn&rsquo;t look like Windows&rsquo; battery report. It&rsquo;s the one called <strong>battery-report.html</strong> that <strong>powercfg /batteryreport</strong> saves (step 1 above): Windows tells you where it saved it.',
    nonumbers: 'That&rsquo;s a battery report, but it doesn&rsquo;t include the battery&rsquo;s capacity. Some laptops don&rsquo;t report it: your laptop maker&rsquo;s own battery check may show it (see below).',
    none: 'This report says <strong>no battery is installed</strong>: it was made on a desktop PC, or with the battery taken out. Make the report on the laptop itself.',
    big: 'That file is too big to be a battery report. It&rsquo;s the one called <strong>battery-report.html</strong>, usually under a megabyte.',
    read: 'We couldn&rsquo;t read that file. Try choosing it again, or open it and type the two numbers below.'
  };

  function readFile(f) {
    if (!f) return;
    if (f.size > 15 * 1024 * 1024) return say(MSG.big);
    var fr = new FileReader();
    fr.onload = function () {
      var r;
      try { r = parse(String(fr.result || '')); } catch (e) { r = { error: 'read' }; }
      if (r.error) return say(MSG[r.error]);
      if (r.none) return say(MSG.none);
      render(r, 'file');
    };
    fr.onerror = function () { say(MSG.read); };
    fr.readAsText(f);
  }

  function reset() { out.hidden = true; out.innerHTML = ''; if (input) input.value = ''; try { drop.focus(); } catch (e) { /* fine */ } }

  // ---------------------------------------------------------------- the two ways in: the file, or the two numbers
  if (input) input.addEventListener('change', function () { readFile(input.files && input.files[0]); });
  var hasFiles = function (e) { var t = e.dataTransfer && e.dataTransfer.types; return t && [].indexOf.call(t, 'Files') >= 0; };
  window.addEventListener('dragover', function (e) { if (hasFiles(e)) { e.preventDefault(); drop.classList.add('is-over'); } });
  window.addEventListener('dragleave', function (e) { if (!e.relatedTarget) drop.classList.remove('is-over'); });
  window.addEventListener('drop', function (e) {   // dropped anywhere on the page: read it (rather than the browser leaving the page to open it)
    if (!hasFiles(e)) return;
    e.preventDefault(); drop.classList.remove('is-over');
    readFile(e.dataTransfer.files[0]);
  });
  drop.addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ' ') && input) { e.preventDefault(); input.click(); } });

  var form = $('.brc-manual form');
  if (form) form.addEventListener('submit', function (e) {
    e.preventDefault();
    var d = num($('#brc-design').value), f = num($('#brc-full').value);
    if (!d || !f) return say('Type both numbers from the report: the <strong>design capacity</strong> and the <strong>full charge capacity</strong>, in mWh.');
    if (f > d * 1.5 || d > 500000) return say('Those numbers don&rsquo;t look right: check you have the design capacity and the full charge capacity the right way round, in mWh.');
    render({ batteries: [{ design: d, full: f, cycles: null }], history: [], life: null }, 'manual');
  });

  window.__brcParse = parse;   // for our own checks (tools/playwright-check/battery-report-check.mjs)
})();
