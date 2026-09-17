<?php
/**
 * /bournemouth/sea-today/ with the measured readings already in the HTML (17 Sep 2026) - see api/bm-sea-ssr.php.
 * The same pattern as bournemouth/weather/index.php: the built index.html stays the page (build output, search,
 * sitemap, guards); this serves it with the marked blocks filled at request time, and serves the file untouched if
 * anything goes wrong. Picked first by bournemouth/sea-today/.htaccess (DirectoryIndex index.php index.html).
 */
error_reporting(0);
date_default_timezone_set('Europe/London');

$st_html = @file_get_contents(__DIR__ . '/index.html');
if ($st_html === false) {
    http_response_code(503);
    header('Retry-After: 60');
    exit;
}
$st_out = $st_html;
$st_mode = 'static';
try {
    // top-level scope on purpose: the libraries keep state in globals and constants
    require_once __DIR__ . '/../../api/bm-sea-lib.php';
    require_once __DIR__ . '/../../api/bm-wx-ssr.php';
    require_once __DIR__ . '/../../api/bm-sea-ssr.php';
    $st_r = bmst_page($st_html);
    // a render that lost the end of the page is worse than no render
    if (is_array($st_r) && is_string($st_r[0]) && strpos($st_r[0], '</html>') !== false) {
        $st_out = $st_r[0];
        $st_mode = 'server ' . (int)$st_r[1];
    }
} catch (Throwable $e) {
    $st_out = $st_html;
    $st_mode = 'static (render failed)';
}

header('Content-Type: text/html; charset=UTF-8');
// Like every other page's HTML: always revalidate, so SiteGround's proxy never holds old readings.
header('Cache-Control: no-cache');
header('X-B365-Render: ' . $st_mode);
header('ETag: "' . md5($st_out) . '"');
echo $st_out;
