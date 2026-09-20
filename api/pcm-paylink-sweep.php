<?php
/*
 * Pay links - the half that talks to the outside world (20 Sep 2026).
 *
 * Phase 2 of the per-job payment link. Phase 1 could make and send a link; the
 * only way to learn it had been paid was to press "Check if paid". This file
 * closes that loop, and it is shared by the two things that can:
 *
 *   api/gocardless-webhook.php  - GoCardless tells us, in seconds
 *   api/tm-cron.php             - we ask, every few minutes, for anything the
 *                                 webhook did not bring
 *
 * WHY BOTH. A webhook is the right answer and the poll is the insurance:
 * SiteGround's WAF has 403'd non-browser callers before (the van signal poller
 * had to pin a user agent), and a payment nobody is told about is worse than a
 * late notification. The poll is cheap - it only looks at rows that are still
 * open, and only after PLQ_MIN_AGE, so a webhook that arrives normally gets
 * there first and the poll finds nothing to do.
 *
 * Library only: no top-level side effects, safe to include from any scope.
 * Every state change goes through pl_event_apply() or plq_mark(), so the
 * webhook and the poll can never disagree about what a row means.
 *
 * NO closing tag in this file.
 */

require_once __DIR__ . '/pcm-paylink-lib.php';

define('PLQ_STORE',    __DIR__ . '/pcm-paylink.json');
define('PLQ_LOG',      __DIR__ . '/pcm-paylink.log');
define('PLQ_GCF',      __DIR__ . '/pcm-gocardless.php');        // server-only: $GC_TOKEN
define('PLQ_WEBF',     __DIR__ . '/slack-webhook-jobs.php');
define('PLQ_MIN_AGE',  180);        // seconds before the poll bothers with a new link - the webhook's head start
define('PLQ_RECHECK',  600);        // and how long before it looks at the same row again
define('PLQ_MAX_CHECK', 8);         // API calls per tick: a ceiling, not a target

function plq_log($m) { @file_put_contents(PLQ_LOG, '[' . gmdate('Y-m-d H:i:s') . 'Z] paylink: ' . $m . "\n", FILE_APPEND | LOCK_EX); }

function plq_token() {
    if (!is_readable(PLQ_GCF)) return '';
    include PLQ_GCF;                                  // sets $GC_TOKEN
    return !empty($GC_TOKEN) ? (string)$GC_TOKEN : '';
}

/* Read-only GoCardless. This file never creates, cancels or charges anything -
   it asks what happened and writes the answer down. */
function plq_get($path) {
    $tok = plq_token();
    if ($tok === '') return array(0, null);
    $ch = curl_init('https://api.gocardless.com' . $path);
    curl_setopt_array($ch, array(CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 12, CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_HTTPHEADER => array('Authorization: Bearer ' . $tok, 'GoCardless-Version: 2015-07-06', 'Accept: application/json')));
    $r = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
    return array($code, json_decode((string)$r, true));
}

function plq_hook() {
    if (!is_file(PLQ_WEBF)) return '';
    $src = (string)@file_get_contents(PLQ_WEBF);
    return preg_match('#(https://hooks\.slack\.com/[^\'"\s]+)#', $src, $m) ? $m[1] : '';
}
function plq_slack($text) {
    $hook = plq_hook();
    if ($hook === '' || $text === '') return false;
    $ch = curl_init($hook);
    curl_setopt_array($ch, array(CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 8, CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => array('Content-Type: application/json'),
        CURLOPT_POSTFIELDS => json_encode(array('text' => $text, 'unfurl_links' => false), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)));
    @curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
    return $code >= 200 && $code < 300;
}

/* Write a state change and say it once. Returns the Slack text that was posted,
   or '' when nothing changed - which is the normal case and must stay silent. */
function plq_mark($id, $state, $why = '', $payment = '') {
    $said = '';
    pl_store_locked(PLQ_STORE, function ($data) use ($id, $state, $why, $payment, &$said) {
        foreach ($data['links'] as $i => $row) {
            if ((string)$row['id'] !== (string)$id) continue;
            if ($payment !== '' && empty($row['payment'])) $data['links'][$i]['payment'] = $payment;
            $cur = pl_row_state($row);
            if ($state === '' || $cur === $state || ($cur === 'paid' && $state !== 'failed')) break;
            $data['links'][$i]['status'] = $state;
            $data['links'][$i]['status_at'] = time();
            $said = pl_change_text($data['links'][$i], $state, $why);
            break;
        }
        return array('ok' => true, 'data' => $data);
    });
    if ($said !== '') { plq_slack($said); plq_log('row ' . $id . ' -> ' . $state . ($why !== '' ? ' (' . $why . ')' : '')); }
    return $said;
}

/* One row, asked about directly. Used by the poll and by the console's
   "Check if paid". Returns array(state, reached) - the caller needs to know the
   difference between "not paid" and "GoCardless did not answer", because only
   one of those is worth telling the operator about. */
function plq_check_row($row) {
    $before = pl_row_state($row);
    if ($before !== 'open') return array('state' => $before, 'reached' => true);   // settled rows need no call
    list($code, $j) = plq_get('/billing_requests/' . rawurlencode((string)$row['br']));
    if ($code < 200 || $code >= 300) return array('state' => $before, 'reached' => false);   // believe nothing, change nothing
    $br = isset($j['billing_requests']) ? $j['billing_requests'] : null;
    $state = pl_status_from_br($br);
    $pay = (string)(isset($br['payment_request']['links']['payment']) ? $br['payment_request']['links']['payment'] : '');
    if ($state !== 'open' || $pay !== '') plq_mark($row['id'], $state === 'open' ? '' : $state, '', $pay);
    return array('state' => $state, 'reached' => true);
}

/* The cron tick. Looks only at links that are still open, old enough that the
   webhook has had its chance, and not asked about recently. Returns a small
   summary for the cron's own output. */
function paylink_sweep($limit = PLQ_MAX_CHECK) {
    $out = array('open' => 0, 'checked' => 0, 'paid' => 0, 'failed' => 0, 'skipped' => '');
    if (!is_file(PLQ_STORE)) return $out;
    if (plq_token() === '') { $out['skipped'] = 'no-gocardless'; return $out; }
    $now = time();
    $store = pl_store_read(PLQ_STORE);
    $due = array();
    foreach ((array)$store['links'] as $row) {
        if (pl_row_state($row, $now) !== 'open') continue;
        $out['open']++;
        if ((int)$row['created'] > $now - PLQ_MIN_AGE) continue;                       // the webhook's head start
        if ((int)(isset($row['checked_at']) ? $row['checked_at'] : 0) > $now - PLQ_RECHECK) continue;
        $due[] = $row;
    }
    /* Oldest first, so a link that has been waiting longest is never starved by
       a busy afternoon of new ones. */
    usort($due, function ($a, $b) { return (int)$a['created'] - (int)$b['created']; });
    if (count($due) > $limit) { $out['skipped'] = (count($due) - $limit) . ' left for the next tick'; $due = array_slice($due, 0, $limit); }

    foreach ($due as $row) {
        $r = plq_check_row($row);
        $out['checked']++;
        if ($r['state'] === 'paid') $out['paid']++;
        if ($r['state'] === 'failed') $out['failed']++;
        /* Stamp the attempt whatever the answer, so one unreachable row cannot
           eat every tick's budget. */
        pl_store_locked(PLQ_STORE, function ($data) use ($row, $now) {
            foreach ($data['links'] as $i => $r) if ((string)$r['id'] === (string)$row['id']) $data['links'][$i]['checked_at'] = $now;
            return array('ok' => true, 'data' => $data);
        });
    }
    return $out;
}
