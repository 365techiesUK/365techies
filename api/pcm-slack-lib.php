<?php
/**
 * Slack Web API helpers for portal messaging.
 *
 * WHY A BOT TOKEN AND NOT THE EXISTING WEBHOOK
 * --------------------------------------------
 * Every other Slack call in this codebase is an Incoming Webhook: fire-and-
 * forget, one direction, no reply to read. Messaging needs to READ the
 * engineer's answer back out of the thread, and a webhook cannot do that. So
 * this file adds a bot token - the only place in the repo that has one.
 *
 * WE POLL SLACK. WE NEVER LET SLACK CALL US.
 * ------------------------------------------
 * Measured against the live site on 2026-07-31: a scripted POST to /api/* is
 * answered by SiteGround's WAF with an sgcaptcha challenge page and
 * **HTTP 202**. Slack treats any 2xx as successful delivery, so an Events API
 * subscription would have Slack reporting every customer message delivered
 * while this server never ran a line - silent, total message loss. The same
 * request from a real browser returns 200 and correct JSON, which is why the
 * portal's own calls are fine and Slack's would not be.
 *
 * Therefore the inbound path is pcm-msg-poll.php, run from CLI cron, which
 * bypasses the web WAF entirely. That also disposes of every Events API
 * requirement at once: the 3-second response deadline, retry semantics,
 * request-signature verification, and the auto-disable that trips after 95%
 * failed deliveries in an hour.
 *
 * THE TOKEN
 * ---------
 * api/pcm-slack-bot.php is gitignored (this repo is PUBLIC) and .htaccess-
 * denied. It is read by REGEX PATTERN-EXTRACTION, never require()/include -
 * see php-include-scope-trap: an include's top-level variables bind to
 * whichever scope ran the include, so a config included from inside a function
 * silently yields nothing and the caller reports success. That bug cost this
 * codebase the entire welcome-email queue. Pattern extraction cannot fail that
 * way, and it also survives a File Manager paste that mangles the PHP tags.
 *
 * Scopes needed on the app: chat:write, plus groups:history for a PRIVATE
 * channel or channels:history for a public one.
 */

if (!defined('PCM_SLACK_LIB')) {
    define('PCM_SLACK_LIB', 1);

// ---- credentials ----------------------------------------------------------
// Returns array(token, channel) or array('','') when not configured yet, so
// every caller degrades to "store it locally and retry later" rather than
// throwing. The feature must never lose a customer's message because Slack
// setup is incomplete.
function slk_creds() {
    static $cache = null;
    if ($cache !== null) return $cache;
    $f = __DIR__ . '/pcm-slack-bot.php';
    $cache = array('', '');
    if (!file_exists($f)) return $cache;
    $raw = (string)@file_get_contents($f);
    if ($raw === '') return $cache;
    $tok = '';
    $chan = '';
    // xoxb- (bot) is what this needs; accept xoxp- too rather than silently
    // ignoring a token someone pasted in good faith.
    if (preg_match('/\b(xox[bp]-[A-Za-z0-9-]+)/', $raw, $m)) $tok = $m[1];
    if (preg_match('/\$SLACK_CHANNEL\s*=\s*[\'"]([^\'"]+)[\'"]/', $raw, $m)) $chan = trim($m[1]);
    $cache = array($tok, $chan);
    return $cache;
}
function slk_ready() { $c = slk_creds(); return $c[0] !== '' && $c[1] !== ''; }

// ---- transport ------------------------------------------------------------
// One place that talks to Slack, so timeouts and error shapes are consistent.
// Short timeouts on purpose: this runs inside a customer's page request, and a
// slow Slack must not hold the portal (or the shared DB lock) open.
function slk_call($method, $args, $timeout = 6) {
    $c = slk_creds();
    if ($c[0] === '') return array('ok' => false, 'error' => 'not_configured');
    $ch = curl_init('https://slack.com/api/' . $method);
    curl_setopt_array($ch, array(
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 4,
        CURLOPT_TIMEOUT => $timeout,
        CURLOPT_HTTPHEADER => array(
            'Content-Type: application/json; charset=utf-8',
            'Authorization: Bearer ' . $c[0],
        ),
        CURLOPT_POSTFIELDS => json_encode($args),
    ));
    $body = @curl_exec($ch);
    $err  = curl_error($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($body === false || $body === '') return array('ok' => false, 'error' => 'net:' . ($err !== '' ? $err : $code));
    $d = json_decode($body, true);
    if (!is_array($d)) return array('ok' => false, 'error' => 'bad_json');
    return $d;
}

// ---- posting --------------------------------------------------------------
// $thread is the parent message ts, or '' to start a new thread. Returns the
// Slack ts on success so the caller can remember the thread and recognise its
// own messages when they come back round on the poll.
function slk_post($text, $thread = '', $timeout = 6) {
    $c = slk_creds();
    if (!slk_ready()) return array('ok' => false, 'error' => 'not_configured');
    $args = array('channel' => $c[1], 'text' => (string)$text);
    if ($thread !== '') $args['thread_ts'] = (string)$thread;
    // keep long threads visible in the channel, not just inside the thread
    else $args['reply_broadcast'] = false;
    $r = slk_call('chat.postMessage', $args, $timeout);
    if (!empty($r['ok'])) return array('ok' => true, 'ts' => (string)($r['ts'] ?? ''));
    return array('ok' => false, 'error' => (string)($r['error'] ?? 'unknown'));
}

// ---- reading --------------------------------------------------------------
// Everything in a thread newer than $oldest. Cursor-based, NOT a time window:
// a missed cron run must catch up rather than skip the messages it slept
// through. Slack's `oldest` is inclusive, so callers drop the echo themselves.
function slk_replies($thread, $oldest = '', $limit = 100) {
    $c = slk_creds();
    if (!slk_ready()) return array('ok' => false, 'error' => 'not_configured');
    $args = array('channel' => $c[1], 'ts' => (string)$thread, 'limit' => (int)$limit);
    if ($oldest !== '') $args['oldest'] = (string)$oldest;
    $r = slk_call('conversations.replies', $args, 10);
    if (empty($r['ok'])) return array('ok' => false, 'error' => (string)($r['error'] ?? 'unknown'));
    return array('ok' => true, 'messages' => isset($r['messages']) && is_array($r['messages']) ? $r['messages'] : array());
}

// A message is OURS if Slack says a bot posted it. Customer messages reach the
// channel through this same bot, so without this check the poll would read the
// customer's own words back and show them a reply from themselves.
function slk_is_ours($m) {
    if (!is_array($m)) return true;                      // unparseable: never ingest
    if (!empty($m['bot_id'])) return true;
    if (isset($m['subtype']) && $m['subtype'] === 'bot_message') return true;
    if (empty($m['user'])) return true;                  // joins/topic changes etc
    if (isset($m['subtype']) && $m['subtype'] !== '') return true;  // channel_join, file_share...
    return false;
}

// Slack mrkdwn -> plain text for the portal. Deliberately small: the portal
// escapes on output, so this only has to undo Slack's own encoding and unwrap
// link syntax. Anything it misses shows as harmless literal text.
function slk_plain($s) {
    $s = (string)$s;
    $s = preg_replace('/<https?:[^|>]+\|([^>]*)>/', '$1', $s);   // <url|label> -> label
    $s = preg_replace('/<(https?:[^>]+)>/', '$1', $s);           // <url> -> url
    // {0,1} rather than a bare quantifier here, so this line contains no
    // question-mark-then-angle-bracket pair. In a STRING that pair is harmless,
    // but PHP ends a // comment at a closing tag as well as at a newline - so
    // writing the pair inside a comment silently drops the rest of the file out
    // of PHP mode. That is exactly how this file first shipped broken.
    $s = preg_replace('/<[@#][A-Z0-9]+(\|[^>]*){0,1}>/', '', $s);  // user/channel mentions
    $s = str_replace(array('&lt;', '&gt;', '&amp;'), array('<', '>', '&'), $s);  // Slack's own escaping
    $s = preg_replace('/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/', '', $s);
    if (!mb_check_encoding($s, 'UTF-8')) return '';
    return trim($s);
}

}  // PCM_SLACK_LIB
