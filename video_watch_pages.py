"""Video WATCH pages (13 Oct 2026; owner: "do them all" on seo-research/dell-2026-10-13).

Why: Google Search Console > Video indexing, 12 Oct 2026: 0 of the site's 6 videos indexed, every one "Video isn't on a
watch page" - Google only shows a video result where the video is the page's MAIN content. Our films sit inside long pages.
So each film gets its own page: the heading, then the video straight away (above the fold on a phone), a short description,
what the film shows (a transcript for a voiced film, the on-screen words for a silent one), links to the page it belongs
to, and a VideoObject with a contentUrl on our own domain. /videos/ lists them.
  /dell-it-support-film/   the 16 s Dell film (YouTube 1GQrPS59VCw, 14 Jul 2026), self-hosted copy of the landscape file.
                           Its scenes were made with an AI video tool (Kling) - the page says so. No price is shown in the
                           film; the page uses today's facts (refurbished laptops from GBP 510, desktops GBP 545).
  /techies-one-mail-film/  the 81 s website film (Lily's voice, captions), the same file as the product page.
"""
import build_pages as bp
import techies_one_page as t1   # already built by build_blog before this import; constants only

_CSS = """    <style>
      .vw{padding-top:clamp(5.5rem,10vw,7.5rem)}
      .vw__h1{margin:.35rem 0 1rem;font-size:clamp(1.7rem,4.2vw,2.6rem);line-height:1.15}
      .vw__fig{margin:0 0 1rem}
      .vw__fig video{display:block;width:100%;height:auto;max-width:100%;max-height:calc(100vh - 380px);min-height:180px;aspect-ratio:16/9;background:#060c1c;border-radius:14px;border:1px solid rgba(125,170,220,.3);box-shadow:0 22px 50px -26px rgba(0,0,0,.8)}
      .vw__fig figcaption{color:var(--muted);font-size:.85rem;margin-top:.45rem}
      .vw__cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,18rem),1fr));gap:1rem}
      .vw__card{display:block;border:1px solid rgba(125,170,220,.28);border-radius:14px;overflow:hidden;background:rgba(125,170,220,.05);text-decoration:none;color:inherit}
      .vw__card img{display:block;width:100%;height:auto;aspect-ratio:16/9;object-fit:cover}
      .vw__card span{display:block;padding:.8rem 1rem;font-weight:700}
    </style>
"""

FILMS = {
    'dell-it-support-film': dict(
        name='Dell computers, supplied and supported across Dorset', crumb='Dell film',
        title='Dell Computers, Supplied and Supported in Dorset (Video)',
        desc='A 16-second film from 365 Techies: the business Dell laptops and desktops we supply, new and refurbished, and support at home, at work or remotely.',
        src='/images/dell-reel-landscape-v1.mp4', poster='/images/dell-reel-poster-wide.jpg', secs=16, uploaded='2026-07-14',
        cap='16 seconds &middot; music, no speech &middot; the words are on screen',
        lede='A short film about what we do with Dell computers. We supply business-grade Dell laptops and desktops, new and refurbished, '
             'and look after them at home, at work or remotely across Dorset. We&rsquo;ve been a Dell reseller since 2001.',
        shows='<p>Three moments in a working day, then our details. The words on screen:</p>'
              '<ol><li><strong>Morning, home office</strong> &mdash; &ldquo;IT that just works&rdquo;.</li>'
              '<li><strong>Midday, at work</strong> &mdash; &ldquo;Dell built for business&rdquo;.</li>'
              '<li><strong>Afternoon, on the move</strong> &mdash; &ldquo;Support that travels with you&rdquo;.</li>'
              '<li><strong>The end card</strong> &mdash; &ldquo;Dell computers: supplied, supported, sorted&rdquo;, 365techies.co.uk, 01202 775566, '
              'family-run in Bournemouth since 1995, 4.9 on Google, no call-out fee.</li></ol>'
              '<p style="font-size:.9rem;color:var(--muted)">The scenes were made with an AI video tool to illustrate a working day. The machines we supply are real '
              'business Dells: refurbished Latitude laptops from &pound;510 and OptiPlex desktops from &pound;545, with a 12-month guarantee as standard, '
              'or five years while you&rsquo;re on one of our support plans.</p>',
        transcript='No speech. On-screen words: Morning, home office - IT that just works. Midday, at work - Dell built for business. '
                   'Afternoon, on the move - Support that travels with you. Dell computers - supplied, supported, sorted. 365techies.co.uk. 01202 775566.',
        more=[('/dell-hardware/', 'Refurbished and new Dell: models and prices'), ('/dell-it-support-dorset/', 'Dell support and repair in Dorset'),
              ('/refurbished-dell-laptops-bournemouth/', 'Refurbished Dell laptops'), ('/refurbished-dell-desktops-dorset/', 'Refurbished Dell desktops')],
        youtube='https://www.youtube.com/watch?v=1GQrPS59VCw'),
    'techies-one-mail-film': dict(
        name='Techies One Mail: the email problems it fixes', crumb='Techies One Mail film',
        title='Techies One Mail: the Email Problems It Fixes (Video)',
        desc='An 81-second film of the real Techies One Mail program, the free email program for Windows PCs from 365 Techies, fixing common email problems.',
        src=t1.FILM, poster=t1.FILM_POSTER, secs=t1.FILM_SECS, uploaded=t1.FILM_UPLOADED,
        cap='%d seconds &middot; a spoken guide with captions &middot; the real program, with made-up people and emails' % t1.FILM_SECS,
        lede='Our free email program for Windows PCs, shown fixing the problems people ring us about: an old email program that stopped, '
             'BT or Sky email that won&rsquo;t go in, buttons that are too fiddly, scam emails, an inbox full of old email and more than one address.',
        shows='<p>What the film says:</p><p>' + t1.FILM_SAYS + '</p>',
        transcript=t1.FILM_SAYS.replace('&rsquo;', "'"),
        more=[('/techies-one-mail/', 'Techies One Mail: download it free'), ('/greenby-email-login/', 'Plusnet email moved to Greenby'),
              ('/windows-live-mail-not-working/', 'Windows Live Mail not working?'), ('/email-support/', 'Email support')],
        youtube=''),
}


def _page(slug, f):
    links = ''.join('<li><a href="%s">%s</a></li>' % (h, t) for h, t in f['more'])
    yt = (' &middot; <a href="%s" rel="noopener" target="_blank">Watch it on YouTube</a>' % f['youtube']) if f['youtube'] else ''
    content = (_CSS +
        '    <section class="page-hero vw" aria-label="Video">\n      <div class="wrap" style="max-width:980px">\n'
        '        <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a> <span>/</span> <a href="/videos/">Videos</a> <span>/</span> '
        '<span aria-current="page">' + f['crumb'] + '</span></nav>\n'
        '        <h1 class="vw__h1">' + f['name'] + '</h1>\n'
        '        <figure class="vw__fig"><video controls playsinline preload="metadata" poster="' + f['poster'] + '" width="1920" height="1080">'
        '<source src="' + f['src'] + '" type="video/mp4"></video><figcaption>' + f['cap'] + yt + '</figcaption></figure>\n'
        '        <p class="lede">' + f['lede'] + '</p>\n'
        '        <p class="page-hero__byline mono"><span class="page-hero__byline-by">By the </span><a href="/meet-the-team/">365 Techies team</a> &middot; Reviewed __LASTMOD_HUMAN__</p>\n'
        '      </div>\n    </section>\n'
        '    <section class="section"><div class="wrap wrap--narrow prose">\n'
        '      <h2 class="section-title" data-title>What the film shows<span class="title-underline"></span></h2>\n      ' + f['shows'] + '\n'
        '      <h2 class="section-title" data-title>Read more<span class="title-underline"></span></h2>\n      <ul>' + links + '</ul>\n'
        '      <p><a href="/videos/">All our videos</a></p>\n'
        '    </div></section>\n' +
        bp.cta('Want a hand?', 'Ring us and talk to a person: family-run in Bournemouth since 1995, rated 4.9 on Google.',
               primary=('Call 01202 775566', 'tel:+441202775566'), secondary=('Send us a message', '/contact/')))

    def schema(s, f=f):
        video = {'@type': 'VideoObject', '@id': f'{bp.SITE}/{s}/#video', 'name': f['name'], 'description': f['desc'],
                 'thumbnailUrl': [bp.SITE + f['poster']], 'uploadDate': f['uploaded'],
                 'duration': 'PT%dM%dS' % (f['secs'] // 60, f['secs'] % 60), 'contentUrl': bp.SITE + f['src'],
                 'transcript': f['transcript'], 'inLanguage': 'en-GB', 'publisher': {'@id': bp.SITE + '/#business'}}
        page = bp.webpage(s, f['title'], f['desc'], image=f['poster'])
        page['mainEntity'] = {'@id': f'{bp.SITE}/{s}/#video'}
        return bp.graph([bp.crumb_sub(s, 'Videos', 'videos', f['crumb']), page, video])

    bp.add(slug=slug, title=f['title'], desc=f['desc'], og_title=f['name'], schema=schema, content=content,
           og_image=bp.SITE + f['poster'])


def _hub():
    cards = ''.join('<a class="vw__card" href="/%s/"><img src="%s" width="1280" height="720" alt="%s" loading="lazy" decoding="async"><span>%s</span></a>'
                    % (s, f['poster'], f['name'], f['name']) for s, f in FILMS.items())
    content = (_CSS +
        '    <section class="page-hero vw" aria-label="Videos">\n      <div class="wrap" style="max-width:980px">\n'
        '        <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a> <span>/</span> <span aria-current="page">Videos</span></nav>\n'
        '        <h1 class="vw__h1">Our videos</h1>\n'
        '        <p class="lede">Short films from 365 Techies, the family-run IT firm in Bournemouth: our free programs and the work we do.</p>\n'
        '        <div class="vw__cards">' + cards + '</div>\n      </div>\n    </section>\n')

    def schema(s):
        items = [{'@type': 'ListItem', 'position': i + 1, 'url': f'{bp.SITE}/{sl}/', 'name': f['name']} for i, (sl, f) in enumerate(FILMS.items())]
        return bp.graph([bp.crumb('videos', 'Videos'), bp.webpage('videos', 'Our videos', 'Short films from 365 Techies.', wtype='CollectionPage'),
                         {'@type': 'ItemList', '@id': f'{bp.SITE}/videos/#list', 'itemListElement': items}])

    bp.add(slug='videos', title='Videos | 365 Techies', desc='Short films from 365 Techies, the family-run IT firm in Bournemouth: our free programs and the work we do.',
           og_title='Videos from 365 Techies', schema=schema, content=content)


for _s, _f in FILMS.items():
    _page(_s, _f)
_hub()
