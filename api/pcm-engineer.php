<?php
/**
 * 365 PC Manager - ENGINEER MODE: one service, on a PC that is not on a support plan (18 Sep 2026).
 *
 * WHY: a new customer books a one-off service with a written report. They have no licence key, so the
 * app's "Run my full 365 service" button (pcm-service.php, Pro only) refuses, and the Service Pass
 * payload has no licence to file its report against. The engineer types the customer's name, their
 * email and a PIN; this checks the PIN, creates a ONE-OFF customer record so the report has somewhere
 * to go, and serves the same Service Pass script pcm-service.php serves.
 *
 * WHAT A ONE-OFF RECORD IS, AND IS NOT: tier 'oneoff'. Everything in pcm.php and pcm-admin.php compares
 * tier === 'pro', so a one-off record is treated exactly like a free one everywhere - no plan features,
 * no six-weekly schedule, no "on support" anywhere. It exists so the report can be stored, posted to
 * Slack and emailed to the customer by the code that already does that for plan customers.
 *
 * THE PIN IS THE ONLY LOCK, so it is treated like one: stored as a password hash (never plaintext),
 * checked here, rate limited per address and per day, and every attempt - good or bad - is logged with
 * the machine and the customer name typed. Set and rotate it in the admin console (Engineer PIN), which
 * writes pcm-engineer-secret.json. No PIN set = the door does not exist.
 *
 * Server-only files (NEVER in git, denied in .htaccess):
 *   pcm-engineer-secret.json   {"pins":[{"who":"Steve","hash":"$2y$..","set":"2026-09-18"}]}
 *   pcm-engineer-runs.json     the run log (last 500)
 *   pcm-data.json              the customer DB, shared with pcm.php
 *   servicepass-payload.ps1    the Service Pass script
 *
 * Replies: the payload as text/plain on success, with the run's key and id in X-365-Key / X-365-Run;
 * anything else is a "# ..." comment line and a 200, so the app shows words rather than a network error.
 */
header('Content-Type: text/plain; charset=utf-8');
header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

$DATA    = __DIR__ . '/pcm-data.json';
$SECRET  = __DIR__ . '/pcm-engineer-secret.json';
$RUNS    = __DIR__ . '/pcm-engineer-runs.json';
$PAYLOAD = __DIR__ . '/servicepass-payload.ps1';

const ENG_MAX_FAILS_HOUR = 5;      // wrong PINs from one address before it is shut out
const ENG_MAX_RUNS_DAY   = 12;     // successful services a day, all engineers - a tripwire, not a quota

function eng_deny($why, $code = 200) {
    http_response_code($code);
    echo "# 365 Techies engineer mode: " . $why . "\n";
    exit;
}
function eng_load($f) {
    $raw = (string)@file_get_contents($f);
    if (substr($raw, 0, 3) === "\xEF\xBB\xBF") $raw = substr($raw, 3);   // a BOM (a file saved from Windows) makes json_decode return null
    $j = json_decode($raw, true);
    return is_array($j) ? $j : array();
}
function eng_save($f, $d) {
    $tmp = $f . '.' . getmypid() . '.tmp';
    if (@file_put_contents($tmp, json_encode($d, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), LOCK_EX) === false) return false;
    return @rename($tmp, $f);
}
/* one line per attempt, newest last, capped - the owner's record of who ran what, where */
function eng_log($runs, $row, $file) {
    $runs[] = $row;
    if (count($runs) > 500) $runs = array_slice($runs, -500);
    eng_save($file, $runs);
    return $runs;
}
function eng_txt($v, $max) {
    $v = preg_replace('/[\x00-\x1F\x7F]/u', ' ', (string)$v);
    $v = trim(preg_replace('/\s+/u', ' ', $v));
    return function_exists('mb_substr') ? mb_substr($v, 0, $max) : substr($v, 0, $max);
}

if (!file_exists($PAYLOAD)) eng_deny('the service script is not on the server yet', 503);
if (!file_exists($SECRET)) eng_deny('no engineer PIN has been set - set one in the admin console first', 503);

$in = json_decode((string)file_get_contents('php://input'), true);
if (!is_array($in)) eng_deny('bad request');

$pin      = preg_replace('/[^0-9A-Za-z]/', '', (string)($in['pin'] ?? ''));
$customer = eng_txt($in['customer'] ?? '', 60);
$email    = strtolower(eng_txt($in['email'] ?? '', 120));
$machine  = preg_replace('/[^a-f0-9]/', '', substr((string)($in['machine'] ?? ''), 0, 32));
$pcname   = eng_txt($in['pc'] ?? '', 60);
$ipHash   = substr(hash('sha256', 'eng|' . ($_SERVER['REMOTE_ADDR'] ?? '')), 0, 12);
$now      = time();

if ($customer === '') eng_deny('type the customer\'s name first');
if ($machine === '')  eng_deny('this PC could not be identified - restart the app and try again');
if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) eng_deny('that email address does not look right');

$runs = eng_load($RUNS);
$fails = 0; $today = 0;
foreach ($runs as $r) {
    $t = (int)($r['t'] ?? 0);
    if (($r['ip'] ?? '') === $ipHash && empty($r['ok']) && $t > $now - 3600) $fails++;
    if (!empty($r['ok']) && $t > $now - 86400) $today++;
}
if ($fails >= ENG_MAX_FAILS_HOUR) {
    eng_log($runs, array('t' => $now, 'ok' => false, 'why' => 'locked_out', 'ip' => $ipHash, 'cust' => $customer, 'machine' => $machine), $RUNS);
    eng_deny('too many wrong PINs from here - wait an hour, then try again', 429);
}
if ($today >= ENG_MAX_RUNS_DAY) {
    eng_log($runs, array('t' => $now, 'ok' => false, 'why' => 'day_cap', 'ip' => $ipHash, 'cust' => $customer, 'machine' => $machine), $RUNS);
    eng_deny('the daily limit for one-off services has been reached - call the office', 429);
}

$who = '';
foreach ((array)(eng_load($SECRET)['pins'] ?? array()) as $p) {
    if (!is_array($p) || empty($p['hash'])) continue;
    if ($pin !== '' && password_verify($pin, (string)$p['hash'])) { $who = (string)($p['who'] ?? 'engineer'); break; }
}
if ($who === '') {
    eng_log($runs, array('t' => $now, 'ok' => false, 'why' => 'bad_pin', 'ip' => $ipHash, 'cust' => $customer, 'machine' => $machine), $RUNS);
    sleep(1);                     // a wrong PIN is never answered quickly
    eng_deny('that PIN was not recognised');
}

/* The one-off customer record. Keyed off the email where there is one, so a second visit to the same
   person joins their record rather than making another; otherwise off the name and this machine. */
$seed = $email !== '' ? 'e|' . $email : 'n|' . strtolower($customer) . '|' . $machine;
$h = strtoupper(substr(hash('sha256', 'oneoff|' . $seed), 0, 8));
$key = '1OFF-' . substr($h, 0, 4) . '-' . substr($h, 4, 4);

$lk = @fopen($DATA . '.lock', 'c');
if ($lk) @flock($lk, LOCK_EX);
$db = eng_load($DATA);
if (!isset($db['customers']) || !is_array($db['customers'])) $db['customers'] = array();
if (!isset($db['customers'][$key])) {
    $db['customers'][$key] = array('name' => $customer, 'email' => $email, 'tier' => 'oneoff',
                                   'created' => gmdate('Y-m-d H:i'), 'oneoff' => true, 'machines' => array());
} else {
    $db['customers'][$key]['tier'] = 'oneoff';          // never let a one-off drift into a plan tier
    $db['customers'][$key]['oneoff'] = true;
    if ($customer !== '') $db['customers'][$key]['name'] = $customer;
    if ($email !== '') $db['customers'][$key]['email'] = $email;
}
if (!isset($db['customers'][$key]['machines'][$machine])) {
    $db['customers'][$key]['machines'][$machine] = array('first' => gmdate('Y-m-d H:i'));
}
$m = &$db['customers'][$key]['machines'][$machine];
if ($pcname !== '') $m['name'] = $pcname;
$m['engineer'] = $who;
$m['fullservice'] = gmdate('Y-m-d H:i');
unset($m);
eng_save($DATA, $db);
if ($lk) { @flock($lk, LOCK_UN); @fclose($lk); }

$runId = substr(hash('sha256', $key . '|' . $machine . '|' . $now . '|' . mt_rand()), 0, 16);
eng_log($runs, array('t' => $now, 'ok' => true, 'who' => $who, 'cust' => $customer, 'email' => $email,
                     'machine' => $machine, 'pc' => $pcname, 'key' => $key, 'run' => $runId, 'ip' => $ipHash), $RUNS);

header('X-365-Key: ' . $key);
header('X-365-Run: ' . $runId);
header('X-365-Engineer: ' . $who);

$code = (string)file_get_contents($PAYLOAD);
if (substr($code, 0, 3) === "\xEF\xBB\xBF") $code = substr($code, 3);

/* The markers go immediately AFTER the payload's [CmdletBinding()]/param(...) block - the only place
   PowerShell accepts a statement before one, and the mistake that killed every self-run service for
   three days in September 2026 (see pcm-service.php). Today's payload ignores them and the app files
   the report itself; a later payload can read them to print the customer's name on the report and file
   it without a licence on the PC. */
$inject = "\$env:P365_ONEOFF = '1'\n"
        . "\$env:P365_KEY = '" . $key . "'\n"
        . "\$env:P365_CUSTOMER = '" . str_replace("'", "''", $customer) . "'\n";
$placed = false;
$pp = strpos($code, "\nparam(");
if ($pp !== false) {
    $close = strpos($code, "\n)", $pp);                       // the block's closing paren, column 0
    if ($close !== false) {
        $eol = strpos($code, "\n", $close + 1);
        if ($eol !== false) { $code = substr($code, 0, $eol + 1) . $inject . substr($code, $eol + 1); $placed = true; }
    }
}
if (!$placed) $code = $inject . $code;                        // a payload without a param block takes it first

echo "# 365 Techies one-off service - served " . gmdate('Y-m-d H:i') . " UTC - engineer " . $who
   . " - customer " . $customer . " - machine " . substr($machine, 0, 8) . "\n";
echo $code;
