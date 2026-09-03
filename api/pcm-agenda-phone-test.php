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

echo "\n" . ($fails ? "$fails FAILED" : "all passed") . "\n";
exit($fails ? 1 : 0);
