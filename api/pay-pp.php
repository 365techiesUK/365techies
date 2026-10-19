<?php
/*
 * The pay page's PayPal button, with the invoice on it (19 Oct 2026) - how it works and the rules: pay-pp-lib.php.
 *   {do:'start', amount, ref} -> {ok, url}                  an order for that amount and reference; the page goes to url (PayPal)
 *   {do:'done', order}        -> {ok, state, amount, ref}   back from PayPal: take the payment, book it, say how it went
 *                                                            state: paid | pending | declined | open | gone | refused | busy
 * No PayPal keys, or PayPal refuses -> {ok:false, error} and the page falls back to PayPal.Me. Limited per address per day.
 * Nothing personal in or out: an amount, a reference and PayPal's order id.
 * NO closing tag in this file.
 */
error_reporting(0);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') { http_response_code(405); echo '{"ok":false,"error":"post"}'; exit; }
function ppw($a, $code = 200) { http_response_code($code); echo json_encode($a, JSON_UNESCAPED_SLASHES); exit; }
$in = json_decode((string)file_get_contents('php://input', false, null, 0, 4000), true);
if (!is_array($in)) ppw(array('ok' => false, 'error' => 'bad_request'), 400);
require_once __DIR__ . '/pay-pp-lib.php';
require_once __DIR__ . '/pcm-mailmove-lib.php';   // mm_rate_take, mm_rate_file, mm_ip_key
$cr = pp_creds();
if (!$cr) ppw(array('ok' => false, 'error' => 'not_set_up'));
$do = preg_replace('/[^a-z]/', '', (string)($in['do'] ?? ''));

if ($do === 'start') {
    $rt = mm_rate_take(mm_rate_file(__DIR__), array(array('pps:' . mm_ip_key(), 20), array('pps', 400)));
    if ($rt !== true) ppw(array('ok' => false, 'error' => $rt === 'busy' ? 'busy' : 'too_many'));
    list($ok, $r) = ppay_start($cr, (string)($in['amount'] ?? ''), (string)($in['ref'] ?? ''));
    ppw($ok ? array('ok' => true, 'url' => $r) : array('ok' => false, 'error' => $r));
}
if ($do === 'done') {
    if (mm_rate_take(mm_rate_file(__DIR__), array(array('ppd:' . mm_ip_key(), 60))) === false) ppw(array('ok' => false, 'error' => 'too_many'));
    list($state, $info) = ppay_finish($cr, (string)($in['order'] ?? ''), 'page');
    ppw(array('ok' => true, 'state' => $state, 'amount' => (string)($info['amount'] ?? ''), 'ref' => (string)($info['ref'] ?? '')));
}
ppw(array('ok' => false, 'error' => 'bad_action'), 400);
