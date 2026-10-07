<?php
/**
 * 365 PC Manager - in-app booking + booking-account sign-in.
 * The tray app talks ONLY to this proxy; all SimplyBook credentials stay server-side.
 *
 * SECURITY MODEL (important):
 *  A SimplyBook client login can be self-registered with ANY email, so a booking login
 *  by itself proves only "controls this booking account" - NOT "is a paying customer".
 *  Therefore:
 *   - Sign-in NEVER grants Pro by an email match to a pre-existing Pro record, and never
 *     hands back another record's licence key on an email-only match.
 *   - Pro is only ever carried by an owner action: the app sends its existing licence key
 *     (issued by the owner / entered once in Activate) and the server links the booking
 *     identity to THAT record; or the owner links/promotes a record in the admin console.
 *   - Everyone else who signs in gets a FREE self-serve booking identity keyed to their
 *     SimplyBook client id - they can book / see / change / cancel only their OWN bookings.
 *  Booking operations are always scoped to the verified sb_client_id, so a customer can
 *  never see or touch anyone else's bookings.
 *
 * Server-only files (NEVER in git):
 *  pcm-simplybook.php -> $SB_COMPANY $SB_API_KEY $SB_SECRET $SB_CALLBACK_TOKEN
 *                        + $SB_API_USER  (dedicated SimplyBook user login)
 *                          $SB_API_USER_KEY (that user's password OR "api_user_key_..." key)
 *  pcm-data.json      -> customer DB (shared with pcm.php)  |  pcm-sb-token.json (cache)
 *  pcm-throttle.json  -> sign-in attempt throttle
 */
header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
date_default_timezone_set('Europe/London'); // SimplyBook datetimes are company-local

$CFG      = __DIR__ . '/pcm-simplybook.php';
$DATA     = __DIR__ . '/pcm-data.json';
$CACHE    = __DIR__ . '/pcm-sb-token.json';
$THROTTLE = __DIR__ . '/pcm-throttle.json';
/* Abandoned-booking store. TOP LEVEL DELIBERATELY - see the note on the mail
   library below: an include inside a function scopes its globals to that call
   and the file then does nothing while reporting success. That exact bug ran in
   pcm-review.php for months. Nothing here is optional; do not move it. */
require_once __DIR__ . '/pcm-bkpend-lib.php';
require_once __DIR__ . '/pcm-gate.php';   // 29 Sep 2026: queued work opens the minute-poll gate (see that file)
// Safe-maintenance allow-list - MUST match pcm.php. Only these fixed ids can be queued; the app
// maps each to a hard-coded, non-destructive routine and ignores anything else. See pcm.php note.
$PCM_CMDS = array('flushdns','cleartemp','collectlogs');

/* THE MAIL LIBRARY LOADS HERE, AT TOP LEVEL, AND MUST STAY HERE.
   ==============================================================
   pcm-review.php sets its config as top-level assignments: $RV_Q (the queue file
   path), $WC_LIVE, $WC_MAX_AGE, $WC_DELAY. PHP binds an include's top-level
   variables to the scope that ran the include - so including it from INSIDE
   pcm_welcome_maybe(), as this file did, made every one of them a local of that
   function and left the globals unset.

   rvq_open() and rvq_save() both read `global $RV_Q`. With it unset they became:

       fopen(null . '.lock', 'c')   -> a stray .lock in the working directory
       file_exists(null)            -> false, so the queue read back EMPTY
       rename($tmp, '')             -> failed, silently, behind an @

   So wc_record() added the customer to a phantom empty array, wrote it nowhere,
   and returned true. The caller believed it and stamped them 'welcomed' for ever.
   The cron then read the real queue and correctly found nothing to send.

   Net effect: the automatic portal welcome had NEVER worked. The two customers
   who got one on 28 Jul 2026 got it from the admin console's Send-now button,
   which runs at global scope where $RV_Q is real. Steve found it on 30 Jul when
   a batch of sign-ins produced no email at all.

   wc_record() already carried a comment about this trap for $WC_DELAY. It just
   did not follow the thought through to the queue path the function opens.

   Loading at top level costs one parse of a definitions-only file (everything
   above its RV_LIB guard is function declarations plus six assignments - no I/O,
   no sending), and makes every later call correct wherever it is made from. */
if (!defined('RV_LIB')) define('RV_LIB', 1);
@include_once __DIR__ . '/pcm-review.php';

function out($a){ echo json_encode($a); exit; }
function fail($e){ out(array('ok'=>false,'error'=>$e)); }

if (!file_exists($CFG)) { http_response_code(503); fail('not_configured'); }
require $CFG;
$HAS_ADMIN = !empty($SB_API_USER) && !empty($SB_API_USER_KEY);

$raw = file_get_contents('php://input');
$in = json_decode($raw, true);
if (!is_array($in)) fail('bad_request');
$action  = isset($in['action'])  ? preg_replace('/[^a-z]/', '', $in['action']) : '';
$key     = isset($in['key'])     ? strtoupper(preg_replace('/[^A-Za-z0-9\-]/', '', $in['key'])) : '';
$machine = isset($in['machine']) ? preg_replace('/[^a-f0-9]/', '', substr($in['machine'], 0, 32)) : '';

/* The customer session cookie. HttpOnly (script cannot read it - which is the
   point: Safari's 7-day storage purge and cleared localStorage cannot touch
   it), Secure, SameSite=Lax (never sent on cross-site fetches/POSTs, so no
   CSRF surface opens), scoped to /api/ only. Staff and view-as sessions never
   get one - their short lives are deliberate. $persist=false -> a browser-
   session cookie for "shared computer" sign-ins. */
function wcookie_set($wt, $persist = true) {
    @setcookie('p365w', $wt, array('expires' => $persist ? time() + 31536000 : 0,
        'path' => '/api/', 'secure' => true, 'httponly' => true, 'samesite' => 'Lax'));
}
function wcookie_clear() {
    @setcookie('p365w', '', array('expires' => time() - 86400,
        'path' => '/api/', 'secure' => true, 'httponly' => true, 'samesite' => 'Lax'));
}
function wcookie_get() {
    return isset($_COOKIE['p365w']) ? preg_replace('/[^a-f0-9]/', '', (string)$_COOKIE['p365w']) : '';
}

// ---------------------------------------------------------------- SimplyBook JSON-RPC
// Returns array on success; array('_net'=>true) on a transport failure so callers can
// tell "the booking system said no" apart from "we couldn't reach the booking system".
function sb_rpc($url, $method, $params, $headers = array()) {
    $ch = curl_init($url);
    $h = array_merge(array('Content-Type: application/json'), $headers);
    curl_setopt_array($ch, array(CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 6, CURLOPT_TIMEOUT => 12,
        CURLOPT_HTTPHEADER => $h,
        CURLOPT_POSTFIELDS => json_encode(array('jsonrpc' => '2.0', 'method' => $method, 'params' => $params, 'id' => 1))));
    $r = curl_exec($ch);
    if ($r === false) { curl_close($ch); return array('_net' => true); }
    curl_close($ch);
    $d = json_decode($r, true);
    return is_array($d) ? $d : array('_net' => true);
}
function sb_net($r){ return isset($r['_net']); }

// Load the Slack webhook WITHOUT ever echoing the file: the config may be plain-URL format
// (not PHP), and a bare include of a non-PHP file prints its contents into the response -
// which would leak the webhook to any caller. Buffer + discard, then parse either format.
function pcm_slack_webhook() {
    $f = __DIR__ . '/slack-webhook.php';
    if (!file_exists($f)) return '';
    $SLACK_WEBHOOK = '';
    ob_start(); include $f; ob_end_clean();
    if (!empty($SLACK_WEBHOOK)) return $SLACK_WEBHOOK;
    $raw = (string)@file_get_contents($f);
    if (preg_match('#https://hooks\.slack\.com/\S+#', $raw, $m)) return trim($m[0]);
    return '';
}

// Fire-and-forget Slack post for booking events. Best-effort: never blocks or fails the caller.
function pcm_slack_say($text) {
    $wh = pcm_slack_webhook();
    if ($wh === '') return false;
    $ch = curl_init($wh);
    curl_setopt_array($ch, array(CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 6,
        CURLOPT_HTTPHEADER => array('Content-Type: application/json'),
        CURLOPT_POSTFIELDS => json_encode(array('text' => (string)$text))));
    $r = @curl_exec($ch); curl_close($ch);
    return ($r === 'ok');
}
// Booking-event Slack helpers: the signed-in staffer's label, a safe name cleaner, and a "who - what" label.
// A staff session keeps the sign-in email as 'login' (stafflogin); older readers looked only for 'email'/'name',
// so every "(by ...)" said "the team" (found 6 Oct 2026, Jake's logged job "by Staff").
function staff_who_of($r) {
    $r = is_array($r) ? $r : array();
    foreach (array('login', 'email', 'name') as $k) if (isset($r[$k]) && trim((string)$r[$k]) !== '') return trim((string)$r[$k]);
    return '';
}
function staff_who() { global $STAFF_REC; return staff_who_of(isset($STAFF_REC) ? $STAFF_REC : array()); }
// steve@365techies.co.uk -> Steve; info@ (David's account) -> David - the same rule as comms_staff_name()
function staff_first_of($raw) {
    $l = strtolower((string)strstr(trim((string)$raw) . '@', '@', true));
    if ($l === '') return '';
    if ($l === 'info') return 'David';
    return ucfirst((string)preg_replace('/[^a-z].*$/', '', $l));
}
function staff_first() { return staff_first_of(staff_who()); }
function bk_clean($s) { return trim(substr(preg_replace('/[\x00-\x1F\x7F]+/', ' ', (string)$s), 0, 80)); }
function bk_lbl($bid) { global $in; $who = bk_clean(isset($in['who']) ? $in['who'] : (isset($in['name']) ? $in['name'] : ''));
    $what = bk_clean(isset($in['what']) ? $in['what'] : ''); return ($who !== '' ? $who : ('Booking #' . (int)$bid)) . ($what !== '' ? ' - ' . $what : ''); }
function bk_by() { $w = staff_first(); return ' _(by ' . ($w !== '' ? $w : 'the team') . ')_'; }

function cache_load($f){ $c = file_exists($f) ? json_decode((string)@file_get_contents($f), true) : null; return is_array($c) ? $c : array(); }
function cache_save($f, $c){ $tmp = $f . '.' . getmypid() . '.tmp'; if (@file_put_contents($tmp, json_encode($c), LOCK_EX) !== false) @rename($tmp, $f); }

function sb_pub_headers() {
    global $SB_COMPANY, $SB_API_KEY, $CACHE;
    $c = cache_load($CACHE);
    if (empty($c['pub']['tok']) || (time() - (isset($c['pub']['ts']) ? $c['pub']['ts'] : 0)) > 1200) {
        $r = sb_rpc('https://user-api.simplybook.me/login', 'getToken', array($SB_COMPANY, $SB_API_KEY));
        if (empty($r['result'])) fail('sb_unavailable');
        $c['pub'] = array('tok' => $r['result'], 'ts' => time());
        cache_save($CACHE, $c);
    }
    return array('X-Company-Login: ' . $SB_COMPANY, 'X-Token: ' . $c['pub']['tok']);
}
function sb_forget($which) { global $CACHE; $c = cache_load($CACHE); unset($c[$which]); cache_save($CACHE, $c); }
// retry once on a JSON-RPC error (usually an expired/invalidated token) with a fresh token
function sb_pub($method, $params) {
    $r = sb_rpc('https://user-api.simplybook.me/', $method, $params, sb_pub_headers());
    if (!sb_net($r) && !isset($r['result']) && isset($r['error'])) { sb_forget('pub'); $r = sb_rpc('https://user-api.simplybook.me/', $method, $params, sb_pub_headers()); }
    return $r;
}

// A SimplyBook auth/API failure stops sign-ins AND bookings dead, and the customer only
// ever sees a polite apology - so it must be visible to the team. Throttled to one alert
// per 10 minutes per kind, so an outage reports itself once rather than a hundred times.
function sb_alarm($what, $why) {
    global $CACHE;
    $c = cache_load($CACHE);
    $k = 'alarm_' . preg_replace('/[^a-z]/', '', strtolower($what));
    if ((isset($c[$k]) ? $c[$k] : 0) > time() - 600) return;
    $c[$k] = time();
    cache_save($CACHE, $c);
    pcm_slack_say(':rotating_light: *Booking system problem* - ' . $what . ': ' . $why
        . "\n> Customers are seeing \"our booking system is having a moment\" and cannot sign in or book right now.");
}
// Ask SimplyBook which CLIENT fields it insists on. Called automatically when a client
// record is refused, so the alert names the actual field instead of sending anyone
// hunting through admin screens. Method names differ across SimplyBook versions, so
// try the plausible ones and use whichever answers.
// Per SimplyBook's API documentation: getCompanyParam('require_fields') is the ONLY
// documented way to read what a client record requires (name is always mandatory;
// email and/or phone can be). The Client Fields CUSTOM FEATURE has NO API surface -
// its fields cannot be read or supplied through addClient at all, so one of those
// marked "Required" makes API client creation IMPOSSIBLE until unticked in the UI.
function sb_required_client_fields() {
    $r = sb_adm('getCompanyParam', array('require_fields'));
    if (sb_net($r)) return 'could not reach SimplyBook to read require_fields';
    if (!isset($r['result'])) return 'require_fields could not be read'
        . (isset($r['error']['message']) ? ' (' . substr(preg_replace('/[^\x20-\x7E]/', '', (string)$r['error']['message']), 0, 80) . ')' : '');
    return 'require_fields = ' . substr(preg_replace('/[^\x20-\x7E]/', '', json_encode($r['result'])), 0, 200);
}

function sb_why($r) {
    if (isset($r['_net'])) return 'could not reach SimplyBook (network)';
    if (isset($r['error']['message'])) return substr(preg_replace('/[^\x20-\x7E]/', '', (string)$r['error']['message']), 0, 140);
    return 'no result returned';
}

function sb_adm_headers() {
    global $SB_COMPANY, $SB_API_USER, $SB_API_USER_KEY, $CACHE;
    $c = cache_load($CACHE);
    if (empty($c['adm']['tok']) || (time() - (isset($c['adm']['ts']) ? $c['adm']['ts'] : 0)) > 1200) {
        $r = sb_rpc('https://user-api.simplybook.me/login', 'getUserToken', array($SB_COMPANY, $SB_API_USER, $SB_API_USER_KEY));
        if (empty($r['result'])) {
            // this exit happens INSIDE the helper, so a caller's own diagnostics never run
            $w = sb_why($r);
            sb_alarm('SimplyBook admin login (getUserToken) failed', $w);
            out(array('ok' => false, 'error' => 'sb_unavailable', 'at' => 'getUserToken', 'why' => $w));
        }
        $c['adm'] = array('tok' => $r['result'], 'ts' => time());
        cache_save($CACHE, $c);
    }
    return array('X-Company-Login: ' . $SB_COMPANY, 'X-User-Token: ' . $c['adm']['tok']);
}
// addClient with automatic satisfaction of REQUIRED custom client fields. The docs
// claim custom fields have no API, but the live error (-32070) names each missing
// one as client_fields/<32-hex id> - so they CAN be supplied, keyed by that id, in
// an (undocumented) client_fields map. Required ids surface one at a time, so loop:
// fill each with "-" (a visible staff-completes-later placeholder) until the create
// succeeds or the error stops being a fillable custom field. Discovered live
// 2026-07-26 via the sbdiag dry run; do not "simplify" back to a single call.
function sb_add_client_smart($cd, &$filled = null) {
    $cf = array(); $r = array('_net' => true); $droppedAddr = false;
    $addrKeys = array('address1', 'address2', 'city', 'zip');
    for ($i = 0; $i < 8; $i++) {
        $p = $cd; if (count($cf)) $p['client_fields'] = $cf;
        $r = sb_adm('addClient', array($p, false));
        if (sb_net($r) || !empty($r['result'])) break;
        $f = isset($r['error']['data']['field']) ? (string)$r['error']['data']['field'] : '';
        if (preg_match('#^client_fields/([a-f0-9]{32})$#', $f, $m) && !isset($cf[$m[1]])) { $cf[$m[1]] = '-'; continue; }
        /* The address is a nice-to-have riding on a call that sits on the critical
           path of every first booking. If SimplyBook objects for any reason we
           can't otherwise fix, drop it and try once more: a customer must never
           lose a booking over an optional field. */
        if (!$droppedAddr) {
            $droppedAddr = true;
            $had = false;
            foreach ($addrKeys as $ak) if (isset($cd[$ak])) { unset($cd[$ak]); $had = true; }
            if ($had) continue;
        }
        break;
    }
    $filled = array_keys($cf);
    return $r;
}
// Our stored address -> SimplyBook's own client field names (the same four that
// getClientInfo returns, so the diary card reads them back unchanged).
function addr_for_sb($a) {
    if (!is_array($a)) return array();
    $g = function ($k) use ($a) { return trim(substr((string)(isset($a[$k]) ? $a[$k] : ''), 0, 90)); };
    $o = array();
    if ($g('line1') !== '')    $o['address1'] = $g('line1');
    if ($g('line2') !== '')    $o['address2'] = $g('line2');
    if ($g('city') !== '')     $o['city'] = $g('city');
    if ($g('postcode') !== '') $o['zip'] = $g('postcode');
    return $o;
}

/* One SimplyBook client record, for filling gaps in OUR copy of their details.
   Same getClient/getClientInfo fallback as the staff contact card, because
   editions differ on which one exists. Returns null when SimplyBook cannot be
   reached or the client has gone: a failed pull must never be mistaken for
   "they have no address", or we would cache emptiness over a real address. */
function sb_client_fetch($cid) {
    global $HAS_ADMIN;
    $cid = (int)$cid;
    if ($cid <= 0 || !$HAS_ADMIN) return null;
    $r = sb_adm('getClient', array($cid));
    if (sb_net($r) || (isset($r['error']) && empty($r['result']))) {
        $r2 = sb_adm('getClientInfo', array($cid));
        if (!sb_net($r2) && !empty($r2['result'])) $r = $r2;
    }
    if (sb_net($r) || empty($r['result']) || !is_array($r['result'])) return null;
    return $r['result'];
}

/* SimplyBook's four address fields -> our shape. The mirror of addr_for_sb().
   Returns null unless there is something worth storing: a record with only a
   stray space in it must not count as an address and stop the customer being
   asked for a real one. */
function addr_from_sb($client) {
    if (!is_array($client)) return null;
    $g = function ($k) use ($client) {
        $v = isset($client[$k]) ? (string)$client[$k] : '';
        return trim(preg_replace('/\s{2,}/', ' ', preg_replace('/[\x00-\x1F\x7F]+/', ' ', $v)));
    };
    $a = array('line1' => substr($g('address1'), 0, 90), 'line2' => substr($g('address2'), 0, 90),
               'city' => substr($g('city'), 0, 60), 'postcode' => strtoupper(substr($g('zip'), 0, 12)));
    if ($a['line1'] === '' && $a['city'] === '' && $a['postcode'] === '') return null;
    return $a;
}

function sb_adm($method, $params) {
    $r = sb_rpc('https://user-api.simplybook.me/admin/', $method, $params, sb_adm_headers());
    if (!sb_net($r) && !isset($r['result']) && isset($r['error'])) { sb_forget('adm'); $r = sb_rpc('https://user-api.simplybook.me/admin/', $method, $params, sb_adm_headers()); }
    return $r;
}

function sb_services() {
    global $CACHE;
    $c = cache_load($CACHE);
    if (empty($c['services']['data']) || (time() - (isset($c['services']['ts']) ? $c['services']['ts'] : 0)) > 600) {
        $r = sb_pub('getEventList', array());
        if (sb_net($r) || !isset($r['result']) || !is_array($r['result'])) fail('sb_unavailable');
        $list = array();
        foreach ($r['result'] as $id => $ev) {
            // NOTE: deliberately permissive (skip only when EXPLICITLY inactive/hidden).
            // Fail-closed here would empty the booking page entirely if SimplyBook ever
            // omitted these flags. Public exposure is controlled by $SB_PUBLIC_EVENTS in
            // the pubservices action instead.
            if (isset($ev['is_active']) && !$ev['is_active']) continue;
            if (isset($ev['is_visible']) && !$ev['is_visible']) continue;
            $units = array();
            if (isset($ev['unit_map']) && is_array($ev['unit_map'])) foreach ($ev['unit_map'] as $uid) $units[] = (int)$uid;
            // description is owner-controlled in SimplyBook and shown on the public
            // booking page, so a service like a repair can say "free diagnosis, then
            // we quote" without us hard-coding pricing claims in the site
            $dsc = (string)(isset($ev['description']) ? $ev['description'] : '');
            // replace tags with a SPACE rather than stripping them: SimplyBook descriptions
            // often start with a heading, and removing the tag outright welds it onto the
            // next sentence ("...Computer ServiceFull Data Backup")
            $dsc = preg_replace('/<[^>]*>/', ' ', $dsc);
            $dsc = trim(preg_replace('/\s+/', ' ', html_entity_decode($dsc, ENT_QUOTES, 'UTF-8')));
            if (function_exists('mb_strlen') ? mb_strlen($dsc, 'UTF-8') > 180 : strlen($dsc) > 180) {
                $cut = function_exists('mb_substr') ? mb_substr($dsc, 0, 180, 'UTF-8') : substr($dsc, 0, 180);
                // end on a sentence if there is one, else a word - never mid-word
                $stop = max(strrpos($cut, '. '), strrpos($cut, '! '), strrpos($cut, '? '));
                if ($stop !== false && $stop > 80) $dsc = rtrim(substr($cut, 0, $stop + 1));
                else { $sp = strrpos($cut, ' '); $dsc = rtrim($sp !== false && $sp > 80 ? substr($cut, 0, $sp) : $cut, " ,;:-") . '...'; }
            }
            $list[] = array('id' => (int)(isset($ev['id']) ? $ev['id'] : $id),
                            'name' => (string)(isset($ev['name']) ? $ev['name'] : 'Service'),
                            'mins' => (int)(isset($ev['duration']) ? $ev['duration'] : 60),
                            'desc' => $dsc,
                            'units' => $units);
        }
        $c['services'] = array('data' => $list, 'ts' => time());
        cache_save($CACHE, $c);
    }
    return $c['services']['data'];
}
function sb_all_units() {
    global $CACHE;
    $c = cache_load($CACHE);
    if (empty($c['units']['data']) || (time() - (isset($c['units']['ts']) ? $c['units']['ts'] : 0)) > 600) {
        $r = sb_pub('getUnitList', array());
        $ids = array();
        if (!sb_net($r) && isset($r['result']) && is_array($r['result']))
            foreach ($r['result'] as $id => $u) { if (!isset($u['is_active']) || $u['is_active']) $ids[] = (int)(isset($u['id']) ? $u['id'] : $id); }
        $c['units'] = array('data' => $ids, 'ts' => time());
        cache_save($CACHE, $c);
    }
    return $c['units']['data'];
}
// units that actually perform this service (falls back to all units)
function sb_units_for($eventId) {
    foreach (sb_services() as $sv) if ($sv['id'] === $eventId && !empty($sv['units'])) return $sv['units'];
    return sb_all_units();
}
function sb_mins_for($eventId) {
    foreach (sb_services() as $sv) if ($sv['id'] === $eventId) return $sv['mins'] > 0 ? $sv['mins'] : 60;
    return 60;
}

// ---------------------------------------------------------------- customer DB (shared with pcm.php)
function db_open() {
    global $DATA;
    $lk = @fopen($DATA . '.lock', 'c');
    if (!$lk || !@flock($lk, LOCK_EX)) { http_response_code(503); fail('db_unavailable'); }
    if (!file_exists($DATA)) return array($lk, array('customers' => array()));
    $raw = (string)@file_get_contents($DATA);
    if ($raw === '') return array($lk, array('customers' => array()));
    $db = json_decode($raw, true);
    if (!is_array($db)) { @flock($lk, LOCK_UN); @fclose($lk); http_response_code(503); fail('db_unavailable'); }
    if (!isset($db['customers'])) $db['customers'] = array();
    return array($lk, $db);
}
function db_save($db) {
    global $DATA;
    $tmp = $DATA . '.' . getmypid() . '.tmp';
    if (@file_put_contents($tmp, json_encode($db, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), LOCK_EX) !== false) @rename($tmp, $DATA);
}
function db_close($lk) { if ($lk) { @flock($lk, LOCK_UN); @fclose($lk); } }

// Read + validate a customer, copy the fields we need, RELEASE the lock (so we never hold
// the DB lock across slow SimplyBook HTTP). Returns a small snapshot array.
function customer_snapshot() {
    global $key, $machine;
    list($lk, $db) = db_open();
    if ($key === '' || !isset($db['customers'][$key])) { db_close($lk); fail('not_registered'); }
    $c = $db['customers'][$key];
    if ($machine === '' || !isset($c['machines'][$machine])) { db_close($lk); fail('not_registered'); }
    db_close($lk);
    return array(
        'cid'   => isset($c['sb_client_id']) ? (int)$c['sb_client_id'] : 0,
        'name'  => (string)(isset($c['sb_name']) ? $c['sb_name'] : (isset($c['name']) ? $c['name'] : '')),
        'email' => (string)(isset($c['sb_email']) ? $c['sb_email'] : (isset($c['email']) ? $c['email'] : '')),
        'phone' => (string)(isset($c['sb_phone']) ? $c['sb_phone'] : (isset($c['phone']) ? $c['phone'] : '')),
        // the two the customer maintains themselves in the portal (pcm-phone-lib.php)
        'mobile' => (string)(isset($c['mobile']) ? $c['mobile'] : ''),
        'tel'    => (string)(isset($c['tel']) ? $c['tel'] : ''),
        'addr'  => (!empty($c['addr']) && is_array($c['addr'])) ? $c['addr'] : null,
    );
}
// re-open, mutate this customer's next-service, save, release
// portal (web) customer auth: resolve a wtoken session to the customer snapshot - the web
// equivalent of customer_snapshot(), with the same expiry + machine binding as pcm.php.
function web_snapshot() {
    global $in, $machine;
    $wt = isset($in['wtoken']) ? preg_replace('/[^a-f0-9]/', '', (string)$in['wtoken']) : '';
    $via_cookie = false;
    if ($wt === '') { $wt = wcookie_get(); $via_cookie = ($wt !== ''); }
    if ($wt === '') fail('expired');
    list($lk, $db) = db_open(); db_close($lk);
    $ws = isset($db['websessions'][$wt]) ? $db['websessions'][$wt] : null;
    if (!$ws) { if ($via_cookie) wcookie_clear(); fail('expired'); }
    // a view-as session must never be adopted from a cookie (it is staff
    // impersonation, sessionStorage-only by design; no cookie is ever set
    // for one - refusing here is belt to that braces)
    if ($via_cookie && !empty($ws['viewas'])) fail('expired');
    $slide = !empty($ws['forever']) ? 31536000 : (!empty($ws['long']) ? 5184000 : 43200);
    $capOK = !empty($ws['forever']) ? true : (intval(isset($ws['iat']) ? $ws['iat'] : 0) > time() - (!empty($ws['long']) ? 7776000 : 86400));
    if (intval(isset($ws['ts']) ? $ws['ts'] : 0) <= time() - $slide || !$capOK) fail('expired');
    // fail CLOSED: a machine-bound session must present its matching machine. Omitting the
    // field (so $machine === '') must NOT skip the check, or a stolen bearer wtoken could be
    // replayed from any device against the destructive cancel/change endpoints.
    if (!empty($ws['machine']) && $ws['machine'] !== $machine) {
        /* Body-token requests keep the strict check: a stolen BEARER token
           must not be replayable from another device. But a session carried
           by the HttpOnly cookie proves the browser itself is the one we set
           it on - script cannot read or exfiltrate it - and Safari's storage
           purge REGENERATES the machine id on the same legitimate device.
           So: cookie-carried auth rebinds to the presented machine id. */
        if (!($via_cookie && $machine !== '')) fail('expired');
        list($lk2, $db2) = db_open();
        if (isset($db2['websessions'][$wt])) {
            $db2['websessions'][$wt]['machine'] = $machine;
            $db2['websessions'][$wt]['ts'] = time();
            db_save($db2);
        }
        db_close($lk2);
        $ws['machine'] = $machine;
    } elseif (intval(isset($ws['ts']) ? $ws['ts'] : 0) < time() - 86400) {
        // make the sliding window actually slide - nothing ever refreshed ts
        // before this, so "60-day sliding" sessions died a fixed 60 days
        // after sign-in however often the customer visited. One write a day.
        list($lk3, $db3) = db_open();
        if (isset($db3['websessions'][$wt])) { $db3['websessions'][$wt]['ts'] = time(); db_save($db3); }
        db_close($lk3);
    }
    $key2 = (string)$ws['key'];
    if (!isset($db['customers'][$key2])) fail('expired');
    $c = $db['customers'][$key2];
    return array('key' => $key2,
        'wtoken' => $wt,
        'tier' => ((isset($c['tier']) && $c['tier'] === 'pro') ? 'pro' : 'free'),
        'cid' => intval(isset($c['sb_client_id']) ? $c['sb_client_id'] : 0),
        'name' => (string)(isset($c['sb_name']) ? $c['sb_name'] : (isset($c['name']) ? $c['name'] : '')),
        'email' => (string)(isset($c['sb_email']) ? $c['sb_email'] : (isset($c['email']) ? $c['email'] : '')),
        'phone' => (string)(isset($c['sb_phone']) ? $c['sb_phone'] : (isset($c['phone']) ? $c['phone'] : '')),
        'mobile' => (string)(isset($c['mobile']) ? $c['mobile'] : ''),
        'tel' => (string)(isset($c['tel']) ? $c['tel'] : ''),
        'addr' => (!empty($c['addr']) && is_array($c['addr'])) ? $c['addr'] : null,
        // a company team member: bookings still run through the COMPANY's one
        // SimplyBook client above, but who is asking decides what they may do
        'member' => isset($ws['member']) ? strtolower((string)$ws['member']) : '',
        'mname' => (string)($c['org']['members'][strtolower((string)($ws['member'] ?? ''))]['name'] ?? ''),
        'mstaff' => (function() use ($c, $ws) {
            $mem = isset($ws['member']) ? strtolower((string)$ws['member']) : '';
            if ($mem === '') return false;
            require_once __DIR__ . '/pcm-team-lib.php';
            return team_visible_pcs($c, $mem) !== null;          // null = manager/director
        })(),
        'viewas' => !empty($ws['viewas']));   // an admin impersonating this customer (they vouch for the identity)
}

// Do the record name and the SimplyBook client name plausibly refer to the same person?
// Used to corroborate an email match so a MISTYPED email that happens to be ANOTHER customer's
// address cannot silently bind a key to a stranger's bookings. Deliberately lenient (shared
// name token >=3 chars, or one collapsed name contained in the other) to avoid false negatives
// like "Bob Smith" vs "Robert Smith", while still rejecting two unrelated people.
function names_corroborate($a, $b) {
    $na = trim(preg_replace('/\s+/', ' ', strtolower(preg_replace('/[^a-z ]/i', ' ', (string)$a))));
    $nb = trim(preg_replace('/\s+/', ' ', strtolower(preg_replace('/[^a-z ]/i', ' ', (string)$b))));
    if ($na === '' || $nb === '') return false;   // no name to corroborate -> refuse to link
    $ca = str_replace(' ', '', $na); $cb = str_replace(' ', '', $nb);
    if (strlen($ca) >= 4 && (strpos($cb, $ca) !== false || strpos($ca, $cb) !== false)) return true;
    $tb = explode(' ', $nb);
    foreach (explode(' ', $na) as $t) if (strlen($t) >= 3 && in_array($t, $tb, true)) return true;
    return false;
}

// Link a customer record to its SimplyBook client id using the TRUSTED email already stored
// on the record (set by staff at activation, or by a verified typed-code sign-in) - NEVER an
// email supplied in the request. Links ONLY on a single unambiguous exact-email match whose
// NAME also corroborates the record, never clobbers an existing link, and cools down failed
// lookups so an unmatchable record can't hammer SimplyBook. Returns the linked cid (0 = none).
// $force skips the cool-down (used right after a booking, when the SB client is freshly created).
// &$existed is set true if ANY SimplyBook client already owns this exact email (whether or not
// the name corroborated) - callers use it to avoid creating/attaching onto a stranger.
// $lenient: accept a SINGLE unambiguous exact-email client even if its name doesn't corroborate
// (used only when an admin is impersonating the customer in view-as and vouches for the identity).
function link_cid_from_email($ckey, $email, $force = false, &$existed = null, $lenient = false) {
    global $HAS_ADMIN;
    $existed = false;
    if (!$HAS_ADMIN || $ckey === '' || $email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) return 0;
    list($lk, $db) = db_open(); db_close($lk);
    if (!isset($db['customers'][$ckey])) return 0;
    $rec = $db['customers'][$ckey];
    if (!empty($rec['sb_client_id'])) return (int)$rec['sb_client_id'];   // already linked
    if (!$force && !empty($rec['sb_link_ts']) && (int)$rec['sb_link_ts'] > time() - 1800) return 0;  // tried recently, no match
    $recName = (string)(isset($rec['sb_name']) ? $rec['sb_name'] : (isset($rec['name']) ? $rec['name'] : ''));

    $r = sb_adm('getClientList', array($email, 20));
    // transient failure: we can't tell whether a client owns this email. Signal "assume one might"
    // (fail-safe) so a caller like ensure_client_id refuses to create/attach rather than risk a
    // duplicate client or, worse, deduping onto someone else. Don't cool down (it wasn't a real miss).
    if (sb_net($r) || !isset($r['result']) || !is_array($r['result'])) { $existed = true; return 0; }
    $want = strtolower(trim($email));
    $ids = array();
    foreach ($r['result'] as $cli) {
        $ce = strtolower(trim((string)(isset($cli['email']) ? $cli['email'] : '')));
        $id = (int)(isset($cli['id']) ? $cli['id'] : 0);
        if ($id > 0 && $ce !== '' && $ce === $want)
            $ids[$id] = array('name' => (string)(isset($cli['name']) ? $cli['name'] : ''),
                              'email' => $ce,
                              'phone' => (string)(isset($cli['phone']) ? $cli['phone'] : ''));
    }
    $existed = (count($ids) > 0);
    $mid = 0; $m = null;
    if (count($ids) === 1) {   // exactly one exact-email client...
        $ks = array_keys($ids); $cand = (int)$ks[0]; $cm = $ids[$ks[0]];
        if ($lenient || names_corroborate($recName, $cm['name'])) { $mid = $cand; $m = $cm; }   // ...whose name agrees (or admin vouches)
    }
    list($lk, $db) = db_open();
    if (isset($db['customers'][$ckey])) {
        $c =& $db['customers'][$ckey];
        if (!empty($c['sb_client_id'])) { $mid = (int)$c['sb_client_id']; }   // a concurrent request linked it first
        elseif ($mid > 0) {
            $c['sb_client_id'] = $mid;
            if ($m['name'] !== '' && empty($c['sb_name'])) $c['sb_name'] = $m['name'];
            if ($m['email'] !== '' && empty($c['sb_email'])) $c['sb_email'] = $m['email'];
            if ($m['phone'] !== '' && empty($c['sb_phone'])) $c['sb_phone'] = $m['phone'];
            unset($c['sb_link_ts']);
            db_save($db);
        } else {
            $c['sb_link_ts'] = time();   // no confident match - cool down further lookups
            db_save($db);
        }
    }
    db_close($lk);
    return $mid;
}

// Get a SimplyBook client id to book against: the record's linked/matched client, or a NEW
// one created from the customer's VERIFIED identity (name/email/phone from their own record).
// Booking via the ADMIN method with a client id is immune to the "Client authorization
// required" company config that rejects public (unauthenticated) booking. Returns 0 only if
// we genuinely cannot obtain one. Stores a freshly-created id on the record for next time.
function ensure_client_id($ckey, $snap) {
    global $HAS_ADMIN;
    $GLOBALS['nc_why'] = '';
    if ((int)$snap['cid'] > 0) return (int)$snap['cid'];
    if (!$HAS_ADMIN) { $GLOBALS['nc_why'] = 'no_admin'; return 0; }
    $existed = false;
    $lenient = !empty($snap['viewas']);   // an admin impersonating this customer vouches for the identity
    if ($snap['email'] !== '') {
        $linked = link_cid_from_email($ckey, $snap['email'], true, $existed, $lenient);
        if ($linked > 0) return $linked;   // a client whose email AND name match (or, in view-as, a single exact-email match)
    } else { $GLOBALS['nc_why'] = 'no_email'; }
    // A client already owns this email but its NAME did not corroborate our record (and this isn't a
    // vouched view-as), or there are several - refuse rather than book onto a possible stranger.
    if ($existed) { $GLOBALS['nc_why'] = 'email_matches_a_different_or_ambiguous_client'; return 0; }
    // No client owns this email yet - create one from the customer's own record identity.
    $cd = array('name' => $snap['name'] !== '' ? $snap['name'] : $snap['email']);
    if ($cd['name'] === '') { $GLOBALS['nc_why'] = 'no_name'; return 0; }
    if ($snap['email'] !== '') $cd['email'] = $snap['email'];
    /* The number SimplyBook gets: the mobile the customer keeps in their own
       portal first (most recently typed by the person who owns it, and the one
       a "we're on our way" text reaches), then their landline, then whatever we
       already held. Display form, because a human reads it in the diary. */
    require_once __DIR__ . '/pcm-phone-lib.php';
    $sbPhone = '';
    foreach (array('mobile', 'tel') as $pk)
        if ($sbPhone === '' && !empty($snap[$pk])) $sbPhone = pcm_phone_display((string)$snap[$pk]);
    if ($sbPhone === '') $sbPhone = (string)$snap['phone'];
    if ($sbPhone !== '') $cd['phone'] = $sbPhone;
    // Give SimplyBook the address the customer gave US, so the diary card shows it
    // from SimplyBook's own record instead of relying on our fallback for ever.
    $sbAddr = addr_for_sb(isset($snap['addr']) ? $snap['addr'] : null);
    foreach ($sbAddr as $ak => $av) $cd[$ak] = $av;
    $ac = sb_add_client_smart($cd, $cfFilled);
    if (sb_net($ac) || empty($ac['result'])) {
        $GLOBALS['nc_why'] = 'create_failed' . (isset($ac['error']['message']) ? ':' . substr(preg_replace('/[^\x20-\x7E]/', '', (string)$ac['error']['message']), 0, 80) : '');
        sb_alarm('creating the customer for a BOOKING (addClient) failed', sb_why($ac)
            . ' [sent: name' . (isset($cd['email']) ? '+email' : '') . (isset($cd['phone']) ? '+phone' : '')
            . (count($sbAddr) ? '+address' : '')
            . (count($cfFilled) ? '; auto-filled ' . count($cfFilled) . ' required custom field(s)' : '') . ']'
            . "\n> Built-in requirements: " . sb_required_client_fields()
            . "\n> Raw refusal: " . substr(preg_replace('/[^\x20-\x7E]/', '', json_encode(isset($ac['error']) ? $ac['error'] : $ac)), 0, 220));
        return 0;
    }
    if (!empty($cfFilled)) pcm_slack_say(':information_source: New client created with ' . count($cfFilled)
        . ' required custom field(s) auto-filled as "-" - complete them on the first visit.');
    $cid = (int)$ac['result'];
    if ($cid > 0 && $ckey !== '') {
        list($lk, $db) = db_open();
        if (isset($db['customers'][$ckey]) && empty($db['customers'][$ckey]['sb_client_id'])) {
            $db['customers'][$ckey]['sb_client_id'] = $cid;
            unset($db['customers'][$ckey]['sb_link_ts']);
            db_save($db);
        }
        db_close($lk);
    }
    return $cid;
}

function stamp_next($ts, $pretty) {
    global $key;
    list($lk, $db) = db_open();
    if (isset($db['customers'][$key])) {
        $c =& $db['customers'][$key];
        if (empty($c['next_ts']) || $ts <= $c['next_ts'] || $c['next_ts'] < time()) { $c['next'] = $pretty; $c['next_ts'] = $ts; }
        db_save($db);
    }
    db_close($lk);
}

function parse_start($b) {
    foreach (array('start_date_time', 'start_datetime', 'start_date') as $k) if (!empty($b[$k])) {
        $s = (string)$b[$k];
        if (strlen($s) <= 10 && !empty($b['start_time'])) $s .= ' ' . $b['start_time'];
        return $s;
    }
    return '';
}

// ---------------------------------------------------------------- actions

// ---------------------------------------------------------------- PUBLIC (no sign-in)
// Read-only endpoints powering our OWN booking page at /book-service/. Deliberately
// the ONLY unauthenticated surface: the booking itself still goes through the proven
// join -> verifycode -> book chain, so no stranger can put junk in the diary without
// proving they own an inbox. Both are rate-limited per IP because they reach
// SimplyBook's API, and a scraper hammering them would burn the API quota that real
// bookings depend on.
$PUBRATE = __DIR__ . '/pcm-pubrate.json';
function pub_rate($bucket, $max, $win) {
    global $PUBRATE;
    $ip = isset($_SERVER['REMOTE_ADDR']) ? (string)$_SERVER['REMOTE_ADDR'] : '';
    $k = sha1($bucket . '|' . $ip);
    $lk = @fopen($PUBRATE . '.lock', 'c'); if ($lk) @flock($lk, LOCK_EX);
    $d = cache_load($PUBRATE);
    foreach ($d as $kk => $vv) if ((isset($vv['ts']) ? $vv['ts'] : 0) < time() - $win) unset($d[$kk]);
    // hard ceiling: IP rotation must never grow this file into a rewrite-the-world DoS
    if (count($d) > 4000) $d = array();
    $rec = isset($d[$k]) && is_array($d[$k]) ? $d[$k] : array('n' => 0, 'ts' => time());
    if ((isset($rec['ts']) ? $rec['ts'] : 0) < time() - $win) $rec = array('n' => 0, 'ts' => time());
    $rec['n'] = (isset($rec['n']) ? $rec['n'] : 0) + 1;
    $d[$k] = $rec;
    cache_save($PUBRATE, $d);
    if ($lk) { @flock($lk, LOCK_UN); @fclose($lk); }
    return $rec['n'] <= $max;
}

// Optional publish control: define $SB_PUBLIC_EVENTS = array(12,15,...) in the server-only
// pcm-simplybook.php to restrict what the PUBLIC page offers (the app/portal are unaffected).
// Leave it undefined and everything bookable in SimplyBook is offered, as before.
function pub_allowed($id) {
    global $SB_PUBLIC_EVENTS;
    if (!isset($SB_PUBLIC_EVENTS) || !is_array($SB_PUBLIC_EVENTS) || !count($SB_PUBLIC_EVENTS)) return true;
    return in_array((int)$id, array_map('intval', $SB_PUBLIC_EVENTS), true);
}

// Admin-only diagnostic: ask SimplyBook itself what it wants on a client record.
// Exists because "Value is required and can't be empty" names no field, and guessing
// has already cost hours. Password-gated, read-only, returns raw shapes.
//   POST {"action":"sbdiag","s":"<PC Manager admin password>"}
if ($action === 'sbdiag') {
    $sec = __DIR__ . '/pcm-admin-secret.php';
    $given = (string)(isset($in['s']) ? $in['s'] : '');
    $okAdm = false;
    if ($given !== '' && is_readable($sec)) { require $sec; if (!empty($PCM_ADMIN_PASS) && hash_equals($PCM_ADMIN_PASS, $given)) $okAdm = true; }
    if (!$HAS_ADMIN) fail('not_configured');
    if (!pub_rate('diag', 10, 600)) fail('busy');
    $probe = array();
    // CONFIG ONLY without the admin pass: which fields the account requires is not
    // sensitive (the public booking widget reveals it anyway) - and being able to read
    // it directly ends the guess-relay-guess loop that burned the owner's weekend.
    // WHICH SERVICES ARE SET UP AS RECURRING? getRecurringSettings returns false for a
    // normal service and a settings object for a recurring one. This is the question that
    // cost us twelve diary slots from one customer click - answer it from the API rather
    // than hunting through the SimplyBook UI.
    $rec = array();
    $evs = sb_adm('getEventList', array());
    if (!sb_net($evs) && isset($evs['result']) && is_array($evs['result'])) {
        foreach ($evs['result'] as $eid => $ev) {
            $enm = is_array($ev) && isset($ev['name']) ? (string)$ev['name'] : (string)$eid;
            $rs = sb_adm('getRecurringSettings', array((int)$eid));
            if (sb_net($rs)) { $rec[$enm] = 'network error'; continue; }
            $rv = isset($rs['result']) ? $rs['result'] : false;
            $rec[$enm] = (!$rv || $rv === false)
                ? 'normal - one booking per click'
                : ('RECURRING -> ' . substr(json_encode($rv), 0, 200));
        }
    }
    $probe['recurring_services'] = $rec;

    foreach (array('require_fields', 'client_fields', 'client_required_fields') as $p) {
        $r = sb_adm('getCompanyParam', array($p));
        if (sb_net($r)) { $probe[$p] = 'network error'; continue; }
        if (isset($r['result'])) $probe[$p] = $r['result'];
        else $probe[$p] = 'ERR: ' . (isset($r['error']['message']) ? substr(preg_replace('/[^\x20-\x7E]/', '', (string)$r['error']['message']), 0, 120) : 'no result');
    }
    // a dry-run addClient against a clearly-synthetic identity surfaces the EXACT
    // rejection a real customer hits (and if it ever succeeds, the record is named so
    // staff recognise and remove it - creation implies the blocker is FIXED)
    $t = 'apitest+' . date('His') . '@365techies.co.uk';
    $dry = sb_add_client_smart(array('name' => 'API TEST - delete me', 'email' => $t, 'phone' => '01202775566'), $dryFilled);
    $probe['_dry_run_addClient'] = sb_net($dry) ? 'network error'
        : (isset($dry['result']) ? ('SUCCEEDED (client id ' . (int)$dry['result'] . ', auto-filled ' . count($dryFilled)
            . ' required custom field(s) - delete the "API TEST" client in SimplyBook)')
        : ('REFUSED after auto-filling ' . count($dryFilled) . ': ' . substr(preg_replace('/[^\x20-\x7E]/', '', json_encode($dry['error'])), 0, 220)));
    // customer PII stays behind the admin pass
    if ($okAdm) {
        $sample = sb_adm('getClientList', array('', 1));
        $probe['_sample_existing_client'] = (isset($sample['result'][0]) ? $sample['result'][0] : (isset($sample['error']) ? 'ERR' : 'none'));
    }
    out(array('ok' => true, 'admin' => $okAdm, 'probe' => $probe));
}

if ($action === 'pubservices') {
    if (!pub_rate('svc', 90, 600)) fail('busy');
    $list = array();
    foreach (sb_services() as $sv) if (pub_allowed($sv['id']))
        $list[] = array('id' => $sv['id'], 'name' => $sv['name'], 'mins' => $sv['mins'],
                        'desc' => (string)(isset($sv['desc']) ? $sv['desc'] : ''));
    out(array('ok' => true, 'services' => $list));   // never expose unit_map to the public
}

if ($action === 'pubslots') {
    if (!pub_rate('slots', 90, 600)) fail('busy');
    $eventId = (int)(isset($in['eventId']) ? $in['eventId'] : 0);
    if ($eventId <= 0) fail('no_service');
    // the service id must be one WE offer - never let a caller probe arbitrary ids
    $known = false;
    foreach (sb_services() as $sv) if ($sv['id'] === $eventId && pub_allowed($sv['id'])) { $known = true; break; }
    if (!$known) fail('no_service');
    // window is fixed server-side so a caller can neither widen it into an expensive
    // SimplyBook query nor vary it to walk past the cache
    $days = 21;
    $from = date('Y-m-d');
    $to = date('Y-m-d', time() + 86400 * $days);
    $ck = 'pub' . $eventId;
    $c = cache_load($CACHE);
    // isset, not !empty: a fully-booked service returns an EMPTY list, and treating that as
    // "no cache" would hit SimplyBook on every single page view
    if (isset($c[$ck]['data']) && is_array($c[$ck]['data']) && (time() - (isset($c[$ck]['ts']) ? $c[$ck]['ts'] : 0)) < 90 && empty($in['fresh']))
        out(array('ok' => true, 'days' => $c[$ck]['data'], 'cached' => true));
    $units = sb_units_for($eventId);
    if (!count($units)) fail('sb_unavailable');
    $r = sb_pub('getStartTimeMatrix', array($from, $to, $eventId, $units, 1));
    if (sb_net($r)) fail('sb_unavailable');
    $matrix = isset($r['result']) && is_array($r['result']) ? $r['result'] : array();
    $out = array();
    foreach ($matrix as $d => $times) {
        if (!is_array($times) || !count($times)) continue;
        $tt = array();
        foreach ($times as $t) $tt[] = substr((string)$t, 0, 5);
        $ts = strtotime($d);
        $out[] = array('d' => $d, 'n' => $ts ? date('D j M', $ts) : $d, 't' => $tt);
    }
    $c = cache_load($CACHE);   // re-read: sb_pub may have refreshed the token cache
    $c[$ck] = array('data' => $out, 'ts' => time());
    cache_save($CACHE, $c);
    out(array('ok' => true, 'days' => $out));
}

// ---------------------------------------------------------------- free membership join
// Two-step, passwordless: action=join sends a 6-digit code (email + optional SMS);
// action=verifycode proves inbox/phone ownership, then creates/reuses the SimplyBook
// client SILENTLY (getClientList first - SB duplicate clients break sign-in) and a free
// customer record, and mints a long-lived device session. We NEVER email sign-in links -
// a typed code is the anti-scam-friendly pattern our brand teaches.
$JOINCODES = __DIR__ . '/pcm-joincodes.json';

// minimal authenticated-SMTP sender (server-only api/pcm-smtp.php: $SMTP_HOST,$SMTP_PORT,
// $SMTP_USER,$SMTP_PASS,$SMTP_FROM). Falls back to PHP mail() if not configured yet.
function send_join_email($to, $code) {
    $subject = 'Your 365 Techies sign-in code: ' . $code;
    $body = "Hello,\r\n\r\n"
          . "Your 365 Techies sign-in code is:\r\n\r\n" . $code . "\r\n\r\n"
          . "Type it into the page you have open. It works for the next 30 minutes.\r\n\r\n"
          . "A note on staying safe: we will NEVER email you a link to sign in - only a code\r\n"
          . "like this one, and only when you have just asked for it. Never read this code to\r\n"
          . "anyone who rings you.\r\n\r\n"
          . "Didn't ask for a code? You can safely ignore this email.\r\n\r\n"
          . "365 Techies - family-run IT support in Bournemouth since 1995\r\n"
          . "01202 775566 - 365techies.co.uk\r\n";
    // NOTE: implicit-TLS only (port 465, SiteGround's default). Port 587/STARTTLS is NOT
    // supported by this minimal client - configure 465 in pcm-smtp.php.
    $cfg = __DIR__ . '/pcm-smtp.php';
    if (is_readable($cfg)) {
        include $cfg;
        if (!empty($SMTP_HOST) && !empty($SMTP_USER) && !empty($SMTP_PASS)) {
            $from = !empty($SMTP_FROM) ? $SMTP_FROM : $SMTP_USER;
            $port = !empty($SMTP_PORT) ? intval($SMTP_PORT) : 465;
            $fp = @stream_socket_client('ssl://' . $SMTP_HOST . ':' . $port, $en, $es, 8);
            if (!$fp) error_log('pcm-booking: SMTP connect failed (' . $SMTP_HOST . ':' . $port . ' implicit TLS; 587/STARTTLS unsupported, use 465): ' . $es . ' - falling back to mail()');
            if ($fp) {
                stream_set_timeout($fp, 10);   // a stalled server must never hang the join request
                $dead = false;
                $say = function($cmd) use ($fp, &$dead) {
                    if ($dead) return '';
                    if ($cmd !== null) fwrite($fp, $cmd . "\r\n");
                    $line = ''; $n = 0;
                    while (($l = fgets($fp, 512)) !== false) {
                        $md = stream_get_meta_data($fp);
                        if (!empty($md['timed_out'])) { $dead = true; return ''; }
                        $line = $l;
                        if (strlen($l) < 4 || $l[3] !== '-') break;
                        if (++$n > 50) break;   // runaway multiline guard
                    }
                    $md = stream_get_meta_data($fp);
                    if (!empty($md['timed_out'])) { $dead = true; return ''; }
                    return $line;
                };
                $ok = true;
                $say(null);
                $ok = $ok && strpos($say('EHLO 365techies.co.uk'), '250') === 0;
                $ok = $ok && strpos($say('AUTH LOGIN'), '334') === 0;
                $ok = $ok && strpos($say(base64_encode($SMTP_USER)), '334') === 0;
                $ok = $ok && strpos($say(base64_encode($SMTP_PASS)), '235') === 0;
                $ok = $ok && strpos($say('MAIL FROM:<' . $from . '>'), '250') === 0;
                $ok = $ok && strpos($say('RCPT TO:<' . $to . '>'), '250') === 0;
                $ok = $ok && strpos($say('DATA'), '354') === 0;
                if ($ok) {
                    $msg = 'Date: ' . date('r') . "\r\n"
                         . 'Message-ID: <' . bin2hex(random_bytes(8)) . '.' . time() . "@365techies.co.uk>\r\n"
                         . 'From: 365 Techies <' . $from . ">\r\n"
                         . 'To: <' . $to . ">\r\n"
                         . 'Subject: ' . $subject . "\r\n"
                         . "MIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n"
                         . preg_replace('/^\./m', '..', $body) . "\r\n.";   // dot-stuffing per RFC 5321
                    $ok = strpos($say($msg), '250') === 0;
                }
                if (!$dead) @fwrite($fp, "QUIT\r\n");   // fire-and-forget - never wait on a dying server
                fclose($fp);
                if ($ok) {   // 7 Oct 2026: the portal's Sent emails (pcm-sentlog-lib.php), after the send
                    try { if (is_readable(__DIR__ . '/pcm-sentlog-lib.php')) { require_once __DIR__ . '/pcm-sentlog-lib.php'; sentlog_add($to, 'Your 365 Techies sign-in code', 'A sign-in code for the 365 portal and 365 PC Manager (the code itself is not kept here).', 'sign-in code'); } } catch (Throwable $e) { }
                    return true;
                }
            }
        }
    }
    // Fallback: local MTA. The 5th argument is NOT optional in practice - without it the
    // envelope sender (Return-Path) defaults to the hosting account, so SPF authenticates
    // the wrong domain and Gmail/Outlook junk or reject the message. This is the sign-in
    // code email: if it doesn't arrive, nobody can sign in or book at all.
    // Sending identity kept the same as every other email we send (info@), rather than a
    // no-reply address - one consistent sender builds domain reputation, and a customer
    // replying to a sign-in problem should reach a mailbox someone reads.
    $hdr = "From: 365 Techies <info@365techies.co.uk>\r\nReply-To: info@365techies.co.uk\r\n"
         . 'Message-ID: <' . bin2hex(random_bytes(8)) . '.' . time() . "@365techies.co.uk>\r\n"
         . "MIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8";
    $sent = @mail($to, $subject, $body, $hdr, '-finfo@365techies.co.uk');
    if ($sent) { try { if (is_readable(__DIR__ . '/pcm-sentlog-lib.php')) { require_once __DIR__ . '/pcm-sentlog-lib.php'; sentlog_add($to, 'Your 365 Techies sign-in code', 'A sign-in code for the 365 portal and 365 PC Manager (the code itself is not kept here).', 'sign-in code'); } } catch (Throwable $e) { } }
    return $sent;
}

function send_join_sms($mobile, $code) {
    $cfg = __DIR__ . '/pcm-textmagic.php';
    if (!is_readable($cfg)) return false;
    include $cfg; // $TM_USER, $TM_KEY
    if (empty($TM_USER) || empty($TM_KEY)) return false;
    $p = preg_replace('/[^0-9]/', '', (string)$mobile);
    if (substr($p, 0, 2) === '07') $p = '44' . substr($p, 1);
    if (!preg_match('/^447[0-9]{9}$/', $p)) return false;
    $ch = curl_init('https://rest.textmagic.com/api/v2/messages');
    curl_setopt_array($ch, array(CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10,
        CURLOPT_HTTPHEADER => array('X-TM-Username: ' . $TM_USER, 'X-TM-Key: ' . $TM_KEY, 'Content-Type: application/x-www-form-urlencoded'),
        CURLOPT_POSTFIELDS => http_build_query(array('text' => '365 Techies: your sign-in code is ' . $code . '. It works for 30 minutes. We never text sign-in links - only codes. Never read it to a caller.', 'phones' => $p))));
    $r = curl_exec($ch); $c = curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
    return $r !== false && $c >= 200 && $c < 300;
}

/* ---------------------------------------------------------------------------
   PORTAL WELCOME - queue the one-off "here is your link" email the first time a
   customer's portal session is ever created. In practice that is Steve or David
   sitting with them, setting the portal up and dropping a bookmark in their
   browser; the email is what they still have next week when they have forgotten
   where it lives.

   Called ONLY from the two genuine sign-in paths (verifycode, signin). It is
   deliberately NOT called from action=viewas, which mints a session for staff
   convenience - welcoming a customer because a technician opened their account
   would be both wrong and baffling.

   Once-only is owned by the queue (wc_record is idempotent on $ckey and keeps a
   'sent' stub for ever). The 'welcomed' stamp here is only a fast path so we
   stop re-opening that queue on every later sign-in. If the library fails to
   load we stamp nothing and simply try again next time.

   $c is by reference so the stamp lands on the record the caller is about to
   db_save() - no second write, no second lock.
   --------------------------------------------------------------------------- */
function pcm_welcome_maybe(&$c, $ckey, $email, $name) {
    $email = strtolower(trim((string)$email));
    if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) return;

    /* A BARE STAMP IS NOT EVIDENCE - verify it against the queue.
       ----------------------------------------------------------
       This used to `return` on !empty($c['welcomed']) alone, and that turned the
       queue bug into a permanent one: every customer the broken code stamped was
       locked out of this function for ever, so signing them in again did nothing
       at all. On 30 Jul 2026 Steve sat with a customer, Outlook open, re-signing
       her in and waiting for an email that could never come.

       The queue is the record of truth - wc_record keeps a stub for ever once an
       address has been handled. So if a stamp has no entry behind it, the stamp is
       wrong and we carry on and queue properly. That makes a re-sign-in self-
       healing: nobody has to know a repair tool exists.

       Cost is one small locked read on a sign-in that carries a stamp. The stamp
       was only ever a micro-optimisation to avoid this read, and correctness beats
       it - especially now we know the stamp can lie. */
    if (!empty($c['welcomed'])) {
        if (!function_exists('rvq_open')) return;        // cannot verify - leave it alone
        list($vlk, $vq) = rvq_open();
        if (!$vlk) return;                               // cannot verify - try again next time
        $seen = isset($vq['wc'][$ckey]);
        rvq_close($vlk);
        if ($seen) return;                               // genuinely handled - nothing to do
        unset($c['welcomed']);                           // the stamp was a lie; re-earn it below
    }
    // The library is loaded at TOP LEVEL by this file - see the note there. Do NOT
    // include it here: that is the bug that made this function silently do nothing.
    if (!function_exists('wc_record')) return;          // library missing - retry on the next sign-in
    // ONLY stamp when the customer is genuinely in the queue. This used to be
    // unconditional, and on 28 Jul 2026 that cost a real customer his email: the trigger
    // fired at 17:44, wc_record failed, and the stamp went on anyway - marking him as
    // welcomed for ever with nothing queued and nothing logged. A stamp is a claim that
    // something happened; never make that claim on the strength of a call you did not check.
    $q = wc_record($ckey, $email, $name);
    if ($q === true || $q === 'exists') $c['welcomed'] = time();

    /* SEND IT NOW, rather than leaving it for a cron to find.
       ------------------------------------------------------
       Queueing alone made the promise "an email about five minutes after you sign
       in" depend on a cron nobody can see. On 30 Jul 2026 Steve signed several
       customers in and no email arrived: the SiteGround 5-minute job could not be
       shown to be running, and the only drain that provably still fires is the
       2-hourly GitHub job - which also DROPS runs (08:17 fired on neither 29 nor
       30 Jul). A 2-hourly job that skips can never keep a 5-minute promise.

       So the sign-in that creates the need now also does the sending, and the
       crons go back to being the retry net they were meant to be.

       Three things make this safe to do on a customer-facing request:
       - register_shutdown_function, so it runs AFTER db_save()/db_close(). Sending
         inside the caller's lock would hold pcm-data.json open across an SMTP
         conversation and stall every other portal request behind it.
       - fastcgi_finish_request() first, so the customer's sign-in response is
         already flushed and their wait is unchanged.
       - catch (Throwable), because a mail failure must never turn a successful
         sign-in into an error. wc_process is already locked, capped and
         quiet-hours aware, so a concurrent cron tick cannot double-send. */
    if ($q === true && !defined('PCM_WC_KICKED')) {
        define('PCM_WC_KICKED', 1);
        register_shutdown_function(function () {
            if (function_exists('fastcgi_finish_request')) @fastcgi_finish_request();
            try {
                if (function_exists('wc_process')) wc_process(2);
            } catch (Throwable $e) {
                // swallowed on purpose - the cron will retry it
            }
        });
    }
}

/* ---------------------------------------------------------------------------
   BACKFILL - the launch email for customers who were already signed in.

   The automatic welcome cannot reach them. It fires when a portal session is
   CREATED, and theirs already exists and slides for a year on every visit, so
   it will never fire again for them. This is the one-off that closes that gap.

   DRY RUN BY DEFAULT. Nothing is queued and nothing is sent unless send=1 is
   passed explicitly. Deliberate: this is the only thing here that touches every
   customer at once, and it should take two decisions, not one.

   Recipients are customers who ALREADY HAVE A PORTAL SESSION - the literal
   answer to "everyone I have logged in". Filtered further by tier, because the
   copy talks about service visits and Direct Debits: it is written for support
   customers and would puzzle a free member.

   Send rate is the queue's, not ours: 5 per 5-minute cron tick, so ~60/hour.
   That is deliberately gentle on a sending reputation we have only just proven.

     action=wcbackfill, s=<admin pass>            -> dry run, counts only
     action=wcbackfill, s=<admin pass>, send=1    -> queue them
     ...add tier=all to include free members too
   --------------------------------------------------------------------------- */
if ($action === 'wcbackfill') {
    $sec = __DIR__ . '/pcm-admin-secret.php';
    $given = (string)(isset($in['s']) ? $in['s'] : '');
    $okAdm = false;
    if ($given !== '' && is_readable($sec)) { require $sec; if (!empty($PCM_ADMIN_PASS) && hash_equals($PCM_ADMIN_PASS, $given)) $okAdm = true; }
    if (!$okAdm) fail('denied');
    if (!pub_rate('wcbf', 6, 600)) fail('busy');

    $proOnly = !(isset($in['tier']) && $in['tier'] === 'all');
    $doSend  = !empty($in['send']);

    list($lk, $db) = db_open();
    // who has a portal session? the websessions table is the record of "logged in"
    $signedIn = array();
    if (!empty($db['websessions']) && is_array($db['websessions'])) {
        foreach ($db['websessions'] as $wv) {
            if (!is_array($wv) || !empty($wv['viewas'])) continue;   // staff impersonation is not a customer
            $k = isset($wv['key']) ? (string)$wv['key'] : '';
            if ($k !== '') $signedIn[$k] = true;
        }
    }

    $stats = array('signed_in' => count($signedIn), 'eligible' => 0, 'queued' => 0,
                   'skip_already' => 0, 'skip_no_email' => 0, 'skip_tier' => 0, 'skip_missing' => 0,
                   'repaired' => 0);

    /* repair=1 : treat a 'welcomed' stamp with NO queue entry behind it as a lie.
       -------------------------------------------------------------------------
       Until 30 Jul 2026 the automatic welcome stamped customers while writing
       nothing to the queue (the include-scope bug documented at the top of this
       file), so a stamp is not by itself evidence anyone was emailed. The queue
       IS the evidence: wc_record keeps a stub for ever once an address has been
       handled, so anyone genuinely emailed has an entry and is still skipped by
       the 'exists' branch below. That makes this safe to run repeatedly - it can
       only ever pick up customers the queue has never heard of. */
    $repair = !empty($in['repair']);
    $known = array();
    if ($repair && function_exists('rvq_open')) {
        list($qlk, $qq) = rvq_open();
        if ($qlk) { $known = isset($qq['wc']) && is_array($qq['wc']) ? $qq['wc'] : array(); rvq_close($qlk); }
        else fail('queue_locked');
    }

    $sample = array();
    foreach (array_keys($signedIn) as $k) {
        if (!isset($db['customers'][$k])) { $stats['skip_missing']++; continue; }
        $c =& $db['customers'][$k];
        $bogus = $repair && !empty($c['welcomed']) && !isset($known[$k]);
        if ($bogus) $stats['repaired']++;
        if (!empty($c['welcomed']) && !$bogus) { $stats['skip_already']++; unset($c); continue; }
        if ($proOnly && (!isset($c['tier']) || $c['tier'] !== 'pro')) { $stats['skip_tier']++; unset($c); continue; }
        $em = '';
        foreach (array('sb_email', 'email') as $f) {
            if (!empty($c[$f]) && filter_var($c[$f], FILTER_VALIDATE_EMAIL)) { $em = strtolower(trim($c[$f])); break; }
        }
        if ($em === '') { $stats['skip_no_email']++; unset($c); continue; }
        $stats['eligible']++;
        if (count($sample) < 8) $sample[] = $em;
        if ($doSend) {
            // the library is loaded at TOP LEVEL by this file - do not include it here,
            // that is precisely the scope bug this whole action exists to clean up
            if (function_exists('wc_record')) {
                /* Which copy is truthful for this person? The welcome opens "lovely to
                   get you set up just now", so it is only honest for someone signed in
                   very recently. A repair of an older stamp gets the launch copy, which
                   makes no claim about when. Anyone found by the normal backfill (no
                   stamp at all) has been signed in for a while - launch, as before. */
                $stampAge = !empty($c['welcomed']) ? (time() - (int)$c['welcomed']) : PHP_INT_MAX;
                $kind = ($bogus && $stampAge < 172800) ? 'welcome' : 'launch';
                // only stamp on a confirmed queue entry - see pcm_welcome_maybe
                $r = wc_record($k, $em, isset($c['name']) ? $c['name'] : '', $kind);
                if ($r === true || $r === 'exists') {
                    $c['welcomed'] = time();      // never also send them the "just now" welcome
                    $stats['queued']++;
                }
            }
        }
        unset($c);
    }
    if ($doSend && $stats['queued']) db_save($db);
    db_close($lk);

    out(array('ok' => true, 'mode' => $doSend ? 'QUEUED' : 'dry-run (nothing sent)',
              'tier' => $proOnly ? 'support customers only' : 'everyone with a portal session',
              'stats' => $stats, 'sample_recipients' => $sample,
              'note' => $doSend
                  ? 'Queued. They drain at 5 per 5-minute cron tick (~60/hour) and each one pings Slack.'
                  : 'Nothing was queued or sent. Re-send this with send=1 to go ahead.'));
}

if ($action === 'join') {
    $email = strtolower(trim((string)(isset($in['email']) ? $in['email'] : '')));
    if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) fail('bad_email');
    $mobile = preg_replace('/[^0-9+]/', '', (string)(isset($in['mobile']) ? $in['mobile'] : ''));
    // A number we can't text is NOT an error: the code always goes by email, and hard-failing
    // here would dead-end every customer who typed a landline (the web booking page's most
    // likely visitor). Unusable number -> simply no SMS.
    if ($mobile !== '' && !preg_match('/^(07[0-9]{9}|\+?447[0-9]{9})$/', $mobile)) $mobile = '';
    // texting costs money and a caller-chosen number must never be texted unasked:
    // only text when the caller explicitly asked for it
    if (empty($in['sms'])) $mobile = '';
    // STAFF emails get their code by EMAIL ONLY. The mobile is attacker-suppliable, and the
    // whole staff-code design rests on "only the allow-listed inbox can read the code" -
    // texting it to a caller-chosen number would hand out staff sessions.
    global $SB_STAFF;
    $allowSt = (isset($SB_STAFF) && is_array($SB_STAFF)) ? array_map('trim', array_map('strtolower', $SB_STAFF)) : array();
    if (in_array($email, $allowSt, true)) $mobile = '';
    // A TYPED mobile is only honoured for a genuinely NEW email. If the email already has a
    // customer record, texting a caller-chosen number would let a stranger claim that account
    // - so existing identities get SMS codes ONLY on the number we already hold for them.
    $storedPhone = ''; $isExisting = false;
    if ($mobile !== '' || !empty($in['sms'])) {
        list($lkJ, $dbJ) = db_open(); db_close($lkJ);
        foreach ((isset($dbJ['customers']) ? $dbJ['customers'] : array()) as $cJ) {
            if (!empty($cJ['merged_into'])) continue;
            $em2 = strtolower(trim((string)(isset($cJ['sb_email']) ? $cJ['sb_email'] : (isset($cJ['email']) ? $cJ['email'] : ''))));
            if ($em2 !== '' && $em2 === $email) {
                $isExisting = true;
                $storedPhone = (string)(isset($cJ['sb_phone']) ? $cJ['sb_phone'] : (isset($cJ['phone']) ? $cJ['phone'] : ''));
                break;
            }
        }
        if ($isExisting) $mobile = $storedPhone;   // stored number or nothing - never a typed one
        else if ($mobile === '' && !empty($in['sms'])) $mobile = '';   // new email + sms requested but no number typed
    }
    // throttle: max 4 codes per email per hour + the shared per-ip/email attempt throttle
    // throttled? If a still-valid code already exists for this email, say so - the page
    // then goes straight to the code box instead of dead-ending ("type the one we sent you")
    $have_code = false;
    $jcPeek = cache_load($JOINCODES);
    if (isset($jcPeek[sha1($email)]['ts']) && $jcPeek[sha1($email)]['ts'] > time() - 1800
        && (isset($jcPeek[sha1($email)]['tries']) ? $jcPeek[sha1($email)]['tries'] : 0) < 6) $have_code = true;
    $tkey = sha1('join|' . (isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '') . '|' . $email);
    $tlk = @fopen($THROTTLE . '.lock', 'c'); if ($tlk) @flock($tlk, LOCK_EX);
    $th = cache_load($THROTTLE);
    foreach ($th as $k2 => $v2) if ((isset($v2['ts']) ? $v2['ts'] : 0) < time() - 3600) unset($th[$k2]);
    if (isset($th[$tkey]) && (isset($th[$tkey]['n']) ? $th[$tkey]['n'] : 0) >= 6) { cache_save($THROTTLE, $th); if ($tlk) { @flock($tlk, LOCK_UN); @fclose($tlk); } out(array('ok' => false, 'error' => 'throttled', 'have_code' => $have_code)); }
    $th[$tkey] = array('n' => (isset($th[$tkey]['n']) ? $th[$tkey]['n'] : 0) + 1, 'ts' => time());
    cache_save($THROTTLE, $th); if ($tlk) { @flock($tlk, LOCK_UN); @fclose($tlk); }

    $code = (string)random_int(100000, 999999);
    $jlk = @fopen($JOINCODES . '.lock', 'c'); if ($jlk) @flock($jlk, LOCK_EX);   // serialise read-modify-write
    $jc = cache_load($JOINCODES);
    foreach ($jc as $k2 => $v2) if ((isset($v2['ts']) ? $v2['ts'] : 0) < time() - 86400) unset($jc[$k2]);
    // IP-independent caps (the throttle above is per-ip and rotatable): max 8 codes per
    // email per day, and max 3 SMS per mobile per hour (cost + nuisance control)
    $ek0 = sha1($email);
    $sent24 = isset($jc[$ek0]['sent']) && is_array($jc[$ek0]['sent']) ? $jc[$ek0]['sent'] : array();
    $sent24 = array_values(array_filter($sent24, function($t){ return $t > time() - 86400; }));
    if (count($sent24) >= 12) { if ($jlk) { @flock($jlk, LOCK_UN); @fclose($jlk); } out(array('ok' => false, 'error' => 'throttled', 'have_code' => $have_code)); }
    $sent24[] = time();
    if ($mobile !== '') {
        $mk = 'm' . sha1(preg_replace('/[^0-9]/','',$mobile));
        $ms = isset($jc[$mk]['sent']) && is_array($jc[$mk]['sent']) ? $jc[$mk]['sent'] : array();
        $ms = array_values(array_filter($ms, function($t){ return $t > time() - 3600; }));
        if (count($ms) >= 3) $mobile = '';   // stop texting, still email
        else { $ms[] = time(); $jc[$mk] = array('sent' => $ms, 'ts' => time()); }
    }
    $jc[$ek0] = array('h' => hash('sha256', $code), 'ts' => time(), 'tries' => 0, 'sent' => $sent24);
    cache_save($JOINCODES, $jc);
    if ($jlk) { @flock($jlk, LOCK_UN); @fclose($jlk); }

    $sentMail = send_join_email($email, $code);
    $sentSms = $mobile !== '' ? send_join_sms($mobile, $code) : false;
    // masked hint so the page can say "texted to your number ending 1234" without exposing it
    $smsHint = $sentSms ? substr(preg_replace('/[^0-9]/', '', $mobile), -4) : '';
    // STAFF codes also post to the 365 Slack - a delivery channel that can't junk-folder,
    // and a built-in alert: staff see every attempt to sign in as staff, asked-for or not.
    $sentSlack = false;
    if (in_array($email, $allowSt, true)) {
        $SLACK_WEBHOOK = pcm_slack_webhook();
        if (true) {
            if (!empty($SLACK_WEBHOOK)) {
                $ch = curl_init($SLACK_WEBHOOK);
                curl_setopt_array($ch, array(CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 6,
                    CURLOPT_HTTPHEADER => array('Content-Type: application/json'),
                    CURLOPT_POSTFIELDS => json_encode(array('text' => ":key: Portal staff sign-in code for " . $email . ": *" . $code . "*  (valid 30 min, works once, on the device that asked). Didn't request this? Someone is trying to sign in as 365 staff."))));
                $r2 = curl_exec($ch); $sentSlack = ($r2 === 'ok'); curl_close($ch);
            }
        }
    }
    if (!$sentMail && !$sentSms && !$sentSlack) fail('send_failed');
    // Park the details so a customer who never finds the code is not invisible.
    // ⚠️ bk_phone, NEVER $mobile: that variable is an SMS destination governed by
    // the takeover rules above, and this one is only ever read by a human.
    // Staff sign-ins are not prospects, so they are not parked.
    // 6 Oct 2026: ONLY a join from the booking page is parked - it always sends bk_name and bk_phone (both required
    // there). The portal's own sign-in uses this same join with neither, and every customer signing in to their
    // portal was being reported 25 min later as "Booking started but never finished ... (no phone given)": all ten
    // such posts 21 Sep-3 Oct were sign-ins (no name, no phone, no slot), several from customers the team had just
    // set up at a visit. They drowned the lead reminders and made a working booking page look broken.
    $fromBooking = (isset($in['bk_name']) && trim((string)$in['bk_name']) !== '')
                || (isset($in['bk_phone']) && trim((string)$in['bk_phone']) !== '');
    if ($fromBooking && !in_array($email, $allowSt, true)) {
        bkpend_add($email,
                   isset($in['bk_name']) ? $in['bk_name'] : '',
                   isset($in['bk_phone']) ? $in['bk_phone'] : '',
                   array('what' => isset($in['bk_what']) ? $in['bk_what'] : '',
                         'when' => isset($in['bk_when']) ? $in['bk_when'] : ''));
    }
    out(array('ok' => true, 'sms' => $sentSms, 'mail' => $sentMail, 'slack' => $sentSlack, 'smshint' => $smsHint));
}

if ($action === 'verifycode') {
    $email = strtolower(trim((string)(isset($in['email']) ? $in['email'] : '')));
    $code = preg_replace('/[^0-9]/', '', (string)(isset($in['code']) ? $in['code'] : ''));
    $jname = substr(trim((string)(isset($in['name']) ? $in['name'] : '')), 0, 60);
    if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($code) !== 6) fail('bad_code');
    $jlk = @fopen($JOINCODES . '.lock', 'c'); if ($jlk) @flock($jlk, LOCK_EX);   // serialise the tries counter
    $jc = cache_load($JOINCODES);
    $ek = sha1($email);
    $rec = isset($jc[$ek]) ? $jc[$ek] : null;
    $jdone = function() use ($jlk) { if ($jlk) { @flock($jlk, LOCK_UN); @fclose($jlk); } };
    if (!$rec || (isset($rec['ts']) ? $rec['ts'] : 0) < time() - 1800) { $jdone(); fail('code_expired'); }
    if ((isset($rec['tries']) ? $rec['tries'] : 0) >= 6) { unset($jc[$ek]); cache_save($JOINCODES, $jc); $jdone(); fail('code_expired'); }
    if (!hash_equals((string)$rec['h'], hash('sha256', $code))) {
        $jc[$ek]['tries'] = (isset($rec['tries']) ? $rec['tries'] : 0) + 1;
        cache_save($JOINCODES, $jc);
        $jdone();
        fail('wrong_code');
    }
    $jdone();   // code matches - but only BURN it after SimplyBook succeeds, so a transient
                // SB outage doesn't waste the customer's code ("try again shortly" must work)

    // 365 STAFF by emailed code: the allow-listed @365techies.co.uk inbox is a credential no
    // attacker can self-register (unlike SimplyBook client accounts), so a typed code proves
    // staff identity without any SimplyBook password - and survives 2FA on admin accounts.
    global $SB_STAFF;
    $allowJ = (isset($SB_STAFF) && is_array($SB_STAFF)) ? array_map('trim', array_map('strtolower', $SB_STAFF)) : array();
    if (in_array($email, $allowJ, true)) {
        if ($machine === '') fail('bad_code');   // staff tokens must be machine-bound, same as the password path
        $jlkS = @fopen($JOINCODES . '.lock', 'c'); if ($jlkS) @flock($jlkS, LOCK_EX);
        $jcS = cache_load($JOINCODES); unset($jcS[$ek]); cache_save($JOINCODES, $jcS);   // burn now - no SB dependency
        if ($jlkS) { @flock($jlkS, LOCK_UN); @fclose($jlkS); }
        $stoken = bin2hex(random_bytes(24));
        $trustS = empty($in['shared']);   // trusted own device -> long session; "shared computer" -> 12h
        list($lkS, $dbS) = db_open();
        if (!isset($dbS['staff'])) $dbS['staff'] = array();
        foreach ($dbS['staff'] as $sk => $sv) if ((isset($sv['ts']) ? $sv['ts'] : 0) < time() - (empty($sv['trust']) ? 43200 : 7776000)) unset($dbS['staff'][$sk]);
        $dbS['staff'][$stoken] = array('login' => $email, 'ts' => time(), 'iat' => time(), 'machine' => $machine, 'trust' => $trustS);
        db_save($dbS); db_close($lkS);
        out(array('ok' => true, 'staff' => true, 'stoken' => $stoken, 'customer' => $email, 'trust' => $trustS));
    }

    // BUSINESS TEAM MEMBER? This must be decided BEFORE SimplyBook is touched.
    // A company is one SimplyBook client - the director. If we fell through to the
    // normal path, every employee signing in would be given their own client and
    // their own free customer record, fragmenting the business and filling the
    // diary with a client per employee. So a recognised work address joins the
    // COMPANY's account as a member instead, and SimplyBook never hears about it.
    // See api/pcm-team.php for the model and the domain safety rules.
    require_once __DIR__ . '/pcm-team-lib.php';
    list($lkT, $dbT) = db_open();
    $orgHit = team_find_org($dbT, $email, $PUBLIC_DOMAINS);
    if ($orgHit) {
        list($orgKey, $memEmail, $isNewMember) = $orgHit;
        $jlkT = @fopen($JOINCODES . '.lock', 'c'); if ($jlkT) @flock($jlkT, LOCK_EX);
        $jcT = cache_load($JOINCODES); unset($jcT[$ek]); cache_save($JOINCODES, $jcT);   // burn the code now
        if ($jlkT) { @flock($jlkT, LOCK_UN); @fclose($jlkT); }
        $org =& $dbT['customers'][$orgKey];
        if (!isset($org['org']['members']) || !is_array($org['org']['members'])) $org['org']['members'] = array();
        if (!isset($org['org']['members'][$memEmail])) {
            // auto-joined on the company domain: NO computers, so they see a polite
            // empty screen until the director links a machine to them
            $org['org']['members'][$memEmail] = array('name'=>$jname, 'role'=>'staff', 'pcs'=>array(),
                'ts'=>time(), 'seen'=>time(), 'via'=>'domain');
        } else {
            $org['org']['members'][$memEmail]['seen'] = time();
            if ($jname !== '' && ($org['org']['members'][$memEmail]['name'] ?? '') === '') $org['org']['members'][$memEmail]['name'] = $jname;
        }
        $mrole = (($org['org']['members'][$memEmail]['role'] ?? 'staff') === 'manager') ? 'manager' : 'staff';
        $wtokT = bin2hex(random_bytes(24));
        if (!isset($dbT['websessions'])) $dbT['websessions'] = array();
        $dbT['websessions'][$wtokT] = array('key'=>$orgKey, 'member'=>$memEmail, 'ts'=>time(), 'iat'=>time(),
            'long'=>true, 'forever'=>empty($in['shared']), 'machine'=>$machine);
        db_save($dbT); db_close($lkT);
        wcookie_set($wtokT, empty($in['shared']));
        if ($isNewMember) {
            $who = $jname !== '' ? $jname . ' (' . $memEmail . ')' : $memEmail;
            pcm_slack_say(":bust_in_silhouette: *New team member joined a company portal* - " . $who
                . " signed in on the company domain and joined *" . (string)($org['name'] ?? $orgKey) . "*."
                . "\nThey can see nothing until a computer is assigned to them.");
        }
        // the company's real tier, not an assumed one: an existing member of a
        // lapsed account must not be handed a 'pro' portal
        $orgTier = ((string)($org['tier'] ?? 'free') === 'pro') ? 'pro' : 'free';
        out(array('ok'=>true, 'tier'=>$orgTier, 'wtoken'=>$wtokT, 'customer'=>(string)($org['org']['members'][$memEmail]['name'] ?? $jname),
                  'member'=>$memEmail, 'role'=>$mrole, 'joined'=>true, 'team'=>true));
    }
    db_close($lkT);

    // inbox ownership PROVEN. Find or silently create the SimplyBook client.
    // getClientList FIRST - SimplyBook duplicate clients break password sign-in.
    if (!$HAS_ADMIN) fail('not_configured');
    $cid = 0; $cname = $jname;
    $cl = sb_adm('getClientList', array($email, null));
    if (sb_net($cl) || !isset($cl['result']) || !is_array($cl['result'])) {   // API error != empty list - never blind-create
        $w = sb_why($cl);
        sb_alarm('looking up the customer (getClientList) failed', $w);
        out(array('ok' => false, 'error' => 'sb_unavailable', 'at' => 'getClientList', 'why' => $w));
    }
    foreach ($cl['result'] as $cli) {
        if (isset($cli['email']) && strtolower(trim((string)$cli['email'])) === $email) {
            $cid = (int)$cli['id'];
            if ($cname === '' && !empty($cli['name'])) $cname = (string)$cli['name'];
            break;
        }
    }
    // carry the phone the customer typed into the NEW SimplyBook client - without this a
    // web booking lands in the diary with no number to ring, while we promise to call ahead
    $jphone = isset($in['phone']) ? trim(preg_replace('/[^0-9+ ]/', '', (string)$in['phone'])) : '';
    if (strlen(preg_replace('/[^0-9]/', '', $jphone)) < 9) $jphone = '';
    if ($cid === 0) {
        // Ask for a real name up front rather than sending the email address as one:
        // SimplyBook rejects the record, and even when it doesn't, the diary fills with
        // customers called "someone@gmail.com" instead of their actual name.
        if ($cname === '') out(array('ok' => false, 'error' => 'needinfo', 'needname' => true, 'needphone' => ($jphone === '')));
        $cd = array('name' => $cname, 'email' => $email);
        if ($jphone !== '') $cd['phone'] = $jphone;
        // smart create: auto-fills any REQUIRED custom client fields with "-" (the
        // -32070 error names them one at a time as client_fields/<id> - discovered
        // live via sbdiag; SimplyBook's docs don't admit this parameter exists)
        $ac = sb_add_client_smart($cd, $cfFilled);
        $firstWhy = (sb_net($ac) || empty($ac['result'])) ? sb_why($ac) : '';
        // SimplyBook can reject a client on phone FORMAT (rules vary by company config),
        // and losing a sign-in over that would be absurd - we keep the number on our own
        // record anyway. But NEVER strip the phone when SimplyBook says a value is
        // REQUIRED - retrying without it would guarantee failure and report misleadingly.
        $required = preg_match('/required|empty|mandator/i', $firstWhy);
        if ($firstWhy !== '' && $jphone !== '' && !$required) {
            unset($cd['phone']);
            $ac = sb_add_client_smart($cd, $cfFilled);
        }
        if (sb_net($ac) || empty($ac['result'])) {
            $w = $firstWhy !== '' ? $firstWhy : sb_why($ac);   // report the FIRST failure, not the retry's
            // Ask for a number rather than dead-ending the sign-up - the customer's code
            // is still valid, because we only burn it once SimplyBook has succeeded.
            // Ask the customer for whatever we're missing rather than dead-ending them -
            // their code stays valid until SimplyBook succeeds. But ONLY when something
            // really is missing: if we already sent both and SimplyBook still says a value
            // is required, the missing field is something else entirely, and asking again
            // would loop the customer forever while hiding the real fault from Slack.
            if ($required && ($cname === '' || $jphone === ''))
                out(array('ok' => false, 'error' => 'needinfo',
                          'needname' => ($cname === ''), 'needphone' => ($jphone === '')));
            sb_alarm('creating the customer (addClient) failed', $w
                . ' [phone ' . ($jphone !== '' ? 'supplied: ' . preg_replace('/[^0-9+ ]/', '', $jphone) : 'NOT supplied')
                . ', name ' . ($cname !== '' ? 'supplied' : 'NOT supplied')
                . (isset($cfFilled) && count($cfFilled) ? '; auto-filled ' . count($cfFilled) . ' required custom field(s)' : '') . ']'
                . "\n> Built-in requirements: " . sb_required_client_fields()
                . "\n> Raw refusal: " . substr(preg_replace('/[^\x20-\x7E]/', '', json_encode(isset($ac['error']) ? $ac['error'] : $ac)), 0, 220)
                . ' The customer HAS been signed in; booking needs the record, so online booking is blocked until fixed.');
            // DEGRADE, don't dead-end. Signing in to OUR portal does not need a SimplyBook
            // client - that is only needed to book, and the book action creates one itself
            // (ensure_client_id) at a point where it also holds the booking details. So a
            // fussy client-field rule in SimplyBook must never lock a customer out of their
            // own account; it just defers the booking record.
            $cid = 0;
        } else $cid = (int)$ac['result'];
    }
    // NOW burn the code (single use) - SimplyBook resolution succeeded
    $jlk2 = @fopen($JOINCODES . '.lock', 'c'); if ($jlk2) @flock($jlk2, LOCK_EX);
    $jc2 = cache_load($JOINCODES); unset($jc2[$ek]); cache_save($JOINCODES, $jc2);
    if ($jlk2) { @flock($jlk2, LOCK_UN); @fclose($jlk2); }

    // find-or-create the customer record - the same safe matching as password sign-in:
    // sb_client_id first, then a FREE unlinked email match; Pro NEVER auto-granted.
    list($lk, $db) = db_open();
    $now = gmdate('Y-m-d H:i');
    $target = ''; $pending = false; $pendingKeys = array();
    // $cid may legitimately be 0 (SimplyBook refused the client - see above). Matching on
    // 0 would hand this person the FIRST record that has no booking account, i.e. someone
    // else's, so only ever match on a real id.
    if ($cid > 0) foreach ($db['customers'] as $k2 => $c2)
        if (isset($c2['sb_client_id']) && (int)$c2['sb_client_id'] === $cid) { $target = $k2; break; }
    if ($target === '') {
        foreach ($db['customers'] as $k2 => $c2) {
            if (!isset($c2['email']) || strtolower(trim($c2['email'])) !== $email) continue;
            $recTier = (isset($c2['tier']) && $c2['tier'] === 'pro') ? 'pro' : 'free';
            $otherId = !empty($c2['sb_client_id']) && (int)$c2['sb_client_id'] !== $cid;
            if ($otherId) continue;
            if ($recTier === 'pro') { $pendingKeys[] = $k2; $pending = true; continue; }
            $target = $k2; break;
        }
    }
    if ($target === '') {
        do { $target = 'SB' . strtoupper(substr(bin2hex(random_bytes(6)), 0, 10)); } while (isset($db['customers'][$target]));
        $db['customers'][$target] = array('name' => ($cname !== '' ? $cname : $email), 'email' => $email,
            'tier' => 'free', 'next' => '', 'created' => $now, 'via' => 'join', 'machines' => array());
    }
    $c =& $db['customers'][$target];
    if ($cid > 0) $c['sb_client_id'] = $cid;   // never overwrite a real link with 0
    $c['sb_email'] = $email;
    if ($cname !== '' && (empty($c['name']) || $c['name'] === $email)) $c['name'] = $cname;
    if ($cname !== '' && empty($c['sb_name'])) $c['sb_name'] = $cname;   // used when the booking account is created later
    if ($jphone !== '' && empty($c['phone']) && empty($c['sb_phone'])) $c['phone'] = $jphone;
    $c['email_verified'] = true;   // proven by the typed code - unlike raw SB self-registration
    // marketing consent (PECR): an explicit, unticked-by-default opt-in on the join box. Only ever
    // SET it (never silently withdraw when the box is left unticked) - withdrawal is via the
    // unsubscribe link. Keep the ORIGINAL consent timestamp as the record of when they agreed.
    if (!empty($in['marketing']) && empty($c['marketing_consent'])) {
        $c['marketing_consent'] = true;
        $c['marketing_ts'] = $now;
        $c['marketing_src'] = 'portal-join';
    }
    if ($cname !== '' && empty($c['name'])) $c['name'] = $cname;
    if (!isset($c['machines'])) $c['machines'] = array();
    foreach ($pendingKeys as $pk)
        if (isset($db['customers'][$pk]) && $pk !== $target)
            $db['customers'][$pk]['pending_signin'] = array('cid' => $cid, 'email' => $email, 'link' => $target, 'sbname' => $cname, 'ts' => $now);
    // long-lived device session (60d sliding / 90d cap) - the best senior auth is the one
    // they almost never see. Server-revocable via weblogout / the websessions table.
    $wtok = bin2hex(random_bytes(24));
    if (!isset($db['websessions'])) $db['websessions'] = array();
    foreach ($db['websessions'] as $wk => $wv) {
        $lim = !empty($wv['forever']) ? 31536000 : (!empty($wv['long']) ? 5184000 : 43200);
        if ((isset($wv['ts']) ? $wv['ts'] : 0) < time() - $lim) unset($db['websessions'][$wk]);
    }
    $db['websessions'][$wtok] = array('key' => $target, 'ts' => time(), 'iat' => time(), 'long' => true, 'forever' => empty($in['shared']), 'machine' => $machine);
    wcookie_set($wtok, empty($in['shared']));   // shared device -> cookie dies with the browser
    pcm_welcome_maybe($c, $target, $email, $cname !== '' ? $cname : (isset($c['name']) ? $c['name'] : ''));
    db_save($db); db_close($lk);

    $tier = ((isset($c['tier']) && $c['tier'] === 'pro')) ? 'pro' : 'free';
    out(array('ok' => true, 'tier' => $tier, 'wtoken' => $wtok, 'customer' => isset($c['name']) ? $c['name'] : '',
              'next' => isset($c['next']) ? $c['next'] : '', 'pending' => $pending, 'joined' => true));
}

if ($action === 'signin') {
    $email = strtolower(trim((string)(isset($in['email']) ? $in['email'] : '')));
    $pass  = (string)(isset($in['password']) ? $in['password'] : '');
    $mname = substr((string)(isset($in['name']) ? $in['name'] : ''), 0, 60);
    if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || $pass === '' || $machine === '') fail('bad_login');

    // throttle: <=6 attempts per (ip,email) per 15 min, under a lock so increments can't be lost
    $tkey = sha1((isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '') . '|' . $email);
    $tlk = @fopen($THROTTLE . '.lock', 'c'); if ($tlk) @flock($tlk, LOCK_EX);
    $th = cache_load($THROTTLE);
    foreach ($th as $k2 => $v2) if ((isset($v2['ts']) ? $v2['ts'] : 0) < time() - 900) unset($th[$k2]);
    if (isset($th[$tkey]) && (isset($th[$tkey]['n']) ? $th[$tkey]['n'] : 0) >= 12) { cache_save($THROTTLE, $th); db_close($tlk); fail('throttled'); }

    // 365 STAFF (allow-list) => MANAGER MODE. Authenticate them by their CLIENT/booking login
    // (the password they book with - no 2FA, always works) or, failing that, getUserToken with
    // their admin password (only works if that account has no 2FA). The allow-list is the
    // AUTHORISATION; controlling the account is the AUTHENTICATION. The diary's admin API calls
    // use the server's stored api_user_key, so a staff member's own 2FA never blocks manager mode.
    // Allow-list emails resolve entirely here (never fall through to the customer path).
    global $SB_COMPANY, $SB_STAFF;
    $allow = (isset($SB_STAFF) && is_array($SB_STAFF)) ? array_map('strtolower', $SB_STAFF) : array();
    if (in_array($email, $allow, true)) {
        // AUTHENTICATION ORDER MATTERS. The SimplyBook ADMIN directory (getUserToken) is the
        // real credential - client logins are SELF-REGISTERABLE with any email, so a client
        // login alone must never grant staff. It is accepted only when its client id was
        // PINNED during an earlier successful admin login (auto-pinned below), which an
        // attacker's freshly-registered client can never match.
        $ur = sb_rpc('https://user-api.simplybook.me/login', 'getUserToken', array($SB_COMPANY, $email, $pass));
        $authed = !sb_net($ur) && !empty($ur['result']);
        $ci = sb_pub('getClientInfoByLoginPassword', array($email, $pass));
        $cidStaff = (!sb_net($ci) && isset($ci['result']['id'])) ? (int)$ci['result']['id'] : 0;
        if ($authed && $cidStaff > 0) {
            // admin-verified AND the same credentials open a client account: pin that id so
            // future client-only logins (e.g. if 2FA later blocks getUserToken) still work
            list($lkp, $dbp) = db_open();
            if (!isset($dbp['staffpin'])) $dbp['staffpin'] = array();
            $dbp['staffpin'][$email] = $cidStaff;
            db_save($dbp); db_close($lkp);
        }
        if (!$authed && $cidStaff > 0) {
            list($lkp, $dbp) = db_open(); db_close($lkp);
            $authed = isset($dbp['staffpin'][$email]) && (int)$dbp['staffpin'][$email] === $cidStaff;
        }
        if ($authed) {
            unset($th[$tkey]); cache_save($THROTTLE, $th); db_close($tlk);
            // our own staff session token (SimplyBook password never stored), bound to this machine.
            // 12h by default; on a trusted own-device (not "shared") it lasts 30d idle / 90d hard cap.
            $stoken = bin2hex(random_bytes(24));
            $trust2 = empty($in['shared']);
            list($lk2, $db2) = db_open();
            if (!isset($db2['staff'])) $db2['staff'] = array();
            foreach ($db2['staff'] as $sk => $sv) if ((isset($sv['ts']) ? $sv['ts'] : 0) < time() - (empty($sv['trust']) ? 43200 : 7776000)) unset($db2['staff'][$sk]);
            $db2['staff'][$stoken] = array('login' => $email, 'ts' => time(), 'iat' => time(), 'machine' => $machine, 'trust' => $trust2);
            db_save($db2); db_close($lk2);
            out(array('ok' => true, 'staff' => true, 'stoken' => $stoken, 'customer' => $email, 'trust' => $trust2));
        }
        $th[$tkey] = array('n' => (isset($th[$tkey]['n']) ? $th[$tkey]['n'] : 0) + 1, 'ts' => time());
        cache_save($THROTTLE, $th); db_close($tlk);
        fail('bad_login');
    }

    // normal customer: verify the client login against SimplyBook (forwarded once, never stored)
    $r = sb_pub('getClientInfoByLoginPassword', array($email, $pass));
    if (sb_net($r)) { db_close($tlk); fail('sb_unavailable'); }
    $client = isset($r['result']) && is_array($r['result']) ? $r['result'] : null;
    if (!$client || empty($client['id'])) {
        $th[$tkey] = array('n' => (isset($th[$tkey]['n']) ? $th[$tkey]['n'] : 0) + 1, 'ts' => time());
        cache_save($THROTTLE, $th); db_close($tlk);
        fail('bad_login');
    }
    unset($th[$tkey]); cache_save($THROTTLE, $th); db_close($tlk);
    $cid    = (int)$client['id'];
    $cname  = (string)(isset($client['name']) ? $client['name'] : '');
    $cphone = (string)(isset($client['phone']) ? $client['phone'] : '');
    $cemail = (string)(isset($client['email']) && $client['email'] !== '' ? strtolower(trim($client['email'])) : $email);

    list($lk, $db) = db_open();
    $now = gmdate('Y-m-d H:i');
    $target = ''; $pending = false; $pendingKeys = array();

    // 1) the app's current licence key (a bearer credential the owner already issued) wins:
    //    lets a key-activated Pro customer sign in for booking WITHOUT losing Pro.
    if ($key !== '' && isset($db['customers'][$key])) $target = $key;

    // 2) else a record already linked to THIS verified SimplyBook client id
    if ($target === '') {
        foreach ($db['customers'] as $k2 => $c2)
            if (isset($c2['sb_client_id']) && (int)$c2['sb_client_id'] === $cid) { $target = $k2; break; }
    }

    // 3) else match by email - but ONLY safe to adopt a FREE owner record with no other
    //    linked identity. A Pro record is never auto-granted; it is flagged for the owner.
    if ($target === '') {
        foreach ($db['customers'] as $k2 => $c2) {
            if (!isset($c2['email']) || strtolower(trim($c2['email'])) !== $cemail) continue;
            $recTier = (isset($c2['tier']) && $c2['tier'] === 'pro') ? 'pro' : 'free';
            $otherId = !empty($c2['sb_client_id']) && (int)$c2['sb_client_id'] !== $cid;
            if ($otherId) continue;                 // belongs to a different booking account
            if ($recTier === 'pro') {               // never hand Pro over on an email match - queue for owner approval
                $pendingKeys[] = $k2; $pending = true; continue;
            }
            $target = $k2; break;                    // free owner record, same email, unlinked - safe
        }
    }

    // 4) else create a fresh FREE self-serve booking identity, keyed to the SimplyBook client
    if ($target === '') {
        do { $target = 'SB' . strtoupper(substr(bin2hex(random_bytes(6)), 0, 10)); } while (isset($db['customers'][$target]));
        $db['customers'][$target] = array('name' => ($cname !== '' ? $cname : $cemail), 'email' => $cemail,
            'tier' => 'free', 'next' => '', 'created' => $now, 'via' => 'signin', 'machines' => array());
    }

    $c =& $db['customers'][$target];
    $c['sb_client_id'] = $cid;                      // verified identity, used for all booking ops
    $c['sb_name'] = $cname; $c['sb_email'] = $cemail; if ($cphone !== '') $c['sb_phone'] = $cphone;
    if (!isset($c['machines'])) $c['machines'] = array();
    // a web-portal sign-in is not a PC - don't register a phantom machine in the fleet
    if (empty($in['web']) && !isset($c['machines'][$machine]))
        $c['machines'][$machine] = array('name' => $mname, 'score' => 0, 'verdict' => '', 'seen' => $now, 'activated' => $now);
    // flag each matched Pro record for the owner's one-click approval, pointing at this booking identity
    foreach ($pendingKeys as $pk)
        if (isset($db['customers'][$pk]) && $pk !== $target)
            $db['customers'][$pk]['pending_signin'] = array('cid' => $cid, 'email' => $cemail, 'link' => $target, 'sbname' => $cname, 'ts' => $now);
    // web portal: never hand the permanent licence key to a browser. Mint an expiring
    // server-side session token instead (12h sliding, purged like staff tokens).
    $wtok = '';
    if (!empty($in['web'])) {
        $wtok = bin2hex(random_bytes(24));
        if (!isset($db['websessions'])) $db['websessions'] = array();
        foreach ($db['websessions'] as $wk => $wv) {
            $lim = !empty($wv['forever']) ? 31536000 : (!empty($wv['long']) ? 5184000 : 43200);
            if ((isset($wv['ts']) ? $wv['ts'] : 0) < time() - $lim) unset($db['websessions'][$wk]);
        }
        // customers get a long device session (60d sliding / 90d cap, server-revocable)
        $db['websessions'][$wtok] = array('key' => $target, 'ts' => time(), 'iat' => time(), 'long' => true, 'forever' => empty($in['shared']), 'machine' => $machine);
    wcookie_set($wtok, empty($in['shared']));   // shared device -> cookie dies with the browser
        // inside the web branch on purpose: an app sign-in is not a portal sign-in
        pcm_welcome_maybe($c, $target, $cemail, $cname);
    }
    db_save($db); db_close($lk);

    $tier = (($c['tier'] === 'pro')) ? 'pro' : 'free';
    if ($wtok !== '')
        out(array('ok' => true, 'tier' => $tier, 'wtoken' => $wtok, 'customer' => isset($c['name']) ? $c['name'] : '',
                  'next' => isset($c['next']) ? $c['next'] : '', 'onplan' => $tier === 'pro', 'pending' => $pending));
    out(array('ok' => true, 'tier' => $tier, 'key' => $target, 'customer' => isset($c['name']) ? $c['name'] : '',
              'next' => isset($c['next']) ? $c['next'] : '', 'onplan' => $tier === 'pro', 'pending' => $pending));
}

// web portal sign-out: destroy the customer web session server-side
if ($action === 'weblogout') {
    $wt = isset($in['wtoken']) ? preg_replace('/[^a-f0-9]/', '', (string)$in['wtoken']) : '';
    if ($wt === '') $wt = wcookie_get();   // signed out after a storage wipe: the cookie is all they have
    if ($wt !== '') { list($lk, $db) = db_open(); if (isset($db['websessions'][$wt])) { unset($db['websessions'][$wt]); db_save($db); } db_close($lk); }
    wcookie_clear();
    out(array('ok' => true));
}

// Adopt the cookie session: called by the portal when localStorage is empty
// (Safari purges it after 7 days away). Returns enough to rebuild the local
// state. view-as sessions are refused inside web_snapshot for cookie auth.
if ($action === 'wsession') {
    $snap = web_snapshot();
    if (!empty($snap['viewas'])) fail('expired');
    out(array('ok' => true, 'wtoken' => $snap['wtoken'], 'customer' => $snap['name'],
              'tier' => $snap['tier'], 'member' => $snap['member'], 'mstaff' => !empty($snap['mstaff'])));
}

if ($action === 'services') {
    // staff use their session token; portal customers their web session; the app its key
    if (isset($in['stoken']) && $in['stoken'] !== '') need_staff();
    elseif (isset($in['wtoken']) && $in['wtoken'] !== '') web_snapshot();
    else customer_snapshot();
    out(array('ok' => true, 'services' => sb_services()));
}

if ($action === 'slots') {
    $isStaffSlots = isset($in['stoken']) && $in['stoken'] !== '';
    if ($isStaffSlots) need_staff();
    elseif (isset($in['wtoken']) && $in['wtoken'] !== '') web_snapshot();
    else customer_snapshot();
    $eventId = (int)(isset($in['eventId']) ? $in['eventId'] : 0);
    // some SimplyBook responses omit event_id on booking rows - staff may pass the booking
    // id instead and we resolve the service from the booking details
    if ($eventId <= 0 && $isStaffSlots && $HAS_ADMIN && intval($in['bid'] ?? 0) > 0) {
        $det = sb_adm('getBookingDetails', array((int)$in['bid']));
        if (!sb_net($det) && isset($det['result']) && is_array($det['result'])) {
            $bd = $det['result'];
            $eventId = (int)(isset($bd['event_id']) ? $bd['event_id'] : (isset($bd['event']['id']) ? $bd['event']['id'] : 0));
        }
    }
    $from = preg_replace('/[^0-9\-]/', '', (string)(isset($in['from']) ? $in['from'] : ''));
    $to   = preg_replace('/[^0-9\-]/', '', (string)(isset($in['to']) ? $in['to'] : ''));
    if ($eventId <= 0 || $from === '' || $to === '') fail('no_service');
    $units = sb_units_for($eventId);
    if (!count($units)) fail('sb_unavailable');
    $r = sb_pub('getStartTimeMatrix', array($from, $to, $eventId, $units, 1));
    if (sb_net($r)) fail('sb_unavailable');
    $matrix = isset($r['result']) && is_array($r['result']) ? $r['result'] : array();
    $days = array();
    foreach ($matrix as $d => $times) {
        if (!is_array($times) || !count($times)) continue;
        $tt = array();
        foreach ($times as $t) $tt[] = substr((string)$t, 0, 5);
        $ts = strtotime($d);
        $days[] = array('d' => $d, 'n' => $ts ? date('D j M', $ts) : $d, 't' => $tt);
    }
    out(array('ok' => true, 'days' => $days, 'eventId' => $eventId));   // echo the (possibly resolved) service id
}

if ($action === 'book') {
    if (isset($in['wtoken']) && $in['wtoken'] !== '') { $snap = web_snapshot(); $key = $snap['key']; }   // portal customer; $key feeds stamp_next
    else $snap = customer_snapshot();
    $eventId = (int)(isset($in['eventId']) ? $in['eventId'] : 0);
    $date = preg_replace('/[^0-9\-]/', '', (string)(isset($in['date']) ? $in['date'] : ''));
    $time = preg_replace('/[^0-9:]/', '', (string)(isset($in['time']) ? $in['time'] : ''));
    if ($eventId <= 0 || $date === '' || $time === '') fail('bad_request');
    if (strlen($time) === 5) $time .= ':00';
    if (strtotime($date . ' ' . $time) === false) fail('bad_request');
    if ($snap['email'] === '') fail('needsignin');
    if (!$HAS_ADMIN) fail('not_configured');
    // Book via the ADMIN method with a real client id. The public API rejects unauthenticated
    // bookings ("Client authorization required") under this company's config, so we resolve or
    // create the customer's own SimplyBook client and book on their behalf - same as staffbook.
    // SimplyBook may require a phone to create a booking account. Use the number the customer typed
    // at booking if we don't already have one on file, and remember it on the record for next time.
    $reqPhone = isset($in['phone']) ? trim(preg_replace('/[^0-9+ ]/', '', (string)$in['phone'])) : '';
    if ($snap['phone'] === '' && $reqPhone !== '') {
        $snap['phone'] = $reqPhone;
        list($lkp, $dbp) = db_open();
        if (isset($dbp['customers'][$key]) && empty($dbp['customers'][$key]['phone']) && empty($dbp['customers'][$key]['sb_phone'])) { $dbp['customers'][$key]['phone'] = $reqPhone; db_save($dbp); }
        db_close($lkp);
    }
    $cid = ensure_client_id($key, $snap);
    if ($cid <= 0) {
        $why = isset($GLOBALS['nc_why']) ? $GLOBALS['nc_why'] : '';
        out(array('ok' => false, 'error' => 'no_client', 'why' => $why, 'needphone' => (strpos($why, 'create_failed') === 0 && $snap['phone'] === '')));
    }
    // Diary-flood guard: one verified inbox must not be able to fill the public diary.
    //
    // This used to block at 6 future visits, which trapped exactly the customers we most
    // want booking freely: a recurring service plan creates a whole SERIES of visits from
    // ONE action (we have seen a single booking create twelve), so anybody on a plan hit
    // the ceiling immediately and could never book a repair online again.
    //
    // The thing actually worth preventing is somebody rapidly creating bookings, so that
    // is what we now measure: booking ACTIONS in the last 24 hours. The count of future
    // visits stays only as a far-off backstop, high enough that a legitimate plan
    // customer never meets it.
    list($lkR, $dbR2) = db_open();
    if (!isset($dbR2['bkrate'])) $dbR2['bkrate'] = array();
    foreach ($dbR2['bkrate'] as $rk => $rv) if (!is_array($rv) || (isset($rv['ts']) ? $rv['ts'] : 0) < time() - 86400) unset($dbR2['bkrate'][$rk]);
    $rkey = sha1('bk|' . $key);
    $recent = isset($dbR2['bkrate'][$rkey]['n']) ? (int)$dbR2['bkrate'][$rkey]['n'] : 0;
    db_save($dbR2); db_close($lkR);
    if ($recent >= 4) out(array('ok' => false, 'error' => 'too_fast'));

    $exb = sb_adm('getBookings', array(array('client_id' => $cid, 'booking_type' => 'non_cancelled', 'date_from' => date('Y-m-d'))));
    $futCount = 0;
    if (!sb_net($exb) && isset($exb['result']) && is_array($exb['result'])) {
        foreach ($exb['result'] as $eb) { $est = strtotime(parse_start($eb)); if ($est && $est > time()) $futCount++; }
        // Backstop only. A 6-weekly plan booked a year ahead is ~9 visits; 24 leaves room
        // for that plus one-off jobs, while still stopping a runaway.
        if ($futCount >= 24) out(array('ok' => false, 'error' => 'too_many', 'have' => $futCount));
    }
    $au = sb_pub('getAvailableUnits', array($eventId, $date . ' ' . $time, 1));
    if (sb_net($au)) fail('sb_unavailable');
    $unitIds = isset($au['result']) && is_array($au['result']) ? array_values($au['result']) : array();
    if (!count($unitIds)) fail('slot_taken');
    $startTs = strtotime($date . ' ' . $time); $endTs = $startTs + sb_mins_for($eventId) * 60;
    $r = sb_adm('book', array($eventId, (int)$unitIds[0], $cid, $date, $time,
        date('Y-m-d', $endTs), date('H:i:s', $endTs), 0, array(), 1));
    if (sb_net($r)) fail('sb_unavailable');
    $b = isset($r['result']) && is_array($r['result']) ? $r['result'] : null;
    if (!$b) {
        $msg = isset($r['error']['message']) ? substr(preg_replace('/[^\x20-\x7E]/', '', (string)$r['error']['message']), 0, 140) : '';
        out(array('ok' => false, 'error' => 'booking_failed', 'sberr' => $msg));
    }
    // A service configured as RECURRING in SimplyBook returns the whole series here, not
    // one booking - so a customer who thought they were booking one visit has just booked
    // many. We must (a) tell them honestly, and (b) queue EVERY occurrence for its own
    // reminder, or only the first visit would ever be reminded.
    $series = array();
    $bid = 0; $confirmed = true;
    if (isset($b['bookings']) && is_array($b['bookings'])) {
        foreach ($b['bookings'] as $one) {
            if (!is_array($one)) continue;
            $oid = (int)(isset($one['id']) ? $one['id'] : 0);
            if ($oid <= 0) continue;
            $ost = strtotime((string)(isset($one['start_date_time']) ? $one['start_date_time']
                   : (isset($one['start_date']) ? $one['start_date'] . ' ' . (isset($one['start_time']) ? $one['start_time'] : $time) : '')));
            $series[] = array('id' => $oid, 'ts' => $ost ? $ost : 0);
        }
        if (isset($b['bookings'][0])) {
            $bid = (int)(isset($b['bookings'][0]['id']) ? $b['bookings'][0]['id'] : 0);
            if (isset($b['bookings'][0]['is_confirmed'])) $confirmed = (bool)$b['bookings'][0]['is_confirmed'];
        }
    } elseif (isset($b['id'])) { $bid = (int)$b['id']; }
    if (isset($b['require_confirm'])) $confirmed = !$b['require_confirm'];
    $ts = strtotime($date . ' ' . $time);
    $pretty = $ts ? date('D j M Y g:ia', $ts) : ($date . ' ' . $time);
    // ONE CLICK = ONE VISIT. If the service is set up as recurring in SimplyBook, the
    // call above just created the whole series. The customer chose one date and one time
    // and expected one appointment, so cancel every later occurrence and keep the first.
    // A genuine recurring arrangement gets set up by a human who knows they are doing it.
    $trimmed = 0;
    if (count($series) > 1) {
        usort($series, function ($a, $b) { return $a['ts'] - $b['ts']; });
        $keep = $series[0]['id'];
        foreach ($series as $sv) {
            if ($sv['id'] === $keep) continue;
            $cx = sb_adm('cancelBooking', array($sv['id']));
            if (!sb_net($cx) && !empty($cx['result'])) $trimmed++;
        }
        if ($trimmed) {
            $series = array($series[0]);
            pcm_slack_say(':scissors: *Recurring service trimmed* - the booking above is set up as '
                . 'RECURRING in SimplyBook, so it created ' . ($trimmed + 1) . ' visits from one '
                . 'click. We kept the first and cancelled ' . $trimmed . '. Worth switching '
                . 'recurrence off for this service unless it is deliberate.');
        }
    }
    $repeats = count($series) > 1 ? count($series) : 0;
    $lastPretty = '';
    if ($repeats) {
        $lastTs = 0;
        foreach ($series as $sv2) if ($sv2['ts'] > $lastTs) $lastTs = $sv2['ts'];
        if ($lastTs) $lastPretty = date('j M Y', $lastTs);
    }
    if ($confirmed) stamp_next($ts, $pretty);        // only claim a firm date once confirmed
    // What the customer told us about the job (and where, for on-site) - SimplyBook custom
    // field ids aren't known to us, so keep it on OUR record and put it in front of the team
    // in Slack, where booking alerts already land.
    $note = trim(preg_replace('/[\x00-\x1F\x7F]+/', ' ', (string)(isset($in['note']) ? $in['note'] : '')));
    // A company books through ONE SimplyBook client - the director - so without this
    // the diary would say "Acme Ltd" and the engineer would arrive not knowing whose
    // desk to go to. Stamp who actually raised it on our own record.
    if (!empty($snap['member'])) {
        $who = trim((string)($snap['mname'] ?? '')) !== '' ? trim((string)$snap['mname']) : (string)$snap['member'];
        $note = 'Raised by ' . $who . ' (' . $snap['member'] . ')' . ($note !== '' ? ' - ' . $note : '');
    }
    if ($note !== '') {
        $note = substr($note, 0, 400);
        list($lkn, $dbn) = db_open();
        if (!isset($dbn['bknote'])) $dbn['bknote'] = array();
        foreach ($dbn['bknote'] as $nk => $nv) if ((isset($nv['ts']) ? $nv['ts'] : 0) < time() - 7776000) unset($dbn['bknote'][$nk]);
        if ($bid > 0) $dbn['bknote'][(string)$bid] = array('t' => $note, 'ts' => time());
        db_save($dbn); db_close($lkn);
    }
    // Queue this booking for OUR customer emails directly, rather than relying solely on
    // SimplyBook's callback reaching us. A booking made through our own page/portal/app must
    // still get its job-done, reminder and review emails even if the callback is
    // unconfigured or SimplyBook's delivery fails. rv_record is keyed by booking id and
    // preserves per-email state, so the callback arriving later is a harmless no-op.
    if ($bid > 0 && $snap['email'] !== '') {
        // loaded at TOP LEVEL by this file - see the note there. Including it here
        // unset $RV_Q for the request, so these review and job-done entries were
        // written to a phantom queue and never sent for any booking made through
        // our own page. SimplyBook-originated ones were fine: pcm-sb-callback.php
        // includes the library at top level.
        if (function_exists('rv_record')) {
            $svcNm = '';
            foreach (sb_services() as $svv) if ($svv['id'] === $eventId) { $svcNm = $svv['name']; break; }
            $mins = sb_mins_for($eventId);
            if ($repeats) {
                // queue EVERY occurrence: each visit needs its own reminder and job-done email
                foreach ($series as $sv3) {
                    if ($sv3['ts'] <= 0) continue;
                    rv_record($sv3['id'], $snap['email'], $snap['name'], $sv3['ts'] + $mins * 60, 'create', $sv3['ts'], $svcNm);
                }
            } else {
                rv_record($bid, $snap['email'], $snap['name'], $endTs, 'create', $ts, $svcNm);
            }
        }
    }
    // ---- referral capture ------------------------------------------------------
    // The missing piece was never advocacy - customers do recommend us - it was
    // ATTRIBUTION: when the friend rang, nothing recorded who sent them, so nobody
    // could be thanked, and an unthanked referral does not repeat. One optional
    // question, a permanent ledger, and a Slack nudge naming both people.
    $refby = trim(preg_replace('/[\x00-\x1F\x7F]+/', ' ', (string)(isset($in['refby']) ? $in['refby'] : '')));
    $refby = substr($refby, 0, 80);
    if ($refby !== '') {
        list($lkR, $dbR) = db_open();
        if (!isset($dbR['referrals']) || !is_array($dbR['referrals'])) $dbR['referrals'] = array();
        $dbR['referrals'][] = array(
            'by'    => $refby,                                   // who they say recommended us
            'who'   => $snap['name'] !== '' ? $snap['name'] : $snap['email'],   // the new customer
            'email' => $snap['email'],
            'bid'   => $bid,
            'when'  => $pretty,
            'ts'    => time(),
            'thanked' => false,                                  // set by staff once the reward is applied
        );
        if (count($dbR['referrals']) > 2000) $dbR['referrals'] = array_slice($dbR['referrals'], -2000);
        db_save($dbR); db_close($lkR);
        pcm_slack_say(":handshake: *A referral!* " . bk_clean($snap['name'] !== '' ? $snap['name'] : $snap['email'])
            . ' says they were recommended by *' . bk_clean($refby) . "*\n"
            . "> :arrow_right: Give " . bk_clean($snap['name'] !== '' ? $snap['name'] : 'them') . " their first month on a support plan free (it includes this first Computer Service & Health Check)\n"
            . "> :arrow_right: Give " . bk_clean($refby) . " a month free on their support plan\n"
            . '> Booked for ' . $pretty);
    }
    // Count this booking ACTION for the 24h rate limit. Deliberately counts actions, not
    // visits - a recurring plan creating twelve visits is one action, not twelve.
    list($lkB2, $dbB2) = db_open();
    if (!isset($dbB2['bkrate'])) $dbB2['bkrate'] = array();
    $rk2 = sha1('bk|' . $key);
    $cur = isset($dbB2['bkrate'][$rk2]['n']) ? (int)$dbB2['bkrate'][$rk2]['n'] : 0;
    $dbB2['bkrate'][$rk2] = array('n' => $cur + 1, 'ts' => time());
    db_save($dbB2); db_close($lkB2);

    // they made it - so they are no longer an abandoned booking
    bkpend_clear(isset($snap['email']) ? $snap['email'] : '');

    // online bookings deserve the same visibility as staff-made ones
    pcm_slack_say(':calendar: *New online booking* - ' . bk_clean($snap['name'] !== '' ? $snap['name'] : $snap['email'])
        . ' - ' . $pretty . (!$confirmed ? ' _(awaiting confirmation)_' : '')
        . ($repeats ? "\n> :repeat: *RECURRING service* - this created " . $repeats . ' visits, through to ' . $lastPretty
                    . '. If that was not intended, turn recurrence off for "' . bk_clean($svcNm !== '' ? $svcNm : 'this service') . '" in SimplyBook.' : '')
        . ($note !== '' ? "\n> " . bk_clean(substr($note, 0, 200)) : '')
        . ($snap['phone'] !== '' ? "\n> tel: " . bk_clean($snap['phone']) : ''));
    out(array('ok' => true, 'id' => $bid, 'when' => $pretty, 'pending' => !$confirmed,
              'repeats' => $repeats, 'last' => $lastPretty));
}

/* Fill gaps in OUR copy of the customer's details from their SimplyBook client.
   The portal calls this once, lazily, when its details card has nothing to show
   and the record is linked to SimplyBook - so an address (or number) that only
   ever existed on the booking side stops being invisible to the person it
   belongs to.

   Three rules make a second writer on this record safe:
     1. FILL ONLY WHERE WE ARE EMPTY, re-checked under the lock. The customer's
        own typing always wins - they know where they live - so this can never
        overwrite an edit that landed while SimplyBook was answering.
     2. The HTTP call to SimplyBook happens with NO lock held, the same rule
        customer_snapshot() follows: a slow third party must never stall every
        other write to the store.
     3. A fruitless pull is cooled down for a week (sb_pull_ts), so a customer
        with no address in SimplyBook either does not make us call the API on
        every dashboard load for ever.
   Writes here use this file's db_open/db_save idiom, which takes the SAME
   exclusive lock file as pcm.php's db_lock() - the two cannot interleave. */
if ($action === 'custpull') {
    require_once __DIR__ . '/pcm-phone-lib.php';
    $snap = web_snapshot();
    // Account data belongs to the account holder, exactly as custaddr in pcm.php:
    // a company team member never fills it, and a staff view-as never writes.
    if ($snap['member'] !== '' || !empty($snap['viewas'])) out(array('ok' => true, 'filled' => false, 'why' => 'not_yours'));
    if (!empty($snap['addr']) && ($snap['mobile'] !== '' || $snap['tel'] !== ''))
        out(array('ok' => true, 'filled' => false, 'why' => 'nothing_missing'));
    if ((int)$snap['cid'] <= 0) out(array('ok' => true, 'filled' => false, 'why' => 'no_link'));

    $ckey2 = (string)$snap['key'];
    list($lk0, $db0) = db_open(); db_close($lk0);
    $rec0 = isset($db0['customers'][$ckey2]) ? $db0['customers'][$ckey2] : array();
    if (!empty($rec0['sb_pull_ts']) && (int)$rec0['sb_pull_ts'] > time() - 604800)
        out(array('ok' => true, 'filled' => false, 'why' => 'tried_recently'));

    $client = sb_client_fetch((int)$snap['cid']);
    // A pull that FAILED must not be cached as "they have nothing" - no stamp,
    // so the next visit tries again.
    if ($client === null) out(array('ok' => true, 'filled' => false, 'why' => 'sb_unavailable'));
    $pulledAddr = addr_from_sb($client);
    $pulledPhone = pcm_phone_norm(isset($client['phone']) ? $client['phone'] : '');

    $filled = array();
    list($lk, $db) = db_open();
    if (isset($db['customers'][$ckey2])) {
        $c =& $db['customers'][$ckey2];
        if (empty($c['addr']) && $pulledAddr !== null) {
            $c['addr'] = $pulledAddr + array('ts' => time(), 'by' => 'simplybook');
            $filled[] = 'address';
        }
        if ($pulledPhone !== '' && empty($c['mobile']) && empty($c['tel'])) {
            // SimplyBook holds ONE number; file it as the mobile when it is one.
            if (preg_match('/^\+447\d{9}$/', $pulledPhone)) { $c['mobile'] = $pulledPhone; $filled[] = 'mobile'; }
            else { $c['tel'] = $pulledPhone; $filled[] = 'landline'; }
            $c['phones_ts'] = time(); $c['phones_by'] = 'simplybook';
        }
        $c['sb_pull_ts'] = time();
        db_save($db);
        unset($c);
    }
    db_close($lk);

    $recN = isset($db['customers'][$ckey2]) ? $db['customers'][$ckey2] : array();
    out(array('ok' => true, 'filled' => count($filled) > 0, 'what' => $filled,
        'addr' => (!empty($recN['addr']) && is_array($recN['addr'])) ? array(
            'line1' => (string)(isset($recN['addr']['line1']) ? $recN['addr']['line1'] : ''),
            'line2' => (string)(isset($recN['addr']['line2']) ? $recN['addr']['line2'] : ''),
            'city' => (string)(isset($recN['addr']['city']) ? $recN['addr']['city'] : ''),
            'postcode' => (string)(isset($recN['addr']['postcode']) ? $recN['addr']['postcode'] : '')) : null,
        'phones' => pcm_phones_payload($recN)));
}

if ($action === 'mybookings') {
    if (!$HAS_ADMIN) fail('nolist');
    if (isset($in['wtoken']) && $in['wtoken'] !== '') { $snap = web_snapshot(); $key = $snap['key']; }   // portal customer
    else $snap = customer_snapshot();                                                                    // app licence key
    if (!$snap['cid'] && $snap['email'] !== '') $snap['cid'] = link_cid_from_email($key, $snap['email']); // auto-link, no password
    if (!$snap['cid']) out(array('ok' => true, 'bookings' => array(), 'needsignin' => true));
    $r = sb_adm('getBookings', array(array('client_id' => $snap['cid'], 'booking_type' => 'non_cancelled',
        'date_from' => date('Y-m-d'), 'order' => 'date_start_asc')));
    if (sb_net($r)) fail('sb_unavailable');
    $rows = isset($r['result']) && is_array($r['result']) ? $r['result'] : array();
    // what the customer told us when booking, so they can see (and correct) it
    list($lkN, $dbN) = db_open(); db_close($lkN);
    $notes = (isset($dbN['bknote']) && is_array($dbN['bknote'])) ? $dbN['bknote'] : array();
    $list = array();
    foreach ($rows as $b) {
        $start = parse_start($b);
        $ts = strtotime($start);
        if ($ts && $ts < time()) continue;
        $nkey = (string)(int)(isset($b['id']) ? $b['id'] : 0);
        $bnote = isset($notes[$nkey]['t']) ? (string)$notes[$nkey]['t'] : '';
        $list[] = array('id' => (int)(isset($b['id']) ? $b['id'] : 0),
                        'when' => $ts ? date('D j M Y g:ia', $ts) : trim($start),
                        'what' => (string)(isset($b['event_name']) ? $b['event_name'] : (isset($b['event']) ? $b['event'] : 'Service')),
                        'eventId' => (int)(isset($b['event_id']) ? $b['event_id'] : 0),
                        'date' => $ts ? date('Y-m-d', $ts) : '', 'time' => $ts ? date('H:i', $ts) : '',
                        'note' => $bnote);
        if (count($list) >= 10) break;
    }
    out(array('ok' => true, 'bookings' => $list));
}

// Customer edits what they told us about a visit ("actually it's number 21"). Same
// ownership proof as cancel/change: the booking's SimplyBook client must be this
// signed-in customer.
if ($action === 'booknote') {
    if (!$HAS_ADMIN) fail('not_configured');
    if (isset($in['wtoken']) && $in['wtoken'] !== '') { $snap = web_snapshot(); $key = $snap['key']; }
    else $snap = customer_snapshot();
    if (!$snap['cid'] && $snap['email'] !== '') $snap['cid'] = link_cid_from_email($key, $snap['email']);
    $bid = (int)(isset($in['id']) ? $in['id'] : 0);
    if ($bid <= 0 || !$snap['cid']) fail('bad_request');
    $det = sb_adm('getBookingDetails', array($bid));
    if (sb_net($det)) fail('sb_unavailable');
    $b = isset($det['result']) && is_array($det['result']) ? $det['result'] : null;
    if (!$b) fail('not_found');
    $bClient = (int)(isset($b['client_id']) ? $b['client_id'] : (isset($b['client']['id']) ? $b['client']['id'] : 0));
    if ($bClient !== $snap['cid']) fail('not_yours');
    $note = trim(preg_replace('/[\x00-\x1F\x7F]+/', ' ', (string)(isset($in['note']) ? $in['note'] : '')));
    $note = substr($note, 0, 400);
    list($lkB, $dbB) = db_open();
    if (!isset($dbB['bknote'])) $dbB['bknote'] = array();
    foreach ($dbB['bknote'] as $nk => $nv) if ((isset($nv['ts']) ? $nv['ts'] : 0) < time() - 7776000) unset($dbB['bknote'][$nk]);
    if ($note === '') unset($dbB['bknote'][(string)$bid]);
    else $dbB['bknote'][(string)$bid] = array('t' => $note, 'ts' => time());
    db_save($dbB); db_close($lkB);
    // the team works from Slack + the diary, so an edit has to reach them too
    pcm_slack_say(':memo: *Booking note updated by the customer* - ' . bk_clean($snap['name'] !== '' ? $snap['name'] : $snap['email'])
        . ' (booking #' . $bid . ')' . ($note !== '' ? "\n> " . bk_clean(substr($note, 0, 200)) : ' _(cleared)_'));
    out(array('ok' => true, 'note' => $note));
}

// ---------------------------------------------------------------------------
// SOS code relay: a signed-in member types the 9-digit Splashtop session code
// into the portal instead of reading it down the phone. The code is a LIVE
// access secret, so the rules are strict:
//   - portal wtoken only (no app/licence path), staff view-as refused
//   - the Slack ping NEVER contains the code - it is visible only in the
//     staff-authenticated console
//   - entries live 15 minutes, then purge; 3 submissions/hour per account
// Security is equivalent to reading the code aloud - plus attribution, since
// every submission is tied to a signed-in member.
if ($action === 'soscode') {
    // the portal (web session) - or, since 365 PC Manager v29, the app itself: its "Let a techie connect" button opens
    // Splashtop SOS and the customer types the code into the app (its licence key + a machine registered to it).
    // The portal never sends a key, so its cookie sign-in path is unchanged.
    $fromApp = ($key !== '' && (!isset($in['wtoken']) || (string)$in['wtoken'] === ''));
    if ($fromApp) { $snap = customer_snapshot(); $snap['key'] = $key; }
    else {
        $snap = web_snapshot();
        if (!empty($snap['viewas'])) fail('not_you');   // staff impersonating a customer must not file codes
    }
    $code = preg_replace('/\D/', '', (string)(isset($in['code']) ? $in['code'] : ''));
    if (strlen($code) !== 9) fail('bad_code');
    list($lk, $db) = db_open();
    if (!isset($db['sosq'])) $db['sosq'] = array();
    $now = time();
    foreach ($db['sosq'] as $k => $v) if ((isset($v['ts']) ? $v['ts'] : 0) < $now - 900) unset($db['sosq'][$k]);
    $n = 0;
    foreach ($db['sosq'] as $v) if (isset($v['key']) && $v['key'] === $snap['key'] && $v['ts'] > $now - 3600) $n++;
    if ($n >= 3) { db_close($lk); fail('slow_down'); }
    $db['sosq'][bin2hex(random_bytes(8))] = array('key' => $snap['key'],
        'name' => $snap['name'], 'email' => $snap['email'], 'code' => $code, 'ts' => $now, 'seen' => 0);
    db_save($db); db_close($lk);
    pcm_slack_say(':sos: *' . bk_clean($snap['name'] !== '' ? $snap['name'] : $snap['email'])
        . '* has typed in their SOS session code' . ($fromApp ? ' in 365 PC Manager' : '') . ' - open the staff console (Portal → staff sign-in) to see it. It expires in 15 minutes.');
    out(array('ok' => true));
}

// staff console: list pending SOS codes (also purges expired ones)
if ($action === 'soslist') {
    need_staff();
    list($lk, $db) = db_open();
    if (!isset($db['sosq'])) $db['sosq'] = array();
    $now = time(); $codes = array(); $chg = false;
    foreach ($db['sosq'] as $k => $v) {
        if ((isset($v['ts']) ? $v['ts'] : 0) < $now - 900) { unset($db['sosq'][$k]); $chg = true; continue; }
        $codes[] = array('id' => $k, 'name' => (string)$v['name'], 'email' => (string)$v['email'],
            'code' => (string)$v['code'], 'age' => $now - intval($v['ts']));
        if (empty($v['seen'])) { $db['sosq'][$k]['seen'] = 1; $chg = true; }
    }
    if ($chg) db_save($db);
    db_close($lk);
    out(array('ok' => true, 'codes' => $codes));
}

// staff: clear a code once connected (or if it was a mistake)
if ($action === 'sosclear') {
    need_staff();
    $id = preg_replace('/[^a-f0-9]/', '', (string)(isset($in['id']) ? $in['id'] : ''));
    list($lk, $db) = db_open();
    if ($id !== '' && isset($db['sosq'][$id])) { unset($db['sosq'][$id]); db_save($db); }
    db_close($lk);
    out(array('ok' => true));
}

if ($action === 'cancel' || $action === 'change') {
    if (!$HAS_ADMIN) fail('not_configured');
    if (isset($in['wtoken']) && $in['wtoken'] !== '') { $snap = web_snapshot(); $key = $snap['key']; }   // portal customer
    else $snap = customer_snapshot();                                                                    // app licence key
    // A company's appointments are the company's. A staff member can raise one and
    // see when we are coming, but moving or cancelling the firm's visit is the
    // director's call, not a junior's - and getting that wrong means an engineer
    // turning up to a cancelled job.
    if (!empty($snap['mstaff'])) fail('ask_your_manager');
    if (!$snap['cid'] && $snap['email'] !== '') $snap['cid'] = link_cid_from_email($key, $snap['email']);
    $bid = (int)(isset($in['id']) ? $in['id'] : 0);
    if ($bid <= 0 || !$snap['cid']) fail('bad_request');
    // ownership: the booking's client must be THIS signed-in customer
    $det = sb_adm('getBookingDetails', array($bid));
    if (sb_net($det)) fail('sb_unavailable');
    $b = isset($det['result']) && is_array($det['result']) ? $det['result'] : null;
    if (!$b) fail('not_found');
    $bClient = (int)(isset($b['client_id']) ? $b['client_id'] : (isset($b['client']['id']) ? $b['client']['id'] : 0));
    if ($bClient !== $snap['cid']) fail('not_yours');
    $oldStart = strtotime(parse_start($b));

    if ($action === 'cancel') {
        $r = sb_adm('cancelBooking', array($bid));
        if (sb_net($r)) fail('sb_unavailable');
        if (empty($r['result'])) fail('cancel_failed');
        // clear stored next-service only if it pointed at this booking
        list($lk, $db) = db_open();
        if (isset($db['customers'][$key])) {
            $c =& $db['customers'][$key];
            if ($oldStart && (isset($c['next_ts']) ? $c['next_ts'] : 0) == $oldStart) { $c['next'] = ''; unset($c['next_ts']); }
            db_save($db);
        }
        db_close($lk);
        out(array('ok' => true, 'next' => isset($db['customers'][$key]['next']) ? $db['customers'][$key]['next'] : ''));
    }

    // change: reschedule via editBook; fall back to book-new-then-cancel-old
    $eventId = (int)(isset($in['eventId']) ? $in['eventId'] : (isset($b['event_id']) ? $b['event_id'] : 0));
    $date = preg_replace('/[^0-9\-]/', '', (string)(isset($in['date']) ? $in['date'] : ''));
    $time = preg_replace('/[^0-9:]/', '', (string)(isset($in['time']) ? $in['time'] : ''));
    if ($eventId <= 0 || $date === '' || $time === '') fail('bad_request');
    if (strlen($time) === 5) $time .= ':00';
    if (strtotime($date . ' ' . $time) === false) fail('bad_request');
    $au = sb_pub('getAvailableUnits', array($eventId, $date . ' ' . $time, 1));
    if (sb_net($au)) fail('sb_unavailable');
    $unitIds = isset($au['result']) && is_array($au['result']) ? array_values($au['result']) : array();
    if (!count($unitIds)) fail('slot_taken');
    $startTs = strtotime($date . ' ' . $time); $endTs = $startTs + sb_mins_for($eventId) * 60;
    $r = sb_adm('editBook', array($bid, $eventId, (int)$unitIds[0], $snap['cid'],
        $date, $time, date('Y-m-d', $endTs), date('H:i:s', $endTs), 0, array()));
    $okEdit = !sb_net($r) && isset($r['result']) && $r['result'];
    if (!$okEdit) {
        // fallback: book the new slot FIRST via the ADMIN method with this client's id (immune
        // to the "Client authorization required" public-booking config), then cancel the old.
        $nb = sb_adm('book', array($eventId, (int)$unitIds[0], $snap['cid'], $date, $time,
            date('Y-m-d', $endTs), date('H:i:s', $endTs), 0, array(), 1));
        if (sb_net($nb) || !isset($nb['result']) || !is_array($nb['result'])) fail('change_failed');
        $cx = sb_adm('cancelBooking', array($bid));
        if (sb_net($cx) || empty($cx['result'])) {
            // new time is booked but we couldn't remove the old - tell the customer honestly
            $pretty2 = $startTs ? date('D j M Y g:ia', $startTs) : ($date . ' ' . $time);
            stamp_next($startTs, $pretty2);
            out(array('ok' => true, 'when' => $pretty2, 'partial' => true));
        }
    }
    $pretty = $startTs ? date('D j M Y g:ia', $startTs) : ($date . ' ' . $time);
    stamp_next($startTs, $pretty);
    out(array('ok' => true, 'when' => $pretty));
}

// ---------------------------------------------------------------- staff (manager mode)
// Gated by a server-issued session token from a VERIFIED SimplyBook staff login (12h expiry).
function need_staff() {
    global $in, $machine, $STAFF_REC;
    $tok = isset($in['stoken']) ? preg_replace('/[^a-f0-9]/', '', (string)$in['stoken']) : '';
    if ($tok === '') fail('not_staff');
    list($lk, $db) = db_open();
    $s = isset($db['staff'][$tok]) ? $db['staff'][$tok] : null;
    $STAFF_REC = is_array($s) ? $s : array();
    $slide = !empty($s['trust']) ? 2592000 : 43200;   // 30d idle window on a trusted device, else 12h
    $cap   = !empty($s['trust']) ? 7776000 : 43200;   // 90d hard cap on a trusted device, else 12h
    $ok = $s
        && (isset($s['ts'])  ? $s['ts']  : 0) > time() - $slide         // sliding idle window
        && (isset($s['iat']) ? $s['iat'] : 0) > time() - $cap           // absolute cap
        && !empty($s['machine']) && $s['machine'] === $machine;         // STRICTLY bound to its machine (fail closed)
    // refresh the sliding "last seen" at most every ~5 min, so frequent polls (the diary's
    // 15s status poll) don't rewrite the whole shared DB on every single request
    if ($ok && (isset($s['ts']) ? $s['ts'] : 0) < time() - 300) { $db['staff'][$tok]['ts'] = time(); db_save($db); }
    db_close($lk);
    if (!$ok) fail('not_staff');
    return $tok;
}

// staff sign-out: destroy the server-side session token
if ($action === 'stafflogout') {
    $tok = isset($in['stoken']) ? preg_replace('/[^a-f0-9]/', '', (string)$in['stoken']) : '';
    if ($tok !== '') { list($lk, $db) = db_open(); if (isset($db['staff'][$tok])) { unset($db['staff'][$tok]); db_save($db); } db_close($lk); }
    out(array('ok' => true));
}

// staff: the customer book at a glance (for the portal admin panel + app manager mode)
if ($action === 'staffcustomers') {
    need_staff();
    list($lk, $db) = db_open(); db_close($lk);
    $list = array();
    foreach ((isset($db['customers']) ? $db['customers'] : array()) as $k => $c) {
        if (!empty($c['merged_into'])) continue;
        $ms = isset($c['machines']) && is_array($c['machines']) ? $c['machines'] : array();
        $lastSeen = ''; $minVer = 0; $worst = 101;
        foreach ($ms as $m) {
            if (isset($m['seen']) && $m['seen'] > $lastSeen) $lastSeen = $m['seen'];
            $mv = intval(isset($m['ver']) ? $m['ver'] : 0); if ($minVer === 0 || ($mv > 0 && $mv < $minVer)) $minVer = $mv;
            $sc = intval(isset($m['score']) ? $m['score'] : 0); if (count($ms) && $sc < $worst) $worst = $sc;
        }
        // keys are permanent bearer credentials - never ship them wholesale to a browser
        // session. Masked display + a one-way opaque id (stafftier resolves it server-side).
        $list[] = array('id' => substr(sha1('365cid|' . $k), 0, 12), 'keymask' => substr($k, 0, 4) . '····',
            'name' => (string)(isset($c['name']) ? $c['name'] : ''),
            'email' => (string)(isset($c['email']) ? $c['email'] : ''), 'tier' => ((isset($c['tier']) && $c['tier'] === 'pro') ? 'pro' : 'free'),
            'next' => (string)(isset($c['next']) ? $c['next'] : ''), 'pcs' => count($ms),
            'seen' => $lastSeen, 'ver' => $minVer, 'worst' => ($worst === 101 ? -1 : $worst),
            'fam' => isset($c['family']['name']) ? (string)$c['family']['name'] : '');
        if (count($list) >= 400) break;
    }
    out(array('ok' => true, 'customers' => $list));
}

// staff: activate a customer's PC Manager - creates the record + key, returns the one-click
// activation link to text/email/paste into a Splashtop chat. Same key format as the admin console.
if ($action === 'staffadd') {
    need_staff();
    $nm = trim(substr((string)(isset($in['name']) ? $in['name'] : ''), 0, 60));
    $em = strtolower(trim(substr((string)(isset($in['email']) ? $in['email'] : ''), 0, 120)));
    $tier = (isset($in['tier']) && $in['tier'] === 'pro') ? 'pro' : 'free';
    if ($nm === '') fail('no_name');
    if ($em !== '' && !filter_var($em, FILTER_VALIDATE_EMAIL)) fail('bad_email');
    list($lk, $db) = db_open();
    $a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    do {
        $nk = '';
        for ($i = 0; $i < 12; $i++) { $nk .= $a[random_int(0, strlen($a) - 1)]; if ($i == 3 || $i == 7) $nk .= '-'; }
    } while (isset($db['customers'][$nk]));   // never overwrite an existing record on a collision
    $db['customers'][$nk] = array('name' => $nm, 'email' => $em, 'tier' => $tier, 'next' => '',
        'created' => gmdate('Y-m-d'), 'via' => 'staffadd', 'machines' => array());
    db_save($db); db_close($lk);
    if ($em !== '') link_cid_from_email($nk, $em);   // link their SimplyBook client now so bookings show without a password
    out(array('ok' => true, 'key' => $nk, 'name' => $nm, 'tier' => $tier,
        'link' => '365pcm://activate/' . $nk,
        // the https link works in EVERY email/chat client and falls back to install guidance;
        // the key travels in the #fragment so it never appears in server access logs
        'weblink' => 'https://365techies.co.uk/activate/#' . $nk));
}

// staff: reveal ONE customer's activation key on demand (re-activating their PC Manager).
// The customer-book table deliberately ships masked keys; this fetches a single key only
// when a staff member explicitly asks, keeping the bulk list unexposed.
if ($action === 'staffkey') {
    need_staff();
    $cid2 = preg_replace('/[^a-f0-9]/', '', (string)(isset($in['cid']) ? $in['cid'] : ''));
    list($lk, $db) = db_open(); db_close($lk);
    foreach ($db['customers'] as $k2 => $c2) {
        if (!empty($c2['merged_into'])) continue;
        if (substr(sha1('365cid|' . $k2), 0, 12) === $cid2) {
            out(array('ok' => true, 'key' => $k2,
                'link' => '365pcm://activate/' . $k2,
                'weblink' => 'https://365techies.co.uk/activate/#' . $k2));
        }
    }
    fail('unknown_customer');
}

// staff: reset a customer's BOOKING password so the app's "Sign in with your booking account"
// works at the visit. 365 PC Manager checks email + password against SimplyBook
// (getClientInfoByLoginPassword), so a customer who cannot remember it cannot be signed in by
// us any other way; the website portal is passwordless (codes) and unaffected. The new password
// is shown ONCE to the signed-in staff member and typed into the app there and then. SimplyBook
// is told not to email it, Slack gets the fact but never the password, nothing is stored here.
if ($action === 'staffapppass') {
    need_staff();
    global $HAS_ADMIN, $STAFF_REC;
    if (!$HAS_ADMIN) fail('sb_unavailable');
    require_once __DIR__ . '/pcm-apppass-lib.php';
    $cid = (int)(isset($in['cid']) ? $in['cid'] : 0);
    $email = strtolower(trim((string)(isset($in['email']) ? $in['email'] : '')));
    if ($cid <= 0 && ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL))) fail('bad_email');
    if ($cid <= 0) {
        // no client id on the row: the client with exactly this email, and only if there is just one
        $r0 = sb_adm('getClientList', array($email, 20));
        if (sb_net($r0) || !isset($r0['result']) || !is_array($r0['result'])) fail('sb_unavailable');
        $hits = array();
        foreach ($r0['result'] as $cli0) {
            $ce = strtolower(trim((string)(isset($cli0['email']) ? $cli0['email'] : '')));
            $id0 = (int)(isset($cli0['id']) ? $cli0['id'] : 0);
            if ($id0 > 0 && $ce === $email) $hits[$id0] = 1;
        }
        if (count($hits) === 0) fail('unknown_client');
        if (count($hits) > 1) fail('duplicate_client');
        $cid = (int)key($hits);
    }
    $cli = sb_client_fetch($cid);
    if (!$cli) fail('unknown_client');
    $cemail = strtolower(trim((string)(isset($cli['email']) ? $cli['email'] : '')));
    $cname = bk_clean(isset($cli['name']) ? $cli['name'] : '');
    if ($cemail === '') fail('no_email');   // SimplyBook's login IS the email: nothing to sign in with otherwise
    // three resets per client per hour: a mistyped password is one retry, not a stream of them
    list($lk, $db) = db_open();
    if (!isset($db['apppw']) || !is_array($db['apppw'])) $db['apppw'] = array();
    $now = time();
    foreach ($db['apppw'] as $k2 => $ts2) {
        $keep = array_values(array_filter((array)$ts2, function ($t) use ($now) { return $t > $now - 3600; }));
        if (count($keep)) $db['apppw'][$k2] = $keep; else unset($db['apppw'][$k2]);
    }
    if (count(isset($db['apppw'][$cid]) ? $db['apppw'][$cid] : array()) >= 3) { db_close($lk); fail('slow_down'); }
    $db['apppw'][$cid][] = $now;
    db_save($db); db_close($lk);
    $pw = apppass_generate();
    if (!apppass_ok($pw)) fail('internal');
    $r = sb_adm('changeClientPassword', array($cid, $pw, false));   // false = SimplyBook sends no email
    if (sb_net($r)) fail('sb_unavailable');
    if (isset($r['error']) && empty($r['result'])) fail('sb_refused');
    // prove it before the staffer types it: the same call the app makes
    $chk = sb_pub('getClientInfoByLoginPassword', array($cemail, $pw));
    $verified = (!sb_net($chk) && isset($chk['result']['id']) && (int)$chk['result']['id'] === $cid);
    $who = staff_first();
    if ($who === '') $who = 'staff';
    pcm_slack_say(':key: *' . bk_clean($who) . '* reset the app sign-in password for *' . ($cname !== '' ? $cname : $cemail)
        . '* at the visit (shown once in the staff portal, not emailed).');
    out(array('ok' => true, 'cid' => $cid, 'email' => $cemail, 'name' => $cname, 'password' => $pw, 'verified' => $verified));
}

// staff: view the portal AS a customer (testing + "what does this customer see?").
// Mints a SHORT (12h) machine-bound customer session; staff already see all this data,
// so this changes presentation, not privilege.
if ($action === 'staffview') {
    need_staff();
    $cid2 = preg_replace('/[^a-f0-9]/', '', (string)(isset($in['cid']) ? $in['cid'] : ''));
    list($lk, $db) = db_open();
    $found = '';
    foreach ($db['customers'] as $k2 => $c2) {
        if (!empty($c2['merged_into'])) continue;
        if (substr(sha1('365cid|' . $k2), 0, 12) === $cid2) { $found = $k2; break; }
    }
    if ($found === '') { db_close($lk); fail('unknown_customer'); }
    $wtok = bin2hex(random_bytes(24));
    if (!isset($db['websessions'])) $db['websessions'] = array();
    $db['websessions'][$wtok] = array('key' => $found, 'ts' => time(), 'iat' => time(), 'machine' => $machine, 'viewas' => true);
    db_save($db); db_close($lk);
    $c = $db['customers'][$found];
    out(array('ok' => true, 'wtoken' => $wtok, 'name' => (string)(isset($c['name']) ? $c['name'] : ''),
        'tier' => ((isset($c['tier']) && $c['tier'] === 'pro') ? 'pro' : 'free')));
}

// staff: delete a customer record (test keys, duplicates). Destructive - the portal
// confirms with the customer's name first. Cleans their web sessions, SOS shots and
// stored WiFi survey packs too.
if ($action === 'staffdel') {
    need_staff();
    $cid2 = preg_replace('/[^a-f0-9]/', '', (string)(isset($in['cid']) ? $in['cid'] : ''));
    list($lk, $db) = db_open();
    $found = '';
    foreach ($db['customers'] as $k2 => $c2) {
        if (substr(sha1('365cid|' . $k2), 0, 12) === $cid2) { $found = $k2; break; }
    }
    if ($found === '') { db_close($lk); fail('unknown_customer'); }
    $nm = (string)(isset($db['customers'][$found]['name']) ? $db['customers'][$found]['name'] : '');
    // GDPR: the record's wifi index is the only map to their stored survey packs (room
    // photos inside) - unlink each pcm-wifi-<24hex>.json before the index goes. Id
    // re-validated so a tampered index can't reach outside the pattern.
    $wifiL = isset($db['customers'][$found]['wifi']) && is_array($db['customers'][$found]['wifi']) ? $db['customers'][$found]['wifi'] : array();
    foreach ($wifiL as $wfx) {
        $wid = (string)(isset($wfx['id']) ? $wfx['id'] : '');
        if (preg_match('/^[a-f0-9]{24}$/', $wid)) @unlink(__DIR__ . '/pcm-wifi-' . $wid . '.json');
    }
    unset($db['customers'][$found]);
    if (isset($db['websessions'])) foreach ($db['websessions'] as $wk => $wv) if ((isset($wv['key']) ? $wv['key'] : '') === $found) unset($db['websessions'][$wk]);
    db_save($db); db_close($lk);
    $kh = substr(hash('sha256', $found), 0, 12);
    foreach ((glob(__DIR__ . '/pcm-sos-' . $kh . '-*.jpg') ?: array()) as $f) @unlink($f);
    out(array('ok' => true, 'name' => $nm));
}

// staff: SET a customer's tier (idempotent - a stale panel can't accidentally invert).
// Takes the opaque id from staffcustomers, resolved server-side; their app follows on check-in.
if ($action === 'stafftier') {
    need_staff();
    $cid2 = preg_replace('/[^a-f0-9]/', '', (string)(isset($in['cid']) ? $in['cid'] : ''));
    $want = (isset($in['tier']) && $in['tier'] === 'pro') ? 'pro' : 'free';
    list($lk, $db) = db_open();
    $found = '';
    foreach ($db['customers'] as $k2 => $c2) {
        if (!empty($c2['merged_into'])) continue;
        if (substr(sha1('365cid|' . $k2), 0, 12) === $cid2) { $found = $k2; break; }
    }
    if ($found === '') { db_close($lk); fail('unknown_customer'); }
    $db['customers'][$found]['tier'] = $want;
    db_save($db); db_close($lk);
    out(array('ok' => true, 'tier' => $want));
}

// staff: the 365 PC Manager licence(s) of ONE SimplyBook client, for the diary's contact card - so
// switching a customer to Pro at the visit is one tap on their booking, not a hunt through the licence
// table (owner, 6 Oct 2026: "takes me seconds rather than spending minutes trying to find everything").
// Matched on the SimplyBook client id first: the app's "Link this PC" sign-in stores the verified id
// (signin above). Only when no record carries it, on the exact email - never a record linked to a
// DIFFERENT SimplyBook client. Read-only: the change itself is stafftier, with these same opaque ids.
if ($action === 'staffpcmlic') {
    need_staff();
    $cid = (int)(isset($in['cid']) ? $in['cid'] : 0);
    $em = strtolower(trim(substr((string)(isset($in['email']) ? $in['email'] : ''), 0, 120)));
    if ($em !== '' && !filter_var($em, FILTER_VALIDATE_EMAIL)) $em = '';
    if ($cid <= 0 && $em === '') fail('bad_request');
    list($lk, $db) = db_open(); db_close($lk);
    $byId = array(); $byEm = array();
    foreach ((isset($db['customers']) ? $db['customers'] : array()) as $k => $c) {
        if (!is_array($c) || !empty($c['merged_into'])) continue;
        $sid = (int)(isset($c['sb_client_id']) ? $c['sb_client_id'] : 0);
        if ($cid > 0 && $sid === $cid) { $byId[$k] = $c; continue; }
        if ($em === '' || ($cid > 0 && $sid > 0)) continue;   // linked to someone else's booking account
        $ce = strtolower(trim((string)(isset($c['email']) ? $c['email'] : '')));
        $se = strtolower(trim((string)(isset($c['sb_email']) ? $c['sb_email'] : '')));
        if ($ce === $em || $se === $em) $byEm[$k] = $c;
    }
    $hits = count($byId) ? $byId : $byEm;
    $list = array();
    foreach ($hits as $k => $c) {
        $ms = isset($c['machines']) && is_array($c['machines']) ? $c['machines'] : array();
        $lastSeen = ''; $maxVer = 0;
        foreach ($ms as $m) {
            if (isset($m['seen']) && $m['seen'] > $lastSeen) $lastSeen = $m['seen'];
            $mv = intval(isset($m['ver']) ? $m['ver'] : 0); if ($mv > $maxVer) $maxVer = $mv;
        }
        // same masked key + one-way id as staffcustomers: the bearer key never reaches the browser
        $list[] = array('id' => substr(sha1('365cid|' . $k), 0, 12), 'keymask' => substr($k, 0, 4) . '····',
            'name' => (string)(isset($c['name']) ? $c['name'] : ''),
            'tier' => ((isset($c['tier']) && $c['tier'] === 'pro') ? 'pro' : 'free'),
            'pcs' => count($ms), 'seen' => $lastSeen, 'ver' => $maxVer);
    }
    usort($list, function ($a, $b) { return strcmp($b['seen'], $a['seen']); });   // the PC in use now first
    out(array('ok' => true, 'match' => (count($byId) ? 'account' : (count($byEm) ? 'email' : '')),
        'lic' => array_slice($list, 0, 5)));
}

// ---------------------------------------------------------------- the customer book (pcm-custbook-lib.php)
// Owner, 6 Oct 2026: "search for customers there, and bring up their details, and also be able to edit their contact
// details in the portal ... mobile numbers, telephone numbers, the company details". Search across the job list, the
// PC Manager records, SimplyBook's clients and the book; open one person; save edits into the book (never into
// SimplyBook - see the library's header). Staff only, like everything above.
function cb_local_rows() {
    list($lkC, $dbC) = db_open(); db_close($lkC);
    $jd = @json_decode((string)@file_get_contents(__DIR__ . '/pcm-jobs.json'), true);
    return array_merge(cb_rows_from_jobs(isset($jd['jobs']) && is_array($jd['jobs']) ? $jd['jobs'] : array()),
                       cb_rows_from_pcm(isset($dbC['customers']) ? $dbC['customers'] : array()),
                       cb_rows_from_book(cb_book_read()));
}
/* The person's SimplyBook client, added to the rows when the ref or the person names one (else looked up by their
   exact email, unique on SimplyBook's side). Best effort: the card works without it. */
function cb_with_sb($rows, $ref) {
    global $HAS_ADMIN;
    if (!$HAS_ADMIN) return $rows;
    $cid = (strpos($ref, 's:') === 0) ? (int)substr($ref, 2) : 0;
    $g = cb_cluster_for($rows, $ref);
    if ($cid <= 0 && $g !== null) foreach ($g as $i) if (!empty($rows[$i]['sb'])) { $cid = (int)$rows[$i]['sb']; break; }
    if ($cid > 0) {
        foreach ($rows as $r) if ($r['src'] === 'sb' && (int)$r['id'] === $cid) return $rows;
        $cli = sb_client_fetch($cid);
        if (is_array($cli)) { $cli['id'] = $cid; return array_merge($rows, cb_rows_from_sb(array($cli))); }
        return $rows;
    }
    if ($g === null) return $rows;
    $email = ''; foreach ($g as $i) if ($rows[$i]['email'] !== '') { $email = $rows[$i]['email']; break; }
    if ($email === '') return $rows;
    $r0 = sb_adm('getClientList', array($email, 5));
    if (sb_net($r0) || !isset($r0['result']) || !is_array($r0['result'])) return $rows;
    $hits = array(); foreach ($r0['result'] as $c) if (is_array($c) && cb_email(isset($c['email']) ? $c['email'] : '') === $email) $hits[] = $c;
    return count($hits) === 1 ? array_merge($rows, cb_rows_from_sb($hits)) : $rows;   // two clients with one email: neither
}
function cb_ref_in() {
    global $in;
    $ref = (string)(isset($in['ref']) ? $in['ref'] : '');
    return preg_match('/^[bsekpj]:[A-Za-z0-9@._+\-]{1,120}$/', $ref) ? $ref : '';
}
function cb_card($rows, $g) {
    $p = cb_person($rows, $g);
    $p['joblist'] = cb_jobs_of($rows, $g);
    $hist = array();
    foreach ($g as $i) if ($rows[$i]['src'] === 'book') {
        $b = cb_book_read(); $rec = isset($b['people'][$rows[$i]['id']]) ? $b['people'][$rows[$i]['id']] : array();
        foreach (array_slice(isset($rec['history']) ? (array)$rec['history'] : array(), -5) as $h) $hist[] = $h;
    }
    $p['history'] = $hist;
    return $p;
}
if ($action === 'custfind') {
    need_staff();
    require_once __DIR__ . '/pcm-custbook-lib.php';
    $q = cb_str(isset($in['q']) ? $in['q'] : '', 60);
    if (strlen($q) < 2) out(array('ok' => true, 'people' => array()));
    $rows = cb_local_rows();
    $sbState = 'off';
    if ($HAS_ADMIN && strlen($q) >= 3) {   // people who only ever booked are on SimplyBook alone
        $r = sb_adm('getClientList', array($q, 10));
        if (!sb_net($r) && isset($r['result']) && is_array($r['result'])) { $rows = array_merge($rows, cb_rows_from_sb($r['result'])); $sbState = 'ok'; }
        else $sbState = 'unavailable';
    }
    out(array('ok' => true, 'people' => cb_search($rows, $q, 25), 'sb' => $sbState));
}
if ($action === 'custget') {
    need_staff();
    require_once __DIR__ . '/pcm-custbook-lib.php';
    $ref = cb_ref_in(); if ($ref === '') fail('bad_request');
    $rows = cb_with_sb(cb_local_rows(), $ref);
    $g = cb_cluster_for($rows, $ref);
    if ($g === null) fail('unknown_customer');
    out(array('ok' => true, 'person' => cb_card($rows, $g)));
}
if ($action === 'custsave') {
    need_staff();
    require_once __DIR__ . '/pcm-custbook-lib.php';
    $ref = cb_ref_in(); if ($ref === '') fail('bad_request');
    list($v, $errs) = cb_read(isset($in['v']) ? $in['v'] : array());
    if ($errs) out(array('ok' => false, 'error' => 'check', 'errors' => $errs));
    $rows = cb_with_sb(cb_local_rows(), $ref);   // read outside the book's lock: SimplyBook is a network call
    if (cb_cluster_for($rows, $ref) === null) fail('unknown_customer');
    $who = staff_first(); if ($who === '') $who = 'staff';
    $res = cb_book_locked(function ($book) use ($rows, $ref, $v, $who) {
        // the book as it is NOW (another save may have landed): its rows replace the ones read before the lock
        $rows2 = array_merge(array_values(array_filter($rows, function ($r) { return $r['src'] !== 'book'; })), cb_rows_from_book($book));
        $g = cb_cluster_for($rows2, $ref);
        if ($g === null) return array('ok' => false, 'error' => 'unknown_customer');
        list($book2, $id, $changed) = cb_save_into($book, $rows2, $g, $v, $who, time());
        if ($id === '') return array('ok' => true, 'id' => '', 'changed' => array());   // nothing changed: nothing written
        return array('ok' => true, 'id' => $id, 'changed' => $changed, 'data' => $book2);
    });
    if (empty($res['ok'])) fail(isset($res['error']) ? $res['error'] : 'store');
    $ref2 = $res['id'] !== '' ? 'b:' . $res['id'] : $ref;
    $rows3 = array_merge(array_values(array_filter($rows, function ($r) { return $r['src'] !== 'book'; })), cb_rows_from_book(cb_book_read()));
    $g3 = cb_cluster_for($rows3, $ref2);
    out(array('ok' => true, 'changed' => $res['changed'], 'person' => $g3 !== null ? cb_card($rows3, $g3) : null));
}

/* "Log a job we've done" (owner, 6 Oct 2026: a quick remote 365 Quick Fix for a customer who is in the customer book but
   not SimplyBook - "a little description of what I've done ... on the booking"). One press:
   1. the job card - the New customer card with "Work carried out" - to #sos-jobs-in-out and the job list, so it is
      invoiceable and on their customer card (nj_create);
   2. if asked: SimplyBook today, the next free slot for that service, under their client (made if they have none),
      marked Completed there and here, with the note on the diary row. No free slot left today = the job alone, and
      the answer says why. Their PC Manager record is linked to the client, so their own portal lists it too. */
if ($action === 'custlogjob') {
    need_staff();
    require_once __DIR__ . '/pcm-custbook-lib.php';
    require_once __DIR__ . '/pcm-newjob-lib.php';
    $what = trim(str_replace(array("\r\n", "\r"), "\n", preg_replace('/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]+/', ' ', (string)(isset($in['what']) ? $in['what'] : ''))));
    if ($what === '') out(array('ok' => false, 'error' => 'check', 'errors' => array('what' => 'Say what you did - a line or two.')));
    $what = function_exists('mb_substr') ? mb_substr($what, 0, 1500) : substr($what, 0, 1500);
    /* 6 Oct 2026 (owner, a job done "an hour and a half ago"): WHEN it was done - today, a time that has passed (or
       now). SimplyBook will not take a time that has gone (its book method refuses any time not available), so the
       diary shows the job at this time from OUR record (agenda: 'logged' rows); SimplyBook only gets a copy if it
       has a free slot today. */
    $doneTs = time();
    $at = preg_replace('/[^0-9:]/', '', (string)(isset($in['at']) ? $in['at'] : ''));
    if ($at !== '') {
        if (!preg_match('/^(\d{1,2}):(\d{2})$/', $at, $am) || (int)$am[1] > 23 || (int)$am[2] > 59) out(array('ok' => false, 'error' => 'check', 'errors' => array('at' => 'A time like 11:30, please.')));
        $doneTs = (int)strtotime(date('Y-m-d') . sprintf(' %02d:%02d:00', (int)$am[1], (int)$am[2]));
        if ($doneTs > time() + 600) out(array('ok' => false, 'error' => 'check', 'errors' => array('at' => 'That is later than now - for a job still to come, use Book a new job.')));
    }
    $eventId = (int)(isset($in['eventId']) ? $in['eventId'] : 0);
    $svcName = '';
    if ($eventId > 0) { foreach (sb_services() as $sv) if ((int)$sv['id'] === $eventId) $svcName = (string)$sv['name']; if ($svcName === '') fail('bad_service'); }
    $jobtype = (string)(isset($in['jobtype']) ? $in['jobtype'] : 'Remote');
    /* Who: a person Find a customer knows (ref), else - from Book a new job, for somebody typed in there - the name,
       number and email given (with their SimplyBook client id when it was picked from SimplyBook's list). */
    $ref = cb_ref_in(); $g = null; $rows = array();
    if ($ref !== '') { $rows = cb_with_sb(cb_local_rows(), $ref); $g = cb_cluster_for($rows, $ref); }
    if ($g !== null) { $p = cb_person($rows, $g); $f = $p['fields']; $sbId = (int)$p['sb']; }
    else {
        $pi = isset($in['person']) && is_array($in['person']) ? $in['person'] : array();
        $nm = cb_str(isset($pi['name']) ? $pi['name'] : '', 90);
        if ($nm === '') fail($ref !== '' ? 'unknown_customer' : 'bad_request');
        $f = array('name' => $nm, 'company' => '', 'address' => '', 'postcode' => '', 'website' => '', 'note' => '',
            'phone' => cb_str(isset($pi['phone']) ? $pi['phone'] : '', 30), 'mobile' => '', 'email' => cb_email(isset($pi['email']) ? $pi['email'] : ''));
        $sbId = (int)(isset($pi['cid']) ? $pi['cid'] : 0);
    }
    $first = staff_first(); if ($first === '') $first = 'Staff'; $who = $first;
    $name = $f['name'] !== '' ? $f['name'] : $f['company'];
    $note = function_exists('mb_substr') ? mb_substr($what, 0, 300) : substr($what, 0, 300);
    $nj = nj_create(array('name' => $name, 'company' => $f['company'], 'address' => $f['address'], 'postcode' => $f['postcode'],
        'phone' => $f['phone'], 'mobile' => $f['mobile'], 'email' => $f['email'], 'website' => $f['website'], 'jobtype' => $jobtype,
        'issue' => $svcName !== '' ? $svcName : 'Quick job', 'work' => $what, 'assigned' => $first, 'priority' => '',
        'price' => (string)(isset($in['price']) ? $in['price'] : '')), $first, 'a job logged as done',
        // kept on the job: the diary shows it on its day at this time (agenda), with what we did
        array('done_at' => $doneTs, 'done_svc' => $svcName !== '' ? $svcName : 'Quick job', 'done_note' => $note, 'done_cid' => $sbId, 'done_by' => $who));
    if (empty($nj['ok'])) out(array('ok' => false, 'error' => 'check', 'errors' => isset($nj['errors']) ? $nj['errors'] : array(), 'why' => isset($nj['error']) ? $nj['error'] : ''));
    $bk = array('ok' => false, 'why' => 'not_asked');
    if (!empty($in['book'])) {
        if (!$HAS_ADMIN) $bk['why'] = 'not_configured';
        elseif ($eventId <= 0) $bk['why'] = 'no_service';
        else {
            list($slot, $why) = staff_today_slot($eventId);
            if ($slot === '') $bk['why'] = $why;
            else {
                $ce = $f['email'];
                $cp = substr(preg_replace('/[^0-9+]/', '', $f['mobile'] !== '' ? $f['mobile'] : $f['phone']), 0, 20);
                $res = staff_book_core($eventId, date('Y-m-d'), $slot, $sbId, substr($name, 0, 60), $cp, $ce);
                if (empty($res['ok'])) { $bk['why'] = $res['error']; if (!empty($res['sberr'])) $bk['sberr'] = $res['sberr']; }
                else {
                    $bid = (int)$res['id']; $sbOk = false; $sbId = (int)$res['cid'];
                    $sid = sb_status_id('completed');
                    if ($sid > 0 && $bid > 0) { $r2 = sb_adm('setStatus', array($bid, $sid)); $sbOk = !sb_net($r2) && !empty($r2['result']); }
                    if ($bid > 0) {
                        list($lk, $db) = db_open();
                        if (!isset($db['bkmeta'])) $db['bkmeta'] = array();
                        // logged_job: the diary shows this job ONCE, at the time it was done (the logged row), not again at the slot
                        $db['bkmeta'][(string)$bid] = array('st' => 'completed', 'ts' => time(), 'sb' => $sbOk ? 1 : 0, 'src' => 'portal',
                            'note' => $note, 'by' => $who, 'logged_job' => (string)$nj['id']);
                        // their PC Manager record with this email, not yet linked: link it to the client (their portal lists the booking)
                        $toLink = array();
                        if ($ce !== '') foreach ((isset($db['customers']) ? $db['customers'] : array()) as $k3 => $c3)
                            if (is_array($c3) && empty($c3['merged_into']) && empty($c3['sb_client_id']) && strtolower(trim((string)(isset($c3['email']) ? $c3['email'] : ''))) === $ce) $toLink[] = $k3;
                        db_save($db); db_close($lk);
                        foreach ($toLink as $k3) link_cid_from_email($k3, $ce, true);
                    }
                    $bk = array('ok' => true, 'id' => $bid, 'when' => date('D j M g:ia', (int)$res['ts']), 'completed_in_sb' => $sbOk);
                    pcm_slack_say(':white_check_mark: *Done job logged* - ' . bk_clean($name) . ($f['company'] !== '' && $f['company'] !== $name ? ' (' . bk_clean($f['company']) . ')' : '')
                        . ' - ' . bk_clean($svcName) . ', done ' . date('g:ia', $doneTs) . ' - copied into SimplyBook at ' . $bk['when'] . ' and marked completed' . bk_by());
                }
            }
        }
    }
    // the job remembers its SimplyBook copy (and client): the diary row's Details card, and no double row
    if ($bk['ok']) {
        $jid = (string)$nj['id']; $bidS = (int)$bk['id'];
        sj_jobs_locked(function ($d) use ($jid, $bidS, $sbId) {
            foreach ($d['jobs'] as $i => $j) if (is_array($j) && (string)(isset($j['id']) ? $j['id'] : '') === $jid) { $d['jobs'][$i]['done_bid'] = $bidS; $d['jobs'][$i]['done_cid'] = $sbId; return array('ok' => true, 'data' => $d); }
            return array('ok' => false);
        });
    }
    out(array('ok' => true, 'job' => array('id' => $nj['id'], 'slack' => !empty($nj['slack'])), 'booking' => $bk, 'done_at' => date('g:ia', $doneTs)));
}

// staff: quick client search for the book-a-new-job flow (existing customers by name/phone)
if ($action === 'staffclients') {
    if (!$HAS_ADMIN) fail('not_configured');
    need_staff();
    $q = trim(substr((string)(isset($in['q']) ? $in['q'] : ''), 0, 60));
    if (strlen($q) < 2) out(array('ok' => true, 'clients' => array()));
    $r = sb_adm('getClientList', array($q, 10));
    if (sb_net($r)) fail('sb_unavailable');
    $list = array();
    foreach ((isset($r['result']) && is_array($r['result']) ? $r['result'] : array()) as $cli) {
        $list[] = array('id' => (int)(isset($cli['id']) ? $cli['id'] : 0),
                        'name' => (string)(isset($cli['name']) ? $cli['name'] : ''),
                        'email' => (string)(isset($cli['email']) ? $cli['email'] : ''),
                        'phone' => (string)(isset($cli['phone']) ? $cli['phone'] : ''));
        if (count($list) >= 8) break;
    }
    out(array('ok' => true, 'clients' => $list));
}

/* The booking itself, shared by staffbook and custlogjob (6 Oct 2026): an existing SimplyBook client, or a new one made
   silently (addClient dedupes), then the ADMIN book method on a unit that is free at that time. Returns ok, id (the
   booking), cid (the client) - or ok false with error (+ sberr, SimplyBook's own complaint). */
function staff_book_core($eventId, $date, $time, $cid, $cn, $cp, $ce) {
    if ($cid <= 0) {
        $cdArr = array('name' => $cn);
        if ($ce !== '') $cdArr['email'] = $ce;
        if ($cp !== '') $cdArr['phone'] = $cp;
        $cfF2 = null;
        $ac = sb_add_client_smart($cdArr, $cfF2);
        if (sb_net($ac) || empty($ac['result'])) return array('ok' => false, 'error' => 'sb_unavailable');
        $cid = (int)$ac['result'];
    }
    if ($cid <= 0) return array('ok' => false, 'error' => 'booking_failed');
    $au = sb_pub('getAvailableUnits', array($eventId, $date . ' ' . $time, 1));
    if (sb_net($au)) return array('ok' => false, 'error' => 'sb_unavailable');
    $unitIds = isset($au['result']) && is_array($au['result']) ? array_values($au['result']) : array();
    if (!count($unitIds)) return array('ok' => false, 'error' => 'slot_taken');
    $startTs = strtotime($date . ' ' . $time);
    $endTs = $startTs + sb_mins_for($eventId) * 60;
    $r = sb_adm('book', array($eventId, (int)$unitIds[0], $cid, $date, $time,
        date('Y-m-d', $endTs), date('H:i:s', $endTs), 0, array(), 1));
    if (sb_net($r)) return array('ok' => false, 'error' => 'sb_unavailable');
    $b = isset($r['result']) && is_array($r['result']) ? $r['result'] : null;
    if (!$b) {
        // surface SimplyBook's actual complaint so failures are diagnosable, not mute
        $msg = isset($r['error']['message']) ? substr(preg_replace('/[^\x20-\x7E]/', '', (string)$r['error']['message']), 0, 140) : '';
        return array('ok' => false, 'error' => 'booking_failed', 'sberr' => $msg);
    }
    $bid = 0;
    if (isset($b['bookings'][0]['id'])) $bid = (int)$b['bookings'][0]['id'];
    elseif (isset($b['id'])) $bid = (int)$b['id'];
    return array('ok' => true, 'id' => $bid, 'cid' => $cid, 'ts' => $startTs);
}
/* Today's next free start time for a service (HH:MM:SS), or '' and why. */
function staff_today_slot($eventId) {
    $units = sb_units_for($eventId);
    if (!count($units)) return array('', 'sb_unavailable');
    $today = date('Y-m-d');
    $r = sb_pub('getStartTimeMatrix', array($today, $today, $eventId, $units, 1));
    if (sb_net($r)) return array('', 'sb_unavailable');
    $times = isset($r['result'][$today]) && is_array($r['result'][$today]) ? $r['result'][$today] : array();
    $now = date('H:i:s');
    foreach ($times as $t) {
        $t = (string)$t; if (strlen($t) === 5) $t .= ':00';
        if (preg_match('/^\d\d:\d\d:\d\d$/', $t) && $t >= $now) return array($t, '');
    }
    return array('', 'no_slot_today');
}

// staff: book a new job on a customer's behalf (the phone-call flow). Uses the ADMIN
// book method with a real client id - immune to the public API's "email/phone may be
// mandatory" company config. Existing clients come with their id from the search;
// new customers get a silent addClient (which dedupes) first.
if ($action === 'staffbook') {
    if (!$HAS_ADMIN) fail('not_configured');
    need_staff();
    $eventId = (int)(isset($in['eventId']) ? $in['eventId'] : 0);
    $date = preg_replace('/[^0-9\-]/', '', (string)(isset($in['date']) ? $in['date'] : ''));
    $time = preg_replace('/[^0-9:]/', '', (string)(isset($in['time']) ? $in['time'] : ''));
    if ($eventId <= 0 || $date === '' || $time === '') fail('bad_request');
    if (strlen($time) === 5) $time .= ':00';
    if (strtotime($date . ' ' . $time) === false) fail('bad_request');
    $cid = (int)(isset($in['cid']) ? $in['cid'] : 0);
    $cn = trim(substr((string)(isset($in['name']) ? $in['name'] : ''), 0, 60));
    $cp = trim(substr((string)(isset($in['phone']) ? $in['phone'] : ''), 0, 20));
    $ce = strtolower(trim(substr((string)(isset($in['email']) ? $in['email'] : ''), 0, 120)));
    if ($cid <= 0 && $cn === '') fail('no_name');
    if ($ce !== '' && !filter_var($ce, FILTER_VALIDATE_EMAIL)) fail('bad_email');
    $res = staff_book_core($eventId, $date, $time, $cid, $cn, $cp, $ce);
    if (empty($res['ok'])) {
        if ($res['error'] === 'booking_failed' && isset($res['sberr'])) out(array('ok' => false, 'error' => 'booking_failed', 'sberr' => $res['sberr']));
        fail($res['error']);
    }
    $bid = (int)$res['id']; $cid = (int)$res['cid'];
    $ts = strtotime($date . ' ' . $time);
    pcm_slack_say(':calendar: *New booking* - ' . ($cn !== '' ? bk_clean($cn) : ('client #' . $cid)) . (isset($in['what']) && $in['what'] !== '' ? ' - ' . bk_clean($in['what']) : '') . ' on ' . ($ts ? date('D j M g:ia', $ts) : ($date . ' ' . $time)) . bk_by());
    out(array('ok' => true, 'id' => $bid, 'when' => $ts ? date('D j M Y g:ia', $ts) : ($date . ' ' . $time)));
}

if ($action === 'agenda') {
    if (!$HAS_ADMIN) fail('not_configured');
    need_staff();
    // default 14 days; the dashboard's customer search may ask for a wider window (max 60)
    $spanDays = max(1, min(60, intval(isset($in['days']) ? $in['days'] : 14)));
    $r = sb_adm('getBookings', array(array('booking_type' => 'non_cancelled',
        'date_from' => date('Y-m-d'), 'date_to' => date('Y-m-d', time() + 86400 * $spanDays), 'order' => 'date_start_asc')));
    if (sb_net($r)) fail('sb_unavailable');
    $rows = isset($r['result']) && is_array($r['result']) ? $r['result'] : array();
    list($lkA, $dbA) = db_open(); db_close($lkA);
    $bm = isset($dbA['bkmeta']) && is_array($dbA['bkmeta']) ? $dbA['bkmeta'] : array();
    /* Numbers we already hold OURSELVES, keyed by email.
       getBookings does not always carry the client's phone - the key is simply
       absent on some rows - so the diary was printing "no number on file" for
       customers whose number is sitting in our own customer file, and in some
       cases was typed by the customer themselves in their portal. This indexes
       the customer file we have ALREADY loaded above for bkmeta, so it costs no
       extra I/O and no extra SimplyBook call.
       Order matters: the customer's own typed mobile is the most current thing
       we have, then their landline, then whatever SimplyBook gave us. */
    $ourPhones = array();
    if (isset($dbA['customers']) && is_array($dbA['customers'])) {
        foreach ($dbA['customers'] as $cRow) {
            if (!is_array($cRow)) continue;
            $cem = strtolower(trim((string)(isset($cRow['email']) ? $cRow['email'] : '')));
            if ($cem === '' || isset($ourPhones[$cem])) continue;
            foreach (array('mobile', 'tel', 'sb_phone', 'phone') as $pf) {
                if (!empty($cRow[$pf])) { $ourPhones[$cem] = (string)$cRow[$pf]; break; }
            }
        }
    }
    $stMap = null;   // SB status-id -> confirmed/completed, built lazily if rows carry status_id
    $list = array();
    foreach ($rows as $b) {
        $start = parse_start($b);
        $ts = strtotime($start);
        if ($ts && $ts < strtotime('today')) continue;   // keep the WHOLE of today in the diary (incl. jobs whose time has passed), not just the next hour onward
        $cname = (string)(isset($b['client']) ? $b['client'] : (isset($b['client_name']) ? $b['client_name'] : ''));
        if ($cname === '' && isset($b['client_id'])) $cname = 'client #' . $b['client_id'];
        // phone lives under different keys depending on the SB response shape
        $ph = '';
        foreach (array('client_phone', 'phone', 'client_mobile') as $pk) if (!empty($b[$pk])) { $ph = (string)$b[$pk]; break; }
        if ($ph === '' && isset($b['client']) && is_array($b['client']) && !empty($b['client']['phone'])) $ph = (string)$b['client']['phone'];
        // email + client id, where getBookings exposes them (else the Details button fetches the full card)
        $em = '';
        foreach (array('client_email', 'email') as $ek) if (!empty($b[$ek])) { $em = (string)$b[$ek]; break; }
        if ($em === '' && isset($b['client']) && is_array($b['client']) && !empty($b['client']['email'])) $em = (string)$b['client']['email'];
        /* SimplyBook gave us nothing, so use the number we hold. EXACT email
           only - the same rule the rest of the integration uses; never match on
           name, because two Smiths must not be merged. psrc tells the portal
           where it came from, so staff can see SimplyBook still needs it. */
        $psrc = '';
        if ($ph === '' && $em !== '') {
            $lem = strtolower(trim($em));
            if (isset($ourPhones[$lem]) && $ourPhones[$lem] !== '') { $ph = $ourPhones[$lem]; $psrc = 'ours'; }
        }
        $cid = (int)(isset($b['client_id']) ? $b['client_id'] : (isset($b['client']) && is_array($b['client']) && isset($b['client']['id']) ? $b['client']['id'] : 0));
        $bid = (int)(isset($b['id']) ? $b['id'] : 0);
        // status: our staff marker first; else SimplyBook's own Status-feature id mapped by
        // name; else SB's legacy confirm flag. So the portal shows the truth from either side.
        $bmr = isset($bm[(string)$bid]) ? $bm[(string)$bid] : null;
        if (is_array($bmr) && !empty($bmr['logged_job'])) continue;   // a done job's SimplyBook copy: the logged row below shows it, at the time it was done
        $st = $bmr ? (string)(isset($bmr['st']) ? $bmr['st'] : (!empty($bmr['confirmed']) ? 'confirmed' : '')) : '';
        if ($st === '' && !(is_array($bmr) && !empty($bmr['cleared'])) && !empty($b['status_id'])) {
            if ($stMap === null) {
                $stMap = array();
                foreach (sb_statuses() as $sx) {
                    $nm2 = strtolower((string)(isset($sx['name']) ? $sx['name'] : ''));
                    $sid2 = intval(isset($sx['id']) ? $sx['id'] : 0);
                    if (strpos($nm2, 'complet') !== false) $stMap[$sid2] = 'completed';
                    else if (strpos($nm2, 'progress') !== false || strpos($nm2, 'started') !== false) $stMap[$sid2] = 'inprogress';
                    else if (strpos($nm2, 'confirm') !== false) $stMap[$sid2] = 'confirmed';
                }
            }
            $sid3 = intval($b['status_id']);
            if (isset($stMap[$sid3])) $st = $stMap[$sid3];
        }
        // NB: SB's is_confirm/is_confirmed just means "not cancelled/awaiting approval" -
        // it is NOT the Status-feature "Confirmed" and must never mark rows confirmed here.
        $list[] = array('id' => $bid,
                        'when' => $ts ? date('D j M g:ia', $ts) : trim($start),
                        'd' => $ts ? date('Y-m-d', $ts) : '',           // structured, for the day view
                        'tm' => $ts ? date('H:i', $ts) : '',
                        'who' => $cname,
                        'phone' => $ph,
                        'psrc' => $psrc,
                        'email' => $em,
                        'cid' => $cid,
                        'st' => $st,
                        'conf' => $st === 'confirmed',
                        'note' => (string)(is_array($bmr) && isset($bmr['note']) ? $bmr['note'] : ''),   // 6 Oct 2026: what we did (Log a job we've done)
                        'what' => (string)(isset($b['event_name']) ? $b['event_name'] : (isset($b['event']) ? $b['event'] : 'Service')),
                        'eventId' => (int)(isset($b['event_id']) ? $b['event_id'] : (isset($b['eventId']) ? $b['eventId'] : (isset($b['service_id']) ? $b['service_id'] : 0))));
        if (count($list) >= 120) break;
    }
    /* 6 Oct 2026 (owner): jobs logged as done in the portal ("Log a job we've done") sit in the diary on their day, at
       the time they were done, already Completed - SimplyBook could not take a time that had passed. A SimplyBook copy
       of one (bkmeta logged_job) was skipped above, so each job shows once. Our own rows: no Actions menu. */
    $jdA = @json_decode((string)@file_get_contents(__DIR__ . '/pcm-jobs.json'), true);
    $fromTs = strtotime('today'); $toTs = $fromTs + 86400 * $spanDays;
    foreach ((isset($jdA['jobs']) && is_array($jdA['jobs']) ? $jdA['jobs'] : array()) as $jA) {
        if (!is_array($jA) || empty($jA['done_at'])) continue;
        $tA = (int)$jA['done_at'];
        if ($tA < $fromTs || $tA >= $toTs) continue;
        $nmA = (string)(isset($jA['name']) ? $jA['name'] : '');
        $coA = (string)(isset($jA['company']) ? $jA['company'] : '');
        $list[] = array('id' => 'L' . preg_replace('/[^0-9A-Za-z]/', '', (string)$jA['id']), 'logged' => 1,
                        'when' => date('D j M g:ia', $tA), 'd' => date('Y-m-d', $tA), 'tm' => date('H:i', $tA),
                        'who' => $nmA . ($coA !== '' && $coA !== $nmA ? ' (' . $coA . ')' : ''),
                        'phone' => (string)(!empty($jA['mobile']) ? $jA['mobile'] : (isset($jA['phone']) ? $jA['phone'] : '')), 'psrc' => '',
                        'email' => (string)(isset($jA['email']) ? $jA['email'] : ''),
                        'cid' => (int)(isset($jA['done_cid']) ? $jA['done_cid'] : 0),
                        'st' => 'completed', 'conf' => false,
                        'what' => (string)(isset($jA['done_svc']) ? $jA['done_svc'] : 'Quick job'),
                        'note' => (string)(isset($jA['done_note']) ? $jA['done_note'] : ''),
                        'by' => (string)(isset($jA['done_by']) ? $jA['done_by'] : ''), 'eventId' => 0);
    }
    out(array('ok' => true, 'bookings' => $list));
}

// staff: full contact card for ONE client (email + phone + postal address) - fetched
// on demand from getClient by id, so the diary list stays a single cheap getBookings
// call. Staff-session only. SimplyBook keeps one standard phone + address1/2/city/zip.
if ($action === 'clientinfo') {
    if (!$HAS_ADMIN) fail('not_configured');
    need_staff();
    $cid = (int)(isset($in['cid']) ? $in['cid'] : 0);
    if ($cid <= 0) fail('bad_request');
    $r = sb_adm('getClient', array($cid));
    // some SimplyBook editions expose the single-client fetch as getClientInfo - fall back
    if (sb_net($r) || (isset($r['error']) && empty($r['result']))) {
        $r2 = sb_adm('getClientInfo', array($cid));
        if (!sb_net($r2) && !empty($r2['result'])) $r = $r2;
    }
    if (sb_net($r)) fail('sb_unavailable');
    $c = isset($r['result']) && is_array($r['result']) ? $r['result'] : array();
    $g = function ($k) use ($c) { return isset($c[$k]) ? trim(preg_replace('/[\x00-\x1F\x7F]+/', ' ', (string)$c[$k])) : ''; };
    /* SimplyBook only has an address if somebody typed one there. When it is blank,
       fall back to the address the customer gave us in their own portal - David needs
       AN address to invoice, not a particular system's copy of one. Ours is marked so
       the card can say where it came from. */
    require_once __DIR__ . '/pcm-phone-lib.php';
    $ours = array('line1'=>'', 'line2'=>'', 'city'=>'', 'postcode'=>'', 'ts'=>0, 'tel'=>'', 'mobile'=>'');
    if ($cid > 0) {
        list($lkA, $dbA) = db_open(); db_close($lkA);
        foreach ((array)(isset($dbA['customers']) ? $dbA['customers'] : array()) as $cRec) {
            if (!is_array($cRec) || (int)(isset($cRec['sb_client_id']) ? $cRec['sb_client_id'] : 0) !== $cid) continue;
            /* The numbers they keep up to date themselves in the portal (pcm-phone-lib.php). */
            $ph = pcm_phones_payload($cRec);
            $ours['tel'] = $ph['tel_display'];
            $ours['mobile'] = $ph['mobile_display'];
            if (!empty($cRec['addr']) && is_array($cRec['addr'])) {
                $ours = array('line1'=>(string)($cRec['addr']['line1'] ?? ''), 'line2'=>(string)($cRec['addr']['line2'] ?? ''),
                              'city'=>(string)($cRec['addr']['city'] ?? ''), 'postcode'=>(string)($cRec['addr']['postcode'] ?? ''),
                              'ts'=>(int)($cRec['addr']['ts'] ?? 0));
            }
            break;
        }
    }
    $sbHas = ($g('address1') !== '' || $g('city') !== '' || $g('zip') !== '');
    $oursHas = ($ours['line1'] !== '' || $ours['city'] !== '' || $ours['postcode'] !== '');
    /* SimplyBook's phone is whatever somebody typed at booking time; when it is
       blank, fall back to the number the customer keeps in their portal (mobile
       first - that is the one a text reaches). Both portal numbers are also sent
       on their own so the card can show them beside SimplyBook's. */
    $oursPhone = $ours['mobile'] !== '' ? $ours['mobile'] : $ours['tel'];
    /* 6 Oct 2026 (owner): "put the company and our numbers on the diary booking card too". The same person as Find a
       customer builds them (the customer book over the job cards and PC Manager, joined to this SimplyBook client):
       their company, and any number we hold that this card does not already show - with where it came from. Read
       only; nothing goes into SimplyBook. Best effort: the card is complete without it. */
    $book = array('ref' => '', 'company' => '', 'company_from' => '', 'nums' => array());
    require_once __DIR__ . '/pcm-custbook-lib.php';
    $cliRow = $c; $cliRow['id'] = $cid;
    $rowsB = array_merge(cb_local_rows(), cb_rows_from_sb(array($cliRow)));
    $gB = cb_cluster_for($rowsB, 's:' . $cid);
    if ($gB !== null) {
        $pB = cb_person($rowsB, $gB);
        $book['ref'] = $pB['ref'];
        $book['company'] = $pB['fields']['company']; $book['company_from'] = $pB['from']['company'];
        $shown = array();
        foreach (array($g('phone') !== '' ? $g('phone') : $oursPhone, $ours['mobile'], $ours['tel']) as $sx) { $k = cb_phone_key($sx); if ($k !== '') $shown[$k] = true; }
        foreach (array('mobile' => 'mobile', 'phone' => 'landline') as $f => $kind) {
            $k = cb_phone_key($pB['fields'][$f]);
            if ($k === '' || isset($shown[$k])) continue;
            $shown[$k] = true;
            $book['nums'][] = array('kind' => $kind, 'show' => $pB['fields'][$f], 'from' => $pB['from'][$f]);
        }
    }
    out(array('ok' => true, 'client' => array(
        'ours' => $book,   // the customer book's company + numbers not shown above (6 Oct 2026)
        'id' => (int)$cid,   // the SimplyBook client: the diary's reset-password action needs it
        'name' => $g('name'), 'email' => $g('email'),
        'phone' => ($g('phone') !== '' ? $g('phone') : $oursPhone),
        'phone_src' => ($g('phone') !== '' ? 'simplybook' : ($oursPhone !== '' ? 'portal' : '')),
        'mobile' => $ours['mobile'], 'tel' => $ours['tel'],
        'address1' => $sbHas ? $g('address1') : $ours['line1'],
        'address2' => $sbHas ? $g('address2') : $ours['line2'],
        'city' => $sbHas ? $g('city') : $ours['city'],
        'zip' => $sbHas ? $g('zip') : $ours['postcode'],
        'addr_src' => $sbHas ? 'simplybook' : ($oursHas ? 'portal' : ''),
        'addr_ts' => $sbHas ? 0 : (int)$ours['ts']
    )));
}

// staff: ultra-light realtime status poll for the diary. Reads ONLY our bkmeta store
// (written instantly by staffstatus, and by the SimplyBook->bkmeta poll cron) - no
// SimplyBook API call, so it is safe to hit every ~15s from every open diary tab.
if ($action === 'bkstatus') {
    if (!$HAS_ADMIN) fail('not_configured');
    // Hot path (polled every 15s): validate the staff token inline from a SINGLE read with NO
    // write (need_staff() would db_save the whole shared DB each call - far too heavy to poll).
    $tok = isset($in['stoken']) ? preg_replace('/[^a-f0-9]/', '', (string)$in['stoken']) : '';
    if ($tok === '') fail('not_staff');
    $ids = isset($in['ids']) && is_array($in['ids']) ? array_slice($in['ids'], 0, 250) : array();
    list($lk, $db) = db_open(); db_close($lk);
    $s = isset($db['staff'][$tok]) ? $db['staff'][$tok] : null;
    $slide = (!empty($s['trust']) ? 2592000 : 43200);
    $cap   = (!empty($s['trust']) ? 7776000 : 43200);
    $ok = $s && (isset($s['ts']) ? $s['ts'] : 0) > time() - $slide && (isset($s['iat']) ? $s['iat'] : 0) > time() - $cap
          && !empty($s['machine']) && $s['machine'] === $machine;
    if (!$ok) fail('not_staff');
    $bm = isset($db['bkmeta']) && is_array($db['bkmeta']) ? $db['bkmeta'] : array();
    $st = array();
    foreach ($ids as $id) {
        $id = (int)$id; if ($id <= 0 || !isset($bm[(string)$id])) continue;
        $e = $bm[(string)$id]; $sv = (string)(isset($e['st']) ? $e['st'] : '');
        if ($sv !== '') $st[(string)$id] = $sv;                 // a real Confirmed / Completed
        elseif (!empty($e['cleared'])) $st[(string)$id] = '';   // an explicit staff CLEAR -> propagate the blank
        // else a seeded-empty entry -> OMIT it, so the agenda's SimplyBook-derived value is kept (no downgrade)
    }
    out(array('ok' => true, 'st' => $st));
}

// SimplyBook's Status feature (the owner uses named statuses incl. "Confirmed" and
// "Completed"): getStatuses is cached 10 min; statuses are matched by name so it works
// whatever exact labels they configured.
function sb_statuses() {
    global $CACHE;
    $c = cache_load($CACHE);
    if (!isset($c['statuses']) || (time() - (isset($c['statuses']['ts']) ? $c['statuses']['ts'] : 0)) > 600) {
        $r = sb_adm('getStatuses', array());
        $list = (!sb_net($r) && isset($r['result']) && is_array($r['result'])) ? $r['result'] : array();
        $c['statuses'] = array('data' => $list, 'ts' => time());
        cache_save($CACHE, $c);
    }
    return $c['statuses']['data'];
}
function sb_status_id($kind) {
    foreach (sb_statuses() as $st) {
        $nm = strtolower((string)(isset($st['name']) ? $st['name'] : ''));
        $id = intval(isset($st['id']) ? $st['id'] : 0);
        if ($kind === 'confirmed' && strpos($nm, 'confirm') !== false) return $id;
        if ($kind === 'completed' && strpos($nm, 'complet') !== false) return $id;
        if ($kind === 'inprogress' && (strpos($nm, 'progress') !== false || strpos($nm, 'started') !== false)) return $id;
        if ($kind === 'default' && !empty($st['is_default'])) return $id;
    }
    return 0;
}

// staff: set a booking's status (confirmed / in progress / completed / clear). Writes SimplyBook's own
// Status feature via setStatus so their admin shows it too, and always keeps our marker
// so the portal state never depends on which SimplyBook plan features are enabled.
if ($action === 'staffstatus') {
    $stok = need_staff();
    $bid = (int)(isset($in['id']) ? $in['id'] : 0);
    $want = (string)(isset($in['status']) ? $in['status'] : '');
    // 6 Oct 2026: 'inprogress' - "I've started the job", from the portal instead of Slack. SimplyBook has no such
    // status unless the owner adds one (sb_status_id matches "progress"/"started"); without it the marker is ours
    // alone (sb=0) and pcm-bkpoll.php leaves it standing until the job is completed.
    if ($bid <= 0 || !in_array($want, array('confirmed', 'inprogress', 'completed', 'none'), true)) fail('bad_request');
    $sb = false;
    if ($HAS_ADMIN) {
        $sid = $want === 'none' ? sb_status_id('default') : sb_status_id($want);
        if ($sid > 0) { $r = sb_adm('setStatus', array($bid, $sid)); $sb = !sb_net($r) && !empty($r['result']); }
    }
    list($lk, $db) = db_open();
    if (!isset($db['bkmeta'])) $db['bkmeta'] = array();
    foreach ($db['bkmeta'] as $k2 => $v2) if ((isset($v2['ts']) ? $v2['ts'] : 0) < time() - 86400 * 90) unset($db['bkmeta'][$k2]);
    // Was this actually a change? Two techies working the same diary will both press
    // Done on the same job; announcing it twice is noise, not information.
    $prevSt = isset($db['bkmeta'][(string)$bid]['st']) ? (string)$db['bkmeta'][(string)$bid]['st'] : null;
    $newSt = ($want === 'none') ? '' : $want;
    $unchanged = ($prevSt !== null && $prevSt === $newSt);
    // src='portal' marks OUR authority: the bkpoll cron must not blank-revert this when
    // the SimplyBook write failed (see pcm-bkpoll.php - that bug un-completed jobs).
    // keep a marker even when cleared (st='') so the diary's realtime poll propagates the clear
    if ($want === 'none') $db['bkmeta'][(string)$bid] = array('st' => '', 'cleared' => 1, 'ts' => time(), 'sb' => $sb ? 1 : 0, 'src' => 'portal');
    else $db['bkmeta'][(string)$bid] = array('st' => $want, 'ts' => time(), 'sb' => $sb ? 1 : 0, 'src' => 'portal');
    $sr = isset($db['staff'][$stok]) ? $db['staff'][$stok] : array();
    $staffWho = staff_first_of(staff_who_of($sr));
    db_save($db); db_close($lk);
    // Real-time Slack so the team sees every confirm/complete the instant it happens (best-effort).
    $cl = function ($s) { return trim(substr(preg_replace('/[\x00-\x1F\x7F]+/', ' ', (string)$s), 0, 80)); };
    $cwho = $cl(isset($in['who']) ? $in['who'] : '');
    $cwhat = $cl(isset($in['what']) ? $in['what'] : '');
    $label = ($cwho !== '' ? $cwho : ('Booking #' . $bid)) . ($cwhat !== '' ? ' - ' . $cwhat : '');
    $by = ' _(by ' . ($staffWho !== '' ? $staffWho : 'the team') . ' in the portal' . ($sb ? ', synced to SimplyBook' : '') . ')_';
    if ($unchanged) {
        // already in this state - stay quiet, but still confirm to the caller
    } elseif ($want === 'completed') pcm_slack_say(':ballot_box_with_check: *Service completed* - ' . $label . $by);
    elseif ($want === 'confirmed') pcm_slack_say(':white_check_mark: *Booking confirmed* - ' . $label . $by);
    elseif ($want === 'inprogress') pcm_slack_say(':arrow_forward: *Job started - in progress* - ' . $label . $by);
    else pcm_slack_say(':arrows_counterclockwise: *Booking status cleared* - ' . $label . $by);
    out(array('ok' => true, 'sb' => $sb, 'st' => $want === 'none' ? '' : $want, 'unchanged' => $unchanged ? 1 : 0));
}

// staff: the live fleet - every machine running 365 PC Manager, flattened, with the raw
// health flags so the dashboard can show on/offline, warnings and versions in real time.
// "On now" = checked in within ~70 min (the app checks in hourly while the PC is on).
if ($action === 'stafffleet') {
    need_staff();
    list($lk, $db) = db_open(); db_close($lk);
    $latest = 0;
    $vj = @json_decode((string)@file_get_contents(__DIR__ . '/../downloads/pcm/version.json'), true);
    if (is_array($vj)) $latest = intval(isset($vj['ver']) ? $vj['ver'] : 0);
    $ms = array();
    foreach ((isset($db['customers']) ? $db['customers'] : array()) as $k => $c) {
        if (!empty($c['merged_into'])) continue;
        $tier = (isset($c['tier']) && $c['tier'] === 'pro') ? 'pro' : 'free';
        $custPhone = (string)(isset($c['sb_phone']) ? $c['sb_phone'] : (isset($c['phone']) ? $c['phone'] : ''));
        $custId = substr(sha1('365cid|' . $k), 0, 12);   // opaque id, matches staffcustomers/staffview
        foreach ((isset($c['machines']) && is_array($c['machines']) ? $c['machines'] : array()) as $mid2 => $m) {
            $ms[] = array(
                'cust' => (string)(isset($c['name']) ? $c['name'] : ''),
                'cid' => $custId,
                'mid' => (string)$mid2,
                'phone' => $custPhone,
                'tier' => $tier,
                'rmaint' => !empty($m['rmaint']),
                'name' => (string)(isset($m['name']) ? $m['name'] : 'PC'),
                'score' => intval(isset($m['score']) ? $m['score'] : 0),
                'verdict' => (string)(isset($m['verdict']) ? $m['verdict'] : ''),
                'seen' => (string)(isset($m['seen']) ? $m['seen'] : ''),
                'disk' => intval(isset($m['diskpct']) ? $m['diskpct'] : 0),
                'backup' => !empty($m['backup']),
                'av' => (string)(isset($m['av']) ? $m['av'] : ''),
                'w10' => !empty($m['w10']),
                'reboot' => !empty($m['reboot']),
                'ver' => intval(isset($m['ver']) ? $m['ver'] : 0),
                'batt' => intval(isset($m['batt']) ? $m['batt'] : 0),
                'help' => (string)(isset($m['help']) ? $m['help'] : ''),
                // hidden from "Worth a call today" by staff (staffwchide) - who and when, so a hidden PC is never a mystery
                'wch' => !empty($m['wc_hide']),
                'wchby' => (string)(isset($m['wc_hide']['by']) ? $m['wc_hide']['by'] : ''),
                'wchts' => intval(isset($m['wc_hide']['ts']) ? $m['wc_hide']['ts'] : 0),
                'fresh' => !isset($m['diskpct']));
            if (count($ms) >= 600) break 2;
        }
    }
    out(array('ok' => true, 'latest' => $latest, 'machines' => $ms, 'now' => gmdate('Y-m-d H:i')));
}

// staff: hide one machine from "Worth a call today", or bring it back (owner, 28 Sep 2026: "can we have an option to
// basically hide various machines if we feel like it? Because some are like our own machines, and some are like custom
// machines, which aren't on the support"). Only the call lists listen to it - the portal's and the PCM console's; the
// machine stays in the fleet, its reports, the customer's portal and everything else. Who hid it and when are kept on
// the machine. hide=0 clears it.
if ($action === 'staffwchide') {
    $tok = need_staff();
    $cid2 = preg_replace('/[^a-f0-9]/', '', (string)(isset($in['cid']) ? $in['cid'] : ''));
    $pc   = preg_replace('/[^a-f0-9]/', '', substr((string)(isset($in['pc']) ? $in['pc'] : ''), 0, 32));
    $hide = !empty($in['hide']);
    list($lk, $db) = db_open();
    $byEmail = isset($db['staff'][$tok]['login']) ? (string)$db['staff'][$tok]['login'] : 'staff';
    $found = '';
    foreach ($db['customers'] as $k2 => $c2) {
        if (!empty($c2['merged_into'])) continue;
        if (substr(sha1('365cid|' . $k2), 0, 12) === $cid2) { $found = $k2; break; }
    }
    if ($found === '' || !isset($db['customers'][$found]['machines'][$pc])) { db_close($lk); fail('unknown_machine'); }
    $mm =& $db['customers'][$found]['machines'][$pc];
    if ($hide) $mm['wc_hide'] = array('by' => $byEmail, 'ts' => time()); else unset($mm['wc_hide']);
    unset($mm);
    db_save($db); db_close($lk);
    out(array('ok' => true, 'hidden' => $hide));
}

// staff: merge a PC that is listed twice under one customer into one entry (owner, 28 Sep 2026: "can we merge the two
// Tim Emblem entries into one"). The app names a PC by a hash of Windows' MachineGuid, so a Windows reset or reinstall
// makes the same PC a second entry. go=0 previews, go=1 merges. The entry seen most recently is kept; the other's
// service reports, diagnostics log and SOS picture move into it (files renamed, never deleted - a clashing report
// timestamp moves on a second, as reportup does), its report history joins the kept one's, and it is removed.
// Report links already emailed carry the old machine id inside their signature, so pcm_mid_alias records old -> kept
// and pcm-report.php follows it. Both machines must be under the SAME customer: two licences are a customer merge.
if ($action === 'staffmergepc') {
    $tok = need_staff();
    $cid2 = preg_replace('/[^a-f0-9]/', '', (string)(isset($in['cid']) ? $in['cid'] : ''));
    $pa = preg_replace('/[^a-f0-9]/', '', substr((string)(isset($in['pc']) ? $in['pc'] : ''), 0, 32));
    $pb = preg_replace('/[^a-f0-9]/', '', substr((string)(isset($in['other']) ? $in['other'] : ''), 0, 32));
    $go = !empty($in['go']);
    if ($pa === '' || $pb === '' || $pa === $pb) fail('same_machine');
    list($lk, $db) = db_open();
    $byEmail = isset($db['staff'][$tok]['login']) ? (string)$db['staff'][$tok]['login'] : 'staff';
    $found = '';
    foreach ($db['customers'] as $k2 => $c2) {
        if (!empty($c2['merged_into'])) continue;
        if (substr(sha1('365cid|' . $k2), 0, 12) === $cid2) { $found = $k2; break; }
    }
    if ($found === '' || !isset($db['customers'][$found]['machines'][$pa]) || !isset($db['customers'][$found]['machines'][$pb])) { db_close($lk); fail('not_same_customer'); }
    $ms =& $db['customers'][$found]['machines'];
    // keep the one seen most recently ('Y-m-d H:i' strings sort as times)
    $keep = strcmp((string)($ms[$pa]['seen'] ?? ''), (string)($ms[$pb]['seen'] ?? '')) >= 0 ? $pa : $pb;
    $drop = $keep === $pa ? $pb : $pa;
    $kh = substr(hash('sha256', $found), 0, 12);
    $K =& $ms[$keep]; $D = $ms[$drop];
    $dreps = array_map('intval', isset($D['reps']) && is_array($D['reps']) ? $D['reps'] : array());
    $side = function ($m) { return array('name' => (string)($m['name'] ?? 'PC'), 'seen' => (string)($m['seen'] ?? ''), 'ver' => intval($m['ver'] ?? 0),
        'reports' => count(isset($m['reps']) && is_array($m['reps']) ? $m['reps'] : array())); };
    $plan = array('keep' => $side($K) + array('pc' => $keep), 'drop' => $side($D) + array('pc' => $drop));
    if (!$go) { unset($K, $ms); db_close($lk); out(array('ok' => true, 'preview' => $plan)); }

    // 1. the files - every rename checked, and undone if any fails, before the database changes
    $kreps = array_map('intval', isset($K['reps']) && is_array($K['reps']) ? $K['reps'] : array());
    $done = array(); $map = array();
    foreach ($dreps as $ts) {
        $src = __DIR__ . '/pcm-rep-' . $kh . '-' . $drop . '-' . $ts . '.html';
        if (!is_file($src)) continue;   // pruned long ago: nothing to carry
        $nts = $ts;
        while (in_array($nts, $kreps, true) || in_array($nts, $map, true) || file_exists(__DIR__ . '/pcm-rep-' . $kh . '-' . $keep . '-' . $nts . '.html')) $nts++;
        $dst = __DIR__ . '/pcm-rep-' . $kh . '-' . $keep . '-' . $nts . '.html';
        if (!@rename($src, $dst)) {
            foreach (array_reverse($done) as $pair) @rename($pair[1], $pair[0]);
            unset($K, $ms); db_close($lk); fail('move_failed');
        }
        $done[] = array($src, $dst); $map[$ts] = $nts;
    }
    $extra = array();
    if (!empty($D['logf']) && empty($K['logf']) && is_file(__DIR__ . '/' . basename((string)$D['logf']))) {
        $nl = str_replace('-' . $drop . '-', '-' . $keep . '-', basename((string)$D['logf']));
        if (@rename(__DIR__ . '/' . basename((string)$D['logf']), __DIR__ . '/' . $nl)) { $K['logf'] = $nl; $extra[] = 'log'; }
    }
    if (!empty($D['shot']) && empty($K['shot']) && is_file(__DIR__ . '/pcm-sos-' . $kh . '-' . $drop . '.jpg')) {
        if (@rename(__DIR__ . '/pcm-sos-' . $kh . '-' . $drop . '.jpg', __DIR__ . '/pcm-sos-' . $kh . '-' . $keep . '.jpg')) { $K['shot'] = $D['shot']; $extra[] = 'sos'; }
    }
    // 2. the report history joins the kept entry
    foreach (array('repk', 'repm', 'reph') as $f) if (!isset($K[$f]) || !is_array($K[$f])) $K[$f] = array();
    $K['reps'] = $kreps;
    foreach ($map as $ts => $nts) {
        $K['reps'][] = $nts;
        foreach (array('repk', 'repm', 'reph') as $f) if (isset($D[$f][(string)$ts])) $K[$f][(string)$nts] = $D[$f][(string)$ts];
    }
    sort($K['reps']);
    if (!empty($D['activated']) && (empty($K['activated']) || strcmp((string)$D['activated'], (string)$K['activated']) < 0)) $K['activated'] = $D['activated'];
    if (empty($K['asset']) && !empty($D['asset'])) $K['asset'] = $D['asset'];
    if (!isset($K['merged']) || !is_array($K['merged'])) $K['merged'] = array();
    $K['merged'][] = array('from' => $drop, 'name' => (string)($D['name'] ?? ''), 'ver' => intval($D['ver'] ?? 0), 'seen' => (string)($D['seen'] ?? ''), 'by' => $byEmail, 'at' => time());
    unset($K);
    unset($ms[$drop]);
    unset($ms);
    // 3. emailed report links name the old machine: send them to the kept one
    if (!isset($db['pcm_mid_alias']) || !is_array($db['pcm_mid_alias'])) $db['pcm_mid_alias'] = array();
    $db['pcm_mid_alias'][$kh . '-' . $drop] = array('to' => $keep, 'ts' => $map);
    db_save($db); db_close($lk);
    out(array('ok' => true, 'merged' => $plan, 'reports_moved' => count($map), 'also' => $extra));
}

// staff: queue a SAFE maintenance command onto one machine. Never a command string - only a
// fixed id from the allow-list, which the app maps to a hard-coded routine. Refused unless the
// customer has switched on remote maintenance in their app. Every queued command records who
// (staff email) asked for it, so the per-machine cmdlog is a full audit trail.
if ($action === 'staffcmd') {
    $tok = need_staff();
    global $PCM_CMDS;
    $cid2 = preg_replace('/[^a-f0-9]/', '', (string)(isset($in['cid']) ? $in['cid'] : ''));
    $pc   = preg_replace('/[^a-f0-9]/', '', substr((string)(isset($in['pc']) ? $in['pc'] : ''), 0, 32));
    $act  = preg_replace('/[^a-z]/', '', (string)(isset($in['act']) ? $in['act'] : ''));
    if (!in_array($act, $PCM_CMDS, true)) fail('bad_command');
    list($lk, $db) = db_open();
    $byEmail = isset($db['staff'][$tok]['login']) ? (string)$db['staff'][$tok]['login'] : 'staff';
    $found = '';
    foreach ($db['customers'] as $k2 => $c2) {
        if (!empty($c2['merged_into'])) continue;
        if (substr(sha1('365cid|' . $k2), 0, 12) === $cid2) { $found = $k2; break; }
    }
    if ($found === '' || !isset($db['customers'][$found]['machines'][$pc])) { db_close($lk); fail('unknown_machine'); }
    $mm =& $db['customers'][$found]['machines'][$pc];
    if (empty($mm['rmaint'])) { db_close($lk); fail('not_enabled'); }   // customer hasn't opted in
    if (!isset($mm['cmdq']) || !is_array($mm['cmdq'])) $mm['cmdq'] = array();
    if (count($mm['cmdq']) >= 5) { db_close($lk); fail('queue_full'); }
    $id = bin2hex(random_bytes(8));
    $mm['cmdq'][] = array('id' => $id, 'act' => $act, 'by' => $byEmail, 'ts' => time());
    unset($mm);
    db_save($db); db_close($lk);
    pcm_gate_sync($db);   // the PC's minute poll must reach PHP to collect it (pcm-gate.php)
    out(array('ok' => true, 'id' => $id));
}

// staff: read one machine's command status (pending queue + recent audit log + consent state).
// Polled by the portal tune-up panel to animate progress and show results.
if ($action === 'staffcmdlog') {
    need_staff();
    $cid2 = preg_replace('/[^a-f0-9]/', '', (string)(isset($in['cid']) ? $in['cid'] : ''));
    $pc   = preg_replace('/[^a-f0-9]/', '', substr((string)(isset($in['pc']) ? $in['pc'] : ''), 0, 32));
    list($lk, $db) = db_open(); db_close($lk);
    foreach ($db['customers'] as $k2 => $c2) {
        if (!empty($c2['merged_into'])) continue;
        if (substr(sha1('365cid|' . $k2), 0, 12) !== $cid2) continue;
        if (!isset($c2['machines'][$pc])) fail('unknown_machine');
        $m = $c2['machines'][$pc];
        $pend = array();
        foreach ((isset($m['cmdq']) && is_array($m['cmdq']) ? $m['cmdq'] : array()) as $q)
            $pend[] = array('id' => (string)$q['id'], 'act' => (string)$q['act'], 'sent' => !empty($q['sent']));
        out(array('ok' => true, 'rmaint' => !empty($m['rmaint']),
            'pending' => $pend,
            'log' => isset($m['cmdlog']) && is_array($m['cmdlog']) ? array_slice($m['cmdlog'], -20) : array(),
            'haslog' => !empty($m['logf']), 'logts' => intval(isset($m['logts']) ? $m['logts'] : 0),
            // v29 email move (365 Mail Mover inside the app): the staff switch, who set it, and where the move is
            'mm' => !empty($m['mailmove']), 'mmby' => (string)(isset($m['mailmove']['by']) ? $m['mailmove']['by'] : ''),
            'mmts' => intval(isset($m['mailmove']['ts']) ? $m['mailmove']['ts'] : 0), 'mmdone' => intval(isset($m['mailmove_done']) ? $m['mailmove_done'] : 0),
            'mmst' => isset($m['mmst']) && is_array($m['mmst']) ? $m['mmst'] : null, 'ver' => intval(isset($m['ver']) ? $m['ver'] : 0)));
    }
    fail('unknown_customer');
}

// staff: switch the email move (365 Mail Mover inside PC Manager v29) on or off for one PC. On = the app shows its
// "Email move" page at its next check-in and pcm-mailmover.php will hand it the signed Mail Mover. It switches itself
// off when the app reports the move finished (pcm.php check-in).
if ($action === 'staffmailmove') {
    $tok = need_staff();
    $cid2 = preg_replace('/[^a-f0-9]/', '', (string)(isset($in['cid']) ? $in['cid'] : ''));
    $pc   = preg_replace('/[^a-f0-9]/', '', substr((string)(isset($in['pc']) ? $in['pc'] : ''), 0, 32));
    $on = !empty($in['on']);
    list($lk, $db) = db_open();
    $byEmail = isset($db['staff'][$tok]['login']) ? (string)$db['staff'][$tok]['login'] : 'staff';
    $found = '';
    foreach ($db['customers'] as $k2 => $c2) {
        if (!empty($c2['merged_into'])) continue;
        if (substr(sha1('365cid|' . $k2), 0, 12) === $cid2) { $found = $k2; break; }
    }
    if ($found === '' || !isset($db['customers'][$found]['machines'][$pc])) { db_close($lk); fail('unknown_machine'); }
    $mm =& $db['customers'][$found]['machines'][$pc];
    if ($on) $mm['mailmove'] = array('by' => $byEmail, 'ts' => time()); else unset($mm['mailmove']);
    // ask the app for a check-in now (its minute-poll sees req_check - pcm.php shield), so the page appears or goes within
    // about a minute instead of at the hourly check-in
    $mm['req_check'] = time();
    unset($mm);
    db_save($db); db_close($lk);
    pcm_gate_sync($db);   // the PC's minute poll must reach PHP to see req_check (pcm-gate.php)
    out(array('ok' => true, 'on' => $on));
}

// staff: read the plain-text diagnostic bundle a machine uploaded via collectlogs.
if ($action === 'stafflog') {
    need_staff();
    $cid2 = preg_replace('/[^a-f0-9]/', '', (string)(isset($in['cid']) ? $in['cid'] : ''));
    $pc   = preg_replace('/[^a-f0-9]/', '', substr((string)(isset($in['pc']) ? $in['pc'] : ''), 0, 32));
    list($lk, $db) = db_open(); db_close($lk);
    foreach ($db['customers'] as $k2 => $c2) {
        if (!empty($c2['merged_into'])) continue;
        if (substr(sha1('365cid|' . $k2), 0, 12) !== $cid2) continue;
        $f = isset($c2['machines'][$pc]['logf']) ? (string)$c2['machines'][$pc]['logf'] : '';
        if ($f === '' || !preg_match('/^pcm-log-[a-f0-9]{12}-[a-f0-9]{1,32}-\d+\.txt$/', $f)) fail('no_log');
        $p = __DIR__ . '/' . $f;
        if (!is_readable($p)) fail('no_log');
        out(array('ok' => true, 'text' => (string)@file_get_contents($p), 'ts' => intval(isset($c2['machines'][$pc]['logts']) ? $c2['machines'][$pc]['logts'] : 0)));
    }
    fail('unknown_customer');
}

if ($action === 'staffcancel') {
    if (!$HAS_ADMIN) fail('not_configured');
    need_staff();
    $bid = (int)(isset($in['id']) ? $in['id'] : 0);
    if ($bid <= 0) fail('bad_request');
    $r = sb_adm('cancelBooking', array($bid));
    if (sb_net($r)) fail('sb_unavailable');
    if (empty($r['result'])) fail('cancel_failed');
    pcm_slack_say(':x: *Booking cancelled* - ' . bk_lbl($bid) . (isset($in['when']) && $in['when'] !== '' ? ' (' . bk_clean($in['when']) . ')' : '') . bk_by());
    out(array('ok' => true));
}

if ($action === 'staffmove') {
    if (!$HAS_ADMIN) fail('not_configured');
    need_staff();
    $bid = (int)(isset($in['id']) ? $in['id'] : 0);
    $eventId = (int)(isset($in['eventId']) ? $in['eventId'] : 0);
    $date = preg_replace('/[^0-9\-]/', '', (string)(isset($in['date']) ? $in['date'] : ''));
    $time = preg_replace('/[^0-9:]/', '', (string)(isset($in['time']) ? $in['time'] : ''));
    if ($bid <= 0 || $eventId <= 0 || $date === '' || $time === '') fail('bad_request');
    if (strlen($time) === 5) $time .= ':00';
    if (strtotime($date . ' ' . $time) === false) fail('bad_request');
    $det = sb_adm('getBookingDetails', array($bid));
    if (sb_net($det)) fail('sb_unavailable');
    $b = isset($det['result']) && is_array($det['result']) ? $det['result'] : null;
    if (!$b) fail('not_found');
    $bClient = (int)(isset($b['client_id']) ? $b['client_id'] : (isset($b['client']['id']) ? $b['client']['id'] : 0));
    $au = sb_pub('getAvailableUnits', array($eventId, $date . ' ' . $time, 1));
    if (sb_net($au)) fail('sb_unavailable');
    $unitIds = isset($au['result']) && is_array($au['result']) ? array_values($au['result']) : array();
    if (!count($unitIds)) fail('slot_taken');
    $startTs = strtotime($date . ' ' . $time); $endTs = $startTs + sb_mins_for($eventId) * 60;
    $r = sb_adm('editBook', array($bid, $eventId, (int)$unitIds[0], $bClient,
        $date, $time, date('Y-m-d', $endTs), date('H:i:s', $endTs), 0, array()));
    if (sb_net($r) || !isset($r['result']) || !$r['result']) fail('change_failed');
    pcm_slack_say(':twisted_rightwards_arrows: *Booking moved* - ' . bk_lbl($bid) . ' -> ' . date('D j M g:ia', $startTs) . bk_by());
    out(array('ok' => true, 'when' => date('D j M g:ia', $startTs)));
}

fail('unknown_action');
