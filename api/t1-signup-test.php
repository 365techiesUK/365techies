<?php
/**
 * Tips by email (t1-signup.php / t1-signup-lib.php) - test suite. Run:
 *   C:\tools\php\php.exe -d extension=mbstring api/t1-signup-test.php
 * CLI only. Uses a throwaway store and a fake sender for the library, then copies the endpoint into a temp folder and
 * serves it with PHP's built-in server for the whole journey: sign up, the confirm page, the button, collection and
 * acknowledgement with a test key. No real email is sent and no real store is touched.
 */
if (PHP_SAPI !== 'cli') { http_response_code(403); exit('cli only'); }
error_reporting(E_ALL);
$tmp = sys_get_temp_dir() . '/su-test-' . bin2hex(random_bytes(4));
@mkdir($tmp);
define('SU_STORE', $tmp . '/t1-signups.json');
define('SU_RATE', $tmp . '/t1-signup-rate.json');
require_once __DIR__ . '/t1-signup-lib.php';
define('RV_LIB', 1);                       // the house email template, loaded at top level like t1-signup.php does
@include_once __DIR__ . '/pcm-review.php';

$fails = 0;
function ok($cond, $what, $detail = '') { global $fails; echo ($cond ? '  PASS  ' : '  FAIL  ') . $what . ($cond || $detail === '' ? '' : '   [' . $detail . ']') . "\n"; if (!$cond) $fails++; }
function rrm($d) { foreach ((array)@glob($d . '/{,.}*', GLOB_BRACE) as $p) { if (basename($p) === '.' || basename($p) === '..') continue; is_dir($p) ? rrm($p) : @unlink($p); } @rmdir($d); }

$sent = array();
$send = function ($to, $token) use (&$sent) { $sent[] = array($to, $token); return true; };
$now = 1791640000;

echo "-- signing up\n";
$r = su_signup(' Jean.Smith@Example.com ', "Jean\nSmith", '/tips-by-email/', '203.0.113.5', $now, $send);
ok($r['ok'] && count($sent) === 1 && $sent[0][0] === 'jean.smith@example.com', 'a sign-up sends one confirm email, address tidied', json_encode($r));
$db = json_decode(file_get_contents(SU_STORE), true);
ok($db['list'][0]['status'] === 'pending' && $db['list'][0]['name'] === 'JeanSmith', 'kept as pending, no line breaks in the name', $db['list'][0]['name']);
ok($db['list'][0]['token'] === hash('sha256', $sent[0][1]) && strpos(file_get_contents(SU_STORE), $sent[0][1]) === false, 'only the token\'s hash is stored');
ok(strpos($db['list'][0]['consent'], 'unsubscribe at any time') !== false, 'the exact words they agreed to are kept');
$r = su_signup('jean.smith@example.com', '', '', '203.0.113.5', $now + 60, $send);
ok($r['ok'] && count($sent) === 1, 'again a minute later: same answer, no second email');
$r = su_signup('jean.smith@example.com', '', '', '203.0.113.5', $now + SU_RESEND_GAP + 1, $send);
ok($r['ok'] && count($sent) === 2, 'after 15 minutes a fresh confirm email may go');
foreach (array('not-an-email', 'a@b', 'steve@365techies.co.uk', str_repeat('a', 170) . '@example.com') as $bad)
    ok(su_signup($bad, '', '', '203.0.113.9', $now, $send)['error'] === 'email', 'refused: ' . substr($bad, 0, 30));

echo "-- the confirm link and its button\n";
$token = $sent[1][1];
ok(su_peek($token, $now + 100) === 'pending', 'opening the link only shows the button (a scanner opening it confirms nothing)');
ok(su_peek($sent[0][1], $now + 100) === 'gone', 'the older link was replaced');
ok(su_confirm($token, $now + 200) === 'confirmed', 'pressing the button confirms');
ok(su_confirm($token, $now + 300) === 'already' && su_peek($token, $now + 300) === 'confirmed', 'pressing it again is harmless');
ok(su_confirm(str_repeat('ab', 20), $now) === 'gone', 'a made-up token does nothing');
$r = su_signup('jean.smith@example.com', '', '', '203.0.113.5', $now + 9999, $send);
ok($r['ok'] && count($sent) === 2, 'signing up again once confirmed: same answer, nothing sent (no "already" giveaway)');

echo "-- old unconfirmed sign-ups are forgotten\n";
su_signup('late@example.com', '', '', '198.51.100.1', $now, $send);
$late = end($sent)[1];
ok(su_confirm($late, $now + SU_PENDING_DAYS * 86400 + 5) === 'gone', 'a link over a week old has expired');
$c = su_collect($now + SU_PENDING_DAYS * 86400 + 5);
ok(count($c) === 1 && $c[0]['email'] === 'jean.smith@example.com', 'collection hands over only the confirmed one');
ok(strpos(file_get_contents(SU_STORE), 'late@example.com') === false, 'and the expired one is gone from the server');
ok(isset($c[0]['consent'], $c[0]['confirmed'], $c[0]['signed_up']) && !isset($c[0]['token']), 'with when they agreed and to what, never the token');

echo "-- the app takes them, the server forgets them\n";
ok(su_ack(array($c[0]['id'], 'made-up')) === 1, 'acknowledged');
ok(su_collect($now) === array(), 'nothing left to collect');
$db = json_decode(file_get_contents(SU_STORE), true);
ok($db['list'] === array() && $db['collected'] === 1, 'no names or addresses left, just a count');

echo "-- the key\n";
ok(!su_key_ok('') && !su_key_ok('short') && !su_key_ok(str_repeat('x', 43)), 'wrong or short keys refused');
ok(preg_match('/^[a-f0-9]{64}$/', SU_KEY_SHA256) === 1, 'the code holds a sha256, not a key');

echo "-- rate limits\n";
$n = 0;
for ($i = 0; $i < 8; $i++) { $r = su_signup("p$i@example.com", '', '', '192.0.2.77', $now + 50000, $send); if ($r['error'] === 'rate') $n++; }
ok($n === 8 - SU_PER_IP_HOUR, 'one visitor: ' . SU_PER_IP_HOUR . ' an hour', (string)$n);

echo "-- the confirm email\n";
$p = su_email_parts('abc123');
ok(strpos($p['text'], SU_PAGE_URL . '?c=abc123') !== false && strpos($p['text'], 'ignore this email') !== false, 'the link, and what to do if they didn\'t ask');
ok(strpos($p['html'], 'abc123') !== false && strpos($p['html'], 'Confirm my email address') !== false, 'the HTML version, in the house template');

echo "-- the Junara page's free-year reminder box\n";
$jsent = array();
$jsend = function ($to, $token, $kind = 'tips') use (&$jsent) { $jsent[] = array($to, $token, $kind); return true; };
$r = su_signup('pat@example.com', 'Pat', '/virgin-media-email-moving-to-junara/ (moves Nov 2026)', '203.0.113.60', $now, $jsend, 'junara');
ok($r['ok'] && count($jsent) === 1 && $jsent[0][2] === 'junara', 'a reminder sign-up sends one confirm email, told it is the Junara box', json_encode($jsent));
$db = json_decode(file_get_contents(SU_STORE), true);
$pat = array_values(array_filter($db['list'], function ($e) { return $e['email'] === 'pat@example.com'; }))[0];
ok($pat['kind'] === 'junara' && $pat['consent'] === SU_CONSENT_JUNARA, 'kept with the reminder box\'s own words', $pat['consent']);
ok(strpos(SU_CONSENT_JUNARA, 'tips, news and offers') !== false && strpos(SU_CONSENT_JUNARA, 'Junara free year') !== false, 'those words name both the reminder and the tips (the app files every sign-up as agreed to mailings)');
ok(su_kind($jsent[0][1]) === 'junara' && su_kind(str_repeat('cd', 20)) === 'tips', 'a confirm link knows which box it came from; an unknown one reads as tips');
$r = su_signup('pat@example.com', '', '', '203.0.113.60', $now + SU_RESEND_GAP + 1, $jsend, 'tips');
$db = json_decode(file_get_contents(SU_STORE), true);
$pat = array_values(array_filter($db['list'], function ($e) { return $e['email'] === 'pat@example.com'; }))[0];
ok(count($jsent) === 2 && $pat['kind'] === 'tips' && $pat['consent'] === SU_CONSENT && $pat['page'] === '/virgin-media-email-moving-to-junara/ (moves Nov 2026)', 'asked again from the tips box: the new email and button agree to the tips words; the page is kept', json_encode($pat));
su_signup('pat@example.com', '', '', '203.0.113.60', $now + 2 * SU_RESEND_GAP + 2, $jsend, 'made-up');
ok(end($jsent)[2] === 'tips', 'an unknown kind is treated as the tips box');
su_signup('pat@example.com', '', '', '203.0.113.60', $now + 3 * SU_RESEND_GAP + 3, $jsend, 'junara');
ok(su_confirm(end($jsent)[1], $now + 3 * SU_RESEND_GAP + 60) === 'confirmed', 'the reminder sign-up confirms like any other');
$c = su_collect($now + 3 * SU_RESEND_GAP + 61);
$cp = array_values(array_filter($c, function ($e) { return $e['email'] === 'pat@example.com'; }));
ok(count($cp) === 1 && $cp[0]['consent'] === SU_CONSENT_JUNARA && strpos($cp[0]['page'], 'junara') !== false, 'Techies One Mail collects the reminder words and the page with it', json_encode($cp));
su_ack(array_map(function ($e) { return $e['id']; }, $c));
$p = su_email_parts('abc123', 'junara');
ok(strpos($p['subject'], 'Junara reminder') !== false && strpos($p['text'], 'Junara free year') !== false && strpos($p['text'], 'tips, news and offers') !== false, 'the reminder\'s confirm email says both things it agrees to');
ok(strpos($p['html'], 'Yes, remind me') !== false, 'and names the right button');
ok(strpos(su_email_parts('abc123')['text'], 'Junara') === false, 'the tips email is unchanged');

echo "-- end to end through the endpoint\n";
$srv = $tmp . '/srv';
@mkdir($srv . '/api', 0777, true);
$key = 'test-key-' . str_repeat('k', 40);
$lib = str_replace("define('SU_KEY_SHA256', '" . SU_KEY_SHA256 . "')", "define('SU_KEY_SHA256', '" . hash('sha256', $key) . "')", file_get_contents(__DIR__ . '/t1-signup-lib.php'));
$lib = str_replace("function su_send_confirm(\$to, \$token, \$kind = 'tips') {", "function su_send_confirm(\$to, \$token, \$kind = 'tips') { file_put_contents(__DIR__ . '/sent.txt', \$to . ' ' . \$token . ' ' . \$kind . \"\\n\", FILE_APPEND); return true; }\nfunction su_send_confirm_real(\$to, \$token, \$kind = 'tips') {", $lib);
if (strpos($lib, 'su_send_confirm_real') === false) { echo "  FAIL  the fake sender could not be put in (su_send_confirm's first line changed?)\n"; exit(1); }
file_put_contents($srv . '/api/t1-signup-lib.php', $lib);
copy(__DIR__ . '/t1-signup.php', $srv . '/api/t1-signup.php');
copy(__DIR__ . '/pcm-review.php', $srv . '/api/pcm-review.php');   // the real mail library loads (the fake sender above means nothing is sent)
$port = 18000 + random_int(0, 999);
// an argument list, not a command line: no shell in between, so stopping it stops PHP itself
$proc = proc_open(array(PHP_BINARY, '-S', '127.0.0.1:' . $port, '-t', $srv), array(array('pipe', 'r'), array('file', $tmp . '/srv.log', 'a'), array('file', $tmp . '/srv.log', 'a')), $pipes);
usleep(800000);
function http($method, $url, $body = null, $headers = array()) {
    $ctx = stream_context_create(array('http' => array('method' => $method, 'ignore_errors' => true, 'timeout' => 10,
        'header' => implode("\r\n", $headers), 'content' => $body)));
    $out = @file_get_contents($url, false, $ctx);
    $code = 0;
    foreach (($http_response_header ?? array()) as $h) if (preg_match('#^HTTP/\S+ (\d+)#', $h, $m)) $code = (int)$m[1];
    return array($code, (string)$out);
}
$base = "http://127.0.0.1:$port/api/t1-signup.php";
$json = array('Content-Type: application/json');
list($code, $out) = http('POST', $base, json_encode(array('email' => 'web@example.com', 'name' => 'Web Person', 'agree' => true, 'page' => '/tips-by-email/')), $json);
ok($code === 200 && json_decode($out, true)['ok'] === true, 'the sign-up box', "$code $out");
list($code, $out) = http('POST', $base, json_encode(array('email' => 'x@example.com')), $json);
ok($code === 400 && json_decode($out, true)['error'] === 'agree', 'nothing happens without ticking "yes"', "$code $out");
list($code, $out) = http('POST', $base, json_encode(array('email' => 'bot@example.com', 'agree' => true, 'website' => 'spam.example')), $json);
ok($code === 200 && !preg_match('/bot@example/', (string)@file_get_contents($srv . '/api/sent.txt')), 'the honeypot: a robot is told "ok" and nothing is sent');
list($code, $out) = http('POST', $base, json_encode(array('email' => 'y@example.com', 'agree' => true)), array_merge($json, array('Origin: https://evil.example')));
ok($code === 403, 'another website can\'t post to it');
$line = trim((string)@file_get_contents($srv . '/api/sent.txt'));
$tok = explode(' ', $line)[1] ?? '';   // each line: address, token, which box
list($code, $out) = http('GET', $base . '?c=' . $tok);
ok($code === 200 && strpos($out, 'Yes, send me the tips') !== false, 'the link shows the button', "$code");
list($code, $out) = http('GET', $base . '?collect=1', null, array('Authorization: Bearer ' . $key));
ok(json_decode($out, true)['signups'] === array(), 'not collected before the button is pressed');
list($code, $out) = http('POST', $base, 'c=' . $tok, array('Content-Type: application/x-www-form-urlencoded'));
ok($code === 200 && strpos($out, 'on the list') !== false, 'the button confirms', "$code");
list($code, $out) = http('GET', $base . '?collect=1', null, array('Authorization: Bearer wrong-' . $key));
ok($code === 403, 'a wrong key gets nothing');
list($code, $out) = http('GET', $base . '?collect=1', null, array('X-T1-Key: ' . $key));
$got = json_decode($out, true)['signups'] ?? array();
ok($code === 200 && count($got) === 1 && $got[0]['email'] === 'web@example.com' && $got[0]['name'] === 'Web Person', 'Techies One Mail collects it (key in X-T1-Key works too)', "$code $out");
list($code, $out) = http('POST', $base, json_encode(array('ack' => array($got[0]['id']))), array_merge($json, array('Authorization: Bearer ' . $key)));
ok($code === 200 && json_decode($out, true)['removed'] === 1, 'and acknowledges it');
list($code, $out) = http('POST', $base, json_encode(array('email' => 'remind@example.com', 'agree' => true, 'kind' => 'junara', 'page' => '/virgin-media-email-moving-to-junara/')), $json);
ok($code === 200 && json_decode($out, true)['ok'] === true, 'the Junara reminder box', "$code $out");
$lines = array_values(array_filter(explode("\n", trim((string)@file_get_contents($srv . '/api/sent.txt'))), function ($l) { return strpos($l, 'remind@example.com') === 0; }));
$jp = explode(' ', trim($lines[0] ?? ''));
ok(($jp[2] ?? '') === 'junara', 'its confirm email goes out as the reminder one', $lines[0] ?? '(none)');
list($code, $out) = http('GET', $base . '?c=' . ($jp[1] ?? ''));
ok($code === 200 && strpos($out, 'Yes, remind me') !== false && strpos($out, 'Junara free year') !== false, 'its link shows the reminder button and words', "$code");
list($code, $out) = http('POST', $base, 'c=' . ($jp[1] ?? ''), array('Content-Type: application/x-www-form-urlencoded'));
ok($code === 200 && strpos($out, 'before your free year with Junara ends') !== false, 'and its thank-you says so', "$code");
$st = proc_get_status($proc);
if ($st['running']) { if (stripos(PHP_OS, 'WIN') === 0) exec('taskkill /F /T /PID ' . (int)$st['pid'] . ' 2>NUL'); else proc_terminate($proc); }
proc_close($proc);
rrm($tmp);

echo $fails ? "\n$fails FAILED\n" : "\nAll passed\n";
exit($fails ? 1 : 0);
