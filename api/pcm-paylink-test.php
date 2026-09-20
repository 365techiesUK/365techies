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
ok(pl_status_from_br(array('status' => 'cancelled')) === 'cancelled' && pl_status_from_br(array('status' => 'failed')) === 'failed', 'cancelled and failed are different things');
ok(pl_row_state(array('status' => 'failed', 'expires' => $now + 60), $now) === 'failed', 'a failed payment is terminal too');
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

echo "-- phase 2: the webhook signature is the whole trust model\n";
$body = '{"events":[{"id":"EV123","resource_type":"billing_requests","action":"fulfilled","links":{"billing_request":"BRQ1"}}]}';
$secret = 'a-long-webhook-endpoint-secret';
$good = hash_hmac('sha256', $body, $secret);
ok(pl_sig_ok($body, $good, $secret), 'a correctly signed body is accepted');
ok(pl_sig_ok($body, strtoupper($good), $secret), 'upper-case hex is accepted too');
ok(!pl_sig_ok($body . ' ', $good, $secret), 'one extra byte in the body fails');
ok(!pl_sig_ok($body, $good, 'the-wrong-secret'), 'the wrong secret fails');
ok(!pl_sig_ok($body, '', $secret), 'a missing signature header fails');
ok(!pl_sig_ok($body, $good, ''), 'no secret installed = nothing is believed');
ok(!pl_sig_ok($body, 'deadbeef', $secret), 'a short digest fails (and does not warn)');

echo "-- phase 2: which events mean what\n";
ok(pl_event_state('billing_requests', 'fulfilled') === 'paid', 'billing request fulfilled = paid');
ok(pl_event_state('payments', 'confirmed') === 'paid' && pl_event_state('payments', 'paid_out') === 'paid', 'payment confirmed/paid out = paid');
ok(pl_event_state('payments', 'failed') === 'failed' && pl_event_state('payments', 'charged_back') === 'failed', 'failed and charged back = failed');
ok(pl_event_state('billing_requests', 'cancelled') === 'cancelled', 'cancelled');
ok(pl_event_state('billing_requests', 'flow_visited') === '' && pl_event_state('billing_requests', 'bank_authorisation_denied') === '',
   'opening the page, or one refused bank, changes nothing - they can try again');
ok(pl_event_state('mandates', 'active') === '' && pl_event_state('payouts', 'paid') === '' && pl_event_state('whatever', 'new_thing') === '',
   'events about other things, and future event types, are ignored');

echo "-- phase 2: applying an event to the store\n";
$data = array('links' => array(
    array('id' => 'a1', 'job' => 'J1', 'name' => 'Gordon Snook', 'email' => 'g@example.com', 'amount' => 60.0,
          'desc' => 'laptop service', 'br' => 'BRQ1', 'url' => $LIVE_LINK, 'created' => $now - 600, 'expires' => $now + 3600, 'status' => 'open'),
    array('id' => 'b2', 'job' => 'J2', 'name' => 'Someone Else', 'email' => 's@example.com', 'amount' => 30.0,
          'desc' => 'callout', 'br' => 'BRQ2', 'url' => $LIVE_LINK, 'created' => $now - 600, 'expires' => $now + 3600, 'status' => 'open'),
));
$ev = function ($type, $action, $links, $desc = '') {
    return array('id' => 'EV' . substr(md5($type . $action . json_encode($links) . $desc), 0, 8),
                 'resource_type' => $type, 'action' => $action, 'links' => $links, 'details' => array('description' => $desc));
};
$r = pl_event_apply($data, $ev('billing_requests', 'fulfilled', array('billing_request' => 'BRQ1', 'payment' => 'PM9')), $now);
ok($r['matched'] && $r['id'] === 'a1' && $r['change'] === 'paid', 'the right row is marked paid');
ok($r['data']['links'][0]['payment'] === 'PM9', 'the payment id is learned for later events');
ok($r['data']['links'][1]['status'] === 'open', 'the other customer is untouched');
$paid = $r['data'];
ok(strpos(pl_change_text($r['row'], $r['change']), 'Gordon Snook paid £60.00') !== false, 'Slack line names the customer and the amount', pl_change_text($r['row'], $r['change']));

$r2 = pl_event_apply($paid, $ev('billing_requests', 'fulfilled', array('billing_request' => 'BRQ1')), $now);
ok($r2['matched'] && $r2['change'] === '', 'the same event twice says nothing the second time');
$r3 = pl_event_apply($paid, $ev('billing_requests', 'cancelled', array('billing_request' => 'BRQ1')), $now);
ok($r3['change'] === '' && $r3['data']['links'][0]['status'] === 'paid', 'a late cancellation never un-pays a paid row');
$r4 = pl_event_apply($paid, $ev('payments', 'charged_back', array('payment' => 'PM9'), 'Disputed by the payer'), $now);
ok($r4['change'] === 'failed' && $r4['id'] === 'a1', 'a charge-back DOES follow a payment, matched by payment id');
ok(strpos(pl_change_text($r4['row'], 'failed', $r4['why']), 'Disputed by the payer') !== false, 'the reason GoCardless gave is passed on', pl_change_text($r4['row'], 'failed', $r4['why']));
$r5 = pl_event_apply($data, $ev('billing_requests', 'fulfilled', array('billing_request' => 'BRQ-SOMEONE-ELSE')), $now);
ok(!$r5['matched'] && $r5['change'] === '' && $r5['data'] === $data, 'an event about a billing request that is not ours changes nothing');
$r6 = pl_event_apply($data, $ev('billing_requests', 'flow_visited', array('billing_request' => 'BRQ1')), $now);
ok($r6['matched'] && $r6['change'] === '' && $r6['data']['links'][0]['status'] === 'open', 'opening the page is noticed but not recorded');

echo "-- phase 2: a redelivered webhook cannot announce a payment twice\n";
$seen = array();
$seen = pl_seen_add($seen, 'EV1', $now);
ok(pl_seen_has($seen, 'EV1') && !pl_seen_has($seen, 'EV2'), 'seen ids are remembered');
ok(!pl_seen_has($seen, ''), 'an event with no id is never treated as seen');
$big = array();
for ($i = 0; $i < 1205; $i++) $big = pl_seen_add($big, 'E' . $i, $now + $i, 1000);
ok(count($big) <= 1000 && pl_seen_has($big, 'E1204') && !pl_seen_has($big, 'E0'), 'the list is capped, newest kept', (string)count($big));

echo "-- phase 2: the receiver's own guarantees (source level)\n";
$WH = (string)file_get_contents(__DIR__ . '/gocardless-webhook.php');
ok(strpos($WH, '?' . '>') === false, 'no closing tag');
$sigAt = strpos($WH, 'pl_sig_ok('); $jsonAt = strpos($WH, 'json_decode($raw');
ok($sigAt !== false && $jsonAt !== false && $sigAt < $jsonAt, 'the signature is checked BEFORE the body is parsed');
ok(strpos($WH, 'gcw_end(498') !== false, '498 on a bad signature, as GoCardless expects');
ok(strpos($WH, 'gcw_end(503') !== false, 'a missing secret fails closed with a retryable 503');
ok(strpos($WH, 'GCW_MAX_BODY') !== false, 'an oversized body is refused');
ok(strpos($WH, 'pl_seen_has($seen, $id)') !== false, 'redeliveries are skipped by event id');
ok(strpos($WH, 'fastcgi_finish_request') !== false, 'GoCardless is answered before Slack is called');
ok(!preg_match('/\$_(GET|POST)\[/', $WH), 'nothing in the query string or form data can steer it');
ok(strpos($WH, 'preg_match(\'/\\$GC_WEBHOOK_SECRET') !== false, 'the secret is read by pattern, not require()d');
$SW = (string)file_get_contents(__DIR__ . '/pcm-paylink-sweep.php');
ok(strpos($SW, '?' . '>') === false, 'the sweep has no closing tag either');
/* plq_slack() posts to Slack, so a file-wide search for POST proves nothing.
   The claim is about the GoCardless caller specifically. */
$gcFn = substr($SW, strpos($SW, 'function plq_get('));
$gcFn = substr($gcFn, 0, (int)strpos($gcFn, "\nfunction "));
ok(!preg_match('/CURLOPT_POST|CUSTOMREQUEST|CURLOPT_PUT/', $gcFn) && strpos($gcFn, 'api.gocardless.com') !== false,
   'the only GoCardless call in the sweep is a GET - it cannot charge, cancel or create anything');
ok(strpos($SW, 'PLQ_MIN_AGE') !== false && strpos($SW, 'PLQ_RECHECK') !== false && strpos($SW, 'PLQ_MAX_CHECK') !== false,
   'the poll gives the webhook a head start, re-checks slowly, and caps its calls');
$CR = (string)file_get_contents(__DIR__ . '/tm-cron.php');
ok(strpos($CR, 'paylink_sweep()') !== false && strpos($CR, 'paylink_sweep()') < strpos($CR, 'if (!tm_configured())'),
   'the cron runs the poll ABOVE the SMS gate, so it survives an unconfigured SMS account');
ok(strpos($gi, 'api/pcm-paylink-events.json') !== false && strpos($gi, 'api/gocardless-webhook-secret.php') !== false,
   'the event list and the webhook secret are gitignored');
ok(strpos($ht, 'gocardless-webhook-secret') !== false, 'the webhook secret is .htaccess-denied');
/* Don't look for filenames in the .htaccess text - the deny rule is a regex, and
   grouping it (pcm-paylink(-events)?) makes a literal search pass or fail for the
   wrong reasons. Pull the pattern out and run it against real filenames instead:
   that is what Apache will do. */
$deny = '';
if (preg_match('/<FilesMatch "(\^\(pcm-paylink[^"]*)">/', $ht, $mm)) $deny = $mm[1];
ok($deny !== '', 'the pay-link deny rule is there to test', $deny);
foreach (array('pcm-paylink.json', 'pcm-paylink.json.lock', 'pcm-paylink.json.123.tmp', 'pcm-paylink.log',
               'pcm-paylink-events.json', 'pcm-paylink-events.json.9.tmp',
               'pcm-paylink-lib.php', 'pcm-paylink-test.php', 'pcm-paylink-sweep.php') as $f)
    ok($deny !== '' && preg_match('#' . $deny . '#', $f) === 1, 'denied: ' . $f);
foreach (array('pcm-paylink.php', 'gocardless-webhook.php') as $f)
    ok($deny !== '' && preg_match('#' . $deny . '#', $f) !== 1, 'still served (it has to be): ' . $f);

echo "\n" . ($fails ? $fails . ' FAILED' : 'all passed') . "\n";
exit($fails ? 1 : 0);
