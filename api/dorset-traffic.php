<?php
/*
 * Live traffic flow for the Bournemouth365 Portal — TomTom vector tiles.
 *
 * This replaces the layer's simulated mode. Without a key the traffic layer
 * animated white dots at hardcoded per-road-class speeds along real streets:
 * honest in its own label, but invented movement on a map whose strapline is
 * MEASURED, NOT MODELLED. With a key it shows measured congestion instead.
 *
 * Licence: commercial use IS permitted on TomTom's free tier — their platform
 * FAQ states "Can I use all APIs to build commercial applications? Yes — even
 * as part of the free evaluation." Attribution is mandatory while flow data is
 * displayed and is registered as a conditional credit, appearing only once
 * live mode activates:
 *
 *     Traffic flow data © TomTom
 *
 * ⚠️ THE BUDGET IS MONTHLY NOW, AND THE OLD DAILY NUMBERS ARE A TRAP.
 * The dev proxy defaults to 40,000 tiles per DAY, which was calibrated against
 * TomTom's previous pricing model. Current pricing gives 200,000 vector tiles
 * per MONTH — so that daily default would exhaust the whole allowance in five
 * days and then start returning 429s. The counter here is therefore monthly,
 * and it sits deliberately under the allowance rather than at it.
 *
 * ⚠️ AND WHEN THE BUDGET IS GONE, SERVE STALE — NEVER BLANK.
 * A tile we fetched four minutes ago is a far better answer than an empty one:
 * congestion does not evaporate because our quota did. Only a genuinely
 * uncached tile is refused, and the client keeps its simulated-free behaviour
 * of simply not colouring roads it has no data for.
 *
 * ROUTES:
 *   dorset-traffic.php?status=1        -> {hasKey, monthCount, budget, month}
 *   dorset-traffic.php?z=..&x=..&y=..  -> the vector tile (application/x-protobuf)
 *
 * NO closing tag in this file.
 */
error_reporting(0);
require __DIR__ . '/dorset-lib.php';

$TILE_DIR  = __DIR__ . '/dorset-traffic-tiles';
$BUDGET    = __DIR__ . '/dorset-traffic-budget.json';

/*
 * 200,000/month is the published allowance. Sitting at 180,000 leaves room for
 * a bad week and for the fact that our counter and TomTom's will never agree
 * exactly — a cached tile they never saw, a request that timed out after they
 * counted it. Being 10% wrong in our favour costs nothing; being 1% wrong in
 * theirs costs the layer.
 */
$MONTHLY_BUDGET = 180000;

// Matches the dev proxy. Flow data updates on the order of a minute, so a
// shorter TTL buys nothing and spends budget.
$TILE_TTL = 120;

$keys = dorset_keys();
$hasKey = !empty($keys['tomtom']);

/* ------------------------------------------------------------------ budget */

function traffic_month() { return gmdate('Y-m'); }

function traffic_budget_read($file) {
    $b = json_decode((string)@file_get_contents($file), true);
    if (!is_array($b) || !isset($b['month']) || $b['month'] !== traffic_month()) {
        return array('month' => traffic_month(), 'count' => 0);
    }
    return $b;
}

function traffic_budget_bump($file) {
    $b = traffic_budget_read($file);
    $b['count']++;
    @file_put_contents($file, json_encode($b), LOCK_EX);
    return $b;
}

/* ------------------------------------------------------------------ status */

if (isset($_GET['status'])) {
    $b = traffic_budget_read($BUDGET);
    dorset_send(array(
        'hasKey'     => $hasKey,
        'monthCount' => (int)$b['count'],
        'budget'     => $MONTHLY_BUDGET,
        'month'      => $b['month'],
        /*
         * ⚠️ THE COPYRIGHT SIGN IS BUILT AT RUNTIME, NOT TYPED.
         * Written as a literal it reached the browser double-encoded
         * ("Â© TomTom"). The file is correct UTF-8 on disk, so something in
         * the deploy path re-encoded it. This is a legally required
         * attribution string and must not depend on byte-level encoding
         * surviving FTP, git autocrlf and a shared host, so PHP generates the
         * bytes itself whatever the source file encoding turns out to be.
         */
        'source'     => "Traffic flow data \u{00A9} TomTom",
    ));
}

/* -------------------------------------------------------------------- tile */

/*
 * ⚠️ INTEGER-ONLY, AND NOT BECAUSE OF TIDINESS.
 * z/x/y land in a filesystem path. Anything that is not a plain integer is a
 * path-traversal attempt, so they are cast and re-compared rather than merely
 * escaped.
 */
$z = isset($_GET['z']) ? $_GET['z'] : '';
$x = isset($_GET['x']) ? $_GET['x'] : '';
$y = isset($_GET['y']) ? $_GET['y'] : '';
if ((string)(int)$z !== (string)$z || (string)(int)$x !== (string)$x || (string)(int)$y !== (string)$y) {
    dorset_send(array('ok' => false, 'reason' => 'bad-tile'), 400);
}
$z = (int)$z; $x = (int)$x; $y = (int)$y;
// TomTom's flow tiles are meaningless outside this range and a wild z would
// only burn budget.
if ($z < 8 || $z > 22 || $x < 0 || $y < 0 || $x >= (1 << $z) || $y >= (1 << $z)) {
    dorset_send(array('ok' => false, 'reason' => 'tile-out-of-range'), 400);
}

$file = $TILE_DIR . '/' . $z . '_' . $x . '_' . $y . '.pbf';

function traffic_send_tile($file, $status) {
    header('Content-Type: application/x-protobuf');
    header('Cache-Control: no-store');
    header('X-Tile-Cache: ' . $status);
    header('X-Source: Traffic flow data (c) TomTom');
    readfile($file);
    exit;
}

if (is_file($file) && (time() - (int)@filemtime($file)) < $TILE_TTL) {
    traffic_send_tile($file, 'HIT');
}

if (!$hasKey) {
    // No key: the layer falls back to its own keyless behaviour. 503 rather
    // than an empty tile, so "not configured" is distinguishable from "no
    // congestion here".
    http_response_code(503);
    exit;
}

$b = traffic_budget_read($BUDGET);
if ((int)$b['count'] >= $MONTHLY_BUDGET) {
    // Out of budget. A stale tile beats no tile; only an uncached one fails.
    if (is_file($file)) traffic_send_tile($file, 'STALE-BUDGET');
    http_response_code(503);
    exit;
}

$url = sprintf(
    'https://api.tomtom.com/traffic/map/4/tile/flow/relative0/%d/%d/%d.pbf?key=%s',
    $z, $x, $y, rawurlencode($keys['tomtom'])
);

list($tile, $code) = dorset_http($url, 15, array('Accept: application/x-protobuf'));

if ($tile === null || strlen($tile) === 0) {
    // 403/429 or a wobble: serve stale if we have it. Never blank.
    if (is_file($file)) traffic_send_tile($file, 'STALE-UPSTREAM');
    http_response_code(503);
    exit;
}

traffic_budget_bump($BUDGET);

if (!is_dir($TILE_DIR)) @mkdir($TILE_DIR, 0775, true);
$tmp = $file . '.' . getmypid() . '.tmp';
if (@file_put_contents($tmp, $tile) !== false) @rename($tmp, $file);

/*
 * Prune occasionally rather than on every request: shared hosting does not
 * want a directory scan per tile. One request in fifty clears anything older
 * than an hour, which bounds the directory without a cron.
 */
if (mt_rand(1, 50) === 1) {
    $cutoff = time() - 3600;
    foreach ((array)@glob($TILE_DIR . '/*.pbf') as $old) {
        if (@filemtime($old) < $cutoff) @unlink($old);
    }
}

traffic_send_tile($file, 'MISS');
