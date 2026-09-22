<?php
/*
 * Staff-only: the invoices waiting for someone's OK (22 Sep 2026).
 *
 *   action=list           -> every QuickBooks invoice with a balance that has not
 *                            been emailed, as rows with warnings (5-min cache;
 *                            fresh=1 forces a live read)
 *   action=pdf   {id}     -> that invoice exactly as the customer would receive it
 *   action=send  {id}     -> QuickBooks emails it, from its own template, to the
 *                            address QuickBooks holds. THE ONE WRITE.
 *   action=hold / unhold  -> park a row without sending it
 *
 * WHY
 * Raising an invoice is automatic (the console does it at "Quote agreed"); sending
 * it depended on one person remembering, so invoices sat unsent. Now every unsent
 * invoice - console-made or hand-raised - waits in one place, is previewed as the
 * real PDF, and leaves only on an explicit "Approve & send".
 *
 * SECURITY
 * - Staff token only, re-implemented locally (same rules as pcm-jobs.php /
 *   pcm-qbo.php / pcm-invite.php / pcm-paylink.php / pcm-geo.php). Fails closed.
 * - The recipient is NEVER taken from the request. invq_send() re-reads the
 *   invoice from QuickBooks and uses the address QuickBooks holds; a wrong address
 *   is fixed in QuickBooks, not overridden here.
 * - An invoice that is already EmailSent, or has nothing owing, is refused - a
 *   double-click cannot send twice.
 * - This file cannot create, edit or void an invoice; see pcm-invq-sweep.php.
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

$id = preg_replace('/[^0-9]/', '', (string)(isset($in['id']) ? $in['id'] : ''));
if (!in_array($action, array('list', 'pdf', 'send', 'hold', 'unhold'), true)) fail('bad_action');

// ===========================================================================
if ($action === 'hold' || $action === 'unhold') {
    if ($id === '') fail('bad_id');
    if (!invq_set_held($id, $action === 'hold')) fail('store');
    invq_log(($action === 'hold' ? 'held ' : 'released ') . $id . ' by ' . $who);
    out(array('ok' => true, 'held' => ($action === 'hold')));
}

$c = invq_connect();
if (empty($c['ok'])) {
    if ($action === 'pdf') { http_response_code(503); fail($c['why']); }
    out(array('ok' => true, 'connected' => false, 'why' => $c['why'], 'rows' => array()));
}

if ($action === 'list') {
    $r = invq_rows($c, !empty($in['fresh']));
    out(array('ok' => true, 'connected' => true, 'rows' => $r['rows'], 'cached' => !empty($r['cached']),
              'stale' => !empty($r['stale']), 'why' => isset($r['why']) ? $r['why'] : ''));
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
