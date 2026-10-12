<?php
/*
 * "Unlock everything" through FastSpring (12 Oct 2026). Owner: "I'm logged into FastSpring now ... take it over and do it".
 *
 * FastSpring is a MERCHANT OF RECORD: it is the seller on every order, charges and pays the VAT / sales tax wherever the buyer
 * is, and pays us the rest. So it can sell where we cannot sell as the seller ourselves - the EU and everywhere else outside
 * PayPal's countries (pcm-buy-config.php $PP_COUNTRIES, pcm-plus-pp-lib.php). The UK is never sold to (plans instead), nor
 * PLUS_NO_SALE's countries.
 *
 * The flow: the app's Buy button opens https://365techies.co.uk/pc-manager-buy/?install=<id>. That page asks
 * api/pcm-plus-pp.php for the price; for a FastSpring country it answers via 'fastspring' with the popup storefront and the
 * product, and the page opens FastSpring's own checkout (its Store Builder script), tagged with the install. FastSpring then
 * POSTs its webhook to api/pcm-plus-fs.php: order.completed -> a key (plus_issue_for_order, one per order) emailed from info@,
 * and kept for 3 hours (FS_RECENT) so the buy page can show it when the popup closes. return.created (a full refund) and
 * chargeback.created switch the key off.
 *
 * Genuine webhooks only: X-FS-Signature = base64 HMAC-SHA256 of the RAW body with the secret the OWNER typed into FastSpring
 * (Developer Tools > Webhooks) and into the server-only file api/pcm-fs-secret.php:   $FS_WEBHOOK_SECRET = '...';
 * (never in git, .htaccess-denied, never typed by Claude). No file -> 503, so FastSpring keeps retrying and nothing is lost.
 *
 * Test orders (FastSpring's test storefront, card 4242...) make TEST keys that last FS_TEST_DAYS only - the test storefront is
 * public, so a key from it must not be worth having. Once the storefront in pcm-buy-config.php is LIVE, test orders make none.
 * Include-only (.htaccess denies it as a URL). NO closing tag in this file.
 */
require_once __DIR__ . '/pcm-plus-lib.php';

if (!defined('FS_DIR'))     define('FS_DIR', __DIR__);
if (!defined('FS_SECRETF')) define('FS_SECRETF', FS_DIR . '/pcm-fs-secret.php');
if (!defined('FS_LOG'))     define('FS_LOG', FS_DIR . '/pcm-plus-fs.log');
if (!defined('FS_RECENT'))  define('FS_RECENT', FS_DIR . '/pcm-plus-fs-recent.json');
define('FS_TEST_DAYS', 2);
define('FS_SHOW_SECS', 3 * 3600);   // the buy page may show a new key for this long after the order

function fs_secret($file = null) {
    $src = preg_replace('/^\xEF\xBB\xBF/', '', (string)@file_get_contents($file !== null ? $file : FS_SECRETF));
    return preg_match('/(?:^|;|<\?php)[ \t]*\$FS_WEBHOOK_SECRET\s*=\s*([\'"])([^\'"]+)\1\s*;/m', $src, $m) ? $m[2] : '';
}
function fs_signed($raw, $sig, $secret) {
    if ((string)$secret === '' || trim((string)$sig) === '') return false;
    return hash_equals(base64_encode(hash_hmac('sha256', (string)$raw, (string)$secret, true)), trim((string)$sig));
}
function fs_log($m) {
    $lines = @file(FS_LOG, FILE_IGNORE_NEW_LINES); $lines = is_array($lines) ? array_slice($lines, -299) : array();
    $lines[] = gmdate('Y-m-d H:i:s') . "\t" . str_replace(array("\t", "\n"), ' ', (string)$m);
    @file_put_contents(FS_LOG, implode("\n", $lines) . "\n", LOCK_EX);
}
function fs_mode($config = null) { return plus_fs_mode(plus_config($config)); }

/* Can this country buy through FastSpring now, and at what price? -> {ok, reason, product, storefront, mode, usd, local, line}
   reason: not_set_up | off | uk | no_sale | paypal (one of PayPal's countries) */
function fs_offer($country, $config = null, $off = null) {
    $cfg = plus_config($config);
    $mode = plus_fs_mode($cfg);
    if ($mode === '') return array('ok' => false, 'reason' => 'not_set_up');
    if ($mode === 'live' && !plus_enabled($off, $config)) return array('ok' => false, 'reason' => 'off');
    $c = strtoupper(trim((string)$country));
    if ($c === '' || in_array($c, array('GB', 'IM', 'JE', 'GG'), true)) return array('ok' => false, 'reason' => 'uk');
    if (plus_no_sale($c)) return array('ok' => false, 'reason' => 'no_sale');
    if (in_array($c, $cfg['pp_countries'], true)) return array('ok' => false, 'reason' => 'paypal');
    $low = plus_low_price($c) && $cfg['fs_product_low'] !== '' && $cfg['low_usd'] !== '' && $cfg['low_price'] !== '';
    $usd = $low ? $cfg['low_usd'] : $cfg['usd'];
    if ($usd === '') return array('ok' => false, 'reason' => 'not_set_up');
    $local = plus_local_amount($c, (float)$usd);
    return array('ok' => true, 'reason' => '', 'product' => $low ? $cfg['fs_product_low'] : $cfg['fs_product'], 'storefront' => $cfg['fs_storefront'],
        'mode' => $mode, 'usd' => number_format((float)$usd, 2, '.', ''), 'local' => $local,
        'line' => $local !== '' ? plus_price_line($usd, $local, $low ? $cfg['low_price'] : $cfg['price']) : ($low ? $cfg['low_price'] : $cfg['price']));
}

/* ---- the key the buy page may show (3 hours) ------------------------------------------------------------------------- */
function fs_recent_put($ids, $key, $email, $now = null) {
    $now = $now === null ? time() : (int)$now;
    $lk = @fopen(FS_RECENT . '.lock', 'c'); if (!$lk) return false;
    @flock($lk, LOCK_EX);
    $d = @json_decode((string)@file_get_contents(FS_RECENT), true); if (!is_array($d)) $d = array();
    foreach ($d as $k => $v) if (!is_array($v) || (int)($v['at'] ?? 0) < $now - FS_SHOW_SECS) unset($d[$k]);
    foreach ((array)$ids as $id) { $id = (string)$id; if ($id !== '') $d[$id] = array('k' => (string)$key, 'e' => (string)$email, 'at' => $now); }
    $ok = @file_put_contents(FS_RECENT, json_encode($d, JSON_UNESCAPED_SLASHES)) !== false;
    @flock($lk, LOCK_UN); fclose($lk);
    return $ok;
}
function fs_recent_get($id, $now = null) {
    $now = $now === null ? time() : (int)$now; $id = (string)$id;
    if ($id === '' || !preg_match('/^[A-Za-z0-9_-]{6,60}$/', $id)) return null;
    $d = @json_decode((string)@file_get_contents(FS_RECENT), true);
    if (!is_array($d) || !isset($d[$id]) || (int)($d[$id]['at'] ?? 0) < $now - FS_SHOW_SECS) return null;
    return array((string)$d[$id]['k'], (string)$d[$id]['e']);
}

/* ---- the webhook --------------------------------------------------------------------------------------------------- */
// FastSpring posts {"events":[{id, type, live, processed, created, data:{...}}, ...]} - one post may carry several
function fs_events($raw) {
    $j = json_decode((string)$raw, true);
    if (!is_array($j)) return array();
    if (isset($j['events']) && is_array($j['events'])) return array_values(array_filter($j['events'], 'is_array'));
    return isset($j['type']) ? array($j) : array();
}
function fs_tags($t) {
    if (is_string($t)) { $d = json_decode($t, true); $t = is_array($d) ? $d : array(); }
    return is_array($t) ? $t : array();
}
function fs_order_event($data, $live, $mail, $now, $file = null, $config = null) {
    $cfg = plus_config($config);
    $ours = array_filter(array($cfg['fs_product'], $cfg['fs_product_low']));
    $mine = false;
    foreach ((array)($data['items'] ?? array()) as $it) if (is_array($it) && in_array(strtolower((string)($it['product'] ?? '')), $ours, true)) $mine = true;
    if (!$mine) return array(200, 'not our product');
    if (!$live && plus_fs_mode($cfg) === 'live') return array(200, 'a TEST order while the checkout is live - no key');
    $oid = (string)($data['id'] ?? ($data['order'] ?? '')); $ref = (string)($data['reference'] ?? '');
    if (!preg_match('/^[A-Za-z0-9_-]{6,60}$/', $oid)) return array(200, 'order with no id');
    $email = '';
    foreach (array($data['customer']['email'] ?? '', $data['account']['contact']['email'] ?? '', $data['recipients'][0]['recipient']['email'] ?? '') as $e) if ($email === '' && filter_var(trim((string)$e), FILTER_VALIDATE_EMAIL)) $email = trim((string)$e);
    if ($email === '') return array(200, 'order ' . $ref . ' has no email - make a key by hand');
    $tags = fs_tags($data['tags'] ?? array());
    $cur = preg_replace('/[^A-Z]/', '', (string)($data['currency'] ?? '')); $tot = isset($data['total']) ? number_format((float)$data['total'], 2, '.', '') : '';
    $note = 'FastSpring ' . substr(preg_replace('/[^A-Za-z0-9-]/', '', $ref), 0, 40) . ($live ? '' : ' (TEST)') . ($cur !== '' && $tot !== '' ? ' ' . $cur . ' ' . $tot : '')
        . (isset($data['address']['country']) ? ' ' . preg_replace('/[^A-Z]/', '', strtoupper((string)$data['address']['country'])) : '');
    $r = plus_issue_for_order($email, 1, 'fastspring', $oid, $note, array('install' => $tags['install'] ?? '', 'test' => !$live), $now, $file);
    if ($r === null) return array(500, 'could not store the key - try again');
    if (!$r[2]) return array(200, 'order already has its key');
    if (!$live) plus_set_expires($r[1], $now + FS_TEST_DAYS * 86400, $file);   // a test key is worth nothing after two days
    fs_recent_put(array($oid, $ref), $r[0], strtolower($email), $now);
    $d = plus_load($file); $exp = 0; foreach (($d ? $d['keys'] : array()) as $e) if ($e['id'] === $r[1]) $exp = (int)$e['expires'];
    $sent = (bool)call_user_func($mail, strtolower($email), $r[0], $exp);
    return array(200, 'key ' . $r[1] . ' made' . ($live ? '' : ' (TEST, 2 days)') . ($sent ? ' and emailed' : ' - EMAIL FAILED: send a new key from the card'));
}
function fs_return_event($data, $file = null) {
    $oid = (string)($data['original']['id'] ?? ($data['original']['order'] ?? ''));
    $id = $oid !== '' ? plus_find_order('fastspring', $oid, $file) : '';
    if ($id === '') return array(200, 'refund for an order with no key');
    $full = strtoupper((string)($data['type'] ?? '')) === 'CHARGEBACK';
    foreach ((array)($data['items'] ?? array()) as $it) if (is_array($it) && stripos((string)($it['refundType'] ?? ''), 'full') !== false) $full = true;
    if (isset($data['totalReturn'], $data['original']['total']) && (float)$data['totalReturn'] + 0.005 >= (float)$data['original']['total'] && (float)$data['original']['total'] > 0) $full = true;
    if (!$full) return array(200, 'partial refund - key kept');
    plus_set_status($id, 'revoked', $file);
    return array(200, 'key ' . $id . ' switched off (refunded)');
}
function fs_chargeback_event($data, $file = null) {
    $oid = '';
    foreach (array($data['order']['id'] ?? null, $data['order'] ?? null, $data['original']['id'] ?? null, $data['orderId'] ?? null) as $v) if ($oid === '' && is_string($v) && preg_match('/^[A-Za-z0-9_-]{6,60}$/', $v)) $oid = $v;
    $id = $oid !== '' ? plus_find_order('fastspring', $oid, $file) : '';
    if ($id === '') return array(200, 'chargeback - no key found for it (check the order in FastSpring)');
    plus_set_status($id, 'revoked', $file);
    return array(200, 'key ' . $id . ' switched off (chargeback)');
}
/* -> array(http code, what happened). Anything but 200 makes FastSpring send the whole post again, so every step above is
   safe to repeat (one key per order). */
function fs_handle($raw, $sig, $secret, $mail, $now = null, $file = null, $config = null) {
    $now = $now === null ? time() : (int)$now;
    if ($secret === '') return array(503, 'no signing secret on the server yet');
    if (!fs_signed($raw, $sig, $secret)) return array(401, 'bad signature');
    $evs = fs_events($raw);
    if (!$evs) return array(200, 'no events');
    $code = 200; $notes = array();
    foreach ($evs as $ev) {
        $type = (string)($ev['type'] ?? ''); $data = isset($ev['data']) && is_array($ev['data']) ? $ev['data'] : array();
        $live = isset($ev['live']) ? (bool)$ev['live'] : !empty($data['live']);
        if ($type === 'order.completed') $r = fs_order_event($data, $live, $mail, $now, $file, $config);
        elseif ($type === 'return.created') $r = fs_return_event($data, $file);
        elseif ($type === 'chargeback.created') $r = fs_chargeback_event($data, $file);
        else $r = array(200, 'event ' . substr(preg_replace('/[^a-z.]/', '', $type), 0, 40) . ' - nothing to do');
        if ($r[0] !== 200) $code = $r[0];
        $notes[] = substr(preg_replace('/[^a-z.]/', '', $type), 0, 30) . ': ' . $r[1];
    }
    return array($code, implode('; ', $notes));
}
