<?php
/**
 * Free Virgin email tools (365 PC Manager v30) - test suite.   Run:  php api/pcm-mailmove-test.php
 * CLI only. The end-to-end part copies pcm-mailmover.php, pcm-mailmove-help.php and the library into a throwaway
 * folder, serves it with PHP's built-in server, and points the help card at a second built-in server that only
 * records what it is sent - so no real Slack channel, payload, customer store or rate counter is ever touched.
 */
if (PHP_SAPI !== 'cli') { http_response_code(403); exit('cli only'); }
require __DIR__ . '/pcm-mailmove-lib.php';

$fails = 0;
function ok($cond, $what, $detail = '') { global $fails; echo ($cond ? '  PASS  ' : '  FAIL  ') . $what . ($cond || $detail === '' ? '' : '   [' . $detail . ']') . "\n"; if (!$cond) $fails++; }
function rrm($d) { foreach ((array)@glob($d . '/{,.}*', GLOB_BRACE) as $p) { if (basename($p) === '.' || basename($p) === '..') continue; is_dir($p) ? rrm($p) : @unlink($p); } @rmdir($d); }

echo "-- UK phone numbers\n";
foreach (array('01202 775566' => '01202 775566', '01202775566' => '01202 775566', '+44 1202 775566' => '01202 775566',
               '+44 (0)1202 775566' => '01202 775566', '0044 1202 775566' => '01202 775566', '(01202) 775-566' => '01202 775566',
               '07700 900123' => '07700 900123', '+447700900123' => '07700 900123', '020 7946 0000' => '020 7946 0000',
               '016977 3456' => '01697 73456') as $in => $want)
    ok(mm_uk_phone($in) === $want, 'accepts ' . $in, mm_uk_phone($in));
foreach (array('', '12345', '775566', '+1 202 555 0100', '0120277556612', '00000000000', '01202 7755', 'call me', '+33 1 23 45 67 89') as $bad)
    ok(mm_uk_phone($bad) === '', 'refuses "' . $bad . '"', mm_uk_phone($bad));

echo "-- machine ids, names, emails\n";
ok(mm_machine('ABC123abc123') === 'abc123abc123', 'the app\'s 12-hex id, any case');
ok(mm_machine(str_repeat('a', 32)) === str_repeat('a', 32), '32 hex accepted');
ok(mm_machine('abc') === '' && mm_machine(str_repeat('a', 33)) === '' && mm_machine('abc123abc12g') === '' && mm_machine(array()) === '', 'short, long, non-hex and non-string refused');
ok(mm_clean("  Jane \t\n Smith\x07 ") === 'Jane Smith', 'names are trimmed and control characters removed');
ok(mm_len('Zoë Brontë') === 10, 'length counts characters, not bytes');
ok(mm_email_ok('jane@example.com') && !mm_email_ok('jane@') && !mm_email_ok('') && !mm_email_ok(str_repeat('a', 160) . '@x.com'), 'email check');

echo "-- the rate store\n";
$TMP = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'pcm-mm-test-' . getmypid();
@mkdir($TMP);
$RF = mm_rate_file($TMP);
ok(basename($RF) === 'a73630561fad55b14e18294125fc3c07e891854d.json', 'the store is sha1-named', basename($RF));
$t0 = gmmktime(10, 0, 0, 10, 1, 2026);
$okN = 0; for ($i = 0; $i < 25; $i++) if (mm_rate_take($RF, array(array('f:m1', 20)), $t0) === true) $okN++;
ok($okN === 20, '20 a day, then refused', (string)$okN);
ok(mm_rate_take($RF, array(array('f:m2', 20)), $t0) === true, 'another machine is counted separately');
ok(mm_rate_take($RF, array(array('f:m1', 20)), $t0 + 86400) === true, 'a new UTC day starts again');
$st = json_decode(file_get_contents($RF), true);
ok($st['d'] === '2026-10-02' && count($st['c']) === 1, 'yesterday\'s counters are gone, not kept', json_encode($st));
ok(mm_rate_take($RF, array(array('a', 1), array('b', 5)), $t0 + 86400) === true && mm_rate_take($RF, array(array('a', 1), array('b', 5)), $t0 + 86400) === false, 'a full bucket refuses');
$st = json_decode(file_get_contents($RF), true);
ok($st['c']['b'] === 1, 'all or nothing: the refused request took nothing from the other bucket', json_encode($st['c']));
ok(mm_rate_take($TMP . '/no-such-dir/x.json', array(array('a', 1))) === 'busy', 'a store that cannot be opened says busy');
ok(strlen(mm_ip_key()) === 16 && ctype_xdigit(mm_ip_key()), 'the IP is only ever a 16-hex daily hash');

echo "-- the Slack card\n";
$card = mm_help_card(array('name' => 'Jane <b>&</b> Smith', 'phone' => '01202 775566', 'email' => 'jane@example.com', 'virgin' => 'jane@ntlworld.com',
                           'count' => 36797, 'mb' => 2700, 'phase' => 'upload', 'ver' => 30, 'machine' => 'abc123abc123'), $t0);
$j = json_encode($card, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
ok(strpos($j, 'Jane &lt;b&gt;&amp;&lt;/b&gt; Smith') !== false && strpos($j, '<b>') === false, 'names are escaped for Slack');
ok(strpos($j, '36,797 emails · 2.6 GB · about 6 days into Gmail') !== false, 'mailbox line: count, size, days at 450 MB a day', $j);
ok(strpos($j, '£60 per email address') !== false && strpos($j, 'full PC service') !== false, 'the price, as the owner set it');
ok(strpos($j, 'Sending to Gmail') !== false && strpos($j, 'jane@ntlworld.com') !== false && strpos($j, '11:00, Thu 1 Oct') !== false, 'phase, Virgin address and UK time', $j);
ok(strpos($j, 'hooks.slack.com') === false, 'no webhook in the card');
$c2 = json_encode(mm_help_card(array('name' => 'A', 'phone' => '01202 775566', 'email' => '', 'virgin' => '', 'count' => 0, 'mb' => 0, 'phase' => '', 'ver' => 30, 'machine' => 'abc123abc123'), $t0), JSON_UNESCAPED_UNICODE);
ok(strpos($c2, 'not checked yet') !== false && strpos($c2, 'Email:') === false && strpos($c2, 'Virgin address') === false, 'optional fields are left out when empty');

echo "-- .htaccess\n";
$ht = (string)@file_get_contents(dirname(__DIR__) . '/.htaccess');
preg_match_all('#<FilesMatch "([^"]+)">\s*Require all denied#', $ht, $fm);
preg_match_all('#<Files "([^"]+)">\s*Require all denied#', $ht, $fx);
$denied = function ($name) use ($fm, $fx) {
    foreach ($fm[1] as $re) if (@preg_match('~' . $re . '~', $name)) return true;
    return in_array($name, $fx[1], true);
};
ok(count($fm[1]) > 20, 'read the deny rules', (string)count($fm[1]));
foreach (array(basename($RF), 'pcm-mailmove-lib.php', 'pcm-mailmove-test.php', 'mailmover-payload.ps1', 'slack-webhook.php') as $n) ok($denied($n), $n . ' is refused over HTTP');
foreach (array('pcm-mailmover.php', 'pcm-mailmove-help.php') as $n) ok(!$denied($n), $n . ' stays served');

echo "-- end to end (PHP's built-in server, a fake Slack)\n";
$PHP = PHP_BINARY;
$API = $TMP . DIRECTORY_SEPARATOR . 'api'; $SL = $TMP . DIRECTORY_SEPARATOR . 'slack';
@mkdir($API); @mkdir($SL);
foreach (array('pcm-mailmover.php', 'pcm-mailmove-help.php', 'pcm-mailmove-lib.php', 'pcm-vname-lib.php') as $f) copy(__DIR__ . '/' . $f, $API . '/' . $f);
$PAY = "Write-Output 'hello from the Mail Mover'\r\n\r\n# SIG # Begin signature block\r\n# MIIfakeSignature\r\n# SIG # End signature block\r\n";
file_put_contents($API . '/mailmover-payload.ps1', $PAY);
file_put_contents($API . '/pcm-data.json', json_encode(array('customers' => array('KEY-1' => array('machines' => array('abc123abc123' => array('mailmove' => 1), 'def456def456' => array()))))));
file_put_contents($SL . '/router.php', '<?php $b = file_get_contents("php://input"); file_put_contents(__DIR__ . "/posts.log", $b . "\n", FILE_APPEND); if (file_exists(__DIR__ . "/fail")) { http_response_code(500); echo "no"; } else echo "ok";');
function freeport() { for ($i = 0; $i < 50; $i++) { $p = mt_rand(8600, 8990); $s = @fsockopen('127.0.0.1', $p, $e, $es, 0.2); if (!$s) return $p; fclose($s); } return 8777; }
$procs = array();
function serve($args, $env, $port) {
    global $procs, $PHP;
    $p = proc_open(array_merge(array($PHP, '-S', '127.0.0.1:' . $port), $args), array(0 => array('pipe', 'r'), 1 => array('file', 'NUL', 'w'), 2 => array('file', 'NUL', 'w')), $pipes, null, $env);
    $procs[] = $p;
    for ($i = 0; $i < 50; $i++) { $s = @fsockopen('127.0.0.1', $port, $e, $es, 0.2); if ($s) { fclose($s); return true; } usleep(100000); }
    return false;
}
$P1 = freeport(); $P2 = freeport(); while ($P2 === $P1) $P2 = freeport(); $P3 = freeport(); while ($P3 === $P1 || $P3 === $P2) $P3 = freeport();
$env = getenv();
ok(serve(array($SL . '/router.php'), $env, $P2), 'fake Slack up');
ok(serve(array('-t', $API), $env + array('MM_FAKE_SLACK' => 'http://127.0.0.1:' . $P2 . '/hook'), $P1), 'api up');
ok(serve(array('-t', $API), $env, $P3), 'api without a webhook up');
function req($port, $path, $body, $method = 'POST', $hdr = '') {
    $ctx = stream_context_create(array('http' => array('method' => $method, 'header' => "Content-Type: application/json\r\n" . $hdr, 'content' => $method === 'POST' ? (is_string($body) ? $body : json_encode($body)) : '', 'ignore_errors' => true, 'timeout' => 15)));
    $r = @file_get_contents('http://127.0.0.1:' . $port . '/' . $path, false, $ctx);
    $code = 0; if (isset($http_response_header[0]) && preg_match('#\s(\d{3})\s#', $http_response_header[0], $m)) $code = (int)$m[1];
    return array($code, (string)$r);
}
$posts = function () use ($SL) { $f = $SL . '/posts.log'; return file_exists($f) ? array_values(array_filter(explode("\n", file_get_contents($f)))) : array(); };

// the free route
list($c, $b) = req($P1, 'pcm-mailmover.php', array('free' => 1, 'machine' => 'aaaaaa111111', 'ver' => 30));
ok($c === 200 && $b === $PAY, 'free: v30 with a machine id gets the signed file, byte for byte', $c . ' ' . substr($b, 0, 60));
list($c, $b) = req($P1, 'pcm-mailmover.php', array('free' => '1', 'machine' => 'AAAAAA222222', 'ver' => '31'));
ok($c === 200 && $b === $PAY, 'free: string values from the app are fine too');
list($c, $b) = req($P1, 'pcm-mailmover.php', array('free' => 1, 'machine' => 'aaaaaa111111', 'ver' => 29));
ok($b === "# 365 Mail Mover unavailable: please update 365 PC Manager to the latest version\n", 'free: an older app is told to update', $b);
list($c, $b) = req($P1, 'pcm-mailmover.php', array('free' => 1, 'machine' => 'xyz', 'ver' => 30));
ok($b === "# 365 Mail Mover unavailable: bad request\n", 'free: a bad machine id is refused', $b);
list($c, $b) = req($P1, 'pcm-mailmover.php', array('free' => 1, 'ver' => 30));
ok($b === "# 365 Mail Mover unavailable: bad request\n", 'free: no machine id is refused', $b);
$n = 1; for ($i = 0; $i < 22; $i++) { list($c, $b) = req($P1, 'pcm-mailmover.php', array('free' => 1, 'machine' => 'aaaaaa111111', 'ver' => 30)); if ($b === $PAY) $n++; }
ok($n === 20, 'free: 20 fetches per machine per day', (string)$n);
ok($b === "# 365 Mail Mover unavailable: daily limit reached - please try again tomorrow\n" && $c === 200, 'free: the 21st is refused in the app\'s own format, with a 200', $c . ' ' . $b);
list($c, $b) = req($P1, 'pcm-mailmover.php', array('free' => 1, 'machine' => 'bbbbbb333333', 'ver' => 30));
ok($b === $PAY, 'free: another machine is unaffected');
$store = $API . '/' . basename($RF);
$sj = json_decode((string)@file_get_contents($store), true);
ok(is_array($sj) && (int)$sj['c']['f:aaaaaa111111'] === 20, 'the store counts per machine', json_encode($sj));
$keys = implode(' ', array_keys($sj['c']));
ok(strpos($keys, '127.0.0.1') === false && preg_match('/fi:[a-f0-9]{16}/', $keys), 'the store holds no IP address, only its daily hash', $keys);
file_put_contents($API . '/mailmover-payload.ps1', "Write-Output 'unsigned'\r\n");
$before = (int)$sj['c']['f:bbbbbb333333'];
list($c, $b) = req($P1, 'pcm-mailmover.php', array('free' => 1, 'machine' => 'bbbbbb333333', 'ver' => 30));
$sj = json_decode((string)@file_get_contents($store), true);
ok($c === 503 && $b === "# 365 Mail Mover unavailable: temporarily unavailable\n", 'free: an unsigned file is never handed out', $c . ' ' . $b);
ok((int)$sj['c']['f:bbbbbb333333'] === $before, 'free: ...and that failure used up nothing');
file_put_contents($API . '/mailmover-payload.ps1', $PAY);

// the staff route, unchanged
list($c, $b) = req($P1, 'pcm-mailmover.php', array('key' => 'KEY-1', 'machine' => 'abc123abc123'));
ok($c === 200 && $b === $PAY, 'staff: a switched-on machine gets the file');
list($c, $b) = req($P1, 'pcm-mailmover.php', array('key' => 'KEY-1', 'machine' => 'def456def456'));
ok($b === "# 365 Mail Mover unavailable: not switched on\n", 'staff: switched off -> the same refusal line as before', $b);
list($c, $b) = req($P1, 'pcm-mailmover.php', array('machine' => 'abc123abc123'));
ok($b === "# 365 Mail Mover unavailable: not switched on\n", 'staff: no key -> not switched on', $b);
list($c, $b) = req($P1, 'pcm-mailmover.php', 'not json');
ok($b === "# 365 Mail Mover unavailable: bad request\n", 'staff: not JSON -> bad request', $b);

// the help card
$good = array('machine' => 'cccccc444444', 'name' => 'Jane Smith', 'phone' => '+44 (0)1202 775566', 'email' => 'Jane@Example.com',
              'virgin' => 'jane@blueyonder.co.uk', 'count' => 12000, 'mb' => 950.5, 'phase' => 'upload', 'ver' => 30);
list($c, $b) = req($P1, 'pcm-mailmove-help.php', '', 'GET');
ok($c === 405 && json_decode($b, true) == array('ok' => false, 'error' => 'method'), 'help: GET is refused', $c . ' ' . $b);
list($c, $b) = req($P1, 'pcm-mailmove-help.php', $good);
$p = $posts();
ok(json_decode($b, true) == array('ok' => true) && count($p) === 1, 'help: a good request -> {"ok":true} and one Slack post', $b);
$card = json_decode($p[0], true); $cj = json_encode($card, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
ok(strpos($cj, 'Jane Smith') !== false && strpos($cj, '01202 775566') !== false && strpos($cj, 'jane@example.com') !== false && strpos($cj, 'jane@blueyonder.co.uk') !== false, 'help: the card carries name, phone (tidied), email and Virgin address', $cj);
ok(strpos($cj, '12,000 emails · 951 MB · about 3 days into Gmail') !== false || strpos($cj, '12,000 emails · 950 MB · about 3 days into Gmail') !== false, 'help: and the mailbox size', $cj);
foreach (array(array(array('name' => ''), 'name'), array(array('name' => str_repeat('x', 61)), 'name'), array(array('phone' => '12345'), 'phone'),
               array(array('phone' => '+1 202 555 0100'), 'phone'), array(array('email' => 'not-an-email'), 'email'), array(array('machine' => 'zz'), 'machine')) as $t) {
    list($c, $b) = req($P1, 'pcm-mailmove-help.php', array_merge($good, $t[0], array('machine' => isset($t[0]['machine']) ? $t[0]['machine'] : 'dddddd555555')));
    ok(json_decode($b, true) == array('ok' => false, 'error' => $t[1]), 'help: refuses ' . json_encode($t[0]) . ' with "' . $t[1] . '"', $b);
}
ok(count($posts()) === 1, 'help: refused requests post nothing');
list($c, $b) = req($P1, 'pcm-mailmove-help.php', array_merge($good, array('machine' => 'eeeeee666666', 'name' => str_repeat('é', 60), 'virgin' => 'rubbish', 'email' => '')));
$p = $posts();
ok(json_decode($b, true) == array('ok' => true) && strpos($p[1], 'rubbish') === false && strpos($p[1], 'Virgin address') === false, 'help: a 60-letter accented name is fine; a bad Virgin address is dropped, not fatal', $b);
list($c, $b) = req($P1, 'pcm-mailmove-help.php', array_merge($good, array('website' => 'http://spam.example')));
ok(json_decode($b, true) == array('ok' => true) && count($posts()) === 2, 'help: the honeypot says ok and posts nothing');
list($c, $b) = req($P1, 'pcm-mailmove-help.php', array_merge($good, array('name' => '<script>alert(1)</script> & co', 'machine' => 'ffffff777777')));
$p = $posts();
ok(strpos($p[2], '<script>') === false && strpos($p[2], '&lt;script&gt;') !== false, 'help: markup in a name reaches Slack escaped');
$okn = 0; for ($i = 0; $i < 6; $i++) { list($c, $b) = req($P1, 'pcm-mailmove-help.php', array_merge($good, array('machine' => '999999aaaaaa'))); if (json_decode($b, true) == array('ok' => true)) $okn++; }
ok($okn === 5 && json_decode($b, true) == array('ok' => false, 'error' => 'rate'), 'help: 5 per machine per day, then "rate"', $okn . ' ' . $b);
touch($SL . '/fail');
list($c, $b) = req($P1, 'pcm-mailmove-help.php', array_merge($good, array('machine' => '888888bbbbbb')));
ok(json_decode($b, true) == array('ok' => false, 'error' => 'send'), 'help: Slack refusing -> {"ok":false,"error":"send"}', $b);
@unlink($SL . '/fail');
list($c, $b) = req($P1, 'pcm-mailmove-help.php', array_merge($good, array('machine' => '777777cccccc')), 'POST', "Origin: https://evil.example\r\n");
ok($c === 403, 'help: a browser on another site is refused', $c . ' ' . $b);
list($c, $b) = req($P3, 'pcm-mailmove-help.php', array_merge($good, array('machine' => '666666dddddd')));
ok(json_decode($b, true) == array('ok' => false, 'error' => 'unavailable'), 'help: no webhook on the server -> "unavailable" (the app says ring us)', $b);
$st2 = json_decode((string)@file_get_contents($store), true);
ok(!isset($st2['c']['h:666666dddddd']), 'help: ...and nothing was counted for it');
$storeText = (string)@file_get_contents($store);
ok(strpos($storeText, 'Jane') === false && strpos($storeText, '775566') === false && strpos($storeText, '@') === false, 'help: the store holds no name, phone or address');

foreach ($procs as $p) { @proc_terminate($p); @proc_close($p); }
rrm($TMP);
echo "\n" . ($fails ? $fails . " FAILED\n" : "all passed\n");
exit($fails ? 1 : 0);
