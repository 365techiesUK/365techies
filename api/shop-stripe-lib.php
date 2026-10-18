<?php
/*
 * Card payments for the refurbished Dells, through Stripe Checkout (18 Oct 2026; owner: "card checkout in the shop" - the
 * 365 Techies Ltd Stripe account). The talking-to-Stripe half; the buying itself is in shop-lib.php (shop_card_start,
 * shop_card_done) beside PayPal's, so a card sale and a PayPal sale are the same record: one Slack card, one email to the
 * buyer, one QuickBooks entry.
 *
 *   - The machine page's "Pay by card" button -> shop.php {do:'card'}: a Checkout Session for the CATALOGUE's price and
 *     delivery (the browser only names the machine), and the machine is held while Stripe's page is open.
 *   - Stripe's page takes the card (Apple Pay / Google Pay too) and a UK delivery address, then sends the buyer back to the
 *     machine page (?paid=cs_...), which asks shop.php {do:'carddone'}: the session is read back FROM STRIPE and only a
 *     paid one, for the right amount, becomes a sale.
 *   - shop-stripe.php is Stripe's webhook: it does the same if the buyer never comes back, and lets an expired page's hold go.
 *
 * Keys - api/shop-stripe-key.php, made on the server by the OWNER, never in git, never typed by Claude (.htaccess-denied):
 *     <?php
 *     $ST_SECRET = 'rk_live_...';  // a RESTRICTED key: Checkout Sessions Write; PaymentIntents, Charges and Balance read (the fee)
 *     $ST_WHSEC  = 'whsec_...';    // the signing secret of the webhook endpoint https://365techies.co.uk/api/shop-stripe.php
 * No key file (or a bad one) -> no card button, nothing else changes. rk_test_/sk_test_ -> env 'test': a [TEST] sale that
 * never goes into QuickBooks.
 *
 * Include-only (.htaccess denies it as a URL). NO closing tag in this file.
 */
// spelled __DIR__ . '/name' on purpose: tools/sweep-store-exposure.sh finds the stores by that pattern and checks each answers 403
if (!defined('ST_KEYFILE')) define('ST_KEYFILE', __DIR__ . '/shop-stripe-key.php');
define('ST_VERSION', '2024-06-20');   // pinned: the session's shipping_details and the payment's latest_charge are where we read them

/* The owner's key file -> array(secret, whsec, env live|test) | null */
function st_creds($file = null) {
    $f = $file !== null ? $file : ST_KEYFILE;
    if (!is_file($f) || !is_readable($f)) return null;
    $ST_SECRET = ''; $ST_WHSEC = '';
    include $f;
    $sk = trim((string)$ST_SECRET);
    if (!preg_match('/^(?:rk|sk)_(live|test)_[A-Za-z0-9]{10,}$/', $sk, $m)) return null;
    $wh = trim((string)$ST_WHSEC);
    return array('secret' => $sk, 'whsec' => preg_match('/^whsec_[A-Za-z0-9]{10,}$/', $wh) ? $wh : '', 'env' => $m[1]);
}

/* Nested arrays -> Stripe's form fields: a[b][0][c]=v */
function st_flat($a, $p = '') {
    $o = array();
    foreach ($a as $k => $v) {
        $kk = $p === '' ? (string)$k : $p . '[' . $k . ']';
        if (is_array($v)) $o += st_flat($v, $kk);
        elseif ($v !== null) $o[$kk] = is_bool($v) ? ($v ? 'true' : 'false') : (string)$v;
    }
    return $o;
}

/* One call to Stripe. -> array(http code (0 = no answer), decoded JSON | null) */
function st_api($cr, $method, $path, $params = array(), $idem = '') {
    if (!function_exists('curl_init')) return array(0, null);
    $url = 'https://api.stripe.com' . $path;
    $q = http_build_query(st_flat((array)$params), '', '&', PHP_QUERY_RFC3986);
    $h = array('Authorization: Bearer ' . $cr['secret'], 'Stripe-Version: ' . ST_VERSION);
    $ch = curl_init();
    if ($method === 'GET') { if ($q !== '') $url .= '?' . $q; }
    else {
        curl_setopt($ch, CURLOPT_POST, true); curl_setopt($ch, CURLOPT_POSTFIELDS, $q);
        $h[] = 'Content-Type: application/x-www-form-urlencoded';
        if ($idem !== '') $h[] = 'Idempotency-Key: ' . $idem;
    }
    curl_setopt_array($ch, array(CURLOPT_URL => $url, CURLOPT_RETURNTRANSFER => true, CURLOPT_HTTPHEADER => $h,
        CURLOPT_TIMEOUT => 25, CURLOPT_CONNECTTIMEOUT => 10));
    $body = curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
    return array($body === false ? 0 : $code, is_string($body) ? json_decode($body, true) : null);
}
function st_why($j) { return is_array($j) ? substr((string)($j['error']['message'] ?? ($j['error']['code'] ?? '')), 0, 160) : ''; }

/* Is this webhook really from Stripe? Stripe-Signature "t=..,v1=.." = HMAC-SHA256 of "t.payload" with the endpoint's secret,
   and no older than 5 minutes (so a copied request can't be replayed later). */
function st_sig_ok($payload, $header, $secret, $now = null, $tol = 300) {
    if ($secret === '' || !preg_match('/(?:^|,)\s*t=(\d+)/', (string)$header, $m)) return false;
    $t = (int)$m[1]; $now = $now === null ? time() : (int)$now;
    if (abs($now - $t) > $tol) return false;
    $want = hash_hmac('sha256', $t . '.' . $payload, $secret);
    preg_match_all('/(?:^|,)\s*v1=([a-f0-9]{64})/', (string)$header, $mm);
    foreach ($mm[1] as $sig) if (hash_equals($want, $sig)) return true;
    return false;
}

/* Pounds "545.00" -> pence 54500 (no float rounding surprises) */
function st_pence($gbp) { $p = explode('.', number_format((float)$gbp, 2, '.', '')); return (int)$p[0] * 100 + (int)$p[1]; }
/* A Checkout Session id as Stripe writes it, or '' */
function st_session_id($v) { $v = (string)$v; return preg_match('/^cs_(?:live|test)_[A-Za-z0-9]{10,200}$/', $v) ? $v : ''; }

/* Where Stripe will deliver it, and who to: from a session (API 2024-06-20: shipping_details; newer ones: collected_information) */
function st_ship_of($s) {
    $sd = (array)($s['shipping_details'] ?? ($s['collected_information']['shipping_details'] ?? array()));
    $a = (array)($sd['address'] ?? array());
    $lines = array();
    foreach (array('line1', 'line2', 'city', 'state') as $f) if (trim((string)($a[$f] ?? '')) !== '') $lines[] = trim((string)$a[$f]);
    $cd = (array)($s['customer_details'] ?? array());
    return array(
        'name' => trim((string)($sd['name'] ?? '')) !== '' ? trim((string)$sd['name']) : trim((string)($cd['name'] ?? '')),
        'payer' => trim((string)($cd['name'] ?? '')),
        'email' => strtolower(trim((string)($cd['email'] ?? ''))),
        'phone' => trim((string)($cd['phone'] ?? '')),
        'lines' => $lines,
        'postcode' => strtoupper(trim((string)($a['postal_code'] ?? ''))),
        'country' => strtoupper(trim((string)($a['country'] ?? ''))),
    );
}
/* Stripe's fee in pounds, when the payment came back expanded down to its balance transaction; '' otherwise */
function st_fee_of($s) {
    $bt = $s['payment_intent']['latest_charge']['balance_transaction'] ?? null;
    return is_array($bt) && isset($bt['fee']) ? number_format(((int)$bt['fee']) / 100, 2, '.', '') : '';
}
function st_pi_of($s) { $pi = $s['payment_intent'] ?? ''; return is_array($pi) ? (string)($pi['id'] ?? '') : (string)$pi; }
