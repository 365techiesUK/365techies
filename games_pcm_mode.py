"""
/games/ opened from 365 PC Manager (5 Oct 2026). PC Manager v33's Games lobby has "Open the Games Hub", which opens the
launcher in its own window with ?from=pcm (owner: "a proper game interface ... a premium sort of gateway to our games").
games/common/pcm-mode.js then hides the website's header, footer, call bar, page heading, FAQ and PC Manager advert, and
adds a slim 365 Games bar, so the launcher fills the window like a games console. Without ?from=pcm nothing changes.
11 Oct 2026: the installed 365 Games app (Microsoft Store / installed web app) gets the same look - the script spots
the app window's display mode or the app's ?src=app start address. Website visitors see no change.

Kept in its own file (not games_hub_page.py) so the games pages' own work never has to carry it. It only adds a <head>
script: in the head, so the website's header never flashes up before the script hides it.
"""
import build_pages as bp

bp.HEAD_EXTRA["games"] = bp.HEAD_EXTRA.get("games", "") + '\n  <script src="/games/common/pcm-mode.js?v=2"></script>'
