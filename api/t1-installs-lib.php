<?php
/*
 * Techies One Mail installs - counted from the app's own check-ins. 10 Oct 2026 (owner: "yes, build the updater,
 * check-ins and portal card").
 *
 * WHY. Techies One Mail (the 365 Techies email program, a Windows app) checks in when it starts and every few hours: it
 * is how it hears about updates (t1-checkin.php answers with the latest version). Counting those check-ins tells staff how
 * many people really use it, the same way 365 PC Manager installs are counted (pcm-installs-lib.php).
 *
 * WHAT IS KEPT, per install (api/t1-installs.json - gitignored, .htaccess-denied):
 *   an id (a one-way hash of a random number the app made for itself - not tied to the PC, the person or the email),
 *   the day first and last seen, how many different days it was used, the app version, Windows 10 or 11, which KINDS of
 *   email provider it is set up for (bt, gmail ... - never an address), and the country (worked out from the internet
 *   address at that moment; the address itself is never kept). An install not seen for a year is deleted.
 * Written at most once a day per install (a new day, or a new version / Windows / providers), under a lock.
 *
 * OUR OWN PCs: the same connections staff marked with "These PCs are ours" on the PC Manager installs card
 * (pcm-installs.json 'ours', salted hashes) - a check-in over one of them is flagged 'o' and left out of every figure.
 *
 * Include-only (.htaccess denies it as a URL). NO closing tag in this file.
 */
require_once __DIR__ . '/pcm-installs-lib.php';   // inst_is_ours (our own connections), and through it geo_cc

function t1i_file() { return isset($GLOBALS['T1_INSTALLS_FILE']) ? $GLOBALS['T1_INSTALLS_FILE'] : __DIR__ . '/t1-installs.json'; }

// The provider kinds the app knows (t1/providers.py). Anything else is not stored.
function t1i_provider_kinds() { return array('gmail', 'microsoft', 'microsoft365', 'yahoo', 'aol', 'bt', 'virgin', 'sky', 'plusnet', 'other'); }

function t1i_clean_version($v) { $v = trim((string)$v); return preg_match('/^\d{1,3}\.\d{1,3}\.\d{1,4}$/', $v) ? $v : ''; }

function t1i_clean_providers($p) {
    $ok = array_flip(t1i_provider_kinds()); $out = array();
    foreach ((array)$p as $x) { $x = strtolower(trim((string)$x)); if (isset($ok[$x])) $out[$x] = 1; }
    $out = array_keys($out); sort($out);
    return implode(',', $out);
}

// "10.0.19045" -> "10", "10.0.22631" -> "11" (Windows 11 kept the 10.0 number; its builds start at 22000). '' otherwise.
function t1i_windows($w) {
    if (!preg_match('/^10\.0\.(\d{4,6})/', trim((string)$w), $m)) return '';
    return (int)$m[1] >= 22000 ? '11' : '10';
}

// Versions in order: "0.13.0" < "0.13.2" < "1.0.0".
function t1i_vcmp($a, $b) { return version_compare((string)$a, (string)$b); }

/* One check-in. $id: the app's own random install number (32 hex); $ip: the caller's address (country and "ours" only).
   Returns 'new' | 'updated' | 'same' | 'busy' | ''. */
function t1i_note($id, $ver, $win, $providers, $ip, $now = null) {
    $id = preg_replace('/[^a-f0-9]/', '', strtolower((string)$id));
    if (strlen($id) < 16 || strlen($id) > 64) return '';
    if (trim($id, '0') === '') return '';   // the all-zero test number, never a real install
    $ver = t1i_clean_version($ver);
    if ($ver === '') return '';
    $now = $now === null ? time() : (int)$now;
    $day = gmdate('Y-m-d', $now);
    $key = substr(sha1('t1inst|' . $id), 0, 16);
    $row = array('v' => $ver, 'w' => t1i_windows($win), 'p' => t1i_clean_providers($providers));
    $pcm = @json_decode((string)@file_get_contents(inst_file()), true);   // where staff marked our own connections
    $row['o'] = (is_array($pcm) && inst_is_ours($pcm, $ip, $now)) ? 1 : 0;
    $file = t1i_file();
    // the common case - already noted today with the same facts - costs one read and no lock
    $cur = @json_decode((string)@file_get_contents($file), true);
    if (is_array($cur) && isset($cur['m'][$key])) {
        $e = $cur['m'][$key];
        if ((string)($e['l'] ?? '') === $day && (string)($e['v'] ?? '') === $ver && (string)($e['w'] ?? '') === $row['w']
            && (string)($e['p'] ?? '') === $row['p'] && (int)($e['o'] ?? 0) === $row['o']) return 'same';
    }
    $lk = @fopen($file . '.lock', 'c');
    if (!$lk) return '';
    if (!@flock($lk, LOCK_EX | LOCK_NB)) { fclose($lk); return 'busy'; }   // its next check-in tries again
    $what = '';
    try {
        $raw = @file_get_contents($file);
        $d = ($raw === false || $raw === '') ? null : json_decode($raw, true);
        if ($raw !== false && $raw !== '' && (!is_array($d) || !isset($d['m']) || !is_array($d['m']))) return '';   // never overwrite an unreadable store
        if (!is_array($d)) $d = array('v' => 1, 'since' => $day, 'm' => array());
        if (isset($d['m'][$key])) {
            $e = $d['m'][$key];
            $cc = (string)($e['c'] ?? '');
            if ($cc === '' || (string)$e['l'] !== $day) { $g = geo_cc($ip); if ($g !== '') $cc = $g; }
            $n = (int)($e['n'] ?? 1);
            if ((string)$e['l'] !== $day) $n++;
            $d['m'][$key] = array_merge($e, $row, array('l' => $day, 'c' => $cc, 'n' => $n));
            $what = 'updated';
        } else {
            $d['m'][$key] = array_merge($row, array('f' => $day, 'l' => $day, 'c' => geo_cc($ip), 'n' => 1));
            $what = 'new';
        }
        unset($d['m'][t1i_test_key()]);   // the one test check-in sent before test numbers were refused (10 Oct 2026)
        $cut = gmdate('Y-m-d', $now - 365 * 86400);   // an install not seen for a year is gone for good
        foreach ($d['m'] as $k => $e) if ((string)($e['l'] ?? '') < $cut) unset($d['m'][$k]);
        $tmp = $file . '.' . getmypid() . '.tmp';
        $ok = @file_put_contents($tmp, json_encode($d)) !== false;
        if ($ok) { $ok = @rename($tmp, $file); if (!$ok && DIRECTORY_SEPARATOR === '\\') { @unlink($file); $ok = @rename($tmp, $file); } }
        if (!$ok) { @unlink($tmp); $what = ''; }
    } finally {
        @flock($lk, LOCK_UN); fclose($lk);
    }
    return $what;
}

// The store key of the all-zero test number Claude sent on 10 Oct 2026 checking the live update offer: never counted.
function t1i_test_key() { return substr(sha1('t1inst|' . str_repeat('0', 32)), 0, 16); }

/* The newest release, for the app's updater: downloads/t1/version.json {ver, url, sha256, size, notes}. Only a complete,
   sane entry on our own downloads folder is offered (the app checks the file's fingerprint and our signature again). */
function t1i_latest($file = null) {
    $file = $file !== null ? $file : dirname(__DIR__) . '/downloads/t1/version.json';
    $j = @json_decode((string)@file_get_contents($file), true);
    if (!is_array($j)) return null;
    $ver = t1i_clean_version($j['ver'] ?? '');
    $url = (string)($j['url'] ?? '');
    $sha = strtolower((string)($j['sha256'] ?? ''));
    if ($ver === '' || !preg_match('~^https://365techies\.co\.uk/downloads/t1/TechiesOneMail-Setup-[0-9.]+\.exe$~', $url)
        || !preg_match('/^[a-f0-9]{64}$/', $sha)) return null;
    return array('ver' => $ver, 'url' => $url, 'sha256' => $sha, 'size' => max(0, (int)($j['size'] ?? 0)),
                 'notes' => function_exists('mb_substr') ? mb_substr((string)($j['notes'] ?? ''), 0, 600) : substr((string)($j['notes'] ?? ''), 0, 600));
}

/* What the staff portal shows. Same words as the PC Manager card: still using it = used on 2+ different days and seen in
   the last week; stopped = 2+ days, not this week; ran once = one day only, 2+ days ago; too soon = the rest. */
function t1i_stats(array $d, $now = null) {
    $now = $now === null ? time() : (int)$now;
    $today = gmdate('Y-m-d', $now); $d7 = gmdate('Y-m-d', $now - 6 * 86400); $d30 = gmdate('Y-m-d', $now - 29 * 86400);
    $d2 = gmdate('Y-m-d', $now - 2 * 86400);
    $out = array('ok' => true, 'since' => (string)($d['since'] ?? ''), 'total' => 0, 'active7' => 0, 'active30' => 0,
        'new7' => 0, 'new30' => 0, 'newToday' => 0, 'kept' => 0, 'stopped' => 0, 'days3' => 0, 'once' => 0, 'soon' => 0,
        'ours' => 0, 'w10' => 0, 'w11' => 0, 'countries' => array(), 'versions' => array(), 'providers' => array(), 'daily' => array());
    $cc = array(); $vv = array(); $pp = array(); $daily = array();
    for ($i = 29; $i >= 0; $i--) $daily[gmdate('Y-m-d', $now - $i * 86400)] = 0;
    foreach ((isset($d['m']) && is_array($d['m'])) ? $d['m'] : array() as $k => $e) {
        if (!is_array($e) || $k === t1i_test_key()) continue;
        if (!empty($e['o'])) { $out['ours']++; continue; }
        $f = (string)($e['f'] ?? ''); $l = (string)($e['l'] ?? '');
        $out['total']++;
        if ($l >= $d7) $out['active7']++;
        if ($l >= $d30) $out['active30']++;
        if ($f >= $d7) $out['new7']++;
        if ($f >= $d30) $out['new30']++;
        if ($f === $today) $out['newToday']++;
        $multi = $l > $f; $kept = $multi && $l >= $d7; $days = (int)($e['n'] ?? ($multi ? 2 : 1));
        if ($kept) { $out['kept']++; if ($days >= 3) $out['days3']++; }
        elseif ($multi) $out['stopped']++;
        elseif ($f <= $d2) $out['once']++; else $out['soon']++;
        if (($e['w'] ?? '') === '10') $out['w10']++; elseif (($e['w'] ?? '') === '11') $out['w11']++;
        if (isset($daily[$f])) $daily[$f]++;
        $c = (string)($e['c'] ?? ''); $c = $c !== '' ? $c : '--';
        if (!isset($cc[$c])) $cc[$c] = array('n' => 0, 'kept' => 0);
        $cc[$c]['n']++; if ($kept) $cc[$c]['kept']++;
        $v = (string)($e['v'] ?? ''); $vv[$v] = ($vv[$v] ?? 0) + 1;
        foreach (array_filter(explode(',', (string)($e['p'] ?? ''))) as $p) $pp[$p] = ($pp[$p] ?? 0) + 1;
    }
    uasort($cc, function ($a, $b) { return $b['n'] - $a['n']; });
    foreach (array_slice($cc, 0, 15, true) as $c => $x) $out['countries'][] = array('k' => (string)$c, 'n' => $x['n'], 'kept' => $x['kept']);
    uksort($vv, function ($a, $b) { return t1i_vcmp($b, $a); });
    foreach ($vv as $v => $n) $out['versions'][] = array('k' => (string)$v, 'n' => $n);
    arsort($pp);
    foreach ($pp as $p => $n) $out['providers'][] = array('k' => (string)$p, 'n' => $n);
    foreach ($daily as $day => $n) $out['daily'][] = array('d' => $day, 'n' => $n);
    return $out;
}
