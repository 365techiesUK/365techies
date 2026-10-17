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
    array('date' => '2024-03-14', 'num' => '1187', 'lines' => array('Refurbished Dell Latitude 3520 i5 laptop, 16GB, 1TB SSD', 'Setup and data transfer')),
    array('date' => '2025-01-20', 'num' => '1340', 'lines' => array('Monthly IT Support - 1 PC')),
    array('date' => '2022-06-02', 'num' => '0901', 'lines' => array('Dell Latitude 3520 keyboard repair')),
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
$r = pcm_asset_match(array(array('date' => '2023-11-01', 'num' => '1101', 'lines' => array('HP Pavilion laptop 15.6" 8GB refurbished'))), 'HP Pavilion 15-eg0xxx', array(), 1, 1, $NOW);
ok($r['pc'] && $r['pc']['num'] === '1101', 'a model with no clean number matches on brand + family for a single-machine customer', json_encode($r));
$r = pcm_asset_match(array(array('date' => '2023-11-01', 'num' => '1101', 'lines' => array('Lenovo IdeaPad laptop'))), 'HP Pavilion 15-eg0xxx', array(), 1, 1, $NOW);
ok($r['pc'] === null, 'brand + family must BOTH appear');
ok(pcm_asset_match(array(), 'Dell Latitude 3520', array(), 1, 1, $NOW)['why'] === 'no_invoices', 'no invoices = no match, said so');
ok(pcm_asset_match($inv, '', array(), 1, 1, $NOW)['why'] === 'no_model', 'no model = no match, said so');

echo "-- the drives\n";
$drives = array(array('model' => 'CT1000P3PSSD8', 'sizeGB' => 932));
$r = pcm_asset_match($inv, 'Dell Latitude 3520', $drives, 1, 1, $NOW);
ok(count($r['drives']) === 1 && $r['drives'][0]['num'] === '1187' && $r['drives'][0]['model'] === 'CT1000P3PSSD8', 'a 932 GB drive matches the "1TB SSD" line', json_encode($r['drives']));
$inv2 = array(array('date' => '2024-03-14', 'num' => '1187', 'lines' => array('Dell Latitude 3520 laptop - refurbished', 'New SSD fitted and Windows reinstalled'), 'amts' => array(395, 0)));   // v2: the sale line says refurbished
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

echo "-- v2: a SALE, not a repair or an upgrade (17 Oct 2026)\n";
$S = function ($line, $amt = null) { return pcm_asset_line_is_sale(pcm_asset_norm($line), $amt); };
ok($S('Dell Latitude 3520 laptop (refurbished)') && $S('Refurbished computer') && $S('Dell OptiPlex 3070 SFF refurb') && $S('Reconditioned Dell Latitude 5420') && $S('Dell Latitude 7490 ex-lease, 16GB'), 'sale words: refurbished / refurb / the shop item / reconditioned / ex-lease');
// the adversarial review's wordings - every one is work on the customer's OWN PC, none may become a purchase date
$review = array(array('Upgrade Dell Latitude 3520 to 16GB RAM', 65), array('Dell OptiPlex 3070 - 1TB SSD upgrade and clone', 120), array('Supply & fit 16GB RAM - Dell Latitude 5320', null),
                array('Dell Latitude 3520 i5 - new battery fitted', 70), array('Dell Latitude 5320 Windows 11 upgrade, 8GB', null), array('Dell OptiPlex 3070 SSD upgrade', 180),
                array('Dell Latitude 3520 - new SSD and Windows', 180), array('Dell Latitude 3520 service and Windows 11 upgrade', 150), array('Dell Latitude 3520 data transfer to new laptop', 150),
                array('Dell Latitude 3520 laptop, 16GB, new 1TB SSD fitted', 395));
$bad = array(); foreach ($review as $rv) if ($S($rv[0], $rv[1])) $bad[] = $rv[0];
ok(!$bad, 'none of the review\'s 10 upgrade/service wordings reads as a sale', implode(' | ', $bad));
ok(!$S('Dell Latitude 3520 i5-1135G7 16GB 512GB SSD Windows 11 Pro', 395) && !$S('Dell Latitude 3520 laptop', 395), 'specs or a price alone are NOT a sale any more (can\'t tell them from an upgrade)');
ok(!$S('Refurbished SSD fitted to Dell Latitude 3520', 90) && !$S('Dell Latitude 3520 - refurbished battery', 45), 'a refurbished PART is not a refurbished PC');
ok(!$S('Refurbished Dell Latitude 3520 - repair of hinge') && !$S('Refurbished Dell Latitude 3520 - data transferred from old PC') && !$S('Dell Latitude 3520 refurb - labour'), 'service words veto even with "refurbished" (safe way round)');
ok(!$S('Refurbished Dell Latitude 3520 i5, new 1TB SSD fitted, Windows 11 Pro installed') && $S('Refurbished Dell Latitude 3520 laptop with new battery') && $S('Refurbished Dell Latitude 3520 i5 laptop, 16GB, 1TB SSD'), 'the trade-off: a sale line saying "fitted" is missed (safe); one calling it a laptop with its parts is a sale');
$parts = array('Replacement battery for Dell Latitude 3520 (refurbished)', 'Dell Latitude 3520 replacement screen - refurbished', 'Dell Latitude 3520 keyboard (refurbished)', 'Genuine Dell Latitude 3520 charger, refurbished',
               'Ex-lease 8GB RAM for Dell Latitude 3520', 'Dell Latitude 3520 motherboard - reconditioned', 'Dell Latitude 3520 SSD upgrade - refurbished 1TB', 'Dell Latitude 3520 - refurb service');
$bad = array(); foreach ($parts as $pl) if ($S($pl, 90)) $bad[] = $pl;
ok(!$bad, 'none of the review\'s 8 refurbished-PART / service wordings reads as a PC sale', implode(' | ', $bad));
ok(!$S('Refurbishment of your Dell Latitude 3520: clean, new thermal paste, keyboard', 120) && !$S('Refurb your existing Dell Latitude 3520', 99) && !$S('Dell Latitude 3520 refurbishment service', 150), 'a refurbishment SERVICE on a customer PC is not a sale');
$invR = array(
    array('date' => '2025-09-01', 'num' => '1600', 'lines' => array('Dell Latitude 3520 screen replacement'), 'amts' => array(165)),
    array('date' => '2024-03-14', 'num' => '1187', 'lines' => array('Refurbished Dell Latitude 3520 i5 laptop, 16GB'), 'amts' => array(395)),
);
$r = pcm_asset_match($invR, 'Dell Inc. Latitude 3520', array(), 1, 1, $NOW);
ok($r['pc'] && $r['pc']['num'] === '1187', 'a repair AFTER the sale is skipped - the sale is still the purchase', json_encode($r['pc']));
$r = pcm_asset_match(array($invR[0]), 'Dell Inc. Latitude 3520', array(), 1, 1, $NOW);
ok($r['pc'] === null && $r['why'] === 'not_a_sale', 'only a repair invoice names the model: NO purchase date, said why', json_encode($r));
$two = array(array('date' => '2025-05-01', 'num' => '1500', 'lines' => array('Refurbished Dell Latitude 3520')), array('date' => '2023-02-01', 'num' => '1000', 'lines' => array('Refurbished Dell Latitude 3520')));
$r = pcm_asset_match($two, 'Dell Latitude 3520', array(), 1, 1, $NOW);
ok($r['pc'] === null && $r['why'] === 'ambiguous_pc', 'two sales of this model on the account: ambiguous - we can\'t tell which this PC is', json_encode($r));
echo "-- v2: drive lines\n";
$cd = array(array('model' => 'CT1000P3PSSD8', 'sizeGB' => 932));
$r = pcm_asset_match(array(array('date' => '2025-02-01', 'num' => '1400', 'lines' => array('Seagate 1TB external hard drive for backups'))), 'Dell Latitude 3520', $cd, 1, 1, $NOW);
ok(count($r['drives']) === 0, 'an external backup drive never dates the internal SSD');
$r = pcm_asset_match(array(array('date' => '2025-02-01', 'num' => '1400', 'lines' => array('Data recovery from failed 1TB HDD'))), 'Dell Latitude 3520', $cd, 1, 1, $NOW);
ok(count($r['drives']) === 0, 'a data-recovery job is not a fitted drive');
$r = pcm_asset_match(array(array('date' => '2025-02-01', 'num' => '1400', 'lines' => array('Crucial P3 Plus 1TB NVMe SSD'))), 'Dell Latitude 3520', $cd, 1, 1, $NOW);
ok(count($r['drives']) === 0, 'a loose drive on another invoice (it doesn\'t say fitted) could be for another PC: nothing');
$r = pcm_asset_match(array(array('date' => '2025-02-01', 'num' => '1400', 'lines' => array('1TB NVMe SSD supplied and fitted, data cloned'))), 'Dell Latitude 3520', $cd, 1, 1, $NOW);
ok(count($r['drives']) === 1 && $r['drives'][0]['date'] === '2025-02-01', 'an SSD "fitted" on a later invoice dates the drive', json_encode($r['drives']));
$r = pcm_asset_match(array(array('date' => '2025-02-01', 'num' => '1400', 'lines' => array('1TB SSD supplied - customer to fit'))), 'Dell Latitude 3520', $cd, 1, 1, $NOW);
ok(count($r['drives']) === 0, '"customer to fit" is not fitted by us');
$r = pcm_asset_match(array(array('date' => '2025-02-01', 'num' => '1400', 'lines' => array('1TB SSD fitted to Dell OptiPlex 3070 (second PC)'))), 'Dell Latitude 3520', $cd, 1, 1, $NOW);
ok(count($r['drives']) === 0, 'a drive fitted to ANOTHER named PC does not date this one');
$fm2 = pcm_asset_for_machine($custX, 'm1', 'Dell Latitude 3520', array());
ok(empty($fm2['ok']) && !isset($fm2['v']), 'books unreadable (no QuickBooks here): ok=false and NO v2 stamp - callers keep what they had', json_encode(array('ok' => $fm2['ok'], 'src' => $fm2['source'])));

echo "-- what the app is told\n";
$mrec = array('model' => 'Dell Inc. Latitude 3520', 'drives' => array(array('model' => 'CT1000P3PSSD8', 'sizeGB' => 932, 'hours' => 3515), array('model' => 'WD Blue', 'sizeGB' => 1863)),
              'asset' => array('v' => 2, 'pc' => array('date' => '2025-03-14', 'num' => '1450'), 'drives' => array(array('model' => 'CT1000P3PSSD8', 'date' => '2025-03-14'))));
$o = pcm_asset_app_out($mrec, true);
ok($o['bought'] === '2025-03-14' && $o['gt_to'] === '2030-03-14' && $o['gt_y'] === '5', 'on support: bought + the 5-year guarantee end', json_encode($o));
ok($o['drv'] === 'CT1000P3PSSD8~2025-03-14~3515', 'drives: the matched one with its purchase date and hours; one with neither is left out', $o['drv']);
$o = pcm_asset_app_out($mrec, false);
ok($o['gt_to'] === '2026-03-14' && $o['gt_y'] === '1', 'not on support: the 12-month guarantee', json_encode($o));
$old = $mrec; $old['asset']['v'] = 1;
$o = pcm_asset_app_out($old, true);
ok($o['bought'] === '' && $o['gt_to'] === '' && $o['drv'] === 'CT1000P3PSSD8~~3515', 'a register from before the sale rule: no purchase, no guarantee, no drive date - hours still go', json_encode($o));
$noSale = $mrec; $noSale['asset']['pc'] = null;
$o = pcm_asset_app_out($noSale, true);
ok($o['bought'] === '' && $o['gt_to'] === '', 'no sale found: nothing about buying');
$hp = $mrec; $hp['model'] = 'HP Pavilion 15';
$o = pcm_asset_app_out($hp, true);
ok($o['bought'] === '2025-03-14' && $o['gt_to'] === '', 'not a Dell: the purchase date, no guarantee (the rule is written for Dell)');
$o = pcm_asset_app_out(null, true);
ok($o === array('bought' => '', 'gt_to' => '', 'gt_y' => '', 'drv' => ''), 'no machine record: four empty fields');
$weird = $mrec; $weird['drives'][0]['model'] = 'Bad~Model|X, "Y"'; $weird['asset']['drives'][0]['model'] = 'Bad~Model|X, "Y"';
ok(strpos(pcm_asset_app_out($weird, true)['drv'], 'Bad Model X   Y~2025-03-14~3515') === 0, 'separators, commas and quotes inside a model name are taken out (the app\'s reader stops at , and ")', pcm_asset_app_out($weird, true)['drv']);

echo "-- the background look-up's picker\n";
require __DIR__ . '/pcm-asset-backfill.php';
$T = 1792000000;
$db = array('customers' => array(
    'K1' => array('tier' => 'pro', 'email' => 'a@x.com', 'machines' => array(
        'm1' => array('model' => 'Dell Latitude 3520'),
        'm2' => array('model' => 'Dell OptiPlex 3070', 'asset' => array('v' => 2, 'computed' => $T - 3600)),
        'm3' => array('model' => 'Dell OptiPlex 3060', 'asset' => array('v' => 1, 'computed' => $T - 3600)),
        'm4' => array('model' => 'Dell OptiPlex 7010', 'asset_try' => $T - 600),
        'm5' => array('model' => ''))),
    'K2' => array('tier' => 'free', 'email' => 'b@x.com', 'machines' => array('m6' => array('model' => 'Dell Latitude 5420'), 'm9' => array('model' => 'Dell Latitude 7490', 'asset' => array('computed' => $T - 999999)))),
    'K3' => array('tier' => 'pro', 'email' => 'c@x.com', 'merged_into' => 'K1', 'machines' => array('m7' => array('model' => 'Dell Latitude 5420'))),
    'K4' => array('tier' => 'pro', 'email' => '', 'machines' => array('m8' => array('model' => 'Dell Latitude 5420')))));
$p = pcm_asset_backfill_pick($db, 5, $T);
ok($p === array(array('K1', 'm1'), array('K1', 'm3'), array('K2', 'm9')), 'picks support PCs (and any PC that already has a register) with a model and no current v2 register, not tried today; skips merged, no email, free PCs never looked up', json_encode($p));
ok(count(pcm_asset_backfill_pick($db, 1, $T)) === 1, 'never more than asked for');
$db['customers']['K1']['machines']['m2']['asset']['computed'] = $T - 8 * 86400;
ok(in_array(array('K1', 'm2'), pcm_asset_backfill_pick($db, 5, $T), true), 'a v2 register over a week old is looked up again');

echo "\n" . ($fails ? $fails . ' FAILED' : 'all passed') . "\n";
exit($fails ? 1 : 0);
