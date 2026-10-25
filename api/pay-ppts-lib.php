<?php
/*
 * PayPal payments made STRAIGHT to our PayPal -> the QuickBooks invoice, by themselves (25 Oct 2026). Owner, after three
 * invoices went out on 23 Oct and none showed as paid: "I want it to be automatic so that ... we know when someone pays,
 * in our staff portal."
 *
 * The pay page's PayPal button (pay-pp-lib.php) books itself. But a customer can also pay us without the pay page: "Send"
 * in their PayPal app to our address, or an old PayPal.Me link. Those carry no order of ours, so until now only a person
 * reading PayPal's activity list ever knew. tm-cron.php now asks PayPal's Transaction Search (GET /v1/reporting/transactions
 * - the app's "Transaction search" feature, ticked 25 Oct 2026) for the last 3 days' money IN, at most every 10 minutes, and
 * hands each new payment to pst_book (pcm-paystripe-lib.php), the same booking the pay page's payments get:
 *   - only completed payments in pounds TO us, of the kinds a person sends (PPTS_CODES) - not refunds, fees, transfers or
 *     our own buying (those are money out, or another event code);
 *   - never one of our own orders: they all carry custom_id (the pay page "pay:<ref>", the shop, "Unlock everything") and
 *     book themselves - and never a capture the pay page's record already holds;
 *   - the invoice: "4905/819" (or 4905-819, 4905 819) in what they wrote on the payment, and then only when the amount is
 *     exactly what that invoice owes or totals (a mistyped number must never pay a stranger's invoice); otherwise the
 *     payer's email, only when exactly ONE open invoice for it owes exactly that much (pst_email_pick);
 *   - anything less certain: Slack "PayPal payment needs a look", once - it may be a personal payment or a refund to us;
 *   - never twice: pst_book's claim (key ppts:<PayPal transaction id>), and the transaction id in the QuickBooks note.
 * PayPal shows a payment in Transaction Search up to about 3 hours after it is made: minutes to hours, not seconds.
 * No PayPal keys, sandbox keys, or the feature not ticked: a clean no-op (the log and 'ppts_last' say which).
 * Include-only (.htaccess). NO closing tag in this file.
 */
require_once __DIR__ . '/pcm-paystripe-lib.php';   // pst_book, pst_seen, pst_ref_kind, pst_email_clean, pl_store_*, PLQ_STORE, plq_log
require_once __DIR__ . '/pcm-plus-pp-lib.php';     // pp_creds, pp_api, pp_token, pp_why

define('PPTS_DAYS', 3);                 // how far back each look goes (PayPal can take ~3 hours to list a payment)
define('PPTS_MAX_PER_TICK', 3);         // payments booked per cron tick: a ceiling, not a target
define('PPTS_MAX_PAGES', 5);            // 100 transactions a page
// T0000 money sent to us (the PayPal app, PayPal.Me), T0006 PayPal checkout, T0007 a website button, T0011 mobile,
// T0012 virtual terminal. Refunds (T11xx), fees, transfers to the bank and our own buying are none of these.
define('PPTS_CODES', 'T0000,T0006,T0007,T0011,T0012');
define('PPTS_ALERT_AFTER', 6);          // looks failed in a row before Slack is told (about an hour)

function ppts_log($m) { plq_log('paypal-direct ' . $m); }

/* ---- the pure part (pay-ppts-test.php) -------------------------------------------------------------------------------- */
/* The window to ask for: the last PPTS_DAYS days, ending a minute ago (PayPal refuses an end in the future). */
function ppts_window($now) {
    return array(gmdate('Y-m-d\TH:i:s\Z', $now - PPTS_DAYS * 86400), gmdate('Y-m-d\TH:i:s\Z', $now - 60));
}
/* An invoice number in what the payer wrote (their note, the subject, PayPal's invoice box) -> '4905-819' | '' */
function ppts_ref($ti) {
    foreach (array('transaction_note', 'transaction_subject', 'invoice_id') as $f) {
        $s = (string)($ti[$f] ?? '');
        if (preg_match('/(?<!\d)' . PST_DOC_PREFIX . '\s*[\/\-]?\s*(\d{1,6})(?!\d)/', $s, $m)) return PST_DOC_PREFIX . '-' . (int)$m[1];
    }
    return '';
}
/* Is this transaction a payment someone sent straight to us? '' = yes, else why not. */
function ppts_take($td) {
    $ti = (array)($td['transaction_info'] ?? array());
    if ((string)($ti['transaction_id'] ?? '') === '') return 'no id';
    if (!in_array((string)($ti['transaction_event_code'] ?? ''), explode(',', PPTS_CODES), true)) return 'not a payment to us';
    if (strtoupper((string)($ti['transaction_status'] ?? '')) !== 'S') return 'not completed';
    if (strtoupper((string)($ti['transaction_amount']['currency_code'] ?? '')) !== 'GBP') return 'not in pounds';
    if ((float)($ti['transaction_amount']['value'] ?? 0) <= 0) return 'money out';
    if (trim((string)($ti['custom_field'] ?? '')) !== '') return 'one of our own orders';   // pay page, shop, unlock: they book themselves
    return '';
}
/* A payment sent straight to us -> the payment pst_book books */
function ppts_pay($td) {
    $ti = (array)$td['transaction_info']; $pi = (array)($td['payer_info'] ?? array());
    $id = (string)$ti['transaction_id'];
    $nm = (array)($pi['payer_name'] ?? array());
    $who = trim((string)($nm['given_name'] ?? '') . ' ' . (string)($nm['surname'] ?? ''));
    if ($who === '') $who = trim((string)($nm['alternate_full_name'] ?? ''));
    $when = strtotime((string)($ti['transaction_initiation_date'] ?? ''));
    return array('key' => 'ppts:' . $id, 'prov' => 'paypal', 'direct' => true,
        'pence' => (int)round(((float)$ti['transaction_amount']['value']) * 100), 'ref' => ppts_ref($ti), 'who' => $who,
        'email' => pst_email_clean($pi['email_address'] ?? ''), 'when' => $when ? $when : time(), 'txn' => $id, 'mark' => $id,
        'note' => 'Paid with PayPal straight to our PayPal account (not the pay page) - transaction ' . $id
            . '. Recorded automatically by the website.');
}

/* Slack, once: the first look that works */
function ppts_hello_text($seen, $direct) {
    return '✅ *PayPal check is on:* every 10 minutes the website now reads PayPal\'s list of payments, so money sent straight to our '
        . 'PayPal (not only through the pay page) marks its QuickBooks invoice paid by itself, with a line here - or a "needs a look" '
        . 'when it can\'t tell which invoice. PayPal can take up to 3 hours to list a payment. First look, the last ' . PPTS_DAYS . ' days: '
        . $seen . ' PayPal transaction' . ($seen === 1 ? '' : 's') . ', ' . $direct . ' of them sent straight to us.';
}
/* Slack, once per run of failures: an hour of looks that didn't work */
function ppts_down_text($why) {
    return '⚠️ *PayPal check isn\'t working:* for about an hour the website couldn\'t read PayPal\'s list of payments (' . $why
        . '). Until it can, money sent straight to our PayPal won\'t mark invoices paid by itself - check PayPal\'s activity by hand. '
        . 'Pay-page payments are not affected.';
}

/* ---- talking to PayPal ------------------------------------------------------------------------------------------------- */
/* The last PPTS_DAYS days of completed transactions. -> array(list | null, why-not) */
function ppts_fetch($cr, $now) {
    list($from, $to) = ppts_window($now);
    $all = array(); $fresh = false;
    for ($page = 1; $page <= PPTS_MAX_PAGES; $page++) {
        $path = '/v1/reporting/transactions?' . http_build_query(array('start_date' => $from, 'end_date' => $to,
            'transaction_status' => 'S', 'fields' => 'transaction_info,payer_info', 'page_size' => 100, 'page' => $page));
        list($c, $j) = pp_api($cr, 'GET', $path);
        if ($c === 403 && !$fresh) {   // a token from before "Transaction search" was ticked doesn't carry it: one fresh token
            $fresh = true; pp_token($cr, true);
            list($c, $j) = pp_api($cr, 'GET', $path);
        }
        if ($c === 403) return array(null, 'PayPal refused Transaction Search (is "Transaction search" ticked on the app?) ' . pp_why($j));
        if ($c !== 200 || !is_array($j)) return array(null, 'PayPal didn\'t answer (http ' . $c . ') ' . pp_why($j));
        foreach ((array)($j['transaction_details'] ?? array()) as $td) if (is_array($td)) $all[] = $td;
        if ($page >= (int)($j['total_pages'] ?? 1)) break;
    }
    return array($all, '');
}
/* Capture ids the pay page's own orders already hold (pay-pp-lib.php's 'pp' map): never booked a second time here. */
function ppts_page_captures($d) {
    $out = array();
    foreach ((array)($d['pp'] ?? array()) as $o) if (is_array($o) && (string)($o['cap'] ?? '') !== '') $out[(string)$o['cap']] = true;
    return $out;
}
/* tm-cron.php: at most every PST_SWEEP_EVERY seconds. -> array(handled: transaction id => what | skipped: why) */
function ppts_sweep($now = null) {
    $now = $now === null ? time() : (int)$now;
    $cr = pp_creds();
    if (!$cr) return array('skipped' => 'no paypal key');
    if (($cr['env'] ?? '') !== 'live') return array('skipped' => 'sandbox');
    $d = pl_store_read(PLQ_STORE);
    if ((int)($d['ppts_swept'] ?? 0) > $now - PST_SWEEP_EVERY) return array('skipped' => 'recent');
    pl_store_locked(PLQ_STORE, function ($data) use ($now) { $data['ppts_swept'] = $now; return array('ok' => true, 'data' => $data); });

    list($list, $why) = ppts_fetch($cr, $now);
    $last = function ($rec, $extra = array()) use ($now) {
        pl_store_locked(PLQ_STORE, function ($data) use ($rec, $extra, $now) { $data['ppts_last'] = $rec + array('at' => $now); return array('ok' => true, 'data' => $extra + $data); });
    };
    if ($list === null) {
        // nobody reads the log: an hour of failed looks (6 in a row) is said in Slack, once per run of failures
        $fails = (int)($d['ppts_last']['fails'] ?? 0) + 1;
        ppts_log('look FAILED (' . $fails . ' in a row): ' . $why);
        $last(array('ok' => false, 'why' => substr($why, 0, 200), 'fails' => $fails));
        if ($fails === PPTS_ALERT_AFTER) pst_slack(ppts_down_text($why));
        return array('skipped' => $why);
    }
    $caps = ppts_page_captures($d);
    $out = array(); $n = 0; $direct = 0;
    foreach ($list as $td) {
        if (ppts_take($td) !== '') continue;
        $direct++;
        $id = (string)$td['transaction_info']['transaction_id'];
        if (isset($caps[$id])) continue;
        $seen = pst_seen('ppts:' . $id);
        $st = (string)($seen['state'] ?? '');
        if ($st === 'done' || $st === 'flagged') continue;
        if (++$n > PPTS_MAX_PER_TICK) break;
        list($what) = pst_book(ppts_pay($td), 'paypal-direct');
        $out[$id] = $what;
    }
    // the very first look that works says so in Slack, once, so staff know it is on
    $hello = empty($d['ppts_hello']);
    $last(array('ok' => true, 'seen' => count($list), 'direct' => $direct, 'handled' => count($out), 'fails' => 0), $hello ? array('ppts_hello' => $now) : array());
    if ($hello) pst_slack(ppts_hello_text(count($list), $direct));
    return array('handled' => $out, 'seen' => count($list));
}
