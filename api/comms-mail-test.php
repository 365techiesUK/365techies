<?php
/*
 * Emails in the staff inbox (comms-mail-lib.php, 2 Oct 2026). Run:
 *   C:\tools\php\php.exe -d extension=mbstring api/comms-mail-test.php
 * The mailbox is a fake (the same calls the real one makes), the inbox store is a temp file, Slack is never reached
 * (no token exists locally). Headers below are the shapes real senders use.
 */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
error_reporting(E_ALL);
$TMP = sys_get_temp_dir() . '/comms-mail-test-' . getmypid();
@mkdir($TMP);
define('COMMS_FILE', $TMP . '/comms-data.json');
define('COMMS_LOCK', $TMP . '/comms-data.json.lock');
require __DIR__ . '/comms-lib.php';

$fails = 0;
function check($ok, $what, $detail = '') { global $fails; echo ($ok ? "  PASS  " : "  FAIL  ") . $what . ($ok ? '' : "  [" . $detail . "]") . "\n"; if (!$ok) $fails++; }
function hdr($lines) { return implode("\r\n", $lines) . "\r\n\r\n"; }

echo "A  the mailbox settings (api/mail-imap.php)\n";
file_put_contents("$TMP/mail-imap.php", "<?php\n\$MAIL_USER = 'Info@365techies.co.uk'; \$MAIL_PASS = 'x1';\n\$MAIL2_USER = 'help@365techies.co.uk'; \$MAIL2_PASS = 'x2';\n\$MAIL3_USER = 'info@365techies.co.uk'; \$MAIL3_PASS = 'dup';\n\$MAIL4_USER = 'nopass@365techies.co.uk';\n");
file_put_contents("$TMP/vm-imap.php", "<?php \$VM_HOST='uk1001.siteground.eu'; \$VM_USER='voice-mail@365techies.co.uk'; \$VM_PASS='v';");
$cfg = comms_mail_config("$TMP/mail-imap.php", "$TMP/vm-imap.php");
check(count($cfg) === 2 && $cfg[0]['user'] === 'info@365techies.co.uk' && $cfg[1]['user'] === 'help@365techies.co.uk', 'two mailboxes; the same one twice and one with no password are ignored', json_encode($cfg));
check($cfg[0]['host'] === 'uk1001.siteground.eu' && $cfg[0]['folder'] === 'INBOX' && $cfg[0]['key'] === 'info@365techies.co.uk', 'no host given: the voicemail mailbox\'s server; folder INBOX');
file_put_contents("$TMP/mail-imap2.php", "<?php \$MAIL_HOST='mail.example.net'; \$MAIL_USER='a@b.co'; \$MAIL_PASS='p'; \$MAIL_FOLDER='Customers';");
$c2 = comms_mail_config("$TMP/mail-imap2.php", "$TMP/none.php");
check($c2[0]['host'] === 'mail.example.net' && $c2[0]['key'] === 'a@b.co/Customers', 'a host and folder can be named');
check(comms_mail_config("$TMP/absent.php") === array(), 'no settings file: no mailboxes (the sweep skips quietly)');

echo "B  reading the headers\n";
$m = comms_mail_head(hdr(array('From: =?UTF-8?B?Sm9zw6kgw4FsdmFyZXo=?= <Jose@Example.COM>', 'Subject: =?iso-8859-1?Q?Caf=E9_laptop_=A3200?=', 'Reply-To: jose.home@example.com', 'Date: Fri, 2 Oct 2026 09:15:00 +0100 (BST)')));
check($m['name'] === "Jos\xC3\xA9 \xC3\x81lvarez" && $m['from'] === 'jose@example.com', 'an encoded name decoded, the address lower-cased', json_encode($m['name']));
check($m['subject'] === "Caf\xC3\xA9 laptop \xC2\xA3200" && $m['reply_to'] === 'jose.home@example.com' && $m['at'] === strtotime('2026-10-02T08:15:00Z'), 'Latin-1 subject (with a pound sign), Reply-To and the date', json_encode(array($m['subject'], $m['at'])));
$m2 = comms_mail_head("From: \"Smith, Jo\" <jo@example.org>, Other <o@x.com>\nSubject: =?UTF-8?Q?Printer_?=\n =?UTF-8?Q?help?=\n");
check($m2['name'] === 'Smith, Jo' && $m2['from'] === 'jo@example.org' && $m2['subject'] === 'Printer help', 'a quoted name with a comma; two encoded words folded over two lines', json_encode($m2));
check(comms_mail_head("From: bare@example.com\n")['from'] === 'bare@example.com' && comms_mail_head("From: 'x@y.com' <x@y.com>\n")['name'] === '', 'a bare address; a "name" that is only the address is no name');

echo "C  what comes in and what is left out\n";
$skip = function ($lines, $known = null) { return comms_mail_skip(comms_mail_head(hdr($lines)), $known); };
check($skip(array('From: Mary Jones <maryjones1948@gmail.com>', 'Subject: My laptop will not start')) === '', 'a person at Gmail comes in');
check($skip(array('From: Reception <info@harbourdental.example>', 'Subject: Printer down again')) === '', 'a business\'s info@ address comes in (it is a person writing)');
check($skip(array('From: Mum <mum@btinternet.com>', 'Subject: Re: your visit')) === '' && $skip(array('From: Pat <pat@googlemail.com>', 'Subject: hi')) === '', 'BT and old Googlemail addresses come in');
check($skip(array('From: 365 Techies <info@365techies.co.uk>', 'Subject: Your service report')) === 'our own' && $skip(array('From: Steve <steve@365techies.co.uk>', 'Subject: x')) === 'our own', 'our own domain is left out (staff, the website\'s own mail)');
check($skip(array('From: SimplyBook.me <noreply@simplybook.it>', 'Subject: New booking')) === 'no-reply senders', 'SimplyBook\'s booking mail');
check($skip(array('From: GoCardless <help@gocardless.com>', 'Subject: Payment confirmed')) === 'services and notifications', 'GoCardless (help@ but a service)');
check($skip(array('From: HubSpot <noreply@notifications.hubspot.com>', 'Subject: New form submission')) === 'no-reply senders', 'a HubSpot form notification');
check($skip(array('From: Screwfix <offers@screwfix.example>', 'List-Unsubscribe: <mailto:u@screwfix.example>', 'Subject: 20% off')) === 'newsletters and lists', 'a newsletter (List-Unsubscribe)');
check($skip(array('From: Bob <bob@example.com>', 'Precedence: bulk', 'Subject: x')) === 'newsletters and lists', 'bulk mail (Precedence)');
check($skip(array('From: Ann <ann@example.com>', 'Auto-Submitted: auto-replied', 'Subject: Re: booking')) === 'automatic', 'an auto-reply (Auto-Submitted)');
check($skip(array('From: Ann <ann@example.com>', 'Subject: Automatic reply: Your booking')) === 'automatic' && $skip(array('From: Ann <ann@example.com>', 'Subject: Out of Office: back Monday')) === 'automatic', 'Outlook\'s automatic reply and out-of-office');
check($skip(array('From: Mail Delivery System <MAILER-DAEMON@mx10.example>', 'Content-Type: multipart/report; report-type=delivery-status', 'Subject: Undelivered Mail')) === 'automatic', 'a bounce');
check($skip(array('From: Dave <dave@example.com>', 'Subject: Accepted: Remote session Tuesday')) === 'automatic', 'a meeting response');
check($skip(array('From: Prince <prince@example.com>', 'X-Spam-Flag: YES', 'Subject: Money')) === 'spam' && $skip(array('From: x <x@example.com>', 'Subject: ***SPAM*** win')) === 'spam', 'what the spam filter flagged');
check($skip(array('From: Tom <tom.smith@dell.com>', 'Subject: Your quote')) === 'services and notifications', 'a service domain (Dell) is left out...');
$K = array('name' => 'Tom Smith', 'src' => 'customer');
check($skip(array('From: Tom <tom.smith@dell.com>', 'Subject: Your quote'), $K) === '' && $skip(array('From: Shop <noreply@shop.example>', 'Subject: x'), $K) === '', '...unless it is someone we hold (a customer is let through the service and no-reply rules)');
check($skip(array('From: Tom <tom.smith@dell.com>', 'List-Unsubscribe: <x>', 'Subject: x'), $K) === 'newsletters and lists' && $skip(array('From: x <x@365techies.co.uk>'), $K) === 'our own', '...never through the list, automatic or own-domain rules');

echo "D  the text of an email\n";
check(comms_mail_text(quoted_printable_encode("It costs \xA360 \x96 thanks"), 4, 'windows-1252', false) === "It costs \xC2\xA360 \xE2\x80\x93 thanks", 'Windows-1252, quoted-printable: the pound sign and the dash come out right');
check(comms_mail_text("Price \xA345", 0, 'iso-8859-1', false) === "Price \xC2\xA345", '"ISO-8859-1" read as Windows-1252 (what it really is)');
check(comms_mail_text(base64_encode("Hello \xE2\x9C\x93"), 3, 'UTF-8', false) === "Hello \xE2\x9C\x93", 'base64 UTF-8');
check(comms_mail_text("No charset \xA3", 0, '', false) === "No charset \xC2\xA3", 'no charset and not UTF-8: read as Windows-1252, never thrown away');
$html = '<html><head><style>p{color:red}</style><title>t</title></head><body><p>Hi there,</p><p>The &pound;60 move&nbsp;please.</p><script>x()</script><div class="gmail_quote">On Thu ... wrote:<blockquote>old stuff</blockquote></div></body></html>';
$ht = comms_mail_strip(comms_mail_text($html, 0, 'UTF-8', true));
check($ht === "Hi there,\n\nThe \xC2\xA360 move please.", 'HTML only: styles, scripts and the quoted reply gone, paragraphs kept', json_encode($ht));

echo "E  what they wrote (the history cut off)\n";
check(comms_mail_strip("Yes Tuesday is fine.\n\nOn Thu, 1 Oct 2026 at 10:00, 365 Techies <info@365techies.co.uk> wrote:\n> Can we come Tuesday?") === 'Yes Tuesday is fine.', 'Gmail\'s "On ... wrote:"');
check(comms_mail_strip("Thanks!\nOn Thu, 1 Oct 2026, 10:00 365 Techies <info@365techies.co.uk>\nwrote:\n> old") === 'Thanks!', '...when the line wraps');
check(comms_mail_strip("Great, see you then\n\nFrom: 365 Techies <info@365techies.co.uk>\nSent: 01 October 2026 10:00\nTo: Ann\nSubject: Booking") === 'Great, see you then', 'Outlook\'s From/Sent block');
check(comms_mail_strip("Ok\n-----Original Message-----\nFrom: x") === 'Ok' && comms_mail_strip("Ok\n________________________________\nFrom: x") === 'Ok', '"Original Message" and Outlook\'s line');
check(comms_mail_strip("Please ring me\n-- \nJo Bloggs\n07700 900123") === 'Please ring me' && comms_mail_strip("Hi\nSent from my iPhone") === 'Hi', 'a signature after "-- "; "Sent from my iPhone"');
check(comms_mail_strip("---------- Forwarded message ---------\nFrom: BT <x@bt.com>\nYour email is closing") === "From: BT <x@bt.com>\nYour email is closing", 'only a forward: what they forwarded is shown');
check(comms_mail_strip("> only quoted") === '> only quoted', 'nothing but quotes: shown whole rather than blank');
check(mb_strlen(comms_mail_strip(str_repeat('a', 4000))) === 2500, 'capped at 2,500 characters');

echo "F  a phone number in the message\n";
check(comms_mail_phone("Call me on 07700 900123 after 5") === '+447700900123' && comms_mail_phone("Tel: +44 (0)1202 123456") === '+441202123456', 'a mobile; a landline written +44 (0)');
check(comms_mail_phone("Your number 01202 775566 and 07520 615332 - mine is 07700 900124") === '+447700900124', 'our own numbers (quoted back at us) are skipped');
check(comms_mail_phone("Order 0123456 ref 99") === '', 'no number: nothing invented');

echo "G  people we hold, by email address\n";
file_put_contents("$TMP/pcm-data.json", json_encode(array('customers' => array(
    'c1' => array('name' => 'Margaret Price', 'email' => 'Margaret@Example.com'),
    'c2' => array('name' => 'Harbour Dental', 'sb_email' => 'office@harbour.example', 'org' => array('members' => array('m1' => array('name' => 'Lucy', 'email' => 'lucy@harbour.example')))),
))));
file_put_contents("$TMP/pcm-jobs.json", json_encode(array('jobs' => array(array('ts' => 1, 'name' => 'Old Name', 'email' => 'sam@uni.example'), array('ts' => 2, 'name' => 'Sam Student', 'email' => 'SAM@uni.example'), array('ts' => 3, 'name' => 'Margaret P (job)', 'email' => 'margaret@example.com')))));
$known = comms_mail_known_map("$TMP/pcm-data.json", "$TMP/pcm-jobs.json");
check(($known['mail:margaret@example.com']['name'] ?? '') === 'Margaret Price' && $known['mail:margaret@example.com']['src'] === 'customer', 'a customer record, any case; it outranks a job');
check(($known['mail:lucy@harbour.example']['name'] ?? '') === 'Lucy at Harbour Dental' && ($known['mail:office@harbour.example']['name'] ?? '') === 'Harbour Dental', 'a business\'s staff member, and its booking email');
check(($known['mail:sam@uni.example']['name'] ?? '') === 'Sam Student' && $known['mail:sam@uni.example']['src'] === 'job', 'the job list: the newest job\'s name');

echo "H  the poll (a fake mailbox making the real calls)\n";
function part($type, $sub, $enc, $params = array(), $disp = '', $dparams = array(), $bytes = 100) {
    $p = new stdClass; $p->type = $type; $p->subtype = $sub; $p->encoding = $enc; $p->bytes = $bytes;
    $p->parameters = array_map(function ($k, $v) { $o = new stdClass; $o->attribute = $k; $o->value = $v; return $o; }, array_keys($params), $params);
    $p->ifdisposition = $disp !== '' ? 1 : 0; if ($disp !== '') $p->disposition = $disp;
    $p->dparameters = array_map(function ($k, $v) { $o = new stdClass; $o->attribute = $k; $o->value = $v; return $o; }, array_keys($dparams), $dparams);
    return $p;
}
function multi($sub, $parts) { $p = new stdClass; $p->type = 1; $p->subtype = $sub; $p->parts = $parts; $p->encoding = 0; $p->bytes = 0; return $p; }
$MB = array();   // uid => [header, structure, sections, answered]
$now = strtotime('2026-10-02T10:00:00Z');
$MB[101] = array(hdr(array('From: Mary Jones <maryjones1948@gmail.com>', 'Subject: Laptop won\'t start', 'Date: Thu, 1 Oct 2026 20:00:00 +0100')),
    multi('ALTERNATIVE', array(part(0, 'PLAIN', 4, array('charset' => 'windows-1252')), part(0, 'HTML', 4, array('charset' => 'windows-1252')))),
    array('1' => quoted_printable_encode("It beeps three times \x96 can you help? \xA3 is no object.\n\nMary\n07700 900130"), '2' => '<p>html copy</p>'), true);
$MB[102] = array(hdr(array('From: Screwfix <offers@screwfix.example>', 'List-Unsubscribe: <mailto:u@x>', 'Subject: Deals')), part(0, 'PLAIN', 0), array('1' => 'deals'), false);
$MB[103] = array(hdr(array('From: "Harbour Dental" <office@harbour.example>', 'Subject: Invoice query', 'Date: Fri, 2 Oct 2026 08:00:00 +0100')),
    multi('MIXED', array(multi('ALTERNATIVE', array(part(0, 'PLAIN', 3, array('charset' => 'UTF-8')), part(0, 'HTML', 3, array('charset' => 'UTF-8')))),
        part(3, 'PDF', 3, array('name' => 'invoice-4411.pdf'), 'ATTACHMENT', array('filename' => 'invoice-4411.pdf')),
        part(5, 'PNG', 3, array('name' => 'image001.png'), 'INLINE', array('filename' => 'image001.png')))),
    array('1.1' => base64_encode("Is this invoice right?\n\nOn Thu, 1 Oct 2026, 365 Techies wrote:\n> old"), '1.2' => base64_encode('<p>x</p>')), false);
$posts = array(); $validity = 7001;
$fake = function () use (&$MB, &$validity) {
    return array(
        'validity' => function () use (&$validity) { return $validity; },
        'search' => function ($since) use (&$MB) { return array_keys(array_values($MB)) === array() ? array() : range(1, count($MB)); },
        'uid' => function ($n) use (&$MB) { $k = array_keys($MB); return $k[$n - 1]; },
        'header' => function ($n) use (&$MB) { $v = array_values($MB); return $v[$n - 1][0]; },
        'structure' => function ($n) use (&$MB) { $v = array_values($MB); return $v[$n - 1][1]; },
        'body' => function ($n, $sec) use (&$MB) { $v = array_values($MB); return $v[$n - 1][2][$sec] ?? ''; },
        'flags' => function ($uids) use (&$MB) { $o = array(); foreach ($uids as $u) $o[$u] = !empty($MB[$u][3]); return $o; },
    );
};
$announce = function ($item) use (&$posts) { $posts[] = $item; return '1791000000.00' . count($posts); };
$BOX = array('key' => 'info@365techies.co.uk', 'user' => 'info@365techies.co.uk', 'host' => 'h', 'folder' => 'INBOX', 'pass' => 'p');
$r1 = comms_mail_poll_box($BOX, $fake(), $now, $announce, $known);
$store = function () { return json_decode(file_get_contents(COMMS_FILE), true); };
$d = $store(); $em = array_values(array_filter($d['items'], function ($x) { return $x['type'] === 'email'; }));
check($r1['first'] && $r1['new'] === 2 && $r1['left_out'] === array('newsletters and lists' => 1) && count($posts) === 0, 'first look: two from people come in QUIETLY (no Slack), the newsletter is left out and counted', json_encode($r1));
$mary = $em[0]; $harb = $em[1];
check($mary['mail']['from'] === 'maryjones1948@gmail.com' && $mary['mail']['subject'] === "Laptop won't start" && $mary['body'] === "It beeps three times \xE2\x80\x93 can you help? \xC2\xA3 is no object.\n\nMary\n07700 900130" && $mary['number'] === '+447700900130',
    'what she wrote (Windows-1252 decoded), and the mobile in her signature becomes the number', json_encode($mary));
check($mary['handled'] === true && $mary['handled_by'] === 'replied from the mailbox', 'already replied to in Outlook (\\Answered): it arrives done');
check($harb['body'] === 'Is this invoice right?' && $harb['mail']['attach'] === array('invoice-4411.pdf') && $harb['mail']['known']['name'] === 'Harbour Dental' && $harb['handled'] === false,
    'a nested email: the text (history cut), the PDF listed, the logo not; a sender we hold is named', json_encode($harb));
check($d['checkpoints']['mail']['info@365techies.co.uk'] === array('validity' => 7001, 'uid' => 103) && $d['checkpoints']['mail_status']['info@365techies.co.uk']['new'] === 2, 'the checkpoint and the mailbox\'s status are kept');
$MB[104] = array(hdr(array('From: Joe <joe@example.com>', 'Subject: Quote for a new PC')), part(0, 'PLAIN', 0, array('charset' => 'us-ascii')), array('1' => 'How much for a gaming PC?'), false);
$MB[105] = array(hdr(array('From: Steve <steve@365techies.co.uk>', 'Subject: note to self')), part(0, 'PLAIN', 0), array('1' => 'x'), false);
$r2 = comms_mail_poll_box($BOX, $fake(), $now + 900, $announce, $known);
$d = $store(); $joe = null; foreach ($d['items'] as $x) if (($x['mail']['from'] ?? '') === 'joe@example.com') $joe = $x;
check(!$r2['first'] && $r2['new'] === 1 && $r2['examined'] === 2 && count($posts) === 1 && $posts[0]['mail']['subject'] === 'Quote for a new PC' && $r2['left_out'] === array('our own' => 1),
    'next look: only the new ones are read; Joe\'s goes to Slack, Steve\'s own is left out', json_encode($r2));
check($joe && $joe['slack_ts'] === '1791000000.001' && $joe['slack_rc'] === 0, 'the Slack line\'s time is kept, so notes and ticks link up');
$st = $d['checkpoints']['mail_status']['info@365techies.co.uk'];
check($st['new'] === 3 && $st['left_out'] === array('newsletters and lists' => 1, 'our own' => 1) && $st['replied'] === 1 && $st['day'] === '2026-10-02',
    'the mailbox\'s totals for the day add up across looks (3 in, 2 left out by reason, 1 already replied)', json_encode($st));
$st2 = comms_mail_status_add($st, strtotime('2026-10-03T08:00:00Z'), 1, array('automatic' => 1), 0, '');
check($st2['new'] === 1 && $st2['left_out'] === array('automatic' => 1) && $st2['day'] === '2026-10-03', 'a new day starts the totals again');
$MB[104][3] = true;
$r3 = comms_mail_poll_box($BOX, $fake(), $now + 1800, $announce, $known);
$d = $store(); foreach ($d['items'] as $x) if (($x['mail']['from'] ?? '') === 'joe@example.com') $joe = $x;
check($r3['new'] === 0 && $r3['replied'] === 1 && $joe['handled'] === true && count($posts) === 1, 'replied to from Outlook since: done here too (nothing new posted)', json_encode($r3));
$validity = 9000;
$r4 = comms_mail_poll_box($BOX, $fake(), $now + 2700, $announce, $known);
check($r4['first'] && count($posts) === 1, 'the server renumbered the mailbox: a quiet look again (dedupe by validity + uid, nothing posted twice)', json_encode($r4));
$d = $store();
check(count(array_filter($d['items'], function ($x) { return $x['type'] === 'email'; })) === 3 + 3, 'renumbered copies are kept apart (validity in the key), as the voicemail poller does');

echo "I  the board: emails in Messages\n";
$items = array(
    array('id' => 'e1', 'type' => 'email', 'number' => '', 'at' => '2026-10-02T09:00:00+00:00', 'body' => 'Hello', 'handled' => false,
          'mail' => array('box' => 'info@365techies.co.uk', 'from' => 'margaret@example.com', 'name' => 'Margaret', 'reply_to' => '', 'subject' => 'Printer', 'attach' => array('a.pdf'), 'known' => null)),
    array('id' => 'e2', 'type' => 'email', 'number' => '', 'at' => '2026-10-02T09:30:00+00:00', 'body' => 'And another thing', 'handled' => false,
          'mail' => array('box' => 'info@365techies.co.uk', 'from' => 'margaret@example.com', 'name' => '', 'reply_to' => 'm.home@example.com', 'subject' => 'Re: Printer', 'attach' => array(), 'known' => null)),
    array('id' => 'e3', 'type' => 'email', 'number' => '+447700900131', 'at' => '2026-10-01T09:00:00+00:00', 'body' => 'x', 'handled' => true, 'handled_by' => 'replied from the mailbox',
          'mail' => array('box' => 'help@365techies.co.uk', 'from' => 'zed@example.com', 'name' => 'Zed', 'reply_to' => '', 'subject' => 'Thanks', 'attach' => array(), 'known' => null)),
);
$b = comms_board($items, comms_names_with_jobs(array(), $known), 'k', strtotime('2026-10-02T12:00:00Z'));
check(count($b['mails']) === 3 && $b['mails'][0]['id'] === 'e2' && $b['open_mails'] === 2 && $b['total_mails'] === 3, 'newest first; two open', json_encode(array_column($b['mails'], 'id')));
check($b['open'] === 1, 'two emails from one person are one person to answer');
check($b['mails'][0]['who'] === 'margaret@example.com' && $b['mails'][0]['reply'] === 'm.home@example.com' && $b['mails'][1]['who'] === 'Margaret' && $b['mails'][1]['attach'] === array('a.pdf'), 'who (the From name, else the address); replies go to Reply-To; attachments listed');
check($b['mails'][0]['cust'] === 'Margaret Price' && $b['mails'][0]['cust_src'] === 'customer', 'a sender we hold says so (our customer record)');
check($b['mails'][2]['done'] === true && $b['mails'][2]['done_by'] === 'replied from the mailbox' && $b['mails'][2]['mobile'] === true && $b['mails'][2]['box'] === 'help@365techies.co.uk', 'done by a reply from the mailbox; the number in it; which mailbox');

echo "J  at source level\n";
$L = (string)file_get_contents(__DIR__ . '/comms-mail-lib.php');
check(strpos($L, '?' . '>') === false, 'no closing tag');
check(strpos($L, 'OP_READONLY') !== false && strpos($L, 'FT_PEEK') !== false, 'the mailbox is opened read-only and bodies are read without marking them read');
check(!preg_match('/imap_(setflag|clearflag|delete|undelete|expunge|mail_move|mail_copy|append|createmailbox|deletemailbox|renamemailbox)\b/', $L . file_get_contents(__DIR__ . '/comms-lib.php')),
    'nothing in the inbox code can change, move or delete an email (pure observer)');
$CL = (string)file_get_contents(__DIR__ . '/comms-lib.php');
check(strpos($CL, "\$out['mail'] = comms_mail_poll();") !== false && strpos($CL, "require_once __DIR__ . '/comms-mail-lib.php';") !== false, 'the sweep reads the mailboxes');
$A = (string)file_get_contents(__DIR__ . '/comms-api.php');
check(strpos($A, "'mails' => \$b['mails']") !== false && strpos($A, "'mailboxes' => \$boxes") !== false && strpos($A, 'comms_mail_known_map()') !== false, 'the portal gets the emails, each mailbox\'s last look, and names for known senders');
$HT = (string)file_get_contents(__DIR__ . '/../.htaccess');
foreach (array('mail-imap.php', 'comms-mail-lib.php', 'comms-mail-test.php') as $f) {
    $denied = false;
    if (preg_match_all('/<FilesMatch "([^"]+)">\s*Require all denied/', $HT, $fm)) foreach ($fm[1] as $re) if (@preg_match('#' . $re . '#', $f)) $denied = true;
    check($denied, 'denied over HTTP: ' . $f);
}

array_map('unlink', glob("$TMP/*")); @rmdir($TMP);
echo "\n" . ($fails ? "comms-mail-test: $fails FAILED\n" : "comms-mail-test: all passed\n");
exit($fails ? 1 : 0);
