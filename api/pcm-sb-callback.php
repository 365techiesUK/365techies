<?php
/**
 * 365 PC Manager - SimplyBook booking callback.
 * SimplyBook POSTs raw JSON {booking_id, booking_hash, company, notification_type}
 * whenever a booking is created / changed / cancelled. We read the booking (public
 * API, signed with the secret key) and store the customer's next service date against
 * their PC Manager record (matched by email). No admin password needed.
 *
 * Callback URL (set in SimplyBook -> Settings -> API): this file + ?k=<SB_CALLBACK_TOKEN>
 * Config + data are server-only (gitignored): api/pcm-simplybook.php, api/pcm-data.json
 */
header('Content-Type: text/plain; charset=utf-8');
header('X-Robots-Tag: noindex, nofollow');

$CFG  = __DIR__ . '/pcm-simplybook.php';
$DATA = __DIR__ . '/pcm-data.json';
if (!file_exists($CFG)) { http_response_code(503); exit('not configured'); }
require $CFG; // $SB_COMPANY $SB_API_KEY $SB_SECRET $SB_CALLBACK_TOKEN

// guard: only requests carrying the secret token in ?k= are honoured
if (!isset($_GET['k']) || !hash_equals($SB_CALLBACK_TOKEN, (string)$_GET['k'])) { http_response_code(403); exit('denied'); }

$in = json_decode(file_get_contents('php://input'), true);
if (!is_array($in)) exit('bad_request');
$bid   = preg_replace('/[^0-9]/', '', (string)($in['booking_id'] ?? ''));
$bhash = preg_replace('/[^a-zA-Z0-9]/', '', (string)($in['booking_hash'] ?? ''));
$comp  = (string)($in['company'] ?? '');
$type  = (string)($in['notification_type'] ?? '');
if ($comp !== $SB_COMPANY || $bid === '') exit('skip');

// ---- SimplyBook public API helpers ----
function sb_rpc($url, $method, $params, $headers = array()) {
    $ch = curl_init($url);
    $h = array_merge(array('Content-Type: application/json'), $headers);
    curl_setopt_array($ch, array(CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10,
        CURLOPT_HTTPHEADER => $h,
        CURLOPT_POSTFIELDS => json_encode(array('jsonrpc' => '2.0', 'method' => $method, 'params' => $params, 'id' => 1))));
    $r = curl_exec($ch); curl_close($ch);
    return json_decode($r, true);
}

$tokRes = sb_rpc('https://user-api.simplybook.me/login', 'getToken', array($SB_COMPANY, $SB_API_KEY));
$token = isset($tokRes['result']) ? $tokRes['result'] : '';
// transient failures answer NON-2xx so SimplyBook retries the delivery - a one-off
// blip here must not permanently lose the booking from the review-email queue
if ($token === '') { http_response_code(500); exit('no_token'); }

// getBookingDetails(id, sign) where sign = md5(id . hash . secret)
$sign = md5($bid . $bhash . $SB_SECRET);
$det = sb_rpc('https://user-api.simplybook.me/', 'getBookingDetails', array($bid, $sign),
    array('X-Company-Login: ' . $SB_COMPANY, 'X-Token: ' . $token));
$b = isset($det['result']) ? $det['result'] : null;
if (!is_array($b)) { http_response_code(500); exit('no_details'); }

// trust the booking's OWN status over webhook ordering: a late/duplicate "create"
// delivery arriving after a cancel must still count as cancelled
$bstat = strtolower((string)(isset($b['status']) ? $b['status'] : ''));
if (!empty($b['is_canceled']) || !empty($b['is_cancelled']) || $bstat === 'canceled' || $bstat === 'cancelled') $type = 'cancel';

// pull email + start datetime defensively (field names vary by config)
$email = '';
foreach (array('email', 'client_email') as $k) if (!empty($b[$k])) { $email = strtolower(trim($b[$k])); break; }
if ($email === '' && isset($b['client']) && is_array($b['client']) && !empty($b['client']['email'])) $email = strtolower(trim($b['client']['email']));
$start = '';
foreach (array('start_date_time', 'start_datetime', 'start_date') as $k) if (!empty($b[$k])) { $start = (string)$b[$k]; break; }
if ($start !== '' && strlen($start) <= 10 && !empty($b['start_time'])) $start .= ' ' . $b['start_time'];
if ($email === '') exit('no_email');

// Load the review-email library FIRST: it pins the timezone to Europe/London, so
// every strtotime/date below parses SimplyBook's company-local datetimes correctly
// (and consistently with pcm-booking.php, which already pins the same zone).
define('RV_LIB', 1);
require __DIR__ . '/pcm-review.php';

$ts = strtotime($start);
$pretty = $ts ? date('D j M Y g:ia', $ts) : $start;

// Record for OUR post-visit Google-review email (replaces SimplyBook's built-in
// feedback email - see pcm-review.php). End time defensively; some configs only
// send a start, so fall back to start + 90 min.
$endS = '';
foreach (array('end_date_time', 'end_datetime', 'end_date') as $k) if (!empty($b[$k])) { $endS = (string)$b[$k]; break; }
if ($endS !== '' && strlen($endS) <= 10 && !empty($b['end_time'])) $endS .= ' ' . $b['end_time'];
$ets = $endS !== '' ? (int)strtotime($endS) : 0;
if ($ets <= 0 && $ts) $ets = $ts + 5400;
$cnm = '';
foreach (array('client_name', 'client') as $k) {
    if (empty($b[$k])) continue;
    if (is_array($b[$k])) { if (!empty($b[$k]['name'])) { $cnm = (string)$b[$k]['name']; break; } }
    else { $cnm = (string)$b[$k]; break; }
}
$svcName = '';
foreach (array('event_name', 'event') as $k) if (!empty($b[$k]) && is_string($b[$k])) { $svcName = (string)$b[$k]; break; }
/* The client's phone, pulled the same defensive way as the email above (field
   names vary by SimplyBook config).

   ⚠ THIS IS WHY AN INBOUND TEXT USED TO READ "not a number we hold". Bookings
   typed straight into SimplyBook - which the comment below rightly calls "most
   of them" - never put a phone number anywhere the comms matcher can see it.
   The number sat in SimplyBook, correct and complete, while our own customer
   record had no phone field at all, so a text from that customer arrived
   unnamed. Storing it here closes that for every future booking. */
$cph = '';
foreach (array('client_phone', 'phone', 'user_phone') as $k)
    if (!empty($b[$k]) && is_scalar($b[$k])) { $cph = (string)$b[$k]; break; }
if ($cph === '' && isset($b['client']) && is_array($b['client']) && !empty($b['client']['phone']))
    $cph = (string)$b['client']['phone'];
// peek BEFORE recording: a booking we took ourselves is already queued (and already
// announced in Slack by the book action), so we must not announce it twice
$seenTs = rv_seen($bid);
$ours = ($seenTs > 0 && $seenTs > time() - 300);
rv_record($bid, $email, $cnm, $ets, $type, $ts, $svcName);

// immediate booking-lifecycle email (confirm/change/cancel) - see cf_notify's
// dedupe rules; safe-mode gated by $CF_LIVE inside pcm-review.php
$bcode = isset($b['code']) ? preg_replace('/[^A-Za-z0-9]/', '', (string)$b['code']) : '';
cf_notify($bid, $type, $email, $cnm, $svcName, $ts, $ets, $bcode);

// ---- match a PC Manager customer by email, write/clear next-service ----
// Lock + refuse-to-wipe: never overwrite a DB we couldn't parse (would destroy all customers).
$lk = @fopen($DATA . '.lock', 'c'); if ($lk) @flock($lk, LOCK_EX);
if (file_exists($DATA)) {
    $raw = (string)@file_get_contents($DATA);
    if ($raw === '') $db = array('customers' => array());
    else { $db = json_decode($raw, true); if (!is_array($db)) { exit('db_unavailable'); } if (!isset($db['customers'])) $db['customers'] = array(); }
} else { $db = array('customers' => array()); }
$hit = false;
foreach ($db['customers'] as $key => &$c) {
    if (isset($c['email']) && strtolower(trim($c['email'])) === $email) {
        if ($type === 'cancel') { if (($c['next_ts'] ?? 0) == $ts) { $c['next'] = ''; unset($c['next_ts']); } }
        else {
            // set if sooner than what's stored, or if nothing/older is stored
            if (empty($c['next_ts']) || $ts <= $c['next_ts'] || $c['next_ts'] < time()) { $c['next'] = $pretty; $c['next_ts'] = $ts; }
        }
        /* Store SimplyBook's phone so the comms matcher can name this customer
           when they text. FILL ONLY WHEN EMPTY: `mobile` and `tel` are the
           customer's own, typed by them in the portal, and must always win. */
        if ($cph !== '' && empty($c['sb_phone']) && empty($c['mobile']) && empty($c['tel'])) {
            require_once __DIR__ . '/pcm-phone-lib.php';
            $norm = pcm_phone_norm($cph);
            if ($norm !== '') { $c['sb_phone'] = pcm_phone_display($norm); $c['sb_phone_ts'] = time(); }
        }
        $c['sb_last'] = gmdate('Y-m-d H:i') . ' (' . $type . ')';
        $hit = true;
    }
}
unset($c);
$out = 'no_match'; // booking for someone not on PC Manager — still fine for the review email
if ($hit) { $tmp = $DATA . '.sb.tmp'; if (@file_put_contents($tmp, json_encode($db, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), LOCK_EX) !== false) @rename($tmp, $DATA); $out = 'ok'; }
if ($lk) { @flock($lk, LOCK_UN); @fclose($lk); }   // release the customer-DB lock BEFORE any slow SMTP work

// Announce bookings that nothing else announces - the ones typed straight into
// SimplyBook (phone bookings, which are most of them). Online bookings are skipped
// here because the book action already posted them. This also makes the callback
// itself VISIBLE: if these stop appearing, the callback has stopped working.
if (!$ours) {
    $who = trim(preg_replace('/[\x00-\x1F\x7F]+/', ' ', substr(($cnm !== '' ? $cnm : $email), 0, 80)));
    $whn = $ts ? date('D j M Y g:ia', $ts) : '';
    $what = trim(preg_replace('/[\x00-\x1F\x7F]+/', ' ', substr($svcName, 0, 80)));
    if ($type === 'cancel') $msg = ':x: *Booking cancelled* (in SimplyBook) - ' . $who . ($whn !== '' ? ' - ' . $whn : '');
    elseif ($type === 'change') $msg = ':arrows_counterclockwise: *Booking changed* (in SimplyBook) - ' . $who . ($whn !== '' ? ' - now ' . $whn : '');
    else $msg = ':telephone_receiver: *New booking* (taken in SimplyBook) - ' . $who . ($whn !== '' ? ' - ' . $whn : '');
    if ($what !== '') $msg .= "\n> " . $what;
    rv_slack($msg);
}
rv_process(2);   // piggyback: each booking event also sends any due review emails (capped)
dn_process(2);   // ...and any due "job done" visit-record emails
rm_process(3);   // ...and any due day-before reminders
exit($out);
