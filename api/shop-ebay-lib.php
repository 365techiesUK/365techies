<?php
/*
 * Dells bought on eBay -> the shop's books, by themselves (14 Oct 2026). Owner: "can we get it so it automatically picks up
 * what we've bought ... Latitudes and OptiPlexes ... from eBay ... as I order stuff ... adds it automatically into
 * QuickBooks? And then it appears for sale". He chose eBay's own connection (not reading eBay's emails).
 *
 *   - Once an hour (tm-cron.php, every 15 minutes, asks eBay at most hourly) the server asks eBay's Trading API GetOrders
 *     for the orders where WE are the buyer, and keeps each whole Dell computer (a Latitude / OptiPlex / Precision with a
 *     processor in its title; never a part, a charger, a screen, or anything "for parts").
 *   - Each new one: kept in shop-state.json 'bought' (eBay order, item number, its SKU = the item number's last six digits,
 *     date, what it cost with postage, the title, a model guess - never the seller or anyone else's details: this is our own
 *     account's data only, as eBay's "own account use" exemption from its account-deletion notifications requires), put in
 *     QuickBooks as its own STOCK ITEM the way the business keeps stock (shop-books-lib shop_qbo_stock_purchase: if a stock
 *     item with that SKU is already there - made by hand - nothing is posted; otherwise the item, then the eBay purchase that
 *     brings it into stock, DocNumber EB<order>, never twice) and one line posted to #365-job-tracker.
 *   - ⚠ Only orders made AFTER the connection first worked go into QuickBooks by themselves: an older one may already be
 *     in QuickBooks, so it waits on the Shop tab with a button. And when the payment arrives in the bank feed, QuickBooks
 *     offers to MATCH it to our purchase - Match, never Add.
 *   - When the machine is got ready and listed, its shop_stock.py row carries ebay="<order>" (shop_intake.py --order), so
 *     its page, profit and books link to this purchase without anyone typing the cost.
 *
 * The owner's server-only file api/ebay-key.php (never in git, .htaccess-denied), from developer.ebay.com:
 *     $EBAY_APP_ID = '...';  $EBAY_DEV_ID = '...';  $EBAY_CERT_ID = '...';
 *     $EBAY_TOKEN = '...';           (the Auth'n'Auth user token, 18 months)   - or, instead -
 *     $EBAY_REFRESH_TOKEN = '...';   (an OAuth refresh token; the 2-hour access token is cached in ebay-token.json)
 * Include-only. NO closing tag in this file.
 */
require_once __DIR__ . '/shop-books-lib.php';

if (!defined('EBAY_KEYF'))  define('EBAY_KEYF', __DIR__ . '/ebay-key.php');
if (!defined('EBAY_TOKF'))  define('EBAY_TOKF', __DIR__ . '/ebay-token.json');
define('EBAY_EVERY', 3600);          // ask eBay at most this often (the cron runs every 15 minutes)
define('EBAY_FIRST_DAYS', 90);       // the first look goes this far back (GetOrders' own limit)
define('EBAY_COMPAT', '1331');
// 15 Oct 2026 (owner: "make the change, so the cost of it's right"): a machine's cost is what the order actually took from us
// - eBay's AmountPaid (else its Total), shared across the order's items to the penny - not item + postage, which left out
// what eBay adds at checkout (about 5% on the first three: 237.74 vs 249.19 paid). Version 2 re-reads the 90 days ONCE and
// corrects purchases not yet posted to QuickBooks; a posted one keeps its cost (its QuickBooks purchase says it).
define('EBAY_COST_V', 2);

function shop_ebay_creds($file = null) {
    $src = preg_replace('/^\xEF\xBB\xBF/', '', (string)@file_get_contents($file !== null ? $file : EBAY_KEYF));
    $g = function ($n) use ($src) { return preg_match('/(?:^|;|<\?php)[ \t]*\$' . $n . '\s*=\s*([\'"])([^\'"]+)\1\s*;/m', $src, $m) ? trim($m[2]) : ''; };
    $c = array('app' => $g('EBAY_APP_ID'), 'dev' => $g('EBAY_DEV_ID'), 'cert' => $g('EBAY_CERT_ID'), 'token' => $g('EBAY_TOKEN'),
               'refresh' => $g('EBAY_REFRESH_TOKEN'), 'scopes' => $g('EBAY_SCOPES') !== '' ? $g('EBAY_SCOPES') : 'https://api.ebay.com/oauth/api_scope');
    if ($c['app'] === '' || $c['cert'] === '') return null;
    if ($c['token'] === '' && $c['refresh'] === '') return null;
    return $c;
}
function shop_ebay_http($method, $url, $headers, $body) {
    if (!function_exists('curl_init')) return array(0, '');
    $ch = curl_init($url);
    curl_setopt_array($ch, array(CURLOPT_RETURNTRANSFER => true, CURLOPT_CUSTOMREQUEST => $method, CURLOPT_HTTPHEADER => $headers,
        CURLOPT_POSTFIELDS => $body, CURLOPT_CONNECTTIMEOUT => 6, CURLOPT_TIMEOUT => 30));
    $r = curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE); curl_close($ch);
    return array($code, (string)$r);
}
/* OAuth only: a 2-hour user access token from the refresh token (eBay's refresh tokens do not rotate). '' on failure. */
function shop_ebay_access($cr, $http = 'shop_ebay_http', $now = null) {
    $now = $now === null ? time() : (int)$now;
    $t = @json_decode((string)@file_get_contents(EBAY_TOKF), true);
    $for = substr(hash('sha256', $cr['refresh']), 0, 12);
    if (is_array($t) && ($t['for'] ?? '') === $for && (int)($t['exp'] ?? 0) > $now + 300) return (string)$t['t'];
    list($code, $raw) = call_user_func($http, 'POST', 'https://api.ebay.com/identity/v1/oauth2/token',
        array('Content-Type: application/x-www-form-urlencoded', 'Authorization: Basic ' . base64_encode($cr['app'] . ':' . $cr['cert'])),
        http_build_query(array('grant_type' => 'refresh_token', 'refresh_token' => $cr['refresh'], 'scope' => $cr['scopes'])));
    $j = json_decode($raw, true);
    if ($code !== 200 || empty($j['access_token'])) { shop_log('ebay token FAILED http ' . $code . ' ' . substr(preg_replace('/[^\x20-\x7E]/', '', (string)($j['error_description'] ?? '')), 0, 120)); return ''; }
    @file_put_contents(EBAY_TOKF, json_encode(array('t' => $j['access_token'], 'for' => $for, 'exp' => $now + (int)($j['expires_in'] ?? 7200))), LOCK_EX);
    return (string)$j['access_token'];
}
function shop_ebay_orders_request($from, $to, $page, $authnauth = '') {
    $cred = $authnauth !== '' ? '<RequesterCredentials><eBayAuthToken>' . htmlspecialchars($authnauth, ENT_XML1) . '</eBayAuthToken></RequesterCredentials>' : '';
    return '<?xml version="1.0" encoding="utf-8"?><GetOrdersRequest xmlns="urn:ebay:apis:eBLBaseComponents">' . $cred
        . '<OrderRole>Buyer</OrderRole><OrderStatus>All</OrderStatus>'
        . '<CreateTimeFrom>' . gmdate('Y-m-d\TH:i:s.000\Z', $from) . '</CreateTimeFrom><CreateTimeTo>' . gmdate('Y-m-d\TH:i:s.000\Z', $to) . '</CreateTimeTo>'
        . '<Pagination><EntriesPerPage>100</EntriesPerPage><PageNumber>' . (int)$page . '</PageNumber></Pagination>'
        . '<DetailLevel>ReturnAll</DetailLevel><ErrorLanguage>en_GB</ErrorLanguage></GetOrdersRequest>';
}
/* One GetOrders page. -> array(ok, parsed | error text) */
function shop_ebay_get_orders($cr, $from, $to, $page, $http = 'shop_ebay_http') {
    $h = array('Content-Type: text/xml; charset=utf-8', 'X-EBAY-API-COMPATIBILITY-LEVEL: ' . EBAY_COMPAT, 'X-EBAY-API-CALL-NAME: GetOrders',
               'X-EBAY-API-SITEID: 3', 'X-EBAY-API-APP-NAME: ' . $cr['app'], 'X-EBAY-API-CERT-NAME: ' . $cr['cert'], 'X-EBAY-API-DEV-NAME: ' . $cr['dev']);
    $aa = '';
    if ($cr['token'] !== '') $aa = $cr['token'];
    else { $tok = shop_ebay_access($cr, $http); if ($tok === '') return array(false, 'eBay would not renew the access (check the refresh token in ebay-key.php)'); $h[] = 'X-EBAY-API-IAF-TOKEN: ' . $tok; }
    list($code, $raw) = call_user_func($http, 'POST', 'https://api.ebay.com/ws/api.dll', $h, shop_ebay_orders_request($from, $to, $page, $aa));
    if ($code !== 200 || $raw === '') return array(false, 'eBay did not answer (http ' . $code . ')');
    return shop_ebay_parse($raw);
}
/* GetOrders XML -> array(ok, {orders: [...], more}) | array(false, eBay's own words) */
function shop_ebay_parse($raw) {
    $prev = libxml_use_internal_errors(true);
    $x = @simplexml_load_string($raw);
    libxml_use_internal_errors($prev);
    if ($x === false) return array(false, 'eBay sent something that is not XML');
    $x->registerXPathNamespace('e', 'urn:ebay:apis:eBLBaseComponents');
    $ack = (string)$x->Ack;
    if ($ack !== 'Success' && $ack !== 'Warning') {
        $msg = (string)($x->Errors->LongMessage ?? ($x->Errors->ShortMessage ?? ''));
        return array(false, 'eBay said: ' . ($msg !== '' ? substr($msg, 0, 200) : $ack) . ((string)$x->Errors->ErrorCode !== '' ? ' (' . (string)$x->Errors->ErrorCode . ')' : ''));
    }
    $orders = array();
    foreach ($x->OrderArray->Order ?? array() as $o) {
        $items = array();
        foreach ($o->TransactionArray->Transaction ?? array() as $t)
            $items[] = array('item' => (string)$t->Item->ItemID, 'title' => (string)$t->Item->Title, 'price' => (float)$t->TransactionPrice, 'qty' => max(1, (int)$t->QuantityPurchased));
        $orders[] = array('order' => (string)$o->OrderID, 'created' => strtotime((string)$o->CreatedTime) ?: 0, 'status' => (string)$o->OrderStatus,
            'total' => (float)$o->Total, 'paid' => (float)$o->AmountPaid, 'currency' => (string)($o->Total['currencyID'] ?? 'GBP'), 'subtotal' => (float)$o->Subtotal,
            'shipping' => (float)$o->ShippingServiceSelected->ShippingServiceCost, 'items' => $items);
    }
    return array(true, array('orders' => $orders, 'more' => strtolower((string)$x->HasMoreOrders) === 'true'));
}

/* ---- which purchases are machines for the shop ---------------------------------------------------------------------- */
function shop_ebay_is_machine($title, $price) {
    $t = ' ' . strtolower($title) . ' ';
    if (!preg_match('/\b(latitude|optiplex|precision)\b/', $t)) return false;
    if (!preg_match('/\b(i[3579]|core|ryzen|celeron|pentium|xeon)\b|\bi[3579]-?\d{4}/', $t)) return false;   // a whole computer names its processor
    if (preg_match('/\bfor parts\b|\bspares\b|\bnot working\b|\bfaulty\b|\bmotherboard\b|\bmainboard\b|\bsystem board\b|\bpalmrest\b|\bpalm rest\b|\bbarebones?\b|\bno (ssd|hdd|ram|cpu|storage)\b/', $t)) return false;
    return $price >= 50;
}
/* "Dell Latitude 5520 15.6..." -> 'latitude-5520' (a guess for the Shop tab; the listing names the real model) */
function shop_ebay_model($title) {
    return preg_match('/\b(latitude|optiplex|precision)\s*(\d{4})\b/i', $title, $m) ? strtolower($m[1]) . '-' . $m[2] : '';
}
/* An order's machines, each with its share of what the order cost us (EBAY_COST_V: what was paid, to the penny). */
function shop_ebay_machines($o) {
    $out = array();
    $sub = $o['subtotal'] > 0 ? $o['subtotal'] : array_sum(array_map(function ($i) { return $i['price'] * $i['qty']; }, $o['items']));
    // every item's share of the amount paid, in pennies; the last item takes the rounding so the shares add up exactly
    $paid = (float)($o['paid'] ?? 0) > 0 ? (float)$o['paid'] : (float)($o['total'] ?? 0);
    $lines = 0; foreach ($o['items'] as $i) $lines += $i['price'] * $i['qty'];
    $share = array();
    if ($paid > 0 && $lines > 0) {
        $pp = (int)round($paid * 100); $acc = 0; $n = count($o['items']);
        foreach (array_values($o['items']) as $k => $i) {
            $s = $k === $n - 1 ? $pp - $acc : (int)round($pp * ($i['price'] * $i['qty']) / $lines);
            $acc += $s; $share[$k] = $s / 100;
        }
    }
    foreach (array_values($o['items']) as $k => $i) {
        $line = $i['price'] * $i['qty'];
        if (!shop_ebay_is_machine($i['title'], $i['price'])) continue;
        $post = $sub > 0 ? $o['shipping'] * ($line / $sub) : 0;   // (only when eBay gives no amount paid or total)
        $out[] = array('key' => $o['order'] . '#' . $i['item'], 'order' => $o['order'], 'item' => $i['item'], 'title' => substr($i['title'], 0, 120),
                       'qty' => $i['qty'], 'cost' => shop_money(isset($share[$k]) ? $share[$k] : $line + $post), 'model' => shop_ebay_model($i['title']), 'sku' => shop_sku_from_item($i['item']));
    }
    return $out;
}

/* ---- the hourly look ------------------------------------------------------------------------------------------------ */
/* -> array(ok, note, new: [keys]). $force: ignore the hourly limit (the portal's "Check eBay now"). */
function shop_ebay_sweep($force = false, $now = null, $get = 'shop_ebay_get_orders', $connect = 'invq_connect', $api = 'invq_api', $slack = 'shop_ebay_slack') {
    $now = $now === null ? time() : (int)$now;
    $cr = shop_ebay_creds();
    if (!$cr) return array(false, 'not set up (api/ebay-key.php)', array());
    $d = shop_read(); $e = $d['ebay'] ?? array();
    if (!$force && (int)($e['checked'] ?? 0) > $now - EBAY_EVERY) return array(true, 'checked recently', array());
    // (EBAY_COST_V: the first look after the cost fix goes back the full 90 days again, once, to correct what is already listed)
    $recost = (int)($e['cost_v'] ?? 1) < EBAY_COST_V;
    $from = (!empty($e['ok_at']) && !$recost) ? (int)$e['ok_at'] - 2 * 86400 : $now - EBAY_FIRST_DAYS * 86400 + 60;
    $found = array(); $page = 1; $err = '';
    do {
        list($ok, $res) = call_user_func($get, $cr, $from, $now, $page);
        if (!$ok) { $err = (string)$res; break; }
        foreach ($res['orders'] as $o) {
            if (strtolower($o['status']) === 'cancelled' || $o['currency'] !== 'GBP') continue;
            foreach (shop_ebay_machines($o) as $m) $found[] = $m + array('created' => $o['created']);
        }
        $page++;
    } while (!empty($res['more']) && $page <= 5);
    $new = array();
    shop_locked(function (&$d) use ($found, $now, $err, $recost, &$new) {
        if (!isset($d['ebay']) || !is_array($d['ebay'])) $d['ebay'] = array();
        if (!isset($d['bought']) || !is_array($d['bought'])) $d['bought'] = array();
        $d['ebay']['checked'] = $now;
        if ($err !== '') { $d['ebay']['error'] = $err; return true; }
        $d['ebay']['error'] = '';
        if (empty($d['ebay']['since'])) $d['ebay']['since'] = $now;   // the connection's first good look: auto-QuickBooks from here on
        $d['ebay']['ok_at'] = $now;
        $d['ebay']['cost_v'] = EBAY_COST_V;   // the full re-read for the cost fix is done
        $tz = new DateTimeZone('Europe/London');
        foreach ($found as $m) {
            if (isset($d['bought'][$m['key']])) {
                // the cost fix: a purchase not yet posted to QuickBooks takes the corrected cost; a posted one keeps what its purchase says
                $ob =& $d['bought'][$m['key']];
                if ($recost && empty($ob['qbo_id']) && (string)($ob['cost'] ?? '') !== $m['cost']) { $ob['cost_was'] = (string)($ob['cost'] ?? ''); $ob['cost'] = $m['cost']; }
                unset($ob);
                continue;
            }
            $d['bought'][$m['key']] = array('order' => $m['order'], 'item' => $m['item'], 'sku' => $m['sku'], 'title' => $m['title'], 'qty' => $m['qty'], 'cost' => $m['cost'],
                'model' => $m['model'], 'date' => (new DateTime('@' . (int)$m['created']))->setTimezone($tz)->format('Y-m-d'), 'created' => (int)$m['created'],
                'seen' => $now, 'status' => 'waiting');
            $new[] = $m['key'];
        }
        return true;
    });
    if ($err !== '') { shop_log('ebay: ' . $err); return array(false, $err, array()); }
    // new purchases made since the connection began: into QuickBooks by themselves, and one Slack line each
    $d = shop_read(); $since = (int)($d['ebay']['since'] ?? $now);
    $c = null;
    foreach ($new as $k) {
        $b = $d['bought'][$k];
        $auto = (int)$b['created'] >= $since - 86400;
        $qr = array(false, 'older than the connection - put it in QuickBooks from the Shop tab if it isn\'t there already');
        if ($auto) {
            if ($c === null) $c = call_user_func($connect);
            $qr = empty($c['ok']) ? array(false, 'QuickBooks not connected (' . (string)($c['why'] ?? '') . ')') : shop_qbo_bought($c, $k, $api);
        }
        if ($auto) call_user_func($slack, $b, $qr);
    }
    return array(true, count($new) ? count($new) . ' new' : 'nothing new', $new);
}
/* Put one eBay purchase into QuickBooks (once): its own stock item, or linked to the one already there.
   -> array(ok, url|why, note) */
function shop_qbo_bought($c, $key, $api = 'invq_api') {
    if (($g = shop_qbo_gate($c)) !== '') return array(false, $g, '');
    $d = shop_read(); $q = shop_qbo_ids($d, $c); $b = $d['bought'][$key] ?? null;
    if (!$q) return array(false, 'set QuickBooks up for the shop first', '');
    if (!$b) return array(false, 'no such eBay purchase', '');
    if (!empty($b['qbo_id']) || !empty($b['qbo_item'])) return array(true, (string)($b['qbo_url'] ?? ''), '');
    $sku = (string)($b['sku'] ?? '') !== '' ? (string)$b['sku'] : shop_sku_from_item($b['item'] ?? '');
    // two machines in one eBay order: each purchase is numbered from the order AND its item, so neither hides the other
    $same = 0; foreach ($d['bought'] as $o) if (($o['order'] ?? '') === $b['order']) $same++;
    $doc = shop_doc('EB', $same > 1 ? $b['order'] . '-' . substr(preg_replace('/\D/', '', (string)$b['item']), -4) : $b['order']);
    $r = shop_qbo_stock_purchase($c, $q, array('order' => $b['order'], 'date' => $b['date'], 'total' => $b['cost'], 'qty' => max(1, (int)($b['qty'] ?? 1)),
        'sku' => $sku, 'title' => shop_bought_name($b), 'doc' => $doc,
        'note' => 'Bought on eBay (found by the shop\'s eBay connection): ' . $b['title'] . ', order ' . $b['order'] . ', item ' . $b['item'] . '.'), $api);
    shop_locked(function (&$d) use ($key, $r) {
        if ($r[0]) {
            if ($r[2] !== '') { $d['bought'][$key]['qbo_id'] = $r[2]; $d['bought'][$key]['qbo_url'] = $r[1]; }
            if ($r[3]) $d['bought'][$key]['qbo_item'] = $r[3]['name'];
            unset($d['bought'][$key]['qbo_err']); $d['stock_at'] = 0;
        } else $d['bought'][$key]['qbo_err'] = $r[1];
        return true;
    });
    return array($r[0], $r[1], $r[4]);
}
function shop_ebay_slack($b, $qr) {
    $hook = mm_hook(SHOP_DIR);
    if ($hook === '') return false;
    $text = "\xF0\x9F\x9B\x92 Bought on eBay: " . $b['title'] . ' - ' . chr(194) . chr(163) . $b['cost'] . ' (order ' . $b['order'] . '). '
        . ($qr[0] ? 'In QuickBooks: ' . (($qr[2] ?? '') !== '' ? $qr[2] : 'its stock item') . '. ' : 'Not in QuickBooks yet: ' . $qr[1] . '. ')
        . 'On the staff portal\'s Shop tab, waiting to be got ready.';
    return mm_post_slack($hook, array('text' => $text, 'unfurl_links' => false));
}
/* Not for the shop (for a customer, a spare, a mistake): off the Shop tab. QuickBooks is never edited from here. */
function shop_ebay_dismiss($key, $by, $undo = false) {
    $res = 'no such eBay purchase';
    shop_locked(function (&$d) use ($key, $by, $undo, &$res) {
        if (!isset($d['bought'][$key])) return false;
        $d['bought'][$key]['status'] = $undo ? 'waiting' : 'dismissed'; $d['bought'][$key]['by'] = $by; $res = 'ok'; return true;
    });
    return $res;
}
/* 15 Oct 2026 (owner: edit each machine's name - "remove the hard drive", new SSDs go in - and give it a grade and condition
   notes while it's got ready). Kept on the purchase; its listing is written from them (shop_intake.py --grade / --marks),
   with the video and the 365 PC Manager report from the intake folder. An empty name goes back to eBay's title.
   Grades as shop_stock.GRADES. -> 'ok' | why */
function shop_ebay_edit($key, $f, $by, $now = null) {
    $now = $now === null ? time() : (int)$now;
    $name = trim((string)preg_replace('/\s+/u', ' ', (string)($f['name'] ?? '')));
    $name = rtrim(mb_substr($name, 0, 100, 'UTF-8'));
    $grade = strtoupper(trim((string)($f['grade'] ?? '')));
    if ($grade !== '' && !in_array($grade, array('A', 'B', 'C'), true)) return 'the grade must be A, B or C';
    $notes = str_replace(array("\r\n", "\r"), "\n", (string)($f['notes'] ?? ''));
    $notes = trim((string)preg_replace(array('/[\x00-\x09\x0B-\x1F\x7F]/u', '/\n{3,}/'), array(' ', "\n\n"), $notes));
    if (mb_strlen($notes, 'UTF-8') > 1000) return 'the notes are too long (1,000 characters at most)';
    $res = 'no such eBay purchase';
    shop_locked(function (&$d) use ($key, $name, $grade, $notes, $by, $now, &$res) {
        if (!isset($d['bought'][$key])) return false;
        $b = &$d['bought'][$key];
        foreach (array('name' => $name, 'grade' => $grade, 'notes' => $notes) as $k => $v) { if ($v === '') unset($b[$k]); else $b[$k] = $v; }
        $b['edited_by'] = $by; $b['edited_at'] = $now; $res = 'ok'; return true;
    });
    return $res;
}
/* What a purchase is called: its Shop-tab name, else eBay's title (with "Dell" in front, once). */
function shop_bought_name($b) {
    return (string)($b['name'] ?? '') !== '' ? (string)$b['name'] : 'Dell ' . preg_replace('/^dell\s+/i', '', (string)$b['title']);
}
/* Its QuickBooks stock item takes that name too (owner: "maybe in the QuickBooks listing"): the item found by its SKU - made
   here or by hand - gets Name "<name> - SKU <sku>" and the name as its sales description; its purchase description keeps what
   was bought. Not in QuickBooks yet: nothing to rename, it takes the name when it goes in. -> array(ok, note|why) */
function shop_qbo_rename_bought($c, $key, $api = 'invq_api') {
    if (($g = shop_qbo_gate($c)) !== '') return array(false, $g);
    $d = shop_read(); $b = $d['bought'][$key] ?? null;
    if (!$b) return array(false, 'no such eBay purchase');
    $sku = (string)($b['sku'] ?? '') !== '' ? (string)$b['sku'] : shop_sku_from_item($b['item'] ?? '');
    $items = shop_qbo_stock_items($c, $api);
    if ($items === null) return array(false, 'could not read your QuickBooks stock items');
    $f = shop_stock_find($items, $sku);
    if (($f['err'] ?? '') === 'none') return array(true, 'it isn\'t in QuickBooks yet - its stock item takes this name when it goes in');
    if (!isset($f['item'])) return array(false, shop_stock_why($f, $sku));
    $it = $f['item']; $name = shop_bought_name($b); $new = shop_item_name($name, $sku);
    if ($it['name'] === $new) return array(true, 'its stock item is already called "' . $new . '"');
    $res = call_user_func($api, $c, 'POST', '/item', array('Id' => $it['id'], 'SyncToken' => $it['sync'], 'sparse' => true,
        'Name' => $new, 'Description' => mb_substr($name, 0, 4000, 'UTF-8')));
    if (!qbo_lib_ok($res)) {
        $why = shop_qbo_why($res);
        shop_log('qbo stock item ' . $it['id'] . ' rename FAILED: ' . $why);
        return array(false, strpos($why, 'Duplicate') !== false ? 'QuickBooks already has another item called "' . $new . '" - change the name a little' : 'QuickBooks refused the new name: ' . $why);
    }
    $n = shop_sku_norm($sku);
    shop_locked(function (&$d) use ($key, $n, $new) {
        if (isset($d['stock'][$n]['id'])) $d['stock'][$n]['name'] = $new;
        if (!empty($d['bought'][$key]['qbo_item'])) $d['bought'][$key]['qbo_item'] = $new;
        return true;
    });
    shop_log('qbo stock item ' . $it['id'] . ' renamed "' . $it['name'] . '" -> "' . $new . '"');
    return array(true, 'its stock item "' . $it['name'] . '" is now "' . $new . '"');
}
