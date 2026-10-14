<?php
/*
 * Google Merchant Center's product feed for the refurbished Dells in stock (14 Oct 2026) - api/shop-lib.php shop_feed_xml.
 * Merchant Center fetches this URL once a day (Products > Data sources > "Add products from a file" > a link to the file):
 *   https://365techies.co.uk/api/shop-feed.php
 * Live from the stock file, so a machine sold since the last build already says out_of_stock. NO closing tag in this file.
 */
error_reporting(0);
require_once __DIR__ . '/shop-lib.php';
header('Content-Type: application/xml; charset=utf-8');
header('Cache-Control: no-cache, max-age=0');
header('X-Robots-Tag: noindex');
echo shop_feed_xml();
