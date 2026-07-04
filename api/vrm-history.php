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

$end = time(); $start = $end - 24 * 3600;
$ch = curl_init('https://vrmapi.victronenergy.com/v2/installations/' . $SITE_ID .
    '/widgets/Graph?attributeCodes[]=bs&attributeCodes[]=Pdc&instance=0&start=' . $start . '&end=' . $end);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 20,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_HTTPHEADER     => ['X-Authorization: Token ' . $VRM_TOKEN],
]);
$body = curl_exec($ch);
curl_close($ch);
$j = $body ? json_decode($body, true) : null;

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
$out = json_encode(['ok' => true, 'soc' => $soc, 'pv' => $pv, 't' => time()]);
@file_put_contents($CACHE . '.tmp', $out, LOCK_EX);
@rename($CACHE . '.tmp', $CACHE);   // atomic swap — unlocked readers never see a half-written file
echo $out;
