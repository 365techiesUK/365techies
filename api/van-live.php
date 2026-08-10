<?php
/**
 * van-live.php — receives + serves the 365 Crafter's LIVE status snapshot for
 * the public "van right now" panel. Companion to signal-log.php.
 *
 * PRIVACY: location is reduced to TOWN LEVEL before anything is publicly
 * readable. Home Assistant sends precise lat/lon over an authenticated HTTPS
 * push; this endpoint reverse-geocodes to a town/locality name and stores ONLY
 * that name. The precise coordinates are used transiently for the lookup and
 * are NEVER written to the public data file. (Deliberately coarser than the
 * signal map, which is historical drive points, not "where the van is now".)
 *
 *   POST (X-Token header) → replace the current snapshot
 *   GET                   → return the current snapshot (+ age) as JSON, no-cache
 */

declare(strict_types=1);

// ── config ───────────────────────────────────────────────────────────────────
const DATA_FILE  = __DIR__ . '/van-live-data.json';   // gitignored; current snapshot
const GEO_CACHE  = __DIR__ . '/van-live-geo.json';    // gitignored; grid->town cache
const STALE_S    = 300;                               // page treats older than this as "not live"
// Reuse the van's existing shared push token (already on the server for the
// signal map) so there is NO new owner step. A dedicated live-token.php wins if present.
$__t = @include __DIR__ . '/live-token.php';
if (!is_string($__t)) { $__t = @include __DIR__ . '/signal-token.php'; }
define('SHARED_TOKEN', is_string($__t) ? $__t : '');

header('Content-Type: application/json; charset=utf-8');
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// ── GET: serve the current snapshot (public read of the firm's own van) ───────
if ($method === 'GET') {
    header('Cache-Control: no-store, max-age=0');
    $snap = load_json(DATA_FILE);
    if (!$snap) { echo json_encode(['ok' => true, 'live' => false]); exit; }
    $age = max(0, time() - (int)($snap['t'] ?? 0));
    $snap['age_s'] = $age;
    $snap['live']  = $age < STALE_S;
    $snap['ok']    = true;
    echo json_encode($snap);
    exit;
}

// ── POST: replace the snapshot (van only, token-gated) ────────────────────────
if ($method === 'POST') {
    $token = $_SERVER['HTTP_X_TOKEN'] ?? '';
    if (SHARED_TOKEN === '' || !hash_equals(SHARED_TOKEN, (string)$token)) {
        http_response_code(401);
        echo json_encode(['ok' => false, 'error' => 'bad token']);
        exit;
    }
    $in = json_decode((string)file_get_contents('php://input'), true);
    if (!is_array($in)) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'bad json']);
        exit;
    }

    // Whitelist + coerce. Anything not listed is dropped.
    $snap = [
        't'          => time(),
        'soc'        => num($in['soc'] ?? null),
        'batt_w'     => num($in['batt_w'] ?? null),
        'solar_w'    => num($in['solar_w'] ?? null),
        'solar_kwh'  => num($in['solar_kwh'] ?? null),
        'ttg'        => str_clip($in['ttg'] ?? null, 24),
        'rsrp'       => num($in['rsrp'] ?? null),
        'sinr'       => num($in['sinr'] ?? null),
        'net'        => str_clip($in['net'] ?? null, 12),
        'band'       => str_clip($in['band'] ?? null, 20),
        'dl'         => num($in['dl'] ?? null),
        'latency'    => num($in['latency'] ?? null),
        'net_status' => str_clip($in['net_status'] ?? null, 16),
    ];

    // Location → TOWN ONLY. Precise coords never touch the stored file.
    $town = town_from_coords($in['lat'] ?? null, $in['lon'] ?? null);
    if ($town !== null && $town !== '') $snap['town'] = $town;

    save_json_atomic(DATA_FILE, $snap);
    echo json_encode(['ok' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['ok' => false, 'error' => 'method not allowed']);
exit;

// ── helpers ───────────────────────────────────────────────────────────────────
function num($v) {
    if ($v === null || $v === '' || !is_numeric($v)) return null;
    return 0 + $v;
}
function str_clip($v, int $max) {
    if ($v === null) return null;
    $v = trim((string)$v);
    return $v === '' ? null : mb_substr($v, 0, $max);
}
function load_json($f) {
    if (!is_file($f)) return null;
    $d = json_decode((string)file_get_contents($f), true);
    return is_array($d) ? $d : null;
}
function save_json_atomic($f, array $d): void {
    $tmp = $f . '.tmp';
    if (file_put_contents($tmp, json_encode($d), LOCK_EX) !== false) {
        @rename($tmp, $f);
    }
}

/**
 * Reverse-geocode to a town/locality, cached by a ~1 km grid so the geocoder is
 * only hit when the van reaches a NEW area (keeps within Nominatim's usage
 * policy). Returns null on any failure — the page then just omits location.
 * Precise coordinates never leave this function.
 */
function town_from_coords($lat, $lon) {
    if (!is_numeric($lat) || !is_numeric($lon)) return null;
    $lat = (float)$lat; $lon = (float)$lon;
    if (($lat == 0.0 && $lon == 0.0) || $lat < -90 || $lat > 90 || $lon < -180 || $lon > 180) return null;

    $key   = round($lat, 2) . ',' . round($lon, 2);   // ~1 km grid cell
    $cache = load_json(GEO_CACHE) ?: [];
    if (array_key_exists($key, $cache)) {
        return $cache[$key] !== '' ? $cache[$key] : null;   // '' = cached "no town found"
    }

    $town = nominatim_town($lat, $lon);
    $cache[$key] = $town ?? '';                            // cache negatives too
    if (count($cache) > 500) $cache = array_slice($cache, -500, null, true);
    save_json_atomic(GEO_CACHE, $cache);
    return $town;
}
function nominatim_town(float $lat, float $lon) {
    $url = 'https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=12'
         . '&lat=' . rawurlencode((string)$lat) . '&lon=' . rawurlencode((string)$lon);
    $raw = false;
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 5,
            CURLOPT_USERAGENT      => '365Techies-VanLive/1.0 (info@365techies.co.uk)',
        ]);
        $raw = curl_exec($ch);
        curl_close($ch);
    }
    if ($raw === false || $raw === '') return null;
    $d = json_decode((string)$raw, true);
    if (!is_array($d) || !isset($d['address']) || !is_array($d['address'])) return null;
    $a = $d['address'];
    foreach (['town', 'city', 'village', 'suburb', 'municipality', 'county', 'state_district'] as $k) {
        if (!empty($a[$k])) return mb_substr((string)$a[$k], 0, 40);
    }
    return null;
}
