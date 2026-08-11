<?php
/* Review-backfill test suite.  Run:  php api/pcm-rvbf-test.php
 *
 * CLI-ONLY and .htaccess-denied, and it REFUSES TO RUN when a real pcm-data.json
 * is present: bf_seed() reads that file, so running this on the server would pull
 * live customers into the backfill ledger. It builds its own throwaway customer DB
 * and queue and deletes both. Mirrors the pcm-bkpend-test.php pattern.
 *
 * Re-run this after ANY change to the backfill. The suite pins the behaviour that
 * matters legally and reputationally: segmentation, idempotent seeding, the
 * census-not-send default, opt-out precedence, token integrity, and the wording
 * rules (no incentive, no sentiment steering, no asking who attended).
 */
if (PHP_SAPI !== 'cli') { http_response_code(403); exit('cli only'); }

$RV_DB = __DIR__ . '/pcm-data.json';
if (file_exists($RV_DB)) {
    fwrite(STDERR, "REFUSING TO RUN: a real pcm-data.json is present in api/.\n"
                 . "This test seeds from that file and would read live customers.\n");
    exit(1);
}
file_put_contents($RV_DB, json_encode(array('customers' => array(
    'K1' => array('email' => 'plan.one@example.com',  'name' => 'Plan One',   'tier' => 'pro'),
    'K2' => array('email' => 'plan.two@example.com',  'name' => 'Plan Two',   'plan' => 'home-1pc'),
    'K3' => array('email' => 'cat.one@example.com',   'name' => 'Cat One'),
    'K4' => array('email' => 'cat.two@example.com',   'name' => 'Cat Two',    'tier' => 'free'),
    'K5' => array('email' => 'cat.three@example.com', 'name' => 'Cat Three'),
    'K6' => array('name' => 'No Email Here'),
    'K7' => array('email' => 'info@365techies.co.uk', 'name' => 'Us'),
))));
$RV_TMPQ = sys_get_temp_dir() . '/rvbf-test-queue.json';
register_shutdown_function(function () {
    global $RV_DB, $RV_TMPQ;
    @unlink($RV_DB);
    @unlink($RV_TMPQ);
    @unlink($RV_TMPQ . '.lock');
});
@unlink($RV_TMPQ);
@unlink($RV_TMPQ . '.lock');

define('RV_LIB', 1);                 // stops pcm-review.php's HTTP entry point firing
require __DIR__ . '/pcm-review.php';
$RV_Q = $RV_TMPQ;                    // after include: point the queue at the throwaway
/* HARD SAFETY: this suite must never send an email, whatever the live config says.
   Both flags are forced off here, so rv_send() is never reached. Individual tests
   that need to see live-path behaviour flip them locally and put them back. */
$RV_LIVE = false;
$BF_LIVE = false;
/* The senders only run between 09:00 and 20:00 local. Rather than hardcode a
   timezone that happens to be daytime when the suite was written (Asia/Tokyo was
   fine at 1am UK and broke the whole suite by mid-afternoon), find one that puts
   the clock where we need it, whenever this runs. */
function tz_where_hour_is($lo, $hi) {
    for ($off = -11; $off <= 12; $off++) {
        $tz = 'Etc/GMT' . ($off <= 0 ? '+' . (-$off) : '-' . $off);   // Etc/GMT signs are inverted
        date_default_timezone_set($tz);
        $h = (int)date('G');
        if ($h >= $lo && $h <= $hi) return $tz;
    }
    return 'UTC';
}
tz_where_hour_is(10, 18);                  // inside the send window, with margin

$fail = 0;
function ck($name, $cond, $extra = '') {
    global $fail;
    if (!$cond) { $fail++; echo "FAIL  $name  $extra\n"; } else { echo "ok    $name\n"; }
}

/* ---- 1. seeding reads the DB and segments correctly --------------------- */
$seed = bf_seed();
ck('seed ran (no db error)', empty($seed['error']), json_encode($seed));
ck('scanned all 7 customers', $seed['scanned'] === 7, 'scanned=' . $seed['scanned']);
ck('2 plan customers found', (isset($seed['by_segment']['plan']) ? $seed['by_segment']['plan'] : 0) === 2, json_encode($seed['by_segment']));
ck('3 catalogue customers found', (isset($seed['by_segment']['catalogue']) ? $seed['by_segment']['catalogue'] : 0) === 3, json_encode($seed['by_segment']));
ck('customer with no email skipped', $seed['no_email'] === 1, 'no_email=' . $seed['no_email']);
ck('excluded address skipped', $seed['excluded'] === 1, 'excluded=' . $seed['excluded']);

/* ---- 2. seeding is idempotent ------------------------------------------ */
$seed2 = bf_seed();
ck('re-seed adds nobody', $seed2['added'] === 0, 'added=' . $seed2['added']);
ck('re-seed sees them as already known', $seed2['already'] === 5, 'already=' . $seed2['already']);

/* ---- 3. census mode: safe mode must send nothing ---------------------- */
$r = bf_process(3);
ck('census mode when not live', (isset($r['mode']) ? $r['mode'] : '') === 'census', json_encode($r));
ck('only the enabled segment is eligible', (isset($r['eligible_now']) ? $r['eligible_now'] : -1) === 2, json_encode($r));
ck('catalogue held back', !isset($r['by_segment']['catalogue']), json_encode($r['by_segment']));

/* ---- 4. unsubscribe token integrity ----------------------------------- */
$salt = rv_salt();
ck('salt generated', strlen($salt) >= 16, 'salt=' . $salt);
$url = rv_unsub_url('Plan.One@Example.com', $salt);
ck('no plaintext email in the unsub URL', stripos($url, 'plan.one') === false && stripos($url, 'example.com') === false, $url);
preg_match('/u=([a-f0-9]+)&t=([a-f0-9]+)/', $url, $m);
ck('token verifies', hash_equals(rv_unsub_token($m[1], $salt), $m[2]));
ck('tampered token rejected', !hash_equals(rv_unsub_token($m[1], $salt), substr($m[2], 0, -1) . 'f'));
ck('wrong-email token rejected', !hash_equals(rv_unsub_token(sha1('someone.else@example.com'), $salt), $m[2]));

/* ---- 5. an opt-out beats everything ----------------------------------- */
list($lk, $q) = rvq_open();
$q['optout'][$m[1]] = time();                         // as if they clicked unsubscribe
foreach ($q['bf'] as $k => $v) if ($v['em'] === 'plan.one@example.com') unset($q['bf'][$k]);
rvq_save($q); rvq_close($lk);
$seed3 = bf_seed();
ck('opted-out customer not re-added', $seed3['optout'] === 1 && $seed3['added'] === 0, json_encode($seed3));
list($lk, $q) = rvq_open(); $q['bf_ts'] = time() - 120; rvq_save($q); rvq_close($lk);  // age the 60s re-run guard
$r2 = bf_process(3);
ck('re-run guard releases after 60s', !isset($r2['skip']), json_encode($r2));
ck('opted-out customer not eligible', (isset($r2['eligible_now']) ? $r2['eligible_now'] : -1) === 1, json_encode($r2));

/* ---- 6. wording rules (the ones that carry legal/policy risk) ---------- */
$b = bf_body('Steve', 'a@b.com', $salt);
ck('backfill body carries the review URL', strpos($b, 'writereview?placeid=') !== false);
ck('backfill body carries a one-click unsub', strpos($b, 'pcm-review.php?u=') !== false);
ck('backfill body offers no incentive', stripos($b, 'discount') === false && stripos($b, 'free ') === false && stripos($b, 'prize') === false);
ck('backfill body does not steer by sentiment', stripos($b, 'if you are happy') === false && stripos($b, "if you're happy") === false);
ck('backfill body does not ask who attended', stripos($b, 'mention') === false && stripos($b, 'who visited') === false && stripos($b, 'which of us') === false);
$rb = rv_body('Steve', 'a@b.com', $salt);
ck('normal ask uses the URL constant', strpos($rb, 'writereview?placeid=') !== false);
ck('normal ask gained the one-click unsub', strpos($rb, 'pcm-review.php?u=') !== false);
ck('normal ask keeps the reply opt-out route', stripos($rb, 'no thanks') !== false);

/* ---- 6a. cooldown + the 'already reviewed' marker --------------------- */
/* The owner's 6-weekly customers were being asked after every visit because the
   cooldown was 14 days. These pin the fix: a 30-day-old stamp must still block. */
list($lk, $q) = rvq_open();
$q['last'][sha1('plan.two@example.com')] = time() - (30 * 86400);
$q['bf_ts'] = time() - 120;
rvq_save($q); rvq_close($lk);
$rc = bf_process(3);
ck('30-day-old ask still blocks (12-month cooldown)', (isset($rc['eligible_now']) ? $rc['eligible_now'] : -1) === 0, json_encode($rc));

/* the marker suppresses asks permanently, and seeding reports it */
list($lk, $q) = rvq_open();
unset($q['last'][sha1('plan.two@example.com')]);
$q['reviewed'][sha1('plan.two@example.com')] = time();
foreach ($q['bf'] as $k => $v) if ($v['em'] === 'plan.two@example.com') unset($q['bf'][$k]);
$q['bf_ts'] = time() - 120;
rvq_save($q); rvq_close($lk);
$seed4 = bf_seed();
ck('seed skips an already-reviewed customer', (isset($seed4['reviewed']) ? $seed4['reviewed'] : 0) === 1, json_encode($seed4));
$rm2 = bf_process(3);
ck('already-reviewed customer never eligible', (isset($rm2['eligible_now']) ? $rm2['eligible_now'] : -1) === 0, json_encode($rm2));

/* the dedupe prune MUST outlive the cooldown, or the cooldown silently fails */
list($lk, $q) = rvq_open();
$q['last'][sha1('ancient@example.com')] = time() - (100 * 86400);
rvq_save($q); rvq_close($lk);
rv_record('900001', 'prune.probe@example.com', 'Prune Probe', time(), 'create');   // rv_record prunes $q['last']
list($lk, $q) = rvq_open();
$survived = isset($q['last'][sha1('ancient@example.com')]);
rvq_close($lk);
ck('a 100-day-old ask stamp survives the prune', $survived, 'prune window must exceed the 365-day cooldown');

/* ---- 6b. the segmentation plausibility rail --------------------------- */
/* If bf_seed()'s field-name guess is too generous, dormant customers would be
   classified 'plan' and emailed - the thing the owner explicitly excluded. The rail
   must stop that BEFORE any pick, and it must fire regardless of the live flags. */
list($lk, $q) = rvq_open();
for ($i = 0; $i < $BF_PLAN_MAX + 1; $i++)
    $q['bf']['RAIL' . $i] = array('em' => 'rail' . $i . '@example.com', 'nm' => 'Rail ' . $i,
                                  'seg' => 'plan', 'st' => 'pending', 'ts' => time(), 'tries' => 0);
$q['bf_ts'] = time() - 120;
rvq_save($q); rvq_close($lk);
$rr = bf_process(3);
ck('implausible plan segment refuses to send', (isset($rr['skip']) ? $rr['skip'] : '') === 'segment_implausible', json_encode($rr));
ck('rail reports the count it saw', (isset($rr['plan_in_ledger']) ? $rr['plan_in_ledger'] : 0) > $BF_PLAN_MAX, json_encode($rr));
/* tidy the rail entries back out so the later tests see a clean ledger */
list($lk, $q) = rvq_open();
foreach ($q['bf'] as $k => $v) if (strpos($k, 'RAIL') === 0) unset($q['bf'][$k]);
$q['bf_ts'] = time() - 120;
rvq_save($q); rvq_close($lk);
ck('ledger clean again after the rail test', (isset(bf_process(3)['skip']) ? bf_process(3)['skip'] : '') !== 'segment_implausible');

/* ---- 6c. Slack lines must name who was asked -------------------------- */
/* Owner-reported: "review asks sent 3" told him nothing about WHO. */
ck('empty list adds nothing', rv_name_list(array()) === '');
ck('names are listed', rv_name_list(array('Margaret Hall', 'Brian Webb')) === ' - Margaret Hall, Brian Webb',
   rv_name_list(array('Margaret Hall', 'Brian Webb')));
ck('blank entries are dropped', rv_name_list(array('Margaret Hall', '', '  ')) === ' - Margaret Hall');
$many = array_map(function ($i) { return 'Person ' . $i; }, range(1, 11));
ck('long lists are capped with a count', strpos(rv_name_list($many, 8), 'and 3 more') !== false, rv_name_list($many, 8));
ck('capped list shows exactly 8 names', substr_count(rv_name_list($many, 8), 'Person ') === 8, rv_name_list($many, 8));

/* ---- 7. quiet hours still guard --------------------------------------- */
tz_where_hour_is(0, 5);                    // somewhere it is the small hours
$hr = (int)date('G');
if ($hr < 9 || $hr >= 20) {
    $rq = bf_process(3);
    ck('quiet hours block sends', (isset($rq['skip']) ? $rq['skip'] : '') === 'quiet_hours', json_encode($rq));
} else {
    echo "skip  quiet-hours test (no timezone found outside the send window)\n";
}

echo "\n" . ($fail === 0 ? "ALL TESTS PASSED\n" : "$fail TEST(S) FAILED\n");
exit($fail === 0 ? 0 : 1);
