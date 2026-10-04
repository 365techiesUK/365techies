<?php
/*
 * 365 Games Hall of Fame (4 Oct 2026). Owner: "high scores go into a Hall of Fame ... initials and where they are,
 * like Poole or Bournemouth"; picks: open to EVERYONE, a "365 member" badge for signed-in customers, initials + town
 * (never a full postcode), only with the player's own "show me" tick.
 *
 * Solitaire and FreeCell (4 Oct). Two races per game, both on deals that are the same for everyone, so they are fair:
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
 * The arcade games (Invaders, Bat & Ball, Eclipse; 4 Oct) can't be replayed here - they run 60 steps a second on live
 * keys - so a score is checked another way: the game asks for a one-off ticket when a game STARTS (action run; the
 * ticket holds only the game and the time), and the score must come back on that ticket, once, with no more play time
 * than has really passed and no more points than that game can score in that time. Boards: the highest score today /
 * this week / ever / in your town, at each speed.
 *
 * The card games against the computer (Hearts, Gin Rummy, Cribbage, Whist; 5 Oct): Today's match at each level, the same
 * cards for everyone. The server replays the WHOLE match from the player's own moves - the computer players' moves too,
 * with line-for-line copies of their play (games-he/gr/cr/wh-lib.php, each pinned to the browser by a parity test) - so
 * only a real win counts. Ranked by each game's own measure: Hearts the lowest winning score, Gin Rummy and Cribbage the
 * biggest winning margin, Whist the fewest hands to win the rubber.
 *
 * Actions (POST JSON): whoami, submit, board, rename, forget, run. Store: games-hof.json (denied in .htaccess), 2 years;
 * tickets: games-hof-runs.json, 12 hours.
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
// the card games with a Hall of Fame: how each one deals today's races and replays a game (the rules, copied from the
// browser line for line, in games-*-lib.php). One player - one set of initials and a town - across every game.
$HOF_GAMES = array(
    'solitaire' => array('lib' => 'games-sol-lib.php', 'replay' => 'sol_replay', 'daily' => 'sol_daily_seed', 'sprint' => 'sol_sprint_seed', 'count' => 'sol_found_count', 'sprintLv' => 1),
    'freecell'  => array('lib' => 'games-fc-lib.php',  'replay' => 'fc_replay',  'daily' => 'fc_daily_seed',  'sprint' => 'fc_sprint_seed',  'count' => 'fc_found_count',  'sprintLv' => 1),
    'spider'    => array('lib' => 'games-sp-lib.php',  'replay' => 'sp_replay',  'daily' => 'sp_daily_seed',  'sprint' => 'sp_sprint_seed',  'count' => 'sp_found_count',  'sprintLv' => 1),
    'tripeaks'  => array('lib' => 'games-tp-lib.php',  'replay' => 'tp_replay',  'daily' => 'tp_daily_seed',  'sprint' => 'tp_sprint_seed',  'count' => 'tp_found_count',  'sprintLv' => 1, 'minSecs' => 15, 'perMove' => 0.3),
    'pyramid'   => array('lib' => 'games-py-lib.php',  'replay' => 'py_replay',  'daily' => 'py_daily_seed',  'sprint' => 'py_sprint_seed',  'count' => 'py_found_count',  'sprintLv' => 1, 'minSecs' => 15, 'perMove' => 0.3),
);
// the card games against the computer: how a match is replayed, and how a win is measured (low: smaller is better)
$HOF_MATCH = array(
    'hearts'   => array('lib' => 'games-he-lib.php', 'replay' => 'he_replay', 'low' => true),
    'gin'      => array('lib' => 'games-gr-lib.php', 'replay' => 'gr_replay', 'low' => false),
    'cribbage' => array('lib' => 'games-cr-lib.php', 'replay' => 'cr_replay', 'low' => false),
    'whist'    => array('lib' => 'games-wh-lib.php', 'replay' => 'wh_replay', 'low' => true),
);
// the arcade games: their speeds (the game's own score slots, arcade.js skey) and the most points a second of play can
// bring, plus a margin - generous, so a great game is never refused; the ticket's clock is what really holds a score down
$HOF_ARCADE = array(
    'invaders' => array('lvs' => array('e1' => 'Gentle', 'e2' => 'Classic', 'e3' => 'Fast', 'v1' => 'Retro · Gentle', 'v2' => 'Retro · Classic', 'v3' => 'Retro · Fast'), 'rate' => 1000, 'base' => 5000, 'word' => 'wave'),
    'batball'  => array('lvs' => array('v1' => 'Gentle', 'v2' => 'Classic', 'v3' => 'Fast'), 'rate' => 1500, 'base' => 10000, 'word' => 'level'),
    // (the 3D Eclipse of 4 Oct: an invincible bot that takes every medal and power item scores ~15,500 a second over two loops)
    'eclipse'  => array('lvs' => array('v1' => 'Gentle', 'v2' => 'Classic', 'v3' => 'Fast'), 'rate' => 30000, 'base' => 100000, 'word' => 'stage'),
    // (365 Coast Run, 5 Oct: a driver that gets round scores ~2,000-2,700 a second, plus up to ~450,000 at each goal; the third round on is capped)
    'coastrun' => array('lvs' => array('v1' => 'Gentle', 'v2' => 'Classic', 'v3' => 'Fast'), 'rate' => 8000, 'base' => 500000, 'word' => 'stage'),
);
$HOF_RUNS = __DIR__ . '/games-hof-runs.json';
$HOF_RUNLOCK = __DIR__ . '/games-hof-runs.lock';

function hof_out($a, $code = 200) { http_response_code($code); echo json_encode($a, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') hof_out(array('ok' => false, 'error' => 'method'), 405);
$src = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : (isset($_SERVER['HTTP_REFERER']) ? $_SERVER['HTTP_REFERER'] : '');
if ($src !== '' && strpos($src, '365techies.co.uk') === false && !preg_match('#^https?://(localhost|127\.0\.0\.1)(:\d+)?(/|$)#', $src)) hof_out(array('ok' => false, 'error' => 'origin'), 403);
$in = json_decode((string)file_get_contents('php://input', false, null, 0, 65536), true);
if (!is_array($in)) hof_out(array('ok' => false, 'error' => 'bad-input'), 400);
$action = isset($in['action']) ? preg_replace('/[^a-z]/', '', (string)$in['action']) : '';
$GAME = isset($in['game']) ? (string)$in['game'] : '';
$ARC = isset($HOF_ARCADE[$GAME]) ? $HOF_ARCADE[$GAME] : null;
$MATCH = isset($HOF_MATCH[$GAME]) ? $HOF_MATCH[$GAME] : null;
if (!isset($HOF_GAMES[$GAME]) && !$ARC && !$MATCH) hof_out(array('ok' => false, 'error' => 'game'), 400);
$G = $ARC || $MATCH ? null : $HOF_GAMES[$GAME];
if ($G) require_once __DIR__ . '/' . $G['lib'];
if ($MATCH) require_once __DIR__ . '/' . $MATCH['lib'];
// Today's match: one deal number for everyone today, at every level (games/common/rivals.js newGame('daily'))
function hof_match_seed($n) { return 900000 + (($n * 7919) % 90000 + 90000) % 90000; }
// a match win as shown on a board: Hearts "12 points", Gin Rummy / Cribbage "by 34", Whist "6 hands"
function hof_match_v($game, $e) {
    if ($game === 'hearts') return $e['pts'] . ($e['pts'] === 1 ? ' point' : ' points');
    if ($game === 'whist') return $e['pts'] . ' hands';
    return 'by ' . number_format($e['pts']);
}
function hof_day_number($ymd) {   // days since 1 Jan 2026 - the games' own day count (table.js dayNumber)
    if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', (string)$ymd, $m)) return null;
    return intdiv(gmmktime(0, 0, 0, (int)$m[2], (int)$m[3], (int)$m[1]) - gmmktime(0, 0, 0, 1, 1, 2026), 86400);
}
function hof_g($e) { return isset($e['g']) ? $e['g'] : 'solitaire'; }   // entries from before 4 Oct afternoon are Solitaire's

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
function hof_board($all, $board, $lv, $town, $me, $game) {
    global $HOF_MATCH;
    $M = isset($HOF_MATCH[$game]) ? $HOF_MATCH[$game] : null;   // a game against the computer: ranked by its own measure
    $today = date('Y-m-d'); $rows = array(); $byP = array();
    $pl = $all['players'];
    if ($board === 'week') {
        $week = date('o-W');
        foreach ($all['entries'] as $e) {
            if (hof_g($e) !== $game || $e['mode'] !== 'daily' || date('o-W', strtotime($e['day'] . ' 12:00')) !== $week || !isset($pl[$e['p']])) continue;
            if (!isset($byP[$e['p']])) $byP[$e['p']] = array('pts' => 0, 'wins' => 0);
            $byP[$e['p']]['pts'] += hof_points($e); $byP[$e['p']]['wins']++;
        }
        foreach ($byP as $p => $x) $rows[] = array('p' => $p, 'k1' => -$x['pts'], 'k2' => -$x['wins'], 'v' => number_format($x['pts']) . ' pts', 'sub' => $x['wins'] . ($x['wins'] === 1 ? ' deal won' : ' deals won'));
    } else {
        foreach ($all['entries'] as $e) {
            if (!isset($pl[$e['p']]) || hof_g($e) !== $game) continue;
            if ($board === 'sprint') { if ($e['mode'] !== 'sprint' || $e['day'] !== $today) continue; }
            else {
                if ($e['mode'] !== 'daily' || (int)$e['lv'] !== $lv) continue;
                if ($board !== 'alltime' && $e['day'] !== $today) continue;
                if ($board === 'town' && $pl[$e['p']]['town'] !== $town) continue;
            }
            $r = $M
                ? array('p' => $e['p'], 'k1' => $M['low'] ? $e['pts'] : -$e['pts'], 'k2' => $e['secs'], 'v' => hof_match_v($game, $e),
                    'sub' => hof_mmss($e['secs']) . ($game === 'hearts' || $game === 'gin' ? ' · ' . $e['hands'] . ' hands' : '') . ($board === 'alltime' ? ' · ' . date('j M Y', strtotime($e['day'] . ' 12:00')) : ''))
                : ($board === 'sprint'
                ? array('p' => $e['p'], 'k1' => -$e['cards'], 'k2' => $e['secs'], 'v' => $e['cards'] . ($e['cards'] === ($game === 'spider' ? 104 : ($game === 'tripeaks' || $game === 'pyramid' ? 28 : 52)) ? ' cards - all of them!' : ' cards'), 'sub' => hof_mmss($e['secs']))
                : array('p' => $e['p'], 'k1' => $e['secs'], 'k2' => $e['moves'], 'v' => hof_mmss($e['secs']), 'sub' => $e['moves'] . ' moves' . ($board === 'alltime' ? ' · ' . date('j M Y', strtotime($e['day'] . ' 12:00')) : '')));
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

// an arcade game's boards: the highest score (each player once, their best), today / this week / ever / today in a town
function hof_arcade_board($all, $board, $lk, $town, $me, $game, $word) {
    $today = date('Y-m-d'); $week = date('o-W'); $pl = $all['players']; $byP = array();
    foreach ($all['entries'] as $e) {
        if (!isset($pl[$e['p']]) || hof_g($e) !== $game || $e['mode'] !== 'score' || $e['lv'] !== $lk) continue;
        if (($board === 'today' || $board === 'town') && $e['day'] !== $today) continue;
        if ($board === 'week' && date('o-W', strtotime($e['day'] . ' 12:00')) !== $week) continue;
        if ($board === 'town' && $pl[$e['p']]['town'] !== $town) continue;
        $r = array('p' => $e['p'], 'k1' => -$e['score'], 'k2' => $e['t'], 'v' => number_format($e['score']),
            'sub' => $word . ' ' . $e['wave'] . ($board === 'alltime' || $board === 'week' ? ' · ' . date('j M' . ($board === 'alltime' ? ' Y' : ''), strtotime($e['day'] . ' 12:00')) : ''));
        if (!isset($byP[$e['p']]) || $r['k1'] < $byP[$e['p']]['k1'] || ($r['k1'] === $byP[$e['p']]['k1'] && $r['k2'] < $byP[$e['p']]['k2'])) $byP[$e['p']] = $r;
    }
    $rows = array_values($byP);
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
function hof_rate($file, $per = 60, $most = 5000) {
    $day = date('Y-m-d'); $ip = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '';
    $who = substr(hash('sha256', $ip . '|' . $day . '|365-hof'), 0, 16);
    $r = @json_decode((string)@file_get_contents($file), true);
    if (!is_array($r) || !isset($r['day']) || $r['day'] !== $day) $r = array('day' => $day, 'all' => 0, 'v' => array());
    $n = isset($r['v'][$who]) ? (int)$r['v'][$who] : 0;
    if ($n >= $per || (int)$r['all'] >= $most) return false;
    $r['v'][$who] = $n + 1; $r['all'] = (int)$r['all'] + 1;
    @file_put_contents($file, json_encode($r), LOCK_EX);
    return true;
}

$P = hof_player($in);
if ($ARC) { $lv = isset($in['lv']) && is_string($in['lv']) && isset($ARC['lvs'][$in['lv']]) ? $in['lv'] : key($ARC['lvs']); }   // an arcade speed, e.g. 'v2'
else { $lv = isset($in['lv']) ? (int)$in['lv'] : 1; if (!isset($LV_NAME[$lv])) $lv = 1; }

// ---- an arcade game starting: a one-off ticket (the game and the time - nothing about the player)
if ($action === 'run') {
    if (!$ARC) hof_out(array('ok' => false, 'error' => 'game'), 400);
    if (!hof_rate(__DIR__ . '/games-hof-runrate.json', 600, 40000)) hof_out(array('ok' => false, 'error' => 'rate'), 429);
    $id = bin2hex(random_bytes(12));
    $lk = @fopen($HOF_RUNLOCK, 'c'); if ($lk) @flock($lk, LOCK_EX);
    $runs = @json_decode((string)@file_get_contents($HOF_RUNS), true); if (!is_array($runs)) $runs = array();
    $cut = time() - 12 * 3600;
    foreach ($runs as $k => $r) if ((int)$r[1] < $cut) unset($runs[$k]);
    if (count($runs) > 4000) $runs = array_slice($runs, -4000, null, true);
    $runs[$id] = array($GAME, time());
    @file_put_contents($HOF_RUNS, json_encode($runs));
    if ($lk) { @flock($lk, LOCK_UN); @fclose($lk); }
    hof_out(array('ok' => true, 'run' => $id));
}

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
    $b = $ARC ? hof_arcade_board($all, $board === 'sprint' ? 'today' : $board, $lv, $town, $me, $GAME, $ARC['word']) : hof_board($all, $board, $lv, $town, $me, $GAME);
    hof_out(array('ok' => true, 'board' => $board, 'lv' => $lv, 'town' => $town, 'today' => date('Y-m-d')) + $b);
}

if ($action === 'submit' || $action === 'rename' || $action === 'forget') {
    if (!$P) hof_out(array('ok' => false, 'error' => 'player'), 400);
    if (!hof_rate($HOF_RATE)) hof_out(array('ok' => false, 'error' => 'rate'), 429);
}

// who a submitted score belongs to on the board: a signed-in customer's own initials and town, or what they typed
function hof_who($in, $towns) {
    $mem = hof_member($in, $towns);
    if ($mem && $mem['ini'] !== '') return array($mem['ini'], $mem['town'] !== '' ? $mem['town'] : (isset($in['town']) && in_array($in['town'], $towns, true) ? $in['town'] : 'Elsewhere in the UK'), true);
    $ini = hof_ini(isset($in['ini']) ? $in['ini'] : '');
    $town = isset($in['town']) && in_array($in['town'], $towns, true) ? $in['town'] : '';
    if ($ini === '') hof_out(array('ok' => false, 'error' => 'ini'), 400);
    if ($town === '') hof_out(array('ok' => false, 'error' => 'town'), 400);
    return array($ini, $town, false);
}

if ($action === 'submit' && $ARC) {
    $score = isset($in['score']) ? (int)$in['score'] : 0; $wave = isset($in['wave']) ? (int)$in['wave'] : 0; $secs = isset($in['secs']) ? (int)$in['secs'] : 0;
    $run = isset($in['run']) ? preg_replace('/[^a-f0-9]/', '', (string)$in['run']) : '';
    // the ticket: this game's, not used before, and the play time no longer than the time that has really passed since
    $lk = @fopen($HOF_RUNLOCK, 'c'); if ($lk) @flock($lk, LOCK_EX);
    $runs = @json_decode((string)@file_get_contents($HOF_RUNS), true); if (!is_array($runs)) $runs = array();
    $t = $run !== '' && isset($runs[$run]) && $runs[$run][0] === $GAME ? (int)$runs[$run][1] : 0;
    if ($t) { unset($runs[$run]); @file_put_contents($HOF_RUNS, json_encode($runs)); }
    if ($lk) { @flock($lk, LOCK_UN); @fclose($lk); }
    if (!$t) hof_out(array('ok' => false, 'error' => 'run'), 400);
    if ($score < 1 || $wave < 1 || $secs < 3 || $secs > time() - $t + 10 || $secs > 6 * 3600) hof_out(array('ok' => false, 'error' => 'time'), 400);
    if ($score > $ARC['rate'] * $secs + $ARC['base'] || $wave > intdiv($secs, 2) + 5) hof_out(array('ok' => false, 'error' => 'time'), 400);
    list($ini, $town, $isMem) = hof_who($in, $HOF_TOWNS);
    $day = date('Y-m-d');
    $lk = @fopen($HOF_LOCK, 'c'); if ($lk) @flock($lk, LOCK_EX);
    $all = hof_load($HOF_STORE);
    if (isset($all['players'][$P['id']]) && $all['players'][$P['id']]['kh'] !== $P['kh']) { if ($lk) { @flock($lk, LOCK_UN); @fclose($lk); } hof_out(array('ok' => false, 'error' => 'player'), 403); }
    $all['players'][$P['id']] = array('kh' => $P['kh'], 'ini' => $ini, 'town' => $town, 'member' => $isMem, 't' => time());
    $cut = time() - $HOF_KEEP;
    $all['entries'] = array_values(array_filter($all['entries'], function ($e) use ($cut) { return (int)$e['t'] >= $cut; }));
    $new = array('p' => $P['id'], 'g' => $GAME, 'mode' => 'score', 'lv' => $lv, 'day' => $day, 'score' => $score, 'wave' => $wave, 'secs' => $secs, 't' => time());
    $improved = true; $found = false;
    foreach ($all['entries'] as $i => $e) {   // one entry a day for each player at each speed: their best
        if ($e['p'] !== $P['id'] || hof_g($e) !== $GAME || $e['mode'] !== 'score' || $e['lv'] !== $lv || $e['day'] !== $day) continue;
        $found = true;
        if ($score > $e['score']) $all['entries'][$i] = $new; else $improved = false;
    }
    if (!$found) $all['entries'][] = $new;
    if (count($all['entries']) > 60000) $all['entries'] = array_slice($all['entries'], -60000);
    $ok = hof_save($HOF_STORE, $all);
    if ($lk) { @flock($lk, LOCK_UN); @fclose($lk); }
    if (!$ok) hof_out(array('ok' => false, 'error' => 'store'), 500);
    $b = hof_arcade_board($all, 'today', $lv, '', $P['id'], $GAME, $ARC['word']);
    $tb = hof_arcade_board($all, 'town', $lv, $town, $P['id'], $GAME, $ARC['word']);
    $ab = hof_arcade_board($all, 'alltime', $lv, '', $P['id'], $GAME, $ARC['word']);
    hof_out(array('ok' => true, 'improved' => $improved, 'ini' => $ini, 'town' => $town, 'member' => $isMem, 'rank' => $b['mine'] ? $b['mine']['rank'] : null, 'count' => $b['count'],
        'townRank' => $tb['mine'] ? $tb['mine']['rank'] : null, 'townCount' => $tb['count'], 'everRank' => $ab['mine'] ? $ab['mine']['rank'] : null, 'everCount' => $ab['count']));
}

if ($action === 'submit' && $MATCH) {   // a win of Today's match, replayed in full - the computer players' moves too
    $day = isset($in['day']) ? (string)$in['day'] : '';
    $n = hof_day_number($day); $todayN = hof_day_number(date('Y-m-d'));
    if ($n === null || abs($n - $todayN) > 1) hof_out(array('ok' => false, 'error' => 'day'), 400);
    $log = isset($in['log']) && is_array($in['log']) ? array_slice($in['log'], 0, 2001) : array();
    if (count($log) < 5 || count($log) > 2000) hof_out(array('ok' => false, 'error' => 'replay'), 400);
    @set_time_limit(60);
    $r = call_user_func($MATCH['replay'], hof_match_seed($n), $lv, $log);
    if ($r === null) hof_out(array('ok' => false, 'error' => 'replay'), 400);
    if (!$r['won']) hof_out(array('ok' => false, 'error' => 'not-won'), 400);
    // no quicker than it can be played: every computer move waits at least a fifth of a second, every move of yours a third
    $secs = isset($in['secs']) ? (int)$in['secs'] : 0;
    $floor = max(30, (int)ceil($r['auto'] * 0.2 + $r['human'] * 0.35));
    if ($secs < $floor || $secs > 6 * 3600) hof_out(array('ok' => false, 'error' => 'time'), 400);
    list($ini, $town, $isMem) = hof_who($in, $HOF_TOWNS);
    $pts = (int)$r['pts'];
    $lk = @fopen($HOF_LOCK, 'c'); if ($lk) @flock($lk, LOCK_EX);
    $all = hof_load($HOF_STORE);
    if (isset($all['players'][$P['id']]) && $all['players'][$P['id']]['kh'] !== $P['kh']) { if ($lk) { @flock($lk, LOCK_UN); @fclose($lk); } hof_out(array('ok' => false, 'error' => 'player'), 403); }
    $all['players'][$P['id']] = array('kh' => $P['kh'], 'ini' => $ini, 'town' => $town, 'member' => $isMem, 't' => time());
    $cut = time() - $HOF_KEEP;
    $all['entries'] = array_values(array_filter($all['entries'], function ($e) use ($cut) { return (int)$e['t'] >= $cut; }));
    $new = array('p' => $P['id'], 'g' => $GAME, 'mode' => 'daily', 'lv' => $lv, 'day' => $day, 'secs' => $secs, 'moves' => $r['human'], 'pts' => $pts, 'hands' => $r['hands'], 't' => time());
    $improved = true; $found = false;
    foreach ($all['entries'] as $i => $e) {   // one entry a day for each player at each level: their best
        if ($e['p'] !== $P['id'] || hof_g($e) !== $GAME || $e['mode'] !== 'daily' || (int)$e['lv'] !== $lv || $e['day'] !== $day) continue;
        $found = true;
        $better = $MATCH['low'] ? ($pts < $e['pts'] || ($pts === $e['pts'] && $secs < $e['secs'])) : ($pts > $e['pts'] || ($pts === $e['pts'] && $secs < $e['secs']));
        if ($better) $all['entries'][$i] = $new; else $improved = false;
    }
    if (!$found) $all['entries'][] = $new;
    if (count($all['entries']) > 60000) $all['entries'] = array_slice($all['entries'], -60000);
    $ok = hof_save($HOF_STORE, $all);
    if ($lk) { @flock($lk, LOCK_UN); @fclose($lk); }
    if (!$ok) hof_out(array('ok' => false, 'error' => 'store'), 500);
    $b = hof_board($all, 'today', $lv, '', $P['id'], $GAME);
    $t = hof_board($all, 'town', $lv, $town, $P['id'], $GAME);
    hof_out(array('ok' => true, 'improved' => $improved, 'ini' => $ini, 'town' => $town, 'member' => $isMem, 'rank' => $b['mine'] ? $b['mine']['rank'] : null, 'count' => $b['count'],
        'townRank' => $t['mine'] ? $t['mine']['rank'] : null, 'townCount' => $t['count'], 'v' => hof_match_v($GAME, $new)) + array('rows' => $b['rows']));
}

if ($action === 'submit') {
    $mode = isset($in['mode']) && $in['mode'] === 'sprint' ? 'sprint' : 'daily';
    if ($mode === 'sprint') $lv = $G['sprintLv'];
    $day = isset($in['day']) ? (string)$in['day'] : '';
    $n = hof_day_number($day); $todayN = hof_day_number(date('Y-m-d'));
    if ($n === null || abs($n - $todayN) > 1) hof_out(array('ok' => false, 'error' => 'day'), 400);   // the player's own calendar day, give or take one
    $seed = $mode === 'sprint' ? call_user_func($G['sprint'], $n) : call_user_func($G['daily'], $n, $lv);
    $log = isset($in['log']) && is_array($in['log']) ? $in['log'] : array();
    $s = call_user_func($G['replay'], $seed, $lv, $log);
    if ($s === null) hof_out(array('ok' => false, 'error' => 'replay'), 400);
    $secs = isset($in['secs']) ? (int)$in['secs'] : 0; $moves = count($log); $cards = call_user_func($G['count'], $s);
    if ($mode === 'daily') {
        if (!$s['won']) hof_out(array('ok' => false, 'error' => 'not-won'), 400);
        // no quicker than a person could do it: 25 seconds (TriPeaks and Pyramid, short games: 15) or 0.2 s a move (0.3)
        $floor = max(isset($G['minSecs']) ? $G['minSecs'] : 25, (int)ceil($moves * (isset($G['perMove']) ? $G['perMove'] : 0.2)));
        if ($secs < $floor || $secs > 4 * 3600) hof_out(array('ok' => false, 'error' => 'time'), 400);
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
    $new = array('p' => $P['id'], 'g' => $GAME, 'mode' => $mode, 'lv' => $lv, 'day' => $day, 'secs' => $secs, 'moves' => $moves, 'cards' => $cards, 't' => time());
    $improved = true; $found = false;
    foreach ($all['entries'] as $i => $e) {
        if ($e['p'] !== $P['id'] || hof_g($e) !== $GAME || $e['mode'] !== $mode || (int)$e['lv'] !== $lv || $e['day'] !== $day) continue;
        $found = true;
        $better = $mode === 'sprint' ? ($cards > $e['cards'] || ($cards === $e['cards'] && $secs < $e['secs'])) : ($secs < $e['secs'] || ($secs === $e['secs'] && $moves < $e['moves']));
        if ($better) $all['entries'][$i] = $new; else $improved = false;
    }
    if (!$found) $all['entries'][] = $new;
    if (count($all['entries']) > 60000) $all['entries'] = array_slice($all['entries'], -60000);
    $ok = hof_save($HOF_STORE, $all);
    if ($lk) { @flock($lk, LOCK_UN); @fclose($lk); }
    if (!$ok) hof_out(array('ok' => false, 'error' => 'store'), 500);
    $b = hof_board($all, $mode === 'sprint' ? 'sprint' : 'today', $lv, '', $P['id'], $GAME);
    $t = $mode === 'daily' ? hof_board($all, 'town', $lv, $town, $P['id'], $GAME) : null;
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
