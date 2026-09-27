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
 *   - only page path, city, country, a city-level position, the postcode AREA
 *     letters (BH, DT...), where the visit came from (a site NAME such as
 *     Google or Facebook - never a path or search words) and a timestamp are
 *     kept - for 5 minutes;
 *   - the beacon respects Do Not Track and skips staff devices.
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

// Where a visit came from: the beacon sends the referrer's HOST only; it becomes a plain name. "" = moving around
// our own site (the visit keeps the source of its first page); null = an older beacon that sends nothing.
const OWN = /(^|\.)(365techies\.co\.uk|colinclarkbuilders\.co\.uk|beckox\.co\.uk)$/;
function sourceOf(ref, email) {
  if (email) return "Email";
  if (ref === undefined || ref === null) return null;
  const h = String(ref).toLowerCase().replace(/^www\./, "").slice(0, 80);
  if (!h) return "Direct";
  if (OWN.test(h)) return "";
  if (/(^|\.)(chatgpt\.com|openai\.com|perplexity\.ai|claude\.ai)$|^copilot\.microsoft\.com$|^gemini\.google\.com$/.test(h)) return "AI assistant";
  if (/^mail\.|^outlook\.(live|office|office365)\.com$|webmail|mail\.yahoo\./.test(h)) return "Email";
  if (/(^|\.)google\.[a-z.]+$/.test(h)) return "Google";
  if (/(^|\.)bing\.com$/.test(h)) return "Bing";
  if (/duckduckgo\.com$|(^|\.)yahoo\.|ecosia\.org$|search\.brave\.com$|startpage\.com$/.test(h)) return "Other search";
  if (/(^|\.)(facebook\.com|fb\.com|fb\.me)$/.test(h)) return "Facebook";
  if (/(^|\.)instagram\.com$/.test(h)) return "Instagram";
  if (/^(t\.co|x\.com|twitter\.com)$/.test(h)) return "X";
  if (/(^|\.)linkedin\.com$|^lnkd\.in$/.test(h)) return "LinkedIn";
  if (/(^|\.)youtube\.com$|^youtu\.be$/.test(h)) return "YouTube";
  if (/(^|\.)nextdoor\./.test(h)) return "Nextdoor";
  if (/(^|\.)tiktok\.com$/.test(h)) return "TikTok";
  return h.replace(/[^a-z0-9.-]/g, "");   // another website, e.g. yell.com
}

// "Dorset & around": a BH or DT postcode area; with no postcode, within ~45 km of Bournemouth
const HOME = [50.7192, -1.8808];
function isLocal(area, la, lo) {
  if (area) return area === "BH" || area === "DT";
  if (la === null || lo === null) return false;
  const dy = (la - HOME[0]) * 111.2, dx = (lo - HOME[1]) * 111.2 * Math.cos(HOME[0] * Math.PI / 180);
  return Math.sqrt(dx * dx + dy * dy) <= 45;
}
function num2(v) { const n = parseFloat(v); return isFinite(n) ? Math.round(n * 100) / 100 : null; }

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

  const cf = request.cf || {};
  const city = String(cf.city || "").slice(0, 60);
  const country = String(cf.country || "").slice(0, 2);
  const la = num2(cf.latitude), lo = num2(cf.longitude);
  const area = (String(cf.postalCode || "").toUpperCase().match(/^[A-Z]{1,2}/) || [""])[0];
  const src = sourceOf(body.ref, body.em === 1 || body.em === "1");

  // one KV entry per visitor+page, 5-minute TTL = the live window. Skip the
  // write when the same visitor pinged the same page moments ago (free-tier
  // write budget is the scarce resource; reads are plentiful).
  const key = "live:" + site + ":" + vhash + ":" + (await sha256hex(path)).slice(0, 10);
  const existing = await env.VISITS.get(key, "json");
  const now = Math.floor(Date.now() / 1000);
  if (!existing || now - (existing.t || 0) > 60) {
    // a reload or a hop back keeps the source this page first arrived with
    const s = src ? src : ((existing && existing.s) || src);
    const m = { p: path, c: city, ct: country, t: now, la, lo, a: area, s };
    // the same facts ride in the key's metadata, so /live can read everything from ONE list call
    await env.VISITS.put(key, JSON.stringify(m), { expirationTtl: 300, metadata: m });
  }
  return json({ ok: true }, 200, headers);
}

async function live(request, env, url) {
  if (!env.VIS_TOKEN || url.searchParams.get("auth") !== env.VIS_TOKEN) {
    return json({ ok: false, error: "auth" }, 403, {});
  }
  if (!env.VISITS) return json({ ok: false, error: "no-kv" }, 500, {});
  const site = String(url.searchParams.get("site") || "");
  // site=all: every site from ONE list call and no per-key reads (free tier: 1,000 lists/day, account-wide)
  if (site === "all") {
    const out = {};
    for (const s of Object.keys(SITES)) out[s] = { seen: new Set(), pages: {}, places: {}, vis: {} };
    let cur;
    do {
      const res = await env.VISITS.list({ prefix: "live:", cursor: cur, limit: 1000 });
      for (const k of res.keys) {
        const bits = k.name.split(":"), o = out[bits[1]];
        const v = k.metadata || (await env.VISITS.get(k.name, "json"));
        if (!o || !v) continue;
        o.seen.add(bits[2]);
        o.pages[v.p] = (o.pages[v.p] || 0) + 1;
        const where = v.c ? v.c + ", " + v.ct : v.ct || "?";
        o.places[where] = (o.places[where] || 0) + 1;
        // one row per visitor: their pages in order, where they are, where they came from
        (o.vis[bits[2]] || (o.vis[bits[2]] = [])).push(v);
      }
      cur = res.list_complete ? null : res.cursor;
    } while (cur);
    const now = Math.floor(Date.now() / 1000);
    const sites = {};
    for (const s of Object.keys(out)) {
      const rows = Object.keys(out[s].vis).map((vh) => {
        const hits = out[s].vis[vh].sort((a, b) => (a.t || 0) - (b.t || 0));
        const last = hits[hits.length - 1], first = hits[0];
        const la = typeof last.la === "number" ? last.la : null, lo = typeof last.lo === "number" ? last.lo : null;
        const srcHit = hits.find((h) => h.s);
        return {
          id: vh.slice(0, 8), place: last.c || "", ct: last.ct || "", la, lo,
          local: isLocal(last.a || "", la, lo),
          src: srcHit ? srcHit.s : null,
          pages: hits.map((h) => h.p).slice(-12),
          since: first.t ? Math.max(0, now - first.t) : null,
          ago: last.t ? Math.max(0, now - last.t) : null,
        };
      }).sort((a, b) => (a.ago === null ? 1e9 : a.ago) - (b.ago === null ? 1e9 : b.ago)).slice(0, 100);
      sites[s] = { visitors: out[s].seen.size, pages: out[s].pages, places: out[s].places, rows };
    }
    return json({ ok: true, at: now, sites }, 200, {});
  }
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
