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

echo "E  voicemail emails: the recording wherever it sits (1 Oct 2026)\n";
function part($type, $sub, $params = array(), $parts = null, $enc = 3) {
    $p = new stdClass(); $p->type = $type; $p->subtype = $sub; $p->encoding = $enc; $p->bytes = 1000;
    $p->dparameters = array(); $p->parameters = array();
    foreach ($params as $k => $v) { $o = new stdClass(); $o->attribute = $k; $o->value = $v; if ($k === 'filename') $p->dparameters[] = $o; else $p->parameters[] = $o; }
    if ($parts !== null) $p->parts = $parts;
    return $p;
}
// multipart/mixed { multipart/alternative { text/plain, text/html }, audio/x-wav "msg0001.wav" }
$mail = part(1, 'MIXED', array(), array(part(1, 'ALTERNATIVE', array(), array(part(0, 'PLAIN', array(), null, 0), part(0, 'HTML', array(), null, 4))),
    part(4, 'X-WAV', array('filename' => 'msg0001.wav'))));
$ps = comms_vm_parts($mail);
check(count($ps) === 3 && $ps[0]['sec'] === '1.1' && $ps[1]['sec'] === '1.2' && $ps[2]['sec'] === '2', 'nested parts are all found, numbered as IMAP numbers them', json_encode($ps));
check(comms_vm_audio_ext($ps[2]) === 'wav' && comms_vm_audio_ext($ps[0]) === '' && comms_vm_audio_ext($ps[1]) === '', 'the recording is the wav, the text parts are not');
$deep = part(1, 'MIXED', array(), array(part(1, 'RELATED', array(), array(part(0, 'HTML'), part(1, 'MIXED', array(), array(part(4, 'MPEG', array())))))));
$pd = comms_vm_parts($deep);
check(count($pd) === 2 && $pd[1]['sec'] === '1.2.1' && comms_vm_audio_ext($pd[1]) === 'mp3', 'three levels down, an audio/mpeg with no name is still the mp3', json_encode($pd));
check(comms_vm_audio_ext(comms_vm_part_info(part(3, 'OCTET-STREAM', array('name' => 'Voicemail.MP3')), '2')) === 'mp3', 'application/octet-stream named .mp3 (name= not filename=) counts');
check(comms_vm_audio_ext(comms_vm_part_info(part(3, 'OCTET-STREAM', array('name' => 'logo.png')), '2')) === '', 'an image attachment does not');
check(comms_vm_audio_ext(comms_vm_part_info(part(4, 'WAVE', array()), '2')) === 'wav' && comms_vm_audio_ext(comms_vm_part_info(part(4, 'OGG', array()), '2')) === '', 'audio/wave is a wav; ogg is not kept (the inbox serves mp3 and wav)');
$single = part(0, 'PLAIN', array(), null, 0);
$p1 = comms_vm_parts($single);
check(count($p1) === 1 && $p1[0]['sec'] === '1' && $p1[0]['type'] === 'TEXT', 'a single-part email is section 1');
check(comms_vm_parts(false) === array(), 'no structure = no parts (never an error)');
check(comms_vm_decode(base64_encode('RIFF....WAVE'), 3) === 'RIFF....WAVE' && comms_vm_decode('a=3Db', 4) === 'a=b', 'base64 and quoted-printable decoded');
$src2 = (string)file_get_contents(__DIR__ . '/comms-lib.php');
check(strpos($src2, 'slk_upload_file(COMMS_SLACK_CHANNEL') !== false && strpos($src2, "'audio_tried' => 1, 'audio_why' => \$x['why']") !== false,
    'a new voicemail with a recording is uploaded into #365-job-tracker, and every new one records what its email held');
check(strpos($src2, "\$out['vm_audio'] = comms_vm_refetch(15);") !== false, 'each sweep looks again for recordings the first poller missed');
check(defined('COMMS_SLACK_CHANNEL') && COMMS_SLACK_CHANNEL === 'C0B4TD439FB', 'the recordings go to #365-job-tracker');

echo "\n" . ($fails ? "comms-review-test: $fails FAILED\n" : "comms-review-test: all passed\n");
exit($fails ? 1 : 0);
