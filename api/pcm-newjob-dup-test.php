<?php
/* pcm-newjob-dup-test.php - the "same job?" check before a New job card is posted (13 Nov 2026).
   Run on the CLI only:  php api/pcm-newjob-dup-test.php   Pure: the job list is passed in, nothing is posted or saved. */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once __DIR__ . '/pcm-slackjobs-lib.php';
require_once __DIR__ . '/pcm-newjob-lib.php';
$pass = 0; $fail = 0;
function ok($c, $what, $got = '') { global $pass, $fail; if ($c) { $pass++; echo "  PASS  $what\n"; } else { $fail++; echo "  FAIL  $what" . ($got !== '' ? "  [$got]" : '') . "\n"; } }

$NOW = 1794572400;   // Fri 13 Nov 2026 12:20 GMT
$JOBS = array(
    array('id' => 'A', 'ts' => $NOW - 900, 'name' => 'Neil Rodgers', 'email' => 'Neil.Rodgers@hotmail.co.uk', 'desc' => 'Printer issues: scanning documents.', 'amount' => 60, 'status' => 'quoted'),
    array('id' => 'B', 'ts' => $NOW - 500, 'name' => 'Neil Rodgers', 'email' => 'neil.rodgers@hotmail.co.uk', 'desc' => 'Job completed.', 'amount' => 0, 'status' => 'quoted'),
    array('id' => 'C', 'ts' => $NOW - 3 * 86400, 'name' => 'Neil Rodgers', 'email' => 'neil.rodgers@hotmail.co.uk', 'desc' => 'Hidden one', 'amount' => 20, 'status' => 'dismissed'),
    array('id' => 'D', 'ts' => $NOW - 2 * 86400, 'name' => 'Neil Rodgers', 'email' => 'neil.rodgers@hotmail.co.uk', 'desc' => 'Invoiced one', 'amount' => 60, 'status' => 'done', 'invoice_no' => '12898'),
    array('id' => 'E', 'ts' => $NOW - 9 * 86400, 'name' => 'Neil Rodgers', 'email' => 'neil.rodgers@hotmail.co.uk', 'desc' => 'Nine days ago', 'amount' => 60, 'status' => 'quoted'),
    array('id' => 'F', 'ts' => $NOW - 600, 'name' => 'Graham Williams', 'email' => 'someone@else.example', 'desc' => 'Another customer', 'amount' => 60, 'status' => 'quoted'),
    array('id' => 'G', 'ts' => $NOW - 700, 'name' => 'jean  pritchard', 'email' => '', 'desc' => 'No email on the job', 'amount' => 30, 'status' => 'quoted'),
);
$V = array('name' => 'Neil Rodgers', 'email' => 'neil.rodgers@hotmail.co.uk');

echo "A  which jobs count as the same customer's open job\n";
$d = nj_open_jobs($V, $NOW, $JOBS);
ok(count($d) === 2 && $d[0]['id'] === 'B' && $d[1]['id'] === 'A', 'the two open write-ups, newest first; hidden, invoiced and week-old ones left out', json_encode(array_column($d, 'id')));
ok($d[1]['amount'] === 60.0 && $d[1]['when'] === 'today 12:05' && $d[1]['desc'] === 'Printer issues: scanning documents.', 'each says when, how much and what', json_encode($d[1]));
ok(nj_open_jobs(array('name' => 'Somebody New', 'email' => 'new@person.example'), $NOW, $JOBS) === array(), 'a new customer: nothing to ask');
ok(count(nj_open_jobs(array('name' => 'Jean Pritchard', 'email' => ''), $NOW, $JOBS)) === 1, 'no email on either side: the name decides, case and spacing ignored');
ok(nj_open_jobs(array('name' => 'Neil Rodgers', 'email' => 'different@address.example'), $NOW, $JOBS) === array(), 'same name but both have emails and they differ: not the same person');

echo "B  nj_create asks before posting\n";
$posted = 0; $post = function ($a) use (&$posted) { $posted++; return array('ok' => true, 'ts' => '1794572400.000100'); };
$save = function ($j) { return true; };
$FORM = array('name' => 'Neil Rodgers', 'email' => 'neil.rodgers@hotmail.co.uk', 'issue' => 'Remote Support Session', 'price' => '60');
$r = nj_create($FORM, 'David', '', array(), $NOW, $post, $save, $JOBS);
ok(empty($r['ok']) && $r['error'] === 'dup' && count($r['dups']) === 2 && $posted === 0, 'an open job this week: nothing is posted, the two are handed back', json_encode(array($r['error'], $posted)));
$r = nj_create($FORM + array('force' => 1), 'David', '', array(), $NOW, $post, $save, $JOBS);
ok(!empty($r['ok']) && $posted === 1, 'force (a different job): it goes in');
$r = nj_create($FORM + array('replace' => 'A,B'), 'David', '', array(), $NOW, $post, $save, $JOBS);
ok(!empty($r['ok']) && $posted === 2 && $r['replaced'] === 0, 'replace (the same job): the new write-up goes in (hiding is skipped under a test save)');
$r = nj_create(array('name' => 'Somebody New', 'email' => 'new@person.example', 'issue' => 'x'), 'David', '', array(), $NOW, $post, $save, $JOBS);
ok(!empty($r['ok']) && $posted === 3, 'a customer with no open job is never asked');
ok(nj_when($NOW - 86400, $NOW) === 'Thu 12 Nov 12:20', 'yesterday reads as a day and a time', nj_when($NOW - 86400, $NOW));

echo "\n$pass passed, $fail failed\n";
exit($fail ? 1 : 0);
