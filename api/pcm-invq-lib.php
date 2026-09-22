<?php
/*
 * "Invoices waiting for your OK" - library half (22 Sep 2026).
 *
 * WHY
 * Invoices were being raised (by the staff console at "Quote agreed", or by hand
 * in QuickBooks) and then not sent, because sending depended on one person
 * remembering. The owner wants the raising automated and the SENDING checked:
 * every invoice with money on it that has not been emailed sits in one queue,
 * shown as the PDF the customer would actually get, with the likely mistakes
 * flagged in red, and leaves only on an explicit "Approve & send".
 *
 * This file is the pure part: which invoices belong in the queue, what to warn
 * about, how a row is shaped, what the morning Slack line says. No network, no
 * files, so pcm-invq-test.php can run it from the CLI. The QuickBooks calls live
 * in pcm-invq-sweep.php; the staff endpoint is pcm-invq.php.
 *
 * QuickBooks has NO draft flag (see qbo_lib_invoice_ready). "Waiting" here means
 * EmailStatus is not EmailSent and there is a balance: the honest definition of
 * "raised but never sent", and it catches hand-raised invoices too.
 *
 * NO closing tag in this file.
 */

define('INVQ_MAX_AMOUNT', 2000.00);   // above this, a second look before it goes
define('INVQ_DUP_DAYS', 7);           // same customer, same amount, within this many days = likely duplicate
define('INVQ_OLD_DAYS', 14);          // raised this long ago and still unsent = something is stuck
define('INVQ_GENERIC_DESC', 'work carried out');   // the console's placeholder line when nobody typed a job

function invq_num($v) { return is_numeric($v) ? (float)$v : 0.0; }
function invq_str($v, $max = 200) {
    $s = trim(preg_replace('/[\x00-\x1F\x7F]+/', ' ', (string)$v));
    return function_exists('mb_substr') ? mb_substr($s, 0, $max) : substr($s, 0, $max);
}
/* Calendar days, the way a person counts them: an invoice dated the 20th is
   "2 days ago" all day on the 22nd, not from noon. */
function invq_days_since($ymd, $now = null) {
    $now = $now === null ? time() : $now;
    $t = strtotime((string)$ymd . ' 00:00:00 UTC');
    if ($t === false) return 0;
    return max(0, (int)floor(($now - $t) / 86400));
}
function invq_money($v) { return '£' . number_format(invq_num($v), 2); }

/* The invoice's own email, if QuickBooks holds one on the invoice itself. */
function invq_bill_email($inv) {
    $e = strtolower(trim((string)(isset($inv['BillEmail']['Address']) ? $inv['BillEmail']['Address'] : '')));
    return filter_var($e, FILTER_VALIDATE_EMAIL) ? $e : '';
}
function invq_customer_id($inv) { return (string)(isset($inv['CustomerRef']['value']) ? $inv['CustomerRef']['value'] : ''); }
function invq_customer_name($inv) { return invq_str(isset($inv['CustomerRef']['name']) ? $inv['CustomerRef']['name'] : '', 80); }
function invq_email_status($inv) { return (string)(isset($inv['EmailStatus']) ? $inv['EmailStatus'] : 'NotSet'); }

/* Line descriptions, for the row and for the "generic description" warning. */
function invq_lines($inv) {
    $out = array();
    foreach ((array)(isset($inv['Line']) ? $inv['Line'] : array()) as $l) {
        if (!is_array($l) || (isset($l['DetailType']) && $l['DetailType'] === 'SubTotalLineDetail')) continue;
        $d = invq_str(isset($l['Description']) ? $l['Description'] : '', 120);
        $a = invq_num(isset($l['Amount']) ? $l['Amount'] : 0);
        if ($d === '' && $a == 0.0) continue;
        $out[] = array('desc' => $d, 'amount' => $a);
    }
    return $out;
}

/* Does this invoice belong in the queue? Money owed, never emailed, not voided. */
function invq_waiting($inv) {
    if (!is_array($inv) || empty($inv['Id'])) return false;
    if (invq_num(isset($inv['Balance']) ? $inv['Balance'] : 0) <= 0) return false;      // paid, part-paid to zero, or voided
    if (invq_num(isset($inv['TotalAmt']) ? $inv['TotalAmt'] : 0) <= 0) return false;
    return invq_email_status($inv) !== 'EmailSent';
}
function invq_pick($invoices) {
    $out = array();
    foreach ((array)$invoices as $inv) if (invq_waiting($inv)) $out[] = $inv;
    return $out;
}

/* The warnings. $email is the address the invoice would go to (invoice's own, else
   the customer's); $all is every invoice we fetched, for the duplicate check.
   Each warning is {code, text}; the text is what the reviewer reads. */
function invq_flags($inv, $email, $all = array(), $now = null) {
    $now = $now === null ? time() : $now;
    $f = array();
    if ($email === '') $f[] = array('code' => 'no_email', 'text' => 'No email address on the customer - it cannot be sent until one is added in QuickBooks');
    $tax = invq_num(isset($inv['TxnTaxDetail']['TotalTax']) ? $inv['TxnTaxDetail']['TotalTax'] : 0);
    if ($tax > 0) $f[] = array('code' => 'vat', 'text' => 'VAT of ' . invq_money($tax) . ' is on this invoice - we are not VAT registered');
    $amt = invq_num(isset($inv['TotalAmt']) ? $inv['TotalAmt'] : 0);
    if ($amt > INVQ_MAX_AMOUNT) $f[] = array('code' => 'amount', 'text' => 'Unusually large: ' . invq_money($amt));
    $lines = invq_lines($inv);
    $generic = count($lines) === 0;
    foreach ($lines as $l) if ($l['desc'] === '' || strtolower($l['desc']) === INVQ_GENERIC_DESC) $generic = true;
    if ($generic) $f[] = array('code' => 'generic', 'text' => 'The description still says "Work carried out" (or nothing) - the customer will not know what this is for');
    $cid = invq_customer_id($inv); $date = (string)(isset($inv['TxnDate']) ? $inv['TxnDate'] : '');
    $t0 = strtotime($date . ' 12:00:00 UTC');
    foreach ((array)$all as $o) {
        if (!is_array($o) || (string)(isset($o['Id']) ? $o['Id'] : '') === (string)$inv['Id']) continue;
        if (invq_customer_id($o) !== $cid || $cid === '') continue;
        if (abs(invq_num(isset($o['TotalAmt']) ? $o['TotalAmt'] : 0) - $amt) > 0.005) continue;
        $t1 = strtotime((string)(isset($o['TxnDate']) ? $o['TxnDate'] : '') . ' 12:00:00 UTC');
        if ($t0 === false || $t1 === false || abs($t0 - $t1) > INVQ_DUP_DAYS * 86400) continue;
        $n = (string)(isset($o['DocNumber']) ? $o['DocNumber'] : '');
        $f[] = array('code' => 'dup', 'text' => 'Possible duplicate: ' . invq_money($amt) . ' to the same customer' . ($n !== '' ? ' on #' . $n : '') . ' dated ' . (string)$o['TxnDate']);
        break;
    }
    $age = invq_days_since($date, $now);
    if ($age >= INVQ_OLD_DAYS) $f[] = array('code' => 'old', 'text' => 'Raised ' . $age . ' days ago and never sent');
    return $f;
}

/* What the console shows. Staff-only, so the customer's name and email are fine
   here; still no notes, no addresses, nothing beyond what the decision needs. */
function invq_row($inv, $email, $flags, $held, $qboHost, $now = null) {
    $id = (string)$inv['Id'];
    $date = (string)(isset($inv['TxnDate']) ? $inv['TxnDate'] : '');
    return array(
        'id'       => $id,
        'number'   => invq_str(isset($inv['DocNumber']) ? $inv['DocNumber'] : '', 30),
        'customer' => invq_customer_name($inv),
        'email'    => $email,
        'total'    => round(invq_num(isset($inv['TotalAmt']) ? $inv['TotalAmt'] : 0), 2),
        'balance'  => round(invq_num(isset($inv['Balance']) ? $inv['Balance'] : 0), 2),
        'date'     => $date,
        'due'      => (string)(isset($inv['DueDate']) ? $inv['DueDate'] : ''),
        'days'     => invq_days_since($date, $now),
        'status'   => invq_email_status($inv),
        'console_made' => (trim((string)(isset($inv['DocNumber']) ? $inv['DocNumber'] : '')) === ''),
        'lines'    => invq_lines($inv),
        'flags'    => array_values($flags),
        'held'     => (bool)$held,
        'url'      => rtrim((string)$qboHost, '/') . '/app/invoice?txnId=' . rawurlencode($id),
    );
}

/* The 9 o'clock line. Says who and how much, oldest first, and how many carry
   a warning - enough to decide whether to open the console now or after coffee. */
function invq_slack_line($rows, $consoleUrl = 'https://365techies.co.uk/portal/') {
    $rows = array_values(array_filter((array)$rows, function ($r) { return is_array($r) && empty($r['held']); }));
    if (!$rows) return '';
    usort($rows, function ($a, $b) { return (int)$b['days'] - (int)$a['days']; });
    $n = count($rows); $warn = 0;
    $bits = array();
    foreach ($rows as $r) {
        if (!empty($r['flags'])) $warn++;
        $who = (string)$r['customer'] !== '' ? (string)$r['customer'] : 'a customer';
        $bits[] = $who . ' ' . invq_money($r['total']) . ' (' . (int)$r['days'] . ' day' . ((int)$r['days'] === 1 ? '' : 's') . ')';
    }
    $shown = array_slice($bits, 0, 6);
    $more = $n > 6 ? ' and ' . ($n - 6) . ' more' : '';
    return ':receipt: *' . $n . ' invoice' . ($n === 1 ? '' : 's') . ' waiting for your OK* - ' . implode(' · ', $shown) . $more
         . ($warn ? ' :warning: ' . $warn . ' with a warning' : '')
         . '. Check and send from the staff console: ' . $consoleUrl;
}
