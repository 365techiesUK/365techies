# -*- coding: utf-8 -*-
"""Guard: every include of pcm-review.php MUST be at top-level scope.

WHY
---
pcm-review.php sets its config as top-level assignments - $RV_Q (the queue file
path), $WC_LIVE, $WC_MAX_AGE, $WC_DELAY. PHP binds an include's top-level
variables to whichever scope ran the include, so an include placed inside a
function makes all of them locals of that function and leaves the globals unset.

Every queue function reads them through `global`:

    rv_record  rv_seen  rv_process  dn_process  rm_process  cf_notify
    wc_record  wc_process  wc_beat  wc_beat_age  mail_watchdog

With $RV_Q unset, rvq_open() reads the queue back as EMPTY and rvq_save() writes
to nowhere - both silently, behind @. The caller sees success. That cost the
portal welcome two full days of silence in July 2026, and the same include sat
in the booking path where it broke review and job-done emails for any booking
made through our own page rather than SimplyBook's.

This is not a style rule. A function-scope include here is a silent data-loss
bug, so the build fails on it.

    py -X utf8 tools_check_libscope.py
"""
import io
import os
import re
import sys

# --quiet: print nothing unless something is wrong, so the build output stays
# readable and a warning genuinely means a warning.
QUIET = "--quiet" in sys.argv

LIB = "pcm-review.php"
API = os.path.join(os.path.dirname(os.path.abspath(__file__)), "api")


def strip_for_depth(line):
    """Braces that affect scope only - not ones inside strings or comments."""
    s = re.sub(r"/\*.*?\*/", "", line)
    s = re.sub(r"//.*$", "", s)
    s = re.sub(r"#.*$", "", s)
    s = re.sub(r"'(?:\\.|[^'\\])*'", "''", s)
    s = re.sub(r'"(?:\\.|[^"\\])*"', '""', s)
    return s


def scan(path):
    """Return [(line_no, in_function, text)] for each include of the library.

    Brace depth is NOT scope. In PHP only a function body (or closure/method)
    creates a new variable scope - `try {}`, `if {}` and `foreach {}` at file
    level are all still global, which is exactly why the cron in pcm-bkpoll.php
    works despite its include sitting inside a top-level try block. So track the
    depths at which function bodies open, and treat only those as function scope.
    """
    hits = []
    depth = 0
    fn_depths = []          # brace depths at which a function body is open
    pending_fn = False      # saw `function` - the next { opens its body
    in_block_comment = False
    for i, line in enumerate(io.open(path, encoding="utf-8", errors="replace"), 1):
        raw = line
        if in_block_comment:
            if "*/" in raw:
                in_block_comment = False
                raw = raw.split("*/", 1)[1]
            else:
                continue
        if "/*" in raw and "*/" not in raw:
            in_block_comment = True
            raw = raw.split("/*", 1)[0]
        s = strip_for_depth(raw)
        # Match on the RAW line: strip_for_depth blanks quoted strings, and the
        # filename lives inside one - searching the stripped text found nothing.
        # The stripped copy is for brace depth only.
        if LIB in raw and re.search(r"\b(include|include_once|require|require_once)\b", raw) \
                and not raw.lstrip().startswith(("*", "//", "#")):
            hits.append((i, bool(fn_depths), raw.strip()[:78]))

        # walk the line character by character so `function f() {` on one line works
        if re.search(r"\bfunction\b", s):
            pending_fn = True
        for ch in s:
            if ch == "{":
                depth += 1
                if pending_fn:
                    fn_depths.append(depth)
                    pending_fn = False
            elif ch == "}":
                while fn_depths and fn_depths[-1] > depth:
                    fn_depths.pop()
                depth -= 1
                while fn_depths and fn_depths[-1] > depth:
                    fn_depths.pop()
        if ";" in s and pending_fn and "{" not in s:
            pending_fn = False          # abstract/interface declaration, no body
    return hits


if __name__ == "__main__":
    bad = []
    total = 0
    for name in sorted(os.listdir(API)):
        if not name.endswith(".php") or name == LIB:
            continue
        for ln, in_fn, text in scan(os.path.join(API, name)):
            total += 1
            if not QUIET or in_fn:
                print("  %-24s line %-5d %s" % (name, ln,
                      "FUNCTION SCOPE - BUG" if in_fn else "top-level (ok)"))
            if in_fn:
                bad.append((name, ln, text))
    if not QUIET or bad:
        print("\n%d include(s) of %s, %d at function scope" % (total, LIB, len(bad)))
    if bad:
        print("\nFAIL - each of these silently unsets $RV_Q for the whole request:")
        for name, ln, text in bad:
            print("  api/%s:%d\n      %s" % (name, ln, text))
        print("\nFix: include the library once at TOP LEVEL in that file.")
    sys.exit(1 if bad else 0)
