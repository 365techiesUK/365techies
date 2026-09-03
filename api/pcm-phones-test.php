<?php
/**
 * Tests for the customer phone-number normaliser.  Run:  php api/pcm-phones-test.php
 *
 * Pins the two rules that matter: a trusted UK number lands in the exact E.164
 * form comms-lib's matcher compares against, and anything we cannot trust is
 * KEPT rather than refused (the postcode rule, applied to numbers). Pure
 * functions, no store, so no safety rails are needed beyond CLI-only.
 */
if (php_sapi_name() !== 'cli') { http_response_code(404); exit; }
require_once __DIR__ . '/pcm-phone-lib.php';

$fails = 0;
function ok($cond, $what) {
    global $fails;
    echo ($cond ? "  PASS  " : "  FAIL  ") . $what . "\n";
    if (!$cond) $fails++;
}

// --- trusted UK forms -> E.164 ----------------------------------------------
ok(pcm_phone_norm('01202 775566') === '+441202775566', 'landline with a space');
ok(pcm_phone_norm('(01202) 775-566') === '+441202775566', 'brackets and a dash');
ok(pcm_phone_norm('07700 900123') === '+447700900123', 'mobile');
ok(pcm_phone_norm('+44 7700 900123') === '+447700900123', 'already international');
ok(pcm_phone_norm('0044 7700 900123') === '+447700900123', '00 prefix');
ok(pcm_phone_norm('447700900123') === '+447700900123', '44 with the plus dropped');
ok(pcm_phone_norm('020 7946 0000') === '+442079460000', 'London');
ok(pcm_phone_norm('0800 123 4567') === '+448001234567', 'non-geographic still stored');

// --- the matcher sees the same thing --------------------------------------------
if (is_file(__DIR__ . '/tm-lib.php')) {
    require_once __DIR__ . '/tm-lib.php';
    if (function_exists('tm_number')) {
        foreach (array('01202 775566', '07700 900123', '+44 7700 900123', '020 7946 0000') as $n) {
            ok(tm_number(pcm_phone_norm($n)) === pcm_phone_norm($n), "tm_number agrees on stored form of $n");
        }
    }
}

// --- never refused -------------------------------------------------------------
ok(pcm_phone_norm('') === '', 'blank stays blank');
ok(pcm_phone_norm('   ') === '', 'whitespace stays blank');
ok(pcm_phone_norm('+') === '', 'a lone plus is nothing');
ok(pcm_phone_norm('+353 1 234 5678') === '+35312345678', 'Irish number is trusted E.164');
ok(pcm_phone_norm('+1 212 555 0100') === '+12125550100', 'US number is trusted E.164');
ok(pcm_phone_norm('01202 775566 ext 204') === '+441202775566' || pcm_phone_norm('01202 775566 ext 204') !== '', 'an extension never blanks the number');
$odd = pcm_phone_norm('12345');
ok($odd === '12345', 'too short to trust is kept as typed: ' . $odd);
$junk = pcm_phone_norm("07700\x00 900123\x1F");
ok($junk === '+447700900123', 'control characters stripped: ' . $junk);
ok(strlen(pcm_phone_norm(str_repeat('9', 40))) <= 24, 'absurd length is capped, not refused');
ok(pcm_phone_norm('<script>07700900123') === '+447700900123', 'markup cannot ride along');

// --- display ---------------------------------------------------------------------
ok(pcm_phone_display('+441202775566') === '01202 775566', 'landline display');
ok(pcm_phone_display('+447700900123') === '07700 900123', 'mobile display');
ok(pcm_phone_display('+442079460000') === '020 7946 0000', 'London display');
ok(pcm_phone_display('+441134960000') === '0113 496 0000', 'Leeds display');
ok(pcm_phone_display('+35312345678') === '+35312345678', 'non-UK shown as stored');
ok(pcm_phone_display('') === '', 'blank display');

echo "\n" . ($fails ? "$fails FAILED" : "all passed") . "\n";
exit($fails ? 1 : 0);
