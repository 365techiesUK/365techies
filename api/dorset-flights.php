<?php
/*
 * Aircraft over the conurbation — adsb.lol.
 *
 * ⚠️ NOT OPENSKY, AND THAT IS A LICENCE MATTER RATHER THAN A PREFERENCE.
 * OpenSky's terms are non-commercial with an operational-use ban. 365 Techies
 * is a commercial company and this is a commercial site, so OpenSky is never
 * contacted — by this endpoint or by the dev proxy, which already substitutes
 * adsb.lol behind a legacy /api/opensky route name.
 *
 * adsb.lol is community-fed, keyless, and published under ODbL 1.0, which
 * permits commercial use with attribution. That attribution is mandatory while
 * the layer is shown and is carried in the portal's credits panel:
 *
 *     Flights & aircraft traces: adsb.lol (ODbL 1.0)
 *
 * ⚠️ THIS IS DELIBERATELY A THIN PROXY, NOT A PARSER.
 * The browser already has a tested normaliser for adsb.lol's payload
 * (normalizeAdsbLolPointResponse in src/data/adsbLolFallback.js), so the
 * upstream `ac` array and `now` are passed through UNCHANGED. Re-implementing
 * that mapping here would be a second port of the same logic, free to drift
 * from the first — which is exactly how the DATEX parser nearly went wrong.
 * The only fields added are our own envelope.
 *
 * ⚠️ IT IS A VOLUNTEER NETWORK, SO COVERAGE IS A COURTESY NOT A GUARANTEE.
 * Reception depends on people running receivers near the coast. Verified live
 * over Bournemouth on 1 Sep 2026: 203 aircraft within 100 nm. A thin result is
 * a real possibility and must read as "few aircraft seen", never as "no
 * aircraft flying" — hence the last-good-payload behaviour on an empty parse.
 *
 * NO closing tag in this file.
 */
error_reporting(0);
require __DIR__ . '/dorset-lib.php';

$CACHE = __DIR__ . '/dorset-flights-cache.json';
$RATE  = __DIR__ . '/dorset-flights-rate.json';

/*
 * ⚠️ adsb.lol RATE-LIMITS HARDER THAN ITS DOCS SUGGEST.
 * Measured 2026-09-01: roughly five rapid requests from one IP then HTTP 429,
 * and 429s still appeared intermittently at one request every 1s, 2s AND 5s.
 * The 429 body is plain nginx HTML with NO Retry-After and NO X-RateLimit
 * headers, so there is nothing to back off against — the only defence is not
 * asking often. Their own README says "rate limits are dynamic based on the
 * environment load".
 *
 * 25 s means at most ~2.4 upstream calls a minute however many visitors are
 * watching, which is well inside what a volunteer-funded service should have
 * to absorb. Aircraft positions age gracefully; a 429 does not.
 */
$TTL = 25;

// Centre of the conurbation, far enough out to catch approaches into
// Bournemouth Airport and the Solent traffic that reads as local.
$LAT = (DORSET_S + DORSET_N) / 2;
$LON = (DORSET_W + DORSET_E) / 2;
$RADIUS_NM = 60;

$EMPTY = array('ok' => false, 'ac' => array(), 'count' => 0);

/*
 * ⚠️ THE ATTRIBUTION HAS TO BE A HEADER, NOT ONLY A BODY FIELD.
 * The client reads `x-flight-source` to label the layer and to decide what the
 * contacts legend says. This endpoint carried the credit in the JSON body
 * only, which the client never reads for that purpose — so the layer fell back
 * to its built-in default and told every visitor the flights came from
 * "OpenSky Network". That is a source we deliberately never contact, because
 * its terms are non-commercial with an operational-use ban, and it displaced
 * adsb.lol's mandatory ODbL credit. Two wrongs from one missing header.
 *
 * Set here rather than at each exit: there are five ways out of this file
 * (fresh cache, rate degrade, upstream degrade, shape degrade, success) and
 * the credit is true on all of them, including the ones serving stale data.
 */
header('X-Flight-Source: adsb.lol (ODbL 1.0)');

$fresh = dorset_cache_get($CACHE, $TTL);
if ($fresh !== null) dorset_send($fresh);
// Ceiling well under the cache's own cadence, so a cache-expiry stampede
// cannot turn into a burst that trips adsb.lol's limiter.
if (!dorset_rate_ok($RATE, 4)) dorset_degrade($CACHE, 'rate', $EMPTY);

$url = sprintf(
    'https://api.adsb.lol/v2/lat/%s/lon/%s/dist/%d',
    number_format($LAT, 3, '.', ''),
    number_format($LON, 3, '.', ''),
    $RADIUS_NM
);

/*
 * A 429 is the expected failure here, not an exceptional one. dorset_http
 * returns null without retrying on 429 (retrying is precisely wrong), and the
 * last good sky is a far better answer than an empty one — aircraft that were
 * overhead 30 seconds ago are still nearby.
 */
$body = dorset_http_json($url, 15);
if ($body === null) dorset_degrade($CACHE, 'upstream-or-rate-limited', $EMPTY);
if (!isset($body['ac']) || !is_array($body['ac'])) dorset_degrade($CACHE, 'unexpected-shape', $EMPTY);
if (!count($body['ac'])) dorset_degrade($CACHE, 'parsed-empty', $EMPTY);

$out = array(
    'ok'        => true,
    'generated' => gmdate('c'),
    'count'     => count($body['ac']),
    'centre'    => array($LON, $LAT),
    'radiusNm'  => $RADIUS_NM,
    'source'    => 'adsb.lol (ODbL 1.0)',
    // Upstream fields, verbatim. `now` is what the client's normaliser uses to
    // age each contact; `ac` is the aircraft array it maps.
    'now'       => isset($body['now']) ? $body['now'] : null,
    'ac'        => $body['ac'],
);
dorset_cache_put($CACHE, $out);
dorset_send($out);
