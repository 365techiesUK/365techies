<?php
/**
 * /bournemouth/weather/ with today's numbers already in the HTML (17 Sep 2026) - see api/bm-wx-ssr.php for why.
 *
 * The built page is still index.html: build_pages.py writes it, and the site search, sitemap and build guards read
 * it. This file serves that page with its marked skeletons filled from the weather stores, and serves the file
 * untouched if anything at all goes wrong. It is picked first because bournemouth/weather/.htaccess sets
 * DirectoryIndex index.php index.html (PHP's local dev server prefers index.php by itself).
 */
error_reporting(0);
date_default_timezone_set('Europe/London');

$wxp_html = @file_get_contents(__DIR__ . '/index.html');
if ($wxp_html === false) {
    http_response_code(503);
    header('Retry-After: 60');
    exit;
}
$wxp_out = $wxp_html;
$wxp_mode = 'static';
try {
    // top-level scope on purpose: the libraries keep state in globals and constants
    require_once __DIR__ . '/../../api/bm-weather-lib.php';
    require_once __DIR__ . '/../../api/bm-sea-lib.php';
    require_once __DIR__ . '/../../api/bm-wx-lib.php';
    require_once __DIR__ . '/../../api/bm-wx-ssr.php';
    $wxp_r = bmssr_page($wxp_html);
    // a render that lost the end of the page is worse than no render
    if (is_array($wxp_r) && is_string($wxp_r[0]) && strpos($wxp_r[0], '</html>') !== false) {
        $wxp_out = $wxp_r[0];
        $wxp_mode = 'server ' . (int)$wxp_r[1];
    }
} catch (Throwable $e) {
    $wxp_out = $wxp_html;
    $wxp_mode = 'static (render failed)';
}

header('Content-Type: text/html; charset=UTF-8');
// Like every other page's HTML: always revalidate, so SiteGround's proxy never holds an old tide table.
header('Cache-Control: no-cache');
header('X-B365-Render: ' . $wxp_mode);
$wxp_etag = '"' . md5($wxp_out) . '"';
header('ETag: ' . $wxp_etag);
if (!empty($_SERVER['HTTP_IF_NONE_MATCH'])) {
    foreach (explode(',', $_SERVER['HTTP_IF_NONE_MATCH']) as $wxp_tag) {
        // compression rewrites the tag it sends back ("...-gzip"), so compare the part we issued
        $wxp_tag = preg_replace('/-(gzip|br|deflate)"$/', '"', preg_replace('#^W/#', '', trim($wxp_tag)));
        if ($wxp_tag === $wxp_etag) {
            http_response_code(304);
            exit;
        }
    }
}
echo $wxp_out;
