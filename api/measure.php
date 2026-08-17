<?php
/**
 * /api/measure.php - the on-foot measurement page for the van signal map.
 *
 * WHAT IT IS
 * A one-tap page the OWNER opens on their phone where the van can't go (the
 * beach). It takes the phone's GPS, runs the SAME 10 MB Cloudflare download the
 * van runs (speed_sample.py in HA), and POSTs the result to signal-log.php with
 * src=phone. Same embargo, same home geo-fence, same store. On the public map
 * these points get their own marker and the words "on foot" - nothing else, and
 * never a name.
 *
 * WHAT IT IS NOT
 * Not public. Not the crowd tester (that is a separate page with its own store,
 * so nothing the public does can touch the van dataset). This page needs the
 * shared X-Token to post at all: you type it once, the browser keeps it in
 * localStorage, and it goes out as a header exactly the way Home Assistant
 * sends it. The token is never written into this HTML.
 *
 * WHY PHP AND NOT A STATIC PAGE
 * So it can sit under /api/ with the other gated things and get the same
 * robots treatment, and so it is trivially removable server-side.
 *
 * Privacy: GPS is sent at full precision so the geo-fence can judge it; the
 * endpoint rounds and fences it exactly as it does for the van.
 */
header('Content-Type: text/html; charset=utf-8');
header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');
?><!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<title>On-foot measurement</title>
<style>
  :root{--bg:#0b1020;--panel:#141b2e;--ink:#e6edf3;--muted:#9db3cf;--line:rgba(125,170,220,.22);
        --good:#3fb950;--warn:#d29922;--bad:#f85149;--cyan:#6cc4f5}
  *{box-sizing:border-box}
  html,body{margin:0;background:var(--bg);color:var(--ink);
    font:17px/1.5 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}
  .wrap{max-width:460px;margin:0 auto;padding:1.4rem 1.1rem 3rem}
  h1{font-size:1.15rem;margin:0 0 .3rem;color:var(--muted);font-weight:600;letter-spacing:.02em}
  .big{display:block;width:100%;padding:1.5rem 1rem;margin:1rem 0;border:0;border-radius:18px;
    background:linear-gradient(135deg,#1d97e3,#3fb950);color:#061019;font:800 1.5rem/1.1 inherit;
    cursor:pointer;box-shadow:0 14px 40px -14px rgba(29,151,227,.7)}
  .big:disabled{opacity:.55;cursor:default;box-shadow:none}
  .card{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:1rem 1.1rem;margin:0 0 .9rem}
  .card h2{font-size:.8rem;margin:0 0 .5rem;color:var(--muted);text-transform:uppercase;letter-spacing:.06em}
  .row{display:flex;justify-content:space-between;gap:1rem;padding:.3rem 0;border-top:1px solid var(--line)}
  .row:first-of-type{border-top:0}
  .row b{font-variant-numeric:tabular-nums}
  .status{min-height:1.5em;color:var(--muted);font-size:.95rem}
  .ok{color:var(--good)} .warn{color:var(--warn)} .bad{color:var(--bad)}
  input{width:100%;padding:.75rem .9rem;border-radius:10px;border:1px solid var(--line);
    background:#0b1020;color:var(--ink);font:inherit}
  .small{font-size:.82rem;color:var(--muted)}
  a{color:var(--cyan)}
</style>
</head>
<body>
<div class="wrap">
  <h1>On-foot measurement</h1>
  <p class="small">Same 10&nbsp;MB test the van runs, same network, marked
  &ldquo;on foot&rdquo; on the map. Nothing else about you is recorded.</p>

  <div class="card" id="tokencard">
    <h2>Shared token (once)</h2>
    <input id="tok" type="password" autocomplete="off" placeholder="paste the X-Token">
    <p class="small" style="margin:.5rem 0 0">Kept only in this browser. It&rsquo;s the same token Home Assistant uses to post.</p>
  </div>

  <button class="big" id="go">Measure here</button>
  <p class="status" id="status" role="status" aria-live="polite"></p>

  <div class="card" id="result" hidden>
    <h2>This reading</h2>
    <div class="row"><span>Download</span><b id="r-dl">&mdash;</b></div>
    <div class="row"><span>Latency</span><b id="r-ms">&mdash;</b></div>
    <div class="row"><span>GPS accuracy</span><b id="r-acc">&mdash;</b></div>
    <div class="row"><span>Sent as</span><b>on foot</b></div>
  </div>

  <div class="card">
    <h2>Rules of the road</h2>
    <p class="small" style="margin:0">Mobile data only &mdash; turn WiFi off first, or you&rsquo;ll measure someone&rsquo;s router.
    Stand still for the ten seconds it takes. Points inside the private zone are dropped by the server,
    and nothing appears publicly for an hour.</p>
  </div>
</div>

<script>
(function () {
  var ENDPOINT = '/api/signal-log.php';
  var SAMPLE   = 10000000;              // bytes - identical to speed_sample.py
  var CF       = 'https://speed.cloudflare.com/__down?bytes=' + SAMPLE;
  var $ = function (id) { return document.getElementById(id); };
  var tok = $('tok'), go = $('go'), status = $('status'), result = $('result');

  // token: remembered per browser, never in the page source
  var saved = localStorage.getItem('vsm_token') || '';
  if (saved) { tok.value = saved; $('tokencard').style.opacity = .55; }
  tok.addEventListener('change', function () {
    localStorage.setItem('vsm_token', tok.value.trim());
    $('tokencard').style.opacity = tok.value.trim() ? .55 : 1;
  });

  function say(msg, cls) { status.textContent = msg; status.className = 'status ' + (cls || ''); }

  function position() {
    return new Promise(function (ok, no) {
      if (!navigator.geolocation) return no(new Error('no geolocation'));
      navigator.geolocation.getCurrentPosition(function (p) { ok(p.coords); },
        function (e) { no(new Error('GPS: ' + e.message)); },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
    });
  }

  // Latency: median of a few tiny HEAD-ish fetches to the same origin.
  function latency() {
    var url = 'https://speed.cloudflare.com/__down?bytes=0';
    var runs = [], i = 0;
    function one() {
      var t = performance.now();
      return fetch(url + '&_=' + Math.random(), { cache: 'no-store' })
        .then(function () { runs.push(performance.now() - t); });
    }
    return one().then(one).then(one).then(function () {
      runs.sort(function (a, b) { return a - b; });
      return Math.round(runs[1]);
    });
  }

  // The van's exact method: time a fixed 10 MB download, report Mbps.
  function download() {
    var t0 = performance.now();
    return fetch(CF + '&_=' + Math.random(), { cache: 'no-store' })
      .then(function (r) { return r.arrayBuffer(); })
      .then(function (buf) {
        var secs = (performance.now() - t0) / 1000;
        return { mbps: Math.round((buf.byteLength * 8) / secs / 1e6 * 10) / 10, secs: secs };
      });
  }

  go.addEventListener('click', function () {
    var token = (tok.value || '').trim();
    if (!token) { say('Paste the token first.', 'warn'); return; }
    // WiFi guard: if the browser says we're on wifi, refuse - we'd measure a router.
    var c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (c && c.type === 'wifi') { say('You are on WiFi - turn it off, this must be mobile data.', 'bad'); return; }

    go.disabled = true; result.hidden = true;
    say('Getting GPS…');
    var coords, ms, dl;
    position().then(function (c) {
      coords = c;
      say('Measuring latency…');
      return latency();
    }).then(function (m) {
      ms = m;
      say('Downloading 10 MB… stand still');
      return download();
    }).then(function (d) {
      dl = d;
      say('Sending…');
      var body = {
        t: Date.now() / 1000,
        src: 'phone',
        dl: dl.mbps,
        dl_age: 0,                       // the test just ran HERE, by definition
        latency: ms,
        lat: coords.latitude, lon: coords.longitude,
        net: 'phone'                     // the map shows "on foot"; no radio detail
      };
      return fetch(ENDPOINT, { method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Token': token },
        body: JSON.stringify(body) });
    }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { r: r, j: j }; }); })
    .then(function (x) {
      if (!x.r.ok || !x.j.ok) {
        say(x.r.status === 401 ? 'Server rejected the token.' : ('Server said no (' + x.r.status + ').'), 'bad');
        return;
      }
      $('r-dl').textContent  = dl.mbps + ' Mbps';
      $('r-ms').textContent  = ms + ' ms';
      $('r-acc').textContent = '±' + Math.round(coords.accuracy) + ' m';
      result.hidden = false;
      say('Recorded. It will appear on the map in about an hour.', 'ok');
    }).catch(function (e) {
      say(e.message || String(e), 'bad');
    }).then(function () { go.disabled = false; });
  });
})();
</script>
</body>
</html>
