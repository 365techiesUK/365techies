<?php
/**
 * signal-log.php — receiver + server for the 365 Crafter's own measured
 * 4G/5G signal map.
 *
 * This stores ONLY 365 Techies' OWN van data (its M5 router + its Cerbo GPS).
 * It is deliberately NOT a crowd-sourced endpoint — no third-party location is
 * ever accepted, which is exactly what keeps it out of GDPR sharing territory
 * (see SIGNAL-MAP-DECISION.md). Do not add a public "submit your location" path
 * to this file.
 *
 *   POST  (with X-Token header)  → append one reading
 *   GET   ?since=<epoch>         → return readings as JSON for the map
 *
 * Storage is a flat rolling JSON file, capped, which is plenty at ~1 reading /
 * 30 s. Move to MySQL only if volume ever demands it.
 */

declare(strict_types=1);

// ── config ──────────────────────────────────────────────────────────────────
const DATA_FILE   = __DIR__ . '/signal-data.json';  // gitignored, like api/*-cache.json
const MAX_POINTS  = 20000;          // ~1 week at 30 s; oldest trimmed
// PRIVACY EMBARGO: points younger than this are recorded but NOT published, so
// the public map can't act as a live tracker of where the van is right now.
// Owner set this to 1 hour on 2026-08-12 (was 24 h) so the map is useful the
// same day. ⚠️ The home address is protected separately and unconditionally by
// the geo-fence below, which strips location entirely inside it — that does NOT
// depend on this delay. Trade-off accepted: at 1 h, a long stop is inferable.
const EMBARGO_S   = 3600;           // 1 hour
const COORD_DP    = 5;              // ~1.1 m; rounding limits precision on disk
// Token lives in a gitignored include, like api/tm-key.php on the live site.
$__t = @include __DIR__ . '/signal-token.php';
define('SHARED_TOKEN', is_string($__t) ? $__t : '');
// Optional PRIVATE EXCLUSION ZONE (owner's home). Server-only, gitignored —
// the coordinates must never exist in this public repo. To enable, create
// api/geo-fence.php via File Manager containing:
//     <?php return [50.0000, -1.0000, 300];   // lat, lon, radius in metres
// Points inside the fence keep their signal reading but have their location
// STRIPPED — at POST (future points) AND at GET (points stored before the
// fence existed), so enabling it retroactively hides history too.
// An optional 4th element widens the zone in which a spot may be PLOTTED but
// never NAMED. Plotting an anonymous dot near base is harmless; printing
// "Bear Cross — 61 Mbps, 98 tests" is not, because a high test count is a
// habitual-parking tell. Falls back to 5x the strip radius if not given.
//     <?php return [50.0000, -1.0000, 300, 2000];   // lat, lon, strip m, no-name m
$__f = @include __DIR__ . '/geo-fence.php';
define('GEO_FENCE', (is_array($__f) && count($__f) >= 3
    && is_numeric($__f[0]) && is_numeric($__f[1]) && is_numeric($__f[2])) ? $__f : null);
define('NO_NAME_M', GEO_FENCE ? (float)(GEO_FENCE[3] ?? GEO_FENCE[2] * 5) : 0.0);

// ── summary mode: ?summary=1 ────────────────────────────────────────────────
// Returns a small, PLACE-NAMED, privacy-filtered digest of the best-measured
// spots. Exists so the public page can be SERVER-RENDERED with real place
// names and numbers: AI crawlers (GPTBot, ClaudeBot, PerplexityBot) do not run
// JavaScript, so anything only drawn by the map is invisible to them — and the
// ranked spots are the one uniquely-owned, quotable thing here.
const SUMMARY_CELL_LAT = 500;    // ~220 m cells, same grid the map ranks on
const SUMMARY_CELL_LON = 333;
const SUMMARY_MIN_TESTS = 2;     // a single reading is noise, not a "spot"
const SUMMARY_FRESH_S  = 420;    // a speed test only counts at the place it ran
const SUMMARY_MAX      = 8;
// New Nominatim lookups allowed per request (cached ones are free). Keeps us
// inside OSM's 1-req/sec policy on a cold cache - see locality_for().
const GEO_LOOKUP_BUDGET = 20;

header('Content-Type: application/json; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// ── GET: serve points for the map (public read of the firm's own data) ───────
if ($method === 'GET') {
    $since = isset($_GET['since']) ? (float)$_GET['since'] : 0.0;
    $points = load_points();
    // PRIVACY EMBARGO — see EMBARGO_S at the top of this file.
    $cutoff = time() - EMBARGO_S;
    $points = array_values(array_filter($points, fn($p) => ($p['t'] ?? 0) < $cutoff));
    // Private exclusion zone: strip location from any stored point inside the
    // fence (covers points recorded before the fence file existed).
    $points = array_map('strip_if_fenced', $points);
    // Drop synthetic records from endpoint testing. The whole value of this
    // dataset is that every row is a real measurement, and it may be offered
    // as a download later — one fake row would poison it.
    $points = array_values(array_filter($points, function ($p) {
        $net = strtoupper((string)($p['net'] ?? ''));
        return $net !== 'FENCEPROBE' && $net !== 'TOKENTEST' && $net !== 'TEST';
    }));
    if (isset($_GET['summary'])) {
        header('Cache-Control: no-store, max-age=0');
        echo json_encode(build_summary($points));
        exit;
    }
    // CSV download. Offering the data openly under CC BY 4.0 is deliberate:
    // it makes attribution a condition of reuse, which is the only link
    // mechanism here that needs no outreach at all.
    if (isset($_GET['format']) && $_GET['format'] === 'csv') {
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="365techies-van-signal-readings.csv"');
        header('Cache-Control: no-store, max-age=0');
        $out = fopen('php://output', 'w');
        fwrite($out, "# 365 Techies campervan signal readings\n");
        fwrite($out, "# Source: https://365techies.co.uk/van-signal-map/\n");
        fwrite($out, "# Licence: CC BY 4.0 - free to reuse with attribution to 365 Techies\n");
        fwrite($out, "# One van, one network (Three UK). Measured, not modelled.\n");
        fwrite($out, "# Readings within a private zone have no coordinates by design.\n");
        fputcsv($out, ['utc_time','lat','lon','download_mbps','speed_test_age_s','latency_ms','rsrp_dbm','sinr_db','network','band']);
        foreach ($points as $p) {
            fputcsv($out, [
                gmdate('c', (int)($p['t'] ?? 0)),
                $p['lat'] ?? '', $p['lon'] ?? '',
                $p['dl'] ?? '', $p['dl_age'] ?? '', $p['latency'] ?? '',
                $p['rsrp'] ?? '', $p['sinr'] ?? '',
                $p['net'] ?? '', $p['band'] ?? '',
            ]);
        }
        fclose($out);
        exit;
    }
    if ($since > 0) {
        $points = array_values(array_filter($points, fn($p) => ($p['t'] ?? 0) > $since));
    }
    // newest last; cap what we hand a browser
    $points = array_slice($points, -5000);
    echo json_encode([
        'ok'     => true,
        'count'  => count($points),
        'points' => $points,
    ]);
    exit;
}

// ── POST: append one reading (van only, token-gated) ─────────────────────────
if ($method === 'POST') {
    $token = $_SERVER['HTTP_X_TOKEN'] ?? '';
    // Reject if the server token is unset (file not placed) OR doesn't match.
    if (SHARED_TOKEN === '' || !hash_equals(SHARED_TOKEN, (string)$token)) {
        http_response_code(401);
        echo json_encode(['ok' => false, 'error' => 'bad token']);
        exit;
    }

    $raw = file_get_contents('php://input');
    $in  = json_decode($raw, true);
    if (!is_array($in)) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'bad json']);
        exit;
    }

    // Whitelist + coerce. Anything not listed is dropped.
    $p = [
        't'    => isset($in['t']) ? (float)$in['t'] : microtime(true),
        'rsrp' => num($in['rsrp'] ?? null),
        'sinr' => num($in['sinr'] ?? null),
        'net'  => str_clip($in['net'] ?? null, 12),
        'band' => str_clip($in['band'] ?? null, 20),
        // Fresh every 30s (unlike dl), so it genuinely belongs to this point's
        // location — and it's what decides if a spot works for video calls.
        'latency' => num($in['latency'] ?? null),
        'dl'   => num($in['dl'] ?? null),
        // Age of the speed reading in seconds when this point was recorded.
        // The base sensor only retests hourly; a drive automation forces a
        // test every 5 min. The map treats dl as "tested near this spot" only
        // when dl_age is small — otherwise an hour-old number gets silently
        // attributed to every location driven through since.
        'dl_age' => num($in['dl_age'] ?? null),
    ];
    // Location is optional — until the Cerbo GPS dongle is fitted it may be null.
    if (isset($in['lat'], $in['lon'])) {
        $lat = (float)$in['lat'];
        $lon = (float)$in['lon'];
        if ($lat >= -90 && $lat <= 90 && $lon >= -180 && $lon <= 180
            && !($lat == 0.0 && $lon == 0.0)
            && !in_fence($lat, $lon)) {   // never store a location inside the private zone
            $p['lat'] = round($lat, COORD_DP);
            $p['lon'] = round($lon, COORD_DP);
        }
    }

    append_point($p);
    echo json_encode(['ok' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['ok' => false, 'error' => 'method not allowed']);
exit;

// ── helpers ──────────────────────────────────────────────────────────────────
function num($v) {
    if ($v === null || $v === '' || !is_numeric($v)) return null;
    return 0 + $v;
}
function str_clip($v, int $max) {
    if ($v === null) return null;
    $v = trim((string)$v);
    return $v === '' ? null : mb_substr($v, 0, $max);
}
function in_fence($lat, $lon): bool {
    if (GEO_FENCE === null || !is_numeric($lat) || !is_numeric($lon)) return false;
    [$flat, $flon, $fr] = GEO_FENCE;
    $R = 6371000.0;
    $dlat = deg2rad((float)$lat - (float)$flat);
    $dlon = deg2rad((float)$lon - (float)$flon);
    $a = sin($dlat / 2) ** 2
       + cos(deg2rad((float)$flat)) * cos(deg2rad((float)$lat)) * sin($dlon / 2) ** 2;
    return ($R * 2 * atan2(sqrt($a), sqrt(1 - $a))) < (float)$fr;
}
function strip_if_fenced(array $p): array {
    if (isset($p['lat'], $p['lon']) && in_fence($p['lat'], $p['lon'])) {
        unset($p['lat'], $p['lon']);
    }
    return $p;
}
/**
 * Distance in metres between two lat/lon pairs (haversine).
 */
function metres_between(float $la1, float $lo1, float $la2, float $lo2): float {
    $R = 6371000.0;
    $dLat = deg2rad($la2 - $la1);
    $dLon = deg2rad($lo2 - $lo1);
    $a = sin($dLat / 2) ** 2
       + cos(deg2rad($la1)) * cos(deg2rad($la2)) * sin($dLon / 2) ** 2;
    return $R * 2 * atan2(sqrt($a), sqrt(1 - $a));
}

function median_of(array $a) {
    if (!$a) return null;
    sort($a);
    $n = count($a); $m = intdiv($n, 2);
    return $n % 2 ? $a[$m] : ($a[$m - 1] + $a[$m]) / 2;
}

/**
 * Locality name for a coordinate, reusing the same Nominatim + grid-cache
 * approach as van-live.php. Deliberately LOCALITY level (zoom 12) — never a
 * road — so a named spot cannot pinpoint a parking place.
 */
function locality_for(float $lat, float $lon) {
    // ⚠️ NOMINATIM ALLOWS 1 REQUEST PER SECOND, and this is called once per
    // uncached cell. Before the seafront drive that was a handful of calls; the
    // dataset now has 72 spots, so an un-warmed cache would fire dozens of
    // requests back to back and risk the OSM servers blocking our IP - which
    // would silently strip every name off the public page.
    // Two guards: at most GEO_LOOKUP_BUDGET new lookups per request, spaced a
    // second apart. Names therefore fill in over successive refreshes rather
    // than all at once - run refresh_van_summary.py a few times after a big
    // drive. Cached lookups are free and unaffected.
    static $spent = 0;
    static $last  = 0.0;
    $cacheFile = __DIR__ . '/signal-geo.json';
    // ⚠️ VERSIONED KEY. signal-geo.json on the live server is full of names
    // resolved under the OLD preference order (suburb-first), which is what
    // returned "Bournemouth" for the whole seafront. Without bumping this
    // prefix every one of those would keep being served from cache and the fix
    // would appear to do nothing. Bump it whenever the naming rules change.
    $key = 'v2:' . round($lat, 2) . ',' . round($lon, 2);
    $cache = [];
    if (is_file($cacheFile)) {
        $d = json_decode((string)file_get_contents($cacheFile), true);
        if (is_array($d)) $cache = $d;
    }
    if (array_key_exists($key, $cache)) {
        return $cache[$key] !== '' ? $cache[$key] : null;
    }
    $name = null;
    if ($spent >= GEO_LOOKUP_BUDGET) {
        return null;                    // budget spent - try again next refresh
    }
    if (function_exists('curl_init')) {
        $spent++;
        $wait = 1.05 - (microtime(true) - $last);   // honour 1 req/sec
        if ($last > 0.0 && $wait > 0) usleep((int)($wait * 1e6));
        $last = microtime(true);
        $url = 'https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=14'
             . '&lat=' . rawurlencode((string)$lat) . '&lon=' . rawurlencode((string)$lon);
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 6,
            CURLOPT_USERAGENT      => '365Techies-SignalMap/1.0 (info@365techies.co.uk)',
        ]);
        $raw = curl_exec($ch);
        curl_close($ch);
        $d = json_decode((string)$raw, true);
        $a = (is_array($d) && isset($d['address']) && is_array($d['address'])) ? $d['address'] : [];
        // ⚠️ ORDER IS THE WHOLE GAME. It used to start at 'suburb', so anywhere
        // Nominatim returned no suburb fell straight through to 'town'/'city'
        // and came back "Bournemouth". After the seafront drive that collapsed
        // 72 measured spots into 4 names, with 394 tests pooled under one
        // "Bournemouth" row - useless to a reader choosing where to park, and
        // short of the 25-30 nameable places the press plan needs.
        // neighbourhood/quarter come FIRST so Boscombe, Southbourne, Westbourne,
        // Canford Cliffs and Sandbanks surface as themselves. Still zoom 14, so
        // still never a road: a named spot cannot pinpoint a parking place.
        foreach (['neighbourhood', 'quarter', 'suburb', 'village', 'hamlet',
                  'town', 'city_district', 'city', 'municipality'] as $k) {
            if (!empty($a[$k])) { $name = mb_substr((string)$a[$k], 0, 40); break; }
        }
    }
    $cache[$key] = $name ?? '';
    if (count($cache) > 500) $cache = array_slice($cache, -500, null, true);
    $tmp = $cacheFile . '.tmp';
    if (file_put_contents($tmp, json_encode($cache), LOCK_EX) !== false) @rename($tmp, $cacheFile);
    return $name;
}

/**
 * Place-named digest of the best-measured spots, for SERVER-RENDERING into the
 * public page. Everything here is deliberately conservative:
 *  - only points whose speed test actually ran at that place are counted
 *  - a spot needs more than one test to appear at all
 *  - spots inside NO_NAME_M of the private zone are ranked but NOT named
 *  - names are locality level, never road level
 * Also reports the honest shape of the dataset (area, days, counts) so the page
 * can state its own limitations instead of implying coverage it doesn't have.
 */
function build_summary(array $points): array {
    $tested = array_values(array_filter($points, fn($p) =>
        isset($p['lat'], $p['lon'], $p['dl'], $p['dl_age'])
        && $p['dl'] !== null && $p['dl_age'] !== null && $p['dl_age'] < SUMMARY_FRESH_S));

    $cells = [];
    $days  = [];
    $minLa = $minLo = INF; $maxLa = $maxLo = -INF;
    foreach ($tested as $p) {
        $k = round($p['lat'] * SUMMARY_CELL_LAT) . ',' . round($p['lon'] * SUMMARY_CELL_LON);
        if (!isset($cells[$k])) $cells[$k] = ['lat'=>[], 'lon'=>[], 'dl'=>[], 'ms'=>[], 'sinr'=>[], 'net'=>[], 'days'=>[]];
        $c =& $cells[$k];
        $c['lat'][] = $p['lat']; $c['lon'][] = $p['lon']; $c['dl'][] = (float)$p['dl'];
        if (isset($p['latency']) && $p['latency'] !== null) $c['ms'][]   = (float)$p['latency'];
        if (isset($p['sinr'])    && $p['sinr']    !== null) $c['sinr'][] = (float)$p['sinr'];
        if (!empty($p['net'])) $c['net'][(string)$p['net']] = (($c['net'][(string)$p['net']] ?? 0) + 1);
        $d = gmdate('Y-m-d', (int)$p['t']);
        $c['days'][$d] = 1; $days[$d] = 1;
        unset($c);
        $minLa = min($minLa, $p['lat']); $maxLa = max($maxLa, $p['lat']);
        $minLo = min($minLo, $p['lon']); $maxLo = max($maxLo, $p['lon']);
    }

    // Name each qualifying cell, then MERGE cells that resolve to the same
    // locality — three separate rows all reading "Bournemouth" is noise, and
    // pooling their raw readings gives a truer median for the place.
    $byName = [];
    $qualifying = 0;      // cells with enough tests to count as a "spot" at all
    foreach ($cells as $c) {
        $n = count($c['dl']);
        if ($n < SUMMARY_MIN_TESTS) continue;
        $qualifying++;
        $lat = median_of($c['lat']); $lon = median_of($c['lon']);
        if (GEO_FENCE && NO_NAME_M > 0
            && metres_between((float)GEO_FENCE[0], (float)GEO_FENCE[1], (float)$lat, (float)$lon) < NO_NAME_M) {
            continue;         // ranked in spots_total, but never named or listed
        }
        $name = locality_for((float)$lat, (float)$lon);
        if ($name === null || $name === '') continue;
        if (!isset($byName[$name])) $byName[$name] = ['dl'=>[], 'ms'=>[], 'sinr'=>[], 'net'=>[], 'days'=>[], 'cells'=>0];
        $b =& $byName[$name];
        $b['dl']   = array_merge($b['dl'], $c['dl']);
        $b['ms']   = array_merge($b['ms'], $c['ms']);
        $b['sinr'] = array_merge($b['sinr'], $c['sinr']);
        foreach ($c['net']  as $k => $v) $b['net'][$k]  = ($b['net'][$k] ?? 0) + $v;
        foreach ($c['days'] as $k => $v) $b['days'][$k] = 1;
        $b['cells']++;
        unset($b);
    }

    $named_spots = [];
    foreach ($byName as $name => $b) {
        arsort($b['net']);
        $named_spots[] = [
            'name'  => $name,
            'dl'    => round((float)median_of($b['dl']), 1),
            'ms'    => $b['ms']   ? (int)round((float)median_of($b['ms']))   : null,
            'sinr'  => $b['sinr'] ? (int)round((float)median_of($b['sinr'])) : null,
            'net'   => $b['net'] ? (string)array_key_first($b['net']) : null,
            'tests' => count($b['dl']),
            'days'  => count($b['days']),
        ];
    }
    usort($named_spots, fn($a, $b) => $b['dl'] <=> $a['dl']);
    $spots = $named_spots;

    $kmLat = ($maxLa > -INF) ? ($maxLa - $minLa) * 111.32 : 0;
    $kmLon = ($maxLa > -INF) ? ($maxLo - $minLo) * 111.32 * cos(deg2rad($minLa)) : 0;
    ksort($days);
    $dayKeys = array_keys($days);

    return [
        'ok'          => true,
        'generated'   => gmdate('c'),
        'points'      => count($points),
        'tested'      => count($tested),
        'spots_total' => $qualifying,          // measured spots, named or not
        'spots_named' => count($spots),        // the rest sit inside the no-name radius
        'days'        => count($dayKeys),
        'first_day'   => $dayKeys ? $dayKeys[0] : null,
        'last_day'    => $dayKeys ? end($dayKeys) : null,
        'area_km'     => $kmLat ? [round($kmLat, 1), round($kmLon, 1)] : null,
        'spots'       => array_slice($named_spots, 0, SUMMARY_MAX),
    ];
}

function load_points(): array {
    if (!is_file(DATA_FILE)) return [];
    $raw = file_get_contents(DATA_FILE);
    $d = json_decode($raw ?: '[]', true);
    return is_array($d) ? $d : [];
}
function append_point(array $p): void {
    $dir = dirname(DATA_FILE);
    if (!is_dir($dir)) mkdir($dir, 0775, true);
    $fh = fopen(DATA_FILE, 'c+');
    if (!$fh) return;
    try {
        flock($fh, LOCK_EX);
        $raw = stream_get_contents($fh);
        $points = json_decode($raw ?: '[]', true);
        if (!is_array($points)) $points = [];
        $points[] = $p;
        if (count($points) > MAX_POINTS) {
            $points = array_slice($points, -MAX_POINTS);
        }
        ftruncate($fh, 0);
        rewind($fh);
        fwrite($fh, json_encode($points));
        fflush($fh);
    } finally {
        flock($fh, LOCK_UN);
        fclose($fh);
    }
}
