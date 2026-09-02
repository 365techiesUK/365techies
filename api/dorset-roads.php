<?php
/*
 * Unplanned road closures for the Bournemouth365 Portal — National Highways
 * Road and Lane Closures v2.0 (DATEX II).
 *
 * ⚠️ COVERAGE HERE IS THE A31 AND ALMOST NOTHING ELSE.
 * National Highways manage the Strategic Road Network only. A distinct-roadname
 * query over the whole conurbation returns exactly one value: A31. Their A35
 * terminates at the Bere Regis roundabout and runs WEST from there to
 * Dorchester and Devon; the A35 through Poole, Bournemouth and Christchurch is
 * BCP Council's. Their entire A338 is a single slip road near Salisbury, forty
 * kilometres away, so the Wessex Way is BCP's too. Verified against their own
 * Network Model feature service, 1 Sep 2026.
 *
 * So this answers "is the drive down from Southampton clear". It cannot answer
 * "why is the Wessex Way solid" — that needs BCP's permit data via Street
 * Manager, and the UI must never imply otherwise.
 *
 * ⚠️ AND THE FEED ONLY SEES WHAT THE SIGNS SEE.
 * The FAQ is explicit that closures are reported "where signs and signals are
 * actively set on the Strategic Road Network". The A31 through Dorset is
 * largely un-gantried, so a genuine closure with no VSS set never appears at
 * all. AN EMPTY RESULT MEANS "NOTHING SIGNED", NOT "ROADS CLEAR" — the
 * `upstream` counts below exist so the client can tell those apart.
 *
 * PLANNED works do NOT come through here. They come from National Highways'
 * open ArcGIS feature service, which needs no key, filters server-side by
 * bounding box, returns GeoJSON in lon/lat order and sends
 * Access-Control-Allow-Origin: * — so the browser calls it directly.
 *
 * ⚠️ RATE LIMIT IS 10 CALLS PER KEY PER MINUTE, and their terms make careless
 * polling a termination risk: clause 17 counts "inadvertent disruption of NH's
 * systems due to incorrect operation or design of Your interface" as abuse,
 * with cessation "immediate". The cache floor below is deliberately generous.
 *
 * Attribution, mandatory and exactly worded:
 *     Powered by National Highways' Transport Data Feeds
 *
 * NO closing tag in this file.
 */
error_reporting(0);
require __DIR__ . '/dorset-lib.php';
require __DIR__ . '/dorset-datex-lib.php';

$CACHE = __DIR__ . '/dorset-roads-cache.json';
$RATE  = __DIR__ . '/dorset-roads-rate.json';

$TTL = 60;                       // a twentieth of the permitted call rate
// 30 min: closures persist for hours and each carries its own start/end
// (dorset-datex-lib.php), and the panel row prints the true age of the body.
$STALE_MAX = 1800;
$LOOKBACK = 6 * 3600;            // their own worked example
$EMPTY = array('ok' => false, 'closures' => array(), 'count' => 0);

$fresh = dorset_cache_get($CACHE, $TTL);
if ($fresh !== null) dorset_send($fresh);

$keys = dorset_keys();
if (empty($keys['nh'])) dorset_degrade($CACHE, 'not-configured', $EMPTY, $STALE_MAX);
if (!dorset_rate_ok($RATE, 2)) dorset_degrade($CACHE, 'rate', $EMPTY, $STALE_MAX);

$now = time();
$url = 'https://api.data.nationalhighways.co.uk/roads/v2.0/closures'
     . '?closureType=unplanned'
     . '&startDateTime=' . rawurlencode(gmdate('Y-m-d\TH:i:s', $now - $LOOKBACK))
     . '&endDateTime='   . rawurlencode(gmdate('Y-m-d\TH:i:s', $now));

$body = dorset_http_json($url, 20, array(
    // ⚠️ HEADER, NEVER THE ?subscription-key= QUERY FORM. The API accepts
    // both; a key in a URL ends up in every access log along the way.
    'Ocp-Apim-Subscription-Key: ' . $keys['nh'],
    // Default response is XML. Ask for JSON explicitly.
    'X-Response-MediaType: application/json',
));
if ($body === null) dorset_degrade($CACHE, 'upstream', $EMPTY, $STALE_MAX);

/*
 * Parsing lives in dorset-datex-lib.php so it can be tested against National
 * Highways' own example payloads — the only place the three incompatible
 * location shapes appear together. See dorset-datex.test.php.
 */
$parsed = dorset_datex_parse($body, array(DORSET_W, DORSET_S, DORSET_E, DORSET_N));

/*
 * A 200 that yields no situations at all means the payload shape moved, not
 * that England has no closures. Serve the last good answer and say so.
 */
if ($parsed['national'] === 0) dorset_degrade($CACHE, 'unexpected-shape', $EMPTY, $STALE_MAX);

$out = array(
    'ok'        => true,
    'generated' => gmdate('c'),
    'count'     => count($parsed['closures']),
    'source'    => "Powered by National Highways' Transport Data Feeds",
    /*
     * ⚠️ AN EMPTY RESULT IS AMBIGUOUS AND MUST NOT BE.
     * Zero closures can mean "nothing is signed on the A31 right now" — the
     * normal case, given how little of it is gantried — or "the box or the
     * parser silently ate everything", which is a bug. Those look identical
     * from outside, so the counts that separate them travel with the payload.
     * A large national count with zero locally is expected. A national zero is
     * a feed problem worth surfacing.
     */
    'upstream'  => array('situations' => $parsed['national'], 'real' => $parsed['real']),
    'closures'  => $parsed['closures'],
);
dorset_cache_put($CACHE, $out);
dorset_send($out);
