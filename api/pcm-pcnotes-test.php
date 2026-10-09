<?php
/* Tests for pcm-pcnotes-lib.php (staff notes on a PC). CLI only:  php api/pcm-pcnotes-test.php
   Every test works on a temporary file - never the real store. */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require __DIR__ . '/pcm-pcnotes-lib.php';
$pass = 0; $fail = 0;
function t($name, $ok) { global $pass, $fail; if ($ok) $pass++; else { $fail++; echo "FAIL: $name\n"; } }
$F = sys_get_temp_dir() . '/pcn-test-' . getmypid() . '.json';
@unlink($F); @unlink($F . '.lock');
$cid = 'abcdef012345'; $pc = '0123456789ab';

t('key ok', pcn_key($cid, $pc) === $cid . '|' . $pc);
t('key refuses a bad customer id', pcn_key('ABC', $pc) === '');
t('key refuses a bad pc id', pcn_key($cid, '../x') === '');
t('key refuses an empty pc id', pcn_key($cid, '') === '');
t('text trims and keeps new lines', pcn_text("  hello\r\nthere \x07 ") === "hello\nthere");
t('text squeezes blank lines', pcn_text("a\n\n\n\nb") === "a\n\nb");
t('text caps the length', strlen(pcn_text(str_repeat('x', 5000))) === PCN_MAX_LEN);
t('empty store lists nothing', pcn_list($cid, $pc, $F) === array());
t('no file is written by a read', !file_exists($F));

$r = pcn_add($cid, $pc, '   ', 'Stephen', 1000, $F);
t('an empty note is refused', empty($r['ok']) && $r['error'] === 'empty');
t('nothing written for a refused note', !file_exists($F));
$r = pcn_add('nope', $pc, 'x', 'Stephen', 1000, $F);
t('a bad pc is refused', empty($r['ok']) && $r['error'] === 'bad_pc');

$r = pcn_add($cid, $pc, "Customer prefers a morning call.\nSSD fitted 2024.", 'Stephen', 1000, $F);
t('a note is added', !empty($r['ok']) && count($r['notes']) === 1);
t('it keeps who and when', $r['notes'][0]['by'] === 'Stephen' && $r['notes'][0]['ts'] === 1000);
t('it keeps the text with its new line', $r['notes'][0]['t'] === "Customer prefers a morning call.\nSSD fitted 2024.");
t('it has an 8-hex id', (bool)preg_match('/^[a-f0-9]{8}$/', $r['notes'][0]['id']));
t('the store file exists', file_exists($F));
$r2 = pcn_add($cid, $pc, 'Second note', '', 2000, $F);
t('a second note lists newest first', $r2['notes'][0]['t'] === 'Second note' && $r2['notes'][1]['ts'] === 1000);
t('an empty name is "staff"', $r2['notes'][0]['by'] === 'staff');
t('counts', pcn_counts($F) === array($cid . '|' . $pc => 2));
t('another PC is separate', pcn_list($cid, 'ffff', $F) === array());

$id = $r2['notes'][1]['id'];
$r3 = pcn_del($cid, $pc, $id, $F);
t('a note is deleted', !empty($r3['ok']) && count($r3['notes']) === 1 && $r3['notes'][0]['t'] === 'Second note');
$r4 = pcn_del($cid, $pc, $id, $F);
t('deleting it again is not an error', !empty($r4['ok']) && count($r4['notes']) === 1);
t('a bad id is refused', empty(pcn_del($cid, $pc, 'zz', $F)['ok']));
$r5 = pcn_del($cid, $pc, $r3['notes'][0]['id'], $F);
t('the last note goes', !empty($r5['ok']) && $r5['notes'] === array());
t('no count once empty', pcn_counts($F) === array());
t('the file is still valid JSON', is_array(json_decode(file_get_contents($F), true)));

for ($i = 0; $i < PCN_MAX_PER_PC + 5; $i++) pcn_add($cid, $pc, 'n' . $i, 'a', 3000 + $i, $F);
$l = pcn_list($cid, $pc, $F);
t('capped per PC', count($l) === PCN_MAX_PER_PC);
t('the oldest went first', $l[count($l) - 1]['t'] === 'n5' && $l[0]['t'] === 'n' . (PCN_MAX_PER_PC + 4));

// a store that is not JSON is read as empty, and the next write makes it whole again
file_put_contents($F, 'not json');
t('a broken store reads as empty', pcn_list($cid, $pc, $F) === array());
$r6 = pcn_add($cid, $pc, 'after', 'a', 9000, $F);
t('and is written whole again', !empty($r6['ok']) && is_array(json_decode(file_get_contents($F), true)));

@unlink($F); @unlink($F . '.lock');
echo "pcm-pcnotes-test: $pass passed, $fail failed\n";
exit($fail ? 1 : 0);
