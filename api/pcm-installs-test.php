<?php
/*
 * pcm-geoip-lib.php + pcm-installs-lib.php tests. CLI only:  C:\tools\php\php.exe api/pcm-installs-test.php
 * The country lookups use the REAL tables (api/geoip/*.bin); the install store is a temp file.
 */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
error_reporting(E_ALL);
$fails = 0;
function check($ok, $what, $detail = '') { global $fails; echo ($ok ? "  PASS  " : "  FAIL  ") . $what . ($ok ? '' : "  [" . $detail . "]") . "\n"; if (!$ok) $fails++; }
$GLOBALS['PCM_INSTALLS_FILE'] = sys_get_temp_dir() . '/pcm-installs-test-' . getmypid() . '.json';
require __DIR__ . '/pcm-installs-lib.php';
$F = $GLOBALS['PCM_INSTALLS_FILE'];
@unlink($F); @unlink($F . '.lock');

echo "A  country lookups on the real tables\n";
check(geo_cc('86.163.78.248') === 'GB', 'a BT broadband address (from the access log) -> GB', geo_cc('86.163.78.248'));
check(geo_cc('8.8.8.8') === 'US', '8.8.8.8 -> US', geo_cc('8.8.8.8'));
check(geo_cc('1.0.0.1') === 'AU', '1.0.0.1 -> AU (the table\'s first real range)', geo_cc('1.0.0.1'));
check(geo_cc('2a00:23c5:1234::1') === 'GB', 'a BT IPv6 address -> GB', geo_cc('2a00:23c5:1234::1'));
check(geo_cc('::ffff:86.163.78.248') === 'GB', 'IPv4 inside IPv6 is looked up as IPv4', geo_cc('::ffff:86.163.78.248'));
check(geo_cc('127.0.0.1') === '' && geo_cc('10.1.2.3') === '' && geo_cc('192.168.0.1') === '', 'loopback and private addresses -> not known', geo_cc('10.1.2.3'));
check(geo_cc('') === '' && geo_cc('not an ip') === '' && geo_cc('999.1.1.1') === '', 'nonsense -> not known');
check(geo_cc('255.255.255.255') === '' && geo_cc('0.0.0.1') === '', 'the very ends of the IPv4 space');
check(geo_cc('8.8.8.8', __DIR__ . '/no-such-dir') === '', 'no tables -> not known, never an error');

echo "B  noting installs\n";
$T = gmmktime(10, 0, 0, 10, 1, 2026); $DAY = '2026-10-01';
check(inst_note('a1b2c3d4e5f6', 30, true, false, false, '86.163.78.248', $T) === 'new', 'a new unlinked install');
check(inst_note('a1b2c3d4e5f6', 30, true, false, false, '86.163.78.248', $T + 3600) === 'same', 'its next check-in the same day: nothing written');
check(inst_note('a1b2c3d4e5f6', 31, true, false, false, '86.163.78.248', $T + 7200) === 'updated', 'a new version the same day: noted');
check(inst_note('ffff0000aaaa', 30, false, true, true, '8.8.8.8', $T) === 'new', 'a plan customer\'s PC in the US');
check(inst_note('0000111122223333', 29, false, true, false, '2a00:23c5:1234::1', $T) === 'new', 'a linked free PC on IPv6');
check(inst_note('xyz', 30, false, false, false, '8.8.8.8', $T) === '' && inst_note('', 30, false, false, false, '', $T) === '', 'no usable machine id: ignored');
$d = json_decode(file_get_contents($F), true);
$e = $d['m'][substr(sha1('365inst|a1b2c3d4e5f6'), 0, 16)];
check($e['f'] === $DAY && $e['l'] === $DAY && $e['v'] === 31 && $e['w'] === 1 && $e['c'] === 'GB' && $e['k'] === 0 && $e['p'] === 0, 'what is kept: first/last day, version, Win10, country, linked, plan', json_encode($e));
check(!isset($d['m']['a1b2c3d4e5f6']) && strpos(file_get_contents($F), '86.163') === false && strpos(file_get_contents($F), 'a1b2c3d4e5f6') === false, 'never the address, never the raw machine id');
check(inst_note('a1b2c3d4e5f6', 31, true, true, false, '86.163.78.248', $T + 86400) === 'updated', 'the next day, linked: updated');
$lk = fopen($F . '.lock', 'c'); flock($lk, LOCK_EX);
check(inst_note('9999aaaa8888', 30, false, false, false, '8.8.8.8', $T) === 'busy', 'another write under way: skipped, not blocked');
flock($lk, LOCK_UN); fclose($lk);
check(count(glob($F . '.*.tmp')) === 0, 'no temp files left');

echo "C  the figures\n";
@unlink($F);
$N = gmmktime(12, 0, 0, 10, 1, 2026);
$plan = array(
    array('aaaa0001', 30, 1, 0, 0, '86.163.78.248', 0), array('aaaa0002', 30, 0, 0, 0, '86.163.78.248', 2), array('aaaa0003', 29, 1, 0, 0, '8.8.8.8', 10),
    array('aaaa0004', 30, 0, 1, 0, '86.163.78.248', 1), array('aaaa0005', 30, 0, 1, 1, '86.163.78.248', 3), array('aaaa0006', 28, 0, 0, 0, '8.8.8.8', 40),
);
foreach ($plan as $x) inst_note($x[0], $x[1], (bool)$x[2], (bool)$x[3], (bool)$x[4], $x[5], $N - $x[6] * 86400);
// aaaa0006 first seen 40 days ago and again 20 days ago (so it is not "new" and not active in 7 days)
inst_note('aaaa0006', 28, false, false, false, '8.8.8.8', $N - 20 * 86400);
$d = json_decode(file_get_contents($F), true);
$s = inst_stats($d, 'free', $N);
check($s['total'] === 5 && $s['plan'] === 1 && $s['linked'] === 1 && $s['unlinked'] === 4, 'free = everyone not on a plan (5); the whole picture still counts the plan PC', json_encode(array($s['total'], $s['plan'], $s['linked'], $s['unlinked'])));
check($s['active7'] === 3 && $s['active30'] === 5 && $s['new7'] === 3 && $s['new30'] === 4 && $s['newToday'] === 1, 'active in 7 / 30 days, new in 7 / 30 days, new today', json_encode(array($s['active7'], $s['active30'], $s['new7'], $s['new30'], $s['newToday'])));
$cc = array(); foreach ($s['countries'] as $c) $cc[$c['k']] = $c;
check($cc['GB']['n'] === 3 && $cc['US']['n'] === 2 && $cc['GB']['a7'] === 3 && $cc['US']['a7'] === 0 && $s['countries'][0]['k'] === 'GB', 'by country, busiest first, with how many were active this week', json_encode($s['countries']));
check($s['w10'] === 2 && $s['versions'][0]['k'] === 30, 'Windows 10 count; newest version first', json_encode($s['versions']));
check(count($s['daily']) === 30 && $s['daily'][29]['d'] === '2026-10-01' && $s['daily'][29]['n'] === 1 && $s['daily'][27]['n'] === 1, '30 days of new installs, today last', json_encode(array_slice($s['daily'], -4)));
check(inst_stats($d, 'unlinked', $N)['total'] === 4 && inst_stats($d, 'plan', $N)['total'] === 1 && inst_stats($d, 'all', $N)['total'] === 6, 'the other views: unlinked 4, plan 1, all 6');
check(inst_stats(array(), 'free', $N)['total'] === 0 && inst_stats(array(), 'free', $N)['since'] === '', 'an empty store answers zeros');
// a year unseen: dropped at the next write
inst_note('bbbb0001', 30, false, false, false, '8.8.8.8', $N - 400 * 86400);
inst_note('bbbb0002', 30, false, false, false, '8.8.8.8', $N);
check(!isset(json_decode(file_get_contents($F), true)['m'][substr(sha1('365inst|bbbb0001'), 0, 16)]), 'an install not seen for a year is dropped');

echo "E  still using it, ran once, too soon to tell (7 Oct 2026)\n";
@unlink($F);
$N = gmmktime(12, 0, 0, 10, 10, 2026);
inst_note('cccc0001', 35, false, false, false, '86.163.78.248', $N - 5 * 86400);   // first seen 5 days ago...
inst_note('cccc0001', 35, false, false, false, '86.163.78.248', $N - 1 * 86400);   // ...and again yesterday: still using it
inst_note('cccc0002', 35, false, false, false, '8.8.8.8', $N - 5 * 86400);         // one day only, 5 days ago: ran once
inst_note('cccc0003', 30, false, false, false, '8.8.8.8', $N - 2 * 86400);         // one day only, exactly 2 days ago: ran once
inst_note('cccc0004', 35, false, false, false, '86.163.78.248', $N - 1 * 86400);   // first seen yesterday: too soon
inst_note('cccc0005', 35, false, false, false, '86.163.78.248', $N);               // first seen today: too soon
inst_note('cccc0006', 35, false, false, false, '86.163.78.248', $N - 3 * 86400);
inst_note('cccc0006', 35, false, false, false, '86.163.78.248', $N - 3 * 86400 + 7200);   // twice the SAME day: still one day
$s = inst_stats(json_decode(file_get_contents($F), true), 'free', $N);
check($s['kept'] === 1 && $s['once'] === 3 && $s['soon'] === 2 && $s['total'] === 6, 'still using it 1 / ran once 3 / too soon 2 (twice in one day is still one day)', json_encode(array($s['kept'], $s['once'], $s['soon'], $s['total'])));
$cc = array(); foreach ($s['countries'] as $c) $cc[$c['k']] = $c;
check($cc['GB']['kept'] === 1 && $cc['US']['kept'] === 0 && $cc['GB']['n'] === 4 && $cc['US']['n'] === 2, 'by country: how many are still using it', json_encode($s['countries']));

echo "F  our own PCs (7 Oct 2026)\n";
@unlink($F);
$N = gmmktime(12, 0, 0, 10, 10, 2026);
check(inst_net('86.163.78.248') === '86.163.78.248' && inst_net('::ffff:86.163.78.248') === '86.163.78.248' && inst_net('2a00:23c5:1234:5678:aaaa::1') === inst_net('2a00:23c5:1234:5678:bbbb::9')
    && inst_net('2a00:23c5:1234:5678::1') !== inst_net('2a00:23c5:1234:9999::1') && inst_net('nonsense') === '', 'a connection: IPv4 as it is; IPv6 by its /64 (every device in a home shares it)');
inst_note('dddd0001', 35, false, false, false, '81.2.69.160', $N - 3 * 86400);   // Steve's test PC, at home
inst_note('dddd0002', 35, false, false, false, '8.8.8.8', $N - 3 * 86400);       // a stranger
check(inst_mark_ours('81.2.69.160', 'Steve', false, $N) === false, 'unmarking a connection nobody marked: nothing written');
check(inst_mark_ours('81.2.69.160', 'Steve', true, $N - 2 * 86400) === true, 'Steve marks his home connection as ours');
$raw = file_get_contents($F); $d = json_decode($raw, true);
check(strpos($raw, '81.2.69.160') === false && count($d['ours']) === 1 && strlen($d['salt']) === 16 && current($d['ours'])['by'] === 'Steve', 'kept as a salted one-way hash - never the address', $raw);
check(inst_is_ours($d, '81.2.69.160', $N) && !inst_is_ours($d, '81.2.69.161', $N) && !inst_is_ours($d, '8.8.8.8', $N), 'that connection, and only that one, is ours');
inst_note('dddd0001', 35, false, false, false, '81.2.69.160', $N - 2 * 86400 + 3600);   // its next check-in
$d = json_decode(file_get_contents($F), true);
$s = inst_stats($d, 'free', $N);
check($s['ours'] === 1 && $s['total'] === 1 && $s['kept'] === 0 && $s['once'] === 1 && $s['countries'][0]['k'] === 'US', 'from its next check-in, Steve\'s PC is left out of every figure and counted on its own', json_encode(array($s['ours'], $s['total'], $s['kept'], $s['once'])));
check(inst_stats($d, 'all', $N)['ours'] === 1 && inst_stats($d, 'all', $N)['unlinked'] === 1, 'left out of the whole picture too');
check(inst_note('dddd0001', 35, false, false, false, '81.2.69.160', $N - 2 * 86400 + 7200) === 'same', 'its later check-ins that day: nothing written');
inst_note('eeee0001', 30, false, true, false, '81.2.69.160', $N - 1 * 86400);     // a customer's PC on Steve's bench
inst_note('eeee0001', 30, false, true, false, '86.163.78.248', $N);               // ...collected and back home the next day
$s = inst_stats(json_decode(file_get_contents($F), true), 'free', $N);
check($s['ours'] === 1 && $s['total'] === 2 && $s['kept'] === 1, 'a customer\'s PC on our bench counts as ours only while it is here', json_encode(array($s['ours'], $s['total'], $s['kept'])));
$info = inst_ours_info(json_decode(file_get_contents($F), true), '81.2.69.160', $N);
check($info['nets'] === 1 && $info['here'] === true && $info['hereBy'] === 'Steve' && $info['hereSince'] === '2026-10-08' && inst_ours_info(json_decode(file_get_contents($F), true), '8.8.8.8', $N)['here'] === false, 'the card can say this connection is marked, by whom and since when', json_encode($info));
check(inst_mark_ours('81.2.69.160', '', true, $N, true) === true && json_decode(file_get_contents($F), true)['ours'][inst_ours_key(json_decode(file_get_contents($F), true), '81.2.69.160')]['at'] === $N
    && inst_mark_ours('81.2.69.160', '', true, $N + 3600, true) === false && inst_mark_ours('8.8.8.8', '', true, $N, true) === false, 'opening the card from it re-confirms it, at most once a day; never marks a new one');
$d = json_decode(file_get_contents($F), true);
check(!inst_is_ours($d, '81.2.69.160', $N + (INST_OURS_DAYS + 1) * 86400), 'a connection nobody re-confirms for ' . INST_OURS_DAYS . ' days stops counting');
check(inst_mark_ours('81.2.69.160', 'Steve', false, $N) === true && !inst_is_ours(json_decode(file_get_contents($F), true), '81.2.69.160', $N), 'unmarked: it is ours no more');
inst_note('dddd0001', 35, false, false, false, '81.2.69.160', $N);
check(inst_stats(json_decode(file_get_contents($F), true), 'free', $N)['ours'] === 0, '...and Steve\'s PC counts again from its next check-in');
check(inst_mark_ours('nonsense', 'Steve', true, $N) === false, 'no usable address: nothing marked');
file_put_contents($F, '{broken');
check(inst_mark_ours('81.2.69.160', 'Steve', true, $N) === false && file_get_contents($F) === '{broken', 'an unreadable store is never overwritten by a mark');
@unlink($F);

echo "D  the wiring, at source level\n";
$P = (string)file_get_contents(__DIR__ . '/pcm.php');
$i1 = strpos($P, "if (\$action === 'checkin') {"); $i2 = strpos($P, 'inst_note($machine', $i1); $i3 = strpos($P, "if (\$key === '' || !isset(\$db['customers'][\$key])) out(", $i1);
check($i1 !== false && $i2 !== false && $i3 !== false && $i2 < $i3, 'pcm.php notes the install before answering a keyless check-in');
check(strpos($P, "require_once __DIR__ . '/pcm-installs-lib.php';") !== false && strpos($P, 'catch (Throwable $e) { }') !== false, 'included at top level; a failure never stops the check-in');
$H = (string)file_get_contents(__DIR__ . '/../.htaccess');
check(preg_match('/pcm-installs\\\\\.json/', $H) && preg_match('/geoip/', $H) && preg_match('/pcm-installs-lib/', $H), '.htaccess denies the store, the tables and the library');
$E = (string)file_get_contents(__DIR__ . '/pcm-installs.php');
$pA = strpos($E, 'if (!vis_staff_ok($in, __DIR__))'); $pM = strpos($E, "inst_mark_ours(\$ip, \$by !== '' ? \$by : 'Staff', \$do === 'ours')");
check($pA !== false && $pM !== false && $pA < $pM && strpos($E, "'ours_info'") !== false && strpos($E, '$_SERVER[\'REMOTE_ADDR\']') !== false, 'pcm-installs.php: marking needs a staff session; the card is told about this connection, never its address');

@unlink($F); @unlink($F . '.lock');
echo "\n" . ($fails ? "pcm-installs-test: $fails FAILED\n" : "pcm-installs-test: all passed\n");
exit($fails ? 1 : 0);
