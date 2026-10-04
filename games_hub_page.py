"""
/games/ - the Games page: every free game on one page (4 Oct 2026).

WHY IT EXISTS
The games (Solitaire, FreeCell, Spider, 365 Invaders, 365 Bat & Ball, 365 Eclipse, and Seafront in the
Bournemouth section) each had their own address but nothing linked them together, and /games/ itself was a
403. The owner asked whether the games should live only in 365 PC Manager or on the website as well; the
advice taken ("yes build the games page") was: the website is where people find them, PC Manager is the
nicer way to play them. The players are the business's own customers (mostly home users, many retired), and
every game carries the 365 Techies name and phone number.

ONE LIST
The cards are built from games/games.json - the same file 365 PC Manager's Games menu reads (Games.cs). Add a
game there, rebuild, and the website and the app both show it. Pictures: games/img/<id>-v1.webp (800 x 600,
the game's own screen, made by the scratchpad games-thumbs.cjs of the 4 Oct session); a game without one shows
its icon instead. ⚠ Never overwrite a picture in place (images are cached for a year): give a new one -v2.

HIDDEN UNTIL THE OWNER SAYS SO
PUBLIC = False keeps the page noindex (which also keeps it out of sitemap.xml - build_blog skips noindex pages)
and out of the site's own search. Flip it to True when the owner is happy, and add the page to a menu or the
footer then (NAV_MENUS in build_pages.py - never menu HTML).

PC MANAGER LINE
The Games menu is in PC Manager v32, which is built and signed but not released yet (it goes when the owner
says). Until then the line says it is coming; set PCM_GAMES_MENU_LIVE = True in the release commit.
"""
import json
import os

import build_pages as bp
from build_extra import info_page

PUBLIC = False
PCM_GAMES_MENU_LIVE = False

_ROOT = os.path.dirname(os.path.abspath(__file__))
_SITE = "https://365techies.co.uk"

# what each section of games.json is called on the page, and a line about it
_CATS = {
    "Card games": ("Card games", "The classics, with big clear cards. Tap a card and it moves to the best place for it &mdash; or drag it, if you prefer."),
    "Arcade": ("Arcade games", "Our own takes on the arcade games of the 80s and 90s. Each one has a <b>Gentle</b> speed for beginners."),
    "Seafront": ("Made in Bournemouth", "A 3D game on the real Bournemouth seafront. It runs best on a newer computer."),
}
# a picture that lives somewhere other than games/img/ (Seafront's own page already has its levels as pictures)
_IMG_ELSEWHERE = {"seafront": "/bournemouth/games/seafront/media/lv-pirate.webp"}


def _games():
    with open(os.path.join(_ROOT, "games", "games.json"), encoding="utf-8") as f:
        return json.load(f)["games"]


def _esc(s):
    return str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


def _path(url):   # our own address, as a path (so the page works on a test copy of the site too)
    return url[len(_SITE):] if url.startswith(_SITE + "/") else url


def _picture(g):
    if g["id"] in _IMG_ELSEWHERE:
        return _IMG_ELSEWHERE[g["id"]]
    rel = "games/img/%s-v1.webp" % g["id"]
    return "/" + rel if os.path.exists(os.path.join(_ROOT, rel.replace("/", os.sep))) else None


def _cards():
    games = _games()
    cats = []
    for g in games:
        if g.get("cat") not in cats:
            cats.append(g.get("cat"))
    out, n = [], 0
    for c in cats:
        name, line = _CATS.get(c, (_esc(c), ""))
        items = []
        for g in [x for x in games if x.get("cat") == c]:
            n += 1
            pic = _picture(g)
            # the first row is on the first screen: those pictures load at once, the rest when scrolled to
            lazy = '' if n <= 3 else ' loading="lazy"'
            art = ('<img src="%s" alt="" width="800" height="600" decoding="async"%s />' % (pic, lazy)) if pic else \
                  '<span class="gh-icon" aria-hidden="true">%s</span>' % _esc(g.get("icon", ""))
            if g.get("soon"):
                items.append('<li class="gh-card gh-card--soon"><div class="gh-link"><span class="gh-art">%s</span><span class="gh-body">'
                             '<span class="gh-title">%s</span><span class="gh-sub">%s</span><span class="gh-play gh-play--soon">Coming soon</span></span></div></li>'
                             % (art, _esc(g["title"]), _esc(g.get("sub", ""))))
            else:
                items.append('<li class="gh-card"><a class="gh-link" href="%s"><span class="gh-art">%s</span><span class="gh-body">'
                             '<span class="gh-title">%s</span><span class="gh-sub">%s</span><span class="gh-play">Play <span aria-hidden="true">&rarr;</span></span></span></a></li>'
                             % (_esc(_path(g["url"])), art, _esc(g["title"]), _esc(g.get("sub", ""))))
        out.append('      <div class="gh-cat"><h2>%s</h2>%s</div>\n      <ul class="gh-grid" role="list">\n        %s\n      </ul>'
                   % (name, ('<p>%s</p>' % line) if line else "", "\n        ".join(items)))
    return "\n".join(out)


_CSS = """      <style>
        .gh{padding-top:1.6rem}
        .gh .wrap{max-width:1180px;margin:0 auto}
        .gh-cat{display:flex;flex-wrap:wrap;align-items:baseline;gap:.2rem 1rem;margin:2.2rem 0 1rem}
        .gh-cat:first-child{margin-top:0}
        .gh-cat h2{font-family:var(--font-display);font-weight:600;font-size:clamp(1.45rem,2.6vw,1.9rem);margin:0}
        .gh-cat p{margin:0;color:var(--muted);font-size:.98rem;line-height:1.5;max-width:44rem}
        .gh-grid{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:1fr;gap:1.1rem}
        @media (min-width:560px){.gh-grid{grid-template-columns:repeat(2,1fr)}}
        @media (min-width:900px){.gh-grid{grid-template-columns:repeat(3,1fr)}}
        .gh-link{display:flex;flex-direction:column;height:100%;border-radius:var(--r-lg);overflow:hidden;text-decoration:none;color:var(--ink);
          background:var(--glass-deep);border:1px solid var(--line);transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease}
        a.gh-link:hover{transform:translateY(-3px);border-color:rgba(108,196,245,.55);box-shadow:var(--glow-cyan)}
        a.gh-link:focus-visible{outline:3px solid var(--cyan-soft);outline-offset:3px}
        .gh-art{display:block;aspect-ratio:4/3;background:#04070f;overflow:hidden}
        .gh-art img{display:block;width:100%;height:100%;object-fit:cover;transition:transform .35s ease}
        a.gh-link:hover .gh-art img{transform:scale(1.04)}
        .gh-icon{display:grid;place-items:center;height:100%;font-size:4rem}
        .gh-body{display:flex;flex-direction:column;gap:.35rem;padding:1rem 1.1rem 1.1rem;flex:1}
        .gh-title{font-family:var(--font-display);font-weight:600;font-size:1.25rem;line-height:1.15}
        .gh-sub{color:var(--muted);font-size:.95rem;line-height:1.5;flex:1}
        .gh-play{align-self:flex-start;margin-top:.5rem;display:inline-flex;align-items:center;gap:.4rem;min-height:44px;padding:0 1.2rem;border-radius:var(--r-pill);
          background:var(--cyan);color:#fff;font-weight:700;font-size:1rem}
        a.gh-link:hover .gh-play{background:#2aa8f2}
        .gh-play--soon{background:rgba(255,255,255,.1);color:var(--muted)}
        .gh-pcm{margin:2.4rem 0 0;padding:1.2rem 1.3rem;border-radius:var(--r-lg);border:1px solid var(--line);background:var(--glass);
          display:flex;flex-wrap:wrap;align-items:center;gap:.8rem 1.4rem}
        .gh-pcm p{margin:0;flex:1 1 22rem;color:var(--muted);line-height:1.55}
        .gh-pcm b{color:var(--ink)}
        .gh-pcm a{color:var(--cyan-soft);font-weight:600;white-space:nowrap}
        @media (prefers-reduced-motion: reduce){.gh-link,.gh-art img{transition:none}a.gh-link:hover,a.gh-link:hover .gh-art img{transform:none}}
      </style>"""


def _pcm_line():
    if PCM_GAMES_MENU_LIVE:
        return ('<b>Play them in their own window.</b> 365 PC Manager, our free app for Windows, has a Games menu that opens each '
                'game in its own window, away from your web browser &mdash; and it keeps an eye on your computer while you play.',
                "Get 365 PC Manager &rarr;")
    return ('<b>Coming soon to 365 PC Manager:</b> a Games menu that opens each game in its own window, away from your web browser. '
            '365 PC Manager is our free app for Windows that keeps an eye on your computer.',
            "About 365 PC Manager &rarr;")


def _pre():
    words, link = _pcm_line()
    return ('    <section class="section gh" aria-label="The games">\n' + _CSS + '\n      <div class="wrap">\n' + _cards()
            + '\n      <div class="gh-pcm"><p>%s</p><a href="/free-pc-health-check/">%s</a></div>\n      </div>\n    </section>' % (words, link))


_INNER = """          <h2>Why are they free?</h2>
          <p>We&rsquo;re 365 Techies, a family-run computer support company in Bournemouth, looking after computers since 1995. Lots of our customers love a game of Solitaire, and too many of the free ones are packed with adverts. So we made our own: no adverts, no sign-in and nothing to buy &mdash; just the game.</p>
          <p>If your computer is slow, a game won&rsquo;t load or something else is playing up, that&rsquo;s what we do every day. Ring us on <a href="tel:+441202775566">01202 775566</a> or <a href="/contact/">send us a message</a>.</p>"""

_FAQS = [
    ("Are the games really free?",
     "Yes. There are no adverts, no sign-in and nothing to buy inside the games. You just open one and play."),
    ("Do I need to install anything?",
     "No. They run in your web browser &mdash; Edge, Chrome, Firefox or Safari &mdash; on a PC, laptop, tablet or phone. Seafront draws a 3D seafront, so it runs best on a newer computer."),
    ("Can I play on a tablet or phone?",
     "Yes. The card games are made for touch: tap a card and it moves to the best place for it. The arcade games show big buttons under the screen on a tablet or phone."),
    ("Are my scores saved?",
     "Your scores and settings are kept in your web browser on that computer, and they&rsquo;re never sent to us. Like every page on our site, we count visits without cookies &mdash; see our <a href=\"/privacy-policy/\">privacy policy</a>."),
    ("The arcade games are too fast for me &mdash; can I slow them down?",
     "Yes. Every arcade game has a <b>Gentle</b> speed (it&rsquo;s the one they start on), with a slower pace and more lives. Change it any time in the game&rsquo;s Settings."),
]

info_page(
    slug="games", crumb_name="Free Games",
    eyebrow="// FREE GAMES",
    h1='Free games, <em class="grad grad--cyan">no adverts</em>',
    lede="Solitaire, FreeCell, Spider and our own arcade games &mdash; made by us in Bournemouth. Play in your web browser on a PC, tablet or phone: nothing to install, nothing to sign up to, and never an advert.",
    desc="Free Solitaire, FreeCell, Spider and arcade games from 365 Techies in Bournemouth - no adverts, no sign-in, nothing to install. Play in your browser on a PC, tablet or phone.",
    title="Free Games - No Adverts, No Sign-In | 365 Techies",
    og_title="Free games, no adverts | 365 Techies",
    chips=["No adverts", "No sign-in", "Nothing to install"],
    task=True,
    pre=_pre(),
    inner=_INNER,
    faqs=_FAQS,
    cta_args=("Computer playing up?", "We&rsquo;re a family-run team in Bournemouth &mdash; remote help across the UK, and collection and repair locally.",
              ("Get Help", "/contact/"), ("Call 01202 775566", "tel:+441202775566")),
    robots=None if PUBLIC else "noindex,follow",
)
# while hidden, the page stays out of the site's own search as well (build_blog skips pages marked nosearch)
next(p for p in bp.PAGES if p.get("slug") == "games")["nosearch"] = not PUBLIC
