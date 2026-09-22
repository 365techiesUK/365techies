<?php
/*
 * Staff-only: this month's jobs and their invoices (22 Sep 2026, v2 the same day).
 *
 *   action=list             -> this month's "Quote agreed" jobs with where their
 *                              invoice stands (none / unsent / sent / paid), this
 *                              month's other unsent invoices, and the older unsent
 *                              ones folded away (5-min cache; fresh=1 forces a read)
 *   action=create  {job}    -> make the QuickBooks invoice that job is owed
 *                              (or link the one that already matches it). WRITE 1.
 *   action=pdf     {id}     -> an invoice exactly as the customer would receive it
 *   action=send    {id}     -> QuickBooks emails it, from its own template, to the
 *                              address QuickBooks holds. WRITE 2.
 *   action=hold / unhold    -> park a row without sending it
 *
 * WHY
 * The owner's words: the new jobs of the last month are in Slack, and the system
 * should produce invoices for those customers - then let a person check each one
 * before it goes. So: raising is automatic (the morning sweep, or one click here),
 * sending is a human's "Approve & send" against the real PDF.
 *
 * SECURITY
 * - Staff token only, re-implemented locally (same rules as pcm-jobs.php /
 *   pcm-qbo.php / pcm-invite.php / pcm-paylink.php / pcm-geo.php). Fails closed.
 * - The request names a JOB or an INVOICE ID. Never a recipient, never an amount,
 *   never a customer: those come from the job record and from QuickBooks.
 * - Creating honours the same gates as every other writer ($QBO_LIVE_ENABLED,
 *   $QBO_ONLY_KEY) and the same customer map under the same lock.
 * - An invoice already EmailSent, or with nothing owing, is refused at send time.
 *
 * NO closing tag in this file.
 */

@ini_set('display_errors', '0');
header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');

require_once __DIR__ . '/pcm-invq-sweep.php';

$DATA = __DIR__ . '/pcm-data.json';

function out($a) { header('Content-Type: application/json; charset=utf-8'); echo json_encode($a, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE); exit; }
function fail($e, $x = array()) { out(array_merge(array('ok' => false, 'error' => $e), $x)); }

$raw = file_get_contents('php://input');
$in  = json_decode((string)$raw, true);
if (!is_array($in)) $in = $_POST;
$action  = isset($in['action']) ? preg_replace('/[^a-z]/', '', (string)$in['action']) : '';
$machine = isset($in['machine']) ? preg_replace('/[^A-Za-z0-9._-]/', '', (string)$in['machine']) : '';

// ---- staff auth (mirror of the other console endpoints) --------------------
function db_read($f) { $j = @json_decode((string)@file_get_contents($f), true); return is_array($j) ? $j : null; }
function need_staff() {
    global $in, $machine, $DATA;
    $tok = isset($in['stoken']) ? preg_replace('/[^a-f0-9]/', '', (string)$in['stoken']) : '';
    if ($tok === '') fail('not_staff');
    $db = db_read($DATA);
    if (!$db) fail('db_unavailable');
    $s = isset($db['staff'][$tok]) ? $db['staff'][$tok] : null;
    $slide = !empty($s['trust']) ? 2592000 : 43200;
    $cap   = !empty($s['trust']) ? 7776000 : 43200;
    $ok = $s
        && (isset($s['ts'])  ? $s['ts']  : 0) > time() - $slide
        && (isset($s['iat']) ? $s['iat'] : 0) > time() - $cap
        && !empty($s['machine']) && $s['machine'] === $machine;
    if (!$ok) fail('not_staff');
    return array($db, $s);
}
list($db, $staff) = need_staff();
$who = trim((string)(isset($staff['name']) ? $staff['name'] : (isset($staff['who']) ? $staff['who'] : '')));
if ($who === '') $who = 'staff';

$id  = preg_replace('/[^0-9]/', '', (string)(isset($in['id']) ? $in['id'] : ''));
$job = preg_replace('/[^0-9a-zA-Z-]/', '', (string)(isset($in['job']) ? $in['job'] : ''));
if (!in_array($action, array('list', 'create', 'pdf', 'send', 'hold', 'unhold', 'setjob', 'dismiss'), true)) fail('bad_action');

/* "Not a job": a PC Manager service that was goodwill, a duplicate write-up, a
   test. Leaves the list; touches nothing in QuickBooks. */
if ($action === 'dismiss') {
    if ($job === '') fail('bad_job');
    $r = invq_job_dismiss($job, $who);
    if (empty($r['ok'])) fail($r['error']);
    invq_store_locked(function ($d) { $d['cache'] = null; return array('ok' => true, 'data' => $d); });
    invq_log('dismissed job ' . $job . ' by ' . $who);
    out(array('ok' => true));
}

// ===========================================================================
/* A price or description typed in the portal for a job whose Slack post had none.
   This sets what the INVOICE will say - it does not make one, and it does not send
   anything. QuickBooks is not needed for it, so it works before connecting. */
if ($action === 'setjob') {
    if ($job === '') fail('bad_job');
    $amount = (isset($in['amount']) && trim((string)$in['amount']) !== '') ? preg_replace('/[^0-9.]/', '', (string)$in['amount']) : null;
    $desc   = (isset($in['desc']) && trim((string)$in['desc']) !== '') ? (string)$in['desc'] : null;
    /* The customer's email, typed here when the Slack post had none (22 Sep: Colin
       Sutton). It goes on the JOB - the new QuickBooks customer is made from it and
       the send later goes to that customer's address, which "Approve & send" names
       before anything leaves. Staff-typed, behind the staff gate, validated. */
    $email = null;
    if (isset($in['email']) && trim((string)$in['email']) !== '') {
        $email = invq_email_ok($in['email']);
        if ($email === '') fail('bad_email');
    }
    /* The service picked from the drop-down: an id that must be on QuickBooks' own
       list (fetched here, cached an hour) - the request can name it, never define it. */
    $item = null;
    $itemId = preg_replace('/[^0-9]/', '', (string)(isset($in['item']) ? $in['item'] : ''));
    if ($itemId !== '') {
        $c = invq_connect();
        if (empty($c['ok'])) fail($c['why']);
        $item = invq_item_find(invq_items($c), $itemId);
        if (!$item) fail('bad_item');
    }
    $r = invq_job_set($job, $amount, $desc, $who, $item, $email);
    if (empty($r['ok'])) fail($r['error']);
    invq_log('set job ' . $job . ($amount !== null ? ' amount ' . $amount : '') . ($desc !== null ? ' desc' : '') . ($item ? ' item ' . $item['id'] : '') . ($email !== null ? ' email' : '') . ' by ' . $who);
    out(array('ok' => true, 'item' => ($item ? $item['name'] : '')));
}

if ($action === 'hold' || $action === 'unhold') {
    if ($id === '') fail('bad_id');
    if (!invq_set_held($id, $action === 'hold')) fail('store');
    invq_log(($action === 'hold' ? 'held ' : 'released ') . $id . ' by ' . $who);
    out(array('ok' => true, 'held' => ($action === 'hold')));
}

$c = invq_connect();
if (empty($c['ok'])) {
    if ($action === 'pdf') { http_response_code(503); fail($c['why']); }
    out(array('ok' => true, 'connected' => false, 'why' => $c['why'], 'jobs' => array(), 'waiting' => array(), 'older' => array()));
}

if ($action === 'list') {
    $o = invq_overview($c, !empty($in['fresh']));
    /* How the Slack side is doing, so "no Slack jobs" is never silent: the last poll
       time and Slack's own error word (not_in_channel, missing_scope, ...). */
    require_once __DIR__ . '/pcm-slackjobs-sweep.php';
    $st = sj_status_read();
    $slack = array('last' => (int)(isset($st['last']) ? $st['last'] : 0), 'error' => (string)(isset($st['error']) ? $st['error'] : ''),
                   'jobs' => (int)(isset($st['jobs']) ? $st['jobs'] : 0), 'channels' => (array)(isset($st['channels']) ? $st['channels'] : array()));
    out(array('ok' => true, 'connected' => true, 'jobs' => $o['jobs'], 'waiting' => $o['waiting'], 'older' => $o['older'],
              'cached' => !empty($o['cached']), 'stale' => !empty($o['stale']), 'why' => isset($o['why']) ? $o['why'] : '',
              'live' => !empty($c['live']), 'only_key' => ($c['only'] !== ''), 'slack' => $slack,
              'items' => invq_items($c)));   // QuickBooks' Products & Services, for the drop-down
}

if ($action === 'create') {
    if ($job === '') fail('bad_job');
    $r = invq_create_for_job($c, $job, $who, false);
    if (empty($r['ok'])) fail($r['error'], array_intersect_key($r, array('why' => 1, 'name' => 1, 'invoice' => 1)));
    out(array('ok' => true, 'invoice' => $r['invoice'], 'linked' => !empty($r['linked'])));
}

if ($action === 'pdf') {
    if ($id === '') { http_response_code(400); fail('bad_id'); }
    $one = invq_api($c, 'GET', '/invoice/' . $id);
    if (!qbo_lib_ok($one) || empty($one['json']['Invoice']['Id'])) { http_response_code(404); fail('not_found'); }
    $pdf = invq_api($c, 'GET', '/invoice/' . $id . '/pdf', null, 'application/pdf');
    if (!qbo_lib_ok($pdf) || strlen($pdf['raw']) < 100 || substr($pdf['raw'], 0, 4) !== '%PDF') { http_response_code(502); fail('pdf_unavailable'); }
    $num = preg_replace('/[^A-Za-z0-9_-]/', '', (string)(isset($one['json']['Invoice']['DocNumber']) ? $one['json']['Invoice']['DocNumber'] : $id));
    header('Content-Type: application/pdf');
    header('Content-Disposition: inline; filename="invoice-' . ($num !== '' ? $num : $id) . '-preview.pdf"');
    header('Content-Length: ' . strlen($pdf['raw']));
    echo $pdf['raw'];
    exit;
}

if ($action === 'send') {
    if ($id === '') fail('bad_id');
    $r = invq_send($c, $id, $who);
    if (empty($r['ok'])) fail($r['error'], isset($r['why']) ? array('why' => $r['why']) : array());
    out(array('ok' => true, 'to' => $r['to'], 'number' => $r['number'], 'amount' => $r['amount']));
}

fail('bad_action');
