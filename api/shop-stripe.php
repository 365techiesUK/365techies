<?php
/*
 * Stripe's webhook for the shop's card payments (18 Oct 2026; how it works: shop-stripe-lib.php and shop-lib.php).
 * Endpoint: https://365techies.co.uk/api/shop-stripe.php, events:
 *   checkout.session.completed, checkout.session.async_payment_succeeded -> the sale (if the buyer never came back to our page)
 *   checkout.session.expired, checkout.session.async_payment_failed      -> the machine's hold lets go
 * Every request must carry a valid Stripe-Signature for $ST_WHSEC (api/shop-stripe-key.php, the owner's); the event itself is
 * never trusted for the money - shop_card_done reads the session back from Stripe. Only the shop's own sessions (metadata
 * shop=1) are touched as sales; anything else gets 200 and is ignored. No key file -> 503, so Stripe keeps retrying until there is one.
 * 19 Oct 2026: the pay page's card button (a Payment Link, client_reference_id = the invoice number) -> its QuickBooks invoice
 * is marked paid and Slack is told (pcm-paystripe-lib.php). A passing problem answers 500 so Stripe tries again.
 * NO closing tag in this file.
 */
error_reporting(0);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') { http_response_code(405); echo '{"ok":false}'; exit; }
$raw = (string)file_get_contents('php://input', false, null, 0, 300000);
require_once __DIR__ . '/shop-lib.php';

function shw($code, $what) { http_response_code($code); echo json_encode(array('ok' => $code < 300, 'what' => $what)); exit; }
$cr = st_creds();
if (!$cr || $cr['whsec'] === '') shw(503, 'not set up');
if (!st_sig_ok($raw, (string)($_SERVER['HTTP_STRIPE_SIGNATURE'] ?? ''), $cr['whsec'])) { shop_log("webhook\tbad signature"); shw(400, 'bad signature'); }
$ev = json_decode($raw, true);
$type = is_array($ev) ? (string)($ev['type'] ?? '') : '';
$obj = is_array($ev) ? (array)($ev['data']['object'] ?? array()) : array();
if (($obj['object'] ?? '') !== 'checkout.session') shw(200, 'not ours');
if ((string)($obj['metadata']['shop'] ?? '') !== '1') {
    $psid = st_session_id($obj['id'] ?? '');
    if ($psid === '' || (string)($obj['payment_link'] ?? '') === '') shw(200, 'not ours');
    if ($type !== 'checkout.session.completed' && $type !== 'checkout.session.async_payment_succeeded') shw(200, 'ignored');
    require_once __DIR__ . '/pcm-paystripe-lib.php';
    list($pwhat, $pdetail) = pst_handle($cr, $psid, 'webhook');
    shw($pwhat === 'retry' ? 500 : 200, 'pay page: ' . $pwhat);
}
$sid = st_session_id($obj['id'] ?? '');
if ($sid === '') shw(200, 'no session');

if ($type === 'checkout.session.expired' || $type === 'checkout.session.async_payment_failed') {
    $freed = shop_card_expired($sid);
    if ($freed) shop_log("webhook\t" . $type . "\t" . $sid . "\thold released");
    shw(200, $freed ? 'released' : 'nothing held');
}
if ($type === 'checkout.session.completed' || $type === 'checkout.session.async_payment_succeeded') {
    list($state, $info, $new) = shop_card_done($cr, $sid);
    if ($state === 'sold') {
        if (!defined('RV_LIB')) define('RV_LIB', 1);
        require_once __DIR__ . '/pcm-review.php';   // the website's own email sender - top-level scope on purpose (its globals)
        require_once __DIR__ . '/shop-books-lib.php';
        shop_after_sale($state, $info, array('via' => 'webhook'));   // exits
    }
    if ($state === 'clash') { if ($new) shop_clash_alert($info); shw(200, 'clash'); }
    if ($state === 'busy') shw(500, 'busy');   // Stripe tries again later
    if ($state === 'refused') shop_log("webhook\t" . $type . "\t" . $sid . "\trefused: " . (is_string($info) ? $info : ''));
    shw(200, $state);
}
shw(200, 'ignored');
