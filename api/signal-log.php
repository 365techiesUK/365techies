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
$__f = @include __DIR__ . '/geo-fence.php';
define('GEO_FENCE', (is_array($__f) && count($__f) === 3
    && is_numeric($__f[0]) && is_numeric($__f[1]) && is_numeric($__f[2])) ? $__f : null);

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
