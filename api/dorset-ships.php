<?php
/*
 * Ships and ferries over Poole Bay, the Solent and the Channel — the public
 * endpoint behind the live map's vessel layer.
 *
 * This file never talks to AISStream. dorset-ships-poll.php (a one-minute cron)
 * does that and writes api/dorset-ships-cache.json; this file reads the store
 * and answers in the exact JSON the map's vessel layer expects from its dev
 * server, health fields included, so a stale or missing feed is SAID on the
 * chip rather than hidden behind a pretty map.
 *
 *   dorset-ships.php?maxRows=900          the snapshot
 *   dorset-ships.php?track=1&mmsi=<n>     recent path samples for one vessel
 *
 * Source: AISStream (aisstream.io), on-screen credit registered by the app.
 * AIS shows transponder-carrying vessels only; that is stated in the coverage
 * field and must stay stated wherever the feed is described.
 *
 * NO closing tag in this file.
 */
error_reporting(0);
require __DIR__ . '/dorset-lib.php';
require __DIR__ . '/dorset-ships-lib.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('X-Robots-Tag: noindex, nofollow');
header('X-Ships-Source: ' . SHIPS_SOURCE);
header('X-Ships-Coverage: ' . SHIPS_COVERAGE);

$keys = dorset_keys();
$hasKey = isset($keys['aisstream']) && trim((string)$keys['aisstream']) !== '';
$nowMs = (int)round(microtime(true) * 1000);
$store = ships_load_store();
if ($store === null) $store = ships_empty_store();

if (isset($_GET['track'])) {
    $mmsi = isset($_GET['mmsi']) ? trim((string)$_GET['mmsi']) : '';
    if (!preg_match('/^\d{5,10}$/', $mmsi)) {
        http_response_code(400);
        echo json_encode(array('error' => 'mmsi query param required', 'samples' => array()));
        exit;
    }
    echo json_encode(array(
        'mmsi' => $mmsi,
        'samples' => ships_track($store, $mmsi),
        'source' => SHIPS_SOURCE . ' (last 30 minutes)',
        'retainedSec' => (int)(SHIPS_STALE_MS / 1000),
    ));
    exit;
}

$maxRows = isset($_GET['maxRows']) ? (int)$_GET['maxRows'] : 5000;
if ($maxRows < 1) $maxRows = 1;
if ($maxRows > 5000) $maxRows = 5000;

$payload = ships_payload($store, $maxRows, $nowMs, $hasKey);
http_response_code($hasKey ? 200 : 503);
echo json_encode($payload);
