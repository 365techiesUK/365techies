# -*- coding: utf-8 -*-
"""
One-off: seed content_dates.json from real git history.

WHY THIS EXISTS. build_blog.py used to invent publication dates - every post got a date
12 days before the one after it, counting back from a hard-coded 2026-05-20. Those dates
were rendered to readers as "Published <date>" and emitted as schema datePublished. Most
of them predated this repository's very first commit, so they described a publishing
history that never happened.

For a firm whose whole positioning is that it does not invent things - not prices, not
specs, not vendor dates - that was the worst kind of bug. This script replaces the
invention with something verifiable: the date each post's slug FIRST appeared in git.

Run once:  py seed_content_dates.py
After that, build_blog.py maintains content_dates.json automatically.
"""
import io
import json
import re
import subprocess

REPO = r'C:\claude\365-techies'
OUT = REPO + r'\content_dates.json'


def git(*a):
    return subprocess.run(['git'] + list(a), cwd=REPO, capture_output=True,
                          text=True, encoding='utf-8', errors='replace').stdout


def main():
    src = io.open(REPO + r'\build_blog.py', encoding='utf-8').read()
    slugs = re.findall(r'slug="([a-z0-9-]+)"', src)
    print('posts:', len(slugs))

    # Commits that touched build_blog.py, oldest first, with their author dates.
    log = git('log', '--reverse', '--format=%H|%ad', '--date=short', '--', 'build_blog.py')
    commits = [l.split('|') for l in log.strip().split('\n') if '|' in l]
    print('commits touching build_blog.py:', len(commits))

    # For each commit, which slugs did that revision of the file contain?
    first_seen = {}
    for sha, date in commits:
        blob = git('show', sha + ':build_blog.py')
        if not blob:
            continue
        present = set(re.findall(r'slug="([a-z0-9-]+)"', blob))
        for s in present:
            if s not in first_seen:
                first_seen[s] = date

    data = {}
    missing = []
    for s in slugs:
        if s in first_seen:
            data[s] = {'first': first_seen[s], 'last': first_seen[s]}
        else:
            missing.append(s)

    if missing:
        # Anything we cannot date from git gets the repo's first commit - the earliest
        # date we can actually stand behind for this codebase.
        floor = commits[0][1] if commits else None
        print('no git first-appearance for', len(missing), '- using repo floor', floor)
        for s in missing:
            data[s] = {'first': floor, 'last': floor}

    io.open(OUT, 'w', encoding='utf-8', newline='\n').write(
        json.dumps(data, indent=1, sort_keys=True))

    dates = sorted(set(v['first'] for v in data.values()))
    print('wrote', OUT)
    print('distinct real dates:', len(dates), '->', dates[:6], '...' if len(dates) > 6 else '')


if __name__ == '__main__':
    main()
