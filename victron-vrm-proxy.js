/*
 * 365 Techies — Victron VRM live-data proxy (Cloudflare Worker).
 *
 * WHY THIS EXISTS: the website is static, so a VRM token must NEVER be put in the
 * page (anyone could read it in "View Source"). This Worker holds the token as a
 * Cloudflare *secret*, calls Victron VRM server-side, and returns ONLY safe display
 * values. The website widget fetches this Worker's URL.
 *
 * DEPLOY (about 2 minutes, free):
 *   1. Cloudflare dashboard -> Workers & Pages -> Create -> Create Worker.
 *   2. Paste this whole file as the Worker code and Deploy. Note its URL.
 *   3. Worker -> Settings -> Variables and Secrets -> add two SECRETS:
 *        VRM_TOKEN    = your *fresh* VRM access token  (rotate the old one!)
 *        VRM_SITE_ID  = 458482
 *   4. Put the Worker URL into VRM_PROXY in the off-grid live widget.
 *
 * Returns: live readings (soc, battery V/A/W, state, solar W, time-to-go, tanks),
 * lifetime + today/yesterday solar yield, and a 30-day daily-yield history.
 */
export default {
  async fetch(request, env) {
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Cache-Control": "public, max-age=3",
      "Content-Type": "application/json; charset=utf-8",
    };
    if (request.method === "OPTIONS") return new Response(null, { headers });
    const token = env.VRM_TOKEN, site = env.VRM_SITE_ID;
    if (!token || !site) return new Response(JSON.stringify({ ok: false, error: "not_configured" }), { status: 500, headers });
    const auth = { "X-Authorization": "Token " + token };
    const base = "https://vrmapi.victronenergy.com/v2/installations/" + site;
    const now = Math.floor(Date.now() / 1000), start = now - 31 * 86400;
    try {
      const [dRes, sRes] = await Promise.all([
        fetch(base + "/diagnostics?count=300", { headers: auth }),
        fetch(base + "/stats?type=solar_yield&interval=days&start=" + start + "&end=" + now, { headers: auth }),
      ]);
      if (!dRes.ok) return new Response(JSON.stringify({ ok: false, error: "vrm_" + dRes.status }), { status: 502, headers });
      const data = await dRes.json();
      const recs = data.records || [];
      const find = (c) => recs.find((x) => x.code === c);
      const num = (c) => { const x = find(c); return x && x.rawValue != null ? Number(x.rawValue) : null; };
      const sum = (c) => recs.filter((x) => x.code === c).reduce((a, x) => a + (Number(x.rawValue) || 0), 0);
      const ti = {};
      for (const x of recs) {
        if (x.Device === "Tank") {
          ti[x.instance] = ti[x.instance] || {};
          if (x.code === "tl") ti[x.instance].level = Number(x.rawValue);
          if (x.code === "tf") ti[x.instance].type = x.formattedValue;
        }
      }
      const tanks = Object.values(ti).filter((t) => t.type != null && t.level != null).map((t) => ({ type: t.type, level: Math.round(t.level) }));
      // history: PV-to-battery (Pb) + PV-to-consumers (Pc) per day = total daily solar
      let history = [];
      if (sRes.ok) {
        try {
          const st = (await sRes.json()).records || {};
          const Pb = st.Pb || [], Pc = st.Pc || [];
          history = Pb.map((p, i) => ({ t: p[0], kwh: Math.round(((Number(p[1]) || 0) + (Pc[i] ? Number(Pc[i][1]) || 0 : 0)) * 100) / 100 }));
        } catch (e) {}
      }
      const stateRec = find("bst");
      const out = {
        ok: true,
        updated: recs.reduce((m, x) => Math.max(m, x.timestamp || 0), 0),
        soc: num("bs"),
        battState: stateRec ? String(stateRec.formattedValue).toLowerCase() : null,
        battV: num("bv"), battA: num("bc"), battW: num("bp"), timeToGo: num("bt"),
        pvW: Math.round(sum("PVP")),
        yieldToday: Math.round(sum("YT") * 100) / 100,
        yieldYesterday: Math.round(sum("YY") * 100) / 100,
        yieldLifetime: Math.round(sum("YU") * 10) / 10,
        tanks, history,
      };
      return new Response(JSON.stringify(out), { headers });
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, error: "fetch_failed" }), { status: 500, headers });
    }
  },
};
