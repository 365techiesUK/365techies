<?php
/**
 * Slack job posts -> job records - test suite.   Run:  php api/pcm-slackjobs-test.php
 * Runs the parser against the REAL posts from #sos-jobs-in-out (19-22 Sep 2026), so the
 * template as David actually types it - not as designed - is what is pinned: mailto/tel
 * wrapping, bold choices, "Invoiced? (Y/N) 4905/799", prices as "£30/00", a name in
 * the "Work carried out" box, "as above". Then the merge rule: a re-poll never
 * overwrites a price or description a person typed, nor an invoice id.
 */
if (PHP_SAPI !== 'cli') { http_response_code(403); exit('cli only'); }
require __DIR__ . '/pcm-slackjobs-lib.php';
$fails = 0;
function ok($cond, $what, $detail = '') { global $fails; echo ($cond ? '  PASS  ' : '  FAIL  ') . $what . ($cond || $detail === '' ? '' : '   [' . $detail . ']') . "\n"; if (!$cond) $fails++; }

$GORDON = ":red_circle:Gordon Snook\n```📥 New Job In  HP 250 G6 Notebook PC · serial CND72726L8\nCustomer name: Gordon Snook\nAddress:\nPostcode:\nContact number: 07517 878204\nEmail: snookg003@gmail.com\nJob type: (remote / on-site / hardware)  \nIssue:\nDate received:\nDate & Start time: 18/09/2026 time ?\nAssigned to:\nPriority: (Low / Medium / High)\n📤 Job Out / Completed\nCustomer name:\nWork carried out: \nTime spent: 2 hours\nInvoiced? (Y/N)No\nFollow-up needed?:\nDate closed:```";
$COLIN = ":red_circle:Colin Sutton\n\n```📞 How to use this\nWhen a customer calls, copy the New Job In block below into a message and fill it in as you talk. When the job is done, reply with the Job Out block.\n📥 New Job In\nCustomer name: Colin Sutton\nAddress:\nPostcode:\nContact number:\nEmail:\nJob type: (remote / on-site / hardware)\n\nIssue:\nDate received:\nAssigned to:\nPriority: (Low / Medium / High)\n\n📤 Job Out / Completed\nCustomer name:\nWork carried out:\nSOS Service 2 £30/00\nTime spent: 2 hours\nInvoiced? (Y/N)N\nFollow-up needed?: Invoice\nDate closed:```";
$CHARLOTTE = ":red_circle:Charlotte Jeffery\n:inbox_tray: New Job In: Make and Model number:question:\nCustomer name: charlotte Jeffery\nAddress:\nPostcode:\nContact number:  07450986062\nEmail: <mailto:charlottejeffery1991@hotmail.com|charlottejeffery1991@hotmail.com>\nJob type: (*remote* / on-site / hardware)  Asus prime B60 plus\nIssue: full Service\nDate received:\nAssigned to:\nPriority: (Low / *Medium* / High)\n:outbox_tray: Job Out / Completed\nCustomer name:\nWork carried out:\nTime spent:\nInvoiced? (Y/N) 4905/799\nFollow-up needed?:\nDate closed:";
$MARY = ":red_circle: Mary Freeman-Owen (Henrietta)\n:inbox_tray: New Job In:   *Mary Freeman Owen DELL3520* · Monday 7 September 2026, 19:00 · DELL3520 · service time: 33 minutes\nCustomer name: Mary Freeman-Owen  *(Henrietta)*\nAddress: 31 Wedgewood Drive , BH14 8ES, Poole, United Kingdom\nPostcode:BH14 8ES\nContact number: <tel:+447879461467|+447879461467>\nEmail: <mailto:maryfreemanowen@hotmail.com|maryfreemanowen@hotmail.com>\nJob type: (*remote* / on-site / hardware)\nIssue: Suspect Scammers\nDate received:\nAssigned to: Steve\nPriority: (Low / Medium / *High*)\n:outbox_tray: Job Out / Completed\nCustomer name: as above\nWork carried out:  Daughter (Henrietta) scammers Hit (full service)\nTime spent: 2 hours\nInvoiced? (Y/N) N\nFollow-up needed?: Invoice\nDate closed:";
$ALEX = ":red_circle:Alex Barnes\n:inbox_tray: New Job In\nCustomer name: Alex Barnes\nAddress: Flat 16. Walton Court. Montrose Drive. Vwrwood.\nPostcode: BH31 6AE\nContact number: 07841562388\nEmail: <mailto:barnes_710@hotmail.com|barnes_710@hotmail.com>\nJob type: (remote / on-site / *hardware*)\nIssue: 3D Pickup/ Unit in\nDate received:\nAssigned to: Steve\nPriority: (Low / *Medium* / High)\n:outbox_tray: Job Out / Completed\nCustomer name:\nWork carried out:  Steve\nTime spent:\nInvoiced? (Y/N) N\nFollow-up needed?:\nDate closed:";
$HOWTO = "```📞 How to use this\nWhen a customer calls, copy the New Job In block below into a message and fill it in as you talk. When the job is done, reply with the Job Out block.\n📥 New Job In\nCustomer name: Sarah\nAddress:\nPostcode:\nContact number:07748960003\nEmail:\nJob type: (remote / on-site / hardware)\nIssue:\nDate received: She is phoning us back Monday pm\nAssigned to:\nPriority: (Low / Medium / High)\n📤 Job Out / Completed\nCustomer name:\nWork carried out:\nTime spent:\nInvoiced? (Y/N)\nFollow-up needed?:\nDate closed:```";

echo "-- Gordon: a post with a phone and email but no price and nothing done\n";
$g = sj_parse($GORDON);
ok($g['name'] === 'Gordon Snook' && $g['email'] === 'snookg003@gmail.com' && $g['phone'] === '07517878204', 'name, email, phone (spaces stripped)', json_encode(array($g['name'], $g['email'], $g['phone'])));
ok($g['price'] === 0.0 && $g['invoiced'] === 'none', 'no price is not a price; "No" is not invoiced', json_encode(array($g['price'], $g['invoiced'])));
ok($g['done'] === true && $g['time'] === '2 hours', 'time spent counts as done');
ok($g['desc'] === '', 'no work, no issue = no description to invoice with', $g['desc']);

echo "-- Colin: the price is in free text as £30/00\n";
$c = sj_parse($COLIN);
ok($c['name'] === 'Colin Sutton' && $c['price'] === 30.0, '"£30/00" is £30.00', json_encode(array($c['name'], $c['price'])));
ok($c['email'] === '' && $c['phone'] === '', 'blank contact fields stay blank');
ok($c['done'] === true, 'time spent = done');

echo "-- Charlotte: Slack-wrapped email, bold choices, an invoice number in Invoiced?\n";
$ch = sj_parse($CHARLOTTE);
ok($ch['email'] === 'charlottejeffery1991@hotmail.com' && $ch['phone'] === '07450986062', '<mailto:..|..> unwrapped, phone kept', $ch['email']);
ok($ch['type'] === 'remote' && $ch['type_tail'] === 'Asus prime B60 plus' && $ch['priority'] === 'medium', 'bold choice read, trailing text kept', json_encode(array($ch['type'], $ch['type_tail'], $ch['priority'])));
ok($ch['invoiced'] === 'number' && $ch['invoice_doc'] === '4905/799', 'an invoice number in the Invoiced box is recognised', json_encode(array($ch['invoiced'], $ch['invoice_doc'])));
ok($ch['desc'] === 'full Service' && $ch['done'] === false, 'issue becomes the description; nothing in Job Out = not done');

echo "-- Mary: tel: wrapping, +44, a full address, 'as above', work carried out\n";
$m = sj_parse($MARY);
ok($m['phone'] === '07879461467', '+44 becomes 0', $m['phone']);
ok($m['name'] === 'Mary Freeman-Owen (Henrietta)', 'name keeps the bracket, loses the bold', $m['name']);
ok(strpos($m['addr'], '31 Wedgewood Drive') === 0 && strpos($m['addr'], 'BH14 8ES') !== false, 'address + postcode', $m['addr']);
ok($m['work'] === 'Daughter (Henrietta) scammers Hit (full service)' && $m['desc'] === $m['work'] && $m['done'] === true, 'work carried out wins as the description');
ok($m['priority'] === 'high' && $m['assigned'] === 'Steve', 'priority and assignee');

echo "-- Alex: a name in the Work carried out box is who did it, not what\n";
$a = sj_parse($ALEX);
ok($a['work'] === '' && $a['desc'] === '3D Pickup/ Unit in' && $a['type'] === 'hardware', 'falls back to the issue', json_encode(array($a['work'], $a['desc'], $a['type'])));
ok($a['addr'] === 'Flat 16. Walton Court. Montrose Drive. Vwrwood. BH31 6AE', 'address as typed, typos and all', $a['addr']);

echo "-- what is and is not a job\n";
ok(sj_is_job($GORDON) && sj_is_job($HOWTO), 'the template (even the how-to copy with a name in it) is a job post');
ok(!sj_is_job('QuickBooks list of customers that need attention') && !sj_is_job(''), 'other messages are not');
$h = sj_parse($HOWTO);
ok($h['name'] === 'Sarah' && $h['phone'] === '07748960003' && $h['done'] === false, 'a half-filled template still yields a job', json_encode(array($h['name'], $h['phone'])));

echo "-- prices\n";
ok(sj_price('agreed £60 on the phone') === 60.0 && sj_price('£745.98 outstanding') === 745.98 && sj_price('£1,250') === 1250.0, 'plain, pence, thousands');
ok(sj_price('no money mentioned') === 0.0 && sj_price('£0') === 0.0, 'nothing or zero is nothing');
ok(sj_price('£85 then later £120') === 85.0, 'the first amount is taken (a person checks before anything is sent)');

echo "-- the job record and the merge rule\n";
$msg = array('ts' => '1789794361.365689', 'text' => $GORDON, 'reply_count' => 0);
$j = sj_job($msg, 'C0C3VGP1SJC', 1790000000);
ok($j['id'] === '1789794361-365689' && $j['ts'] === 1789794361 && $j['via'] === 'slack' && $j['status'] === 'done', 'id from the Slack ts, dated by it', json_encode(array($j['id'], $j['ts'], $j['status'])));
ok($j['amount'] === 0.0 && $j['amount_by'] === '' && $j['invoice_no'] === '', 'arrives unpriced and uninvoiced');
ok(sj_job(array('ts' => '1.2', 'text' => 'hello'), 'C1') === null, 'a non-job message yields nothing');
$old = array_merge($j, array('amount' => 60.0, 'amount_by' => 'staff', 'desc' => 'Laptop service', 'desc_by' => 'staff', 'invoice_no' => '412', 'invoice_url' => 'u'));
$fresh = sj_job(array('ts' => '1789794361.365689', 'text' => str_replace('Time spent: 2 hours', 'Time spent: 3 hours', $GORDON), 'reply_count' => 2), 'C0C3VGP1SJC', 1790000100);
$mg = sj_merge($old, $fresh);
ok($mg['amount'] === 60.0 && $mg['amount_by'] === 'staff' && $mg['desc'] === 'Laptop service' && $mg['invoice_no'] === '412', 'a re-poll keeps the price, description and invoice a person set');
ok($mg['note'] !== $old['note'] && $mg['slack']['replies'] === 2, 'but takes the fresh Slack details');
$mg2 = sj_merge(array_merge($j, array('amount' => 0.0, 'amount_by' => '')), array_merge($fresh, array('amount' => 45.0, 'amount_by' => 'slack')));
ok($mg2['amount'] === 45.0, 'a price that appears in Slack later is picked up when nobody typed one');

echo "-- the poller and the cron, at source level\n";
$SW = (string)file_get_contents(__DIR__ . '/pcm-slackjobs-sweep.php');
ok(strpos($SW, '?' . '>') === false, 'no closing tag');
ok(strpos($SW, "'conversations.history'") !== false && strpos($SW, "'conversations.replies'") !== false && !preg_match("/'chat\.postMessage'|'chat\.update'|'chat\.delete'/", $SW), 'reads Slack, never writes to it');
ok(strpos($SW, 'SJ_MIN_GAP') !== false && strpos($SW, 'SJ_MAX_THREADS') !== false, 'polls are rate-limited and thread reads bounded');
ok(strpos($SW, "SJ_JOBS . '.lock'") !== false, 'writes the job store under its own lock');
$CR = (string)file_get_contents(__DIR__ . '/tm-cron.php');
ok(strpos($CR, 'sj_poll()') !== false && strpos($CR, 'sj_poll()') < strpos($CR, 'invq_morning()') && strpos($CR, 'sj_poll()') < strpos($CR, 'if (!tm_configured())'), 'the poll runs before the invoice sweep, above the SMS gate');
$ht = (string)file_get_contents(__DIR__ . '/../.htaccess');
$deny = preg_match('/<FilesMatch "(\^\([^"]*pcm-slackjobs[^"]*)">/', $ht, $m2) ? $m2[1] : '';
ok($deny !== '', 'a deny rule exists');
foreach (array('pcm-slackjobs-lib.php', 'pcm-slackjobs-sweep.php', 'pcm-slackjobs-test.php', 'pcm-slackjobs-status.json', 'pcm-slackjobs.log') as $f)
    ok($deny !== '' && preg_match('#' . $deny . '#', $f) === 1, 'denied: ' . $f);
$gi = (string)file_get_contents(__DIR__ . '/../.gitignore');
ok(strpos($gi, 'api/pcm-slackjobs-status.json') !== false && strpos($gi, 'api/pcm-slackjobs.log') !== false, 'status and log are gitignored');

echo "\n" . ($fails ? $fails . ' FAILED' : 'all passed') . "\n";
exit($fails ? 1 : 0);
