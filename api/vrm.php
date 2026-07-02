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
 * (SOC, volts, watts, solar, yields, tanks, 30-day history) — never the token,
 * serial numbers or account data. Responses are cached server-side for 60s
 * (vrm-cache.json) so visitor traffic can never hammer the VRM API.
 */
error_reporting(0);
ini_set('serialize_precision', '-1');   // clean float output (78.7, not 78.70000000000000284)
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=5');

$SITE_ID = 458482;
$TTL     = 15;   // widgets poll every 1s; this cache means VRM itself sees at most ~4 calls/min
$CACHE   = __DIR__ . '/vrm-cache.json';
$TOKENF  = __DIR__ . '/vrm-token.php';

if (is_file($CACHE) && (time() - filemtime($CACHE)) < $TTL) { readfile($CACHE); exit; }
if (!is_file($TOKENF)) { echo json_encode(['ok' => false, 'error' => 'not-configured']); exit; }
require $TOKENF; // defines $VRM_TOKEN
if (empty($VRM_TOKEN)) { echo json_encode(['ok' => false, 'error' => 'not-configured']); exit; }

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
    if ($code === 'tl' || $code === 'tf' || $code === 'tcn') {
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
    $tanks[] = ['type' => $type, 'level' => round((float)$t['tl']['rawValue'])];
}

/* ---- 30-day solar history: daily kWh = Pb (PV->battery) + Pc (PV->consumers) ---- */
$hist = [];
$end = time(); $start = $end - 31 * 86400;
$st = vrm_get('/installations/' . $SITE_ID . '/stats?type=kwh&interval=days&start=' . $start . '&end=' . $end, $VRM_TOKEN);
if ($st && isset($st['records']['Pb']) && is_array($st['records']['Pb'])) {
    $pc = [];
    if (isset($st['records']['Pc']) && is_array($st['records']['Pc'])) {
        foreach ($st['records']['Pc'] as $p) if (is_array($p) && count($p) >= 2) $pc[(string)$p[0]] = (float)$p[1];
    }
    foreach ($st['records']['Pb'] as $p) {
        if (!is_array($p) || count($p) < 2) continue;
        $k = (string)$p[0];
        $hist[] = ['kwh' => round((float)$p[1] + (isset($pc[$k]) ? $pc[$k] : 0.0), 2)];
    }
    $hist = array_slice($hist, -30);
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
]);
@file_put_contents($CACHE, $out, LOCK_EX);
echo $out;
