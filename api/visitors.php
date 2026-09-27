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
 * ONE call for all three sites (the Worker's /live?site=all answers from a single KV list) and a
 * 90-second shared cache: at most 960 KV lists a day even if a staff screen stays open round the
 * clock, inside the free tier's 1,000. NO closing tag in this file.
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
// a good answer is kept 90 s; a failed one only 15 s, so a fix shows up almost at once
if (is_array($c) && isset($c['t']) && (time() - (int)$c['t']) < (empty($c['data']['why']) ? 90 : 15)) {
    echo json_encode($c['data']); exit;
}

$out = array('ok' => true, 'at' => time(), 'sites' => array());
$ch = curl_init($u . '/live?site=all&auth=' . rawurlencode($k));
curl_setopt_array($ch, array(CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 6,
    CURLOPT_CONNECTTIMEOUT => 4, CURLOPT_PROTOCOLS => CURLPROTO_HTTPS));
$body = curl_exec($ch);
$code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
$cerr = (string)curl_error($ch);
curl_close($ch);
$j = json_decode((string)$body, true);
// when the Worker won't answer, say why in plain words (staff only; never the token or the raw reply)
$werr = (is_array($j) && isset($j['error'])) ? (string)$j['error'] : '';
if ($code === 0) $why = 'The web server could not reach Cloudflare' . ($cerr !== '' ? ' (' . substr($cerr, 0, 120) . ')' : '') . '.';
elseif ($code === 403 && $werr === 'auth') $why = 'Cloudflare turned the password away: the VIS_TOKEN secret on the visitors-live Worker is missing or does not match api/visitors-key.php.';
elseif ($code === 400 && $werr === 'site') $why = 'The visitors-live Worker is running older code. Paste visitors-live-worker.js into it again and deploy.';
elseif ($code === 500 && $werr === 'no-kv') $why = 'The visitors-live Worker has no store connected (a KV binding named VISITS).';
elseif ($code === 404) $why = 'Nothing answered at the Worker address in api/visitors-key.php.';
elseif ($code !== 200 || !is_array($j) || empty($j['ok']) || !isset($j['sites'])) $why = 'Cloudflare answered HTTP ' . $code . ($werr !== '' ? ' (' . preg_replace('/[^a-z0-9-]/', '', $werr) . ')' : '') . '.';
else $why = '';
if ($why !== '') $out['why'] = $why;
foreach (array('t365' => '365techies.co.uk', 'ccb' => 'colinclarkbuilders.co.uk', 'beckox' => 'beckox.co.uk') as $key => $label) {
    $sj = ($code === 200 && is_array($j) && !empty($j['ok']) && isset($j['sites'][$key])) ? $j['sites'][$key] : null;
    if ($sj) {
        $out['sites'][$key] = array('label' => $label, 'visitors' => (int)$sj['visitors'],
            'pages' => isset($sj['pages']) ? $sj['pages'] : array(),
            'places' => isset($sj['places']) ? $sj['places'] : array());
    } else {
        $out['sites'][$key] = array('label' => $label, 'visitors' => -1, 'error' => 'unreachable');
    }
}

$tmp = $CACHE . '.tmp';
if (@file_put_contents($tmp, json_encode(array('t' => time(), 'data' => $out))) !== false) @rename($tmp, $CACHE);
echo json_encode($out);
