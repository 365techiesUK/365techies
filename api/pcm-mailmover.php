<?php
/**
 * 365 PC Manager v29 - hands the signed 365 Mail Mover to a PC that staff have switched the email move on for.
 * The app POSTs JSON {key, machine}. Only a machine registered to that licence, with the staff switch on
 * (pcm-booking.php staffmailmove, stored as machines[..]['mailmove']), gets the file - any plan: the £60 email move is
 * a paid job on its own. The app then runs it INSIDE itself, and only if its signature is 365 Techies Ltd.
 *
 * FREE route (365 PC Manager v30 - the free Virgin email check and move, for everyone, no sign-up): the app POSTs
 * JSON {free:1, machine, ver} with ver >= 30 and gets the same signed file with no licence key. At most 20 fetches per
 * machine per UTC day (and 200 per caller IP), counted in the rate store described in pcm-mailmove-lib.php - the only
 * thing this route writes. The staff route below is unchanged.
 *
 * Server-only file (NEVER in git - the repo is public; the payload is only ever handed out signed, through here):
 *   mailmover-payload.ps1   the code-signed MailMover.ps1, uploaded via SiteGround (.htaccess refuses *.ps1 directly)
 *
 * Success -> 200, the signed script byte for byte. Refusal -> 200, one line "# 365 Mail Mover unavailable: <why>"
 * (503 with the same line when the file itself is missing or unsigned, or the rate store cannot be used).
 */
header('Content-Type: text/plain; charset=utf-8');
header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

$DATA    = __DIR__ . '/pcm-data.json';
$payload = __DIR__ . '/mailmover-payload.ps1';

function deny($why) { echo "# 365 Mail Mover unavailable: " . $why . "\n"; exit; }

$in = json_decode((string)file_get_contents('php://input'), true);
if (!is_array($in)) deny('bad request');

if (!empty($in['free'])) {
    require __DIR__ . '/pcm-mailmove-lib.php';   // top-level scope on purpose (functions only)
    $mid = mm_machine(isset($in['machine']) ? $in['machine'] : '');
    $ver = (isset($in['ver']) && is_numeric($in['ver'])) ? (int)$in['ver'] : 0;
    if ($mid === '') deny('bad request');
    if ($ver < 30) deny('please update 365 PC Manager to the latest version');
    // checked BEFORE counting, so an outage on our side never uses up anyone's fetches for the day
    $body = @file_get_contents($payload);
    if ($body === false || strpos($body, "\n# SIG # Begin signature block") === false) { http_response_code(503); deny('temporarily unavailable'); }
    $rt = mm_rate_take(mm_rate_file(__DIR__), array(array('f:' . $mid, 20), array('fi:' . mm_ip_key(), 200)));
    if ($rt === 'busy') { http_response_code(503); deny('temporarily unavailable'); }
    if ($rt !== true) deny('daily limit reached - please try again tomorrow');
    echo $body;
    exit;
}

$key     =isset($in['key'])     ? strtoupper(preg_replace('/[^A-Za-z0-9\-]/', '', $in['key'])) : '';
$machine = isset($in['machine']) ? preg_replace('/[^a-f0-9]/', '', substr($in['machine'], 0, 32)) : '';
if ($key === '' || $machine === '') deny('not switched on');

if (!file_exists($DATA)) deny('not switched on');
$db = json_decode((string)@file_get_contents($DATA), true);
if (!is_array($db) || !isset($db['customers'])) { http_response_code(503); deny('temporarily unavailable'); }
if (!isset($db['customers'][$key]['machines'][$machine])) deny('not switched on');
if (empty($db['customers'][$key]['machines'][$machine]['mailmove'])) deny('not switched on');

// the app refuses anything unsigned, so never hand it one
if (!file_exists($payload)) { http_response_code(503); deny('temporarily unavailable'); }
if (strpos((string)file_get_contents($payload), "\n# SIG # Begin signature block") === false) { http_response_code(503); deny('temporarily unavailable'); }
readfile($payload);
