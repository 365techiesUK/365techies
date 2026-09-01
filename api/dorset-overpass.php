<?php
/*
 * OpenStreetMap road geometry for the Bournemouth365 Portal — Overpass API.
 *
 * The traffic layer paints TomTom flow onto real road centrelines, and this is
 * where those centrelines come from. Without it the layer fetches flow tiles
 * successfully and then has nothing to draw them on: live mode, zero coverage.
 *
 * Licence: © OpenStreetMap contributors, ODbL 1.0. Commercial use permitted,
 * attribution mandatory while shown and carried in the credits panel.
 *
 * ⚠️ OVERPASS IS DONATED INFRASTRUCTURE, NOT A PRODUCT.
 * The public instances are run by volunteers and a nonprofit; they publish no
 * paid tier and they ask for restraint rather than enforcing it with a bill.
 * Our dev IP has already been refused by all three main mirrors once (July
 * 2026), which is what a community instance does instead of invoicing you.
 *
 * Everything here follows from that:
 *   - a SEVEN DAY cache, because road centrelines essentially do not move.
 *     The traffic layer re-asks for the same viewport constantly; upstream
 *     should see that roughly once a week, not once a minute;
 *   - a hard rate ceiling on cache misses;
 *   - mirrors tried in order, so one refusing does not kill the layer;
 *   - an honest user agent so a mirror operator can find us if we misbehave.
 *
 * ⚠️ AND THE QUERY IS THE CACHE KEY, WHICH MEANS IT MUST BE BOUNDED.
 * An open proxy that forwards arbitrary Overpass QL from the internet is a
 * free denial-of-service weapon pointed at a charity. So the query must look
 * like the traffic layer's own: a bounded bbox inside Dorset, no recursion
 * into the whole planet, and a size limit. Anything else is refused here
 * rather than passed upstream.
 *
 * NO closing tag in this file.
 */
error_reporting(0);
require __DIR__ . '/dorset-lib.php';

$CACHE_DIR = __DIR__ . '/dorset-overpass-cache';
$RATE      = __DIR__ . '/dorset-overpass-rate.json';

// Road geometry changes on the scale of construction projects, not minutes.
$TTL = 7 * 86400;

$UPSTREAMS = array(
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://lz4.overpass-api.de/api/interpreter',
    // Community full-planet instance (privateforge nonprofit), added when the
    // three above refused our dev IP.
    'https://overpass.private.coffee/api/interpreter',
);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    dorset_send(array('ok' => false, 'reason' => 'POST only'), 405);
}

$query = isset($_POST['data']) ? (string)$_POST['data'] : '';
if ($query === '') {
    $raw = (string)@file_get_contents('php://input');
    parse_str($raw, $parsed);
    $query = isset($parsed['data']) ? (string)$parsed['data'] : '';
}

/* ------------------------------------------------------- query admission */

/*
 * ⚠️ THIS IS THE GUARD THAT STOPS US BECOMING AN OPEN RELAY.
 * Refuse anything that is not recognisably the traffic layer's own query
 * against our own corner of the world. Being strict here costs nothing — the
 * only legitimate caller is our map — and being lax points a free
 * DoS amplifier at volunteer-run infrastructure.
 */
if (strlen($query) > 4000) {
    dorset_send(array('ok' => false, 'reason' => 'query-too-long'), 400);
}

// Must carry a bounding box, and every corner of it must be inside a generous
// Dorset envelope. Overpass bbox order is south,west,north,east.
if (!preg_match_all('/\(\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*\)/', $query, $boxes, PREG_SET_ORDER)) {
    dorset_send(array('ok' => false, 'reason' => 'no-bbox'), 400);
}
// Generous margin around the conurbation: the viewport can overshoot the data
// box while panning, and refusing that would break the layer at the edges.
$LIM = array('s' => 50.3, 'w' => -2.9, 'n' => 51.3, 'e' => -1.0);
foreach ($boxes as $b) {
    $s = (float)$b[1]; $w = (float)$b[2]; $n = (float)$b[3]; $e = (float)$b[4];
    if ($s < $LIM['s'] || $n > $LIM['n'] || $w < $LIM['w'] || $e > $LIM['e'] || $s > $n || $w > $e) {
        dorset_send(array('ok' => false, 'reason' => 'bbox-outside-dorset'), 400);
    }
}

/* ------------------------------------------------------------------ cache */

if (!is_dir($CACHE_DIR)) @mkdir($CACHE_DIR, 0775, true);
$key  = sha1($query);
$file = $CACHE_DIR . '/' . $key . '.json';

function overpass_send_file($file, $status) {
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Overpass-Cache: ' . $status);
    header('X-Source: (c) OpenStreetMap contributors, ODbL 1.0');
    readfile($file);
    exit;
}

if (is_file($file) && (time() - (int)@filemtime($file)) < $TTL) {
    overpass_send_file($file, 'HIT');
}

/*
 * Cache misses are the only thing that reaches a volunteer server, so this
 * ceiling is on misses rather than requests. Six a minute is ample for a map
 * panning around one town and nowhere near enough to be a nuisance.
 */
if (!dorset_rate_ok($RATE, 6)) {
    if (is_file($file)) overpass_send_file($file, 'STALE-RATE');
    dorset_send(array('ok' => false, 'reason' => 'rate'), 429);
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
    // Every mirror unavailable. A week-old road network is still the right
    // road network, so stale beats empty by a wide margin here.
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
