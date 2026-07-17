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

function load($f){ return file_exists($f) ? (json_decode((string)@file_get_contents($f), true) ?: array('customers'=>array())) : array('customers'=>array()); }
function save($f,$d){ @file_put_contents($f, json_encode($d, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES), LOCK_EX); }
function out($a){ echo json_encode($a); exit; }

$raw = file_get_contents('php://input');
$in = json_decode($raw, true);
if (!is_array($in)) out(array('ok'=>false,'error'=>'bad_request'));

$action  = isset($in['action'])  ? preg_replace('/[^a-z]/','',$in['action']) : '';
$key     = isset($in['key'])      ? strtoupper(preg_replace('/[^A-Za-z0-9\-]/','',$in['key'])) : '';
$machine = isset($in['machine'])  ? preg_replace('/[^a-f0-9]/','',substr($in['machine'],0,32)) : '';

$db = load($DATA);
$now = gmdate('Y-m-d H:i');

if ($action === 'activate') {
    if ($key === '' || !isset($db['customers'][$key])) out(array('ok'=>false,'error'=>'unknown_key'));
    $c =& $db['customers'][$key];
    if (($c['tier'] ?? 'free') !== 'pro') out(array('ok'=>false,'error'=>'not_on_support'));
    if (!isset($c['machines'])) $c['machines'] = array();
    if ($machine !== '' && !isset($c['machines'][$machine]))
        $c['machines'][$machine] = array('name'=>substr((string)($in['name']??''),0,60),'score'=>0,'verdict'=>'','seen'=>$now,'activated'=>$now);
    save($DATA,$db);
    out(array('ok'=>true,'tier'=>'pro','customer'=>$c['name'] ?? '','next'=>$c['next'] ?? ''));
}

if ($action === 'checkin') {
    if ($key === '' || !isset($db['customers'][$key])) out(array('ok'=>true,'tier'=>'free')); // key gone => downgrade
    $c =& $db['customers'][$key];
    $tier = ($c['tier'] ?? 'free');
    if ($machine !== '') {
        if (!isset($c['machines'])) $c['machines'] = array();
        $c['machines'][$machine] = array_merge($c['machines'][$machine] ?? array(), array(
            'name'=>substr((string)($in['name']??($c['machines'][$machine]['name']??'')),0,60),
            'score'=>intval($in['score']??0), 'verdict'=>substr((string)($in['verdict']??''),0,24), 'seen'=>$now));
        save($DATA,$db);
    }
    out(array('ok'=>true,'tier'=>$tier,'next'=>$c['next'] ?? ''));
}

if ($action === 'help') {
    // relay to Slack; degrade gracefully if webhook file is absent
    $cust = substr((string)($in['customer']??''),0,60);
    $msg  = substr((string)($in['message']??''),0,600);
    $score= intval($in['score']??0);
    $text = ":rotating_light: *PC Manager help request*\n*".($cust!==''?$cust:'(unregistered)')."* — health {$score}%\n".$msg."\nMachine ".$machine." · key ".$key;
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
