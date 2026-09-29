<?php
/*
 * visitors-tally-lib.php tests. CLI only:  C:\tools\php\php.exe api/visitors-tally-test.php
 * Pure functions with synthetic /live answers: nothing on disk except a temp store for the lock test.
 */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
error_reporting(E_ALL);
require __DIR__ . '/visitors-tally-lib.php';

$fails = 0;
function check($ok, $what, $detail = '') { global $fails; echo ($ok ? "  PASS  " : "  FAIL  ") . $what . ($ok ? '' : "  [" . $detail . "]") . "\n"; if (!$ok) $fails++; }
function row($id, $place, $ct, $local, $src, $dev, $pages) {
    return array('id' => $id, 'place' => $place, 'ct' => $ct, 'la' => 50.72, 'lo' => -1.88, 'local' => $local, 'src' => $src, 'dev' => $dev, 'pages' => $pages, 'since' => 60, 'ago' => 5);
}
$WIN11 = array('os' => 'Windows 11', 'br' => 'Edge 140', 'dv' => 'pc', 'sc' => 'l', 'dk' => 1, 'lg' => 'en-GB');
$IPH = array('os' => 'iPhone', 'br' => 'Safari 18', 'dv' => 'phone', 'sc' => 's', 'dk' => 0, 'lg' => 'en-GB');
$ANDR = array('os' => 'Android', 'br' => 'Chrome 140', 'dv' => 'phone', 'sc' => 's', 'dk' => 0, 'lg' => 'en-GB');
function live($at, $t365rows, $ccbrows = array()) {
    return array('ok' => true, 'at' => $at, 'sites' => array(
        't365' => array('label' => '365techies.co.uk', 'visitors' => count($t365rows), 'pages' => array(), 'places' => array(), 'rows' => $t365rows, 'hasRows' => true),
        'ccb' => array('label' => 'colinclarkbuilders.co.uk', 'visitors' => count($ccbrows), 'pages' => array(), 'places' => array(), 'rows' => $ccbrows, 'hasRows' => true),
        'beckox' => array('label' => 'beckox.co.uk', 'visitors' => 0, 'pages' => array(), 'places' => array(), 'rows' => array(), 'hasRows' => true)));
}
$T = gmmktime(12, 0, 0, 9, 29, 2026); $DAY = '2026-09-29';

echo "A  one poll: visitors, places, sources, devices, pages, warm\n";
$s = vis_fold(array(), live($T, array(
    row('aaaa0001', 'Southampton', 'GB', true, 'Google', $WIN11, array('/', '/computer-spec-checker/')),
    row('aaaa0002', 'Poole', 'GB', true, 'Direct', $IPH, array('/virgin-email-mover/', '/book-service/')),
    row('aaaa0003', 'London', 'GB', false, null, null, array('/')),
    row('aaaa0004', 'Dublin', 'IE', false, 'Bing', $ANDR, array('/')),
), array(row('bbbb0001', 'Poole', 'GB', true, 'Google', $WIN11, array('/')))), $T);
$d = $s['days'][$DAY]['t365'];
check($s['since'] === $DAY, 'since = the first day');
check($d['visitors'] === 4 && $d['local'] === 2 && $d['uk'] === 1 && $d['abroad'] === 1, 'visitors 4: 2 local, 1 UK, 1 abroad', json_encode($d));
check($d['places']['Southampton, GB'] === 1 && $d['places']['Dublin, IE'] === 1 && $d['placesLocal']['Poole, GB'] === 1 && !isset($d['placesLocal']['London, GB']), 'places, and which are local', json_encode($d['places']));
check($d['src']['Google'] === 1 && $d['src']['Direct'] === 1 && $d['src']['Unknown'] === 1 && $d['src']['Bing'] === 1, 'sources, null = Unknown', json_encode($d['src']));
check($d['os']['Windows 11'] === 1 && $d['os']['iPhone'] === 1 && $d['os']['Android'] === 1 && !isset($d['os']['Unknown system']), 'systems (a visitor with no device is not counted as a system)', json_encode($d['os']));
check($d['dv']['pc'] === 1 && $d['dv']['phone'] === 2 && $d['br']['Edge 140'] === 1, 'phone/PC and browsers', json_encode($d['dv']));
check($d['pages']['/'] === 3 && $d['pages']['/computer-spec-checker/'] === 1 && $d['pages']['/book-service/'] === 1, 'pages counted per visitor', json_encode($d['pages']));
check($d['warm'] === 1, 'warm: the booking page, once');
check($s['days'][$DAY]['ccb']['visitors'] === 1 && $s['days'][$DAY]['ccb']['warm'] === 0, 'the other site counted apart, never warm');

echo "B  the same visitors again 90 s later: nothing counted twice; a new page and a device that became known are\n";
$s = vis_fold($s, live($T + 90, array(
    row('aaaa0001', 'Southampton', 'GB', true, 'Google', $WIN11, array('/', '/computer-spec-checker/', '/pricing/')),
    row('aaaa0003', 'London', 'GB', false, null, $ANDR, array('/', '/contact/')),
)), $T + 90);
$d = $s['days'][$DAY]['t365'];
check($d['visitors'] === 4 && $d['places']['Southampton, GB'] === 1 && $d['src']['Google'] === 1, 'still 4 visitors, one Southampton, one Google', json_encode($d));
check($d['pages']['/'] === 3 && $d['pages']['/computer-spec-checker/'] === 1 && $d['pages']['/pricing/'] === 1 && $d['pages']['/contact/'] === 1, 'only the new pages added', json_encode($d['pages']));
check($d['os']['Android'] === 2 && $d['dv']['phone'] === 3, 'the London visitor\'s device counted once it was known', json_encode($d['os']));
check($d['warm'] === 3, 'warm: pricing and contact each made a visitor warm; the booking one stays one', $d['warm']);
$s = vis_fold($s, live($T + 180, array(row('aaaa0001', 'Southampton', 'GB', true, 'Google', $WIN11, array('/pricing/', '/book-service/')))), $T + 180);
check($s['days'][$DAY]['t365']['warm'] === 3, 'a warm visitor reaching a second warm page is not counted again');

echo "C  a new day: fresh counts; yesterday's ids kept, older dropped; 60-day rollups\n";
$s['days']['2026-07-01'] = array('t365' => vis_empty_day());
$s['seen']['2026-09-27'] = array('t365:old' => array('p' => array(), 'd' => 0, 'w' => 0));
$T2 = $T + 86400;
$s = vis_fold($s, live($T2, array(row('cccc0001', 'Bournemouth', 'GB', true, 'Google', $WIN11, array('/')))), $T2);
check(isset($s['days']['2026-09-30']) && $s['days']['2026-09-30']['t365']['visitors'] === 1 && $s['days'][$DAY]['t365']['visitors'] === 4, 'a new day starts at 0; yesterday keeps its 4');
check(isset($s['seen'][$DAY]) && isset($s['seen']['2026-09-30']) && !isset($s['seen']['2026-09-27']), 'seen: today and yesterday only', json_encode(array_keys($s['seen'])));
check(!isset($s['days']['2026-07-01']), 'a rollup older than 60 days dropped');

echo "D  caps: beyond 500 towns new ones fold into Other; a bad row or an id-less row is skipped\n";
$rows = array(); for ($i = 0; $i < 505; $i++) $rows[] = row(sprintf('dddd%04x', $i), 'Town' . $i, 'GB', false, 'Direct', null, array('/'));
$rows[] = 'junk'; $rows[] = row('', 'Nowhere', 'GB', false, 'Direct', null, array('/'));
$s2 = vis_fold(array(), live($T, $rows), $T);
$d = $s2['days'][$DAY]['t365'];
check($d['visitors'] === 505 && count($d['places']) === 501 && $d['places']['Other'] === 5, '505 visitors, 500 towns + Other 5', count($d['places']) . '/' . (isset($d['places']['Other']) ? $d['places']['Other'] : '-'));

echo "E  vis_stats: periods, top lists, shares of local, the device share\n";
$st = vis_stats($s, $T2 + 3600);
$all7 = $st['sites']['all']['d7']; $t7 = $st['sites']['t365']['d7']; $today = $st['sites']['t365']['today'];
check($st['since'] === $DAY && $all7['visitors'] === 6 && $t7['visitors'] === 5 && $today['visitors'] === 1, 'all sites 6 over 7 days, 365 5, today 1', json_encode(array($all7['visitors'], $t7['visitors'], $today['visitors'])));
check($all7['days'] === 2 && $st['sites']['ccb']['d7']['visitors'] === 1 && $st['sites']['beckox']['d30']['visitors'] === 0, 'days covered 2; per-site figures');
$pl = array(); foreach ($t7['places'] as $p) $pl[$p['k']] = $p;
check(isset($pl['Southampton, GB']) && $pl['Southampton, GB']['local'] === true && $pl['London, GB']['local'] === false && $pl['Dublin, IE']['local'] === false, 'towns with their local flag', json_encode($t7['places']));
check($t7['places'][0]['n'] >= $t7['places'][1]['n'], 'busiest first');
$cc = array(); foreach ($t7['countries'] as $c) $cc[$c['k']] = $c['n'];
check($cc['GB'] === 4 && $cc['IE'] === 1 && $t7['countries'][0]['k'] === 'GB' && count($cc) === 2, 'countries from the towns: GB 4, IE 1', json_encode($t7['countries']));
$sBare = vis_fold(array(), live($T, array(row('ffff0001', '', 'FR', false, 'Google', null, array('/')), row('ffff0002', '', '', false, 'Google', null, array('/')))), $T);
$cb = array(); foreach (vis_stats($sBare, $T)['sites']['t365']['today']['countries'] as $c) $cb[$c['k']] = $c['n'];
check($cb['FR'] === 1 && $cb['Unknown'] === 1, 'no town: the bare country code counts; nothing known = Unknown', json_encode($cb));
check($t7['pages'][0]['k'] === '/' && $t7['pages'][0]['n'] === 4, 'top page / with 4', json_encode($t7['pages']));
$os = array(); foreach ($t7['os'] as $o) $os[$o['k']] = $o['n'];
check($os['Windows 11'] === 2 && $os['Android'] === 2 && $os['iPhone'] === 1 && $t7['known'] === 5, 'systems and the known-device count', json_encode($t7['os']));
check($t7['local'] === 3 && $t7['uk'] === 1 && $t7['abroad'] === 1 && $t7['warm'] === 3, 'local/UK/abroad/warm summed');
$st2 = vis_stats($s2, $T + 60);
check(count($st2['sites']['t365']['today']['places']) === 10 && !in_array('Other', array_map(function ($p) { return $p['k']; }, $st2['sites']['t365']['today']['places'])), 'top 10, Other never listed');
check(vis_stats(array(), $T)['sites']['all']['d30']['visitors'] === 0 && vis_stats(array(), $T)['since'] === '', 'an empty store answers zeros');

echo "F  vis_tally on disk: writes whole-or-nothing, the lock keeps two tallies apart, a corrupt store starts afresh\n";
$tmp = sys_get_temp_dir() . '/vis-tally-test-' . getmypid() . '.json';
@unlink($tmp); @unlink($tmp . '.lock');
check(vis_tally(live($T, array(row('eeee0001', 'Poole', 'GB', true, 'Google', $WIN11, array('/')))), $tmp, $T) === true, 'first tally written');
$disk = json_decode(file_get_contents($tmp), true);
check($disk['days'][$DAY]['t365']['visitors'] === 1, 'read back');
check(vis_tally(live($T, array(row('eeee0002', 'Poole', 'GB', true, 'Google', $WIN11, array('/')))), $tmp, $T) === true && json_decode(file_get_contents($tmp), true)['days'][$DAY]['t365']['visitors'] === 2, 'a second tally replaces the file (rename over an existing store)');
$lk = fopen($tmp . '.lock', 'c'); flock($lk, LOCK_EX);
check(vis_tally(live($T, array(row('eeee0009', 'Poole', 'GB', true, 'Google', $WIN11, array('/')))), $tmp, $T) === 'locked', 'locked: skipped, not blocked');
flock($lk, LOCK_UN); fclose($lk);
check(json_decode(file_get_contents($tmp), true)['days'][$DAY]['t365']['visitors'] === 2, 'the skipped tally changed nothing');
file_put_contents($tmp, '{not json');
check(vis_tally(live($T, array(row('eeee0003', 'Poole', 'GB', true, 'Google', $WIN11, array('/')))), $tmp, $T) === true && json_decode(file_get_contents($tmp), true)['days'][$DAY]['t365']['visitors'] === 1, 'a corrupt store starts afresh');
check(count(glob($tmp . '.*.tmp')) === 0, 'no temp files left');
@unlink($tmp); @unlink($tmp . '.lock');

echo "G  vis_shape: the Worker's answer bounded; the why line on failures\n";
$raw = array('ok' => true, 'at' => $T, 'sites' => array('t365' => array('visitors' => 1, 'pages' => array('/' => 1), 'places' => array(), 'rows' => array(array(
    'id' => 'ZZ12ab34cd', 'place' => str_repeat('P', 80), 'ct' => 'GB1', 'la' => '50.719', 'lo' => 'x', 'local' => 1, 'src' => 'Google',
    'dev' => array('os' => 'Windows 11<b>', 'br' => 'Edge 140', 'dv' => 'laptop', 'sc' => 'l', 'dk' => 'yes', 'lg' => 'en-GB;q=1'),
    'pages' => array_fill(0, 20, '/p/'), 'since' => '12', 'ago' => 3)))));
$o = vis_shape(200, $raw, '');
$r = $o['sites']['t365']['rows'][0];
check(empty($o['why']) && $r['id'] === '12ab34cd' && strlen($r['place']) === 60 && $r['ct'] === 'GB' && $r['la'] === 50.72 && $r['lo'] === null && $r['local'] === true, 'row fields bounded', json_encode($r));
check($r['dev']['os'] === 'Windows 11b' && $r['dev']['dv'] === '' && $r['dev']['dk'] === 1 && $r['dev']['lg'] === 'en-GBq' && count($r['pages']) === 12, 'device fields whitelisted, pages capped at 12', json_encode($r['dev']));
check($o['sites']['ccb']['visitors'] === -1 && $o['sites']['ccb']['error'] === 'unreachable', 'a site missing from the answer = unreachable');
check(strpos(vis_shape(403, array('ok' => false, 'error' => 'auth'), '')['why'], 'password') !== false, '403 auth -> the password line');
check(strpos(vis_shape(0, null, 'Could not resolve host')['why'], 'could not reach Cloudflare (Could not resolve host)') !== false, 'no connection -> could not reach');
check(strpos(vis_shape(400, array('error' => 'site'), '')['why'], 'older code') !== false, '400 site -> older code');
check(vis_shape(200, array('ok' => true), '')['why'] === 'Cloudflare answered HTTP 200.', 'a 200 without sites -> HTTP 200');

echo "\n" . ($fails ? "visitors-tally-test: $fails FAILED\n" : "visitors-tally-test: all passed\n");
exit($fails ? 1 : 0);
