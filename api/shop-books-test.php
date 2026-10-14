<?php
/*
 * The refurbished Dells' books - each machine's purchase and sale in QuickBooks (shop-books-lib.php, 14 Oct 2026). CLI only:
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
    'latitude-5520-01' => array('status' => 'live', 'ed' => 1, 'price' => '560.00', 'name' => 'Dell Latitude 5520 (Grade A)', 'kind' => 'laptop'),
    'optiplex-7080-01' => array('status' => 'live', 'ed' => 1, 'price' => '590.00', 'name' => 'Dell OptiPlex 7080 (Grade B)', 'kind' => 'desktop'),
    'test-01' => array('status' => 'test', 'ed' => 1, 'price' => '1.00', 'name' => 'TEST LISTING - Dell Latitude 5520', 'kind' => 'laptop')));
file_put_contents(SHOP_CAT, "<?php\nreturn json_decode('" . str_replace(array('\\', "'"), array('\\\\', "\\'"), json_encode($CAT)) . "', true);\n");
$cat = shop_catalogue();
$C = array('ok' => true, 'live' => true, 'only' => '', 'tax' => '20', 'realm' => '9130', 'host' => 'https://app.qbo.intuit.com');

/* The pretend QuickBooks: queries answer from $QB, creates add to it; every call recorded. */
$QB = array('Account' => array(array('Id' => '35', 'Name' => 'PayPal Bank', 'AccountType' => 'Bank'), array('Id' => '41', 'Name' => 'Lloyds Current', 'AccountType' => 'Bank'),
    array('Id' => '77', 'Name' => 'Amex', 'AccountType' => 'Credit Card'), array('Id' => '90', 'Name' => 'Sales', 'AccountType' => 'Income')),
    'Item' => array(), 'Vendor' => array(array('Id' => '501', 'DisplayName' => 'eBay')), 'Purchase' => array(), 'SalesReceipt' => array());
$CALLS = array(); $NEXT = 1000; $REFUSE = '';
$api = function ($c, $method, $path, $body = null) use (&$QB, &$CALLS, &$NEXT, &$REFUSE) {
    $CALLS[] = array($method, $path, $body);
    if ($method === 'GET' && preg_match('#^/query\?query=(.*)$#', $path, $m)) {
        $sql = rawurldecode($m[1]);
        if (preg_match("/from Account where Active/", $sql)) return array('code' => 200, 'json' => array('QueryResponse' => array('Account' => $QB['Account'])));
        if (preg_match("/^select Id from (\w+) where (\w+) = '(.*)'$/", $sql, $q)) {
            foreach ($QB[$q[1]] as $row) if ((string)($row[$q[2]] ?? '') === stripslashes($q[3])) return array('code' => 200, 'json' => array('QueryResponse' => array($q[1] => array(array('Id' => $row['Id'])))));
            return array('code' => 200, 'json' => array('QueryResponse' => new stdClass()));
        }
        return array('code' => 400, 'json' => array('Fault' => array('Error' => array(array('Message' => 'bad query')))));
    }
    if ($method === 'POST' && preg_match('#^/(account|item|vendor|purchase|salesreceipt)$#', $path, $m)) {
        $kind = array('account' => 'Account', 'item' => 'Item', 'vendor' => 'Vendor', 'purchase' => 'Purchase', 'salesreceipt' => 'SalesReceipt')[$m[1]];
        if ($REFUSE === $kind) return array('code' => 400, 'json' => array('Fault' => array('Error' => array(array('Message' => 'Business Validation Error')))));
        $row = (array)$body; $row['Id'] = (string)(++$NEXT); $QB[$kind][] = $row;
        return array('code' => 200, 'json' => array($kind => $row));
    }
    return array('code' => 404, 'json' => null);
};
$ENSURED = array();
$ensure = function ($c, $job, $why) use (&$ENSURED) { $ENSURED[] = $job; return array('ok' => true, 'cid' => '777', 'existed' => false); };
$posts = function ($kind) use (&$CALLS) { $n = 0; foreach ($CALLS as $x) if ($x[0] === 'POST' && $x[1] === '/' . $kind) $n++; return $n; };

echo "A  setting QuickBooks up for the shop\n";
$a = shop_qbo_money_accounts($C, $api);
check(count($a) === 4 - 1 && $a[0]['name'] === 'PayPal Bank' && $a[0]['type'] === 'Bank', 'the accounts to choose from: bank and card only, PayPal first', $a);
$r = shop_qbo_setup($C, '90', '41', $api);
check(!$r[0] && strpos($r[1], 'PayPal pays') !== false, 'an income account is refused as "where PayPal pays in"', $r);
$r = shop_qbo_setup($C, '35', '77', $api);
check($r[0] && strpos($r[1], 'account "Refurbished computer sales"') !== false && strpos($r[1], 'vendor') === false, 'set up: makes the two accounts and two items; finds the eBay vendor that was there', $r);
$d = shop_read(); $q = shop_qbo_ids($d, $C);
check($q && $q['vendor'] === '501' && $q['deposit'] === '35' && $q['pay'] === '77' && $q['pay_type'] === 'Credit Card', 'the setup remembered, with the card that pays eBay', $q);
$item = null; foreach ($QB['Item'] as $it) if ($it['Name'] === 'Refurbished computer') $item = $it;
check($item && $item['Type'] === 'NonInventory' && $item['IncomeAccountRef']['value'] === $q['income'] && $item['ExpenseAccountRef']['value'] === $q['cogs'], 'the machine item sells into the new income account and costs into the stock account');
$n0 = count($CALLS); $r = shop_qbo_setup($C, '35', '77', $api);
check($r[0] && strpos($r[1], 'already there') !== false && $posts('account') === 2, 'running it again makes nothing twice', $r);
check(shop_qbo_ids($d, array('realm' => 'OTHER') + $C) === null, 'a different QuickBooks company: the setup does not count');

echo "B  a machine's purchase\n";
check(shop_purchase_clean(array('order' => '20-15135-03052', 'date' => '2026-09-11', 'total' => '£180.00')) === array('order' => '20-15135-03052', 'date' => '2026-09-11', 'total' => '180.00', 'ssd' => SHOP_SSD_DEFAULT), 'the eBay order cleaned; the SSD defaults to a 990 PRO');
check(shop_purchase_clean(array('order' => 'x', 'date' => '2026-02-30', 'total' => '1')) === 'the date it was bought (yyyy-mm-dd)', 'an impossible date is refused');
check(shop_purchase_clean(array('order' => 'x', 'date' => '2026-09-11', 'total' => '0')) === 'what it cost on eBay', 'no cost: refused');
$u = $cat['units']['latitude-5520-01'];
check(shop_qbo_purchase($C, 'latitude-5520-01', $u, $api)[1] === 'no purchase recorded for this machine', 'nothing recorded yet: nothing posted');
$p = shop_purchase_clean(array('order' => '20-15135-03052', 'date' => '2026-09-11', 'total' => '180', 'ssd' => '229.99'));
check(shop_book_purchase('latitude-5520-01', $u, $p, 'Steve', 1792000000) === true, 'what it cost is kept');
check(shop_qbo_purchase(array('live' => false) + $C, 'latitude-5520-01', $u, $api)[1] === 'QuickBooks writing is switched off ($QBO_LIVE_ENABLED)', 'QuickBooks writing off: nothing posted');
check(shop_qbo_purchase(array('only' => 'KEY') + $C, 'latitude-5520-01', $u, $api)[0] === false, 'one-customer test mode: nothing posted');
$r = shop_qbo_purchase($C, 'latitude-5520-01', $u, $api);
check($r[0] && strpos($r[1], '/app/expense?txnId=') !== false, 'posted: a link to the expense in QuickBooks', $r);
$pb = end($QB['Purchase']);
check($pb['DocNumber'] === 'EB20-15135-03052' && $pb['TxnDate'] === '2026-09-11' && $pb['PaymentType'] === 'CreditCard' && $pb['AccountRef']['value'] === '77' && $pb['EntityRef'] === array('value' => '501', 'type' => 'Vendor'), 'the expense: eBay, on the card, on the day, numbered from the order', $pb);
$ln = $pb['Line'][0];
check($ln['Amount'] === 180.0 && $ln['AccountBasedExpenseLineDetail']['AccountRef']['value'] === $q['cogs'] && $ln['AccountBasedExpenseLineDetail']['TaxCodeRef']['value'] === '20' && strpos($ln['Description'], 'latitude-5520-01') !== false, 'one line: £180 to the stock account, No VAT; the SSD is NOT posted (it comes in from the bank)', $ln);
$n = $posts('purchase'); $r = shop_qbo_purchase($C, 'latitude-5520-01', $u, $api);
check($r[0] && $posts('purchase') === $n, 'pressed twice: one expense');
file_put_contents(SHOP_STATE, json_encode(array('books' => array()) + json_decode(file_get_contents(SHOP_STATE), true)));
shop_book_purchase('latitude-5520-01', $u, $p, 'Steve');
$r = shop_qbo_purchase($C, 'latitude-5520-01', $u, $api);
check($r[0] && $posts('purchase') === $n, 'our record lost but QuickBooks has that order number: linked, not made again');
shop_book_purchase('latitude-5520-01', $u, array('total' => '185.00') + $p, 'Steve');
check(shop_read()['books']['latitude-5520-01#1']['purchase']['qbo_differs'] === '180.00', 'the amount changed after it went in: flagged (we never edit QuickBooks)');
shop_book_purchase('latitude-5520-01', $u, $p, 'Steve');
$REFUSE = 'Purchase'; $u2 = $cat['units']['optiplex-7080-01'];
shop_book_purchase('optiplex-7080-01', $u2, shop_purchase_clean(array('order' => '06-15161-52446', 'date' => '2026-09-11', 'total' => '229.09')), 'Steve');
$r = shop_qbo_purchase($C, 'optiplex-7080-01', $u2, $api); $REFUSE = '';
check(!$r[0] && strpos($r[1], 'QuickBooks refused it: Business Validation Error') === 0, 'QuickBooks refuses: its own words come back', $r);

echo "C  a machine's sale\n";
$sale = array('at' => 1792105200, 'unit' => 'latitude-5520-01', 'ed' => 1, 'order' => '8XY12345AB678901C', 'capture' => '5AB12345CD678901E', 'status' => 'completed',
    'amt' => '575.00', 'price' => '560.00', 'del' => '15.00', 'env' => 'live', 'fee' => '17.05', 'name' => 'Jane Smith', 'email' => 'jane@example.com', 'phone' => '07700900123',
    'lines' => array('1 High St', 'Poole'), 'postcode' => 'BH15 1AA');
$st = json_decode(file_get_contents(SHOP_STATE), true); $st['sales'][] = $sale; file_put_contents(SHOP_STATE, json_encode($st));
$r = shop_qbo_sale($C, $sale, $u, $api, $ensure);
check($r[0] && strpos($r[1], '/app/salesreceipt?txnId=') !== false, 'the sale goes in: a link to the sales receipt', $r);
$sr = end($QB['SalesReceipt']);
check($sr['CustomerRef']['value'] === '777' && $sr['DepositToAccountRef']['value'] === '35' && $sr['DocNumber'] === 'WEB-8XY12345AB678901C' && $sr['TxnDate'] === '2026-10-16', 'the receipt: the buyer, paid into PayPal, numbered from the PayPal order, on the day - UK time (00:00 BST on the 16th is still the 15th in UTC)', $sr);
check(count($sr['Line']) === 2 && $sr['Line'][0]['Amount'] === 560.0 && $sr['Line'][0]['SalesItemLineDetail']['ItemRef']['value'] === $q['item'] && $sr['Line'][1]['Amount'] === 15.0 && $sr['Line'][1]['SalesItemLineDetail']['ItemRef']['value'] === $q['delivery'] && $sr['Line'][1]['SalesItemLineDetail']['TaxCodeRef']['value'] === '20', 'two lines: the machine £560 and delivery £15, No VAT', $sr['Line']);
check($ENSURED[0]['email'] === 'jane@example.com' && $ENSURED[0]['addr'] === '1 High St, Poole' && $ENSURED[0]['postcode'] === 'BH15 1AA', 'the buyer is found or made as a QuickBooks customer with their address');
$n = $posts('salesreceipt'); $r = shop_qbo_sale($C, $sale, $u, $api, $ensure);
check($r[0] && $posts('salesreceipt') === $n, 'twice: one receipt');
check(shop_qbo_sale($C, array('unit' => 'test-01') + $sale, $cat['units']['test-01'], $api, $ensure)[1] === 'a test sale - never in the books', 'the £1 test listing never goes in');
check(shop_qbo_sale($C, array('env' => 'sandbox') + $sale, $u, $api, $ensure)[0] === false, 'a PayPal sandbox sale never goes in');
$r = shop_books_after_sale(array('order' => 'ZZZ1234567890') + $sale, $u, function () { return array('ok' => false, 'why' => 'not_configured'); });
check(!$r[0] && strpos(shop_read()['books']['latitude-5520-01#1']['sale']['err'], 'not connected') !== false, 'QuickBooks not connected after a sale: the portal is told why (and offers a retry)');

echo "D  what the portal shows\n";
$rows = shop_books_rows($cat, shop_read());
$byid = array(); foreach ($rows as $row) $byid[$row['id']] = $row;
check(!isset($byid['test-01']) && isset($byid['latitude-5520-01'], $byid['optiplex-7080-01']), 'the test listing is never in the books');
$row = $byid['latitude-5520-01'];
check($row['profit'] === shop_money(575 - 180 - 229.99 - 17.05) && $row['sale']['name'] === 'Jane Smith' && $row['purchase']['total'] === '180.00', 'profit = £575 paid - £180 eBay - £229.99 SSD - £17.05 PayPal fee = £' . shop_money(575 - 180 - 229.99 - 17.05), $row);
check($byid['optiplex-7080-01']['profit'] === null && $byid['optiplex-7080-01']['sale'] === null, 'not sold yet: no profit shown');
check(shop_mark_offline('optiplex-7080-01', $u2, 'Steve', true) === 'ok' && shop_state_of(shop_read(), 'optiplex-7080-01', $u2) === 'sold', 'sold on the phone: the website stops selling it at once');
check(shop_mark_offline('optiplex-7080-01', $u2, 'Steve', false) === 'ok' && shop_state_of(shop_read(), 'optiplex-7080-01', $u2) === 'available', 'a mistake: undone');
$st = json_decode(file_get_contents(SHOP_STATE), true); $st['u']['latitude-5520-01#1'] = array('st' => 'sold', 'order' => '8XY12345AB678901C'); file_put_contents(SHOP_STATE, json_encode($st));
check(strpos(shop_mark_offline('latitude-5520-01', $u, 'Steve', false), 'refund it in PayPal') !== false, 'an ONLINE sale can\'t be undone here (refund in PayPal, relist as a new edition)');

echo "\n" . ($fails ? "$fails FAILED\n" : "ALL PASSED\n");
array_map('unlink', glob($TMP . '/*') ?: array()); @rmdir($TMP);
exit($fails ? 1 : 0);
