<?php
/*
 * "Unlock everything" through PayPal (pcm-plus-pp-lib.php / pcm-plus-pp.php, 12 Oct 2026). CLI only:
 *   C:\tools\php\php.exe -d extension=mbstring api/pcm-plus-pp-test.php
 * Pure checks in a temp folder: PayPal is never called. (Creating, capturing, PayPal's webhook and the buy page in a browser,
 * against a fake PayPal, are the scratchpad m365order/pp-run.py end-to-end test of 12 Oct 2026.)
 */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
error_reporting(E_ALL);
$TMP = sys_get_temp_dir() . '/pptest-' . getmypid();
@mkdir($TMP);
define('PP_DIR', $TMP);
define('PLUS_FILE', $TMP . '/plus.json');
define('PLUS_CONFIG', $TMP . '/buy-config.php');
define('PLUS_OFF', $TMP . '/buy.off');
define('PLUS_FX_NOFETCH', 1);
require __DIR__ . '/pcm-plus-pp-lib.php';
$fails = 0;
function check($ok, $what, $detail = '') { global $fails; echo ($ok ? "  PASS  " : "  FAIL  ") . $what . ($ok ? '' : "  [" . $detail . "]") . "\n"; if (!$ok) $fails++; }
$W = function ($f, $s) { file_put_contents($f, $s); };
$cfg = function ($on, $extra = '') use ($W) {
    // $extra first: plus_config reads the first line that sets a name, so an extra line overrides the defaults below it
    $W(PLUS_CONFIG, "<?php\n" . $extra . "\$BUY_ON = " . ($on ? 'true' : 'false') . ";\n\$BUY_URL = 'https://365techies.co.uk/pc-manager-buy/?install={id}';\n\$BUY_PRICE = 'US\$19.99 for 1 year - does not renew';\n"
        . "\$BUY_USD = '19.99';\n\$BUY_LOW_USD = '9.99';\n\$BUY_LOW_PRICE = 'US\$9.99 for 1 year - does not renew';\n\$BUY_LOW_CODE = 'FAIRPRICE';\n\$BUY_PROVIDER = 'paypal';\n\$PP_COUNTRIES = 'US,CA,AU,NZ,NO,JP,SG,HK';\n");
};
$SB = array('id' => 'cid', 'secret' => 's', 'webhook' => 'WH-1', 'env' => 'sandbox');
$LIVE = array('id' => 'cid', 'secret' => 's', 'webhook' => 'WH-1', 'env' => 'live');

echo "A  the keys file (the owner's, on the server)\n";
$kf = $TMP . '/k.php';
$W($kf, "<?php \$PP_CLIENT_ID = 'AbC-123'; \$PP_SECRET = 'xyz';");
$c = pp_creds($kf); check($c !== null && $c['id'] === 'AbC-123' && $c['env'] === 'sandbox' && $c['webhook'] === '', 'one line works; no $PP_ENV = sandbox (pretend money); webhook id optional at first', json_encode($c));
$W($kf, "\xEF\xBB\xBF<?php\n\$PP_CLIENT_ID = 'A';\n\$PP_SECRET = 'B';\n\$PP_WEBHOOK_ID = 'W9';\n\$PP_ENV = 'live';\n");
$c = pp_creds($kf); check($c['env'] === 'live' && $c['webhook'] === 'W9', 'several lines, with a BOM; live', json_encode($c));
$W($kf, "<?php \$PP_CLIENT_ID = 'A';"); check(pp_creds($kf) === null, 'no secret: not set up');
check(pp_creds($TMP . '/none.php') === null, 'no file: not set up');

echo "B  who may buy, and the price\n";
$cfg(false);
check(pp_offer('US', null, null)['reason'] === 'not_set_up', 'no PayPal keys: not on sale');
check(pp_offer('US', null, $LIVE)['reason'] === 'off', 'live keys but Buy switched off: not on sale');
$o = pp_offer('US', null, $SB);
check($o['ok'] && $o['usd'] === '19.99' && $o['env'] === 'sandbox', 'sandbox keys: on sale for testing even with Buy off (pretend money)', json_encode($o));
$cfg(true);
$o = pp_offer('us', null, $LIVE);
check($o['ok'] && $o['usd'] === '19.99' && strpos($o['line'], 'US$19.99') === 0, 'live + switched on: the US can buy at US$19.99', json_encode($o));
foreach (array('GB', 'IM', 'JE', 'GG', '') as $cc) check(pp_offer($cc, null, $LIVE)['reason'] === 'uk', 'country "' . $cc . '": the UK (our support plans instead)');
foreach (array('DE', 'FR', 'IE', 'NL', 'ES', 'IT', 'CH', 'IN', 'BR') as $cc) check(pp_offer($cc, null, $LIVE)['reason'] === 'not_here', $cc . ': not in $PP_COUNTRIES - not on sale (we would owe tax there)');
foreach (array('RU', 'IR', 'KP') as $cc) check(pp_offer($cc, null, $LIVE)['reason'] === 'no_sale', $cc . ': never sold');
foreach (array('CA', 'AU', 'NZ', 'NO', 'JP', 'SG', 'HK') as $cc) check(pp_offer($cc, null, $LIVE)['ok'], $cc . ': on sale');
$cfg(true, "\$PP_COUNTRIES = 'US,PH';\n");
check(pp_offer('PH', null, $LIVE)['usd'] === '9.99', 'a lower-price country, if ever listed, is charged US$9.99 by our own page');
$cfg(true); file_put_contents(PLUS_OFF, ''); check(pp_offer('US', null, $LIVE)['reason'] === 'off', 'api/pcm-buy.off on the server: stopped at once'); unlink(PLUS_OFF);
$cfg(true, "\$BUY_PROVIDER = 'lemonsqueezy';\n");
check(pp_offer('US', null, $LIVE)['reason'] === 'not_set_up', 'another provider in the config: the PayPal page sells nothing');

echo "C  what the app is offered (plus_offer_out)\n";
$cfg(true);
$o = plus_offer_out('US', 'a1b2c3d4e5f60718');
check($o['offer'] === 'buy' && $o['buy_url'] === 'https://365techies.co.uk/pc-manager-buy/?install=a1b2c3d4e5f60718' && strpos($o['buy_url'], 'discount') === false, 'US: Buy, opening OUR page with the install id (no Lemon Squeezy discount code)', json_encode($o));
check(plus_offer_out('DE', 'x') === array() && plus_offer_out('IN', 'x') === array() && plus_offer_out('FR', 'x') === array(), 'EU and other unlisted countries: no Buy offer (the free app as before)');
check(plus_offer_out('GB', 'x') === array('offer' => 'plan'), 'the UK: our plans, as before');
$cfg(true, "\$PP_COUNTRIES = 'US,PH';\n");
check(strpos(plus_offer_out('PH', 'x')['buy_price'], '9.99') !== false, 'a listed lower-price country is shown US$9.99');

echo "D  the PC's country\n";
file_put_contents($TMP . '/inst.json', json_encode(array('v' => 1, 'm' => array('a1b2c3d4e5f60718' => array('c' => 'US'), 'bbbbbbbbbbbbbbbb' => array('c' => 'DE')))));
check(pp_country_of('a1b2c3d4e5f60718', '', $TMP . '/inst.json') === 'US' && pp_country_of('BBBBBBBBBBBBBBBB', '', $TMP . '/inst.json') === 'DE', 'from its own check-ins');
check(pp_country_of('', '', $TMP . '/inst.json') === '' && pp_country_of('zz', '', $TMP . '/inst.json') === '', 'no install: the asking address (none here)');

echo "E  only OUR orders become keys\n";
$sent = array(); $mail = function ($to, $key, $exp) use (&$sent) { $sent[] = array($to, $key, $exp); return true; };
pp_orders_locked(function (&$d) { $d['ORDER1234567'] = array('at' => time(), 'install' => 'a1b2c3d4e5f60718', 'usd' => '19.99'); return true; });
$cap = array('id' => 'CAP111', 'status' => 'COMPLETED', 'amount' => array('value' => '19.99', 'currency_code' => 'USD'));
$r = pp_keep($SB, $cap, 'NOTOURS99999', 'b@x.com', $mail); check($r[0] === 'refused' && strpos($r[3], 'not an order we made') !== false, 'an order our server did not create: refused, no key (a buyer can make their own one-cent order with the public client id)');
$r = pp_keep($SB, array_merge($cap, array('amount' => array('value' => '0.01', 'currency_code' => 'USD'))), 'ORDER1234567', 'b@x.com', $mail); check($r[0] === 'refused' && strpos($r[3], 'not the 19.99') !== false, 'the wrong amount: refused', $r[3]);
$r = pp_keep($SB, array_merge($cap, array('amount' => array('value' => '19.99', 'currency_code' => 'EUR'))), 'ORDER1234567', 'b@x.com', $mail); check($r[0] === 'refused', 'the wrong currency: refused');
$r = pp_keep($SB, array_merge($cap, array('status' => 'PENDING')), 'ORDER1234567', 'b@x.com', $mail); check($r[0] === 'pending' && !$sent, 'PayPal still checking: no key yet');
$r = pp_keep($SB, $cap, 'ORDER1234567', 'Buyer@Example.com', $mail);
check($r[0] === 'made' && plus_is_key($r[1]) && $r[2] === 'buyer@example.com' && count($sent) === 1 && $sent[0][1] === $r[1], 'paid: a key, shown once and emailed to the PayPal email', json_encode($r));
$k = null; foreach (plus_load()['keys'] as $x) if (($x['provider'] ?? '') === 'paypal') $k = $x;
check($k && $k['order'] === 'CAP111' && $k['install'] === 'a1b2c3d4e5f60718' && $k['test'] === true && strpos($k['note'], 'PayPal order ORDER1234567 (TEST) USD 19.99') === 0 && $k['expires'] > time() + 360 * 86400, 'stored: per capture, with the install, the order and TEST (sandbox), for a year', json_encode($k));
$r2 = pp_keep($SB, $cap, 'ORDER1234567', 'buyer@example.com', $mail); check($r2[0] === 'had' && count($sent) === 1, 'the same capture again (the webhook after the page): nothing new, no second email');

echo "F  never a URL, never in git; what is shipped\n";
$HT = (string)file_get_contents(__DIR__ . '/../.htaccess');
$pat = array(); if (preg_match_all('/<FilesMatch "([^"]+)">\s*Require all denied/', $HT, $mm)) $pat = $mm[1];
foreach (array('pcm-paypal-key.php', 'pcm-paypal-token.json', 'pcm-plus-pp-orders.json', 'pcm-plus-pp-orders.json.lock', 'pcm-plus-pp.log', 'pcm-plus-pp-lib.php', 'pcm-plus-pp-test.php', 'pcm-buy-config.php') as $fn) {
    $hit = false; foreach ($pat as $re) if (@preg_match('~' . $re . '~', $fn)) $hit = true;
    check($hit, $fn . ' is denied over HTTP');
}
$GI = (string)file_get_contents(__DIR__ . '/../.gitignore');
foreach (array('api/pcm-paypal-key.php', 'api/pcm-paypal-token.json', 'api/pcm-plus-pp-orders.json', 'api/pcm-plus-pp.log') as $g) check(strpos($GI, $g) !== false, $g . ' is gitignored');
$shipped = plus_config(__DIR__ . '/pcm-buy-config.php');
check(!$shipped['on'], 'shipped: Buy is still OFF (the owner switches it on)');
check($shipped['provider'] === 'paypal' && $shipped['url'] === 'https://365techies.co.uk/pc-manager-buy/?install={id}', 'shipped: PayPal, through our own buy page');
$eu = array('AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE');
check($shipped['pp_countries'] && !array_intersect($shipped['pp_countries'], $eu) && !in_array('GB', $shipped['pp_countries'], true), 'shipped: no EU country and not the UK in $PP_COUNTRIES', implode(',', $shipped['pp_countries']));
$BE = (string)file_get_contents(__DIR__ . '/../build_extra.py');
check(strpos($BE, 'Lemon Squeezy is the seller') === false && strpos($BE, 'We are the seller.') !== false, 'the licence page says we are the seller (no longer Lemon Squeezy)');

foreach (glob($TMP . '/*') as $f) @unlink($f); @rmdir($TMP);
echo $fails ? "\n$fails FAILED\n" : "\nall passed\n";
exit($fails ? 1 : 0);
