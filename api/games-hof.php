<?php
/*
 * 365 Games Hall of Fame (4 Oct 2026). Owner: "high scores go into a Hall of Fame ... initials and where they are,
 * like Poole or Bournemouth"; picks: open to EVERYONE, a "365 member" badge for signed-in customers, initials + town
 * (never a full postcode), only with the player's own "show me" tick.
 *
 * Solitaire first. Two races, both on deals that are the same for everyone, so they are fair:
 *   daily  - Today's deal at each level (Easy 1, Normal 3, Hard 5, Expert 7): fastest win.
 *   sprint - Today's 3-minute sprint (turn one): most cards up to the piles in three minutes.
 * Every score is PROVED: the game sends its moves and games-sol-lib.php replays them from the deal number with the same
 * rules as the browser (a parity test pins the two together). A log that does not replay, or a time that is not
 * humanly possible for that many moves, is refused.
 *
 * Players: a random id + secret key made in the browser (localStorage, for the feature they ticked - nothing else);
 * the server keeps only a hash of the key, so only that browser can rename itself or take its name off. A signed-in
 * customer (the portal's web session, checked by the canonical portal_session_check) gets their initials and town from
 * their account and the member badge. Nothing else about them is ever shown.
 *
 * Actions (POST JSON): whoami, submit, board, rename, forget. Store: games-hof.json (denied in .htaccess), 2 years.
 * NO closing tag in this file.
 */
error_reporting(0);
date_default_timezone_set('Europe/London');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');

$HOF_STORE = __DIR__ . '/games-hof.json';
$HOF_LOCK  = __DIR__ . '/games-hof.lock';
$HOF_RATE  = __DIR__ . '/games-hof-rate.json';
$HOF_KEEP  = 2 * 365 * 86400;
require_once __DIR__ . '/games-sol-lib.php';

function hof_out($a, $code = 200) { http_response_code($code); echo json_encode($a, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') hof_out(array('ok' => false, 'error' => 'method'), 405);
$src = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : (isset($_SERVER['HTTP_REFERER']) ? $_SERVER['HTTP_REFERER'] : '');
if ($src !== '' && strpos($src, '365techies.co.uk') === false && !preg_match('#^https?://(localhost|127\.0\.0\.1)(:\d+)?(/|$)#', $src)) hof_out(array('ok' => false, 'error' => 'origin'), 403);
$in = json_decode((string)file_get_contents('php://input', false, null, 0, 65536), true);
if (!is_array($in)) hof_out(array('ok' => false, 'error' => 'bad-input'), 400);
$action = isset($in['action']) ? preg_replace('/[^a-z]/', '', (string)$in['action']) : '';
if (!isset($in['game']) || $in['game'] !== 'solitaire') hof_out(array('ok' => false, 'error' => 'game'), 400);

// ---- the towns a player can pick (and the ones a customer's postcode maps to)
$HOF_TOWNS = array('Bournemouth', 'Poole', 'Christchurch', 'Highcliffe', 'Ferndown', 'West Moors', 'Wimborne', 'Broadstone', 'Corfe Mullen',
    'Verwood', 'Ringwood', 'New Milton', 'Lymington', 'Brockenhurst', 'Wareham', 'Swanage', 'Weymouth', 'Portland', 'Dorchester',
    'Bridport', 'Lyme Regis', 'Blandford', 'Shaftesbury', 'Gillingham', 'Sherborne', 'Salisbury', 'Southampton',
    'Elsewhere in Dorset', 'Elsewhere in Hampshire', 'Elsewhere in the UK', 'Outside the UK');
function hof_town_from_postcode($pc, $city, $towns) {
    $pc = strtoupper(preg_replace('/\s+/', '', (string)$pc));
    if (preg_match('/^([A-Z]{1,2})(\d{1,2})[A-Z]?\d[A-Z]{2}$/', $pc, $m) || preg_match('/^([A-Z]{1,2})(\d{1,2})[A-Z]?$/', $pc, $m)) {
        $a = $m[1]; $d = (int)$m[2];
        if ($a === 'BH') {
            if ($d >= 1 && $d <= 11) return 'Bournemouth';
            if ($d >= 12 && $d <= 17) return 'Poole';
            $bh = array(18 => 'Broadstone', 19 => 'Swanage', 20 => 'Wareham', 21 => 'Wimborne', 22 => 'Ferndown', 23 => 'Christchurch', 24 => 'Ringwood', 25 => 'New Milton', 31 => 'Verwood');
            return isset($bh[$d]) ? $bh[$d] : 'Elsewhere in Dorset';
        }
        if ($a === 'DT') { $dt = array(1 => 'Dorchester', 2 => 'Dorchester', 3 => 'Weymouth', 4 => 'Weymouth', 5 => 'Portland', 6 => 'Bridport', 7 => 'Lyme Regis', 9 => 'Sherborne', 11 => 'Blandford'); return isset($dt[$d]) ? $dt[$d] : 'Elsewhere in Dorset'; }
        if ($a === 'SP') { if ($d === 7) return 'Shaftesbury'; if ($d === 8) return 'Gillingham'; if ($d === 1 || $d === 2) return 'Salisbury'; return 'Elsewhere in the UK'; }
        if ($a === 'SO') { if ($d === 41) return 'Lymington'; if ($d === 42) return 'Brockenhurst'; if ($d >= 14 && $d <= 19) return 'Southampton'; return 'Elsewhere in Hampshire'; }
        return 'Elsewhere in the UK';
    }
    foreach ($towns as $t) if (strcasecmp(trim((string)$city), $t) === 0) return $t;
    return '';
}
// initials: letters only, one to three of them, and never a rude word
function hof_ini($s) {
    $s = strtoupper(preg_replace('/[^A-Za-z]/', '', (string)$s));
    $s = substr($s, 0, 3);
    $no = array('ASS', 'ARS', 'FUK', 'FUC', 'FCK', 'FUQ', 'SEX', 'CUM', 'TIT', 'NOB', 'DIK', 'DIC', 'COK', 'KOK', 'VAG', 'PIS', 'CNT', 'KNT', 'FAG', 'NIG', 'NGR', 'KKK', 'WTF', 'POO', 'PEE', 'BUM', 'GAY', 'HOE', 'JIZ', 'SHT', 'SHI', 'BJ', 'FU', 'XXX', 'NAZ', 'SS', 'KY', 'IRA');
    if ($s === '' || in_array($s, $no, true)) return '';
    return $s;
}
function hof_member($in, $towns) {   // a signed-in customer: their initials and town from the account, or null
    if (!isset($in['auth']) || !is_array($in['auth'])) return null;
    $wt = preg_replace('/[^a-f0-9]/', '', (string)(isset($in['auth']['wtoken']) ? $in['auth']['wtoken'] : ''));
    $mc = preg_replace('/[^a-f0-9]/', '', substr((string)(isset($in['auth']['machine']) ? $in['auth']['machine'] : ''), 0, 32));
    // HOF_TEST_DB: a test copy of the customer file, set only in the environment of a local test server (never on the
    // live server), so tests never read or touch real customer data
    $dbf = getenv('HOF_TEST_DB') && is_file(getenv('HOF_TEST_DB')) ? getenv('HOF_TEST_DB') : __DIR__ . '/pcm-data.json';
    if ($wt === '' || !file_exists(__DIR__ . '/pcm-portal-auth-lib.php') || !file_exists($dbf)) return null;
    require_once __DIR__ . '/pcm-portal-auth-lib.php';
    $db = @json_decode((string)@file_get_contents($dbf), true);
    $chk = portal_session_check($db, $wt, $mc);
    if (empty($chk['ok']) || !empty($chk['viewas'])) return null;   // a staff "view as" is never the customer playing
    $c = $db['customers'][$chk['key']];
    $words = preg_split('/\s+/', trim(preg_replace('/[^A-Za-z\s\'-]/', ' ', (string)(isset($c['name']) ? $c['name'] : ''))));
    $ini = count($words) && $words[0] !== '' ? strtoupper(substr($words[0], 0, 1) . (count($words) > 1 ? substr($words[count($words) - 1], 0, 1) : '')) : '';
    $addr = isset($c['addr']) && is_array($c['addr']) ? $c['addr'] : array();
    $town = hof_town_from_postcode(isset($addr['postcode']) ? $addr['postcode'] : (isset($c['postcode']) ? $c['postcode'] : ''), isset($addr['city']) ? $addr['city'] : '', $towns);
    return array('ini' => hof_ini($ini), 'town' => $town);
}

// ---- the store
function hof_load($f) { $a = @json_decode((string)@file_get_contents($f), true); if (!is_array($a)) $a = array(); if (!isset($a['players']) || !is_array($a['players'])) $a['players'] = array(); if (!isset($a['entries']) || !is_array($a['entries'])) $a['entries'] = array(); return $a; }
function hof_save($f, $a) {
    $tmp = $f . '.' . getmypid() . '.tmp';
    if (@file_put_contents($tmp, json_encode($a, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)) === false) return false;
    if (!@rename($tmp, $f)) { @unlink($f); if (!@rename($tmp, $f)) { @unlink($tmp); return false; } }
    return true;
}
function hof_player($in) {
    $id = isset($in['player']) ? (string)$in['player'] : ''; $key = isset($in['key']) ? (string)$in['key'] : '';
    if (!preg_match('/^[a-f0-9]{16,32}$/', $id) || !preg_match('/^[a-f0-9]{32}$/', $key)) return null;
    return array('id' => $id, 'kh' => hash('sha256', $key . '|365hof'));
}
function hof_mmss($s) { $s = (int)$s; return intdiv($s, 60) . ':' . str_pad((string)($s % 60), 2, '0', STR_PAD_LEFT); }
$LV_NAME = array(1 => 'Easy', 3 => 'Normal', 5 => 'Hard', 7 => 'Expert');
$LV_POINTS = array(1 => 100, 3 => 150, 5 => 250, 7 => 400);
function hof_points($e) { global $LV_POINTS; return $LV_POINTS[$e['lv']] + max(0, 200 - intdiv((int)$e['secs'], 3)); }

// the boards: rows of {rank, ini, town, v (the score as shown), sub, m (member), you}
function hof_board($all, $board, $lv, $town, $me) {
    $today = date('Y-m-d'); $rows = array(); $byP = array();
    $pl = $all['players'];
    if ($board === 'week') {
        $week = date('o-W');
        foreach ($all['entries'] as $e) {
            if ($e['mode'] !== 'daily' || date('o-W', strtotime($e['day'] . ' 12:00')) !== $week || !isset($pl[$e['p']])) continue;
            if (!isset($byP[$e['p']])) $byP[$e['p']] = array('pts' => 0, 'wins' => 0);
            $byP[$e['p']]['pts'] += hof_points($e); $byP[$e['p']]['wins']++;
        }
        foreach ($byP as $p => $x) $rows[] = array('p' => $p, 'k1' => -$x['pts'], 'k2' => -$x['wins'], 'v' => number_format($x['pts']) . ' pts', 'sub' => $x['wins'] . ($x['wins'] === 1 ? ' deal won' : ' deals won'));
    } else {
        foreach ($all['entries'] as $e) {
            if (!isset($pl[$e['p']])) continue;
            if ($board === 'sprint') { if ($e['mode'] !== 'sprint' || $e['day'] !== $today) continue; }
            else {
                if ($e['mode'] !== 'daily' || (int)$e['lv'] !== $lv) continue;
                if ($board !== 'alltime' && $e['day'] !== $today) continue;
                if ($board === 'town' && $pl[$e['p']]['town'] !== $town) continue;
            }
            $r = $board === 'sprint'
                ? array('p' => $e['p'], 'k1' => -$e['cards'], 'k2' => $e['secs'], 'v' => $e['cards'] . ($e['cards'] === 52 ? ' cards - all of them!' : ' cards'), 'sub' => hof_mmss($e['secs']))
                : array('p' => $e['p'], 'k1' => $e['secs'], 'k2' => $e['moves'], 'v' => hof_mmss($e['secs']), 'sub' => $e['moves'] . ' moves' . ($board === 'alltime' ? ' · ' . date('j M Y', strtotime($e['day'] . ' 12:00')) : ''));
            if (!isset($byP[$e['p']]) || $r['k1'] < $byP[$e['p']]['k1'] || ($r['k1'] === $byP[$e['p']]['k1'] && $r['k2'] < $byP[$e['p']]['k2'])) $byP[$e['p']] = $r;   // each player once: their best
        }
        $rows = array_values($byP);
    }
    usort($rows, function ($a, $b) { return $a['k1'] === $b['k1'] ? ($a['k2'] === $b['k2'] ? strcmp($a['p'], $b['p']) : ($a['k2'] < $b['k2'] ? -1 : 1)) : ($a['k1'] < $b['k1'] ? -1 : 1); });
    $out = array(); $mine = null;
    foreach ($rows as $i => $r) {
        $p = $pl[$r['p']];
        $row = array('rank' => $i + 1, 'ini' => $p['ini'], 'town' => $p['town'], 'v' => $r['v'], 'sub' => $r['sub'], 'm' => !empty($p['member']), 'you' => $me !== null && $r['p'] === $me);
        if ($i < 20) $out[] = $row;
        if ($row['you']) $mine = $row;
    }
    return array('rows' => $out, 'count' => count($rows), 'mine' => $mine);
}

// ---- rate limits (per visitor per day, and in all) for anything that writes
function hof_rate($file) {
    $day = date('Y-m-d'); $ip = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '';
    $who = substr(hash('sha256', $ip . '|' . $day . '|365-hof'), 0, 16);
    $r = @json_decode((string)@file_get_contents($file), true);
    if (!is_array($r) || !isset($r['day']) || $r['day'] !== $day) $r = array('day' => $day, 'all' => 0, 'v' => array());
    $n = isset($r['v'][$who]) ? (int)$r['v'][$who] : 0;
    if ($n >= 60 || (int)$r['all'] >= 5000) return false;
    $r['v'][$who] = $n + 1; $r['all'] = (int)$r['all'] + 1;
    @file_put_contents($file, json_encode($r), LOCK_EX);
    return true;
}

$P = hof_player($in);
$lv = isset($in['lv']) ? (int)$in['lv'] : 1; if (!isset($LV_NAME[$lv])) $lv = 1;

if ($action === 'whoami') {
    $mem = hof_member($in, $HOF_TOWNS);
    $all = hof_load($HOF_STORE); $known = $P && isset($all['players'][$P['id']]) && $all['players'][$P['id']]['kh'] === $P['kh'] ? $all['players'][$P['id']] : null;
    hof_out(array('ok' => true, 'towns' => $HOF_TOWNS, 'member' => $mem !== null, 'ini' => $mem ? $mem['ini'] : ($known ? $known['ini'] : ''),
        'town' => $mem && $mem['town'] !== '' ? $mem['town'] : ($known ? $known['town'] : ''), 'shown' => $known !== null, 'today' => date('Y-m-d')));
}

if ($action === 'board') {
    $board = isset($in['board']) && in_array($in['board'], array('today', 'week', 'alltime', 'sprint', 'town'), true) ? $in['board'] : 'today';
    $town = isset($in['town']) && in_array($in['town'], $HOF_TOWNS, true) ? $in['town'] : '';
    $all = hof_load($HOF_STORE);
    $me = $P && isset($all['players'][$P['id']]) && $all['players'][$P['id']]['kh'] === $P['kh'] ? $P['id'] : null;
    if ($board === 'town' && $town === '' && $me) $town = $all['players'][$me]['town'];
    $b = hof_board($all, $board, $lv, $town, $me);
    hof_out(array('ok' => true, 'board' => $board, 'lv' => $lv, 'town' => $town, 'today' => date('Y-m-d')) + $b);
}

if ($action === 'submit' || $action === 'rename' || $action === 'forget') {
    if (!$P) hof_out(array('ok' => false, 'error' => 'player'), 400);
    if (!hof_rate($HOF_RATE)) hof_out(array('ok' => false, 'error' => 'rate'), 429);
}

if ($action === 'submit') {
    $mode = isset($in['mode']) && $in['mode'] === 'sprint' ? 'sprint' : 'daily';
    if ($mode === 'sprint') $lv = 1;
    $day = isset($in['day']) ? (string)$in['day'] : '';
    $n = sol_day_number($day); $todayN = sol_day_number(date('Y-m-d'));
    if ($n === null || abs($n - $todayN) > 1) hof_out(array('ok' => false, 'error' => 'day'), 400);   // the player's own calendar day, give or take one
    $seed = $mode === 'sprint' ? sol_sprint_seed($n) : sol_daily_seed($n, $lv);
    $log = isset($in['log']) && is_array($in['log']) ? $in['log'] : array();
    $s = sol_replay($seed, $lv, $log);
    if ($s === null) hof_out(array('ok' => false, 'error' => 'replay'), 400);
    $secs = isset($in['secs']) ? (int)$in['secs'] : 0; $moves = count($log); $cards = sol_found_count($s);
    if ($mode === 'daily') {
        if (!$s['won']) hof_out(array('ok' => false, 'error' => 'not-won'), 400);
        if ($secs < max(25, (int)ceil($moves * 0.2)) || $secs > 4 * 3600) hof_out(array('ok' => false, 'error' => 'time'), 400);
    } else {
        if ($cards < 1 || $secs < 10 || $secs > 185) hof_out(array('ok' => false, 'error' => 'time'), 400);
    }
    // who they are on the board
    $mem = hof_member($in, $HOF_TOWNS);
    if ($mem && $mem['ini'] !== '') { $ini = $mem['ini']; $town = $mem['town'] !== '' ? $mem['town'] : (isset($in['town']) && in_array($in['town'], $HOF_TOWNS, true) ? $in['town'] : 'Elsewhere in the UK'); }
    else {
        $ini = hof_ini(isset($in['ini']) ? $in['ini'] : '');
        $town = isset($in['town']) && in_array($in['town'], $HOF_TOWNS, true) ? $in['town'] : '';
        if ($ini === '') hof_out(array('ok' => false, 'error' => 'ini'), 400);
        if ($town === '') hof_out(array('ok' => false, 'error' => 'town'), 400);
    }
    $lk = @fopen($HOF_LOCK, 'c'); if ($lk) @flock($lk, LOCK_EX);
    $all = hof_load($HOF_STORE);
    if (isset($all['players'][$P['id']]) && $all['players'][$P['id']]['kh'] !== $P['kh']) { if ($lk) { @flock($lk, LOCK_UN); @fclose($lk); } hof_out(array('ok' => false, 'error' => 'player'), 403); }
    $all['players'][$P['id']] = array('kh' => $P['kh'], 'ini' => $ini, 'town' => $town, 'member' => $mem !== null, 't' => time());
    $cut = time() - $HOF_KEEP;
    $all['entries'] = array_values(array_filter($all['entries'], function ($e) use ($cut) { return (int)$e['t'] >= $cut; }));
    $new = array('p' => $P['id'], 'mode' => $mode, 'lv' => $lv, 'day' => $day, 'secs' => $secs, 'moves' => $moves, 'cards' => $cards, 't' => time());
    $improved = true; $found = false;
    foreach ($all['entries'] as $i => $e) {
        if ($e['p'] !== $P['id'] || $e['mode'] !== $mode || (int)$e['lv'] !== $lv || $e['day'] !== $day) continue;
        $found = true;
        $better = $mode === 'sprint' ? ($cards > $e['cards'] || ($cards === $e['cards'] && $secs < $e['secs'])) : ($secs < $e['secs'] || ($secs === $e['secs'] && $moves < $e['moves']));
        if ($better) $all['entries'][$i] = $new; else $improved = false;
    }
    if (!$found) $all['entries'][] = $new;
    if (count($all['entries']) > 60000) $all['entries'] = array_slice($all['entries'], -60000);
    $ok = hof_save($HOF_STORE, $all);
    if ($lk) { @flock($lk, LOCK_UN); @fclose($lk); }
    if (!$ok) hof_out(array('ok' => false, 'error' => 'store'), 500);
    $b = hof_board($all, $mode === 'sprint' ? 'sprint' : 'today', $lv, '', $P['id']);
    $t = $mode === 'daily' ? hof_board($all, 'town', $lv, $town, $P['id']) : null;
    hof_out(array('ok' => true, 'improved' => $improved, 'ini' => $ini, 'town' => $town, 'member' => $mem !== null, 'rank' => $b['mine'] ? $b['mine']['rank'] : null, 'count' => $b['count'],
        'townRank' => $t && $t['mine'] ? $t['mine']['rank'] : null, 'townCount' => $t ? $t['count'] : 0) + array('rows' => $b['rows']));
}

if ($action === 'rename' || $action === 'forget') {
    $lk = @fopen($HOF_LOCK, 'c'); if ($lk) @flock($lk, LOCK_EX);
    $all = hof_load($HOF_STORE);
    $known = isset($all['players'][$P['id']]) && $all['players'][$P['id']]['kh'] === $P['kh'];
    $res = array('ok' => true);
    if ($known && $action === 'forget') {
        unset($all['players'][$P['id']]);
        $id = $P['id'];
        $all['entries'] = array_values(array_filter($all['entries'], function ($e) use ($id) { return $e['p'] !== $id; }));
        hof_save($HOF_STORE, $all);
    } elseif ($known && $action === 'rename' && empty($all['players'][$P['id']]['member'])) {
        $ini = hof_ini(isset($in['ini']) ? $in['ini'] : ''); $town = isset($in['town']) && in_array($in['town'], $HOF_TOWNS, true) ? $in['town'] : '';
        if ($ini === '' || $town === '') $res = array('ok' => false, 'error' => $ini === '' ? 'ini' : 'town');
        else { $all['players'][$P['id']]['ini'] = $ini; $all['players'][$P['id']]['town'] = $town; hof_save($HOF_STORE, $all); }
    }
    if ($lk) { @flock($lk, LOCK_UN); @fclose($lk); }
    hof_out($res);
}

hof_out(array('ok' => false, 'error' => 'action'), 400);
