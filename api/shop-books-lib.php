<?php
/*
 * The refurbished Dells' books (14 Oct 2026). Owner: "connect in with our eBay ... get the purchases ... put those into our
 * QuickBooks ... automate that part", and he chose FULL PER-MACHINE ENTRIES.
 *
 * ⚠ 14 Oct 2026, same day (owner: "yes, make the change"): the business's QuickBooks ALREADY keeps every machine as its own
 * STOCK (inventory) item - SKU = the last six digits of the eBay item number (older ones: the eBay order number's), quantity
 * 1, at what it cost. So the shop works on those items, never beside them:
 *
 *   - a SALE (a sales receipt, shop.php after PayPal has taken the payment): the machine's line is ITS stock item, found by
 *     the SKU on its shop_stock.py row - QuickBooks takes it out of stock and posts what it cost as the cost of the sale by
 *     itself. The delivery goes on "Delivery - online orders"; the buyer becomes a QuickBooks customer; paid into the account
 *     PayPal pays into. A test sale (the £1 test listing, or PayPal's sandbox) never goes in.
 *   - a PURCHASE (the eBay connection, shop-ebay-lib.php, or the portal's "Record what it cost"): if QuickBooks already has
 *     a stock item with that SKU (made by hand, as before) NOTHING is posted - it is linked. Otherwise the stock item is made
 *     the same way (copying the accounts the business's own stock items use) with nothing in stock, and a Purchase from the
 *     eBay vendor brings it in: an item line, quantity at cost, out of the account that pays eBay. The bank feed's eBay
 *     payment then MATCHES that purchase.
 *   (Before this change the shop posted purchases as an expense and sales on a non-inventory item, beside the stock items:
 *   a machine sold online would have stayed "1 in stock" for ever and its cost been counted twice. Nothing had been posted.)
 *
 * The SSD is NOT posted per machine: SSDs are bought in batches and come into QuickBooks from the bank feed on their own.
 * Its cost is kept here per machine only so the portal can show each machine's profit.
 *
 * The same QuickBooks connection, gates and No-VAT code as the invoice writers (pcm-invq-sweep.php invq_connect: nothing is
 * written unless $QBO_LIVE_ENABLED is on and $QBO_ONLY_KEY is empty), the same customer find-or-create under the same lock
 * (invq_ensure_customer), and never twice: each entry carries a DocNumber made from the eBay or PayPal order, and
 * QuickBooks is asked for that DocNumber (and for the SKU) before anything is created. QuickBooks is never edited here.
 *
 * shop-state.json: 'qbo' = the setup (accounts, the delivery item, the eBay vendor, which accounts pay and are paid into);
 * 'books' = each machine's book (keyed like the stock: <id>#<edition>); 'stock' = what QuickBooks last said about each
 * listed or bought machine's stock item (by SKU), for the portal. Include-only. NO closing tag in this file.
 */
require_once __DIR__ . '/shop-lib.php';
require_once __DIR__ . '/pcm-invq-sweep.php';   // invq_connect, invq_api, invq_why, invq_ensure_customer, invq_str

define('SHOP_QBO_DELIVERY', 'Delivery - online orders');
define('SHOP_QBO_VENDOR', 'eBay');
define('SHOP_STOCK_TTL', 600);   // the portal asks QuickBooks about the stock items again after ten minutes (or on a button)
if (!defined('SHOP_SSD_DEFAULT')) define('SHOP_SSD_DEFAULT', '199.99');   // a new 1TB Samsung 990 PRO (scan.co.uk, 14 Oct 2026) - typed per machine anyway

function shop_qbo_why($res) { return function_exists('invq_why') ? invq_why($res) : 'http ' . (int)($res['code'] ?? 0); }
function shop_q($c, $api, $sql) {
    $res = call_user_func($api, $c, 'GET', '/query?query=' . rawurlencode($sql));
    return qbo_lib_ok($res) ? (array)($res['json']['QueryResponse'] ?? array()) : null;
}
function shop_qesc($v) { return qbo_lib_qesc($v); }   // the shared escaping for QuickBooks' query literals
/* A DocNumber from an order number: QuickBooks allows 21 characters. */
function shop_doc($prefix, $order) { return substr($prefix . preg_replace('/[^A-Za-z0-9-]/', '', (string)$order), 0, 21); }
function shop_qbo_link($c, $kind, $id) { return rtrim((string)($c['host'] ?? 'https://app.qbo.intuit.com'), '/') . '/app/' . $kind . '?txnId=' . rawurlencode((string)$id); }

/* ---- the stock items ------------------------------------------------------------------------------------------------ */
/* A SKU as people type it -> the part that identifies the machine:
   "SKU 582117/2" -> "582117/2", "Item number 053353" -> "053353", ": 456590" -> "456590", "❌SKU 626001" -> "626001" */
function shop_sku_norm($s) {
    $t = str_replace(array('item number', 'item no.', 'item no', 'sku'), '', strtolower((string)$s));
    return preg_replace('/[^0-9a-z\/]/', '', $t);
}
/* The business's rule for a machine bought on eBay: the last six digits of the eBay item number. */
function shop_sku_from_item($item) { $d = preg_replace('/\D/', '', (string)$item); return strlen($d) >= 6 ? substr($d, -6) : $d; }
/* Every stock (inventory) item in QuickBooks. -> array(rows) | null */
function shop_qbo_stock_items($c, $api = 'invq_api') {
    $out = array(); $start = 1;
    do {
        $r = shop_q($c, $api, "select * from Item where Type = 'Inventory' startposition " . $start . " maxresults 1000");
        if ($r === null) return null;
        $got = (array)($r['Item'] ?? array());
        foreach ($got as $it)
            $out[] = array('id' => (string)($it['Id'] ?? ''), 'name' => (string)($it['Name'] ?? ''), 'sku' => (string)($it['Sku'] ?? ''),
                'qty' => (float)($it['QtyOnHand'] ?? 0), 'cost' => shop_money($it['PurchaseCost'] ?? 0),
                'asset' => (string)($it['AssetAccountRef']['value'] ?? ''), 'income' => (string)($it['IncomeAccountRef']['value'] ?? ''),
                'cogs' => (string)($it['ExpenseAccountRef']['value'] ?? ''), 'sync' => (string)($it['SyncToken'] ?? ''));
        $start += 1000;
    } while (count($got) === 1000 && $start < 20000);
    return $out;
}
/* The stock item for a SKU: the one with that SKU still in stock (or the only one with it).
   -> array('item' => row) | array('err' => 'nosku'|'none'|'several', 'names' => [...]) */
function shop_stock_find($items, $sku) {
    $n = shop_sku_norm($sku);
    if ($n === '') return array('err' => 'nosku', 'names' => array());
    $hits = array(); foreach ($items as $i) if (shop_sku_norm($i['sku']) === $n) $hits[] = $i;
    if (!$hits) return array('err' => 'none', 'names' => array());
    $have = array(); foreach ($hits as $i) if ($i['qty'] > 0) $have[] = $i;
    if (count($have) === 1) return array('item' => $have[0]);
    if (!$have && count($hits) === 1) return array('item' => $hits[0]);
    return array('err' => 'several', 'names' => array_map(function ($i) { return $i['name']; }, $have ?: $hits));
}
function shop_stock_why($f, $sku) {
    if (($f['err'] ?? '') === 'nosku') return 'no QuickBooks SKU for it (its row in shop_stock.py needs sku="...")';
    if (($f['err'] ?? '') === 'none') return 'QuickBooks has no stock item with SKU ' . $sku . ' - add it there (or fix its SKU), then try again';
    return 'QuickBooks has ' . count($f['names']) . ' stock items with SKU ' . $sku . ' (' . implode('; ', array_slice($f['names'], 0, 3)) . ') - give one of them a different SKU';
}
/* The accounts the business's own stock items use (the commonest set): a new machine's stock item copies them. */
function shop_stock_accounts($items) {
    $n = array();
    foreach ($items as $i) if ($i['asset'] !== '' && $i['income'] !== '' && $i['cogs'] !== '') { $k = $i['asset'] . '|' . $i['income'] . '|' . $i['cogs']; $n[$k] = ($n[$k] ?? 0) + 1; }
    if (!$n) return null;
    arsort($n); list($asset, $income, $cogs) = explode('|', (string)key($n));
    return array('asset' => $asset, 'income' => $income, 'cogs' => $cogs);
}
/* What the portal shows about each listed / bought machine's stock item, remembered so the Shop tab doesn't ask
   QuickBooks every time it opens. $skus: the SKUs to look up. */
function shop_stock_remember($items, $skus, $now = null) {
    $now = $now === null ? time() : (int)$now; $m = array();
    foreach ($skus as $sku) {
        $n = shop_sku_norm($sku); if ($n === '' || isset($m[$n])) continue;
        $f = shop_stock_find($items, $sku);
        $m[$n] = isset($f['item']) ? array('id' => $f['item']['id'], 'name' => $f['item']['name'], 'qty' => $f['item']['qty'], 'cost' => $f['item']['cost'])
                                   : array('err' => shop_stock_why($f, $sku), 'none' => $f['err'] === 'none');
    }
    return shop_locked(function (&$d) use ($m, $now) { $d['stock'] = $m; $d['stock_at'] = $now; return true; }) !== false;
}
/* Every SKU the portal cares about: the listed machines' and the eBay purchases waiting to be got ready. */
function shop_stock_skus($cat, $d) {
    $s = array();
    foreach ($cat['units'] as $u) if (($u['status'] ?? '') !== 'test' && !empty($u['sku'])) $s[] = (string)$u['sku'];
    foreach ((array)($d['bought'] ?? array()) as $b) if (!empty($b['sku']) && ($b['status'] ?? '') !== 'dismissed') $s[] = (string)$b['sku'];
    return $s;
}
function shop_stock_of($d, $sku) { $n = shop_sku_norm($sku); return $n !== '' ? ($d['stock'][$n] ?? null) : null; }

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
/* Link the shop to the stock items (their accounts), find or make the delivery item and the eBay vendor, and remember them
   with the two accounts chosen. -> array(ok, note|why, made: [names]) */
function shop_qbo_setup($c, $deposit, $pay, $api = 'invq_api') {
    $money = shop_qbo_money_accounts($c, $api);
    if ($money === null) return array(false, 'could not read your QuickBooks accounts', array());
    $types = array(); foreach ($money as $a) $types[$a['id']] = $a['type'];
    if (!isset($types[(string)$deposit])) return array(false, 'choose the account PayPal pays your sales into', array());
    if (!isset($types[(string)$pay])) return array(false, 'choose the account that pays for eBay', array());
    $items = shop_qbo_stock_items($c, $api);
    if ($items === null) return array(false, 'could not read your QuickBooks stock items', array());
    $acc = shop_stock_accounts($items);
    if (!$acc) return array(false, 'QuickBooks has no stock items yet to copy the accounts from - add one machine as a stock item by hand first', array());
    $made = array(); $ids = $acc;
    $steps = array(
        array('delivery', 'Item', SHOP_QBO_DELIVERY, array('Name' => SHOP_QBO_DELIVERY, 'Type' => 'Service', 'Description' => 'UK delivery by tracked courier',
            'IncomeAccountRef' => array('value' => $acc['income']))),
        array('vendor', 'Vendor', SHOP_QBO_VENDOR, array('DisplayName' => SHOP_QBO_VENDOR)),
    );
    foreach ($steps as $s) {
        list($ok, $id, $new, $why) = shop_qbo_find_or_make($c, $s[1], $s[2], $s[3], $api);
        if (!$ok) return array(false, 'QuickBooks refused the ' . strtolower($s[1]) . ' "' . $s[2] . '": ' . $why, $made);
        $ids[$s[0]] = $id; if ($new) $made[] = strtolower($s[1]) . ' "' . $s[2] . '"';
    }
    $ids['deposit'] = (string)$deposit; $ids['pay'] = (string)$pay; $ids['pay_type'] = $types[(string)$pay]; $ids['realm'] = (string)$c['realm']; $ids['v'] = 2;
    $saved = shop_locked(function (&$d) use ($ids) { $d['qbo'] = $ids; return true; });
    if ($saved === false) return array(false, 'the stock file was busy - try again', $made);
    shop_stock_remember($items, shop_stock_skus(shop_catalogue(), shop_read()));
    return array(true, 'Linked to your ' . count($items) . ' stock items.' . ($made ? ' Made ' . implode(', ', $made) . '.' : ''), $made);
}
/* The setup, if it was made for THIS QuickBooks company - and for stock items (an older setup, from before the change,
   doesn't count: it is made again from the portal). */
function shop_qbo_ids($d, $c) {
    $q = $d['qbo'] ?? array();
    foreach (array('asset', 'income', 'cogs', 'delivery', 'vendor', 'deposit', 'pay') as $k) if (empty($q[$k])) return null;
    if (!empty($c['realm']) && ($q['realm'] ?? '') !== (string)$c['realm']) return null;
    return $q;
}
function shop_qbo_gate($c) {
    if (empty($c['live'])) return 'QuickBooks writing is switched off ($QBO_LIVE_ENABLED)';
    if (($c['only'] ?? '') !== '') return 'QuickBooks is in one-customer test mode ($QBO_ONLY_KEY)';
    return '';
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
/* A stock item's name, as the business names them: what it is, then the SKU. QuickBooks: 100 characters, no colons. */
function shop_item_name($title, $sku) {
    $t = trim(preg_replace('/\s+/', ' ', str_replace(array(':', "\t"), ' ', (string)$title)));
    // a name that already ends with its SKU (typed on the Shop tab) doesn't get it twice
    if ((string)$sku !== '' && preg_match('/\bSKU\s*' . preg_quote((string)$sku, '/') . '$/i', $t)) return rtrim(mb_substr($t, 0, 100, 'UTF-8'));
    $tail = ' - SKU ' . $sku;
    return rtrim(mb_substr($t, 0, 100 - strlen($tail), 'UTF-8')) . $tail;
}
function shop_item_body($p, $q) {
    $start = date('Y-m-d', strtotime($p['date'] . ' -1 day'));   // in stock from the day before it was bought, so the purchase counts
    return array('Name' => shop_item_name($p['title'], $p['sku']), 'Sku' => (string)$p['sku'], 'Type' => 'Inventory', 'TrackQtyOnHand' => true,
        'QtyOnHand' => 0, 'InvStartDate' => $start, 'Description' => mb_substr((string)$p['title'], 0, 4000, 'UTF-8'),
        'PurchaseDesc' => mb_substr((string)$p['title'], 0, 4000, 'UTF-8'), 'PurchaseCost' => round((float)$p['total'] / max(1, (int)$p['qty']), 2),
        'IncomeAccountRef' => array('value' => $q['income']), 'ExpenseAccountRef' => array('value' => $q['cogs']), 'AssetAccountRef' => array('value' => $q['asset']));
}
function shop_stock_purchase_body($p, $q, $item, $tax) {
    $qty = max(1, (int)$p['qty']);
    $det = array('ItemRef' => array('value' => $item), 'Qty' => $qty, 'UnitPrice' => $qty > 1 ? round((float)$p['total'] / $qty, 6) : (float)$p['total']);
    if ($tax !== '') $det['TaxCodeRef'] = array('value' => $tax);
    return array('PaymentType' => ($q['pay_type'] ?? '') === 'Credit Card' ? 'CreditCard' : 'Cash',
        'AccountRef' => array('value' => $q['pay']), 'EntityRef' => array('value' => $q['vendor'], 'type' => 'Vendor'),
        'TxnDate' => $p['date'], 'DocNumber' => $p['doc'], 'PrivateNote' => mb_substr((string)$p['note'], 0, 4000, 'UTF-8'),
        'Line' => array(array('Amount' => (float)$p['total'], 'DetailType' => 'ItemBasedExpenseLineDetail',
            'Description' => mb_substr((string)$p['title'], 0, 4000, 'UTF-8'), 'ItemBasedExpenseLineDetail' => $det)));
}
/* One machine bought -> its stock item in QuickBooks. The eBay connection and the portal's button share it.
   $p: order, date, total (postage included), qty, sku, title, doc (DocNumber), note.
   -> array(ok, purchase url | '' | why, purchase id, the stock item | null, note) */
function shop_qbo_stock_purchase($c, $q, $p, $api = 'invq_api') {
    $items = shop_qbo_stock_items($c, $api);
    if ($items === null) return array(false, 'could not read your QuickBooks stock items', '', null, '');
    $f = shop_stock_find($items, $p['sku']);
    // already a stock item (made by hand, the way it was always done): its quantity and cost are QuickBooks' - post nothing
    if (isset($f['item'])) { shop_log('qbo stock item ' . $f['item']['id'] . ' already there for SKU ' . $p['sku']); return array(true, '', '', $f['item'], 'already in QuickBooks as "' . $f['item']['name'] . '"'); }
    if ($f['err'] !== 'none') return array(false, shop_stock_why($f, $p['sku']), '', null, '');
    $found = shop_q($c, $api, "select Id from Purchase where DocNumber = '" . shop_qesc($p['doc']) . "'");
    if ($found === null) return array(false, 'could not ask QuickBooks', '', null, '');
    if (!empty($found['Purchase'][0]['Id'])) { $qid = (string)$found['Purchase'][0]['Id']; return array(true, shop_qbo_link($c, 'expense', $qid), $qid, null, 'its purchase was already in QuickBooks'); }
    $body = shop_item_body($p, $q);
    $res = call_user_func($api, $c, 'POST', '/item', $body);
    if (!qbo_lib_ok($res) && strpos(shop_qbo_why($res), 'Duplicate') !== false) {   // the name is taken (6240): the order number makes it unique
        $body['Name'] = shop_item_name($p['title'] . ' ' . $p['order'], $p['sku']);
        $res = call_user_func($api, $c, 'POST', '/item', $body);
    }
    if (!qbo_lib_ok($res) || empty($res['json']['Item']['Id'])) { shop_log('qbo stock item FAILED ' . $p['order'] . ' ' . shop_qbo_why($res)); return array(false, 'QuickBooks refused the stock item: ' . shop_qbo_why($res), '', null, ''); }
    $item = array('id' => (string)$res['json']['Item']['Id'], 'name' => $body['Name'], 'qty' => 0.0, 'cost' => shop_money($body['PurchaseCost']));
    $res = call_user_func($api, $c, 'POST', '/purchase', shop_stock_purchase_body($p, $q, $item['id'], (string)($c['tax'] ?? '')));
    if (!qbo_lib_ok($res) || empty($res['json']['Purchase']['Id'])) {
        shop_log('qbo purchase FAILED ' . $p['order'] . ' ' . shop_qbo_why($res) . ' (stock item ' . $item['id'] . ' made, nothing in it)');
        return array(false, 'QuickBooks made the stock item "' . $item['name'] . '" but refused the purchase: ' . shop_qbo_why($res), '', $item, '');
    }
    $qid = (string)$res['json']['Purchase']['Id']; $item['qty'] = (float)max(1, (int)$p['qty']);
    shop_log('qbo stock item ' . $item['id'] . ' + purchase ' . $qid . ' for eBay order ' . $p['order']);
    return array(true, shop_qbo_link($c, 'expense', $qid), $qid, $item, 'made the stock item "' . $item['name'] . '" and its purchase');
}
/* A listed machine's purchase as typed in the portal -> QuickBooks (once). -> array(ok, url|why, note) */
function shop_qbo_purchase($c, $id, $u, $api = 'invq_api') {
    if (($g = shop_qbo_gate($c)) !== '') return array(false, $g, '');
    $d = shop_read(); $k = shop_key($id, $u);
    $q = shop_qbo_ids($d, $c);
    if (!$q) return array(false, 'set QuickBooks up for the shop first', '');
    $p = $d['books'][$k]['purchase'] ?? null;
    if (!$p) return array(false, 'no purchase recorded for this machine', '');
    if (!empty($p['qbo_id'])) return array(true, (string)($p['qbo_url'] ?? ''), '');
    if (empty($u['sku'])) return array(false, shop_stock_why(array('err' => 'nosku'), ''), '');
    $r = shop_qbo_stock_purchase($c, $q, array('order' => $p['order'], 'date' => $p['date'], 'total' => $p['total'], 'qty' => 1, 'sku' => (string)$u['sku'],
        'title' => $u['name'], 'doc' => shop_doc('EB', $p['order']),
        'note' => 'Refurbished Dell for sale online: ' . $u['name'] . ' (' . $id . '), eBay order ' . $p['order'] . '. Recorded from the staff portal.'), $api);
    if (!$r[0]) return array(false, $r[1], '');
    list(, $url, $qid, $item, $note) = $r;
    shop_locked(function (&$d) use ($k, $qid, $url, $item) {
        if ($qid !== '') { $d['books'][$k]['purchase']['qbo_id'] = $qid; $d['books'][$k]['purchase']['qbo_url'] = $url; }
        if ($item) $d['books'][$k]['purchase']['qbo_item'] = $item['name'];
        return true;
    });
    return array(true, $url, $note);
}

/* ---- a machine's sale ----------------------------------------------------------------------------------------------- */
function shop_sale_body($sale, $u, $q, $cid, $tax, $item) {
    $tz = new DateTimeZone('Europe/London');
    $day = (new DateTime('@' . (int)$sale['at']))->setTimezone($tz)->format('Y-m-d');
    $lines = array();
    $l = array('Amount' => (float)$sale['price'], 'DetailType' => 'SalesItemLineDetail', 'Description' => $u['name'] . ' (' . $sale['unit'] . ')',
        'SalesItemLineDetail' => array('ItemRef' => array('value' => $item), 'Qty' => 1, 'UnitPrice' => (float)$sale['price']));
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
/* Post a sale to QuickBooks (once), on the machine's own stock item. $ensure: invq_ensure_customer (tests pass their own).
   -> array(ok, url|why) */
function shop_qbo_sale($c, $sale, $u, $api = 'invq_api', $ensure = 'invq_ensure_customer') {
    if (shop_is_test($sale, $u)) return array(false, 'a test sale - never in the books');
    if (($g = shop_qbo_gate($c)) !== '') return array(false, $g);
    $d = shop_read(); $k = $sale['unit'] . '#' . (int)$sale['ed'];
    $q = shop_qbo_ids($d, $c);
    if (!$q) return array(false, 'set QuickBooks up for the shop first');
    $had = $d['books'][$k]['sale'] ?? array();
    if (!empty($had['qbo_id']) && ($had['order'] ?? '') === $sale['order']) return array(true, (string)($had['qbo_url'] ?? ''));
    $doc = shop_doc('WEB-', $sale['order']);
    $found = shop_q($c, $api, "select Id from SalesReceipt where DocNumber = '" . shop_qesc($doc) . "'");
    if ($found === null) return array(false, 'could not ask QuickBooks');
    $qid = (string)($found['SalesReceipt'][0]['Id'] ?? '');
    $item = '';
    if ($qid === '') {
        // the machine's own stock item, by the SKU on its listing - found BEFORE the customer is made, so a missing item
        // leaves nothing half-done in QuickBooks
        $items = shop_qbo_stock_items($c, $api);
        if ($items === null) return array(false, 'could not read your QuickBooks stock items');
        $f = shop_stock_find($items, (string)($u['sku'] ?? ''));
        if (!isset($f['item'])) return array(false, shop_stock_why($f, (string)($u['sku'] ?? '')));
        $item = $f['item']['name'];
        $job = array('email' => $sale['email'], 'name' => $sale['name'], 'phone' => $sale['phone'],
                     'addr' => implode(', ', (array)$sale['lines']), 'postcode' => $sale['postcode']);
        $cu = call_user_func($ensure, $c, $job, 'shop ' . $sale['unit']);
        if (empty($cu['ok'])) return array(false, 'QuickBooks customer: ' . (string)($cu['why'] ?? ($cu['error'] ?? 'failed')));
        $res = call_user_func($api, $c, 'POST', '/salesreceipt', shop_sale_body($sale, $u, $q, (string)$cu['cid'], (string)($c['tax'] ?? ''), $f['item']['id']));
        if (!qbo_lib_ok($res) || empty($res['json']['SalesReceipt']['Id'])) { shop_log('qbo sale FAILED ' . $sale['unit'] . ' ' . shop_qbo_why($res)); return array(false, 'QuickBooks refused it: ' . shop_qbo_why($res)); }
        $qid = (string)$res['json']['SalesReceipt']['Id'];
    }
    $url = shop_qbo_link($c, 'salesreceipt', $qid);
    $order = $sale['order'];
    shop_locked(function (&$d) use ($k, $qid, $url, $order, $item) {
        $d['books'][$k]['sale'] = array('order' => $order, 'qbo_id' => $qid, 'qbo_url' => $url, 'item' => $item, 'at' => time());
        $d['stock_at'] = 0;   // its stock count changed: the portal asks QuickBooks again
        return true;
    });
    shop_log('qbo sale ' . $qid . ' for ' . $k . ($item !== '' ? ' (stock item ' . $item . ')' : ''));
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
/* Each machine listed (newest first): its state, its stock item, the sale, the book, and the profit once both halves are
   known. What it cost: typed in, else the eBay connection's purchase, else what its QuickBooks stock item says. */
function shop_books_rows($cat = null, $d = null, $now = null) {
    $cat = $cat ?: shop_catalogue(); $d = $d ?: shop_read(); $rows = array();
    $sales = array(); foreach ($d['sales'] as $s) $sales[$s['unit'] . '#' . (int)$s['ed']] = $s;
    foreach ($cat['units'] as $id => $u) {
        if (($u['status'] ?? '') === 'test') continue;
        $k = shop_key($id, $u);
        $b = $d['books'][$k] ?? array(); $s = $sales[$k] ?? null; $p = $b['purchase'] ?? null;
        $sku = (string)($u['sku'] ?? ''); $stock = shop_stock_of($d, $sku);
        // no cost typed in, but the listing names its eBay order -> the purchase the eBay connection found
        if (!$p && !empty($u['ebay'])) $p = shop_bought_purchase($d, (string)$u['ebay']);
        if (!$p && $stock && empty($stock['err']) && (float)$stock['cost'] > 0)
            $p = array('order' => '', 'date' => '', 'total' => shop_money($stock['cost']), 'ssd' => SHOP_SSD_DEFAULT, 'from' => 'qbo', 'qbo_item' => $stock['name']);
        $profit = null;
        if ($s && $p) $profit = shop_money((float)$s['amt'] - (float)$p['total'] - (float)$p['ssd'] - (float)($s['fee'] !== '' ? $s['fee'] : 0));
        $rows[] = array('id' => $id, 'name' => (string)$u['name'], 'status' => (string)$u['status'], 'state' => shop_state_of($d, $id, $u, $now),
            'price' => shop_money($u['price']), 'edition' => max(1, (int)($u['ed'] ?? 1)), 'sku' => $sku, 'stock' => $stock,
            'sale' => $s ? array('at' => (int)$s['at'], 'name' => (string)$s['name'], 'email' => (string)$s['email'], 'postcode' => (string)$s['postcode'],
                'amt' => (string)$s['amt'], 'fee' => (string)$s['fee'], 'status' => (string)$s['status'], 'order' => (string)$s['order'],
                'offline' => !empty($s['offline'])) : null,
            'purchase' => $p, 'sale_qbo' => $b['sale'] ?? null, 'profit' => $profit);
    }
    return array_reverse($rows);
}
/* The eBay connection's purchase for an order, shaped like a typed-in one (the SSD at the usual price until someone types
   the real one). null when the connection hasn't found it. */
function shop_bought_purchase($d, $order) {
    foreach ((array)($d['bought'] ?? array()) as $key => $b)
        if (($b['order'] ?? '') === $order && ($b['status'] ?? '') !== 'dismissed')
            return array('order' => $b['order'], 'date' => $b['date'], 'total' => $b['cost'], 'ssd' => SHOP_SSD_DEFAULT, 'from' => 'ebay', 'key' => $key,
                         'qbo_id' => (string)($b['qbo_id'] ?? ''), 'qbo_url' => (string)($b['qbo_url'] ?? ''), 'qbo_item' => (string)($b['qbo_item'] ?? ''), 'title' => $b['title']);
    return null;
}
/* Bought on eBay and not listed yet - "being got ready" on the Shop tab, newest first. */
/* 15 Oct 2026 (owner: edit each machine's name "so we can remove the hard drive", since every one gets a new SSD): the eBay
   title with its drive taken out, as the Shop tab's name box suggests it. A size with a drive word either side of it goes, and
   so does any size over 100GB that isn't memory ("16GB/256GB" -> "16GB"); "16GB RAM" / "8GB DDR4" / "4GB" graphics stay. The
   seller's own "Grade A" goes too: ours is set on the Shop tab. Only a suggestion - nothing is renamed until someone saves.
   Later the same day (owner: "do the seller phrases and capitals", after a "Read DESC" reached QuickBooks): the seller's sales
   talk goes as well (shop_bought_unsell) and the capitals are put right (shop_bought_caps). */
function shop_bought_suggest($title) {
    $drive = '(?:m\.?2|nvme|pcie|sata|ssd|hdd|emmc|storage|hard\s*drive|hard\s*disk|drive)';
    $sep = '[\s,\/|+&]*';
    $lead = '(?:\b(?:with|w\/|plus|and|including|incl|inc)\s*)?(?:\b(?:brand\s*)?new\s*)?';   // "RAM With (New) 256GB SSD": they go with it
    $t = shop_bought_unsell(' ' . str_replace(array("\r", "\n", "\t"), ' ', (string)$title) . ' ');
    // a drive word then its size: "SSD 512GB", "NVMe: 1TB"
    $t = preg_replace('/' . $sep . $lead . '\b(?:' . $drive . '[\s\/-]*)+:?\s*\d+(?:\.\d+)?\s?(?:gb|tb)\b/i', ' ', $t);
    // a size, then any drive words: "512GB NVMe SSD", "1TB", "256 GB" - unless it is memory
    $t = preg_replace_callback('/' . $sep . $lead . '\b(\d+(?:\.\d+)?)\s?(gb|tb)\b((?:[\s\/-]*(?:new\s*)?' . $drive . '\b)*)(?!\s*(?:ram|memory|ddr|of\s+ram|lpddr))/i',
        function ($m) { return ($m[3] !== '' || strtolower($m[2]) === 'tb' || (float)$m[1] >= 100) ? ' ' : $m[0]; }, $t);
    $t = preg_replace('/\b(?:nvme|ssd|hdd|m\.2)\b/i', ' ', $t);   // a drive word left on its own
    $t = preg_replace(array('/\(\s*grade\s*[a-d]\s*\)|\bgrade\s*[a-d]\b/i', '/\(\s*\)|\[\s*\]/'), ' ', $t);   // + brackets left empty
    // tidy: one separator where removals left two, none at the ends, no space before a comma, no "with" left dangling
    $tidy = function ($t) {
        $t = preg_replace('/\s+/', ' ', $t);
        $t = preg_replace('/(\s[-\x{2013}]\s|[,\/|+&])(?:\s*(?:[-\x{2013}](?=\s)|[,\/|+&]))+/u', '$1', $t);
        $t = preg_replace(array('/\s+/', '/\s+,/'), array(' ', ','), $t);
        return trim(preg_replace('/^[\s,\/|+&\-\x{2013}]+|[\s,\/|+&\-\x{2013}]+$/u', '', $t));
    };
    $t = $tidy($t);
    while (preg_match('/\s(?:with|w\/|plus|and|including|incl|inc)$/i', $t)) $t = $tidy(preg_replace('/\s\S+$/', '', $t));
    if ($t === '') return (string)$title;
    $t = shop_bought_caps($t);
    if (!preg_match('/^dell\b/i', $t)) $t = 'Dell ' . $t;
    return rtrim(mb_substr($t, 0, 100, 'UTF-8'));
}
/* The seller's sales talk in an eBay title - none of it is ours to say: "Read DESC", "L@@K", "FREE P&P", "UK seller", their
   warranty, their "excellent condition" and "fully tested" (our grade and notes say that), "+ charger", "ready to use", and
   the shouting symbols. A phrase goes only as whole words ("rare" goes, "rarely" doesn't). */
function shop_bought_unsell($t) {
    $p = array(
        '(?:please\s*)?(?:read|see)\s*(?:the\s*)?(?:full\s*)?(?:desc(?:ription)?|listing|details|pics|pictures|photos)\.?', 'please\s*read',
        'l[o0@]{2}k',
        '(?:free|fast|quick|speedy|next[\s-]*day|same[\s-]*day|1st[\s-]*class|tracked)\s*(?:uk\s*)?(?:p\s*&\s*p|p\s*and\s*p|postage|post|delivery|shipping|dispatch)',
        'uk\s*(?:seller|stock|based|dispatch)',
        '(?:with\s*)?(?:\d+\s*(?:days?|months?|mths?|years?|yrs?)\s*)?(?:warranty|guaranteed?)',
        '(?:in\s*)?(?:excellent|mint|immaculate|pristine|superb|perfect|vgc|(?:very\s*)?good|great|fair)\s*(?:working\s*)?(?:condition|cond)',
        'excellent|mint|immaculate|pristine|vgc',
        'fully\s*(?:working|tested|functional)|tested\s*(?:&|and)\s*working|tested|working\s*(?:perfectly|great|fine|order)?',
        'ready\s*to\s*(?:use|go)|plug\s*(?:&|and|n)\s*play|boxed|brand\s*new',
        '(?:with\s*|w\/\s*|inc(?:l|luding)?\.?\s*)?(?:original\s*|genuine\s*|official\s*)?(?:dell\s*)?(?:charger|ac\s*adapter|power\s*(?:adapter|supply|lead|cable))(?:\s*(?:included|inc))?',
        'wow|bargain|cheap(?:est)?|must\s*see|rare|stunning|beast|powerful|super\s*fast|fastest|fast|quick|speedy|nice|lovely|great\s*(?:spec|value)|top\s*spec|high\s*spec|best\s*price',
    );
    $t = preg_replace('/\b(?:' . implode('|', $p) . ')(?![a-z0-9])/i', ' ', $t);
    $r = preg_replace('/[!*~#^=_]+|[\x{2190}-\x{2BFF}\x{2700}-\x{27BF}\x{1F000}-\x{1FAFF}\x{FE0F}\x{200D}]/u', ' ', $t);
    return $r === null ? $t : $r;
}
/* Capitals as Dell and the trade write them, not as the seller typed them: "Optiplex ... Pc Intel I5 10th 24gb" ->
   "OptiPlex ... PC Intel i5 10th 24GB". A title in capitals throughout is put in ordinary case ("CORE I5 11TH GEN" ->
   "Core i5 11th Gen"); a model code it doesn't know ("RTX A2000", "E7470") is left as typed. */
function shop_bought_caps($t) {
    static $known = null;
    if ($known === null) {
        $known = array();
        foreach (explode(' ', 'Dell Latitude OptiPlex Precision Inspiron Vostro XPS Intel Core AMD Ryzen Celeron Pentium Xeon NVIDIA GeForce Quadro RTX GTX'
            . ' Radeon Laptop Notebook Ultrabook Desktop PC Computer Tower SFF USFF MFF Micro MT AIO Touchscreen Touch Screen RAM GPU CPU FHD HD UHD QHD IPS'
            . ' OLED LCD LED USB USB-C HDMI WiFi Wi-Fi Bluetooth 4G 5G LTE Webcam Backlit Keyboard Fingerprint Windows Win Pro Home Gen Generation vPro'
            . ' Thunderbolt Graphics Business Workstation Mobile Rugged Extreme 2-in-1 Office MS UK') as $w) $known[strtolower($w)] = $w;
    }
    $words = preg_match_all('/\b[A-Za-z]{2,}\b/', $t, $all) ? $all[0] : array();
    $caps = count(array_filter($words, function ($w) { return strtoupper($w) === $w; }));
    $shouting = count($words) >= 3 && $caps / count($words) >= 0.6;
    return preg_replace_callback('/[A-Za-z0-9](?:[A-Za-z0-9.\-]*[A-Za-z0-9])?/', function ($m) use ($known, $shouting) {
        $w = $m[0]; $l = strtolower($w);
        if (isset($known[$l])) return $known[$l];
        if (preg_match('/^(\d+(?:\.\d+)?)(gb|tb|mb)$/i', $w, $x)) return $x[1] . strtoupper($x[2]);                         // 24gb -> 24GB
        if (preg_match('/^i([3579])(?:-(\w+))?$/i', $w, $x))   // I5-1145g7 -> i5-1145G7; i5-8TH -> i5-8th
            return 'i' . $x[1] . (isset($x[2]) ? '-' . (preg_match('/^\d+(?:st|nd|rd|th)$/i', $x[2]) ? strtolower($x[2]) : strtoupper($x[2])) : '');
        if (preg_match('/^(\d+)(st|nd|rd|th)$/i', $w, $x)) return $x[1] . strtolower($x[2]);                                // 11TH -> 11th
        if (preg_match('/^(\d+(?:\.\d+)?)(ghz|mhz|hz)$/i', $w, $x)) return $x[1] . array('ghz' => 'GHz', 'mhz' => 'MHz', 'hz' => 'Hz')[strtolower($x[2])];
        if (preg_match('/^(win|w)(7|8|10|11)$/i', $w, $x)) return (strtolower($x[1]) === 'win' ? 'Win' : 'W') . $x[2];      // win11 -> Win11, w11 -> W11
        if (preg_match('/^(?:lp)?ddr\d+x?$|^\d+w$|^[ptakm]\d{3,4}$|^e\d{4}$/i', $w)) return strtoupper($w);               // DDR4, 65W, Quadro P620, Latitude E7470
        if ($shouting && strlen($w) >= 4 && !preg_match('/\d/', $w) && strtoupper($w) === $w) return ucfirst($l);
        return $w;
    }, $t);
}
function shop_bought_rows($cat = null, $d = null) {
    $cat = $cat ?: shop_catalogue(); $d = $d ?: shop_read();
    $listed = array(); foreach ($cat['units'] as $u) if (!empty($u['ebay'])) $listed[(string)$u['ebay']] = 1;
    $since = (int)($d['ebay']['since'] ?? 0); $rows = array();
    foreach ((array)($d['bought'] ?? array()) as $key => $b) {
        if (isset($listed[$b['order']]) || ($b['status'] ?? '') === 'dismissed') continue;
        $sku = (string)($b['sku'] ?? '');
        $rows[] = array('key' => $key, 'order' => $b['order'], 'date' => $b['date'], 'title' => $b['title'], 'cost' => $b['cost'], 'model' => $b['model'],
                        'name' => (string)($b['name'] ?? ''), 'suggest' => shop_bought_suggest($b['title']), 'grade' => (string)($b['grade'] ?? ''),
                        'notes' => (string)($b['notes'] ?? ''), 'edited' => (string)($b['edited_by'] ?? ''),
                        'qty' => (int)($b['qty'] ?? 1), 'sku' => $sku, 'stock' => shop_stock_of($d, $sku),
                        'qbo_url' => (string)($b['qbo_url'] ?? ''), 'qbo_item' => (string)($b['qbo_item'] ?? ''), 'qbo_err' => (string)($b['qbo_err'] ?? ''),
                        'before' => $since && (int)$b['created'] < $since - 86400);
    }
    usort($rows, function ($a, $b) { return strcmp($b['date'], $a['date']); });
    return $rows;
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
