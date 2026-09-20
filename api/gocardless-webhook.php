<?php
/*
 * GoCardless webhook receiver (20 Sep 2026) - phase 2 of the per-job pay links.
 *
 * GoCardless POSTs here when something happens to a payment we asked for: the
 * customer authorised it in their banking app, it was confirmed, or it failed.
 * We match the event to one of OUR rows in pcm-paylink.json, write the new
 * state, and post one line into #daily-jobs-in-jobs-out. That is the whole job.
 *
 * ⚠️ THIS IS THE ONE FILE HERE WITH NO STAFF TOKEN - anyone on the internet can
 * POST to it. Everything it believes therefore rests on the signature:
 *   - the raw body is HMAC-SHA256'd with the webhook endpoint secret from the
 *     GoCardless dashboard (api/gocardless-webhook-secret.php, server-only,
 *     gitignored + denied) and compared to the Webhook-Signature header in
 *     constant time. No secret file, no header, or a mismatch => 498 and
 *     nothing is read. An unsigned webhook is a stranger claiming a customer
 *     has paid.
 *   - the body is parsed only AFTER the signature passes, and never re-encoded
 *     before checking it.
 *   - an event that does not match one of our own stored billing request ids
 *     changes nothing at all.
 *   - event ids are remembered (pcm-paylink-events.json), because GoCardless
 *     delivers at least once and may redeliver: a repeat must not announce the
 *     same payment twice.
 * It only ever WRITES OUR OWN store and posts to Slack. It cannot create,
 * cancel or charge anything at GoCardless, and it never touches a mandate.
 *
 * Replies: 204 on anything we accept (including events we deliberately ignore),
 * 498 on a bad signature, 503 when the secret is not installed yet. GoCardless
 * retries up to 8 times on a non-2xx, so a 503 while the secret is missing
 * means nothing is lost once it lands.
 *
 * NO closing tag in this file.
 */

@ini_set('display_errors', '0');
header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');
header('Content-Type: text/plain; charset=utf-8');

require_once __DIR__ . '/pcm-paylink-sweep.php';        // brings pcm-paylink-lib.php with it

define('GCW_SECRETF', __DIR__ . '/gocardless-webhook-secret.php');   // <?php $GC_WEBHOOK_SECRET = '...';
define('GCW_SEENF',   __DIR__ . '/pcm-paylink-events.json');         // event ids we have already acted on
define('GCW_MAX_BODY', 1048576);                                      // 1 MB: a GoCardless batch is a few KB

function gcw_end($code, $why = '') {
    http_response_code($code);
    if ($why !== '') plq_log('webhook ' . $code . ' ' . $why);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') gcw_end(405);

/* The secret, read by pattern rather than require()d, so a stray second "<?php"
   or a File Manager paste cannot fatal the endpoint - the same habit as
   tm-lib.php and the VRM token file. */
$secret = '';
if (is_readable(GCW_SECRETF)) {
    $src = (string)@file_get_contents(GCW_SECRETF);
    if (preg_match('/\$GC_WEBHOOK_SECRET\s*=\s*[\'"]([^\'"]+)[\'"]/', $src, $m)) $secret = $m[1];
}
if ($secret === '') gcw_end(503, 'no secret installed yet');

$raw = (string)file_get_contents('php://input');
if ($raw === '' || strlen($raw) > GCW_MAX_BODY) gcw_end(400, 'empty or oversized body');

$sig = isset($_SERVER['HTTP_WEBHOOK_SIGNATURE']) ? $_SERVER['HTTP_WEBHOOK_SIGNATURE'] : '';
if (!pl_sig_ok($raw, $sig, $secret)) gcw_end(498, 'bad signature');

/* Only now is the body worth reading. */
$in = json_decode($raw, true);
$events = (is_array($in) && isset($in['events']) && is_array($in['events'])) ? $in['events'] : array();
if (!$events) gcw_end(204);

$seen = @json_decode((string)@file_get_contents(GCW_SEENF), true);
if (!is_array($seen)) $seen = array();

$notes = array();      // Slack lines to post AFTER the response, so a slow Slack never times the webhook out
$acted = 0;
foreach ($events as $ev) {
    if (!is_array($ev)) continue;
    $id = (string)(isset($ev['id']) ? $ev['id'] : '');
    if (pl_seen_has($seen, $id)) continue;                       // redelivery: accept, do nothing
    $said = '';
    $r = null;
    pl_store_locked(PLQ_STORE, function ($data) use ($ev, &$r) {
        $r = pl_event_apply($data, $ev);
        return array('ok' => true, 'data' => $r['data']);
    });
    if (is_array($r) && $r['matched']) {
        $acted++;
        if ($r['change'] !== '' && is_array($r['row'])) $said = pl_change_text($r['row'], $r['change'], $r['why']);
        if ($said !== '') { $notes[] = $said; plq_log('webhook ' . $r['id'] . ' -> ' . $r['change']); }
    }
    $seen = pl_seen_add($seen, $id);
}
$tmp = GCW_SEENF . '.' . getmypid() . '.tmp';
if (@file_put_contents($tmp, json_encode($seen), LOCK_EX) !== false) @rename($tmp, GCW_SEENF);

/* Answer GoCardless first. It waits 10 seconds and retries on silence, and
   Slack is the slowest thing here, so on FPM we close the response and then
   talk to Slack. Where that is not available the order is the same, just
   inside the request. */
http_response_code(204);
if (function_exists('fastcgi_finish_request')) { @fastcgi_finish_request(); }
foreach ($notes as $n) plq_slack($n);
