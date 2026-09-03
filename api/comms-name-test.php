<?php
/**
 * Tests for naming an inbound text.  Run:  php api/comms-name-test.php
 *
 * The rule being protected: a name from the SMS provider's address book is NOT
 * a customer match, and must never be presented as one or allowed to override a
 * real one. A wrong name on a customer's message is worse than no name.
 *
 * These exercise the Slack-line logic and the field-reading in comms-lib.php by
 * extracting them rather than including the file, because comms-lib pulls in the
 * whole comms stack. Pure CLI, no network, no store.
 */
if (php_sapi_name() !== 'cli') { http_response_code(404); exit; }

$fails = 0;
function ok($cond, $what) {
    global $fails;
    echo ($cond ? "  PASS  " : "  FAIL  ") . $what . "\n";
    if (!$cond) $fails++;
}

/* Mirrors the branch in comms_sms_poll(). Kept in step by the source assertions
   at the bottom, which fail if the real file stops looking like this. */
function who_line($match, $from) {
    if ($match['status'] === 'MATCH')          return $match['name'] . ' (' . $from . ')';
    if ($match['status'] === 'MULTIPLE')       return $from . ' - possibly ' . $match['name'];
    if ($match['status'] === 'NOT_CHECKED')    return $from . ' (not matched: ' . (isset($match['why']) ? $match['why'] : 'lookup unavailable') . ')';
    if (!empty($match['tm_name']))             return $match['tm_name'] . ' (' . $from . ') - from the Textmagic contact list, not matched to a customer record';
    return $from . ' (not a number we hold)';
}

$N = '+447411415562';

// --- a real customer match still wins, untouched -----------------------------
$m = array('status' => 'MATCH', 'name' => 'Maureen Drake', 'tm_name' => 'Someone Else');
ok(who_line($m, $N) === 'Maureen Drake (' . $N . ')', 'a real match is unchanged by a provider name');
ok(strpos(who_line($m, $N), 'Textmagic') === false, 'and never mentions the provider');

$m = array('status' => 'MULTIPLE', 'name' => 'A or B', 'tm_name' => 'Someone Else');
ok(who_line($m, $N) === $N . ' - possibly A or B', 'MULTIPLE is unchanged too');

// --- a broken matcher must never be dressed up as a provider name -----------
$m = array('status' => 'NOT_CHECKED', 'why' => 'customer list unreadable', 'tm_name' => 'Maureen Drake');
$line = who_line($m, $N);
ok(strpos($line, 'customer list unreadable') !== false, 'a failed lookup still says WHY');
ok(strpos($line, 'Maureen') === false, 'and is NOT replaced by the provider name - a broken matcher must stay visible');

// --- the gap it is meant to fill ---------------------------------------------
$m = array('status' => 'NOT_FOUND', 'tm_name' => 'Maureen Drake');
$line = who_line($m, $N);
ok(strpos($line, 'Maureen Drake') === 0, 'an unmatched number gains the provider name');
ok(strpos($line, 'not matched to a customer record') !== false, 'labelled as NOT a customer match');
ok(strpos($line, 'Textmagic') !== false, 'and says where the name came from');

$m = array('status' => 'NOT_FOUND');
ok(who_line($m, $N) === $N . ' (not a number we hold)', 'with no provider name, the old honest wording stands');

// --- the source still matches this shape -------------------------------------
$src = (string)file_get_contents(__DIR__ . '/comms-lib.php');
ok(strpos($src, "\$match['status'] !== 'MATCH' && \$match['status'] !== 'MULTIPLE'") !== false,
   'the provider name is only read when there is no real match');
ok(strpos($src, "not matched to a customer record") !== false, 'the honest label is in the source');
ok(strpos($src, "\$r['firstName']") !== false && strpos($src, "\$r['lastName']") !== false,
   'the poller now reads the provider name fields');
ok(preg_match('/elseif \(!empty\(\$match\[\x27tm_name\x27\]\)\)/', $src) === 1,
   'the provider branch sits AFTER match/multiple/not_checked, so it cannot pre-empt them');

// --- the phone captured from a booking is filled only where we are empty ------
$cb = (string)file_get_contents(__DIR__ . '/pcm-sb-callback.php');
ok(preg_match("/empty\(\\\$c\['sb_phone'\]\) && empty\(\\\$c\['mobile'\]\) && empty\(\\\$c\['tel'\]\)/", $cb) === 1,
   'a booking phone never overwrites one the customer typed themselves');
ok(strpos($cb, 'pcm_phone_norm(') !== false, 'and is normalised the same way as every other number');

echo "\n" . ($fails ? "$fails FAILED" : "all passed") . "\n";
exit($fails ? 1 : 0);
