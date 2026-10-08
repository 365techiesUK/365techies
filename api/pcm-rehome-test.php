<?php
// pcm-rehome-lib.php: every way a key can lead home, and every way it must NOT. Run: php api/pcm-rehome-test.php
require_once __DIR__ . '/pcm-rehome-lib.php';
$pass = 0; $fail = 0;
function t($name, $ok, $detail = '') { global $pass, $fail; if ($ok) { $pass++; echo "  PASS  $name\n"; } else { $fail++; echo "  FAIL  $name   [$detail]\n"; } }
$NOW = 1791450000;
function base() {
    return array('customers' => array(
        'PRO1' => array('name' => 'Alex Simons', 'email' => 'alex@example.com', 'tier' => 'pro', 'machines' => array('aaa111' => array('name' => 'OLD'))),
        'FREE1' => array('name' => 'Jean', 'email' => 'jean@example.com', 'tier' => 'free', 'sb_client_id' => 501, 'machines' => array()),
    ));
}

echo "-- a key that opens a record is left alone\n";
$db = base(); $before = json_encode($db);
$r = rehome_resolve($db, 'PRO1', 'bbb222', 'LAPTOP', $NOW);
t('same key, nothing to do', $r === array('PRO1', '', false), json_encode($r));
t('data untouched', json_encode($db) === $before);
t('no key at all', rehome_resolve($db, '', 'bbb222') === array('', '', false));

echo "-- merged (approve retired the old record)\n";
$db = base();
$db['customers']['OLDPRO'] = array('name' => 'Alex (old)', 'email' => '', 'tier' => 'free', 'merged_into' => 'SBNEW1', 'machines' => array('ccc333' => array()));
$db['customers']['SBNEW1'] = array('name' => 'Alex Simons', 'email' => 'alex@example.com', 'tier' => 'pro', 'sb_client_id' => 777, 'machines' => array());
$r = rehome_resolve($db, 'OLDPRO', 'ccc333', 'DESKTOP', $NOW);
t('leads to the record it was merged into', $r[0] === 'SBNEW1' && $r[1] === 'merged', json_encode($r));
t('the PC is put on that record', isset($db['customers']['SBNEW1']['machines']['ccc333']) && $db['customers']['SBNEW1']['machines']['ccc333']['rehomed'] === 'merged');
t('changed = true (machine added)', $r[2] === true);
$r2 = rehome_resolve($db, 'OLDPRO', 'ccc333', 'DESKTOP', $NOW);
t('second time: same answer, nothing more to change', $r2 === array('SBNEW1', 'merged', false), json_encode($r2));
$db['customers']['A'] = array('merged_into' => 'B'); $db['customers']['B'] = array('merged_into' => 'A');
$r = rehome_lookup($db, 'A');
t('a merge loop ends (no hang)', is_array($r) && $r[0] !== '');

echo "-- alias from a deleted record's tombstone (same SimplyBook client)\n";
$db = base();
$db['customers']['SBDUP1'] = array('name' => 'Jean', 'email' => 'jean@example.com', 'tier' => 'free', 'sb_client_id' => 501, 'machines' => array('ddd444' => array()));
rehome_tombstone($db, 'SBDUP1', $NOW); unset($db['customers']['SBDUP1']);
t('tombstone keeps ONLY ts + client id', $db['gone']['SBDUP1'] === array('ts' => $NOW, 'cid' => 501), json_encode($db['gone']));
$r = rehome_resolve($db, 'SBDUP1', 'ddd444', 'JEAN-PC', $NOW + 60);
t('leads to the same client\'s other record', $r[0] === 'FREE1' && $r[1] === 'alias' && $r[2] === true, json_encode($r));
t('alias remembered', isset($db['key_alias']['SBDUP1']) && $db['key_alias']['SBDUP1'] === 'FREE1');
t('PC put on FREE1', isset($db['customers']['FREE1']['machines']['ddd444']));
t('read-only lookup now finds it too', rehome_lookup($db, 'SBDUP1') === array('FREE1', 'alias'));
rehome_tombstone($db, 'FREE1', $NOW + 120); unset($db['customers']['FREE1']);
t('deleting the target drops aliases to it', !isset($db['key_alias']['SBDUP1']));

echo "-- restored: a sign-in record deleted while a plan record waited to be linked to it\n";
$db = base();
$db['customers']['PRO1']['pending_signin'] = array('cid' => 888, 'email' => 'alex@example.com', 'link' => 'SBALEX1', 'sbname' => 'Alex Simons', 'ts' => '2026-10-08 10:33');
$r = rehome_resolve($db, 'SBALEX1', 'eee555', 'ALEX-LAPTOP', $NOW);
t('restored under its own key', $r[0] === 'SBALEX1' && $r[1] === 'restored' && $r[2] === true, json_encode($r));
$c = $db['customers']['SBALEX1'];
t('restored as FREE - never the plan', $c['tier'] === 'free');
t('restored with the verified SimplyBook client', $c['sb_client_id'] === 888 && $c['sb_email'] === 'alex@example.com' && $c['sb_name'] === 'Alex Simons');
t('marked restored + via signin', !empty($c['restored']) && $c['via'] === 'signin');
t('the PC is on it', isset($c['machines']['eee555']));
t('the plan record still waits for approval', isset($db['customers']['PRO1']['pending_signin']) && $db['customers']['PRO1']['tier'] === 'pro');
t('the plan record did not get the PC', !isset($db['customers']['PRO1']['machines']['eee555']));
t('no rekey for a restore (the key itself works again)', $r[0] === 'SBALEX1');

echo "-- nothing is guessed\n";
$db = base(); $before = json_encode($db);
$r = rehome_resolve($db, 'SBGHOST1', 'fff666', 'X', $NOW);
t('an unknown key with no proof stays unknown', $r === array('', 'unknown', false), json_encode($r));
t('and nothing is written', json_encode($db) === $before);
$db = base(); $db['gone']['SBGONE2'] = array('ts' => $NOW, 'cid' => 999);
$r = rehome_resolve($db, 'SBGONE2', 'fff666', 'X', $NOW);
t('a tombstone with no surviving record of that client is NOT restored', $r === array('', 'unknown', false), json_encode($r));
$db = base(); $db['customers']['MAIL1'] = array('name' => 'Alex', 'email' => 'alex@example.com', 'tier' => 'free', 'machines' => array());
$r = rehome_resolve($db, 'SBMAIL9', 'aaa111', 'X', $NOW);
t('no email matching, no machine matching (aaa111 is on PRO1)', $r === array('', 'unknown', false), json_encode($r));

echo "-- limits\n";
$db = base(); $db['customers']['FULL'] = array('name' => 'Big Co', 'tier' => 'pro', 'sb_client_id' => 321, 'machines' => array());
for ($i = 0; $i < 25; $i++) $db['customers']['FULL']['machines']['m' . $i] = array();
$db['gone']['SBX'] = array('ts' => $NOW, 'cid' => 321);
$r = rehome_resolve($db, 'SBX', 'zzz999', 'X', $NOW);
t('25-PC cap respected (alias still made)', $r[0] === 'FULL' && count($db['customers']['FULL']['machines']) === 25);
$db = base(); $db['gone'] = array('OLD1' => array('ts' => $NOW - 40000000, 'cid' => 1));
$db['customers']['NOCID'] = array('name' => 'n', 'tier' => 'free');
rehome_tombstone($db, 'NOCID', $NOW);
t('old tombstones pruned; none written without a client id', !isset($db['gone']), json_encode(isset($db['gone']) ? $db['gone'] : null));

echo "-- the Slack line\n";
$db = base(); $db['customers']['PRO1']['pending_signin'] = array('cid' => 888, 'email' => 'alex@example.com', 'link' => 'SBALEX1', 'sbname' => 'Alex *Simons*');
$r = rehome_resolve($db, 'SBALEX1', 'eee555', 'ALEX-LAPTOP', $NOW);
$n = rehome_note($db, $r[0], $r[1], 'ALEX-LAPTOP');
t('restored note names the PC and says FREE + approve', strpos($n, 'ALEX-LAPTOP') !== false && strpos($n, 'FREE') !== false && strpos($n, 'approve') !== false, $n);
t('note carries no key and no Slack markup from the name', strpos($n, 'SBALEX1') === false && strpos($n, '*Simons*') === false, $n);
t('nothing said when nothing re-homed', rehome_note($db, 'PRO1', '', 'X') === '');

echo "\nTOTAL: $pass passed, $fail failed\n";
exit($fail ? 1 : 0);
