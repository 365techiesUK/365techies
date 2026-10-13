<?php
/*
 * "Unlock everything" through PayPal (12 Oct 2026). Owner, after Lemon Squeezy declined the store: "help me set it all up"
 * with FastSpring and PayPal. FastSpring (a merchant of record) is applied for; PayPal is the plan we can run ourselves:
 *
 *   365 Techies Ltd is the SELLER (PayPal only takes the payment), so we sell only where a small seller has no tax to
 *   register for: pcm-buy-config.php $PP_COUNTRIES (US, Canada, Australia, New Zealand, Norway, Japan, Singapore, Hong Kong
 *   to start - each has a threshold far above our sales; the EU taxes a non-EU seller's software from the FIRST sale, so it is
 *   left out until FastSpring, or until the accountant registers us for the EU's one-stop shop).
 *
 * The flow: the app's Buy button opens https://365techies.co.uk/pc-manager-buy/?install=<id> (pcm-buy-config $BUY_URL). That
 * page asks api/pcm-plus-pp.php for the price (by the install's country), shows PayPal's own buttons, and on approval our
 * server captures the payment, makes the key (pcm-plus-lib.php plus_issue_for_order, one per capture) and emails it.
 * PayPal's webhook is the safety net (a capture that completes later) and switches a key off on a full refund or a reversal.
 *
 * Only orders OUR server created can make a key (pcm-plus-pp-orders.json): PayPal's client id is public, so a buyer could
 * make their own one-cent order in the browser - it would be refused.
 *
 * Server-only file, made by the owner (never in git, .htaccess-denied): api/pcm-paypal-key.php
 *   $PP_CLIENT_ID = '...';   $PP_SECRET = '...';   $PP_WEBHOOK_ID = '...';   $PP_ENV = 'sandbox';   (or 'live')
 * Include-only (.htaccess denies it as a URL). NO closing tag in this file.
 */
require_once __DIR__ . '/pcm-plus-lib.php';

if (!defined('PP_DIR'))    define('PP_DIR', __DIR__);
if (!defined('PP_KEYF'))   define('PP_KEYF', PP_DIR . '/pcm-paypal-key.php');
if (!defined('PP_TOKF'))   define('PP_TOKF', PP_DIR . '/pcm-paypal-token.json');
if (!defined('PP_ORDERS')) define('PP_ORDERS', PP_DIR . '/pcm-plus-pp-orders.json');
if (!defined('PP_LOG'))    define('PP_LOG', PP_DIR . '/pcm-plus-pp.log');
define('PP_DESC', '365 PC Manager - Unlock everything: 12 months, up to 3 PCs, does not renew');

/* ---- the keys file and where PayPal is ---------------------------------------------------------------------------- */
function pp_creds($file = null) {
    $src = (string)@file_get_contents($file !== null ? $file : PP_KEYF);
    // a setting at the start of a line, after "<?php" or after another setting's ";" - so the owner's file may be one line or many
    $g = function ($n) use ($src) { return preg_match('/(?:^|;|<\?php)[ \t]*\$' . $n . '\s*=\s*([\'"])([^\'"]+)\1\s*;/m', preg_replace('/^\xEF\xBB\xBF/', '', $src), $m) ? $m[2] : ''; };
    $c = array('id' => $g('PP_CLIENT_ID'), 'secret' => $g('PP_SECRET'), 'webhook' => $g('PP_WEBHOOK_ID'), 'env' => strtolower($g('PP_ENV')) === 'live' ? 'live' : 'sandbox');
    return ($c['id'] !== '' && $c['secret'] !== '') ? $c : null;
}
function pp_base($env) {
    $t = (PHP_SAPI === 'cli' || PHP_SAPI === 'cli-server') ? (string)getenv('PCM_FAKE_PAYPAL') : '';   // tests only, never live
    if ($t !== '') return rtrim($t, '/');
    return $env === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
}
function pp_log($m) {
    $lines = @file(PP_LOG, FILE_IGNORE_NEW_LINES); $lines = is_array($lines) ? array_slice($lines, -299) : array();
    $lines[] = gmdate('Y-m-d H:i:s') . "\t" . str_replace(array("\t", "\n"), ' ', (string)$m);
    @file_put_contents(PP_LOG, implode("\n", $lines) . "\n", LOCK_EX);
}

/* ---- who may buy, and for how much --------------------------------------------------------------------------------- */
function pp_countries($config = null) { return plus_config($config)['pp_countries']; }
/* The install's country: what its own check-ins recorded (pcm-installs.json), else the asking address's. */
function pp_country_of($install, $ip, $instFile = null) {
    $install = preg_replace('/[^a-f0-9]/', '', strtolower((string)$install));
    if (strlen($install) === 16) {
        $d = @json_decode((string)@file_get_contents($instFile !== null ? $instFile : PP_DIR . '/pcm-installs.json'), true);
        if (is_array($d) && isset($d['m'][$install]['c']) && preg_match('/^[A-Z]{2}$/', (string)$d['m'][$install]['c'])) return (string)$d['m'][$install]['c'];
    }
    return strtoupper((string)geo_cc((string)$ip));
}
/* Can this country buy through PayPal now, and at what price? -> {ok, reason, usd, line}. reason: off | not_set_up | uk |
   no_sale | not_here. Sales are on when Buy is switched on, or while the keys file says sandbox (testing with PayPal's
   pretend money). */
function pp_offer($country, $config = null, $creds = 'auto', $off = null) {
    $c = strtoupper(trim((string)$country));
    $cfg = plus_config($config);
    $cr = $creds === 'auto' ? pp_creds() : $creds;
    if ($cfg['provider'] !== 'paypal' || !$cr) return array('ok' => false, 'reason' => 'not_set_up');
    $on = $cr['env'] === 'sandbox' || plus_enabled($off, $config);
    if (!$on) return array('ok' => false, 'reason' => 'off');
    // 13 Oct 2026: the UK key, in pounds, once pcm-buy-config.php $BUY_UK is 'page' or 'on' (otherwise: our plans, as before)
    if (plus_is_uk($c) && plus_uk_sells($cfg))
        return array('ok' => true, 'reason' => '', 'uk' => true, 'currency' => 'GBP', 'amount' => number_format((float)$cfg['uk_gbp'], 2, '.', ''),
            'usd' => '', 'local' => '', 'env' => $cr['env'], 'line' => $cfg['uk_price']);
    if ($c === '' || plus_is_uk($c)) return array('ok' => false, 'reason' => 'uk');
    if (plus_no_sale($c)) return array('ok' => false, 'reason' => 'no_sale');
    if (!in_array($c, pp_countries($config), true)) return array('ok' => false, 'reason' => 'not_here');
    $low = plus_low_price($c) && $cfg['low_usd'] !== '' && $cfg['low_price'] !== '';
    $usd = $low ? $cfg['low_usd'] : $cfg['usd'];
    if ($usd === '') return array('ok' => false, 'reason' => 'not_set_up');
    $local = plus_local_amount($c, (float)$usd);
    return array('ok' => true, 'reason' => '', 'currency' => 'USD', 'amount' => number_format((float)$usd, 2, '.', ''), 'usd' => number_format((float)$usd, 2, '.', ''), 'local' => $local, 'env' => $cr['env'],
        'line' => $local !== '' ? plus_price_line($usd, $local, $low ? $cfg['low_price'] : $cfg['price']) : ($low ? $cfg['low_price'] : $cfg['price']));
}

/* ---- talking to PayPal --------------------------------------------------------------------------------------------- */
function pp_http($method, $url, $headers, $body = null, $timeout = 20) {
    if (!function_exists('curl_init')) return array(0, null, '');
    $ch = curl_init($url);
    $opt = array(CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => $timeout, CURLOPT_CONNECTTIMEOUT => 6, CURLOPT_CUSTOMREQUEST => $method, CURLOPT_HTTPHEADER => $headers);
    if ($body !== null) $opt[CURLOPT_POSTFIELDS] = $body;
    curl_setopt_array($ch, $opt);
    $r = curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE); curl_close($ch);
    return array($code, json_decode((string)$r, true), (string)$r);
}
function pp_token($cr, $fresh = false) {
    $c = @json_decode((string)@file_get_contents(PP_TOKF), true);
    if (!$fresh && is_array($c) && ($c['env'] ?? '') === $cr['env'] && ($c['for'] ?? '') === substr(hash('sha256', $cr['id']), 0, 12) && (int)($c['exp'] ?? 0) > time() + 300) return (string)$c['t'];
    list($code, $j) = pp_http('POST', pp_base($cr['env']) . '/v1/oauth2/token',
        array('Authorization: Basic ' . base64_encode($cr['id'] . ':' . $cr['secret']), 'Content-Type: application/x-www-form-urlencoded', 'Accept: application/json'),
        'grant_type=client_credentials');
    $t = (string)($j['access_token'] ?? '');
    if ($code !== 200 || $t === '') { pp_log('token FAILED http ' . $code); return ''; }
    @file_put_contents(PP_TOKF, json_encode(array('t' => $t, 'env' => $cr['env'], 'for' => substr(hash('sha256', $cr['id']), 0, 12), 'exp' => time() + max(600, (int)($j['expires_in'] ?? 3600)))), LOCK_EX);
    return $t;
}
/* One call to PayPal's REST API. $body: an array (sent as JSON) or a JSON string as it is. -> array(code, decoded). */
function pp_api($cr, $method, $path, $body = null, $extraHeaders = array()) {
    $t = pp_token($cr);
    if ($t === '') return array(0, null);
    $h = array_merge(array('Authorization: Bearer ' . $t, 'Accept: application/json', 'Content-Type: application/json'), $extraHeaders);
    $b = $body === null ? null : (is_string($body) ? $body : json_encode($body, JSON_UNESCAPED_SLASHES));
    list($c, $j) = pp_http($method, pp_base($cr['env']) . $path, $h, $b);
    if ($c === 401) {   // a token PayPal no longer honours: one fresh try
        $t = pp_token($cr, true);
        if ($t === '') return array(401, $j);
        $h[0] = 'Authorization: Bearer ' . $t;
        list($c, $j) = pp_http($method, pp_base($cr['env']) . $path, $h, $b);
    }
    return array($c, $j);
}
function pp_why($j) {
    if (!is_array($j)) return '';
    $s = (string)($j['message'] ?? ($j['error_description'] ?? ''));
    if (isset($j['details'][0]['issue'])) $s .= ' (' . $j['details'][0]['issue'] . ')';
    return substr(preg_replace('/[^\x20-\x7E]/', '', $s), 0, 200);
}

/* ---- the orders WE made (only these can become a key) --------------------------------------------------------------- */
function pp_orders_locked($fn) {
    $lk = @fopen(PP_ORDERS . '.lock', 'c');
    if (!$lk || !@flock($lk, LOCK_EX)) { if ($lk) fclose($lk); return false; }
    $d = @json_decode((string)@file_get_contents(PP_ORDERS), true);
    if (!is_array($d)) $d = array();
    $now = time();
    // kept 30 days: a payment PayPal is still checking (an eCheck) can complete days later, and only a known order makes a key
    foreach ($d as $k => $o) if ((int)($o['at'] ?? 0) < $now - 30 * 86400) unset($d[$k]);
    $res = $fn($d);
    if ($res !== false) { $tmp = PP_ORDERS . '.' . getmypid() . '.tmp'; if (@file_put_contents($tmp, json_encode($d)) !== false) @rename($tmp, PP_ORDERS); }
    flock($lk, LOCK_UN); fclose($lk);
    return $res;
}
function pp_order_known($id) {
    $id = (string)$id; $hit = null;
    pp_orders_locked(function (&$d) use ($id, &$hit) { if (isset($d[$id])) $hit = $d[$id]; return false; });
    return $hit;
}

/* Create the PayPal order for this install at the server's price. -> array(ok, order id or error) */
function pp_create($cr, $install, $offer) {
    $install = preg_replace('/[^a-f0-9]/', '', strtolower((string)$install));
    // 13 Oct 2026: pounds for the UK key, US dollars everywhere else (an offer from before then has only 'usd')
    $cur = (($offer['currency'] ?? 'USD') === 'GBP') ? 'GBP' : 'USD';
    $amt = (string)($offer['amount'] ?? $offer['usd']);
    $body = array('intent' => 'CAPTURE',
        'purchase_units' => array(array('reference_id' => 'unlock', 'custom_id' => $install !== '' ? $install : 'web',
            'invoice_id' => 'PCM-' . gmdate('ymd') . '-' . strtoupper(bin2hex(random_bytes(4))), 'description' => PP_DESC,
            'amount' => array('currency_code' => $cur, 'value' => $amt))),
        'application_context' => array('brand_name' => '365 Techies', 'shipping_preference' => 'NO_SHIPPING', 'user_action' => 'PAY_NOW'));
    list($c, $j) = pp_api($cr, 'POST', '/v2/checkout/orders', $body, array('PayPal-Request-Id: pcm-' . bin2hex(random_bytes(8))));
    $id = (string)($j['id'] ?? '');
    if (($c !== 200 && $c !== 201) || !preg_match('/^[A-Z0-9]{10,30}$/', $id)) { pp_log('create FAILED http ' . $c . ' ' . pp_why($j)); return array(false, 'paypal_failed'); }
    // (orders made before 13 Oct 2026 carry only 'usd'; pp_keep reads either)
    pp_orders_locked(function (&$d) use ($id, $install, $cur, $amt) { $d[$id] = array('at' => time(), 'install' => $install, 'cur' => $cur, 'amt' => $amt) + ($cur === 'USD' ? array('usd' => $amt) : array()); return true; });
    return array(true, $id);
}

/* A completed capture of one of OUR orders -> its key (one per capture: the browser and the webhook can both arrive). $mail:
   function($to, $key, $expires). -> array(state, key or '', email, note). state: made | had | pending | refused | busy. */
function pp_keep($cr, $capture, $orderId, $email, $mail) {
    $known = pp_order_known($orderId);
    if ($known === null) return array('refused', '', '', 'not an order we made');
    $cid = (string)($capture['id'] ?? '');
    $st = strtoupper((string)($capture['status'] ?? ''));
    $amt = (string)($capture['amount']['value'] ?? ''); $cur = (string)($capture['amount']['currency_code'] ?? '');
    if ($cid === '') return array('refused', '', '', 'no capture id');
    $wantCur = (string)($known['cur'] ?? 'USD'); $wantAmt = (string)($known['amt'] ?? ($known['usd'] ?? ''));
    if ($cur !== $wantCur || $wantAmt === '' || abs((float)$amt - (float)$wantAmt) > 0.001) return array('refused', '', '', 'amount ' . $cur . ' ' . $amt . ' is not the ' . $wantCur . ' ' . $wantAmt . ' we asked for');
    if ($st === 'PENDING') return array('pending', '', '', 'PayPal is still checking the payment');
    if ($st !== 'COMPLETED') return array('refused', '', '', 'capture ' . strtolower($st));
    $email = strtolower(trim((string)$email));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) return array('busy', '', '', 'no payer email yet');
    $note = 'PayPal order ' . $orderId . ($cr['env'] === 'sandbox' ? ' (TEST)' : '') . ' ' . $cur . ' ' . $amt;
    $r = plus_issue_for_order($email, 1, 'paypal', $cid, $note, array('install' => $known['install'], 'test' => $cr['env'] === 'sandbox', 'uk' => $cur === 'GBP'));
    if ($r === null) return array('busy', '', $email, 'could not store the key');
    if (!$r[2]) return array('had', '', $email, 'capture already has its key');
    $d = plus_load(); $exp = 0; foreach (($d ? $d['keys'] : array()) as $e) if ($e['id'] === $r[1]) $exp = (int)$e['expires'];
    $sent = (bool)call_user_func($mail, $email, $r[0], $exp);
    pp_log('key ' . $r[1] . ' made for capture ' . $cid . ($sent ? ' and emailed' : ' - EMAIL FAILED: send a new key from the card'));
    return array('made', $r[0], $email, $sent ? 'emailed' : 'email failed');
}

/* The buyer approved in PayPal's window: capture it now. -> array(state, key, email, note) as pp_keep. */
function pp_capture($cr, $orderId, $mail) {
    $orderId = (string)$orderId;
    if (!preg_match('/^[A-Z0-9]{10,30}$/', $orderId)) return array('refused', '', '', 'bad order id');
    if (pp_order_known($orderId) === null) return array('refused', '', '', 'not an order we made');
    list($c, $j) = pp_api($cr, 'POST', '/v2/checkout/orders/' . $orderId . '/capture', '{}', array('Prefer: return=representation', 'PayPal-Request-Id: pcm-cap-' . $orderId));
    if ($c === 422 && strpos(json_encode($j), 'ORDER_ALREADY_CAPTURED') !== false) list($c, $j) = pp_api($cr, 'GET', '/v2/checkout/orders/' . $orderId);
    if ($c < 200 || $c >= 300) { pp_log('capture FAILED ' . $orderId . ' http ' . $c . ' ' . pp_why($j)); return array('refused', '', '', 'PayPal did not take the payment' . (pp_why($j) !== '' ? ': ' . pp_why($j) : '')); }
    $cap = $j['purchase_units'][0]['payments']['captures'][0] ?? null;
    if (!is_array($cap)) return array('refused', '', '', 'no capture in PayPal\'s answer');
    return pp_keep($cr, $cap, $orderId, (string)($j['payer']['email_address'] ?? ''), $mail);
}

/* ---- PayPal's webhook ----------------------------------------------------------------------------------------------- */
/* Genuine only if PayPal itself says so (POST /v1/notifications/verify-webhook-signature with our webhook id). The event is
   passed back exactly as it came (re-encoding it would change the bytes PayPal signed). $h: the request's headers, lower-case. */
function pp_verify($cr, $raw, $h) {
    if ($cr['webhook'] === '') return false;
    foreach (array('paypal-auth-algo', 'paypal-cert-url', 'paypal-transmission-id', 'paypal-transmission-sig', 'paypal-transmission-time') as $k) if (empty($h[$k])) return false;
    $body = '{"auth_algo":' . json_encode((string)$h['paypal-auth-algo']) . ',"cert_url":' . json_encode((string)$h['paypal-cert-url'])
        . ',"transmission_id":' . json_encode((string)$h['paypal-transmission-id']) . ',"transmission_sig":' . json_encode((string)$h['paypal-transmission-sig'])
        . ',"transmission_time":' . json_encode((string)$h['paypal-transmission-time']) . ',"webhook_id":' . json_encode($cr['webhook'])
        . ',"webhook_event":' . $raw . '}';
    list($c, $j) = pp_api($cr, 'POST', '/v1/notifications/verify-webhook-signature', $body);
    return $c === 200 && strtoupper((string)($j['verification_status'] ?? '')) === 'SUCCESS';
}
/* One genuine event. -> array(http status, short answer for the log) */
function pp_event($cr, $raw, $mail) {
    $ev = json_decode((string)$raw, true);
    if (!is_array($ev) || empty($ev['event_type']) || !isset($ev['resource']) || !is_array($ev['resource'])) return array(200, 'not an event we read');
    $type = (string)$ev['event_type']; $res = $ev['resource'];
    if ($type === 'PAYMENT.CAPTURE.COMPLETED') {
        $orderId = (string)($res['supplementary_data']['related_ids']['order_id'] ?? '');
        if ($orderId === '' || pp_order_known($orderId) === null) return array(200, 'a capture that is not one of our orders');
        list($c, $o) = pp_api($cr, 'GET', '/v2/checkout/orders/' . rawurlencode($orderId));
        if ($c !== 200) return array(503, 'could not read the order - try again');
        $r = pp_keep($cr, $res, $orderId, (string)($o['payer']['email_address'] ?? ''), $mail);
        if ($r[0] === 'busy') return array(503, $r[3] . ' - try again');
        return array(200, $r[0] . ': ' . $r[3]);
    }
    if ($type === 'PAYMENT.CAPTURE.REFUNDED' || $type === 'PAYMENT.CAPTURE.REVERSED') {
        $cid = '';
        if ($type === 'PAYMENT.CAPTURE.REVERSED') $cid = (string)($res['id'] ?? '');
        foreach ((array)($res['links'] ?? array()) as $l) if (($l['rel'] ?? '') === 'up' && preg_match('#/v2/payments/captures/([A-Z0-9]+)#', (string)($l['href'] ?? ''), $m)) $cid = $m[1];
        if ($cid === '') return array(200, 'refund with no capture');
        $id = plus_find_order('paypal', $cid);
        if ($id === '') return array(200, 'refund for a payment with no key');
        if ($type === 'PAYMENT.CAPTURE.REFUNDED') {
            list($c, $cap) = pp_api($cr, 'GET', '/v2/payments/captures/' . rawurlencode($cid));
            if ($c !== 200) return array(503, 'could not read the payment - try again');
            if (strtoupper((string)($cap['status'] ?? '')) !== 'REFUNDED') return array(200, 'partial refund - key kept');
        }
        plus_set_status($id, 'revoked');
        return array(200, 'key ' . $id . ' switched off (' . ($type === 'PAYMENT.CAPTURE.REVERSED' ? 'reversed' : 'refunded') . ')');
    }
    return array(200, 'event ' . $type . ' - nothing to do');
}
