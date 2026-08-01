<?php
/**
 * Tests for the abandoned-booking sweep.  Run:  php api/pcm-bkpend-test.php
 *
 * Exists because writing this caught a real bug: the "send it again" button
 * re-posts join with no name or phone, which blanked the very record we had
 * just captured - and resend is clicked by exactly the customer most likely to
 * abandon. Tests 12-17 below are that bug, pinned.
 *
 * THREE SAFETY RAILS, because this touches the same store the live site writes:
 *   1. CLI only - a web request exits immediately.
 *   2. Refuses to run if the store already holds records, so it can never
 *      clobber real half-finished bookings on the server.
 *   3. Also denied over HTTP in the root .htaccess. Belt to that braces.
 */
if (php_sapi_name() !== 'cli') { http_response_code(404); exit; }
require_once __DIR__ . '/pcm-bkpend-lib.php';
if (bkpend_load()) {
    fwrite(STDERR, "refusing to run: the store holds live records
");
    exit(2);
}


$STORE = bkpend_file();
$BACKUP = $STORE . '.testbackup';
if (file_exists($STORE)) rename($STORE, $BACKUP);

$sent = array();
function spy($msg) { global $sent; $sent[] = $msg; return true; }

$fails = 0;
function ok($cond, $what) {
    global $fails;
    echo ($cond ? "  PASS  " : "  FAIL  ") . $what . "\n";
    if (!$cond) $fails++;
}

// --- seed three records -----------------------------------------------------
bkpend_add('fresh@example.com', 'Fresh Freda', '07700 900001');
bkpend_add('stale@example.com', 'Stale Steve', '01202 775566',
           array('what' => 'Computer service', 'when' => 'Tue 5 Aug at 10:00am'));
bkpend_add('told@example.com',  'Told Tina',   '07700 900003');

// backdate the two that should be old enough, and mark one already reported
$c = bkpend_load();
$c[sha1('stale@example.com')]['ts'] = time() - (BKPEND_AGE + 120);
$c[sha1('told@example.com')]['ts']  = time() - (BKPEND_AGE + 120);
$c[sha1('told@example.com')]['told'] = 1;
bkpend_save($c);

// --- sweep ------------------------------------------------------------------
$r = bkpend_sweep('spy');

ok($r['told'] === 1, "reports exactly one record (got {$r['told']})");
ok(count($sent) === 1, "sends exactly one Slack line (got " . count($sent) . ")");
ok(strpos(implode('', $sent), 'Stale Steve') !== false, "reports the STALE one");
ok(strpos(implode('', $sent), 'Fresh Freda') === false, "does NOT report the fresh one");
ok(strpos(implode('', $sent), 'Told Tina')   === false, "does NOT re-report an already-told one");
ok(strpos(implode('', $sent), '01202 775566') !== false, "includes the phone number to ring");
ok(strpos(implode('', $sent), 'Computer service') !== false, "includes what they wanted");
ok(strpos(implode('', $sent), 'Tue 5 Aug at 10:00am') !== false, "includes the slot they picked");

// --- idempotence ------------------------------------------------------------
$sent = array();
$r2 = bkpend_sweep('spy');
ok($r2['told'] === 0 && count($sent) === 0, "a second sweep re-reports nothing");

// --- completing a booking clears it ----------------------------------------
bkpend_clear('fresh@example.com');
$c = bkpend_load();
ok(!isset($c[sha1('fresh@example.com')]), "bkpend_clear removes a completed booking");

// --- retention --------------------------------------------------------------
$c[sha1('stale@example.com')]['ts'] = time() - (BKPEND_TTL + 60);
bkpend_save($c);
bkpend_sweep('spy');
$c = bkpend_load();
ok(!isset($c[sha1('stale@example.com')]), "records older than the TTL are pruned");

// --- the resend must not blank what we already captured ---------------------
bkpend_add('resend@example.com', 'Ruby Resend', '07700 900009',
           array('what' => 'Laptop repair', 'when' => 'Wed at 2pm'));
$c = bkpend_load();
$c[sha1('resend@example.com')]['ts'] = time() - (BKPEND_AGE + 300);   // already old
bkpend_save($c);
bkpend_add('resend@example.com', '', '');            // the "send it again" shape
$row = bkpend_load();
$row = $row[sha1('resend@example.com')];
ok($row['name']  === 'Ruby Resend',  "resend does not blank the name");
ok($row['phone'] === '07700 900009', "resend does not blank the phone");
ok($row['what']  === 'Laptop repair', "resend does not blank what they wanted");
ok($row['ts'] <= time() - BKPEND_AGE, "resend does not reset the clock (would defer the nudge forever)");
$sent = array();
ok(bkpend_sweep('spy')['told'] === 1, "a resent-then-abandoned booking still gets reported");
ok(strpos(implode('', $sent), '07700 900009') !== false, "and still carries the phone");
bkpend_clear('resend@example.com');

// --- sanitisation -----------------------------------------------------------
ok(bkpend_clean("Bob\n<b>x</b>") === 'Bob bx/b', "strips newlines and angle brackets");
ok(strlen(bkpend_clean(str_repeat('a', 500))) === 80, "caps length at 80");

// --- the security invariant -------------------------------------------------
$src = file_get_contents(__DIR__ . '/pcm-booking.php');
ok(strpos($src, "bkpend_add(\$email,") !== false, "join parks details under bkpend_add");
ok(!preg_match('/bkpend_add\([^)]*\$mobile/', $src),
   "the SMS-destination \$mobile is never what gets parked");
$js = file_get_contents(__DIR__ . '/../booking_app.py');
ok(strpos($js, "bk_phone: S.phone") !== false, "client sends the phone as bk_phone");
ok(!preg_match("/action: 'join'[^}]*mobile:/", $js), "client never sends it as `mobile`");

// --- restore ----------------------------------------------------------------
@unlink($STORE);
@unlink(__DIR__ . '/pcm-bkpend.lock');
@unlink(__DIR__ . '/pcm-bkpend.lock');
if (file_exists($BACKUP)) rename($BACKUP, $STORE);

echo "\n" . ($fails ? "$fails FAILED\n" : "all passed\n");
exit($fails ? 1 : 0);
