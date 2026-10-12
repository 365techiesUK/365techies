#!/usr/bin/env python3
"""IndexNow: tell Bing (and the other IndexNow engines - Yandex, Seznam, Naver) which pages of 365techies.co.uk really changed.

Owner, 12 Oct 2026: "yeah go ahead with IndexNow". Bing Webmaster Tools' top (High) warning was "some important pages weren't
submitted via IndexNow": the old WordPress site's plugin did it, and nothing had since the static rebuild in June 2026.
Google does not use IndexNow; its sitemap and crawling are unchanged.

What counts as "changed": content_dates.json already keeps a fingerprint ('h') of every page's real content, so a page is sent
when its fingerprint changed in this push, or it is new. A page that left the sitemap is sent too (that is how IndexNow hears
about a removal). Only addresses in the sitemap are ever sent, so noindex pages (the portal, 404, tips-by-email...) never are.
A stylesheet bump that rewrites every page changes no fingerprint, so it sends nothing - IndexNow asks for real changes only.
The homepage is not fingerprinted (static index.html) and is left to normal crawling.

The key is public by design: https://365techies.co.uk/<KEY>.txt holds it, and that is how Bing checks we own the site.

Run by the deploy workflow after a successful upload:   python3 tools/indexnow.py --before <sha of the previous master>
By hand:   python3 tools/indexnow.py --before <sha> --dry-run        (lists what it would send, sends nothing)
           python3 tools/indexnow.py --since 2026-09-12 [--dry-run]  (every sitemap page changed on or after a date)
It never fails a deploy: every problem is printed and the exit code is 0.
"""
import argparse, json, re, subprocess, sys, urllib.error, urllib.request

HOST = '365techies.co.uk'
KEY = '9839626fa98d7e7da91f2f8f34932648'
KEY_URL = 'https://%s/%s.txt' % (HOST, KEY)
ENDPOINT = 'https://api.indexnow.org/indexnow'
MAX_URLS = 10000                      # IndexNow's limit per request


def git_show(rev, path):
    try:
        return subprocess.run(['git', 'show', '%s:%s' % (rev, path)], capture_output=True, check=True).stdout.decode('utf-8')
    except Exception:
        return None


def sitemap_urls(text):
    return set(re.findall(r'<loc>(https://365techies\.co\.uk/[^<]*)</loc>', text or ''))


def url_of(slug):
    return 'https://%s/%s/' % (HOST, slug) if slug else 'https://%s/' % HOST


def changed_since_push(before):
    """(changed, removed) addresses between the previous master (before) and this checkout."""
    now_dates = json.load(open('content_dates.json', encoding='utf-8'))
    now_map = sitemap_urls(open('sitemap.xml', encoding='utf-8').read())
    old_raw = git_show(before, 'content_dates.json') if before and not re.fullmatch(r'0+', before) else None
    if old_raw is None:
        print('IndexNow: no previous content_dates.json to compare with (first push, or the old commit was not fetched) - nothing sent.')
        return [], []
    old_dates = json.loads(old_raw)
    old_map = sitemap_urls(git_show(before, 'sitemap.xml'))
    changed = sorted(url_of(k) for k, v in now_dates.items()
                     if (k not in old_dates or old_dates[k].get('h') != v.get('h')) and url_of(k) in now_map)
    # left the sitemap since the last push: a page removed, or turned noindex
    removed = sorted(u for u in (old_map - now_map) if u != url_of(''))
    return changed, removed


def changed_since_date(day):
    now_dates = json.load(open('content_dates.json', encoding='utf-8'))
    now_map = sitemap_urls(open('sitemap.xml', encoding='utf-8').read())
    return sorted(url_of(k) for k, v in now_dates.items() if (v.get('last') or v.get('first') or '') >= day and url_of(k) in now_map), []


def send(urls):
    body = json.dumps({'host': HOST, 'key': KEY, 'keyLocation': KEY_URL, 'urlList': urls[:MAX_URLS]}).encode('utf-8')
    req = urllib.request.Request(ENDPOINT, data=body, method='POST', headers={'Content-Type': 'application/json; charset=utf-8', 'User-Agent': '365techies-deploy-indexnow'})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, r.read(300).decode('utf-8', 'replace')
    except urllib.error.HTTPError as e:
        return e.code, e.read(300).decode('utf-8', 'replace')
    except Exception as e:
        return 0, str(e)


MEANING = {200: 'accepted', 202: 'accepted - the key is still being checked', 400: 'bad request', 403: 'key not valid (is %s live?)' % KEY_URL,
           422: 'addresses do not match the host or the key', 429: 'too many requests - try later'}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--before', help='sha of master before this push (github.event.before)')
    ap.add_argument('--since', help='YYYY-MM-DD: send every sitemap page whose content changed on or after this day')
    ap.add_argument('--dry-run', action='store_true')
    a = ap.parse_args()
    try:
        changed, removed = changed_since_date(a.since) if a.since else changed_since_push(a.before)
    except Exception as e:
        print('IndexNow: could not work out the changed pages (%s) - nothing sent.' % e)
        return 0
    urls = changed + removed
    if not urls:
        print('IndexNow: no page content changed in this push - nothing to send.')
        return 0
    print('IndexNow: %d changed or new, %d left the sitemap:' % (len(changed), len(removed)))
    for u in urls[:60]: print('  ' + u)
    if len(urls) > 60: print('  ... and %d more' % (len(urls) - 60))
    if a.dry_run:
        print('IndexNow: dry run - nothing sent.')
        return 0
    code, text = send(urls)
    print('IndexNow: %s -> %s (%s)%s' % (ENDPOINT, code, MEANING.get(code, 'unexpected'), (' ' + text.strip()) if text.strip() else ''))
    if code not in (200, 202):
        print('::warning title=IndexNow not accepted::%s answered %s - pages are still found through the sitemap.' % (ENDPOINT, code))
    return 0


if __name__ == '__main__':
    sys.exit(main())
