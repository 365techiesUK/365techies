<?php
/*
 * Live-visitors statistics - "where the views come from" for the staff portal's Live view. 29 Sep 2026.
 * POST {stoken, machine} (a valid 12h portal staff session, as visitors.php) -> for every site and for all of them,
 * today / the last 7 days / the last 30 days: visitors (each once a day), local / UK / abroad, warm, the top towns,
 * pages, systems, phone/tablet/PC, browsers and sources - from api/visitors-stats.json, which visitors.php and
 * visitors-cron.php keep up (see visitors-tally-lib.php). Read-only. NO closing tag in this file.
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

$store = @json_decode((string)@file_get_contents(__DIR__ . '/visitors-stats.json'), true);
if (!is_array($store)) $store = array();
echo json_encode(vis_stats($store, time()));
