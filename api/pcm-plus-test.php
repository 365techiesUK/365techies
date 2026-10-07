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

echo "E  the wiring\n";
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
foreach (array('pcm-plus-lib.php', 'pcm-plus-test.php', 'pcm-plus.json', 'pcm-plus.json.lock', 'pcm-buy-config.php', 'pcm-buy.off') as $f) {
    $denied = false;
    if (preg_match_all('/<FilesMatch "([^"]+)">\s*Require all denied/', $HT, $fm)) foreach ($fm[1] as $re) if (@preg_match('#' . $re . '#', $f)) $denied = true;
    check($denied, 'denied over HTTP: ' . $f);
}
foreach (array('pcm-plus-admin.php', 'pcm.php') as $f) {
    $denied = false;
    if (preg_match_all('/<FilesMatch "([^"]+)">\s*Require all denied/', $HT, $fm)) foreach ($fm[1] as $re) if (@preg_match('#' . $re . '#', $f)) $denied = true;
    check(!$denied, 'still served: ' . $f);
}
$GI = (string)file_get_contents(__DIR__ . '/../.gitignore');
foreach (array('api/pcm-plus.json', 'api/pcm-buy.off') as $f) check(preg_match('#^' . preg_quote($f, '#') . '\r?$#m', $GI) === 1, 'never committed: ' . $f);
check(preg_match('#^api/pcm-buy-config\.php\r?$#m', $GI) === 0, 'the config IS in git (nothing secret in it)');

array_map('unlink', glob("$TMP/*")); @rmdir($TMP);
echo "\n" . ($fails ? "pcm-plus-test: $fails FAILED\n" : "pcm-plus-test: all passed\n");
exit($fails ? 1 : 0);
