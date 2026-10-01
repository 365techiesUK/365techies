# Build the compact IP-to-country tables the server reads (api/geoip/geo4.bin, geo6.bin) from DB-IP's free
# "IP to Country Lite" CSV. 1 Oct 2026, for counting 365 PC Manager installs by country (api/pcm-installs-lib.php).
#
# Data: DB-IP IP to Country Lite, https://db-ip.com, licensed CC BY 4.0 (credit on the privacy page:
# "IP geolocation by DB-IP"). Refresh once a month or so - countries rarely move, so a stale table is mostly fine:
#   1. download https://download.db-ip.com/free/dbip-country-lite-YYYY-MM.csv.gz (owner-approved source)
#   2. py tools/geoip_build.py path/to/dbip-country-lite-YYYY-MM.csv.gz
#   3. commit api/geoip/*.bin
#
# Format: one record per range START, sorted, fixed width, big-endian, so the server can binary-search the file with
# a few small reads and never load it whole:
#   geo4.bin  4-byte IPv4 start + 2-byte country      (6 bytes a record)
#   geo6.bin  8-byte IPv6 start (the /64 prefix) + 2   (10 bytes a record) - country is never finer than a /64
# A range's end is the next record's start; gaps in the CSV become "--" (not known). Adjacent ranges with the same
# country are merged. "ZZ" (reserved) is stored as "--".
import gzip, ipaddress, os, sys

src = sys.argv[1] if len(sys.argv) > 1 else ''
if not src or not os.path.exists(src):
    sys.exit('usage: py tools/geoip_build.py dbip-country-lite-YYYY-MM.csv.gz')
here = os.path.dirname(os.path.abspath(__file__))
out_dir = os.path.join(here, '..', 'api', 'geoip')
os.makedirs(out_dir, exist_ok=True)

v4, v6 = [], []
with gzip.open(src, 'rt', encoding='utf-8') as f:
    for line in f:
        a, b, cc = line.strip().split(',')[:3]
        cc = cc.strip().upper()
        if len(cc) != 2 or not cc.isalpha() or cc == 'ZZ':
            cc = '--'
        if ':' in a:
            s = int(ipaddress.IPv6Address(a)) >> 64
            e = int(ipaddress.IPv6Address(b)) >> 64
            v6.append((s, e, cc))
        else:
            v4.append((int(ipaddress.IPv4Address(a)), int(ipaddress.IPv4Address(b)), cc))


def compact(rows, top):
    # sort by start, fill gaps with "--", merge neighbours with the same country
    rows.sort()
    out = []
    nxt = 0
    for s, e, cc in rows:
        if s > nxt:
            out.append((nxt, '--'))
        if s < nxt:          # an overlap after /64 truncation: the later range starts where the earlier ended
            s = nxt
            if s > e:
                continue
        out.append((s, cc))
        nxt = e + 1
    if nxt <= top:
        out.append((nxt, '--'))
    merged = []
    for s, cc in out:
        if merged and merged[-1][1] == cc:
            continue
        merged.append((s, cc))
    return merged


m4 = compact(v4, 0xFFFFFFFF)
m6 = compact(v6, 0xFFFFFFFFFFFFFFFF)
with open(os.path.join(out_dir, 'geo4.bin'), 'wb') as f:
    for s, cc in m4:
        f.write(s.to_bytes(4, 'big') + cc.encode('ascii'))
with open(os.path.join(out_dir, 'geo6.bin'), 'wb') as f:
    for s, cc in m6:
        f.write(s.to_bytes(8, 'big') + cc.encode('ascii'))
print('geo4.bin', len(m4), 'records', len(m4) * 6, 'bytes;', 'geo6.bin', len(m6), 'records', len(m6) * 10, 'bytes')
