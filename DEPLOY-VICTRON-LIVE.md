# Make the Victron dashboard show LIVE data

Right now both live widgets (the full one on **/off-grid-victron-energy/** and the
compact one on **/lithium-battery-installs-dorset/**) show a clearly-labelled
**"sample reading."** That is on purpose: the website is static, and the VRM API
needs a login, so the access token must **never** be put in the page (anyone could
read it in "View Source"). The data is live and reachable — it just needs one secure
link that only you can switch on, because it uses your account.

Two ways to do it. **Option A keeps the custom animated widget** (solar→battery→loads
flow, savings at 20p/kWh, 30-day history). **Option B is faster but shows VRM's own
styling** instead of our widget.

---

## ⚠️ First, for security
The token that was pasted in chat should be treated as compromised. In VRM Portal →
**Preferences → Integrations → Access tokens**, delete it and create a **fresh** one.
Use the fresh token below. Never put a token in the website or in git.

---

## Option A — Cloudflare Worker (recommended: keeps our custom widget)

A tiny free proxy that holds the token as a secret and returns only safe display
values. Code is already in the repo: `victron-vrm-proxy.js` (+ `wrangler.toml`).

### Easiest: Cloudflare dashboard (no command line)
1. Go to **dash.cloudflare.com** → **Workers & Pages** → **Create** → **Create Worker**.
2. Give it a name (e.g. `victron-vrm-proxy`) → **Deploy** → **Edit code**.
3. Delete the sample code, paste the entire contents of `victron-vrm-proxy.js`, **Deploy**.
4. Open the Worker → **Settings → Variables and Secrets** → add two **Secrets**:
   - `VRM_TOKEN` = your fresh VRM token
   - `VRM_SITE_ID` = `458482`
5. Copy the Worker URL (looks like `https://victron-vrm-proxy.<you>.workers.dev`).
6. Send me that URL (or paste it into the `PROXY = ""` line in **both** widgets in
   `build_extra.py` and rebuild). Done — live, updating every second.

### Or with the CLI (if you have Node.js)
```
cd 365-techies
npx wrangler deploy
npx wrangler secret put VRM_TOKEN      # paste fresh token
npx wrangler secret put VRM_SITE_ID    # enter 458482
```
Then copy the printed URL into the two `PROXY` constants and rebuild.

**Test it:** open the Worker URL in a browser — you should see JSON with `"ok":true`,
`soc`, `pvW`, `yieldLifetime`, etc. If you see `"not_configured"`, the secrets aren't set.

---

## Option B — VRM "Share your site" iframe (fastest, no Cloudflare)

Live in about a minute, but it shows VRM's standard dashboard, not our animated widget.
1. VRM Portal → open the **365 Crafter** installation.
2. **Share** menu (left sidebar) → enable sharing → enable the **Embed** option.
   (Optional: "Hide my exact location.")
3. Copy the **embed iframe URL**.
4. Send it to me — I'll drop it into the off-grid page.

Note: updates at your GX device's logging frequency (not per-second), and it's
read-only/anonymous; the share token stays valid until you toggle sharing off.

---

**Recommendation:** Option A, because it keeps everything we built — the animated
flow, the live savings counter and the 30-day history — and updates every second.
Option B is the quick fallback if you'd rather not touch Cloudflare.
