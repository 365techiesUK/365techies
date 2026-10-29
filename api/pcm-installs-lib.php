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

// ---- one PC, two copies (29 Oct 2026) ----
// Owner: the "not on a plan" figure went 183, 184, 183 all day. The app's sign-in (licence.txt) is kept per Windows user,
// but the install id is per PC, so a plan customer's PC where someone else - another Windows login - also runs PC
// Manager, not signed in, flipped between "on a plan" and "not on a plan" at every check-in. Each person is their own
// plan (owner), so staff want to SEE those PCs, not have them bounce. Now a check-in with NO key never undoes a keyed one
// from the last INST_KEY_DAYS: the row keeps the signed-in copy's facts, and the other copy is noted - x (the last day it
// checked in) and xv (its build). A KEYED check-in is always believed, so a plan that ends shows at once. ka = the last
// day a keyed check-in came (rows from before this start from their last day seen if they were linked).
if (!defined('INST_KEY_DAYS')) define('INST_KEY_DAYS', 14);
function inst_merge($e, array $row, $day, $now) {
    if (!is_array($e)) return array_merge($row, array('ka' => $row['k'] ? $day : ''));
    $ka = isset($e['ka']) ? (string)$e['ka'] : ((!empty($e['k']) || !empty($e['p'])) ? (string)(isset($e['l']) ? $e['l'] : '') : '');
    $keep = array();
    foreach (array('x', 'xv') as $f) if (isset($e[$f])) $keep[$f] = $e[$f];
    if ($row['k']) return array_merge($row, $keep, array('ka' => $day));
    if ($ka !== '' && $ka >= gmdate('Y-m-d', $now - INST_KEY_DAYS * 86400))
        return array('v' => (int)(isset($e['v']) ? $e['v'] : 0), 'w' => (int)(isset($e['w']) ? $e['w'] : 0), 'k' => (int)(isset($e['k']) ? $e['k'] : 0),
            'p' => (int)(isset($e['p']) ? $e['p'] : 0), 'o' => $row['o'], 'ka' => $ka, 'x' => $day, 'xv' => $row['v']);
    return array_merge($row, $keep, array('ka' => $ka));
}
// true when the stored row already says everything this check-in would write today
function inst_unchanged($e, array $m, $day) {
    if ((string)(isset($e['l']) ? $e['l'] : '') !== $day) return false;
    foreach (array('v', 'w', 'k', 'p', 'o', 'xv') as $f) if ((int)(isset($e[$f]) ? $e[$f] : 0) !== (int)(isset($m[$f]) ? $m[$f] : 0)) return false;
    foreach (array('ka', 'x') as $f) if ((string)(isset($e[$f]) ? $e[$f] : '') !== (string)(isset($m[$f]) ? $m[$f] : '')) return false;
    return true;
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
    if (is_array($cur) && isset($cur['m'][$id]) && is_array($cur['m'][$id])
        && inst_unchanged($cur['m'][$id], inst_merge($cur['m'][$id], $row, $day, $now), $day)) return 'same';
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
            $d['m'][$id] = array_merge($e, inst_merge($e, $row, $day, $now), array('l' => $day, 'c' => $cc, 'n' => $n));
            $what = 'updated';
        } else {
            $d['m'][$id] = array_merge(inst_merge(null, $row, $day, $now), array('f' => $day, 'l' => $day, 'c' => geo_cc($ip), 'n' => 1));
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
            'x' => (string)(isset($e['x']) ? $e['x'] : ''),   // 29 Oct 2026: last day a second copy, not signed in, checked in
            'trial' => isset($trials[$id]) ? $trials[$id] : null);
    }
    usort($rows, function ($a, $b) { $c = strcmp($b['l'], $a['l']); return $c !== 0 ? $c : $b['n'] - $a['n']; });
    return array_slice($rows, 0, $max);
}

/* 29 Oct 2026 (owner: "she's only paying for one ... he hasn't got a booking email"): the PCs linked to a customer where
   someone else also runs PC Manager, not signed in - another Windows login (each person is their own plan) - seen in the
   last 7 days. Named from the customer records ($db = pcm-data.json, read by the caller; staff-only): the customer, the
   PC's name, whether they're on a plan, the day the other copy last checked in and its version. Newest first. */
function inst_extra_people(array $d, $db, $now = null) {
    $now = $now === null ? time() : (int)$now;
    $d7 = gmdate('Y-m-d', $now - 6 * 86400);
    $want = array();
    foreach ((isset($d['m']) && is_array($d['m'])) ? $d['m'] : array() as $id => $e) {
        if (!is_array($e) || !empty($e['o']) || (empty($e['k']) && empty($e['p']))) continue;
        if ((string)(isset($e['x']) ? $e['x'] : '') >= $d7) $want[(string)$id] = $e;
    }
    if (!$want) return array();
    $names = array();
    foreach ((is_array($db) && isset($db['customers']) && is_array($db['customers'])) ? $db['customers'] : array() as $c) {
        if (!is_array($c) || !isset($c['machines']) || !is_array($c['machines'])) continue;
        foreach ($c['machines'] as $mid => $m) {
            $iid = substr(sha1('365inst|' . preg_replace('/[^a-f0-9]/', '', strtolower((string)$mid))), 0, 16);
            if (isset($want[$iid]) && !isset($names[$iid]))
                $names[$iid] = array('cust' => (string)(isset($c['name']) ? $c['name'] : ''), 'pc' => (string)(is_array($m) && isset($m['name']) ? $m['name'] : ''));
        }
    }
    $out = array();
    foreach ($want as $id => $e) {
        $v = (int)(isset($e['v']) ? $e['v'] : 0); $xv = (int)(isset($e['xv']) ? $e['xv'] : 0);
        $out[] = array('id' => $id, 'cust' => isset($names[$id]) ? $names[$id]['cust'] : '', 'pc' => isset($names[$id]) ? $names[$id]['pc'] : '',
            'plan' => !empty($e['p']), 'x' => (string)$e['x'], 'c' => (string)(isset($e['c']) ? $e['c'] : ''),
            'v' => function_exists('pcm_vname') ? pcm_vname($v) : (string)$v, 'xv' => function_exists('pcm_vname') ? pcm_vname($xv) : (string)$xv);
    }
    usort($out, function ($a, $b) { return strcmp($b['x'], $a['x']); });
    return $out;
}

/* 29 Oct 2026 (owner: "build the trial count on the installs card"): how the free months are going, so we can see how many
   people pay once theirs runs out. $trials = install id => its free month (pcm-plus-lib.php plus_trial_states); $bought =
   install id => an Unlock key that wasn't a free month (plus_bought_installs). Every install, whatever the tab.
   - had it: the PC received its free month (got); a month given that never reached the PC (it ran once, or never updated)
     is counted apart, as not reached, and left out of everything else;
   - plan: the PC is now linked to a customer or on a plan (a free month is only ever given to a PC that was neither);
     bought: an Unlock key covers it. Either can happen before the month is over: both count as paid;
   - of those whose month has ended without paying: still free = seen after its last day (kept the free version),
     stopped = not seen since;
   - decided = ended + paid early; rate = paid / decided. Split UK (GB, Isle of Man, Jersey, Guernsey) and abroad. */
function inst_trial_summary(array $d, array $trials, array $bought = array(), $now = null) {
    $now = $now === null ? time() : (int)$now;
    $blank = array('had' => 0, 'running' => 0, 'ended' => 0, 'plan' => 0, 'bought' => 0, 'free' => 0, 'stopped' => 0, 'decided' => 0);
    $out = array('given' => 0, 'not_reached' => 0, 'next_end' => 0, 'ends7' => 0, 'all' => $blank, 'uk' => $blank, 'abroad' => $blank,
        // the extra-week test (pcm-plus-lib.php plus_trial_extra_week): ext = given 7 more days, ctl = the half that wasn't;
        // _paid = paid since, _open = still in their (extra) time
        'test' => array('ext' => 0, 'ext_paid' => 0, 'ext_open' => 0, 'ctl' => 0, 'ctl_paid' => 0, 'ctl_open' => 0));
    foreach ($trials as $id => $t) {
        if (!is_array($t)) continue;
        $out['given']++;
        $e = (isset($d['m'][$id]) && is_array($d['m'][$id])) ? $d['m'][$id] : array();
        if (!empty($e['o'])) { $out['given']--; continue; }   // one of our own PCs: never a figure
        if (!(int)(isset($t['got']) ? $t['got'] : 0)) { $out['not_reached']++; continue; }
        $until = (int)(isset($t['until']) ? $t['until'] : 0);
        $over = $until <= $now || (isset($t['state']) && $t['state'] === 'off');
        $paid = (!empty($e['p']) || !empty($e['k'])) ? 'plan' : (isset($bought[$id]) ? 'bought' : '');
        $c = strtoupper((string)(isset($e['c']) ? $e['c'] : ''));
        $reg = in_array($c, array('GB', 'IM', 'JE', 'GG'), true) ? 'uk' : 'abroad';
        foreach (array('ext', 'ctl') as $half)
            if (!empty($t[$half])) { $out['test'][$half]++; if ($paid !== '') $out['test'][$half . '_paid']++; elseif (!$over) $out['test'][$half . '_open']++; }
        foreach (array('all', $reg) as $g) {
            $out[$g]['had']++;
            if ($paid !== '') { $out[$g][$paid]++; $out[$g]['decided']++; }
            if ($over) {
                $out[$g]['ended']++;
                if ($paid === '') {
                    $out[$g]['decided']++;
                    if ((string)(isset($e['l']) ? $e['l'] : '') > gmdate('Y-m-d', $until)) $out[$g]['free']++; else $out[$g]['stopped']++;
                }
            } elseif ($paid === '') $out[$g]['running']++;   // still in its month, not paid yet
        }
        if (!$over && $paid === '') {
            if (!$out['next_end'] || $until < $out['next_end']) $out['next_end'] = $until;
            if ($until <= $now + 7 * 86400) $out['ends7']++;
        }
    }
    foreach (array('all', 'uk', 'abroad') as $g)
        $out[$g]['rate'] = $out[$g]['decided'] ? (int)round(100 * ($out[$g]['plan'] + $out[$g]['bought']) / $out[$g]['decided']) : null;
    return $out;
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
        'linked' => 0, 'plan' => 0, 'unlinked' => 0, 'w10' => 0, 'extra' => 0,
        'countries' => array(), 'versions' => array(), 'daily' => array());
    $cc = array(); $vv = array(); $daily = array();
    for ($i = 29; $i >= 0; $i--) $daily[gmdate('Y-m-d', $now - $i * 86400)] = 0;
    foreach ((isset($d['m']) && is_array($d['m'])) ? $d['m'] : array() as $e) {
        if (!is_array($e)) continue;
        if (!empty($e['o'])) { $out['ours']++; continue; }   // our own PCs (7 Oct 2026): left out of every figure, counted here
        $p = !empty($e['p']); $k = !empty($e['k']);
        // the whole picture, before the filter
        if ($p) $out['plan']++; elseif ($k) $out['linked']++; else $out['unlinked']++;
        if (($p || $k) && (string)(isset($e['x']) ? $e['x'] : '') >= $d7) $out['extra']++;   // 29 Oct 2026: someone else on it, not signed in
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
