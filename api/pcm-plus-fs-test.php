<?php
/*
 * "Unlock everything" through FastSpring (pcm-plus-fs-lib.php / pcm-plus-fs.php, 12 Oct 2026). CLI only:
 *   C:\tools\php\php.exe -d extension=mbstring api/pcm-plus-fs-test.php
 * Pure checks in a temp folder: FastSpring is never called. (The webhook over HTTP, the buy page's routing and the page in a
 * browser with FastSpring's script stubbed are the scratchpad m365order/fs-run.py end-to-end test of 12 Oct 2026.)
 */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
error_reporting(E_ALL);
$TMP = sys_get_temp_dir() . '/fstest-' . getmypid();
@mkdir($TMP);
define('FS_DIR', $TMP);
define('PLUS_FILE', $TMP . '/plus.json');
define('PLUS_CONFIG', $TMP . '/buy-config.php');
define('PLUS_OFF', $TMP . '/buy.off');
define('PLUS_FX_NOFETCH', 1);
require __DIR__ . '/pcm-plus-fs-lib.php';
$fails = 0;
function check($ok, $what, $detail = '') { global $fails; echo ($ok ? "  PASS  " : "  FAIL  ") . $what . ($ok ? '' : "  [" . $detail . "]") . "\n"; if (!$ok) $fails++; }
$W = function ($f, $s) { file_put_contents($f, $s); };
$cfg = function ($on, $store = '365techies.test.onfastspring.com/popup-365techies', $extra = '') use ($W) {
    $W(PLUS_CONFIG, "<?php\n" . $extra . "\$BUY_ON = " . ($on ? 'true' : 'false') . ";\n\$BUY_URL = 'https://365techies.co.uk/pc-manager-buy/?install={id}';\n\$BUY_PRICE = 'US\$19.99 for 1 year - does not renew';\n"
        . "\$BUY_USD = '19.99';\n\$BUY_LOW_USD = '9.99';\n\$BUY_LOW_PRICE = 'US\$9.99 for 1 year - does not renew';\n\$BUY_PROVIDER = 'paypal';\n\$PP_COUNTRIES = 'US,CA,AU,NZ,NO,JP,SG,HK';\n"
        . "\$FS_STOREFRONT = '" . $store . "';\n\$FS_PRODUCT = 'unlock-everything';\n\$FS_PRODUCT_LOW = 'unlock-everything-low';\n");
};
$SECRET = 'fs-test-secret';
$sign = function ($raw) use ($SECRET) { return base64_encode(hash_hmac('sha256', $raw, $SECRET, true)); };
$mailed = array();
$mail = function ($to, $key, $exp) use (&$mailed) { $mailed[] = array($to, $key, $exp); return true; };
$NOW = 1791800000;
$order = function ($id, $ref, $product = 'unlock-everything', $live = false, $email = 'buyer@example.de', $tags = array('install' => 'abcdef0123456789')) {
    return json_encode(array('events' => array(array('id' => 'ev-' . $id, 'type' => 'order.completed', 'live' => $live, 'processed' => false, 'created' => 1791800000000,
        'data' => array('id' => $id, 'order' => $id, 'reference' => $ref, 'live' => $live, 'currency' => 'EUR', 'total' => 19.99, 'address' => array('country' => 'DE'),
            'customer' => array('email' => $email), 'tags' => $tags, 'items' => array(array('product' => $product, 'quantity' => 1, 'subtotal' => 16.80)))))));
};
$keys = function () { $d = plus_load(); return $d ? array_values($d['keys']) : array(); };
$keyOf = function ($oid) use ($keys) { foreach ($keys() as $k) if (($k['order'] ?? '') === $oid && ($k['provider'] ?? '') === 'fastspring') return $k; return null; };

echo "A  the secret file (the owner's, on the server) and the signature\n";
$sf = $TMP . '/s.php';
$W($sf, "<?php \$FS_WEBHOOK_SECRET = 'abc-123';"); check(fs_secret($sf) === 'abc-123', 'one line works');
$W($sf, "\xEF\xBB\xBF<?php\n\$FS_WEBHOOK_SECRET = 'xyz';\n"); check(fs_secret($sf) === 'xyz', 'two lines with a BOM');
check(fs_secret($TMP . '/none.php') === '', 'no file: no secret');
check(fs_signed('{"a":1}', base64_encode(hash_hmac('sha256', '{"a":1}', 'k', true)), 'k'), 'a right signature (base64 HMAC-SHA256 of the raw body)');
check(!fs_signed('{"a":1}', base64_encode(hash_hmac('sha256', '{"a": 1}', 'k', true)), 'k'), 'the body changed: refused');
check(!fs_signed('{"a":1}', '', 'k') && !fs_signed('{"a":1}', 'x', ''), 'no signature or no secret: refused');

echo "B  who buys through FastSpring, and the price\n";
$cfg(false, '');
check(fs_offer('DE')['reason'] === 'not_set_up', 'no storefront: not set up');
$cfg(false);
check(fs_mode() === 'test', 'the .test. storefront is TEST mode');
$o = fs_offer('DE'); check($o['ok'] && $o['product'] === 'unlock-everything' && $o['usd'] === '19.99' && $o['mode'] === 'test', 'Germany, test checkout: on (to test) at US$19.99, even with Buy off', json_encode($o));
check(fs_offer('FR')['ok'] && fs_offer('CH')['ok'] && fs_offer('BR')['ok'], 'France, Switzerland, Brazil: FastSpring (it pays the tax)');
check(fs_offer('US')['reason'] === 'paypal' && fs_offer('CA')['reason'] === 'paypal', "PayPal's countries stay PayPal's");
check(fs_offer('GB')['reason'] === 'uk' && fs_offer('')['reason'] === 'uk', 'the UK (or not known): plans instead');
check(fs_offer('RU')['reason'] === 'no_sale', 'a no-sale country: never');
$o = fs_offer('IN'); check($o['ok'] && $o['product'] === 'unlock-everything-low' && $o['usd'] === '9.99', 'India: the US$9.99 product', json_encode($o));
$cfg(false, '365techies.onfastspring.com/popup-365techies');
check(fs_mode() === 'live' && fs_offer('DE')['reason'] === 'off', 'LIVE checkout with Buy off: not on sale');
$cfg(true, '365techies.onfastspring.com/popup-365techies');
check(fs_offer('DE')['ok'], 'LIVE checkout with Buy on: on sale');
$W(PLUS_OFF, ''); check(fs_offer('DE')['reason'] === 'off', 'the off switch file stops it at once'); @unlink(PLUS_OFF);
$cfg(true, 'evil.example.com/popup');
check(fs_mode() === '', 'a storefront that is not onfastspring.com is ignored');

echo "C  what the app is offered at its check-in (plus_offer_out)\n";
$cfg(true);
check(plus_offer_out('DE', 'x') === array(), 'TEST checkout: the app offers Germany nothing (a buyer could not pay)');
check(plus_offer_out('US', 'x')['offer'] === 'buy', 'PayPal countries are offered as before');
$cfg(true, '365techies.onfastspring.com/popup-365techies');
$o = plus_offer_out('DE', 'abc'); check(($o['offer'] ?? '') === 'buy' && strpos($o['buy_url'], 'install=abc') !== false, 'LIVE checkout: Germany is offered Buy, to our buy page', json_encode($o));
$o = plus_offer_out('IN', 'abc'); check(strpos($o['buy_price'] ?? '', '9.99') !== false, 'India: offered at US$9.99', json_encode($o));
check(plus_offer_out('GB', 'x')['offer'] === 'plan', 'the UK: plans');

echo "D  the webhook: a test order\n";
$cfg(false);
check(fs_handle('{}', 'x', '', $mail, $NOW)[0] === 503, 'no secret on the server: 503 (FastSpring retries, nothing lost)');
$raw = $order('ORDtest00001aa', 'REF-T-1');
check(fs_handle($raw, 'wrong', $SECRET, $mail, $NOW)[0] === 401, 'a wrong signature: 401, nothing made');
check(!$keys(), '... and no key');
$r = fs_handle($raw, $sign($raw), $SECRET, $mail, $NOW);
$k = $keyOf('ORDtest00001aa');
check($r[0] === 200 && $k && $k['test'] === true && $k['install'] === 'abcdef0123456789', 'a signed test order: a TEST key, tied to the install', json_encode($r));
check($k && $k['expires'] === $NOW + 2 * 86400, 'a test key lasts 2 days only (the test checkout is public)', $k ? $k['expires'] - $NOW : '');
check(count($mailed) === 1 && $mailed[0][0] === 'buyer@example.de' && plus_is_key($mailed[0][1]), 'emailed to the buyer', json_encode($mailed));
$g = fs_recent_get('ORDtest00001aa', $NOW + 60); $g2 = fs_recent_get('REF-T-1', $NOW + 60);
check($g && $g[0] === $mailed[0][1] && $g2 && $g2[0] === $mailed[0][1], 'the buy page can fetch it by order id or reference');
check(fs_recent_get('ORDtest00001aa', $NOW + 3 * 3600 + 5) === null, '... for 3 hours only');
check(fs_recent_get('NOTANORDER123', $NOW) === null && fs_recent_get('../../x', $NOW) === null, 'an unknown or odd id: nothing');
$r = fs_handle($raw, $sign($raw), $SECRET, $mail, $NOW);
check($r[0] === 200 && count($mailed) === 1 && count($keys()) === 1, 'FastSpring sends it again: no second key, no second email', json_encode($r));
$raw = $order('ORDother0001aa', 'REF-O', 'some-other-product');
check(strpos(fs_handle($raw, $sign($raw), $SECRET, $mail, $NOW)[1], 'not our product') !== false && count($keys()) === 1, 'an order for another product: nothing');
$raw = $order('ORDnomail001aa', 'REF-N', 'unlock-everything', false, 'not-an-email');
check(strpos(fs_handle($raw, $sign($raw), $SECRET, $mail, $NOW)[1], 'no email') !== false, 'no email: says so (staff make a key by hand)');
$raw = $order('ORDtagstr001aa', 'REF-S', 'unlock-everything-low', false, 'x@example.in', '{"install":"0123456789abcdef"}');
fs_handle($raw, $sign($raw), $SECRET, $mail, $NOW); $k = $keyOf('ORDtagstr001aa');
check($k && $k['install'] === '0123456789abcdef', 'the cheaper product works too; tags sent as a string are read', json_encode($k));

echo "E  the webhook once the checkout is LIVE\n";
$cfg(true, '365techies.onfastspring.com/popup-365techies');
$raw = $order('ORDtestlive1aa', 'REF-TL');
$r = fs_handle($raw, $sign($raw), $SECRET, $mail, $NOW);
check(strpos($r[1], 'TEST order while the checkout is live') !== false && !$keyOf('ORDtestlive1aa'), 'a TEST order while live: no key', json_encode($r));
$raw = $order('ORDlive00001aa', 'REF-L-1', 'unlock-everything', true, 'Real@Example.FR');
$r = fs_handle($raw, $sign($raw), $SECRET, $mail, $NOW); $k = $keyOf('ORDlive00001aa');
check($k && $k['test'] === false && $k['expires'] > $NOW + 360 * 86400 && $k['email'] === 'real@example.fr', 'a LIVE order: a key for a year', json_encode($r));

echo "F  refunds and chargebacks\n";
$ret = function ($orig, $total, $refund, $type = 'RETURN', $rt = 'Partial Refund') { return json_encode(array('events' => array(array('id' => 'ev-r' . $orig . $refund, 'type' => 'return.created', 'live' => true,
    'data' => array('return' => 'RET1', 'type' => $type, 'totalReturn' => $refund, 'original' => array('id' => $orig, 'order' => $orig, 'total' => $total), 'items' => array(array('product' => 'unlock-everything', 'refundType' => $rt))))))); };
$raw = $ret('ORDlive00001aa', 19.99, 5.00);
$r = fs_handle($raw, $sign($raw), $SECRET, $mail, $NOW);
check(strpos($r[1], 'partial refund') !== false && $keyOf('ORDlive00001aa')['status'] === 'active', 'a partial refund: the key is kept', json_encode($r));
$raw = $ret('ORDlive00001aa', 19.99, 19.99, 'RETURN', 'Full Refund');
$r = fs_handle($raw, $sign($raw), $SECRET, $mail, $NOW);
check(strpos($r[1], 'switched off') !== false && $keyOf('ORDlive00001aa')['status'] === 'revoked', 'a full refund: the key is switched off', json_encode($r));
$raw = $ret('ORDunknown01aa', 19.99, 19.99);
check(strpos(fs_handle($raw, $sign($raw), $SECRET, $mail, $NOW)[1], 'no key') !== false, 'a refund for an order we never keyed: nothing');
$raw = json_encode(array('events' => array(array('id' => 'ev-cb', 'type' => 'chargeback.created', 'live' => true, 'data' => array('order' => 'ORDtestlive1aa')))));
check(strpos(fs_handle($raw, $sign($raw), $SECRET, $mail, $NOW)[1], 'no key found') !== false, 'a chargeback for an order with no key: says to check it');
$cfg(false);
$raw = $order('ORDcb000001aa', 'REF-CB'); fs_handle($raw, $sign($raw), $SECRET, $mail, $NOW);
$raw = json_encode(array('events' => array(array('id' => 'ev-cb2', 'type' => 'chargeback.created', 'live' => false, 'data' => array('order' => array('id' => 'ORDcb000001aa'))))));
$r = fs_handle($raw, $sign($raw), $SECRET, $mail, $NOW);
check(strpos($r[1], 'switched off (chargeback)') !== false && $keyOf('ORDcb000001aa')['status'] === 'revoked', 'a chargeback: the key is switched off', json_encode($r));

echo "G  several events in one post\n";
$a = json_decode($order('ORDmulti001aa', 'REF-M1'), true); $b = json_decode($ret('ORDmulti001aa', 19.99, 19.99, 'RETURN', 'Full Refund'), true);
$raw = json_encode(array('events' => array($a['events'][0], $b['events'][0], array('id' => 'ev-x', 'type' => 'subscription.activated', 'data' => array()))));
$r = fs_handle($raw, $sign($raw), $SECRET, $mail, $NOW);
check($r[0] === 200 && $keyOf('ORDmulti001aa') && $keyOf('ORDmulti001aa')['status'] === 'revoked' && strpos($r[1], 'nothing to do') !== false, 'an order then its refund in one post, plus an event we ignore', json_encode($r));

echo "H  the log and the files\n";
check(strpos((string)@file_get_contents(FS_RECENT), 'UNLK-') !== false, 'the recent file holds the keys (it is denied as a URL and gitignored)');
$lib = file_get_contents(__DIR__ . '/pcm-plus-fs-lib.php');
check(strpos($lib, "fs_log(") !== false && !preg_match('/fs_log\([^)]*\$r\[0\]/', $lib), 'nothing logs a key');

array_map('unlink', glob($TMP . '/*') ?: array()); @rmdir($TMP);
echo $fails ? "\n$fails FAILED\n" : "\nall passed\n";
exit($fails ? 1 : 0);
