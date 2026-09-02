<?php
/*
 * Staff-only: invite a customer onto a 365 support subscription by emailing them
 * a reusable GoCardless Billing Request Template ("Copy link") URL. The customer
 * opens it, enters their OWN bank details on GoCardless's hosted page, and the
 * Direct Debit / subscription is set up there. We hold NO GoCardless API token
 * (repo is public) - this only ever emails a pre-made reusable link.
 *
 *   action=plans -> the pickable plans as {key,label,amount,note}. Links are NOT
 *                   sent to the client.
 *   action=send  -> {plan, email, name?, note?} -> emails that plan's link,
 *                   logs it, and (if configured) posts a note to the jobs channel.
 *
 * SECURITY MODEL
 * The plan->link map is SERVER-SIDE ($PLANS below + optional pcm-invite-plans.json).
 * The client sends only a plan KEY; the server looks up the link. So a caller can
 * never make us email an arbitrary URL. Every link is validated as a reusable
 * https://pay.gocardless.com/ link and a single-use /billing/static/flow link is
 * refused - the hard rule from the GoCardless integration notes.
 *
 * Staff token only (same rules as pcm-jobs.php / pcm-qbo.php). NO closing tag.
 */

@ini_set('display_errors', '0');
header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');

$BASE   = __DIR__;
$DATA   = $BASE . '/pcm-data.json';
$PLANF  = $BASE . '/pcm-invite-plans.json';        // optional owner override (gitignored)
$WEBF   = $BASE . '/slack-webhook-jobs.php';        // reuse the jobs webhook for a record ping
$LOGF   = $BASE . '/pcm-invite.log';
$GCF    = $BASE . '/pcm-gocardless.php';            // server-only: <?php $GC_TOKEN = 'live_...';  (same file pcm.php uses)
$GCACHE = $BASE . '/pcm-gc-templates.json';         // short cache of the template list (gitignored)

// ---- the plans (server-side authority). Keep the links in step with the
// ---- GOCARDLESS dict in build_pages.py. Each MUST be a reusable Billing Request
// ---- Template ("Copy link") URL - never a single-use flow link. Empty link = hidden.
$PLANS = array(
    'home-support'     => array('label' => 'Home Computer Support (1 PC)',        'amount' => '18.25', 'note' => 'Everything you need for home computing, one computer.',
                                'link' => 'https://pay.gocardless.com/BRT01KY2ECK0E1JSJ9DX0FPG923HW'),
    'home-support-365' => array('label' => 'Home Support + Microsoft 365 (1 PC)', 'amount' => '23.10', 'note' => 'Home support plus a full Microsoft 365 licence.',
                                'link' => 'https://pay.gocardless.com/BRT01KY2E5JE1V186N6Z0FJMVBEJY'),
    // Add Business tiers and multi-PC plans here, or in pcm-invite-plans.json, as
    // you create their Billing Request Templates in the GoCardless dashboard.
);

// Optional server-side override/extension: a JSON object of the same shape.
// Lets the owner add plans without a code deploy. { "key": {label,amount,note,link}, ... }
if (is_readable($PLANF)) {
    $ov = @json_decode((string)@file_get_contents($PLANF), true);
    if (is_array($ov)) foreach ($ov as $k => $v) {
        if (is_array($v) && isset($v['link'])) $PLANS[(string)$k] = array(
            'label'  => (string)(isset($v['label']) ? $v['label'] : $k),
            'amount' => (string)(isset($v['amount']) ? $v['amount'] : ''),
            'note'   => (string)(isset($v['note']) ? $v['note'] : ''),
            'link'   => (string)$v['link']);
    }
}

function out($a) { echo json_encode($a, JSON_UNESCAPED_SLASHES); exit; }
function fail($e, $x = array()) { out(array_merge(array('ok' => false, 'error' => $e), $x)); }
function lg($m) { global $LOGF; @file_put_contents($LOGF, '[' . gmdate('Y-m-d H:i:s') . 'Z] invite: ' . $m . "\n", FILE_APPEND | LOCK_EX); }

// A link we will actually put in an email must be a reusable GoCardless link and
// must NOT be a single-use authorisation flow.
function plan_link_ok($u) {
    $u = (string)$u;
    if (strpos($u, 'https://pay.gocardless.com/') !== 0) return false;
    if (stripos($u, '/billing/static/flow') !== false) return false;   // single-use flow - forbidden
    return true;
}

// ---- input -----------------------------------------------------------------
$raw = file_get_contents('php://input');
$in  = json_decode((string)$raw, true);
if (!is_array($in)) $in = $_POST;
$action  = isset($in['action']) ? preg_replace('/[^a-z]/', '', (string)$in['action']) : '';
$machine = isset($in['machine']) ? preg_replace('/[^A-Za-z0-9._-]/', '', (string)$in['machine']) : '';

// ---- staff auth (mirror of pcm-jobs.php / pcm-qbo.php) ----------------------
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

function clean($v, $max) {
    $v = trim((string)$v);
    $v = preg_replace('/[^\P{C}\n]/u', '', $v);
    return function_exists('mb_substr') ? mb_substr($v, 0, $max) : substr($v, 0, $max);
}
function esc_html($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }

// The plans on offer: LIVE from GoCardless (Billing Request Templates) when the
// $GC_TOKEN is on the server, else the static $PLANS above. GoCardless is the
// authority - it returns each template's own `authorisation_url`, so we never
// reconstruct a link.  Returns key => array(label, amount, note, link).
function invite_plans() {
    global $PLANS;
    $gc = gc_templates();                 // array(id => array(label,amount,link)) or null
    if (is_array($gc) && count($gc)) {
        $out = array();
        foreach ($gc as $id => $t) $out[$id] = array('label' => $t['label'], 'amount' => $t['amount'], 'note' => '', 'link' => $t['link']);
        return $out;
    }
    return $PLANS;                         // fallback: static seed / pcm-invite-plans.json
}

// ===========================================================================
if ($action === 'plans') {
    $list = array();
    foreach (invite_plans() as $k => $p) {
        if (empty($p['link']) || !plan_link_ok($p['link'])) continue;
        $list[] = array('key' => (string)$k, 'label' => (string)$p['label'],
                        'amount' => (string)$p['amount'], 'note' => (string)(isset($p['note']) ? $p['note'] : ''));
    }
    out(array('ok' => true, 'plans' => $list, 'source' => (gc_available() ? 'gocardless' : 'config')));
}

if ($action === 'send') {
    $planKey = isset($in['plan']) ? preg_replace('/[^A-Za-z0-9_-]/', '', (string)$in['plan']) : '';
    $email   = strtolower(clean(isset($in['email']) ? $in['email'] : '', 160));
    $name    = clean(isset($in['name']) ? $in['name'] : '', 120);
    $note    = clean(isset($in['note']) ? $in['note'] : '', 400);

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) fail('bad_email');
    $plans = invite_plans();
    if (!isset($plans[$planKey])) fail('bad_plan');
    $plan = $plans[$planKey];
    if (empty($plan['link']) || !plan_link_ok($plan['link'])) fail('plan_link_bad');

    $first = trim((string)$name);
    if ($first !== '') { $parts = preg_split('/\s+/', $first); $first = $parts[0]; }
    $hi = ($first !== '') ? 'Hi ' . $first . ',' : 'Hello,';
    $label  = (string)$plan['label'];
    $amount = (string)$plan['amount'];
    $amtTxt = ($amount !== '') ? ('&pound;' . $amount . ' a month') : 'the agreed monthly amount';
    $amtPlain = ($amount !== '') ? ('GBP ' . $amount . ' a month') : 'the agreed monthly amount';
    $link = (string)$plan['link'];
    $subject = 'Set up your 365 Techies support plan';

    // ---- plain text ----
    $text = $hi . "\n\n"
        . "Thanks for choosing 365 Techies. Here's the secure link to set up your\n"
        . $label . " plan (" . $amtPlain . ") by Direct Debit:\n\n"
        . $link . "\n\n";
    if ($note !== '') $text .= $note . "\n\n";
    $text .= "You'll enter your own details on GoCardless's secure page - we never see\n"
        . "your bank details. It only takes a minute, and you're protected by the\n"
        . "Direct Debit Guarantee: we always tell you before a payment, any error is\n"
        . "refunded straight away, and you can cancel any time.\n\n"
        . "Any questions, just reply to this email or call us on 01202 775566.\n\n"
        . "365 Techies\n01202 775566 - 365techies.co.uk\nPayments handled securely by GoCardless.\n";

    // ---- HTML ----
    $noteHtml = ($note !== '') ? '<p style="margin:0 0 16px">' . nl2br(esc_html($note)) . '</p>' : '';
    $html = '<!doctype html><html><body style="margin:0;background:#f4f6f9;font-family:Arial,Helvetica,sans-serif;color:#1a2433">'
        . '<div style="max-width:520px;margin:0 auto;padding:24px">'
        . '<div style="background:#fff;border-radius:14px;padding:28px 26px;box-shadow:0 1px 3px rgba(0,0,0,.08)">'
        . '<p style="font-size:16px;margin:0 0 14px">' . esc_html($hi) . '</p>'
        . '<p style="margin:0 0 16px">Thanks for choosing <strong>365 Techies</strong>. Here&rsquo;s your secure link to set up the <strong>' . esc_html($label) . '</strong> plan (' . $amtTxt . ') by Direct Debit.</p>'
        . $noteHtml
        . '<p style="text-align:center;margin:26px 0"><a href="' . esc_html($link) . '" style="display:inline-block;background:#0a8f4c;color:#fff;text-decoration:none;font-weight:bold;font-size:16px;padding:14px 30px;border-radius:10px">Set up my Direct Debit</a></p>'
        . '<p style="font-size:13px;color:#4a5568;margin:0 0 14px">You&rsquo;ll enter your own details on GoCardless&rsquo;s secure page &mdash; <strong>we never see your bank details</strong>. It takes about a minute.</p>'
        . '<div style="background:#f0f7f2;border-radius:10px;padding:14px 16px;font-size:13px;color:#2f4a39;margin:0 0 16px">'
        . '<strong>Protected by the Direct Debit Guarantee</strong><br>We always tell you before a payment &middot; any error is refunded straight away &middot; cancel any time.</div>'
        . '<p style="font-size:13px;color:#4a5568;margin:0">Any questions, just reply to this email or call <strong>01202&nbsp;775566</strong>.</p>'
        . '</div>'
        . '<p style="text-align:center;color:#8a94a6;font-size:11px;margin:16px 0 0">365 Techies &middot; 01202 775566 &middot; 365techies.co.uk<br>Payments handled securely by GoCardless.</p>'
        . '</div></body></html>';

    $sent = inv_mail($email, $subject, $text, $html);
    lg(($sent ? 'sent' : 'FAILED') . ' ' . $planKey . ' to ' . $email . ' by ' . $who);
    if (!$sent) fail('send_failed');

    // Record ping (best effort) so the team knows to watch GoCardless for the mandate.
    invite_slack_ping($name !== '' ? $name : $email, $label, $amount, $who);

    out(array('ok' => true, 'plan' => $label, 'email' => $email));
}

fail('bad_action');

// ---------------------------------------------------------------------------
// Mail transport: authenticated SMTP if api/pcm-smtp.php is configured, else
// mail() with the envelope sender pinned to our domain. Self-contained copy of
// the review system's transport so we never include that file (its router runs
// on include). Sends multipart/alternative (text + HTML).
function inv_mail($to, $subject, $text, $html) {
    $to = strtolower(trim((string)$to));
    if (!filter_var($to, FILTER_VALIDATE_EMAIL)) return false;
    $bnd = 'i365' . bin2hex(random_bytes(8));
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

// ---- GoCardless (read-only): list Billing Request Templates as pickable plans.
// Same token + API the subscription summary uses (pcm.php). We only READ; we
// never create a billing request or move money here.
function gc_available() {
    global $GCF;
    if (!is_readable($GCF)) return false;
    include $GCF;                          // sets $GC_TOKEN
    return !empty($GC_TOKEN);
}
function gc_templates() {
    global $GCF, $GCACHE;
    if (!is_readable($GCF)) return null;
    include $GCF;
    if (empty($GC_TOKEN)) return null;

    // 10-minute cache so opening the dropdown doesn't hit the API every time.
    $c = @json_decode((string)@file_get_contents($GCACHE), true);
    if (is_array($c) && isset($c['at'], $c['plans']) && $c['at'] > time() - 600) return $c['plans'];

    $ch = curl_init('https://api.gocardless.com/billing_request_templates?limit=200');
    curl_setopt_array($ch, array(CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 12,
        CURLOPT_HTTPHEADER => array('Authorization: Bearer ' . $GC_TOKEN, 'GoCardless-Version: 2015-07-06', 'Accept: application/json')));
    $r = curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
    if ($code < 200 || $code >= 300) return (is_array($c) && isset($c['plans'])) ? $c['plans'] : null;   // serve stale on a blip
    $j = json_decode((string)$r, true);
    $tpls = (is_array($j) && isset($j['billing_request_templates'])) ? $j['billing_request_templates'] : array();

    $plans = array();
    foreach ((array)$tpls as $t) {
        if (!is_array($t)) continue;
        $id  = (string)(isset($t['id']) ? $t['id'] : '');
        $url = (string)(isset($t['authorisation_url']) ? $t['authorisation_url'] : '');
        if ($id === '' || !plan_link_ok($url)) continue;          // must be a usable reusable link
        $name = trim((string)(isset($t['name']) ? $t['name'] : '')); if ($name === '') $name = $id;
        // Amount: templates that carry a fixed payment expose payment_request_amount (in pence).
        $amt = '';
        if (isset($t['payment_request_amount']) && is_numeric($t['payment_request_amount']))
            $amt = number_format(((float)$t['payment_request_amount']) / 100, 2, '.', '');
        $plans[$id] = array('label' => $name, 'amount' => $amt, 'link' => $url);
    }
    // atomic cache write (ok to fail silently)
    $tmp = $GCACHE . '.' . getmypid() . '.tmp';
    if (@file_put_contents($tmp, json_encode(array('at' => time(), 'plans' => $plans)), LOCK_EX) !== false) @rename($tmp, $GCACHE);
    return $plans;
}

function jobs_hook_present() {
    global $WEBF;
    if (!is_file($WEBF)) return '';
    $src = (string)@file_get_contents($WEBF);
    return preg_match('#(https://hooks\.slack\.com/[^\'"\s]+)#', $src, $m) ? $m[1] : '';
}
function invite_slack_ping($who, $label, $amount, $by) {
    $hook = jobs_hook_present();
    if ($hook === '') return;
    $amt = ($amount !== '') ? (' (£' . $amount . '/mo)') : '';
    $text = ':envelope_with_arrow: *Plan invite sent* - ' . $who . ' invited to *' . $label . '*' . $amt
          . ' by ' . $by . '. Watch GoCardless for the new mandate.';
    $ch = curl_init($hook);
    curl_setopt_array($ch, array(CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 8, CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => array('Content-Type: application/json'),
        CURLOPT_POSTFIELDS => json_encode(array('text' => $text), JSON_UNESCAPED_SLASHES)));
    @curl_exec($ch); @curl_close($ch);
}
