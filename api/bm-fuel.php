<?php
/**
 * Public JSON for the fuel price pages (/fuel-prices/ and /bournemouth/fuel-prices/). No session, no secrets.
 *   GET ?near=1&lat=50.7&lon=-1.9&r=10&f=E10   the cheapest within r miles (lat/lon arrive rounded to 0.1 degree)
 *   GET ?top=1&f=B7                           the cheapest in the whole UK
 *   GET ?stats=1                              the UK, the four nations and every postcode area, all fuels
 *   GET ?trend=1                              going up or down: the government's weekly UK averages since 2003 and our
 *                                             own daily medians (from 4 Oct 2026)
 *   GET                                       when the prices were fetched, and from where
 *   POST {"pc": "BH8 8DQ"}                    a postcode or district -> map position (postcodes.io). POST so the
 *                                             postcode never sits in an access log; nothing here stores it.
 * Prices are refreshed by cron (tm-cron.php -> bm_fuel_refresh). If cron has plainly stopped, the answer is sent first
 * and the refresh runs after it, so no visitor waits on the government's feed.
 */
error_reporting(0);
date_default_timezone_set('Europe/London');
header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex, nofollow');

require_once __DIR__ . '/bm-fuel-lib.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Cache-Control: no-store');
    $in = json_decode((string)file_get_contents('php://input'), true);
    $pc = (is_array($in) && isset($in['pc'])) ? substr((string)$in['pc'], 0, 12) : '';
    echo bmfuel_json(bm_fuel_postcode($pc));
    exit;
}

$f = isset($_GET['f']) ? (string)$_GET['f'] : 'E10';
if (isset($_GET['near'])) {
    $out = bm_fuel_near(isset($_GET['lat']) ? $_GET['lat'] : 0, isset($_GET['lon']) ? $_GET['lon'] : 0, isset($_GET['r']) ? $_GET['r'] : 5, $f);
} elseif (isset($_GET['top'])) {
    $out = bm_fuel_top($f);
} elseif (isset($_GET['stats'])) {
    $out = bm_fuel_stats();
} elseif (isset($_GET['trend'])) {
    $out = bm_fuel_trend();
} else {
    $out = bm_fuel_meta();
}
if (empty($out['ok']) && isset($out['error']) && $out['error'] === 'no data yet') {
    $out['error'] = 'warming up';                    // a new store layout fills at the next cron run
    header('Cache-Control: no-store');
} else {
    header('Cache-Control: public, max-age=300');
}
echo bmfuel_json($out);

$beat = bmfuel_json_load('beat.json');
if (empty($beat['t']) || time() - (int)$beat['t'] > 75 * 60) {
    if (function_exists('fastcgi_finish_request')) { fastcgi_finish_request(); bm_fuel_refresh(); }
}
