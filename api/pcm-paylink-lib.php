<?php
/*
 * "Send a pay link" - library half (20 Sep 2026).
 *
 * WHY THIS IS A SEPARATE FILE
 * pcm-paylink.php runs its router the moment it is included, so it cannot be
 * tested from the CLI. Everything here is a pure function with no side effects
 * beyond the store file it is handed, which is what pcm-paylink-test.php
 * exercises. Same split as pcm-qbo-lib.php / pcm-portal-auth-lib.php.
 *
 * WHAT THIS IS FOR
 * A remote job's price is agreed on the phone and is different every time -
 * £20, £60, £85, a Dell setup at £150. Our GoCardless links until now were
 * fixed-amount REUSABLE plan links, so a customer who owes £60 today could not
 * pay it through GoCardless at all. This builds a one-off GoCardless payment
 * link for the exact amount, for one named customer, and sends it to them.
 *
 * ⚠️ THE LINK THIS BUILDS IS SINGLE-USE AND PERSONAL. It is the
 * pay.gocardless.com/billing/static/flow?id=BRF... form that pcm-invite.php
 * deliberately REFUSES to email, because that file publishes reusable plan
 * links and a single-use link there would be a bug. Here it is the whole point,
 * and the rule flips: it may be sent to the one customer it was made for and
 * must NEVER be written into a page, a sitemap, a feed or the repo. The repo is
 * public.
 *
 * NO closing tag in this file.
 */

define('PL_MIN_AMOUNT', 1.00);        // below this a link costs more in fees than it collects
define('PL_MAX_AMOUNT', 2000.00);     // a typo ceiling, not a business limit - raise deliberately
define('PL_MAX_ROWS', 500);           // the store is a working record, not an archive
define('PL_DESC_MAX', 100);           // GoCardless payment description limit
define('PL_MAX_PER_HOUR', 30);        // a loop-bug tripwire, per the SMS library's habit

function pl_clean($v, $max) {
    $v = trim((string)$v);
    $v = preg_replace('/[^\P{C}\n]/u', '', $v);          // strip control characters, keep newlines
    $v = trim(preg_replace('/\s+/u', ' ', $v));
    return function_exists('mb_substr') ? mb_substr($v, 0, $max) : substr($v, 0, $max);
}

/* The agreed price. Returns a float, or false if we should not build a link for it.
   Deliberately strict: an operator typo here becomes a real request for money. */
function pl_amount($raw) {
    $s = preg_replace('/[^0-9.]/', '', (string)$raw);
    if ($s === '' || substr_count($s, '.') > 1) return false;
    $f = round((float)$s, 2);
    if ($f + 0.0001 < PL_MIN_AMOUNT || $f > PL_MAX_AMOUNT) return false;
    return $f;
}
/* GoCardless takes the amount in pence, as an integer. */
function pl_pence($amount) { return (string)(int)round(((float)$amount) * 100); }
function pl_money($amount) { return '£' . number_format((float)$amount, 2); }

/* What the payment is for. Shows on the customer's bank statement and in our
   GoCardless dashboard, so it must be recognisable and short. */
function pl_desc($raw) {
    $d = pl_clean($raw, PL_DESC_MAX);
    return $d;
}

function pl_new_id() { return date('ymd') . '-' . substr(bin2hex(random_bytes(3)), 0, 5); }

/* A GoCardless hosted authorisation link for ONE customer. This is the only
   shape we will ever text or email from here. */
function pl_flow_link_ok($u) {
    $u = (string)$u;
    if (strpos($u, 'https://pay.gocardless.com/billing/static/flow?id=BRF') !== 0) return false;
    if (strpos($u, "\n") !== false || strpos($u, ' ') !== false) return false;
    return true;
}

/* ---- the store: one row per link, flock + atomic rename, capped --------- */
function pl_store_read($file) {
    $j = @json_decode((string)@file_get_contents($file), true);
    if (!is_array($j) || !isset($j['links']) || !is_array($j['links'])) $j = array('links' => array());
    // json_encode writes a whole-pound amount as 60, which decodes back as an
    // INT. Normalise on read so every caller sees the same type as it stored
    // and a strict comparison on an amount can never quietly go false.
    foreach ($j['links'] as $i => $row) if (isset($row['amount'])) $j['links'][$i]['amount'] = (float)$row['amount'];
    return $j;
}
function pl_store_locked($file, $fn) {
    $lh = @fopen($file . '.lock', 'c');
    if (!$lh) return array('ok' => false, 'error' => 'lock_open');
    if (!flock($lh, LOCK_EX)) { fclose($lh); return array('ok' => false, 'error' => 'lock'); }
    $data = pl_store_read($file);
    $r = $fn($data);
    if (!empty($r['ok']) && isset($r['data'])) {
        $d = $r['data'];
        if (count($d['links']) > PL_MAX_ROWS) $d['links'] = array_slice($d['links'], -PL_MAX_ROWS);
        $tmp = $file . '.' . getmypid() . '.tmp';
        if (@file_put_contents($tmp, json_encode($d, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), LOCK_EX) === false
            || !@rename($tmp, $file)) { @unlink($tmp); $r = array('ok' => false, 'error' => 'store_write'); }
    }
    flock($lh, LOCK_UN); fclose($lh);
    return $r;
}
function pl_find($store, $id) {
    foreach ((array)$store['links'] as $row) if (isset($row['id']) && $row['id'] === $id) return $row;
    return null;
}
/* A link already made for this job and amount, still usable. Stops a second
   click (or a re-opened console) from asking the same person for money twice. */
function pl_find_reusable($store, $job, $amount, $now = null) {
    if ($job === '') return null;
    $now = $now === null ? time() : $now;
    foreach (array_reverse((array)$store['links']) as $row) {
        if ((string)(isset($row['job']) ? $row['job'] : '') !== (string)$job) continue;
        if (abs((float)$row['amount'] - (float)$amount) > 0.001) continue;
        if (pl_row_state($row, $now) !== 'open') continue;
        return $row;
    }
    return null;
}
function pl_count_since($store, $since) {
    $n = 0;
    foreach ((array)$store['links'] as $row) if ((int)(isset($row['created']) ? $row['created'] : 0) >= $since) $n++;
    return $n;
}

/* open = can still be paid; paid / cancelled / expired = finished with. */
function pl_row_state($row, $now = null) {
    $now = $now === null ? time() : $now;
    $s = (string)(isset($row['status']) ? $row['status'] : '');
    if ($s === 'paid' || $s === 'cancelled' || $s === 'failed') return $s;
    $exp = (int)(isset($row['expires']) ? $row['expires'] : 0);
    if ($exp > 0 && $exp <= $now) return 'expired';
    return 'open';
}
/* GoCardless billing request status -> ours. Anything unexpected stays open,
   because hiding a link that still works is the worse mistake. */
function pl_status_from_br($br) {
    $s = strtolower((string)(is_array($br) && isset($br['status']) ? $br['status'] : ''));
    if ($s === 'fulfilled') return 'paid';
    if ($s === 'cancelled') return 'cancelled';
    if ($s === 'failed')    return 'failed';
    return 'open';
}

/* ---- what the customer actually reads ---------------------------------- */
function pl_first_name($name) {
    $n = trim((string)$name);
    if ($n === '') return '';
    $parts = preg_split('/\s+/', $n);
    return $parts[0];
}
function pl_esc_html($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }

/* One text message. Kept under two SMS segments where the job title allows, and
   it always says who it is from, what it is for and how much - a payment text
   that could be mistaken for a scam is worse than no text at all. */
function pl_msg_sms($name, $amount, $desc, $url) {
    $hi = pl_first_name($name);
    $hi = ($hi !== '') ? $hi . ', h' : 'H';
    $for = ($desc !== '') ? (' for ' . $desc) : '';
    return $hi . 'ere is your secure link to pay 365 Techies ' . pl_money($amount) . $for . '. '
         . 'You choose your own bank and approve it in your banking app - we never see your details. '
         . $url . ' Questions? Call us on 01202 775566.';
}

/* The email version. Returns array(subject, text, html). */
function pl_msg_email($name, $amount, $desc, $url, $note = '') {
    $first = pl_first_name($name);
    $hi = ($first !== '') ? 'Hi ' . $first . ',' : 'Hello,';
    $money = pl_money($amount);
    $for = ($desc !== '') ? (' for ' . $desc) : '';
    $subject = 'Your 365 Techies payment link - ' . $money;

    $text = $hi . "\n\n"
        . 'Here is your secure link to pay ' . $money . $for . ":\n\n"
        . $url . "\n\n";
    if ($note !== '') $text .= $note . "\n\n";
    $text .= "You choose your own bank and approve the payment in your banking app.\n"
        . "We never see your bank details, and there is no account to create.\n\n"
        . "This link was made for you, so please don't pass it on. If you'd rather pay\n"
        . "another way, our bank details are on 365techies.co.uk/pay/ or just call us.\n\n"
        . "Any questions, reply to this email or call 01202 775566.\n\n"
        . "365 Techies\n01202 775566 - 365techies.co.uk\nPayments handled securely by GoCardless.\n";

    $noteHtml = ($note !== '') ? '<p style="margin:0 0 16px">' . nl2br(pl_esc_html($note)) . '</p>' : '';
    $forHtml  = ($desc !== '') ? (' for <strong>' . pl_esc_html($desc) . '</strong>') : '';
    $html = '<!doctype html><html><body style="margin:0;background:#f4f6f9;font-family:Arial,Helvetica,sans-serif;color:#1a2433">'
        . '<div style="max-width:520px;margin:0 auto;padding:24px">'
        . '<div style="background:#fff;border-radius:14px;padding:28px 26px;box-shadow:0 1px 3px rgba(0,0,0,.08)">'
        . '<p style="font-size:16px;margin:0 0 14px">' . pl_esc_html($hi) . '</p>'
        . '<p style="margin:0 0 16px">Here is your secure link to pay <strong>' . pl_esc_html($money) . '</strong>' . $forHtml . '.</p>'
        . $noteHtml
        . '<p style="text-align:center;margin:26px 0"><a href="' . pl_esc_html($url) . '" style="display:inline-block;background:#0a8f4c;color:#fff;text-decoration:none;font-weight:bold;font-size:16px;padding:14px 30px;border-radius:10px">Pay ' . pl_esc_html($money) . ' securely</a></p>'
        . '<p style="font-size:13px;color:#4a5568;margin:0 0 14px">You choose your own bank and approve the payment in your banking app. <strong>We never see your bank details</strong>, and there is no account to create.</p>'
        . '<div style="background:#f0f7f2;border-radius:10px;padding:14px 16px;font-size:13px;color:#2f4a39;margin:0 0 16px">'
        . 'This link was made for you &mdash; please don&rsquo;t pass it on. Prefer a bank transfer? Our details are on <a href="https://365techies.co.uk/pay/" style="color:#0a8f4c">365techies.co.uk/pay/</a>, or just call us.</div>'
        . '<p style="font-size:13px;color:#4a5568;margin:0">Any questions, reply to this email or call <strong>01202&nbsp;775566</strong>.</p>'
        . '</div>'
        . '<p style="text-align:center;color:#8a94a6;font-size:11px;margin:16px 0 0">365 Techies &middot; 01202 775566 &middot; 365techies.co.uk<br>Payments handled securely by GoCardless.</p>'
        . '</div></body></html>';

    return array($subject, $text, $html);
}

/* ---- webhooks: what GoCardless tells us, and whether to believe it ------ */

/* Signature check. GoCardless signs the RAW body with the webhook endpoint
   secret; the digest is lower-case hex SHA-256. Constant-time compare, and a
   missing secret or header fails closed - an unsigned webhook is a stranger
   claiming one of our customers has paid. */
function pl_sig_ok($raw, $header, $secret) {
    $secret = (string)$secret; $given = strtolower(trim((string)$header));
    if ($secret === '' || $given === '') return false;
    $calc = hash_hmac('sha256', (string)$raw, $secret);
    if (strlen($given) !== strlen($calc)) return false;      // hash_equals wants equal lengths
    return hash_equals($calc, $given);
}

/* Which events change a row's state. Anything unrecognised returns '' and is
   ignored on purpose: GoCardless adds event types without warning, and a
   payment link we do not understand is one we leave alone. */
function pl_event_state($type, $action) {
    $type = strtolower((string)$type); $action = strtolower((string)$action);
    if ($type === 'billing_requests') {
        if ($action === 'fulfilled') return 'paid';
        if ($action === 'cancelled') return 'cancelled';
        if ($action === 'failed')    return 'failed';
        return '';                                   // flow_visited, bank_authorisation_* etc: nothing to record
    }
    if ($type === 'payments') {
        if ($action === 'confirmed' || $action === 'paid_out') return 'paid';
        if ($action === 'failed' || $action === 'cancelled' || $action === 'charged_back') return 'failed';
        return '';
    }
    return '';
}

/* Apply one event to the store. Pure: hand it the decoded store and an event,
   get back the new store plus what changed, if anything. Matching is by OUR
   stored ids only - an event about somebody else's billing request touches
   nothing. A paid row is never quietly downgraded; only a failure can follow a
   payment, because that is the one case where the money really did come back. */
function pl_event_apply($data, $event, $now = null) {
    $now = $now === null ? time() : $now;
    $res = array('data' => $data, 'id' => '', 'change' => '', 'why' => '', 'matched' => false, 'row' => null);
    $links  = (isset($event['links']) && is_array($event['links'])) ? $event['links'] : array();
    $br     = (string)(isset($links['billing_request']) ? $links['billing_request'] : '');
    $pay    = (string)(isset($links['payment']) ? $links['payment'] : '');
    $state  = pl_event_state(isset($event['resource_type']) ? $event['resource_type'] : '',
                             isset($event['action']) ? $event['action'] : '');
    foreach ((array)$data['links'] as $i => $row) {
        $rowPay = (string)(isset($row['payment']) ? $row['payment'] : '');
        $hit = ($br !== '' && (string)$row['br'] === $br) || ($pay !== '' && $rowPay !== '' && $rowPay === $pay);
        if (!$hit) continue;
        $res['matched'] = true; $res['id'] = (string)$row['id'];
        if ($pay !== '' && $rowPay === '') $data['links'][$i]['payment'] = $pay;    // learn the payment id for later events
        $cur = pl_row_state($row, $now);
        if ($state !== '' && $cur !== $state && !($cur === 'paid' && $state !== 'failed')) {
            $data['links'][$i]['status'] = $state;
            $data['links'][$i]['status_at'] = $now;
            $res['change'] = $state;
            $res['why'] = pl_clean(isset($event['details']['description']) ? $event['details']['description'] : '', 140);
        }
        $res['row'] = $data['links'][$i];
        break;
    }
    $res['data'] = $data;
    return $res;
}

/* Seen-event ids, so a redelivery cannot announce the same payment twice.
   GoCardless delivers at least once and may deliver out of order. */
function pl_seen_has($seen, $id) { return $id !== '' && is_array($seen) && isset($seen[$id]); }
function pl_seen_add($seen, $id, $now = null, $cap = 1000) {
    if (!is_array($seen)) $seen = array();
    if ($id === '') return $seen;
    $seen[$id] = $now === null ? time() : $now;
    if (count($seen) > $cap) { asort($seen); $seen = array_slice($seen, -$cap, null, true); }
    return $seen;
}

/* ---- what the team reads in Slack -------------------------------------- */
function pl_job_tail($row) {
    $j = (string)(isset($row['job']) ? $row['job'] : '');
    return $j !== '' ? (' - job ' . $j) : '';
}
function pl_who($row) {
    $n = trim((string)(isset($row['name']) ? $row['name'] : ''));
    if ($n !== '') return $n;
    $e = trim((string)(isset($row['email']) ? $row['email'] : ''));
    return $e !== '' ? $e : 'a customer';
}
function pl_paid_text($row) {
    return ':moneybag: *Paid* - ' . pl_who($row) . ' paid ' . pl_money($row['amount'])
         . ' for ' . (string)$row['desc'] . pl_job_tail($row)
         . '. It will come through in the next GoCardless payout.';
}
function pl_failed_text($row, $why = '') {
    return ':warning: *Payment failed* - ' . pl_who($row) . '&rsquo;s ' . pl_money($row['amount'])
         . ' for ' . (string)$row['desc'] . pl_job_tail($row) . ' did not go through'
         . ($why !== '' ? ' (' . $why . ')' : '') . '. That link is spent - make a new one or take it another way.';
}
function pl_cancelled_text($row) {
    return ':heavy_multiplication_x: *Pay link cancelled* - ' . pl_who($row) . ', ' . pl_money($row['amount'])
         . ' for ' . (string)$row['desc'] . pl_job_tail($row) . '. Nothing was collected.';
}
function pl_change_text($row, $change, $why = '') {
    if ($change === 'paid')      return pl_paid_text($row);
    if ($change === 'failed')    return pl_failed_text($row, $why);
    if ($change === 'cancelled') return pl_cancelled_text($row);
    return '';
}

/* What the console shows in a row. Never includes the link itself - the console
   asks for that separately, so a list view cannot leak one into a screenshot. */
function pl_row_public($row, $now = null) {
    return array(
        'id'      => (string)$row['id'],
        'job'     => (string)(isset($row['job']) ? $row['job'] : ''),
        'name'    => (string)(isset($row['name']) ? $row['name'] : ''),
        'amount'  => (float)$row['amount'],
        'desc'    => (string)(isset($row['desc']) ? $row['desc'] : ''),
        'state'   => pl_row_state($row, $now),
        'created' => (int)(isset($row['created']) ? $row['created'] : 0),
        'expires' => (int)(isset($row['expires']) ? $row['expires'] : 0),
        'sent'    => (int)(isset($row['sent_count']) ? $row['sent_count'] : 0),
        'sent_at' => (int)(isset($row['sent_at']) ? $row['sent_at'] : 0),
        'sent_via' => (string)(isset($row['sent_via']) ? $row['sent_via'] : ''),
        'by'      => (string)(isset($row['by']) ? $row['by'] : ''),
    );
}
