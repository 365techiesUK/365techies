<?php
// Tests for pcm-gate.php (the minute-poll gate). Run: php api/pcm-gate.test.php   (never deployed: **/*.test.php)
$GLOBALS['PCM_GATE_DIR'] = sys_get_temp_dir() . '/pcmgate-test-' . getmypid();
require __DIR__ . '/pcm-gate.php';
$pass = 0; $fail = 0;
function t($name, $cond) { global $pass, $fail; if ($cond) { $pass++; } else { $fail++; echo "FAIL: $name\n"; } }
function rmrf($d) { if (!is_dir($d)) return; foreach (glob($d . '/{,.}[!.,!..]*', GLOB_BRACE) as $f) is_dir($f) ? rmrf($f) : unlink($f); rmdir($d); }
$D = $GLOBALS['PCM_GATE_DIR']; rmrf($D);
$now = 1790700000;

// --- what counts as waiting
$idle = array('customers' => array(
    'ABCD-EFGH-JKLM' => array('shield_code' => '', 'machines' => array('a1b2c3d4e5f6' => array('rmaint' => 1, 'cmdq' => array()))),
    'SB0123456789'   => array('machines' => array()),
    'MERGED'         => 'not an array'));
t('idle db: nothing waiting', !pcm_gate_waiting($idle, $now));
t('empty db: nothing waiting', !pcm_gate_waiting(array(), $now) && !pcm_gate_waiting(null, $now));
$code = $idle; $code['customers']['ABCD-EFGH-JKLM']['shield_code'] = '1234'; $code['customers']['ABCD-EFGH-JKLM']['shield_ts'] = $now - 60;
t('fresh call code waits', pcm_gate_waiting($code, $now));
$code['customers']['ABCD-EFGH-JKLM']['shield_ts'] = $now - 901;
t('call code older than 15 min does not', !pcm_gate_waiting($code, $now));
$chk = $idle; $chk['customers']['ABCD-EFGH-JKLM']['machines']['a1b2c3d4e5f6']['req_check'] = $now - 10;
t('fresh check request waits', pcm_gate_waiting($chk, $now));
$chk['customers']['ABCD-EFGH-JKLM']['machines']['a1b2c3d4e5f6']['req_check'] = $now - 1000;
t('stale check request does not', !pcm_gate_waiting($chk, $now));
$job = $idle; $job['customers']['ABCD-EFGH-JKLM']['machines']['a1b2c3d4e5f6']['cmdq'] = array(array('id' => 'ab12', 'act' => 'cleantemp', 'ts' => $now - 30));
t('queued job waits', pcm_gate_waiting($job, $now));
$job['customers']['ABCD-EFGH-JKLM']['machines']['a1b2c3d4e5f6']['cmdq'][0]['ts'] = $now - 1200;
t('expired job does not', !pcm_gate_waiting($job, $now));

// --- sync: never armed straight away; armed after 65 minutes; open follows the data
pcm_gate_sync($idle, $now);
t('folders made', is_dir("$D/sb") && file_exists("$D/created"));
t('not armed on the first request', !file_exists("$D/armed"));
t('closed when idle', !file_exists("$D/open"));
pcm_gate_sync($idle, $now + 3000);
t('still not armed at 50 min', !file_exists("$D/armed"));
pcm_gate_sync($idle, $now + 3900);
t('armed after 65 min', file_exists("$D/armed"));
$code['customers']['ABCD-EFGH-JKLM']['shield_ts'] = $now + 3950;
pcm_gate_sync($code, $now + 4000);
t('call code opens the gate', file_exists("$D/open"));
t('still armed while open', file_exists("$D/armed"));
pcm_gate_sync($code, $now + 4000 + 400);
t('stays open inside the 15 minutes', file_exists("$D/open"));
pcm_gate_sync($code, $now + 3950 + 901);
t('closes when the code expires', !file_exists("$D/open"));
pcm_gate_sync($job, $now);   // job ts = $now - 1200 relative to $now: expired
t('expired job leaves it closed', !file_exists("$D/open"));

// --- kill switch
touch("$D/disarm");
pcm_gate_sync($idle, $now + 5000);
t('disarm removes armed', !file_exists("$D/armed"));
pcm_gate_sync($idle, $now + 99999);
t('nothing re-arms while disarm exists', !file_exists("$D/armed"));
$code['customers']['ABCD-EFGH-JKLM']['shield_ts'] = $now + 99990;
pcm_gate_sync($code, $now + 99999);
t('gate still opens for work while disarmed', file_exists("$D/open"));
unlink("$D/disarm");
pcm_gate_sync($idle, $now + 100000);
t('re-arms once disarm is removed', file_exists("$D/armed") && !file_exists("$D/open"));

// --- SB address marks
$_SERVER['REMOTE_ADDR'] = '86.163.78.248';
pcm_gate_mark_sb($idle, 'ABCD-EFGH-JKLM', $now);
t('14-character key marks nothing', !file_exists("$D/sb/86.163.78.248"));
pcm_gate_mark_sb($idle, 'SB9999999999', $now);
t('unknown SB key marks nothing', !file_exists("$D/sb/86.163.78.248"));
pcm_gate_mark_sb($idle, 'SB0123456789', $now);
t('known SB key marks its address', file_exists("$D/sb/86.163.78.248"));
$_SERVER['REMOTE_ADDR'] = '2a00:23c7:1234::1';
pcm_gate_mark_sb($idle, 'SB0123456789', $now);
t('IPv6 address marked', file_exists("$D/sb/2a00:23c7:1234::1") || stripos(PHP_OS, 'WIN') === 0);   // ':' is not a Windows file name
$_SERVER['REMOTE_ADDR'] = '../../etc/x';
pcm_gate_mark_sb($idle, 'SB0123456789', $now);
t('odd address refused', count(glob("$D/sb/*")) <= 2 && !file_exists("$D/etc"));

rmrf($D);
echo "pcm-gate: $pass passed, $fail failed\n";
exit($fail ? 1 : 0);
