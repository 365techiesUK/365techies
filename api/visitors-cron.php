<?php
/*
 * Live-visitors statistics - the cron. CRON ONLY, never a URL (.htaccess denies it, and the SAPI check below refuses
 * anything but the command line). 29 Sep 2026.
 *
 * SiteGround Site Tools -> Devs -> Cron Jobs, every 5 minutes (minute field 0,5,10,...,55; the other fields *):
 *   php -q /home/customer/www/365techies.co.uk/public_html/api/visitors-cron.php
 *
 * What one run does: when the staff portal fetched the live view within the last 4 minutes it exits at once (that
 * fetch already folded the visitors into the statistics, and a second Cloudflare read would only spend the free
 * tier's list budget). Otherwise it reads the Worker's /live once, folds it into api/visitors-stats.json, and leaves
 * the answer in the portal's 90-second cache so a screen opened just after reuses it. The Worker keeps 5 minutes of
 * visitors, so a run every 5 minutes sees them all.
 *
 * Exit 0 when nothing was needed or all went well, 1 when the Worker did not answer, 2 when not configured.
 */
if (PHP_SAPI !== 'cli') { http_response_code(403); exit("cli only\n"); }
error_reporting(E_ALL);
require __DIR__ . '/visitors-tally-lib.php';

$CACHE = __DIR__ . '/visitors-cache.json';
$c = @json_decode((string)@file_get_contents($CACHE), true);
if (is_array($c) && isset($c['t']) && empty($c['data']['why']) && (time() - (int)$c['t']) < 240) { echo "fresh - the portal polled " . (time() - (int)$c['t']) . " s ago, nothing to do\n"; exit(0); }

list($u, $k) = vis_config(__DIR__);
if ($u === '' || $k === '') { echo "not configured (api/visitors-key.php)\n"; exit(2); }

list($code, $j, $cerr) = vis_fetch_live($u, $k);
$out = vis_shape($code, $j, $cerr);
if (!empty($out['why'])) { echo "no answer: " . $out['why'] . "\n"; exit(1); }
$n = 0; foreach ($out['sites'] as $s) $n += max(0, (int)$s['visitors']);
$folded = vis_tally($out, __DIR__ . '/visitors-stats.json');
$tmp = $CACHE . '.tmp';
if (@file_put_contents($tmp, json_encode(array('t' => time(), 'data' => $out))) !== false) @rename($tmp, $CACHE);
if ($folded === true) echo "folded " . $n . " visitor(s) on the sites\n";
elseif ($folded === 'locked') echo "skipped (another tally was running) - " . $n . " visitor(s) on the sites\n";
else { echo "could not write api/visitors-stats.json - " . $n . " visitor(s) on the sites\n"; exit(1); }
exit(0);
