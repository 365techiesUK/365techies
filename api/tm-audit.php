<?php
/**
 * SMS readiness audit — how many SimplyBook clients can we actually text?
 *
 * WHY: before wiring SMS review requests or booking reminders, the honest
 * question is whether we hold usable mobile numbers at all. This answers it
 * from the real account instead of guessing.
 *
 * READ-ONLY AND AGGREGATE BY DESIGN. It counts; it does not build a contact
 * list. No name, no email, no full number is ever returned or written to disk -
 * the only per-client detail is a masked sample (+4477****21) so a human can
 * sanity-check that the parsing is right. Nothing here sends a message.
 *
 * Staff only: same admin session as pcm-admin.php (plain session_start(),
 * default PHPSESSID - do NOT set a custom session_name(), it silently reads a
 * different cookie).
 *
 *   /api/tm-audit.php              - audit up to 300 clients
 *   /api/tm-audit.php?limit=1000   - go deeper (slower)
 */
error_reporting(0);
date_default_timezone_set('Europe/London');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');

@session_start();
if (empty($_SESSION['pcm_ok'])) {
    http_response_code(403);
    echo json_encode(array('ok' => false, 'error' => 'not-signed-in'));
    exit;
}

require_once __DIR__ . '/tm-lib.php';

/* the SimplyBook admin credentials live in pcm-simplybook.php - the same file
   pcm-bkpoll.php uses. (Not pcm-sb-token.php: that is the token CACHE.) */
$SBF = __DIR__ . '/pcm-simplybook.php';
if (!is_readable($SBF)) { echo json_encode(array('ok' => false, 'error' => 'no_config')); exit; }
require $SBF;
if (empty($SB_COMPANY) || empty($SB_API_USER) || empty($SB_API_USER_KEY)) {
    echo json_encode(array('ok' => false, 'error' => 'no_admin_creds'));
    exit;
}

function sbrpc($url, $method, $params, $headers = array()) {
    $ch = curl_init($url);
    curl_setopt_array($ch, array(
        CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true,
        CURLOPT_CONNECTTIMEOUT => 5, CURLOPT_TIMEOUT => 25,
        CURLOPT_PROTOCOLS => CURLPROTO_HTTPS,
        CURLOPT_HTTPHEADER => array_merge(array('Content-Type: application/json'), $headers),
        CURLOPT_POSTFIELDS => json_encode(array('jsonrpc' => '2.0', 'method' => $method,
                                                'params' => $params, 'id' => 1))));
    $r = curl_exec($ch); curl_close($ch);
    $j = json_decode((string)$r, true);
    return is_array($j) ? $j : array('_net' => 1);
}

$tr = sbrpc('https://user-api.simplybook.me/login', 'getUserToken',
            array($SB_COMPANY, $SB_API_USER, $SB_API_USER_KEY));
if (empty($tr['result'])) { echo json_encode(array('ok' => false, 'error' => 'auth')); exit; }
$TOKEN = $tr['result'];

function adm($method, $params) {
    global $SB_COMPANY, $TOKEN;
    return sbrpc('https://user-api.simplybook.me/admin', $method, $params,
                 array('X-Company-Login: ' . $SB_COMPANY, 'X-Token: ' . $TOKEN));
}

$limit = isset($_GET['limit']) ? max(10, min(2000, (int)$_GET['limit'])) : 300;

/* getClientList(search, limit) - the client record is where phone lives;
   getBookings does not carry it. */
$cr = adm('getClientList', array('', $limit));
if (isset($cr['_net']) || !isset($cr['result']) || !is_array($cr['result'])) {
    echo json_encode(array('ok' => false, 'error' => 'client_list_failed',
                           'detail' => isset($cr['error']['message'])
                               ? substr((string)$cr['error']['message'], 0, 140) : ''));
    exit;
}
$clients = $cr['result'];

$stat = array(
    'clients_checked' => 0,
    'with_any_phone'  => 0,   // some phone value present
    'textable_mobile' => 0,   // parses to a UK mobile - an SMS would reach it
    'landline_only'   => 0,   // valid number, but SMS cannot reach it
    'unparseable'     => 0,   // present but not a number we trust
    'no_phone_at_all' => 0,
    'with_email'      => 0,
);
$field_names = array();   // which key actually held the phone (schema truth)
$samples = array();       // masked, max 5, purely to eyeball the parsing

foreach ($clients as $c) {
    if (!is_array($c)) continue;
    $stat['clients_checked']++;

    if (!empty($c['email']) && filter_var($c['email'], FILTER_VALIDATE_EMAIL)) $stat['with_email']++;

    $raw = '';
    foreach (array('phone', 'phone_number', 'mobile', 'client_phone', 'telephone') as $k) {
        if (!empty($c[$k]) && is_string($c[$k])) {
            $raw = $c[$k];
            $field_names[$k] = isset($field_names[$k]) ? $field_names[$k] + 1 : 1;
            break;
        }
    }
    if ($raw === '') { $stat['no_phone_at_all']++; continue; }

    $stat['with_any_phone']++;
    $e164 = tm_number($raw);
    if ($e164 === '') { $stat['unparseable']++; continue; }
    if (tm_is_mobile($e164)) {
        $stat['textable_mobile']++;
        if (count($samples) < 5) {
            $samples[] = substr($e164, 0, 6) . str_repeat('*', max(0, strlen($e164) - 8)) . substr($e164, -2);
        }
    } else {
        $stat['landline_only']++;
    }
}

/* --- second source: the portal's own customer records. pcm-booking.php stores
   sb_phone when a customer signs in, so this shows how many of OUR customers we
   could already text without touching SimplyBook at all. --- */
$portal = array('customers' => 0, 'with_sb_phone' => 0, 'textable_mobile' => 0,
                'landline_only' => 0, 'sms_opted_in' => 0);
$DATA = __DIR__ . '/pcm-data.json';
if (is_readable($DATA)) {
    $db = json_decode((string)@file_get_contents($DATA), true);
    if (is_array($db) && isset($db['customers']) && is_array($db['customers'])) {
        foreach ($db['customers'] as $c) {
            if (!is_array($c)) continue;
            $portal['customers']++;
            if (!empty($c['remind_sms'])) $portal['sms_opted_in']++;
            $p = (string)(isset($c['sb_phone']) ? $c['sb_phone']
                        : (isset($c['phone']) ? $c['phone'] : ''));
            if ($p === '') continue;
            $portal['with_sb_phone']++;
            $e = tm_number($p);
            if ($e === '') continue;
            if (tm_is_mobile($e)) $portal['textable_mobile']++; else $portal['landline_only']++;
        }
    }
}

$pct = $stat['clients_checked'] > 0
    ? round(100 * $stat['textable_mobile'] / $stat['clients_checked'], 1) : 0;

$verdict = $pct >= 60 ? 'good - SMS is worth wiring'
        : ($pct >= 25 ? 'partial - SMS would reach some, worth a top-up first'
                      : 'poor - fix the data before spending effort on SMS');

echo json_encode(array(
    'ok'                => true,
    'checked_limit'     => $limit,
    'simplybook'        => $stat,
    'textable_pct'      => $pct,
    'verdict'           => $verdict,
    'phone_fields_seen' => $field_names,   // tells us the REAL field name to read
    'sample_masked'     => $samples,
    'portal_records'    => $portal,
    'note' => 'Aggregate only. No names, emails or full numbers are returned or stored.',
), JSON_PRETTY_PRINT);
