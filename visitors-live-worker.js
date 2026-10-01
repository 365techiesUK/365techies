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
 *     Google or Facebook - never a path or search words), a timestamp and
 *     (29 Sep 2026) the kind of device - phone, tablet or PC; the system
 *     (Windows 11, iPhone...), the browser and its major version, a screen
 *     size band, dark mode, the language - are kept, for 5 minutes. The
 *     device facts are what any web server sees anyway (the User-Agent),
 *     plus the Windows version Chrome and Edge give when asked; never the
 *     full User-Agent string, a phone model or a screen's exact size;
 *   - the beacon respects Do Not Track and skips staff devices;
 *   - (1 Oct 2026) a visit from a data centre or VPN network is marked dc
 *     and keeps that network's NAME (Amazon, OVH...) - a company, never a
 *     person's broadband provider, which is never stored.
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

// "Dorset & around": a BH, DT, SO or SP postcode area (Dorset, the New Forest, Southampton, Salisbury, Shaftesbury);
// with no postcode, within ~55 km of Bournemouth
const HOME = [50.7192, -1.8808];
function isLocal(area, la, lo) {
  if (area) return area === "BH" || area === "DT" || area === "SO" || area === "SP";
  if (la === null || lo === null) return false;
  const dy = (la - HOME[0]) * 111.2, dx = (lo - HOME[1]) * 111.2 * Math.cos(HOME[0] * Math.PI / 180);
  return Math.sqrt(dx * dx + dy * dy) <= 55;
}
function num2(v) { const n = parseFloat(v); return isFinite(n) ? Math.round(n * 100) / 100 : null; }

// 29 Sep 2026: what the visitor is on, from the User-Agent every server sees plus a few coarse facts the beacon adds:
//   pv  Windows' platformVersion from Chrome/Edge client hints ("15.0.0"; 13+ = Windows 11, 1-12 = Windows 10) - the
//       User-Agent itself has said "Windows NT 10.0" for every Windows since 2021
//   t   touch points (an iPad in Safari's desktop mode says "Macintosh" but has touch)
//   mb  navigator.userAgentData.mobile (1/0) when the browser has it
//   sw  screen width in CSS px -> a band only ("s" under 600, "m" under 1100, "l")
//   dk  dark mode 1/0;  lg  language ("en-GB")
// -> { os, br, dv, sc, dk, lg }: short strings the portal shows as "Windows 11 · Edge 140 · PC · large screen".
// The shapes below are the reduced/frozen User-Agents browsers send today; unknown ones fall back to plain words.
export function deviceOf(ua, body) {
  ua = String(ua || "").slice(0, 400);
  body = body && typeof body === "object" ? body : {};
  const touch = Math.max(0, parseInt(body.t, 10) || 0);
  const mobile = body.mb === 1 || body.mb === "1" ? true : body.mb === 0 || body.mb === "0" ? false : null;
  const sw = parseInt(body.sw, 10) || 0;
  const pvMajor = parseInt(String(body.pv || "").split(".")[0], 10);
  const m = (re) => { const x = re.exec(ua); return x ? x[1] : ""; };

  // the system
  let os = "", dv = "pc";
  if (/iPhone|iPod/.test(ua)) { os = "iPhone"; dv = "phone"; }
  else if (/iPad/.test(ua) || (/Macintosh/.test(ua) && touch > 1)) { os = "iPad"; dv = "tablet"; }
  else if (/Android/.test(ua)) { os = "Android"; dv = /Mobile/.test(ua) ? "phone" : "tablet"; }
  else if (/Windows Phone/.test(ua)) { os = "Windows Phone"; dv = "phone"; }
  else if (/Windows NT 10\.0/.test(ua)) {
    os = isFinite(pvMajor) && pvMajor >= 13 ? "Windows 11" : isFinite(pvMajor) && pvMajor >= 1 ? "Windows 10" : "Windows";
  }
  else if (/Windows NT 6\.3/.test(ua)) os = "Windows 8.1";
  else if (/Windows NT 6\.2/.test(ua)) os = "Windows 8";
  else if (/Windows NT 6\.1/.test(ua)) os = "Windows 7";
  else if (/Windows/.test(ua)) os = "Windows";
  else if (/CrOS/.test(ua)) os = "ChromeOS";
  else if (/Macintosh|Mac OS X/.test(ua)) os = "Mac";
  else if (/Linux|X11/.test(ua)) os = "Linux";
  else os = "";
  if (mobile === true && dv === "pc") dv = "phone";
  if (dv === "pc" && os === "" && touch > 0 && sw > 0 && sw < 600) dv = "phone";   // an unknown system on a small touch screen
  if (dv === "pc" && os === "" && !/Chrome|Safari|Firefox|Edg|OPR|Trident/.test(ua) && mobile === null && touch === 0) dv = "";   // nothing to go on: say nothing

  // the browser and its major version (on iPhone/iPad every browser is WebKit with its own tag)
  let br = "";
  const v = (tag) => { const x = m(new RegExp(tag + "/(\\d+)")); return x ? " " + x : ""; };
  if (/EdgiOS\//.test(ua)) br = "Edge" + v("EdgiOS");
  else if (/CriOS\//.test(ua)) br = "Chrome" + v("CriOS");
  else if (/FxiOS\//.test(ua)) br = "Firefox" + v("FxiOS");
  else if (/Edg\//.test(ua)) br = "Edge" + v("Edg");
  else if (/SamsungBrowser\//.test(ua)) br = "Samsung Internet" + v("SamsungBrowser");
  else if (/OPR\//.test(ua)) br = "Opera" + v("OPR");
  else if (/Firefox\//.test(ua)) br = "Firefox" + v("Firefox");
  else if (/Chrome\//.test(ua)) br = "Chrome" + v("Chrome");
  else if (/Version\/\d+.*Safari\//.test(ua)) br = "Safari" + v("Version");
  else if (/Safari\//.test(ua)) br = "Safari";
  else if (/MSIE |Trident\//.test(ua)) br = "Internet Explorer";

  const sc = sw > 0 ? (sw < 600 ? "s" : sw < 1100 ? "m" : "l") : "";
  const dk = body.dk === 1 || body.dk === "1" ? 1 : 0;
  const lg = String(body.lg || "").replace(/[^A-Za-z-]/g, "").slice(0, 12);
  return { os: os.slice(0, 20), br: br.slice(0, 24), dv, sc, dk, lg };
}

// 1 Oct 2026: visits from data centres and VPNs. A person at home or on a phone reaches us through a broadband or
// mobile network; a visit from a cloud or hosting network (Amazon, Google Cloud, Microsoft Azure, DigitalOcean, OVH,
// Hetzner...) is nearly always a program with an ordinary browser User-Agent - an SEO tool, an AI agent, a monitor,
// a scraper - or someone on a VPN. Cloudflare gives every request its network (cf.asn, cf.asOrganization) on every
// plan. Such visits are kept apart (dc: 1): ONE entry per visitor rather than one per page (they crawl, and KV writes
// are the scarce budget), with the network's name, counted separately and left out of the statistics.
const DC_ASN = new Set([
  16509, 14618, 8987,             // Amazon (AWS)
  15169, 19527, 396982,           // Google, Google Cloud
  8075,                           // Microsoft (Azure)
  14061,                          // DigitalOcean
  16276,                          // OVH
  24940, 213230,                  // Hetzner
  63949,                          // Akamai Connected Cloud (Linode)
  20473,                          // Vultr (Choopa)
  31898,                          // Oracle Cloud
  45102, 37963,                   // Alibaba Cloud
  132203, 45090,                  // Tencent Cloud
  136907, 55990,                  // Huawei Cloud
  51167,                          // Contabo
  12876,                          // Scaleway
  60781, 16265,                   // Leaseweb
  47583,                          // Hostinger
  9009,                           // M247 (servers, and many VPNs)
  60068,                          // Datacamp / CDN77 (servers, and many VPNs)
  396986,                         // ByteDance
  32934,                          // Facebook / Meta
  36352,                          // ColoCrossing
  8100,                           // QuadraNet
  62240,                          // Clouvider
]);
const DC_ORG = /amazon\.com|amazon technologies|amazon data services|amazon web services|google cloud|google llc|microsoft|azure|digitalocean|\bovh|hetzner|linode|akamai connected|vultr|choopa|oracle|alibaba|aliyun|tencent|huawei cloud|contabo|scaleway|leaseweb|hostinger|\bm247\b|datacamp|cdn77|bytedance|facebook|meta platforms|colocrossing|quadranet|clouvider|ionos|hostwinds|rackspace|fasthosts|ukfast|iomart|godaddy|unified layer|bluehost|namecheap|liquid web|psychz|zenlayer|g-core|gcore|stark industries|frantech|worldstream|serverius|nforce|hivelocity|hosting|data ?cent(er|re)|\bservers?\b|\bvps\b|\bcloud\b|colocation|dedicated/i;
// iCloud Private Relay and Cloudflare WARP carry real people through these networks: never a data centre by name
const NOT_DC = /cloudflare|akamai technologies|fastly/i;
export function dataCentre(asn, org) {
  const n = parseInt(asn, 10);
  if (isFinite(n) && DC_ASN.has(n)) return true;
  const o = String(org || "");
  if (!o || NOT_DC.test(o)) return false;
  return DC_ORG.test(o);
}

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

  // a data centre or VPN (see dataCentre): one entry per visitor, its newest page only
  const dc = dataCentre(cf.asn, cf.asOrganization);

  // one KV entry per visitor+page, 5-minute TTL = the live window. Skip the
  // write when the same visitor pinged the same page moments ago (free-tier
  // write budget is the scarce resource; reads are plentiful).
  const key = "live:" + site + ":" + vhash + ":" + (dc ? "dc" : (await sha256hex(path)).slice(0, 10));
  const existing = await env.VISITS.get(key, "json");
  const now = Math.floor(Date.now() / 1000);
  if (!existing || now - (existing.t || 0) > 60) {
    // a reload or a hop back keeps the source this page first arrived with
    const s = src ? src : ((existing && existing.s) || src);
    const d = deviceOf(ua, body);
    const m = { p: path, c: city, ct: country, t: now, la, lo, a: area, s, os: d.os, br: d.br, dv: d.dv, sc: d.sc, dk: d.dk, lg: d.lg };
    if (dc) { m.dc = 1; m.org = String(cf.asOrganization || ("AS" + (cf.asn || "?"))).replace(/[^A-Za-z0-9 .,&()-]/g, "").slice(0, 40); }
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
    for (const s of Object.keys(SITES)) out[s] = { seen: new Set(), auto: new Set(), pages: {}, places: {}, vis: {} };
    let cur;
    do {
      const res = await env.VISITS.list({ prefix: "live:", cursor: cur, limit: 1000 });
      for (const k of res.keys) {
        const bits = k.name.split(":"), o = out[bits[1]];
        const v = k.metadata || (await env.VISITS.get(k.name, "json"));
        if (!o || !v) continue;
        // a data centre or VPN: its own row, outside the counts of people
        if (v.dc) { o.auto.add(bits[2]); (o.vis[bits[2]] || (o.vis[bits[2]] = [])).push(v); continue; }
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
        // the device: the newest hit that knows it (an older Worker's hits carry none)
        const devHit = [...hits].reverse().find((h) => h.dv || h.os || h.br);
        const dcHit = hits.find((h) => h.dc);
        return {
          ...(dcHit ? { dc: 1, org: dcHit.org || "" } : {}),
          id: vh.slice(0, 8), place: last.c || "", ct: last.ct || "", la, lo,
          local: isLocal(last.a || "", la, lo),
          src: srcHit ? srcHit.s : null,
          dev: devHit ? { os: devHit.os || "", br: devHit.br || "", dv: devHit.dv || "", sc: devHit.sc || "", dk: devHit.dk ? 1 : 0, lg: devHit.lg || "" } : null,
          pages: hits.map((h) => h.p).slice(-12),
          since: first.t ? Math.max(0, now - first.t) : null,
          ago: last.t ? Math.max(0, now - last.t) : null,
        };
      // people first (newest first), then data centres, so a crawler never pushes a person out of the 100
      }).sort((a, b) => ((a.dc ? 1 : 0) - (b.dc ? 1 : 0)) || ((a.ago === null ? 1e9 : a.ago) - (b.ago === null ? 1e9 : b.ago))).slice(0, 100);
      // a visitor who pinged from both kinds of network in the window counts as a person
      for (const vh of out[s].seen) out[s].auto.delete(vh);
      sites[s] = { visitors: out[s].seen.size, auto: out[s].auto.size, pages: out[s].pages, places: out[s].places, rows };
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
      if (!v || v.dc) continue;   // data centres and VPNs are not people
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
