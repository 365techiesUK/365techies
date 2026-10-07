<?php
/*
 * The website's own sent emails (7 Oct 2026). Owner, for David: "somewhere we can check on the emails that have been
 * sent from help@ and also info@ ... so we can see what [we] sent people, customers".
 *
 * Emails people type in Outlook are in each mailbox's Sent folder (comms-sent-lib.php reads those). The website's own
 * automatic emails - booking confirmations and reminders, review requests, welcome emails, service reports, the
 * "we have your request" auto-replies, payment links, plan invites, sign-in codes - go straight out through the mail
 * server from info@ and are saved nowhere. Every sender calls sentlog_add() once the server has taken the email, so the
 * portal's Sent emails panel can show those too. From 7 Oct 2026 on: nothing sent before that was kept.
 *
 * Kept: when, to, subject, the text version of the email, what sent it. Hidden BEFORE saving: a sign-in code (the
 * sender passes a stand-in text) and the private part of every link - a query string, a long token in the path - so
 * staff can see that a link went, never a working sign-in, payment, invite or unsubscribe link.
 * SENTLOG_DAYS days, at most SENTLOG_MAX emails. Store api/pcm-sentlog.json (+ .lock, .tmp): .htaccess-denied,
 * gitignored. A failure here never stops an email: every sender calls it AFTER sending, inside try/catch.
 *
 * Library only: constants and functions, no globals (senders include it from inside their own functions).
 * NO closing tag in this file.
 */
if (!defined('SENTLOG_FILE')) define('SENTLOG_FILE', __DIR__ . '/pcm-sentlog.json');
if (!defined('SENTLOG_DAYS')) define('SENTLOG_DAYS', 90);
if (!defined('SENTLOG_MAX')) define('SENTLOG_MAX', 2000);
if (!defined('SENTLOG_TEXT')) define('SENTLOG_TEXT', 8000);

if (!function_exists('sentlog_cut')) {
function sentlog_cut($s, $n) { $s = (string)$s; return function_exists('mb_substr') ? mb_substr($s, 0, $n) : substr($s, 0, $n); }

/* Every link keeps where it goes (the site, the page) and loses what makes it work: a query string or fragment becomes
   "?...", and any path part that looks like a token (16+ letters/digits, or 10+ with a digit) becomes "...". */
function sentlog_redact($text) {
    return preg_replace_callback('~\bhttps?://[^\s<>"\'\]\)]+~i', function ($m) {
        $u = $m[0]; $tail = '';
        if (preg_match('/[.,;:!?]+$/', $u, $t)) { $tail = $t[0]; $u = substr($u, 0, -strlen($tail)); }
        $p = @parse_url($u);
        if (!is_array($p) || empty($p['host'])) return '[link]' . $tail;
        $path = isset($p['path']) ? $p['path'] : '';
        $path = implode('/', array_map(function ($seg) {
            return (strlen($seg) >= 16 && preg_match('/^[A-Za-z0-9_\-=%.]+$/', $seg)) || (strlen($seg) >= 10 && preg_match('/^[A-Za-z0-9_\-=]+$/', $seg) && preg_match('/\d/', $seg) && preg_match('/[A-Za-z]/', $seg))
                ? "\xE2\x80\xA6" : $seg;
        }, explode('/', $path)));
        $hid = (isset($p['query']) && $p['query'] !== '') || (isset($p['fragment']) && $p['fragment'] !== '');
        return strtolower($p['scheme']) . '://' . strtolower($p['host']) . $path . ($hid ? "?\xE2\x80\xA6" : '') . $tail;
    }, (string)$text);
}

/* One email the website sent. $via says what sent it ('website', 'sign-in code', 'payment link', 'plan invite',
   'job email'). Returns true when it was written down. */
function sentlog_add($to, $subject, $text, $via = 'website', $file = null, $now = null) {
    $to = strtolower(trim((string)$to));
    if (!filter_var($to, FILTER_VALIDATE_EMAIL)) return false;
    $now = $now === null ? time() : (int)$now;
    $file = $file !== null ? $file : SENTLOG_FILE;
    $e = array('id' => bin2hex(random_bytes(6)), 'at' => $now, 'to' => $to,
        'subject' => sentlog_cut(trim(preg_replace('/\s+/', ' ', (string)$subject)), 250),
        'text' => sentlog_cut(trim(str_replace(array("\r\n", "\r"), "\n", sentlog_redact((string)$text))), SENTLOG_TEXT),
        'via' => sentlog_cut((string)$via, 30));
    $lk = @fopen($file . '.lock', 'c');
    if (!$lk) return false;
    if (!flock($lk, LOCK_EX)) { fclose($lk); return false; }
    $ok = false;
    $raw = @file_get_contents($file);
    $d = $raw === false || $raw === '' ? array('v' => 1, 'sent' => array()) : json_decode($raw, true);
    if (is_array($d) && isset($d['sent']) && is_array($d['sent'])) {   // an unreadable store is left alone, never overwritten
        $keep = $now - SENTLOG_DAYS * 86400;
        $d['sent'] = array_values(array_filter($d['sent'], function ($x) use ($keep) { return is_array($x) && (int)($x['at'] ?? 0) >= $keep; }));
        $d['sent'][] = $e;
        if (count($d['sent']) > SENTLOG_MAX) $d['sent'] = array_slice($d['sent'], -SENTLOG_MAX);
        $tmp = $file . '.' . getmypid() . '.tmp';
        $ok = @file_put_contents($tmp, json_encode($d, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)) !== false && @rename($tmp, $file);
        if (!$ok) @unlink($tmp);
    }
    flock($lk, LOCK_UN); fclose($lk);
    return $ok;
}

/* Everything kept, oldest first (an empty list when there is nothing yet or the store cannot be read). */
function sentlog_all($file = null) {
    $d = @json_decode((string)@file_get_contents($file !== null ? $file : SENTLOG_FILE), true);
    return (is_array($d) && isset($d['sent']) && is_array($d['sent'])) ? array_values(array_filter($d['sent'], 'is_array')) : array();
}

/* A sender's one line: log it, and never let the log break or slow the email that has already gone. */
function sentlog_try($to, $subject, $text, $via) {
    try { sentlog_add($to, $subject, $text, $via); } catch (Throwable $e) { }
}
}
