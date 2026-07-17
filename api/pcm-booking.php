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

function sb_adm_headers() {
    global $SB_COMPANY, $SB_API_USER, $SB_API_USER_KEY, $CACHE;
    $c = cache_load($CACHE);
    if (empty($c['adm']['tok']) || (time() - (isset($c['adm']['ts']) ? $c['adm']['ts'] : 0)) > 1200) {
        $r = sb_rpc('https://user-api.simplybook.me/login', 'getUserToken', array($SB_COMPANY, $SB_API_USER, $SB_API_USER_KEY));
        if (empty($r['result'])) fail('sb_unavailable');
        $c['adm'] = array('tok' => $r['result'], 'ts' => time());
        cache_save($CACHE, $c);
    }
    return array('X-Company-Login: ' . $SB_COMPANY, 'X-User-Token: ' . $c['adm']['tok']);
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
            if (isset($ev['is_active']) && !$ev['is_active']) continue;
            if (isset($ev['is_visible']) && !$ev['is_visible']) continue;
            $units = array();
            if (isset($ev['unit_map']) && is_array($ev['unit_map'])) foreach ($ev['unit_map'] as $uid) $units[] = (int)$uid;
            $list[] = array('id' => (int)(isset($ev['id']) ? $ev['id'] : $id),
                            'name' => (string)(isset($ev['name']) ? $ev['name'] : 'Service'),
                            'mins' => (int)(isset($ev['duration']) ? $ev['duration'] : 60),
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
    );
}
// re-open, mutate this customer's next-service, save, release
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
    if (isset($th[$tkey]) && (isset($th[$tkey]['n']) ? $th[$tkey]['n'] : 0) >= 6) { cache_save($THROTTLE, $th); db_close($tlk); fail('throttled'); }

    // verify the client login against SimplyBook (forwarded once, never stored)
    $r = sb_pub('getClientInfoByLoginPassword', array($email, $pass));
    if (sb_net($r)) { db_close($tlk); fail('sb_unavailable'); }
    $client = isset($r['result']) && is_array($r['result']) ? $r['result'] : null;
    if (!$client || empty($client['id'])) {
        // not a client - maybe it's one of OUR OWN SimplyBook staff users signing in.
        // getUserToken proves "a USER of this company", but ANY SimplyBook user (incl. a
        // limited service-provider) would pass - so manager mode is ALSO gated by an explicit
        // owner allow-list ($SB_STAFF in pcm-simplybook.php). Fail closed if the list is absent.
        global $SB_COMPANY, $SB_STAFF;
        $allow = (isset($SB_STAFF) && is_array($SB_STAFF)) ? array_map('strtolower', $SB_STAFF) : array();
        if (in_array($email, $allow, true)) {
            $ur = sb_rpc('https://user-api.simplybook.me/login', 'getUserToken', array($SB_COMPANY, $email, $pass));
            if (!sb_net($ur) && !empty($ur['result'])) {
                unset($th[$tkey]); cache_save($THROTTLE, $th); db_close($tlk);
                // issue OUR OWN short-lived staff session token (SimplyBook password is never stored),
                // bound to this machine, with a 12h sliding + 12h absolute cap.
                $stoken = bin2hex(random_bytes(24));
                list($lk2, $db2) = db_open();
                if (!isset($db2['staff'])) $db2['staff'] = array();
                foreach ($db2['staff'] as $sk => $sv) if ((isset($sv['ts']) ? $sv['ts'] : 0) < time() - 43200) unset($db2['staff'][$sk]);
                $db2['staff'][$stoken] = array('login' => $email, 'ts' => time(), 'iat' => time(), 'machine' => $machine);
                db_save($db2); db_close($lk2);
                out(array('ok' => true, 'staff' => true, 'stoken' => $stoken, 'customer' => $email));
            }
        }
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
    if (!isset($c['machines'][$machine]))
        $c['machines'][$machine] = array('name' => $mname, 'score' => 0, 'verdict' => '', 'seen' => $now, 'activated' => $now);
    // flag each matched Pro record for the owner's one-click approval, pointing at this booking identity
    foreach ($pendingKeys as $pk)
        if (isset($db['customers'][$pk]) && $pk !== $target)
            $db['customers'][$pk]['pending_signin'] = array('cid' => $cid, 'email' => $cemail, 'link' => $target, 'sbname' => $cname, 'ts' => $now);
    db_save($db); db_close($lk);

    $tier = (($c['tier'] === 'pro')) ? 'pro' : 'free';
    out(array('ok' => true, 'tier' => $tier, 'key' => $target, 'customer' => isset($c['name']) ? $c['name'] : '',
              'next' => isset($c['next']) ? $c['next'] : '', 'onplan' => $tier === 'pro', 'pending' => $pending));
}

if ($action === 'services') {
    customer_snapshot();                            // validates + releases the lock
    out(array('ok' => true, 'services' => sb_services()));
}

if ($action === 'slots') {
    customer_snapshot();
    $eventId = (int)(isset($in['eventId']) ? $in['eventId'] : 0);
    $from = preg_replace('/[^0-9\-]/', '', (string)(isset($in['from']) ? $in['from'] : ''));
    $to   = preg_replace('/[^0-9\-]/', '', (string)(isset($in['to']) ? $in['to'] : ''));
    if ($eventId <= 0 || $from === '' || $to === '') fail('bad_request');
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
    out(array('ok' => true, 'days' => $days));
}

if ($action === 'book') {
    $snap = customer_snapshot();
    $eventId = (int)(isset($in['eventId']) ? $in['eventId'] : 0);
    $date = preg_replace('/[^0-9\-]/', '', (string)(isset($in['date']) ? $in['date'] : ''));
    $time = preg_replace('/[^0-9:]/', '', (string)(isset($in['time']) ? $in['time'] : ''));
    if ($eventId <= 0 || $date === '' || $time === '') fail('bad_request');
    if (strlen($time) === 5) $time .= ':00';
    if (strtotime($date . ' ' . $time) === false) fail('bad_request');
    if ($snap['email'] === '') fail('needsignin');
    $au = sb_pub('getAvailableUnits', array($eventId, $date . ' ' . $time, 1));
    if (sb_net($au)) fail('sb_unavailable');
    $unitIds = isset($au['result']) && is_array($au['result']) ? array_values($au['result']) : array();
    if (!count($unitIds)) fail('slot_taken');
    // clientData from the VERIFIED SimplyBook identity (avoids creating a duplicate client)
    $clientData = array('name' => $snap['name'], 'email' => $snap['email'], 'phone' => $snap['phone']);
    $r = sb_pub('book', array($eventId, (int)$unitIds[0], $date, $time, $clientData, array(), 1));
    if (sb_net($r)) fail('sb_unavailable');
    $b = isset($r['result']) && is_array($r['result']) ? $r['result'] : null;
    if (!$b) fail('booking_failed');
    $bid = 0; $confirmed = true;
    if (isset($b['bookings'][0])) {
        $bid = (int)(isset($b['bookings'][0]['id']) ? $b['bookings'][0]['id'] : 0);
        if (isset($b['bookings'][0]['is_confirmed'])) $confirmed = (bool)$b['bookings'][0]['is_confirmed'];
    } elseif (isset($b['id'])) { $bid = (int)$b['id']; }
    if (isset($b['require_confirm'])) $confirmed = !$b['require_confirm'];
    $ts = strtotime($date . ' ' . $time);
    $pretty = $ts ? date('D j M Y g:ia', $ts) : ($date . ' ' . $time);
    if ($confirmed) stamp_next($ts, $pretty);        // only claim a firm date once confirmed
    out(array('ok' => true, 'id' => $bid, 'when' => $pretty, 'pending' => !$confirmed));
}

if ($action === 'mybookings') {
    if (!$HAS_ADMIN) fail('nolist');
    $snap = customer_snapshot();
    if (!$snap['cid']) out(array('ok' => true, 'bookings' => array(), 'needsignin' => true));
    $r = sb_adm('getBookings', array(array('client_id' => $snap['cid'], 'booking_type' => 'non_cancelled',
        'date_from' => date('Y-m-d'), 'order' => 'date_start_asc')));
    if (sb_net($r)) fail('sb_unavailable');
    $rows = isset($r['result']) && is_array($r['result']) ? $r['result'] : array();
    $list = array();
    foreach ($rows as $b) {
        $start = parse_start($b);
        $ts = strtotime($start);
        if ($ts && $ts < time()) continue;
        $list[] = array('id' => (int)(isset($b['id']) ? $b['id'] : 0),
                        'when' => $ts ? date('D j M Y g:ia', $ts) : trim($start),
                        'what' => (string)(isset($b['event_name']) ? $b['event_name'] : (isset($b['event']) ? $b['event'] : 'Service')),
                        'eventId' => (int)(isset($b['event_id']) ? $b['event_id'] : 0),
                        'date' => $ts ? date('Y-m-d', $ts) : '', 'time' => $ts ? date('H:i', $ts) : '');
        if (count($list) >= 10) break;
    }
    out(array('ok' => true, 'bookings' => $list));
}

if ($action === 'cancel' || $action === 'change') {
    if (!$HAS_ADMIN) fail('not_configured');
    $snap = customer_snapshot();
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
        // fallback: book the new slot FIRST (from verified identity), then cancel the old.
        $clientData = array('name' => $snap['name'], 'email' => $snap['email'], 'phone' => $snap['phone']);
        $nb = sb_pub('book', array($eventId, (int)$unitIds[0], $date, $time, $clientData, array(), 1));
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
    global $in, $machine;
    $tok = isset($in['stoken']) ? preg_replace('/[^a-f0-9]/', '', (string)$in['stoken']) : '';
    if ($tok === '') fail('not_staff');
    list($lk, $db) = db_open();
    $s = isset($db['staff'][$tok]) ? $db['staff'][$tok] : null;
    $ok = $s
        && (isset($s['ts'])  ? $s['ts']  : 0) > time() - 43200          // 12h sliding
        && (isset($s['iat']) ? $s['iat'] : 0) > time() - 43200          // 12h absolute cap
        && (empty($s['machine']) || $s['machine'] === $machine);        // bound to the machine it was issued on
    if ($ok) { $db['staff'][$tok]['ts'] = time(); db_save($db); }
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

if ($action === 'agenda') {
    if (!$HAS_ADMIN) fail('not_configured');
    need_staff();
    $r = sb_adm('getBookings', array(array('booking_type' => 'non_cancelled',
        'date_from' => date('Y-m-d'), 'date_to' => date('Y-m-d', time() + 86400 * 14), 'order' => 'date_start_asc')));
    if (sb_net($r)) fail('sb_unavailable');
    $rows = isset($r['result']) && is_array($r['result']) ? $r['result'] : array();
    $list = array();
    foreach ($rows as $b) {
        $start = parse_start($b);
        $ts = strtotime($start);
        if ($ts && $ts < time() - 3600) continue;
        $cname = (string)(isset($b['client']) ? $b['client'] : (isset($b['client_name']) ? $b['client_name'] : ''));
        if ($cname === '' && isset($b['client_id'])) $cname = 'client #' . $b['client_id'];
        $list[] = array('id' => (int)(isset($b['id']) ? $b['id'] : 0),
                        'when' => $ts ? date('D j M g:ia', $ts) : trim($start),
                        'who' => $cname,
                        'phone' => (string)(isset($b['client_phone']) ? $b['client_phone'] : ''),
                        'what' => (string)(isset($b['event_name']) ? $b['event_name'] : (isset($b['event']) ? $b['event'] : 'Service')),
                        'eventId' => (int)(isset($b['event_id']) ? $b['event_id'] : 0));
        if (count($list) >= 40) break;
    }
    out(array('ok' => true, 'bookings' => $list));
}

if ($action === 'staffcancel') {
    if (!$HAS_ADMIN) fail('not_configured');
    need_staff();
    $bid = (int)(isset($in['id']) ? $in['id'] : 0);
    if ($bid <= 0) fail('bad_request');
    $r = sb_adm('cancelBooking', array($bid));
    if (sb_net($r)) fail('sb_unavailable');
    if (empty($r['result'])) fail('cancel_failed');
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
    out(array('ok' => true, 'when' => date('D j M g:ia', $startTs)));
}

fail('unknown_action');
