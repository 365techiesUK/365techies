<?php
/*
 * 24-hour SOC + solar-power series for the off-grid live dashboard charts.
 * Same token file as vrm.php (server-only, never in git — repo is public).
 * Uses VRM's own widgets/Graph endpoint (the one the portal itself draws from);
 * output is a whitelisted pair of [unixSeconds, value] series, cached 10 min.
 */
error_reporting(0);
ini_set('serialize_precision', '-1');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$SITE_ID = 458482;
$TTL     = 600;
$CACHE   = __DIR__ . '/vrm-history-cache.json';
$TOKENF  = __DIR__ . '/vrm-token.php';

if (is_file($CACHE) && (time() - filemtime($CACHE)) < $TTL) { readfile($CACHE); exit; }
if (!is_file($TOKENF)) { echo json_encode(['ok' => false, 'error' => 'not-configured']); exit; }
$cfgsrc = (string)@file_get_contents($TOKENF);
$VRM_TOKEN = preg_match('/\$VRM_TOKEN\s*=\s*[\'"]([^\'"]+)[\'"]/', $cfgsrc, $mm) ? $mm[1] : '';
if ($VRM_TOKEN === '') { echo json_encode(['ok' => false, 'error' => 'not-configured']); exit; }

function vrm_graph($query, $token) {
    global $SITE_ID;
    $ch = curl_init('https://vrmapi.victronenergy.com/v2/installations/' . $SITE_ID . '/widgets/Graph?' . $query);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 20,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_HTTPHEADER     => ['X-Authorization: Token ' . $token],
    ]);
    $body = curl_exec($ch);
    curl_close($ch);
    $j = $body ? json_decode($body, true) : null;
    return is_array($j) ? $j : null;
}
$end = time(); $start = $end - 24 * 3600;
$j = vrm_graph('attributeCodes[]=bs&attributeCodes[]=Pdc&instance=0&start=' . $start . '&end=' . $end, $VRM_TOKEN);

$soc = []; $pv = [];
if (is_array($j) && isset($j['records']['meta'], $j['records']['data']) && is_array($j['records']['data'])) {
    $idFor = [];
    foreach ($j['records']['meta'] as $id => $meta) {
        if (isset($meta['code'])) $idFor[$meta['code']] = (string)$id;
    }
    foreach (['bs' => 'soc', 'Pdc' => 'pv'] as $code => $outKey) {
        if (!isset($idFor[$code], $j['records']['data'][$idFor[$code]])) continue;
        $series = $j['records']['data'][$idFor[$code]];
        if (!is_array($series)) continue;
        foreach ($series as $p) {
            if (!is_array($p) || count($p) < 2 || $p[1] === null) continue;
            ${$outKey}[] = [(int)$p[0], round((float)$p[1], 1)];
        }
    }
}

if (count($soc) < 2 && count($pv) < 2) {
    if (is_file($CACHE)) { readfile($CACHE); exit; }   // serve stale rather than nothing
    echo json_encode(['ok' => false, 'error' => 'vrm-unreachable']);
    exit;
}

/* ---- engine (Orion XS) energy: charged-Ah counter deltas over 24h/7d/30d ----
   kWh = delta-Ah x 13.2V nominal charge voltage (labelled as approximate client-side) */
$engine = null;
$je = vrm_graph('attributeCodes[]=alah&instance=279&start=' . ($end - 30 * 86400) . '&end=' . $end, $VRM_TOKEN);
if ($je && isset($je['records']['data']) && is_array($je['records']['data'])) {
    $pts = [];
    foreach ($je['records']['data'] as $series) {
        if (!is_array($series)) continue;
        foreach ($series as $p) {
            if (is_array($p) && count($p) >= 2 && $p[1] !== null) $pts[] = [(int)$p[0], (float)$p[1]];
        }
        break;   // single requested series
    }
    if (count($pts) >= 2) {
        $lastV = $pts[count($pts) - 1][1];
        $at = function ($cutoff) use ($pts) {
            $best = $pts[0][1];
            foreach ($pts as $p) { if ($p[0] <= $cutoff) $best = $p[1]; else break; }
            return $best;
        };
        $NOMV = 13.2;
        $engine = [
            'd1'  => round(max(0, $lastV - $at($end - 86400))      * $NOMV / 1000, 2),
            'd7'  => round(max(0, $lastV - $at($end - 7 * 86400))  * $NOMV / 1000, 2),
            'd30' => round(max(0, $lastV - $at($end - 30 * 86400)) * $NOMV / 1000, 2),
        ];
    }
}
$out = json_encode(['ok' => true, 'soc' => $soc, 'pv' => $pv, 'engine' => $engine, 't' => time()]);
@file_put_contents($CACHE . '.tmp', $out, LOCK_EX);
@rename($CACHE . '.tmp', $CACHE);   // atomic swap — unlocked readers never see a half-written file
echo $out;
