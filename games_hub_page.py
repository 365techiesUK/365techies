"""
/games/ - the Games page: every free game on one page (4 Oct 2026).

WHY IT EXISTS
The games (Solitaire, FreeCell, Spider, TriPeaks, Pyramid, 365 Invaders, 365 Bat & Ball, 365 Eclipse, and Seafront in the
Bournemouth section) each had their own address but nothing linked them together, and /games/ itself was a
403. The owner asked whether the games should live only in 365 PC Manager or on the website as well; the
advice taken ("yes build the games page") was: the website is where people find them, PC Manager is the
nicer way to play them. The players are the business's own customers (mostly home users, many retired), and
every game carries the 365 Techies name and phone number.

THE LAUNCHER (4 Oct 2026, owner: "get the game stuff looking a bit better ... look at how [Microsoft's Solitaire
pack] present[s] the games")
Like a games app rather than a list of links: a coloured title bar and a cover picture on every game, a "you" card
at the top (wins, today's challenges, days in a row - all read from the games' own saves in this browser by
games/common/hub.js; nothing is sent anywhere), a Daily challenges tile (Today's deal in every card game, ticked
off as they're won), ribbons on the tiles (Carry on, Today done, New) and a gentle tilt and shine under the mouse.
The covers are our own artwork (tools/covers/make-covers.py: Old Harry Rocks, Corfe Castle, the pier at sunset...)
- never Microsoft's pictures or names.

ONE LIST
The tiles are built from games/games.json - the same file 365 PC Manager's Games menu reads (Games.cs) and the
in-game Games menu (social.js). Add a game there, rebuild, and the website and the app both show it. Each game's
"look" there gives its colours (c1 the title bar, c2 the deep shade), its glyph (a small white picture for the bar),
its store (where its scores are kept in the browser), "cover" (card games: games/img/covers/<id>-v<cover>.svg) and
"added" (shows a New ribbon for 30 days to anyone who hasn't played it). Arcade pictures: games/img/<id>-v1.webp,
or -v<pic> when games.json gives "pic" (800 x 600). ⚠ Never overwrite a picture in place (images are cached for a
year): give a new one -v2 (and bump "cover" / "pic").

THE CARD GRID ALWAYS FILLS
Nine card games plus the Daily challenges tile = 10: two columns on a phone, five on a big screen; in between the
Daily tile becomes a wide banner (3 columns: it fills the first row; 4 columns: it takes 3 and Solitaire the 4th).
Adding a card game breaks that sum - re-check the grid at every width.

PUBLIC SINCE 4 OCT 2026 (owner: "make the games page public")
PUBLIC = False would make the page noindex again (which also keeps it out of sitemap.xml - build_blog skips noindex
pages) and out of the site's own search and llms.txt. It is linked from the footer's FREE TOOLS column (FOOTER in
build_pages.py). The game pages themselves stay noindex: like Seafront's play/ page, a game is a screen with no
words, so this page is the one that should rank.

PC MANAGER LINE
The Games menu is in PC Manager v32, which is built and signed but not released yet (it goes when the owner
says). Until then the line says it is coming; set PCM_GAMES_MENU_LIVE = True in the release commit.
"""
import json
import os
import re

import build_pages as bp
from build_extra import info_page

PUBLIC = True
PCM_GAMES_MENU_LIVE = False

_ROOT = os.path.dirname(os.path.abspath(__file__))
_SITE = "https://365techies.co.uk"

# what each section of games.json is called on the page, and a line about it
_CATS = {
    "Card games": ("Card games", "The classics, with big clear cards. Tap a card to play it &mdash; or drag it, if you prefer."),
    "Arcade": ("Arcade games", "Our own takes on the arcade games of the 80s and 90s. Each one has a <b>Gentle</b> speed for beginners."),
    "Seafront": ("Made in Bournemouth", "A 3D game on the real Bournemouth seafront. It runs best on a newer computer."),
}
# a picture that lives somewhere other than games/img/ (Seafront's own page already has its levels as pictures)
_IMG_ELSEWHERE = {"seafront": "/bournemouth/games/seafront/media/lv-pirate.webp"}
_HEX = re.compile(r"^#[0-9a-fA-F]{6}$")
# the Daily challenges tile's own look: gold, and a calendar with a star
_DAILY_LOOK = {"c1": "#c98a00", "c2": "#4a3000",
               "glyph": "<path d='M6 3h2v2h8V3h2v2h1.5A1.5 1.5 0 0 1 21 6.5v13a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19.5v-13A1.5 1.5 0 0 1 4.5 5H6zM5 9v10h14V9z'/>"
                        "<path d='m12 10.4 1.2 2.4 2.6.4-1.9 1.8.5 2.6-2.4-1.2-2.4 1.2.5-2.6-1.9-1.8 2.6-.4z'/>"}


def _games():
    with open(os.path.join(_ROOT, "games", "games.json"), encoding="utf-8") as f:
        return json.load(f)["games"]


def _esc(s):
    return str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


def _path(url):   # our own address, as a path (so the page works on a test copy of the site too)
    return url[len(_SITE):] if url.startswith(_SITE + "/") else url


def _picture(g):
    """(address, width, height, tall) of the game's picture, or None."""
    look = g.get("look") or {}
    if look.get("cover"):
        rel = "games/img/covers/%s-v%d.svg" % (g["id"], look["cover"])
        if os.path.exists(os.path.join(_ROOT, rel.replace("/", os.sep))):
            return "/" + rel, 600, 780, True
    if g["id"] in _IMG_ELSEWHERE:
        return _IMG_ELSEWHERE[g["id"]], 800, 600, False
    rel = "games/img/%s-v%d.webp" % (g["id"], g.get("pic", 1))   # "pic": 2 in games.json = a new picture (images cache for a year)
    return ("/" + rel, 800, 600, False) if os.path.exists(os.path.join(_ROOT, rel.replace("/", os.sep))) else None


def _kind(g):
    """Which shared engine the game runs on (so hub.js knows how its scores are kept), and whether it has a Hall of Fame."""
    try:
        with open(os.path.join(_ROOT, "games", g["id"], "index.html"), encoding="utf-8") as f:
            h = f.read()
    except OSError:
        return "", False
    kind = "rival" if "common/rivals.js" in h else "card" if "common/table.js" in h else "arcade" if "common/arcade.js" in h else ""
    return kind, "common/hof.js" in h


def _style(look):
    c1, c2 = look.get("c1", ""), look.get("c2", "")
    return (' style="--c1:%s;--c2:%s"' % (c1, c2)) if _HEX.match(c1 or "") and _HEX.match(c2 or "") else ""


def _bar(look, title):
    glyph = look.get("glyph", "")
    svg = ('<svg viewBox="0 0 24 24" fill="#fff" aria-hidden="true">%s</svg>' % glyph.replace("'", '"')) if glyph else ""
    return '<span class="gt-bar">%s<span class="gt-name">%s</span></span>' % (svg, _esc(title))


def _tile(g, n):
    look = g.get("look") or {}
    pic = _picture(g)
    kind, hof = _kind(g)
    # the first screenful of pictures load at once, the rest when scrolled to
    lazy = "" if n <= 4 else ' loading="lazy"'
    art = ('<img src="%s" alt="" width="%d" height="%d" decoding="async"%s />' % (pic[0], pic[1], pic[2], lazy)) if pic else \
          '<span class="gt-icon" aria-hidden="true">%s</span>' % _esc(g.get("icon", ""))
    data = ' data-id="%s" data-kind="%s" data-store="%s"%s%s data-pic="%s"' % (
        _esc(g["id"]), kind, _esc(look.get("store", "")), ' data-hof="1"' if hof else "",
        (' data-added="%s"' % _esc(look["added"])) if look.get("added") else "", _esc(pic[0] if pic else ""))
    body = ('<span class="gt-body"><span class="gt-sub">%s</span><span class="gt-row"><span class="gt-me" aria-live="off"></span>'
            '<span class="gt-play">%s</span></span></span>' % (_esc(g.get("sub", "")), "Coming soon" if g.get("soon") else 'Play <span aria-hidden="true">&rsaquo;</span>'))
    inner = '%s<span class="gt-main"><span class="gt-art">%s<span class="gt-rib" hidden></span></span>%s</span>' % (_bar(look, g["title"]), art, body)
    if g.get("soon"):
        return '<li class="gt gt--soon"%s%s><div class="gt-link">%s</div></li>' % (_style(look), data, inner)
    return '<li class="gt%s"%s%s><a class="gt-link" href="%s">%s</a></li>' % (
        " gt--tall" if pic and pic[3] else "", _style(look), data, _esc(_path(g["url"])), inner)


def _daily_tile(count):
    # the date, the week's dots and the count are filled in by hub.js (this is a static page: no date is baked in)
    return ('<li class="gt gt--tall gt--daily" id="daily"%s><button type="button" class="gt-link" id="ghDaily" aria-haspopup="dialog">%s'
            '<span class="gt-main"><span class="gt-art gt-cal"><span class="cal"><span class="cal-m" id="ghCalM">Today</span>'
            '<span class="cal-d" id="ghCalD">&#9733;</span><span class="cal-w" id="ghCalW">A new deal</span></span>'
            '<span class="cal-week" id="ghWeek" aria-hidden="true"></span></span>'
            '<span class="gt-body"><span class="gt-sub">Today&rsquo;s deal in every card game &mdash; the same cards for everyone. Win it to tick it off, and to get into the Hall of Fame.</span>'
            '<span class="gt-row"><span class="gt-me" id="ghDailyMe">%d games, new every day</span><span class="gt-play">Open <span aria-hidden="true">&rsaquo;</span></span></span></span>'
            '</span></button></li>' % (_style(_DAILY_LOOK), _bar(_DAILY_LOOK, "Daily challenges"), count))


def _cards():
    games = _games()
    cats = []
    for g in games:
        if g.get("cat") not in cats:
            cats.append(g.get("cat"))
    out, n = [], 0
    for c in cats:
        name, line = _CATS.get(c, (_esc(c), ""))
        mine = [x for x in games if x.get("cat") == c]
        items = []
        if c == "Card games":
            items.append(_daily_tile(sum(1 for x in mine if not x.get("soon"))))
        for g in mine:
            n += 1
            items.append(_tile(g, n))
        cls = "gh-grid--cards" if c == "Card games" else "gh-grid--one" if len(mine) == 1 else "gh-grid--wide"
        out.append('      <div class="gh-cat" id="gh-%s"><h2>%s</h2>%s</div>\n      <ul class="gh-grid %s" role="list">\n        %s\n      </ul>'
                   % (re.sub(r'[^a-z]+', '-', name.lower()).strip('-'), name, ('<p>%s</p>' % line) if line else "", cls, "\n        ".join(items)))
    return "\n".join(out)


# big Play buttons first (games audit, 5 Oct 2026; critic: on a phone the first screen had nothing to tap to start a
# game). hub.js turns the first into "Carry on" when a game is under way in this browser.
_QUICK = """      <div class="gh-quick" id="ghQuick">
        <a class="gh-qb gh-qb--go" id="ghQ1" href="/games/solitaire/"><span aria-hidden="true">&#9654;</span> Solitaire</a>
        <a class="gh-qb gh-qb--go" href="/games/hearts/"><span aria-hidden="true">&#9654;</span> Hearts</a>
        <a class="gh-qb" href="#gh-card-games">All games <span aria-hidden="true">&darr;</span></a>
      </div>"""

# the "you" card: filled in by hub.js from this browser's own saves; a first-time visitor sees the welcome
_ME = """      <div class="gh-me" id="ghMe">
        <span class="gh-av" id="ghAv" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="m3.2 8.3 6-2 4.3 12.9-6 2z" opacity=".45"/><path d="m8.6 5.3 6.3.2-.4 13.6-6.3-.2z" opacity=".7"/><path d="m14 6.2 6.1 1.8-3.9 13-6.1-1.8z"/></svg></span>
        <div class="gh-me__txt"><p class="gh-me__hi" id="ghHi">Pick a game and play</p>
          <p class="gh-me__sub" id="ghSub">As you play, your wins and today&rsquo;s challenges show up here &mdash; kept on this computer only.</p></div>
        <ul class="gh-me__stats" id="ghStats" role="list" hidden></ul>
        <button type="button" class="gh-hofb" id="ghHof" aria-haspopup="dialog" hidden><span aria-hidden="true">&#127942;</span> Hall of Fame</button>
      </div>"""

_CSS = """      <style>
        .gh{padding-top:1.6rem}
        .gh .wrap{max-width:1180px;margin:0 auto}
        .gh-cat{display:flex;flex-wrap:wrap;align-items:baseline;gap:.2rem 1rem;margin:2.4rem 0 1rem}
        .gh-cat h2{font-family:var(--font-display);font-weight:600;font-size:clamp(1.45rem,2.6vw,1.9rem);margin:0}
        .gh-cat p{margin:0;color:var(--muted);font-size:.98rem;line-height:1.5;max-width:44rem}
        /* the Play buttons */
        .gh-quick{display:flex;flex-wrap:wrap;gap:.6rem;margin:0 0 1rem}
        .gh-qb{flex:0 1 auto;display:inline-flex;align-items:center;justify-content:center;gap:.45rem;min-height:50px;padding:.55rem 1.3rem;border-radius:14px;
          background:rgba(255,255,255,.07);border:1px solid rgba(108,196,245,.4);color:var(--ink);font:600 1.08rem/1.1 var(--font-display);text-decoration:none}
        .gh-qb:hover{background:rgba(255,255,255,.13)}
        .gh-qb--go{background:linear-gradient(135deg,#2aa8f2,#1859b8);border-color:transparent;color:#fff;box-shadow:0 6px 18px rgba(24,89,184,.35)}
        .gh-qb--go:hover{background:linear-gradient(135deg,#3db4f5,#1d66c9)}
        /* (a phone: room on the right for the floating Text size button, which sat on the third button - critic 2) */
        @media (max-width:560px){.gh-quick{gap:.4rem;padding-right:56px}.gh-qb{flex:1 1 0;padding:.5rem .3rem;font-size:.95rem;min-width:0;white-space:nowrap}}
        /* the "you" card */
        .gh-me{display:flex;flex-wrap:wrap;align-items:center;gap:.9rem 1.2rem;padding:1rem 1.2rem;border-radius:var(--r-lg);
          background:linear-gradient(120deg,rgba(29,151,227,.18),rgba(12,20,44,.75) 60%);border:1px solid rgba(108,196,245,.28)}
        .gh-av{flex:none;display:grid;place-items:center;width:56px;height:56px;border-radius:50%;background:linear-gradient(145deg,#2aa8f2,#1859b8);
          color:#fff;font:700 1.05rem/1 var(--font-display);letter-spacing:.02em;box-shadow:0 0 0 3px rgba(255,255,255,.14),0 6px 18px rgba(0,0,0,.35)}
        .gh-av svg{width:30px;height:30px}
        .gh-me__txt{flex:1 1 15rem;min-width:0}
        .gh-me__hi{margin:0;font:600 clamp(1.2rem,2.2vw,1.45rem)/1.2 var(--font-display);color:var(--ink)}
        .gh-me__sub{margin:.2rem 0 0;color:var(--muted);font-size:.95rem;line-height:1.45}
        .gh-me__stats{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:.5rem}
        .gh-me__stats li{display:flex;flex-direction:column;justify-content:center;min-width:5.6rem;padding:.45rem .8rem;border-radius:12px;
          background:rgba(255,255,255,.06);border:1px solid var(--line)}
        .gh-me__stats b{font:600 1.3rem/1.1 var(--font-display);color:var(--ink);font-variant-numeric:tabular-nums}
        .gh-me__stats small{color:var(--muted);font-size:.8rem;line-height:1.2}
        .gh-me__stats .gold b{color:#ffd257}
        .gh-hofb{display:inline-flex;align-items:center;gap:.45rem;min-height:48px;padding:0 1.1rem;border-radius:var(--r-pill);border:1px solid rgba(255,210,87,.55);
          background:linear-gradient(180deg,rgba(255,210,87,.2),rgba(255,210,87,.07));color:#ffe08a;font:700 1rem/1 inherit;cursor:pointer}
        .gh-hofb:hover{background:linear-gradient(180deg,rgba(255,210,87,.32),rgba(255,210,87,.12))}
        .gh-hofb:focus-visible{outline:3px solid var(--cyan-soft);outline-offset:3px}
        /* the tiles */
        .gh-grid{list-style:none;margin:0;padding:0;display:grid;gap:1rem;grid-template-columns:repeat(2,minmax(0,1fr))}
        @media (min-width:600px){.gh-grid--cards{grid-template-columns:repeat(3,minmax(0,1fr))}.gh-grid--cards .gt--daily{grid-column:span 3}}
        @media (min-width:860px){.gh-grid--cards{grid-template-columns:repeat(4,minmax(0,1fr))}.gh-grid--wide{grid-template-columns:repeat(4,minmax(0,1fr))}}
        @media (min-width:1100px){.gh-grid--cards{grid-template-columns:repeat(5,minmax(0,1fr))}.gh-grid--cards .gt--daily{grid-column:auto}}
        .gh-grid--one{grid-template-columns:1fr}
        .gt{--c1:#1d6fd6;--c2:#0c2048;--rx:0deg;--ry:0deg;--lift:0px;min-width:0}
        .gt-link{position:relative;display:flex;flex-direction:column;width:100%;height:100%;margin:0;padding:0;border:0;border-radius:18px;overflow:hidden;
          text-align:left;font:inherit;color:#fff;text-decoration:none;cursor:pointer;background:var(--c2);
          box-shadow:0 0 0 1px rgba(255,255,255,.08) inset,0 10px 26px rgba(0,0,0,.38);
          transform:perspective(900px) rotateX(var(--rx)) rotateY(var(--ry)) translateY(var(--lift));transition:transform .25s ease,box-shadow .25s ease}
        a.gt-link:hover,button.gt-link:hover{--lift:-4px;box-shadow:0 0 0 1px rgba(255,255,255,.16) inset,0 18px 38px rgba(0,0,0,.5),0 0 0 2px color-mix(in srgb,var(--c1) 70%,#fff)}
        .gt-link:focus-visible{outline:3px solid #ffd257;outline-offset:3px}
        .gt-bar{display:flex;align-items:center;gap:.5rem;min-height:46px;padding:.5rem .8rem;background:var(--c1);
          background:linear-gradient(180deg,color-mix(in srgb,var(--c1) 88%,#fff),var(--c1) 55%,color-mix(in srgb,var(--c1) 78%,#000));
          box-shadow:0 1px 0 rgba(255,255,255,.25) inset,0 -1px 0 rgba(0,0,0,.25) inset}
        .gt-bar svg{flex:none;width:22px;height:22px;filter:drop-shadow(0 1px 1px rgba(0,0,0,.35))}
        .gt-name{font:600 1.12rem/1.15 var(--font-display);text-shadow:0 1px 2px rgba(0,0,0,.35)}
        .gt--daily .gt-bar{container-type:inline-size}   /* its name shrinks to stay on one line in a narrow tile */
        .gt--daily .gt-name{font-size:min(1.12rem,calc((100cqi - 48px) / 9.2))}
        .gt-main{display:flex;flex-direction:column;flex:1}
        .gt-art{position:relative;display:block;overflow:hidden;aspect-ratio:4/3;background:var(--c2)}
        .gt--tall .gt-art{aspect-ratio:600/780}
        .gt-art img{display:block;width:100%;height:100%;object-fit:cover;transition:transform .45s ease}
        .gt-link:hover .gt-art img{transform:scale(1.05)}
        .gt-art::after{content:"";position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity .3s ease;
          background:radial-gradient(circle at var(--mx,50%) var(--my,0%),rgba(255,255,255,.32),rgba(255,255,255,0) 55%)}
        .gt-link:hover .gt-art::after{opacity:1}
        .gt-icon{display:grid;place-items:center;height:100%;font-size:4rem}
        .gt-rib{position:absolute;top:10px;left:10px;z-index:1;padding:.32rem .65rem;border-radius:var(--r-pill);font:800 .8rem/1 Archivo,"Segoe UI",sans-serif;
          letter-spacing:.02em;color:#fff;background:#1d97e3;box-shadow:0 3px 10px rgba(0,0,0,.4)}
        .gt-rib.ok{background:#16a34a}.gt-rib.new{background:#ffd257;color:#3b2a00}
        .gt-body{display:flex;flex-direction:column;gap:.5rem;flex:1;padding:.75rem .85rem .85rem;
          background:linear-gradient(180deg,var(--c2),color-mix(in srgb,var(--c2) 70%,#000))}
        .gt-sub{flex:1;color:rgba(255,255,255,.84);font-size:.9rem;line-height:1.45}
        .gt-row{display:flex;align-items:center;justify-content:space-between;gap:.6rem}
        .gt-me{flex:1 1 0;min-width:0;color:#ffe08a;font-weight:700;font-size:.88rem;line-height:1.25}
        .gt-me:empty{display:none}
        .gt-play{flex:none;margin-left:auto;display:inline-flex;align-items:center;justify-content:center;gap:.3rem;min-height:40px;padding:0 1rem;border-radius:var(--r-pill);
          background:rgba(255,255,255,.95);color:var(--c2);font-weight:800;font-size:.95rem;white-space:nowrap}
        .gt--soon .gt-play{background:rgba(255,255,255,.18);color:#fff}
        .gt--soon .gt-link{cursor:default}
        /* the Daily challenges tile: a calendar page and this week's ticks */
        .gt-cal{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1rem;padding:1rem;
          background:radial-gradient(circle at 50% 38%,#ffcf4d 0,#e39b00 38%,#7a4b00 100%)}
        .cal{display:flex;flex-direction:column;align-items:center;width:min(70%,170px);border-radius:14px;overflow:hidden;background:#fffdf7;color:#2a1d00;
          box-shadow:0 12px 26px rgba(60,30,0,.45),0 0 0 4px rgba(255,255,255,.35);transform:rotate(-3deg)}
        .cal-m{align-self:stretch;padding:.4rem 0;background:#d42a2a;color:#fff;text-align:center;font:800 .82rem/1 Archivo,"Segoe UI",sans-serif;letter-spacing:.14em;text-transform:uppercase}
        .cal-d{padding:.35rem 0 0;font:600 clamp(2.6rem,6vw,3.6rem)/1 var(--font-display);font-variant-numeric:tabular-nums}
        .cal-w{padding:.15rem .4rem .6rem;font:700 .82rem/1.2 Archivo,"Segoe UI",sans-serif;color:#7a5a12;text-align:center}
        .cal-week{display:flex;gap:6px}
        .cal-week span{display:flex;flex-direction:column;align-items:center;gap:4px;font:800 .7rem/1 Archivo,"Segoe UI",sans-serif;color:rgba(255,255,255,.92)}
        .cal-week i{display:grid;place-items:center;width:20px;height:20px;border-radius:50%;background:rgba(0,0,0,.28);box-shadow:0 0 0 2px rgba(255,255,255,.35) inset;font-style:normal;font-size:.75rem;color:#fff}
        .cal-week .on i{background:#16a34a;box-shadow:0 0 0 2px #b9f5c9 inset}
        .cal-week .now i{box-shadow:0 0 0 2px #fff inset,0 0 0 2px rgba(255,255,255,.5)}
        @media (min-width:600px) and (max-width:1099.98px){
          .gt--daily .gt-main{flex-direction:row}
          .gt--daily .gt-art{aspect-ratio:auto;flex:0 0 46%;min-height:250px;flex-direction:row;gap:1.4rem}
          .gt--daily .cal{width:150px}.gt--daily .cal-week{flex-direction:column;gap:5px}.gt--daily .cal-week span{flex-direction:row;gap:6px}
          .gt--daily .gt-body{justify-content:center;padding:1.2rem 1.4rem}.gt--daily .gt-sub{flex:0;font-size:1.05rem}
        }
        @media (min-width:600px) and (max-width:659.98px){.gt-name{font-size:1rem}}   /* three narrow columns: "Gin Rummy" stays on one line */
        @media (min-width:760px){
          .gh-grid--one .gt-main{flex-direction:row}
          .gh-grid--one .gt-art{flex:0 0 46%;aspect-ratio:16/10}
          .gh-grid--one .gt-body{justify-content:center;padding:1.2rem 1.4rem}.gh-grid--one .gt-sub{flex:0;font-size:1.05rem}
        }
        @media (max-width:599.98px){
          .gt-bar{min-height:40px;padding:.4rem .55rem;gap:.35rem}.gt-bar svg{width:18px;height:18px}.gt-name{font-size:.95rem}
          .gt-body{padding:.6rem .65rem .7rem}.gt-sub{font-size:.84rem}
          .gt-row{flex-direction:column;align-items:stretch;gap:.45rem}.gt-play{margin-left:0;min-height:42px}
          .cal{width:80%}.cal-week{gap:3px}.cal-week span{font-size:.6rem;gap:3px}.cal-week i{width:16px;height:16px;font-size:.62rem}
          .gh-me{display:grid;grid-template-columns:auto minmax(0,1fr);gap:.75rem .8rem;padding:.85rem}
          .gh-av{width:46px;height:46px;font-size:.95rem}.gh-av svg{width:25px;height:25px}
          .gh-me__stats{grid-column:1/-1;flex-wrap:nowrap;gap:.4rem}
          .gh-me__stats li{flex:1 1 0;min-width:0;padding:.4rem .5rem}.gh-me__stats b{font-size:1.05rem}.gh-me__stats small{font-size:.7rem}
          .gh-hofb{grid-column:1/-1;justify-content:center;min-height:46px}
        }
        /* the sheets the page opens (Daily challenges, Hall of Fame): social.js draws the sheet, these are its rows */
        .gh-week{display:flex;gap:6px;margin:4px 0 6px}
        .gh-week span{flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;font:700 13px/1 Archivo,"Segoe UI",sans-serif;color:#5b6b60}
        .gh-week i{display:grid;place-items:center;width:30px;height:30px;border-radius:50%;background:#efece2;font-style:normal;color:#fff;font-size:15px}
        .gh-week .on i{background:#16a34a}.gh-week .now i{box-shadow:0 0 0 3px #146c3a}
        .gh-list{list-style:none;margin:14px 0 0;padding:0;display:grid;gap:8px}
        .gh-li{display:flex;align-items:center;gap:12px;padding:8px 10px 8px 8px;border-radius:14px;border:2px solid #e2ded2;background:#fff}
        .gh-li.ok{border-color:#a8d9b8;background:#f2faf5}
        .gh-li img{flex:none;width:44px;height:57px;border-radius:7px;object-fit:cover;background:#0b1422}
        .gh-li img.wide{width:64px;height:48px}
        .gh-li__t{flex:1;min-width:0}
        .gh-li__t b{display:block;font:700 17px/1.2 Archivo,"Segoe UI",sans-serif;color:#15211a}
        .gh-li__t small{display:block;margin-top:2px;font-size:14px;line-height:1.3;color:#5b6b60}
        .gh-li.ok small{color:#146c3a;font-weight:700}
        .gh-go{flex:none;display:inline-flex;align-items:center;min-height:46px;padding:0 16px;border-radius:12px;background:#146c3a;color:#fff;font:700 16px/1 Archivo,"Segoe UI",sans-serif;text-decoration:none}
        .gh-go.soft{background:#fff;color:#146c3a;box-shadow:0 0 0 2px #146c3a inset}
        .gh-go:focus-visible{outline:3px solid #22a3ee;outline-offset:2px}
        .gh-li-h{margin:16px 0 0;font:700 13px/1 Archivo,"Segoe UI",sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#5b6b60}
        @media (max-width:460px){.gh-li{gap:9px}.gh-go{padding:0 12px;font-size:15px}.gh-li img{width:38px;height:49px}}
        /* the rest of the page */
        .gh-ask{margin:2.6rem 0 0;padding:1.5rem 1.4rem;border-radius:var(--r-lg);border:1px solid rgba(108,196,245,.35);
          background:linear-gradient(135deg,rgba(29,151,227,.16),rgba(12,20,44,.7));display:flex;flex-wrap:wrap;align-items:center;gap:1.1rem 2rem}
        .gh-ask h2{font-family:var(--font-display);font-weight:600;font-size:clamp(1.4rem,2.6vw,1.8rem);margin:0 0 .4rem}
        .gh-ask p{margin:0;color:var(--muted);line-height:1.55;max-width:40rem}
        .gh-ask__txt{flex:1 1 24rem}
        .gh-ask__btns{display:flex;flex-wrap:wrap;gap:.7rem}
        .gh-ask__btns .button{min-height:48px}
        .gh-pcm{margin:1.4rem 0 0;padding:1.2rem 1.3rem;border-radius:var(--r-lg);border:1px solid var(--line);background:var(--glass);
          display:flex;flex-wrap:wrap;align-items:center;gap:.8rem 1.4rem}
        .gh-pcm p{margin:0;flex:1 1 22rem;color:var(--muted);line-height:1.55}
        .gh-pcm b{color:var(--ink)}
        .gh-pcm a{color:var(--cyan-soft);font-weight:600;white-space:nowrap}
        @media (prefers-reduced-motion: reduce){.gt-link,.gt-art img,.gt-art::after{transition:none}.gt-link{transform:none!important}.gt-link:hover .gt-art img{transform:none}}
      </style>"""


def _pcm_line():
    if PCM_GAMES_MENU_LIVE:
        return ('<b>Play them in their own window.</b> 365 PC Manager, our free app for Windows, has a Games menu that opens each '
                'game in its own window, away from your web browser &mdash; and it keeps an eye on your computer while you play.',
                "Get 365 PC Manager &rarr;")
    return ('<b>Coming soon to 365 PC Manager:</b> a Games menu that opens each game in its own window, away from your web browser. '
            '365 PC Manager is our free app for Windows that keeps an eye on your computer.',
            "About 365 PC Manager &rarr;")


# 4 Oct 2026 (owner: "a feedback button or where they can request a game ... each game is in development"): the same
# Share / Feedback / Request sheets as inside the games (games/common/social.js, which brings its own styles)
_ASK = """      <div class="gh-ask" id="ask">
        <div class="gh-ask__txt"><h2>Help us make the next one</h2>
          <p>Every game here is still being made. Tell us what you&rsquo;d like &mdash; a new game, more levels, an easier setting &mdash; and the ideas people ask for most are the ones we build next. If we make yours, we can email you to say it&rsquo;s ready.</p></div>
        <div class="gh-ask__btns">
          <button type="button" class="button primary" id="ghAsk">Ask us to make a game</button>
          <button type="button" class="button secondary" id="ghFeed">Tell us what you think</button>
          <button type="button" class="button secondary" id="ghShare">Share these games</button>
        </div>
      </div>
      <script src="/games/common/social.js?v=4"></script>
      <script src="/games/common/hub.js?v=3"></script>
      <script>(function(){if(!window.GameSocial){var a=document.getElementById("ask");if(a)a.hidden=true;return;}
        GameSocial.init({id:"games",title:"365 Games"});
        document.getElementById("ghAsk").onclick=function(){GameSocial.openFeedback("request");};
        document.getElementById("ghFeed").onclick=function(){GameSocial.openFeedback("feedback");};
        document.getElementById("ghShare").onclick=function(){GameSocial.share();};})();</script>"""


def _pre():
    words, link = _pcm_line()
    return ('    <section class="section gh" aria-label="The games">\n' + _CSS + '\n      <div class="wrap">\n' + _QUICK + '\n' + _ME + '\n' + _cards() + '\n' + _ASK
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
    ("What are the daily challenges?",
     "Every card game has a new deal each day &mdash; Today&rsquo;s deal, or Today&rsquo;s match in Hearts, Gin Rummy, Cribbage and Whist &mdash; with the same cards for everyone. Win it to tick it off for the day; the Daily challenges tile on this page shows how many you&rsquo;ve done and how many days in a row."),
    ("What is the Journey?",
     "Every card game has one: 100 levels in ten chapters, each named after a real place in Dorset or the New Forest &mdash; along the coast, round Poole Harbour, through the old market towns and the Forest. Every level is a set deal with three stars to win, and every star has been checked to be possible. In Hearts, Gin Rummy, Cribbage and Whist a level is a single hand against the computer."),
    ("Can I change how the cards look?",
     "Yes. In any card game, open Settings and choose <b>Table and card backs</b>: twelve tables and twelve card backs, from green baize to beach huts and Old Harry Rocks. A few specials are won with Journey stars. Your choice is used in all our card games."),
    ("Are my scores saved?",
     "Your scores and settings are kept in your web browser on that computer. They&rsquo;re only sent to us if you choose to put a score in the Hall of Fame. We count visits without cookies; the cookie banner lets you choose whether our live chat and Google Analytics may use cookies &mdash; see our <a href=\"/privacy-policy/\">privacy policy</a>."),
    ("What is the Hall of Fame?",
     "Our card and arcade games each have one. Win Today&rsquo;s deal in a card game, or finish a game in the arcade, and you can put your initials and town in it to see where you rank in Dorset and beyond. Only your initials and town are ever shown &mdash; never your name &mdash; and you can take them off at any time. 365 customers signed in on that computer get a 365 member badge."),
    ("The arcade games are too fast for me &mdash; can I slow them down?",
     "Yes. Every arcade game has a <b>Gentle</b> speed (it&rsquo;s the one they start on), with a slower pace and more lives. Change it any time in the game&rsquo;s Settings."),
]

info_page(
    slug="games", crumb_name="Free Games",
    eyebrow="// FREE GAMES",
    h1='Free games, <em class="grad grad--cyan">no adverts</em>',
    lede="Solitaire, Hearts, Cribbage, Whist and five more card games, plus our own arcade games &mdash; made by us in Bournemouth, for your PC, tablet or phone.",
    desc="Free Solitaire, FreeCell, Spider, TriPeaks, Pyramid, Hearts, Gin Rummy, Cribbage, Whist and arcade games from 365 Techies, Bournemouth. No adverts, no sign-in.",
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
_page = next(p for p in bp.PAGES if p.get("slug") == "games")
# while hidden, the page stays out of the site's own search as well (build_blog skips pages marked nosearch)
_page["nosearch"] = not PUBLIC
# what WhatsApp / Facebook show when the page is shared: the six games on one picture (made 4 Oct, scratchpad make_share_cards.py)
_page["og_image"] = "/games/img/games-share-v3.jpg"   # v3 (5 Oct): names Hearts, Cribbage, Whist + 5 more AND shows a Hearts table (v1 named only three games; v2 named them but showed none)
