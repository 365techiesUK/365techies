<?php
/**
 * Anonymised fleet statistics for the public site ("across the computers we look after...").
 *
 * PRIVACY RULES - do not relax any of them:
 *   - aggregate only: no name, key, machine id, model or per-machine value ever leaves here;
 *   - only machines that checked in within FLEET_WINDOW_DAYS count, so the figures are current;
 *   - NOTHING is published below FLEET_FLOOR machines (and the battery figure needs
 *     FLEET_LAPTOP_FLOOR laptops), so no percentage can point at a person;
 *   - percentages are whole numbers; the only size hint is a coarse band ("50+"), and the
 *     page does not show even that unless the owner switches it on.
 *
 * Every field is one the app already sends at check-in (pcm.php action=checkin). Memory size
 * is NOT among them - the app measures RAM but has never sent it - so "8 GB or less" waits for
 * the app release that adds it. Nothing here is estimated.
 */
if (!defined('PCM_FLEET_LIB')) {
    define('PCM_FLEET_LIB', 1);

define('FLEET_WINDOW_DAYS', 30);
define('FLEET_FLOOR', 20);
define('FLEET_LAPTOP_FLOOR', 12);

function fleet_compute($db, $now = null) {
    $now = $now ? (int)$now : time();
    $cut = $now - FLEET_WINDOW_DAYS * 86400;
    $n = 0; $w10 = 0; $bk = 0; $av = 0; $full = 0; $rb = 0; $lap = 0; $lapLow = 0; $scores = array();
    foreach ((array)(isset($db['customers']) ? $db['customers'] : array()) as $c) {
        if (!is_array($c)) continue;
        foreach ((array)(isset($c['machines']) ? $c['machines'] : array()) as $m) {
            if (!is_array($m)) continue;
            // 'seen' is gmdate('Y-m-d H:i') - a UTC string, not a timestamp
            $seen = isset($m['seen']) ? @strtotime((string)$m['seen'] . ' UTC') : false;
            if ($seen === false || $seen < $cut) continue;
            if (!isset($m['diskpct'])) continue;              // activated but never reported ("fresh")
            $n++;
            if (!empty($m['w10'])) $w10++;
            if (!empty($m['backup'])) $bk++;
            if (strtolower(trim((string)(isset($m['av']) ? $m['av'] : ''))) === 'on') $av++;
            if (intval($m['diskpct']) >= 85) $full++;
            if (!empty($m['reboot'])) $rb++;
            $b = intval(isset($m['batt']) ? $m['batt'] : 0);
            if ($b > 0) { $lap++; if ($b < 70) $lapLow++; }   // a battery reading = a laptop
            $s = intval(isset($m['score']) ? $m['score'] : 0); if ($s > 0) $scores[] = $s;
        }
    }
    $out = array('computed' => $now, 'window_days' => FLEET_WINDOW_DAYS, 'enough' => ($n >= FLEET_FLOOR));
    if (!$out['enough']) return $out;                          // below the floor: nothing else leaves
    $pct = function ($k, $d) { return $d > 0 ? (int)round(100 * $k / $d) : null; };
    $out['stats'] = array(
        'windows10'        => $pct($w10, $n),
        'backup_seen'      => $pct($bk, $n),
        'antivirus_on'     => $pct($av, $n),
        'drive_over_85'    => $pct($full, $n),
        'restart_waiting'  => $pct($rb, $n),
        'battery_under_70' => ($lap >= FLEET_LAPTOP_FLOOR) ? $pct($lapLow, $lap) : null,
        'score_median'     => $scores ? fleet_median($scores) : null,
    );
    $out['band'] = fleet_band($n);
    return $out;
}

function fleet_median($a) {
    sort($a); $c = count($a);
    return ($c % 2) ? $a[intdiv($c, 2)] : (int)round(($a[$c / 2 - 1] + $a[$c / 2]) / 2);
}

// The only size hint that exists, and it is coarse on purpose.
function fleet_band($n) { foreach (array(250, 100, 50, 20) as $b) if ($n >= $b) return $b . '+'; return ''; }

}  // PCM_FLEET_LIB
