<?php
/*
 * Refurbished Dells bought online (shop-lib.php / shop.php, 14 Oct 2026). CLI only:
 *   C:\tools\php\php.exe -d extension=mbstring api/shop-test.php
 * Pure checks in a temp folder against a pretend PayPal (a function standing in for pp_api) and, since 18 Oct 2026, a pretend
 * Stripe (standing in for st_api): neither is ever called.
 */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
error_reporting(E_ALL);
$TMP = sys_get_temp_dir() . '/shoptest-' . getmypid();
@mkdir($TMP);
define('PP_DIR', $TMP);
define('PLUS_FILE', $TMP . '/plus.json');
define('PLUS_CONFIG', $TMP . '/buy-config.php');
define('PLUS_OFF', $TMP . '/buy.off');
define('PLUS_FX_NOFETCH', 1);
define('SHOP_DIR', $TMP);
define('SHOP_CAT', $TMP . '/cat.php');
define('SHOP_STATE', $TMP . '/state.json');
define('SHOP_LOG', $TMP . '/shop.log');
require __DIR__ . '/shop-lib.php';
require __DIR__ . '/pcm-leadchase-lib.php';
$fails = 0;
function check($ok, $what, $detail = '') { global $fails; echo ($ok ? "  PASS  " : "  FAIL  ") . $what . ($ok ? '' : "  [" . $detail . "]") . "\n"; if (!$ok) $fails++; }

$CAT = array('delivery' => '15.00', 'handling' => array(1, 2), 'transit' => array(1, 2), 'units' => array(
    'latitude-5520-01' => array('status' => 'live', 'ed' => 1, 'price' => '545.00', 'name' => 'Dell Latitude 5520 (Grade A)', 'kind' => 'laptop',
        'title' => 'Refurbished Dell Latitude 5520 & co <test>', 'desc' => 'A "good" one', 'url' => 'https://365techies.co.uk/refurbished-dell-for-sale/latitude-5520-01/',
        'images' => array('https://365techies.co.uk/images/shop/latitude-5520-01/1.webp', 'https://365techies.co.uk/images/shop/latitude-5520-01/2.webp'),
        'gpc' => '328', 'ptype' => 'Refurbished Dell > Laptops > Latitude 5000'),
    'latitude-5420-01' => array('status' => 'sold', 'ed' => 1, 'price' => '540.00', 'name' => 'Dell Latitude 5420 (Grade B)', 'kind' => 'laptop',
        'title' => 't', 'desc' => 'd', 'url' => 'u', 'images' => array(), 'gpc' => '328', 'ptype' => 'p'),
    'optiplex-3080-01' => array('status' => 'live', 'ed' => 1, 'price' => '545.00', 'name' => 'Dell OptiPlex 3080 (Grade A)', 'kind' => 'desktop',
        'title' => 't', 'desc' => 'd', 'url' => 'u', 'images' => array('i'), 'gpc' => '325', 'ptype' => 'p'),
    'test-01' => array('status' => 'test', 'ed' => 1, 'price' => '1.00', 'name' => 'TEST LISTING - Dell Latitude 5520', 'kind' => 'laptop',
        'title' => 't', 'desc' => '', 'url' => 'u', 'images' => array(), 'gpc' => '328', 'ptype' => 'p'),
));
$writeCat = function ($c) { file_put_contents(SHOP_CAT, "<?php\nreturn json_decode('" . str_replace(array('\\', "'"), array('\\\\', "\\'"), json_encode($c)) . "', true);\n"); };
$writeCat($CAT);
$CR = array('id' => 'cid', 'secret' => 's', 'webhook' => '', 'env' => 'live');
$H1 = shop_holder(str_repeat('ab', 16)); $H2 = shop_holder(str_repeat('cd', 16));

/* The pretend PayPal. $PP['orders'][id] = the order as PayPal would hold it. Every call is recorded in $PP['calls']. */
$PP = array('orders' => array(), 'calls' => array(), 'n' => 0, 'fail_create' => false, 'capture' => 'COMPLETED', 'country' => 'GB', 'declined' => false);
$api = function ($cr, $method, $path, $body = null, $extra = array()) use (&$PP) {
    $PP['calls'][] = $method . ' ' . $path;
    if ($method === 'POST' && $path === '/v2/checkout/orders') {
        if ($PP['fail_create']) return array(500, array('message' => 'boom'));
        $id = 'ORD' . str_pad((string)(++$PP['n']), 10, '0', STR_PAD_LEFT);
        $b = is_string($body) ? json_decode($body, true) : $body;
        $PP['orders'][$id] = array('id' => $id, 'status' => 'APPROVED', 'body' => $b,
            'payer' => array('email_address' => 'Jane@Example.com', 'name' => array('given_name' => 'Jane', 'surname' => 'Smith'), 'phone' => array('phone_number' => array('national_number' => '07700900123'))),
            'purchase_units' => array(array('amount' => $b['purchase_units'][0]['amount'],
                'shipping' => array('name' => array('full_name' => 'Jane Smith'), 'address' => array('address_line_1' => '1 High St', 'admin_area_2' => 'Poole', 'postal_code' => 'bh15 1aa', 'country_code' => $PP['country'])))));
        return array(201, array('id' => $id, 'status' => 'CREATED'));
    }
    if (preg_match('#^/v2/checkout/orders/([A-Z0-9]+)(/capture)?$#', $path, $m)) {
        if (!isset($PP['orders'][$m[1]])) return array(404, array('message' => 'no order'));
        $o =& $PP['orders'][$m[1]];
        if (empty($m[2])) return array(200, $o);
        if ($PP['declined']) return array(422, array('name' => 'UNPROCESSABLE_ENTITY', 'details' => array(array('issue' => 'INSTRUMENT_DECLINED'))));
        if ($o['status'] === 'COMPLETED') return array(422, array('details' => array(array('issue' => 'ORDER_ALREADY_CAPTURED'))));
        $o['status'] = 'COMPLETED';
        $o['purchase_units'][0]['payments'] = array('captures' => array(array('id' => 'CAP' . substr($m[1], 3), 'status' => $PP['capture'], 'amount' => $o['purchase_units'][0]['amount'])));
        return array(201, $o);
    }
    return array(404, null);
};
$capturesMade = function () use (&$PP) { return count(array_filter($PP['calls'], function ($c) { return substr($c, -8) === '/capture'; })); };
$now = 1792000000;

echo "A  the build's catalogue\n";
$c = shop_catalogue($TMP . '/none.php'); check($c['units'] === array() && $c['delivery'] === '15.00', 'no catalogue: nothing to sell (no crash)');
$c = shop_catalogue(); check(count($c['units']) === 4 && $c['units']['latitude-5520-01']['price'] === '545.00', 'the written catalogue loads, quotes and all', json_encode(array_keys($c['units'])));
check(shop_total($c['units']['latitude-5520-01'], $c) === '560.00' && shop_total($c['units']['test-01'], $c) === '1.00', 'total = price + £15 delivery; the test machine has no delivery');
check(shop_id('Latitude-5520-01') === 'latitude-5520-01' && shop_id('../etc') === '' && shop_id('') === '', 'machine ids are cleaned; anything odd is refused');
check(shop_holder('xyz') === '' && strlen($H1) === 16 && $H1 !== $H2, 'hold tokens: only random hex counts, kept scrambled');

echo "B  what may be bought\n";
$d = shop_read();
check(shop_state_of($d, 'latitude-5520-01', $c['units']['latitude-5520-01'], $now) === 'available', 'a live machine is available');
check(shop_state_of($d, 'latitude-5420-01', $c['units']['latitude-5420-01'], $now) === 'sold', 'status sold in the stock file: sold');
$st = shop_stock($c, $d, $now);
check(isset($st['latitude-5520-01'], $st['latitude-5420-01']) && !isset($st['test-01']), 'the list page sees live and sold machines, never the test one', json_encode($st));
check(shop_stock($c, $d, $now, 'test-01')['test-01'] === 'available', "the test machine's own page can ask about it");

echo "C  making the order\n";
check(shop_create($CR, 'nope-01', $H1, $api, $now)[1] === 'no_such', 'an unknown machine: no order');
check(shop_create($CR, 'latitude-5420-01', $H1, $api, $now)[1] === 'sold', 'a sold machine: no order');
$PP['fail_create'] = true; $r = shop_create($CR, 'latitude-5520-01', $H1, $api, $now); $PP['fail_create'] = false;
check(!$r[0] && $r[1] === 'paypal_failed' && shop_state_of(shop_read(), 'latitude-5520-01', $c['units']['latitude-5520-01'], $now) === 'available', 'PayPal fails: no order and the machine is NOT held');
$r = shop_create($CR, 'latitude-5520-01', $H1, $api, $now);
check($r[0] && preg_match('/^ORD\d{10}$/', $r[1]), 'buyer 1 gets an order', json_encode($r));
$A = $r[1]; $b = $PP['orders'][$A]['body']['purchase_units'][0];
check($b['amount']['value'] === '560.00' && $b['amount']['breakdown']['item_total']['value'] === '545.00' && $b['amount']['breakdown']['shipping']['value'] === '15.00', "the order is the catalogue's price: £545 + £15 = £560", json_encode($b['amount']));
check($b['items'][0]['sku'] === 'latitude-5520-01' && $b['items'][0]['category'] === 'PHYSICAL_GOODS' && $b['custom_id'] === 'latitude-5520-01#1', 'the item is the machine (sku = id, edition 1)');
check($PP['orders'][$A]['body']['application_context']['shipping_preference'] === 'GET_FROM_FILE', 'PayPal asks for the delivery address');
$d = shop_read();
check(shop_state_of($d, 'latitude-5520-01', $c['units']['latitude-5520-01'], $now) === 'held' && $d['o'][$A]['amt'] === '560.00', 'the machine is held for buyer 1 and the order remembered');
check(shop_create($CR, 'latitude-5520-01', $H2, $api, $now + 60)[1] === 'held', 'buyer 2 meanwhile: "someone is buying it"');
check(shop_create($CR, 'latitude-5520-01', '', $api, $now + 60)[1] === 'held', 'no hold token: "someone is buying it" too');
$r = shop_create($CR, 'latitude-5520-01', $H1, $api, $now + 90);
check($r[0] && $r[1] !== $A, 'buyer 1 closes PayPal and tries again: a new order straight away', json_encode($r));
$A2 = $r[1];
check(shop_state_of(shop_read(), 'latitude-5520-01', $c['units']['latitude-5520-01'], $now + 90 + SHOP_HOLD + 1) === 'available', 'a hold nobody finishes runs out by itself (20 minutes)');
$t = shop_create($CR, 'test-01', $H1, $api, $now);
check($t[0] && $PP['orders'][$t[1]]['body']['purchase_units'][0]['amount']['value'] === '1.00', 'the test machine: £1, no delivery');

echo "D  letting go\n";
check(!shop_release($A2, $H2), "buyer 2 can't release buyer 1's hold");
check(shop_release($A2, $H1) && shop_state_of(shop_read(), 'latitude-5520-01', $c['units']['latitude-5520-01'], $now + 100) === 'available', 'buyer 1 cancels: the machine is free at once');
$r = shop_create($CR, 'latitude-5520-01', $H2, $api, $now + 120); $B = $r[1];
check($r[0], 'so buyer 2 can start');

echo "E  taking the payment\n";
check(shop_capture($CR, 'ORDNOTOURS1', $api, $now + 130)[0] === 'refused', 'an order we never made: refused');
check(shop_capture($CR, 'bad id!', $api, $now + 130)[0] === 'refused', 'a malformed order id: refused');
$PP['country'] = 'FR'; $r0 = shop_create($CR, 'optiplex-3080-01', $H1, $api, $now + 130); $PP['country'] = 'GB';
$n0 = $capturesMade(); $r = shop_capture($CR, $r0[1], $api, $now + 140);
check($r[0] === 'not_uk' && $capturesMade() === $n0, 'a delivery address outside the UK: refused BEFORE any money moves', json_encode($r));
shop_release($r0[1], $H1);
$n0 = $capturesMade(); $r = shop_capture($CR, $A, $api, $now + 150);
check($r[0] === 'gone' && $capturesMade() === $n0, "buyer 1's OLD order while buyer 2 holds it: refused, nothing taken", json_encode($r));
$PP['declined'] = true; $r = shop_capture($CR, $B, $api, $now + 160); $PP['declined'] = false;
check($r[0] === 'declined' && shop_state_of(shop_read(), 'latitude-5520-01', $c['units']['latitude-5520-01'], $now + 160) === 'held', 'card declined: buyer 2 keeps the hold to pay another way');
$r = shop_capture($CR, $B, $api, $now + 170);
check($r[0] === 'sold' && $r[1]['amt'] === '560.00' && $r[1]['email'] === 'jane@example.com' && $r[1]['name'] === 'Jane Smith', 'buyer 2 pays: sold, with name and email', json_encode($r));
check($r[1]['lines'] === array('1 High St', 'Poole') && $r[1]['postcode'] === 'BH15 1AA' && $r[1]['phone'] === '07700900123', 'the delivery address is kept for sending it', json_encode($r[1]));
$sale = $r[1];
$d = shop_read();
check(shop_state_of($d, 'latitude-5520-01', $c['units']['latitude-5520-01'], $now + 9e6) === 'sold' && count($d['sales']) === 1, 'sold for good (a hold expiring later changes nothing); one sale recorded');
$n0 = $capturesMade(); $r = shop_capture($CR, $B, $api, $now + 180);
check($r[0] === 'had' && $capturesMade() === $n0 && count(shop_read()['sales']) === 1, 'the page asks twice (double click, retry): no second sale, no second email', json_encode($r));
check(shop_create($CR, 'latitude-5520-01', $H1, $api, $now + 200)[1] === 'sold', 'nobody can start buying it now');
$c2 = $CAT; $c2['units']['latitude-5520-01']['ed'] = 2; $writeCat($c2); $cc = shop_catalogue();
check(shop_state_of(shop_read(), 'latitude-5520-01', $cc['units']['latitude-5520-01'], $now + 210) === 'available', 'refunded and relisted as edition 2: on sale again');
$writeCat($CAT); $c = shop_catalogue();
$PP['capture'] = 'PENDING'; $r = shop_create($CR, 'optiplex-3080-01', $H1, $api, $now + 220); $r = shop_capture($CR, $r[1], $api, $now + 230); $PP['capture'] = 'COMPLETED';
check($r[0] === 'pending' && shop_state_of(shop_read(), 'optiplex-3080-01', $c['units']['optiplex-3080-01'], $now + 240) === 'sold', 'PayPal still checking the payment: sold to that buyer, marked pending', json_encode($r));
$c3 = $CAT; $c3['units']['test-01']['status'] = 'draft'; $writeCat($c3);
check(shop_capture($CR, $t[1], $api, $now + 250)[0] === 'gone', 'taken off sale (draft) after the order was made: refused');
$writeCat($CAT); $c = shop_catalogue();

echo "F  Slack and the buyer's email\n";
$u = $c['units']['latitude-5520-01'];
$card = shop_card($sale, $u, $now);
check(strpos($card['text'], 'Laptop order from Jane Smith (Dell Latitude 5520 (Grade A), latitude-5520-01)') === 0, "the card's first line", $card['text']);
$L = lc_lead(array('ts' => '1792000000.000100', 'bot_id' => 'B1', 'text' => $card['text']));
check(is_array($L) && $L['label'] === 'Laptop order' && $L['who'] === 'Jane Smith', 'the lead reminders and portal inbox read it as a "Laptop order"', json_encode($L));
$cj = json_encode($card);
check(strpos($cj, '1 High St') !== false && strpos($cj, '560.00') !== false && strpos($cj, 'QuickBooks') !== false && strpos($cj, 'still checking') === false, 'card: address, amount, the next steps');
$card = shop_card(array('status' => 'pending') + $sale, $u, $now);
check(strpos(json_encode($card), 'still checking') !== false, "card for a PENDING payment: don't send it yet");
$tc = shop_card($sale, $c['units']['test-01'], $now);
check(strpos($tc['text'], '[INTERNAL TEST]') === 0 && lc_lead(array('ts' => '1', 'bot_id' => 'B1', 'text' => $tc['text'])) === null, 'a test sale is never chased as a lead');
check(strpos(shop_card(array('env' => 'sandbox') + $sale, $u, $now)['text'], '[INTERNAL TEST]') === 0, 'a sandbox sale is a test too');
check(strpos(shop_card($sale, $c['units']['optiplex-3080-01'], $now)['text'], 'Desktop order from') === 0, 'an OptiPlex is a "Desktop order"');
list($s, $body) = shop_email($sale, $u, $c);
check($s === 'Your 365 Techies order: Dell Latitude 5520 (Grade A)' && strpos($body, 'Hello Jane,') === 0, 'email: subject and greeting', $s);
check(strpos($body, '£560.00') !== false && strpos($body, '1 High St') !== false && strpos($body, '14 days') !== false && strpos($body, '2 working days') !== false, 'email: total, address, 14 days, dispatch');
list($s) = shop_email($sale, $c['units']['test-01'], $c); check(strpos($s, '[TEST]') === 0, 'a test sale email says TEST');

echo "G  Google's feed\n";
$xml = shop_feed_xml($c, shop_read(), $now + 300);
$sx = @simplexml_load_string($xml);
check($sx !== false, 'the feed is well-formed XML', substr($xml, 0, 200));
$ids = array(); foreach ($sx->channel->item as $it) { $g = $it->children('http://base.google.com/ns/1.0'); $ids[(string)$g->id] = $g; }
check(isset($ids['latitude-5520-01'], $ids['optiplex-3080-01']) && !isset($ids['test-01']) && !isset($ids['latitude-5420-01']), 'live machines only: never the test one, never one the stock file says is sold', json_encode(array_keys($ids)));
$g = $ids['latitude-5520-01'];
check((string)$g->availability === 'out_of_stock', 'sold by the server since the last build: out_of_stock straight away');
check((string)$g->price === '545.00 GBP' && (string)$g->condition === 'refurbished' && (string)$g->brand === 'Dell' && (string)$g->identifier_exists === 'no', 'price, condition, brand, no GTIN');
check((string)$g->title === 'Refurbished Dell Latitude 5520 & co <test>' && (string)$g->description === 'A "good" one', 'text with & < > " survives the XML');
check((string)$g->shipping->price === '15.00 GBP' && (string)$g->shipping->country === 'GB' && (string)$g->google_product_category === '328', 'UK delivery £15; Laptops category');
check(count($g->additional_image_link) === 1 && (string)$g->image_link !== '', 'first photo is the main image, the rest additional');
$xml2 = shop_feed_xml($c, shop_norm(array()), $now);
$sx2 = simplexml_load_string($xml2); $g2 = null; foreach ($sx2->channel->item as $it) { $gg = $it->children('http://base.google.com/ns/1.0'); if ((string)$gg->id === 'latitude-5520-01') $g2 = $gg; }
check($g2 !== null && (string)$g2->availability === 'in_stock', 'unsold: in_stock');

echo "H  card payments through Stripe (18 Oct 2026)\n";
// the owner's key file
file_put_contents($TMP . '/k1.php', "<?php\n\$ST_SECRET = 'rk_live_abcDEF1234567890';\n\$ST_WHSEC = 'whsec_abcdef1234567890';\n");
file_put_contents($TMP . '/k2.php', "<?php\n\$ST_SECRET = 'pk_live_abcDEF1234567890';\n");
file_put_contents($TMP . '/k3.php', "<?php\n\$ST_SECRET = 'sk_test_abcDEF1234567890';\n\$ST_WHSEC = 'nope';\n");
$k = st_creds($TMP . '/k1.php');
check(is_array($k) && $k['env'] === 'live' && $k['whsec'] === 'whsec_abcdef1234567890', 'a restricted live key + webhook secret: card payments on', json_encode($k));
check(st_creds($TMP . '/none.php') === null && st_creds($TMP . '/k2.php') === null, 'no key file, or a publishable key: no card button');
$k = st_creds($TMP . '/k3.php'); check($k['env'] === 'test' && $k['whsec'] === '', 'a test key is env test; a malformed webhook secret is ignored');
check(st_flat(array('a' => array('b' => array(array('c' => 1))), 'x' => true, 'n' => null)) === array('a[b][0][c]' => '1', 'x' => 'true'), "nested fields in Stripe's a[b][0][c] form");
check(st_pence('545.00') === 54500 && st_pence('15') === 1500 && st_pence('19.99') === 1999 && st_pence('0.1') === 10, 'pounds to pence without float slips');
check(st_session_id('cs_live_a1B2c3D4e5F6g7') !== '' && st_session_id('cs_live_') === '' && st_session_id('ORD0000000001') === '', 'session ids recognised, others not');
// the webhook signature
$pl = '{"id":"evt_1"}'; $t0 = 1792000000; $sig = hash_hmac('sha256', $t0 . '.' . $pl, 'whsec_abc');
check(st_sig_ok($pl, 't=' . $t0 . ',v1=' . $sig, 'whsec_abc', $t0 + 10), 'a real Stripe signature passes');
check(!st_sig_ok($pl, 't=' . $t0 . ',v1=' . $sig, 'whsec_other', $t0 + 10), 'the wrong secret fails');
check(!st_sig_ok($pl . ' ', 't=' . $t0 . ',v1=' . $sig, 'whsec_abc', $t0 + 10), 'a changed body fails');
check(!st_sig_ok($pl, 't=' . $t0 . ',v1=' . $sig, 'whsec_abc', $t0 + 301), 'a signature older than 5 minutes fails (no replays)');
check(st_sig_ok($pl, 't=' . $t0 . ',v1=' . str_repeat('0', 64) . ',v1=' . $sig, 'whsec_abc', $t0), 'any of several v1 signatures may match (secret being rolled)');
check(!st_sig_ok($pl, '', 'whsec_abc', $t0) && !st_sig_ok($pl, 't=' . $t0 . ',v1=' . $sig, '', $t0), 'no header, or no secret on our side: fails');

// a fresh machine for the card tests, and the pretend Stripe
$c4 = $CAT; $c4['units']['latitude-7420-01'] = array('status' => 'live', 'ed' => 1, 'price' => '510.00', 'name' => 'Dell Latitude 7420 (Grade A)', 'kind' => 'laptop',
    'title' => 't', 'desc' => 'd', 'url' => 'https://365techies.co.uk/refurbished-dell-for-sale/latitude-7420-01/', 'images' => array(), 'gpc' => '328', 'ptype' => 'p');
$c4['units']['latitude-7490-01'] = array('status' => 'live', 'ed' => 1, 'price' => '400.00', 'name' => 'Dell Latitude 7490 (Grade B)', 'kind' => 'laptop',
    'title' => 't', 'desc' => 'd', 'url' => 'u', 'images' => array(), 'gpc' => '328', 'ptype' => 'p');
$writeCat($c4); $c = shop_catalogue();
$ST = array('sessions' => array(), 'calls' => array(), 'n' => 0, 'fail_create' => false, 'expand_403' => false);
$sapi = function ($cr, $method, $path, $params = array(), $idem = '') use (&$ST) {
    $ST['calls'][] = $method . ' ' . $path;
    if ($method === 'POST' && $path === '/v1/checkout/sessions') {
        if ($ST['fail_create']) return array(500, array('error' => array('message' => 'boom')));
        $id = 'cs_test_' . str_pad((string)(++$ST['n']), 24, 'a', STR_PAD_LEFT);
        $amt = $params['line_items'][0]['price_data']['unit_amount'] + $params['shipping_options'][0]['shipping_rate_data']['fixed_amount']['amount'];
        $ST['sessions'][$id] = array('id' => $id, 'object' => 'checkout.session', 'params' => $params, 'idem' => $idem, 'status' => 'open', 'payment_status' => 'unpaid',
            'currency' => 'gbp', 'amount_total' => $amt, 'metadata' => $params['metadata'], 'url' => 'https://checkout.stripe.com/c/pay/' . $id,
            'customer_details' => array('email' => 'Sam@Example.com', 'name' => 'Sam Card', 'phone' => '+447700900456'),
            'shipping_details' => array('name' => 'Sam Card', 'address' => array('line1' => '2 Sea Rd', 'line2' => '', 'city' => 'Bournemouth', 'state' => '', 'postal_code' => 'bh1 2aa', 'country' => 'GB')),
            'payment_intent' => 'pi_test_' . $ST['n']);
        return array(200, $ST['sessions'][$id]);
    }
    if (preg_match('#^/v1/checkout/sessions/(cs_[A-Za-z0-9_]+)(/expire)?$#', $path, $m)) {
        if (!isset($ST['sessions'][$m[1]])) return array(404, array('error' => array('message' => 'no such session')));
        $s =& $ST['sessions'][$m[1]];
        if (!empty($m[2])) { $s['status'] = 'expired'; return array(200, $s); }
        $exp = (array)($params['expand'] ?? array());
        if ($ST['expand_403'] && in_array('payment_intent.latest_charge.balance_transaction', $exp, true)) return array(403, array('error' => array('message' => 'The provided key does not have the required permissions')));
        $out = $s;
        if (in_array('payment_intent.latest_charge.balance_transaction', $exp, true)) $out['payment_intent'] = array('id' => $s['payment_intent'], 'latest_charge' => array('balance_transaction' => array('fee' => 945)));
        elseif (in_array('payment_intent', $exp, true)) $out['payment_intent'] = array('id' => $s['payment_intent']);
        return array(200, $out);
    }
    return array(404, null);
};
$pay = function ($sid) use (&$ST) { $ST['sessions'][$sid]['status'] = 'complete'; $ST['sessions'][$sid]['payment_status'] = 'paid'; };
$SC = array('secret' => 'rk_live_x', 'whsec' => 'whsec_x', 'env' => 'live');
$T = $now + 100000;
$U = $c['units']['latitude-7420-01'];

check(shop_card_start($SC, 'nope-01', $H1, $sapi, $T)[1] === 'no_such' && shop_card_start($SC, 'latitude-5420-01', $H1, $sapi, $T)[1] === 'sold', 'unknown or sold machine: no card page');
$ST['fail_create'] = true; $r = shop_card_start($SC, 'latitude-7420-01', $H1, $sapi, $T); $ST['fail_create'] = false;
check(!$r[0] && $r[1] === 'card_failed' && shop_state_of(shop_read(), 'latitude-7420-01', $U, $T) === 'available', 'Stripe fails: no card page and the machine is NOT held');
$r = shop_card_start($SC, 'latitude-7420-01', $H1, $sapi, $T);
check($r[0] && st_session_id($r[1]['id']) !== '' && strpos($r[1]['url'], 'https://checkout.stripe.com/') === 0, 'buyer 1 gets a Stripe page', json_encode($r));
$S1 = $r[1]['id']; $P = $ST['sessions'][$S1]['params'];
check($P['line_items'][0]['price_data']['unit_amount'] === 51000 && $P['line_items'][0]['price_data']['currency'] === 'gbp' && $P['shipping_options'][0]['shipping_rate_data']['fixed_amount']['amount'] === 1500,
    "the catalogue's price in pence (£510) + £15 delivery", json_encode($P['line_items']));
check($P['shipping_address_collection']['allowed_countries'] === array('GB') && $P['phone_number_collection']['enabled'] === true && $P['mode'] === 'payment', 'UK delivery address only; phone asked for');
check($P['success_url'] === 'https://365techies.co.uk/refurbished-dell-for-sale/latitude-7420-01/?paid={CHECKOUT_SESSION_ID}' && $P['cancel_url'] === 'https://365techies.co.uk/refurbished-dell-for-sale/latitude-7420-01/?cancelled=1', 'back to the machine page, paid or cancelled', $P['success_url']);
check($P['expires_at'] === $T + 31 * 60 && SHOP_HOLD_CARD > 31 * 60 && $P['metadata'] === array('shop' => '1', 'unit' => 'latitude-7420-01', 'ed' => '1'), "Stripe's page closes in 31 minutes, the hold outlasts it; the session names the machine");
check(strpos((string)$ST['sessions'][$S1]['idem'], 'shop-') === 0, 'an idempotency key, so a retried request never makes two pages');
$d = shop_read();
check(shop_state_of($d, 'latitude-7420-01', $U, $T) === 'held' && $d['o'][$S1]['prov'] === 'stripe' && $d['o'][$S1]['amt'] === '525.00', 'held for buyer 1; the order remembered as a card one (£525)');
check(shop_card_start($SC, 'latitude-7420-01', $H2, $sapi, $T + 60)[1] === 'held' && shop_create($CR, 'latitude-7420-01', $H2, $api, $T + 60)[1] === 'held', 'buyer 2, by card OR PayPal, meanwhile: "someone is buying it"');
check(shop_state_of(shop_read(), 'latitude-7420-01', $U, $T + 31 * 60 + 30) === 'held', "still held while Stripe's page could still be paid");

check(shop_card_done($SC, $S1, $sapi, $T + 100)[0] === 'unpaid' && count(shop_read()['sales']) === 2, 'back without paying (or too early): nothing happens');
check(shop_card_done($SC, 'cs_test_notoursnotoursnotours', $sapi, $T)[0] === 'refused' && shop_card_done($SC, 'bad!', $sapi, $T)[0] === 'refused', 'a session we never made, or a malformed one: refused');
$pay($S1);
$r = shop_card_done($SC, $S1, $sapi, $T + 200);
check($r[0] === 'sold' && $r[2] === true && $r[1]['prov'] === 'stripe' && $r[1]['amt'] === '525.00' && $r[1]['capture'] === 'pi_test_1', 'paid: sold, a new card sale', json_encode($r));
check($r[1]['name'] === 'Sam Card' && $r[1]['email'] === 'sam@example.com' && $r[1]['lines'] === array('2 Sea Rd', 'Bournemouth') && $r[1]['postcode'] === 'BH1 2AA' && $r[1]['phone'] === '+447700900456', 'name, email, phone and the UK address from Stripe', json_encode($r[1]));
check($r[1]['fee'] === '9.45', "Stripe's fee kept for the profit (when the key may read it)", $r[1]['fee']);
$cardSale = $r[1];
check(shop_state_of(shop_read(), 'latitude-7420-01', $U, $T + 9e6) === 'sold' && count(shop_read()['sales']) === 3, 'sold for good; one sale recorded');
$r = shop_card_done($SC, $S1, $sapi, $T + 210);
check($r[0] === 'had' && $r[2] === false && count(shop_read()['sales']) === 3, 'the webhook AND the buyer coming back: no second sale, no second email', json_encode($r));
check(shop_card_start($SC, 'latitude-7420-01', $H1, $sapi, $T + 220)[1] === 'sold', 'nobody can start buying it now');

// the amount must be what we asked; a key that can't read the fee
$r = shop_card_start($SC, 'latitude-7490-01', $H1, $sapi, $T + 300); $S2 = $r[1]['id']; $pay($S2);
$ST['sessions'][$S2]['amount_total'] = 41499;
check(shop_card_done($SC, $S2, $sapi, $T + 310)[0] === 'refused' && shop_state_of(shop_read(), 'latitude-7490-01', $c['units']['latitude-7490-01'], $T + 310) === 'held', 'paid a different amount than we asked: refused (logged to check), not sold');
$ST['sessions'][$S2]['amount_total'] = 41500; $ST['expand_403'] = true;
$r = shop_card_done($SC, $S2, $sapi, $T + 320); $ST['expand_403'] = false;
check($r[0] === 'sold' && $r[1]['fee'] === '' && $r[1]['capture'] === 'pi_test_2', "a key that can't read charges: still the sale, just no fee", json_encode($r));

// paid by card for a machine that went meanwhile: a clash, never a sale
$c5 = $c4; $c5['units']['latitude-7490-01']['ed'] = 2; $writeCat($c5); $c = shop_catalogue();
$r = shop_card_start($SC, 'latitude-7490-01', $H1, $sapi, $T + 400); $S3 = $r[1]['id'];
$c6 = $c5; $c6['units']['latitude-7490-01']['status'] = 'draft'; $writeCat($c6); $pay($S3);
$n0 = count(shop_read()['sales']);
$r = shop_card_done($SC, $S3, $sapi, $T + 410);
check($r[0] === 'clash' && $r[2] === true && $r[1]['why'] === 'it was taken off sale' && count(shop_read()['sales']) === $n0, 'taken off sale while they paid: a clash (refund it), NOT a sale', json_encode($r));
$r = shop_card_done($SC, $S3, $sapi, $T + 420);
check($r[0] === 'clash' && $r[2] === false, 'heard again (the webhook too): still a clash, but Slack is told only once');
$tx = shop_clash_text($r[1], $c6['units']['latitude-7490-01']);
check(strpos($tx, 'Refund needed') !== false && strpos($tx, '£415.00') !== false && strpos($tx, 'pi_test_3') !== false && strpos($tx, 'sam@example.com') !== false, 'the refund-needed message: who, how much, the payment', $tx);
$writeCat($c4); $c = shop_catalogue();

// letting go: the buyer comes back cancelled, or Stripe's page runs out
$c7 = $c4; $c7['units']['latitude-7490-01']['ed'] = 3; $writeCat($c7); $c = shop_catalogue(); $U3 = $c['units']['latitude-7490-01'];
$r = shop_card_start($SC, 'latitude-7490-01', $H1, $sapi, $T + 500); $S4 = $r[1]['id'];
check(!shop_release($S4, $H2) && shop_release($S4, $H1) && shop_state_of(shop_read(), 'latitude-7490-01', $U3, $T + 510) === 'available', 'cancelled on Stripe\'s page: only the same browser lets it go, and then at once');
$r = shop_card_start($SC, 'latitude-7490-01', $H2, $sapi, $T + 520); $S5 = $r[1]['id'];
check(shop_card_expired($S5) && shop_state_of(shop_read(), 'latitude-7490-01', $U3, $T + 530) === 'available' && !shop_card_expired($S5), "Stripe's page expired (webhook): free again; a second notice changes nothing");
$writeCat($c4); $c = shop_catalogue();

// Slack and the email say card, not PayPal; a test key's sale is a test
$card = shop_card($cardSale, $U, $T);
$cj = json_encode($card, JSON_UNESCAPED_UNICODE);
check(strpos($card['text'], 'Laptop order from Sam Card (Dell Latitude 7420') === 0 && strpos($cj, 'Paid by card through Stripe: payment pi_test_1') !== false && strpos($cj, 'PayPal order') === false, 'Slack card: a card sale, with the Stripe payment', $cj);
list($s, $body) = shop_email($cardSale, $U, $c);
check(strpos($body, '£525.00 (paid by card)') !== false && strpos($body, 'PayPal') === false, 'the buyer\'s email: paid by card, no PayPal', $body);
check(strpos(shop_card(array('env' => 'test') + $cardSale, $U, $T)['text'], '[INTERNAL TEST]') === 0 && shop_is_test(array('env' => 'test'), $U), 'a sale made with a TEST key is a test (never in QuickBooks)');
check(shop_order_id($S1) === $S1 && shop_order_id('ORD0000000001') === 'ORD0000000001' && shop_order_id('x') === '', 'release takes a PayPal order or a Stripe session');

echo "\n" . ($fails ? "$fails FAILED\n" : "ALL PASSED\n");
array_map('unlink', glob($TMP . '/*') ?: array()); @rmdir($TMP);
exit($fails ? 1 : 0);
