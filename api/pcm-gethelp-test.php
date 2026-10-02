<?php
/**
 * The 365 Get Help browser add-on's "Ring me back" (pcm-gethelp.php) - test suite. Run:
 *   C:\tools\php\php.exe -d extension=mbstring api/pcm-gethelp-test.php
 * CLI only. The end-to-end part copies the endpoint and its two libraries into a throwaway folder, serves it with PHP's
 * built-in server, and points the card at a second built-in server that only records what it is sent - so no real
 * Slack channel or rate counter is touched. The card is then read back the way the lead reminders and the portal's
 * inbox read #365-job-tracker (lc_lead, comms_lead_from_post).
 */
if (PHP_SAPI !== 'cli') { http_response_code(403); exit('cli only'); }
error_reporting(E_ALL);
require __DIR__ . '/comms-lib.php';              // brings pcm-leadchase-lib.php
require_once __DIR__ . '/pcm-mailmove-lib.php';
require_once __DIR__ . '/pcm-gethelp-lib.php';

$fails = 0;
function ok($cond, $what, $detail = '') { global $fails; echo ($cond ? '  PASS  ' : '  FAIL  ') . $what . ($cond || $detail === '' ? '' : '   [' . $detail . ']') . "\n"; if (!$cond) $fails++; }
function rrm($d) { foreach ((array)@glob($d . '/{,.}*', GLOB_BRACE) as $p) { if (basename($p) === '.' || basename($p) === '..') continue; is_dir($p) ? rrm($p) : @unlink($p); } @rmdir($d); }

echo "-- what's wrong\n";
ok(gh_what('scary') === 'scary' && gh_what('SCAMMED') === 'scammed' && gh_what(' broken ') === 'broken', 'the four choices, any case');
ok(gh_what('hack') === 'other' && gh_what('') === 'other' && gh_what(array()) === 'other', 'anything else is "Something else"');

echo "-- the page they were on\n";
ok(gh_page('https://Scam-Site.example/alert/index.html?ref=1&tok=SECRET#call') === 'https://scam-site.example/alert/index.html', 'no ?query or #part, host lower case', gh_page('https://Scam-Site.example/alert/index.html?ref=1&tok=SECRET#call'));
ok(gh_page('http://example.com') === 'http://example.com', 'a bare host');
ok(gh_page('https://example.com:8443/x') === 'https://example.com:8443/x', 'a port is kept');
foreach (array('javascript:alert(1)', 'data:text/html,hi', 'chrome://settings', 'file:///C:/x', 'https://user:pw@example.com/', 'https://exa mple.com/', 'ftp://example.com', '', 'example.com', array('x')) as $bad)
    ok(gh_page($bad) === '', 'refused: ' . (is_array($bad) ? 'array' : $bad), is_array($bad) ? '' : gh_page($bad));
ok(strlen(gh_page('https://example.com/' . str_repeat('a', 900))) === 300, 'cut to 300 characters');

echo "-- the message\n";
ok(gh_message("It says ring\nMicrosoft\t now!") === 'It says ring Microsoft now!', 'one line, tidied');
$long = gh_message(str_repeat('word ', 200));
ok(mm_len($long) <= 503 && substr($long, -3) === '...', 'cut to 500 characters with ...', (string)mm_len($long));

echo "-- the add-on's origin (CORS)\n";
ok(gh_cors_origin('chrome-extension://gfhaolhbpbjdfjgacpehimkjjnhcipjd') === 'chrome-extension://gfhaolhbpbjdfjgacpehimkjjnhcipjd', 'a chrome-extension id is allowed');
foreach (array('https://365techies.co.uk', 'https://evil.example', 'chrome-extension://GFHAOLHBPBJDFJGACPEHIMKJJNHCIPJD', 'chrome-extension://abc', 'chrome-extension://gfhaolhbpbjdfjgacpehimkjjnhcipjd.evil', 'moz-extension://x', '') as $bad)
    ok(gh_cors_origin($bad) === '', 'no CORS header for "' . $bad . '"');

echo "-- the card, and how the lead reminders and the portal read it\n";
$f = array('name' => 'Jean Smith', 'phone' => '01202 123456', 'what' => 'scary', 'message' => 'It says my PC is <locked> & to ring Microsoft', 'page' => 'https://scam-alert.example/win`dows', 'ver' => '0.1.0');
$card = gh_card($f, gmmktime(13, 5, 0, 10, 2, 2026));
ok($card['text'] === 'Get Help button: please ring Jean Smith on 01202 123456', 'the first line', $card['text']);
$flat = json_encode($card['blocks'], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
ok(strpos($flat, '*Needs help with:*\nA scary warning or pop-up') !== false, 'what is wrong, as "Needs help with"');
ok(strpos($flat, '`https://scam-alert.example/win\'dows`') !== false, 'the page as code (a backtick in it cannot end the code early)');
ok(strpos($flat, '&lt;locked&gt; &amp; to ring') !== false, 'the message is escaped for Slack');
ok(strpos($flat, 'Possible scam') !== false, 'a scary warning gets the scam note');
ok(strpos($flat, '14:05, Fri 2 Oct') !== false && strpos($flat, 'add-on v0.1.0') !== false, 'when (UK time) and which version');
$plain = gh_card(array('name' => 'Bob', 'phone' => '07700 900123', 'what' => 'broken', 'message' => '', 'page' => '', 'ver' => ''));
$pflat = json_encode($plain['blocks'], JSON_UNESCAPED_SLASHES);
ok(strpos($pflat, 'Possible scam') === false && strpos($pflat, 'Page they were on') === false && strpos($pflat, 'Message') === false, 'no scam note, page or message when there are none');

// as conversations.history hands back a webhook post
$post = array('ts' => '1790946300.000100', 'type' => 'message', 'subtype' => 'bot_message', 'bot_id' => 'B0365', 'text' => $card['text'], 'blocks' => $card['blocks']);
$L = lc_lead($post);
ok(is_array($L) && $L['kind'] === 'callback' && $L['label'] === 'Get Help button', 'lc_lead: a call-back, "Get Help button"', json_encode($L));
ok(is_array($L) && $L['who'] === 'Jean Smith (01202 123456)', 'lc_lead: who (with the number, as the Virgin call-back shows it)', json_encode($L));
$C = comms_lead_from_post($post);
ok(is_array($C) && $C['name'] === 'Jean Smith' && $C['phone'] === '01202 123456' && $C['number'] === '+441202123456', 'portal inbox: name, phone, and the number it matches customers by', json_encode($C));
ok(is_array($C) && $C['topic'] === 'Get Help button in their browser - A scary warning or pop-up', 'portal inbox: the topic', is_array($C) ? $C['topic'] : '');
ok(is_array($C) && strpos($C['body'], 'It says my PC is <locked> & to ring Microsoft') === 0 && strpos($C['body'], "\nThey were on: https://scam-alert.example/win'dows") !== false, 'portal inbox: the message, then the page they were on', is_array($C) ? $C['body'] : '');
ok(is_array($C) && $C['page'] === '', 'portal inbox: the other site is not taken for one of our pages');
$C2 = comms_lead_from_post(array('ts' => '1790946400.000100', 'subtype' => 'bot_message', 'bot_id' => 'B0365', 'text' => $plain['text'], 'blocks' => $plain['blocks']));
ok(is_array($C2) && $C2['body'] === 'Asked us to ring them back.' && $C2['topic'] === 'Get Help button in their browser - Something is not working', 'portal inbox: no message', json_encode($C2));
ok(lc_lead(array('ts' => '1', 'user' => 'U1', 'text' => 'Get Help button: please ring Fake on 01202 000000')) === null, 'a person typing the line is not a lead');

echo "-- end to end (PHP's built-in server, a fake Slack)\n";
$TMP = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'pcm-gh-test-' . getmypid();
@mkdir($TMP);
$PHP = PHP_BINARY;
$API = $TMP . DIRECTORY_SEPARATOR . 'api'; $SL = $TMP . DIRECTORY_SEPARATOR . 'slack';
@mkdir($API); @mkdir($SL);
foreach (array('pcm-gethelp.php', 'pcm-gethelp-lib.php', 'pcm-mailmove-lib.php') as $fn) copy(__DIR__ . '/' . $fn, $API . '/' . $fn);
file_put_contents($SL . '/router.php', '<?php $b = file_get_contents("php://input"); file_put_contents(__DIR__ . "/posts.log", $b . "\n", FILE_APPEND); if (file_exists(__DIR__ . "/fail")) { http_response_code(500); echo "no"; } else echo "ok";');
function freeport() { for ($i = 0; $i < 50; $i++) { $p = mt_rand(8600, 8990); $s = @fsockopen('127.0.0.1', $p, $e, $es, 0.2); if (!$s) return $p; fclose($s); } return 8777; }
$procs = array();
function serve($args, $env, $port) {
    global $procs, $PHP;
    $p = proc_open(array_merge(array($PHP, '-d', 'extension=curl', '-S', '127.0.0.1:' . $port), $args), array(0 => array('pipe', 'r'), 1 => array('file', 'NUL', 'w'), 2 => array('file', 'NUL', 'w')), $pipes, null, $env);
    $procs[] = $p;
    for ($i = 0; $i < 50; $i++) { $s = @fsockopen('127.0.0.1', $port, $e, $es, 0.2); if ($s) { fclose($s); return true; } usleep(100000); }
    return false;
}
$P1 = freeport(); $P2 = freeport(); while ($P2 === $P1) $P2 = freeport(); $P3 = freeport(); while ($P3 === $P1 || $P3 === $P2) $P3 = freeport();
$env = getenv();
ok(serve(array($SL . '/router.php'), $env, $P2), 'fake Slack up');
ok(serve(array('-t', $API), $env + array('MM_FAKE_SLACK' => 'http://127.0.0.1:' . $P2 . '/hook'), $P1), 'api up');
ok(serve(array('-t', $API), $env, $P3), 'api without a webhook up');
function req($port, $body, $method = 'POST', $hdr = '') {
    $ctx = stream_context_create(array('http' => array('method' => $method, 'header' => "Content-Type: text/plain;charset=UTF-8\r\n" . $hdr, 'content' => $method === 'POST' ? (is_string($body) ? $body : json_encode($body)) : '', 'ignore_errors' => true, 'timeout' => 15)));
    $r = @file_get_contents('http://127.0.0.1:' . $port . '/pcm-gethelp.php', false, $ctx);
    $code = 0; $h = array();
    foreach ((array)$http_response_header as $line) { if (preg_match('#^HTTP/\S+\s(\d{3})#', $line, $m)) $code = (int)$m[1]; elseif (strpos($line, ':') !== false) { list($k, $v) = explode(':', $line, 2); $h[strtolower(trim($k))] = trim($v); } }
    return array($code, (string)$r, $h);
}
$posts = function () use ($SL) { $fl = $SL . '/posts.log'; return file_exists($fl) ? array_values(array_filter(explode("\n", file_get_contents($fl)))) : array(); };
$EXT = 'Origin: chrome-extension://gfhaolhbpbjdfjgacpehimkjjnhcipjd' . "\r\n";
$good = array('install' => 'a1b2c3d4e5f60718', 'name' => 'Jean Smith', 'phone' => '+44 (0)1202 123456', 'what' => 'scammed', 'message' => 'They asked for a code', 'page' => 'https://bad.example/x?id=99', 'ver' => '0.1.0');

list($c, $b, $h) = req($P1, '', 'OPTIONS', $EXT);
ok($c === 204 && ($h['access-control-allow-origin'] ?? '') === 'chrome-extension://gfhaolhbpbjdfjgacpehimkjjnhcipjd' && stripos($h['access-control-allow-methods'] ?? '', 'POST') !== false, 'a preflight from the add-on is allowed', $c . ' ' . json_encode($h));
list($c, $b, $h) = req($P1, $good + array('test' => 1), 'POST', $EXT);
ok($b === '{"ok":true,"test":true}' && ($h['access-control-allow-origin'] ?? '') !== '' && count($posts()) === 0, 'test:1 checks it all and posts nothing', $b);
list($c, $b, $h) = req($P1, $good, 'POST', $EXT);
ok($b === '{"ok":true}' && ($h['access-control-allow-origin'] ?? '') === 'chrome-extension://gfhaolhbpbjdfjgacpehimkjjnhcipjd', 'the add-on\'s request is sent, and it may read the reply', $b);
$pp = $posts();
$sent = count($pp) === 1 ? json_decode($pp[0], true) : null;
ok(is_array($sent) && $sent['text'] === 'Get Help button: please ring Jean Smith on 01202 123456', 'one card reached Slack, with the number tidied', count($pp) . ' ' . (is_array($sent) ? $sent['text'] : ''));
$sflat = is_array($sent) ? json_encode($sent['blocks'], JSON_UNESCAPED_SLASHES) : '';
ok(strpos($sflat, '`https://bad.example/x`') !== false && strpos($sflat, 'id=99') === false, 'the page went without its ?query', $sflat);
ok(strpos($sflat, 'I think I have been scammed') !== false && strpos($sflat, 'Possible scam') !== false, 'scammed: the choice and the scam note');
list($c, $b, $h) = req($P1, $good, 'POST', 'Origin: https://evil.example' . "\r\n");
ok($c === 403 && $b === '{"ok":false,"error":"bad request"}' && !isset($h['access-control-allow-origin']), 'another website is refused, with no CORS header', $c . ' ' . $b);
list($c, $b) = req($P1, $good, 'GET');
ok($c === 405, 'GET is refused', (string)$c);
foreach (array(array('install' => 'xyz'), array('install' => ''), array('name' => ''), array('name' => str_repeat('n', 61)), array('phone' => '12345'), array('phone' => '+1 202 555 0100')) as $bad) {
    list($c, $b) = req($P1, array_merge($good, $bad), 'POST', $EXT);
    $k = key($bad); $want = '{"ok":false,"error":"' . ($k === 'install' ? 'install' : ($k === 'name' ? 'name' : 'phone')) . '"}';
    ok($b === $want, 'refused: ' . $k . ' = "' . substr((string)current($bad), 0, 20) . '"', $b);
}
list($c, $b) = req($P1, 'not json', 'POST', $EXT);
ok($b === '{"ok":false,"error":"bad request"}', 'not JSON: bad request', $b);
$before = count($posts());
list($c, $b) = req($P1, $good + array('website' => 'http://spam'), 'POST', $EXT);
ok($b === '{"ok":true}' && count($posts()) === $before, 'the honeypot: "ok", and nothing sent');
list($c, $b) = req($P3, $good, 'POST', $EXT);
ok($b === '{"ok":false,"error":"unavailable"}', 'no webhook on the server: unavailable (the add-on says ring us)', $b);
// 5 per install a day (one is used above)
$n = 1; for ($i = 0; $i < 6; $i++) { list($c, $b) = req($P1, $good, 'POST', $EXT); if ($b === '{"ok":true}') $n++; }
ok($n === 5 && $b === '{"ok":false,"error":"rate"}', '5 a day per install, then "rate"', $n . ' ' . $b);
// 10 per caller a day: other installs from the same address
$m = 0; for ($i = 0; $i < 8; $i++) { list($c, $b) = req($P1, array_merge($good, array('install' => sprintf('%016x', 0xabc000 + $i))), 'POST', $EXT); if ($b === '{"ok":true}') $m++; }
ok($m === 5 && $b === '{"ok":false,"error":"rate"}', '10 a day from one address (5 + 5), then "rate"', $m . ' ' . $b);
touch($SL . '/fail');
$rf = mm_rate_file($API); $st = json_decode((string)@file_get_contents($rf), true); $st['c'] = array(); file_put_contents($rf, json_encode($st));
list($c, $b) = req($P1, array_merge($good, array('install' => 'feedfacefeedface')), 'POST', $EXT);
ok($b === '{"ok":false,"error":"send"}', 'Slack failing: "send" (the add-on says ring us)', $b);
$keys = (string)@file_get_contents($rf);
ok(strpos($keys, '127.0.0.1') === false, 'the rate store holds no IP address');

foreach ($procs as $p) { $s = proc_get_status($p); if ($s['running']) { if (stripos(PHP_OS, 'WIN') === 0) exec('taskkill /F /T /PID ' . (int)$s['pid'] . ' 2>NUL'); else proc_terminate($p); } }
rrm($TMP);
echo "\n" . ($fails ? $fails . ' FAILED' : 'all passed') . "\n";
exit($fails ? 1 : 0);
