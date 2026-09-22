<?php
/**
 * Today against the record books - test suite.   Run:  php api/bm-records-test.php
 * Pins every sentence the page and the Facebook caption can carry, against a made-up
 * date with a known history, so a wrong claim ("hottest in history") cannot slip out.
 */
if (PHP_SAPI !== 'cli') { http_response_code(403); exit('cli only'); }
require __DIR__ . '/bm-records-lib.php';
$fails = 0;
function ok($cond, $what, $detail = '') { global $fails; echo ($cond ? '  PASS  ' : '  FAIL  ') . $what . ($cond || $detail === '' ? '' : '   [' . $detail . ']') . "\n"; if (!$cond) $fails++; }

/* 22 September at a station with records 1957-2025: record 26.4 (1985), a 24.0 in 2010,
   22.0 in 2019, lowest maximum 12.1 (1979), average 18.5. */
$hiy = array();
for ($y = 1957; $y <= 2025; $y++) $hiy[] = array($y, 18.0 + (($y * 7) % 5) * 0.5);   // 18.0 .. 20.0, tame years
$hiy[1985 - 1957] = array(1985, 26.4); $hiy[2010 - 1957] = array(2010, 24.0); $hiy[2019 - 1957] = array(2019, 22.0); $hiy[1979 - 1957] = array(1979, 12.1);
$day = array('hi' => array(26.4, 1985), 'lohi' => array(12.1, 1979), 'lo' => array(1.2, 1977), 'avg_hi' => 18.5, 'avg_lo' => 9.9, 'n' => 69, 'hiy' => $hiy);
$ctx = array('date' => '22 September', 'year' => 2026, 'from' => 1957, 'station' => 'Bournemouth Airport (Hurn)');

echo "-- since when\n";
ok(bmr_since($hiy, 23.0, 2026, true) === 2010 && bmr_since($hiy, 25.0, 2026, true) === 1985 && bmr_since($hiy, 27.0, 2026, true) === null, '"warmest since": the most recent year that beat the value; none above the record');
ok(bmr_since($hiy, 22.0, 2026, true) === 2010, 'a tie with 2019 does not count as 2019 beating it');
ok(bmr_since($hiy, 17.0, 2026, false) === 1979 && bmr_since($hiy, 12.0, 2026, false) === null, '"coolest since": the most recent year below the value; none below the lowest');
ok(bmr_since($hiy, 10.0, 2027, true) !== 2027 && bmr_since(array(array(2026, 30.0)), 10.0, 2026, true) === null, 'the current year never counts as "since"');

echo "-- the verdict, measured (evening)\n";
$v = bmr_verdict($day, 27.0, 'obs', $ctx);
ok($v['tier'] === 'record' && $v['line'] === "The warmest 22 September at Bournemouth Airport (Hurn) since records began in 1957 \xE2\x80\x94 the old record was 26.4\xC2\xB0C in 1985.", 'clearing the record says so, names the station and the first year, never "in history"', $v['line']);
$v = bmr_verdict($day, 26.4, 'obs', $ctx);
ok($v['tier'] === 'near' && $v['line'] === "Within 0\xC2\xB0C of the 22 September record, 26.4\xC2\xB0C in 1985.", 'equalling the record is NOT a record', $v['line']);
$v = bmr_verdict($day, 25.6, 'obs', $ctx);
ok($v['tier'] === 'near' && $v['line'] === "Within 0.8\xC2\xB0C of the 22 September record, 26.4\xC2\xB0C in 1985.", 'within a degree', $v['line']);
$v = bmr_verdict($day, 23.0, 'obs', $ctx);
ok($v['tier'] === 'warmest_since' && $v['line'] === 'The warmest 22 September since 2010.', 'warmest since a year at least five back', $v['line']);
$v = bmr_verdict($day, 21.0, 'obs', $ctx);
ok($v['tier'] === 'warmest_since' && $v['line'] === 'The warmest 22 September since 2019.', 'seven years back is far enough to say', $v['line']);
$v = bmr_verdict($day, 19.6, 'obs', $ctx);
ok($v['tier'] === 'above' && $v['line'] === "1.1\xC2\xB0C above the average for the date." && $v['warmest_since'] === 2022, 'beaten only four years ago (2022) is not worth a "since": just above average', $v['line']);
$v = bmr_verdict($day, 18.8, 'obs', $ctx);
ok($v['tier'] === 'normal' && $v['line'] === 'About average for the date.', 'within a degree of average', $v['line']);
$v = bmr_verdict($day, 15.0, 'obs', $ctx);
ok($v['tier'] === 'coolest_since' && $v['line'] === 'The coolest 22 September since 1979.', 'coolest since', $v['line']);
$v = bmr_verdict($day, 11.0, 'obs', $ctx);
ok($v['tier'] === 'record_cold' && strpos($v['line'], 'The coldest 22 September at Bournemouth Airport (Hurn) since records began in 1957') === 0 && strpos($v['line'], "12.1\xC2\xB0C in 1979") !== false, 'the coldest daytime maximum on record', $v['line']);
ok(isset($v['delta_avg']) && $v['delta_avg'] === -7.5 && $v['coldest_since'] === null && $v['warmest_since'] === 2025, 'the numbers ride along for the page (every past year was warmer, the latest being 2025)');

echo "-- the verdict, forecast (before the evening)\n";
ok(bmr_verdict($day, 27.0, 'fc', $ctx)['line'] === "On course for the warmest 22 September at Bournemouth Airport (Hurn) since records began in 1957 \xE2\x80\x94 the old record was 26.4\xC2\xB0C in 1985.", 'a forecast is "on course for", never a claim');
ok(bmr_verdict($day, 26.0, 'fc', $ctx)['line'] === "Forecast to come within 0.4\xC2\xB0C of the 22 September record, 26.4\xC2\xB0C in 1985." && bmr_verdict($day, 23.0, 'fc', $ctx)['line'] === 'On course for the warmest 22 September since 2010.' && bmr_verdict($day, 15.0, 'fc', $ctx)['line'] === 'On course for the coolest 22 September since 1979.', 'the same tiers, forecast wording');

echo "-- the caption\n";
$c = bmr_caption($ctx, $day, 23.0, 'obs', 'The warmest 22 September since 2010.', 'warmest_since');
ok($c === "Bournemouth: 23\xC2\xB0C the high today. The warmest 22 September since 2010. Hottest 22 September on record: 26.4\xC2\xB0C (1985). Coldest: 1.2\xC2\xB0C (1977). Average high 18.5\xC2\xB0C. Records: Met Office, Bournemouth Airport (Hurn), since 1957.", 'the verdict, then the hottest and the coldest on this date each in a sentence of its own (one year per sentence), the source named', $c);
$c2 = bmr_caption($ctx, $day, 25.6, 'fc', "Forecast to come within 0.8\xC2\xB0C of the 22 September record, 26.4\xC2\xB0C in 1985.", 'near');
ok($c2 === "Bournemouth: 25.6\xC2\xB0C forecast high today. Forecast to come within 0.8\xC2\xB0C of the 22 September record, 26.4\xC2\xB0C in 1985. Coldest: 1.2\xC2\xB0C (1977). Average high 18.5\xC2\xB0C. Records: Met Office, Bournemouth Airport (Hurn), since 1957.", 'when the verdict already gives the hottest it is not repeated; a forecast says forecast', $c2);
$c3 = bmr_caption($ctx, $day, 18.8, 'obs', 'About average for the date.', 'normal');
ok(strpos($c3, 'Bournemouth, 22 September: ') === 0 && strpos($c3, "Hottest 22 September on record: 26.4\xC2\xB0C (1985). Coldest: 1.2\xC2\xB0C (1977).") !== false, 'when the verdict names no date, the prefix supplies it, and both records follow', $c3);
$dayNoLo = $day; unset($dayNoLo['lo']);
ok(strpos(bmr_caption($ctx, $dayNoLo, 18.8, 'obs', 'About average for the date.', 'normal'), 'Coldest') === false, 'no record low on file = no coldest sentence, never a made-up one');
ok(strlen($c) < 280 && strlen($c2) < 280, 'short enough for a post');
echo "-- tomorrow, in one sentence\n";
$d24 = array('hi' => array(24.9, 1983));
$tl = bmr_tomorrow_line('24 September', 19.9, $d24);
ok($tl === "Tomorrow: forecast high 19.9\xC2\xB0C. The 24 September record is 24.9\xC2\xB0C (1983).", 'the forecast against the record and nothing else: one date, one year', $tl);
$tl2 = bmr_tomorrow_line('24 September', 24.5, $d24);
ok($tl2 === "Tomorrow: forecast high 24.5\xC2\xB0C, within 0.4\xC2\xB0C of the 24 September record, 24.9\xC2\xB0C (1983).", 'within a degree of the record', $tl2);
$tl3 = bmr_tomorrow_line('24 September', 25.2, $d24);
ok($tl3 === "Tomorrow: forecast high 25.2\xC2\xB0C, which would beat the 24 September record of 24.9\xC2\xB0C (1983).", 'a forecast above the record says "would beat", never "will"', $tl3);
ok(bmr_tomorrow_line('24 September', 24.9, $d24) === "Tomorrow: forecast high 24.9\xC2\xB0C, within 0\xC2\xB0C of the 24 September record, 24.9\xC2\xB0C (1983).", 'equalling the record is not beating it');

echo "-- degrees and dates\n";
ok(bmr_deg(23.0) === "23\xC2\xB0C" && bmr_deg(22.5) === "22.5\xC2\xB0C" && bmr_deg(-1.0) === "-1\xC2\xB0C", 'whole degrees without .0, halves kept');
$md = bmr_md(strtotime('2026-09-22 15:30:00 Europe/London'));
ok($md[0] === '09-22' && $md[1] === '22 September' && $md[2] === 2026 && $md[3] === 15, 'MM-DD, the spoken date, the year and the local hour', json_encode($md));
ok(bmr_md(strtotime('2026-07-01 00:30:00 Europe/London'))[0] === '07-01' && bmr_md(strtotime('2026-06-30 23:30:00 UTC'))[0] === '07-01', 'midnight is local midnight: 23:30 UTC on 30 June is 1 July here');
ok(bmr_md(strtotime('2028-02-29 12:00:00 Europe/London'))[1] === '29 February', '29 February exists in a leap year');

echo "-- the measured maximum so far today\n";
$series = array(
    array('t' => '2026-09-22T21:50:00+00:00', 'temp' => 13), array('t' => '2026-09-22T13:20:00+00:00', 'temp' => 21),
    array('t' => '2026-09-22T12:50:00+00:00', 'temp' => 20), array('t' => '2026-09-21T22:20:00+00:00', 'temp' => 25),   // 23:20 BST yesterday
    array('t' => '2026-09-22T03:50:00+00:00', 'temp' => null), array('t' => 'rubbish', 'temp' => 30),
);
list($mx, $n) = bmr_obs_max($series, '2026-09-22');
ok($mx === 21.0 && $n === 3, 'the highest reading dated today (local), blanks and rubbish ignored, yesterday excluded', json_encode(array($mx, $n)));
ok(bmr_obs_max(array(), '2026-09-22') === array(null, 0) && bmr_obs_max($series, '2026-09-23') === array(null, 0), 'no readings = no number, never zero');

echo "-- with no records file\n";
ok(bmr_load(__DIR__ . '/no-such-file.json') === null, 'a missing file is null');
$r = bm_records_public(strtotime('2026-09-22 10:00:00 Europe/London'));
ok(!file_exists(BMR_FILE) ? ($r['ok'] === false) : ($r['ok'] === true && isset($r['today']['date'])), 'the public call says ok:false without the file, and answers for today with it', json_encode(array_intersect_key($r, array('ok' => 1, 'why' => 1))));

echo "-- the builder, at source level\n";
$B = (string)file_get_contents(__DIR__ . '/../tools/bm-records/build_records.py');
ok(strpos($B, 'refusing: a GHCN-built file must not be written under api/') !== false && strpos($B, 'Open Government Licence') !== false, 'only Met Office (OGL) data can become api/bm-records.json');
$ht = (string)file_get_contents(__DIR__ . '/../.htaccess');
ok(preg_match('/<FilesMatch "[^"]*bm-records[^"]*">/', $ht) === 1, 'the records file, this library and this test are denied to the web');
$WX = (string)file_get_contents(__DIR__ . '/bm-wx.php');
ok(strpos($WX, "'records' => bm_records_public()") !== false && strpos($WX, "require_once __DIR__ . '/bm-records-lib.php'") !== false, 'bm-wx.php serves the comparison');

echo "\n" . ($fails ? $fails . ' FAILED' : 'all passed') . "\n";
exit($fails ? 1 : 0);
