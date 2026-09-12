<?php
/**
 * PC benchmark community chart - test suite.   Run:  php api/bench-test.php
 * Pure fixtures. Pins: version gate, bounds, the consistency check, whitelists and sanitising,
 * the privacy floor, one-result-per-device, the window, cdf/histogram/median, and pruning.
 */
if (PHP_SAPI !== 'cli') { http_response_code(403); exit('cli only'); }
require __DIR__ . '/bench-lib.php';
$fails = 0;
function ok($cond, $what, $detail = '') { global $fails; echo ($cond ? '  PASS  ' : '  FAIL  ') . $what . ($cond || $detail === '' ? '' : '   [' . $detail . ']') . "\n"; if (!$cond) $fails++; }
$NOW = 1757700000; $DEV = str_repeat('a', 16);
function good($over = array()) {
    return array_merge(array('v' => 2, 'score' => 84, 'sub' => array('single' => 90, 'multi' => 88, 'crypto' => 70, 'mem' => 80, 'gpu' => 85, 'store' => 75),
                             'threads' => 8, 'os' => 'Windows', 'browser' => 'Chrome', 'gpu' => 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3090 Direct3D11)'), $over);
}
// weighted: 90*.22+88*.22+70*.08+80*.13+85*.20+75*.15 = 19.8+19.36+5.6+10.4+17+11.25 = 83.41 -> 83 ; score 84 is within 2

echo "-- validation\n";
$r = bench_validate(good(), $DEV, $NOW);
ok(isset($r['row']) && $r['row']['s'] === 84 && $r['row']['th'] === 8 && $r['row']['os'] === 'Windows', 'a consistent row is accepted', json_encode($r));
ok(isset(bench_validate(good(array('v' => 1)), $DEV, $NOW)['err']), 'old scale version is rejected');
ok(bench_validate(good(array('score' => 101)), $DEV, $NOW)['err'] === 'score', 'score above 100 rejected');
ok(bench_validate(good(array('score' => 40)), $DEV, $NOW)['err'] === 'inconsistent', 'overall that does not match the sub-scores is rejected');
ok(bench_validate(good(array('sub' => array('single' => 90, 'multi' => 88))), $DEV, $NOW)['err'] === 'too_few_tests', 'fewer than three tests rejected');
$r = bench_validate(good(array('sub' => array('single' => 90, 'multi' => 88, 'crypto' => null, 'mem' => 80, 'gpu' => 85, 'store' => 75), 'score' => 85)), $DEV, $NOW);
ok(isset($r['row']) && $r['row']['sub']['crypto'] === null, 'a missing test is allowed as null', json_encode($r));
ok(bench_validate(good(array('threads' => 0)), $DEV, $NOW)['err'] === 'threads', 'threads out of range rejected');
$r = bench_validate(good(array('os' => 'TempleOS', 'browser' => 'Lynx', 'gpu' => "Weird\x00 GPU \xE2\x9C\x93 with a very very very very very very very long name indeed")), $DEV, $NOW);
ok($r['row']['os'] === 'other' && $r['row']['br'] === 'other' && strlen($r['row']['gpu']) <= 60 && strpos($r['row']['gpu'], "\x00") === false, 'unknown os/browser become other; gpu sanitised and capped', json_encode($r['row']));
ok(bench_validate(good(), 'not-a-hash', $NOW)['err'] === 'device', 'device hash must be sixteen hex chars');

echo "-- statistics\n";
function row($dev, $s, $daysAgo = 1, $v = 2) { global $NOW; return array('t' => $NOW - $daysAgo * 86400, 'v' => $v, 's' => $s, 'dev' => $dev); }
$rows = array(); for ($i = 0; $i < 49; $i++) $rows[] = row('d' . $i, 50 + $i % 30);
$st = bench_stats($rows, $NOW);
ok($st['enough'] === false && $st['count'] === 49 && !isset($st['cdf']) && !isset($st['hist']), 'forty-nine results: nothing published', json_encode($st));
$rows[] = row('d49', 90);
$st = bench_stats($rows, $NOW);
ok($st['enough'] === true && $st['count'] === 50 && count($st['cdf']) === 101 && count($st['hist']) === 20, 'fifty results: chart published');
ok(array_sum($st['hist']) === 50, 'histogram sums to the count');
$mono = true; for ($s = 1; $s <= 100; $s++) if ($st['cdf'][$s] < $st['cdf'][$s - 1]) $mono = false;
ok($mono && $st['cdf'][100] == 1.0 && $st['cdf'][4] == 0.0, 'cdf is monotone, 0 below the lowest and 1 at 100');
ok($st['cdf'][89] == 0.98 && $st['cdf'][90] == 1.0, 'cdf[89] = share below the one 90 (49/50)', json_encode(array($st['cdf'][89], $st['cdf'][90])));
$rows2 = $rows; $rows2[] = row('d0', 20, 0);                       // d0 runs again today with a worse score
$st2 = bench_stats($rows2, $NOW);
ok($st2['count'] === 50 && $st2['hist'][4] === 1 && $st2['hist'][intdiv(50, 5)] === $st['hist'][10] - 1, 'one result per device: the latest run replaces the earlier one', json_encode(array($st2['count'], $st2['hist'][4])));
$rows3 = $rows; for ($i = 0; $i < 30; $i++) $rows3[] = row('old' . $i, 99, 400);   // outside the window
$rows3[] = row('v1', 99, 1, 1);                                                    // old scale
$st3 = bench_stats($rows3, $NOW);
ok($st3['count'] === 50 && $st3['hist'][19] === 0, 'rows older than a year and old-scale rows are ignored', json_encode($st3['count']));
ok($st['median'] >= 50 && $st['median'] <= 80, 'median in range', $st['median']);

echo "-- pruning\n";
$text = ''; for ($i = 0; $i < BENCH_MAX_ROWS + 500; $i++) $text .= '{"i":' . $i . "}\n";
$kept = bench_prune_text($text);
$lines = explode("\n", trim($kept));
ok(count($lines) === BENCH_MAX_ROWS && $lines[0] === '{"i":500}' && substr($kept, -1) === "\n", 'prune keeps the newest rows and a trailing newline', count($lines));

echo "\n" . ($fails ? $fails . ' FAILED' : 'all passed') . "\n";
exit($fails ? 1 : 0);
