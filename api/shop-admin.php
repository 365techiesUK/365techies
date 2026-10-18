<?php
/*
 * The refurbished Dells for sale - the staff portal's card (14 Oct 2026). Staff session only. How it works: shop-lib.php
 * (selling) and shop-books-lib.php (each machine's purchase and sale in QuickBooks).
 * POST {stoken, machine, do, ...}:
 *   do=list (default)                       -> {ok, rows: [machine, state, sale, purchase, QuickBooks links, profit], qbo: {...}}
 *   do=accounts                             -> + accounts: the Bank / Credit Card accounts to choose from for the setup
 *   do=setup {deposit, pay}                 -> links the shop to the stock items' accounts; finds or makes the delivery item
 *                                              and the eBay vendor in QuickBooks
 *   do=cardacc {card}                       -> the account Stripe pays the CARD sales into (18 Oct 2026)
 *   do=stock                                -> asks QuickBooks now about each machine's stock item (normally every 10 min)
 *   do=purchase {unit, order, date, total, ssd, qbo: true|false}
 *                                           -> keeps what the machine cost (the eBay order) and, with qbo, puts it in
 *                                              QuickBooks as its stock item (or links the one already there)
 *   do=saleqbo {unit}                       -> posts its online sale to QuickBooks (when that didn't happen by itself)
 *   do=offline {unit} | do=online {unit}    -> sold some other way: the website stops selling it / undo that
 *   do=ebaycheck                            -> ask eBay now for Dells we've bought (shop-ebay-lib.php; normally hourly by cron)
 *   do=boughtqbo {key}                      -> put one eBay purchase in QuickBooks (an older one, or a retry)
 *   do=dismiss {key} | do=undismiss {key}   -> an eBay purchase that isn't for the shop: off the Shop tab / back on it
 *   do=boughtedit {key, name, grade, notes, qbo: true|false}
 *                                           -> an eBay purchase's own name (eBay's title without the drive), grade and
 *                                              condition notes; with qbo, its QuickBooks stock item is renamed to match
 * Every answer: {ok, note, err} plus the list. NO closing tag in this file.
 */
error_reporting(0);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');
require_once __DIR__ . '/visitors-tally-lib.php';   // vis_staff_ok(); top-level scope on purpose
require_once __DIR__ . '/shop-ebay-lib.php';   // + shop-books-lib.php

function sa_out($a, $code = 200) { http_response_code($code); echo json_encode($a, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE); exit; }
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') sa_out(array('ok' => false, 'error' => 'method'), 405);
$in = json_decode((string)file_get_contents('php://input', false, null, 0, 20000), true);
if (!is_array($in)) $in = array();
if (!vis_staff_ok($in, __DIR__)) sa_out(array('ok' => false, 'error' => 'auth'), 403);

// who: the staff session's sign-in name ("steve@..." -> "Steve"), as pcm-plus-admin.php does
$tok = preg_replace('/[^a-f0-9]/', '', (string)($in['stoken'] ?? ''));
$db = $tok !== '' ? @json_decode((string)@file_get_contents(__DIR__ . '/pcm-data.json'), true) : null;
$rec = (is_array($db) && isset($db['staff'][$tok]) && is_array($db['staff'][$tok])) ? $db['staff'][$tok] : array();
$login = (string)($rec['login'] ?? ($rec['email'] ?? ''));
$by = ucfirst(strtolower(preg_replace('/[^A-Za-z]/', '', (string)strstr($login . '@', '@', true))));
$by = $by !== '' ? $by : 'Staff';

$do = preg_replace('/[^a-z]/', '', (string)($in['do'] ?? 'list'));
$cat = shop_catalogue();
$id = shop_id($in['unit'] ?? '');
$u = $id !== '' ? ($cat['units'][$id] ?? null) : null;
$out = array('ok' => true, 'note' => '', 'err' => '');
$c = null;
$conn = function () use (&$c) { if ($c === null) $c = invq_connect(); return $c; };

if (in_array($do, array('purchase', 'saleqbo', 'offline', 'online'), true) && !$u) $out['err'] = 'That machine isn\'t in the stock list.';
elseif ($do === 'accounts' || $do === 'setup' || $do === 'cardacc') {
    $cc = $conn();
    if (empty($cc['ok'])) $out['err'] = 'QuickBooks isn\'t connected (' . (string)($cc['why'] ?? '') . ').';
    elseif ($do === 'accounts') { $a = shop_qbo_money_accounts($cc); if ($a === null) $out['err'] = 'Couldn\'t read your QuickBooks accounts - try again.'; else $out['accounts'] = $a; }
    elseif ($do === 'cardacc') {
        list($ok, $msg) = shop_qbo_card_account($cc, (string)($in['card'] ?? ''));
        if ($ok) { $out['note'] = $msg; shop_log("qbo card account by $by: $msg"); } else $out['err'] = ucfirst($msg) . '.';
    }
    else {
        list($ok, $msg) = shop_qbo_setup($cc, (string)($in['deposit'] ?? ''), (string)($in['pay'] ?? ''));
        if ($ok) { $out['note'] = 'QuickBooks is set up for the shop. ' . $msg; shop_log("qbo setup by $by: $msg"); } else $out['err'] = ucfirst($msg) . '.';
    }
}
elseif ($do === 'purchase') {
    $p = shop_purchase_clean($in);
    if (is_string($p)) $out['err'] = 'Check ' . $p . '.';
    else {
        $r = shop_book_purchase($id, $u, $p, $by);
        if ($r !== true) $out['err'] = ucfirst($r) . '.';
        else {
            $out['note'] = 'Saved what ' . $u['name'] . ' cost.';
            if (!empty($in['qbo'])) {
                $cc = $conn();
                if (empty($cc['ok'])) $out['err'] = 'Saved here, but QuickBooks isn\'t connected (' . (string)($cc['why'] ?? '') . ').';
                else { list($ok, $res, $nt) = shop_qbo_purchase($cc, $id, $u); if ($ok) $out['note'] .= ' QuickBooks: ' . ($nt !== '' ? $nt : 'done') . '.'; else $out['err'] = 'Saved here, but not in QuickBooks: ' . $res . '.'; }
            }
        }
    }
}
elseif ($do === 'saleqbo') {
    $sale = null; foreach (shop_read()['sales'] as $s) if ($s['unit'] === $id && (int)$s['ed'] === max(1, (int)($u['ed'] ?? 1))) $sale = $s;
    if (!$sale) $out['err'] = 'No online sale of this machine to put in QuickBooks.';
    else {
        $cc = $conn();
        if (empty($cc['ok'])) $out['err'] = 'QuickBooks isn\'t connected (' . (string)($cc['why'] ?? '') . ').';
        else { list($ok, $res) = shop_qbo_sale($cc, $sale, $u); if ($ok) $out['note'] = 'The sale is in QuickBooks.'; else $out['err'] = 'Not in QuickBooks: ' . $res . '.'; }
    }
}
elseif ($do === 'ebaycheck') {
    list($ok, $msg, $new) = shop_ebay_sweep(true);
    if ($ok) $out['note'] = 'Asked eBay: ' . ($new ? count($new) . ' new Dell purchase' . (count($new) === 1 ? '' : 's') . ' found.' : 'nothing new.');
    else $out['err'] = 'eBay: ' . $msg . '.';
}
elseif ($do === 'boughtqbo') {
    $key = preg_replace('/[^0-9A-Za-z#-]/', '', (string)($in['key'] ?? ''));
    $cc = $conn();
    if (empty($cc['ok'])) $out['err'] = 'QuickBooks isn\'t connected (' . (string)($cc['why'] ?? '') . ').';
    else { list($ok, $res, $nt) = shop_qbo_bought($cc, $key); if ($ok) $out['note'] = 'QuickBooks: ' . ($nt !== '' ? $nt : 'that eBay purchase is in') . '.'; else $out['err'] = 'Not in QuickBooks: ' . $res . '.'; }
}
elseif ($do === 'dismiss' || $do === 'undismiss') {
    $key = preg_replace('/[^0-9A-Za-z#-]/', '', (string)($in['key'] ?? ''));
    $r = shop_ebay_dismiss($key, $by, $do === 'undismiss');
    if ($r === 'ok') $out['note'] = $do === 'dismiss' ? 'Taken off the Shop tab (anything already in QuickBooks stays there).' : 'Back on the Shop tab.';
    else $out['err'] = ucfirst($r) . '.';
}
elseif ($do === 'boughtedit') {
    $key = preg_replace('/[^0-9A-Za-z#-]/', '', (string)($in['key'] ?? ''));
    $r = shop_ebay_edit($key, array('name' => $in['name'] ?? '', 'grade' => $in['grade'] ?? '', 'notes' => $in['notes'] ?? ''), $by);
    if ($r !== 'ok') $out['err'] = ucfirst($r) . '.';
    else {
        $out['note'] = 'Saved.'; shop_log("bought $key edited by $by");
        if (!empty($in['qbo'])) {
            $cc = $conn();
            if (empty($cc['ok'])) { $out['note'] = ''; $out['err'] = 'Saved here, but QuickBooks isn\'t connected (' . (string)($cc['why'] ?? '') . '), so its stock item keeps its old name.'; }
            else {
                list($ok, $msg) = shop_qbo_rename_bought($cc, $key);
                if ($ok) $out['note'] = 'Saved. QuickBooks: ' . $msg . '.'; else { $out['note'] = ''; $out['err'] = 'Saved here, but QuickBooks: ' . $msg . '.'; }
            }
        }
    }
}
elseif ($do === 'offline' || $do === 'online') {
    $r = shop_mark_offline($id, $u, $by, $do === 'offline');
    if ($r === 'ok') { $out['note'] = $do === 'offline' ? $u['name'] . ' is marked sold - the website won\'t sell it.' : $u['name'] . ' is for sale on the website again.'; shop_log("$do $id by $by"); }
    else $out['err'] = ucfirst($r) . '.';
}

// what QuickBooks says about each machine's stock item: asked again every ten minutes (or now, with do=stock)
$d = shop_read();
if (shop_qbo_ids($d, array()) && ($do === 'stock' || (int)($d['stock_at'] ?? 0) < time() - SHOP_STOCK_TTL)) {
    $cc = $conn();
    if (!empty($cc['ok'])) {
        $items = shop_qbo_stock_items($cc);
        if ($items !== null) { shop_stock_remember($items, shop_stock_skus($cat, $d)); if ($do === 'stock') $out['note'] = 'Asked QuickBooks: ' . count($items) . ' stock items.'; }
        elseif ($do === 'stock') $out['err'] = 'Couldn\'t read your QuickBooks stock items - try again.';
    } elseif ($do === 'stock') $out['err'] = 'QuickBooks isn\'t connected (' . (string)($cc['why'] ?? '') . ').';
}

// the list, with every answer
$d = shop_read();
$out['rows'] = shop_books_rows($cat, $d);
$out['bought'] = shop_bought_rows($cat, $d);
$e = $d['ebay'] ?? array();
$out['ebay'] = array('set' => shop_ebay_creds() !== null, 'checked' => (int)($e['checked'] ?? 0), 'since' => (int)($e['since'] ?? 0), 'error' => (string)($e['error'] ?? ''));
$q = $d['qbo'] ?? array();
// setup: made for the stock items; was: an older setup (from before the change) - it is made again, with the same accounts
$out['qbo'] = array('setup' => shop_qbo_ids($d, array()) !== null, 'was' => empty($q['asset']) && !empty($q['deposit']),
    'deposit' => (string)($q['deposit'] ?? ''), 'pay' => (string)($q['pay'] ?? ''), 'stock_at' => (int)($d['stock_at'] ?? 0),
    // card sales through Stripe (18 Oct 2026): the account they go into, and whether the Stripe key file is on the server
    'card' => (string)($q['deposit_card'] ?? ''), 'card_on' => st_creds() !== null, 'clash' => count($d['clash']),
    'ssd_default' => SHOP_SSD_DEFAULT, 'live' => $c !== null ? !empty($c['live']) : null);
sa_out($out);
