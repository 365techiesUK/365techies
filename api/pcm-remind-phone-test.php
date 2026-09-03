<?php
/**
 * Tests for which number an SMS reminder goes to.  Run:  php api/pcm-remind-phone-test.php
 *
 * Two rules, both easy to get wrong and both expensive:
 *
 *  1. The customer's OWN mobile - the one they typed in their portal - must be
 *     used. It was missing, and the failure was invisible: the customer resolved
 *     to no phone, and pcm-remind.php claims remind_sent BEFORE it checks it has
 *     a number, so that booking's reminder was burned rather than retried.
 *
 *  2. 'tel' must NEVER be used. It is the LANDLINE field. Texting a landline
 *     costs money, reaches nobody, and looks like we do not know our customers.
 *
 * pcm-remind.php cannot be included - it runs its whole job at include time and
 * would try to send - so the logic is mirrored here and the source is asserted
 * at the bottom, which fails if the real file stops looking like this.
 */
if (php_sapi_name() !== 'cli') { http_response_code(404); exit; }

$fails = 0;
function ok($cond, $what) {
    global $fails;
    echo ($cond ? "  PASS  " : "  FAIL  ") . $what . "\n";
    if (!$cond) $fails++;
}

/** Mirrors uk_phone() in pcm-remind.php. */
function uk_phone_t($p) {
    $p = preg_replace('/[^0-9]/', '', (string)$p);
    if ($p === '') return '';
    if (substr($p, 0, 2) === '00') return substr($p, 2);
    if (substr($p, 0, 2) === '07') return '44' . substr($p, 1);
    if (substr($p, 0, 1) === '0')  return '44' . substr($p, 1);
    return $p;
}

/** Mirrors the $custPhone line. */
function cust_phone($c) {
    return uk_phone_t(!empty($c['mobile']) ? $c['mobile']
        : (isset($c['sb_phone']) ? $c['sb_phone'] : (isset($c['phone']) ? $c['phone'] : '')));
}

// --- the gap that was silently burning reminders ---------------------------
ok(cust_phone(array('mobile' => '07700 900123')) === '447700900123',
   "a customer's own portal-typed mobile is used");
ok(cust_phone(array('mobile' => '+447700900123')) === '447700900123',
   'and in E.164 form too');

// --- precedence -------------------------------------------------------------
ok(cust_phone(array('mobile' => '07700 900123', 'sb_phone' => '+447411415562')) === '447700900123',
   "the customer's own mobile beats the one SimplyBook gave us");
ok(cust_phone(array('sb_phone' => '+447411415562')) === '447411415562',
   "SimplyBook's number is still used when there is no portal mobile");
ok(cust_phone(array('phone' => '07912 084903')) === '447912084903',
   'the legacy phone field is the last resort');

// --- THE RULE THAT MUST NOT BE "TIDIED UP" ---------------------------------
ok(cust_phone(array('tel' => '01202 511601')) === '',
   'a landline-only customer gets NO text - tel is never an SMS destination');
ok(cust_phone(array('tel' => '01202 511601', 'mobile' => '07700 900123')) === '447700900123',
   'and where both exist, the mobile is the one texted');
ok(cust_phone(array('tel' => '01202 511601', 'sb_phone' => '+447411415562')) === '447411415562',
   'a landline never displaces a real mobile from SimplyBook');

// --- nothing to send to ------------------------------------------------------
ok(cust_phone(array()) === '', 'a customer with no number resolves to nothing');
ok(cust_phone(array('mobile' => '')) === '', 'an empty mobile falls through rather than winning');

// --- the source still looks like this ---------------------------------------
$src = (string)file_get_contents(__DIR__ . '/pcm-remind.php');
$line = '';
foreach (explode("\n", $src) as $l) if (strpos($l, '$custPhone = uk_phone(') !== false) { $line = $l; break; }
ok($line !== '', 'the $custPhone assignment is still there');
ok(strpos($line, "\$c['mobile']") !== false, "and reads the customer's own mobile");
ok(strpos($line, "\$c['tel']") === false, 'and does NOT read the landline field');
ok(strpos($src, 'it is the LANDLINE field') !== false,
   'the reason tel is excluded is written down, so nobody "fixes" it back');
ok(strpos($src, "empty(\$c['remind_sms'])") !== false,
   'sends are still gated on the opt-in - this change must not widen who gets texted');

echo "\n" . ($fails ? "$fails FAILED" : "all passed") . "\n";
exit($fails ? 1 : 0);
