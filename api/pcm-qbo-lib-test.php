<?php
/**
 * Tests for the shared QuickBooks primitives.  Run:  php api/pcm-qbo-lib-test.php
 *
 * Two of these matter more than the rest:
 *   - the customer-key derivation, because if it ever stops matching the copies
 *     in pcm-invoice.php and pcm-qbo.php you get duplicate QuickBooks customers
 *     or one customer's id handed to another;
 *   - the public invoice shape, because it is the only thing standing between a
 *     QuickBooks invoice object (private notes, internal memos, line-item cost)
 *     and a customer's browser.
 * Pure functions only - no network, no store, so CLI-only is the whole rail.
 */
if (php_sapi_name() !== 'cli') { http_response_code(404); exit; }
require_once __DIR__ . '/pcm-qbo-lib.php';

$fails = 0;
function ok($cond, $what) {
    global $fails;
    echo ($cond ? "  PASS  " : "  FAIL  ") . $what . "\n";
    if (!$cond) $fails++;
}

// --- the customer key -------------------------------------------------------
// Pinned against the literal expression the two writers use.
$email = 'Jo.Bloggs@Example.co.uk'; $realm = '9130350000000';
ok(qbo_lib_custkey($email, $realm) === sha1(strtolower($email) . '|' . $realm),
   'custkey matches the writers\' derivation exactly');
ok(qbo_lib_custkey('  jo.bloggs@example.co.uk  ', $realm) === qbo_lib_custkey($email, $realm),
   'case and surrounding space do not change the key');
ok(qbo_lib_custkey($email, '111') !== qbo_lib_custkey($email, '222'),
   'the same email in two companies gives two keys');

// --- environment ------------------------------------------------------------
ok(qbo_lib_base('sandbox') === 'https://sandbox-quickbooks.api.intuit.com', 'sandbox base');
ok(qbo_lib_base('production') === 'https://quickbooks.api.intuit.com', 'production base');
ok(qbo_lib_base('') === 'https://quickbooks.api.intuit.com', 'unset env is production, never sandbox');

// --- query escaping ---------------------------------------------------------
ok(qbo_lib_qesc("o'brien@example.com") === "o\\'brien@example.com", 'apostrophe escaped');
ok(qbo_lib_qesc('a\\b') === 'a\\\\b', 'backslash escaped first');
// The invariant that actually matters: no apostrophe survives UNescaped, so a
// crafted value can never close the literal and change the query.
$evil = qbo_lib_qesc("x' or Id>'0");
ok($evil === "x\\' or Id>\\'0", 'apostrophes escaped in place: ' . $evil);
ok(preg_match('/(?<!\\\\)\'/', $evil) === 0, 'no unescaped apostrophe remains');
ok(preg_match('/(?<!\\\\)\'/', qbo_lib_qesc("a\\'b")) === 0, 'a pre-escaped apostrophe stays escaped');

// --- the public invoice shape ----------------------------------------------
$full = array(
    'Id' => '1042', 'DocNumber' => 'INV-12014', 'TxnDate' => '2026-08-01', 'DueDate' => '2026-08-31',
    'TotalAmt' => 219.00, 'Balance' => 0,
    'PrivateNote' => 'chase him, always late', 'CustomerMemo' => array('value' => 'internal'),
    'Line' => array(array('Amount' => 219.0, 'Description' => 'cost price 80')),
    'CustomerRef' => array('value' => '77'), 'BillEmail' => array('Address' => 'jo@example.com'),
);
$pub = qbo_lib_invoice_public($full, '2026-09-03');
ok(is_array($pub), 'a real invoice maps');
ok(array_keys($pub) === array('id', 'number', 'date', 'due', 'total', 'balance', 'status'),
   'exactly the seven public fields, in order');
$json = json_encode($pub);
foreach (array('PrivateNote', 'chase him', 'CustomerMemo', 'internal', 'Line', 'cost price', 'BillEmail', 'jo@example.com', 'CustomerRef') as $leak)
    ok(strpos($json, $leak) === false, 'never leaks ' . $leak);
ok($pub['number'] === 'INV-12014' && $pub['total'] === 219.00, 'number and total carried');

// --- status derivation ------------------------------------------------------
$mk = function ($total, $balance, $due) {
    return array('Id' => '1', 'TotalAmt' => $total, 'Balance' => $balance, 'DueDate' => $due, 'TxnDate' => '2026-08-01');
};
ok(qbo_lib_invoice_public($mk(100, 0, '2026-08-31'), '2026-09-03')['status'] === 'paid', 'nothing owed is paid');
ok(qbo_lib_invoice_public($mk(100, 100, '2026-08-31'), '2026-09-03')['status'] === 'overdue', 'past its due date is overdue');
ok(qbo_lib_invoice_public($mk(100, 100, '2026-09-30'), '2026-09-03')['status'] === 'due', 'still in date is due');
ok(qbo_lib_invoice_public($mk(100, 100, ''), '2026-09-03')['status'] === 'due', 'no due date is due, never overdue');
ok(qbo_lib_invoice_public($mk(100, 40, '2026-08-31'), '2026-09-03')['status'] === 'overdue', 'part paid and late is overdue');
ok(qbo_lib_invoice_public($mk(0, 0, '2026-08-31'), '2026-09-03')['status'] === 'void', 'a zero invoice is void, not paid');
ok(qbo_lib_invoice_public($mk(100, 0.004, '2026-09-30'), '2026-09-03')['status'] === 'paid', 'a rounding crumb is paid');
ok(qbo_lib_invoice_public($mk(100, 0.02, '2026-09-30'), '2026-09-03')['status'] === 'due', 'two pence still owed is due');

// --- draft vs finished (the settling window) ---------------------------------
$NOW = 1788000000;                       // fixed clock
$mkI = function ($opts) use ($NOW) {
    return array_merge(array('Id' => '1', 'TotalAmt' => 100, 'Balance' => 100,
        'MetaData' => array('CreateTime' => gmdate('c', $NOW - 3600))), $opts);   // an hour old
};
ok(qbo_lib_invoice_ready($mkI(array()), 24, $NOW) === false, 'a fresh unsent invoice is held back');
ok(qbo_lib_invoice_ready($mkI(array('EmailStatus' => 'EmailSent')), 24, $NOW) === true, 'an emailed invoice shows at once');
ok(qbo_lib_invoice_ready($mkI(array('PrintStatus' => 'PrintComplete')), 24, $NOW) === true, 'a printed invoice shows at once');
ok(qbo_lib_invoice_ready($mkI(array('Balance' => 40)), 24, $NOW) === true, 'a part-paid invoice shows at once');
ok(qbo_lib_invoice_ready($mkI(array('Balance' => 0)), 24, $NOW) === true, 'a paid invoice shows at once');
ok(qbo_lib_invoice_ready($mkI(array('EmailStatus' => 'NeedToSend')), 24, $NOW) === false, 'queued-to-send is not sent');

/* THE ONE THAT MATTERS: our monthly per-PC run creates invoices through the API
   and never emails them, so they sit at NotSet for ever. The window must release
   them, or the filter permanently hides the invoices customers most need. */
$monthly = $mkI(array('MetaData' => array('CreateTime' => gmdate('c', $NOW - 30 * 86400))));
ok(qbo_lib_invoice_ready($monthly, 24, $NOW) === true, 'a month-old never-emailed invoice is NOT hidden');
ok(qbo_lib_invoice_ready($mkI(array('MetaData' => array('CreateTime' => gmdate('c', $NOW - 86401)))), 24, $NOW) === true,
   'just past the window, it appears');
ok(qbo_lib_invoice_ready($mkI(array('MetaData' => array('CreateTime' => gmdate('c', $NOW - 86399)))), 24, $NOW) === false,
   'just inside the window, it does not');

// Fail OPEN on anything we cannot judge: hiding a real invoice is the worse error.
ok(qbo_lib_invoice_ready($mkI(array('MetaData' => array())), 24, $NOW) === true, 'no CreateTime: shown rather than hidden');
ok(qbo_lib_invoice_ready($mkI(array('MetaData' => array('CreateTime' => 'not a date'))), 24, $NOW) === true, 'unparseable CreateTime: shown');
ok(qbo_lib_invoice_ready($mkI(array()), 0, $NOW) === true, 'a zero window disables the hold entirely');
ok(qbo_lib_invoice_ready(null, 24, $NOW) === false, 'a non-invoice is never ready');

// --- refuses rubbish --------------------------------------------------------
ok(qbo_lib_invoice_public(null) === null, 'null is not an invoice');
ok(qbo_lib_invoice_public('nope') === null, 'a string is not an invoice');
ok(qbo_lib_invoice_public(array('DocNumber' => 'X')) === null, 'no id, no invoice');

echo "\n" . ($fails ? "$fails FAILED" : "all passed") . "\n";
exit($fails ? 1 : 0);
