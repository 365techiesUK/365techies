<?php
// pay-pp-lib.php (the pay page's PayPal checkout) with PayPal, QuickBooks and Slack stubbed - nothing leaves this PC (19 Oct 2026).
// CLI only: php api/pay-pp-test.php   (.htaccess denies it as a URL)
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
$ROOT = isset($argv[1]) ? $argv[1] : dirname(__DIR__);
$tmp = sys_get_temp_dir() . '/ppay-test-' . getmypid();
@mkdir($tmp);
define('PLQ_STORE', $tmp . '/pcm-paylink.json');
require $ROOT . '/api/pcm-paylink-lib.php';

// ---- stubs: Slack, QuickBooks, the shop's setup, Stripe's key, PayPal
$G = array('slack' => array(), 'bot' => array(), 'qposts' => array(), 'inv' => array(), 'payments' => array(), 'conn' => array('ok' => true, 'realm' => 'R1', 'live' => true),
           'orders' => array(), 'pp' => array(), 'capture' => array(), 'creates' => array());
function plq_log($m) { $GLOBALS['G']['log'][] = $m; }
function plq_slack($t) { $GLOBALS['G']['slack'][] = $t; return true; }
define('PCM_SLACK_LIB', 1);
function slk_call($m, $a, $t = 6) { $GLOBALS['G']['bot'][] = array($m, $a); return array('ok' => true); }
function slk_creds() { return array('xoxb-test', 'C0B4TD439FB'); }
function st_api($cr, $m, $path, $p = array(), $idem = '') { return array(500, null); }
function st_why($j) { return ''; }
function st_creds() { return null; }
function invq_connect() { return $GLOBALS['G']['conn']; }
function qbo_lib_ok($r) { return isset($r['code']) && $r['code'] >= 200 && $r['code'] < 300; }
function qbo_lib_qesc($v) { return str_replace("'", "\\'", $v); }
function invq_why($r) { return 'http ' . (int)($r['code'] ?? 0); }
function shop_qbo_gate($c) { return empty($c['live']) ? 'QuickBooks writing is switched off ($QBO_LIVE_ENABLED)' : ''; }
function shop_read() { return array('qbo' => array('deposit' => $GLOBALS['G']['deposit'] ?? 'D_PP', 'deposit_card' => 'D_CARD', 'realm' => 'R1')); }
function invq_api($c, $m, $path, $body = null) {
    $G =& $GLOBALS['G'];
    if ($m === 'GET' && strpos($path, '/invoice/') === 0) { $id = urldecode(substr($path, 9)); return isset($G['inv'][$id]) ? array('code' => 200, 'json' => array('Invoice' => $G['inv'][$id])) : array('code' => 400, 'json' => null); }
    if ($m === 'GET' && strpos($path, '/payment/') === 0) { $id = urldecode(substr($path, 9)); return isset($G['payments'][$id]) ? array('code' => 200, 'json' => array('Payment' => $G['payments'][$id])) : array('code' => 400, 'json' => null); }
    if ($m === 'GET' && strpos($path, '/query?query=') === 0) {
        $q = urldecode(substr($path, 13)); $out = array();
        if (preg_match("/DocNumber = '([^']+)'/", $q, $mm)) foreach ($G['inv'] as $inv) if (($inv['DocNumber'] ?? '') === $mm[1]) $out[] = $inv;
        if (strpos($q, "from Invoice where Balance > '0'") !== false) foreach ($G['inv'] as $inv) if ((float)($inv['Balance'] ?? 0) > 0) $out[] = $inv;
        if (preg_match("/from Customer where PrimaryEmailAddr = '([^']+)'/", $q, $mm)) {   // customers whose own email it is
            $cs = array(); foreach ((array)($G['cust'][$mm[1]] ?? array()) as $cid) $cs[] = array('Id' => $cid);
            return array('code' => 200, 'json' => array('QueryResponse' => $cs ? array('Customer' => $cs) : array()));
        }
        return array('code' => 200, 'json' => array('QueryResponse' => $out ? array('Invoice' => $out) : array()));
    }
    if ($m === 'POST' && $path === '/payment') { $G['qposts'][] = $body; return array('code' => 200, 'json' => array('Payment' => array('Id' => 'P' . count($G['qposts'])))); }
    return array('code' => 500, 'json' => null);
}
function pp_why($j) { return is_array($j) ? (string)($j['message'] ?? '') : ''; }
function pp_creds() { return $GLOBALS['CR']; }
// PayPal: orders kept in $G['pp'][id] = PayPal's own copy; capture behaviour per order in $G['capture'][id]
function pp_api($cr, $m, $path, $body = null, $h = array()) {
    $G =& $GLOBALS['G'];
    if ($m === 'POST' && $path === '/v2/checkout/orders') {
        $G['creates'][] = $body;
        if (!empty($G['create_fail'])) return array(500, array('message' => 'INTERNAL_SERVER_ERROR'));
        $G['seq'] = ($G['seq'] ?? 0) + 1; $id = 'ORD' . str_pad((string)$G['seq'], 10, '0', STR_PAD_LEFT);
        $G['pp'][$id] = array('id' => $id, 'status' => 'CREATED', 'purchase_units' => array(array('custom_id' => $body['purchase_units'][0]['custom_id'], 'amount' => $body['purchase_units'][0]['amount'])));
        $href = $G['approve_host'] ?? 'https://www.paypal.com/checkoutnow?token=';
        return array(201, array('id' => $id, 'status' => 'CREATED', 'links' => array(array('rel' => 'self', 'href' => 'https://api-m.paypal.com/v2/checkout/orders/' . $id), array('rel' => 'approve', 'href' => $href . $id))));
    }
    if (preg_match('#^/v2/checkout/orders/([A-Z0-9]+)/capture$#', $path, $mm) && $m === 'POST') {
        $id = $mm[1]; $G['captures'][] = $id;
        $how = $G['capture'][$id] ?? 'COMPLETED';
        if ($how === 'DECLINED') return array(422, array('name' => 'UNPROCESSABLE_ENTITY', 'details' => array(array('issue' => 'INSTRUMENT_DECLINED'))));
        if ($how === 'ALREADY') return array(422, array('details' => array(array('issue' => 'ORDER_ALREADY_CAPTURED'))));
        if ($how === 'FAIL') return array(503, null);
        $G['pp'][$id]['status'] = 'COMPLETED';
        $G['pp'][$id]['payer'] = array('name' => array('given_name' => 'Pat', 'surname' => 'Payer'), 'email_address' => $G['payer_email'][$id] ?? '');
        $G['pp'][$id]['purchase_units'][0]['payments']['captures'][0] = array('id' => 'CAP' . $id, 'status' => $how, 'amount' => $G['pp'][$id]['purchase_units'][0]['amount'], 'create_time' => '2026-10-19T18:30:00Z');
        return array(201, $G['pp'][$id]);
    }
    if (preg_match('#^/v2/checkout/orders/([A-Z0-9]+)$#', $path, $mm) && $m === 'GET') {
        return isset($G['pp'][$mm[1]]) ? array(200, $G['pp'][$mm[1]]) : array(404, array('name' => 'RESOURCE_NOT_FOUND'));
    }
    return array(500, null);
}
// ---- the libraries, without their require_once lines (the stubs stand in), from temp copies
foreach (array('pcm-paystripe-lib.php', 'pay-pp-lib.php') as $f) {
    $src = file_get_contents($ROOT . '/api/' . $f);
    $src = preg_replace('/^require_once .*$/m', '', $src);
    $src = str_replace('__DIR__', var_export($ROOT . '/api', true), $src);
    file_put_contents($tmp . '/' . $f, $src);
    require $tmp . '/' . $f;
}

$pass = 0; $fail = 0;
function check($ok, $what, $got = '') { global $pass, $fail; if ($ok) { echo "PASS $what\n"; $pass++; } else { echo "FAIL $what   [$got]\n"; $fail++; } }
function reset_g() { $G =& $GLOBALS['G']; $G['slack'] = array(); $G['bot'] = array(); $G['qposts'] = array(); $G['captures'] = array(); $G['creates'] = array(); }
function approve($id) { $GLOBALS['G']['pp'][$id]['status'] = 'APPROVED'; }
$CR = array('id' => 'x', 'secret' => 'y', 'webhook' => 'W', 'env' => 'live');
$G['inv']['20816'] = array('Id' => '20816', 'DocNumber' => '4905/816', 'Balance' => 60, 'TotalAmt' => 60, 'CustomerRef' => array('value' => '77', 'name' => 'Hanna Knight'));
$G['inv']['20900'] = array('Id' => '20900', 'DocNumber' => '4905/900', 'Balance' => 85, 'TotalAmt' => 85, 'CustomerRef' => array('value' => '78', 'name' => 'Ann Other'));

// 1. the pure part
check(ppay_amount('60') === '60.00' && ppay_amount('60.5') === '60.50' && ppay_amount('0.50') === '' && ppay_amount('5000.01') === '' && ppay_amount('6e1') === '' && ppay_amount('') === '', 'amounts: 60 -> 60.00; under £1, over £5,000 or not a number -> refused');
check(ppay_desc('4905-816') === '365 Techies - invoice 4905/816' && ppay_desc('12838') === '365 Techies - reference 12838', 'PayPal\'s page says "invoice 4905/816" (or the reference)');
$b = ppay_order_body('60.00', '4905-816', 1760900000);
check($b['intent'] === 'CAPTURE' && $b['purchase_units'][0]['custom_id'] === 'pay:4905-816' && $b['purchase_units'][0]['amount'] === array('currency_code' => 'GBP', 'value' => '60.00'), 'the order: capture, our reference in custom_id, £60.00 GBP');
check(preg_match('/^PAY-4905-816-251019-[0-9A-F]{6}$/', $b['purchase_units'][0]['invoice_id']) === 1, 'a unique PayPal invoice id per payment', $b['purchase_units'][0]['invoice_id']);
check($b['application_context']['shipping_preference'] === 'NO_SHIPPING' && $b['application_context']['user_action'] === 'PAY_NOW' && $b['application_context']['return_url'] === 'https://365techies.co.uk/pay/?ppdone=1'
      && $b['application_context']['cancel_url'] === 'https://365techies.co.uk/pay/?amount=60.00&ref=4905-816', 'no delivery address, "Pay Now", back to /pay/ (cancel: the same pay link)');
check(ppay_approve_link(array('links' => array(array('rel' => 'approve', 'href' => 'https://evil.example/x')))) === '' && ppay_approve_link(array('links' => array(array('rel' => 'approve', 'href' => 'https://www.sandbox.paypal.com/checkoutnow?token=A')))) !== '', 'the customer is only ever sent to paypal.com');

// 2. start
reset_g();
check(ppay_start($CR, 'abc', '4905-816') === array(false, 'bad_amount') && !$G['creates'], 'start: a bad amount -> nothing asked of PayPal');
list($ok, $url) = ppay_start($CR, '60', '4905/816');
$oid = 'ORD' . str_pad('1', 10, '0', STR_PAD_LEFT);
$o = ppay_seen($oid);
check($ok && $url === 'https://www.paypal.com/checkoutnow?token=' . $oid && $o['amt'] === '60.00' && $o['ref'] === '4905-816' && $o['st'] === 'open', 'start: order made, remembered (60.00, 4905-816), customer sent to PayPal', json_encode(array($ok, $url, $o)));
$G['approve_host'] = 'https://phish.example/?t=';
check(ppay_start($CR, '60', '4905-816') === array(false, 'paypal_failed'), 'start: PayPal answering with a page not on paypal.com -> refused');
unset($G['approve_host']);
$G['create_fail'] = true;
check(ppay_start($CR, '60', '4905-816') === array(false, 'paypal_failed'), 'start: PayPal down -> the page falls back to PayPal.Me');
$G['create_fail'] = false;

// 3. back from PayPal: Hanna-style £60 on invoice 4905/816
reset_g(); approve($oid);
list($st, $info) = ppay_finish($CR, $oid, 'page');
$p = $G['qposts'][0] ?? array();
check($st === 'paid' && $info === array('amount' => '60.00', 'ref' => '4905-816') && $G['captures'] === array($oid), 'approved -> captured once, the page says paid (£60.00, 4905-816)', json_encode(array($st, $info, $G['captures'])));
check(count($G['qposts']) === 1 && $p['Line'][0]['LinkedTxn'][0] === array('TxnId' => '20816', 'TxnType' => 'Invoice') && $p['TotalAmt'] === 60.0, 'QuickBooks: one payment of £60.00 on invoice 4905/816', json_encode($p));
check($p['DepositToAccountRef']['value'] === 'D_PP' && $p['PaymentRefNum'] === 'CAP' . $oid && strpos($p['PrivateNote'], 'order ' . $oid) !== false && $p['TxnDate'] === '2026-10-19', '... into the account PayPal pays into, PayPal\'s capture as the reference, the order in the note, dated the day paid');
check(count($G['slack']) === 1 && strpos($G['slack'][0], 'Paid with PayPal') !== false && strpos($G['slack'][0], 'Hanna Knight') !== false && strpos($G['slack'][0], '4905/816') !== false && strpos($G['slack'][0], 'nothing to do') !== false, 'Slack: "Paid with PayPal: £60.00 from Hanna Knight ... invoice 4905/816 is marked paid automatically - nothing to do."', $G['slack'][0] ?? '');
check((ppay_seen($oid)['st'] ?? '') === 'finished', 'the order is finished');
reset_g();
list($st) = ppay_finish($CR, $oid, 'webhook');
check($st === 'paid' && !$G['captures'] && !$G['qposts'] && !$G['slack'], 'PayPal\'s webhook afterwards (or a page reload): paid, nothing taken, booked or said again');

// 4. an order we never made / PayPal's copy changed
reset_g();
check(ppay_finish($CR, 'ZZZZZZZZZZZZ', 'page')[0] === 'refused' && ppay_finish($CR, 'not-an-id', 'page')[0] === 'refused' && !$G['captures'], 'an order we never made (or a junk token) -> refused, nothing captured');
list(, $u2) = ppay_start($CR, '85', '4905-900'); $o2 = substr($u2, strpos($u2, 'token=') + 6);
$G['pp'][$o2]['purchase_units'][0]['amount']['value'] = '1.00'; approve($o2);
reset_g();
check(ppay_finish($CR, $o2, 'page')[0] === 'refused' && !$G['captures'] && !$G['qposts'], 'PayPal\'s order no longer says our amount -> refused, nothing captured');
$G['pp'][$o2]['purchase_units'][0]['amount']['value'] = '85.00';

// 5. declined, pending then completed, already captured, PayPal down at capture
list(, $u3) = ppay_start($CR, '85', '4905-900'); $o3 = substr($u3, strpos($u3, 'token=') + 6);
approve($o3); $G['capture'][$o3] = 'DECLINED'; reset_g();
check(ppay_finish($CR, $o3, 'page')[0] === 'declined' && !$G['qposts'] && (ppay_seen($o3)['st'] ?? '') === 'declined', 'card declined -> "declined", nothing booked');
list(, $u4) = ppay_start($CR, '85', '4905-900'); $o4 = substr($u4, strpos($u4, 'token=') + 6);
approve($o4); $G['capture'][$o4] = 'PENDING'; reset_g();
check(ppay_finish($CR, $o4, 'page')[0] === 'pending' && !$G['qposts'] && (ppay_seen($o4)['st'] ?? '') === 'pending', 'PayPal still checking -> "pending", not booked yet');
$G['pp'][$o4]['purchase_units'][0]['payments']['captures'][0]['status'] = 'COMPLETED'; reset_g();
check(ppay_finish($CR, $o4, 'webhook')[0] === 'paid' && count($G['qposts']) === 1 && ($G['qposts'][0]['Line'][0]['LinkedTxn'][0]['TxnId'] ?? '') === '20900', '... PayPal\'s webhook when it completes -> booked on invoice 4905/900');
$G['inv']['20901'] = array('Id' => '20901', 'DocNumber' => '4905/901', 'Balance' => 40, 'TotalAmt' => 40, 'CustomerRef' => array('value' => '79', 'name' => 'C Customer'));
list(, $u5) = ppay_start($CR, '40', '4905-901'); $o5 = substr($u5, strpos($u5, 'token=') + 6);
approve($o5); $G['capture'][$o5] = 'FAIL'; reset_g();
check(ppay_finish($CR, $o5, 'page')[0] === 'busy' && !$G['qposts'], 'PayPal down at capture -> "busy" (the page asks again; the cron too)');
$G['capture'][$o5] = 'COMPLETED'; reset_g();
check(ppay_finish($CR, $o5, 'page')[0] === 'paid' && count($G['qposts']) === 1, '... the next try takes it and books it');

// 6. QuickBooks can't take it: still "paid" for the customer, flagged for a person, once
$G['deposit'] = '';
$G['inv']['20902'] = array('Id' => '20902', 'DocNumber' => '4905/902', 'Balance' => 25, 'TotalAmt' => 25, 'CustomerRef' => array('value' => '80'));
list(, $u6) = ppay_start($CR, '25', '4905-902'); $o6 = substr($u6, strpos($u6, 'token=') + 6);
approve($o6); reset_g();
check(ppay_finish($CR, $o6, 'page')[0] === 'paid' && !$G['qposts'] && strpos($G['slack'][0] ?? '', 'PayPal payment needs a look') !== false && strpos($G['slack'][0] ?? '', 'account PayPal pays into') !== false, 'no "PayPal pays into" account chosen -> customer told paid; Slack "PayPal payment needs a look"', $G['slack'][0] ?? '');
reset_g();
check(ppay_finish($CR, $o6, 'cron')[0] === 'paid' && !$G['slack'], '... said only once');
unset($G['deposit']);

// 7. sandbox keys: works, never reaches QuickBooks
$SB = array('id' => 'x', 'secret' => 'y', 'webhook' => 'W', 'env' => 'sandbox');
list(, $u7) = ppay_start($SB, '60', '4905-816'); $o7 = substr($u7, strpos($u7, 'token=') + 6);
approve($o7); reset_g();
check(ppay_finish($SB, $o7, 'page')[0] === 'paid' && !$G['qposts'] && !$G['slack'] && (ppay_seen($o7)['st'] ?? '') === 'test', 'sandbox: paid with pretend money, nothing in QuickBooks or Slack');

// 8. the cron: an approved order never brought back is captured; a new one is left; an old unapproved one is let go
$now = time();
list(, $u8) = ppay_start($CR, '85', '4905-900', $now - 1200); $o8 = substr($u8, strpos($u8, 'token=') + 6);   // 20 minutes ago, approved, tab closed
$G['inv']['20900']['Balance'] = 85; approve($o8);
list(, $u9) = ppay_start($CR, '40', '4905-901', $now - 60); $o9 = substr($u9, strpos($u9, 'token=') + 6);       // a minute ago: still on PayPal's page
list(, $u10) = ppay_start($CR, '40', '4905-901', $now - 4 * 3600); $o10 = substr($u10, strpos($u10, 'token=') + 6);   // 4 hours, never approved
reset_g();
$sw = ppay_sweep($now);
check(($sw['handled'][$o8] ?? '') === 'paid' && count($G['qposts']) === 1 && !isset($sw['handled'][$o9]) && ($sw['handled'][$o10] ?? '') === 'gone', 'cron: the approved-but-abandoned order is taken and booked, the new one left alone, the 4-hour unapproved one let go', json_encode($sw));
check(($sw2 = ppay_sweep($now + 60)) && ($sw2['skipped'] ?? '') === 'recent', 'cron: quiet for the next 10 minutes');

// 9. 23 Oct 2026: no usable invoice number (the plain pay page, or a number QuickBooks doesn't have) -> the payer's email,
//    only when exactly ONE open invoice for that email owes exactly what was paid; anything else is a person's job
check(ppay_desc('') === '365 Techies - payment', 'no reference: PayPal\'s page says "365 Techies - payment"');
$b = ppay_order_body('45.00', '', 1760900000);
check($b['purchase_units'][0]['custom_id'] === 'pay:' && preg_match('/^PAY-WEB-251019-[0-9A-F]{6}$/', $b['purchase_units'][0]['invoice_id']) === 1
      && $b['application_context']['cancel_url'] === 'https://365techies.co.uk/pay/?amount=45.00', 'no reference: still our own order (custom_id "pay:"), a WEB invoice id, cancel back to the amount',
      json_encode($b['purchase_units'][0]) . ' ' . $b['application_context']['cancel_url']);
$G['inv']['20950'] = array('Id' => '20950', 'DocNumber' => '4905/950', 'Balance' => 45, 'TotalAmt' => 45, 'BillEmail' => array('Address' => 'dave@example.com'), 'CustomerRef' => array('value' => '95', 'name' => 'Dave Smith'));
$G['inv']['20951'] = array('Id' => '20951', 'DocNumber' => '4905/951', 'Balance' => 30, 'TotalAmt' => 30, 'CustomerRef' => array('value' => '96', 'name' => 'Eve Jones'));
$G['cust']['eve@example.com'] = array('96');
$G['inv']['20952'] = array('Id' => '20952', 'DocNumber' => '4905/952', 'Balance' => 20, 'TotalAmt' => 20, 'BillEmail' => array('Address' => 'fay@example.com'), 'CustomerRef' => array('value' => '97'));
$G['inv']['20962'] = array('Id' => '20962', 'DocNumber' => '4905/962', 'Balance' => 20, 'TotalAmt' => 40, 'BillEmail' => array('Address' => 'fay@example.com'), 'CustomerRef' => array('value' => '97'));
$G['inv']['20953'] = array('Id' => '20953', 'DocNumber' => '4905/953', 'Balance' => 50, 'TotalAmt' => 50, 'BillEmail' => array('Address' => 'gus@example.com'), 'CustomerRef' => array('value' => '98'));
$G['inv']['20954'] = array('Id' => '20954', 'DocNumber' => '4905/954', 'Balance' => 70, 'TotalAmt' => 70, 'BillEmail' => array('Address' => 'hal@example.com'), 'CustomerRef' => array('value' => '99', 'name' => 'Hal Brown'));
check(pst_email_pick(array($G['inv']['20950'], $G['inv']['20953']), array(), ' Dave@Example.COM ', 4500)[0]['Id'] === '20950', 'pick: the one open invoice for that email (any case/spaces) owing exactly that');
check(pst_email_pick(array($G['inv']['20950']), array(), 'not-an-email', 4500)[0] === null && pst_email_pick(array($G['inv']['20950']), array(), 'dave@example.com', 4000)[0] === null, 'pick: no real email, or not exactly what it owes -> no invoice');
$pp = function ($amount, $ref, $email) {
    list(, $u) = ppay_start($GLOBALS['CR'], $amount, $ref); $o = substr($u, strpos($u, 'token=') + 6);
    approve($o); $GLOBALS['G']['payer_email'][$o] = $email; reset_g();
    return array($o, ppay_finish($GLOBALS['CR'], $o, 'page'));
};
list(, $r) = $pp('45', '', 'Dave@Example.com');
$p = $G['qposts'][0] ?? array();
check($r[0] === 'paid' && count($G['qposts']) === 1 && ($p['Line'][0]['LinkedTxn'][0]['TxnId'] ?? '') === '20950' && strpos($p['PrivateNote'] ?? '', 'by the payer\'s email (dave@example.com)') !== false,
      'plain page, no number: £45 from dave@ -> booked on his invoice 4905/950, the note says how', json_encode($p));
check(strpos($G['slack'][0] ?? '', 'matched by their email address') !== false && strpos($G['slack'][0] ?? '', '4905/950') !== false, '... and Slack says it was matched by email', $G['slack'][0] ?? '');
list(, $r) = $pp('30', '', 'eve@example.com');
check($r[0] === 'paid' && ($G['qposts'][0]['Line'][0]['LinkedTxn'][0]['TxnId'] ?? '') === '20951', 'the invoice carries no email but the QuickBooks customer\'s own email is hers -> booked on it', json_encode($G['qposts']));
list(, $r) = $pp('20', '', 'fay@example.com');
check($r[0] === 'paid' && !$G['qposts'] && strpos($G['slack'][0] ?? '', '2 open invoices for exactly that amount') !== false && strpos($G['slack'][0] ?? '', '4905/952') !== false,
      'two invoices for that email both owe £20 -> nothing booked, Slack names both for a person', $G['slack'][0] ?? '');
list(, $r) = $pp('40', '', 'gus@example.com');
check($r[0] === 'paid' && !$G['qposts'] && strpos($G['slack'][0] ?? '', 'none owes exactly £40.00') !== false && strpos($G['slack'][0] ?? '', '4905/953 (£50.00 owed)') !== false,
      'his only invoice owes £50 and he paid £40 -> nothing booked, Slack says what he owes', $G['slack'][0] ?? '');
list(, $r) = $pp('45', '', '');
check($r[0] === 'paid' && !$G['qposts'] && strpos($G['slack'][0] ?? '', 'no invoice number on it, and the payer\'s email wasn\'t there') !== false, 'no number and no email -> a person', $G['slack'][0] ?? '');
list(, $r) = $pp('70', '4905-999', 'hal@example.com');
check($r[0] === 'paid' && ($G['qposts'][0]['Line'][0]['LinkedTxn'][0]['TxnId'] ?? '') === '20954', 'a number QuickBooks doesn\'t have, but his email has exactly one £70 invoice -> booked on it', json_encode($G['qposts']));
list(, $r) = $pp('45', '4905-951', 'dave@example.com');
check($r[0] === 'paid' && !$G['qposts'] && strpos($G['slack'][0] ?? '', 'only owes') !== false, 'a number QuickBooks DOES have wins over the email (and its checks still apply)', $G['slack'][0] ?? '');

array_map('unlink', glob($tmp . '/*')); @rmdir($tmp);
echo "pay-pp: $pass passed, $fail failed\n";
exit($fail ? 1 : 0);
