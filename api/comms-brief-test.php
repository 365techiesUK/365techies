<?php
/*
 * "What they want" for each website enquiry (comms-brief-lib.php, 29 Oct 2026). Run:
 *   C:\tools\php\php.exe -d extension=mbstring api/comms-brief-test.php
 * Pure checks: no Slack, no store. Case A is the real enquiry that sat unanswered for a day (28 Oct 2026), with the
 * name and number left out.
 */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
error_reporting(E_ALL);
require __DIR__ . '/comms-brief-lib.php';

$fails = 0;
function check($ok, $what, $detail = '') { global $fails; echo ($ok ? "  PASS  " : "  FAIL  ") . $what . ($ok ? '' : "  [" . $detail . "]") . "\n"; if (!$ok) $fails++; }
function has($list, $needle) { foreach ((array)$list as $x) if (strpos($x, $needle) !== false) return true; return false; }

echo "A  the Virgin email enquiry from 28 Oct\n";
$body = "Sky currently provides my broadband but my email address is a virgin one, I need to change urgently probably to Gmail. "
    . "I currently correspond with a number of banks, family and friends,BCP council,government departments,  car  and home insurances and many others. "
    . "Although I used to be fairly computerate literate that is no longer the case and I need assistance. \n"
    . "I use a Windows PC on Outlook but also run an Ipad alongside.\nI left a message today but so far no reaction hence this message to confirm. \n"
    . "I am usually available except when dog walking or shopping when the answerphone or my wife will pick up messages. My home address is in Mudeford.\n\n"
    . "\u{2014} journey \u{2014}\nfirst seen: 2026-10-28 via referral (https://www.bing.com/), landed on /book-service/";
$b = comms_lead_brief(array('label' => 'Website enquiry', 'topic' => 'Home IT support', 'company' => '', 'body' => $body));
check($b['need'] === 'Move their Virgin Media email address to Gmail', 'the job: move the Virgin address to Gmail', $b['need']);
check(strpos($b['offer'], "\u{00a3}60 per address") !== false && strpos($b['offer'], 'full PC service') !== false, 'our set price for it, with the PC service', $b['offer']);
check($b['urgent'] === true, '"urgently" makes it urgent');
check(has($b['facts'], 'already tried to reach us'), 'he left a message first', json_encode($b['facts']));
check(has($b['facts'], 'Uses: Windows PC, Outlook, iPad'), 'his kit: Windows PC, Outlook, iPad (Gmail is where he is going, not kit)', json_encode($b['facts']));
check(has($b['facts'], 'Broadband: Sky'), 'broadband: Sky', json_encode($b['facts']));
check(has($b['facts'], 'Not confident with computers'), '"no longer" computer literate', json_encode($b['facts']));
check(has($b['facts'], 'Area: Mudeford'), 'where he lives', json_encode($b['facts']));
check(strpos($b['when'], 'I am usually available except when dog walking') === 0, 'when to ring, in his own words', $b['when']);
$x = comms_lead_brief(array('label' => 'Website enquiry', 'topic' => '', 'company' => '', 'body' => 'Our old laptop is on its last legs, could you recommend a laptop and set it up?'));
check($x['need'] === 'A new computer — choosing or setting one up', 'asking for a new laptop is a new computer', json_encode($x));
check(has($b['warn'], 'iPad') && has($b['warn'], 'Apple'), 'the iPad: we don\'t do Apple', json_encode($b['warn']));
check($b['found'] === 'Bing, landed on /book-service/', 'how he found us', $b['found']);
check(!in_array('Move their email address to a new provider', $b['also'], true), 'Sky broadband is not read as a Sky email move', json_encode($b['also']));
check(!has($b['also'], 'Internet') && !has($b['also'], 'Email not working'), 'nothing else invented', json_encode($b['also']));
check(!preg_match('/journey|bing\.com/u', $b['when'] . implode(' ', $b['facts'])), 'the journey block stays out of the facts');

echo "B  the jobs\n";
$r = function ($topic, $body, $label = 'Website enquiry', $company = '') { return comms_lead_brief(array('label' => $label, 'topic' => $topic, 'company' => $company, 'body' => $body)); };
$x = $r('', 'My laptop takes ages to start and keeps freezing.');
check($x['need'] === 'PC slow, crashing or not starting' && strpos($x['offer'], "\u{00a3}20") !== false, 'slow laptop -> remote fix from 20', json_encode($x));
check(has($x['facts'], 'Uses: laptop'), 'a laptop', json_encode($x['facts']));
$x = $r('', 'Our broadband keeps dropping out every evening.');
check($x['need'] === 'Internet or Wi-Fi problem' && !in_array('PC slow, crashing or not starting', $x['also'], true), 'broadband dropping is the internet, not a slow PC', json_encode($x));
$x = $r('', 'Someone rang saying they were from my bank and I gave them access to my computer with AnyDesk.');
check($x['need'] === 'Possible scam or hacked account' && has($x['warn'], 'never promise'), 'a scam, with the no-refund-promise warning', json_encode($x));
$x = $r('', 'My PC says it can\'t run Windows 11 and Windows 10 support has ended.');
check($x['need'] === 'Windows 11 upgrade' && strpos($x['offer'], "\u{00a3}60") !== false, 'Windows 11 on an older PC', json_encode($x));
$x = $r('', 'My external hard drive is clicking and I have lost all my photos.');
check($x['need'] === 'Lost files or a failed drive' && has($x['warn'], 'clicking drive'), 'a clicking drive: leave it off', json_encode($x));
$x = $r('', 'I want to keep my BT email address when I move to another broadband company.');
check($x['need'] === 'Move their email address to a new provider' && strpos($x['offer'], 'quote it first') !== false, 'a BT email move has no set price', json_encode($x));
$x = $r('', 'Can you help me move my Plusnet email?');
check($x['need'] === 'Move their Plusnet email address' && strpos($x['offer'], "\u{00a3}60") !== false, 'Plusnet email move', json_encode($x));
$x = $r('', 'Our printer won\'t print from the new laptop and email keeps stopping on my iPhone.');
check($x['need'] === 'Printer or scanner problem' && in_array('Email not working', $x['also'], true), 'first job plus "also mentions"', json_encode($x));
check(has($x['warn'], 'iPhone'), 'iPhone: no Apple', json_encode($x['warn']));
$x = $r('Business IT support', 'We need Cyber Essentials for a contract.', 'Website enquiry', 'Acme Ltd');
check($x['need'] === 'Cyber Essentials' && strpos($x['offer'], "\u{00a3}99") !== false && has($x['facts'], 'Business: Acme Ltd'), 'Cyber Essentials, a business', json_encode($x));
$x = $r('Home IT support', 'Please could you give me a ring after 2pm.');
check($x['need'] === 'Home IT support: Please could you give me a ring after 2pm.' && $x['when'] === 'Please could you give me a ring after 2pm.', 'no job found: the topic and their first sentence', json_encode($x));
$x = $r('', '');
check($x['need'] === 'No details given — ring and ask' && $x['facts'] === array() && $x['urgent'] === false, 'an empty enquiry', json_encode($x));

echo "C  the request types\n";
$x = $r('Wanted: Remote 365 Quick Fix', 'Picked a slot: Thu 30 Oct 10:00. Sent a code and never came back to finish.', 'Unfinished booking');
check(strpos($x['need'], 'Started booking online') === 0 && has($x['facts'], 'Wanted: Remote 365 Quick Fix'), 'an unfinished booking', json_encode($x));
$x = $r('Virgin email move - pressed "Stuck? We\'ll do it for you" in PC Manager', 'Virgin address: a@virginmedia.com', 'Email move call-back');
check(strpos($x['need'], 'Stuck moving their Virgin Media email') === 0 && strpos($x['offer'], "\u{00a3}60") !== false, 'the PC Manager email-move call-back', json_encode($x));
$x = $r('Business Care: 2 x Business Care', 'Ordered Business Care (support + Microsoft 365) on the website.', 'Business Care order');
check($x['need'] === 'Ordered Business Care on the website — set it up and ring them', 'a Business Care order', $x['need']);
$x = $r('', 'Asked us to ring them back.', 'Get Help button');
check(strpos($x['need'], 'Pressed Get Help') === 0, 'the Get Help button', $x['need']);

echo "D  wording rules\n";
$src = (string)file_get_contents(__DIR__ . '/comms-brief-lib.php');
check(strpos($src, '?' . '>') === false, 'no closing tag');
check(!preg_match('/\\\\u[0-9a-f]{4}(?!\})/i', $src), 'no \\uXXXX escapes left in single-quoted strings (PHP prints them as-is)');
check(stripos($src, '£65 per') === false && stripos($src, 'refund guaranteed') === false && stripos($src, 'you will get your money') === false, 'no wrong Virgin price and no refund promise');
check(strpos($src, 'curl_') === false && strpos($src, 'file_get_contents(\'http') === false, 'nothing a customer writes leaves the server');

echo "\n" . ($fails ? "comms-brief-test: $fails FAILED\n" : "comms-brief-test: all passed\n");
exit($fails ? 1 : 0);
