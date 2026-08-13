# -*- coding: utf-8 -*-
"""Check every published review quote against text pasted from the live profile.

    py -X utf8 tools_check_reviews.py <pasted-profile.txt>

WHY THIS EXISTS. On 2026-08-01 six published quotes turned out to be edited in
ways a normal check cannot see, because the edit makes our string a SUBSTRING of
theirs:

    they wrote : "It's a quality Dell machine, with good software included."
    we published: "It's a quality Dell machine."

Strip the punctuation to compare - which every naive checker does - and ours is
contained in theirs, so it passes. The comma has been promoted to a full stop
and a fragment now reads as a whole sentence the customer never ended there.

The second invisible edit is the STITCH: two real sentences of theirs, joined
with no ellipsis, that were never adjacent. Checking "does each sentence appear
somewhere in the review" passes that too.

So this tool does three things a substring check does not:
  1. compares WITH punctuation intact;
  2. asserts our sentence's terminator is the character THEY used there;
  3. asserts consecutive sentences of ours are actually adjacent in theirs,
     unless we marked the gap with an ellipsis.

INPUT is whatever you get by selecting the reviews on the Google profile and
pasting. Expand the "...More" links first where you can - anything still cut is
reported as unverifiable rather than guessed at. Format expected per review:

    Jane Smith
    3 reviews·2 photos          <- or "1 review" or "Local Guide·22 reviews"
    9 years ago
    the review text, possibly ending in ...More
    365 Techies Ltd (owner)     <- optional reply, ignored
    ...

Exit code is non-zero if anything is BROKEN, so it can gate a release.
"""
import io, re, sys, unicodedata

sys.path.insert(0, ".")
try:
    from reviews_data import REVIEWS, VERIFIED
except ImportError:
    sys.exit("run me from the repo root (where reviews_data.py lives)")

CANON = dict(REVIEWS)
# Reviewer names match case-INSENSITIVELY. Google renders a display name however
# the reviewer typed it - "mark lemon" - and making this file copy that exactly,
# purely so the lookup matched, would put a lowercase name on the testimonial
# pages. QUOTE TEXT stays byte-exact; that is the integrity guarantee this tool
# exists for. How a person capitalised their own name is not.
CANON_CI = {n.casefold(): n for n in CANON}
MORE = re.compile(r"(?:…|\.\.\.)\s*More\s*$")
CREDITS = re.compile(r"^(?:Local Guide\s*[·•]\s*)?\d+\s+review", re.I)
# Google's relative timestamp, which marks where a review's text begins.
# ⚠️ "Yesterday" and "Today" carry no "ago" and used to fall through here, so the
# parser ran to the end of the file looking for a date line, captured an EMPTY
# body, and reported the review BROKEN with "NOT IN THEIR REVIEW AT ALL" against
# every sentence. That is the worst possible failure for this tool: it accuses a
# correct quote of being fabricated, and it fires precisely on the NEWEST
# reviews - the ones most likely to have just been rewritten and to actually
# need checking.
AGO = re.compile(r"^(?:(?:a|an|\d+)\s+\w+\s+ago|yesterday|today)\s*$", re.I)
OWNER = "365 Techies Ltd (owner)"


def canonical_chars(s):
    """Fold typographic variants ONLY. Punctuation is load-bearing - keep it."""
    s = unicodedata.normalize("NFKC", s)
    for a, b in ((u"’", "'"), (u"‘", "'"), (u"“", '"'),
                 (u"”", '"'), (u"—", "-"), (u"–", "-"),
                 (u"…", "..."), ("&", "and")):
        s = s.replace(a, b)
    return re.sub(r"\s+", " ", s).strip()


def parse(text):
    """-> [(name, review_text, truncated_by_google)]"""
    lines = [l.rstrip() for l in text.splitlines()]
    out, i = [], 0
    while i < len(lines) - 1:
        name = lines[i].strip()
        if not name or name == OWNER or not CREDITS.match(lines[i + 1].strip()):
            i += 1
            continue
        j = i + 2
        while j < len(lines) and not AGO.match(lines[j].strip()):
            j += 1
        j += 1                                   # first line of the review
        body = []
        while j < len(lines):
            s = lines[j].strip()
            if s == OWNER:
                break
            # next reviewer starts here
            if (s and j + 1 < len(lines)
                    and CREDITS.match(lines[j + 1].strip())):
                break
            body.append(s)
            j += 1
        raw = " ".join(x for x in body if x).strip()
        out.append((name, MORE.sub("", raw).strip(), bool(MORE.search(raw))))
        i = j
    return out


def sentences(s):
    return [x.strip() for x in re.split(r"(?<=[.!?])\s+", s) if x.strip()]


def check(canon, live, cut):
    """-> (verdict, [detail, ...]). verdict in OK / SUSPECT / BROKEN / UNSEEN."""
    c, l = canonical_chars(canon), canonical_chars(live)

    if c == l:
        return "OK", ["exact - the whole review, word for word"]
    if c in l:
        notes = []
        if not l.startswith(c):
            notes.append("starts later than they did (clean, contiguous)")
        if not l.endswith(c) and not cut:
            notes.append("stops earlier than they did (clean, contiguous)")
        return "OK", notes or ["contiguous run of their words"]

    details, worst = [], "OK"
    prev_end = -1
    for n, sent in enumerate(sentences(c)):
        s = canonical_chars(sent)
        at = l.find(s)
        if at >= 0:
            # adjacency: did we splice a gap in without marking it?
            if prev_end >= 0 and at > prev_end:
                gap = l[prev_end:at].strip()
                if gap and "..." not in sentences(c)[n - 1][-4:]:
                    details.append(
                        "STITCH - we run %r straight on from the sentence "
                        "before, but they wrote %r in between"
                        % (sent[:48], gap[:60]))
                    worst = "BROKEN"
            prev_end = at + len(s)
            continue

        # present but ending somewhere they did not end it?
        stem = s.rstrip(".!?")
        at = l.find(stem)
        if at >= 0:
            nxt = l[at + len(stem):at + len(stem) + 42].strip()
            details.append(
                "CUT MID-SENTENCE - we end at %r; they continued %r"
                % (sent[-46:], nxt[:46]))
            worst = "BROKEN"
        elif cut:
            details.append("past Google's ...More cut, cannot verify: %s"
                           % sent[:60])
            if worst == "OK":
                worst = "UNSEEN"
        else:
            details.append("NOT IN THEIR REVIEW AT ALL: %s" % sent[:70])
            worst = "BROKEN"
    return worst, details


def main(path):
    live = parse(io.open(path, encoding="utf-8").read())
    if not live:
        sys.exit("parsed 0 reviews from %s - is it a paste of the profile?" % path)

    rows, broken, newly_ok = [], 0, []
    for name, text, cut in live:
        canon_name = CANON_CI.get(name.casefold())
        if canon_name is None:
            rows.append(("UNUSED", name, ["on the profile, not published - fine"]))
            continue
        name = canon_name          # report under the spelling we publish
        verdict, details = check(CANON[name], text, cut)
        rows.append((verdict, name, details))
        if verdict == "BROKEN":
            broken += 1
        if verdict == "OK" and not cut and name not in VERIFIED:
            newly_ok.append(name)

    rank = {"BROKEN": 0, "UNSEEN": 1, "OK": 2, "UNUSED": 3}
    rows.sort(key=lambda r: (rank[r[0]], r[1]))
    for verdict, name, details in rows:
        print("%-7s %s" % (verdict, name))
        for d in details:
            print("          " + d)

    covered = sum(1 for _, n, _ in rows if n in CANON)
    print("\n%d of %d published quotes covered by this paste; %d broken."
          % (covered, len(CANON), broken))
    unseen = [n for n in CANON if n not in {r[1] for r in rows}]
    if unseen:
        print("not in this paste (unchecked): %s" % ", ".join(sorted(unseen)))
    if newly_ok:
        print("\nAdd to VERIFIED in reviews_data.py: %s"
              % ", ".join('"%s"' % n for n in sorted(newly_ok)))
    return 1 if broken else 0


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__.strip().splitlines()[2].strip())
    sys.exit(main(sys.argv[1]))
