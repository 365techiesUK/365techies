<?php
/*
 * Weather + 7-day solar-forecast feed for the off-grid live dashboard (/off-grid-victron-energy/).
 *
 * 17 Sep 2026 - OFF OPEN-METEO. Its free API is for non-commercial use only ("You may only use the free API services
 * for non-commercial purposes") and this is a company website; it also disagreed with /bournemouth/weather/.
 *  - Forecast: MET Norway Locationforecast 2.0 (CC BY 4.0, commercial use allowed), parsed by the SAME bmwx_parse()
 *    the weather page uses. Within 10 km of Bournemouth Pier the weather page's own cached run is used, so the two
 *    pages print the same days, temperatures and symbols.
 *  - Sunshine: MET Norway has none, so it is estimated from the sun's position and the forecast cloud cover, and the
 *    page converts it to kWh with the van's own factor against NASA POWER's recorded sunshine. See vrm-weather-lib.php.
 *
 * Privacy (unchanged): reads the van's GPS from VRM server-side, rounds it to 2 decimal places (~1 km) BEFORE any
 * external call, and the public output contains the nearest TOWN NAME only - never coordinates.
 * Cached 30 min (vrm-weather-cache.json, gitignored + denied); MET's Expires/Last-Modified honoured for the van's own
 * forecast; NASA POWER re-read every 6 hours. Atomic writes.
 */
error_reporting(0);
ini_set('serialize_precision', '-1');
date_default_timezone_set('Europe/London');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$SITE_ID = 458482;
$TTL     = 1800;
$CACHE   = __DIR__ . '/vrm-weather-cache.json';
$TOKENF  = __DIR__ . '/vrm-token.php';
$CACHE_V = 2;   // 2 = MET Norway + NASA POWER. A cache from before (Open-Meteo) is never served.
$PIER    = array(50.7163, -1.8762);
$UA      = '365techies-offgrid-dashboard/2.0 (+https://365techies.co.uk/off-grid-victron-energy/)';

require_once __DIR__ . '/bm-weather-lib.php';    // bmwx_parse(), bm_weather_public_full() - top-level scope on purpose
require_once __DIR__ . '/vrm-weather-lib.php';

/* the cache file wraps {v, grid, town, met, power, body}: everything but body stays server-side */
function wx_cache_load() {
    global $CACHE;
    $c = @json_decode((string)@file_get_contents($CACHE), true);
    return is_array($c) ? $c : array();
}
function serve_cache_body($c) {
    global $CACHE_V;
    if (isset($c['v'], $c['body']) && $c['v'] === $CACHE_V && is_string($c['body']) && $c['body'] !== '') { echo $c['body']; exit; }
}
$old = wx_cache_load();
if (is_file($CACHE) && (time() - filemtime($CACHE)) < $TTL) serve_cache_body($old);
if (!is_file($TOKENF)) { echo json_encode(['ok' => false, 'error' => 'not-configured']); exit; }
$cfgsrc = (string)@file_get_contents($TOKENF);
$VRM_TOKEN = preg_match('/\$VRM_TOKEN\s*=\s*[\'"]([^\'"]+)[\'"]/', $cfgsrc, $mm) ? $mm[1] : '';
if ($VRM_TOKEN === '') { echo json_encode(['ok' => false, 'error' => 'not-configured']); exit; }

function fetch_json($url, $headers = []) {
    global $UA;
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 20,
        CURLOPT_CONNECTTIMEOUT => 8,
        CURLOPT_PROTOCOLS      => CURLPROTO_HTTPS,
        CURLOPT_REDIR_PROTOCOLS => CURLPROTO_HTTPS,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS      => 3,
        CURLOPT_HTTPHEADER     => $headers,
        CURLOPT_USERAGENT      => $UA,
    ]);
    $body = curl_exec($ch);
    curl_close($ch);
    if (!$body) return null;
    $j = json_decode($body, true);
    return is_array($j) ? $j : null;
}
function serve_stale_or($err) {
    global $old;
    serve_cache_body($old);
    echo json_encode(['ok' => false, 'error' => $err]); exit;
}
/* MET Norway for the van's rounded position, with If-Modified-Since (MET's terms) */
function met_fetch($lat, $lon, $lastMod) {
    global $UA;
    $hdr = array('expires' => '', 'last_modified' => '');
    $ch = curl_init('https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=' . $lat . '&lon=' . $lon);
    $send = array('Accept: application/json');
    if ($lastMod !== '') $send[] = 'If-Modified-Since: ' . $lastMod;
    curl_setopt_array($ch, array(
        CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 20, CURLOPT_CONNECTTIMEOUT => 8, CURLOPT_ENCODING => '',
        CURLOPT_PROTOCOLS => CURLPROTO_HTTPS, CURLOPT_HTTPHEADER => $send, CURLOPT_USERAGENT => $UA,
        CURLOPT_HEADERFUNCTION => function ($c, $line) use (&$hdr) {
            $p = strpos($line, ':');
            if ($p !== false) {
                $k = strtolower(trim(substr($line, 0, $p)));
                if ($k === 'expires') $hdr['expires'] = trim(substr($line, $p + 1));
                if ($k === 'last-modified') $hdr['last_modified'] = trim(substr($line, $p + 1));
            }
            return strlen($line);
        },
    ));
    $body = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
    return array('code' => $code, 'body' => $body === false ? '' : $body, 'hdr' => $hdr);
}
function km_between($la1, $lo1, $la2, $lo2) {
    $p = M_PI / 180;
    $h = pow(sin(($la2 - $la1) * $p / 2), 2) + cos($la1 * $p) * cos($la2 * $p) * pow(sin(($lo2 - $lo1) * $p / 2), 2);
    return 2 * 6371 * asin(sqrt($h));
}

/* ---- van GPS from VRM (server-side only), rounded to ~1km before anything else ---- */
$diag = fetch_json('https://vrmapi.victronenergy.com/v2/installations/' . $SITE_ID . '/diagnostics?count=1000',
                   ['X-Authorization: Token ' . $VRM_TOKEN]);
$lat = null; $lon = null;
if ($diag && !empty($diag['records']) && is_array($diag['records'])) {
    foreach ($diag['records'] as $rec) {
        if (!isset($rec['code'], $rec['rawValue'])) continue;
        if ($rec['code'] === 'lt') $lat = (float)$rec['rawValue'];
        if ($rec['code'] === 'lg') $lon = (float)$rec['rawValue'];
    }
}
if ($lat === null || $lon === null || ($lat == 0 && $lon == 0)) serve_stale_or('no-gps');
$lat = round($lat, 2); $lon = round($lon, 2);
$grid = $lat . ',' . $lon;

/* ---- town name: only re-geocode when the 1km grid square changes ---- */
$town = '';
if (isset($old['grid'], $old['town']) && $old['grid'] === $grid && $old['town'] !== '') {
    $town = $old['town'];
} else {
    $g = fetch_json('https://nominatim.openstreetmap.org/reverse?lat=' . $lat . '&lon=' . $lon .
                    '&format=jsonv2&zoom=12&accept-language=en');
    if ($g && isset($g['address']) && is_array($g['address'])) {
        $a = $g['address'];
        foreach (['town', 'city', 'village', 'suburb', 'county'] as $k) {
            if (!empty($a[$k])) { $town = (string)$a[$k]; break; }
        }
    }
    if ($town === '' && !empty($old['town'])) $town = $old['town'];  // keep last known
}

/* ---- the forecast: the weather page's own run near the pier, otherwise MET Norway for the van's square ---- */
$now = time();
$model = null; $samePage = false;
if (km_between($lat, $lon, $PIER[0], $PIER[1]) <= 10) {
    $pub = bm_weather_public_full();
    $sixCloud = true;
    foreach ((array)(isset($pub['six']) ? $pub['six'] : array()) as $s) if (!array_key_exists('cloud', $s)) { $sixCloud = false; break; }
    if (!empty($pub['ok']) && !empty($pub['hours']) && $sixCloud && empty($pub['stale'])) {
        $model = array('issued' => $pub['issued'], 'hours' => $pub['hours'], 'six' => $pub['six'], 'days' => $pub['days']);
        $samePage = true;
    }
}
$met = isset($old['met']) && is_array($old['met']) ? $old['met'] : array();
if ($model === null) {
    $mine = isset($met['grid'], $met['model']) && $met['grid'] === $grid;
    if (!$mine || $now >= (int)(isset($met['exp']) ? $met['exp'] : 0)) {
        $r = met_fetch($lat, $lon, $mine && isset($met['lm']) ? (string)$met['lm'] : '');
        $exp = strtotime($r['hdr']['expires']);
        $exp = max($now + 600, $exp ? $exp : $now + 3600);
        if ($r['code'] === 200) {
            $m = bmwx_parse(json_decode($r['body'], true));
            if ($m) { $met = array('grid' => $grid, 'model' => $m, 'lm' => $r['hdr']['last_modified'], 'exp' => $exp); $mine = true; }
        } elseif ($r['code'] === 304 && $mine) {
            $met['exp'] = $exp;
        }
    }
    if ($mine) {
        $m = $met['model'];
        $issuedT = strtotime(isset($m['issued']) ? $m['issued'] : '');
        if ($issuedT && ($now - $issuedT) < BMWX_DEAD) {
            $hours = array();
            foreach ($m['hours'] as $h) if (strtotime($h['t']) + 3600 > $now) $hours[] = $h;
            $m['hours'] = $hours;
            $model = $m;
        }
    }
}
if ($model === null || empty($model['hours'])) serve_stale_or('weather-unreachable');

/* ---- NASA POWER: recorded sunshine for the calibration (and the clear-sky scale), every 6 hours ---- */
$power = isset($old['power']) && is_array($old['power']) ? $old['power'] : array();
if (!isset($power['grid'], $power['at'], $power['rows']) || $power['grid'] !== $grid || $now - (int)$power['at'] > 6 * 3600) {
    $rows = vw_power_fetch($lat, $lon, 40, $UA);
    if ($rows) $power = array('grid' => $grid, 'at' => $now, 'rows' => $rows);
    elseif (!isset($power['grid']) || $power['grid'] !== $grid) $power = array();
}
$rows = isset($power['rows']) ? $power['rows'] : array();
$scale = vw_clear_scale($rows, $lat, $lon);
$today = date('Y-m-d', $now);
$past = array();
foreach ($rows as $d => $v) {
    if ($d < $today && $v[0] !== null) $past[] = array('d' => $d, 'rad' => round($v[0] * 3.6, 1));   // kWh/m2 -> MJ/m2
}
$past = array_slice($past, -30);

$h0 = $model['hours'][0];
$body = json_encode([
    'ok'      => true,
    'v'       => $CACHE_V,
    'town'    => $town,   // town name only - coordinates never leave the server
    'tempC'   => isset($h0['temp']) ? round((float)$h0['temp'], 1) : null,
    'sym'     => isset($h0['sym']) ? (string)$h0['sym'] : '',
    'forecastFor' => isset($h0['t']) ? (string)$h0['t'] : null,
    'issued'  => isset($model['issued']) ? (string)$model['issued'] : null,
    'samePage' => $samePage,   // true: the very forecast /bournemouth/weather/ is showing
    'days'    => vw_days($model, $lat, $lon, $scale, $now),
    'past'    => $past,        // [{d, rad MJ/m2}] recorded by NASA POWER, for the page's day-by-day calibration
    't'       => $now,
]);
$wrap = json_encode(['v' => $CACHE_V, 'grid' => $grid, 'town' => $town, 'met' => $met, 'power' => $power, 'body' => $body]);
@file_put_contents($CACHE . '.tmp', $wrap, LOCK_EX);
@rename($CACHE . '.tmp', $CACHE);
echo $body;
