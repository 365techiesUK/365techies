<?php
/* Tests for pcm-ack-lib.php (6 Oct 2026). Run: php -d extension=mbstring api/pcm-ack-test.php
   Uses a temporary store and fake senders: nothing is emailed or texted. */
$TMPD = sys_get_temp_dir() . '/ack-test-' . getmypid();
@mkdir($TMPD);
define('ACK_STORE', $TMPD . '/pcm-ack.json');
require __DIR__ . '/pcm-ack-lib.php';

$fails = 0;
function check($ok, $what, $info = '') { global $fails; echo ($ok ? '  PASS  ' : '  FAIL  ') . $what . ($ok || $info === '' ? '' : '  -> ' . $info) . "\n"; if (!$ok) $fails++; }
function at($s) { $d = new DateTime($s, new DateTimeZone('Europe/London')); return $d->getTimestamp(); }

// ---- which enquiries get a reply ----
check(ack_kind('Dell availability &amp; quote', "machine: Latitude 5430 \u{00b7} 14in") === 'dell', 'the Dell picker is a Dell request');
check(ack_kind('', "looking_for: A refurbished laptop (Dell Latitude)\nbudget: x") === 'dell', 'the refurbished-laptop finder is a Dell request');
check(ack_kind('Buying a computer (refurbished Dell)', 'hello') === 'dell', 'the contact form refurbished-Dell topic is a Dell request');
check(ack_kind('Virgin email move (&pound;60 per address)', "virgin_addresses: 1\nbest_time: Morning") === 'emailmove', 'the Virgin ring-me-back is an email move');
check(ack_kind('Something else', 'My printer has stopped working') === 'web', 'an ordinary contact message gets the general reply');
check(ack_kind('Computer or laptop repair', 'my laptop', 'https://365techies.co.uk/refurbished-laptops-dorset/') === 'web', 'a repair question asked on a refurb page is a general enquiry, not a Dell request');
check(ack_kind('6-weekly service report', "PC: Dell Inc. Latitude 3510\nmachine: x", 'ServicePass') === '', 'a Service Pass report never gets a reply');
check(ack_kind('Dell availability', "[INTERNAL TEST] machine: Latitude 5430") === '', 'an internal test never gets a reply');

// ---- names, models, numbers ----
check(ack_first('Peter Shipway') === 'Peter', 'first name');
check(ack_first('mrs Wilson') === 'mrs Wilson', 'a title keeps the surname');
check(ack_first('') === 'there' && ack_first('<script>') === 'script', 'empty name -> there; markup stripped');
check(ack_machine("machine: Latitude 5430 \u{00b7} 14\u{2033} \u{00b7} 12th-gen i5 \u{00b7} 16GB \u{00b7} guide \u{00a3}555") === 'the Dell Latitude 5430', 'model from the picker line', ack_machine("machine: Latitude 5430 \u{00b7} 14"));
check(ack_machine('no machine here') === '', 'no model line -> nothing');
check(ack_mobile('07743 252609') === '+447743252609' && ack_mobile('+44 7743 252609') === '+447743252609', 'UK mobiles normalised');
check(ack_mobile('01202 775566') === '' && ack_mobile('+966598963807') === '', 'landlines and foreign numbers cannot take a text');

// ---- the wording ----
$m = ack_email('dell', 'John Standring', 'the Dell Latitude 5430');
check(strpos($m['text'], 'Hi John,') === 0 && strpos($m['text'], 'the Dell Latitude 5430') !== false, 'Dell email greets by name and names the model');
check(strpos($m['text'], 'usually the same working day') !== false && strpos($m['text'], '01202 775566') !== false && strpos($m['text'], '07520 615332') !== false, 'promise and both numbers in the email');
check(strpos(ack_email('dell', 'Ann', '')['text'], 'a refurbished Dell') !== false, 'no model -> "a refurbished Dell"');
check(strpos(ack_email('emailmove', 'Margaret', '')['text'], 'move your Virgin Media email') !== false, 'email-move email says what they asked for');
foreach (array(array('dell', 'Peter'), array('emailmove', 'Margaret'), array('dell', 'Bartholomew-Fitzwilliam Smythe'), array('emailmove', "Ber\u{00e5}tcan \u{00d6}zkan")) as $c) {
    $t = ack_sms($c[0], $c[1]);
    check(strlen($t) <= 160 && preg_match('/^[\x20-\x7E]+$/', $t), 'text for ' . $c[1] . ' is one plain 160-char part (' . strlen($t) . ')', $t);
}
check(strpos(ack_sms('emailmove', 'Margaret'), 'We will ring you') !== false, 'email-move text promises the call');
$all = ack_email('dell', 'x', '')['text'] . ack_email('emailmove', 'x', '')['text'] . ack_sms('dell', 'x') . ack_sms('emailmove', 'x');
check(!preg_match('/\x{00a3}|price|offer|discount|http/iu', $all), 'no price, offer or link in any reply (a service message, not marketing)');

// ---- general website enquiries (owner: "do the same auto reply for website enquiries too") ----
$w = ack_email('web', 'Claire Spiller', '');
check(strpos($w['text'], 'Hi Claire,') === 0 && strpos($w['text'], 'Your message has reached us') !== false && strpos($w['text'], 'usually the same working day') !== false, 'the general email', $w['text']);
check($w['subject'] === 'We have your message - 365 Techies', 'the general subject');
$ws = ack_sms('web', 'Claire');
check(strlen($ws) <= 160 && strpos($ws, 'we have your message') !== false, 'the general text is one part (' . strlen($ws) . ')', $ws);
check(!preg_match('/\x{00a3}|price|offer|discount|http/iu', $w['text'] . $ws), 'no price, offer or link in the general reply either');
check(ack_web_skip('Stop paying for clicks. Start your free trial here: https://cutt.ly/8ykOW8Zu', '679244619', 'x@msn.com') === 'link', 'a pitch with a link is skipped');
check(ack_web_skip('XLSX Preserve Guard - https://buymeacoffee.com/x', '', 'b@gmail.com') === 'link', 'a pitch with a shop link is skipped');
check(ack_web_skip("\u{062F}\u{0648}\u{0631}\u{0647} \u{0645}\u{062C}\u{0627}\u{0646}\u{064A}\u{0647}", '', 'a@gmail.com') === 'non-latin', 'an overseas message in another script is skipped');
check(ack_web_skip('free course please', '+966598963807', 'a@gmail.com') === 'overseas-number', 'a foreign phone number is skipped');
check(ack_web_skip('test', '', 'david@365techies.co.uk') === 'own-address', 'our own addresses are skipped');
check(ack_web_skip('Hello, I left a voicemail today. I need help with Microsoft 365 and the authenticator app.', '07779 159584', 'c@startmail.com') === '', 'a real local enquiry is not skipped');
check(ack_web_skip("Caf\u{00e9} owner here, Wi-Fi keeps dropping", '01202 123456', 'o@example.co.uk') === '', 'accented Latin text and a landline are fine');
@unlink(ACK_STORE);
check(ack_queue('web', 'Spammer', 'x@msn.com', '', 'Get leads now https://cutt.ly/abc', at('2026-10-06 10:00')) === 'skip-link', 'ack_queue refuses a pitch');
check(ack_queue('web', 'Claire', 'c@startmail.com', '07779 159584', 'I need help with Microsoft 365', at('2026-10-06 10:00')) === 'queued', 'ack_queue takes a real enquiry');
check(ack_queue('dell', 'Dee', 'd@example.com', '', "machine: Latitude 5430\nsee https://365techies.co.uk/dell-hardware/", at('2026-10-06 10:00')) === 'queued', 'the spam filter is for general enquiries only (a Dell request with our own link still queues)');
$noJs = (string)file_get_contents(__DIR__ . '/form-relay.php');
check(strpos($noJs, "require_once __DIR__ . '/pcm-ack-lib.php'") !== false && strpos($noJs, 'ack_queue(') !== false && (bool)preg_match('/catch \(Throwable \$\w+\)/', $noJs), 'the no-JS fallback queues replies too, guarded');
check(strpos($noJs, 'ack_queue(') < strpos($noJs, "header('Location: /contact/#message-sent', true, 303);\nexit;"), 'and before its redirect');

// ---- queue: one per person per day ----
$t0 = at('2026-10-06 10:00');
check(ack_queue('dell', 'John', 'J@Example.com', '', "machine: Latitude 5430", $t0) === 'queued', 'a Dell request is queued');
check(ack_queue('dell', 'John', 'j@example.com', '', '', $t0 + 3600) === 'dup', 'the same person within 24 h is not replied to twice');
check(ack_queue('dell', 'John', 'j@example.com', '', '', $t0 + 90000) === 'queued', 'after 24 h they can be again');
check(ack_queue('', 'X', 'x@example.com', '', '', $t0) === 'not-eligible', 'not a kind we reply to (a Service Pass report, an internal test)');
check(ack_queue('emailmove', 'X', 'not-an-email', '01202 775566', '', $t0) === 'no-contact', 'no email and a landline: nothing to reply to');

// ---- flush: email at once, text only 08:00-20:00, outcomes recorded ----
@unlink(ACK_STORE);
$mails = array(); $texts = array(); $said = array();
$mailOk = true;
$sendE = function ($to, $m) use (&$mails, &$mailOk) { $mails[] = array($to, $m); return $mailOk; };
$sendS = function ($to, $t) use (&$texts) { $texts[] = array($to, $t); return true; };
$say = function ($t) use (&$said) { $said[] = $t; };

$night = at('2026-10-06 22:30');
ack_queue('dell', 'John Standring', 'j@example.com', '07700 900111', "machine: Latitude 5430 \u{00b7} 14in", $night);
ack_queue('emailmove', 'Margaret', '', '07743 252609', "virgin_addresses: 1", $night);
$r = ack_flush($sendE, $sendS, $say, $night + 300);
check($r['sent'] === 1 && count($mails) === 1 && count($texts) === 0, 'at night the email goes, the text waits', json_encode($r));
check($mails[0][0] === 'j@example.com' && strpos($mails[0][1]['text'], 'Latitude 5430') !== false, 'email went to the enquirer with the model');
check(count($said) === 1 && strpos($said[0], 'Auto-reply sent to John Standring by email') !== false && strpos($said[0], 'still need a reply') !== false, 'Slack is told, and reminded they still need a reply', isset($said[0]) ? $said[0] : '');
$r = ack_flush($sendE, $sendS, $say, at('2026-10-07 08:05'));
check($r['sent'] === 1 && count($texts) === 1 && $texts[0][0] === '+447743252609', 'the text goes at 08:00 next morning', json_encode($r));
$r = ack_flush($sendE, $sendS, $say, at('2026-10-07 09:00'));
check($r['sent'] === 0, 'nothing is sent twice');
$raw = (string)file_get_contents(ACK_STORE);
check(strpos($raw, 'example.com') === false && strpos($raw, '7743') === false && strpos($raw, 'Margaret') === false, 'sent entries keep no name, email or number');

// ---- a text that cannot go out within 16 h is dropped ----
@unlink(ACK_STORE); $texts = array(); $said = array();
ack_queue('emailmove', 'Late', '', '07700 900222', '', at('2026-10-09 19:59'));   // Friday evening
$r = ack_flush($sendE, $sendS, $say, at('2026-10-10 20:30'));
check($r['sent'] === 0 && $r['stale'] === 1 && count($texts) === 0, 'too late to say "we have it": dropped, not sent', json_encode($r));

// ---- failures retry, then shout ----
@unlink(ACK_STORE); $mails = array(); $said = array(); $mailOk = false;
ack_queue('dell', 'Fay', 'f@example.com', '', '', $t0);
for ($i = 0; $i < 3; $i++) ack_flush($sendE, $sendS, $say, $t0 + 60 + $i * 300);
check(count($mails) === 3, 'a failed email is tried three times', (string)count($mails));
ack_flush($sendE, $sendS, $say, $t0 + 2000);
check(count($mails) === 3 && count($said) === 1 && strpos($said[0], 'could not be sent to Fay') !== false, 'then it stops and tells Slack to ring them', isset($said[0]) ? $said[0] : '');
$mailOk = true;

// ---- daily cap ----
@unlink(ACK_STORE); $mails = array();
for ($i = 0; $i < ACK_DAY_CAP + 5; $i++) ack_queue('dell', 'P' . $i, 'p' . $i . '@example.com', '', '', $t0);
for ($i = 0; $i < 12; $i++) ack_flush($sendE, $sendS, null, $t0 + 60 + $i * 60, 5);
check(count($mails) === ACK_DAY_CAP, 'no more than ' . ACK_DAY_CAP . ' replies in a day', (string)count($mails));

// ---- off switch ----
@unlink(ACK_STORE);
touch($TMPD . '/pcm-ack.off');
check(ack_queue('dell', 'Off', 'o@example.com', '', '', $t0) === 'off', 'pcm-ack.off stops queueing');
check(isset(ack_flush($sendE, $sendS, null, $t0)['skip']), 'and sending');
unlink($TMPD . '/pcm-ack.off');

// ---- the wiring the live files depend on ----
$relay = (string)file_get_contents(__DIR__ . '/slack-lead.php');
check(strpos($relay, "require_once __DIR__ . '/pcm-ack-lib.php'") !== false && strpos($relay, 'ack_queue(') !== false, 'the form relay queues replies');
check((bool)preg_match('/catch \(Throwable \$\w+\)/', $relay), 'and cannot be broken by the reply code (Throwable caught)');
check(strpos($relay, 'ack_queue(') > strpos($relay, 'curl_exec($ch)'), 'it queues only AFTER the Slack post');
$cron = (string)file_get_contents(__DIR__ . '/pcm-bkpoll.php');
check(strpos($cron, "ack_flush('ack_send_email_rv'") !== false, 'the 5-minute cron sends them');
check(strpos($cron, 'ack_flush(') < strpos($cron, "jout(array('ok' => false, 'error' => 'no_config'"), 'before any SimplyBook early exit, like the welcome');

// tidy
foreach (glob($TMPD . '/*') as $f) @unlink($f);
@rmdir($TMPD);
echo "\n" . ($fails ? "$fails FAILED\n" : "pcm-ack-test: all passed\n");
exit($fails ? 1 : 0);
