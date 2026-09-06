<?php
/*
 * Place search for the Bournemouth365 live map — Google Geocoding, server-side.
 *
 * ⚠️ WHY THIS EXISTS (audit, 6 Sep 2026). The map's browser key is restricted
 * to this site's pages, which is exactly right for the 3D tiles it fetches.
 * But Google's Geocoding WEB service refuses referrer-restricted keys outright
 * ("API keys with referer restrictions cannot be used with this API"), so a
 * geocode from the page could never succeed: the search box was silently dead
 * on production. This endpoint holds a separate SERVER key ($GOOGLE_GEOCODE_KEY
 * in dorset-keys.php; restrict it to the Geocoding API and to this server's
 * IP in the Google console) and answers in Google's own shape, trimmed, so the
 * client's existing handling is unchanged.
 *
 *   GET dorset-geocode.php?q=<place>[&bounds=<lat,lng|lat,lng>]   forward
 *   GET dorset-geocode.php?latlng=<lat>,<lng>                      reverse
 *
 * Answer: { ok, status, generated, results: [ { formatted_address,
 *           geometry: { location, viewport, bounds, location_type }, types } ] }
 * with at most three results. `status` is Google's (OK, ZERO_RESULTS, ...).
 * Not configured: 503 { ok:false, status:'NOT_CONFIGURED', reason:'not-configured' }
 * — the map then says "Place search is not set up yet" rather than nothing.
 *
 * Guards: query <= 120 chars; a site-wide 30 lookups a minute (the map is one
 * search box, not an API); results cached 24 h by query so repeats cost
 * nothing; `region=gb` biases towards British places and the client passes
 * its viewport as `bounds` so "the pier" means the one on screen.
 *
 * Stores (gitignored; denied by the dorset-*-(cache|rate).json rule in
 * .htaccess): dorset-geocode-cache.json, dorset-geocode-rate.json.
 *
 * NO closing tag.
 */
error_reporting(0);
require __DIR__ . '/dorset-lib.php';

$CACHE = __DIR__ . '/dorset-geocode-cache.json';
$RATE  = __DIR__ . '/dorset-geocode-rate.json';
$PER_MINUTE  = 30;
$TTL         = 86400;
$MAX_ENTRIES = 300;

$q      = isset($_GET['q'])      ? trim((string)$_GET['q'])      : '';
$latlng = isset($_GET['latlng']) ? trim((string)$_GET['latlng']) : '';
$bounds = isset($_GET['bounds']) ? trim((string)$_GET['bounds']) : '';

if ($q === '' && $latlng === '') {
    dorset_send(array('ok' => false, 'status' => 'INVALID_REQUEST', 'reason' => 'usage',
                      'usage' => 'GET ?q=<place> or ?latlng=<lat>,<lng>', 'results' => array()), 400);
}
if (strlen($q) > 120) {
    dorset_send(array('ok' => false, 'status' => 'INVALID_REQUEST', 'reason' => 'too-long', 'results' => array()), 400);
}
$NUM = '-?\d{1,3}(?:\.\d+)?';
if ($latlng !== '' && !preg_match('/^' . $NUM . ',' . $NUM . '$/', $latlng)) {
    dorset_send(array('ok' => false, 'status' => 'INVALID_REQUEST', 'reason' => 'bad-latlng', 'results' => array()), 400);
}
// A malformed bias is dropped, not fatal: the search still runs, just unbiased.
if ($bounds !== '' && !preg_match('/^' . $NUM . ',' . $NUM . '\|' . $NUM . ',' . $NUM . '$/', $bounds)) {
    $bounds = '';
}

$keys = dorset_keys();
$key  = isset($keys['google_geocode']) ? trim((string)$keys['google_geocode']) : '';
if ($key === '') {
    dorset_send(array('ok' => false, 'status' => 'NOT_CONFIGURED', 'reason' => 'not-configured', 'results' => array()), 503);
}

// ── cache: one JSON map, keyed by the normalised request ──
$cacheKey = sha1(strtolower($q) . '|' . $latlng . '|' . $bounds);
$map = array();
$raw = @file_get_contents($CACHE);
if ($raw !== false) {
    $j = json_decode($raw, true);
    if (is_array($j)) $map = $j;
}
if (isset($map[$cacheKey]) && is_array($map[$cacheKey]) && isset($map[$cacheKey]['at'], $map[$cacheKey]['body'])
    && (time() - (int)$map[$cacheKey]['at']) < $TTL) {
    $hit = $map[$cacheKey]['body'];
    $hit['cached'] = true;
    dorset_send($hit);
}

if (!dorset_rate_ok($RATE, $PER_MINUTE)) {
    dorset_send(array('ok' => false, 'status' => 'OVER_QUERY_LIMIT', 'reason' => 'rate', 'results' => array()), 429);
}

// ── Google ──
$params = array('key' => $key, 'region' => 'gb', 'language' => 'en-GB');
if ($q !== '') $params['address'] = $q; else $params['latlng'] = $latlng;
if ($bounds !== '') $params['bounds'] = $bounds;
$g = dorset_http_json('https://maps.googleapis.com/maps/api/geocode/json?' . http_build_query($params), 10);
if (!is_array($g) || !isset($g['status'])) {
    dorset_send(array('ok' => false, 'status' => 'UNKNOWN_ERROR', 'reason' => 'upstream', 'results' => array()), 502);
}

$results = array();
if (isset($g['results']) && is_array($g['results'])) {
    foreach (array_slice($g['results'], 0, 3) as $r) {
        $geom = isset($r['geometry']) && is_array($r['geometry']) ? $r['geometry'] : array();
        $results[] = array(
            'formatted_address' => isset($r['formatted_address']) ? (string)$r['formatted_address'] : '',
            'geometry' => array(
                'location'      => isset($geom['location'])      ? $geom['location']      : null,
                'viewport'      => isset($geom['viewport'])      ? $geom['viewport']      : null,
                'bounds'        => isset($geom['bounds'])        ? $geom['bounds']        : null,
                'location_type' => isset($geom['location_type']) ? $geom['location_type'] : null,
            ),
            'types' => isset($r['types']) && is_array($r['types']) ? array_slice($r['types'], 0, 8) : array(),
        );
    }
}
$status = (string)$g['status'];
$ok = ($status === 'OK' || $status === 'ZERO_RESULTS');
$out = array('ok' => $ok, 'status' => $status, 'generated' => gmdate('c'), 'results' => $results);
if (!$ok) {
    // Google's own refusals (a wrong key, a spent quota) are the server's fault,
    // never the visitor's: say so with a reason the client can show.
    $out['reason'] = 'upstream-' . strtolower($status);
    dorset_send($out, 502);
}

// ── remember it ──
$map[$cacheKey] = array('at' => time(), 'body' => $out);
if (count($map) > $MAX_ENTRIES) {
    uasort($map, function ($a, $b) {
        $x = isset($a['at']) ? (int)$a['at'] : 0;
        $y = isset($b['at']) ? (int)$b['at'] : 0;
        return $x - $y;
    });
    $map = array_slice($map, count($map) - $MAX_ENTRIES, null, true);
}
@file_put_contents($CACHE, json_encode($map), LOCK_EX);
dorset_send($out);
