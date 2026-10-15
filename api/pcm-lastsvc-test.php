<?php
/** pcm_last_service - test suite.   Run:  php api/pcm-lastsvc-test.php */
if (PHP_SAPI !== 'cli') { http_response_code(403); exit('cli only'); }
require __DIR__ . '/pcm-lastsvc-lib.php';
$fails = 0;
function ok($cond, $what, $detail = '') { global $fails; echo ($cond ? '  PASS  ' : '  FAIL  ') . $what . ($cond || $detail === '' ? '' : '   [' . $detail . ']') . "\n"; if (!$cond) $fails++; }

ok(pcm_last_service(array()) === array(0, ''), 'no reports: nothing');
ok(pcm_last_service(null) === array(0, ''), 'no machine record: nothing');
ok(pcm_last_service(array('repk' => 'rubbish')) === array(0, ''), 'a broken repk: nothing');
$m = array('repk' => array('1757000000' => 'health', '1757100000' => 'service', '1757200000' => 'health'));
ok(pcm_last_service($m) === array(1757100000, 'service'), 'health checks are not services; the service is found', json_encode(pcm_last_service($m)));
$m = array('repk' => array('1757100000' => 'service', '1757300000' => 'selfrun'));
ok(pcm_last_service($m) === array(1757300000, 'selfrun'), 'a later self-run counts, and says so', json_encode(pcm_last_service($m)));
$m = array('repk' => array('1757300000' => 'selfrun', '1757400000' => 'service', '1757200000' => 'service'));
ok(pcm_last_service($m) === array(1757400000, 'service'), 'order in the array does not matter: the newest wins', json_encode(pcm_last_service($m)));
echo $fails ? "\n$fails FAILED\n" : "\nall passed\n";
exit($fails ? 1 : 0);
