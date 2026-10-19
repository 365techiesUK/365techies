"""/techies-one-mail/ - the Techies One product page. Made 10 Oct 2026 as the Techies One Mail page (owner: "make a product
page for the techies one mail ... SEO and AI and everything optimized ... replacing things like Windows Mail and Outlook
Express ..."); 16 Oct 2026 it became the page for the whole program, Techies One 0.19: Mail, Letters, Sums, Files (with
Space, Share a link and Dictate) - owner: "do the artwork and the videos ... for the website" -> "Do it all".
18 Oct 2026, for Techies One 0.22 (owner: "get it ... with all the features like albums and ... memories and Picasa
import ... so we can download Techies One today"): Albums (photos by date, slideshows, sending, films, Looking back,
names and words, Picasa, OneDrive photos kept online, camera cards, Keep safe), Mail's own folders, new-email pop-ups,
Contacts with postal addresses (envelopes, labels, the Christmas card list), Bring in old emails into "On this PC"
mailboxes, backups, and Help on every screen. Facts from RELEASE-0.20.0.md, RELEASE-0.21.0.md and the v022 lane reports
(D:\\claude\\techies-one\\lanes\\v022-*); pictures are the real demo's screens (screenshots\\app-albums-*, app-v0.20-*,
app-v0.21-final-look, app-v0.22-*) with the demo's own banner row cut out, framed like the v019 ones.

The URL stays /techies-one-mail/ (its search traffic is people replacing Windows Mail and Outlook Express), so Mail comes
first and the email-replacement words stay in the title, description, lede and the Mail section.

Mail's facts come from four research files written on 10 Oct (D:\\claude\\seo-research\\techies-one-product-2026-10-10\\:
microsoft.md, competitors.md, serp.md, features.md); Letters, Sums, Files, Space, Share a link and Dictate come from the
app's own release notes (D:\\claude\\techies-one\\RELEASE-0.15.0.md to RELEASE-0.19.0.md) and its screens. Rules:
  - every claim about the app matches what it really does: scam checks, rules and new-email pop-ups run while Techies One
    is running (window minimised or closed too; not once it is closed completely), search is one folder at a time (or every
    inbox from All inboxes), no POP, a .pst is brought in (copied), never opened in place, Outlook Express files are
    experimental, Windows only, Gmail = app password; Albums never recognises faces or edits photos, and can't show
    Google Photos, Amazon Photos or Facebook; Dictate needs
    the internet (Microsoft turns speech into words); WhatsApp opens ready to send - the person presses Send; iCloud only
    through Apple's iCloud for Windows app; Space and Files removals go to the Recycle Bin; Dropbox sign-in is "coming"
    until the owner switches it on (DROPBOX_ON);
  - "free" means the program; help is a paid job, priced first; the optional AI helper is charged by Anthropic;
  - other companies' names are used only to say what it works with or replaces, never with their logos, and the
    trademark note says it is not made or endorsed by them; Techies One is always the biggest name;
  - prices carry the date they were checked; Microsoft 365 is compared only as "if you only pay for it for ad-free email"
    - the owner keeps selling Microsoft 365, so the page never says "cancel it";
  - no star rating in the structured data (none collected from users; Google requires real user ratings).
The download, version and size come from downloads/t1/version.json through techies_one_boxes.release(), the same reader
the fix-page boxes use, and the build stops if the installer is missing.
"""
import html

import build_pages as bp
import yt_watch   # 19 Oct 2026: the hero film plays from YouTube
from techies_one_boxes import release

SLUG = "techies-one-mail"
NAME = "Techies One"
OLD_NAME = "Techies One Mail"      # the program's name until 0.16; kept as alternateName (people still search for it)
OLD_TAG = "v0131"                  # Mail's first pictures (10 Oct 2026)
TAG = "v019"                       # pictures of 0.19 (16 Oct 2026). Pictures are cached for a year: a new look = a new tag
NEW = "v022"                       # pictures of 0.20-0.22 (18 Oct 2026): Albums, folders, contacts, old emails, backups, help
ART = (TAG, NEW)                   # the framed pictures (navy card round the screen)
OG = f"/images/t1-og-{TAG}.jpg"
CHECKED = "10 October 2026"        # the day the prices and dates below were checked
DROPBOX_ON = False                 # True once the owner has registered the Dropbox app (DROPBOX-SETUP.md) and it ships on

REL = release()
if not REL:
    raise SystemExit("techies_one_page: downloads/t1/version.json or its installer is missing - no product page without a download")
MB = f"{round(REL['size'] / 1_048_576)} MB"   # as Windows and Edge show it (17,801,880 bytes = 17 MB)


def shot(name, alt, tag, eager=False):
    base = f"/images/t1-{name}-{tag}"
    lazy = "" if eager else ' loading="lazy"'
    return (f'<img src="{base}-720.webp" srcset="{base}-720.webp 720w, {base}-1440.webp 1440w" '
            f'sizes="(max-width:880px) 100vw, 720px" width="1440" height="900" alt="{alt}"{lazy} decoding="async">')


# The Techies One film (16 Oct 2026, reels/techies-one-suite-2026-10-16: the real 0.19 demo, Lily's voice, captions). The
# lead copies the cut in under these names; a new cut gets NEW names (cached for a year). SUITE_SECS: set from F-REPORT.md.
SUITE_FILM = "/images/t1-suite-film-v1.mp4"
SUITE_POSTER = "/images/t1-suite-film-poster-v1.jpg"
SUITE_SECS = 111
SUITE_UPLOADED = "2026-10-16"
SUITE_SAYS = ("Your email. Your letters. Your sums. Your files. All in one simple program. This is Techies One, from 365 "
              "Techies. Mail puts all your email addresses in one place. It moves scam emails out of the way before you open "
              "them. And the writing can be as big as you like. Letters writes the letter with you: a complaint, cancelling a "
              "contract, a CV. Press Next to fill in the gaps. Or just talk, and it types for you. Then save it as a PDF, or "
              "email it. Sums is a spreadsheet that adds itself up. A household budget, bills, club accounts. And it opens "
              "Excel files too. Files shows everything on your PC and your clouds together. Your photos, nice and big. And a "
              "video that&rsquo;s too big to email? Share a link, and send it by WhatsApp. When your PC is full, Space finds "
              "the duplicates and the biggest files, and makes room. Safely. Anything removed goes to the Recycle Bin. Techies "
              "One. Free to download, with real people in Dorset if you ever need a hand.")
SUITE_LEN = "under 2 minutes" if SUITE_SECS < 120 else f"{round(SUITE_SECS / 60)} minutes"

# The email film (made 10-13 Oct 2026), now in the Mail section. v5 (13 Oct, owner: "a different video for the website ...
# focusing on the problems it solves"): problem -> fix, in the order people search. /techies-one-mail-film/
# (video_watch_pages.py) shows the same file and reads these five names, so they keep their meaning.
FILM = "/images/t1-mail-film-v5.mp4"
FILM_POSTER = "/images/t1-mail-film-poster-v5.jpg"
FILM_SECS = 81
FILM_UPLOADED = "2026-10-13"
FILM_SAYS = ("Email giving you trouble? Here&rsquo;s a simpler way. Techies One Mail is a free email program for Windows "
             "computers, from 365 Techies. If Windows Live Mail or Windows Mail has stopped working, your email is most likely "
             "still with your email company, and Techies One can show it. If your BT or Sky email won&rsquo;t go into the new "
             "Outlook, type your address into Techies One. It already knows the settings. Find it all too fiddly? One tick "
             "turns on Simple view: fewer, bigger buttons. Every email is checked for the signs of a scam while Techies One is "
             "open. Fakes go in their own folder, with the reasons in plain English. Inbox full of old emails? Clean up shows "
             "who sends the most, and clears thousands in a few clicks. Deleted emails go to your Deleted folder first. More "
             "than one address? All inboxes puts every email in one list, and your reply goes from the right one. Your "
             "password stays on your computer, so we never see it. And it&rsquo;s free, with no adverts. If you get stuck, "
             "press Get help, and a real person from 365 Techies rings you back. Download Techies One Mail free from "
             "365techies.co.uk, or ring us if you&rsquo;d rather we set it up.")


CSS = """    <style>
      .t1p{--t1edge:rgba(125,170,220,.24);--t1fill:rgba(125,170,220,.06)}
      .t1p [id]{scroll-margin-top:96px}
      .t1p-shot{margin:0;border:1px solid var(--t1edge);border-radius:14px;overflow:hidden;background:#fff;box-shadow:0 18px 50px rgba(0,0,0,.35)}
      .t1p-shot--art{border:0;background:#0b1430;border-radius:12px;box-shadow:0 14px 40px rgba(0,0,0,.35)}
      .t1p-shot img{display:block;width:100%;height:auto}
      .t1p-cap{margin:.5rem 0 0;font-size:.82rem;color:var(--muted);text-align:center}
      .t1p-film{position:relative;border:1px solid var(--t1edge);border-radius:14px;overflow:hidden;background:#060c1c;box-shadow:0 18px 50px rgba(0,0,0,.35);aspect-ratio:16/9}
      .t1p-film video,.t1p-film img,.t1p-film iframe{display:block;width:100%;height:100%;object-fit:cover;background:#060c1c;border:0}
      .t1p-play{position:absolute;inset:0;display:flex;align-items:flex-end;justify-content:center;border:0;padding:0 0 7%;background:transparent;cursor:pointer}
      .t1p-play span{display:flex;align-items:center;gap:.6rem;background:rgba(6,12,28,.86);color:#fff;font-weight:700;font-size:1.05rem;padding:.85rem 1.4rem .85rem 1.1rem;border-radius:999px;border:1.5px solid rgba(255,255,255,.25);box-shadow:0 12px 32px rgba(0,0,0,.45);transition:transform .2s ease}
      .t1p-play:hover span,.t1p-play:focus-visible span{transform:scale(1.05)}
      .t1p-play svg{width:2.1rem;height:2.1rem;flex:none}
      .t1p-film.on .t1p-play{display:none}
      .t1p-play .short{display:none}
      @media (max-width:520px){.t1p-play .long{display:none}.t1p-play .short{display:inline}.t1p-play span{font-size:.95rem;padding:.6rem 1.1rem .6rem .8rem}.t1p-play svg{width:1.7rem;height:1.7rem}}
      .t1p-says{margin:.7rem 0 0;font-size:.9rem}
      .t1p-says summary{cursor:pointer;color:var(--muted)}
      .t1p-says p{margin:.5rem 0 0;line-height:1.6}
      .t1p-dl{max-width:880px;margin:0 auto;border:1px solid var(--t1edge);border-radius:16px;background:var(--t1fill);padding:clamp(1.1rem,3vw,1.8rem);display:flex;flex-direction:column;gap:.8rem}
      .t1p-dl h2,.t1p h2{margin:0}
      .t1p-dl p{margin:0}
      .t1p-btns{display:flex;flex-wrap:wrap;gap:.6rem}
      .t1p-btns .button{flex:1 1 15rem;text-align:center}
      .t1p-meta{font-size:.78rem;letter-spacing:.04em;color:var(--muted)}
      .t1p-steps{margin:0;padding:0;list-style:none;display:grid;gap:.45rem}
      .t1p-swipe{display:none;font-size:.8rem;color:var(--muted);margin:0 0 .4rem}
      @media (max-width:700px){.t1p-swipe{display:block}}
      .t1p-steps li{line-height:1.5}
      .t1p details{border:1px solid var(--t1edge);border-radius:10px;padding:.6rem .9rem}
      .t1p details summary{cursor:pointer;font-weight:600}
      .t1p details p{margin:.5rem 0 0}
      .t1p-wrap{max-width:1100px;margin:0 auto}
      .t1p-lede{max-width:46rem;color:var(--muted);font-size:1.05rem;line-height:1.6;margin:.4rem 0 1.4rem}
      .t1p-tbl{overflow-x:auto;border:1px solid var(--t1edge);border-radius:12px}
      .t1p-tbl table{width:100%;border-collapse:collapse;min-width:640px;font-size:.95rem}
      .t1p-tbl th,.t1p-tbl td{padding:.65rem .8rem;text-align:left;vertical-align:top;border-bottom:1px solid var(--t1edge);line-height:1.45}
      .t1p-tbl thead th{font-size:.78rem;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);background:var(--t1fill)}
      .t1p-tbl tbody tr:last-child td{border-bottom:0}
      .t1p-tbl .us td{background:rgba(0,206,27,.07)}
      .t1p-tbl th[scope=row]{font-weight:700}
      .t1p-src{font-size:.8rem;color:var(--muted);margin:.6rem 0 0}
      .t1p p a:not([class]),.t1p li a:not([class]),.t1p td a:not([class]){color:var(--cyan);text-decoration:underline;text-underline-offset:2px}
      .t1p p a:not([class]):hover,.t1p li a:not([class]):hover,.t1p td a:not([class]):hover{color:#fff}
      .t1p-parts{list-style:none;margin:1.2rem 0 0;padding:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.7rem}
      @media (max-width:860px){.t1p-parts{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media (max-width:300px){.t1p-parts{grid-template-columns:1fr}}
      .t1p-parts a{text-decoration:none;display:flex;flex-direction:column;gap:.35rem;height:100%;box-sizing:border-box;border:1px solid var(--t1edge);border-radius:12px;padding:.85rem .9rem;background:var(--t1fill);color:inherit;text-decoration:none;transition:border-color .2s ease,background .2s ease}
      .t1p-parts a:hover,.t1p-parts a:focus-visible{border-color:var(--cyan);background:rgba(29,151,227,.12)}
      .t1p-parts svg{width:1.9rem;height:1.9rem;color:var(--cyan-soft,#6cc4f5)}
      .t1p-parts b{font-size:1.05rem}
      .t1p-parts span{color:var(--muted);font-size:.9rem;line-height:1.4}
      .t1p-intro{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.25fr);gap:clamp(1rem,3vw,2.2rem);align-items:center;margin-bottom:clamp(1.6rem,4vw,2.8rem)}
      .t1p-intro .t1p-lede{margin-bottom:.6rem}
      .t1p-feats{display:grid;gap:clamp(1.6rem,4vw,2.8rem)}
      .t1p-feat{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.25fr);gap:clamp(1rem,3vw,2.2rem);align-items:center}
      .t1p-feat:nth-child(even) .t1p-feat__txt{order:2}
      .t1p-feat h3{margin:0 0 .4rem;font-size:clamp(1.2rem,2.4vw,1.5rem)}
      .t1p-feat p{margin:0 0 .5rem;line-height:1.6}
      .t1p-feat .t1p-prob{font-size:.8rem;letter-spacing:.06em;text-transform:uppercase;color:var(--cyan-soft,#6cc4f5);margin:0 0 .35rem}
      .t1p-more{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,17rem),1fr));gap:.9rem;margin-top:1.6rem}
      .t1p-more div{border:1px solid var(--t1edge);border-radius:12px;padding:.9rem 1rem;background:var(--t1fill)}
      .t1p-more b{display:block;margin-bottom:.25rem}
      .t1p-more span{color:var(--muted);font-size:.95rem;line-height:1.5}
      .t1p-list{margin:0;padding-left:1.2rem;display:grid;gap:.4rem;max-width:52rem}
      .t1p-list li{line-height:1.55}
      .t1p-two{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,22rem),1fr));gap:1.2rem}
      .t1p-card{border:1px solid var(--t1edge);border-radius:14px;padding:1.1rem 1.2rem;background:var(--t1fill)}
      .t1p-card h3{margin:0 0 .5rem;font-size:1.15rem}
      .t1p-tm{font-size:.78rem;color:var(--muted);max-width:60rem;margin:1.6rem auto 0;text-align:center;line-height:1.5}
      @media (max-width:860px){.t1p-feat,.t1p-intro{grid-template-columns:1fr}.t1p-feat:nth-child(even) .t1p-feat__txt{order:0}}
      .t1p-clip{display:inline-flex;align-items:center;gap:.8rem;max-width:100%;box-sizing:border-box;margin:.35rem 0 0;padding:.45rem 1rem .45rem .45rem;border:1px solid var(--t1edge);border-radius:12px;background:var(--t1fill);color:inherit;text-decoration:none;transition:border-color .2s ease,background .2s ease}
      .t1p-clip:hover,.t1p-clip:focus-visible{border-color:var(--cyan);background:rgba(29,151,227,.12)}
      .t1p-clip__pic{position:relative;flex:none;width:72px;height:72px;border-radius:8px;overflow:hidden;background:#0b1430}
      .t1p-clip__pic img{display:block;width:100%;height:100%;object-fit:cover}
      .t1p-clip__pic svg{position:absolute;left:50%;top:50%;width:30px;height:30px;transform:translate(-50%,-50%);filter:drop-shadow(0 2px 6px rgba(0,0,0,.55))}
      .t1p-clip b{display:block;font-size:1rem}
      .t1p-clip small{display:block;color:var(--muted);font-size:.85rem;line-height:1.35}
      .t1p-dlg{padding:0;border:0;border-radius:16px;background:#060c1c;max-width:none;max-height:none;overflow:visible}
      .t1p-dlg::backdrop{background:rgba(2,6,16,.84)}
      .t1p-dlg video{display:block;width:min(92vw,calc(86vh * 9 / 16),506px);height:auto;aspect-ratio:9/16;border-radius:16px;background:#060c1c}
      .t1p-dlg__x{position:absolute;top:-.7rem;right:-.7rem;z-index:1;width:2.75rem;height:2.75rem;border-radius:50%;border:1.5px solid rgba(255,255,255,.4);background:#0b1430;color:#fff;font-size:1.7rem;line-height:1;cursor:pointer}
      .t1p-dlg__x:hover,.t1p-dlg__x:focus-visible{background:#1d97e3}
      .t1p-dlg__says{position:absolute;width:1px;height:1px;margin:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
    </style>
"""

PLAY_SVG = '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="23" fill="#00ce1b"/><path d="M19 15l15 9-15 9z" fill="#fff"/></svg>'
# Click-to-play, wired by the script straight after each film, so it works wherever the film sits on the page
FILM_JS = ('<script>(function(f){if(!f)return;var v=f.querySelector("video"),b=f.querySelector(".t1p-play");v.controls=false;'
           'b.addEventListener("click",function(){f.classList.add("on");v.controls=true;v.play();});'
           'v.addEventListener("play",function(){f.classList.add("on");});})(document.currentScript.previousElementSibling);</script>')


def film(src, poster, label, long, short):
    return (f'<div class="t1p-film" data-t1film>\n'
            f'            <video controls playsinline preload="none" poster="{poster}" width="1920" height="1080" aria-label="{label}"><source src="{src}" type="video/mp4"></video>\n'
            f'            <button class="t1p-play" type="button" aria-label="{long}"><span>{PLAY_SVG}<b class="long">{long}</b><b class="short">{short}</b></span></button>\n'
            f'          </div>{FILM_JS}')


# 19 Oct 2026 (owner: our YouTube videos on the busy pages, so every play is a view on the channel): the hero film plays
# the same cut from YouTube (yt_watch.T1_FILM, public since 18 Oct). Click-to-play on youtube-nocookie: only the poster
# loads until the button is pressed. The Mail film further down has no YouTube copy, so it stays ours.
YT_FILM_JS = ('<script>(function(f){if(!f)return;var b=f.querySelector(".t1p-play");b.addEventListener("click",function(){'
              'var i=document.createElement("iframe");'
              'i.src="https://www.youtube-nocookie.com/embed/"+f.getAttribute("data-t1yt")+"?autoplay=1&rel=0&playsinline=1";'
              'i.title=f.getAttribute("data-title");'
              'i.setAttribute("allow","accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture");'
              'i.setAttribute("allowfullscreen","");var p=f.querySelector("img");if(p)p.parentNode.replaceChild(i,p);else f.appendChild(i);'
              'f.classList.add("on");});})(document.currentScript.previousElementSibling);</script>')


def yt_film(video, poster, label, long, short):
    return (f'<div class="t1p-film" data-t1yt="{video[0]}" data-title="{label}">\n'
            f'            <img src="{poster}" width="1920" height="1080" alt="" decoding="async">\n'
            f'            <button class="t1p-play" type="button" aria-label="{long}"><span>{PLAY_SVG}<b class="long">{long}</b><b class="short">{short}</b></span></button>\n'
            f'          </div>{YT_FILM_JS}')


def hero():
    return f"""{CSS}    <section class="page-hero dh dh-hero t1p" aria-label="Introduction">
      <div class="dh-hero__grid">
        <div>
          <nav class="breadcrumb" aria-label="Breadcrumb">{bp.bc_sub("Email Support", "/email-support/", NAME)}</nav>
          <p class="eyebrow mono">// FREE FOR WINDOWS 10 &amp; 11 &middot; SIGNED BY 365 TECHIES LTD</p>
          <h1><em class="grad grad--cyan">Techies One</em>: free email, photos, letters and sums for Windows</h1>
          <p class="lede"><strong>Techies One</strong> is a free program for Windows 10 and 11 PCs from 365 Techies, the family-run IT firm in Bournemouth. <strong>Mail</strong> replaces Windows Mail and Outlook Express, with scam warnings in plain English, and brings your old emails in. <strong>Albums</strong> puts your photos in date order, with slideshows, films and memories, and brings across your Picasa stars and captions. <strong>Letters</strong>, <strong>Sums</strong> and <strong>Files</strong> look after your letters, budgets and folders. No adverts.</p>
          <div class="page-hero__cta">
            <a href="#download" class="button primary button--lg">Download it free</a>
            <a href="tel:+441202775566" class="button secondary button--lg">Rather we set it up? 01202 775566</a>
          </div>
          <a class="dh-rating" href="/reviews/"><span><span aria-hidden="true">&#9733;&#9733;&#9733;&#9733;&#9733;</span> <strong>Our firm is rated 4.9 on Google</strong></span><span>365 Techies &middot; family-run since 1995</span></a>
          <p class="page-hero__byline mono"><span class="page-hero__byline-by">By the </span><a href="/meet-the-team/">365 Techies team</a> &middot; Reviewed __LASTMOD_HUMAN__</p>
        </div>
        <figure id="video" style="margin:0">
          {yt_film(yt_watch.T1_FILM, SUITE_POSTER, "Techies One in " + SUITE_LEN + ": Mail, Letters, Sums, Files and Space, with a spoken guide and captions",
                "Watch: Techies One in " + SUITE_LEN, "Watch the film")}
          <figcaption class="t1p-cap">The real program, with a spoken guide and captions. The people, emails and files shown are made up. &middot; <a href="https://www.youtube.com/watch?v={yt_watch.T1_FILM[0]}" target="_blank" rel="noopener">Watch on YouTube</a></figcaption>
          <details class="t1p-says"><summary>What the film says</summary><p>{SUITE_SAYS}</p></details>
        </figure>
      </div>
    </section>"""


PROOF = """    <section class="dh dh-sec dh-proof" aria-label="The deal, in four facts">
      <div class="dh-in">
        <ul class="dh-facts">
          <li class="hp-c-care"><b>&pound;0</b><span>for the program, with no adverts</span></li>
          <li class="hp-c-fix"><b>Signed</b><span>by 365 Techies Ltd, checked by Windows</span></li>
          <li class="hp-c-buy"><b>A person</b><span>to ring: 01202 775566, Mon to Fri 9 to 5; any paid work is priced first</span></li>
          <li class="hp-c-biz"><b>4.9<i aria-hidden="true">&#9733;</i></b><span>the firm behind it, on Google</span></li>
        </ul>
      </div>
    </section>"""

STEPS = [
    ("Download it", f"Press the Download button. The file is called TechiesOneMail-Setup-{REL['ver']}.exe (the name it has always had) and is signed by 365 Techies Ltd."),
    ("Open the file", "It installs for you in a few seconds and needs no administrator password. It only adds itself (a Start menu entry and, if you like, a desktop icon) and doesn&rsquo;t change anything else on the PC."),
    ("Type your email address", "For Mail, type your address: Techies One recognises BT, Sky, Plusnet, Gmail, Yahoo, AOL and Outlook.com addresses and fills in all the technical settings itself. Albums, Letters, Sums and Files are on the bar down the left."),
    ("Type your password, or sign in with Microsoft", "Before saving, it checks it can both receive and send. Your email appears straight away, because it is still with your provider."),
]


def download():
    steps = "".join(f"<li><strong>{i}. {n}.</strong> {t}</li>" for i, (n, t) in enumerate(STEPS, 1))
    return f"""    <section class="section t1p" id="download" aria-label="Download Techies One">
      <div class="wrap">
        <div class="t1p-dl">
          <p class="eyebrow mono">// DOWNLOAD &middot; FREE &middot; WINDOWS 10 &amp; 11</p>
          <h2>Get Techies One</h2>
          <p>The program is free for everyone, at home or at work, with as many email addresses as you like. Mail, Albums, Letters, Sums and Files come in the one download. No account to make with us, no trial, no adverts.</p>
          <div class="t1p-btns">
            <a class="button primary button--lg" href="{REL['path']}" download>Download Techies One (Windows)</a>
            <a class="button secondary button--lg" href="tel:+441202775566">Rather we set it up? 01202 775566</a>
          </div>
          <p class="t1p-meta mono">FOR WINDOWS 10 AND 11 (64-BIT)<span class="t1v"> &middot; VERSION {REL['ver']} &middot; {MB}</span> &middot; DIGITALLY SIGNED BY 365 TECHIES LTD &middot; NOT FOR MAC, IPHONE OR ANDROID</p>
          <ol class="t1p-steps">{steps}</ol>
          <details>
            <summary>What will Windows say when I open it?</summary>
            <p>Usually nothing: it&rsquo;s digitally signed by 365 Techies Ltd. But a brand-new program can get a warning or two while Windows gets to know it. <strong>When downloading</strong>, Edge may say the file &ldquo;isn&rsquo;t commonly downloaded&rdquo;: press the three dots next to it, choose <strong>Keep</strong>, then <strong>Show more</strong> and <strong>Keep anyway</strong>. <strong>When you open it</strong>, you may see a blue &ldquo;Windows protected your PC&rdquo; box: choose <strong>More info</strong>, check that the Publisher line says <strong>365 Techies Ltd</strong>, then choose <strong>Run anyway</strong>. If the publisher says anything else, don&rsquo;t run it, and ring us.</p>
          </details>
          <details>
            <summary>Will I lose my old emails?</summary>
            <p>Usually not. If your old program used the normal setting (IMAP), your emails are kept with your email provider, so they appear in Techies One, folders and all, as soon as you add your address. Outlook Express and Windows Live Mail were often set to the older &ldquo;POP&rdquo; setting instead, which kept email only on the old PC. Then <strong>Bring in old emails</strong> can copy them from the old program&rsquo;s files (Windows Live Mail, Windows Mail, Thunderbird or an Outlook .pst file; Outlook Express files are still experimental) into a mailbox on this PC, without changing the originals. Keep the old program or PC until they&rsquo;re in, and <a href="/contact/">ask us</a> if you&rsquo;re not sure.</p>
          </details>
        </div>
      </div>
    </section>"""


# Our own plain line icons for the parts (no company logos anywhere on the page)
ICONS = {
    "mail": '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6.5l8.5 6.5 8.5-6.5"/>',
    "albums": '<rect x="3" y="4.5" width="18" height="15" rx="2"/><circle cx="8.5" cy="9.5" r="1.8"/><path d="M3.5 17.5l5.5-5 4 3.5 3-2.5 4.5 4"/>',
    "letters": '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 15.5h6M9 9h3"/>',
    "sums": '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9.5h18M9 9.5V20M15 9.5V20"/>',
    "files": '<path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2.5h8.5A1.5 1.5 0 0 1 21 9v9.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z"/>',
    "space": '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 0 1 8.2 6.3"/><circle cx="12" cy="12" r="3.5"/>',
    "share": '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.2 1.2"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.2-1.2"/>',
    "dictate": '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7"/>',
}
PARTS = [
    ("mail", "Mail", "Email from every address, with scam warnings"),
    ("albums", "Albums", "All your photos by date, slideshows, films and memories"),
    ("letters", "Letters", "Letters, CVs and notices, saved as Word files"),
    ("sums", "Sums", "Budgets and accounts that add themselves up"),
    ("files", "Files", "Your PC, USB sticks and clouds together"),
    ("space", "Space", "Find duplicates and big files, make room"),
    ("share", "Share a link", "Send a video that&rsquo;s too big to email"),
    ("dictate", "Dictate", "Talk instead of typing"),
]


def icon(k):
    return (f'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" '
            f'stroke-linejoin="round" aria-hidden="true">{ICONS[k]}</svg>')


def overview():
    tiles = "".join(f'<li><a class="t1p-part" href="#{k}">{icon(k)}<b>{n}</b><span>{d}</span></a></li>' for k, n, d in PARTS)
    return f"""    <section class="section section--alt t1p" id="features" aria-labelledby="t1-features">
      <div class="wrap t1p-wrap">
        <p class="eyebrow mono">// WHAT&rsquo;S IN IT</p>
        <h2 id="t1-features">Everything people ring us about, in one simple program</h2>
        <p class="t1p-lede">Techies One started as a simple email program. Now the same window shows your photos, writes your letters, adds up your sums and looks after your files, with the same big buttons, plain words, help on every screen and a real person to ring.</p>
        <ul class="t1p-parts">{tiles}</ul>
      </div>
    </section>"""


# The 0.22 Shorts (18 Oct 2026, reels/techies-one-022-shorts: the released 0.22 demo, Lily's voice, captions burned in),
# each on its matching feature, keyed by that feature's picture name. They play in one pop-up player (CLIP_DIALOG), so the
# page keeps its layout; without the script the link opens the video itself. Cached for a year like the films, so each file
# carries the reel's own version (a new cut = a new name). SAYS = Lily's lines exactly, for the schema's transcript.
SHORTS_UPLOADED = "2026-10-18"
SHORTS = {
    "albums": ("photos-by-date-v2", 26, "All your photos, by date",
               "What were you doing on this day, years ago? Techies One Albums puts your photos in order, by the date they were "
               "taken. Jump to any year, or any month. Looking back finds your old memories. It asks you first. Then sit back, "
               "and enjoy the slideshow."),
    "picasa": ("picasa-v2", 23, "Your Picasa stars, captions and albums, brought across",
               "Spent years putting your photos in albums? Techies One Albums brings across the stars, captions and albums you "
               "made in Picasa. Your favourites come back, with the words under each photo. And your photos themselves aren't "
               "changed."),
    "film": ("make-a-film-v2", 24, "Make a film of your photos",
             "Make a film of your family photos. For the family, for the TV, or for a memorial service. Add a title, and a few "
             "words at the end. Techies One makes it right here on your PC, with our own music. Then watch it together, or send "
             "it to the family."),
    "folders": ("new-email-folders-v3", 21, "New email by the clock, and your own folders",
                "Know the moment a new email arrives. A notice pops up down by the clock, saying who it's from. Scams are never "
                "announced. They go straight to Scams. And make your own folders, for family, the club, anything you like."),
    "bring-in": ("old-emails-v2", 21, "Old emails from Outlook, brought with you",
                 "Moving from Outlook? Bring your old emails with you. Choose your Outlook file, and Techies One shows what's in "
                 "it. Your emails come into a mailbox on this PC, folders and all. And your Outlook file is never changed."),
    "backup": ("backup-v2", 21, "Back up your email to a USB stick",
               "If your computer broke tomorrow, would your emails be safe? Techies One backs up your email and contacts to a USB "
               "stick. Check the backup, and bring it back whenever you need it. And backups never contain your passwords."),
    "envelopes": ("envelopes-v2", 24, "Christmas cards: the envelopes",
                  "Christmas cards to send? Let Techies One do the envelopes. Tick the people you're sending to, and choose "
                  "Envelopes. Test one on folded paper first, so you know which way they go in. Or print address labels "
                  "instead. And keep this year's card list, too."),
}
SHORT_END = " Free, from 365 Techies."


def short_link(name):
    if name not in SHORTS:
        return ""
    f, secs, title, says = SHORTS[name]
    base = f"/images/t1-short-{f}"
    return (f'\n              <a class="t1p-clip" id="short-{f[:f.rindex("-v")]}" href="{base}.mp4" data-poster="{base}-poster.webp" '
            f'data-label="{title}: {secs} seconds, with a spoken guide and captions" data-says="{html.escape(says + SHORT_END)}">'
            f'<span class="t1p-clip__pic"><img src="{base}-thumb.webp" width="72" height="72" alt="" loading="lazy" decoding="async">{PLAY_SVG}</span>'
            f'<span><b>Watch it in {secs} seconds</b><small>The real program, with a spoken guide and captions</small></span></a>')


# One player for every Short: a modal dialog (Esc, the X or a click outside closes it and stops the video)
CLIP_DIALOG = ('    <dialog class="t1p-dlg" id="t1clip" aria-label="Techies One video" aria-describedby="t1clip-says">'
               '<button class="t1p-dlg__x" type="button" aria-label="Close the video">&times;</button>'
               '<video controls playsinline preload="none" width="1080" height="1920"></video>'
               '<p class="t1p-dlg__says" id="t1clip-says"></p></dialog>\n'
               '    <script>(function(){var d=document.getElementById("t1clip");if(!d||!d.showModal)return;'
               'var v=d.querySelector("video"),s=document.getElementById("t1clip-says");'
               'document.querySelectorAll("a.t1p-clip").forEach(function(a){a.addEventListener("click",function(e){e.preventDefault();'
               'v.poster=a.getAttribute("data-poster");v.src=a.getAttribute("href");v.setAttribute("aria-label",a.getAttribute("data-label"));'
               's.textContent=a.getAttribute("data-says");d.showModal();var p=v.play();if(p&&p.catch)p.catch(function(){});});});'
               'd.addEventListener("close",function(){v.pause();v.removeAttribute("src");v.load();});'
               'd.querySelector(".t1p-dlg__x").addEventListener("click",function(){d.close();});'
               'd.addEventListener("click",function(e){if(e.target===d)d.close();});})();</script>')


def feat_blocks(feats):
    blocks = []
    for f in feats:
        fid, name, tag, prob, h, body, alt = f
        art = " t1p-shot--art" if tag in ART else ""
        idattr = f' id="{fid}"' if fid else ""
        blocks.append(f"""          <div class="t1p-feat"{idattr}>
            <div class="t1p-feat__txt">
              <p class="t1p-prob mono">{prob}</p>
              <h3>{h}</h3>
              <p>{body}</p>{short_link(name)}
            </div>
            <figure style="margin:0"><div class="t1p-shot{art}">{shot(name, alt, tag)}</div></figure>
          </div>""")
    return "\n".join(blocks)


# (anchor id, picture name, picture tag, the problem, heading, what it does, the picture's alt text)
MAIL_FEATS = [
    # 16 Oct 2026: All inboxes, retaken on 0.19 (the left-hand bar now shows Letters, Sums and Files)
    ("", "mail", TAG, "Several email addresses to keep an eye on",
     "All your inboxes in one list",
     "Got a BT address, a Gmail and a work one? Add them all, and <strong>All inboxes</strong> shows the email from every one of them in one list, newest first, each marked with the address it came to. Reply, and it goes from the address the email was sent to, so you never answer from the wrong one. The Unread tab works across them all, and searching while All inboxes is open looks through every inbox.",
     "All inboxes in Techies One Mail: one list, newest first, each email marked with the address it came to, with Letters, Sums and Files on the left-hand bar (a made-up sample)"),
    ("", "scams", TAG, "Scam emails are the biggest worry",
     "Warnings about scams, in plain English",
     "Every email you open is checked on your PC for the tell-tale signs of a scam: a fake Royal Mail, HMRC or bank sender, a link that goes somewhere other than it says, a dangerous attachment, or pressure words like &ldquo;within 24 hours&rdquo;. It tells you exactly why. While Techies One is running, even with its window minimised or closed, obvious scams go to a Scams folder and the sender is blocked; anyone you&rsquo;ve emailed before is never moved to Scams, though you&rsquo;re told to be careful if something looks wrong. Like any checker it can get things wrong, so if in doubt, ask us.",
     "The Scams folder in Techies One Mail: a pretend HMRC tax refund email with a red box listing in plain English why it looks like a scam, and buttons to put it back in the Inbox or ask 365 Techies (a made-up sample)"),
    # 18 Oct 2026 (0.20 on): no green tick any more - a grey line, because no check can prove an email is safe
    ("", "not-flagged", NEW, "&ldquo;Is this really from them?&rdquo;",
     "It never tells you an email is safe",
     "When the check finds no warning signs, a plain grey line says only that: Techies One&rsquo;s check did not flag the email, and that doesn&rsquo;t prove it is safe. If all an email has in its favour is that you&rsquo;ve written to that person before (their account could have been taken over), an amber <strong>Be careful</strong> box says so, with <strong>Move to Scams</strong>. If an email asks for money, bank details or a code, check by phone first. Pictures from the internet stay hidden until you choose to show them, so senders can&rsquo;t tell when you&rsquo;ve opened their email.",
     "An email from Sarah Pritchard about Sunday lunch, with a grey line: Techies One&rsquo;s check did not flag this email, that does not prove it is safe (a made-up sample)"),
    ("", "add-bt-email", OLD_TAG, "Settings, ports and passwords put people off",
     "Type your address; it does the rest",
     "Techies One knows the settings for the big UK providers, so there are no server names or port numbers to look up. It tells you which password it needs (BT&rsquo;s normal one, or a Gmail app password) and checks everything works before it saves. Moving from an old program? <strong>Look for my old email settings</strong> adds the addresses it used; you type each password once, because Techies One never reads saved passwords.",
     "Adding a btinternet.com address: Techies One says it knows the settings and only asks for the BT email password (a made-up sample)"),
    ("", "folders", NEW, "&ldquo;Where&rsquo;s the button to make a folder?&rdquo;",
     "Your own email folders, as in Outlook",
     "Select <strong>New folder</strong> under your email address to make a folder for the club, the house or the family. The <strong>&hellip;</strong> button beside a folder makes one inside it, renames it or deletes it (its emails go to Deleted first), and <strong>Move to</strong> puts an email into any of them, in Simple view too. The folders are made at your email provider, so a phone reading the same address sees them as well.",
     "Mail with a folder&rsquo;s options open: New folder inside, Rename, Add to Favourites and Delete folder, with New folder under the email address (a made-up sample)"),
    ("", "clean-up", OLD_TAG, "Years of newsletters and junk",
     "Clean up your inbox in minutes",
     "Clean up lists everyone who fills your inbox, biggest first: mailing lists, emails you never open, senders gone quiet for over a year. Unsubscribe from genuine newsletters in one press (it refuses on anything suspicious, because that would tell a scammer your address works), delete or archive all of a sender&rsquo;s emails at once, or send a whole company to Junk from now on. Deleted email goes to Deleted, so nothing is lost by mistake.",
     "The Clean up screen listing each sender with how many emails they sent, a mailing list tag, and Unsubscribe and Delete all buttons (a made-up sample)"),
    ("old-emails", "bring-in", NEW, "Years of emails stuck in an old program",
     "Bring in old emails from Outlook, Windows Live Mail and Thunderbird",
     "<strong>Bring in old emails</strong> copies emails, contacts and calendars from an Outlook .pst or .ost file, Windows Live Mail, Windows Mail, Thunderbird, a Google Takeout download or a folder of saved emails, and from Outlook Express files too (that one is still experimental). <strong>Look for them on this PC</strong> searches the usual places for you. They go into a mailbox under <strong>On this PC</strong>, by your inboxes, kept on your computer rather than using your email company&rsquo;s space, and the files they came from are never changed.",
     "The Bring in old emails box: Look for them on this PC, an Outlook file, a folder of saved emails, a mailbox file, an Outlook Express file and a Techies One backup (a made-up sample)"),
    ("", "backup", NEW, "&ldquo;What if the PC dies?&rdquo;",
     "Back up your email to a USB stick or OneDrive",
     "<strong>Backups</strong>, in Settings, copies the email from your addresses, your mailboxes on this PC, your contacts (with their postal addresses) and your calendar to a USB stick, another drive or OneDrive, as ordinary email files that other programs can open too. Later backups add only what&rsquo;s new, and <strong>Bring back</strong> puts a backup back without doubling anything up. Passwords are never put in a backup.",
     "Back up your email: what to back up (an address, a mailbox on this PC, contacts and calendar), where to put it (a USB stick, OneDrive, iCloud Drive or this PC) and Back up now (a made-up sample)"),
    ("", "address-book", NEW, "An address book you never had time to make",
     "An address book that fills itself in",
     "The people who email you, and everyone you email, go into your address book by themselves (newsletters and scam senders are left out), sorted into groups: Family, Health, Clubs &amp; groups, Businesses &amp; services and more. Add postal addresses and mobile numbers, email a whole group in one go, block someone in one press, or bring in contacts from Outlook, Gmail or any contacts file (.csv or .vcf), addresses and all.",
     "The address book showing the Family group, with Envelopes, Labels, Email and WhatsApp buttons for the people ticked, and Sarah Pritchard&rsquo;s email, postal address and mobile (a made-up sample)"),
    ("", "envelopes", NEW, "Christmas cards and a pile of envelopes to write",
     "Envelopes, labels and your Christmas card list",
     "Tick the people, then press <strong>Envelopes</strong> (C6, DL, C5 or any size) or <strong>Labels</strong> (the usual A4 sheets of sticky labels, starting at whichever label is next). It shows each one first, and a test on folded paper tells you which way the envelope goes in. People at the same address get one envelope. <strong>Email</strong> sends each person their own &ldquo;Dear Sarah&rdquo; email, and <strong>WhatsApp</strong> opens a message for each in turn: you press Send. The <strong>Christmas card list</strong> keeps who you sent a card to, and who sent one to you, year by year. No mail merge to learn.",
     "Print envelopes for 4 people: the envelope sizes C6, DL, C5 and another size, an option to add your own address, a test print on folded paper, and a preview of the first envelope (a made-up sample)"),
    ("", "calendar", OLD_TAG, "Appointments in one place",
     "A calendar that can keep your phone in step",
     "A clear month calendar with reminders that pop up by the clock while Techies One is running, even with its window minimised or closed. Sign in with an Outlook.com or Hotmail address and your Outlook calendar syncs both ways, so a dentist appointment you add on the PC also appears on a phone that shows your Outlook calendar. With other addresses the calendar is kept on your PC. Add the UK bank holidays in one click, or a school-terms or bin-day calendar from a link.",
     "The calendar for October 2026 with a dentist appointment, book club, a flu jab and a family visit, the next appointments listed under Coming up, and the UK bank holidays calendar on the right (a made-up sample)"),
    ("", "simple-view", NEW, "Too many buttons",
     "Big buttons and big text when you want them",
     "Simple view keeps just the everyday buttons (reading, writing, replying, deleting and reporting scams), bigger, with <strong>Help</strong> and a green <strong>Ask 365 Techies</strong> button that asks one of us to ring you back (it sets out the price before you send anything). Text size goes up to extra large, there&rsquo;s a dark mode, and it can read an email out loud using Windows&rsquo; own voice.",
     "Simple view: large buttons for New email, Delete, Report scam, Reply, Forward and Print, a Help button and a green Ask 365 Techies button, with Mail, Letters, Sums, Files and Albums named down the left (a made-up sample)"),
]

MAIL_MORE = [
    ("New-email pop-ups", "Techies One looks in every inbox about every 2 minutes, even with its window minimised or closed, and a note pops up by the clock when new email arrives. Scams and junk are never announced, and you can switch the notes off in Settings."),
    ("Undo send", "Choose up to 30 seconds to change your mind after pressing Send."),
    ("Send later and snooze", "Have an email go tomorrow at 8am, or put one away until next week (your PC needs to be on, with Techies One running, at that time)."),
    ("Rules", "Always move emails from someone into a folder, or mark them read."),
    ("Several addresses, one window", "BT, Gmail and a work address together, each in its own colour, or all in one list with All inboxes."),
    ("Attachments open inside", "Word, Excel and PDF attachments open right in the window; a Word or Excel one can be changed in Letters or Sums (as a copy), or saved straight into a folder."),
    ("Mail Mover", "Copy all your email from one address to another (say, Plusnet to Gmail), folder by folder, without deleting anything. A big mailbox can take a few days."),
    ("Templates and a signature", "Save the replies you write again and again; add a signature with a small logo."),
    ("Club newsletters", "Send a newsletter to a club or your customers, paced to stay within your provider&rsquo;s usual limits, with a proper unsubscribe line and no tracking."),
    ("Outlook&rsquo;s shortcuts", "Ctrl+N, Ctrl+R and the rest work as they did in Outlook."),
    ("An optional writing helper", "If you switch it on and add your own key from Anthropic (the company that makes the Claude AI), it can help you write a reply or explain an email. Anthropic charges each use to your account with them, usually a few pence, and the email you ask about is sent to Anthropic to do it. It&rsquo;s off until you switch it on, and everything else works without it."),
]


def mail():
    more_html = "".join(f"<div><b>{t}</b><span>{d}</span></div>" for t, d in MAIL_MORE)
    return f"""    <section class="section t1p" id="mail" aria-labelledby="t1-mail">
      <div class="wrap t1p-wrap">
        <div class="t1p-intro">
          <div>
            <p class="eyebrow mono">// MAIL</p>
            <h2 id="t1-mail">Mail: the simple replacement for Windows Mail and Outlook Express</h2>
            <p class="t1p-lede">Email programs have looked much the same for twenty years. Techies One Mail was built around the problems our customers actually ring us about: scams, settings that won&rsquo;t take, an inbox they can&rsquo;t keep on top of, and too many buttons. This film shows it fixing them.</p>
          </div>
          <figure style="margin:0">
            {film(FILM, FILM_POSTER, "Techies One Mail in %d seconds: the email problems it fixes, with a spoken guide and captions" % FILM_SECS,
                  "Watch: the email problems it fixes, in %d seconds" % FILM_SECS, "Watch the email film (%d s)" % FILM_SECS)}
            <figcaption class="t1p-cap">The real program, with a spoken guide and captions. The people and emails are made-up samples, apart from us. <a href="/techies-one-mail-film/">Watch it on its own page</a>.</figcaption>
            <details class="t1p-says"><summary>What the email film says</summary><p>{FILM_SAYS}</p></details>
          </figure>
        </div>
        <div class="t1p-feats">
{feat_blocks(MAIL_FEATS)}
        </div>
        <h3 style="margin:2.4rem 0 0">And the everyday things you&rsquo;d expect</h3>
        <div class="t1p-more">{more_html}</div>
      </div>
    </section>"""


# Albums (0.20-0.22, 16-17 Oct 2026; plan research\techies-one-photos-2026-10-16\07-FINAL-PLAN.md). Rules kept from the
# app: it never changes, moves or uploads her photo files; nothing about photos goes to 365 Techies; no faces, no maps;
# Looking back and On this day only after she says yes; Google Photos, Amazon Photos and Facebook can't be shown.
ALBUM_FEATS = [
    ("", "albums", NEW, "Photos on the PC, a USB stick, the camera and OneDrive",
     "All your photos by date, wherever they&rsquo;re kept",
     "Albums finds the photos and videos in your Pictures, Videos and Desktop folders, on USB sticks and in the cloud folders on your PC, and shows them newest first by the date they were taken, with the years and months down the side. Plug in a camera&rsquo;s memory card and it offers to copy just the new photos into Pictures, by year and month, without changing anything on the card. Signed in to OneDrive in Techies One, it can also show the photos kept only online, once you say yes, without downloading them.",
     "All photos in Albums, newest first, with cards offering to bring in 7 new photos from a camera card, copy 31 photos that are only on a USB stick, and fill in the OneDrive photos kept only online (a made-up sample)"),
    ("", "looking-back", NEW, "Thousands of photos you never look at",
     "Looking back: memories, if you&rsquo;d like them",
     "Only if you say yes, <strong>Looking back</strong> gathers On this day, A year ago this week, your trips and busy days, Christmas through the years, the birthdays you set and, once you&rsquo;ve said who&rsquo;s in some photos, &ldquo;Ellie through the years&rdquo;. <strong>Not this one</strong> hides a memory you&rsquo;d rather not see, and you can pause it for a month, leave someone out or switch it off. It never uses screenshots or photos you&rsquo;ve hidden, and nothing ever pops up.",
     "Looking back in Albums: On this day, Garden 2025 and Christmas 2024, each with Show them, Slideshow and Not this one buttons, and more memories below (a made-up sample)"),
    ("", "slideshow", NEW, "Showing the family on the big screen",
     "Slideshows, and photos sent at the right size",
     "Choose some photos, an album or a memory and press <strong>Slideshow</strong>: full screen, with gentle or happy music if you like, slower or faster, and your words under each photo read aloud if you want. <strong>Send</strong> emails copies made smaller, with where they were taken removed, or opens WhatsApp with them a few at a time for you to press Send, or saves copies on a USB stick.",
     "A slideshow in Albums: a photo of St Ives harbour with its date, and Pause, Back, Next, Slower, Faster, Music and Stop buttons along the bottom (a made-up sample)"),
    ("", "film", NEW, "A film for a birthday, or for a funeral",
     "Make a short film of your photos",
     "Pick the photos and Albums makes a short film with music, on your PC, with nothing extra to install. Choose what it&rsquo;s for: <strong>to send to family</strong> (small enough for WhatsApp), <strong>to show on a TV</strong>, or <strong>for a funeral or memorial service</strong>, calm and plain, the kind of video file crematoria usually ask for (check with the funeral director). Then watch it, send it, share a link from your own OneDrive or put it on a USB stick.",
     "Make a film, step 1 of 3: what is this film for? To send to family, to show on a TV, or for a funeral or memorial service, with the films already made listed below (a made-up sample)"),
    ("picasa", "picasa", NEW, "Picasa stopped, and your stars and captions are in it",
     "Bring across your Picasa work",
     "Picasa kept notes about your photos in its own files. Albums reads them: your <strong>stars</strong> become favourites, your <strong>captions</strong> become words under the photos, and your Picasa 3.9 <strong>albums</strong> become My albums. Captions written inside the photos themselves come too. It leaves out the faces and places Picasa kept, and your photos and Picasa&rsquo;s files aren&rsquo;t changed. Then carry on where Picasa left off: type who&rsquo;s in a photo (Techies One doesn&rsquo;t recognise faces), add words, and find photos by typing &ldquo;Ellie Christmas 2019&rdquo;.",
     "Bring across your Picasa work: Albums can bring the stars across as favourites, the captions as words under the photos and the albums into My albums, and leaves out the face and place details Picasa kept (a made-up sample)"),
    ("", "keep-safe", NEW, "Every photo on one PC that could break",
     "Keep safe: a second copy on a USB drive",
     "If your photos are only on this PC, a fire, a burglary or a broken PC could lose them. <strong>Keep safe</strong> copies every photo and video onto a USB stick or drive, then adds only the new and changed ones each time, and never replaces anything already on the drive. The drive gets a plain <strong>Open my photos</strong> page, so the family can look through them on another computer. Anyone who finds the drive can see your photos too, so it says to keep it somewhere safe.",
     "Keep your photos safe: your photos are in 1 place, this PC; make the copy on the USB stick BACKUP, with how much room it needs and a tip to keep a copy away from home (a made-up sample)"),
]

ALBUM_MORE = [
    ("Who&rsquo;s in this photo?", "Type the names, for one photo or many at once. Nothing recognises faces, and the names stay on this PC."),
    ("Words under a photo", "Add a caption, typed or dictated, and have it read aloud in a slideshow."),
    ("Search by words", "Find photos by date, folder and file names, your words, album names and the names you added. It can&rsquo;t look inside the pictures themselves."),
    ("Set the date", "Old scans can be &ldquo;about 1984&rdquo; or &ldquo;the 1970s&rdquo;, and a camera whose clock was never set can be put right. The photo file itself is never changed."),
    ("My albums", "Gather photos into albums without moving them, choose a cover, and find ready-made lists such as Old scanned photos and WhatsApp photos."),
    ("Save these photos", "Photos in an email go into Pictures, in a folder named after the sender, in one press (never from an email the scam check doubts)."),
    ("Photos kept only online", "OneDrive photos that aren&rsquo;t on the PC show in date order once you say yes, and <strong>Keep this month on this PC</strong> brings a month down."),
    ("Find the extra copies", "Albums tells you when photos are on the PC more than once, and Space tidies them safely."),
]


def albums():
    more_html = "".join(f"<div><b>{t}</b><span>{d}</span></div>" for t, d in ALBUM_MORE)
    return f"""    <section class="section section--alt t1p" id="albums" aria-labelledby="t1-albums">
      <div class="wrap t1p-wrap">
        <p class="eyebrow mono">// ALBUMS &middot; NEW</p>
        <h2 id="t1-albums">Albums: all your photos, in the order they were taken</h2>
        <p class="t1p-lede">For everyone who misses Picasa: your photos and videos from this PC, USB sticks, camera cards and your cloud folders, together in date order, with slideshows, films and memories. Albums never changes, moves or uploads your photo files, and nothing about your photos is sent to 365 Techies.</p>
        <div class="t1p-feats">
{feat_blocks(ALBUM_FEATS)}
        </div>
        <h3 style="margin:2.4rem 0 0">And more in Albums</h3>
        <div class="t1p-more">{more_html}</div>
      </div>
    </section>"""


HELP_FEATS = [
    ("help", "help", NEW, "&ldquo;How do I make the writing bigger?&rdquo;",
     "Help on every screen, in plain English",
     "Press <strong>Help</strong>, or F1, and Techies One shows the help for what you&rsquo;re doing. Or type a question in your own words into <strong>How do I...?</strong>: it finds the answer here on your PC, and for a few settings gives you a button that does it for you. Help pages can be printed in large print or read aloud, and resting the mouse on a button shows a short tip. Rather talk to a person? <strong>Ask 365 Techies</strong> asks one of us to ring you back: checking a problem is free, and any work is priced before we start.",
     "Help beside a new email: How do I...? with make the writing bigger typed in, and the first answer offering Make it Large and Make it Extra large (a made-up sample)"),
]


def help_section():
    return f"""    <section class="section section--alt t1p" aria-labelledby="t1-help">
      <div class="wrap t1p-wrap">
        <p class="eyebrow mono">// HELP ON EVERY SCREEN</p>
        <h2 id="t1-help">Stuck? The answer is on the screen</h2>
        <div class="t1p-feats">
{feat_blocks(HELP_FEATS)}
        </div>
      </div>
    </section>"""


_DROPBOX = ("or Dropbox" if DROPBOX_ON else "and Dropbox is coming")
SUITE_FEATS = [
    ("letters", "letters", TAG, "A letter to write, and no Word on the PC",
     "Letters: the letter is written with you",
     "Start from a ready-made letter: a complaint, cancelling a contract or subscription, asking for a copy of your records, a letter to the council, a thank-you, a notice or a CV. Your name and address go at the top by themselves, with today&rsquo;s date the British way, and <strong>Next [ ]</strong> takes you to each gap to fill in. It&rsquo;s a proper A4 page, saved as you type as a Word file in your Documents folder, so it opens in Word too. Print it, save it as a PDF, or email it in one click.",
     "Letters in Techies One: a finished complaint letter on its A4 page, with the sender&rsquo;s details at the top and Save as PDF and Email it buttons (a made-up sample)"),
    ("sums", "sums", TAG, "Household bills on the back of an envelope",
     "Sums: a spreadsheet that adds itself up",
     "Start from a household budget, bills and direct debits, expenses, a mileage log, club accounts or profit and loss over the UK tax year, or open an Excel file. Type what comes in and what goes out, and the totals follow. It understands about 90 of Excel&rsquo;s formulas, saves real Excel files in your Documents folder so they open in Excel too, and emails a sheet as a PDF or an Excel file.",
     "Sums in Techies One: a household budget with money coming in and going out, and the totals worked out (a made-up sample)"),
    ("files", "files", TAG, "Photos everywhere, and no idea where",
     "Files: your PC, USB sticks and clouds in one window",
     f"Documents, Pictures, Downloads and your USB sticks, with the OneDrive, Dropbox, Google Drive and iCloud folders their own apps keep on your PC, in one simple window. See your photos big, move and copy with a progress bar and Undo, and nothing is deleted for good without asking: it goes to the Recycle Bin. You can sign in to OneDrive right inside Techies One ({_DROPBOX}). With Apple&rsquo;s iCloud for Windows app on the PC, <strong>Move out of iCloud</strong> brings photos and videos down to the PC or a USB stick and frees your iCloud space; it says plainly first that this takes them off your iPhone and iPad too.",
     "Files in Techies One: the Pictures folder as big thumbnails, with Documents, OneDrive, iCloud Drive and a USB stick in the list of places (a pretend PC)"),
    ("space", "space", TAG, "&ldquo;Your PC is running out of space&rdquo;",
     "Space: see how full everything is",
     "Space rings show how full your PC, your USB sticks and your signed-in OneDrive are: green, amber at 85%, red at 95%, each with how much is free. <strong>What&rsquo;s using This PC</strong> shows where the room has gone (pictures, videos, downloads, the Recycle Bin), with a plain hint where it helps, and a click opens that folder.",
     "Space in Techies One: rings showing how full This PC, a USB stick and OneDrive are, with This PC in red, and a bar showing what&rsquo;s using This PC (a pretend PC)"),
    ("duplicates", "duplicates", TAG, "The same photos saved three times",
     "Find the duplicates and the biggest files, and make room safely",
     "<strong>Find duplicates</strong> checks photos and videos by what&rsquo;s inside them, not just their names, and never downloads an online-only file to do it. It ticks the extra copies and keeps the one in the tidiest place; a copy on a USB stick or in a cloud is left unticked, because it may be your backup. <strong>Remove the ticked copies</strong> puts them in the Recycle Bin, so you can get them back, and it never removes the last copy of anything. <strong>Find the biggest files</strong> lists what takes the most room, ready to move to a USB stick.",
     "Find duplicates in Techies One: three copies of a wedding video, one marked Keeping this one, a backup on a USB stick left unticked, and the extra copy ticked, with a Remove 17 extra copies button (a pretend PC)"),
    ("share", "share", TAG, "A video too big to email or WhatsApp",
     "Share a link: send it by WhatsApp or email",
     "Right-click a video or file and choose <strong>Share a link</strong>. Techies One puts it in your own OneDrive (you sign in once, on Microsoft&rsquo;s own page) and gives you a link to send by email or WhatsApp, or a code to scan with your phone&rsquo;s camera. <strong>Send by WhatsApp</strong> opens WhatsApp with the link typed in: you choose who it goes to and press Send. Stop sharing whenever you like. The file stays in your OneDrive: 365 Techies never holds your files.",
     "The Share a link window in Techies One: the link, Send by WhatsApp, Send by email and Copy buttons, and a code to scan with a phone (a pretend OneDrive)"),
    ("dictate", "dictate", TAG, "Typing is slow, or hard on the hands",
     "Dictate: talk instead of typing",
     "Press <strong>Dictate</strong> in an email, a letter or a mailing and speak: your words appear where the cursor is. Say &ldquo;full stop&rdquo;, &ldquo;comma&rdquo;, &ldquo;question mark&rdquo; or &ldquo;new paragraph&rdquo; for those. Microsoft turns your speech into words over the internet, as Windows&rsquo; own voice typing does, so Dictate needs an internet connection.",
     "Dictate in Techies One Letters: the Listening strip, with the spoken words appearing in the letter (a made-up sample)"),
]


def suite():
    return f"""    <section class="section t1p" id="more" aria-labelledby="t1-more">
      <div class="wrap t1p-wrap">
        <p class="eyebrow mono">// LETTERS &middot; SUMS &middot; FILES &middot; SPACE</p>
        <h2 id="t1-more">Letters, sums and your files, in the same window</h2>
        <p class="t1p-lede">The same big buttons and plain words as Mail, for the other things people ask us about every week. Letters and Sums save ordinary Word and Excel files, so nothing is locked in.</p>
        <div class="t1p-feats">
{feat_blocks(SUITE_FEATS)}
        </div>
      </div>
    </section>"""


HISTORY = f"""    <section class="section t1p" aria-labelledby="t1-what-happened">
      <div class="wrap t1p-wrap">
        <p class="eyebrow mono">// WHY YOUR OLD EMAIL PROGRAM STOPPED</p>
        <h2 id="t1-what-happened">What happened to Windows Mail, Outlook Express and Windows Live Mail?</h2>
        <p class="t1p-lede">Each was Microsoft&rsquo;s free email program for its time, and each has ended. For most people the email itself is still with their email provider, waiting for a program that can open it. The exception is an old program set to the &ldquo;POP&rdquo; setting, which kept email only on that PC; Techies One can <a href="#old-emails">bring those emails in</a> from the old program&rsquo;s files.</p>
        <div class="t1p-tbl">
          <table>
            <thead><tr><th scope="col">Program</th><th scope="col">Came with</th><th scope="col">What happened</th></tr></thead>
            <tbody>
              <tr><th scope="row">Outlook Express</th><td>Windows XP</td><td>Ended with Windows XP on 8 April 2014. Windows Vista replaced it with Windows Mail, and no later Windows has included it.</td></tr>
              <tr><th scope="row">Windows Mail (Vista)</th><td>Windows Vista</td><td>Ended with Vista on 11 April 2017.</td></tr>
              <tr><th scope="row">Windows Live Mail 2012</th><td>A free download for Windows 7</td><td>Support ended on 10 January 2017. In 2016 it lost its direct link to Hotmail and Outlook.com (people could still connect it another way), and on 16 September 2024 Outlook.com stopped accepting plain passwords from any program that can&rsquo;t use Microsoft&rsquo;s modern sign-in, which ended that too.</td></tr>
              <tr><th scope="row">Mail and Calendar</th><td>Windows 10 and 11</td><td>Support ended on 31 December 2024. Microsoft says it can no longer send or receive email, and points people to the new Outlook.</td></tr>
            </tbody>
          </table>
        </div>
        <p class="t1p-src">Dates from Microsoft&rsquo;s support and lifecycle pages and, for the 2016 Hotmail change, press reports at the time; checked {CHECKED}.</p>
        <p style="margin-top:1.2rem;max-width:52rem;line-height:1.6"><strong>A warning about &ldquo;Outlook Express for Windows 11&rdquo; downloads.</strong> Microsoft no longer offers Outlook Express or Windows Live Mail anywhere, so a website offering them is not Microsoft, and old copies get no security fixes. Many people also call Outlook.com or the new Outlook &ldquo;Outlook Express&rdquo;: if that&rsquo;s the one you mean, it is still going, and our <a href="/outlook-problems/">Outlook help</a> covers it.</p>
      </div>
    </section>"""

PROVIDERS = [
    ("BT", "btinternet.com, btopenworld.com", "Your normal BT email password", "BT Basic email (kept after leaving BT broadband) only works on bt.com, in no email program. <a href=\"/btinternet-email-wont-add-to-new-outlook/\">More about BT email</a>."),
    ("Sky", "sky.com", "Your Sky iD password", "Changed it lately? Use &ldquo;Unlock your emails&rdquo; on sky.com first. <a href=\"/sky-email-wont-add-to-new-outlook/\">More about Sky email</a>."),
    ("Plusnet", "name@username.plus.com", "Your Plusnet mailbox password", "Older force9 and free-online addresses may need the settings typed in. Plusnet email that has moved to Greenby uses the same settings: <a href=\"/greenby-email-login/\">logging in to Greenby</a>. <a href=\"/plusnet-email-wont-add-to-new-outlook/\">More about Plusnet</a>."),
    ("Virgin Media", "virginmedia.com, ntlworld.com, blueyonder.co.uk, virgin.net", "A Virgin Media app password, made in the My Virgin Media app", "Making a new one stops the old one working on your other devices, and Virgin often won&rsquo;t give one for a second mailbox (ask us if that happens). Virgin email is moving to Junara: <a href=\"/virgin-media-email-moving-to-junara/\">what that means</a>."),
    ("Gmail", "gmail.com, googlemail.com", "A Google app password", "Needs Google&rsquo;s 2-Step Verification switched on first. The app shows you where to make one."),
    ("Yahoo and AOL", "yahoo.co.uk, yahoo.com, aol.com and others", "A Yahoo or AOL app password", "Made under Account security on the Yahoo or AOL website."),
    ("Outlook.com and Hotmail", "outlook.com, hotmail.co.uk, live.co.uk, msn.com and others", "Sign in on Microsoft&rsquo;s own page", "Techies One never sees your Microsoft password. Microsoft&rsquo;s page may call the app &ldquo;unverified&rdquo; while we finish Microsoft&rsquo;s checks. Your Outlook calendar syncs both ways."),
    ("Work addresses on Microsoft 365", "your company&rsquo;s own address", "Sign in on Microsoft&rsquo;s own page", "Your company&rsquo;s IT administrator will usually need to approve the app, and to switch on &ldquo;SMTP AUTH&rdquo; sending for your mailbox (it&rsquo;s off on many small-business setups). If that&rsquo;s us, just ring."),
    ("Other providers (including TalkTalk)", "any other address", "Usually your normal password", "Techies One looks up the settings itself, or you can type them in. We haven&rsquo;t yet tested every provider, TalkTalk included, so if it won&rsquo;t connect, ring us."),
]


def providers():
    rows = "".join(f"<tr><th scope=\"row\">{n}</th><td>{a}</td><td>{h}</td><td>{note}</td></tr>" for n, a, h, note in PROVIDERS)
    return f"""    <section class="section section--alt t1p" aria-labelledby="t1-works-with">
      <div class="wrap t1p-wrap">
        <p class="eyebrow mono">// WORKS WITH YOUR EMAIL ADDRESS</p>
        <h2 id="t1-works-with">Will it work with my email address?</h2>
        <p class="t1p-lede">Almost certainly. You type your address and Techies One fills in the settings. What you need to sign in depends on who your email is with:</p>
        <div class="t1p-tbl">
          <table>
            <thead><tr><th scope="col">Email from</th><th scope="col">Addresses ending</th><th scope="col">How you sign in</th><th scope="col">Good to know</th></tr></thead>
            <tbody>{rows}</tbody>
          </table>
        </div>
        <p class="t1p-src">It reads email that is kept on your provider&rsquo;s server (IMAP), so your phone and PC show the same email. It doesn&rsquo;t collect email by the older POP setting (though it can bring in what an old POP program kept), and Apple iCloud email isn&rsquo;t supported.</p>
      </div>
    </section>"""


COMPARE = [
    ("us", "Techies One (365 Techies)", "Free", "No limit on addresses, all your inboxes in one list, and no adverts; your own folders, old emails brought in, and Albums, Letters, Sums and Files come with it. Catches: Windows only; no POP; scam checks, the blocked list and new-email pop-ups work only while Techies One is running", "Yes: ring 01202 775566 (Mon to Fri 9 to 5) or press Ask 365 Techies in the app. Checking a problem is free; any work is priced before we start", "Windows 10 and 11 (64-bit)"),
    ("", "New Outlook (Microsoft)", "Free with adverts in the inbox; no adverts with Microsoft 365, from &pound;19.99 a year (Basic)", "The free version shows adverts", "Call-back for paying Microsoft 365 subscribers", "Windows 10 and 11"),
    ("", "Classic Outlook (Microsoft 365 Personal)", "&pound;84.99 a year, which also includes Word, Excel and 1 TB of storage", "Needs a subscription, or Office Home &amp; Business 2024 (&pound;249.99 one-off); Office Home 2024 doesn&rsquo;t include it", "Call-back for paying subscribers", "Windows (Mac has its own Outlook)"),
    ("", "Thunderbird (Mozilla)", "Free, funded by donations", "No limits; blocking a sender needs a filter", "Community forums", "Windows, Mac, Linux and Android"),
    ("", "eM Client", "Free for home use; Personal &pound;42.95 a year or &pound;64.95 once", "Free version: 2 email addresses, home use, 1 computer", "VIP support on paid plans", "Windows and Mac"),
    ("", "Mailbird", "Free; Premium &pound;3.44 a month (billed yearly) or &pound;74.75 once", "Free version: 1 address; the calendar, contacts, combined inbox and blocking are Premium", "VIP email support on Premium", "Windows and Mac"),
    ("", "OE Classic", "Free; Pro US$19 a year", "Some features are in Pro", "No UK phone support", "Windows"),
]


def compare():
    rows = "".join(('<tr class="us">' if c else "<tr>") + f'<th scope="row">{n}</th><td>{p}</td><td>{l}</td><td>{s}</td><td>{w}</td></tr>'
                   for c, n, p, l, s, w in COMPARE)
    return f"""    <section class="section t1p" id="compare" aria-labelledby="t1-compare">
      <div class="wrap t1p-wrap">
        <p class="eyebrow mono">// HOW ITS MAIL COMPARES</p>
        <h2 id="t1-compare">How it compares with Outlook, Thunderbird and the others</h2>
        <p class="t1p-lede">For email, side by side. Prices as each maker shows them in the UK. They change, so check before you buy.</p>
        <p class="t1p-swipe" aria-hidden="true">Swipe the table sideways to see every column &rarr;</p>
        <div class="t1p-tbl">
          <table>
            <thead><tr><th scope="col">Program</th><th scope="col">What it costs</th><th scope="col">Limits and catches</th><th scope="col">A person to talk to</th><th scope="col">Runs on</th></tr></thead>
            <tbody>{rows}</tbody>
          </table>
        </div>
        <p class="t1p-src">Prices and limits checked on each maker&rsquo;s own website on {CHECKED}. Mailbird&rsquo;s prices were shown as discounts and may change. OE Classic is priced in US dollars.</p>
        <div class="t1p-two" style="margin-top:1.6rem">
          <div class="t1p-card"><h3>When something else suits you better</h3><ul class="t1p-list">
            <li><strong>You need a Mac, Android phone or Linux version:</strong> Thunderbird (Mac, Linux and Android), or eM Client or Mailbird (Mac).</li>
            <li><strong>You rely on Outlook&rsquo;s add-ins, shared mailboxes or Exchange features</strong> at work: classic Outlook. (Techies One brings in a .pst file&rsquo;s emails, contacts and calendar, but it isn&rsquo;t Outlook.)</li>
            <li><strong>Your mailbox only works with the old POP setting,</strong> or you want all your email readable with no internet connection: Thunderbird or Outlook.</li>
            <li><strong>You want to edit photos or have faces recognised:</strong> Albums only turns photos and never looks for faces. Windows&rsquo; own Photos app can crop and adjust them.</li>
          </ul></div>
          <div class="t1p-card"><h3>When Techies One is the better fit</h3><ul class="t1p-list">
            <li>You want something simple that warns you about scams and blocks a sender in one press, free.</li>
            <li>Your email is BT, Sky, Plusnet, Gmail, Yahoo, AOL or Outlook.com, and you just want it working on your PC.</li>
            <li>Your old emails are in Windows Live Mail, Outlook Express or an Outlook .pst file, and you want them on screen again.</li>
            <li>You miss Picasa: Albums brings across its stars, captions and albums.</li>
            <li>You&rsquo;d like your email, letters, sums and photos in one window with the same big buttons.</li>
            <li>You&rsquo;d like a real person in Dorset to ring when you&rsquo;re stuck (checking the problem is free; we agree a price before any work).</li>
          </ul></div>
        </div>
      </div>
    </section>"""


MICROSOFT365 = f"""    <section class="section section--alt t1p" aria-labelledby="t1-m365">
      <div class="wrap t1p-wrap">
        <p class="eyebrow mono">// THE COST QUESTION</p>
        <h2 id="t1-m365">Do I need to pay for Microsoft 365 just for email?</h2>
        <p class="t1p-lede">No. You never needed Microsoft 365 to read BT, Sky, Gmail or Outlook.com email on a PC. Here is what each option gets you (Microsoft&rsquo;s UK prices on {CHECKED}):</p>
        <ul class="t1p-list">
          <li><strong>The new Outlook, free:</strong> works with most addresses, but shows adverts in your inbox.</li>
          <li><strong>Microsoft 365 Basic, &pound;1.99 a month or &pound;19.99 a year:</strong> takes the adverts away and gives a 100 GB Outlook.com mailbox. No desktop Word or Excel.</li>
          <li><strong>Microsoft 365 Personal, &pound;84.99 a year:</strong> adds classic Outlook, Word, Excel and PowerPoint on your computer and 1 TB of OneDrive storage. Family is &pound;104.99 a year for up to six people.</li>
          <li><strong>Techies One, free:</strong> no adverts, for email, a calendar, an address book and your photos, with simple letters and sums saved as Word and Excel files.</li>
        </ul>
        <p style="margin-top:1rem;max-width:52rem;line-height:1.6">So if you only pay for Microsoft 365 to get email on your PC without adverts, Techies One does that for nothing. One check first if your address is Outlook.com or Hotmail: the free mailbox holds 15 GB, and Microsoft 365 raises it to 100 GB. If yours is bigger than 15 GB, stopping Microsoft 365 would stop your email, so ask us before you change anything.</p>
        <p style="margin-top:1rem;max-width:52rem;line-height:1.6">Keep Microsoft 365 if you use Word or Excel for more than everyday letters and budgets, or OneDrive to back up your photos: it is good value for those. If you&rsquo;re on our <a href="/home-it-support-plans/">home support plan</a> (&pound;18.25 a month per computer), we can add Microsoft 365 for &pound;4.85 a month per user and set it up for you. See <a href="/which-microsoft-365-plan/">which Microsoft 365 plan</a> or <a href="/contact/">ask us</a>.</p>
      </div>
    </section>"""

SAFETY = """    <section class="section t1p" aria-labelledby="t1-safe">
      <div class="wrap t1p-wrap">
        <p class="eyebrow mono">// SAFE TO USE</p>
        <h2 id="t1-safe">Is it safe to put my email password into it?</h2>
        <div class="t1p-two">
          <div class="t1p-card"><h3>Your email, files and passwords</h3><ul class="t1p-list">
            <li>Your email goes straight between your PC and your email provider. It never passes through 365 Techies.</li>
            <li>Passwords are locked with Windows&rsquo; own protection, so they only open for you, on that PC.</li>
            <li>For Outlook.com, Hotmail and OneDrive you sign in on Microsoft&rsquo;s own page; Techies One never sees that password.</li>
            <li>Only secure, encrypted connections to your provider are allowed.</li>
            <li>Files never deletes anything for good without asking: it goes to the Recycle Bin (a USB stick has none, so it asks first). Programs and scripts are never started from Files.</li>
            <li>A shared link points to the copy in your own OneDrive. 365 Techies never holds your files.</li>
            <li>Albums never changes, moves or uploads your photo files, never looks for faces, and sends nothing about your photos to us.</li>
            <li>Old emails you bring in are copied: the files they came from are never changed. Backups never contain your passwords.</li>
          </ul></div>
          <div class="t1p-card"><h3>What it tells us, and updates</h3><ul class="t1p-list">
            <li>To hear about updates it checks in with us when it starts and every few hours. It sends only a random install number, its version, your Windows version and which kinds of provider you use (for example BT or Gmail). Never your addresses, emails, contacts, files or passwords. Details are in our <a href="/privacy-policy/">privacy policy</a>.</li>
            <li>The website sees your internet address when it checks in; we keep only the country, and delete an install we haven&rsquo;t heard from for a year.</li>
            <li>Nothing else goes to us unless you press Ask 365 Techies and send the form, which sends the name, phone number and message you type.</li>
            <li>When you add an address it doesn&rsquo;t already know, it looks up the settings using only the part after the @ (for example example.co.uk).</li>
            <li>When you press Dictate, Microsoft turns your speech into words over the internet. If you switch on the optional AI writing helper, the email you ask about goes to Anthropic.</li>
            <li>The installer and every update are digitally signed by 365 Techies Ltd. Before an update installs, Techies One checks it is genuinely ours, and throws it away if not.</li>
            <li>It tells you when there&rsquo;s an update and installs it when you press Update now.</li>
          </ul></div>
        </div>
      </div>
    </section>"""

LIMITS = f"""    <section class="section section--alt t1p" aria-labelledby="t1-limits">
      <div class="wrap t1p-wrap">
        <p class="eyebrow mono">// HONEST LIMITS</p>
        <h2 id="t1-limits">What it can&rsquo;t do (yet)</h2>
        <ul class="t1p-list">
          <li><strong>Windows PCs only.</strong> There&rsquo;s no Mac, iPhone, iPad or Android version. Your phone keeps using its own email app, and both stay in step because your email is kept at your provider.</li>
          <li><strong>It checks new email only while Techies One is running.</strong> It looks in every inbox about every 2 minutes, even with its window minimised or closed, to move scams, run your rules and pop up new-email and calendar notes. Close it completely, or switch the PC off, and that stops: your provider&rsquo;s own spam filter keeps working, and Techies One catches up when you next open it. It can start when Windows starts, if you tick that when you install it.</li>
          <li><strong>Send later needs your PC on.</strong> Emails set to send later wait on your PC and go at that time if it&rsquo;s on and Techies One is running (it keeps running when you close its window); otherwise they go when you next open it.</li>
          <li><strong>Search looks through one folder at a time</strong> (or, from All inboxes, every inbox at once), including old email, and shows the newest 40 matches. It can&rsquo;t yet search Sent, Archive and your other folders all together.</li>
          <li><strong>No Flag button yet.</strong> A rule can flag emails as they arrive, but you can&rsquo;t flag one by hand.</li>
          <li><strong>Outlook&rsquo;s .pst files are brought in, not opened in place.</strong> Bring in old emails copies their emails, contacts and calendar into a mailbox on this PC. It doesn&rsquo;t run Outlook add-ins or repair Outlook: it replaces it for everyday email. Outlook Express files are still experimental: if one won&rsquo;t come in, ask us.</li>
          <li><strong>No POP.</strong> It reads email kept on your provider&rsquo;s server (IMAP), so new email needs an internet connection. Emails in a mailbox on this PC can be read without one.</li>
          <li><strong>Gmail, Yahoo, AOL and Virgin Media need an app password,</strong> and work addresses on Microsoft 365 usually need an administrator to approve the app and switch on sending (SMTP AUTH) for the mailbox.</li>
          <li><strong>Google Calendar shows read-only</strong> for now (from its private link). Outlook.com calendars sync both ways.</li>
          <li><strong>Letters is for everyday letters, not everything Word does.</strong> Headers and footers, page numbers, text boxes, comments and tracked changes aren&rsquo;t there: a Word file that has them opens as a copy, says which parts it left out, and your original is never touched.</li>
          <li><strong>Sums has no charts,</strong> and an Excel file with charts, pictures, macros or pivot tables opens as a copy with those parts named and left out. It knows about 90 of Excel&rsquo;s formulas, the everyday ones.</li>
          <li><strong>Dictate needs the internet.</strong> Where it isn&rsquo;t available, Windows&rsquo; own voice typing (the Windows key and H) still works.</li>
          <li><strong>WhatsApp opens ready to send: you press Send.</strong> Techies One never sends anything in WhatsApp for you.</li>
          <li><strong>Signing in to a cloud inside Techies One is OneDrive only for now</strong>{"" if DROPBOX_ON else " (Dropbox is coming)"}; Google Drive&rsquo;s and Dropbox&rsquo;s own apps&rsquo; folders on the PC already show in Files. Share a link uses your own OneDrive&rsquo;s space.</li>
          <li><strong>iCloud needs Apple&rsquo;s iCloud for Windows app</strong> on the PC (Apple offers no other way in). Moving photos out of iCloud takes them off your iPhone and iPad too, and iCloud keeps them in Recently Deleted for 30 days.</li>
          <li><strong>Space makes room once the Recycle Bin is emptied.</strong> Removed copies go to the Recycle Bin, so they still take up room until you empty it; Space says so.</li>
          <li><strong>Albums shows photos that are on this PC</strong> (and, once you sign in and say yes, the ones in your OneDrive). Photos kept only in Google Photos, Amazon Photos or Facebook can&rsquo;t be shown; Albums explains how to bring them onto the PC.</li>
          <li><strong>Albums doesn&rsquo;t edit photos or recognise faces.</strong> It can turn a photo; you type who&rsquo;s in it. Picasa&rsquo;s face names and places aren&rsquo;t brought across, on purpose.</li>
          <li><strong>Photos from iPhones and some other phones (HEIC) need Microsoft&rsquo;s add-on</strong> from the Microsoft Store before Windows can show them (79p in October 2026). Albums tells you if it&rsquo;s missing.</li>
        </ul>
      </div>
    </section>"""


def growing():
    return f"""    <section class="section t1p" id="whats-new" aria-labelledby="t1-new">
      <div class="wrap t1p-wrap">
        <div class="t1p-two">
          <div>
            <p class="eyebrow mono">// IT KEEPS GETTING BETTER</p>
            <h2 id="t1-new">Built by us, improved on request</h2>
            <p style="line-height:1.6">Techies One is made and looked after by 365 Techies in Dorset, and it grows with what people ask for: Albums, Letters, Sums, Files and Space, email folders, envelopes and bringing in old emails all began as requests. Want it to do something it doesn&rsquo;t? Press <strong>Ask 365 Techies</strong> in the app, ring 01202 775566 or <a href="/contact/">send us a message</a>, and tell us. Updates arrive in the program itself: it tells you when there&rsquo;s a new version.</p>
          </div>
          <div class="t1p-card">
            <h3>What&rsquo;s new</h3>
            <p style="margin:0 0 .4rem"><strong>Version {REL['ver']}.</strong> {REL['notes'].replace("'", "&rsquo;")}</p>
            <p style="margin:0;color:var(--muted);font-size:.95rem">Next on our list (no dates yet): searching every email folder at once{"" if DROPBOX_ON else ", and signing in to Dropbox inside Techies One"}.</p>
          </div>
        </div>
      </div>
    </section>"""


WHO = """    <section class="section section--alt t1p" aria-labelledby="t1-who">
      <div class="wrap t1p-wrap">
        <p class="eyebrow mono">// WHO MAKES IT</p>
        <h2 id="t1-who">Who makes Techies One?</h2>
        <p style="max-width:52rem;line-height:1.6">365 Techies Ltd, a family-run IT support firm looking after homes and small businesses in Bournemouth, Christchurch and Poole since 1995. We spend our days helping people with their email, letters, photos and full-up PCs, which is why we built a program that avoids the problems we&rsquo;re asked about most. We also make <a href="/free-pc-health-check/">365 PC Manager</a>, a free health check for Windows PCs. Ring 01202 775566, Monday to Friday, 9am to 5pm, or read <a href="/about/">more about us</a>.</p>
      </div>
    </section>"""

FAQS = [
    ("Is Techies One really free?",
     "Yes. The program costs nothing, Mail, Albums, Letters, Sums and Files included: no charge, no trial, no adverts and no account to make with us, and you can add as many email addresses as you like. Two optional things can cost money. The AI writing helper is charged by Anthropic for each use, if you switch it on with your own key. And if you&rsquo;d like us to set it up or sort out a problem, that&rsquo;s a paid job (remote jobs from &pound;20), and we agree the price with you before we start."),
    ("Is Techies One the same as Techies One Mail?",
     "Yes. Techies One Mail grew Letters, Sums, Files and Albums, so the whole program is now called Techies One, and Mail is one part of it. An update keeps your email, your saved passwords and your settings."),
    ("Do I need Word or Excel?",
     "No. Letters saves ordinary Word files and Sums saves ordinary Excel files, so they also open in Word and Excel on any computer, and Word and Excel files people send you open in Techies One. Letters and Sums are for everyday letters, CVs, budgets and accounts: if you need headers and footers, charts or macros, keep Word and Excel for those."),
    ("Is there a replacement for Picasa?",
     "Yes: Albums, in Techies One, free for Windows 10 and 11. Google stopped making Picasa in 2016. Albums shows all your photos in the order they were taken, with slideshows, albums, captions and memories, and it brings across what you did in Picasa: stars become favourites, captions come with the photos and Picasa 3.9 albums become My albums. It doesn&rsquo;t edit photos or recognise faces: you type who&rsquo;s in a photo, and the names stay on your PC."),
    ("Can I open my old Outlook .pst file or Windows Live Mail emails?",
     "Yes, by bringing them in. In Mail, select <strong>Bring in old emails</strong>: Techies One copies the emails, contacts and calendar from an Outlook .pst or .ost file, Windows Live Mail, Windows Mail or Thunderbird (and, still experimentally, Outlook Express) into a mailbox under <strong>On this PC</strong>. The files they came from aren&rsquo;t changed. If it can&rsquo;t read one, ask us."),
    ("Can I make my own email folders?",
     "Yes. Select <strong>New folder</strong> under your email address, and use <strong>Move to</strong> to put emails into it. The folders are made at your email provider, so your phone sees them too."),
    ("Can it print envelopes and address labels?",
     "Yes. Add postal addresses in Contacts, tick the people, and press <strong>Envelopes</strong> or <strong>Labels</strong>: it prints C6, DL, C5 or other envelopes, or the usual A4 sheets of address labels, and keeps a Christmas card list year by year."),
    ("Does Dictate need the internet?",
     "Yes. Microsoft turns your speech into words over the internet, as Windows&rsquo; own voice typing does, and only while you have Dictate switched on. Windows may ask once whether Techies One can use the microphone. If Dictate isn&rsquo;t available, the Windows key and H starts Windows&rsquo; own voice typing."),
    ("Can it get my photos out of iCloud?",
     "Yes, if Apple&rsquo;s iCloud for Windows app is on the PC: your iCloud Drive and iCloud Photos then show in Files. <strong>Move out of iCloud</strong> moves photos and videos to the PC or a USB stick and says how much iCloud space that frees. It takes them off iCloud on your iPhone and iPad too, and iCloud keeps them in Recently Deleted for 30 days. Copying instead of moving leaves iCloud as it was."),
    ("Does it work with Dropbox?",
     ("Yes. If the Dropbox app is on your PC, its folder shows in Files, and you can also sign in to Dropbox right inside Techies One to browse, copy, move and share a link." if DROPBOX_ON else
      "If the Dropbox app is on your PC, its folder shows in Files like any other, so you can see, copy and move your Dropbox files. Signing in to Dropbox inside Techies One, without the Dropbox app, is coming; OneDrive works that way now.")),
    ("What replaced Windows Mail in Windows 11?",
     "Microsoft ended support for its Mail and Calendar app on 31 December 2024 and now offers the new Outlook, which is free but shows adverts unless you pay for Microsoft 365. Techies One is a free alternative without adverts."),
    ("Can I still use Outlook Express on Windows 11?",
     "No. Outlook Express came with Windows XP and ended in 2014, and Microsoft doesn&rsquo;t offer it any more. Websites offering it for Windows 11 are not Microsoft and the copies get no security fixes. Techies One is a modern, free replacement."),
    ("Can I still use Windows Live Mail with Windows 11?",
     "Not safely. Support ended in January 2017, so it gets no security fixes; it no longer works with Hotmail or Outlook.com; and it can&rsquo;t use the modern sign-in Outlook.com and Hotmail now need. Microsoft no longer offers it, so download sites offering it are not Microsoft."),
    ("Is there a free alternative to Outlook?",
     "Yes: Techies One, Thunderbird and the free versions of eM Client and Mailbird all work on Windows. Techies One explains each scam warning in plain English, blocks a sender in one press for free, and comes from a UK firm you can ring. The comparison table above shows the limits of each."),
    ("Can I use email on my PC without paying for Microsoft 365?",
     "Yes. You don&rsquo;t need Microsoft 365 to use BT, Sky, Gmail or Outlook.com email on a PC. Techies One is free and has no adverts. Keep Microsoft 365 if you use Word, Excel or OneDrive backup."),
    ("Does it work with BT, Sky, Virgin Media and Plusnet email?",
     "Yes, with two exceptions: BT Basic email, which BT only allows on bt.com, and Virgin Media mailboxes that Virgin won&rsquo;t give an app password for (often a second mailbox). BT and Sky use your normal password, Plusnet your mailbox password, and Virgin Media an app password from the My Virgin Media app."),
    ("What is the easiest email program for older people?",
     "Look for big, clear buttons, large text and warnings about scams. Techies One has a Simple view with bigger buttons, three text sizes, read-aloud, Help on every screen and an Ask 365 Techies button that asks a real person at 365 Techies to ring you back (any paid help is priced before we start)."),
    ("How do I block someone sending me emails?",
     "Open one of their emails and press Block sender. From then on, while Techies One is running (even with its window minimised or closed), anything new they send is moved to your Scams folder, and your phone sees it there too. It doesn&rsquo;t stop their emails reaching your provider, so a new one can show on your phone until Techies One next checks. You can unblock them from the address book at any time."),
    ("Can I see all my email addresses in one inbox?",
     "Yes. Once you&rsquo;ve added a second address, <strong>All inboxes</strong> appears at the top of the folder list: the email from every address in one list, newest first, each marked with the address it came to. When you reply, it&rsquo;s sent from the address the email went to. It&rsquo;s free, with no limit on how many addresses you add."),
    ("How do I free up space on my PC safely?",
     "In Techies One, open Files and then Space. It shows how full each drive is and what&rsquo;s using the room, and finds duplicate photos and videos and the biggest files. Removed copies go to the Recycle Bin, so you can get them back, and it never removes the last copy of anything. The room comes back when you empty the Recycle Bin."),
    ("Will I lose my old emails if I switch?",
     "Usually not. If your old program used the normal setting (IMAP), your emails are kept with your email provider, so they appear in Techies One, folders and all, as soon as you add your address. Outlook Express and Windows Live Mail were often set to the older POP setting instead, which kept email only on the old PC. Then Bring in old emails can copy them from the old program&rsquo;s files into a mailbox on this PC (Outlook Express files are still experimental). Keep the old program or PC until they&rsquo;re in, and ask us if you&rsquo;re not sure."),
    ("Is it safe to put my email password into it?",
     "Yes. Passwords are locked with Windows&rsquo; own protection on your PC and never sent to us, and your email goes straight between your PC and your provider. The program is digitally signed by 365 Techies Ltd."),
    ("Does it work on a Mac, iPad or phone?",
     "No, it is for Windows 10 and 11 (64-bit) PCs only. Your phone or tablet keeps using its own email app, and everything stays in step because your email is kept at your provider."),
]

TRADEMARK = """    <section class="section t1p" aria-label="Trademarks">
      <div class="wrap"><p class="t1p-tm">Microsoft, Microsoft 365, Microsoft Edge, Outlook, Outlook Express, Hotmail, OneDrive, Word, Excel, PowerPoint, Windows and Windows Live are trademarks of the Microsoft group of companies. iCloud, iPhone, iPad and Mac are trademarks of Apple Inc. Google Drive, Google Photos, Picasa and Gmail are trademarks of Google LLC. Amazon Photos is a trademark of Amazon.com, Inc. or its affiliates. Facebook is a trademark of Meta Platforms, Inc. Dropbox is a trademark of Dropbox, Inc. WhatsApp is a trademark of WhatsApp LLC. Thunderbird is a trademark of the Mozilla Foundation. Other names belong to their owners. Techies One is made by 365 Techies Ltd and is not made, endorsed or supported by Microsoft or any other company named here.</p></div>
    </section>"""

TITLE = "Techies One | Free Windows Mail Replacement, Photos &amp; More"   # also snippets_data.py's "techies-one-mail"
DESC = ("Techies One, free for Windows 10 and 11: email that replaces Windows Mail and Outlook Express, with scam warnings, "
        "plus photo albums, letters and sums.")


def build():
    content = "\n".join([
        hero(), PROOF, download(), overview(), mail(), albums(), suite(), help_section(), HISTORY, providers(), compare(),
        MICROSOFT365, SAFETY, LIMITS,
        growing(), WHO, bp.faq_html(FAQS),
        bp.cta("Rather we set it up for you?", "We can install Techies One, add your email addresses and show you round, over the phone or on a visit. It&rsquo;s a paid job, from &pound;20 remotely, and we agree the price before we start.",
               primary=("Call 01202 775566", "tel:+441202775566"), secondary=("Send us a message", "/contact/")),
        TRADEMARK, CLIP_DIALOG,
    ])

    def schema(s, _d=DESC):
        feats = MAIL_FEATS + ALBUM_FEATS + SUITE_FEATS + HELP_FEATS
        app = {
            "@type": "SoftwareApplication", "@id": f"{bp.SITE}/{s}/#app", "name": NAME, "alternateName": OLD_NAME,
            "operatingSystem": "Windows 10 (64-bit), Windows 11", "applicationCategory": "CommunicationApplication",
            "description": ("A free program for Windows 10 and 11 PCs, made by 365 Techies: email, a calendar and an address book "
                            "that replace Windows Mail, Outlook Express and Windows Live Mail, with the settings for BT, Sky, Plusnet, "
                            "Gmail, Yahoo, AOL and Outlook.com built in, plain-English scam warnings, its own folders, new-email "
                            "notifications, envelopes and labels from the address book, old emails brought in from Outlook (.pst), "
                            "Windows Live Mail and Thunderbird, backups, and a big-button view; Albums, all the photos on the PC in "
                            "date order with slideshows, short films, memories and Picasa's stars, captions and albums brought "
                            "across; Letters, for letters and CVs saved as Word files; Sums, a spreadsheet saved as Excel files; and "
                            "Files, for the PC, USB sticks and cloud folders, with Space to find duplicates and big files, Share a "
                            "link and Dictate. Help on every screen."),
            "offers": {"@type": "Offer", "price": "0", "priceCurrency": "GBP", "availability": "https://schema.org/InStock"},
            "isAccessibleForFree": True, "inLanguage": "en-GB",
            "downloadUrl": REL["url"], "softwareVersion": REL["ver"], "fileSize": MB.replace(" ", ""),
            "featureList": ["Email with plain-English scam warnings and a Scams folder", "All inboxes: every address in one list",
                            "One-press block sender", "Clean up: unsubscribe and remove old email in bulk",
                            "Address book that fills itself in, with groups", "Calendar with two-way Outlook.com sync and UK bank holidays",
                            "Simple view with big buttons and large text",
                            "Your own email folders, and new-email notifications by the clock",
                            "Contacts with postal addresses: envelopes, address labels and a Christmas card list",
                            "Bring in old emails from Outlook .pst files, Windows Live Mail, Windows Mail and Thunderbird",
                            "Backups of email, contacts and calendar to a USB stick or OneDrive",
                            "Albums: every photo on the PC, USB sticks and cloud folders in date order, with slideshows and short films",
                            "Looking back: On this day, trips, Christmas and birthdays through the years (only if you say yes)",
                            "Picasa's stars, captions and albums brought across; names and captions you type (no face recognition)",
                            "Keep safe: a second copy of every photo on a USB drive",
                            "Help on every screen, with a How do I...? search",
                            "Letters: ready-made letters and CVs on an A4 page, saved as Word files, PDF and email in one click",
                            "Sums: budgets and accounts that add themselves up, saved as Excel files",
                            "Files: the PC, USB sticks and OneDrive, Dropbox, Google Drive and iCloud folders in one window",
                            "Space: how full each drive is, duplicates and the biggest files, removed safely to the Recycle Bin",
                            "Share a link: send a big file from your own OneDrive by WhatsApp, email or a QR code",
                            "Dictate: talk instead of typing (needs the internet)"],
            "screenshot": [f"{bp.SITE}/images/t1-{name}-{tag}-1440.webp" for _i, name, tag, *_ in feats],
            "publisher": {"@id": bp.SITE + "/#business"}, "provider": {"@id": bp.SITE + "/#business"},
            "datePublished": "2026-10-10", "url": f"{bp.SITE}/{s}/",
        }
        suite_video = {"@type": "VideoObject", "@id": f"{bp.SITE}/{s}/#video", "name": "Techies One: email, letters, sums and files in one simple program",
                       "description": ("The real Techies One program for Windows: Mail with all your addresses and scam emails moved "
                                       "aside, Letters filling in a complaint letter, Sums adding up a budget, Files showing photos and "
                                       "sharing a video by link, and Space making room. From 365 Techies in Dorset; the people, emails "
                                       "and files shown are made up."),
                       "thumbnailUrl": [bp.SITE + SUITE_POSTER], "uploadDate": SUITE_UPLOADED,
                       "duration": "PT%dM%dS" % (SUITE_SECS // 60, SUITE_SECS % 60), "contentUrl": bp.SITE + SUITE_FILM,
                       "embedUrl": "https://www.youtube.com/embed/" + yt_watch.T1_FILM[0], "inLanguage": "en-GB",
                       "publisher": {"@id": bp.SITE + "/#business"}}
        mail_video = {"@type": "VideoObject", "@id": f"{bp.SITE}/{s}/#mail-video", "name": "Techies One Mail in %d seconds" % FILM_SECS,
                      "description": ("The email problems Techies One Mail fixes: an old email program that stopped, BT or Sky email "
                                      "that won't go in, fiddly buttons, scam emails, an inbox full of old email and more than one "
                                      "address. From 365 Techies in Bournemouth; the real program with a made-up demo mailbox."),
                      "thumbnailUrl": [bp.SITE + FILM_POSTER], "uploadDate": FILM_UPLOADED,
                      "duration": "PT%dM%dS" % (FILM_SECS // 60, FILM_SECS % 60), "contentUrl": bp.SITE + FILM,
                      "embedUrl": f"{bp.SITE}/{s}/#mail", "inLanguage": "en-GB", "publisher": {"@id": bp.SITE + "/#business"}}
        shorts = [{"@type": "VideoObject", "@id": f"{bp.SITE}/{s}/#short-{f[:f.rindex('-v')]}",
                   "name": f"Techies One: {title}", "description": f"{title}, in Techies One for Windows 10 and 11: the real program, "
                   "with a spoken guide and captions. From 365 Techies in Dorset; the people, photos and emails shown are made up.",
                   "thumbnailUrl": [f"{bp.SITE}/images/t1-short-{f}-poster.webp"], "uploadDate": SHORTS_UPLOADED,
                   "duration": "PT%dS" % secs, "contentUrl": f"{bp.SITE}/images/t1-short-{f}.mp4",
                   "embedUrl": f"{bp.SITE}/{s}/#short-{f[:f.rindex('-v')]}", "transcript": says + SHORT_END,
                   "inLanguage": "en-GB", "publisher": {"@id": bp.SITE + "/#business"}}
                  for f, secs, title, says in SHORTS.values()]
        app["subjectOf"] = ([{"@id": f"{bp.SITE}/{s}/#video"}, {"@id": f"{bp.SITE}/{s}/#mail-video"}]
                            + [{"@id": v["@id"]} for v in shorts])
        return bp.graph([bp.crumb_sub(s, "Email Support", "email-support", NAME),
                         bp.webpage(s, NAME, _d, image=bp.SITE + OG), app, suite_video, mail_video, *shorts,
                         bp.howto_node(s, "How to install Techies One", STEPS),
                         bp.faqpage(s, FAQS)])

    bp.add(slug=SLUG, title=TITLE, desc=DESC,
           og_title="Techies One: free email, photos, letters and sums for Windows", schema=schema, content=content,
           og_image=bp.SITE + OG)


build()
