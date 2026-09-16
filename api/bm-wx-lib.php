<?php
/**
 * Bournemouth365 seafront weather - the data layer behind /bournemouth/weather/ (16 Sep 2026).
 * Library only: included by tm-cron.php (15-minute cron) and api/bm-wx.php (public JSON). No echo/exit.
 *
 * Every block here names its source, licence and provenance class, because the page's promise is
 * "measured, predicted or forecast - always labelled, never passed off". Sources and why:
 *
 *  obs      MEASURED   Bournemouth Airport (EGHH) METAR via NOAA Aviation Weather Center data API.
 *                      US Government work, public domain. The airport is ~7 km inland of the pier;
 *                      the page says so every time it shows the number.
 *  warnings OFFICIAL   Met Office National Severe Weather Warnings, RSS for South West England.
 *                      Met Office RSS terms: free for any use, shown AS PROVIDED (no edits to text or
 *                      links), attributed and linked to the Met Office.
 *  air      FORECAST   Defra UK-AIR Daily Air Quality Index forecast for "BOURNEMOUTH". OGL v3.
 *  sat      OBSERVED   EUMETSAT Meteosat MTG-I1 images via the EUMETView WMS. Under EUMETSAT's data
 *                      policy (June 2024, Annex table) all SEVIRI/FCI "Advanced Image Products" (the
 *                      RGBs and single-channel visualisations served by Web Map Services) are Core Data:
 *                      CC BY 4.0, any use incl. commercial, attribution "EUMETSAT".
 *  nasa     OBSERVED   NASA GIBS VIIRS corrected-reflectance true colour, once a day. Public domain
 *                      (NASA asks for acknowledgement).
 *  radar    OBSERVED   EUMETNET OPERA rain-rate composite, CC BY 4.0 - see bm-radar-lib.php.
 *  tide     PREDICTED  Our own harmonic prediction for the Bournemouth pier gauge, fitted to 12 months of
 *                      Environment Agency readings (OGL v3) - see tools/tides and api/bm-tide-pred.json.
 *                      NOT an official tide table and not for navigation; the page links EasyTide.
 *
 * Stores live in api/bm-wx-store/ (gitignored; the .htaccess denies the JSON). Images are served by
 * api/bm-wx-img.php with long cache headers because every file name carries its own UTC time.
 */

require_once __DIR__ . '/bm-radar-lib.php';

if (!defined('BMWX_UA_SITE')) define('BMWX_UA_SITE', '365techies-bournemouth365/1.0 (+https://365techies.co.uk/bournemouth/weather/)');
if (!defined('BMWX_SAT_FRAMES')) define('BMWX_SAT_FRAMES', 12);
if (!defined('BMWX_SAT_W')) define('BMWX_SAT_W', 960);
if (!defined('BMWX_SAT_H')) define('BMWX_SAT_H', 850);
// NASA daily still: Portland Bill to the Isle of Wight
if (!defined('BMWX_NASA_BOX')) define('BMWX_NASA_BOX', '-2.75,50.45,-1.25,51.05');
if (!defined('BMWX_NASA_W')) define('BMWX_NASA_W', 1200);
if (!defined('BMWX_NASA_H')) define('BMWX_NASA_H', 759);

/* ============================================================== small helpers */

function bmwx_state() { return bmwx_json_load('state.json'); }
function bmwx_state_save($s) { bmwx_json_save('state.json', $s); }

/** true (and stamps the time) when $key has not run for $gap seconds */
function bmwx_due(&$state, $key, $gap) {
    $last = isset($state['ran'][$key]) ? (int)$state['ran'][$key] : 0;
    if (time() - $last < $gap) return false;
    $state['ran'][$key] = time();
    return true;
}

/** Solar elevation in degrees (NOAA approximation, good to ~0.5 deg - only used to skip night frames). */
function bmwx_sun_elev($t, $lat = 50.72, $lon = -1.88) {
    $d = $t / 86400.0 + 2440587.5 - 2451545.0;
    $g = deg2rad(fmod(357.529 + 0.98560028 * $d, 360));
    $q = fmod(280.459 + 0.98564736 * $d, 360);
    $L = deg2rad(fmod($q + 1.915 * sin($g) + 0.020 * sin(2 * $g), 360));
    $e = deg2rad(23.439 - 0.00000036 * $d);
    $dec = asin(sin($e) * sin($L));
    $ra = atan2(cos($e) * sin($L), cos($L));
    $gmst = fmod(18.697374558 + 24.06570982441908 * $d, 24);
    $ha = deg2rad(fmod($gmst * 15 + $lon, 360)) - $ra;
    $el = asin(sin(deg2rad($lat)) * sin($dec) + cos(deg2rad($lat)) * cos($dec) * cos($ha));
    return rad2deg($el);
}

/** Decode a small 8-bit RGB/RGBA PNG (no interlace) to a byte string of pixels; null if unsupported. */
function bmwx_png_pixels($bin, &$w, &$h, &$ch) {
    if (substr($bin, 0, 8) !== "\x89PNG\r\n\x1a\n") return null;
    $pos = 8; $idat = ''; $w = $h = 0; $ch = 0; $ctype = -1;
    while ($pos + 8 <= strlen($bin)) {
        $len = unpack('N', substr($bin, $pos, 4)); $len = $len[1];
        $type = substr($bin, $pos + 4, 4);
        $data = substr($bin, $pos + 8, $len);
        if ($type === 'IHDR') {
            $hd = unpack('Nw/Nh/Cdepth/Cctype/Ccomp/Cfilter/Cinterlace', $data);
            if ($hd['depth'] != 8 || $hd['interlace'] != 0) return null;
            $w = $hd['w']; $h = $hd['h']; $ctype = $hd['ctype'];
            $ch = ($ctype == 6) ? 4 : (($ctype == 2) ? 3 : 0);
            if (!$ch) return null;
        } elseif ($type === 'IDAT') {
            $idat .= $data;
        } elseif ($type === 'IEND') {
            break;
        }
        $pos += 12 + $len;
    }
    $raw = @zlib_decode($idat);
    if ($raw === false) return null;
    $stride = $w * $ch; $out = ''; $prev = str_repeat("\0", $stride);
    for ($y = 0; $y < $h; $y++) {
        $f = ord($raw[$y * ($stride + 1)]);
        $line = substr($raw, $y * ($stride + 1) + 1, $stride);
        $cur = '';
        for ($x = 0; $x < $stride; $x++) {
            $a = $x >= $ch ? ord($cur[$x - $ch]) : 0;
            $b = ord($prev[$x]);
            $c = $x >= $ch ? ord($prev[$x - $ch]) : 0;
            $v = ord($line[$x]);
            switch ($f) {
                case 1: $v += $a; break;
                case 2: $v += $b; break;
                case 3: $v += ($a + $b) >> 1; break;
                case 4: $p = $a + $b - $c; $pa = abs($p - $a); $pb = abs($p - $b); $pc = abs($p - $c);
                        $v += ($pa <= $pb && $pa <= $pc) ? $a : (($pb <= $pc) ? $b : $c); break;
            }
            $cur .= chr($v & 255);
        }
        $out .= $cur; $prev = $cur;
    }
    return $out;
}

/* ============================================================== MEASURED: airport observations */

function bm_obs_refresh() {
    $r = bmwx_http_get('https://aviationweather.gov/api/data/metar?ids=EGHH&format=json&hours=18', '', 20, 'application/json');
    $j = ($r['code'] === 200) ? json_decode($r['body'], true) : null;
    if (!is_array($j)) {
        $c = bmwx_json_load('obs.json');
        if (empty($c['fail_since'])) $c['fail_since'] = time();
        bmwx_json_save('obs.json', $c);
        return 'obs:FAIL ' . $r['code'];
    }
    $series = array();
    foreach ($j as $m) {
        if (!isset($m['reportTime'])) continue;
        $series[] = array(
            /* obsTime is when the airport observed it; reportTime is the rounded issue slot */
            't' => isset($m['obsTime']) ? gmdate('c', (int)$m['obsTime']) : gmdate('c', strtotime($m['reportTime'])),
            'temp' => isset($m['temp']) ? $m['temp'] : null,
            'dewp' => isset($m['dewp']) ? $m['dewp'] : null,
            'wdir' => isset($m['wdir']) ? $m['wdir'] : null,        // degrees, or "VRB"
            'wspd' => isset($m['wspd']) ? $m['wspd'] : null,        // knots
            'wgst' => isset($m['wgst']) ? $m['wgst'] : null,        // knots
            'qnh' => isset($m['altim']) ? $m['altim'] : null,       // hPa
            'visib' => isset($m['visib']) ? $m['visib'] : null,
            'raw' => isset($m['rawOb']) ? $m['rawOb'] : '',
        );
    }
    usort($series, function ($a, $b) { return strcmp($b['t'], $a['t']); });
    bmwx_json_save('obs.json', array('fetched' => time(), 'fail_since' => 0, 'series' => $series));
    return 'obs:' . count($series);
}

function bm_obs_public() {
    $c = bmwx_json_load('obs.json');
    if (empty($c['series'])) return array('ok' => false, 'error' => 'no observations yet');
    $latest = $c['series'][0];
    $age = time() - strtotime($latest['t']);
    return array(
        'ok' => true,
        'station' => 'Bournemouth Airport (EGHH)',
        'note' => 'about 7 km inland of the pier',
        'stale' => $age > 90 * 60,
        'latest' => $latest,
        'series' => array_slice($c['series'], 0, 36),
    );
}

/* ============================================================== OFFICIAL: Met Office warnings */

function bm_warn_refresh() {
    $r = bmwx_http_get('https://www.metoffice.gov.uk/public/data/PWSCache/WarningsRSS/Region/sw', '', 20, 'application/rss+xml');
    if ($r['code'] !== 200 || strpos($r['body'], '<rss') === false) return 'warn:FAIL ' . $r['code'];
    $prev = libxml_use_internal_errors(true);
    $x = @simplexml_load_string($r['body']);
    libxml_use_internal_errors($prev);
    if (!$x || !isset($x->channel)) return 'warn:FAIL parse';
    $items = array();
    foreach ($x->channel->item as $it) {
        $items[] = array(
            'title' => (string)$it->title,
            'link' => (string)$it->link,
            'description' => (string)$it->description,
            'pubDate' => (string)$it->pubDate,
        );
    }
    bmwx_json_save('warn.json', array('fetched' => time(), 'region' => 'South West England', 'items' => $items));
    return 'warn:' . count($items);
}

function bm_warn_public() {
    $c = bmwx_json_load('warn.json');
    if (!isset($c['items'])) return array('ok' => false, 'error' => 'no warnings feed yet');
    return array(
        'ok' => true,
        'stale' => (time() - (int)$c['fetched']) > 3 * 3600,
        'checked' => gmdate('c', (int)$c['fetched']),
        'region' => $c['region'],
        'items' => $c['items'],
        'source_url' => 'https://www.metoffice.gov.uk/weather/warnings-and-advice/uk-warnings',
    );
}

/* ============================================================== FORECAST: Defra air quality */

function bm_air_refresh() {
    $r = bmwx_http_get('https://uk-air.defra.gov.uk/assets/rss/forecast.xml', '', 30);
    if ($r['code'] !== 200) return 'air:FAIL ' . $r['code'];
    if (!preg_match('~<title>BOURNEMOUTH</title>\s*<description><!\[CDATA\[(.*?)\]\]></description>\s*<pubDate>([^<]+)</pubDate>~s', $r['body'], $m)) {
        return 'air:FAIL no Bournemouth entry';
    }
    preg_match_all('~(Mon|Tue|Wed|Thu|Fri|Sat|Sun):\s*(\d+)~', $m[1], $dd, PREG_SET_ORDER);
    $days = array();
    foreach ($dd as $d) $days[] = array('day' => $d[1], 'index' => (int)$d[2]);
    if (!$days) return 'air:FAIL no values';
    bmwx_json_save('air.json', array('fetched' => time(), 'issued' => gmdate('c', strtotime($m[2])), 'days' => $days));
    return 'air:' . count($days);
}

function bm_air_public() {
    $c = bmwx_json_load('air.json');
    if (empty($c['days'])) return array('ok' => false, 'error' => 'no air quality forecast yet');
    if (time() - strtotime($c['issued']) > 36 * 3600) return array('ok' => false, 'error' => 'air quality forecast out of date');
    return array('ok' => true, 'issued' => $c['issued'], 'days' => $c['days'],
        'source_url' => 'https://uk-air.defra.gov.uk/air-pollution/daqi');
}

/* ============================================================== OBSERVED: satellites */

function bmwx_sat_products() {
    return array(
        'geo' => array('layer' => 'mtg_fd:rgb_geocolour', 'label' => 'Meteosat colour (day and night)', 'daylight' => false),
        'vis' => array('layer' => 'mtg_fd:vis06_hrfi', 'label' => 'Meteosat sharp visible (daylight)', 'daylight' => true),
    );
}

function bmwx_eumet_getmap($layer, $t) {
    $url = 'https://view.eumetsat.int/geoserver/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap'
        . '&LAYERS=' . rawurlencode($layer) . '&STYLES=&CRS=EPSG:4326'
        . '&BBOX=' . BMWX_BOX_S . ',' . BMWX_BOX_W . ',' . BMWX_BOX_N . ',' . BMWX_BOX_E
        . '&WIDTH=' . BMWX_SAT_W . '&HEIGHT=' . BMWX_SAT_H . '&FORMAT=image/jpeg'
        . '&TIME=' . gmdate('Y-m-d\TH:i:00\Z', $t);
    $r = bmwx_http_get($url, '', 40);
    if ($r['code'] !== 200 || stripos($r['type'], 'image/jpeg') === false || strlen($r['body']) < 8000) return null;
    return $r['body'];
}

function bm_sat_refresh($maxBuilds = 3) {
    $idx = bmwx_json_load('sat.json');
    $now = time();
    $out = array();
    foreach (bmwx_sat_products() as $key => $prod) {
        $frames = isset($idx[$key]) && is_array($idx[$key]) ? $idx[$key] : array();
        $have = array();
        foreach ($frames as $f) $have[$f['t']] = $f;
        $built = 0;
        // newest slot: images land ~20-30 min after the slot time; slots every 10 minutes
        for ($back = 20; $back <= 60 && $built < $maxBuilds; $back += 10) {
            $t = (int)(floor(($now - $back * 60) / 600) * 600);
            $iso = gmdate('c', $t);
            if (isset($have[$iso])) break;
            if ($prod['daylight'] && bmwx_sun_elev($t) < 3) break;
            $img = bmwx_eumet_getmap($prod['layer'], $t);
            if ($img === null) continue;
            $name = 'sat-' . $key . '-' . gmdate('YmdHi', $t) . '.jpg';
            @file_put_contents(bmwx_store_dir() . '/' . $name, $img);
            $have[$iso] = array('t' => $iso, 'file' => $name);
            $built++;
            break;
        }
        // back-fill the loop at 20-minute spacing behind the newest frame we hold
        krsort($have);
        $newest = $have ? strtotime(array_key_first($have)) : 0;
        for ($k = 1; $newest && $k < BMWX_SAT_FRAMES && $built < $maxBuilds; $k++) {
            $t = $newest - $k * 1200;
            $iso = gmdate('c', $t);
            if (isset($have[$iso])) continue;
            if ($prod['daylight'] && bmwx_sun_elev($t) < 3) continue;
            $img = bmwx_eumet_getmap($prod['layer'], $t);
            if ($img === null) continue;
            $name = 'sat-' . $key . '-' . gmdate('YmdHi', $t) . '.jpg';
            @file_put_contents(bmwx_store_dir() . '/' . $name, $img);
            $have[$iso] = array('t' => $iso, 'file' => $name);
            $built++;
        }
        krsort($have);
        // keep the 12 newest frames that are at least 15 minutes apart; the daylight product keeps
        // its last daylight loop through the night and the page says how old it is
        $keep = array(); $last = PHP_INT_MAX;
        foreach ($have as $iso => $f) {
            $ts = strtotime($iso);
            if ($last - $ts < 15 * 60) continue;
            $keep[] = $f; $last = $ts;
            if (count($keep) >= BMWX_SAT_FRAMES) break;
        }
        $keepFiles = array();
        foreach ($keep as $f) $keepFiles[$f['file']] = true;
        foreach (glob(bmwx_store_dir() . '/sat-' . $key . '-*.jpg') ?: array() as $fp) {
            if (!isset($keepFiles[basename($fp)])) @unlink($fp);
        }
        $idx[$key] = $keep;
        $out[] = $key . ':' . $built;
    }
    $idx['updated'] = gmdate('c', $now);
    bmwx_json_save('sat.json', $idx);
    return 'sat ' . implode(' ', $out);
}

/** NASA's once-a-day high-detail still, taken after the early-afternoon passes have landed. */
function bm_nasa_refresh() {
    $now = time();
    if ((int)gmdate('G', $now) < 15) return 'nasa:too early';
    $day = gmdate('Y-m-d', $now);
    $c = bmwx_json_load('nasa.json');
    if (isset($c['day']) && $c['day'] === $day) return 'nasa:have';
    list($w, $s, $e, $n) = array_map('floatval', explode(',', BMWX_NASA_BOX));
    $best = null;
    foreach (array('VIIRS_NOAA20_CorrectedReflectance_TrueColor' => 'NOAA-20',
                   'VIIRS_SNPP_CorrectedReflectance_TrueColor' => 'Suomi NPP',
                   'VIIRS_NOAA21_CorrectedReflectance_TrueColor' => 'NOAA-21') as $layer => $sat) {
        $base = 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap'
            . '&LAYERS=' . $layer . '&STYLES=&CRS=EPSG:4326&BBOX=' . "$s,$w,$n,$e" . '&TIME=' . $day;
        $thumb = bmwx_http_get($base . '&WIDTH=120&HEIGHT=76&FORMAT=image/png', '', 30);
        if ($thumb['code'] !== 200) continue;
        $pix = bmwx_png_pixels($thumb['body'], $tw, $th, $tc);
        $black = 1.0;
        if ($pix !== null) {
            $dark = 0; $total = $tw * $th;
            for ($i = 0; $i < $total; $i++) {
                $o = $i * $tc;
                if (ord($pix[$o]) < 8 && ord($pix[$o + 1]) < 8 && ord($pix[$o + 2]) < 8) $dark++;
            }
            $black = $dark / max(1, $total);
        }
        if ($best === null || $black < $best['black']) $best = array('layer' => $layer, 'sat' => $sat, 'black' => $black, 'base' => $base);
        if ($black < 0.01) break;
    }
    if ($best === null || $best['black'] > 0.25) return 'nasa:no usable pass yet';
    $img = bmwx_http_get($best['base'] . '&WIDTH=' . BMWX_NASA_W . '&HEIGHT=' . BMWX_NASA_H . '&FORMAT=image/jpeg', '', 60);
    if ($img['code'] !== 200 || strlen($img['body']) < 20000) return 'nasa:FAIL image';
    $name = 'nasa-' . gmdate('Ymd', $now) . '.jpg';
    @file_put_contents(bmwx_store_dir() . '/' . $name, $img['body']);
    foreach (glob(bmwx_store_dir() . '/nasa-*.jpg') ?: array() as $fp) {
        if (basename($fp) !== $name && filemtime($fp) < $now - 3 * 86400) @unlink($fp);
    }
    bmwx_json_save('nasa.json', array('day' => $day, 'file' => $name, 'satellite' => $best['sat'],
        'missing' => round($best['black'], 3), 'box' => BMWX_NASA_BOX));
    return 'nasa:' . $best['sat'];
}

function bm_sat_public() {
    $idx = bmwx_json_load('sat.json');
    $nasa = bmwx_json_load('nasa.json');
    $out = array('ok' => false, 'box' => array(BMWX_BOX_W, BMWX_BOX_S, BMWX_BOX_E, BMWX_BOX_N), 'products' => array());
    foreach (bmwx_sat_products() as $key => $prod) {
        $frames = array();
        foreach (array_reverse(isset($idx[$key]) ? $idx[$key] : array()) as $f) {
            $frames[] = array('t' => $f['t'], 'url' => '/api/bm-wx-img.php?f=' . rawurlencode($f['file']));
        }
        if ($frames) $out['ok'] = true;
        $out['products'][$key] = array('label' => $prod['label'], 'frames' => $frames);
    }
    if (!empty($nasa['file']) && time() - strtotime($nasa['day'] . 'T12:00:00Z') < 3 * 86400) {
        $out['nasa'] = array('day' => $nasa['day'], 'satellite' => $nasa['satellite'], 'box' => array_map('floatval', explode(',', $nasa['box'])),
            'url' => '/api/bm-wx-img.php?f=' . rawurlencode($nasa['file']));
    }
    return $out;
}

function bm_radar_public() {
    $idx = bmwx_json_load('radar.json');
    $frames = array();
    foreach (array_reverse(isset($idx['frames']) ? $idx['frames'] : array()) as $f) {
        $frames[] = array('t' => $f['t'], 'url' => '/api/bm-wx-img.php?f=' . rawurlencode($f['file']),
            'local_ok' => !empty($f['local_ok']), 'max_mmh' => $f['max_mmh'], 'home_mmh' => $f['home_mmh'], 'raining_px' => $f['raining_px']);
    }
    $newest = $frames ? strtotime($frames[count($frames) - 1]['t']) : 0;
    return array('ok' => (bool)$frames, 'stale' => $newest && (time() - $newest) > 90 * 60, 'frames' => $frames,
        'box' => array(BMWX_BOX_W, BMWX_BOX_S, BMWX_BOX_E, BMWX_BOX_N));
}

/* ============================================================== PREDICTED: tides */

function bmtide_data() {
    static $d = null;
    if ($d === null) {
        $f = __DIR__ . '/bm-tide-pred.json';
        $d = file_exists($f) ? json_decode((string)file_get_contents($f), true) : array();
        if (!is_array($d)) $d = array();
    }
    return $d;
}

/** predicted level (m ODN) at unix time $t by linear interpolation of the 10-minute series */
function bmtide_at($d, $t) {
    $start = strtotime($d['start']); $step = (int)$d['step_s'];
    $x = ($t - $start) / $step; $i = (int)floor($x);
    if ($i < 0 || $i + 1 >= count($d['h_cm'])) return null;
    $f = $x - $i;
    return (($d['h_cm'][$i] * (1 - $f)) + ($d['h_cm'][$i + 1] * $f)) / 100.0;
}

function bm_tide_public($seaTide) {
    $d = bmtide_data();
    if (empty($d['h_cm'])) return array('ok' => false, 'error' => 'no tide predictions installed');
    $now = time();
    $cd = (float)$d['datum']['cd_below_odn'];
    $end = strtotime($d['start']) + (count($d['h_cm']) - 1) * (int)$d['step_s'];
    if ($now > $end - 2 * 86400) return array('ok' => false, 'error' => 'tide predictions have run out - they need regenerating');

    $curve = array();
    for ($t = (int)(floor(($now - 12 * 3600) / 1200) * 1200); $t <= $now + 60 * 3600; $t += 1200) {
        $h = bmtide_at($d, $t);
        if ($h !== null) $curve[] = array(gmdate('c', $t), round($h + $cd, 2));
    }
    $events = array();
    foreach ($d['events'] as $e) {
        $te = strtotime($e[0]);
        if ($te < $now - 12 * 3600) continue;
        if ($te > $now + 11 * 86400) break;   // the 10-day forecast's day detail shows each day's tides
        $events[] = array('t' => $e[0], 'type' => $e[1], 'h' => round($e[2] / 100 + $cd, 2));
    }
    // Rise and fall per UK day for the next 11 days. Poole Bay's neap tides can be almost flat (predicted
    // 19 Sep 2026: 1.60-1.97 m all day), when "the" high and low times are ambiguous - the page flags
    // those days instead of presenting precise-looking times as if they meant much.
    $days = array();
    $tz = new DateTimeZone('Europe/London');
    $dt = new DateTime('@' . $now); $dt->setTimezone($tz); $dt->setTime(0, 0, 0);
    for ($k = 0; $k < 11; $k++) {
        $a = $dt->getTimestamp(); $dt->modify('+1 day'); $b = $dt->getTimestamp();
        $lo = null; $hi = null;
        for ($t = $a; $t < $b; $t += 600) {
            $h = bmtide_at($d, $t);
            if ($h === null) continue;
            if ($lo === null || $h < $lo) $lo = $h;
            if ($hi === null || $h > $hi) $hi = $h;
        }
        if ($lo !== null) $days[] = array('d' => date('Y-m-d', $a), 'lo' => round($lo + $cd, 2), 'hi' => round($hi + $cd, 2), 'range' => round($hi - $lo, 2));
    }
    $out = array(
        'ok' => true,
        'days' => $days,
        'station' => $d['station'],
        'method' => $d['method'],
        'datum' => $d['datum'],
        'accuracy' => $d['accuracy'],
        'valid_to' => gmdate('c', $end),
        'now' => array('t' => gmdate('c', $now), 'pred' => round(bmtide_at($d, $now) + $cd, 2)),
        'curve' => $curve,
        'events' => $events,
    );
    // measured overlay from the sea layer's pier gauge block (same instrument the prediction was fitted to)
    if (is_array($seaTide) && !empty($seaTide['ok']) && !empty($seaTide['series'])) {
        $meas = array();
        foreach ($seaTide['series'] as $p) $meas[] = array($p[0], round($p[1] + $cd, 2));
        $out['measured'] = $meas;
        $last = end($seaTide['series']);
        $lt = strtotime($last[0]);
        $pl = bmtide_at($d, $lt);
        if ($pl !== null && ($now - $lt) < 2 * 3600) {
            $out['now']['measured'] = round($last[1] + $cd, 2);
            $out['now']['measured_at'] = gmdate('c', $lt);
            $out['now']['residual_cm'] = (int)round(($last[1] - $pl) * 100);
            $out['now']['trend'] = isset($seaTide['trend']) ? $seaTide['trend'] : null;
        }
    }
    return $out;
}

/* ============================================================== orchestration */

/**
 * Cron entry point. Each source keeps its own cadence; radar and satellite back-fill a few frames per
 * run so the first deploy fills its loops within an hour without one long request.
 */
function bm_wx_refresh($light = false) {
    $lk = @fopen(__DIR__ . '/bm-wx.lock', 'c');
    if (!$lk || !@flock($lk, LOCK_EX | LOCK_NB)) return array('busy' => true);
    $state = bmwx_state();
    $did = array();
    if (bmwx_due($state, 'obs', 10 * 60)) $did[] = bm_obs_refresh();
    if (bmwx_due($state, 'warn', 15 * 60)) $did[] = bm_warn_refresh();
    if (bmwx_due($state, 'air', 3 * 3600)) $did[] = bm_air_refresh();
    bmwx_state_save($state);   // save before the slow jobs so a timeout cannot repeat the quick ones
    if (bmwx_due($state, 'radar', 5 * 60)) { $r = bm_radar_refresh($light ? 1 : 3); $did[] = $r['radar']; }
    if (bmwx_due($state, 'sat', 5 * 60)) $did[] = bm_sat_refresh($light ? 1 : 3);
    if (!$light && bmwx_due($state, 'nasa', 30 * 60)) $did[] = bm_nasa_refresh();
    bmwx_state_save($state);
    @file_put_contents(bmwx_store_dir() . '/beat.json', json_encode(array('t' => time(), 'at' => date('Y-m-d H:i'), 'did' => $did)));
    @flock($lk, LOCK_UN); @fclose($lk);
    return array('refreshed' => $did);
}
