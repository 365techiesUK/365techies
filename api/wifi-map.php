<?php
/*
 * Community "best places to work" speed-pin map for /wifi-signal-test/ Signal Hunter.
 *
 * GET  -> {ok:true, pins:[{lat,lng,down,up,ping,net,place,t}]}  (latest 500, newest first)
 * POST -> add one pin. JSON body: {lat,lng,down,up,ping,net,place,hp}
 *
 * PRIVACY / ABUSE MODEL (deliberate):
 *  - no accounts, no names, no free text AT ALL: `place` must be one of a preset list,
 *    so there is nothing to moderate and nothing personal to leak
 *  - coordinates are rounded server-side to 4 dp (~11 m) and the client warns people
 *    never to share their home; the client also rounds before sending
 *  - IP is used only for rate limiting (hashed into the minute bucket), never stored
 *  - hard caps on every numeric field; the store keeps the newest 800 pins only
 */
error_reporting(0);
date_default_timezone_set('Europe/London');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('Access-Control-Allow-Origin: https://365techies.co.uk');

$DATAF = __DIR__ . '/wifi-map-pins.json';
$RATEF = __DIR__ . '/wifi-map-rate.json';

$NETS   = array('4G','5G','WiFi','Other');
$PLACES = array('Cafe','Coworking','Library','Car park / layby','Campsite','Beach / outdoors','Van spot','Harbour / marina','Other');

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $pins = @json_decode((string)@file_get_contents($DATAF), true);
    if (!is_array($pins)) $pins = array();
    $pins = array_slice(array_reverse($pins), 0, 500);
    echo json_encode(array('ok' => true, 'pins' => $pins));
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(array('ok'=>false,'error'=>'method')); exit; }

/* soft same-site check, like the other relays */
$src = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : (isset($_SERVER['HTTP_REFERER']) ? $_SERVER['HTTP_REFERER'] : '');
if ($src !== '' && strpos($src, '365techies.co.uk') === false) { http_response_code(403); echo json_encode(array('ok'=>false,'error'=>'origin')); exit; }

/* rate limit: 6 shares/min site-wide + 2/min per IP-hash */
$min  = (int)floor(time() / 60);
$iph  = substr(sha1(@$_SERVER['REMOTE_ADDR'] . 'wfmap' . $min), 0, 12);
$rate = @json_decode((string)@file_get_contents($RATEF), true);
if (!is_array($rate) || !isset($rate['min']) || $rate['min'] !== $min) $rate = array('min'=>$min,'n'=>0,'ips'=>array());
if ($rate['n'] >= 6) { http_response_code(429); echo json_encode(array('ok'=>false,'error'=>'rate')); exit; }
if (isset($rate['ips'][$iph]) && $rate['ips'][$iph] >= 2) { http_response_code(429); echo json_encode(array('ok'=>false,'error'=>'rate')); exit; }
$rate['n']++;
$rate['ips'][$iph] = isset($rate['ips'][$iph]) ? $rate['ips'][$iph]+1 : 1;
@file_put_contents($RATEF, json_encode($rate), LOCK_EX);

$in = json_decode((string)file_get_contents('php://input'), true);
if (!is_array($in)) { echo json_encode(array('ok'=>false,'error'=>'bad-json')); exit; }
if (!empty($in['hp'])) { echo json_encode(array('ok'=>true)); exit; }   // honeypot: pretend success

$lat = isset($in['lat']) ? (float)$in['lat'] : 999;
$lng = isset($in['lng']) ? (float)$in['lng'] : 999;
$down= isset($in['down'])? (float)$in['down']: -1;
$up  = isset($in['up'])  ? (float)$in['up']  : -1;
$ping= isset($in['ping'])? (int)$in['ping']  : -1;
$net = isset($in['net'])  ? (string)$in['net']  : '';
$plc = isset($in['place'])? (string)$in['place']: '';

if ($lat < -90 || $lat > 90 || $lng < -180 || $lng > 180) { echo json_encode(array('ok'=>false,'error'=>'coords')); exit; }
if ($down < 0 || $down > 2000 || $up < 0 || $up > 2000)   { echo json_encode(array('ok'=>false,'error'=>'speed')); exit; }
if ($ping < 0 || $ping > 4000)                            { echo json_encode(array('ok'=>false,'error'=>'ping')); exit; }
if (!in_array($net, $NETS, true))                         { echo json_encode(array('ok'=>false,'error'=>'net')); exit; }
if (!in_array($plc, $PLACES, true))                       { echo json_encode(array('ok'=>false,'error'=>'place')); exit; }

$pin = array(
    'lat'  => round($lat, 4),
    'lng'  => round($lng, 4),
    'down' => round($down, 1),
    'up'   => round($up, 1),
    'ping' => $ping,
    'net'  => $net,
    'place'=> $plc,
    't'    => time(),
);

$pins = @json_decode((string)@file_get_contents($DATAF), true);
if (!is_array($pins)) $pins = array();
$pins[] = $pin;
if (count($pins) > 800) $pins = array_slice($pins, -800);
@file_put_contents($DATAF, json_encode($pins), LOCK_EX);

echo json_encode(array('ok'=>true));
