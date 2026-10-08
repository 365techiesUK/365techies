<?php
/* Tests for pcm-pendsign-lib.php (sign-ins waiting for approval). Run: php api/pcm-pendsign-test.php
   Pure functions over an in-memory customer DB - never touches pcm-data.json. CLI only (and denied in .htaccess). */
if (php_sapi_name() !== 'cli') { http_response_code(404); exit; }
require __DIR__ . '/pcm-pendsign-lib.php';
$fails = 0;
function ok($cond, $what, $detail = '') { global $fails; echo ($cond ? '  PASS  ' : '  FAIL  ') . $what . ($cond || $detail === '' ? '' : '   [' . $detail . ']') . "\n"; if (!$cond) $fails++; }

// the plan record a staff member made, and the free record a booking sign-in made for the same email
function fixture() {
    return array('customers' => array(
        'ABCD-EFGH-JKLM' => array('name' => 'Alex Simons', 'email' => 'alex@example.com', 'tier' => 'pro', 'next' => 'Tue 14 Oct', 'next_ts' => 1760400000,
                                  'created' => '2026-09-01', 'via' => 'staffadd', 'machines' => array()),
        'SB0123456789'   => array('name' => 'Alex Simons', 'email' => 'alex@example.com', 'tier' => 'free', 'next' => '', 'created' => '2026-10-08 09:00',
                                  'via' => 'signin', 'sb_client_id' => 4242, 'sb_name' => 'Alex Simons',
                                  'machines' => array('m1' => array('name' => 'ALEX-LAPTOP', 'seen' => '2026-10-08 09:00'))),
        'QQQQ-RRRR-SSSS' => array('name' => 'Someone Else', 'email' => 'else@example.com', 'tier' => 'pro', 'via' => 'staffadd', 'machines' => array()),
    ));
}
$KEYS = array('ABCD-EFGH-JKLM', 'SB0123456789', 'QQQQ-RRRR-SSSS');
function no_keys($s) { global $KEYS; foreach ($KEYS as $k) if (strpos($s, $k) !== false) return false; return true; }

echo "-- ps_flag: marks the plan record, and says so once\n";
$db = fixture();
$f = ps_flag($db, array('ABCD-EFGH-JKLM'), 'SB0123456789', 4242, 'alex@example.com', 'Alex Simons', '2026-10-08 09:00');
$ps = $db['customers']['ABCD-EFGH-JKLM']['pending_signin'];
ok($ps === array('cid' => 4242, 'email' => 'alex@example.com', 'link' => 'SB0123456789', 'sbname' => 'Alex Simons', 'ts' => '2026-10-08 09:00'), 'the mark has the same shape the old console reads', json_encode($ps));
ok($f === array('Alex Simons'), 'first time: the plan record is news', json_encode($f));
$f2 = ps_flag($db, array('ABCD-EFGH-JKLM'), 'SB0123456789', 4242, 'alex@example.com', 'Alex Simons', '2026-10-08 09:05');
ok($f2 === array(), 'the same sign-in again: no second Slack card', json_encode($f2));
ok($db['customers']['ABCD-EFGH-JKLM']['pending_signin']['ts'] === '2026-10-08 09:05', 'the mark still moves to the latest time');
$f3 = ps_flag($db, array('ABCD-EFGH-JKLM'), 'SB9999999999', 5151, 'alex@example.com', 'A Simons', '2026-10-08 10:00');
ok($f3 === array('Alex Simons'), 'a DIFFERENT sign-in onto the same plan is news again');
$db = fixture();
ok(ps_flag($db, array('SB0123456789'), 'SB0123456789', 4242, 'a@b.c', '', 'x') === array() && !isset($db['customers']['SB0123456789']['pending_signin']), 'never marks the record the sign-in itself landed on');
ok(ps_flag($db, array('NOPE'), 'SB0123456789', 4242, 'a@b.c', '', 'x') === array() && !isset($db['customers']['NOPE']), 'a missing record is skipped, not created');
ok(ps_flag($db, array(), 'SB0123456789', 4242, 'a@b.c', '', 'x') === array(), 'nothing matched: nothing to say');

echo "-- ps_card: the Slack text\n";
$t = ps_card('Alex Simons', 'alex@example.com', array('Alex Simons'), 'app', 'ALEX-LAPTOP');
echo "\n" . $t . "\n\n";
ok(strpos($t, '*Alex Simons* (alex@example.com)') !== false, 'names who signed in, with their email');
ok(strpos($t, 'matches the plan record *Alex Simons*') !== false, 'names the plan record the email matched');
ok(strpos($t, 'separate FREE record') !== false && strpos($t, 'app shows Free') !== false, 'says their PC is on a separate free record');
ok(strpos($t, 'on ALEX-LAPTOP') !== false, 'names the PC');
ok(strpos($t, 'https://365techies.co.uk/portal/') !== false && strpos($t, 'Sign-ins waiting for approval') !== false, 'says where to approve');
ok(stripos($t, 'delete') !== false, 'warns against deleting the free record as a duplicate');
ok(no_keys($t) && stripos($t, 'password') === false && stripos($t, 'key') === false, 'no licence key, no password, not even the word key');
ok(strpos($t, "\n> ") !== false && substr_count($t, "\n") === 3, 'four lines: the headline and three quoted lines');
$w = ps_card('', 'bob@example.com', array('Bob Ltd', 'Bob Home'), 'web');
ok(strpos($w, '*bob@example.com* signed in to the customer portal') !== false, 'no booking name: the email stands in');
ok(strpos($w, '*Bob Ltd* and *Bob Home*') !== false, 'two plan records are both named');
ok(strpos($w, 'their sign-in is on a separate FREE record') !== false && strpos($w, 'app shows') === false, 'a portal sign-in is not called a PC');
ok(strpos(ps_card('Jo', 'jo@x.co', array('Jo'), 'join'), 'the customer portal (email code)') !== false, 'the email-code join says so');
ok(strpos(ps_card('Jo', 'jo@x.co', array('Jo'), 'app', ''), 'signed in to 365 PC Manager with') !== false, 'an app sign-in with no PC name still reads properly');
$evil = ps_card("<!channel> Bad\nGuy", 'x@y.z', array('<@U123> & co'), 'app', '<b>');
ok(strpos($evil, '<!channel>') === false && strpos($evil, '&lt;!channel&gt; Bad Guy') !== false, 'a booking name cannot ping the channel or break the line');
ok(strpos($evil, '&lt;@U123&gt; &amp; co') !== false && strpos($evil, '<b>') === false, 'plan and PC names are escaped too');
ok(strlen(ps_esc(str_repeat('a', 300))) === 80, 'names are capped');

echo "-- ps_list: the portal's Today card\n";
$db = fixture();
ps_flag($db, array('ABCD-EFGH-JKLM'), 'SB0123456789', 4242, 'alex@example.com', 'Alex Simons', '2026-10-08 09:00');
$L = ps_list($db['customers']);
ok(count($L) === 1, 'one sign-in waiting', json_encode($L));
$p = $L[0];
ok($p['id'] === ps_cid('ABCD-EFGH-JKLM') && $p['lid'] === ps_cid('SB0123456789'), 'records go by opaque ids (the same as staffcustomers)');
ok($p['id'] === substr(sha1('365cid|ABCD-EFGH-JKLM'), 0, 12), 'ps_cid is the staffcustomers formula');
ok($p['name'] === 'Alex Simons' && $p['email'] === 'alex@example.com' && $p['sbname'] === 'Alex Simons' && $p['pc'] === 'ALEX-LAPTOP' && $p['lpcs'] === 1 && $p['pcs'] === 0 && $p['gone'] === false, 'who, which plan, which PC', json_encode($p));
ok(no_keys(json_encode($L)), 'no licence key reaches the browser');
unset($db['customers']['SB0123456789']);   // Alex's case: the free record was deleted as a duplicate
$L = ps_list($db['customers']);
ok(count($L) === 1 && $L[0]['gone'] === true && $L[0]['lid'] === '', 'a deleted free record shows as gone (Dismiss only)');
$db = fixture(); $db['customers']['ABCD-EFGH-JKLM']['merged_into'] = 'SB0123456789'; $db['customers']['ABCD-EFGH-JKLM']['pending_signin'] = array('link' => 'SB0123456789');
ok(ps_list($db['customers']) === array(), 'a retired (merged) record is never listed');
ok(ps_list(array()) === array() && ps_list(null) === array(), 'empty or missing customers: empty list');

echo "-- ps_twins: look-alike records in the licence table\n";
$db = fixture();
$tw = ps_twins($db['customers']);
ok(isset($tw['SB0123456789']) && $tw['SB0123456789'] === array('Alex Simons'), 'the sign-in record that shares the plan\'s email is labelled', json_encode($tw));
ok(!isset($tw['ABCD-EFGH-JKLM']), 'the staff-made plan record is not (it is the original)');
ok(!isset($tw['QQQQ-RRRR-SSSS']), 'a record with its own email is not');
$db['customers']['SBJOIN000001'] = array('name' => 'Else', 'email' => 'ELSE@example.com ', 'via' => 'join');
ok(isset(ps_twins($db['customers'])['SBJOIN000001']), 'join-made records count too, email case and spaces ignored');
$db = fixture(); $db['customers']['ABCD-EFGH-JKLM']['merged_into'] = 'SB0123456789';
ok(ps_twins($db['customers']) === array(), 'once approved (old record merged) the label goes');

echo "-- ps_approve: exactly the old console's approve\n";
// pcm-admin.php do=approve, copied verbatim (lines ~289-299, 8 Oct 2026) - ps_approve must leave the same records
function admin_approve(&$db, $orig, $link) {
    if (isset($db['customers'][$orig]) && isset($db['customers'][$link]) && $orig!==$link) {
        $o = $db['customers'][$orig];
        $db['customers'][$link]['tier']='pro';
        if (!empty($o['name'])) $db['customers'][$link]['name']=$o['name'];
        if (empty($db['customers'][$link]['next']) && !empty($o['next'])) { $db['customers'][$link]['next']=$o['next']; if(!empty($o['next_ts'])) $db['customers'][$link]['next_ts']=$o['next_ts']; }
        $db['customers'][$orig]['tier']='free'; $db['customers'][$orig]['email']=''; $db['customers'][$orig]['merged_into']=$link;
        unset($db['customers'][$orig]['pending_signin']);
    }
}
$db = fixture(); $db['customers']['SB0123456789']['name'] = 'alex@example.com';
ps_flag($db, array('ABCD-EFGH-JKLM'), 'SB0123456789', 4242, 'alex@example.com', 'Alex Simons', '2026-10-08 09:00');
$ref = $db; admin_approve($ref, 'ABCD-EFGH-JKLM', 'SB0123456789');
$r = ps_approve($db, 'ABCD-EFGH-JKLM', ps_cid('SB0123456789'), 'steve@365techies.co.uk', '2026-10-08 11:00');
ok(!empty($r['ok']) && $r['name'] === 'Alex Simons' && $r['oldpcs'] === 0, 'approved', json_encode($r));
$audit = $db['customers']['SB0123456789']['signin_approved'];
unset($db['customers']['SB0123456789']['signin_approved']);
ok($db === $ref, 'every record ends exactly as the old console leaves it', json_encode($db));
ok($audit === array('from' => 'Alex Simons', 'by' => 'steve@365techies.co.uk', 'at' => '2026-10-08 11:00'), 'plus an audit note of who approved it');
ok($db['customers']['SB0123456789']['tier'] === 'pro' && $db['customers']['SB0123456789']['next'] === 'Tue 14 Oct' && $db['customers']['SB0123456789']['next_ts'] === 1760400000, 'the free record is now the plan, with its next visit');
ok($db['customers']['ABCD-EFGH-JKLM']['email'] === '' && $db['customers']['ABCD-EFGH-JKLM']['merged_into'] === 'SB0123456789' && !isset($db['customers']['ABCD-EFGH-JKLM']['pending_signin']), 'the old record is retired and stops matching sign-ins');
ok(ps_list($db['customers']) === array(), 'and it leaves the Today card');
$db2 = $db; $r2 = ps_approve($db2, 'ABCD-EFGH-JKLM', ps_cid('SB0123456789'), 's', 'x');
ok(empty($r2['ok']) && $r2['error'] === 'unknown_customer' && $db2 === $db, 'approving twice does nothing (the old record is retired)');

$db = fixture(); $db['customers']['SB0123456789']['next'] = 'Mon 20 Oct';
$db['customers']['ABCD-EFGH-JKLM']['machines'] = array('k1' => array('name' => 'OLD-DESKTOP'), 'k2' => array('name' => 'OLD-LAPTOP'));
ps_flag($db, array('ABCD-EFGH-JKLM'), 'SB0123456789', 4242, 'alex@example.com', 'Alex Simons', 't');
$r = ps_approve($db, 'ABCD-EFGH-JKLM', ps_cid('SB0123456789'), 's', 't');
ok($db['customers']['SB0123456789']['next'] === 'Mon 20 Oct', 'a next visit the free record already has is kept (as the console does)');
ok($r['oldpcs'] === 2, 'reports PCs still on the old plan key (they will show Free until re-activated)');

$db = fixture(); ps_flag($db, array('ABCD-EFGH-JKLM'), 'SB0123456789', 4242, 'alex@example.com', 'Alex Simons', 't'); $before = $db;
$r = ps_approve($db, 'ABCD-EFGH-JKLM', ps_cid('SB9999999999'), 's', 't');
ok(empty($r['ok']) && $r['error'] === 'stale' && $db === $before, 'a stale screen (different free record) approves nothing');
$r = ps_approve($db, 'ABCD-EFGH-JKLM', '', 's', 't');
ok(empty($r['ok']) && $r['error'] === 'stale' && $db === $before, 'no free-record id: approves nothing');
$r = ps_approve($db, 'QQQQ-RRRR-SSSS', ps_cid('SB0123456789'), 's', 't');
ok(empty($r['ok']) && $r['error'] === 'not_pending' && $db === $before, 'a record with no sign-in waiting cannot be approved onto anything');
unset($db['customers']['SB0123456789']); $before = $db;
$r = ps_approve($db, 'ABCD-EFGH-JKLM', ps_cid('SB0123456789'), 's', 't');
ok(empty($r['ok']) && $r['error'] === 'link_gone' && $db === $before, 'the free record was deleted: nothing to approve');
$db = fixture(); $db['customers']['ABCD-EFGH-JKLM']['pending_signin'] = array('link' => 'ABCD-EFGH-JKLM'); $before = $db;
$r = ps_approve($db, 'ABCD-EFGH-JKLM', ps_cid('ABCD-EFGH-JKLM'), 's', 't');
ok(empty($r['ok']) && $db === $before, 'a mark pointing at itself is refused');

echo "-- ps_dismiss and ps_find\n";
$db = fixture(); ps_flag($db, array('ABCD-EFGH-JKLM'), 'SB0123456789', 4242, 'alex@example.com', 'Alex S', 't');
$before = $db;
$r = ps_dismiss($db, 'ABCD-EFGH-JKLM');
unset($before['customers']['ABCD-EFGH-JKLM']['pending_signin']);
ok(!empty($r['ok']) && $r['name'] === 'Alex Simons' && $r['sbname'] === 'Alex S' && $db === $before, 'dismiss removes the mark and changes nothing else');
ok(ps_dismiss($db, 'ABCD-EFGH-JKLM')['error'] === 'not_pending', 'dismissing twice says so');
ok(ps_find($db['customers'], ps_cid('QQQQ-RRRR-SSSS')) === 'QQQQ-RRRR-SSSS' && ps_find($db['customers'], 'abc') === '', 'ps_find resolves an opaque id, and only a real one');
$db['customers']['QQQQ-RRRR-SSSS']['merged_into'] = 'X';
ok(ps_find($db['customers'], ps_cid('QQQQ-RRRR-SSSS')) === '', 'ps_find never returns a retired record');

echo "-- pcm-booking.php uses all this\n";
$src = (string)file_get_contents(__DIR__ . '/pcm-booking.php');
ok(substr_count($src, 'ps_flag($db, $pendingKeys') === 2, 'both the sign-in and the email-code join mark through ps_flag');
ok(!preg_match("/\\['pending_signin'\\]\\s*=\\s*array/", $src), 'no second hand-rolled pending_signin writer left in pcm-booking.php');
ok(substr_count($src, 'if ($psFresh) pcm_slack_say(ps_card(') === 2, 'both post the card, only when the mark is news');
ok((bool)preg_match("/if \\(\\\$action === 'staffpendsign'\\) \\{\\s*need_staff\\(\\);/", $src), 'the approve/dismiss action is behind need_staff()');
ok(strpos($src, "'pending' => \$psList") !== false, 'staffcustomers hands the list to the portal');

echo "\n" . ($fails ? $fails . " FAILED\n" : "all passed\n");
exit($fails ? 1 : 0);
