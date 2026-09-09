<?php
/**
 * Asset register matcher - test suite.   Run:  php api/pcm-asset-test.php
 * Pure fixtures, no QuickBooks. Pins: model matching by family + number, the
 * single-machine and one-of-this-model rules, refusal when ambiguous, drive matching
 * by marketing capacity and the fitted-with-the-PC fallback, and the age wording.
 */
if (PHP_SAPI !== 'cli') { http_response_code(403); exit('cli only'); }
require __DIR__ . '/pcm-asset-lib.php';

$fails = 0;
function ok($cond, $what, $detail = '') { global $fails; echo ($cond ? '  PASS  ' : '  FAIL  ') . $what . ($cond || $detail === '' ? '' : '   [' . $detail . ']') . "\n"; if (!$cond) $fails++; }

$NOW = mktime(12, 0, 0, 9, 9, 2026);
$inv = array(
    array('date' => '2024-03-14', 'num' => '1187', 'lines' => array('Dell Latitude 3520 i5 laptop, 16GB, new 1TB SSD fitted', 'Setup and data transfer')),
    array('date' => '2025-01-20', 'num' => '1340', 'lines' => array('Monthly IT Support - 1 PC')),
    array('date' => '2022-06-02', 'num' => '0901', 'lines' => array('Dell Latitude 3520 laptop (refurbished)')),
);

echo "-- the PC\n";
$r = pcm_asset_match($inv, 'Dell Inc. Latitude 3520', array(), 1, 1, $NOW);
ok($r['pc'] && $r['pc']['num'] === '1187' && $r['pc']['date'] === '2024-03-14', 'single-machine customer: the NEWEST invoice naming the model wins', json_encode($r['pc']));
ok($r['pc']['age'] === '2 years 5 months', 'age reads like a person says it', $r['pc']['age']);
$r = pcm_asset_match($inv, 'Dell Inc. Latitude 3520', array(), 3, 1, $NOW);
ok($r['pc'] && $r['pc']['num'] === '1187', 'a company with several machines but ONE of this model still matches');
$r = pcm_asset_match($inv, 'Dell Inc. Latitude 3520', array(), 3, 2, $NOW);
ok($r['pc'] === null && $r['why'] === 'ambiguous_pc', 'two of the same model on the account: refused, staff decide', json_encode($r));
$r = pcm_asset_match($inv, 'Dell Inc. OptiPlex 7010', array(), 1, 1, $NOW);
ok($r['pc'] === null && $r['why'] === 'no_pc_line', 'a model we never invoiced gets nothing', json_encode($r));
$r = pcm_asset_match($inv, 'Dell Inc. Latitude 3420', array(), 1, 1, $NOW);
ok($r['pc'] === null, 'the family alone is not enough when the number differs (3420 vs 3520)');
$r = pcm_asset_match(array(array('date' => '2023-11-01', 'num' => '1101', 'lines' => array('HP Pavilion laptop 15.6" 8GB'))), 'HP Pavilion 15-eg0xxx', array(), 1, 1, $NOW);
ok($r['pc'] && $r['pc']['num'] === '1101', 'a model with no clean number matches on brand + family for a single-machine customer', json_encode($r));
$r = pcm_asset_match(array(array('date' => '2023-11-01', 'num' => '1101', 'lines' => array('Lenovo IdeaPad laptop'))), 'HP Pavilion 15-eg0xxx', array(), 1, 1, $NOW);
ok($r['pc'] === null, 'brand + family must BOTH appear');
ok(pcm_asset_match(array(), 'Dell Latitude 3520', array(), 1, 1, $NOW)['why'] === 'no_invoices', 'no invoices = no match, said so');
ok(pcm_asset_match($inv, '', array(), 1, 1, $NOW)['why'] === 'no_model', 'no model = no match, said so');

echo "-- the drives\n";
$drives = array(array('model' => 'CT1000P3PSSD8', 'sizeGB' => 932));
$r = pcm_asset_match($inv, 'Dell Latitude 3520', $drives, 1, 1, $NOW);
ok(count($r['drives']) === 1 && $r['drives'][0]['num'] === '1187' && $r['drives'][0]['model'] === 'CT1000P3PSSD8', 'a 932 GB drive matches the "1TB SSD" line', json_encode($r['drives']));
$inv2 = array(array('date' => '2024-03-14', 'num' => '1187', 'lines' => array('Dell Latitude 3520 laptop', 'New SSD fitted and Windows reinstalled')));
$r = pcm_asset_match($inv2, 'Dell Latitude 3520', $drives, 1, 1, $NOW);
ok(count($r['drives']) === 1 && $r['drives'][0]['num'] === '1187', 'one drive + an unsized SSD line on the PC\'s own invoice = the drive fitted with it', json_encode($r['drives']));
$r = pcm_asset_match($inv2, 'Dell Latitude 3520', array($drives[0], array('model' => 'WD Blue', 'sizeGB' => 1863)), 1, 1, $NOW);
ok(count($r['drives']) === 0, 'two drives and an unsized line: nothing assigned - we cannot tell which');
$inv3 = array(array('date' => '2025-06-10', 'num' => '1500', 'lines' => array('Samsung 2 TB NVMe SSD upgrade + clone')));
$r = pcm_asset_match($inv3, 'Dell Latitude 3520', array(array('model' => 'Samsung 990', 'sizeGB' => 1863)), 1, 1, $NOW);
ok(count($r['drives']) === 1 && $r['drives'][0]['age'] === '1 year 2 months', '"2 TB" with a space matches a 1863 GB drive on its own later invoice', json_encode($r['drives']));
$r = pcm_asset_match($inv3, 'Dell Latitude 3520', array(array('model' => 'Samsung 990', 'sizeGB' => 465)), 1, 1, $NOW);
ok(count($r['drives']) === 0, 'a 500 GB drive does not claim the 2 TB line');
$r = pcm_asset_match($inv, 'Dell Latitude 3520', $drives, 3, 2, $NOW);
ok(count($r['drives']) === 0, 'drives are refused too when the machine is ambiguous');

echo "-- the words\n";
ok(pcm_asset_age('2026-08-20', $NOW) === '2 weeks', 'weeks', pcm_asset_age('2026-08-20', $NOW));
ok(pcm_asset_age('2026-01-09', $NOW) === '8 months', 'months', pcm_asset_age('2026-01-09', $NOW));
ok(pcm_asset_age('2023-09-09', $NOW) === '3 years', 'exact years', pcm_asset_age('2023-09-09', $NOW));
ok(pcm_asset_age('2027-01-01', $NOW) === '', 'a future date is nothing, not a negative age');
ok(pcm_asset_age('rubbish', $NOW) === '', 'a bad date is nothing');
ok(pcm_asset_size_labels(932) === array('960gb', '1tb', '1000gb', '1024gb') && pcm_asset_size_labels(238) === array('240gb', '250gb', '256gb') && pcm_asset_size_labels(50) === array(), 'measured sizes map to the labels invoices use');

echo "\n" . ($fails ? $fails . ' FAILED' : 'all passed') . "\n";
exit($fails ? 1 : 0);
