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

echo "-- PC Manager services on non-plan customers\n";
$svc = $now - 4 * $day;
$cust = array(
    'k1' => array('name' => 'Gordon Snook', 'email' => 'g@example.com', 'mobile' => '07517 878204', 'tier' => 'free',
                  'machines' => array('890a5bf00f13' => array('name' => 'GORDON_LAPTOP', 'repk' => array((string)$svc => 'selfrun', (string)($svc - 86400 * 40) => 'service')))),
    'k2' => array('name' => 'Plan Person', 'email' => 'p@example.com', 'tier' => 'pro', 'machines' => array('a1b2c3d4e5f6' => array('name' => 'PC', 'repk' => array((string)$svc => 'service')))),
    'k3' => array('name' => 'Signin', 'email' => 's@example.com', 'via' => 'signin', 'machines' => array('a1b2c3d4e5f7' => array('repk' => array((string)$svc => 'service')))),
    'k4' => array('name' => 'Old Service', 'email' => 'o@example.com', 'tier' => 'free', 'machines' => array('a1b2c3d4e5f8' => array('repk' => array((string)($now - 45 * $day) => 'service')))),
    'k5' => array('name' => 'Engineer Job', 'email' => 'e@example.com', 'tier' => 'oneoff', 'machines' => array('a1b2c3d4e5f9' => array('name' => 'HP-1', 'fullservice' => gmdate('Y-m-d H:i', $svc + 3600), 'oneoff_amount' => '85'))),
    'k6' => array('name' => 'Health only', 'email' => 'h@example.com', 'tier' => 'free', 'machines' => array('a1b2c3d4e5fa' => array('repk' => array((string)$svc => 'health')))),
);
$pj = invq_jobs_from_pcm($cust, $now);
$ids = array_map(function ($j) { return $j['id']; }, $pj);
ok(count($pj) === 2 && in_array('pcm-k1-890a5bf00f13', $ids, true) && in_array('pcm-k5-a1b2c3d4e5f9', $ids, true), 'a free customer\'s self-run and an engineer one-off count; plan, sign-in, old and health-only do not', json_encode($ids));
$g = $pj[0]['id'] === 'pcm-k1-890a5bf00f13' ? $pj[0] : $pj[1]; $e = $pj[0]['id'] === 'pcm-k5-a1b2c3d4e5f9' ? $pj[0] : $pj[1];
ok($g['ts'] === $svc && $g['via'] === 'pcm' && $g['status'] === 'done' && $g['amount'] === 0.0 && $g['phone'] === '07517 878204', 'dated by the LATEST service, unpriced, done', json_encode($g));
ok(strpos($g['desc'], 'Full computer service on GORDON_LAPTOP (run from the app)') === 0, 'a description a customer would recognise', $g['desc']);
ok($e['amount'] === 85.0 && $e['amount_by'] === 'engineer' && strpos($e['desc'], 'on HP-1,') !== false && $e['ts'] === $svc + 3600, 'engineer mode brings its agreed price and its fullservice time', json_encode($e));
ok(invq_job_row($g, null, $now)['source'] === 'pcm' && invq_job_row($g, null, $now)['why_not'] === 'no_amount', 'shows as a PC Manager job needing a price');
ok(count(invq_jobs_recent(array($job('d', array('status' => 'dismissed'))), $now)) === 0, 'a dismissed job leaves the month\'s list');

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

echo "-- QuickBooks' Products & Services as the job drop-down (22 Sep 2026)\n";
$Q = array('QueryResponse' => array('Item' => array(
    array('Id' => '1174', 'Name' => 'Online Remote Support Services', 'Type' => 'Service', 'Active' => true, 'UnitPrice' => 0, 'Description' => 'Remote support session'),
    array('Id' => '1200', 'Name' => 'Full Computer Service', 'Type' => 'Service', 'Active' => true, 'UnitPrice' => 65, 'Description' => 'Full service: updates, malware scan, clean-up and health check'),
    array('Id' => '1201', 'Name' => 'Old thing', 'Type' => 'Service', 'Active' => false, 'UnitPrice' => 10),
    array('Id' => '9', 'Name' => 'Services', 'Type' => 'Category'),
    array('Id' => '1300', 'Name' => 'Dell Latitude 5420 (refurbished)', 'Type' => 'Inventory', 'Active' => true, 'UnitPrice' => 349),
)));
$items = invq_items_clean($Q);
ok(count($items) === 2 && $items[0]['name'] === 'Full Computer Service' && $items[1]['id'] === '1174', 'active services only (no categories, stock or inactive), sorted by name', json_encode(array_map(function ($i) { return $i['name']; }, $items)));
ok($items[0]['price'] === 65.0 && $items[0]['desc'] === 'Full service: updates, malware scan, clean-up and health check', 'list price and sales description carried');
ok(invq_item_find($items, '1200')['name'] === 'Full Computer Service' && invq_item_find($items, '999') === null && invq_item_find($items, '') === null, 'find by id, never by a blank');
ok(invq_item_match($items, 'full computer service')['id'] === '1200' && invq_item_match($items, ' Full-Computer Service. ')['id'] === '1200', 'a Slack job type matches the item by name, ignoring case, spaces and punctuation');
ok(invq_item_match($items, 'Full service') === null && invq_item_match($items, 'remote') === null && invq_item_match($items, '') === null, 'a partial or unknown name matches nothing (strict)');
$Q2 = $Q; $Q2['QueryResponse']['Item'][] = array('Id' => '1400', 'Name' => '365 Techies Full Computer Service', 'Type' => 'Service', 'Active' => true, 'UnitPrice' => 65);
$Q2['QueryResponse']['Item'][] = array('Id' => '1401', 'Name' => 'Remote Support Session (30 min)', 'Type' => 'Service', 'Active' => true, 'UnitPrice' => 30);
$items2 = invq_items_clean($Q2);
ok(invq_item_match($items2, 'Remote support', true) === null && invq_item_match($items2, 'Remote support', true, 'shortest')['id'] === '1401', 'loosely, "Remote support" is inside two names: nothing for a job (money), the shortest for the shortlist');
ok(invq_item_match($items2, 'Full computer service', true)['id'] === '1200', 'an exact name still wins over a longer one that contains it');
ok(invq_item_match($items, 'Full computer service', true)['id'] === '1200' && invq_item_match($items2, 'Computer', true) === null && invq_item_match($items, 'Data recovery', true) === null, 'unique containment matches; a word inside several names, or a name nobody has, does not');
ok(invq_items_short($items2, array('Remote support', 'Full computer service', 'Gaming PC tune-up')) === array('1401', '1200'), 'the shortlist takes the shortest containing name and skips what QuickBooks lacks');
$j1 = array('id' => 'a', 'desc' => '', 'amount' => 0);
ok(invq_job_apply_item($j1, $items[0]) && $j1['item_id'] === '1200' && $j1['desc'] === 'Full service: updates, malware scan, clean-up and health check' && $j1['desc_by'] === 'item' && $j1['amount'] === 65.0 && $j1['amount_by'] === 'item', 'an empty job takes the item, its description and its list price', json_encode($j1));
$j2 = array('id' => 'b', 'desc' => 'VPN advice', 'desc_by' => 'staff', 'amount' => 60.0, 'amount_by' => 'staff');
ok(invq_job_apply_item($j2, $items[0]) && $j2['item_id'] === '1200' && $j2['desc'] === 'VPN advice' && $j2['amount'] === 60.0, 'staff-typed price and description are never overwritten by the item');
$j3 = array('id' => 'c', 'desc' => 'Suspect Scammers', 'amount' => 30.0, 'amount_by' => 'slack');
invq_job_apply_item($j3, $items[0]);
ok($j3['desc'] === 'Suspect Scammers' && $j3['amount'] === 30.0, 'a Slack-typed price and issue are kept too');
$j4 = array('id' => 'd', 'item_id' => '1200', 'desc' => 'Full service: updates, malware scan, clean-up and health check', 'desc_by' => 'item', 'amount' => 65.0, 'amount_by' => 'item');
ok(invq_job_apply_item($j4, $items[1]) && $j4['item_id'] === '1174' && $j4['desc'] === 'Remote support session' && $j4['amount'] === 65.0, 'picking a different item replaces an item-set description; a £0 item leaves the price', json_encode($j4));
ok(invq_job_apply_item($j4, $items[1]) === false, 'the same item again changes nothing');
$row = invq_job_row(array('id' => 'x', 'name' => 'A', 'email' => 'a@b.com', 'desc' => 'd', 'amount' => 65.0, 'ts' => $now - $day, 'status' => 'done', 'item_id' => '1200', 'item_name' => 'Full Computer Service', 'kind' => 'Full computer service'), null, $now);
ok($row['item'] === '1200' && $row['item_name'] === 'Full Computer Service' && $row['kind'] === 'Full computer service', 'the row carries the item and the Slack job type');
ok(invq_items_short($items, array('Full computer service', 'Gaming PC tune-up', 'online remote support services', 'Full Computer Service')) === array('1200', '1174'), 'the shortlist: matched by name in the given order, a name QuickBooks lacks skipped, no repeats');
ok(invq_items_short($items, invq_shortlist_default()) === array('1174', '1200') && invq_items_short(array(), array('Remote support')) === array() && invq_items_short($items, array('Laptop repair')) === array(), 'the default against this list finds Online Remote Support Services and Full Computer Service, in shortlist order; no items or no matches = empty (the console then shows the full list)');
ok(invq_shortlist_default() === array('Remote support', 'Full computer service', 'Gaming PC tune-up'), 'the default shortlist is the three the owner named');

echo "-- the endpoint and the sweep, at source level\n";
$EP = (string)file_get_contents(__DIR__ . '/pcm-invq.php');
$SW = (string)file_get_contents(__DIR__ . '/pcm-invq-sweep.php');
ok(strpos($EP, '?' . '>') === false && strpos($SW, '?' . '>') === false, 'no closing tags');
ok(strpos($EP, 'need_staff();') !== false && strpos($EP, 'need_staff();') < strpos($EP, "if (\$action === 'hold'"), 'the staff gate runs before any action');
ok(strpos($EP, "invq_item_find(invq_items(\$c), \$itemId)") !== false && strpos($EP, "fail('bad_item')") !== false, 'a picked service must be on QuickBooks\' own list - the request names it, never defines it');
ok(strpos($SW, "!empty(\$job['item_id']) ? (string)\$job['item_id'] : \$c['item']") !== false, 'the invoice line uses the job\'s item, else the default');
ok(strpos($SW, "'select * from Item where Active = true") !== false && strpos($SW, 'INVQ_ITEMS_TTL') !== false, 'the item list is read from QuickBooks and cached');
ok(strpos($SW, 'invq_kind_sync($c, $now);') !== false && strpos($SW, 'invq_kind_sync($c, $now);') > strpos($SW, 'invq_pcm_sync($now);'), 'a Slack job type is matched to a service before every fresh overview');
ok(strpos($SW, "\$body['BillAddr']") !== false && strpos($SW, "'PostalCode'") !== false, 'a new customer is created with the address and postcode from Slack');
ok(!preg_match('/\$in\[\'(to|sendto|sendTo|address|name|customer)\'\]/', $EP) && !preg_match('/\$in\[/', $SW), 'no recipient, name or customer can come from the request');
/* A price or description MAY be typed - but only into a job, via setjob, never into
   an invoice or a send. Pin that the request's amount/desc are read nowhere else. */
$sj0 = strpos($EP, "if (\$action === 'setjob')"); $sj1 = strpos($EP, "if (\$action === 'hold'");
$setjobBlock = ($sj0 !== false && $sj1 !== false && $sj1 > $sj0) ? substr($EP, $sj0, $sj1 - $sj0) : '';
ok($setjobBlock !== '' && substr_count($EP, "\$in['amount']") === substr_count($setjobBlock, "\$in['amount']") && substr_count($EP, "\$in['desc']") === substr_count($setjobBlock, "\$in['desc']") && substr_count($setjobBlock, "\$in['amount']") > 0,
   'a typed price or description reaches only the job record (setjob), never a send or a create');
/* The customer's email MAY be typed too (22 Sep: a Slack post with none) - into the job
   only, validated, and the send still takes its address from QuickBooks, never from here. */
ok(substr_count($EP, "\$in['email']") === substr_count($setjobBlock, "\$in['email']") && substr_count($setjobBlock, "\$in['email']") > 0 && strpos($setjobBlock, "invq_email_ok(\$in['email'])") !== false && strpos($setjobBlock, "fail('bad_email')") !== false,
   'a typed customer email reaches only the job record, and only if it is a valid address');
ok(strpos($SW, "\$d['jobs'][\$i]['email_by'] = 'staff'") !== false, 'the job remembers the email was typed by staff, so a re-poll keeps it');
ok(strpos($SW, "invq_email_status(\$inv) === 'EmailSent') return array('ok' => false, 'error' => 'already_sent')") !== false, 'an already-sent invoice is refused at send time');
ok(strpos($SW, "'Content-Type: application/octet-stream'") !== false && strpos($SW, "/send?sendTo=") !== false && strpos($SW, "\$status !== 'EmailSent'") !== false, 'the send call is the one Intuit documents, counted only on EmailSent');
ok(strpos($SW, "if (empty(\$c['live'])) return array('ok' => false, 'error' => 'not_live')") !== false && strpos($SW, "if (\$c['only'] !== '') return array('ok' => false, 'error' => 'only_key')") !== false, 'creating honours QBO_LIVE_ENABLED and QBO_ONLY_KEY');
ok(strpos($SW, "if (!empty(\$job['invoice_no'])) return array('ok' => false, 'error' => 'already_invoiced'") !== false, 'a job with an invoice is never invoiced again');
ok(strpos($SW, 'qbo_lib_custkey($email, $c[\'realm\'])') !== false && substr_count($SW, 'LOCK_EX | LOCK_NB') >= 3, 'the customer map is keyed like the other writers and read/written under their lock');
$chgFn0 = strpos($SW, 'function invq_change_for_job('); $chgFn1 = $chgFn0 !== false ? strpos($SW, '/* ---- WRITE 2:', $chgFn0) : false;
$chgFn = ($chgFn0 !== false && $chgFn1 > $chgFn0) ? substr($SW, $chgFn0, $chgFn1 - $chgFn0) : '';
ok(preg_match_all("/invq_api\(\\\$c, 'POST', '\/(customer|invoice)'/", $SW, $mm) === 3 && preg_match_all("/invq_api\(\\\$c, 'POST', '\/invoice'/", $chgFn, $mm2) === 1
   && substr_count($SW, 'sparse') === substr_count($chgFn, 'sparse') && strpos($chgFn, "'sparse' => true") !== false && !preg_match('/\/void|operation=void|operation=delete|\/customer\/\d/', $SW)
   && strpos($chgFn, 'invq_change_blocked(') !== false && strpos($chgFn, 'invq_change_blocked(') < strpos($chgFn, "invq_api(\$c, 'POST'"),
   'creates: a customer and an invoice; the ONE edit is "Change it" (a sparse update, only after its unsent / unpaid / untouched check); nothing voids or deletes');
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

echo "-- a quote's number when quotes use a plain running number\n";
ok(invq_next_number(array('1041', '1040', '4905/3', 'Q-7', ''), '') === '1042', 'plain integers continue (1042), the rest ignored');
ok(invq_next_number(array('4905/3', 'Q-7'), '') === '', 'no plain sequence = blank');

echo "-- a quote started from a job shows on its row\n";
$jq = array('id' => 'q1', 'name' => 'Bradley Parry', 'email' => 'bjparry1963@gmail.com', 'amount' => 200, 'desc' => 'New laptop', 'ts' => time() - 86400, 'via' => 'slack',
            'quote_id' => '4411', 'quote_no' => '4905/806', 'quote_url' => 'https://app.qbo.intuit.com/app/estimate?txnId=4411', 'quote_at' => time() - 60);
$rq = invq_job_row($jq, null);
ok(is_array($rq['quote']) && $rq['quote']['id'] === '4411' && $rq['quote']['no'] === '4905/806' && strpos($rq['quote']['url'], 'estimate?txnId=4411') !== false, 'the row carries the quote id, number and QuickBooks link');
ok($rq['state'] === 'none' && $rq['can_create'] === true, 'a quote does not stop the invoice being raised later');
unset($jq['quote_id']);
ok(invq_job_row($jq, null)['quote'] === null, 'no quote = null, not an empty shape');

echo "-- the next invoice number (4905/NNN, David's sequence)\n";
ok(invq_next_number(array('4905/799', '4905/801', '4905/800')) === '4905/802', 'highest plus one, whatever the order', invq_next_number(array('4905/799', '4905/801', '4905/800')));
ok(invq_next_number(array('4905/99', '4905/801')) === '4905/802', 'numeric, not alphabetical (99 does not beat 801)');
ok(invq_next_number(array('', 'ABCD-1234-EFGH', '4905/803', 'INV-1')) === '4905/804', 'blanks, licence-keyed and other numbers are ignored', invq_next_number(array('', 'ABCD-1234-EFGH', '4905/803', 'INV-1')));
ok(invq_next_number(array('4905/80a', '4905/', '4905/802')) === '4905/803', 'a typo after the slash is ignored');
ok(invq_next_number(array()) === '' && invq_next_number(array('INV-7')) === '', 'nothing in the sequence = blank, never an invented start');
ok(invq_next_number(array('7/12'), '7/') === '7/13', 'the prefix is a parameter');

echo "-- 23 Oct 2026: sent but not paid, sending one again, and the money in\n";
$t = strtotime('2026-10-23 16:00:00 UTC');
$inv = function ($id, $over = array()) use ($mk) { return $mk($id, array_merge(array('EmailStatus' => 'EmailSent', 'TxnDate' => '2026-09-25', 'DueDate' => '2026-10-09'), $over)); };
$list = array(
    $inv(808, array('CustomerRef' => array('value' => '21', 'name' => 'Tom Wilson'), 'BillEmail' => array('Address' => ''), 'TotalAmt' => 60, 'Balance' => 60, 'DeliveryInfo' => array('DeliveryTime' => '2026-09-25T10:00:00Z'))),
    $inv(800, array('CustomerRef' => array('value' => '22', 'name' => 'Alex Barnes'), 'TxnDate' => '2026-09-22', 'DueDate' => '2026-09-22', 'TotalAmt' => 150, 'Balance' => 150)),
    $inv(815, array('EmailStatus' => 'NotSet', 'TxnDate' => '2026-10-14', 'DueDate' => '2026-11-01')),
    $inv(811, array('EmailStatus' => 'NotSet', 'CustomerRef' => array('value' => '23', 'name' => 'Media Friendly Ltd'), 'Balance' => 21.45)),
    $inv(816, array('Balance' => 0)),
    $inv(820, array('TxnDate' => '2026-10-20', 'DueDate' => '2026-11-03', 'TotalAmt' => 95, 'Balance' => 45)),
    'junk',
);
$ur = invq_unpaid_rows($list, array('21' => 'tom@example.com'), array('808' => $t - 3600), 'https://qbo.example', $t);
$ids = array_map(function ($r) { return $r['id']; }, $ur);
ok($ids === array('800', '808', '820'), 'only invoices QuickBooks emailed that still owe: plan (NotSet), unsent and paid ones are left out; most overdue first', json_encode($ids));
ok($ur[0]['overdue'] === 31 && $ur[1]['overdue'] === 14 && $ur[2]['overdue'] === 0, 'days overdue counted from the due date (31, 14, not yet due)', json_encode(array_map(function ($r) { return $r['overdue']; }, $ur)));
ok($ur[1]['email'] === 'tom@example.com' && $ur[1]['resent_at'] === $t - 3600 && $ur[1]['url'] === 'https://qbo.example/app/invoice?txnId=808', 'no email on the invoice -> the customer\'s own; when it was last sent again; the QuickBooks link');
ok($ur[2]['balance'] === 45.0 && $ur[2]['total'] === 95.0, 'a part-paid invoice shows what is still owed and the total');
ok(invq_month_ok('2026-10') === '2026-10' && invq_month_ok('2026-13') === '' && invq_month_ok("2026-10'") === '' && invq_month_ok('26-10') === '', 'month: YYYY-MM only (nothing else reaches a query)');
ok(invq_week_start('2026-10-23') === '2026-10-19' && invq_week_start('2026-10-19') === '2026-10-19' && invq_week_start('2026-10-25') === '2026-10-19' && invq_week_start('2026-10-01') === '2026-09-28', 'weeks run Monday to Sunday');
ok(invq_pay_how(array('PaymentRefNum' => 'pi_3USK55JIknzx9gfe0y')) === 'Card' && invq_pay_how(array('PrivateNote' => 'Paid with PayPal on the 365techies.co.uk pay page')) === 'PayPal'
   && invq_pay_how(array('PaymentRefNum' => 'PM01XW34J5FQ3WDP3EXC2A31PJ6A')) === 'Direct Debit' && invq_pay_how(array('PaymentMethodRef' => array('value' => '1', 'name' => 'Cash'))) === 'Cash'
   && invq_pay_how(array()) === 'Bank transfer / other', 'how it was paid: card (Stripe pi_), PayPal, Direct Debit (GoCardless PM), cash, else bank transfer / other');
$pays = array(
    array('Id' => 'P1', 'TxnDate' => '2026-10-19', 'TotalAmt' => 60, 'PaymentRefNum' => 'pi_3USK55JIknzx9gfe0y', 'CustomerRef' => array('value' => '77', 'name' => 'Hanna Knight'),
          'Line' => array(array('Amount' => 60, 'LinkedTxn' => array(array('TxnId' => '12838', 'TxnType' => 'Invoice'))))),
    array('Id' => 'P2', 'TxnDate' => '2026-10-13', 'TotalAmt' => 21.45, 'PaymentRefNum' => 'PM01XW34J5FQ3WDP3EXC2A31PJ6A', 'CustomerRef' => array('value' => '23', 'name' => 'Media Friendly Ltd'),
          'Line' => array(array('Amount' => 21.45, 'LinkedTxn' => array(array('TxnId' => '12066', 'TxnType' => 'Invoice'))))),
    array('Id' => 'P3', 'TxnDate' => '2026-10-22', 'TotalAmt' => 30, 'CustomerRef' => array('value' => '30', 'name' => 'Mr Barry Cross'),
          'Line' => array(array('Amount' => 30, 'LinkedTxn' => array(array('TxnId' => '99999', 'TxnType' => 'Invoice'))))),
    array('Id' => 'P4', 'TxnDate' => '2026-09-30', 'TotalAmt' => 50, 'CustomerRef' => array('name' => 'Last month')),
    array('Id' => 'P5', 'TxnDate' => '2026-10-05', 'TotalAmt' => 0, 'CustomerRef' => array('name' => 'Zero')),
);
$deps = array(
    array('Id' => 'D1', 'TxnDate' => '2026-10-19', 'Line' => array(
        array('Amount' => 21.45, 'LinkedTxn' => array(array('TxnId' => 'P2', 'TxnType' => 'Payment'))),
        array('Amount' => 222.03, 'DepositLineDetail' => array('AccountRef' => array('value' => '9', 'name' => '365 Gocardless Service/Fee Income'))))),
    array('Id' => 'D2', 'TxnDate' => '2026-10-12', 'Line' => array(array('Amount' => 930.40, 'DepositLineDetail' => array('AccountRef' => array('value' => '9', 'name' => '365 Gocardless Service/Fee Income'))))),
    array('Id' => 'D3', 'TxnDate' => '2026-10-22', 'Line' => array(array('Amount' => 37.45, 'DepositLineDetail' => array('AccountRef' => array('value' => '5', 'name' => 'Facebook income'))))),
    array('Id' => 'D4', 'TxnDate' => '2026-10-22', 'Line' => array(array('Amount' => -1.10, 'DepositLineDetail' => array('AccountRef' => array('value' => '6', 'name' => 'Stripe Fees'))))),
);
$ps = invq_paid_summary($pays, array('12838' => '4905/816', '12066' => '4905/811'), $deps, '2026-10');
ok(count($ps['rows']) === 3 && $ps['rows'][0]['customer'] === 'Mr Barry Cross' && $ps['rows'][0]['invoices'] === array('id 99999') && $ps['rows'][1]['invoices'] === array('4905/816') && $ps['rows'][1]['how'] === 'Card',
   'this month\'s invoice payments, newest first, with the invoice numbers they paid and how (last month and £0 left out)', json_encode($ps['rows']));
ok($ps['invoices'] === 111.45 && $ps['plans'] === 1152.43 && $ps['total'] === 1263.88, 'totals: invoices £111.45 + plans £1,152.43 (GoCardless income lines only - not Facebook, fees or the invoice part of a payout)', json_encode(array($ps['invoices'], $ps['plans'], $ps['total'])));
$wk = array(); foreach ($ps['weeks'] as $w) $wk[$w['start']] = array($w['invoices'], $w['plans'], $w['total'], $w['n']);
ok(array_keys($wk) === array('2026-10-19', '2026-10-12') && $wk['2026-10-19'] === array(90.0, 222.03, 312.03, 2) && $wk['2026-10-12'] === array(21.45, 930.4, 951.85, 1),
   'week by week, newest week first: w/c 19 Oct £90 + £222.03, w/c 12 Oct £21.45 + £930.40', json_encode($wk));
$sw0 = strpos($SW, 'function invq_resend('); $sw1 = strpos($SW, 'function invq_customer_emails(');
$rsBlock = ($sw0 !== false && $sw1 > $sw0) ? substr($SW, $sw0, $sw1 - $sw0) : '';
ok($rsBlock !== '' && strpos($rsBlock, "invq_email_status(\$inv) !== 'EmailSent') return array('ok' => false, 'error' => 'not_sent_yet')") !== false
   && strpos($rsBlock, "if (\$bal <= 0) return array('ok' => false, 'error' => 'nothing_owed')") !== false && strpos($rsBlock, 'INVQ_RESEND_GAP') !== false && strpos($rsBlock, 'INVQ_MAX_SENDS_HOUR') !== false,
   'sending again: only an invoice QuickBooks has sent, only while money is owed, not twice in 20 hours, inside the hourly tripwire');
ok($rsBlock !== '' && strpos($rsBlock, '$to = invq_send_address($c, $inv);') !== false && strpos($SW, 'function invq_send_address($c, $inv)') !== false, 'sending again goes to the address QuickBooks holds, like the first send');
ok(strpos($EP, "invq_resend(\$c, \$id, \$who)") !== false && strpos($EP, "invq_paid(\$c, (string)(isset(\$in['month'])") !== false, 'the endpoint passes only an invoice id to a send again, and only a month to the money-in read');

echo "-- 23 Oct 2026 (later): several lines on one invoice, and the email seen before it goes\n";
$items = array(array('id' => '7', 'name' => 'Computer Repair', 'desc' => 'Computer repair', 'price' => 115.0),
               array('id' => '9', 'name' => 'Collection & Delivery', 'desc' => '', 'price' => 20.0));
list($L, $e) = invq_lines_clean(array(
    array('item' => '7', 'desc' => 'Repair: new SSD and Windows reinstalled', 'qty' => '1', 'rate' => '115'),
    array('item' => '9', 'desc' => '', 'qty' => '2', 'rate' => '£20.00'),
    array('item' => '', 'desc' => 'Loan of an external hard drive while the PC was here', 'qty' => '', 'rate' => ''),
    array('item' => '', 'desc' => '', 'qty' => '1', 'rate' => ''),
), $items);
ok($e === '' && count($L) === 3 && $L[1]['desc'] === 'Collection & Delivery' && $L[1]['qty'] === 2 && $L[1]['rate'] === 20.0 && $L[2]['rate'] === 0.0 && $L[2]['qty'] === 1,
   'three lines kept (a blank one dropped); a service with no wording takes its name; a 0-price line stays as wording', json_encode(array($L, $e)));
ok(invq_lines_total($L) === 155.0, 'the job\'s price is what the lines come to (£115 + 2 x £20 + £0 = £155)');
ok(invq_lines_clean(array(array('item' => '99', 'desc' => 'x', 'rate' => '5')), $items)[1] === 'bad_item', 'a service not on QuickBooks\' own list is refused');
ok(invq_lines_clean(array(array('desc' => 'x', 'qty' => '0', 'rate' => '5')), $items)[1] === 'bad_qty' && invq_lines_clean(array(array('desc' => 'x', 'qty' => '100', 'rate' => '5')), $items)[1] === 'bad_qty', 'how many: 1 to 99');
ok(invq_lines_clean(array(array('desc' => 'x', 'qty' => '1', 'rate' => '1.2.3')), $items)[1] === 'bad_amount' && invq_lines_clean(array(array('desc' => 'x', 'qty' => '3', 'rate' => '900')), $items)[1] === 'large', 'a nonsense price is refused; over £2,000 in all is "large"');
ok(invq_lines_clean(array(array('desc' => '', 'qty' => '1', 'rate' => '50')), $items)[1] === 'no_desc', 'a priced line needs wording');
$Q = invq_qbo_lines($L, '1174', '20');
ok(count($Q) === 3 && $Q[0]['SalesItemLineDetail']['ItemRef']['value'] === '7' && $Q[1]['Amount'] === 40.0 && $Q[1]['SalesItemLineDetail']['Qty'] === 2 && $Q[1]['SalesItemLineDetail']['UnitPrice'] === 20.0
   && $Q[1]['SalesItemLineDetail']['TaxCodeRef']['value'] === '20' && $Q[2]['DetailType'] === 'DescriptionOnly' && $Q[2]['Description'] === $L[2]['desc'],
   'QuickBooks lines: each on its own service, qty x price, No VAT code; the 0-price loan as wording only', json_encode($Q));
$Q2 = invq_qbo_lines(array(array('item' => '', 'desc' => 'Something', 'qty' => 1, 'rate' => 30)), '1174', '');
ok($Q2[0]['SalesItemLineDetail']['ItemRef']['value'] === '1174' && !isset($Q2[0]['SalesItemLineDetail']['TaxCodeRef']), 'a priced line with no service goes on the default service');
ok(invq_job_row(array('id' => 'L1', 'lines' => $L, 'amount' => 155, 'desc' => $L[0]['desc'], 'email' => 'x@example.com'), null)['lines'] === $L, 'the job row carries its lines back to the portal');
ok(invq_first_name('', 'Mr Tayfun Kaptanoglu') === 'Tayfun' && invq_first_name('Hanna', 'Hanna Knight') === 'Hanna' && invq_first_name('', 'NR Sharland & Co') === 'NR', 'first name for "Dear ...": QuickBooks\' given name, else the display name without Mr/Mrs');
$tpl = array('Subject' => 'Invoice [Invoice No.] from 365 Techies Ltd', 'Message' => "Please find enclosed your invoice [Invoice No.].\r\nReference: [Invoice No.]\r\nhttps://365techies.co.uk/pay/?ref=[Invoice No.]\r\nFrom [Company Name]");
$ef = invq_email_fill($tpl, $mk(900, array('DocNumber' => '4905/900', 'EmailStatus' => 'NotSet', 'Line' => array(
          array('DetailType' => 'SalesItemLineDetail', 'Amount' => 115, 'Description' => 'Repair', 'SalesItemLineDetail' => array('Qty' => 1)),
          array('DetailType' => 'DescriptionOnly', 'Description' => 'Loan of a hard drive'),
          array('DetailType' => 'SubTotalLineDetail', 'Amount' => 115)), 'TotalAmt' => 115, 'Balance' => 115)), '365 Techies Ltd', 'Tayfun');
ok($ef['subject'] === 'Invoice 4905/900 from 365 Techies Ltd' && $ef['greeting'] === 'Dear Tayfun,' && strpos($ef['body'], "Reference: 4905/900\nhttps://365techies.co.uk/pay/?ref=4905/900\nFrom 365 Techies Ltd") !== false && strpos($ef['body'], '[') === false,
   'the email: subject and body with the invoice number and company filled in, "Dear Tayfun,"', json_encode($ef));
ok(count($ef['lines']) === 2 && $ef['lines'][1]['desc'] === 'Loan of a hard drive' && $ef['total'] === 115.0 && $ef['sent'] === false, 'its summary: the invoice\'s own lines (not the subtotal) and total');
ok(invq_email_fill(null, $mk(901), '', '')['have_wording'] === false, 'no wording from QuickBooks -> the preview says so rather than inventing it');
$sj0 = strpos($EP, "if (\$action === 'setjob')"); $sj1 = strpos($EP, "if (\$action === 'hold'");
$setjobBlock2 = ($sj0 !== false && $sj1 > $sj0) ? substr($EP, $sj0, $sj1 - $sj0) : '';
$pq0 = strpos($EP, "if (\$action === 'pcquote')"); $pq1 = strpos($EP, "if (\$action === 'quote')");
$pcqBlock = ($pq0 !== false && $pq1 > $pq0) ? substr($EP, $pq0, $pq1 - $pq0) : '';
$chg0 = strpos($EP, "if (\$action === 'change')"); $chg1 = $chg0 !== false ? strpos($EP, "if (\$action === 'pdf')", $chg0) : false;
$chgBlock = ($chg0 !== false && $chg1 > $chg0) ? substr($EP, $chg0, $chg1 - $chg0) : '';
ok(substr_count($EP, "\$in['lines']") === substr_count($setjobBlock2, "\$in['lines']") + substr_count($pcqBlock, "\$in['lines']") + substr_count($chgBlock, "\$in['lines']") && strpos($chgBlock, "invq_lines_clean(\$in['lines'], invq_items(\$c))") !== false && substr_count($setjobBlock2, "\$in['lines']") > 0 && strpos($setjobBlock2, "invq_lines_clean(\$in['lines'], invq_items(\$c))") !== false,
   'typed lines reach only the job record (setjob), checked against QuickBooks\' own service list');
ok(strpos($SW, "invq_qbo_lines(\$job['lines'], \$c['item'], \$c['tax'])") !== false && substr_count($SW, "invq_qbo_lines(\$job['lines']") === 2, 'the invoice and the estimate are both made from the job\'s lines when it has them');
ok(strpos($EP, "invq_email_preview(\$c, \$id)") !== false && strpos($SW, "'/preferences'") !== false, 'the email preview reads QuickBooks\' own wording; the request names only the invoice');

echo "-- 23 Oct 2026 (later still): what we did, at length, under the service; and a note on the invoice\n";
$t = invq_text("Removed the scam pop-ups\r\nReset Chrome\r\n\r\n\r\n\tChecked for remote apps \x07");
ok($t === "Removed the scam pop-ups\nReset Chrome\n\n Checked for remote apps", 'typed wording keeps its line breaks (one blank line at most); other control characters go', json_encode($t));
ok(strlen(invq_text(str_repeat('a', 1500), INVQ_DESC_MAX)) === 1000 && invq_text('  ') === '', 'at most 1,000 characters; blank is blank');
$items2 = array(array('id' => '7', 'name' => 'Computer Repair', 'desc' => 'Computer repair', 'price' => 115.0),
                array('id' => '1174', 'name' => 'Online Remote Support Services', 'desc' => '', 'price' => 60.0));
$did = "Removed the scam pop-ups\nTook off the remote-access app they put on\nChecked your bank's website is the real one";
list($L2, $e2) = invq_lines_clean(array(array('item' => '1174', 'desc' => $did, 'qty' => '1', 'rate' => '60'),
                                        array('item' => '7', 'desc' => '', 'qty' => '1', 'rate' => '115')), $items2);
ok($e2 === '' && $L2[0]['desc'] === $did && $L2[0]['item'] === '1174' && $L2[1]['desc'] === 'Computer repair', 'a service with what we did under it, line breaks and all; one left empty says the service\'s own wording', json_encode(array($L2, $e2)));
$Q3 = invq_qbo_lines($L2, '1174', '20');
ok($Q3[0]['Description'] === $did && $Q3[0]['SalesItemLineDetail']['ItemRef']['value'] === '1174', 'QuickBooks gets the service and, as its description, what we did');
ok(invq_job_row(array('id' => 'M1', 'memo' => "Thanks for your patience\r\nSee you soon"), null)['memo'] === "Thanks for your patience\nSee you soon" && invq_job_row(array('id' => 'M2'), null)['memo'] === '', 'the job row carries its invoice note back to the portal');
$ef2 = invq_email_fill(null, $mk(902, array('Line' => array(
          array('DetailType' => 'SalesItemLineDetail', 'Amount' => 60, 'Description' => $did, 'SalesItemLineDetail' => array('Qty' => 1, 'ItemRef' => array('value' => '1174', 'name' => 'Online Remote Support Services'))),
          array('DetailType' => 'DescriptionOnly', 'Description' => 'Loan of a hard drive'),
          array('DetailType' => 'SubTotalLineDetail', 'Amount' => 60)), 'CustomerMemo' => array('value' => 'Thanks for your patience'))), '', '');
ok($ef2['lines'][0]['item'] === 'Online Remote Support Services' && $ef2['lines'][0]['desc'] === $did && $ef2['lines'][1]['item'] === '' && $ef2['memo'] === 'Thanks for your patience', 'the preview shows each line\'s service above what was done, and the note on the invoice', json_encode($ef2));
ok(invq_email_fill(null, $mk(903), '', '')['memo'] === '', 'no note on the invoice -> none in the preview');
ok(strpos($SW, "\$inv['CustomerMemo'] = array('value' => invq_text(\$job['memo'], INVQ_MEMO_MAX))") !== false && strpos($SW, "\$est['CustomerMemo'] = array('value' => invq_text(\$job['memo'], INVQ_MEMO_MAX))") !== false,
   'the note goes on the invoice and the estimate as QuickBooks\' "Message on invoice"');
ok(strpos($SW, "\$d['jobs'][\$i]['memo'] = \$memo") !== false && strpos($SW, "\$d['jobs'][\$i]['note'] = \$memo") === false && strpos($SW, "&& \$memo === null && \$discount === null) return array('ok' => false, 'error' => 'nothing_to_set')") !== false,
   'kept on the job as memo, never note (the Slack line a re-poll rewrites); a note alone is something to save');
ok(strpos($EP, "(isset(\$in['memo']) && is_string(\$in['memo'])) ? invq_text(\$in['memo'], INVQ_MEMO_MAX) : null") !== false && strpos($EP, 'invq_job_set($job, $amount, $desc, $who, $item, $email, $lines, $memo, $discount)') !== false,
   'the request\'s note is plain text only, cleaned, and reaches the job through setjob');

echo "-- 23 Oct 2026 (later still): full prices on the lines, then the discount agreed\n";
ok(invq_discount_clean('', 100) === array(null, '') && invq_discount_clean(null, 100) === array(null, '') && invq_discount_clean(array('kind' => 'pct', 'value' => ''), 100) === array(null, ''), 'no discount typed -> none');
list($D1, $e) = invq_discount_clean(array('kind' => 'pct', 'value' => '10%'), 155);
ok($e === '' && $D1 === array('kind' => 'pct', 'value' => 10.0) && invq_discount_amount($D1, 155) === 15.5, '10% off £155 -> £15.50 off', json_encode(array($D1, $e)));
list($D2, $e) = invq_discount_clean(array('kind' => 'total', 'value' => '£80'), 100);
ok($e === '' && $D2 === array('kind' => 'total', 'value' => 80.0) && invq_discount_amount($D2, 100) === 20.0, 'the price agreed: £80 on a full £100 -> £20 off', json_encode(array($D2, $e)));
ok(invq_discount_clean(array('kind' => 'total', 'value' => '100.00'), 100) === array(null, ''), 'an agreed price the same as the full price is no discount');
$badD = 0;
foreach (array(array('pct', '100'), array('pct', '0'), array('pct', '150'), array('total', '120'), array('total', '0'), array('pct', '1.2.3'), array('half', '5')) as $bd)
    if (invq_discount_clean(array('kind' => $bd[0], 'value' => $bd[1]), 100)[1] !== 'bad_discount') $badD++;
ok($badD === 0 && invq_discount_clean('ten', 100)[1] === 'bad_discount' && invq_discount_clean(array('kind' => 'pct', 'value' => '10'), 0)[1] === 'bad_discount',
   'refused: 100% or more, nothing off, an agreed price above the full price, nonsense, an unknown kind, or a discount on lines with no price');
$DL = invq_qbo_discount_line($D2, 100, '20');
ok($DL['DetailType'] === 'DiscountLineDetail' && $DL['Amount'] === 20.0 && $DL['DiscountLineDetail']['PercentBased'] === true && $DL['DiscountLineDetail']['DiscountPercent'] === 20.0 && $DL['DiscountLineDetail']['TaxCodeRef']['value'] === '20',
   '£100 agreed at £80 goes to QuickBooks as "Discount 20%", No VAT code like the lines', json_encode($DL));
$DL2 = invq_qbo_discount_line(array('kind' => 'total', 'value' => 140), 155, '');
ok($DL2['Amount'] === 15.0 && $DL2['DiscountLineDetail'] === array('PercentBased' => false), 'an agreed price that is no whole percentage off goes on as the money off (£155 agreed at £140 -> £15)', json_encode($DL2));
$DL3 = invq_qbo_discount_line($D1, 155, '20');
ok($DL3['DiscountLineDetail']['DiscountPercent'] === 10.0 && $DL3['Amount'] === 15.5, '10% typed goes on as 10% (£15.50)');
ok(invq_qbo_discount_line(null, 100, '20') === null && invq_qbo_discount_line(array(), 100, '20') === null, 'no discount -> no discount line');
$discInv = array(array('DetailType' => 'SalesItemLineDetail', 'Amount' => 100, 'Description' => 'Repair', 'SalesItemLineDetail' => array('Qty' => 1, 'ItemRef' => array('value' => '7', 'name' => 'Computer Repair'))),
                 array('DetailType' => 'SubTotalLineDetail', 'Amount' => 100),
                 array('DetailType' => 'DiscountLineDetail', 'Amount' => 20, 'DiscountLineDetail' => array('PercentBased' => true, 'DiscountPercent' => 20)));
$L3 = invq_lines($mk(904, array('Line' => $discInv, 'TotalAmt' => 80, 'Balance' => 80)));
ok(count($L3) === 2 && $L3[1]['desc'] === 'Discount (20%)' && $L3[1]['amount'] === -20.0, 'the rows show QuickBooks\' discount line as "Discount (20%)", money off', json_encode($L3));
$fl = invq_flags($mk(904, array('Line' => $discInv, 'TotalAmt' => 80, 'Balance' => 80)), 'g@example.com');
ok(!in_array('generic', array_map(function ($f) { return $f['code']; }, $fl), true), 'a discount line never trips the "Work carried out / no description" warning', json_encode($fl));
$ef3 = invq_email_fill(null, $mk(905, array('Line' => $discInv, 'TotalAmt' => 80, 'Balance' => 80)), '', '');
ok($ef3['subtotal'] === 100.0 && $ef3['discount'] === 20.0 && $ef3['discount_pct'] === 20.0 && $ef3['total'] === 80.0 && count($ef3['lines']) === 1, 'the email preview: full price £100, discount 20% (£20), total £80', json_encode($ef3));
ok($ef2['discount'] === 0.0 && $ef2['discount_pct'] === 0.0, 'no discount on the invoice -> none in the preview');
ok(invq_job_row(array('id' => 'D1', 'discount' => array('kind' => 'total', 'value' => 80)), null)['discount'] === array('kind' => 'total', 'value' => 80.0) && invq_job_row(array('id' => 'D2'), null)['discount'] === null, 'the job row carries its discount back to the editor');
ok(substr_count($SW, "invq_qbo_discount_line(isset(\$job['discount']) ? \$job['discount'] : null, invq_lines_total(\$job['lines']), \$c['tax'])") === 2, 'the invoice and the estimate both get the discount line after the full-price lines');
ok(strpos($SW, "round(\$sub - invq_discount_amount(\$disc, \$sub), 2)") !== false, 'the job\'s price is what they pay (so the invoice is found again by its total)');
ok(strpos($EP, "if (\$lines === null) fail('bad_discount');") !== false && strpos($EP, "invq_discount_clean(\$in['discount'], invq_lines_total(\$lines))") !== false, 'a discount is only taken with the lines it comes off, and checked against them');

echo "-- 23 Oct 2026 (later still): Change it - a raised invoice edited before it goes, never one changed in QuickBooks\n";
$ci = $mk(906, array('Line' => $discInv, 'TotalAmt' => 80, 'Balance' => 80, 'SyncToken' => '0', 'CustomerMemo' => array('value' => 'Thanks')));
$fp0 = invq_lines_fp($ci);
ok(strlen($fp0) === 40 && invq_lines_fp($ci) === $fp0, 'an invoice\'s lines and note make one fingerprint');
$ciB = $ci; $ciB['Line'][0]['Description'] = 'Repair and a new fan';
$ciC = $ci; $ciC['Line'][0]['Amount'] = 110;
$ciD = $ci; $ciD['CustomerMemo'] = array('value' => 'Thanks!');
$ciE = $ci; $ciE['Line'][] = array('DetailType' => 'SalesItemLineDetail', 'Amount' => 20, 'Description' => 'Collection', 'SalesItemLineDetail' => array('ItemRef' => array('value' => '9')));
$ciF = $ci; $ciF['Line'][1]['Amount'] = 999; $ciF['SyncToken'] = '3'; $ciF['EmailStatus'] = 'NeedToSend';
ok(invq_lines_fp($ciB) !== $fp0 && invq_lines_fp($ciC) !== $fp0 && invq_lines_fp($ciD) !== $fp0 && invq_lines_fp($ciE) !== $fp0, 'new wording, a new price, a new note or an added line all change it');
ok(invq_lines_fp($ciF) === $fp0, 'QuickBooks\' own subtotal row, its SyncToken and its email status do not');
ok(invq_change_blocked($ci, $fp0) === '', 'unsent, unpaid and as the portal left it -> it can be changed');
ok(invq_change_blocked(array_merge($ci, array('EmailStatus' => 'EmailSent')), $fp0) === 'already_sent', 'sent -> no');
ok(invq_change_blocked(array_merge($ci, array('Balance' => 30)), $fp0) === 'part_paid', 'money paid against it -> no');
ok(invq_change_blocked($ciB, $fp0) === 'changed_in_qbo' && invq_change_blocked($ci, '') === 'changed_in_qbo', 'altered in QuickBooks since, or never written by the portal -> change it in QuickBooks');
$rowU = array('id' => '906', 'state' => 'unsent');
ok(invq_job_row(array('id' => 'C1', 'inv_fp' => $fp0), $rowU)['can_change'] === true && invq_job_row(array('id' => 'C2'), $rowU)['can_change'] === false
   && invq_job_row(array('id' => 'C3', 'inv_fp' => $fp0), array('id' => '906', 'state' => 'sent'))['can_change'] === false, 'the row offers "Change it" only for an unsent invoice the portal wrote');
ok(strpos($SW, "invq_job_link(\$jobId, \$invId, \$url, \$auto ? 'auto' : 'staff', invq_lines_fp(\$res['json']['Invoice']))") !== false, 'raising an invoice keeps its fingerprint on the job');
ok(strpos($chgFn, "\$d['jobs'][\$i]['inv_fp'] = \$fp;") !== false && strpos($chgFn, "\$fp = invq_lines_fp(\$res['json']['Invoice']);") !== false, 'changing it keeps the new one');
ok(strpos($chgFn, "if (\$total > INVQ_MAX_AMOUNT) return array('ok' => false, 'error' => 'large');") !== false && strpos($chgFn, "if (empty(\$c['live'])) return array('ok' => false, 'error' => 'not_live');") !== false && strpos($chgFn, "if (\$c['only'] !== '') return array('ok' => false, 'error' => 'only_key');") !== false,
   'a change is held to the same limits as raising (live only, the test-customer lock, £2,000)');
ok(strpos($chgBlock, "invq_discount_clean(\$in['discount'], invq_lines_total(\$lines))") !== false && strpos($chgBlock, 'invq_change_for_job($c, $job, $who, $lines, $memo, $discount)') !== false && strpos($chgBlock, "\$in['id']") === false,
   'the change request names the job (never an invoice id), its lines and discount checked as for Raise');

echo "-- 23 Oct 2026 (later still): due in 3 days, not whatever QuickBooks' terms make it\n";
ok(INVQ_DUE_DAYS === 3 && invq_due_date(strtotime('2026-10-23 19:57:00 UTC')) === '2026-10-26' && invq_due_date(strtotime('2026-12-30 09:00:00 UTC')) === '2027-01-02', 'raised on 23 Oct -> due 26 Oct (3 days), across the year end too');
ok(strpos($SW, "'BillEmail' => array('Address' => \$email), 'DueDate' => invq_due_date());") !== false, 'a new invoice carries its due date');
ok(strpos($chgFn, "\$upd['DueDate'] = invq_due_date();") !== false, 'Change it moves the due date to 3 days from the change');

echo "\n" . ($fails ? $fails . ' FAILED' : 'all passed') . "\n";
exit($fails ? 1 : 0);
