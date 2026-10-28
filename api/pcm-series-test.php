<?php
/**
 * Recurring series confirmations + one cancellation email per customer (28 Oct 2026).   Run:  php api/pcm-series-test.php
 *
 * CLI-only, a throwaway queue, refuses to run where a mail config exists, and every send goes to a fake sender: it
 * can never email anyone. Pins: how the visits of one series are told apart (same client, service and creation time),
 * the series email and its calendar file, the queue marks that stop a retry sending twice and give every visit its
 * reminder, the cancellations waiting a minute and going as one email, and the callback and booking page wired so.
 */
if (PHP_SAPI !== 'cli') { http_response_code(403); exit('cli only'); }
if (is_readable(__DIR__ . '/pcm-smtp.php')) exit("refusing to run: pcm-smtp.php is present here, so a slip could send real mail\n");

$RV_TMPQ = sys_get_temp_dir() . '/series-test-queue-' . getmypid() . '.json';
register_shutdown_function(function () { global $RV_TMPQ; @unlink($RV_TMPQ); @unlink($RV_TMPQ . '.lock'); });

define('RV_LIB', 1);
define('RV_ANY_HOUR', 1);
require __DIR__ . '/pcm-review.php';
$RV_Q = $RV_TMPQ;
$RV_LIVE = false; $DN_LIVE = false; $BF_LIVE = false; $CF_LIVE = false; $RM_LIVE = false; $SR_LIVE = false;   // HARD SAFETY

$fails = 0;
function ok($cond, $what, $detail = '') {
    global $fails;
    echo ($cond ? '  PASS  ' : '  FAIL  ') . $what . ($cond || $detail === '' ? '' : '   [' . $detail . ']') . "\n";
    if (!$cond) $fails++;
}
function q() { global $RV_Q; return json_decode((string)file_get_contents($RV_Q), true); }
function qput($fn) { list($lk, $q) = rvq_open(); $q = $fn($q); rvq_save($q); rvq_close($lk); }
function fresh() { global $RV_Q; @unlink($RV_Q); @unlink($RV_Q . '.lock'); }
$SENT = array();
function fake_send($to, $subj, $body, $icsN, $icsD, $html) { global $SENT, $FAKE_OK; $SENT[] = compact('to', 'subj', 'body', 'html'); return $FAKE_OK; }
$FAKE_OK = true;

// a six-weekly series of four, Thursday 5:30pm, crossing the October clock change
$T0 = strtotime(date('Y', time() + 86400 * 400) . '-10-01 17:30');           // a year or so ahead, always future
$T0 = strtotime('thursday', $T0) + 17 * 3600 + 1800;
$dt = function ($ts) { return date('Y-m-d H:i:s', $ts); };
$at = function ($i) use ($T0) { return strtotime(date('Y-m-d', $T0) . ' +' . (42 * $i) . ' days 17:30'); };
$REC = '2026-10-28 19:16:18';

echo "-- ics: one visit unchanged, several in one file\n";
$old = function ($summary, $st, $en, $uid, $seq) {   // ics_build exactly as it was before today
    $esc = function($s){ return preg_replace('/([\\\\,;])/', '\\\\$1', preg_replace('/[\r\n]+/', ' ', (string)$s)); };
    $tz = "BEGIN:VTIMEZONE\r\nTZID:Europe/London\r\n"
        . "BEGIN:DAYLIGHT\r\nTZOFFSETFROM:+0000\r\nTZOFFSETTO:+0100\r\nTZNAME:BST\r\nDTSTART:19700329T010000\r\nRRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU\r\nEND:DAYLIGHT\r\n"
        . "BEGIN:STANDARD\r\nTZOFFSETFROM:+0100\r\nTZOFFSETTO:+0000\r\nTZNAME:GMT\r\nDTSTART:19701025T020000\r\nRRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU\r\nEND:STANDARD\r\nEND:VTIMEZONE";
    return "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//365 Techies//Booking//EN\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\n" . $tz
        . "\r\nBEGIN:VEVENT\r\nUID:" . $esc($uid) . "\r\nSEQUENCE:" . (int)$seq
        . "\r\nDTSTAMP:" . gmdate('Ymd\THis\Z')
        . "\r\nDTSTART;TZID=Europe/London:" . date('Ymd\THis', $st)
        . "\r\nDTEND;TZID=Europe/London:" . date('Ymd\THis', $en > $st ? $en : $st + 3600)
        . "\r\nSUMMARY:" . $esc($summary)
        . "\r\nDESCRIPTION:" . $esc('365 Techies - 01202 775566 - manage at https://365techies.co.uk/portal/')
        . "\r\nORGANIZER;CN=365 Techies:mailto:info@365techies.co.uk"
        . "\r\nSTATUS:CONFIRMED\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n";
};
$nostamp = function ($s) { return preg_replace('/DTSTAMP:\d{8}T\d{6}Z/', 'DTSTAMP:X', $s); };
ok($nostamp(ics_build('Full, Service; x', $T0, $T0 + 5400, 'sb-1@365techies.co.uk', 7)) === $nostamp($old('Full, Service; x', $T0, $T0 + 5400, 'sb-1@365techies.co.uk', 7)),
   'a single booking\'s calendar file is byte-for-byte what it was');
$ev = array(); for ($i = 0; $i < 4; $i++) $ev[] = array($at($i), $at($i) + 5400, 'sb-' . (900 + $i) . '@365techies.co.uk');
$ics = ics_build_many('Full Computer Service', $ev, 3);
ok(substr_count($ics, 'BEGIN:VEVENT') === 4 && substr_count($ics, 'END:VEVENT') === 4, 'a series: one event per visit');
ok(substr_count($ics, 'BEGIN:VTIMEZONE') === 1 && substr_count($ics, 'END:VCALENDAR') === 1 && substr($ics, -15) === "END:VCALENDAR\r\n", '... in one calendar, one time zone');
ok(strpos($ics, 'UID:sb-900@365techies.co.uk') !== false && strpos($ics, 'UID:sb-903@365techies.co.uk') !== false, '... each with the booking\'s own UID, so a later "New time" updates the right visit');
ok(strpos($ics, 'DTSTART;TZID=Europe/London:' . date('Ymd', $at(3)) . 'T173000') !== false, '... at 5:30pm London time after the clocks change too');

echo "-- telling the visits of one series apart\n";
$rows = array(
    array('id' => '901', 'start_date' => $dt($at(1)), 'end_date' => $dt($at(1) + 5400), 'client_id' => '55', 'event_id' => '3', 'record_date' => '2026-10-28 19:16:19'),
    array('id' => '900', 'start_date' => $dt($at(0)), 'end_date' => $dt($at(0) + 5400), 'client_id' => '55', 'event_id' => '3', 'record_date' => $REC),
    array('id' => '903', 'start_date' => $dt($at(3)), 'end_date' => $dt($at(3) + 5400), 'client_id' => '55', 'event_id' => '3', 'record_date' => $REC),
    array('id' => '902', 'start_date' => $dt($at(2)), 'end_date' => $dt($at(2) + 5400), 'client_id' => '55', 'event_id' => '3', 'record_date' => '2026-10-28 19:16:20'),
    array('id' => '950', 'start_date' => $dt($at(1) + 86400), 'end_date' => $dt($at(1) + 90000), 'client_id' => '55', 'event_id' => '3', 'record_date' => '2026-10-28 11:02:00'),   // booked separately this morning
    array('id' => '951', 'start_date' => $dt($at(2) + 3600), 'end_date' => $dt($at(2) + 9000), 'client_id' => '77', 'event_id' => '3', 'record_date' => $REC),   // someone else
    array('id' => '952', 'start_date' => $dt($at(2) + 7200), 'end_date' => $dt($at(2) + 9000), 'client_id' => '55', 'event_id' => '9', 'record_date' => $REC),   // another service
    array('id' => '953', 'start_date' => $dt($at(1) + 7200), 'end_date' => $dt($at(1) + 9000), 'client_id' => '55', 'event_id' => '3', 'record_date' => $REC, 'is_cancelled' => '1'),
    array('id' => '954', 'start_date' => $dt(time() - 3600), 'end_date' => $dt(time()), 'client_id' => '55', 'event_id' => '3', 'record_date' => $REC),   // already started
    'junk',
);
$trig = array('bid' => 900, 'start' => $at(0), 'end' => $at(0) + 5400, 'rec' => '', 'cid' => 55, 'eid' => 3);
$v = cf_series_pick($trig, $rows);
ok(count($v) === 4, 'the four visits made in the same action are found', json_encode(array_map(function ($x) { return $x['bid']; }, $v)));
ok(array_map(function ($x) { return $x['bid']; }, $v) === array(900, 901, 902, 903), '... in date order, the webhook\'s visit first');
ok($v[2]['start'] === $at(2) && $v[2]['end'] === $at(2) + 5400, '... with their own start and end');
ok(count(cf_series_pick($trig, array_values(array_filter($rows, function ($r) { return is_array($r) && $r['id'] !== '900'; })))) === 1,
   'the webhook\'s own row missing and no creation time given: never guess a series');
$t2 = $trig; $t2['rec'] = $REC;
ok(count(cf_series_pick($t2, array_values(array_filter($rows, function ($r) { return is_array($r) && $r['id'] !== '900'; })))) === 4, '... but its creation time from the webhook works');
$keyed = array(); foreach ($rows as $r) if (is_array($r)) $keyed[$r['id']] = $r;
ok(count(cf_series_pick($trig, $keyed)) === 4, 'a list keyed by booking id reads the same');
$norec = array(); foreach ($rows as $r) if (is_array($r)) { unset($r['record_date']); $norec[] = $r; }
ok(count(cf_series_pick($trig, $norec)) === 1, 'no creation times at all: only the one visit (the single "Booked:")');
ok(count(cf_series_pick($trig, null)) === 1 && count(cf_series_pick($trig, 'junk')) === 1, 'no answer from SimplyBook: only the one visit');
$split = array(array('id' => '1', 'start_date' => substr($dt($at(0)), 0, 10), 'start_time' => '17:30:00', 'end_date' => substr($dt($at(0)), 0, 10), 'end_time' => '19:00:00', 'record_date' => $REC),
               array('id' => '2', 'start_date' => substr($dt($at(1)), 0, 10), 'start_time' => '17:30:00', 'record_date' => $REC));
$v2 = cf_series_pick(array('bid' => 1, 'start' => $at(0), 'end' => $at(0) + 5400), $split);
ok(count($v2) === 2 && $v2[1]['start'] === $at(1) && $v2[1]['end'] === $at(1) + 5400, 'date and time in separate fields, no end: read, 90 minutes assumed');

echo "-- \"every 6 weeks\"\n";
ok(cf_series_every($v) === 'every 6 weeks', 'six-weekly, across the clock change', cf_series_every($v));
$wk = array(); for ($i = 0; $i < 3; $i++) $wk[] = array('start' => strtotime(date('Y-m-d', $T0) . ' +' . (7 * $i) . ' days 10:00'));
ok(cf_series_every($wk) === 'every week', 'weekly');
$d3 = array(array('start' => $T0), array('start' => $T0 + 3 * 86400));
ok(cf_series_every($d3) === 'every 3 days', 'every 3 days');
$irr = array(array('start' => $T0), array('start' => $T0 + 7 * 86400), array('start' => $T0 + 21 * 86400));
ok(cf_series_every($irr) === '' && cf_series_every(array(array('start' => $T0))) === '', 'uneven, or one visit: says nothing');

echo "-- the series email\n";
$sv = '365 Techies Full Computer Service';
$s = cf_series_subject($sv, $v);
ok($s === 'Booked: ' . $sv . ' - 4 visits from ' . date('D j M', $at(0)), 'subject: how many, and from when', $s);
$t = cf_series_body('Jane', $sv, $v, 'CODE12');
ok(strpos($t, '4 of them, every 6 weeks') !== false, 'text: how many and how often');
$all = true; foreach ($v as $x) if (strpos($t, cf_series_line($x['start'])) === false) $all = false;
ok($all, 'text: every visit listed, with its year');
ok(strpos($t, 'Last:   ' . date('l j F Y', $at(3))) !== false && strpos($t, 'Booking reference: CODE12') !== false, 'text: the last visit and the reference');
ok(strpos($t, 'David & Steve') !== false && stripos($t, 'becky') === false, 'text: signed David & Steve');
ok(strpos($t, "\r\n") !== false && strpos(str_replace("\r\n", '', $t), "\n") === false, 'text: CRLF line ends only');
$h = cf_series_body_html('<b>Jane</b>', 'Full <i>Service</i>', $v, 'CODE12');
ok(strpos($h, '<b>Jane</b>') === false && strpos($h, '<i>Service</i>') === false, 'HTML: name and service escaped');
$all = true; foreach ($v as $x) if (strpos($h, rv_h(cf_series_line($x['start']))) === false) $all = false;
ok($all && strpos($h, 'Every visit') !== false, 'HTML: every visit listed');
ok(strpos($h, '4, every 6 weeks') !== false && strpos($h, 'CODE12') !== false && strpos($h, 'David and Steve') !== false, 'HTML: count, reference, sign-off');

echo "-- confirming a series: marked once, every visit queued\n";
fresh();
rv_record('900', 'Jane.Doe@Example.com', 'Jane Doe', $at(0) + 5400, 'create', $at(0), $sv);
qput(function ($q) use ($at) { $q['q']['902'] = array('em' => 'jane.doe@example.com', 'nm' => 'Jane', 'bs' => $at(2), 'end' => $at(2) + 5400, 'st' => 'pending', 'rm' => 'pending', 'ts' => time() - 50); return $q; });
ok(cf_notify_series('900', 'Jane.Doe@Example.com', 'Jane Doe', $sv, $v, 'CODE12') === true, 'handled as a series');
$e = q();
ok(isset($e['q']['900']['cf']['cr']) && $e['q']['900']['cf']['h'] === $at(0) && $e['q']['900']['cf']['ser'] === 4, 'the webhook\'s visit is marked confirmed, as a series of 4');
ok($e['q']['901']['st'] === 'seeded' && $e['q']['903']['st'] === 'seeded' && isset($e['q']['903']['cf']['cr']) && $e['q']['903']['cf']['h'] === $at(3), 'the other visits are queued, already confirmed at their own times');
ok($e['q']['901']['rm'] === 'pending' && $e['q']['901']['em'] === 'jane.doe@example.com' && !isset($e['q']['901']['dn']), '... each with its reminder to come, and nothing else woken');
ok($e['q']['902']['ts'] === time() - 50 || $e['q']['902']['ts'] >= time() - 52, 'a visit already in the queue is left alone');
$before = $e['q']['900']['cf'];
ok(cf_notify_series('900', 'jane.doe@example.com', 'Jane Doe', $sv, $v, 'CODE12') === true && q()['q']['900']['cf'] === $before, 'SimplyBook retrying the webhook: nothing more');
list($a) = cf_decide(q()['q']['901']['cf'], 'change', $at(1), $at(1), time());
ok($a === 'none', 'an edit to one of the visits that does not move it: no email');
list($a) = cf_decide(q()['q']['901']['cf'], 'change', $at(1) + 3600, $at(1), time());
ok($a === 'send', 'a real move of one visit: "New time" for that visit');
fresh();
ok(cf_notify_series('900', 'jane.doe@example.com', 'Jane', $sv, $v, '') === false, 'the webhook\'s visit not queued (rv_record refused it): not handled, the caller falls back');
rv_record('900', 'jane.doe@example.com', 'Jane', $at(0) + 5400, 'create', $at(0), $sv);
ok(cf_notify_series('900', 'jane.doe@example.com', 'Jane', $sv, array($v[0]), '') === false, 'one visit is not a series');
ok(cf_notify_series('900', 'not an email', 'Jane', $sv, $v, '') === false, 'no valid email: not handled');

echo "-- cancellations: wait a minute, then one email per customer\n";
fresh();
$CF_LIVE = true;   // cf_notify never sends a cancellation itself; cx_process sends through fake_send
foreach (array(0, 1, 2) as $i) rv_record((string)(900 + $i), 'jane.doe@example.com', 'Jane Doe', $at($i) + 5400, 'create', $at($i), $sv);
rv_record('980', 'solo@example.com', 'Sol O', $at(1) + 5400, 'create', $at(1), 'Remote Support Session');
foreach (array('900', '901', '902', '980') as $b) { rv_record($b, 'x@example.com', '', 0, 'cancel', 0, ''); cf_notify($b, 'cancel', $b === '980' ? 'solo@example.com' : 'jane.doe@example.com', '', '', q()['q'][$b]['bs'], 0, ''); }
$e = q();
ok($e['q']['900']['cf']['cxq'] === 1 && $e['q']['902']['cf']['cxq'] === 1 && isset($e['q']['900']['cf']['ca']), 'each cancellation is marked to send, none sent yet');
$SENT = array();
$r = cx_process(5, 'fake_send');
ok(count($SENT) === 0 && $r['waiting'] === 2, 'within the minute: nothing sent (more may be on the way)', json_encode($r));
qput(function ($q) { foreach ($q['q'] as $k => $x) if (isset($x['cf']['ca'])) $q['q'][$k]['cf']['ca'] = time() - 90; return $q; });
$r = cx_process(5, 'fake_send');
ok(count($SENT) === 2 && $r['sent'] === 2, 'settled: one email to each customer', json_encode($r));
$jane = null; $solo = null; foreach ($SENT as $m) { if ($m['to'] === 'jane.doe@example.com') $jane = $m; if ($m['to'] === 'solo@example.com') $solo = $m; }
ok($jane && $jane['subj'] === 'Cancelled: ' . $sv . ' - 3 visits', 'three visits cancelled together: ONE email naming three', $jane ? $jane['subj'] : '');
ok($jane && strpos($jane['body'], cf_series_line($at(0))) !== false && strpos($jane['body'], cf_series_line($at(2))) !== false && strpos($jane['body'], 'Hi Jane,') !== false, '... listing each one');
ok($solo && $solo['subj'] === cf_subject('cancel', 'Remote Support Session', $at(1)), 'one visit: the usual "Cancelled:" email', $solo ? $solo['subj'] : '');
$e = q();
ok(!isset($e['q']['900']['cf']['cxq']) && !isset($e['q']['980']['cf']['cxq']) && isset($e['q']['900']['cf']['ca']), 'sent: the marks are cleared, the cancellation stays recorded');
$SENT = array(); cx_process(5, 'fake_send');
ok(count($SENT) === 0, 'nothing is sent twice');
foreach (array('900') as $b) cf_notify($b, 'cancel', 'jane.doe@example.com', '', '', $at(0), 0, '');
ok(!isset(q()['q']['900']['cf']['cxq']), 'SimplyBook retrying a cancellation webhook: not queued again');

fresh();
rv_record('990', 'back@example.com', 'Back Again', $at(1) + 5400, 'create', $at(1), $sv);
rv_record('990', 'back@example.com', '', 0, 'cancel', 0, ''); cf_notify('990', 'cancel', 'back@example.com', '', '', $at(1), 0, '');
rv_record('990', 'back@example.com', 'Back Again', $at(1) + 5400, 'create', $at(1), $sv);   // reinstated in SimplyBook
qput(function ($q) { $q['q']['990']['cf']['ca'] = time() - 90; return $q; });
$SENT = array(); cx_process(5, 'fake_send');
ok(count($SENT) === 0 && !isset(q()['q']['990']['cf']['cxq']), 'a booking reinstated before the email went: no cancellation email');

fresh();
rv_record('991', 'fail@example.com', 'Fay L', $at(1) + 5400, 'create', $at(1), $sv);
rv_record('991', 'fail@example.com', '', 0, 'cancel', 0, ''); cf_notify('991', 'cancel', 'fail@example.com', '', '', $at(1), 0, '');
qput(function ($q) { $q['q']['991']['cf']['ca'] = time() - 90; return $q; });
$FAKE_OK = false; $SENT = array();
cx_process(5, 'fake_send');
ok(q()['q']['991']['cf']['cxq'] === 1 && q()['q']['991']['cf']['cxt'] === 1, 'a failed send waits for the next run');
cx_process(5, 'fake_send'); cx_process(5, 'fake_send');
ok(count($SENT) === 3 && !isset(q()['q']['991']['cf']['cxq']), 'three failures: it stops trying (and says so in Slack)');
$FAKE_OK = true;

fresh();
rv_record('992', 'opted@example.com', 'Op Ted', $at(1) + 5400, 'create', $at(1), $sv);
rv_record('992', 'opted@example.com', '', 0, 'cancel', 0, ''); cf_notify('992', 'cancel', 'opted@example.com', '', '', $at(1), 0, '');
$CF_LIVE = false;
qput(function ($q) { $q['q']['992']['cf']['ca'] = time() - 90; return $q; });
$SENT = array(); cx_process(5, 'fake_send');
ok(count($SENT) === 0 && !isset(q()['q']['992']['cf']['cxq']), 'booking emails switched off ($CF_LIVE): nothing sent, nothing left waiting');
rv_record('993', 'safe@example.com', 'Sa Fe', $at(1) + 5400, 'create', $at(1), $sv);
rv_record('993', 'safe@example.com', '', 0, 'cancel', 0, ''); cf_notify('993', 'cancel', 'safe@example.com', '', '', $at(1), 0, '');
ok(!isset(q()['q']['993']['cf']['cxq']) && isset(q()['q']['993']['cf']['ca']), '... and a cancellation while off is recorded, not queued');

echo "-- the bodies of a multi-visit cancellation\n";
$ls = array($at(0), $at(1));
$ct = cx_body('Jane', $sv, $ls); $ch = cx_body_html('<b>J</b>', $sv, $ls);
ok(strpos($ct, 'These 2 visits are cancelled') !== false && strpos($ct, 'David & Steve') !== false, 'text: says how many, signed');
ok(strpos($ch, '<b>J</b>') === false && strpos($ch, rv_h(cf_series_line($at(1)))) !== false && strpos($ch, 'David and Steve') !== false, 'HTML: escaped, lists them, signed');

echo "-- every booked visit, however far ahead (the old six-weekly series)\n";
fresh();
$far = function ($i) use ($T0) { return strtotime(date('Y-m-d', $T0) . ' +' . (42 * $i) . ' days 11:00'); };   // a series running years ahead
$plan = array(); for ($i = 0; $i < 30; $i++) $plan[] = array('bid' => 7000 + $i, 'em' => 'Plan.Old@Example.com', 'nm' => 'Pat Old', 'start' => $far($i), 'end' => $far($i) + 5400,
                                                    'sv' => $sv, 'rec' => '2024-06-03 21:27:52');
qput(function ($q) use ($far) {
    $q['q']['7100'] = array('em' => 'gone@example.com', 'nm' => 'Gone', 'bs' => $far(3), 'end' => $far(3) + 5400, 'st' => 'seeded', 'rm' => 'pending', 'ts' => time() - 86400);   // deleted in SimplyBook
    $q['q']['7101'] = array('em' => 'real@example.com', 'nm' => 'Real', 'bs' => $far(3), 'end' => $far(3) + 5400, 'st' => 'pending', 'rm' => 'pending', 'ts' => time() - 86400);  // a real booking, not a seed
    $q['q']['7102'] = array('em' => 'beyond@example.com', 'nm' => 'Beyond', 'bs' => $far(80), 'end' => $far(80) + 5400, 'st' => 'seeded', 'rm' => 'pending', 'ts' => time() - 86400); // past the list's last visit
    return $q;
});
$r = rv_seed_sync($plan, time(), time() + 86400 * 2200);
$e = q();
ok($r['added'] === 30 && isset($e['q']['7029']), 'all thirty visits of a series running ' . date('Y', $far(29)) . ' are on the list', json_encode($r));
ok($e['q']['7029']['rec'] === '2024-06-03 21:27:52' && $e['q']['7000']['em'] === 'plan.old@example.com', '... each tagged with when the series was made');
ok(!isset($e['q']['7100']) && $r['dropped'] === 1, 'a seed SimplyBook no longer has is dropped (it can never be reminded)');
ok(isset($e['q']['7101']), 'a real booking is never dropped');
ok(isset($e['q']['7102']), 'nothing past the last visit the list reached is dropped (a list cut short)');
$plan2 = $plan; $plan2[5]['start'] = $far(5) + 7200; $plan2[5]['end'] = $far(5) + 12600;
$r = rv_seed_sync($plan2, time(), time() + 86400 * 2200); $e = q();
ok($r['added'] === 0 && $e['q']['7005']['bs'] === $far(5) + 7200 && $e['q']['7005']['cf']['h'] === $far(5) + 7200, 'the next pass adds nothing and follows a moved visit');
ok(rv_seed_sync(array(), time(), time() + 86400)['dropped'] === 0 && isset(q()['q']['7001']), 'an empty answer drops nothing');
rv_record('7006', 'plan.old@example.com', 'Pat Old', $far(6) + 5400, 'change', $far(6), $sv);
ok(q()['q']['7006']['rec'] === '2024-06-03 21:27:52' && q()['q']['7006']['st'] === 'pending', 'a webhook for one of them keeps its series tag');
list($a) = cf_decide(q()['q']['7020']['cf'], 'change', $far(20) + 3600, $far(20), time());
ok($a === 'send', 'a visit two years out, moved in SimplyBook: "New time" (it used to be a stranger, so nothing)');

echo "-- a whole old series cancelled: one email, however SimplyBook sends it\n";
$CF_LIVE = true;
rv_record('7000', 'x@example.com', '', 0, 'cancel', 0, '');
cf_notify('7000', 'cancel', 'plan.old@example.com', 'Pat Old', $sv, $far(0), 0, '');
$live = array('7001', '7002');   // SimplyBook still has these two (cancelled from the third visit on, say)
$n = rv_cancel_sweep('7000', 'plan.old@example.com', '2024-06-03 21:27:52', $live);
$e = q();
ok($n === 27, 'one webhook: the 27 other visits SimplyBook no longer has are cancelled with it', (string)$n);
ok($e['q']['7001']['st'] === 'seeded' && $e['q']['7002']['st'] === 'seeded', 'the ones SimplyBook still has are left alone');
ok($e['q']['7029']['st'] === 'cancelled' && $e['q']['7029']['rm'] === 'skipped' && $e['q']['7029']['cf']['cxq'] === 1, '... the rest: cancelled, no reminder, in the email queue');
ok(isset($e['q']['7101']) && $e['q']['7101']['st'] === 'pending', 'another customer\'s booking is untouched');
ok(rv_cancel_sweep('7003', 'plan.old@example.com', '2024-06-03 21:27:52', $live) === 0, 'the same series\' other webhooks find nothing more to do');
cf_notify('7003', 'cancel', 'plan.old@example.com', 'Pat Old', $sv, $far(3), 0, '');
qput(function ($q) { foreach ($q['q'] as $k => $x) if (isset($x['cf']['ca'])) $q['q'][$k]['cf']['ca'] = time() - 90; return $q; });
$SENT = array(); cx_process(5, 'fake_send');
$pat = array_values(array_filter($SENT, function ($m) { return $m['to'] === 'plan.old@example.com'; }));
ok(count($pat) === 1 && $pat[0]['subj'] === 'Cancelled: ' . $sv . ' - 28 visits', 'ONE email naming all 28', count($pat) ? $pat[0]['subj'] : 'none');
ok(rv_cancel_sweep('7001', 'plan.old@example.com', '', $live) === 0 && rv_cancel_sweep('7001', 'plan.old@example.com', '2024-06-03 21:27:52', null) === 0,
   'no series tag, or no answer from SimplyBook: sweeps nothing');
fresh();
qput(function ($q) use ($far) {
    $q['q']['7200'] = array('em' => 'twin@example.com', 'nm' => 'Twin', 'bs' => $far(2), 'end' => $far(2) + 5400, 'st' => 'seeded', 'rm' => 'pending', 'ts' => time() - 86400, 'rec' => '2025-01-01 10:00:00', 'cf' => array('cr' => 1, 'h' => $far(2)));
    $q['q']['7201'] = array('em' => 'twin@example.com', 'nm' => 'Twin', 'bs' => $far(4), 'end' => $far(4) + 5400, 'st' => 'seeded', 'rm' => 'pending', 'ts' => time() - 86400, 'rec' => '2025-03-09 15:00:00', 'cf' => array('cr' => 1, 'h' => $far(4)));
    return $q;
});
ok(rv_cancel_sweep('7199', 'twin@example.com', '2025-01-01 10:00:00', array()) === 1 && q()['q']['7201']['st'] === 'seeded', 'only the same series: another series of the same customer is left alone');
$CF_LIVE = false;

echo "-- the self-check on SimplyBook's creation times\n";
ok(cf_series_selfcheck(array(array('id' => 1, 'record_date' => $REC))) === 'ok', 'present: ok');
ok(cf_series_selfcheck(array()) === 'no_rows', 'no bookings in the window: nothing to judge');
fresh();
ok(cf_series_selfcheck(array(array('id' => 1))) === 'missing' && (int)q()['ser_warned'] > 0, 'missing: says so (once a week)');

echo "-- wired in the right places\n";
$cb = (string)file_get_contents(__DIR__ . '/pcm-sb-callback.php');
$pLook = strpos($cb, '$visits = cb_series_visits('); $pSer = strpos($cb, 'cf_notify_series($bid'); $pOne = strpos($cb, 'else cf_notify($bid, $type');
ok($pLook !== false && $pSer !== false && $pOne !== false && $pLook < $pSer && $pSer < $pOne, 'callback: looks for the series, confirms it, else the single "Booked:"');
ok(strpos($cb, "if (\$type === 'create' && !\$logged && \$ts && \$ts > time() && !bkann_recent(\$bid, 'single'))") !== false, '... only for a new future booking, not a logged job, not the booking page\'s one visit');
ok(strpos($cb, "'getBookings', array(\$f)") !== false && strpos($cb, "'client_id' => (int)\$cid") !== false, '... asking SimplyBook for this client\'s bookings');
$pCx = strpos($cb, '$swept = rv_cancel_sweep('); $pCxIf = strpos($cb, "if (\$type === 'cancel' && \$ts && \$ts > time() && !empty(\$b['record_date']) && !bkann_recent(\$bid, 'single')");
ok($pCx !== false && $pCxIf !== false && $pOne < $pCxIf && $pCxIf < $pCx, 'callback: a cancellation sweeps the rest of its series, after its own email is queued, never for the booking page\'s trim');
$bp = (string)file_get_contents(__DIR__ . '/pcm-bkpoll.php');
ok(strpos($bp, '$rvDeep = rv_seed_sync($dd, time(), $dTo);') !== false && strpos($bp, "< time() - 10800)") !== false && strpos($bp, '86400 * 2200') !== false,
   'the poll hands over EVERY future booking (six years ahead) every 3 hours');
ok(strpos($cb, 'cx_process(5);') !== false, '... and every webhook sends settled cancellations');
ok(strpos((string)file_get_contents(__DIR__ . '/pcm-bkpoll.php'), '$mailC = cx_process(5);') !== false, 'the 5-minute poll sends them too');
$bk = (string)file_get_contents(__DIR__ . '/pcm-booking.php');
$pM = strpos($bk, "bkann_mark(\$sg, 'single')"); $pT = strpos($bk, "sb_adm('cancelBooking', array(\$sv['id']))");
ok($pM !== false && $pT !== false && $pM < $pT, 'booking page: marks its one visit before trimming a series');
$rv = (string)file_get_contents(__DIR__ . '/pcm-review.php');
ok(strpos($rv, "if (\$kind === 'cancel' && !\$silent && \$CF_LIVE) \$cf['cxq'] = 1;") !== false && strpos($rv, "if (!\$CF_LIVE || \$silent || \$kind === 'cancel') return;") !== false,
   'cf_notify queues a cancellation and never sends one itself');

echo "\n" . ($fails ? "$fails FAILED" : 'all passed') . "\n";
exit($fails ? 1 : 0);
