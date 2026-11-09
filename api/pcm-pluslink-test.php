<?php
// CLI only (denied by .htaccess): php api/pcm-pluslink-test.php - pcm-pluslink-lib.php, a free month's key that signed in to book.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require __DIR__ . '/pcm-rehome-lib.php';
require __DIR__ . '/pcm-pluslink-lib.php';
$pass = 0; $fail = 0;
function t($name, $got, $want) {
    global $pass, $fail;
    if ($got === $want) { $pass++; echo "  ok   $name\n"; }
    else { $fail++; echo "  FAIL $name: got " . var_export($got, true) . ", want " . var_export($want, true) . "\n"; }
}
$U = 'UNLK-PGUK-PHAB-ZAT3'; $M1 = 'a1b2c3d4e5f60718293a4b5c6d7e8f90'; $M2 = '0123456789abcdef0123456789abcdef';
$db = array('customers' => array(
    'SBAAAA000001' => array('name' => 'A', 'tier' => 'free', 'machines' => array($M1 => array('name' => 'LAPTOP'))),
    'SBOLD0000002' => array('name' => 'Old', 'tier' => 'free', 'merged_into' => 'SBNEW0000003', 'machines' => array($M1 => array())),
    'SBNEW0000003' => array('name' => 'New', 'tier' => 'pro', 'machines' => array($M1 => array())),
));

t('an Unlock key is recognised', pl_is_unlk($U), true);
t('lower case too', pl_is_unlk(strtolower($U)), true);
t('a customer key is not one', pl_is_unlk('SBAAAA000001'), false);
t('no id without a PC', pl_id($U, ''), '');
t('no id for a customer key', pl_id('SBAAAA000001', $M1), '');
t('the id never holds the key', strpos(pl_id($U, $M1), $U), false);

t('nothing linked yet', pl_lookup($db, $U, $M1), '');
t('cust_out empty when nothing linked', pl_cust_out($db, $U, $M1), array());
t('remember: unknown record refused', pl_remember($db, $U, $M1, 'SBNOPE'), false);
t('remember: a customer key is never linked', pl_remember($db, 'SBAAAA000001', $M1, 'SBAAAA000001'), false);
t('remember: links', pl_remember($db, $U, $M1, 'SBAAAA000001', 1762689600), true);
t('remember again: no change', pl_remember($db, $U, $M1, 'SBAAAA000001'), false);
t('lookup on this PC', pl_lookup($db, $U, $M1), 'SBAAAA000001');
t('lookup with the key in lower case', pl_lookup($db, strtolower($U), $M1), 'SBAAAA000001');
t('lookup from another PC', pl_lookup($db, $U, $M2), '');
t('lookup of another Unlock key', pl_lookup($db, 'UNLK-2222-3333-4444', $M1), '');
t('cust_out: record + plan', pl_cust_out($db, $U, $M1), array('cust_key' => 'SBAAAA000001', 'cust_tier' => 'free'));
$db['customers']['SBAAAA000001']['tier'] = 'pro';
t('cust_out follows a switch to Pro', pl_cust_out($db, $U, $M1), array('cust_key' => 'SBAAAA000001', 'cust_tier' => 'pro'));
unset($db['customers']['SBAAAA000001']['machines'][$M1]);
t('cust_out: nothing once the PC is taken off the record', pl_cust_out($db, $U, $M1), array());
t('re-sign-in elsewhere moves the link', pl_remember($db, $U, $M1, 'SBOLD0000002'), true);
t('cust_out follows a merge', pl_cust_out($db, $U, $M1), array('cust_key' => 'SBNEW0000003', 'cust_tier' => 'pro'));
unset($db['customers']['SBNEW0000003']);
t('merge target deleted: back on the record it merged from (as rehome_follow does)', pl_cust_out($db, $U, $M1), array('cust_key' => 'SBOLD0000002', 'cust_tier' => 'free'));
unset($db['customers']['SBOLD0000002']);
t('cust_out: nothing when the record has gone', pl_cust_out($db, $U, $M1), array());

echo "pcm-pluslink-test: $pass passed, $fail failed\n";
exit($fail ? 1 : 0);
