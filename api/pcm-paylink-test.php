<?php
/**
 * Pay links (per-job GoCardless payment links) - test suite.
 *   Run:  php -d extension=mbstring api/pcm-paylink-test.php
 *
 * Pins the parts that would cost real money or leak a personal payment link if
 * they drifted: the amount guard, the link-shape guard (this endpoint sends the
 * single-use link pcm-invite.php refuses, so the two rules must not be mixed
 * up), the store's reuse rule, what the customer reads, and the source-level
 * guarantees - staff gate before any action, destination read from the stored
 * row, no single-use link anywhere in the built site.
 */
if (PHP_SAPI !== 'cli') { http_response_code(403); exit('cli only'); }
require __DIR__ . '/pcm-paylink-lib.php';

$fails = 0;
function ok($cond, $what, $detail = '') {
    global $fails;
    echo ($cond ? '  PASS  ' : '  FAIL  ') . $what . ($cond || $detail === '' ? '' : '   [' . $detail . ']') . "\n";
    if (!$cond) $fails++;
}
$SRC = (string)file_get_contents(__DIR__ . '/pcm-paylink.php');
$LIVE_LINK = 'https://pay.gocardless.com/billing/static/flow?id=BRF0123456789ABCDEF';

echo "-- the amount guard (an operator typo here asks a customer for the wrong money)\n";
ok(pl_amount('60') === 60.0 && pl_amount('£60.00') === 60.0 && pl_amount(' 60.50 ') === 60.5, 'normal amounts, currency sign and spaces');
ok(pl_amount('') === false && pl_amount('abc') === false && pl_amount('10.00.5') === false, 'empty, non-numeric and double-dot refused');
ok(pl_amount('0') === false && pl_amount('0.50') === false, 'below the £1 floor refused', var_export(pl_amount('0.50'), true));
ok(pl_amount('2000') === 2000.0 && pl_amount('2000.01') === false, 'the £2,000 typo ceiling holds');
ok(pl_pence(60) === '6000' && pl_pence(18.25) === '1825' && pl_pence(60.5) === '6050', 'pence conversion survives float rounding', pl_pence(18.25));
ok(pl_money(60) === '£60.00' && pl_money(1234.5) === '£1,234.50', 'money formatting');

echo "-- what the payment is called\n";
ok(pl_desc("  Laptop   service\n 18 Sept ") === 'Laptop service 18 Sept', 'whitespace collapsed', pl_desc("  Laptop   service\n 18 Sept "));
ok(strlen(pl_desc(str_repeat('x', 200))) === PL_DESC_MAX, 'capped to the GoCardless description limit');

echo "-- the link shape (the rule here is the INVERSE of pcm-invite.php)\n";
ok(pl_flow_link_ok($LIVE_LINK), 'a hosted single-use flow link is what we send');
ok(!pl_flow_link_ok('https://pay.gocardless.com/BRT01KY2E5JE1V186N6Z0FJMVBEJY'), 'a reusable plan link is NOT one of these');
ok(!pl_flow_link_ok('http://pay.gocardless.com/billing/static/flow?id=BRF1'), 'http refused');
ok(!pl_flow_link_ok('https://pay.gocardless.com.evil.test/billing/static/flow?id=BRF1'), 'lookalike host refused');
ok(!pl_flow_link_ok($LIVE_LINK . " \nSend money"), 'trailing whitespace or a second line refused');
ok(!pl_flow_link_ok(''), 'empty refused');

echo "-- what the customer reads\n";
$sms = pl_msg_sms('Gordon Snook', 60, 'Thursday\'s laptop service', $LIVE_LINK);
ok(strpos($sms, 'Gordon') === 0, 'texts open with their first name', substr($sms, 0, 30));
ok(strpos($sms, '365 Techies') !== false && strpos($sms, '£60.00') !== false && strpos($sms, $LIVE_LINK) !== false,
   'the text says who it is from, how much, and carries the link');
ok(strpos($sms, '01202 775566') !== false, 'a phone number to check it is really us (a payment text must never look like a scam)');
ok(strpos($sms, 'never see your details') !== false, 'says we never see their bank details');
ok(strpos(pl_msg_sms('', 60, '', $LIVE_LINK), 'Here is your secure link') === 0, 'no name still reads properly', pl_msg_sms('', 60, '', $LIVE_LINK));

list($subject, $text, $html) = pl_msg_email('Gordon Snook', 60, 'laptop service', $LIVE_LINK);
ok(strpos($subject, '£60.00') !== false && stripos($subject, '365 Techies') !== false, 'subject carries the amount', $subject);
ok(strpos($text, $LIVE_LINK) !== false && strpos($html, 'href="' . $LIVE_LINK . '"') !== false, 'link in both parts');
ok(strpos($text, "please don't pass it on") !== false && strpos($html, 'please don&rsquo;t pass it on') !== false, 'tells them the link is personal');
ok(strpos($text, '365techies.co.uk/pay/') !== false, 'offers the bank-transfer alternative');
list(, , $h2) = pl_msg_email('<script>alert(1)</script> Bob', 60, '<b>fix</b> & go', $LIVE_LINK, 'note <i>here</i>');
ok(strpos($h2, '<script>') === false && strpos($h2, '<b>fix</b>') === false && strpos($h2, '&amp;') !== false, 'name, description and note are escaped in the HTML');

echo "-- row state\n";
$now = 1_800_000_000;
ok(pl_row_state(array('status' => 'open', 'expires' => $now + 60), $now) === 'open', 'live link is open');
ok(pl_row_state(array('status' => 'open', 'expires' => $now - 1), $now) === 'expired', 'past its expiry is expired');
ok(pl_row_state(array('status' => 'paid', 'expires' => $now - 999), $now) === 'paid', 'paid beats expired');
ok(pl_row_state(array('status' => 'cancelled', 'expires' => $now + 60), $now) === 'cancelled', 'cancelled is final');
ok(pl_row_state(array('status' => 'open', 'expires' => 0), $now) === 'open', 'no expiry recorded = still open');
ok(pl_status_from_br(array('status' => 'fulfilled')) === 'paid', 'fulfilled means paid');
ok(pl_status_from_br(array('status' => 'cancelled')) === 'cancelled' && pl_status_from_br(array('status' => 'failed')) === 'cancelled', 'cancelled/failed');
ok(pl_status_from_br(array('status' => 'pending')) === 'open' && pl_status_from_br(null) === 'open' && pl_status_from_br(array('status' => 'something_new')) === 'open',
   'anything unrecognised stays open - hiding a working link is the worse error');

echo "-- the store\n";
$f = sys_get_temp_dir() . '/pl-test-' . getmypid() . '.json';
@unlink($f); @unlink($f . '.lock');
$mk = function ($id, $job, $amt, $created, $expires, $status = 'open') {
    return array('id' => $id, 'job' => $job, 'name' => 'Test', 'email' => 't@example.com', 'phone' => '07000000000',
                 'amount' => $amt, 'desc' => 'job', 'br' => 'BRQ1', 'brf' => 'BRF1',
                 'url' => 'https://pay.gocardless.com/billing/static/flow?id=BRF1',
                 'created' => $created, 'expires' => $expires, 'by' => 'Steve', 'status' => $status, 'sent_count' => 0);
};
$r = pl_store_locked($f, function ($d) use ($mk, $now) {
    $d['links'][] = $mk('a1', '260920-aaaaa', 60.0, $now - 100, $now + 3600);
    $d['links'][] = $mk('b2', '260920-bbbbb', 85.0, $now - 50,  $now - 10);       // expired
    $d['links'][] = $mk('c3', '260920-ccccc', 30.0, $now - 40,  $now + 3600, 'paid');
    return array('ok' => true, 'data' => $d);
});
ok(!empty($r['ok']) && is_file($f), 'store writes');
$store = pl_store_read($f);
ok(count($store['links']) === 3 && pl_find($store, 'a1')['amount'] === 60.0, 'rows read back');
ok(pl_find($store, 'nope') === null, 'unknown id returns null');
ok(pl_find_reusable($store, '260920-aaaaa', 60.0, $now)['id'] === 'a1', 'same job and amount reuses the live link');
ok(pl_find_reusable($store, '260920-aaaaa', 65.0, $now) === null, 'a different amount never reuses a link');
ok(pl_find_reusable($store, '260920-bbbbb', 85.0, $now) === null, 'an expired link is not reused');
ok(pl_find_reusable($store, '260920-ccccc', 30.0, $now) === null, 'a paid link is not reused (nobody gets asked twice)');
ok(pl_find_reusable($store, '', 60.0, $now) === null, 'no job id, no reuse');
ok(pl_count_since($store, $now - 60) === 2, 'rate counter counts only recent rows', (string)pl_count_since($store, $now - 60));
$pub = pl_row_public(pl_find($store, 'a1'), $now);
ok(!isset($pub['url']) && !in_array($LIVE_LINK, $pub, true) && $pub['state'] === 'open', 'the list view never carries the payment link');
ok(!isset($pub['email']) && !isset($pub['phone']), 'nor the customer contact details');
ok(pl_store_read(sys_get_temp_dir() . '/pl-does-not-exist.json') === array('links' => array()), 'a missing store reads as empty, not a crash');
@unlink($f); @unlink($f . '.lock');

echo "-- the endpoint's own guarantees (source level)\n";
ok(strpos($SRC, '?' . '>') === false, 'no closing tag');
$gate = strpos($SRC, 'need_staff();');
ok($gate !== false && $gate < strpos($SRC, "if (\$action === 'create')"), 'the staff gate runs before any action');
foreach (array('create', 'send', 'status', 'link', 'list') as $a)
    ok(strpos($SRC, "if (\$action === '" . $a . "')") !== false, 'action ' . $a . ' exists');
ok(strpos($SRC, "fail('bad_action')") !== false, 'an unknown action is refused');
ok(preg_match('/\$to = \(\$via === \'sms\'\) \? \(string\)\$row\[\'phone\'\] : \(string\)\$row\[\'email\'\]/', $SRC) === 1,
   'the destination is read from the stored row');
ok(!preg_match('/\$in\[\'(to|number|mobile|dest)\'\]/', $SRC), 'no caller-supplied destination anywhere');
ok(strpos($SRC, 'pl_flow_link_ok($row[\'url\'])') !== false, 'the link is re-checked at send time');
ok(!preg_match('/lg\([^;]*\$tok/', $SRC) && !preg_match("/'token'\s*=>/", $SRC), 'the GoCardless token is never logged or returned');
ok(strpos($SRC, "'mandate_request'") === false, 'this endpoint cannot create a Direct Debit mandate');
ok(strpos($SRC, 'Idempotency-Key') !== false, 'a double-click cannot create two payment requests');

echo "-- it can never become public\n";
$gi = (string)file_get_contents(__DIR__ . '/../.gitignore');
ok(strpos($gi, 'api/pcm-paylink.json') !== false && strpos($gi, 'api/pcm-paylink.log') !== false, 'the store and log are gitignored (the repo is public)');
$ht = (string)file_get_contents(__DIR__ . '/../.htaccess');
ok(strpos($ht, 'pcm-paylink') !== false, 'the store is .htaccess-denied');
$leaks = array();
foreach (glob(__DIR__ . '/../*.html') as $p) if (strpos((string)file_get_contents($p), 'billing/static/flow') !== false) $leaks[] = basename($p);
foreach (array('sitemap.xml', 'llms.txt', 'search-index.json', 'projects-feed.json') as $n) {
    $p = __DIR__ . '/../' . $n;
    if (is_file($p) && strpos((string)file_get_contents($p), 'billing/static/flow') !== false) $leaks[] = $n;
}
ok(!$leaks, 'no single-use payment link anywhere in the built site', implode(', ', $leaks));

echo "\n" . ($fails ? $fails . ' FAILED' : 'all passed') . "\n";
exit($fails ? 1 : 0);
