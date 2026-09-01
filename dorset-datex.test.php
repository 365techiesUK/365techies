<?php
/*
 * Tests for api/dorset-datex-lib.php, run against National Highways' OWN
 * example payloads lifted verbatim from the v2.0 OpenAPI definition.
 *
 * The PHP parser is a hand-port of the JavaScript one in the 3D client. A port
 * is exactly where a lat/lon transposition or a missed location shape creeps
 * back in silently, so both are held to the same fixtures.
 *
 * Run:  php dorset-datex.test.php
 * NOT deployed — excluded from the FTP sync alongside the other test files.
 */
require __DIR__ . '/api/dorset-datex-lib.php';

$FIXTURE = 'D:/claude/dorset-live/gods-eye-view/src/data/fixtures/datex-closures-examples.json';

$pass = 0; $fail = 0;
function ok($cond, $what) {
    global $pass, $fail;
    if ($cond) { $pass++; echo "  ok   $what\n"; }
    else       { $fail++; echo "  FAIL $what\n"; }
}
function eq($a, $b, $what) { ok($a === $b, $what . ' (got ' . var_export($a, true) . ')'); }

if (!is_file($FIXTURE)) {
    fwrite(STDERR, "fixture not found: $FIXTURE\n");
    exit(2);
}
$EX = json_decode(file_get_contents($FIXTURE), true);
$PLANNED   = 'planned closure with multiple location records';
$UNPLANNED = 'unplanned closure with single location record';
$INCIDENT  = 'incident';
$ENGLAND = array(-6.0, 49.5, 2.0, 56.0);
$DORSET  = array(-2.25, 50.65, -1.55, 50.95);

echo "posList is latitude-first and is flipped to lon/lat\n";
$out = dx_poslist('51.868835 0.525233 51.869 0.525917');
eq($out, array(array(0.525233, 51.868835), array(0.525917, 51.869)), 'A120 vertices flip correctly');
ok(abs($out[0][0]) < 1.0, 'longitude is the small number');
ok($out[0][1] > 50 && $out[0][1] < 56, 'latitude is the UK-range number');
eq(dx_poslist('51.5 -0.1 52.0'), array(array(-0.1, 51.5)), 'an odd trailing value is dropped, not turned into NaN');
eq(dx_poslist(''), array(), 'empty string yields nothing');
eq(dx_poslist(null), array(), 'null yields nothing');
eq(dx_poslist('nonsense here'), array(), 'non-numeric yields nothing');

echo "\nall three location shapes yield usable geometry\n";
foreach (array($PLANNED => 'A120', $UNPLANNED => 'M6', $INCIDENT => 'M62') as $key => $road) {
    $lr = $EX[$key]['D2Payload']['situation'][0]['situationRecord'][0]['sitRoadOrCarriagewayOrLaneManagement']['locationReference'];
    $g = dx_geometry($lr);
    ok(count($g) >= 1, "$key: produced geometry");
    $roads = array();
    foreach ($g as $x) if (!empty($x['road'])) $roads[] = $x['road'];
    ok(in_array($road, $roads, true), "$key: road name $road recovered");
}
// The incident is a POINT and carries no posList at all.
$inc = dx_geometry($EX[$INCIDENT]['D2Payload']['situation'][0]['situationRecord'][0]['sitRoadOrCarriagewayOrLaneManagement']['locationReference']);
eq(count($inc), 1, 'incident yields exactly one location');
ok(!isset($inc[0]['path']), 'incident carries no path');
eq($inc[0]['point'], array(-2.3784728, 53.489254), 'incident point is lon/lat');

echo "\nevery fixture coordinate lands in the United Kingdom\n";
foreach (array_keys($EX) as $key) {
    $r = dorset_datex_parse($EX[$key], $ENGLAND);
    ok(count($r['closures']) >= 1, "$key: produced closures");
    $bad = 0;
    foreach ($r['closures'] as $c) {
        $coords = $c['path'] ? $c['path'] : array($c['point']);
        foreach ($coords as $p) {
            if ($p[0] < -8 || $p[0] > 2 || $p[1] < 49 || $p[1] > 61) $bad++;
        }
    }
    eq($bad, 0, "$key: no coordinate outside the UK (transposition guard)");
}

echo "\nthe fields the map renders survive the parse\n";
$r = dorset_datex_parse($EX[$PLANNED], $ENGLAND);
$c = $r['closures'][0];
eq($c['road'], 'A120', 'road');
eq($c['status'], 'planned', 'validityStatus');
eq($c['source'], 'roadworks', 'sourceIdentification');
ok(strpos($c['text'], 'A120 both directions') !== false, 'public comment carried through');
eq($c['start'], '2025-03-14T08:00:00.0000000+00:00', 'overallStartTime');

// The incident uses a fourth validityStatus the portal's prose never mentions.
$ri = dorset_datex_parse($EX[$INCIDENT], $ENGLAND);
eq($ri['closures'][0]['status'], 'definedByValidityTimeSpec', 'the undocumented fourth status survives');
eq($ri['closures'][0]['source'], 'Incident Management', 'incidents are tagged as such');

echo "\nnon-real situations are dropped and the counts explain an empty result\n";
foreach (array('test', 'securityExercise', 'technicalExercise') as $drill) {
    $ex = $EX[$UNPLANNED];
    $ex['D2Payload']['situation'][0]['headerInformation']['informationStatus'] = $drill;
    $r = dorset_datex_parse($ex, $ENGLAND);
    eq(count($r['closures']), 0, "$drill never reaches the map");
    eq($r['national'], 1, "$drill still counted as arrived");
    eq($r['real'], 0, "$drill not counted as real");
}
$r = dorset_datex_parse($EX[$UNPLANNED], $ENGLAND);
eq($r['real'], 1, 'a real situation is counted as real');

echo "\nthe bounding box excludes rather than mangles\n";
foreach (array_keys($EX) as $key) {
    $r = dorset_datex_parse($EX[$key], $DORSET);
    eq(count($r['closures']), 0, "$key (Essex/Staffs/Manchester) is outside Dorset");
    ok($r['real'] >= 1, "$key still counts as arrived and real");
}

echo "\nmalformed payloads degrade to empty rather than fataling\n";
foreach (array(null, array(), array('D2Payload' => array()), array('D2Payload' => array('situation' => 'no'))) as $i => $bad) {
    $r = dorset_datex_parse($bad, $ENGLAND);
    eq($r, array('closures' => array(), 'national' => 0, 'real' => 0), "malformed input #$i");
}
eq(dx_geometry(null), array(), 'null locationReference');
eq(dx_geometry(array()), array(), 'empty locationReference');

echo "\n----\n$pass passed, $fail failed\n";
exit($fail === 0 ? 0 : 1);
