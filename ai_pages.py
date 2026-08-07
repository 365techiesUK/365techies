# /ai/ section — foundation pages (blueprint docs 04 s34-35, 05 v1.1 s27.5/s48).
#
# Copy lives in ai_pages_data.py (the house content-pack pattern); this module
# renders it through the standard build_pages/build_extra vocabulary and
# registers via add(). Nested slugs ("ai/agents") work natively: write_all()
# os.path.joins the slug and makedirs the tree.
#
# ⚠ AI_LAUNCH GATE: False = register() is a no-op and the build output is
# byte-identical to a build without this module (freeze-safe by construction).
# The owner-authorised release commit flips this to True AND, in the SAME
# commit, deletes the .htaccess line 38 shortcut `RewriteRule ^ai/?$ ...`
# (otherwise the live 301 shadows the new hub and /ai/ is unreachable) and
# applies the commercial-copy correction changeset
# (see C:\claude\seo-research\ai-ia\migration-manifest.json).
#
# Commercial rules baked in (owner decision 2026-08-07): monthly service
# subscription + separately quoted design/build; the ONLY published AI price is
# the voice page's From £95/month (AI_VOICE_FROM in build_extra); every other
# page says "Monthly service — confirmed with your quote". The build guard
# (tools_check_ai_commercial.py) scans everything under ai/ once emitted.

AI_LAUNCH = False   # ← flip only in the owner-authorised release commit


def register():
    if not AI_LAUNCH:
        return
    import build_pages as bp
    from ai_pages_data import PAGES

    for p in PAGES:
        _emit(p, bp)


def _emit(p, bp):
    slug = p["slug"]
    is_hub = slug == "ai"
    nsec = [0]

    def section_block(h2, body_html, alt):
        nsec[0] += 1
        klass = "section section--alt" if alt else "section"
        eyebrow = "/%02d &mdash; %s" % (nsec[0], _eyebrow(h2))
        return f'''    <section class="{klass}" aria-label="{_attr(h2)}">
      <div class="wrap wrap--narrow">
        <div class="prose" data-reveal>
          <p class="eyebrow mono">{eyebrow}</p>
          <h2 class="section-title" data-title>{h2}<span class="title-underline"></span></h2>
{body_html}
        </div>
      </div>
    </section>'''

    parts = [bp.hero(bp.bc(p["name"]), p["eyebrow"], p["h1"], p["hero_lede"],
                     cta1=(p["cta_primary"]["label"], p["cta_primary"]["href"]),
                     cta2=(p["cta_secondary"]["label"], p["cta_secondary"]["href"]),
                     chips=p.get("chips") or None)]
    alt = False
    for s in p["sections"]:
        parts.append(section_block(s["h2"], s["html"], alt))
        alt = not alt

    pb = p.get("pricing")
    if pb:
        parts.append(f'''    <section class="section" aria-label="Service and build pricing">
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


def _eyebrow(h2):
    import re
    t = re.sub(r"<[^>]+>", "", h2)
    t = t.replace("&rsquo;", "'").replace("&amp;", "&").replace("&mdash;", "-")
    return t.upper()


def _attr(h2):
    import re
    return re.sub(r"<[^>]+>", "", h2).replace('"', "")


register()
