<?php
/*
 * Dells bought on eBay -> the shop's books (shop-ebay-lib.php, 14 Oct 2026). CLI only:
 *   C:\tools\php\php.exe -d extension=mbstring api/shop-ebay-test.php
 * A pretend eBay (GetOrders answers in eBay's own XML) and a pretend QuickBooks: neither is ever called.
 */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
error_reporting(E_ALL);
$TMP = sys_get_temp_dir() . '/shopebaytest-' . getmypid();
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
define('EBAY_KEYF', $TMP . '/ebay-key.php');
define('EBAY_TOKF', $TMP . '/ebay-token.json');
require __DIR__ . '/shop-ebay-lib.php';
$fails = 0;
function check($ok, $what, $detail = '') { global $fails; echo ($ok ? "  PASS  " : "  FAIL  ") . $what . ($ok ? '' : "  [" . (is_string($detail) ? $detail : json_encode($detail)) . "]") . "\n"; if (!$ok) $fails++; }

echo "A  the owner's key file\n";
file_put_contents(EBAY_KEYF, "\xEF\xBB\xBF<?php \$EBAY_APP_ID = 'App-123'; \$EBAY_DEV_ID = 'dev-9'; \$EBAY_CERT_ID = 'PRD-cert'; \$EBAY_TOKEN = 'v^1.1#i^1#token';");
$cr = shop_ebay_creds(); check($cr && $cr['app'] === 'App-123' && $cr['token'] === 'v^1.1#i^1#token' && $cr['refresh'] === '', "one line with a BOM: the Auth'n'Auth token is read", $cr);
file_put_contents(EBAY_KEYF, "<?php\n\$EBAY_APP_ID = 'A';\n\$EBAY_CERT_ID = 'C';\n\$EBAY_REFRESH_TOKEN = 'v^1.1#r';\n");
$cr = shop_ebay_creds(); check($cr && $cr['refresh'] === 'v^1.1#r' && $cr['scopes'] === 'https://api.ebay.com/oauth/api_scope', 'or an OAuth refresh token (default scope)', $cr);
file_put_contents(EBAY_KEYF, "<?php \$EBAY_APP_ID = 'A'; \$EBAY_CERT_ID = 'C';");
check(shop_ebay_creds() === null, 'keys but no token: not set up');
check(shop_ebay_sweep(true)[1] === 'not set up (api/ebay-key.php)', 'the hourly look does nothing until the file is there');

echo "B  reading eBay's answer\n";
$xml = function ($orders, $more = 'false', $ack = 'Success') {
    return '<?xml version="1.0" encoding="UTF-8"?><GetOrdersResponse xmlns="urn:ebay:apis:eBLBaseComponents"><Timestamp>2026-10-14T12:00:00.000Z</Timestamp><Ack>' . $ack . '</Ack><Version>1331</Version>'
        . '<OrderArray>' . $orders . '</OrderArray><HasMoreOrders>' . $more . '</HasMoreOrders><PageNumber>1</PageNumber></GetOrdersResponse>';
};
$order = function ($id, $created, $status, $total, $ship, $items) {
    $tx = ''; $sub = 0;
    foreach ($items as $i) { $tx .= '<Transaction><Item><ItemID>' . $i[0] . '</ItemID><Title>' . htmlspecialchars($i[1], ENT_XML1) . '</Title></Item><QuantityPurchased>' . ($i[3] ?? 1) . '</QuantityPurchased><TransactionPrice currencyID="GBP">' . $i[2] . '</TransactionPrice></Transaction>'; $sub += $i[2] * ($i[3] ?? 1); }
    return '<Order><OrderID>' . $id . '</OrderID><OrderStatus>' . $status . '</OrderStatus><Subtotal currencyID="GBP">' . $sub . '</Subtotal><Total currencyID="GBP">' . $total . '</Total>'
        . '<CreatedTime>' . $created . '</CreatedTime><ShippingServiceSelected><ShippingServiceCost currencyID="GBP">' . $ship . '</ShippingServiceCost></ShippingServiceSelected>'
        . '<TransactionArray>' . $tx . '</TransactionArray></Order>';
};
$OLD = $order('20-15135-03052', '2026-09-11T14:02:00.000Z', 'Completed', '180.00', '0.00', array(array('2001', 'Dell Latitude 5520 Laptop Core I5 11th Gen, 16GB RAM, 250GB SSD, Windows 11 Pro', '180.00')));
$NEW = $order('23-15300-11111', '2026-10-15T09:30:00.000Z', 'Completed', '229.09', '9.10', array(
    array('3001', 'Dell Optiplex 7080 SFF Desktop Pc Intel I5 10th 24gb RAM With GPU', '199.99'),
    array('3002', 'Dell 65W USB-C Laptop Charger Adapter Model 0M9JDM Latitude', '20.00')));
$PARTS = $order('23-15266-81593', '2026-10-13T08:00:00.000Z', 'Active', '12.69', '1.50', array(array('4001', 'Dell Inspiron 15 17 Latitude CPU Fan 5570 5575 3580 3590', '11.19')));
$GONE = $order('23-15299-00000', '2026-10-15T10:00:00.000Z', 'Cancelled', '300.00', '0.00', array(array('5001', 'Dell Latitude 5420 Core i7 11th gen 16GB', '300.00')));
list($ok, $p) = shop_ebay_parse($xml($OLD . $NEW . $PARTS . $GONE));
check($ok && count($p['orders']) === 4 && $p['orders'][1]['order'] === '23-15300-11111' && $p['orders'][1]['total'] === 229.09 && count($p['orders'][1]['items']) === 2 && $p['more'] === false, 'orders, totals and items read from eBay\'s XML', $p);
list($ok, $why) = shop_ebay_parse('<?xml version="1.0"?><GetOrdersResponse xmlns="urn:ebay:apis:eBLBaseComponents"><Ack>Failure</Ack><Errors><ShortMessage>Auth token is invalid.</ShortMessage><LongMessage>Validation of the authentication token in API request failed.</LongMessage><ErrorCode>931</ErrorCode></Errors></GetOrdersResponse>');
check(!$ok && strpos($why, 'Validation of the authentication token') !== false && strpos($why, '931') !== false, 'eBay refuses: its own words and code come back', $why);
check(shop_ebay_parse('not xml')[0] === false, 'nonsense from eBay: refused, no crash');

echo "C  which purchases are machines\n";
$yes = array('Dell Latitude 5520 15.6" Touchscreen I5-1145G7, 16GB RAM, 512GB NVMe, W11 Pro', 'Dell Optiplex 7080 SFF Desktop Pc Intel I5 10th 24gb RAM With GPU Read DESC',
    'Dell latitude 3520 15"FHD Core i5-1135g7 2.4Gh 16GB 512GB SSD Win11', 'Dell Precision 3560 i7-1185G7 32GB');
foreach ($yes as $t) check(shop_ebay_is_machine($t, 180), 'a machine: ' . substr($t, 0, 50));
$no = array(array('Dell Inspiron 15 17 Latitude CPU Fan 5570 5575 3580 3590 3793 3780', 120), array('Dell 65W USB-C Laptop Charger Adapter Model 0M9JDM Power Supply Latitude', 30),
    array('Dell Latitude 5520 motherboard i5-1145G7 working', 90), array('Dell Latitude 5420 i5 for parts not booting', 80), array('Dell 0VYNNW Latitude 3520 Touchpad / Mousepad', 20),
    array('Dell Latitude 5520 i5 16GB', 30), array('Crucial 32GB DDR4 SODIMM Laptop RAM', 107.64), array('Dell OptiPlex 7080 barebones i5 no ssd', 120));
foreach ($no as $t) check(!shop_ebay_is_machine($t[0], $t[1]), 'not a machine: ' . substr($t[0], 0, 50));
check(shop_ebay_model('Dell Latitude 5520 15.6"') === 'latitude-5520' && shop_ebay_model('Dell Optiplex 7080 SFF') === 'optiplex-7080' && shop_ebay_model('Dell laptop') === '', 'model guesses');
$m = shop_ebay_machines($p['orders'][1]);
check(count($m) === 1 && $m[0]['cost'] === shop_money(199.99 + 9.10 * 199.99 / 219.99) && $m[0]['model'] === 'optiplex-7080', 'one machine from a two-item order, with its share of the postage (the charger is left out)', $m);

echo "D  the hourly look\n";
file_put_contents(EBAY_KEYF, "<?php \$EBAY_APP_ID = 'A'; \$EBAY_CERT_ID = 'C'; \$EBAY_TOKEN = 'T';");
$CAT = array('delivery' => '15.00', 'units' => array());
file_put_contents(SHOP_CAT, "<?php\nreturn json_decode('" . json_encode($CAT) . "', true);\n");
$now = strtotime('2026-10-14T12:00:00Z');
$ANSWER = array(true, shop_ebay_parse($xml($OLD . $PARTS))[1]); $ASKED = array();
$get = function ($cr, $from, $to, $page) use (&$ANSWER, &$ASKED) { $ASKED[] = array($from, $to, $page); return $ANSWER; };
$QB = array('Purchase' => array()); $NEXT = 900;
$api = function ($c, $method, $path, $body = null) use (&$QB, &$NEXT) {
    if ($method === 'GET' && preg_match("/DocNumber = '([^']+)'/", rawurldecode($path), $q)) {
        foreach ($QB['Purchase'] as $r) if ($r['DocNumber'] === $q[1]) return array('code' => 200, 'json' => array('QueryResponse' => array('Purchase' => array(array('Id' => $r['Id'])))));
        return array('code' => 200, 'json' => array('QueryResponse' => new stdClass()));
    }
    if ($method === 'POST' && $path === '/purchase') { $row = (array)$body; $row['Id'] = (string)(++$NEXT); $QB['Purchase'][] = $row; return array('code' => 200, 'json' => array('Purchase' => $row)); }
    return array('code' => 404, 'json' => null);
};
$C = array('ok' => true, 'live' => true, 'only' => '', 'tax' => '20', 'realm' => '9130', 'host' => 'https://app.qbo.intuit.com');
$connect = function () use ($C) { return $C; };
$SLACKED = array(); $slack = function ($b, $qr) use (&$SLACKED) { $SLACKED[] = array($b['order'], $qr[0]); return true; };
// QuickBooks set up for the shop already (shop_qbo_setup's record)
$st = shop_norm(array()); $st['qbo'] = array('income' => '1', 'cogs' => '2', 'item' => '3', 'delivery' => '4', 'vendor' => '5', 'deposit' => '35', 'pay' => '77', 'pay_type' => 'Credit Card', 'realm' => '9130');
file_put_contents(SHOP_STATE, json_encode($st));

$r = shop_ebay_sweep(false, $now, $get, $connect, $api, $slack);
check($r[0] && $r[2] === array('20-15135-03052#2001'), 'first look: the September 5520 found (the fan is not a machine)', $r);
check($ASKED[0][0] <= $now - 89 * 86400 && $ASKED[0][1] === $now, 'the first look goes back 90 days', $ASKED);
$d = shop_read();
check($d['ebay']['since'] === $now && $d['bought']['20-15135-03052#2001']['cost'] === '180.00' && $d['bought']['20-15135-03052#2001']['date'] === '2026-09-11', 'kept: order, date, cost; the connection\'s start is remembered', $d['bought']);
check(!isset($d['bought']['20-15135-03052#2001']['seller']) && strpos(json_encode($d['bought']), 'seller') === false, 'nobody else\'s details are kept (own-account data only)');
check(count($QB['Purchase']) === 0 && $SLACKED === array(), 'bought BEFORE the connection: not put in QuickBooks by itself (it may be there from the bank feed), no Slack line');
$r = shop_ebay_sweep(false, $now + 600, $get, $connect, $api, $slack);
check($r[1] === 'checked recently' && count($ASKED) === 1, 'ten minutes later: eBay is not asked again (hourly)');
$ANSWER = array(true, shop_ebay_parse($xml($OLD . $NEW . $PARTS . $GONE))[1]);
$r = shop_ebay_sweep(false, $now + 3700 + 86400, $get, $connect, $api, $slack);
check($r[2] === array('23-15300-11111#3001'), 'next day: the new OptiPlex found once; the old 5520 not again; the cancelled order ignored', $r);
check($ASKED[1][0] === $now - 2 * 86400, 'later looks start two days before the last good one', $ASKED[1]);
$pb = end($QB['Purchase']);
check(count($QB['Purchase']) === 1 && $pb['DocNumber'] === 'EB23-15300-11111' && $pb['TxnDate'] === '2026-10-15' && $pb['Line'][0]['Amount'] === (float)shop_money(199.99 + 9.10 * 199.99 / 219.99), 'bought AFTER the connection: in QuickBooks by itself, numbered from the order, dated the day it was bought', $pb);
check($SLACKED === array(array('23-15300-11111', true)), 'one Slack line for it');
$r = shop_ebay_sweep(true, $now + 3800 + 86400, $get, $connect, $api, $slack);
check($r[2] === array() && count($QB['Purchase']) === 1, '"Check eBay now": nothing new, nothing posted twice');
$ANSWER = array(false, 'eBay said: Validation of the authentication token in API request failed. (931)');
$r = shop_ebay_sweep(true, $now + 4000 + 86400, $get, $connect, $api, $slack);
check(!$r[0] && strpos(shop_read()['ebay']['error'], '931') !== false && count(shop_read()['bought']) === 2, 'eBay refuses: the reason is shown on the Shop tab, nothing lost');

echo "E  older purchases, the Shop tab and the listing\n";
$r = shop_qbo_bought($C, '20-15135-03052#2001', $api);
check($r[0] && end($QB['Purchase'])['DocNumber'] === 'EB20-15135-03052', 'the September 5520 put in QuickBooks with its button', $r);
check(shop_qbo_bought($C, '20-15135-03052#2001', $api)[0] && count($QB['Purchase']) === 2, 'pressed again: still one');
$rows = shop_bought_rows(shop_catalogue(), shop_read());
check(count($rows) === 2 && $rows[0]['order'] === '23-15300-11111' && $rows[1]['before'] === true && $rows[0]['before'] === false, 'the Shop tab: both "being got ready", newest first, the older one marked', $rows);
$CAT['units']['latitude-5520-01'] = array('status' => 'live', 'ed' => 1, 'price' => '535.00', 'name' => 'Dell Latitude 5520 (Grade A)', 'kind' => 'laptop', 'ebay' => '20-15135-03052');
file_put_contents(SHOP_CAT, "<?php\nreturn json_decode('" . json_encode($CAT) . "', true);\n");
$cat = shop_catalogue();
$rows = shop_bought_rows($cat, shop_read());
check(count($rows) === 1 && $rows[0]['order'] === '23-15300-11111', 'listed with ebay="20-15135-03052": it leaves "being got ready"');
$br = shop_books_rows($cat, shop_read());
check($br[0]['purchase']['total'] === '180.00' && $br[0]['purchase']['from'] === 'ebay' && strpos($br[0]['purchase']['qbo_url'], 'expense') !== false, 'the listing\'s cost and QuickBooks link come from eBay - nobody typed them', $br[0]['purchase']);
check(shop_ebay_dismiss('23-15300-11111#3001', 'Steve') === 'ok' && count(shop_bought_rows($cat, shop_read())) === 0, 'not for the shop: off the tab');
check(shop_ebay_dismiss('23-15300-11111#3001', 'Steve', true) === 'ok' && count(shop_bought_rows($cat, shop_read())) === 1, 'back on it');

echo "\n" . ($fails ? "$fails FAILED\n" : "ALL PASSED\n");
array_map('unlink', glob($TMP . '/*') ?: array()); @rmdir($TMP);
exit($fails ? 1 : 0);
