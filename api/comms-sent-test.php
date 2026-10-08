<?php
/*
 * Sent emails for the staff portal (comms-sent-lib.php + pcm-sentlog-lib.php, 7 Oct 2026). Run:
 *   C:\tools\php\php.exe -d extension=mbstring api/comms-sent-test.php
 * The Sent folders are a fake mailbox (COMMS_SENT_FAKE's JSON shape, the same calls the real one makes); the website's
 * sent-email log is a temp file. Nothing is sent and no mailbox is opened.
 */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
error_reporting(E_ALL);
$TMP = sys_get_temp_dir() . '/comms-sent-test-' . getmypid();
@mkdir($TMP);
define('COMMS_FILE', $TMP . '/comms-data.json');
define('COMMS_LOCK', $TMP . '/comms-data.json.lock');
define('SENTLOG_FILE', $TMP . '/pcm-sentlog.json');
require __DIR__ . '/comms-lib.php';
require __DIR__ . '/comms-sent-lib.php';

$fails = 0;
function check($ok, $what, $detail = '') { global $fails; echo ($ok ? "  PASS  " : "  FAIL  ") . $what . ($ok ? '' : "  [" . $detail . "]") . "\n"; if (!$ok) $fails++; }

echo "A  which folder is the Sent folder\n";
foreach (array(array('INBOX.Sent', '.'), array('Sent', '/'), array('Sent Items', '/'), array('INBOX.Sent Items', '.'), array('[Gmail]/Sent Mail', '/'), array('Sent Messages', '.'), array('INBOX.sent', '.')) as $f)
    check(comms_sent_is_folder($f[0], $f[1]), 'a Sent folder: ' . $f[0]);
foreach (array(array('INBOX', '.'), array('INBOX.Drafts', '.'), array('Sentiment', '.'), array('Resent', '/'), array('INBOX.Sent.Archive', '.'), array('INBOX.Unsent', '.')) as $f)
    check(!comms_sent_is_folder($f[0], $f[1]), 'not a Sent folder: ' . $f[0]);

echo "B  who it went to\n";
$a = comms_sent_addrs('"Smith, Jo" <Jo@Example.org>, =?UTF-8?B?Sm9zw6kgw4FsdmFyZXo=?= <jose@example.com>, bare@example.net, Jo <jo@example.org>');
check(count($a) === 3 && $a[0] === array('Smith, Jo', 'jo@example.org') && $a[1] === array("Jos\xC3\xA9 \xC3\x81lvarez", 'jose@example.com') && $a[2] === array('', 'bare@example.net'),
    'three people: a quoted name with a comma, an encoded name, a bare address; the same address once', json_encode($a));
check(comms_sent_addrs('') === array() && comms_sent_addrs('undisclosed-recipients:;') === array(), 'nobody named: an empty list');
$pp = comms_sent_people(array(array('', 'mary@example.com'), array('Bob', 'bob@x.com')), array('mail:mary@example.com' => array('name' => 'Mary Drake', 'src' => 'customer')));
check($pp[0]['cust'] === 'Mary Drake' && $pp[0]['cust_src'] === 'customer' && $pp[1]['cust'] === '', 'a customer we hold is named from our records', json_encode($pp));

echo "C  searching\n";
check(comms_sent_query('  "mary\\" smith  ') === 'mary  smith', 'quotes and backslashes cannot break out of the search', comms_sent_query('  "mary\\" smith  '));
check(comms_sent_criteria('mary') === 'OR OR TO "mary" CC "mary" OR SUBJECT "mary" BODY "mary"' && comms_sent_criteria('') === '', 'who it went to, the subject and the text');
check((function_exists('mb_strlen') ? mb_strlen(comms_sent_query(str_repeat('x', 200))) : strlen(comms_sent_query(str_repeat('x', 200)))) === 60, 'at most 60 characters');

echo "D  a mailbox's Sent folder\n";
$fake = array(
    'info@365techies.co.uk' => array('folders' => array(array('INBOX', '.'), array('INBOX.Sent', '.'), array('INBOX.Drafts', '.')), 'msgs' => array(
        'INBOX' => array(array('uid' => 9, 'date' => 'Tue, 6 Oct 2026 09:00:00 +0100', 'to' => 'info@365techies.co.uk', 'subject' => 'an incoming one', 'text' => 'not sent by us')),
        'INBOX.Sent' => array(
            array('uid' => 41, 'date' => 'Mon, 5 Oct 2026 10:00:00 +0100', 'to' => 'Mary Drake <mary@example.com>', 'subject' => 'Your laptop', 'text' => "Hi Mary,\nYour laptop is ready to collect.\nSteve\n\nOn Mon, 5 Oct 2026 at 09:00, Mary wrote:\n> is it ready?"),
            array('uid' => 42, 'date' => 'Tue, 6 Oct 2026 15:30:00 +0100', 'to' => '"Kite Ltd" <office@kite.example>, bob@kite.example', 'cc' => 'help@365techies.co.uk', 'subject' => '=?UTF-8?Q?Quote_=C2=A3240?=', 'text' => 'Here is the quote we talked about.', 'attach' => array('Quote 1043.pdf')),
            array('uid' => 43, 'date' => 'Wed, 7 Oct 2026 08:15:00 +0100', 'to' => 'jo@example.org', 'subject' => 'Printer', 'text' => 'Try turning it off and on.'),
        ))),
    'help@365techies.co.uk' => array('folders' => array(array('INBOX', '/'), array('Drafts', '/')), 'msgs' => array('INBOX' => array())),
    'two@365techies.co.uk' => array('folders' => array(array('INBOX.Sent', '.'), array('INBOX.Sent Items', '.')), 'msgs' => array(
        'INBOX.Sent' => array(array('uid' => 1, 'date' => 'Mon, 5 Oct 2026 12:00:00 +0100', 'to' => 'a@x.com', 'subject' => 'webmail one', 'text' => 'from webmail')),
        'INBOX.Sent Items' => array(array('uid' => 7, 'date' => 'Tue, 6 Oct 2026 12:00:00 +0100', 'to' => 'b@x.com', 'subject' => 'outlook one', 'text' => 'from Outlook')))),
    'bad@365techies.co.uk' => array('error' => 'could not open the mailbox (AUTHENTICATIONFAILED)'),
);
file_put_contents("$TMP/fake.json", json_encode($fake));
$box = array('user' => 'info@365techies.co.uk', 'host' => 'h', 'pass' => 'p', 'folder' => 'INBOX', 'key' => 'info@365techies.co.uk');
$known = array('mail:mary@example.com' => array('name' => 'Mary Drake', 'src' => 'customer'), 'mail:office@kite.example' => array('name' => 'Kite Ltd', 'src' => 'job'));
$io = comms_sent_fake_io($box, "$TMP/fake.json");
$r = comms_sent_box($box, $io, '', SENT_PAGE, $known);
$it = $r['items'];
check($r['status']['folders'] === array('INBOX.Sent') && $r['status']['total'] === 3 && $r['status']['shown'] === 3 && $r['status']['error'] === '', 'the Sent folder found and counted (never the inbox or drafts)', json_encode($r['status']));
check(count($it) === 3 && $it[0]['uid'] === 43 && $it[1]['uid'] === 42 && $it[2]['uid'] === 41, 'newest first', json_encode(array_column($it, 'uid')));
check($it[1]['subject'] === "Quote \xC2\xA3240" && count($it[1]['to']) === 2 && $it[1]['to'][0]['cust'] === 'Kite Ltd' && $it[1]['attach'] === array('Quote 1043.pdf'), 'an encoded subject, two people (one named from the job list), the attachment', json_encode($it[1]));
check($it[2]['snip'] === 'Hi Mary, Your laptop is ready to collect. Steve' && $it[2]['to'][0]['cust'] === 'Mary Drake', 'the first lines of what was written - the quoted email it answered cut off', $it[2]['snip']);
check($it[0]['at'] === '2026-10-07T07:15:00+00:00' && $it[0]['k'] === 'box' && $it[0]['box'] === 'info@365techies.co.uk' && $it[0]['folder'] === 'INBOX.Sent' && !isset($it[0]['msgno']), 'when (UTC), which mailbox and folder; no internal numbers', json_encode($it[0]));
$r2 = comms_sent_box($box, comms_sent_fake_io($box, "$TMP/fake.json"), 'mary', SENT_PAGE, $known);
check(count($r2['items']) === 1 && $r2['items'][0]['uid'] === 41, 'a search finds the email to Mary only', json_encode(array_column($r2['items'], 'uid')));
$r3 = comms_sent_box($box, comms_sent_fake_io($box, "$TMP/fake.json"), '', 2, $known);
check(count($r3['items']) === 2 && $r3['items'][1]['uid'] === 42 && $r3['status']['total'] === 3, 'a page of 2: the newest 2 of 3', json_encode(array_column($r3['items'], 'uid')));
$hb = array('user' => 'help@365techies.co.uk') + $box;
$rh = comms_sent_box($hb, comms_sent_fake_io($hb, "$TMP/fake.json"), '', SENT_PAGE, $known);
check($rh['items'] === array() && $rh['status']['error'] === 'no Sent folder on the server (it has: INBOX, Drafts)', 'no Sent folder: said plainly, with the folders it has', $rh['status']['error']);
$tb = array('user' => 'two@365techies.co.uk') + $box;
$rt = comms_sent_box($tb, comms_sent_fake_io($tb, "$TMP/fake.json"), '', SENT_PAGE, $known);
check(count($rt['items']) === 2 && $rt['items'][0]['subject'] === 'outlook one' && $rt['items'][1]['snip'] === 'from webmail' && count($rt['status']['folders']) === 2 && $rt['status']['total'] === 2,
    'two Sent folders (webmail\'s and Outlook\'s) read together, each with its first lines', json_encode($rt));
$err = '';
check(comms_sent_fake_io(array('user' => 'bad@365techies.co.uk') + $box, "$TMP/fake.json", $err) === null && strpos($err, 'AUTHENTICATIONFAILED') !== false, 'a mailbox that refuses: the server\'s reason', $err);
$rd = comms_sent_box($box, comms_sent_fake_io($box, "$TMP/fake.json"), '', SENT_PAGE, $known, microtime(true) - 1);
check(count($rd['items']) === 3 && $rd['items'][0]['snip'] === '', 'out of time: the list still comes, without the first lines', json_encode($rd['items'][0]));

echo "E  one sent email in full\n";
$m = comms_sent_read_box($box, comms_sent_fake_io($box, "$TMP/fake.json"), 'INBOX.Sent', 41, $known);
check($m['wrote'] === "Hi Mary,\nYour laptop is ready to collect.\nSteve" && strpos($m['full'], 'Mary wrote:') !== false && strpos($m['full'], '> is it ready?') !== false && $m['more'] === true,
    'what was written, and the whole email with the one it answered', json_encode($m));
check($m['to'][0]['addr'] === 'mary@example.com' && $m['to'][0]['cust'] === 'Mary Drake' && $m['subject'] === 'Your laptop' && $m['at'] === '2026-10-05T09:00:00+00:00', 'to, subject and when');
$m2 = comms_sent_read_box($box, comms_sent_fake_io($box, "$TMP/fake.json"), 'INBOX.Sent', 42, $known);
check(count($m2['cc']) === 1 && $m2['cc'][0]['addr'] === 'help@365techies.co.uk' && $m2['attach'] === array('Quote 1043.pdf') && $m2['more'] === false, 'copied to, the attachment; nothing more to show', json_encode($m2));
check(comms_sent_read_box($box, comms_sent_fake_io($box, "$TMP/fake.json"), 'INBOX', 9, $known) === array('error' => 'not a Sent folder'), 'only a Sent folder can be read here (never the inbox)');
check(comms_sent_read_box($box, comms_sent_fake_io($box, "$TMP/fake.json"), 'INBOX.Sent', 999, $known) === array('error' => 'that email is no longer in INBOX.Sent'), 'an email since deleted from Sent');

echo "F  the website's own sent emails (pcm-sentlog-lib.php)\n";
$red = sentlog_redact("Pay here: https://365techies.co.uk/pay/?t=9f8e7d6c5b4a&x=1. Your report: https://365techies.co.uk/api/pcm-sr.php/AbCdEf0123456789xyzQW/view\n"
    . "Sign in: https://365techies.co.uk/portal/#k=abc123. Book: https://365techies.co.uk/book-service/ and https://365techies.co.uk/leave-a-review/!");
check(strpos($red, '9f8e7d6c5b4a') === false && strpos($red, 'AbCdEf0123456789xyzQW') === false && strpos($red, 'abc123') === false, 'no working token survives', $red);
check(strpos($red, "https://365techies.co.uk/pay/?\xE2\x80\xA6.") !== false && strpos($red, "https://365techies.co.uk/api/pcm-sr.php/\xE2\x80\xA6/view") !== false && strpos($red, "https://365techies.co.uk/portal/?\xE2\x80\xA6.") !== false,
    'a link still says where it went (query and token shown as ...)', $red);
check(strpos($red, 'https://365techies.co.uk/book-service/ and') !== false && strpos($red, 'https://365techies.co.uk/leave-a-review/!') !== false, 'plain page links are left as they are', $red);
check(sentlog_add('Not an email', 's', 't') === false && !file_exists(SENTLOG_FILE), 'no address: nothing written');
$rk = sentlog_redact("Your key:  UNLK-ABCD-EFGH-JK7M\nlower case unlk-abcd-efgh-jk7m too");
check(strpos($rk, 'ABCD') === false && strpos($rk, 'abcd') === false && substr_count($rk, "UNLK-\xE2\x80\xA6-JK7M") === 1 && substr_count($rk, "UNLK-\xE2\x80\xA6-jk7m") === 1, 'an Unlock key emailed to a buyer: only its last four kept (8 Oct 2026)', $rk);
$t0 = 1791360000;   // 7 Oct 2026, 08:00 UTC
check(sentlog_add('Mary@Example.com ', 'Your booking is confirmed', "Hi Mary,\nSee you Tuesday. Manage it: https://365techies.co.uk/portal/?b=SECRET99", 'website', null, $t0), 'an email written down');
sentlog_add('jo@example.org', 'Your 365 Techies sign-in code', 'A sign-in code for the 365 portal and 365 PC Manager (the code itself is not kept here).', 'sign-in code', null, $t0 + 60);
sentlog_add('old@example.org', 'Long ago', 'x', 'website', null, $t0 - 91 * 86400);
$all = sentlog_all();
check(count($all) === 3 && $all[0]['to'] === 'mary@example.com' && strpos($all[0]['text'], 'SECRET99') === false && $all[0]['via'] === 'website' && strlen($all[0]['id']) === 12, 'kept in order, lower-cased, the link\'s token hidden', json_encode($all[0]));
sentlog_add('new@example.org', 'Now', 'y', 'payment link', null, $t0 + 120);
$all = sentlog_all();
check(count($all) === 3 && $all[0]['to'] === 'mary@example.com' && end($all)['to'] === 'new@example.org', 'over 90 days old: dropped at the next write', json_encode(array_column($all, 'to')));
$au = comms_sent_auto('', SENT_MORE, array('mail:mary@example.com' => array('name' => 'Mary Drake', 'src' => 'customer')));
check(count($au) === 3 && $au[0]['to'][0]['addr'] === 'new@example.org' && $au[2]['to'][0]['cust'] === 'Mary Drake' && $au[2]['k'] === 'auto' && $au[2]['box'] === 'info@365techies.co.uk' && $au[0]['via'] === 'payment link',
    'newest first, from info@, named from our records, what sent it', json_encode($au));
check(count(comms_sent_auto('SEE YOU')) === 1 && count(comms_sent_auto('sign-in')) === 1 && count(comms_sent_auto('nothing like this')) === 0, 'searched by who, subject and text (any case)');
$one = comms_sent_auto_read($au[2]['id']);
check($one['subject'] === 'Your booking is confirmed' && strpos($one['wrote'], 'See you Tuesday.') !== false && $one['k'] === 'auto', 'one in full', json_encode($one));
check(comms_sent_auto_read('nope') === array('error' => 'that email is no longer kept (90 days)') && comms_sent_auto_read('') === array('error' => 'that email is no longer kept (90 days)'), 'an unknown one');
file_put_contents(SENTLOG_FILE, '{broken');
check(sentlog_add('a@b.co', 's', 't') === false && file_get_contents(SENTLOG_FILE) === '{broken', 'an unreadable store is left alone, never overwritten');
@unlink(SENTLOG_FILE);
$d = array('v' => 1, 'sent' => array());
for ($i = 0; $i < SENTLOG_MAX; $i++) $d['sent'][] = array('id' => 'i' . $i, 'at' => $t0, 'to' => 'n' . $i . '@x.com', 'subject' => 's', 'text' => 't', 'via' => 'website');
file_put_contents(SENTLOG_FILE, json_encode($d));
sentlog_add('last@x.com', 's', 't', 'website', null, $t0 + 5);
$all = sentlog_all();
check(count($all) === SENTLOG_MAX && $all[0]['to'] === 'n1@x.com' && end($all)['to'] === 'last@x.com', 'at most ' . SENTLOG_MAX . ': the oldest goes', count($all));
check(strlen(sentlog_cut(str_repeat('a', SENTLOG_TEXT + 50), SENTLOG_TEXT)) === SENTLOG_TEXT, 'the text is capped');

echo "G  the senders write it down, after sending, and never let it stop an email\n";
$senders = array('pcm-review.php' => array('rv_send_raw', "'website'"), 'pcm-booking.php' => array('send_join_email', "'sign-in code'"), 'pcm-invite.php' => array('inv_mail', "'plan invite'"),
    'pcm-jobmail-lib.php' => array('jd_mail', "'job email'"), 'pcm-paylink.php' => array('pl_mail', "'payment link'"));
foreach ($senders as $f => $x) {
    $src = str_replace("\r\n", "\n", (string)file_get_contents(__DIR__ . '/' . $f));
    $a0 = strpos($src, "\nfunction " . $x[0] . '('); $b0 = strpos($src, "\nfunction ", $a0 + 10); $fn = substr($src, $a0, $b0 === false ? null : $b0 - $a0);
    $hooks = substr_count($fn, 'sentlog_add(');
    $guard = substr_count($fn, "try { if (is_readable(__DIR__ . '/pcm-sentlog-lib.php')) { require_once __DIR__ . '/pcm-sentlog-lib.php'; sentlog_add(");
    $after = strpos($fn, "if (\$ok) {   // 7 Oct 2026") !== false && strpos($fn, "if (\$sent) { try {") !== false && strpos($fn, '$sent = @mail(') !== false;
    check($hooks === 2 && $guard === 2 && substr_count($fn, '} catch (Throwable $e) { }') === 2 && $after && substr_count($fn, $x[1] . '); } }') === 2,
        $f . ' ' . $x[0] . '(): both ways out (SMTP, mail()) write it down, after success, inside try/catch, as ' . $x[1], "hooks $hooks guard $guard after " . (int)$after);
    if ($x[0] === 'send_join_email') check(strpos($fn, "sentlog_add(\$to, 'Your 365 Techies sign-in code', 'A sign-in code for the 365 portal and 365 PC Manager (the code itself is not kept here).'") !== false
        && !preg_match('/sentlog_add\([^;]*\$(code|body|subject)/', $fn), 'the sign-in code itself is never written down (not in the subject, not in the text)');
}

echo "H  read-only, staff-only, never served\n";
$L = (string)file_get_contents(__DIR__ . '/comms-sent-lib.php');
preg_match_all('/imap_fetchbody\([^;]*;/', $L, $fb);
check(!preg_match('/imap_(setflag_full|clearflag_full|delete|undelete|expunge|mail_move|mail_copy|append|createmailbox|deletemailbox|renamemailbox|subscribe)/', $L) && count($fb[0]) === 1 && strpos($fb[0][0], 'FT_PEEK') !== false
    && strpos($L, 'OP_READONLY | OP_HALFOPEN') !== false && strpos($L, "imap_reopen(\$im, \$srv . \$enc, OP_READONLY)") !== false && strpos($L, 'imap_body(') === false,
    'opened read-only, bodies peeked, nothing in a mailbox is ever changed');
$A = (string)file_get_contents(__DIR__ . '/comms-api.php');
$pAuth = strpos($A, 'if (!vis_staff_ok($in, __DIR__))'); $pSent = strpos($A, "if (\$do === 'sent' || \$do === 'sentmsg')");
check($pAuth !== false && $pSent !== false && $pAuth < $pSent, 'Sent emails answers only a staff session');
$HT = (string)file_get_contents(__DIR__ . '/../.htaccess');
foreach (array('comms-sent-lib.php', 'comms-sent-test.php', 'pcm-sentlog-lib.php', 'pcm-sentlog.json', 'pcm-sentlog.json.lock', 'pcm-sentlog.json.4242.tmp') as $f) {
    $denied = false;
    if (preg_match_all('/<FilesMatch "([^"]+)">\s*Require all denied/', $HT, $fm)) foreach ($fm[1] as $re) if (@preg_match('#' . $re . '#', $f)) $denied = true;
    check($denied, 'denied over HTTP: ' . $f);
}
foreach (array('comms-api.php') as $f) {
    $denied = false;
    if (preg_match_all('/<FilesMatch "([^"]+)">\s*Require all denied/', $HT, $fm)) foreach ($fm[1] as $re) if (@preg_match('#' . $re . '#', $f)) $denied = true;
    check(!$denied, 'still served: ' . $f);
}
$GI = (string)file_get_contents(__DIR__ . '/../.gitignore');
check(strpos($GI, "api/pcm-sentlog.json\n") !== false || strpos($GI, "api/pcm-sentlog.json\r\n") !== false, 'the log is never committed');

array_map('unlink', glob("$TMP/*")); @rmdir($TMP);
echo "\n" . ($fails ? "comms-sent-test: $fails FAILED\n" : "comms-sent-test: all passed\n");
exit($fails ? 1 : 0);
