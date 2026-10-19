<?php
/*
 * Pay-page card payments -> the QuickBooks invoice, by themselves (19 Oct 2026). Owner, after Hanna paid her pay link by
 * card: "does it actually produce a QuickBooks invoice? ... David's not going to have Claude in front of him, so he needs
 * to basically work automatically."
 *
 * The staff console's pay link is /pay/?amount=60.00&ref=<invoice>; the pay page's "Pay by card" button is the Stripe
 * Payment Link with client_reference_id=<invoice>. When Stripe says such a checkout is paid, this file:
 *   1. reads the checkout back FROM STRIPE - the event is never trusted for the money: complete, paid, GBP, live, made by a
 *      Payment Link (not the shop - shop-lib.php books those);
 *   2. finds the QuickBooks invoice from the reference: David's number written with a dash (4905-131 = invoice 4905/131),
 *      or QuickBooks' own invoice id (the links made on 19 Oct before this existed, e.g. Hanna's 12838 - and then only when
 *      the amount is exactly what the invoice says), or the pay-link row's invoice;
 *   3. records a QuickBooks Payment against that invoice, into the account Stripe pays into (the shop's "card sales are
 *      paid into" account, deposit_card) - never more than the invoice still owes, and never twice: each checkout is
 *      claimed in pcm-paylink.json ('stripe' => checkout id => what happened) before QuickBooks is touched;
 *   4. says so in Slack (the pay links' channel) - or, when a check fails, says exactly what to do by hand, once.
 * Two ways in: shop-stripe.php (Stripe's webhook, within seconds) and tm-cron.php (every 10 minutes, the last 3 days of
 * checkouts: the insurance, and how a payment made before this existed is picked up).
 *
 * The same gates as every other QuickBooks writer (invq_connect / shop_qbo_gate): nothing is written unless
 * $QBO_LIVE_ENABLED is on and $QBO_ONLY_KEY is empty. A Stripe test key never reaches QuickBooks.
 * Needs pcm-paylink-sweep.php (the store, plq_slack) - included below. Include-only (.htaccess). NO closing tag in this file.
 */
require_once __DIR__ . '/pcm-paylink-sweep.php';   // pcm-paylink-lib.php, PLQ_STORE, plq_slack, plq_log
require_once __DIR__ . '/shop-stripe-lib.php';     // st_creds, st_api, st_why
require_once __DIR__ . '/shop-books-lib.php';      // shop_read, shop_qbo_gate + pcm-invq-sweep.php (invq_connect, invq_api, invq_why)

define('PST_DOC_PREFIX', '4905');     // David's numbers: 4905/NNN on the invoice, 4905-NNN in a link (Stripe allows no slash)
define('PST_SWEEP_EVERY', 600);       // seconds between the cron's looks at Stripe
define('PST_SWEEP_DAYS', 3);          // how far back it looks
define('PST_MAX_PER_TICK', 3);        // checkouts handled per cron tick: a ceiling, not a target
define('PST_MAX_TRIES', 6);           // a passing problem (QuickBooks busy, no answer) is tried this many times, then flagged
define('PST_KEEP', 300);              // checkouts remembered

function pst_log($m) { plq_log('stripe ' . $m); }

/* ---- the pure part (pcm-paystripe-test.php) --------------------------------------------------------------------------- */

/* A reference as a person or a link wrote it -> the form we keep: letters, digits and dashes, a slash made a dash. */
function pst_ref_clean($v) {
    $v = str_replace('/', '-', trim((string)$v));
    return substr(preg_replace('/[^A-Za-z0-9-]/', '', $v), 0, 24);
}
/* The checkout's reference: the link's client_reference_id, else what they typed in the invoice-number box. */
function pst_ref_of($s) {
    $r = pst_ref_clean($s['client_reference_id'] ?? '');
    if ($r !== '') return $r;
    foreach ((array)($s['custom_fields'] ?? array()) as $f) {
        if (!is_array($f)) continue;
        $v = $f['text']['value'] ?? ($f['numeric']['value'] ?? ($f['dropdown']['value'] ?? ''));
        $v = pst_ref_clean($v);
        if ($v !== '') return $v;
    }
    return '';
}
/* What kind of reference -> array('doc', '4905/131') | array('id', '12838') | array('', '') */
function pst_ref_kind($ref) {
    $ref = pst_ref_clean($ref);
    if (preg_match('/^' . PST_DOC_PREFIX . '-?(\d{1,6})$/', $ref, $m)) return array('doc', PST_DOC_PREFIX . '/' . (int)$m[1]);
    if (preg_match('/^\d{1,9}$/', $ref)) return array('id', ltrim($ref, '0') === '' ? '0' : ltrim($ref, '0'));
    return array('', '');
}
/* Is this checkout one of the pay page's, paid, for real? '' = yes, else why not ('not ours' = leave it alone). */
function pst_session_check($s, $env) {
    if (!is_array($s) || ($s['object'] ?? '') !== 'checkout.session') return 'not ours';
    if ((string)($s['metadata']['shop'] ?? '') === '1') return 'not ours';            // the shop books its own
    if ((string)($s['payment_link'] ?? '') === '') return 'not ours';                 // only the pay page's Payment Link
    if (($s['status'] ?? '') !== 'complete') return 'not finished';
    if (($s['payment_status'] ?? '') !== 'paid') return 'not paid yet';
    if (strtolower((string)($s['currency'] ?? '')) !== 'gbp') return 'not in pounds';
    if ((int)($s['amount_total'] ?? 0) <= 0) return 'no amount';
    if (!empty($s['livemode']) !== ($env === 'live')) return 'test';
    return '';
}
/* Can this payment go on this invoice? '' = yes, else why not. $kind 'id' (QuickBooks' own number, typed by nobody) only
   when the amount is exactly what the invoice says or still owes - a stray number must never pay a stranger's invoice. */
function pst_invoice_check($inv, $pence, $kind) {
    if (!is_array($inv) || empty($inv['Id'])) return 'no QuickBooks invoice has that number';
    $owed = (int)round(((float)($inv['Balance'] ?? 0)) * 100);
    $total = (int)round(((float)($inv['TotalAmt'] ?? 0)) * 100);
    if ($owed <= 0) return 'that invoice is already paid in QuickBooks - check this isn\'t a second payment';
    if ($pence > $owed) return 'they paid ' . pl_money($pence / 100) . ' but the invoice only owes ' . pl_money($owed / 100);
    if ($kind === 'id' && $pence !== $owed && $pence !== $total) return 'the amount doesn\'t match that invoice';
    return '';
}
/* The day it was paid, as the business counts days. */
function pst_day($ts) { return (new DateTime('@' . (int)$ts))->setTimezone(new DateTimeZone('Europe/London'))->format('Y-m-d'); }
/* The QuickBooks Payment: against the one invoice, into the account Stripe pays into. */
function pst_payment_body($inv, $pence, $deposit, $s) {
    $amt = round($pence / 100, 2);
    $pi = is_array($s['payment_intent'] ?? null) ? (string)($s['payment_intent']['id'] ?? '') : (string)($s['payment_intent'] ?? '');
    return array(
        'CustomerRef' => array('value' => (string)$inv['CustomerRef']['value']),
        'TotalAmt' => $amt,
        'TxnDate' => pst_day($s['created'] ?? time()),
        'DepositToAccountRef' => array('value' => (string)$deposit),
        'PaymentRefNum' => substr($pi !== '' ? $pi : (string)$s['id'], 0, 21),
        'PrivateNote' => 'Paid by card through Stripe on the 365techies.co.uk pay page - payment ' . ($pi !== '' ? $pi : '?')
            . ', checkout ' . (string)$s['id'] . '. Recorded automatically by the website.',
        'Line' => array(array('Amount' => $amt, 'LinkedTxn' => array(array('TxnId' => (string)$inv['Id'], 'TxnType' => 'Invoice')))),
    );
}
function pst_who($s, $inv = null) {
    $n = is_array($inv) ? trim((string)($inv['CustomerRef']['name'] ?? '')) : '';
    if ($n === '') $n = trim((string)($s['customer_details']['name'] ?? ''));
    return $n !== '' ? $n : 'someone';
}
function pst_inv_label($inv) {
    $doc = trim((string)($inv['DocNumber'] ?? ''));
    return $doc !== '' ? $doc : 'id ' . (string)($inv['Id'] ?? '?');
}
function pst_paid_text($s, $inv, $pence) {
    $owedAfter = round((float)($inv['Balance'] ?? 0) - $pence / 100, 2);
    return '💳 *Paid by card:* ' . pl_money($pence / 100) . ' from ' . pst_who($s, $inv) . ' on the pay page (Stripe). '
        . 'QuickBooks invoice *' . pst_inv_label($inv) . '* is marked paid automatically'
        . ($owedAfter > 0.004 ? ' - part payment, ' . pl_money($owedAfter) . ' still owed.' : ' - nothing to do.');
}
function pst_flag_text($s, $ref, $why) {
    $pence = (int)($s['amount_total'] ?? 0);
    return '💳 *Card payment needs a look:* ' . pl_money($pence / 100) . ' from ' . pst_who($s) . ' on the pay page (Stripe), reference '
        . ($ref !== '' ? '`' . $ref . '`' : '_none_') . '. I couldn\'t mark a QuickBooks invoice paid: ' . $why
        . '. The money is safe in Stripe - please record it against the right invoice in QuickBooks by hand (Receive payment, '
        . 'deposit to the Stripe account).';
}

/* ---- the part that talks to Stripe, QuickBooks and Slack ---------------------------------------------------------------- */

/* What we already know about a checkout: null | array(state done|flagged|claim|retry, at, tries, ...) */
function pst_seen($sid) {
    $d = pl_store_read(PLQ_STORE);
    return isset($d['stripe'][$sid]) && is_array($d['stripe'][$sid]) ? $d['stripe'][$sid] : null;
}
/* Write what happened to a checkout. $claim: only if nobody else holds it (returns false if they do, or it is finished). */
function pst_note($sid, $rec, $claim = false) {
    $r = pl_store_locked(PLQ_STORE, function ($data) use ($sid, $rec, $claim) {
        $had = isset($data['stripe'][$sid]) && is_array($data['stripe'][$sid]) ? $data['stripe'][$sid] : null;
        if ($claim && $had) {
            $st = (string)($had['state'] ?? '');
            if ($st === 'done' || $st === 'flagged') return array('ok' => false, 'error' => 'finished');
            if ($st === 'claim' && (int)($had['at'] ?? 0) > time() - 600) return array('ok' => false, 'error' => 'held');
        }
        if (!isset($data['stripe']) || !is_array($data['stripe'])) $data['stripe'] = array();
        $rec['tries'] = (int)($had['tries'] ?? 0) + ($claim ? 1 : 0);
        $rec['at'] = time();
        $data['stripe'][$sid] = $rec + (array)$had;
        if (count($data['stripe']) > PST_KEEP) $data['stripe'] = array_slice($data['stripe'], -PST_KEEP, null, true);
        return array('ok' => true, 'data' => $data);
    });
    return !empty($r['ok']);
}
/* The pay-link row this checkout came from (same reference, same amount), if there is one. */
function pst_link_row($ref, $pence) {
    if ($ref === '') return null;
    $d = pl_store_read(PLQ_STORE);
    foreach (array_reverse((array)$d['links']) as $row) {
        if ((string)($row['kind'] ?? '') !== 'page' || pst_ref_clean($row['ref'] ?? '') !== $ref) continue;
        if ((int)round(((float)($row['amount'] ?? 0)) * 100) !== $pence) continue;
        return $row;
    }
    return null;
}
/* The QuickBooks invoice for a reference -> array(invoice|null, kind, why-if-it-could-not-ask) */
function pst_find_invoice($c, $ref, $row) {
    $byId = function ($id) use ($c) {
        $res = invq_api($c, 'GET', '/invoice/' . rawurlencode((string)$id));
        if (qbo_lib_ok($res) && !empty($res['json']['Invoice']['Id'])) return array($res['json']['Invoice'], '');
        return array(null, ((int)($res['code'] ?? 0) === 400 || (int)($res['code'] ?? 0) === 404) ? '' : invq_why($res));
    };
    if ($row && !empty($row['inv_id'])) {               // the console knew the invoice when it made the link
        list($inv, $why) = $byId($row['inv_id']);
        if ($inv || $why !== '') return array($inv, 'doc', $why);
    }
    list($kind, $val) = pst_ref_kind($ref);
    if ($kind === 'doc') {
        $res = invq_api($c, 'GET', '/query?query=' . rawurlencode("select * from Invoice where DocNumber = '" . qbo_lib_qesc($val) . "'"));
        if (!qbo_lib_ok($res)) return array(null, 'doc', invq_why($res));
        $list = (array)($res['json']['QueryResponse']['Invoice'] ?? array());
        if (count($list) > 1) return array(null, 'doc', 'two QuickBooks invoices are numbered ' . $val);
        return array($list ? $list[0] : null, 'doc', '');
    }
    if ($kind === 'id') { list($inv, $why) = $byId($val); return array($inv, 'id', $why); }
    return array(null, '', '');
}
/* Is this checkout already on the invoice? A run that died after QuickBooks took the payment (or a 5xx that QuickBooks had
   in fact saved) must not record it a second time: the invoice's own payments are read and their note searched for the
   checkout id. -> the QuickBooks payment id | '' (not there) | null (couldn't ask - try again later) */
function pst_already_on($c, $inv, $sid) {
    foreach ((array)($inv['LinkedTxn'] ?? array()) as $lt) {
        if (!is_array($lt) || ($lt['TxnType'] ?? '') !== 'Payment' || empty($lt['TxnId'])) continue;
        $res = invq_api($c, 'GET', '/payment/' . rawurlencode((string)$lt['TxnId']));
        if (!qbo_lib_ok($res)) return null;
        if (strpos((string)($res['json']['Payment']['PrivateNote'] ?? ''), $sid) !== false) return (string)$lt['TxnId'];
    }
    return '';
}
/* One checkout, from start to finish. $s: the checkout as Stripe's event or list gave it (only its id is believed).
   -> array(what: ignored|already|held|done|flagged|retry, detail) */
function pst_handle($cr, $sid, $via = 'cron') {
    list($code, $s) = st_api($cr, 'GET', '/v1/checkout/sessions/' . rawurlencode($sid));
    if ($code !== 200 || !is_array($s)) { pst_log($via . ' ' . $sid . ' could not read it back (http ' . $code . ')'); return array('retry', 'stripe http ' . $code); }
    $bad = pst_session_check($s, $cr['env']);
    if ($bad !== '') return array('ignored', $bad);
    $pence = (int)$s['amount_total']; $ref = pst_ref_of($s);
    if (!pst_note($sid, array('state' => 'claim', 'ref' => $ref, 'pence' => $pence, 'via' => $via), true)) return array('already', '');

    $retry = function ($why) use ($sid, $s, $ref) {
        $seen = pst_seen($sid);
        if ((int)($seen['tries'] ?? 0) >= PST_MAX_TRIES) {
            pst_note($sid, array('state' => 'flagged', 'why' => $why));
            plq_slack(pst_flag_text($s, $ref, $why . ' (tried ' . PST_MAX_TRIES . ' times)'));
            pst_log($sid . ' flagged after tries: ' . $why);
            return array('flagged', $why);
        }
        pst_note($sid, array('state' => 'retry', 'why' => $why));
        pst_log($sid . ' will try again: ' . $why);
        return array('retry', $why);
    };
    $flag = function ($why) use ($sid, $s, $ref) {
        pst_note($sid, array('state' => 'flagged', 'why' => $why));
        plq_slack(pst_flag_text($s, $ref, $why));
        pst_log($sid . ' flagged: ' . $why);
        return array('flagged', $why);
    };

    $c = invq_connect();
    if (empty($c['ok'])) {
        $w = (string)($c['why'] ?? '');
        return $w === 'busy' ? $retry('QuickBooks was busy') : $flag('the website isn\'t connected to QuickBooks (' . $w . ')');
    }
    if (($g = shop_qbo_gate($c)) !== '') return $flag($g);
    $q = (array)(shop_read()['qbo'] ?? array());
    $deposit = (string)($q['deposit_card'] ?? '');
    if ($deposit === '' || (!empty($q['realm']) && (string)$q['realm'] !== (string)$c['realm']))
        return $flag('the account Stripe pays into isn\'t chosen yet (portal: shop books, "card sales are paid into")');
    if ($ref === '') return $flag('there was no invoice number on it');

    $row = pst_link_row($ref, $pence);
    list($inv, $kind, $why) = pst_find_invoice($c, $ref, $row);
    if ($why !== '' && !$inv) return (strpos($why, 'two QuickBooks') === 0) ? $flag($why) : $retry('QuickBooks didn\'t answer (' . $why . ')');
    if ($kind === '') return $flag('the reference isn\'t an invoice number');
    $was = $inv ? pst_already_on($c, $inv, $sid) : '';
    if ($was === null) return $retry('QuickBooks didn\'t answer about the invoice\'s payments');
    if ($was !== '') {   // recorded by an earlier run that never got to write it down
        pst_note($sid, array('state' => 'done', 'qbo_payment' => $was, 'invoice' => (string)$inv['Id'], 'doc' => pst_inv_label($inv)));
        pst_log($via . ' ' . $sid . ' was already on invoice ' . pst_inv_label($inv) . ' (payment ' . $was . ')');
        return array('done', $was);
    }
    $bad = pst_invoice_check($inv, $pence, $kind);
    if ($bad !== '') return $flag($bad);

    $res = invq_api($c, 'POST', '/payment', pst_payment_body($inv, $pence, $deposit, $s));
    if (!qbo_lib_ok($res) || empty($res['json']['Payment']['Id'])) {
        $code = (int)($res['code'] ?? 0);
        return ($code === 0 || $code >= 500) ? $retry('QuickBooks didn\'t answer (' . invq_why($res) . ')') : $flag('QuickBooks refused it: ' . invq_why($res));
    }
    $pid = (string)$res['json']['Payment']['Id'];
    pst_note($sid, array('state' => 'done', 'qbo_payment' => $pid, 'invoice' => (string)$inv['Id'], 'doc' => pst_inv_label($inv)));
    if ($row) {   // the console's row shows "paid" from now on
        $rid = (string)$row['id'];
        pl_store_locked(PLQ_STORE, function ($data) use ($rid) {
            foreach ($data['links'] as $i => $r) if ((string)($r['id'] ?? '') === $rid) { $data['links'][$i]['status'] = 'paid'; $data['links'][$i]['paid_at'] = time(); $data['links'][$i]['paid_by'] = 'card'; }
            return array('ok' => true, 'data' => $data);
        });
    }
    plq_slack(pst_paid_text($s, $inv, $pence));
    pst_log($via . ' ' . $sid . ' ' . pl_money($pence / 100) . ' -> QuickBooks payment ' . $pid . ' on invoice ' . pst_inv_label($inv));
    return array('done', $pid);
}
/* tm-cron.php: every PST_SWEEP_EVERY seconds, the pay page's paid checkouts of the last PST_SWEEP_DAYS days that nothing has
   finished with yet. No Stripe key on the server = a clean no-op. */
function pst_sweep($now = null) {
    $now = $now === null ? time() : (int)$now;
    $cr = st_creds();
    if (!$cr) return array('skipped' => 'no stripe key');
    $d = pl_store_read(PLQ_STORE);
    if ((int)($d['stripe_swept'] ?? 0) > $now - PST_SWEEP_EVERY) return array('skipped' => 'recent');
    pl_store_locked(PLQ_STORE, function ($data) use ($now) { $data['stripe_swept'] = $now; return array('ok' => true, 'data' => $data); });
    list($code, $list) = st_api($cr, 'GET', '/v1/checkout/sessions', array('limit' => 40, 'status' => 'complete', 'created' => array('gte' => $now - PST_SWEEP_DAYS * 86400)));
    if ($code !== 200 || !is_array($list)) { pst_log('sweep: list failed http ' . $code . ' ' . st_why($list)); return array('error' => 'stripe http ' . $code); }
    $out = array(); $n = 0;
    foreach ((array)($list['data'] ?? array()) as $s) {
        if (pst_session_check($s, $cr['env']) !== '') continue;
        $sid = (string)($s['id'] ?? '');
        if (!preg_match('/^cs_(?:live|test)_[A-Za-z0-9]{10,200}$/', $sid)) continue;
        $seen = $d['stripe'][$sid] ?? null;
        if (is_array($seen) && in_array((string)($seen['state'] ?? ''), array('done', 'flagged'), true)) continue;
        if (++$n > PST_MAX_PER_TICK) break;
        $out[$sid] = pst_handle($cr, $sid, 'cron')[0];
    }
    return array('handled' => $out);
}
