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
$RATE      = __DIR__ . '/dorset-traffic-rate.json';

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

/*
 * ⚠️ RESERVE BEFORE FETCHING, NOT AFTER — AND UNDER A REAL LOCK.
 * The old shape read the budget, fetched the tile, then bumped the counter with
 * only the write locked. Two problems, both silent: concurrent workers lost
 * increments (measured: 8 × 300 bumps ended at 11), and the check-then-fetch
 * gap let any number of simultaneous requests all pass a check made against the
 * same stale count. This takes the slot FIRST, atomically, and gives it back if
 * the fetch fails — so the counter can only ever over-count, never under-count.
 * Over-counting costs us a few tiles of headroom; under-counting costs money.
 */
function traffic_budget_reserve($file, $limit) {
    $got = dorset_counter_update($file, function ($b) use ($limit) {
        if (!is_array($b) || !isset($b['month']) || $b['month'] !== traffic_month()) {
            $b = array('month' => traffic_month(), 'count' => 0);
        }
        if ((int)$b['count'] >= $limit) return array(null, false);
        $b['count']++;
        return array($b, true);
    });
    return $got === true;
}

/** Hand a reserved slot back when the upstream fetch did not happen. */
function traffic_budget_release($file) {
    dorset_counter_update($file, function ($b) {
        if (!is_array($b) || !isset($b['month']) || $b['month'] !== traffic_month()) return array(null, null);
        if ((int)$b['count'] > 0) $b['count']--;
        return array($b, null);
    });
}

/* ------------------------------------------------------- geographic guard */

/*
 * ⚠️ WITHOUT THIS, THIS ENDPOINT IS A GLOBAL TILE PROXY BILLED TO US.
 * z/x/y were previously range-checked but never tested against Dorset, so
 * Tokyo (z12/3637/1612) and New York (z12/1206/1539) were both served — 23.4
 * trillion reachable tiles against the 59,540 the map actually needs, each
 * miss writing a file to shared hosting and holding a PHP worker through a
 * 15-second curl. The repo is public, so the path and its parameters are
 * published; nothing about this was obscure.
 */
function traffic_tile_lon($x, $z) { return $x / pow(2, $z) * 360.0 - 180.0; }
function traffic_tile_lat($y, $z) {
    $n = M_PI - 2.0 * M_PI * $y / pow(2, $z);
    return rad2deg(atan(0.5 * (exp($n) - exp(-$n))));
}

/** True when tile z/x/y overlaps the conurbation box at all. */
function traffic_tile_in_dorset($z, $x, $y) {
    $w = traffic_tile_lon($x, $z);
    $e = traffic_tile_lon($x + 1, $z);
    $n = traffic_tile_lat($y, $z);
    $s = traffic_tile_lat($y + 1, $z);
    // Standard AABB overlap. Touching edges count as inside: a viewport sitting
    // exactly on the boundary must not lose its tiles.
    return !($e < DORSET_W || $w > DORSET_E || $n < DORSET_S || $s > DORSET_N);
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
/*
 * The client asks for z12 and nothing else (flowTiles.js defaults to 12 and no
 * caller overrides it), so 10-16 is already generous headroom. The old 8-22
 * allowed 2^22 x 2^22 addressable tiles for no reason any caller needed.
 */
if ($z < 10 || $z > 16 || $x < 0 || $y < 0 || $x >= (1 << $z) || $y >= (1 << $z)) {
    dorset_send(array('ok' => false, 'reason' => 'tile-out-of-range'), 400);
}
if (!traffic_tile_in_dorset($z, $x, $y)) {
    dorset_send(array('ok' => false, 'reason' => 'tile-outside-dorset'), 400);
}

$file = $TILE_DIR . '/' . $z . '_' . $x . '_' . $y . '.pbf';

function traffic_send_tile($file, $status) {
    /*
     * ⚠️ CHECK THE READ. An unchecked readfile() that fails still leaves a
     * 200 with the right Content-Type and an empty body, and a vector-tile
     * decoder reads an empty tile as "no congestion anywhere" — a confident
     * false statement about the roads rather than a visible failure.
     */
    $bytes = @file_get_contents($file);
    if ($bytes === false || strlen($bytes) === 0) {
        http_response_code(503);
        exit;
    }
    header('Content-Type: application/x-protobuf');
    header('Cache-Control: no-store');
    header('X-Tile-Cache: ' . $status);
    header('X-Source: Traffic flow data (c) TomTom');
    header('Content-Length: ' . strlen($bytes));
    echo $bytes;
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

/*
 * A per-minute ceiling on MISSES, matching every sibling endpoint. This was the
 * only dorset-*.php with no rate limit at all. 120/min is far above what a map
 * panning around one conurbation needs (a full z12 cover of the box is ~30
 * tiles) and far below what an unattended script can spend.
 */
if (!dorset_rate_ok($RATE, 120)) {
    if (is_file($file)) traffic_send_tile($file, 'STALE-RATE');
    dorset_send(array('ok' => false, 'reason' => 'rate'), 429);
}

// Take the budget slot BEFORE the fetch — see traffic_budget_reserve.
if (!traffic_budget_reserve($BUDGET, $MONTHLY_BUDGET)) {
    // Out of budget. A stale tile beats no tile; only an uncached one fails.
    if (is_file($file)) traffic_send_tile($file, 'STALE-BUDGET');
    http_response_code(503);
    exit;
}

$url = sprintf(
    // ⚠️ THE STYLE SEGMENT IS `relative`, NOT `relative0`.
    // relative0 is a RASTER flow style; on the vector (.pbf) endpoint it is
    // rejected, and the only symptom was a 503 with the budget counter never
    // moving — which reads exactly like a missing key. Matches the dev proxy.
    'https://api.tomtom.com/traffic/map/4/tile/flow/relative/%d/%d/%d.pbf?key=%s',
    $z, $x, $y, rawurlencode($keys['tomtom'])
);

list($tile, $code) = dorset_http($url, 15, array('Accept: application/x-protobuf'));

if ($tile === null || strlen($tile) === 0) {
    // Nothing was delivered, so give the reserved slot back before degrading.
    traffic_budget_release($BUDGET);
    // 403/429 or a wobble: serve stale if we have it. Never blank.
    if (is_file($file)) traffic_send_tile($file, 'STALE-UPSTREAM');
    http_response_code(503);
    exit;
}

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
