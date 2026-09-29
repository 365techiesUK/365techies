<?php
/*
 * Ships and ferries — the poller. CRON ONLY, never a URL (.htaccess denies it,
 * and the SAPI check below refuses anything but the command line).
 *
 * SiteGround Site Tools -> Devs -> Cron Jobs (29 Sep 2026: every 5 minutes, 30 s listen - SiteGround counts the
 * whole time the socket is held as CPU seconds, so a 50 s-every-minute poller used most of the plan's quota):
 *   php -q /home/customer/www/365techies.co.uk/public_html/api/dorset-ships-poll.php --seconds=30 --every=300
 *   interval: every 5 minutes (minute field 0,5,10,...,55; the hours/days fields all *)
 *
 * What one run does: takes a lock (so overlapping runs cannot double-connect
 * against AISStream's connection limit), opens the websocket, subscribes to the
 * Dorset box, listens for about 50 seconds, folds every position into the
 * snapshot store, prunes anything older than 30 minutes, records its own
 * health, and exits. The public endpoint (dorset-ships.php) only ever reads
 * the store; it never touches the socket.
 *
 * Needs $AISSTREAM_API_KEY in api/dorset-keys.php. Without it the run writes an
 * honest 'missing-key' store and exits 0, so the map says "not configured"
 * rather than nothing.
 *
 * Arguments: --seconds=50 (listen window, 10..55), --every=120 (seconds between cron runs,
 * for the map's 'next update' time; match the cron interval).  Exit 0 on success, 1 on a
 * failed capture, 2 when locked out or not configured.
 */
if (PHP_SAPI !== 'cli') { http_response_code(403); exit("cli only\n"); }
error_reporting(E_ALL);
require __DIR__ . '/dorset-lib.php';
require __DIR__ . '/dorset-ships-lib.php';

$seconds = 50;
$every = 120;   // the cron's interval in seconds (*/2 until 29 Sep 2026; pass --every=300 with */5)
foreach ($argv as $a) {
    if (preg_match('/^--seconds=(\d+)$/', $a, $m)) $seconds = max(10, min(55, (int)$m[1]));
    if (preg_match('/^--every=(\d+)$/', $a, $m)) $every = max(60, min(3600, (int)$m[1]));
}

$keys = dorset_keys();
$apiKey = isset($keys['aisstream']) ? trim((string)$keys['aisstream']) : '';
$nowMs = (int)round(microtime(true) * 1000);

$lockFile = __DIR__ . '/dorset-ships.lock';
$lock = @fopen($lockFile, 'c');
if (!$lock || !@flock($lock, LOCK_EX | LOCK_NB)) { echo gmdate('c') . " ships-poll: another run holds the lock\n"; exit(2); }

$store = ships_load_store();
if ($store === null) $store = ships_empty_store();
if (!isset($store['poll'])) $store['poll'] = ships_empty_store()['poll'];
$t = ships_load_tracks();
$store['tracks'] = $t['tracks']; $store['pending'] = $t['pending'];

if ($apiKey === '') {
    $store['poll']['lastPollAt'] = $nowMs;
    $store['poll']['lastError'] = 'AISSTREAM_API_KEY is not set';
    $store['poll']['lastStatus'] = 'missing-key';
    ships_save_store($store);
    echo gmdate('c') . " ships-poll: not configured (AISSTREAM_API_KEY missing in dorset-keys.php)\n";
    exit(2);
}

$report = ships_capture($apiKey, $seconds, $store);
$endMs = (int)round(microtime(true) * 1000);
ships_prune($store, $endMs);
$store['poll']['lastPollAt'] = $endMs;
$store['poll']['nextAttemptAt'] = $nowMs + $every * 1000;   // the next cron run starts $every s after this one did
$store['poll']['authFailed'] = !empty($report['authFailed']);
$store['poll']['lastMessages'] = $report['messages'];
$store['poll']['lastFrames'] = $report['frames'];
$store['poll']['lastSeconds'] = (int)round(($endMs - $nowMs) / 1000);
$store['poll']['lastOpcodes'] = $report['opcodes'];
$store['poll']['lastUnparsed'] = $report['unparsed'];
$store['poll']['lastSample'] = isset($report['sample']) ? $report['sample'] : null;
if ($report['ok']) {
    $store['poll']['failures'] = 0;
    $store['poll']['lastError'] = null;
    $store['poll']['lastStatus'] = 'live';
} else {
    $store['poll']['failures'] = (isset($store['poll']['failures']) ? (int)$store['poll']['failures'] : 0) + 1;
    $store['poll']['lastError'] = $report['error'];
    $store['poll']['lastStatus'] = $report['authFailed'] ? 'auth-failed' : 'error';
}
$saved = ships_save_store($store) && ships_save_tracks($store);
flock($lock, LOCK_UN);
fclose($lock);

printf("%s ships-poll: %s  messages=%d frames=%d vessels=%d tracks=%d  %s%s\n",
    gmdate('c'), $report['ok'] ? 'ok' : 'FAILED', $report['messages'], $report['frames'],
    count($store['vessels']), count($store['tracks']),
    $report['error'] ? ('error=' . $report['error']) : '', $saved ? '' : '  STORE WRITE FAILED');
exit($report['ok'] && $saved ? 0 : 1);
