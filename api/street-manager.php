<?php
/*
 * Street Manager roadworks read proxy.
 *
 * Roadworks arrive by PUSH, not pull: DfT publish through AWS SNS and POST
 * every event to an endpoint we host. That endpoint is a Cloudflare Worker
 * (street-manager-worker.js), NOT this file — SiteGround's WAF answers
 * cross-origin machine POSTs with 202 + sgcaptcha, and since AWS treats any
 * 2xx as delivered, the one-time subscription handshake would look successful
 * to Amazon while never reaching us. See the Worker's header for the full note.
 *
 * This file is the read side, exactly as visitors.php is for live visitors:
 * it polls the Worker server-side so the read token never reaches a browser,
 * and caches the answer so several map loads do not multiply KV reads.
 *
 * Config (server-only, gitignored + denied): api/street-manager-key.php
 *     <?php $SM_URL='https://<worker-url>'; $SM_TOKEN='<the SM_TOKEN secret>';
 *
 * Licence: Open Government Licence. This is public open data, so the response
 * is public — but it is still cached and rate-limited, because the Worker's KV
 * free tier is the thing being protected, not the data.
 *
 * ⚠️ COORDINATES ARE PASSED THROUGH VERBATIM, ON PURPOSE.
 * Street Manager serves EWKT in British National Grid, e.g.
 * "SRID=27700;POINT(412345 98765)" — eastings/northings, not degrees. The
 * conversion to WGS84 is deliberately NOT done here yet: it has to be written
 * against a real payload, not against an assumption about the format, because
 * a half-right datum shift is invisible until roadworks land in the wrong
 * street. The first confirmed permit gives us a real string to write it from.
 * Until then `coordinates` reaches the caller exactly as DfT sent it, and
 * `coordinates_wgs84` is absent rather than wrong.
 *
 * NO closing tag in this file.
 */
error_reporting(0);
date_default_timezone_set('Europe/London');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');

$CFG = __DIR__ . '/street-manager-key.php';
if (!is_file($CFG)) {
    // Degrade honestly: the map shows no roadworks layer rather than an error,
    // and the reason is legible to us without leaking anything to a visitor.
    echo json_encode(array('ok' => false, 'reason' => 'not-configured', 'works' => array()));
    exit;
}
$SM_URL = ''; $SM_TOKEN = '';
require $CFG;
if ($SM_URL === '' || $SM_TOKEN === '') {
    echo json_encode(array('ok' => false, 'reason' => 'not-configured', 'works' => array()));
    exit;
}

$CACHEF = __DIR__ . '/street-manager-cache.json';
$RATEF  = __DIR__ . '/street-manager-rate.json';
$TTL    = 300;                                  // 5 minutes; permits change slowly

/* Serve from cache whenever it is fresh - this is the normal path. */
$cache = @json_decode((string)@file_get_contents($CACHEF), true);
if (is_array($cache) && isset($cache['at']) && (time() - (int)$cache['at']) < $TTL) {
    echo json_encode($cache['body']);
    exit;
}

/* Rate limit the UPSTREAM fetch, not the request: at most 30 Worker reads a
   minute site-wide. If we are over, serve the stale cache rather than nothing -
   slightly old roadworks beat an empty map. */
$min = (int)floor(time() / 60);
$rate = @json_decode((string)@file_get_contents($RATEF), true);
if (!is_array($rate) || !isset($rate['min']) || $rate['min'] !== $min) $rate = array('min' => $min, 'n' => 0);
if ($rate['n'] >= 30) {
    if (is_array($cache) && isset($cache['body'])) { echo json_encode($cache['body']); exit; }
    http_response_code(429);
    echo json_encode(array('ok' => false, 'reason' => 'rate', 'works' => array()));
    exit;
}
$rate['n']++;
@file_put_contents($RATEF, json_encode($rate), LOCK_EX);

$url = rtrim($SM_URL, '/') . '/live?limit=500&token=' . rawurlencode($SM_TOKEN);
$ctx = stream_context_create(array('http' => array(
    'method'        => 'GET',
    'timeout'       => 12,
    'ignore_errors' => true,
    'header'        => "Accept: application/json\r\nUser-Agent: 365techies-street-manager/1.0\r\n",
)));
$raw = @file_get_contents($url, false, $ctx);
$up  = @json_decode((string)$raw, true);

if (!is_array($up) || empty($up['ok'])) {
    /* ⚠️ A BAD UPSTREAM MUST NOT EMPTY THE MAP. Serving the stale cache is the
       honest failure: the roadworks were real when we last saw them, and an
       empty layer would say "no roadworks", which is a claim about the world
       rather than about the feed. */
    if (is_array($cache) && isset($cache['body'])) {
        $body = $cache['body'];
        $body['stale'] = true;
        echo json_encode($body);
        exit;
    }
    echo json_encode(array('ok' => false, 'reason' => 'upstream', 'works' => array()));
    exit;
}

$works = array();
foreach ((isset($up['works']) && is_array($up['works'])) ? $up['works'] : array() as $w) {
    if (!is_array($w)) continue;
    $works[] = array(
        'ref'        => isset($w['ref']) ? (string)$w['ref'] : '',
        'topic'      => isset($w['topic']) ? (string)$w['topic'] : '',
        'authority'  => isset($w['authority']) ? (string)$w['authority'] : '',
        'promoter'   => isset($w['promoter']) ? (string)$w['promoter'] : '',
        'street'     => isset($w['street']) ? (string)$w['street'] : '',
        'area'       => isset($w['area']) ? (string)$w['area'] : '',
        'town'       => isset($w['town']) ? (string)$w['town'] : '',
        'category'   => isset($w['category']) ? (string)$w['category'] : '',
        'traffic'    => isset($w['traffic']) ? (string)$w['traffic'] : '',
        'status'     => isset($w['status']) ? (string)$w['status'] : '',
        'start'      => isset($w['actualStart']) && $w['actualStart'] ? (string)$w['actualStart'] : (string)(isset($w['proposedStart']) ? $w['proposedStart'] : ''),
        'end'        => isset($w['actualEnd']) && $w['actualEnd'] ? (string)$w['actualEnd'] : (string)(isset($w['proposedEnd']) ? $w['proposedEnd'] : ''),
        'started'    => !empty($w['actualStart']),      // proposed vs actually underway
        'usrn'       => isset($w['usrn']) ? $w['usrn'] : null,
        // verbatim, see the note at the top of this file
        'coordinates' => isset($w['coordinates']) ? $w['coordinates'] : null,
    );
}

$body = array(
    'ok'        => true,
    'generated' => gmdate('c'),
    'count'     => count($works),
    'source'    => 'Street Manager (DfT), Open Government Licence',
    'works'     => $works,
);
@file_put_contents($CACHEF, json_encode(array('at' => time(), 'body' => $body)), LOCK_EX);
echo json_encode($body);
