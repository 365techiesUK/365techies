<?php
// pcm-dbsafe-lib.php: the customer file can no longer be emptied by a save. Run: php api/pcm-dbsafe-test.php
require_once __DIR__ . '/pcm-dbsafe-lib.php';
$pass = 0; $fail = 0;
function t($name, $ok, $detail = '') { global $pass, $fail; if ($ok) { $pass++; echo "  PASS  $name\n"; } else { $fail++; echo "  FAIL  $name   [$detail]\n"; } }
$dir = sys_get_temp_dir() . '/pcm-dbsafe-' . bin2hex(random_bytes(4)); @mkdir($dir);
$F = $dir . '/pcm-data.json';
$cut = substr(str_repeat('A', 59) . "\xC3\xA9", 0, 60);   // a PC name cut at 60 bytes through the middle of "é" (pcm.php checkin)
$full = array('customers' => array('K1' => array('name' => 'Jean', 'machines' => array('m1' => array('name' => $cut)))), 'staff' => array());

echo "-- the bug, as it was\n";
file_put_contents($F, json_encode(array('customers' => array('K0' => array('name' => 'old')))));
$tmp = $F . '.old.tmp';
if (@file_put_contents($tmp, json_encode($full, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), LOCK_EX) !== false) @rename($tmp, $F);
t('old pattern: one broken byte left a 0-byte customer file', filesize($F) === 0, filesize($F));

echo "-- the same save now\n";
file_put_contents($F, json_encode(array('customers' => array('K0' => array('name' => 'old')))));
$ok = pcm_db_put($F . '.1.tmp', $full, $F);
$d = json_decode(file_get_contents($F), true);
t('written', $ok === true);
t('every customer kept', is_array($d) && isset($d['customers']['K1']), substr(file_get_contents($F), 0, 120));
t('the broken byte became U+FFFD, the rest of the name kept', isset($d['customers']['K1']['machines']['m1']['name']) && $d['customers']['K1']['machines']['m1']['name'] === str_repeat('A', 59) . "\xEF\xBF\xBD");
t('no temp file left', !file_exists($F . '.1.tmp'));

echo "-- a value JSON cannot hold (INF) no longer sinks the whole file\n";
$x = $full; $x['customers']['K1']['score'] = INF;
t('written, the rest kept', pcm_db_put($F . '.2.tmp', $x, $F) === true && isset(json_decode(file_get_contents($F), true)['customers']['K1']));

echo "-- a save holding NO customers never replaces a file that has them\n";
$before = file_get_contents($F);
@unlink($dir . '/pcm-db-refused.log');
$GLOBALS['_log'] = $dir;
$r = pcm_db_put($F . '.3.tmp', array('customers' => array(), 'bkmeta' => array('1' => array())), $F);
t('refused', $r === false);
t('file left exactly as it was', file_get_contents($F) === $before);
t('no temp file left', !file_exists($F . '.3.tmp'));
$r = pcm_db_put($F . '.4.tmp', array('bkmeta' => array()), $F);   // the poller's "read nothing" save had no customers key at all
t('refused too when the customers key is missing', $r === false && file_get_contents($F) === $before);

echo "-- an empty customer list is fine where there were none\n";
file_put_contents($F, '');
t('over a 0-byte file: written', pcm_db_put($F . '.5.tmp', array('customers' => array(), 'staff' => array()), $F) === true);
@unlink($F);
t('no file yet: written', pcm_db_put($F . '.6.tmp', array('customers' => array()), $F) === true);
t('another store (not pcm-data.json) with no customers key: written', pcm_db_put($dir . '/other.json.tmp', array('x' => 1), $dir . '/other.json') === true);

echo "-- the refusal log\n";
$log = (string)@file_get_contents(__DIR__ . '/pcm-db-refused.log');
t('refusals are logged with the reason', strpos($log, 'a save with no customers over a file that has them') !== false);
// tidy: this test's own lines out of the real log, and the hourly Slack mark it may have set
$keep = array(); foreach (explode("\n", $log) as $ln) if ($ln !== '' && strpos($ln, 'REFUSED by cron') === false) $keep[] = $ln;
if ($keep) file_put_contents(__DIR__ . '/pcm-db-refused.log', implode("\n", $keep) . "\n"); else @unlink(__DIR__ . '/pcm-db-refused.log');
@unlink(__DIR__ . '/pcm-db-refused.ts');
foreach (glob($dir . '/*') ?: array() as $g) @unlink($g); @rmdir($dir);
echo "\nTOTAL: $pass passed, $fail failed\n";
exit($fail ? 1 : 0);
