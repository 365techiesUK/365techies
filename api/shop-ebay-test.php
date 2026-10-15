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
$OLD = $order('20-15135-03052', '2026-09-11T14:02:00.000Z', 'Completed', '180.00', '0.00', array(array('336745659085', 'Dell Latitude 5520 Laptop Core I5 11th Gen, 16GB RAM, 250GB SSD, Windows 11 Pro', '180.00')));
$NEW = $order('23-15300-11111', '2026-10-15T09:30:00.000Z', 'Completed', '229.09', '9.10', array(
    array('147547371220', 'Dell Optiplex 7080 SFF Desktop Pc Intel I5 10th 24gb RAM With GPU', '199.99'),
    array('147547300002', 'Dell 65W USB-C Laptop Charger Adapter Model 0M9JDM Latitude', '20.00')));
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
check($m[0]['sku'] === '371220', 'its QuickBooks SKU: the last six digits of the eBay item number (the business\'s rule)', $m[0]);

echo "D  the hourly look\n";
file_put_contents(EBAY_KEYF, "<?php \$EBAY_APP_ID = 'A'; \$EBAY_CERT_ID = 'C'; \$EBAY_TOKEN = 'T';");
$CAT = array('delivery' => '15.00', 'units' => array());
file_put_contents(SHOP_CAT, "<?php\nreturn json_decode('" . json_encode($CAT) . "', true);\n");
$now = strtotime('2026-10-14T12:00:00Z');
$ANSWER = array(true, shop_ebay_parse($xml($OLD . $PARTS))[1]); $ASKED = array();
$get = function ($cr, $from, $to, $page) use (&$ANSWER, &$ASKED) { $ASKED[] = array($from, $to, $page); return $ANSWER; };
$QB = array('Purchase' => array(), 'Item' => array()); $NEXT = 900;
$api = function ($c, $method, $path, $body = null) use (&$QB, &$NEXT) {
    $sql = rawurldecode($path);
    if ($method === 'GET' && strpos($sql, "from Item where Type = 'Inventory'") !== false)
        return array('code' => 200, 'json' => array('QueryResponse' => $QB['Item'] ? array('Item' => $QB['Item']) : new stdClass()));
    if ($method === 'GET' && preg_match("/DocNumber = '([^']+)'/", $sql, $q)) {
        foreach ($QB['Purchase'] as $r) if ($r['DocNumber'] === $q[1]) return array('code' => 200, 'json' => array('QueryResponse' => array('Purchase' => array(array('Id' => $r['Id'])))));
        return array('code' => 200, 'json' => array('QueryResponse' => new stdClass()));
    }
    if ($method === 'POST' && $path === '/item' && !empty($body['sparse'])) {   // a rename: QuickBooks' sparse update, refused as QuickBooks would
        $fault = function ($m) { return array('code' => 400, 'json' => array('Fault' => array('Error' => array(array('Message' => $m))))); };
        foreach ($QB['Item'] as $o) if ($o['Name'] === $body['Name'] && $o['Id'] !== $body['Id']) return $fault('Duplicate Name Exists Error');
        foreach ($QB['Item'] as $i => $o) if ($o['Id'] === $body['Id']) {
            if ((string)($o['SyncToken'] ?? '') !== (string)$body['SyncToken']) return $fault('Stale Object Error');
            $o['Name'] = $body['Name']; $o['Description'] = $body['Description']; $o['SyncToken'] = (string)((int)($o['SyncToken'] ?? 0) + 1);
            $QB['Item'][$i] = $o; return array('code' => 200, 'json' => array('Item' => $o));
        }
        return $fault('Object Not Found');
    }
    if ($method === 'POST' && ($path === '/purchase' || $path === '/item')) { $k = $path === '/item' ? 'Item' : 'Purchase'; $row = (array)$body; $row['Id'] = (string)(++$NEXT); $QB[$k][] = $row; return array('code' => 200, 'json' => array($k => $row)); }
    return array('code' => 404, 'json' => null);
};
$C = array('ok' => true, 'live' => true, 'only' => '', 'tax' => '20', 'realm' => '9130', 'host' => 'https://app.qbo.intuit.com');
$connect = function () use ($C) { return $C; };
$SLACKED = array(); $slack = function ($b, $qr) use (&$SLACKED) { $SLACKED[] = array($b['order'], $qr[0]); return true; };
// QuickBooks set up for the shop already (shop_qbo_setup's record)
$st = shop_norm(array()); $st['qbo'] = array('asset' => '81', 'income' => '82', 'cogs' => '83', 'delivery' => '4', 'vendor' => '5', 'deposit' => '35', 'pay' => '77', 'pay_type' => 'Credit Card', 'realm' => '9130', 'v' => 2);
file_put_contents(SHOP_STATE, json_encode($st));

$r = shop_ebay_sweep(false, $now, $get, $connect, $api, $slack);
check($r[0] && $r[2] === array('20-15135-03052#336745659085'), 'first look: the September 5520 found (the fan is not a machine)', $r);
check($ASKED[0][0] <= $now - 89 * 86400 && $ASKED[0][1] === $now, 'the first look goes back 90 days', $ASKED);
$d = shop_read();
check($d['ebay']['since'] === $now && $d['bought']['20-15135-03052#336745659085']['cost'] === '180.00' && $d['bought']['20-15135-03052#336745659085']['date'] === '2026-09-11' && $d['bought']['20-15135-03052#336745659085']['sku'] === '659085', 'kept: order, date, cost, its SKU; the connection\'s start is remembered', $d['bought']);
check(!isset($d['bought']['20-15135-03052#336745659085']['seller']) && strpos(json_encode($d['bought']), 'seller') === false, 'nobody else\'s details are kept (own-account data only)');
check(count($QB['Purchase']) === 0 && count($QB['Item']) === 0 && $SLACKED === array(), 'bought BEFORE the connection: not put in QuickBooks by itself (it may be there already), no Slack line');
$r = shop_ebay_sweep(false, $now + 600, $get, $connect, $api, $slack);
check($r[1] === 'checked recently' && count($ASKED) === 1, 'ten minutes later: eBay is not asked again (hourly)');
$ANSWER = array(true, shop_ebay_parse($xml($OLD . $NEW . $PARTS . $GONE))[1]);
$r = shop_ebay_sweep(false, $now + 3700 + 86400, $get, $connect, $api, $slack);
check($r[2] === array('23-15300-11111#147547371220'), 'next day: the new OptiPlex found once; the old 5520 not again; the cancelled order ignored', $r);
check($ASKED[1][0] === $now - 2 * 86400, 'later looks start two days before the last good one', $ASKED[1]);
$pb = end($QB['Purchase']); $it = end($QB['Item']);
check(count($QB['Item']) === 1 && $it['Type'] === 'Inventory' && $it['Sku'] === '371220' && $it['QtyOnHand'] === 0 && $it['AssetAccountRef']['value'] === '81' && strpos($it['Name'], 'Dell Optiplex 7080 SFF') === 0 && substr($it['Name'], -11) === ' SKU 371220', 'bought AFTER the connection: its own stock item, made the business\'s way (SKU = item number\'s last six)', $it);
check(count($QB['Purchase']) === 1 && $pb['DocNumber'] === 'EB23-15300-11111' && $pb['TxnDate'] === '2026-10-15' && $pb['Line'][0]['DetailType'] === 'ItemBasedExpenseLineDetail' && $pb['Line'][0]['ItemBasedExpenseLineDetail']['ItemRef']['value'] === $it['Id'] && $pb['Line'][0]['Amount'] === (float)shop_money(199.99 + 9.10 * 199.99 / 219.99), '... and the purchase that brings it into stock: numbered from the order, dated the day it was bought, postage included', $pb);
check($SLACKED === array(array('23-15300-11111', true)), 'one Slack line for it');
$r = shop_ebay_sweep(true, $now + 3800 + 86400, $get, $connect, $api, $slack);
check($r[2] === array() && count($QB['Purchase']) === 1 && count($QB['Item']) === 1, '"Check eBay now": nothing new, nothing posted twice');
$ANSWER = array(false, 'eBay said: Validation of the authentication token in API request failed. (931)');
$r = shop_ebay_sweep(true, $now + 4000 + 86400, $get, $connect, $api, $slack);
check(!$r[0] && strpos(shop_read()['ebay']['error'], '931') !== false && count(shop_read()['bought']) === 2, 'eBay refuses: the reason is shown on the Shop tab, nothing lost');

echo "E  older purchases, the Shop tab and the listing\n";
// the September 5520 was already put in QuickBooks by hand, the way it was always done (SKU typed ": 659085")
$QB['Item'][] = array('Id' => '202', 'Name' => 'Dell Latitude 5520 Laptop Core I5 11th Gen', 'Sku' => ': 659085', 'Type' => 'Inventory', 'QtyOnHand' => 1, 'PurchaseCost' => 180);
$r = shop_qbo_bought($C, '20-15135-03052#336745659085', $api);
check($r[0] && count($QB['Purchase']) === 1 && count($QB['Item']) === 2 && strpos($r[2], 'already in QuickBooks') !== false, 'the September 5520 with its button: QuickBooks already has its stock item - linked, NOTHING posted (no double count)', $r);
check(shop_read()['bought']['20-15135-03052#336745659085']['qbo_item'] === 'Dell Latitude 5520 Laptop Core I5 11th Gen', 'the Shop tab names the stock item it was linked to');
check(shop_qbo_bought($C, '20-15135-03052#336745659085', $api)[0] && count($QB['Purchase']) === 1, 'pressed again: still nothing posted');
$rows = shop_bought_rows(shop_catalogue(), shop_read());
check(count($rows) === 2 && $rows[0]['order'] === '23-15300-11111' && $rows[1]['before'] === true && $rows[0]['before'] === false && $rows[0]['sku'] === '371220', 'the Shop tab: both "being got ready", newest first, the older one marked, each with its SKU', $rows);
$CAT['units']['latitude-5520-01'] = array('status' => 'live', 'ed' => 1, 'price' => '535.00', 'name' => 'Dell Latitude 5520 (Grade A)', 'kind' => 'laptop', 'ebay' => '20-15135-03052', 'sku' => '659085');
file_put_contents(SHOP_CAT, "<?php\nreturn json_decode('" . json_encode($CAT) . "', true);\n");
$cat = shop_catalogue();
$rows = shop_bought_rows($cat, shop_read());
check(count($rows) === 1 && $rows[0]['order'] === '23-15300-11111', 'listed with ebay="20-15135-03052": it leaves "being got ready"');
$br = shop_books_rows($cat, shop_read());
check($br[0]['purchase']['total'] === '180.00' && $br[0]['purchase']['from'] === 'ebay' && $br[0]['purchase']['qbo_item'] === 'Dell Latitude 5520 Laptop Core I5 11th Gen', 'the listing\'s cost and stock item come from eBay - nobody typed them', $br[0]['purchase']);
check(shop_ebay_dismiss('23-15300-11111#147547371220', 'Steve') === 'ok' && count(shop_bought_rows($cat, shop_read())) === 0, 'not for the shop: off the tab');
check(shop_ebay_dismiss('23-15300-11111#147547371220', 'Steve', true) === 'ok' && count(shop_bought_rows($cat, shop_read())) === 1, 'back on it');

echo "F  two machines in one eBay order\n";
$TWO = $order('25-15400-22222', '2026-10-20T10:00:00.000Z', 'Completed', '400.00', '0.00', array(
    array('226611110001', 'Dell Latitude 5520 i5-1145G7 16GB 256GB', '200.00'), array('226611110002', 'Dell Latitude 5520 i5-1135G7 16GB 256GB', '200.00')));
$ANSWER = array(true, shop_ebay_parse($xml($TWO))[1]);
$np = count($QB['Purchase']);
$r = shop_ebay_sweep(true, strtotime('2026-10-20T12:00:00Z'), $get, $connect, $api, $slack);
$docs = array_map(function ($p) { return $p['DocNumber']; }, array_slice($QB['Purchase'], $np));
check(count($r[2]) === 2 && count($docs) === 2 && $docs[0] !== $docs[1] && $docs[0] === 'EB25-15400-22222-0001' && strlen($docs[1]) <= 21, 'each machine gets its own stock item and purchase - neither hides the other behind the order number', $docs);

echo "G  the cost is what the order took from us (15 Oct 2026)\n";
// eBay's AmountPaid: what we actually paid, eBay's checkout fee included (the first real 5520: 237.74 item + postage, 249.19 paid)
$paidOrder = function ($id, $created, $total, $paid, $ship, $items) {
    $tx = ''; $sub = 0;
    foreach ($items as $i) { $tx .= '<Transaction><Item><ItemID>' . $i[0] . '</ItemID><Title>' . htmlspecialchars($i[1], ENT_XML1) . '</Title></Item><QuantityPurchased>1</QuantityPurchased><TransactionPrice currencyID="GBP">' . $i[2] . '</TransactionPrice></Transaction>'; $sub += (float)$i[2]; }
    return '<Order><OrderID>' . $id . '</OrderID><OrderStatus>Completed</OrderStatus><Subtotal currencyID="GBP">' . $sub . '</Subtotal><Total currencyID="GBP">' . $total . '</Total>'
        . ($paid !== '' ? '<AmountPaid currencyID="GBP">' . $paid . '</AmountPaid>' : '')
        . '<CreatedTime>' . $created . '</CreatedTime><ShippingServiceSelected><ShippingServiceCost currencyID="GBP">' . $ship . '</ShippingServiceCost></ShippingServiceSelected>'
        . '<TransactionArray>' . $tx . '</TransactionArray></Order>';
};
$TOUCH = $paidOrder('23-15132-37787', '2026-09-12T10:00:00.000Z', '237.74', '249.19', '10.55', array(array('336800483290', 'Dell Latitude 5520 15.6" Touchscreen I5-1145G7, 16GB RAM, 512GB NVMe, W11 Pro', '227.19')));
list($ok, $pp) = shop_ebay_parse($xml($TOUCH));
check($ok && $pp['orders'][0]['paid'] === 249.19 && $pp['orders'][0]['total'] === 237.74, 'AmountPaid is read beside Total', $pp['orders'][0]);
$m = shop_ebay_machines($pp['orders'][0]);
check(count($m) === 1 && $m[0]['cost'] === '249.19', 'one machine: its cost is what we paid (249.19), not item + postage (237.74)', $m);
list($ok, $pp) = shop_ebay_parse($xml($paidOrder('23-1-1', '2026-10-01T10:00:00.000Z', '237.74', '', '10.55', array(array('1', 'Dell Latitude 5520 i5-1145G7 16GB', '227.19')))));
check(shop_ebay_machines($pp['orders'][0])[0]['cost'] === '237.74', 'no AmountPaid: the order Total');
$o3 = array('order' => 'x', 'subtotal' => 0, 'shipping' => 0, 'total' => 0, 'paid' => 0, 'items' => array(array('item' => '9', 'title' => 'Dell Latitude 5520 i5-1145G7 16GB', 'price' => 200.0, 'qty' => 1)));
check(shop_ebay_machines($o3)[0]['cost'] === '200.00', 'neither: item + postage, as before');
// three items, a total that doesn't divide evenly: the shares add up to the penny (the bank feed matches the whole order)
list($ok, $pp) = shop_ebay_parse($xml($paidOrder('26-1-2', '2026-10-21T10:00:00.000Z', '600.00', '631.01', '0.00', array(
    array('411111111111', 'Dell Latitude 5520 i5-1145G7 16GB 256GB', '200.00'), array('411111111112', 'Dell Latitude 5520 i5-1135G7 16GB 256GB', '200.00'), array('411111111113', 'Dell OptiPlex 7080 SFF i5-10500 16GB', '200.00')))));
$m = shop_ebay_machines($pp['orders'][0]);
$sum = array_sum(array_map(function ($x) { return (float)$x['cost']; }, $m));
check(count($m) === 3 && abs($sum - 631.01) < 0.001 && $m[0]['cost'] === '210.34' && $m[2]['cost'] === '210.33', 'three machines: shared to the penny, adding up to exactly what was paid', $m);
// a parts line in the order still takes its share - the machine is not charged for the charger
list($ok, $pp) = shop_ebay_parse($xml($paidOrder('26-1-3', '2026-10-21T10:00:00.000Z', '220.00', '231.00', '0.00', array(
    array('511111111111', 'Dell Latitude 5520 i5-1145G7 16GB 256GB', '200.00'), array('511111111112', 'Dell 65W USB-C Laptop Charger Adapter', '20.00')))));
$m = shop_ebay_machines($pp['orders'][0]);
check(count($m) === 1 && $m[0]['cost'] === '210.00', 'a charger in the same order keeps its own share (210.00 of 231.00)', $m);

// the one-off correction: listed purchases not yet posted to QuickBooks take the right cost; a posted one keeps its own
$st = shop_read();
$st['ebay']['ok_at'] = $now; unset($st['ebay']['cost_v']);
$st['bought']['23-15132-37787#336800483290'] = array('order' => '23-15132-37787', 'item' => '336800483290', 'sku' => '483290', 'title' => 'Dell Latitude 5520 15.6" Touchscreen', 'qty' => 1,
    'cost' => '237.74', 'model' => 'latitude-5520', 'date' => '2026-09-12', 'created' => strtotime('2026-09-12T10:00:00Z'), 'seen' => $now, 'status' => 'waiting', 'qbo_item' => 'Dell Latitude 5520 Laptop 15.6" Touchscreen');
$st['bought']['26-1-3#511111111111'] = array('order' => '26-1-3', 'item' => '511111111111', 'sku' => '111111', 'title' => 'Dell Latitude 5520', 'qty' => 1,
    'cost' => '200.00', 'model' => 'latitude-5520', 'date' => '2026-10-21', 'created' => strtotime('2026-10-21T10:00:00Z'), 'seen' => $now, 'status' => 'waiting', 'qbo_id' => '999');
file_put_contents(SHOP_STATE, json_encode($st));
$ANSWER = array(true, shop_ebay_parse($xml($TOUCH . $paidOrder('26-1-3', '2026-10-21T10:00:00.000Z', '220.00', '231.00', '0.00', array(
    array('511111111111', 'Dell Latitude 5520 i5-1145G7 16GB 256GB', '200.00'), array('511111111112', 'Dell 65W USB-C Laptop Charger Adapter', '20.00')))))[1]);
$ASKED = array(); $T2 = strtotime('2026-10-22T12:00:00Z');
$r = shop_ebay_sweep(true, $T2, $get, $connect, $api, $slack);
check($r[0] && $ASKED[0][0] <= $T2 - 89 * 86400, 'the first look after the fix goes back the full 90 days again', $ASKED);
$d = shop_read();
check($d['bought']['23-15132-37787#336800483290']['cost'] === '249.19' && $d['bought']['23-15132-37787#336800483290']['cost_was'] === '237.74', 'the listed 5520 (linked to its stock item, nothing posted) now costs what was paid; the old figure is kept beside it', $d['bought']['23-15132-37787#336800483290']);
check($d['bought']['26-1-3#511111111111']['cost'] === '200.00' && !isset($d['bought']['26-1-3#511111111111']['cost_was']), 'one already posted to QuickBooks keeps its cost (its purchase says it)');
check((int)$d['ebay']['cost_v'] === EBAY_COST_V, 'the fix is recorded as done');
$ASKED = array();
shop_ebay_sweep(true, $T2 + 600, $get, $connect, $api, $slack);
check($ASKED[0][0] === $T2 - 2 * 86400, 'after that, looks go back to two days before the last good one', $ASKED);

echo "H  the Shop tab: each machine's own name, grade and notes - and its stock item renamed to match\n";
check(shop_bought_suggest('Dell Latitude 5520 15.6" FHD i5-1145G7 16GB RAM 512GB NVMe SSD Windows 11 Pro') === 'Dell Latitude 5520 15.6" FHD i5-1145G7 16GB RAM Windows 11 Pro', 'the suggested name: the drive goes (a new SSD goes in), the memory stays');
check(shop_bought_suggest('Latitude 5400 i5-8365U, 8GB, 256GB SSD, Windows 11 Pro') === 'Dell Latitude 5400 i5-8365U, 8GB, Windows 11 Pro', '... its comma goes with it, and "Dell" goes in front');
check(shop_bought_suggest('Dell Latitude 7490 i7 8th Gen 16GB/512GB SSD Win11 Grade A') === 'Dell Latitude 7490 i7 8th Gen 16GB Win11', '... "16GB/512GB": only the drive goes; so does the seller\'s "Grade A" (ours is set here)');
check(shop_bought_suggest('Dell OptiPlex 7070 SFF i5-9500 8GB DDR4 1TB HDD Win 11') === 'Dell OptiPlex 7070 SFF i5-9500 8GB DDR4 Win 11'
    && shop_bought_suggest('Dell Precision 3551 i7 32GB 1TB NVMe Quadro P620 4GB') === 'Dell Precision 3551 i7 32GB Quadro P620 4GB', '... a hard disk goes; a graphics card\'s 4GB stays');
check(shop_bought_suggest('Dell Latitude 5490 - i5 - 8GB - 256GB SSD - Win 11') === 'Dell Latitude 5490 - i5 - 8GB - Win 11'
    && shop_bought_suggest('Dell Latitude 3420 i5-1135G7 8GB 256GB Win 11') === 'Dell Latitude 3420 i5-1135G7 8GB Win 11', '... dashes tidied; a bare "256GB" after the memory is the drive');
check(shop_item_name('Dell Latitude 5520 - SKU 659085', '659085') === 'Dell Latitude 5520 - SKU 659085' && shop_item_name('Dell Latitude 5520', '659085') === 'Dell Latitude 5520 - SKU 659085', 'a name that already ends with its SKU doesn\'t get it twice');

$K = '23-15300-11111#147547371220';
$r = shop_ebay_edit($K, array('name' => str_repeat('x', 150)), 'Steve', $now);
check($r === 'ok' && strlen(shop_read()['bought'][$K]['name']) === 100, 'a name is 100 characters at most (QuickBooks\' limit)');
$r = shop_ebay_edit($K, array('name' => "  Dell OptiPlex 7080 SFF i5-10500\t16GB  ", 'grade' => 'b',
    'notes' => "Light scuff on the top.\r\nNew 512GB SSD fitted.\r\n\r\n\r\n\r\nNew thermal paste."), 'Steve', $now);
$b = shop_read()['bought'][$K];
check($r === 'ok' && $b['name'] === 'Dell OptiPlex 7080 SFF i5-10500 16GB' && $b['grade'] === 'B' && $b['notes'] === "Light scuff on the top.\nNew 512GB SSD fitted.\n\nNew thermal paste." && $b['edited_by'] === 'Steve',
    'saved: the name tidied, the grade, the notes (line breaks kept, runs of blank lines cut)', $b);
$row = null; foreach (shop_bought_rows($cat, shop_read()) as $x) if ($x['key'] === $K) $row = $x;
check($row && $row['name'] === $b['name'] && $row['grade'] === 'B' && $row['notes'] === $b['notes'] && $row['title'] === $b['title'] && $row['suggest'] !== '' && $row['edited'] === 'Steve',
    'the Shop tab shows them, with eBay\'s title kept beside', $row);
check(shop_ebay_edit($K, array('name' => 'X', 'grade' => 'D'), 'Steve') === 'the grade must be A, B or C' && shop_read()['bought'][$K]['name'] === $b['name'], 'a grade the website doesn\'t use is refused, nothing changed');
check(strpos(shop_ebay_edit($K, array('name' => 'X', 'notes' => str_repeat('a', 1001)), 'Steve'), 'too long') !== false && shop_read()['bought'][$K]['name'] === $b['name'], 'notes over 1,000 characters are refused');
check(shop_ebay_edit('nope#1', array('name' => 'X'), 'Steve') === 'no such eBay purchase', 'an unknown purchase is refused');

// its stock item (made here in D, with eBay's title) takes the new name
shop_stock_remember(shop_qbo_stock_items($C, $api), array('371220'));
$skuItem = function ($sku) use (&$QB) { foreach ($QB['Item'] as $o) if ($o['Sku'] === $sku) return $o; return null; };
$was = $skuItem('371220'); $nitems = count($QB['Item']); $C2 = $C; $C2['live'] = false;
$r = shop_qbo_rename_bought($C2, $K, $api);
check(!$r[0] && strpos($r[1], 'switched off') !== false && $skuItem('371220')['Name'] === $was['Name'], 'QuickBooks writing switched off: nothing renamed');
$r = shop_qbo_rename_bought($C, $K, $api); $it = $skuItem('371220');
check($r[0] && $it['Id'] === $was['Id'] && $it['Name'] === 'Dell OptiPlex 7080 SFF i5-10500 16GB - SKU 371220' && $it['Description'] === 'Dell OptiPlex 7080 SFF i5-10500 16GB' && $it['Sku'] === '371220' && count($QB['Item']) === $nitems,
    'renamed in QuickBooks: the same stock item (no new one), its SKU on the end of the name, the name as its sales description', array($r, $it));
check($it['PurchaseDesc'] === $was['PurchaseDesc'] && stripos($it['PurchaseDesc'], 'optiplex 7080') !== false, 'its purchase description still says what was bought on eBay');
$d = shop_read();
check($d['bought'][$K]['qbo_item'] === $it['Name'] && $d['stock']['371220']['name'] === $it['Name'] && strpos($r[1], $was['Name']) !== false, 'the Shop tab names it by its new name at once; the note says what it was called', $r);

check(shop_qbo_rename_bought($C, $K, $api)[0] && strpos(shop_qbo_rename_bought($C, $K, $api)[1], 'already called') !== false && $skuItem('371220')['SyncToken'] === '1', 'saved again with the same name: QuickBooks isn\'t touched');

// the September 5520: its stock item was made by hand (SKU typed ": 659085"), and another item already has the name wanted
$K5 = '20-15135-03052#336745659085';
$QB['Item'][] = array('Id' => '777', 'Name' => 'Dell Latitude 5520 i5 16GB - SKU 659085', 'Sku' => '000777', 'Type' => 'Inventory', 'QtyOnHand' => 0, 'PurchaseCost' => 1);
shop_ebay_edit($K5, array('name' => 'Dell Latitude 5520 i5 16GB', 'grade' => 'A'), 'Steve');
$r = shop_qbo_rename_bought($C, $K5, $api);
check(!$r[0] && strpos($r[1], 'already has another item called "Dell Latitude 5520 i5 16GB - SKU 659085"') !== false && $skuItem(': 659085')['Name'] === 'Dell Latitude 5520 Laptop Core I5 11th Gen',
    'a name another item already has: QuickBooks\' refusal explained, nothing renamed', $r);
shop_ebay_edit($K5, array('name' => 'Dell Latitude 5520 i5-1145G7 16GB RAM', 'grade' => 'A'), 'Steve');
$r = shop_qbo_rename_bought($C, $K5, $api); $it = $skuItem(': 659085');
check($r[0] && $it['Id'] === '202' && $it['Name'] === 'Dell Latitude 5520 i5-1145G7 16GB RAM - SKU 659085' && $it['Sku'] === ': 659085', 'a hand-made stock item is renamed too; its SKU as typed is left alone', array($r, $it));

// not in QuickBooks yet: nothing to rename - the stock item is made with the Shop tab's name when it goes in
$KN = '26-1-9#522222222222'; $st = shop_read();
$st['bought'][$KN] = array('order' => '26-1-9', 'item' => '522222222222', 'sku' => '222222', 'title' => 'Dell Latitude 5420 i5-1145G7 16GB 256GB NVMe SSD Win 11', 'qty' => 1,
    'cost' => '210.00', 'model' => 'latitude-5420', 'date' => '2026-10-22', 'created' => $T2, 'seen' => $T2, 'status' => 'waiting');
file_put_contents(SHOP_STATE, json_encode($st));
shop_ebay_edit($KN, array('name' => 'Dell Latitude 5420 i5-1145G7 16GB'), 'Steve');
$r = shop_qbo_rename_bought($C, $KN, $api);
check($r[0] && strpos($r[1], 'isn\'t in QuickBooks yet') !== false && $skuItem('222222') === null, 'not in QuickBooks yet: nothing made or renamed', $r);
$r = shop_qbo_bought($C, $KN, $api);
check($r[0] && $skuItem('222222')['Name'] === 'Dell Latitude 5420 i5-1145G7 16GB - SKU 222222', 'when it goes in, its stock item takes the Shop tab\'s name', $skuItem('222222'));
shop_ebay_edit($KN, array('name' => ''), 'Steve');
check(!isset(shop_read()['bought'][$KN]['name']) && shop_bought_name(shop_read()['bought'][$KN]) === 'Dell Latitude 5420 i5-1145G7 16GB 256GB NVMe SSD Win 11', 'an empty name goes back to eBay\'s title');

echo "\n" . ($fails ? "$fails FAILED\n" : "ALL PASSED\n");
array_map('unlink', glob($TMP . '/*') ?: array()); @rmdir($TMP);
exit($fails ? 1 : 0);
