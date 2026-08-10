# /ai/ section — foundation pages (blueprint docs 04 s34-35, 05 v1.1 s27.5/s48).
#
# Copy lives in ai_pages_data.py (the house content-pack pattern); the premium
# visual layer (route-scoped CSS, animated hero scenes, icon mapping) lives in
# ai_visual.py. This module renders one into the other through the standard
# build_pages vocabulary and registers via add(). Nested slugs ("ai/agents")
# work natively: write_all() os.path.joins the slug and makedirs the tree.
#
# LAYOUT: each section's copy is classified and rendered as the component that
# actually fits it, instead of a wall of prose -
#   * list of "<strong>Title</strong> - description" items  -> animated card grid
#   * plain list items                                      -> drawn-tick checklist
#   * a numbered/worked example                             -> numbered step rail
#   * everything else                                       -> prose, with an
#     animated icon badge beside the heading
# The classifier reads the copy; it never rewrites it, so ai_pages_data.py
# remains the single source of the words.
#
# ⚠ AI_LAUNCH GATE: False = register() is a no-op and the build output is
# byte-identical to a build without this module (freeze-safe by construction).
#
# Commercial rules baked in (owner decision 2026-08-07): monthly service
# subscription + separately quoted design/build; the ONLY published AI price is
# the voice page's From £95/month (AI_VOICE_FROM in build_extra); every other
# page says "Monthly service — confirmed with your quote". The build guard
# (tools_check_ai_commercial.py) scans everything under ai/ once emitted.

import re

AI_LAUNCH = True    # launched 2026-08-08 on the owner's explicit word ("launch it")


def register():
    if not AI_LAUNCH:
        return
    import build_pages as bp
    from ai_pages_data import PAGES

    for p in PAGES:
        _emit(p, bp)
    _intake_page(bp)


# ---------------------------------------------------------------- classifier
_LI = re.compile(r"<li>(.*?)</li>", re.S)
_TITLED = re.compile(r"^\s*(?:<a href=\"([^\"]+)\">)?<strong>(.*?)</strong>(?:</a>)?\s*(.*)$", re.S)
_UL = re.compile(r"<ul>.*?</ul>", re.S)


def _split_list(html):
    """Return (before, items, after). items is [] when there is no single list."""
    m = _UL.search(html)
    if not m:
        return html, [], ""
    items = _LI.findall(m.group(0))
    return html[:m.start()], items, html[m.end():]


def _parse_titled(item):
    """'<strong>Title</strong> — body' (optionally link-wrapped) -> (title, href, body)."""
    m = _TITLED.match(item)
    if not m:
        return None
    href, title, body = m.group(1), m.group(2), m.group(3)
    body = re.sub(r"^\s*(?:&mdash;|&ndash;|-|:)\s*", "", body.strip())
    return title.strip(), href, body.strip()


def _cards_html(items, bp):
    from ai_visual import icon_for
    out = ['<ul class="ai-cards" data-stagger>']
    for it in items:
        title, href, body = it
        head = f'<a href="{href}">{title}</a>' if href else title
        out.append('<li>' + bp.ico(icon_for(title), "ai-cardico")
                   + f'<h3>{head}</h3><p>{body}</p></li>')
    out.append("</ul>")
    return "\n".join(out)


def _checks_html(items):
    tick = ('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"'
            ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
            '<path d="M4 12.5l5 5L20 6.5"/></svg>')
    out = ['<ul class="ai-checks" data-stagger>']
    for i, it in enumerate(items):
        out.append(f'<li style="--d:{0.15 + i * 0.12:.2f}s">{tick}<span>{it.strip()}</span></li>')
    out.append("</ul>")
    return "\n".join(out)


def _steps_html(items):
    out = ['<ol class="ai-steps" data-stagger>']
    for n, it in enumerate(items, 1):
        parsed = _parse_titled(it)
        if parsed:
            title, href, body = parsed
            head = f'<a href="{href}">{title}</a>' if href else title
            out.append(f'<li><span class="ai-step__n mono">{n}</span><h3>{head}</h3><p>{body}</p></li>')
        else:
            out.append(f'<li><span class="ai-step__n mono">{n}</span><p>{it.strip()}</p></li>')
    out.append("</ol>")
    return "\n".join(out)


_PSTRONG = re.compile(r"<p><strong>(.*?)</strong>\s*(.*?)</p>", re.S)

# Sections that ARE one real asset get a panel with a way straight into it.
_SHOWCASE = {
    "/ai-roi-calculator/": "Open the ROI calculator",
    "/365-ai-os/": "Open the 365 AI OS demo",
    "/system-monitoring-demo/": "Open the live dashboard demo",
    "/ai-for-beginners-course/": "Start the free course",
    "/using-ai-safely/": "Read the safety guide",
}


def _para_cards(html):
    """3+ '<p><strong>Question</strong> answer</p>' blocks -> card grid."""
    blocks = _PSTRONG.findall(html)
    if len(blocks) < 3:
        return None, html
    intro = html[:_PSTRONG.search(html).start()]
    tail = html[_PSTRONG.search(html).end() if len(blocks) == 1 else
                [m.end() for m in _PSTRONG.finditer(html)][-1]:]
    return [(t.strip(), None, b.strip()) for t, b in blocks], intro + "" + tail


def _showcase_for(html):
    """The first known asset link in the copy, if this section showcases one."""
    for href, label in _SHOWCASE.items():
        if f'href="{href}"' in html:
            return href, label
    return None, None


def _is_stepwise(h2):
    h = h2.lower()
    return any(k in h for k in ("step by step", "worked example", "how we work", "how it works",
                                "what happens", "from problem to"))


def _section(h2, html, idx, alt, bp):
    """Render one section as the component its copy actually calls for."""
    from ai_visual import icon_for
    before, items, after = _split_list(html)
    body = before

    if items:
        titled = [_parse_titled(i) for i in items]
        if all(t is not None for t in titled):
            body += _steps_html(items) if _is_stepwise(h2) else _cards_html(titled, bp)
        else:
            body += _checks_html(items)
        body += after
    else:
        # no list: maybe strong-led Q&A paragraphs, or a single showcased asset
        cards, rest = _para_cards(html)
        if cards:
            body = rest + _cards_html(cards, bp)
        else:
            href, label = _showcase_for(html)
            if href:
                arrow = ('<svg class="ai-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor"'
                         ' stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'
                         ' aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6"/></svg>')
                body = (f'<div class="ai-show">{html}'
                        f'<a class="ai-show__go" href="{href}">{label}{arrow}</a></div>')
        # otherwise the prose stays exactly as written

    klass = "section section--alt ai-sec" if alt else "section ai-sec"
    eyebrow = "/%02d &mdash; %s" % (idx, _eyebrow(h2))
    badge = ('<span class="ai-badge" style="--d:%.1fs" aria-hidden="true">%s</span>'
             % (idx * 0.4, bp.ico(icon_for(h2), "")))
    return f'''    <section class="{klass}" aria-label="{_attr(h2)}">
      <div class="wrap wrap--narrow">
        <div class="prose" data-reveal>
          <p class="eyebrow mono">{eyebrow}</p>
          <div class="ai-sec__head">{badge}
            <h2 class="section-title" data-title>{h2}<span class="title-underline"></span></h2>
          </div>
{body}
        </div>
      </div>
    </section>'''


# ------------------------------------------------------------------ page emit
# ---- AI section strip: one consistent way around the section on every page.
# Doc 05 s7.3 grouping (Overview / Automate / Plan & adopt / Explore) with the
# current page marked. Deliberately in this file, not ai_visual.py, and in its
# own <style> so it composes with AI_CSS without touching it. No animation,
# so nothing to neutralise for reduced motion.
_STRIP = [
    ("Overview", [("/ai/", "AI overview")]),
    ("Automate", [("/ai/automations/", "Automations"), ("/ai/agents/", "Agents"),
                  ("/ai/voice-agents/", "Voice agents")]),
    ("Plan &amp; adopt", [("/ai/consultancy/", "Consultancy"), ("/ai/training/", "Training")]),
    ("Explore", [("/ai/industries/", "Industries"), ("/ai/tools/", "Tools"),
                 ("/ai/learn/", "Learn")]),
]

_STRIP_CSS = '''<style>
.ai-strip{display:flex;flex-wrap:wrap;gap:.4rem 1.6rem;justify-content:center;
  padding:.9rem 1.2rem;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.ai-strip__group{display:flex;align-items:center;flex-wrap:wrap;gap:.4rem .8rem}
.ai-strip__label{font-family:var(--font-mono);font-size:.68rem;letter-spacing:.1em;
  text-transform:uppercase;color:var(--muted)}
.ai-strip a{color:var(--ink-3);text-decoration:none;font-size:.92rem;
  padding:.55rem .7rem;border-radius:var(--r-sm)}
.ai-strip a:hover{color:var(--cyan-soft)}
.ai-strip a[aria-current="page"]{color:var(--cyan-soft);background:rgba(29,151,227,.12)}
</style>'''


def _strip_html(slug):
    groups = []
    for label, links in _STRIP:
        a = "".join(
            '<a href="%s"%s>%s</a>' % (
                href,
                ' aria-current="page"' if href.strip("/") == slug else "",
                txt)
            for href, txt in links)
        groups.append('<span class="ai-strip__group"><span class="ai-strip__label">%s</span>%s</span>'
                      % (label, a))
    return ('    <nav class="ai-strip" aria-label="AI &amp; Automation section">'
            + "".join(groups)
            + '<span class="ai-strip__group"><a href="/ai/start/">Start an enquiry &#8594;</a></span></nav>')


def _emit(p, bp):
    from ai_visual import AI_CSS, SCENES

    slug = p["slug"]
    is_hub = slug == "ai"
    scene = SCENES.get(slug)

    parts = [AI_CSS,
             bp.hero(bp.bc(p["name"]), p["eyebrow"], p["h1"], p["hero_lede"],
                     cta1=(p["cta_primary"]["label"], p["cta_primary"]["href"]),
                     cta2=(p["cta_secondary"]["label"], p["cta_secondary"]["href"]),
                     chips=p.get("chips") or None)]
    if scene:
        parts.append('    <div class="wrap wrap--narrow"><div class="ai-scene" data-reveal '
                     'aria-hidden="true">' + scene + "</div></div>")
    parts.append(_STRIP_CSS + "\n" + _strip_html(slug))

    alt = False
    for i, s in enumerate(p["sections"], 1):
        parts.append(_section(s["h2"], s["html"], i, alt, bp))
        alt = not alt

    pb = p.get("pricing")
    if pb:
        parts.append(f'''    <section class="section ai-sec" aria-label="Service and build pricing">
      <div class="wrap wrap--narrow" style="text-align:center">
        <p class="eyebrow eyebrow--center mono" data-reveal>// SERVICE &amp; BUILD</p>
        <h2 class="section-title section-title--center" data-title>{pb["subscription_line"]}<span class="title-underline title-underline--center"></span></h2>
        <p class="lede lede--center" data-reveal><strong>{pb["build_line"]}</strong> {pb.get("note", "")}</p>
        <div class="hero-buttons hero-buttons--center" data-reveal style="margin-top:1.4rem">
          <a href="{p["cta_primary"]["href"]}" class="button primary button--lg">{p["cta_primary"]["label"]}</a>
          <a href="/ai/" class="button secondary button--lg">Explore AI &amp; Automation</a>
        </div>
      </div>
    </section>''')

    if p.get("faqs"):
        parts.append(bp.faq_html([(f["q"], f["a"]) for f in p["faqs"]]))

    fc = p["final_cta"]
    parts.append(bp.cta(fc["h2"], fc["lede"],
                        primary=(p["cta_primary"]["label"], p["cta_primary"]["href"]),
                        secondary=(p["cta_secondary"]["label"], p["cta_secondary"]["href"])))

    content = "\n".join(parts)
    faq_pairs = [(f["q"], f["a"]) for f in p.get("faqs", [])]

    def schema(s, _p=p, _faqs=faq_pairs, _hub=is_hub, _bp=bp):
        nodes = []
        if _hub:
            nodes.append(_bp.crumb(s, _p["name"]))
        else:
            nodes.append(_bp.crumb_sub(s, "AI & Automation", "ai", _p["name"]))
        nodes.append(_bp.webpage(s, _p["name"], _p["desc"]))
        if _p.get("service_desc"):
            nodes.append(_bp.service(s, _p["name"], _p["service_desc"]))
        if _faqs:
            nodes.append(_bp.faqpage(s, _faqs))
        return _bp.graph(nodes)

    bp.add(slug=slug, title=p["title"], desc=p["desc"],
           og_title=p.get("og_title", p["title"]), schema=schema, content=content)


def _intake_page(bp):
    """/ai/start/ - the problem-first AI opportunity intake (docs 05 s28-30,
    06 s7). Posts JSON to /api/ai-lead.php (durable store + Slack ping).
    Deliberately NOT class=contact-form: js/forms.js would hijack the submit
    into the HubSpot/slack-lead relay; this form has its own route-scoped
    script (doc 05 s38.2 - no global bundle impact)."""
    from ai_visual import AI_CSS, SCENES

    slug = "ai/start"
    desc = ("Tell us about the repetitive work, missed calls or copy-and-paste jobs eating "
            "your team&rsquo;s week. We&rsquo;ll map the process and reply personally &mdash; no obligation.")
    content = AI_CSS + '''
    <section class="section ai-sec" aria-label="Start an AI enquiry">
      <div class="wrap wrap--narrow">
        <div class="prose" data-reveal>
          <p class="eyebrow mono">// START AN AI ENQUIRY</p>
          <h1 class="section-title" data-title>Tell us what&rsquo;s wasting your time<span class="title-underline"></span></h1>
          <p class="lede">Describe the job in your own words &mdash; the repeated copying, the missed calls, the chasing. You don&rsquo;t need to know what an AI agent is, and nothing here commits you to anything. A person from our Bournemouth team reads every enquiry and replies personally.</p>
        </div>
        <div class="ai-scene" data-reveal aria-hidden="true" style="max-width:460px;margin:1.6rem auto 2rem">''' + SCENES["ai/start"] + '''</div>
        <style>/* the .contact-form card look, WITHOUT the .contact-form class:
          js/forms.js binds every form.contact-form and would double-submit this
          form into the HubSpot/slack-lead relay (proven live on the launch test
          - two Slack pings for one enquiry). Route-scoped rule instead. */
        .ai-intake { padding: clamp(1.6rem, 3vw, 2.4rem); border: 1px solid var(--line); border-radius: var(--r-xl); background: var(--glass); -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px); }</style>
        <form class="ai-intake" id="ai-intake" novalidate>
          <input type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0" />
          <label class="field"><span>What&rsquo;s the repetitive work, delay or problem you want to improve?</span>
            <textarea name="problem" rows="5" required aria-describedby="ai-priv"></textarea></label>
          <p class="cc-note" id="ai-priv">Describe the process in everyday words &mdash; how the work arrives, what someone does with it, where it goes. No passwords, account logins or confidential customer details are needed at this stage.</p>
          <label class="field"><span>Which is closest? (optional)</span>
            <select name="category">
              <option value="">Choose one if it helps&hellip;</option>
              <option value="enquiries-quoting">Enquiries and quoting</option>
              <option value="customer-service-calls">Customer service and calls</option>
              <option value="admin-data-entry">Admin and data entry</option>
              <option value="documents-missing-info">Documents and missing information</option>
              <option value="reporting">Reporting and management updates</option>
              <option value="disconnected-systems">Systems that don&rsquo;t talk to each other</option>
              <option value="not-sure">Not sure &mdash; show me ideas</option>
            </select></label>
          <label class="field"><span>What systems or tools are involved? (optional)</span>
            <input type="text" name="systems" placeholder="e.g. Outlook, Sage, a booking system" /></label>
          <div class="split-2">
            <label class="field"><span>How often does this happen? (optional)</span>
              <select name="frequency"><option value="">Select&hellip;</option><option>Many times a day</option><option>Daily</option><option>Weekly</option><option>Monthly</option><option>Not sure</option></select></label>
            <label class="field"><span>Roughly how many people in the team? (optional)</span>
              <select name="team_size"><option value="">Select&hellip;</option><option>Just me</option><option>2&ndash;4</option><option>5&ndash;9</option><option>10&ndash;24</option><option>25&ndash;49</option><option>50+</option></select></label>
          </div>
          <label class="field"><span>Your name</span><input type="text" name="name" autocomplete="name" required /></label>
          <label class="field"><span>Email</span><input type="email" name="email" autocomplete="email" required /></label>
          <label class="field"><span>Business or organisation</span><input type="text" name="company" autocomplete="organization" required /></label>
          <label class="field"><span>Phone (optional)</span><input type="tel" name="phone" autocomplete="tel" /></label>
          <label class="field"><span>Already a 365 Techies customer?</span>
            <select name="existing_customer"><option value="NOT_SURE">Not sure / prefer not to say</option><option value="YES">Yes</option><option value="NO">No</option></select></label>
          <p class="cc-note">The ongoing service runs on a monthly subscription; the one-off design and build is quoted by complexity once we understand the job. Sending this starts a conversation &mdash; it never commits you to a price or a project.</p>
          <div id="ai-intake-err" role="alert" style="display:none" class="callout callout--warn"></div>
          <button type="submit" class="button primary button--lg" id="ai-intake-send">Send my AI enquiry</button>
        </form>
        <div id="ai-intake-done" style="display:none" class="callout callout--good" role="status">
          <p><strong>Thank you &mdash; your enquiry is in.</strong> Your reference is <span id="ai-intake-ref" class="mono"></span>.</p>
          <p>A person from our team will read it and reply personally. If it&rsquo;s urgent, call <a href="tel:+441202775566">01202 775566</a>.</p>
          <p style="margin-top:0.8rem"><a href="/ai/">Back to AI &amp; Automation</a></p>
        </div>
        <noscript><p class="callout callout--warn">This form needs JavaScript. No problem &mdash; call <a href="tel:+441202775566">01202 775566</a> or use the <a href="/contact/">contact page</a> instead.</p></noscript>
        <p class="cc-note" style="margin-top:1.2rem">Prefer a person from the start? <a href="/contact/">Contact us</a> or call <a href="tel:+441202775566">01202 775566</a> &mdash; you never have to go through a form or a bot to reach us.</p>
      </div>
    </section>
    <script>
    (function(){
      var f=document.getElementById('ai-intake'); if(!f) return;
      var err=document.getElementById('ai-intake-err'), btn=document.getElementById('ai-intake-send');
      var idem=(window.crypto&&crypto.randomUUID)?crypto.randomUUID():('ai-'+Date.now()+'-'+Math.floor(Math.random()*1e9));
      function fail(msg){err.innerHTML=msg;err.style.display='block';btn.disabled=false;btn.textContent='Send my AI enquiry';err.scrollIntoView({block:'nearest'});}
      f.addEventListener('submit',function(e){
        e.preventDefault(); err.style.display='none';
        var d=new FormData(f), miss=[];
        if(!String(d.get('problem')||'').trim()) miss.push('describe the problem');
        if(!String(d.get('name')||'').trim()) miss.push('your name');
        var em=String(d.get('email')||'').trim();
        if(!em||em.indexOf('@')<1||em.indexOf('.',em.indexOf('@'))<0) miss.push('a valid email (name@example.com)');
        if(!String(d.get('company')||'').trim()) miss.push('your business name');
        if(miss.length){fail('Please add: '+miss.join(', ')+'. Everything you&rsquo;ve typed is still here.');return;}
        btn.disabled=true; btn.textContent='Sending…';
        var body={idem:idem,page:location.pathname,cta:new URLSearchParams(location.search).get('via')||'',ref:document.referrer||''};
        ['problem','category','systems','frequency','team_size','name','email','company','phone','existing_customer','website'].forEach(function(k){body[k]=String(d.get(k)||'');});
        fetch('/api/ai-lead.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
          .then(function(r){return r.json().then(function(j){return{s:r.status,j:j};});})
          .then(function(x){
            if(x.j&&x.j.ok){f.style.display='none';document.getElementById('ai-intake-ref').textContent=x.j.ref||'received';document.getElementById('ai-intake-done').style.display='block';document.getElementById('ai-intake-done').scrollIntoView({block:'center'});}
            else if(x.s===422){fail('Please check: '+((x.j&&x.j.fields)||[]).join(', ')+'. Your answers are still here.');}
            else{fail('That didn&rsquo;t send &mdash; nothing was lost. Please try again in a minute, or call <a href="tel:+441202775566">01202 775566</a> / use the <a href="/contact/">contact page</a>.');}
          })
          .catch(function(){fail('That didn&rsquo;t send &mdash; nothing was lost. Please try again in a minute, or call <a href="tel:+441202775566">01202 775566</a> / use the <a href="/contact/">contact page</a>.');});
      });
    })();
    </script>'''

    def schema(s, _desc=desc, _bp=bp):
        return _bp.graph([_bp.crumb_sub(s, "AI & Automation", "ai", "Start an AI Enquiry"),
                          _bp.webpage(s, "Start an AI Enquiry", _desc, wtype="ContactPage")])

    bp.add(slug=slug, title="Start an AI Enquiry | 365 Techies", desc=desc,
           og_title="Start an AI Enquiry | 365 Techies", schema=schema, content=content)


def _eyebrow(h2):
    t = re.sub(r"<[^>]+>", "", h2)
    t = t.replace("&rsquo;", "'").replace("&amp;", "&").replace("&mdash;", "-")
    return t.upper()


def _attr(h2):
    return re.sub(r"<[^>]+>", "", h2).replace('"', "")


register()
