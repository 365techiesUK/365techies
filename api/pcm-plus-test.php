<?php
/*
 * The paid app abroad - "Unlock everything" (pcm-plus-lib.php, 8 Oct 2026). CLI only:
 *   C:\tools\php\php.exe -d extension=mbstring api/pcm-plus-test.php
 * The key store, the switch and the config are temp files; the country lookups use the real tables (api/geoip).
 */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
error_reporting(E_ALL);
$TMP = sys_get_temp_dir() . '/pcm-plus-test-' . getmypid();
@mkdir($TMP);
define('PLUS_FILE', $TMP . '/pcm-plus.json');
define('PLUS_OFF', $TMP . '/pcm-buy.off');
define('PLUS_CONFIG', $TMP . '/pcm-buy-config.php');
require __DIR__ . '/pcm-plus-lib.php';
function TMP_SECRET_FILE() { return sys_get_temp_dir() . '/pcm-plus-test-secret-' . getmypid() . '.php'; }
$fails = 0;
function check($ok, $what, $detail = '') { global $fails; echo ($ok ? "  PASS  " : "  FAIL  ") . $what . ($ok ? '' : "  [" . $detail . "]") . "\n"; if (!$ok) $fails++; }

echo "A  switched off until the owner says go\n";
check(plus_offer_out('US', 'abc') === array(), 'no config: a check-in\'s answer gains nothing (the app behaves as before)');
copy(__DIR__ . '/pcm-buy-config.php', PLUS_CONFIG);
check(plus_offer_out('US', 'abc') === array() && !plus_config()['on'], 'the config as shipped (8 Oct 2026): switched off');
file_put_contents(PLUS_CONFIG, "<?php\n\$BUY_ON = true;\n\$BUY_URL = '';\n");
check(plus_offer_out('US', 'abc') === array(), 'switched on, but no checkout link: still nothing');
file_put_contents(PLUS_CONFIG, "<?php\n\$BUY_ON = false;\n\$BUY_URL = 'https://pay.example.com/checkout?id={id}';\n\$BUY_PRICE = '\$29 a year';\n\$BUY_PROVIDER = 'Paddle';\n");
check(plus_offer_out('US', 'abc') === array(), 'a checkout link, but switched off: nothing');
file_put_contents(PLUS_CONFIG, "<?php\n\$BUY_ON = true;\n\$BUY_URL = 'https://pay.example.com/checkout?id={id}';\n\$BUY_PRICE = '\$29 a year';\n\$BUY_PROVIDER = 'Paddle';\n");
check(plus_enabled(), 'switched on with a checkout link: on');
file_put_contents(PLUS_OFF, '');
check(!plus_enabled() && plus_offer_out('US', 'abc') === array(), 'api/pcm-buy.off on the server: stopped at once, no deploy');
@unlink(PLUS_OFF);

echo "B  who is offered what\n";
$o = plus_offer_out('US', 'a1b2 c3');
check($o === array('offer' => 'buy', 'buy_url' => 'https://pay.example.com/checkout?id=a1b2%20c3', 'buy_price' => '$29 a year'), 'the US: buy, with the checkout link (its install id filled in) and the price as written', json_encode($o));
check(plus_offer_out('ng', 'x')['offer'] === 'buy' && plus_offer_out('CZ', 'x')['offer'] === 'buy', 'anywhere else abroad: buy');
foreach (array('GB', 'IM', 'JE', 'GG', '') as $c) check(plus_offer_out($c, 'x') === array('offer' => 'plan'), 'country "' . $c . '": our support plans, as now');
check(plus_config()['provider'] === 'paddle' && plus_config()['price'] === '$29 a year', 'the config read as data, never run');
file_put_contents(PLUS_CONFIG, "<?php \$BUY_ON = true; \$BUY_URL = 'http://not-secure.example.com/'; \$BUY_PRICE = '\$5';");
check(!plus_enabled() && plus_offer_out('US', 'x') === array(), 'a checkout link that is not https: off');
file_put_contents(PLUS_CONFIG, "<?php\n\$BUY_ON = true;\n\$BUY_URL = 'https://pay.example.com/checkout?id={id}';\n\$BUY_PRICE = '\$29 a year';\n");

echo "C  keys\n";
$T = gmmktime(12, 0, 0, 10, 8, 2026);
check(plus_issue('not an email', 1, 'Steve', 'staff', '', '', $T) === null && !file_exists(PLUS_FILE), 'no email: no key');
list($k1, $id1) = plus_issue('Buyer@Example.com ', 1, 'Steve', 'staff', '', 'a test', $T);
check(plus_is_key($k1) && preg_match('/^UNLK-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/', $k1) && strlen($id1) === 10, 'a key "UNLK-XXXX-XXXX-XXXX" (no 0/O/1/I/L), and an id for the portal', $k1);
$raw = file_get_contents(PLUS_FILE);
check(strpos($raw, $k1) === false && strpos($raw, substr($k1, 5, 9)) === false && strpos($raw, 'buyer@example.com') !== false, 'kept as a one-way hash, never the key; the email kept to find a buyer\'s key', $raw);
check(!plus_is_key('AUDT-HOME-0001') && !plus_is_key('SB1234567890') && !plus_is_key('UNLK-AAAA-AAAA') && !plus_is_key('UNLK-AAAA-AAAA-AAA0') && plus_is_key(strtolower($k1)), 'never mistaken for a customer key; typed in lower case is fine');
$r = plus_check($k1, 'aaaa1111bbbb2222', true, $T + 60);
check($r['ok'] === true && $r['expires'] === strtotime('+1 year', $T), 'activated on a PC: good for a year', json_encode($r));
check(plus_check($k1, 'aaaa1111bbbb2222', false, $T + 3600)['ok'] === true, 'that PC\'s next check-in: still good');
check(plus_check($k1, 'cccc3333dddd4444', false, $T)['error'] === 'not_this_pc', 'another PC checking in with it (never activated there): not this PC');
check(plus_check($k1, 'cccc3333dddd4444', true, $T)['ok'] && plus_check($k1, 'eeee5555ffff6666', true, $T)['ok'], 'second and third PCs activated');
check(plus_check($k1, '9999000011112222', true, $T)['error'] === 'too_many_pcs', 'a fourth PC: refused (' . PLUS_MAX_PCS . ' PCs a key)');
check(plus_check($k1, 'aaaa1111bbbb2222', false, strtotime('+1 year', $T) + 60)['error'] === 'expired', 'a year on: expired');
check(plus_check('UNLK-2345-6789-ABCD', 'aaaa1111bbbb2222', true, $T)['error'] === 'unknown' && plus_check('nonsense', 'aaaa1111bbbb2222', true, $T)['error'] === 'unknown', 'a key we never issued: unknown');
check(plus_check($k1, 'zz', true, $T)['error'] === 'not_this_pc', 'no usable machine id: refused');
list($k2, $id2) = plus_issue('life@example.com', 0, 'David', 'staff', '', '', $T + 10);
check(plus_check($k2, 'aaaa1111bbbb2222', true, $T + 50 * 365 * 86400)['ok'] === true, 'a lifetime key: good fifty years on');

echo "D  staff\n";
check(plus_set_status($id1, 'revoked') && plus_check($k1, 'aaaa1111bbbb2222', false, $T)['error'] === 'revoked', 'revoked (a refund): the key stops working at the next check-in');
check(!plus_set_status($id1, 'revoked') && !plus_set_status('nope', 'revoked') && !plus_set_status($id1, 'nonsense'), 'nothing to change: nothing written');
check(plus_set_status($id1, 'active') && plus_check($k1, 'aaaa1111bbbb2222', false, $T)['ok'], 'and back on');
check(plus_free_pcs($id1) && plus_check($k1, '9999000011112222', true, $T)['ok'], 'free its PC slots: a new PC can be activated');
check(plus_note_run($k1, $T + 100) && plus_note_run($k1, $T + 200) && !plus_note_run('UNLK-2345-6789-ABCD', $T) && !plus_note_run('nonsense', $T), 'full services served are counted on the key (never on an unknown one)');
$L = plus_list();
$r1 = null; foreach ($L as $x) if ($x['id'] === $id1) $r1 = $x;
check($r1['runs'] === 2 && $r1['last_run'] === $T + 200, 'the staff card sees how many and when', json_encode($r1));
check(count($L) === 2 && $L[0]['email'] === 'life@example.com' && $L[1]['last4'] === substr($k1, -4) && $L[1]['pcs'] === 1 && !isset($L[0]['key']) && strpos(json_encode($L), $k1) === false, 'the list: newest first, last four only, never the key', json_encode($L));
file_put_contents(PLUS_FILE, '{broken');
check(plus_issue('a@b.co', 1, 'Steve') === null && file_get_contents(PLUS_FILE) === '{broken' && plus_check($k1, 'aaaa1111bbbb2222', false)['error'] === 'busy', 'an unreadable store is never overwritten; keys answer "busy", not "unknown"');

echo "E  Lemon Squeezy's webhook (8 Oct 2026)\n";
@unlink(PLUS_FILE);
file_put_contents(PLUS_CONFIG, "<?php\n\$BUY_ON = false;\n\$LS_VARIANTS = '777:life, 555:year';\n");
$SECRET = 'test-signing-secret-1234';
$mails = array();
$mailer = function ($to, $key, $exp) use (&$mails) { $mails[] = array($to, $key, $exp); return true; };
$ev = function ($name, $type, $id, $attrs, $custom = array(), $test = false) {
    return json_encode(array('meta' => array('event_name' => $name, 'test_mode' => $test, 'custom_data' => (object)$custom), 'data' => array('type' => $type, 'id' => (string)$id, 'attributes' => $attrs)));
};
$sign = function ($raw) use ($SECRET) { return hash_hmac('sha256', $raw, $SECRET); };
$T = gmmktime(12, 0, 0, 10, 8, 2026);
$order = array('status' => 'paid', 'user_email' => 'Buyer@Example.com', 'order_number' => 1001, 'currency' => 'USD', 'total' => 2900, 'refunded' => false, 'first_order_item' => array('variant_id' => 999, 'product_id' => 1));
$raw = $ev('order_created', 'orders', 5001, $order, array('install' => 'a1b2c3d4e5f60718'));
check(plus_ls_handle($raw, $sign($raw), '', $mailer, $T)[0] === 503, 'no signing secret on the server yet: 503 (Lemon Squeezy tries again later)');
check(plus_ls_handle($raw, 'deadbeef', $SECRET, $mailer, $T)[0] === 401 && plus_ls_handle($raw, '', $SECRET, $mailer, $T)[0] === 401 && plus_ls_handle($raw . ' ', $sign($raw), $SECRET, $mailer, $T)[0] === 401 && !$mails && !file_exists(PLUS_FILE),
    'a wrong, missing or stale signature: 401, nothing made');
$r = plus_ls_handle($raw, strtoupper($sign($raw)), $SECRET, $mailer, $T);
check($r[0] === 200 && preg_match('/^key [a-f0-9]{10} made and emailed$/', $r[1]) && count($mails) === 1 && $mails[0][0] === 'buyer@example.com' && plus_is_key($mails[0][1]) && $mails[0][2] === strtotime('+1 year', $T),
    'a paid order: a key for a year (variant not listed), emailed to the buyer', json_encode(array($r, $mails)));
$k = plus_list()[0];
check($k['provider'] === 'lemonsqueezy' && $k['note'] === 'Lemon Squeezy order #1001 USD 29.00' && $k['by'] === 'checkout' && !$k['test'], 'listed for the staff card: the order number and what was paid', json_encode($k));
$st = json_decode(file_get_contents(PLUS_FILE), true); $e1 = current($st['keys']);
check($e1['install'] === 'a1b2c3d4e5f60718' && $e1['order'] === '5001' && strpos(file_get_contents(PLUS_FILE), $mails[0][1]) === false, 'the install it came from and the order kept; the key itself never');
check(plus_check($mails[0][1], 'aaaa1111bbbb2222', true, $T)['ok'], 'the emailed key activates');
$r = plus_ls_handle($raw, $sign($raw), $SECRET, $mailer, $T + 60);
check($r[0] === 200 && $r[1] === 'order already has its key' && count($mails) === 1 && count(plus_list()) === 1, 'the same delivery again (a retry): nothing new, no second email');
$raw2 = $ev('order_created', 'orders', 5002, array('status' => 'pending') + $order);
check(plus_ls_handle($raw2, $sign($raw2), $SECRET, $mailer, $T)[1] === 'order not paid (pending)' && count(plus_list()) === 1, 'an order not paid yet: nothing');
$raw3 = $ev('order_created', 'orders', 5003, array('first_order_item' => array('variant_id' => 777), 'order_number' => 1003) + $order, array(), true);
$r = plus_ls_handle($raw3, $sign($raw3), $SECRET, $mailer, $T);
$byId = function ($id) { foreach (plus_list() as $x) if ($x['id'] === $id) return $x; return null; };
$k3 = $byId(plus_find_order('lemonsqueezy', '5003'));
check($r[0] === 200 && $mails[1][2] === 0 && $k3['expires'] === 0 && $k3['test'] && strpos($k3['note'], '(TEST)') !== false, 'a variant listed as "life": a lifetime key; a test-mode order is marked TEST', json_encode($k3));
// subscriptions
$sub = function ($status, $orderId, $renews, $ends = null) { return array('order_id' => $orderId, 'status' => $status, 'renews_at' => $renews ? gmdate('Y-m-d\TH:i:s.000000\Z', $renews) : null, 'ends_at' => $ends ? gmdate('Y-m-d\TH:i:s.000000\Z', $ends) : null, 'user_email' => 'buyer@example.com'); };
$raw4 = $ev('subscription_created', 'subscriptions', 9001, $sub('active', 7777, $T + 365 * 86400));
check(plus_ls_handle($raw4, $sign($raw4), $SECRET, $mailer, $T)[0] === 409, 'a subscription that arrives before its order: 409, so Lemon Squeezy tries again');
$ren = $T + 365 * 86400;
$raw5 = $ev('subscription_created', 'subscriptions', 9002, $sub('active', 5001, $ren));
$r = plus_ls_handle($raw5, $sign($raw5), $SECRET, $mailer, $T);
$e = $byId(plus_find_order('lemonsqueezy', '5001'));
check($r[0] === 200 && $e['expires'] === $ren + 7 * 86400, 'the subscription: the key runs to its renewal date + a week\'s grace', json_encode(array($r, $e['expires'])));
$raw6 = $ev('subscription_updated', 'subscriptions', 9002, $sub('active', 5001, $ren + 365 * 86400));
plus_ls_handle($raw6, $sign($raw6), $SECRET, $mailer, $T + 360 * 86400);
$e = $byId(plus_find_order('lemonsqueezy', '5001'));
check($e['expires'] === $ren + 365 * 86400 + 7 * 86400, 'renewed a year on: another year');
$endsAt = $ren + 365 * 86400;
$raw7 = $ev('subscription_cancelled', 'subscriptions', 9002, $sub('cancelled', 5001, null, $endsAt));
plus_ls_handle($raw7, $sign($raw7), $SECRET, $mailer, $T + 400 * 86400);
$e = $byId(plus_find_order('lemonsqueezy', '5001'));
check($e['expires'] === $endsAt, 'cancelled: the key runs to the end of what was paid for');
$raw8 = $ev('subscription_expired', 'subscriptions', 9002, $sub('expired', 5001, null, $endsAt));
plus_ls_handle($raw8, $sign($raw8), $SECRET, $mailer, $endsAt + 60);
check(plus_check($mails[0][1], 'aaaa1111bbbb2222', false, $endsAt + 120)['error'] === 'expired', 'expired: the key stops working');
// refunds
$raw9 = $ev('order_refunded', 'orders', 5003, array('status' => 'partial_refund', 'refunded' => false) + $order);
check(plus_ls_handle($raw9, $sign($raw9), $SECRET, $mailer, $T)[1] === 'partial refund - key kept' && plus_check($mails[1][1], 'aaaa1111bbbb2222', true, $T)['ok'], 'a partial refund: the key keeps working');
$raw10 = $ev('order_refunded', 'orders', 5003, array('status' => 'refunded', 'refunded' => true) + $order);
$r = plus_ls_handle($raw10, $sign($raw10), $SECRET, $mailer, $T);
check($r[0] === 200 && plus_check($mails[1][1], 'aaaa1111bbbb2222', false, $T)['error'] === 'revoked', 'a full refund: the key is switched off', $r[1]);
$raw11 = $ev('order_refunded', 'orders', 4444, array('refunded' => true) + $order);
check(plus_ls_handle($raw11, $sign($raw11), $SECRET, $mailer, $T)[1] === 'refund for an order with no key', 'a refund for an order we never keyed: nothing');
// the email fails
$failMail = function () { return false; };
$raw12 = $ev('order_created', 'orders', 5004, $order);
$r = plus_ls_handle($raw12, $sign($raw12), $SECRET, $failMail, $T);
check($r[0] === 200 && strpos($r[1], 'EMAIL FAILED') !== false, 'the email did not go: the key is still made (no duplicate on a retry) and the log says to send a new one', $r[1]);
check(plus_ls_handle($ev('license_key_created', 'license-keys', 1, array()), $sign($ev('license_key_created', 'license-keys', 1, array())), $SECRET, $mailer, $T)[1] === 'event license_key_created - nothing to do', 'other events: nothing');
check(plus_ls_handle('not json', $sign('not json'), $SECRET, $mailer, $T)[0] === 200, 'a signed delivery we cannot read: answered, nothing done');
// a new key for a buyer who lost the email
$id4 = plus_find_order('lemonsqueezy', '5004');
$nk = plus_reissue($id4, 'Steve', $T + 100);
check($nk && plus_is_key($nk[0]) && plus_find_order('lemonsqueezy', '5004') === $nk[1] && plus_check($nk[0], 'aaaa1111bbbb2222', true, $T + 200)['ok'], 'a new key: it works, and the order now belongs to it');
$old = null; foreach (plus_list() as $x) if ($x['id'] === $id4) $old = $x;
check($old['status'] === 'revoked' && plus_ls_handle($raw12, $sign($raw12), $SECRET, $mailer, $T + 300)[1] === 'order already has its key', 'the old key is switched off; a late retry of the order still makes nothing');
list($subj, $body) = plus_key_email('UNLK-ABCD-EFGH-JK7M', 0);
check($subj === 'Your 365 PC Manager key: Unlock everything' && strpos($body, 'UNLK-ABCD-EFGH-JK7M') !== false && strpos($body, 'up to 3 PCs') !== false && strpos($body, 'It never runs out.') !== false
    && strpos(plus_key_email('UNLK-ABCD-EFGH-JK7M', gmmktime(0, 0, 0, 10, 8, 2027))[1], 'It works until 8 October 2027.') !== false, 'the email: the key, how to use it, 3 PCs, until when');
check(plus_ls_secret(TMP_SECRET_FILE()) === '', 'no secret file: no secret');
file_put_contents(TMP_SECRET_FILE(), "<?php\n// the owner's\n\$LS_WEBHOOK_SECRET = 'abc123XYZ';\n");
check(plus_ls_secret(TMP_SECRET_FILE()) === 'abc123XYZ', 'the secret read from api/pcm-ls-secret.php as data');
@unlink(TMP_SECRET_FILE());
$W = (string)file_get_contents(__DIR__ . '/pcm-plus-ls.php');
$iSig = strpos($W, 'if (plus_ls_signed($raw, $sig, $secret)) {'); $iRev = strpos($W, "require_once __DIR__ . '/pcm-review.php'");
check($iSig !== false && $iRev !== false && $iSig < $iRev && strpos($W, 'http_response_code($code);') !== false && strpos($W, "\$_SERVER['HTTP_X_SIGNATURE']") !== false,
    'pcm-plus-ls.php: the mail code is loaded only for a signed delivery; the answer\'s status is the handler\'s');

echo "F  the wiring\n";
$P = (string)file_get_contents(__DIR__ . '/pcm.php');
$iA = strpos($P, "if (\$action === 'activate') {"); $iPA = strpos($P, 'plus_check($key, $machine, true)', $iA); $iU = strpos($P, "out(array('ok'=>false,'error'=>'unknown_key'))", $iA);
check($iA !== false && $iPA !== false && $iU !== false && $iPA < $iU, 'activate: an Unlock key is tried before "unknown key"');
$iC = strpos($P, "if (\$action === 'checkin') {"); $iPC = strpos($P, 'plus_check($key, $machine, false)', $iC); $iK = strpos($P, "out(array('ok'=>true,'tier'=>'free') + \$upd", $iC);
check($iC !== false && $iPC !== false && $iK !== false && $iPC < $iK && strpos(substr($P, $iK, 400), 'plus_offer_out(') !== false, 'check-in: an Unlock key is checked; only a KEYLESS answer carries the offer');
check(substr_count($P, "!isset(\$db['customers'][\$key]) && function_exists('plus_is_key') && plus_is_key(\$key)") === 4, 'a customer key always wins over an Unlock key (activate, check-in, report, report notice)');
check(strpos($P, "if (is_readable(__DIR__ . '/pcm-plus-lib.php')) require_once __DIR__ . '/pcm-plus-lib.php';") !== false && strpos($P, "function_exists('plus_offer_out') ? plus_offer_out(") !== false, 'guarded: a missing library can never stop a check-in');
check(strpos($P, "array('plus_error'=>\$pr['error']) + plus_offer_out(") !== false, 'a key that has run out is offered Unlock again (to renew)');
foreach (array('reportup' => "out(array('ok'=>true,'kept'=>false))", 'reportnote' => "out(array('ok'=>true,'posted'=>false))") as $act => $ans) {
    $i0 = strpos($P, "if (\$action === '" . $act . "') {"); $iP = strpos($P, $ans, $i0); $iU = strpos($P, "out(array('ok'=>false,'error'=>'unknown_key'))", $i0);
    check($i0 !== false && $iP !== false && $iU !== false && $iP < $iU, $act . ': an Unlock key\'s report is taken and NOT kept or posted (stays on the PC; stops the Slack fallback)');
}
$S = (string)file_get_contents(__DIR__ . '/pcm-service.php');
$iS = strpos($S, 'if (plus_is_key($key)) {'); $iN = strpos($S, "if (!isset(\$db['customers'][\$key])) deny('not on support');");
check($iS !== false && $iN !== false && $iS < $iN && strpos($S, "plus_check(\$key, \$machine, false)") !== false && strpos($S, "header('X-365-SelfRun: 1');") !== false && strpos($S, 'plus_note_run($key);') !== false,
    'pcm-service.php: an Unlock key activated on this PC gets the full service - always a self-run, counted, never written to the customer file');
check(substr_count($S, 'readfile($payload);') === 2 && strpos($S, "deny('update the app first')") !== false, '...signed payload only (an app older than v29 is told to update)');
$HT = (string)file_get_contents(__DIR__ . '/../.htaccess');
foreach (array('pcm-plus-lib.php', 'pcm-plus-test.php', 'pcm-plus.json', 'pcm-plus.json.lock', 'pcm-buy-config.php', 'pcm-buy.off', 'pcm-ls-secret.php', 'pcm-plus-ls.log') as $f) {
    $denied = false;
    if (preg_match_all('/<FilesMatch "([^"]+)">\s*Require all denied/', $HT, $fm)) foreach ($fm[1] as $re) if (@preg_match('#' . $re . '#', $f)) $denied = true;
    check($denied, 'denied over HTTP: ' . $f);
}
foreach (array('pcm-plus-admin.php', 'pcm.php', 'pcm-plus-ls.php') as $f) {
    $denied = false;
    if (preg_match_all('/<FilesMatch "([^"]+)">\s*Require all denied/', $HT, $fm)) foreach ($fm[1] as $re) if (@preg_match('#' . $re . '#', $f)) $denied = true;
    check(!$denied, 'still served: ' . $f);
}
$GI = (string)file_get_contents(__DIR__ . '/../.gitignore');
foreach (array('api/pcm-plus.json', 'api/pcm-buy.off', 'api/pcm-ls-secret.php', 'api/pcm-plus-ls.log') as $f) check(preg_match('#^' . preg_quote($f, '#') . '\r?$#m', $GI) === 1, 'never committed: ' . $f);
check(preg_match('#^api/pcm-buy-config\.php\r?$#m', $GI) === 0, 'the config IS in git (nothing secret in it)');

array_map('unlink', glob("$TMP/*")); @rmdir($TMP);
echo "\n" . ($fails ? "pcm-plus-test: $fails FAILED\n" : "pcm-plus-test: all passed\n");
exit($fails ? 1 : 0);
