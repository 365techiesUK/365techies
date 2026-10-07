<?php
/*
 * Lemon Squeezy's webhook for "Unlock everything", the paid PC Manager app abroad (8 Oct 2026; owner: "go with Lemon Squeezy
 * and build the webhook"). Lemon Squeezy is the merchant of record: it takes the payment, the tax and refunds; this page
 * makes the Unlock key and emails it to the buyer from info@ (pcm-plus-lib.php plus_ls_handle):
 *   order_created (paid)              -> one key per order (retries make nothing new): a year, or lifetime for a variant
 *                                        listed as "life" in api/pcm-buy-config.php $LS_VARIANTS; emailed at once
 *   subscription_* (renewed, cancelled, expired, ...) -> the key now ends when the subscription is paid up to (+ a week)
 *   order_refunded                    -> the key is switched off
 * Genuine only when X-Signature = HMAC-SHA256 (hex) of the raw body with the signing secret the owner typed into Lemon
 * Squeezy AND into api/pcm-ls-secret.php ($LS_WEBHOOK_SECRET = '...'; - server-only, never in git, .htaccess-denied).
 * Without that file every delivery is answered 503, so Lemon Squeezy tries again later and nothing is lost.
 * Each delivery adds a line to api/pcm-plus-ls.log (denied, gitignored; the last 300 kept) - never a key, never a body.
 * NO closing tag in this file.
 */
error_reporting(0);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo '{"ok":false,"error":"post"}'; exit; }
$raw = (string)file_get_contents('php://input', false, null, 0, 300000);
require_once __DIR__ . '/pcm-plus-lib.php';
$sig = isset($_SERVER['HTTP_X_SIGNATURE']) ? (string)$_SERVER['HTTP_X_SIGNATURE'] : '';
$secret = plus_ls_secret();
// the website's own email sender (info@), loaded only for a genuine delivery - top-level scope on purpose (its globals)
if (plus_ls_signed($raw, $sig, $secret)) { if (!defined('RV_LIB')) define('RV_LIB', 1); require_once __DIR__ . '/pcm-review.php'; }
list($code, $why) = plus_ls_handle($raw, $sig, $secret, 'plus_send_key');
// the log: when, what, the answer - for the staff card and for a look when something goes wrong
$ev = ''; $jj = json_decode($raw, true); if (is_array($jj) && isset($jj['meta']['event_name'])) $ev = substr(preg_replace('/[^a-z_]/', '', (string)$jj['meta']['event_name']), 0, 40);
$log = __DIR__ . '/pcm-plus-ls.log';
$lines = @file($log, FILE_IGNORE_NEW_LINES); $lines = is_array($lines) ? array_slice($lines, -299) : array();
$lines[] = gmdate('Y-m-d H:i:s') . "\t" . $code . "\t" . ($ev !== '' ? $ev : '-') . "\t" . str_replace(array("\t", "\n"), ' ', $why);
@file_put_contents($log, implode("\n", $lines) . "\n", LOCK_EX);
http_response_code($code);
echo json_encode(array('ok' => $code === 200, 'note' => $why));
