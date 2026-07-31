<?php
/**
 * Portal messaging - pull engineer replies out of Slack. CLI cron.
 *
 *   * * * * *  /usr/bin/php /home/.../api/pcm-msg-poll.php >/dev/null 2>&1
 *
 * WHY THIS EXISTS INSTEAD OF A SLACK EVENTS SUBSCRIPTION
 * -----------------------------------------------------
 * Measured on the live site, 2026-07-31: a scripted POST to /api/* is answered
 * by SiteGround's WAF with an sgcaptcha challenge page carrying **HTTP 202**.
 * Slack counts any 2xx as delivered. An Events API subscription would therefore
 * have Slack cheerfully reporting every engineer reply as delivered while this
 * server never executed - every message lost, no error anywhere. The identical
 * POST from a real browser returns 200 and correct JSON, which is why the
 * portal's own calls work and Slack's would not.
 *
 * CLI cron does not pass through the web WAF at all, so pulling works where
 * being pushed to cannot. It also removes every Events API obligation: the
 * 3-second response deadline, the retry ladder, signature verification, and the
 * auto-disable that trips after 95% failed deliveries in an hour.
 *
 * Cursor-based, never a time window: if a run is missed - or the machine sleeps
 * for an hour - the next run resumes from the last ingested message rather than
 * skipping whatever arrived in between.
 *
 * Also retries outbound messages the customer's own request could not deliver,
 * which is what makes "store first, post second" safe in pcm-msg.php.
 */

// Web access to a CLI cron is not needed and is one more thing to get wrong.
// (.htaccess denies it too - belt and braces, because a lost .htaccess has
// happened here before.)
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }

require_once __DIR__ . '/pcm-msg-lib.php';
require_once __DIR__ . '/pcm-slack-lib.php';

$BEAT   = __DIR__ . '/pcm-msg-beat.json';
$LOCKF  = __DIR__ . '/pcm-msg-cron.lock';
$MAXRUN = 50;     // conversations touched per run

// One run at a time. A minute cron plus a slow Slack would otherwise overlap
// and double-ingest.
$lk = @fopen($LOCKF, 'c');
if (!$lk || !@flock($lk, LOCK_EX | LOCK_NB)) exit;

$stats = array('t'=>time(), 'threads'=>0, 'in'=>0, 'retried'=>0, 'err'=>'');

if (!slk_ready()) {
    // Not configured yet: record it in the heartbeat so the staff console can
    // say so plainly, rather than the feature just appearing dead.
    $stats['err'] = 'not_configured';
    @file_put_contents($BEAT, json_encode($stats), LOCK_EX);
    @flock($lk, LOCK_UN); @fclose($lk);
    exit;
}

$n = 0;
foreach (msg_all_ids() as $id) {
    if ($n++ >= $MAXRUN) break;

    // --- retry anything the customer's own request could not deliver --------
    list($box, $bl) = msg_open($id);
    if (!empty($box['ro'])) { msg_close($bl); continue; }
    $pending = array();
    foreach ($box['msgs'] as $i => $m) if (!empty($m['p']) && (string)($m['w'] ?? '') === 'c') $pending[] = $i;
    $thread = (string)$box['thread'];
    $name   = (string)($box['name'] ?? '');
    $email  = (string)($box['email'] ?? '');
    $mem    = (string)($box['member'] ?? '');
    msg_close($bl);                      // never hold the lock across the network

    foreach ($pending as $i) {
        list($box, $bl) = msg_open($id);
        $text = (string)($box['msgs'][$i]['x'] ?? '');
        $thread = (string)$box['thread'];
        msg_close($bl);
        if ($text === '') continue;

        $who = $name !== '' ? $name : 'A customer';
        if ($mem !== '') $who .= ' (' . $mem . ')';
        $head = ($thread === '')
            ? ":speech_balloon: *" . $who . "* messaged from the portal"
              . ($email !== '' ? "\n" . $email : '')
              . "\nReply *in this thread* and it appears in their portal.\n\n" . $text
            : $text;
        $r = slk_post($head, $thread, 8);
        if (empty($r['ok'])) { $stats['err'] = (string)$r['error']; break; }

        list($box, $bl) = msg_open($id);
        if ($box['thread'] === '') { $box['thread'] = (string)$r['ts']; $box['cursor'] = (string)$r['ts']; }
        if (isset($box['msgs'][$i])) $box['msgs'][$i]['p'] = 0;
        msg_save($id, $box);
        msg_close($bl);
        $stats['retried']++;
        $thread = (string)$box['thread'];
    }

    if ($thread === '') continue;        // nothing posted yet, nothing to read
    $stats['threads']++;

    // --- ingest engineer replies -------------------------------------------
    list($box, $bl) = msg_open($id);
    $cursor = (string)($box['cursor'] !== '' ? $box['cursor'] : $box['thread']);
    msg_close($bl);

    $r = slk_replies($thread, $cursor, 100);
    if (empty($r['ok'])) { $stats['err'] = (string)$r['error']; continue; }

    $fresh = array();
    $newCursor = $cursor;
    foreach ($r['messages'] as $m) {
        $ts = (string)($m['ts'] ?? '');
        if ($ts === '') continue;
        // `oldest` is inclusive, so the cursor message itself comes back every time.
        if (bccomp_ts($ts, $newCursor) > 0) $newCursor = $ts;
        if (bccomp_ts($ts, $cursor) <= 0) continue;
        if (slk_is_ours($m)) continue;               // our own relay of the customer
        $txt = slk_plain($m['text'] ?? '');
        if ($txt === '') continue;
        $fresh[] = array('t'=>(int)floor((float)$ts), 'w'=>'e', 'x'=>mb_substr($txt, 0, MSG_MAX_LEN), 'p'=>0, 'ts'=>$ts);
    }

    if (count($fresh) || $newCursor !== $cursor) {
        list($box, $bl) = msg_open($id);
        if (empty($box['ro'])) {
            $have = array();
            foreach ($box['msgs'] as $m) if (!empty($m['ts'])) $have[(string)$m['ts']] = 1;
            foreach ($fresh as $f) {
                if (isset($have[$f['ts']])) continue;    // idempotent: never double-ingest
                $box['msgs'][] = $f;
                $box['unread'] = intval($box['unread'] ?? 0) + 1;
                $stats['in']++;
            }
            if (bccomp_ts($newCursor, (string)$box['cursor']) > 0) $box['cursor'] = $newCursor;
            msg_trim($box);
            msg_save($id, $box);
        }
        msg_close($bl);
    }
}

@file_put_contents($BEAT, json_encode($stats), LOCK_EX);
@flock($lk, LOCK_UN); @fclose($lk);

// Slack timestamps are "1785535266.123456" - a string that must be compared
// numerically but is too long for a float to hold without losing the last
// digits, and float comparison of two near-identical ts values is exactly how
// a poller starts skipping or repeating messages. Compare the two halves as
// integers instead.
function bccomp_ts($a, $b) {
    $a = explode('.', (string)$a, 2); $b = explode('.', (string)$b, 2);
    $ai = (int)($a[0] ?? 0); $bi = (int)($b[0] ?? 0);
    if ($ai !== $bi) return $ai < $bi ? -1 : 1;
    $af = str_pad((string)($a[1] ?? ''), 6, '0'); $bf = str_pad((string)($b[1] ?? ''), 6, '0');
    if ($af === $bf) return 0;
    return $af < $bf ? -1 : 1;
}
