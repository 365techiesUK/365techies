<?php
/**
 * 365 PC Manager - "Message us" from inside the app. The licence-keyed sibling of
 * pcm-msg.php (the portal door). Same store, same poller, same Slack; a different key.
 *
 *  POST {action:"list", key, machine}              -> {ok, msgs:[{t,w,x,p}], unread:0}
 *  POST {action:"send", key, machine, text, ctx?}  -> {ok, msgs:[...]}
 *
 * Gate: the licence key must exist and the machine must be one that key activated - the
 * pcm-service.php rule. No tier check: any keyed customer may message (owner, 2026-09-11).
 * A keyless install never gets here; the app shows it the phone number instead.
 *
 * ONE THREAD PER MACHINE (owner, 2026-09-11): the thread id folds the machine in, so two
 * PCs on one key never share a conversation and none is the portal's account thread.
 * `ctx` is the PC's state as the app already reports it at check-in; it is rendered as one
 * line under the message in Slack and is never returned to the customer.
 *
 * The customer-DB lock is held only long enough to answer "who is this?", then released
 * before any message work - exactly as pcm-msg.php does - so a slow Slack call can never
 * stall the check-ins queued behind us.
 */
header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
require_once __DIR__ . '/pcm-msg-lib.php';
require_once __DIR__ . '/pcm-slack-lib.php';
if (!function_exists('out')) { function out($a){ echo json_encode($a); exit; } }

$DATA = __DIR__ . '/pcm-data.json';
$raw  = file_get_contents('php://input');
$in   = json_decode($raw, true);
if (!is_array($in)) out(array('ok'=>false,'error'=>'bad_request'));

$action  = isset($in['action'])  ? preg_replace('/[^a-z]/', '', (string)$in['action']) : '';
$key     = isset($in['key'])     ? strtoupper(preg_replace('/[^A-Za-z0-9\-]/', '', (string)$in['key'])) : '';
$machine = isset($in['machine']) ? preg_replace('/[^a-f0-9]/', '', substr((string)$in['machine'], 0, 32)) : '';
if ($key === '') out(array('ok'=>false,'error'=>'no_key'));

// --- identity under the shared lock, then RELEASE it --------------------------------
$db_lock = @fopen($DATA . '.lock', 'c');
if ($db_lock) @flock($db_lock, LOCK_EX);
$db = array('customers'=>array());
if (file_exists($DATA)) {
    $rawdb = (string)@file_get_contents($DATA);
    if ($rawdb !== '') {
        $d = json_decode($rawdb, true);
        if (!is_array($d)) {
            if ($db_lock) { @flock($db_lock, LOCK_UN); @fclose($db_lock); }
            http_response_code(503); out(array('ok'=>false,'error'=>'db_unavailable'));
        }
        $db = $d;
        if (!isset($db['customers'])) $db['customers'] = array();
    }
}
$g = msg_app_gate($db, $key, $machine);
if ($db_lock) { @flock($db_lock, LOCK_UN); @fclose($db_lock); $db_lock = null; }
unset($db);
if (empty($g['ok'])) out(array('ok'=>false,'error'=>$g['error']));

$id = msg_app_id($key, $machine);

if ($action === 'list') out(msg_app_list($id));

if ($action === 'send') {
    $meta = array('key'=>$key, 'machine'=>$machine, 'name'=>$g['name'], 'email'=>$g['email'], 'pcname'=>$g['pcname']);
    $ctx  = (isset($in['ctx']) && is_array($in['ctx'])) ? $in['ctx'] : null;
    // Try Slack straight away so the team sees it in seconds; if that fails the message
    // stays pending and pcm-msg-poll.php delivers it on its next run.
    $deliver = slk_ready() ? function ($head, $thread) { return slk_post($head, $thread, 5); } : null;
    out(msg_app_send($id, $meta, isset($in['text']) ? $in['text'] : '', $ctx, $deliver));
}

out(array('ok'=>false,'error'=>'bad_action'));
