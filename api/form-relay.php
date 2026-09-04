<?php
/*
 * Native-POST fallback for the website's contact forms.
 *
 * The normal path is js/forms.js (HubSpot + Slack, no page reload). This endpoint
 * only receives a submission when JavaScript hasn't attached — blocked scripts,
 * very old browsers, or a submit that beats the deferred JS. It used to be a
 * mailto: fallback, which silently dead-ends for webmail users (most of our
 * older audience); a plain server POST works for everyone.
 *
 * Flow: honeypot + soft same-site check + light rate limit -> post the enquiry
 * to Slack (webhook lives ONLY in api/slack-webhook.php on the server: gitignored,
 * .htaccess-denied; extracted by pattern so file formatting can't break it) and
 * email help@ via PHP mail() -> 303 redirect to /contact/#message-sent, where a
 * CSS :target block confirms receipt without any JavaScript.
 */
error_reporting(0);
date_default_timezone_set('Europe/London');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') { header('Location: /contact/', true, 303); exit; }

/* honeypot — bots fill it, humans never see it */
if (!empty($_POST['company_website'])) { header('Location: /contact/#message-sent', true, 303); exit; }

/* soft same-site check */
$src = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : (isset($_SERVER['HTTP_REFERER']) ? $_SERVER['HTTP_REFERER'] : '');
if ($src !== '' && strpos($src, '365techies.co.uk') === false) { http_response_code(403); exit; }

/* light rate limit: 1 native submission per 20s per IP */
$rl = sys_get_temp_dir() . '/tt_formrelay_' . md5(isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : 'x');
if (file_exists($rl) && (time() - filemtime($rl)) < 20) { header('Location: /contact/#message-sent', true, 303); exit; }
@touch($rl);

$clean = function ($v) { return trim(preg_replace('/[\r\n\t]+/', ' ', substr((string)$v, 0, 2000))); };
$lines = array();
$order = array('name', 'email', 'phone', 'company', 'topic', 'message');
foreach ($order as $k) {
  if (!empty($_POST[$k])) $lines[] = ucfirst($k) . ': ' . $clean($_POST[$k]);
}
foreach ($_POST as $k => $v) {
  if (in_array($k, $order) || $k === 'company_website' || $v === '') continue;
  $lines[] = $clean($k) . ': ' . $clean($v);
}
$page = isset($_SERVER['HTTP_REFERER']) ? $clean($_SERVER['HTTP_REFERER']) : '(unknown page)';
$body = "Website enquiry (no-JS fallback)\n" . implode("\n", $lines) . "\nPage: " . $page . "\nTime: " . date('Y-m-d H:i');

/* Slack + email are the ONLY two paths an enquiry can take, and until now the
   result of both was thrown away: curl_exec()'s return was discarded and mail()
   was called with @, so a customer could be shown "message sent" while nothing
   reached anybody. Both outcomes are now recorded. */
$slackCode = 0; $slackErr = 'not attempted';

/* Slack (fire-and-forget; same server-only webhook file as slack-lead.php) */
$WEBF = __DIR__ . '/slack-webhook.php';
if (is_readable($WEBF)) {
  $raw = file_get_contents($WEBF);
  if ($raw && preg_match('~https://hooks\.slack\.com/services/[A-Za-z0-9/_-]+~', $raw, $m)) {
    $ch = curl_init($m[0]);
    curl_setopt_array($ch, array(
      CURLOPT_POST => true,
      CURLOPT_HTTPHEADER => array('Content-Type: application/json'),
      CURLOPT_POSTFIELDS => json_encode(array('text' => $body)),
      CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 5,
    ));
    curl_exec($ch);
    $slackCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $slackErr  = curl_error($ch);
    curl_close($ch);
  }
}

/* email copy — best effort; the redirect happens regardless */
$replyTo = (!empty($_POST['email']) && filter_var($_POST['email'], FILTER_VALIDATE_EMAIL)) ? $_POST['email'] : 'help@365techies.co.uk';
$mailOk = @mail('help@365techies.co.uk',
      'Website enquiry' . (!empty($_POST['topic']) ? ' - ' . $clean($_POST['topic']) : ''),
      $body,
      'From: website@365techies.co.uk' . "\r\n" . 'Reply-To: ' . $clean($replyTo));

/* One line per enquiry, so a lost one leaves a trace. Denied in .htaccess and
   gitignored: it carries the enquirer's email address.
   ⚠️ If a line here reads slack=0 and mail=0, that enquiry reached NOBODY and
   the customer was still shown the success page. */
$logLine = sprintf("%s slack=%d mail=%d%s email=%s topic=%s page=%s\n",
    gmdate('c'), $slackCode, $mailOk ? 1 : 0,
    ($slackErr !== '' && $slackErr !== 'not attempted') ? ' slackerr=' . str_replace("\n", ' ', $slackErr) : '',
    isset($_POST['email']) ? substr(preg_replace('/[^A-Za-z0-9@._+-]/', '', (string)$_POST['email']), 0, 80) : '-',
    isset($_POST['topic']) ? substr(preg_replace('/[^A-Za-z0-9 _-]/', '', (string)$_POST['topic']), 0, 40) : '-',
    substr($page, 0, 120));
@file_put_contents(__DIR__ . '/form-relay.log', $logLine, FILE_APPEND | LOCK_EX);

header('Location: /contact/#message-sent', true, 303);
exit;
