# -*- coding: utf-8 -*-
"""Light theme (12 Nov 2026, owner + David: the dark site is harder to read for older eyes).

The site was built dark. Rather than hand-write a second stylesheet, this module derives the
light one: for every CSS rule that names a literal colour it emits the same selector scoped to
html[data-theme="light"] carrying only the re-mapped colour declarations. Because EVERY colour
rule gets a scoped twin with the same extra specificity, the cascade between them is unchanged.
Dark stays exactly as written: a page without data-theme="light" never matches a line of this.

  light_css(css)          -> the scoped light rules for a stylesheet (styles.css -> styles.min.css)
  theme_page(slug, html)  -> a PAGE_FILTER: stamps the page light, adds the pre-paint switch and
                             the light twins of the page's own <style> blocks

Hand fixes that no mapping can guess live in css/light-extra.css (appended after the twins).
Pages whose own styling has not been checked in light yet are listed in NOT_YET and stay dark.
"""
import re, colorsys

SCOPE = 'html[data-theme="light"]'
INK = (21, 34, 66)            # #152242, the light theme's body ink
MIX_BLACK = '#c5d2e6'         # what "mix with black" (a recessed dark panel) becomes on a light page

# Page families that keep the dark look until their own styling has been checked in light.
NOT_YET = ('games', 'bournemouth/games', 'dementia-clock')

_HEX = re.compile(r'#([0-9a-fA-F]{3,8})\b(?![0-9a-zA-Z_-])')
_RGB = re.compile(r'\b(rgba?)\(([^()]*)\)')
_HAS_COLOUR = re.compile(r'#[0-9a-fA-F]{3,8}\b|\brgba?\(|(?<![\w-])(?:white|black)(?![\w-])')


def _conv(r, g, b):
    """One colour of the dark palette -> its light-theme counterpart."""
    h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    hue = h * 360
    if r == g == b == 0:
        return (0, 0, 0)
    if s > .45 and .28 <= l <= .8:              # accents: keep the hue, deepen so they read on white
        l2 = min(.42, max(.28, 1 - l)) if l >= .55 else min(.42, max(.28, l * .82))
        if 85 <= hue <= 200: l2 = min(l2, .29)  # greens and teals
        if 35 <= hue <= 65:  l2 = min(l2, .36)  # golds
        l = l2
    else:                                        # neutrals and navy surfaces: flip the lightness
        l = 1 - l * .92
        if l > .8:
            s *= .45
        elif l < .3:
            if s < .12: h, s = 222 / 360, .5     # white text -> navy ink, not grey
            s = min(s, .55)
    r2, g2, b2 = colorsys.hls_to_rgb(h, l, s)
    return (round(r2 * 255), round(g2 * 255), round(b2 * 255))


def _lum(r, g, b):
    return colorsys.rgb_to_hls(r / 255, g / 255, b / 255)[1]


def _hexsub(m):
    x = m.group(1); a = ''
    if len(x) in (3, 4): x = ''.join(c * 2 for c in x)
    if len(x) == 8: a, x = x[6:], x[:6]
    if len(x) != 6: return m.group(0)
    return '#%02x%02x%02x%s' % (_conv(int(x[0:2], 16), int(x[2:4], 16), int(x[4:6], 16)) + (a,))


def _rgbsub(m):
    parts = [p for p in re.split(r'[,\s/]+', m.group(2).strip()) if p]
    if len(parts) < 3 or any('%' in p or 'var' in p or 'calc' in p for p in parts[:3]):
        return m.group(0)
    try:
        r, g, b = (int(float(p)) for p in parts[:3])
    except ValueError:
        return m.group(0)
    a = parts[3] if len(parts) > 3 else None
    if r == g == b == 0 and a is not None:       # black shadows and scrims: far lighter on a light page
        try: a = ('%.3f' % (float(a) * .3)).rstrip('0').rstrip('.')
        except ValueError: pass
    r, g, b = _conv(r, g, b)
    return 'rgba(%d,%d,%d,%s)' % (r, g, b, a) if a is not None else 'rgb(%d,%d,%d)' % (r, g, b)


def _map_value(v):
    v = re.sub(r'color-mix\(([^()]|\([^()]*\))*\)',
               lambda m: re.sub(r'#000000\b|#000\b|(?<![\w-])black(?![\w-])', MIX_BLACK, m.group(0)), v)
    v = _HEX.sub(_hexsub, v)
    v = _RGB.sub(_rgbsub, v)
    return v


def _is_light_neutral(v):
    """True when the value is plain white / near-white (a deliberately white panel or white text)."""
    v = v.replace('!important', '').strip().lower()
    if v in ('white', '#fff', '#ffffff'): return True
    m = re.fullmatch(r'#([0-9a-f]{6})', v)
    if m:
        x = m.group(1); r, g, b = int(x[0:2], 16), int(x[2:4], 16), int(x[4:6], 16)
        h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
        return l > .93 and s < .35
    return False


def _split(s, sep):
    """Split on sep outside (), [] and strings."""
    out, depth, q, cur = [], 0, None, []
    for ch in s:
        if q:
            cur.append(ch)
            if ch == q: q = None
            continue
        if ch in '"\'': q = ch
        elif ch in '([': depth += 1
        elif ch in ')]': depth -= 1
        if ch == sep and depth == 0:
            out.append(''.join(cur)); cur = []
        else:
            cur.append(ch)
    out.append(''.join(cur))
    return out


def _scope_selector(sel, where=True):
    """Scope a selector list to the light theme. where=True adds NO specificity (the twin sits right
    after its rule, so the cascade is exactly the dark one); where=False outranks the rule, for CSS
    this file cannot sit next to (the rules a script injects)."""
    out = []
    for s in _split(sel, ','):
        s = s.strip()
        if not s: continue
        if not where:
            if s.startswith(':root'): out.append(':root[data-theme="light"]' + s[5:])
            elif re.match(r'html(?![\w-])', s): out.append(SCOPE + s[4:])
            else: out.append(SCOPE + ' ' + s)
        elif s.startswith(':root'):
            out.append(':root:where([data-theme="light"])' + s[5:])
        elif re.match(r'html(?![\w-])', s):
            out.append('html:where([data-theme="light"])' + s[4:])
        else:
            out.append(':where(' + SCOPE + ') ' + s)
    return ','.join(out)


_SURFACE_VAR = re.compile(r'var\(--(?:glass|bg|line|hp-card|hp-edge|card|panel|surface)')
_COMMENT = re.compile(r'/\*.*?\*/', re.S)


def _cap_text(v):
    """A text colour must read on a light page: pull a mapped mid-tone down to a readable depth."""
    m = re.fullmatch(r'#([0-9a-f]{6})', v.strip().lower())
    if not m: return v
    x = m.group(1); r, g, b = int(x[0:2], 16), int(x[2:4], 16), int(x[4:6], 16)
    h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    cap = .26 if 30 <= h * 360 <= 70 else .36       # golds need to go deeper than blues to read
    if l <= cap + .01: return v
    r, g, b = colorsys.hls_to_rgb(h, cap, s)
    return '#%02x%02x%02x' % (round(r * 255), round(g * 255), round(b * 255))


def _light_decls(body):
    decls = []
    for d in _split(_COMMENT.sub('', body), ';'):
        if ':' not in d: continue
        prop, val = d.split(':', 1)
        prop = prop.strip(); val = val.strip()
        if not prop or not val: continue
        decls.append((prop, val))
    # does this rule paint its own strong fill (a button, a badge)? then white text on it stays white
    fill = False
    for prop, val in decls:
        if prop.lower() not in ('background', 'background-color', 'background-image'): continue
        if _is_light_neutral(val): continue
        if _HAS_COLOUR.search(val):
            mapped = _map_value(val)
            cols = [c for c in re.findall(r'#([0-9a-f]{6})\b', mapped.lower())] + \
                   ['%02x%02x%02x' % tuple(int(n) for n in re.split(r'[,\s]+', c)[:3]) for c in re.findall(r'rgba?\((\d+[,\s]+\d+[,\s]+\d+)', mapped)]
            if cols and all(_lum(int(c[0:2], 16), int(c[2:4], 16), int(c[4:6], 16)) < .5 for c in cols) \
               and not re.search(r'rgba\([^)]*,\s*0?\.[0-4]\d*\)', mapped):
                fill = True
        elif 'var(--' in val and not _SURFACE_VAR.search(val) and 'transparent' not in val and 'color-mix' not in val:
            fill = True                                # an accent token as the fill (background:var(--cyan))
    out = []
    for prop, val in decls:
        if not _HAS_COLOUR.search(val): continue
        p = prop.lower()
        if 'mask' in p: continue
        if p in ('background', 'background-color') and _is_light_neutral(val):
            continue                                   # a white panel stays white
        if p == 'color' and _is_light_neutral(val):
            if fill: continue                          # white lettering on a strong fill stays white
            new = '#%02x%02x%02x' % INK + (' !important' if '!important' in val else '')
        else:
            new = re.sub(r'(?<![\w-])white(?![\w-])', '#152242', val) if p == 'color' else val
            new = _map_value(new)
            if p == 'color' and not fill:
                imp = ' !important' if '!important' in new else ''
                new = _cap_text(new.replace('!important', '').strip()) + imp
        if new != val:
            out.append(prop + ':' + new)
    return ';'.join(out)


def _rules(css):
    """Yield (start, brace, end) per top-level block: css[start:brace] is the prelude, css[brace+1:end-1] the body."""
    i, n = 0, len(css)
    start = 0; depth = 0; brace = -1
    while i < n:
        ch = css[i]
        if ch == '/' and css.startswith('/*', i):
            j = css.find('*/', i + 2); j = n if j < 0 else j + 2
            if depth == 0 and not css[start:i].strip(): start = j
            i = j; continue
        if ch == '"' or ch == "'":
            j = i + 1
            while j < n and css[j] != ch:
                j += 2 if css[j] == '\\' else 1
            i = j + 1; continue
        if ch == '{':
            if depth == 0: brace = i
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                yield start, brace, i + 1
                start = i + 1
            elif depth < 0:
                depth = 0; start = i + 1
        elif ch == ';' and depth == 0:
            start = i + 1
        i += 1


_NEST = ('@media', '@supports', '@container', '@layer')


def light_css(css, where=False):
    """Only the light twins of css (for CSS that lives somewhere this file cannot edit)."""
    out = []
    for start, brace, end in _rules(css):
        prelude = _COMMENT.sub('', css[start:brace]).strip()
        body = css[brace + 1:end - 1]
        if not prelude: continue
        if prelude.startswith('@'):
            if prelude.split()[0].lower() in _NEST:
                inner = light_css(body, where)
                if inner: out.append(prelude + '{' + inner + '}')
            continue                                    # @keyframes, @font-face, @property: left alone
        decls = _light_decls(body)
        if decls:
            out.append(_scope_selector(prelude, where) + '{' + decls + '}')
    return ''.join(out)


_MARK1, _MARK2 = '/*LT*/', '/*TL*/'


def themed_css(css, mark=False):
    """css with each colour rule followed by its light twin (same specificity, so the same cascade)."""
    m1, m2 = (_MARK1, _MARK2) if mark else ('', '')
    out = []; pos = 0
    for start, brace, end in _rules(css):
        prelude = _COMMENT.sub('', css[start:brace]).strip()
        body = css[brace + 1:end - 1]
        if not prelude: continue
        if prelude.startswith('@'):
            if prelude.split()[0].lower() in _NEST:
                out.append(css[pos:brace + 1] + themed_css(body, mark) + '}'); pos = end
            continue
        decls = _light_decls(body)
        if decls:
            out.append(css[pos:end] + m1 + _scope_selector(prelude, True) + '{' + decls + '}' + m2); pos = end
    out.append(css[pos:])
    return ''.join(out)


# ---- pages ---------------------------------------------------------------------------------
# before first paint: a visitor who chose dark gets dark, with no flash of the light page
SWITCH = ('<script>try{if(localStorage.getItem("theme")==="dark")'
          'document.documentElement.setAttribute("data-theme","dark")}catch(e){}</script>')
_STYLE = re.compile(r'(<style(?![^>]*data-no-theme)[^>]*>)(.*?)(</style>)', re.S)
_UNMARK = re.compile(re.escape(_MARK1) + r'.*?' + re.escape(_MARK2), re.S)


def _style_twin(m):
    return m.group(1) + themed_css(_UNMARK.sub('', m.group(2)), mark=True) + m.group(3)


def theme_page(slug, html):
    """PAGE_FILTER: make one built page light by default (dark for visitors who chose it)."""
    if any(slug == p or slug.startswith(p + '/') for p in NOT_YET):
        return html
    if '<html lang="en-GB">' not in html:
        return html
    html = html.replace('<html lang="en-GB">', '<html lang="en-GB" data-theme="light">', 1)
    html = html.replace('<meta charset="UTF-8" />', '<meta charset="UTF-8" />\n  ' + SWITCH, 1) if SWITCH not in html else html
    html = html.replace('<meta name="theme-color" content="#070d22"', '<meta name="theme-color" content="#f4f7fb"', 1)
    return _STYLE.sub(_style_twin, html)


# what the content hash must ignore, so switching the theme on does not claim every page changed today
VOLATILE = [
    (re.compile(r' data-theme="light"'), ''),
    (re.compile(re.escape('\n  ' + SWITCH)), ''),
    (re.compile(re.escape(_MARK1) + r'.*?' + re.escape(_MARK2), re.S), ''),
    (re.compile(r'<meta name="theme-color" content="#f4f7fb"'), '<meta name="theme-color" content="#070d22"'),
]


def js_css(src):
    """The CSS a script injects through double-quoted string literals (interior.js: the share sheet)."""
    return ''.join(re.findall(r'"([^"]*\{[^"]*\})"', src))
