<?php
/*
 * 365 PC Manager launch WAITLIST capture for 365techies.co.uk.
 * Stores a sign-up server-side (pcm-waitlist.json) and pings Slack for each new one.
 *
 * SECURITY: the store holds customer emails = PII, and this repo is PUBLIC, so
 * pcm-waitlist.json (+ the rate file) MUST be gitignored and never committed. The Slack
 * webhook URL is NOT here and NOT in git - it lives only in api/slack-webhook.php on the
 * server (extracted by pattern). Honeypot + rate-limit keep bots/spam out. Fire-and-forget:
 * a Slack failure never affects the visitor.
 */
error_reporting(0);
date_default_timezone_set('Europe/London');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(['ok' => false, 'error' => 'method']); exit; }

/* soft same-site check: if the browser sent an origin/referer, it must be ours */
$src = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : (isset($_SERVER['HTTP_REFERER']) ? $_SERVER['HTTP_REFERER'] : '');
if ($src !== '' && strpos($src, '365techies.co.uk') === false) { http_response_code(403); echo json_encode(['ok' => false, 'error' => 'origin']); exit; }

$in = json_decode((string)file_get_contents('php://input'), true);
if (!is_array($in)) { echo json_encode(['ok' => false, 'error' => 'bad-json']); exit; }

/* honeypot: the form has a hidden "website" field real people never fill */
if (!empty($in['website'])) { echo json_encode(['ok' => true]); exit; }

function wl_clean($v, $max) { $v = trim((string)$v); $v = preg_replace('/[^\P{C}\n]/u', '', $v); return function_exists('mb_substr') ? mb_substr($v, 0, $max) : substr($v, 0, $max); }
$email = strtolower(wl_clean(isset($in['email']) ? $in['email'] : '', 160));
$name  = wl_clean(isset($in['name']) ? $in['name'] : '', 120);
$note  = wl_clean(isset($in['note']) ? $in['note'] : '', 300);
$page  = wl_clean(isset($in['page']) ? $in['page'] : '', 300);
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) { echo json_encode(['ok' => false, 'error' => 'email']); exit; }

/* rate limit: max 12 sign-ups per minute site-wide (spam floor) */
$RATEF = __DIR__ . '/pcm-waitlist-rate.json';
$min = (int)floor(time() / 60);
$rate = @json_decode((string)@file_get_contents($RATEF), true);
if (!is_array($rate) || (isset($rate['min']) ? $rate['min'] : null) !== $min) $rate = ['min' => $min, 'n' => 0];
if ((isset($rate['n']) ? $rate['n'] : 0) >= 12) { http_response_code(429); echo json_encode(['ok' => false, 'error' => 'rate']); exit; }
$rate['n']++; @file_put_contents($RATEF, json_encode($rate), LOCK_EX);

/* append to the store (dedup by email) under an exclusive lock; no outbound HTTP inside the lock */
$STORE = __DIR__ . '/pcm-waitlist.json';
$already = false; $stored = false; $pos = '';
$fp = @fopen($STORE, 'c+');
if ($fp) {
    @flock($fp, LOCK_EX);
    $db = json_decode((string)stream_get_contents($fp), true);
    if (!is_array($db) || !isset($db['list']) || !is_array($db['list'])) $db = ['list' => []];
    foreach ($db['list'] as $e) { if (isset($e['email']) && strtolower($e['email']) === $email) { $already = true; break; } }
    if (!$already) {
        $db['list'][] = ['email' => $email, 'name' => $name, 'note' => $note, 'src' => $page, 'ts' => time()];
        $db['count'] = count($db['list']); $pos = $db['count']; $stored = true;
        @ftruncate($fp, 0); @rewind($fp);
        @fwrite($fp, json_encode($db, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    }
    @flock($fp, LOCK_UN); @fclose($fp);
}

/* Slack ping AFTER releasing the lock, only for genuinely new sign-ups */
if ($stored) {
    $WEBF = __DIR__ . '/slack-webhook.php';
    if (is_file($WEBF)) {
        $cfgsrc = (string)@file_get_contents($WEBF);
        if (preg_match('#(https://hooks\.slack\.com/[^\'"\s]+)#', $cfgsrc, $mm)) {
            $se = function ($s) { return str_replace(['&', '<', '>'], ['&amp;', '&lt;', '&gt;'], (string)$s); };
            $txt = ':sparkles: *New 365 PC Manager waitlist sign-up*' . ($name !== '' ? ' - ' . $se($name) : '') . ' <' . $se($email) . '>'
                 . ($note !== '' ? "\n> " . str_replace("\n", " ", $se($note)) : '')
                 . ($pos !== '' ? "\n_#" . $pos . " on the list_" : '');
            $ch = curl_init($mm[1]);
            curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 8, CURLOPT_POST => true,
                CURLOPT_HTTPHEADER => ['Content-Type: application/json'], CURLOPT_POSTFIELDS => json_encode(['text' => $txt, 'unfurl_links' => false])]);
            @curl_exec($ch); curl_close($ch);
        }
    }
}

// report success ONLY when the sign-up was genuinely recorded (new) or already present -
// never claim "you're on the list" if the store write silently failed. No 'already' flag in
// the response (it would be an email-enumeration oracle; dedup stays server-side).
echo json_encode(['ok' => ($stored || $already)]);
