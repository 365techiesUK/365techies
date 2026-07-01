/*
 * website-checker-proxy.js — Cloudflare Worker
 * ------------------------------------------------------------
 * Proxies Google PageSpeed Insights for the /website-checker/ tool so that:
 *   - the API key stays PRIVATE (a Worker secret, never in the website source)
 *   - results are CACHED (6h per URL) to protect your free quota from abuse
 *   - CORS is locked to 365techies.co.uk
 *
 * SETUP (one time):
 *   1. Get a free key: Google Cloud Console -> enable "PageSpeed Insights API"
 *      -> Credentials -> Create credentials -> API key. (Optionally restrict the
 *      key to the PageSpeed Insights API.)
 *   2. Cloudflare dashboard -> Workers & Pages -> Create Worker -> paste this file.
 *   3. That worker -> Settings -> Variables and Secrets -> add:
 *          Name: PSI_KEY   Value: <your API key>   (choose "Encrypt")
 *   4. Deploy. Copy the Worker URL (e.g. https://website-checker.<you>.workers.dev).
 *   5. Put that URL into PSI_ENDPOINT on the /website-checker/ page and rebuild
 *      (or just send me the URL and I'll wire it in + push).
 * ------------------------------------------------------------
 */

const ALLOW_ORIGIN = "https://365techies.co.uk";
const CATEGORIES = ["performance", "seo", "accessibility", "best-practices"];
const CACHE_SECONDS = 6 * 60 * 60; // cache each result for 6 hours

export default {
  async fetch(request, env, ctx) {
    const cors = {
      "Access-Control-Allow-Origin": ALLOW_ORIGIN,
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin",
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (request.method !== "GET") return json({ error: { message: "Method not allowed" } }, 405, cors);

    const params = new URL(request.url).searchParams;
    let target = params.get("url");
    const strategy = params.get("strategy") === "desktop" ? "desktop" : "mobile";

    if (!target) return json({ error: { message: "Missing url parameter" } }, 400, cors);
    if (!/^https?:\/\//i.test(target)) target = "https://" + target;
    try { new URL(target); } catch (e) { return json({ error: { message: "Invalid url" } }, 400, cors); }

    // Serve from cache if we checked this URL recently
    const cacheKey = new Request("https://psi-cache/" + strategy + "/" + encodeURIComponent(target));
    const cache = caches.default;
    const cached = await cache.match(cacheKey);
    if (cached) {
      return new Response(await cached.text(), {
        headers: { ...cors, "Content-Type": "application/json", "X-Cache": "HIT" },
      });
    }

    const api = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
    api.searchParams.set("url", target);
    api.searchParams.set("strategy", strategy);
    CATEGORIES.forEach((c) => api.searchParams.append("category", c));
    if (env.PSI_KEY) api.searchParams.set("key", env.PSI_KEY);

    let res;
    try {
      res = await fetch(api.toString(), { cf: { cacheTtl: 0 } });
    } catch (e) {
      return json({ error: { message: "Upstream fetch failed" } }, 502, cors);
    }

    const text = await res.text();

    // Pass through upstream errors (e.g. 429 quota) so the front-end shows the right message
    if (!res.ok) {
      return new Response(text || JSON.stringify({ error: { message: "PageSpeed error " + res.status } }), {
        status: res.status,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Cache the good result for next time
    const toCache = new Response(text, {
      headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=" + CACHE_SECONDS },
    });
    ctx.waitUntil(cache.put(cacheKey, toCache));

    return new Response(text, {
      headers: { ...cors, "Content-Type": "application/json", "X-Cache": "MISS" },
    });
  },
};

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
