"""Techies One Mail on the email fix pages (10 Oct 2026). Owner: "put this techies one mail on all the email pages ...
the ones you've said that it's a fix".

Which pages, and what each box says, come from the 10 Oct audit of all 102 email pages (D:\\claude\\seo-research\\
t1-email-fit-2026-10-10: six judges + a sceptic, against what the app can really do): the straight fixes (BT, Sky,
Plusnet email that won't go into the new Outlook; moving Plusnet email to Gmail) and the new-Outlook pages where it is an
honest alternative. Left out on purpose:
  - /new-outlook-blank-screen/: Techies One draws its window with the same Edge engine as the new Outlook, so a graphics
    fault that blanks one could blank the other;
  - every Virgin Media page: 365 PC Manager and the Email Mover add-on already do that move, signed and with no app
    password - a second app for the same job would confuse people;
  - phone, Mac, account, server, business-admin and scam-emergency pages: it can't help there, or it would look
    opportunistic.

The box goes straight after "Fix it with me" (#fixflow): the visitor tries the fix first, then sees the other way. The
download link and version come from downloads/t1/version.json, so a release needs only a rebuild; the version span and
the installer's name are volatile in the content hash (build_pages._VOLATILE), so a new release re-dates nothing.
Download clicks are counted by the visitors beacon as /~dl/t1/ (build_pages), shown on the portal's installs card.
"""
import json
import os
import re

import build_pages as bp

FIX, ALT = "fix", "alt"

# slug: (kind, heading, what it does for this visitor, what they must know)
PAGES = {
    "btinternet-email-wont-add-to-new-outlook": (FIX, "Rather skip the new Outlook?",
        "Our free Techies One Mail for Windows PCs has BT&rsquo;s settings built in and uses your normal BT email password.",
        "If you&rsquo;ve left BT broadband and your mailbox has dropped to BT Basic, it only works on bt.com: no email program "
        "can open it, Techies One included."),
    "cant-send-btinternet-email-new-outlook": (FIX, "Rather skip the new Outlook?",
        "Our free Techies One Mail for Windows PCs already has BT&rsquo;s sending settings built in and uses your normal BT "
        "email password.",
        "Use your BT email password, not your broadband PIN. BT Basic email (kept after leaving BT broadband) only works on "
        "bt.com, so no email program can send from it, Techies One included."),
    "sky-email-wont-add-to-new-outlook": (FIX, "Rather skip the new Outlook?",
        "Our free Techies One Mail for Windows PCs sets up Sky email for you with your normal Sky iD password.",
        "Changed your Sky iD password lately? Use &ldquo;Unlock your emails&rdquo; on sky.com first: until then every email "
        "program is refused, Techies One included."),
    "plusnet-email-wont-add-to-new-outlook": (FIX, "Rather skip the new Outlook?",
        "Our free Techies One Mail for Windows PCs has Plusnet&rsquo;s settings built in, and if you move to Gmail it can "
        "copy your Plusnet email across too.",
        "It reads your email from Plusnet&rsquo;s server (IMAP), not POP. Older force9 and free-online addresses may need "
        "their settings typing in. If a Plusnet mailbox closes or lapses, no program can reach it, so copy what you want "
        "to keep first."),
    "move-plusnet-email-to-gmail": (FIX, "Copy your Plusnet email to Gmail yourself, free",
        "On a Windows PC, our free Techies One Mail can copy all your Plusnet email into Gmail, folder by folder, and it "
        "never deletes anything.",
        "Gmail needs a Google app password, which needs 2-Step Verification switching on first. A big mailbox can take a "
        "few days, because Gmail only accepts about 500 MB a day; it carries on by itself. Do it while your Plusnet "
        "mailbox still works, and remember to tell people your new Gmail address."),
    "new-outlook-not-syncing": (ALT, "Fed up with the new Outlook?",
        "Our free Techies One Mail is a simpler email program for Windows PCs. It won&rsquo;t fix Outlook, but it can take "
        "its place for your email.",
        "Keep Outlook if you need it for work. Gmail, Yahoo, AOL and Virgin Media need an app password. Hotmail and "
        "Outlook.com sign in on Microsoft&rsquo;s own page, which may call the app &ldquo;unverified&rdquo; while we finish "
        "Microsoft&rsquo;s checks. A work Microsoft 365 address may need your IT person to approve it."),
    "new-outlook-only-showing-recent-emails": (ALT, "Rather not fight the new Outlook?",
        "Our free Techies One Mail reads your email straight from your provider, and its search looks through old "
        "messages too.",
        "It shows email that&rsquo;s still on your provider&rsquo;s server: it can&rsquo;t open old .pst archive files. A "
        "work Microsoft 365 address may need your IT person to approve it."),
    "new-outlook-no-send-receive-button": (ALT, "Rather not wrestle with the new Outlook?",
        "Our free Techies One Mail is a simpler email program for Windows PCs that works with BT, Sky, Plusnet, Gmail, "
        "Hotmail and more.",
        "Gmail, Yahoo, AOL and Virgin Media need an app password. Hotmail and Outlook.com sign in on Microsoft&rsquo;s own "
        "page, which may call the app &ldquo;unverified&rdquo; while we finish Microsoft&rsquo;s checks. Not for anyone who "
        "needs Outlook&rsquo;s add-ins or shared mailboxes."),
    "new-outlook-emails-stuck-in-drafts": (ALT, "Rather not use the new Outlook?",
        "Our free Techies One Mail for Windows PCs sends straight from your PC to your email provider.",
        "It doesn&rsquo;t repair the new Outlook. An attachment that&rsquo;s too big, or a wrong address, fails in any "
        "email program. Gmail, Yahoo, AOL and Virgin Media need an app password."),
}

POINTS = [
    "Free, from 365 Techies, the family IT firm that wrote this guide",
    "Signed by 365 Techies Ltd, and it keeps itself up to date",
    "Big, clear buttons, and warnings about scam emails",
    "Your email and passwords stay on your PC: we never see them",
]

STYLE = """      <style>
        .t1m{border:1px solid rgba(125,170,220,.28);border-radius:16px;background:rgba(125,170,220,.06);padding:clamp(1.1rem,3vw,1.8rem);display:flex;flex-direction:column;gap:.75rem}
        .t1m h2{margin:0;font-size:clamp(1.3rem,2.6vw,1.7rem);line-height:1.2}
        .t1m p{margin:0}
        .t1m__lede{font-size:1.08rem}
        .t1m__pts{margin:0;padding:0;list-style:none;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,20rem),1fr));gap:.45rem 1.2rem}
        .t1m__pts li{display:flex;gap:.5rem;align-items:flex-start;line-height:1.45}
        .t1m__pts li::before{content:"\\2713";color:var(--pgood,#00ce1b);font-weight:700;flex:0 0 auto}
        .t1m__note{color:var(--muted);font-size:.95rem;line-height:1.5}
        .t1m__cta{display:flex;flex-wrap:wrap;gap:.6rem;margin-top:.2rem}
        .t1m__cta .button{flex:1 1 15rem;text-align:center}
        .t1m__small{color:var(--faint,var(--muted));font-size:.72rem;letter-spacing:.04em}
      </style>
"""


def latest():
    """The newest signed release (downloads/t1/version.json): (url, version, size in MB), or None."""
    try:
        with open(os.path.join(bp.BASE, "downloads", "t1", "version.json"), encoding="utf-8") as f:
            v = json.load(f)
        if re.fullmatch(r"https://365techies\.co\.uk/downloads/t1/TechiesOneMail-Setup-[0-9.]+\.exe", v.get("url", "")):
            return v["url"], v["ver"], max(1, round(int(v.get("size") or 0) / 1_000_000))
    except (OSError, ValueError, KeyError):
        pass
    return None


def box(slug):
    kind, heading, lede, note = PAGES[slug]
    rel = latest()
    if not rel:
        return ""
    url, ver, mb = rel
    eyebrow = "// ANOTHER WAY &middot; OUR FREE EMAIL PROGRAM" if kind == FIX else "// OR SKIP THE NEW OUTLOOK"
    path = url.replace("https://365techies.co.uk", "")
    points = "".join(f"<li>{p}</li>" for p in POINTS)
    return f"""    <section class="section t1mail" aria-label="Techies One Mail" id="techies-one-mail">
      <div class="wrap" style="max-width:880px">
{STYLE}        <div class="t1m">
          <p class="eyebrow mono">{eyebrow}</p>
          <h2>{heading}</h2>
          <p class="t1m__lede">{lede}</p>
          <ul class="t1m__pts">{points}</ul>
          <p class="t1m__note">{note}</p>
          <p class="t1m__cta"><a class="button primary button--lg" href="{path}">Download Techies One Mail, free</a><a class="button secondary button--lg" href="tel:+441202775566">Rather we set it up? 01202 775566</a></p>
          <p class="t1m__small mono">FOR WINDOWS 10 AND 11 PCs<span class="t1v"> &middot; VERSION {ver} &middot; {mb} MB</span> &middot; NOT FOR MAC, IPHONE OR ANDROID</p>
        </div>
      </div>
    </section>
"""


def _section_end(html, start):
    """Where the <section> opening at `start` closes (sections can nest)."""
    depth, i = 0, start
    for m in re.finditer(r"<(/?)section\b", html[start:]):
        depth += -1 if m.group(1) else 1
        if depth == 0:
            end = html.index(">", start + m.end()) + 1
            return end
    return -1


def insert(slug, html):
    """The page filter: the box straight after "Fix it with me" on the chosen pages; every other page untouched."""
    if slug not in PAGES or 'id="techies-one-mail"' in html:
        return html
    i = html.find('<section class="section" aria-label="Fix it with me" id="fixflow"')
    end = _section_end(html, i) if i >= 0 else -1
    if end < 0:
        raise SystemExit("techies_one_boxes: no 'Fix it with me' section on /%s/ - the box has nowhere to go" % slug)
    b = box(slug)
    return html[:end] + "\n" + b + html[end:] if b else html


bp.PAGE_FILTERS.append(insert)
