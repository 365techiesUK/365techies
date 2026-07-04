<?php
/*
 * Weather + 7-day solar-forecast feed for the off-grid live dashboard.
 *
 * Privacy: reads the van's GPS from VRM server-side, rounds it to 2 decimal
 * places (~1 km) BEFORE any external call, and the public output contains the
 * nearest TOWN NAME only — never coordinates.
 *
 * Sources: Open-Meteo forecast API (no key; blends the UK Met Office UKMO
 * model short-range with ECMWF beyond it) + Nominatim reverse geocoding for
 * the town name (called only when the ~1 km grid square changes, then cached).
 * Cached 30 min (vrm-weather-cache.json, gitignored); atomic writes.
 */
error_reporting(0);
ini_set('serialize_precision', '-1');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$SITE_ID = 458482;
$TTL     = 1800;
$CACHE   = __DIR__ . '/vrm-weather-cache.json';
$TOKENF  = __DIR__ . '/vrm-token.php';

/* the cache file wraps {grid, town, body}: grid stays server-side, only body is ever served */
function serve_cache_body() {
    global $CACHE;
    $c = @json_decode((string)@file_get_contents($CACHE), true);
    if (is_array($c) && isset($c['body']) && is_string($c['body']) && $c['body'] !== '') { echo $c['body']; exit; }
}
if (is_file($CACHE) && (time() - filemtime($CACHE)) < $TTL) serve_cache_body();
if (!is_file($TOKENF)) { echo json_encode(['ok' => false, 'error' => 'not-configured']); exit; }
$cfgsrc = (string)@file_get_contents($TOKENF);
$VRM_TOKEN = preg_match('/\$VRM_TOKEN\s*=\s*[\'"]([^\'"]+)[\'"]/', $cfgsrc, $mm) ? $mm[1] : '';
if ($VRM_TOKEN === '') { echo json_encode(['ok' => false, 'error' => 'not-configured']); exit; }

function fetch_json($url, $headers = []) {
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
        CURLOPT_USERAGENT      => '365techies-offgrid-dashboard/1.0 (help@365techies.co.uk)',
    ]);
    $body = curl_exec($ch);
    curl_close($ch);
    if (!$body) return null;
    $j = json_decode($body, true);
    return is_array($j) ? $j : null;
}
function serve_stale_or($err) {
    global $CACHE;
    if (is_file($CACHE)) serve_cache_body();
    echo json_encode(['ok' => false, 'error' => $err]); exit;
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
$old = @json_decode((string)@file_get_contents($CACHE), true);
$town = '';
if (is_array($old) && isset($old['grid'], $old['town']) && $old['grid'] === $grid && $old['town'] !== '') {
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
    if ($town === '' && is_array($old) && !empty($old['town'])) $town = $old['town'];  // keep last known
}

/* ---- Open-Meteo: current temp + 7-day daily forecast + past 30d irradiance ---- */
$wx = fetch_json('https://api.open-meteo.com/v1/forecast?latitude=' . $lat . '&longitude=' . $lon .
    '&current=temperature_2m,weather_code,is_day' .
    '&daily=shortwave_radiation_sum,temperature_2m_max,temperature_2m_min,weather_code' .
    '&past_days=30&forecast_days=7&timezone=Europe%2FLondon');
if (!$wx || !isset($wx['daily']['time']) || !is_array($wx['daily']['time'])) serve_stale_or('weather-unreachable');

$d = $wx['daily'];
$n = count($d['time']);
$days = []; $pastRad = [];
for ($i = 0; $i < $n; $i++) {
    $rad = isset($d['shortwave_radiation_sum'][$i]) ? $d['shortwave_radiation_sum'][$i] : null;
    if ($i < $n - 7) {                       // the past-30d calibration window
        $pastRad[] = ($rad === null) ? 0 : round((float)$rad, 1);
    } else {                                 // the 7 forecast days
        $days[] = [
            'd'    => (string)$d['time'][$i],
            'rad'  => ($rad === null) ? null : round((float)$rad, 1),   // MJ/m2
            'tmax' => isset($d['temperature_2m_max'][$i]) && $d['temperature_2m_max'][$i] !== null ? round((float)$d['temperature_2m_max'][$i]) : null,
            'tmin' => isset($d['temperature_2m_min'][$i]) && $d['temperature_2m_min'][$i] !== null ? round((float)$d['temperature_2m_min'][$i]) : null,
            'code' => isset($d['weather_code'][$i]) && $d['weather_code'][$i] !== null ? (int)$d['weather_code'][$i] : null,
        ];
    }
}
$cur = isset($wx['current']) && is_array($wx['current']) ? $wx['current'] : [];

$body = json_encode([
    'ok'      => true,
    'town'    => $town,   // town name only — coordinates never leave the server
    'tempC'   => isset($cur['temperature_2m']) ? round((float)$cur['temperature_2m'], 1) : null,
    'wcode'   => isset($cur['weather_code']) ? (int)$cur['weather_code'] : null,
    'isDay'   => isset($cur['is_day']) ? (int)$cur['is_day'] : 1,
    'days'    => $days,
    'pastRad' => $pastRad,
    't'       => time(),
]);
$wrap = json_encode(['grid' => $grid, 'town' => $town, 'body' => $body]);
@file_put_contents($CACHE . '.tmp', $wrap, LOCK_EX);
@rename($CACHE . '.tmp', $CACHE);
echo $body;
