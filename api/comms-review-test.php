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

echo "F  telephone WAVs made playable; the inbox links open the thread (1 Oct 2026, late)\n";
function wav($tag, $rate, $ch, $bits, $data, $extensible = false) {
    $align = $ch * max(1, intdiv($bits, 8)); $fmt = pack('vvVVvv', $extensible ? 0xFFFE : $tag, $ch, $rate, $rate * $align, $align, $bits);
    if ($extensible) $fmt .= pack('vvV', 22, $bits, 0) . pack('v', $tag) . str_repeat("\0", 14);
    $body = 'WAVE' . 'fmt ' . pack('V', strlen($fmt)) . $fmt . 'LIST' . pack('V', 4) . 'INFO' . 'data' . pack('V', strlen($data)) . $data;
    return 'RIFF' . pack('V', strlen($body)) . $body;
}
$mu = wav(7, 8000, 1, 8, str_repeat("\xFF\x00\x80\x7F", 4000));        // 16,000 samples = 2 seconds
$i = comms_wav_info($mu);
check($i && $i['tag'] === 7 && $i['g711'] && !$i['playable'] && $i['secs'] === 2 && strpos($i['codec'], 'mu-law, 8 kHz') === 0, 'a mu-law 8 kHz WAV is recognised (past a LIST chunk), 2 seconds', json_encode($i));
$pcm = comms_wav_pcm16($mu);
$pi2 = comms_wav_info($pcm);
check($pi2 && $pi2['tag'] === 1 && $pi2['playable'] && $pi2['bits'] === 16 && $pi2['rate'] === 8000 && $pi2['secs'] === 2, 'turned into 16-bit PCM, same rate and length', json_encode($pi2));
$s = unpack('v4', substr($pcm, 44, 8));
$sv = array_map(function ($x) { return $x >= 32768 ? $x - 65536 : $x; }, array_values($s));
check($sv === array(0, -32124, 32124, 0), 'mu-law values decode to the standard (0xFF=0, 0x00=-32124, 0x80=32124, 0x7F=0)', json_encode($sv));
check(comms_g711_sample(0xD5, true) === 8 && comms_g711_sample(0x55, true) === -8 && comms_g711_sample(0x2A, true) === -32256, 'A-law values decode to the standard');
$al = wav(6, 8000, 1, 8, str_repeat("\xD5", 800), true);
$ai = comms_wav_info($al);
check($ai && $ai['tag'] === 6 && $ai['g711'], 'an A-law WAV in the "extensible" layout is recognised', json_encode($ai));
check(comms_wav_info(comms_wav_pcm16($al))['playable'] === true, '...and converted');
$gsm = comms_wav_info(wav(0x31, 8000, 1, 0, str_repeat("\0", 650)));
check($gsm && !$gsm['playable'] && !$gsm['g711'] && strpos($gsm['codec'], 'GSM 6.10') === 0, 'GSM 6.10 is named and marked not playable in a browser (the inbox offers the download)');
check(comms_wav_info(wav(1, 16000, 1, 16, str_repeat("\0\0", 16000)))['playable'] === true && comms_wav_pcm16(wav(1, 8000, 1, 16, "\0\0")) === null, 'PCM is left alone');
check(comms_wav_info('ID3' . str_repeat("\0", 100)) === null && comms_wav_info('') === null, 'not a WAV = null');
$tmpw = sys_get_temp_dir() . '/cr-test-' . getmypid() . '.wav';
file_put_contents($tmpw, $mu);
check(comms_wav_fix_file($tmpw) === true && comms_wav_info(file_get_contents($tmpw))['playable'] && comms_wav_fix_file($tmpw) === false, 'a saved mu-law file is rewritten as PCM once, then left alone');
@unlink($tmpw);
$pg = (string)file_get_contents(__DIR__ . '/comms.php');
check(strpos($pg, '<a href="?n=\' . rawurlencode($num) . \'">') !== false && strpos($pg, "if (\$rawN !== '' && \$rawN[0] === ' ') \$rawN = '+' . ltrim(\$rawN);") !== false,
    'list links encode the "+", and a "+" that arrived as a space is read back');
check(strpos($src2 = (string)file_get_contents(__DIR__ . '/comms-lib.php'), "header('Accept-Ranges: bytes');") !== false && strpos($src2, 'http_response_code(206)') !== false && strpos($src2, 'comms_wav_fix_file($path)') !== false && strpos($pg, 'comms_stream_audio(') !== false,
    'the audio route answers byte ranges (iPhones need them) and converts telephone WAVs before serving');
check(strpos($pg, "name=do value=vmslack") !== false && strpos($pg, 'Recording of the voicemail from') !== false, 'an older voicemail can be posted to Slack, worded so the reminders do not chase it');
check(strpos($pg, '&amp;r=1#reply">reply</a>') !== false && strpos($pg, 'id=reply') !== false, 'the list has a reply link that opens the reply box');
check(strpos($pg, 'Download the recording') !== false && strpos($pg, '<audio controls preload=none style="height:32px') !== false, 'a download link, and a player right in the list');

echo "G  the portal card: texts | voicemails, a name and number on each, signed play links (1 Oct 2026, late)\n";
$k = 'test-secret';
$items = array(
    array('id' => '1', 'type' => 'voicemail', 'number' => '+447700900170', 'at' => '2026-10-01T10:00:00+00:00', 'audio' => 'vm-audio-VM9.wav', 'duration' => '0:40', 'handled' => false, 'match' => array('status' => 'MATCH', 'name' => 'Ann Example')),
    array('id' => '2', 'type' => 'sms_out', 'number' => '+447700900170', 'at' => '2026-10-01T10:05:00+00:00', 'body' => 'Calling you now', 'handled' => true, 'match' => array('status' => 'MATCH', 'name' => 'Ann Example')),
    array('id' => '3', 'type' => 'sms_in', 'number' => '+447700900171', 'at' => '2026-10-01T11:00:00+00:00', 'body' => 'Can you help?', 'handled' => false, 'match' => array('status' => 'NO_MATCH', 'name' => '')),
    array('id' => '4', 'type' => 'voicemail', 'number' => '+441202745516', 'at' => '2026-09-30T09:00:00+00:00', 'audio' => '', 'audio_why' => 'no recording in the email', 'handled' => true, 'match' => array('status' => 'NO_MATCH', 'name' => '', 'vm_name' => 'Bob Caller')),
    array('id' => '5', 'type' => 'sms_in', 'number' => '+447700900172', 'at' => '2026-09-29T09:00:00+00:00', 'body' => 'Thanks', 'handled' => false, 'match' => array('status' => 'NO_MATCH', 'name' => '', 'tm_name' => 'Cath Contact')),
    array('id' => '6', 'type' => 'voicemail', 'number' => '+447700900171', 'at' => '2026-10-01T12:00:00+00:00', 'audio' => 'vm-audio-VM10.mp3', 'duration' => '', 'handled' => false, 'match' => array('status' => 'NO_MATCH', 'name' => '')),
);
$names = array('+447700900171' => array('name' => 'Dan Textmagic', 'src' => 'textmagic', 'at' => 1));
$b = comms_board($items, $names, $k, strtotime('2026-10-01T12:30:00Z'));
check(count($b['texts']) === 3 && count($b['vms']) === 3 && $b['total_texts'] === 3 && $b['total_vms'] === 3, 'texts and voicemails are separate lists', json_encode(array(count($b['texts']), count($b['vms']))));
check($b['vms'][0]['id'] === '6' && $b['vms'][1]['id'] === '1' && $b['vms'][2]['id'] === '4', 'voicemails newest first, each on its own');
check($b['texts'][0]['n'] === '+447700900171' && $b['texts'][1]['n'] === '+447700900170', 'texts: one conversation per number, newest first');
check($b['open_texts'] === 2 && $b['open_vms'] === 2 && $b['open'] === 3, 'open counts: 2 numbers with texts to answer, 2 voicemails not done, 3 numbers in all', json_encode(array($b['open_texts'], $b['open_vms'], $b['open'])));
$v1 = $b['vms'][1];
check($v1['who'] === 'Ann Example' && $v1['src'] === 'customer' && $v1['n'] === '+447700900170' && $v1['mobile'], 'a voicemail carries the name, where it came from and the number', json_encode($v1));
check($b['vms'][0]['who'] === 'Dan Textmagic' && $b['vms'][0]['src'] === 'textmagic', 'a name from the Textmagic contact list');
check($b['vms'][2]['who'] === 'Bob Caller' && $b['vms'][2]['src'] === 'voipfone' && !$b['vms'][2]['mobile'] && $b['vms'][2]['why'] === 'no recording in the email', 'a name from the phone system; a landline; no recording says why');
$cath = array_values(array_filter($b['texts'], function ($t) { return $t['n'] === '+447700900172'; }))[0];
check($cath['who'] === 'Cath Contact' && $cath['src'] === 'textmagic', "a name Textmagic gave with the text itself");
check(comms_name_for('+447700900199', array('status' => 'MULTIPLE', 'name' => 'A / B'), array()) === array('Possibly A / B', 'possible') && comms_name_for('+447700900199', array(), array()) === array('', ''), 'possible matches say so; nobody = no name');
check(comms_name_for('+447700900170', array('status' => 'MATCH', 'name' => 'Ann Example'), array('+447700900170' => array('name' => 'Other', 'src' => 'textmagic'))) === array('Ann Example', 'customer'), 'our own customer record wins over Textmagic');
$au = $v1['audio'];
check(preg_match('#^/api/comms-api\.php\?a=vm-audio-VM9\.wav&e=(\d+)&s=([a-f0-9]{32})$#', $au, $am) === 1 && hash_equals(comms_audio_sig('vm-audio-VM9.wav', (int)$am[1], $k), $am[2]), 'the play link is signed with the server secret', $au);
check(!hash_equals(comms_audio_sig('vm-audio-VM9.wav', (int)$am[1], 'other'), $am[2]) && !hash_equals(comms_audio_sig('vm-audio-VM8.wav', (int)$am[1], $k), $am[2]), 'a different secret or file does not match');
check((int)$am[1] === strtotime('2026-10-01T12:30:00Z') + 3 * 3600, 'and lasts three hours');
check(strpos(json_encode($b), '"vm-audio-') === false, 'no recording file name leaves except inside its signed link');
$ann = array_values(array_filter($b['texts'], function ($t) { return $t['n'] === '+447700900170'; }))[0];
check($ann['open'] === 0 && count($ann['items']) === 1 && $ann['items'][0]['type'] === 'sms_out', "a voicemail is not in the texts column; our reply is");
$api = (string)file_get_contents(__DIR__ . '/comms-api.php');
check(strpos($api, 'vis_staff_ok($in, __DIR__)') !== false && strpos($api, "\$e < time() || !hash_equals(comms_audio_sig(") !== false, 'the card API needs the portal staff session; a play link must be unexpired and signed');
check(strpos($api, "comms_set_handled(\$id, true, 'portal')") !== false && strpos($api, "array('sms_in')") !== false, 'Done: one voicemail by id, or a caller\'s texts only');
$lib = (string)file_get_contents(__DIR__ . '/comms-lib.php');
check(strpos($lib, "\$out['names'] = comms_names_refresh(10);") !== false && strpos($lib, "\$out['vm_slack'] = comms_vm_slack_backfill(8);") !== false, 'each sweep looks up 10 names and attaches up to 8 recordings under their Slack lines');
check(strpos($lib, "'https://rest.textmagic.com/api/v2/contacts/phone/' . preg_replace('/\\D/', '', \$e164)") !== false, 'Textmagic is asked by number');
check(strpos((string)file_get_contents(__DIR__ . '/pcm-slack-lib.php'), "array('thread_ts' => (string)\$thread)") !== false, 'a recording can go under its own Slack line');

echo "\n" . ($fails ? "comms-review-test: $fails FAILED\n" : "comms-review-test: all passed\n");
exit($fails ? 1 : 0);
