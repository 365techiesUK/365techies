<?php
/**
 * 365 PC Manager - SimplyBook -> portal booking-status sync + Slack (cron, ~every 5 min).
 * -------------------------------------------------------------------------------------
 * Watches SimplyBook for status changes made OUTSIDE the portal (e.g. a job marked
 * "Completed" in SimplyBook admin) and mirrors them into the portal's bkmeta AND pings
 * Slack in near-real-time. Portal-side changes (the staffstatus action) already set
 * bkmeta + SimplyBook together, so those are seen as "no change" here and never
 * double-alert. FIRST SIGHT of any booking is seeded SILENTLY (no Slack) so the first
 * run - and any brand-new booking - can never spam the channel; only a real transition
 * on an already-seen booking alerts.
 *
 * RUN (SiteGround cron, every 5 min):
 *   php /home/customer/www/365techies.co.uk/public_html/api/pcm-bkpoll.php
 * or HTTP (guarded, for manual testing):
 *   https://365techies.co.uk/api/pcm-bkpoll.php?k=<SB_CALLBACK_TOKEN>
 *
 * Needs (server-only, gitignored): pcm-simplybook.php ($SB_COMPANY/$SB_API_USER/
 * $SB_API_USER_KEY/$SB_CALLBACK_TOKEN) and slack-webhook.php.
 */
$CLI = (php_sapi_name() === 'cli');
if (!$CLI) { header('Content-Type: application/json; charset=utf-8'); header('X-Robots-Tag: noindex, nofollow'); header('Cache-Control: no-store'); }
$BASE  = __DIR__;
$SBF   = $BASE . '/pcm-simplybook.php';
$DATA  = $BASE . '/pcm-data.json';
$LOCK  = $BASE . '/pcm-bkpoll.lock';
$TCACHE= $BASE . '/pcm-bkpoll-cache.json';   // admin token cache
function jout($a){ echo json_encode($a); exit; }

if (!is_readable($SBF)) jout(array('ok' => false, 'error' => 'no_config'));
require $SBF;
if (empty($SB_COMPANY) || empty($SB_API_USER) || empty($SB_API_USER_KEY)) jout(array('ok' => false, 'error' => 'no_admin_creds'));
if (!$CLI) {
    $k = isset($_GET['k']) ? (string)$_GET['k'] : '';
    if (empty($SB_CALLBACK_TOKEN) || !hash_equals((string)$SB_CALLBACK_TOKEN, $k)) { http_response_code(403); jout(array('ok' => false, 'error' => 'forbidden')); }
}
// single runner - never pile up
$lk = @fopen($LOCK, 'c'); if (!$lk || !@flock($lk, LOCK_EX | LOCK_NB)) jout(array('ok' => false, 'error' => 'busy'));

// --- SimplyBook admin JSON-RPC (self-contained) ---
function sbrpc($url, $method, $params, $headers = array()) {
    $ch = curl_init($url);
    curl_setopt_array($ch, array(CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true, CURLOPT_CONNECTTIMEOUT => 5, CURLOPT_TIMEOUT => 20,
        CURLOPT_HTTPHEADER => array_merge(array('Content-Type: application/json'), $headers),
        CURLOPT_POSTFIELDS => json_encode(array('jsonrpc' => '2.0', 'method' => $method, 'params' => $params, 'id' => 1))));
    $r = curl_exec($ch); curl_close($ch);
    $j = json_decode((string)$r, true); return is_array($j) ? $j : array('_net' => 1);
}
$TC = @json_decode((string)@file_get_contents($TCACHE), true); if (!is_array($TC)) $TC = array();
function adm_token() {
    global $TC, $TCACHE, $SB_COMPANY, $SB_API_USER, $SB_API_USER_KEY;
    if (!empty($TC['tok']) && (time() - (isset($TC['ts']) ? $TC['ts'] : 0)) < 1200) return $TC['tok'];
    $r = sbrpc('https://user-api.simplybook.me/login', 'getUserToken', array($SB_COMPANY, $SB_API_USER, $SB_API_USER_KEY));
    if (empty($r['result'])) jout(array('ok' => false, 'error' => 'auth'));
    $TC['tok'] = $r['result']; $TC['ts'] = time(); @file_put_contents($TCACHE, json_encode($TC), LOCK_EX);
    return $TC['tok'];
}
function adm($method, $params) {
    global $SB_COMPANY;
    return sbrpc('https://user-api.simplybook.me/admin/', $method, $params, array('X-Company-Login: ' . $SB_COMPANY, 'X-User-Token: ' . adm_token()));
}

// status_id -> confirmed/completed, by name. If the Status feature is off/empty, bail (nothing to sync).
$sr = adm('getStatuses', array());
if (isset($sr['_net'])) jout(array('ok' => false, 'error' => 'sb_unavailable'));
$stMap = array();
foreach ((isset($sr['result']) && is_array($sr['result']) ? $sr['result'] : array()) as $s) {
    $nm = strtolower((string)(isset($s['name']) ? $s['name'] : '')); $id = intval(isset($s['id']) ? $s['id'] : 0);
    if (strpos($nm, 'complet') !== false) $stMap[$id] = 'completed';
    else if (strpos($nm, 'confirm') !== false) $stMap[$id] = 'confirmed';
}
if (empty($stMap)) jout(array('ok' => true, 'note' => 'no confirmed/completed statuses configured - nothing to sync'));

// bookings from 2 days ago to 30 days ahead (statuses change around the appointment)
$br = adm('getBookings', array(array('booking_type' => 'non_cancelled',
    'date_from' => date('Y-m-d', time() - 86400 * 2), 'date_to' => date('Y-m-d', time() + 86400 * 30), 'order' => 'date_start_asc')));
if (isset($br['_net'])) jout(array('ok' => false, 'error' => 'sb_unavailable'));
$rows = (isset($br['result']) && is_array($br['result'])) ? $br['result'] : array();

function bp_clean($s) { return trim(substr(preg_replace('/[\x00-\x1F\x7F]+/', ' ', (string)$s), 0, 80)); }

// read-modify-write bkmeta under the SAME lock the app uses (pcm-data.json.lock) - short hold, no API calls inside
$dlk = @fopen($DATA . '.lock', 'c'); if ($dlk) @flock($dlk, LOCK_EX);
$db = @json_decode((string)@file_get_contents($DATA), true); if (!is_array($db)) $db = array();
if (!isset($db['bkmeta']) || !is_array($db['bkmeta'])) $db['bkmeta'] = array();
$toSlack = array(); $seeded = 0; $changed = 0;
foreach ($rows as $b) {
    $bid = (int)(isset($b['id']) ? $b['id'] : 0); if ($bid <= 0) continue;
    $sid = intval(isset($b['status_id']) ? $b['status_id'] : 0);
    $m = isset($stMap[$sid]) ? $stMap[$sid] : '';                 // '', confirmed, completed
    $bmr = isset($db['bkmeta'][(string)$bid]) ? $db['bkmeta'][(string)$bid] : null;
    $prev = $bmr ? (string)(isset($bmr['st']) ? $bmr['st'] : '') : null;   // null = never seen by us
    if ($prev === null) {                                        // first sight -> seed silently, no alert
        $db['bkmeta'][(string)$bid] = array('st' => $m, 'ts' => time(), 'sb' => 1);
        $seeded++; continue;
    }
    // SILENCE IS NOT "NO STATUS". If this response carries no status_id key at all we
    // learned nothing about the booking - downgrading on that is how a completed job
    // un-completes itself.
    if (!array_key_exists('status_id', $b)) continue;
    if ($m === $prev) continue;                                  // no change (portal-made changes already alerted)
    // NEVER blank-revert a portal-made status whose SimplyBook write did not land.
    // staffstatus always records our marker, but its setStatus can silently fail (the
    // Status feature switched off, a renamed status, insufficient API permissions) -
    // and then SimplyBook reporting "no status" is not news, it is the failure echoing
    // back. Reverting it made Steve's completed jobs reappear as outstanding on David's
    // login, and made re-completing them fire a second round of Slack messages.
    // A marker written WITH a confirmed SB write (sb=1) is still allowed to be cleared
    // here, because then a blank really is a change somebody made in SimplyBook.
    if ($m === '' && (string)(isset($bmr['src']) ? $bmr['src'] : '') === 'portal' && empty($bmr['sb'])) continue;
    $db['bkmeta'][(string)$bid] = array('st' => $m, 'ts' => time(), 'sb' => 1, 'src' => 'simplybook');
    $changed++;
    $who = bp_clean(isset($b['client']) ? $b['client'] : (isset($b['client_name']) ? $b['client_name'] : ('Booking #' . $bid)));
    $what = bp_clean(isset($b['event_name']) ? $b['event_name'] : (isset($b['event']) ? $b['event'] : ''));
    $lbl = $who . ($what !== '' ? ' - ' . $what : '');
    if ($m === 'completed') $toSlack[] = ':ballot_box_with_check: *Service completed* (in SimplyBook) - ' . $lbl;
    elseif ($m === 'confirmed') $toSlack[] = ':white_check_mark: *Booking confirmed* (in SimplyBook) - ' . $lbl;
    else $toSlack[] = ':arrows_counterclockwise: *Booking status cleared* (in SimplyBook) - ' . $lbl;
}
foreach ($db['bkmeta'] as $k2 => $v2) if ((isset($v2['ts']) ? $v2['ts'] : 0) < time() - 86400 * 90) unset($db['bkmeta'][$k2]);
$tmp = $DATA . '.' . getmypid() . '.tmp';
if (@file_put_contents($tmp, json_encode($db, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), LOCK_EX) !== false) @rename($tmp, $DATA);
if ($dlk) { @flock($dlk, LOCK_UN); @fclose($dlk); }

// Slack AFTER releasing the lock (never hold the DB lock during outbound HTTP)
$wh = ''; $swf = __DIR__ . '/slack-webhook.php';
if (file_exists($swf)) { $SLACK_WEBHOOK = ''; ob_start(); include $swf; ob_end_clean();
    if (!empty($SLACK_WEBHOOK)) $wh = $SLACK_WEBHOOK; else { $raw = (string)@file_get_contents($swf); if (preg_match('#https://hooks\.slack\.com/\S+#', $raw, $mm)) $wh = trim($mm[0]); } }
if ($wh !== '') foreach ($toSlack as $t) {
    $ch = curl_init($wh);
    curl_setopt_array($ch, array(CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 6,
        CURLOPT_HTTPHEADER => array('Content-Type: application/json'), CURLOPT_POSTFIELDS => json_encode(array('text' => $t))));
    @curl_exec($ch); curl_close($ch);
}
// Piggyback the customer-mail queues on this poll: with the 5-min cron in place this
// is the near-real-time engine for "job done" emails (fires soon after a booking is
// marked Completed above). Best-effort - a mail hiccup must never fail the poll.
define('RV_LIB', 1);
require __DIR__ . '/pcm-review.php';
$mailR = rv_process(3);
$mailD = dn_process(3);
$mailM = rm_process(5);
jout(array('ok' => true, 'bookings' => count($rows), 'seeded' => $seeded, 'changed' => $changed, 'alerts' => count($toSlack),
           'mail' => array('review' => $mailR, 'done' => $mailD, 'remind' => $mailM)));
