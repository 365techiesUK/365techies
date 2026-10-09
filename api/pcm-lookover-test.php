<?php
/*
 * PC Manager's free month - the "free look-over" (pcm-lookover.php / pcm-lookover-lib.php, 9 Oct 2026). CLI only:
 *   C:\tools\php\php.exe -d extension=mbstring api/pcm-lookover-test.php
 * The Slack card must stay readable by the inbox and the lead reminders (lc_lead, comms_lead_from_post); the reports,
 * the library and this test are never URLs; the stored reports never go in git.
 * (The whole flow over HTTP - give a month, hand it over, the service, send, staff open it, the refusals - is the
 * scratchpad trial/run.py end-to-end test of 9 Oct 2026.)
 */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
error_reporting(E_ALL);
require __DIR__ . '/pcm-mailmove-lib.php';
require __DIR__ . '/pcm-lookover-lib.php';
require __DIR__ . '/pcm-leadchase-lib.php';
$fails = 0;
function check($ok, $what, $detail = '') { global $fails; echo ($ok ? "  PASS  " : "  FAIL  ") . $what . ($ok ? '' : "  [" . $detail . "]") . "\n"; if (!$ok) $fails++; }

echo "A  the Slack card\n";
$f = array('name' => 'Jean <Pritchard>', 'email' => 'jean@example.com', 'phone' => '07700 900123', 'kind' => 'service', 'cc' => 'GB', 'ver' => '36.1');
$c = lo_card($f, '0123456789abcdef', 1791000000 + 30 * 86400, 1791000000);
check($c['text'] === 'Report look-over: please email Jean &lt;Pritchard&gt; at jean@example.com', 'the first line names them and their email (markup escaped)', $c['text']);
$all = json_encode($c, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
check(strpos($all, 'https://365techies.co.uk/portal/#lookover=0123456789abcdef') !== false, 'it links to the report in the portal (staff sign-in)');
check(strpos($all, '07700 900123') !== false && strpos($all, 'Full service') !== false, 'the phone and which report');
$f2 = $f; $f2['phone'] = ''; $f2['kind'] = 'health';
$c2 = json_encode(lo_card($f2, '0123456789abcdef', 0, 1791000000));
check(strpos($c2, 'Phone') === false && strpos($c2, 'Health check') !== false && strpos($c2, 'Free month ends') === false, 'no phone given: no phone line; a health check says so');

echo "B  the inbox and the reminders read it\n";
foreach (array('as sent' => $c['text'], 'as Slack keeps it' => str_replace('jean@example.com', '<mailto:jean@example.com|jean@example.com>', $c['text'])) as $how => $t) {
    $L = lc_lead(array('ts' => '1791000000.000100', 'bot_id' => 'B1', 'text' => $t, 'blocks' => $c['blocks']));
    check(is_array($L) && $L['kind'] === 'web' && $L['label'] === 'Report look-over' && $L['who'] === 'Jean &lt;Pritchard&gt;', 'lc_lead (' . $how . '): a "Report look-over" lead', json_encode($L));
}
check(lc_lead(array('ts' => '1', 'text' => $c['text'])) === null, 'a person typing the same words is not a lead (only our app\'s posts)');

echo "C  never a URL, never in git\n";
$HT = (string)file_get_contents(__DIR__ . '/../.htaccess');
check(strpos($HT, 'RewriteRule ^api/pcm-lookover(/|$) - [F]') !== false, 'the reports folder is refused over HTTP (site rule)');
check(preg_match('/Require all denied/', (string)@file_get_contents(__DIR__ . '/pcm-lookover/.htaccess')) === 1, '...and by its own .htaccess');
foreach (array('pcm-lookover-lib.php', 'pcm-lookover-test.php') as $fn) {
    $denied = false;
    if (preg_match_all('/<FilesMatch "([^"]+)">\s*Require all denied/', $HT, $fm)) foreach ($fm[1] as $re) if (@preg_match('#' . $re . '#', $fn)) $denied = true;
    check($denied, 'denied over HTTP: ' . $fn);
}
$denied = false;
if (preg_match_all('/<FilesMatch "([^"]+)">\s*Require all denied/', $HT, $fm)) foreach ($fm[1] as $re) if (@preg_match('#' . $re . '#', 'pcm-lookover.php')) $denied = true;
check(!$denied, 'still served: pcm-lookover.php (the app sends to it, staff open reports through it)');
$GI = (string)file_get_contents(__DIR__ . '/../.gitignore');
check(preg_match('#^api/pcm-lookover/\*\r?$#m', $GI) === 1 && preg_match('#^!api/pcm-lookover/\.htaccess\r?$#m', $GI) === 1, 'the reports are never committed; the folder\'s .htaccess is');
$src = (string)file_get_contents(__DIR__ . '/pcm-lookover.php');
check(strpos($src, "if (!\$tri) lo_fail('not_trial');") !== false, 'only a free month - never a bought Unlock key (sold as software, not a service)');
check(strpos($src, "if (empty(\$in['consent'])) lo_fail('consent');") !== false, 'only with their tick');

echo "\n" . ($fails ? "pcm-lookover-test: $fails FAILED\n" : "pcm-lookover-test: all passed\n");
exit($fails ? 1 : 0);
