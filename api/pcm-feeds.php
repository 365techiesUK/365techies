<?php
/**
 * Coast & sky feeds for the dashboard studio.
 *
 * GET ?f=space              -> aurora / solar activity. NO KEY NEEDED, works today.
 * GET ?f=tide&station=<id>  -> Admiralty tidal events. Needs a key.
 * GET ?f=wx&lat=&lon=       -> Met Office site-specific forecast + our sunset score. Needs a key.
 *
 * WHY EACH SOURCE IS THE ONE IT IS (researched 2026-07-30, and the licences are
 * the reason, not the technology):
 *
 *  - SPACE WEATHER: NOAA SWPC. Public domain, keyless, no account. This is the
 *    only feed here that is genuinely free for commercial use, which is why it
 *    is the one that goes live first.
 *  - TIDES: the Admiralty (UKHO). Crown copyright. The free Discovery tier gives
 *    607 UK stations and 7 days, which is plenty for a handful of customers.
 *    ATTRIBUTION IS A LICENCE CONDITION: "Contains ADMIRALTY(R) tidal data:
 *    (c) Crown copyright and database right" must be visible to the end user.
 *    The portal renders it - do not remove it.
 *  - WEATHER / UV / WIND: Met Office DataHub. Chosen over Open-Meteo *because*
 *    Open-Meteo's free tier is licensed non-commercial and this is a paid
 *    product. See api/vrm-weather.php, which has the same problem flagged.
 *  - LIGHTNING IS DELIBERATELY ABSENT. The obvious free source is the
 *    Blitzortung community network, whose licence prohibits commercial use and
 *    explicitly forbids storm-warning systems. There is no honest way to serve
 *    it from here, so this endpoint does not pretend to.
 *
 * KEYS live in api/pcm-feeds-keys.php - server-only, gitignored, .htaccess
 * denied, exactly like api/vrm-token.php. They are read by REGEX rather than
 * require(), because a stray second <?php from a File Manager edit once turned
 * a token file into a fatal error in both VRM proxies. Do not "tidy" that back
 * into an include.
 *
 * No key file, or a feed with no key = an honest {ok:false,error:'not-configured'}.
 * The portal then leaves that tile badged SAMPLE, which is the whole point: a
 * tile only ever says "live" when something real answered.
 */
header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: public, max-age=300');

// This host runs a high serialize_precision, which turns a tidy round($v,2) into
// 0.67000000000000003996802888650563545525074005126953125 in the JSON. -1 means
// "shortest representation that round-trips", i.e. 0.67. Cosmetic, but a payload
// nobody can read is a payload nobody can debug.
@ini_set('serialize_precision', '-1');

$CACHE_DIR = __DIR__;
$KEYFILE   = __DIR__ . '/pcm-feeds-keys.php';

function out($a, $code = 200) { http_response_code($code); echo json_encode($a); exit; }

/** Read a key by name from the server-only file, without executing it. */
function feed_key($name) {
    global $KEYFILE;
    static $txt = null;
    if ($txt === null) $txt = file_exists($KEYFILE) ? (string)@file_get_contents($KEYFILE) : '';
    if ($txt === '') return '';
    if (preg_match('/\$' . preg_quote($name, '/') . '\s*=\s*[\'"]([^\'"]{8,200})[\'"]/', $txt, $m)) return trim($m[1]);
    return '';
}

/** Cached HTTP GET. Serves stale on upstream failure - a tide table an hour old
 *  beats an empty tile, and the payload carries its own age so the portal can say. */
function feed_get($cacheName, $url, $ttl, $headers = array()) {
    global $CACHE_DIR;
    $cf = $CACHE_DIR . '/pcm-feed-' . preg_replace('/[^a-z0-9_\-]/', '', $cacheName) . '.json';
    $now = time();
    $cached = null;
    if (file_exists($cf)) {
        $raw = (string)@file_get_contents($cf);
        $cached = $raw !== '' ? json_decode($raw, true) : null;
        if (is_array($cached) && intval($cached['t'] ?? 0) > $now - $ttl) return $cached;
    }
    $ch = curl_init($url);
    curl_setopt_array($ch, array(
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => 12,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_USERAGENT => '365techies-dashboard/1.0 (+https://365techies.co.uk)',
        CURLOPT_HTTPHEADER => array_merge(array('Accept: application/json'), $headers),
    ));
    $body = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($body === false || $code < 200 || $code > 299) {
        if (is_array($cached)) { $cached['stale'] = true; return $cached; }
        return null;
    }
    $j = json_decode((string)$body, true);
    if (!is_array($j)) { if (is_array($cached)) { $cached['stale'] = true; return $cached; } return null; }
    $rec = array('t' => $now, 'd' => $j);
    $tmp = $cf . '.' . getmypid() . '.tmp';
    if (@file_put_contents($tmp, json_encode($rec), LOCK_EX) !== false) @rename($tmp, $cf);
    return $rec;
}

$f = isset($_GET['f']) ? preg_replace('/[^a-z]/', '', $_GET['f']) : '';

// ---------------------------------------------------------------- space weather
if ($f === 'space') {
    // three keyless public-domain products; each independently optional so one
    // outage never blanks the tile
    $kp = feed_get('kp', 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json', 900);
    $sw = feed_get('sw', 'https://services.swpc.noaa.gov/products/summary/solar-wind-speed.json', 900);
    $xr = feed_get('xr', 'https://services.swpc.noaa.gov/json/goes/primary/xray-flares-latest.json', 900);

    $kpNow = null; $kpSeries = array();
    if ($kp && is_array($kp['d'])) {
        // rows are objects: {time_tag, Kp, a_running, station_count}
        $rows = array_slice($kp['d'], -8);
        foreach ($rows as $r) {
            if (!is_array($r) || !isset($r['Kp'])) continue;
            $kpSeries[] = round((float)$r['Kp'], 2);
        }
        if (count($kpSeries)) $kpNow = $kpSeries[count($kpSeries) - 1];
    }
    $wind = null;
    if ($sw && is_array($sw['d']) && isset($sw['d'][0]['proton_speed'])) $wind = (int)round((float)$sw['d'][0]['proton_speed']);
    $flare = '';
    if ($xr && is_array($xr['d']) && isset($xr['d'][0])) {
        $fl = $xr['d'][0];
        // max_class is the peak of the most recent flare; current_class is right now
        $flare = (string)($fl['max_class'] ?? ($fl['current_class'] ?? ''));
        if (!preg_match('/^[ABCMX][0-9.]{1,6}$/', $flare)) $flare = '';
    }
    if ($kpNow === null && $wind === null && $flare === '') out(array('ok' => false, 'error' => 'upstream'), 503);

    // From southern England you realistically need Kp 6+ before it is worth
    // driving somewhere dark. Saying "low" honestly beats implying a light show.
    $chance = 'Low';
    if ($kpNow !== null) {
        if ($kpNow >= 7) $chance = 'Good';
        else if ($kpNow >= 6) $chance = 'Possible';
        else if ($kpNow >= 5) $chance = 'Slim';
    }
    out(array('ok' => true, 'kp' => $kpNow, 'kpSeries' => $kpSeries, 'wind' => $wind,
        'flare' => $flare, 'chance' => $chance,
        'age' => $kp ? max(0, time() - intval($kp['t'])) : null,
        'stale' => !empty($kp['stale']),
        'src' => 'NOAA Space Weather Prediction Center'));
}

// ---------------------------------------------------------------- tides
if ($f === 'tide') {
    $key = feed_key('ADMIRALTY_KEY');
    if ($key === '') out(array('ok' => false, 'error' => 'not-configured', 'needs' => 'ADMIRALTY_KEY'));
    $station = isset($_GET['station']) ? preg_replace('/[^A-Za-z0-9]/', '', substr((string)$_GET['station'], 0, 12)) : '';
    if ($station === '') out(array('ok' => false, 'error' => 'no-station'));
    $r = feed_get('tide-' . $station,
        'https://admiraltyapi.azure-api.net/uktidalapi/api/V1/Stations/' . $station . '/TidalEvents?duration=2',
        1800, array('Ocp-Apim-Subscription-Key: ' . $key));
    if (!$r || !is_array($r['d'])) out(array('ok' => false, 'error' => 'upstream'), 503);
    $events = array();
    foreach ($r['d'] as $e) {
        if (!is_array($e) || count($events) >= 8) continue;
        $events[] = array(
            'type'   => (string)($e['EventType'] ?? ''),          // HighWater | LowWater
            'time'   => (string)($e['DateTime'] ?? ''),
            'height' => isset($e['Height']) ? round((float)$e['Height'], 2) : null,
        );
    }
    if (!count($events)) out(array('ok' => false, 'error' => 'upstream'), 503);
    out(array('ok' => true, 'station' => $station, 'events' => $events,
        'age' => max(0, time() - intval($r['t'])), 'stale' => !empty($r['stale']),
        // licence condition, not decoration
        'attr' => 'Contains ADMIRALTY(R) tidal data: (C) Crown copyright and database right'));
}

// ---------------------------------------------------------------- weather / UV / wind / sunset
if ($f === 'wx') {
    $key = feed_key('METOFFICE_KEY');
    if ($key === '') out(array('ok' => false, 'error' => 'not-configured', 'needs' => 'METOFFICE_KEY'));
    // Rounded to 2dp before it leaves the server and clamped to the UK, so this
    // can never be used as an open geocoding proxy - the same rule vrm-weather.php
    // follows for the van's position.
    $lat = isset($_GET['lat']) ? round((float)$_GET['lat'], 2) : 0.0;
    $lon = isset($_GET['lon']) ? round((float)$_GET['lon'], 2) : 0.0;
    if ($lat < 49.8 || $lat > 61.0 || $lon < -8.7 || $lon > 2.0) out(array('ok' => false, 'error' => 'off-map'));
    $r = feed_get('wx-' . str_replace('.', '_', (string)$lat) . '_' . str_replace('.', '_', (string)$lon),
        'https://data.hub.api.metoffice.gov.uk/sitespecific/v0/point/hourly?latitude=' . $lat . '&longitude=' . $lon,
        1200, array('apikey: ' . $key));
    if (!$r || !is_array($r['d'])) out(array('ok' => false, 'error' => 'upstream'), 503);

    $series = null;
    if (isset($r['d']['features'][0]['properties']['timeSeries'])) $series = $r['d']['features'][0]['properties']['timeSeries'];
    if (!is_array($series) || !count($series)) out(array('ok' => false, 'error' => 'shape'), 503);
    $now = $series[0];
    $uvSeries = array();
    foreach (array_slice($series, 0, 12) as $h) {
        if (isset($h['uvIndex'])) $uvSeries[] = (int)round((float)$h['uvIndex']);
    }

    // ---- the sunset score. Ours, not a feed anybody sells.
    // Mid and high cloud is what catches the light; low cloud is what kills it.
    // A flat blue sky scores poorly for the same reason a solid grey one does:
    // there is nothing up there for the light to hit.
    $sunq = null;
    $lowC = isset($now['lowCloudCover']) ? (float)$now['lowCloudCover'] : null;
    $midC = isset($now['midCloudCover']) ? (float)$now['midCloudCover'] : null;
    $hiC  = isset($now['highCloudCover']) ? (float)$now['highCloudCover'] : null;
    if ($midC !== null || $hiC !== null) {
        $canvas = max((float)$midC, (float)$hiC);          // something to catch the light
        $ideal  = 100 - abs($canvas - 45) * 1.9;           // best around 45% cover
        $block  = ($lowC !== null) ? $lowC * 0.75 : 0;     // low cloud blocks the horizon
        $sunq = (int)max(0, min(100, round($ideal - $block)));
    }
    out(array('ok' => true,
        'temp'   => isset($now['screenTemperature']) ? round((float)$now['screenTemperature'], 1) : null,
        'uv'     => isset($now['uvIndex']) ? (int)round((float)$now['uvIndex']) : null,
        'uvSeries' => $uvSeries,
        'wind'   => isset($now['windSpeed10m']) ? (int)round((float)$now['windSpeed10m'] * 2.237) : null,   // m/s -> mph
        'gust'   => isset($now['max10mWindGust']) ? (int)round((float)$now['max10mWindGust'] * 2.237) : null,
        'dir'    => isset($now['windDirectionFrom10m']) ? (int)round((float)$now['windDirectionFrom10m']) : null,
        'sunq'   => $sunq,
        'cloud'  => array('low' => $lowC, 'mid' => $midC, 'high' => $hiC),
        'age'    => max(0, time() - intval($r['t'])), 'stale' => !empty($r['stale']),
        'src'    => 'Met Office'));
}

out(array('ok' => false, 'error' => 'bad_feed'));
