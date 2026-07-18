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
                if ($ok) return true;
            }
        }
    }
    // fallback: local MTA (SiteGround signs SPF/DKIM for domain senders configured in Site Tools)
    $hdr = "From: 365 Techies <no-reply@365techies.co.uk>\r\nContent-Type: text/plain; charset=UTF-8";
    return @mail($to, $subject, $body, $hdr);
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

if ($action === 'join') {
    $email = strtolower(trim((string)(isset($in['email']) ? $in['email'] : '')));
    if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) fail('bad_email');
    $mobile = preg_replace('/[^0-9+]/', '', (string)(isset($in['mobile']) ? $in['mobile'] : ''));
    if ($mobile !== '' && !preg_match('/^(07[0-9]{9}|\+?447[0-9]{9})$/', $mobile)) fail('bad_mobile');
    // STAFF emails get their code by EMAIL ONLY. The mobile is attacker-suppliable, and the
    // whole staff-code design rests on "only the allow-listed inbox can read the code" -
    // texting it to a caller-chosen number would hand out staff sessions.
    global $SB_STAFF;
    $allowSt = (isset($SB_STAFF) && is_array($SB_STAFF)) ? array_map('trim', array_map('strtolower', $SB_STAFF)) : array();
    if (in_array($email, $allowSt, true)) $mobile = '';
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
    out(array('ok' => true, 'sms' => $sentSms, 'mail' => $sentMail, 'slack' => $sentSlack));
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
        list($lkS, $dbS) = db_open();
        if (!isset($dbS['staff'])) $dbS['staff'] = array();
        foreach ($dbS['staff'] as $sk => $sv) if ((isset($sv['ts']) ? $sv['ts'] : 0) < time() - 43200) unset($dbS['staff'][$sk]);
        $dbS['staff'][$stoken] = array('login' => $email, 'ts' => time(), 'iat' => time(), 'machine' => $machine);
        db_save($dbS); db_close($lkS);
        out(array('ok' => true, 'staff' => true, 'stoken' => $stoken, 'customer' => $email));
    }

    // inbox ownership PROVEN. Find or silently create the SimplyBook client.
    // getClientList FIRST - SimplyBook duplicate clients break password sign-in.
    if (!$HAS_ADMIN) fail('not_configured');
    $cid = 0; $cname = $jname;
    $cl = sb_adm('getClientList', array($email, null));
    if (sb_net($cl)) fail('sb_unavailable');
    if (!isset($cl['result']) || !is_array($cl['result'])) fail('sb_unavailable');   // API error != empty list - never blind-create
    foreach ($cl['result'] as $cli) {
        if (isset($cli['email']) && strtolower(trim((string)$cli['email'])) === $email) {
            $cid = (int)$cli['id'];
            if ($cname === '' && !empty($cli['name'])) $cname = (string)$cli['name'];
            break;
        }
    }
    if ($cid === 0) {
        $ac = sb_adm('addClient', array(array('name' => ($cname !== '' ? $cname : $email), 'email' => $email), false));
        if (sb_net($ac) || empty($ac['result'])) fail('sb_unavailable');
        $cid = (int)$ac['result'];
    }
    if ($cid <= 0) fail('join_failed');
    // NOW burn the code (single use) - SimplyBook resolution succeeded
    $jlk2 = @fopen($JOINCODES . '.lock', 'c'); if ($jlk2) @flock($jlk2, LOCK_EX);
    $jc2 = cache_load($JOINCODES); unset($jc2[$ek]); cache_save($JOINCODES, $jc2);
    if ($jlk2) { @flock($jlk2, LOCK_UN); @fclose($jlk2); }

    // find-or-create the customer record - the same safe matching as password sign-in:
    // sb_client_id first, then a FREE unlinked email match; Pro NEVER auto-granted.
    list($lk, $db) = db_open();
    $now = gmdate('Y-m-d H:i');
    $target = ''; $pending = false; $pendingKeys = array();
    foreach ($db['customers'] as $k2 => $c2)
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
    $c['sb_client_id'] = $cid;
    $c['sb_email'] = $email;
    $c['email_verified'] = true;   // proven by the typed code - unlike raw SB self-registration
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
        $lim = !empty($wv['long']) ? 5184000 : 43200;
        if ((isset($wv['ts']) ? $wv['ts'] : 0) < time() - $lim) unset($db['websessions'][$wk]);
    }
    $db['websessions'][$wtok] = array('key' => $target, 'ts' => time(), 'iat' => time(), 'long' => true, 'machine' => $machine);
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
            // our own short-lived staff session token (SimplyBook password never stored),
            // bound to this machine, 12h sliding + 12h absolute cap.
            $stoken = bin2hex(random_bytes(24));
            list($lk2, $db2) = db_open();
            if (!isset($db2['staff'])) $db2['staff'] = array();
            foreach ($db2['staff'] as $sk => $sv) if ((isset($sv['ts']) ? $sv['ts'] : 0) < time() - 43200) unset($db2['staff'][$sk]);
            $db2['staff'][$stoken] = array('login' => $email, 'ts' => time(), 'iat' => time(), 'machine' => $machine);
            db_save($db2); db_close($lk2);
            out(array('ok' => true, 'staff' => true, 'stoken' => $stoken, 'customer' => $email));
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
            $lim = !empty($wv['long']) ? 5184000 : 43200;
            if ((isset($wv['ts']) ? $wv['ts'] : 0) < time() - $lim) unset($db['websessions'][$wk]);
        }
        // customers get a long device session (60d sliding / 90d cap, server-revocable)
        $db['websessions'][$wtok] = array('key' => $target, 'ts' => time(), 'iat' => time(), 'long' => true, 'machine' => $machine);
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
    if ($wt !== '') { list($lk, $db) = db_open(); if (isset($db['websessions'][$wt])) { unset($db['websessions'][$wt]); db_save($db); } db_close($lk); }
    out(array('ok' => true));
}

if ($action === 'services') {
    // staff (portal diary) may browse with their session token; customers need their key
    if (isset($in['stoken']) && $in['stoken'] !== '') need_staff(); else customer_snapshot();
    out(array('ok' => true, 'services' => sb_services()));
}

if ($action === 'slots') {
    if (isset($in['stoken']) && $in['stoken'] !== '') need_staff(); else customer_snapshot();
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
    out(array('ok' => true, 'key' => $nk, 'name' => $nm, 'tier' => $tier,
        'link' => '365pcm://activate/' . $nk,
        // the https link works in EVERY email/chat client and falls back to install guidance;
        // the key travels in the #fragment so it never appears in server access logs
        'weblink' => 'https://365techies.co.uk/activate/#' . $nk));
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

// staff: book a new job on a customer's behalf (the phone-call flow). Same real-time
// SimplyBook 'book' call the customer path uses; clientData matches/creates the client.
if ($action === 'staffbook') {
    if (!$HAS_ADMIN) fail('not_configured');
    need_staff();
    $eventId = (int)(isset($in['eventId']) ? $in['eventId'] : 0);
    $date = preg_replace('/[^0-9\-]/', '', (string)(isset($in['date']) ? $in['date'] : ''));
    $time = preg_replace('/[^0-9:]/', '', (string)(isset($in['time']) ? $in['time'] : ''));
    if ($eventId <= 0 || $date === '' || $time === '') fail('bad_request');
    if (strlen($time) === 5) $time .= ':00';
    if (strtotime($date . ' ' . $time) === false) fail('bad_request');
    $cn = trim(substr((string)(isset($in['name']) ? $in['name'] : ''), 0, 60));
    $cp = trim(substr((string)(isset($in['phone']) ? $in['phone'] : ''), 0, 20));
    $ce = strtolower(trim(substr((string)(isset($in['email']) ? $in['email'] : ''), 0, 120)));
    if ($cn === '') fail('no_name');
    if ($ce !== '' && !filter_var($ce, FILTER_VALIDATE_EMAIL)) fail('bad_email');
    $au = sb_pub('getAvailableUnits', array($eventId, $date . ' ' . $time, 1));
    if (sb_net($au)) fail('sb_unavailable');
    $unitIds = isset($au['result']) && is_array($au['result']) ? array_values($au['result']) : array();
    if (!count($unitIds)) fail('slot_taken');
    $clientData = array('name' => $cn, 'email' => $ce, 'phone' => $cp);
    $r = sb_pub('book', array($eventId, (int)$unitIds[0], $date, $time, $clientData, array(), 1));
    if (sb_net($r)) fail('sb_unavailable');
    $b = isset($r['result']) && is_array($r['result']) ? $r['result'] : null;
    if (!$b) fail('booking_failed');
    $bid = 0;
    if (isset($b['bookings'][0]['id'])) $bid = (int)$b['bookings'][0]['id'];
    elseif (isset($b['id'])) $bid = (int)$b['id'];
    $ts = strtotime($date . ' ' . $time);
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
    $stMap = null;   // SB status-id -> confirmed/completed, built lazily if rows carry status_id
    $list = array();
    foreach ($rows as $b) {
        $start = parse_start($b);
        $ts = strtotime($start);
        if ($ts && $ts < time() - 3600) continue;
        $cname = (string)(isset($b['client']) ? $b['client'] : (isset($b['client_name']) ? $b['client_name'] : ''));
        if ($cname === '' && isset($b['client_id'])) $cname = 'client #' . $b['client_id'];
        // phone lives under different keys depending on the SB response shape
        $ph = '';
        foreach (array('client_phone', 'phone', 'client_mobile') as $pk) if (!empty($b[$pk])) { $ph = (string)$b[$pk]; break; }
        if ($ph === '' && isset($b['client']) && is_array($b['client']) && !empty($b['client']['phone'])) $ph = (string)$b['client']['phone'];
        $bid = (int)(isset($b['id']) ? $b['id'] : 0);
        // status: our staff marker first; else SimplyBook's own Status-feature id mapped by
        // name; else SB's legacy confirm flag. So the portal shows the truth from either side.
        $bmr = isset($bm[(string)$bid]) ? $bm[(string)$bid] : null;
        $st = $bmr ? (string)(isset($bmr['st']) ? $bmr['st'] : (!empty($bmr['confirmed']) ? 'confirmed' : '')) : '';
        if ($st === '' && !empty($b['status_id'])) {
            if ($stMap === null) {
                $stMap = array();
                foreach (sb_statuses() as $sx) {
                    $nm2 = strtolower((string)(isset($sx['name']) ? $sx['name'] : ''));
                    $sid2 = intval(isset($sx['id']) ? $sx['id'] : 0);
                    if (strpos($nm2, 'complet') !== false) $stMap[$sid2] = 'completed';
                    else if (strpos($nm2, 'confirm') !== false) $stMap[$sid2] = 'confirmed';
                }
            }
            $sid3 = intval($b['status_id']);
            if (isset($stMap[$sid3])) $st = $stMap[$sid3];
        }
        if ($st === '' && (!empty($b['is_confirm']) || !empty($b['is_confirmed']))) $st = 'confirmed';
        $list[] = array('id' => $bid,
                        'when' => $ts ? date('D j M g:ia', $ts) : trim($start),
                        'd' => $ts ? date('Y-m-d', $ts) : '',           // structured, for the day view
                        'tm' => $ts ? date('H:i', $ts) : '',
                        'who' => $cname,
                        'phone' => $ph,
                        'st' => $st,
                        'conf' => $st === 'confirmed',
                        'what' => (string)(isset($b['event_name']) ? $b['event_name'] : (isset($b['event']) ? $b['event'] : 'Service')),
                        'eventId' => (int)(isset($b['event_id']) ? $b['event_id'] : 0));
        if (count($list) >= 120) break;
    }
    out(array('ok' => true, 'bookings' => $list));
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
        if ($kind === 'default' && !empty($st['is_default'])) return $id;
    }
    return 0;
}

// staff: set a booking's status (confirmed / completed / clear). Writes SimplyBook's own
// Status feature via setStatus so their admin shows it too, and always keeps our marker
// so the portal state never depends on which SimplyBook plan features are enabled.
if ($action === 'staffstatus') {
    need_staff();
    $bid = (int)(isset($in['id']) ? $in['id'] : 0);
    $want = (string)(isset($in['status']) ? $in['status'] : '');
    if ($bid <= 0 || !in_array($want, array('confirmed', 'completed', 'none'), true)) fail('bad_request');
    $sb = false;
    if ($HAS_ADMIN) {
        $sid = $want === 'none' ? sb_status_id('default') : sb_status_id($want);
        if ($sid > 0) { $r = sb_adm('setStatus', array($bid, $sid)); $sb = !sb_net($r) && !empty($r['result']); }
    }
    list($lk, $db) = db_open();
    if (!isset($db['bkmeta'])) $db['bkmeta'] = array();
    foreach ($db['bkmeta'] as $k2 => $v2) if ((isset($v2['ts']) ? $v2['ts'] : 0) < time() - 86400 * 90) unset($db['bkmeta'][$k2]);
    if ($want === 'none') unset($db['bkmeta'][(string)$bid]);
    else $db['bkmeta'][(string)$bid] = array('st' => $want, 'ts' => time(), 'sb' => $sb ? 1 : 0);
    db_save($db); db_close($lk);
    out(array('ok' => true, 'sb' => $sb, 'st' => $want === 'none' ? '' : $want));
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
        foreach ((isset($c['machines']) && is_array($c['machines']) ? $c['machines'] : array()) as $mid2 => $m) {
            $ms[] = array(
                'cust' => (string)(isset($c['name']) ? $c['name'] : ''),
                'tier' => $tier,
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
                'help' => (string)(isset($m['help']) ? $m['help'] : ''),
                'fresh' => !isset($m['diskpct']));
            if (count($ms) >= 600) break 2;
        }
    }
    out(array('ok' => true, 'latest' => $latest, 'machines' => $ms, 'now' => gmdate('Y-m-d H:i')));
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
