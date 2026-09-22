<?php
/**
 * "This month's jobs -> invoices" - test suite.   Run:  php api/pcm-invq-test.php
 * Pins: the 30-day job window, matching a job to its invoice (by the recorded id,
 * else same customer + amount + within a week), when a job may have an invoice
 * created automatically, which invoices count as unsent, every warning, the row
 * shapes, the morning line, and the source-level guarantees of the endpoint and
 * the sweep - staff gate first, recipient never from the request, the two writes
 * are the create and the send, both under the writers' gates and lock.
 */
if (PHP_SAPI !== 'cli') { http_response_code(403); exit('cli only'); }
require __DIR__ . '/pcm-invq-lib.php';
$fails = 0;
function ok($cond, $what, $detail = '') { global $fails; echo ($cond ? '  PASS  ' : '  FAIL  ') . $what . ($cond || $detail === '' ? '' : '   [' . $detail . ']') . "\n"; if (!$cond) $fails++; }
$now = strtotime('2026-09-22 09:00:00 UTC');
$day = 86400;
$mk = function ($id, $over = array()) {
    return array_merge(array('Id' => (string)$id, 'DocNumber' => '4905/' . $id, 'TxnDate' => '2026-09-20', 'DueDate' => '2026-10-01',
        'TotalAmt' => 60, 'Balance' => 60, 'EmailStatus' => 'NotSet',
        'CustomerRef' => array('value' => '11', 'name' => 'Gordon Snook'),
        'BillEmail' => array('Address' => 'g@example.com'),
        'Line' => array(array('DetailType' => 'SalesItemLineDetail', 'Amount' => 60, 'Description' => 'Laptop service 18 Sept'),
                        array('DetailType' => 'SubTotalLineDetail', 'Amount' => 60)),
        'TxnTaxDetail' => array('TotalTax' => 0)), $over);
};
$job = function ($id, $over = array()) use ($now, $day) {
    return array_merge(array('id' => $id, 'ts' => $now - 4 * $day, 'by' => 'Steve', 'name' => 'Gordon Snook', 'email' => 'g@example.com',
        'phone' => '07700 900000', 'desc' => 'Laptop service 18 Sept', 'amount' => 60, 'invoice_no' => '', 'status' => 'quoted'), $over);
};

echo "-- the month's jobs\n";
$jobs = array($job('a'), $job('b', array('ts' => $now - 40 * $day)), $job('c', array('amount' => 0)), $job('d', array('status' => 'cancelled')), $job('a'), 'junk', $job('e', array('ts' => $now - 1 * $day)));
$rec = invq_jobs_recent($jobs, $now);
ok(count($rec) === 3 && $rec[0]['id'] === 'e' && $rec[1]['id'] === 'a' && $rec[2]['id'] === 'c', 'last 30 days, quoted/done, newest first, one per id - and an unpriced job is KEPT (it needs a price typing)', json_encode(array_map(function ($j) { return $j['id']; }, $rec)));
ok(count(invq_jobs_recent(array($job('x', array('status' => 'done'))), $now)) === 1, 'a done job still counts (it still needs invoicing)');
ok(invq_job_row($job('c', array('amount' => 0)), null, $now)['why_not'] === 'no_amount', 'an unpriced job says it needs a price');
ok(invq_match_job($job('a', array('invoice_doc' => '4905/2')), $byId = array('1' => $mk(1), '2' => $mk(2, array('TotalAmt' => 85, 'Balance' => 85))), '')['Id'] === '2', 'an invoice NUMBER typed in Slack finds the invoice, whatever the amount');
$sl = invq_job_row($job('s', array('via' => 'slack', 'invoiced_in_slack' => true, 'note' => 'remote · 2 hours')), null, $now);
ok($sl['source'] === 'slack' && $sl['state'] === 'invoiced' && $sl['can_create'] === false && $sl['detail'] === 'remote · 2 hours', 'a Slack job marked Y in Invoiced? is left alone and says so', json_encode($sl));

echo "-- matching a job to its invoice\n";
$byId = array('1' => $mk(1), '2' => $mk(2, array('TotalAmt' => 85, 'Balance' => 85)), '3' => $mk(3, array('TxnDate' => '2026-09-01')), '4' => $mk(4, array('CustomerRef' => array('value' => '99', 'name' => 'Other'))));
ok(invq_match_job($job('a', array('invoice_no' => '2')), $byId, '11')['Id'] === '2', 'the recorded invoice id wins, whatever the amount');
ok(invq_match_job($job('a'), $byId, '11')['Id'] === '1', 'else the same customer, same amount, within a week');
ok(invq_match_job($job('a'), $byId, '') === null, 'no customer id = no guessing');
ok(invq_match_job($job('a', array('amount' => 85)), $byId, '11')['Id'] === '2', 'amount is matched exactly');
ok(invq_match_job($job('a', array('amount' => 61)), $byId, '11') === null, 'a pound out is not a match');
$byId2 = array('3' => $mk(3, array('TxnDate' => '2026-09-01')));
ok(invq_match_job($job('a'), $byId2, '11') === null, 'three weeks apart is not the same job');
ok(invq_match_job($job('a', array('invoice_no' => '77')), $byId, '11')['Id'] === '1', 'a recorded id QuickBooks no longer returns falls back to matching');

echo "-- when a job may have an invoice created\n";
ok(invq_can_create($job('a')) === array(true, ''), 'email + price + description = yes');
ok(invq_can_create($job('a', array('email' => 'nope')))[1] === 'no_email', 'no usable email');
ok(invq_can_create($job('a', array('amount' => 2500)))[1] === 'large', 'over the ceiling needs a human');
ok(invq_can_create($job('a', array('desc' => '  ')))[1] === 'no_desc', 'no description');

echo "-- what counts as unsent\n";
ok(invq_waiting($mk(1)) && !invq_waiting($mk(2, array('EmailStatus' => 'EmailSent'))) && !invq_waiting($mk(3, array('Balance' => 0))), 'unsent with a balance only');
ok(invq_invoice_state($mk(1)) === 'unsent' && invq_invoice_state($mk(1, array('EmailStatus' => 'EmailSent'))) === 'sent' && invq_invoice_state($mk(1, array('Balance' => 0))) === 'paid', 'states');

echo "-- the warnings\n";
$codes = function ($f) { return array_map(function ($x) { return $x['code']; }, $f); };
ok($codes(invq_flags($mk(1), 'g@example.com', array(), $now)) === array(), 'a clean invoice has no warnings');
ok(in_array('no_email', $codes(invq_flags($mk(1), '', array(), $now))), 'no email address is flagged');
ok(in_array('vat', $codes(invq_flags($mk(1, array('TxnTaxDetail' => array('TotalTax' => 12))), 'g@example.com', array(), $now))), 'VAT is flagged');
ok(in_array('amount', $codes(invq_flags($mk(1, array('TotalAmt' => 2500, 'Balance' => 2500)), 'g@example.com', array(), $now))), 'over the ceiling is flagged');
ok(in_array('generic', $codes(invq_flags($mk(1, array('Line' => array(array('DetailType' => 'SalesItemLineDetail', 'Amount' => 60, 'Description' => 'Work carried out')))), 'g@example.com', array(), $now))), 'the placeholder description is flagged');
$f = invq_flags($mk(1), 'g@example.com', array($mk(1), $mk(9, array('TxnDate' => '2026-09-18', 'EmailStatus' => 'EmailSent'))), $now);
ok(in_array('dup', $codes($f)) && strpos($f[0]['text'], '#4905/9') !== false, 'same customer, same amount, 2 days apart = possible duplicate, naming the other');
ok(in_array('old', $codes(invq_flags($mk(1, array('TxnDate' => '2026-09-01')), 'g@example.com', array(), $now))), 'three weeks unsent is flagged');

echo "-- rows\n";
$ir = invq_row($mk(1), 'g@example.com', array(), false, 'https://app.qbo.intuit.com', $now);
ok($ir['id'] === '1' && $ir['days'] === 2 && $ir['state'] === 'unsent' && $ir['url'] === 'https://app.qbo.intuit.com/app/invoice?txnId=1', 'invoice row', json_encode($ir));
$jr = invq_job_row($job('a'), null, $now);
ok($jr['job'] === 'a' && $jr['state'] === 'none' && $jr['can_create'] === true && $jr['days'] === 4 && $jr['amount'] === 60.0, 'job row with no invoice yet can be created', json_encode($jr));
$jr2 = invq_job_row($job('a', array('email' => '')), null, $now);
ok($jr2['can_create'] === false && $jr2['why_not'] === 'no_email', 'and says why when it cannot');
$jr3 = invq_job_row($job('a'), $ir, $now);
ok($jr3['state'] === 'unsent' && $jr3['can_create'] === false && $jr3['invoice']['id'] === '1', 'a job with an unsent invoice shows it and is not created again');
ok(invq_job_row($job('a'), invq_row($mk(1, array('Balance' => 0)), 'g@example.com', array(), false, 'x', $now), $now)['state'] === 'paid', 'a paid invoice makes a paid job');
ok(!isset($jr['phone']) && !isset($jr['addr']) && !isset($jr['note']), 'no phone, address or notes in a job row');

echo "-- the morning line\n";
$jobRows = array(invq_job_row($job('a'), null, $now), invq_job_row($job('f', array('email' => '')), null, $now), invq_job_row($job('g'), $ir, $now));
$invRows = array($ir, invq_row($mk(2, array('TxnDate' => '2026-09-01', 'TotalAmt' => 745.98, 'Balance' => 745.98, 'CustomerRef' => array('value' => '3', 'name' => 'Emblem Sports Cars'))), 'e@example.com', array(array('code' => 'old', 'text' => 'x')), false, 'x', $now));
$line = invq_slack_line($jobRows, $invRows);
ok(strpos($line, '*2 invoices waiting for your OK*') !== false && strpos($line, '*2 jobs with no invoice yet* (1 need an email address first)') !== false, 'both halves', $line);
ok(strpos($line, 'Emblem Sports Cars £745.98 (21 days)') < strpos($line, 'Gordon Snook £60.00 (2 days)'), 'oldest first');
ok(strpos($line, '1 with a warning') !== false && strpos($line, '@example.com') === false, 'warning count, no email addresses');
ok(invq_slack_line(array(), array()) === '' && invq_slack_line(array(invq_job_row($job('g'), $ir, $now)), array(invq_row($mk(2, array('EmailStatus' => 'EmailSent')), 'x', array(), false, 'x', $now))) === '', 'nothing to do = silence');

echo "-- the endpoint and the sweep, at source level\n";
$EP = (string)file_get_contents(__DIR__ . '/pcm-invq.php');
$SW = (string)file_get_contents(__DIR__ . '/pcm-invq-sweep.php');
ok(strpos($EP, '?' . '>') === false && strpos($SW, '?' . '>') === false, 'no closing tags');
ok(strpos($EP, 'need_staff();') !== false && strpos($EP, 'need_staff();') < strpos($EP, "if (\$action === 'hold'"), 'the staff gate runs before any action');
ok(!preg_match('/\$in\[\'(to|email|sendto|sendTo|address|name|customer)\'\]/', $EP) && !preg_match('/\$in\[/', $SW), 'no recipient, name or customer can come from the request');
/* A price or description MAY be typed - but only into a job, via setjob, never into
   an invoice or a send. Pin that the request's amount/desc are read nowhere else. */
$sj0 = strpos($EP, "if (\$action === 'setjob')"); $sj1 = strpos($EP, "if (\$action === 'hold'");
$setjobBlock = ($sj0 !== false && $sj1 !== false && $sj1 > $sj0) ? substr($EP, $sj0, $sj1 - $sj0) : '';
ok($setjobBlock !== '' && substr_count($EP, "\$in['amount']") === substr_count($setjobBlock, "\$in['amount']") && substr_count($EP, "\$in['desc']") === substr_count($setjobBlock, "\$in['desc']") && substr_count($setjobBlock, "\$in['amount']") > 0,
   'a typed price or description reaches only the job record (setjob), never a send or a create');
ok(strpos($SW, "invq_email_status(\$inv) === 'EmailSent') return array('ok' => false, 'error' => 'already_sent')") !== false, 'an already-sent invoice is refused at send time');
ok(strpos($SW, "'Content-Type: application/octet-stream'") !== false && strpos($SW, "/send?sendTo=") !== false && strpos($SW, "\$status !== 'EmailSent'") !== false, 'the send call is the one Intuit documents, counted only on EmailSent');
ok(strpos($SW, "if (empty(\$c['live'])) return array('ok' => false, 'error' => 'not_live')") !== false && strpos($SW, "if (\$c['only'] !== '') return array('ok' => false, 'error' => 'only_key')") !== false, 'creating honours QBO_LIVE_ENABLED and QBO_ONLY_KEY');
ok(strpos($SW, "if (!empty(\$job['invoice_no'])) return array('ok' => false, 'error' => 'already_invoiced'") !== false, 'a job with an invoice is never invoiced again');
ok(strpos($SW, 'qbo_lib_custkey($email, $c[\'realm\'])') !== false && substr_count($SW, 'LOCK_EX | LOCK_NB') >= 3, 'the customer map is keyed like the other writers and read/written under their lock');
ok(preg_match_all("/invq_api\(\\\$c, 'POST', '\/(customer|invoice)'/", $SW, $mm) === 2 && !preg_match('/\/void|operation=void|sparse|\/customer\/\d/', $SW), 'exactly two creates (customer, invoice); nothing edits or voids');
ok(strpos($SW, 'INVQ_MAX_SENDS_HOUR') !== false && strpos($SW, 'INVQ_MAX_CREATES_RUN') !== false, 'tripwires on sends and creates');
ok(strpos($SW, "'BillEmail' => array('Address' => \$email)") !== false, 'a created invoice carries the customer email, so it can be sent');
$gi = (string)file_get_contents(__DIR__ . '/../.gitignore');
ok(strpos($gi, 'api/pcm-invq.json') !== false && strpos($gi, 'api/pcm-invq.log') !== false, 'the store and log are gitignored');
$ht = (string)file_get_contents(__DIR__ . '/../.htaccess');
$deny = preg_match('/<FilesMatch "(\^\([^"]*pcm-invq[^"]*)">/', $ht, $m) ? $m[1] : '';
ok($deny !== '', 'a deny rule exists for the queue files', $deny);
foreach (array('pcm-invq.json', 'pcm-invq.json.lock', 'pcm-invq.json.12.tmp', 'pcm-invq.log', 'pcm-invq-lib.php', 'pcm-invq-sweep.php', 'pcm-invq-test.php') as $f)
    ok($deny !== '' && preg_match('#' . $deny . '#', $f) === 1, 'denied: ' . $f);
ok($deny !== '' && preg_match('#' . $deny . '#', 'pcm-invq.php') !== 1, 'the endpoint itself stays served');
$CR = (string)file_get_contents(__DIR__ . '/tm-cron.php');
ok(strpos($CR, 'invq_morning()') !== false && strpos($CR, 'invq_morning()') < strpos($CR, 'if (!tm_configured())'), 'the morning sweep runs from the cron, above the SMS gate');

echo "\n" . ($fails ? $fails . ' FAILED' : 'all passed') . "\n";
exit($fails ? 1 : 0);
