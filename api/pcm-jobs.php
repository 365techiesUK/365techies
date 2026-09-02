<?php
/*
 * Staff-only: record an agreed quote and post ONE Slack card per job.
 *
 * WHY THIS EXISTS
 * The price for a remote fix is agreed on the phone and then lives in the
 * technician's head. David, who raises the invoice, had nowhere to find it.
 * The enquiry itself goes to HubSpot and to #365-job-tracker (the firehose:
 * enquiries, SMS, SimplyBook changes) but the agreed job never got written
 * down anywhere he could act on.
 *
 * WHAT IT DOES
 *   action=quote  -> validates, appends the job to pcm-jobs.json (flock +
 *                    atomic rename, capped), then posts a Block Kit card to the
 *                    #daily-jobs-in-jobs-out Incoming Webhook. One post per
 *                    job, so each can be replied to in its own thread - Steve's
 *                    stated requirement on 2026-08-25.
 *   action=recent -> the last N jobs, for the console.
 *
 * The card carries everything the invoice needs: name, email, phone, address
 * if we hold one, the job, the amount, who agreed it, and - when QuickBooks is
 * connected and the console got a draft back - the link to that draft.
 *
 * WEBHOOK
 * Read from api/slack-webhook-jobs.php (gitignored + .htaccess-denied), the URL
 * pattern-extracted exactly like slack-lead.php does with slack-webhook.php, so
 * a pasted file with stray quotes or a PHP wrapper still works. An Incoming
 * Webhook is bound to ONE channel, which is why this is a second file and not
 * the existing one. Missing file = the job is STILL SAVED and the response says
 * slack:'not-configured' - the record must never depend on the notification.
 *
 * SECURITY
 * Staff token only, re-implemented locally (same rules as pcm-qbo.php and
 * need_staff() in pcm-booking.php - keep them in step). Fails closed. Customer
 * PII goes to Slack deliberately: that is the point, and #daily-jobs-in-jobs-out
 * is the two-person channel David made for it. NO closing tag in this file.
 */

@ini_set('display_errors', '0');
header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');

$BASE  = __DIR__;
$DATA  = $BASE . '/pcm-data.json';
$JOBS  = $BASE . '/pcm-jobs.json';
$WEBF  = $BASE . '/slack-webhook-jobs.php';
$LOGF  = $BASE . '/pcm-jobs.log';
$MAX_JOBS = 2000;

function out($a) { echo json_encode($a, JSON_UNESCAPED_SLASHES); exit; }
function fail($e, $extra = array()) { out(array_merge(array('ok' => false, 'error' => $e), $extra)); }
function lg($m) { global $LOGF; @file_put_contents($LOGF, '[' . gmdate('Y-m-d H:i:s') . 'Z] jobs: ' . $m . "\n", FILE_APPEND | LOCK_EX); }

// ---- input ---------------------------------------------------------------
$raw = file_get_contents('php://input');
$in  = json_decode((string)$raw, true);
if (!is_array($in)) $in = $_POST;
$action  = isset($in['action']) ? preg_replace('/[^a-z]/', '', (string)$in['action']) : '';
$machine = isset($in['machine']) ? preg_replace('/[^A-Za-z0-9._-]/', '', (string)$in['machine']) : '';

// ---- staff auth (mirror of pcm-qbo.php / pcm-booking.php need_staff) ------
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
        && !empty($s['machine']) && $s['machine'] === $machine;   // fail closed
    if (!$ok) fail('not_staff');
    return array($db, $s);
}
list($db, $staff) = need_staff();
$who = trim((string)(isset($staff['name']) ? $staff['name'] : (isset($staff['who']) ? $staff['who'] : '')));
if ($who === '') $who = 'staff';

// ---- store helpers (flock + atomic rename, like every other store here) ---
function jobs_locked($fn) {
    global $JOBS;
    $lock = $JOBS . '.lock';
    $h = @fopen($lock, 'c');
    if (!$h || !flock($h, LOCK_EX)) { if ($h) fclose($h); return array('ok' => false, 'error' => 'busy'); }
    $data = @json_decode((string)@file_get_contents($JOBS), true);
    if (!is_array($data)) $data = array('jobs' => array());
    if (!isset($data['jobs']) || !is_array($data['jobs'])) $data['jobs'] = array();
    $r = $fn($data);
    if (isset($r['data'])) {
        $tmp = $JOBS . '.' . getmypid() . '.tmp';
        $j = json_encode($r['data'], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        if ($j !== false && @file_put_contents($tmp, $j, LOCK_EX) !== false) @rename($tmp, $JOBS); else @unlink($tmp);
    }
    flock($h, LOCK_UN); fclose($h);
    return $r;
}
function clean($v, $max) {
    $v = trim((string)$v);
    $v = preg_replace('/[^\P{C}\n]/u', '', $v);
    return function_exists('mb_substr') ? mb_substr($v, 0, $max) : substr($v, 0, $max);
}
function slack_esc($s) { return str_replace(array('&', '<', '>'), array('&amp;', '&lt;', '&gt;'), $s); }

// ---- webhook -------------------------------------------------------------
function jobs_hook() {
    global $WEBF;
    if (!is_file($WEBF)) return '';
    $src = (string)@file_get_contents($WEBF);
    return preg_match('#(https://hooks\.slack\.com/[^\'"\s]+)#', $src, $m) ? $m[1] : '';
}
function slack_send($hook, $payload) {
    $ch = curl_init($hook);
    curl_setopt_array($ch, array(
        CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 12, CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => array('Content-Type: application/json'),
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)));
    $res = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
    return array($code >= 200 && $code < 300, $code, substr((string)$res, 0, 120));
}

// ===========================================================================
if ($action === 'recent') {
    $n = max(1, min(50, (int)(isset($in['n']) ? $in['n'] : 20)));
    $data = @json_decode((string)@file_get_contents($JOBS), true);
    $jobs = (is_array($data) && isset($data['jobs']) && is_array($data['jobs'])) ? $data['jobs'] : array();
    out(array('ok' => true, 'jobs' => array_slice(array_reverse($jobs), 0, $n), 'slack' => (jobs_hook() !== '' ? 'ready' : 'not-configured')));
}

if ($action === 'quote') {
    $name  = clean(isset($in['name'])  ? $in['name']  : '', 120);
    $email = strtolower(clean(isset($in['email']) ? $in['email'] : '', 160));
    $phone = clean(isset($in['phone']) ? $in['phone'] : '', 60);
    $desc  = clean(isset($in['desc'])  ? $in['desc']  : '', 300);
    $note  = clean(isset($in['note'])  ? $in['note']  : '', 500);
    $addr  = clean(isset($in['addr'])  ? $in['addr']  : '', 300);
    $invU  = clean(isset($in['invoice_url']) ? $in['invoice_url'] : '', 300);
    $invN  = clean(isset($in['invoice_no'])  ? $in['invoice_no']  : '', 40);
    $qbo   = clean(isset($in['qbo']) ? $in['qbo'] : '', 60);   // what the console learned from pcm-qbo.php
    $amountRaw = (string)(isset($in['amount']) ? $in['amount'] : '');
    $amount = ($amountRaw === '') ? 0.0 : round((float)preg_replace('/[^0-9.]/', '', $amountRaw), 2);

    if ($name === '' && $email === '') fail('no_customer');
    if ($desc === '') fail('no_desc');
    if ($amount <= 0 || $amount > 100000) fail('bad_amount');
    if ($invU !== '' && !preg_match('#^https://[a-z0-9.-]*intuit\.com/#i', $invU)) $invU = '';   // only ever link to QuickBooks

    $id = date('ymd') . '-' . substr(bin2hex(random_bytes(3)), 0, 5);
    $job = array('id' => $id, 'ts' => time(), 'by' => $who, 'name' => $name, 'email' => $email, 'phone' => $phone,
                 'addr' => $addr, 'desc' => $desc, 'note' => $note, 'amount' => $amount,
                 'invoice_url' => $invU, 'invoice_no' => $invN, 'qbo' => $qbo, 'status' => 'quoted');

    $r = jobs_locked(function ($data) use ($job) {
        global $MAX_JOBS;
        $data['jobs'][] = $job;
        if (count($data['jobs']) > $MAX_JOBS) $data['jobs'] = array_slice($data['jobs'], -$MAX_JOBS);
        return array('ok' => true, 'data' => $data);
    });
    if (empty($r['ok'])) fail(isset($r['error']) ? $r['error'] : 'store');
    lg('quote ' . $id . ' ' . $email . ' £' . number_format($amount, 2) . ' by ' . $who);

    // ---- the Slack card: one post per job ----
    $hook = jobs_hook();
    $slack = 'not-configured'; $scode = 0;
    if ($hook !== '') {
        $fields = array();
        if ($name !== '')  $fields[] = array('type' => 'mrkdwn', 'text' => "*Customer:*\n" . slack_esc($name));
        $fields[] = array('type' => 'mrkdwn', 'text' => "*Agreed:*\n£" . number_format($amount, 2));
        if ($email !== '') $fields[] = array('type' => 'mrkdwn', 'text' => "*Email:*\n" . slack_esc($email));
        if ($phone !== '') $fields[] = array('type' => 'mrkdwn', 'text' => "*Phone:*\n" . slack_esc($phone));
        if ($addr !== '')  $fields[] = array('type' => 'mrkdwn', 'text' => "*Address:*\n" . slack_esc($addr));

        $blocks = array(
            array('type' => 'header', 'text' => array('type' => 'plain_text', 'text' => '💷 Quote agreed — ' . ($name !== '' ? $name : $email), 'emoji' => true)),
            array('type' => 'section', 'text' => array('type' => 'mrkdwn', 'text' => "*Job:* " . slack_esc($desc))),
            array('type' => 'section', 'fields' => array_slice($fields, 0, 10)),
        );
        if ($note !== '') $blocks[] = array('type' => 'section', 'text' => array('type' => 'mrkdwn', 'text' => "*Notes:*\n>" . str_replace("\n", "\n>", slack_esc($note))));
        if ($invU !== '') {
            $blocks[] = array('type' => 'section', 'text' => array('type' => 'mrkdwn',
                'text' => "✅ *Draft invoice ready in QuickBooks* — <" . $invU . "|open it" . ($invN !== '' ? ' (#' . slack_esc($invN) . ')' : '') . "> and press send."));
        } else {
            $blocks[] = array('type' => 'section', 'text' => array('type' => 'mrkdwn',
                'text' => "📝 *To do:* raise the invoice in QuickBooks from the details above." .
                          ($qbo === 'no_config' ? " _(QuickBooks isn't connected to the portal yet, so this one is by hand.)_" : "")));
        }
        $blocks[] = array('type' => 'context', 'elements' => array(array('type' => 'mrkdwn',
            'text' => 'Agreed by ' . slack_esc($who) . ' · ' . date('H:i, D j M') . ' · job ' . $id . ' · reply in this thread when it\'s sent and when it\'s paid')));

        $summary = 'Quote agreed: ' . ($name !== '' ? $name : $email) . ' — ' . $desc . ' — £' . number_format($amount, 2);
        list($okS, $scode, $body) = slack_send($hook, array('text' => $summary, 'blocks' => $blocks, 'unfurl_links' => false));
        $slack = $okS ? 'sent' : 'failed';
        if (!$okS) lg('slack failed ' . $scode . ' ' . $body . ' for ' . $id);
    }
    out(array('ok' => true, 'id' => $id, 'slack' => $slack, 'slack_code' => $scode));
}

fail('bad_action');
