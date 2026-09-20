<?php
/*
 * Staff-only: build a GoCardless payment link for ONE job, for the exact amount
 * agreed, and send it to that customer (20 Sep 2026).
 *
 * WHY
 * The price for a remote job is agreed on the phone and is different every
 * time. Our GoCardless links until now were fixed-amount reusable plan links,
 * so a customer who owed £60 could not pay it through GoCardless at all - only
 * bank transfer, PayPal, or a phone call. This creates a Billing Request for
 * the agreed amount and a hosted Billing Request Flow for that customer: they
 * open it, choose their own bank, approve it in their banking app, and the
 * money moves. We never see a bank detail.
 *
 *   action=create -> {name,email,phone,amount,desc,job?} -> a link + its expiry
 *   action=send   -> {id, via:sms|email, note?} -> sends it to the address or
 *                    number STORED ON THE ROW (never one supplied in the call)
 *   action=status -> {id} -> re-reads the billing request; 'paid' when fulfilled
 *   action=link   -> {id} -> the URL again, for copy/paste
 *   action=list   -> the last N rows WITHOUT their URLs
 *
 * SECURITY
 * - Staff token only, re-implemented locally (same rules as pcm-jobs.php /
 *   pcm-qbo.php / pcm-invite.php - keep the four in step). Fails closed.
 * - ⚠️ The links this makes are SINGLE-USE and personal to one customer. They
 *   may be texted or emailed to that customer and must NEVER be written into a
 *   page, a feed, a sitemap or the repo. The repo is public. pcm-invite.php
 *   refuses exactly this link shape because it publishes reusable plan links;
 *   here the rule is inverted and the store is denied + gitignored instead.
 * - The destination is read from the stored row, so a caller who somehow got a
 *   staff token still cannot make us text an arbitrary number.
 * - The GoCardless token lives in api/pcm-gocardless.php (server-only,
 *   gitignored, .htaccess-denied) and is never echoed, logged or returned.
 * - This endpoint creates PAYMENTS only. It never creates, changes or cancels a
 *   mandate or a subscription, so the 93 monthly Direct Debits cannot be
 *   touched from here.
 *
 * NO closing tag in this file.
 */

@ini_set('display_errors', '0');
header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');

require_once __DIR__ . '/pcm-paylink-lib.php';

$BASE  = __DIR__;
$DATA  = $BASE . '/pcm-data.json';
$STORE = $BASE . '/pcm-paylink.json';        // gitignored + .htaccess-denied
$LOGF  = $BASE . '/pcm-paylink.log';         // gitignored + .htaccess-denied
$GCF   = $BASE . '/pcm-gocardless.php';      // server-only: <?php $GC_TOKEN = 'live_...';
$WEBF  = $BASE . '/slack-webhook-jobs.php';  // the jobs channel webhook

define('GC_API', 'https://api.gocardless.com');
define('GC_VER', '2015-07-06');

function out($a) { echo json_encode($a, JSON_UNESCAPED_SLASHES); exit; }
function fail($e, $x = array()) { out(array_merge(array('ok' => false, 'error' => $e), $x)); }
function lg($m) { global $LOGF; @file_put_contents($LOGF, '[' . gmdate('Y-m-d H:i:s') . 'Z] paylink: ' . $m . "\n", FILE_APPEND | LOCK_EX); }

// ---- input -----------------------------------------------------------------
$raw = file_get_contents('php://input');
$in  = json_decode((string)$raw, true);
if (!is_array($in)) $in = $_POST;
$action  = isset($in['action']) ? preg_replace('/[^a-z]/', '', (string)$in['action']) : '';
$machine = isset($in['machine']) ? preg_replace('/[^A-Za-z0-9._-]/', '', (string)$in['machine']) : '';

// ---- staff auth (mirror of pcm-invite.php / pcm-jobs.php / pcm-qbo.php) -----
function db_read($f) { $j = @json_decode((string)@file_get_contents($f), true); return is_array($j) ? $j : null; }
function need_staff() {
    global $in, $machine, $DATA;
    $tok = isset($in['stoken']) ? preg_replace('/[^a-f0-9]/', '', (string)$in['stoken']) : '';
    if ($tok === '') fail('not_staff');
    $db = db_read($DATA);
    if (!$db) fail('db_unavailable');
    $s = isset($db['staff'][$tok]) ? $db['staff'][$tok] : null;
    $slide = !empty($s['trust']) ? 2592000 : 43200;
    $cap   = !empty($s['trust']) ? 7776000 : 43200;
    $ok = $s
        && (isset($s['ts'])  ? $s['ts']  : 0) > time() - $slide
        && (isset($s['iat']) ? $s['iat'] : 0) > time() - $cap
        && !empty($s['machine']) && $s['machine'] === $machine;
    if (!$ok) fail('not_staff');
    return array($db, $s);
}
list($db, $staff) = need_staff();
$who = trim((string)(isset($staff['name']) ? $staff['name'] : (isset($staff['who']) ? $staff['who'] : '')));
if ($who === '') $who = 'staff';

// ---- GoCardless ------------------------------------------------------------
function gc_token() {
    global $GCF;
    if (!is_readable($GCF)) return '';
    include $GCF;                                   // sets $GC_TOKEN
    return !empty($GC_TOKEN) ? (string)$GC_TOKEN : '';
}
/* One API call. Returns array(http code, decoded body). The token never leaves
   this function, and nothing here is ever written to the log. */
function gc_call($method, $path, $body = null, $idem = '') {
    $tok = gc_token();
    if ($tok === '') return array(0, null);
    $h = array('Authorization: Bearer ' . $tok, 'GoCardless-Version: ' . GC_VER, 'Accept: application/json');
    if ($body !== null) $h[] = 'Content-Type: application/json';
    if ($idem !== '')   $h[] = 'Idempotency-Key: ' . $idem;
    $ch = curl_init(GC_API . $path);
    $opt = array(CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 15, CURLOPT_CONNECTTIMEOUT => 6,
                 CURLOPT_CUSTOMREQUEST => $method, CURLOPT_HTTPHEADER => $h);
    if ($body !== null) $opt[CURLOPT_POSTFIELDS] = json_encode($body, JSON_UNESCAPED_SLASHES);
    curl_setopt_array($ch, $opt);
    $r = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
    return array($code, json_decode((string)$r, true));
}
/* GoCardless returns its reason in errors[].message - useful to the operator
   ("amount must be at least 1"), and never contains our token. */
function gc_why($j) {
    if (!is_array($j) || !isset($j['error'])) return '';
    $e = $j['error'];
    if (isset($e['errors'][0]['message'])) return pl_clean($e['errors'][0]['message'], 140);
    return pl_clean(isset($e['message']) ? $e['message'] : '', 140);
}

// ---- Slack (best effort - a notification must never hold up the money) -----
function jobs_hook() {
    global $WEBF;
    if (!is_file($WEBF)) return '';
    $src = (string)@file_get_contents($WEBF);
    return preg_match('#(https://hooks\.slack\.com/[^\'"\s]+)#', $src, $m) ? $m[1] : '';
}
function slack_note($text) {
    $hook = jobs_hook();
    if ($hook === '') return 'not-configured';
    $ch = curl_init($hook);
    curl_setopt_array($ch, array(CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 8, CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => array('Content-Type: application/json'),
        CURLOPT_POSTFIELDS => json_encode(array('text' => $text, 'unfurl_links' => false), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)));
    @curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
    return ($code >= 200 && $code < 300) ? 'sent' : 'failed';
}

// ===========================================================================
if ($action === 'create') {
    $name   = pl_clean(isset($in['name'])  ? $in['name']  : '', 120);
    $email  = strtolower(pl_clean(isset($in['email']) ? $in['email'] : '', 160));
    $phone  = pl_clean(isset($in['phone']) ? $in['phone'] : '', 40);
    $desc   = pl_desc(isset($in['desc'])   ? $in['desc']   : '');
    $job    = preg_replace('/[^0-9a-zA-Z-]/', '', (string)(isset($in['job']) ? $in['job'] : ''));
    $amount = pl_amount(isset($in['amount']) ? $in['amount'] : '');

    if ($name === '' && $email === '') fail('no_customer');
    if ($desc === '')   fail('no_desc');
    if ($amount === false) fail('bad_amount', array('min' => PL_MIN_AMOUNT, 'max' => PL_MAX_AMOUNT));
    if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) fail('bad_email');
    if ($email === '' && $phone === '') fail('no_destination');      // nothing to send it to
    if (gc_token() === '') fail('no_gocardless');

    $store = pl_store_read($STORE);
    if (pl_count_since($store, time() - 3600) >= PL_MAX_PER_HOUR) fail('rate_limited');

    // Same job, same amount, still payable -> hand back the link we already made.
    $existing = pl_find_reusable($store, $job, $amount);
    if ($existing && empty($in['force'])) {
        out(array('ok' => true, 'id' => $existing['id'], 'url' => $existing['url'],
                  'expires' => (int)$existing['expires'], 'state' => pl_row_state($existing), 'reused' => true));
    }

    // 1. the Billing Request: what is owed, and what it is for.
    //    GBP payment requests default to the faster_payments scheme, which is
    //    what makes this an instant bank payment rather than a Direct Debit.
    //    No mandate_request on purpose - see the header note.
    $idem = substr(hash('sha256', 'paylink|' . $job . '|' . pl_pence($amount) . '|' . $email . '|' . $phone . '|' . date('Y-m-d')), 0, 40);
    list($c1, $j1) = gc_call('POST', '/billing_requests', array('billing_requests' => array(
        'payment_request' => array('description' => $desc, 'amount' => pl_pence($amount), 'currency' => 'GBP'),
        'metadata' => array('job' => ($job !== '' ? $job : '-'), 'by' => pl_clean($who, 40), 'src' => 'staff-console'),
    )), $idem);
    if ($c1 < 200 || $c1 >= 300 || empty($j1['billing_requests']['id'])) {
        lg('create FAILED br http ' . $c1 . ' job ' . $job . ' by ' . $who);
        fail('gc_failed', array('stage' => 'billing_request', 'code' => $c1, 'why' => gc_why($j1)));
    }
    $brId = (string)$j1['billing_requests']['id'];

    // 2. the hosted flow: the page the customer actually opens.
    $pre = array();
    $first = pl_first_name($name);
    $rest  = trim(substr($name, strlen($first)));
    if ($first !== '') $pre['given_name'] = $first;
    if ($rest !== '')  $pre['family_name'] = $rest;
    if ($email !== '') $pre['email'] = $email;
    $flowBody = array('billing_request_flows' => array(
        'links' => array('billing_request' => $brId),
        'exit_uri' => 'https://365techies.co.uk/pay/',          // "not now" lands on our ways-to-pay page
    ));
    if ($pre) $flowBody['billing_request_flows']['prefilled_customer'] = $pre;
    list($c2, $j2) = gc_call('POST', '/billing_request_flows', $flowBody);
    $url = (string)(isset($j2['billing_request_flows']['authorisation_url']) ? $j2['billing_request_flows']['authorisation_url'] : '');
    if ($c2 < 200 || $c2 >= 300 || !pl_flow_link_ok($url)) {
        lg('create FAILED flow http ' . $c2 . ' br ' . $brId . ' by ' . $who);
        fail('gc_failed', array('stage' => 'flow', 'code' => $c2, 'why' => gc_why($j2)));
    }
    $expRaw = (string)(isset($j2['billing_request_flows']['expires_at']) ? $j2['billing_request_flows']['expires_at'] : '');
    $expires = $expRaw !== '' ? (int)strtotime($expRaw) : 0;

    $row = array('id' => pl_new_id(), 'job' => $job, 'name' => $name, 'email' => $email, 'phone' => $phone,
                 'amount' => $amount, 'desc' => $desc, 'br' => $brId,
                 'brf' => (string)$j2['billing_request_flows']['id'], 'url' => $url,
                 'created' => time(), 'expires' => $expires, 'by' => $who,
                 'status' => 'open', 'sent_count' => 0);
    $r = pl_store_locked($STORE, function ($data) use ($row) { $data['links'][] = $row; return array('ok' => true, 'data' => $data); });
    if (empty($r['ok'])) fail(isset($r['error']) ? $r['error'] : 'store');

    lg('created ' . $row['id'] . ' ' . pl_money($amount) . ' job ' . ($job !== '' ? $job : '-') . ' by ' . $who);
    out(array('ok' => true, 'id' => $row['id'], 'url' => $url, 'expires' => $expires, 'state' => 'open'));
}

if ($action === 'send') {
    $id   = preg_replace('/[^0-9a-zA-Z-]/', '', (string)(isset($in['id']) ? $in['id'] : ''));
    $via  = (isset($in['via']) && $in['via'] === 'sms') ? 'sms' : 'email';
    $note = pl_clean(isset($in['note']) ? $in['note'] : '', 300);

    $store = pl_store_read($STORE);
    $row = pl_find($store, $id);
    if (!$row) fail('unknown_link');
    $state = pl_row_state($row);
    if ($state !== 'open') fail('link_' . $state);
    if (!pl_flow_link_ok($row['url'])) fail('bad_link');          // belt and braces before anything is sent

    // The destination comes from the row, never from this request.
    $to = ($via === 'sms') ? (string)$row['phone'] : (string)$row['email'];
    if ($to === '') fail($via === 'sms' ? 'no_mobile' : 'no_email');

    if ($via === 'sms') {
        require_once __DIR__ . '/comms-lib.php';                   // library only, no side effects on include
        $text = pl_msg_sms($row['name'], $row['amount'], $row['desc'], $row['url']);
        if ($note !== '') $text .= ' ' . $note;
        $res = comms_send_sms($to, $text, 'paylink:' . $who);
        $sent = !empty($res['ok']);
        if (!$sent) fail('sms_failed', array('why' => pl_clean(isset($res['error']) ? $res['error'] : '', 60)));
    } else {
        if (!filter_var($to, FILTER_VALIDATE_EMAIL)) fail('bad_email');
        list($subject, $text, $html) = pl_msg_email($row['name'], $row['amount'], $row['desc'], $row['url'], $note);
        $sent = pl_mail($to, $subject, $text, $html);
        if (!$sent) fail('email_failed');
    }

    $stamp = time();
    pl_store_locked($STORE, function ($data) use ($id, $stamp, $via) {
        foreach ($data['links'] as &$r) if ($r['id'] === $id) {
            $r['sent_count'] = (int)(isset($r['sent_count']) ? $r['sent_count'] : 0) + 1;
            $r['sent_at'] = $stamp; $r['sent_via'] = $via;
        }
        unset($r);
        return array('ok' => true, 'data' => $data);
    });
    lg('sent ' . $id . ' by ' . $via . ' to ' . ($via === 'sms' ? substr($to, -4) : $to) . ' by ' . $who);

    $slack = slack_note(':link: *Pay link sent* - ' . ($row['name'] !== '' ? $row['name'] : $to) . ' asked for '
           . pl_money($row['amount']) . ' (' . $row['desc'] . ') by ' . $via . ', sent by ' . $who
           . ($row['job'] !== '' ? ' - job ' . $row['job'] : '') . '. Watch GoCardless for the payment.');
    out(array('ok' => true, 'via' => $via, 'slack' => $slack));
}

if ($action === 'status') {
    $id = preg_replace('/[^0-9a-zA-Z-]/', '', (string)(isset($in['id']) ? $in['id'] : ''));
    $store = pl_store_read($STORE);
    $row = pl_find($store, $id);
    if (!$row) fail('unknown_link');
    if (gc_token() === '') out(array('ok' => true, 'state' => pl_row_state($row), 'checked' => false));

    list($c, $j) = gc_call('GET', '/billing_requests/' . rawurlencode((string)$row['br']));
    if ($c < 200 || $c >= 300) out(array('ok' => true, 'state' => pl_row_state($row), 'checked' => false, 'code' => $c));
    $state = pl_status_from_br(isset($j['billing_requests']) ? $j['billing_requests'] : null);

    if ($state !== 'open' && (string)(isset($row['status']) ? $row['status'] : '') !== $state) {
        $stamp = time();
        pl_store_locked($STORE, function ($data) use ($id, $state, $stamp) {
            foreach ($data['links'] as &$r) if ($r['id'] === $id) { $r['status'] = $state; $r['status_at'] = $stamp; }
            unset($r);
            return array('ok' => true, 'data' => $data);
        });
        lg('status ' . $id . ' -> ' . $state);
        if ($state === 'paid') {
            slack_note(':moneybag: *Paid* - ' . ($row['name'] !== '' ? $row['name'] : $row['email']) . ' paid '
                     . pl_money($row['amount']) . ' (' . $row['desc'] . ')'
                     . ($row['job'] !== '' ? ' - job ' . $row['job'] : '') . ' by bank payment.');
        }
    }
    out(array('ok' => true, 'state' => $state, 'checked' => true));
}

if ($action === 'link') {
    $id = preg_replace('/[^0-9a-zA-Z-]/', '', (string)(isset($in['id']) ? $in['id'] : ''));
    $row = pl_find(pl_store_read($STORE), $id);
    if (!$row) fail('unknown_link');
    out(array('ok' => true, 'url' => (string)$row['url'], 'state' => pl_row_state($row), 'expires' => (int)$row['expires']));
}

if ($action === 'list') {
    $n = max(1, min(50, (int)(isset($in['n']) ? $in['n'] : 10)));
    $job = preg_replace('/[^0-9a-zA-Z-]/', '', (string)(isset($in['job']) ? $in['job'] : ''));
    $rows = array();
    foreach (array_reverse(pl_store_read($STORE)['links']) as $row) {
        if ($job !== '' && (string)(isset($row['job']) ? $row['job'] : '') !== $job) continue;
        $rows[] = pl_row_public($row);
        if (count($rows) >= $n) break;
    }
    out(array('ok' => true, 'links' => $rows, 'gocardless' => (gc_token() !== '' ? 'ready' : 'not-configured')));
}

fail('bad_action');

// ---------------------------------------------------------------------------
// Mail transport: authenticated SMTP if api/pcm-smtp.php is configured, else
// mail() with the envelope sender pinned to our domain. Self-contained copy of
// the same transport pcm-invite.php uses, for the same reason: including the
// review system's file would run its router.
function pl_mail($to, $subject, $text, $html) {
    $to = strtolower(trim((string)$to));
    if (!filter_var($to, FILTER_VALIDATE_EMAIL)) return false;
    $bnd = 'p365' . bin2hex(random_bytes(8));
    $ctype = 'Content-Type: multipart/alternative; boundary="' . $bnd . '"';
    $payload = '--' . $bnd . "\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n" . $text
             . "\r\n--" . $bnd . "\r\nContent-Type: text/html; charset=UTF-8\r\n"
             . "Content-Transfer-Encoding: base64\r\n\r\n"
             . chunk_split(base64_encode($html), 76, "\r\n")
             . '--' . $bnd . "--\r\n";

    $cfg = __DIR__ . '/pcm-smtp.php';
    if (is_readable($cfg)) {
        include $cfg;
        if (!empty($SMTP_HOST) && !empty($SMTP_USER) && !empty($SMTP_PASS)) {
            $env = !empty($SMTP_FROM) ? $SMTP_FROM : $SMTP_USER;
            $port = !empty($SMTP_PORT) ? intval($SMTP_PORT) : 465;
            $fp = @stream_socket_client('ssl://' . $SMTP_HOST . ':' . $port, $en, $es, 8);
            if ($fp) {
                stream_set_timeout($fp, 10);
                $dead = false;
                $say = function ($cmd) use ($fp, &$dead) {
                    if ($dead) return '';
                    if ($cmd !== null) fwrite($fp, $cmd . "\r\n");
                    $line = ''; $n = 0;
                    while (($l = fgets($fp, 512)) !== false) {
                        $md = stream_get_meta_data($fp);
                        if (!empty($md['timed_out'])) { $dead = true; return ''; }
                        $line = $l;
                        if (strlen($l) < 4 || $l[3] !== '-') break;
                        if (++$n > 50) break;
                    }
                    $md = stream_get_meta_data($fp);
                    if (!empty($md['timed_out'])) { $dead = true; return ''; }
                    return $line;
                };
                $ok = true; $say(null);
                $ok = $ok && strpos($say('EHLO 365techies.co.uk'), '250') === 0;
                $ok = $ok && strpos($say('AUTH LOGIN'), '334') === 0;
                $ok = $ok && strpos($say(base64_encode($SMTP_USER)), '334') === 0;
                $ok = $ok && strpos($say(base64_encode($SMTP_PASS)), '235') === 0;
                $ok = $ok && strpos($say('MAIL FROM:<' . $env . '>'), '250') === 0;
                $ok = $ok && strpos($say('RCPT TO:<' . $to . '>'), '250') === 0;
                $ok = $ok && strpos($say('DATA'), '354') === 0;
                if ($ok) {
                    $msg = 'Date: ' . date('r') . "\r\n"
                         . 'Message-ID: <' . bin2hex(random_bytes(8)) . '.' . time() . "@365techies.co.uk>\r\n"
                         . 'From: 365 Techies <info@365techies.co.uk>' . "\r\n"
                         . 'Reply-To: 365 Techies <info@365techies.co.uk>' . "\r\n"
                         . 'To: <' . $to . ">\r\n"
                         . 'Subject: ' . $subject . "\r\n"
                         . "MIME-Version: 1.0\r\n" . $ctype . "\r\n\r\n"
                         . preg_replace('/^\./m', '..', $payload) . "\r\n.";
                    $ok = strpos($say($msg), '250') === 0;
                }
                if (!$dead) @fwrite($fp, "QUIT\r\n");
                fclose($fp);
                if ($ok) return true;
            }
        }
    }
    $hdr = "From: 365 Techies <info@365techies.co.uk>\r\nReply-To: info@365techies.co.uk\r\nMIME-Version: 1.0\r\n" . $ctype;
    return @mail($to, $subject, $payload, $hdr, '-finfo@365techies.co.uk');
}
