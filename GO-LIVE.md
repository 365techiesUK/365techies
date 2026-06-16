# 365 Techies — Go-Live Checklist

Everything needed to take the new static site live on **SiteGround**, replacing the
old WordPress site at **https://365techies.co.uk** (canonical: HTTPS, non-www).

The site is plain static HTML/CSS/JS — no database, PHP or Node needed on the server.

---

## 0. Before you start
- [ ] **Back up the current site** — Site Tools → *Security → Backups* → Create Backup.
- [ ] Confirm you can log into **SiteGround Site Tools** and have **FTP/File Manager** access.
- [ ] Note: replacing website files does **NOT** affect your **email** (`help@365techies.co.uk`),
      **DNS** or **MX** records — those are managed separately.

---

## 1. Upload — what TO upload (to the web root, usually `public_html/`)
The site uses absolute paths (`/css/…`, `/js/…`), so it must sit at the domain root.
- [ ] `index.html` and `404.html`
- [ ] **All page folders** (~130 `slug/index.html` folders — e.g. `cybersecurity-support/`,
      `gaming-pcs/`, `it-support-new-forest/`, `starlink-internet/`, …)
- [ ] `css/` and `js/` folders
- [ ] `sitemap.xml`, `robots.txt`, `llms.txt`, `site.webmanifest`
- [ ] `.htaccess`  ← **enable "Show hidden files" in File Manager so this uploads**
- [ ] Icons/images: `favicon.svg`, `apple-touch-icon.png`, `og-image.jpg`, `logo.jpg`

## 1b. What NOT to upload (dev/source — keep off the live server)
- [ ] Generators: `build_pages.py`, `build_local.py`, `build_extra.py`, `build_blog.py`
- [ ] Tooling: `package.json`, `package-lock.json`, `eslint.config.mjs`, `tsconfig.json`,
      `remotion.config.ts`, `.prettierrc`, `.gitignore`, `README.md`, this `GO-LIVE.md`
- [ ] `index-classic.html`, `open-in-edge.bat`, `logo-original.webp`, any `node_modules/`

---

## 2. SiteGround steps (Site Tools)
1. [ ] **Backups** → create a manual backup (if not done in step 0).
2. [ ] **Site → File Manager** → open the domain root (`public_html`).
       Delete the old WordPress files (`wp-admin`, `wp-includes`, `wp-content`, `index.php`,
       old `.htaccess`, etc.) — or move them to a `/_old-wp/` folder for now.
3. [ ] Upload the new site files (section 1) into the root. Turn on **Show hidden files**.
4. [ ] **Security → SSL Manager** — ensure Let's Encrypt SSL is active.
5. [ ] **Security → HTTPS Enforce** — ON.
6. [ ] **Speed → Caching → Flush Cache** (also clear Dynamic/Memcached) — IMPORTANT, or
       old cached WordPress pages may keep showing.
7. [ ] After confirming the new site works: **WordPress → Installations → Uninstall** the old
       WP (clears the unused database). Only after a confirmed backup + working new site.

> Remember: **flush the SiteGround cache after every future update** you upload.

---

## 3. Redirects (handled automatically by `.htaccess`)
The included `.htaccess` does HTTPS + non-www, custom 404, gzip/caching, and 301s from the
old WordPress URLs. Key mappings:

| Old WordPress URL | New page |
|---|---|
| `/about-us/` | `/about/` |
| `/computer-repair/`, `/repairs/`, `/computer-help-near-me/` | `/computer-repairs/` |
| `/computer-support-bournemouth/` | `/it-support-bournemouth/` |
| `/computer-repair-near-me-service-support-{town}/` | matching `/it-support-{town}/` (Poole, Bournemouth, Boscombe→Bournemouth, Canford Heath→Poole, Christchurch, Ferndown, Wimborne, Verwood, Wareham) |
| all other `…-near-me-…-{town}` pages | `/areas-covered/` |
| `/microsoft-office-support/` | `/microsoft-365-support/` |
| `/email-hosting/`, `/website-email-hosting/` | `/web-design-hosting/` |
| `/windows-11-upgrade-dell/` and the Win11 post | `/windows-11-support/` |
| `/prices/`, `/products/` | `/pricing/` |
| `/support/`, `/home-computer-support/` | `/home-it-support-subscriptions/` |
| `/book-now/` | `/book-service/` |
| `/terms-of-service/` | `/terms/` |
| `/privacy/` | `/privacy-policy/` |
| `/faq/`, `/f-a-q/` | `/faqs/` |
| `/blog/` + old articles | `/it-advice/` (some → `/remote-it-support/`, `/wifi-support/`, `/it-support-for-home-workers/`) |
| old Yoast sitemaps | `/sitemap.xml` |

Unchanged (already match the new site, no redirect): `/contact/`, `/reviews/`, `/refer-a-friend/`.
Old WordPress account/shop pages (`/cart/`, `/checkout/`, `/members/`, `/forums/`, …) have no
equivalent and correctly fall through to the branded **404** — Google drops them naturally.

---

## 4. Test after go-live
- [ ] `https://365techies.co.uk` loads with styling + animation.
- [ ] Deep pages resolve (e.g. `/gaming-pcs/`, `/it-support-poole/`, `/starlink-internet/`).
- [ ] An **old URL redirects** (e.g. `/about-us/` → `/about/`, `/computer-repair/` → `/computer-repairs/`).
- [ ] A fake URL shows the new **404** page.
- [ ] `http://` and `www.` both redirect to `https://` non-www.
- [ ] `/sitemap.xml` and `/robots.txt` load.
- [ ] Cookie banner appears; contact/booking forms open the email app.
- [ ] Mobile check.

---

## 5. Search engines
- [ ] **Google Search Console** — already verified via DNS (survives the switch).
      → Sitemaps → submit `sitemap.xml` → URL Inspection → Request indexing on key pages.
- [ ] **Bing Webmaster Tools** (bing.com/webmasters) → **Import from Google Search Console**
      (auto-verifies) → confirm sitemap → request indexing.
- [ ] (Optional) **Google Analytics** — provide the `G-…` Measurement ID to wire in
      (consent-gated). Currently not installed.

---

## 6. Account-side finishing touches (when ready)
- [ ] **GoCardless** — add the 4 `pay.gocardless.com/BRT…` Direct Debit links.
- [ ] **HubSpot** — publish the live-chat chatflow.
- [ ] **Google Business Profile** — complete fully, add photos, post weekly (top local-ranking lever).
- [ ] **Reviews** — keep earning + replying to Google reviews.
- [ ] **Accuracy check** — confirm partnership wording (NVIDIA / Scan / Richer Sounds /
      Malwarebytes) and legal pages (ICO number, registered address) match reality.
- [ ] Add real **team photos/bios** (Meet the Team) and any **named case studies** with permission.

---

*Built as a static site generated by the Python build scripts. To update content later:
edit the build files, run `python build_blog.py`, then re-upload the changed files and
flush the SiteGround cache.*
