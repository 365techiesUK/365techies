<?php
// pay-ppts-lib.php (PayPal payments sent straight to us, found by Transaction Search) with PayPal, QuickBooks and Slack
// stubbed - nothing leaves this PC (25 Oct 2026).
// CLI only: php api/pay-ppts-test.php   (.htaccess denies it as a URL)
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
$ROOT = isset($argv[1]) ? $argv[1] : dirname(__DIR__);
$tmp = sys_get_temp_dir() . '/ppts-test-' . getmypid();
@mkdir($tmp);
define('PLQ_STORE', $tmp . '/pcm-paylink.json');
require $ROOT . '/api/pcm-paylink-lib.php';

// ---- stubs: Slack, QuickBooks, the shop's setup, Stripe's key, PayPal
$G = array('slack' => array(), 'bot' => array(), 'qposts' => array(), 'inv' => array(), 'payments' => array(), 'conn' => array('ok' => true, 'realm' => 'R1', 'live' => true),
           'ts' => array(), 'ts_calls' => array(), 'ts_codes' => array(), 'fresh' => 0, 'cust' => array());
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
function shop_read() { return array('qbo' => array('deposit' => 'D_PP', 'deposit_card' => 'D_CARD', 'realm' => 'R1')); }
function invq_api($c, $m, $path, $body = null) {
    $G =& $GLOBALS['G'];
    if ($m === 'GET' && strpos($path, '/invoice/') === 0) { $id = urldecode(substr($path, 9)); return isset($G['inv'][$id]) ? array('code' => 200, 'json' => array('Invoice' => $G['inv'][$id])) : array('code' => 400, 'json' => null); }
    if ($m === 'GET' && strpos($path, '/payment/') === 0) { $id = urldecode(substr($path, 9)); return isset($G['payments'][$id]) ? array('code' => 200, 'json' => array('Payment' => $G['payments'][$id])) : array('code' => 400, 'json' => null); }
    if ($m === 'GET' && strpos($path, '/query?query=') === 0) {
        $q = urldecode(substr($path, 13)); $out = array();
        if (preg_match("/DocNumber = '([^']+)'/", $q, $mm)) foreach ($G['inv'] as $inv) if (($inv['DocNumber'] ?? '') === $mm[1]) $out[] = $inv;
        if (strpos($q, "from Invoice where Balance > '0'") !== false) foreach ($G['inv'] as $inv) if ((float)($inv['Balance'] ?? 0) > 0) $out[] = $inv;
        if (preg_match("/from Customer where PrimaryEmailAddr = '([^']+)'/", $q, $mm)) {
            $cs = array(); foreach ((array)($G['cust'][$mm[1]] ?? array()) as $cid) $cs[] = array('Id' => $cid);
            return array('code' => 200, 'json' => array('QueryResponse' => $cs ? array('Customer' => $cs) : array()));
        }
        return array('code' => 200, 'json' => array('QueryResponse' => $out ? array('Invoice' => $out) : array()));
    }
    if ($m === 'POST' && $path === '/payment') {
        $G['qposts'][] = $body; $pid = 'P' . count($G['qposts']);
        // QuickBooks now owes less on that invoice, and lists the payment on it
        $iid = (string)$body['Line'][0]['LinkedTxn'][0]['TxnId'];
        if (isset($G['inv'][$iid])) { $G['inv'][$iid]['Balance'] = round((float)$G['inv'][$iid]['Balance'] - (float)$body['TotalAmt'], 2); $G['inv'][$iid]['LinkedTxn'][] = array('TxnId' => $pid, 'TxnType' => 'Payment'); }
        $G['payments'][$pid] = array('Id' => $pid, 'PrivateNote' => $body['PrivateNote']);
        return array('code' => 200, 'json' => array('Payment' => array('Id' => $pid)));
    }
    return array('code' => 500, 'json' => null);
}
function pp_why($j) { return is_array($j) ? (string)($j['message'] ?? '') : ''; }
function pp_creds() { return $GLOBALS['CR']; }
function pp_token($cr, $fresh = false) { if ($fresh) $GLOBALS['G']['fresh']++; return 'tok'; }
// PayPal Transaction Search: $G['ts'] = page number => transactions; $G['ts_codes'] = the answers to give first (403, 500...)
function pp_api($cr, $m, $path, $body = null, $h = array()) {
    $G =& $GLOBALS['G'];
    if ($m === 'GET' && strpos($path, '/v1/reporting/transactions?') === 0) {
        parse_str(substr($path, strlen('/v1/reporting/transactions?')), $q);
        $G['ts_calls'][] = $q;
        if ($G['ts_codes']) { $c = array_shift($G['ts_codes']); return array($c, array('message' => $c === 403 ? 'NOT_AUTHORIZED' : 'INTERNAL_SERVER_ERROR')); }
        $p = (int)($q['page'] ?? 1); $pages = max(1, count($G['ts']));
        return array(200, array('transaction_details' => (array)($G['ts'][$p] ?? array()), 'total_pages' => $pages, 'page' => $p));
    }
    return array(500, null);
}
// ---- the libraries, without their require_once lines (the stubs stand in), from temp copies
foreach (array('pcm-paystripe-lib.php', 'pay-ppts-lib.php') as $f) {
    $src = file_get_contents($ROOT . '/api/' . $f);
    $src = preg_replace('/^require_once .*$/m', '', $src);
    $src = str_replace('__DIR__', var_export($ROOT . '/api', true), $src);
    file_put_contents($tmp . '/' . $f, $src);
    require $tmp . '/' . $f;
}

$pass = 0; $fail = 0;
function check($ok, $what, $got = '') { global $pass, $fail; if ($ok) { echo "PASS $what\n"; $pass++; } else { echo "FAIL $what   [$got]\n"; $fail++; } }
function reset_g() { $G =& $GLOBALS['G']; $G['slack'] = array(); $G['bot'] = array(); $G['qposts'] = array(); $G['ts_calls'] = array(); $G['fresh'] = 0; }
/* One transaction as Transaction Search lists it */
function tx($id, $amount, $extra = array(), $payer = array()) {
    $ti = array('transaction_id' => $id, 'transaction_event_code' => 'T0000', 'transaction_status' => 'S',
        'transaction_initiation_date' => '2026-10-24T10:15:00+0000', 'transaction_amount' => array('currency_code' => 'GBP', 'value' => $amount));
    return array('transaction_info' => array_merge($ti, $extra),
        'payer_info' => array_merge(array('email_address' => 'pat@example.com', 'payer_name' => array('given_name' => 'Pat', 'surname' => 'Payer')), $payer));
}
function sweep_at($t) { return ppts_sweep($t); }
$CR = array('id' => 'x', 'secret' => 'y', 'webhook' => 'W', 'env' => 'live');
$now = 1793000000;

// 1. the pure part
list($from, $to) = ppts_window($now);
check($from === gmdate('Y-m-d\TH:i:s\Z', $now - 3 * 86400) && $to === gmdate('Y-m-d\TH:i:s\Z', $now - 60), 'window: the last 3 days, ending a minute ago, in PayPal\'s date format', "$from $to");
check(ppts_ref(array('transaction_note' => 'Invoice 4905/819 thank you')) === '4905-819' && ppts_ref(array('transaction_note' => '4905-821')) === '4905-821'
      && ppts_ref(array('transaction_note' => 'for 4905 822')) === '4905-822', 'their message: 4905/819, 4905-821 and "4905 822" are all read as the invoice number');
check(ppts_ref(array('transaction_note' => '', 'transaction_subject' => 'Payment for 4905/830')) === '4905-830' && ppts_ref(array('invoice_id' => '4905/831')) === '4905-831', '... in the subject, or PayPal\'s invoice box, when the note is empty');
check(ppts_ref(array('transaction_note' => 'thanks Steve')) === '' && ppts_ref(array('transaction_note' => 'call 01202 74905123456')) === '' && ppts_ref(array()) === '', 'no number (or 4905 inside a longer number) -> no reference');
check(ppts_take(tx('A1', '60.00')) === '', 'take: £60 sent to us, completed -> yes');
check(ppts_take(tx('A2', '-60.00')) !== '' && ppts_take(tx('A3', '60.00', array('transaction_event_code' => 'T1107'))) !== '' && ppts_take(tx('A4', '60.00', array('transaction_event_code' => 'T0400'))) !== '',
      'take: money out, a refund, a transfer to the bank -> no');
check(ppts_take(tx('A5', '60.00', array('transaction_status' => 'P'))) !== '' && ppts_take(tx('A6', '60.00', array('transaction_amount' => array('currency_code' => 'USD', 'value' => '60.00')))) !== '', 'take: still pending, or not in pounds -> no');
check(ppts_take(tx('A7', '60.00', array('transaction_event_code' => 'T0006', 'custom_field' => 'pay:4905-816'))) === 'one of our own orders'
      && ppts_take(tx('A8', '540.00', array('transaction_event_code' => 'T0006', 'custom_field' => 'latitude-5520-01#1'))) === 'one of our own orders'
      && ppts_take(tx('A9', '9.99', array('transaction_event_code' => 'T0006', 'custom_field' => 'web'))) === 'one of our own orders', 'take: the pay page\'s, the shop\'s and Unlock\'s own orders -> left to book themselves');
$p = ppts_pay(tx('9AB12345CD678901E', '95.00', array('transaction_note' => '4905/821'), array('email_address' => ' Tay@Example.com ')));
check($p['key'] === 'ppts:9AB12345CD678901E' && $p['pence'] === 9500 && $p['ref'] === '4905-821' && $p['email'] === 'tay@example.com' && $p['who'] === 'Pat Payer' && !empty($p['direct']) && $p['prov'] === 'paypal'
      && $p['mark'] === '9AB12345CD678901E' && strpos($p['note'], 'straight to our PayPal') !== false && strpos($p['note'], '9AB12345CD678901E') !== false, 'the payment: our key, £95.00, the reference, their email, marked direct, the transaction in the note', json_encode($p));
check(ppts_pay(tx('B1', '5.00', array(), array('payer_name' => array('alternate_full_name' => 'Acme Ltd'))))['who'] === 'Acme Ltd', 'a business payer: PayPal\'s full name');

// 2. no keys, sandbox keys
$CR = null; check((ppts_sweep($now)['skipped'] ?? '') === 'no paypal key', 'no PayPal keys on the server -> nothing asked');
$CR = array('id' => 'x', 'secret' => 'y', 'webhook' => 'W', 'env' => 'sandbox'); check((ppts_sweep($now)['skipped'] ?? '') === 'sandbox' && !$G['ts_calls'], 'sandbox keys -> nothing asked, nothing booked');
$CR = array('id' => 'x', 'secret' => 'y', 'webhook' => 'W', 'env' => 'live');

// 3. the real thing: a week's PayPal activity
$G['inv']['30819'] = array('Id' => '30819', 'DocNumber' => '4905/819', 'Balance' => 60, 'TotalAmt' => 60, 'CustomerRef' => array('value' => '81', 'name' => 'Bea Customer'), 'BillEmail' => array('Address' => 'bea@example.com'));
$G['inv']['30821'] = array('Id' => '30821', 'DocNumber' => '4905/821', 'Balance' => 95, 'TotalAmt' => 95, 'CustomerRef' => array('value' => '82', 'name' => 'Tay Customer'), 'BillEmail' => array('Address' => 'tay@example.com'));
$G['inv']['30822'] = array('Id' => '30822', 'DocNumber' => '4905/822', 'Balance' => 100, 'TotalAmt' => 100, 'CustomerRef' => array('value' => '83', 'name' => 'Dee Customer'), 'BillEmail' => array('Address' => 'dee@example.com'));
$G['inv']['30816'] = array('Id' => '30816', 'DocNumber' => '4905/816', 'Balance' => 60, 'TotalAmt' => 60, 'CustomerRef' => array('value' => '84', 'name' => 'Pay Page'));
// the pay page already holds a capture of its own (pay-pp-lib.php's record)
pl_store_locked(PLQ_STORE, function ($d) { $d['pp']['ORDPAGE00001'] = array('at' => time(), 'amt' => '60.00', 'ref' => '4905-816', 'st' => 'finished', 'cap' => 'CAPPAGE0001'); return array('ok' => true, 'data' => $d); });
$G['ts'][1] = array(
    tx('TXBEA0000000000A1', '60.00', array('transaction_note' => 'Invoice 4905/819 - thanks'), array('email_address' => 'someone.else@example.com')),   // number in the note
    tx('TXTAY0000000000A2', '95.00', array(), array('email_address' => 'Tay@Example.com', 'payer_name' => array('given_name' => 'Tay', 'surname' => 'K'))),   // no note: her email
    tx('TXPAGE00000000A3', '60.00', array('transaction_event_code' => 'T0006', 'custom_field' => 'pay:4905-816')),   // the pay page's own order
    tx('CAPPAGE0001', '60.00', array('transaction_event_code' => 'T0006')),                                        // a pay-page capture listed without its custom id
    tx('TXREFUND000000A5', '-25.00', array('transaction_event_code' => 'T1107')),                                   // a refund we gave
    tx('TXBUY0000000000A6', '-12.99', array('transaction_event_code' => 'T0006')),                                  // our own buying
);
$G['ts'][2] = array(
    tx('TXSTRANGER0000A7', '20.00', array('transaction_note' => 'beer money'), array('email_address' => 'mate@example.com', 'payer_name' => array('given_name' => 'A', 'surname' => 'Mate'))),
    tx('TXDEE0000000000A8', '50.00', array('transaction_note' => '4905/822'), array('email_address' => 'dee@example.com', 'payer_name' => array('given_name' => 'Dee', 'surname' => 'C'))),
);
reset_g();
$sw = sweep_at($now);
check(count($G['ts_calls']) === 2 && $G['ts_calls'][0]['transaction_status'] === 'S' && $G['ts_calls'][0]['fields'] === 'transaction_info,payer_info' && $G['ts_calls'][1]['page'] === '2', 'asks PayPal for completed transactions with the payer, both pages', json_encode($G['ts_calls']));
check(($sw['handled']['TXBEA0000000000A1'] ?? '') === 'done' && ($sw['handled']['TXTAY0000000000A2'] ?? '') === 'done' && ($sw['handled']['TXSTRANGER0000A7'] ?? '') === 'flagged' && count($sw['handled']) === 3,
      'first look: three handled (the ceiling per tick)', json_encode($sw));
check(!isset($sw['handled']['TXPAGE00000000A3']) && !isset($sw['handled']['CAPPAGE0001']) && !isset($sw['handled']['TXREFUND000000A5']) && !isset($sw['handled']['TXBUY0000000000A6']),
      '... never the pay page\'s own order, a capture the pay page holds, a refund or our own buying');
$q1 = $G['qposts'][0] ?? array(); $q2 = $G['qposts'][1] ?? array();
check(count($G['qposts']) === 2 && $q1['Line'][0]['LinkedTxn'][0]['TxnId'] === '30819' && $q1['TotalAmt'] === 60.0 && $q1['DepositToAccountRef']['value'] === 'D_PP' && $q1['PaymentRefNum'] === 'TXBEA0000000000A1'
      && strpos($q1['PrivateNote'], 'straight to our PayPal') !== false && $q1['TxnDate'] === '2026-10-24', 'QuickBooks: £60 on invoice 4905/819 (the number in the note), into the PayPal account, PayPal\'s transaction as the reference', json_encode($q1));
check($q2['Line'][0]['LinkedTxn'][0]['TxnId'] === '30821' && strpos($q2['PrivateNote'], 'by the payer\'s email (tay@example.com)') !== false, 'QuickBooks: £95 with no note -> her one invoice owing exactly £95, matched by email', json_encode($q2));
check(strpos($G['slack'][0] ?? '', 'Paid with PayPal') !== false && strpos($G['slack'][0], 'Bea Customer straight to our PayPal (not the pay page)') !== false && strpos($G['slack'][0], '4905/819') !== false && strpos($G['slack'][0], 'nothing to do') !== false,
      'Slack: "Paid with PayPal: £60.00 from Bea Customer straight to our PayPal (not the pay page). ... 4905/819 ... nothing to do"', $G['slack'][0] ?? '');
check(strpos($G['slack'][1] ?? '', 'matched by their email address') !== false, 'Slack: the email match says so', $G['slack'][1] ?? '');
check(count($G['slack']) === 4 && strpos($G['slack'][3], 'PayPal check is on') !== false && strpos($G['slack'][3], '8 PayPal transactions, 5 of them sent straight to us') !== false,
      'Slack, once: the first look that works says the check is on (8 transactions, 5 sent straight to us)', $G['slack'][3] ?? '');
check(strpos($G['slack'][2] ?? '', 'PayPal payment needs a look') !== false && strpos($G['slack'][2], 'A Mate straight to our PayPal') !== false && strpos($G['slack'][2], 'ignore this') !== false,
      'Slack: £20 "beer money" with nothing to match -> needs a look, once, with "if it isn\'t for an invoice, ignore this"', $G['slack'][2] ?? '');

reset_g();
check((sweep_at($now + 60)['skipped'] ?? '') === 'recent' && !$G['ts_calls'], 'the next 10 minutes: PayPal isn\'t asked again');
$sw = sweep_at($now + 601);
check(array_keys($sw['handled']) === array('TXDEE0000000000A8') && $sw['handled']['TXDEE0000000000A8'] === 'flagged' && !$G['qposts'], 'next look: only the one left over, and nothing booked again', json_encode($sw));
check(strpos($G['slack'][0] ?? '', 'the amount doesn\'t match that invoice') !== false, '£50 with "4905/822" on it, but 4905/822 owes £100 -> a person, never a part payment on a typed number', $G['slack'][0] ?? '');
reset_g();
$sw = sweep_at($now + 1202);
check(empty($sw['handled']) && !$G['qposts'] && !$G['slack'], 'a third look: nothing new, nothing said', json_encode($sw));
$last = pl_store_read(PLQ_STORE)['ppts_last'] ?? array();
check(!empty($last['ok']) && $last['seen'] === 8 && $last['direct'] === 5 && $last['at'] === $now + 1202, 'the last look is written down for staff (seen 8, 5 sent straight to us)', json_encode($last));

// 4. a run that died after QuickBooks took the payment: found on the invoice, not booked twice
$G['inv']['30840'] = array('Id' => '30840', 'DocNumber' => '4905/840', 'Balance' => 30, 'TotalAmt' => 30, 'CustomerRef' => array('value' => '85'), 'LinkedTxn' => array(array('TxnId' => 'P99', 'TxnType' => 'Payment')));
$G['payments']['P99'] = array('Id' => 'P99', 'PrivateNote' => 'Paid with PayPal straight to our PayPal account (not the pay page) - transaction TXHALF000000000B1. Recorded automatically by the website.');
$G['ts'] = array(1 => array(tx('TXHALF000000000B1', '30.00', array('transaction_note' => '4905/840'))));
reset_g();
$sw = sweep_at($now + 1803);
check(($sw['handled']['TXHALF000000000B1'] ?? '') === 'done' && !$G['qposts'] && !$G['slack'], 'already on the invoice from a run that died -> recorded as done, not paid twice', json_encode($sw));

// 5. PayPal refuses: the old token first, then the feature not ticked at all
$G['ts'] = array(1 => array(tx('TXNEW0000000000C1', '60.00', array('transaction_note' => '4905/816'))));
$G['ts_codes'] = array(403); reset_g();
$sw = sweep_at($now + 2404);
check($G['fresh'] === 1 && count($G['ts_calls']) === 2 && ($sw['handled']['TXNEW0000000000C1'] ?? '') === 'done', 'a 403 with the old token -> one fresh token, asked again, booked', json_encode($sw));
$G['ts_codes'] = array(403, 403); reset_g();
$sw = sweep_at($now + 3005);
check(strpos($sw['skipped'] ?? '', 'Transaction search') !== false && $G['fresh'] === 1 && !$G['slack'] && !$G['qposts'], 'still refused -> a clean skip (the log says why), nothing in Slack', json_encode($sw));
check((pl_store_read(PLQ_STORE)['ppts_last']['ok'] ?? null) === false, '... and the last look says it failed');
$G['ts_codes'] = array(500); reset_g();
check(strpos(sweep_at($now + 3606)['skipped'] ?? '', 'http 500') !== false && $G['fresh'] === 0, 'PayPal down -> skipped, tried again next tick');
check(!$G['slack'], '... two or three failed looks say nothing in Slack');
$G['ts_codes'] = array(500, 500, 500); foreach (array(4207, 4808, 5409) as $dt) sweep_at($now + $dt);
check(!$G['slack'] && (pl_store_read(PLQ_STORE)['ppts_last']['fails'] ?? 0) === 5, '... nor five', json_encode(pl_store_read(PLQ_STORE)['ppts_last'] ?? null));
$G['ts_codes'] = array(500); sweep_at($now + 6010);
check(count($G['slack']) === 1 && strpos($G['slack'][0], 'PayPal check isn\'t working') !== false && strpos($G['slack'][0], 'http 500') !== false && (pl_store_read(PLQ_STORE)['ppts_last']['fails'] ?? 0) === 6,
      'six failed looks in a row (about an hour) -> Slack says the PayPal check isn\'t working, once', json_encode($G['slack']));
$G['ts_codes'] = array(500); sweep_at($now + 6611);
check(count($G['slack']) === 1, '... a seventh says nothing more');
$G['ts'] = array(1 => array()); reset_g(); sweep_at($now + 7212);
check((pl_store_read(PLQ_STORE)['ppts_last']['fails'] ?? -1) === 0 && !$G['slack'], 'it works again -> the count starts over, and the "check is on" line is never repeated');

// 6. the pay page's own wording is unchanged
$pg = array('key' => 'pp:X', 'prov' => 'paypal', 'pence' => 6000, 'ref' => '4905-816', 'who' => 'Hanna Knight', 'note' => '');
check(strpos(pst_paid_text($pg, array('Balance' => 60, 'DocNumber' => '4905/816')), 'Hanna Knight on the pay page (PayPal). ') !== false && strpos(pst_flag_text($pg, 'x'), 'ignore this') === false, 'the pay page\'s own Slack lines still say "on the pay page (PayPal)"');

array_map('unlink', glob($tmp . '/*')); @rmdir($tmp);
echo "pay-ppts: $pass passed, $fail failed\n";
exit($fail ? 1 : 0);
