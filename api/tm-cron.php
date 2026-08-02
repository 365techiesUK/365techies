<?php
/**
 * Scheduled SMS runner — sends due reminders (backup nudges, etc).
 *
 * SiteGround cron (Site Tools -> Devs -> Cron Jobs), every 15 minutes is plenty:
 *   php /home/customer/www/365techies.co.uk/public_html/api/tm-cron.php
 *
 * Also callable over HTTP for testing, but ONLY with the callback token:
 *   /api/tm-cron.php?k=<SB_CALLBACK_TOKEN>
 * ...or from a signed-in admin session (the "Run now" button in tm-admin.php).
 * There is deliberately no unauthenticated path: this endpoint spends money.
 *
 * Safety lives in tm-lib.php: quiet hours (08:00-20:00), a stale-slot grace
 * window so a missed Friday nudge never arrives on Sunday, a per-run cap, and
 * the account-wide per-minute/per-day limits in tm_send().
 */
error_reporting(0);
date_default_timezone_set('Europe/London');
header('X-Robots-Tag: noindex, nofollow');

$CLI = (php_sapi_name() === 'cli');
if (!$CLI) {
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');

    $ok = false;
    // route 1: an authenticated admin session (same as pcm-admin.php - plain
    // session_start(), default PHPSESSID; do NOT set a custom session_name)
    @session_start();
    if (!empty($_SESSION['pcm_ok'])) $ok = true;

    // route 2: the shared callback token, for a real cron over HTTP
    if (!$ok) {
        $SBCFG = __DIR__ . '/pcm-simplybook.php';
        if (is_readable($SBCFG)) {
            require $SBCFG;   // $SB_CALLBACK_TOKEN
            $k = isset($_GET['k']) ? (string)$_GET['k'] : '';
            if (!empty($SB_CALLBACK_TOKEN) && hash_equals((string)$SB_CALLBACK_TOKEN, $k)) $ok = true;
        }
    }
    if (!$ok) { http_response_code(403); echo json_encode(array('ok' => false, 'error' => 'denied')); exit; }
} else {
    header('Content-Type: text/plain; charset=utf-8');
}

require_once __DIR__ . '/tm-lib.php';

/* Abandoned bookings. Deliberately ABOVE the SMS gate below: this costs nothing
   and posts to Slack, so it must not stop running the day the SMS account is
   unconfigured, out of credit, or switched off. */
require_once __DIR__ . '/pcm-bkpend-lib.php';
$bkp = bkpend_sweep();

/* Bournemouth365 sea conditions. Same placement, same reason: the live data
   layer must keep refreshing regardless of the SMS account's state. Internally
   rate-limited (BMSEA_TTL), so the 15-min cron mostly no-ops. */
require_once __DIR__ . '/bm-sea-lib.php';
$sea = bm_sea_refresh();

if (!tm_configured()) {
    $out = array('ok' => false, 'error' => 'not-configured', 'bkpend' => $bkp);
    echo $CLI ? ("sms not configured (abandoned bookings reported: " . $bkp['told'] . ")\n")
              : json_encode($out);
    exit;
}

/* one runner at a time - a slow send must never overlap the next cron tick */
$lock = @fopen(__DIR__ . '/tm-cron.lock', 'c');
if (!$lock || !@flock($lock, LOCK_EX | LOCK_NB)) {
    $out = array('ok' => false, 'error' => 'busy');
    echo $CLI ? "busy\n" : json_encode($out);
    exit;
}

$res = tm_sched_run(10);
$res['ok'] = true;
$res['at'] = date('Y-m-d H:i');
$res['bkpend'] = $bkp;

/* Heartbeat. Without this there is no way to know the cron is alive until a
   reminder silently fails to arrive - the same blind spot the booking poller
   had. The console reads this and complains if it goes stale. */
$hb = __DIR__ . '/tm-beat.json';
$tmp = $hb . '.tmp';
if (@file_put_contents($tmp, json_encode(array(
        't' => time(), 'via' => $CLI ? 'cron' : 'http',
        'sent' => $res['sent'], 'due' => $res['due']))) !== false) {
    @rename($tmp, $hb);
}

@flock($lock, LOCK_UN); @fclose($lock);

if ($CLI) {
    echo "due {$res['due']}, sent {$res['sent']}, skipped {$res['skipped']}, failed {$res['failed']}"
       . ", abandoned bookings reported {$bkp['told']}\n";
} else {
    echo json_encode($res);
}
