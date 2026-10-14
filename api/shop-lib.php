<?php
/*
 * Refurbished Dells in stock, bought online with PayPal (14 Oct 2026). Owner: "PayPal, £15 delivery, start with 10 laptops".
 *
 * Every machine on the shelf has its own page (/refurbished-dell-for-sale/<id>/, built from shop_stock.py by shop_pages.py),
 * a fixed price and PayPal's buttons. This file is the server's half:
 *
 *   - shop-catalogue.php (WRITTEN BY THE BUILD from shop_stock.py) says what is listed, at what price, and what Google's feed
 *     says about it. Only that file's price is ever charged: the browser sends a machine's id, never an amount.
 *   - shop-state.json (server-only, gitignored, .htaccess-denied) says which machine is HELD for a buyer while PayPal's window
 *     is open (SHOP_HOLD), which is SOLD, the orders we made, and each sale with the buyer's delivery details.
 *   - One machine, one buyer: an order is made only for a machine nobody else holds, and the payment is taken (captured) with
 *     the stock file locked, so two people paying at the same moment can never both buy it. A held machine comes back by
 *     itself when the hold runs out; the same browser (its hold token) may start again straight away.
 *   - UK delivery only: PayPal's window refuses other countries (the page's onShippingAddressChange) and the capture is
 *     refused here too if the address PayPal holds is not in the UK - before any money moves.
 *   - A sale posts a card to Slack #365-job-tracker ("Laptop order from ..." - pcm-leadchase-lib lc_lead reads it) and emails
 *     the buyer from info@. A PENDING payment (PayPal still checking it) is sold to that buyer but the card says don't post it.
 *
 * The same PayPal app as "Unlock everything" (api/pcm-paypal-key.php, the owner's): its webhook goes to pcm-plus-pp.php,
 * which ignores orders that are not its own - so a shop refund is done in PayPal by the owner, and the machine goes back on
 * sale by giving it edition 2 in shop_stock.py.
 *
 * Include-only (.htaccess denies it as a URL). NO closing tag in this file.
 */
require_once __DIR__ . '/pcm-plus-pp-lib.php';   // pp_creds, pp_api, pp_why
require_once __DIR__ . '/pcm-mailmove-lib.php';  // mm_hook, mm_post_slack, mm_esc

// spelled __DIR__ . '/name' on purpose: tools/sweep-store-exposure.sh finds the stores by that pattern and checks each answers 403
if (!defined('SHOP_DIR'))   define('SHOP_DIR', __DIR__);
if (!defined('SHOP_CAT'))   define('SHOP_CAT', __DIR__ . '/shop-catalogue.php');
if (!defined('SHOP_STATE')) define('SHOP_STATE', __DIR__ . '/shop-state.json');
if (!defined('SHOP_LOG'))   define('SHOP_LOG', __DIR__ . '/shop.log');
define('SHOP_HOLD', 20 * 60);   // how long one buyer holds a machine while PayPal's window is open

function shop_log($m) {
    $lines = @file(SHOP_LOG, FILE_IGNORE_NEW_LINES); $lines = is_array($lines) ? array_slice($lines, -299) : array();
    $lines[] = gmdate('Y-m-d H:i:s') . "\t" . str_replace(array("\t", "\n"), ' ', (string)$m);
    @file_put_contents(SHOP_LOG, implode("\n", $lines) . "\n", LOCK_EX);
}
function shop_money($v) { return number_format((float)$v, 2, '.', ''); }

/* ---- what is listed (the build's file) ---------------------------------------------------------------------------------- */
function shop_catalogue($file = null) {
    $f = $file !== null ? $file : SHOP_CAT;
    $c = is_readable($f) ? (include $f) : null;
    if (!is_array($c) || !isset($c['units']) || !is_array($c['units'])) $c = array('units' => array());
    if (!isset($c['delivery'])) $c['delivery'] = '15.00';
    return $c;
}
function shop_id($v) { $v = strtolower(trim((string)$v)); return preg_match('/^[a-z0-9][a-z0-9-]{1,40}$/', $v) ? $v : ''; }
function shop_key($id, $u) { return $id . '#' . max(1, (int)($u['ed'] ?? 1)); }
function shop_delivery($u, $cat) { return ($u['status'] ?? '') === 'test' ? '0.00' : shop_money($cat['delivery']); }
function shop_total($u, $cat) { return shop_money((float)$u['price'] + (float)shop_delivery($u, $cat)); }
/* A browser's hold token -> what we keep of it (never the token itself). '' when it is not one. */
function shop_holder($t) { $t = strtolower((string)$t); return preg_match('/^[a-f0-9]{16,64}$/', $t) ? substr(hash('sha256', 'shop|' . $t), 0, 16) : ''; }

/* ---- the server's own file: held, sold, orders, sales ------------------------------------------------------------------- */
function shop_norm($d) {
    if (!is_array($d)) $d = array();
    // books (14 Oct 2026, shop-books-lib.php): per machine, what it cost and its QuickBooks entries; qbo: the setup's ids
    // bought + ebay (14 Oct 2026, shop-ebay-lib.php): Dells bought on eBay, found by the eBay connection, and its last look
    // stock (14 Oct 2026): what QuickBooks last said about each machine's own stock item, by SKU (shop_stock_remember)
    foreach (array('u', 'o', 'sales', 'books', 'qbo', 'bought', 'ebay', 'stock') as $k) if (!isset($d[$k]) || !is_array($d[$k])) $d[$k] = array();
    return $d;
}
function shop_read() { return shop_norm(@json_decode((string)@file_get_contents(SHOP_STATE), true)); }
/* Run $fn(&$d) with the file locked; it is written back only when $fn returns something other than false. */
function shop_locked($fn) {
    $lk = @fopen(SHOP_STATE . '.lock', 'c');
    if (!$lk || !@flock($lk, LOCK_EX)) { if ($lk) fclose($lk); return false; }
    $d = shop_read();
    // an order nobody paid for is forgotten after 30 days (a sale keeps its own record in 'sales')
    foreach ($d['o'] as $k => $o) if ((int)($o['at'] ?? 0) < time() - 30 * 86400) unset($d['o'][$k]);
    $res = $fn($d);
    if ($res !== false) { $tmp = SHOP_STATE . '.' . getmypid() . '.tmp'; if (@file_put_contents($tmp, json_encode($d)) !== false) @rename($tmp, SHOP_STATE); }
    flock($lk, LOCK_UN); fclose($lk);
    return $res;
}
/* -> available | held | sold | off */
function shop_state_of($d, $id, $u, $now = null) {
    $now = $now === null ? time() : (int)$now;
    $st = (string)($u['status'] ?? '');
    if ($st === 'sold') return 'sold';
    $s = $d['u'][shop_key($id, $u)] ?? null;
    if (is_array($s) && ($s['st'] ?? '') === 'sold') return 'sold';
    if ($st !== 'live' && $st !== 'test') return 'off';
    if (is_array($s) && ($s['st'] ?? '') === 'held' && (int)($s['until'] ?? 0) > $now) return 'held';
    return 'available';
}
/* What the list page and the machine pages may know: each listed machine's state. A test machine only when asked for. */
function shop_stock($cat = null, $d = null, $now = null, $also = '') {
    $cat = $cat ?: shop_catalogue(); $d = $d ?: shop_read(); $out = array();
    foreach ($cat['units'] as $id => $u)
        if (in_array($u['status'] ?? '', array('live', 'sold'), true) || ($id === $also && ($u['status'] ?? '') === 'test'))
            $out[$id] = shop_state_of($d, $id, $u, $now);
    return $out;
}

/* ---- buying: make the order ----------------------------------------------------------------------------------------- */
/* PayPal's buttons call this. $holder: shop_holder() of the browser's token. -> array(ok, order id | error)
   errors: no_such | not_for_sale | sold | held | paypal_failed | busy */
function shop_create($cr, $id, $holder, $api = 'pp_api', $now = null, $cat = null) {
    $now = $now === null ? time() : (int)$now;
    $cat = $cat ?: shop_catalogue();
    $id = shop_id($id);
    $u = $id !== '' ? ($cat['units'][$id] ?? null) : null;
    if (!$u) return array(false, 'no_such');
    if (($u['status'] ?? '') === 'sold') return array(false, 'sold');
    if (!in_array($u['status'] ?? '', array('live', 'test'), true)) return array(false, 'not_for_sale');
    $out = array(false, 'busy');
    shop_locked(function (&$d) use ($cr, $id, $u, $cat, $holder, $api, $now, &$out) {
        $st = shop_state_of($d, $id, $u, $now);
        $k = shop_key($id, $u);
        if ($st === 'sold') { $out = array(false, 'sold'); return false; }
        // held by someone else: no. Held by this same browser (it closed PayPal's window and is trying again): yes.
        if ($st === 'held' && ($holder === '' || ($d['u'][$k]['by'] ?? '') !== $holder)) { $out = array(false, 'held'); return false; }
        $price = shop_money($u['price']); $del = shop_delivery($u, $cat); $total = shop_total($u, $cat);
        $name = substr((string)$u['name'], 0, 120);
        $body = array('intent' => 'CAPTURE',
            'purchase_units' => array(array('reference_id' => 'shop', 'custom_id' => $k,
                'invoice_id' => 'SHOP-' . gmdate('ymd', $now) . '-' . strtoupper(bin2hex(random_bytes(4))), 'description' => $name,
                'amount' => array('currency_code' => 'GBP', 'value' => $total, 'breakdown' => array(
                    'item_total' => array('currency_code' => 'GBP', 'value' => $price),
                    'shipping' => array('currency_code' => 'GBP', 'value' => $del))),
                'items' => array(array('name' => $name, 'sku' => $id, 'quantity' => '1', 'category' => 'PHYSICAL_GOODS',
                    'unit_amount' => array('currency_code' => 'GBP', 'value' => $price))))),
            // GET_FROM_FILE: PayPal asks for the delivery address (in the UK - the page refuses other countries)
            'application_context' => array('brand_name' => '365 Techies', 'shipping_preference' => 'GET_FROM_FILE', 'user_action' => 'PAY_NOW', 'locale' => 'en-GB'));
        list($c, $j) = call_user_func($api, $cr, 'POST', '/v2/checkout/orders', $body, array('PayPal-Request-Id: shop-' . bin2hex(random_bytes(8))));
        $oid = (string)($j['id'] ?? '');
        if (($c !== 200 && $c !== 201) || !preg_match('/^[A-Z0-9]{10,30}$/', $oid)) { shop_log('create FAILED ' . $id . ' http ' . $c . ' ' . pp_why($j)); $out = array(false, 'paypal_failed'); return false; }
        $d['u'][$k] = array('st' => 'held', 'order' => $oid, 'until' => $now + SHOP_HOLD, 'by' => $holder);
        $d['o'][$oid] = array('at' => $now, 'unit' => $id, 'ed' => max(1, (int)($u['ed'] ?? 1)), 'amt' => $total, 'price' => $price, 'del' => $del, 'env' => (string)$cr['env']);
        $out = array(true, $oid);
        return true;
    });
    return $out;
}

/* The buyer closed PayPal's window: let the machine go at once (only the browser that holds it can). */
function shop_release($orderId, $holder) {
    $orderId = (string)$orderId; $done = false;
    if ($holder === '' || !preg_match('/^[A-Z0-9]{10,30}$/', $orderId)) return false;
    shop_locked(function (&$d) use ($orderId, $holder, &$done) {
        foreach ($d['u'] as $k => $s)
            if (($s['st'] ?? '') === 'held' && ($s['order'] ?? '') === $orderId && ($s['by'] ?? '') === $holder) { unset($d['u'][$k]); $done = true; }
        return $done ? true : false;
    });
    return $done;
}

/* ---- buying: take the payment --------------------------------------------------------------------------------------- */
/* Where PayPal will deliver it, and who to: from an order (or a capture's) answer. */
function shop_ship_of($j) {
    $pu = $j['purchase_units'][0] ?? array();
    $a = (array)($pu['shipping']['address'] ?? array());
    $lines = array();
    foreach (array('address_line_1', 'address_line_2', 'admin_area_2', 'admin_area_1') as $f) if (trim((string)($a[$f] ?? '')) !== '') $lines[] = trim((string)$a[$f]);
    $payer = (array)($j['payer'] ?? array());
    $pn = trim((string)($payer['name']['given_name'] ?? '') . ' ' . (string)($payer['name']['surname'] ?? ''));
    return array(
        'name' => trim((string)($pu['shipping']['name']['full_name'] ?? '')) !== '' ? trim((string)$pu['shipping']['name']['full_name']) : $pn,
        'payer' => $pn,
        'email' => strtolower(trim((string)($payer['email_address'] ?? ''))),
        'phone' => trim((string)($payer['phone']['phone_number']['national_number'] ?? '')),
        'lines' => $lines,
        'postcode' => strtoupper(trim((string)($a['postal_code'] ?? ''))),
        'country' => strtoupper(trim((string)($a['country_code'] ?? ''))),
    );
}

/* The buyer approved in PayPal's window. -> array(state, sale record | note)
   state: sold | pending | had (already sold to this order) | not_uk | declined (choose another way to pay) | gone (someone
   else has it, or it was taken off sale) | refused | busy. Only sold and pending are NEW sales (email + Slack once). */
function shop_capture($cr, $orderId, $api = 'pp_api', $now = null, $cat = null) {
    $now = $now === null ? time() : (int)$now;
    $cat = $cat ?: shop_catalogue();
    $orderId = (string)$orderId;
    if (!preg_match('/^[A-Z0-9]{10,30}$/', $orderId)) return array('refused', 'bad order id');
    $o = shop_read()['o'][$orderId] ?? null;
    if (!is_array($o)) return array('refused', 'not an order we made');
    $id = (string)$o['unit'];
    $u = $cat['units'][$id] ?? null;
    if (!$u || max(1, (int)($u['ed'] ?? 1)) !== (int)$o['ed']) return array('gone', 'that machine is no longer listed');

    // where it is going, before any money moves
    list($c, $j) = call_user_func($api, $cr, 'GET', '/v2/checkout/orders/' . $orderId);
    if ($c !== 200 || !is_array($j)) { shop_log('read FAILED ' . $orderId . ' http ' . $c . ' ' . pp_why($j)); return array('busy', 'could not read the order from PayPal'); }
    $ship = shop_ship_of($j);
    if ($ship['country'] !== 'GB') return array('not_uk', 'delivery address not in the UK');
    $amt = (string)($j['purchase_units'][0]['amount']['value'] ?? ''); $cur = (string)($j['purchase_units'][0]['amount']['currency_code'] ?? '');
    if ($cur !== 'GBP' || abs((float)$amt - (float)$o['amt']) > 0.001) return array('refused', 'amount ' . $cur . ' ' . $amt . ' is not the GBP ' . $o['amt'] . ' we asked for');

    $res = null;
    shop_locked(function (&$d) use ($cr, $orderId, $o, $id, $u, $api, $now, $ship, &$res) {
        $k = shop_key($id, $u);
        $s = $d['u'][$k] ?? null;
        if (is_array($s) && ($s['st'] ?? '') === 'sold') {
            if (($s['order'] ?? '') === $orderId) {
                foreach ($d['sales'] as $sale) if (($sale['order'] ?? '') === $orderId) { $res = array('had', $sale); return false; }
                $res = array('had', array('order' => $orderId, 'unit' => $id)); return false;
            }
            $res = array('gone', 'sold to someone else'); return false;
        }
        if (!in_array($u['status'] ?? '', array('live', 'test'), true)) { $res = array('gone', 'taken off sale'); return false; }
        if (is_array($s) && ($s['st'] ?? '') === 'held' && ($s['order'] ?? '') !== $orderId && (int)($s['until'] ?? 0) > $now) { $res = array('gone', 'held for another buyer'); return false; }
        // take the payment with the file locked: nobody else can buy it in the meantime
        list($c2, $j2) = call_user_func($api, $cr, 'POST', '/v2/checkout/orders/' . $orderId . '/capture', '{}', array('Prefer: return=representation', 'PayPal-Request-Id: shop-cap-' . $orderId));
        if ($c2 === 422 && strpos((string)json_encode($j2), 'ORDER_ALREADY_CAPTURED') !== false) list($c2, $j2) = call_user_func($api, $cr, 'GET', '/v2/checkout/orders/' . $orderId);
        if ($c2 === 422 && strpos((string)json_encode($j2), 'INSTRUMENT_DECLINED') !== false) { $res = array('declined', 'card or account declined'); return false; }
        if ($c2 < 200 || $c2 >= 300 || !is_array($j2)) { shop_log('capture FAILED ' . $orderId . ' http ' . $c2 . ' ' . pp_why($j2)); $res = array('refused', 'PayPal did not take the payment' . (pp_why($j2) !== '' ? ': ' . pp_why($j2) : '')); return false; }
        $cap = $j2['purchase_units'][0]['payments']['captures'][0] ?? null;
        $cst = strtoupper((string)($cap['status'] ?? ''));
        if (!is_array($cap) || ($cst !== 'COMPLETED' && $cst !== 'PENDING')) { shop_log('capture ' . $orderId . ' ' . strtolower($cst)); $res = array('refused', 'payment ' . strtolower($cst !== '' ? $cst : 'missing')); return false; }
        $paid = (string)($cap['amount']['value'] ?? '');
        if (abs((float)$paid - (float)$o['amt']) > 0.001) shop_log('capture ' . $orderId . ' paid ' . $paid . ' not ' . $o['amt'] . ' - CHECK');
        $s2 = shop_ship_of($j2);
        foreach (array('name', 'payer', 'email', 'phone', 'postcode') as $f) if ($s2[$f] === '') $s2[$f] = $ship[$f];
        if (!$s2['lines']) $s2['lines'] = $ship['lines'];
        $sale = array('at' => $now, 'unit' => $id, 'ed' => (int)$o['ed'], 'order' => $orderId, 'capture' => (string)($cap['id'] ?? ''),
            'status' => strtolower($cst), 'amt' => $o['amt'], 'price' => $o['price'], 'del' => $o['del'], 'env' => (string)$cr['env'],
            // PayPal's fee, as PayPal reports it on the capture (for the machine's profit in the staff portal)
            'fee' => (string)($cap['seller_receivable_breakdown']['paypal_fee']['value'] ?? ''),
            'name' => $s2['name'], 'email' => $s2['email'], 'phone' => $s2['phone'], 'lines' => $s2['lines'], 'postcode' => $s2['postcode']);
        $d['u'][$k] = array('st' => 'sold', 'order' => $orderId, 'at' => $now);
        $d['sales'][] = $sale;
        $res = array($cst === 'PENDING' ? 'pending' : 'sold', $sale);
        return true;
    });
    return $res !== null ? $res : array('busy', 'the stock file was busy - try again');
}

/* ---- after a sale: Slack and the buyer's email ---------------------------------------------------------------------- */
function shop_is_test($sale, $u) { return ($u['status'] ?? '') === 'test' || ($sale['env'] ?? '') === 'sandbox'; }
/* The card for #365-job-tracker. Its plain first line is what lc_lead recognises ("Laptop order from NAME (machine)"); a test
   sale starts [INTERNAL TEST] so it is never chased as a lead. */
function shop_card($sale, $u, $now = null) {
    $kind = ($u['kind'] ?? 'laptop') === 'desktop' ? 'Desktop' : 'Laptop';
    $test = shop_is_test($sale, $u);
    $who = $sale['name'] !== '' ? $sale['name'] : ($sale['email'] !== '' ? $sale['email'] : 'a PayPal buyer');
    $first = ($test ? '[INTERNAL TEST] ' : '') . $kind . ' order from ' . $who . ' (' . $u['name'] . ', ' . $sale['unit'] . ')';
    $addr = implode("\n", array_merge($sale['lines'], array($sale['postcode'])));
    $fields = array(
        array('type' => 'mrkdwn', 'text' => "*Name:*\n" . mm_esc($sale['name'])),
        array('type' => 'mrkdwn', 'text' => "*Email:*\n" . mm_esc($sale['email'])),
        array('type' => 'mrkdwn', 'text' => "*Phone:*\n" . mm_esc($sale['phone'] !== '' ? $sale['phone'] : 'not given')),
        array('type' => 'mrkdwn', 'text' => "*Machine:*\n" . mm_esc($u['name']) . "\n" . mm_esc($sale['unit'])),
        array('type' => 'mrkdwn', 'text' => "*Paid:*\n£" . mm_esc($sale['amt']) . ' (£' . mm_esc($sale['price']) . ' + £' . mm_esc($sale['del']) . ' delivery)'),
        array('type' => 'mrkdwn', 'text' => "*Deliver to:*\n" . mm_esc($addr)),
    );
    $next = $sale['status'] === 'pending'
        ? ":warning: *PayPal is still checking this payment* - don't send the machine until PayPal shows it as completed."
        : 'Send it within 2 working days by tracked courier and email the buyer the tracking number. Then record the sale in QuickBooks.';
    $next .= ' PayPal order ' . mm_esc($sale['order']) . ', payment ' . mm_esc($sale['capture']) . '.';
    $next .= ' Mark it sold in shop_stock.py (status \'sold\') at the next website build.';
    $tz = new DateTimeZone('Europe/London');
    $when = (new DateTime('@' . ($now === null ? time() : (int)$now)))->setTimezone($tz)->format('H:i, D j M');
    $blocks = array(
        array('type' => 'header', 'text' => array('type' => 'plain_text', 'text' => "\xF0\x9F\x92\xBB " . ($test ? 'TEST ' : '') . $kind . ' sold: ' . substr((string)$u['name'], 0, 100), 'emoji' => true)),
        array('type' => 'section', 'fields' => $fields),
        array('type' => 'section', 'text' => array('type' => 'mrkdwn', 'text' => $next)),
        array('type' => 'context', 'elements' => array(array('type' => 'mrkdwn', 'text' => 'via /refurbished-dell-for-sale/' . mm_esc($sale['unit']) . "/ \xC2\xB7 " . $when))),
    );
    return array('text' => $first, 'blocks' => $blocks, 'unfurl_links' => false);
}
function shop_slack($sale, $u) {
    $hook = mm_hook(SHOP_DIR);
    return $hook !== '' && mm_post_slack($hook, shop_card($sale, $u));
}
/* The buyer's own copy (PayPal sends its receipt too). -> array(subject, body) */
function shop_email($sale, $u, $cat) {
    $first = trim(strtok((string)$sale['name'], ' ')) ?: 'there';
    $test = shop_is_test($sale, $u);
    $addr = implode("\n", array_map(function ($l) { return '  ' . $l; }, array_merge($sale['lines'], array($sale['postcode']))));
    $subj = ($test ? '[TEST] ' : '') . 'Your 365 Techies order: ' . $u['name'];
    $body = "Hello " . $first . ",\n\n"
        . "Thank you for buying from us. Here is your order:\n\n"
        . "  " . $u['name'] . " (" . $sale['unit'] . ")\n"
        . "  Price: £" . $sale['price'] . "\n"
        . "  UK delivery: £" . $sale['del'] . "\n"
        . "  Total paid: £" . $sale['amt'] . " (PayPal order " . $sale['order'] . ")\n\n"
        . "We'll deliver it to:\n" . $addr . "\n\n"
        . ($sale['status'] === 'pending'
            ? "PayPal is still checking your payment. As soon as it clears, we'll send your computer and email you the tracking number.\n\n"
            : "We'll send it within 2 working days by tracked courier and email you the tracking number.\n\n")
        . "It arrives ready to use: Windows set up, the new Samsung SSD fitted and tested, and 365 PC Manager installed to keep it healthy.\n\n"
        . "Changed your mind? You have 14 days from delivery, and returning it is free: just reply to this email. If anything is wrong with it, tell us and we'll put it right. Your guarantee is 12 months, or 5 years while you're on one of our support plans:\n"
        . "https://365techies.co.uk/our-guarantees/\n\n"
        . "Any questions, reply to this email or call 01202 775566 - a real person will answer.\n\n"
        . "365 Techies Ltd\nhttps://365techies.co.uk\n";
    return array($subj, $body);
}
function shop_send_email($sale, $u, $cat) {
    if (!function_exists('rv_send_raw') || !filter_var((string)$sale['email'], FILTER_VALIDATE_EMAIL)) return false;
    list($s, $b) = shop_email($sale, $u, $cat);
    return (bool)rv_send_raw($sale['email'], $s, $b);
}

/* ---- Google's product feed (api/shop-feed.php) ---------------------------------------------------------------------- */
/* Every listed machine: in_stock while it can be bought (or is only held), out_of_stock once the server has sold it - the
   next build marks it 'sold' and it leaves the feed. The test machine and drafts are never in it. */
function shop_feed_xml($cat = null, $d = null, $now = null) {
    $cat = $cat ?: shop_catalogue(); $d = $d ?: shop_read();
    $x = function ($s) { return htmlspecialchars((string)$s, ENT_XML1 | ENT_QUOTES, 'UTF-8'); };
    $items = '';
    foreach ($cat['units'] as $id => $u) {
        if (($u['status'] ?? '') !== 'live') continue;
        $st = shop_state_of($d, $id, $u, $now);
        $imgs = array_values((array)($u['images'] ?? array()));
        $items .= "  <item>\n"
            . "    <g:id>" . $x($id) . "</g:id>\n"
            . "    <g:title>" . $x($u['title']) . "</g:title>\n"
            . "    <g:description>" . $x($u['desc']) . "</g:description>\n"
            . "    <g:link>" . $x($u['url']) . "</g:link>\n"
            . ($imgs ? "    <g:image_link>" . $x($imgs[0]) . "</g:image_link>\n" : '');
        foreach (array_slice($imgs, 1, 10) as $im) $items .= "    <g:additional_image_link>" . $x($im) . "</g:additional_image_link>\n";
        $items .= "    <g:availability>" . ($st === 'sold' ? 'out_of_stock' : 'in_stock') . "</g:availability>\n"
            . "    <g:price>" . $x(shop_money($u['price'])) . " GBP</g:price>\n"
            . "    <g:condition>refurbished</g:condition>\n"
            . "    <g:brand>Dell</g:brand>\n"
            . "    <g:identifier_exists>no</g:identifier_exists>\n"
            . "    <g:google_product_category>" . $x($u['gpc']) . "</g:google_product_category>\n"
            . "    <g:product_type>" . $x($u['ptype']) . "</g:product_type>\n"
            . "    <g:shipping>\n      <g:country>GB</g:country>\n      <g:service>Tracked courier</g:service>\n      <g:price>" . $x(shop_money($cat['delivery'])) . " GBP</g:price>\n"
            . "      <g:min_handling_time>" . (int)($cat['handling'][0] ?? 1) . "</g:min_handling_time>\n      <g:max_handling_time>" . (int)($cat['handling'][1] ?? 2) . "</g:max_handling_time>\n"
            . "      <g:min_transit_time>" . (int)($cat['transit'][0] ?? 1) . "</g:min_transit_time>\n      <g:max_transit_time>" . (int)($cat['transit'][1] ?? 2) . "</g:max_transit_time>\n    </g:shipping>\n"
            . "  </item>\n";
    }
    return '<?xml version="1.0" encoding="UTF-8"?>' . "\n"
        . '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">' . "\n<channel>\n"
        . "  <title>365 Techies - refurbished Dell in stock</title>\n  <link>https://365techies.co.uk/refurbished-dell-for-sale/</link>\n"
        . "  <description>Refurbished Dell laptops and desktops in stock at 365 Techies, Bournemouth</description>\n"
        . $items . "</channel>\n</rss>\n";
}
