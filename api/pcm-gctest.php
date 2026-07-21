<?php
/* TEMPORARY read-only GoCardless token connection test. Guarded; returns only whether the
 * server-only token authenticates + the account (creditor) name. DELETE after verifying. */
error_reporting(0);
header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');
if (($_GET['k'] ?? '') !== 'gc-conn-check-k7h2x') { http_response_code(403); echo json_encode(['ok' => false, 'error' => 'forbidden']); exit; }
$cfg = __DIR__ . '/pcm-gocardless.php';
if (!is_readable($cfg)) { echo json_encode(['ok' => false, 'error' => 'no_token_file', 'hint' => 'api/pcm-gocardless.php not found']); exit; }
include $cfg;
if (empty($GC_TOKEN)) { echo json_encode(['ok' => false, 'error' => 'empty_token', 'hint' => 'file exists but $GC_TOKEN is empty - check the format']); exit; }
$base = (strpos($GC_TOKEN, 'sandbox') === 0) ? 'https://api-sandbox.gocardless.com' : 'https://api.gocardless.com';
$ch = curl_init($base . '/creditors?limit=1');
curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_CONNECTTIMEOUT => 5, CURLOPT_TIMEOUT => 12,
    CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $GC_TOKEN, 'GoCardless-Version: 2015-07-06']]);
$r = curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
$j = json_decode((string)$r, true);
$name = isset($j['creditors'][0]['name']) ? $j['creditors'][0]['name'] : null;
$env = ($base === 'https://api-sandbox.gocardless.com') ? 'sandbox' : 'live';
echo json_encode(['ok' => ($code >= 200 && $code < 300), 'connected' => ($code >= 200 && $code < 300),
    'httpCode' => $code, 'account' => $name, 'env' => $env, 'access' => 'read-only']);
