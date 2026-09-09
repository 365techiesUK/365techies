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

echo "-- guarantees\n";
$g = pcm_asset_pc_guarantee('2024-03-14', 'Dell Inc. Latitude 3520', true, $NOW);
ok($g && $g['to'] === '2029-03-14' && $g['text'] === '365 Techies 5-year guarantee to 14 March 2029 - 2 years 6 months left, while you are on a support plan', 'Dell on support: five years from us', json_encode($g));
$g = pcm_asset_pc_guarantee('2024-03-14', 'Dell Inc. Latitude 3520', false, $NOW);
ok($g && $g['to'] === '2025-03-14' && strpos($g['text'], '12-month guarantee (ended 14 March 2025)') !== false && strpos($g['text'], 'five years') !== false, 'Dell not on support: twelve months, ended, with the support-plan note', json_encode($g));
$g = pcm_asset_pc_guarantee('2026-06-01', 'Dell OptiPlex 7010', false, $NOW);
ok($g && strpos($g['text'], 'to 1 June 2027 - 8 months left') !== false, 'twelve months still running reads with the time left', json_encode($g));
ok(pcm_asset_pc_guarantee('2024-03-14', 'HP Pavilion 15', true, $NOW) === null, 'not a Dell: no guarantee line (the rule is written for Dell)');
ok(pcm_asset_pc_guarantee('rubbish', 'Dell Latitude 3520', true, $NOW) === null, 'no date: no line');
$t = pcm_asset_drive_terms('CT1000P3PSSD8', 932);
ok($t && $t['maker'] === 'Crucial' && $t['years'] === 5 && $t['tbw'] === null && $t['tbw_cond'] === true, 'Crucial P3 Plus 1TB: years verified, TBW figure withheld until the datasheet is read', json_encode($t));
$t2 = pcm_asset_drive_terms('Samsung SSD 990 PRO 1TB', 932);
ok($t2 && $t2['tbw'] === 600 && pcm_asset_drive_terms('Samsung SSD 990 PRO 2TB', 1863)['tbw'] === 1200, 'Samsung 990 PRO: verified TBW per capacity');
ok(pcm_asset_drive_terms('KINGSTON SNV2S1000G', 932) === null, 'an unverified model prints nothing');
ok(pcm_asset_drive_terms('WDC WD10EZEX', 932) === null, 'an unknown model prints nothing');
$txt = pcm_asset_drive_terms_text($t2, '2024-03-14', 12.6, $NOW);
ok($txt === "Maker's guarantee: 5 years or 600 TB written, whichever first - 12.6 TB written so far (2% of the rating) - to 14 March 2029", 'the drive terms line with a verified rating', $txt);
$txt = pcm_asset_drive_terms_text($t, '2024-03-14', 12.6, $NOW);
ok($txt === "Maker's guarantee: 5 years or the drive's rated bytes written, whichever first - 12.6 TB written so far - to 14 March 2029", 'the condition is named without a number when the figure is unverified', $txt);
$txt = pcm_asset_drive_terms_text($t2, '', 0.4, $NOW);
ok($txt === "Maker's guarantee: 5 years or 600 TB written, whichever first - 400 GB written so far (0% of the rating)", 'no purchase date: terms and usage only', $txt);
$txt = pcm_asset_drive_terms_text(array('maker' => 'X', 'name' => 'Y', 'years' => 3, 'tbw' => null, 'cap' => ''), '2020-01-10', null, $NOW);
ok($txt === "Maker's guarantee: 3 years from purchase - ended 10 January 2023", 'no TBW rating and an expired term', $txt);
$custX = array('email' => 'no-such@example.invalid', 'tier' => 'pro', 'machines' => array('m1' => array('model' => 'Dell Latitude 3520')));
$fm = pcm_asset_for_machine($custX, 'm1', 'Dell Latitude 3520', array(array('model' => 'CT1000P3PSSD8', 'sizeGB' => 932, 'tbw' => 12.6)));
ok($fm['pc'] === null && count($fm['terms']) === 1 && strpos($fm['terms'][0]['text'], '12.6 TB written so far') !== false && strpos($fm['terms'][0]['text'], ' - to ') === false,
   'with no books to read, the drive terms still print - usage yes, end date no, purchase never invented', json_encode($fm['terms']));

echo "\n" . ($fails ? $fails . ' FAILED' : 'all passed') . "\n";
exit($fails ? 1 : 0);
