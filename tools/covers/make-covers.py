"""The cover pictures for the card games on the Games page and in the Games menu (5 Oct 2026; owner: "get the game stuff
looking a bit better ... the Microsoft Solitaire pack ... how they present the games"). Our own drawings, made in code:
each game has its own colour and a big picture made of cards, set against a Dorset landmark. Portrait, 600 x 780, SVG -
crisp at any size and a few KB each. Run: py tools/covers/make-covers.py  ->  games/img/covers/<id>-v1.svg
(⚠ a changed cover gets a new name, -v2: images are cached for a year.) Suits are drawn as shapes, not text, so they look
the same on every computer; the only text is the card ranks (Georgia, with serif fall-backs)."""
import math, os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'games', 'img', 'covers')
W, H = 600, 780

# ---------------------------------------------------------------- the pieces
SUIT = {   # unit shapes, about 2 wide, centred on 0,0
    'S': 'M0,-1C.35,-.55 1,-.25 1,.22C1,.68 .45,.8 .14,.5L.3,1H-.3L-.14,.5C-.45,.8 -1,.68 -1,.22C-1,-.25 -.35,-.55 0,-1Z',
    'H': 'M0,-.42C0,-.95 -.98,-.98 -.98,-.3C-.98,.22 -.42,.55 0,1C.42,.55 .98,.22 .98,-.3C.98,-.98 0,-.95 0,-.42Z',
    'D': 'M0,-1L.72,0L0,1L-.72,0Z',
    'C': 'M0,-1A.42,.42 0 1 1 0,-.16A.42,.42 0 1 1 0,-1ZM-.5,-.26A.42,.42 0 1 1 -.5,.58A.42,.42 0 1 1 -.5,-.26ZM.5,-.26A.42,.42 0 1 1 .5,.58A.42,.42 0 1 1 .5,-.26ZM-.12,.2H.12L.3,1H-.3Z',
}
RED = {'H', 'D'}


def suit(s, x, y, size, fill=None, extra=''):
    col = fill or ('#c6152f' if s in RED else '#17191f')
    return '<path d="%s" transform="translate(%.1f %.1f) scale(%.2f)" fill="%s"%s/>' % (SUIT[s], x, y, size / 2, col, extra)


def card(x, y, w, rot, rank, s, back=False, shadow=True, glow=None):
    """A playing card, top-left at x,y, width w, turned rot degrees about its centre."""
    h = w * 1.4
    cx, cy = x + w / 2, y + h / 2
    r = w * 0.08
    g = ['<g transform="rotate(%.1f %.1f %.1f)">' % (rot, cx, cy)]
    if glow:
        g.append('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" rx="%.1f" fill="%s" opacity=".55" filter="url(#blur8)"/>' % (x - 6, y - 6, w + 12, h + 12, r + 4, glow))
    if shadow:
        g.append('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" rx="%.1f" fill="#000" opacity=".35" filter="url(#blur4)"/>' % (x + w * .04, y + w * .07, w, h, r))
    if back:
        g.append('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" rx="%.1f" fill="#fbfaf4"/>' % (x, y, w, h, r))
        g.append('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" rx="%.1f" fill="url(#cardback)"/>' % (x + w * .06, y + w * .06, w * .88, h - w * .12, r * .7))
        g.append('<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="none" stroke="#5ee0ff" stroke-width="%.1f"/>' % (cx, cy, w * .28, w * .15, w * .025))
        g.append('<text x="%.1f" y="%.1f" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="%.1f" fill="#9ff0ff" text-anchor="middle">365</text>' % (cx, cy + w * .065, w * .18))
    else:
        col = '#c6152f' if s in RED else '#17191f'
        g.append('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" rx="%.1f" fill="url(#paper)" stroke="#cdc6b2" stroke-width="1.2"/>' % (x, y, w, h, r))
        g.append('<text x="%.1f" y="%.1f" font-family="Georgia,\'Times New Roman\',serif" font-weight="700" font-size="%.1f" fill="%s">%s</text>' % (x + w * .08, y + w * .3, w * .27, col, rank))
        g.append(suit(s, x + w * .19, y + w * .45, w * .16))
        if rank in ('J', 'Q', 'K'):
            fx, fy, fw, fh = x + w * .2, y + h * .3, w * .6, h * .55
            g.append('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" rx="%.1f" fill="%s" opacity=".08"/>' % (fx, fy, fw, fh, w * .04, col))
            g.append('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" rx="%.1f" fill="none" stroke="#c9a227" stroke-width="%.1f"/>' % (fx, fy, fw, fh, w * .04, w * .025))
            g.append('<text x="%.1f" y="%.1f" font-family="Georgia,\'Times New Roman\',serif" font-weight="700" font-size="%.1f" fill="%s" text-anchor="middle">%s</text>' % (cx, fy + fh * .55, w * .34, col, rank))
            g.append(suit(s, cx, fy + fh * .8, w * .14))
            # a crown over the King and Queen
            if rank in ('K', 'Q'):
                k = w * .12
                g.append('<path d="M%.1f %.1fl%.1f -%.1f l%.1f %.1f l%.1f -%.1f l%.1f %.1f l%.1f -%.1f l%.1f %.1f z" fill="#d9a520"/>' % (cx - k * 1.5, fy + fh * .2, k * .5, k, k * .5, k * .6, k * .5, k * 1.2, k * .5, k * 1.2, k * .5, k * .6, k * .5, k * 1))
        elif rank == 'A':
            g.append('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="none" stroke="%s" stroke-opacity=".18" stroke-width="%.1f"/>' % (cx, cy + h * .06, w * .36, col, w * .02))
            g.append(suit(s, cx, cy + h * .06, w * .5))
        else:
            g.append(suit(s, cx, cy + h * .08, w * .42))
    g.append('</g>')
    return ''.join(g)


def sparkle(x, y, r, col='#fff6d6', op=1):
    return ('<path d="M%.1f %.1fQ%.1f %.1f %.1f %.1fQ%.1f %.1f %.1f %.1fQ%.1f %.1f %.1f %.1fQ%.1f %.1f %.1f %.1fZ" fill="%s" opacity="%.2f"/>'
            % (x, y - r, x + r * .12, y - r * .12, x + r, y, x + r * .12, y + r * .12, x, y + r, x - r * .12, y + r * .12, x - r, y, x - r * .12, y - r * .12, x, y - r, col, op))


def sparkles(seed, n, box, col='#fff6d6'):
    out, a = [], seed
    for i in range(n):
        a = (a * 1103515245 + 12345) & 0x7fffffff; x = box[0] + (a % 1000) / 1000 * (box[2] - box[0])
        a = (a * 1103515245 + 12345) & 0x7fffffff; y = box[1] + (a % 1000) / 1000 * (box[3] - box[1])
        a = (a * 1103515245 + 12345) & 0x7fffffff; r = 4 + (a % 100) / 100 * 10
        out.append(sparkle(x, y, r, col, .55 + (a % 7) / 20))
    return ''.join(out)


def stars(seed, n, box, col='#ffffff'):
    out, a = [], seed
    for i in range(n):
        a = (a * 1103515245 + 12345) & 0x7fffffff; x = box[0] + (a % 1000) / 1000 * (box[2] - box[0])
        a = (a * 1103515245 + 12345) & 0x7fffffff; y = box[1] + (a % 1000) / 1000 * (box[3] - box[1])
        a = (a * 1103515245 + 12345) & 0x7fffffff
        out.append('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="%s" opacity="%.2f"/>' % (x, y, .8 + (a % 10) / 6, col, .35 + (a % 9) / 14))
    return ''.join(out)


def defs(sky, extra=''):
    """The shared definitions: the sky gradient (top, middle, bottom), card paper and back, blurs."""
    return ('<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="%s"/><stop offset=".55" stop-color="%s"/><stop offset="1" stop-color="%s"/></linearGradient>'
            '<radialGradient id="paper" cx=".3" cy=".15" r="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#fffdf7"/><stop offset="1" stop-color="#efe8d8"/></radialGradient>'
            '<linearGradient id="cardback" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1b4f8c"/><stop offset="1" stop-color="#0a2245"/></linearGradient>'
            '<radialGradient id="halo" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff3c4" stop-opacity=".9"/><stop offset=".35" stop-color="#ffd257" stop-opacity=".35"/><stop offset="1" stop-color="#ffd257" stop-opacity="0"/></radialGradient>'
            '<filter id="blur4" x="-20%%" y="-20%%" width="140%%" height="140%%"><feGaussianBlur stdDeviation="4"/></filter>'
            '<filter id="blur8" x="-30%%" y="-30%%" width="160%%" height="160%%"><feGaussianBlur stdDeviation="8"/></filter>'
            '<filter id="blur20" x="-50%%" y="-50%%" width="200%%" height="200%%"><feGaussianBlur stdDeviation="20"/></filter>%s</defs>' % (sky[0], sky[1], sky[2], extra))


def svg(body, sky, extra_defs=''):
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" width="%d" height="%d">' % (W, H, W, H) + defs(sky, extra_defs)
            + '<rect width="%d" height="%d" fill="url(#sky)"/>' % (W, H) + body
            + '<rect width="%d" height="%d" fill="none" stroke="#000" stroke-opacity=".25" stroke-width="2"/></svg>' % (W, H))


def halo(x, y, r, op=1):
    return '<circle cx="%.1f" cy="%.1f" r="%.1f" fill="url(#halo)" opacity="%.2f"/>' % (x, y, r, op)


def poly(pts, fill, op=1):
    return '<path d="M%s Z" fill="%s" opacity="%.2f"/>' % (' L'.join('%.1f %.1f' % p for p in pts), fill, op)


# ---------------------------------------------------------------- the covers
def solitaire():
    # Old Harry Rocks at sunrise, and the classic win: the cards leaping off the piles in a cascade across the sky
    b = halo(430, 330, 330, .85)
    b += stars(3, 40, (0, 0, 600, 260), '#dfe9ff')
    # sea and the chalk stacks
    b += '<rect y="560" width="600" height="220" fill="#0b3f7a"/><rect y="560" width="600" height="8" fill="#ffd9a0" opacity=".35"/>'
    b += poly([(0, 560), (0, 470), (70, 455), (150, 470), (215, 500), (240, 560)], '#e8e2d2')
    b += poly([(0, 560), (0, 500), (90, 492), (180, 520), (240, 560)], '#c9c2b0')
    b += poly([(270, 560), (280, 470), (300, 462), (318, 475), (326, 560)], '#efe9da')
    b += poly([(345, 560), (352, 515), (366, 508), (378, 520), (382, 560)], '#e4ddcb')
    b += '<path d="M0 560 Q 150 548 300 560 T 600 560 V 600 H 0 Z" fill="#0e4f92" opacity=".8"/>'
    for i, y in enumerate((610, 650, 700, 750)):
        b += '<path d="M%d %d q 40 -10 80 0 t 80 0" stroke="#7fc0ff" stroke-opacity=".35" stroke-width="3" fill="none"/>' % (40 + i * 90, y)
    # the cascade: cards bouncing in an arc, with trails
    arc = [(40, 140, -24, 'A', 'S'), (130, 95, -12, 'K', 'H'), (230, 80, 0, 'Q', 'C'), (330, 100, 12, 'J', 'D'), (420, 150, 22, '10', 'S'), (480, 230, 34, '7', 'H')]
    for i, (x, y, rot, rk, s) in enumerate(arc):
        b += '<g opacity=".18">%s</g>' % card(x - 18, y + 14, 110, rot - 6, rk, s, shadow=False)
    for x, y, rot, rk, s in arc:
        b += card(x, y, 110, rot, rk, s)
    # four Aces fanned in the front
    for i, s in enumerate('SHDC'):
        b += card(150 + i * 62, 420, 140, -15 + i * 10, 'A', s, glow='#ffd257' if i == 0 else None)
    b += sparkles(11, 14, (20, 40, 580, 420))
    return svg(b, ('#0d2a6e', '#2a5bb8', '#f2b36b'))


def freecell():
    # Corfe Castle on its hill against a huge moon; four Aces up in the four free cells
    b = '<circle cx="300" cy="260" r="170" fill="#ffe6c2" opacity=".95"/><circle cx="300" cy="260" r="230" fill="#ffd9a8" opacity=".15"/>'
    b += stars(5, 50, (0, 0, 600, 300), '#ffe1e8')
    # the hill and the ruin
    b += '<path d="M0 560 Q 160 420 300 400 Q 440 420 600 560 V780 H0Z" fill="#3b0a1c"/>'
    b += poly([(250, 410), (250, 300), (262, 300), (262, 288), (274, 288), (274, 300), (290, 300), (292, 250), (306, 240), (318, 252), (320, 330), (336, 330), (338, 300), (350, 300), (352, 412)], '#2a0614')
    b += poly([(200, 440), (206, 380), (222, 372), (230, 384), (232, 445)], '#2a0614')
    b += '<path d="M0 620 Q 300 560 600 620 V780 H0Z" fill="#1f0410"/>'
    # four free cells across the front, a card glowing in each
    for i, (rk, s) in enumerate((('A', 'H'), ('K', 'S'), ('Q', 'D'), ('J', 'C'))):
        x = 40 + i * 134
        b += '<rect x="%d" y="520" width="118" height="165" rx="12" fill="none" stroke="#ffcf7a" stroke-width="3" stroke-dasharray="10 7" opacity=".7"/>' % x
        b += card(x + 6, 527, 106, (-4, 3, -2, 5)[i], rk, s, glow='#ff8a8a' if i == 0 else None)
    b += sparkles(21, 10, (40, 60, 560, 480), '#ffe6c2')
    return svg(b, ('#3a0717', '#8e1430', '#e0574f'))


def spider():
    # dawn on the heath: a dewy web between gorse stems, with cards caught in it
    cx, cy = 300, 330
    b = halo(300, 330, 300, .55) + stars(9, 45, (0, 0, 600, 300), '#f1e4ff')
    web = ''
    spokes = 14
    for i in range(spokes):
        a = i * 2 * math.pi / spokes + .1
        web += '<line x1="%d" y1="%d" x2="%.1f" y2="%.1f"/>' % (cx, cy, cx + math.cos(a) * 330, cy + math.sin(a) * 330)
    for k in range(1, 9):
        rr = k * 34
        pts = ' '.join('%.1f,%.1f' % (cx + math.cos(i * 2 * math.pi / spokes + .1) * rr * (1 + .06 * math.sin(i * 1.7)), cy + math.sin(i * 2 * math.pi / spokes + .1) * rr * (1 + .06 * math.sin(i * 1.7))) for i in range(spokes))
        web += '<polygon points="%s"/>' % pts
    b += '<g stroke="#f4ecff" stroke-opacity=".75" stroke-width="1.6" fill="none">%s</g>' % web
    for i in range(26):   # dew drops
        a = i * 2.4; rr = 40 + (i * 37) % 260
        b += '<circle cx="%.1f" cy="%.1f" r="%.1f" fill="#ffffff" opacity=".85"/>' % (cx + math.cos(a) * rr, cy + math.sin(a) * rr, 2 + (i % 3))
    # cards caught in the web
    for x, y, rot, rk, s in ((170, 200, -18, 'K', 'S'), (320, 160, 14, 'Q', 'H'), (230, 330, 6, 'J', 'S'), (370, 330, -10, '10', 'H')):
        b += card(x, y, 104, rot, rk, s)
    # the spider itself, on its thread
    b += '<line x1="470" y1="0" x2="470" y2="150" stroke="#f4ecff" stroke-width="1.5"/>'
    b += '<g transform="translate(470 172)"><ellipse rx="20" ry="24" fill="#1a0b33"/><circle cy="-26" r="13" fill="#1a0b33"/>'
    for sgn in (-1, 1):
        for j in range(4):
            b += '<path d="M%d %d q %d %d %d %d" stroke="#1a0b33" stroke-width="4" fill="none" stroke-linecap="round"/>' % (sgn * 14, -12 + j * 9, sgn * 22, -14 + j * 6, sgn * 30, 6 + j * 8)
    b += '<circle cx="-5" cy="-29" r="3.5" fill="#fff"/><circle cx="5" cy="-29" r="3.5" fill="#fff"/><circle cx="-5" cy="-28" r="1.6" fill="#1a0b33"/><circle cx="5" cy="-28" r="1.6" fill="#1a0b33"/></g>'
    # gorse and heather
    b += '<path d="M0 640 Q 120 600 220 630 T 420 620 T 600 640 V780 H0Z" fill="#2a1250"/>'
    for i in range(22):
        x = 10 + i * 28
        b += '<circle cx="%d" cy="%d" r="%d" fill="%s"/>' % (x, 650 + (i * 13) % 40, 6 + i % 4, ('#c77dff', '#ffd23f', '#9d4edd')[i % 3])
    b += '<path d="M0 700 Q 300 660 600 700 V780 H0Z" fill="#190a33"/>'
    return svg(b, ('#1a0b3a', '#5b2a9e', '#ff9ec7'))


def tripeaks():
    # three chalk downs, the white horse cut in the middle one, and a card glowing on each summit
    b = '<circle cx="470" cy="150" r="60" fill="#fff4c9"/>' + halo(470, 150, 200, .6)
    b += '<path d="M-20 520 Q 90 330 190 520Z" fill="#2f9e58"/><path d="M150 520 Q 300 250 450 520Z" fill="#37b066"/><path d="M410 520 Q 520 330 620 520Z" fill="#2a8f4f"/>'
    # the white horse on the middle hill
    b += ('<path d="M262 420 q 14 -22 40 -18 q 18 -14 30 -4 q -6 6 -14 6 q 6 12 -4 24 l 6 30 h -8 l -6 -26 h -26 l -8 28 h -8 l 4 -30 q -12 -2 -14 -10 z" fill="#f4f1e6" opacity=".9"/>')
    b += '<path d="M0 520 Q 300 470 600 520 V780 H0Z" fill="#1f7a42"/><path d="M0 610 Q 300 560 600 610 V780 H0Z" fill="#155c31"/>'
    # hedgerows
    for i in range(14):
        b += '<circle cx="%d" cy="%d" r="%d" fill="#0e4a26"/>' % (i * 46, 600 - (i % 3) * 4, 16 + i % 3 * 3)
    # a card on each peak
    for x, y, rot, rk, s in ((40, 300, -12, '9', 'C'), (240, 120, 0, '10', 'H'), (440, 300, 12, 'J', 'D')):
        b += halo(x + 60, y + 80, 120, .7) + card(x, y, 120, rot, rk, s)
    # a run along the bottom: one higher, one lower
    for i, (rk, s) in enumerate((('8', 'S'), ('9', 'H'), ('10', 'C'), ('J', 'S'))):
        b += card(90 + i * 105, 560, 112, -8 + i * 5, rk, s)
    b += sparkles(31, 12, (20, 40, 580, 460))
    return svg(b, ('#0b4a2a', '#1c8a4c', '#cfeec0'))


def pyramid():
    # a pyramid built of cards, glowing gold against a New Forest sunset, ponies grazing under the pines
    b = halo(300, 300, 340, .9) + '<circle cx="300" cy="330" r="110" fill="#ffe08a" opacity=".55"/>'
    b += '<path d="M0 560 Q 300 520 600 560 V780 H0Z" fill="#4a1a06"/>'
    for i in range(10):   # pines
        x = 10 + i * 64; hgt = 120 + (i * 37) % 70
        b += poly([(x, 560), (x + 26, 560 - hgt), (x + 52, 560)], '#2a0f04')
    # ponies
    for x, flip in ((90, 1), (470, -1)):
        b += ('<g transform="translate(%d 610) scale(%d 1)"><path d="M0 0 q 10 -26 44 -24 q 14 -16 26 -10 q 4 10 -6 14 l 2 18 q -4 4 -8 0 l -2 -10 h -40 l -4 26 h -7 l -1 -26 q -6 -2 -4 -8 z" fill="#1d0a03"/></g>' % (x, flip))
    # the pyramid: rows of 1..5 cards
    rows = [[('K', 'S')], [('9', 'H'), ('4', 'C')], [('6', 'D'), ('7', 'S'), ('A', 'H')], [('Q', 'C'), ('3', 'D'), ('10', 'S'), ('5', 'H')], [('8', 'C'), ('2', 'H'), ('J', 'D'), ('6', 'S'), ('K', 'H')]]
    cw = 92
    for r, row in enumerate(rows):
        n = len(row); left = 300 - (n * cw * .82) / 2 - cw * .09
        for k, (rk, s) in enumerate(row):
            b += card(left + k * cw * .82, 130 + r * 82, cw, 0, rk, s, glow='#ffd257' if r == 0 else None)
    b += sparkles(41, 14, (20, 40, 580, 520), '#fff2c2')
    b += '<path d="M0 690 Q 300 650 600 690 V780 H0Z" fill="#2a0e03"/>'
    return svg(b, ('#5a1d05', '#d9661a', '#ffd38a'))


def hearts():
    # Bournemouth Pier at sunset; hearts float up like lanterns; the Queen of spades - the one to dodge
    b = '<circle cx="300" cy="470" r="120" fill="#ffd0a0" opacity=".9"/>' + halo(300, 470, 300, .7)
    b += '<rect y="520" width="600" height="260" fill="#5a0b2c"/><rect y="520" width="600" height="6" fill="#ffc9a8" opacity=".5"/>'
    # the pier: deck, legs, the pavilion at the end
    b += '<rect x="0" y="500" width="430" height="10" fill="#2a0414"/>'
    for i in range(16):
        b += '<rect x="%d" y="508" width="5" height="40" fill="#2a0414"/>' % (8 + i * 27)
    b += '<path d="M380 500 h 120 v -26 q -60 -40 -120 0 z" fill="#2a0414"/><rect x="430" y="440" width="20" height="34" fill="#2a0414"/>'
    for i, y in enumerate((570, 610, 660, 720)):
        b += '<rect x="%d" y="%d" width="%d" height="4" rx="2" fill="#ffc9a8" opacity=".3"/>' % (220 + (i % 2) * 40, y, 160 - i * 20)
    # floating hearts
    a = 7
    for i in range(16):
        a = (a * 1103515245 + 12345) & 0x7fffffff; x = 30 + a % 540
        a = (a * 1103515245 + 12345) & 0x7fffffff; y = 40 + a % 380
        b += suit('H', x, y, 14 + (i % 4) * 7, '#ff5c8a', ' opacity="%.2f"' % (.35 + (i % 5) / 8))
    # the Queen of spades, glowing dark, with two hearts beside her
    b += card(105, 210, 130, -14, '7', 'H') + card(365, 210, 130, 14, 'A', 'H')
    b += card(220, 150, 160, 0, 'Q', 'S', glow='#7a1e9e')
    b += sparkles(51, 10, (20, 40, 580, 460), '#ffe1ea')
    return svg(b, ('#3a0920', '#c2185b', '#ff9a76'))


def gin():
    # the beach huts at Bournemouth, the sea beyond, and a hand laid down: a run and a set
    b = '<circle cx="120" cy="140" r="50" fill="#fff6d6"/>' + halo(120, 140, 160, .6)
    b += '<rect y="360" width="600" height="80" fill="#0a7a8a"/><rect y="360" width="600" height="5" fill="#d8fbff" opacity=".6"/>'
    b += '<rect y="440" width="600" height="340" fill="#f0d9a8"/>'
    cols = ('#e63946', '#f4a261', '#2a9d8f', '#e9c46a', '#457b9d', '#f28482', '#8ecae6')
    for i in range(7):   # beach huts
        x = -10 + i * 88
        b += poly([(x, 470), (x, 400), (x + 38, 372), (x + 76, 400), (x + 76, 470)], cols[i])
        b += '<rect x="%d" y="420" width="26" height="50" fill="#ffffff" opacity=".8"/>' % (x + 25)
        for k in range(4):
            b += '<rect x="%d" y="%d" width="76" height="3" fill="#000" opacity=".07"/>' % (x, 404 + k * 16)
    b += '<rect y="470" width="600" height="10" fill="#d1b37c"/>'
    # a run (7 8 9 of hearts) and a set (three Kings), laid on the sand
    for i, (rk, s) in enumerate((('7', 'H'), ('8', 'H'), ('9', 'H'))):
        b += card(30 + i * 62, 520, 120, -10 + i * 5, rk, s)
    for i, s in enumerate('SDC'):
        b += card(330 + i * 62, 520, 120, -6 + i * 6, 'K', s, glow='#7ff0e6' if i == 1 else None)
    b += '<text x="300" y="300" font-family="Georgia,serif" font-style="italic" font-weight="700" font-size="64" fill="#ffffff" text-anchor="middle" opacity=".92">Gin!</text>'
    b += sparkles(61, 10, (20, 40, 580, 340))
    return svg(b, ('#0b4f63', '#1ba3b5', '#bdf2f0'))


def cribbage():
    # a pub table: the wooden peg board with its brass pegs, and the best hand there is (5 5 5 and the right Jack)
    b = halo(300, 180, 260, .8)
    # the board, in perspective
    b += '<path d="M60 360 L540 360 L590 560 L10 560 Z" fill="#7a4317"/><path d="M60 360 L540 360 L546 384 L54 384 Z" fill="#9a5b24"/>'
    b += '<path d="M10 560 L590 560 L590 580 L10 580 Z" fill="#4d2a0d"/>'
    for lane in range(3):
        for k in range(30):
            t = k / 29
            yy = 400 + lane * 50
            sx = 70 - (yy - 360) / 200 * 50 + t * (460 + (yy - 360) / 200 * 100)
            b += '<circle cx="%.1f" cy="%d" r="%.1f" fill="#2a1406"/>' % (sx, yy, 3 + lane * .6)
    # the pegs
    for x, y, col in ((210, 392, '#ffd257'), (330, 392, '#ffd257'), (150, 442, '#c0c8d0'), (420, 442, '#c0c8d0')):
        b += '<rect x="%d" y="%d" width="10" height="36" rx="4" fill="%s"/><circle cx="%d" cy="%d" r="8" fill="%s"/>' % (x - 5, y - 32, col, x, y - 34, col)
    # the hand: 5 5 5 and the Jack, with the 5 turned up
    for i, (rk, s) in enumerate((('5', 'H'), ('5', 'C'), ('5', 'D'), ('J', 'S'))):
        b += card(80 + i * 98, 110, 120, -12 + i * 8, rk, s)
    b += card(470, 70, 100, 12, '5', 'S', glow='#ffd257')
    b += '<text x="300" y="690" font-family="Georgia,serif" font-weight="700" font-size="58" fill="#ffe7b0" text-anchor="middle" opacity=".95">fifteen two&#8230;</text>'
    b += sparkles(71, 9, (20, 30, 580, 330))
    return svg(b, ('#1f0e04', '#6b3a14', '#c98b4a'))


def whist():
    # a card table by candlelight: the four suits in gold rings, the trump card turned up in the middle
    b = '<ellipse cx="300" cy="560" rx="360" ry="200" fill="#0c3b2a"/><ellipse cx="300" cy="560" rx="330" ry="176" fill="#145c40"/>'
    b += halo(300, 300, 300, .65)
    pos = ((300, 150), (120, 330), (480, 330), (300, 470))
    for (x, y), s in zip(pos, 'SHDC'):
        b += '<circle cx="%d" cy="%d" r="66" fill="#0b1638"/><circle cx="%d" cy="%d" r="66" fill="none" stroke="#e0b44a" stroke-width="6"/><circle cx="%d" cy="%d" r="56" fill="none" stroke="#e0b44a" stroke-opacity=".4" stroke-width="2"/>' % (x, y, x, y, x, y)
        b += suit(s, x, y, 70, '#ff5c6c' if s in RED else '#f2f2f6')
    b += card(240, 255, 120, 0, 'K', 'H', glow='#ffd257')
    # a candle
    b += '<rect x="540" y="520" width="26" height="90" rx="5" fill="#f6ecd4"/><ellipse cx="553" cy="505" rx="9" ry="20" fill="#ffcf5a"/><ellipse cx="553" cy="508" rx="4" ry="9" fill="#fff6d6"/>'
    b += halo(553, 505, 90, .9)
    b += '<text x="300" y="700" font-family="Georgia,serif" font-style="italic" font-weight="700" font-size="46" fill="#ffe7b0" text-anchor="middle">Trumps!</text>'
    b += sparkles(81, 10, (20, 30, 580, 260), '#ffe7b0')
    return svg(b, ('#070d24', '#1b2b63', '#2d1b4e'))


COVERS = {'solitaire': solitaire, 'freecell': freecell, 'spider': spider, 'tripeaks': tripeaks, 'pyramid': pyramid,
          'hearts': hearts, 'gin': gin, 'cribbage': cribbage, 'whist': whist}

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for gid, fn in COVERS.items():
        s = fn()
        open(os.path.join(OUT, gid + '-v1.svg'), 'w', encoding='utf-8', newline='\n').write(s)
        print(gid, len(s) // 1024, 'KB')
