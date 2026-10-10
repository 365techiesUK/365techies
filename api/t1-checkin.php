<?php
/*
 * Techies One Mail's check-in. 10 Oct 2026. The app calls this when it starts and every few hours.
 *   POST JSON {id, v, win, prov}  -> {ok, latest: {ver, url, sha256, size, notes} | null}
 * id = the app's own random install number; v = its version ("0.13.0"); win = the Windows version ("10.0.22631");
 * prov = the kinds of email provider it is set up for (["bt", "gmail"]) - never an address. What is kept, and why: see
 * t1-installs-lib.php. The answer is how the app hears about a new version (downloads/t1/version.json); it then checks
 * the download's fingerprint and 365 Techies' signature itself before installing anything.
 * NO closing tag in this file.
 */
error_reporting(0);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');
require_once __DIR__ . '/t1-installs-lib.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') { http_response_code(405); echo json_encode(array('ok' => false, 'error' => 'method')); exit; }
$raw = (string)file_get_contents('php://input', false, null, 0, 4096);
$in = json_decode($raw, true);
if (!is_array($in)) { http_response_code(400); echo json_encode(array('ok' => false, 'error' => 'bad-json')); exit; }
$ip = (string)($_SERVER['REMOTE_ADDR'] ?? '');
try {
    t1i_note($in['id'] ?? '', $in['v'] ?? '', $in['win'] ?? '', isset($in['prov']) && is_array($in['prov']) ? array_slice($in['prov'], 0, 20) : array(), $ip);
} catch (Throwable $e) {
    // counting is never allowed to stop the app hearing about updates
}
echo json_encode(array('ok' => true, 'latest' => t1i_latest()));
