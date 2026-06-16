# 365 Techies — Go-Live Checklist

Everything needed to take the new static site live on **SiteGround**, replacing the
old WordPress site at **https://365techies.co.uk** (canonical: HTTPS, non-www).

The site is plain static HTML/CSS/JS — no database, PHP or Node needed on the server.

---

## How hosting works here (read this first)

Two **separate** jobs — keep them apart:

| Job | Where | Why |
|---|---|---|
| **Version control + backup** (your source & history) | **GitHub — private repo** *(recommended)* | Off-machine backup, full change history, free, and independent of your web host |
| **Serving the live website** | **SiteGround** | Where visitors actually load `365techies.co.uk` |

> **Where should the git repo live? → GitHub (private).** Do **not** make SiteGround your only repo:
> shared-hosting git is limited and you'd lose your history if you ever change hosts. Keep GitHub as
> the single source of truth; SiteGround just serves a *copy* of the built files.

**The normal update workflow once everything is set up:**
1. Edit the Python build files → run `python build_blog.py` (regenerates all pages + sitemap + 404).
2. `git add -A && git commit -m "…"` → `git push` (history saved to GitHub).
3. Get the changed static files onto SiteGround (manual upload, or auto-deploy) → **flush SiteGround cache**.

---

## A. Version control — push to GitHub (one-time)

This repo is already initialised with an initial commit (192 files). You just need to add a remote
and push. `gh` (GitHub CLI) isn't installed and there's no SSH key, but **Git Credential Manager is
configured**, so an HTTPS push uses your saved GitHub login (or shows a one-time sign-in window).

1. [ ] **github.com → New repository**: name it (e.g. `365techies-website`), choose **Private**, and
       **do NOT** tick *Add a README / .gitignore / licence* — it must be **empty**.
2. [ ] Copy the repo URL, then from `C:\claude\365-techies` run:
       ```bash
       git remote add origin https://github.com/<your-username>/365techies-website.git
       git push -u origin master
       ```
       *(If a sign-in window appears, complete it — that authorises the push. Nothing else needed.)*
3. [ ] Day-to-day after that: `git add -A && git commit -m "…"` then `git push`.

> Prefer GitLab/Bitbucket? Same idea — create an empty private repo there and use its URL in step 2.

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
- [ ] **All page folders** (~155 `slug/index.html` folders — e.g. `cybersecurity-support/`,
      `gaming-pcs/`, `it-support-new-forest/`, `starlink-internet/`, …)
- [ ] `css/` and `js/` folders
- [ ] `sitemap.xml`, `robots.txt`, `llms.txt`, `site.webmanifest`
- [ ] `.htaccess`  ← **enable "Show hidden files" in File Manager so this uploads**
- [ ] Icons/images: `favicon.svg`, `apple-touch-icon.png`, `og-image.jpg`, `logo.jpg`

## 1b. What NOT to upload (dev/source — keep off the live server)
- [ ] Generators: `build_pages.py`, `build_local.py`, `build_extra.py`, `build_blog.py`
- [ ] Tooling: `package.json`, `package-lock.json`, `eslint.config.mjs`, `tsconfig.json`,
      `remotion.config.ts`, `.prettierrc`, `.gitignore`, `README.md`, this `GO-LIVE.md`
- [ ] Repo/dev folders: `.git/`, `.github/`, `.claude/`, `__pycache__/`, `node_modules/`, `src/`
- [ ] `index-classic.html`, `open-in-edge.bat`, `logo-original.webp`

> Tip: only the **public site files** in section 1 belong on SiteGround. The build scripts and the
> (unrelated) `src/` Remotion scaffold are dev-only — harmless if left in the repo, but never upload them.

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

## 2b. Faster / automated deployment (optional)

Section 2 uses **File Manager** — zero setup, fine for occasional updates. Two upgrades:

**SFTP (quicker re-uploads).** In Site Tools → *Devs → FTP Accounts*, create an account, then connect
with **FileZilla** (`sftp://…`, your FTP user + password, the port shown in Site Tools) and drag the
section-1 files into `public_html`. Best if you update often.

**SiteGround Git deploy (GrowBig / GoGeek / Cloud plans).** If your plan includes SSH, Site Tools →
*Devs → Git* can host a repo on the server that deploys to `public_html` on push. Treat it as a
*deploy target only* — keep GitHub as your source of truth and push to both (or mirror to it).

**Auto-deploy on every push (advanced, "set & forget").** Commit the workflow below as
`.github/workflows/deploy.yml`, then in GitHub → *Settings → Secrets and variables → Actions* add
`DEPLOY_SERVER`, `DEPLOY_USER`, `DEPLOY_PASSWORD` from your SiteGround FTP account. Every push to
`master` then uploads only the public files automatically:

```yaml
name: Deploy to SiteGround
on:
  push:
    branches: [master]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: SamKirkland/FTP-Deploy-Action@v4.3.5
        with:
          protocol: ftps          # use the protocol your SiteGround account supports (ftps or sftp)
          server: ${{ secrets.DEPLOY_SERVER }}
          username: ${{ secrets.DEPLOY_USER }}
          password: ${{ secrets.DEPLOY_PASSWORD }}
          # port: 21              # set if your account needs a non-default port
          server-dir: public_html/
          exclude: |
            **/.git*
            **/.github/**
            **/__pycache__/**
            **/node_modules/**
            src/**
            "*.py"
            package*.json
            "*.config.*"
            tsconfig.json
            .prettierrc
            README.md
            GO-LIVE.md
            index-classic.html
            open-in-edge.bat
```

> Confirm your SiteGround protocol/port (SFTP vs FTPS) in Site Tools and match the `protocol` line.
> The `exclude` list keeps dev/source off the server. After a deploy, still **flush the cache**.

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

*Built as a static site generated by the Python build scripts. To update later: edit the build
files → `python build_blog.py` → `git add -A && git commit -m "…" && git push` → re-upload the
changed files to SiteGround (or let auto-deploy handle it) → flush the SiteGround cache.*
