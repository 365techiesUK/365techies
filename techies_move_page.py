"""/techies-move/ - the Techies Move product page and download (22 Oct 2026, owner: "do we have a page for this techies move
now? ... optimized ... SEO, AI ... link it all in on our nav").

Techies Move is the fourth 365 Techies program (after 365 PC Manager, Techies One and Techies PDF): it moves a person's
files, favourites and email settings from an old Windows PC to a new one through a USB stick or external drive, then can
keep that drive as a backup. Research: D:\\claude\\seo-research\\pc-mover-2026-10-22\\FINDINGS.md (Bing UK, 3 months: the
job's own phrasings get ~0; people search names - windows backup 3,834, file history 978, laplink pcmover 149, windows easy
transfer 111, easeus todo pctrans 91, chrome passwords 248, outlook signature 883). Microsoft removed Windows 11's own
PC-to-PC Migration (support note, Sep 2026). Source: D:\\claude\\techies-move (README there).

Rules, from what the program really does (0.2.0):
  - it COPIES: nothing on the old PC is changed or deleted, and nothing on the new PC is written over (a different file
    of the same name is kept alongside, with "(from old PC)" on its name);
  - it never reads or copies passwords: it lists the email addresses and browser sign-ins the person will need passwords
    for, and says how to check them while the old PC still works (Chrome's saved passwords: Chrome sync, or Chrome's own
    export/import, which is plain text);
  - programs can't be copied: it lists them, and on the new PC Windows' own App Installer (winget) can install many again;
  - favourites go across as the bookmarks file every browser imports (Edge, Chrome incl. Google-account favourites, Brave,
    Firefox); email = Outlook data files (.pst), signatures and the account settings, not the provider's mailbox;
  - files only in OneDrive aren't copied (they come back from OneDrive); a FAT32 stick can't take a file of 4 GB or more;
  - the signed-in Windows user's own folders (plus any folder they add); both PCs must run Windows 10 or 11, 64-bit;
  - backup: same layout as a move, adds new and changed files, the older copy of a changed file goes into "Earlier
    versions", nothing on the drive is deleted; weekly reminder = a Windows notification (a task for that user);
  - it never contacts us or anyone else: no check-in, no update check (so "new versions will be on this page");
  - the pictures are the real program in a fresh Windows 11 (Windows Sandbox) with a made-up person's files ("Jean"),
    and a test drive standing in for the USB stick: the captions say so;
  - other companies' names only to say what it replaces or works with, with the trademark note; no star rating.
The download, version and size come from downloads/tmove/version.json, and the build stops if the installer is missing.
"""
import json
import os
import re

import build_pages as bp

SLUG = "techies-move"
NAME = "Techies Move"
TAG = "v1"                    # pictures of 0.2.0 (22 Oct 2026). Cached for a year: a new look = a new tag
OG = f"/images/tmove-og-{TAG}.jpg"
# the pictures' heights at 1440 wide (cropped from the sandbox window captures by D:/claude/sandbox-tests/techies-move/shots.py)
DIMS = {}
try:
    with open(os.path.join(bp.BASE, "images", f"tmove-dims-{TAG}.json"), encoding="utf-8") as _f:
        DIMS = json.load(_f)
except (OSError, ValueError):
    raise SystemExit("techies_move_page: images/tmove-dims-%s.json is missing - make the pictures first" % TAG)


def release():
    """The newest signed release: {url, path, ver, size, sha256, notes}, or None if version.json is unreadable, points
    elsewhere, or its installer is not in the site."""
    try:
        with open(os.path.join(bp.BASE, "downloads", "tmove", "version.json"), encoding="utf-8") as f:
            v = json.load(f)
        url = v.get("url", "")
        if not re.fullmatch(r"https://365techies\.co\.uk/downloads/tmove/TechiesMove-Setup-[0-9.]+\.exe", url):
            return None
        path = url.replace("https://365techies.co.uk", "")
        if not os.path.isfile(os.path.join(bp.BASE, path.lstrip("/").replace("/", os.sep))):
            return None
        return {"url": url, "path": path, "ver": v["ver"], "size": int(v.get("size") or 0),
                "sha256": v.get("sha256", ""), "notes": v.get("notes", "")}
    except (OSError, ValueError, KeyError):
        return None


REL = release()
if not REL:
    raise SystemExit("techies_move_page: downloads/tmove/version.json or its installer is missing - no product page without a download")
MB = f"{round(REL['size'] / 1_048_576)} MB"   # as Windows and Edge show it


def shot(name, alt, eager=False):
    base = f"/images/tmove-{name}-{TAG}"
    lazy = "" if eager else ' loading="lazy"'
    return (f'<img src="{base}-720.webp" srcset="{base}-720.webp 720w, {base}-1440.webp 1440w" '
            f'sizes="(max-width:880px) 100vw, 640px" width="1440" height="{DIMS[name]}" alt="{alt}"{lazy} decoding="async">')


CSS = """    <style>
      .tmv{--tmedge:rgba(92,211,201,.26);--tmfill:rgba(92,211,201,.06)}
      .tmv [id]{scroll-margin-top:96px}
      .tmv-shot{margin:0;border:1px solid var(--tmedge);border-radius:14px;overflow:hidden;background:#f3f4f4;box-shadow:0 18px 50px rgba(0,0,0,.35)}
      .tmv-shot img{display:block;width:100%;height:auto}
      .tmv-cap{margin:.5rem 0 0;font-size:.82rem;color:var(--muted);text-align:center}
      .tmv-dl{max-width:880px;margin:0 auto;border:1px solid var(--tmedge);border-radius:16px;background:var(--tmfill);padding:clamp(1.1rem,3vw,1.8rem);display:flex;flex-direction:column;gap:.8rem}
      .tmv-dl h2,.tmv h2{margin:0}
      .tmv-dl p{margin:0}
      .tmv-btns{display:flex;flex-wrap:wrap;gap:.6rem}
      .tmv-btns .button{flex:1 1 15rem;text-align:center}
      .tmv-btns .ms-store-badge{flex:0 0 auto;display:flex;align-items:center}
      .tmv-btns .ms-store-badge img{display:block;height:4.25rem;width:auto}
      @media (min-width:700px){.tmv-btns .button.primary{white-space:nowrap}}
      @media (max-width:699px){.tmv-btns .ms-store-badge{margin:0 auto}}
      .tmv-meta{font-size:.78rem;letter-spacing:.04em;color:var(--muted)}
      .tmv-steps{margin:0;padding:0;list-style:none;display:grid;gap:.45rem}
      .tmv-steps li{line-height:1.5}
      .tmv details{border:1px solid var(--tmedge);border-radius:10px;padding:.6rem .9rem}
      .tmv details summary{cursor:pointer;font-weight:600}
      .tmv details p{margin:.5rem 0 0}
      .tmv-wrap{max-width:1100px;margin:0 auto}
      .tmv-lede{max-width:46rem;color:var(--muted);font-size:1.05rem;line-height:1.6;margin:.4rem 0 1.4rem}
      .tmv p a:not([class]),.tmv li a:not([class]),.tmv td a:not([class]){color:var(--cyan);text-decoration:underline;text-underline-offset:2px}
      .tmv p a:not([class]):hover,.tmv li a:not([class]):hover,.tmv td a:not([class]):hover{color:#fff}
      .tmv-parts{list-style:none;margin:1.2rem 0 0;padding:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.7rem}
      @media (max-width:860px){.tmv-parts{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media (max-width:300px){.tmv-parts{grid-template-columns:1fr}}
      .tmv-parts a{display:flex;flex-direction:column;gap:.35rem;height:100%;box-sizing:border-box;border:1px solid var(--tmedge);border-radius:12px;padding:.85rem .9rem;background:var(--tmfill);color:inherit;text-decoration:none;transition:border-color .2s ease,background .2s ease}
      .tmv-parts a:hover,.tmv-parts a:focus-visible{border-color:var(--cyan);background:rgba(29,151,227,.12)}
      .tmv-parts svg{width:1.9rem;height:1.9rem;color:#5cd3c9}
      .tmv-parts b{font-size:1.05rem}
      .tmv-parts span{color:var(--muted);font-size:.9rem;line-height:1.4}
      .tmv-feats{display:grid;gap:clamp(1.6rem,4vw,2.8rem)}
      .tmv-feat{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.25fr);gap:clamp(1rem,3vw,2.2rem);align-items:center}
      .tmv-feat:nth-child(even) .tmv-feat__txt{order:2}
      .tmv-feat h3{margin:0 0 .4rem;font-size:clamp(1.2rem,2.4vw,1.5rem)}
      .tmv-feat p{margin:0 0 .5rem;line-height:1.6}
      .tmv-feat .tmv-prob{font-size:.8rem;letter-spacing:.06em;text-transform:uppercase;color:#5cd3c9;margin:0 0 .35rem}
      .tmv-list{margin:0;padding-left:1.2rem;display:grid;gap:.4rem;max-width:52rem}
      .tmv-list li{line-height:1.55}
      .tmv-two{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,22rem),1fr));gap:1.2rem}
      .tmv-card{border:1px solid var(--tmedge);border-radius:14px;padding:1.1rem 1.2rem;background:var(--tmfill)}
      .tmv-card h3{margin:0 0 .5rem;font-size:1.15rem}
      .tmv-table{width:100%;max-width:40rem;border-collapse:collapse;margin:.4rem 0 1rem}
      .tmv-table th,.tmv-table td{text-align:left;padding:.55rem .7rem;border-bottom:1px solid var(--tmedge)}
      .tmv-table th{font-size:.85rem;letter-spacing:.04em;color:var(--muted);font-weight:600}
      .tmv-tm{font-size:.78rem;color:var(--muted);max-width:60rem;margin:1.6rem auto 0;text-align:center;line-height:1.5}
      @media (max-width:860px){.tmv-feat{grid-template-columns:1fr}.tmv-feat:nth-child(even) .tmv-feat__txt{order:0}}
    </style>
"""


def hero():
    return f"""{CSS}    <section class="page-hero dh dh-hero tmv" aria-label="Introduction">
      <div class="dh-hero__grid">
        <div>
          <nav class="breadcrumb" aria-label="Breadcrumb">{bp.bc_sub("Free Tools", "/free-tools/", NAME)}</nav>
          <p class="eyebrow mono">// FREE FOR WINDOWS 11 &amp; 10 &middot; BY USB STICK &middot; NOTHING UPLOADED &middot; SIGNED BY 365 TECHIES LTD</p>
          <h1><em class="grad grad--cyan">Techies Move</em>: the free way to move everything from your old PC to your new one</h1>
          <p class="lede"><strong>Techies Move</strong> is a free program for Windows 11 and 10 from 365 Techies, the family-run IT firm in Bournemouth. It copies your <strong>photos, documents, desktop, music, videos and downloads</strong>, your <strong>favourites</strong> from Edge, Chrome or Firefox, your <strong>Outlook email files and signatures</strong> and your desktop picture onto a USB stick or external hard drive, then puts them all in the right places on the new PC. It tells you <strong>what size of USB stick to buy</strong>, lists the <strong>passwords you&rsquo;ll need</strong> before you switch the old PC off, and afterwards can <strong>keep the stick as your backup</strong>. Nothing is deleted, nothing on the new PC is written over, and nothing goes on the internet.</p>
          <div class="page-hero__cta">
            <a href="#download" class="button primary button--lg">Download it free</a>
            <a href="tel:+441202775566" class="button secondary button--lg">Rather we did the move? 01202 775566</a>
          </div>
          <a class="dh-rating" href="/reviews/"><span><span aria-hidden="true">&#9733;&#9733;&#9733;&#9733;&#9733;</span> <strong>Our firm is rated 4.9 on Google</strong></span><span>365 Techies &middot; family-run since 1995</span></a>
          <p class="page-hero__byline mono"><span class="page-hero__byline-by">By the </span><a href="/meet-the-team/">365 Techies team</a> &middot; Reviewed __LASTMOD_HUMAN__</p>
        </div>
        <figure style="margin:0">
          <div class="tmv-shot">{shot("pack", "Techies Move on the old computer: Pack up your old computer, with This needs 267 MB, so a 16 GB USB stick or bigger is enough, the drive chosen and marked Room for all of it, and Desktop, Documents, Pictures, Videos, Music and Downloads ticked with how many files each holds", eager=True)}</div>
          <figcaption class="tmv-cap">The real program in a fresh Windows 11, with a made-up person&rsquo;s files. A test drive stands in for the USB stick.</figcaption>
        </figure>
      </div>
    </section>"""


PROOF = """    <section class="dh dh-sec dh-proof" aria-label="The deal, in four facts">
      <div class="dh-in">
        <ul class="dh-facts">
          <li class="hp-c-care"><b>&pound;0</b><span>for the program, with no adverts and no account</span></li>
          <li class="hp-c-fix"><b>Nothing lost</b><span>the old PC isn&rsquo;t changed, and nothing on the new one is written over</span></li>
          <li class="hp-c-buy"><b>Signed</b><span>by 365 Techies Ltd, checked by Windows</span></li>
          <li class="hp-c-biz"><b>A person</b><span>to ring: 01202 775566, Mon to Fri 9 to 5; any paid work is priced first</span></li>
        </ul>
      </div>
    </section>"""

STEPS = [
    ("Download it on both computers", f"Press the Download button on the old PC, and again on the new one. The file is called TechiesMove-Setup-{REL['ver']}.exe and is signed by 365 Techies Ltd. It installs in a few seconds and needs no administrator password."),
    ("On the old PC, plug in a USB stick and pack up", "Choose <strong>This is my OLD computer</strong>. Techies Move counts what you have and says what size of stick you need. Choose the stick, untick anything you don&rsquo;t want, and press <strong>Start copying</strong>. Your old PC isn&rsquo;t changed."),
    ("On the new PC, put it back", "Plug the stick into the new PC, open Techies Move, choose <strong>This is my NEW computer</strong> and press <strong>Put it on this PC</strong>. Your pictures go into Pictures, your documents into Documents, and so on, and it shows you what to do next for your favourites, Chrome and email."),
]


def download():
    steps = "".join(f"<li><strong>{i}. {n}.</strong> {t}</li>" for i, (n, t) in enumerate(STEPS, 1))
    return f"""    <section class="section tmv" id="download" aria-label="Download Techies Move">
      <div class="wrap">
        <div class="tmv-dl">
          <p class="eyebrow mono">// DOWNLOAD &middot; FREE &middot; WINDOWS 10 &amp; 11</p>
          <h2>Get Techies Move</h2>
          <p>The program is free for everyone, at home or at work: no trial, no account to make with us, no adverts and no limit on how much it moves. You&rsquo;ll need a USB stick or external hard drive with enough room; Techies Move tells you how much.</p>
          <div class="tmv-btns">
            <a class="button primary button--lg" href="{REL['path']}" download>Download Techies Move (Windows)</a>
            <a class="ms-store-badge" href="https://apps.microsoft.com/detail/XPFCXK6CK201FQ?mode=direct" aria-label="Download from the Microsoft Store"><img src="/images/ms-store-badge-en-gb-dark.svg" alt="Download from the Microsoft Store" width="161" height="44" loading="lazy"></a>
            <a class="button secondary button--lg" href="tel:+441202775566">Rather we did the move? 01202 775566</a>
          </div>
          <p class="tmv-meta mono">FOR WINDOWS 10 AND 11 (64-BIT)<span class="tmv-v"> &middot; VERSION {REL['ver']} &middot; {MB}</span> &middot; DIGITALLY SIGNED BY 365 TECHIES LTD &middot; NOT FOR MAC, IPHONE OR ANDROID</p>
          <ol class="tmv-steps">{steps}</ol>
          <details>
            <summary>What will Windows say when I open it?</summary>
            <p>Usually nothing: it&rsquo;s digitally signed by 365 Techies Ltd. But a brand-new program can get a warning or two while Windows gets to know it. <strong>When downloading</strong>, Edge may say the file &ldquo;isn&rsquo;t commonly downloaded&rdquo;: press the three dots next to it, choose <strong>Keep</strong>, then <strong>Show more</strong> and <strong>Keep anyway</strong>. <strong>When you open it</strong>, you may see a blue &ldquo;Windows protected your PC&rdquo; box: choose <strong>More info</strong>, check that the Publisher line says <strong>365 Techies Ltd</strong>, then choose <strong>Run anyway</strong>. If the publisher says anything else, don&rsquo;t run it, and ring us.</p>
          </details>
          <details>
            <summary>Does it need the internet?</summary>
            <p>Only to download it. The move itself goes through the USB stick, so the two PCs don&rsquo;t need to be connected to each other, or to anything else, and your files never go online.</p>
          </details>
        </div>
      </div>
    </section>"""


ICONS = {
    "folders": '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M8 13h8"/>',
    "favourites": '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
    "email": '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    "passwords": '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3M12 15v2"/>',
    "stick": '<rect x="7" y="9" width="10" height="13" rx="2"/><path d="M9 9V3h6v6M10.5 5.5h.01M13.5 5.5h.01"/>',
    "programs": '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 8h18M7 12h4M7 16h7"/>',
    "picture": '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 16l5-5 4 4 3-3 6 6"/><circle cx="15.5" cy="9" r="1.3"/>',
    "backup": '<path d="M4 12a8 8 0 1 0 3-6.2"/><path d="M4 4v4h4"/><path d="M12 8v4l3 2"/>',
}
PARTS = [
    ("folders", "Your folders", "Desktop, Documents, Pictures, Videos, Music, Downloads, and any folder you add", "pack"),
    ("favourites", "Favourites", "From Edge, Chrome (including your Google account&rsquo;s), Brave and Firefox", "done"),
    ("email", "Email", "Outlook files, signatures, and every address with its settings", "email"),
    ("passwords", "Passwords to check", "Which you&rsquo;ll need on the new PC, checked while the old one works", "passwords"),
    ("stick", "The right size stick", "It works out what size of USB stick to buy, and checks yours has room", "pack"),
    ("programs", "Your programs", "A list of them all, and Windows can install many again for you", "setup"),
    ("picture", "Desktop picture", "Your desktop picture, put on the new PC&rsquo;s desktop too", "setup"),
    ("backup", "Then a backup", "Keep the stick as your backup, with a reminder every week", "keep"),
]


def icon(k):
    return (f'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" '
            f'stroke-linejoin="round" aria-hidden="true">{ICONS[k]}</svg>')


def overview():
    tiles = "".join(f'<li><a href="#{a}">{icon(k)}<b>{n}</b><span>{d}</span></a></li>' for k, n, d, a in PARTS)
    return f"""    <section class="section section--alt tmv" id="features" aria-labelledby="tmv-features">
      <div class="wrap tmv-wrap">
        <p class="eyebrow mono">// WHAT IT MOVES</p>
        <h2 id="tmv-features">Everything people ask us to move, in one free program</h2>
        <p class="tmv-lede">When we set up a new computer for someone, these are the things they miss if they&rsquo;re left behind. Techies Move takes them across in plain steps, and tells you plainly about the few things no program can copy.</p>
        <figure style="margin:0;max-width:880px"><div class="tmv-shot">{shot("home", "The Techies Move start screen: Moving to a new computer? with two big buttons, This is my OLD computer and This is my NEW computer, and Back up this PC to a USB stick underneath")}</div></figure>
        <ul class="tmv-parts">{tiles}</ul>
      </div>
    </section>"""


# (anchor id = the picture's name, the problem, heading, what it does, the picture's alt text)
FEATS = [
    ("pack", "&ldquo;What size of USB stick do I need?&rdquo;",
     "It works out the size for you, then checks your stick has room",
     "On the old PC, Techies Move counts everything in your folders and tells you straight away, for example <strong>&ldquo;This needs 41 GB, so a 64 GB USB stick or bigger is enough&rdquo;</strong>, and a size up if you&rsquo;d like to keep the stick as your backup afterwards. Plug a stick in and each one says <strong>Room for all of it</strong>, or how much more room it needs. Older sticks formatted as FAT32 can&rsquo;t take a single file of 4 GB or more (a long home video, say), and it warns you about that too.",
     "Pack up your old computer: This needs 267 MB, so a 16 GB USB stick or bigger is enough, the drive marked Room for all of it, and the six folders ticked with their file counts (a made-up person&rsquo;s files)"),
    ("extras", "The things that aren&rsquo;t in your folders",
     "Favourites, email, your desktop picture and lists of what&rsquo;s installed",
     "Tick what to take: your <strong>favourites</strong> from every browser on the PC (Edge, Chrome, Brave and Firefox, including the favourites Chrome keeps in your Google account), <strong>Outlook data files</strong> (where the emails of older POP accounts live), your <strong>email signatures</strong> and a list of your email accounts and their settings, your <strong>desktop picture</strong>, and lists of your <strong>programs, printers and Wi-Fi networks</strong>. Got photos in another folder, or on a second drive? Press <strong>Add another folder</strong>.",
     "And these, all ticked: Email: Outlook files, signatures and your account settings, with 2 email addresses (BT Email, Gmail) and 1 signature; Your desktop picture; Lists of your programs, printers and Wi-Fi; then the start of Before you switch this PC off: your passwords (a made-up person&rsquo;s PC)"),
    ("passwords", "The thing that catches most people out",
     "Your passwords: checked while the old PC still works",
     "Techies Move <strong>never reads or copies passwords</strong>. Instead it lists every <strong>email address</strong> on the PC (from Outlook, the new Outlook and Thunderbird) and every browser you&rsquo;re signed in to, so you can check you know each password before the old PC goes. Each email address has a <strong>Check the password works</strong> button that opens your provider&rsquo;s webmail, and plain advice for BT, Sky, Virgin Media, TalkTalk, Plusnet, Gmail, Outlook.com and more. For Chrome it tells you whether your passwords are already saved in your Google account, and if not, how to take them.",
     "Before you switch this PC off: your passwords. A BT address with Outlook uses your BT email password, BT has no app passwords; a Gmail address with In the new Outlook, choose to sign in with Google; each with Check the password works (webmail) and Our guide; and Google Chrome (Jean): signed in with sync on, so favourites and saved passwords come back on the new computer (made-up addresses)"),
    ("setup", "On the new computer",
     "Put it all on the new PC, in the right places",
     "Plug the stick into the new PC and press <strong>Put it on this PC</strong>. Pictures go into Pictures, documents into Documents, and a folder you added goes into Documents in a folder named after the old PC. If the new PC already has a <em>different</em> file with the same name, both are kept: the old PC&rsquo;s gets &ldquo;(from old PC)&rdquo; on its name. Files keep their dates, so your photos stay in order.",
     "Set up your new computer: the move from JEANS-LAPTOP on the drive, with the folders to put back ticked, and Favourites, Email and Your desktop picture underneath (a made-up person&rsquo;s files)"),
    ("done", "Afterwards",
     "Then it shows you what to do next",
     "When the copying&rsquo;s done, Techies Move shows the next steps for what can&rsquo;t simply be copied: how to add your <strong>favourites</strong> to Edge or Chrome (with a button to the right page), which Google account to <strong>sign in to Chrome</strong> with (and a button to install Chrome if it isn&rsquo;t on the new PC), how to <strong>set up each email address</strong> in Outlook with its settings, and the programs <strong>Windows can install again</strong> for you, ticked one by one.",
     "Done: your files are on this PC. 9 files copied, 1 kept alongside a different file of the same name, then Add your favourites to your browser, with buttons for Edge&rsquo;s import page and Show the files (a made-up person&rsquo;s files)"),
    ("email", "&ldquo;Will my emails come across?&rdquo;",
     "Your email, set up again in minutes",
     "Most email today (BT, Sky, Gmail, Outlook.com, Virgin Media and more) is kept by your email company, so it all comes back as soon as you add your address in Outlook on the new PC. Techies Move lists each address with what to know (BT has no app passwords; Virgin Media needs an app password, and making a new one stops the old one working on your phone) and the settings, in case Outlook asks. Older POP accounts keep their emails in Outlook files on the PC: those are copied across and opened in Outlook on the new PC. Classic Outlook&rsquo;s signatures go straight back where it looks for them.",
     "Set up your email on the new PC: the BT address&rsquo;s settings (incoming mail.btinternet.com:993, outgoing mail.btinternet.com:465), a Gmail address with In the new Outlook, choose to sign in with Google, and Your email signatures: 1 signature is back in place for classic Outlook (made-up addresses)"),
    ("keep", "&ldquo;What do I do with the stick now?&rdquo;",
     "Keep the stick as your backup",
     "The stick already holds a copy of your files, so press <strong>Use this drive as my backup</strong> and it becomes your backup in seconds. From then on, plug it in and press <strong>Back up now</strong> on the start screen: Techies Move adds what&rsquo;s new or changed. If a file has changed, the copy from last time is kept in <strong>Earlier versions</strong>, and nothing on the stick is ever deleted. A Windows notification reminds you every week. To get files back, the same <strong>This is my NEW computer</strong> button puts a backup back, or just copy what you need off the stick.",
     "The full list of programs from the old PC, then Keep this drive as your backup: the drive already holds a copy of your files, so it can be your backup from now on, with the button Use this drive as my backup"),
    ("backup-card", "Every week after",
     "Back up now: one button, then unplug it",
     "The start screen says when you last backed up and whether your backup drive is plugged in. Press <strong>Back up now</strong>, wait a moment, then unplug the stick and keep it away from the PC, so it can&rsquo;t be harmed along with it. Want to back up a PC that isn&rsquo;t moving anywhere? Choose <strong>Back up this PC to a USB stick</strong> on the start screen.",
     "The start screen with Your backup: Last backed up today, your backup drive is plugged in, and the buttons Back up now and Change"),
]


def feat_blocks():
    out = []
    for fid, prob, h, body, alt in FEATS:
        out.append(f"""          <div class="tmv-feat" id="{fid}">
            <div class="tmv-feat__txt">
              <p class="tmv-prob mono">{prob}</p>
              <h3>{h}</h3>
              <p>{body}</p>
            </div>
            <figure style="margin:0"><div class="tmv-shot">{shot(fid, alt)}</div></figure>
          </div>""")
    return "\n".join(out)


def jobs():
    return f"""    <section class="section tmv" aria-labelledby="tmv-how">
      <div class="wrap tmv-wrap">
        <p class="eyebrow mono">// HOW A MOVE WORKS, WITH PICTURES</p>
        <h2 id="tmv-how">How to move to a new computer with Techies Move</h2>
        <p class="tmv-lede">The pictures are the real program in a fresh copy of Windows 11, moving a made-up person&rsquo;s files: &ldquo;Jean&rdquo;, her laptop and her new PC. A test drive stands in for the USB stick.</p>
        <div class="tmv-feats">
{feat_blocks()}
        </div>
      </div>
    </section>"""


# The program's own sum (static/app.js driveFor()): sizes as sold (1 GB = 1,000,000,000 bytes), about 95% usable, and the
# amount to move plus 10% and 0.5 GB spare. Its "This needs" figure is in Windows' GB (1,073,741,824 bytes), so the limits
# here are in those: 16 GB stick up to 12.4, 32 up to 25.3, 64 up to 51, 128 up to 102, 256 up to 205, 512 up to 411.
SIZES = [("Up to about 12 GB", "16 GB USB stick"), ("Up to about 25 GB", "32 GB USB stick"), ("Up to about 50 GB", "64 GB USB stick"),
         ("Up to about 100 GB", "128 GB USB stick"), ("Up to about 200 GB", "256 GB USB stick"), ("Up to about 400 GB", "512 GB USB stick"),
         ("More than that", "1 TB or 2 TB portable hard drive")]


def stick_sizes():
    rows = "".join(f"<tr><td>{a}</td><td>{b}</td></tr>" for a, b in SIZES)
    return f"""    <section class="section section--alt tmv" id="what-size-usb-stick" aria-labelledby="tmv-size">
      <div class="wrap tmv-wrap">
        <div class="tmv-two">
          <div>
            <p class="eyebrow mono">// WHAT SIZE OF STICK?</p>
            <h2 id="tmv-size">What size USB stick do I need to move to a new PC?</h2>
            <p style="line-height:1.6">It depends on how many photos and videos you have: a PC of letters and a few hundred photos may need 16 GB, while years of phone videos can need a portable hard drive. Techies Move counts it for you before you buy anything: open it on the old PC, choose <strong>This is my OLD computer</strong>, and it says how much there is and the size of stick that&rsquo;s enough. Untick Videos, say, and it works it out again.</p>
            <p style="line-height:1.6">If you&rsquo;d like to keep the stick as your backup afterwards, buy the next size up, so there&rsquo;s room to grow. A stick sold as 64 GB holds a little less than 64 GB in Windows, and the table allows for that.</p>
          </div>
          <div class="tmv-card">
            <h3>A rough guide</h3>
            <table class="tmv-table"><thead><tr><th>To move</th><th>Enough</th></tr></thead><tbody>{rows}</tbody></table>
            <p style="margin:0;color:var(--muted);font-size:.95rem">A stick formatted as FAT32 (common on older or smaller ones) can&rsquo;t hold a single file of 4 GB or more. Techies Move tells you if any of yours are that big.</p>
          </div>
        </div>
      </div>
    </section>"""


WHY = """    <section class="section tmv" id="why" aria-labelledby="tmv-why">
      <div class="wrap tmv-wrap">
        <p class="eyebrow mono">// DOESN&rsquo;T WINDOWS DO THIS?</p>
        <h2 id="tmv-why">Doesn&rsquo;t Windows 11 move your files for you?</h2>
        <p class="tmv-lede">Not any more, unless you pay for OneDrive space. Windows Easy Transfer was left out of Windows 10, and in September 2026 Microsoft took away the PC-to-PC Migration it had added to Windows 11&rsquo;s Windows Backup app. What&rsquo;s left is Windows Backup, which brings your files back from OneDrive.</p>
        <div class="tmv-two">
          <div class="tmv-card"><h3>Techies Move</h3><ul class="tmv-list">
            <li>Moves everything through a USB stick or hard drive you plug in: no cloud space to pay for, however much you have.</li>
            <li>Your files never go online, and the two PCs don&rsquo;t need to be connected.</li>
            <li>Takes your favourites from every browser, your Outlook files and signatures, and lists the passwords you&rsquo;ll need.</li>
            <li>Then keeps the stick as your backup, if you like. Free, from a firm in Dorset you can ring.</li>
          </ul></div>
          <div class="tmv-card"><h3>Windows Backup (OneDrive)</h3><ul class="tmv-list">
            <li>Backs your folders up to OneDrive, then brings them back when you sign in on the new PC.</li>
            <li>The free OneDrive gives 5 GB; most people&rsquo;s photos need more, which means paying Microsoft for more space.</li>
            <li>Only files that have finished uploading come back.</li>
            <li>Good if you already pay for Microsoft 365 and your files are in OneDrive. If they are, Techies Move says so and leaves them to OneDrive.</li>
          </ul></div>
        </div>
        <p style="margin-top:1rem;max-width:52rem;line-height:1.6">Paid programs such as Laplink PCmover can also move installed programs. Techies Move doesn&rsquo;t: programs need installing fresh on the new PC, and Techies Move lists them and has Windows install the ones it can. You may be offered a paid move in the shop where you bought the new PC, too. Prefer us to do it? We move people&rsquo;s files and set up new computers every week: <a href="/transfer-photos-to-a-new-computer-bournemouth/">see how we do it</a>, or read our guide to <a href="/how-to-transfer-files-to-a-new-computer/">every way to transfer files to a new computer</a>.</p>
      </div>
    </section>"""

SAFETY = """    <section class="section section--alt tmv" id="safe" aria-labelledby="tmv-safe">
      <div class="wrap tmv-wrap">
        <p class="eyebrow mono">// SAFE TO USE</p>
        <h2 id="tmv-safe">Is it safe? Will it delete anything?</h2>
        <div class="tmv-two">
          <div class="tmv-card"><h3>Your files</h3><ul class="tmv-list">
            <li>Nothing on the old PC is moved off it, changed or deleted: everything is <em>copied</em>. Keep the old PC as it is for a few weeks, until you&rsquo;re sure everything&rsquo;s there.</li>
            <li>Nothing on the new PC is written over: if a different file with the same name is already there, both are kept.</li>
            <li>Each file is copied under a temporary name and checked before it&rsquo;s given its real one, so a stick pulled out half way never leaves a broken file. Start again and it carries on where it stopped.</li>
            <li>Nothing is ever deleted from the stick, including when you uninstall Techies Move.</li>
          </ul></div>
          <div class="tmv-card"><h3>Your privacy</h3><ul class="tmv-list">
            <li>Your files go from one PC to the other on your own stick. Nothing is uploaded, to us or anyone.</li>
            <li>Passwords are never read or copied: not your email&rsquo;s, not your browser&rsquo;s.</li>
            <li>Techies Move doesn&rsquo;t check in with us, count you, or send anything anywhere. The only web pages it opens are the ones you press a button for, such as your webmail.</li>
            <li>The installer is digitally signed by 365 Techies Ltd, so Windows can check it&rsquo;s really ours. It doesn&rsquo;t update itself: new versions will be on this page.</li>
          </ul></div>
        </div>
        <p style="margin-top:1rem;max-width:52rem;line-height:1.6">A USB stick with your photos and letters on it is worth looking after: keep it somewhere safe, and if you&rsquo;re giving the old PC away or recycling it, have it wiped properly first.</p>
      </div>
    </section>"""

LIMITS = """    <section class="section tmv" id="limits" aria-labelledby="tmv-limits">
      <div class="wrap tmv-wrap">
        <p class="eyebrow mono">// HONEST LIMITS</p>
        <h2 id="tmv-limits">What it can&rsquo;t do (yet)</h2>
        <ul class="tmv-list">
          <li><strong>Programs can&rsquo;t be copied</strong> from one PC to another; they need installing fresh. Techies Move lists every program on the old PC, and on the new one Windows can install many of them for you. Programs that come from an account, such as Microsoft Office, Microsoft 365 or your antivirus, are installed from that company&rsquo;s website by signing in.</li>
          <li><strong>Passwords aren&rsquo;t copied,</strong> on purpose. It lists the ones you&rsquo;ll need and how to check them first; Chrome and Edge passwords come back when you sign in to the browser with sync on.</li>
          <li><strong>It needs a USB stick or external hard drive.</strong> It can&rsquo;t yet move straight from one PC to the other over Wi-Fi or a cable.</li>
          <li><strong>Both computers need Windows 10 or 11 (64-bit).</strong> It won&rsquo;t run on a Windows 7 or 8 PC. No Mac, iPhone or Android version.</li>
          <li><strong>It moves the folders of the person signed in to Windows.</strong> If two people have their own Windows accounts on the old PC, run it in each one.</li>
          <li><strong>Files that are only in OneDrive</strong> (shown with a cloud) aren&rsquo;t copied: they come back when you sign in to OneDrive on the new PC.</li>
          <li><strong>Email:</strong> it brings Outlook&rsquo;s data files, signatures and your account settings. Emails kept by your email company come back when you add the address. Thunderbird and Windows Mail accounts are listed, not moved.</li>
        </ul>
      </div>
    </section>"""


def growing():
    return f"""    <section class="section section--alt tmv" id="whats-new" aria-labelledby="tmv-new">
      <div class="wrap tmv-wrap">
        <div class="tmv-two">
          <div>
            <p class="eyebrow mono">// IT KEEPS GETTING BETTER</p>
            <h2 id="tmv-new">Built by us, improved on request</h2>
            <p style="line-height:1.6">Techies Move is made and looked after by 365 Techies in Dorset, and it grows with what people ask for, as our other programs have. Want it to do something it doesn&rsquo;t? Ring 01202 775566 or <a href="/contact/">send us a message</a>. New versions are put on this page.</p>
          </div>
          <div class="tmv-card">
            <h3>What&rsquo;s in it</h3>
            <p style="margin:0 0 .4rem"><strong>Version {REL['ver']}.</strong> {REL['notes'].replace("'", "&rsquo;")}</p>
            <p style="margin:0;color:var(--muted);font-size:.95rem">Things we&rsquo;d like to add (no dates yet): moving straight from PC to PC over your Wi-Fi, and finding photos kept outside the usual folders.</p>
          </div>
        </div>
      </div>
    </section>"""


WHO = """    <section class="section tmv" aria-labelledby="tmv-who">
      <div class="wrap tmv-wrap">
        <p class="eyebrow mono">// WHO MAKES IT</p>
        <h2 id="tmv-who">Who makes Techies Move?</h2>
        <p style="max-width:52rem;line-height:1.6">365 Techies Ltd, a family-run IT support firm looking after homes and businesses in Bournemouth, Christchurch and Poole since 1995, and across the UK remotely. Moving people to new computers is one of the jobs we do most, and Techies Move is how we&rsquo;d want it done: nothing lost, nothing overwritten, nothing uploaded. We also make <a href="/free-pc-health-check/">365 PC Manager</a>, a free health check for Windows PCs, <a href="/techies-one-mail/">Techies One</a>, a free program for email and photos, and <a href="/techies-pdf/">Techies PDF</a>, a free PDF program. Ring 01202 775566, Monday to Friday, 9am to 5pm, or read <a href="/about/">more about us</a>.</p>
      </div>
    </section>"""

FAQS = [
    ("How do I transfer files from my old computer to my new one?",
     "Install Techies Move on both computers. On the old one, plug in a USB stick, choose <strong>This is my OLD computer</strong> and press <strong>Start copying</strong>. Then plug the stick into the new one, choose <strong>This is my NEW computer</strong> and press <strong>Put it on this PC</strong>. Your photos, documents, desktop, music, videos, downloads, favourites and Outlook files go into the right places. It&rsquo;s free, and nothing is uploaded."),
    ("Does Windows 11 have a transfer tool?",
     "Not one that copies PC to PC any more. Microsoft removed the PC-to-PC Migration from Windows 11&rsquo;s Windows Backup app in September 2026. Windows Backup still backs your folders up to OneDrive and brings them back on the new PC, but the free OneDrive only holds 5 GB. Techies Move does the move through a USB stick instead, with no cloud space needed."),
    ("What happened to Windows Easy Transfer?",
     "Windows Easy Transfer was left out of Windows 10, so it isn&rsquo;t on Windows 10 or 11 PCs. Techies Move does the same job for Windows 10 and 11, free: it copies your files, favourites and Outlook files onto a USB stick and puts them back on the new PC."),
    ("Is there a free alternative to PCmover?",
     "Yes: Techies Move is free and moves your folders, favourites, email files and signatures, and desktop picture, and lists your passwords to check. Laplink PCmover is a paid program that can also move installed programs; Techies Move lists your programs instead, and Windows can install many of them again on the new PC."),
    ("What size USB stick do I need to move to a new computer?",
     "Open Techies Move on the old PC and choose <strong>This is my OLD computer</strong>: it counts your files and tells you, for example &ldquo;This needs 41 GB, so a 64 GB USB stick or bigger is enough&rdquo;. As a rough guide, up to about 12 GB fits a 16 GB stick, 25 GB a 32 GB stick, 50 GB a 64 GB stick and 100 GB a 128 GB stick; more than about 400 GB needs a portable hard drive. Buy a size up if you&rsquo;ll keep the stick as your backup."),
    ("Will Techies Move copy my passwords?",
     "No, on purpose: it never reads or copies passwords. It lists the email addresses and browser sign-ins you&rsquo;ll need passwords for, with a button to check each email password in your webmail while the old PC still works. Chrome and Edge bring back saved passwords when you sign in with sync on; Techies Move tells you if yours are only on the old PC, and how to take them with Chrome&rsquo;s own export."),
    ("Will my emails move to the new computer?",
     "Emails kept by your email company (BT, Sky, Gmail, Outlook.com, Virgin Media and most others) come back as soon as you add your address in Outlook on the new PC: Techies Move lists each address with its settings and what to know. Emails of older POP accounts kept in Outlook data files (.pst) are copied across for you to open in Outlook, and classic Outlook&rsquo;s signatures are put back too."),
    ("Will it move my programs?",
     "Programs can&rsquo;t be copied from one PC to another; they need installing fresh. Techies Move lists every program on the old PC, and on the new one it can have Windows install many of them again: you tick the ones you want. Microsoft Office, Microsoft 365 and antivirus are installed by signing in on that company&rsquo;s website."),
    ("How do I move my Chrome bookmarks to a new computer?",
     "If you sign in to Chrome with your Google account and sync is on, your bookmarks come back when you sign in on the new PC; Techies Move tells you which account. It also saves every browser&rsquo;s favourites, including the ones Chrome keeps in your Google account, as a bookmarks file, and on the new PC shows you Chrome&rsquo;s or Edge&rsquo;s import page to bring them in."),
    ("Can I use the USB stick as a backup afterwards?",
     "Yes. On the new PC, press <strong>Use this drive as my backup</strong>: the copy already on the stick becomes your backup. After that, press <strong>Back up now</strong> whenever the stick is plugged in, and Techies Move adds what&rsquo;s new or changed, keeps the previous copy of any changed file, and never deletes anything from the stick. A Windows notification reminds you every week."),
    ("Will it delete anything from my old computer?",
     "No. Everything is copied, not moved: the old PC keeps all its files, and nothing on it is changed. On the new PC nothing is written over either; a different file with the same name is kept alongside, with &ldquo;(from old PC)&rdquo; on its name."),
    ("Do I need to install it on both computers?",
     "Yes, on the old one to pack up and on the new one to put it back. It&rsquo;s a small, free download that needs no administrator password, and you can uninstall it afterwards without losing anything on the stick."),
    ("Does Techies Move work on Windows 7 or 8?",
     "No. Both PCs need Windows 10 or 11 (64-bit). If your old PC runs Windows 7 or 8, copy your folders onto a USB stick by hand, or ring us and we&rsquo;ll move them for you."),
    ("Is Techies Move really free?",
     "Yes: no trial, no adverts, no account and no limit on how much it moves. If you&rsquo;d rather we did the move for you, that&rsquo;s a paid job, and we agree the price with you before we start."),
]

TRADEMARK = """    <section class="section tmv" aria-label="Trademarks">
      <div class="wrap"><p class="tmv-tm">Microsoft, Windows, Microsoft Edge, Outlook, OneDrive and Microsoft 365 are trademarks of the Microsoft group of companies. Google, Chrome and Gmail are trademarks of Google LLC. Laplink and PCmover are trademarks of Laplink Software. Mozilla, Firefox and Thunderbird are trademarks of the Mozilla Foundation. Brave is a trademark of Brave Software. BT, Sky, Virgin Media, TalkTalk and Plusnet are trademarks of their owners. Mac, iPhone and iPad are trademarks of Apple Inc. Android is a trademark of Google LLC. Techies Move is made by 365 Techies Ltd and is not made, endorsed or supported by any company named here.</p></div>
    </section>"""

TITLE = "Techies Move | Free PC Transfer Tool for Windows 11 and 10"
DESC = ("Free tool to move your files, photos, favourites and Outlook email files from your old PC to a new Windows 11 PC by "
        "USB stick, then keep it as a backup. Nothing uploaded.")


def build():
    content = "\n".join([
        hero(), PROOF, download(), overview(), jobs(), stick_sizes(), WHY, SAFETY, LIMITS, growing(), WHO, bp.faq_html(FAQS),
        bp.cta("Rather we did the move for you?", "We move people&rsquo;s photos, documents, email and favourites to new computers every week, remotely or at our Bournemouth base. It&rsquo;s a paid job, and we agree the price before we start.",
               primary=("Call 01202 775566", "tel:+441202775566"), secondary=("How we do it", "/transfer-photos-to-a-new-computer-bournemouth/")),
        TRADEMARK,
    ])

    def schema(s, _d=DESC):
        app = {
            "@type": "SoftwareApplication", "@id": f"{bp.SITE}/{s}/#app", "name": NAME,
            "operatingSystem": "Windows 10 (64-bit), Windows 11", "applicationCategory": "UtilitiesApplication",
            "description": ("A free program for Windows 10 and 11 PCs, made by 365 Techies, that moves a person's files from an old PC "
                            "to a new one through a USB stick or external hard drive: Desktop, Documents, Pictures, Videos, Music, "
                            "Downloads and any added folder, browser favourites (Edge, Chrome, Brave, Firefox), Outlook data files and "
                            "signatures, a list of email accounts and their settings, the desktop picture and lists of programs, "
                            "printers and Wi-Fi networks. It says what size of USB stick is needed, lists the passwords to check "
                            "(it never reads or copies passwords), and can keep the drive as a backup with a weekly reminder. Nothing "
                            "is deleted, overwritten or uploaded."),
            "offers": {"@type": "Offer", "price": "0", "priceCurrency": "GBP", "availability": "https://schema.org/InStock"},
            "isAccessibleForFree": True, "inLanguage": "en-GB",
            "downloadUrl": REL["url"], "softwareVersion": REL["ver"], "fileSize": MB.replace(" ", ""),
            "installUrl": "https://apps.microsoft.com/detail/XPFCXK6CK201FQ", "sameAs": ["https://apps.microsoft.com/detail/XPFCXK6CK201FQ"],   # its Microsoft Store listing (live 24 Oct 2026)
            "featureList": ["Moves Desktop, Documents, Pictures, Videos, Music, Downloads and any added folder to a new PC by USB stick",
                            "Says what size of USB stick is needed and whether a drive has room (and FAT32's 4 GB limit)",
                            "Favourites from Microsoft Edge, Google Chrome (including Google-account favourites), Brave and Firefox",
                            "Outlook data files (.pst) and signatures, and a list of email accounts with their settings",
                            "A checklist of the passwords to check before the old PC is switched off (passwords are never read or copied)",
                            "Lists installed programs, and has Windows reinstall many on the new PC",
                            "Never deletes or overwrites: a different file of the same name is kept as '(from old PC)'",
                            "Keeps the drive as a backup afterwards, with earlier versions kept and a weekly reminder",
                            "Works offline: nothing uploaded, no account, no adverts"],
            "screenshot": [f"{bp.SITE}/images/tmove-{n}-{TAG}-1440.webp" for n in ["pack", "home"] + [f[0] for f in FEATS[1:]]],
            "publisher": {"@id": bp.SITE + "/#business"}, "provider": {"@id": bp.SITE + "/#business"},
            "datePublished": "2026-10-22", "url": f"{bp.SITE}/{s}/",
        }
        return bp.graph([bp.crumb_sub(s, "Free Tools", "free-tools", NAME),
                         bp.webpage(s, NAME, _d, image=bp.SITE + OG), app,
                         bp.howto_node(s, "How to move to a new computer with Techies Move",
                                       [(n, re.sub(r"<[^>]+>", "", t)) for n, t in STEPS]),
                         bp.faqpage(s, FAQS)])

    bp.add(slug=SLUG, title=TITLE, desc=DESC,
           og_title="Techies Move: the free way to move everything from your old PC to your new one", schema=schema,
           content=content, og_image=bp.SITE + OG)


build()
