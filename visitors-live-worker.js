/*
 * 365 Techies — live-visitors collector (Cloudflare Worker).
 *
 * WHAT IT DOES: a tiny beacon on each site POSTs one ping per page view. The
 * Worker notes "this anonymous visitor is on this page right now" in KV with a
 * 5-minute TTL, tagged with the city/country Cloudflare provides for free.
 * The staff portal polls GET /live (token-authed, server-side) and shows who's
 * on which site, on which pages, from roughly where — live.
 *
 * PRIVACY BY CONSTRUCTION (this is what keeps client sites banner-free):
 *   - no cookies, no localStorage, nothing set on the visitor's device;
 *   - the visitor key is SHA-256(ip + user-agent + site + utc-day + salt),
 *     so it cannot be reversed, rotates daily, and the raw IP is never stored;
 *   - only page path, city, country and a timestamp are kept — for 5 minutes;
 *   - the beacon respects Do Not Track.
 *
 * ARCHITECTURE NOTE: the Worker is TRANSPORT, not the system of record (the
 * house rule). It holds only the rolling 5-minute window; any history/
 * aggregation lives server-side with us, fed by polling /live. KV free tier
 * allows ~1k writes/day ≈ 1k page views/day across all sites — fine today;
 * if the sites outgrow it, the $5/mo Workers plan lifts it to 1M/day.
 *
 * DEPLOY (Cloudflare dashboard, ~3 minutes — same routine as the VRM proxy):
 *   1. Workers & Pages -> Create -> Create Worker -> paste this file -> Deploy.
 *   2. Storage & Databases -> KV -> Create namespace: "visitors-live".
 *      Worker -> Settings -> Bindings -> add KV namespace binding:
 *          Variable name: VISITS      Namespace: visitors-live
 *   3. Worker -> Settings -> Variables and Secrets -> add SECRET:
 *          VIS_TOKEN = a long random string (the read password)
 *   4. Note the Worker URL, then on the 365 server create api/visitors-key.php:
 *          <?php $VIS_URL='https://<worker-url>'; $VIS_TOKEN='<same secret>';
 *      (gitignored + .htaccess-denied, like every other key file.)
 */

const SITES = {
  t365: ["https://365techies.co.uk", "https://www.365techies.co.uk"],
  ccb: ["https://colinclarkbuilders.co.uk", "https://www.colinclarkbuilders.co.uk"],
  beckox: ["https://beckox.co.uk", "https://www.beckox.co.uk"],
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsFor(request) });
    }

    if (request.method === "POST" && url.pathname === "/ping") {
      return ping(request, env);
    }
    if (request.method === "GET" && url.pathname === "/live") {
      return live(request, env, url);
    }
    return json({ ok: false, error: "not-found" }, 404, {});
  },
};

function corsFor(request) {
  const origin = request.headers.get("Origin") || "";
  const allowed = Object.values(SITES).flat().includes(origin) ? origin : "";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  };
}

function json(obj, status, headers) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers },
  });
}

async function ping(request, env) {
  const headers = corsFor(request);
  if (!env.VISITS) return json({ ok: false, error: "no-kv" }, 500, headers);

  // the beacon is browser-only: an allowlisted Origin is required
  if (!headers["Access-Control-Allow-Origin"]) return json({ ok: false, error: "origin" }, 403, headers);

  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: "bad-json" }, 400, headers); }
  const site = String(body.site || "");
  if (!SITES[site]) return json({ ok: false, error: "site" }, 403, headers);
  // belt and braces: the origin must belong to the site key it claims
  if (!SITES[site].includes(request.headers.get("Origin"))) return json({ ok: false, error: "site-origin" }, 403, headers);

  let path = String(body.path || "/").slice(0, 200);
  if (!path.startsWith("/")) path = "/";
  path = path.split("?")[0];

  const ip = request.headers.get("CF-Connecting-IP") || "";
  const ua = request.headers.get("User-Agent") || "";
  const day = new Date().toISOString().slice(0, 10);
  const vhash = (await sha256hex(ip + "|" + ua + "|" + site + "|" + day + "|v1salt")).slice(0, 16);

  const city = (request.cf && request.cf.city) || "";
  const country = (request.cf && request.cf.country) || "";

  // one KV entry per visitor+page, 5-minute TTL = the live window. Skip the
  // write when the same visitor pinged the same page moments ago (free-tier
  // write budget is the scarce resource; reads are plentiful).
  const key = "live:" + site + ":" + vhash + ":" + (await sha256hex(path)).slice(0, 10);
  const existing = await env.VISITS.get(key, "json");
  const now = Math.floor(Date.now() / 1000);
  if (!existing || now - (existing.t || 0) > 60) {
    await env.VISITS.put(key, JSON.stringify({ p: path, c: city, ct: country, t: now }), { expirationTtl: 300 });
  }
  return json({ ok: true }, 200, headers);
}

async function live(request, env, url) {
  if (!env.VIS_TOKEN || url.searchParams.get("auth") !== env.VIS_TOKEN) {
    return json({ ok: false, error: "auth" }, 403, {});
  }
  if (!env.VISITS) return json({ ok: false, error: "no-kv" }, 500, {});
  const site = String(url.searchParams.get("site") || "");
  if (!SITES[site]) return json({ ok: false, error: "site" }, 400, {});

  const now = Math.floor(Date.now() / 1000);
  const seen = new Set();
  const pages = {};
  const places = {};
  let cursor;
  do {
    const res = await env.VISITS.list({ prefix: "live:" + site + ":", cursor, limit: 1000 });
    for (const k of res.keys) {
      const v = await env.VISITS.get(k.name, "json");
      if (!v) continue;
      const vhash = k.name.split(":")[2];
      seen.add(vhash);
      pages[v.p] = (pages[v.p] || 0) + 1;
      const where = v.c ? v.c + ", " + v.ct : v.ct || "?";
      places[where] = (places[where] || 0) + 1;
    }
    cursor = res.list_complete ? null : res.cursor;
  } while (cursor);

  return json({ ok: true, site, at: now, visitors: seen.size, pages, places }, 200, {});
}

async function sha256hex(s) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
