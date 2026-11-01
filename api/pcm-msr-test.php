<?php
/* "Would you rate 365 PC Manager?" Microsoft Store review ask - test suite.   Run:  php api/pcm-msr-test.php
 *
 * CLI-only and .htaccess-denied. Builds its own throwaway customer DB and queue in the temp
 * folder (never api/pcm-data.json) and deletes both. It can NEVER send: the live-path checks
 * run through msr_send()'s test stub, which only records who would have been mailed.
 * Pins what matters (owner, 1 Nov 2026): it ships OFF (a census, no sends), it goes to everyone
 * who uses PC Manager (plan or not, never picked by what we guess they think), opt-outs win, one
 * email per address ever, nothing before 11 Nov, never within a fortnight of the LinkedIn email,
 * the day cap, quiet hours, the end date, and the words: no reward offered, one button, a working
 * unsubscribe, and a ?rate page that opens the Store's review form.
 */
if (PHP_SAPI !== 'cli') { http_response_code(403); exit('cli only'); }

$MSR_DB = sys_get_temp_dir() . '/msr-test-db.json';
$MSR_TMPQ = sys_get_temp_dir() . '/msr-test-queue.json';
register_shutdown_function(function () { global $MSR_DB, $MSR_TMPQ; @unlink($MSR_DB); @unlink($MSR_TMPQ); @unlink($MSR_TMPQ . '.lock'); });
@unlink($MSR_TMPQ); @unlink($MSR_TMPQ . '.lock');
$recent = gmdate('Y-m-d H:i', time() - 3 * 86400);     // PC Manager's own 'seen' format
$stale  = gmdate('Y-m-d H:i', time() - 90 * 86400);
$pc = function ($seen) { return array('m1' => array('name' => 'PC', 'score' => 80, 'seen' => $seen)); };
file_put_contents($MSR_DB, json_encode(array('customers' => array(
    'K1' => array('email' => 'plan.one@example.com', 'name' => 'Plan One',   'tier' => 'pro', 'machines' => $pc($recent)),
    'K2' => array('email' => 'cat.two@example.com',  'name' => 'Cat Two',                     'machines' => $pc($recent)),  // no plan: still asked
    'K3' => array('email' => 'Plan.One@Example.com', 'name' => 'Same Inbox', 'dd_ref' => 'X', 'machines' => $pc($recent)),  // shares K1's inbox
    'K4' => array('email' => 'stale@example.com',    'name' => 'Stale PC',   'tier' => 'pro', 'machines' => $pc($stale)),   // not seen in 45 days
    'K5' => array('email' => 'nopc@example.com',     'name' => 'No PC',      'tier' => 'pro'),
    'K6' => array('email' => 'gone@example.com',     'name' => 'Opted Out',  'tier' => 'pro', 'machines' => $pc($recent)),
    'K7' => array('name' => 'No Email', 'machines' => $pc($recent)),
    'K8' => array('email' => 'info@365techies.co.uk', 'name' => 'Us', 'machines' => $pc($recent)),
    'K9' => array('email' => 'nodate@example.com',   'name' => 'No Date',    'machines' => array('m1' => array('name' => 'PC'))),
))));

define('RV_LIB', 1);
require __DIR__ . '/pcm-review.php';
$RV_Q = $MSR_TMPQ;
// HARD SAFETY: every other mailer off; the Store review sends go only to the stub below
$RV_LIVE = false; $BF_LIVE = false; $SR_LIVE = false; $DN_LIVE = false; $CF_LIVE = false; $RM_LIVE = false; $LA_LIVE = false;
$SENT = array();
$MSR_TEST_SEND = function ($to, $nm) { global $SENT; $SENT[] = $to; return true; };
$LA_TEST_SEND = function ($to, $nm) { return true; };

function tz_where_hour_is($lo, $hi) {
    for ($off = -11; $off <= 12; $off++) {
        date_default_timezone_set('Etc/GMT' . ($off <= 0 ? '+' . (-$off) : '-' . $off));   // Etc/GMT signs are inverted
        $h = (int)date('G');
        if ($h >= $lo && $h <= $hi) return true;
    }
    return false;
}
tz_where_hour_is(10, 18);
$fail = 0;
function ck($name, $cond, $extra = '') { global $fail; if (!$cond) { $fail++; echo "FAIL  $name  $extra\n"; } else echo "ok    $name\n"; }
function qq() { global $RV_Q; return json_decode((string)file_get_contents($RV_Q), true); }
function unthrottle() { global $RV_Q; $q0 = qq(); $q0['msr_ts'] = 0; file_put_contents($RV_Q, json_encode($q0)); }

echo "-- it ships off, and not before 11 Nov\n";
$src = file_get_contents(__DIR__ . '/pcm-review.php');
ck('MSR_LIVE ships false in the file', strpos($src, "\$MSR_LIVE = false;") !== false);
ck('MSR_FROM is 11 Nov 2026', gmdate('Y-m-d H:i', $MSR_FROM) === '2026-11-11 00:00');
ck('MSR_UNTIL is 31 Jan 2027', gmdate('Y-m-d H:i', $MSR_UNTIL) === '2027-01-31 00:00');
ck('the gap is a fortnight', $MSR_GAP === 14 * 86400);

echo "-- seeding: everyone who uses PC Manager\n";
list($lk, $q) = rvq_open(); $q['optout'][sha1('gone@example.com')] = time(); rvq_save($q); rvq_close($lk);
$s = msr_seed($MSR_DB);
ck('seed ran', empty($s['error']) && empty($s['skip']), json_encode($s));
ck('scanned all 9', $s['scanned'] === 9, json_encode($s));
ck('3 added: K1, K2 (no plan, still asked) and K3', $s['added'] === 3 && isset(qq()['msr']['K2']), json_encode($s));
ck('no PC seen lately, no PC, or no check-in date = left out', $s['no_pcm'] === 3 && !isset(qq()['msr']['K4']) && !isset(qq()['msr']['K9']), json_encode($s));
ck('the opted-out customer is never added', $s['optout'] === 1 && !isset(qq()['msr']['K6']), json_encode($s));
ck('our own address is excluded', $s['excluded'] === 1 && !isset(qq()['msr']['K8']));
ck('no email = skipped', $s['no_email'] === 1);
$s2 = msr_seed($MSR_DB);
ck('seeding twice adds nobody new', $s2['added'] === 0 && $s2['already'] === 3, json_encode($s2));

echo "-- while off, or before 11 Nov: a census, never a send\n";
$MSR_FROM = time() - 60;
$MSR_LIVE = false; $RV_LIVE = true;
$r = msr_process(10);
ck('census mode while off', isset($r['mode']) && $r['mode'] === 'census' && $r['live'] === false, json_encode($r));
ck('two inboxes would get it (K1 and K3 share one)', $r['eligible_now'] === 2, json_encode($r));
ck('nothing sent while off', count($SENT) === 0);
ck('nothing marked sending while off', count(array_filter(qq()['msr'], function ($e) { return $e['st'] !== 'pending'; })) === 0);
$MSR_LIVE = true; $RV_LIVE = false; unthrottle();
$r = msr_process(10);
ck('the global kill switch ($RV_LIVE off) also stops it', $r['mode'] === 'census' && count($SENT) === 0, json_encode($r));
$MSR_LIVE = true; $RV_LIVE = true; $MSR_FROM = time() + 86400; unthrottle();
$r = msr_process(10);
ck('switched on but before the start date: census only', $r['mode'] === 'census' && $r['live'] === true && count($SENT) === 0, json_encode($r));
$MSR_FROM = time() - 60;

echo "-- never close to the LinkedIn email\n";
// K2's inbox had the LinkedIn email 3 days ago; K1's inbox is still waiting for it
list($lk, $q) = rvq_open();
$q['la']['K2'] = array('em' => 'cat.two@example.com', 'nm' => 'Cat Two', 'st' => 'sent', 'sent_ts' => time() - 3 * 86400, 'tries' => 1);
$q['la']['K1'] = array('em' => 'plan.one@example.com', 'nm' => 'Plan One', 'st' => 'pending', 'ts' => time(), 'tries' => 0);
$q['msr_ts'] = 0;
rvq_save($q); rvq_close($lk);
$LA_LIVE = true; $LA_UNTIL = time() + 86400 * 30;
$r = msr_process(10);
ck('both inboxes held: one had LinkedIn 3 days ago, one is still to get it', $r['sent'] === 0 && $r['held_for_linkedin'] === 2 && count($SENT) === 0, json_encode($r));
$LA_LIVE = false; unthrottle();
$r = msr_process(10);
ck('with the LinkedIn email off, a pending one holds nobody', in_array('plan.one@example.com', array_map('strtolower', $SENT), true) && !in_array('cat.two@example.com', $SENT, true), json_encode($r) . ' ' . json_encode($SENT));
$q0 = qq(); $q0['la']['K2']['sent_ts'] = time() - 15 * 86400; $q0['msr_ts'] = 0; file_put_contents($RV_Q, json_encode($q0));
$r = msr_process(10);
ck('a fortnight after LinkedIn, it goes', in_array('cat.two@example.com', $SENT, true), json_encode($r) . ' ' . json_encode($SENT));

echo "-- a shared inbox already sent its LinkedIn email never holds the other record\n";
// fresh queue: K3 shares K1's inbox; K1 got LinkedIn long ago, K3's LinkedIn record sits 'pending' for ever
@unlink($RV_Q); $SENT = array();
file_put_contents($MSR_DB, json_encode(array('customers' => array(
    'K3' => array('email' => 'plan.one@example.com', 'name' => 'Same Inbox', 'machines' => $pc($recent))))));
msr_seed($MSR_DB);
list($lk, $q) = rvq_open();
$q['la']['K1'] = array('em' => 'plan.one@example.com', 'st' => 'sent', 'sent_ts' => time() - 30 * 86400, 'tries' => 1);
$q['la']['K3'] = array('em' => 'plan.one@example.com', 'st' => 'pending', 'ts' => time(), 'tries' => 0);
rvq_save($q); rvq_close($lk);
$LA_LIVE = true;
$r = msr_process(10);
ck('not held by its twin\'s stuck LinkedIn record', $r['sent'] === 1 && $r['held_for_linkedin'] === 0, json_encode($r));
$LA_LIVE = false;

echo "-- the day cap, one per inbox, a one-off\n";
@unlink($RV_Q); $SENT = array();
file_put_contents($MSR_DB, json_encode(array('customers' => array(
    'A1' => array('email' => 'a1@example.com', 'name' => 'A One', 'machines' => $pc($recent)),
    'A2' => array('email' => 'a2@example.com', 'name' => 'A Two', 'machines' => $pc($recent)),
    'A3' => array('email' => 'A1@example.com', 'name' => 'A Three', 'machines' => $pc($recent))))));
msr_seed($MSR_DB);
$MSR_DAY_CAP = 1;
$r = msr_process(10);
ck('the day cap holds: 1 sent', $r['mode'] === 'live' && $r['sent'] === 1 && count($SENT) === 1, json_encode($r));
$MSR_DAY_CAP = 10; unthrottle();
$r = msr_process(10);
ck('the rest go next run: 1 more', $r['sent'] === 1 && count($SENT) === 2, json_encode($r) . ' ' . json_encode($SENT));
ck('one email per INBOX', count(array_unique(array_map('strtolower', $SENT))) === 2, json_encode($SENT));
unthrottle();
$r = msr_process(10);
ck('a third run sends nothing: it is a one-off', $r['sent'] === 0 && count($SENT) === 2, json_encode($r));
ck('the day tally is recorded', array_sum(qq()['msr_day']) === 2, json_encode(qq()['msr_day']));
ck('a run inside a minute is throttled', isset(msr_process(10)['skip']));

echo "-- an unsubscribe after seeding still wins\n";
file_put_contents($MSR_DB, json_encode(array('customers' => array('L1' => array('email' => 'late@example.com', 'name' => 'Late', 'machines' => $pc($recent))))));
msr_seed($MSR_DB);
list($lk, $q) = rvq_open(); $q['optout'][sha1('late@example.com')] = time(); $q['msr_ts'] = 0; rvq_save($q); rvq_close($lk);
$r = msr_process(10);
ck('opted out between seed and send = not sent', !in_array('late@example.com', $SENT, true) && $r['sent'] === 0, json_encode($r));

echo "-- quiet hours and the end date\n";
tz_where_hour_is(21, 23); unthrottle();
ck('quiet hours block it', (msr_process(10)['skip'] ?? '') === 'quiet_hours');
tz_where_hour_is(10, 18);
$keep = $MSR_UNTIL; $MSR_UNTIL = time() - 1;
ck('after the end date: no seeding', (msr_seed($MSR_DB)['skip'] ?? '') === 'campaign_over');
ck('after the end date: no sending', (msr_process(10)['skip'] ?? '') === 'campaign_over');
$MSR_UNTIL = $keep;

echo "-- the words\n";
$salt = 'testsalt';
$t = msr_body('Margaret', 'a1@example.com', $salt);
$h = msr_body_html('Margaret', 'a1@example.com', $salt);
$u = rv_unsub_url('a1@example.com', $salt);
$all = $t . $h;
ck('subject', msr_subject() === 'Would you rate 365 PC Manager?');
ck('text opens as every email does', strpos($t, 'Hi Margaret,') === 0);
ck('signed David and Steve', strpos($t, "David & Steve\r\n") !== false && strpos($t, 'A quick one from David and Steve') !== false);
ck('both carry the ?rate link', strpos($t, 'https://365techies.co.uk/api/pcm-review.php?rate=1') !== false && strpos($h, 'https://365techies.co.uk/api/pcm-review.php?rate=1') !== false);
ck('both carry a working one-click unsubscribe', strpos($t, $u) !== false && strpos($h, htmlspecialchars($u, ENT_QUOTES, 'UTF-8')) !== false);
ck('both ask for an HONEST review, good or bad', stripos($t, 'honest reviews') !== false && stripos($t, 'good or') !== false && stripos($h, 'good or bad') !== false);
ck('both say a sign-in can simply be skipped', strpos($t, 'just skip it') !== false && strpos($h, 'just skip it') !== false);
ck('both say to open it on the Windows computer', strpos($t, 'on your Windows computer') !== false && strpos($h, 'on your Windows computer') !== false);
ck('nothing offered in return', !preg_match('/\b(free month|month free|discount|voucher|prize|reward|draw|in return|thank-you gift)\b/i', $all));
ck('never asks for five stars', stripos($all, 'five star') === false && stripos($all, '5 star') === false && stripos($all, '5-star') === false);
ck('no referral pitch in it: one ask per email', stripos($all, 'first Computer Service') === false);
ck('the legal line is the marketing one', strpos($h, 'You are receiving this because you are a 365 Techies customer.') !== false && strpos($h, 'it is about the service you pay for') === false);
ck('exactly one big button (Rate 365 PC Manager)', substr_count($h, 'background-color:#1d97e3;border-radius:9px;mso-padding-alt') === 1 && strpos($h, 'Rate 365 PC Manager') !== false);
ck('a name cannot inject markup', strpos(msr_body_html('<b>X</b>', 'a@b.co', $salt), '<b>X') === false);
ck('no "small", no VAT, no shop', stripos($all, 'small') === false && stripos($all, ' vat') === false && stripos($all, ' shop') === false);

echo "-- the ?rate page\n";
$p = msr_landing_html();
ck('opens the Store review form for 365 PC Manager', strpos($p, 'href="ms-windows-store://review/?ProductId=XP99J1CFV8W876"') !== false);
ck('kept out of search', strpos($p, 'noindex') !== false);
ck('tells a phone, iPad or Mac reader to use the PC', strpos($p, 'On a phone, iPad or Mac?') !== false);
ck('a way in if the button fails, and the web listing', strpos($p, 'search for <strong>365 PC Manager</strong>') !== false && strpos($p, 'https://apps.microsoft.com/detail/XP99J1CFV8W876') !== false);
ck('no script, nothing personal', stripos($p, '<script') === false && strpos($p, '@') === false);
ck('honest, not five stars', strpos($p, 'Good or bad, an honest review is what helps.') !== false && stripos($p, 'five star') === false);

echo $fail ? "\n$fail FAILED\n" : "\nALL TESTS PASSED\n";
exit($fail ? 1 : 0);
