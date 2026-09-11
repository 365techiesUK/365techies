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

// ---- files ----------------------------------------------------------------
// Slack's external-upload flow (files.upload is retired): ask for a one-time
// URL, POST the bytes to it, then complete against a channel. Needs the
// files:write scope on the bot and the bot in the channel; either missing
// comes back as a plain error so the caller can post text instead.
function slk_call_form($method, $args, $timeout = 6) {
    $c = slk_creds();
    if ($c[0] === '') return array('ok' => false, 'error' => 'not_configured');
    $ch = curl_init('https://slack.com/api/' . $method);
    curl_setopt_array($ch, array(
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 4,
        CURLOPT_TIMEOUT => $timeout,
        CURLOPT_HTTPHEADER => array('Authorization: Bearer ' . $c[0]),
        CURLOPT_POSTFIELDS => http_build_query($args),
    ));
    $body = @curl_exec($ch);
    $err  = curl_error($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($body === false || $body === '') return array('ok' => false, 'error' => 'net:' . ($err !== '' ? $err : $code));
    $d = json_decode($body, true);
    return is_array($d) ? $d : array('ok' => false, 'error' => 'bad_json');
}
function slk_upload_file($channel, $bytes, $filename, $title, $comment) {
    $c = slk_creds();
    if ($c[0] === '') return array('ok' => false, 'error' => 'not_configured');
    if ($channel === '') return array('ok' => false, 'error' => 'no_channel');
    $r1 = slk_call_form('files.getUploadURLExternal', array('filename' => $filename, 'length' => strlen($bytes)));
    if (empty($r1['ok']) || empty($r1['upload_url']) || empty($r1['file_id'])) return array('ok' => false, 'error' => 'geturl:' . (string)($r1['error'] ?? 'unknown'));
    $ch = curl_init((string)$r1['upload_url']);
    curl_setopt_array($ch, array(
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 4,
        CURLOPT_TIMEOUT => 25,
        CURLOPT_HTTPHEADER => array('Content-Type: application/octet-stream'),
        CURLOPT_POSTFIELDS => $bytes,
    ));
    @curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($code < 200 || $code >= 300) return array('ok' => false, 'error' => 'upload:http' . $code);
    $r3 = slk_call('files.completeUploadExternal', array(
        'files' => array(array('id' => (string)$r1['file_id'], 'title' => (string)$title)),
        'channel_id' => (string)$channel,
        'initial_comment' => (string)$comment,
    ), 12);
    if (empty($r3['ok'])) return array('ok' => false, 'error' => 'complete:' . (string)($r3['error'] ?? 'unknown'));
    return array('ok' => true);
}
// Where service reports go: $SLACK_REPORTS_CHANNEL in pcm-slack-bot.php if set (a channel
// ID, C…), else the messaging channel. completeUploadExternal needs an ID, not a name.
function slk_report_channel() {
    $raw = (string)@file_get_contents(__DIR__ . '/pcm-slack-bot.php');
    if (preg_match('/\$SLACK_REPORTS_CHANNEL\s*=\s*[\'"]([^\'"]+)[\'"]/', $raw, $m)) return trim($m[1]);
    $c = slk_creds();
    return $c[1];
}
// The six-weekly Service Report, as the team sees it: a short summary and the report itself.
// Text-only when the file cannot go (missing scope, channel by name, size, network) - the
// team must still hear that a service happened. Returns what happened, for the tool's log.
function pcm_service_report_to_slack($cust, $machine, $ts, $html, $summary) {
    if (!slk_ready()) return array('posted' => false, 'file' => false, 'error' => 'not_configured');
    $chan = slk_report_channel();
    $name = trim((string)($summary['customer'] ?? ''));
    if ($name === '') $name = trim((string)($cust['name'] ?? 'Customer'));
    $pc = trim((string)($summary['pc'] ?? '')); $os = trim((string)($summary['os'] ?? '')); $score = trim((string)($summary['score'] ?? ''));
    $notes = array();
    if (isset($summary['notes']) && is_array($summary['notes'])) foreach (array_slice($summary['notes'], 0, 3) as $n) { $n = trim(slk_plain((string)$n)); if ($n !== '') $notes[] = substr($n, 0, 160); }
    $mname = trim((string)($cust['machines'][$machine]['name'] ?? ''));
    $selfrun = !empty($summary['selfrun']);   // the customer ran it from the app, not a visit
    $text = ($selfrun ? '*Self-run full service* (the customer ran it from the app) - ' : '*6-weekly Service Report* - ') . slk_plain(substr($name, 0, 80)) . "\n"
          . ($pc !== '' ? 'PC: ' . slk_plain(substr($pc, 0, 80)) . "\n" : '')
          . ($os !== '' ? 'OS: ' . slk_plain(substr($os, 0, 80)) . "\n" : '')
          . ($score !== '' ? 'Score: ' . slk_plain(substr($score, 0, 40)) . "\n" : '')
          . ($notes ? "Top notes:\n- " . implode("\n- ", $notes) . "\n" : '')
          . 'In the portal: Service reports' . ($mname !== '' ? ' on ' . slk_plain($mname) : '') . ' (staff: open the customer, view as, Service reports).';
    $fname = 'Service-Report-' . trim(preg_replace('/[^A-Za-z0-9]+/', '-', $name), '-') . '-' . gmdate('Y-m-d', $ts) . '.html';
    $up = slk_upload_file($chan, $html, $fname, ($selfrun ? 'Self-run full service - ' : '6-weekly Service Report - ') . $name, $text);
    if (!empty($up['ok'])) return array('posted' => true, 'file' => true, 'error' => '', 'channel' => $chan);
    $p = slk_call('chat.postMessage', array('channel' => $chan, 'text' => $text . "\n_(report file not attached: " . (string)($up['error'] ?? 'unknown') . ")_"));
    return array('posted' => !empty($p['ok']), 'file' => false, 'error' => (string)($up['error'] ?? ''), 'post_error' => empty($p['ok']) ? (string)($p['error'] ?? 'unknown') : '', 'channel' => $chan);
}
