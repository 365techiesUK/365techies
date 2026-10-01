/*
 * 365 Techies - job cards with an Edit button (Cloudflare Worker). 1 Oct 2026.
 *
 * WHY. "New job in" posts in #sos-jobs-in-out came from a Slack Workflow Builder form. A workflow's post belongs to
 * the workflow, and Slack lets only a message's author edit it - admins may delete, never edit - so David could not
 * add an address he had left blank. This Worker posts the card as OUR bot instead, with an Edit button: pressing
 * it opens the same form filled in, Save rewrites the card in place (chat.update, which a bot may do to its own
 * posts). Anyone in the channel can edit any card. The server's reader (api/pcm-slackjobs-*.php) keeps parsing the
 * card's text exactly as it parsed the workflow's, because the layout is the same (whole-line bold label, answer
 * beneath) - an edit reaches the portal and the invoice on the next sweep.
 *
 * WHY A WORKER AND NOT PHP. Slack must call us when the command is typed or a button pressed, within 3 seconds.
 * SiteGround's bot wall answers machine calls to /api/* with 202 + a captcha page (measured 31 Jul 2026), which Slack
 * would count as success while nothing ran. A Worker answers Slack directly, like the live-visitors collector.
 *
 * WHAT SLACK SENDS HERE (all signed with the app's signing secret; anything unsigned is refused):
 *   POST /slack/command    the /newjob slash command            -> opens the empty form (views.open)
 *   POST /slack/interact   shortcut "New job in"                 -> opens the empty form
 *                          block_actions: the card's Edit button -> opens the form filled from the card
 *                          view_submission                       -> posts the card (chat.postMessage) or rewrites it (chat.update)
 *   GET  /                 a health line
 *
 * SETUP (owner, ~20 minutes; the Worker code is pasted into the Cloudflare dashboard like the others):
 *   1. Cloudflare: Workers & Pages -> Create -> paste this file -> Deploy. Note the Worker URL.
 *      Settings -> Variables and Secrets: SLACK_BOT_TOKEN (xoxb-..., from step 3), SLACK_SIGNING_SECRET (step 2).
 *   2. api.slack.com/apps -> the 365 app the job reader already uses -> Basic Information -> copy the Signing Secret.
 *   3. OAuth & Permissions -> Bot Token Scopes: add chat:write (and commands, added by step 5) -> Reinstall to
 *      Workspace -> copy the Bot User OAuth Token (xoxb-).
 *   4. Interactivity & Shortcuts -> On -> Request URL: https://<worker>/slack/interact -> Create New Shortcut:
 *      Global, name "New job in", description "Log a job to invoice", callback ID new_job -> Save.
 *   5. Slash Commands -> Create: /newjob, Request URL https://<worker>/slack/command, description "Log a new job".
 *   6. In #sos-jobs-in-out: /invite the app's bot user (so it may post there).
 *   7. Workflow Builder: unpublish the old "New job in" workflow (its posts cannot be edited; two ways to post the
 *      same thing would only confuse). "Job done" stays as it is.
 *
 * PRIVACY: nothing is stored here. Every field lives in the Slack message itself; Edit reads it back from the card.
 */

const CHANNEL = "C0C3VGP1SJC";   // #sos-jobs-in-out - cards always go here, whichever channel the command is typed in

// the card's fields, in the order the Workflow Builder form posted them (the reader knows these labels)
const FIELDS = [
  ["name", "Customer name"], ["address", "Address"], ["postcode", "Postcode"], ["phone", "Contact number"],
  ["email", "Email"], ["jobtype", "Job type"], ["issue", "Issue"], ["assigned", "Assigned to"],
  ["priority", "Priority"], ["price", "Price £."],
];
const JOB_TYPES = ["Remote", "On-site", "Hardware"];
const PRIORITIES = ["Low", "Medium", "High"];
const EDIT_ACTION = "edit_job";
const CALLBACK = "job_form";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/") return new Response("365 jobs: ok\n", { status: 200 });
    if (request.method !== "POST") return new Response("not found", { status: 404 });
    if (url.pathname !== "/slack/command" && url.pathname !== "/slack/interact") return new Response("not found", { status: 404 });
    if (!env.SLACK_BOT_TOKEN || !env.SLACK_SIGNING_SECRET) return new Response("not configured", { status: 500 });

    const body = await request.text();
    if (!(await verifySlack(request, body, env.SLACK_SIGNING_SECRET))) return new Response("bad signature", { status: 401 });
    const form = new URLSearchParams(body);

    if (url.pathname === "/slack/command") {
      // /newjob: open the empty form. The reply to the command itself is ephemeral and short.
      const r = await slack(env, "views.open", { trigger_id: form.get("trigger_id") || "", view: modalView({}, "") });
      if (!r.ok) return json({ response_type: "ephemeral", text: "Couldn't open the form (" + (r.error || "no answer") + "). Try again." });
      return new Response("", { status: 200 });
    }

    let p;
    try { p = JSON.parse(form.get("payload") || "{}"); } catch { return new Response("bad payload", { status: 400 }); }

    if (p.type === "shortcut" && p.callback_id === "new_job") {
      await slack(env, "views.open", { trigger_id: p.trigger_id, view: modalView({}, "") });
      return new Response("", { status: 200 });
    }
    if (p.type === "block_actions") {
      const act = (p.actions || [])[0] || {};
      if (act.action_id !== EDIT_ACTION) return new Response("", { status: 200 });
      const msg = p.message || {}, chan = (p.channel || {}).id || CHANNEL, ts = msg.ts || (p.container || {}).message_ts || "";
      const values = parseCard(msg.text || "");
      await slack(env, "views.open", { trigger_id: p.trigger_id, view: modalView(values, JSON.stringify({ channel: chan, ts })) });
      return new Response("", { status: 200 });
    }
    if (p.type === "view_submission" && (p.view || {}).callback_id === CALLBACK) {
      const v = readSubmission(p.view);
      const errors = validate(v);
      if (Object.keys(errors).length) return json({ response_action: "errors", errors });
      let meta = {};
      try { meta = JSON.parse(p.view.private_metadata || "{}"); } catch { meta = {}; }
      const who = (p.user || {}).name || (p.user || {}).username || "";
      const editing = !!(meta.ts);
      const text = cardText(v, editing ? { by: who, when: whenNow() } : null);
      const args = { channel: meta.channel || CHANNEL, text, blocks: cardBlocks(text) };
      const r = editing ? await slack(env, "chat.update", { ...args, ts: meta.ts }) : await slack(env, "chat.postMessage", { ...args, unfurl_links: false });
      if (!r.ok) return json({ response_action: "errors", errors: { name: "Slack refused it (" + (r.error || "no answer") + "). Try again." } });
      return json({ response_action: "clear" });
    }
    return new Response("", { status: 200 });
  },
};

// ---------------------------------------------------------------- the card
export function cardText(v, edited) {
  const lines = [":inbox_tray: *New job in*"];
  for (const [key, label] of FIELDS) { lines.push("*" + label + "*"); lines.push(clean(v[key] || "")); }
  if (edited) lines.push("_Edited by " + clean(edited.by || "") + (edited.when ? " · " + edited.when : "") + "_");
  return lines.join("\n");
}
export function cardBlocks(text) {
  return [
    { type: "section", text: { type: "mrkdwn", text: text.slice(0, 2900) } },
    { type: "actions", elements: [{ type: "button", action_id: EDIT_ACTION, text: { type: "plain_text", text: "✏️ Edit" }, value: "edit" }] },
  ];
}
// read a card back: a whole-line bold label opens a field, the lines up to the next label are its value
export function parseCard(text) {
  const byLabel = {}; for (const [key, label] of FIELDS) byLabel[label.toLowerCase()] = key;
  const v = {}; let cur = ""; let buf = [];
  const flush = () => { if (cur) v[cur] = buf.join(" ").trim(); buf = []; };
  for (const raw of String(text || "").split(/\r?\n/)) {
    const line = raw.trim();
    const m = /^\*([^*]{2,60})\*$/.exec(line);
    if (m && byLabel[m[1].trim().toLowerCase()]) { flush(); cur = byLabel[m[1].trim().toLowerCase()]; continue; }
    if (/^_Edited by /.test(line)) { flush(); cur = ""; continue; }
    if (cur) buf.push(unwrap(line));
  }
  flush();
  return v;
}
function unwrap(s) {   // Slack's own wrapping of addresses and numbers
  return String(s).replace(/<mailto:([^|>]+)\|[^>]*>/gi, "$1").replace(/<mailto:([^>]+)>/gi, "$1")
    .replace(/<tel:([^|>]+)\|[^>]*>/gi, "$1").replace(/<tel:([^>]+)>/gi, "$1");
}
function clean(s) { return String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ").replace(/\*/g, "").trim(); }
function whenNow() {
  try { return new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date()); }
  catch { return ""; }
}

// ---------------------------------------------------------------- the form
export function modalView(v, privateMetadata) {
  const editing = privateMetadata !== "";
  const input = (key, label, opts = {}) => ({
    type: "input", block_id: key, optional: !!opts.optional,
    label: { type: "plain_text", text: label },
    element: Object.assign({ type: "plain_text_input", action_id: "v", multiline: !!opts.multiline },
      v[key] ? { initial_value: String(v[key]).slice(0, opts.multiline ? 1500 : 200) } : {},
      opts.placeholder ? { placeholder: { type: "plain_text", text: opts.placeholder } } : {}),
  });
  const select = (key, label, options) => {
    const cur = options.find((o) => o.toLowerCase() === String(v[key] || "").trim().toLowerCase());
    return {
      type: "input", block_id: key, optional: true, label: { type: "plain_text", text: label },
      element: Object.assign({ type: "static_select", action_id: "v", options: options.map((o) => ({ text: { type: "plain_text", text: o }, value: o })) },
        cur ? { initial_option: { text: { type: "plain_text", text: cur }, value: cur } } : {}),
    };
  };
  return {
    type: "modal", callback_id: CALLBACK, private_metadata: privateMetadata,
    title: { type: "plain_text", text: editing ? "Edit job" : "New job in" },
    submit: { type: "plain_text", text: editing ? "Save" : "Post" },
    close: { type: "plain_text", text: "Cancel" },
    blocks: [
      input("name", "Customer name"),
      input("address", "Address", { optional: true }),
      input("postcode", "Postcode", { optional: true }),
      input("phone", "Contact number", { optional: true }),
      input("email", "Email", { optional: true }),
      select("jobtype", "Job type", JOB_TYPES),
      input("issue", "Issue", { optional: true, multiline: true }),
      input("assigned", "Assigned to", { optional: true }),
      select("priority", "Priority", PRIORITIES),
      input("price", "Price £", { optional: true, placeholder: "60" }),
    ],
  };
}
export function readSubmission(view) {
  const st = ((view || {}).state || {}).values || {}; const v = {};
  for (const [key] of FIELDS) {
    const el = (st[key] || {}).v || {};
    v[key] = el.type === "static_select" ? ((el.selected_option || {}).value || "") : (el.value == null ? "" : String(el.value));
    v[key] = v[key].trim();
  }
  if (v.price) v.price = v.price.replace(/^£\s*/, "");
  return v;
}
export function validate(v) {
  const errors = {};
  if (!v.name) errors.name = "Please put the customer's name.";
  if (v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) errors.email = "That doesn't look like an email address.";
  if (v.price && !/^\d+(\.\d{1,2})?$/.test(v.price)) errors.price = "Just the number, e.g. 60 or 45.50.";
  return errors;
}

// ---------------------------------------------------------------- Slack
async function verifySlack(request, body, secret) {
  const ts = request.headers.get("X-Slack-Request-Timestamp") || "", sig = request.headers.get("X-Slack-Signature") || "";
  if (!/^\d+$/.test(ts) || Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;   // a replay, or a clock gone wrong
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode("v0:" + ts + ":" + body));
  const want = "v0=" + [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
  if (want.length !== sig.length) return false;
  let diff = 0; for (let i = 0; i < want.length; i++) diff |= want.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
}
async function slack(env, method, args) {
  try {
    const r = await fetch("https://slack.com/api/" + method, {
      method: "POST", headers: { "Content-Type": "application/json; charset=utf-8", Authorization: "Bearer " + env.SLACK_BOT_TOKEN },
      body: JSON.stringify(args),
    });
    return await r.json();
  } catch (e) { return { ok: false, error: "network: " + (e && e.message ? e.message : e) }; }
}
function json(obj) { return new Response(JSON.stringify(obj), { status: 200, headers: { "Content-Type": "application/json; charset=utf-8" } }); }
