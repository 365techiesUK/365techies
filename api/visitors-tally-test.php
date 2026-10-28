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
echo "E2 per country: what visitors from each country read, where from, what on\n";
$pc = array(); foreach ($t7['perCountry'] as $c) $pc[$c['k']] = $c;
check(isset($pc['GB']) && isset($pc['IE']) && count($pc) === 2 && $t7['perCountry'][0]['k'] === 'GB', 'GB and IE, busiest first', json_encode(array_keys($pc)));
check($pc['GB']['n'] === 4 && $pc['IE']['n'] === 1, 'visitors per country 4 / 1', json_encode(array($pc['GB']['n'], $pc['IE']['n'])));
$gbp = array(); foreach ($pc['GB']['pages'] as $p) $gbp[$p['k']] = $p['n'];
check($gbp['/'] === 3 && $gbp['/pricing/'] === 1 && $gbp['/contact/'] === 1 && $gbp['/book-service/'] === 2 && !isset($gbp['/x/']), 'GB pages: / 3 (Dublin\'s / is not among them), pricing, contact, booking 2', json_encode($gbp));
$iep = array(); foreach ($pc['IE']['pages'] as $p) $iep[$p['k']] = $p['n'];
check($iep['/'] === 1 && count($iep) === 1, 'IE pages: / once', json_encode($iep));
$gbs = array(); foreach ($pc['GB']['src'] as $p) $gbs[$p['k']] = $p['n'];
check($gbs['Google'] === 2 && $gbs['Direct'] === 1 && $gbs['Unknown'] === 1 && $pc['IE']['src'][0]['k'] === 'Bing', 'sources per country', json_encode($gbs));
$gbo = array(); foreach ($pc['GB']['os'] as $p) $gbo[$p['k']] = $p['n'];
check($gbo['Windows 11'] === 2 && $gbo['iPhone'] === 1 && $gbo['Android'] === 1 && $pc['IE']['os'][0]['k'] === 'Android', 'systems per country (London\'s device, known later, went to GB)', json_encode($gbo));
$gbd = array(); foreach ($pc['GB']['dv'] as $p) $gbd[$p['k']] = $p['n'];
check($pc['GB']['known'] === 4 && $gbd['phone'] === 2 && $gbd['pc'] === 2, 'device share per country: 4 known, 2 phones, 2 PCs', json_encode($gbd));
$sOld = vis_fold(array(), live($T, array(row('gggg0001', 'Poole', 'GB', true, 'Google', null, array('/')))), $T);
unset($sOld['seen'][$DAY]['t365:gggg0001']['c']);   // a store written before countries were kept per visitor
$sOld = vis_fold($sOld, live($T + 60, array(row('gggg0001', 'Poole', 'GB', true, 'Google', $WIN11, array('/', '/a/')))), $T + 60);
$ob = $sOld['days'][$DAY]['t365']['byCountry']['GB'];
check($ob['visitors'] === 1 && $ob['pages']['/a/'] === 1 && $ob['os']['Windows 11'] === 1, 'an older seen entry still attributes later pages and devices by the row\'s country', json_encode($ob));
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

echo "H  actions: download clicks, Call and Text taps, enquiries sent (1 Oct 2026)\n";
$J = '/virgin-media-email-moving-to-junara/';
$s = vis_fold(array(), live($T, array(
    row('cccc0001', 'Poole', 'GB', true, 'Google', $IPH, array($J, '/~call' . $J)),
    row('cccc0002', 'Leeds', 'GB', false, 'Google', $WIN11, array($J, '/~lead' . $J, '/~dl/pcm/')),
    row('cccc0003', 'Austin', 'US', false, 'Direct', $WIN11, array('/', '/~dl/pcm/')),
    row('cccc0004', 'Bristol', 'GB', false, 'Bing', $ANDR, array('/contact/', '/~text/contact/', '/~call/', '/~send/pcm/free-pc-health-check/')),
)), $T);
$d = $s['days'][$DAY]['t365'];
check($d['warm'] === 3, 'a call, a text or an enquiry makes a visitor warm; a download alone does not', $d['warm']);
$s = vis_fold($s, live($T + 60, array(row('cccc0001', 'Poole', 'GB', true, 'Google', $IPH, array($J, '/~call' . $J, '/~call' . $J)))), $T + 60);
$st = vis_stats($s, $T + 60); $a = $st['sites']['all']['today'];
check($a['acts'] === array('dl' => 2, 'send' => 1, 'call' => 2, 'text' => 1, 'lead' => 1, 'share' => 0), 'actions counted, each visitor once a day', json_encode($a['acts']));
check($a['actFrom'][0]['k'] === $J && $a['actFrom'][0]['n'] === 2 && $a['actFrom'][0]['call'] === 1 && $a['actFrom'][0]['lead'] === 1, 'where they acted: the Junara page first', json_encode($a['actFrom']));
$home = array_values(array_filter($a['actFrom'], function ($x) { return $x['k'] === '/'; }));
check(count($home) === 1 && $home[0]['call'] === 1, 'a Call tap on the home page is from /', json_encode($a['actFrom']));
$keys = array_map(function ($x) { return $x['k']; }, $a['pages']);
check(!in_array('/~dl/pcm/', $keys, true) && !in_array('/~call' . $J, $keys, true) && !in_array('/~send/pcm/free-pc-health-check/', $keys, true) && in_array($J, $keys, true), 'the Pages list shows reading only', json_encode($keys));
// 14 Oct 2026: a link sent from the phone panel is an action, not a page, and not "where they called from"
check(vis_act_kind('/~send/pcm/free-pc-health-check/') === 'send' && vis_act_kind('/~send/t1/techies-one-mail/') === 'send' && vis_act_kind('/~sending/') === '', 'a link sent to a computer is an action');
check(!in_array('/free-pc-health-check/', array_map(function ($x) { return $x['k']; }, $a['actFrom']), true), 'a sent link is not listed with the calls, texts and forms', json_encode($a['actFrom']));
check($d['warm'] === 3, 'sending the link alone does not make a visitor warm', $d['warm']);
$us = array_values(array_filter($a['perCountry'], function ($x) { return $x['k'] === 'US'; }));
check(count($us) === 1 && $us[0]['acts']['dl'] === 1 && $us[0]['acts']['call'] === 0, 'actions per country', json_encode($us));
check(vis_act_kind('/~dl/pcm/') === 'dl' && vis_act_kind('/~lead/x/') === 'lead' && vis_act_kind('/~calling/') === '' && vis_act_kind('/call/') === '', 'only the four ping paths are actions');
// 11 Oct 2026: a download click now carries the page it was clicked on
check(vis_act_kind('/~share/whatsapp/techies-move/') === 'share' && vis_act_kind('/~sharing/') === '', 'a page shared is an action, not a page');   // 22 Oct 2026
check(vis_act_kind('/~dl/pcm/computer-spec-checker/') === 'dl' && vis_act_kind('/~dl/t1/techies-one-mail/') === 'dl', 'a download click with its page is still a download');
$DLT = date('Y-m-d');
$dvs = array('days' => array($DLT => array('t365' => array('pages' => array('/~dl/pcm/' => 1, '/~dl/pcm/computer-spec-checker/' => 3, '/~dl/pcm/free-pc-health-check/' => 2, '/~dl/t1/techies-one-mail/' => 4, '/computer-spec-checker/' => 9),
    'byCountry' => array('US' => array('pages' => array('/~dl/pcm/computer-spec-checker/' => 2)), 'GB' => array('pages' => array('/~dl/pcm/' => 1, '/~dl/pcm/free-pc-health-check/' => 2)))))));
$pt = vis_dl_tally($dvs, 'pcm'); $tt = vis_dl_tally($dvs, 't1');
check($pt['d7'] === 6 && $pt['d30'] === 6 && $tt['d30'] === 4, 'PC Manager clicks: every page they came from added up (6); Techies One Mail kept apart (4)', json_encode(array($pt['d30'], $tt['d30'])));
check($pt['from'][0] === array('k' => '/computer-spec-checker/', 'n' => 3) && count($pt['from']) === 3 && in_array(array('k' => '/', 'n' => 1), $pt['from'], true), 'the pages, busiest first; a bare /~dl/pcm/ is the home page', json_encode($pt['from']));
check($pt['countries'] === array(array('k' => 'GB', 'n' => 3), array('k' => 'US', 'n' => 2)), 'by country, from every page', json_encode($pt['countries']));
check(vis_dl_tally(null, 'pcm')['d30'] === 0 && vis_dl_tally(array(), 'pcm')['from'] === array(), 'no statistics yet: zeros, never an error');
// 28 Oct 2026: one page's visits (the banner's 365 Games figure) - that page only, not the pages under it
$gvs = array('days' => array($DLT => array('t365' => array('pages' => array('/games/' => 5, '/games/hearts/' => 7))), '2000-01-01' => array('t365' => array('pages' => array('/games/' => 50)))));
check(vis_page_tally($gvs, '/games/') === array('d7' => 5, 'd30' => 5) && vis_page_tally(null, '/games/')['d30'] === 0, 'one page\'s visits, last 7 and 30 days only', json_encode(vis_page_tally($gvs, '/games/')));
// 14 Oct 2026: links sent to a computer (the phone panel) are tallied apart from the downloads
$dvs['days'][$DLT]['t365']['pages']['/~send/pcm/free-pc-health-check/'] = 5;
$ps = vis_dl_tally($dvs, 'pcm', 8, 'send'); $pd = vis_dl_tally($dvs, 'pcm');
check($ps['d7'] === 5 && $ps['from'] === array(array('k' => '/free-pc-health-check/', 'n' => 5)) && $pd['d30'] === 6, 'sent links counted apart; the download clicks unchanged (6)', json_encode(array($ps, $pd['d30'])));

echo "I  data centres and VPNs: counted once a day as automated, nothing else (1 Oct 2026)\n";
$bot = row('dddd0001', 'Ashburn', 'US', false, 'Direct', $WIN11, array('/', '/pricing/', '/~call/'));
$bot['dc'] = true; $bot['org'] = 'Amazon.com, Inc.';
$s = vis_fold(array(), live($T, array($bot, row('dddd0002', 'Poole', 'GB', true, 'Google', $IPH, array('/')))), $T);
$d = $s['days'][$DAY]['t365'];
check($d['visitors'] === 1 && $d['auto'] === 1, 'the person counted, the data centre counted apart', json_encode(array($d['visitors'], $d['auto'])));
check(!isset($d['places']['Ashburn, US']) && !isset($d['pages']['/pricing/']) && !isset($d['src']['Direct']) && $d['warm'] === 0 && !isset($d['byCountry']['US']), 'nothing else about it kept: no town, page, source, warm or country', json_encode($d));
check(!isset($d['os']['Windows 11']) && $d['abroad'] === 0, 'no system and not "abroad"');
$s = vis_fold($s, live($T + 300, array($bot)), $T + 300);
check($s['days'][$DAY]['t365']['auto'] === 1, 'once a day, however often it is seen');
$st = vis_stats($s, $T + 300);
check($st['sites']['all']['today']['auto'] === 1 && $st['sites']['t365']['d7']['auto'] === 1 && $st['sites']['all']['today']['visitors'] === 1, 'the periods carry the automated count');
$old = vis_stats(array('v' => 1, 'since' => $DAY, 'days' => array($DAY => array('t365' => array('visitors' => 3, 'local' => 0, 'uk' => 3, 'abroad' => 0, 'warm' => 0)))), $T);
check($old['sites']['all']['today']['auto'] === 0 && $old['sites']['all']['today']['visitors'] === 3, 'a day stored before the flag reads as 0 automated');
$sh = vis_shape(200, array('ok' => true, 'at' => $T, 'sites' => array('t365' => array('visitors' => 1, 'auto' => 1, 'pages' => array(), 'places' => array(), 'rows' => array(
    array('id' => 'dddd0001', 'dc' => 1, 'org' => 'Amazon.com, Inc.<script>' . str_repeat('x', 60), 'pages' => array('/')),
    array('id' => 'dddd0002', 'org' => 'Virgin Media Limited', 'pages' => array('/')))))), '');
$r0 = $sh['sites']['t365']['rows'][0]; $r1 = $sh['sites']['t365']['rows'][1];
check($r0['dc'] === true && strpos($r0['org'], 'Amazon.com, Inc.script') === 0 && strlen($r0['org']) === 40 && $sh['sites']['t365']['auto'] === 1, 'vis_shape: the flag, a bounded network name and the count ride through', json_encode($r0));
check($r1['dc'] === false && $r1['org'] === '', 'vis_shape: a person\'s network is never passed on', json_encode($r1));

echo "J  free tools: visitors and what they did next on each (14 Oct 2026)\n";
$now = time(); $dA = gmdate('Y-m-d', $now); $dB = gmdate('Y-m-d', $now - 10 * 86400); $dC = gmdate('Y-m-d', $now - 40 * 86400);
$ts = array('days' => array(
    $dA => array('t365' => array('pages' => array('/computer-spec-checker/' => 5, '/~dl/pcm/computer-spec-checker/' => 2, '/~send/pcm/computer-spec-checker/' => 1,
        '/~call/computer-spec-checker/' => 1, '/website-checker/' => 3, '/~lead/website-checker/' => 1)),
        'ccb' => array('pages' => array('/computer-spec-checker/' => 9))),
    $dB => array('t365' => array('pages' => array('/computer-spec-checker/' => 4, '/~dl/t1/computer-spec-checker/' => 1, '/~text/computer-spec-checker/' => 2))),
    $dC => array('t365' => array('pages' => array('/computer-spec-checker/' => 50)))));
$ps = vis_path_stats($ts, $now, array('/computer-spec-checker/', '/website-checker/', '/pc-benchmark/'));
check($ps['d7'][0] == array('k' => '/computer-spec-checker/', 'n' => 5, 'dl' => 2, 'send' => 1, 'call' => 1, 'text' => 0, 'lead' => 0), '7 days: the spec checker\'s visitors and what they did; another site never counts', json_encode($ps['d7'][0]));
check($ps['d30'][0]['n'] === 9 && $ps['d30'][0]['dl'] === 3 && $ps['d30'][0]['text'] === 2, '30 days adds the older day (both apps\' downloads) and leaves out day 40', json_encode($ps['d30'][0]));
check($ps['d7'][1]['n'] === 3 && $ps['d7'][1]['lead'] === 1 && $ps['d7'][2]['n'] === 0, 'a form sent from the website checker; a tool nobody visited reads 0', json_encode($ps['d7']));
check(vis_clean_paths(array('/a/', '/a/', 'http://e/', '/b c/', 5, '/ok-path_1/', '')) === array('/a/', '/ok-path_1/') && vis_clean_paths(null) === array(), 'the request\'s paths cleaned: site paths only, no duplicates', json_encode(vis_clean_paths(array('/a/', '/a/', 'http://e/', '/b c/', 5, '/ok-path_1/', ''))));
check(vis_path_stats(array(), $now, array('/x/'))['d30'][0]['n'] === 0, 'no statistics yet: zeros, never an error');

echo "\n" . ($fails ? "visitors-tally-test: $fails FAILED\n" : "visitors-tally-test: all passed\n");
exit($fails ? 1 : 0);
