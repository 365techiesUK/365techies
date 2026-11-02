<?php
/*
 * Notes on the staff inbox: change and delete (2 Nov 2026, David through the owner: "if he puts a note in, he wants to
 * be able to delete it ... change them or edit them"). Run:
 *   C:\tools\php\php.exe -d extension=mbstring api/comms-notes-test.php
 * The inbox store is a temp file; Slack is a stub defined here (so pcm-slack-lib.php is never loaded and nothing is
 * ever posted). Covers comms_edit_note, the keys, comms_notes_out, and the Slack sync never bringing a deleted note back.
 */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
error_reporting(E_ALL);
$TMP = sys_get_temp_dir() . '/comms-notes-test-' . getmypid();
@mkdir($TMP);
define('COMMS_FILE', $TMP . '/comms-data.json');
define('COMMS_LOCK', $TMP . '/comms-data.json.lock');
register_shutdown_function(function () use ($TMP) { @unlink(COMMS_FILE); @unlink(COMMS_LOCK); @rmdir($TMP); });

// ---- the Slack stub: records every call; the thread is whatever $THREAD holds
$CALLS = array(); $RC = 0; $THREAD = array();
function slk_call($method, $args, $timeout = 6) { global $CALLS; $CALLS[] = array($method, $args); return array('ok' => true, 'ts' => '2000.000' . count($CALLS)); }
function slk_call_form($method, $args, $timeout = 6) {
    global $CALLS, $RC, $THREAD; $CALLS[] = array($method, $args);
    if ($method === 'conversations.history') return array('ok' => true, 'messages' => array(array('ts' => '1000.0001', 'text' => 'Voicemail from +447700900001', 'reply_count' => $RC)));
    if ($method === 'conversations.replies') return array('ok' => true, 'messages' => array_merge(array(array('ts' => '1000.0001', 'text' => 'Voicemail from +447700900001')), $THREAD));
    if ($method === 'users.info') return array('ok' => true, 'user' => array('profile' => array('display_name' => 'Steve')));
    return array('ok' => false, 'error' => 'not stubbed');
}
require __DIR__ . '/comms-lib.php';

$fails = 0;
function check($ok, $what, $detail = '') { global $fails; echo ($ok ? "  PASS  " : "  FAIL  ") . $what . ($ok ? '' : "  [" . $detail . "]") . "\n"; if (!$ok) $fails++; }
function store($items) { file_put_contents(COMMS_FILE, json_encode(array('items' => $items, 'checkpoints' => array()))); }
function item($id) { $d = json_decode(file_get_contents(COMMS_FILE), true); foreach ($d['items'] as $x) if ($x['id'] === $id) return $x; return null; }
function calls($m) { global $CALLS; return array_values(array_filter($CALLS, function ($c) use ($m) { return $c[0] === $m; })); }

$now = strtotime('2026-11-02 12:00:00 UTC');
$vm = array('id' => 'vm-1', 'type' => 'voicemail', 'number' => '+447700900001', 'at' => '2026-11-02T09:10:00+00:00', 'stored_at' => '2026-11-02T09:10:00+00:00',
    'slack_ts' => '1000.0001', 'slack_rc' => 3, 'notes' => array(
        array('by' => 'David', 'src' => 'portal', 'at' => '2026-11-02T11:45:00+00:00', 'text' => 'Mr Freeman', 'ts' => '1000.0002', 'nid' => 'nAAA'),
        array('by' => 'David', 'src' => 'portal', 'at' => '2026-11-02T11:54:00+00:00', 'text' => 'David Freeman.Email issues', 'ts' => '1000.0003'),
        array('by' => 'Steve', 'src' => 'slack', 'at' => '2026-11-02T11:56:00+00:00', 'text' => 'typed in Slack', 'ts' => '1000.0004'),
        array('by' => 'David', 'src' => 'portal', 'at' => '2026-11-02T11:58:00+00:00', 'text' => 'Slack never took this one', 'ts' => ''),
    ));
// a voicemail whose only Slack post IS the note (the item had no post of its own)
$vm2 = array('id' => 'vm-2', 'type' => 'voicemail', 'number' => '+447700900002', 'at' => '2026-11-02T09:00:00+00:00', 'stored_at' => '2026-11-02T09:00:00+00:00',
    'slack_ts' => '1500.0001', 'slack_rc' => 0, 'notes' => array(array('by' => 'Steve', 'src' => 'portal', 'at' => '2026-11-02T10:00:00+00:00', 'text' => 'started the post', 'ts' => '1500.0001', 'nid' => 'nBBB')));

echo "A  every note has a key that names it\n";
check(comms_note_key(array('nid' => 'nAAA', 'ts' => '1.2')) === 'nAAA', 'its own id first');
check(comms_note_key(array('ts' => '1000.0003')) === 's1000.0003', 'else its Slack message');
$k4 = comms_note_key(array('at' => '2026-11-02T11:58:00+00:00', 'text' => 'Slack never took this one', 'ts' => ''));
check(preg_match('/^a[0-9a-f]{12}$/', $k4) === 1, 'else when + a hash of the words (an old note Slack never took)', $k4);
check(preg_match('/^n[0-9a-f]{12}$/', comms_note_nid()) === 1, 'new notes get their own id');
$out = comms_notes_out($vm['notes'], 'vm-1');
check(count($out) === 4 && $out[0]['id'] === 'vm-1' && $out[0]['k'] === 'nAAA' && $out[1]['k'] === 's1000.0003' && !$out[0]['edited'], 'the card gets each note\'s item and key', json_encode($out[0]));
check(comms_notes_out(array(array('text' => str_repeat('x', 900), '_iid' => 'sms-9')), 'other')[0]['id'] === 'sms-9', 'a text thread\'s note keeps ITS item (notes from several texts are merged)');
check(mb_strlen(comms_notes_out(array(array('text' => str_repeat('x', 900))))[0]['text']) === 900, 'the whole note goes out, so Edit starts from all of it');

echo "B  change a note typed in the portal - its Slack reply follows\n";
store(array($vm, $vm2)); $CALLS = array();
$r = comms_edit_note('vm-1', 's1000.0003', 'David Freeman - email issues, ring after 2', 'David', $now);
$n = item('vm-1')['notes'][1];
check(!empty($r['ok']) && $n['text'] === 'David Freeman - email issues, ring after 2' && $n['edited_by'] === 'David' && !empty($n['edited']), 'the words change, marked changed and by whom', json_encode($r));
check(comms_note_key($n) === 's1000.0003', 'its key did not move');
$u = calls('chat.update');
check(count($u) === 1 && $u[0][1]['ts'] === '1000.0003' && strpos($u[0][1]['text'], 'ring after 2') !== false && strpos($u[0][1]['text'], 'changed by David') !== false, 'the Slack reply is updated in place', json_encode($u));
check(strpos($r['say'], 'Slack thread too') !== false && $r['warn'] === '', 'the portal says so', $r['say']);
$r = comms_edit_note('vm-1', 's1000.0003', "   \n ", 'David', $now);
check(empty($r['ok']) && strpos($r['error'], 'Type the note') === 0, 'an empty change is refused (Delete is the way to remove one)');
$k4b = comms_note_key(item('vm-1')['notes'][3]);
$r = comms_edit_note('vm-1', $k4b, 'now with more words', 'Steve', $now);
check(!empty($r['ok']) && comms_note_key(item('vm-1')['notes'][3]) === $k4b, 'an old note keyed by its words keeps that key after the words change');

echo "C  delete a note typed in the portal - its Slack reply goes too\n";
$CALLS = array();
$r = comms_edit_note('vm-1', 'nAAA', null, 'David', $now);
$it = item('vm-1');
check(!empty($r['ok']) && $r['deleted'] && count($it['notes']) === 3 && $it['notes'][0]['text'] !== 'Mr Freeman', 'it is gone from the item', json_encode($it['notes']));
check(in_array('1000.0002', $it['notes_gone'], true), 'and remembered as removed');
$dl = calls('chat.delete');
check(count($dl) === 1 && $dl[0][1]['ts'] === '1000.0002', 'the app deletes its own Slack reply', json_encode($dl));
check(strpos($r['say'], 'from the Slack thread') !== false, 'the portal says so', $r['say']);
$r = comms_edit_note('vm-1', 'nAAA', null, 'David', $now);
check(empty($r['ok']) && strpos($r['error'], 'That note has gone') === 0, 'deleting it twice: "that note has gone"');
check(empty(comms_edit_note('vm-x', 'nAAA', null, 'David', $now)['ok']), 'an unknown message is refused');

echo "D  a note that STARTED the Slack post is never deleted from Slack\n";
$CALLS = array();
$r = comms_edit_note('vm-2', 'nBBB', null, 'Steve', $now);
check(!empty($r['ok']) && count(item('vm-2')['notes']) === 0 && !calls('chat.delete') && !calls('chat.update'), 'gone here; the Slack post (and its thread) left alone', json_encode($CALLS));

echo "E  a note typed in Slack changes here only\n";
$CALLS = array();
$r = comms_edit_note('vm-1', 's1000.0004', null, 'David', $now);
$it = item('vm-1');
check(!empty($r['ok']) && !calls('chat.delete') && in_array('1000.0004', $it['notes_gone'], true), 'deleted here, nothing sent to Slack, remembered as removed', json_encode($CALLS));
check(strpos($r['say'], 'stays in Slack') !== false, 'the portal says it stays in Slack', $r['say']);

echo "F  the Slack sync never brings a deleted note back\n";
// the thread now: the two deleted replies are still there in Slack (a person's own; or our delete failed), plus one new reply
$THREAD = array(
    array('ts' => '1000.0002', 'user' => COMMS_BOT_USER, 'text' => 'portal note (ours)'),
    array('ts' => '1000.0004', 'user' => 'UBQSJND44', 'text' => 'typed in Slack'),
    array('ts' => '1000.0009', 'user' => 'UBQSJND44', 'text' => 'brand new reply'),
);
$RC = 2;   // fewer than the item remembers (3): our delete took a reply out of the thread, then one new one came
$before = count(item('vm-1')['notes']);
$s = comms_slack_sync(12, $now);
$it = item('vm-1'); $texts = array_map(function ($x) { return $x['text']; }, $it['notes']);
check(in_array('brand new reply', $texts, true), 'a new reply is picked up even though the count went DOWN', json_encode($s));
check(!in_array('typed in Slack', $texts, true), 'the note deleted in the portal does not come back', json_encode($texts));
check(count($it['notes']) === $before + 1 && (int)$it['slack_rc'] === 2, 'exactly one note added; the count remembered', count($it['notes']) . ' / ' . $it['slack_rc']);
$new = end($it['notes']);
check(!empty($new['nid']) && $new['src'] === 'slack', 'the new Slack note has its own id', json_encode($new));
$s = comms_slack_sync(12, $now);
check(count(item('vm-1')['notes']) === $before + 1, 'a second sync adds nothing');

echo "G  the API and the portal\n";
$api = (string)file_get_contents(__DIR__ . '/comms-api.php');
check(strpos($api, "\$do === 'noteedit' || \$do === 'notedel'") !== false && strpos($api, 'comms_edit_note($id, $k, $do === \'notedel\' ? null') !== false, 'comms-api.php: do=noteedit / do=notedel -> comms_edit_note (delete = null text)');
$portal = (string)@file_get_contents(dirname(__DIR__) . '/portal/index.html');
check(strpos($portal, 'data-cmne=') !== false && strpos($portal, 'data-cmnd=') !== false && strpos($portal, 'data-cmnes=') !== false && strpos($portal, 'data-cmnds=') !== false, 'the built portal has Edit, Delete, Save and Yes-delete');
check(strpos($portal, "loadComms('noteedit'") !== false && strpos($portal, "loadComms('notedel'") !== false && strpos($portal, 'Yes, delete') !== false, 'and sends them, Delete only after "Yes, delete"');
check(strpos($portal, "document.activeElement.id === 'cmnedtxt'") !== false, 'a background refresh never wipes a change being typed');

echo $fails ? "\n$fails FAILED\n" : "\nALL TESTS PASSED\n";
exit($fails ? 1 : 0);
