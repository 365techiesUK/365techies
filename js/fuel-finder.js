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
  function dirUrl(s) { return 'https://www.google.com/maps/dir/?api=1&destination=' + s.la + ',' + s.lo; }

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
    t1.hidden = t2.hidden = t3.hidden = false;
    var best = L[0];
    t1.querySelector('.ff-tl').innerHTML = 'Cheapest ' + fl + ' ' + scope();
    countUp(t1.querySelector('.ff-num b'), best.p);
    t1.querySelector('.ff-ts').innerHTML = esc(best.s.b) + ', ' + esc(best.s.a) + (best.d != null ? ' &middot; ' + best.d.toFixed(1) + ' miles' : '');
    var med = st.r === 'uk' ? (uk ? uk.med : null) : (st.cut && st.around ? st.around.med : median(L.map(function (x) { return x.p; })));
    t2.querySelector('.ff-tl').innerHTML = st.r === 'uk' ? 'UK average ' + fl : 'Average ' + fl + ' ' + scope();
    if (med != null) countUp(t2.querySelector('.ff-num b'), med);
    var chip = '';
    if (st.r !== 'uk' && uk && med != null) {
      var dlt = med - uk.med, cls = dlt <= -0.05 ? 'ff-good' : (dlt >= 0.05 ? 'ff-bad' : '');
      chip = '<span class="ff-chip ' + cls + '">' + (Math.abs(dlt) < 0.05 ? 'the same as' : p1(Math.abs(dlt)) + 'p ' + (dlt < 0 ? 'below' : 'above')) + ' the UK average</span>';
    } else if (uk) {
      chip = '<span class="ff-chip">' + uk.n.toLocaleString('en-GB') + ' forecourts reporting</span>';
    }
    t2.querySelector('.ff-ts').innerHTML = chip;
    fillTile(best, med);
    [t1, t2, t3].forEach(replay);
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
  function vehicleMenu() {
    var sel = $('ff-vehicle'), own = $('ff-own'), wrap = $('ff-own-wrap'); if (!sel) return;
    sel.innerHTML = VEH.map(function (v) { return '<option value="' + v.k + '">' + esc(v.name) + ' (about ' + v.l + ' litres)</option>'; }).join('') +
      '<option value="own">Your own tank size&hellip;</option>';
    sel.value = st.tank; own.value = st.own; wrap.hidden = st.tank !== 'own';
    var redraw = function () {
      if (st.list.length) { fillTile(st.list[0], st.r === 'uk' ? null : currentMedian()); renderList(); }
      fillTable();
    };
    sel.addEventListener('change', function () {
      st.tank = sel.value; wrap.hidden = st.tank !== 'own';
      try { localStorage.setItem('ff-tank', st.tank); } catch (er) {}
      if (st.tank === 'own') try { own.focus(); } catch (er) {}
      redraw();
    });
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
    var s = x.s, t = s.pt && s.pt[st.fuel] ? ' &middot; price from ' + hm(s.pt[st.fuel]) : '';
    return '<li class="ff-item' + (i === 0 ? ' best' : '') + '" tabindex="0" data-i="' + i + '" style="animation-delay:' + Math.min(i, 14) * 35 + 'ms">' +
      '<span class="ff-rank">' + (i + 1) + '</span><span class="ff-name">' + esc(s.b) + (s.n ? '<small>' + esc(s.n) + '</small>' : '') + '</span>' +
      '<span class="ff-price">' + p1(x.p) + 'p' + (fits(tank(), st.fuel) ? '<small>' + pounds(x.p, tank().l) + ' a tank</small>' : '') + '</span>' +
      '<span class="ff-addr">' + esc(s.a) + (s.pc ? ', ' + esc(s.pc) : '') + t + '</span>' +
      '<span class="ff-meta">' + (x.d != null ? x.d.toFixed(1) + ' mi' : '') + '</span>' +
      '<span class="ff-dir"><a href="' + dirUrl(s) + '" target="_blank" rel="noopener">Directions</a></span></li>';
  }
  function listHtml() {
    var L = st.list;
    if (!L.length) return '<li class="ff-empty">No forecourts ' + scope() + ' have a ' + FUEL[st.fuel].toLowerCase() + ' price today. Try a bigger distance.</li>';
    var h = L.slice(0, st.shown).map(row).join('');
    if (L.length > st.shown) h += '<li class="ff-more"><button type="button" id="ff-more">Show ' + Math.min(15, L.length - st.shown) + ' more</button></li>';
    return h;
  }
  function renderList() { $('ff-list').innerHTML = listHtml(); }
  function skeleton() {
    var h = ''; for (var i = 0; i < 5; i++) h += '<li class="ff-skel"><i></i><i></i></li>';
    $('ff-list').innerHTML = h;
  }

  /* ---- the map (our own tiles; Leaflet loads after the page) ---- */
  var map = null, layer = null, me = null, temp = null, markers = [];
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
      '<br><a href="' + dirUrl(s) + '" target="_blank" rel="noopener">Directions</a>';
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
    if (st.r !== 'uk' && st.centre) {
      var dLa = st.r / 69, dLo = st.r / (69 * Math.cos(st.centre.la * Math.PI / 180));
      map.fitBounds([[st.centre.la - dLa, st.centre.lo - dLo], [st.centre.la + dLa, st.centre.lo + dLo]], { animate: !still });
    } else if (L2.length) {
      map.fitBounds(L.latLngBounds(L2.map(function (x) { return [x.s.la, x.s.lo]; })).pad(0.08), { animate: !still });
    }
  }
  function focus(i, s) {
    if (!ensureMap()) return;
    var m = i != null ? markers[i] : null;
    if (!m && s) { if (temp) map.removeLayer(temp); temp = L.marker([s.la, s.lo]).bindPopup(pop(s)).addTo(map); m = temp; }
    if (!m) return;
    // The popup opens when the fly-to lands, or after 1.5 s whatever happens: animation frames do not run in a background
    // tab, so "moveend" may never come.
    var done = false, go = function () { if (done) return; done = true; m.openPopup(); };
    if (still) { map.setView(m.getLatLng(), Math.max(map.getZoom(), 13)); go(); }
    else { map.once('moveend', go); map.flyTo(m.getLatLng(), Math.max(map.getZoom(), 13), { duration: .8 }); setTimeout(go, 1500); }
    if (window.innerWidth <= 860) $('ff-map').scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'center' });
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
    $('ff-uk-sub').innerHTML = S.uk.n.toLocaleString('en-GB') + ' forecourts reporting a ' + fl + ' price. UK average <b>' + p1(S.uk.med) + 'p</b>, cheapest <b>' + p1(S.uk.min) + 'p</b>.';
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
      status(st.r === 'uk'
        ? 'The cheapest ' + FUEL[f].toLowerCase() + ' in the whole UK' + (c ? ', with distances from ' + esc(c.label) : '') + '.'
        : 'Cheapest ' + FUEL[f].toLowerCase() + ' ' + scope() + (c && c.acc ? ' (accurate to about ' + c.acc + ' m)' : '') + ': ' +
          (st.cut && st.around ? 'about ' + st.around.n.toLocaleString('en-GB') + ' forecourts, cheapest first.' : n + ' forecourt' + (n === 1 ? '' : 's') + '.'));
      renderList(); tiles(); drawMap(); renderUk();
      $('ff-actions').hidden = !st.list.length;
      fillTable();
    }, function () { if (my === seq) { status('Prices could not be loaded. Please check your connection and try again.'); $('ff-list').innerHTML = ''; } });
  }

  /* ---- controls ---- */
  function pressFuel() { [].forEach.call(root.querySelectorAll('.ff-fuels button'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-f') === st.fuel ? 'true' : 'false'); }); }
  [].forEach.call(root.querySelectorAll('.ff-fuels button'), function (b) {
    b.addEventListener('click', function () { st.fuel = b.getAttribute('data-f'); try { localStorage.setItem('ff-fuel', st.fuel); } catch (e) {} pressFuel(); update(); });
  });
  var sel = $('ff-rad');
  sel.innerHTML = RADII.map(function (r) { return '<option value="' + r + '">within ' + r + ' mile' + (r === 1 ? '' : 's') + '</option>'; }).join('') + '<option value="uk">the whole UK</option>';
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
    var li = e.target.closest('.ff-item'); if (li) focus(+li.getAttribute('data-i'));
  });
  $('ff-list').addEventListener('keydown', function (e) { if (e.key !== 'Enter' && e.key !== ' ') return; var li = e.target.closest('.ff-item'); if (li) { e.preventDefault(); focus(+li.getAttribute('data-i')); } });
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
  function openSheet(el) {
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

  function loadStats() {
    get('?stats=1').then(function (j) { if (j && j.ok) { st.stats = j; if (st.list.length) tiles(); renderUk(); fillTable(); } }, function () {});
  }
  pressFuel();
  vehicleMenu();
  loadStats();
  update();
})();
