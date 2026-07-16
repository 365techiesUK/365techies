<?php
/**
 * 365 Techies Service Pass gate.
 * Serves the ServicePass PowerShell script ONLY with a valid one-time token:
 *   irm https://365techies.co.uk/api/pass.php?t=<token> | iex
 *
 * Token format (made by New-PassToken.ps1): <mins36>-<nonce>-<mac>
 *   mins36 = minutes-since-epoch, base36   nonce = 4 random chars
 *   mac    = first 10 hex chars of HMAC-SHA256("mins36-nonce", secret)
 * Valid for 20 minutes, single use (burned into pass-used.json).
 *
 * Server-only files (NEVER in git - see .gitignore):
 *   pass-secret.php   -> <?php $PASS_SECRET = '<long random string>';
 *   servicepass-payload.ps1  (the actual script, uploaded via SiteGround)
 */
header('Content-Type: text/plain; charset=utf-8');
header('X-Robots-Tag: noindex, nofollow');
// single-use depends on every request reaching PHP - SiteGround's dynamic cache must never serve this
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

$secretFile = __DIR__ . '/pass-secret.php';
$payload    = __DIR__ . '/servicepass-payload.ps1';
$usedFile   = __DIR__ . '/pass-used.json';

if (!file_exists($secretFile) || !file_exists($payload)) { http_response_code(503); exit("Write-Host '365 Techies Service Pass: server not configured yet' -ForegroundColor Yellow\n"); }
require $secretFile; // defines $PASS_SECRET

$t = isset($_GET['t']) ? trim((string)$_GET['t']) : '';
if (!preg_match('/^([a-z0-9]{4,8})-([a-z0-9]{4})-([a-f0-9]{10})$/i', $t, $m)) { http_response_code(403); exit("Write-Host '365 Techies Service Pass: invalid token - run New-PassToken.ps1 for a fresh one' -ForegroundColor Yellow\n"); }
list(, $mins36, $nonce, $mac) = $m;

// signature
$calc = substr(hash_hmac('sha256', strtolower($mins36) . '-' . strtolower($nonce), $PASS_SECRET), 0, 10);
if (!hash_equals($calc, strtolower($mac))) { http_response_code(403); exit("Write-Host '365 Techies Service Pass: invalid token - run New-PassToken.ps1 for a fresh one' -ForegroundColor Yellow\n"); }

// age: 20-minute window (allow 2 min clock skew forward)
$mins = intval($mins36, 36);
$nowM = intdiv(time(), 60);
if ($nowM - $mins > 20 || $mins - $nowM > 2) { http_response_code(403); exit("Write-Host '365 Techies Service Pass: token expired (20 min) - generate a fresh one' -ForegroundColor Yellow\n"); }

// single use - with a 3-minute grace window after first use, so a WAF retry or an
// overeager link-prefetcher can't burn the token before the technician's own run
$used = file_exists($usedFile) ? (json_decode((string)@file_get_contents($usedFile), true) ?: array()) : array();
$key  = strtolower($mins36 . '-' . $nonce);
if (isset($used[$key]) && ($nowM - $used[$key]) > 3) { http_response_code(403); exit("Write-Host '365 Techies Service Pass: that token was already used - generate a fresh one' -ForegroundColor Yellow\n"); }
// prune entries older than a day, then record first use
$cut = $nowM - 1440;
foreach ($used as $k => $v) { if ($v < $cut) unset($used[$k]); }
if (!isset($used[$key])) { $used[$key] = $nowM; }
@file_put_contents($usedFile, json_encode($used), LOCK_EX);

// serve, watermarked. Strip any UTF-8 BOM from the payload: prepending the watermark
// would push the BOM mid-file, which corrupts PowerShell's parse ("Unexpected attribute
// 'CmdletBinding'") and kills the app instantly.
$code = (string)file_get_contents($payload);
if (substr($code, 0, 3) === "\xEF\xBB\xBF") { $code = substr($code, 3); }
echo "# 365 Techies Service Pass - served " . gmdate('Y-m-d H:i') . " UTC - session " . $key . "\n";
echo $code;
