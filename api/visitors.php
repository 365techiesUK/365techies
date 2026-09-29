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
 * clock, inside the free tier's 1,000.
 *
 * 29 Sep 2026: every FRESH answer is also folded into the statistics store (visitors-tally-lib.php,
 * api/visitors-stats.json - "where the views come from" over a day / 7 / 30 days); the cron
 * (visitors-cron.php) does the same when nobody has the portal open. NO closing tag in this file.
 */
error_reporting(0);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');
require_once __DIR__ . '/visitors-tally-lib.php';   // top-level scope on purpose (functions only)

if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(array('ok' => false, 'error' => 'method')); exit; }

$in = json_decode((string)file_get_contents('php://input'), true);
if (!is_array($in)) $in = $_POST;
if (!vis_staff_ok($in, __DIR__)) { http_response_code(403); echo json_encode(array('ok' => false, 'error' => 'auth')); exit; }

list($u, $k) = vis_config(__DIR__);
if ($u === '' || $k === '') { echo json_encode(array('ok' => false, 'error' => 'not-configured')); exit; }

$CACHE = __DIR__ . '/visitors-cache.json';
$c = @json_decode((string)@file_get_contents($CACHE), true);
// a good answer is kept 90 s; a failed one only 15 s, so a fix shows up almost at once
if (is_array($c) && isset($c['t']) && (time() - (int)$c['t']) < (empty($c['data']['why']) ? 90 : 15)) {
    echo json_encode($c['data']); exit;
}

list($code, $j, $cerr) = vis_fetch_live($u, $k);
$out = vis_shape($code, $j, $cerr);
if (empty($out['why'])) @vis_tally($out, __DIR__ . '/visitors-stats.json');   // the statistics; never in the way of the answer

$tmp = $CACHE . '.tmp';
if (@file_put_contents($tmp, json_encode(array('t' => time(), 'data' => $out))) !== false) @rename($tmp, $CACHE);
echo json_encode($out);
