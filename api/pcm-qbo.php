<?php
/**
 * 365 PC Manager - staff-portal QuickBooks helper.
 * ---------------------------------------------------------------------------
 * THE PROBLEM THIS SOLVES: David finishes a job and wants to invoice it. Today
 * that means opening QuickBooks, typing the customer in by hand (name, email,
 * phone, address) and only then starting the invoice - for someone we already
 * hold every one of those details for.
 *
 * So: one button in the staff diary. It finds-or-creates the QuickBooks
 * customer from OUR record, fills in the address the customer gave us in their
 * portal, and (if an amount is supplied) opens a DRAFT invoice.
 *
 * IDEMPOTENT, AND SHARES ITS MEMORY WITH THE MONTHLY BILLER. The email -> QBO
 * id map lives in pcm-invoice-state.json under 'cust', keyed sha1(lower(email))
 * - the exact key pcm-invoice.php uses. Both files read and write that one map,
 * so pressing this button can never leave the monthly run with a second, parallel
 * QuickBooks customer for the same person. ⚠ Keep the key derivation identical
 * in both files; diverge and you get silent duplicates.
 *
 * ⚠ LOCKING: takes pcm-invoice.lock, the SAME lock the monthly cron holds for
 * its whole run, so the two can't interleave a read-modify-write on the state
 * file. We take it non-blocking and give up immediately: if the monthly run is
 * going, David gets "try again in a minute" rather than a corrupted map. In the
 * (monthly x sub-second) collision the other way, the cron reports
 * 'already_running' in its own output - loudly, not silently.
 *
 * SAFETY - this writes to real accounts:
 *  - DRY-RUN IS THE DEFAULT. Nothing reaches QuickBooks unless the call passes
 *    live=1 AND $QBO_LIVE_ENABLED is true in the server-only config.
 *  - Staff only. A customer session cannot reach any of it.
 *  - Invoices are CREATED, never SENT - no email goes to the customer from here.
 *  - No VAT lines: 365 Techies is not VAT registered (keep the VAT centre OFF).
 *
 * SECRETS (server-only, gitignored, .htaccess-denied):
 *   api/pcm-quickbooks.php     -> $QBO_* (see pcm-quickbooks.php.example)
 *   api/pcm-qbo-token.json     -> OAuth tokens, rotated on every refresh
 *   api/pcm-invoice-state.json -> the shared email -> QBO id map
 */

@ini_set('display_errors', '0');
header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');

$BASE   = __DIR__;
$CFG    = $BASE . '/pcm-quickbooks.php';
$TOKENF = $BASE . '/pcm-qbo-token.json';
$DATA   = $BASE . '/pcm-data.json';
$STATEF = $BASE . '/pcm-invoice-state.json';
$LOGF   = $BASE . '/pcm-invoice.log';
$LOCKF  = $BASE . '/pcm-invoice.lock';

$MINORVERSION = '70';

function out($a) { echo json_encode($a, JSON_UNESCAPED_SLASHES); exit; }
function fail($e, $extra = array()) { out(array_merge(array('ok' => false, 'error' => $e), $extra)); }
function lg($m) { global $LOGF; @file_put_contents($LOGF, '[' . gmdate('Y-m-d H:i:s') . 'Z] qbo-staff: ' . $m . "\n", FILE_APPEND | LOCK_EX); }

// ---- input ---------------------------------------------------------------
$raw = file_get_contents('php://input');
$in  = json_decode((string)$raw, true);
if (!is_array($in)) $in = $_POST;
$action  = isset($in['action']) ? preg_replace('/[^a-z]/', '', (string)$in['action']) : '';
$machine = isset($in['machine']) ? preg_replace('/[^A-Za-z0-9._-]/', '', (string)$in['machine']) : '';

// ---- staff auth ----------------------------------------------------------
// Deliberately a local re-implementation rather than including pcm-booking.php:
// that file executes its whole action router on include, and pulling 2,000 lines
// of booking logic into this request to borrow one function would be its own bug.
// The rules below must stay in step with need_staff() there.
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
        && !empty($s['machine']) && $s['machine'] === $machine;   // fail closed
    if (!$ok) fail('not_staff');
    return $db;
}

// ---- config --------------------------------------------------------------
if (!is_readable($CFG)) { need_staff(); fail('no_config', array('hint' => 'QuickBooks is not connected on the server yet.')); }
$db = need_staff();
require $CFG;
if (empty($QBO_CLIENT_ID) || empty($QBO_CLIENT_SECRET) || empty($QBO_REALM_ID)) fail('config_incomplete');
$SANDBOX  = (isset($QBO_ENV) && $QBO_ENV === 'sandbox');
$API_BASE = $SANDBOX ? 'https://sandbox-quickbooks.api.intuit.com' : 'https://quickbooks.api.intuit.com';
$LIVE = !empty($in['live']) && !empty($QBO_LIVE_ENABLED);

// ---- QuickBooks primitives ----------------------------------------------
// Mirrors pcm-invoice.php. Kept here rather than shared because that file is the
// live monthly biller and refactoring it to introduce this feature would put the
// billing run at risk for no gain. ⚠ Two copies: change one, check the other.
function qbo_token() {
    global $TOKENF, $QBO_CLIENT_ID, $QBO_CLIENT_SECRET;
    $t = @json_decode((string)@file_get_contents($TOKENF), true);
    if (!is_array($t) || empty($t['refresh_token'])) return array('err' => 'no_token');
    if (!empty($t['access_token']) && (isset($t['expires_at']) ? $t['expires_at'] : 0) > time() + 120) return $t;
    $ch = curl_init('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer');
    curl_setopt_array($ch, array(CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true, CURLOPT_CONNECTTIMEOUT => 5, CURLOPT_TIMEOUT => 20,
        CURLOPT_HTTPHEADER => array('Accept: application/json', 'Content-Type: application/x-www-form-urlencoded',
            'Authorization: Basic ' . base64_encode($QBO_CLIENT_ID . ':' . $QBO_CLIENT_SECRET)),
        CURLOPT_POSTFIELDS => http_build_query(array('grant_type' => 'refresh_token', 'refresh_token' => $t['refresh_token']))));
    $r = curl_exec($ch); $code = curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
    $j = json_decode((string)$r, true);
    if ($code < 200 || $code >= 300 || empty($j['access_token']) || empty($j['refresh_token'])) return array('err' => 'refresh_failed', 'code' => $code);
    // CRITICAL: Intuit rotates the refresh token on every refresh - the old one dies.
    $t = array('access_token' => $j['access_token'], 'refresh_token' => $j['refresh_token'],
               'expires_at' => time() + intval(isset($j['expires_in']) ? $j['expires_in'] : 3600), 'saved' => gmdate('c'));
    $tmp = $TOKENF . '.' . getmypid() . '.tmp';
    if (@file_put_contents($tmp, json_encode($t), LOCK_EX) !== false) @rename($tmp, $TOKENF);
    return $t;
}
function qbo_api($method, $path, $body, $access) {
    global $API_BASE, $QBO_REALM_ID, $MINORVERSION;
    $url = $API_BASE . '/v3/company/' . rawurlencode($QBO_REALM_ID) . $path
         . (strpos($path, '?') === false ? '?' : '&') . 'minorversion=' . $MINORVERSION;
    $ch = curl_init($url);
    $h = array('Accept: application/json', 'Authorization: Bearer ' . $access);
    if ($body !== null) $h[] = 'Content-Type: application/json';
    curl_setopt_array($ch, array(CURLOPT_RETURNTRANSFER => true, CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_CONNECTTIMEOUT => 5, CURLOPT_TIMEOUT => 25, CURLOPT_HTTPHEADER => $h));
    if ($body !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    $r = curl_exec($ch); $code = curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
    return array('code' => $code, 'json' => json_decode((string)$r, true), 'raw' => (string)$r);
}
function qbo_ok($res) { return isset($res['code']) && $res['code'] >= 200 && $res['code'] < 300; }
// Intuit returns its real complaint inside Fault.Error, not in the HTTP status text.
function qbo_why($res) {
    $e = isset($res['json']['Fault']['Error'][0]) ? $res['json']['Fault']['Error'][0] : null;
    if (!$e) return 'HTTP ' . (isset($res['code']) ? $res['code'] : '?');
    $m = trim((string)(isset($e['Message']) ? $e['Message'] : ''));
    $d = trim((string)(isset($e['Detail']) ? $e['Detail'] : ''));
    return substr(preg_replace('/\s+/', ' ', ($m !== '' ? $m : 'error') . ($d !== '' ? ' - ' . $d : '')), 0, 220);
}
function qbo_code($res) { return (string)(isset($res['json']['Fault']['Error'][0]['code']) ? $res['json']['Fault']['Error'][0]['code'] : ''); }

/* ---- SETUP HELPERS -------------------------------------------------------
   These two exist so switching QuickBooks on does not require a developer. They
   run BEFORE the customer lookup because neither needs a customer, and both are
   read-only: `qbostatus` answers "what is still missing?" and `qboitems` lists
   the Products/Services with their Ids, which is the one value the owner would
   otherwise have to dig out of the QuickBooks UI or the API by hand.
   ⚠ Deliberately returns NO secret: booleans, the environment, and the item
   list only. Never the client id, secret, guard, realm or any token. */
if ($action === 'qbostatus') {
    $tok = @json_decode((string)@file_get_contents($TOKENF), true);
    $hasRefresh = is_array($tok) && !empty($tok['refresh_token']);
    $st = array(
        'ok' => true,
        'config_file' => true,                                  // we got here, so it loaded
        'env' => ($SANDBOX ? 'sandbox' : 'production'),
        'client_id_set' => !empty($QBO_CLIENT_ID),
        'client_secret_set' => !empty($QBO_CLIENT_SECRET),
        'realm_set' => !empty($QBO_REALM_ID),
        'guard_set' => !empty($QBO_GUARD),
        'item_id_set' => !empty($QBO_ITEM_ID),
        'live_enabled' => !empty($QBO_LIVE_ENABLED),
        'only_key' => (string)(isset($QBO_ONLY_KEY) ? $QBO_ONLY_KEY : ''),
        'token_file' => $hasRefresh,
    );
    // Prove the token actually WORKS rather than merely existing - a stale refresh
    // token is the failure that silently kills monthly invoicing.
    if ($hasRefresh) {
        $t = qbo_token();
        $st['token_valid'] = !empty($t['access_token']);
        if (empty($t['access_token'])) $st['token_error'] = (string)(isset($t['err']) ? $t['err'] : 'unknown');
    } else {
        $st['token_valid'] = false;
        $st['token_error'] = 'no_token';
    }
    /* Plain English, because the person reading this is the owner, not a
       developer - each string says what to go and do. */
    $LABEL = array(
        'client_id_set'     => 'Client ID from your Intuit Developer app',
        'client_secret_set' => 'Client Secret from your Intuit Developer app',
        'realm_set'         => 'QuickBooks company (realm) ID',
        'guard_set'         => 'QBO_GUARD - invent any long random string',
        'item_id_set'       => 'QBO_ITEM_ID - run the "List QuickBooks items" check to get it',
        'token_file'        => 'api/pcm-qbo-token.json with a refresh_token in it',
        'token_valid'       => 'a refresh token QuickBooks still accepts (re-authorise if stale)',
    );
    $missing = array(); $keys = array();
    foreach (array_keys($LABEL) as $k) if (empty($st[$k])) { $missing[] = $LABEL[$k]; $keys[] = $k; }
    $st['still_needed'] = $missing;
    $st['still_needed_keys'] = $keys;                       // stable ids for the UI/tests
    // The item id is the ONE thing you cannot look up until the token works, so a
    // dry run is reachable without it.
    $st['ready_to_dry_run'] = !count(array_diff($keys, array('item_id_set')));
    $st['ready_for_live'] = (!count($keys) && !empty($QBO_LIVE_ENABLED));
    out($st);
}

if ($action === 'qboitems') {
    $tk = qbo_token();
    if (empty($tk['access_token'])) out(array('ok'=>false, 'error'=>'qbo_auth',
        'detail'=>(string)(isset($tk['err']) ? $tk['err'] : 'unknown'),
        'hint'=>'The OAuth token is missing or stale - create api/pcm-qbo-token.json with a fresh refresh_token.'));
    // Active items only, newest first. Name is quoted by QBO's own escaping rules;
    // there is no user input in this query, so nothing to inject.
    $q = "select Id, Name, Type, Active from Item where Active = true maxresults 200";
    $res = qbo_api('GET', '/query?query=' . rawurlencode($q), null, $tk['access_token']);
    if (!qbo_ok($res)) out(array('ok'=>false, 'error'=>'qbo_query', 'why'=>qbo_why($res)));
    $rows = array();
    foreach ((array)(isset($res['json']['QueryResponse']['Item']) ? $res['json']['QueryResponse']['Item'] : array()) as $it) {
        if (!is_array($it)) continue;
        $rows[] = array('id' => (string)(isset($it['Id']) ? $it['Id'] : ''),
                        'name' => (string)(isset($it['Name']) ? $it['Name'] : ''),
                        'type' => (string)(isset($it['Type']) ? $it['Type'] : ''));
    }
    out(array('ok' => true, 'env' => ($SANDBOX ? 'sandbox' : 'production'),
              'current_item_id' => (string)(isset($QBO_ITEM_ID) ? $QBO_ITEM_ID : ''),
              'count' => count($rows), 'items' => $rows,
              'hint' => $rows ? 'Copy the id of the Service you want on invoice lines into $QBO_ITEM_ID.'
                              : 'No active items yet - create one in QuickBooks: Gear > Products and services > New > Service.'));
}

// ---- find our customer record -------------------------------------------
// Matched on the email the staff card already shows, so the thing David sees is
// the thing we act on. Never on a name - two Smiths would silently merge.
$email = strtolower(trim((string)(isset($in['email']) ? $in['email'] : '')));
if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) fail('bad_email');

$ourName = ''; $ourPhone = ''; $ourAddr = null;
foreach ((array)(isset($db['customers']) ? $db['customers'] : array()) as $c) {
    if (!is_array($c) || strtolower(trim((string)(isset($c['email']) ? $c['email'] : ''))) !== $email) continue;
    $ourName  = trim((string)(isset($c['name']) ? $c['name'] : ''));
    $ourPhone = trim((string)(isset($c['phone']) ? $c['phone'] : (isset($c['sb_phone']) ? $c['sb_phone'] : '')));
    if (!empty($c['addr']) && is_array($c['addr'])) $ourAddr = $c['addr'];
    break;
}
// The staff card can pass what it is displaying (a SimplyBook-only client has no
// record of ours). Ours wins where we have it - it is the copy the customer
// maintains themselves.
if ($ourName === '')  $ourName  = trim(substr((string)(isset($in['name']) ? $in['name'] : ''), 0, 90));
if ($ourPhone === '') $ourPhone = trim(substr((string)(isset($in['phone']) ? $in['phone'] : ''), 0, 30));
if (!$ourAddr && !empty($in['addr']) && is_array($in['addr'])) $ourAddr = $in['addr'];
if ($ourName === '') $ourName = $email;

function addr_block($a) {
    if (!is_array($a)) return null;
    $g = function ($k) use ($a) { return trim(substr((string)(isset($a[$k]) ? $a[$k] : ''), 0, 90)); };
    $b = array();
    if ($g('line1') !== '')    $b['Line1'] = $g('line1');
    if ($g('line2') !== '')    $b['Line2'] = $g('line2');
    if ($g('city') !== '')     $b['City'] = $g('city');
    if ($g('postcode') !== '') $b['PostalCode'] = $g('postcode');
    if (!$b) return null;
    $b['Country'] = 'United Kingdom';
    return $b;
}
$bill = addr_block($ourAddr);

// ---- shared state, under the monthly biller's own lock -------------------
$lock = @fopen($LOCKF, 'c');
if (!$lock || !@flock($lock, LOCK_EX | LOCK_NB)) fail('busy', array('hint' => 'The monthly QuickBooks run is going. Try again in a minute.'));
$state = @json_decode((string)@file_get_contents($STATEF), true);
if (!is_array($state)) $state = array('cust' => array(), 'invoiced' => array());
if (!isset($state['cust'])) $state['cust'] = array();
if (!isset($state['invoiced'])) $state['invoiced'] = array();
$ekey = sha1($email);   // == sha1(strtolower($email)) in pcm-invoice.php; $email is already lowered
function state_save() {
    global $STATEF, $state;
    $tmp = $STATEF . '.' . getmypid() . '.tmp';
    if (@file_put_contents($tmp, json_encode($state, JSON_PRETTY_PRINT), LOCK_EX) !== false) @rename($tmp, $STATEF);
}
function done($a) { global $lock; @flock($lock, LOCK_UN); @fclose($lock); out($a); }

$tok = qbo_token();
$access = !empty($tok['access_token']) ? $tok['access_token'] : null;
if (!$access) done(array('ok' => false, 'error' => 'qbo_auth', 'detail' => (isset($tok['err']) ? $tok['err'] : 'unknown')));

// ---- ACTION: is this person already in QuickBooks? (read-only) -----------
if ($action === 'qbolook') {
    $q = "select Id, DisplayName from Customer where PrimaryEmailAddr = '" . str_replace("'", "\\'", $email) . "'";
    $res = qbo_api('GET', '/query?query=' . rawurlencode($q), null, $access);
    if (!qbo_ok($res)) done(array('ok' => false, 'error' => 'qbo_query', 'why' => qbo_why($res)));
    $hit = isset($res['json']['QueryResponse']['Customer'][0]) ? $res['json']['QueryResponse']['Customer'][0] : null;
    if ($hit) { $state['cust'][$ekey] = (string)$hit['Id']; state_save(); }
    done(array('ok' => true, 'found' => (bool)$hit,
               'id' => $hit ? (string)$hit['Id'] : '', 'name' => $hit ? (string)$hit['DisplayName'] : '',
               'live_enabled' => !empty($QBO_LIVE_ENABLED), 'env' => ($SANDBOX ? 'sandbox' : 'production'),
               'we_have_addr' => (bool)$bill));
}

// ---- ACTION: make sure they exist, then start the invoice ----------------
if ($action === 'qbostart') {
    $desc = trim(preg_replace('/[\x00-\x1F\x7F]+/', ' ', (string)(isset($in['desc']) ? $in['desc'] : '')));
    $desc = substr($desc, 0, 200);
    // Amount is optional: with none we only guarantee the customer exists, which
    // is the half David actually asked for. QuickBooks rejects an invoice with no
    // lines, so inventing a zero line to "start" one would just fail at Intuit.
    $amountRaw = (string)(isset($in['amount']) ? $in['amount'] : '');
    $amount = ($amountRaw === '') ? 0.0 : round((float)preg_replace('/[^0-9.]/', '', $amountRaw), 2);
    if ($amount < 0 || $amount > 100000) done(array('ok' => false, 'error' => 'bad_amount'));

    $plan = array('customer' => $ourName, 'email' => $email,
                  'address' => $bill ? implode(', ', array_filter(array(
                      isset($bill['Line1']) ? $bill['Line1'] : '', isset($bill['Line2']) ? $bill['Line2'] : '',
                      isset($bill['City']) ? $bill['City'] : '', isset($bill['PostalCode']) ? $bill['PostalCode'] : ''))) : '',
                  'invoice' => ($amount > 0 ? array('desc' => ($desc !== '' ? $desc : 'Work carried out'), 'amount' => $amount) : null));

    // 1. find, else create
    $cid = isset($state['cust'][$ekey]) ? (string)$state['cust'][$ekey] : '';
    $wasThere = ($cid !== '');
    if ($cid === '') {
        $q = "select Id from Customer where PrimaryEmailAddr = '" . str_replace("'", "\\'", $email) . "'";
        $res = qbo_api('GET', '/query?query=' . rawurlencode($q), null, $access);
        if (!qbo_ok($res)) done(array('ok' => false, 'error' => 'qbo_query', 'why' => qbo_why($res)));
        if (!empty($res['json']['QueryResponse']['Customer'][0]['Id'])) {
            $cid = (string)$res['json']['QueryResponse']['Customer'][0]['Id'];
            $wasThere = true;
            $state['cust'][$ekey] = $cid; state_save();
        }
    }
    if ($cid === '' && !$LIVE) {
        done(array('ok' => true, 'mode' => 'DRY-RUN', 'live_enabled' => !empty($QBO_LIVE_ENABLED),
                   'would' => 'create the customer' . ($amount > 0 ? ' and a draft invoice' : ''), 'plan' => $plan));
    }
    if ($cid === '') {
        $body = array('DisplayName' => $ourName, 'PrimaryEmailAddr' => array('Address' => $email));
        if ($ourPhone !== '') $body['PrimaryPhone'] = array('FreeFormNumber' => $ourPhone);
        if ($bill) $body['BillAddr'] = $bill;
        $res = qbo_api('POST', '/customer', $body, $access);
        if (!qbo_ok($res) || empty($res['json']['Customer']['Id'])) {
            lg('customer create failed ' . $email . ' ' . qbo_why($res));
            // 6240 = duplicate name. Worth naming, because the fix is a 10-second
            // edit in QuickBooks and the generic message sends David hunting.
            done(array('ok' => false, 'error' => (qbo_code($res) === '6240' ? 'duplicate_name' : 'qbo_customer'),
                       'why' => qbo_why($res), 'name' => $ourName));
        }
        $cid = (string)$res['json']['Customer']['Id'];
        $state['cust'][$ekey] = $cid; state_save();
        lg('created QBO customer ' . $cid . ' for ' . $email);
    } elseif ($LIVE && $bill) {
        // Already there: fill in a MISSING address, never overwrite one somebody
        // typed in QuickBooks. Their copy may be the corrected one, and quietly
        // replacing an accounting record is not ours to do.
        $cur = qbo_api('GET', '/customer/' . rawurlencode($cid), null, $access);
        if (qbo_ok($cur) && isset($cur['json']['Customer'])) {
            $cu = $cur['json']['Customer'];
            $hasAddr = !empty($cu['BillAddr']['Line1']) || !empty($cu['BillAddr']['City']) || !empty($cu['BillAddr']['PostalCode']);
            if (!$hasAddr) {
                $upd = array('Id' => $cid, 'SyncToken' => (string)(isset($cu['SyncToken']) ? $cu['SyncToken'] : '0'),
                             'DisplayName' => (string)(isset($cu['DisplayName']) ? $cu['DisplayName'] : $ourName),
                             'sparse' => true, 'BillAddr' => $bill);
                $ur = qbo_api('POST', '/customer', $upd, $access);
                if (!qbo_ok($ur)) lg('address update failed for ' . $cid . ' ' . qbo_why($ur));
                else $plan['address_added'] = true;
            }
        }
    }

    // 2. the draft invoice, if an amount was given
    $invId = ''; $invErr = '';
    if ($amount > 0) {
        if (!$LIVE) {
            done(array('ok' => true, 'mode' => 'DRY-RUN', 'live_enabled' => !empty($QBO_LIVE_ENABLED),
                       'qbo_id' => $cid, 'existed' => $wasThere, 'would' => 'create a draft invoice', 'plan' => $plan));
        }
        if (empty($QBO_ITEM_ID)) done(array('ok' => false, 'error' => 'no_item', 'qbo_id' => $cid,
            'hint' => 'Set QBO_ITEM_ID in the server config - QuickBooks needs a product/service to put on the line.'));
        $line = array('DetailType' => 'SalesItemLineDetail', 'Amount' => $amount,
                      'Description' => ($desc !== '' ? $desc : 'Work carried out'),
                      'SalesItemLineDetail' => array('ItemRef' => array('value' => (string)$QBO_ITEM_ID), 'Qty' => 1, 'UnitPrice' => $amount));
        // No TaxCodeRef and no VAT lines - not VAT registered.
        $inv = array('CustomerRef' => array('value' => $cid), 'Line' => array($line), 'TxnDate' => gmdate('Y-m-d'));
        if ($bill) $inv['BillAddr'] = $bill;
        $res = qbo_api('POST', '/invoice', $inv, $access);
        if (qbo_ok($res) && !empty($res['json']['Invoice']['Id'])) {
            $invId = (string)$res['json']['Invoice']['Id'];
            lg('draft invoice ' . $invId . ' (' . number_format($amount, 2) . ') for ' . $email);
        } else {
            $invErr = qbo_why($res);
            lg('invoice create failed ' . $email . ' ' . $invErr);
        }
    }

    // ⚠ Intuit does not document a deep link to a transaction - this is the URL
    // the QuickBooks web app itself uses, so treat it as a convenience that may
    // one day stop working. The invoice NUMBER is returned alongside it, and is
    // what David falls back to searching for if it does.
    $qboHost = $SANDBOX ? 'https://sandbox.qbo.intuit.com' : 'https://app.qbo.intuit.com';
    // Reached in three ways: we just created them, we just invoiced them, or they
    // were already there and nothing needed writing. Only the last can happen in
    // dry-run, so the mode is reported as it actually is rather than assumed live.
    done(array('ok' => true, 'mode' => ($LIVE ? 'LIVE' : 'DRY-RUN'), 'qbo_id' => $cid, 'existed' => $wasThere,
               'invoice_id' => $invId, 'invoice_error' => $invErr,
               'invoice_url' => ($invId !== '' ? $qboHost . '/app/invoice?txnId=' . rawurlencode($invId) : ''),
               'customer_url' => $qboHost . '/app/customerdetail?nameId=' . rawurlencode($cid),
               'plan' => $plan));
}

done(array('ok' => false, 'error' => 'bad_action'));
