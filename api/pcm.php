<?php
/**
 * 365 PC Manager - app-facing licensing + telemetry API.
 * The tray app POSTs JSON here. Server-only data store (gitignored).
 *
 *  action=activate {key, machine, name}   -> validates a licence key, binds the machine, returns tier+customer+next
 *  action=checkin  {key, machine, score}  -> records health; returns current tier (so lapsed support downgrades)
 *  action=help     {key, machine, message}-> relays a panic request to Slack (via slack-lead.php webhook file)
 *
 * Data file api/pcm-data.json:
 *  { "customers": { "<KEY>": {name, email, tier, next, created, machines:{<id>:{name,score,verdict,seen}} } } }
 */
header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');

$DATA = __DIR__ . '/pcm-data.json';
$WEBHOOK = __DIR__ . '/slack-webhook.php'; // returns $SLACK_WEBHOOK (server-only, gitignored)

// Load the DB. A missing file is a legitimately-empty DB; a PRESENT-but-unparseable file is
// NOT - returning empty there and saving would silently wipe every customer. So we throw.
function load($f){
    if (!file_exists($f)) return array('customers'=>array());
    $raw = (string)@file_get_contents($f);
    if ($raw === '') return array('customers'=>array());
    $d = json_decode($raw, true);
    if (!is_array($d)) { http_response_code(503); exit(json_encode(array('ok'=>false,'error'=>'db_unavailable'))); }
    if (!isset($d['customers'])) $d['customers'] = array();
    return $d;
}
// Atomic write (temp + rename) so a crash mid-write can't leave a torn file that load() rejects.
function save($f,$d){
    $tmp = $f . '.' . getmypid() . '.tmp';
    if (@file_put_contents($tmp, json_encode($d, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES), LOCK_EX) !== false) @rename($tmp, $f);
}
function out($a){ echo json_encode($a); exit; }

// Serialise the whole read-modify-write so concurrent check-ins / the SimplyBook callback
// can't lost-update each other. Returns the lock handle (release by fclose).
function db_lock($f){ $lk = @fopen($f . '.lock', 'c'); if ($lk) @flock($lk, LOCK_EX); return $lk; }

$raw = file_get_contents('php://input');
$in = json_decode($raw, true);
if (!is_array($in)) out(array('ok'=>false,'error'=>'bad_request'));

$action  = isset($in['action'])  ? preg_replace('/[^a-z]/','',$in['action']) : '';
$key     = isset($in['key'])      ? strtoupper(preg_replace('/[^A-Za-z0-9\-]/','',$in['key'])) : '';
$machine = isset($in['machine'])  ? preg_replace('/[^a-f0-9]/','',substr($in['machine'],0,32)) : '';

$db_lock = db_lock($DATA); // held until this request exits; serialises read-modify-write
$db = load($DATA);
$now = gmdate('Y-m-d H:i');

if ($action === 'activate') {
    if ($key === '' || !isset($db['customers'][$key])) out(array('ok'=>false,'error'=>'unknown_key'));
    $c =& $db['customers'][$key];
    // any valid key binds the machine and registers it for health monitoring; tier decides features
    $tier = (($c['tier'] ?? 'free') === 'pro') ? 'pro' : 'free';
    if (!isset($c['machines'])) $c['machines'] = array();
    if ($machine !== '' && !isset($c['machines'][$machine]) && count($c['machines']) < 25)
        $c['machines'][$machine] = array('name'=>substr((string)($in['name']??''),0,60),'score'=>0,'verdict'=>'','seen'=>$now,'activated'=>$now);
    save($DATA,$db);
    out(array('ok'=>true,'tier'=>$tier,'customer'=>$c['name'] ?? '','next'=>$c['next'] ?? ''));
}

if ($action === 'checkin') {
    $upd = pcm_update_info();   // latest app build (ver/url/sha) - sent to every check-in, keyed or not
    if ($key === '' || !isset($db['customers'][$key])) out(array('ok'=>true,'tier'=>'free') + $upd); // key gone => downgrade
    $c =& $db['customers'][$key];
    $tier = ($c['tier'] ?? 'free');
    if ($machine !== '') {
        if (!isset($c['machines'])) $c['machines'] = array();
        // abuse cap: one key registers a sane number of machines, not unbounded DB/disk growth
        if (!isset($c['machines'][$machine]) && count($c['machines']) >= 25)
            out(array('ok'=>true,'tier'=>$tier) + $upd);
        $c['machines'][$machine] = array_merge($c['machines'][$machine] ?? array(), array(
            'name'=>substr((string)($in['name']??($c['machines'][$machine]['name']??'')),0,60),
            'score'=>intval($in['score']??0), 'verdict'=>substr((string)($in['verdict']??''),0,24), 'seen'=>$now,
            'av'=>substr((string)($in['av']??''),0,8), 'backup'=>!empty($in['backup']),
            'diskpct'=>intval($in['diskpct']??0), 'w10'=>!empty($in['w10']), 'reboot'=>!empty($in['reboot']),
            'ver'=>intval($in['ver']??0)));
        // reminder preferences (for the SMS cron): minutes-before + wants-sms
        if (isset($in['remind_min'])) $c['remind_min'] = max(5, min(2880, intval($in['remind_min'])));
        if (isset($in['remind_sms'])) $c['remind_sms'] = !empty($in['remind_sms']);
        save($DATA,$db);
    }
    // ready = the owner has asked this customer to confirm their PC is on and ready to connect
    $ready = (!empty($c['ready_ask']) && empty($c['ready_confirm'])) ? $c['ready_ask'] : '';
    out(array('ok'=>true,'tier'=>$tier,'next'=>$c['next'] ?? '','next_ts'=>intval($c['next_ts'] ?? 0),'ready'=>$ready) + $upd);
}

// latest published app build, from the git-deployed manifest (downloads/pcm/version.json).
// Absent/unreadable manifest = no update offered - the app treats missing fields as "up to date".
function pcm_update_info() {
    $f = __DIR__ . '/../downloads/pcm/version.json';
    if (!is_readable($f)) return array();
    $raw = (string)@file_get_contents($f);
    if (substr($raw, 0, 3) === "\xEF\xBB\xBF") $raw = substr($raw, 3);   // tolerate a UTF-8 BOM
    $j = json_decode($raw, true);
    if (!is_array($j) || empty($j['ver']) || empty($j['url']) || empty($j['sha256'])) return array();
    return array('upd_ver'=>intval($j['ver']), 'upd_url'=>(string)$j['url'], 'upd_sha'=>(string)$j['sha256']);
}

if ($action === 'ready') {
    // the customer tapped "my PC is ready to connect" - stamp it + tell the tech on Slack
    if ($key === '' || !isset($db['customers'][$key])) out(array('ok'=>false,'error'=>'unknown_key'));
    $c =& $db['customers'][$key];
    $c['ready_confirm'] = $now; unset($c['ready_ask']);
    save($DATA,$db);
    $clean = function($s){ return str_replace(array("\r","\n",'<','>','&'), array(' ',' ','&lt;','&gt;','&amp;'), (string)$s); };
    $cust = $clean(substr((string)($c['name'] ?? '(customer)'),0,60));
    $sent = false;
    if (file_exists($WEBHOOK)) {
        include $WEBHOOK;
        if (!empty($SLACK_WEBHOOK)) {
            $text = ":white_check_mark: *PC ready to connect*\n*".$cust."* confirmed their computer is on and ready for you.\nMachine ".$machine." · key ".$key;
            $ch = curl_init($SLACK_WEBHOOK);
            curl_setopt_array($ch, array(CURLOPT_POST=>true, CURLOPT_RETURNTRANSFER=>true, CURLOPT_TIMEOUT=>6,
                CURLOPT_HTTPHEADER=>array('Content-Type: application/json'), CURLOPT_POSTFIELDS=>json_encode(array('text'=>$text))));
            $r = curl_exec($ch); $sent = ($r === 'ok'); curl_close($ch);
        }
    }
    out(array('ok'=>true,'sent'=>$sent));
}

// Verified-Call Shield: the app polls this every minute (registered machines only).
// Read-only - returns the active "we're about to ring you" code set from the admin console.
// No scammer can produce the code, so "the caller will say NNNN" proves it's really us.
if ($action === 'shield') {
    if ($key === '' || !isset($db['customers'][$key])) out(array('ok'=>true));
    $c = $db['customers'][$key];
    $ts = intval($c['shield_ts'] ?? 0);
    if ($ts > 0 && (time() - $ts) < 900 && !empty($c['shield_code']))
        out(array('ok'=>true,'code'=>(string)$c['shield_code'],'ask'=>$ts));
    out(array('ok'=>true));
}

if ($action === 'help') {
    // only registered machines can raise a help request (stops anonymous relay abuse)
    if ($key === '' || !isset($db['customers'][$key])) out(array('ok'=>false,'error'=>'unknown_key','sent'=>false));
    // optional SOS screenshot (user-previewed + consented in the app): base64 JPEG,
    // validated + size-capped, one per key+machine (overwrite = self-rotating; the key-hash
    // in the filename stops one key overwriting another customer's screenshot), rate-limited,
    // never web-served directly (.htaccess denies pcm-sos-*) - staff view via the authed admin.
    $shot = false;
    if (!empty($in['shot']) && $machine !== '' && isset($db['customers'][$key]['machines'][$machine])) {
        $okRate = true;   // max 6 screenshot writes per key per hour
        $rl = intval($db['customers'][$key]['shot_hr'] ?? 0);
        $rlN = intval($db['customers'][$key]['shot_n'] ?? 0);
        $hr = intval(time() / 3600);
        if ($rl !== $hr) { $rlN = 0; }
        if ($rlN >= 6) $okRate = false;
        if ($okRate) {
            $b = base64_decode(substr((string)$in['shot'], 0, 900000), true);
            if ($b !== false && strlen($b) > 1000 && strlen($b) < 650000 && substr($b, 0, 3) === "\xFF\xD8\xFF") {
                $kh = substr(hash('sha256', $key), 0, 12);
                if (@file_put_contents(__DIR__ . '/pcm-sos-' . $kh . '-' . $machine . '.jpg', $b, LOCK_EX) !== false) {
                    $shot = true;
                    $db['customers'][$key]['shot_hr'] = $hr;
                    $db['customers'][$key]['shot_n'] = $rlN + 1;
                }
            }
        }
    }
    // relay to Slack; degrade gracefully if webhook file is absent.
    // escaping < > & neutralises all Slack link / mention / command syntax in webhook text.
    $clean = function($s){ return str_replace(array("\r","\n",'<','>','&'), array(' ',' ','&lt;','&gt;','&amp;'), (string)$s); };
    $cust = $clean(substr((string)($in['customer']??''),0,60));
    $msg  = $clean(substr((string)($in['message']??''),0,600));
    $score= intval($in['score']??0);
    $text = ":rotating_light: *PC Manager help request*\n*".($cust!==''?$cust:'(registered)')."* — health {$score}%\n".$msg
          .($shot ? "\n:camera: they attached a picture of their screen — view it in the PCM admin console" : "")
          ."\nMachine ".$machine." · key ".$key;
    $sent = false;
    if (file_exists($WEBHOOK)) {
        include $WEBHOOK; // sets $SLACK_WEBHOOK
        if (!empty($SLACK_WEBHOOK)) {
            $ch = curl_init($SLACK_WEBHOOK);
            curl_setopt_array($ch, array(CURLOPT_POST=>true, CURLOPT_RETURNTRANSFER=>true, CURLOPT_TIMEOUT=>6,
                CURLOPT_HTTPHEADER=>array('Content-Type: application/json'),
                CURLOPT_POSTFIELDS=>json_encode(array('text'=>$text))));
            $r = curl_exec($ch); $sent = ($r === 'ok'); curl_close($ch);
        }
    }
    // also stamp the machine's last help ping (+ screenshot marker) for the admin view
    if ($key!=='' && isset($db['customers'][$key]['machines'][$machine])) {
        $db['customers'][$key]['machines'][$machine]['help'] = $now;
        if ($shot) $db['customers'][$key]['machines'][$machine]['shot'] = $now;
        save($DATA,$db);
    }
    out(array('ok'=>true,'sent'=>$sent));
}

out(array('ok'=>false,'error'=>'unknown_action'));
