<?php
/*
 * Live-visitors read proxy - the staff portal's "Live on the sites" card posts
 * {stoken, machine} here; a valid 12h portal staff session (same rule as the
 * consoles) gets the combined live view for every site, fetched server-side
 * from the Cloudflare Worker so the read token never reaches a browser.
 *
 * Config (server-only, gitignored + denied): api/visitors-key.php
 *     <?php $VIS_URL='https://<worker-url>'; $VIS_TOKEN='<the VIS_TOKEN secret>';
 *
 * A 15-second shared cache file keeps several staff pollers from multiplying
 * KV reads on the Worker's free tier. NO closing tag in this file.
 */
error_reporting(0);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(array('ok' => false, 'error' => 'method')); exit; }

$in = json_decode((string)file_get_contents('php://input'), true);
if (!is_array($in)) $in = $_POST;

$tokS = preg_replace('/[^a-f0-9]/', '', (string)(isset($in['stoken']) ? $in['stoken'] : ''));
$macS = preg_replace('/[^a-f0-9]/', '', substr((string)(isset($in['machine']) ? $in['machine'] : ''), 0, 32));
$ok = false;
if ($tokS !== '') {
    $dbT = @json_decode((string)@file_get_contents(__DIR__ . '/pcm-data.json'), true);
    $sS = (is_array($dbT) && isset($dbT['staff'][$tokS])) ? $dbT['staff'][$tokS] : null;
    if ($sS && (time() - intval(isset($sS['ts']) ? $sS['ts'] : 0)) < 43200 && (time() - intval(isset($sS['iat']) ? $sS['iat'] : 0)) < 43200
        && (empty($sS['machine']) || $sS['machine'] === $macS)) $ok = true;
}
if (!$ok) { @session_start(); if (!empty($_SESSION['pcm_ok'])) $ok = true; }   // console session works too
if (!$ok) { http_response_code(403); echo json_encode(array('ok' => false, 'error' => 'auth')); exit; }

$cfgsrc = (string)@file_get_contents(__DIR__ . '/visitors-key.php');
$u = preg_match('/\$VIS_URL\s*=\s*[\'"]([^\'"]+)[\'"]/', $cfgsrc, $m1) ? rtrim($m1[1], '/') : '';
$k = preg_match('/\$VIS_TOKEN\s*=\s*[\'"]([^\'"]+)[\'"]/', $cfgsrc, $m2) ? $m2[1] : '';
if ($u === '' || $k === '') { echo json_encode(array('ok' => false, 'error' => 'not-configured')); exit; }

$CACHE = __DIR__ . '/visitors-cache.json';
$c = @json_decode((string)@file_get_contents($CACHE), true);
if (is_array($c) && isset($c['t']) && (time() - (int)$c['t']) < 15) {
    echo json_encode($c['data']); exit;
}

$out = array('ok' => true, 'at' => time(), 'sites' => array());
foreach (array('t365' => '365techies.co.uk', 'ccb' => 'colinclarkbuilders.co.uk', 'beckox' => 'beckox.co.uk') as $key => $label) {
    $ch = curl_init($u . '/live?site=' . $key . '&auth=' . rawurlencode($k));
    curl_setopt_array($ch, array(CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 6,
        CURLOPT_CONNECTTIMEOUT => 4, CURLOPT_PROTOCOLS => CURLPROTO_HTTPS));
    $body = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $j = json_decode((string)$body, true);
    if ($code === 200 && is_array($j) && !empty($j['ok'])) {
        $out['sites'][$key] = array('label' => $label, 'visitors' => (int)$j['visitors'],
            'pages' => isset($j['pages']) ? $j['pages'] : array(),
            'places' => isset($j['places']) ? $j['places'] : array());
    } else {
        $out['sites'][$key] = array('label' => $label, 'visitors' => -1, 'error' => 'unreachable');
    }
}

$tmp = $CACHE . '.tmp';
if (@file_put_contents($tmp, json_encode(array('t' => time(), 'data' => $out))) !== false) @rename($tmp, $CACHE);
echo json_encode($out);
