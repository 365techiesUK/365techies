<?php
/**
 * Message us (the app door) - test suite.   Run:  php api/pcm-msg-app-test.php
 * CLI-only. Points the message library at a throwaway directory BEFORE loading it, so no
 * real conversation is ever touched, and delivers to a fake Slack that just records the post.
 */
if (PHP_SAPI !== 'cli') { http_response_code(403); exit('cli only'); }
$TMP = sys_get_temp_dir() . '/pcm-msg-app-test-' . getmypid();
@mkdir($TMP);
define('MSG_DIR', $TMP);
require __DIR__ . '/pcm-msg-lib.php';

$fails = 0;
function ok($cond, $what, $detail = '') { global $fails; echo ($cond ? '  PASS  ' : '  FAIL  ') . $what . ($cond || $detail === '' ? '' : '   [' . $detail . ']') . "\n"; if (!$cond) $fails++; }

$db = array('customers' => array('KEY-1' => array('name' => 'Sofia Example', 'email' => 'Sofia@Example.com', 'tier' => 'free',
            'machines' => array('abc123' => array('name' => 'DELL3520'), 'def456' => array('name' => 'OFFICE-PC')))));

echo "-- the gate\n";
ok(msg_app_gate($db, '', 'abc123')['error'] === 'unknown_key', 'no key is refused');
ok(msg_app_gate($db, 'NOPE', 'abc123')['error'] === 'unknown_key', 'an unknown key is refused');
ok(msg_app_gate($db, 'KEY-1', 'zzz999')['error'] === 'unknown_machine', 'a machine this key never activated is refused');
$g = msg_app_gate($db, 'KEY-1', 'abc123');
ok(!empty($g['ok']) && $g['pcname'] === 'DELL3520' && $g['name'] === 'Sofia Example', 'a registered key + machine is allowed, free tier included', json_encode($g));

echo "-- one thread per machine\n";
ok(msg_app_id('KEY-1', 'abc123') !== msg_app_id('KEY-1', 'def456'), 'two PCs on one key get two threads');
ok(msg_app_id('KEY-1', 'abc123') !== msg_id('KEY-1', ''), 'neither is the portal account thread');

echo "-- sending with context\n";
$posted = array();
$deliver = function ($head, $thread) use (&$posted) { $posted[] = array($head, $thread); return array('ok' => true, 'ts' => '1757500000.000100'); };
$meta = array('key' => 'KEY-1', 'machine' => 'abc123', 'name' => $g['name'], 'email' => $g['email'], 'pcname' => $g['pcname']);
$ctx  = array('pc' => 'DELL3520', 'score' => 88, 'verdict' => 'Healthy', 'os' => 'Windows 11 Home', 'disk' => 41, 'av' => 'on',
              'backup' => true, 'reboot' => false, 'batt' => 78, 'ver' => 25, 'evil' => '<script>alert(1)</script>');
$id = msg_app_id('KEY-1', 'abc123');
$r  = msg_app_send($id, $meta, "The printer has stopped showing up since yesterday.", $ctx, $deliver);
ok(!empty($r['ok']) && count($r['msgs']) === 1 && $r['msgs'][0]['w'] === 'c' && $r['msgs'][0]['p'] === 0, 'stored, delivered, marked sent', json_encode($r));
ok(!isset($r['msgs'][0]['c']) && strpos(json_encode($r['msgs']), 'Context') === false, 'the context never reaches the customer');
$h = $posted[0][0];
ok(strpos($h, '*Sofia Example* messaged from 365 PC Manager on DELL3520') !== false && strpos($h, 'appears in their app') !== false, 'the Slack head names the app and the PC', $h);
ok(strpos($h, "_Context: DELL3520 · 88% Healthy · Windows 11 Home · disk 41% · AV on · backup on · battery 78% · app v25_") !== false, 'the context line is built from whitelisted fields only', $h);
ok(strpos($h, 'evil') === false && strpos($h, 'script') === false, 'unknown context keys are dropped');
ok($posted[0][1] === '', 'the first message opens a new thread');

echo "-- guards\n";
$r2 = msg_app_send($id, $meta, 'Still the same this morning.', array('pc' => 'DELL3520'), $deliver);
ok(!empty($r2['error']) && $r2['error'] === 'slow_down', 'a double tap inside two seconds is refused', json_encode($r2));
sleep(2);
$r2 = msg_app_send($id, $meta, 'Still the same this morning.', array('pc' => 'DELL3520'), $deliver);
ok(!empty($r2['ok']) && $posted[1][1] === '1757500000.000100' && strpos($posted[1][0], 'speech_balloon') === false && strpos($posted[1][0], '_Context: DELL3520_') !== false,
   'a later message goes into the existing thread with no new head, context still attached', json_encode($posted[1]));
list($box, $lk) = msg_open($id);
foreach ($box['msgs'] as &$mm) if ($mm['w'] === 'c') $mm['t'] = time() - 100; unset($mm);   // age the real sends past the 2-second guard
for ($i = 0; $i < MSG_PER_HOUR; $i++) $box['msgs'][] = array('t' => time() - 100, 'w' => 'c', 'x' => 'x', 'p' => 0);
msg_save($id, $box); msg_close($lk);
$r3 = msg_app_send($id, $meta, 'one more', null, $deliver);
ok(!empty($r3['error']) && $r3['error'] === 'too_many', 'the per-hour cap holds', json_encode($r3));

echo "-- replies and the balloon count\n";
list($box, $lk) = msg_open($id);
$box['msgs'][] = array('t' => time(), 'w' => 'e', 'x' => 'On it - could you restart the printer once?', 'p' => 0, 'ts' => '1757500100.000100');
$box['unread'] = 1; msg_save($id, $box); msg_close($lk);
ok(msg_app_unread('KEY-1', 'abc123') === 1, 'the check-in can read the unread count lock-free');
ok(msg_app_unread('KEY-1', 'def456') === 0, 'a machine with no thread reads zero');
$l = msg_app_list($id); $last = end($l['msgs']);
ok(!empty($l['ok']) && $last['w'] === 'e' && $last['x'] === 'On it - could you restart the printer once?', 'opening the pane returns the reply');
ok(msg_app_unread('KEY-1', 'abc123') === 0, 'and clears the unread count');

echo "-- the portal is unchanged, and no-Slack stays pending\n";
$pb = msg_blank(); $pb['name'] = 'Alan'; $pb['email'] = 'alan@example.com';
$hp = msg_head($pb, 'Hello', 'should be ignored for portal');
ok(strpos($hp, 'messaged from the portal') !== false && strpos($hp, 'their portal') !== false && strpos($hp, 'Context') === false, 'portal threads keep the portal wording and never show a context line');
$id2 = msg_app_id('KEY-1', 'def456');
$r4 = msg_app_send($id2, array('key' => 'KEY-1', 'machine' => 'def456', 'name' => 'Sofia Example', 'email' => '', 'pcname' => 'OFFICE-PC'), 'Hi from the office PC', null, null);
ok(!empty($r4['ok']) && $r4['msgs'][0]['p'] === 1, 'with no Slack the message is stored pending for the poller');
ok(msg_ctx_line(null) === '' && msg_ctx_line(array('evil' => 'x')) === '', 'an empty or junk context renders nothing');

// tidy up the throwaway directory
foreach ((array)@glob($TMP . '/*') as $p) @unlink($p);
@rmdir($TMP);

echo "\n" . ($fails ? $fails . ' FAILED' : 'all passed') . "\n";
exit($fails ? 1 : 0);
