<?php
/*
 * Refurbished Dells in stock, bought online with PayPal (14 Oct 2026) - how it works and the rules: api/shop-lib.php.
 *
 * The list page and each machine's page (/refurbished-dell-for-sale/, built by shop_pages.py) POST JSON here:
 *   {do: 'stock'}                       -> {ok, units: {id: available|held|sold}}    (the list page greys out what's gone)
 *   {do: 'config', unit}                -> {ok, state, client_id, env, price, delivery, total}   (one machine's page)
 *   {do: 'create', unit, hold}          -> {ok, id}      a PayPal order at the catalogue's price; holds the machine
 *   {do: 'capture', order}              -> {ok, state, note}   take the payment; sold -> Slack card + the buyer's email
 *   {do: 'release', order, hold}        -> {ok}          the buyer closed PayPal's (or Stripe's) window: the machine is free again
 * Card payments through Stripe Checkout (18 Oct 2026, shop-stripe-lib.php; config says card: true once the key file is there):
 *   {do: 'card', unit, hold}            -> {ok, id, url}  a Checkout Session at the catalogue's price; holds the machine; go to url
 *   {do: 'carddone', session}           -> {ok, state, email}  back from Stripe's page: the session is read from Stripe, and a paid
 *                                          one is the sale (Slack + email + QuickBooks once; shop-stripe.php, the webhook, does it too)
 * hold: a random token the page keeps for this browser, so its own retry is never told "someone else is buying it".
 * NO closing tag in this file.
 */
error_reporting(0);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') { http_response_code(405); echo '{"ok":false,"error":"post"}'; exit; }
$raw = (string)file_get_contents('php://input', false, null, 0, 20000);
require_once __DIR__ . '/shop-lib.php';

function sho($a, $code = 200) { http_response_code($code); echo json_encode($a, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE); exit; }
$in = json_decode($raw, true);
if (!is_array($in)) sho(array('ok' => false, 'error' => 'bad_request'), 400);
$do = preg_replace('/[^a-z]/', '', (string)($in['do'] ?? ''));
$unit = shop_id($in['unit'] ?? '');
$holder = shop_holder($in['hold'] ?? '');

if ($do === 'stock') sho(array('ok' => true, 'units' => shop_stock(null, null, null, $unit)));

if ($do === 'config') {
    $cat = shop_catalogue();
    $u = $unit !== '' ? ($cat['units'][$unit] ?? null) : null;
    if (!$u || ($u['status'] ?? '') === 'draft') sho(array('ok' => true, 'state' => 'off'));
    $cr = pp_creds();
    $d = shop_read();
    $st = shop_state_of($d, $unit, $u);
    // held by THIS browser (it closed PayPal's window and came back): it may carry on
    if ($st === 'held' && $holder !== '' && ($d['u'][shop_key($unit, $u)]['by'] ?? '') === $holder) $st = 'available';
    $sc = st_creds();
    sho(array('ok' => true, 'state' => $st, 'client_id' => $cr ? $cr['id'] : '', 'env' => $cr ? $cr['env'] : '',
        'card' => $sc ? true : false, 'card_env' => $sc ? $sc['env'] : '',
        'price' => shop_money($u['price']), 'delivery' => shop_delivery($u, $cat), 'total' => shop_total($u, $cat)));
}

if ($do === 'create') {
    $cr = pp_creds();
    if (!$cr) sho(array('ok' => false, 'error' => 'not_set_up'));
    $rt = mm_rate_take(mm_rate_file(__DIR__), array(array('shc:' . mm_ip_key(), 30), array('shc', 500)));
    if ($rt !== true) sho(array('ok' => false, 'error' => $rt === 'busy' ? 'busy' : 'rate'));
    list($ok, $res) = shop_create($cr, $unit, $holder);
    sho($ok ? array('ok' => true, 'id' => $res) : array('ok' => false, 'error' => $res));
}

if ($do === 'capture') {
    $cr = pp_creds();
    if (!$cr) sho(array('ok' => false, 'error' => 'not_set_up'));
    $rt = mm_rate_take(mm_rate_file(__DIR__), array(array('shk:' . mm_ip_key(), 60)));
    if ($rt !== true) sho(array('ok' => false, 'error' => $rt === 'busy' ? 'busy' : 'rate'));
    list($state, $info) = shop_capture($cr, (string)($in['order'] ?? ''));
    if ($state === 'sold' || $state === 'pending') {
        if (!defined('RV_LIB')) define('RV_LIB', 1);
        require_once __DIR__ . '/pcm-review.php';   // the website's own email sender (info@) - top-level scope on purpose (its globals)
        require_once __DIR__ . '/shop-books-lib.php';
        shop_after_sale($state, $info);   // the email, Slack, the answer, then QuickBooks (shop-lib.php) - exits
    }
    if ($state === 'had') sho(array('ok' => true, 'state' => 'had', 'email' => (string)($info['email'] ?? '')));
    if ($state === 'refused' || $state === 'busy') shop_log("capture\t" . $state . "\t" . (is_string($info) ? $info : ''));
    sho(array('ok' => false, 'state' => $state, 'note' => is_string($info) ? $info : ''));
}

if ($do === 'card') {
    $sc = st_creds();
    if (!$sc) sho(array('ok' => false, 'error' => 'not_set_up'));
    $rt = mm_rate_take(mm_rate_file(__DIR__), array(array('shc:' . mm_ip_key(), 30), array('shc', 500)));
    if ($rt !== true) sho(array('ok' => false, 'error' => $rt === 'busy' ? 'busy' : 'rate'));
    list($ok, $res) = shop_card_start($sc, $unit, $holder);
    sho($ok ? array('ok' => true, 'id' => $res['id'], 'url' => $res['url']) : array('ok' => false, 'error' => $res));
}

if ($do === 'carddone') {
    $sc = st_creds();
    if (!$sc) sho(array('ok' => false, 'error' => 'not_set_up'));
    $rt = mm_rate_take(mm_rate_file(__DIR__), array(array('shk:' . mm_ip_key(), 60)));
    if ($rt !== true) sho(array('ok' => false, 'error' => $rt === 'busy' ? 'busy' : 'rate'));
    list($state, $info, $new) = shop_card_done($sc, (string)($in['session'] ?? ''));
    if ($state === 'sold') {
        if (!defined('RV_LIB')) define('RV_LIB', 1);
        require_once __DIR__ . '/pcm-review.php';   // top-level scope on purpose (its globals)
        require_once __DIR__ . '/shop-books-lib.php';
        shop_after_sale($state, $info);   // exits
    }
    if ($state === 'had') sho(array('ok' => true, 'state' => 'had', 'email' => (string)($info['email'] ?? ''), 'prov' => 'card'));
    if ($state === 'clash') { if ($new) shop_clash_alert($info); sho(array('ok' => false, 'state' => 'clash', 'email' => (string)($info['email'] ?? ''))); }
    if ($state === 'refused' || $state === 'busy') shop_log("carddone\t" . $state . "\t" . (is_string($info) ? $info : ''));
    sho(array('ok' => false, 'state' => $state, 'note' => is_string($info) ? $info : ''));
}

if ($do === 'release') {
    $oid = (string)($in['order'] ?? '');
    $ok = shop_release($oid, $holder);
    // a card page left behind: close it at Stripe too, so an old tab can't be paid later
    if ($ok && st_session_id($oid) !== '' && ($sc = st_creds())) st_api($sc, 'POST', '/v1/checkout/sessions/' . $oid . '/expire');
    sho(array('ok' => $ok));
}

sho(array('ok' => false, 'error' => 'bad_action'), 400);
