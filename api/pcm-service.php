<?php
/**
 * 365 PC Manager - full-service delivery for Pro (on-support) customers.
 * The tray app's "Run my full 365 service" button POSTs JSON {key, machine} here.
 * We validate the licence against the SAME customer DB pcm.php uses, and only for an
 * active PRO customer whose machine is registered do we serve the Service Pass script.
 *
 * This is the licence-keyed sibling of pass.php (which uses one-time HMAC tokens for a
 * technician's manual `irm | iex`). Here the gate is the customer's own support-plan key,
 * so a customer on support can run their full service themselves from inside the app.
 *
 * Server-only files (NEVER in git):
 *   pcm-data.json            (the customer DB, shared with pcm.php)
 *   servicepass-payload.ps1  (the actual Service Pass script, uploaded via SiteGround)
 *
 * On success  -> 200, text/plain, the watermarked PowerShell script (large; the app runs it elevated).
 * On refusal  -> 200, text/plain, a short "# not on support" line (NOT the script) so the app
 *                shows the friendly "on support only" message rather than a network error.
 */
header('Content-Type: text/plain; charset=utf-8');
header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

$DATA    = __DIR__ . '/pcm-data.json';
$payload = __DIR__ . '/servicepass-payload.ps1';

function deny($why){ echo "# 365 Techies full service unavailable: " . $why . "\n"; exit; }

if (!file_exists($payload)) { http_response_code(503); deny('server not configured yet'); }

$raw = file_get_contents('php://input');
$in  = json_decode($raw, true);
if (!is_array($in)) deny('bad request');

$key     = isset($in['key'])     ? strtoupper(preg_replace('/[^A-Za-z0-9\-]/', '', $in['key'])) : '';
$machine = isset($in['machine']) ? preg_replace('/[^a-f0-9]/', '', substr($in['machine'], 0, 32)) : '';
if ($key === '') deny('no key');

// Read the shared customer DB (same store pcm.php writes). A present-but-unparseable file
// must not be treated as "no such customer" - refuse rather than risk a wrong answer.
if (!file_exists($DATA)) deny('not on support');
$rawDb = (string)@file_get_contents($DATA);
$db = json_decode($rawDb, true);
if (!is_array($db) || !isset($db['customers'])) { http_response_code(503); deny('temporarily unavailable'); }

if (!isset($db['customers'][$key])) deny('not on support');
$c = $db['customers'][$key];
$tier = (isset($c['tier']) && $c['tier'] === 'pro') ? 'pro' : 'free';
if ($tier !== 'pro') deny('not on support');

// require the machine to be one this customer has activated - stops a shared pro key from
// running an admin script on arbitrary PCs. Activation (pcm.php) registers the machine first.
$machines = isset($c['machines']) && is_array($c['machines']) ? $c['machines'] : array();
if ($machine === '' || !isset($machines[$machine])) deny('activate on this PC first');

// A BOOKED VISIT HAPPENING NOW is the visit's six-weekly service, not a self-run (owner, 28 Sep 2026: "change the report
// heading too"). The team often runs the service from the customer's own app over Splashtop during the visit; it used to
// be served as a self-run, so the report said "SELF-RUN SERVICE REPORT" and "What the service did today", and only the
// Slack post and the email subject were corrected afterwards (pcm.php reportup). Decided here, at the start, everything
// agrees. "Now" = a visit in the SimplyBook list the poller keeps ($db['sbv']: bid, em, nm, start, end) that starts
// within 2 h or ended within the last 4 h, for this customer's email or the same first + last name - the matching
// sr_visit_in_list uses for the after-the-fact rule. pcm-review.php is deliberately NOT included here: a warning from it
// would land inside the script this endpoint serves.
function svc_name_key($n) {   // the same as pcm-review.php sr_name_key
    $n = strtolower(trim((string)$n));
    $n = preg_replace('/[^a-z ]+/', ' ', $n);
    $t = array_values(array_filter(explode(' ', $n), function ($w) {
        return $w !== '' && !in_array($w, array('mr', 'mrs', 'ms', 'miss', 'dr', 'prof', 'rev', 'sir', 'and'), true);
    }));
    return count($t) < 2 ? '' : $t[0] . ' ' . $t[count($t) - 1];
}
function svc_visit_now($c, $rows, $now) {
    $ems = array(); $nks = array();
    foreach (array('email', 'sb_email') as $f) { $e = strtolower(trim((string)(isset($c[$f]) ? $c[$f] : ''))); if ($e !== '') $ems[] = $e; }
    foreach (array('name', 'sb_name') as $f) { $k = svc_name_key(isset($c[$f]) ? $c[$f] : ''); if ($k !== '') $nks[] = $k; }
    if ((!$ems && !$nks) || !is_array($rows)) return false;
    foreach ($rows as $v) {
        if (!is_array($v)) continue;
        $end = isset($v['end']) ? (int)$v['end'] : 0; $start = isset($v['start']) ? (int)$v['start'] : ($end - 3600);
        if ($end <= 0 || $start > $now + 7200 || $end < $now - 14400) continue;
        if (in_array(strtolower((string)(isset($v['em']) ? $v['em'] : '')), $ems, true)) return true;
        if (in_array(svc_name_key(isset($v['nm']) ? $v['nm'] : ''), $nks, true)) return true;
    }
    return false;
}
$visitNow = svc_visit_now($c, isset($db['sbv']) ? $db['sbv'] : array(), time());

// stamp the run for the owner's admin view, best-effort (never block the service on a write).
$lk = @fopen($DATA . '.lock', 'c');
if ($lk) @flock($lk, LOCK_EX);
$rawDb2 = (string)@file_get_contents($DATA);
$db2 = json_decode($rawDb2, true);
if (is_array($db2) && isset($db2['customers'][$key]['machines'][$machine])) {
    $db2['customers'][$key]['machines'][$machine]['fullservice'] = gmdate('Y-m-d H:i');
    // consumed by pcm.php reportup: the next service report from this PC is tagged self-run - not during a booked visit
    if (!$visitNow) $db2['customers'][$key]['machines'][$machine]['selfrun_served'] = time();
    else unset($db2['customers'][$key]['machines'][$machine]['selfrun_served']);
    $tmp = $DATA . '.' . getmypid() . '.tmp';
    if (@file_put_contents($tmp, json_encode($db2, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES), LOCK_EX) !== false) @rename($tmp, $DATA);
}
if ($lk) { @flock($lk, LOCK_UN); @fclose($lk); }

// serve, watermarked. Strip any UTF-8 BOM (a mid-file BOM breaks PowerShell's parse).
$code = (string)file_get_contents($payload);
if (substr($code, 0, 3) === "\xEF\xBB\xBF") { $code = substr($code, 3); }
echo "# 365 Techies full service - served " . gmdate('Y-m-d H:i') . " UTC - customer " . $key . " - machine " . substr($machine, 0, 8) . " - " . ($visitNow ? "booked visit" : "self-run") . "\n";
// Tell the script it is being run by the customer, not a technician: v3.8+ reads this and
// declares selfrun in its report summary, so the portal, Slack and the email say so.
// ⚠ It has to go AFTER the script's [CmdletBinding()] / param(...) block. PowerShell only accepts
// those as the first statements of a file; from 11 to 14 Sep 2026 this line was echoed BEFORE
// them, the served script failed to parse ("Unexpected attribute 'CmdletBinding'"), and every
// self-run service died at launch as a flash of console. Verified with the PowerShell parser
// on the served form before this fix shipped (scratchpad/pcm-service-test.php).
// '0' during a booked visit: the technician's service, with the technician's report (see svc_visit_now above)
$inject = "\$env:P365_SELFRUN = '" . ($visitNow ? '0' : '1') . "'\n";
$placed = false;
$pp = strpos($code, "\nparam(");
if ($pp !== false) {
    $close = strpos($code, "\n)", $pp);                       // the block's closing paren, column 0
    if ($close !== false) {
        $eol = strpos($code, "\n", $close + 1);
        if ($eol !== false) { $code = substr($code, 0, $eol + 1) . $inject . substr($code, $eol + 1); $placed = true; }
    }
}
if (!$placed) { $code = $inject . $code; }   // a payload without a param block can take it first
echo $code;
