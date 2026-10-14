# -*- coding: utf-8 -*-
"""Checks for shop_report.py (14 Oct 2026):  py shop_report_test.py
A made-up report in the real reports' markup (a real customer's report never goes in this public repository): what may be
shown is kept, everything that names a person, a computer or the office is dropped, and the warnings fire."""
import json
import os
import tempfile

import shop_report as R

SERVICE = """<!doctype html><html><body><div class="wrap">
 <p class="sub">Prepared for <strong>Jane Customer</strong> &middot; Wednesday 15 October 2026, 10:12 &middot; JANES-LAPTOP &middot; service time: 41 minutes</p>
  <div class="scorehead">
  <div><div class="scorenum" id="scorenum" data-score="88">88%</div><div class="scoreverdict ok">Very good</div></div>
  <div class="sc-cats"><div class='sc-row'><div class='sc-name'>Storage</div><div class='sc-track'><div class='sc-fill sb-g' style='width:98%'></div></div><div class='sc-val'>98</div></div><div class='sc-note'>fast SSD, healthy</div>
<div class='sc-row'><div class='sc-name'>Protection</div><div class='sc-track'><div class='sc-fill sb-a' style='width:65%'></div></div><div class='sc-val'>65</div></div><div class='sc-note'>antivirus on, firewall on, no backup found</div>
<div class='sc-row'><div class='sc-name'>Battery</div><div class='sc-track'><div class='sc-fill sb-g' style='width:90%'></div></div><div class='sc-val'>90</div></div><div class='sc-note'>91% of original capacity</div>
</div>
 </div>
 <h2>What this PC is well suited to</h2><ul class='recs'><li>Email, web browsing and video calls</li><li>Office documents and printing</li></ul>
 <h2>What the service did today</h2>
 <table><tr><td class='inf ic'>&#8505;</td><td>Backup (started first)</td><td>No backup found for Jane</td></tr>
<tr><td class='ok ic'>&#10003;</td><td>Broadband speed test</td><td>Download 456.9 Mbps</td></tr>
<tr><td class='ok ic'>&#10003;</td><td>Windows updates (incl. drivers)</td><td>Windows is fully up to date</td></tr>
<tr><td class='ok ic'>&#10003;</td><td>System file check</td><td>System files verified - no problems found</td></tr>
</table>
 <h2>This computer</h2>
 <table>
  <tr><td>Make &amp; model</td><td>Dell Inc. Latitude 5520 &middot; serial 7XK2Q93</td></tr>
  <tr><td>Windows</td><td>Microsoft Windows 11 Pro 25H2 (build 26200)</td></tr>
  <tr><td>Processor</td><td>Intel Core i5-1145G7</td></tr>
  <tr><td>Memory</td><td>16 GB (8 GB + 8 GB at 3200 MHz)</td></tr>
  <tr><td>Running cost</td><td>On for 30 hours in the last 30 days</td></tr>
  <tr><td>Startup programs</td><td>3 (OneDrive, Teams, 365 PC Manager)</td></tr>
  <tr><td>Windows licence</td><td>activated</td></tr>
  <tr><td>Remote support</td><td>registered as &lsquo;JANES-LAPTOP&rsquo;</td></tr>
  <tr><td>Temperatures</td><td>not reported by this PC</td></tr>
 </table>
 <h2>Network safety</h2><table><tr><td>Firewall</td><td><span class='ok'>on</span></td></tr><tr><td>Your router</td><td><span class='ok'>nothing opened to this PC</span></td></tr></table>
 <h2>Drives</h2><table class='drives'><tr class='dh'><td class='small mut'>Drive</td><td>Type</td><td>Health</td><td>Running time</td><td>Speed</td><td>Temp</td><td>Written</td></tr>
<tr><td>Samsung SSD 990 PRO 1TB<br><span class='small mut'>Maker&#39;s guarantee: 5 years or 600 TB written</span></td><td data-l='Type'>SSD &middot; 931 GB</td><td data-l='Health' class='ok'>Healthy</td><td data-l='Running time'>4 hrs counted by the drive<br><span class='small mut'>it may not count sleep</span></td><td data-l='Speed'>read 6,900<br>write 6,100<br><span class='small mut'>MB/s</span></td><td data-l='Temp'>38&deg;C</td><td data-l='Written'>0.1 TB</td></tr>
</table><p class='small mut'>Speed is measured straight from each drive.</p>
   <h2>Broadband on the day</h2>
  <div class="grid"><div class="kpi"><div class="kv">456.9</div><div class="kl">Download &middot; Mbps</div></div></div>
   <h2>Performance benchmark</h2>
  <div class="grid">
    <div class="kpi"><div class="kv">812</div><div class="kl">CPU &middot; MB/s hashed</div></div>
    <div class="kpi"><div class="kv">6,900</div><div class="kl">Windows drive read &middot; MB/s</div></div>
  </div>
  <p><strong>Graphics:</strong> fine.</p>
</div></body></html>"""

HEALTH = """<!doctype html><html><body><div class='wrap'>
<div class='head'><div class='logo'>365</div><div><h1>Your PC Health Report</h1><div class='sub'>365 Techies &middot; Wednesday 15 October 2026 at 09:02 &middot; Free health check</div></div></div>
<div class='score'><div class='ring'><b>91%</b></div><div><div class='verdict'>Excellent</div><div class='sub' style='margin-top:.4rem'>JANES-LAPTOP &middot; Windows 11 Pro<br>Next service: not booked</div></div></div>
<h2>The essentials</h2><table><tr><td>Free disk space</td><td>880 GB (5% used)</td></tr><tr><td>Backup</td><td>No backup found</td></tr><tr><td>Uptime</td><td>0 days since last restart</td></tr><tr><td>Temperature</td><td>not reported by this PC</td></tr></table>
<h2>Your PC's spec &amp; age</h2><table><tr><td>Make &amp; model</td><td>Dell Inc. Latitude 5520</td></tr><tr><td>Battery health</td><td>holds about 91% of its original charge</td></tr>
<tr><td>Drive age</td><td>the drive&rsquo;s exact hours of use are read during the full 365 service</td></tr></table>
</div></body></html>"""

fails = 0


def check(ok, what, detail=""):
    global fails
    print(("  PASS  " if ok else "  FAIL  ") + what + ("" if ok else "  [" + str(detail) + "]"))
    if not ok:
        fails += 1


def parsed(text):
    f = os.path.join(tempfile.mkdtemp(), "r.html")
    open(f, "w", encoding="utf-8").write(text)
    return R.parse(f)


print("A  a full Service Report")
c = parsed(SERVICE)
blob = json.dumps(c, ensure_ascii=False)
check(c["kind"] == "service" and c["score"] == 88 and c["verdict"] == "Very good" and c["date"] == "Wednesday 15 October 2026", "score, verdict and date (no time)", (c["score"], c["date"]))
for secret in ("Jane", "JANES-LAPTOP", "7XK2Q93", "Mbps", "Running cost", "Startup programs", "OneDrive", "Remote support", "router", "Backup (started"):
    check(secret.lower() not in blob.lower(), "never on the page: " + secret)
check([x["name"] for x in c["cats"]] == ["Storage", "Protection", "Battery"] and c["cats"][2]["note"] == "91% of original capacity", "the part-by-part scores")
check(R.row(c, "Make & model") == "Dell Latitude 5520", "the make and model, without the serial number", R.row(c, "Make & model"))
check(R.row(c, "Windows licence") == "activated" and R.row(c, "Temperatures") == "", "kept: licence; dropped: 'not reported' rows")
check([d["name"] for d in c["did"]] == ["Windows updates (incl. drivers)", "System file check"], "what the service did: only the machine's own checks", c["did"])
check(c["net"] == [{"k": "Firewall", "v": "on"}], "network safety: the machine's settings, not the office router", c["net"])
d = c["drives"][0]
check(d["name"] == "Samsung SSD 990 PRO 1TB" and d["hours"] == "4 hrs counted by the drive" and d["written"] == "0.1 TB" and d["health"] == "Healthy", "the new SSD: 4 hours, 0.1 TB written", d)
check([b["l"] for b in c["bench"]] == ["CPU · MB/s hashed", "Windows drive read · MB/s"], "speed tests only (not the broadband test)", c["bench"])
check(c["suited"] == ["Email, web browsing and video calls", "Office documents and printing"], "what it is well suited to")
check(R.suggest(c) == {"cpu": "Intel Core i5-1145G7", "ram": "16GB", "windows": "Windows 11 Pro", "battery": "91%"}, "what to type into shop_stock.py", R.suggest(c))
check(R.warnings(c) == [], "no warnings: a 'no backup' on a fresh machine is expected", R.warnings(c))

print("B  the warnings")
bad = SERVICE.replace("<td>activated</td>", "<td><span class='warn'>not activated</span></td>").replace("class='ok'>Healthy", "class='bad'>Warning").replace("91% of original", "62% of original")
w = " | ".join(R.warnings(parsed(bad)))
check("NOT ACTIVATED" in w and "Warning" in w and "62%" in w, "Windows not activated, an unhealthy drive and a worn battery are all flagged", w)
check("score" in " ".join(R.warnings(parsed(SERVICE.replace('data-score="88"', 'data-score="61"')))), "a score under 80 is flagged")

print("C  the app's quick PC Health Report")
h = parsed(HEALTH)
hb = json.dumps(h, ensure_ascii=False)
check(h["kind"] == "health" and h["score"] == 91 and h["date"] == "Wednesday 15 October 2026", "score and date", (h["score"], h["date"]))
check("JANES-LAPTOP" not in hb and "Backup" not in hb and "Uptime" not in hb and "exact hours" not in hb, "no computer name, backup, uptime or explanation rows")
check(R.row(h, "Windows") == "Windows 11 Pro" and R.row(h, "Make & model") == "Dell Latitude 5520" and R.suggest(h).get("battery") == "91%", "Windows, model and the battery for shop_stock.py")

print("\n" + ("%d FAILED" % fails if fails else "ALL PASSED"))
raise SystemExit(1 if fails else 0)
