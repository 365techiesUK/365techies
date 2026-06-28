/*
 * 365 Techies — Victron VRM live-data proxy (Cloudflare Worker).
 *
 * WHY THIS EXISTS: the website is static, so a VRM token must NEVER be put in the
 * page (anyone could read it in "View Source"). This little Worker holds the token
 * as a Cloudflare *secret*, calls Victron VRM server-side, and returns ONLY the
 * safe display values. The website widget fetches from this Worker's URL.
 *
 * DEPLOY (about 2 minutes, free):
 *   1. Cloudflare dashboard → Workers & Pages → Create → Create Worker.
 *   2. Paste this whole file as the Worker code and Deploy. Note its URL
 *      (e.g. https://victron-vrm-proxy.<your-subdomain>.workers.dev).
 *   3. Worker → Settings → Variables and Secrets → add two SECRETS:
 *        VRM_TOKEN    = your *fresh* VRM access token  (rotate the old one!)
 *        VRM_SITE_ID  = 458482
 *   4. Put the Worker URL into VRM_PROXY_URL in the off-grid page's live widget.
 *
 * The Worker exposes no token and returns only: soc, battery V/A/W, state,
 * solar power, yield today, time-to-go and tank levels.
 */
export default {
  async fetch(request, env) {
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Cache-Control": "public, max-age=20",
      "Content-Type": "application/json; charset=utf-8",
    };
    if (request.method === "OPTIONS") return new Response(null, { headers });
    const token = env.VRM_TOKEN, site = env.VRM_SITE_ID;
    if (!token || !site) {
      return new Response(JSON.stringify({ ok: false, error: "not_configured" }), { status: 500, headers });
    }
    try {
      const r = await fetch(`https://vrmapi.victronenergy.com/v2/installations/${site}/diagnostics?count=300`, {
        headers: { "X-Authorization": "Token " + token },
      });
      if (!r.ok) {
        return new Response(JSON.stringify({ ok: false, error: "vrm_" + r.status }), { status: 502, headers });
      }
      const data = await r.json();
      const recs = data.records || [];
      const find = (c) => recs.find((x) => x.code === c);
      const num = (c) => { const x = find(c); return x && x.rawValue != null ? Number(x.rawValue) : null; };
      const sum = (c) => recs.filter((x) => x.code === c).reduce((a, x) => a + (Number(x.rawValue) || 0), 0);
      // tanks: group records by device instance, read fluid type (tf) + level (tl)
      const ti = {};
      for (const x of recs) {
        if (x.Device === "Tank") {
          ti[x.instance] = ti[x.instance] || {};
          if (x.code === "tl") ti[x.instance].level = Number(x.rawValue);
          if (x.code === "tf") ti[x.instance].type = x.formattedValue;
        }
      }
      const tanks = Object.values(ti).filter((t) => t.type != null && t.level != null)
        .map((t) => ({ type: t.type, level: Math.round(t.level) }));
      const stateRec = find("bst");
      const updated = recs.reduce((m, x) => Math.max(m, x.timestamp || 0), 0);
      const out = {
        ok: true,
        updated,
        soc: num("bs"),
        battState: stateRec ? String(stateRec.formattedValue).toLowerCase() : null,
        battV: num("bv"),
        battA: num("bc"),
        battW: num("bp"),
        timeToGo: num("bt"),
        pvW: Math.round(sum("PVP")),
        yieldToday: Math.round(sum("YT") * 100) / 100,
        tanks,
      };
      return new Response(JSON.stringify(out), { headers });
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, error: "fetch_failed" }), { status: 500, headers });
    }
  },
};
