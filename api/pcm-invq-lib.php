<?php
/*
 * "This month's jobs -> invoices" - library half (22 Sep 2026, v2 the same day).
 *
 * WHY, AND WHY IT CHANGED
 * v1 listed every unsent invoice QuickBooks held, which surfaced years of
 * backlog and missed the point. The owner's words: "we have the jobs in Slack
 * ... these new jobs which have come in in the last month ... it basically
 * produces invoices for those customers." So the queue now starts from the
 * JOBS - the "Quote agreed" records in pcm-jobs.json, last 30 days - and for
 * each one either finds its QuickBooks invoice or has one created. Sending is
 * still a human's "Approve & send" against the real PDF, with the likely
 * mistakes flagged. Older unsent invoices are still reachable, folded away.
 *
 * This file is the pure part: the window, matching a job to an invoice, the
 * job's state, the warnings, the row shapes, the morning line. No network, no
 * files - pcm-invq-test.php runs it from the CLI. QuickBooks lives in
 * pcm-invq-sweep.php; the staff endpoint is pcm-invq.php.
 *
 * QuickBooks has NO draft flag (see qbo_lib_invoice_ready). "Unsent" here means
 * EmailStatus is not EmailSent and there is a balance.
 *
 * NO closing tag in this file.
 */

define('INVQ_MAX_AMOUNT', 2000.00);   // above this, a second look before it goes (and never auto-created)
define('INVQ_DUP_DAYS', 7);           // same customer, same amount, within this many days = likely duplicate
define('INVQ_OLD_DAYS', 14);          // raised this long ago and still unsent = something is stuck
define('INVQ_WINDOW_DAYS', 30);       // "this month": jobs and invoices younger than this are the queue
define('INVQ_MATCH_DAYS', 7);         // a job and an invoice this close, same customer, same amount = the same job
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
function invq_days_since_ts($ts, $now = null) {
    $now = $now === null ? time() : $now;
    return max(0, (int)floor(($now - (int)$ts) / 86400));
}
function invq_money($v) { return '£' . number_format(invq_num($v), 2); }
function invq_email_ok($e) { $e = strtolower(trim((string)$e)); return filter_var($e, FILTER_VALIDATE_EMAIL) ? $e : ''; }

/* ---- invoice accessors ------------------------------------------------- */
function invq_bill_email($inv) { return invq_email_ok(isset($inv['BillEmail']['Address']) ? $inv['BillEmail']['Address'] : ''); }
function invq_customer_id($inv) { return (string)(isset($inv['CustomerRef']['value']) ? $inv['CustomerRef']['value'] : ''); }
function invq_customer_name($inv) { return invq_str(isset($inv['CustomerRef']['name']) ? $inv['CustomerRef']['name'] : '', 80); }
function invq_email_status($inv) { return (string)(isset($inv['EmailStatus']) ? $inv['EmailStatus'] : 'NotSet'); }
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
/* Money owed, never emailed, not voided. */
function invq_waiting($inv) {
    if (!is_array($inv) || empty($inv['Id'])) return false;
    if (invq_num(isset($inv['Balance']) ? $inv['Balance'] : 0) <= 0) return false;
    if (invq_num(isset($inv['TotalAmt']) ? $inv['TotalAmt'] : 0) <= 0) return false;
    return invq_email_status($inv) !== 'EmailSent';
}
function invq_pick($invoices) {
    $out = array();
    foreach ((array)$invoices as $inv) if (invq_waiting($inv)) $out[] = $inv;
    return $out;
}
/* paid | sent | unsent, for an invoice we have in hand. */
function invq_invoice_state($inv) {
    if (invq_num(isset($inv['Balance']) ? $inv['Balance'] : 0) <= 0) return 'paid';
    return invq_email_status($inv) === 'EmailSent' ? 'sent' : 'unsent';
}

/* ---- jobs -------------------------------------------------------------- */
/* The jobs from the last INVQ_WINDOW_DAYS - "Quote agreed" from the console and the
   "New Job In" posts from Slack - newest first, one per id. A job with no price
   yet is INCLUDED: it needs a person to type one, and hiding it is how jobs get
   forgotten. */
function invq_jobs_recent($jobs, $now = null, $days = INVQ_WINDOW_DAYS) {
    $now = $now === null ? time() : $now;
    $seen = array(); $out = array();
    foreach (array_reverse((array)$jobs) as $j) {
        if (!is_array($j) || empty($j['id']) || isset($seen[$j['id']])) continue;
        if ((int)(isset($j['ts']) ? $j['ts'] : 0) < $now - $days * 86400) continue;
        $st = (string)(isset($j['status']) ? $j['status'] : '');
        if ($st !== '' && $st !== 'quoted' && $st !== 'done') continue;
        $seen[$j['id']] = true; $out[] = $j;
    }
    return $out;
}

/* The third source: a service run through 365 PC Manager on a customer who is
   NOT on a plan. The owner activates new customers in the app to run a service
   even when they are not on support, and those are jobs to invoice too.
   One job per machine, dated by its latest service in the window. Guards:
   plan customers never (their service is what the plan pays for), self-serve
   sign-in identities never (not customers), and the caller drops anyone who
   already has a Slack or console job this month (see invq_pcm_sync). Money:
   the engineer-mode amount when there is one, else nothing - a person prices it. */
function invq_jobs_from_pcm($customers, $now = null, $days = INVQ_WINDOW_DAYS) {
    $now = $now === null ? time() : $now;
    $out = array();
    foreach ((array)$customers as $key => $c) {
        if (!is_array($c)) continue;
        if ((string)(isset($c['tier']) ? $c['tier'] : '') === 'pro') continue;
        if ((string)(isset($c['via']) ? $c['via'] : '') === 'signin') continue;
        $name = invq_str(isset($c['name']) ? $c['name'] : '', 90);
        $email = invq_email_ok(isset($c['email']) ? $c['email'] : '');
        $phone = invq_str(isset($c['mobile']) && $c['mobile'] !== '' ? $c['mobile'] : (isset($c['tel']) ? $c['tel'] : ''), 30);
        foreach ((array)(isset($c['machines']) ? $c['machines'] : array()) as $mid => $m) {
            if (!is_array($m) || !preg_match('/^[a-f0-9]{6,32}$/', (string)$mid)) continue;
            $last = 0; $kind = '';
            foreach ((array)(isset($m['repk']) ? $m['repk'] : array()) as $ts => $k) {
                if (($k === 'service' || $k === 'selfrun') && (int)$ts > $last) { $last = (int)$ts; $kind = $k; }
            }
            $fs = isset($m['fullservice']) ? strtotime((string)$m['fullservice'] . ' UTC') : false;
            if ($fs !== false && $fs > $last) { $last = $fs; $kind = 'service'; }
            if ($last <= 0 || $last < $now - $days * 86400) continue;
            $pc = invq_str(isset($m['name']) ? $m['name'] : '', 40);
            $amt = invq_num(isset($m['oneoff_amount']) ? $m['oneoff_amount'] : 0);
            $out[] = array(
                'id' => 'pcm-' . preg_replace('/[^0-9a-zA-Z-]/', '', (string)$key) . '-' . (string)$mid, 'ts' => $last, 'by' => 'PC Manager', 'via' => 'pcm',
                'name' => ($name !== '' ? $name : $email), 'email' => $email, 'phone' => $phone, 'addr' => '',
                'desc' => 'Full computer service' . ($pc !== '' ? ' on ' . $pc : '') . ($kind === 'selfrun' ? ' (run from the app)' : '') . ', ' . gmdate('j M', $last),
                'note' => ($kind === 'selfrun' ? 'self-run' : 'service') . ($pc !== '' ? ' · ' . $pc : ''),
                'amount' => ($amt > 0 ? round($amt, 2) : 0.0), 'amount_by' => ($amt > 0 ? 'engineer' : ''),
                'invoice_no' => '', 'invoice_url' => '', 'invoice_doc' => '', 'invoiced_in_slack' => false,
                'status' => 'done', 'pcm' => array('key' => (string)$key, 'machine' => (string)$mid, 'kind' => $kind),
            );
        }
    }
    return $out;
}

/* Find the invoice that IS this job. First by the id the console recorded when it
   created the draft; then by the invoice NUMBER someone typed in Slack's
   "Invoiced?" box; else the same customer, the same amount, within a week of the
   job. $byId = invoices keyed by Id; $custId = the job customer's QuickBooks id
   ('' when unknown). Returns the invoice or null. */
function invq_match_job($job, $byId, $custId = '') {
    $no = (string)(isset($job['invoice_no']) ? $job['invoice_no'] : '');
    if ($no !== '' && isset($byId[$no])) return $byId[$no];
    $doc = trim((string)(isset($job['invoice_doc']) ? $job['invoice_doc'] : ''));
    if ($doc !== '') foreach ($byId as $inv) if (trim((string)(isset($inv['DocNumber']) ? $inv['DocNumber'] : '')) === $doc) return $inv;
    if ($custId === '') return null;
    $amt = round(invq_num($job['amount']), 2);
    $jt = (int)(isset($job['ts']) ? $job['ts'] : 0);
    $best = null;
    foreach ($byId as $inv) {
        if (invq_customer_id($inv) !== $custId) continue;
        if (abs(round(invq_num(isset($inv['TotalAmt']) ? $inv['TotalAmt'] : 0), 2) - $amt) > 0.005) continue;
        $it = strtotime((string)(isset($inv['TxnDate']) ? $inv['TxnDate'] : '') . ' 12:00:00 UTC');
        if ($it === false || abs($it - $jt) > INVQ_MATCH_DAYS * 86400) continue;
        if ($best === null || abs($it - $jt) < abs(strtotime($best['TxnDate'] . ' 12:00:00 UTC') - $jt)) $best = $inv;
    }
    return $best;
}

/* Why a job can or cannot have an invoice created for it automatically. */
function invq_can_create($job) {
    if (invq_email_ok(isset($job['email']) ? $job['email'] : '') === '') return array(false, 'no_email');
    $amt = invq_num(isset($job['amount']) ? $job['amount'] : 0);
    if ($amt <= 0) return array(false, 'no_amount');
    if ($amt > INVQ_MAX_AMOUNT) return array(false, 'large');
    if (trim((string)(isset($job['desc']) ? $job['desc'] : '')) === '') return array(false, 'no_desc');
    return array(true, '');
}

/* ---- warnings ---------------------------------------------------------- */
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

/* ---- rows -------------------------------------------------------------- */
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
        'state'    => invq_invoice_state($inv),
        'console_made' => (trim((string)(isset($inv['DocNumber']) ? $inv['DocNumber'] : '')) === ''),
        'lines'    => invq_lines($inv),
        'flags'    => array_values($flags),
        'held'     => (bool)$held,
        'url'      => rtrim((string)$qboHost, '/') . '/app/invoice?txnId=' . rawurlencode($id),
    );
}
/* A job row: what the job was, and where its invoice stands. $invRow is the
   invoice row when one exists, else null. */
function invq_job_row($job, $invRow, $now = null) {
    list($can, $why) = invq_can_create($job);
    $state = $invRow ? $invRow['state'] : 'none';
    /* "Invoiced? (Y/N) Y" in Slack with no invoice we can find: somebody has dealt
       with it outside this queue. Say so and leave it alone. */
    if ($state === 'none' && !empty($job['invoiced_in_slack'])) { $state = 'invoiced'; $can = false; $why = 'invoiced_in_slack'; }
    return array(
        'job'      => (string)$job['id'],
        'source'   => in_array((string)(isset($job['via']) ? $job['via'] : ''), array('slack', 'pcm'), true) ? (string)$job['via'] : 'console',
        'customer' => invq_str(isset($job['name']) ? $job['name'] : '', 80),
        'email'    => invq_email_ok(isset($job['email']) ? $job['email'] : ''),
        'desc'     => invq_str(isset($job['desc']) ? $job['desc'] : '', 160),
        'detail'   => invq_str(isset($job['note']) ? $job['note'] : '', 120),   // the Slack post's type / time / assignee line - not a private note
        'amount'   => round(invq_num(isset($job['amount']) ? $job['amount'] : 0), 2),
        'ts'       => (int)(isset($job['ts']) ? $job['ts'] : 0),
        'days'     => invq_days_since_ts(isset($job['ts']) ? $job['ts'] : 0, $now),
        'by'       => invq_str(isset($job['by']) ? $job['by'] : '', 40),
        'done'     => ((string)(isset($job['status']) ? $job['status'] : '') === 'done'),
        'state'    => $state,                      // none | unsent | sent | paid | invoiced
        'can_create' => ($state === 'none' && $can),
        'why_not'  => ($state === 'none' ? $why : ''),
        'invoice'  => $invRow,
    );
}

/* The 9 o'clock line: what is waiting for a human, oldest first. */
function invq_slack_line($jobRows, $invRows, $consoleUrl = 'https://365techies.co.uk/portal/') {
    $wait = array_values(array_filter((array)$invRows, function ($r) { return is_array($r) && empty($r['held']) && $r['state'] === 'unsent'; }));
    usort($wait, function ($a, $b) { return (int)$b['days'] - (int)$a['days']; });
    $need = array_values(array_filter((array)$jobRows, function ($j) { return is_array($j) && $j['state'] === 'none'; }));
    if (!$wait && !$need) return '';
    $parts = array();
    if ($wait) {
        $warn = 0; $bits = array();
        foreach ($wait as $r) { if (!empty($r['flags'])) $warn++; $bits[] = ((string)$r['customer'] !== '' ? $r['customer'] : 'a customer') . ' ' . invq_money($r['total']) . ' (' . (int)$r['days'] . ' day' . ((int)$r['days'] === 1 ? '' : 's') . ')'; }
        $n = count($wait);
        $parts[] = '*' . $n . ' invoice' . ($n === 1 ? '' : 's') . ' waiting for your OK* - ' . implode(' · ', array_slice($bits, 0, 6)) . ($n > 6 ? ' and ' . ($n - 6) . ' more' : '') . ($warn ? ' :warning: ' . $warn . ' with a warning' : '');
    }
    if ($need) {
        $noEmail = count(array_filter($need, function ($j) { return $j['why_not'] === 'no_email'; }));
        $n = count($need);
        $parts[] = '*' . $n . ' job' . ($n === 1 ? '' : 's') . ' with no invoice yet*' . ($noEmail ? ' (' . $noEmail . ' need an email address first)' : '');
    }
    return ':receipt: ' . implode(' · ', $parts) . '. Staff console: ' . $consoleUrl;
}
