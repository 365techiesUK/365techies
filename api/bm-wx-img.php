<?php
/**
 * Serves the radar/satellite frames written by bm-wx-lib.php from api/bm-wx-store/.
 * The store directory itself is denied over HTTP; this is the only way in, and it only
 * accepts the exact file-name shapes the library writes (no paths, no traversal).
 * Every name carries its own UTC time, so the bytes behind a name never change: cache hard.
 */
error_reporting(0);
$f = isset($_GET['f']) ? (string)$_GET['f'] : '';
if (!preg_match('~^(radar-\d{12}\.png|sat-(geo|vis)-\d{12}\.jpg|nasa-\d{8}\.jpg)$~', $f)) {
    http_response_code(404);
    exit;
}
$path = __DIR__ . '/bm-wx-store/' . $f;
if (!is_file($path)) {
    http_response_code(404);
    header('Cache-Control: no-store');
    exit;
}
header('Content-Type: ' . (substr($f, -4) === '.png' ? 'image/png' : 'image/jpeg'));
header('Content-Length: ' . filesize($path));
header('Cache-Control: public, max-age=604800, immutable');
header('X-Robots-Tag: noindex');
readfile($path);
