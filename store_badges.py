# -*- coding: utf-8 -*-
"""The Microsoft Store badge beside every download button for one of our apps (13 Nov 2026).

Owner: the badge "builds trust" and belongs wherever we offer the app - he found the busy
/computer-spec-checker/ page offering 365 PC Manager with no badge. An audit of the built site
found 95 pages offering PC Manager, 20 offering Techies One Mail and 1 offering Techies Move as a
download button with no badge. Each button is written by a different component, so rather than
patch them one by one (and miss the next), this PAGE_FILTER adds the badge after any download
BUTTON whose app's badge is not already beside it. Plain text links inside a sentence are left.
"""
import re

# download folder -> (Store id, app name)
APPS = {
    'pcm':   ('XP99J1CFV8W876', '365 PC Manager'),
    't1':    ('XP8BVNHVZVMW0D', 'Techies One Mail'),
    'tpdf':  ('XPDLXSHHH42Q88', 'Techies PDF'),
    'tmove': ('XPFCXK6CK201FQ', 'Techies Move'),
}
_BTN = re.compile(r'<a\b(?=[^>]*\bclass="[^"]*(?:\bbutton\b|dpan__btn)[^"]*")[^>]*\bhref="[^"]*/downloads/(pcm|t1|tpdf|tmove)/[^"]*\.exe"[^>]*>.*?</a>', re.S)


def badge(folder):
    sid, name = APPS[folder]
    return ('<a class="ms-store-badge ms-store-badge--auto" href="https://apps.microsoft.com/detail/%s?mode=direct" '
            'aria-label="Download %s from the Microsoft Store" style="display:inline-block;vertical-align:middle;align-self:center;margin:.5rem">'
            '<img src="/images/ms-store-badge-en-gb-dark.svg" alt="Download from the Microsoft Store" width="161" height="44" '
            'loading="lazy" style="display:block;height:44px;width:auto"></a>' % (sid, name))


# 21 Nov 2026 (owner: "it should be on there, I've had it on there about 3 times"): the Virgin pages name 365 PC
# Manager in a sentence but have no download button, so the button rule above never reached them. On these pages the
# badge goes on its own line after the first paragraph of the main content that names the app or links to the mover.
VIRGIN_PAGES = (
    'move-my-virgin-email',
    'ntlworld-blueyonder-email-not-working',
    'virgin-media-email-wont-add-to-new-outlook',
    'move-virgin-media-email-to-gmail',
    'virgin-email-mover',
    'virgin-media-email-moving-to-junara',
)
_APP_PARA = re.compile(r'<p\b[^>]*>(?:(?!</p>).)*?(?:365 PC Manager|365 Mail Mover|href="/virgin-email-mover/)(?:(?!</p>).)*?</p>', re.S)


def _virgin_badge(slug, html):
    if slug.strip('/') not in VIRGIN_PAGES or re.search(r'ms-store-badge[^>]*' + APPS['pcm'][0], html):
        return html
    a = html.find('<main'); b = html.find('</main>', a)
    m = _APP_PARA.search(html, a, b) if a >= 0 and b > a else None
    if not m:
        print('store_badges: no paragraph naming the app on /%s/, badge NOT added' % slug.strip('/'))
        return html
    row = '<p class="ms-store-badge-row" style="margin:.25rem 0 1rem">' + badge('pcm') + '</p>'
    return html[:m.end()] + row + html[m.end():]


def add_badges(slug, html):
    html = _virgin_badge(slug, html)
    if '/downloads/' not in html:
        return html
    out = []; pos = 0
    for m in _BTN.finditer(html):
        sid = APPS[m.group(1)][0]
        near = html[max(0, m.start() - 500):m.start()] + html[m.end():m.end() + 900]
        if re.search(r'ms-store-badge[^>]*' + sid, near):
            continue                                   # this button already has its badge beside it
        out.append(html[pos:m.end()] + badge(m.group(1))); pos = m.end()
    out.append(html[pos:])
    return ''.join(out)
