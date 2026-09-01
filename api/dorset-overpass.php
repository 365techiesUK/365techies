<?php
/*
 * OpenStreetMap road geometry for the Bournemouth365 Portal — Overpass API.
 *
 * The traffic layer paints TomTom flow onto real road centrelines, and this is
 * where those centrelines come from. Without it the layer fetches flow tiles
 * successfully and then has nothing to draw them on: live mode, zero coverage.
 *
 * Licence: (c) OpenStreetMap contributors, ODbL 1.0. Commercial use permitted,
 * attribution mandatory while shown and carried in the credits panel.
 *
 * ⚠️ OVERPASS IS DONATED INFRASTRUCTURE, NOT A PRODUCT.
 * The public instances are run by volunteers and a nonprofit; they publish no
 * paid tier and they ask for restraint rather than enforcing it with a bill.
 * Our dev IP has already been refused by all three main mirrors once (July
 * 2026), which is what a community instance does instead of invoicing you.
 *
 * ============================================================================
 * ⚠️ THIS ENDPOINT NO LONGER ACCEPTS OVERPASS QL. THAT IS THE WHOLE POINT.
 * ============================================================================
 * It used to take a raw QL query as POST `data` and forward it upstream, with
 * "admission control" that checked only the length and that SOME parenthesised
 * four-number tuple fell inside a Dorset envelope. Nothing looked at what the
 * query actually did. Every one of these was admitted:
 *
 *   - a Dorset bbox sitting in a slash-star comment beside a planet-wide
 *     `area` query;
 *   - the same tuple inside a string literal;
 *   - a valid bounded statement followed by a second unbounded one;
 *   - `[timeout:900][maxsize:2000000000]` with recursion operators and
 *     `out geom meta`.
 *
 * curl gives up after 40 s but Overpass does not cancel, so an admitted
 * `[timeout:3600]` burns up to an hour of volunteer CPU under our own honest,
 * pinned User-Agent. The repository is public, so the path, the parameter and
 * the absence of any auth were all published. The realistic outcome was never
 * a bill — it was being banned by every mirror, which kills the traffic layer,
 * plus a defensible accusation that we had pointed a DoS amplifier at a
 * charity from a map we then showed to the press.
 *
 * A filter that tries to decide whether attacker-supplied QL is safe is the
 * wrong shape: it has to be right every time against a Turing-complete-ish
 * query language, and the attacker only has to be right once. So the query is
 * no longer input at all. The only legitimate caller is our own traffic layer,
 * which needs exactly one query with one bounding box and one boolean, so that
 * is the entire API surface now:
 *
 *   GET|POST dorset-overpass.php?s=..&w=..&n=..&e=..[&major=1]
 *
 * Four numbers. The QL is built here from a fixed template, the timeout is
 * ours, and there is no code path that sends a caller-supplied string upstream.
 *
 * ⚠️ AND THE BBOX IS SNAPPED TO A GRID, WHICH IS A CACHE FIX AS WELL AS A
 * SAFETY ONE. The old cache key was sha1 of the raw QL, which embedded
 * full-precision floats straight from a moving camera — so two users looking at
 * the same street almost never shared an entry, and under a press spike
 * essentially every request was a miss, six a minute got served and everyone
 * else got a 429. Snapping outward to 0.01 degrees turns thousands of unique
 * keys into a few dozen shared ones, and over-fetches by at most ~1 km of road
 * geometry, which is free.
 *
 * NO closing tag in this file.
 */
error_reporting(0);
require __DIR__ . '/dorset-lib.php';

$CACHE_DIR = __DIR__ . '/dorset-overpass-cache';
$RATE      = __DIR__ . '/dorset-overpass-rate.json';

// Road centrelines change on the scale of construction projects, not minutes.
$TTL = 7 * 86400;

// Ours, not the caller's. Cold Overpass queries were measured at 5-20 s.
$QUERY_TIMEOUT = 25;

// Snap grid in degrees. 0.01 deg is ~1.1 km of latitude.
$SNAP = 0.01;

/*
 * The client clamps each axis to 0.05 deg before it ever calls (see
 * clampBoundsAroundCenter in trafficBounds.js), and snapping outward can add at
 * most one grid cell per edge. 0.12 is therefore comfortable headroom over any
 * legitimate request and still far too small to be worth abusing.
 */
$MAX_SPAN = 0.12;

$UPSTREAMS = array(
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://lz4.overpass-api.de/api/interpreter',
    // Community full-planet instance (privateforge nonprofit), added when the
    // three above refused our dev IP.
    'https://overpass.private.coffee/api/interpreter',
);

/* --------------------------------------------------------------- input */

/*
 * GET and POST both accepted: the request carries four numbers and no secret,
 * so there is nothing a body buys us, and GET keeps it debuggable with curl.
 */
$src = ($_SERVER['REQUEST_METHOD'] === 'POST' && !empty($_POST)) ? $_POST : $_GET;

foreach (array('s', 'w', 'n', 'e') as $k) {
    if (!isset($src[$k]) || !is_string($src[$k]) || !is_numeric($src[$k])) {
        dorset_send(array('ok' => false, 'reason' => 'bad-bbox', 'elements' => array()), 400);
    }
}
$s = (float)$src['s'];
$w = (float)$src['w'];
$n = (float)$src['n'];
$e = (float)$src['e'];
$major = !empty($src['major']);

// Ordering must be sane before anything geometric is asked of it.
if (!($s < $n) || !($w < $e)) {
    dorset_send(array('ok' => false, 'reason' => 'bbox-inverted', 'elements' => array()), 400);
}

/*
 * The generous envelope around the conurbation: the viewport can overshoot the
 * data box while panning, and refusing that would break the layer at the edges.
 * This is deliberately wider than DORSET_W/S/E/N.
 */
$LIM = array('s' => 50.3, 'w' => -2.9, 'n' => 51.3, 'e' => -1.0);
if ($s < $LIM['s'] || $n > $LIM['n'] || $w < $LIM['w'] || $e > $LIM['e']) {
    dorset_send(array('ok' => false, 'reason' => 'bbox-outside-dorset', 'elements' => array()), 400);
}

// Snap OUTWARD so the caller's area is always fully covered by the result.
$s = floor($s / $SNAP) * $SNAP;
$w = floor($w / $SNAP) * $SNAP;
$n = ceil($n / $SNAP) * $SNAP;
$e = ceil($e / $SNAP) * $SNAP;

if (($n - $s) > $MAX_SPAN || ($e - $w) > $MAX_SPAN) {
    dorset_send(array('ok' => false, 'reason' => 'bbox-too-large', 'elements' => array()), 400);
}

/* --------------------------------------------------------------- query */

/*
 * Built here, from constants. The two regexes mirror buildOverpassQuery() in
 * src/data/traffic.js exactly — if one changes the other must, and the shared
 * fixture in the fork's tests pins them together.
 */
$regex = $major
    ? '^(motorway|trunk|primary|secondary)$'
    : '^(motorway|trunk|primary|secondary|tertiary|residential|unclassified)$';

$query = sprintf(
    '[out:json][timeout:%d];(way["highway"~"%s"](%.2f,%.2f,%.2f,%.2f););out geom qt;',
    $QUERY_TIMEOUT, $regex, $s, $w, $n, $e
);

/* ------------------------------------------------------------------ cache */

if (!is_dir($CACHE_DIR)) @mkdir($CACHE_DIR, 0775, true);
// Key from the SNAPPED box and the flag, not from the query text — same inputs,
// same file, whoever asks.
$key  = sha1(sprintf('%.2f,%.2f,%.2f,%.2f,%d', $s, $w, $n, $e, $major ? 1 : 0));
$file = $CACHE_DIR . '/' . $key . '.json';

function overpass_send_file($file, $status) {
    // Check the read: an unchecked readfile() that fails still returns 200 with
    // an empty body, which the client reads as "this area has no roads".
    $bytes = @file_get_contents($file);
    if ($bytes === false || strlen($bytes) === 0) {
        dorset_send(array('ok' => false, 'reason' => 'cache-unreadable', 'elements' => array()), 503);
    }
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Overpass-Cache: ' . $status);
    header('X-Source: (c) OpenStreetMap contributors, ODbL 1.0');
    header('Content-Length: ' . strlen($bytes));
    echo $bytes;
    exit;
}

if (is_file($file) && (time() - (int)@filemtime($file)) < $TTL) {
    overpass_send_file($file, 'HIT');
}

/*
 * Cache misses are the only thing that reaches a volunteer server, so this
 * ceiling is on misses rather than requests. Six a minute is ample for a map
 * panning around one town and nowhere near enough to be a nuisance — and with
 * the snapped keys above, a crowd looking at the same place now shares one.
 */
if (!dorset_rate_ok($RATE, 6)) {
    if (is_file($file)) overpass_send_file($file, 'STALE-RATE');
    dorset_send(array('ok' => false, 'reason' => 'rate', 'elements' => array()), 429);
}

/* --------------------------------------------------------------- upstream */

$body = null;
foreach ($UPSTREAMS as $url) {
    $ch = @curl_init($url);
    if (!$ch) continue;
    @curl_setopt_array($ch, array(
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => 'data=' . rawurlencode($query),
        // Cold Overpass queries were measured at 5-20 s; anything less times
        // out on exactly the queries that most need the cache.
        CURLOPT_TIMEOUT        => 40,
        CURLOPT_CONNECTTIMEOUT => 8,
        CURLOPT_HTTPHEADER     => array(
            'Content-Type: application/x-www-form-urlencoded',
            'Accept: application/json',
        ),
        CURLOPT_USERAGENT      => '365techies-bournemouth365/1.0 (+https://365techies.co.uk/)',
    ));
    $out  = @curl_exec($ch);
    $code = (int)@curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    @curl_close($ch);
    if ($out !== false && $code >= 200 && $code < 300) {
        $j = json_decode($out, true);
        if (is_array($j) && isset($j['elements'])) { $body = $out; break; }
    }
    // A refused or throttled mirror fails in milliseconds; try the next.
}

if ($body === null) {
    // Every mirror unavailable. A week-old road network is still the right road
    // network, so stale beats empty by a wide margin here.
    if (is_file($file)) overpass_send_file($file, 'STALE-UPSTREAM');
    dorset_send(array('ok' => false, 'reason' => 'all-mirrors-unavailable', 'elements' => array()), 503);
}

$tmp = $file . '.' . getmypid() . '.tmp';
if (@file_put_contents($tmp, $body) !== false) @rename($tmp, $file);

// Occasional prune: one call in forty clears anything past its TTL, which
// bounds the directory without needing a cron.
if (mt_rand(1, 40) === 1) {
    $cutoff = time() - $TTL;
    foreach ((array)@glob($CACHE_DIR . '/*.json') as $old) {
        if (@filemtime($old) < $cutoff) @unlink($old);
    }
}

overpass_send_file($file, 'MISS');
