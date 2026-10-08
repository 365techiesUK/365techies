<?php
/*
 * The ONE way to write the customer file (api/pcm-data.json) - 8 Oct 2026, after it was found EMPTY on the live server.
 *
 * Every writer did `if (@file_put_contents($tmp, json_encode($db, ...)) !== false) rename($tmp, $DATA)`. json_encode
 * returns FALSE on a single broken UTF-8 byte anywhere in the data - and substr() cutting a name or a course title at a
 * byte limit (pcm.php: PC names at 60, course titles at 420; the booking poller: names at 80) makes exactly that byte.
 * file_put_contents($tmp, false) writes an EMPTY file and returns 0, which is !== false, so the empty file was renamed
 * over the whole customer list; the next reader saw no customers and the next save made it permanent. The booking
 * poller (every 5 min) and every PC's hourly check-in each re-ran it.
 *
 * pcm_db_put():
 *   - encodes with JSON_INVALID_UTF8_SUBSTITUTE (a broken byte becomes U+FFFD, the rest is kept) and
 *     JSON_PARTIAL_OUTPUT_ON_ERROR, and never writes an empty or failed encoding;
 *   - writes the temp file and renames it only when every byte went down (a full disk can't leave half a file);
 *   - never lets a save holding NO customers replace a customer file that HAS them (a writer that read nothing).
 * A refusal is logged (pcm-db-refused.log, denied in .htaccess) and posted to Slack at most once an hour.
 * Include-only: functions, no side effects.
 */
if (!function_exists('pcm_db_put')) {

function pcm_db_json($d) {
    $j = json_encode($d, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE | JSON_PARTIAL_OUTPUT_ON_ERROR);
    return (!is_string($j) || strlen($j) < 2) ? '' : $j;
}

/** How many customers the file on disk holds now: -1 when it can't be read (missing, empty or not JSON). */
function pcm_db_count_on_disk($f) {
    $raw = (string)@file_get_contents($f);
    if ($raw === '') return -1;
    $d = json_decode($raw, true);
    return (is_array($d) && isset($d['customers']) && is_array($d['customers'])) ? count($d['customers']) : -1;
}

/** Write $d to $f through $tmp. Returns true when written, false when refused (the file is left as it was). */
function pcm_db_put($tmp, $d, $f) {
    $j = pcm_db_json($d);
    if ($j === '') { @unlink($tmp); pcm_db_refused($f, 'could not encode the data'); return false; }
    if (basename($f) === 'pcm-data.json' && is_array($d) && empty($d['customers']) && pcm_db_count_on_disk($f) > 0) {
        @unlink($tmp); pcm_db_refused($f, 'a save with no customers over a file that has them'); return false;
    }
    $n = @file_put_contents($tmp, $j, LOCK_EX);
    if ($n !== strlen($j)) { @unlink($tmp); pcm_db_refused($f, 'short write (' . var_export($n, true) . ' of ' . strlen($j) . ' bytes)'); return false; }
    if (!@rename($tmp, $f)) { @unlink($tmp); pcm_db_refused($f, 'rename failed'); return false; }
    return true;
}

function pcm_db_refused($f, $why) {
    $who = php_sapi_name() === 'cli' ? 'cron' : basename(isset($_SERVER['SCRIPT_NAME']) ? (string)$_SERVER['SCRIPT_NAME'] : '?');
    $line = gmdate('Y-m-d H:i:s') . 'Z ' . basename($f) . ' REFUSED by ' . $who . ': ' . $why;
    @file_put_contents(__DIR__ . '/pcm-db-refused.log', $line . "\n", FILE_APPEND | LOCK_EX);
    // Slack, at most once an hour (a stuck writer must not flood the channel)
    $mark = __DIR__ . '/pcm-db-refused.ts';
    if ((int)@filemtime($mark) > time() - 3600) return;
    @touch($mark);
    $wf = __DIR__ . '/slack-webhook.php';
    if (!file_exists($wf) || !function_exists('curl_init')) return;
    $SLACK_WEBHOOK = '';
    ob_start(); include $wf; ob_end_clean();   // never echo the file (it may be a bare URL)
    if (empty($SLACK_WEBHOOK) && preg_match('#https://hooks\.slack\.com/\S+#', (string)@file_get_contents($wf), $m)) $SLACK_WEBHOOK = trim($m[0]);
    if (empty($SLACK_WEBHOOK)) return;
    $ch = curl_init($SLACK_WEBHOOK);
    curl_setopt_array($ch, array(CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 4,
        CURLOPT_HTTPHEADER => array('Content-Type: application/json'),
        CURLOPT_POSTFIELDS => json_encode(array('text' => ':shield: *Customer file save refused* - ' . $who . ': ' . $why . '. The file was left as it was (more in api/pcm-db-refused.log).'))));
    @curl_exec($ch); curl_close($ch);
}
}
