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
  /* Owner, 4 Oct: "different tank sizes ... a car might be 55 litres ... a van more like 80 litres ... really simple so
     people can see roughly how much it'll cost them to fill up and how much they're saving". Typical tanks: a small
     hatchback 40-45 L, a family hatchback 50-55 L, an SUV or big estate 60-70 L, a Transit or Crafter 75-80 L. */
  var TANKS = [
    { k: 'small', name: 'Small car', l: 40 },
    { k: 'family', name: 'Family car', l: 55 },
    { k: 'suv', name: 'SUV / estate', l: 70 },
    { k: 'van', name: 'Van', l: 80 }
  ];
  var FUEL = { E10: 'Unleaded', B7: 'Diesel', E5: 'Super unleaded', SDV: 'Premium diesel' };
  var NATION = { E: 'England', S: 'Scotland', W: 'Wales', N: 'Northern Ireland' };
  var AREA = { AB: 'Aberdeen', AL: 'St Albans', B: 'Birmingham', BA: 'Bath', BB: 'Blackburn', BD: 'Bradford', BH: 'Bournemouth',
    BL: 'Bolton', BN: 'Brighton', BR: 'Bromley', BS: 'Bristol', BT: 'Belfast', CA: 'Carlisle', CB: 'Cambridge', CF: 'Cardiff',
    CH: 'Chester', CM: 'Chelmsford', CO: 'Colchester', CR: 'Croydon', CT: 'Canterbury', CV: 'Coventry', CW: 'Crewe', DA: 'Dartford',
    DD: 'Dundee', DE: 'Derby', DG: 'Dumfries', DH: 'Durham', DL: 'Darlington', DN: 'Doncaster', DT: 'Dorchester', DY: 'Dudley',
    E: 'East London', EC: 'Central London', EH: 'Edinburgh', EN: 'Enfield', EX: 'Exeter', FK: 'Falkirk', FY: 'Blackpool',
    G: 'Glasgow', GL: 'Gloucester', GU: 'Guildford', HA: 'Harrow', HD: 'Huddersfield', HG: 'Harrogate', HP: 'Hemel Hempstead',
    HR: 'Hereford', HS: 'Outer Hebrides', HU: 'Hull', HX: 'Halifax', IG: 'Ilford', IP: 'Ipswich', IV: 'Inverness', KA: 'Kilmarnock',
    KT: 'Kingston upon Thames', KW: 'Kirkwall', KY: 'Kirkcaldy', L: 'Liverpool', LA: 'Lancaster', LD: 'Llandrindod Wells',
    LE: 'Leicester', LL: 'Llandudno', LN: 'Lincoln', LS: 'Leeds', LU: 'Luton', M: 'Manchester', ME: 'Medway', MK: 'Milton Keynes',
    ML: 'Motherwell', N: 'North London', NE: 'Newcastle', NG: 'Nottingham', NN: 'Northampton', NP: 'Newport', NR: 'Norwich',
    NW: 'North West London', OL: 'Oldham', OX: 'Oxford', PA: 'Paisley', PE: 'Peterborough', PH: 'Perth', PL: 'Plymouth',
    PO: 'Portsmouth', PR: 'Preston', RG: 'Reading', RH: 'Redhill', RM: 'Romford', S: 'Sheffield', SA: 'Swansea',
    SE: 'South East London', SG: 'Stevenage', SK: 'Stockport', SL: 'Slough', SM: 'Sutton', SN: 'Swindon', SO: 'Southampton',
    SP: 'Salisbury', SR: 'Sunderland', SS: 'Southend', ST: 'Stoke-on-Trent', SW: 'South West London', SY: 'Shrewsbury',
    TA: 'Taunton', TD: 'Galashiels', TF: 'Telford', TN: 'Tonbridge', TQ: 'Torquay', TR: 'Truro', TS: 'Teesside', TW: 'Twickenham',
    UB: 'Southall', W: 'West London', WA: 'Warrington', WC: 'Central London', WD: 'Watford', WF: 'Wakefield', WN: 'Wigan',
    WR: 'Worcester', WS: 'Walsall', WV: 'Wolverhampton', YO: 'York', ZE: 'Shetland' };
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
  st.tank = 'family';
  try { var f0 = localStorage.getItem('ff-fuel'); if (FUEL[f0]) st.fuel = f0; } catch (e) {}
  try { var k0 = localStorage.getItem('ff-tank'); if (k0 && TANKS.some(function (t) { return t.k === k0; })) st.tank = k0; } catch (e) {}
  function tank() { for (var i = 0; i < TANKS.length; i++) if (TANKS[i].k === st.tank) return TANKS[i]; return TANKS[1]; }
  function pounds(pence, litres) { return '&pound;' + (pence * litres / 100).toFixed(2); }

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
    var dp = +(el.getAttribute('data-dp') || 1), fmt = function (v) { return (+v).toFixed(dp); };
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
    var t3 = $('ff-t3'), T = tank(), what = 'a ' + T.name.toLowerCase() + ' (' + T.l + ' litres)';
    var num = t3.querySelector('.ff-num b'), sub = t3.querySelector('.ff-ts');
    if (st.r === 'uk') {
      var F = st.stats && st.stats.fuels[st.fuel], A = F ? F.areas : null, lo = null, hi = null;
      for (var a in (A || {})) { if (!lo || A[a][1] < A[lo][1]) lo = a; if (!hi || A[a][1] > A[hi][1]) hi = a; }
      if (!F) { t3.hidden = true; return; }
      t3.querySelector('.ff-tl').innerHTML = 'Fill ' + what + ' at the UK average price';
      countUp(num, F.uk.med * T.l / 100);
      sub.innerHTML = lo && hi ? 'From <b>' + pounds(A[lo][1], T.l) + '</b> in ' + esc(areaName(lo)) + ' to <b>' + pounds(A[hi][1], T.l) + '</b> in ' + esc(areaName(hi)) + ', going by each area&rsquo;s average.' : '';
    } else {
      var where = st.centre === HOME ? 'near ' + esc(HOME.label) : 'near you';
      t3.querySelector('.ff-tl').innerHTML = 'Fill ' + what + ' at the cheapest';
      countUp(num, best.p * T.l / 100);
      var save = med != null ? (med - best.p) * T.l / 100 : 0;
      sub.innerHTML = save >= 0.005
        ? '<b>&pound;' + save.toFixed(2) + ' less</b> than at the average price ' + where + ' (' + pounds(med, T.l) + ')'
        : 'The same as the average price ' + where + '.';
    }
    t3.hidden = false;
  }

  function tankButtons() {
    var box = $('ff-tanks'); if (!box) return;
    box.innerHTML = TANKS.map(function (t) {
      return '<button type="button" data-k="' + t.k + '" aria-pressed="' + (t.k === st.tank) + '">' + t.name + ' <small>' + t.l + '&nbsp;L</small></button>';
    }).join('');
    box.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      st.tank = b.getAttribute('data-k');
      try { localStorage.setItem('ff-tank', st.tank); } catch (er) {}
      [].forEach.call(box.querySelectorAll('button'), function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      if (st.list.length) { fillTile(st.list[0], st.r === 'uk' ? null : currentMedian()); renderList(); }
    });
  }
  function currentMedian() { return st.cut && st.around ? st.around.med : median(st.list.map(function (x) { return x.p; })); }

  /* ---- the list ---- */
  function row(x, i) {
    var s = x.s, t = s.pt && s.pt[st.fuel] ? ' &middot; price from ' + hm(s.pt[st.fuel]) : '';
    return '<li class="ff-item' + (i === 0 ? ' best' : '') + '" tabindex="0" data-i="' + i + '" style="animation-delay:' + Math.min(i, 14) * 35 + 'ms">' +
      '<span class="ff-rank">' + (i + 1) + '</span><span class="ff-name">' + esc(s.b) + (s.n ? '<small>' + esc(s.n) + '</small>' : '') + '</span>' +
      '<span class="ff-price">' + p1(x.p) + 'p<small>' + pounds(x.p, tank().l) + ' a tank</small></span>' +
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
    var T = tank(), fill = s.p[st.fuel] != null ? '<br>Fill a ' + T.name.toLowerCase() + ' (' + T.l + ' L) with ' + FUEL[st.fuel].toLowerCase() + ': <b>' + pounds(s.p[st.fuel], T.l) + '</b>' : '';
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
  function loadStats() {
    get('?stats=1').then(function (j) { if (j && j.ok) { st.stats = j; if (st.list.length) tiles(); renderUk(); } }, function () {});
  }
  pressFuel();
  tankButtons();
  loadStats();
  update();
})();
