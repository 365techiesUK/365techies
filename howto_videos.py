"""The 365 Techies YouTube how-tos (made 14 Oct 2026, Lily's voice, captions on YouTube) on the existing pages each one
answers (owner, 15 Oct 2026: put the how-to videos on the website - "start with one and two").

Why YouTube and not a copy on our own server: a play on the page counts as a view on the channel, and the channel is
where these films need the numbers (day one: 2-5 views each). Click-to-play on youtube-nocookie: nothing loads and no
cookie is set until the visitor presses play. Each block carries what the film says (its captions, word for word), the
free tools it mentions, and a VideoObject.

  /link-safety-checker/            scam film, straight after the checker (the film shows this checker in use)
  /phishing/                       scam film, after "Stay one step ahead" and its Malwarebytes line (the page had no UK
                                   reporting route at all)
  /how-to-free-up-storage-space/   clean-up film, inside the article before the first step (the film IS the how-to)
The PC specs film (YouTube T3t0g2Z9DVI, 1:47) waits for /computer-spec-checker/ (~25 Oct, after that page's baseline):
add it to VIDEOS and PLACES then. A new poster = a NEW file name (images are cached for a year).
"""
import json

import build_pages as bp
from techies_one_boxes import _section_end

VIDEOS = {
    "scam": dict(
        id="rPqYvX-HMI4", secs=97, uploaded="2026-10-14", poster="/images/howto-scam-email-poster-v1.jpg",
        name="Is This Email a Scam? How to Check It and Report It (UK)",
        desc=("A 97-second guide from 365 Techies: the warning signs of a scam email, checking a link without opening it, and "
              "where to report scam emails and texts in the UK (report@phishing.gov.uk and 7726)."),
        cap="1 min 37 s &middot; a spoken guide with captions &middot; the emails are made up",
        says=("Got an email that doesn&rsquo;t feel right? Here&rsquo;s how to check it in under a minute, and where to report "
              "it in the UK. It&rsquo;s free, and it helps stop the scammers. Step one: look for the warning signs. Scam emails "
              "pretend to be a company you know, like Royal Mail or your bank. They rush you, and ask you to click a link or pay "
              "a small fee. Here, the sender&rsquo;s address isn&rsquo;t really Royal Mail&rsquo;s, and it wants &pound;1.45 "
              "within 24 hours. That&rsquo;s a scam. While it&rsquo;s open, our free Techies One Mail app checks new emails for "
              "these signs, and moves likely scams to a Scams folder, with the reasons why. Step two: check a link before you "
              "click it. Copy the link, and paste it into our free Link Safety Checker. It only reads the address, and never "
              "opens the page. This one uses a number instead of a proper name, and it isn&rsquo;t secure. So don&rsquo;t click "
              "it. Step three: report it. Forward the email to report@phishing.gov.uk. That&rsquo;s the National Cyber Security "
              "Centre&rsquo;s free service. Then delete it. Got a scam text? Forward it to 7726. If you&rsquo;ve already "
              "clicked, paid, or shared your details, call your bank straight away on the number on the back of your card, and "
              "report it to Report Fraud. And you can practise spotting scams with our free quiz."),
        tools=[("link-safety-checker", "Link Safety Checker"), ("spot-the-scam", "Spot the Scam quiz"),
               ("techies-one-mail", "Techies One Mail for Windows")]),
    "free-up-space": dict(
        id="WgRs97MKctg", secs=90, uploaded="2026-10-14", poster="/images/howto-free-up-space-poster-v1.jpg",
        name="How to Free Up Space on Windows 11 (No Cleaner Apps Needed)",
        desc=("A 90-second guide from 365 Techies to Windows 11's own free clean-up tools: temporary files, cleanup "
              "recommendations, Storage Sense and Disk Clean-up. No downloads and no cleaner apps."),
        cap="1 min 30 s &middot; a spoken guide with captions &middot; filmed on a clean copy of Windows 11 with made-up files",
        says=("Running out of space on your PC? Windows has free clean-up tools built in. No downloads, and no cleaner apps. "
              "Here&rsquo;s how to use them safely. Way one: temporary files. Open Settings, choose System, then Storage. "
              "Windows works out what&rsquo;s using your space. Here, it&rsquo;s found over four gigabytes it could clean up. "
              "Click Temporary files, and tick what you don&rsquo;t need. Careful with Downloads: those are your own files, so "
              "check them first. Then click Remove files, and Continue. Way two: cleanup recommendations. It lists large or "
              "unused files, and apps you might not need, so you decide what goes. Way three: Storage Sense. With it on, "
              "Windows clears out temporary files and old recycle bin files by itself, on a schedule you choose. For a deeper "
              "clean, search for Disk Clean-up. It shows how much it can free up. Tick what you want to remove, and click OK. "
              "We&rsquo;d already cleaned this PC, so there&rsquo;s very little left. Still running low? Something may be "
              "filling your drive. Our free 365 PC Manager app for Windows shows every drive&rsquo;s free space and health, "
              "and finds your biggest files. It&rsquo;s free, and it only takes a few minutes."),
        tools=[("free-pc-health-check", "365 PC Manager (free, for Windows)")]),
}

# page -> (film, where it goes, heading or None, intro). "after:<marker>" = straight after the section containing the
# marker; "before:<marker>" = just before the marker. With a heading it is a section of its own; with None it is a figure
# inside the page's article (the article's own headings carry it).
PLACES = {
    "link-safety-checker": ("scam", 'after:id="scamtool"', "Watch: check a scam email, then report it",
                            "This checker in use on a made-up scam email, then where to report scam emails and texts in the UK."),
    "phishing": ("scam", 'before:<section class="how" aria-label="If you have been hit"', "Watch: is this email a scam?",
                 "The warning signs, checking a link without opening it, and where to report it in the UK."),
    "how-to-free-up-storage-space": ("free-up-space", "before:<h2>See what is using the space</h2>", None,
                                     "Watch it done first: Windows 11&rsquo;s own clean-up tools, one at a time."),
}

STYLE = """    <style>
      .hvf{max-width:880px;margin:0 auto}
      .hvf-film{position:relative;aspect-ratio:16/9;border:1px solid rgba(125,170,220,.3);border-radius:14px;overflow:hidden;background:#060c1c;box-shadow:0 18px 50px rgba(0,0,0,.35)}
      .hvf-play{position:absolute;inset:0;display:block;width:100%;height:100%;border:0;padding:0;background:#060c1c;cursor:pointer}
      .hvf-play img{display:block;width:100%;height:100%;object-fit:cover;transition:filter .3s ease}
      .hvf-play:hover img,.hvf-play:focus-visible img{filter:brightness(1.08)}
      .hvf-play>span{position:absolute;right:4%;bottom:6%;display:flex;align-items:center;gap:.6rem;white-space:nowrap;background:rgba(6,12,28,.9);color:#fff;font-weight:700;font-size:1.05rem;padding:.8rem 1.4rem .8rem 1.05rem;border-radius:999px;border:1.5px solid rgba(255,255,255,.25);box-shadow:0 12px 32px rgba(0,0,0,.45);transition:transform .2s ease}
      .hvf-play:hover>span,.hvf-play:focus-visible>span{transform:scale(1.05)}
      .hvf-play svg{width:2rem;height:2rem;flex:none}
      .hvf-play .s{display:none}
      @media (max-width:520px){.hvf-play .l{display:none}.hvf-play .s{display:inline}.hvf-play>span{right:3%;bottom:4%;gap:.45rem;font-size:.85rem;padding:.4rem .8rem .4rem .45rem}.hvf-play svg{width:1.4rem;height:1.4rem}}
      .hvf-film iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
      .hvf .hvf-cap{margin:.5rem 0 0;font-size:.85rem;color:var(--muted);text-align:center}
      .hvf a{color:var(--cyan,#6cc4f5);text-decoration:underline;text-underline-offset:2px}
      .hvf .hvf-says{margin:.7rem 0 0;font-size:.92rem}
      .hvf-says summary{cursor:pointer;color:var(--muted)}
      .hvf .hvf-says p{margin:.5rem 0 0;font-size:.92rem;line-height:1.6}
      .hvf--in{margin:0 0 1.8rem}
      .hvf--in .hvf-intro{margin:0 0 .8rem;font-weight:600}
    </style>
"""

# One copy of the script per block; it finds its own block through document.currentScript.
SCRIPT = ('<script>(function(){var s=document.currentScript,w=s&&s.parentNode,f=w&&w.querySelector("[data-hvf]");if(!f)return;'
          'var b=f.querySelector(".hvf-play");b.addEventListener("click",function(){var i=document.createElement("iframe");'
          'i.setAttribute("allow","accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture");'
          'i.setAttribute("allowfullscreen","");i.setAttribute("title",f.getAttribute("data-title"));'
          'i.src="https://www.youtube-nocookie.com/embed/"+f.getAttribute("data-hvf")+"?autoplay=1&rel=0&playsinline=1&cc_load_policy=1&cc_lang_pref=en";'
          'f.innerHTML="";f.appendChild(i);i.focus();});})();</script>')


def _mins(secs):
    return "%d min %d s" % (secs // 60, secs % 60) if secs % 60 else "%d min" % (secs // 60)


def _node(slug, v):
    words = v["says"]
    for a, b in (("&rsquo;", "'"), ("&pound;", "£"), ("&amp;", "&")):
        words = words.replace(a, b)
    return {"@context": "https://schema.org", "@type": "VideoObject", "@id": "%s/%s/#howto-film" % (bp.SITE, slug),
            "name": v["name"], "description": v["desc"],
            "thumbnailUrl": [bp.SITE + v["poster"], "https://i.ytimg.com/vi/%s/maxresdefault.jpg" % v["id"]],
            "uploadDate": v["uploaded"], "duration": "PT%dM%dS" % (v["secs"] // 60, v["secs"] % 60),
            "embedUrl": "https://www.youtube.com/embed/" + v["id"], "transcript": words, "inLanguage": "en-GB",
            "publisher": {"@id": bp.SITE + "/#business"}}


def _inner(slug, v, intro, heading):
    m = _mins(v["secs"])
    tools = [(s, t) for s, t in v["tools"] if s != slug]
    more = ("        <p class=\"hvf-cap\">Free tools in the film: %s</p>\n"
            % " &middot; ".join('<a href="/%s/">%s</a>' % (s, t) for s, t in tools)) if tools else ""
    head = ('        <h2 id="howto-film-h" style="margin:0 0 .4rem">%s</h2>\n'
            '        <p style="margin:0 0 1rem;color:var(--muted)">%s</p>\n' % (heading, intro)) if heading else \
           '        <p class="hvf-intro">%s</p>\n' % intro
    return (head +
        '        <div class="hvf-film" data-hvf="%s" data-title="%s">\n' % (v["id"], v["name"]) +
        '          <button class="hvf-play" type="button" aria-label="Play the %s video: %s">' % (m, v["name"]) +
        '<img src="%s" width="1280" height="720" alt="" loading="lazy" decoding="async">' % v["poster"] +
        '<span><svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="23" fill="#00ce1b"/><path d="M19 15l15 9-15 9z" fill="#fff"/></svg>'
        '<b class="l">Watch the video (%s)</b><b class="s">Watch (%s)</b></span></button>\n' % (m, m) +
        '        </div>\n'
        '        <p class="hvf-cap">%s &middot; <a href="https://www.youtube.com/watch?v=%s" target="_blank" rel="noopener">Watch on YouTube</a></p>\n'
        % (v["cap"], v["id"]) + more +
        '        <details class="hvf-says"><summary>What the video says</summary><p>%s</p></details>\n' % v["says"] +
        '        ' + SCRIPT + '\n'
        '        <script type="application/ld+json">%s</script>\n' % json.dumps(_node(slug, v)))


def insert(slug, html):
    """The page filter: the film at its chosen place on the PLACES pages; every other page untouched."""
    if slug not in PLACES or 'id="howto-film"' in html:
        return html
    key, where, heading, intro = PLACES[slug]
    v = VIDEOS[key]
    mode, marker = where.split(":", 1)
    i = html.find(marker)
    if i < 0:
        raise SystemExit("howto_videos: no %r on /%s/" % (marker, slug))
    if heading is None:
        block = '<figure class="hvf hvf--in" id="howto-film">\n' + STYLE + _inner(slug, v, intro, None) + '        </figure>\n'
    else:
        block = ('    <section class="section" id="howto-film" aria-labelledby="howto-film-h">\n' + STYLE +
                 '      <div class="wrap hvf">\n' + _inner(slug, v, intro, heading) + '      </div>\n    </section>\n')
    if mode == "before":
        ls = html.rfind("\n", 0, i) + 1
        if not html[ls:i].strip():   # the marker starts its line: go in above the whole line, indent and all
            i = ls
        return html[:i] + block + html[i:]
    start = html.rfind("<section", 0, i + 1)
    end = _section_end(html, start)
    if end < 0:
        raise SystemExit("howto_videos: section not closed on /%s/" % slug)
    return html[:end] + "\n" + block + html[end:]


bp.PAGE_FILTERS.append(insert)
