<?php
/*
 * Live Victron VRM proxy for the 365 Crafter dashboards
 * (/off-grid-victron-energy/ and /lithium-battery-installs-dorset/).
 *
 * SECURITY: the VRM access token is NOT in this file and NOT in git (the repo is
 * public). It lives in vrm-token.php NEXT TO this file on the server only,
 * created once via SiteGround File Manager with exactly one line:
 *
 *     <?php $VRM_TOKEN = 'paste-the-vrm-access-token-here';
 *
 * This proxy exposes ONLY a whitelisted, read-only summary of site 458482
 * (SOC, volts, watts, solar, yields, tanks, 30-day history, battery passport,
 * MPPT/engine-charger detail, alarms) — never the token, serial numbers or
 * account data. Responses are cached server-side for a few seconds
 * (vrm-cache.json, $TTL below) so visitor traffic can never hammer the VRM API.
 */
error_reporting(0);
ini_set('serialize_precision', '-1');   // clean float output (78.7, not 78.70000000000000284)
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$SITE_ID = 458482;
$TTL     = 3;    // near-live tail of VRM's database; widgets poll 1s, VRM sees at most ~20 calls/min
$CACHE   = __DIR__ . '/vrm-cache.json';
$TOKENF  = __DIR__ . '/vrm-token.php';

if (is_file($CACHE) && (time() - filemtime($CACHE)) < $TTL) { readfile($CACHE); exit; }
if (!is_file($TOKENF)) { echo json_encode(['ok' => false, 'error' => 'not-configured']); exit; }
/* Extract credentials by pattern rather than executing the file — immune to formatting mistakes */
$cfgsrc = (string)@file_get_contents($TOKENF);
$VRM_TOKEN = preg_match('/\$VRM_TOKEN\s*=\s*[\'"]([^\'"]+)[\'"]/', $cfgsrc, $mm) ? $mm[1] : '';
if ($VRM_TOKEN === '') { echo json_encode(['ok' => false, 'error' => 'not-configured']); exit; }

function vrm_get($path, $token) {
    $ch = curl_init('https://vrmapi.victronenergy.com/v2' . $path);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 20,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_HTTPHEADER     => ['X-Authorization: Token ' . $token],
    ]);
    $body = curl_exec($ch);
    curl_close($ch);
    if (!$body) return null;
    $j = json_decode($body, true);
    return is_array($j) ? $j : null;
}

$diag = vrm_get('/installations/' . $SITE_ID . '/diagnostics?count=1000', $VRM_TOKEN);
if (!$diag || empty($diag['records']) || !is_array($diag['records'])) {
    if (is_file($CACHE)) { readfile($CACHE); exit; }   // serve stale rather than nothing
    echo json_encode(['ok' => false, 'error' => 'vrm-unreachable']);
    exit;
}

/* ---- fold diagnostics into latest-value-per-code + tanks-per-instance ---- */
$m = []; $tank_recs = []; $updated = 0;
foreach ($diag['records'] as $rec) {
    if (!isset($rec['code'])) continue;
    $code = $rec['code'];
    $ts   = isset($rec['timestamp']) ? (int)$rec['timestamp'] : 0;
    if ($ts > $updated) $updated = $ts;
    if (in_array($code, ['tl', 'tf', 'tcn', 'tc', 'tr'], true)) {
        $inst = isset($rec['instance']) ? (string)$rec['instance'] : '0';
        $tank_recs[$inst][$code] = $rec;
        continue;
    }
    if (!isset($m[$code]) || $ts >= $m[$code]['ts']) {
        $m[$code] = [
            'raw' => isset($rec['rawValue']) ? $rec['rawValue'] : null,
            'fmt' => isset($rec['formattedValue']) ? $rec['formattedValue'] : null,
            'ts'  => $ts,
        ];
    }
}
function raw_num($m, $code) {
    if (!isset($m[$code]) || $m[$code]['raw'] === null || $m[$code]['raw'] === '') return null;
    return (float)$m[$code]['raw'];
}
function fmt_str($m, $code) {
    if (!isset($m[$code]) || $m[$code]['fmt'] === null) return null;
    $s = trim((string)$m[$code]['fmt']);
    return ($s === '') ? null : $s;
}

$soc   = raw_num($m, 'SOC');
$battV = raw_num($m, 'bv');  if ($battV === null) $battV = raw_num($m, 'V');
$battA = raw_num($m, 'I');
$battW = raw_num($m, 'bp');  if ($battW === null) $battW = raw_num($m, 'ScW');
$pvW   = raw_num($m, 'PVP');
$yT    = raw_num($m, 'YT');
$yY    = raw_num($m, 'YY');
$yU    = raw_num($m, 'YU');

/* Time to go: raw is usually seconds (large) but can be hours; <=0 means charging/infinite */
$ttg = raw_num($m, 'TTG');
if ($ttg !== null) { $ttg = ($ttg <= 0) ? null : ($ttg > 240 ? $ttg / 3600.0 : $ttg); }

$state = 'idle';
if ($battW !== null) { $state = ($battW > 3) ? 'charging' : (($battW < -3) ? 'discharging' : 'idle'); }

/* ---- tanks (fresh first) ---- */
$tanks = [];
ksort($tank_recs, SORT_NUMERIC);
foreach ($tank_recs as $t) {
    if (!isset($t['tl'])) continue;
    $type = '';
    if (isset($t['tcn']) && trim((string)$t['tcn']['formattedValue']) !== '') $type = trim((string)$t['tcn']['formattedValue']);
    elseif (isset($t['tf'])) $type = trim((string)$t['tf']['formattedValue']);
    if ($type === '') $type = 'Tank';
    $row = ['type' => $type, 'level' => round((float)$t['tl']['rawValue'])];
    if (isset($t['tc']) && (float)$t['tc']['rawValue'] > 0) {
        $row['capL'] = (int)round((float)$t['tc']['rawValue'] * 1000);   // m3 -> litres
        $trv = (isset($t['tr']) && $t['tr']['rawValue'] !== null && $t['tr']['rawValue'] !== '') ? (float)$t['tr']['rawValue'] : null;
        // fall back to level% x capacity so an unknown reading is never shown as an empty tank
        $row['remL'] = ($trv !== null) ? (int)round(max(0, $trv) * 1000) : (int)round($row['level'] / 100 * $row['capL']);
    }
    $tanks[] = $row;
}

/* ---- extended live detail (2026-07-04): battery passport, MPPT, engine charger, alarms ---- */
$batt = [
    'capAh'     => raw_num($m, 'ca'),
    'consAh'    => raw_num($m, 'CE'),
    'cycles'    => raw_num($m, 'H4'),
    'fullDis'   => raw_num($m, 'H5'),
    'deepAh'    => raw_num($m, 'H1'),
    'minV'      => raw_num($m, 'H7'),
    'maxV'      => raw_num($m, 'H8'),
    'disKwh'    => raw_num($m, 'H21'),
    'chgKwh'    => raw_num($m, 'H22'),
    'sinceFull' => raw_num($m, 'H9'),   // days
];
$mppt = [
    'stage' => fmt_str($m, 'ScS'),      // Bulk / Absorption / Float
    'track' => fmt_str($m, 'ScMm'),     // e.g. "MPPT active"
    'pvV'   => raw_num($m, 'PVV'),
    'chgI'  => raw_num($m, 'ScI'),
    'peakT' => raw_num($m, 'MCPT'),     // max charge power today, W
    'peakY' => raw_num($m, 'MCPY'),
];
$orion = [
    'state'  => fmt_str($m, 'als'),
    'why'    => fmt_str($m, 'alOR'),    // e.g. "No/low input power" = engine off
    'inV'    => raw_num($m, 'aliV'),    // starter battery volts
    'inW'    => raw_num($m, 'aliP'),
    'outI'   => raw_num($m, 'alI'),
    'lifeAh' => raw_num($m, 'alah'),
];
$ALARM_LABELS = ['AL' => 'Low battery voltage', 'AH' => 'High battery voltage', 'ASoc' => 'Low state of charge',
                 'ALT' => 'Low battery temperature', 'AHT' => 'High battery temperature', 'AM' => 'Mid-voltage imbalance',
                 'ALS' => 'Low starter voltage', 'AHS' => 'High starter voltage'];
$alarms = [];
foreach ($ALARM_LABELS as $c => $lbl) { $v = raw_num($m, $c); if ($v !== null && $v != 0) $alarms[] = $lbl; }
$e = raw_num($m, 'ScERR'); if ($e !== null && $e != 0) $alarms[] = 'Solar charger: ' . (fmt_str($m, 'ScERR') ?: 'error');
$e = raw_num($m, 'alE');   if ($e !== null && $e != 0) $alarms[] = 'Engine charger: ' . (fmt_str($m, 'alE') ?: 'error');
$alarmsSeen = isset($m['AL']);   // only claim "healthy" when the shunt's alarm set is actually present
/* Relay 1 doubles as the water-pump switch when its function is set to Tank pump */
$pump = null;
if (isset($m['rf0']) && (string)$m['rf0']['raw'] === '3' && isset($m['cRelay'])) {
    $rv = (string)$m['cRelay']['raw'];
    $pump = ($rv === '0') ? 'off' : (($rv === '1') ? 'on' : null);   // unknown stays unknown, never asserted 'on'
}

/* ---- 30-day solar history + today's energy ledger (VRM kWh stats: Pb PV->battery, Pc PV->loads, Bc battery->loads) ----
 * 17 Sep 2026 - both were wrong. The request asked for days from exactly 31x24 h before NOW, and VRM cut the
 * buckets from that start time: rolling 24-hour windows ending at the moment of the request, not calendar days.
 * So the "last entry" the ledger read as "today so far" was really yesterday afternoon to this morning (seen live:
 * over 32 minutes the MPPT's own yieldToday rose 0.68 -> 0.77 kWh while the "today" ledger stayed at ~1.19), and
 * every older day drifted as the window slid (15 Sep read 1.24 then 1.27). Now both are asked from a UK midnight:
 *  - history: 30 whole calendar days, midnight 30 days ago -> midnight today (today is never in the history);
 *  - ledger: today since midnight in 15-minute buckets, summed - it grows through the day.
 * Cached 60 s (vrm-stats-cache.json, denied in .htaccess): the diagnostics above stay near-live, and these two
 * calls no longer run on every 3-second refresh. */
function vrm_series($st, $code) {
    $o = [];
    if ($st && isset($st['records'][$code]) && is_array($st['records'][$code])) {
        foreach ($st['records'][$code] as $p) if (is_array($p) && count($p) >= 2 && $p[1] !== null) $o[] = [(float)$p[0], (float)$p[1]];
    }
    return $o;
}
function vrm_bucket_ts($ms) { return (int)floor($ms > 1e11 ? $ms / 1000 : $ms); }   // VRM stamps buckets in milliseconds
$ukTz = new DateTimeZone('Europe/London');
$midnight = new DateTime('today', $ukTz);
$todayKey = $midnight->format('Y-m-d');
$STATS_CACHE = __DIR__ . '/vrm-stats-cache.json';
$sc = @json_decode((string)@file_get_contents($STATS_CACHE), true);
if (is_array($sc) && isset($sc['at'], $sc['day'], $sc['hist'], $sc['ledger']) && $sc['day'] === $todayKey && time() - (int)$sc['at'] < 60) {
    $hist = $sc['hist'];
    $ledger = $sc['ledger'];
} else {
    $hist = [];
    $ledger = ['pb' => null, 'pc' => null, 'bc' => null];   // today since UK midnight
    $from = clone $midnight; $from->modify('-30 days');
    $st = vrm_get('/installations/' . $SITE_ID . '/stats?type=kwh&interval=days&start=' . $from->getTimestamp() . '&end=' . $midnight->getTimestamp(), $VRM_TOKEN);
    $pbS = vrm_series($st, 'Pb');
    if ($pbS) {
        $pc = []; $bc = [];
        foreach (vrm_series($st, 'Pc') as $p) $pc[(string)$p[0]] = $p[1];
        foreach (vrm_series($st, 'Bc') as $p) $bc[(string)$p[0]] = $p[1];
        foreach ($pbS as $p) {
            $pdt = new DateTime('@' . vrm_bucket_ts($p[0]));
            $pdt->setTimezone($ukTz);
            if ($pdt->format('Y-m-d') >= $todayKey) continue;   // a bucket starting at the end boundary is today's, not history
            $k = (string)$p[0];
            $pck = isset($pc[$k]) ? $pc[$k] : 0.0;
            $hist[] = [
                'd'    => $pdt->format('Y-m-d'),                                 // UK calendar day, for the forecast's day-by-day calibration
                'kwh'  => round($p[1] + $pck, 2),                                // solar generated = PV->battery + PV->loads
                'used' => round($pck + (isset($bc[$k]) ? $bc[$k] : 0.0), 2),     // energy used = PV->loads + battery->loads
            ];
        }
        $hist = array_slice($hist, -30);
    }
    $tq = vrm_get('/installations/' . $SITE_ID . '/stats?type=kwh&interval=15mins&start=' . $midnight->getTimestamp() . '&end=' . time(), $VRM_TOKEN);
    if ($tq && isset($tq['records']) && is_array($tq['records'])) {
        foreach (['Pb' => 'pb', 'Pc' => 'pc', 'Bc' => 'bc'] as $code => $key) {
            $sum = 0.0;
            foreach (vrm_series($tq, $code) as $p) if (vrm_bucket_ts($p[0]) >= $midnight->getTimestamp()) $sum += $p[1];
            $ledger[$key] = round($sum, 2);
        }
    }
    if ($hist) {
        @file_put_contents($STATS_CACHE . '.tmp', json_encode(['at' => time(), 'day' => $todayKey, 'hist' => $hist, 'ledger' => $ledger]), LOCK_EX);
        @rename($STATS_CACHE . '.tmp', $STATS_CACHE);
    } elseif (is_array($sc) && !empty($sc['hist'])) {
        $hist = $sc['hist'];   // VRM hiccup: keep the last good history rather than a blank chart
    }
}

$out = json_encode([
    'ok'             => true,
    'soc'            => $soc,
    'battState'      => $state,
    'battV'          => $battV,
    'battA'          => $battA,
    'battW'          => ($battW === null) ? null : round($battW, 1),
    'timeToGo'       => ($ttg === null) ? null : round($ttg, 1),
    'pvW'            => $pvW,
    'yieldToday'     => $yT,
    'yieldYesterday' => $yY,
    'yieldLifetime'  => $yU,
    'tanks'          => $tanks,
    'history'        => $hist,
    'updated'        => $updated,
    'dcW'            => raw_num($m, 'dc'),      // real DC system load, W
    'batt'           => $batt,
    'mppt'           => $mppt,
    'orion'          => $orion,
    'alarms'         => $alarms,
    'alarmsSeen'     => $alarmsSeen,
    'pump'           => $pump,
    'ledger'         => $ledger,   // today's daily totals from the stats series — NOT the diagnostics Pb/Pc/Bc codes, which are 15-min log-bucket deltas
]);
@file_put_contents($CACHE . '.tmp', $out, LOCK_EX);
@rename($CACHE . '.tmp', $CACHE);   // atomic swap — unlocked readers never see a half-written file
echo $out;
