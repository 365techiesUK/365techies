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

echo "-- a stand-alone Job Out post (what a Workflow Builder 'Job done' form produces)\n";
$OUT = "📤 Job Out / Completed\nCustomer name: Mrs Charlotte Jeffery\nWork carried out: Full service, malware removed, Windows updated\nTime spent: 1.5 hours\nPrice: £60\nInvoiced? (Y/N) N\nFollow-up needed?:\nDate closed: 22/09/2026";
ok(sj_is_out($OUT) && !sj_is_job($OUT), 'recognised as a completion, not a new job');
ok(!sj_is_out($CHARLOTTE), 'a full template with both blocks is a job, never a completion');
$o = sj_parse($OUT);
ok($o['work'] === 'Full service, malware removed, Windows updated' && $o['price'] === 60.0 && $o['time'] === '1.5 hours' && $o['done'] === true, 'work, price, time read from it', json_encode(array($o['work'], $o['price'], $o['time'])));
ok(sj_name_key('Mrs Charlotte Jeffery') === sj_name_key('charlotte Jeffery') && sj_name_key('Mary Freeman-Owen (Henrietta)') === sj_name_key('Mary Freeman Owen'), 'names match across titles, case, hyphens and brackets');
ok(sj_name_key('Gordon Snook') !== sj_name_key('Gordon Snooks'), 'but a different name is different');

echo "-- the Workflow Builder layout (bold label, answer beneath, no 'New Job In' phrase)\n";
// the first real post from the published "New job in" workflow, 22 Sep 2026 14:05, verbatim (note the space before *Issue*)
$WF_TEST = "*Customer name*\ntest\n*Address*\ntest\n*Postcode*\ntest\n*Contact number*\ntest\n*Email*\n<mailto:test@gmail.com|test@gmail.com>\n*Job type*\ntest\n *Issue*\ntest\n*Assigned to*\nsteve\n*Priority*\ntest\n*Price £.*\n0";
$WF_JOAN = "*Customer name*\nJoan Baker\n*Address*\n12 Sea Road\n*Postcode*\nBH5 1AA\n*Contact number*\n07700 900123\n*Email*\n<mailto:joan.baker@example.com|joan.baker@example.com>\n*Job type*\nremote\n*Issue*\nOutlook will not open.\nSays profile corrupt: needs a rebuild\n*Assigned to*\nDavid\n*Priority*\nHigh\n*Price £.*\n60";
$WF_DONE = "*Customer name*\nJoan Baker\n*Email*\n<mailto:joan.baker@example.com|joan.baker@example.com>\n*Work carried out*\nRebuilt the Outlook profile, mail flowing again\n*Time spent*\n45 min\n*Price £.*\n£60\n*Invoiced?*\nN\n*Date closed*\n22/09/2026";
$BOLD_HEAD = "*Gordon Snook*\n📥 New Job In\nCustomer name: Gordon Snook\nContact number: 07517 878204\nEmail: snookg003@gmail.com\nIssue: VPN advice";
ok(sj_is_job($WF_TEST) && !sj_is_out($WF_TEST), 'the workflow post is a job even without the phrase');
$w = sj_parse($WF_TEST);
ok($w['name'] === 'test' && $w['email'] === 'test@gmail.com' && $w['phone'] === '' && $w['addr'] === 'test test', 'fields read from the block layout; "test" is not a phone', json_encode(array($w['name'], $w['email'], $w['phone'], $w['addr'])));
ok($w['desc'] === 'test' && $w['price'] === 0.0 && $w['assigned'] === 'steve' && $w['type'] === '' && $w['priority'] === '' && $w['done'] === false, 'issue -> description, a 0 in the price box is no price, "test" is no type or priority', json_encode(array($w['desc'], $w['price'], $w['assigned'], $w['type'], $w['priority'])));
$wj = sj_job(array('ts' => '1790082345.241299', 'text' => $WF_TEST), 'C0C3VGP1SJC', 1790082400);
ok($wj !== null && $wj['status'] === 'quoted' && $wj['amount'] === 0.0 && $wj['note'] === 'test · steve', 'a job record, waiting for a price', json_encode($wj ? array($wj['status'], $wj['amount'], $wj['note']) : null));
$jb = sj_parse($WF_JOAN);
ok($jb['phone'] === '07700900123' && $jb['addr'] === '12 Sea Road BH5 1AA' && $jb['email'] === 'joan.baker@example.com', 'phone, address + postcode, unwrapped email', json_encode(array($jb['phone'], $jb['addr'], $jb['email'])));
ok($jb['type'] === 'remote' && $jb['type_tail'] === '' && $jb['priority'] === 'high', 'drop-down answers are the type and priority', json_encode(array($jb['type'], $jb['type_tail'], $jb['priority'])));
ok($jb['desc'] === 'Outlook will not open. Says profile corrupt: needs a rebuild' && $jb['price'] === 60.0 && $jb['done'] === false, 'a two-line issue with a colon inside stays one answer; the price box is the price', json_encode(array($jb['desc'], $jb['price'])));
ok(sj_job(array('ts' => '1790082400.1', 'text' => $WF_JOAN), 'C0C3VGP1SJC', 1790082500)['note'] === 'remote · David', 'note reads "remote · David"');
ok($w['kind'] === 'test' && $jb['kind'] === 'remote' && sj_parse($CHARLOTTE)['kind'] === 'Asus prime B60 plus' && $jb['postcode'] === 'BH5 1AA', 'the job type as typed or picked, and the postcode, ride along (QuickBooks service match; customer address)', json_encode(array($w['kind'], $jb['kind'], $jb['postcode'])));
$wjob = sj_job(array('ts' => '1790082400.1', 'text' => $WF_JOAN), 'C0C3VGP1SJC', 1790082500);
ok($wjob['kind'] === 'remote' && $wjob['postcode'] === 'BH5 1AA' && sj_merge(array('id' => $wjob['id'], 'kind' => 'old'), $wjob)['kind'] === 'remote', 'on the job record, and refreshed on a re-poll');
$gj = sj_job(array('ts' => '1789794361.365689', 'text' => $COLIN), 'C0C3VGP1SJC', 1790000000);
$kept = sj_merge(array_merge($gj, array('email' => 'colin.sutton7@ntlworld.com', 'email_by' => 'staff')), $gj);
ok($gj['email'] === '' && $kept['email'] === 'colin.sutton7@ntlworld.com' && $kept['email_by'] === 'staff', 'an email typed in the portal survives a re-poll of a post that has none', json_encode(array($gj['email'], $kept['email'])));
$kept2 = sj_merge(array_merge($gj, array('email' => 'colin.sutton7@ntlworld.com')), $gj);
ok($kept2['email'] === 'colin.sutton7@ntlworld.com', 'an email that came from the thread is kept when a later poll cannot read the thread');
echo "-- what a Job Out post added survives the next re-parse of the parent post (the 'test' job, 22 Sep)\n";
$tj = sj_job(array('ts' => '1790082345.241299', 'text' => $WF_TEST), 'C0C3VGP1SJC', 1790082400);
$after = array_merge($tj, array('status' => 'done', 'out_ts' => '1790085320.751399', 'desc' => 'Rebuilt the profile', 'desc_by' => 'slack_out', 'amount' => 60.0, 'amount_by' => 'slack', 'invoice_doc' => '4905/810', 'invoiced_in_slack' => true));
$re = sj_merge($after, $tj);
ok($re['status'] === 'done' && $re['desc'] === 'Rebuilt the profile' && $re['amount'] === 60.0 && $re['invoice_doc'] === '4905/810' && $re['invoiced_in_slack'] === true, 'done, the work, the price and the invoice number all stay', json_encode(array($re['status'], $re['desc'], $re['amount'], $re['invoice_doc'])));
$re2 = sj_merge(array_merge($tj, array('desc' => 'Full service: updates and clean-up', 'desc_by' => 'item', 'amount' => 65.0, 'amount_by' => 'item', 'item_id' => '1200')), $tj);
ok($re2['desc'] === 'Full service: updates and clean-up' && $re2['amount'] === 65.0 && $re2['amount_by'] === 'item', 'a QuickBooks service pick survives too');
$re3 = sj_merge(array_merge($tj, array('amount' => 45.0, 'amount_by' => 'slack')), array_merge($tj, array('amount' => 80.0, 'amount_by' => 'slack')));
ok($re3['amount'] === 80.0, 'but a price that appears in the post itself is taken');
ok(sj_is_out($WF_DONE) && !sj_is_job($WF_DONE), 'a "Job done" form post is a completion');
$jd = sj_parse($WF_DONE);
ok($jd['work'] === 'Rebuilt the Outlook profile, mail flowing again' && $jd['time'] === '45 min' && $jd['price'] === 60.0 && $jd['closed'] === '22/09/2026' && $jd['invoiced'] === 'none' && $jd['done'] === true, 'work, time, £60 in the box, date closed, N = not invoiced', json_encode(array($jd['work'], $jd['time'], $jd['price'], $jd['closed'], $jd['invoiced'])));
ok(sj_name_key($jd['name']) === sj_name_key($jb['name']), 'and it matches its job by name');
ok(sj_is_job($BOLD_HEAD) && sj_parse($BOLD_HEAD)['name'] === 'Gordon Snook' && sj_parse($BOLD_HEAD)['email'] === 'snookg003@gmail.com', 'a bold NAME heading in a hand-typed post opens no block', json_encode(sj_parse($BOLD_HEAD)['name']));
ok(sj_price_field('60') === 60.0 && sj_price_field('£60.00') === 60.0 && sj_price_field('30/00') === 30.0 && sj_price_field('1,250') === 1250.0, 'the price box: plain, £, pence, slash-pence, thousands');
ok(sj_price_field('0') === 0.0 && sj_price_field('') === 0.0 && sj_price_field('sixty') === 0.0 && sj_price_field('tbc') === 0.0, 'zero, blank or words in the price box = no price');
ok(sj_block_label('*Price £.*') === 'price' && sj_block_label('*Invoiced? (Y/N)*') === 'invoiced' && sj_block_label(' *Issue*') === 'issue' && sj_block_label('*Joan Baker*') === '' && sj_block_label('Customer name: x') === '', 'block labels normalise; unknown bold lines are not labels');

echo "-- a thread under the post: the price and the email typed as replies (Colin, 22 Sep)\n";
$REPLIES = array(
    array('ts' => '1789794361.365689', 'text' => $COLIN),                                  // the parent - never read
    array('ts' => '1789794400.000100', 'text' => 'Email: <mailto:colin.sutton@example.com|colin.sutton@example.com>'),
    array('ts' => '1789794500.000100', 'text' => 'agreed £45 on the phone, other address is second@example.com'),
);
$x = sj_replies_extract($REPLIES, '1789794361.365689');
ok($x['email'] === 'colin.sutton@example.com' && $x['price'] === 45.0, 'first email and first price from the replies, mailto unwrapped', json_encode($x));
ok(sj_replies_extract(array($REPLIES[0]), '1789794361.365689') === array('price' => 0.0, 'email' => ''), 'the parent alone yields nothing (its own £30 is read from the post, not here)');
ok(sj_replies_extract(array(array('ts' => '2.0', 'text' => 'no details yet')), '1.0') === array('price' => 0.0, 'email' => ''), 'a reply with neither gives nothing');
ok(sj_replies_extract(array(array('ts' => '2.0', 'text' => 'test@gmail.com'), array('ts' => '3.0', 'text' => 'other@x.com')), '1.0')['email'] === 'test@gmail.com', 'a bare address in a reply is enough; the first wins');

echo "-- the poller and the cron, at source level\n";
$SW = (string)file_get_contents(__DIR__ . '/pcm-slackjobs-sweep.php');
ok(strpos($SW, '?' . '>') === false, 'no closing tag');
ok(strpos($SW, "'conversations.history'") !== false && strpos($SW, "'conversations.replies'") !== false && !preg_match("/'chat\.postMessage'|'chat\.update'|'chat\.delete'/", $SW), 'reads Slack, never writes to it');
ok(strpos($SW, 'SJ_MIN_GAP') !== false && strpos($SW, 'SJ_MAX_THREADS') !== false, 'polls are rate-limited and thread reads bounded');
ok(strpos($SW, "(\$job['amount'] <= 0 || \$job['email'] === '') && !empty(\$m['reply_count'])") !== false && strpos($SW, "sj_replies_extract(\$r['messages'], \$ts)") !== false, 'a thread is read only when the post left the price or the email blank, and only through the pure extractor');
ok(strpos($SW, "'thread_error' => \$out['thread_error']") !== false && strpos($SW, "sj_log('replies ' . \$ts . ' failed: '") !== false, 'a failed thread read is written to the status file and the log, never swallowed');
ok(strpos($SW, "slk_call_form('conversations.replies'") !== false && strpos($SW, "slk_call('conversations.replies'") === false, 'thread replies are requested form-encoded: Slack answers invalid_arguments to a JSON body (live, 22 Sep)');
ok(strpos($SW, "\$j['desc_by'] = 'slack_out'") !== false, 'a Job Out description is marked as such so the merge keeps it');
$SL = (string)file_get_contents(__DIR__ . '/pcm-slack-lib.php');
ok(strpos($SL, "slk_call_form('conversations.replies'") !== false, 'the portal messaging thread reader uses the form call too');
ok(strpos($SW, "SJ_JOBS . '.lock'") !== false, 'writes the job store under its own lock');
ok(strpos($SW, 'usort($msgs') !== false && strpos($SW, 'sj_apply_out($m, $now)') !== false && strpos($SW, "\$j['out_ts'] = \$ts") !== false, 'completions are applied after the jobs, oldest first, and each one only once');
ok(strpos($SW, "!== 'staff' && \$p['work'] !== ''") !== false && strpos($SW, "!== 'staff' && \$p['price'] > 0") !== false, 'a completion never overwrites a price or description a person typed');
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
