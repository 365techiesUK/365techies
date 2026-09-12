<?php
/**
 * Public, unauthenticated, aggregate-only: the fleet statistics line on /computer-spec-checker/.
 * GET -> {ok, enough, window_days, computed, stats:{...}, band}  (stats/band absent below the floor)
 *
 * Reads pcm-data.json under a SHARED lock for as long as one JSON parse takes, computes through
 * pcm-fleet-lib.php (which enforces every privacy rule), and caches the result for a day in
 * pcm-fleet-cache.json - a file .htaccess denies to browsers, like every other pcm-*.json.
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=3600');
header('X-Robots-Tag: noindex, nofollow');
require_once __DIR__ . '/pcm-fleet-lib.php';

$DATA  = __DIR__ . '/pcm-data.json';
$CACHE = __DIR__ . '/pcm-fleet-cache.json';

$c = @json_decode((string)@file_get_contents($CACHE), true);
if (is_array($c) && intval(isset($c['computed']) ? $c['computed'] : 0) > time() - 86400) {
    echo json_encode(array('ok' => true) + $c); exit;
}

if (!file_exists($DATA)) { echo json_encode(array('ok' => false)); exit; }
$lk = @fopen($DATA . '.lock', 'c');
if ($lk) @flock($lk, LOCK_SH);
$db = json_decode((string)@file_get_contents($DATA), true);
if ($lk) { @flock($lk, LOCK_UN); @fclose($lk); }
if (!is_array($db)) { echo json_encode(array('ok' => false)); exit; }

$r = fleet_compute($db);
@file_put_contents($CACHE, json_encode($r), LOCK_EX);
echo json_encode(array('ok' => true) + $r);
