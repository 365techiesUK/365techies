<?php
/**
 * Gate tests for the customer invoice endpoint.
 *   Run:  php api/pcm-myinvoices-test.php
 *
 * This endpoint answers with somebody's money, so what is worth pinning is not
 * the happy path - it is that every wrong caller is refused, that a refusal
 * leaks nothing, and that NOTHING in the request can change whose invoices are
 * fetched. The session ladder is a pure function (pcm-portal-auth-lib.php) so it
 * can be tested directly with an injected clock; the "you cannot choose the
 * customer" property is asserted against the endpoint's own source, because it
 * is a property of the code rather than of one request.
 *
 * Pure CLI: no server, no network, and the real store is never opened.
 */
if (php_sapi_name() !== 'cli') { http_response_code(404); exit; }
require_once __DIR__ . '/pcm-portal-auth-lib.php';

$fails = 0;
function ok($cond, $what) {
    global $fails;
    echo ($cond ? "  PASS  " : "  FAIL  ") . $what . "\n";
    if (!$cond) $fails++;
}

$NOW = 1788000000;   // fixed clock, so an expiry test cannot pass by luck
$DB = array(
    'websessions' => array(
        'aaaa1111' => array('key' => 'CUST-OWNER', 'ts' => $NOW, 'iat' => $NOW, 'machine' => 'PC-1'),
        'bbbb2222' => array('key' => 'CUST-OWNER', 'ts' => $NOW - 200000, 'iat' => $NOW - 200000, 'machine' => 'PC-1'),
        'cccc3333' => array('key' => 'CUST-OWNER', 'ts' => $NOW, 'iat' => $NOW, 'machine' => 'PC-1', 'member' => 'staff@kite.example'),
        'dddd4444' => array('key' => 'CUST-GONE',  'ts' => $NOW, 'iat' => $NOW, 'machine' => 'PC-1'),
        'eeee5555' => array('key' => 'CUST-OWNER', 'ts' => $NOW, 'iat' => $NOW),                       // unbound session
        'ffff6666' => array('key' => 'CUST-OWNER', 'ts' => $NOW, 'iat' => $NOW - 100000, 'machine' => 'PC-1', 'long' => true),
        'aaaabbbb' => array('key' => 'CUST-OWNER', 'ts' => $NOW - 20000000, 'iat' => $NOW - 20000000, 'machine' => 'PC-1', 'forever' => true),
        'ccccdddd' => array('key' => 'CUST-OWNER', 'ts' => $NOW, 'iat' => $NOW, 'machine' => 'PC-1', 'viewas' => true),
    ),
    'customers' => array('CUST-OWNER' => array('email' => 'jo@example.com', 'via' => 'staff')),
);
$g = function ($tok, $mach = 'PC-1') { global $DB, $NOW; return portal_session_check($DB, $tok, $mach, $NOW); };

// --- refused ----------------------------------------------------------------
ok($g('')['error'] === 'expired', 'no token is refused');
ok($g('deadbeef')['error'] === 'expired', 'an unknown token is refused');
ok($g('bbbb2222')['error'] === 'expired', 'a session past its sliding window is refused');
ok($g('aaaa1111', 'PC-2')['error'] === 'expired', 'a bound session from another machine is refused');
ok($g('aaaa1111', '')['error'] === 'expired', 'omitting the machine does NOT skip the binding check');
ok($g('cccc3333')['error'] === 'ask_your_manager', 'a company team member is refused: billing is the account holder\'s');
ok($g('dddd4444')['error'] === 'expired', 'a session pointing at a deleted customer is refused');
ok(portal_session_check(null, 'aaaa1111', 'PC-1', $NOW)['error'] === 'db_unavailable', 'an unreadable store is refused, not assumed empty');
ok($g('AAAA1111')['error'] === 'expired', 'the token is matched exactly, not case-folded');
ok($g("aaaa1111\x00")['ok'] === true, 'a stray control character is stripped rather than crashing');

// --- allowed ----------------------------------------------------------------
ok($g('aaaa1111')['ok'] === true && $g('aaaa1111')['key'] === 'CUST-OWNER', 'a live account-holder session passes with its key');
ok($g('eeee5555')['ok'] === true, 'an unbound session is not machine-checked');
ok($g('eeee5555', 'ANY-PC')['ok'] === true, 'and passes from any machine, by design');
ok($g('ffff6666')['ok'] === true, 'a long session lives past the short cap');
ok($g('aaaabbbb')['ok'] === true, 'a forever session has no hard cap');
ok($g('ccccdddd')['ok'] === true && $g('ccccdddd')['viewas'] === true, 'staff view-as passes and is flagged as such');

// --- a refusal says nothing -------------------------------------------------
foreach (array('cccc3333', 'bbbb2222', 'deadbeef') as $t) {
    $r = $g($t);
    ok(!isset($r['key']), 'a refusal for ' . $t . ' carries no customer key');
    $j = json_encode($r);
    ok(strpos($j, 'jo@example.com') === false && strpos($j, 'CUST-OWNER') === false,
       'a refusal for ' . $t . ' leaks no identity');
}

// --- the app's licence gate (the second way in) ------------------------------
$APPDB = array('customers' => array(
    'K-PRO'  => array('email' => 'jo@example.com', 'via' => 'staff', 'tier' => 'pro',
                      'machines' => array('aa11bb22' => array('name' => 'Study PC'))),
    'K-FREE' => array('email' => 'sam@example.com', 'via' => 'staff', 'tier' => 'free',
                      'machines' => array('cc33dd44' => array('name' => 'Laptop'))),
));
$a = function ($k, $m, $pro = false) use ($APPDB) { return app_licence_check($APPDB, $k, $m, $pro); };

ok($a('K-PRO', 'aa11bb22')['ok'] === true, 'a licensed machine passes');
ok($a('K-PRO', 'aa11bb22')['key'] === 'K-PRO', 'and yields its customer key');
ok($a('k-pro', 'aa11bb22')['ok'] === true, 'the key is upper-cased, as pcm.php does');
ok($a('K-PRO', '')['error'] === 'missing', 'no machine, no answer');
ok($a('', 'aa11bb22')['error'] === 'missing', 'no key, no answer');
ok($a('K-NOPE', 'aa11bb22')['error'] === 'unknown_key', 'an unknown key is refused');
/* THE ONE THAT MATTERS: a real licence key plus a machine that was never
   activated against it must not read that customer's invoices. */
ok($a('K-PRO', 'ffffffff')['error'] === 'activate_first', 'a key alone is not enough - the machine must be registered');
ok($a('K-PRO', 'cc33dd44')['error'] === 'activate_first', 'another customer machine id does not unlock this key');
ok($a('K-FREE', 'cc33dd44')['ok'] === true, 'a free-tier customer can still see their own invoices');
ok($a('K-FREE', 'cc33dd44', true)['error'] === 'not_on_support', 'but a pro-only caller refuses them');
ok(app_licence_check(null, 'K-PRO', 'aa11bb22')['error'] === 'db_unavailable', 'an unreadable store is refused');
foreach (array($a('K-NOPE', 'aa11bb22'), $a('K-PRO', 'ffffffff')) as $r)
    ok(!isset($r['key']), 'a refused licence carries no customer key');
// the machine id is normalised the same way pcm.php stores it (hex, capped at 32)
ok($a('K-PRO', 'AA11BB22')['error'] === 'activate_first', 'upper-case hex is not the same machine - matches pcm.php exactly');
ok($a('K-PRO', 'aa11bb22-!@#')['ok'] === true, 'punctuation is stripped, as pcm.php strips it');

// The endpoint accepts either credential, and the wtoken path wins when both are sent.
$src2 = (string)file_get_contents(__DIR__ . '/pcm-myinvoices.php');
ok(strpos($src2, 'app_licence_check(') !== false, 'the endpoint offers the licence path');
ok(strpos($src2, "portal_session_check(\$db, \$in['wtoken'], \$machine)") !== false,
   'a web session is preferred when one is presented');

// --- the request cannot choose whose invoices these are ---------------------
$src = (string)file_get_contents(__DIR__ . '/pcm-myinvoices.php');
ok(strpos($src, "\$in['email']") === false, 'the endpoint never reads an email from the request');
ok(strpos($src, "\$in['qboId']") === false, 'it never reads a QuickBooks id from the request');
/* $in['key'] IS read now - it is the app's licence key - but it is a CREDENTIAL
   checked against the store, not a choice of customer: app_licence_check only
   ever returns the key it verified, and the invoice lookup uses the email on
   that record. The customer key is never taken from the request as an identity. */
ok(preg_match('/\$key = \(string\)\$gate\[\'key\'\];/', $src) === 1,
   'the customer key always comes from the verified gate, never straight from the request');
ok(preg_match('/\$email\s*=\s*strtolower\(trim\(\(string\)\(isset\(\$c\[\'email\'\]\)/', $src) === 1,
   'the email it uses comes from OUR customer record');
ok(preg_match("/\\\$id = preg_replace\\('\\/\\[\\^0-9\\]\\/'/", $src) === 1,
   'the only request value reaching a query is the invoice id, digits-only');
ok(strpos($src, "CustomerRef'\]\['value'\]") !== false || strpos($src, "CustomerRef") !== false,
   'the PDF path checks CustomerRef before streaming');
ok(preg_match('/if \(\$ref === \'\' \|\| \$ref !== \$qboId\)/', $src) === 1,
   'and refuses the PDF unless that reference is this customer');
ok(preg_match('/\$ref !== \$qboId\) continue;/', $src) === 1,
   'the list also drops any row whose CustomerRef is not this customer');

// --- read-only ---------------------------------------------------------------
foreach (array("qbo_lib_api('POST'", "qbo_lib_api('DELETE'", "qbo_lib_api('PUT'") as $write)
    ok(strpos($src, $write) === false, 'the endpoint never issues a ' . substr($write, 13, 6) . ' to QuickBooks');
ok(strpos($src, '$STATEF') !== false && preg_match('/file_put_contents\(\s*\$STATEF/', $src) === 0,
   'it reads the biller\'s state file but never writes to it');

echo "\n" . ($fails ? "$fails FAILED" : "all passed") . "\n";
exit($fails ? 1 : 0);
