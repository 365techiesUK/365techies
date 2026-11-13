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
       # the 16 feature cards: four to a row with the icon beside the title (was three to a row, one left over)
       'section[aria-label="What it does"] .tile-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.8rem;max-width:1240px;margin-left:auto;margin-right:auto}'
       'section[aria-label="What it does"] .tile{display:grid;grid-template-columns:auto minmax(0,1fr);gap:.45rem .65rem;align-items:center;align-content:start;padding:1rem 1.05rem 1.1rem;margin:0}'
       'section[aria-label="What it does"] .tile>svg{margin:0}'
       'section[aria-label="What it does"] .tile h3{margin:0;font-size:1rem;line-height:1.25}'
       'section[aria-label="What it does"] .tile p{grid-column:1/-1;margin:0;font-size:.92rem;line-height:1.5}'
       '@media(max-width:1100px){section[aria-label="What it does"] .tile-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}'
       '@media(max-width:600px){section[aria-label="What it does"] .tile-grid{grid-template-columns:1fr;gap:.55rem}'
       'section[aria-label="What it does"] .tile{padding:.8rem .9rem .9rem}}'
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
