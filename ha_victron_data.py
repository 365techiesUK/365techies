# -*- coding: utf-8 -*-
"""The gated 2-page Home Assistant x Victron test (hub-research verdict, 2026-08-10).

Why these two pages exist — and why ONLY these two:
  * The 2026-08 hub research found HA the single untouched white space in the
    Victron estate: zero pages target it, and the SERPs are forums/docs/GitHub
    (verified 2026-08-10: "cerbo gx home assistant" page 1 has ZERO commercial
    results; "cerbo gx not connecting to vrm" is 8/10 Victron Community threads).
  * Wave 2 (MPPT/SmartShunt symptom pages, the setup-service page) is built ONLY
    if this pair earns measured UK clicks — see memory ha-victron-hub-verdict.

Editorial rules for this module:
  * Every technical claim is real: drawn from OUR OWN 141-entity Crafter install
    (MQTT vs Modbus measurements, the USB-port trap, CGNAT operation) or from
    Victron's/HA's own documentation. No invented error behaviour.
  * Independent-not-authorised framing is mandatory: Home Assistant is a Nabu
    Casa trademark; Victron Energy is a Victron Energy B.V. trademark. We ARE
    on Victron's Recommended Software Integrator list — state that truthfully,
    never as "authorised by Victron".
  * CTAs are worldwide-remote (symptom traffic is national/global DIYers, not
    Dorset callouts): custom VRM dashboards + contact. HA installs are QUOTED
    (owner decision 2026-08-10) — never a fabricated price.
  * ⚠️ These pages carry a maintenance obligation: HA integration content rots
    (the victron_gx integration only shipped in HA 2026.5). Re-verify steps
    against the current HA release when touching this file.
"""

# The live-telemetry proof strip: the van's own Home Assistant pushing real data
# to this website every 30 s. Unique vgx- namespace (vlive/vhx are taken on
# other pages; this keeps the widget safe to reuse anywhere).
_LIVE_STRIP = (
    '<style>'
    '.vgx{margin:1.1rem 0 0;border:1px solid var(--line);border-radius:var(--r-lg);'
    'background:var(--glass-deep);padding:1rem 1.2rem}'
    '.vgx-bar{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;'
    'font:600 .66rem/1.3 ui-monospace,monospace;letter-spacing:.06em;text-transform:uppercase;color:#a9bacd;margin-bottom:.8rem}'
    '.vgx-live{display:inline-flex;align-items:center;gap:8px;color:#39d353}'
    '.vgx-dot{width:8px;height:8px;border-radius:50%;background:#39d353;box-shadow:0 0 0 0 rgba(57,211,83,.6);animation:vgxp 2.4s infinite}'
    '@keyframes vgxp{70%{box-shadow:0 0 0 7px rgba(57,211,83,0)}100%{box-shadow:0 0 0 0 rgba(57,211,83,0)}}'
    '.vgx-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px}'
    '.vgx-k{margin:0;color:var(--muted);font-size:.68rem;letter-spacing:.08em;text-transform:uppercase}'
    '.vgx-v{margin:.25rem 0 0;font-size:1.45rem;font-weight:750;line-height:1.1;color:var(--ink);font-variant-numeric:tabular-nums}'
    '.vgx-u{font-size:.8rem;font-weight:600;color:var(--muted);margin-left:2px}'
    '.vgx[data-state=stale]{opacity:.55;filter:grayscale(.6)}'
    '.vgx[data-state=stale] .vgx-dot{background:#6e7681;animation:none}'
    '@media (prefers-reduced-motion:reduce){.vgx-dot{animation:none}}'
    '</style>'
    '<div class="vgx" id="vgx" data-state="loading" aria-label="Live data from our own Cerbo GX via Home Assistant">'
    '<div class="vgx-bar"><span class="vgx-live"><span class="vgx-dot"></span><span id="vgx-state">connecting&hellip;</span></span>'
    '<span id="vgx-upd"></span></div>'
    '<div class="vgx-grid">'
    '<div><p class="vgx-k">Battery</p><p class="vgx-v"><span id="vgx-soc">&mdash;</span><span class="vgx-u">%</span></p></div>'
    '<div><p class="vgx-k">Solar</p><p class="vgx-v"><span id="vgx-solar">&mdash;</span><span class="vgx-u">W</span></p></div>'
    '<div><p class="vgx-k">Signal</p><p class="vgx-v"><span id="vgx-rsrp">&mdash;</span><span class="vgx-u">dBm</span></p></div>'
    '<div><p class="vgx-k">Near</p><p class="vgx-v" style="font-size:1.1rem" id="vgx-town">&mdash;</p></div>'
    '</div></div>'
    '<script>(function(){var E="/api/van-live.php";function s(i,v){var e=document.getElementById(i);'
    'if(e)e.textContent=(v===null||v===undefined||v==="")?"\\u2014":v}'
    'function go(){fetch(E+"?_="+Date.now(),{cache:"no-store"}).then(function(r){return r.json()}).then(function(j){'
    'var b=document.getElementById("vgx");if(!b)return;'
    'if(!j||j.live===false||j.t==null){b.setAttribute("data-state","stale");s("vgx-state","van offline");return}'
    'b.setAttribute("data-state","live");s("vgx-state","live");'
    'document.getElementById("vgx-upd").textContent="updated "+Math.max(0,j.age_s|0)+"s ago";'
    's("vgx-soc",j.soc==null?null:Math.round(j.soc));s("vgx-solar",j.solar_w==null?null:Math.round(j.solar_w));'
    's("vgx-rsrp",j.rsrp);s("vgx-town",j.town||"hidden")}).catch(function(){'
    'var b=document.getElementById("vgx");if(b){b.setAttribute("data-state","stale");s("vgx-state","offline")}})}'
    'if(document.readyState!=="loading"){go();setInterval(go,30000)}else document.addEventListener("DOMContentLoaded",function(){go();setInterval(go,30000)})})();'
    '</script>'
)

_TRADEMARK_NOTE = (
    '<p style="font-size:.85rem;color:var(--muted)">Independent guide: 365 Techies is not affiliated with, '
    'endorsed by or authorised by Victron Energy B.V. or Nabu Casa, Inc. Home Assistant is a trademark of '
    'Nabu Casa; Victron Energy is a trademark of Victron Energy B.V. Our dashboard work is listed on '
    'Victron&rsquo;s Recommended Software Integrator programme &mdash; the opinions and measurements here '
    'are our own, from our own installation.</p>'
)

HA_VICTRON_PAGES = [

# ============================================================ AUTHORITY / SETUP
{
 'slug': 'home-assistant-victron-cerbo-gx',
 'title': 'Victron Cerbo GX + Home Assistant Setup | 365 Techies',
 'metaDesc': 'Connect a Victron Cerbo GX to Home Assistant: which official integration to use, MQTT vs Modbus (we measured both), the real steps and the traps that waste evenings.',
 'ogTitle': 'Victron Cerbo GX + Home Assistant — the Working Setup',
 'crumbName': 'Home Assistant + Victron',
 'eyebrow': '// HOME ASSISTANT &times; VICTRON',
 'h1': 'Victron Cerbo GX + <em class="grad grad--cyan">Home Assistant</em>, done properly',
 'lede': 'Most guides for putting a Victron system into Home Assistant predate the official integrations that shipped in 2025&ndash;26, so they walk you through custom components you no longer need. Here&rsquo;s the current, working route &mdash; from a firm whose own campervan runs 141 Home Assistant entities off a Cerbo GX, live on this website right now.',
 'chips': ['Official victron_gx integration', 'MQTT &amp; Modbus, measured', 'Our own van as proof'],
 'primaryCta': ['Want it built for you? Get a quote', '/custom-vrm-dashboards/'],
 'secondaryCta': ['Ask us anything', '/contact/'],
 'ctaHead': 'Rather have it working than read about it?',
 'ctaSub': 'We integrate Victron systems into Home Assistant and build custom dashboards on VRM data &mdash; for campervans, boats and off-grid buildings, remotely, worldwide. Installs and integrations are quoted individually: tell us your kit list and what you want to see, and you&rsquo;ll get an honest scope, not a package price.',
 'schemaKind': 'howto',
 'howToName': 'How to connect a Victron Cerbo GX to Home Assistant',
 'howToSteps': [
   {'name': 'Pick the right integration',
    'text': 'Use the official Victron GX integration (Home Assistant 2026.5 or later) for a Cerbo GX, Venus GX or Ekrano GX on your network. Victron BLE covers individual Bluetooth devices; Victron Remote Monitoring pulls VRM cloud data. For a whole GX system, victron_gx is the one.'},
   {'name': 'Enable MQTT on the Cerbo GX',
    'text': 'On the GX device (or Remote Console): Settings > Services > MQTT on LAN (SSL) — and enable MQTT on LAN (plaintext) if your Home Assistant connects without TLS. Note the Cerbo’s IP address, or use venus.local if your network resolves it.'},
   {'name': 'Add the integration in Home Assistant',
    'text': 'Settings > Devices & Services > Add Integration > search "Victron GX". Enter the Cerbo’s IP address. Home Assistant discovers every connected device — inverter/charger, MPPT solar chargers, battery monitor, tanks — as entities automatically.'},
   {'name': 'Check what arrived',
    'text': 'Open the new Victron GX hub entry and review its devices. A typical campervan or boat system lands dozens to a few hundred entities: state of charge, PV power, AC loads, DC loads, alarms and relay controls.'},
   {'name': 'Build your first dashboard and automations',
    'text': 'Start with battery state of charge, PV yield and AC loads on one view, then add automations — ours turns heavy loads off when the battery drops below a threshold, using the same entities.'},
 ],
 'sections': [
  {'eyebrow': 'Which route', 'h2': 'Three official integrations &mdash; pick by what you own',
   'html': '<p>Since Home Assistant 2025&ndash;26 there are <strong>three official Victron integrations</strong>, and most of the advice you&rsquo;ll find online predates all of them:</p>'
           '<ul>'
           '<li><strong>Victron GX</strong> (<code>victron_gx</code>, HA 2026.5+) &mdash; talks MQTT to a Cerbo GX, Venus GX, Ekrano or any Venus OS device on your network. Whole-system, local, bidirectional. <strong>If you have a GX device, this is the one you want.</strong></li>'
           '<li><strong>Victron BLE</strong> (<code>victron_ble</code>) &mdash; reads the Bluetooth Instant Readout advertising from individual devices (SmartShunt, SmartSolar, batteries). No GX needed, read-only, per-device. Right for small systems with no GX hub.</li>'
           '<li><strong>Victron Remote Monitoring</strong> (<code>victron_remote_monitoring</code>) &mdash; pulls from the VRM cloud API. Works from anywhere, but it&rsquo;s cloud-dependent and slower than local. Right when Home Assistant can&rsquo;t reach the van/boat network at all.</li>'
           '</ul>'
           '<p>They compose: our own van runs all three &mdash; local MQTT for the live system, BLE for devices the GX can&rsquo;t see, and VRM as the away-from-home fallback.</p>'},
  {'eyebrow': 'Measured, not opined', 'h2': 'MQTT vs Modbus TCP &mdash; we measured both so you don&rsquo;t have to',
   'html': '<p>The older DIY route is Modbus TCP (port 502) with a community integration; the official route is MQTT. We ran both against the same Cerbo GX and compared 1,057 paired samples on a parked van:</p>'
           '<ul>'
           '<li><strong>MQTT tracked the system cleanly</strong> &mdash; mean disagreement with the device&rsquo;s own figures: effectively zero.</li>'
           '<li><strong>Polled Modbus produced ~8.8% physically implausible samples</strong> in our test (e.g. charge figures exceeding what the solar could deliver) &mdash; polling catches registers mid-update; push-based MQTT doesn&rsquo;t.</li>'
           '</ul>'
           '<p>Verdict: use the official MQTT integration. Keep Modbus for one-off scripted reads and diagnostics, where a rogue sample doesn&rsquo;t matter.</p>'},
  {'eyebrow': 'The traps', 'h2': 'The four traps that waste evenings',
   'html': '<ul>'
           '<li><strong>The USB port next to the HDMI socket is power-only.</strong> Plug a WiFi dongle or GPS into it and nothing happens &mdash; no error, just silence. Use the other USB ports.</li>'
           '<li><strong>The Cerbo&rsquo;s built-in WiFi is 2.4&thinsp;GHz only.</strong> A 5&thinsp;GHz-only hotspot is invisible to it &mdash; on an iPhone hotspot, turn on &ldquo;Maximise Compatibility&rdquo;.</li>'
           '<li><strong>MQTT needs a keepalive.</strong> The Cerbo only publishes the full topic tree while something asks for it &mdash; the official integration handles this for you, which is one more reason to prefer it over hand-rolled MQTT.</li>'
           '<li><strong>Name your devices before you integrate.</strong> Home Assistant imports whatever the GX calls each device &mdash; renaming 141 entities afterwards is an evening of its own. (Ask us how we know.)</li>'
           '</ul>'},
  {'eyebrow': 'Live proof', 'h2': 'Our own Cerbo GX, in Home Assistant, on this page',
   'html': '<p>This isn&rsquo;t theory. Our support van &mdash; the one that runs our IT business off-grid &mdash; carries a Cerbo GX, three lithium batteries and a 141-entity Home Assistant install, and its Home Assistant pushes a snapshot to this website every 30 seconds:</p>'
           + _LIVE_STRIP +
           '<p style="margin-top:1rem">More of the same: the <a href="/off-grid-victron-energy/">live Victron dashboard</a> with grid-cost comparison, and the <a href="/van-signal-map/">live 4G/5G signal map</a> the same Home Assistant records as the van drives.</p>'},
  {'eyebrow': 'Beyond monitoring', 'h2': 'What Home Assistant adds that VRM can&rsquo;t',
   'html': '<p>VRM is excellent at what it does &mdash; remote monitoring, alarms, history. Home Assistant earns its keep where VRM stops:</p>'
           '<ul>'
           '<li><strong>Automations across systems:</strong> our van cuts the projector when battery state of charge drops &mdash; Victron data driving a non-Victron device. VRM can&rsquo;t reach the projector; Home Assistant can.</li>'
           '<li><strong>Non-Victron sensors beside Victron ones:</strong> router signal strength, internet speed, temperatures, GPS &mdash; one dashboard, everything.</li>'
           '<li><strong>Local control with no internet:</strong> in a field with no signal, the local MQTT integration keeps working. Cloud dashboards don&rsquo;t.</li>'
           '</ul>'
           '<p>If what you actually want is a polished view of VRM data &mdash; branded, simplified, on any screen &mdash; that&rsquo;s exactly what our <a href="/custom-vrm-dashboards/">custom VRM dashboards</a> are, and we build them for customers worldwide.</p>'
           + _TRADEMARK_NOTE},
 ],
 'faqs': [
  {'q': 'Do I need a Cerbo GX to use Home Assistant with Victron kit?',
   'a': 'No — but it changes which integration you use. With a GX device (Cerbo, Venus, Ekrano), use the official Victron GX integration over MQTT and you get the whole system. Without one, the Victron BLE integration reads SmartShunts, SmartSolar chargers and compatible batteries directly over Bluetooth, one device at a time, read-only.'},
  {'q': 'Which is better for Home Assistant: MQTT or Modbus TCP?',
   'a': 'MQTT, and it isn’t close. It’s the official integration’s transport, it’s push-based so you aren’t polling registers mid-update, and in our own 1,057-sample comparison it tracked the system essentially perfectly while polled Modbus produced around 8.8% physically implausible readings. Keep Modbus for scripted one-off reads.'},
  {'q': 'Does the Victron GX integration need the internet?',
   'a': 'No — it’s fully local over your own network, which is precisely its advantage in a van or boat. The internet only matters for the separate VRM cloud integration, remote access to Home Assistant itself, and VRM’s own portal.'},
  {'q': 'Can Home Assistant control the system, or only read it?',
   'a': 'The Victron GX integration is bidirectional: switchable outputs like the inverter mode and relays appear as controllable entities alongside the read-only sensors. Treat control with respect — an automation that switches an inverter is operating your power system, so test on the bench before you trust it while away.'},
  {'q': 'Will you set all this up for us?',
   'a': 'Yes — remotely, worldwide, for campervans, boats and off-grid buildings, and every job is quoted individually rather than sold as a fixed package (systems differ too much for one price to be honest). Tell us your kit and what you want to see and we’ll scope it. If what you need is a polished branded dashboard on VRM data, see our custom VRM dashboards.'},
 ],
 'crossLinksHtml': '<p>Cerbo GX refusing to talk to VRM instead? Work through <a href="/cerbo-gx-not-connecting-to-vrm/">the VRM connection fix</a>. '
                   'Want the finished article without the learning curve? See <a href="/custom-vrm-dashboards/">custom VRM dashboards</a> (worldwide) '
                   'or our <a href="/victron-installer-dorset/">Victron installation</a> on the South Coast &mdash; or <a href="/contact/">talk to us</a>.</p>',
},

# ========================================================== SYMPTOM / DIAGNOSIS
{
 'slug': 'cerbo-gx-not-connecting-to-vrm',
 'title': 'Cerbo GX Not Connecting to VRM? The Fix | 365 Techies',
 'metaDesc': 'Cerbo GX won’t connect to VRM? The real causes in order: internet vs VRM, the power-only USB port, 2.4 GHz WiFi, captive portals, error #150 and firmware.',
 'ogTitle': 'Cerbo GX Not Connecting to VRM — Diagnose It in Order',
 'crumbName': 'Cerbo GX Not Connecting to VRM',
 'eyebrow': 'Victron fix &middot; Cerbo GX &amp; VRM',
 'h1': 'Cerbo GX <em class="grad grad--cyan">not connecting to VRM</em>? Diagnose it in order',
 'lede': 'A Cerbo GX that won&rsquo;t report to the VRM portal is nearly always one of six causes, and they&rsquo;re quick to tell apart if you check them in the right order. Here&rsquo;s the ladder we use on our own van &mdash; which runs VRM over mobile broadband from a moving vehicle, so we&rsquo;ve met most of these in the wild.',
 'chips': ['Six causes, in order', 'Error #150 explained', 'Works on 4G/5G &amp; Starlink'],
 'primaryCta': ['Stuck? Ask us — worldwide', '/contact/'],
 'secondaryCta': ['Custom VRM dashboards', '/custom-vrm-dashboards/'],
 'ctaHead': 'Still not reporting?',
 'ctaSub': 'Send us what the VRM portal menu shows and where it&rsquo;s installed &mdash; van, boat or building &mdash; and we&rsquo;ll tell you honestly what we&rsquo;d check next. We support Victron monitoring remotely for customers worldwide, and if the fix needs hands on the kit we&rsquo;ll say so rather than guess.',
 'schemaKind': 'howto',
 'howToName': 'How to fix a Cerbo GX that will not connect to VRM',
 'howToSteps': [
   {'name': 'Separate internet from VRM',
    'text': 'On the GX: Settings > VRM online portal. If it shows a recent "Last contact", VRM is fine and your gap is elsewhere. If it shows a connection error, first confirm the Cerbo actually has internet: Settings > Ethernet or WiFi — does it hold an IP address and gateway?'},
   {'name': 'Check the WiFi dongle is in a data USB port',
    'text': 'The USB port beside the HDMI socket is power-only. A WiFi adapter plugged into it powers up but passes no data — move it to another USB port.'},
   {'name': 'Check the WiFi band',
    'text': 'The Cerbo’s WiFi is 2.4 GHz only. If the network you’re joining is 5 GHz-only (many phone hotspots by default), the Cerbo cannot see it — on an iPhone enable "Maximise Compatibility"; on routers, make sure a 2.4 GHz SSID is broadcast.'},
   {'name': 'Rule out a captive portal',
    'text': 'Campsite, marina and hotel WiFi usually demands a browser login page the Cerbo can never complete. Test the same network with a laptop: if a login page appears, that’s your blocker — use a hotspot or a router that logs in for you.'},
   {'name': 'Read the error number',
    'text': 'Error #150 and its siblings mean the Cerbo has a network but cannot reach VRM’s servers — typically DNS failing or outbound HTTPS (port 443) blocked by a guest network or firewall. Try a different network to prove it: if it reports on your phone’s hotspot, the original network is the problem.'},
   {'name': 'Update, reboot, and check the Portal ID',
    'text': 'Update Venus OS (Settings > Firmware), reboot, then confirm Settings > VRM online portal shows a Portal ID and two-way communication is set as you expect. In the VRM portal itself, check the installation still lists that Portal ID.'},
   {'name': 'Check it is not VRM itself',
    'text': 'Rarely, the portal has an outage — the Victron Community status threads fill up fast when it does. If several installations went quiet at the same moment, wait rather than change settings.'},
 ],
 'sections': [
  {'eyebrow': 'First split', 'h2': 'Is it the internet, or is it VRM?',
   'html': '<p>Everything follows from one distinction: <strong>a Cerbo with no internet</strong> and <strong>a Cerbo with internet that can&rsquo;t reach VRM</strong> look identical on the portal (&ldquo;last seen 3 hours ago&rdquo;) but have completely different fixes.</p>'
           '<p>On the device or Remote Console, open <strong>Settings &rarr; VRM online portal</strong>. A recent &ldquo;last contact&rdquo; means the link is fine. An error there sends you to <strong>Settings &rarr; Ethernet / WiFi</strong>: no IP address or gateway means it&rsquo;s a plain networking problem (steps 2&ndash;4 below); a healthy IP with a VRM error means something between you and Victron&rsquo;s servers is in the way (step 5).</p>'},
  {'eyebrow': 'The classics', 'h2': 'The two hardware traps everyone hits once',
   'html': '<ul>'
           '<li><strong>The power-only USB port.</strong> The USB socket next to the HDMI output supplies power and nothing else. A WiFi dongle in it lights up and does nothing &mdash; the single most anticlimactic fault in the Victron world. Move it along one port.</li>'
           '<li><strong>2.4&thinsp;GHz WiFi only.</strong> The Cerbo cannot see 5&thinsp;GHz-only networks. Phone hotspots are the usual culprit &mdash; recent iPhones hide the 2.4&thinsp;GHz band unless &ldquo;Maximise Compatibility&rdquo; is on.</li>'
           '</ul>'},
  {'eyebrow': 'Error #150', 'h2': 'What error #150 actually tells you',
   'html': '<p>The dreaded <strong>&ldquo;connect error #150&rdquo;</strong> means: <em>I have a network, but I can&rsquo;t reach VRM&rsquo;s servers.</em> The Cerbo needs outbound HTTPS (port 443) and working DNS &mdash; nothing inbound, no port forwarding, ever. So #150 is nearly always the network being selective: guest WiFi blocking unfamiliar devices, a firewall allowing browsers but not machines, a captive portal waiting for a login the Cerbo can&rsquo;t give, or broken DNS.</p>'
           '<p>The fastest proof is a <strong>network swap</strong>: hotspot the Cerbo from your phone for five minutes. If VRM springs to life, the device was never the problem &mdash; the original network was.</p>'},
  {'eyebrow': 'Good news', 'h2': 'Mobile broadband, CGNAT and Starlink all work',
   'html': '<p>Worried that 4G/5G routers or Starlink can&rsquo;t run VRM because they use carrier-grade NAT and you can&rsquo;t port-forward? <strong>You don&rsquo;t need to.</strong> The Cerbo only ever dials out, so VRM works behind CGNAT without any configuration at all &mdash; our own van reports to VRM over a Three UK mobile connection from behind CGNAT, every day, while driving.</p>'
           '<p>Data gaps heal themselves too: the GX buffers its logs while offline and uploads the backlog when the connection returns, so a signal blackspot costs you nothing but the delay.</p>'},
  {'eyebrow': 'Still stuck', 'h2': 'Firmware, the new UI, and when it isn&rsquo;t you',
   'html': '<ul>'
           '<li><strong>Update Venus OS</strong> (Settings &rarr; Firmware) and reboot &mdash; VRM connectivity fixes appear in release notes regularly, and a reboot after an update clears more of these than anyone likes to admit.</li>'
           '<li><strong>Realtime vs reporting:</strong> the portal&rsquo;s <em>realtime</em> view is a separate two-way link &mdash; some users with the new GX interface have seen it decline realtime under load while scheduled reporting carries on fine. If &ldquo;last contact&rdquo; updates but realtime won&rsquo;t open, that&rsquo;s your shape.</li>'
           '<li><strong>Check it isn&rsquo;t Victron:</strong> genuine VRM outages happen rarely; when the community threads light up with the same symptom at the same minute, put the settings down and wait.</li>'
           '</ul>'
           + _TRADEMARK_NOTE},
 ],
 'faqs': [
  {'q': 'What does Cerbo GX error #150 mean?',
   'a': 'It means the Cerbo has a working network but cannot reach the VRM servers — usually blocked outbound HTTPS (port 443), broken DNS, or a captive-portal login page it can never complete. Prove it with a network swap: hotspot the Cerbo from your phone, and if VRM comes alive the original network was the blocker.'},
  {'q': 'Do I need port forwarding for VRM?',
   'a': 'No, never. The GX device only makes outbound connections, so VRM works behind any router, carrier-grade NAT, 4G/5G mobile broadband and Starlink with zero configuration. If a guide tells you to port-forward for VRM, it’s wrong.'},
  {'q': 'Will VRM work on a 4G/5G router or Starlink in a van or boat?',
   'a': 'Yes — outbound-only traffic means CGNAT doesn’t matter. Our own campervan reports to VRM over a Three UK mobile connection from behind CGNAT every day. What does break VRM on the road is captive-portal WiFi at campsites and marinas, which is a reason to prefer your own mobile router.'},
  {'q': 'Is my history lost while the Cerbo was offline?',
   'a': 'No. The GX buffers its log data locally while disconnected and uploads the backlog once VRM is reachable again, so gaps backfill themselves. Only the realtime view is genuinely live-or-nothing.'},
  {'q': 'The Cerbo shows online but VRM realtime won’t load — why?',
   'a': 'Reporting and realtime are different links: logging is a periodic outbound upload, realtime is a persistent two-way session. If "last contact" stays fresh but realtime fails, look at two-way communication being disabled in Settings > VRM online portal, a network that kills long-lived connections, or the device declining realtime under load on the new interface.'},
  {'q': 'Can you just fix it for me?',
   'a': 'Usually, yes — most VRM connection problems are diagnosable remotely from what the VRM portal menu shows and a description of the network. We support Victron monitoring for customers worldwide and we’ll tell you straight if yours is the rare one that needs hands on the hardware.'},
 ],
 'crossLinksHtml': '<p>VRM healthy and hungry for more? Put the whole system in <a href="/home-assistant-victron-cerbo-gx/">Home Assistant with the official integration</a>, '
                   'see the <a href="/custom-vrm-dashboards/">custom VRM dashboards</a> we build worldwide, our <a href="/victron-installer-dorset/">South Coast Victron installs</a>, '
                   'or <a href="/contact/">ask us directly</a>.</p>',
},
]
