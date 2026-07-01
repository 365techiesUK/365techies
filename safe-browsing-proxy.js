/*
 * safe-browsing-proxy.js — Cloudflare Worker
 * ------------------------------------------------------------
 * Upgrades the /link-safety-checker/ tool with a DEFINITIVE Google Safe Browsing
 * check on top of its built-in heuristics. The API key stays private (a Worker secret),
 * and CORS is locked to 365techies.co.uk. (Safe Browsing isn't browser-callable directly,
 * which is why this proxy exists.)
 *
 * SETUP (only when you want the definitive check):
 *   1. Google Cloud Console -> enable "Safe Browsing API" -> Credentials -> API key.
 *   2. Cloudflare -> Workers & Pages -> Create Worker -> paste this file -> Deploy.
 *   3. That worker -> Settings -> Variables and Secrets -> add secret  SB_KEY = <your key>.
 *   4. Copy the Worker URL and put it in SB_ENDPOINT on the /link-safety-checker/ page
 *      (the SCAM_TOOL script in build_pages.py) -> rebuild. Or send me the URL and I'll wire it.
 * Until then, the tool works fine on its built-in phishing heuristics (no key needed).
 * ------------------------------------------------------------
 */

const ALLOW_ORIGIN = "https://365techies.co.uk";
const THREAT_TYPES = ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"];

export default {
  async fetch(request, env) {
    const cors = {
      "Access-Control-Allow-Origin": ALLOW_ORIGIN,
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin",
    };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });

    const url = new URL(request.url).searchParams.get("url");
    if (!url) return json({ error: "missing url" }, 400, cors);
    if (!env.SB_KEY) return json({ threat: null, note: "no key configured" }, 200, cors);

    const body = {
      client: { clientId: "365techies", clientVersion: "1.0" },
      threatInfo: {
        threatTypes: THREAT_TYPES,
        platformTypes: ["ANY_PLATFORM"],
        threatEntryTypes: ["URL"],
        threatEntries: [{ url }],
      },
    };

    try {
      const r = await fetch("https://safebrowsing.googleapis.com/v4/threatMatches:find?key=" + env.SB_KEY, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      const threat = (d.matches && d.matches[0] && d.matches[0].threatType) || null;
      return json({ threat }, 200, cors);
    } catch (e) {
      return json({ threat: null, error: "upstream" }, 200, cors);
    }
  },
};

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json" } });
}
