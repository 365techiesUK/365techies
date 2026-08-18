// Post-deploy header smoke test - the check that would have caught the 12-17 Aug 2026
// breakage on day one (a .desktop-nav overflow:hidden that clipped every dropdown
// panel while every existing check - link presence, SOS geometry - passed).
//
// It opens a REAL desktop dropdown on the LIVE homepage in headless Chromium and
// asserts, at 1600px (desktop nav shown) and 1366px (the commonest Windows laptop
// width - BELOW the site's 1560px nav breakpoint, so the desktop nav is display:none
// there by design and only the SOS-on-screen check applies):
//   1. the panel's computed opacity is 1 and its bounding rect extends below the nav bar
//   2. a hit-test at a point inside the panel lands on an element INSIDE the panel
//      (an invisible or clipped panel can never win a hit-test)
//   3. no ancestor of the panel clips it (overflow visible up the chain)
//   4. the red SOS button is fully inside the viewport (both widths)
// Any failure exits non-zero and fails the deploy job. ~30s with playwright's chromium.
// Rehearsed 2026-08-18 against the live site: the first draft red-flagged 1366px because
// the desktop nav isn't rendered there - the width-aware branch below is the fix.
//
// Run: npx -y playwright@1.47.2 install --with-deps chromium && node tools/smoke-header.mjs
import { chromium } from "playwright";

const URL = process.env.SMOKE_URL || "https://365techies.co.uk/?smoke=" + Date.now();
const WIDTHS = [1600, 1366];
let failures = 0;
const fail = (m) => { failures++; console.log("::error title=header smoke::" + m); };
const ok = (m) => console.log("ok  " + m);

const browser = await chromium.launch();
try {
  for (const w of WIDTHS) {
    const page = await browser.newPage({ viewport: { width: w, height: 900 }, userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 deploy-smoke" });
    await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForSelector(".site-header .nav-sos", { timeout: 20000 });
    // make sure the header is at rest (it auto-hides on scroll)
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);
    // Is the desktop nav actually rendered at this width? Below the 1560px breakpoint
    // it is display:none by design (hamburger menu instead) - then only SOS applies.
    const navShown = await page.evaluate(() => { const n = document.querySelector(".desktop-nav"); return !!n && getComputedStyle(n).display !== "none"; });
    if (!navShown) {
      const s = await page.evaluate(() => { const sos = document.querySelector(".nav-sos"); if (!sos) return null; const sr = sos.getBoundingClientRect(); return { left: sr.left, right: sr.right, width: sr.width, vw: innerWidth }; });
      if (!s) fail(`${w}px: .nav-sos missing`);
      else if (!(s.width > 0 && s.left >= 0 && s.right <= s.vw)) fail(`${w}px: SOS button not fully on screen (${s.left|0}..${s.right|0} of ${s.vw})`);
      else ok(`${w}px: desktop nav hidden by design (below breakpoint); SOS button on screen (${s.left|0}..${s.right|0}/${s.vw})`);
      await page.close();
      continue;
    }
    const trig = page.locator(".desktop-nav .has-dropdown [aria-haspopup]").first();
    await trig.hover();
    // Wait for the fade-in to actually FINISH rather than a fixed sleep: poll opacity until it
    // stops changing (the first CI run caught it at 0.998756, 1.2ms before the end of a 0.28s
    // transition, and red-flagged a healthy site). Cap at 3s.
    await page.waitForFunction(() => {
      const li = document.querySelector(".desktop-nav .has-dropdown"); const p = li && li.querySelector(".dropdown");
      if (!p) return true;
      const o = parseFloat(getComputedStyle(p).opacity);
      const prev = p.__smokePrev; p.__smokePrev = o;
      return prev !== undefined && Math.abs(o - prev) < 0.0005 && o > 0.9;
    }, null, { timeout: 3000, polling: 100 }).catch(() => {});
    await page.waitForTimeout(150);
    const r = await page.evaluate(() => {
      const li = document.querySelector(".desktop-nav .has-dropdown");
      const nav = document.querySelector(".desktop-nav");
      const panel = li && li.querySelector(".dropdown");
      const sos = document.querySelector(".nav-sos");
      if (!li || !nav || !panel || !sos) return { missing: true };
      const cs = getComputedStyle(panel), pr = panel.getBoundingClientRect(), nr = nav.getBoundingClientRect(), sr = sos.getBoundingClientRect();
      const hit = document.elementFromPoint(pr.left + 24, pr.top + 24);
      let a = panel.parentElement, clipped = null;
      while (a && a !== document.body) { const c = getComputedStyle(a); if (c.overflow !== "visible" && c.overflow !== "" ) { clipped = a.tagName + "." + a.className; break; } a = a.parentElement; }
      return {
        opacity: cs.opacity, panelTop: pr.top, panelBottom: pr.bottom, navBottom: nr.bottom, navOverflow: getComputedStyle(nav).overflow,
        hitInside: !!(hit && panel.contains(hit)), clippedBy: clipped,
        sosLeft: sr.left, sosRight: sr.right, sosWidth: sr.width, vw: innerWidth, trigger: (li.querySelector("[aria-haspopup]") || {}).textContent
      };
    });
    if (r.missing) { fail(`${w}px: header structure missing (.desktop-nav/.has-dropdown/.dropdown/.nav-sos)`); await page.close(); continue; }
    const tag = `${w}px "${(r.trigger || "").trim()}"`;
    if (!(parseFloat(r.opacity) >= 0.98)) fail(`${tag}: dropdown opacity is ${r.opacity}, expected ~1`); else ok(`${tag}: dropdown opacity ${r.opacity}`);
    if (!(r.panelBottom > r.navBottom + 40)) fail(`${tag}: dropdown panel does not extend below the nav bar (panelBottom ${r.panelBottom|0} vs navBottom ${r.navBottom|0})`); else ok(`${tag}: panel hangs below the bar`);
    if (!r.hitInside) fail(`${tag}: hit-test inside the dropdown did NOT land in the panel - it is invisible or clipped`); else ok(`${tag}: hit-test lands inside the panel`);
    if (r.clippedBy) fail(`${tag}: dropdown is clipped by ancestor ${r.clippedBy} (overflow not visible)`); else ok(`${tag}: no clipping ancestor`);
    if (r.navOverflow === "hidden") fail(`${tag}: .desktop-nav has overflow:hidden - the exact bug from 2026-08-12`); else ok(`${tag}: .desktop-nav overflow ${r.navOverflow}`);
    if (!(r.sosWidth > 0 && r.sosLeft >= 0 && r.sosRight <= r.vw)) fail(`${tag}: SOS button not fully on screen (${r.sosLeft|0}..${r.sosRight|0} of ${r.vw})`); else ok(`${tag}: SOS button on screen (${r.sosLeft|0}..${r.sosRight|0}/${r.vw})`);
    await page.close();
  }
} finally {
  await browser.close();
}
if (failures) { console.log(`HEADER SMOKE: ${failures} failure(s)`); process.exit(1); }
console.log("HEADER SMOKE: all checks passed");
