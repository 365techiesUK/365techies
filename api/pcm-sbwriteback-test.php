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

/* ---------------- the staff sync (27 Oct 2026) --------------------------- */
ok(sbw_e164('07425 249706') === '+447425249706' && sbw_e164('+44 7425 249706') === '+447425249706', 'numbers go to SimplyBook as E.164');
ok(sbw_e164('ext 12') === '' && sbw_e164('') === '', 'anything not dialable is never sent');
ok(sbw_same_phone('+447425249706', '07425 249706'), "SimplyBook's '+44' form and staff's '07' form are the same number");
ok(!sbw_same_phone('', '') && !sbw_same_phone('07425 249706', '07425 249707'), 'blank never matches blank; one digit apart is different');
list($w, ) = sbw_staff_writable(array('name' => 'A', 'phone' => '+441202775566'));
ok($w === true, 'a staff save may replace a number SimplyBook already has (unlike the backfill)');
list($w, ) = sbw_staff_writable(array('name' => 'A', 'is_blocked' => true));
ok($w === false, '... but never on a blocked client');
list($w, ) = sbw_staff_writable(array('name' => ''));
ok($w === false, '... or one with no name');

$OFF = $TMP . '/off.php';
ok(sbw_off_read($OFF) === '', 'no cut-out file: the sync may run');
ok(sbw_off_set($OFF, 'client #5: the extra client fields changed') && sbw_off_read($OFF) === 'client #5: the extra client fields changed', 'the cut-out keeps its reason');
ok(strpos((string)file_get_contents($OFF), '<?php exit; ?>') === 0, 'and exits before it if fetched');
file_put_contents($OFF, 'garbage');
ok(sbw_off_read($OFF) !== '', 'a mangled cut-out file still means OFF (fail closed)');

$L2 = $TMP . '/log2.php';
sbw_log_append($L2, array('ts' => time(), 'sent' => true));
sbw_log_append($L2, array('ts' => time(), 'sent' => false, 'refused' => 'x'));
sbw_log_append($L2, array('ts' => time() - 3 * 86400, 'sent' => true));
ok(sbw_sent_today($L2) === 1, 'the daily cap counts writes actually sent today - not refusals, not other days');

$fpA = sbw_fields_fingerprint(array('data' => array(array('id' => 'f1', 'value' => 'hunter2'), array('id' => 'f2', 'value' => '1 PC NO Office'))));
$fpB = sbw_fields_fingerprint(array('data' => array(array('id' => 'f2', 'value' => '1 PC NO Office'), array('id' => 'f1', 'value' => 'hunter2'))));
ok($fpA === $fpB, 'the field fingerprint ignores order');
ok(strpos(json_encode($fpA), 'hunter2') === false, 'and never contains a value (one field is called Passwords)');
ok(sbw_fields_fingerprint(array('data' => array(array('id' => 'f1', 'value' => '')))) !== sbw_fields_fingerprint(array('data' => array(array('id' => 'f1', 'value' => 'x')))), 'a wiped field changes the fingerprint');
ok(sbw_fields_fingerprint(null) === null && sbw_consent(null) === null, 'an unreadable REST answer is null, never "empty and fine"');

$bS = array('getClient' => array('name' => 'A', 'email' => 'a@b.c', 'phone' => '', 'city' => 'Poole'), 'fields' => $fpA, 'consent' => array('is_sms_unsubscribed' => true));
$aS = $bS; $aS['getClient']['phone'] = '+447425249706';
ok(sbw_check($bS, $aS, '07425 249706') === '', 'a write that moved only the phone is clean');
$x = $aS; $x['getClient']['city'] = '';
ok(strpos(sbw_check($bS, $x, '07425 249706'), 'city') !== false, 'a lost standard field is named');
$x = $aS; $x['fields'] = sbw_fields_fingerprint(array());
ok(sbw_check($bS, $x, '07425 249706') === 'the extra client fields changed', 'wiped extra fields are caught');
$x = $aS; $x['consent'] = array('is_sms_unsubscribed' => false);
ok(sbw_check($bS, $x, '07425 249706') === 'the email/SMS consent ticks changed', 'a flipped consent tick is caught');
ok(sbw_check($bS, $bS, '07425 249706') === 'the number did not land', 'a write that changed nothing is not "done"');
ok(sbw_check($bS, array('getClient' => null), '07425 249706') !== '', 'an unreadable record after the write is never clean');

/* v2 payload (27 Oct 2026, the live test: an edit is NOT a merge - it blanks what it leaves out) */
$id1 = str_repeat('a', 32); $id2 = str_repeat('b', 32);
$vals = sbw_field_values(array('data' => array(array('id' => $id1, 'value' => '1 PC NO Office'), array('id' => $id2, 'value' => null))));
ok($vals === array($id1 => '1 PC NO Office', $id2 => ''), 'REST values under data[] are read; null becomes ""');
ok(sbw_field_values(array('id' => 230, 'fields' => array(array('id' => 7, 'field' => array('id' => $id1), 'value' => 'x')))) === array($id1 => 'x'),
   'a row with its OWN numeric id beside field.id: the field id wins');
ok(sbw_field_values(array($id2 => '1', $id1 => 'y')) === array($id1 => 'y', $id2 => '1'), 'a plain map keyed by field id');
ok(sbw_field_values(array('message' => 'not found')) === array() && sbw_field_values(null) === array(), 'nothing recognisable gives nothing (and the sync refuses)');
$pv = sbw_push_payload($read + array('country_id' => 'GB', 'state_id' => null), '07700 900123', $vals,
                       array('is_email_unsubscribed' => true, 'is_sms_unsubscribed' => false, 'email_promo_subscribed' => true));
ok($pv['client_fields'] === $vals, 'the extra fields go back exactly as REST read them');
ok($pv['country_id'] === 'GB' && !array_key_exists('state_id', $pv), 'country/state are echoed when the read has them (a null is not invented)');
ok($pv['is_email_unsubscribed'] === true && $pv['is_sms_unsubscribed'] === false, 'both Unsubscribe ticks go back as they were');
ok(!array_key_exists('email_promo_subscribed', $pv), 'a promo flag is never translated into an Unsubscribe tick');
ok(sbw_push_payload($read, 'x', array(), null) === sbw_push_payload($read, 'x'), 'no values read = no client_fields key at all (never an empty map)');
ok(strpos(sbw_shape(array('data' => array(array('id' => $id1, 'value' => 'hunter2')))), 'hunter2') === false, 'the shape shown in the report never holds a value');
ok(sbw_fields_fingerprint(array('data' => array(array('id' => $id1, 'value' => 'v')))) === sbw_fields_fingerprint(array($id1 => 'v')), 'the fingerprint is of the values, whatever shape they came in');

/* 'selector' (third live test): allowed to follow the phone, nothing else */
ok(sbw_derived_same('API CANARY B (+441202 775566)', 'API CANARY B (+447700900123)'), 'a selector that differs only in the phone is the same');
ok(!sbw_derived_same('API CANARY B 0712', 'API CANARY C 0712'), 'a changed letter is a change');
ok(!sbw_derived_same('9f3a1c02b7', '4d81e0aa93'), 'a random token (hex has letters) is a change');
ok(sbw_std_lost(array('selector' => 'Jo 0770', 'name' => 'Jo'), array('selector' => 'Jo 0771', 'name' => 'Jo')) === array(), 'sbw_std_lost lets the derived selector follow the phone');
ok(sbw_std_lost(array('selector' => 'Jo', 'name' => 'Jo'), array('selector' => 'Joe', 'name' => 'Jo')) === array('selector'), '... but not change otherwise');
ok(sbw_std_lost(array('city' => '1 x'), array('city' => '2 x')) === array('city'), 'the allowance is for selector ONLY - a digit change in any other field still counts');

/* the safety test's seeding: the first live run died on "The input was not found in the haystack" */
$m = sbw_field_meta(array('id' => 'x', 'title' => 'Support Package', 'type' => 'select', 'values' => '1 PC NO Office,1 PC inc Office', 'is_optional' => false));
ok($m['opts'] === array('1 PC NO Office', '1 PC inc Office') && $m['req'] === true, 'a drop-down given as a comma list: its choices, and required');
$m2 = sbw_field_meta(array('title' => 'Payment Method', 'field_type' => 'select', 'options' => array(array('value' => 'GoCardless (Direct Debit)'))));
ok($m2['opts'] === array('GoCardless (Direct Debit)') && $m2['req'] === false, 'a drop-down given as a list of {value}');
$s = sbw_canary_seeds($m, 'x');
ok($s[0] === '1 PC NO Office' && end($s) === null, 'a drop-down is seeded with its OWN first choice, ending in "leave it out"');
$s = sbw_canary_seeds(array('type' => 'checkbox', 'opts' => array()), 'x');
ok($s[0] === '1', 'a tick box is seeded 1, never a text marker');
$s = sbw_canary_seeds(array('type' => 'select', 'opts' => array()), 'x');
ok($s[0] === '-', 'a drop-down whose choices are unknown never gets a text marker');
$s = sbw_canary_seeds(array(), 'abcdef0123');
ok($s[0] === 'CANARY-abcdef', 'an unknown box gets the visible CANARY marker');
ok(sbw_error_field(array('error' => array('data' => array('field' => 'client_fields/' . str_repeat('a', 32))))) === str_repeat('a', 32), 'the refused box is read from the error');
ok(sbw_error_field(array('error' => array('message' => 'The input was not found in the haystack'))) === '', 'an error that names no box gives none');

$bk = (string)file_get_contents(__DIR__ . '/pcm-booking.php');
$fn = substr($bk, (int)strpos($bk, 'function sbw_staff_push('), 4000);
$pG = strpos($fn, 'sbw_pass_ok('); $pO = strpos($fn, 'sbw_off_read('); $pS = strpos($fn, 'sbw_log_append('); $pE = strpos($fn, "'editClient'");
ok($pG !== false && $pO !== false && $pS !== false && $pE !== false && $pG < $pE && $pO < $pE && $pS < $pE,
   'the staff push checks the gate and the cut-out, and snapshots, BEFORE it sends editClient');
ok(strpos($fn, "if (\$snap === '') return") !== false, 'no snapshot, no write');
ok(strpos($fn, 'sbw_off_set(') !== false && strpos($fn, 'pcm_slack_say(') !== false, 'a bad write switches the sync off and tells Slack');
ok(strpos($fn, "'client_fields'") === false, 'the staff push never sends client_fields');
ok(strpos($bk, "if (\$action === 'sbwcanaryok')") !== false && strpos($bk, "fail('not_passed')") !== false, 'only a PASSED test can be confirmed');

$lib = (string)file_get_contents(__DIR__ . '/pcm-sbwrite-lib.php');
ok(strpos($lib, "array('mobile', 'tel')") !== false, 'the library pins the two allowed source fields');
ok(strpos($lib, 'X-Token: ') !== false, 'REST uses X-Token, not the JSON-RPC X-User-Token');

@array_map('unlink', glob($TMP . '/*'));
@rmdir($TMP);

echo "\n" . ($fails ? "$fails FAILED" : "all passed") . "\n";
exit($fails ? 1 : 0);
