<?php
/**
 * Public JSON for /bournemouth/fuel-prices/. No session, no secrets.
 *   GET            every station in the area with its prices + where they came from and when (bm-fuel-lib.php).
 *   POST {"pc":""} a postcode or district -> map position (postcodes.io). POST so the postcode never sits in an
 *                  access log; nothing here stores it.
 * Prices are refreshed by cron (tm-cron.php -> bm_fuel_refresh). If cron has plainly stopped, the response is sent
 * first and the refresh runs after it, so no visitor waits on eleven upstream feeds.
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
    echo json_encode(bm_fuel_postcode($pc));
    exit;
}

$c = bm_fuel_public();
if (!$c['ok']) {                       // first visit after a deploy: nothing stored yet, so fetch now
    bm_fuel_refresh(true);
    $c = bm_fuel_public();
}
header('Cache-Control: public, max-age=300');
echo json_encode($c);

$beat = bmfuel_json_load('beat.json');
if (empty($beat['t']) || time() - (int)$beat['t'] > 75 * 60) {
    if (function_exists('fastcgi_finish_request')) { fastcgi_finish_request(); bm_fuel_refresh(); }
}
