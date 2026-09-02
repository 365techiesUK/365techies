<?php
/*
 * Latest Sentinel-2 pass over the conurbation — Copernicus Data Space.
 *
 * What this buys the portal is not resolution: Google's photoreal tiles are
 * far sharper. It is RECENCY. Photogrammetry is months or years old; a
 * Sentinel-2 pass is days old, and it is the only layer that can answer "what
 * did the coast look like last week".
 *
 * Licence: free, full and open, commercial use included. The attribution is
 * mandatory and exactly worded:
 *     Contains modified Copernicus Sentinel data [Year]   (year = capture year)
 *
 * ⚠️ THE SCENE DATE IS NOT OPTIONAL, IT IS THE POINT.
 * A layer called "latest satellite pass" that cannot say WHEN breaks the rule
 * the whole portal runs on — every reading carries its provenance and date.
 * The Process API returns pixels and nothing else, so the acquisition date has
 * to come from a separate Catalog search. Both are cached together, and if the
 * catalog lookup fails the image is still served but `captured` is null and the
 * client must say "date unavailable" rather than invent one or imply "today".
 *
 * USAGE:
 *     dorset-satellite.php           -> the JPEG itself
 *     dorset-satellite.php?meta=1    -> {ok, captured, cloudCover, source}
 *
 * ⚠️ BUDGET. The free tier is 10,000 processing units a month and one render
 * of this box costs roughly 50-100. The six-hour cache is what keeps that in
 * the noise; do not shorten it casually. Sentinel-2 revisits every few days,
 * so a fresher cache would buy nothing anyway.
 *
 * ⚠️ JPEG, NOT PNG. The first working version asked for PNG and produced a
 * 4.5 MB file that had not finished downloading when frames were captured, so
 * the layer looked broken when it was merely late. Satellite imagery has no
 * transparency to preserve; JPEG costs about 700 KB.
 *
 * NO closing tag in this file.
 */
error_reporting(0);
require __DIR__ . '/dorset-lib.php';

$IMG   = __DIR__ . '/dorset-satellite.jpg';
$META  = __DIR__ . '/dorset-satellite-cache.json';
$TOKEN = __DIR__ . '/dorset-satellite-token.json';
$RATE  = __DIR__ . '/dorset-satellite-rate.json';

$TTL = 6 * 3600;
$WANT_META = isset($_GET['meta']);

// Bump when the meta payload gains or loses a field, so a deploy is not
// invisible behind a six-hour cache written by the previous version.
$SHAPE = 3;

/* ------------------------------------------------------------ serve cache */

/**
 * "Contains modified Copernicus Sentinel data [Year]" per the Sentinel Data
 * Legal Notice. The year is the capture year; when the catalogue lookup failed
 * and there is no capture date the image is still served, so the statement
 * falls back to the current UTC year rather than vanishing.
 */
function sat_source_statement($captured) {
    $year = (is_string($captured) && preg_match('/^(\d{4})-/', $captured, $m)) ? $m[1] : gmdate('Y');
    return 'Contains modified Copernicus Sentinel data ' . $year;
}

function sat_serve_image($file, $meta) {
    header('Content-Type: image/jpeg');
    header('Cache-Control: public, max-age=3600');
    // Provenance travels with the bytes, so a caller that only fetches the
    // image can still label it honestly without a second request.
    if (!empty($meta['captured'])) header('X-Captured: ' . $meta['captured']);
    // The year in the legal-notice wording is the year of the DATA (see the
    // 'source' field below), never a literal.
    header('X-Source: ' . (!empty($meta['source']) ? $meta['source'] : sat_source_statement($meta['captured'] ?? null)));
    readfile($file);
    exit;
}

$meta = dorset_cache_get($META, $TTL, $SHAPE);
if ($meta !== null && is_file($IMG)) {
    if ($WANT_META) dorset_send($meta);
    sat_serve_image($IMG, $meta);
}

$keys = dorset_keys();
if (empty($keys['cdse_id']) || empty($keys['cdse_secret'])) {
    if ($WANT_META) dorset_send(array('ok' => false, 'reason' => 'not-configured'));
    http_response_code(503);
    exit;
}

// Four renders an hour is already far more than the six-hour cache needs; this
// only catches a stampede when the cache expires under load.
if (!dorset_rate_ok($RATE, 4)) {
    $stale = dorset_cache_stale($META, 7 * 86400);
    if ($stale !== null && is_file($IMG)) {
        if ($WANT_META) { $stale['stale'] = true; dorset_send($stale); }
        sat_serve_image($IMG, $stale);
    }
    if ($WANT_META) dorset_send(array('ok' => false, 'reason' => 'rate'));
    http_response_code(503);
    exit;
}

/* ------------------------------------------------------------------ token */

/**
 * OAuth2 client credentials. Tokens last an hour; this caches for fifty
 * minutes so a request never races the expiry.
 */
function sat_token($file, $id, $secret) {
    $cached = dorset_cache_get($file, 3000);
    if (is_array($cached) && !empty($cached['access_token'])) return $cached['access_token'];

    $ch = @curl_init('https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token');
    if (!$ch) return null;
    @curl_setopt_array($ch, array(
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_TIMEOUT        => 20,
        CURLOPT_POSTFIELDS     => http_build_query(array(
            'grant_type'    => 'client_credentials',
            'client_id'     => $id,
            'client_secret' => $secret,
        )),
        CURLOPT_USERAGENT      => '365techies-bournemouth365/1.0 (+https://365techies.co.uk/)',
    ));
    $body = @curl_exec($ch);
    $code = (int)@curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    @curl_close($ch);
    if ($body === false || $code < 200 || $code >= 300) return null;
    $j = json_decode($body, true);
    if (!is_array($j) || empty($j['access_token'])) return null;
    dorset_cache_put($file, array('access_token' => $j['access_token']));
    return $j['access_token'];
}

$token = sat_token($TOKEN, $keys['cdse_id'], $keys['cdse_secret']);
if ($token === null) {
    if ($WANT_META) dorset_send(array('ok' => false, 'reason' => 'auth'));
    http_response_code(503);
    exit;
}

/** POST JSON to a Sentinel Hub endpoint, returning the raw body. */
function sat_post($url, $token, $payload, $accept, $timeout = 60) {
    $ch = @curl_init($url);
    if (!$ch) return null;
    // $token may be null: the STAC catalogue is public and rejects nothing,
    // but sending an empty bearer would make it 401.
    $hdr = array('Content-Type: application/json', 'Accept: ' . $accept);
    if ($token !== null) $hdr[] = 'Authorization: Bearer ' . $token;
    @curl_setopt_array($ch, array(
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_TIMEOUT        => $timeout,
        CURLOPT_POSTFIELDS     => json_encode($payload),
        CURLOPT_HTTPHEADER     => $hdr,
        CURLOPT_USERAGENT      => '365techies-bournemouth365/1.0 (+https://365techies.co.uk/)',
    ));
    $body = @curl_exec($ch);
    $code = (int)@curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    @curl_close($ch);
    return ($body !== false && $code >= 200 && $code < 300) ? $body : null;
}

$BBOX = array(DORSET_W, DORSET_S, DORSET_E, DORSET_N);
$from = gmdate('Y-m-d\TH:i:s\Z', time() - 30 * 86400);
$to   = gmdate('Y-m-d\TH:i:s\Z');

/* ---------------------------------------------------------------- catalog */

/*
 * Which scene are we actually about to render? The Process API mosaics by
 * least cloud cover across the window, so the answer is the least-cloudy scene
 * in the same window — asked for explicitly rather than assumed.
 */
$captured = null; $cloud = null; $catReason = null;

/*
 * ⚠️ THE PUBLIC STAC CATALOGUE, NOT THE SENTINEL HUB ONE.
 * Two wrong turns are recorded here because both failed silently as
 * `captured: null`:
 *   1. A cql2-json filter on eo:cloud_cover, which the service rejected.
 *   2. sh.dataspace.copernicus.eu/api/v1/catalog/1.0.0/search with a bearer
 *      token, which returned nothing usable at all.
 * The catalogue that answers is stac.dataspace.copernicus.eu/v1/search, it
 * needs NO authentication, and the collection id is lowercase `sentinel-2-l2a`
 * (`SENTINEL-2` is rejected as non-existent). Verified live: 36 scenes over
 * this box in a 30-day window, cleanest at 0.0% cloud.
 *
 * No filter block: the loop below picks the least-cloudy scene, which is what
 * the Process API mosaics to anyway. Ask for less, and it works.
 */
$cat = sat_post('https://stac.dataspace.copernicus.eu/v1/search', null, array(
    'bbox'        => $BBOX,
    'datetime'    => $from . '/' . $to,
    'collections' => array('sentinel-2-l2a'),
    'limit'       => 100,
), 'application/json', 30);

if ($cat === null) {
    $catReason = 'catalog-request-failed';
} else {
    $j = json_decode($cat, true);
    if (!is_array($j) || !isset($j['features'])) {
        $catReason = 'catalog-unexpected-shape';
    } elseif (!count($j['features'])) {
        $catReason = 'catalog-no-scenes';
    } else {
        $best = null;
        foreach ($j['features'] as $f) {
            $cc = isset($f['properties']['eo:cloud_cover']) ? (float)$f['properties']['eo:cloud_cover'] : 100.0;
            // Match the Process API's own mosaickingOrder=leastCC and its
            // maxCloudCoverage=35, so the date we report is the date of the
            // scene the pixels actually came from.
            if ($cc > 35) continue;
            if ($best === null || $cc < $best['cc']) {
                $best = array('cc' => $cc, 'dt' => isset($f['properties']['datetime']) ? $f['properties']['datetime'] : null);
            }
        }
        if ($best === null) $catReason = 'catalog-all-cloudy';
        else { $captured = $best['dt']; $cloud = $best['cc']; }
    }
}

/* ----------------------------------------------------------------- render */

// Degrees are not square this far north; sizing the raster to the box's own
// aspect keeps the coastline from stretching.
$WIDTH  = 2048;
$HEIGHT = (int)round($WIDTH * ((DORSET_N - DORSET_S) / (DORSET_E - DORSET_W)));

$evalscript = "//VERSION=3\n"
  . "function setup(){return{input:['B02','B03','B04'],output:{bands:3}}}\n"
  // Raw reflectance is very dark. 3.6 with a slight gamma lift is what made
  // the beach and the harbour read as themselves rather than as mud.
  . "function evaluatePixel(s){var g=3.6;return[Math.pow(s.B04*g,0.92),Math.pow(s.B03*g,0.92),Math.pow(s.B02*g,0.92)]}";

$jpeg = sat_post('https://sh.dataspace.copernicus.eu/api/v1/process', $token, array(
    'input' => array(
        'bounds' => array('bbox' => $BBOX, 'properties' => array('crs' => 'http://www.opengis.net/def/crs/EPSG/0/4326')),
        'data'   => array(array(
            'type' => 'sentinel-2-l2a',
            'dataFilter' => array(
                'timeRange'       => array('from' => $from, 'to' => $to),
                'mosaickingOrder' => 'leastCC',
                'maxCloudCoverage' => 35,
            ),
        )),
    ),
    'output' => array(
        'width'  => $WIDTH,
        'height' => $HEIGHT,
        'responses' => array(array('identifier' => 'default', 'format' => array('type' => 'image/jpeg'))),
    ),
    'evalscript' => $evalscript,
), 'image/jpeg', 90);

if ($jpeg === null || strlen($jpeg) < 5000) {
    // Keep whatever we had. A missing tile is better than a blank one.
    $stale = dorset_cache_stale($META, 7 * 86400);
    if ($stale !== null && is_file($IMG)) {
        if ($WANT_META) { $stale['stale'] = true; dorset_send($stale); }
        sat_serve_image($IMG, $stale);
    }
    if ($WANT_META) dorset_send(array('ok' => false, 'reason' => 'render'));
    http_response_code(503);
    exit;
}

$tmp = $IMG . '.' . getmypid() . '.tmp';
@file_put_contents($tmp, $jpeg);
@rename($tmp, $IMG);

$meta = array(
    'v'          => $SHAPE,
    'ok'         => true,
    'generated'  => gmdate('c'),
    // ⚠️ May legitimately be null when the catalog lookup failed. The client
    // must render "date unavailable", never today's date and never nothing.
    'captured'   => $captured,
    'cloudCover' => $cloud,
    // Why there is no date, when there is no date. Without this a failed
    // catalog lookup is indistinguishable from a working one over a region
    // with no recent pass, and the first version failed silently for exactly
    // that reason.
    'capturedReason' => $catReason,
    'bytes'      => strlen($jpeg),
    'bbox'       => $BBOX,
    'source'     => sat_source_statement($captured),
);
dorset_cache_put($META, $meta);

if ($WANT_META) dorset_send($meta);
sat_serve_image($IMG, $meta);
