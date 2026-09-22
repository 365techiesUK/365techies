<?php
/*
 * "Invoices waiting for your OK" - the half that talks to QuickBooks and Slack (22 Sep 2026).
 *
 * Shared by pcm-invq.php (the staff endpoint) and tm-cron.php (the 9 o'clock line).
 * Library only: no top-level side effects, safe to include from any scope.
 *
 * WHAT IT TOUCHES
 *   Reads QuickBooks (invoices with a balance, the customers behind them, one
 *   invoice's PDF). The ONE write to QuickBooks is invq_send(): QuickBooks
 *   emails an invoice, from its own template, to an address QuickBooks already
 *   holds. It never creates, edits or voids an invoice, and never touches the
 *   monthly biller's state file.
 *
 *   ⚠️ Token refresh takes the monthly biller's own lock (pcm-invoice.lock,
 *   non-blocking): Intuit rotates the refresh token and kills the old one, so a
 *   refresh racing pcm-invoice.php or pcm-qbo.php would silently stop invoicing.
 *   Held only across the token call - exactly as pcm-myinvoices.php does it.
 *
 * Store: pcm-invq.json (gitignored + denied) - held ids, a log of sends, a
 * 5-minute cache of the queue, and the date the morning line last went out.
 *
 * NO closing tag in this file.
 */

require_once __DIR__ . '/pcm-qbo-lib.php';
require_once __DIR__ . '/pcm-invq-lib.php';

define('INVQ_CFG',    __DIR__ . '/pcm-quickbooks.php');
define('INVQ_TOKENF', __DIR__ . '/pcm-qbo-token.json');
define('INVQ_LOCKF',  __DIR__ . '/pcm-invoice.lock');
define('INVQ_STORE',  __DIR__ . '/pcm-invq.json');
define('INVQ_LOG',    __DIR__ . '/pcm-invq.log');
define('INVQ_WEBF',   __DIR__ . '/slack-webhook-jobs.php');
define('INVQ_MINOR',  '70');
define('INVQ_CACHE_TTL', 300);      // the queue changes when someone acts, not by the second
define('INVQ_MAX_ROWS', 200);
define('INVQ_MAX_SENDS_HOUR', 20);  // a loop-bug tripwire, not a quota
define('INVQ_MORNING_HOUR', 9);     // local time, Europe/London

function invq_log($m) { @file_put_contents(INVQ_LOG, '[' . gmdate('Y-m-d H:i:s') . 'Z] invq: ' . $m . "\n", FILE_APPEND | LOCK_EX); }

/* ---- store ---------------------------------------------------------------- */
function invq_store_read() {
    $j = @json_decode((string)@file_get_contents(INVQ_STORE), true);
    if (!is_array($j)) $j = array();
    foreach (array('held' => array(), 'sent' => array(), 'cache' => null, 'last_morning' => '') as $k => $d) if (!isset($j[$k])) $j[$k] = $d;
    return $j;
}
function invq_store_locked($fn) {
    $lh = @fopen(INVQ_STORE . '.lock', 'c');
    if (!$lh) return array('ok' => false, 'error' => 'lock_open');
    if (!flock($lh, LOCK_EX)) { fclose($lh); return array('ok' => false, 'error' => 'lock'); }
    $r = $fn(invq_store_read());
    if (!empty($r['ok']) && isset($r['data'])) {
        $d = $r['data'];
        if (count($d['sent']) > 500) $d['sent'] = array_slice($d['sent'], -500);
        $tmp = INVQ_STORE . '.' . getmypid() . '.tmp';
        if (@file_put_contents($tmp, json_encode($d, JSON_UNESCAPED_SLASHES), LOCK_EX) === false || !@rename($tmp, INVQ_STORE)) { @unlink($tmp); $r = array('ok' => false, 'error' => 'store_write'); }
    }
    flock($lh, LOCK_UN); fclose($lh);
    return $r;
}

/* ---- QuickBooks connection ------------------------------------------------ */
/* Returns array(ok, why|access, base, realm, host). "not_configured" and "busy"
   are normal states the callers report honestly, not errors. */
function invq_connect() {
    if (!is_readable(INVQ_CFG)) return array('ok' => false, 'why' => 'not_configured');
    require INVQ_CFG;
    if (empty($QBO_CLIENT_ID) || empty($QBO_CLIENT_SECRET) || empty($QBO_REALM_ID)) return array('ok' => false, 'why' => 'not_configured');
    $env = isset($QBO_ENV) ? $QBO_ENV : '';
    $base = qbo_lib_base($env);
    $host = (stripos($env, 'sandbox') !== false) ? 'https://sandbox.qbo.intuit.com' : 'https://app.qbo.intuit.com';
    $lock = @fopen(INVQ_LOCKF, 'c');
    if (!$lock || !@flock($lock, LOCK_EX | LOCK_NB)) return array('ok' => false, 'why' => 'busy');
    $tok = qbo_lib_token(INVQ_TOKENF, $QBO_CLIENT_ID, $QBO_CLIENT_SECRET);
    @flock($lock, LOCK_UN); @fclose($lock);
    if (!empty($tok['err']) || empty($tok['access_token'])) return array('ok' => false, 'why' => 'not_configured');
    return array('ok' => true, 'access' => $tok['access_token'], 'base' => $base, 'realm' => (string)$QBO_REALM_ID, 'host' => $host);
}
function invq_api($c, $method, $path, $body = null, $accept = 'application/json') {
    return qbo_lib_api($method, $path, $body, $c['access'], $c['base'], $c['realm'], INVQ_MINOR, $accept);
}

/* Every invoice with a balance, plus the email each would go to. */
function invq_fetch($c) {
    $q = "select * from Invoice where Balance > '0' orderby TxnDate desc maxresults " . (int)INVQ_MAX_ROWS;
    $res = invq_api($c, 'GET', '/query?query=' . rawurlencode($q));
    if (!qbo_lib_ok($res)) return array('ok' => false, 'why' => 'qbo_' . (int)$res['code']);
    $all = (isset($res['json']['QueryResponse']['Invoice']) && is_array($res['json']['QueryResponse']['Invoice'])) ? $res['json']['QueryResponse']['Invoice'] : array();
    $waiting = invq_pick($all);
    // customers' emails, for the invoices that carry none themselves
    $need = array();
    foreach ($waiting as $inv) if (invq_bill_email($inv) === '' && preg_match('/^\d+$/', invq_customer_id($inv))) $need[invq_customer_id($inv)] = true;
    $emails = array();
    if ($need) {
        $ids = "'" . implode("','", array_keys($need)) . "'";
        $cq = 'select Id, PrimaryEmailAddr from Customer where Id in (' . $ids . ')';
        $cr = invq_api($c, 'GET', '/query?query=' . rawurlencode($cq));
        if (qbo_lib_ok($cr)) foreach ((array)(isset($cr['json']['QueryResponse']['Customer']) ? $cr['json']['QueryResponse']['Customer'] : array()) as $cu) {
            $e = strtolower(trim((string)(isset($cu['PrimaryEmailAddr']['Address']) ? $cu['PrimaryEmailAddr']['Address'] : '')));
            if (filter_var($e, FILTER_VALIDATE_EMAIL)) $emails[(string)$cu['Id']] = $e;
        }
    }
    return array('ok' => true, 'all' => $all, 'waiting' => $waiting, 'emails' => $emails);
}
function invq_email_for($inv, $emails) {
    $e = invq_bill_email($inv);
    if ($e !== '') return $e;
    $cid = invq_customer_id($inv);
    return isset($emails[$cid]) ? $emails[$cid] : '';
}

/* The queue as rows, cached briefly. $fresh forces a live read. */
function invq_rows($c, $fresh = false) {
    $store = invq_store_read();
    if (!$fresh && is_array($store['cache']) && (int)$store['cache']['ts'] > time() - INVQ_CACHE_TTL) {
        $rows = $store['cache']['rows'];
        foreach ($rows as $i => $r) $rows[$i]['held'] = isset($store['held'][(string)$r['id']]);   // hold state is live even when the rows are cached
        return array('ok' => true, 'rows' => $rows, 'cached' => true);
    }
    $f = invq_fetch($c);
    if (empty($f['ok'])) return array('ok' => false, 'why' => $f['why'], 'rows' => is_array($store['cache']) ? $store['cache']['rows'] : array(), 'stale' => true);
    $rows = array();
    foreach ($f['waiting'] as $inv) {
        $email = invq_email_for($inv, $f['emails']);
        $rows[] = invq_row($inv, $email, invq_flags($inv, $email, $f['all']), isset($store['held'][(string)$inv['Id']]), $c['host']);
    }
    invq_store_locked(function ($d) use ($rows) { $d['cache'] = array('ts' => time(), 'rows' => $rows); return array('ok' => true, 'data' => $d); });
    return array('ok' => true, 'rows' => $rows, 'cached' => false);
}

/* ---- the one write: QuickBooks emails an invoice ------------------------- */
/* $id must be an unsent invoice with a balance, re-read from QuickBooks at the
   moment of sending (never trusted from a cached row), and the address is the
   one QuickBooks holds - on the invoice, else on the customer. Nothing in the
   request can choose where an invoice goes. */
function invq_send($c, $id, $who) {
    if (!preg_match('/^\d+$/', (string)$id)) return array('ok' => false, 'error' => 'bad_id');
    $store = invq_store_read();
    $hourAgo = time() - 3600; $n = 0;
    foreach ($store['sent'] as $s) if ((int)$s['at'] > $hourAgo) $n++;
    if ($n >= INVQ_MAX_SENDS_HOUR) return array('ok' => false, 'error' => 'rate_limited');

    $one = invq_api($c, 'GET', '/invoice/' . $id);
    if (!qbo_lib_ok($one) || empty($one['json']['Invoice']['Id'])) return array('ok' => false, 'error' => 'not_found');
    $inv = $one['json']['Invoice'];
    if (invq_email_status($inv) === 'EmailSent') return array('ok' => false, 'error' => 'already_sent');
    if (invq_num(isset($inv['Balance']) ? $inv['Balance'] : 0) <= 0) return array('ok' => false, 'error' => 'nothing_owed');
    $to = invq_bill_email($inv);
    if ($to === '') {
        $cid = invq_customer_id($inv);
        if (preg_match('/^\d+$/', $cid)) {
            $cr = invq_api($c, 'GET', '/customer/' . $cid);
            $e = strtolower(trim((string)(isset($cr['json']['Customer']['PrimaryEmailAddr']['Address']) ? $cr['json']['Customer']['PrimaryEmailAddr']['Address'] : '')));
            if (filter_var($e, FILTER_VALIDATE_EMAIL)) $to = $e;
        }
    }
    if ($to === '') return array('ok' => false, 'error' => 'no_email');

    /* Intuit's send operation: POST .../invoice/{id}/send?sendTo=..., Content-Type
       application/octet-stream, empty body. QuickBooks emails it from the company's
       own template and sets EmailStatus to EmailSent. qbo_lib_api only knows JSON
       bodies, so this one call is made here with the header Intuit asks for. */
    $url = $c['base'] . '/v3/company/' . rawurlencode($c['realm']) . '/invoice/' . $id . '/send?sendTo=' . rawurlencode($to) . '&minorversion=' . INVQ_MINOR;
    $ch = curl_init($url);
    curl_setopt_array($ch, array(CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true, CURLOPT_POSTFIELDS => '',
        CURLOPT_CONNECTTIMEOUT => 5, CURLOPT_TIMEOUT => 25,
        CURLOPT_HTTPHEADER => array('Accept: application/json', 'Authorization: Bearer ' . $c['access'], 'Content-Type: application/octet-stream')));
    $r = curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
    $j = json_decode((string)$r, true);
    $status = (string)(isset($j['Invoice']['EmailStatus']) ? $j['Invoice']['EmailStatus'] : '');
    if ($code < 200 || $code >= 300 || $status !== 'EmailSent') {
        $why = isset($j['Fault']['Error'][0]['Message']) ? invq_str($j['Fault']['Error'][0]['Message'], 120) : ('http ' . $code);
        invq_log('send FAILED ' . $id . ' ' . $why . ' by ' . $who);
        return array('ok' => false, 'error' => 'send_failed', 'why' => $why);
    }
    $num = invq_str(isset($inv['DocNumber']) ? $inv['DocNumber'] : '', 30);
    $amt = invq_num(isset($inv['TotalAmt']) ? $inv['TotalAmt'] : 0);
    invq_store_locked(function ($d) use ($id, $num, $to, $who, $amt) {
        $d['sent'][] = array('id' => (string)$id, 'num' => $num, 'to' => $to, 'by' => $who, 'at' => time(), 'amount' => $amt);
        unset($d['held'][(string)$id]);
        $d['cache'] = null;                                    // the queue just changed
        return array('ok' => true, 'data' => $d);
    });
    invq_log('sent ' . $id . ($num !== '' ? ' #' . $num : '') . ' ' . invq_money($amt) . ' to ' . $to . ' by ' . $who);
    invq_slack(':outbox_tray: *Invoice sent* - ' . invq_customer_name($inv) . ', ' . invq_money($amt) . ($num !== '' ? ' (#' . $num . ')' : '') . ', approved by ' . $who . '.');
    return array('ok' => true, 'to' => $to, 'number' => $num, 'amount' => $amt);
}

function invq_set_held($id, $held) {
    if (!preg_match('/^\d+$/', (string)$id)) return false;
    $r = invq_store_locked(function ($d) use ($id, $held) {
        if ($held) $d['held'][(string)$id] = time(); else unset($d['held'][(string)$id]);
        return array('ok' => true, 'data' => $d);
    });
    return !empty($r['ok']);
}

/* ---- Slack (best effort) -------------------------------------------------- */
function invq_slack($text) {
    if (!is_file(INVQ_WEBF) || $text === '') return false;
    $src = (string)@file_get_contents(INVQ_WEBF);
    if (!preg_match('#(https://hooks\.slack\.com/[^\'"\s]+)#', $src, $m)) return false;
    $ch = curl_init($m[1]);
    curl_setopt_array($ch, array(CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 8, CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => array('Content-Type: application/json'),
        CURLOPT_POSTFIELDS => json_encode(array('text' => $text, 'unfurl_links' => false), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)));
    @curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE); curl_close($ch);
    return $code >= 200 && $code < 300;
}

/* ---- the cron tick: one line a day, after nine ---------------------------- */
function invq_morning() {
    $out = array('posted' => false, 'waiting' => 0, 'skipped' => '');
    $tz = new DateTimeZone('Europe/London');
    $now = new DateTime('now', $tz);
    if ((int)$now->format('G') < INVQ_MORNING_HOUR) { $out['skipped'] = 'before ' . INVQ_MORNING_HOUR; return $out; }
    $today = $now->format('Y-m-d');
    $store = invq_store_read();
    if ($store['last_morning'] === $today) { $out['skipped'] = 'done today'; return $out; }
    $c = invq_connect();
    if (empty($c['ok'])) { $out['skipped'] = $c['why']; return $out; }      // busy or unconfigured: try again next tick
    $r = invq_rows($c, true);
    if (empty($r['ok'])) { $out['skipped'] = $r['why']; return $out; }
    $line = invq_slack_line($r['rows']);
    $out['waiting'] = count($r['rows']);
    if ($line !== '') $out['posted'] = invq_slack($line);
    invq_store_locked(function ($d) use ($today) { $d['last_morning'] = $today; return array('ok' => true, 'data' => $d); });
    invq_log('morning ' . $today . ': ' . $out['waiting'] . ' waiting' . ($out['posted'] ? ', posted' : ''));
    return $out;
}
