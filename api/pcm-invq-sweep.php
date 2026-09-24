<?php
/*
 * "This month's jobs -> invoices" - the half that talks to QuickBooks and Slack
 * (22 Sep 2026, v2 the same day).
 *
 * Shared by pcm-invq.php (the staff endpoint) and tm-cron.php (the morning
 * sweep). Library only: no top-level side effects, safe to include anywhere.
 *
 * WHAT IT WRITES, AND WHERE
 *   1. Invoices for jobs. invq_create_for_job() makes the QuickBooks invoice a
 *      "Quote agreed" job is owed - the same customer find-or-create, the same
 *      line, item, tax code and address block, and the same email->id map under
 *      the same lock as pcm-qbo.php, so it can never mint a duplicate customer.
 *      Only while $QBO_LIVE_ENABLED is on and $QBO_ONLY_KEY is empty (the two
 *      gates the other writers honour), only for a job with an email, a price
 *      and a description, and never twice: the job is marked with the invoice
 *      id under pcm-jobs.json's own lock, and QuickBooks is checked for a
 *      same-customer same-amount invoice within a week before anything is
 *      created.
 *   2. Sending. invq_send() has QuickBooks email an invoice, from its own
 *      template, to the address QuickBooks holds. It never edits or voids.
 *
 *   ⚠️ Token refresh AND the customer map are under the monthly biller's own
 *   lock (pcm-invoice.lock, non-blocking): Intuit rotates the refresh token and
 *   kills the old one, and the map is what stops two writers making two
 *   customers. Same discipline as pcm-qbo.php / pcm-myinvoices.php.
 *
 * Store: pcm-invq.json (gitignored + denied) - held ids, a log of sends and
 * creates, a 5-minute cache, and the date the morning line last went out.
 *
 * NO closing tag in this file.
 */

require_once __DIR__ . '/pcm-qbo-lib.php';
require_once __DIR__ . '/pcm-invq-lib.php';

define('INVQ_CFG',    __DIR__ . '/pcm-quickbooks.php');
define('INVQ_TOKENF', __DIR__ . '/pcm-qbo-token.json');
define('INVQ_LOCKF',  __DIR__ . '/pcm-invoice.lock');
define('INVQ_STATEF', __DIR__ . '/pcm-invoice-state.json');   // the email->QuickBooks-id map the writers share
define('INVQ_JOBS',   __DIR__ . '/pcm-jobs.json');
define('INVQ_STORE',  __DIR__ . '/pcm-invq.json');
define('INVQ_LOG',    __DIR__ . '/pcm-invq.log');
define('INVQ_WEBF',   __DIR__ . '/slack-webhook-jobs.php');
define('INVQ_MINOR',  '70');
define('INVQ_CACHE_TTL', 300);
define('INVQ_MAX_ROWS', 200);
define('INVQ_MAX_SENDS_HOUR', 20);      // tripwires, not quotas
define('INVQ_MAX_CREATES_RUN', 10);
define('INVQ_MORNING_HOUR', 9);         // Europe/London

function invq_log($m) { @file_put_contents(INVQ_LOG, '[' . gmdate('Y-m-d H:i:s') . 'Z] invq: ' . $m . "\n", FILE_APPEND | LOCK_EX); }

/* ---- our store ------------------------------------------------------------ */
function invq_store_read() {
    $j = @json_decode((string)@file_get_contents(INVQ_STORE), true);
    if (!is_array($j)) $j = array();
    foreach (array('held' => array(), 'sent' => array(), 'created' => array(), 'cache' => null, 'last_morning' => '', 'items' => null) as $k => $d) if (!isset($j[$k])) $j[$k] = $d;
    return $j;
}
function invq_store_locked($fn) {
    $lh = @fopen(INVQ_STORE . '.lock', 'c');
    if (!$lh) return array('ok' => false, 'error' => 'lock_open');
    if (!flock($lh, LOCK_EX)) { fclose($lh); return array('ok' => false, 'error' => 'lock'); }
    $r = $fn(invq_store_read());
    if (!empty($r['ok']) && isset($r['data'])) {
        $d = $r['data'];
        foreach (array('sent', 'created') as $k) if (count($d[$k]) > 500) $d[$k] = array_slice($d[$k], -500);
        $tmp = INVQ_STORE . '.' . getmypid() . '.tmp';
        if (@file_put_contents($tmp, json_encode($d, JSON_UNESCAPED_SLASHES), LOCK_EX) === false || !@rename($tmp, INVQ_STORE)) { @unlink($tmp); $r = array('ok' => false, 'error' => 'store_write'); }
    }
    flock($lh, LOCK_UN); fclose($lh);
    return $r;
}

/* ---- the jobs store (pcm-jobs.php owns it; same lock, same shape) ---------- */
function invq_jobs_read() {
    $j = @json_decode((string)@file_get_contents(INVQ_JOBS), true);
    return (is_array($j) && isset($j['jobs']) && is_array($j['jobs'])) ? $j['jobs'] : array();
}
function invq_jobs_locked($fn) {
    $h = @fopen(INVQ_JOBS . '.lock', 'c');
    if (!$h || !flock($h, LOCK_EX)) { if ($h) fclose($h); return array('ok' => false, 'error' => 'busy'); }
    $data = @json_decode((string)@file_get_contents(INVQ_JOBS), true);
    if (!is_array($data)) $data = array('jobs' => array());
    if (!isset($data['jobs']) || !is_array($data['jobs'])) $data['jobs'] = array();
    $r = $fn($data);
    if (isset($r['data'])) {
        $tmp = INVQ_JOBS . '.' . getmypid() . '.tmp';
        $j = json_encode($r['data'], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        if ($j !== false && @file_put_contents($tmp, $j, LOCK_EX) !== false) @rename($tmp, INVQ_JOBS); else @unlink($tmp);
    }
    flock($h, LOCK_UN); fclose($h);
    return $r;
}
/* Write the invoice id onto a job, once. Returns false if the job already had one. */
function invq_job_link($jobId, $invId, $url, $how) {
    $r = invq_jobs_locked(function ($d) use ($jobId, $invId, $url, $how) {
        foreach ($d['jobs'] as $i => $j) {
            if (!is_array($j) || (string)(isset($j['id']) ? $j['id'] : '') !== (string)$jobId) continue;
            if (!empty($j['invoice_no'])) return array('ok' => false, 'error' => 'already_linked');
            $d['jobs'][$i]['invoice_no'] = (string)$invId;
            $d['jobs'][$i]['invoice_url'] = (string)$url;
            $d['jobs'][$i]['invq'] = array('how' => $how, 'at' => time());
            return array('ok' => true, 'data' => $d);
        }
        return array('ok' => false, 'error' => 'no_such_job');
    });
    return !empty($r['ok']);
}

/* A person types the price or description a Slack post lacked. Marked as theirs,
   so the Slack poller never overwrites it (see sj_merge). Amounts within the
   same limits the invoice itself will be held to. */
define('INVQ_ITEMS_TTL', 3600);
/* QuickBooks' Products & Services, cached an hour in the store: the drop-down in the
   console, and what a Slack "Job type" is matched against. A failed read keeps the
   last list rather than emptying the drop-down. */
function invq_items($c, $fresh = false, $now = null) {
    $now = $now === null ? time() : $now;
    $store = invq_store_read();
    $have = (is_array($store['items']) && isset($store['items']['list'])) ? (array)$store['items']['list'] : array();
    if (!$fresh && $have && (int)$store['items']['ts'] > $now - INVQ_ITEMS_TTL) return $have;
    $res = invq_api($c, 'GET', '/query?query=' . rawurlencode('select * from Item where Active = true maxresults 500'));
    if (!qbo_lib_ok($res) || !isset($res['json']['QueryResponse'])) return $have;
    $list = invq_items_clean($res['json']);
    invq_store_locked(function ($d) use ($list, $now) { $d['items'] = array('ts' => $now, 'list' => $list); return array('ok' => true, 'data' => $d); });
    return $list;
}
/* A Slack "Job type" that names one of those items ("Full computer service") puts
   that item, its description and its list price on the job - unless a person typed
   otherwise (invq_job_apply_item's rules). Runs before every fresh overview, so a
   job picked from the workflow's drop-down arrives ready to raise. */
function invq_kind_sync($c, $now = null) {
    $now = $now === null ? time() : $now;
    $items = invq_items($c, false, $now);
    if (!$items) return 0;
    $r = invq_jobs_locked(function ($d) use ($items, $now) {
        $n = 0;
        foreach ($d['jobs'] as $i => $j) {
            if (!is_array($j) || !empty($j['invoice_no']) || !empty($j['item_id']) || empty($j['kind'])) continue;
            if ((int)(isset($j['ts']) ? $j['ts'] : 0) < $now - INVQ_WINDOW_DAYS * 86400) continue;
            if ((string)(isset($j['status']) ? $j['status'] : '') === 'dismissed') continue;
            $it = invq_item_match($items, $j['kind'], true);        // exact, else the ONE QuickBooks name containing it; ambiguous = none
            if ($it && invq_job_apply_item($j, $it)) { $d['jobs'][$i] = $j; $n++; }
        }
        return $n ? array('ok' => true, 'data' => $d, 'n' => $n) : array('ok' => true, 'n' => 0);
    });
    return !empty($r['n']) ? (int)$r['n'] : 0;
}

function invq_job_set($jobId, $amount, $desc, $who, $item = null, $email = null) {
    $amount = ($amount === null) ? null : round(invq_num($amount), 2);
    if ($amount !== null && ($amount < 1 || $amount > INVQ_MAX_AMOUNT)) return array('ok' => false, 'error' => 'bad_amount');
    $desc = ($desc === null) ? null : invq_str($desc, 200);
    if ($desc !== null && $desc === '') return array('ok' => false, 'error' => 'no_desc');
    $email = ($email === null) ? null : invq_email_ok($email);
    if ($email !== null && $email === '') return array('ok' => false, 'error' => 'bad_email');
    if ($amount === null && $desc === null && $item === null && $email === null) return array('ok' => false, 'error' => 'nothing_to_set');
    $r = invq_jobs_locked(function ($d) use ($jobId, $amount, $desc, $who, $item, $email) {
        foreach ($d['jobs'] as $i => $j) {
            if (!is_array($j) || (string)(isset($j['id']) ? $j['id'] : '') !== (string)$jobId) continue;
            if (!empty($j['invoice_no'])) return array('ok' => false, 'error' => 'already_invoiced');
            if ($amount !== null) { $d['jobs'][$i]['amount'] = $amount; $d['jobs'][$i]['amount_by'] = 'staff'; }
            if ($desc !== null)   { $d['jobs'][$i]['desc'] = $desc; $d['jobs'][$i]['desc_by'] = 'staff'; }
            if ($email !== null)  { $d['jobs'][$i]['email'] = $email; $d['jobs'][$i]['email_by'] = 'staff'; }   // kept through re-polls by sj_merge()
            if (is_array($item))  invq_job_apply_item($d['jobs'][$i], $item);   // after the typed values, so it never overrides them
            $d['jobs'][$i]['set_by'] = $who; $d['jobs'][$i]['set_at'] = time();
            return array('ok' => true, 'data' => $d);
        }
        return array('ok' => false, 'error' => 'no_such_job');
    });
    if (!empty($r['ok'])) invq_store_locked(function ($d) { $d['cache'] = null; return array('ok' => true, 'data' => $d); });
    return $r;
}

/* Mark a row "not a job" (a goodwill free-app service, say). Excluded from the
   month's list from then on; nothing in QuickBooks is touched. */
function invq_job_dismiss($jobId, $who) {
    return invq_jobs_locked(function ($d) use ($jobId, $who) {
        foreach ($d['jobs'] as $i => $j) {
            if (!is_array($j) || (string)(isset($j['id']) ? $j['id'] : '') !== (string)$jobId) continue;
            if (!empty($j['invoice_no'])) return array('ok' => false, 'error' => 'already_invoiced');
            $d['jobs'][$i]['status'] = 'dismissed'; $d['jobs'][$i]['dismissed_by'] = $who; $d['jobs'][$i]['dismissed_at'] = time();
            return array('ok' => true, 'data' => $d);
        }
        return array('ok' => false, 'error' => 'no_such_job');
    });
}

/* PC Manager services on non-plan customers -> the job store. Idempotent: the
   id is the customer key + machine, so a re-run updates rather than repeats,
   and a person's price/description/invoice on the row is never overwritten.
   Someone who already has a Slack or console job this month is skipped - one
   job per person, and the written-up one is the record. */
function invq_pcm_sync($now = null) {
    $now = $now === null ? time() : $now;
    $db = @json_decode((string)@file_get_contents(__DIR__ . '/pcm-data.json'), true);
    $customers = (is_array($db) && isset($db['customers']) && is_array($db['customers'])) ? $db['customers'] : array();
    $cand = invq_jobs_from_pcm($customers, $now);
    if (!$cand) return array('added' => 0, 'updated' => 0);
    $added = 0; $updated = 0;
    invq_jobs_locked(function ($d) use ($cand, $now, &$added, &$updated) {
        $byId = array(); $emailsElsewhere = array();
        foreach ($d['jobs'] as $i => $j) {
            if (!is_array($j) || empty($j['id'])) continue;
            $byId[(string)$j['id']] = $i;
            $via = (string)(isset($j['via']) ? $j['via'] : '');
            $st = (string)(isset($j['status']) ? $j['status'] : '');
            if ($via !== 'pcm' && ($st === '' || $st === 'quoted' || $st === 'done') && (int)(isset($j['ts']) ? $j['ts'] : 0) >= $now - INVQ_WINDOW_DAYS * 86400) {
                $e = invq_email_ok(isset($j['email']) ? $j['email'] : '');
                if ($e !== '') $emailsElsewhere[$e] = true;
            }
        }
        foreach ($cand as $job) {
            if (isset($byId[$job['id']])) {
                $old = $d['jobs'][$byId[$job['id']]];
                if ((string)(isset($old['status']) ? $old['status'] : '') === 'dismissed') continue;
                $keep = $old;
                foreach (array('name', 'email', 'phone', 'note', 'ts', 'pcm') as $k) $keep[$k] = $job[$k];
                if ((string)(isset($old['amount_by']) ? $old['amount_by'] : '') !== 'staff') { $keep['amount'] = $job['amount']; $keep['amount_by'] = $job['amount_by']; }
                if ((string)(isset($old['desc_by']) ? $old['desc_by'] : '') !== 'staff') $keep['desc'] = $job['desc'];
                if ($keep != $old) { $d['jobs'][$byId[$job['id']]] = $keep; $updated++; }
                continue;
            }
            if ($job['email'] !== '' && isset($emailsElsewhere[$job['email']])) continue;     // already written up in Slack / the console
            $d['jobs'][] = $job; $added++;
        }
        if (count($d['jobs']) > 2000) $d['jobs'] = array_slice($d['jobs'], -2000);
        return array('ok' => true, 'data' => $d);
    });
    if ($added || $updated) invq_log('pcm sync: ' . $added . ' added, ' . $updated . ' updated');
    return array('added' => $added, 'updated' => $updated);
}

/* ---- QuickBooks connection ------------------------------------------------ */
function invq_connect() {
    if (!is_readable(INVQ_CFG)) return array('ok' => false, 'why' => 'not_configured');
    require INVQ_CFG;
    if (empty($QBO_CLIENT_ID) || empty($QBO_CLIENT_SECRET) || empty($QBO_REALM_ID)) return array('ok' => false, 'why' => 'not_configured');
    $env = isset($QBO_ENV) ? $QBO_ENV : '';
    $lock = @fopen(INVQ_LOCKF, 'c');
    if (!$lock || !@flock($lock, LOCK_EX | LOCK_NB)) return array('ok' => false, 'why' => 'busy');
    $tok = qbo_lib_token(INVQ_TOKENF, $QBO_CLIENT_ID, $QBO_CLIENT_SECRET);
    @flock($lock, LOCK_UN); @fclose($lock);
    if (!empty($tok['err']) || empty($tok['access_token'])) return array('ok' => false, 'why' => 'not_configured');
    return array('ok' => true, 'access' => $tok['access_token'], 'base' => qbo_lib_base($env), 'realm' => (string)$QBO_REALM_ID,
                 'host' => (stripos($env, 'sandbox') !== false) ? 'https://sandbox.qbo.intuit.com' : 'https://app.qbo.intuit.com',
                 'live' => !empty($QBO_LIVE_ENABLED), 'only' => trim((string)(isset($QBO_ONLY_KEY) ? $QBO_ONLY_KEY : '')),
                 'item' => (string)(isset($QBO_ITEM_ID) ? $QBO_ITEM_ID : ''), 'tax' => (string)(isset($QBO_TAX_CODE_ID) ? $QBO_TAX_CODE_ID : ''),
                 'shortlist' => (isset($QBO_ITEM_SHORTLIST) && is_array($QBO_ITEM_SHORTLIST)) ? $QBO_ITEM_SHORTLIST : invq_shortlist_default());
}
function invq_api($c, $method, $path, $body = null, $accept = 'application/json') {
    return qbo_lib_api($method, $path, $body, $c['access'], $c['base'], $c['realm'], INVQ_MINOR, $accept);
}
function invq_why($res) {
    $j = isset($res['json']) ? $res['json'] : null;
    if (isset($j['Fault']['Error'][0]['Message'])) return invq_str($j['Fault']['Error'][0]['Message'], 120);
    return 'http ' . (int)(isset($res['code']) ? $res['code'] : 0);
}

/* ---- the customer map (email -> QuickBooks id), shared with the writers -- */
/* Read under the biller's lock, keyed exactly as pcm-qbo.php / pcm-invoice.php key it. */
function invq_map_get($c, $email) {
    $lock = @fopen(INVQ_LOCKF, 'c');
    if (!$lock || !@flock($lock, LOCK_EX | LOCK_NB)) return null;              // busy: caller treats as unknown
    $state = @json_decode((string)@file_get_contents(INVQ_STATEF), true);
    @flock($lock, LOCK_UN); @fclose($lock);
    $k = qbo_lib_custkey($email, $c['realm']);
    return (is_array($state) && !empty($state['cust'][$k])) ? (string)$state['cust'][$k] : '';
}
function invq_map_put($c, $email, $cid) {
    $lock = @fopen(INVQ_LOCKF, 'c');
    if (!$lock || !@flock($lock, LOCK_EX | LOCK_NB)) return false;
    $state = @json_decode((string)@file_get_contents(INVQ_STATEF), true);
    if (!is_array($state)) $state = array('cust' => array(), 'invoiced' => array());
    if (!isset($state['cust'])) $state['cust'] = array();
    if (!isset($state['invoiced'])) $state['invoiced'] = array();
    $state['cust'][qbo_lib_custkey($email, $c['realm'])] = (string)$cid;
    $tmp = INVQ_STATEF . '.' . getmypid() . '.tmp';
    $ok = (@file_put_contents($tmp, json_encode($state, JSON_PRETTY_PRINT), LOCK_EX) !== false) && @rename($tmp, INVQ_STATEF);
    @flock($lock, LOCK_UN); @fclose($lock);
    return $ok;
}
/* The QuickBooks customer for an email: the map, else a read-only lookup (which
   is written back, as pcm-qbo.php does), else '' . */
function invq_customer_for($c, $email) {
    $email = invq_email_ok($email);
    if ($email === '') return '';
    $cid = invq_map_get($c, $email);
    if ($cid === null) return '';                       // map busy - do not guess
    if ($cid !== '') return $cid;
    $q = "select Id from Customer where PrimaryEmailAddr = '" . qbo_lib_qesc($email) . "'";
    $res = invq_api($c, 'GET', '/query?query=' . rawurlencode($q));
    if (qbo_lib_ok($res) && !empty($res['json']['QueryResponse']['Customer'][0]['Id'])) {
        $cid = (string)$res['json']['QueryResponse']['Customer'][0]['Id'];
        invq_map_put($c, $email, $cid);
        return $cid;
    }
    return '';
}

/* ---- reading QuickBooks --------------------------------------------------- */
/* Invoices with a balance (last INVQ_MAX_ROWS), plus any specific ids asked for
   (the ones jobs point at, so a paid one still shows as paid). Returns them keyed
   by Id, plus the email each would go to. */
function invq_fetch($c, $extraIds = array()) {
    $q = "select * from Invoice where Balance > '0' orderby TxnDate desc maxresults " . (int)INVQ_MAX_ROWS;
    $res = invq_api($c, 'GET', '/query?query=' . rawurlencode($q));
    if (!qbo_lib_ok($res)) return array('ok' => false, 'why' => 'qbo_' . (int)$res['code']);
    $byId = array();
    foreach ((array)(isset($res['json']['QueryResponse']['Invoice']) ? $res['json']['QueryResponse']['Invoice'] : array()) as $inv)
        if (is_array($inv) && !empty($inv['Id'])) $byId[(string)$inv['Id']] = $inv;
    $missing = array();
    foreach ((array)$extraIds as $id) if (preg_match('/^\d+$/', (string)$id) && !isset($byId[(string)$id])) $missing[(string)$id] = true;
    if ($missing) {
        $iq = "select * from Invoice where Id in ('" . implode("','", array_keys($missing)) . "')";
        $ir = invq_api($c, 'GET', '/query?query=' . rawurlencode($iq));
        if (qbo_lib_ok($ir)) foreach ((array)(isset($ir['json']['QueryResponse']['Invoice']) ? $ir['json']['QueryResponse']['Invoice'] : array()) as $inv)
            if (is_array($inv) && !empty($inv['Id'])) $byId[(string)$inv['Id']] = $inv;
    }
    // customers' emails for invoices that carry none themselves
    $need = array();
    foreach ($byId as $inv) if (invq_bill_email($inv) === '' && preg_match('/^\d+$/', invq_customer_id($inv))) $need[invq_customer_id($inv)] = true;
    $emails = array();
    if ($need) {
        $cq = "select Id, PrimaryEmailAddr from Customer where Id in ('" . implode("','", array_keys($need)) . "')";
        $cr = invq_api($c, 'GET', '/query?query=' . rawurlencode($cq));
        if (qbo_lib_ok($cr)) foreach ((array)(isset($cr['json']['QueryResponse']['Customer']) ? $cr['json']['QueryResponse']['Customer'] : array()) as $cu) {
            $e = invq_email_ok(isset($cu['PrimaryEmailAddr']['Address']) ? $cu['PrimaryEmailAddr']['Address'] : '');
            if ($e !== '') $emails[(string)$cu['Id']] = $e;
        }
    }
    return array('ok' => true, 'byId' => $byId, 'emails' => $emails);
}
function invq_email_for($inv, $emails) {
    $e = invq_bill_email($inv);
    if ($e !== '') return $e;
    $cid = invq_customer_id($inv);
    return isset($emails[$cid]) ? $emails[$cid] : '';
}

/* Every invoice dated in the last $days days, with what QuickBooks says about its email
   (owner, 24 Sep 2026: "we don't think some of them have arrived"). Read-only, never cached:
   the point is to see the live state. EmailStatus is QuickBooks' own word - EmailSent means
   Intuit accepted it for delivery, NeedToSend means marked to send but not sent, NotSet means
   never emailed from QuickBooks (GoCardless-collected plan invoices sit here by design).
   DeliveryInfo carries the time Intuit sent it. QuickBooks cannot see whether it LANDED. */
function invq_recent($c, $days = 14, $now = null) {
    $now = $now === null ? time() : $now;
    $since = date('Y-m-d', $now - max(1, (int)$days) * 86400);
    $q = "select * from Invoice where TxnDate >= '" . $since . "' orderby TxnDate desc maxresults 200";
    $res = invq_api($c, 'GET', '/query?query=' . rawurlencode($q));
    if (!qbo_lib_ok($res)) return array('ok' => false, 'why' => 'qbo_' . (int)$res['code']);
    $list = (array)(isset($res['json']['QueryResponse']['Invoice']) ? $res['json']['QueryResponse']['Invoice'] : array());
    $need = array();
    foreach ($list as $inv) if (is_array($inv) && invq_bill_email($inv) === '' && preg_match('/^\d+$/', invq_customer_id($inv))) $need[invq_customer_id($inv)] = true;
    $emails = array();
    if ($need) {
        $cq = "select Id, PrimaryEmailAddr from Customer where Id in ('" . implode("','", array_keys($need)) . "')";
        $cr = invq_api($c, 'GET', '/query?query=' . rawurlencode($cq));
        if (qbo_lib_ok($cr)) foreach ((array)(isset($cr['json']['QueryResponse']['Customer']) ? $cr['json']['QueryResponse']['Customer'] : array()) as $cu) {
            $e = invq_email_ok(isset($cu['PrimaryEmailAddr']['Address']) ? $cu['PrimaryEmailAddr']['Address'] : '');
            if ($e !== '') $emails[(string)$cu['Id']] = $e;
        }
    }
    $rows = array();
    foreach ($list as $inv) {
        if (!is_array($inv) || empty($inv['Id'])) continue;
        $di = isset($inv['DeliveryInfo']) && is_array($inv['DeliveryInfo']) ? $inv['DeliveryInfo'] : array();
        $rows[] = array(
            'id'       => (string)$inv['Id'],
            'number'   => invq_str(isset($inv['DocNumber']) ? $inv['DocNumber'] : '', 20),
            'date'     => (string)(isset($inv['TxnDate']) ? $inv['TxnDate'] : ''),
            'customer' => invq_str(isset($inv['CustomerRef']['name']) ? $inv['CustomerRef']['name'] : '', 80),
            'email'    => invq_email_for($inv, $emails),
            'total'    => round((float)(isset($inv['TotalAmt']) ? $inv['TotalAmt'] : 0), 2),
            'balance'  => round((float)(isset($inv['Balance']) ? $inv['Balance'] : 0), 2),
            'status'   => invq_email_status($inv),
            'sent_at'  => (string)(isset($di['DeliveryTime']) ? $di['DeliveryTime'] : ''),
            'delivery' => (string)(isset($di['DeliveryType']) ? $di['DeliveryType'] : ''),
            'url'      => $c['host'] . '/app/invoice?txnId=' . rawurlencode((string)$inv['Id']),
        );
    }
    return array('ok' => true, 'since' => $since, 'rows' => $rows);
}

/* The whole picture: this month's jobs with their invoice state, this month's
   unsent invoices, and the older unsent ones folded away. Cached briefly. */
function invq_overview($c, $fresh = false, $now = null) {
    $now = $now === null ? time() : $now;
    $store = invq_store_read();
    if (!$fresh && is_array($store['cache']) && (int)$store['cache']['ts'] > $now - INVQ_CACHE_TTL) {
        $o = $store['cache']['data'];
        foreach (array('waiting', 'older') as $k) foreach ($o[$k] as $i => $r) $o[$k][$i]['held'] = isset($store['held'][(string)$r['id']]);
        $o['cached'] = true;
        return $o;
    }
    invq_pcm_sync($now);                                   // PC Manager services join the store before we read it
    invq_kind_sync($c, $now);                              // a Slack job type that names a QuickBooks service puts it on the job
    $jobs = invq_jobs_recent(invq_jobs_read(), $now);
    $ids = array();
    foreach ($jobs as $j) if (!empty($j['invoice_no'])) $ids[] = (string)$j['invoice_no'];
    $f = invq_fetch($c, $ids);
    if (empty($f['ok'])) {
        $o = is_array($store['cache']) ? $store['cache']['data'] : array('jobs' => array(), 'waiting' => array(), 'older' => array());
        $o['ok'] = false; $o['why'] = $f['why']; $o['stale'] = true;
        return $o;
    }
    $byId = $f['byId']; $all = array_values($byId);
    $rowOf = function ($inv) use ($f, $all, $store, $c, $now) {
        $email = invq_email_for($inv, $f['emails']);
        return invq_row($inv, $email, invq_flags($inv, $email, $all, $now), isset($store['held'][(string)$inv['Id']]), $c['host'], $now);
    };
    // jobs -> their invoices
    $jobRows = array(); $linked = array();
    foreach ($jobs as $j) {
        $custId = '';
        if (empty($j['invoice_no'])) $custId = invq_customer_for($c, isset($j['email']) ? $j['email'] : '');
        $inv = invq_match_job($j, $byId, $custId);
        if ($inv && empty($j['invoice_no'])) invq_job_link($j['id'], (string)$inv['Id'], $c['host'] . '/app/invoice?txnId=' . rawurlencode((string)$inv['Id']), 'matched');
        if ($inv) $linked[(string)$inv['Id']] = true;
        $jobRows[] = invq_job_row($j, $inv ? $rowOf($inv) : null, $now);
    }
    // unsent invoices: this month's (not already shown under a job) and the older ones
    $waiting = array(); $older = array();
    foreach (invq_pick($all) as $inv) {
        if (isset($linked[(string)$inv['Id']])) continue;
        $r = $rowOf($inv);
        if ($r['days'] <= INVQ_WINDOW_DAYS) $waiting[] = $r; else $older[] = $r;
    }
    usort($waiting, function ($a, $b) { return (int)$b['days'] - (int)$a['days']; });
    usort($older, function ($a, $b) { return (int)$b['days'] - (int)$a['days']; });
    $o = array('ok' => true, 'jobs' => $jobRows, 'waiting' => $waiting, 'older' => $older, 'cached' => false,
               'live' => !empty($c['live']), 'only_key' => ($c['only'] !== ''));
    invq_store_locked(function ($d) use ($o, $now) { $d['cache'] = array('ts' => $now, 'data' => $o); return array('ok' => true, 'data' => $d); });
    return $o;
}

/* ---- WRITE 1: create the invoice a job is owed --------------------------- */
/* The next 4905/NNN from QuickBooks itself: the newest hundred invoices carrying the prefix,
   newest first, so the highest number is always among them. '' if the read fails - the invoice
   is still created, just unnumbered, which is what happened before. */
function invq_next_docnumber($c) {
    $q = "select DocNumber from Invoice where DocNumber like '" . INVQ_DOC_PREFIX . "%' orderby Id desc maxresults 100";
    $res = invq_api($c, 'GET', '/query?query=' . rawurlencode($q));
    if (!qbo_lib_ok($res)) return '';
    $nums = array();
    foreach ((array)(isset($res['json']['QueryResponse']['Invoice']) ? $res['json']['QueryResponse']['Invoice'] : array()) as $inv)
        if (is_array($inv) && isset($inv['DocNumber'])) $nums[] = (string)$inv['DocNumber'];
    return invq_next_number($nums);
}

function invq_create_for_job($c, $jobId, $who, $auto = false) {
    $job = null;
    foreach (invq_jobs_read() as $j) if (is_array($j) && (string)(isset($j['id']) ? $j['id'] : '') === (string)$jobId) { $job = $j; break; }
    if (!$job) return array('ok' => false, 'error' => 'no_such_job');
    if (!empty($job['invoice_no'])) return array('ok' => false, 'error' => 'already_invoiced', 'invoice' => (string)$job['invoice_no']);
    list($can, $why) = invq_can_create($job);
    if (!$can) return array('ok' => false, 'error' => $why);
    if (empty($c['live'])) return array('ok' => false, 'error' => 'not_live');
    if ($c['only'] !== '') return array('ok' => false, 'error' => 'only_key');
    if ($c['item'] === '') return array('ok' => false, 'error' => 'no_item');
    $store = invq_store_read();
    $hourAgo = time() - 3600; $n = 0;
    foreach ($store['created'] as $s) if ((int)$s['at'] > $hourAgo) $n++;
    if ($n >= INVQ_MAX_CREATES_RUN) return array('ok' => false, 'error' => 'rate_limited');

    $email = invq_email_ok($job['email']);
    $amount = round(invq_num($job['amount']), 2);
    $desc = invq_str($job['desc'], 200);
    $name = invq_str(isset($job['name']) ? $job['name'] : '', 90); if ($name === '') $name = $email;
    $phone = invq_str(isset($job['phone']) ? $job['phone'] : '', 30);

    // 1. the customer: map, else lookup, else create - never a duplicate
    $cid = invq_customer_for($c, $email);
    if ($cid === '') {
        $m = invq_map_get($c, $email);
        if ($m === null) return array('ok' => false, 'error' => 'busy');
        $body = array('DisplayName' => $name, 'PrimaryEmailAddr' => array('Address' => $email));
        if ($phone !== '') $body['PrimaryPhone'] = array('FreeFormNumber' => $phone);
        /* the address as written up in Slack (22 Sep): the postcode is its own field
           when the post had one; the rest is line 1 */
        $addr = invq_str(isset($job['addr']) ? $job['addr'] : '', 200);
        $pc = strtoupper(invq_str(isset($job['postcode']) ? $job['postcode'] : '', 12));
        if ($pc !== '' && strtoupper(substr($addr, -strlen($pc))) === $pc) $addr = trim(substr($addr, 0, -strlen($pc)), " ,");
        if ($addr !== '' || $pc !== '') {
            $body['BillAddr'] = array('Country' => 'United Kingdom');
            if ($addr !== '') $body['BillAddr']['Line1'] = $addr;
            if ($pc !== '') $body['BillAddr']['PostalCode'] = $pc;
        }
        $res = invq_api($c, 'POST', '/customer', $body);
        if (!qbo_lib_ok($res) || empty($res['json']['Customer']['Id'])) {
            $code = (string)(isset($res['json']['Fault']['Error'][0]['code']) ? $res['json']['Fault']['Error'][0]['code'] : '');
            invq_log('customer create FAILED for job ' . $jobId . ' ' . invq_why($res));
            return array('ok' => false, 'error' => ($code === '6240' ? 'duplicate_name' : 'qbo_customer'), 'why' => invq_why($res), 'name' => $name);
        }
        $cid = (string)$res['json']['Customer']['Id'];
        invq_map_put($c, $email, $cid);
        invq_log('created QuickBooks customer ' . $cid . ' for job ' . $jobId);
    }
    // 2. is there already an invoice that IS this job? Then link, don't create.
    $f = invq_fetch($c);
    if (!empty($f['ok'])) {
        $found = invq_match_job($job, $f['byId'], $cid);
        if ($found) {
            invq_job_link($jobId, (string)$found['Id'], $c['host'] . '/app/invoice?txnId=' . rawurlencode((string)$found['Id']), 'matched');
            return array('ok' => true, 'invoice' => (string)$found['Id'], 'linked' => true);
        }
    }
    // 3. the invoice - the same line pcm-qbo.php writes
    $itemRef = !empty($job['item_id']) ? (string)$job['item_id'] : $c['item'];   // the Product/Service picked for the job, else the default
    $line = array('DetailType' => 'SalesItemLineDetail', 'Amount' => $amount, 'Description' => $desc,
                  'SalesItemLineDetail' => array('ItemRef' => array('value' => $itemRef), 'Qty' => 1, 'UnitPrice' => $amount));
    if ($c['tax'] !== '') $line['SalesItemLineDetail']['TaxCodeRef'] = array('value' => $c['tax']);
    $inv = array('CustomerRef' => array('value' => $cid), 'Line' => array($line), 'TxnDate' => gmdate('Y-m-d'),
                 'BillEmail' => array('Address' => $email));
    $doc = invq_next_docnumber($c);            // 4905/NNN, David's sequence, so the console's invoices are numbered like his
    if ($doc !== '') $inv['DocNumber'] = $doc;
    $res = invq_api($c, 'POST', '/invoice', $inv);
    if (!qbo_lib_ok($res) || empty($res['json']['Invoice']['Id'])) {
        invq_log('invoice create FAILED for job ' . $jobId . ' ' . invq_why($res));
        return array('ok' => false, 'error' => 'qbo_invoice', 'why' => invq_why($res));
    }
    $invId = (string)$res['json']['Invoice']['Id'];
    $docMade = (string)(isset($res['json']['Invoice']['DocNumber']) ? $res['json']['Invoice']['DocNumber'] : $doc);
    $url = $c['host'] . '/app/invoice?txnId=' . rawurlencode($invId);
    invq_job_link($jobId, $invId, $url, $auto ? 'auto' : 'staff');
    invq_store_locked(function ($d) use ($jobId, $invId, $amount, $who) {
        $d['created'][] = array('job' => (string)$jobId, 'id' => $invId, 'amount' => $amount, 'by' => $who, 'at' => time());
        $d['cache'] = null;
        return array('ok' => true, 'data' => $d);
    });
    invq_log('created invoice ' . $invId . ($docMade !== '' ? ' #' . $docMade : ' (no number)') . ' ' . invq_money($amount) . ' for job ' . $jobId . ' by ' . $who);
    invq_slack(':receipt: *Invoice created* - ' . $name . ', ' . invq_money($amount) . ' for ' . $desc . ($docMade !== '' ? ' (#' . $docMade . ', job ' . $jobId . ')' : ' (job ' . $jobId . ')')
             . ($auto ? ', automatically' : ', by ' . $who) . '. Waiting for your OK in the staff console.');
    return array('ok' => true, 'invoice' => $invId, 'linked' => false);
}

/* ---- WRITE 2: QuickBooks emails an invoice -------------------------------- */
/* Re-read at the moment of sending, never from a cached row; the address is the
   one QuickBooks holds. Nothing in the request can choose where it goes. */
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
            $to = invq_email_ok(isset($cr['json']['Customer']['PrimaryEmailAddr']['Address']) ? $cr['json']['Customer']['PrimaryEmailAddr']['Address'] : '');
        }
    }
    if ($to === '') return array('ok' => false, 'error' => 'no_email');

    /* Intuit's send operation: POST .../invoice/{id}/send?sendTo=..., Content-Type
       application/octet-stream, empty body. QuickBooks emails from the company's
       own template and sets EmailStatus to EmailSent. */
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
        $d['cache'] = null;
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

/* ---- the cron tick: create what this month's jobs are owed, then one line -- */
function invq_morning() {
    $out = array('posted' => false, 'created' => 0, 'waiting' => 0, 'need' => 0, 'skipped' => '');
    $tz = new DateTimeZone('Europe/London');
    $now = new DateTime('now', $tz);
    if ((int)$now->format('G') < INVQ_MORNING_HOUR) { $out['skipped'] = 'before ' . INVQ_MORNING_HOUR; return $out; }
    $today = $now->format('Y-m-d');
    $store = invq_store_read();
    if ($store['last_morning'] === $today) { $out['skipped'] = 'done today'; return $out; }
    $c = invq_connect();
    if (empty($c['ok'])) { $out['skipped'] = $c['why']; return $out; }
    $o = invq_overview($c, true);
    if (empty($o['ok'])) { $out['skipped'] = $o['why']; return $out; }
    // the automation: every job that can have its invoice created, gets it
    if (!empty($c['live']) && $c['only'] === '') {
        foreach ($o['jobs'] as $jr) {
            if (!$jr['can_create'] || $out['created'] >= INVQ_MAX_CREATES_RUN) continue;
            $r = invq_create_for_job($c, $jr['job'], 'the morning sweep', true);
            if (!empty($r['ok'])) $out['created']++;
        }
        if ($out['created']) $o = invq_overview($c, true);
    }
    $line = invq_slack_line($o['jobs'], array_merge($o['waiting'], array_values(array_filter(array_map(function ($j) { return $j['invoice']; }, $o['jobs'])))));
    $out['waiting'] = count($o['waiting']); $out['need'] = count(array_filter($o['jobs'], function ($j) { return $j['state'] === 'none'; }));
    if ($line !== '') $out['posted'] = invq_slack($line);
    invq_store_locked(function ($d) use ($today) { $d['last_morning'] = $today; return array('ok' => true, 'data' => $d); });
    invq_log('morning ' . $today . ': created ' . $out['created'] . ', waiting ' . $out['waiting'] . ', no invoice yet ' . $out['need'] . ($out['posted'] ? ', posted' : ''));
    return $out;
}
