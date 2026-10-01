<?php
/*
 * The review text and "a reply is handling it" (comms-lib.php, 1 Oct 2026). Run:
 *   C:\tools\php\php.exe -d extension=mbstring api/comms-review-test.php
 * Pure checks only: nothing is sent and the inbox store is never opened (no Textmagic key exists locally).
 */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
error_reporting(E_ALL);
require __DIR__ . '/comms-lib.php';

$fails = 0;
function check($ok, $what, $detail = '') { global $fails; echo ($ok ? "  PASS  " : "  FAIL  ") . $what . ($ok ? '' : "  [" . $detail . "]") . "\n"; if (!$ok) $fails++; }

echo "A  the wording\n";
$t = COMMS_REVIEW_TEXT;
check(strlen($t) <= 160, 'one SMS part (<= 160 characters)', strlen($t));
check(!preg_match('/[^\x20-\x7E]/', $t), 'plain 7-bit text (a curly quote would make it a 70-character Unicode part)');
check(strpos($t, '365techies.co.uk/review') !== false, 'carries the sayable review link');
check(!preg_match('/\bif (you|we|you\'re|you were)\b|happy|satisf/i', $t), 'unconditional: no "if you were happy" steering (Google policy)');
check(!preg_match('/discount|voucher|free|prize|draw|\boff\b/i', $t), 'no incentive (UK DMCC Act)');
check(COMMS_REVIEW_COOLDOWN === 365 * 86400, 'once a year per number');

echo "B  when it was last sent\n";
$N = '+447700900140';
$items = array(
    array('type' => 'sms_out', 'number' => $N, 'at' => '2026-03-01T10:00:00+00:00', 'tag' => 'review'),
    array('type' => 'sms_out', 'number' => $N, 'at' => '2026-09-01T10:00:00+00:00'),                     // an ordinary reply
    array('type' => 'sms_out', 'number' => '+447700900141', 'at' => '2026-09-20T10:00:00+00:00', 'tag' => 'review'),
    array('type' => 'sms_in', 'number' => $N, 'at' => '2026-09-25T10:00:00+00:00', 'tag' => 'review'),
);
check(comms_review_sent_at($N, $items) === strtotime('2026-03-01T10:00:00+00:00'), 'the review text, not an ordinary reply or someone else\'s');
check(comms_review_sent_at('+447700900142', $items) === 0, 'never sent = 0');
check(comms_review_sent_at($N, null) === 0, 'no inbox = 0');

echo "C  refusals that never reach the store or Textmagic\n";
$r = comms_send_review('01202 775566', 'test');
check(empty($r['ok']) && strpos($r['error'], 'not a UK mobile') !== false, 'a landline is refused', json_encode($r));
$r = comms_send_review('hello', 'test');
check(empty($r['ok']), 'rubbish is refused');

echo "D  the source keeps its promises\n";
$src = (string)file_get_contents(__DIR__ . '/comms-lib.php');
check((bool)preg_match("/if \(\\\$tag !== 'review'\) comms_handle_number\(/", $src), 'a reply marks the number handled; the review text does not');
check(strpos($src, "comms_send_sms(\$e164, COMMS_REVIEW_TEXT, \$actor, 'review')") !== false, 'the review text is tagged, so the once-a-year rule can see it');
$page = (string)file_get_contents(__DIR__ . '/comms.php');
check(substr_count($page, 'name=do value=review') === 2 && substr_count($page, 'confirm(') >= 2, 'both review buttons post do=review and ask to confirm first');

echo "\n" . ($fails ? "comms-review-test: $fails FAILED\n" : "comms-review-test: all passed\n");
exit($fails ? 1 : 0);
