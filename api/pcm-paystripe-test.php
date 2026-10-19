<?php
// pcm-paystripe-lib.php with Stripe, QuickBooks and Slack stubbed - nothing leaves this PC (19 Oct 2026).
// CLI only: php api/pcm-paystripe-test.php   (.htaccess denies it as a URL)
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
$ROOT = isset($argv[1]) ? $argv[1] : dirname(__DIR__);
$tmp = sys_get_temp_dir() . '/pst-test-' . getmypid();
@mkdir($tmp);
define('PLQ_STORE', $tmp . '/pcm-paylink.json');
require $ROOT . '/api/pcm-paylink-lib.php';
// --- stubs
$G = array('sessions' => array(), 'list' => array(), 'inv' => array(), 'posts' => array(), 'slack' => array(), 'conn' => array('ok' => true, 'realm' => 'R1', 'live' => true),
           'deposit' => 'D1', 'postcode' => 200, 'stripe_calls' => 0, 'queries' => array());
function plq_log($m) { $GLOBALS['G']['log'][] = $m; }
function plq_slack($t) { $GLOBALS['G']['slack'][] = $t; return empty($GLOBALS['G']['hookfail']); }
define('PCM_SLACK_LIB', 1);   // the real Slack library stays out: its bot is stubbed here
function slk_call($m, $a, $t = 6) { $GLOBALS['G']['bot'][] = array($m, $a); return array('ok' => true); }
function slk_creds() { return array('xoxb-test', 'C0B4TD439FB'); }
function st_api($cr, $m, $path, $p = array(), $idem = '') {
    $GLOBALS['G']['stripe_calls']++;
    if ($path === '/v1/checkout/sessions') return array(200, array('data' => $GLOBALS['G']['list']));
    $id = substr($path, strlen('/v1/checkout/sessions/'));
    return isset($GLOBALS['G']['sessions'][$id]) ? array(200, $GLOBALS['G']['sessions'][$id]) : array(404, array('error' => array('message' => 'No such')));
}
function st_why($j) { return ''; }
function invq_connect() { return $GLOBALS['G']['conn']; }
function qbo_lib_ok($r) { return isset($r['code']) && $r['code'] >= 200 && $r['code'] < 300; }
function qbo_lib_qesc($v) { return str_replace("'", "\\'", $v); }
function invq_why($r) { return 'http ' . (int)($r['code'] ?? 0); }
function shop_qbo_gate($c) { return empty($c['live']) ? 'QuickBooks writing is switched off ($QBO_LIVE_ENABLED)' : ''; }
function shop_read() { return array('qbo' => array('deposit_card' => $GLOBALS['G']['deposit'], 'realm' => 'R1')); }
function invq_api($c, $m, $path, $body = null) {
    $G =& $GLOBALS['G'];
    if ($m === 'GET' && strpos($path, '/invoice/') === 0) {
        $id = urldecode(substr($path, 9));
        return isset($G['inv'][$id]) ? array('code' => 200, 'json' => array('Invoice' => $G['inv'][$id])) : array('code' => 400, 'json' => null);
    }
    if ($m === 'GET' && strpos($path, '/query?query=') === 0) {
        $q = urldecode(substr($path, 13)); $G['queries'][] = $q;
        $out = array();
        if (preg_match("/DocNumber = '([^']+)'/", $q, $mm)) foreach ($G['inv'] as $inv) if (($inv['DocNumber'] ?? '') === $mm[1]) $out[] = $inv;
        return array('code' => 200, 'json' => array('QueryResponse' => $out ? array('Invoice' => $out) : array()));
    }
    if ($m === 'GET' && strpos($path, '/payment/') === 0) {
        $id = urldecode(substr($path, 9));
        if (!empty($G['payfail'])) return array('code' => 503, 'json' => null);
        return isset($G['payments'][$id]) ? array('code' => 200, 'json' => array('Payment' => $G['payments'][$id])) : array('code' => 400, 'json' => null);
    }
    if ($m === 'POST' && $path === '/payment') {
        $G['posts'][] = $body;
        if ($G['postcode'] !== 200) return array('code' => $G['postcode'], 'json' => null);
        return array('code' => 200, 'json' => array('Payment' => array('Id' => 'P' . count($G['posts']))));
    }
    return array('code' => 500, 'json' => null);
}
// --- the library, without its require_once lines (the stubs stand in)
$src = file_get_contents($ROOT . '/api/pcm-paystripe-lib.php');
$src = preg_replace('/^require_once .*$/m', '', $src);
$src = str_replace('__DIR__', var_export($ROOT . '/api', true), $src);   // it runs from a temp copy
file_put_contents($tmp . '/lib.php', $src);
require $tmp . '/lib.php';

$pass = 0; $fail = 0;
function check($ok, $what, $got = '') { global $pass, $fail; if ($ok) { echo "PASS $what\n"; $pass++; } else { echo "FAIL $what   [$got]\n"; $fail++; } }
function sess($id, $over = array()) {
    return array_replace_recursive(array('id' => $id, 'object' => 'checkout.session', 'status' => 'complete', 'payment_status' => 'paid', 'currency' => 'gbp',
        'amount_total' => 6000, 'livemode' => true, 'payment_link' => 'plink_1ABC', 'client_reference_id' => '12838', 'metadata' => array(),
        'payment_intent' => 'pi_3QHannaPaymentIntent0001', 'created' => 1760900000, 'customer_details' => array('name' => 'H Knight')), $over);
}
function reset_g() { $G =& $GLOBALS['G']; $G['posts'] = array(); $G['slack'] = array(); $G['queries'] = array(); }
$CR = array('secret' => 'rk_live_x', 'whsec' => 'whsec_x', 'env' => 'live');
$hannaInv = array('Id' => '12838', 'DocNumber' => '4905/131', 'Balance' => 60, 'TotalAmt' => 60, 'CustomerRef' => array('value' => '77', 'name' => 'Hanna Knight'));
$G['inv']['12838'] = $hannaInv;
// Hanna's pay-link row, as the console made it this morning (ref 12838, no inv_id)
pl_store_locked(PLQ_STORE, function ($d) { $d['links'][] = array('id' => '261019-aaaaa', 'kind' => 'page', 'ref' => '12838', 'amount' => 60.0, 'status' => 'open', 'br' => ''); return array('ok' => true, 'data' => $d); });

// 1. the pure part
check(pst_ref_kind('4905-131') === array('doc', '4905/131') && pst_ref_kind('4905/131') === array('doc', '4905/131') && pst_ref_kind('4905131')[0] === 'doc', 'references: 4905-131, 4905/131 -> invoice 4905/131', json_encode(pst_ref_kind('4905131')));
check(pst_ref_kind('12838') === array('id', '12838') && pst_ref_kind('Knight') === array('', ''), 'references: 12838 -> QuickBooks id; a surname -> nothing');
check(pst_ref_of(array('client_reference_id' => null, 'custom_fields' => array(array('key' => 'invoicenumber', 'text' => array('value' => ' 4905/131 '))))) === '4905-131', 'the typed invoice-number box is read when the link carried none');
check(pst_session_check(sess('cs_live_a', array('metadata' => array('shop' => '1'))), 'live') === 'not ours', 'a shop checkout is left to the shop');
check(pst_session_check(sess('cs_live_a', array('payment_link' => '')), 'live') === 'not ours', 'a checkout that is not a Payment Link is left alone');
check(pst_session_check(sess('cs_live_a', array('livemode' => false)), 'live') === 'test', 'a test-mode checkout never reaches the books');
check(pst_session_check(sess('cs_live_a', array('payment_status' => 'unpaid')), 'live') === 'not paid yet', 'an unpaid checkout waits');

// 2. Hanna: her £60 marks invoice 12838 (4905/131) paid, once
$G['sessions']['cs_live_hannaHANNA12345'] = sess('cs_live_hannaHANNA12345');
reset_g();
$r = pst_handle($CR, 'cs_live_hannaHANNA12345', 'cron');
$p = $G['posts'][0] ?? array();
check($r[0] === 'done' && count($G['posts']) === 1, 'Hanna: one QuickBooks payment recorded', json_encode($r));
check(($p['Line'][0]['LinkedTxn'][0] ?? null) === array('TxnId' => '12838', 'TxnType' => 'Invoice') && $p['TotalAmt'] === 60.0 && $p['Line'][0]['Amount'] === 60.0, '... against invoice 12838, for £60.00', json_encode($p));
check($p['CustomerRef']['value'] === '77' && $p['DepositToAccountRef']['value'] === 'D1', '... her customer, into the account Stripe pays into');
check(strlen($p['PaymentRefNum']) <= 21 && strpos($p['PrivateNote'], 'cs_live_hannaHANNA12345') !== false && strpos($p['PrivateNote'], 'pi_3QHannaPaymentIntent0001') !== false, '... Stripe payment and checkout in the note, reference within 21 characters', $p['PaymentRefNum']);
check($p['TxnDate'] === '2025-10-19', '... dated the day she paid (London)', $p['TxnDate']);
check(count($G['slack']) === 1 && strpos($G['slack'][0], 'Hanna Knight') !== false && strpos($G['slack'][0], '4905/131') !== false && strpos($G['slack'][0], 'nothing to do') !== false, 'Slack: "Paid by card ... invoice 4905/131 is marked paid automatically - nothing to do."', $G['slack'][0] ?? '');
$st = pl_store_read(PLQ_STORE);
check($st['links'][0]['status'] === 'paid' && ($st['links'][0]['paid_by'] ?? '') === 'card', 'her pay-link row now says paid (by card)');
reset_g();
$r = pst_handle($CR, 'cs_live_hannaHANNA12345', 'webhook');
check($r[0] === 'already' && count($G['posts']) === 0 && count($G['slack']) === 0, 'the webhook arriving after the cron: nothing written twice, nothing said twice', json_encode($r));

// 3. a new-style link: 4905-140 -> found by its number
$G['inv']['13001'] = array('Id' => '13001', 'DocNumber' => '4905/140', 'Balance' => 85, 'TotalAmt' => 85, 'CustomerRef' => array('value' => '88', 'name' => 'A Customer'));
$G['sessions']['cs_live_b'] = sess('cs_live_b', array('client_reference_id' => '4905-140', 'amount_total' => 8500));
reset_g();
$r = pst_handle($CR, 'cs_live_b');
check($r[0] === 'done' && ($G['posts'][0]['Line'][0]['LinkedTxn'][0]['TxnId'] ?? '') === '13001' && strpos(implode(' ', $G['queries']), "DocNumber = '4905/140'") !== false, '4905-140 -> QuickBooks asked for invoice 4905/140 and it is paid', json_encode($r));

// 4. part payment by number: allowed, and Slack says what is still owed
$G['inv']['13002'] = array('Id' => '13002', 'DocNumber' => '4905/141', 'Balance' => 200, 'TotalAmt' => 200, 'CustomerRef' => array('value' => '89', 'name' => 'B Customer'));
$G['sessions']['cs_live_c'] = sess('cs_live_c', array('client_reference_id' => '4905-141', 'amount_total' => 5000));
reset_g();
$r = pst_handle($CR, 'cs_live_c');
check($r[0] === 'done' && strpos($G['slack'][0] ?? '', '£150.00 still owed') !== false, 'part payment: recorded, Slack says £150.00 still owed', $G['slack'][0] ?? '');

// 5. checks that stop it - each flagged once in Slack, nothing written
$G['inv']['13003'] = array('Id' => '13003', 'DocNumber' => '4905/142', 'Balance' => 0, 'TotalAmt' => 60, 'CustomerRef' => array('value' => '90'));
$G['sessions']['cs_live_d'] = sess('cs_live_d', array('client_reference_id' => '4905-142'));
reset_g(); $r = pst_handle($CR, 'cs_live_d');
check($r[0] === 'flagged' && !$G['posts'] && strpos($G['slack'][0] ?? '', 'already paid') !== false, 'invoice already paid -> flagged ("check this isn\'t a second payment"), nothing written', $G['slack'][0] ?? '');
reset_g(); $r = pst_handle($CR, 'cs_live_d');
check($r[0] === 'already' && !$G['slack'], '... and said only once');
$G['sessions']['cs_live_e'] = sess('cs_live_e', array('client_reference_id' => '4905-140', 'amount_total' => 9999));
$G['inv']['13001']['Balance'] = 85;
reset_g(); $r = pst_handle($CR, 'cs_live_e');
check($r[0] === 'flagged' && !$G['posts'] && strpos($G['slack'][0] ?? '', 'only owes') !== false, 'paid more than the invoice owes -> flagged, nothing written', $G['slack'][0] ?? '');
$G['inv']['555'] = array('Id' => '555', 'DocNumber' => '4905/9', 'Balance' => 120, 'TotalAmt' => 120, 'CustomerRef' => array('value' => '91'));
$G['sessions']['cs_live_f'] = sess('cs_live_f', array('client_reference_id' => '555', 'amount_total' => 4000));
reset_g(); $r = pst_handle($CR, 'cs_live_f');
check($r[0] === 'flagged' && !$G['posts'], 'a bare number whose amount doesn\'t match that invoice -> never paid on it', json_encode($r));
$G['sessions']['cs_live_g'] = sess('cs_live_g', array('client_reference_id' => 'Knight'));
reset_g(); $r = pst_handle($CR, 'cs_live_g');
check($r[0] === 'flagged' && strpos($G['slack'][0] ?? '', 'isn\'t an invoice number') !== false, 'a surname as the reference -> flagged for a person', $G['slack'][0] ?? '');
$G['sessions']['cs_live_h'] = sess('cs_live_h', array('client_reference_id' => '4905-999'));
reset_g(); $r = pst_handle($CR, 'cs_live_h');
check($r[0] === 'flagged' && strpos($G['slack'][0] ?? '', 'no QuickBooks invoice has that number') !== false, 'a number QuickBooks doesn\'t have -> flagged', $G['slack'][0] ?? '');
$G['sessions']['cs_live_i'] = sess('cs_live_i', array('client_reference_id' => null));
reset_g(); $r = pst_handle($CR, 'cs_live_i');
check($r[0] === 'flagged' && strpos($G['slack'][0] ?? '', 'no invoice number') !== false, 'no reference at all -> flagged', $G['slack'][0] ?? '');
$G['deposit'] = '';
$G['sessions']['cs_live_j'] = sess('cs_live_j', array('client_reference_id' => '4905-140', 'amount_total' => 1000));
reset_g(); $r = pst_handle($CR, 'cs_live_j');
check($r[0] === 'flagged' && !$G['posts'] && strpos($G['slack'][0] ?? '', 'pays into') !== false, 'no "Stripe pays into" account chosen -> flagged, nothing written');
$G['deposit'] = 'D1';
$G['conn']['live'] = false;
$G['sessions']['cs_live_k'] = sess('cs_live_k', array('client_reference_id' => '4905-140', 'amount_total' => 1000));
reset_g(); $r = pst_handle($CR, 'cs_live_k');
check($r[0] === 'flagged' && !$G['posts'], 'QuickBooks writing switched off -> nothing written');
$G['conn']['live'] = true;

// 6. passing problems: tried again, then flagged after the sixth go
$G['conn'] = array('ok' => false, 'why' => 'busy');
$G['sessions']['cs_live_m'] = sess('cs_live_m', array('client_reference_id' => '4905-140', 'amount_total' => 1000));
reset_g(); $r = pst_handle($CR, 'cs_live_m');
check($r[0] === 'retry' && !$G['slack'], 'QuickBooks busy -> tried again later, nothing said');
for ($i = 0; $i < 5; $i++) $r = pst_handle($CR, 'cs_live_m');
check($r[0] === 'flagged' && count($G['slack']) === 1, 'after 6 goes -> flagged once', json_encode($r) . ' ' . count($G['slack']));
$G['conn'] = array('ok' => true, 'realm' => 'R1', 'live' => true);
$G['postcode'] = 503;
$G['sessions']['cs_live_n'] = sess('cs_live_n', array('client_reference_id' => '4905-140', 'amount_total' => 1000));
reset_g(); $r = pst_handle($CR, 'cs_live_n');
check($r[0] === 'retry' && !$G['slack'], 'QuickBooks 503 on the payment -> tried again later');
$G['postcode'] = 400;
$G['sessions']['cs_live_o'] = sess('cs_live_o', array('client_reference_id' => '4905-140', 'amount_total' => 1000));
reset_g(); $r = pst_handle($CR, 'cs_live_o');
check($r[0] === 'flagged' && strpos($G['slack'][0] ?? '', 'refused') !== false, 'QuickBooks 400 -> flagged with its reason');
$G['postcode'] = 200;
// a claim held by another run (the webhook and the cron at the same moment)
pl_store_locked(PLQ_STORE, function ($d) { $d['stripe']['cs_live_p'] = array('state' => 'claim', 'at' => time(), 'tries' => 1); return array('ok' => true, 'data' => $d); });
$G['sessions']['cs_live_p'] = sess('cs_live_p', array('client_reference_id' => '4905-140', 'amount_total' => 1000));
reset_g(); $r = pst_handle($CR, 'cs_live_p');
check($r[0] === 'already' && !$G['posts'], 'two runs at once: the second leaves it to the first');
// not ours / test: no store entry at all
reset_g();
$G['sessions']['cs_live_qQQQQQQQQQQ1'] = sess('cs_live_qQQQQQQQQQQ1', array('metadata' => array('shop' => '1')));
$r = pst_handle($CR, 'cs_live_qQQQQQQQQQQ1');
$st = pl_store_read(PLQ_STORE);
check($r[0] === 'ignored' && !isset($st['stripe']['cs_live_qQQQQQQQQQQ1']), 'a shop checkout through here: ignored, nothing stored');
// a run that died after QuickBooks took the payment: the retry finds it on the invoice and writes nothing new
$G['inv']['13010'] = array('Id' => '13010', 'DocNumber' => '4905/150', 'Balance' => 0, 'TotalAmt' => 40, 'CustomerRef' => array('value' => '92', 'name' => 'C Customer'),
    'LinkedTxn' => array(array('TxnId' => 'P900', 'TxnType' => 'Payment')));
$G['payments']['P900'] = array('Id' => 'P900', 'PrivateNote' => 'Paid by card through Stripe ... checkout cs_live_sSSSSSSSSSS1. Recorded automatically by the website.');
pl_store_locked(PLQ_STORE, function ($d) { $d['stripe']['cs_live_sSSSSSSSSSS1'] = array('state' => 'claim', 'at' => time() - 3600, 'tries' => 1); return array('ok' => true, 'data' => $d); });
$G['sessions']['cs_live_sSSSSSSSSSS1'] = sess('cs_live_sSSSSSSSSSS1', array('client_reference_id' => '4905-150', 'amount_total' => 4000));
reset_g(); $r = pst_handle($CR, 'cs_live_sSSSSSSSSSS1');
$st = pl_store_read(PLQ_STORE);
check($r === array('done', 'P900') && !$G['posts'] && ($st['stripe']['cs_live_sSSSSSSSSSS1']['state'] ?? '') === 'done', 'crashed run retried: payment P900 already on the invoice -> no second payment, marked done', json_encode($r));
// ... and when QuickBooks can't be asked about the invoice's payments, it waits rather than risk a second one
$G['inv']['13011'] = array('Id' => '13011', 'DocNumber' => '4905/151', 'Balance' => 40, 'TotalAmt' => 80, 'CustomerRef' => array('value' => '93'),
    'LinkedTxn' => array(array('TxnId' => 'P901', 'TxnType' => 'Payment')));
$G['payfail'] = true;
$G['sessions']['cs_live_tTTTTTTTTTT1'] = sess('cs_live_tTTTTTTTTTT1', array('client_reference_id' => '4905-151', 'amount_total' => 4000));
reset_g(); $r = pst_handle($CR, 'cs_live_tTTTTTTTTTT1');
check($r[0] === 'retry' && !$G['posts'], 'can\'t read the invoice\'s payments -> tries again later, writes nothing', json_encode($r));
$G['payfail'] = false;
$G['payments']['P901'] = array('Id' => 'P901', 'PrivateNote' => 'Bank transfer');
reset_g(); $r = pst_handle($CR, 'cs_live_tTTTTTTTTTT1');
check($r[0] === 'done' && count($G['posts']) === 1, '... next time: the earlier payment was someone else\'s, so this one is recorded', json_encode($r));

// 7. the cron: Hanna (done) skipped, a new one handled, then quiet for 10 minutes
$G['sessions']['cs_live_rRRRRRRRRRR1'] = sess('cs_live_rRRRRRRRRRR1', array('client_reference_id' => '4905-140', 'amount_total' => 1500));
$G['list'] = array($G['sessions']['cs_live_hannaHANNA12345'], $G['sessions']['cs_live_qQQQQQQQQQQ1'], $G['sessions']['cs_live_rRRRRRRRRRR1']);
reset_g();
function st_creds() { return $GLOBALS['CR']; }
$sw = pst_sweep();
check(isset($sw['handled']) && array_keys($sw['handled']) === array('cs_live_rRRRRRRRRRR1') && $sw['handled']['cs_live_rRRRRRRRRRR1'] === 'done' && count($G['posts']) === 1, 'cron: Hanna\'s finished checkout skipped, the shop\'s ignored, the new one paid', json_encode($sw));
$sw = pst_sweep();
check(($sw['skipped'] ?? '') === 'recent', 'cron: quiet for the next 10 minutes', json_encode($sw));

// 8. pl_job_invoice: the pay-link form's number, found for staff
$jf = $tmp . '/pcm-jobs.json';
file_put_contents($jf, json_encode(array('jobs' => array(
    array('id' => 'j1', 'ts' => time() - 86400, 'email' => 'h@example.com', 'name' => 'Hanna Knight', 'amount' => 60, 'invoice_no' => '12838'),
    array('id' => 'j2', 'ts' => time() - 3600, 'email' => 'x@example.com', 'name' => 'X', 'amount' => 85, 'invoice_no' => '13001', 'invoice_doc' => '4905/140'),
    array('id' => 'j3', 'ts' => time() - 60 * 86400, 'email' => 'old@example.com', 'name' => 'Old', 'amount' => 50, 'invoice_no' => '9000', 'invoice_doc' => '4905/1')))));
check(pl_job_invoice($jf, 'H@Example.com', '', 60) === array('ref' => '12838', 'id' => '12838'), 'Hanna\'s job (no number kept) -> reference 12838');
check(pl_job_invoice($jf, 'x@example.com', 'X', 85) === array('ref' => '4905-140', 'id' => '13001'), 'a new job -> reference 4905-140 (the number on the invoice)');
check(pl_job_invoice($jf, 'x@example.com', 'X', 90) === null, 'a different amount -> no guess');
check(pl_job_invoice($jf, 'old@example.com', 'Old', 50) === null, 'older than 45 days -> no guess');
check(pl_job_invoice($jf, '', 'hanna knight', 60) === array('ref' => '12838', 'id' => '12838'), 'no email -> matched by name');

// 9. the webhook refuses (the 302 of 19 Oct 2026) -> the bot posts it to #365-job-tracker
$G['hookfail'] = true; $G['bot'] = array();
$G['inv']['13020'] = array('Id' => '13020', 'DocNumber' => '4905/160', 'Balance' => 30, 'TotalAmt' => 30, 'CustomerRef' => array('value' => '94', 'name' => 'D Customer'));
$G['sessions']['cs_live_uUUUUUUUUUU1'] = sess('cs_live_uUUUUUUUUUU1', array('client_reference_id' => '4905-160', 'amount_total' => 3000));
reset_g(); $r = pst_handle($CR, 'cs_live_uUUUUUUUUUU1');
check($r[0] === 'done' && count($G['bot']) === 1 && $G['bot'][0][0] === 'chat.postMessage' && $G['bot'][0][1]['channel'] === 'C0B4TD439FB' && strpos($G['bot'][0][1]['text'], '4905/160') !== false, 'Slack webhook refused -> the bot posts "paid" to #365-job-tracker', json_encode($G['bot']));
$G['hookfail'] = false; $G['bot'] = array();
$G['sessions']['cs_live_vVVVVVVVVVV1'] = sess('cs_live_vVVVVVVVVVV1', array('client_reference_id' => '4905-160', 'amount_total' => 3000));
$G['inv']['13020']['Balance'] = 30;
reset_g(); $r = pst_handle($CR, 'cs_live_vVVVVVVVVVV1');
check($r[0] === 'done' && count($G['bot']) === 0, 'webhook working -> the bot stays quiet');

array_map('unlink', glob($tmp . '/*')); @rmdir($tmp);
echo "paystripe: $pass passed, $fail failed\n";
exit($fail ? 1 : 0);
