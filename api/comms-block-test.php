<?php
/*
 * Blocked senders (3 Oct 2026, owner: "add the block this sender button"). Run:
 *   C:\tools\php\php.exe -d extension=mbstring api/comms-block-test.php
 * The inbox store is a temp file; the mailbox is a fake; Slack is never reached (no token exists locally).
 * The portal's Block / Unblock actions are covered end to end through the real comms-api.php by the scratch
 * comms-block-api test (php -S on a copy of api/).
 */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
error_reporting(E_ALL);
$TMP = sys_get_temp_dir() . '/comms-block-test-' . getmypid();
@mkdir($TMP);
define('COMMS_FILE', $TMP . '/comms-data.json');
define('COMMS_LOCK', $TMP . '/comms-data.json.lock');
require __DIR__ . '/comms-lib.php';

$fails = 0;
function check($ok, $what, $detail = '') { global $fails; echo ($ok ? "  PASS  " : "  FAIL  ") . $what . ($ok ? '' : "  [" . $detail . "]") . "\n"; if (!$ok) $fails++; }

echo "A  what can be blocked\n";
check(comms_block_key('Pitch@SEO.example') === 'pitch@seo.example' && comms_block_key('pitch@seo.example', 'domain') === '@seo.example', 'an address, or everyone at its domain (lower-cased)');
check(comms_block_key('not an address') === '' && comms_block_key('') === '', 'no address: nothing to block');
check(comms_block_domain_ok('ann@gmail.com') === '' && comms_block_domain_ok('bob@btinternet.com') === '' && comms_block_domain_ok('x@mail.ntlworld.com') === '', 'never a whole personal-mail domain (customers write from those), subdomains too');
check(comms_block_domain_ok('steve@365techies.co.uk') === '', 'never our own domain');
check(comms_block_domain_ok('sales@spamfirm.example') === 'spamfirm.example', 'a firm\'s own domain can be');
$bl = array('pitch@seo.example' => array(), '@spamfirm.example' => array());
check(comms_is_blocked('PITCH@seo.example', $bl) === 'pitch@seo.example', 'the blocked address, whatever its capitals');
check(comms_is_blocked('other@seo.example', $bl) === '', 'someone else at that domain is not blocked by an address block');
check(comms_is_blocked('jo@spamfirm.example', $bl) === '@spamfirm.example' && comms_is_blocked('jo@mail.spamfirm.example', $bl) === '@spamfirm.example', 'a domain block covers everyone there, subdomains too');
check(comms_is_blocked('jo@notspamfirm.example', $bl) === '', 'a look-alike domain is not caught');
check(comms_is_blocked('jo@x.example', array()) === '' && comms_is_blocked('', $bl) === '', 'nothing blocked / no address');

echo "B  emails from a blocked sender are left out as they arrive - never someone we hold\n";
file_put_contents(COMMS_FILE, json_encode(array('items' => array(), 'checkpoints' => array('blocked' => array(
    'pitch@seo.example' => array('by' => 'David', 'at' => '2026-10-03T19:00:00+00:00'), '@spamfirm.example' => array('by' => 'Steve', 'at' => '2026-10-03T19:01:00+00:00'))))));
check(array_keys(comms_blocked_list()) === array('pitch@seo.example', '@spamfirm.example'), 'the blocked list is read from the store');
$out = comms_blocked_out(comms_blocked_list());
check($out[0]['key'] === '@spamfirm.example' && $out[0]['by'] === 'Steve' && $out[1]['key'] === 'pitch@seo.example', 'the portal list: newest first, with who blocked it');
function hdr2($from, $subj) { return "From: $from\r\nSubject: $subj\r\nDate: Sat, 3 Oct 2026 18:00:00 +0100\r\n\r\n"; }
function plain() { $p = new stdClass; $p->type = 0; $p->subtype = 'PLAIN'; $p->encoding = 0; $p->bytes = 10; $p->ifdisposition = 0; $p->ifparameters = 0; $p->parameters = array(); $p->ifdparameters = 0; $p->dparameters = array(); return $p; }
$MB = array(
    201 => array(hdr2('SEO Sophie <pitch@seo.example>', 'What if SEO only cost you when it worked?'), plain(), array('1' => 'pitch')),
    202 => array(hdr2('Jo <jo@mail.spamfirm.example>', 'Proposal'), plain(), array('1' => 'pitch')),
    203 => array(hdr2('Kim <kim@spamfirm.example>', 'My laptop'), plain(), array('1' => 'a customer of ours at that firm')),
    204 => array(hdr2('Mary Jones <maryjones1948@gmail.com>', 'Laptop won\'t start'), plain(), array('1' => 'help')));
$fake = array(
    'validity' => function () { return 9001; },
    'search' => function ($since) use (&$MB) { return range(1, count($MB)); },
    'uid' => function ($n) use (&$MB) { $k = array_keys($MB); return $k[$n - 1]; },
    'header' => function ($n) use (&$MB) { $v = array_values($MB); return $v[$n - 1][0]; },
    'structure' => function ($n) use (&$MB) { $v = array_values($MB); return $v[$n - 1][1]; },
    'body' => function ($n, $sec) use (&$MB) { $v = array_values($MB); return $v[$n - 1][2][$sec] ?? ''; },
    'flags' => function ($uids) { $o = array(); foreach ($uids as $u) $o[$u] = false; return $o; });
$known = array('mail:kim@spamfirm.example' => array('name' => 'Kim Lee', 'src' => 'customer'));
$BOX = array('key' => 'help@365techies.co.uk', 'user' => 'help@365techies.co.uk', 'host' => 'h', 'folder' => 'INBOX', 'pass' => 'p');
$r = comms_mail_poll_box($BOX, $fake, strtotime('2026-10-03T19:30:00Z'), null, $known);
$d = json_decode(file_get_contents(COMMS_FILE), true);
$from = array_map(function ($x) { return $x['mail']['from']; }, array_values(array_filter($d['items'], function ($x) { return $x['type'] === 'email'; })));
check($r['left_out'] === array('blocked by you' => 2), 'the blocked address and the blocked firm are left out, counted as "blocked by you"', json_encode($r['left_out']));
check($from === array('kim@spamfirm.example', 'maryjones1948@gmail.com'), 'a customer at a blocked firm still comes in; so does everyone else', json_encode($from));
check(($d['checkpoints']['mail_status']['help@365techies.co.uk']['left_out']['blocked by you'] ?? 0) === 2, 'the mailbox line says how many were blocked today');

echo "C  a website enquiry from a blocked address arrives already done\n";
$L = array('kind' => 'web', 'label' => 'Website enquiry', 'name' => 'Beratcan', 'email' => 'beratcan@buymeacoffee.example', 'phone' => '', 'number' => '',
    'company' => '', 'topic' => 'Software update', 'body' => 'XLSX Preserve Guard...', 'page' => '/contact/', 'ts' => '1791100000.000100');
$m = array('type' => 'message', 'subtype' => 'bot_message', 'bot_id' => 'B1', 'ts' => '1791100000.000100', 'text' => 'New website enquiry');
$it = comms_lead_item($L, $m, 1791100500, 'beratcan@buymeacoffee.example');
check($it['handled'] === true && $it['handled_by'] === 'blocked' && $it['handled_at'] === gmdate('c', 1791100500), 'blocked: in the inbox as done, marked "blocked"', json_encode($it));
$it2 = comms_lead_item($L, $m, 1791100500);
check($it2['handled'] === false && $it2['handled_by'] === '', 'not blocked: open as before');
$lib = file_get_contents(__DIR__ . '/comms-lib.php');
check(strpos($lib, "if (\$bk !== '') { if (\$knownM === null) \$knownM = comms_mail_known_map(); if (isset(\$knownM['mail:' . \$pair[0]['email']])) \$bk = ''; }") !== false,
    'the import never blocks an enquiry from someone we hold (by email)');
check(strpos($lib, "(\$match['status'] ?? '') !== 'MATCH'") !== false, '...or a customer matched by their phone number');

echo "D  the portal actions are guarded the same way\n";
$api = file_get_contents(__DIR__ . '/comms-api.php');
check(strpos($api, "if (!vis_staff_ok(\$in, __DIR__))") < strpos($api, "\$do === 'block'"), 'staff only: the session check comes first');
check(strpos($api, "is someone we hold - not blocked") !== false && strpos($api, "can\\'t be blocked - customers use it") !== false, 'Block refuses someone we hold, and a personal-mail domain');
check(strpos($api, "(\$x['handled_by'] ?? '') !== 'blocked' || strtotime((string)(\$x['handled_at'] ?? '')) < \$cut") !== false, 'Undo reopens only what that block cleared, in the last 10 minutes');
check(!preg_match('/imap_(setflag|delete|mail_move|expunge)/', file_get_contents(__DIR__ . '/comms-mail-lib.php') . $api), 'blocking never touches the mailbox');

@unlink(COMMS_FILE); @unlink(COMMS_LOCK); @rmdir($TMP);
echo $fails ? "comms-block-test: $fails FAILED\n" : "comms-block-test: all passed\n";
exit($fails ? 1 : 0);
