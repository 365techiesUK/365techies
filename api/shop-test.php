<?php
/*
 * Refurbished Dells bought online (shop-lib.php / shop.php, 14 Oct 2026). CLI only:
 *   C:\tools\php\php.exe -d extension=mbstring api/shop-test.php
 * Pure checks in a temp folder against a pretend PayPal (a function standing in for pp_api): PayPal is never called.
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

echo "\n" . ($fails ? "$fails FAILED\n" : "ALL PASSED\n");
array_map('unlink', glob($TMP . '/*') ?: array()); @rmdir($TMP);
exit($fails ? 1 : 0);
