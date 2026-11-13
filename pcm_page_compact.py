"""pcm_page_compact.py - /free-pc-health-check/ pulled together (13 Nov 2026).

Owner: "this page seems to go on forever ... bits added onto it over the time ... see how all the features could be
displayed in a lot smaller space". Measured before: 32,400 px tall on a desktop, 27 sections, 5,460 words.

compact(content) is a PURE re-arrangement of the page the old code already builds: no wording is removed, so nothing a
search engine reads has gone. It
  1. puts the sections in one order: get it -> see it -> what it does -> more it can do -> what's new -> on a plan ->
     before you install -> questions;
  2. turns thirteen long sections into three groups of fold-out rows (<details>), each with its own H2 and a one-line
     summary, so a visitor can scan the lot in one screen and open what they want;
  3. shows the newest four "what's new" cards and tucks the older ones (and the version-by-version history) behind one row.
A link to an id inside a closed row (#broadband, #benchtool, #six-weekly-service, #virgin-email ...) opens it: _JS.

Every section is found by its id or aria-label; one that is renamed or added is NOT lost - it lands just above the FAQ
and the build prints a warning, so add it to ORDER here."""
import re

_SEC = re.compile(r'[ \t]*<section\b[^>]*>.*?</section>[ \t]*\n?', re.S)   # the page's sections never nest (asserted)

# (key, how to recognise the opening tag)
_KEYS = [
    ('hero', 'class="page-hero'), ('intents', 'pcm-intents-sec'), ('proof', 'dh-proof'), ('abroad', 'id="outside-uk"'),
    ('download', 'id="download"'), ('whatsnew', 'id="whats-new"'), ('reel', 'aria-label="The app in action"'),
    ('musthave', 'id="must-have"'), ('service', 'id="six-weekly-service"'), ('looks', 'aria-label="What it looks like"'),
    ('trust', 'aria-label="Why you can trust us"'), ('does', 'aria-label="What it does"'), ('virgin', 'id="virgin-email"'),
    ('family', 'aria-label="Family View'), ('visits', 'aria-label="Manage your service visits"'),
    ('power', 'aria-label="Power, solar and smart home"'), ('free', 'aria-label="Free and honest"'),
    ('checks', 'aria-label="What it checks"'), ('cleaner', 'aria-label="Not another PC cleaner"'),
    ('microsoft', 'aria-label="365 PC Manager vs Microsoft tools"'), ('workshop', 'aria-label="Built by us, growing with you"'),
    ('broadband', 'id="broadband"'), ('bench', 'id="benchtool"'), ('faq', 'id="faq"'), ('cta', 'class="cta-band"'),
]

# one plain line under each fold-out title: what is inside, so nobody has to open a row to find out
_TEASE = {
    'virgin': 'Checks your Virgin Media mailbox and moves it into Gmail for you. Free.',
    'broadband': 'Measures your real download, upload and latency, and remembers the results.',
    'bench': 'Six real speed tests that run in your browser. Nothing to download.',
    'family': 'See a parent&rsquo;s PC health from your own phone or laptop. Never their screen or files.',
    'power': 'Hours switched on, what that costs a year, and what letting it sleep would save.',
    'checks': 'The full list: drive, memory, age, backup, protection, network and more.',
    'service': 'Every six weeks on a support plan: updates, security, drives and backup, written up.',
    'visits': 'Book, change or cancel a service in the app, with reminders before each visit.',
    'free': 'What is free for ever, and what a support plan adds.',
    'cleaner': 'No invented problem counts and nothing to pay to &ldquo;fix&rdquo;.',
    'microsoft': 'No. Similar names, different things.',
    'workshop': 'Who builds it, and what is being worked on next.',
}

_GROUPS = {
    'more': ('More it can do', 'Tap any row to open it.', ['virgin', 'broadband', 'bench', 'family', 'power', 'checks']),
    'plan': ('On a 365 support plan', 'The app is free. A plan is for when you would rather we looked after it.', ['service', 'visits']),
    'before': ('Good to know before you install', '', ['free', 'cleaner', 'microsoft', 'workshop']),
}
ORDER = ['hero', 'intents', 'proof', 'abroad', 'download', 'looks', 'reel', 'trust', 'does', '@more', 'whatsnew',
         'musthave', '@plan', '@before', '*', 'faq', 'cta']
NEW_SHOWN = 4   # "what's new" cards left open (the wide one + a row of three)

CSS = ('<style>'
       '.pcmx-group{padding-top:2.4rem;padding-bottom:2.4rem}.pcmx-group>.wrap{max-width:1000px}'
       '.pcmx-group .section-head{margin-bottom:1.1rem}'
       '.pcmx{border:1px solid var(--line);border-radius:16px;background:var(--glass);margin:.7rem 0;overflow:hidden;'
       'scroll-margin-top:calc(var(--header-h,76px) + 1rem)}'
       '.pcmx>summary{list-style:none;cursor:pointer;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.2rem 1rem;'
       'align-items:center;padding:1rem 1.25rem}.pcmx>summary::-webkit-details-marker{display:none}'
       '.pcmx>summary:hover .pcmx__h{text-decoration:underline;text-underline-offset:4px}'
       '.pcmx>summary:focus-visible{outline:2px solid currentColor;outline-offset:-4px;border-radius:16px}'
       '.pcmx h2.pcmx__h{grid-column:1;margin:0;font-family:var(--font-display);font-weight:600;font-size:1.16rem;line-height:1.3;'
       'letter-spacing:0;color:var(--ink);text-align:left}'
       '.pcmx__s{grid-column:1;color:var(--muted);font-size:.95rem;line-height:1.45}'
       '.pcmx>summary::after{content:"+";grid-column:2;grid-row:1/span 2;font:400 1.7rem/1 var(--font-body);color:var(--muted)}'
       '.pcmx[open]>summary::after{content:"\\2212"}'
       '.pcmx__body{padding:1.4rem 1.25rem 1.6rem;border-top:1px solid var(--line)}'
       '.pcmx__body>.wrap{max-width:none;width:auto;padding:0;margin:0}'
       '.pnew-more{max-width:1120px;margin:1.3rem auto 0}'
       '.pnew-more>summary{list-style:none;cursor:pointer;width:max-content;max-width:100%;margin:0 auto;padding:.7rem 1.3rem;'
       'border-radius:999px;border:1px solid var(--line);background:var(--glass);color:var(--ink);font-weight:600}'
       '.pnew-more>summary::-webkit-details-marker{display:none}.pnew-more>summary::after{content:" +"}'
       '.pnew-more[open]>summary::after{content:" \\2212"}'
       '.pnew-more__hist{max-width:820px;margin:1.3rem auto 0;color:var(--muted);line-height:1.6}'
       # the merged "see it + what it does" block: menu buttons, the picture, and that screen's feature cards beside it
       '.pcmt{max-width:1240px;margin:1.2rem auto 0}'
       '.pcmt__tabs{display:flex;flex-wrap:wrap;gap:.5rem;justify-content:center;margin-bottom:1.3rem}'
       '.pcmt__stage{display:grid;grid-template-columns:minmax(0,1.12fr) minmax(0,1fr);gap:1.6rem 2rem;align-items:start}'
       '.pcmt__shot{position:relative;aspect-ratio:1012/736;filter:drop-shadow(0 18px 28px rgba(0,0,0,.3))}'
       '.pcmt__cap{margin:0 0 .8rem;font-family:var(--font-display);font-weight:600;font-size:1.2rem;line-height:1.3;color:var(--ink)}'
       '.pcmt__panel{display:grid;gap:.6rem;align-content:start}.pcmt__panel+.pcmt__panel{margin-top:1.6rem}'
       '.pcmt.is-on .pcmt__panel{margin-top:0}.pcmt.is-on .pcmt__panel:not(.is-sel){display:none}'
       '.pcmt__panel .tile{display:grid;grid-template-columns:auto minmax(0,1fr);gap:.4rem .65rem;align-items:center;align-content:start;padding:.85rem 1rem .95rem;margin:0}'
       '.pcmt__panel .tile>svg{margin:0}.pcmt__panel .tile h3{margin:0;font-size:1rem;line-height:1.25}'
       '.pcmt__panel .tile p{grid-column:1/-1;margin:0;font-size:.92rem;line-height:1.5}'
       '.pcmt__panel .pcmt__cap{margin-bottom:.2rem}'
       '.pcmt__panel .pcmt__cap{grid-column:1/-1}'
       '@media(min-width:1180px){.pcmt__panel--many{grid-template-columns:1fr 1fr}}'
       '@media(max-width:900px){.pcmt__stage{grid-template-columns:1fr;gap:1rem}.pcmt__shot{max-width:640px;width:100%;margin:0 auto}'
       '.pcmt__cap{font-size:1.08rem}.pcmt__tabs{gap:.4rem;margin-bottom:1rem}}'
       '@media(max-width:600px){.pcmt-sec .lede{font-size:.93rem;line-height:1.5}.pcmt-sec .section-head{margin-bottom:.4rem}'
       '.pcmt .pcmtour__tab{padding:.36rem .75rem;font-size:.82rem}}'
       '@media(max-width:600px){.pcmx>summary{padding:.85rem .95rem}.pcmx h2.pcmx__h{font-size:1.05rem}'
       '.pcmx__s{font-size:.9rem}.pcmx__body{padding:1rem .95rem 1.2rem}.pcmx-group{padding-top:1.6rem;padding-bottom:1.6rem}}'
       '</style>')

# a link to something inside a closed row opens the row first (other pages link to #six-weekly-service, #broadband ...)
_JS = ('<script>(function(){function go(h){if(!h||h.length<2)return;var t;try{t=document.getElementById(decodeURIComponent(h.slice(1)))}'
       'catch(e){}if(!t)return;var d=t.closest("details"),ch=false;while(d){if(!d.open){d.open=true;ch=true}'
       'd=d.parentElement&&d.parentElement.closest("details")}if(ch)setTimeout(function(){t.scrollIntoView({block:"start"})},60)}'
       'go(location.hash);addEventListener("hashchange",function(){go(location.hash)});'
       'document.addEventListener("click",function(e){var a=e.target.closest&&e.target.closest(\'a[href^="#"]\');'
       'if(a)go(a.getAttribute("href"))})})();</script>')

_ANIM = re.compile(r'\s(?:data-reveal|data-stagger|data-title)(?:="[^"]*")?(?=[\s>])')


def _fold(key, sec):
    """One long section -> one fold-out row. Its H2 becomes the row's title; everything else is the body, word for word."""
    pre = sec[:sec.index('<section')]          # a script/style that travelled with the section stays outside the row
    sec = sec[len(pre):]
    tag = re.match(r'<section\b([^>]*)>', sec)
    inner = sec[tag.end():sec.rindex('</section>')]
    h =re.search(r'<h2\b[^>]*>(.*?)</h2>', inner, re.S)
    assert h, key
    title = re.sub(r'<span class="title-underline[^"]*"></span>', '', h.group(1)).strip()
    inner = inner[:h.start()] + inner[h.end():]
    inner = re.sub(r'<p class="eyebrow[^"]*"[^>]*>.*?</p>\s*', '', inner, count=1, flags=re.S)   # the label above the old title
    inner = _ANIM.sub('', inner)      # a row's content is simply there when it opens: no scroll animation to wait for
    sid = re.search(r'\bid="([^"]+)"', tag.group(1))
    return pre + ('      <details class="pcmx"' + (' id="' + sid.group(1) + '"' if sid else '') + '>\n'
            '        <summary><h2 class="pcmx__h">' + title + '</h2><span class="pcmx__s">' + _TEASE[key] + '</span></summary>\n'
            '        <div class="pcmx__body">' + inner.strip('\n') + '\n        </div>\n      </details>\n')


def _group(gkey, secs):
    title, lede, keys = _GROUPS[gkey]
    rows = ''.join(_fold(k, secs[k]) for k in keys if k in secs)
    if not rows:
        return ''
    return ('    <section class="section pcmx-group" aria-label="' + title + '">\n      <div class="wrap">\n'
            '        <div class="section-head"><h2 class="section-title section-title--center">' + title
            + '<span class="title-underline title-underline--center"></span></h2>'
            + ('<p class="lede lede--center">' + lede + '</p>' if lede else '') + '</div>\n' + rows + '      </div>\n    </section>\n')


# which feature cards sit beside which picture (the tab's own name -> the cards' titles, as written on the cards)
_TOUR = {
    'Home': ['Health score', 'Check everything', 'Eco, Everyday or Full speed'],
    'Safety': ['Scam check &amp; safety settings', 'Network safety &amp; programs'],
    'My PC': ['Boost, performance &amp; every drive', 'Windows Update &amp; printers', 'What keeps going wrong',
              'Screen &amp; sound check', 'Gaming check'],
    'Internet &amp; email': ['Network check &amp; devices', 'Virgin email: check &amp; move'],
    'Photos &amp; files': ['Backup &amp; OneDrive check'],
    'Get help': ['Help in one tap'],
    'Booking': ['Service visits, reminders &amp; reports'],
    'Games': ['Games'],
}
# 13 Nov 2026 (owner: "write the sentences for Music, Radio and DJ decks"): these three pictures had no feature cards.
# Every claim is one the page already makes in its "what's new" cards.
def _tile(ico, title, text):
    return ('<div class="tile"><svg class="tile__ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" '
            'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ico + '</svg><h3>' + title + '</h3><p>' + text + '</p></div>')


_TOUR_EXTRA = {
    'Music': [
        _tile('<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>', 'Music &amp; videos',
              'Your songs, albums, playlists (iTunes ones too), CDs and videos in one window, with an equaliser, Volume boost, '
              'Night mode and Clear speech.'),
        _tile('<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21a2 2 0 0 1 2-2h13v2z"/>', 'Audiobooks, webcams &amp; a light show',
              'Free classic audiobooks read aloud by LibriVox volunteers, webcams from round the world, and a light show that '
              'follows the beat of whatever is playing.'),
    ],
    'Radio': [
        _tile('<rect x="3" y="8" width="18" height="12" rx="2"/><path d="M7 8l10-5"/><circle cx="8.5" cy="14" r="2.5"/><path d="M15 12h3M15 16h3"/>',
              'Radio near you',
              'The stations for your country, a Near you list of local ones, and the BBC stations a tap away. Tap the heart to '
              'keep your favourites.'),
        _tile('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M5 3 2 6M19 3l3 3"/>', 'Wake-up &amp; away timer',
              'Wake to the radio starting almost silent and rising gently. Or have it play between set times while you&rsquo;re '
              'out, so the house sounds lived-in.'),
    ],
    'DJ decks': [
        _tile('<path d="M3 12h3l2-6 4 12 3-9 2 3h4"/>', 'Auto DJ',
              'Mixes each song into the next on the beat. Nothing to learn: put your music on and leave it to it.'),
        _tile('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/><path d="M12 3v2M12 19v2"/>', 'Have a go on the decks',
              'Two turntables you can scratch, with cue points, loops, effects, a sampler and video mixing.'),
    ],
}
_TOUR_JS = ('<script>(function(){var r=document.getElementById("pcmtour");if(!r)return;'
            'var t=[].slice.call(r.querySelectorAll("[role=tab]")),m=[].slice.call(r.querySelectorAll(".pcmt__shot img")),'
            'p=[].slice.call(r.querySelectorAll(".pcmt__panel"));'
            'function sel(i){t.forEach(function(b,j){b.setAttribute("aria-selected",j===i?"true":"false");b.tabIndex=j===i?0:-1});'
            'm.forEach(function(g,j){g.style.opacity=j===i?"1":"0"});p.forEach(function(d,j){d.classList.toggle("is-sel",j===i)})}'
            't.forEach(function(b,i){b.addEventListener("click",function(){sel(i)});b.addEventListener("keydown",function(e){var n=null;'
            'if(e.key==="ArrowRight"||e.key==="ArrowDown")n=(i+1)%t.length;else if(e.key==="ArrowLeft"||e.key==="ArrowUp")n=(i-1+t.length)%t.length;'
            'if(n!==null){e.preventDefault();t[n].focus();sel(n)}})});r.classList.add("is-on");sel(0)})();</script>')


def _merge_tour(looks, does):
    """The picture tour and the feature cards become ONE block: pick a menu item, see that screen and what it does.
    Every card and every caption stays in the page as text. Returns None (and the two sections stay as they were) if the
    old markup is not what this expects, so a change upstream can never lose a card."""
    try:
        pre = looks[:looks.index('<section')] + does[:does.index('<section')]
        tabs = re.findall(r'<button type="button" role="tab"[^>]*data-i="(\d+)">(.*?)</button>', looks)
        imgs = re.findall(r'<img data-i="\d+"[^>]*/>', looks)
        caps = re.search(r"var caps=\['(.*?)'\];", looks).group(1).split("','")
        style = re.search(r'<style>.*?</style>', looks, re.S).group(0)
        l_h2 = re.search(r'<h2\b[^>]*>(.*?)</h2>', looks, re.S).group(1)
        l_lede = re.search(r'<p class="lede[^>]*>(.*?)</p>', looks, re.S).group(1)
        d_h2 = re.search(r'<h2\b[^>]*>(.*?)</h2>', does, re.S).group(1)
        tiles = re.findall(r'<div class="tile">.*?</p></div>', does, re.S)
        byname = {re.search(r'<h3>(.*?)</h3>', t, re.S).group(1): t for t in tiles}
        names = [n for _, n in tabs]
        assert len(tabs) == len(imgs) == len(caps) and len(byname) == len(tiles) and does.count('<div class="tile">') == len(tiles)
        placed = [c for n in names for c in _TOUR.get(n, [])]
        assert sorted(placed) == sorted(byname) and not [n for n in _TOUR if n not in names], (sorted(set(byname) - set(placed)), sorted(set(placed) - set(byname)))
    except (AssertionError, AttributeError, ValueError) as e:
        print('  pcm_page_compact: tour NOT merged (markup changed):', repr(e)[:200])
        return None
    strip = lambda h: re.sub(r'<span class="title-underline[^"]*"></span>', '', h).strip()
    btns = ''.join('            <button type="button" role="tab" id="pcmt-tab-%d" aria-selected="%s" aria-controls="pcmt-panel-%d" class="pcmtour__tab">%s</button>\n'
                   % (i, 'true' if i == 0 else 'false', i, n) for i, n in enumerate(names))
    panels = ''.join('              <div class="pcmt__panel%s%s" role="tabpanel" id="pcmt-panel-%d" aria-labelledby="pcmt-tab-%d">\n'
                     '                <p class="pcmt__cap">%s</p>\n%s              </div>\n'
                     % (' is-sel' if i == 0 else '', ' pcmt__panel--many' if len(_TOUR.get(n, [])) > 3 else '', i, i, caps[i],
                        ''.join('                ' + t + '\n' for t in [byname[c] for c in _TOUR.get(n, [])] + _TOUR_EXTRA.get(n, [])))
                     for i, n in enumerate(names))
    return (pre + '    <section class="section pcmt-sec" aria-label="What it looks like and what it does">\n      <div class="wrap">\n'
            '        <div class="section-head">\n          <h2 class="section-title section-title--center">' + strip(d_h2)
            + '<span class="title-underline title-underline--center"></span></h2>\n'
            '          <p class="lede lede--center"><strong>' + strip(l_h2) + '.</strong> ' + l_lede + '</p>\n        </div>\n'
            '        <div id="pcmtour" class="pcmt">\n          <div role="tablist" aria-label="Pick a part of the app" class="pcmt__tabs">\n' + btns
            + '          </div>\n          <div class="pcmt__stage">\n            <div class="pcmt__shot" id="tour-panel">\n'
            + ''.join('              ' + m + '\n' for m in imgs)
            + '            </div>\n            <div class="pcmt__panels">\n' + panels + '            </div>\n          </div>\n        </div>\n      </div>\n      '
            + style + '\n      ' + _TOUR_JS + '\n    </section>\n')


def _trim_whatsnew(sec):
    """Newest NEW_SHOWN cards stay; the rest, and the version-by-version history in the intro, go behind one row."""
    g = sec.find('<div class="pnew"')
    if g < 0:
        return sec
    gend = sec.index('>', g) + 1
    close = sec.find('<p class="pnew__foot', gend)
    if close < 0:
        return sec
    grid_close = sec.rindex('</div>', gend, close)
    cards = [m.start() for m in re.finditer(r'<article class="pnew__card', sec[gend:grid_close])]
    if len(cards) <= NEW_SHOWN + 1:
        return sec
    cut = gend + cards[NEW_SHOWN]
    older = _ANIM.sub('', sec[cut:grid_close])
    hist = ''
    lede = re.search(r'(<p class="lede[^>]*>)(.*?)(</p>)', sec[:g], re.S)
    if lede:
        vers = [m.start() for m in re.finditer(r'Version \d+\.\d+ ', lede.group(2))]
        if len(vers) >= 2:      # keep what the newest version does; the earlier versions' sentences move down
            body = lede.group(2)
            tail = '<strong>Already have the app? It updates itself.</strong>'
            rest = body[vers[1]:]
            keep = body[:vers[1]].rstrip()
            if tail in rest:
                rest = rest.replace(tail, '').rstrip()
                keep += ' ' + tail
            hist = '          <p class="pnew-more__hist">' + rest + '</p>\n'
            sec = sec[:lede.start(2)] + keep + sec[lede.end(2):]
            shift = len(keep) - len(body)
            cut += shift; grid_close += shift
    n = len(cards) - NEW_SHOWN
    more = ('</div>\n        <details class="pnew-more" id="older-updates">\n          <summary>Show ' + str(n) + ' earlier updates</summary>\n'
            + hist + '          <div class="pnew">\n          ' + older.rstrip() + '\n          </div>\n        </details>\n        ')
    # the grid's own </div> is replaced by `more`, which closes the first grid and the second one
    return sec[:cut] + more + sec[grid_close + len('</div>'):]


def compact(content):
    ms = list(_SEC.finditer(content))
    assert ms and content.count('<section') == len(ms), 'sections nest or did not parse: %d vs %d' % (content.count('<section'), len(ms))
    head = content[:ms[0].start()]
    tail = content[ms[-1].end():]
    secs, extra, prev = {}, [], ms[0].start()
    for m in ms:
        gap = content[prev:m.start()]          # a <script>/<style> written just before a section travels with it
        prev = m.end()
        tag = re.match(r'\s*<section\b[^>]*>', m.group(0)).group(0)
        key = next((k for k, mark in _KEYS if mark in tag), None)
        blk = gap + m.group(0)
        if key is None or key in secs:
            extra.append(blk)
            print('  pcm_page_compact: UNPLACED section (add it to ORDER):', re.sub(r'\s+', ' ', tag)[:110])
        else:
            secs[key] = blk
    if 'whatsnew' in secs:
        secs['whatsnew'] = _trim_whatsnew(secs['whatsnew'])
    if 'looks' in secs and 'does' in secs:
        merged = _merge_tour(secs['looks'], secs['does'])
        if merged:
            secs['looks'] = merged
            del secs['does']
    out, used = [head, '    ' + CSS + '\n'], set()
    for item in ORDER:
        if item == '*':
            out.extend(extra)
        elif item.startswith('@'):
            out.append(_group(item[1:], secs)); used.update(_GROUPS[item[1:]][2])
        elif item in secs:
            out.append(secs[item]); used.add(item)
    missing = [k for k in secs if k not in used]
    assert not missing, missing
    out.append('    ' + _JS + '\n')
    out.append(tail)
    return ''.join(out)
