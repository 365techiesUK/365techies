<?php
/*
 * The refurbished Dells' books - each machine's own STOCK ITEM in QuickBooks: found by its SKU, sold off it, and made with
 * its eBay purchase when it isn't there yet (shop-books-lib.php, 14 Oct 2026). CLI only:
 *   C:\tools\php\php.exe -d extension=mbstring api/shop-books-test.php
 * Against a pretend QuickBooks (a function standing in for invq_api) and a pretend customer maker: QuickBooks is never called.
 */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
error_reporting(E_ALL);
$TMP = sys_get_temp_dir() . '/shopbookstest-' . getmypid();
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
require __DIR__ . '/shop-books-lib.php';
$fails = 0;
function check($ok, $what, $detail = '') { global $fails; echo ($ok ? "  PASS  " : "  FAIL  ") . $what . ($ok ? '' : "  [" . (is_string($detail) ? $detail : json_encode($detail)) . "]") . "\n"; if (!$ok) $fails++; }

$CAT = array('delivery' => '15.00', 'units' => array(
    'latitude-5520-01' => array('status' => 'live', 'ed' => 1, 'price' => '560.00', 'name' => 'Dell Latitude 5520 (Grade A)', 'kind' => 'laptop', 'sku' => '659085', 'ebay' => '20-15135-03052'),
    'optiplex-7080-01' => array('status' => 'live', 'ed' => 1, 'price' => '590.00', 'name' => 'Dell OptiPlex 7080 (Grade B)', 'kind' => 'desktop', 'sku' => '999001'),
    'optiplex-3060-01' => array('status' => 'live', 'ed' => 1, 'price' => '480.00', 'name' => 'Dell OptiPlex 3060 (Grade A)', 'kind' => 'desktop'),
    'test-01' => array('status' => 'test', 'ed' => 1, 'price' => '1.00', 'name' => 'TEST LISTING - Dell Latitude 5520', 'kind' => 'laptop')));
file_put_contents(SHOP_CAT, "<?php\nreturn json_decode('" . str_replace(array('\\', "'"), array('\\\\', "\\'"), json_encode($CAT)) . "', true);\n");
$cat = shop_catalogue();
$C = array('ok' => true, 'live' => true, 'only' => '', 'tax' => '20', 'realm' => '9130', 'host' => 'https://app.qbo.intuit.com');

/* The pretend QuickBooks: queries answer from $QB, creates add to it; every call recorded. */
$inv = function ($id, $name, $sku, $qty, $cost, $acc = array('81', '82', '83')) {
    return array('Id' => $id, 'Name' => $name, 'Sku' => $sku, 'Type' => 'Inventory', 'QtyOnHand' => $qty, 'PurchaseCost' => $cost,
        'AssetAccountRef' => array('value' => $acc[0]), 'IncomeAccountRef' => array('value' => $acc[1]), 'ExpenseAccountRef' => array('value' => $acc[2]));
};
$QB = array('Account' => array(array('Id' => '35', 'Name' => 'PayPal Bank', 'AccountType' => 'Bank'), array('Id' => '41', 'Name' => 'Lloyds Current', 'AccountType' => 'Bank'),
    array('Id' => '77', 'Name' => 'Amex', 'AccountType' => 'Credit Card'), array('Id' => '90', 'Name' => 'Sales', 'AccountType' => 'Income')),
    'Item' => array(), 'Vendor' => array(array('Id' => '501', 'DisplayName' => 'eBay')), 'Purchase' => array(), 'SalesReceipt' => array());
$CALLS = array(); $NEXT = 1000; $REFUSE = ''; $DUPNAME = false;
$api = function ($c, $method, $path, $body = null) use (&$QB, &$CALLS, &$NEXT, &$REFUSE, &$DUPNAME) {
    $CALLS[] = array($method, $path, $body);
    if ($method === 'GET' && preg_match('#^/query\?query=(.*)$#', $path, $m)) {
        $sql = rawurldecode($m[1]);
        if (preg_match("/from Account where Active/", $sql)) return array('code' => 200, 'json' => array('QueryResponse' => array('Account' => $QB['Account'])));
        if (preg_match("/^select \* from Item where Type = 'Inventory' startposition (\d+) maxresults (\d+)$/", $sql, $q)) {
            $rows = array_values(array_filter($QB['Item'], function ($i) { return ($i['Type'] ?? '') === 'Inventory'; }));
            $rows = array_slice($rows, (int)$q[1] - 1, (int)$q[2]);
            return array('code' => 200, 'json' => array('QueryResponse' => $rows ? array('Item' => $rows) : new stdClass()));
        }
        if (preg_match("/^select Id from (\w+) where (\w+) = '(.*)'$/", $sql, $q)) {
            foreach ($QB[$q[1]] as $row) if ((string)($row[$q[2]] ?? '') === stripslashes($q[3])) return array('code' => 200, 'json' => array('QueryResponse' => array($q[1] => array(array('Id' => $row['Id'])))));
            return array('code' => 200, 'json' => array('QueryResponse' => new stdClass()));
        }
        return array('code' => 400, 'json' => array('Fault' => array('Error' => array(array('Message' => 'bad query')))));
    }
    if ($method === 'POST' && preg_match('#^/(account|item|vendor|purchase|salesreceipt)$#', $path, $m)) {
        $kind = array('account' => 'Account', 'item' => 'Item', 'vendor' => 'Vendor', 'purchase' => 'Purchase', 'salesreceipt' => 'SalesReceipt')[$m[1]];
        if ($REFUSE === $kind) return array('code' => 400, 'json' => array('Fault' => array('Error' => array(array('Message' => 'Business Validation Error')))));
        if ($kind === 'Item' && $DUPNAME) { $DUPNAME = false; return array('code' => 400, 'json' => array('Fault' => array('Error' => array(array('Message' => 'Duplicate Name Exists Error'))))); }
        $row = (array)$body; $row['Id'] = (string)(++$NEXT); $QB[$kind][] = $row;
        return array('code' => 200, 'json' => array($kind => $row));
    }
    return array('code' => 404, 'json' => null);
};
$ENSURED = array();
$ensure = function ($c, $job, $why) use (&$ENSURED) { $ENSURED[] = $job; return array('ok' => true, 'cid' => '777', 'existed' => false); };
$posts = function ($kind) use (&$CALLS) { $n = 0; foreach ($CALLS as $x) if ($x[0] === 'POST' && $x[1] === '/' . $kind) $n++; return $n; };
$lastof = function ($kind) use (&$QB) { $a = $QB[$kind]; return end($a); };

echo "A  setting QuickBooks up for the shop\n";
$a = shop_qbo_money_accounts($C, $api);
check(count($a) === 4 - 1 && $a[0]['name'] === 'PayPal Bank' && $a[0]['type'] === 'Bank', 'the accounts to choose from: bank and card only, PayPal first', $a);
$r = shop_qbo_setup($C, '90', '41', $api);
check(!$r[0] && strpos($r[1], 'PayPal pays') !== false, 'an income account is refused as "where PayPal pays in"', $r);
$r = shop_qbo_setup($C, '35', '77', $api);
check(!$r[0] && strpos($r[1], 'no stock items') !== false && $posts('item') === 0, 'no stock items in QuickBooks yet: nothing is made, it says why', $r);
// the business's own stock items, as they really are typed (SKU spellings from the real books, 14 Oct 2026)
$QB['Item'][] = $inv('201', 'Dell Latitude 5520 Laptop Core I5 11th', ': 456590', 1, 180);
$QB['Item'][] = $inv('202', 'Dell Latitude 5520 Laptop Core I5 11th Gen', '659085', 1, 180);
$QB['Item'][] = $inv('203', 'Dell Latitude E5570 15" Core i5 (1)', 'SKU 582117/1', 0, 200);
$QB['Item'][] = $inv('204', 'Dell Latitude E5570 15" Core i5 (2)', 'SKU 582117/2', 1, 200);
$QB['Item'][] = $inv('205', 'Dell E5570 15.6" i5 6200U', 'SKU856968', 0, 239.99);
$QB['Item'][] = $inv('206', 'Dell E5570 15.6" i5 6200U (b)', 'SKU856968', 0, 239.99);
$QB['Item'][] = $inv('207', 'Dell OptiPlex 3060 SFF i5-8500', 'SKU 853688', 2, 104.72);
$QB['Item'][] = $inv('208', 'Docking Station', '', 3, 13.49, array('81', '95', '96'));
$QB['Item'][] = array('Id' => '209', 'Name' => 'Online Remote Support', 'Type' => 'Service');
$r = shop_qbo_setup($C, '35', '77', $api);
check($r[0] && strpos($r[1], '8 stock items') !== false && strpos($r[1], 'item "Delivery - online orders"') !== false && strpos($r[1], 'vendor') === false, 'set up: linked to the stock items; makes the delivery item; finds the eBay vendor that was there', $r);
$d = shop_read(); $q = shop_qbo_ids($d, $C);
check($q && $q['asset'] === '81' && $q['income'] === '82' && $q['cogs'] === '83', 'a new machine\'s stock item will copy the accounts most of the stock items use', $q);
check($q['vendor'] === '501' && $q['deposit'] === '35' && $q['pay'] === '77' && $q['pay_type'] === 'Credit Card' && $q['v'] === 2, 'the setup remembered, with the card that pays eBay', $q);
$del = $lastof('Item');
check($del['Name'] === 'Delivery - online orders' && $del['Type'] === 'Service' && $del['IncomeAccountRef']['value'] === '82', 'delivery is income beside the machines\' sales');
check($posts('account') === 0, 'no new accounts any more (the stock items have theirs)');
$r = shop_qbo_setup($C, '35', '77', $api);
check($r[0] && $posts('item') === 1, 'running it again makes nothing twice', $r);
check(shop_qbo_ids($d, array('realm' => 'OTHER') + $C) === null, 'a different QuickBooks company: the setup does not count');
check(shop_qbo_ids(array('qbo' => array('income' => '1', 'cogs' => '2', 'item' => '3', 'delivery' => '4', 'vendor' => '5', 'deposit' => '35', 'pay' => '77', 'realm' => '9130')), $C) === null,
    'the setup from before the change (an expense account and a non-inventory item) does not count: it is made again');

echo "B  SKUs, the way they are typed\n";
check(shop_sku_norm('SKU 582117/2') === '582117/2' && shop_sku_norm('Item number 053353') === '053353' && shop_sku_norm(': 456590') === '456590'
    && shop_sku_norm("\xE2\x9D\x8CSKU 626001") === '626001' && shop_sku_norm('SKU856968') === '856968' && shop_sku_norm('item number 258049') === '258049', 'every spelling in the real books comes down to the number');
check(shop_sku_from_item('336745659085') === '659085' && shop_sku_from_item('800613483290') === '483290', 'an eBay item number -> its last six digits');
$items = shop_qbo_stock_items($C, $api);
check(count($items) === 8 && $items[0]['sku'] === ': 456590' && $items[0]['qty'] === 1.0 && $items[0]['cost'] === '180.00', 'the stock items read (the service item is not one)', $items[0]);
$f = shop_stock_find($items, '456590'); check(($f['item']['id'] ?? '') === '201', 'found by SKU though it was typed ": 456590"');
$f = shop_stock_find($items, '582117/2'); check(($f['item']['id'] ?? '') === '204', 'a unit of a multi-buy, by its /2');
$f = shop_stock_find($items, '856968'); check(($f['err'] ?? '') === 'several' && count($f['names']) === 2, 'two sold items share a SKU: never guessed');
$f = shop_stock_find($items, '123456'); check(($f['err'] ?? '') === 'none', 'no such SKU: none');
check(shop_stock_find($items, '')['err'] === 'nosku', 'no SKU at all: said so');
check(strpos(shop_stock_why(shop_stock_find($items, '856968'), '856968'), 'different SKU') !== false, 'the "several" answer tells you what to do');

echo "C  a machine's purchase\n";
check(shop_purchase_clean(array('order' => '20-15135-03052', 'date' => '2026-09-11', 'total' => '£180.00')) === array('order' => '20-15135-03052', 'date' => '2026-09-11', 'total' => '180.00', 'ssd' => SHOP_SSD_DEFAULT), 'the eBay order cleaned; the SSD defaults to a 990 PRO');
check(shop_purchase_clean(array('order' => 'x', 'date' => '2026-02-30', 'total' => '1')) === 'the date it was bought (yyyy-mm-dd)', 'an impossible date is refused');
check(shop_purchase_clean(array('order' => 'x', 'date' => '2026-09-11', 'total' => '0')) === 'what it cost on eBay', 'no cost: refused');
$u = $cat['units']['latitude-5520-01'];
check(shop_qbo_purchase($C, 'latitude-5520-01', $u, $api)[1] === 'no purchase recorded for this machine', 'nothing recorded yet: nothing posted');
$p = shop_purchase_clean(array('order' => '20-15135-03052', 'date' => '2026-09-11', 'total' => '180', 'ssd' => '229.99'));
check(shop_book_purchase('latitude-5520-01', $u, $p, 'Steve', 1792000000) === true, 'what it cost is kept');
check(shop_qbo_purchase(array('live' => false) + $C, 'latitude-5520-01', $u, $api)[1] === 'QuickBooks writing is switched off ($QBO_LIVE_ENABLED)', 'QuickBooks writing off: nothing posted');
check(shop_qbo_purchase(array('only' => 'KEY') + $C, 'latitude-5520-01', $u, $api)[0] === false, 'one-customer test mode: nothing posted');
$n = count($CALLS); $pp = $posts('purchase'); $pi = $posts('item');
$r = shop_qbo_purchase($C, 'latitude-5520-01', $u, $api);
check($r[0] && $r[1] === '' && strpos($r[2], 'already in QuickBooks') !== false && $posts('purchase') === $pp && $posts('item') === $pi, 'the 5520 is ALREADY a stock item (SKU 659085, made by hand): linked, nothing posted - no double count', $r);
check(shop_read()['books']['latitude-5520-01#1']['purchase']['qbo_item'] === 'Dell Latitude 5520 Laptop Core I5 11th Gen', 'and the portal knows which stock item it is');
$u2 = $cat['units']['optiplex-7080-01'];
shop_book_purchase('optiplex-7080-01', $u2, shop_purchase_clean(array('order' => '06-15161-52446', 'date' => '2026-09-11', 'total' => '229.09')), 'Steve');
$r = shop_qbo_purchase($C, 'optiplex-7080-01', $u2, $api);
check($r[0] && strpos($r[1], '/app/expense?txnId=') !== false && strpos($r[2], 'made the stock item') !== false, 'the 7080 has no stock item: made, with its purchase - a link to the purchase', $r);
$it = $lastof('Item');
check($it['Type'] === 'Inventory' && $it['Sku'] === '999001' && $it['TrackQtyOnHand'] === true && $it['QtyOnHand'] === 0 && $it['InvStartDate'] === '2026-09-10'
    && $it['AssetAccountRef']['value'] === '81' && $it['IncomeAccountRef']['value'] === '82' && $it['ExpenseAccountRef']['value'] === '83' && $it['PurchaseCost'] === 229.09,
    'the stock item: the SKU, nothing in stock yet, from the day before, the usual accounts, at its cost', $it);
check($it['Name'] === 'Dell OptiPlex 7080 (Grade B) - SKU 999001', 'named the business\'s way: what it is, then the SKU', $it['Name']);
$pb = $lastof('Purchase');
check($pb['DocNumber'] === 'EB06-15161-52446' && $pb['TxnDate'] === '2026-09-11' && $pb['PaymentType'] === 'CreditCard' && $pb['AccountRef']['value'] === '77' && $pb['EntityRef'] === array('value' => '501', 'type' => 'Vendor'), 'the purchase: eBay, on the card, on the day, numbered from the order', $pb);
$ln = $pb['Line'][0];
check($ln['DetailType'] === 'ItemBasedExpenseLineDetail' && $ln['Amount'] === 229.09 && $ln['ItemBasedExpenseLineDetail']['ItemRef']['value'] === $it['Id'] && $ln['ItemBasedExpenseLineDetail']['Qty'] === 1
    && $ln['ItemBasedExpenseLineDetail']['UnitPrice'] === 229.09 && $ln['ItemBasedExpenseLineDetail']['TaxCodeRef']['value'] === '20', 'one item line: 1 into stock at £229.09, No VAT (it brings the stock item in; the SSD is NOT posted)', $ln);
$pp = $posts('purchase'); $pi = $posts('item');
$r = shop_qbo_purchase($C, 'optiplex-7080-01', $u2, $api);
check($r[0] && $posts('purchase') === $pp && $posts('item') === $pi, 'pressed twice: one stock item, one purchase');
$st = json_decode(file_get_contents(SHOP_STATE), true); unset($st['books']['optiplex-7080-01#1']['purchase']['qbo_id']); file_put_contents(SHOP_STATE, json_encode($st));
$r = shop_qbo_purchase($C, 'optiplex-7080-01', $u2, $api);
check($r[0] && $posts('purchase') === $pp && $posts('item') === $pi, 'our record lost: QuickBooks now has that SKU - linked, not made again', $r);
shop_book_purchase('optiplex-7080-01', $u2, array('total' => '235.00') + shop_purchase_clean(array('order' => '06-15161-52446', 'date' => '2026-09-11', 'total' => '229.09')), 'Steve');
$st = json_decode(file_get_contents(SHOP_STATE), true);
check(!isset($st['books']['optiplex-7080-01#1']['purchase']['qbo_differs']), '(that record had no purchase id left, so no "changed" flag)');
$u3 = $cat['units']['optiplex-3060-01'];
shop_book_purchase('optiplex-3060-01', $u3, shop_purchase_clean(array('order' => '18-12918-42351', 'date' => '2025-04-07', 'total' => '105.25')), 'Steve');
$r = shop_qbo_purchase($C, 'optiplex-3060-01', $u3, $api);
check(!$r[0] && strpos($r[1], 'sku=') !== false, 'a listing with no SKU: refused, and it says where the SKU goes', $r);
// the eBay path's own cases, straight through shop_qbo_stock_purchase
$P = array('order' => '23-15300-11111', 'date' => '2026-10-15', 'total' => '1213.52', 'qty' => 11, 'sku' => '782853', 'title' => 'Dell OptiPlex 3060 SFF x6 + 3070 x5', 'doc' => 'EB23-15300-11111', 'note' => 'job lot');
$r = shop_qbo_stock_purchase($C, $q, $P, $api); $ln = $lastof('Purchase')['Line'][0];
check($r[0] && $ln['ItemBasedExpenseLineDetail']['Qty'] === 11 && $ln['Amount'] === 1213.52 && abs($ln['ItemBasedExpenseLineDetail']['UnitPrice'] * 11 - 1213.52) < 0.001 && $lastof('Item')['PurchaseCost'] === 110.32, 'a job lot of 11: eleven into stock, the total exact, £110.32 each', $ln);
$DUPNAME = true;
$r = shop_qbo_stock_purchase($C, $q, array('sku' => '111222', 'doc' => 'EB01-11111-22222', 'order' => '01-11111-22222', 'qty' => 1) + $P, $api);
check($r[0] && strpos($lastof('Item')['Name'], '01-11111-22222') !== false, 'a name QuickBooks already has (6240): made unique with the order number', $lastof('Item')['Name']);
$REFUSE = 'Purchase';
$r = shop_qbo_stock_purchase($C, $q, array('sku' => '333444', 'doc' => 'EB02-22222-33333', 'order' => '02-22222-33333', 'qty' => 1) + $P, $api); $REFUSE = '';
check(!$r[0] && strpos($r[1], 'made the stock item') !== false && strpos($r[1], 'Business Validation Error') !== false, 'QuickBooks refuses the purchase: its own words, and that the empty stock item is there', $r);
check(shop_qbo_stock_purchase($C, $q, array('sku' => '856968') + $P, $api)[0] === false, 'a SKU two old items share: refused, nothing made');
check(strlen(shop_item_name(str_repeat('Dell Latitude 5520 ', 10) . ': x', '659085')) <= 100 && strpos(shop_item_name('Dell: A', '1'), ':') === false, 'names fit QuickBooks (100 characters, no colon - a colon makes a sub-item)');

echo "D  a machine's sale\n";
$sale = array('at' => 1792105200, 'unit' => 'latitude-5520-01', 'ed' => 1, 'order' => '8XY12345AB678901C', 'capture' => '5AB12345CD678901E', 'status' => 'completed',
    'amt' => '575.00', 'price' => '560.00', 'del' => '15.00', 'env' => 'live', 'fee' => '17.05', 'name' => 'Jane Smith', 'email' => 'jane@example.com', 'phone' => '07700900123',
    'lines' => array('1 High St', 'Poole'), 'postcode' => 'BH15 1AA');
$st = json_decode(file_get_contents(SHOP_STATE), true); $st['sales'][] = $sale; file_put_contents(SHOP_STATE, json_encode($st));
$r = shop_qbo_sale($C, $sale, $u, $api, $ensure);
check($r[0] && strpos($r[1], '/app/salesreceipt?txnId=') !== false, 'the sale goes in: a link to the sales receipt', $r);
$sr = $lastof('SalesReceipt');
check($sr['CustomerRef']['value'] === '777' && $sr['DepositToAccountRef']['value'] === '35' && $sr['DocNumber'] === 'WEB-8XY12345AB678901C' && $sr['TxnDate'] === '2026-10-16', 'the receipt: the buyer, paid into PayPal, numbered from the PayPal order, on the day - UK time (00:00 BST on the 16th is still the 15th in UTC)', $sr);
check(count($sr['Line']) === 2 && $sr['Line'][0]['Amount'] === 560.0 && $sr['Line'][0]['SalesItemLineDetail']['ItemRef']['value'] === '202' && $sr['Line'][0]['SalesItemLineDetail']['Qty'] === 1
    && $sr['Line'][1]['Amount'] === 15.0 && $sr['Line'][1]['SalesItemLineDetail']['ItemRef']['value'] === $q['delivery'] && $sr['Line'][1]['SalesItemLineDetail']['TaxCodeRef']['value'] === '20',
    'the machine comes off ITS stock item (SKU 659085 = item 202, so QuickBooks takes it out of stock and costs it), delivery £15, No VAT', $sr['Line']);
check(shop_read()['books']['latitude-5520-01#1']['sale']['item'] === 'Dell Latitude 5520 Laptop Core I5 11th Gen' && shop_read()['stock_at'] === 0, 'the book names the stock item; the portal will ask QuickBooks for the new count');
check($ENSURED[0]['email'] === 'jane@example.com' && $ENSURED[0]['addr'] === '1 High St, Poole' && $ENSURED[0]['postcode'] === 'BH15 1AA', 'the buyer is found or made as a QuickBooks customer with their address');
$n = $posts('salesreceipt'); $r = shop_qbo_sale($C, $sale, $u, $api, $ensure);
check($r[0] && $posts('salesreceipt') === $n, 'twice: one receipt');
$ne = count($ENSURED);
$s3 = array('unit' => 'optiplex-3060-01', 'order' => '9ZZ0000000000000A') + $sale;
$r = shop_qbo_sale($C, $s3, $u3, $api, $ensure);
check(!$r[0] && strpos($r[1], 'sku=') !== false && count($ENSURED) === $ne && $posts('salesreceipt') === $n, 'no SKU on the listing: not posted, and NOTHING made first (no stray customer)', $r);
$u9 = array('sku' => '424242') + $u3;
$r = shop_qbo_sale($C, $s3, $u9, $api, $ensure);
check(!$r[0] && strpos($r[1], 'no stock item with SKU 424242') !== false && count($ENSURED) === $ne, 'a SKU QuickBooks doesn\'t have: not posted, it says to add it there and try again', $r);
check(shop_qbo_sale($C, array('unit' => 'test-01') + $sale, $cat['units']['test-01'], $api, $ensure)[1] === 'a test sale - never in the books', 'the £1 test listing never goes in');
check(shop_qbo_sale($C, array('env' => 'sandbox') + $sale, $u, $api, $ensure)[0] === false, 'a PayPal sandbox sale never goes in');
$r = shop_books_after_sale(array('order' => 'ZZZ1234567890') + $sale, $u, function () { return array('ok' => false, 'why' => 'not_configured'); });
check(!$r[0] && strpos(shop_read()['books']['latitude-5520-01#1']['sale']['err'], 'not connected') !== false, 'QuickBooks not connected after a sale: the portal is told why (and offers a retry)');

echo "E  what the portal shows\n";
check(shop_stock_remember(shop_qbo_stock_items($C, $api), shop_stock_skus($cat, shop_read()), 1792200000), 'what QuickBooks says about each machine is remembered');
$d = shop_read();
check($d['stock_at'] === 1792200000 && $d['stock']['659085']['name'] === 'Dell Latitude 5520 Laptop Core I5 11th Gen' && !empty($d['stock']['999001']['id']) && !isset($d['stock']['test']), 'by SKU, for each listed machine', $d['stock']);
$rows = shop_books_rows($cat, $d);
$byid = array(); foreach ($rows as $row) $byid[$row['id']] = $row;
check(!isset($byid['test-01']) && isset($byid['latitude-5520-01'], $byid['optiplex-7080-01']), 'the test listing is never in the books');
$row = $byid['latitude-5520-01'];
check($row['profit'] === shop_money(575 - 180 - 229.99 - 17.05) && $row['sale']['name'] === 'Jane Smith' && $row['purchase']['total'] === '180.00' && (float)$row['stock']['qty'] === 1.0, 'profit = £575 paid - £180 eBay - £229.99 SSD - £17.05 PayPal fee = £' . shop_money(575 - 180 - 229.99 - 17.05), $row);
$st = json_decode(file_get_contents(SHOP_STATE), true); unset($st['books']['latitude-5520-01#1']['purchase']); file_put_contents(SHOP_STATE, json_encode($st));
$row = null; foreach (shop_books_rows($cat, shop_read()) as $rr) if ($rr['id'] === 'latitude-5520-01') $row = $rr;
check($row['purchase']['from'] === 'qbo' && $row['purchase']['total'] === '180.00' && $row['profit'] === shop_money(575 - 180 - 199.99 - 17.05), 'nothing typed in: what it cost comes from its QuickBooks stock item', $row['purchase']);
check($byid['optiplex-3060-01']['stock'] === null && $byid['optiplex-3060-01']['sku'] === '', 'no SKU: no stock item shown');
check($byid['optiplex-7080-01']['profit'] === null && $byid['optiplex-7080-01']['sale'] === null, 'not sold yet: no profit shown');
check(shop_mark_offline('optiplex-7080-01', $u2, 'Steve', true) === 'ok' && shop_state_of(shop_read(), 'optiplex-7080-01', $u2) === 'sold', 'sold on the phone: the website stops selling it at once');
check(shop_mark_offline('optiplex-7080-01', $u2, 'Steve', false) === 'ok' && shop_state_of(shop_read(), 'optiplex-7080-01', $u2) === 'available', 'a mistake: undone');
$st = json_decode(file_get_contents(SHOP_STATE), true); $st['u']['latitude-5520-01#1'] = array('st' => 'sold', 'order' => '8XY12345AB678901C'); file_put_contents(SHOP_STATE, json_encode($st));
check(strpos(shop_mark_offline('latitude-5520-01', $u, 'Steve', false), 'refund it in PayPal') !== false, 'an ONLINE sale can\'t be undone here (refund in PayPal, relist as a new edition)');

echo "\n" . ($fails ? "$fails FAILED\n" : "ALL PASSED\n");
array_map('unlink', glob($TMP . '/*') ?: array()); @rmdir($TMP);
exit($fails ? 1 : 0);
