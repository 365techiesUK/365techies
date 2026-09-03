<?php
/**
 * The customer's own invoices, read from QuickBooks Online for the portal.
 *
 * READ-ONLY BY CONSTRUCTION. This endpoint never creates, updates, sends or
 * voids anything in QuickBooks, and never writes to the monthly biller's state
 * file. The two writers (pcm-invoice.php, pcm-qbo.php) stay the only things
 * that can change the books.
 *
 * THE RISK THIS FILE EXISTS TO MANAGE is showing one customer another's
 * invoices, so the identity chain is deliberately short and every link is
 * server-side:
 *
 *   portal wtoken  ->  websession  ->  OUR customer record  ->  its stored email
 *                  ->  sha1(email|realm)  ->  QuickBooks customer id
 *                  ->  invoices WHERE CustomerRef = that id
 *
 * Nothing in the request influences which customer is looked up: not an email,
 * not a QuickBooks id, not a name. The request carries only the session token,
 * and the email used is the one already on our record (set by staff at
 * activation or by a verified sign-in code), never one supplied by the caller.
 * The PDF action re-fetches the invoice and checks its CustomerRef against the
 * same id before a single byte is streamed - an invoice id is a small integer,
 * so guessing one is trivial and it must never be enough on its own.
 *
 * Actions:  list (default) | pdf
 * Auth:     wtoken web session, account holder only (billing is theirs, not a
 *           team member's - the same rule as the address card and the
 *           GoCardless summary in pcm.php).
 */

@ini_set('display_errors', '0');
header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');

$BASE   = __DIR__;
$CFG    = $BASE . '/pcm-quickbooks.php';
$TOKENF = $BASE . '/pcm-qbo-token.json';
$DATA   = $BASE . '/pcm-data.json';
$STATEF = $BASE . '/pcm-invoice-state.json';
$LOCKF  = $BASE . '/pcm-invoice.lock';
$CACHEF = $BASE . '/pcm-qbo-invcache.json';

$MINORVERSION = '70';
$CACHE_TTL    = 600;     // 10 minutes: invoices change monthly, not by the second
$MAX_ROWS     = 24;      // two years of monthly invoices
$CACHE_MAX    = 300;     // entries kept in the cache file

require_once __DIR__ . '/pcm-qbo-lib.php';

function out($a) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($a, JSON_UNESCAPED_SLASHES); exit;
}
function fail($e, $extra = array()) { out(array_merge(array('ok' => false, 'error' => $e), $extra)); }

// ---- input ---------------------------------------------------------------
$raw = file_get_contents('php://input');
$in  = json_decode((string)$raw, true);
if (!is_array($in)) $in = $_POST;
$action  = isset($in['action']) ? preg_replace('/[^a-z]/', '', (string)$in['action']) : 'list';
$machine = isset($in['machine']) ? preg_replace('/[^A-Za-z0-9._-]/', '', (string)$in['machine']) : '';
if ($action === '') $action = 'list';
if ($action !== 'list' && $action !== 'pdf') fail('bad_request');

// ---- customer auth -------------------------------------------------------
/* One tested gate rather than a re-typed one - see pcm-portal-auth-lib.php. It
   refuses an expired or unbound session, and refuses a company team member
   outright, because billing belongs to the account holder exactly as the
   address card and the GoCardless summary do. */
require_once __DIR__ . '/pcm-portal-auth-lib.php';
$db = @json_decode((string)@file_get_contents($DATA), true);
if (!is_array($db)) { http_response_code(503); fail('db_unavailable'); }

$gate = portal_session_check($db, isset($in['wtoken']) ? $in['wtoken'] : '', $machine);
if (empty($gate['ok'])) fail((string)$gate['error']);
$key = (string)$gate['key'];
$c = $db['customers'][$key];

/* A self-serve booking identity has no billing relationship with us - the same
   test pcm.php uses before showing the GoCardless summary. Answer honestly
   rather than reaching for QuickBooks at all. */
$ownerMade = ((string)(isset($c['via']) ? $c['via'] : '') !== 'signin');
$email = strtolower(trim((string)(isset($c['email']) ? $c['email'] : '')));
if (!$ownerMade || $email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL))
    out(array('ok' => true, 'connected' => false, 'invoices' => array(), 'why' => 'no_account'));

// ---- QuickBooks config ---------------------------------------------------
// Not connected on this server is a normal state, not an error: the portal card
// simply stays hidden.
if (!is_readable($CFG)) out(array('ok' => true, 'connected' => false, 'invoices' => array(), 'why' => 'not_configured'));
require $CFG;
if (empty($QBO_CLIENT_ID) || empty($QBO_CLIENT_SECRET) || empty($QBO_REALM_ID))
    out(array('ok' => true, 'connected' => false, 'invoices' => array(), 'why' => 'not_configured'));
$API_BASE = qbo_lib_base(isset($QBO_ENV) ? $QBO_ENV : '');
$CUSTKEY  = qbo_lib_custkey($email, $QBO_REALM_ID);

// ---- cache ---------------------------------------------------------------
function cache_all() { global $CACHEF; $j = @json_decode((string)@file_get_contents($CACHEF), true); return is_array($j) ? $j : array(); }
function cache_put($rows, $qboId) {
    global $CACHEF, $CUSTKEY, $CACHE_MAX;
    $all = cache_all();
    $all[$CUSTKEY] = array('ts' => time(), 'qbo' => (string)$qboId, 'rows' => $rows);
    if (count($all) > $CACHE_MAX) {
        uasort($all, function ($a, $b) { return (int)(isset($b['ts']) ? $b['ts'] : 0) - (int)(isset($a['ts']) ? $a['ts'] : 0); });
        $all = array_slice($all, 0, $CACHE_MAX, true);
    }
    $tmp = $CACHEF . '.' . getmypid() . '.tmp';
    if (@file_put_contents($tmp, json_encode($all), LOCK_EX) !== false) @rename($tmp, $CACHEF);
}

$cached = cache_all();
$hit = isset($cached[$CUSTKEY]) && is_array($cached[$CUSTKEY]) ? $cached[$CUSTKEY] : null;
$fresh_cache = $hit && (time() - (int)(isset($hit['ts']) ? $hit['ts'] : 0)) < $CACHE_TTL;
if ($action === 'list' && $fresh_cache)
    out(array('ok' => true, 'connected' => true, 'invoices' => $hit['rows'], 'cached' => true));

// ---- token, under the monthly biller's own lock --------------------------
/* ⚠ Refreshing rotates Intuit's refresh token and kills the old one, so this
   must never race the monthly run or the staff button: the same non-blocking
   lock they use makes the three mutually exclusive. Held only across the token
   call, not the invoice queries - a customer reading their invoices must not be
   able to stall the billing run. */
$lock = @fopen($LOCKF, 'c');
if (!$lock || !@flock($lock, LOCK_EX | LOCK_NB))
    out(array('ok' => true, 'connected' => true, 'busy' => true,
              'invoices' => ($hit && isset($hit['rows'])) ? $hit['rows'] : array(),
              'stale' => (bool)$hit));
$tok = qbo_lib_token($TOKENF, $QBO_CLIENT_ID, $QBO_CLIENT_SECRET);
@flock($lock, LOCK_UN); @fclose($lock);
if (!empty($tok['err']) || empty($tok['access_token']))
    out(array('ok' => true, 'connected' => false, 'invoices' => array(), 'why' => 'not_configured'));
$access = $tok['access_token'];

// ---- our QuickBooks customer id -----------------------------------------
/* Preferred source is the map the biller already keeps. When it has no entry we
   look the customer up READ-ONLY by the email on our record, with the identical
   query the biller uses - and deliberately do NOT write the result back into
   its state file: a customer opening the portal should not be able to seed the
   map the monthly invoicing trusts. */
$state = @json_decode((string)@file_get_contents($STATEF), true);
$qboId = (is_array($state) && !empty($state['cust'][$CUSTKEY])) ? (string)$state['cust'][$CUSTKEY] : '';
if ($qboId === '') {
    $q = "select Id from Customer where PrimaryEmailAddr = '" . qbo_lib_qesc($email) . "'";
    $res = qbo_lib_api('GET', '/query?query=' . rawurlencode($q), null, $access, $API_BASE, $QBO_REALM_ID, $MINORVERSION);
    if (qbo_lib_ok($res) && !empty($res['json']['QueryResponse']['Customer'][0]['Id']))
        $qboId = (string)$res['json']['QueryResponse']['Customer'][0]['Id'];
}
// An id that is not a plain integer never reaches a query string.
if ($qboId === '' || !preg_match('/^\d+$/', $qboId)) {
    if ($action === 'pdf') { http_response_code(404); fail('not_found'); }
    cache_put(array(), '');
    out(array('ok' => true, 'connected' => true, 'invoices' => array(), 'why' => 'no_qbo_customer'));
}

// ---- ACTION: one invoice as a PDF ---------------------------------------
if ($action === 'pdf') {
    $id = preg_replace('/[^0-9]/', '', (string)(isset($in['id']) ? $in['id'] : ''));
    if ($id === '') { http_response_code(400); fail('bad_request'); }
    /* Ownership is proved against QuickBooks itself, not against the list we
       happened to send this browser: invoice ids are small integers, so the id
       alone must never be enough. */
    $one = qbo_lib_api('GET', '/invoice/' . $id, null, $access, $API_BASE, $QBO_REALM_ID, $MINORVERSION);
    $ref = qbo_lib_ok($one) ? (string)(isset($one['json']['Invoice']['CustomerRef']['value']) ? $one['json']['Invoice']['CustomerRef']['value'] : '') : '';
    if ($ref === '' || $ref !== $qboId) { http_response_code(404); fail('not_found'); }
    $pdf = qbo_lib_api('GET', '/invoice/' . $id . '/pdf', null, $access, $API_BASE, $QBO_REALM_ID, $MINORVERSION, 'application/pdf');
    if (!qbo_lib_ok($pdf) || strlen($pdf['raw']) < 100 || substr($pdf['raw'], 0, 4) !== '%PDF') { http_response_code(502); fail('pdf_unavailable'); }
    $num = preg_replace('/[^A-Za-z0-9_-]/', '', (string)(isset($one['json']['Invoice']['DocNumber']) ? $one['json']['Invoice']['DocNumber'] : $id));
    header('Content-Type: application/pdf');
    header('Content-Disposition: inline; filename="365-Techies-invoice-' . ($num !== '' ? $num : $id) . '.pdf"');
    header('Content-Length: ' . strlen($pdf['raw']));
    echo $pdf['raw'];
    exit;
}

// ---- ACTION: the list ----------------------------------------------------
$q = "select * from Invoice where CustomerRef = '" . qbo_lib_qesc($qboId) . "' orderby TxnDate desc maxresults " . (int)$MAX_ROWS;
$res = qbo_lib_api('GET', '/query?query=' . rawurlencode($q), null, $access, $API_BASE, $QBO_REALM_ID, $MINORVERSION);
if (!qbo_lib_ok($res)) {
    // Serve the last good answer rather than an empty list: "you have no
    // invoices" is a statement of fact we cannot make when QuickBooks is down.
    out(array('ok' => true, 'connected' => true, 'degraded' => true,
              'invoices' => ($hit && isset($hit['rows'])) ? $hit['rows'] : array(),
              'stale' => (bool)$hit));
}
$rows = array();
$list = isset($res['json']['QueryResponse']['Invoice']) && is_array($res['json']['QueryResponse']['Invoice'])
      ? $res['json']['QueryResponse']['Invoice'] : array();
foreach ($list as $inv) {
    /* Belt to the query's braces: only rows whose CustomerRef really is this
       customer are ever shaped for output. */
    $ref = (string)(isset($inv['CustomerRef']['value']) ? $inv['CustomerRef']['value'] : '');
    if ($ref !== $qboId) continue;
    $pub = qbo_lib_invoice_public($inv);
    if ($pub !== null) $rows[] = $pub;
}
cache_put($rows, $qboId);
out(array('ok' => true, 'connected' => true, 'invoices' => $rows));
