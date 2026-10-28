<?php
/**
 * The customer-email changes of 27 Oct 2026 - test suite.   Run:  php api/pcm-email1027-test.php
 *
 * CLI-only, a throwaway queue, every $*_LIVE switch forced off: it can never send. Pins what the email review
 * changed so nobody is bombarded: the booking-email decisions (cf_decide), the calendar file travelling WITH the
 * designed HTML (rv_mime), the new HTML booking and reminder emails, the sign-off (David and Steve only), the
 * reminder trial (rm 'shadow'), every upcoming booking seeded for the reminder without waking anything else
 * (rv_seed), and the service report: one per computer per day, and a household's computers in one email.
 */
if (PHP_SAPI !== 'cli') { http_response_code(403); exit('cli only'); }

$RV_TMPQ = sys_get_temp_dir() . '/email1027-test-queue-' . getmypid() . '.json';
register_shutdown_function(function () { global $RV_TMPQ; @unlink($RV_TMPQ); @unlink($RV_TMPQ . '.lock'); });

define('RV_LIB', 1);
define('RV_ANY_HOUR', 1);   // the senders' 09:00-20:00 guard, off for this run
require __DIR__ . '/pcm-review.php';
$RV_Q = $RV_TMPQ;
$RV_LIVE = false; $DN_LIVE = false; $BF_LIVE = false; $CF_LIVE = false; $RM_LIVE = false; $SR_LIVE = false;   // HARD SAFETY
$RM_SHADOW = true;
$SR_LIVE_SINCE = time() - 3600;

$fails = 0;
function ok($cond, $what, $detail = '') {
    global $fails;
    echo ($cond ? '  PASS  ' : '  FAIL  ') . $what . ($cond || $detail === '' ? '' : '   [' . $detail . ']') . "\n";
    if (!$cond) $fails++;
}
function q() { global $RV_Q; return json_decode((string)file_get_contents($RV_Q), true); }
function qput($fn) { list($lk, $q) = rvq_open(); $q = $fn($q); rvq_save($q); rvq_close($lk); }
function fresh() { global $RV_Q; @unlink($RV_Q); @unlink($RV_Q . '.lock'); }

$NOW = time();

echo "-- cf_decide: which booking webhook earns an email\n";
$T = $NOW + 3 * 86400;
list($a, $cf) = cf_decide(array(), 'confirm', $T, null, $NOW);
ok($a === 'send' && $cf['cr'] === $NOW && $cf['h'] === $T, 'a new booking: "Booked" goes, and is remembered');
list($a) = cf_decide($cf, 'confirm', $T, null, $NOW + 5);
ok($a === 'none', '... and a retried webhook does not send it twice');
list($a) = cf_decide($cf, 'change', $T, $T, $NOW + 60);
ok($a === 'none', 'an edit in SimplyBook that does not move the time: nothing (was "New time" on any edit)');
list($a, $cf2) = cf_decide($cf, 'change', $T + 3600, $T, $NOW + 60);
ok($a === 'send' && $cf2['h'] === $T + 3600, 'a real move: "New time" goes, and the new time is remembered');
list($a) = cf_decide($cf2, 'change', $T + 3600, $T + 3600, $NOW + 90);
ok($a === 'none', '... once');
list($a, $c3) = cf_decide(array(), 'change', $T, null, $NOW);
ok($a === 'silent' && isset($c3['cr']), 'a change to a booking we never saw (old series): adopted quietly, no "Booked"');
list($a) = cf_decide(array(), 'change', $T, $T, $NOW);
ok($a === 'silent', 'a change to a booking we knew but never confirmed, same time: quiet');
list($a) = cf_decide(array(), 'change', $T + 7200, $T, $NOW);
ok($a === 'send', 'a booking we knew but never confirmed, really moved: "New time" goes');
list($a, $c4) = cf_decide(array(), 'confirm', $NOW - 2640, null, $NOW);
ok($a === 'silent' && isset($c4['cr']), 'a visit that has already started: no "Booked" (the 10:44 email for a 10:00 visit)');
list($a) = cf_decide($cf, 'change', $NOW - 60, $T, $NOW);
ok($a === 'silent', 'moved to a time already passed: no email');
list($a, $c5) = cf_decide($cf, 'cancel', $T, $T, $NOW);
ok($a === 'send' && isset($c5['ca']), 'a cancellation goes');
list($a) = cf_decide($c5, 'cancel', $T, $T, $NOW + 3);
ok($a === 'none', '... once');
list($a) = cf_decide('junk', 'confirm', $T, null, $NOW);
ok($a === 'send', 'a mangled cf mark reads as none');

echo "-- rv_mime: the calendar file travels with the designed email\n";
$H = '<html><body><p>Hi &amp; hello</p></body></html>';
$ICS = "BEGIN:VCALENDAR\r\nEND:VCALENDAR";
list($ct, $pl) = rv_mime("plain words\r\n", 'visit.ics', $ICS, $H);
ok(strpos($ct, 'multipart/mixed') !== false, 'calendar + HTML: multipart/mixed outside');
$pAlt = strpos($pl, 'multipart/alternative'); $pTxt = strpos($pl, 'text/plain'); $pHtm = strpos($pl, 'text/html'); $pCal = strpos($pl, 'text/calendar');
ok($pAlt !== false && $pTxt !== false && $pHtm !== false && $pCal !== false, '... holding an alternative (text + HTML) and the calendar file');
ok($pAlt < $pTxt && $pTxt < $pHtm && $pHtm < $pCal, '... in that order: text first, HTML second, then the attachment');
preg_match('/boundary="([^"]+)"/', $ct, $m1); preg_match('/multipart\/alternative; boundary="([^"]+)"/', $pl, $m2);
ok(!empty($m1[1]) && !empty($m2[1]) && $m1[1] !== $m2[1], '... two different boundaries');
ok(substr_count($pl, '--' . $m2[1] . '--') === 1 && substr_count($pl, '--' . $m1[1] . '--') === 1, '... each closed exactly once');
preg_match('/Content-Transfer-Encoding: base64\r\n\r\n(.*?)--' . preg_quote($m2[1], '/') . '--/s', $pl, $b64);
ok(isset($b64[1]) && base64_decode(preg_replace('/\s+/', '', $b64[1])) === $H, '... and the HTML decodes back exactly');
ok(strpos($pl, 'filename="visit.ics"') !== false && strpos($pl, $ICS) !== false, '... the calendar is an attachment named as given');
list($ct, $pl) = rv_mime("plain\r\n", '', '', $H);
ok(strpos($ct, 'multipart/alternative') !== false && strpos($pl, 'text/calendar') === false, 'HTML alone: alternative, no calendar (every other email, unchanged)');
list($ct, $pl) = rv_mime("plain\r\n", 'v.ics', $ICS, '');
ok(strpos($ct, 'multipart/mixed') !== false && strpos($pl, 'text/html') === false && strpos($pl, 'text/calendar') !== false, 'calendar alone: as before');
list($ct, $pl) = rv_mime("just text", '', '', '');
ok(strpos($ct, 'text/plain') !== false && $pl === 'just text', 'text alone: as before');

echo "-- the booking and reminder emails, in the house design\n";
$evil = '<b>Al</b>';
foreach (array('confirm' => "You're booked in", 'change' => 'Your booking has a new time', 'cancel' => 'Your booking is cancelled') as $k => $head) {
    $h = cf_body_html($k, $evil, 'Full <i>Computer</i> Service', $T, 'AB12');
    ok(strpos($h, rv_h($head)) !== false || strpos($h, $head) !== false, $k . ': heading "' . $head . '"');
    ok(strpos($h, '<b>Al</b>') === false && strpos($h, '&lt;b&gt;Al') !== false, $k . ': the name is escaped');
    ok(strpos($h, '<i>Computer</i>') === false, $k . ': the service name is escaped');
    ok(strpos($h, date('j F', $T)) !== false, $k . ': says when');
    ok(stripos($h, 'Becky') === false && strpos($h, '£30') === false, $k . ': no Becky, no £30 offer');
}
ok(strpos(cf_body_html('confirm', 'Al', 'Svc', $T, 'AB12'), 'AB12') !== false, 'the booking reference is shown');
ok(strpos(cf_body_html('cancel', 'Al', 'Svc', $T, ''), 'Was') !== false, 'a cancellation says when it WAS');
$rh = rm_body_html('Al', 'Remote <Support>', $T);
ok(strpos($rh, 'See you soon') !== false && strpos($rh, 'switched on') !== false, 'reminder: heading and the leave-it-on tip');
ok(strpos($rh, '<Support>') === false, 'reminder: service name escaped');
$rt = rm_body('Al', 'Remote Support', $T);
ok(strpos($rt, 'Leave the computer switched on and connected to the internet') !== false, 'reminder text carries the same tip');

echo "-- sign-off: David and Steve, nobody else\n";
$texts = array(cf_body('confirm', 'Al', 'Svc', $T, 'AB'), cf_body('change', 'Al', 'Svc', $T, ''), cf_body('cancel', 'Al', 'Svc', $T, ''), $rt);
foreach ($texts as $i => $t) ok(strpos($t, 'David & Steve') !== false && stripos($t, 'Becky') === false, 'text email ' . ($i + 1) . ' signs "David & Steve"');
$src = (string)file_get_contents(__DIR__ . '/pcm-review.php');
ok(stripos($src, 'Becky') === false, 'no "Becky" anywhere in the mail code');

echo "-- rv_seed: every upcoming booking, for the reminder only\n";
fresh();
qput(function ($q) { $q['q']['500'] = array('em' => 'kept@example.com', 'nm' => 'Kept', 'end' => time() + 90000, 'bs' => time() + 86400, 'st' => 'pending', 'rm' => 'sent', 'ts' => time() - 999); return $q; });
$rows = array(
    array('bid' => 501, 'em' => 'Plan.Visit@Example.com', 'nm' => 'Plan Visit', 'start' => $NOW + 86400, 'end' => $NOW + 86400 + 5400, 'sv' => 'Computer Service & Health Check'),
    array('bid' => 502, 'em' => 'past@example.com', 'nm' => 'Past', 'start' => $NOW - 60, 'end' => $NOW + 5000, 'sv' => 'x'),
    array('bid' => 503, 'em' => 'not-an-email', 'nm' => 'Bad', 'start' => $NOW + 86400, 'end' => 0, 'sv' => 'x'),
    array('bid' => 500, 'em' => 'other@example.com', 'nm' => 'Other', 'start' => $NOW + 99999, 'end' => 0, 'sv' => 'x'),
    array('bid' => 504, 'em' => 'noend@example.com', 'nm' => 'No End', 'start' => $NOW + 5 * 86400, 'end' => 0, 'sv' => 'x'),
);
$n = rv_seed($rows);
$e = q();
ok($n === 2, 'two added (a future visit, and one with no end time)', (string)$n);
$s = $e['q']['501'];
ok($s['st'] === 'seeded' && $s['rm'] === 'pending' && $s['em'] === 'plan.visit@example.com', 'seeded, reminder pending, email lower-cased');
ok(!isset($s['dn']), 'no job-done mark: when it is marked Completed it is handled as before');
ok($s['cf']['h'] === $NOW + 86400 && isset($s['cf']['cr']), 'counts as already confirmed at its time (an edit that does not move it stays silent)');
ok($s['ts'] <= $NOW - 86000, 'stamped as booked a day ago (not "just booked")');
ok($e['q']['504']['end'] === $NOW + 5 * 86400 + 5400, 'no end time: 90 minutes assumed');
ok(!isset($e['q']['502']) && !isset($e['q']['503']), 'a visit already started, or no valid email: not seeded');
ok($e['q']['500']['em'] === 'kept@example.com' && $e['q']['500']['rm'] === 'sent', 'an entry already queued is never touched');
ok(rv_seed($rows) === 0, 'the next poll adds nothing more');
$rows[0]['start'] = $NOW + 2 * 86400; $rows[0]['end'] = $NOW + 2 * 86400 + 5400;
qput(function ($q) { $q['q']['501']['rm'] = 'shadow'; return $q; });
rv_seed($rows); $e = q();
ok($e['q']['501']['bs'] === $NOW + 2 * 86400 && $e['q']['501']['rm'] === 'pending' && $e['q']['501']['cf']['h'] === $NOW + 2 * 86400, 'a seed moved in SimplyBook moves with it and is reminded afresh');
ok(rv_seed(array()) === 0 && rv_seed('junk') === 0, 'nothing handed over: nothing done');

echo "-- a seeded booking wakes nothing but the reminder\n";
qput(function ($q) {   // pretend both visits happened yesterday: one seeded, one a normal booking
    $q['q']['501']['end'] = time() - 86400; $q['q']['501']['bs'] = time() - 90000;
    $q['q']['600'] = array('em' => 'normal@example.com', 'nm' => 'Normal', 'end' => time() - 86400, 'bs' => time() - 90000, 'st' => 'pending', 'rm' => 'sent', 'ts' => time() - 9 * 86400);
    unset($q['dnrun_ts'], $q['rvrun_ts']); return $q;
});
$d = dn_process(5); $e = q();
ok(isset($d['due_waiting']) && $d['due_waiting'] === 1, 'job-done email: only the normal booking is due, not the seed', json_encode($d));
ok($e['q']['501']['st'] === 'seeded' && !isset($e['q']['501']['dn']), '... the seed is left exactly as it was');
$r = rv_process(5); $e = q();
ok($e['q']['501']['st'] === 'seeded', 'review ask: the seed is never picked', json_encode($r));
rv_record('501', 'plan.visit@example.com', 'Plan Visit', time() + 3 * 86400 + 5400, 'change', time() + 3 * 86400, 'Svc');
$e = q();
ok($e['q']['501']['st'] === 'pending' && isset($e['q']['501']['cf']['cr']), 'a webhook for a seed makes it an ordinary booking, keeping its confirmed mark');

echo "-- the reminder trial: who ours would remind, nothing sent\n";
if (file_exists(__DIR__ . '/slack-webhook.php')) { echo "  SKIP  slack-webhook.php is present here - the trial would post to Slack\n"; }
else {
    fresh();
    qput(function ($q) {
        $q['q']['700'] = array('em' => 'tomorrow@example.com', 'nm' => 'Tom Orrow', 'bs' => time() + 86400, 'end' => time() + 90000, 'st' => 'pending', 'rm' => 'pending', 'ts' => time() - 5 * 86400);
        $q['q']['701'] = array('em' => 'justbooked@example.com', 'nm' => 'Just Booked', 'bs' => time() + 86400, 'end' => time() + 90000, 'st' => 'pending', 'rm' => 'pending', 'ts' => time() - 60);
        $q['q']['702'] = array('em' => 'nextweek@example.com', 'nm' => 'Next Week', 'bs' => time() + 7 * 86400, 'end' => time() + 7 * 86400 + 5400, 'st' => 'pending', 'rm' => 'pending', 'ts' => time() - 5 * 86400);
        $q['q']['703'] = array('em' => 'seeded@example.com', 'nm' => 'Seed Ed', 'bs' => time() + 80000, 'end' => time() + 85400, 'st' => 'seeded', 'rm' => 'pending', 'ts' => time() - 86400);
        return $q;
    });
    $r = rm_process(5); $e = q();
    ok($r['mode'] === 'shadow' && $r['shadow'] === 2 && $r['sent'] === 0, 'trial mode: two would be reminded, none sent', json_encode($r));
    ok($e['q']['700']['rm'] === 'shadow' && $e['q']['703']['rm'] === 'shadow', '... tomorrow\'s visit and the seeded plan visit are marked');
    ok($e['q']['701']['rm'] === 'pending', '... one booked a minute ago is not (its confirmation just landed)');
    ok($e['q']['702']['rm'] === 'pending', '... next week\'s is not due yet');
    qput(function ($q) { unset($q['rmrun_ts']); return $q; });
    $r = rm_process(5);
    ok($r['shadow'] === 0, 'the next run marks nobody twice', json_encode($r));
    $GLOBALS['RM_SHADOW'] = false; qput(function ($q) { unset($q['rmrun_ts']); $q['q']['702']['bs'] = time() + 86400; return $q; });
    $r = rm_process(5); $e = q();
    ok($r['mode'] === 'safe' && $e['q']['702']['rm'] === 'pending', 'trial off and not live: nothing marked at all (the old safe mode)');
    $GLOBALS['RM_SHADOW'] = true;
}

echo "-- service reports: one per computer per day, a household in one email\n";
fresh();
$KEY = 'HOUSEKEY1234'; $KH = substr(hash('sha256', $KEY), 0, 12);
$MA = 'aaaa00000001'; $MB = 'bbbb00000002';
$seen = gmdate('Y-m-d H:i:s', $NOW - 3600);
$cust = array('email' => 'house@example.com', 'name' => 'Harriet House', 'tier' => 'pro',
              'machines' => array($MA => array('seen' => $seen), $MB => array('seen' => $seen), 'cccc00000003' => array('seen' => gmdate('Y-m-d H:i:s', $NOW - 200 * 86400))));
ok(sr_active_pcs($cust) === 2, 'two computers seen in the last 60 days (a third, gone quiet, not counted)');
ok(sr_active_pcs(array('email' => 'x@example.com')) === 1, 'no machine list: one computer');
$sum = function ($model, $score) { return array('customer' => 'Harriet', 'pc' => 'Dell Inc.', 'model' => $model, 'os' => 'Windows 11 Home', 'score' => $score . '%', 'scoren' => $score,
    'notes' => array(), 'done' => array(array('Windows updates installed', '2')), 'backup' => '', 'next' => '', 'security' => array()); };
$TA = $NOW - 600;
$r = sr_record($KEY, $MA, $TA, $sum('Latitude 5520', 84), $cust);
ok(!empty($r['queued']), 'the first computer\'s report is queued', json_encode($r));
$p = sr_process(5);
ok($p['household_wait'] === 1 && $p['due_waiting'] === 0, 'one of two computers in: it waits for the other', json_encode($p));
$TB = $NOW - 300;
sr_record($KEY, $MB, $TB, $sum('OptiPlex 3070', 77), $cust);
qput(function ($q) { unset($q['srrun_ts']); return $q; });
$p = sr_process(5);
ok($p['due_waiting'] === 2 && $p['household_wait'] === 0, 'the second arrives: both due together, as one email', json_encode($p));
$e = q();
$list = array($e['sr'][$KH . '-' . $MB . '-' . $TB], $e['sr'][$KH . '-' . $MA . '-' . $TA]);
usort($list, function ($a, $b) { return strcmp((string)$a['pc'], (string)$b['pc']); });
ok(sr_multi_subject($list) === 'Your service reports - 2 computers, ' . date('j F', (int)$list[0]['ts']), 'subject names the count', sr_multi_subject($list));
$mt = sr_multi_body('Harriet', $list);
ok(substr_count($mt, 'Full report: ') === 2 && strpos($mt, $list[0]['url']) !== false && strpos($mt, $list[1]['url']) !== false, 'text: each computer with its own report link');
ok(strpos($mt, 'LATITUDE 5520') !== false && strpos($mt, 'OPTIPLEX 3070') !== false, 'text: each computer under its own heading');
ok(substr_count($mt, 'David & Steve') === 1, 'text: signed once');
$mh = sr_multi_body_html('Harriet', $list);
ok(substr_count($mh, 'View the full report for ') === 2, 'HTML: one link per computer');
ok(strpos($mh, '>View the full report<') === false, 'HTML: no single big button (it would only open one of them)');
ok(substr_count($mh, 'David and Steve') === substr_count(sr_body_html('Harriet', $list[0]), 'David and Steve'), 'HTML: signed once (no more mentions than a one-computer report)');
ok(strpos($mh, '2 computers') !== false && strpos($mh, '84%') !== false && strpos($mh, '77%') !== false, 'HTML: preview carries both scores');

fresh();
$cust1 = array('email' => 'solo@example.com', 'name' => 'Sol O', 'tier' => 'pro', 'machines' => array($MA => array('seen' => $seen)));
// three reports on ONE calendar day, all in the past hour (the flip guard): just after midnight, use late yesterday
$tA = $NOW - 900; $tB = $NOW - 120; $tC = $NOW - 30;
if (date('Y-m-d', $tA) !== date('Y-m-d', $NOW)) { $tA = strtotime(date('Y-m-d', $NOW) . ' 00:00:00') - 1500; $tB = $tA + 780; $tC = $tA + 870; }
sr_record($KEY, $MA, $tA, $sum('Latitude 5520', 70), $cust1);
sr_record($KEY, $MA, $tB, $sum('Latitude 5520', 72), $cust1);
$p = sr_process(5); $e = q();
ok($p['due_waiting'] === 1 && $p['superseded'] === 1, 'the same computer twice in a day: only the newest goes', json_encode($p));
ok($e['sr'][$KH . '-' . $MA . '-' . ($tA)]['st'] === 'superseded' && $e['sr'][$KH . '-' . $MA . '-' . ($tB)]['st'] === 'pending', '... the older is marked superseded');
qput(function ($q) use ($KH, $MA, $tB) { $q['sr'][$KH . '-' . $MA . '-' . ($tB)]['st'] = 'sent'; unset($q['srrun_ts']); return $q; });
sr_record($KEY, $MA, $tC, $sum('Latitude 5520', 73), $cust1);
$p = sr_process(5); $e = q();
ok($p['due_waiting'] === 0 && $e['sr'][$KH . '-' . $MA . '-' . ($tC)]['why'] === 'already_sent_today', 'one already emailed today for that computer: a re-run is not sent again', json_encode($p));

fresh();
sr_record($KEY, $MA, $NOW - 120, $sum('Latitude 5520', 80), $cust);   // a two-computer household, only one serviced
qput(function ($q) { foreach ($q['sr'] as $k => $v) $q['sr'][$k]['made'] = time() - 6000; return $q; });
$p = sr_process(5);
ok($p['due_waiting'] === 1 && $p['household_wait'] === 0, 'the other computer never comes: after 90 minutes the one report goes alone', json_encode($p));

echo "\n" . ($fails ? "$fails FAILED" : 'all passed') . "\n";
exit($fails ? 1 : 0);
