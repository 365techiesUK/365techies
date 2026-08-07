# Live visitors — deploy checklist (~5 minutes, once)

The code is all shipped and dormant. These four steps light it up.

## 1. Deploy the Worker (Cloudflare dashboard — same routine as the VRM proxy)

1. **Workers & Pages → Create → Create Worker**, name it `visitors-live`, paste
   the whole of `visitors-live-worker.js`, **Deploy**. Note the URL
   (e.g. `https://visitors-live.<account>.workers.dev`).
2. **Storage & Databases → KV → Create namespace**: `visitors-live`.
   Then Worker → **Settings → Bindings → Add → KV namespace**:
   variable name `VISITS`, namespace `visitors-live`.
3. Worker → **Settings → Variables and Secrets → Add → Secret**:
   `VIS_TOKEN` = a long random string (this is the read password — treat it
   like any other key).

## 2. Server key file

Create `api/visitors-key.php` on the server (File Manager is fine —
it is already gitignored and .htaccess-denied):

    <?php $VIS_URL='https://visitors-live.<account>.workers.dev'; $VIS_TOKEN='<the same secret>';

## 3. Turn the beacon on for 365techies.co.uk

In `build_pages.py` set:

    VISITORS_WORKER = "https://visitors-live.<account>.workers.dev"

then rebuild + push (or ask Claude — one line + a build).

## 4. Check it

Open the staff portal → the **“Live on the sites”** card. Browse the site in
another tab; within a few seconds you should appear (Bournemouth-ish, on the
page you opened). CCB/Beckox rows say “unreachable/0” until their beacons are
added — that is the next step once the Worker URL exists (their sites are in
the Worker's allowlist already).

## Notes

- Free KV tier ≈ 1,000 writes/day ≈ 1,000 page views/day across all sites.
  If the card ever shows less than reality on a busy day, that is the ceiling —
  the $5/mo Workers plan lifts it to 1M/day, or we migrate to Durable Objects.
- Privacy stance (why no cookie banner is needed): no cookies or storage on the
  visitor's device, anonymous daily-rotating hash, city-level location only,
  data lives for 5 minutes. The beacon honours Do Not Track.
