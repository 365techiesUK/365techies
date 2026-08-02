<?php
/**
 * Public endpoint for /bournemouth/sea-today/ - serves the assembled
 * conditions JSON. Read-only, no inputs, no session, no secrets; the heavy
 * lifting (upstream fetches) happens in cron via bm-sea-lib.php, so this is
 * a cheap cache read on the visitor path.
 *
 * Same-origin fetch from the page. The SiteGround WAF answers scripted
 * cross-origin requests with 202+sgcaptcha but leaves same-origin browser
 * fetches alone (the booking app has proven this pattern since July).
 *
 * If the cache has never been written (fresh deploy, cron not yet fired),
 * attempt one inline refresh so the very first visitor is not shown a dead
 * panel - guarded by the same lock the cron uses, so a stampede does one
 * upstream fetch, not fifty.
 */
error_reporting(0);
date_default_timezone_set('Europe/London');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=120');
header('X-Robots-Tag: noindex, nofollow');

require_once __DIR__ . '/bm-sea-lib.php';

if (!file_exists(bmsea_file())) {
    bm_sea_refresh();   // no-op if another request holds the lock
}

echo json_encode(bm_sea_public());
