<?php
/*
 * pcm-leadchase-lib.php tests. CLI only:  C:\tools\php\php.exe api/pcm-leadchase-test.php
 * The messages are shaped like the real #365-job-tracker posts read on 1 Oct 2026 (names and numbers made up).
 */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
error_reporting(E_ALL);
require __DIR__ . '/pcm-leadchase-lib.php';

$fails = 0;
function check($ok, $what, $detail = '') { global $fails; echo ($ok ? "  PASS  " : "  FAIL  ") . $what . ($ok ? '' : "  [" . $detail . "]") . "\n"; if (!$ok) $fails++; }
$tz = new DateTimeZone('Europe/London');
function at($s) { global $tz; return (new DateTime($s, $tz))->getTimestamp(); }
function bot($ts, $text, $extra = array()) { return array_merge(array('type' => 'message', 'subtype' => 'bot_message', 'bot_id' => 'B0BHTFHH3ST', 'ts' => sprintf('%.6f', $ts), 'text' => $text), $extra); }

echo "A  what counts as a lead\n";
$wed = at('2026-09-30 17:37:20');
$dell = bot($wed, 'New website enquiry from Peter Example <mailto:peter@example.com|peter@example.com>', array('blocks' => array(
    array('type' => 'header', 'text' => array('type' => 'plain_text', 'text' => "\xF0\x9F\x94\x94 New website enquiry")),
    array('type' => 'section', 'text' => array('type' => 'mrkdwn', 'text' => "*Message:*\n>looking_for: A refurbished laptop (Dell Latitude)")),
    array('type' => 'context', 'elements' => array(array('type' => 'mrkdwn', 'text' => 'via https://365techies.co.uk/dell-hardware/#pick'))))));
$l = lc_lead($dell);
check($l && $l['kind'] === 'web' && $l['label'] === 'Dell quote' && $l['who'] === 'Peter Example', 'a Dell picker enquiry is a Dell quote, named', json_encode($l));
$plainWeb = bot($wed, 'New website enquiry from Ann Example <ann@example.com>');
$l = lc_lead($plainWeb);
check($l && $l['label'] === 'Website enquiry' && $l['who'] === 'Ann Example', 'a contact-form enquiry', json_encode($l));
$l = lc_lead(bot($wed, 'New website enquiry from Bea Example', array('blocks' => array(array('type' => 'section', 'text' => array('type' => 'mrkdwn', 'text' => "virgin_addresses: 2\nbest_time: Morning"))))));
check($l && $l['label'] === 'Email move (ring-me-back)', 'the GBP 60 ring-me-back form', json_encode($l));
check(lc_lead(bot($wed, 'New website enquiry')) && lc_lead(bot($wed, 'New website enquiry'))['who'] === 'no name given', 'an enquiry with no name still counts');
$l = lc_lead(bot($wed, ":bell: New website enquiry\n*Name:*\nPeter Example\n*Email:*\n<mailto:p@example.com|p@example.com>"));
check($l && $l['who'] === 'Peter Example', 'the name from the Name field when the summary line has none', json_encode($l));
check(lc_lead(bot($wed, 'Service report not in the portal - Dell Latitude 5420')) === null, 'a service report is not a lead');
check(lc_lead(bot($wed, 'New website enquiry from Test', array('blocks' => array(array('type' => 'section', 'text' => array('type' => 'mrkdwn', 'text' => '[INTERNAL TEST] hello')))))) === null, 'an internal test is not a lead');
$l = lc_lead(bot($wed, "Website enquiry (no-JS fallback)\nName: Carl Example\nPhone: 07700 900123\nPage: /contact/"));
check($l && $l['who'] === 'Carl Example', 'the no-script form relay', json_encode($l));
$l = lc_lead(bot($wed, 'New AI opportunity AI-12 from Example Ltd'));
check($l && $l['label'] === 'AI enquiry' && $l['who'] === 'Example Ltd', 'an AI enquiry', json_encode($l));
$l = lc_lead(bot($wed, 'Virgin email move: please ring Tom Example on 07700 900123'));
check($l && $l['kind'] === 'callback' && strpos($l['who'], 'Tom Example') === 0, "PC Manager's Stuck? card", json_encode($l));
$l = lc_lead(bot($wed, ':telephone_receiver: *Booking started but never finished* - Jane Example (07700 900124), Full Computer Service'));
check($l && $l['label'] === 'Unfinished booking', 'an unfinished booking', json_encode($l));
check(lc_lead(bot($wed, ':telephone_receiver: *New booking* (taken in SimplyBook) - Margaret Example - Thu 1 Oct 2026 10:00am')) === null, 'a booking is not a lead');
check(lc_lead(bot($wed, ':white_check_mark: *Booking confirmed* - Julie Example')) === null, 'a confirmation is not a lead');
$vm = bot(at('2026-10-01 10:12'), ":telephone_receiver: Voicemail from +447700900125 (0:42)\nListen + call back from the portal comms inbox (/api/comms.php).");
$l = lc_lead($vm);
check($l && $l['kind'] === 'voicemail' && $l['number'] === '+447700900125', 'a voicemail (Slack writes the phone emoji as :telephone_receiver:)', json_encode($l));
$l = lc_lead(bot(at('2026-10-01 10:12'), "\xF0\x9F\x93\x9E Voicemail from Mary Example (+447700900126)\nListen + call back"));
check($l && $l['kind'] === 'voicemail' && $l['number'] === '+447700900126', "a customer's voicemail counts too", json_encode($l));
$txt = bot(at('2026-10-01 09:31'), ":speech_balloon: Text from +447700900127 (not a number we hold): Hi I've found your company online, I have a 5 yr old dell laptop used only for studying\nReply from the portal comms inbox (/api/comms.php).");
$l = lc_lead($txt);
check($l && $l['kind'] === 'text' && $l['number'] === '+447700900127' && strpos($l['who'], '+447700900127: "Hi') === 0, 'a text from a new number', json_encode($l));
check(lc_lead(bot($wed, ":speech_balloon: Text from +447700900128 (not a number we hold): Thanks David\nReply from the portal comms inbox (/api/comms.php).")) === null, '"Thanks David" is not a lead');
check(lc_lead(bot($wed, ":speech_balloon: Text from +447700900129 (not a number we hold): Yes 122 Example Road, BH10 4HY\nReply from")) === null, 'a short "Yes ..." reply is not a lead');
check(lc_lead(bot($wed, ":speech_balloon: Text from +447700900129 (not a number we hold): Yes but can you come Tuesday?\nReply from")) !== null, 'a question is a lead even when it starts "Yes"');
check(lc_lead(bot($wed, ":speech_balloon: Text from +447700900130 (not a number we hold): \xF0\x9F\x91\x8D\nReply from")) === null, 'a thumbs-up is not a lead');
check(lc_lead(bot($wed, ":speech_balloon: Text from Mary Example (+447700900131): my PC won't start\nReply from")) === null, "a customer's text is an ongoing conversation, not a lead");
check(lc_lead(bot($wed, ":speech_balloon: Text from +447700900132 - possibly Mary Example: can you ring me\nReply from")) !== null, 'a "possibly" match counts as new');
check(lc_lead(bot($wed, ":speech_balloon: Text from Ann Example (+447700900133) - from the Textmagic contact list, not matched to a customer record: hello, are you open?\nReply")) !== null, 'a Textmagic-contact name is not a customer match');
check(lc_lead(array('type' => 'message', 'user' => 'U1', 'ts' => sprintf('%.6f', $wed), 'text' => 'New website enquiry from me')) === null, "a person's own post is never a lead");
check(lc_lead(bot($wed, 'New website enquiry from X', array('subtype' => 'channel_join'))) === null, 'a join message is never a lead');

echo "B  answered\n";
check(lc_answered($dell + array('reactions' => array(array('name' => 'white_check_mark', 'count' => 1))), lc_lead($dell), array()), 'a tick answers it');
check(lc_answered($dell + array('reactions' => array(array('name' => 'eyes', 'count' => 1))), lc_lead($dell), array()), 'any reaction answers it (someone has it)');
check(lc_answered($dell + array('reply_count' => 1), lc_lead($dell), array()), 'a thread reply answers it');
check(!lc_answered($dell, lc_lead($dell), array()), 'nothing = not answered');
$tl = lc_lead($txt); $tts = (float)$txt['ts'];
check(lc_answered($txt, $tl, array(array('type' => 'sms_out', 'number' => '+447700900127', 'at' => gmdate('c', $tts + 600)))), 'a text back from the inbox answers a text');
check(!lc_answered($txt, $tl, array(array('type' => 'sms_out', 'number' => '+447700900127', 'at' => gmdate('c', $tts - 3600)))), 'an older text to them does not');
check(!lc_answered($txt, $tl, array(array('type' => 'sms_out', 'number' => '+447700900999', 'at' => gmdate('c', $tts + 600)))), 'a text to someone else does not');
check(lc_answered($txt, $tl, array(array('type' => 'sms_in', 'number' => '+447700900127', 'at' => gmdate('c', $tts - 20), 'handled' => true))), 'marked handled in the inbox answers it');
check(!lc_answered($txt, $tl, array(array('type' => 'sms_in', 'number' => '+447700900127', 'at' => gmdate('c', $tts - 20), 'handled' => false))), 'not handled in the inbox = not answered');
check(lc_answered($vm, lc_lead($vm), array(array('type' => 'voicemail', 'number' => '+447700900125', 'at' => gmdate('c', (float)$vm['ts'] - 120), 'handled' => true))), 'a voicemail marked handled');
check(!lc_answered($dell, lc_lead($dell), array(array('type' => 'sms_out', 'number' => '', 'at' => gmdate('c', $wed + 60)))), 'the inbox never answers a website enquiry by accident');

echo "C  working time\n";
check(lc_work_secs(at('2026-09-30 17:37'), at('2026-10-01 10:00')) === 3600, 'Wed 17:37 -> Thu 10:00 = 1 working hour', lc_work_secs(at('2026-09-30 17:37'), at('2026-10-01 10:00')));
check(lc_work_secs(at('2026-10-02 16:00'), at('2026-10-05 10:00')) === 7200, 'Fri 16:00 -> Mon 10:00 = 2 (the weekend counts nothing)');
check(lc_work_secs(at('2026-10-03 10:00'), at('2026-10-04 18:00')) === 0, 'a weekend = 0');
check(lc_work_secs(at('2026-10-01 09:00'), at('2026-10-01 17:00')) === 28800, 'a whole day = 8 hours');
check(lc_work_secs(at('2026-10-23 16:00'), at('2026-10-26 10:00')) === 7200, 'across the clocks going back (25 Oct)');
check(lc_work_secs(at('2026-10-01 12:00'), at('2026-10-01 11:00')) === 0, 'backwards = 0');
check(!lc_post_window(at('2026-10-01 08:59')) && lc_post_window(at('2026-10-01 09:00')) && lc_post_window(at('2026-10-01 17:29')) && !lc_post_window(at('2026-10-01 17:30')), 'posts Mon-Fri 09:00-17:30');
check(!lc_post_window(at('2026-10-03 11:00')), 'never at a weekend');

echo "D  when a lead is listed\n";
$st = array('nudged' => array());
$r = lc_due(array($dell), array(), $st, at('2026-10-01 10:00'));
check(count($r['due']) === 0 && $r['open'] === 1, 'Wed 17:37 enquiry at Thu 10:00 (1 working hour): open, not yet listed', json_encode($r));
$r = lc_due(array($dell), array(), $st, at('2026-10-01 11:05'));
check(count($r['due']) === 1 && $r['due'][0]['level'] === 1, 'at 2 working hours: listed', json_encode($r));
$st = lc_record($st, $r['due'], at('2026-10-01 11:05'));
check(count(lc_due(array($dell), array(), $st, at('2026-10-01 15:00'))['due']) === 0, 'listed once, not every sweep');
$r = lc_due(array($dell), array(), $st, at('2026-10-02 09:40'));
check(count($r['due']) === 1 && $r['due'][0]['level'] === 2, 'after a full working day: listed again, once', json_encode($r));
$st = lc_record($st, $r['due'], at('2026-10-02 09:40'));
check(count(lc_due(array($dell), array(), $st, at('2026-10-05 12:00'))['due']) === 0, 'then never again');
check(count(lc_due(array($dell + array('reactions' => array(array('name' => 'white_check_mark')))), array(), array(), at('2026-10-02 12:00'))['due']) === 0, 'an answered lead is never listed');
check(count(lc_due(array($dell), array(), array(), $wed + 8 * 86400)['due']) === 0, 'older than 7 days: never listed');
check(lc_due(array(bot($wed, ':white_check_mark: *Booking confirmed* - X')), array(), array(), at('2026-10-02 12:00'))['open'] === 0, 'non-leads are not counted as open');
$st2 = lc_record(array('nudged' => array('1000000000.000000' => array('l' => 1, 'at' => 1))), array(), at('2026-10-02 12:00'));
check(!isset($st2['nudged']['1000000000.000000']), 'old records are forgotten');

echo "E  the message\n";
$r = lc_due(array($dell, $vm), array(), array(), at('2026-10-02 12:00'));
$msg = lc_message($r['due'], array($dell['ts'] => 'https://example.slack.com/archives/C0B4TD439FB/p1'), at('2026-10-02 12:00'));
check(strpos($msg, 'Not answered yet') !== false && strpos($msg, '*Dell quote:* Peter Example (Wed 30 Sep 17:37') !== false, 'names the Dell quote and its time', $msg);
check(strpos($msg, '<https://example.slack.com/archives/C0B4TD439FB/p1|open>') !== false, 'links to the post');
check(strpos($msg, '*still waiting*') !== false && strpos($msg, '*Voicemail:* +447700900125') !== false, 'a second listing says still waiting');
check(strpos($msg, $dell['ts']) === false && strpos($msg, 'working day') !== false, 'ages in working days/hours, no raw timestamps');
$many = array(); for ($i = 0; $i < 15; $i++) $many[] = bot($wed + $i, 'New website enquiry from P' . $i . ' <x>');
$m2 = lc_message(lc_due($many, array(), array(), at('2026-10-02 12:00'))['due'], array(), at('2026-10-02 12:00'));
check(substr_count($m2, "\xE2\x80\xA2") === LC_MAX_LINES && strpos($m2, '...and 3 more.') !== false, 'at most 12 lines, the rest counted');
$m3 = lc_message(lc_due(array(bot($wed, 'New website enquiry from <b>Bad</b> & Co')), array(), array(), at('2026-10-02 12:00'))['due'], array(), at('2026-10-02 12:00'));
check(strpos($m3, '&lt;b&gt;') !== false || strpos($m3, '<b>') === false, 'a name cannot inject Slack markup', $m3);
check(lc_message(array(), array(), at('2026-10-02 12:00')) === '', 'nothing due = no message');

echo "\n" . ($fails ? "pcm-leadchase-test: $fails FAILED\n" : "pcm-leadchase-test: all passed\n");
exit($fails ? 1 : 0);
