<?php
/**
 * Six-weekly service report email - test suite.   Run:  php api/pcm-sr-test.php
 *
 * CLI-only. Uses a throwaway queue file and forces $SR_LIVE off, so it can never
 * send. Pins what matters: the queue entry is built only from sanitised uploader
 * text; a report supersedes the visit record for the same person and time, and
 * nothing else; the signed link verifies, and a tampered or expired one does not;
 * safe mode sends nothing; and both bodies say the same true things with no
 * review ask, no unsubscribe (transactional) and no invented lines.
 */
if (PHP_SAPI !== 'cli') { http_response_code(403); exit('cli only'); }

$RV_TMPQ = sys_get_temp_dir() . '/sr-test-queue.json';
register_shutdown_function(function () { global $RV_TMPQ; @unlink($RV_TMPQ); @unlink($RV_TMPQ . '.lock'); });
@unlink($RV_TMPQ); @unlink($RV_TMPQ . '.lock');

define('RV_LIB', 1);
require __DIR__ . '/pcm-review.php';
$RV_Q = $RV_TMPQ;
$SR_LIVE = false;   // HARD SAFETY: this suite must never send
$RV_LIVE = false; $DN_LIVE = false; $BF_LIVE = false; $CF_LIVE = false; $RM_LIVE = false;

// the senders only work 09:00-20:00 local; pick a zone where it is daytime now
foreach (array('Europe/London', 'Asia/Tokyo', 'Asia/Dubai', 'America/New_York', 'America/Los_Angeles', 'Pacific/Auckland', 'Pacific/Honolulu') as $tz) {
    date_default_timezone_set($tz);
    if ((int)date('G') >= 10 && (int)date('G') < 19) break;
}

$fails = 0;
function ok($cond, $what, $detail = '') {
    global $fails;
    echo ($cond ? '  PASS  ' : '  FAIL  ') . $what . ($cond || $detail === '' ? '' : '   [' . $detail . ']') . "\n";
    if (!$cond) $fails++;
}
function q() { global $RV_Q; return json_decode((string)file_get_contents($RV_Q), true); }

$KEY = 'TESTKEY12345'; $MACHINE = 'abcdef012345'; $TS = time() - 300;
$KH = substr(hash('sha256', $KEY), 0, 12);
$cust = array('email' => 'Sofia.Example@Example.com', 'name' => 'Sofia Example');
$summary = array(
    'customer' => 'Sofia', 'pc' => 'Dell Inc.', 'model' => 'Dell Latitude 3520', 'os' => 'Windows 11 Home 24H2',
    'score' => '81% - Very good', 'scoren' => 81,
    'notes' => array('<strong>The battery</strong> now holds 59% of its original capacity - fine on the mains.<script>alert(1)</script>', 'Second note', 'Third note never shown'),
    'done' => array(array('Windows updates installed', '3, including one driver'), array('<b>Security scan</b>', 'clean'), 'not an array', array('', 'no label')),
    'backup' => 'Windows Backup - last completed 2 September',
    'next' => '2026-10-16',
    'security' => array(
        array('Antivirus', 'OK', 'Real-time protection on - <b>Malwarebytes</b>'),
        array('Firewall', 'warn', 'Off for: Private'),
        array('Made up', 'green', 'a state outside the vocabulary must be dropped'),
        array('', 'ok', 'no label'),
        'not a row',
        array('Drive encryption', 'info', 'Not encrypted (BitLocker off)'),
    ),
);

echo "-- queueing\n";
// a pending visit record for the same person, 2h before the report: must be superseded
list($lk, $q) = rvq_open();
$q['q']['9001'] = array('em' => 'sofia.example@example.com', 'nm' => 'Sofia', 'end' => $TS - 7200, 'dn' => 'pending', 'st' => 'pending');
$q['q']['9002'] = array('em' => 'sofia.example@example.com', 'nm' => 'Sofia', 'end' => $TS - 5 * 86400, 'dn' => 'pending', 'st' => 'pending');   // 5 days ago: a different visit
$q['q']['9003'] = array('em' => 'sofia.example@example.com', 'nm' => 'Sofia', 'end' => $TS - 3600, 'dn' => 'sent', 'st' => 'pending');          // already sent: leave alone
$q['q']['9004'] = array('em' => 'someone.else@example.com', 'nm' => 'Else', 'end' => $TS - 3600, 'dn' => 'pending', 'st' => 'pending');        // other person
rvq_save($q); rvq_close($lk);

$r = sr_record($KEY, $MACHINE, $TS, $summary, $cust, array('ts' => $TS - 42 * 86400, 'score' => 78));
ok(!empty($r['queued']), 'a service report upload queues an email', json_encode($r));
ok($r['superseded'] === 1, 'exactly one visit record was superseded', json_encode($r));
$e = q(); $id = $KH . '-' . $MACHINE . '-' . $TS; $ent = isset($e['sr'][$id]) ? $e['sr'][$id] : null;
ok($ent !== null, 'the entry is keyed by hash-machine-stamp');
ok($ent['em'] === 'sofia.example@example.com', 'the email is lower-cased');
ok($ent['pc'] === 'Dell Latitude 3520', 'model wins over make for the computer line', $ent['pc']);
ok($ent['score'] === 81 && $ent['prev'] === 78, 'score and previous score stored', json_encode(array($ent['score'], $ent['prev'])));
ok(count($ent['recs']) === 2 && strpos($ent['recs'][0], '<') === false && strpos($ent['recs'][0], 'alert') !== false
   && strpos($ent['recs'][0], 'script') === false, 'recommendations: tags stripped, capped at two', json_encode($ent['recs']));
ok(count($ent['done']) === 2 && $ent['done'][1][0] === 'Security scan', 'task rows: tags stripped, junk rows dropped', json_encode($ent['done']));
ok(date('Y-m-d', $ent['next_ts']) === '2026-10-16', 'next service date parsed from the uploader', date('Y-m-d', $ent['next_ts']));
ok(strpos($ent['url'], 'https://365techies.co.uk/api/pcm-report.php?t=') === 0, 'a signed report link was minted');
ok($e['q']['9001']['dn'] === 'superseded' && $e['q']['9002']['dn'] === 'pending' && $e['q']['9003']['dn'] === 'sent' && $e['q']['9004']['dn'] === 'pending',
   'only the same person, same-time, still-pending visit record is superseded');

$r2 = sr_record($KEY, $MACHINE, $TS, $summary, $cust);
ok(empty($r2['queued']) && $r2['why'] === 'duplicate', 'the same upload never queues twice', json_encode($r2));
$r3 = sr_record($KEY, $MACHINE, $TS + 1, $summary, array('name' => 'No Email'));
ok(empty($r3['queued']) && $r3['why'] === 'no_email', 'a customer with no email on file is reported, not guessed', json_encode($r3));
$r4 = sr_record($KEY, $MACHINE, $TS + 2, array('score' => '73% - Good'), $cust);
$e = q(); $ent4 = $e['sr'][$KH . '-' . $MACHINE . '-' . ($TS + 2)];
ok($ent4['score'] === 73 && $ent4['prev'] === null && $ent4['next_ts'] === $TS + 2 + 42 * 86400, 'an older uploader (text score, no next date) still works', json_encode(array($ent4['score'], $ent4['prev'])));

echo "-- the link\n";
$salt = q(); $salt = $salt['salt'];
$v = sr_token_verify(substr($ent['url'], strlen('https://365techies.co.uk/api/pcm-report.php?t=')), $salt);
ok($v && $v['kh'] === $KH && $v['machine'] === $MACHINE && $v['ts'] === $TS, 'the link verifies back to the report it names', json_encode($v));
$tok = substr($ent['url'], strlen('https://365techies.co.uk/api/pcm-report.php?t='));
$bad = substr($tok, 0, -1) . (substr($tok, -1) === 'a' ? 'b' : 'a');
ok(sr_token_verify($bad, $salt) === null, 'a tampered signature is refused');
ok(sr_token_verify($tok, 'another-salt') === null, 'a link signed with a different salt is refused');
$expired = sr_link($KH, $MACHINE, $TS, time() - 10, $salt);
ok(sr_token_verify(substr($expired, strpos($expired, '?t=') + 3), $salt) === null, 'an expired link is refused');
ok(sr_token_verify('', $salt) === null && sr_token_verify('nonsense', $salt) === null, 'garbage is refused');

echo "-- sending (safe mode)\n";
$p = sr_process(5);
ok(isset($p['mode']) && $p['mode'] === 'safe' && $p['due_waiting'] === 2 && $p['sent'] === 0, 'safe mode counts the due emails and sends none', json_encode($p));
$e = q();
ok($e['sr'][$id]['st'] === 'pending', 'the entry stays pending in safe mode');

echo "-- the words\n";
$html = sr_body_html('Sofia', $ent);
$text = sr_body('Sofia', $ent);
ok(strpos($html, '<!DOCTYPE html') === 0 && substr(rtrim($html), -7) === '</html>', 'HTML is a complete document');
ok(strpos($html, '>81<') !== false && strpos($html, 'Very good') !== false, 'HTML carries the score and verdict');
ok(strpos($text, '81%  Very good') !== false, 'text carries the score and verdict');
ok(strpos($html, 'Up 3 since your last service') !== false && strpos($text, 'Up 3 since your last service') !== false, 'both carry the delta line');
ok(strpos($html, 'Windows updates installed') !== false && strpos($text, 'Windows updates installed') !== false, 'both list the work');
ok(strpos($html, '59% of its original capacity') !== false && strpos($text, '59% of its original capacity') !== false, 'both carry the recommendation');
ok(strpos($html, '&lt;script&gt;') === false && strpos($html, '<script') === false, 'no script reaches the HTML (stripped at queue time, escaped at render)');
ok(strpos($html, '16 October') !== false && strpos($text, '16 October') !== false, 'both carry the next service date');
ok(strpos($html, $ent['url']) !== false && strpos($text, $ent['url']) !== false, 'both carry the report link');
ok(strpos($html, 'Service report · ') !== false && strpos($html, '&amp;middot;') === false, 'the eyebrow is a real dot, not a double-escaped entity');
ok(strpos($html, 'writereview') === false && strpos($text, 'writereview') === false && stripos($html, 'review') === false, 'NO review ask anywhere in it');
ok(strpos($html, 'first Computer Service &amp; Health Check free') !== false, 'the referral panel is present (lawful in a service email)');
ok(strpos($html, 'pcm-review.php?u=') === false, 'no unsubscribe link - it is transactional');
ok(stripos($html, ' vat') === false && stripos($html, 'safe to') === false, 'no VAT, no "safe"');
ok(strpos($text, 'Hi Sofia,') === 0, 'text opens as every email does');
$noscore = $ent; $noscore['score'] = null; $noscore['done'] = array(); $noscore['recs'] = array();
$h2 = sr_body_html('Sofia', $noscore); $t2 = sr_body('Sofia', $noscore);
ok(strpos($h2, '365 health score') === false && strpos($t2, 'HEALTH SCORE') === false, 'no score in the upload = no score panel, nothing invented');
ok(strpos($h2, 'Nothing for you to do') !== false && strpos($t2, 'Nothing for you to do') !== false, 'no recommendations = the honest all-clear line');
$xss = $ent; $xss['pc'] = 'Dell <img src=x onerror=alert(1)>'; $xss['nm'] = 'Sofia';
ok(strpos(sr_body_html('<b>Sofia</b>', $xss), '<img') === false && strpos(sr_body_html('<b>Sofia</b>', $xss), '<b>Sofia') === false, 'name and model cannot inject markup');
ok(sr_subject($ent) === 'Your service report - Dell Latitude 3520, ' . date('j F', $TS), 'subject names the computer and the day', sr_subject($ent));
ok(sr_verdict(88) === 'Excellent' && sr_verdict(78) === 'Very good' && sr_verdict(68) === 'Good' && sr_verdict(55) === 'Fair' && sr_verdict(54) === 'Needs attention', 'verdict bands match the report');

echo "-- the asset register\n";
$aq = $summary; $aq['asset'] = array(
    'pc' => array('date' => '2024-03-14', 'num' => '1187', 'age' => '2 years 5 months', 'line' => 'Dell Latitude 3520 <b>x</b>'),
    'drives' => array(array('model' => 'CT1000P3PSSD8', 'sizeGB' => 932, 'date' => '2024-03-14', 'num' => '1187', 'age' => '2 years 5 months'),
                      array('model' => 'bad', 'date' => 'not-a-date', 'num' => '1', 'age' => 'x')),
    'why' => '', 'source' => 'quickbooks');
sr_record($KEY, $MACHINE, $TS + 50, $aq, $cust);
$e = q(); $ea = $e['sr'][$KH . '-' . $MACHINE . '-' . ($TS + 50)];
ok(is_array($ea['asset']) && $ea['asset']['pc']['num'] === '1187' && count($ea['asset']['drives']) === 1, 'asset block stored: pc kept, the drive with a bad date dropped', json_encode($ea['asset']));
$ah = sr_body_html('Sofia', $ea); $at = sr_body('Sofia', $ea);
ok(strpos($ah, 'bought from us 14 March 2024 - 2 years 5 months ago (invoice 1187)') !== false && strpos($at, 'bought from us 14 March 2024 - 2 years 5 months ago (invoice 1187)') !== false, 'both say when we sold the computer, with the invoice number');
ok(strpos($ah, 'CT1000P3PSSD8 - bought from us') !== false && strpos($at, 'Drive:         CT1000P3PSSD8 - bought from us') !== false, 'both say when we sold the drive');
ok(strpos($ah, '<b>x</b>') === false && strpos($ah, 'quickbooks') === false, 'the invoice line text and the source never reach the email');
ok(strpos(sr_body_html('Sofia', $ent), 'bought from us') === false && strpos(sr_body('Sofia', $ent), 'bought from us') === false, 'no asset = no bought line, nothing invented');
$sd = $ea; $sd['asset']['pc']['age'] = 'days';
ok(strpos(sr_body('Sofia', $sd), 'bought from us 14 March 2024 (invoice 1187)') !== false, 'a purchase this week reads without an age');

echo "-- security\n";
ok(count($ent['sec']) === 3 && $ent['sec'][0][1] === 'ok' && strpos($ent['sec'][0][2], '<') === false && $ent['sec'][2][0] === 'Drive encryption',
   'security rows: state lower-cased, tags stripped, unknown states and junk rows dropped', json_encode($ent['sec']));
ok(strpos($html, '>Security<') !== false && strpos($html, 'Off for: Private') !== false && strpos($html, '#e0961a') !== false && strpos($html, '#1f9d55') !== false,
   'HTML has the Security panel with an amber and a green dot');
ok(strpos($text, "Security\r\n") !== false && strpos($text, '[OK]  Antivirus') !== false && strpos($text, '[!!]  Firewall') !== false && strpos($text, '[--]  Drive encryption') !== false,
   'text has the Security section with state markers');
ok(strpos($html, 'rv_h_security') === false && strpos($html, '>Security<') < strpos($html, 'What we did today'), 'Security sits above the work list');
ok(strpos($html, 'local family business') !== false && strpos($text, 'local family business') !== false
   && strpos($html, 'nobody rings on our behalf') !== false && strpos($text, 'nobody rings on our behalf') !== false,
   'both carry the who-we-are line: local family business, nobody rings on our behalf');
$smp = sr_sample(); $mbrow = null;
foreach ($smp['sec'] as $r) if ($r[0] === 'Malwarebytes') $mbrow = $r;
ok($mbrow !== null && $mbrow[1] === 'info' && strpos(sr_body_html('Steve', $smp), '#9aa7bd') !== false, 'the sample shows a Malwarebytes row in grey (free edition), so the test email exercises all three dot colours');
$nosec = $ent; $nosec['sec'] = array();
ok(strpos(sr_body_html('Sofia', $nosec), '>Security<') === false && strpos(sr_body('Sofia', $nosec), "Security\r\n") === false, 'an older uploader with no security rows gets no Security section, not an empty one');

echo "\n" . ($fails ? $fails . ' FAILED' : 'all passed') . "\n";
exit($fails ? 1 : 0);
