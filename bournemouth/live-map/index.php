<?php
/**
 * /bournemouth/live-map/ with the feeds' latest counts already in the HTML (17 Sep 2026) - see api/bm-map-ssr.php.
 * The same pattern as bournemouth/weather/index.php: the built index.html stays the page (build output, search,
 * sitemap, guards); this serves it with the marked blocks filled at request time, and serves the file untouched if
 * anything goes wrong. Picked first by bournemouth/live-map/.htaccess (DirectoryIndex index.php index.html).
 */
error_reporting(0);
date_default_timezone_set('Europe/London');

$lm_html = @file_get_contents(__DIR__ . '/index.html');
if ($lm_html === false) {
    http_response_code(503);
    header('Retry-After: 60');
    exit;
}
$lm_out = $lm_html;
$lm_mode = 'static';
try {
    require_once __DIR__ . '/../../api/bm-wx-ssr.php';
    require_once __DIR__ . '/../../api/bm-map-ssr.php';
    $lm_r = bmmap_page($lm_html);
    // a render that lost the end of the page is worse than no render
    if (is_array($lm_r) && is_string($lm_r[0]) && strpos($lm_r[0], '</html>') !== false) {
        $lm_out = $lm_r[0];
        $lm_mode = 'server ' . (int)$lm_r[1];
    }
} catch (Throwable $e) {
    $lm_out = $lm_html;
    $lm_mode = 'static (render failed)';
}

header('Content-Type: text/html; charset=UTF-8');
// Like every other page's HTML: always revalidate, so SiteGround's proxy never holds old counts.
header('Cache-Control: no-cache');
header('X-B365-Render: ' . $lm_mode);
header('ETag: "' . md5($lm_out) . '"');
echo $lm_out;
