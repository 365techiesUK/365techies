<?php
/**
 * Fleet statistics - test suite.   Run:  php api/pcm-fleet-test.php
 * Pure fixtures, no customer file. Pins the privacy floor, the 30-day window, the "fresh"
 * exclusion, the percentages, the laptop cohort floor, the median and the size band.
 */
if (PHP_SAPI !== 'cli') { http_response_code(403); exit('cli only'); }
require __DIR__ . '/pcm-fleet-lib.php';
$fails = 0;
function ok($cond, $what, $detail = '') { global $fails; echo ($cond ? '  PASS  ' : '  FAIL  ') . $what . ($cond || $detail === '' ? '' : '   [' . $detail . ']') . "\n"; if (!$cond) $fails++; }

$NOW = 1757600000;
function mach($daysAgo, $f = array()) {
    global $NOW;
    return array_merge(array('seen' => gmdate('Y-m-d H:i', $NOW - $daysAgo * 86400), 'diskpct' => 40, 'w10' => false, 'backup' => true,
                             'av' => 'on', 'reboot' => false, 'batt' => 0, 'score' => 80), $f);
}
function fleet($machines) { $c = array(); $i = 0; foreach ($machines as $m) $c['K' . ($i++)] = array('machines' => array('m' => $m)); return array('customers' => $c); }

echo "-- the privacy floor\n";
$r = fleet_compute(fleet(array_fill(0, 19, mach(1))), $NOW);
ok($r['enough'] === false && !isset($r['stats']) && !isset($r['band']), 'nineteen machines: nothing is published', json_encode($r));
$r = fleet_compute(fleet(array_fill(0, 20, mach(1))), $NOW);
ok($r['enough'] === true && isset($r['stats']), 'twenty machines: published');

echo "-- who counts\n";
$ms = array_fill(0, 20, mach(1));
$ms[] = mach(45);                                              // stale
$ms[] = array('seen' => gmdate('Y-m-d H:i', $NOW - 3600));    // activated, never reported
$ms[] = array('seen' => 'rubbish', 'diskpct' => 50);            // unparseable
$ms[] = mach(1, array('w10' => true));                         // the one Win10 machine
$r = fleet_compute(fleet($ms), $NOW);
ok($r['stats']['windows10'] === 5, 'stale, fresh and unparseable machines are excluded: 1 of 21 = 5%', json_encode($r['stats']));

echo "-- the figures\n";
$ms = array();
for ($i = 0; $i < 25; $i++) $ms[] = mach(2, array(
    'w10' => $i < 5, 'backup' => $i < 15, 'av' => $i < 20 ? 'on' : 'off', 'diskpct' => $i < 10 ? 90 : 40,
    'reboot' => $i < 1, 'batt' => $i < 15 ? ($i < 6 ? 60 : 85) : 0, 'score' => 50 + $i));
$r = fleet_compute(fleet($ms), $NOW); $s = $r['stats'];
ok($s['windows10'] === 20 && $s['backup_seen'] === 60 && $s['antivirus_on'] === 80 && $s['drive_over_85'] === 40 && $s['restart_waiting'] === 4, 'whole-number percentages', json_encode($s));
ok($s['battery_under_70'] === 40, 'battery figure is over LAPTOPS only: 6 of 15 = 40%', json_encode($s));
ok($s['score_median'] === 62, 'median score', json_encode($s));
ok($r['band'] === '20+' && fleet_band(51) === '50+' && fleet_band(100) === '100+' && fleet_band(19) === '', 'coarse size band only');
$ms = array(); for ($i = 0; $i < 25; $i++) $ms[] = mach(2, array('batt' => $i < 5 ? 50 : 0));
$r = fleet_compute(fleet($ms), $NOW);
ok($r['stats']['battery_under_70'] === null, 'fewer than twelve laptops: no battery figure', json_encode($r['stats']));

echo "-- nothing identifying leaves\n";
$j = json_encode($r);
ok(strpos($j, 'K0') === false && strpos($j, '"seen"') === false && strpos($j, gmdate('Y-m-d', $NOW)) === false && strpos($j, 'name') === false, 'no keys, timestamps or names in the output');

echo "\n" . ($fails ? $fails . ' FAILED' : 'all passed') . "\n";
exit($fails ? 1 : 0);
