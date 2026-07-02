<?php
/*
 * Website lead -> Slack relay for 365techies.co.uk.
 *
 * Every <form class="contact-form"> (contact, quick-quote, etc. via js/forms.js) posts a
 * copy of the enquiry here in parallel with HubSpot; this relay formats it and posts it
 * to a Slack channel via an incoming webhook — so new leads ping the team instantly.
 *
 * SECURITY: the webhook URL is NOT in this file and NOT in git (public repo). It lives in
 * api/slack-webhook.php on the server only (gitignored + .htaccess-denied), one line:
 *     <?php $SLACK_WEBHOOK = 'https://hooks.slack.com/services/XXXX/XXXX/XXXX';
 * The URL is extracted by pattern (formatting-immune). Light rate-limiting protects the
 * channel from spam floods; failures here never affect the visitor (fire-and-forget).
 */
error_reporting(0);
date_default_timezone_set('Europe/London');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$PROBE = isset($_GET['probe']);
if (!$PROBE && $_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(['ok' => false, 'error' => 'method']); exit; }

/* soft same-site check: if the browser sent an origin/referer, it must be ours */
$src = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : (isset($_SERVER['HTTP_REFERER']) ? $_SERVER['HTTP_REFERER'] : '');
if ($src !== '' && strpos($src, '365techies.co.uk') === false) { http_response_code(403); echo json_encode(['ok' => false, 'error' => 'origin']); exit; }

$WEBF = __DIR__ . '/slack-webhook.php';
if (!is_file($WEBF)) { echo json_encode(['ok' => false, 'error' => 'not-configured']); exit; }
$cfgsrc = (string)@file_get_contents($WEBF);
$HOOK = preg_match('#(https://hooks\.slack\.com/[^\'"\s]+)#', $cfgsrc, $mm) ? $mm[1] : '';
if ($HOOK === '') { echo json_encode(['ok' => false, 'error' => 'not-configured']); exit; }

/* rate limit: max 8 messages per minute (site-wide) */
$RATEF = __DIR__ . '/slack-rate.json';
$min = (int)floor(time() / 60);
$rate = @json_decode((string)@file_get_contents($RATEF), true);
if (!is_array($rate) || !isset($rate['min']) || $rate['min'] !== $min) $rate = ['min' => $min, 'n' => 0];
if ($rate['n'] >= 8) { http_response_code(429); echo json_encode(['ok' => false, 'error' => 'rate']); exit; }
$rate['n']++;
@file_put_contents($RATEF, json_encode($rate), LOCK_EX);

if ($PROBE) {  // diagnostic: send a minimal test message and surface Slack's exact response (rate-limited like everything else)
    $ch = curl_init($HOOK);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 12, CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode(['text' => 'Webhook test from 365techies.co.uk — connection working ✓'])]);
    $res = curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE); $cerr = curl_error($ch); curl_close($ch);
    $mask = preg_replace('#(hooks\.slack\.com/[a-z]+/[^/]+/).*#', '$1…', $HOOK);
    echo json_encode(['ok' => ($code >= 200 && $code < 300), 'slackCode' => $code, 'slackBody' => substr((string)$res, 0, 150), 'curlErr' => $cerr, 'hook' => $mask]); exit;
}

$in = json_decode((string)file_get_contents('php://input'), true);
if (!is_array($in)) { echo json_encode(['ok' => false, 'error' => 'bad-json']); exit; }

function clean($v, $max) {
    $v = trim((string)$v);
    $v = preg_replace('/[^\P{C}\n]/u', '', $v);        // strip control chars except newline
    if (function_exists('mb_substr')) return mb_substr($v, 0, $max);
    return substr($v, 0, $max);
}
$name    = clean(isset($in['name']) ? $in['name'] : '', 120);
$email   = clean(isset($in['email']) ? $in['email'] : '', 160);
$phone   = clean(isset($in['phone']) ? $in['phone'] : '', 60);
$company = clean(isset($in['company']) ? $in['company'] : '', 160);
$topic   = clean(isset($in['topic']) ? $in['topic'] : '', 120);
$msg     = clean(isset($in['message']) ? $in['message'] : '', 2500);
$page    = clean(isset($in['page']) ? $in['page'] : '', 300);

if ($email === '' && $phone === '' && $msg === '') { echo json_encode(['ok' => false, 'error' => 'empty']); exit; }

function esc($s) { return str_replace(['&', '<', '>'], ['&amp;', '&lt;', '&gt;'], $s); }

$fields = [];
if ($name !== '')    $fields[] = ['type' => 'mrkdwn', 'text' => "*Name:*\n" . esc($name)];
if ($email !== '')   $fields[] = ['type' => 'mrkdwn', 'text' => "*Email:*\n" . esc($email)];
if ($phone !== '')   $fields[] = ['type' => 'mrkdwn', 'text' => "*Phone:*\n" . esc($phone)];
if ($company !== '') $fields[] = ['type' => 'mrkdwn', 'text' => "*Company:*\n" . esc($company)];
if ($topic !== '')   $fields[] = ['type' => 'mrkdwn', 'text' => "*Needs help with:*\n" . esc($topic)];

$blocks = [['type' => 'header', 'text' => ['type' => 'plain_text', 'text' => '🔔 New website enquiry', 'emoji' => true]]];
if ($fields) $blocks[] = ['type' => 'section', 'fields' => array_slice($fields, 0, 10)];
if ($msg !== '') $blocks[] = ['type' => 'section', 'text' => ['type' => 'mrkdwn', 'text' => "*Message:*\n>" . str_replace("\n", "\n>", esc($msg))]];
$ctx = 'via ' . ($page !== '' ? esc($page) : '365techies.co.uk') . ' · ' . date('H:i, D j M');
$blocks[] = ['type' => 'context', 'elements' => [['type' => 'mrkdwn', 'text' => $ctx]]];

$summary = 'New website enquiry' . ($name !== '' ? ' from ' . $name : '') . ($email !== '' ? ' <' . $email . '>' : '');
$payload = json_encode(['text' => $summary, 'blocks' => $blocks, 'unfurl_links' => false]);

$ch = curl_init($HOOK);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 12,
    CURLOPT_POST           => true,
    CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
    CURLOPT_POSTFIELDS     => $payload,
]);
$res  = curl_exec($ch);
$code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
curl_close($ch);

echo json_encode(['ok' => ($code >= 200 && $code < 300)]);
