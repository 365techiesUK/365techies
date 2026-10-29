<?php
/*
 * The UK "service it yourself" key and the automatic free month (13 Oct 2026; owner: "Yes, automatic",
 * "Build it all for release 37"). The prices in these checks are made up: the real ones are server-only. CLI only:
 *   C:\tools\php\php.exe -d extension=mbstring api/pcm-plus-uk-test.php
 * Pure checks in a temp folder: PayPal is never called. Denied over HTTP (.htaccess, with pcm-plus-test.php).
 */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
error_reporting(E_ALL);
$TMP = sys_get_temp_dir() . '/pcm-plus-uk-test-' . getmypid();
@mkdir($TMP);
define('PP_DIR', $TMP);
define('PLUS_FILE', $TMP . '/plus.json');
define('PLUS_CONFIG', $TMP . '/buy-config.php');
define('PLUS_OFF', $TMP . '/buy.off');
define('PLUS_FX_NOFETCH', 1);
require __DIR__ . '/pcm-plus-pp-lib.php';
require_once __DIR__ . '/pcm-mailmove-lib.php';   // mm_esc for lo_card
require_once __DIR__ . '/pcm-lookover-lib.php';
$fails = 0;
function check($ok, $what, $detail = '') { global $fails; echo ($ok ? "  PASS  " : "  FAIL  ") . $what . ($ok ? '' : "  [" . $detail . "]") . "\n"; if (!$ok) $fails++; }
$cfg = function ($uk, $extra = '') {
    file_put_contents(PLUS_CONFIG, "<?php\n" . $extra . "\$BUY_ON = true;\n\$BUY_URL = 'https://365techies.co.uk/pc-manager-buy/?install={id}';\n"
        . "\$BUY_PRICE = 'US\$19.99 for 1 year - does not renew';\n\$BUY_USD = '19.99';\n\$BUY_PROVIDER = 'paypal';\n\$PP_COUNTRIES = 'US,CA';\n"
        . "\$BUY_UK = '" . $uk . "';\n\$UK_GBP = '12.34';\n\$UK_PRICE = '\u{00A3}12.34 for 1 year - does not renew';\n\$TRIAL_AUTO_UK_FROM = '2026-10-13';\n");
};
$SB = array('id' => 'cid', 'secret' => 's', 'webhook' => 'WH-1', 'env' => 'sandbox');
$LIVE = array('id' => 'cid', 'secret' => 's', 'webhook' => 'WH-1', 'env' => 'live');

echo "A  the settings\n";
$cfg('off');
$c = plus_config(); check($c['uk'] === 'off' && $c['uk_gbp'] === '12.34' && $c['uk_price'] === "\u{00A3}12.34 for 1 year - does not renew" && $c['trial_uk_from'] === '2026-10-13', 'read: off, the price in pounds, the line, the start date', json_encode($c, JSON_UNESCAPED_UNICODE));
$cfg('page'); check(plus_config()['uk'] === 'page' && plus_uk_sells(plus_config()) && !plus_uk_offered(plus_config()), "'page': the buy page sells it, the app is not offered it");
$cfg('on'); check(plus_uk_sells(plus_config()) && plus_uk_offered(plus_config()), "'on': both");
$cfg('yes'); check(plus_config()['uk'] === 'off', 'anything else reads as off');
$cfg('on', "\$UK_GBP = 'free';\n"); check(!plus_uk_sells(plus_config()), 'no proper price: not sold');
$cfg('on', "\$TRIAL_AUTO_UK_FROM = 'soon';\n"); check(plus_config()['trial_uk_from'] === '', 'a start date that is not a date: the automatic month is off');
check(plus_is_uk('gb') && plus_is_uk('IM') && plus_is_uk('JE') && plus_is_uk('GG') && !plus_is_uk('IE') && !plus_is_uk(''), 'the UK = GB and the Crown dependencies');

echo "B  what a UK PC is offered in the app\n";
$cfg('off'); check(plus_offer_out('GB', 'a1b2c3d4e5f60718') === array('offer' => 'plan'), 'off: our plans, as before');
$cfg('page'); check(plus_offer_out('GB', 'a1b2c3d4e5f60718') === array('offer' => 'plan'), "'page': still our plans in the app");
$cfg('on'); $o = plus_offer_out('GB', 'a1b2c3d4e5f60718');
check(($o['offer'] ?? '') === 'both' && $o['buy_url'] === 'https://365techies.co.uk/pc-manager-buy/?install=a1b2c3d4e5f60718' && $o['buy_price'] === "\u{00A3}12.34 for 1 year - does not renew",
    "'on': BOTH - our plans and the key, at the pound price, opening our buy page", json_encode($o, JSON_UNESCAPED_UNICODE));
check(plus_offer_out('', 'x') === array('offer' => 'plan'), 'a country we cannot tell: our plans, never a sale');
check(plus_offer_out('US', 'x')['offer'] === 'buy' && strpos(plus_offer_out('US', 'x')['buy_price'], 'US$19.99') !== false, 'abroad: unchanged (Buy, in US dollars)');
touch(PLUS_OFF); check(plus_offer_out('GB', 'x') === array(), 'the instant stop (pcm-buy.off) stops the UK too'); @unlink(PLUS_OFF);
$cfg('on'); file_put_contents(PLUS_CONFIG, str_replace('$BUY_ON = true;', '$BUY_ON = false;', (string)file_get_contents(PLUS_CONFIG)));
check(plus_offer_out('GB', 'x') === array(), 'Buy switched off altogether: nothing added, as before');

echo "C  the buy page's price for a UK PC\n";
$cfg('off'); check(pp_offer('GB', null, $LIVE)['reason'] === 'uk', 'off: "uk" (the page points to our plans)');
$cfg('page'); $p = pp_offer('GB', null, $LIVE);
check($p['ok'] && $p['currency'] === 'GBP' && $p['amount'] === '12.34' && !empty($p['uk']) && $p['usd'] === '' && $p['local'] === '', "'page': on sale in pounds - no US dollars, no 'about'", json_encode($p, JSON_UNESCAPED_UNICODE));
check(pp_offer('JE', null, $LIVE)['currency'] === 'GBP', 'Jersey: the same');
check(pp_offer('', null, $LIVE)['reason'] === 'uk', 'a country we cannot tell: not sold');
$u = pp_offer('US', null, $LIVE); check($u['currency'] === 'USD' && $u['amount'] === '19.99' && $u['usd'] === '19.99', 'abroad: USD, as before (amount = usd)', json_encode($u));

echo "D  a payment in pounds\n";
$sent = array(); $mail = function ($to, $key, $exp) use (&$sent) { $sent[] = array($to, $key, $exp); return true; };
pp_orders_locked(function (&$d) { $d['UKORDER12345'] = array('at' => time(), 'install' => 'a1b2c3d4e5f60718', 'cur' => 'GBP', 'amt' => '12.34'); return true; });
$cap = array('id' => 'CAPUK1', 'status' => 'COMPLETED', 'amount' => array('value' => '12.34', 'currency_code' => 'GBP'));
$r = pp_keep($LIVE, array_merge($cap, array('amount' => array('value' => '12.34', 'currency_code' => 'USD'))), 'UKORDER12345', 'uk@x.com', $mail);
check($r[0] === 'refused' && strpos($r[3], 'not the GBP 12.34') !== false, 'paid in dollars for a pound order: refused', $r[3]);
$r = pp_keep($LIVE, array_merge($cap, array('amount' => array('value' => '9.99', 'currency_code' => 'GBP'))), 'UKORDER12345', 'uk@x.com', $mail);
check($r[0] === 'refused', 'the wrong amount in pounds: refused');
$r = pp_keep($LIVE, $cap, 'UKORDER12345', 'uk@x.com', $mail);
check($r[0] === 'made' && plus_is_key($r[1]) && count($sent) === 1, 'the right amount in pounds: a key, emailed', json_encode($r));
$ukKey = $r[1];
$d = plus_load(); $e = $d['keys'][plus_hash($ukKey)];
check(!empty($e['uk']) && strpos($e['note'], 'GBP 12.34') !== false && $e['provider'] === 'paypal', 'the key is marked as bought in the UK, its note says GBP', json_encode($e));
pp_orders_locked(function (&$d) { $d['OLDORDER1234'] = array('at' => time(), 'install' => 'a1b2c3d4e5f60718', 'usd' => '19.99'); return true; });
$r = pp_keep($LIVE, array('id' => 'CAPOLD', 'status' => 'COMPLETED', 'amount' => array('value' => '19.99', 'currency_code' => 'USD')), 'OLDORDER1234', 'us@x.com', $mail);
check($r[0] === 'made', 'an order made before today (only "usd" kept) still becomes its key', json_encode($r));
$usKey = $r[1];
$d = plus_load(); check(empty($d['keys'][plus_hash($usKey)]['uk']), 'a key bought in dollars is not marked UK');

echo "E  who may ask for a report look-over\n";
check(plus_uk_key_of($ukKey) !== null && plus_uk_key_of($ukKey)['expires'] > time(), 'a key bought in the UK: yes');
check(plus_uk_key_of($usKey) === null, 'a key bought abroad: no (software only there)');
$card = lo_card(array('name' => 'Ann', 'email' => 'a@x.com', 'phone' => '', 'kind' => 'service', 'cc' => 'GB', 'who' => 'uk', 'ver' => ''), 'abcdef0123456789', time() + 86400 * 300);
$cj = json_encode($card);
check(strpos($cj, 'bought the PC Manager key in the UK') !== false && strpos($cj, 'Key runs until') !== false && strpos($cj, 'free month') === false, 'the Slack card says they bought the key (and mentions our plans), not "free month"', substr($cj, 0, 300));
$card = lo_card(array('name' => 'Bo', 'email' => 'b@x.com', 'phone' => '', 'kind' => 'service', 'cc' => 'GB', 'ver' => ''), 'abcdef0123456789', time() + 86400 * 20);
check(strpos(json_encode($card), 'free month') !== false, 'a free month reads as before');

echo "F  the automatic free month for a new UK install\n";
$cfg('off');   // the month does not depend on Buy in the UK
$T = strtotime('2026-10-20 12:00:00 UTC');
$row = array('f' => '2026-10-14', 'l' => '2026-10-20', 'c' => 'GB', 'v' => 39, 'k' => 0, 'p' => 0, 'o' => 0);
check(plus_trial_auto_uk('1111111111111111', 'US', 39, $row, $T) === null, 'abroad: never');
check(plus_trial_auto_uk('1111111111111111', '', 39, $row, $T) === null, 'a country we cannot tell: never');
check(plus_trial_auto_uk('1111111111111111', 'GB', 36, $row, $T) === null, 'an app too old to take the key: not yet (it gets one once it has updated)');
check(plus_trial_auto_uk('1111111111111111', 'GB', 39, array('f' => '2026-10-01') + $row, $T) === null, 'an install first seen before the start date: left to staff');
check(plus_trial_auto_uk('1111111111111111', 'GB', 39, array('o' => 1) + $row, $T) === null, 'one of our own PCs: never');
check(plus_trial_auto_uk('1111111111111111', 'GB', 39, array('k' => 1) + $row, $T) === null && plus_trial_auto_uk('1111111111111111', 'GB', 39, array('p' => 1) + $row, $T) === null, 'linked or on a plan: never');
check(plus_trial_auto_uk('xyz', 'GB', 39, $row, $T) === null, 'not an install id: never');
$g = plus_trial_auto_uk('2222222222222222', 'GB', 39, $row, $T);
check(is_array($g) && $g['ok'] && $g['until'] === $T + 30 * 86400, 'a new UK install: given its month (30 days)', json_encode($g));
$d = plus_load(); $t = $d['trials']['2222222222222222'] ?? null;
check($t && $t['by'] === 'auto (UK)' && plus_is_key($t['key']), 'recorded as given automatically, with the key waiting to be handed over');
check(plus_trial_auto_uk('2222222222222222', 'GB', 39, $row, $T + 3600) === null, 'the next check-in: nothing more (one month per PC, ever)');
$h = plus_trial_handover('2222222222222222', 39, $T + 3600);
check($h && $h['key'] === $t['key'], 'and the check-in hands it over as usual');
$g2 = plus_trial_auto_uk('3333333333333333', 'IM', 39, array('f' => '2026-10-13') + $row, $T);
check(is_array($g2) && $g2['ok'], 'the start date itself counts; the Isle of Man counts');
$cfg('off', "\$TRIAL_AUTO_UK_FROM = '';\n");
check(plus_trial_auto_uk('4444444444444444', 'GB', 39, $row, $T) === null, 'no start date: switched off');

echo "F2 the automatic free month abroad (18 Oct 2026)\n";
$cfg('off', "\$TRIAL_AUTO_ABROAD_FROM = '2026-10-18';\n");
$T = strtotime('2026-10-20 12:00:00 UTC');
$rowA = array('f' => '2026-10-19', 'l' => '2026-10-20', 'c' => 'US', 'v' => 44, 'k' => 0, 'p' => 0, 'o' => 0);
check(plus_trial_auto_abroad('5555555555555555', 'GB', 44, $rowA, $T) === null && plus_trial_auto_abroad('5555555555555555', 'IM', 44, $rowA, $T) === null, 'the UK (and the Isle of Man): never - that is plus_trial_auto_uk');
check(plus_trial_auto_abroad('5555555555555555', '', 44, $rowA, $T) === null, 'a country we cannot tell: never');
check(plus_trial_auto_abroad('5555555555555555', 'RU', 44, $rowA, $T) === null && plus_trial_auto_abroad('5555555555555555', 'IR', 44, $rowA, $T) === null, 'a country we can never sell to: never');
check(plus_trial_auto_abroad('5555555555555555', 'US', 36, $rowA, $T) === null, 'an app too old to take the key: not yet');
check(plus_trial_auto_abroad('5555555555555555', 'US', 44, array('f' => '2026-10-17') + $rowA, $T) === null, 'an install first seen before the abroad start date: left to staff');
check(plus_trial_auto_abroad('5555555555555555', 'US', 44, array('o' => 1) + $rowA, $T) === null && plus_trial_auto_abroad('5555555555555555', 'US', 44, array('k' => 1) + $rowA, $T) === null && plus_trial_auto_abroad('5555555555555555', 'US', 44, array('p' => 1) + $rowA, $T) === null, 'ours, linked or on a plan: never');
$gA = plus_trial_auto_abroad('6666666666666666', 'DE', 44, $rowA, $T);
check(is_array($gA) && $gA['ok'] && $gA['until'] === $T + 30 * 86400, 'a new install in Germany: given its month (30 days)', json_encode($gA));
$dA = plus_load(); $tA = $dA['trials']['6666666666666666'] ?? null;
check($tA && $tA['by'] === 'auto (abroad)' && plus_is_key($tA['key']), 'recorded as given automatically abroad, the key waiting to be handed over');
check(plus_trial_auto_abroad('6666666666666666', 'DE', 44, $rowA, $T + 3600) === null && plus_trial_auto_uk('6666666666666666', 'GB', 44, array('c' => 'GB') + $rowA, $T + 7200) === null, 'one month per PC, ever (moving to the UK gives no second one)');
check(plus_trial_auto_abroad('7777777777777777', 'US', 44, array('f' => '2026-10-18') + $rowA, $T)['ok'] ?? false, 'the start date itself counts');
$cfg('off');
check(plus_trial_auto_abroad('8888888888888888', 'US', 44, $rowA, $T) === null, 'no abroad start date: switched off (the UK month is not affected)');

echo "G  the shipped config and wiring\n";
$src = (string)file_get_contents(__DIR__ . '/pcm-buy-config.php');
check(preg_match("/^\\\$TRIAL_AUTO_ABROAD_FROM = '2026-10-18';/m", $src) === 1, "shipped: the automatic free month abroad, for installs first seen from 18 Oct 2026");
$pcmSrc = (string)file_get_contents(__DIR__ . '/pcm.php');
check(strpos($pcmSrc, "plus_trial_auto_abroad(\$auId, \$auCc, (int)\$in['ver'], \$auD['m'][\$auId])") !== false, 'wired: a keyless check-in from abroad may be given its month');
$loSrc = (string)file_get_contents(__DIR__ . '/pcm-lookover.php');
check(strpos($loSrc, "if (!\$ukk && \$loCc !== '' && !plus_is_uk(\$loCc)) lo_fail('abroad');") !== false, 'wired: no free look-over for a free month outside the UK (a UK-bought key still may)');
// 17 Oct 2026 (owner: "do step 1"): 'page' - the buy page sells it so the owner can buy one and refund it.
// 18 Oct 2026 (owner: "put it so they get the option in the PC Manager app"): 'on' - the app offers it beside the plans. The
// live order was created by PayPal (the owner's own account was refused as the merchant itself); a real purchase + refund is
// still to be made, by card as a guest, when convenient.
check(preg_match("/^\\\$BUY_UK = 'on';/m", $src) === 1, "shipped: \$BUY_UK = 'on' (owner's go, 18 Oct 2026)");
// 29 Oct 2026 (owner: "move the prices off GitHub"): this file is public, so it names no price at all. The prices are in
// api/pcm-buy-prices.php - server-only: gitignored, denied over HTTP, and read first by plus_config()
check(preg_match('/^[ \t]*\$(BUY_PRICE|BUY_USD|BUY_LOW_USD|BUY_LOW_PRICE|BUY_LOW_CODE|UK_GBP|UK_PRICE)\s*=/m', $src) === 0 && preg_match('/\d\.\d\d\b/', $src) === 0, 'shipped: the public config names no price');
check(preg_match('#^api/pcm-buy-prices\.php\r?$#m', (string)file_get_contents(__DIR__ . '/../.gitignore')) === 1
    && strpos((string)file_get_contents(__DIR__ . '/../.htaccess'), 'pcm-buy-(config|prices)\.php') !== false, 'the prices file: gitignored, and denied over HTTP');
// the real prices file, where there is one (the server; a developer's copy): complete, and the UK line (18 Oct 2026, owner:
// say it covers 3 PCs) fits the app's 40 characters - its numbers are never written here
$pf = plus_prices_file(__DIR__ . '/pcm-buy-config.php');
if (is_file($pf)) {
    $rc = plus_config(__DIR__ . '/pcm-buy-config.php');
    $raw = preg_match("/^[ \t]*\\\$UK_PRICE\s*=\s*'([^']*)'/m", (string)file_get_contents($pf), $um) ? $um[1] : '';
    check($rc['price'] !== '' && $rc['usd'] !== '' && $rc['uk_gbp'] !== '' && strpos($raw, $rc['uk_gbp']) !== false && strpos($raw, '3 PCs') !== false && preg_match('/^.{1,40}$/u', $raw) === 1, 'the prices file here: every price set, and the UK line names the 3 PCs in 40 characters or fewer');
} else echo "  (no api/pcm-buy-prices.php here - the server has it)\n";
check(preg_match("/^\\\$TRIAL_AUTO_UK_FROM = '2026-10-13';/m", $src) === 1, 'shipped: the automatic free month from 13 Oct 2026');
$pcm = (string)file_get_contents(__DIR__ . '/pcm.php');
check(strpos($pcm, 'plus_trial_auto_uk($auId, $auCc, (int)$in[\'ver\'], $auD[\'m\'][$auId])') !== false && strpos($pcm, 'plus_trial_auto_uk') < strpos($pcm, '$trHand = '), 'pcm.php gives the month on a keyless check-in, before handing any over');
$ht = (string)file_get_contents(__DIR__ . '/../.htaccess');
check(strpos($ht, 'pcm-plus-(lib|test|uk-test)\.php') !== false, 'this test is denied over HTTP');

echo "\n" . ($fails ? $fails . " FAILED\n" : "pcm-plus-uk-test: all passed\n");
array_map('unlink', glob($TMP . '/*') ?: array()); @rmdir($TMP);
exit($fails ? 1 : 0);
