<?php
/*
 * River and tide level stations across the conurbation — Environment Agency
 * real-time flood-monitoring API. No key, no registration, OGL.
 *
 * ⚠️ THE TRAP THAT DEFINES THIS FILE'S SHAPE (learned 2026-08-30).
 * `/id/stations?_view=full` does NOT carry current values: its
 * `measures[].latestReading` is absent, and on the per-station detail endpoint
 * it is a URL STRING rather than an object. Reading values station by station
 * would also mean hammering the API, which its own guidance forbids. The
 * documented pattern is one combined `/data/readings?latest` call for the
 * WHOLE network, which every caller then joins on measure id.
 *
 * ⚠️ AND THAT COMBINED CALL IS ~1.7 MB AND TOOK 7-15 SECONDS COLD.
 * Doing it inline would blow through the map client's timeout and turn every
 * station into a 502. So it is NOT done inline. Readings are refreshed by
 * whoever arrives when the cache is stale AND a lock is free, and everyone
 * else is served immediately from whatever readings already exist. A station
 * with no value yet renders honestly as "no current reading" — never as zero,
 * which would be a river level of nought metres and a lie.
 *
 * For a guaranteed-warm cache, call this from the existing 5-minute cron:
 *     php /home/.../api/dorset-water.php refresh
 *
 * NO closing tag in this file.
 */
error_reporting(0);
require __DIR__ . '/dorset-lib.php';

$CACHE    = __DIR__ . '/dorset-water-cache.json';     // assembled GeoJSON
$READINGS = __DIR__ . '/dorset-water-readings.json';  // network-wide latest values
$RATE     = __DIR__ . '/dorset-water-rate.json';
$LOCK     = __DIR__ . '/dorset-water-readings.lock';

$STATIONS_TTL = 3600;        // station metadata barely changes
$READINGS_TTL = 900;         // the EA update on a ~15 minute cadence
$OUTPUT_TTL   = 300;

$CLI = (PHP_SAPI === 'cli');
$FORCE = $CLI && isset($argv[1]) && $argv[1] === 'refresh';

$EMPTY = array('ok' => false, 'type' => 'FeatureCollection', 'features' => array());

if (!$FORCE) {
    $fresh = dorset_cache_get($CACHE, $OUTPUT_TTL);
    if ($fresh !== null) dorset_send($fresh);
    if (!dorset_rate_ok($RATE, 12)) dorset_degrade($CACHE, 'rate', $EMPTY);
}

/* --------------------------------------------------------------- readings */

/**
 * Refresh the network-wide latest readings, but only if this process can take
 * the lock. A second caller arriving mid-refresh serves the older map rather
 * than starting a second 1.7 MB download.
 */
function water_refresh_readings($file, $lock, $force) {
    $fh = @fopen($lock, 'c');
    if (!$fh) return;
    $got = @flock($fh, LOCK_EX | LOCK_NB);
    if (!$got) { @fclose($fh); return; }

    // Re-check under the lock: another process may have just finished.
    if (!$force && dorset_cache_get($file, 900) !== null) {
        @flock($fh, LOCK_UN); @fclose($fh); return;
    }

    $j = dorset_http_json('https://environment.data.gov.uk/flood-monitoring/data/readings?latest&_limit=20000', 45);
    if (is_array($j) && isset($j['items']) && is_array($j['items'])) {
        $map = array();
        foreach ($j['items'] as $it) {
            if (!is_array($it) || !isset($it['measure']) || !is_string($it['measure'])) continue;
            if (!isset($it['value']) || !is_numeric($it['value'])) continue;
            $map[$it['measure']] = array(
                'v' => (float)$it['value'],
                't' => isset($it['dateTime']) ? $it['dateTime'] : null,
            );
        }
        if (count($map)) dorset_cache_put($file, $map);
    }
    @flock($fh, LOCK_UN);
    @fclose($fh);
}

if ($FORCE || dorset_cache_get($READINGS, $READINGS_TTL) === null) {
    water_refresh_readings($READINGS, $LOCK, $FORCE);
}
// Up to six hours stale is still worth showing WITH ITS TIMESTAMP; the client
// renders the age. Older than that and values are dropped rather than dressed
// up as current.
$readings = dorset_cache_stale($READINGS, 6 * 3600);
if (!is_array($readings)) $readings = array();

/* --------------------------------------------------------------- stations */

$lat  = (DORSET_S + DORSET_N) / 2;
$long = (DORSET_W + DORSET_E) / 2;
$dLatKm = ((DORSET_N - DORSET_S) / 2) * 111.32;
$dLonKm = ((DORSET_E - DORSET_W) / 2) * 111.32 * cos(deg2rad($lat));
$dist = min(60, (int)ceil(sqrt($dLatKm * $dLatKm + $dLonKm * $dLonKm)));

$url = 'https://environment.data.gov.uk/flood-monitoring/id/stations'
     . '?lat=' . number_format($lat, 4, '.', '')
     . '&long=' . number_format($long, 4, '.', '')
     . '&dist=' . $dist
     . '&_limit=500&_view=full';

$sj = dorset_http_json($url, 30);
if ($sj === null) {
    if ($CLI) { echo "stations fetch failed\n"; exit(1); }
    dorset_degrade($CACHE, 'upstream', $EMPTY);
}

/** The EA returns lat/long as either a number or a single-element array. */
function water_num($v) {
    if (is_array($v)) $v = count($v) ? $v[0] : null;
    return is_numeric($v) ? (float)$v : null;
}

$features = array();
$items = (isset($sj['items']) && is_array($sj['items'])) ? $sj['items'] : array();
foreach ($items as $st) {
    if (!is_array($st)) continue;
    $la = water_num(isset($st['lat']) ? $st['lat'] : null);
    $lo = water_num(isset($st['long']) ? $st['long'] : null);
    if ($la === null || $lo === null) continue;
    if (!dorset_in_box($lo, $la)) continue;

    $measures = array();
    $ms = (isset($st['measures']) && is_array($st['measures'])) ? $st['measures'] : array();
    foreach ($ms as $m) {
        if (!is_array($m) || !isset($m['@id'])) continue;
        $hit = isset($readings[$m['@id']]) ? $readings[$m['@id']] : null;
        $measures[] = array(
            'id'          => $m['@id'],
            'parameter'   => isset($m['parameter']) ? $m['parameter'] : null,
            'qualifier'   => isset($m['qualifier']) ? $m['qualifier'] : null,
            'unit'        => isset($m['unitName']) ? $m['unitName'] : null,
            // ⚠️ null, NEVER 0. A missing reading is "no current reading";
            // zero is a river level of nought metres.
            'latestValue' => $hit ? $hit['v'] : null,
            'latestAt'    => $hit ? $hit['t'] : null,
        );
    }

    $name = isset($st['label']) ? $st['label'] : null;
    if (is_array($name)) $name = count($name) ? $name[0] : null;

    $features[] = array(
        'type' => 'Feature',
        'id'   => isset($st['stationReference']) ? $st['stationReference'] : null,
        'geometry' => array('type' => 'Point', 'coordinates' => array($lo, $la)),
        'properties' => array(
            'name'     => $name,
            'river'    => isset($st['riverName']) ? $st['riverName'] : null,
            'town'     => isset($st['town']) ? $st['town'] : null,
            'measures' => $measures,
            // The client carries this straight through to the picker panel.
            // Every measured series the portal shows states who measured it,
            // from what dataset, under what licence — this layer included.
            'provenance' => array(
                'provider'  => 'Environment Agency',
                'dataset'   => 'flood-monitoring real-time API',
                'sourceUrl' => 'https://environment.data.gov.uk/flood-monitoring/doc/reference',
                'licence'   => 'Open Government Licence v3.0',
            ),
        ),
    );
}

if (!count($features)) {
    if ($CLI) { echo "no stations in box\n"; exit(1); }
    dorset_degrade($CACHE, 'parsed-empty', $EMPTY);
}

$withValues = 0;
foreach ($features as $f) {
    foreach ($f['properties']['measures'] as $m) {
        if ($m['latestValue'] !== null) { $withValues++; break; }
    }
}

$body = array(
    'ok'        => true,
    'type'      => 'FeatureCollection',
    'generated' => gmdate('c'),
    'count'     => count($features),
    // Surfaced so "no values" is legible as a readings-cache problem rather
    // than mistaken for a dry county.
    'withValues'=> $withValues,
    'source'    => 'Environment Agency flood-monitoring API (OGL)',
    'features'  => $features,
);
dorset_cache_put($CACHE, $body);

if ($CLI) {
    echo 'ok: ' . count($features) . ' stations, ' . $withValues . " with current values\n";
    exit(0);
}
dorset_send($body);
