"""The "Where does your email actually live?" explainer film (41 s, an animated diagram with Lily's voice and captions) on
the six pages where it IS the answer (owner, 11 Oct 2026: "put it on the six pages and push it").

Each page gets one section, placed BELOW its fix (job first): a click-to-play player (nothing loads until pressed), the
transcript, and a VideoObject. Where it goes is chosen per page: straight after the section that explains the cause.
Made in D:/claude/reels/email-lives-2026-10-11 (engine/build_explainer.py). A new cut = a NEW file name (images are
cached for a year).
"""
import json
import re

import build_pages as bp
from techies_one_boxes import _section_end

VIDEO = "/images/where-email-lives-v2.mp4"
POSTER = "/images/where-email-lives-poster-v2.jpg"
SECS = 42
UPLOADED = "2026-10-11"
NAME = "Where does your email actually live?"
SAYS = ("Where does your email actually live? Usually, not on your computer. It&rsquo;s kept by your email company, like BT, "
        "Sky or Gmail. Your computer and your phone each show you a copy of the same email. So if your old email program stops "
        "working, your email is still there. A new program shows it again. But some older programs, like Outlook Express, were "
        "often set up to move email onto one computer. Then it&rsquo;s only on that PC. Your phone can&rsquo;t see it, and if the "
        "PC fails, it can be lost. Not sure which you have? Ring us before you change anything.")

# page -> the opening tag of the section the film goes straight after (the cause, below the fix)
AFTER = {
    "emails-on-computer-but-not-phone": '<section id="s3"',            # POP on the computer is taking the mail first
    "new-outlook-only-showing-recent-emails": '<section id="s2"',      # Two minutes to prove your mail still exists
    "recreate-outlook-profile-without-losing-emails": '<section id="s2"',  # How to create a new profile the safe way
    "virgin-media-email-moving-to-junara": 'id="fixflow"',                              # What to do, one step at a time
    "move-virgin-media-email-to-gmail": '<section id="s3"',            # What you need before you start
    "techies-one-mail": 'aria-labelledby="t1-what-happened"',                           # What happened to Windows Mail...
}
INTRO = {
    "emails-on-computer-but-not-phone": "Why the computer can have your email when the phone doesn&rsquo;t, in 42 seconds.",
    "new-outlook-only-showing-recent-emails": "Why your older email is almost certainly still there, in 42 seconds.",
    "recreate-outlook-profile-without-losing-emails": "When a new profile is safe, and when your email might be only on this PC, in 42 seconds.",
    "virgin-media-email-moving-to-junara": "Why your Virgin Media email lives with the email company, not your PC, and the one older setting to check first.",
    "move-virgin-media-email-to-gmail": "Why email can be copied from one company to another, and why the older POP setting needs checking first.",
    "techies-one-mail": "Why your email is usually still there when the old program stops, and when it isn&rsquo;t.",
}
STYLE = """    <style>
      .elv{max-width:880px;margin:0 auto}
      .elv-film{position:relative;border:1px solid rgba(125,170,220,.3);border-radius:14px;overflow:hidden;background:#060c1c;box-shadow:0 18px 50px rgba(0,0,0,.35);aspect-ratio:16/9}
      .elv-film video{display:block;width:100%;height:100%;object-fit:cover;background:#060c1c}
      .elv-play{position:absolute;inset:0;display:flex;align-items:flex-end;justify-content:center;border:0;padding:0 0 6%;background:transparent;cursor:pointer}
      .elv-play span{display:flex;align-items:center;gap:.6rem;background:rgba(6,12,28,.88);color:#fff;font-weight:700;font-size:1.05rem;padding:.8rem 1.4rem .8rem 1.05rem;border-radius:999px;border:1.5px solid rgba(255,255,255,.25);box-shadow:0 12px 32px rgba(0,0,0,.45);transition:transform .2s ease}
      .elv-play:hover span,.elv-play:focus-visible span{transform:scale(1.05)}
      .elv-play svg{width:2rem;height:2rem;flex:none}
      .elv-film.on .elv-play{display:none}
      .elv-play .s{display:none}
      @media (max-width:520px){.elv-play .l{display:none}.elv-play .s{display:inline}.elv-play span{font-size:.95rem;padding:.6rem 1.1rem .6rem .8rem}.elv-play svg{width:1.7rem;height:1.7rem}}
      .elv-cap{margin:.5rem 0 0;font-size:.85rem;color:var(--muted);text-align:center}
      .elv-says{margin:.7rem 0 0;font-size:.92rem}
      .elv-says summary{cursor:pointer;color:var(--muted)}
      .elv-says p{margin:.5rem 0 0;line-height:1.6}
    </style>
"""


def block(slug):
    node = {"@context": "https://schema.org", "@type": "VideoObject", "@id": "%s/%s/#email-lives" % (bp.SITE, slug), "name": NAME,
            "description": ("A 42-second animated explainer from 365 Techies: your email is usually kept by your email company and "
                            "your computer and phone show a copy, so it survives a broken email program; the older POP setting "
                            "moved it onto one PC instead."),
            "thumbnailUrl": [bp.SITE + POSTER], "uploadDate": UPLOADED, "duration": "PT%dS" % SECS,
            "contentUrl": bp.SITE + VIDEO, "embedUrl": "%s/%s/#email-lives" % (bp.SITE, slug), "inLanguage": "en-GB",
            "publisher": {"@id": bp.SITE + "/#business"}}
    return f"""    <section class="section" id="email-lives" aria-labelledby="email-lives-h">
{STYLE}      <div class="wrap elv">
        <h2 id="email-lives-h" style="margin:0 0 .4rem">Where does your email actually live?</h2>
        <p style="margin:0 0 1rem;color:var(--muted)">{INTRO[slug]}</p>
        <div class="elv-film" data-elv>
          <video controls playsinline preload="none" poster="{POSTER}" width="1920" height="1080" aria-label="{NAME} A {SECS}-second animated explainer with a spoken guide and captions"><source src="{VIDEO}" type="video/mp4"></video>
          <button class="elv-play" type="button" aria-label="Play the {SECS}-second film: {NAME}"><span><svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="23" fill="#00ce1b"/><path d="M19 15l15 9-15 9z" fill="#fff"/></svg><b class="l">Watch: where your email lives ({SECS} s)</b><b class="s">Watch ({SECS} s)</b></span></button>
        </div>
        <p class="elv-cap">An animated diagram with a spoken guide and captions.</p>
        <details class="elv-says"><summary>What the film says</summary><p>{SAYS}</p></details>
      </div>
      <script>(function(){{var f=document.querySelector("[data-elv]");if(!f)return;var v=f.querySelector("video"),b=f.querySelector(".elv-play");v.controls=false;b.addEventListener("click",function(){{f.classList.add("on");v.controls=true;v.play();}});v.addEventListener("play",function(){{f.classList.add("on");}});}})();</script>
      <script type="application/ld+json">{json.dumps(node)}</script>
    </section>
"""


def insert(slug, html):
    """The page filter: the film straight after its chosen section on the six pages; every other page untouched."""
    if slug not in AFTER or 'id="email-lives"' in html:
        return html
    tag = AFTER[slug]
    i = html.find(tag)
    if i < 0:
        raise SystemExit("email_lives_video: no %r on /%s/" % (tag, slug))
    start = html.rfind("<section", 0, i + 1) if not tag.startswith("<section") else i
    end = _section_end(html, start)
    if end < 0:
        raise SystemExit("email_lives_video: section not closed on /%s/" % slug)
    return html[:end] + "\n" + block(slug) + html[end:]


bp.PAGE_FILTERS.append(insert)
