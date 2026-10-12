<?php
/*
 * "Unlock everything" through PayPal (12 Oct 2026) - how it works and the rules: api/pcm-plus-pp-lib.php.
 *
 * Our buy page (/pc-manager-buy/?install=<id>):
 *   {do: 'config', install}  -> {ok, available, reason, usd, line, client_id, env}   (the price for the install's country)
 *   {do: 'create', install}  -> {ok, id}     a PayPal order at OUR price (PayPal's buttons call this)
 *   {do: 'capture', order}   -> {ok, state, key, email, note}   take the payment, make the key, email it
 * PayPal's webhook (a POST carrying PayPal-Transmission-* headers): genuine only when PayPal's own verify call says so;
 *   PAYMENT.CAPTURE.COMPLETED -> the key, if the page did not already make it; .REFUNDED (in full) / .REVERSED -> switched off.
 * Each webhook delivery and failure adds a line to api/pcm-plus-pp.log (denied, gitignored; the last 300) - never a key.
 * NO closing tag in this file.
 */
error_reporting(0);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') { http_response_code(405); echo '{"ok":false,"error":"post"}'; exit; }
$raw = (string)file_get_contents('php://input', false, null, 0, 200000);
require_once __DIR__ . '/pcm-plus-pp-lib.php';
require_once __DIR__ . '/pcm-mailmove-lib.php';   // mm_rate_take, mm_ip_key

function ppo($a, $code = 200) { http_response_code($code); echo json_encode($a, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE); exit; }
$h = array();
foreach ($_SERVER as $k => $v) if (strpos($k, 'HTTP_') === 0) $h[strtolower(str_replace('_', '-', substr($k, 5)))] = (string)$v;

// ---- PayPal's webhook ----
if (isset($h['paypal-transmission-id'])) {
    $cr = pp_creds();
    if (!$cr || $cr['webhook'] === '') { pp_log("503\twebhook before the keys file has a webhook id"); ppo(array('ok' => false), 503); }
    if (!pp_verify($cr, $raw, $h)) { pp_log("401\twebhook not verified by PayPal"); ppo(array('ok' => false), 401); }
    if (!defined('RV_LIB')) define('RV_LIB', 1);
    require_once __DIR__ . '/pcm-review.php';   // the website's own email sender (info@) - top-level scope on purpose (its globals)
    list($code, $why) = pp_event($cr, $raw, 'plus_send_key');
    $ev = json_decode($raw, true);
    pp_log($code . "\t" . substr(preg_replace('/[^A-Z._]/', '', (string)($ev['event_type'] ?? '-')), 0, 40) . "\t" . $why);
    ppo(array('ok' => $code === 200, 'note' => $why), $code);
}

// ---- our buy page ----
$in = json_decode($raw, true);
if (!is_array($in)) ppo(array('ok' => false, 'error' => 'bad_request'), 400);
$do = preg_replace('/[^a-z]/', '', (string)($in['do'] ?? ''));
$ip = (string)($_SERVER['REMOTE_ADDR'] ?? '');
$install = preg_replace('/[^a-f0-9]/', '', strtolower(substr((string)($in['install'] ?? ''), 0, 32)));

if ($do === 'config' || $do === 'create') {
    $country = pp_country_of($install, $ip);
    // TESTING from the UK: the buy page passes ?cc=US through as test_cc. Honoured ONLY with sandbox keys (no real money);
    // with live keys it is ignored, so a real buyer is always priced by their own PC's country.
    $tcc = strtoupper(preg_replace('/[^A-Za-z]/', '', substr((string)($in['test_cc'] ?? ''), 0, 2)));
    $tcr = $tcc !== '' ? pp_creds() : null;
    if (strlen($tcc) === 2 && $tcr && $tcr['env'] === 'sandbox') $country = $tcc;
    $offer = pp_offer($country);
    if ($do === 'config') {
        $cr = pp_creds();
        ppo(array('ok' => true, 'available' => $offer['ok'], 'reason' => $offer['reason'], 'country' => $country,
            'usd' => $offer['usd'] ?? '', 'line' => $offer['line'] ?? '', 'local' => $offer['local'] ?? '',
            'client_id' => $offer['ok'] && $cr ? $cr['id'] : '', 'env' => $offer['ok'] && $cr ? $cr['env'] : ''));
    }
    if (!$offer['ok']) ppo(array('ok' => false, 'error' => $offer['reason']));
    $rt = mm_rate_take(mm_rate_file(__DIR__), array(array('ppc:' . mm_ip_key(), 30), array('ppc', 500)));
    if ($rt !== true) ppo(array('ok' => false, 'error' => $rt === 'busy' ? 'busy' : 'rate'));
    list($ok, $res) = pp_create(pp_creds(), $install, $offer);
    ppo($ok ? array('ok' => true, 'id' => $res) : array('ok' => false, 'error' => $res));
}

if ($do === 'capture') {
    $cr = pp_creds();
    if (!$cr) ppo(array('ok' => false, 'error' => 'not_set_up'));
    $rt = mm_rate_take(mm_rate_file(__DIR__), array(array('ppk:' . mm_ip_key(), 60)));
    if ($rt !== true) ppo(array('ok' => false, 'error' => $rt === 'busy' ? 'busy' : 'rate'));
    if (!defined('RV_LIB')) define('RV_LIB', 1);
    require_once __DIR__ . '/pcm-review.php';
    list($state, $key, $email, $note) = pp_capture($cr, (string)($in['order'] ?? ''), 'plus_send_key');
    if ($state === 'refused') pp_log("capture\trefused\t" . $note);
    ppo(array('ok' => in_array($state, array('made', 'had', 'pending'), true), 'state' => $state, 'key' => $key, 'email' => $email, 'note' => $note));
}

ppo(array('ok' => false, 'error' => 'bad_action'), 400);
