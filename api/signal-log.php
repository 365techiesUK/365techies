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
const COORD_DP    = 5;              // ~1.1 m; rounding limits precision on disk
// Token lives in a gitignored include, like api/tm-key.php on the live site.
$__t = @include __DIR__ . '/signal-token.php';
define('SHARED_TOKEN', is_string($__t) ? $__t : '');

header('Content-Type: application/json; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// ── GET: serve points for the map (public read of the firm's own data) ───────
if ($method === 'GET') {
    $since = isset($_GET['since']) ? (float)$_GET['since'] : 0.0;
    $points = load_points();
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
        'dl'   => num($in['dl'] ?? null),
    ];
    // Location is optional — until the Cerbo GPS dongle is fitted it may be null.
    if (isset($in['lat'], $in['lon'])) {
        $lat = (float)$in['lat'];
        $lon = (float)$in['lon'];
        if ($lat >= -90 && $lat <= 90 && $lon >= -180 && $lon <= 180
            && !($lat == 0.0 && $lon == 0.0)) {
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
