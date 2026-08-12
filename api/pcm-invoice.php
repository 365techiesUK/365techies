<?php
/**
 * 365 PC Manager - PHASE 2: monthly QuickBooks auto-invoicing.
 * ---------------------------------------------------------------------------
 * Creates one QuickBooks Online invoice per customer per month, with the line
 * items and amounts taken LIVE FROM GOCARDLESS (each per-PC plan = one active
 * subscription). GoCardless stays the master and keeps collecting; this only
 * puts a matching INVOICE into QuickBooks so the GoCardless<->QBO app can
 * reconcile the payment against it and "who owes you / Aged Debtors" works.
 *
 * SAFETY (this creates REAL invoices - read this):
 *  - DRY-RUN IS THE DEFAULT. Nothing is written to QuickBooks unless the call
 *    is made with live=1 AND $QBO_LIVE_ENABLED is true in the secret file.
 *    Dry-run pulls every customer's real GoCardless amount and LOGS exactly
 *    what it WOULD invoice - review that first.
 *  - IDEMPOTENT: a customer already invoiced for the target YYYY-MM is skipped,
 *    so re-running (or the cron double-firing) never double-invoices.
 *  - No VAT lines (365 Techies is not VAT registered - keep the VAT centre OFF).
 *  - Amounts come ONLY from GoCardless, so invoice total == amount collected.
 *  - Owner-created records only (self-serve 'signin' emails are unverified -
 *    same rule as pcm.php's payment lookup - so they're skipped).
 *  - Never auto-emails the customer (invoices are created, not sent).
 *
 * ROLLOUT: dry-run -> live ONE customer ($QBO_ONLY_KEY='ABCD-...') -> live all.
 * Never jump straight to all.
 * ⚠ DO NOT insert a sandbox stage. It was in this comment until 2026-08-12 and it
 * is the most dangerous route available: pcm-invoice-state.json is now namespaced
 * by realm, but a sandbox pass still fills it with ids and month stamps for a
 * DIFFERENT company, and sandbox cannot prove any of the things that actually go
 * wrong here - matching the 93 real customers, the real company's VAT setting, or
 * the GoCardless reconciliation app, which is not installed in a sandbox. What it
 * would prove (the JSON body is shaped right, OAuth refresh persists) the dry run
 * and one real customer already prove. If you ever DO use sandbox, delete
 * pcm-invoice-state.json before switching to production.
 *
 * RUN (SiteGround cron, monthly, e.g. 07:00 on the 1st):
 *   php .../api/pcm-invoice.php                      # CLI dry-run
 *   php .../api/pcm-invoice.php live=1               # CLI live (once proven)
 * or over HTTP for manual testing (guarded):
 *   https://365techies.co.uk/api/pcm-invoice.php?k=<QBO_GUARD>[&live=1][&month=2026-07]
 *
 * SECRETS (server-only, gitignored):
 *   api/pcm-quickbooks.php  -> defines $QBO_* (see pcm-quickbooks.php.example)
 *   api/pcm-qbo-token.json  -> OAuth tokens, rewritten every run (refresh rotates!)
 *   api/pcm-gocardless.php  -> $GC_TOKEN (already used by pcm.php)
 *   api/pcm-invoice-state.json -> per-customer QBO id + invoiced-month stamps
 */

@ini_set('display_errors', '0');
$CLI = (php_sapi_name() === 'cli');
if (!$CLI) { header('Content-Type: application/json; charset=utf-8'); header('X-Robots-Tag: noindex, nofollow'); header('Cache-Control: no-store'); }

$BASE     = __DIR__;
$CFG      = $BASE . '/pcm-quickbooks.php';     // server-only secrets
$TOKENF   = $BASE . '/pcm-qbo-token.json';     // OAuth token store (rotates)
$GCF      = $BASE . '/pcm-gocardless.php';     // $GC_TOKEN
$DATA     = $BASE . '/pcm-data.json';          // customers (read-only here)
$STATEF   = $BASE . '/pcm-invoice-state.json'; // qbo ids + invoiced stamps
$LOGF     = $BASE . '/pcm-invoice.log';
$LOCKF    = $BASE . '/pcm-invoice.lock';

$MINORVERSION = '70';   // QuickBooks Online API minor version (adjust if Intuit deprecates)

function jout($a){ global $CLI; $s = json_encode($a, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES); echo $s . ($CLI ? "\n" : ''); exit; }
function lg($m){ global $LOGF; @file_put_contents($LOGF, '[' . gmdate('Y-m-d H:i:s') . 'Z] ' . $m . "\n", FILE_APPEND|LOCK_EX); }

// ---- config -------------------------------------------------------------
// The guard lives INSIDE the config, so the config must load before we can check
// it - which means these two failures are reachable before any authentication.
// Over HTTP they therefore answer a flat 403 and say nothing about whether
// QuickBooks is configured; a stranger probing this URL learns nothing. CLI is
// already privileged, so there it keeps the diagnostic that makes setup possible.
$cfgFail = function ($err, $hint = '') use (&$CLI) {
    if ($CLI) jout(array('ok'=>false, 'error'=>$err, 'hint'=>$hint));
    http_response_code(403);
    jout(array('ok'=>false, 'error'=>'forbidden'));
};
if (!is_readable($CFG)) $cfgFail('no_config', 'copy pcm-quickbooks.php.example to pcm-quickbooks.php and fill it');
require $CFG;   // $QBO_CLIENT_ID $QBO_CLIENT_SECRET $QBO_REALM_ID $QBO_ENV $QBO_GUARD $QBO_ITEM_ID(or _NAME) $QBO_LIVE_ENABLED [$QBO_ONLY_KEY]
if (empty($QBO_CLIENT_ID) || empty($QBO_CLIENT_SECRET) || empty($QBO_REALM_ID) || empty($QBO_GUARD)) $cfgFail('config_incomplete');
$SANDBOX = (isset($QBO_ENV) && $QBO_ENV === 'sandbox');
$API_BASE = $SANDBOX ? 'https://sandbox-quickbooks.api.intuit.com' : 'https://quickbooks.api.intuit.com';

// ---- guard (HTTP only; CLI is already privileged) -----------------------
if (!$CLI) {
    $k = isset($_GET['k']) ? (string)$_GET['k'] : '';
    if (!hash_equals((string)$QBO_GUARD, $k)) { http_response_code(403); jout(array('ok'=>false,'error'=>'forbidden')); }
}
$LIVE_REQ = ($CLI ? in_array('live=1', $argv) : (isset($_GET['live']) && $_GET['live'] === '1'));
$LIVE = $LIVE_REQ && !empty($QBO_LIVE_ENABLED);   // both the call AND the config must opt in
$MONTH = '';
if ($CLI) { foreach ($argv as $a) if (strpos($a, 'month=') === 0) $MONTH = substr($a, 6); }
elseif (isset($_GET['month'])) $MONTH = (string)$_GET['month'];
if (!preg_match('/^\d{4}-\d{2}$/', $MONTH)) $MONTH = gmdate('Y-m');   // target billing month YYYY-MM
$MKEY = str_replace('-', '', $MONTH);   // idempotency key e.g. 202607

// ---- don't pile up: single runner -------------------------------------
$lock = @fopen($LOCKF, 'c');
if (!$lock || !@flock($lock, LOCK_EX|LOCK_NB)) jout(array('ok'=>false,'error'=>'already_running'));

// ---- GoCardless (reuse pcm.php's proven read pattern) -------------------
if (!is_readable($GCF)) jout(array('ok'=>false,'error'=>'no_gocardless_token'));
include $GCF; if (empty($GC_TOKEN)) jout(array('ok'=>false,'error'=>'no_gocardless_token'));
function gc_get($path){ global $GC_TOKEN; $ch = curl_init('https://api.gocardless.com' . $path);
    curl_setopt_array($ch, array(CURLOPT_RETURNTRANSFER=>true, CURLOPT_CONNECTTIMEOUT=>5, CURLOPT_TIMEOUT=>15,
        CURLOPT_HTTPHEADER=>array('Authorization: Bearer ' . $GC_TOKEN, 'GoCardless-Version: 2015-07-06')));
    $r = curl_exec($ch); $code = curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
    return ($r !== false && $code >= 200 && $code < 300) ? json_decode($r, true) : null; }
// Active per-PC subscriptions for an email -> line items [{name, amount}], or null on transport failure.
function gc_lines($email){
    $cust = gc_get('/customers?email=' . rawurlencode($email));
    if (!is_array($cust)) return null;                       // transport failure
    if (empty($cust['customers'][0]['id'])) return array();  // genuinely no GoCardless customer
    $cid = $cust['customers'][0]['id'];
    $subs = gc_get('/subscriptions?customer=' . rawurlencode($cid) . '&status=active');
    if (!is_array($subs)) return null;
    $lines = array();
    foreach ((isset($subs['subscriptions']) ? $subs['subscriptions'] : array()) as $s) {
        $amt = round(intval($s['amount'] ?? 0) / 100.0, 2);
        if ($amt > 0) $lines[] = array('name'=>(string)($s['name'] ?? 'Support plan'), 'amount'=>$amt);
    }
    return $lines;
}

// ---- QuickBooks OAuth2 (access token 1h; refresh token 100d AND ROTATES) -
function qbo_token($refresh_if_needed = true){
    global $TOKENF, $QBO_CLIENT_ID, $QBO_CLIENT_SECRET;
    $t = @json_decode((string)@file_get_contents($TOKENF), true);
    if (!is_array($t) || empty($t['refresh_token'])) return array('err'=>'no_token', 'hint'=>'run the one-time OAuth authorise step to create pcm-qbo-token.json');
    if (!$refresh_if_needed && !empty($t['access_token']) && ($t['expires_at'] ?? 0) > time() + 120) return $t;
    // Refresh (also proactively so the 100-day refresh window never lapses).
    $ch = curl_init('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer');
    curl_setopt_array($ch, array(CURLOPT_RETURNTRANSFER=>true, CURLOPT_POST=>true, CURLOPT_CONNECTTIMEOUT=>5, CURLOPT_TIMEOUT=>20,
        CURLOPT_HTTPHEADER=>array('Accept: application/json', 'Content-Type: application/x-www-form-urlencoded',
            'Authorization: Basic ' . base64_encode($QBO_CLIENT_ID . ':' . $QBO_CLIENT_SECRET)),
        CURLOPT_POSTFIELDS=>http_build_query(array('grant_type'=>'refresh_token', 'refresh_token'=>$t['refresh_token']))));
    $r = curl_exec($ch); $code = curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
    $j = json_decode((string)$r, true);
    if ($code < 200 || $code >= 300 || empty($j['access_token']) || empty($j['refresh_token']))
        return array('err'=>'refresh_failed', 'code'=>$code, 'body'=>substr((string)$r, 0, 300));
    // CRITICAL: persist the NEW refresh token (Intuit rotates it every refresh; the old one dies).
    $t = array('access_token'=>$j['access_token'], 'refresh_token'=>$j['refresh_token'],
               'expires_at'=>time() + intval($j['expires_in'] ?? 3600), 'saved'=>gmdate('c'));
    $tmp = $TOKENF . '.' . getmypid() . '.tmp';
    if (@file_put_contents($tmp, json_encode($t), LOCK_EX) !== false) @rename($tmp, $TOKENF);
    return $t;
}
function qbo_api($method, $path, $body, $access){
    global $API_BASE, $QBO_REALM_ID, $MINORVERSION;
    $url = $API_BASE . '/v3/company/' . rawurlencode($QBO_REALM_ID) . $path
         . (strpos($path, '?') === false ? '?' : '&') . 'minorversion=' . $MINORVERSION;
    $ch = curl_init($url);
    $h = array('Accept: application/json', 'Authorization: Bearer ' . $access);
    if ($body !== null) $h[] = 'Content-Type: application/json';
    curl_setopt_array($ch, array(CURLOPT_RETURNTRANSFER=>true, CURLOPT_CUSTOMREQUEST=>$method, CURLOPT_CONNECTTIMEOUT=>5,
        CURLOPT_TIMEOUT=>25, CURLOPT_HTTPHEADER=>$h));
    if ($body !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    $r = curl_exec($ch); $code = curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
    return array('code'=>$code, 'json'=>json_decode((string)$r, true), 'raw'=>(string)$r);
}
// Find (by email) or create a QBO customer; returns id or null. Caches id in state.
function qbo_customer_id($email, $name, $access, &$state, $live){
    global $QBO_REALM_ID;
    /* ⚠ NAMESPACED BY COMPANY. Keyed on the email alone, a QBO customer id cached
       from one company (e.g. a sandbox) would be handed straight to another. Ids
       are small per-company integers, so the collision resolves to a real but
       DIFFERENT person rather than erroring. pcm-qbo.php derives this key the
       SAME way - change one, change both, or you get duplicate QBO customers. */
    $ek = sha1(strtolower($email) . '|' . (string)$QBO_REALM_ID);
    if (!empty($state['cust'][$ek])) return $state['cust'][$ek];
    $q = "select Id from Customer where PrimaryEmailAddr = '" . str_replace("'", "\\'", $email) . "'";
    $res = qbo_api('GET', '/query?query=' . rawurlencode($q), null, $access);
    if (($res['code'] ?? 0) >= 200 && $res['code'] < 300 && !empty($res['json']['QueryResponse']['Customer'][0]['Id'])) {
        $id = (string)$res['json']['QueryResponse']['Customer'][0]['Id'];
        $state['cust'][$ek] = $id; return $id;
    }
    if (!$live) return 'DRYRUN-NEW';   // dry-run: don't create; show it would be created
    $res = qbo_api('POST', '/customer', array('DisplayName'=>($name !== '' ? $name : $email), 'PrimaryEmailAddr'=>array('Address'=>$email)), $access);
    if (($res['code'] ?? 0) >= 200 && $res['code'] < 300 && !empty($res['json']['Customer']['Id'])) {
        $id = (string)$res['json']['Customer']['Id']; $state['cust'][$ek] = $id; return $id;
    }
    lg('customer create failed for ' . $email . ' code=' . ($res['code'] ?? '?') . ' ' . substr($res['raw'] ?? '', 0, 200));
    return null;
}

// ---- load customers + state --------------------------------------------
$db = @json_decode((string)@file_get_contents($DATA), true);
if (!is_array($db) || !isset($db['customers'])) jout(array('ok'=>false,'error'=>'no_customers'));
$state = @json_decode((string)@file_get_contents($STATEF), true); if (!is_array($state)) $state = array('cust'=>array(), 'invoiced'=>array());
if (!isset($state['cust'])) $state['cust'] = array(); if (!isset($state['invoiced'])) $state['invoiced'] = array();

// Get an access token up front (skip in pure config-less dry-run so preview still works without QBO creds).
$access = null; $tokErr = null;
$tok = qbo_token(true);
if (!empty($tok['access_token'])) $access = $tok['access_token']; else $tokErr = $tok;
if ($LIVE && !$access) jout(array('ok'=>false,'error'=>'qbo_auth', 'detail'=>$tokErr));

// ---- main loop ----------------------------------------------------------
$only = isset($QBO_ONLY_KEY) ? (string)$QBO_ONLY_KEY : '';
$plan = array(); $created = 0; $skipped = 0; $errors = 0; $gross = 0.0;
foreach ($db['customers'] as $key => $c) {
    if ($only !== '' && $key !== $only) continue;
    $email = trim((string)($c['email'] ?? ''));
    $name  = trim((string)($c['name'] ?? ''));
    if ($email === '') { continue; }
    if ((($c['via'] ?? '') === 'signin')) { continue; }              // unverified self-serve email
    // Realm-qualified for the same reason as the id cache above: without it a
    // test against another company silently suppresses a REAL invoice here and
    // reports it as 'skipped_already_invoiced', which looks like correct idempotency.
    $stampKey = $key . '|' . $MKEY . '|' . (string)$QBO_REALM_ID;
    if (!empty($state['invoiced'][$stampKey])) { $skipped++; continue; }  // already invoiced this month

    $lines = gc_lines($email);
    if ($lines === null) { $errors++; lg('GC transport fail for ' . $email . ' - skipped this run'); continue; }
    if (count($lines) === 0) { continue; }                           // no active plan -> nothing to invoice
    $total = 0.0; foreach ($lines as $l) $total += $l['amount']; $gross += $total;

    $row = array('key'=>$key, 'name'=>$name, 'email'=>$email, 'month'=>$MONTH,
                 'lines'=>$lines, 'total'=>round($total, 2), 'action'=>'');

    if (!$LIVE) { $row['action'] = 'DRY-RUN (would create)'; $plan[] = $row; continue; }

    // --- LIVE create ---
    $cid = qbo_customer_id($email, $name, $access, $state, true);
    if (!$cid) { $errors++; $row['action'] = 'ERROR: customer'; $plan[] = $row; continue; }
    if (empty($QBO_ITEM_ID)) { $errors++; $row['action'] = 'ERROR: no QBO_ITEM_ID configured'; $plan[] = $row; continue; }
    $qbLines = array();
    foreach ($lines as $l) $qbLines[] = array('DetailType'=>'SalesItemLineDetail', 'Amount'=>$l['amount'],
        'Description'=>$l['name'] . ' - ' . date('F Y', strtotime($MONTH . '-01')) . ' (collected by Direct Debit / GoCardless)',
        'SalesItemLineDetail'=>array('ItemRef'=>array('value'=>(string)$QBO_ITEM_ID), 'Qty'=>1, 'UnitPrice'=>$l['amount']));
    /* ⚠ DocNumber's documented max is 21 chars. This USED to be
       substr('DD-' . $key . '-' . $MKEY, 0, 21), and since a licence key is 14
       chars the string was 24 and the cut amputated the MONTH: every month of the
       decade produced the identical 'DD-XXXX-XXXX-XXXX-202'. Month first now, and
       the key's hyphens dropped, so both survive losslessly in exactly 21:
       'DD202608-ABCDEFGHJKLM'. Sortable by month, unique per customer per month.
       And no substr() - if it ever exceeds 21 that is a config error worth seeing,
       not something to silently shorten into a collision. */
    $doc = 'DD' . $MKEY . '-' . substr(str_replace('-', '', $key), 0, 12);
    if (strlen($doc) > 21) {
        $errors++; lg('DocNumber too long for ' . $email . ' (' . $doc . ') - skipped, check the licence key format');
        $row['action'] = 'ERROR: DocNumber length'; $plan[] = $row; continue;
    }
    $inv = array('CustomerRef'=>array('value'=>$cid), 'Line'=>$qbLines,
                 'TxnDate'=>gmdate('Y-m-d'), 'DocNumber'=>$doc,
                 'CustomerMemo'=>array('value'=>'Paid automatically by Direct Debit via GoCardless - no action needed.'));
    // Non-VAT: no TaxCodeRef / no VAT lines (requires the QBO VAT centre to be OFF).
    $res = qbo_api('POST', '/invoice', $inv, $access);
    if (($res['code'] ?? 0) >= 200 && $res['code'] < 300 && !empty($res['json']['Invoice']['Id'])) {
        $state['invoiced'][$stampKey] = array('id'=>(string)$res['json']['Invoice']['Id'], 'ts'=>time(), 'total'=>round($total, 2));
        $created++; $row['action'] = 'CREATED #' . $res['json']['Invoice']['Id'];
    } else { $errors++; $row['action'] = 'ERROR: invoice ' . ($res['code'] ?? '?'); lg('invoice fail ' . $email . ' code=' . ($res['code'] ?? '?') . ' ' . substr($res['raw'] ?? '', 0, 300)); }
    $plan[] = $row;
}

// ---- persist state (only meaningful in live runs; harmless in dry-run) --
if ($LIVE) { $tmp = $STATEF . '.' . getmypid() . '.tmp'; if (@file_put_contents($tmp, json_encode($state, JSON_PRETTY_PRINT), LOCK_EX) !== false) @rename($tmp, $STATEF); }

$summary = array('ok'=>true, 'mode'=>($LIVE ? 'LIVE' : 'DRY-RUN'), 'month'=>$MONTH, 'env'=>($SANDBOX ? 'sandbox' : 'production'),
    'customers_to_invoice'=>count($plan), 'created'=>$created, 'skipped_already_invoiced'=>$skipped,
    'errors'=>$errors, 'gross_total'=>round($gross, 2), 'plan'=>$plan);
lg($summary['mode'] . ' ' . $MONTH . ': plan=' . count($plan) . ' created=' . $created . ' skipped=' . $skipped . ' errors=' . $errors . ' gross=' . round($gross, 2));
jout($summary);
