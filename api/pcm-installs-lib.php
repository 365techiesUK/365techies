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
 * Include-only (.htaccess denies it as a URL). NO closing tag in this file.
 */
require_once __DIR__ . '/pcm-geoip-lib.php';

function inst_file() { return isset($GLOBALS['PCM_INSTALLS_FILE']) ? $GLOBALS['PCM_INSTALLS_FILE'] : __DIR__ . '/pcm-installs.json'; }

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
    if (is_array($cur) && isset($cur['m'][$id])) {
        $e = $cur['m'][$id];
        if ((string)(isset($e['l']) ? $e['l'] : '') === $day && (int)$e['v'] === $ver && (int)$e['w'] === $row['w'] && (int)$e['k'] === $row['k'] && (int)$e['p'] === $row['p']) return 'same';
    }
    $lk = @fopen($file . '.lock', 'c');
    if (!$lk) return '';
    if (!@flock($lk, LOCK_EX | LOCK_NB)) { fclose($lk); return 'busy'; }   // next check-in, an hour on, tries again
    $what = '';
    try {
        $d = @json_decode((string)@file_get_contents($file), true);
        if (!is_array($d) || !isset($d['m']) || !is_array($d['m'])) $d = array('v' => 1, 'since' => $day, 'm' => array());
        if (isset($d['m'][$id])) {
            $e = $d['m'][$id];
            $cc = (string)(isset($e['c']) ? $e['c'] : '');
            if ($cc === '' || (string)$e['l'] !== $day) { $g = geo_cc($ip); if ($g !== '') $cc = $g; }   // a move abroad shows up the next day
            $d['m'][$id] = array_merge($e, $row, array('l' => $day, 'c' => $cc));
            $what = 'updated';
        } else {
            $d['m'][$id] = array_merge($row, array('f' => $day, 'l' => $day, 'c' => geo_cc($ip)));
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

/* What the staff portal shows. $who: 'free' (not on a plan - linked or not; the default, as the owner asked),
   'unlinked' (never linked to us), 'plan' (on a plan) or 'all'. Active = seen in the last 7 / 30 days. */
function inst_stats(array $d, $who, $now = null) {
    $now = $now === null ? time() : (int)$now;
    $today = gmdate('Y-m-d', $now); $d7 = gmdate('Y-m-d', $now - 6 * 86400); $d30 = gmdate('Y-m-d', $now - 29 * 86400);
    $out = array('ok' => true, 'since' => (string)(isset($d['since']) ? $d['since'] : ''), 'who' => $who,
        'total' => 0, 'active7' => 0, 'active30' => 0, 'new7' => 0, 'new30' => 0, 'newToday' => 0,
        'linked' => 0, 'plan' => 0, 'unlinked' => 0, 'w10' => 0,
        'countries' => array(), 'versions' => array(), 'daily' => array());
    $cc = array(); $vv = array(); $daily = array();
    for ($i = 29; $i >= 0; $i--) $daily[gmdate('Y-m-d', $now - $i * 86400)] = 0;
    foreach ((isset($d['m']) && is_array($d['m'])) ? $d['m'] : array() as $e) {
        if (!is_array($e)) continue;
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
        if (!empty($e['w'])) $out['w10']++;
        if (isset($daily[$f])) $daily[$f]++;
        $c = (string)(isset($e['c']) ? $e['c'] : ''); $c = $c !== '' ? $c : '--';
        if (!isset($cc[$c])) $cc[$c] = array('n' => 0, 'a7' => 0);
        $cc[$c]['n']++; if ($l >= $d7) $cc[$c]['a7']++;
        $v = (int)(isset($e['v']) ? $e['v'] : 0); $vv[$v] = (isset($vv[$v]) ? $vv[$v] : 0) + 1;
    }
    uasort($cc, function ($a, $b) { return $b['n'] - $a['n']; });
    foreach (array_slice($cc, 0, 15, true) as $c => $x) $out['countries'][] = array('k' => (string)$c, 'n' => $x['n'], 'a7' => $x['a7']);
    krsort($vv);
    foreach ($vv as $v => $n) $out['versions'][] = array('k' => $v, 'n' => $n);
    foreach ($daily as $day => $n) $out['daily'][] = array('d' => $day, 'n' => $n);
    return $out;
}
