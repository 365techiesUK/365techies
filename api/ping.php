<?php
/*
 * Tiny latency beacon for the 365 WiFi Optimizer (/wifi-signal-test/).
 * The live signal finder fetches this ~once a second while the visitor walks
 * around, and times the round trip. Deliberately minimal: no DB, no session,
 * no logging, no cookies - just the smallest possible uncacheable response so
 * the measurement reflects the network, not our server.
 */
header('Content-Type: text/plain; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('X-Robots-Tag: noindex, nofollow');
header('Access-Control-Allow-Origin: https://365techies.co.uk');
echo '1';
