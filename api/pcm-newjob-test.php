<?php
/*
 * "New customer" from the portal (pcm-newjob-lib.php, 2 Oct 2026). Run:
 *   C:\tools\php\php.exe -d extension=mbstring api/pcm-newjob-test.php
 * Pure checks: Slack and the job store are injected, so nothing is posted and pcm-jobs.json is never opened.
 */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
error_reporting(E_ALL);
require __DIR__ . '/pcm-newjob-lib.php';

$fails = 0;
function ok($c, $what, $detail = '') { global $fails; echo ($c ? "  PASS  " : "  FAIL  ") . $what . ($c ? '' : "  [" . $detail . "]") . "\n"; if (!$c) $fails++; }

echo "A  the card is the Slack form's card, byte for byte\n";
// the same card pinned in pcm-slackjobs-test.php ($BOTCARD) and slack-jobs-worker.test.mjs (CARD)
$BOTCARD = ":inbox_tray: *New job in*\n*Customer name*\nDavina Gahan\n*Address*\n8 Copsewood Avenue, Bournemouth\n*Postcode*\nBH8 9NG\n*Contact number*\n01202 123456\n*Mobile phone*\n07584168898\n*Email*\ndavinagahn@hotmail.com\n*Website address*\nwww.davinagahan.co.uk\n*Job type*\nRemote\n*Issue*\nMS 365 Lost password. Waiting for reply from MS to restore the password\n*Assigned to*\nSteve\n*Priority*\nMedium\n*Price £.*\n60";
$SJT = (string)file_get_contents(__DIR__ . '/pcm-slackjobs-test.php');
ok(strpos($SJT, '$BOTCARD = ' . var_export($BOTCARD, true)) !== false || strpos($SJT, '$BOTCARD = "' . str_replace("\n", '\n', $BOTCARD) . '";') !== false,
    'this is the same pinned card as the Slack jobs reader\'s tests');
$DAV = array('name' => 'Davina Gahan', 'address' => '8 Copsewood Avenue, Bournemouth', 'postcode' => 'BH8 9NG', 'phone' => '01202 123456',
    'mobile' => '07584168898', 'email' => 'davinagahn@hotmail.com', 'website' => 'www.davinagahan.co.uk', 'jobtype' => 'Remote',
    'issue' => 'MS 365 Lost password. Waiting for reply from MS to restore the password', 'assigned' => 'Steve', 'priority' => 'Medium', 'price' => '60');
ok(nj_card_text(nj_read($DAV)) === $BOTCARD, 'the portal writes exactly the card the Slack form writes', json_encode(nj_card_text(nj_read($DAV))));
$WK = (string)file_get_contents(__DIR__ . '/../slack-jobs-worker.js');
$labels = array(); foreach (nj_fields() as $f) $labels[] = '["' . $f[0] . '", "' . $f[1] . '"]';
ok(preg_match_all('/\["(\w+)", "([^"]+)"\]/', substr($WK, strpos($WK, 'const FIELDS'), 700), $mm) && implode(',', array_map(function ($a, $b) { return $a . '=' . $b; }, $mm[1], $mm[2]))
    === implode(',', array_map(function ($f) { return $f[0] . '=' . $f[1]; }, nj_fields())), 'same boxes, same labels, same order as the Worker\'s FIELDS', json_encode($mm));

echo "B  reading the form\n";
$r = nj_read(array('name' => "  Joan\nBaker ", 'price' => "\xC2\xA345.50", 'website' => 'https://www.joan.example/', 'jobtype' => 'on-site', 'priority' => 'urgent',
    'issue' => "Line one\r\nLine two", 'mobile' => '07700 900123', 'bogus' => 'x'));
ok($r['name'] === 'Joan Baker', 'a newline in a one-line box becomes a space', $r['name']);
ok($r['price'] === '45.50' && $r['website'] === 'www.joan.example', 'the pound sign off the price; https:// and the slash off the website', json_encode(array($r['price'], $r['website'])));
ok($r['jobtype'] === 'On-site' && $r['priority'] === '', 'drop-downs held to their options (On-site; "urgent" is not one)', json_encode(array($r['jobtype'], $r['priority'])));
ok($r['issue'] === "Line one\nLine two" && !isset($r['bogus']), 'the issue keeps its lines; unknown boxes are ignored');
ok(mb_strlen(nj_read(array('name' => str_repeat('a', 400)))['name']) === 200 && mb_strlen(nj_read(array('issue' => str_repeat('b', 3000)))['issue']) === 1500, 'boxes are capped (200; the issue 1500)');
ok(nj_clean('*Bold* name') === 'Bold name' && nj_clean("a\x07b") === 'a b', 'asterisks and control characters come out (an asterisk line would read as a label)');

echo "C  the checks (the Worker's own wording)\n";
ok(nj_validate(nj_read(array()))['name'] === "Please put the customer's name.", 'the name is the one box that must be filled');
ok(isset(nj_validate(nj_read(array('name' => 'A', 'email' => 'not-an-email')))['email']), 'a bad email is caught');
ok(isset(nj_validate(nj_read(array('name' => 'A', 'price' => '60 quid')))['price']) && !nj_validate(nj_read(array('name' => 'A', 'price' => "\xC2\xA360"))), 'a price is just a number (a pound sign is fine)');
ok(isset(nj_validate(nj_read(array('name' => 'A', 'website' => 'my site')))['website']) && !nj_validate(nj_read(array('name' => 'A', 'website' => 'https://shop.example.co.uk/'))), 'a website must look like one');
ok(!nj_validate(nj_read(array('name' => 'Just A Name'))), 'a name alone is enough, as in Slack');

echo "D  the card reads back as the job the Slack reader makes\n";
$v = nj_read(array('name' => 'Mark Lemon', 'mobile' => '07912 084903', 'phone' => '', 'email' => 'mark@example.com', 'jobtype' => 'Remote',
    'issue' => "Left a voicemail Today 09:12\nWants his printer back on the WiFi", 'assigned' => 'Steve', 'priority' => 'High', 'price' => '60', 'postcode' => 'BH1 1AA', 'address' => '1 High St'));
$j = sj_job(array('ts' => '1791000000.000100', 'text' => nj_card_text($v)), SJ_DEFAULT_CHANNEL, 1791000100);
ok($j && $j['name'] === 'Mark Lemon' && $j['mobile'] === '07912084903' && $j['email'] === 'mark@example.com' && $j['amount'] === 60.0 && $j['addr'] === '1 High St BH1 1AA',
    'name, mobile, email, price and address come back', json_encode($j));
ok($j && $j['status'] === 'quoted' && strpos($j['desc'], 'Left a voicemail') === 0 && strpos($j['note'], 'Steve') !== false, 'a quoted job; the issue is its description; assigned in the note', json_encode(array($j['status'], $j['desc'], $j['note'])));
ok(sj_is_job(nj_card_text(nj_read(array('name' => 'Only A Name')))) && !sj_is_out(nj_card_text(nj_read(array('name' => 'Only A Name')))), 'a card with only a name is still a job, never a completion');

echo "E  posting and saving (Slack and the store injected)\n";
$posted = null; $savedJob = null;
$post = function ($a) use (&$posted) { $posted = $a; return array('ok' => true, 'ts' => '1791000200.000300'); };
$save = function ($job) use (&$savedJob) { $savedJob = $job; return true; };
$res = nj_create($DAV, 'Steve', 'a text from 07584 168898', array('comms' => 'CM-ABC'), 1791000250, $post, $save);
ok($res['ok'] && $res['slack'] && $res['saved'] && $res['id'] === sj_job_id('1791000200.000300'), 'posted, then saved under the id the reader gives that post (so the next poll merges, not duplicates)', json_encode($res));
ok($posted['channel'] === 'C0C3VGP1SJC' && $posted['text'] === $BOTCARD, 'to #sos-jobs-in-out, and the text (what the reader parses) is the plain card');
ok($posted['blocks'][0]['text']['text'] === $BOTCARD && $posted['blocks'][1]['type'] === 'context' && $posted['blocks'][1]['elements'][0]['text'] === 'Added in the staff portal by Steve - from a text from 07584 168898',
    'the card, then a context line saying who added it and from what', json_encode($posted['blocks'][1]));
ok(count($posted['blocks']) === 2, 'no Edit button until the Worker that answers it is live (a button that errors is worse than none)');
ok($savedJob['by'] === 'Steve (portal)' && $savedJob['comms'] === 'CM-ABC' && $savedJob['via'] === 'slack' && $savedJob['slack']['ts'] === '1791000200.000300', 'the job says who made it and which message it came from', json_encode($savedJob));
$res2 = nj_create($DAV, 'David', '', array(), 1791000300, function ($a) { return array('ok' => false, 'error' => 'not_in_channel'); }, $save);
ok($res2['ok'] && !$res2['slack'] && $res2['saved'] && $res2['slack_error'] === 'not_in_channel' && strpos($res2['id'], 'P-') === 0 && $savedJob['via'] === 'portal' && !isset($savedJob['slack']),
    'Slack refuses: the job is STILL saved (P- id, via portal) and the answer says why', json_encode($res2));
$res3 = nj_create(array('name' => ''), 'Steve', '', array(), null, function () { throw new Exception('must not post'); }, $save);
ok(!$res3['ok'] && $res3['errors']['name'] === "Please put the customer's name.", 'nothing is posted when a box is wrong; the error names the box');
$res4 = nj_create($DAV, 'Steve', '', array(), 1791000400, function () { return null; }, function () { return false; });
ok(!$res4['ok'] && $res4['error'] !== '', 'neither Slack nor the store took it: a plain error, not a false success');

echo "F  at source level\n";
$L = (string)file_get_contents(__DIR__ . '/pcm-newjob-lib.php');
ok(strpos($L, '?' . '>') === false, 'no closing tag in the library');
$A = (string)file_get_contents(__DIR__ . '/comms-api.php');
ok(strpos($A, "\$do === 'newjob'") !== false && strpos($A, "nj_create((array)(\$in['v'] ?? array())") !== false, 'the portal API takes do=newjob');
ok(strpos($A, "comms_add_note(\$fromIt['id'], 'Made a customer record: '") !== false, 'made from a message: that message\'s Slack thread is told');
ok(strpos($A, 'vis_staff_ok($in, __DIR__)') < strpos($A, "\$do === 'newjob'"), 'staff only: the session check comes first');
$HT = (string)file_get_contents(__DIR__ . '/../.htaccess');
ok(preg_match('/<FilesMatch "\^\(pcm-newjob-\(lib\|test\)\\\\\.php\|comms-leads-test\\\\\.php\)\$">\s*Require all denied/', $HT) === 1, 'the library and the tests are denied over HTTP');

echo "\n" . ($fails ? "pcm-newjob-test: $fails FAILED\n" : "pcm-newjob-test: all passed\n");
exit($fails ? 1 : 0);
