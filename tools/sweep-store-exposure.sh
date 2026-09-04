#!/bin/bash
# Post-deploy sweep: is any api/ runtime store being SERVED?
#
# This has gone wrong twice. The stores are gitignored, which stops them being
# committed but does nothing about whether Apache hands them to anyone who asks
# - and gitignored has twice been mistaken for unserved. A store that answers
# 200 is a customer list on the open web.
#
# The check deliberately tests REALITY rather than a model of it. An earlier
# attempt parsed .htaccess and asked whether a deny rule matched each filename;
# it disagreed with the live server on ten paths that are in fact all 403, so it
# would have cried wolf on every run. Curling the paths cannot be wrong about
# what the server does.
#
#   bash tools/sweep-store-exposure.sh            # sweep, exit 1 on any exposure
#   bash tools/sweep-store-exposure.sh --list     # just print the paths it would test
set -u
cd "$(dirname "$0")/.." || exit 2
BASE="${SWEEP_BASE:-https://365techies.co.uk}"
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36"

# Paths come from the PHP itself, so a store added tomorrow is swept tomorrow
# without anyone remembering to add it here. Trailing-dash prefixes (pcm-msg-,
# pcm-sos- ...) are concatenated with an id at runtime and are not real files.
paths=$(python -c "
import re, glob
p = set()
for f in glob.glob('api/*.php'):
    s = open(f, encoding='utf-8', errors='replace').read()
    for m in re.finditer(r\"__DIR__\s*\.\s*'/([A-Za-z0-9._-]+)'\", s):
        x = m.group(1)
        if not x.endswith('.php') and not x.endswith('-'):
            p.add(x)
print('\n'.join(sorted(p)))
")

# Intentionally public. Anything here must be a deliberate, reviewed decision -
# adding a line to silence a failure is how the first leak survived as long as it did.
ALLOW="^(dorset-traffic-budget\.json)$"

if [ "${1:-}" = "--list" ]; then echo "$paths"; exit 0; fi

n=0; bad=0
while read -r p; do
  [ -z "$p" ] && continue
  n=$((n + 1))
  echo "$p" | grep -qE "$ALLOW" && continue
  code=$(curl -s -o /dev/null -w "%{http_code}" -A "$UA" --max-time 15 "$BASE/api/$p")
  if [ "$code" = "200" ]; then
    echo "::error title=api store exposed::/api/$p answers HTTP 200. Add a deny rule to .htaccess and redeploy."
    bad=$((bad + 1))
  fi
done <<< "$paths"

echo "store-exposure sweep: $n paths checked, $bad exposed"
[ "$bad" -eq 0 ] || exit 1
