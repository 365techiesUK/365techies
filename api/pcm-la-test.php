<?php
/* "We're now on LinkedIn" one-off email - test suite.   Run:  php api/pcm-la-test.php
 *
 * CLI-only and .htaccess-denied. Builds its own throwaway customer DB and queue in the temp
 * folder (never api/pcm-data.json) and deletes both. It can NEVER send: the live-path checks
 * run through la_send()'s test stub, which only records who would have been mailed.
 * Pins what matters (owner, 25 Oct 2026): it ships OFF (a census, no sends), plan customers
 * only, opt-outs win, one email per address ever, the day cap, quiet hours, the end date,
 * and the words: the LinkedIn link, a working unsubscribe, the right legal line, one button.
 */
if (PHP_SAPI !== 'cli') { http_response_code(403); exit('cli only'); }

$LA_DB = sys_get_temp_dir() . '/la-test-db.json';
$LA_TMPQ = sys_get_temp_dir() . '/la-test-queue.json';
register_shutdown_function(function () { global $LA_DB, $LA_TMPQ; @unlink($LA_DB); @unlink($LA_TMPQ); @unlink($LA_TMPQ . '.lock'); });
@unlink($LA_TMPQ); @unlink($LA_TMPQ . '.lock');
file_put_contents($LA_DB, json_encode(array('customers' => array(
    'K1' => array('email' => 'plan.one@example.com',   'name' => 'Plan One',   'tier' => 'pro'),
    'K2' => array('email' => 'plan.two@example.com',   'name' => 'Plan Two',   'plan' => 'home-1pc'),
    'K3' => array('email' => 'Plan.One@Example.com',   'name' => 'Same Inbox', 'dd_ref' => 'X1'),     // shares K1's inbox
    'K4' => array('email' => 'cat.one@example.com',    'name' => 'Cat One'),                          // no plan
    'K5' => array('email' => 'gone@example.com',       'name' => 'Opted Out',  'tier' => 'pro'),
    'K6' => array('name' => 'No Email', 'tier' => 'pro'),
    'K7' => array('email' => 'info@365techies.co.uk',  'name' => 'Us',         'tier' => 'pro'),
))));

define('RV_LIB', 1);
require __DIR__ . '/pcm-review.php';
$RV_Q = $LA_TMPQ;
// HARD SAFETY: every other mailer off; the LinkedIn sends go only to the stub below
$RV_LIVE = false; $BF_LIVE = false; $SR_LIVE = false; $DN_LIVE = false; $CF_LIVE = false; $RM_LIVE = false;
$SENT = array();
$LA_TEST_SEND = function ($to, $nm) { global $SENT; $SENT[] = $to; return true; };

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

echo "-- it is switched on (owner, 1 Nov 2026)\n";
ck('LA_LIVE is on in the file', strpos(file_get_contents(__DIR__ . '/pcm-review.php'), "\$LA_LIVE = true;") !== false);

echo "-- seeding\n";
// K5 opted out of our emails before (one shared list with the review asks)
list($lk, $q) = rvq_open(); $q['optout'][sha1('gone@example.com')] = time(); rvq_save($q); rvq_close($lk);
$s = la_seed($LA_DB);
ck('seed ran', empty($s['error']) && empty($s['skip']), json_encode($s));
ck('scanned all 7', $s['scanned'] === 7, json_encode($s));
ck('plan customers only: 3 added (K1, K2, K3)', $s['added'] === 3, json_encode($s));
ck('the no-plan customer is left out', $s['not_plan'] === 1, json_encode($s));
ck('the opted-out customer is never added', $s['optout'] === 1 && !isset(qq()['la']['K5']), json_encode($s));
ck('our own address is excluded', $s['excluded'] === 1 && !isset(qq()['la']['K7']));
ck('no email = skipped', $s['no_email'] === 1);
$s2 = la_seed($LA_DB);
ck('seeding twice adds nobody new', $s2['added'] === 0 && $s2['already'] === 3, json_encode($s2));

echo "-- while off: a census, never a send\n";
$LA_LIVE = false; $RV_LIVE = true;
$r = la_process(10);
ck('census mode', isset($r['mode']) && $r['mode'] === 'census', json_encode($r));
ck('two inboxes would get it (K1 and K3 share one)', $r['eligible_now'] === 2, json_encode($r));
ck('nothing sent while off', count($SENT) === 0);
ck('nothing marked sending while off', count(array_filter(qq()['la'], function ($e) { return $e['st'] !== 'pending'; })) === 0);
$LA_LIVE = true; $RV_LIVE = false;
$q0 = qq(); $q0['la_ts'] = 0; file_put_contents($RV_Q, json_encode($q0));
$r = la_process(10);
ck('the global kill switch ($RV_LIVE off) also stops it', $r['mode'] === 'census' && count($SENT) === 0, json_encode($r));

echo "-- live (through the stub only)\n";
$LA_LIVE = true; $RV_LIVE = true; $LA_DAY_CAP = 1;
$q0 = qq(); $q0['la_ts'] = 0; file_put_contents($RV_Q, json_encode($q0));
$r = la_process(10);
ck('the day cap holds: 1 sent', $r['mode'] === 'live' && $r['sent'] === 1 && count($SENT) === 1, json_encode($r));
$LA_DAY_CAP = 10;
$q0 = qq(); $q0['la_ts'] = 0; file_put_contents($RV_Q, json_encode($q0));
$r = la_process(10);
ck('the rest go next run: 1 more', $r['sent'] === 1 && count($SENT) === 2, json_encode($r) . ' ' . json_encode($SENT));
ck('one email per INBOX: the shared address got exactly one', count(array_unique(array_map('strtolower', $SENT))) === 2 && count(array_keys(array_map('strtolower', $SENT), 'plan.one@example.com')) === 1, json_encode($SENT));
ck('the opted-out customer never got one', !in_array('gone@example.com', $SENT, true));
$q0 = qq(); $q0['la_ts'] = 0; file_put_contents($RV_Q, json_encode($q0));
$r = la_process(10);
ck('a third run sends nothing: it is a one-off', $r['sent'] === 0 && count($SENT) === 2, json_encode($r));
ck('the day tally is recorded', array_sum(qq()['la_day']) === 2, json_encode(qq()['la_day']));
ck('a run inside a minute is throttled', isset(la_process(10)['skip']));

echo "-- an unsubscribe after seeding still wins\n";
file_put_contents($LA_DB, json_encode(array('customers' => array('K8' => array('email' => 'late@example.com', 'name' => 'Late', 'tier' => 'pro')))));
la_seed($LA_DB);
list($lk, $q) = rvq_open(); $q['optout'][sha1('late@example.com')] = time(); $q['la_ts'] = 0; rvq_save($q); rvq_close($lk);
$r = la_process(10);
ck('opted out between seed and send = not sent', !in_array('late@example.com', $SENT, true) && $r['sent'] === 0, json_encode($r));

echo "-- quiet hours and the end date\n";
tz_where_hour_is(21, 23);
$q0 = qq(); $q0['la_ts'] = 0; file_put_contents($RV_Q, json_encode($q0));
ck('quiet hours block it', (la_process(10)['skip'] ?? '') === 'quiet_hours');
tz_where_hour_is(10, 18);
$keep = $LA_UNTIL; $LA_UNTIL = time() - 1;
ck('after the end date: no seeding', (la_seed($LA_DB)['skip'] ?? '') === 'campaign_over');
ck('after the end date: no sending', (la_process(10)['skip'] ?? '') === 'campaign_over');
$LA_UNTIL = $keep;

echo "-- the 5-minute poll's campaign tick (2 Nov 2026)\n";
$MSR_LIVE = false; $BF_LIVE = false;   // only the LinkedIn email can reach the stub here
$LA_LIVE = true; $RV_LIVE = true; $SENT = array();
list($lk, $q) = rvq_open(); unset($q['camp_ts']); $q['la_ts'] = 0; $q['la_day'] = array(); foreach ($q['la'] as $k => $v) { $q['la'][$k]['st'] = 'pending'; unset($q['la'][$k]['tries'], $q['la'][$k]['snd_ts'], $q['la'][$k]['sent_ts']); } rvq_save($q); rvq_close($lk);
$t1 = camp_tick(1800, $LA_DB);
ck('first tick runs the three campaigns', isset($t1['linkedin'], $t1['backfill'], $t1['storereview']), json_encode($t1));
ck('the tick goes through la_process (it sent)', ($t1['linkedin']['result']['mode'] ?? '') === 'live', json_encode($t1['linkedin'] ?? null));
$t2 = camp_tick(1800, $LA_DB);
ck('a second tick inside 30 minutes does nothing', ($t2['skip'] ?? '') === 'not_yet', json_encode($t2));
list($lk, $q) = rvq_open(); $q['camp_ts'] = time() - 1801; $q['la_ts'] = 0; rvq_save($q); rvq_close($lk);
$t3 = camp_tick(1800, $LA_DB);
ck('after 30 minutes it runs again', isset($t3['linkedin']), json_encode($t3));
ck('no address is mailed twice across ticks', count($SENT) === count(array_unique(array_map('strtolower', $SENT))), json_encode($SENT));
ck('the poll calls the tick', strpos(file_get_contents(__DIR__ . '/pcm-bkpoll.php'), 'camp_tick(1800)') !== false);

echo "-- the words\n";
$salt = 'testsalt';
$t = la_body('Margaret', 'plan.one@example.com', $salt);
$h = la_body_html('Margaret', 'plan.one@example.com', $salt);
$u = rv_unsub_url('plan.one@example.com', $salt);
ck('subject', la_subject() === "We're now on LinkedIn");
ck('text opens as every email does', strpos($t, 'Hi Margaret,') === 0);
ck('both carry the LinkedIn page link', strpos($t, 'https://www.linkedin.com/company/365techies/') !== false && strpos($h, 'https://www.linkedin.com/company/365techies/') !== false);
ck('both carry a working one-click unsubscribe', strpos($t, $u) !== false && strpos($h, htmlspecialchars($u, ENT_QUOTES, 'UTF-8')) !== false);
ck('both reassure people who are not on LinkedIn', strpos($t, 'Not on LinkedIn?') !== false && strpos($h, 'Not on LinkedIn?') !== false);
ck('the legal line is the marketing one', strpos($h, 'You are receiving this because you are a 365 Techies customer.') !== false && strpos($h, 'it is about the service you pay for') === false);
ck('exactly one big button (the LinkedIn follow)', substr_count($h, 'background-color:#1d97e3;border-radius:9px;mso-padding-alt') === 1 && strpos($h, 'Follow 365 Techies on LinkedIn') !== false);
// (not a bare "review": the unsubscribe link itself lives at pcm-review.php)
ck('no review ask in it', stripos($t . $h, 'writereview') === false && stripos($t . $h, 'Google review') === false && stripos($t . $h, 'leave us a') === false);
ck('the referral offer matches the service report', strpos($t, 'first Computer Service & Health Check free') !== false && strpos($h, 'first Computer Service &amp; Health Check free') !== false);
ck('a name cannot inject markup', strpos(la_body_html('<b>X</b>', 'a@b.co', $salt), '<b>X') === false);
ck('no "small", no VAT, no shop', stripos($t . $h, ' small ') === false && stripos($t . $h, ' vat') === false && stripos($t . $h, ' shop') === false);

echo $fail ? "\n$fail FAILED\n" : "\nALL TESTS PASSED\n";
exit($fail ? 1 : 0);
