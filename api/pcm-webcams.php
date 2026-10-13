<?php
/*
 * 365 PC Manager build 40 (36.3) - World webcams, in Music & videos (owner, 13 Oct 2026: "do audiobooks, webcams and game
 * entries"). The app's list of webcams comes through HERE so that the Windy Webcams API key never leaves this server:
 * Windy's terms (read 13 Oct 2026) forbid publishing the key or giving it to anyone, and a key inside the app would be both.
 * This relays the LIST only - names, places and the picture addresses Windy hands out - and never a picture: each PC fetches
 * the pictures from Windy itself. Answers are kept 5 minutes (Windy's free picture addresses work for about 10), and there is
 * an hourly ceiling on calls to Windy (their terms rule out "intensive usage" and continuous scanning).
 *
 * GET ?scope=GB|world|dorset&kind=all|beach|coast|city|mountain|country&off=0..950   (50 at a time, most popular first)
 * GET ?ids=123,456                                                                   (these cameras, fresh addresses)
 * -> {"ok":true,"total":N,"cams":[{"id","t","city","region","cc","country","img","day","thumb","upd","page"}]}
 *    {"ok":false,"why":"setup"}  no key yet (api/pcm-windy-key.php, server-only) or Windy refused it
 *    {"ok":false,"why":"busy"}   the hourly ceiling, with nothing kept to answer from
 *    {"ok":false,"why":"error"}  Windy didn't answer
 * Nothing about the caller is stored or logged. Deploys WITH PC Manager build 40.
 */
error_reporting(0);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex');

function wc_out($a) { echo json_encode($a, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE); exit; }

// ---- what was asked ----
$ids = array();
if (isset($_GET['ids'])) {
    foreach (explode(',', (string)$_GET['ids']) as $i) { $i = trim($i); if (preg_match('/^\d{1,14}$/', $i) && !in_array($i, $ids, true) && count($ids) < 50) $ids[] = $i; }
}
$scope = isset($_GET['scope']) ? (string)$_GET['scope'] : 'world';
if (!($scope === 'world' || $scope === 'dorset' || preg_match('/^[A-Za-z]{2}$/', $scope))) $scope = 'world';
if (strlen($scope) === 2) $scope = strtoupper($scope);
$kinds = array(   // ours -> Windy's categories
    'all' => '', 'beach' => 'beach', 'coast' => 'coast,harbor', 'city' => 'city,square',
    'mountain' => 'mountain,lake', 'country' => 'landscape,forest,park,village',
);
$kind = isset($_GET['kind']) && isset($kinds[(string)$_GET['kind']]) ? (string)$_GET['kind'] : 'all';
$off = isset($_GET['off']) ? max(0, min(950, (int)$_GET['off'])) : 0; $off -= $off % 50;

$q = array('lang' => 'en', 'include' => 'images,location,urls');
if ($ids) { $q['webcamIds'] = implode(',', $ids); $q['limit'] = 50; }
else {
    $q['limit'] = 50; $q['offset'] = $off; $q['sortKey'] = 'popularity'; $q['sortDirection'] = 'desc';
    if ($scope === 'dorset') $q['nearby'] = '50.72,-1.88,40';          // Bournemouth, Poole, Christchurch, Purbeck, the New Forest
    elseif ($scope !== 'world') $q['countries'] = $scope;
    if ($kinds[$kind] !== '') { $q['categories'] = $kinds[$kind]; if (strpos($kinds[$kind], ',') !== false) $q['categoryOperation'] = 'or'; }
}
$url = 'https://api.windy.com/webcams/api/v3/webcams?' . http_build_query($q);
$ck = md5($url);

// ---- the key (server-only file; extracted by pattern, never included) ----
$key = '';
$kf = __DIR__ . '/pcm-windy-key.php';
if (is_file($kf) && preg_match('/\$WINDY_KEY\s*=\s*[\'"]([A-Za-z0-9_\-]{10,120})[\'"]/', (string)@file_get_contents($kf), $m)) $key = $m[1];
if ($key === '' || stripos($key, 'PUT-THE') !== false) wc_out(array('ok' => false, 'why' => 'setup'));

// ---- the 5-minute store and the hourly ceiling (one small file, locked) ----
$cf = __DIR__ . '/pcm-webcams-cache.json';
$lock = @fopen($cf . '.lock', 'c');
if ($lock) @flock($lock, LOCK_EX);
$store = is_file($cf) ? json_decode((string)@file_get_contents($cf), true) : null;
if (!is_array($store)) $store = array('hour' => '', 'calls' => 0, 'ans' => array());
$now = time();
foreach ($store['ans'] as $k => $a) if (!is_array($a) || $now - (int)$a['t'] > 300) unset($store['ans'][$k]);
if (isset($store['ans'][$ck])) { if ($lock) { flock($lock, LOCK_UN); fclose($lock); } echo $store['ans'][$ck]['body']; exit; }
$hour = gmdate('YmdH', $now);
if ($store['hour'] !== $hour) { $store['hour'] = $hour; $store['calls'] = 0; }
if ($store['calls'] >= 400) { if ($lock) { flock($lock, LOCK_UN); fclose($lock); } wc_out(array('ok' => false, 'why' => 'busy')); }
$store['calls']++;
@file_put_contents($cf, json_encode($store));
if ($lock) { flock($lock, LOCK_UN); }

// ---- ask Windy ----
$ch = curl_init($url);
curl_setopt_array($ch, array(CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 12, CURLOPT_CONNECTTIMEOUT => 6,
    CURLOPT_HTTPHEADER => array('x-windy-api-key: ' . $key, 'Accept: application/json'), CURLOPT_USERAGENT => '365Techies-PCManager/1.0 (+https://365techies.co.uk/)'));
$raw = curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
if ($lock) fclose($lock);
if ($code === 401 || $code === 403) wc_out(array('ok' => false, 'why' => 'setup'));   // (a new key can take a few minutes to start working)
$w = $code === 200 ? json_decode((string)$raw, true) : null;
if (!is_array($w)) wc_out(array('ok' => false, 'why' => 'error'));

// ---- just what the app shows ----
function wc_s($v, $max) { $v = is_scalar($v) ? trim(preg_replace('/\s+/u', ' ', (string)$v)) : ''; return function_exists('mb_substr') ? mb_substr($v, 0, $max, 'UTF-8') : (preg_match('/^.{0,' . (int)$max . '}/us', $v, $mm) ? $mm[0] : ''); }
function wc_url($v) { $v = is_string($v) ? trim($v) : ''; $h = strtolower((string)parse_url($v, PHP_URL_HOST)); return (strpos($v, 'https://') === 0 && ($h === 'windy.com' || substr($h, -10) === '.windy.com')) ? $v : ''; }
function wc_pic($imgs, $part, $size) { return isset($imgs[$part][$size]) ? wc_url($imgs[$part][$size]) : ''; }
$cams = array();
foreach ((isset($w['webcams']) && is_array($w['webcams']) ? $w['webcams'] : array()) as $c) {
    if (!is_array($c) || (isset($c['status']) && $c['status'] !== 'active')) continue;
    $id = isset($c['webcamId']) ? (string)$c['webcamId'] : ''; if (!preg_match('/^\d{1,14}$/', $id)) continue;
    $im = isset($c['images']) && is_array($c['images']) ? $c['images'] : array();
    $lo = isset($c['location']) && is_array($c['location']) ? $c['location'] : array();
    $img = wc_pic($im, 'current', 'preview'); $thumb = wc_pic($im, 'current', 'thumbnail');
    if ($img === '' && $thumb === '') continue;
    $page = isset($c['urls']['detail']) ? wc_url($c['urls']['detail']) : '';
    $cams[] = array(
        'id' => $id, 't' => wc_s(isset($c['title']) ? $c['title'] : '', 120),
        'city' => wc_s(isset($lo['city']) ? $lo['city'] : '', 60), 'region' => wc_s(isset($lo['region']) ? $lo['region'] : '', 60),
        'cc' => strtoupper(wc_s(isset($lo['country_code']) ? $lo['country_code'] : '', 2)), 'country' => wc_s(isset($lo['country']) ? $lo['country'] : '', 60),
        'img' => $img, 'day' => wc_pic($im, 'daylight', 'preview'), 'thumb' => $thumb,
        'upd' => wc_s(isset($c['lastUpdatedOn']) ? $c['lastUpdatedOn'] : '', 40),
        'page' => $page !== '' ? $page : 'https://www.windy.com/webcams/' . $id,
    );
}
$body = json_encode(array('ok' => true, 'total' => isset($w['total']) ? (int)$w['total'] : count($cams), 'cams' => $cams), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

// keep it for 5 minutes (re-read the file: another visitor may have added theirs meanwhile)
$lock = @fopen($cf . '.lock', 'c');
if ($lock) @flock($lock, LOCK_EX);
$store = is_file($cf) ? json_decode((string)@file_get_contents($cf), true) : null;
if (!is_array($store)) $store = array('hour' => $hour, 'calls' => 1, 'ans' => array());
foreach ($store['ans'] as $k => $a) if (!is_array($a) || $now - (int)$a['t'] > 300) unset($store['ans'][$k]);
if (count($store['ans']) > 200) $store['ans'] = array_slice($store['ans'], -150, null, true);
$store['ans'][$ck] = array('t' => $now, 'body' => $body);
@file_put_contents($cf, json_encode($store));
if ($lock) { flock($lock, LOCK_UN); fclose($lock); }
echo $body;
