<?php
/*
 * The pay page's PayPal button, with the invoice on it (19 Oct 2026). Owner: "can PayPal payments mark the invoice paid
 * automatically too?"
 *
 * PayPal.Me (the pay page's PayPal button since July 2026) carries no reference, so a payment made there can't be matched
 * to an invoice. When the page has a pay link's reference (/pay/?amount=60.00&ref=4905-816), its PayPal button now asks
 * pay-pp.php for a PayPal ORDER instead - the amount, the reference in custom_id, "365 Techies - invoice 4905/816" as what
 * PayPal's page says it is for - through the same PayPal app as the shop and "Unlock everything" (pcm-paypal-key.php).
 * The customer approves on PayPal's page (their PayPal account, or usually a card as a guest) and comes back to
 * /pay/?ppdone=1&token=<order>, which asks pay-pp.php to take the payment (capture). A completed capture is booked against
 * the QuickBooks invoice by pst_book (pcm-paystripe-lib.php) - into the account PayPal pays into (the shop's 'deposit') -
 * and Slack is told, exactly as a card payment is.
 *   - Only orders WE made are captured or booked (pcm-paylink.json 'pp' => order id => amount, reference, state), and only
 *     when PayPal's copy of the order still says our amount and our reference.
 *   - Never booked twice (pst_book's claim, and the order id in the note on the invoice's payments), never more than the
 *     invoice owes, a bare QuickBooks id only for the exact amount (pst_invoice_check).
 *   - Insurance: PayPal's webhook (pcm-plus-pp.php: PAYMENT.CAPTURE.COMPLETED) and tm-cron.php (every 10 minutes, our orders
 *     of the last 3 days that aren't finished): an order approved but never brought back - "Pay Now" pressed, then the tab
 *     closed - is captured then, and a capture PayPal was still checking is booked once it completes.
 *   - No PayPal keys on the server, or PayPal refuses: the button goes to PayPal.Me, as before (marked paid by hand).
 *   - Sandbox keys: works end to end with PayPal's pretend money and never reaches QuickBooks.
 * Include-only (.htaccess). NO closing tag in this file.
 */
require_once __DIR__ . '/pcm-paystripe-lib.php';   // pst_book, pst_ref_clean, pst_ref_kind, pl_store_*, PLQ_STORE, plq_log
require_once __DIR__ . '/pcm-plus-pp-lib.php';     // pp_creds, pp_api, pp_why

define('PPAY_MIN', 1.00);
define('PPAY_MAX', 5000.00);        // a typo ceiling, as the card link's (Stripe's is £5,000 too)
define('PPAY_KEEP_DAYS', 30);       // orders remembered
define('PPAY_SWEEP_DAYS', 3);       // how far back the cron looks
define('PPAY_GRACE', 600);          // an order this new may still be on PayPal's page: the cron leaves it to the customer
define('PPAY_EXPIRE', 3 * 3600);    // never approved after this: PayPal has let it go
define('PPAY_MAX_PER_TICK', 3);
define('PPAY_SITE', 'https://365techies.co.uk');

function ppay_log($m) { plq_log('paypal ' . $m); }
function ppay_order_id($v) { $v = (string)$v; return preg_match('/^[A-Z0-9]{10,30}$/', $v) ? $v : ''; }

/* ---- the pure part (pay-pp-test.php) ---------------------------------------------------------------------------------- */
/* "60" / "60.5" -> "60.00", or '' when it isn't an amount we'd ask PayPal for */
function ppay_amount($v) {
    $v = trim((string)$v);
    if (!preg_match('/^\d{1,5}(\.\d{1,2})?$/', $v)) return '';
    $a = (float)$v;
    return ($a >= PPAY_MIN && $a <= PPAY_MAX) ? number_format($a, 2, '.', '') : '';
}
/* What PayPal's page says the payment is for */
function ppay_desc($ref) {
    if ($ref === '') return '365 Techies - payment';
    list($kind, $val) = pst_ref_kind($ref);
    return $kind === 'doc' ? '365 Techies - invoice ' . $val : '365 Techies - reference ' . $ref;
}
/* The order we ask PayPal for: our amount, the reference, no delivery address, "Pay Now", and back to the pay page. */
function ppay_order_body($amount, $ref, $now) {
    return array('intent' => 'CAPTURE',
        'purchase_units' => array(array('reference_id' => 'pay', 'custom_id' => 'pay:' . $ref,
            // unique per payment (PayPal can refuse a repeated invoice_id): the reference, the day, a little randomness
            'invoice_id' => 'PAY-' . ($ref !== '' ? $ref : 'WEB') . '-' . gmdate('ymd', $now) . '-' . strtoupper(bin2hex(random_bytes(3))),
            'description' => ppay_desc($ref),
            'amount' => array('currency_code' => 'GBP', 'value' => $amount))),
        'application_context' => array('brand_name' => '365 Techies', 'shipping_preference' => 'NO_SHIPPING', 'user_action' => 'PAY_NOW',
            'locale' => 'en-GB', 'return_url' => PPAY_SITE . '/pay/?ppdone=1',
            'cancel_url' => PPAY_SITE . '/pay/?amount=' . $amount . ($ref !== '' ? '&ref=' . $ref : '')));
}
/* PayPal's page for the customer, and nowhere else */
function ppay_approve_link($j) {
    foreach ((array)($j['links'] ?? array()) as $l) {
        if (!in_array((string)($l['rel'] ?? ''), array('approve', 'payer-action'), true)) continue;
        $h = (string)($l['href'] ?? '');
        if (preg_match('#^https://www\.(?:sandbox\.)?paypal\.com/#', $h)) return $h;
    }
    return '';
}
/* Is PayPal's copy of the order still the one we made? */
function ppay_order_matches($j, $o) {
    $pu = $j['purchase_units'][0] ?? array();
    return (string)($pu['custom_id'] ?? '') === 'pay:' . (string)$o['ref']
        && (string)($pu['amount']['currency_code'] ?? '') === 'GBP'
        && abs((float)($pu['amount']['value'] ?? 0) - (float)$o['amt']) < 0.001;
}
/* A completed PayPal capture -> the payment pst_book books */
function ppay_pay($oid, $o, $j, $cap) {
    $capId = (string)($cap['id'] ?? '');
    $payer = (array)($j['payer'] ?? array());
    $when = strtotime((string)($cap['create_time'] ?? ''));
    return array('key' => 'pp:' . $oid, 'prov' => 'paypal', 'pence' => (int)round(((float)($cap['amount']['value'] ?? 0)) * 100),
        'ref' => (string)$o['ref'], 'who' => trim((string)($payer['name']['given_name'] ?? '') . ' ' . (string)($payer['name']['surname'] ?? '')),
        'email' => pst_email_clean($payer['email_address'] ?? ''),
        'when' => $when ? $when : time(), 'txn' => $capId !== '' ? $capId : $oid, 'mark' => $oid,
        'note' => 'Paid with PayPal on the 365techies.co.uk pay page - capture ' . ($capId !== '' ? $capId : '?') . ', order ' . $oid
            . '. Recorded automatically by the website.');
}

/* ---- our record of the orders we made ---------------------------------------------------------------------------------- */
function ppay_seen($oid) {
    $d = pl_store_read(PLQ_STORE);
    return isset($d['pp'][$oid]) && is_array($d['pp'][$oid]) ? $d['pp'][$oid] : null;
}
function ppay_put($oid, $rec) {
    $r = pl_store_locked(PLQ_STORE, function ($data) use ($oid, $rec) {
        if (!isset($data['pp']) || !is_array($data['pp'])) $data['pp'] = array();
        $had = isset($data['pp'][$oid]) && is_array($data['pp'][$oid]) ? $data['pp'][$oid] : array();
        $data['pp'][$oid] = $rec + $had;
        $cut = time() - PPAY_KEEP_DAYS * 86400;
        foreach ($data['pp'] as $k => $o) if ((int)($o['at'] ?? 0) < $cut) unset($data['pp'][$k]);
        return array('ok' => true, 'data' => $data);
    });
    return !empty($r['ok']);
}

/* ---- talking to PayPal ------------------------------------------------------------------------------------------------- */
/* The PayPal button: an order for this amount and reference. -> array(ok, PayPal's page | error)
   errors: bad_amount | paypal_failed | busy
   23 Oct 2026: a payment with no reference (the plain pay page, nothing typed in the invoice-number box) is an order too,
   not PayPal.Me, so it reaches the server: pst_book then matches it by the payer's email (pst_email_pick) or asks a person. */
function ppay_start($cr, $amount, $ref, $now = null) {
    $now = $now === null ? time() : (int)$now;
    $amount = ppay_amount($amount); $ref = pst_ref_clean($ref);
    if ($amount === '') return array(false, 'bad_amount');
    list($c, $j) = pp_api($cr, 'POST', '/v2/checkout/orders', ppay_order_body($amount, $ref, $now), array('PayPal-Request-Id: pay-' . bin2hex(random_bytes(8))));
    $oid = ppay_order_id($j['id'] ?? ''); $url = ppay_approve_link($j);
    if (($c !== 200 && $c !== 201) || $oid === '' || $url === '') { ppay_log('start FAILED http ' . $c . ' ' . pp_why($j)); return array(false, 'paypal_failed'); }
    if (!ppay_put($oid, array('at' => $now, 'amt' => $amount, 'ref' => $ref, 'env' => (string)$cr['env'], 'st' => 'open'))) return array(false, 'busy');
    ppay_log('order ' . $oid . ' ' . $amount . ' ref ' . $ref);
    return array(true, $url);
}
/* Take and book the payment on one of our orders: the page (back from PayPal), PayPal's webhook and the cron all come here.
   -> array(state, array(amount, ref[, why]))   state: paid | pending | declined | open | gone | refused | busy
   ("paid" is what the customer is told once PayPal has the money, whatever QuickBooks then says - pst_book tells Slack.) */
function ppay_finish($cr, $oid, $via = 'page', $now = null) {
    $now = $now === null ? time() : (int)$now;
    $oid = ppay_order_id($oid);
    $o = $oid !== '' ? ppay_seen($oid) : null;
    if (!$o) return array('refused', array('amount' => '', 'ref' => '', 'why' => 'not an order we made'));
    $info = array('amount' => (string)$o['amt'], 'ref' => (string)$o['ref']);
    $st0 = (string)($o['st'] ?? '');
    if ($st0 === 'finished' || $st0 === 'test') return array('paid', $info);
    if ($st0 === 'gone') return array('gone', $info);
    if ($st0 === 'declined') return array('declined', $info);

    list($c, $j) = pp_api($cr, 'GET', '/v2/checkout/orders/' . $oid);
    if ($c === 404) { ppay_put($oid, array('st' => 'gone')); return array('gone', $info); }
    if ($c !== 200 || !is_array($j)) return array('busy', $info);
    if (!ppay_order_matches($j, $o)) { ppay_log($via . ' ' . $oid . ' REFUSED: PayPal\'s order is not the one we made'); return array('refused', $info + array('why' => 'the order is not the one we made')); }
    $st = strtoupper((string)($j['status'] ?? ''));
    if ($st === 'APPROVED') {   // the customer pressed "Pay Now": take it
        list($c2, $j2) = pp_api($cr, 'POST', '/v2/checkout/orders/' . $oid . '/capture', '{}', array('Prefer: return=representation', 'PayPal-Request-Id: pay-cap-' . $oid));
        $raw2 = (string)json_encode($j2);
        if ($c2 === 422 && strpos($raw2, 'ORDER_ALREADY_CAPTURED') !== false) list($c2, $j2) = pp_api($cr, 'GET', '/v2/checkout/orders/' . $oid);
        elseif ($c2 === 422 && strpos($raw2, 'INSTRUMENT_DECLINED') !== false) { ppay_put($oid, array('st' => 'declined')); ppay_log($via . ' ' . $oid . ' declined'); return array('declined', $info); }
        if ($c2 < 200 || $c2 >= 300 || !is_array($j2)) { ppay_log($via . ' ' . $oid . ' capture FAILED http ' . $c2 . ' ' . pp_why($j2)); return array('busy', $info); }
        $j = $j2; $st = strtoupper((string)($j['status'] ?? ''));
    }
    if ($st === 'CREATED' || $st === 'SAVED' || $st === 'PAYER_ACTION_REQUIRED') {
        if ((int)($o['at'] ?? 0) < $now - PPAY_EXPIRE) { ppay_put($oid, array('st' => 'gone')); return array('gone', $info); }
        return array('open', $info);
    }
    if ($st === 'VOIDED') { ppay_put($oid, array('st' => 'gone')); return array('gone', $info); }
    $cap = $j['purchase_units'][0]['payments']['captures'][0] ?? null;
    if (!is_array($cap)) return array('busy', $info);
    $cst = strtoupper((string)($cap['status'] ?? ''));
    if ($cst === 'PENDING') { ppay_put($oid, array('st' => 'pending', 'cap' => (string)($cap['id'] ?? ''))); return array('pending', $info); }
    if ($cst === 'DECLINED' || $cst === 'FAILED') { ppay_put($oid, array('st' => 'declined')); return array('declined', $info); }
    if ($cst !== 'COMPLETED') return array('refused', $info + array('why' => 'payment ' . strtolower($cst !== '' ? $cst : 'missing')));

    // the money is in: book it (PayPal's pretend money never reaches QuickBooks)
    ppay_put($oid, array('st' => 'captured', 'cap' => (string)($cap['id'] ?? '')));
    if ($cr['env'] !== 'live') { ppay_put($oid, array('st' => 'test')); ppay_log($via . ' ' . $oid . ' sandbox payment - not booked'); return array('paid', $info); }
    list($what) = pst_book(ppay_pay($oid, $o, $j, $cap), $via);
    // done, flagged (Slack has told a person) or already (another run has it): finished here. retry: the cron comes back.
    if ($what !== 'retry') ppay_put($oid, array('st' => 'finished', 'booked' => $what));
    return array('paid', $info);
}
/* tm-cron.php: every 10 minutes, our orders of the last PPAY_SWEEP_DAYS days that aren't finished (after PPAY_GRACE for a
   new one). No PayPal keys = a clean no-op. */
function ppay_sweep($now = null) {
    $now = $now === null ? time() : (int)$now;
    $cr = pp_creds();
    if (!$cr) return array('skipped' => 'no paypal key');
    $d = pl_store_read(PLQ_STORE);
    if ((int)($d['pp_swept'] ?? 0) > $now - PST_SWEEP_EVERY) return array('skipped' => 'recent');
    pl_store_locked(PLQ_STORE, function ($data) use ($now) { $data['pp_swept'] = $now; return array('ok' => true, 'data' => $data); });
    $out = array(); $n = 0;
    foreach ((array)($d['pp'] ?? array()) as $oid => $o) {
        $st = (string)($o['st'] ?? ''); $at = (int)($o['at'] ?? 0);
        if (!in_array($st, array('open', 'captured', 'pending'), true) || $at < $now - PPAY_SWEEP_DAYS * 86400) continue;
        if ($st === 'open' && $at > $now - PPAY_GRACE) continue;
        if (++$n > PPAY_MAX_PER_TICK) break;
        $out[(string)$oid] = ppay_finish($cr, (string)$oid, 'cron', $now)[0];
    }
    return array('handled' => $out);
}
