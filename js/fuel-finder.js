/* 365 Techies fuel finder - shared by /fuel-prices/ (whole UK first) and /bournemouth/fuel-prices/ (Bournemouth first).
   Data: /api/bm-fuel.php (see api/bm-fuel-lib.php). Plain ES5 on purpose: many visitors use older phones and tablets.

   PRIVACY (the page promises it): an exact position never leaves the device. The server is asked for prices around a
   point rounded to 0.1 degree (about 10 km); exact distances are worked out here. A postcode is POSTed (never in a URL).

   The root element carries the page's settings:
     data-mode="local" | "uk"   local: start near data-home-*; uk: start with the cheapest in the whole UK
     data-home-lat / -lon / -label, data-radius (miles, or "uk") */
(function () {
  var root = document.getElementById('ff');
  if (!root) return;
  var API = '/api/bm-fuel.php';
  /* The vehicles and the postcode-area names come from the page (fuel_finder_ui.VEHICLES / AREAS, written into
     data-vehicles / data-areas), the same lists the server render reads - one list, never two that drift apart. */
  var FUEL = { E10: 'Unleaded', B7: 'Diesel', E5: 'Super unleaded', SDV: 'Premium diesel' };
  var NATION = { E: 'England', S: 'Scotland', W: 'Wales', N: 'Northern Ireland' };
  var VEH = [], AREA = {};
  try { VEH = JSON.parse(root.getAttribute('data-vehicles')) || []; } catch (e) {}
  try { AREA = JSON.parse(root.getAttribute('data-areas')) || {}; } catch (e) {}
  var RADII = [2, 5, 10, 20, 50, 100];
  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var d = root.dataset;
  root.classList.add('ff-js');
  var HOME = d.homeLat ? { la: +d.homeLat, lo: +d.homeLon, label: d.homeLabel } : null;
  var st = {
    fuel: 'E10',
    r: d.radius === 'uk' ? 'uk' : (+d.radius || 5),
    centre: HOME,                                      // {la, lo, label, acc?, area?, co?} or null on the UK page at first
    meta: null, stats: null, list: [], shown: 15, cut: false, around: null
  };
  st.tank = 'family'; st.own = 60;
  try { var f0 = localStorage.getItem('ff-fuel'); if (FUEL[f0]) st.fuel = f0; } catch (e) {}
  try {
    var k0 = localStorage.getItem('ff-tank'); if (k0 && (k0 === 'own' || VEH.some(function (t) { return t.k === k0; }))) st.tank = k0;
    var o0 = +localStorage.getItem('ff-own'); if (o0 >= 5 && o0 <= 1500) st.own = o0;
  } catch (e) {}
  function tank() {
    if (st.tank === 'own') return { k: 'own', name: 'Your own tank', say: 'your tank', l: st.own, fuel: 'any' };
    for (var i = 0; i < VEH.length; i++) if (VEH[i].k === st.tank) return VEH[i];
    return VEH[2] || { k: 'family', name: 'Family car', say: 'a family car', l: 55, fuel: 'any' };
  }
  // a lorry never gets an unleaded bill, a motorbike never a diesel one
  function fits(v, f) { return v.fuel === 'any' || (v.fuel === 'petrol' ? (f === 'E10' || f === 'E5') : (f === 'B7' || f === 'SDV')); }
  // £1,014.50, not £1014.50 (an HGV tank) - the same as the server render
  // rounded half-up like PHP's number_format (toFixed would make 26.235 -> 26.23 and disagree with the server's 26.24)
  function money(v) { var s = (Math.round((+v + Number.EPSILON) * 100) / 100).toFixed(2), p = s.split('.'); return p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + p[1]; }
  function pounds(pence, litres) { return '&pound;' + money(pence * litres / 100); }

  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function p1(v) { return (+v).toFixed(1); }
  function round1(v) { return Math.round(v * 10) / 10; }
  function miles(a, b, c, e) {
    var R = 3958.8, r = Math.PI / 180, x = Math.sin((c - a) * r / 2), y = Math.sin((e - b) * r / 2);
    var h = x * x + Math.cos(a * r) * Math.cos(c * r) * y * y; return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }
  function median(v) { if (!v.length) return null; var s = v.slice().sort(function (a, b) { return a - b; }), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
  function hm(t) {
    var dt = new Date(t * 1000), n = new Date(), hh = ('0' + dt.getHours()).slice(-2) + ':' + ('0' + dt.getMinutes()).slice(-2);
    if (dt.toDateString() === n.toDateString()) return hh;
    if (dt.toDateString() === new Date(n.getTime() - 864e5).toDateString()) return hh + ' yesterday';
    return hh + ' on ' + dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }
  function areaOf(pc) { var m = /^([A-Z]{1,2})\d/.exec(String(pc || '').toUpperCase()); return m ? m[1] : ''; }
  function nationOf(a) {                             // the same lists as bmfuel_country() on the server
    if (a === 'BT') return 'N';
    if (/^(AB|DD|DG|EH|FK|G|HS|IV|KA|KW|KY|ML|PA|PH|TD|ZE)$/.test(a)) return 'S';
    if (/^(CF|LD|LL|NP|SA)$/.test(a)) return 'W';
    return a ? 'E' : null;
  }
  function areaName(a) { return (AREA[a] || a) + ' (' + a + ')'; }
  function status(t) { $('ff-status').innerHTML = t; }
  function scope() {
    if (st.r === 'uk') return 'in the UK';
    return 'within ' + st.r + ' mile' + (st.r === 1 ? '' : 's') + ' of ' + esc(st.centre.label);
  }
  /* Directions in the app the person drives with (owner, 6 Oct 2026: "automatically detect if it's going to be Google Maps
     or Apple Maps or whatever other people use ... in a car ... Android Auto ... or the Apple one"). A web page can't see
     which apps a phone has, so: an Android phone gets a geo: link, which its own default maps app opens (Google Maps,
     Waze... whatever it is set to, or Android asks); an iPhone opens Apple Maps with driving directions; a computer opens
     Google Maps. "Change" picks Google Maps, Apple Maps or Waze, remembered on the device. A route started on a phone
     that is connected to Android Auto or CarPlay shows on the car's screen by itself - there is no way for a web page to
     send one there directly. Facebook's in-app browser may refuse geo: links, so there it is Google Maps' web link. */
  var NAV = { phone: 'your phone\u2019s maps app', apple: 'Apple Maps', google: 'Google Maps', waze: 'Waze' };
  function navPref() {
    var v = lsGet('ff-nav');
    if (NAV[v] && (v !== 'phone' || (ANDROID && !INAPP))) return v;
    return IOS ? 'apple' : (ANDROID && !INAPP ? 'phone' : 'google');
  }
  function navUrl(s, app) {
    var ll = s.la + ',' + s.lo;
    if (app === 'apple') return 'https://maps.apple.com/?daddr=' + ll + '&dirflg=d';
    if (app === 'waze') return 'https://waze.com/ul?ll=' + ll + '&navigate=yes';
    if (app === 'phone') return 'geo:' + ll + '?q=' + ll + '(' + encodeURIComponent(s.b + (s.n ? ', ' + s.n : '')) + ')';
    return 'https://www.google.com/maps/dir/?api=1&destination=' + ll + '&travelmode=driving' + (IOS || ANDROID ? '&dir_action=navigate' : '');
  }
  function dirUrl(s) { return navUrl(s, navPref()); }
  // a web link opens in a new tab (or the app); geo: is handed straight to the phone
  function dirAttr(s) { var u = dirUrl(s); return 'href="' + esc(u) + '"' + (/^https/.test(u) ? ' target="_blank" rel="noopener"' : '') + ' data-nav'; }
  function cap(t) { return t.charAt(0).toUpperCase() + t.slice(1); }
  /* 6 Oct 2026 phone revamp: each forecourt wears a badge in its brand's colours with its initial (never a logo); any
     other brand gets one of four quiet colours, always the same one for the same name. */
  var BRAND = { asda: ['#5f9e1e', '#fff'], tesco: ['#00539f', '#fff'], sainsburys: ['#f06c00', '#fff'], morrisons: ['#00563f', '#ffd800'],
    costco: ['#e31837', '#fff'], waitrose: ['#5c8d2c', '#fff'], bp: ['#007f00', '#ffe600'], shell: ['#ffd500', '#dd1d21'],
    esso: ['#e2231a', '#fff'], texaco: ['#e30613', '#fff'], jet: ['#ffcc00', '#111'], murco: ['#d4001a', '#fff'], gulf: ['#f58220', '#14294a'],
    applegreen: ['#00a650', '#fff'], valero: ['#004a8f', '#ffc72c'], maxol: ['#e2001a', '#fff'], harvest: ['#2d6a2e', '#fff'], certas: ['#003a70', '#fff'] };
  var QUIET = [['#1f4f6e', '#e8f1f2'], ['#2c4a63', '#e8f1f2'], ['#3a3f6b', '#e8f1f2'], ['#24584f', '#e8f1f2']];
  function badge(b) {
    var k = String(b || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').trim(), c = BRAND[k] || BRAND[k.split(' ')[0]];
    if (!c) { var h = 0; for (var i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) | 0; c = QUIET[Math.abs(h) % 4]; }
    return { c: c, ini: (String(b || '?').replace(/[^A-Za-z0-9]/g, '') || '?').charAt(0).toUpperCase() };
  }
  // "Spur End Service Station, 771 Castle Lane East, Bournemouth" with the station's own name left out
  function shortAddr(s) {
    var n = String(s.n || '').toLowerCase();
    return String(s.a || '').split(', ').filter(function (x) { return x && x.toLowerCase() !== n; }).slice(0, 2).join(', ');
  }
  var SVG = function (p) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>'; };
  var DIR = SVG('<path d="M3 11 21 3l-8 18-2-8-8-2z"/>'), PIN = SVG('<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>');
  var CAR = '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>';
  var VICON = {
    moto: '<circle cx="5" cy="16.5" r="3.2"/><circle cx="19" cy="16.5" r="3.2"/><path d="M5 16.5 9 10h5.5l3.2 3.6"/><path d="M9 10 7.5 7.5H5"/><path d="m14.5 10 1.6-3H19"/><path d="M11 13.5h4"/>',
    small: '<g transform="translate(2.4 2.6) scale(.8)">' + CAR + '</g>',
    family: CAR,
    suv: '<path d="M19 17h2a1 1 0 0 0 1-1v-3.5c0-.8-.5-1.5-1.3-1.8L17 9.5l-2.5-2.9A2 2 0 0 0 13 6H5a2 2 0 0 0-1.8 1.1L2.2 9.4A2 2 0 0 0 2 10.3V16a1 1 0 0 0 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/><path d="M9 6v4"/>',
    van: '<path d="M10 17h4"/><path d="M5 17H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h12l5.6 5.6c.3.3.4.6.4 1V16a1 1 0 0 1-1 1h-1"/><path d="M15 5v5.5h6"/><circle cx="7.5" cy="17" r="2.2"/><circle cx="16.5" cy="17" r="2.2"/>',
    motorhome: '<path d="M10 17h4"/><path d="M5 17H3a1 1 0 0 1-1-1V5a2 2 0 0 1 2-2h11v5h2.2c.3 0 .6.1.8.4l3.2 4.2c.1.2.2.4.2.6V16a1 1 0 0 1-1 1h-1"/><path d="M15 8v4.5h6.5"/><path d="M5.5 7h5v3h-5z"/><circle cx="7.5" cy="17" r="2.2"/><circle cx="16.5" cy="17" r="2.2"/>',
    lorry: '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
    hgv: '<path d="M1.5 16V5.5h12V16"/><path d="M13.5 9H18l3.5 4v3h-1"/><path d="M6.5 16H11"/><circle cx="4.2" cy="17" r="1.9"/><circle cx="8.6" cy="17" r="1.9"/><circle cx="18" cy="17" r="1.9"/>',
    own: '<path d="M3 22h12"/><path d="M4 9h10"/><path d="M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18"/><path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 4 0V9.83a2 2 0 0 0-.59-1.42L18 5"/>'
  };
  var VSHORT = { moto: 'Motorbike', small: 'Small car', family: 'Family car', suv: 'SUV / estate', van: 'Van', motorhome: 'Motorhome', lorry: '7.5t lorry', hgv: 'HGV' };

  /* ---- data ---- */
  /* Every request gives up after 20 s: a reply that never comes (a deploy mid-upload, a dropped phone signal) must end
     in a message, never in "Looking up..." for ever. */
  function getJSON(url, opts) {
    opts = opts || {};
    var ctl = window.AbortController ? new AbortController() : null, timer;
    if (ctl) { opts.signal = ctl.signal; timer = setTimeout(function () { ctl.abort(); }, 20000); }
    return fetch(url, opts).then(function (r) { clearTimeout(timer); return r.json(); }, function (e) { clearTimeout(timer); throw e; });
  }
  var cache = {};
  function get(q) {
    if (!cache[q]) cache[q] = getJSON(API + q).then(function (j) { if (!j || !j.ok) delete cache[q]; return j; },
      function (e) { delete cache[q]; throw e; });
    return cache[q];
  }

  /* ---- animation helpers (all skipped when the device asks for reduced motion) ---- */
  function countUp(el, to) {
    var from = parseFloat(el.getAttribute('data-v')); el.setAttribute('data-v', to);
    var dp = +(el.getAttribute('data-dp') || 1), fmt = function (v) { return dp === 2 ? money(v) : (+v).toFixed(dp); };
    // The real number is always there: animation frames do not run in a background tab, so the count-up is a bonus on
    // top, and a timer puts the final figure in place whatever happens to the frames.
    if (still || document.hidden || !el.offsetParent) { el.textContent = fmt(to); return; }
    if (isNaN(from)) from = Math.max(0, to - (dp === 2 ? to : 12));
    var t0 = null, dur = 700, run = (el._ffRun || 0) + 1; el._ffRun = run;
    function step(t) {
      if (el._ffRun !== run) return;                  // a newer count has started on this element
      if (!t0) t0 = t; var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(from + (to - from) * e);
      if (k < 1) requestAnimationFrame(step);
    }
    el.textContent = fmt(from);
    requestAnimationFrame(step);
    setTimeout(function () { if (el._ffRun === run) el.textContent = fmt(to); }, dur + 150);
  }
  function replay(el) { if (still || !el) return; el.classList.remove('ff-pop'); void el.offsetWidth; el.classList.add('ff-pop'); }

  /* ---- the three tiles ---- */
  function tiles() {
    var L = st.list, fl = FUEL[st.fuel].toLowerCase(), uk = st.stats && st.stats.fuels[st.fuel] ? st.stats.fuels[st.fuel].uk : null;
    var t1 = $('ff-t1'), t2 = $('ff-t2'), t3 = $('ff-t3');
    if (!L.length) { t1.hidden = t2.hidden = t3.hidden = true; return; }
    t1.hidden = t2.hidden = t3.hidden = false; if ($('ff-tskel')) $('ff-tskel').hidden = true;
    var best = L[0];
    t1.querySelector('.ff-tl').innerHTML = 'Cheapest ' + fl + '<small>' + cap(scope()) + '</small>';
    countUp(t1.querySelector('.ff-num b'), best.p);
    t1.querySelector('.ff-ts').innerHTML = '<b>' + esc(best.s.b) + '</b> &middot; ' + esc(shortAddr(best.s)) + (best.d != null ? ' &middot; ' + best.d.toFixed(1) + ' mi' : '');
    navLinks(best.s);
    var med = st.r === 'uk' ? (uk ? uk.med : null) : (st.cut && st.around ? st.around.med : median(L.map(function (x) { return x.p; })));
    t2.querySelector('.ff-tl').innerHTML = st.r === 'uk' ? 'UK average ' + fl : 'Average ' + fl + ' nearby';
    if (med != null) countUp(t2.querySelector('.ff-num b'), med);
    var chip = '';
    if (st.r !== 'uk' && uk && med != null) {
      var dlt = med - uk.med, cls = dlt <= -0.05 ? 'ff-good' : (dlt >= 0.05 ? 'ff-bad' : '');
      chip = '<span class="ff-chip ' + cls + '">' + (Math.abs(dlt) < 0.05 ? 'the same as' : p1(Math.abs(dlt)) + 'p ' + (dlt < 0 ? 'below' : 'above')) + ' the UK average</span>';
    }
    var n = st.r === 'uk' ? (uk ? uk.n : 0) : (st.cut && st.around ? st.around.n : L.length);
    t2.querySelector('.ff-ts').innerHTML = chip + (n ? (chip ? ' ' : '') + '<span class="ff-chip">' + n.toLocaleString('en-GB') + ' forecourt' + (n === 1 ? '' : 's') + '</span>' : '');
    fillTile(best, med);
    [t1, t2, t3].forEach(replay);
    markVeh(false);
  }

  /* The fill-up box: what a full tank costs for the vehicle picked, and what that saves. Whole UK: "save against the UK
     average" would mean driving to Northern Ireland, so it shows the UK-average bill and the range across areas. */
  function fillTile(best, med) {
    var t3 = $('ff-t3'), T = tank(), what = T.say + ' (' + T.l + ' litres)';
    var num = t3.querySelector('.ff-num b'), sub = t3.querySelector('.ff-ts'), tl = t3.querySelector('.ff-tl');
    t3.hidden = false;
    t3.classList.toggle('nofit', !fits(T, st.fuel));  // hides the pound sign beside a dash
    if (!fits(T, st.fuel)) {                          // e.g. an HGV with unleaded picked
      tl.innerHTML = 'Fill ' + what;
      num.textContent = '–'; num.removeAttribute('data-v');
      sub.innerHTML = T.name + ' runs on ' + (T.fuel === 'diesel' ? 'diesel: tap <b>Diesel</b> above' : 'petrol: tap <b>Unleaded</b> above') + ' to see its bill.';
      return;
    }
    if (st.r === 'uk') {
      var F = st.stats && st.stats.fuels[st.fuel], A = F ? F.areas : null, lo = null, hi = null;
      for (var a in (A || {})) { if (!lo || A[a][1] < A[lo][1]) lo = a; if (!hi || A[a][1] > A[hi][1]) hi = a; }
      if (!F) { t3.hidden = true; return; }
      tl.innerHTML = 'Fill ' + what + ' at the UK average price';
      countUp(num, F.uk.med * T.l / 100);
      sub.innerHTML = lo && hi ? 'From <b>' + pounds(A[lo][1], T.l) + '</b> in ' + esc(areaName(lo)) + ' to <b>' + pounds(A[hi][1], T.l) + '</b> in ' + esc(areaName(hi)) + ', going by each area&rsquo;s average.' : '';
    } else {
      var where = st.centre === HOME ? 'near ' + esc(HOME.label) : 'near you';
      tl.innerHTML = 'Fill ' + what + ' at the cheapest';
      countUp(num, best.p * T.l / 100);
      var save = med != null ? (med - best.p) * T.l / 100 : 0;
      sub.innerHTML = save >= 0.005
        ? '<b>&pound;' + save.toFixed(2) + ' less</b> than at the average price ' + where + ' (' + pounds(med, T.l) + ')'
        : 'The same as the average price ' + where + '.';
    }
  }

  /* The vehicle menu in the fill-up box: every vehicle, plus "your own tank size" with a litres box. Remembered. */
  var markVeh = function () {};
  function vehicleMenu() {
    var sel = $('ff-vehicle'), own = $('ff-own'), wrap = $('ff-own-wrap'); if (!sel) return;
    sel.innerHTML = VEH.map(function (v) { return '<option value="' + v.k + '">' + esc(v.name) + ' (about ' + v.l + ' litres)</option>'; }).join('') +
      '<option value="own">Your own tank size&hellip;</option>';
    sel.value = st.tank; own.value = st.own; wrap.hidden = st.tank !== 'own';
    var chips = $('ff-vchips');
    if (chips) chips.innerHTML = VEH.concat([{ k: 'own', name: 'Your tank', l: null }]).map(function (v) {
      return '<button type="button" class="ff-vchip" data-k="' + v.k + '" aria-pressed="' + (st.tank === v.k) + '">' + SVG(VICON[v.k] || VICON.own) +
        '<span>' + esc(VSHORT[v.k] || v.name) + '</span></button>';
    }).join('');
    var mark = function (smooth) {
      if (!chips) return; var on = null;
      [].forEach.call(chips.querySelectorAll('.ff-vchip'), function (b) { var y = b.getAttribute('data-k') === st.tank; b.setAttribute('aria-pressed', y ? 'true' : 'false'); if (y) on = b; });
      if (on && chips.scrollWidth > chips.clientWidth) { var x = on.offsetLeft - (chips.clientWidth - on.offsetWidth) / 2; try { chips.scrollTo({ left: x, behavior: smooth && !still ? 'smooth' : 'auto' }); } catch (er) { chips.scrollLeft = x; } }
    };
    var redraw = function () {
      if (st.list.length) { fillTile(st.list[0], st.r === 'uk' ? null : currentMedian()); renderList(); }
      fillTable();
    };
    var pick = function () {
      st.tank = sel.value; wrap.hidden = st.tank !== 'own'; mark(true);
      try { localStorage.setItem('ff-tank', st.tank); } catch (er) {}
      if (st.tank === 'own') try { own.focus(); } catch (er) {}
      redraw(); replay($('ff-t3'));
    };
    sel.addEventListener('change', pick);
    if (chips) chips.addEventListener('click', function (e) { var b = e.target.closest('.ff-vchip'); if (!b) return; sel.value = b.getAttribute('data-k'); pick(); });
    markVeh = mark;
    own.addEventListener('input', function () {
      var v = Math.round(+own.value); if (!(v >= 5 && v <= 1500)) return;
      st.own = v; try { localStorage.setItem('ff-own', String(v)); } catch (er) {}
      redraw();
    });
  }
  function currentMedian() { return st.cut && st.around ? st.around.med : median(st.list.map(function (x) { return x.p; })); }

  /* "What it costs to fill up": every vehicle at the average unleaded and diesel price for the area on screen (the
     server fills it first, for search engines; this keeps it in step once someone picks an area). */
  var fillSeq = 0;
  function fillTable() {
    var body = $('ff-fill-body'); if (!body) return;
    var my = ++fillSeq;
    var done = function (e10, b7, label) {
      if (my !== fillSeq || e10 == null && b7 == null) return;
      $('ff-fill-sub').innerHTML = 'A full tank from empty at the average price ' + label + ': unleaded <b>' + (e10 != null ? p1(e10) + 'p' : 'not known') +
        '</b>, diesel <b>' + (b7 != null ? p1(b7) + 'p' : 'not known') + '</b> a litre.';
      var rows = VEH.slice(); if (st.tank === 'own') rows.push(tank());
      body.innerHTML = rows.map(function (v) {
        var cell = function (f, p) { return fits(v, f) && p != null ? '<td>' + pounds(p, v.l) + '</td>' : '<td class="ff-na">&ndash;</td>'; };
        return '<tr' + (v.k === st.tank ? ' class="mine"' : '') + '><th scope="row">' + esc(v.name) + '</th><td>' + v.l + '&nbsp;L</td>' +
          cell('E10', e10) + cell('B7', b7) + '</tr>';
      }).join('');
    };
    if (st.r === 'uk' || !st.centre) {
      var S = st.stats && st.stats.fuels;
      if (S) done(S.E10 ? S.E10.uk.med : null, S.B7 ? S.B7.uk.med : null, 'across the UK');
      return;
    }
    var c = st.centre, base = '?near=1&lat=' + round1(c.la) + '&lon=' + round1(c.lo) + '&r=' + st.r + '&f=';
    var med = function (j) {
      if (!j || !j.ok) return null;
      if (j.cut && j.around) return j.around.med;
      return median((j.stations || []).filter(function (s) { return miles(c.la, c.lo, s.la, s.lo) <= st.r; }).map(function (s) { return s.p[j.f]; }));
    };
    Promise.all([get(base + 'E10'), get(base + 'B7')]).then(function (r) { done(med(r[0]), med(r[1]), scope()); }, function () {});
  }

  /* ---- the list ---- */
  function row(x, i) {
    var s = x.s, T = tank(), g = badge(s.b), dif = st.list.length ? x.p - st.list[0].p : 0;
    var bill = fits(T, st.fuel) ? pounds(x.p, T.l) : '', more = i > 0 && dif >= 0.05 ? '<em>+' + p1(dif) + 'p</em>' + (bill ? ' &middot; ' + bill : '') : bill;
    return '<li class="ff-item' + (i === 0 ? ' best' : '') + '" tabindex="0" aria-expanded="false" data-i="' + i + '" style="animation-delay:' + Math.min(i, 14) * 35 + 'ms">' +
      '<span class="ff-logo" style="--c:' + g.c[0] + ';--t:' + g.c[1] + '" aria-hidden="true"><i>' + (i + 1) + '</i>' + esc(g.ini) + '</span>' +
      '<span class="ff-name">' + esc(s.b) + (i === 0 ? '<span class="ff-tagbest">Cheapest</span>' : '') +
      '<small>' + (x.d != null ? '<b>' + x.d.toFixed(1) + ' mi</b> &middot; ' : '') + esc(shortAddr(s)) + '</small></span>' +
      '<span class="ff-price">' + p1(x.p) + 'p' + (more ? '<small>' + more + '</small>' : '') + '</span>' +
      '<div class="ff-x"><div></div></div></li>';
  }
  function detail(x, i) {
    var s = x.s, fu = '';
    ['E10', 'B7', 'E5', 'SDV'].forEach(function (f) {
      if (s.p[f] != null) fu += '<li' + (f === st.fuel ? ' class="on"' : '') + '>' + FUEL[f] + '<b>' + p1(s.p[f]) + 'p</b>' + (s.pt && s.pt[f] ? 'set ' + hm(s.pt[f]) : '') + '</li>';
    });
    return '<div class="ff-xin"><p class="ff-xa">' + (s.n ? esc(s.n) + '<br>' : '') + esc(s.a) + (s.pc ? ', ' + esc(s.pc) : '') + '</p>' +
      '<ul class="ff-fu">' + fu + '</ul>' +
      '<div class="ff-acts"><a class="ff-btn" ' + dirAttr(s) + '>' + DIR + 'Directions</a>' +
      '<button type="button" class="ff-btn ff-btn--ghost" data-map="' + i + '">' + PIN + 'On the map</button></div></div>';
  }
  function toggleRow(li) {
    var open = li.classList.contains('open'), i = +li.getAttribute('data-i');
    [].forEach.call($('ff-list').querySelectorAll('.ff-item.open'), function (o) { if (o !== li) { o.classList.remove('open'); o.setAttribute('aria-expanded', 'false'); } });
    if (!open) { var box = li.querySelector('.ff-x > div'); if (box && !box.innerHTML) box.innerHTML = detail(st.list[i], i); }
    li.classList.toggle('open', !open); li.setAttribute('aria-expanded', open ? 'false' : 'true');
    if (!open && wide()) focus(i, null, true);            // the map is beside the list: fly it there too
  }
  function wide() { return window.innerWidth >= 700; }
  function listHtml() {
    var L = st.list;
    if (!L.length) return '<li class="ff-empty">No forecourts ' + scope() + ' have a ' + FUEL[st.fuel].toLowerCase() + ' price today. Try a bigger distance.</li>';
    var h = L.slice(0, st.shown).map(row).join('');
    if (L.length > st.shown) h += '<li class="ff-more"><button type="button" id="ff-more">Show ' + Math.min(15, L.length - st.shown) + ' more</button></li>';
    return h;
  }
  function renderList() { $('ff-list').innerHTML = listHtml(); }
  function skeleton() {
    var h = ''; for (var i = 0; i < 5; i++) h += '<li class="ff-skel"><i></i><i></i><i></i></li>';
    $('ff-list').innerHTML = h;
  }

  /* ---- the map (our own tiles; Leaflet loads after the page) ---- */
  var map = null, layer = null, me = null, temp = null, markers = [], lastFit = null;
  function ensureMap() {
    if (map) return true;
    if (typeof L === 'undefined' || typeof protomapsL === 'undefined') return false;
    map = L.map('ff-map', { zoomControl: true, preferCanvas: true });
    if (window.makeTouchFriendly) makeTouchFriendly(map);
    protomapsL.leafletLayer({ url: '/vendor/protomaps/uk.pmtiles', flavor: 'dark', maxDataZoom: 10, attribution: '' }).addTo(map);
    protomapsL.leafletLayer({ url: '/vendor/protomaps/southcoast.pmtiles', flavor: 'dark', maxDataZoom: 14, minZoom: 11, bounds: [[50.45, -2.98], [51.15, -0.90]],
      attribution: '<a href="https://protomaps.com" target="_blank" rel="noopener">Protomaps</a> &copy; <a href="https://openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>' }).addTo(map);
    layer = L.layerGroup().addTo(map);
    map.setView([54.5, -3], 5);
    return true;
  }
  function popup(s) {
    var rows = '';
    ['E10', 'E5', 'B7', 'SDV'].forEach(function (f) { if (s.p[f] != null) rows += '<br>' + FUEL[f] + ': <b>' + p1(s.p[f]) + 'p</b>' + (s.pt && s.pt[f] ? ' <small>from ' + hm(s.pt[f]) + '</small>' : ''); });
    var T = tank(), fill = s.p[st.fuel] != null && fits(T, st.fuel) ? '<br>Fill ' + T.say + ' (' + T.l + ' L) with ' + FUEL[st.fuel].toLowerCase() + ': <b>' + pounds(s.p[st.fuel], T.l) + '</b>' : '';
    return '<b>' + esc(s.b) + '</b>' + (s.n ? '<br>' + esc(s.n) : '') + '<br>' + esc(s.a) + (s.pc ? ', ' + esc(s.pc) : '') + rows + fill +
      '<br><a ' + dirAttr(s) + '>Directions</a>';
  }
  function pop(s) { return function () { return popup(s); }; }   // built when opened: always the current vehicle and fuel
  function pin(x, i) {
    return L.marker([x.s.la, x.s.lo], { icon: L.divIcon({ className: 'ff-pin' + (i === 0 ? ' best' : ''), iconSize: null,
      html: '<span style="animation-delay:' + (still ? 0 : Math.min(i, 30) * 25) + 'ms">' + p1(x.p) + '</span>' }),
      zIndexOffset: i === 0 ? 1000 : -i, title: x.s.b + ' ' + p1(x.p) + 'p' }).bindPopup(pop(x.s));
  }
  function drawMap() {
    if (!ensureMap()) return setTimeout(drawMap, 250);
    layer.clearLayers(); markers = [];
    if (temp) { map.removeLayer(temp); temp = null; }
    var L2 = st.list, lo = Infinity, hi = -Infinity;
    L2.forEach(function (x) { lo = Math.min(lo, x.p); hi = Math.max(hi, x.p); });
    var labels = L2.length <= 60 ? L2.length : 10;                    // many forecourts: dots, with price labels on the 10 cheapest
    for (var i = L2.length - 1; i >= 0; i--) {
      var x = L2[i], m;
      if (i < labels) m = pin(x, i);
      else {
        var k = hi > lo ? (x.p - lo) / (hi - lo) : 0;
        m = L.circleMarker([x.s.la, x.s.lo], { radius: 6, weight: 1, color: '#04121a', fillOpacity: .9,
          fillColor: k < .33 ? '#4fd8c4' : (k < .66 ? '#e8c35a' : '#ffb066') }).bindPopup(pop(x.s));
      }
      layer.addLayer(m); markers[i] = m;
    }
    if (me) { map.removeLayer(me); me = null; }
    if (st.centre && st.centre !== HOME && st.centre.la != null) {
      me = L.marker([st.centre.la, st.centre.lo], { icon: L.divIcon({ className: '', html: '<div class="ff-me"></div>', iconSize: [16, 16], iconAnchor: [8, 8] }), interactive: false }).addTo(map);
    }
    var box = null;
    if (st.r !== 'uk' && st.centre) {
      var dLa = st.r / 69, dLo = st.r / (69 * Math.cos(st.centre.la * Math.PI / 180));
      box = [[st.centre.la - dLa, st.centre.lo - dLo], [st.centre.la + dLa, st.centre.lo + dLo]];
    } else if (L2.length) {
      box = L.latLngBounds(L2.map(function (x) { return [x.s.la, x.s.lo]; })).pad(0.08);
    }
    lastFit = box ? function () { map.fitBounds(box, { animate: false }); } : null;
    if (box && $('ff-map').offsetWidth) map.fitBounds(box, { animate: !still });
  }
  function focus(i, s, quiet) {
    if (!ensureMap()) return;
    if (!wide() && $('ff-grid').getAttribute('data-view') !== 'map') {
      setView('map');
      var head = root.querySelector('.ff-listhead'); if (head) head.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' });
    }
    var m = i != null ? markers[i] : null;
    if (!m && s) { if (temp) map.removeLayer(temp); temp = L.marker([s.la, s.lo]).bindPopup(pop(s)).addTo(map); m = temp; }
    if (!m) return;
    // The popup opens when the fly-to lands, or after 1.5 s whatever happens: animation frames do not run in a background
    // tab, so "moveend" may never come.
    var done = false, go = function () { if (done) return; done = true; m.openPopup(); };
    if (still) { map.setView(m.getLatLng(), Math.max(map.getZoom(), 13)); go(); }
    else { map.once('moveend', go); map.flyTo(m.getLatLng(), Math.max(map.getZoom(), 13), { duration: .8 }); setTimeout(go, 1500); }
    if (!quiet && wide() && $('ff-map').getBoundingClientRect().top > window.innerHeight) $('ff-map').scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'center' });
  }

  /* ---- the UK picture: nations, areas, top ten ---- */
  var barsSeen = false;
  function renderUk() {
    var S = st.stats && st.stats.fuels[st.fuel];
    var box = $('ff-uk'); if (!box) return;
    if (!S) { box.hidden = true; return; }
    box.hidden = false;
    var fl = FUEL[st.fuel].toLowerCase();
    $('ff-uk-h').innerHTML = 'The UK picture for ' + fl;
    $('ff-uk-sub').innerHTML = S.uk.n.toLocaleString('en-GB') + ' forecourts reporting a ' + fl + ' price. UK average <b>' + p1(S.uk.med) + 'p</b>' + (S.uk.min != null ? ', cheapest <b>' + p1(S.uk.min) + 'p</b> (prices set in the last two weeks)' : '') + '.';
    // Bars grow left (cheaper) or right (dearer) from the UK average, sized by the pence difference on a scale of at least
    // +/-10p - an axis that does not start at the average would make a 7p gap look three times as big.
    var co = ['E', 'S', 'W', 'N'].filter(function (k) { return S.co[k]; });
    var maxAbs = Math.max(10, Math.max.apply(null, co.map(function (k) { return Math.abs(S.co[k].med - S.uk.med); })));
    var mine = st.centre && st.centre.co;
    $('ff-nations').innerHTML = co.sort(function (a, b) { return S.co[a].med - S.co[b].med; }).map(function (k) {
      var dlt = S.co[k].med - S.uk.med, w = Math.round(Math.abs(dlt) / maxAbs * 50);
      var say = Math.abs(dlt) < 0.05 ? 'the UK average' : p1(Math.abs(dlt)) + 'p ' + (dlt < 0 ? 'below' : 'above') + ' average';
      return '<div class="ff-bar' + (k === mine ? ' mine' : '') + '"><span class="ff-bl">' + NATION[k] + '</span>' +
        '<span class="ff-bt"><i class="' + (dlt < 0 ? 'neg' : 'pos') + '" data-w="' + w + '"></i></span>' +
        '<span class="ff-bv">' + p1(S.co[k].med) + 'p<small>' + say + '</small></span></div>';
    }).join('');
    var ar = []; for (var a in S.areas) ar.push([a, S.areas[a][0], S.areas[a][1], S.areas[a][2]]);
    ar.sort(function (x, y) { return x[2] - y[2]; });
    var li = function (x) { return '<li><span>' + esc(areaName(x[0])) + '</span><b>' + p1(x[2]) + 'p</b></li>'; };
    $('ff-cheap-areas').innerHTML = ar.slice(0, 6).map(li).join('');
    $('ff-dear-areas').innerHTML = ar.slice(-6).reverse().map(li).join('');
    var myA = st.centre && st.centre.area, mineTxt = '';
    if (myA && S.areas[myA]) {
      var rank = 0; for (var j = 0; j < ar.length; j++) if (ar[j][0] === myA) { rank = j + 1; break; }
      mineTxt = 'Your area, <b>' + esc(areaName(myA)) + '</b>: average ' + fl + ' <b>' + p1(S.areas[myA][1]) + 'p</b>, ' +
        (rank <= ar.length / 2 ? 'the ' + ordinal(rank) + ' cheapest' : 'the ' + ordinal(ar.length - rank + 1) + ' dearest') + ' of ' + ar.length + ' postcode areas.';
    }
    $('ff-myarea').innerHTML = mineTxt; $('ff-myarea').hidden = !mineTxt;
    $('ff-top10').innerHTML = S.top.map(function (s, i) {
      return '<li tabindex="0" data-t="' + i + '"><span class="ff-rank">' + (i + 1) + '</span><span class="ff-name">' + esc(s.b) + '<small>' + esc(s.a) + (s.pc ? ', ' + esc(s.pc) : '') + '</small></span>' +
        '<span class="ff-price">' + p1(s.p[st.fuel]) + 'p</span></li>';
    }).join('');
    growBars();
  }
  function ordinal(n) { var s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
  function growBars() {
    var bars = [].slice.call(document.querySelectorAll('#ff-nations i'));
    var set = function () { bars.forEach(function (b) { b.style.width = b.getAttribute('data-w') + '%'; }); };
    if (barsSeen || still || !('IntersectionObserver' in window)) { barsSeen = true; return set(); }
    var io = new IntersectionObserver(function (es) { if (es.some(function (e) { return e.isIntersecting; })) { barsSeen = true; set(); io.disconnect(); } }, { threshold: .3 });
    io.observe($('ff-nations'));
  }

  /* ---- source line + preview banner ---- */
  function sources(m) {
    var t = (m.stale ? 'These prices were last fetched at ' + hm(m.fetched_at) + ' and may be out of date.' : 'Prices last fetched at ' + hm(m.fetched_at) + '.');
    if (m.mode === 'official') t += ' From the government&rsquo;s Fuel Finder service: forecourts must report a price change within 30 minutes. Contains public sector information licensed under the <a href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/" rel="noopener">Open Government Licence v3.0</a>.';
    $('ff-src').innerHTML = t + ' Always check the price on the pump before you fill up.';
    var b = $('ff-banner');
    if (!m.partial) { b.hidden = true; return; }
    var inc = [], miss = [];
    (m.sources || []).forEach(function (s) { if (s.id === 'official') return; if (s.ok && (s.total == null || s.total >= 5)) { if (s.n > 0) inc.push(s.label); } else miss.push(s.label); });
    b.innerHTML = '<b>Preview &mdash; not every forecourt yet.</b> These prices come from the retailers that still publish their own feeds' + (inc.length ? ' (' + esc(inc.join(', ')) + ')' : '') + '. ' +
      (miss.length ? 'Not included: ' + esc(miss.join(', ')) + ', and most independent forecourts. ' : '') + 'So the cheapest here may not be the cheapest near you.';
    b.hidden = false;
  }

  /* ---- one update: whatever changed, fetch what is needed and redraw ---- */
  var seq = 0;
  function update() {
    var my = ++seq, f = st.fuel;
    st.shown = 15;
    skeleton();
    status('Finding the cheapest ' + FUEL[f].toLowerCase() + ' ' + scope() + '&hellip;');
    var q = st.r === 'uk' ? '?top=1&f=' + f
      : '?near=1&lat=' + round1(st.centre.la) + '&lon=' + round1(st.centre.lo) + '&r=' + st.r + '&f=' + f;
    get(q).then(function (j) {
      if (my !== seq) return;
      if (!j || !j.ok) {
        // Prices being collected (a new day's first run): look again every 30 s and fill in by itself.
        var warm = j && j.error === 'warming up';
        status(warm ? 'Today&rsquo;s prices are being collected &mdash; this page will fill in by itself in a minute or two.' : 'Prices are not available just now. Please try again in a few minutes.');
        $('ff-list').innerHTML = '';
        if (warm) setTimeout(function () { if (my === seq) update(); }, 30000);
        return;
      }
      st.meta = j; sources(j);
      if (!st.stats) loadStats();
      var c = st.centre, L2 = (j.stations || []).map(function (s) {
        return { s: s, p: s.p[f], d: c && c.la != null && c !== null ? miles(c.la, c.lo, s.la, s.lo) : null };
      });
      if (st.r !== 'uk') L2 = L2.filter(function (x) { return x.d <= st.r; });   // exact distance from the real position
      L2.sort(function (a, b) { return a.p - b.p || (a.d || 0) - (b.d || 0); });
      st.list = L2; st.cut = !!j.cut; st.around = j.around || null;
      var n = L2.length;
      status('Live prices' + (j.fetched_at ? ', updated ' + hm(j.fetched_at) : '') +
        (st.r === 'uk' ? (c ? ' &middot; distances from ' + esc(c.label) : ' &middot; every UK forecourt') : (c && c.acc ? ' &middot; your location to about ' + c.acc + ' m' : '')));
      var nn = st.cut && st.around ? st.around.n : n;
      $('ff-lh').innerHTML = st.r === 'uk' ? 'Cheapest in the <b>UK</b>' : '<b>' + nn.toLocaleString('en-GB') + '</b> forecourt' + (nn === 1 ? '' : 's') + '<span class="ff-lh2"> &middot; cheapest first</span>';
      renderList(); tiles(); drawMap(); renderUk();
      $('ff-actions').hidden = !st.list.length;
      fillTable();
    }, function () { if (my === seq) { status('Prices could not be loaded. Please check your connection and try again.'); $('ff-list').innerHTML = ''; } });
  }

  /* ---- controls ---- */
  var fuelRow = root.querySelector('.ff-fuels'), pill = root.querySelector('.ff-seg');
  function slide(anim) {
    var b = fuelRow && fuelRow.querySelector('button[aria-pressed="true"]'); if (!b || !pill) return;
    pill.classList.toggle('still', !anim || still);
    pill.style.width = b.offsetWidth + 'px'; pill.style.transform = 'translateX(' + b.offsetLeft + 'px)';
    if (fuelRow.scrollWidth > fuelRow.clientWidth + 2) { var x = b.offsetLeft - (fuelRow.clientWidth - b.offsetWidth) / 2; try { fuelRow.scrollTo({ left: x, behavior: anim && !still ? 'smooth' : 'auto' }); } catch (e) { fuelRow.scrollLeft = x; } }
    setTimeout(edge, anim && !still ? 450 : 0);
  }
  function edge() { if (fuelRow) fuelRow.classList.toggle('more', fuelRow.scrollLeft + fuelRow.clientWidth < fuelRow.scrollWidth - 4); }
  if (fuelRow) fuelRow.addEventListener('scroll', edge);
  function pressFuel(anim) { [].forEach.call(root.querySelectorAll('.ff-fuels button'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-f') === st.fuel ? 'true' : 'false'); }); slide(anim); }
  window.addEventListener('resize', function () { slide(false); edge(); });
  window.addEventListener('load', function () { slide(false); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { slide(false); });
  [].forEach.call(root.querySelectorAll('.ff-fuels button'), function (b) {
    b.addEventListener('click', function () { st.fuel = b.getAttribute('data-f'); try { localStorage.setItem('ff-fuel', st.fuel); } catch (e) {} pressFuel(true); update(); });
  });
  var sel = $('ff-rad');
  sel.innerHTML = RADII.map(function (r) { return '<option value="' + r + '">' + r + ' mile' + (r === 1 ? '' : 's') + '</option>'; }).join('') + '<option value="uk">Whole UK</option>';
  sel.value = String(st.r);
  sel.addEventListener('change', function () {
    if (sel.value !== 'uk' && !st.centre) { sel.value = 'uk'; status('Tap <b>Use my location</b> or type a postcode first, then choose a distance.'); return; }
    st.r = sel.value === 'uk' ? 'uk' : +sel.value; update();
  });
  function setCentre(c) {
    st.centre = c;
    if (st.r === 'uk' && d.mode === 'uk') { st.r = 10; sel.value = '10'; }           // UK page: a location means "near me"
    update();
    if (a2hs) a2hs.searched();                                                       // the home-screen offer, once useful
  }
  var gps = $('ff-gps');
  gps.addEventListener('click', function () {
    if (!navigator.geolocation) { status('This browser cannot share its location. Try a postcode instead.'); return; }
    gps.classList.add('busy'); status('Finding where you are&hellip;');
    navigator.geolocation.getCurrentPosition(function (p) {
      gps.classList.remove('busy');
      setCentre({ la: p.coords.latitude, lo: p.coords.longitude, label: 'you', acc: Math.round(p.coords.accuracy) });
    }, function (err) {
      gps.classList.remove('busy');
      status(err.code === 1 ? 'Location was not allowed. You can type a postcode instead.' : 'Your location could not be found just now. Try a postcode instead.');
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
  });
  $('ff-pcform').addEventListener('submit', function (e) {
    e.preventDefault();
    var v = $('ff-pc').value.trim(); if (!v) return;
    status('Looking up ' + esc(v.toUpperCase()) + '&hellip;');
    getJSON(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pc: v }) })
      .then(function (j) {
        if (!j.ok) { status(j.error === 'format' ? 'That does not look like a postcode. Try one like BH8 8DQ, or just BH8.' : 'We could not find that postcode. Check it, or try just the first part, like BH8.'); return; }
        if (!j.in_area) { status(esc(j.pc) + ' is outside the UK, so there are no prices for it.'); return; }
        var a = areaOf(j.pc);
        setCentre({ la: j.la, lo: j.lo, label: j.pc + (j.district ? ' (the middle of the district)' : ''), area: a, co: nationOf(a) });
      }).catch(function () { status('The postcode lookup did not answer. Please try again in a moment.'); });
  });
  $('ff-list').addEventListener('click', function (e) {
    if (e.target.id === 'ff-more') { st.shown += 15; renderList(); return; }
    if (e.target.closest('a')) return;
    var mb = e.target.closest('[data-map]'); if (mb) { focus(+mb.getAttribute('data-map')); return; }
    var li = e.target.closest('.ff-item'); if (li) toggleRow(li);
  });
  $('ff-list').addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    if (e.target.closest('a,button')) return;
    var li = e.target.closest('.ff-item'); if (li) { e.preventDefault(); toggleRow(li); }
  });
  /* the List / Map switch (phones; a wide screen shows both) */
  function setView(v) {
    var g = $('ff-grid'); if (!g) return;
    g.setAttribute('data-view', v);
    [].forEach.call($('ff-view').querySelectorAll('button'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-v') === v ? 'true' : 'false'); });
    if (v === 'map') { if (ensureMap()) { map.invalidateSize(); if (lastFit) lastFit(); } else setTimeout(function () { if (g.getAttribute('data-view') === 'map') setView('map'); }, 250); }
  }
  $('ff-view').addEventListener('click', function (e) { var b = e.target.closest('button[data-v]'); if (b) setView(b.getAttribute('data-v')); });
  $('ff-t1-map').addEventListener('click', function () { if (st.list.length) focus(0); });
  var top10 = $('ff-top10');
  if (top10) {
    var pick = function (e) { var li = e.target.closest('li[data-t]'); if (!li || !st.stats) return; var s = st.stats.fuels[st.fuel].top[+li.getAttribute('data-t')]; if (s) focus(null, s); };
    top10.addEventListener('click', pick);
    top10.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(e); } });
  }

  /* ---- start ---- */
  /* ---- share + keep it on the home screen (owner, 4 Oct: "share so people can share it ... and add it to their phone
     so they can find it easily"). The same approach as the B365 weather page: the phone's own share sheet where there is
     one, otherwise a panel; Android's install prompt, the iPhone steps, "open in your browser" inside Facebook's in-app
     browser (it cannot add to a home screen), and bookmark/install on a computer. ---- */
  var UA = navigator.userAgent || '';
  var IOS = /iPad|iPhone|iPod/.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var ANDROID = /Android/i.test(UA), INAPP = /FBAN|FBAV|FB_IAB|FBIOS|Instagram|Messenger/i.test(UA);
  var IOS_OTHER = /CriOS|FxiOS|EdgiOS/.test(UA), SAMSUNG = /SamsungBrowser/i.test(UA);
  var COARSE = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  var PHONE = IOS || ANDROID || (window.matchMedia && window.matchMedia('(max-width: 767px)').matches);
  var APP = d.mode === 'uk' ? 'Fuel Prices' : 'B365 Fuel';
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsPut(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function track(name, extra) {
    try { if (typeof window.gtag === 'function' && lsGet('tt_internal') !== '1') window.gtag('event', name, extra || {}); } catch (e) {}
  }
  function enc(s) { return encodeURIComponent(s); }
  // Slides in on the next frames, with a timer as well: frames do not run in a background tab, and a panel left at
  // opacity 0 would be invisible but still in the way.
  // Moved to <body> first: inside the site's <main> (z-index 2) a panel draws UNDER the phone Call/Book/Text bar.
  function openSheet(el) {
    if (el.parentNode !== document.body) document.body.appendChild(el);
    el.hidden = false;
    var on = function () { el.classList.add('on'); };
    requestAnimationFrame(function () { requestAnimationFrame(on); });
    setTimeout(on, 80);
  }
  function closeSheet(el) { el.classList.remove('on'); setTimeout(function () { el.hidden = true; }, still ? 0 : 320); }

  function shareContent() {
    var url = location.origin + location.pathname, x = st.list[0], f = FUEL[st.fuel].toLowerCase(), text;
    if (x) {
      var where = st.r === 'uk' ? 'in the UK' : (st.centre === HOME ? 'near ' + HOME.label.replace(/ town centre$/, '') : 'near me');
      text = 'Cheapest ' + f + ' ' + where + ' right now: ' + p1(x.p) + 'p at ' + x.s.b + (x.s.a ? ', ' + x.s.a.split(', ')[0] : '') +
        '.\nLive prices from every UK forecourt, free, no adverts:';
    } else {
      text = 'Live petrol and diesel prices from every UK forecourt, cheapest first. Free, no adverts:';
    }
    return { title: 'The cheapest petrol and diesel near you', text: text, url: url };
  }
  var SICON = {
    whatsapp: '<i style="background:#25d366;color:#fff"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.4 14.1c-.2.6-1.3 1.2-1.8 1.3-.5.1-1 .1-3.3-.8-2.8-1.1-4.5-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2.1 1-2.4c.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5l.8 1.9c.1.2.1.3 0 .5l-.3.5-.4.5c-.1.1-.3.3-.1.6.2.3.7 1.2 1.6 2 1.1 1 2 1.3 2.3 1.4.3.1.5.1.6-.1l.8-1c.2-.3.4-.2.6-.1l1.8.9c.3.1.4.2.5.3.1.2.1.7-.1 1.3z"/></svg></i>',
    facebook: '<i style="background:#1877f2;color:#fff"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 22v-8h2.7l.4-3.2h-3.1V8.8c0-.9.3-1.5 1.6-1.5h1.7V4.4c-.3 0-1.3-.1-2.5-.1-2.5 0-4.1 1.5-4.1 4.2v2.3H7.5V14h2.7v8h3.3z"/></svg></i>',
    x: '<i style="background:#000;color:#fff;border:1px solid #333"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.8 3h3l-6.6 7.5L22 21h-6.1l-4.8-6.2L5.6 21h-3l7-8L2 3h6.2l4.3 5.7L17.8 3zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5z"/></svg></i>',
    email: '<i style="background:#2a86c4;color:#fff"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg></i>',
    sms: '<i style="background:#7fd8a8;color:#08131e"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16v11H9l-5 4V5z"/></svg></i>',
    copy: '<i style="background:#ffd76a;color:#08131e"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg></i>'
  };
  function sharePanel(c) {
    var sheet = $('ff-share'), grid = $('ff-share-grid'), full = c.text + '\n' + c.url;
    $('ff-share-text').textContent = full;
    $('ff-share-done').textContent = '';
    var links = [
      ['whatsapp', 'WhatsApp', 'https://wa.me/?text=' + enc(full)],
      ['facebook', 'Facebook', 'https://www.facebook.com/sharer/sharer.php?u=' + enc(c.url)],
      ['x', 'X', 'https://twitter.com/intent/tweet?text=' + enc(c.text) + '&url=' + enc(c.url)],
      ['email', 'Email', 'mailto:?subject=' + enc(c.title) + '&body=' + enc(full)]
    ];
    if (IOS || ANDROID) links.push(['sms', 'Text message', 'sms:' + (IOS ? '&' : '?') + 'body=' + enc(full)]);
    grid.innerHTML = links.map(function (l) {
      return '<a href="' + l[2] + '" data-m="' + l[0] + '"' + (/^https/.test(l[2]) ? ' target="_blank" rel="noopener"' : '') + '>' + SICON[l[0]] + l[1] + '</a>';
    }).join('') + '<button type="button" data-copy>' + SICON.copy + 'Copy link</button>';
    [].forEach.call(grid.querySelectorAll('a'), function (a) { a.addEventListener('click', function () { track('fuel_share', { method: a.getAttribute('data-m') }); }); });
    grid.querySelector('[data-copy]').addEventListener('click', function () {
      var done = function () { $('ff-share-done').textContent = 'Link copied'; track('fuel_share', { method: 'copy' }); };
      function fallback() {
        var ta = document.createElement('textarea'); ta.value = c.url; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); done(); } catch (e) { $('ff-share-done').textContent = c.url; }
        ta.parentNode.removeChild(ta);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(c.url).then(done, fallback); else fallback();
    });
    openSheet(sheet);
    var first = grid.querySelector('a'); if (first) try { first.focus({ preventScroll: true }); } catch (e) {}
  }
  root.addEventListener('click', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('[data-ffshare]') : null;
    if (!b) return;
    e.preventDefault();
    var c = shareContent();
    if (navigator.share && (COARSE || IOS || ANDROID)) {
      navigator.share({ title: c.title, text: c.text, url: c.url }).then(function () { track('fuel_share', { method: 'native' }); },
        function (err) { if (err && err.name !== 'AbortError') sharePanel(c); });
      return;
    }
    sharePanel(c);
  });
  $('ff-share-x').addEventListener('click', function () { closeSheet($('ff-share')); });

  var a2hs = (function () {
    var sheet = $('ff-a2hs'), how = $('ff-a2hs-how'), deferred = null, fired = false;
    var standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
    var SH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-label="Share"><path d="M12 3v12"/><path d="m7 8 5-5 5 5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>';
    var PL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8M8 12h8"/></svg>';
    function pills(show) { [].forEach.call(root.querySelectorAll('[data-ffa2hs]'), function (b) { b.hidden = !show; }); }
    function label() {
      var t = PHONE ? 'Add to home screen' : (deferred ? 'Install as an app' : 'Save this page');
      [].forEach.call(root.querySelectorAll('.ff-a2hs-label'), function (s) { s.textContent = t; });
      $('ff-a2hs-add').textContent = PHONE ? 'Add to home screen' : (deferred ? 'Install' : 'Show me how');
    }
    function steps() {
      if (INAPP) return '<b>You&rsquo;re in Facebook&rsquo;s built-in browser</b>, which can&rsquo;t add pages to your home screen. Tap <b>&#8943;</b> at the top right, choose <b>' + (IOS ? 'Open in Safari' : 'Open in browser') + '</b>, then tap <b>Add to home screen</b> again from there.';
      if (IOS && IOS_OTHER) return 'Tap the <b>Share</b> button ' + SH + ' by the address bar, then <b>Add to Home Screen</b>.';
      if (IOS) return '1. Tap the <b>Share</b> button ' + SH + ' in Safari&rsquo;s toolbar.<br>2. Scroll down and tap <b>Add to Home Screen</b> ' + PL + '.<br>3. Tap <b>Add</b>. The ' + APP + ' icon opens straight to this page.';
      if (SAMSUNG) return 'Tap the <b>menu</b> (&#9776;, bottom right), then <b>Add page to</b> &rarr; <b>Home screen</b>.';
      if (ANDROID) return 'Tap the <b>&#8942;</b> menu at the top right and choose <b>Add to home screen</b> (or <b>Install app</b>).';
      return 'Press <b>' + (/Mac/.test(navigator.platform) ? '&#8984;' : 'Ctrl') + ' + D</b> to bookmark this page, or use your browser&rsquo;s menu to <b>install</b> it as an app.';
    }
    function open(auto) {
      if (!auto) { how.innerHTML = steps(); how.hidden = !!deferred; } else how.hidden = true;
      openSheet(sheet);
      track(auto ? 'fuel_a2hs_offer' : 'fuel_a2hs_open');
    }
    function add() {
      track('fuel_a2hs_click');
      if (deferred) {
        var dp = deferred; deferred = null; dp.prompt();
        dp.userChoice.then(function (r) { if (r && r.outcome === 'accepted') { lsPut('ff_a2hs_added', '1'); pills(false); closeSheet(sheet); } label(); });
        return;
      }
      how.innerHTML = steps(); how.hidden = false;
    }
    if (standalone || lsGet('ff_a2hs_added')) { pills(false); if (standalone) track('fuel_opened_from_home_screen'); return { searched: function () {} }; }
    label();
    window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; label(); });
    window.addEventListener('appinstalled', function () { lsPut('ff_a2hs_added', '1'); pills(false); closeSheet(sheet); track('fuel_a2hs_installed'); });
    root.addEventListener('click', function (e) {
      var t = e.target && e.target.closest ? e.target.closest('[data-ffa2hs]') : null;
      if (!t) return;
      e.preventDefault();
      if (deferred) add(); else open(false);
    });
    $('ff-a2hs-add').addEventListener('click', add);
    $('ff-a2hs-no').addEventListener('click', function () { lsPut('ff_a2hs_off', String(Date.now())); closeSheet(sheet); track('fuel_a2hs_dismiss'); });
    $('ff-a2hs-x').addEventListener('click', function () { lsPut('ff_a2hs_off', String(Date.now())); closeSheet(sheet); });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (!sheet.hidden) closeSheet(sheet);
      if (!$('ff-share').hidden) closeSheet($('ff-share'));
      if (!$('ff-navsheet').hidden) closeSheet($('ff-navsheet'));
    });
    /* The offer, phones only, once per visit, after the page has been useful: 6 s after a postcode or location search, or
       45 s on the page (10 s into a return visit). "Not now" keeps it away for 30 days. */
    function invite() {
      if (fired || !PHONE || !sheet.hidden) return;
      var off = +(lsGet('ff_a2hs_off') || 0);
      if (off && Date.now() - off < 30 * 864e5) return;
      try { if (sessionStorage.getItem('ff_a2hs_shown')) return; } catch (e) {}
      if (document.hidden) { document.addEventListener('visibilitychange', function once() { if (!document.hidden) { document.removeEventListener('visibilitychange', once); invite(); } }); return; }
      fired = true;
      try { sessionStorage.setItem('ff_a2hs_shown', '1'); } catch (e) {}
      open(true);
    }
    var visits = (+lsGet('ff_visits') || 0) + 1; lsPut('ff_visits', String(visits));
    if (PHONE) setTimeout(invite, visits >= 2 ? 10000 : 45000);
    return { searched: function () { if (PHONE) setTimeout(invite, 6000); } };
  })();

  /* ---- directions: the price display's link, and "Change" ---- */
  function navLinks(s) {
    var a = $('ff-t1-dir'), u = dirUrl(s);
    a.href = u;
    if (/^https/.test(u)) { a.target = '_blank'; a.rel = 'noopener'; } else a.removeAttribute('target');
    a.setAttribute('data-nav', '');
    [].forEach.call(root.querySelectorAll('.ff-navname'), function (b) { b.textContent = NAV[navPref()]; });
  }
  var NICON = {
    phone: '<i style="background:#7fd8a8;color:#08131e">' + SVG('<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11 18.5h2"/>') + '</i>',
    apple: '<i style="background:#1c8ef9;color:#fff">' + SVG('<path d="M3 11 21 3l-8 18-2-8-8-2z"/>') + '</i>',
    google: '<i style="background:#34a853;color:#fff">' + SVG('<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>') + '</i>',
    waze: '<i style="background:#33ccff;color:#08131e">' + SVG('<circle cx="12" cy="11" r="8"/><circle cx="9.5" cy="10" r=".8" fill="currentColor"/><circle cx="14.5" cy="10" r=".8" fill="currentColor"/><path d="M9.5 13.5c1.3 1 3.7 1 5 0"/>') + '</i>'
  };
  function navSheet() {
    var opts = (ANDROID && !INAPP ? ['phone'] : []).concat(IOS ? ['apple', 'google', 'waze'] : ['google', 'waze', 'apple']), now = navPref();
    $('ff-nav-grid').innerHTML = opts.map(function (k) {
      return '<button type="button" data-app="' + k + '" aria-pressed="' + (k === now) + '">' + NICON[k] + (k === 'phone' ? 'Phone&rsquo;s own' : NAV[k]) + '</button>';
    }).join('');
    openSheet($('ff-navsheet'));
    var b = $('ff-nav-grid').querySelector('[aria-pressed="true"]') || $('ff-nav-grid').querySelector('button'); if (b) try { b.focus({ preventScroll: true }); } catch (e) {}
  }
  $('ff-nav-grid').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-app]'); if (!b) return;
    lsPut('ff-nav', b.getAttribute('data-app')); track('fuel_nav_app', { app: b.getAttribute('data-app') });
    if (st.list.length) navLinks(st.list[0].s);
    [].forEach.call($('ff-list').querySelectorAll('.ff-x > div'), function (x) { x.innerHTML = ''; });   // opened rows rebuild with the new app
    [].forEach.call($('ff-list').querySelectorAll('.ff-item.open'), function (li) { var i = +li.getAttribute('data-i'); li.querySelector('.ff-x > div').innerHTML = detail(st.list[i], i); });
    closeSheet($('ff-navsheet'));
  });
  $('ff-nav-x').addEventListener('click', function () { closeSheet($('ff-navsheet')); });
  root.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target : null; if (!t) return;
    if (t.closest('[data-navchg]')) { e.preventDefault(); navSheet(); return; }
    if (t.closest('a[data-nav]')) track('fuel_directions', { app: navPref() });
  });

  function loadStats() {
    get('?stats=1').then(function (j) { if (j && j.ok) { st.stats = j; if (st.list.length) tiles(); renderUk(); fillTable(); } }, function () {});
  }
  /* ---- are fuel prices going up or down? (owner 4 Oct: "do two and three") ----
     The answer, the records and the last eight weeks are in the HTML (api/bm-fuel-ssr.php). This draws the government's
     weekly UK averages (June 2003 on) and, once there is a week of it, our own day-by-day line from every forecourt, at
     the box's own width so the labels stay readable on a phone. The figures are fetched only when the chart nears the
     screen, and the lines draw themselves in when it is on screen. */
  (function () {
    var box = $('ff-chart'), ranges = $('ff-ranges');
    if (!box || !ranges) return;
    var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var LOCAL = d.mode === 'local', data = null, range = '52', pts = [], geo = null, sel = -1, seen = false, lastW = 0;
    function day(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
    function label(dt, yr) { return dt.getDate() + ' ' + MON[dt.getMonth()] + (yr ? ' ' + dt.getFullYear() : ''); }
    function daily() {
      var i = LOCAL ? 3 : 1;
      return (data.days || []).filter(function (x) { return x[i] != null && x[i + 1] != null; }).map(function (x) { return [x[0], x[i], x[i + 1]]; });
    }
    function series() { return range === 'days' ? daily() : (range === 'all' ? data.weeks : data.weeks.slice(-(+range + 1))); }
    function pp(v) { return (+v).toFixed(range === 'days' ? 1 : 2) + 'p'; }
    function when(p) { return (range === 'days' ? '' : 'Week of ') + label(day(p[0]), true); }
    function summary() {
      var a = pts[0], b = pts[pts.length - 1];
      return (range === 'days' ? 'Average pump prices at every forecourt' + (LOCAL ? ' around Bournemouth' : ' in the UK') + ', day by day, from '
        : 'UK average pump prices, week by week, from the week of ') + label(day(a[0]), true) + ' to ' + label(day(b[0]), true) +
        ': unleaded from ' + pp(a[1]) + ' to ' + pp(b[1]) + ', diesel from ' + pp(a[2]) + ' to ' + pp(b[2]) + '.';
    }
    function nice(lo, hi) {
      var steps = [1, 2, 5, 10, 20, 25, 50], s = 50, t = [];
      for (var k = 0; k < steps.length; k++) if ((hi - lo) / steps[k] <= 6) { s = steps[k]; break; }
      lo = Math.floor(lo / s) * s; hi = Math.ceil(hi / s) * s;
      for (var v = lo; v <= hi + 1e-9; v += s) t.push(v);
      return { lo: lo, hi: hi, t: t };
    }
    function draw(animate) {
      pts = series(); sel = -1;
      var n = pts.length;
      if (n < 2) { box.innerHTML = '<p class="ff-wait">Not enough figures yet.</p>'; return; }
      var W = Math.max(260, box.clientWidth), H = W < 520 ? 240 : 300, L = 42, R = 12, T = 18, B = 26;
      lastW = box.clientWidth;
      var lo = Infinity, hi = -Infinity, top = 0;
      pts.forEach(function (p, i) { lo = Math.min(lo, p[1], p[2]); hi = Math.max(hi, p[1], p[2]); if (Math.max(p[1], p[2]) > Math.max(pts[top][1], pts[top][2])) top = i; });
      var y = nice(lo - .5, hi + .5);
      var X = function (i) { return L + (W - L - R) * i / (n - 1); };
      var Y = function (v) { return T + (H - T - B) * (1 - (v - y.lo) / (y.hi - y.lo)); };
      geo = { X: X, Y: Y, L: L, R: R, W: W, H: H, T: T, B: B, n: n };
      var s = '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(summary()) + '">';
      y.t.forEach(function (v) {
        var yy = Y(v).toFixed(1);
        s += '<line class="gl" x1="' + L + '" x2="' + (W - R) + '" y1="' + yy + '" y2="' + yy + '"/><text x="' + (L - 6) + '" y="' + (+yy + 4) + '" text-anchor="end">' + v + 'p</text>';
      });
      // x labels: each day, each month or each year, thinned to fit the width
      var ticks = [], byYear = range === 'all' || range === '260', last = null;
      for (var i = 0; i < n; i++) {
        var dt = day(pts[i][0]), key = range === 'days' ? i : (byYear ? dt.getFullYear() : dt.getFullYear() * 12 + dt.getMonth());
        if (range === 'days' || (last !== null && key !== last)) ticks.push([i, dt]);
        last = key;
      }
      var every = Math.max(1, Math.ceil(ticks.length / Math.max(2, Math.floor((W - L - R) / (byYear ? 44 : 56)))));
      ticks.forEach(function (t, k) {
        if (k % every) return;
        var m = t[1].getMonth(), txt = byYear ? String(t[1].getFullYear()) : (range === 'days' ? label(t[1]) : MON[m] + (m === 0 ? ' ' + String(t[1].getFullYear()).slice(2) : ''));
        s += '<text x="' + X(t[0]).toFixed(1) + '" y="' + (H - 7) + '" text-anchor="middle">' + txt + '</text>';
      });
      var pu = '', pd = '';
      pts.forEach(function (p, i) { var x = X(i).toFixed(1); pu += (i ? 'L' : 'M') + x + ',' + Y(p[1]).toFixed(1); pd += (i ? 'L' : 'M') + x + ',' + Y(p[2]).toFixed(1); });
      s += '<path class="ld" pathLength="1" d="' + pd + '"/><path class="lu" pathLength="1" d="' + pu + '"/>';
      // the peak of what is on screen, named (on the long views it is the July 2022 record)
      if (range !== 'days' && top > 0 && top < n - 1) {
        var pk = pts[top], tx = Math.max(L + 70, Math.min(W - R - 70, X(top)));
        s += '<text class="rec" x="' + tx.toFixed(1) + '" y="' + Math.max(11, Y(Math.max(pk[1], pk[2])) - 7).toFixed(1) + '" text-anchor="middle">Peak ' +
          pp(Math.max(pk[1], pk[2])) + ', ' + MON[day(pk[0]).getMonth()] + ' ' + day(pk[0]).getFullYear() + '</text>';
      }
      var e = pts[n - 1];
      s += '<circle cx="' + X(n - 1).toFixed(1) + '" cy="' + Y(e[2]).toFixed(1) + '" r="3.5" fill="var(--ff-dusk)"/><circle cx="' + X(n - 1).toFixed(1) + '" cy="' + Y(e[1]).toFixed(1) + '" r="3.5" fill="var(--ff-surf)"/>';
      s += '<g class="hov" visibility="hidden"><line class="cx" y1="' + T + '" y2="' + (H - B) + '"/><circle class="hd" r="4.5" fill="var(--ff-dusk)" stroke="#0e1d2c" stroke-width="2"/>' +
        '<circle class="hu" r="4.5" fill="var(--ff-surf)" stroke="#0e1d2c" stroke-width="2"/></g></svg><div class="ff-tip" hidden></div>';
      box.innerHTML = s;
      box.className = 'ff-chart';
      if (animate && !still) {
        box.classList.add('pre');
        var go = function () { box.classList.add('go'); setTimeout(function () { box.className = 'ff-chart'; }, 1700); };
        if (seen) setTimeout(go, 30); else box.setAttribute('data-wait', '1');
      }
    }
    function show(i) {
      if (!geo || !pts[i]) return;
      sel = i;
      var p = pts[i], x = geo.X(i), g = box.querySelector('.hov'), tip = box.querySelector('.ff-tip');
      g.setAttribute('visibility', 'visible');
      var ln = g.querySelector('line'); ln.setAttribute('x1', x); ln.setAttribute('x2', x);
      g.querySelector('.hu').setAttribute('cx', x); g.querySelector('.hu').setAttribute('cy', geo.Y(p[1]));
      g.querySelector('.hd').setAttribute('cx', x); g.querySelector('.hd').setAttribute('cy', geo.Y(p[2]));
      tip.innerHTML = esc(when(p)) + '<br><span style="color:var(--ff-surf)">Unleaded</span> <b>' + pp(p[1]) + '</b> &nbsp;<span style="color:var(--ff-dusk)">Diesel</span> <b>' + pp(p[2]) + '</b>';
      tip.hidden = false;
      var w = tip.offsetWidth, hi = Math.min(geo.Y(p[1]), geo.Y(p[2]));
      tip.style.left = Math.max(0, Math.min(geo.W - w, x - w / 2)) + 'px';
      // never over the week it describes: high prices sit near the top, so the box drops to the bottom of the chart
      tip.style.top = (hi < geo.T + tip.offsetHeight + 10 ? geo.H - geo.B - tip.offsetHeight - 6 : 0) + 'px';
    }
    function hide() { sel = -1; var g = box.querySelector('.hov'), tip = box.querySelector('.ff-tip'); if (g) g.setAttribute('visibility', 'hidden'); if (tip) tip.hidden = true; }
    function at(cx) { var svg = box.querySelector('svg'); if (!svg || !geo) return -1; var r = svg.getBoundingClientRect(); return Math.max(0, Math.min(geo.n - 1, Math.round((cx - r.left - geo.L) / (geo.W - geo.L - geo.R) * (geo.n - 1)))); }
    box.addEventListener('pointermove', function (e) { var i = at(e.clientX); if (i >= 0) show(i); });
    box.addEventListener('pointerdown', function (e) { var i = at(e.clientX); if (i >= 0) show(i); });
    box.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') hide(); });
    box.addEventListener('keydown', function (e) {
      if (!geo) return;
      var k = e.key, i = sel < 0 ? geo.n - 1 : sel;
      if (k === 'ArrowLeft') i = Math.max(0, i - 1); else if (k === 'ArrowRight') i = Math.min(geo.n - 1, i + 1);
      else if (k === 'Home') i = 0; else if (k === 'End') i = geo.n - 1; else if (k === 'Escape') { hide(); return; } else return;
      e.preventDefault(); show(i);
    });
    ranges.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('button[data-range]') : null;
      if (!b || !data) return;
      range = b.getAttribute('data-range');
      [].forEach.call(ranges.querySelectorAll('button'), function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      draw(true); track('fuel_trend_range', { range: range });
    });
    var rt;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { if (data && box.clientWidth !== lastW) draw(false); }, 200); });
    function load() {
      get('?trend=1').then(function (j) {
        if (!j || !j.ok || !j.weeks || j.weeks.length < 60) { box.innerHTML = '<p class="ff-wait">The chart is not available just now.</p>'; return; }
        data = j;
        if (daily().length >= 7) ranges.querySelector('[data-range="days"]').hidden = false;
        ranges.hidden = false;
        draw(true);
      }, function () { box.innerHTML = '<p class="ff-wait">The chart could not load just now.</p>'; });
    }
    function onScreen() {
      seen = true;
      if (box.getAttribute('data-wait')) { box.removeAttribute('data-wait'); box.classList.add('go'); setTimeout(function () { box.className = 'ff-chart'; }, 1700); }
    }
    if ('IntersectionObserver' in window) {
      var near = new IntersectionObserver(function (es) { if (es.some(function (x) { return x.isIntersecting; })) { near.disconnect(); load(); } }, { rootMargin: '600px 0px' });
      near.observe(box);
      var vis = new IntersectionObserver(function (es) { if (es.some(function (x) { return x.isIntersecting; })) { vis.disconnect(); onScreen(); } }, { threshold: .35 });
      vis.observe(box);
    } else { seen = true; load(); }
  })();

  pressFuel(false);
  vehicleMenu();
  loadStats();
  update();
})();
