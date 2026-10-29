<?php
// php api/pcm-ce-test.php - Cyber Essentials Ready (pcm-ce-lib.php): the business-plan switch, what a check-in stores, the due dates.
require __DIR__ . '/pcm-ce-lib.php';
$fails = 0;
function ck($name, $ok) { global $fails; echo ($ok ? 'PASS ' : 'FAIL ') . $name . "\n"; if (!$ok) $fails++; }

ck('a business plan with CE Ready on', pce_ready(array('tier'=>'pro', 'plan'=>'business', 'ceready'=>true)));
ck('part of every business plan (no switch needed)', pce_ready(array('tier'=>'pro', 'plan'=>'business')));
ck('switched off for one customer', !pce_ready(array('tier'=>'pro', 'plan'=>'business', 'ceready'=>false)));
ck('never on a home plan', !pce_ready(array('tier'=>'pro', 'plan'=>'home', 'ceready'=>true)));
ck('never for a free member', !pce_ready(array('tier'=>'free', 'plan'=>'business', 'ceready'=>true)));

ck('October 2026 due 27 Oct', pce_due('2026-10') === '2026-10-27');
ck('November 2026 due 24 Nov', pce_due('2026-11') === '2026-11-24');
ck('September 2026 due 22 Sep', pce_due('2026-09') === '2026-09-22');

$m = array('ce'=>'rrrrr', 'cen'=>0);
pce_store($m, array('ce'=>'rrrrr', 'cen'=>0, 'cew'=>1, 'ceum'=>'2026-09'), '2026-10-01 09:00');
$m['ce'] = 'rarar'; $m['cen'] = 2;
pce_store($m, array('ce'=>'rarar', 'cen'=>2, 'cew'=>1, 'ceum'=>'2026-09'), '2026-10-12 09:00');
$m['ce'] = 'rrrrr'; $m['cen'] = 0;
pce_store($m, array('ce'=>'rrrrr', 'cen'=>0, 'cew'=>1, 'ceum'=>'2026-10'), '2026-10-16 09:00');
pce_store($m, array('ce'=>'rrrrr', 'cen'=>0, 'cew'=>1, 'ceum'=>'2026-10'), '2026-10-16 15:00');
pce_store($m, array('ce'=>'rrrrr', 'cen'=>0, 'cew'=>1, 'ceum'=>'2026-10'), '2026-10-20 09:00');
ck('watch on stored', $m['cew'] === true);
ck('each month: the day first seen installed', $m['cemon'] === array('2026-09'=>'2026-10-01', '2026-10'=>'2026-10-16'));
ck('one reading a day', count($m['cedays']) === 4 && $m['cedays']['2026-10-12'] === 'rarar2' && $m['cedays']['2026-10-16'] === 'rrrrr0');
pce_store($m, array('ce'=>'rrrrr', 'cen'=>0, 'ceum'=>'2026-13<script>'), '2026-10-21 09:00');
ck('a bad month is ignored', $m['ceum'] === '2026-10' && count($m['cemon']) === 2);
$big = array('ce'=>'rrrrr', 'cen'=>0);
for ($i = 0; $i < 420; $i++) pce_store($big, array('ce'=>'rrrrr', 'cen'=>0), gmdate('Y-m-d H:i', 1700000000 + $i * 86400));
ck('400 days kept, the newest', count($big['cedays']) === 400 && array_key_last($big['cedays']) === gmdate('Y-m-d', 1700000000 + 419 * 86400));
$m2 = array();
pce_store($m2, array('cen'=>0), '2026-10-01 09:00');
ck('an older app (no ce) stores nothing', $m2 === array());
$p = pce_portal($m);
ck('the portal gets watch, month, months and days', $p['cew'] === true && $p['ceum'] === '2026-10' && count($p['cedays']) === 5);
echo $fails ? "FAILED $fails\n" : "all passed\n";
exit($fails ? 1 : 0);
