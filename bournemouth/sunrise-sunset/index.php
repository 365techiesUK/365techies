<?php
/**
 * /bournemouth/sunrise-sunset/ with today's computed times already in the HTML (17 Sep 2026) - see api/bm-sun-ssr.php.
 * The same pattern as bournemouth/weather/index.php: the built index.html stays the page (build output, search,
 * sitemap, guards); this serves it with the marked blocks filled at request time, and serves the file untouched if
 * anything goes wrong. Picked first by bournemouth/sunrise-sunset/.htaccess (DirectoryIndex index.php index.html).
 */
error_reporting(0);
date_default_timezone_set('Europe/London');

$ss_html = @file_get_contents(__DIR__ . '/index.html');
if ($ss_html === false) {
    http_response_code(503);
    header('Retry-After: 60');
    exit;
}
$ss_out = $ss_html;
$ss_mode = 'static';
try {
    require_once __DIR__ . '/../../api/bm-wx-ssr.php';
    require_once __DIR__ . '/../../api/bm-sun-ssr.php';
    $ss_r = bmsun_page($ss_html);
    // a render that lost the end of the page is worse than no render
    if (is_array($ss_r) && is_string($ss_r[0]) && strpos($ss_r[0], '</html>') !== false) {
        $ss_out = $ss_r[0];
        $ss_mode = 'server ' . (int)$ss_r[1];
    }
} catch (Throwable $e) {
    $ss_out = $ss_html;
    $ss_mode = 'static (render failed)';
}

header('Content-Type: text/html; charset=UTF-8');
// Like every other page's HTML: always revalidate, so SiteGround's proxy never serves yesterday's times.
header('Cache-Control: no-cache');
header('X-B365-Render: ' . $ss_mode);
header('ETag: "' . md5($ss_out) . '"');
echo $ss_out;
