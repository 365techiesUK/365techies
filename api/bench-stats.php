<?php
/**
 * PC benchmark community chart - public aggregate. GET ->
 *   {ok, count, floor, enough, computed, hist[20], cdf[101], median}   (hist/cdf/median only once enough)
 * Reads the JSON-lines store under a shared lock, computes through bench-lib.php (one result per
 * device, current scale, last 12 months, nothing below the floor), caches for ten minutes.
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=300');
header('X-Robots-Tag: noindex, nofollow');
require_once __DIR__ . '/bench-lib.php';

$STORE = __DIR__ . '/bench-results.json';
$CACHE = __DIR__ . '/bench-stats-cache.json';

$c = @json_decode((string)@file_get_contents($CACHE), true);
if (is_array($c) && intval(isset($c['computed']) ? $c['computed'] : 0) > time() - 600) { echo json_encode(array('ok' => true) + $c); exit; }

$rows = array();
$rf = @fopen($STORE, 'r');
if ($rf) {
    @flock($rf, LOCK_SH);
    while (($l = fgets($rf)) !== false) { $l = trim($l); if ($l === '') continue; $r = json_decode($l, true); if (is_array($r)) $rows[] = $r; }
    @flock($rf, LOCK_UN); @fclose($rf);
}
$st = bench_stats($rows);
@file_put_contents($CACHE, json_encode($st), LOCK_EX);
echo json_encode(array('ok' => true) + $st);
