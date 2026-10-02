<?php
/*
 * Website enquiries (and every other lead) in the portal's inbox, and names from the job list (comms-lib.php,
 * 2 Oct 2026). Run:
 *   C:\tools\php\php.exe -d extension=mbstring api/comms-leads-test.php
 * Pure checks: Slack is never called and the inbox store is never opened. Each post below is built the way its sender
 * builds it (slack-lead.php, form-relay.php, ai-lead.php, pcm-mailmove-lib.php, pcm-bkpend-lib.php), and the Virgin
 * call-back card comes from the real mm_help_card().
 */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
error_reporting(E_ALL);
require __DIR__ . '/comms-lib.php';
require_once __DIR__ . '/pcm-mailmove-lib.php';

$fails = 0;
function check($ok, $what, $detail = '') { global $fails; echo ($ok ? "  PASS  " : "  FAIL  ") . $what . ($ok ? '' : "  [" . $detail . "]") . "\n"; if (!$ok) $fails++; }

/* slack-lead.php's post, as conversations.history returns a webhook message */
function web_post($ts, $f, $msg, $page, $wrap = false) {
    $esc = function ($s) { return str_replace(array('&', '<', '>'), array('&amp;', '&lt;', '&gt;'), $s); };
    $fields = array();
    foreach (array('Name' => 'name', 'Email' => 'email', 'Phone' => 'phone', 'Company' => 'company', 'Needs help with' => 'topic') as $lb => $k) {
        if (!isset($f[$k]) || $f[$k] === '') continue;
        $val = $esc($f[$k]);
        if ($wrap && $k === 'email') $val = '<mailto:' . $f[$k] . '|' . $f[$k] . '>';
        if ($wrap && $k === 'phone') $val = '<tel:' . preg_replace('/\s/', '', $f[$k]) . '|' . $f[$k] . '>';
        $fields[] = array('type' => 'mrkdwn', 'text' => '*' . $lb . ":*\n" . $val);
    }
    $blocks = array(array('type' => 'header', 'text' => array('type' => 'plain_text', 'text' => "\xF0\x9F\x94\x94 New website enquiry", 'emoji' => true)));
    if ($fields) $blocks[] = array('type' => 'section', 'fields' => $fields);
    if ($msg !== '') { $q = $esc($msg); if ($wrap) $q = str_replace('>', '&gt;', $q); $blocks[] = array('type' => 'section', 'text' => array('type' => 'mrkdwn', 'text' => "*Message:*\n" . ($wrap ? '&gt;' : '>') . str_replace("\n", "\n" . ($wrap ? '&gt;' : '>'), $q))); }
    $blocks[] = array('type' => 'context', 'elements' => array(array('type' => 'mrkdwn', 'text' => 'via ' . $page . " \xC2\xB7 14:05, Fri 2 Oct")));
    $sum = 'New website enquiry' . (!empty($f['name']) ? ' from ' . $f['name'] : '') . (!empty($f['email']) ? ($wrap ? ' <mailto:' . $f['email'] . '>' : ' <' . $f['email'] . '>') : '');
    return array('type' => 'message', 'subtype' => 'bot_message', 'bot_id' => 'B0BHTFHH3ST', 'ts' => $ts, 'text' => $sum, 'blocks' => $blocks);
}

echo "A  the website contact forms (slack-lead.php)\n";
$m1 = web_post('1791000000.000100', array('name' => 'Joe Bloggs', 'email' => 'Joe@Example.com', 'phone' => '07700 900123', 'topic' => 'Slow laptop'), "My laptop takes ages to start.\nCan you help & how much?", '/contact/');
$L = comms_lead_from_post($m1);
check($L && $L['kind'] === 'web' && $L['label'] === 'Website enquiry', 'a contact-form post is a website enquiry', json_encode($L));
check($L['name'] === 'Joe Bloggs' && $L['email'] === 'joe@example.com' && $L['phone'] === '07700 900123' && $L['number'] === '+447700900123', 'name, email (lower-cased), phone as typed, and the number', json_encode($L));
check($L['topic'] === 'Slow laptop' && $L['body'] === "My laptop takes ages to start.\nCan you help & how much?" && $L['page'] === '/contact/', 'what it is about, what they wrote (lines and "&" kept), the page', json_encode(array($L['topic'], $L['body'], $L['page'])));
$L2 = comms_lead_from_post(web_post('1791000000.000200', array('name' => 'Joe Bloggs', 'email' => 'joe@example.com', 'phone' => '07700 900123'), "Line one\nLine two", '/contact/', true));
check($L2 && $L2['email'] === 'joe@example.com' && $L2['number'] === '+447700900123' && $L2['body'] === "Line one\nLine two", 'the same with Slack\'s own wrapping (<mailto:>, <tel:>, &gt; quotes)', json_encode($L2));
$L3 = comms_lead_from_post(web_post('1791000000.000300', array('name' => 'Sue', 'phone' => '07700 900124', 'topic' => 'Refurbished Dell'), "looking_for: Latitude 5420, budget 300", '/dell-hardware/'));
check($L3 && $L3['label'] === 'Dell quote' && $L3['page'] === '/dell-hardware/', 'the Dell picker is a Dell quote', json_encode($L3));
$L4 = comms_lead_from_post(web_post('1791000000.000400', array('name' => 'Pat', 'phone' => '07700 900125', 'topic' => 'Virgin email move'), "virgin_addresses: pat@virginmedia.com", '/move-virgin-media-email-to-gmail/'));
check($L4 && $L4['label'] === 'Email move (ring-me-back)', 'the Virgin GBP 60 ring-me-back form', json_encode($L4));
$L5 = comms_lead_from_post(web_post('1791000000.000500', array('email' => 'anon@example.com'), 'Do you fix Macs?', '/contact/'));
check($L5 && $L5['name'] === '' && $L5['number'] === '' && $L5['email'] === 'anon@example.com', 'no name and no phone: still an enquiry, with no number', json_encode($L5));

echo "B  the other senders\n";
$nojs = array('type' => 'message', 'subtype' => 'bot_message', 'bot_id' => 'B0BHTFHH3ST', 'ts' => '1791000001.000100',
    'text' => "Website enquiry (no-JS fallback)\nName: Ann Smith\nEmail: ann@example.com\nPhone: 01202 123456\nTopic: Printer\nMessage: It will not print since the update\nPage: https://365techies.co.uk/printer-support/?x=1\nTime: 2026-10-02 10:00");
$L = comms_lead_from_post($nojs);
check($L && $L['name'] === 'Ann Smith' && $L['number'] === '+441202123456' && $L['topic'] === 'Printer' && $L['body'] === 'It will not print since the update' && $L['page'] === '/printer-support/',
    'the no-JS fallback (form-relay.php): plain "Label: value" lines, the page as a path', json_encode($L));
$ai = array('type' => 'message', 'subtype' => 'bot_message', 'bot_id' => 'B0BHTFHH3ST', 'ts' => '1791000001.000200', 'text' => 'New AI opportunity AI-0042 from Acme Ltd',
    'blocks' => array(array('type' => 'header', 'text' => array('type' => 'plain_text', 'text' => "\xF0\x9F\xA4\x96 New AI opportunity \xE2\x80\x94 AI-0042")),
        array('type' => 'section', 'fields' => array(array('type' => 'mrkdwn', 'text' => "*Name:*\nRuth Ade"), array('type' => 'mrkdwn', 'text' => "*Email:*\nruth@acme.example"),
            array('type' => 'mrkdwn', 'text' => "*Company:*\nAcme Ltd"), array('type' => 'mrkdwn', 'text' => "*Phone:*\n07700 900126"), array('type' => 'mrkdwn', 'text' => "*Category:*\nSales"))),
        array('type' => 'section', 'text' => array('type' => 'mrkdwn', 'text' => "*Problem:*\n>Quotes take us two days\n>to write")),
        array('type' => 'context', 'elements' => array(array('type' => 'mrkdwn', 'text' => "via /ai/ \xC2\xB7 09:10, Fri 2 Oct")))));
$L = comms_lead_from_post($ai);
check($L && $L['label'] === 'AI enquiry' && $L['name'] === 'Ruth Ade' && $L['company'] === 'Acme Ltd' && $L['topic'] === 'Sales' && $L['body'] === "Quotes take us two days\nto write" && $L['page'] === '/ai/',
    'an AI enquiry (ai-lead.php): the problem is what they wrote', json_encode($L));
$card = mm_help_card(array('name' => 'Tom Wilson', 'phone' => '07759 013464', 'email' => 'tom@example.com', 'virgin' => 'tom@virginmedia.com', 'count' => 1200, 'mb' => 900, 'phase' => 'checked', 'ver' => 28, 'machine' => 'ABC123'), 1791000000);
$vm = array('type' => 'message', 'subtype' => 'bot_message', 'bot_id' => 'B0BHTFHH3ST', 'ts' => '1791000001.000300', 'text' => $card['text'], 'blocks' => $card['blocks']);
$L = comms_lead_from_post($vm);
check($L && $L['kind'] === 'callback' && $L['label'] === 'Email move call-back' && $L['name'] === 'Tom Wilson' && $L['number'] === '+447759013464' && $L['email'] === 'tom@example.com',
    'PC Manager\'s "please ring" (the real mm_help_card)', json_encode($L));
check(strpos($L['body'], 'Virgin address: tom@virginmedia.com') !== false && strpos($L['body'], 'Mailbox: 1,200 emails') !== false && strpos($L['topic'], 'Virgin email move') === 0, '...with their Virgin address and mailbox size', json_encode($L));
$bk = array('type' => 'message', 'subtype' => 'bot_message', 'bot_id' => 'B0BHTFHH3ST', 'ts' => '1791000001.000400',
    'text' => ":telephone_receiver: *Booking started but never finished* - Joan Baker on *07700 900127*\n> joan@example.com - wanted: Remote fix - slot: Tue 6 Oct 10:00\n> Sent a code 25 min ago and never came back. Worth a ring.");
$L = comms_lead_from_post($bk);
check($L && $L['label'] === 'Unfinished booking' && $L['name'] === 'Joan Baker' && $L['number'] === '+447700900127' && $L['email'] === 'joan@example.com' && $L['topic'] === 'Wanted: Remote fix' && strpos($L['body'], 'Tue 6 Oct 10:00') !== false,
    'an unfinished booking (pcm-bkpend-lib.php)', json_encode($L));
$bk2 = array('type' => 'message', 'subtype' => 'bot_message', 'bot_id' => 'B0BHTFHH3ST', 'ts' => '1791000001.000500',
    'text' => ":telephone_receiver: *Booking started but never finished* - sam@example.com (no phone given)\n> sam@example.com\n> Sent a code 30 min ago and never came back. Worth a ring.");
$L = comms_lead_from_post($bk2);
check($L && $L['name'] === '' && $L['email'] === 'sam@example.com' && $L['number'] === '', '...with only an email: no name is invented from it', json_encode($L));

echo "C  not leads\n";
$person = $m1; unset($person['bot_id'], $person['subtype']); $person['user'] = 'UBQSJND44';
check(comms_lead_from_post($person) === null, 'a person\'s own message is never an enquiry');
check(comms_lead_from_post(array('ts' => '1.1', 'bot_id' => 'B1', 'subtype' => 'bot_message', 'text' => ":speech_balloon: Text from +447700900130 (not a number we hold): hello")) === null, 'a text post is a text, not an enquiry (it is matched as before)');
check(comms_lead_from_post(array('ts' => '1.2', 'bot_id' => 'B1', 'subtype' => 'bot_message', 'text' => 'Service report not in the portal - Ann')) === null, 'a service report is not an enquiry');
$t = $m1; $t['text'] .= ' [INTERNAL TEST]';
check(comms_lead_from_post($t) === null, 'an [INTERNAL TEST] post is not an enquiry');

echo "D  the inbox item\n";
$it = comms_lead_item(comms_lead_from_post($m1), $m1, 1791000500);
check($it['type'] === 'web' && $it['ext_id'] === 'slack-1791000000.000100' && $it['slack_ts'] === '1791000000.000100' && $it['number'] === '+447700900123' && $it['at'] === gmdate('c', 1791000000),
    'type web, keyed and linked to its post, received when the post was', json_encode($it));
check($it['handled'] === false && $it['lead']['name'] === 'Joe Bloggs' && $it['lead']['label'] === 'Website enquiry', 'not answered yet: open');
$r1 = $m1; $r1['reactions'] = array(array('name' => 'white_check_mark', 'users' => array('UBQSJND44'), 'count' => 1));
check(comms_lead_item(comms_lead_from_post($r1), $r1, 1)['handled'] === true, 'already ticked in Slack: arrives done');
$r2 = $m1; $r2['reply_count'] = 1; $r2['reply_users'] = array('UBQ7UE0G4');
check(comms_lead_item(comms_lead_from_post($r2), $r2, 1)['handled'] === true, 'already answered in its thread by a person: arrives done');
$r3 = $m1; $r3['reply_count'] = 1; $r3['reply_users'] = array('U0BJCHP9G3W');
check(comms_lead_item(comms_lead_from_post($r3), $r3, 1)['handled'] === false, 'only the app has replied (a reminder): still open');

$inboxDone = array(array('type' => 'web', 'slack_ts' => '1791000000.000100', 'handled' => true));
check(lc_answered($m1, array('kind' => 'web', 'number' => ''), $inboxDone) === true, 'the lead reminders count Done in the portal as answered (even if the Slack tick could not be added)');
check(lc_answered($m1, array('kind' => 'web', 'number' => ''), array(array('type' => 'web', 'slack_ts' => '1791000000.000100', 'handled' => false))) === false
    && lc_answered($m1, array('kind' => 'web', 'number' => ''), array(array('type' => 'web', 'slack_ts' => '9.9', 'handled' => true))) === false, '...only that enquiry\'s own item, and only when it is done');

echo "E  the board: Messages (texts + enquiries) and the counts\n";
$items = array(
    array('id' => 't1', 'type' => 'sms_in', 'number' => '+447700900140', 'at' => '2026-10-02T09:00:00+00:00', 'body' => 'Hi', 'handled' => false, 'match' => array()),
    array('id' => 'v1', 'type' => 'voicemail', 'number' => '+447584168898', 'at' => '2026-10-01T18:30:00+00:00', 'audio' => '', 'handled' => false, 'match' => array('status' => 'NO_MATCH')),
    array('id' => 'w1', 'type' => 'web', 'number' => '+447700900140', 'at' => '2026-10-02T10:00:00+00:00', 'body' => 'Also emailing', 'handled' => false, 'match' => array(),
          'lead' => array('kind' => 'web', 'label' => 'Website enquiry', 'name' => 'Joe Bloggs', 'email' => 'joe@example.com', 'phone' => '07700 900140', 'company' => '', 'topic' => 'Laptop', 'page' => '/contact/')),
    array('id' => 'w2', 'type' => 'web', 'number' => '', 'at' => '2026-10-02T11:00:00+00:00', 'body' => 'Do you fix Macs?', 'handled' => false, 'match' => array(),
          'lead' => array('kind' => 'web', 'label' => 'Website enquiry', 'name' => '', 'email' => 'anon@example.com', 'phone' => '', 'company' => '', 'topic' => '', 'page' => '/contact/')),
    array('id' => 'w3', 'type' => 'web', 'number' => '+447584168898', 'at' => '2026-09-30T11:00:00+00:00', 'body' => 'Booking', 'handled' => true, 'match' => array(),
          'lead' => array('kind' => 'callback', 'label' => 'Unfinished booking', 'name' => 'D Gahan', 'email' => '', 'phone' => '07584168898', 'company' => '', 'topic' => '', 'page' => '')),
);
$names = comms_names_with_jobs(array('+447584168898' => array('name' => 'Dee G', 'src' => 'textmagic')), array('+447584168898' => array('name' => 'Davina Gahan', 'src' => 'job')));
$b = comms_board($items, $names, 'k', strtotime('2026-10-02T12:00:00Z'));
check(count($b['webs']) === 3 && $b['webs'][0]['id'] === 'w2' && $b['webs'][1]['id'] === 'w1', 'enquiries newest first', json_encode(array_column($b['webs'], 'id')));
check($b['open_webs'] === 2 && $b['total_webs'] === 3, 'two open enquiries of three');
check($b['open'] === 3, 'to answer = people: Joe (a text AND an enquiry: once), the Mac enquiry with no number, and the voicemail caller', $b['open']);
check($b['webs'][1]['who'] === 'Joe Bloggs' && $b['webs'][1]['src'] === 'form' && $b['webs'][1]['mobile'] === true && $b['webs'][1]['email'] === 'joe@example.com', 'an enquiry carries the name THEY typed, their number and email', json_encode($b['webs'][1]));
check($b['webs'][0]['who'] === '' && $b['webs'][0]['n'] === '' && $b['webs'][0]['email'] === 'anon@example.com', 'no name, no number: the email is all there is');
check($b['webs'][2]['cust'] === 'Davina Gahan' && $b['webs'][2]['cust_src'] === 'job' && $b['webs'][2]['who'] === 'D Gahan', 'an enquiry from someone we wrote up as a job says so beside what they typed', json_encode($b['webs'][2]));
check($b['vms'][0]['who'] === 'Davina Gahan' && $b['vms'][0]['src'] === 'job', 'a voicemail from a job\'s mobile is named by the job, over the Textmagic address book (the 1 Oct screenshot: +447584168898 unnamed)', json_encode($b['vms'][0]));
check(count($b['texts']) === 1 && $b['texts'][0]['n'] === '+447700900140', 'texts are still threaded by number, without the enquiry in them');

echo "F  names from the job list\n";
$tmp = tempnam(sys_get_temp_dir(), 'jobs');
file_put_contents($tmp, json_encode(array('jobs' => array(
    array('id' => 'a', 'ts' => 100, 'name' => 'Old Name', 'phone' => '', 'mobile' => '07700 900150'),
    array('id' => 'b', 'ts' => 200, 'name' => 'Davina Gahan', 'phone' => '07584168898', 'mobile' => ''),
    array('id' => 'c', 'ts' => 300, 'name' => 'New Name', 'phone' => '', 'mobile' => '07700900150'),
    array('id' => 'd', 'ts' => 400, 'name' => '07700 900151', 'phone' => '07700 900151'),
    array('id' => 'e', 'ts' => 500, 'name' => 'Jules', 'phone' => '01202 096096.  Mob: 07595 691892'),
))));
$jn = comms_job_names($tmp); @unlink($tmp);
check(($jn['+447584168898']['name'] ?? '') === 'Davina Gahan' && ($jn['+447584168898']['src'] ?? '') === 'job', 'phone and mobile both name the person', json_encode($jn));
check(($jn['+447700900150']['name'] ?? '') === 'New Name', 'the newest job wins');
check(!isset($jn['+447700900151']), 'a "name" that is only a number is no name');
check(count($jn) === 2, 'a box holding two numbers at once is not guessed at', json_encode(array_keys($jn)));
$keep = comms_names_with_jobs(array('+447700900160' => array('name' => 'Real Customer', 'src' => 'customer')), array('+447700900160' => array('name' => 'Job Name', 'src' => 'job')));
check($keep['+447700900160']['name'] === 'Real Customer', 'our customer records outrank a job name');
check(comms_name_for('+447700900161', array('status' => 'MATCH', 'name' => 'Matched'), array('+447700900161' => array('name' => 'Job', 'src' => 'job')))[0] === 'Matched', 'a customer MATCH still outranks everything');

echo "G  at source level\n";
$lib = (string)file_get_contents(__DIR__ . '/comms-lib.php');
check(strpos($lib, "elseif ((\$L = comms_lead_from_post(\$m)) !== null) { \$posts[(string)\$m['ts']] = \$m; \$leads[] = array(\$L, \$m); }") !== false, 'the sweep reads enquiry posts from the same history it already fetches');
check(strpos($lib, "comms_add_item(comms_lead_item(\$pair[0], \$pair[1], \$now))") !== false && strpos($lib, "if (isset(\$have['slack-' . \$pair[0]['ts']])) continue;") !== false, 'each comes in once (keyed by its post)');
check(strpos($lib, "if (\$type !== 'sms_in' && \$type !== 'voicemail' && \$type !== 'web' && \$type !== 'email') continue;") !== false, 'enquiries (and emails) get ticks and thread replies like texts and voicemails');
$api = (string)file_get_contents(__DIR__ . '/comms-api.php');
check(strpos($api, "'webs' => \$b['webs']") !== false && strpos($api, 'comms_names_with_jobs($snap[\'names\'], comms_job_names())') !== false, 'the portal API sends the enquiries and the job names');
$inbox = (string)file_get_contents(__DIR__ . '/comms.php');
check(strpos($inbox, "if ((\$it['type'] ?? '') === 'web' || (\$it['type'] ?? '') === 'email') continue;") !== false, 'the old per-number inbox page leaves enquiries (and emails) out instead of a blank-number thread');
check(strpos($lib, '?' . '>') === false, 'no closing tag in comms-lib.php');

echo "\n" . ($fails ? "comms-leads-test: $fails FAILED\n" : "comms-leads-test: all passed\n");
exit($fails ? 1 : 0);
