<?php
/*
 * FastSpring for "Unlock everything" (12 Oct 2026; pcm-plus-fs-lib.php has the whole story).
 *   POST from FastSpring (its webhook, {"events":[...]}, X-FS-Signature) -> keys made / switched off; 200 or FastSpring retries
 *   POST {do:'key', order}  from our buy page when FastSpring's popup closes -> {ok, state:'made', key, email} | {ok, state:'waiting'}
 *     (the key only for 3 hours after the order, and only to whoever has its FastSpring order id or reference)
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') { http_response_code(405); echo '{"ok":false,"error":"post"}'; exit; }
$raw = (string)file_get_contents('php://input', false, null, 0, 500000);
require_once __DIR__ . '/pcm-plus-fs-lib.php';
require_once __DIR__ . '/pcm-mailmove-lib.php';   // mm_rate_take, mm_ip_key

function fso($a, $code = 200) { http_response_code($code); echo json_encode($a, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE); exit; }
$in = json_decode($raw, true);

// ---- our buy page ----
if (is_array($in) && isset($in['do'])) {
    if ($in['do'] !== 'key') fso(array('ok' => false, 'error' => 'bad_action'), 400);
    $rt = mm_rate_take(mm_rate_file(__DIR__), array(array('fsk:' . mm_ip_key(), 120)));
    if ($rt !== true) fso(array('ok' => false, 'error' => $rt === 'busy' ? 'busy' : 'rate'));
    foreach (array($in['order'] ?? '', $in['ref'] ?? '') as $id) {
        $r = fs_recent_get(substr((string)$id, 0, 60));
        if ($r) fso(array('ok' => true, 'state' => 'made', 'key' => $r[0], 'email' => $r[1]));
    }
    fso(array('ok' => true, 'state' => 'waiting'));
}

// ---- FastSpring's webhook ----
$sig = '';
foreach ($_SERVER as $k => $v) if (strtolower($k) === 'http_x_fs_signature') $sig = (string)$v;
if (!defined('RV_LIB')) define('RV_LIB', 1);
require_once __DIR__ . '/pcm-review.php';   // the website's own email sender (info@) - top-level scope on purpose (its globals)
list($code, $why) = fs_handle($raw, $sig, fs_secret(), 'plus_send_key');
fs_log($code . "\t" . $why);
fso(array('ok' => $code === 200, 'note' => $why), $code);
