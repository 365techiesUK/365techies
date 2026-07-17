<?php
/**
 * 365 PC Manager - SMS appointment reminders (TextMagic), run by cron.
 *
 * SiteGround cron (Site Tools -> Devs -> Cron Jobs), every 5 minutes:
 *   php /home/customer/www/365techies.co.uk/public_html/api/pcm-remind.php
 * (also callable over HTTP with ?k=<SB_CALLBACK_TOKEN> for testing)
 *
 * For each customer with an upcoming booking (next_ts), an SMS opt-in (remind_sms),
 * a phone number from their SimplyBook profile (sb_phone), and a reminder offset
 * (remind_min, default 60): when now >= start - offset and not already sent for
 * this booking time, send one TextMagic SMS and stamp remind_sent = next_ts.
 *
 * Server-only config (NEVER in git): api/pcm-textmagic.php
 *   <?php $TM_USER = 'textmagic-username'; $TM_KEY = 'api-v2-key';
 * TextMagic REST v2: POST https://rest.textmagic.com/api/v2/messages
 *   headers X-TM-Username / X-TM-Key, body text=...&phones=447...
 */
$CFG  = __DIR__ . '/pcm-textmagic.php';
$SBCFG= __DIR__ . '/pcm-simplybook.php';
$DATA = __DIR__ . '/pcm-data.json';
header('Content-Type: text/plain; charset=utf-8');
header('X-Robots-Tag: noindex, nofollow');
date_default_timezone_set('Europe/London');

// cron runs from CLI; over HTTP require the callback token so strangers can't trigger sends
if (php_sapi_name() !== 'cli') {
    if (!file_exists($SBCFG)) exit('not configured');
    require $SBCFG; // $SB_CALLBACK_TOKEN among others
    if (!isset($_GET['k']) || !hash_equals((string)$SB_CALLBACK_TOKEN, (string)$_GET['k'])) { http_response_code(403); exit('denied'); }
}
if (!file_exists($CFG)) exit("sms not configured (upload pcm-textmagic.php)\n");
require $CFG; // $TM_USER, $TM_KEY
if (empty($TM_USER) || empty($TM_KEY)) exit("sms not configured\n");

function uk_phone($p) {
    $p = preg_replace('/[^0-9]/', '', (string)$p);   // digits only (drops any stray +)
    if ($p === '') return '';
    if (substr($p, 0, 2) === '00') return substr($p, 2);   // 00 international prefix -> E.164 digits
    if (substr($p, 0, 2) === '07') return '44' . substr($p, 1);
    if (substr($p, 0, 1) === '0')  return '44' . substr($p, 1);
    return $p;
}

// helper: open+lock, read, run $fn($db) which may mutate + returns bool "dirty", save, unlock
function with_db($DATA, $fn) {
    $lk = @fopen($DATA . '.lock', 'c');
    if (!$lk || !@flock($lk, LOCK_EX | LOCK_NB)) { if ($lk) @fclose($lk); return null; }  // NB: don't pile up crons
    $raw = (string)@file_get_contents($DATA);
    $db = $raw !== '' ? json_decode($raw, true) : array('customers' => array());
    if (!is_array($db)) { @flock($lk, LOCK_UN); @fclose($lk); return false; }
    if (!isset($db['customers'])) $db['customers'] = array();
    $ret = $fn($db);
    if (is_array($ret)) { $tmp = $DATA . '.' . getmypid() . '.tmp'; if (@file_put_contents($tmp, json_encode($ret, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), LOCK_EX) !== false) @rename($tmp, $DATA); }
    @flock($lk, LOCK_UN); @fclose($lk);
    return true;
}

// PASS 1 (under lock, NO http): find who's due, mark them "claimed" so a second cron won't double-send
$now = time(); $due = array();
$ok = with_db($DATA, function($db) use ($now, &$due) {
    $changed = false;
    foreach ($db['customers'] as $key => $c) {
        $ts = intval(isset($c['next_ts']) ? $c['next_ts'] : 0);
        if ($ts <= $now || $ts > $now + 86400 * 14) continue;
        if (empty($c['remind_sms'])) continue;
        $off = max(5, min(2880, intval(isset($c['remind_min']) ? $c['remind_min'] : 60))) * 60;
        if ($now < $ts - $off) continue;
        if (intval(isset($c['remind_sent']) ? $c['remind_sent'] : 0) === $ts) continue;  // already sent for this slot
        $phone = uk_phone(isset($c['sb_phone']) ? $c['sb_phone'] : (isset($c['phone']) ? $c['phone'] : ''));
        // claim now (stamp before sending) so a crash/overlap can't re-text; a hard failure below un-claims for retry
        $db['customers'][$key]['remind_sent'] = $ts;
        $changed = true;
        if ($phone !== '') $due[] = array('key' => $key, 'phone' => $phone, 'ts' => $ts);  // no phone => claimed + skipped
    }
    return $changed ? $db : true;
});
if ($ok === null) exit("another reminder run is in progress\n");
if ($ok === false) exit("db unreadable - NOT sending\n");

// PASS 2 (NO lock): send each SMS. On a network/5xx failure, un-claim so the next cron retries;
// a 4xx (bad number) stays claimed (permanent - don't spam).
$sent = 0; $unclaim = array();
foreach ($due as $d) {
    $whenTxt = date('g:ia \o\n D j M', $d['ts']);
    $text = "365 Techies: a reminder your PC service is at " . $whenTxt . ". If you use a backup drive, please plug it in ready. Need to change it? Use the app or call 01202 775566.";
    $ch = curl_init('https://rest.textmagic.com/api/v2/messages');
    curl_setopt_array($ch, array(CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 12,
        CURLOPT_HTTPHEADER => array('X-TM-Username: ' . $TM_USER, 'X-TM-Key: ' . $TM_KEY, 'Content-Type: application/x-www-form-urlencoded'),
        CURLOPT_POSTFIELDS => http_build_query(array('text' => $text, 'phones' => $d['phone']))));
    $res = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($res !== false && $code >= 200 && $code < 300) { $sent++; echo "sent to {$d['key']}\n"; }
    else if ($res === false || $code >= 500 || $code === 0) { $unclaim[] = $d; echo "temp fail {$d['key']} (http {$code}) - will retry\n"; }
    else echo "permanent fail {$d['key']} (http {$code}) - not retrying\n";  // 4xx: leave claimed
}
// PASS 3 (brief lock): un-claim the temp failures so the next cron retries them
if (count($unclaim)) with_db($DATA, function($db) use ($unclaim) {
    foreach ($unclaim as $d) if (isset($db['customers'][$d['key']]) && intval($db['customers'][$d['key']]['remind_sent'] ?? 0) === $d['ts']) unset($db['customers'][$d['key']]['remind_sent']);
    return $db;
});
echo "done - {$sent} sent\n";
