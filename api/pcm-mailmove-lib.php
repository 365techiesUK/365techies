<?php
/*
 * Shared by the free Virgin email tools in 365 PC Manager v30 (launch 2026):
 *   pcm-mailmover.php      the FREE route: {"free":1,"machine","ver"} gets the signed Mail Mover, no licence key
 *   pcm-mailmove-help.php  "Stuck? We'll do it for you": a call-back card to Slack #365-job-tracker
 *
 * FUNCTIONS ONLY. Nothing here prints or runs on its own, so fetching it over HTTP returns an empty body (and
 * .htaccess denies it anyway). Include it at TOP-LEVEL scope. Tested by pcm-mailmove-test.php (CLI only).
 *
 * THE RATE STORE (the only thing either endpoint writes)
 * One small JSON file of counters for the current UTC day: {"d":"2026-10-01","c":{"f:<machine>":3,...}}. It starts
 * again at midnight UTC, so nothing in it outlives the day. Its name is sha1('pcm-mailmove-rate') + ".json" ON PURPOSE:
 * gitignored api/ stores are otherwise served publicly, and a 40-hex-character .json name is already refused by the
 * existing ^[a-f0-9]{40}\.json$ rule in the root .htaccess, from the moment the file is first written.
 * IP addresses are never stored: only a daily-changing hash of one, used as a counter key.
 *
 * SiteGround bills every second a PHP script runs: everything here is a single locked read-modify-write of a small
 * file, and the one outbound call (Slack) has a 4 s connect / 8 s total limit. NO closing tag in this file.
 */

if (!function_exists('mm_rate_file')) {

define('MM_RATE_MAX_KEYS', 100000);   // a runaway store refuses new keys rather than growing without end

function mm_rate_file($dir) { return rtrim($dir, '/\\') . '/' . sha1('pcm-mailmove-rate') . '.json'; }

// A daily-changing hash of the caller's IP: enough to count with, useless for anything else by tomorrow.
function mm_ip_key() {
    $ip = isset($_SERVER['REMOTE_ADDR']) ? (string)$_SERVER['REMOTE_ADDR'] : '';
    return substr(sha1(gmdate('Y-m-d') . '|' . $ip . '|mm365'), 0, 16);
}

/* Take one from every bucket at once, or from none. $buckets = array(array(key, limit), ...).
   Returns true (taken), false (a bucket is at its limit today) or 'busy' (the store could not be used). */
function mm_rate_take($file, $buckets, $now = null) {
    $day = gmdate('Y-m-d', $now === null ? time() : $now);
    $fp = @fopen($file, 'c+');
    if (!$fp) return 'busy';
    if (!@flock($fp, LOCK_EX)) { @fclose($fp); return 'busy'; }
    $st = json_decode((string)stream_get_contents($fp), true);
    if (!is_array($st) || !isset($st['d']) || $st['d'] !== $day || !isset($st['c']) || !is_array($st['c'])) $st = array('d' => $day, 'c' => array());
    $ok = true;
    foreach ($buckets as $b) {
        $n = isset($st['c'][$b[0]]) ? (int)$st['c'][$b[0]] : 0;
        if ($n >= (int)$b[1]) { $ok = false; break; }
        if ($n === 0 && count($st['c']) >= MM_RATE_MAX_KEYS) { $ok = 'busy'; break; }
    }
    if ($ok === true) {
        foreach ($buckets as $b) $st['c'][$b[0]] = (isset($st['c'][$b[0]]) ? (int)$st['c'][$b[0]] : 0) + 1;
        @ftruncate($fp, 0); @rewind($fp);
        @fwrite($fp, json_encode($st, JSON_UNESCAPED_SLASHES));
        @fflush($fp);
    }
    @flock($fp, LOCK_UN); @fclose($fp);
    return $ok;
}

// The app's machine id (12 hex characters today; up to 32 accepted), lower case, or '' when it is not one.
function mm_machine($v) {
    if (!is_scalar($v)) return '';
    $v = strtolower(trim((string)$v));
    return preg_match('/^[a-f0-9]{8,32}$/', $v) ? $v : '';
}

// Trimmed, control characters removed, whitespace runs collapsed. Length is checked by the caller.
function mm_clean($v) {
    if (!is_scalar($v)) return '';
    $v = (string)$v;
    if (!preg_match('//u', $v)) $v = mm_latin1_to_utf8($v);
    $v = preg_replace('/[\p{C}]+/u', ' ', $v);
    return trim(preg_replace('/\s+/u', ' ', $v));
}
function mm_latin1_to_utf8($s) {   // a body that is not valid UTF-8 is read as Latin-1 rather than dropped
    return preg_replace_callback('/[\x80-\xFF]/', function ($m) { $o = ord($m[0]); return chr(0xC0 | ($o >> 6)) . chr(0x80 | ($o & 0x3F)); }, $s);
}
function mm_len($s) { return (int)preg_match_all('/./us', (string)$s); }   // characters, not bytes (no mbstring needed)

/* A UK phone number, returned in a readable shape ("01202 775566", "07700 900123", "020 7946 0000"), or '' when it
   is not one. Accepts spaces, dashes, dots, brackets, +44 / 0044 and the "+44 (0)" habit. */
function mm_uk_phone($v) {
    $s = preg_replace('/[\s\-\.\(\)\/]/', '', (string)$v);
    if (strpos($s, '+44') === 0) $s = substr($s, 3);
    elseif (strpos($s, '0044') === 0) $s = substr($s, 4);
    elseif ($s !== '' && $s[0] === '0') $s = substr($s, 1);
    else return '';
    if ($s !== '' && $s[0] === '0') $s = substr($s, 1);   // the "(0)" in "+44 (0)1202 ..."
    $s = '0' . $s;
    if (!preg_match('/^0[1-9][0-9]{8,9}$/', $s)) return '';
    if (strlen($s) === 11 && strpos($s, '02') === 0) return substr($s, 0, 3) . ' ' . substr($s, 3, 4) . ' ' . substr($s, 7);
    return substr($s, 0, 5) . ' ' . substr($s, 5);
}

function mm_email_ok($v) { $v = (string)$v; return $v !== '' && strlen($v) <= 160 && filter_var($v, FILTER_VALIDATE_EMAIL) !== false; }

// The #365-job-tracker webhook, read from api/slack-webhook.php (server-only, gitignored, .htaccess-denied) by pattern,
// exactly as slack-lead.php does, so it is never printed. The override exists ONLY under PHP's built-in test server
// (SAPI "cli-server"), which is what pcm-mailmove-test.php runs; the live site's PHP can never take it.
function mm_hook($dir) {
    if (PHP_SAPI === 'cli-server' && getenv('MM_FAKE_SLACK')) return (string)getenv('MM_FAKE_SLACK');
    $src = (string)@file_get_contents(rtrim($dir, '/\\') . '/slack-webhook.php');
    return preg_match('#(https://hooks\.slack\.com/[^\'"\s]+)#', $src, $m) ? $m[1] : '';
}

function mm_post_slack($hook, $payload) {
    if ($hook === '' || !function_exists('curl_init')) return false;
    $ch = curl_init($hook);
    curl_setopt_array($ch, array(CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true, CURLOPT_CONNECTTIMEOUT => 4, CURLOPT_TIMEOUT => 8,
        CURLOPT_HTTPHEADER => array('Content-Type: application/json'), CURLOPT_POSTFIELDS => json_encode($payload)));
    @curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
    return $code >= 200 && $code < 300;
}

function mm_esc($s) { return str_replace(array('&', '<', '>'), array('&amp;', '&lt;', '&gt;'), (string)$s); }

function mm_phase_label($p) {
    $l = array('' => 'Not started yet', 'none' => 'Not started yet', 'check' => 'Checked the mailbox', 'export' => 'Copying from Virgin',
               'upload' => 'Sending to Gmail', 'verify' => 'Checking Gmail', 'finished' => 'Finished', 'stopped' => 'Stopped part-way');
    return isset($l[$p]) ? $l[$p] : ucfirst($p);
}

/* The Slack card (Block Kit + a plain-text fallback). $f: name, phone, email, virgin, count, mb, phase, ver, machine.
   450 MB a day is the Mail Mover's own pace under Gmail's 500 MB-a-day IMAP limit, so the days match the app's. */
function mm_help_card($f, $now = null) {
    require_once __DIR__ . '/pcm-vname-lib.php';   // 9 Oct 2026: "36.1" for build 37
    $mb = (float)$f['mb'];
    $size = $mb >= 1024 ? number_format($mb / 1024, 1) . ' GB' : number_format($mb, 0) . ' MB';
    $days = $mb > 0 ? max(1, (int)ceil($mb / 450)) : 0;
    $box = ($f['count'] > 0 || $mb > 0) ? number_format((int)$f['count']) . ' emails · ' . $size . ($days ? ' · about ' . $days . ' day' . ($days === 1 ? '' : 's') . ' into Gmail' : '') : 'not checked yet';
    $fields = array(
        array('type' => 'mrkdwn', 'text' => "*Name:*\n" . mm_esc($f['name'])),
        array('type' => 'mrkdwn', 'text' => "*Phone:*\n" . mm_esc($f['phone'])),
    );
    if ($f['email'] !== '')  $fields[] = array('type' => 'mrkdwn', 'text' => "*Email:*\n" . mm_esc($f['email']));
    if ($f['virgin'] !== '') $fields[] = array('type' => 'mrkdwn', 'text' => "*Virgin address:*\n" . mm_esc($f['virgin']));
    $fields[] = array('type' => 'mrkdwn', 'text' => "*Mailbox:*\n" . $box);
    $fields[] = array('type' => 'mrkdwn', 'text' => "*Got as far as:*\n" . mm_esc(mm_phase_label($f['phase'])));
    $tz = new DateTimeZone('Europe/London');
    $when = (new DateTime('@' . ($now === null ? time() : $now)))->setTimezone($tz)->format('H:i, D j M');
    $blocks = array(
        array('type' => 'header', 'text' => array('type' => 'plain_text', 'text' => "\xF0\x9F\x93\xA7 Virgin email move: please ring back", 'emoji' => true)),
        array('type' => 'section', 'fields' => $fields),
        array('type' => 'section', 'text' => array('type' => 'mrkdwn', 'text' => 'They pressed *Stuck? We\'ll do it for you* in the free email tools. The move is *£60 per email address*, including a full PC service with a written report - agree it on the phone before starting.')),
        array('type' => 'context', 'elements' => array(array('type' => 'mrkdwn', 'text' => 'via 365 PC Manager v' . pcm_vname((int)$f['ver']) . ' · PC ' . mm_esc($f['machine']) . ' · ' . $when))),
    );
    return array('text' => 'Virgin email move: please ring ' . mm_esc($f['name']) . ' on ' . mm_esc($f['phone']), 'blocks' => $blocks, 'unfurl_links' => false);
}

}
