<?php
/**
 * Public JSON for /bournemouth/weather/. Read-only, no inputs, no session, no secrets.
 * Everything heavy happens in cron (tm-cron.php -> bm_wx_refresh / bm_weather_refresh / bm_sea_refresh).
 * On a fresh deploy, or if cron has plainly stopped, one visitor triggers a LIGHT refresh under the
 * shared lock (one radar frame, one satellite frame) so the page is never blank for long.
 */
error_reporting(0);
date_default_timezone_set('Europe/London');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=120');
header('X-Robots-Tag: noindex, nofollow');

require_once __DIR__ . '/bm-weather-lib.php';
require_once __DIR__ . '/bm-sea-lib.php';
require_once __DIR__ . '/bm-wx-lib.php';

$beat = bmwx_json_load('beat.json');
if (empty($beat['t']) || time() - (int)$beat['t'] > 45 * 60) {
    bm_wx_refresh(true);
}
$c = bmwx_load();
if (empty($c['model']) || !isset($c['model']['v']) || $c['model']['v'] < BMWX_PARSE_V
    || (time() - (isset($c['fetched_at']) ? (int)$c['fetched_at'] : 0)) > 2 * 3600) {
    bm_weather_refresh();
}
if (!file_exists(bmsea_file())) {
    bm_sea_refresh();
}

$sea = bm_sea_public();
$seaOut = array();
foreach (array('sea', 'tide', 'bathing', 'overflow') as $k) {
    if (!isset($sea[$k])) continue;
    $b = $sea[$k];
    if ($k === 'bathing' && !empty($b['sites'])) {
        $classes = array(); $warn = 0;
        foreach ($b['sites'] as $s) {
            $classes[] = $s['class'];
            if (!empty($s['heavyRain']) || (isset($s['prf']['level']) && $s['prf']['level'] !== 'normal')) $warn++;
        }
        $b = array('ok' => $b['ok'], 'stale' => !empty($b['stale']), 'sites' => count($b['sites']), 'classes' => array_count_values($classes), 'warnings' => $warn);
    }
    if ($k === 'overflow' && !empty($b['ok'])) {
        $b = array('ok' => true, 'stale' => !empty($b['stale']), 'discharging' => $b['discharging'], 'offline' => $b['offline'], 'total' => $b['total']);
    }
    $seaOut[$k] = $b;
}

echo json_encode(array(
    'at' => date('c'),
    'forecast' => bm_weather_public_full(),
    'obs' => bm_obs_public(),
    'warnings' => bm_warn_public(),
    'air' => bm_air_public(),
    'tide' => bm_tide_public(isset($sea['tide']) ? $sea['tide'] : null),
    'sea' => $seaOut,
    'radar' => bm_radar_public(),
    'sat' => bm_sat_public(),
));
