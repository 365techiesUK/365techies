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
    if ($machine !== '' && !isset($c['machines'][$machine]))
        $c['machines'][$machine] = array('name'=>substr((string)($in['name']??''),0,60),'score'=>0,'verdict'=>'','seen'=>$now,'activated'=>$now);
    save($DATA,$db);
    out(array('ok'=>true,'tier'=>$tier,'customer'=>$c['name'] ?? '','next'=>$c['next'] ?? ''));
}

if ($action === 'checkin') {
    if ($key === '' || !isset($db['customers'][$key])) out(array('ok'=>true,'tier'=>'free')); // key gone => downgrade
    $c =& $db['customers'][$key];
    $tier = ($c['tier'] ?? 'free');
    if ($machine !== '') {
        if (!isset($c['machines'])) $c['machines'] = array();
        $c['machines'][$machine] = array_merge($c['machines'][$machine] ?? array(), array(
            'name'=>substr((string)($in['name']??($c['machines'][$machine]['name']??'')),0,60),
            'score'=>intval($in['score']??0), 'verdict'=>substr((string)($in['verdict']??''),0,24), 'seen'=>$now,
            'av'=>substr((string)($in['av']??''),0,8), 'backup'=>!empty($in['backup']),
            'diskpct'=>intval($in['diskpct']??0), 'w10'=>!empty($in['w10']), 'reboot'=>!empty($in['reboot'])));
        save($DATA,$db);
    }
    out(array('ok'=>true,'tier'=>$tier,'next'=>$c['next'] ?? ''));
}

if ($action === 'help') {
    // only registered machines can raise a help request (stops anonymous relay abuse)
    if ($key === '' || !isset($db['customers'][$key])) out(array('ok'=>false,'error'=>'unknown_key','sent'=>false));
    // relay to Slack; degrade gracefully if webhook file is absent.
    // escaping < > & neutralises all Slack link / mention / command syntax in webhook text.
    $clean = function($s){ return str_replace(array('<','>','&'), array('&lt;','&gt;','&amp;'), (string)$s); };
    $cust = $clean(substr((string)($in['customer']??''),0,60));
    $msg  = $clean(substr((string)($in['message']??''),0,600));
    $score= intval($in['score']??0);
    $text = ":rotating_light: *PC Manager help request*\n*".($cust!==''?$cust:'(registered)')."* — health {$score}%\n".$msg."\nMachine ".$machine." · key ".$key;
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
    // also stamp the machine's last help ping for the admin view
    if ($key!=='' && isset($db['customers'][$key]['machines'][$machine])) {
        $db['customers'][$key]['machines'][$machine]['help'] = $now;
        save($DATA,$db);
    }
    out(array('ok'=>true,'sent'=>$sent));
}

out(array('ok'=>false,'error'=>'unknown_action'));
