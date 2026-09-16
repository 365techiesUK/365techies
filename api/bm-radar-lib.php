<?php
/**
 * Bournemouth365 rain radar - builds animated radar frames for /bournemouth/weather/.
 * Library only (included by tm-cron.php via bm-wx-lib.php and by the public endpoint); no echo/exit.
 *
 * SOURCE: EUMETNET OPERA "NIMBUS instantaneous rain rate composite" (RATE), a new composite every 5
 * minutes, 2 km grid, published as cloud-optimised GeoTIFF in a public 24-hour cache:
 *   https://s3.waw3-1.cloudferro.com/openradar-24h/YYYY/MM/DD/OPERA/COMP/OPERA@YYYYMMDDTHHMM@0@RATE.tiff
 * LICENCE: CC BY 4.0 (EUMETNET; stated in each file's own metadata). Attribution on the page.
 * Checked 16 Sep 2026: the composite's node list carries the UK network (ukdea = Dean Hill near
 * Salisbury, ukcob = Cobbacombe, ukche = Chenies, ukjer = Jersey ...). In-coverage "no rain" is NaN
 * (the file's `undetect`); out-of-coverage is the -9999000 fill value. The two are drawn differently,
 * and a frame whose node list has lost the radars that see Bournemouth says so instead of looking dry.
 *
 * WHY THIS SHAPE: the whole file is 3-5 MB every 5 minutes. A COG is tiled, so we read the first
 * 16 KB (TIFF header, tile index, metadata) and then only the two 512x512 tiles that cover the
 * south coast (~150 KB). No GD on the assumption list: the PNG is written in pure PHP with zlib.
 *
 * PROJECTION: Lambert azimuthal equal-area on the WGS84 ellipsoid, lat0 55, lon0 10, false easting
 * 1,950,000, false northing -2,100,000 (from the file's GeoDoubleParams; read per file, not assumed).
 * Output: an equirectangular (plate carree) frame for the map box below, the same box as the base map
 * and the satellite frames, so the three layers stack exactly.
 */

if (!defined('BMWX_BOX_W')) {
    define('BMWX_BOX_W', -4.2);   // west lon
    define('BMWX_BOX_E', 0.6);    // east lon
    define('BMWX_BOX_S', 49.2);   // south lat
    define('BMWX_BOX_N', 51.9);   // north lat
}
if (!defined('BMRAD_BASE'))    define('BMRAD_BASE', 'https://s3.waw3-1.cloudferro.com/openradar-24h/');
if (!defined('BMRAD_OUT_W'))   define('BMRAD_OUT_W', 480);
if (!defined('BMRAD_OUT_H'))   define('BMRAD_OUT_H', 425);
if (!defined('BMRAD_FRAMES'))  define('BMRAD_FRAMES', 12);          // loop length
if (!defined('BMRAD_SPACING')) define('BMRAD_SPACING', 15 * 60);    // seconds between loop frames
// radars whose loss makes the Bournemouth picture untrustworthy
if (!defined('BMRAD_LOCAL_NODES')) define('BMRAD_LOCAL_NODES', 'ukdea,ukcob,ukche');

function bmwx_store_dir() {
    $d = __DIR__ . '/bm-wx-store';
    if (!is_dir($d)) @mkdir($d, 0755, true);
    return $d;
}

function bmwx_http_get($url, $range = '', $timeout = 25, $accept = '') {
    $ch = @curl_init($url);
    if (!$ch) return array('code' => 0, 'body' => '', 'type' => '');
    $h = array();
    if ($range !== '') $h[] = 'Range: bytes=' . $range;
    if ($accept !== '') $h[] = 'Accept: ' . $accept;
    @curl_setopt_array($ch, array(
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => $timeout,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS => 3,
        CURLOPT_HTTPHEADER => $h,
        CURLOPT_USERAGENT => '365techies-bournemouth365/1.0 (+https://365techies.co.uk/bournemouth/weather/)',
    ));
    $body = @curl_exec($ch);
    $code = (int)@curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $type = (string)@curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    @curl_close($ch);
    return array('code' => $code, 'body' => ($body === false ? '' : $body), 'type' => $type);
}

function bmwx_json_load($name) {
    $f = bmwx_store_dir() . '/' . $name;
    $c = file_exists($f) ? json_decode((string)@file_get_contents($f), true) : null;
    return is_array($c) ? $c : array();
}

function bmwx_json_save($name, $data) {
    $f = bmwx_store_dir() . '/' . $name;
    $tmp = $f . '.' . getmypid() . '.tmp';
    if (@file_put_contents($tmp, json_encode($data), LOCK_EX) !== false) @rename($tmp, $f);
}

/* ------------------------------------------------------------------ TIFF (little-endian, classic) */

function bmrad_u16($b, $o) { $v = unpack('v', substr($b, $o, 2)); return $v[1]; }
function bmrad_u32($b, $o) { $v = unpack('V', substr($b, $o, 4)); return $v[1]; }

/** Parse IFD 0 of a classic little-endian TIFF held (at least partly) in $head. */
function bmrad_ifd0($head) {
    if (strlen($head) < 16 || substr($head, 0, 4) !== "II*\0") return null;
    $ifd = bmrad_u32($head, 4);
    if ($ifd + 2 > strlen($head)) return null;
    $n = bmrad_u16($head, $ifd);
    $sizes = array(1 => 1, 2 => 1, 3 => 2, 4 => 4, 5 => 8, 6 => 1, 7 => 1, 8 => 2, 9 => 4, 10 => 8, 11 => 4, 12 => 8, 16 => 8);
    $tags = array();
    for ($i = 0; $i < $n; $i++) {
        $e = $ifd + 2 + $i * 12;
        $tag = bmrad_u16($head, $e);
        $type = bmrad_u16($head, $e + 2);
        $count = bmrad_u32($head, $e + 4);
        $len = (isset($sizes[$type]) ? $sizes[$type] : 1) * $count;
        $off = ($len <= 4) ? $e + 8 : bmrad_u32($head, $e + 8);
        if ($off + $len > strlen($head)) { $tags[$tag] = null; continue; }
        $raw = substr($head, $off, $len);
        switch ($type) {
            case 2: $tags[$tag] = rtrim($raw, "\0"); break;
            case 3: $tags[$tag] = array_values(unpack('v' . $count, $raw)); break;
            case 4: $tags[$tag] = array_values(unpack('V' . $count, $raw)); break;
            case 12: $tags[$tag] = array_values(unpack('e' . $count, $raw)); break;   // little-endian double
            default: $tags[$tag] = $raw;
        }
    }
    return $tags;
}

/* ------------------------------------------------------------------ projection */

/** WGS84 ellipsoidal LAEA forward (Snyder 1987, eqs 3-12, 24-6..24-11). Returns metres incl. false origin. */
function bmrad_laea($lat, $lon, $p) {
    static $cache = array();
    $key = implode(',', $p);
    if (!isset($cache[$key])) {
        $a = $p['a']; $f = 1 / $p['invf']; $e2 = 2 * $f - $f * $f; $e = sqrt($e2);
        $q = function ($phi) use ($e, $e2) {
            $s = sin($phi);
            return (1 - $e2) * ($s / (1 - $e2 * $s * $s) - (1 / (2 * $e)) * log((1 - $e * $s) / (1 + $e * $s)));
        };
        $phi0 = deg2rad($p['lat0']);
        $qp = $q(M_PI / 2);
        $rq = $a * sqrt($qp / 2);
        $b1 = asin($q($phi0) / $qp);
        $d = $a * cos($phi0) / sqrt(1 - $e2 * sin($phi0) * sin($phi0)) / ($rq * cos($b1));
        $cache[$key] = array($q, $qp, $rq, $b1, $d, deg2rad($p['lon0']));
    }
    list($q, $qp, $rq, $b1, $d, $lam0) = $cache[$key];
    $beta = asin(max(-1, min(1, $q(deg2rad($lat)) / $qp)));
    $dl = deg2rad($lon) - $lam0;
    $bb = $rq * sqrt(2 / (1 + sin($b1) * sin($beta) + cos($b1) * cos($beta) * cos($dl)));
    $x = $bb * $d * cos($beta) * sin($dl);
    $y = ($bb / $d) * (cos($b1) * sin($beta) - sin($b1) * cos($beta) * cos($dl));
    return array($x + $p['fe'], $y + $p['fn']);
}

/* ------------------------------------------------------------------ colour + PNG */

/** mm/h -> RGBA. Bands follow the usual UK radar reading: drizzle to torrential. */
function bmrad_colour($v) {
    if ($v < 0.1)  return null;
    if ($v < 0.5)  return array(116, 185, 255, 150);
    if ($v < 1)    return array(64, 140, 255, 190);
    if ($v < 2)    return array(28, 96, 232, 210);
    if ($v < 4)    return array(40, 190, 90, 220);
    if ($v < 8)    return array(250, 220, 40, 230);
    if ($v < 16)   return array(255, 140, 20, 235);
    if ($v < 32)   return array(240, 40, 30, 240);
    return array(210, 40, 210, 245);
}

function bmrad_png($w, $h, $rgba) {
    $raw = '';
    for ($y = 0; $y < $h; $y++) {
        $raw .= "\0" . substr($rgba, $y * $w * 4, $w * 4);
    }
    $chunk = function ($type, $data) {
        return pack('N', strlen($data)) . $type . $data . pack('N', crc32($type . $data) & 0xFFFFFFFF);
    };
    return "\x89PNG\r\n\x1a\n"
        . $chunk('IHDR', pack('NNCCCCC', $w, $h, 8, 6, 0, 0, 0))
        . $chunk('IDAT', gzcompress($raw, 6))
        . $chunk('IEND', '');
}

/* ------------------------------------------------------------------ one frame */

function bmrad_key($t) {
    return gmdate('Y/m/d', $t) . '/OPERA/COMP/OPERA@' . gmdate('Ymd\THi', $t) . '@0@RATE.tiff';
}

/**
 * Build one frame for composite time $t (UTC epoch, a 5-minute boundary).
 * Returns array(ok, png bytes, meta) or array(ok=false, error).
 */
function bmrad_build_frame($t) {
    $url = BMRAD_BASE . bmrad_key($t);
    $h = bmwx_http_get($url, '0-16383');
    if (($h['code'] !== 206 && $h['code'] !== 200) || strlen($h['body']) < 1024) {
        return array('ok' => false, 'error' => 'not published (' . $h['code'] . ')');
    }
    $tags = bmrad_ifd0($h['body']);
    if (!$tags || empty($tags[256]) || empty($tags[322]) || empty($tags[324]) || empty($tags[325])) {
        return array('ok' => false, 'error' => 'unreadable header');
    }
    $W = $tags[256][0]; $H = $tags[257][0]; $tw = $tags[322][0]; $th = $tags[323][0];
    if ((isset($tags[259]) && $tags[259][0] != 8) || (isset($tags[317]) && $tags[317][0] != 1)) {
        return array('ok' => false, 'error' => 'unexpected compression/predictor');
    }
    $spp = isset($tags[277]) ? $tags[277][0] : 1;
    $scale = isset($tags[33550]) ? $tags[33550] : null;          // pixel size (m)
    $tie = isset($tags[33922]) ? $tags[33922] : null;            // i,j,k,x,y,z
    $geo = isset($tags[34736]) ? $tags[34736] : null;            // lat0, lon0, fe, fn, invf, a, ...
    if (!$scale || !$tie || !$geo || count($geo) < 6) return array('ok' => false, 'error' => 'no georeference');
    $meta = isset($tags[42112]) && is_string($tags[42112]) ? $tags[42112] : '';
    preg_match_all("/'(uk[a-z]{3})'/", $meta, $mm);
    $uk = array_values(array_unique($mm[1]));
    $local = array_values(array_intersect(explode(',', BMRAD_LOCAL_NODES), $uk));
    $p = array('lat0' => $geo[0], 'lon0' => $geo[1], 'fe' => $geo[2], 'fn' => $geo[3], 'invf' => $geo[4], 'a' => $geo[5]);
    $px = $scale[0]; $py = $scale[1]; $ox = $tie[3]; $oy = $tie[4];

    // which source pixel does each output pixel sample? Two flat int arrays, not an array of pairs:
    // 204k pairs would cost ~80 MB of PHP memory; packed int arrays cost ~3 MB each.
    $OW = BMRAD_OUT_W; $OH = BMRAD_OUT_H;
    $need = array();
    $mapTile = array();
    $mapOff = array();
    $tilesAcross = (int)ceil($W / $tw);
    for ($j = 0; $j < $OH; $j++) {
        $lat = BMWX_BOX_N - ($j + 0.5) / $OH * (BMWX_BOX_N - BMWX_BOX_S);
        for ($i = 0; $i < $OW; $i++) {
            $lon = BMWX_BOX_W + ($i + 0.5) / $OW * (BMWX_BOX_E - BMWX_BOX_W);
            list($x, $y) = bmrad_laea($lat, $lon, $p);
            $col = (int)floor(($x - $ox) / $px);
            $row = (int)floor(($oy - $y) / $py);
            if ($col < 0 || $row < 0 || $col >= $W || $row >= $H) { $mapTile[] = -1; $mapOff[] = 0; continue; }
            $ti = intdiv($row, $th) * $tilesAcross + intdiv($col, $tw);
            $need[$ti] = true;
            $mapTile[] = $ti;
            $mapOff[] = ($row % $th) * $tw + ($col % $tw);
        }
    }
    if (count($need) > 6) return array('ok' => false, 'error' => 'box needs too many tiles');

    $tiles = array();
    foreach (array_keys($need) as $ti) {
        if (!isset($tags[324][$ti], $tags[325][$ti])) return array('ok' => false, 'error' => 'tile index out of range');
        $o = $tags[324][$ti]; $n = $tags[325][$ti];
        $r = bmwx_http_get($url, $o . '-' . ($o + $n - 1), 30);
        if (($r['code'] !== 206 && $r['code'] !== 200) || strlen($r['body']) < $n) return array('ok' => false, 'error' => 'tile fetch ' . $r['code']);
        $bin = @zlib_decode(substr($r['body'], 0, $n));
        if ($bin === false || strlen($bin) < $tw * $th * 4 * $spp) return array('ok' => false, 'error' => 'tile inflate');
        $tiles[$ti] = $bin;
    }

    // one 4-byte string per pixel, imploded once at the end (substr_replace per pixel would copy the
    // whole 800 KB buffer for every rainy pixel)
    $px4 = array_fill(0, $OW * $OH, "\0\0\0\0");
    $raining = 0; $covered = 0; $maxRate = 0.0; $atHome = null;
    $homeK = (int)floor((BMWX_BOX_N - 50.7163) / (BMWX_BOX_N - BMWX_BOX_S) * $OH) * $OW
           + (int)floor((-1.8762 - BMWX_BOX_W) / (BMWX_BOX_E - BMWX_BOX_W) * $OW);
    $n = $OW * $OH;
    for ($k = 0; $k < $n; $k++) {
        $ti = $mapTile[$k];
        if ($ti === -1) continue;
        $v = unpack('g', substr($tiles[$ti], $mapOff[$k] * 4 * $spp, 4));   // band 1, little-endian float32
        $v = $v[1];
        if ($k === $homeK) $atHome = is_nan($v) ? 0.0 : ($v < -1000000 ? null : $v);
        if (is_nan($v)) { $covered++; continue; }                 // in coverage, nothing falling
        if ($v < -1000000) { $px4[$k] = "\x80\x8a\x96\x38"; continue; }   // out of coverage: faint grey veil
        $covered++;
        $c = bmrad_colour($v);
        if ($c === null) continue;
        $raining++;
        if ($v > $maxRate) $maxRate = $v;
        $px4[$k] = chr($c[0]) . chr($c[1]) . chr($c[2]) . chr($c[3]);
    }
    return array(
        'ok' => true,
        'png' => bmrad_png($OW, $OH, implode('', $px4)),
        'meta' => array(
            't' => gmdate('c', $t),
            'uk_nodes' => count($uk),
            'local_nodes' => $local,
            'local_ok' => count($local) > 0,
            'raining_px' => $raining,
            'covered_px' => $covered,
            'max_mmh' => round($maxRate, 1),
            'home_mmh' => $atHome === null ? null : round($atHome, 1),
        ),
    );
}

/**
 * Keep a loop of BMRAD_FRAMES frames BMRAD_SPACING apart, newest first. Each run adds the newest
 * published composite and back-fills any missing slot (first run fills the whole loop).
 */
function bm_radar_refresh($maxBuilds = 3) {
    $idx = bmwx_json_load('radar.json');
    $frames = isset($idx['frames']) && is_array($idx['frames']) ? $idx['frames'] : array();
    $have = array();
    foreach ($frames as $f) $have[$f['t']] = $f;
    $now = time();
    $built = 0; $did = array();

    // newest published composite. RATE is issued on the quarter hour (DBZH every 5 min) and lands
    // ~10 minutes later (observed 16 Sep 2026), so look back 8..53 minutes in 15-minute steps.
    $newest = null;
    for ($back = 8; $back <= 53 && $newest === null; $back += 15) {
        $t = (int)(floor(($now - $back * 60) / 900) * 900);
        if (isset($have[gmdate('c', $t)])) { $newest = $t; break; }
        $r = bmrad_build_frame($t);
        if (!empty($r['ok'])) {
            $name = 'radar-' . gmdate('YmdHi', $t) . '.png';
            @file_put_contents(bmwx_store_dir() . '/' . $name, $r['png']);
            $r['meta']['file'] = $name;
            $have[$r['meta']['t']] = $r['meta'];
            $newest = $t; $built++; $did[] = gmdate('H:i', $t);
        }
    }
    if ($newest === null) return array('radar' => 'no new composite');

    // back-fill the loop slots (newest - k * spacing)
    for ($k = 1; $k < BMRAD_FRAMES && $built < $maxBuilds; $k++) {
        $t = $newest - $k * BMRAD_SPACING;
        $iso = gmdate('c', $t);
        if (isset($have[$iso])) continue;
        $r = bmrad_build_frame($t);
        if (!empty($r['ok'])) {
            $name = 'radar-' . gmdate('YmdHi', $t) . '.png';
            @file_put_contents(bmwx_store_dir() . '/' . $name, $r['png']);
            $r['meta']['file'] = $name;
            $have[$iso] = $r['meta'];
            $built++; $did[] = gmdate('H:i', $t);
        }
    }

    // keep only slots on the newest's grid, newest first, and delete the rest from disk
    $keep = array();
    for ($k = 0; $k < BMRAD_FRAMES; $k++) {
        $iso = gmdate('c', $newest - $k * BMRAD_SPACING);
        if (isset($have[$iso])) $keep[] = $have[$iso];
    }
    $keepFiles = array();
    foreach ($keep as $f) $keepFiles[$f['file']] = true;
    foreach (glob(bmwx_store_dir() . '/radar-*.png') ?: array() as $fp) {
        if (!isset($keepFiles[basename($fp)])) @unlink($fp);
    }
    bmwx_json_save('radar.json', array('updated' => gmdate('c', $now), 'frames' => $keep));
    return array('radar' => $did ? implode(' ', $did) : 'up to date');
}
