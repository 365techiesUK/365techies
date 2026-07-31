<?php
/**
 * Portal messaging - the customer's side.
 *
 *  action=list {wtoken, machine}         -> {ok, msgs:[...], thread:bool}
 *  action=send {wtoken, machine, text}   -> {ok, msgs:[...]}
 *
 * The customer types in the 365 portal. Engineers answer in Slack. Neither
 * knows about the other's tool. Auth is the same wtoken -> websessions check as
 * pcm-wcheck.php / pcm-dash.php, including the machine binding that FAILS
 * CLOSED.
 *
 * OUR STORE IS THE RECORD, SLACK IS A SURFACE
 * -------------------------------------------
 * The message is written here FIRST and posted to Slack second. If Slack is
 * down, misconfigured, or simply not set up yet, the customer's message is
 * still saved and still shown to them; pcm-msg-poll.php retries the delivery.
 * Nothing a customer types can be lost because a third party had a bad day.
 *
 * That ordering also decides the commercial question: because we hold every
 * message, Slack's free-plan history limits (90-day visibility, ~1-year rolling
 * deletion) only affect what engineers can scroll back to inside Slack. The
 * portal and these files keep the lot.
 *
 * WHY NOT pcm-data.json
 * ---------------------
 * Conversations are chatty and unbounded; pcm-data.json is one shared flat file
 * behind one exclusive lock that every app check-in and portal load queues on.
 * Messages live in their own per-customer blob, the pattern pcm-wifi.php
 * established - and like those, the file is gitignored AND .htaccess-denied
 * with the (\..*)? suffix so .tmp and .lock are covered too. Missing either
 * half has publicly exposed customer data in this project once already.
 */
header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');

// Both at TOP-LEVEL scope, never inside a function or branch. Neither library
// exports top-level variables, so they are safe either way - but pcm-review.php
// looked safe too, and including it from function scope silently emptied the
// mail queue for the feature's entire life. Top level, always, no exceptions.
require_once __DIR__ . '/pcm-msg-lib.php';
require_once __DIR__ . '/pcm-slack-lib.php';

$DATA    = __DIR__ . '/pcm-data.json';
$MAX_RAW = 6000;

function out($a){ echo json_encode($a); exit; }

$raw = file_get_contents('php://input');
if (strlen($raw) > $MAX_RAW) out(array('ok'=>false,'error'=>'too_big'));
$in = json_decode($raw, true);
if (!is_array($in)) out(array('ok'=>false,'error'=>'bad_request'));

$action  = isset($in['action'])  ? preg_replace('/[^a-z]/','',$in['action']) : '';
$machine = isset($in['machine']) ? preg_replace('/[^a-f0-9]/','',substr((string)$in['machine'],0,32)) : '';
$wt      = isset($in['wtoken'])  ? preg_replace('/[^a-f0-9]/','',(string)$in['wtoken']) : '';
if ($wt === '') out(array('ok'=>false,'error'=>'expired'));

// --- session -> customer, then RELEASE the shared lock -----------------------
// We only need pcm-data.json to answer "who is this?". Holding its exclusive
// lock while talking to Slack over the network would stall every app check-in
// and portal load in the queue behind us, so the lock is dropped the moment the
// identity is known and all message work happens in the per-customer blob.
$db_lock = @fopen($DATA . '.lock', 'c');
if ($db_lock) @flock($db_lock, LOCK_EX);
$db = array('customers'=>array());
if (file_exists($DATA)) {
    $rawdb = (string)@file_get_contents($DATA);
    if ($rawdb !== '') {
        $d = json_decode($rawdb, true);
        if (!is_array($d)) {
            if ($db_lock) { @flock($db_lock, LOCK_UN); @fclose($db_lock); }
            http_response_code(503); exit(json_encode(array('ok'=>false,'error'=>'db_unavailable')));
        }
        $db = $d;
        if (!isset($db['customers'])) $db['customers'] = array();
    }
}

$ws = isset($db['websessions'][$wt]) ? $db['websessions'][$wt] : null;
if ($ws) {
    if (!empty($ws['forever'])) { $slide = 31536000; $cap = PHP_INT_MAX; }
    else { $slide = !empty($ws['long']) ? 5184000 : 43200; $cap = !empty($ws['long']) ? 7776000 : 86400; }
    $fresh = intval($ws['ts'] ?? 0) > time() - $slide && ($cap === PHP_INT_MAX || intval($ws['iat'] ?? 0) > time() - $cap);
    if ($fresh && !empty($ws['machine']) && $ws['machine'] !== $machine) $fresh = false;
    if (!$fresh) $ws = null;
}
if (!$ws) { if ($db_lock) { @flock($db_lock, LOCK_UN); @fclose($db_lock); } out(array('ok'=>false,'error'=>'expired')); }

$key = (string)$ws['key'];
if ($key === '' || !isset($db['customers'][$key])) {
    if ($db_lock) { @flock($db_lock, LOCK_UN); @fclose($db_lock); }
    out(array('ok'=>false,'error'=>'unknown_key'));
}
$member  = isset($ws['member']) ? strtolower((string)$ws['member']) : '';
$custNm  = msg_clean((string)($db['customers'][$key]['name'] ?? ''), 60);
$custEm  = msg_clean((string)($db['customers'][$key]['email'] ?? ''), 80);
if ($db_lock) { @flock($db_lock, LOCK_UN); @fclose($db_lock); $db_lock = null; }
unset($db);

// A company team member gets their own thread, exactly as they get their own
// dashboard layout and their own saved checks - one employee's question must
// not land in the director's conversation.
$id = msg_id($key, $member);

if ($action === 'list') {
    list($box, $lk) = msg_open($id);
    // Opening the thread IS reading it: the customer is looking at the messages
    // right now, so clearing the unread marker here is honest.
    if (!empty($box['unread'])) { $box['unread'] = 0; msg_save($id, $box); }
    msg_close($lk);
    out(array('ok'=>true, 'msgs'=>msg_public($box), 'unread'=>0));
}

if ($action === 'send') {
    $text = msg_clean($in['text'] ?? '', MSG_MAX_LEN);
    if ($text === '') out(array('ok'=>false,'error'=>'empty'));

    list($box, $lk) = msg_open($id);

    // Not a security control - it stops a stuck client (or an impatient double
    // tap) filling the blob and the Slack thread with duplicates.
    $lastT = 0;
    foreach ($box['msgs'] as $m) if ((string)($m['w'] ?? '') === 'c') { $t = intval($m['t'] ?? 0); if ($t > $lastT) $lastT = $t; }
    if ($lastT > time() - 2) { msg_close($lk); out(array('ok'=>false,'error'=>'slow_down')); }

    $hour = 0;
    foreach ($box['msgs'] as $m) if ((string)($m['w'] ?? '') === 'c' && intval($m['t'] ?? 0) > time() - 3600) $hour++;
    if ($hour >= MSG_PER_HOUR) { msg_close($lk); out(array('ok'=>false,'error'=>'too_many')); }

    // STORE FIRST. Everything after this can fail without losing the message.
    $box['msgs'][] = array('t'=>time(), 'w'=>'c', 'x'=>$text, 'p'=>1);
    $box['key']    = $key;
    $box['member'] = $member;
    $box['name']   = $custNm;
    $box['email']  = $custEm;
    msg_trim($box);
    msg_save($id, $box);
    msg_close($lk);

    // Then try Slack, outside the lock. A failure here leaves p=1 (pending) and
    // pcm-msg-poll.php delivers it on the next run.
    if (slk_ready()) {
        $who  = $custNm !== '' ? $custNm : 'A customer';
        if ($member !== '') $who .= ' (' . $member . ')';
        $head = ($box['thread'] === '')
            ? ":speech_balloon: *" . $who . "* messaged from the portal"
              . ($custEm !== '' ? "\n" . $custEm : '')
              . "\nReply *in this thread* and it appears in their portal.\n\n" . $text
            : $text;
        $r = slk_post($head, $box['thread'], 5);
        if (!empty($r['ok'])) {
            list($box, $lk) = msg_open($id);          // re-open: we let go of the lock
            if ($box['thread'] === '') { $box['thread'] = (string)$r['ts']; $box['cursor'] = (string)$r['ts']; }
            for ($i = count($box['msgs']) - 1; $i >= 0; $i--) {
                if (!empty($box['msgs'][$i]['p'])) { $box['msgs'][$i]['p'] = 0; break; }
            }
            msg_save($id, $box);
            msg_close($lk);
        }
    }

    list($box, $lk) = msg_open($id);
    msg_close($lk);
    out(array('ok'=>true, 'msgs'=>msg_public($box)));
}

out(array('ok'=>false,'error'=>'bad_action'));
