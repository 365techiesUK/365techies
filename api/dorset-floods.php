<?php
/*
 * Flood warnings and alerts in force over the conurbation — Environment
 * Agency real-time flood-monitoring API. No key, no registration, OGL.
 *
 * ⚠️ THE HONESTY RULE THIS LAYER EXISTS UNDER.
 * Most of the time this returns nothing, because most of the time there are no
 * warnings. "No active warnings" is NOT "no flood risk", and the portal must
 * never let the absence of an alert read as an all-clear — a quiet map on the
 * day before a surge would be actively dangerous. The `note` field travels
 * with every response, empty or not, so the client always has the words to
 * hand and cannot accidentally imply safety.
 *
 * Severity, as the EA define it:
 *   1 Severe flood warning  - danger to life
 *   2 Flood warning         - flooding expected, immediate action required
 *   3 Flood alert           - flooding possible, be prepared
 *   4 Warning no longer in force
 * Level 4 is deliberately KEPT and labelled rather than dropped: "this was
 * flooded earlier today" is useful context, and silently discarding it would
 * make a receding flood vanish as though it had never happened.
 *
 * NO closing tag in this file.
 */
error_reporting(0);
require __DIR__ . '/dorset-lib.php';

$CACHE = __DIR__ . '/dorset-floods-cache.json';
$RATE  = __DIR__ . '/dorset-floods-rate.json';

// The warming cron below forces a rebuild every five minutes, so that - not
// this - is how often the Environment Agency is actually asked. The TTL only
// decides when a VISITOR is allowed to trigger their own rebuild, and it must
// sit comfortably above the cron interval: at 300s against a */5 cron the two
// expire together, and every cycle left a few seconds in which a resident
// arriving first wore the ~5s fetch. Fifteen minutes matches dorset-water.php
// and means a visitor only ever rebuilds if the cron has genuinely stopped.
$TTL = 900;
$NOTE = 'No active warnings is not the same as no flood risk. Never imply safety from the absence of an alert.';
$EMPTY = array('ok' => false, 'count' => 0, 'note' => $NOTE, 'items' => array());

/*
 * A cron can force a rebuild, exactly as dorset-water.php does.
 *
 * Without this a warming cron is useless: arriving inside the TTL it would be
 * served the cache and return without refreshing anything, so the cache would
 * still expire on its own five-minute schedule and the next real visitor would
 * wear the rebuild. Measured 2026-09-04 on production: 4.95s cold, 0.09s warm.
 * Whoever arrives first should be a cron, not a resident.
 *
 *   php /home/customer/www/365techies.co.uk/public_html/api/dorset-floods.php refresh
 */
$FORCE = (PHP_SAPI === 'cli') && isset($argv[1]) && $argv[1] === 'refresh';

if (!$FORCE) {
    $fresh = dorset_cache_get($CACHE, $TTL);
    if ($fresh !== null) dorset_send($fresh);
    if (!dorset_rate_ok($RATE, 12)) dorset_degrade($CACHE, 'rate', $EMPTY);
}

/*
 * The EA API takes a centre and a radius in km, not a bounding box, so the box
 * is covered by its centre plus the distance to a corner. That over-covers
 * slightly at the corners, which is the right way round to be wrong: a warning
 * just outside the box is worth showing, one just inside that we missed is not.
 */
$lat  = (DORSET_S + DORSET_N) / 2;
$long = (DORSET_W + DORSET_E) / 2;
$dLatKm = ((DORSET_N - DORSET_S) / 2) * 111.32;
$dLonKm = ((DORSET_E - DORSET_W) / 2) * 111.32 * cos(deg2rad($lat));
$dist = min(60, (int)ceil(sqrt($dLatKm * $dLatKm + $dLonKm * $dLonKm)));

$url = 'https://environment.data.gov.uk/flood-monitoring/id/floods'
     . '?lat=' . number_format($lat, 4, '.', '')
     . '&long=' . number_format($long, 4, '.', '')
     . '&dist=' . $dist;

$j = dorset_http_json($url, 20);
if ($j === null) dorset_degrade($CACHE, 'upstream', $EMPTY);

$items = array();
$raw = (isset($j['items']) && is_array($j['items'])) ? $j['items'] : array();
foreach ($raw as $f) {
    if (!is_array($f)) continue;
    $area = isset($f['floodArea']) && is_array($f['floodArea']) ? $f['floodArea'] : array();
    $sev = isset($f['severityLevel']) ? (int)$f['severityLevel'] : 0;
    $items[] = array(
        'id'          => isset($f['floodAreaID']) ? $f['floodAreaID'] : null,
        'severity'    => $sev,
        'severityText'=> isset($f['severity']) ? $f['severity'] : null,
        // 4 means "no longer in force" - kept, and flagged, never silently cut.
        'inForce'     => $sev >= 1 && $sev <= 3,
        'description' => isset($f['description']) ? $f['description'] : null,
        'message'     => isset($f['message']) ? $f['message'] : null,
        'raised'      => isset($f['timeRaised']) ? $f['timeRaised'] : null,
        'changed'     => isset($f['timeMessageChanged']) ? $f['timeMessageChanged'] : null,
        'river'       => isset($area['riverOrSea']) ? $area['riverOrSea'] : null,
        // The polygon lives at a second endpoint and is fetched on demand by
        // the client only for warnings it actually draws - most responses are
        // empty, and pre-fetching polygons for nothing would be pure waste.
        'polygonUrl'  => isset($f['floodAreaID'])
            ? 'https://environment.data.gov.uk/flood-monitoring/id/floodAreas/' . rawurlencode($f['floodAreaID']) . '/polygon'
            : null,
    );
}

// Most severe first: a severe warning must never sit below an expired one.
usort($items, function ($a, $b) { return $a['severity'] - $b['severity']; });

$body = array(
    'ok'        => true,
    'generated' => gmdate('c'),
    'count'     => count($items),
    'inForce'   => count(array_filter($items, function ($x) { return $x['inForce']; })),
    'note'      => $NOTE,
    'source'    => 'Environment Agency flood-monitoring API (OGL)',
    'items'     => $items,
);
dorset_cache_put($CACHE, $body);
dorset_send($body);
