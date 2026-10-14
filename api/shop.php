<?php
/*
 * Refurbished Dells in stock, bought online with PayPal (14 Oct 2026) - how it works and the rules: api/shop-lib.php.
 *
 * The list page and each machine's page (/refurbished-dell-for-sale/, built by shop_pages.py) POST JSON here:
 *   {do: 'stock'}                       -> {ok, units: {id: available|held|sold}}    (the list page greys out what's gone)
 *   {do: 'config', unit}                -> {ok, state, client_id, env, price, delivery, total}   (one machine's page)
 *   {do: 'create', unit, hold}          -> {ok, id}      a PayPal order at the catalogue's price; holds the machine
 *   {do: 'capture', order}              -> {ok, state, note}   take the payment; sold -> Slack card + the buyer's email
 *   {do: 'release', order, hold}        -> {ok}          the buyer closed PayPal's window: the machine is free again
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
    sho(array('ok' => true, 'state' => $st, 'client_id' => $cr ? $cr['id'] : '', 'env' => $cr ? $cr['env'] : '',
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
        $cat = shop_catalogue(); $u = $cat['units'][$info['unit']];
        if (!defined('RV_LIB')) define('RV_LIB', 1);
        require_once __DIR__ . '/pcm-review.php';   // the website's own email sender (info@) - top-level scope on purpose (its globals)
        $mailed = shop_send_email($info, $u, $cat);
        $posted = shop_slack($info, $u);
        shop_log($state . "\t" . $info['unit'] . "\torder " . $info['order'] . "\t" . ($mailed ? 'emailed' : 'EMAIL FAILED') . "\t" . ($posted ? 'slack' : 'SLACK FAILED'));
        // 14 Oct 2026: then the sale goes into QuickBooks (shop-books-lib.php) - AFTER the buyer has their answer, so a slow
        // QuickBooks never keeps them waiting; if it can't go in, the staff portal's shop card says why and offers a retry
        $body = json_encode(array('ok' => true, 'state' => $state, 'email' => $info['email'], 'mailed' => $mailed), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        http_response_code(200); header('Content-Length: ' . strlen($body)); header('Connection: close');
        echo $body;
        if (function_exists('fastcgi_finish_request')) fastcgi_finish_request(); else { @ob_end_flush(); @flush(); }
        ignore_user_abort(true);
        require_once __DIR__ . '/shop-books-lib.php';
        $qr = shop_books_after_sale($info, $u);
        shop_log("quickbooks\t" . $info['unit'] . "\t" . ($qr[0] ? 'ok ' . $qr[1] : 'not yet: ' . $qr[1]));
        exit;
    }
    if ($state === 'had') sho(array('ok' => true, 'state' => 'had', 'email' => (string)($info['email'] ?? '')));
    if ($state === 'refused' || $state === 'busy') shop_log("capture\t" . $state . "\t" . (is_string($info) ? $info : ''));
    sho(array('ok' => false, 'state' => $state, 'note' => is_string($info) ? $info : ''));
}

if ($do === 'release') sho(array('ok' => shop_release((string)($in['order'] ?? ''), $holder)));

sho(array('ok' => false, 'error' => 'bad_action'), 400);
