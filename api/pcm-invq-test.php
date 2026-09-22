<?php
/**
 * "Invoices waiting for your OK" - test suite.   Run:  php api/pcm-invq-test.php
 * Pins: which invoices are "waiting" (the only definition of a draft QuickBooks
 * offers), every warning the reviewer relies on, the row shape, the morning line,
 * and the endpoint's guarantees at source level - staff gate first, recipient
 * never from the request, no create/void anywhere, the one write is the send.
 */
if (PHP_SAPI !== 'cli') { http_response_code(403); exit('cli only'); }
require __DIR__ . '/pcm-invq-lib.php';
$fails = 0;
function ok($cond, $what, $detail = '') { global $fails; echo ($cond ? '  PASS  ' : '  FAIL  ') . $what . ($cond || $detail === '' ? '' : '   [' . $detail . ']') . "\n"; if (!$cond) $fails++; }
$now = strtotime('2026-09-22 09:00:00 UTC');
$mk = function ($id, $over = array()) {
    return array_merge(array('Id' => (string)$id, 'DocNumber' => '4905/' . $id, 'TxnDate' => '2026-09-20', 'DueDate' => '2026-10-01',
        'TotalAmt' => 60, 'Balance' => 60, 'EmailStatus' => 'NotSet',
        'CustomerRef' => array('value' => '11', 'name' => 'Gordon Snook'),
        'BillEmail' => array('Address' => 'g@example.com'),
        'Line' => array(array('DetailType' => 'SalesItemLineDetail', 'Amount' => 60, 'Description' => 'Laptop service 18 Sept'),
                        array('DetailType' => 'SubTotalLineDetail', 'Amount' => 60)),
        'TxnTaxDetail' => array('TotalTax' => 0)), $over);
};

echo "-- what counts as waiting\n";
ok(invq_waiting($mk(1)), 'unsent with a balance waits');
ok(!invq_waiting($mk(2, array('EmailStatus' => 'EmailSent'))), 'already emailed does not');
ok(!invq_waiting($mk(3, array('Balance' => 0))), 'paid does not');
ok(!invq_waiting($mk(4, array('Balance' => 0, 'TotalAmt' => 0))), 'voided does not');
ok(invq_waiting($mk(5, array('EmailStatus' => 'NeedToSend'))), 'marked "send later" waits');
ok(invq_waiting($mk(6, array('DocNumber' => ''))), 'a console-made invoice (no number) waits like any other');
ok(count(invq_pick(array($mk(1), $mk(2, array('EmailStatus' => 'EmailSent')), 'junk', $mk(7)))) === 2, 'pick keeps the waiting ones and ignores junk');

echo "-- the email an invoice would go to\n";
ok(invq_bill_email($mk(1)) === 'g@example.com', 'the invoice\'s own address');
ok(invq_bill_email($mk(1, array('BillEmail' => array('Address' => 'not an email')))) === '', 'a bad address is treated as none');
ok(invq_bill_email($mk(1, array('BillEmail' => null))) === '', 'no BillEmail at all');

echo "-- the warnings\n";
$codes = function ($f) { return array_map(function ($x) { return $x['code']; }, $f); };
ok($codes(invq_flags($mk(1), 'g@example.com', array(), $now)) === array(), 'a clean invoice has no warnings', json_encode(invq_flags($mk(1), 'g@example.com', array(), $now)));
ok(in_array('no_email', $codes(invq_flags($mk(1), '', array(), $now))), 'no email address is flagged');
ok(in_array('vat', $codes(invq_flags($mk(1, array('TxnTaxDetail' => array('TotalTax' => 12))), 'g@example.com', array(), $now))), 'VAT on the invoice is flagged');
ok(in_array('amount', $codes(invq_flags($mk(1, array('TotalAmt' => 2500, 'Balance' => 2500)), 'g@example.com', array(), $now))), 'over the ceiling is flagged');
ok(!in_array('amount', $codes(invq_flags($mk(1, array('TotalAmt' => 2000, 'Balance' => 2000)), 'g@example.com', array(), $now))), 'exactly the ceiling is not');
$g = $mk(1, array('Line' => array(array('DetailType' => 'SalesItemLineDetail', 'Amount' => 60, 'Description' => 'Work carried out'))));
ok(in_array('generic', $codes(invq_flags($g, 'g@example.com', array(), $now))), 'the console placeholder description is flagged');
$g2 = $mk(1, array('Line' => array()));
ok(in_array('generic', $codes(invq_flags($g2, 'g@example.com', array(), $now))), 'no lines at all is flagged');
$all = array($mk(1), $mk(9, array('TxnDate' => '2026-09-18', 'EmailStatus' => 'EmailSent')));
$f = invq_flags($mk(1), 'g@example.com', $all, $now);
ok(in_array('dup', $codes($f)) && strpos($f[0]['text'], '#4905/9') !== false, 'same customer, same amount, 2 days apart = possible duplicate, naming the other', json_encode($f));
$all2 = array($mk(1), $mk(9, array('TxnDate' => '2026-09-01')));
ok(!in_array('dup', $codes(invq_flags($mk(1), 'g@example.com', $all2, $now))), '19 days apart is not a duplicate');
$all3 = array($mk(1), $mk(9, array('CustomerRef' => array('value' => '12', 'name' => 'Someone Else'))));
ok(!in_array('dup', $codes(invq_flags($mk(1), 'g@example.com', $all3, $now))), 'a different customer is not a duplicate');
ok(in_array('old', $codes(invq_flags($mk(1, array('TxnDate' => '2026-09-01')), 'g@example.com', array(), $now))), 'raised three weeks ago and unsent is flagged');
$many = invq_flags($mk(1, array('TxnDate' => '2026-08-01', 'TxnTaxDetail' => array('TotalTax' => 5))), '', array(), $now);
ok(count($many) === 3, 'warnings stack (no email + VAT + old)', json_encode($codes($many)));

echo "-- the row\n";
$row = invq_row($mk(1), 'g@example.com', invq_flags($mk(1), 'g@example.com', array(), $now), false, 'https://app.qbo.intuit.com', $now);
ok($row['id'] === '1' && $row['number'] === '4905/1' && $row['customer'] === 'Gordon Snook' && $row['total'] === 60.0 && $row['days'] === 2, 'row basics', json_encode($row));
ok($row['url'] === 'https://app.qbo.intuit.com/app/invoice?txnId=1', 'Fix-in-QuickBooks link');
ok(count($row['lines']) === 1 && $row['lines'][0]['desc'] === 'Laptop service 18 Sept', 'subtotal line dropped, description kept');
ok(invq_row($mk(1, array('DocNumber' => '')), 'g@example.com', array(), false, 'x', $now)['console_made'] === true, 'no number = made by the console');
ok(!isset($row['BillAddr']) && !isset($row['note']) && !isset($row['PrivateNote']), 'no address or notes in a row');

echo "-- the morning line\n";
$rows = array(
    invq_row($mk(1), 'g@example.com', array(), false, 'x', $now),
    invq_row($mk(2, array('TxnDate' => '2026-09-01', 'TotalAmt' => 745.98, 'Balance' => 745.98, 'CustomerRef' => array('value' => '3', 'name' => 'Emblem Sports Cars'))), 'e@example.com', array(array('code' => 'old', 'text' => 'x')), false, 'x', $now),
    invq_row($mk(3, array('CustomerRef' => array('value' => '4', 'name' => 'Held Person'))), 'h@example.com', array(), true, 'x', $now),
);
$line = invq_slack_line($rows, 'https://365techies.co.uk/portal/');
ok(strpos($line, '*2 invoices waiting for your OK*') !== false, 'counts the unheld ones only', $line);
ok(strpos($line, 'Emblem Sports Cars £745.98 (21 days)') < strpos($line, 'Gordon Snook £60.00 (2 days)'), 'oldest first');
ok(strpos($line, '1 with a warning') !== false && strpos($line, 'Held Person') === false, 'warning count, held row not named');
ok(invq_slack_line(array()) === '' && invq_slack_line(array($rows[2])) === '', 'nothing waiting = silence');
ok(strpos($line, '@example.com') === false, 'no email address in Slack');

echo "-- the endpoint and the sweep, at source level\n";
$EP = (string)file_get_contents(__DIR__ . '/pcm-invq.php');
$SW = (string)file_get_contents(__DIR__ . '/pcm-invq-sweep.php');
ok(strpos($EP, '?' . '>') === false && strpos($SW, '?' . '>') === false, 'no closing tags');
ok(strpos($EP, 'need_staff();') !== false && strpos($EP, 'need_staff();') < strpos($EP, "if (\$action === 'hold'"), 'the staff gate runs before any action');
ok(!preg_match('/\$in\[\'(to|email|sendto|sendTo|address)\'\]/', $EP) && !preg_match('/\$in\[/', $SW), 'the recipient can never come from the request');
ok(strpos($SW, "invq_email_status(\$inv) === 'EmailSent') return array('ok' => false, 'error' => 'already_sent')") !== false, 'an already-sent invoice is refused at send time');
ok(strpos($SW, "'Content-Type: application/octet-stream'") !== false && strpos($SW, "/send?sendTo=") !== false, 'the send call is the one Intuit documents');
ok(strpos($SW, "\$status !== 'EmailSent'") !== false, 'a send is only counted when QuickBooks says EmailSent');
ok(!preg_match("#'/invoice'#", $SW) && !preg_match('/\/void|operation=void|sparse/', $SW) && !preg_match('/\/customer\',/', $SW), 'nothing here creates, edits or voids an invoice or customer');
ok(substr_count($SW, "invq_api(\$c, 'GET'") >= 4 && substr_count($SW, "invq_api(\$c, 'POST'") === 0, 'every shared-helper call is a GET');
ok(strpos($SW, 'LOCK_EX | LOCK_NB') !== false && strpos($SW, 'qbo_lib_token(') !== false, 'token refresh sits under the monthly biller\'s non-blocking lock');
ok(strpos($SW, 'INVQ_MAX_SENDS_HOUR') !== false, 'a sends-per-hour tripwire exists');
$gi = (string)file_get_contents(__DIR__ . '/../.gitignore');
ok(strpos($gi, 'api/pcm-invq.json') !== false && strpos($gi, 'api/pcm-invq.log') !== false, 'the store and log are gitignored');
$ht = (string)file_get_contents(__DIR__ . '/../.htaccess');
$deny = preg_match('/<FilesMatch "(\^\([^"]*pcm-invq[^"]*)">/', $ht, $m) ? $m[1] : '';
ok($deny !== '', 'a deny rule exists for the queue files', $deny);
foreach (array('pcm-invq.json', 'pcm-invq.json.lock', 'pcm-invq.json.12.tmp', 'pcm-invq.log', 'pcm-invq-lib.php', 'pcm-invq-sweep.php', 'pcm-invq-test.php') as $f)
    ok($deny !== '' && preg_match('#' . $deny . '#', $f) === 1, 'denied: ' . $f);
ok($deny !== '' && preg_match('#' . $deny . '#', 'pcm-invq.php') !== 1, 'the endpoint itself stays served');
$CR = (string)file_get_contents(__DIR__ . '/tm-cron.php');
ok(strpos($CR, 'invq_morning()') !== false && strpos($CR, 'invq_morning()') < strpos($CR, 'if (!tm_configured())'), 'the morning line runs from the cron, above the SMS gate');

echo "\n" . ($fails ? $fails . ' FAILED' : 'all passed') . "\n";
exit($fails ? 1 : 0);
