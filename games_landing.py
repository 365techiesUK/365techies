# -*- coding: utf-8 -*-
"""Two landing pages for the free card games, the pages Google can show (the game screens stay noindex):
/play-patience-online-free/ (Solitaire) and /play-cribbage-online-free/.

Owner, 8-9 Oct 2026: "do two games pages, Solitaire and Cribbage ... optimize the pages for SEO and AI ... focus on that
they're free games, no install, and ... mainly no adverts ... videos on them as well ... say also that there's a Hall of
Fame or high scores and daily challenges ... do research to see if we can rank".

THE RESEARCH (9 Oct 2026, Google's UK autocomplete + the SERPs): "solitaire no ads" is owned by Google's own game,
solitaire.com, Solitaired and Solitaire Bliss - all already say "no ads". The low-hanging fruit is the BRITISH words:
"play patience online free", "patience card game free / online / uk", "solitaire big cards free online", "solitaire for
seniors free no ads"; "play cribbage against computer", "cribbage free online without downloading", "crib card game
online free", "play crib online free" - answered today by thin pages, apps and spam. Hence the slugs and titles.

Every claim is pinned to the games themselves (games/solitaire/solitaire.js LV lines + help, games/cribbage help +
engine.js, api/games-hof.php, games_hub_page.py): Patience - Easy turns one / Normal three / Hard three passes, no Hint /
Expert one pass, no Undo or Hint; every Easy and Normal deal has been played through to a win first; Today's deal, the
3-minute sprint, the Hall of Fame (fastest win, every win replayed on our server), a 100-level Journey. Cribbage - you play
Sam, first to 121, the play and the show counted for you, four levels (Hint on Easy and Normal), Today's match (Hall of
Fame = biggest winning margin, the whole match replayed), a 100-level Journey. Both: no adverts, nothing to install, no
sign-in, saved as you go in the browser. The videos are real recordings of the real games (scratchpad 8682606b gv/:
record.cjs plays by the page's own Hint; make_video.py; voice make_vo.py, Kokoro bf_emma).
"""
import json
import build_pages as bp
from build_extra import build_new_page

SITE = bp.SITE
UPLOADED = "2026-10-09"


def _video(key, name, secs, poster, src, transcript, play_href, play_label):
    return ('<figure id="video" style="margin:0 0 1rem">'
            '<video controls playsinline preload="none" poster="%s" width="1920" height="1080" aria-label="%s" '
            'style="display:block;width:100%%;height:auto;border-radius:16px;border:1px solid rgba(125,170,220,.3);box-shadow:0 26px 60px -28px rgba(0,0,0,.85);background:#0a1226">'
            '<source src="%s" type="video/mp4" /></video>'
            '<figcaption style="font-size:.8rem;color:var(--muted);margin-top:.5rem">The real game, recorded on a PC: %s seconds, with a spoken guide and captions.</figcaption></figure>'
            '<p style="margin:1rem 0 1.2rem"><a class="button primary" href="%s" style="text-decoration:none" data-gl-play="%s">%s</a></p>'
            '<details style="margin:.4rem 0 0"><summary style="cursor:pointer">What the video says</summary><p style="margin:.6rem 0 0">%s</p></details>'
            % (poster, name, src, secs, play_href, key, play_label, transcript))


_PLAY_TRACK = ('<script>(function(){var a=document.querySelectorAll("[data-gl-play]");for(var i=0;i<a.length;i++)a[i].addEventListener("click",function(){'
               'try{if(typeof window.gtag==="function")window.gtag("event","game_play_click",{page:location.pathname,game:this.getAttribute("data-gl-play")});}catch(e){}});})();</script>')

_WHY_FREE = ('<p>We&rsquo;re <strong>365 Techies</strong>, a family-run computer support company in Bournemouth, looking after people&rsquo;s computers since 1995. '
             'Lots of our customers love a game of cards, and too many of the free ones are wrapped in adverts &mdash; pop-ups between games, videos you have to sit through, '
             'buttons that are really adverts. So we made our own.</p>'
             '<p>There are <strong>no adverts</strong>, nothing to buy and nothing to sign up for &mdash; just the game. We&rsquo;re paid for looking after computers, '
             'not for your attention, so there&rsquo;s nothing to sell you here. If your computer ever plays up, that&rsquo;s what we do: '
             '<a href="tel:+441202775566">01202 775566</a>.</p>')

_ALL_GAMES = ('<p>The same no-adverts promise runs through every game on <a href="/games/">our games page</a>: '
              '<a href="/play-patience-online-free/">Patience</a>, <a href="/play-freecell-online-free/">FreeCell</a>, <a href="/games/spider/">Spider</a>, '
              '<a href="/games/tripeaks/">TriPeaks</a>, <a href="/games/pyramid/">Pyramid</a>, <a href="/play-hearts-online-free/">Hearts</a>, '
              '<a href="/play-gin-rummy-online-free/">Gin Rummy</a>, <a href="/play-cribbage-online-free/">Cribbage</a> and <a href="/play-whist-online-free/">Whist</a>, '
              'plus our own arcade games. They&rsquo;re also in the Games menu of our free Windows app, <a href="/free-pc-health-check/">365 PC Manager</a>.</p>')

# ============================================================ Patience (Solitaire)
PAT_VIDEO = "/images/games-patience-video-v1.mp4"
PAT_POSTER = "/images/games-patience-poster-v1.webp"
PAT_SECS = 62
PAT_TRANSCRIPT = ("This is Patience, or Solitaire, from 365 Techies. It&rsquo;s free, there&rsquo;s nothing to install, and there are no adverts. "
                  "The cards are big and clear. Tap a card, and it jumps to the best place for it. Stuck? Press Hint, and the next move lights up. "
                  "And you can undo as often as you like. Easy turns one card at a time, Normal turns three, and Hard and Expert are there when you&rsquo;re ready. "
                  "Your game is saved as you go, so you can stop and carry on later, on your PC, your tablet or your phone. And when you win, the cards take a bow. "
                  "There&rsquo;s a new deal every day, the same cards for everyone, with a Hall of Fame, a three-minute sprint, and a hundred-level Journey. "
                  "Play free at 365techies.co.uk. No adverts. No sign-up. Just the cards.")

PAT = {
    'slug': 'play-patience-online-free',
    'title': 'Free Patience Online: Big Cards, No Adverts | 365 Techies',
    'metaDesc': 'Play Patience (Solitaire) online free: big, clear cards, no adverts, nothing to download, no sign-in. A new deal every day, a Hall of Fame and unlimited Undo.',
    'ogTitle': 'Play Patience online free - big cards, no adverts',
    'crumbName': 'Play Patience Online Free',
    'eyebrow': '// FREE PATIENCE &middot; SOLITAIRE',
    'h1': 'Play Patience online, <em class="grad grad--cyan">free and with no adverts</em>',
    'lede': 'Patience &mdash; Solitaire, if you&rsquo;re American &mdash; with big, clear cards, right in your web browser. It&rsquo;s free, there&rsquo;s nothing to install, no sign-in, and no adverts. Not one. Press Play and the cards are dealt.',
    'chips': ['No adverts, ever', 'Nothing to install', 'Big, clear cards'],
    'primaryCta': ['Play Patience free', '/games/solitaire/'], 'secondaryCta': ['All our games', '/games/'],
    'ctaHead': 'Fancy a game of Patience?', 'ctaSub': 'Free, with big clear cards and no adverts, on your PC, tablet or phone. Nothing to install and no sign-in.',
    'schemaKind': 'howto',
    'atAGlance': [
        ('Price', 'Free. Nothing to buy, now or later.'),
        ('Adverts', 'None. No pop-ups between games, no videos to sit through.'),
        ('Install or sign-in?', 'Neither. It plays in your web browser; your game and scores are saved as you go.'),
        ('Works on', 'A PC, laptop, tablet or phone &mdash; Windows, Mac, iPad, iPhone or Android.'),
        ('Levels', 'Easy turns one card, Normal three; every Easy and Normal deal can be won. Hard and Expert for a challenge.'),
        ('Help when stuck', 'Hint lights up the next move (Easy and Normal); Undo as often as you like (all but Expert).'),
        ('Every day', 'Today&rsquo;s deal, the same cards for everyone, with a Hall of Fame for the fastest wins, and a 3-minute sprint.'),
        ('And', 'A 100-level Journey, a choice of table colours and card backs, and a deal you can send a friend to beat.'),
    ],
    'sections': [
        {'eyebrow': '/01 &mdash; SEE IT IN A MINUTE', 'h2': 'Here&rsquo;s what it&rsquo;s like',
         'html': _video('patience', 'Patience from 365 Techies: big clear cards, tap to move, Hint and Undo, the four levels, a win, and the daily deal', PAT_SECS, PAT_POSTER, PAT_VIDEO,
                        PAT_TRANSCRIPT, '/games/solitaire/', 'Play Patience free &#8594;')},
        {'eyebrow': '/02 &mdash; NO ADVERTS', 'h2': 'Why there are no adverts, and never will be', 'html': _WHY_FREE},
        {'eyebrow': '/03 &mdash; HOW TO PLAY', 'h2': 'How to play Patience',
         'html': '<p>This is <strong>Klondike</strong>, the classic Patience that came with Windows.</p>'
                 '<ol><li><strong>The aim:</strong> build four piles at the top right, one for each suit, from Ace up to King.</li>'
                 '<li><strong>In the seven columns,</strong> put each card on one a step higher and the other colour &mdash; a red 6 on a black 7.</li>'
                 '<li><strong>Tap a card</strong> and it moves to the best place for it. You can drag cards too, if you prefer.</li>'
                 '<li><strong>Tap the deck</strong> to turn over new cards. When it&rsquo;s empty, tap it to start again.</li>'
                 '<li><strong>Only a King</strong> can go in an empty column.</li></ol>'
                 '<p>Prefer the keyboard? The arrow keys choose a card and Enter plays it; N is a new game, U undo, H hint and F full screen.</p>'},
        {'eyebrow': '/04 &mdash; EASY TO EXPERT', 'h2': 'Four levels, and every Easy and Normal deal can be won',
         'html': '<ul><li><strong>Easy</strong> turns one card at a time, with Hint and Undo.</li>'
                 '<li><strong>Normal</strong> turns three, with Hint and Undo.</li>'
                 '<li><strong>Hard</strong> turns three, lets you through the deck only three times, and has no Hint.</li>'
                 '<li><strong>Expert</strong> goes through the deck once, with no Undo or Hint. Harder levels score more.</li></ul>'
                 '<p>On Easy and Normal, every deal has been played through to a win before you see it &mdash; so if you&rsquo;re stuck, there <em>is</em> a way through. Hard and Expert can be any deal.</p>'},
        {'eyebrow': '/05 &mdash; EVERY DAY', 'h2': 'A daily deal, a Hall of Fame and a 3-minute sprint',
         'html': '<ul><li><strong>Today&rsquo;s deal</strong> &mdash; the same cards for everyone, at each level. Win it and you can put your initials and town in the <strong>Hall of Fame</strong> for the fastest win. Every win is replayed move by move on our server before it counts, so the board is fair.</li>'
                 '<li><strong>The 3-minute sprint</strong> &mdash; how many cards can you get up to the piles in three minutes? Send the link to a friend and see if they can beat you.</li>'
                 '<li><strong>The Journey</strong> &mdash; a hundred levels, each with three stars to win.</li>'
                 '<li><strong>My scores</strong> &mdash; wins, best times and your streak, kept in your browser. To carry them to another device, use <em>Keep my scores</em>.</li></ul>'},
        {'eyebrow': '/06 &mdash; MORE GAMES', 'h2': 'Nine card games, all free with no adverts', 'html': _ALL_GAMES + _PLAY_TRACK},
    ],
    'howToName': 'How to play Patience (Klondike Solitaire)',
    'howToSteps': [
        {'name': 'Start a game', 'text': 'Open Patience in your web browser and press Play. Easy turns one card at a time; choose another level under New game.'},
        {'name': 'Build down the columns', 'text': 'Put each card on one a step higher and the other colour, such as a red 6 on a black 7. Tap a card and it moves to the best place.'},
        {'name': 'Turn the deck', 'text': 'Tap the deck at the top left to turn over new cards. When it is empty, tap it to start again.'},
        {'name': 'Build the four piles', 'text': 'Move each Ace to the piles at the top right and build each suit up to the King. Only a King can go in an empty column.'},
        {'name': 'Use Hint and Undo', 'text': 'Stuck? Press Hint and the next move lights up. Undo takes back as many moves as you like, on every level but Expert.'},
    ],
    'faqs': [
        {'q': 'Is this Patience really free?', 'a': '<p>Yes. There&rsquo;s nothing to buy and nothing to sign up for. It&rsquo;s made by 365 Techies, a family IT firm in Bournemouth, for our customers and anyone else who likes a game.</p>'},
        {'q': 'Are there really no adverts?', 'a': '<p>None at all: no pop-ups between games, no videos to watch and no buttons that turn out to be adverts. We&rsquo;re paid for looking after computers, not for showing adverts.</p>'},
        {'q': 'Do I need to download or install anything?', 'a': '<p>No. It plays in your web browser &mdash; Edge, Chrome, Safari or Firefox &mdash; on a PC, laptop, tablet or phone. If you use our free Windows app, 365 PC Manager, it&rsquo;s in its Games menu too.</p>'},
        {'q': 'What is the difference between Patience and Solitaire?', 'a': '<p>Nothing but the name. In Britain the one-player card game is called Patience; in America it&rsquo;s Solitaire. The classic version, the one that came with Windows, is Klondike &mdash; which is what this is.</p>'},
        {'q': 'Can every game be won?', 'a': '<p>On Easy and Normal, yes: every deal has been played through to a win before you see it. Hard and Expert can be any deal, and some can&rsquo;t be won.</p>'},
        {'q': 'Can I undo a move?', 'a': '<p>Yes, as many as you like, on every level except Expert.</p>'},
        {'q': 'Are the cards big enough to see?', 'a': '<p>They&rsquo;re big and clear, made for older eyes as much as younger ones, and you can tap a card rather than drag it. Press F for full screen to make them bigger still.</p>'},
        {'q': 'What is the Hall of Fame?', 'a': '<p>Win Today&rsquo;s deal and you can put your initials and town on the board for the fastest win that day &mdash; only if you choose to. Every win is checked by replaying it on our server, so nobody can cheat their way on.</p>'},
        {'q': 'Will my game be saved?', 'a': '<p>Yes, as you go, in your web browser, so you can stop and carry on later. Your scores are kept there too.</p>'},
    ],
    'crossLinksHtml': '<p>More free games: <a href="/play-cribbage-online-free/">Cribbage</a>, <a href="/play-freecell-online-free/">FreeCell</a>, <a href="/games/spider/">Spider</a> and <a href="/games/">all our games</a>. Computer playing up? <a href="/remote-support/">Remote help</a> from 365 Techies.</p>',
}

# ============================================================ Cribbage
CRB_VIDEO = "/images/games-cribbage-video-v1.mp4"
CRB_POSTER = "/images/games-cribbage-poster-v1.webp"
CRB_SECS = 68
CRB_TRANSCRIPT = ("This is Cribbage, or crib, from 365 Techies. It&rsquo;s free, there&rsquo;s nothing to install, and there are no adverts. "
                  "You play against Sam, the computer. Pick two cards for the crib. Then take turns to play. Fifteen two, pairs, runs and thirty-one are all added up and pegged for you. "
                  "At the end of each hand, your hand, Sam&rsquo;s hand and the crib are counted for you, so you can see where every point came from. "
                  "There are four levels, from a gentle game to a sharp one, with a Hint on the easier two. "
                  "Your game is saved as you go, so you can stop and carry on later, on your PC, your tablet or your phone. First to a hundred and twenty-one wins. "
                  "Play today&rsquo;s match, the same cards for everyone, and get your initials into the Hall of Fame. Free at 365techies.co.uk.")

_SCORES = ('<div class="cmp-wrap" tabindex="0" role="group" aria-label="Cribbage scores (scrolls sideways on a small screen)"><table class="cmp-table">'
           '<thead><tr><th>Scores</th><th>Points</th></tr></thead><tbody>'
           '<tr><td>Fifteen (cards adding up to 15)</td><td>2 each</td></tr>'
           '<tr><td>A pair</td><td>2 (three of a kind 6, four of a kind 12)</td></tr>'
           '<tr><td>A run of three or more</td><td>1 a card</td></tr>'
           '<tr><td>A flush in your hand</td><td>4 (5 with the starter); the crib needs all 5</td></tr>'
           '<tr><td>His nob &mdash; the Jack of the starter&rsquo;s suit</td><td>1</td></tr>'
           '<tr><td>His heels &mdash; the starter is a Jack (to the dealer)</td><td>2</td></tr>'
           '<tr><td>In the play: 15 or 31</td><td>2</td></tr>'
           '<tr><td>In the play: a Go, or the last card</td><td>1</td></tr>'
           '</tbody></table></div>')

CRB = {
    'slug': 'play-cribbage-online-free',
    'title': 'Play Cribbage Online Free, No Adverts | 365 Techies',
    'metaDesc': 'Play cribbage (crib) online free against the computer: no adverts, nothing to download, no sign-in. Every hand counted for you, four levels and a daily match.',
    'ogTitle': 'Play cribbage online free - against the computer, no adverts',
    'crumbName': 'Play Cribbage Online Free',
    'eyebrow': '// FREE CRIBBAGE &middot; CRIB',
    'h1': 'Play cribbage online, <em class="grad grad--cyan">free and with no adverts</em>',
    'lede': 'Cribbage &mdash; crib, if you play it down the pub &mdash; against the computer, right in your web browser. Every hand is counted for you, there&rsquo;s nothing to install, no sign-in and no adverts. Not one.',
    'chips': ['No adverts, ever', 'Nothing to install', 'Every hand counted'],
    'primaryCta': ['Play Cribbage free', '/games/cribbage/'], 'secondaryCta': ['All our games', '/games/'],
    'ctaHead': 'Fancy a game of crib?', 'ctaSub': 'Free against the computer, with every hand counted and no adverts, on your PC, tablet or phone. Nothing to install and no sign-in.',
    'schemaKind': 'howto',
    'atAGlance': [
        ('Price', 'Free. Nothing to buy, now or later.'),
        ('Adverts', 'None. No pop-ups between hands, no videos to sit through.'),
        ('Install or sign-in?', 'Neither. It plays in your web browser; your game is saved as you go.'),
        ('Who you play', 'Sam, the computer. Four levels, from gentle to sharp; a Hint on Easy and Normal.'),
        ('Scoring', 'Fifteens, pairs, runs, flushes, his nob and his heels &mdash; in the play and the show &mdash; all counted and pegged for you.'),
        ('Every day', 'Today&rsquo;s match: the same cards for everyone, with a Hall of Fame for the biggest win.'),
        ('And', 'A 100-level Journey, one hand a level, with three stars to win on each.'),
        ('Works on', 'A PC, laptop, tablet or phone &mdash; Windows, Mac, iPad, iPhone or Android.'),
    ],
    'sections': [
        {'eyebrow': '/01 &mdash; SEE IT IN A MINUTE', 'h2': 'Here&rsquo;s what it&rsquo;s like',
         'html': _video('cribbage', 'Cribbage from 365 Techies against the computer: the crib, pegging, every hand counted, four levels, a win and the daily match', CRB_SECS, CRB_POSTER, CRB_VIDEO,
                        CRB_TRANSCRIPT, '/games/cribbage/', 'Play Cribbage free &#8594;')},
        {'eyebrow': '/02 &mdash; NO ADVERTS', 'h2': 'Why there are no adverts, and never will be', 'html': _WHY_FREE},
        {'eyebrow': '/03 &mdash; HOW TO PLAY', 'h2': 'How to play cribbage against the computer',
         'html': '<ol><li><strong>First to 121 wins.</strong> Your score and Sam&rsquo;s are pegged on the board at the top.</li>'
                 '<li><strong>The crib:</strong> you&rsquo;re dealt six cards &mdash; tap two to put in the crib, then press the button. The crib belongs to whoever dealt and is counted for them at the end.</li>'
                 '<li><strong>The starter</strong> is turned up on the deck. If it&rsquo;s a Jack, the dealer pegs 2 (&ldquo;his heels&rdquo;).</li>'
                 '<li><strong>The play:</strong> take turns playing a card and adding up the count, which can&rsquo;t go past 31. Make 15 or 31 for 2, pair the last card for 2, or make a run. If you can&rsquo;t play, it&rsquo;s a &ldquo;Go&rdquo; &mdash; the last to play scores 1 &mdash; and the count starts again.</li>'
                 '<li><strong>The show:</strong> each hand is counted with the starter, and then the crib. It&rsquo;s all counted for you &mdash; &ldquo;fifteen two, fifteen four&hellip;&rdquo; &mdash; so you can see where every point came from.</li></ol>'},
        {'eyebrow': '/04 &mdash; SCORING', 'h2': 'Cribbage scoring at a glance',
         'html': _SCORES + '<p>You don&rsquo;t need to remember any of it to play: the game adds up every score and moves the pegs for you. But if you&rsquo;re learning, watching it count is the quickest way to pick it up.</p>'},
        {'eyebrow': '/05 &mdash; EVERY DAY', 'h2': 'Today&rsquo;s match, a Hall of Fame and a 100-level Journey',
         'html': '<ul><li><strong>Today&rsquo;s match</strong> &mdash; the same cards for everyone, at each level. Win it and you can put your initials and town in the <strong>Hall of Fame</strong>, ranked by the biggest winning margin. The whole match is replayed on our server &mdash; Sam&rsquo;s cards too &mdash; before a win counts, so the board is fair.</li>'
                 '<li><strong>Four levels</strong> &mdash; how good Sam is, from gentle to sharp. Easy and Normal have a Hint if you&rsquo;re not sure what to keep.</li>'
                 '<li><strong>The Journey</strong> &mdash; a hundred levels, one hand a level, each with three stars to win.</li>'
                 '<li><strong>Saved as you go</strong> &mdash; stop mid-game and carry on later, on the same device.</li></ul>'},
        {'eyebrow': '/06 &mdash; MORE GAMES', 'h2': 'Nine card games, all free with no adverts', 'html': _ALL_GAMES + _PLAY_TRACK},
    ],
    'howToName': 'How to play cribbage',
    'howToSteps': [
        {'name': 'Put two cards in the crib', 'text': 'You are dealt six cards. Choose two to put in the crib, which is counted for the dealer at the end of the hand.'},
        {'name': 'Turn the starter', 'text': 'The starter card is turned up. If it is a Jack, the dealer pegs 2, called his heels.'},
        {'name': 'Play your cards', 'text': 'Take turns playing a card and adding up the count, never past 31. Score 2 for 15 or 31, 2 for a pair, and points for a run. If you cannot play, say Go; the last to play scores 1.'},
        {'name': 'Count the hands', 'text': 'Count each hand with the starter: 2 for every fifteen, 2 for every pair, 1 a card for runs, 4 or 5 for a flush, and 1 for his nob. Then count the crib.'},
        {'name': 'Race to 121', 'text': 'Keep pegging. The first player to reach 121 wins.'},
    ],
    'faqs': [
        {'q': 'Can I play cribbage online free against the computer?', 'a': '<p>Yes. You play Sam, the computer, at one of four levels. It&rsquo;s free, with no adverts, nothing to download and no sign-in.</p>'},
        {'q': 'Are there really no adverts?', 'a': '<p>None at all: no pop-ups between hands, no videos to watch. We&rsquo;re 365 Techies, a family IT firm in Bournemouth &mdash; we&rsquo;re paid for looking after computers, not for showing adverts.</p>'},
        {'q': 'Do I have to count the points myself?', 'a': '<p>No. Every score in the play and the show is added up and pegged for you, and the count is shown so you can follow where the points came from.</p>'},
        {'q': 'Is crib the same as cribbage?', 'a': '<p>Yes &mdash; &ldquo;crib&rdquo; is what most people in British pubs call it. It&rsquo;s also the name of the extra hand the dealer scores at the end of each deal.</p>'},
        {'q': 'Do I need to download anything?', 'a': '<p>No. It plays in your web browser on a PC, laptop, tablet or phone. It&rsquo;s also in the Games menu of our free Windows app, 365 PC Manager.</p>'},
        {'q': 'How good is the computer?', 'a': '<p>You choose: four levels, from a gentle Sam who&rsquo;s easy to beat to a sharp one. Easy and Normal have a Hint if you&rsquo;re unsure which cards to keep.</p>'},
        {'q': 'Can I play against a friend?', 'a': '<p>Not yet &mdash; this is you against the computer. But Today&rsquo;s match is the same cards for everyone, so you can compare scores with friends in the Hall of Fame.</p>'},
        {'q': 'What is the Hall of Fame?', 'a': '<p>Win Today&rsquo;s match and you can put your initials and town on the board, ranked by the biggest winning margin &mdash; only if you choose to. The whole match is replayed on our server before it counts.</p>'},
    ],
    'crossLinksHtml': '<p>More free games: <a href="/play-patience-online-free/">Patience</a>, <a href="/play-hearts-online-free/">Hearts</a>, <a href="/play-gin-rummy-online-free/">Gin Rummy</a>, <a href="/play-whist-online-free/">Whist</a> and <a href="/games/">all our games</a>. Computer playing up? <a href="/remote-support/">Remote help</a> from 365 Techies.</p>',
}


# ============================================================ FreeCell (9 Oct 2026; owner: "do FreeCell and Hearts pages next")
# UK autocomplete: "freecell online free no ads", "freecell online free no sign up", "free freecell no ads",
# "freecell windows xp / 7 / 11" (people after the Windows one). Facts: games/freecell/freecell.js LV + help; deals made
# with Microsoft's own formula (engine.js: 214013 / 2531011), so the deal numbers match Windows FreeCell.
FC_VIDEO = "/images/games-freecell-video-v1.mp4"
FC_POSTER = "/images/games-freecell-poster-v1.webp"
FC_SECS = 60
FC_TRANSCRIPT = ("This is FreeCell, from 365 Techies. It&rsquo;s free, there&rsquo;s nothing to install, and there are no adverts. "
                 "Every card is face up from the start, so you can plan ahead. And the deal numbers are the same as the FreeCell that came with Windows. "
                 "The four free cells each hold a card while you get it out of the way. Tap a card or drag it, and press Hint if you&rsquo;re stuck. "
                 "Easy has a Hint, Normal doesn&rsquo;t, and Hard and Expert give you fewer free cells. "
                 "Your game is saved as you go, so you can stop and carry on later, on your PC, your tablet or your phone. And when you win, the cards take a bow. "
                 "There&rsquo;s a new deal every day, the same cards for everyone, with a Hall of Fame, a three-minute sprint, and a hundred-level Journey. "
                 "Play free at 365techies.co.uk. No adverts. No sign-up. Just the cards.")

FC = {
    'slug': 'play-freecell-online-free',
    'title': 'Play FreeCell Online Free, No Adverts | 365 Techies',
    'metaDesc': 'Play FreeCell online free: every card face up, the same deals as Windows FreeCell, no adverts, nothing to download, no sign-in. A new deal every day.',
    'ogTitle': 'Play FreeCell online free - the Windows deals, no adverts',
    'crumbName': 'Play FreeCell Online Free',
    'eyebrow': '// FREE FREECELL',
    'h1': 'Play FreeCell online, <em class="grad grad--cyan">free and with no adverts</em>',
    'lede': 'FreeCell with big, clear cards and the same deals as the one that came with Windows &mdash; right in your web browser. It&rsquo;s free, there&rsquo;s nothing to install, no sign-in, and no adverts. Not one.',
    'chips': ['No adverts, ever', 'Nothing to install', 'The Windows deals'],
    'primaryCta': ['Play FreeCell free', '/games/freecell/'], 'secondaryCta': ['All our games', '/games/'],
    'ctaHead': 'Fancy a game of FreeCell?', 'ctaSub': 'Free, with every card face up and no adverts, on your PC, tablet or phone. Nothing to install and no sign-in.',
    'schemaKind': 'howto',
    'atAGlance': [
        ('Price', 'Free. Nothing to buy, now or later.'),
        ('Adverts', 'None. No pop-ups between games, no videos to sit through.'),
        ('Install or sign-in?', 'Neither. It plays in your web browser; your game and scores are saved as you go.'),
        ('The deals', 'Made the same way as Windows FreeCell, so deal 1 here is deal 1 there. Almost every deal can be won.'),
        ('Levels', 'Easy (four free cells, Hint), Normal (no Hint), Hard (three free cells), Expert (two, no Undo).'),
        ('Help when stuck', 'Hint on Easy; Undo as often as you like on every level but Expert.'),
        ('Every day', 'Today&rsquo;s deal, the same cards for everyone, with a Hall of Fame for the fastest wins, and a 3-minute sprint.'),
        ('Works on', 'A PC, laptop, tablet or phone &mdash; Windows, Mac, iPad, iPhone or Android.'),
    ],
    'sections': [
        {'eyebrow': '/01 &mdash; SEE IT IN A MINUTE', 'h2': 'Here&rsquo;s what it&rsquo;s like',
         'html': _video('freecell', 'FreeCell from 365 Techies: every card face up, the free cells, Hint, the four levels, a win and the daily deal', FC_SECS, FC_POSTER, FC_VIDEO,
                        FC_TRANSCRIPT, '/games/freecell/', 'Play FreeCell free &#8594;')},
        {'eyebrow': '/02 &mdash; NO ADVERTS', 'h2': 'Why there are no adverts, and never will be', 'html': _WHY_FREE},
        {'eyebrow': '/03 &mdash; HOW TO PLAY', 'h2': 'How to play FreeCell',
         'html': '<ol><li><strong>The aim:</strong> build four piles at the top right, one for each suit, from Ace up to King.</li>'
                 '<li><strong>Every card is face up</strong> from the start, so you can plan ahead &mdash; almost every deal can be won.</li>'
                 '<li><strong>In the eight columns,</strong> put each card on one a step higher and the other colour &mdash; a red 6 on a black 7.</li>'
                 '<li><strong>The four free cells</strong> at the top left each hold one card while you get it out of the way.</li>'
                 '<li><strong>Any card</strong> can go in an empty column, and several cards in order move together when there&rsquo;s room.</li>'
                 '<li><strong>Tap a card</strong> and it goes to the best place for it &mdash; a free cell if nothing else fits. Dragging works too.</li></ol>'
                 '<p>Prefer the keyboard? The arrow keys choose a card and Enter plays it; N is a new game, U undo, H hint and F full screen.</p>'},
        {'eyebrow': '/04 &mdash; LIKE WINDOWS', 'h2': 'The same FreeCell deals as Windows',
         'html': '<p>FreeCell came with Windows for years, and lots of people still miss it. Our deals are made with the same formula Microsoft used, so <strong>deal 1 here is deal 1 in Windows FreeCell</strong>, and so on through the numbers &mdash; the same game you remember, with bigger cards and no adverts.</p>'
                 '<ul><li><strong>Easy</strong> &mdash; four free cells, with Undo and Hint.</li>'
                 '<li><strong>Normal</strong> &mdash; four free cells, with Undo but no Hint.</li>'
                 '<li><strong>Hard</strong> &mdash; only three free cells, no Hint.</li>'
                 '<li><strong>Expert</strong> &mdash; only two free cells, with no Undo or Hint. Harder levels score more.</li></ul>'},
        {'eyebrow': '/05 &mdash; EVERY DAY', 'h2': 'A daily deal, a Hall of Fame and a 3-minute sprint',
         'html': '<ul><li><strong>Today&rsquo;s deal</strong> &mdash; the same cards for everyone, at each level. Win it and you can put your initials and town in the <strong>Hall of Fame</strong> for the fastest win. Every win is replayed move by move on our server before it counts, so the board is fair.</li>'
                 '<li><strong>The 3-minute sprint</strong> &mdash; how many cards can you get up to the piles in three minutes? Send the link to a friend and see if they can beat you.</li>'
                 '<li><strong>The Journey</strong> &mdash; a hundred levels, each with three stars to win.</li>'
                 '<li><strong>My scores</strong> &mdash; wins, best times and your streak, kept in your browser. To carry them to another device, use <em>Keep my scores</em>.</li></ul>'},
        {'eyebrow': '/06 &mdash; MORE GAMES', 'h2': 'Nine card games, all free with no adverts', 'html': _ALL_GAMES + _PLAY_TRACK},
    ],
    'howToName': 'How to play FreeCell',
    'howToSteps': [
        {'name': 'Start a game', 'text': 'Open FreeCell in your web browser and press Play. Every card is dealt face up into eight columns.'},
        {'name': 'Build down the columns', 'text': 'Put each card on one a step higher and the other colour, such as a red 6 on a black 7.'},
        {'name': 'Use the free cells', 'text': 'Each of the four free cells at the top left holds one card while you get it out of the way.'},
        {'name': 'Build the four piles', 'text': 'Move each Ace to the piles at the top right and build each suit up to the King. Any card can go in an empty column.'},
        {'name': 'Use Hint and Undo', 'text': 'Stuck? Press Hint on Easy and the next move lights up. Undo takes back as many moves as you like, on every level but Expert.'},
    ],
    'faqs': [
        {'q': 'Is this FreeCell really free?', 'a': '<p>Yes. There&rsquo;s nothing to buy and nothing to sign up for. It&rsquo;s made by 365 Techies, a family IT firm in Bournemouth.</p>'},
        {'q': 'Are there really no adverts?', 'a': '<p>None at all: no pop-ups between games, no videos to watch. We&rsquo;re paid for looking after computers, not for showing adverts.</p>'},
        {'q': 'Is it the same as Windows FreeCell?', 'a': '<p>The same rules, and the deals are made with the same formula Microsoft used, so each deal number matches Windows FreeCell. The cards are bigger, and there are no adverts.</p>'},
        {'q': 'Can every FreeCell game be won?', 'a': '<p>Almost every deal can, with four free cells &mdash; that&rsquo;s the beauty of FreeCell. With fewer free cells, on Hard and Expert, it&rsquo;s much harder.</p>'},
        {'q': 'Do I need to download or install anything?', 'a': '<p>No. It plays in your web browser on a PC, laptop, tablet or phone. If you use our free Windows app, 365 PC Manager, it&rsquo;s in its Games menu too.</p>'},
        {'q': 'Can I undo a move?', 'a': '<p>Yes, as many as you like, on every level except Expert.</p>'},
        {'q': 'What is the Hall of Fame?', 'a': '<p>Win Today&rsquo;s deal and you can put your initials and town on the board for the fastest win that day &mdash; only if you choose to. Every win is checked by replaying it on our server.</p>'},
        {'q': 'Will my game be saved?', 'a': '<p>Yes, as you go, in your web browser, so you can stop and carry on later. Your scores are kept there too.</p>'},
    ],
    'crossLinksHtml': '<p>More free games: <a href="/play-patience-online-free/">Patience</a>, <a href="/play-hearts-online-free/">Hearts</a>, <a href="/games/spider/">Spider</a> and <a href="/games/">all our games</a>. Computer playing up? <a href="/remote-support/">Remote help</a> from 365 Techies.</p>',
}

# ============================================================ Hearts (9 Oct 2026)
# UK autocomplete: "hearts card game classic free", "hearts card game free online no download", "free hearts no ads",
# "hearts no ads", "play hearts online against computer", "hearts windows xp / 7". Facts: games/hearts help + engine.js
# (players You, Sam, Jo, Alex; pass left/right/across/none; to 100, lowest wins; shooting the moon); games-hof.php
# (Today's match, ranked by the lowest winning score, the whole match replayed).
HE_VIDEO = "/images/games-hearts-video-v1.mp4"
HE_POSTER = "/images/games-hearts-poster-v1.webp"
HE_SECS = 75
HE_TRANSCRIPT = ("This is Hearts, the classic card game, from 365 Techies. It&rsquo;s free, there&rsquo;s nothing to install, and there are no adverts. "
                 "You play against Sam, Jo and Alex. Before each hand, pass three cards. Then follow suit, and try not to take any hearts, or the Queen of spades. "
                 "Cards you can&rsquo;t play are dimmed, so you can&rsquo;t go wrong. There are four levels, with a Hint on the easier two. And you can slow the others down, if you like to watch. "
                 "Your game is saved as you go, so you can stop and carry on later, on your PC, your tablet or your phone. When someone reaches a hundred, the lowest score wins. "
                 "Play today&rsquo;s match, the same cards for everyone, and get your initials into the Hall of Fame. Free at 365techies.co.uk.")

HE = {
    'slug': 'play-hearts-online-free',
    'title': 'Free Hearts Card Game Online, No Adverts | 365 Techies',
    'metaDesc': 'Play the classic Hearts card game online free against the computer: no adverts, nothing to download, no sign-in. Four levels, a Hint and a daily match.',
    'ogTitle': 'Play Hearts online free - the classic card game, no adverts',
    'crumbName': 'Play Hearts Online Free',
    'eyebrow': '// FREE HEARTS CARD GAME',
    'h1': 'Play Hearts online, <em class="grad grad--cyan">free and with no adverts</em>',
    'lede': 'The classic Hearts card game &mdash; the one that came with Windows &mdash; against three computer players, right in your web browser. Free, nothing to install, no sign-in, and no adverts. Not one.',
    'chips': ['No adverts, ever', 'Nothing to install', 'Against the computer'],
    'primaryCta': ['Play Hearts free', '/games/hearts/'], 'secondaryCta': ['All our games', '/games/'],
    'ctaHead': 'Fancy a game of Hearts?', 'ctaSub': 'Free against three computer players, with no adverts, on your PC, tablet or phone. Nothing to install and no sign-in.',
    'schemaKind': 'howto',
    'atAGlance': [
        ('Price', 'Free. Nothing to buy, now or later.'),
        ('Adverts', 'None. No pop-ups between hands, no videos to sit through.'),
        ('Install or sign-in?', 'Neither. It plays in your web browser; your game is saved as you go.'),
        ('Who you play', 'Sam, Jo and Alex, the computer. Four levels; a Hint on Easy and Normal.'),
        ('The rules', 'Pass three cards, follow suit, dodge the hearts and the Queen of spades. Lowest score at 100 wins.'),
        ('Can&rsquo;t go wrong', 'Cards you can&rsquo;t play are dimmed, and tapping one tells you why.'),
        ('Every day', 'Today&rsquo;s match: the same cards for everyone, with a Hall of Fame for the lowest winning score.'),
        ('And', 'A 100-level Journey, one hand a level, and the others can play slower if you like to watch.'),
    ],
    'sections': [
        {'eyebrow': '/01 &mdash; SEE IT IN A MINUTE', 'h2': 'Here&rsquo;s what it&rsquo;s like',
         'html': _video('hearts', 'Hearts from 365 Techies against three computer players: passing, following suit, the scores each hand, a win and the daily match', HE_SECS, HE_POSTER, HE_VIDEO,
                        HE_TRANSCRIPT, '/games/hearts/', 'Play Hearts free &#8594;')},
        {'eyebrow': '/02 &mdash; NO ADVERTS', 'h2': 'Why there are no adverts, and never will be', 'html': _WHY_FREE},
        {'eyebrow': '/03 &mdash; HOW TO PLAY', 'h2': 'How to play Hearts',
         'html': '<ol><li><strong>Score as few points as you can.</strong> Every heart you take is 1 point and the Queen of spades is 13. The match ends when someone reaches 100 &mdash; the lowest score wins.</li>'
                 '<li><strong>Pass three cards</strong> before each hand: tap three, then Pass. The passing goes left, then right, then across, then a hand with no passing. Cards passed to you glow.</li>'
                 '<li><strong>Tricks:</strong> the 2 of clubs starts. Everyone plays one card, and you must follow suit if you can. The highest card of the suit led takes the trick (Ace is high) and leads the next one.</li>'
                 '<li><strong>Hearts can&rsquo;t be led</strong> until one has been played on a trick, and no points go on the very first trick.</li>'
                 '<li><strong>Shooting the moon:</strong> take <em>all</em> the hearts and the Queen and you score nothing &mdash; everyone else gets 26.</li></ol>'
                 '<p>Cards you can&rsquo;t play are dimmed &mdash; tap one and you&rsquo;ll be told why. Prefer the keyboard? The arrow keys choose a card and Enter plays it; Tab reaches the buttons.</p>'},
        {'eyebrow': '/04 &mdash; YOUR PACE', 'h2': 'Four levels, and the others play at your pace',
         'html': '<ul><li><strong>Four levels</strong> &mdash; how good Sam, Jo and Alex are. Easy and Normal have a Hint if you&rsquo;re not sure what to pass or play.</li>'
                 '<li><strong>Slow them down</strong> &mdash; Settings &gt; How fast the others play, if you like to watch every card.</li>'
                 '<li><strong>The scores after every hand</strong>, and the running totals, so you always know who&rsquo;s heading for 100.</li>'
                 '<li><strong>Saved as you go</strong> &mdash; stop mid-match and carry on later, on the same device.</li></ul>'},
        {'eyebrow': '/05 &mdash; EVERY DAY', 'h2': 'Today&rsquo;s match, a Hall of Fame and a 100-level Journey',
         'html': '<ul><li><strong>Today&rsquo;s match</strong> &mdash; the same cards for everyone, at each level. Win it and you can put your initials and town in the <strong>Hall of Fame</strong>, ranked by the lowest winning score. The whole match is replayed on our server &mdash; the computer players&rsquo; cards too &mdash; before a win counts.</li>'
                 '<li><strong>The Journey</strong> &mdash; a hundred levels, one hand a level, each with three stars to win.</li></ul>'},
        {'eyebrow': '/06 &mdash; MORE GAMES', 'h2': 'Nine card games, all free with no adverts', 'html': _ALL_GAMES + _PLAY_TRACK},
    ],
    'howToName': 'How to play Hearts',
    'howToSteps': [
        {'name': 'Pass three cards', 'text': 'Before each hand, choose three cards to pass: left, then right, then across, then a hand with no passing.'},
        {'name': 'Lead the 2 of clubs', 'text': 'Whoever has the 2 of clubs starts the first trick.'},
        {'name': 'Follow suit', 'text': 'Everyone plays one card and must follow the suit led if they can. The highest card of that suit takes the trick and leads next.'},
        {'name': 'Dodge the points', 'text': 'Each heart you take is 1 point and the Queen of spades is 13. Hearts cannot be led until one has been played.'},
        {'name': 'Finish at 100', 'text': 'Keep playing hands until someone reaches 100. The lowest score wins. Take every heart and the Queen to shoot the moon.'},
    ],
    'faqs': [
        {'q': 'Can I play Hearts online free against the computer?', 'a': '<p>Yes. You play Sam, Jo and Alex, the computer, at one of four levels. It&rsquo;s free, with no adverts, nothing to download and no sign-in.</p>'},
        {'q': 'Are there really no adverts?', 'a': '<p>None at all: no pop-ups between hands, no videos to watch. We&rsquo;re 365 Techies, a family IT firm in Bournemouth &mdash; paid for looking after computers, not for showing adverts.</p>'},
        {'q': 'Is it like the Hearts that came with Windows?', 'a': '<p>Yes, the same classic rules: pass three cards, follow suit, dodge the hearts and the Queen of spades, and the lowest score when someone reaches 100 wins. Shooting the moon is in too.</p>'},
        {'q': 'What is shooting the moon?', 'a': '<p>Taking every heart <em>and</em> the Queen of spades in one hand. Pull it off and you score nothing for that hand while everyone else gets 26.</p>'},
        {'q': 'Do I need to download anything?', 'a': '<p>No. It plays in your web browser on a PC, laptop, tablet or phone. It&rsquo;s also in the Games menu of our free Windows app, 365 PC Manager.</p>'},
        {'q': 'The computer plays too fast for me. Can I slow it down?', 'a': '<p>Yes: Settings &gt; How fast the others play.</p>'},
        {'q': 'Can I play against friends?', 'a': '<p>Not yet &mdash; this is you against the computer. But Today&rsquo;s match is the same cards for everyone, so you can compare scores in the Hall of Fame.</p>'},
        {'q': 'What is the Hall of Fame?', 'a': '<p>Win Today&rsquo;s match and you can put your initials and town on the board, ranked by the lowest winning score &mdash; only if you choose to. The whole match is replayed on our server before it counts.</p>'},
    ],
    'crossLinksHtml': '<p>More free games: <a href="/play-cribbage-online-free/">Cribbage</a>, <a href="/play-freecell-online-free/">FreeCell</a>, <a href="/play-gin-rummy-online-free/">Gin Rummy</a>, <a href="/play-whist-online-free/">Whist</a> and <a href="/games/">all our games</a>. Computer playing up? <a href="/remote-support/">Remote help</a> from 365 Techies.</p>',
}


# ============================================================ Gin Rummy (9 Oct 2026; owner: "do Gin Rummy and Whist pages next")
# UK autocomplete: "gin rummy online free against computer", "play gin rummy online free without registration",
# "gin rummy free online no download", "gin rummy no ads free", "best free gin rummy no ads". Facts: games/gin help +
# engine.js (Sam; knock at 10 or less, undercut +25, gin +25, first to 100, a draw at two cards left); games-hof.php
# (Today's match, ranked by the biggest winning margin, the whole match replayed).
GN_VIDEO = "/images/games-gin-video-v1.mp4"
GN_POSTER = "/images/games-gin-poster-v1.webp"
GN_SECS = 81
GN_TRANSCRIPT = ("This is Gin Rummy, from 365 Techies. It&rsquo;s free, there&rsquo;s nothing to install, and there are no adverts. "
                 "You play against Sam, the computer. Take a card from the deck or the discard pile, then throw one away. "
                 "Your hand is sorted into melds for you, and your deadwood is counted, so you always know where you stand. "
                 "Knock when your deadwood is ten or less, or go Gin with none at all, for a 25-point bonus. "
                 "There are four levels, from a gentle Sam to a sharp one, with a Hint on the easier two. "
                 "Your game is saved as you go, so you can stop and carry on later, on your PC, your tablet or your phone. First to a hundred wins. "
                 "Play today&rsquo;s match, the same cards for everyone, and get your initials into the Hall of Fame. Free at 365techies.co.uk.")

_GN_SCORES = ('<div class="cmp-wrap" tabindex="0" role="group" aria-label="Gin Rummy scores (scrolls sideways on a small screen)"><table class="cmp-table">'
              '<thead><tr><th>What happens</th><th>Score</th></tr></thead><tbody>'
              '<tr><td>Deadwood (cards in no meld)</td><td>Ace 1, 2 to 10 their number, picture cards 10</td></tr>'
              '<tr><td>You knock (deadwood 10 or less)</td><td>The difference between the two deadwoods</td></tr>'
              '<tr><td>Undercut (their deadwood is as low as yours)</td><td>They score the difference, and 25 more</td></tr>'
              '<tr><td>Gin (no deadwood at all)</td><td>Their deadwood, and 25 &mdash; nothing can be laid off</td></tr>'
              '<tr><td>The match</td><td>First to 100 wins</td></tr>'
              '</tbody></table></div>')

GN = {
    'slug': 'play-gin-rummy-online-free',
    'title': 'Play Gin Rummy Online Free, No Adverts | 365 Techies',
    'metaDesc': 'Play Gin Rummy online free against the computer: no adverts, no download, no registration. Your hand sorted and your deadwood counted for you.',
    'ogTitle': 'Play Gin Rummy online free - against the computer, no adverts',
    'crumbName': 'Play Gin Rummy Online Free',
    'eyebrow': '// FREE GIN RUMMY',
    'h1': 'Play Gin Rummy online, <em class="grad grad--cyan">free and with no adverts</em>',
    'lede': 'Gin Rummy against the computer, right in your web browser &mdash; your hand sorted into melds and your deadwood counted for you. Free, nothing to install, no registration and no adverts. Not one.',
    'chips': ['No adverts, ever', 'No registration', 'Deadwood counted for you'],
    'primaryCta': ['Play Gin Rummy free', '/games/gin/'], 'secondaryCta': ['All our games', '/games/'],
    'ctaHead': 'Fancy a game of Gin?', 'ctaSub': 'Free against the computer, with your hand sorted for you and no adverts, on your PC, tablet or phone. Nothing to install and no registration.',
    'schemaKind': 'howto',
    'atAGlance': [
        ('Price', 'Free. Nothing to buy, now or later.'),
        ('Adverts', 'None. No pop-ups between hands, no videos to sit through.'),
        ('Install or register?', 'Neither. It plays in your web browser; your game is saved as you go.'),
        ('Who you play', 'Sam, the computer. Four levels, from gentle to sharp; a Hint on Easy and Normal.'),
        ('Made easy', 'Your hand is laid out for you &mdash; melds first, then the loose cards &mdash; and your deadwood is counted under your name.'),
        ('Scoring', 'Knock at 10 or less, go Gin with none; undercuts and Gin score 25 extra. First to 100 wins.'),
        ('Every day', 'Today&rsquo;s match: the same cards for everyone, with a Hall of Fame for the biggest win.'),
        ('Works on', 'A PC, laptop, tablet or phone &mdash; Windows, Mac, iPad, iPhone or Android.'),
    ],
    'sections': [
        {'eyebrow': '/01 &mdash; SEE IT IN A MINUTE', 'h2': 'Here&rsquo;s what it&rsquo;s like',
         'html': _video('gin', 'Gin Rummy from 365 Techies against the computer: taking and discarding, your hand sorted into melds, deadwood counted, knocking, a win and the daily match', GN_SECS, GN_POSTER, GN_VIDEO,
                        GN_TRANSCRIPT, '/games/gin/', 'Play Gin Rummy free &#8594;')},
        {'eyebrow': '/02 &mdash; NO ADVERTS', 'h2': 'Why there are no adverts, and never will be', 'html': _WHY_FREE},
        {'eyebrow': '/03 &mdash; HOW TO PLAY', 'h2': 'How to play Gin Rummy against the computer',
         'html': '<ol><li><strong>Make melds:</strong> three or four of a kind (7 7 7), or three or more in a row in one suit (4 5 6 of hearts). Ace is low: A 2 3 is a run, Q K A isn&rsquo;t. Your hand is laid out for you &mdash; melds first, then the loose cards.</li>'
                 '<li><strong>Your turn:</strong> take a card &mdash; tap the deck, or the face-up card on the discard pile &mdash; then tap one of yours to throw it away.</li>'
                 '<li><strong>Deadwood</strong> is the cards in no meld. It&rsquo;s counted for you under your name.</li>'
                 '<li><strong>Knock</strong> when your deadwood is 10 or less (the button appears): both hands go down, the other player lays off what they can on your melds, and you score the difference.</li>'
                 '<li><strong>Gin</strong> is no deadwood at all: you score the other hand&rsquo;s deadwood and 25, and nothing can be laid off.</li>'
                 '<li><strong>First to 100</strong> wins the match. If the deck runs down to two cards, the hand is a draw.</li></ol>'},
        {'eyebrow': '/04 &mdash; SCORING', 'h2': 'Gin Rummy scoring at a glance',
         'html': _GN_SCORES + '<p>You don&rsquo;t need to work any of it out: the game counts the deadwood, lays off the cards and adds up the scores for you.</p>'},
        {'eyebrow': '/05 &mdash; EVERY DAY', 'h2': 'Today&rsquo;s match, a Hall of Fame and a 100-level Journey',
         'html': '<ul><li><strong>Today&rsquo;s match</strong> &mdash; the same cards for everyone, at each level. Win it and you can put your initials and town in the <strong>Hall of Fame</strong>, ranked by the biggest winning margin. The whole match is replayed on our server &mdash; Sam&rsquo;s cards too &mdash; before a win counts.</li>'
                 '<li><strong>Four levels</strong> &mdash; how good Sam is, from gentle to sharp. Easy and Normal have a Hint if you&rsquo;re not sure what to keep.</li>'
                 '<li><strong>The Journey</strong> &mdash; a hundred levels, one hand a level, each with three stars to win.</li>'
                 '<li><strong>Saved as you go</strong> &mdash; stop mid-match and carry on later, on the same device.</li></ul>'},
        {'eyebrow': '/06 &mdash; MORE GAMES', 'h2': 'Nine card games, all free with no adverts', 'html': _ALL_GAMES + _PLAY_TRACK},
    ],
    'howToName': 'How to play Gin Rummy',
    'howToSteps': [
        {'name': 'Make melds', 'text': 'Collect three or four of a kind, or three or more cards in a row in one suit. Ace is low.'},
        {'name': 'Take a card and throw one away', 'text': 'On your turn, take the top card of the deck or the face-up card on the discard pile, then discard one of yours.'},
        {'name': 'Keep your deadwood low', 'text': 'Deadwood is the cards in no meld: Ace 1, 2 to 10 their number, picture cards 10.'},
        {'name': 'Knock or go Gin', 'text': 'Knock when your deadwood is 10 or less and score the difference, or go Gin with no deadwood for the other hand&rsquo;s deadwood and 25.'},
        {'name': 'Race to 100', 'text': 'Keep playing hands. The first player to reach 100 wins the match.'},
    ],
    'faqs': [
        {'q': 'Can I play Gin Rummy online free against the computer?', 'a': '<p>Yes. You play Sam, the computer, at one of four levels. It&rsquo;s free, with no adverts, nothing to download and no registration.</p>'},
        {'q': 'Are there really no adverts?', 'a': '<p>None at all: no pop-ups between hands, no videos to watch. We&rsquo;re 365 Techies, a family IT firm in Bournemouth &mdash; paid for looking after computers, not for showing adverts.</p>'},
        {'q': 'Do I need to register or download anything?', 'a': '<p>No. It plays in your web browser on a PC, laptop, tablet or phone. It&rsquo;s also in the Games menu of our free Windows app, 365 PC Manager.</p>'},
        {'q': 'What is deadwood?', 'a': '<p>The cards in your hand that aren&rsquo;t part of a meld. Aces count 1, number cards their number and picture cards 10. The game counts yours for you.</p>'},
        {'q': 'What is an undercut?', 'a': '<p>When you knock but the other player&rsquo;s deadwood is as low as yours, or lower. They score the difference, and 25 more.</p>'},
        {'q': 'What is the difference between Gin Rummy and Rummy?', 'a': '<p>In Gin Rummy you don&rsquo;t lay melds down as you go: you keep them in your hand until someone knocks or goes Gin, and the deadwood decides the score.</p>'},
        {'q': 'Can I play against friends?', 'a': '<p>Not yet &mdash; this is you against the computer. But Today&rsquo;s match is the same cards for everyone, so you can compare scores in the Hall of Fame.</p>'},
        {'q': 'What is the Hall of Fame?', 'a': '<p>Win Today&rsquo;s match and you can put your initials and town on the board, ranked by the biggest winning margin &mdash; only if you choose to. The whole match is replayed on our server before it counts.</p>'},
    ],
    'crossLinksHtml': '<p>More free games: <a href="/play-cribbage-online-free/">Cribbage</a>, <a href="/play-whist-online-free/">Whist</a>, <a href="/play-hearts-online-free/">Hearts</a> and <a href="/games/">all our games</a>. Computer playing up? <a href="/remote-support/">Remote help</a> from 365 Techies.</p>',
}

# ============================================================ Whist (9 Oct 2026)
# UK autocomplete: "whist online free no download", "whist card game online free no download", "play whist against
# computer", "whist card game rules". (Solo whist and knockout whist are other games - not targeted.) Facts: games/whist
# help + engine.js (partner Jo vs Sam and Alex; trumps = the dealer's last card; tricks over six; 5 points a game, two
# games the rubber); games-hof.php (Today's match, ranked by the fewest hands to win the rubber).
WH_VIDEO = "/images/games-whist-video-v1.mp4"
WH_POSTER = "/images/games-whist-poster-v1.webp"
WH_SECS = 79
WH_TRANSCRIPT = ("This is Whist, the classic card game, from 365 Techies. It&rsquo;s free, there&rsquo;s nothing to install, and there are no adverts. "
                 "You and your partner Jo play against Sam and Alex. The last card dealt sets trumps, and the marker always shows them. "
                 "Follow suit if you can. If you can&rsquo;t, a trump wins the trick. Win more than six tricks together to score. "
                 "There are four levels, with a Hint on the easier two. "
                 "Your game is saved as you go, so you can stop and carry on later, on your PC, your tablet or your phone. First to five points wins a game, and two games win the rubber. "
                 "Play today&rsquo;s match, the same cards for everyone, and get your initials into the Hall of Fame. Free at 365techies.co.uk.")

WH = {
    'slug': 'play-whist-online-free',
    'title': 'Play Whist Card Game Online Free, No Adverts | 365 Techies',
    'metaDesc': 'Play the classic Whist card game online free with a computer partner against two computer players: no adverts, nothing to download, no sign-in.',
    'ogTitle': 'Play Whist online free - the classic card game, no adverts',
    'crumbName': 'Play Whist Online Free',
    'eyebrow': '// FREE WHIST CARD GAME',
    'h1': 'Play Whist online, <em class="grad grad--cyan">free and with no adverts</em>',
    'lede': 'Classic whist &mdash; you and your partner Jo against Sam and Alex &mdash; right in your web browser. Free, nothing to install, no sign-in and no adverts. Not one.',
    'chips': ['No adverts, ever', 'Nothing to install', 'A computer partner'],
    'primaryCta': ['Play Whist free', '/games/whist/'], 'secondaryCta': ['All our games', '/games/'],
    'ctaHead': 'Fancy a rubber of whist?', 'ctaSub': 'Free with a computer partner against two computer players, and no adverts, on your PC, tablet or phone. Nothing to install and no sign-in.',
    'schemaKind': 'howto',
    'atAGlance': [
        ('Price', 'Free. Nothing to buy, now or later.'),
        ('Adverts', 'None. No pop-ups between hands, no videos to sit through.'),
        ('Install or sign-in?', 'Neither. It plays in your web browser; your game is saved as you go.'),
        ('Who you play', 'You and your partner Jo against Sam and Alex &mdash; all three played by the computer. Four levels; a Hint on Easy and Normal.'),
        ('Trumps', 'The dealer&rsquo;s last card sets trumps for the hand, and the marker always shows them.'),
        ('Scoring', 'A point for each trick over six. First to 5 points wins a game; two games win the rubber.'),
        ('Every day', 'Today&rsquo;s match: the same cards for everyone, with a Hall of Fame for the fewest hands to win the rubber.'),
        ('Works on', 'A PC, laptop, tablet or phone &mdash; Windows, Mac, iPad, iPhone or Android.'),
    ],
    'sections': [
        {'eyebrow': '/01 &mdash; SEE IT IN A MINUTE', 'h2': 'Here&rsquo;s what it&rsquo;s like',
         'html': _video('whist', 'Whist from 365 Techies with a computer partner: trumps, following suit, winning tricks together, a won rubber and the daily match', WH_SECS, WH_POSTER, WH_VIDEO,
                        WH_TRANSCRIPT, '/games/whist/', 'Play Whist free &#8594;')},
        {'eyebrow': '/02 &mdash; NO ADVERTS', 'h2': 'Why there are no adverts, and never will be', 'html': _WHY_FREE},
        {'eyebrow': '/03 &mdash; HOW TO PLAY', 'h2': 'How to play whist',
         'html': '<ol><li><strong>Partners:</strong> you and Jo (across the table) play against Sam and Alex. Win tricks together.</li>'
                 '<li><strong>Trumps:</strong> the dealer&rsquo;s last card is shown to everyone, and its suit is trumps for the hand. The marker at the top left always says what trumps are.</li>'
                 '<li><strong>Tricks:</strong> everyone plays one card. You must follow suit if you can; if you can&rsquo;t, play any card &mdash; a trump wins the trick unless a higher trump beats it. Otherwise the highest card of the suit led wins (Ace is high).</li>'
                 '<li><strong>Scoring:</strong> after 13 tricks, the side with more than six scores a point for each trick over six. First to 5 points wins a game; two games win the rubber.</li></ol>'},
        {'eyebrow': '/04 &mdash; OLD TIPS', 'h2': 'The old whist tips, still worth knowing',
         'html': '<ul><li><strong>Second hand plays low,</strong> third hand plays high.</li>'
                 '<li><strong>Don&rsquo;t trump your partner&rsquo;s winning card.</strong></li>'
                 '<li><strong>Lead back the suit your partner led.</strong></li></ul>'
                 '<p>Not sure? On Easy and Normal, press Hint and the card to play lights up. And the levels set how good all three others are &mdash; your partner too.</p>'},
        {'eyebrow': '/05 &mdash; EVERY DAY', 'h2': 'Today&rsquo;s match, a Hall of Fame and a 100-level Journey',
         'html': '<ul><li><strong>Today&rsquo;s match</strong> &mdash; the same cards for everyone, at each level. Win the rubber and you can put your initials and town in the <strong>Hall of Fame</strong>, ranked by the fewest hands. The whole match is replayed on our server &mdash; the computer players&rsquo; cards too &mdash; before a win counts.</li>'
                 '<li><strong>The Journey</strong> &mdash; a hundred levels, one hand a level, each with three stars to win.</li>'
                 '<li><strong>Saved as you go</strong> &mdash; stop mid-rubber and carry on later, on the same device.</li></ul>'},
        {'eyebrow': '/06 &mdash; MORE GAMES', 'h2': 'Nine card games, all free with no adverts', 'html': _ALL_GAMES + _PLAY_TRACK},
    ],
    'howToName': 'How to play whist',
    'howToSteps': [
        {'name': 'Sit with your partner', 'text': 'You and your partner sit opposite each other and play against the other two. Win tricks together.'},
        {'name': 'See what trumps are', 'text': 'The dealer&rsquo;s last card is turned up for everyone; its suit is trumps for the hand.'},
        {'name': 'Follow suit', 'text': 'Everyone plays one card and must follow the suit led if they can. If not, any card can be played, and a trump wins.'},
        {'name': 'Win the trick', 'text': 'The highest trump, or else the highest card of the suit led, wins the trick. Ace is high.'},
        {'name': 'Score the hand', 'text': 'After 13 tricks, the side with more than six scores a point for each trick over six. First to 5 points wins a game; two games win the rubber.'},
    ],
    'faqs': [
        {'q': 'Can I play whist online free against the computer?', 'a': '<p>Yes. You and your partner Jo play against Sam and Alex, all three played by the computer. It&rsquo;s free, with no adverts, nothing to download and no sign-in.</p>'},
        {'q': 'Are there really no adverts?', 'a': '<p>None at all: no pop-ups between hands, no videos to watch. We&rsquo;re 365 Techies, a family IT firm in Bournemouth &mdash; paid for looking after computers, not for showing adverts.</p>'},
        {'q': 'Do I need to download anything?', 'a': '<p>No. It plays in your web browser on a PC, laptop, tablet or phone. It&rsquo;s also in the Games menu of our free Windows app, 365 PC Manager.</p>'},
        {'q': 'Which whist is this?', 'a': '<p>Classic whist: four players in two partnerships, trumps set by the dealer&rsquo;s last card, a point for each trick over six. Solo whist and knockout whist are different games.</p>'},
        {'q': 'How do you win at whist?', 'a': '<p>Win more than six of the 13 tricks with your partner to score. First side to 5 points wins a game, and two games win the rubber.</p>'},
        {'q': 'Is my partner any good?', 'a': '<p>You choose: the four levels set how good all three others are, your partner Jo included. Easy and Normal have a Hint too.</p>'},
        {'q': 'Can I play with friends?', 'a': '<p>Not yet &mdash; this is you with a computer partner against two computer players. But Today&rsquo;s match is the same cards for everyone, so you can compare in the Hall of Fame.</p>'},
        {'q': 'What is the Hall of Fame?', 'a': '<p>Win Today&rsquo;s match and you can put your initials and town on the board, ranked by the fewest hands to win the rubber &mdash; only if you choose to. The whole match is replayed on our server before it counts.</p>'},
    ],
    'crossLinksHtml': '<p>More free games: <a href="/play-hearts-online-free/">Hearts</a>, <a href="/play-gin-rummy-online-free/">Gin Rummy</a>, <a href="/play-cribbage-online-free/">Cribbage</a> and <a href="/games/">all our games</a>. Computer playing up? <a href="/remote-support/">Remote help</a> from 365 Techies.</p>',
}


def _extras(slug, video, poster, secs, name, desc, game_name, game_url, cover, og):
    page = next(p for p in bp.PAGES if p.get("slug") == slug)
    page["og_image"] = og
    orig = page["schema"]

    def schema(s, _orig=orig):
        obj = json.loads(_orig(s))
        g = obj.setdefault("@graph", [])
        g.append({"@type": "VideoObject", "@id": SITE + "/" + slug + "/#video", "name": name, "description": desc,
                  "thumbnailUrl": [SITE + poster], "uploadDate": UPLOADED, "duration": "PT%dM%dS" % (secs // 60, secs % 60),
                  "contentUrl": SITE + video, "embedUrl": SITE + "/" + slug + "/#video", "inLanguage": "en-GB",
                  "publisher": {"@id": SITE + "/#business"}})
        g.append({"@type": "VideoGame", "@id": SITE + "/" + slug + "/#game", "name": game_name, "url": SITE + game_url,
                  "description": desc, "genre": "Card game", "gamePlatform": "Web browser", "applicationCategory": "Game",
                  "operatingSystem": "Any (in a web browser)", "playMode": "SinglePlayer", "inLanguage": "en-GB",
                  "isAccessibleForFree": True, "offers": {"@type": "Offer", "price": "0", "priceCurrency": "GBP"},
                  "image": SITE + cover, "publisher": {"@id": SITE + "/#business"}, "subjectOf": {"@id": SITE + "/" + slug + "/#video"}})
        return json.dumps(obj, indent=2, ensure_ascii=False)
    page["schema"] = schema


for _d in (PAT, CRB, FC, HE, GN, WH):
    _d = dict(_d)
    for _k in ('title', 'metaDesc', 'ogTitle'):   # plain apostrophes in titles, meta tags and JSON-LD
        _d[_k] = _d[_k].replace('&rsquo;', "'")
    build_new_page(_d)

_extras('play-patience-online-free', PAT_VIDEO, PAT_POSTER, PAT_SECS, 'Patience (Solitaire) from 365 Techies, in a minute',
        'Free Patience with big, clear cards and no adverts: tap to move, Hint and Undo, four levels, a win, and the daily deal with its Hall of Fame.',
        'Patience (Klondike Solitaire)', '/games/solitaire/', '/games/img/covers/solitaire-v1.svg', '/images/games-patience-og-v1.jpg')
_extras('play-cribbage-online-free', CRB_VIDEO, CRB_POSTER, CRB_SECS, 'Cribbage from 365 Techies, in a minute',
        'Free cribbage against the computer with no adverts: the crib, the play and the show all counted for you, four levels, a win, and the daily match with its Hall of Fame.',
        'Cribbage', '/games/cribbage/', '/games/img/covers/cribbage-v1.svg', '/images/games-cribbage-og-v1.jpg')
_extras('play-freecell-online-free', FC_VIDEO, FC_POSTER, FC_SECS, 'FreeCell from 365 Techies, in a minute',
        'Free FreeCell with the same deals as Windows and no adverts: every card face up, the free cells, Hint, four levels, a win, and the daily deal with its Hall of Fame.',
        'FreeCell', '/games/freecell/', '/games/img/covers/freecell-v1.svg', '/images/games-freecell-og-v1.jpg')
_extras('play-hearts-online-free', HE_VIDEO, HE_POSTER, HE_SECS, 'Hearts from 365 Techies, in a minute',
        'The classic Hearts card game free against three computer players, with no adverts: passing, following suit, the scores each hand, a win, and the daily match with its Hall of Fame.',
        'Hearts', '/games/hearts/', '/games/img/covers/hearts-v1.svg', '/images/games-hearts-og-v1.jpg')
_extras('play-gin-rummy-online-free', GN_VIDEO, GN_POSTER, GN_SECS, 'Gin Rummy from 365 Techies, in a minute',
        'Free Gin Rummy against the computer with no adverts: your hand sorted into melds, deadwood counted, knocking and Gin, a win, and the daily match with its Hall of Fame.',
        'Gin Rummy', '/games/gin/', '/games/img/covers/gin-v1.svg', '/images/games-gin-og-v1.jpg')
_extras('play-whist-online-free', WH_VIDEO, WH_POSTER, WH_SECS, 'Whist from 365 Techies, in a minute',
        'The classic Whist card game free, with a computer partner against two computer players and no adverts: trumps, tricks, a won rubber, and the daily match with its Hall of Fame.',
        'Whist', '/games/whist/', '/games/img/covers/whist-v1.svg', '/images/games-whist-og-v1.jpg')
