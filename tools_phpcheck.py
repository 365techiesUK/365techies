# -*- coding: utf-8 -*-
"""Structural sanity check for the api/*.php files, without a PHP binary.

There is no php on this machine, so an edit to a 1,400-line PHP file otherwise
ships unverified. This is not a parser: it tokenises just enough to strip
comments, quoted strings and heredoc/nowdoc bodies, then balances brackets on
what is left. That catches the class of mistake an edit actually makes - an
unclosed brace, a stray paren, a heredoc terminator that got indented.

    py -X utf8 tools_phpcheck.py api/pcm-booking.php
    py -X utf8 tools_phpcheck.py api/*.php

A pass here is NOT proof the file runs. It is proof the edit did not break the
structure, which is the failure this repo has actually hit.
"""
import io
import re
import sys
import glob


def strip(src):
    """Return (code with strings/comments blanked, error or None)."""
    out = []
    i, n = 0, len(src)
    while i < n:
        c = src[i]
        two = src[i:i + 2]
        if two == "/*":
            j = src.find("*/", i + 2)
            i = n if j < 0 else j + 2
            continue
        if two == "//" or c == "#":
            j = src.find("\n", i)
            i = n if j < 0 else j
            continue
        if c in "'\"":
            q, j = c, i + 1
            while j < n:
                if src[j] == "\\":
                    j += 2
                    continue
                if src[j] == q:
                    j += 1
                    break
                j += 1
            out.append('""')
            i = j
            continue
        m = re.match(r"<<<(['\"]?)([A-Za-z_]\w*)\1\r?\n", src[i:])
        if m:
            tag = m.group(2)
            end = re.search(r"\n[ \t]*" + tag + r"\b", src[i:])
            if not end:
                return "".join(out), "UNTERMINATED heredoc <<<%s" % tag
            out.append('""')
            i += end.end()
            continue
        out.append(c)
        i += 1
    return "".join(out), None


def php_regions(src):
    """Just the code inside <?php ... ?>, so HTML templates check correctly.

    pcm-admin.php is a template with 72 interleaved PHP blocks; treating the
    whole file as one program reported a phantom 14-brace imbalance, because
    `<?php if(x): ?>` HTML `<?php endif; ?>` is balanced by keyword, not brace.
    """
    parts, i = [], 0
    while True:
        a = src.find("<?php", i)
        if a < 0:
            a2 = src.find("<?=", i)
            if a2 < 0:
                break
            a, skip = a2, 3
        else:
            skip = 5
        b = src.find("?>", a + skip)
        parts.append(src[a + skip:] if b < 0 else src[a + skip:b])
        if b < 0:
            break
        i = b + 2
    return "\n".join(parts)


def check(path):
    """Balance brackets across the PHP code only.

    Always work from php_regions(): a template's HTML, CSS and inline JS are full
    of braces that have nothing to do with the PHP, and counting them reported a
    phantom +14 imbalance on pcm-admin.php. PHP's alternative syntax
    (`if(...):` / `endif;`) uses no braces, so it balances fine once the HTML is
    out of the way.
    """
    src = io.open(path, encoding="utf-8", errors="replace").read()
    if "<?php" not in src and "<?=" not in src:
        return ["no PHP open tag found"]
    s, err = strip(php_regions(src))
    problems = [err] if err else []
    for o, c in (("{", "}"), ("(", ")"), ("[", "]")):
        depth, line, first_neg = 0, 1, None
        for ch in s:
            if ch == "\n":
                line += 1
            elif ch == o:
                depth += 1
            elif ch == c:
                depth -= 1
                if depth < 0 and first_neg is None:
                    first_neg = line
        if depth != 0:
            extra = " (first unmatched %s near line %d)" % (c, first_neg) if first_neg else ""
            problems.append("%s%s unbalanced by %+d%s" % (o, c, depth, extra))
    return problems


if __name__ == "__main__":
    # --quiet prints nothing unless something is wrong, so a warning in the build
    # output genuinely means a warning rather than a wall of OKs to scroll past.
    quiet = "--quiet" in sys.argv
    paths = []
    for a in sys.argv[1:]:
        if a.startswith("--"):
            continue
        paths.extend(glob.glob(a) or [a])
    if not paths:
        print(__doc__)
        sys.exit(2)
    bad = 0
    for p in paths:
        pr = check(p)
        name = p.replace("\\", "/").split("/")[-1]
        if not quiet or pr:
            print("%-30s %s" % (name, "OK" if not pr else "FAIL: " + "; ".join(pr)))
        bad += bool(pr)
    if not quiet or bad:
        print("\n%d file(s), %d with problems" % (len(paths), bad))
    sys.exit(1 if bad else 0)
