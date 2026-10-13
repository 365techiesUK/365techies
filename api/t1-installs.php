<?php
/*
 * Techies One Mail installs - the staff portal's figures. 10 Oct 2026.
 * POST {stoken, machine} (a valid 12h portal staff session, as pcm-installs.php) -> t1i_stats() over api/t1-installs.json
 * (see t1-installs-lib.php), plus the newest release offered to the app's updater. Read-only. Our own PCs are the
 * connections marked on the PC Manager installs card. NO closing tag in this file.
 */
error_reporting(0);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');
require_once __DIR__ . '/visitors-tally-lib.php';   // the staff check (vis_staff_ok); top-level scope on purpose
require_once __DIR__ . '/t1-installs-lib.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') { http_response_code(405); echo json_encode(array('ok' => false, 'error' => 'method')); exit; }
$in = json_decode((string)file_get_contents('php://input'), true);
if (!is_array($in)) $in = $_POST;
if (!vis_staff_ok($in, __DIR__)) { http_response_code(403); echo json_encode(array('ok' => false, 'error' => 'auth')); exit; }

$d = @json_decode((string)@file_get_contents(t1i_file()), true);
$out = t1i_stats(is_array($d) ? $d : array());
$latest = t1i_latest();
$out['latest'] = $latest ? array('ver' => $latest['ver'], 'size' => $latest['size']) : null;

// 10 Oct 2026: download clicks from the email fix pages' box (the live view's tally counts a click on the installer as the
// page /~dl/t1/, each visitor once a day), for the same 7 and 30 days - beside the installs they turn into
// (11 Oct 2026: and the page each click came from - vis_dl_tally, visitors-tally-lib.php)
$vs = @json_decode((string)@file_get_contents(__DIR__ . '/visitors-stats.json'), true);
$out['downloads'] = vis_dl_tally($vs, 't1');
// 14 Oct 2026: on a phone, tablet or Mac the download opens "Send it to your computer" - the links they sent themselves
$out['sends'] = vis_dl_tally($vs, 't1', 8, 'send');
echo json_encode($out);
