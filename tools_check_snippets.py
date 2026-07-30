# -*- coding: utf-8 -*-
"""Search-snippet audit of the BUILT site.

Finds every page whose <title> is over 60 characters (Google truncates) or
whose meta description was amputated with an ellipsis by _meta_desc(). Both
cost clicks on pages that already rank, which is the cheapest traffic there
is - no ranking change required.

    py -X utf8 tools_check_snippets.py            # whole site
    py -X utf8 tools_check_snippets.py --gsc _p1.json   # rank-weighted

The optional --gsc file is a JSON list of [slug, impressions, clicks,
position] exported from Search Console, which sorts the report by what the
fix is actually worth instead of alphabetically. Fix the top of the list.

Overrides go in snippets_data.py, which wins over every data module.
"""
import io
import json
import os
import re
import sys
from html import unescape

TITLE_LIMIT = 60
SKIP = ("portal", "activate", "node_modules", ".git", "api")
_T = re.compile(r"<title>(.*?)</title>", re.S)
_D = re.compile(r'name="description"\s+content="(.*?)"', re.S)


def audit(root="."):
    """Yield (slug, title_len, ellipsis, title, desc) for every broken page."""
    out = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP and not d.startswith(".")]
        if "index.html" not in filenames:
            continue
        slug = os.path.relpath(dirpath, root).replace("\\", "/")
        if slug == ".":
            slug = ""
        html = io.open(os.path.join(dirpath, "index.html"),
                       encoding="utf-8", errors="replace").read()
        mt, md = _T.search(html), _D.search(html)
        if not (mt and md):
            continue
        title, desc = unescape(mt.group(1)), unescape(md.group(1))
        long_title = len(title) > TITLE_LIMIT
        cut = desc.rstrip().endswith("…")
        if long_title or cut:
            out.append((slug, len(title), cut, title, desc))
    return out


def main():
    broken = audit()
    weights = {}
    if "--gsc" in sys.argv:
        path = sys.argv[sys.argv.index("--gsc") + 1]
        for row in json.load(io.open(path, encoding="utf-8")):
            weights[row[0]] = (row[1], row[2], row[3])

    def rank(item):
        return -weights.get(item[0], (0, 0, 99))[0]

    broken.sort(key=rank)
    n_title = sum(1 for b in broken if b[1] > TITLE_LIMIT)
    n_cut = sum(1 for b in broken if b[2])
    print("BROKEN SNIPPETS: %d pages  (%d long titles, %d cut descriptions)"
          % (len(broken), n_title, n_cut))
    if weights:
        seen = sum(weights.get(b[0], (0,))[0] for b in broken)
        print("impressions on broken pages: %d" % seen)
    print()
    for slug, tlen, cut, title, desc in broken[:40]:
        w = weights.get(slug)
        tag = "%5d impr pos %4.1f  " % (w[0], w[2]) if w else ""
        flags = []
        if tlen > TITLE_LIMIT:
            flags.append("title %d" % tlen)
        if cut:
            flags.append("desc cut")
        print("%s/%s/  [%s]" % (tag, slug, ", ".join(flags)))
    if len(broken) > 40:
        print("... and %d more" % (len(broken) - 40))
    return 0


if __name__ == "__main__":
    sys.exit(main())
