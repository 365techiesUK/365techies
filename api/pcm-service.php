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

// stamp the run for the owner's admin view, best-effort (never block the service on a write).
$lk = @fopen($DATA . '.lock', 'c');
if ($lk) @flock($lk, LOCK_EX);
$rawDb2 = (string)@file_get_contents($DATA);
$db2 = json_decode($rawDb2, true);
if (is_array($db2) && isset($db2['customers'][$key]['machines'][$machine])) {
    $db2['customers'][$key]['machines'][$machine]['fullservice'] = gmdate('Y-m-d H:i');
    $tmp = $DATA . '.' . getmypid() . '.tmp';
    if (@file_put_contents($tmp, json_encode($db2, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES), LOCK_EX) !== false) @rename($tmp, $DATA);
}
if ($lk) { @flock($lk, LOCK_UN); @fclose($lk); }

// serve, watermarked. Strip any UTF-8 BOM (a mid-file BOM breaks PowerShell's parse).
$code = (string)file_get_contents($payload);
if (substr($code, 0, 3) === "\xEF\xBB\xBF") { $code = substr($code, 3); }
echo "# 365 Techies full service - served " . gmdate('Y-m-d H:i') . " UTC - customer " . $key . " - machine " . substr($machine, 0, 8) . "\n";
echo $code;
