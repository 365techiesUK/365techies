<?php
/**
 * Tests for the staff diary's phone fallback.  Run:  php api/pcm-agenda-phone-test.php
 *
 * The bug being protected against: the diary read its phone number ONLY from
 * SimplyBook's getBookings row. That key is absent on some rows, so a customer
 * whose number we hold - sometimes typed by the customer themselves in their own
 * portal - was shown to staff as "no number on file - check SimplyBook".
 *
 * The rules that matter here:
 *   1. SimplyBook's own number always wins. We never override it.
 *   2. The fallback matches on EXACT email only. Never on name: two Smiths must
 *      not be merged, which is the same rule the rest of the integration uses.
 *   3. A number that came from our records is LABELLED as such (psrc), because
 *      SimplyBook still needs it adding and staff should be able to see that.
 *   4. With nothing anywhere, the honest old message stands.
 *
 * Pure CLI, no network, no store: the logic is mirrored here and the source is
 * asserted at the bottom, so this fails if the real file stops looking like this.
 */
if (php_sapi_name() !== 'cli') { http_response_code(404); exit; }

$fails = 0;
function ok($cond, $what) {
    global $fails;
    echo ($cond ? "  PASS  " : "  FAIL  ") . $what . "\n";
    if (!$cond) $fails++;
}

/** Mirrors the index built once per agenda call from the already-loaded customer file. */
function build_index($customers) {
    $out = array();
    foreach ($customers as $cRow) {
        if (!is_array($cRow)) continue;
        $cem = strtolower(trim((string)(isset($cRow['email']) ? $cRow['email'] : '')));
        if ($cem === '' || isset($out[$cem])) continue;
        foreach (array('mobile', 'tel', 'sb_phone', 'phone') as $pf) {
            if (!empty($cRow[$pf])) { $out[$cem] = (string)$cRow[$pf]; break; }
        }
    }
    return $out;
}

/** Mirrors the per-booking resolution. Returns array(phone, psrc). */
function resolve($sbPhone, $email, $index) {
    $ph = (string)$sbPhone;
    $psrc = '';
    if ($ph === '' && $email !== '') {
        $lem = strtolower(trim($email));
        if (isset($index[$lem]) && $index[$lem] !== '') { $ph = $index[$lem]; $psrc = 'ours'; }
    }
    return array($ph, $psrc);
}

$customers = array(
    'k1' => array('email' => 'dbillings@sky.com',    'mobile' => '+447700900111'),
    'k2' => array('email' => 'Mixed.Case@Sky.com',   'tel' => '+441202511601'),
    'k3' => array('email' => 'sbonly@example.com',   'sb_phone' => '+441202514914'),
    'k4' => array('email' => 'legacy@example.com',   'phone' => '01202 775566'),
    'k5' => array('email' => 'nonumber@example.com'),
    'k6' => array('email' => 'both@example.com',     'mobile' => '+447700900222', 'tel' => '+441202000000'),
    'k7' => 'not an array',
);
$idx = build_index($customers);

// --- 1. SimplyBook's own number always wins -------------------------------
list($p, $s) = resolve('01202 999999', 'dbillings@sky.com', $idx);
ok($p === '01202 999999', "SimplyBook's own number is used unchanged");
ok($s === '', 'and is not labelled as ours');

// --- 2. the gap this closes ------------------------------------------------
list($p, $s) = resolve('', 'dbillings@sky.com', $idx);
ok($p === '+447700900111', 'an empty SimplyBook phone falls back to our record');
ok($s === 'ours', 'and is labelled as coming from our records');

// --- 3. field precedence: the customer's own mobile is the freshest --------
list($p, ) = resolve('', 'both@example.com', $idx);
ok($p === '+447700900222', "the customer's own mobile beats their landline");
list($p, ) = resolve('', 'sbonly@example.com', $idx);
ok($p === '+441202514914', 'sb_phone is used when there is nothing the customer typed');
list($p, ) = resolve('', 'legacy@example.com', $idx);
ok($p === '01202 775566', 'a legacy phone field still works');

// --- 4. matching is exact-email, case-insensitive, and never by name -------
list($p, ) = resolve('', 'MIXED.CASE@SKY.COM', $idx);
ok($p === '+441202511601', 'email matching ignores case');
list($p, $s) = resolve('', 'someone.else@sky.com', $idx);
ok($p === '' && $s === '', 'a different address at the same domain matches NOTHING');
list($p, $s) = resolve('', '', $idx);
ok($p === '' && $s === '', 'a booking with no email gains nothing');

// --- 5. nothing anywhere: the honest message stands ------------------------
list($p, $s) = resolve('', 'nonumber@example.com', $idx);
ok($p === '' && $s === '', 'a customer we hold with no number still shows nothing');
list($p, ) = resolve('', 'never.seen@example.com', $idx);
ok($p === '', 'an unknown customer gains nothing');

// --- 6. a malformed customer row must not break the index -----------------
// Five entries, not six: nonumber@example.com has an email but no number at
// all, so it is never indexed - which is exactly why it still resolves to "".
ok(!isset($idx['']) && count($idx) === 5, 'non-array rows skipped; a customer with no number is not indexed');
ok(!isset($idx['nonumber@example.com']), 'and specifically that one is absent');

// --- 7. the source still matches this shape -------------------------------
$src = (string)file_get_contents(__DIR__ . '/pcm-booking.php');
ok(strpos($src, "\$ourPhones = array();") !== false, 'the agenda builds the index');
ok(strpos($src, "array('mobile', 'tel', 'sb_phone', 'phone')") !== false,
   'with the mobile-first precedence this test pins');
ok(strpos($src, "'psrc' => \$psrc,") !== false, 'and sends psrc to the portal');
ok(preg_match('/if \(\$ph === \x27\x27 && \$em !== \x27\x27\)/', $src) === 1,
   'the fallback only runs when SimplyBook gave nothing AND we have an email');
ok(strpos($src, '$dbA[\'customers\']') !== false,
   'it reads the customer file already loaded for bkmeta, not a second read');

$portal = (string)@file_get_contents(dirname(__DIR__) . '/portal/index.html');
ok($portal === '' || strpos($portal, "b.psrc === 'ours'") !== false,
   'the built portal shows where the number came from');

// --- 8. the customer card's number (27 Oct 2026) ----------------------------
// The owner's case: a new customer added in the portal with no number, booked for the next morning, then his mobile
// saved on his card (Find a customer -> Edit details). The diary still said "no number on file". These run the REAL
// cb_local_rows + cb_card_phones, lifted out of pcm-booking.php into a temp folder with the two libraries beside them,
// so __DIR__ (the job list) and the book's store point at fixtures, never at live files.
$tmp = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'agcard' . getmypid();
@mkdir($tmp);
copy(__DIR__ . '/pcm-custbook-lib.php', $tmp . '/pcm-custbook-lib.php');
copy(__DIR__ . '/pcm-phone-lib.php', $tmp . '/pcm-phone-lib.php');
$got = preg_match('/^function cb_local_rows\(.*?^}\R.*?^function cb_card_phones\(.*?^}\R/ms', $src, $fm);
ok($got === 1, 'pcm-booking.php still defines cb_local_rows and cb_card_phones');
file_put_contents($tmp . '/fns.php', "<?php\nfunction db_open() { throw new Exception('the agenda must pass the file it already loaded'); }\n"
    . "function db_close(\$l) {}\n" . ($got ? $fm[0] : ''));
file_put_contents($tmp . '/pcm-jobs.json', json_encode(array('jobs' => array(
    array('id' => 'j1', 'ts' => 100, 'name' => 'New Customer', 'email' => 'new.customer@example.com', 'phone' => '', 'mobile' => ''),
    array('id' => 'j2', 'ts' => 200, 'name' => 'Job Only', 'email' => 'job.only@example.com', 'mobile' => '07700 900333'),
    array('id' => 'j3', 'ts' => 300, 'name' => 'No Number', 'email' => 'no.number@example.com'),
))));
file_put_contents($tmp . '/pcm-custbook.json', json_encode(array('people' => array(
    'p1' => array('mobile' => '07700 900444', 'updated' => 400,
                  'links' => array('emails' => array('new.customer@example.com'), 'jobs' => array('j1'), 'sb' => 5001)),
    'p2' => array('email' => 'edited@example.com', 'mobile' => '07700 900666', 'updated' => 500, 'links' => array()),
))));
$cust = array(
    'k1' => array('email' => 'edited@example.com', 'mobile' => '+447700900555'),
    'k2' => array('email' => 'app.user@example.com', 'tel' => '01202 000111', 'sb_client_id' => 6001),
);
if ($got) {
    require $tmp . '/fns.php';
    $cp = cb_card_phones(array('customers' => $cust));
    $d = function ($k) use ($cp) { return isset($cp[$k]) ? preg_replace('/\D/', '', $cp[$k]) : ''; };
    ok($d('e:new.customer@example.com') === '07700900444', "the mobile saved on the card is found by the booking's email");
    ok($d('s:5001') === '07700900444', '... and by the SimplyBook client the card was saved against');
    ok($d('e:job.only@example.com') === '07700900333', 'a number on a New job card is found');
    ok($d('e:edited@example.com') === '07700900666', "a staff edit beats the number in the customer's own portal, as on the card");
    ok($d('s:6001') === '01202000111', "a PC Manager customer's landline is found by their SimplyBook client");
    ok(!isset($cp['e:no.number@example.com']), 'a person with no number anywhere adds nothing');
    ok(!isset($cp['e:never.seen@example.com']) && !isset($cp['s:0']), 'nobody else is invented');
}
foreach (array('fns.php', 'pcm-custbook-lib.php', 'pcm-phone-lib.php', 'pcm-jobs.json', 'pcm-custbook.json') as $f) @unlink($tmp . '/' . $f);
@rmdir($tmp);
$ag = substr($src, (int)strpos($src, "if (\$action === 'agenda')"), 9000);
ok(strpos($ag, '$cardPhones = cb_card_phones($dbA)') !== false, "the agenda reads the cards from the customer file it already loaded");
ok(strpos($ag, 'cb_card_phones') < strpos($ag, 'isset($ourPhones[$lem])'), 'the card comes before the PC Manager index');
ok(preg_match('/if \(\$ph === \x27\x27 && \(\$cid > 0 \|\| \$em !== \x27\x27\)\)/', $ag) === 1,
   "and only when SimplyBook's booking carried no number");

echo "\n" . ($fails ? "$fails FAILED" : "all passed") . "\n";
exit($fails ? 1 : 0);
