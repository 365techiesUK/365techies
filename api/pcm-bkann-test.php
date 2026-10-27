<?php
/**
 * Tests for the double Slack line fix (27 Oct 2026).  Run:  php api/pcm-bkann-test.php
 *
 * A booking staff made in the portal was announced twice in #365-job-tracker: "New booking - John Memmott on Wed 28
 * Oct 11:00am (by David)" from the portal, then "New booking (taken in SimplyBook) - John Memmott ..." from SimplyBook's
 * callback a second later. The portal now marks what it announced (pcm-bkann-lib.php) and the callback skips its line.
 *
 * Pure CLI, no network: the REAL library on a temp store, then the sources asserted to still be shaped this way.
 * (The end-to-end run - the real portal actions and the real callback against a fake SimplyBook - lives outside the
 * repo with the other SimplyBook harnesses: it needs two php -S servers.)
 */
if (php_sapi_name() !== 'cli') { http_response_code(404); exit; }
require_once __DIR__ . '/pcm-bkann-lib.php';

$fails = 0;
function ok($cond, $what) { global $fails; echo ($cond ? "  PASS  " : "  FAIL  ") . $what . "\n"; if (!$cond) $fails++; }

$F = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'bkann-test-' . getmypid() . '.php';
$now = 1793126089;

ok(bkann_recent(9101, 'create', $F, $now) === false, 'nothing marked: the callback announces as before');
ok(bkann_mark(9101, 'create', $F, $now) === true, 'a staff booking is marked');
ok(bkann_recent(9101, 'create', $F, $now + 1), '... and the callback, a second later, sees it');
ok(bkann_recent('9101', 'create', $F, $now + 899), '... for the whole 15 minutes');
ok(!bkann_recent(9101, 'create', $F, $now + 901), '... and not after: a mark wears off');
ok(!bkann_recent(9101, 'change', $F, $now + 1), 'a CHANGE to that booking made in SimplyBook is still announced (marks are per kind)');
ok(!bkann_recent(9102, 'create', $F, $now + 1), 'and another booking is unaffected (per booking id)');
bkann_mark(9101, array('change', 'cancel'), $F, $now + 10);
ok(bkann_recent(9101, 'change', $F, $now + 11) && bkann_recent(9101, 'cancel', $F, $now + 11), 'several kinds in one mark');
ok(strpos((string)file_get_contents($F), "<?php exit; ?>\n") === 0, 'the store exits before any data if fetched over the web');
bkann_mark(1, 'create', $F, $now + 90000);
$m = bkann_read($F);
ok(!isset($m['9101:create']) && isset($m['1:create']), 'marks older than a day are pruned on the next write');
ok(bkann_mark('', 'create', $F, $now) === false && bkann_mark('abc', 'create', $F, $now) === false, 'no booking id: nothing marked');
ok(bkann_recent(1, 'cre<ate>', $F, $now + 90000), 'the kind is reduced to letters, the same on both sides');
file_put_contents($F, 'garbage');
ok(bkann_read($F) === array() && bkann_recent(1, 'create', $F, $now) === false, 'a mangled store reads as no marks (worst case: one duplicate line, as before)');
@unlink($F); @unlink($F . '.lock');

/* ---- the sources: who marks, and the callback checks ---- */
$cb = (string)file_get_contents(__DIR__ . '/pcm-sb-callback.php');
$pChk = strpos($cb, 'bkann_recent($bid, $type)'); $pSay = strpos($cb, "rv_slack(\$msg)"); $pMail = strpos($cb, 'cf_notify(');
ok($pChk !== false && $pSay !== false && $pChk < $pSay, 'the callback checks the mark before it posts its line');
ok($pMail !== false && $pMail < $pChk, '... and after the customer emails, which must still go');
$bk = (string)file_get_contents(__DIR__ . '/pcm-booking.php');
$seg = function ($from, $len) use ($bk) { $p = strpos($bk, $from); return $p === false ? '' : substr($bk, $p, $len); };
$c = $seg("if (\$action === 'staffcancel')", 1200);
ok(strpos($c, "bkann_mark(\$bid, 'cancel')") !== false && strpos($c, "bkann_mark(") < strpos($c, "'cancelBooking'"), 'a portal cancel is marked BEFORE SimplyBook hears of it');
$c = $seg("if (\$action === 'staffmove')", 2600);
ok(strpos($c, "bkann_mark(\$bid, 'change')") !== false && strpos($c, "bkann_mark(") < strpos($c, "'editBook'"), 'a portal move is marked BEFORE SimplyBook hears of it');
$c = $seg('function staff_book_core(', 2600);
ok(strpos($c, "bkann_mark(\$bid, 'create')") !== false, 'every staff booking (Book a new job, Log a job we\'ve done) is marked create');
$c = $seg("if (\$action === 'custlogjob')", 9000);
ok(strpos($c, "bkann_mark(\$bid, 'change')") !== false && strpos($c, "bkann_mark(\$bid, 'change')") < strpos($c, "'setStatus'"), 'a logged job\'s SimplyBook copy is marked change before it is set Completed');

echo "\n" . ($fails ? "$fails FAILED" : "all passed") . "\n";
exit($fails ? 1 : 0);
