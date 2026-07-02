# Make the Victron dashboard show LIVE data — ONE step left

Both live widgets (the full dashboard on **/off-grid-victron-energy/** and the compact
one on **/lithium-battery-installs-dorset/**) are now wired to a **PHP proxy that runs
on SiteGround itself**: `api/vrm.php` (in this repo — it contains **no secrets**).

The proxy reads the VRM access token from a tiny file that lives **only on the server**
(never in git — this repo is public). Until that file exists, the widgets show the
clearly-labelled sample reading. Data flow once configured:

    visitor's browser → 365techies.co.uk/api/vrm.php (token server-side, 60s cache)
                      → vrmapi.victronenergy.com (site 458482) → live numbers

## The one step: create the token file (2 minutes)

1. SiteGround **Site Tools → File Manager** → open **public_html/api/**
   (the folder appears after the next deploy).
2. **New File** → name it exactly: `vrm-token.php`
3. Edit it and paste exactly one line (your VRM access token between the quotes):

   ```php
   <?php $VRM_TOKEN = 'your-vrm-access-token-here';
   ```

4. Save. Open https://365techies.co.uk/api/vrm.php — you should see `"ok":true` with
   live numbers. Both dashboards go live on their next 30-second refresh.

Tokens are created in VRM Portal → **Preferences → Integrations → Access tokens**.

## Security notes
- The token file is `.gitignore`d AND blocked from direct web access in `.htaccess`;
  PHP reads it from disk. The proxy exposes only a whitelisted read-only summary
  (SOC, volts, watts, solar, yields, tank levels, 30-day history) — never the token.
- ⚠️ Any token that has ever been pasted into a chat or email should be treated as
  exposed: once things work, create a FRESH token in VRM, update the one line in
  `vrm-token.php` via File Manager, and delete the old token in VRM. 2 minutes.
- Server-side cache (`api/vrm-cache.json`, 60s) means visitor traffic can never
  hammer the VRM API. The deploy never touches either file (they're not in git).

## Rotating the token later
VRM → Preferences → Integrations → Access tokens → create new → edit the one line in
`public_html/api/vrm-token.php` via File Manager → revoke the old token. Done.

(The old Cloudflare Worker option — `victron-vrm-proxy.js` + `wrangler.toml` — is still
in the repo if ever preferred, but the PHP route needs no third-party account.)
