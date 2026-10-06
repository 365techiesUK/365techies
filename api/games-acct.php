<?php
/*
 * 365 Games - "Keep my scores in my free 365 account" (6 Oct 2026). Owner: My code stays for players who want nothing
 * to do with an account; players who care about their scores can keep them in their free 365 account - the same account
 * (and the same emailed 6-digit sign-in code, pcm-booking.php join / verifycode) that runs the customer portal and 365 PC
 * Manager. "Then we've got two audiences."
 *
 * The browser sends the portal's own web session (localStorage p365.wtoken + p365mid), checked by the canonical
 * portal_session_check() against the customer file, READ ONLY - this endpoint never writes pcm-data.json. A staff
 * "view as" and a company team member's session are refused (games belong to the account holder playing). The progress
 * is kept per account in api/games-acct-store/<hash of the account>.json (its own deny-all .htaccess, gitignored):
 * only the games' own storage keys, as games-code.php - never a game in progress, never anything about the person.
 *
 * Actions (POST JSON, each with auth {wtoken, machine}): me -> {first, at}; save {data}; load -> {data, at}.
 * GAMES_TEST_DB: a test copy of the customer file, set only in a local test server's environment (never on the live
 * server), so tests never read real customer data.
 * NO closing tag in this file.
 */
error_reporting(0);
date_default_timezone_set('Europe/London');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');

$GA_DIR = __DIR__ . '/games-acct-store';
$GA_MAX = 64 * 1024;
// the games' own storage (the same list as games-code.php): every key under these prefixes, except a game in progress
$GA_KEYS = '/^(sol365|fc365|sp365|tp365|py365|he365|gr365|cr365|wh365|inv365|bb365|ecl365|coast365|cards365|games365):[a-z0-9:_-]{1,40}$|^hof365:player$/';

function ga_out($a, $code = 200) { http_response_code($code); echo json_encode($a); exit; }
function ga_clean($data) {
    global $GA_KEYS, $GA_MAX;
    if (!is_array($data)) return null;
    $out = array(); $n = 0;
    foreach ($data as $k => $v) {
        if (!is_string($k) || !is_string($v) || !preg_match($GA_KEYS, $k) || substr($k, -5) === ':game') continue;
        if ($k === 'games365:code' || $k === 'games365:app') continue;   // this phone's own
        $n += strlen($k) + strlen($v); if ($n > $GA_MAX) return null;
        $out[$k] = $v;
    }
    return $out;
}
// the signed-in account holder, or a refusal with nothing else in it
function ga_account($in) {
    $a = isset($in['auth']) && is_array($in['auth']) ? $in['auth'] : array();
    $wt = preg_replace('/[^a-f0-9]/', '', (string)(isset($a['wtoken']) ? $a['wtoken'] : ''));
    $mc = preg_replace('/[^a-f0-9]/', '', substr((string)(isset($a['machine']) ? $a['machine'] : ''), 0, 32));
    $dbf = getenv('GAMES_TEST_DB') && is_file(getenv('GAMES_TEST_DB')) ? getenv('GAMES_TEST_DB') : __DIR__ . '/pcm-data.json';
    if ($wt === '' || !file_exists(__DIR__ . '/pcm-portal-auth-lib.php') || !file_exists($dbf)) return array('ok' => false, 'error' => 'signed_out');
    require_once __DIR__ . '/pcm-portal-auth-lib.php';
    $db = @json_decode((string)@file_get_contents($dbf), true);
    $chk = portal_session_check($db, $wt, $mc);
    if (empty($chk['ok'])) return array('ok' => false, 'error' => (isset($chk['error']) && $chk['error'] === 'ask_your_manager') ? 'team_member' : 'signed_out');
    if (!empty($chk['viewas'])) return array('ok' => false, 'error' => 'view_as');   // staff looking in is never the player
    $c = $db['customers'][$chk['key']];
    $words = preg_split('/\s+/', trim(preg_replace('/[^A-Za-z\s\'-]/', ' ', (string)(isset($c['name']) ? $c['name'] : ''))));
    return array('ok' => true, 'file' => hash('sha256', $chk['key'] . '|365games-acct'), 'first' => count($words) && $words[0] !== '' ? ucfirst(strtolower($words[0])) : '');
}
function ga_path($f) { global $GA_DIR; return $GA_DIR . '/' . $f . '.json'; }

if ($_SERVER['REQUEST_METHOD'] !== 'POST') ga_out(array('error' => 'post_only'), 405);
$in = json_decode(file_get_contents('php://input'), true);
if (!is_array($in)) ga_out(array('error' => 'bad_request'), 400);
$act = isset($in['action']) ? (string)$in['action'] : '';
$who = ga_account($in);
if (empty($who['ok'])) ga_out(array('ok' => false, 'error' => $who['error']), 200);
if (!is_dir($GA_DIR)) @mkdir($GA_DIR, 0755, true);
if (!file_exists($GA_DIR . '/.htaccess')) @file_put_contents($GA_DIR . '/.htaccess', "# 365 Games - scores kept in players' 365 accounts. Never served directly; api/games-acct.php reads it.\nRequire all denied\n");
$f = ga_path($who['file']);

if ($act === 'me') {
    $j = file_exists($f) ? json_decode((string)@file_get_contents($f), true) : null;
    ga_out(array('ok' => true, 'first' => $who['first'], 'at' => is_array($j) && isset($j['at']) ? (int)$j['at'] : 0));
}
if ($act === 'save') {
    $data = ga_clean(isset($in['data']) ? $in['data'] : null);
    if ($data === null) ga_out(array('error' => 'too_big'), 413);
    $tmp = $f . '.' . getmypid() . '.tmp';
    if (@file_put_contents($tmp, json_encode(array('at' => time(), 'data' => $data))) === false || !@rename($tmp, $f)) ga_out(array('error' => 'store'), 500);
    ga_out(array('ok' => true, 'at' => time()));
}
if ($act === 'load') {
    $j = file_exists($f) ? json_decode((string)@file_get_contents($f), true) : null;
    if (!is_array($j) || !isset($j['data']) || !is_array($j['data'])) ga_out(array('ok' => true, 'data' => null, 'at' => 0));
    ga_out(array('ok' => true, 'data' => $j['data'], 'at' => (int)$j['at']));
}
ga_out(array('error' => 'bad_request'), 400);
