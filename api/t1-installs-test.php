<?php
/*
 * t1-installs-lib.php + t1-checkin.php tests. CLI only:  C:\tools\php\php.exe api/t1-installs-test.php
 * Country lookups use the REAL tables (api/geoip/*.bin); both stores (Techies One's, and PC Manager's for "our own PCs")
 * are temp files. The last part runs t1-checkin.php through PHP's built-in server with a test version.json.
 */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
error_reporting(E_ALL);
$fails = 0;
function check($ok, $what, $detail = '') { global $fails; echo ($ok ? "  PASS  " : "  FAIL  ") . $what . ($ok ? '' : "  [" . $detail . "]") . "\n"; if (!$ok) $fails++; }
$tmp = sys_get_temp_dir() . '/t1i-test-' . getmypid();
@mkdir($tmp);
$GLOBALS['T1_INSTALLS_FILE'] = $tmp . '/t1-installs.json';
$GLOBALS['PCM_INSTALLS_FILE'] = $tmp . '/pcm-installs.json';
require __DIR__ . '/t1-installs-lib.php';
$F = $GLOBALS['T1_INSTALLS_FILE'];

echo "A  noting installs\n";
$T = gmmktime(10, 0, 0, 10, 10, 2026); $DAY = '2026-10-10';
$ID = str_repeat('ab12', 8);
check(t1i_note($ID, '0.13.0', '10.0.22631', array('bt', 'gmail'), '86.163.78.248', $T) === 'new', 'a new install');
check(t1i_note($ID, '0.13.0', '10.0.22631', array('gmail', 'bt'), '86.163.78.248', $T + 3600) === 'same', 'its next check-in the same day: nothing written (providers in any order)');
check(t1i_note($ID, '0.13.1', '10.0.22631', array('bt', 'gmail'), '86.163.78.248', $T + 7200) === 'updated', 'updated to a new version the same day: noted');
$d = json_decode(file_get_contents($F), true);
$e = $d['m'][substr(sha1('t1inst|' . $ID), 0, 16)];
check($e['f'] === $DAY && $e['l'] === $DAY && $e['v'] === '0.13.1' && $e['w'] === '11' && $e['p'] === 'bt,gmail' && $e['c'] === 'GB' && $e['n'] === 1 && $e['o'] === 0,
    'what is kept: days, version, Windows 11, provider kinds, country', json_encode($e));
$raw = file_get_contents($F);
check(strpos($raw, $ID) === false && strpos($raw, '86.163') === false, 'never the raw install number, never the address');
check(t1i_note($ID, '0.13.1', '10.0.19045', array('bt', 'gmail', 'me@example.com', 'hotmail'), '86.163.78.248', $T + 86400) === 'updated', 'the next day, on Windows 10');
$d = json_decode(file_get_contents($F), true); $e = $d['m'][substr(sha1('t1inst|' . $ID), 0, 16)];
check($e['n'] === 2 && $e['l'] === '2026-10-11' && $e['w'] === '10' && $e['p'] === 'bt,gmail', 'days used counted; unknown "providers" (an address!) are never stored', json_encode($e));
foreach (array(array('xyz', '0.13.0'), array('', '0.13.0'), array($ID, 'abc'), array($ID, ''), array($ID, '1.2'), array(str_repeat('a', 70), '0.1.0')) as $bad)
    check(t1i_note($bad[0], $bad[1], '', array(), '8.8.8.8', $T) === '', 'refused: id "' . substr($bad[0], 0, 8) . '", version "' . $bad[1] . '"');
check(t1i_windows('10.0.22000') === '11' && t1i_windows('10.0.19045') === '10' && t1i_windows('6.1.7601') === '' && t1i_windows('') === '', 'Windows 10 or 11 from the build number');
$lk = fopen($F . '.lock', 'c'); flock($lk, LOCK_EX);
check(t1i_note(str_repeat('0', 32), '0.13.1', 'test', array(), '8.8.8.8', $T) === '', 'the all-zero test number is refused');
check(t1i_stats(array('m' => array(t1i_test_key() => array('v' => '0.13.1', 'f' => '2026-10-10', 'l' => '2026-10-10'))), $T)['total'] === 0, 'the old test check-in is never counted');
check(t1i_note(str_repeat('cd34', 8), '0.13.0', '', array(), '8.8.8.8', $T) === 'busy', 'another write under way: skipped, not blocked');
flock($lk, LOCK_UN); fclose($lk);
file_put_contents($F . '.bad', 'x');
$GLOBALS['T1_INSTALLS_FILE'] = $F . '.bad';
check(t1i_note(str_repeat('ef56', 8), '0.13.0', '', array(), '8.8.8.8', $T) === '' && file_get_contents($F . '.bad') === 'x', 'an unreadable store is never overwritten');
$GLOBALS['T1_INSTALLS_FILE'] = $F;

echo "B  our own PCs (marked on the PC Manager card)\n";
inst_mark_ours('81.2.69.160', 'Steve', true, $T);
check(t1i_note(str_repeat('9a9a', 8), '0.13.0', '10.0.22631', array('bt'), '81.2.69.160', $T) === 'new', 'an install on our own connection');
$d = json_decode(file_get_contents($F), true);
check($d['m'][substr(sha1('t1inst|' . str_repeat('9a9a', 8)), 0, 16)]['o'] === 1, 'flagged as ours');

echo "C  the staff figures\n";
t1i_note(str_repeat('1111', 8), '0.12.0', '10.0.22631', array('virgin'), '8.8.8.8', $T - 5 * 86400);
t1i_note(str_repeat('2222', 8), '0.13.0', '10.0.22631', array('sky'), '86.163.78.248', $T + 86400);
$s = t1i_stats(json_decode(file_get_contents($F), true), $T + 86400);
check($s['total'] === 3 && $s['ours'] === 1, 'three installs, ours left out and counted', json_encode(array($s['total'], $s['ours'])));
check($s['kept'] === 1 && $s['once'] === 1 && $s['soon'] === 1, 'still using it / ran once / too soon to tell', json_encode(array($s['kept'], $s['once'], $s['soon'])));
check($s['versions'][0]['k'] === '0.13.1' && end($s['versions'])['k'] === '0.12.0', 'versions newest first', json_encode($s['versions']));
$pk = array(); foreach ($s['providers'] as $p) $pk[$p['k']] = $p['n'];
ksort($pk);
check($pk === array('bt' => 1, 'gmail' => 1, 'sky' => 1, 'virgin' => 1), 'provider kinds counted (ours left out)', json_encode($pk));
check($s['w10'] === 1 && $s['w11'] === 2, 'Windows 10 and 11', json_encode(array($s['w10'], $s['w11'])));
check($s['countries'][0]['k'] === 'GB' && count($s['daily']) === 30, 'countries, and 30 days of new installs');

echo "D  the release offered to the updater\n";
$V = $tmp . '/version.json';
$good = array('ver' => '0.14.0', 'url' => 'https://365techies.co.uk/downloads/t1/TechiesOneMail-Setup-0.14.0.exe', 'sha256' => str_repeat('a1', 32), 'size' => 17800000, 'notes' => 'Faster search.');
file_put_contents($V, json_encode($good));
$l = t1i_latest($V);
check($l && $l['ver'] === '0.14.0' && $l['sha256'] === str_repeat('a1', 32) && $l['size'] === 17800000, 'a complete entry is offered');
foreach (array('url' => 'https://evil.example/TechiesOneMail-Setup-0.14.0.exe', 'sha256' => 'abc', 'ver' => 'latest') as $k => $bad) {
    file_put_contents($V, json_encode(array_merge($good, array($k => $bad))));
    check(t1i_latest($V) === null, 'refused: a bad ' . $k);
}
check(t1i_latest($tmp . '/none.json') === null, 'no release yet: nothing offered');

echo "E  through t1-checkin.php\n";
$srv = $tmp . '/srv';
@mkdir($srv . '/api/geoip', 0777, true); @mkdir($srv . '/downloads/t1', 0777, true);
foreach (array('t1-checkin.php', 't1-installs-lib.php', 'pcm-installs-lib.php', 'pcm-geoip-lib.php') as $f) copy(__DIR__ . '/' . $f, $srv . '/api/' . $f);
foreach (glob(__DIR__ . '/geoip/*.bin') as $f) copy($f, $srv . '/api/geoip/' . basename($f));
file_put_contents($srv . '/downloads/t1/version.json', json_encode($good));
$port = 18500 + random_int(0, 400);
$proc = proc_open(array(PHP_BINARY, '-S', '127.0.0.1:' . $port, '-t', $srv), array(array('pipe', 'r'), array('file', $tmp . '/srv.log', 'a'), array('file', $tmp . '/srv.log', 'a')), $pipes);
usleep(800000);
function post($url, $body) {
    $ctx = stream_context_create(array('http' => array('method' => 'POST', 'ignore_errors' => true, 'timeout' => 10, 'header' => 'Content-Type: application/json', 'content' => $body)));
    $out = @file_get_contents($url, false, $ctx); $code = 0;
    foreach (($http_response_header ?? array()) as $h) if (preg_match('#^HTTP/\S+ (\d+)#', $h, $m)) $code = (int)$m[1];
    return array($code, json_decode((string)$out, true));
}
$u = "http://127.0.0.1:$port/api/t1-checkin.php";
list($code, $r) = post($u, json_encode(array('id' => str_repeat('77ab', 8), 'v' => '0.13.0', 'win' => '10.0.22631', 'prov' => array('bt'))));
check($code === 200 && $r['ok'] === true && $r['latest']['ver'] === '0.14.0', 'a check-in hears about the new version', "$code " . json_encode($r));
$st = json_decode((string)@file_get_contents($srv . '/api/t1-installs.json'), true);
check(is_array($st) && count($st['m']) === 1, 'and is counted');
list($code, $r) = post($u, '{not json');
check($code === 400, 'nonsense is refused');
list($code, $r) = post($u, json_encode(array('id' => 'x', 'v' => 'y')));
check($code === 200 && $r['latest']['ver'] === '0.14.0', 'a check-in that can\'t be counted still hears about updates');
$st2 = proc_get_status($proc);
if ($st2['running']) { if (stripos(PHP_OS, 'WIN') === 0) exec('taskkill /F /T /PID ' . (int)$st2['pid'] . ' 2>NUL'); else proc_terminate($proc); }
proc_close($proc);

function rrm($dir) { foreach ((array)@glob($dir . '/{,.}*', GLOB_BRACE) as $p) { if (in_array(basename($p), array('.', '..'), true)) continue; is_dir($p) ? rrm($p) : @unlink($p); } @rmdir($dir); }
rrm($tmp);
echo $fails ? "\n$fails FAILED\n" : "\nAll passed\n";
exit($fails ? 1 : 0);
