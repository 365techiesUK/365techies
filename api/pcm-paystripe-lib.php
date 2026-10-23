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
 * 19 Oct 2026, later (owner: "can PayPal payments mark the invoice paid automatically too?"): pst_book() is the booking for
 * both - pay-pp-lib.php hands it the pay page's PayPal payments (into the shop's 'deposit' account, the one PayPal pays into).
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
/* Slack: the pay links' webhook (slack-webhook-jobs.php), else the portal's bot into #daily-jobs-in-jobs-out, beside the
   job's "Quote agreed" card - that webhook has answered 302 since 28 Sep 2026; the bot posts there fine (Hanna's "Paid by
   card", 19 Oct 18:45). Same channel as pcm-jobs.php's cards ($SLACK_JOBS_CHANNEL in pcm-slack-bot.php overrides). */
function pst_slack($text) {
    if (plq_slack($text)) return true;
    require_once __DIR__ . '/pcm-slack-lib.php';
    $f = __DIR__ . '/pcm-slack-bot.php';
    $raw = is_file($f) ? (string)@file_get_contents($f) : '';
    $chan = preg_match('/\$SLACK_JOBS_CHANNEL\s*=\s*[\'"]([A-Z0-9]{8,14})[\'"]/', $raw, $m) ? $m[1] : 'C0BS3BVP48J';   // #daily-jobs-in-jobs-out
    $r = slk_call('chat.postMessage', array('channel' => $chan, 'text' => $text, 'unfurl_links' => false), 8);
    if (empty($r['ok'])) pst_log('slack: the webhook and the bot both refused (' . (string)($r['error'] ?? '') . ')');
    return !empty($r['ok']);
}

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
    if ($kind === 'email' && $pence !== $owed) return 'the amount isn\'t exactly what that invoice owes';
    return '';
}
/* 23 Oct 2026 (owner: "PayPal payments ... are going to be basically from the same email address. So maybe it could be
   matched up with the person's email address"). A payment with no usable invoice number is matched by the payer's email
   instead - only when exactly ONE open invoice for that email owes exactly what was paid. Anything less certain stays a
   Slack "needs a look", which now names the open invoices that email has. */
function pst_email_clean($e) { $e = strtolower(trim((string)$e)); return filter_var($e, FILTER_VALIDATE_EMAIL) ? $e : ''; }
/* $open = QuickBooks invoices with a balance; $cids = the QuickBooks customers whose own email it is.
   -> array(the invoice | null, why not) */
function pst_email_pick($open, $cids, $email, $pence) {
    $email = pst_email_clean($email);
    if ($email === '') return array(null, 'the payer\'s email wasn\'t there to match it by');
    $mine = array();
    foreach ((array)$open as $inv) {
        if (!is_array($inv) || empty($inv['Id']) || (float)($inv['Balance'] ?? 0) <= 0) continue;
        $cid = (string)($inv['CustomerRef']['value'] ?? '');
        if (pst_email_clean($inv['BillEmail']['Address'] ?? '') === $email || ($cid !== '' && in_array($cid, (array)$cids, true))) $mine[] = $inv;
    }
    if (!$mine) return array(null, 'no open invoice has their email (' . $email . ')');
    $exact = array_values(array_filter($mine, function ($inv) use ($pence) { return (int)round(((float)$inv['Balance']) * 100) === (int)$pence; }));
    if (count($exact) === 1) return array($exact[0], '');
    $list = implode(', ', array_map(function ($inv) { return pst_inv_label($inv) . ' (' . pl_money((float)$inv['Balance']) . ' owed)'; }, array_slice($mine, 0, 4)));
    if ($exact) return array(null, 'their email (' . $email . ') has ' . count($exact) . ' open invoices for exactly that amount: ' . $list);
    return array(null, 'their email (' . $email . ') has open invoice' . (count($mine) === 1 ? ' ' : 's ') . $list . ', but none owes exactly ' . pl_money($pence / 100));
}
/* The day it was paid, as the business counts days. */
function pst_day($ts) { return (new DateTime('@' . (int)$ts))->setTimezone(new DateTimeZone('Europe/London'))->format('Y-m-d'); }
/* A payment to book, whoever took it: array(key: our store's key for it, prov: stripe|paypal, pence, ref, who: the payer's
   name as the provider has it, when: unix time paid, txn: the provider's payment id, mark: an id that is written into the
   QuickBooks note and looked for there before booking again, note: that note). */
function pst_prov($pay) { return ($pay['prov'] ?? '') === 'paypal' ? 'PayPal' : 'Stripe'; }
/* A paid Stripe checkout -> the payment to book */
function pst_stripe_pay($s) {
    $pi = is_array($s['payment_intent'] ?? null) ? (string)($s['payment_intent']['id'] ?? '') : (string)($s['payment_intent'] ?? '');
    $sid = (string)($s['id'] ?? '');
    return array('key' => $sid, 'prov' => 'stripe', 'pence' => (int)($s['amount_total'] ?? 0), 'ref' => pst_ref_of($s),
        'who' => trim((string)($s['customer_details']['name'] ?? '')), 'email' => pst_email_clean($s['customer_details']['email'] ?? ''),
        'when' => (int)($s['created'] ?? time()), 'txn' => $pi !== '' ? $pi : $sid, 'mark' => $sid,
        'note' => 'Paid by card through Stripe on the 365techies.co.uk pay page - payment ' . ($pi !== '' ? $pi : '?')
            . ', checkout ' . $sid . '. Recorded automatically by the website.');
}
/* The QuickBooks Payment: against the one invoice, into the account the provider pays into. */
function pst_payment_body($inv, $pence, $deposit, $pay) {
    $amt = round($pence / 100, 2);
    return array(
        'CustomerRef' => array('value' => (string)$inv['CustomerRef']['value']),
        'TotalAmt' => $amt,
        'TxnDate' => pst_day($pay['when'] ?? time()),
        'DepositToAccountRef' => array('value' => (string)$deposit),
        'PaymentRefNum' => substr((string)$pay['txn'], 0, 21),
        'PrivateNote' => (string)$pay['note'],
        'Line' => array(array('Amount' => $amt, 'LinkedTxn' => array(array('TxnId' => (string)$inv['Id'], 'TxnType' => 'Invoice')))),
    );
}
function pst_who($pay, $inv = null) {
    $n = is_array($inv) ? trim((string)($inv['CustomerRef']['name'] ?? '')) : '';
    if ($n === '') $n = trim((string)($pay['who'] ?? ''));
    return $n !== '' ? $n : 'someone';
}
function pst_inv_label($inv) {
    $doc = trim((string)($inv['DocNumber'] ?? ''));
    return $doc !== '' ? $doc : 'id ' . (string)($inv['Id'] ?? '?');
}
function pst_paid_text($pay, $inv) {
    $pence = (int)$pay['pence'];
    $owedAfter = round((float)($inv['Balance'] ?? 0) - $pence / 100, 2);
    $head = ($pay['prov'] ?? '') === 'paypal' ? '💰 *Paid with PayPal:* ' : '💳 *Paid by card:* ';
    return $head . pl_money($pence / 100) . ' from ' . pst_who($pay, $inv) . ' on the pay page (' . pst_prov($pay) . '). '
        . 'QuickBooks invoice *' . pst_inv_label($inv) . '* is marked paid automatically'
        . (($pay['matched'] ?? '') === 'email' ? ' (no invoice number on it - matched by their email address)' : '')
        . ($owedAfter > 0.004 ? ' - part payment, ' . pl_money($owedAfter) . ' still owed.' : ' - nothing to do.');
}
function pst_flag_text($pay, $why) {
    $pence = (int)$pay['pence']; $ref = (string)$pay['ref'];
    $head = ($pay['prov'] ?? '') === 'paypal' ? '💰 *PayPal payment needs a look:* ' : '💳 *Card payment needs a look:* ';
    return $head . pl_money($pence / 100) . ' from ' . pst_who($pay) . ' on the pay page (' . pst_prov($pay) . '), reference '
        . ($ref !== '' ? '`' . $ref . '`' : '_none_') . '. I couldn\'t mark a QuickBooks invoice paid: ' . $why
        . '. The money is safe in ' . pst_prov($pay) . ' - please record it against the right invoice in QuickBooks by hand (Receive payment, '
        . 'deposit to the ' . pst_prov($pay) . ' account).';
}

/* ---- the part that talks to Stripe, QuickBooks and Slack ---------------------------------------------------------------- */

/* What we already know about a payment (a Stripe checkout id, or pp:<PayPal order id> - one map, 'stripe', for both):
   null | array(state done|flagged|claim|retry, at, tries, ...) */
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
/* For pst_email_pick: the open invoices, and the customers whose own email this is (read only).
   -> array(open invoices, customer ids, why-if-it-could-not-ask) */
function pst_email_lookup($c, $email) {
    $email = pst_email_clean($email);
    if ($email === '') return array(array(), array(), '');
    $res = invq_api($c, 'GET', '/query?query=' . rawurlencode("select * from Invoice where Balance > '0' orderby TxnDate desc maxresults 300"));
    if (!qbo_lib_ok($res)) return array(array(), array(), invq_why($res));
    $cr = invq_api($c, 'GET', '/query?query=' . rawurlencode("select Id from Customer where PrimaryEmailAddr = '" . qbo_lib_qesc($email) . "'"));
    if (!qbo_lib_ok($cr)) return array(array(), array(), invq_why($cr));
    $cids = array();
    foreach ((array)($cr['json']['QueryResponse']['Customer'] ?? array()) as $cu) if (is_array($cu) && !empty($cu['Id'])) $cids[] = (string)$cu['Id'];
    return array((array)($res['json']['QueryResponse']['Invoice'] ?? array()), $cids, '');
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
/* Book one payment against its QuickBooks invoice, from start to finish - Stripe's (pst_handle) and PayPal's
   (pay-pp-lib.php) alike. -> array(what: already|done|flagged|retry, detail) */
function pst_book($pay, $via = 'cron') {
    $key = (string)$pay['key']; $pence = (int)$pay['pence']; $ref = (string)$pay['ref']; $prov = (string)$pay['prov'];
    if (!pst_note($key, array('state' => 'claim', 'prov' => $prov, 'ref' => $ref, 'pence' => $pence, 'via' => $via), true)) return array('already', '');

    $retry = function ($why) use ($key, $pay) {
        $seen = pst_seen($key);
        if ((int)($seen['tries'] ?? 0) >= PST_MAX_TRIES) {
            pst_note($key, array('state' => 'flagged', 'why' => $why));
            pst_slack(pst_flag_text($pay, $why . ' (tried ' . PST_MAX_TRIES . ' times)'));
            pst_log($key . ' flagged after tries: ' . $why);
            return array('flagged', $why);
        }
        pst_note($key, array('state' => 'retry', 'why' => $why));
        pst_log($key . ' will try again: ' . $why);
        return array('retry', $why);
    };
    $flag = function ($why) use ($key, $pay) {
        pst_note($key, array('state' => 'flagged', 'why' => $why));
        pst_slack(pst_flag_text($pay, $why));
        pst_log($key . ' flagged: ' . $why);
        return array('flagged', $why);
    };

    $c = invq_connect();
    if (empty($c['ok'])) {
        $w = (string)($c['why'] ?? '');
        return $w === 'busy' ? $retry('QuickBooks was busy') : $flag('the website isn\'t connected to QuickBooks (' . $w . ')');
    }
    if (($g = shop_qbo_gate($c)) !== '') return $flag($g);
    // the shop's QuickBooks setup says where each provider pays in: 'deposit' (PayPal), 'deposit_card' (Stripe)
    $q = (array)(shop_read()['qbo'] ?? array());
    $deposit = (string)($q[$prov === 'paypal' ? 'deposit' : 'deposit_card'] ?? '');
    if ($deposit === '' || (!empty($q['realm']) && (string)$q['realm'] !== (string)$c['realm']))
        return $flag($prov === 'paypal' ? 'the account PayPal pays into isn\'t chosen yet (portal: shop books)'
                                        : 'the account Stripe pays into isn\'t chosen yet (portal: shop books, "card sales are paid into")');
    $row = null; $inv = null; $kind = '';
    if ($ref !== '') {
        $row = pst_link_row($ref, $pence);
        list($inv, $kind, $why) = pst_find_invoice($c, $ref, $row);
        if ($why !== '' && !$inv) return (strpos($why, 'two QuickBooks') === 0) ? $flag($why) : $retry('QuickBooks didn\'t answer (' . $why . ')');
    }
    if (!$inv) {   // no usable invoice number: the payer's email, if it points at exactly one invoice owing exactly this
        $why0 = $ref === '' ? 'there was no invoice number on it' : ($kind === '' ? 'the reference isn\'t an invoice number' : 'no QuickBooks invoice has that number');
        $email = pst_email_clean($pay['email'] ?? '');
        list($open, $cids, $qwhy) = pst_email_lookup($c, $email);
        if ($qwhy !== '') return $retry('QuickBooks didn\'t answer (' . $qwhy . ')');
        list($inv, $ewhy) = pst_email_pick($open, $cids, $email, $pence);
        if (!$inv) return $flag($why0 . ', and ' . $ewhy);
        $kind = 'email'; $pay['matched'] = 'email';
        $pay['note'] = (string)$pay['note'] . ' No invoice number on it: matched to this invoice by the payer\'s email (' . $email . ').';
    }
    $was = $inv ? pst_already_on($c, $inv, (string)$pay['mark']) : '';
    if ($was === null) return $retry('QuickBooks didn\'t answer about the invoice\'s payments');
    if ($was !== '') {   // recorded by an earlier run that never got to write it down
        pst_note($key, array('state' => 'done', 'qbo_payment' => $was, 'invoice' => (string)$inv['Id'], 'doc' => pst_inv_label($inv)));
        pst_log($via . ' ' . $key . ' was already on invoice ' . pst_inv_label($inv) . ' (payment ' . $was . ')');
        return array('done', $was);
    }
    $bad = pst_invoice_check($inv, $pence, $kind);
    if ($bad !== '') return $flag($bad);

    $res = invq_api($c, 'POST', '/payment', pst_payment_body($inv, $pence, $deposit, $pay));
    if (!qbo_lib_ok($res) || empty($res['json']['Payment']['Id'])) {
        $code = (int)($res['code'] ?? 0);
        return ($code === 0 || $code >= 500) ? $retry('QuickBooks didn\'t answer (' . invq_why($res) . ')') : $flag('QuickBooks refused it: ' . invq_why($res));
    }
    $pid = (string)$res['json']['Payment']['Id'];
    pst_note($key, array('state' => 'done', 'qbo_payment' => $pid, 'invoice' => (string)$inv['Id'], 'doc' => pst_inv_label($inv)));
    if ($row) {   // the console's row shows "paid" from now on
        $rid = (string)$row['id']; $by = $prov === 'paypal' ? 'paypal' : 'card';
        pl_store_locked(PLQ_STORE, function ($data) use ($rid, $by) {
            foreach ($data['links'] as $i => $r) if ((string)($r['id'] ?? '') === $rid) { $data['links'][$i]['status'] = 'paid'; $data['links'][$i]['paid_at'] = time(); $data['links'][$i]['paid_by'] = $by; }
            return array('ok' => true, 'data' => $data);
        });
    }
    pst_slack(pst_paid_text($pay, $inv));
    pst_log($via . ' ' . $key . ' ' . pl_money($pence / 100) . ' -> QuickBooks payment ' . $pid . ' on invoice ' . pst_inv_label($inv));
    return array('done', $pid);
}
/* One Stripe checkout. Only its id is believed: it is read back from Stripe.
   -> array(what: ignored|already|done|flagged|retry, detail) */
function pst_handle($cr, $sid, $via = 'cron') {
    list($code, $s) = st_api($cr, 'GET', '/v1/checkout/sessions/' . rawurlencode($sid));
    if ($code !== 200 || !is_array($s)) { pst_log($via . ' ' . $sid . ' could not read it back (http ' . $code . ')'); return array('retry', 'stripe http ' . $code); }
    $bad = pst_session_check($s, $cr['env']);
    if ($bad !== '') return array('ignored', $bad);
    return pst_book(pst_stripe_pay($s), $via);
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
