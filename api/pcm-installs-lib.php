<?php
/*
 * 365 PC Manager installs - counted from the app's own check-ins. 1 Oct 2026.
 *
 * WHY. Every copy of the app checks in when it starts and every hour after (pcm.php action=checkin), linked to us
 * or not - it is how it learns about updates. The server used to answer a keyless check-in and keep nothing, so
 * nobody could say how many people were actually using the free app. This counts them.
 *
 * WHAT IS KEPT, per install (api/pcm-installs.json - gitignored, .htaccess-denied):
 *   an id (a one-way hash of the app's own anonymous machine id), the day first and last seen, the app version,
 *   Windows 10 or not, the country (worked out from the internet address at that moment; the address itself is
 *   never kept), and whether the PC is linked to a customer record and whether that record is on a plan.
 * No computer name, no address, no health details - those stay where they always were, for linked PCs only.
 * Written at most once a day per install (a new day, a new version, or linking/plan changed), under a lock.
 *
 * 7 Oct 2026 (owner: "yes add it"), after the first week's figures were inflated by copies that ran once - antivirus
 * firms' test machines, people who tried it and left - and by our own PCs:
 *   STILL USING IT = used on two or more different days AND seen in the last week (8 Oct 2026: before that it was only
 *   "two different days", which kept counting copies that had stopped). STOPPED = used on two or more days, not this
 *   week. USED ON 3+ DAYS = still using it, on three or more different days ('n', counted from 8 Oct 2026). RAN ONCE =
 *   seen on one day only, at least two days ago. TOO SOON TO TELL = first seen in the last two days and not again yet.
 *   OUR OWN PCs: staff press "these PCs are ours" in the portal on the internet connection their own PCs use; the
 *   connection is kept only as a salted one-way hash (never the address), and from then on any PC checking in over it is
 *   flagged 'o' and left out of every figure (counted on its own). The flag is re-decided every day, so a customer's PC
 *   on our bench drops back in once it is home. A connection nobody re-confirms for INST_OURS_DAYS stops counting.
 *
 * Include-only (.htaccess denies it as a URL). NO closing tag in this file.
 */
require_once __DIR__ . '/pcm-geoip-lib.php';

function inst_file() { return isset($GLOBALS['PCM_INSTALLS_FILE']) ? $GLOBALS['PCM_INSTALLS_FILE'] : __DIR__ . '/pcm-installs.json'; }
if (!defined('INST_OURS_DAYS')) define('INST_OURS_DAYS', 60);

// ---- our own PCs (7 Oct 2026) ----
// The connection an address belongs to: an IPv4 address as it is, an IPv6 address by its /64 (each device on a home
// network has its own IPv6 address inside the household's /64). '' for nonsense.
function inst_net($ip) {
    $bin = @inet_pton(trim((string)$ip));
    if ($bin === false || $bin === null) return '';
    if (strlen($bin) === 16 && substr($bin, 0, 12) === str_repeat("\0", 10) . "\xff\xff") $bin = substr($bin, 12);
    return strlen($bin) === 4 ? inet_ntop($bin) : bin2hex(substr($bin, 0, 8)) . '::/64';
}
function inst_ours_key($d, $ip) {
    $net = inst_net($ip);
    if ($net === '' || !is_array($d) || empty($d['salt'])) return '';
    return substr(sha1('365ours|' . $d['salt'] . '|' . $net), 0, 16);
}
// Is this address one of the connections staff marked as ours (and re-confirmed in the last INST_OURS_DAYS)?
function inst_is_ours($d, $ip, $now = null) {
    $now = $now === null ? time() : (int)$now;
    $k = inst_ours_key($d, $ip);
    return $k !== '' && isset($d['ours'][$k]) && (int)(isset($d['ours'][$k]['at']) ? $d['ours'][$k]['at'] : 0) >= $now - INST_OURS_DAYS * 86400;
}
// Staff mark ($on true) or unmark the connection they are on. 'touch' only re-confirms one already marked (when the card
// is opened from it, at most once a day). Returns true when the store was written.
function inst_mark_ours($ip, $by, $on, $now = null, $touch = false) {
    $now = $now === null ? time() : (int)$now;
    if (inst_net($ip) === '') return false;
    $file = inst_file();
    $lk = @fopen($file . '.lock', 'c');
    if (!$lk) return false;
    if (!@flock($lk, LOCK_EX)) { fclose($lk); return false; }
    $ok = false;
    try {
        $raw = @file_get_contents($file);
        $d = ($raw === false || $raw === '') ? array('v' => 1, 'since' => gmdate('Y-m-d', $now), 'm' => array()) : json_decode($raw, true);
        if (!is_array($d) || !isset($d['m']) || !is_array($d['m'])) return false;   // an unreadable store is never overwritten
        if (empty($d['salt'])) { if ($touch || !$on) return false; $d['salt'] = bin2hex(random_bytes(8)); }
        if (!isset($d['ours']) || !is_array($d['ours'])) $d['ours'] = array();
        $k = inst_ours_key($d, $ip);
        foreach ($d['ours'] as $x => $o) if ((int)(isset($o['at']) ? $o['at'] : 0) < $now - INST_OURS_DAYS * 86400) unset($d['ours'][$x]);
        if ($touch) {
            if (!isset($d['ours'][$k]) || (int)$d['ours'][$k]['at'] > $now - 86400) return false;
            $d['ours'][$k]['at'] = $now;
        } elseif ($on) {
            $d['ours'][$k] = array('at' => $now, 'by' => function_exists('mb_substr') ? mb_substr((string)$by, 0, 30) : substr((string)$by, 0, 30), 'since' => isset($d['ours'][$k]['since']) ? $d['ours'][$k]['since'] : $now);
        } else {
            if (!isset($d['ours'][$k])) return false;
            unset($d['ours'][$k]);
        }
        $tmp = $file . '.' . getmypid() . '.tmp';
        $ok = @file_put_contents($tmp, json_encode($d)) !== false;
        if ($ok) { $ok = @rename($tmp, $file); if (!$ok && DIRECTORY_SEPARATOR === '\\') { @unlink($file); $ok = @rename($tmp, $file); } }
        if (!$ok) @unlink($tmp);
    } finally {
        @flock($lk, LOCK_UN); fclose($lk);
    }
    return $ok;
}
// For the card: how many connections are marked, and whether (and by whom) the one the caller is on is.
function inst_ours_info($d, $ip, $now = null) {
    $now = $now === null ? time() : (int)$now;
    $n = 0; foreach ((isset($d['ours']) && is_array($d['ours'])) ? $d['ours'] : array() as $o) if ((int)(isset($o['at']) ? $o['at'] : 0) >= $now - INST_OURS_DAYS * 86400) $n++;
    $k = inst_ours_key($d, $ip); $here = inst_is_ours($d, $ip, $now) ? $d['ours'][$k] : null;
    return array('nets' => $n, 'here' => $here !== null, 'hereBy' => $here ? (string)(isset($here['by']) ? $here['by'] : '') : '', 'hereSince' => $here ? gmdate('Y-m-d', (int)(isset($here['since']) ? $here['since'] : $here['at'])) : '');
}

// $machine: the app's id; $ver: its build number; $w10: true on Windows 10; $linked: the key is a customer record;
// $plan: that record is on a plan ('pro'); $ip: the caller's address (for the country only). Returns 'new' | 'updated' |
// 'same' | 'busy' | ''.
function inst_note($machine, $ver, $w10, $linked, $plan, $ip, $now = null) {
    $machine = preg_replace('/[^a-f0-9]/', '', strtolower((string)$machine));
    if (strlen($machine) < 8) return '';
    $now = $now === null ? time() : (int)$now;
    $day = gmdate('Y-m-d', $now);
    $id = substr(sha1('365inst|' . $machine), 0, 16);
    $ver = max(0, min(9999, (int)$ver));
    $row = array('v' => $ver, 'w' => $w10 ? 1 : 0, 'k' => $linked ? 1 : 0, 'p' => $plan ? 1 : 0);
    $file = inst_file();
    // the common case - already noted today with the same facts - costs one read and no lock
    $cur = @json_decode((string)@file_get_contents($file), true);
    $row['o'] = (is_array($cur) && inst_is_ours($cur, $ip, $now)) ? 1 : 0;   // checking in over one of our own connections
    if (is_array($cur) && isset($cur['m'][$id])) {
        $e = $cur['m'][$id];
        if ((string)(isset($e['l']) ? $e['l'] : '') === $day && (int)$e['v'] === $ver && (int)$e['w'] === $row['w'] && (int)$e['k'] === $row['k'] && (int)$e['p'] === $row['p']
            && (int)(isset($e['o']) ? $e['o'] : 0) === $row['o']) return 'same';
    }
    $lk = @fopen($file . '.lock', 'c');
    if (!$lk) return '';
    if (!@flock($lk, LOCK_EX | LOCK_NB)) { fclose($lk); return 'busy'; }   // next check-in, an hour on, tries again
    $what = '';
    try {
        $d = @json_decode((string)@file_get_contents($file), true);
        if (!is_array($d) || !isset($d['m']) || !is_array($d['m'])) $d = array('v' => 1, 'since' => $day, 'm' => array());
        $row['o'] = inst_is_ours($d, $ip, $now) ? 1 : 0;
        if (isset($d['m'][$id])) {
            $e = $d['m'][$id];
            $cc = (string)(isset($e['c']) ? $e['c'] : '');
            if ($cc === '' || (string)$e['l'] !== $day) { $g = geo_cc($ip); if ($g !== '') $cc = $g; }   // a move abroad shows up the next day
            // n = how many different days it has been used (8 Oct 2026); copies noted before then start from what first/last say
            $n = isset($e['n']) ? (int)$e['n'] : ((string)$e['l'] > (string)$e['f'] ? 2 : 1);
            if ((string)$e['l'] !== $day) $n++;
            $d['m'][$id] = array_merge($e, $row, array('l' => $day, 'c' => $cc, 'n' => $n));
            $what = 'updated';
        } else {
            $d['m'][$id] = array_merge($row, array('f' => $day, 'l' => $day, 'c' => geo_cc($ip), 'n' => 1));
            $what = 'new';
        }
        // an install not seen for a year is gone for good
        $cut = gmdate('Y-m-d', $now - 365 * 86400);
        foreach ($d['m'] as $k => $e) if ((string)(isset($e['l']) ? $e['l'] : '') < $cut) unset($d['m'][$k]);
        $tmp = $file . '.' . getmypid() . '.tmp';
        $ok = @file_put_contents($tmp, json_encode($d)) !== false;
        if ($ok) { $ok = @rename($tmp, $file); if (!$ok && DIRECTORY_SEPARATOR === '\\') { @unlink($file); $ok = @rename($tmp, $file); } }
        if (!$ok) { @unlink($tmp); $what = ''; }
    } finally {
        @flock($lk, LOCK_UN); fclose($lk);
    }
    return $what;
}

/* 9 Oct 2026: each install in the group, for the portal's list (who gets a free month). Newest seen first, then most days
   used; up to $max. how: using (2+ days, seen this week) | stopped (2+ days, not this week) | once | soon. $trials: install
   id => its free month (plus_trial_states). Never an address or a name - there are none. */
function inst_rows(array $d, $who, array $trials = array(), $now = null, $max = 400) {
    $now = $now === null ? time() : (int)$now;
    $d7 = gmdate('Y-m-d', $now - 6 * 86400); $d2 = gmdate('Y-m-d', $now - 2 * 86400);
    $rows = array();
    foreach ((isset($d['m']) && is_array($d['m'])) ? $d['m'] : array() as $id => $e) {
        if (!is_array($e) || !empty($e['o'])) continue;
        $p = !empty($e['p']); $k = !empty($e['k']);
        if ($who === 'free' && $p) continue;
        if ($who === 'unlinked' && ($k || $p)) continue;
        if ($who === 'plan' && !$p) continue;
        $f = (string)(isset($e['f']) ? $e['f'] : ''); $l = (string)(isset($e['l']) ? $e['l'] : '');
        $multi = $l > $f; $days = isset($e['n']) ? (int)$e['n'] : ($multi ? 2 : 1);
        $how = $multi ? ($l >= $d7 ? 'using' : 'stopped') : ($f <= $d2 ? 'once' : 'soon');
        $v = (int)(isset($e['v']) ? $e['v'] : 0);
        $rows[] = array('id' => (string)$id, 'c' => (string)(isset($e['c']) ? $e['c'] : ''), 'v' => $v, 'vn' => function_exists('pcm_vname') ? pcm_vname($v) : (string)$v,
            'w' => !empty($e['w']), 'f' => $f, 'l' => $l, 'n' => $days, 'how' => $how, 'k' => $k, 'p' => $p,
            'trial' => isset($trials[$id]) ? $trials[$id] : null);
    }
    usort($rows, function ($a, $b) { $c = strcmp($b['l'], $a['l']); return $c !== 0 ? $c : $b['n'] - $a['n']; });
    return array_slice($rows, 0, $max);
}

/* What the staff portal shows. $who: 'free' (not on a plan - linked or not; the default, as the owner asked),
   'unlinked' (never linked to us), 'plan' (on a plan) or 'all'. Active = seen in the last 7 / 30 days. */
function inst_stats(array $d, $who, $now = null) {
    $now = $now === null ? time() : (int)$now;
    $today = gmdate('Y-m-d', $now); $d7 = gmdate('Y-m-d', $now - 6 * 86400); $d30 = gmdate('Y-m-d', $now - 29 * 86400);
    $d2 = gmdate('Y-m-d', $now - 2 * 86400);   // a copy seen on one day only, at least two days ago, "ran once"
    $out = array('ok' => true, 'since' => (string)(isset($d['since']) ? $d['since'] : ''), 'who' => $who,
        'total' => 0, 'active7' => 0, 'active30' => 0, 'new7' => 0, 'new30' => 0, 'newToday' => 0,
        'kept' => 0, 'once' => 0, 'soon' => 0, 'ours' => 0, 'stopped' => 0, 'days3' => 0,
        'linked' => 0, 'plan' => 0, 'unlinked' => 0, 'w10' => 0,
        'countries' => array(), 'versions' => array(), 'daily' => array());
    $cc = array(); $vv = array(); $daily = array();
    for ($i = 29; $i >= 0; $i--) $daily[gmdate('Y-m-d', $now - $i * 86400)] = 0;
    foreach ((isset($d['m']) && is_array($d['m'])) ? $d['m'] : array() as $e) {
        if (!is_array($e)) continue;
        if (!empty($e['o'])) { $out['ours']++; continue; }   // our own PCs (7 Oct 2026): left out of every figure, counted here
        $p = !empty($e['p']); $k = !empty($e['k']);
        // the whole picture, before the filter
        if ($p) $out['plan']++; elseif ($k) $out['linked']++; else $out['unlinked']++;
        if ($who === 'free' && $p) continue;
        if ($who === 'unlinked' && ($k || $p)) continue;
        if ($who === 'plan' && !$p) continue;
        $f = (string)(isset($e['f']) ? $e['f'] : ''); $l = (string)(isset($e['l']) ? $e['l'] : '');
        $out['total']++;
        if ($l >= $d7) $out['active7']++;
        if ($l >= $d30) $out['active30']++;
        if ($f >= $d7) $out['new7']++;
        if ($f >= $d30) $out['new30']++;
        if ($f === $today) $out['newToday']++;
        // 8 Oct 2026: STILL USING IT = used on two or more different days AND seen in the last week; used on 2+ days but
        // not this week = STOPPED. USED ON 3+ DAYS (of those still using it) is the surest sign of a real person.
        $multi = $l > $f;
        $kept = $multi && $l >= $d7;
        $days = isset($e['n']) ? (int)$e['n'] : ($multi ? 2 : 1);
        if ($kept) { $out['kept']++; if ($days >= 3) $out['days3']++; }
        elseif ($multi) $out['stopped']++;
        elseif ($f <= $d2) $out['once']++; else $out['soon']++;
        if (!empty($e['w'])) $out['w10']++;
        if (isset($daily[$f])) $daily[$f]++;
        $c = (string)(isset($e['c']) ? $e['c'] : ''); $c = $c !== '' ? $c : '--';
        if (!isset($cc[$c])) $cc[$c] = array('n' => 0, 'a7' => 0, 'kept' => 0);
        $cc[$c]['n']++; if ($l >= $d7) $cc[$c]['a7']++; if ($kept) $cc[$c]['kept']++;
        $v = (int)(isset($e['v']) ? $e['v'] : 0); $vv[$v] = (isset($vv[$v]) ? $vv[$v] : 0) + 1;
    }
    uasort($cc, function ($a, $b) { return $b['n'] - $a['n']; });
    foreach (array_slice($cc, 0, 15, true) as $c => $x) $out['countries'][] = array('k' => (string)$c, 'n' => $x['n'], 'a7' => $x['a7'], 'kept' => $x['kept']);
    krsort($vv);
    foreach ($vv as $v => $n) $out['versions'][] = array('k' => $v, 'n' => $n, 'vn' => function_exists('pcm_vname') ? pcm_vname($v) : (string)$v);   // ("36.1" for build 37)
    foreach ($daily as $day => $n) $out['daily'][] = array('d' => $day, 'n' => $n);
    return $out;
}
