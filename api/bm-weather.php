<?php
/**
 * Public endpoint for the Bournemouth365 forecast panel on /bournemouth/.
 * Read-only, no inputs, no session, no secrets. The upstream fetch normally
 * happens in cron (tm-cron.php -> bm_weather_refresh); this is a cache read.
 *
 * If the cache has never been written (fresh deploy) or the cron has plainly
 * stopped (nothing fetched for two hours), try one inline refresh, guarded by
 * the same lock and minimum gap, so a stampede costs MET Norway one request.
 */
error_reporting(0);
date_default_timezone_set('Europe/London');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=300');
header('X-Robots-Tag: noindex, nofollow');

require_once __DIR__ . '/bm-weather-lib.php';

$c = bmwx_load();
if (empty($c['model']) || (time() - (isset($c['fetched_at']) ? (int)$c['fetched_at'] : 0)) > 2 * 3600) {
    bm_weather_refresh();   // no-op if another request holds the lock or asked within the gap
}

echo json_encode(bm_weather_public());
