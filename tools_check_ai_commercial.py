#!/usr/bin/env python3
"""AI commercial-copy guard (blueprint doc 04 s27; owner pricing model 2026-08-07).

The owner's AI commercial model: monthly subscription (the ONLY approved AI
price is the voice agent's From £95/month) + design/build time quoted by
complexity. The retired claims and the still-unresolved free-discovery CTAs
must not resurface after the post-freeze correction - and no NEW AI price may
ever appear without an owner decision.

Scans BUILT OUTPUT, not just source: the £95 services-hub card and the
llms.txt price line are hard-coded copies that bypass the AI_VOICE_FROM /
AI_PILOT_FROM constants, and the ROI-calculator page is fed by two different
source files. Scanning what actually ships catches every source at once
(including hand-maintained files no .py generates).

Modes:
  default   debt-tracking (pre-correction): retired/unresolved strings are
            reported as known debt, exit 0. An UNAPPROVED AI PRICE always
            exits 1 - there is no legitimate state that includes one.
  --strict  post-correction: retired strings and unresolved-CTA strings also
            exit 1. Flip the build to --strict in the same commit as the
            commercial-copy correction.

Scoping is by FILE LIST, not by pattern cleverness: 'free review' on
/broadband-checker/, 'free demo' on /custom-vrm-dashboards/ and the £95
DDR5 RAM price on /why-computer-prices-have-gone-up/ are unrelated offers on
pages this guard never reads.
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))

# The AI estate. Future /ai/... routes are picked up by the glob below, so new
# pillar pages are guarded the day they are first built.
AI_SLUGS = [
    "agentic-ai-systems",
    "ai/voice-agents",
    "365-ai-os",
    "ai/training",
    "ai-for-beginners-course",
    "ai-roi-calculator",
    "using-ai-safely",
]

# Files that carry AI commercial claims but are NOT AI pages. They are
# SITE-WIDE files, so two scopings apply: only the retired and unapproved-price
# checks run (they legitimately say 'free' elsewhere), and only on lines that
# are actually about the AI offering - the same files carry every legitimate
# non-AI price on the site (support plans from £18.25/£24.38, web design from
# £510, Dell stock, remote fixes from £20...).
PRICE_ONLY_FILES = ["llms.txt", os.path.join("services", "index.html")]
AI_LINE = re.compile(r"\bAI\b|\bagentic\b|ai-voice-agents|365-ai-os|ai-training|ai-roi-calculator|agentic-ai-systems|/ai/", re.I)

APPROVED_AI_PRICES = {"95"}  # owner-approved 2026-06-17, reconfirmed 2026-08-07

RETIRED = [
    (re.compile(r"(?:£|&pound;)\s*495"), "£495 (retired AI Starter pilot price)"),
    (re.compile(r"AI\s+Starter\s+pilot", re.I), "'AI Starter pilot' (retired offer name)"),
]

UNRESOLVED = [
    (re.compile(r"free\s+AI\s+opportunity\s+review", re.I), "'Free AI opportunity review' (discovery charging undecided)"),
    (re.compile(r"free\s+review", re.I), "'free review' (discovery charging undecided)"),
    (re.compile(r"free\s+demo\s+call", re.I), "'Free Demo Call' (demo charging undecided)"),
]

# A price claim is 'from £N' or '£N/month' / '£N per month' / '£N a month'.
PRICE_RES = [
    re.compile(r"[Ff]rom\s*(?:£|&pound;)\s*(\d+)"),
    re.compile(r"(?:£|&pound;)\s*(\d+)\s*(?:/\s*month|per\s+month|a\s+month)", re.I),
]


def ai_built_files():
    files = []
    for slug in AI_SLUGS:
        p = os.path.join(ROOT, slug, "index.html")
        if os.path.exists(p):
            files.append(p)
    # future /ai/ namespace: guard every built page under it, recursively
    ai_dir = os.path.join(ROOT, "ai")
    if os.path.isdir(ai_dir):
        for dirpath, _dirs, names in os.walk(ai_dir):
            for n in names:
                if n.endswith(".html"):
                    files.append(os.path.join(dirpath, n))
    return files


# Per-page extra price allowances beyond APPROVED_AI_PRICES. The cost page's
# single anonymous market-range sentence ("roughly £49 to £200 a month") is
# NOT a 365 price - it is live-verified market evidence, recorded with
# provider/URL/date in seo-research/ai-ia/EVIDENCE-market-range-2026-08-10.md.
# If that sentence changes, this allowance and the evidence file change with it.
PAGE_PRICE_ALLOWANCES = {
    "ai/voice-agents/cost/index.html": {"49", "200"},
}


def scan_text(rel, text, price_only, retired_hits, unresolved_hits, price_hits):
    for rx, label in RETIRED:
        n = len(rx.findall(text))
        if n:
            retired_hits.append("%s: %s x%d" % (rel, label, n))
    if not price_only:
        for rx, label in UNRESOLVED:
            n = len(rx.findall(text))
            if n:
                unresolved_hits.append("%s: %s x%d" % (rel, label, n))
    page_extra = PAGE_PRICE_ALLOWANCES.get(rel.replace("\\", "/"), set())
    for rx in PRICE_RES:
        for m in rx.finditer(text):
            if m.group(1) not in APPROVED_AI_PRICES and m.group(1) != "495" and m.group(1) not in page_extra:
                # 495 already reported as retired; anything else is an
                # INVENTED price - the class of defect that must stop a build.
                price_hits.append("%s: unapproved AI price claim %r" % (rel, m.group(0)))


def search_index_entries():
    """Yield (label, entry-slug, concatenated-strings) for AI entries in search-index.json."""
    p = os.path.join(ROOT, "search-index.json")
    if not os.path.exists(p):
        return
    try:
        with open(p, encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        yield ("search-index.json", "", "PARSE-ERROR %s" % e)
        return
    items = data if isinstance(data, list) else data.get("pages", []) if isinstance(data, dict) else []
    for item in items:
        if not isinstance(item, dict):
            continue
        blob = " ".join(str(v) for v in item.values() if isinstance(v, str))
        if any(slug in blob for slug in AI_SLUGS) or "/ai/" in blob:
            yield ("search-index.json (AI entry)", str(item.get("u", "")), blob)


def main():
    strict = "--strict" in sys.argv
    quiet = "--quiet" in sys.argv
    retired_hits, unresolved_hits, price_hits = [], [], []

    for p in ai_built_files():
        rel = os.path.relpath(p, ROOT)
        with open(p, encoding="utf-8", errors="replace") as f:
            scan_text(rel, f.read(), False, retired_hits, unresolved_hits, price_hits)

    for rel in PRICE_ONLY_FILES:
        p = os.path.join(ROOT, rel)
        if os.path.exists(p):
            with open(p, encoding="utf-8", errors="replace") as f:
                ai_lines = "\n".join(ln for ln in f.read().splitlines() if AI_LINE.search(ln))
            scan_text(rel, ai_lines, True, retired_hits, unresolved_hits, price_hits)

    for label, u, blob in search_index_entries():
        if blob.startswith("PARSE-ERROR"):
            print("AI GUARD WARNING: could not parse search-index.json (%s)" % blob)
            continue
        # search-index entries are metadata OF their page, so the voice page's
        # entry may carry the one approved voice price (same slug-scoped
        # exception as render_test); every other price claim is banned here.
        for rx in PRICE_RES:
            for m in rx.finditer(blob):
                if u in ("ai/voice-agents", "ai/voice-agents/cost") and "".join(c for c in m.group(0) if c.isdigit()) == "95":
                    continue
                price_hits.append("%s: price claim %r must not enter the search index" % (label, m.group(0)))
        for rx, lab in RETIRED:
            if rx.search(blob):
                retired_hits.append("%s: %s" % (label, lab))

    failures = list(price_hits)
    if strict:
        failures += retired_hits + unresolved_hits

    if failures:
        print("AI COMMERCIAL-COPY VIOLATIONS (%d):" % len(failures))
        for h in failures:
            print("  " + h)
        print("Approved AI prices: from £95/month (voice agent) only; all other AI pricing is quoted.")
        return 1

    if not strict and (retired_hits or unresolved_hits):
        print("AI commercial-copy debt (pre-correction, tracked - flip to --strict once the correction lands):")
        for h in retired_hits:
            print("  retired:    " + h)
        for h in unresolved_hits:
            print("  unresolved: " + h)
    elif not quiet:
        print("AI commercial copy clean.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
