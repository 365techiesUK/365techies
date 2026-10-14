<?php
/*
 * The refurbished Dells' books (14 Oct 2026). Owner: "connect in with our eBay ... get the purchases ... put those into our
 * QuickBooks ... automate that part", and he chose FULL PER-MACHINE ENTRIES: each machine goes into QuickBooks as
 *
 *   - a PURCHASE (an expense): what it cost on eBay, from the eBay vendor, out of the account that pays eBay, onto the
 *     "Refurbished computer stock" cost-of-sales account. Recorded from the staff portal's shop card (shop-admin.php) with
 *     the eBay order number, date and total - the order is read from eBay's purchase history.
 *   - a SALE (a sales receipt): when someone buys it online (shop.php, after PayPal has taken the payment): the buyer as a
 *     QuickBooks customer, the machine on the "Refurbished computer" item and the delivery on "Delivery - online orders",
 *     paid into the account PayPal pays into. A test sale (the £1 test listing, or PayPal's sandbox) never goes in.
 *
 * The SSD is NOT posted per machine: SSDs are bought in batches and come into QuickBooks from the bank feed on their own.
 * Its cost is kept here per machine only so the portal can show each machine's profit.
 *
 * The same QuickBooks connection, gates and No-VAT code as the invoice writers (pcm-invq-sweep.php invq_connect: nothing is
 * written unless $QBO_LIVE_ENABLED is on and $QBO_ONLY_KEY is empty), the same customer find-or-create under the same lock
 * (invq_ensure_customer), and never twice: each entry carries a DocNumber made from the eBay or PayPal order, and
 * QuickBooks is asked for that DocNumber before anything is created.
 *
 * The setup's ids (accounts, items, the eBay vendor, which accounts pay and are paid into) live in shop-state.json 'qbo';
 * each machine's book in 'books' (keyed like the stock: <id>#<edition>). Include-only. NO closing tag in this file.
 */
require_once __DIR__ . '/shop-lib.php';
require_once __DIR__ . '/pcm-invq-sweep.php';   // invq_connect, invq_api, invq_why, invq_ensure_customer, invq_str

define('SHOP_QBO_INCOME', 'Refurbished computer sales');
define('SHOP_QBO_COGS', 'Refurbished computer stock');
define('SHOP_QBO_ITEM', 'Refurbished computer');
define('SHOP_QBO_DELIVERY', 'Delivery - online orders');
define('SHOP_QBO_VENDOR', 'eBay');
if (!defined('SHOP_SSD_DEFAULT')) define('SHOP_SSD_DEFAULT', '199.99');   // a new 1TB Samsung 990 PRO (scan.co.uk, 14 Oct 2026) - typed per machine anyway

function shop_qbo_why($res) { return function_exists('invq_why') ? invq_why($res) : 'http ' . (int)($res['code'] ?? 0); }
function shop_q($c, $api, $sql) {
    $res = call_user_func($api, $c, 'GET', '/query?query=' . rawurlencode($sql));
    return qbo_lib_ok($res) ? (array)($res['json']['QueryResponse'] ?? array()) : null;
}
function shop_qesc($v) { return qbo_lib_qesc($v); }   // the shared escaping for QuickBooks' query literals
/* A DocNumber from an order number: QuickBooks allows 21 characters. */
function shop_doc($prefix, $order) { return substr($prefix . preg_replace('/[^A-Za-z0-9-]/', '', (string)$order), 0, 21); }

/* ---- setting QuickBooks up for the shop (once, from the portal) ------------------------------------------------------- */
/* The accounts a person picks from: where PayPal pays the sales in, and what pays for eBay. -> array(rows) | null */
function shop_qbo_money_accounts($c, $api = 'invq_api') {
    $r = shop_q($c, $api, "select Id, Name, AccountType, AccountSubType from Account where Active = true maxresults 1000");
    if ($r === null) return null;
    $out = array();
    foreach ((array)($r['Account'] ?? array()) as $a)
        if (in_array((string)($a['AccountType'] ?? ''), array('Bank', 'Credit Card', 'Other Current Asset'), true))
            $out[] = array('id' => (string)$a['Id'], 'name' => (string)$a['Name'], 'type' => (string)$a['AccountType']);
    usort($out, function ($a, $b) {   // PayPal first: it is the likely answer to both questions
        $pa = stripos($a['name'], 'paypal') !== false ? 0 : 1; $pb = stripos($b['name'], 'paypal') !== false ? 0 : 1;
        return $pa !== $pb ? $pa - $pb : strcasecmp($a['name'], $b['name']);
    });
    return $out;
}
/* Find by name, else create. $kind: Account | Item | Vendor. -> array(ok, id, created, why) */
function shop_qbo_find_or_make($c, $kind, $name, $body, $api = 'invq_api') {
    $field = $kind === 'Vendor' ? 'DisplayName' : 'Name';
    $r = shop_q($c, $api, "select Id from " . $kind . " where " . $field . " = '" . shop_qesc($name) . "'");
    if ($r === null) return array(false, '', false, 'could not ask QuickBooks');
    if (!empty($r[$kind][0]['Id'])) return array(true, (string)$r[$kind][0]['Id'], false, '');
    $res = call_user_func($api, $c, 'POST', '/' . strtolower($kind), $body);
    if (!qbo_lib_ok($res) || empty($res['json'][$kind]['Id'])) return array(false, '', false, shop_qbo_why($res));
    return array(true, (string)$res['json'][$kind]['Id'], true, '');
}
/* Make (or find) the two accounts, two items and the eBay vendor; remember them with the two accounts chosen.
   -> array(ok, note|why, made: [names]) */
function shop_qbo_setup($c, $deposit, $pay, $api = 'invq_api') {
    $money = shop_qbo_money_accounts($c, $api);
    if ($money === null) return array(false, 'could not read your QuickBooks accounts', array());
    $types = array(); foreach ($money as $a) $types[$a['id']] = $a['type'];
    if (!isset($types[(string)$deposit])) return array(false, 'choose the account PayPal pays your sales into', array());
    if (!isset($types[(string)$pay])) return array(false, 'choose the account that pays for eBay', array());
    $made = array(); $ids = array();
    $steps = array(
        array('income', 'Account', SHOP_QBO_INCOME, array('Name' => SHOP_QBO_INCOME, 'AccountType' => 'Income', 'AccountSubType' => 'SalesOfProductIncome')),
        array('cogs', 'Account', SHOP_QBO_COGS, array('Name' => SHOP_QBO_COGS, 'AccountType' => 'Cost of Goods Sold', 'AccountSubType' => 'SuppliesMaterialsCogs')),
    );
    foreach ($steps as $s) {
        list($ok, $id, $new, $why) = shop_qbo_find_or_make($c, $s[1], $s[2], $s[3], $api);
        if (!$ok) return array(false, 'QuickBooks refused the account "' . $s[2] . '": ' . $why, $made);
        $ids[$s[0]] = $id; if ($new) $made[] = 'account "' . $s[2] . '"';
    }
    $steps = array(
        array('item', 'Item', SHOP_QBO_ITEM, array('Name' => SHOP_QBO_ITEM, 'Type' => 'NonInventory', 'Description' => 'Refurbished Dell computer, sold online',
            'IncomeAccountRef' => array('value' => $ids['income']), 'ExpenseAccountRef' => array('value' => $ids['cogs']))),
        array('delivery', 'Item', SHOP_QBO_DELIVERY, array('Name' => SHOP_QBO_DELIVERY, 'Type' => 'Service', 'Description' => 'UK delivery by tracked courier',
            'IncomeAccountRef' => array('value' => $ids['income']))),
        array('vendor', 'Vendor', SHOP_QBO_VENDOR, array('DisplayName' => SHOP_QBO_VENDOR)),
    );
    foreach ($steps as $s) {
        list($ok, $id, $new, $why) = shop_qbo_find_or_make($c, $s[1], $s[2], $s[3], $api);
        if (!$ok) return array(false, 'QuickBooks refused the ' . strtolower($s[1]) . ' "' . $s[2] . '": ' . $why, $made);
        $ids[$s[0]] = $id; if ($new) $made[] = strtolower($s[1]) . ' "' . $s[2] . '"';
    }
    $ids['deposit'] = (string)$deposit; $ids['pay'] = (string)$pay; $ids['pay_type'] = $types[(string)$pay]; $ids['realm'] = (string)$c['realm'];
    $saved = shop_locked(function (&$d) use ($ids) { $d['qbo'] = $ids; return true; });
    if ($saved === false) return array(false, 'the stock file was busy - try again', $made);
    return array(true, $made ? 'Made ' . implode(', ', $made) . '.' : 'Everything was already there - linked.', $made);
}
/* The setup, if it was made for THIS QuickBooks company. */
function shop_qbo_ids($d, $c) {
    $q = $d['qbo'] ?? array();
    foreach (array('income', 'cogs', 'item', 'delivery', 'vendor', 'deposit', 'pay') as $k) if (empty($q[$k])) return null;
    if (!empty($c['realm']) && ($q['realm'] ?? '') !== (string)$c['realm']) return null;
    return $q;
}

/* ---- a machine's purchase ------------------------------------------------------------------------------------------- */
/* The eBay order as typed or read from eBay. -> array(clean fields) | string (what is wrong) */
function shop_purchase_clean($in) {
    $order = strtoupper(preg_replace('/[^0-9A-Za-z-]/', '', (string)($in['order'] ?? '')));
    $date = (string)($in['date'] ?? '');
    $total = str_replace(array('£', ',', ' '), '', (string)($in['total'] ?? ''));
    $ssd = str_replace(array('£', ',', ' '), '', (string)($in['ssd'] ?? ''));
    if ($order === '' || strlen($order) > 30) return 'the eBay order number';
    if (!preg_match('/^(20\d\d)-(\d\d)-(\d\d)$/', $date, $m) || !checkdate((int)$m[2], (int)$m[3], (int)$m[1])) return 'the date it was bought (yyyy-mm-dd)';
    if (!is_numeric($total) || (float)$total <= 0 || (float)$total > 5000) return 'what it cost on eBay';
    if ($ssd !== '' && (!is_numeric($ssd) || (float)$ssd < 0 || (float)$ssd > 2000)) return 'the SSD cost';
    return array('order' => $order, 'date' => $date, 'total' => shop_money($total), 'ssd' => shop_money($ssd === '' ? SHOP_SSD_DEFAULT : $ssd));
}
/* Keep a machine's purchase in its book (no QuickBooks). -> true | string why */
function shop_book_purchase($id, $u, $p, $by, $now = null) {
    $k = shop_key($id, $u); $now = $now === null ? time() : (int)$now;
    $ok = shop_locked(function (&$d) use ($k, $p, $by, $now) {
        $b = $d['books'][$k] ?? array();
        $old = $b['purchase'] ?? array();
        $b['purchase'] = $p + array('at' => $now, 'by' => $by);
        // a changed amount after it went to QuickBooks: the portal says so (fix it in QuickBooks; we never edit there)
        if (!empty($old['qbo_id'])) { $b['purchase']['qbo_id'] = $old['qbo_id']; $b['purchase']['qbo_url'] = $old['qbo_url'] ?? ''; if (($old['total'] ?? '') !== $p['total']) $b['purchase']['qbo_differs'] = $old['total']; }
        $d['books'][$k] = $b;
        return true;
    });
    return $ok === false ? 'the stock file was busy - try again' : true;
}
function shop_purchase_body($id, $u, $p, $q, $tax) {
    $what = $u['name'] . ' (' . $id . ') - eBay order ' . $p['order'];
    $line = array('Amount' => (float)$p['total'], 'DetailType' => 'AccountBasedExpenseLineDetail', 'Description' => $what,
        'AccountBasedExpenseLineDetail' => array('AccountRef' => array('value' => $q['cogs'])));
    if ($tax !== '') $line['AccountBasedExpenseLineDetail']['TaxCodeRef'] = array('value' => $tax);
    return array('PaymentType' => ($q['pay_type'] ?? '') === 'Credit Card' ? 'CreditCard' : 'Cash',
        'AccountRef' => array('value' => $q['pay']), 'EntityRef' => array('value' => $q['vendor'], 'type' => 'Vendor'),
        'TxnDate' => $p['date'], 'DocNumber' => shop_doc('EB', $p['order']),
        'PrivateNote' => 'Refurbished Dell for sale online: ' . $what . '. Recorded from the staff portal.', 'Line' => array($line));
}
/* Post a machine's purchase to QuickBooks (once). -> array(ok, url|why) */
function shop_qbo_purchase($c, $id, $u, $api = 'invq_api') {
    if (empty($c['live'])) return array(false, 'QuickBooks writing is switched off ($QBO_LIVE_ENABLED)');
    if (($c['only'] ?? '') !== '') return array(false, 'QuickBooks is in one-customer test mode ($QBO_ONLY_KEY)');
    $d = shop_read(); $k = shop_key($id, $u);
    $q = shop_qbo_ids($d, $c);
    if (!$q) return array(false, 'set QuickBooks up for the shop first');
    $p = $d['books'][$k]['purchase'] ?? null;
    if (!$p) return array(false, 'no purchase recorded for this machine');
    if (!empty($p['qbo_id'])) return array(true, (string)($p['qbo_url'] ?? ''));
    $doc = shop_doc('EB', $p['order']);
    $found = shop_q($c, $api, "select Id from Purchase where DocNumber = '" . shop_qesc($doc) . "'");
    if ($found === null) return array(false, 'could not ask QuickBooks');
    $qid = (string)($found['Purchase'][0]['Id'] ?? '');
    if ($qid === '') {
        $res = call_user_func($api, $c, 'POST', '/purchase', shop_purchase_body($id, $u, $p, $q, (string)($c['tax'] ?? '')));
        if (!qbo_lib_ok($res) || empty($res['json']['Purchase']['Id'])) { shop_log('qbo purchase FAILED ' . $id . ' ' . shop_qbo_why($res)); return array(false, 'QuickBooks refused it: ' . shop_qbo_why($res)); }
        $qid = (string)$res['json']['Purchase']['Id'];
    }
    $url = rtrim((string)($c['host'] ?? 'https://app.qbo.intuit.com'), '/') . '/app/expense?txnId=' . rawurlencode($qid);
    shop_locked(function (&$d) use ($k, $qid, $url) { $d['books'][$k]['purchase']['qbo_id'] = $qid; $d['books'][$k]['purchase']['qbo_url'] = $url; return true; });
    shop_log('qbo purchase ' . $qid . ' for ' . $id);
    return array(true, $url);
}

/* ---- a machine's sale ----------------------------------------------------------------------------------------------- */
function shop_sale_body($sale, $u, $q, $cid, $tax) {
    $tz = new DateTimeZone('Europe/London');
    $day = (new DateTime('@' . (int)$sale['at']))->setTimezone($tz)->format('Y-m-d');
    $lines = array();
    $l = array('Amount' => (float)$sale['price'], 'DetailType' => 'SalesItemLineDetail', 'Description' => $u['name'] . ' (' . $sale['unit'] . ')',
        'SalesItemLineDetail' => array('ItemRef' => array('value' => $q['item']), 'Qty' => 1, 'UnitPrice' => (float)$sale['price']));
    if ($tax !== '') $l['SalesItemLineDetail']['TaxCodeRef'] = array('value' => $tax);
    $lines[] = $l;
    if ((float)$sale['del'] > 0) {
        $l = array('Amount' => (float)$sale['del'], 'DetailType' => 'SalesItemLineDetail', 'Description' => 'UK delivery by tracked courier',
            'SalesItemLineDetail' => array('ItemRef' => array('value' => $q['delivery']), 'Qty' => 1, 'UnitPrice' => (float)$sale['del']));
        if ($tax !== '') $l['SalesItemLineDetail']['TaxCodeRef'] = array('value' => $tax);
        $lines[] = $l;
    }
    return array('CustomerRef' => array('value' => $cid), 'TxnDate' => $day, 'DepositToAccountRef' => array('value' => $q['deposit']),
        'DocNumber' => shop_doc('WEB-', $sale['order']), 'Line' => $lines,
        'PrivateNote' => 'Bought online at 365techies.co.uk: PayPal order ' . $sale['order'] . ', payment ' . $sale['capture']
            . ($sale['status'] === 'pending' ? ' (PayPal was still checking it)' : '') . '.');
}
/* Post a sale to QuickBooks (once). $ensure: invq_ensure_customer (tests pass their own). -> array(ok, url|why) */
function shop_qbo_sale($c, $sale, $u, $api = 'invq_api', $ensure = 'invq_ensure_customer') {
    if (shop_is_test($sale, $u)) return array(false, 'a test sale - never in the books');
    if (empty($c['live'])) return array(false, 'QuickBooks writing is switched off ($QBO_LIVE_ENABLED)');
    if (($c['only'] ?? '') !== '') return array(false, 'QuickBooks is in one-customer test mode ($QBO_ONLY_KEY)');
    $d = shop_read(); $k = $sale['unit'] . '#' . (int)$sale['ed'];
    $q = shop_qbo_ids($d, $c);
    if (!$q) return array(false, 'set QuickBooks up for the shop first');
    $had = $d['books'][$k]['sale'] ?? array();
    if (!empty($had['qbo_id']) && ($had['order'] ?? '') === $sale['order']) return array(true, (string)($had['qbo_url'] ?? ''));
    $doc = shop_doc('WEB-', $sale['order']);
    $found = shop_q($c, $api, "select Id from SalesReceipt where DocNumber = '" . shop_qesc($doc) . "'");
    if ($found === null) return array(false, 'could not ask QuickBooks');
    $qid = (string)($found['SalesReceipt'][0]['Id'] ?? '');
    if ($qid === '') {
        $job = array('email' => $sale['email'], 'name' => $sale['name'], 'phone' => $sale['phone'],
                     'addr' => implode(', ', (array)$sale['lines']), 'postcode' => $sale['postcode']);
        $cu = call_user_func($ensure, $c, $job, 'shop ' . $sale['unit']);
        if (empty($cu['ok'])) return array(false, 'QuickBooks customer: ' . (string)($cu['why'] ?? ($cu['error'] ?? 'failed')));
        $res = call_user_func($api, $c, 'POST', '/salesreceipt', shop_sale_body($sale, $u, $q, (string)$cu['cid'], (string)($c['tax'] ?? '')));
        if (!qbo_lib_ok($res) || empty($res['json']['SalesReceipt']['Id'])) { shop_log('qbo sale FAILED ' . $sale['unit'] . ' ' . shop_qbo_why($res)); return array(false, 'QuickBooks refused it: ' . shop_qbo_why($res)); }
        $qid = (string)$res['json']['SalesReceipt']['Id'];
    }
    $url = rtrim((string)($c['host'] ?? 'https://app.qbo.intuit.com'), '/') . '/app/salesreceipt?txnId=' . rawurlencode($qid);
    $order = $sale['order'];
    shop_locked(function (&$d) use ($k, $qid, $url, $order) { $d['books'][$k]['sale'] = array('order' => $order, 'qbo_id' => $qid, 'qbo_url' => $url, 'at' => time()); return true; });
    shop_log('qbo sale ' . $qid . ' for ' . $k);
    return array(true, $url);
}
/* Straight after a sale (shop.php): into QuickBooks if it can go; if not, the portal shows why and a button to try again. */
function shop_books_after_sale($sale, $u, $connect = 'invq_connect') {
    if (shop_is_test($sale, $u)) return array(false, 'test');
    $c = call_user_func($connect);
    $r = empty($c['ok']) ? array(false, 'QuickBooks not connected (' . (string)($c['why'] ?? '') . ')') : shop_qbo_sale($c, $sale, $u);
    if (!$r[0]) {
        $k = $sale['unit'] . '#' . (int)$sale['ed']; $why = $r[1]; $order = $sale['order'];
        shop_locked(function (&$d) use ($k, $why, $order) { $d['books'][$k]['sale'] = array('order' => $order, 'err' => $why, 'at' => time()); return true; });
    }
    return $r;
}

/* ---- what the portal shows ------------------------------------------------------------------------------------------ */
/* Each machine listed (newest first): its state, the sale, the book, and the profit once both halves are known. */
function shop_books_rows($cat = null, $d = null, $now = null) {
    $cat = $cat ?: shop_catalogue(); $d = $d ?: shop_read(); $rows = array();
    $sales = array(); foreach ($d['sales'] as $s) $sales[$s['unit'] . '#' . (int)$s['ed']] = $s;
    foreach ($cat['units'] as $id => $u) {
        if (($u['status'] ?? '') === 'test') continue;
        $k = shop_key($id, $u);
        $b = $d['books'][$k] ?? array(); $s = $sales[$k] ?? null; $p = $b['purchase'] ?? null;
        $profit = null;
        if ($s && $p) $profit = shop_money((float)$s['amt'] - (float)$p['total'] - (float)$p['ssd'] - (float)($s['fee'] !== '' ? $s['fee'] : 0));
        $rows[] = array('id' => $id, 'name' => (string)$u['name'], 'status' => (string)$u['status'], 'state' => shop_state_of($d, $id, $u, $now),
            'price' => shop_money($u['price']), 'edition' => max(1, (int)($u['ed'] ?? 1)),
            'sale' => $s ? array('at' => (int)$s['at'], 'name' => (string)$s['name'], 'email' => (string)$s['email'], 'postcode' => (string)$s['postcode'],
                'amt' => (string)$s['amt'], 'fee' => (string)$s['fee'], 'status' => (string)$s['status'], 'order' => (string)$s['order'],
                'offline' => !empty($s['offline'])) : null,
            'purchase' => $p, 'sale_qbo' => $b['sale'] ?? null, 'profit' => $profit);
    }
    return array_reverse($rows);
}
/* Sold some other way (on the phone, at a visit): the website stops selling it at once. Undo only for that kind of sale. */
function shop_mark_offline($id, $u, $by, $sold, $now = null) {
    $k = shop_key($id, $u); $now = $now === null ? time() : (int)$now; $res = 'busy';
    shop_locked(function (&$d) use ($k, $by, $sold, $now, &$res) {
        $s = $d['u'][$k] ?? null;
        if ($sold) {
            if (is_array($s) && ($s['st'] ?? '') === 'sold') { $res = 'already sold'; return false; }
            $d['u'][$k] = array('st' => 'sold', 'order' => 'offline', 'at' => $now, 'by' => $by); $res = 'ok'; return true;
        }
        if (!is_array($s) || ($s['st'] ?? '') !== 'sold') { $res = 'not sold'; return false; }
        if (($s['order'] ?? '') !== 'offline') { $res = 'sold online - refund it in PayPal and relist it as a new edition'; return false; }
        unset($d['u'][$k]); $res = 'ok'; return true;
    });
    return $res;
}
