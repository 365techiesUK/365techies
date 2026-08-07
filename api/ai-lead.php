<?php
/*
 * Public AI opportunity intake (blueprint docs 05 s28 / 06 s7-9).
 *
 * The /ai/ enquiry form posts here. Contract (doc 06 s9.1): the enquiry is
 * DURABLY stored before the visitor sees success; Slack notification is
 * fire-and-forget afterwards and its failure is recorded on the record, never
 * surfaced to the visitor and never able to lose the lead. First-party browser
 * POSTs to this route work in production (the bot wall intercepts third-party
 * machine POSTs; the same-site pattern here matches slack-lead.php, which
 * ships leads all day) - the webhook prohibition is about provider callbacks,
 * not our own forms.
 *
 * Required fields (doc 06 s7.3): problem + name + email + company.
 * Everything else optional. Honeypot field `website` must be empty.
 * Idempotency: client-supplied `idem` key + server-side 10-minute dedupe.
 * NO closing tag in this file.
 */
error_reporting(0);
date_default_timezone_set('Europe/London');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

require __DIR__ . '/ai-lead-lib.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(['ok' => false, 'error' => 'method']); exit; }

/* soft same-site check, as slack-lead.php */
$src = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : (isset($_SERVER['HTTP_REFERER']) ? $_SERVER['HTTP_REFERER'] : '');
if ($src !== '' && strpos($src, '365techies.co.uk') === false) { http_response_code(403); echo json_encode(['ok' => false, 'error' => 'origin']); exit; }

/* rate limit: max 5 intakes per minute site-wide (leads are rare; floods are bots) */
$RATEF = __DIR__ . '/ai-lead-rate.json';
$min = (int)floor(time() / 60);
$rate = @json_decode((string)@file_get_contents($RATEF), true);
if (!is_array($rate) || !isset($rate['min']) || $rate['min'] !== $min) $rate = ['min' => $min, 'n' => 0];
if ($rate['n'] >= 5) { http_response_code(429); echo json_encode(['ok' => false, 'error' => 'rate']); exit; }
$rate['n']++;
@file_put_contents($RATEF, json_encode($rate), LOCK_EX);

$in = json_decode((string)file_get_contents('php://input'), true);
if (!is_array($in)) { $in = $_POST; }              // accept form-encoded too
if (!is_array($in)) { echo json_encode(['ok' => false, 'error' => 'bad-input']); exit; }

/* honeypot: real visitors never fill this hidden field */
if (trim((string)(isset($in['website']) ? $in['website'] : '')) !== '') {
    echo json_encode(['ok' => true]); exit;        // silently swallow bot fills
}

function ai_clean($v, $max) {
    $v = trim((string)$v);
    $v = preg_replace('/[^\P{C}\n]/u', '', $v);
    if (function_exists('mb_substr')) return mb_substr($v, 0, $max);
    return substr($v, 0, $max);
}

$intake = [
    'problem'   => ai_clean(isset($in['problem']) ? $in['problem'] : '', 4000),
    'category'  => ai_clean(isset($in['category']) ? $in['category'] : '', 60),
    'outcome'   => ai_clean(isset($in['outcome']) ? $in['outcome'] : '', 1000),
    'systems'   => ai_clean(isset($in['systems']) ? $in['systems'] : '', 500),
    'frequency' => ai_clean(isset($in['frequency']) ? $in['frequency'] : '', 40),
    'team_size' => ai_clean(isset($in['team_size']) ? $in['team_size'] : '', 40),
    'timeline'  => ai_clean(isset($in['timeline']) ? $in['timeline'] : '', 40),
    'name'      => ai_clean(isset($in['name']) ? $in['name'] : '', 120),
    'email'     => ai_clean(isset($in['email']) ? $in['email'] : '', 160),
    'phone'     => ai_clean(isset($in['phone']) ? $in['phone'] : '', 60),
    'company'   => ai_clean(isset($in['company']) ? $in['company'] : '', 160),
    'existing_customer' => in_array((string)(isset($in['existing_customer']) ? $in['existing_customer'] : ''), ['YES', 'NO', 'NOT_SURE'], true) ? (string)$in['existing_customer'] : 'NOT_SURE',
    'page'      => ai_clean(isset($in['page']) ? $in['page'] : '', 300),
    'cta'       => ai_clean(isset($in['cta']) ? $in['cta'] : '', 120),
    'ref'       => ai_clean(isset($in['ref']) ? $in['ref'] : '', 300),
    'idem'      => preg_replace('/[^A-Za-z0-9\-]/', '', (string)(isset($in['idem']) ? $in['idem'] : '')),
];

/* doc 06 s7: required = problem + usable B2B contact identity */
$missing = [];
if ($intake['problem'] === '') $missing[] = 'problem';
if ($intake['name'] === '') $missing[] = 'name';
if ($intake['email'] === '' || !filter_var($intake['email'], FILTER_VALIDATE_EMAIL)) $missing[] = 'email';
if ($intake['company'] === '') $missing[] = 'company';
if ($missing) { http_response_code(422); echo json_encode(['ok' => false, 'error' => 'missing', 'fields' => $missing]); exit; }

/* durable first - the visitor only sees success once this has committed */
list($ok, $res) = ai_pipe_create($intake);
if (!$ok || !is_array($res)) { http_response_code(500); echo json_encode(['ok' => false, 'error' => 'store']); exit; }

/* fire-and-forget Slack ping (reuses the server-only webhook secret file);
 * a duplicate submission does not re-notify */
if (!$res['duplicate']) {
    $state = 'failed';
    $cfgsrc = (string)@file_get_contents(__DIR__ . '/slack-webhook.php');
    if (preg_match('#(https://hooks\.slack\.com/[^\'"\s]+)#', $cfgsrc, $mm)) {
        $esc = function ($s) { return str_replace(['&', '<', '>'], ['&amp;', '&lt;', '&gt;'], $s); };
        $fields = [
            ['type' => 'mrkdwn', 'text' => "*Name:*\n" . $esc($intake['name'])],
            ['type' => 'mrkdwn', 'text' => "*Email:*\n" . $esc($intake['email'])],
            ['type' => 'mrkdwn', 'text' => "*Company:*\n" . $esc($intake['company'])],
        ];
        if ($intake['phone'] !== '') $fields[] = ['type' => 'mrkdwn', 'text' => "*Phone:*\n" . $esc($intake['phone'])];
        if ($intake['category'] !== '') $fields[] = ['type' => 'mrkdwn', 'text' => "*Category:*\n" . $esc($intake['category'])];
        if ($intake['existing_customer'] === 'YES') $fields[] = ['type' => 'mrkdwn', 'text' => "*Existing customer*"];
        $blocks = [
            ['type' => 'header', 'text' => ['type' => 'plain_text', 'text' => '🤖 New AI opportunity — ' . $res['id'], 'emoji' => true]],
            ['type' => 'section', 'fields' => array_slice($fields, 0, 10)],
            ['type' => 'section', 'text' => ['type' => 'mrkdwn', 'text' => "*Problem:*\n>" . str_replace("\n", "\n>", $esc($intake['problem']))]],
            ['type' => 'context', 'elements' => [['type' => 'mrkdwn', 'text' => 'via ' . ($intake['page'] !== '' ? $esc($intake['page']) : '/ai/') . ' · ' . date('H:i, D j M')]]],
        ];
        $ch = curl_init($mm[1]);
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 12, CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_POSTFIELDS => json_encode(['text' => 'New AI opportunity ' . $res['id'] . ' from ' . $intake['company'], 'blocks' => $blocks, 'unfurl_links' => false])]);
        $sres = curl_exec($ch); $scode = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE); curl_close($ch);
        if ($scode >= 200 && $scode < 300) $state = 'ok';
    } else {
        $state = 'not-configured';
    }
    ai_pipe_mark_sync($res['id'], 'slack', $state);
}

echo json_encode(['ok' => true, 'ref' => $res['id']]);
