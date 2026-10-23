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
define('INVQ_DOC_PREFIX', '4905/');   // David's invoice numbering: 4905/NNN. QuickBooks has custom numbers ON, so an
                                      // invoice made through the API gets NO number unless we set one (owner, 24 Sep 2026:
                                      // "Colin's invoice doesn't seem to have an invoice number").

/* The next number in David's sequence, from the DocNumbers QuickBooks already holds: the
   highest 4905/NNN plus one, whatever order the list came in. Numbers outside the pattern
   (the monthly biller's licence-keyed ones, blanks, typos) are ignored. '' when nothing
   matches, so a caller leaves the number blank rather than inventing a sequence. */
function invq_next_number($docNumbers, $prefix = INVQ_DOC_PREFIX) {
    $max = -1;
    foreach ((array)$docNumbers as $n) {
        $n = trim((string)$n);
        if ($prefix !== '' && strpos($n, $prefix) !== 0) continue;
        $tail = substr($n, strlen($prefix));
        if (!preg_match('/^\d{1,6}$/', $tail)) continue;
        if ((int)$tail > $max) $max = (int)$tail;
    }
    return $max < 0 ? '' : $prefix . ($max + 1);
}

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
        if (isset($l['DetailType']) && $l['DetailType'] === 'DiscountLineDetail') {   // money off the whole invoice (23 Oct 2026)
            $pc = !empty($l['DiscountLineDetail']['PercentBased']) ? invq_num(isset($l['DiscountLineDetail']['DiscountPercent']) ? $l['DiscountLineDetail']['DiscountPercent'] : 0) : 0;
            $out[] = array('desc' => 'Discount' . ($pc > 0 ? ' (' . rtrim(rtrim(number_format($pc, 2, '.', ''), '0'), '.') . '%)' : ''), 'amount' => -invq_num(isset($l['Amount']) ? $l['Amount'] : 0));
            continue;
        }
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

/* ---- QuickBooks Products & Services as the job drop-down (22 Sep 2026) ---- */
/* QBO's Item list -> {id, name, desc, price}: active Service / NonInventory items
   (not categories, groups or stock), sorted by name. The price is QBO's own
   UnitPrice - the business's price list, kept in QuickBooks, never a guess. */
function invq_items_clean($json) {
    $out = array();
    $items = (isset($json['QueryResponse']['Item']) && is_array($json['QueryResponse']['Item'])) ? $json['QueryResponse']['Item'] : array();
    foreach ($items as $it) {
        if (!is_array($it) || empty($it['Id']) || empty($it['Name'])) continue;
        if (isset($it['Active']) && !$it['Active']) continue;
        $type = (string)(isset($it['Type']) ? $it['Type'] : '');
        if (!in_array($type, array('Service', 'NonInventory', ''), true)) continue;
        $out[] = array('id' => (string)$it['Id'], 'name' => invq_str($it['Name'], 100),
                       'desc' => invq_str(isset($it['Description']) ? $it['Description'] : '', 200),
                       'price' => round(invq_num(isset($it['UnitPrice']) ? $it['UnitPrice'] : 0), 2));
    }
    usort($out, function ($a, $b) { return strcasecmp($a['name'], $b['name']); });
    return $out;
}
function invq_item_find($items, $id) {
    $id = (string)$id;
    if ($id === '') return null;
    foreach ((array)$items as $it) if ((string)$it['id'] === $id) return $it;
    return null;
}
/* "Full computer service" picked or typed as the Slack job type -> the item of that
   name, ignoring case, spaces and punctuation. The whole name or nothing: a partial
   match would be a guess about money. */
function invq_item_key($s) { return preg_replace('/[^a-z0-9]/', '', strtolower((string)$s)); }
/* Exact name first. With $loose, a QuickBooks name that CONTAINS the text also counts
   ("Remote support" -> "Online Remote Support Services"; "Full computer service" ->
   "365 Techies Full Computer Service"): one candidate wins outright; several and the
   shortest name wins if $pick is 'shortest', else nothing (the caller that puts a
   price on a job asks for nothing - an ambiguous match is a guess about money). */
function invq_item_match($items, $text, $loose = false, $pick = 'none') {
    $k = invq_item_key($text);
    if ($k === '') return null;
    foreach ((array)$items as $it) if (invq_item_key($it['name']) === $k) return $it;
    if (!$loose) return null;
    $cands = array();
    foreach ((array)$items as $it) if (strpos(invq_item_key($it['name']), $k) !== false) $cands[] = $it;
    if (count($cands) === 1) return $cands[0];
    if (count($cands) > 1 && $pick === 'shortest') {
        usort($cands, function ($a, $b) { return strlen(invq_item_key($a['name'])) - strlen(invq_item_key($b['name'])); });
        return $cands[0];
    }
    return null;
}
/* The few services new customers actually get, shown first (owner, 22 Sep: "remote
   support and full computer service mostly"); anything else is picked from the full
   list behind "Other". Names are matched to QuickBooks items like a Slack job type;
   a name QuickBooks doesn't have is left out. $QBO_ITEM_SHORTLIST in the config
   overrides the default. */
function invq_shortlist_default() { return array('Remote support', 'Full computer service', 'Gaming PC tune-up'); }
function invq_items_short($items, $names) {
    $ids = array();
    foreach ((array)$names as $n) { $it = invq_item_match($items, $n, true, 'shortest'); if ($it && !in_array($it['id'], $ids, true)) $ids[] = $it['id']; }
    return $ids;
}

/* Put an item on a job: it becomes the QuickBooks line; its sales description is the
   job description and its list price the amount where nobody set one. A price or
   description a person typed (staff), or one typed in Slack, is never overwritten;
   what an earlier item pick set is replaced when the item changes. Returns true if
   anything changed. */
function invq_job_apply_item(&$job, $item) {
    if (!is_array($item) || empty($item['id'])) return false;
    $changed = false;
    $same = ((string)(isset($job['item_id']) ? $job['item_id'] : '') === (string)$item['id']);
    if (!$same) { $job['item_id'] = (string)$item['id']; $job['item_name'] = (string)$item['name']; $changed = true; }
    $descBy = (string)(isset($job['desc_by']) ? $job['desc_by'] : '');
    $descEmpty = trim((string)(isset($job['desc']) ? $job['desc'] : '')) === '';
    if ($descBy !== 'staff' && ($descEmpty || (!$same && $descBy === 'item'))) {
        $job['desc'] = $item['desc'] !== '' ? $item['desc'] : $item['name']; $job['desc_by'] = 'item'; $changed = true;
    }
    $amtBy = (string)(isset($job['amount_by']) ? $job['amount_by'] : '');
    $amtEmpty = invq_num(isset($job['amount']) ? $job['amount'] : 0) <= 0;
    if ($amtBy !== 'staff' && $amtBy !== 'slack' && ($amtEmpty || (!$same && $amtBy === 'item')) && $item['price'] > 0) {
        $job['amount'] = round((float)$item['price'], 2); $job['amount_by'] = 'item'; $changed = true;
    }
    return $changed;
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
        'item'     => (string)(isset($job['item_id']) ? $job['item_id'] : ''),          // the QuickBooks Product/Service picked for it
        'item_name' => invq_str(isset($job['item_name']) ? $job['item_name'] : '', 100),
        'lines'    => (isset($job['lines']) && is_array($job['lines'])) ? array_values($job['lines']) : array(),   // several lines typed in the portal (23 Oct 2026)
        'memo'     => invq_text(isset($job['memo']) ? $job['memo'] : '', INVQ_MEMO_MAX),   // the note for the invoice, typed in the portal
        'discount' => (isset($job['discount']['kind'], $job['discount']['value'])) ? array('kind' => (string)$job['discount']['kind'], 'value' => invq_num($job['discount']['value'])) : null,
        'kind'     => invq_str(isset($job['kind']) ? $job['kind'] : '', 80),               // the Slack "Job type" as typed or picked
        'state'    => $state,                      // none | unsent | sent | paid | invoiced
        'can_create' => ($state === 'none' && $can),
        'can_change' => ($state === 'unsent' && !empty($job['inv_fp'])),   // raised by the portal, not sent: "Change it" (the server checks again)
        'why_not'  => ($state === 'none' ? $why : ''),
        'invoice'  => $invRow,
        /* a quote (QuickBooks estimate) started from the row, if any: id, number, link */
        'quote'    => !empty($job['quote_id']) ? array('id' => (string)$job['quote_id'], 'no' => invq_str(isset($job['quote_no']) ? $job['quote_no'] : '', 30),
                                                       'url' => (string)(isset($job['quote_url']) ? $job['quote_url'] : ''), 'at' => (int)(isset($job['quote_at']) ? $job['quote_at'] : 0)) : null,
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

/* ---- 23 Oct 2026: sent but not paid, and the money in ------------------------------------------------------------------
   Owner: "Tom Wilson ... he's been sent the invoice, but I don't think he's paid ... do we send the invoice again with the
   payment details?" and "a list ... what invoices have been paid that month, so then basically we can see how much we've
   sort of made per week". */

/* 'YYYY-MM' or '' */
function invq_month_ok($m) {
    $m = trim((string)$m);
    if (!preg_match('/^(20\d\d)-(0[1-9]|1[0-2])$/', $m)) return '';
    return $m;
}
/* The Monday of the week a date falls in (weeks run Monday to Sunday) -> 'YYYY-MM-DD', or '' */
function invq_week_start($ymd) {
    $t = strtotime((string)$ymd . ' 12:00:00 UTC');
    if ($t === false) return '';
    return gmdate('Y-m-d', $t - ((int)gmdate('N', $t) - 1) * 86400);
}

/* Invoices QuickBooks has emailed that still owe money, most overdue first, then the oldest. A plan invoice collected by
   GoCardless is never emailed (EmailStatus NotSet), so it never shows here. $emails = customer id => email, for invoices
   that carry none of their own; $resent = invoice id => unix time it was last sent again from the console. */
function invq_unpaid_rows($invoices, $emails, $resent, $host, $now = null) {
    $now = $now === null ? time() : (int)$now;
    $today = gmdate('Y-m-d', $now);
    $rows = array();
    foreach ((array)$invoices as $inv) {
        if (!is_array($inv) || empty($inv['Id']) || invq_email_status($inv) !== 'EmailSent') continue;
        $bal = round(invq_num(isset($inv['Balance']) ? $inv['Balance'] : 0), 2);
        if ($bal <= 0) continue;
        $id = (string)$inv['Id'];
        $due = (string)(isset($inv['DueDate']) ? $inv['DueDate'] : '');
        $over = ($due !== '' && $due < $today) ? (int)round((strtotime($today . ' 12:00:00 UTC') - strtotime($due . ' 12:00:00 UTC')) / 86400) : 0;
        $email = invq_bill_email($inv);
        if ($email === '') { $cid = invq_customer_id($inv); $email = isset($emails[$cid]) ? (string)$emails[$cid] : ''; }
        $di = isset($inv['DeliveryInfo']) && is_array($inv['DeliveryInfo']) ? $inv['DeliveryInfo'] : array();
        $rows[] = array(
            'id' => $id, 'number' => invq_str(isset($inv['DocNumber']) ? $inv['DocNumber'] : '', 20),
            'date' => (string)(isset($inv['TxnDate']) ? $inv['TxnDate'] : ''), 'due' => $due, 'overdue' => $over,
            'customer' => invq_customer_name($inv), 'email' => $email,
            'total' => round(invq_num(isset($inv['TotalAmt']) ? $inv['TotalAmt'] : 0), 2), 'balance' => $bal,
            'sent_at' => (string)(isset($di['DeliveryTime']) ? $di['DeliveryTime'] : ''),
            'resent_at' => (int)(isset($resent[$id]) ? $resent[$id] : 0),
            'url' => $host . '/app/invoice?txnId=' . rawurlencode($id),
        );
    }
    usort($rows, function ($a, $b) {
        if ($a['overdue'] !== $b['overdue']) return $b['overdue'] - $a['overdue'];
        return strcmp($a['date'], $b['date']);
    });
    return $rows;
}

/* How a QuickBooks Payment was made, in a word the owner uses. The pay page's card and PayPal payments say so in their
   note (and a card one carries Stripe's pi_ number); a GoCardless one carries GoCardless's PM payment number. */
function invq_pay_how($p) {
    $ref = (string)(isset($p['PaymentRefNum']) ? $p['PaymentRefNum'] : '');
    $note = strtolower((string)(isset($p['PrivateNote']) ? $p['PrivateNote'] : ''));
    $meth = strtolower(trim((string)(isset($p['PaymentMethodRef']['name']) ? $p['PaymentMethodRef']['name'] : '')));
    if (strpos($ref, 'pi_') === 0 || strpos($note, 'stripe') !== false) return 'Card';
    if (strpos($note, 'paypal') !== false || strpos($meth, 'paypal') !== false) return 'PayPal';
    if (preg_match('/^PM[0-9A-Z]{8,}$/', $ref) || strpos($note, 'gocardless') !== false) return 'Direct Debit';
    if ($meth === 'cash') return 'Cash';
    if ($meth !== '') return ucfirst(invq_str($meth, 30));
    return 'Bank transfer / other';
}

/* The money in for one month, week by week (Monday to Sunday):
   - invoices paid: QuickBooks Payments dated in the month, with the invoice numbers they paid ($docs = invoice id =>
     number) and how they were paid;
   - plans: the monthly-plan Direct Debits as the bank feed posted them - Deposit lines on the GoCardless income account,
     so after GoCardless's fees. A GoCardless payout that also held an invoice payment counts that part under invoices. */
function invq_paid_summary($payments, $docs, $deposits, $month) {
    $rows = array(); $weeks = array(); $inv = 0.0; $plans = 0.0;
    $wk = function ($ymd) use (&$weeks) {
        $w = invq_week_start($ymd);
        if (!isset($weeks[$w])) $weeks[$w] = array('start' => $w, 'invoices' => 0.0, 'plans' => 0.0, 'n' => 0);
        return $w;
    };
    foreach ((array)$payments as $p) {
        if (!is_array($p) || empty($p['Id'])) continue;
        $date = (string)(isset($p['TxnDate']) ? $p['TxnDate'] : '');
        $amt = round(invq_num(isset($p['TotalAmt']) ? $p['TotalAmt'] : 0), 2);
        if (substr($date, 0, 7) !== $month || $amt <= 0) continue;
        $nums = array();
        foreach ((array)(isset($p['Line']) ? $p['Line'] : array()) as $ln)
            foreach ((array)(is_array($ln) && isset($ln['LinkedTxn']) ? $ln['LinkedTxn'] : array()) as $lt) {
                if (!is_array($lt) || (isset($lt['TxnType']) ? $lt['TxnType'] : '') !== 'Invoice' || empty($lt['TxnId'])) continue;
                $tid = (string)$lt['TxnId'];
                $nums[] = (isset($docs[$tid]) && $docs[$tid] !== '') ? (string)$docs[$tid] : 'id ' . $tid;
            }
        $w = $wk($date);
        $weeks[$w]['invoices'] += $amt; $weeks[$w]['n']++; $inv += $amt;
        $rows[] = array('date' => $date, 'customer' => invq_str(isset($p['CustomerRef']['name']) ? $p['CustomerRef']['name'] : '', 80),
                        'amount' => $amt, 'invoices' => array_values(array_unique($nums)), 'how' => invq_pay_how($p), 'week' => $w);
    }
    foreach ((array)$deposits as $d) {
        if (!is_array($d)) continue;
        $date = (string)(isset($d['TxnDate']) ? $d['TxnDate'] : '');
        if (substr($date, 0, 7) !== $month) continue;
        $sum = 0.0;
        foreach ((array)(isset($d['Line']) ? $d['Line'] : array()) as $ln) {
            if (!is_array($ln)) continue;
            $acct = (string)(isset($ln['DepositLineDetail']['AccountRef']['name']) ? $ln['DepositLineDetail']['AccountRef']['name'] : '');
            if (stripos($acct, 'gocardless') !== false && stripos($acct, 'income') !== false) $sum += invq_num(isset($ln['Amount']) ? $ln['Amount'] : 0);
        }
        if (abs($sum) < 0.005) continue;
        $w = $wk($date);
        $weeks[$w]['plans'] += $sum; $plans += $sum;
    }
    usort($rows, function ($a, $b) { return strcmp($b['date'], $a['date']); });
    krsort($weeks);
    $wl = array();
    foreach ($weeks as $w) $wl[] = array('start' => $w['start'], 'n' => $w['n'], 'invoices' => round($w['invoices'], 2), 'plans' => round($w['plans'], 2), 'total' => round($w['invoices'] + $w['plans'], 2));
    return array('month' => $month, 'rows' => $rows, 'weeks' => $wl,
                 'invoices' => round($inv, 2), 'plans' => round($plans, 2), 'total' => round($inv + $plans, 2));
}

/* ---- 23 Oct 2026 (later): several lines on one invoice, and the email seen before it goes ----------------------------
   Owner: "we can only add 1 product ... collection delivery, and with this particular one, we've loaned him a hard drive
   as well" and "before we send it, can we preview the email with the invoice and everything?" */
define('INVQ_MAX_LINES', 12);
/* When an invoice is due (owner, 23 Oct 2026: "we only want it to be like, give them like, about 2 or 3 days to pay ...
   rather than like a couple of weeks"). Set on the invoice itself, so QuickBooks' own default terms never decide it. */
define('INVQ_DUE_DAYS', 3);
function invq_due_date($now = null) {
    return gmdate('Y-m-d', ($now === null ? time() : (int)$now) + INVQ_DUE_DAYS * 86400);
}
/* Later the same day (owner: "you've got the product, but then ... a description ... so it's more personalised to what
   we've actually done for them"): a line's own wording can say what was done, at length, and the invoice can carry a
   note of its own - QuickBooks' "Message on invoice", printed on the PDF under the lines. */
define('INVQ_DESC_MAX', 1000);   // a line's wording (QuickBooks takes 4,000)
define('INVQ_MEMO_MAX', 1000);   // the note on the invoice (QuickBooks' own limit for "Message on invoice")

/* Wording typed for the invoice itself: line breaks kept (QuickBooks prints them), any other control character turned
   into a space, never more than one blank line in a row. */
function invq_text($v, $max = 1000) {
    $s = str_replace(array("\r\n", "\r"), "\n", (string)$v);
    $s = preg_replace('/[\x00-\x09\x0B-\x1F\x7F]+/', ' ', $s);
    $s = preg_replace('/[ ]+\n/', "\n", $s);
    $s = trim(preg_replace("/\n{3,}/", "\n\n", $s));
    $s = function_exists('mb_substr') ? mb_substr($s, 0, $max) : substr($s, 0, $max);
    return rtrim($s);
}

/* Typed invoice lines -> array(clean lines | null, error word). Each line: a service from QuickBooks' own list (or none),
   what was done, how many, the price of one. A line with a price of 0 goes on as wording only (a loan, a note). A line
   with nothing typed is dropped. $items = invq_items() - an id not on it is refused, never invented. */
function invq_lines_clean($raw, $items) {
    if (!is_array($raw)) return array(null, 'bad_lines');
    $out = array(); $sum = 0.0;
    foreach (array_slice(array_values($raw), 0, INVQ_MAX_LINES) as $ln) {
        if (!is_array($ln)) continue;
        $itemId = preg_replace('/[^0-9]/', '', (string)(isset($ln['item']) ? $ln['item'] : ''));
        $it = $itemId !== '' ? invq_item_find($items, $itemId) : null;
        if ($itemId !== '' && !$it) return array(null, 'bad_item');
        $desc = invq_text(isset($ln['desc']) ? $ln['desc'] : '', INVQ_DESC_MAX);
        $rateRaw = preg_replace('/[^0-9.]/', '', (string)(isset($ln['rate']) ? $ln['rate'] : ''));
        if ($rateRaw !== '' && !is_numeric($rateRaw)) return array(null, 'bad_amount');
        $rate = $rateRaw === '' ? 0.0 : round((float)$rateRaw, 2);
        if ($rate > INVQ_MAX_AMOUNT) return array(null, 'bad_amount');
        $qtyRaw = trim((string)(isset($ln['qty']) ? $ln['qty'] : '1'));
        if ($qtyRaw === '') $qtyRaw = '1';
        if (!preg_match('/^\d{1,2}$/', $qtyRaw) || (int)$qtyRaw < 1) return array(null, 'bad_qty');
        $qty = (int)$qtyRaw;
        if ($desc === '' && !$it && $rate <= 0) continue;                       // nothing typed on this line
        if ($desc === '' && $it) $desc = invq_text($it['desc'] !== '' ? $it['desc'] : $it['name'], INVQ_DESC_MAX);   // left empty: the service's own wording
        if ($desc === '') return array(null, 'no_desc');
        $out[] = array('item' => $it ? (string)$it['id'] : '', 'item_name' => $it ? (string)$it['name'] : '', 'desc' => $desc, 'qty' => $qty, 'rate' => $rate);
        $sum += $qty * $rate;
    }
    if (round($sum, 2) > INVQ_MAX_AMOUNT) return array(null, 'large');
    return array($out, '');
}
/* What a job's lines come to */
function invq_lines_total($lines) {
    $t = 0.0;
    foreach ((array)$lines as $ln) if (is_array($ln)) $t += (int)(isset($ln['qty']) ? $ln['qty'] : 1) * invq_num(isset($ln['rate']) ? $ln['rate'] : 0);
    return round($t, 2);
}
/* A job's lines as QuickBooks invoice/estimate lines: a priced line on its service (else the default service), a 0-price
   line as wording only. */
function invq_qbo_lines($lines, $defaultItem, $tax) {
    $out = array();
    foreach ((array)$lines as $ln) {
        if (!is_array($ln)) continue;
        $desc = invq_text(isset($ln['desc']) ? $ln['desc'] : '', INVQ_DESC_MAX);
        $qty = max(1, (int)(isset($ln['qty']) ? $ln['qty'] : 1));
        $rate = round(invq_num(isset($ln['rate']) ? $ln['rate'] : 0), 2);
        if ($rate <= 0) { $out[] = array('DetailType' => 'DescriptionOnly', 'Description' => $desc, 'DescriptionLineDetail' => new stdClass()); continue; }
        $item = (string)(isset($ln['item']) ? $ln['item'] : '') !== '' ? (string)$ln['item'] : (string)$defaultItem;
        $l = array('DetailType' => 'SalesItemLineDetail', 'Amount' => round($qty * $rate, 2), 'Description' => $desc,
                   'SalesItemLineDetail' => array('ItemRef' => array('value' => $item), 'Qty' => $qty, 'UnitPrice' => $rate));
        if ((string)$tax !== '') $l['SalesItemLineDetail']['TaxCodeRef'] = array('value' => (string)$tax);
        $out[] = $l;
    }
    return $out;
}

/* A discount on the whole invoice (owner, 23 Oct 2026: "David likes to put in the products at the price that they actually
   are ... we've agreed a price of £80, the invoice will show that it's £100, and then the final total ... with a
   discount"). Typed as a percentage off, or as the price agreed with them; the lines keep their full prices and QuickBooks'
   own discount line (Settings > Sales > Discount is On) takes the difference off. -> array(array(kind, value) | null for
   none, error word). An agreed price equal to the full price is no discount. */
function invq_discount_clean($raw, $subtotal) {
    if ($raw === null || (is_string($raw) && trim($raw) === '')) return array(null, '');
    if (!is_array($raw)) return array(null, 'bad_discount');
    $kind = (string)(isset($raw['kind']) ? $raw['kind'] : '');
    $vRaw = preg_replace('/[^0-9.]/', '', (string)(isset($raw['value']) ? $raw['value'] : ''));
    if ($kind === '' || $vRaw === '') return array(null, '');
    if (($kind !== 'pct' && $kind !== 'total') || !is_numeric($vRaw)) return array(null, 'bad_discount');
    $v = round((float)$vRaw, 2); $sub = round(invq_num($subtotal), 2);
    if ($kind === 'total' && abs($v - $sub) < 0.005) return array(null, '');
    if ($v <= 0 || ($kind === 'pct' && $v >= 100) || ($kind === 'total' && $v > $sub)) return array(null, 'bad_discount');
    $d = array('kind' => $kind, 'value' => $v);
    if (invq_discount_amount($d, $sub) <= 0) return array(null, 'bad_discount');
    return array($d, '');
}
/* Money off the full price, to the penny */
function invq_discount_amount($disc, $subtotal) {
    if (!is_array($disc) || !isset($disc['kind'], $disc['value'])) return 0.0;
    $sub = round(invq_num($subtotal), 2); $v = invq_num($disc['value']);
    $off = $disc['kind'] === 'pct' ? round($sub * $v / 100, 2) : ($disc['kind'] === 'total' ? round($sub - $v, 2) : 0.0);
    return max(0.0, min($sub, $off));
}
/* The discount as QuickBooks' own line. An agreed price that is a whole percentage off ("£100, agreed £80") goes on as
   that percentage, so the invoice says "Discount 20%"; any other agreed price goes on as the money off. VAT code as the
   other lines (No VAT). */
function invq_qbo_discount_line($disc, $subtotal, $tax) {
    $off = invq_discount_amount($disc, $subtotal);
    if ($off <= 0) return null;
    $sub = round(invq_num($subtotal), 2);
    $pct = 0.0;
    if ($disc['kind'] === 'pct') $pct = round(invq_num($disc['value']), 2);
    else { $p = round($off / $sub * 100); if ($p >= 1 && abs(round($sub * $p / 100, 2) - $off) < 0.005) $pct = (float)$p; }
    $l = array('DetailType' => 'DiscountLineDetail', 'Amount' => $off,
               'DiscountLineDetail' => $pct > 0 ? array('PercentBased' => true, 'DiscountPercent' => $pct) : array('PercentBased' => false));
    if ((string)$tax !== '') $l['DiscountLineDetail']['TaxCodeRef'] = array('value' => (string)$tax);
    return $l;
}

/* "Change it" (owner, 23 Oct 2026: "can we close down the preview and then go back and edit it some more?"): a raised
   invoice the portal made can have its lines, note and discount written over until it is sent. What its lines say, as
   one fingerprint - kind, money, service and wording of each line in order, and the note (QuickBooks' own subtotal row
   left out) - is kept on the job each time the portal writes the invoice. A change goes ahead only while the invoice
   still says exactly that: one somebody has altered in QuickBooks is changed there, never overwritten from here. */
function invq_lines_fp($inv) {
    $parts = array();
    foreach ((array)(isset($inv['Line']) ? $inv['Line'] : array()) as $l) {
        if (!is_array($l)) continue;
        $dt = (string)(isset($l['DetailType']) ? $l['DetailType'] : '');
        if ($dt === '' || $dt === 'SubTotalLineDetail') continue;
        $parts[] = $dt . '|' . number_format(invq_num(isset($l['Amount']) ? $l['Amount'] : 0), 2, '.', '')
                 . '|' . (string)(isset($l['SalesItemLineDetail']['ItemRef']['value']) ? $l['SalesItemLineDetail']['ItemRef']['value'] : '')
                 . '|' . invq_text(isset($l['Description']) ? $l['Description'] : '', 4000);
    }
    $parts[] = 'memo|' . invq_text(isset($inv['CustomerMemo']['value']) ? $inv['CustomerMemo']['value'] : '', INVQ_MEMO_MAX);
    return sha1(implode("\n", $parts));
}
/* Why a raised invoice can't be changed from the portal ('' = it can): sent, money paid against it, or not as the
   portal left it ($fp = the fingerprint kept on the job; none = the portal never wrote this one). */
function invq_change_blocked($inv, $fp) {
    if (!is_array($inv)) return 'not_found';
    if (invq_email_status($inv) === 'EmailSent') return 'already_sent';
    if (round(invq_num(isset($inv['Balance']) ? $inv['Balance'] : 0), 2) < round(invq_num(isset($inv['TotalAmt']) ? $inv['TotalAmt'] : 0), 2)) return 'part_paid';
    if ((string)$fp === '' || invq_lines_fp($inv) !== (string)$fp) return 'changed_in_qbo';
    return '';
}

/* The invoice email as QuickBooks will send it: its own wording (Settings > Sales > Messages, read through the API) with
   [Invoice No.] and [Company Name] filled in, the "Dear <first name>," greeting, and the invoice's lines, total and due
   date as its short summary. $tpl = array(Subject, Message) | null (QuickBooks did not say). */
function invq_first_name($givenName, $displayName) {
    $g = trim((string)$givenName);
    if ($g !== '') return invq_str($g, 40);
    $w = preg_split('/\s+/', trim((string)$displayName));
    $w = array_values(array_filter((array)$w, function ($x) { return $x !== '' && !preg_match('/^(mr|mrs|ms|miss|dr|mx)\.?$/i', $x); }));
    return $w ? invq_str($w[0], 40) : '';
}
function invq_email_fill($tpl, $inv, $company, $first) {
    $no = invq_str(isset($inv['DocNumber']) ? $inv['DocNumber'] : '', 30);
    $fill = function ($s) use ($no, $company) { return str_replace(array('[Invoice No.]', '[Company Name]'), array($no, (string)$company), (string)$s); };
    $lines = array(); $sub = 0.0; $off = 0.0; $offPct = 0.0;
    foreach ((array)(isset($inv['Line']) ? $inv['Line'] : array()) as $ln) {
        if (!is_array($ln)) continue;
        $dt = (string)(isset($ln['DetailType']) ? $ln['DetailType'] : '');
        if ($dt === 'DiscountLineDetail') {
            $off += invq_num(isset($ln['Amount']) ? $ln['Amount'] : 0);
            if (!empty($ln['DiscountLineDetail']['PercentBased'])) $offPct = invq_num(isset($ln['DiscountLineDetail']['DiscountPercent']) ? $ln['DiscountLineDetail']['DiscountPercent'] : 0);
            continue;
        }
        if ($dt !== 'SalesItemLineDetail' && $dt !== 'DescriptionOnly') continue;
        if ($dt === 'SalesItemLineDetail') $sub += invq_num(isset($ln['Amount']) ? $ln['Amount'] : 0);
        $lines[] = array('item' => $dt === 'SalesItemLineDetail' ? invq_str(isset($ln['SalesItemLineDetail']['ItemRef']['name']) ? $ln['SalesItemLineDetail']['ItemRef']['name'] : '', 100) : '',
                         'desc' => invq_text(isset($ln['Description']) ? $ln['Description'] : '', INVQ_DESC_MAX),
                         'qty' => $dt === 'SalesItemLineDetail' ? (float)(isset($ln['SalesItemLineDetail']['Qty']) ? $ln['SalesItemLineDetail']['Qty'] : 1) : 0,
                         'amount' => $dt === 'SalesItemLineDetail' ? round(invq_num(isset($ln['Amount']) ? $ln['Amount'] : 0), 2) : 0);
    }
    return array(
        'have_wording' => is_array($tpl),
        'subject' => is_array($tpl) ? invq_str($fill(isset($tpl['Subject']) ? $tpl['Subject'] : ''), 200) : '',
        'greeting' => $first !== '' ? 'Dear ' . $first . ',' : '',
        'body' => is_array($tpl) ? str_replace("\r\n", "\n", $fill(isset($tpl['Message']) ? $tpl['Message'] : '')) : '',
        'number' => $no, 'lines' => $lines,
        'memo' => invq_text(isset($inv['CustomerMemo']['value']) ? $inv['CustomerMemo']['value'] : '', INVQ_MEMO_MAX),   // the note printed on the PDF
        'subtotal' => round($sub, 2), 'discount' => round($off, 2), 'discount_pct' => $off > 0 ? round($offPct, 2) : 0.0,   // full price and money off, as QuickBooks has them
        'total' => round(invq_num(isset($inv['TotalAmt']) ? $inv['TotalAmt'] : 0), 2),
        'balance' => round(invq_num(isset($inv['Balance']) ? $inv['Balance'] : 0), 2),
        'due' => (string)(isset($inv['DueDate']) ? $inv['DueDate'] : ''),
        'sent' => invq_email_status($inv) === 'EmailSent',
    );
}
