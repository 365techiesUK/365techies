<?php
/**
 * Tests for the SimplyBook phone write-back.  Run:  php api/pcm-sbwriteback-test.php
 *
 * This one guards a WRITE into the owner's live booking system, so the rules it
 * pins are not style preferences:
 *
 *   - the payload echoes back what was read and NEVER invents or emits a field
 *     we cannot read, because SimplyBook's edit family replaces rather than
 *     merges and an invented blank is a deletion;
 *   - only the numbers the customer typed themselves are ever pushed;
 *   - a client SimplyBook already has a number for is never touched;
 *   - the probe gate cannot be satisfied by an old, foreign or half-finished
 *     verdict file.
 *
 * Pure CLI, no network. It tests the REAL library functions - both files are
 * declaration-only - and then asserts the scripts still look like the thing
 * these tests describe.
 */
if (php_sapi_name() !== 'cli') { http_response_code(404); exit; }

require_once __DIR__ . '/pcm-phone-lib.php';
require_once __DIR__ . '/pcm-sbwrite-lib.php';

$fails = 0;
function ok($cond, $what) {
    global $fails;
    echo ($cond ? "  PASS  " : "  FAIL  ") . $what . "\n";
    if (!$cond) $fails++;
}

$TMP = sys_get_temp_dir() . '/sbw-test-' . getmypid();
@mkdir($TMP, 0777, true);

/* ---------------- the payload ------------------------------------------- */
$read = array(
    'id' => 482, 'name' => 'Hilary Weeks', 'email' => 'Hilary.Weeks@Example.com',
    'phone' => '', 'address1' => '2 The Lane', 'city' => 'Poole', 'zip' => 'BH15 1AA',
    'client_fields' => array('abc' => 'Passwords: hunter2'),
    'email_promo_subscribed' => false, 'is_blocked' => false, 'can_be_edited' => true,
);
$p = sbw_push_payload($read, '07700 900123');

ok($p['phone'] === '07700 900123', 'the phone we mean to set is in the payload');
ok($p['name'] === 'Hilary Weeks' && $p['address1'] === '2 The Lane' && $p['zip'] === 'BH15 1AA',
   'every standard field read back is echoed');
ok($p['email'] === 'Hilary.Weeks@Example.com',
   'the email is echoed BYTE-FOR-BYTE - changing it reportedly creates a new client');
foreach (array('id', 'client_fields', 'email_promo_subscribed', 'is_blocked', 'can_be_edited', 'is_deleted') as $k)
    ok(!array_key_exists($k, $p), "the payload never carries '$k'");
ok(!array_key_exists('address2', $p),
   'a field absent from the read stays absent - we never invent a blank, which under replace semantics would delete it');
ok(count($p) === 6, 'the payload is exactly the six echoed fields plus the phone, nothing more');

$p2 = sbw_push_payload(array('name' => 'X', 'phone' => 'old number'), '999');
ok($p2['phone'] === '999', 'a phone already on the record is overridden, not kept');

/* ---------------- which of our numbers may be pushed --------------------- */
list($f, $v) = sbw_source_phone(array('mobile' => '07700 900111', 'tel' => '01202 511601'));
ok($f === 'mobile' && $v === '07700 900111', "the customer's own mobile is preferred");
list($f, ) = sbw_source_phone(array('tel' => '01202 511601'));
ok($f === 'tel', 'their landline is used when there is no mobile');
list($f, ) = sbw_source_phone(array('sb_phone' => '+441202511601'));
ok($f === '', 'sb_phone is NEVER pushed - it came from SimplyBook, so it would be a round trip');
list($f, ) = sbw_source_phone(array('phone' => '01202 775566'));
ok($f === '', 'the legacy phone field is NEVER pushed - unattested, and this writes to the system that dials customers');
list($f, ) = sbw_source_phone(array());
ok($f === '', 'a customer with nothing gives nothing');

/* ---------------- who may be written to ---------------------------------- */
list($w, $whyNot) = sbw_writable(array('name' => 'A', 'phone' => ''));
ok($w === true, 'a named client with a blank phone is writable');
list($w, $whyNot) = sbw_writable(array('name' => 'A', 'phone' => '01202 511601'));
ok($w === false && $whyNot === 'SimplyBook already has a number', 'a number SimplyBook holds is never overwritten');
list($w, ) = sbw_writable(array('name' => 'A', 'phone' => '   -  '));
ok($w === true, 'punctuation-only counts as blank');
list($w, $whyNot) = sbw_writable(array('name' => 'A', 'phone' => '', 'is_blocked' => true));
ok($w === false && $whyNot === 'blocked in SimplyBook', 'a blocked client is skipped, never silently unblocked');
list($w, $whyNot) = sbw_writable(array('name' => 'A', 'phone' => '', 'can_be_edited' => false));
ok($w === false && $whyNot === 'not editable', 'an uneditable client is skipped');
list($w, $whyNot) = sbw_writable(array('name' => '', 'phone' => ''));
ok($w === false, 'a record with no name is skipped - name is the one field the API calls mandatory');
list($w, ) = sbw_writable(null);
ok($w === false, 'a failed read is never treated as "they have no number"');

/* ---------------- the diff that proves nothing else moved ---------------- */
ok(sbw_diff(array('a' => 1, 'phone' => 'x'), array('a' => 1, 'phone' => 'y')) === array(),
   'a phone-only change is clean');
ok(sbw_diff(array('a' => 1), array('a' => 2)) === array('a'), 'a changed field is caught');
ok(sbw_diff(array('a' => 1, 'b' => 2), array('a' => 1)) === array('b'), 'a VANISHED field is caught - that is the replace hazard');
ok(sbw_diff(array('a' => 1), array('a' => 1, 'b' => 2)) === array('b'), 'an appeared field is caught');
ok(sbw_diff(array('a' => '1'), array('a' => 1)) === array(), 'scalar 1 and "1" are not a change');

/* ---------------- the snapshot log --------------------------------------- */
$LOG = $TMP . '/log.php';
$id1 = sbw_log_append($LOG, array('ts' => time(), 'cid' => 482, 'before' => array('x' => 1)));
$id2 = sbw_log_append($LOG, array('ts' => time(), 'cid' => 99, 'wrote' => true));
ok($id1 !== '' && $id2 !== '' && $id1 !== $id2, 'each snapshot gets its own id');
$first = explode("\n", (string)file_get_contents($LOG))[0];
ok(strpos($first, '<?php exit;') === 0,
   'the log starts with an exit guard - api/ has no .htaccess and this repo is PUBLIC');
$recs = sbw_log_read($LOG);
ok(count($recs) === 2, 'both records read back, and line 1 is not treated as data');
ok($recs[0]['snap'] === $id1 && $recs[0]['cid'] === 482, 'the snapshot round-trips');

/* ---------------- the probe gate ----------------------------------------- */
$OK = $TMP . '/ok.php';
$good = array('ts' => time(), 'company' => 'acme', 'shape' => SBW_SHAPE, 'standard' => true,
              'custom_fields' => true, 'consent' => true, 'phone_landed' => true, 'ui_checked' => true);
$write = function ($arr) use ($OK) { file_put_contents($OK, "<?php return " . var_export($arr, true) . ";\n"); clearstatcache(); };

list($g, $whyNot) = sbw_pass_ok($TMP . '/nope.php', 'acme');
ok($g === false, 'with no verdict file at all, nothing may be written');

$write($good);
list($g, $whyNot) = sbw_pass_ok($OK, 'acme');
ok($g === true, 'a complete, current, confirmed verdict opens the gate');

list($g, $whyNot) = sbw_pass_ok($OK, 'someone-else');
ok($g === false, "a verdict from a DIFFERENT SimplyBook company does not count");

$bad = $good; $bad['shape'] = 'echoback-v0:something-else'; $write($bad);
list($g, ) = sbw_pass_ok($OK, 'acme');
ok($g === false, 'changing the payload shape invalidates the probe that tested the old one');

$bad = $good; $bad['ts'] = time() - 91 * 86400; $write($bad);
list($g, ) = sbw_pass_ok($OK, 'acme');
ok($g === false, 'a verdict over 90 days old is stale');

$bad = $good; $bad['ui_checked'] = false; $write($bad);
list($g, ) = sbw_pass_ok($OK, 'acme');
ok($g === false, 'nothing is written until a human has checked the canary in the SimplyBook UI');

foreach (array('standard', 'custom_fields', 'consent', 'phone_landed') as $k) {
    $bad = $good; $bad[$k] = false; $write($bad);
    list($g, ) = sbw_pass_ok($OK, 'acme');
    ok($g === false, "a probe that failed on '$k' blocks every write");
}

/* ---------------- the sources still look like this ----------------------- */
$push = (string)file_get_contents(__DIR__ . '/pcm-sbphone-push.php');
ok(strpos($push, "php_sapi_name() !== 'cli'") !== false, 'the push script is CLI-only');
ok(strpos($push, 'sbw_pass_ok(') !== false, 'and refuses to run until the canary has passed');
ok(strpos($push, "'editClient'") !== false && strpos($push, "'addClient'") === false,
   'it only ever edits - never addClient, which is the documented duplicate hazard');
ok(substr_count($push, 'sb_read_client($cid, $H)') >= 2,
   'it re-reads the record after writing, to prove the write moved only the phone');
ok(strpos($push, 'ABORTING THE WHOLE RUN') !== false,
   'an unexpected field change stops everything rather than continuing down the list');
/* Structural, not a comment string: the restore branch must be reachable before
   the gate that can refuse, or the emergency exit is locked by the safety system. */
$posRestore = strpos($push, "if (\$RESTORE !== '')");
$posGate    = strpos($push, 'sbw_pass_ok(');
ok($posRestore !== false && $posGate !== false && $posRestore < $posGate,
   'the undo branch runs BEFORE the probe gate, so it works when the gate is refusing');
ok(strpos($push, 'exit') !== false && $posRestore < strpos($push, 'sbw_rest_token('),
   'and before the REST requirement, which can also refuse');
ok(preg_match('/if \(\$LIVE && \$ALL && \$CONFIRM !== \$would\)/', $push) === 1,
   '--all --live must name the number the run just planned');
ok(strpos($push, 'SBW_MAX_PER_RUN') !== false && strpos($push, 'SBW_MAX_PER_DAY') !== false,
   'both caps are enforced in the push script');

$can = (string)file_get_contents(__DIR__ . '/pcm-sbclient-canary.php');
ok(strpos($can, "php_sapi_name() !== 'cli'") !== false, 'the canary is CLI-only');
ok(strpos($can, 'API CANARY') !== false, 'it probes with clearly-named synthetic clients');
ok(strpos($can, "require_once \$BASE . '/pcm-booking.php'") === false
   && strpos($can, "/pcm-booking.php") === false,
   'it never includes pcm-booking.php, which dispatches at include time');
ok(strpos($can, 'sbw_push_payload(') !== false,
   'the canary probes the SAME payload builder production uses, so they cannot drift');

$lib = (string)file_get_contents(__DIR__ . '/pcm-sbwrite-lib.php');
ok(strpos($lib, "array('mobile', 'tel')") !== false, 'the library pins the two allowed source fields');
ok(strpos($lib, 'X-Token: ') !== false, 'REST uses X-Token, not the JSON-RPC X-User-Token');

@array_map('unlink', glob($TMP . '/*'));
@rmdir($TMP);

echo "\n" . ($fails ? "$fails FAILED" : "all passed") . "\n";
exit($fails ? 1 : 0);
