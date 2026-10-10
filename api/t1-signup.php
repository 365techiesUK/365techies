<?php
/*
 * Tips by email: the website sign-up box, the confirm page, and the door Techies One Mail collects sign-ups through.
 * How it works and why: see t1-signup-lib.php.
 *
 *   POST JSON {email, name, website (honeypot), page}     from the sign-up box: sends the "please confirm" email
 *   GET  ?c=<token>                                       the link in that email: a page with a "Yes" button
 *   POST c=<token>                                        the button: this is the agreement (double opt-in)
 *   GET  ?collect=1      + Authorization: Bearer <key>    Techies One Mail: confirmed sign-ups waiting
 *   POST {"ack": [ids]}  + Authorization: Bearer <key>    Techies One Mail: got them, forget them here
 */
error_reporting(0);
date_default_timezone_set('Europe/London');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');
require_once __DIR__ . '/t1-signup-lib.php';
// the house mail library, for the confirm email: loaded here at top level, never inside a function (it sets globals
// that a function-scope include would silently lose - php-include-scope-trap). RV_LIB stops its own endpoint running.
if (!defined('RV_LIB')) define('RV_LIB', 1);
@include_once __DIR__ . '/pcm-review.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$auth = (string)($_SERVER['HTTP_AUTHORIZATION'] ?? ($_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? ''));
$key = preg_match('/^Bearer\s+(\S+)$/i', $auth, $m) ? $m[1] : (string)($_SERVER['HTTP_X_T1_KEY'] ?? '');   // some hosts drop Authorization
$now = time();

function su_json($code, $data) {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data);
    exit;
}

function su_page($title, $body) {
    header('Content-Type: text/html; charset=utf-8');
    $h = function ($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); };
    echo '<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
       . '<meta name="robots" content="noindex, nofollow"><title>' . $h($title) . ' | 365 Techies</title>'
       . '<style>body{margin:0;background:#eef3f9;font:17px/1.6 "Segoe UI",-apple-system,Helvetica,Arial,sans-serif;color:#243352}'
       . 'main{max-width:560px;margin:8vh auto;padding:0 16px}.card{background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 2px 10px rgba(11,18,38,.08)}'
       . '.top{background:#0b1226;color:#fff;padding:20px 28px;font-weight:700;font-size:18px}.top span{display:block;font-size:11px;letter-spacing:1.6px;'
       . 'text-transform:uppercase;color:#7fb6e4;font-weight:600}.bar{height:4px;background:#1d97e3}.in{padding:26px 28px 30px}h1{margin:0 0 12px;'
       . 'font-size:25px;line-height:1.25;color:#0b1226}button{font:inherit;font-weight:700;background:#1266a8;color:#fff;border:0;border-radius:10px;'
       . 'padding:14px 26px;cursor:pointer;margin:6px 0 14px}button:hover{background:#0b5591}a{color:#1266a8}.small{font-size:14px;color:#5b6b8a}</style>'
       . '</head><body><main><div class="card"><div class="top">365 Techies<span>Tips by email</span></div><div class="bar"></div><div class="in">'
       . '<h1>' . $h($title) . '</h1>' . $body . '</div></div></main></body></html>';
    exit;
}

// ---------------------------------------------------------------- Techies One Mail collecting confirmed sign-ups
if ($key !== '' || isset($_GET['collect'])) {
    if (!su_key_ok($key)) su_json(403, array('ok' => false, 'error' => 'key'));
    if ($method === 'GET') su_json(200, array('ok' => true, 'signups' => su_collect($now)));
    $in = json_decode((string)file_get_contents('php://input'), true);
    if (is_array($in) && isset($in['ack'])) su_json(200, array('ok' => true, 'removed' => su_ack($in['ack'])));
    su_json(400, array('ok' => false, 'error' => 'what'));
}

// ---------------------------------------------------------------- the link in the confirm email, and its button
$token = preg_replace('/[^a-f0-9]/', '', (string)($_POST['c'] ?? ($_GET['c'] ?? '')));
if ($token !== '') {
    if ($method === 'POST') {
        $r = su_confirm($token, $now);
        if ($r === 'gone') su_page('That link has expired', '<p>Confirm links last a week. If you&rsquo;d still like our tips, '
            . 'please <a href="/tips-by-email/">sign up again</a>: it only takes a moment.</p>');
        su_page('You’re on the list. Thank you!', '<p>You&rsquo;ll get our tips, news and offers by email, about once a month. '
            . 'Every email has an unsubscribe link, and you can always just reply STOP.</p>'
            . '<p class="small">Want help with something now? Call us on <a href="tel:+441202775566">01202 775566</a> or '
            . '<a href="/">visit our website</a>.</p>');
    }
    $state = su_peek($token, $now);
    if ($state === 'confirmed') su_page('You’re already on the list', '<p>Thank you, this email address is already confirmed. '
        . 'There&rsquo;s nothing more to do.</p><p class="small"><a href="/">Back to 365techies.co.uk</a></p>');
    if ($state === 'gone') su_page('That link has expired', '<p>Confirm links last a week. If you&rsquo;d still like our tips, '
        . 'please <a href="/tips-by-email/">sign up again</a>.</p>');
    $t = htmlspecialchars($token, ENT_QUOTES, 'UTF-8');
    su_page('One last step', '<p>Press the button to start getting 365 Techies&rsquo; tips, news and offers by email, about once a month. '
        . 'You can unsubscribe at any time.</p>'
        . '<form method="post" action="/api/t1-signup.php"><input type="hidden" name="c" value="' . $t . '">'
        . '<button type="submit">Yes, send me the tips</button></form>'
        . '<p class="small">Changed your mind? Just close this page: nothing happens, and we forget your address in a week.</p>');
}

// ---------------------------------------------------------------- the sign-up box on the website
if ($method !== 'POST') su_json(405, array('ok' => false, 'error' => 'method'));
$src = $_SERVER['HTTP_ORIGIN'] ?? ($_SERVER['HTTP_REFERER'] ?? '');
if ($src !== '' && !preg_match('~^https://(www\.)?365techies\.co\.uk(/|$)~', $src)) su_json(403, array('ok' => false, 'error' => 'origin'));
$in = json_decode((string)file_get_contents('php://input'), true);
if (!is_array($in)) su_json(400, array('ok' => false, 'error' => 'bad-json'));
if (!empty($in['website'])) su_json(200, array('ok' => true));   // the honeypot: only robots fill it in
if (empty($in['agree'])) su_json(400, array('ok' => false, 'error' => 'agree'));
try {
    $r = su_signup($in['email'] ?? '', $in['name'] ?? '', $in['page'] ?? '', $_SERVER['REMOTE_ADDR'] ?? '', $now, 'su_send_confirm');
} catch (Throwable $e) {
    su_json(500, array('ok' => false, 'error' => 'store'));
}
su_json($r['ok'] ? 200 : ($r['error'] === 'rate' ? 429 : 400), $r);
