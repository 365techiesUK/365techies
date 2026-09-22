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
