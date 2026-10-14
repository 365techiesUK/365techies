<?php
/*
 * The refurbished Dells for sale - the staff portal's card (14 Oct 2026). Staff session only. How it works: shop-lib.php
 * (selling) and shop-books-lib.php (each machine's purchase and sale in QuickBooks).
 * POST {stoken, machine, do, ...}:
 *   do=list (default)                       -> {ok, rows: [machine, state, sale, purchase, QuickBooks links, profit], qbo: {...}}
 *   do=accounts                             -> + accounts: the Bank / Credit Card accounts to choose from for the setup
 *   do=setup {deposit, pay}                 -> makes or finds the two accounts, two items and the eBay vendor in QuickBooks
 *   do=purchase {unit, order, date, total, ssd, qbo: true|false}
 *                                           -> keeps what the machine cost (the eBay order) and, with qbo, posts it
 *   do=saleqbo {unit}                       -> posts its online sale to QuickBooks (when that didn't happen by itself)
 *   do=offline {unit} | do=online {unit}    -> sold some other way: the website stops selling it / undo that
 * Every answer: {ok, note, err} plus the list. NO closing tag in this file.
 */
error_reporting(0);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');
require_once __DIR__ . '/visitors-tally-lib.php';   // vis_staff_ok(); top-level scope on purpose
require_once __DIR__ . '/shop-books-lib.php';

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
elseif ($do === 'accounts' || $do === 'setup') {
    $cc = $conn();
    if (empty($cc['ok'])) $out['err'] = 'QuickBooks isn\'t connected (' . (string)($cc['why'] ?? '') . ').';
    elseif ($do === 'accounts') { $a = shop_qbo_money_accounts($cc); if ($a === null) $out['err'] = 'Couldn\'t read your QuickBooks accounts - try again.'; else $out['accounts'] = $a; }
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
                else { list($ok, $res) = shop_qbo_purchase($cc, $id, $u); if ($ok) $out['note'] .= ' It\'s in QuickBooks.'; else $out['err'] = 'Saved here, but not in QuickBooks: ' . $res . '.'; }
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
elseif ($do === 'offline' || $do === 'online') {
    $r = shop_mark_offline($id, $u, $by, $do === 'offline');
    if ($r === 'ok') { $out['note'] = $do === 'offline' ? $u['name'] . ' is marked sold - the website won\'t sell it.' : $u['name'] . ' is for sale on the website again.'; shop_log("$do $id by $by"); }
    else $out['err'] = ucfirst($r) . '.';
}

// the list, with every answer
$d = shop_read();
$out['rows'] = shop_books_rows($cat, $d);
$q = $d['qbo'] ?? array();
$out['qbo'] = array('setup' => !empty($q['item']) && !empty($q['deposit']), 'ssd_default' => SHOP_SSD_DEFAULT,
    'live' => $c !== null ? !empty($c['live']) : null);
sa_out($out);
