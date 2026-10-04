<?php
/**
 * /bournemouth/fuel-prices/ with today's Bournemouth, Poole and Christchurch fuel prices already in the HTML (4 Oct 2026) - see api/bm-fuel-ssr.php for why.
 *
 * The built page is still index.html: build_pages.py writes it, and the site search, sitemap and build guards read it.
 * This file serves that page with its <!--ssr:--> markers filled from the fuel store, and serves the file untouched if
 * anything at all goes wrong. It is picked first because this folder's .htaccess sets DirectoryIndex index.php index.html
 * (PHP's local dev server prefers index.php by itself). Same shape as bournemouth/weather/index.php.
 */
error_reporting(0);
date_default_timezone_set('Europe/London');

$ff_html = @file_get_contents(__DIR__ . '/index.html');
if ($ff_html === false) {
    http_response_code(503);
    header('Retry-After: 60');
    exit;
}
$ff_out = $ff_html;
$ff_mode = 'static';
try {
    require_once __DIR__ . '/../../api/bm-fuel-lib.php';
    require_once __DIR__ . '/../../api/bm-fuel-ssr.php';
    $ff_r = bmfssr_page($ff_html);
    // a render that lost the end of the page is worse than no render
    if (is_array($ff_r) && is_string($ff_r[0]) && strpos($ff_r[0], '</html>') !== false) {
        $ff_out = $ff_r[0];
        $ff_mode = 'server ' . (int)$ff_r[1];
    }
} catch (Throwable $e) {
    $ff_out = $ff_html;
    $ff_mode = 'static (render failed)';
}

header('Content-Type: text/html; charset=UTF-8');
// Like every other page's HTML: always revalidate, so SiteGround's proxy never holds yesterday's prices.
header('Cache-Control: no-cache');
header('X-FF-Render: ' . $ff_mode);
$ff_etag = '"' . md5($ff_out) . '"';
header('ETag: ' . $ff_etag);
if (!empty($_SERVER['HTTP_IF_NONE_MATCH'])) {
    foreach (explode(',', $_SERVER['HTTP_IF_NONE_MATCH']) as $ff_tag) {
        $ff_tag = preg_replace('/-(gzip|br|deflate)"$/', '"', preg_replace('#^W/#', '', trim($ff_tag)));
        if ($ff_tag === $ff_etag) {
            http_response_code(304);
            exit;
        }
    }
}
echo $ff_out;
