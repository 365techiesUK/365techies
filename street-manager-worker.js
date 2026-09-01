/*
 * 365 Techies — Street Manager roadworks receiver (Cloudflare Worker).
 *
 * WHY THIS IS NOT A PHP ENDPOINT ON THE 365 SERVER.
 * Street Manager open data is PUSH, not pull: DfT publish through AWS SNS and
 * POST every event to an endpoint we host. Our own code already records that
 * SiteGround's WAF answers cross-origin machine requests with 202 + sgcaptcha
 * (see api/bm-sea.php and the note in api/pcm-bkpend-lib.php). AWS treats ANY
 * 2xx as delivered — so the one-time SubscriptionConfirmation POST would look
 * successful to Amazon, never reach our PHP, and the 3-day confirmation window
 * would expire in silence with nothing logged anywhere. A Worker sits in front
 * of all that, exactly as the live-visitors collector does.
 *
 * ARCHITECTURE NOTE (the house rule, same as visitors-live-worker.js): the
 * Worker is TRANSPORT, not the system of record. It holds a rolling window of
 * recent events in KV; anything durable lives server-side with us, fed by
 * api/street-manager.php polling /live.
 *
 * ⚠️ THIS IS A PUBLIC, UNAUTHENTICATED ENDPOINT THAT AMAZON POSTS TO.
 * Three things guard it, and none of them is optional:
 *   1. The receive path carries a long random segment, so it is unguessable.
 *   2. SigningCertURL and SubscribeURL are host-checked against
 *      sns.<region>.amazonaws.com BEFORE anything is fetched. Without that,
 *      a forged POST turns this Worker into an SSRF proxy — it would fetch
 *      any URL an attacker put in the body.
 *   3. The message signature is verified against the certificate, and the
 *      TopicArn is checked against the three real Street Manager topics.
 * Verification FAILS CLOSED: anything that does not verify is dropped and
 * counted, never stored and never acted on.
 *
 * DEPLOY (Cloudflare dashboard, ~5 minutes — same routine as the other two):
 *   1. Workers & Pages -> Create -> Create Worker -> paste this file -> Deploy.
 *   2. Storage & Databases -> KV -> Create namespace: "street-manager".
 *      Worker -> Settings -> Bindings -> add KV namespace binding:
 *          Variable name: ROADWORKS    Namespace: street-manager
 *   3. Worker -> Settings -> Variables and Secrets -> add two SECRETS:
 *          SM_PATH  = a long random string (the unguessable receive path)
 *          SM_TOKEN = a long random string (the read password for our server)
 *   4. The endpoint to give DfT on the onboarding form is then:
 *          https://<worker-url>/sns/<SM_PATH>
 *      Give the SAME url for both Permit and Activity — the topic each event
 *      arrived on is recorded per record, so one endpoint serves both.
 *   5. On the 365 server create api/street-manager-key.php:
 *          <?php $SM_URL='https://<worker-url>'; $SM_TOKEN='<same secret>';
 *      (gitignored + .htaccess-denied, like every other key file.)
 *
 * WATCH THE HANDSHAKE. Register only after this is deployed, then poll
 *      GET https://<worker-url>/health?token=<SM_TOKEN>
 * It reports every POST seen, whether it verified, and whether the
 * subscription confirmed. If confirmations stay at 0 an hour after
 * registering, something is wrong while there is still time to fix it.
 */

// The three real Street Manager production topics. Anything arriving on any
// other ARN is not ours and is dropped, however well signed it is.
export const TOPICS = {
  "arn:aws:sns:eu-west-2:287813576808:prod-permit-topic": "permit",
  "arn:aws:sns:eu-west-2:287813576808:prod-activity-topic": "activity",
  "arn:aws:sns:eu-west-2:287813576808:prod-section-58-topic": "section58",
};

// ⚠️ SSRF GUARD. Only ever fetch from a real SNS host in a real AWS region.
export const SNS_HOST = /^sns\.[a-z0-9-]+\.amazonaws\.com$/;

/*
 * ⚠️ FILTER BY NAME, NOT BY A GUESSED CODE.
 * Permits carry both `highway_authority` (a name) and
 * `highway_authority_swa_code` (a number). The SWA codes for BCP and Dorset
 * are not something to guess — a wrong code silently keeps everything out.
 * So this matches on the name, permissively, and every distinct authority
 * string seen is recorded under `authorities` so the real values can be read
 * off later and the filter tightened against observed data instead of memory.
 */
export const OURS = /bournemouth|christchurch|poole|\bbcp\b|dorset/i;

// A permit can run for weeks, but the Worker only ever holds a rolling window;
// the durable copy is ours, server-side. A week is long enough that a poller
// outage over a weekend loses nothing.
const TTL_SECONDS = 7 * 24 * 60 * 60;

// Free-tier KV allows ~1k writes/day. England-wide permit volume is far higher
// than Dorset's share, which is why filtering happens BEFORE any write.
const MAX_INDEX = 2000;

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    // ---- the SNS receive path -------------------------------------------
    // No SM_PATH configured means there is no receive path at all, rather
    // than a guessable fallback one.
    const snsPath = env.SM_PATH ? `/sns/${env.SM_PATH}` : null;
    if (snsPath !== null && path === snsPath) {
      if (request.method !== "POST") return json({ error: "POST only" }, 405);
      return receive(request, env);
    }

    // ---- TEMPORARY DIAGNOSTIC — DELETE ONCE THE HANDSHAKE IS CONFIRMED --
    // Reports only whether each binding exists and how long it is. Never the
    // values. Lengths alone settle the usual dashboard mistakes — a pasted
    // trailing newline, a truncated paste, a mistyped variable name — which
    // otherwise all present identically as a blanket 403.
    if (path === "/diag") {
      const shape = (v) => ({
        set: typeof v === "string" && v.length > 0,
        length: typeof v === "string" ? v.length : null,
        trimmedLength: typeof v === "string" ? v.trim().length : null,
      });
      return json({
        SM_PATH: shape(env.SM_PATH),
        SM_TOKEN: shape(env.SM_TOKEN),
        ROADWORKS: { bound: !!(env.ROADWORKS && typeof env.ROADWORKS.get === "function") },
        expect: { SM_PATH: 32, SM_TOKEN: 43 },
        hint: "length > trimmedLength means a stray newline or space was pasted",
      });
    }

    // ---- token-authed reads ---------------------------------------------
    const token = url.searchParams.get("token") || "";
    if (!env.SM_TOKEN || token !== env.SM_TOKEN) return json({ error: "forbidden" }, 403);

    if (path === "/health") return health(env);
    if (path === "/live") return live(request, env);
    return json({ error: "not found" }, 404);
  },
};

/* ------------------------------------------------------------------ receive */

async function receive(request, env) {
  const raw = await request.text();
  let msg;
  try {
    msg = JSON.parse(raw);
  } catch {
    await bump(env, "badJson");
    return json({ ok: false }, 400);
  }

  const type = String(msg.Type || "");
  await bump(env, "seen");

  // ⚠️ ARN CHECK BEFORE SIGNATURE WORK. Cheap, and it stops an attacker
  // making us fetch and parse certificates for topics that are not ours.
  if (!TOPICS[msg.TopicArn]) {
    await bump(env, "wrongTopic");
    return json({ ok: true });          // 200 so AWS stops retrying a stranger
  }

  const verified = await verify(msg);
  if (!verified) {
    await bump(env, "unverified");
    // ⚠️ 403, NOT 200. A signature failure is the one case worth making loud:
    // AWS will retry, and a genuine message that failed to verify is a bug we
    // need to see rather than silently accept or silently discard.
    return json({ ok: false, error: "signature" }, 403);
  }

  if (type === "SubscriptionConfirmation") return confirm(msg, env);
  if (type === "UnsubscribeConfirmation") {
    await bump(env, "unsubscribed");
    return json({ ok: true });
  }
  if (type === "Notification") return store(msg, env);

  await bump(env, "unknownType");
  return json({ ok: true });
}

/**
 * The handshake. AWS sends a SubscribeURL that must be visited within 3 days
 * or the registration has to be redone from scratch, so this is the single
 * most important few lines in the file — and the reason /health exists.
 */
async function confirm(msg, env) {
  let target;
  try {
    target = new URL(String(msg.SubscribeURL || ""));
  } catch {
    await bump(env, "badSubscribeUrl");
    return json({ ok: false }, 400);
  }
  // ⚠️ SSRF GUARD, again. The signature already proved this came from AWS,
  // but this is defence in depth against a certificate mis-parse: never fetch
  // anything that is not an SNS host over https.
  if (target.protocol !== "https:" || !SNS_HOST.test(target.hostname)) {
    await bump(env, "badSubscribeUrl");
    return json({ ok: false }, 400);
  }

  const res = await fetch(target.toString(), { method: "GET" });
  const ok = res.ok;
  await bump(env, ok ? "confirmed" : "confirmFailed");
  await env.ROADWORKS.put(
    "meta:lastConfirm",
    JSON.stringify({
      at: new Date().toISOString(),
      topic: TOPICS[msg.TopicArn],
      status: res.status,
      ok,
    })
  );
  // Answer AWS 200 either way — the confirmation is a separate GET, and a
  // non-2xx here would only make it retry a message already handled.
  return json({ ok });
}

/* -------------------------------------------------------------------- store */

async function store(msg, env) {
  let body;
  try {
    body = JSON.parse(String(msg.Message || ""));
  } catch {
    await bump(env, "badMessage");
    return json({ ok: true });
  }

  const topic = TOPICS[msg.TopicArn];
  const authority = String(body.highway_authority || "");

  // Record every authority string we ever see, so the filter above can later
  // be tightened against real values rather than assumptions.
  if (authority) await noteAuthority(env, authority);

  if (!OURS.test(authority)) {
    await bump(env, "filteredOut");
    return json({ ok: true });
  }

  const ref =
    body.permit_reference_number ||
    body.activity_reference_number ||
    body.work_reference_number ||
    msg.MessageId;

  const record = {
    topic,
    ref: String(ref),
    eventType: body.event_type || null,
    eventReference: body.event_reference || null,
    authority,
    authorityCode: body.highway_authority_swa_code || null,
    promoter: body.promoter_organisation || null,
    street: body.street_name || null,
    area: body.area_name || null,
    town: body.town || null,
    // ⚠️ COORDINATES ARE BRITISH NATIONAL GRID (EPSG:27700), NOT LAT/LON.
    // Street Manager serves EWKT like "SRID=27700;POINT(412345 98765)".
    // Stored verbatim and converted downstream — a Worker is the wrong place
    // to be doing a datum shift, and a half-right conversion here would be
    // invisible until things landed in the wrong street.
    coordinates: body.works_location_coordinates || body.activity_coordinates || null,
    category: body.work_category || body.activity_type || null,
    traffic: body.traffic_management_type || null,
    status: body.work_status || null,
    proposedStart: body.proposed_start_date || body.start_date || null,
    proposedEnd: body.proposed_end_date || body.end_date || null,
    actualStart: body.actual_start_date_time || null,
    actualEnd: body.actual_end_date_time || null,
    usrn: body.usrn || null,
    ttro: body.is_ttro_required ?? null,
    version: body.version ?? null,
    eventTime: body.event_time || msg.Timestamp || null,
    receivedAt: new Date().toISOString(),
  };

  // Keyed by reference so a later version of the same works REPLACES the
  // earlier one rather than accumulating duplicates — Street Manager sends an
  // event per change, and `version` increments.
  await env.ROADWORKS.put(`w:${record.ref}`, JSON.stringify(record), {
    expirationTtl: TTL_SECONDS,
  });
  await addToIndex(env, record.ref);
  await bump(env, "stored");
  return json({ ok: true });
}

/* ------------------------------------------------------------------ signature */

/**
 * SNS message signing. SignatureVersion 1 is SHA1withRSA, version 2 is
 * SHA256withRSA; both sign a canonical field list in a fixed order, each field
 * as "name\nvalue\n". Getting the field list or the order wrong produces a
 * verification failure that looks exactly like an attack, so the two lists are
 * spelled out rather than derived.
 */
const SIGN_FIELDS = {
  Notification: ["Message", "MessageId", "Subject", "Timestamp", "TopicArn", "Type"],
  SubscriptionConfirmation: ["Message", "MessageId", "SubscribeURL", "Timestamp", "Token", "TopicArn", "Type"],
  UnsubscribeConfirmation: ["Message", "MessageId", "SubscribeURL", "Timestamp", "Token", "TopicArn", "Type"],
};

/**
 * The exact bytes AWS signed: each field as "name\nvalue\n", in the fixed
 * order above, with Subject included only when present. Getting the order or
 * the field list wrong produces a verification failure indistinguishable from
 * an attack, which is why this is one named function with a test rather than
 * a loop buried inside verify().
 */
export function canonicalString(msg) {
  const fields = SIGN_FIELDS[msg && msg.Type];
  if (!fields) return null;
  let out = "";
  for (const f of fields) {
    if (msg[f] === undefined || msg[f] === null) continue;
    out += `${f}\n${msg[f]}\n`;
  }
  return out;
}

async function verify(msg) {
  try {
    const canonical = canonicalString(msg);
    if (canonical === null) return false;

    let certUrl;
    try {
      certUrl = new URL(String(msg.SigningCertURL || msg.SigningCertUrl || ""));
    } catch {
      return false;
    }
    // ⚠️ THE SSRF GUARD THAT MATTERS MOST — this URL comes straight from the
    // request body and we are about to fetch it.
    if (certUrl.protocol !== "https:" || !SNS_HOST.test(certUrl.hostname)) return false;

    const pem = await (await fetch(certUrl.toString())).text();
    const spki = spkiFromCertificate(pem);
    if (!spki) return false;

    const hash = String(msg.SignatureVersion) === "2" ? "SHA-256" : "SHA-1";
    const key = await crypto.subtle.importKey(
      "spki",
      spki,
      { name: "RSASSA-PKCS1-v1_5", hash },
      false,
      ["verify"]
    );
    const sig = base64ToBytes(String(msg.Signature || ""));
    return crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      sig,
      new TextEncoder().encode(canonical)
    );
  } catch {
    return false;      // fail closed
  }
}

/**
 * WebCrypto imports a SubjectPublicKeyInfo, not a whole X.509 certificate, so
 * the SPKI has to be lifted out of the DER by hand. Structure:
 *   Certificate ::= SEQUENCE { tbsCertificate, signatureAlgorithm, signature }
 *   TBSCertificate ::= SEQUENCE { [0] version?, serial, sigAlg, issuer,
 *                                 validity, subject, subjectPublicKeyInfo, ... }
 * so the SPKI is child 6 when the optional version tag is present (it is, for
 * every modern cert) and child 5 when it is not. Both cases are handled.
 */
export function spkiFromCertificate(pem) {
  const b64 = pem.replace(/-----(BEGIN|END) CERTIFICATE-----/g, "").replace(/\s+/g, "");
  if (!b64) return null;
  const der = base64ToBytes(b64);

  const readTlv = (buf, off) => {
    const tag = buf[off];
    let i = off + 1;
    let len = buf[i++];
    if (len & 0x80) {
      const n = len & 0x7f;
      if (n === 0 || n > 4) return null;      // indefinite/oversized: reject
      len = 0;
      for (let k = 0; k < n; k++) len = (len << 8) | buf[i++];
    }
    return { tag, start: off, valueStart: i, end: i + len };
  };

  const cert = readTlv(der, 0);
  if (!cert || cert.tag !== 0x30) return null;
  const tbs = readTlv(der, cert.valueStart);
  if (!tbs || tbs.tag !== 0x30) return null;

  const children = [];
  let off = tbs.valueStart;
  while (off < tbs.end && children.length < 12) {
    const t = readTlv(der, off);
    if (!t) return null;
    children.push(t);
    off = t.end;
  }
  // [0] EXPLICIT version is context-specific constructed, tag 0xa0.
  const idx = children.length && children[0].tag === 0xa0 ? 6 : 5;
  const spki = children[idx];
  if (!spki || spki.tag !== 0x30) return null;
  return der.slice(spki.start, spki.end);
}

export function base64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/* ---------------------------------------------------------------- bookkeeping */

async function bump(env, key) {
  const k = `count:${key}`;
  const n = parseInt((await env.ROADWORKS.get(k)) || "0", 10) || 0;
  await env.ROADWORKS.put(k, String(n + 1));
  if (key === "seen") await env.ROADWORKS.put("meta:lastSeen", new Date().toISOString());
}

async function noteAuthority(env, name) {
  const cur = JSON.parse((await env.ROADWORKS.get("meta:authorities")) || "{}");
  if (cur[name]) {
    cur[name] += 1;
  } else {
    cur[name] = 1;
  }
  await env.ROADWORKS.put("meta:authorities", JSON.stringify(cur));
}

async function addToIndex(env, ref) {
  const idx = JSON.parse((await env.ROADWORKS.get("meta:index")) || "[]");
  const next = [ref, ...idx.filter((r) => r !== ref)].slice(0, MAX_INDEX);
  await env.ROADWORKS.put("meta:index", JSON.stringify(next));
}

/* --------------------------------------------------------------------- reads */

/**
 * The whole point of this endpoint is that "nothing arrived" and "everything
 * was filtered out" and "it never verified" look identical from outside. Each
 * is counted separately so the handshake can be watched while the 3-day window
 * is still open.
 */
async function health(env) {
  const keys = [
    "seen", "stored", "filteredOut", "confirmed", "confirmFailed",
    "unverified", "wrongTopic", "badJson", "badMessage", "badSubscribeUrl",
    "unsubscribed", "unknownType",
  ];
  const counts = {};
  for (const k of keys) counts[k] = parseInt((await env.ROADWORKS.get(`count:${k}`)) || "0", 10) || 0;
  return json({
    ok: true,
    counts,
    lastSeen: await env.ROADWORKS.get("meta:lastSeen"),
    lastConfirm: JSON.parse((await env.ROADWORKS.get("meta:lastConfirm")) || "null"),
    authorities: JSON.parse((await env.ROADWORKS.get("meta:authorities")) || "{}"),
    note: "counts.seen rising with confirmed=0 means the handshake has not completed",
  });
}

async function live(request, env) {
  const limit = Math.min(500, parseInt(new URL(request.url).searchParams.get("limit") || "200", 10) || 200);
  const index = JSON.parse((await env.ROADWORKS.get("meta:index")) || "[]");
  const works = [];
  for (const ref of index.slice(0, limit)) {
    const rec = await env.ROADWORKS.get(`w:${ref}`);
    if (rec) works.push(JSON.parse(rec));
  }
  return json({ ok: true, at: new Date().toISOString(), count: works.length, works });
}
