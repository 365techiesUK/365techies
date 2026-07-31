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

if (!tm_configured()) {
    $out = array('ok' => false, 'error' => 'not-configured');
    echo $CLI ? "sms not configured\n" : json_encode($out);
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

@flock($lock, LOCK_UN); @fclose($lock);

if ($CLI) {
    echo "due {$res['due']}, sent {$res['sent']}, skipped {$res['skipped']}, failed {$res['failed']}\n";
} else {
    echo json_encode($res);
}
