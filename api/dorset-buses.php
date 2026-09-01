<?php
/*
 * Live bus positions for the Bournemouth365 Portal — DfT Bus Open Data Service.
 *
 * Every English local bus operator is legally required to publish live vehicle
 * locations to BODS, so coverage of the conurbation is complete by mandate
 * rather than by goodwill. morebus (Go South Coast) is the dominant operator
 * here; Yellow Buses ceased trading in 2022 and is not coming back.
 *
 * Licence: Open Government Licence. Commercial use is fine, attribution is
 * required and is carried in the portal's credits panel.
 *
 * ⚠️ BODS REJECTS `Accept: application/xml` WITH A 406.
 * It serves text/xml and the wildcard type, but not the more specific one.
 * Verified against the live endpoint with all four variants; it cost an
 * afternoon once. (Written out in words deliberately: the wildcard's literal
 * form contains a comment terminator and closes this block early.)
 *
 * ⚠️ THE FEED IS RAW XML AND ITS STRINGS ARE SLUGGED AND ENTITY-ENCODED.
 * morebus publishes stops as "Westover_Road", "Poole_Bus_Station" and
 * "Castlepoint__Stop_E" (note the double underscore), and because the payload
 * is XML, "&amp;" arrives undecoded. Both are fixed here rather than in the
 * browser, so every client gets the same clean text.
 *
 * NO closing tag in this file.
 */
error_reporting(0);
require __DIR__ . '/dorset-lib.php';

$CACHE = __DIR__ . '/dorset-buses-cache.json';
$RATE  = __DIR__ . '/dorset-buses-rate.json';

// SIRI-VM refreshes at roughly 10 s upstream. Serving a 12-second cache keeps
// the map live without turning every visitor into an upstream request.
$TTL = 12;
$EMPTY = array('ok' => false, 'vehicles' => array(), 'count' => 0);

$fresh = dorset_cache_get($CACHE, $TTL);
if ($fresh !== null) dorset_send($fresh);

$keys = dorset_keys();
if (empty($keys['bods'])) dorset_degrade($CACHE, 'not-configured', $EMPTY);

// At most 12 upstream calls a minute site-wide: one per cache window. Beyond
// that, whoever asks gets the cache — the data has not changed anyway.
if (!dorset_rate_ok($RATE, 12)) dorset_degrade($CACHE, 'rate', $EMPTY);

$bbox = DORSET_W . ',' . DORSET_S . ',' . DORSET_E . ',' . DORSET_N;
$url  = 'https://data.bus-data.dft.gov.uk/api/v1/datafeed/'
      . '?api_key=' . rawurlencode($keys['bods'])
      . '&boundingBox=' . rawurlencode($bbox);

list($xml, $code) = dorset_http($url, 15, array('Accept: text/xml'));
if ($xml === null) dorset_degrade($CACHE, 'upstream-' . $code, $EMPTY);

/* ---------------------------------------------------------------- parsing */

/** One tag's text from a VehicleActivity block. */
function bods_one($block, $tag) {
    if (preg_match('#<' . $tag . '>([^<]*)</' . $tag . '>#', $block, $m)) return trim($m[1]);
    return null;
}

function bods_decode($s) {
    return html_entity_decode((string)$s, ENT_QUOTES | ENT_XML1, 'UTF-8');
}

/** "Poole_Bus_Station" -> "Poole Bus Station"; collapses the double ones too. */
function bods_unslug($s) {
    return trim(preg_replace('/\s+/', ' ', str_replace('_', ' ', (string)$s)));
}

/*
 * ⚠️ ONLY DE-SLUG WHAT IS ACTUALLY SLUGGED.
 * Route names are a mix of real codes and slugged words: "m1", "X3" and "1A"
 * are the published names and must survive untouched, while "kings_park" is a
 * slug. The presence of an underscore is the only reliable signal, so a name
 * without one is returned exactly as published.
 */
function bods_line($line) {
    $line = trim((string)$line);
    if ($line === '' || strpos($line, '_') === false) return $line;
    $words = array_filter(explode('_', $line), 'strlen');
    $out = array();
    foreach ($words as $w) $out[] = ucfirst($w);
    return implode(' ', $out);
}

/*
 * ⚠️ NOT-IN-SERVICE VEHICLES ARE HIDDEN, NOT RELABELLED.
 * Some feeds publish positioning moves with a line of "DEAD" — a bus running
 * empty to or from a depot. Drawing one is worse than drawing nothing: a
 * viewer waiting at a stop sees a bus coming that will never stop for them,
 * and a marker captioned "DEAD" over a residential street reads alarmingly.
 */
function bods_in_service($line) {
    $u = strtoupper(trim((string)$line));
    return $u !== '' && $u !== 'DEAD' && $u !== 'NOTINSERVICE';
}

$vehicles = array();
$blocks = explode('<VehicleActivity>', $xml);
array_shift($blocks);
foreach ($blocks as $raw) {
    $b = explode('</VehicleActivity>', $raw);
    $b = $b[0];

    $lat = bods_one($b, 'Latitude');
    $lon = bods_one($b, 'Longitude');
    if (!is_numeric($lat) || !is_numeric($lon)) continue;
    $lat = (float)$lat; $lon = (float)$lon;
    if (!dorset_in_box($lon, $lat)) continue;

    $line = bods_line(bods_decode(bods_one($b, 'PublishedLineName') ?: bods_one($b, 'LineRef')));
    if (!bods_in_service($line)) continue;

    $bearing = bods_one($b, 'Bearing');

    $vehicles[] = array(
        'id'       => bods_one($b, 'VehicleRef') ?: ($lat . ',' . $lon),
        'lat'      => $lat,
        'lon'      => $lon,
        'line'     => $line,
        'operator' => bods_decode(bods_one($b, 'OperatorRef')),
        'dest'     => bods_unslug(bods_decode(bods_one($b, 'DestinationName'))),
        'bearing'  => is_numeric($bearing) ? (float)$bearing : null,
        'at'       => bods_one($b, 'RecordedAtTime'),
    );
}

/*
 * ⚠️ ZERO VEHICLES IS SUSPICIOUS, NOT NEWS.
 * The conurbation always has buses moving in daylight hours. A parse that
 * yields nothing from a 200 response means the feed shape changed, not that
 * the buses stopped — so serve the last good payload and flag it rather than
 * publishing an empty map that looks authoritative.
 */
if (!count($vehicles)) dorset_degrade($CACHE, 'parsed-empty', $EMPTY);

$body = array(
    'ok'        => true,
    'generated' => gmdate('c'),
    'count'     => count($vehicles),
    'source'    => 'DfT Bus Open Data Service (OGL)',
    'vehicles'  => $vehicles,
);
dorset_cache_put($CACHE, $body);
dorset_send($body);
