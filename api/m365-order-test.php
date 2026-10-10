<?php
/*
 * Microsoft 365 orders from the website (m365-order.php / m365-order-lib.php, 9 Oct 2026). CLI only:
 *   C:\tools\php\php.exe -d extension=mbstring api/m365-order-test.php
 * Pure checks plus the store in a temp folder: GoCardless, Pax8 and Slack are never called. (The whole flow over HTTP,
 * against fake GoCardless and Pax8 servers, and the page and the portal card in a browser, are the scratchpad
 * m365order/run.py and ui.cjs end-to-end tests of 9 Oct 2026.)
 */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
error_reporting(E_ALL);
$TMP = sys_get_temp_dir() . '/m365test-' . getmypid();
@mkdir($TMP);
define('M365_DIR', $TMP);   // the store, its log and the (absent) keys live here, never in api/
require __DIR__ . '/m365-order-lib.php';
require __DIR__ . '/comms-lib.php';
$fails = 0;
function check($ok, $what, $detail = '') { global $fails; echo ($ok ? "  PASS  " : "  FAIL  ") . $what . ($ok ? '' : "  [" . $detail . "]") . "\n"; if (!$ok) $fails++; }

$PLANS = m365_plans();
echo "A  the plans the server sells (written by the build from software_offers.py)\n";
check(isset($PLANS['m365-basic'], $PLANS['m365-standard'], $PLANS['m365-premium'], $PLANS['exchange'], $PLANS['defender']), 'the five Microsoft products', implode(',', array_keys($PLANS)));
check($PLANS['m365-basic']['price'] === '6.50' && $PLANS['m365-standard']['price'] === '12.50' && $PLANS['m365-premium']['price'] === '19.75' && $PLANS['exchange']['price'] === '3.75', 'at the approved prices');
$py = (string)file_get_contents(__DIR__ . '/../software_offers.py');
foreach ($PLANS as $k => $p) {
    check(preg_match('/^[0-9a-f-]{36}$/', $p['pax8']) && preg_match('/^[0-9a-f-]{36}$/', $p['commit']) && strpos($py, $p['pax8']) !== false && strpos($py, $p['commit']) !== false, $k . ': its Pax8 product and 1-year term ids come from software_offers.py');
    check(strpos($py, 'price="' . $p['price'] . '"') !== false, $k . ': its price is software_offers.py\'s');
}

echo "B  checking what people type\n";
$good = array('plan' => 'm365-basic', 'qty' => '5', 'biz' => ' Smith  Builders Ltd ', 'crn' => '0123 4567', 'street' => '1 High St', 'street2' => '',
    'city' => 'Bournemouth', 'postcode' => 'bh1 2ab', 'domain' => 'https://www.Smith-Builders.co.uk/contact', 'email_now' => 'host', 'now_with' => 'GoDaddy',
    'first' => 'Jane', 'last' => 'Smith', 'email' => 'Jane@Smith-Builders.co.uk', 'phone' => '+44 (0)1202 775566', 'notes' => '',
    'signatory' => true, 'mca' => true, 'term' => true, 'terms' => true);
$v = m365_validate($good, $PLANS);
check($v['ok'], 'a complete order is accepted', json_encode($v['errors']));
$f = $v['f'];
check($f['biz'] === 'Smith Builders Ltd' && $f['postcode'] === 'BH1 2AB' && $f['crn'] === '01234567', 'tidied: spaces, the postcode, the company number', json_encode($f));
check($f['domain'] === 'smith-builders.co.uk' && $f['email'] === 'jane@smith-builders.co.uk' && $f['phone'] === '01202 775566', 'tidied: the domain from a web address, the email, a UK phone', json_encode($f));
check(m365_domain('jane@acme.co.uk') === 'acme.co.uk' && m365_domain('') === '' && m365_domain('not a domain') === false && m365_domain('acme') === false, 'a domain from an email address; empty is fine; rubbish is refused');
check(m365_postcode('BFPO 123') === 'BFPO 123' && m365_postcode('sw1a1aa') === 'SW1A 1AA', 'odd postcodes kept as typed, never refused; UK ones tidied');
check(m365_phone('07700 900123') === '07700 900123' && m365_phone('+1 415 555 0100') === '+1 415 555 0100' && m365_phone('12') === false, 'any phone with enough digits; a UK one tidied');
foreach (array('plan' => 'm365-gold', 'qty' => '0', 'email' => 'not-an-email', 'email_now' => 'carrier pigeon', 'crn' => 'ABC', 'domain' => 'x y z') as $k => $bad) {
    $b = $good; $b[$k] = $bad;
    $r = m365_validate($b, $PLANS);
    check(!$r['ok'] && isset($r['errors'][$k]), 'refused: ' . $k . ' = "' . $bad . '"', json_encode($r['errors']));
}
$b = $good; $b['qty'] = '301'; check(isset(m365_validate($b, $PLANS)['errors']['qty']), 'more than 300 people is refused (Microsoft\'s limit for these plans)');
$b = $good; $b['qty'] = '2.5'; check(isset(m365_validate($b, $PLANS)['errors']['qty']), 'half a person is refused');
foreach (array('biz', 'street', 'city', 'postcode', 'first', 'last', 'phone') as $k) {
    $b = $good; $b[$k] = '  ';
    check(isset(m365_validate($b, $PLANS)['errors'][$k]), $k . ' is required');
}
foreach (array('signatory', 'mca', 'term', 'terms') as $k) {
    $b = $good; unset($b[$k]); check(m365_validate($b, $PLANS)['errors'][$k] === 'agree', 'not ticked: ' . $k);
    $b = $good; $b[$k] = 'no'; check(isset(m365_validate($b, $PLANS)['errors'][$k]), 'a word that is not a tick: ' . $k);
}
$b = $good; $b['notes'] = str_repeat('x', 1001); check(m365_validate($b, $PLANS)['errors']['notes'] === 'long', 'a very long message is refused, not cut');
$b = $good; $b['crn'] = ''; $b['domain'] = ''; $b['street2'] = ''; $b['now_with'] = '';
check(m365_validate($b, $PLANS)['ok'], 'company number, domain, address line 2 and "who with" are optional');
check(m365_prefix('smith-builders.co.uk', 'x') === 'smithbuilders' && m365_prefix('', 'The Café & Bar Ltd') === 'thecafbar' && m365_prefix('', 'AB') === '', 'the .onmicrosoft.com name: from the domain, else the business name, letters and digits only');
check(m365_prefix_ok('smithbuilders') && !m365_prefix_ok('smith-builders') && !m365_prefix_ok('ab'), 'a name staff type is checked the same way');

echo "C  an order row, and what each side may see\n";
$key = str_repeat('ab', 16);
$row = m365_new_row($f, $PLANS, $key, '203.0.113.9', "Mozilla/5.0\x01 test", 1791000000);
check(preg_match('/^[a-f0-9]{10}$/', $row['id']) && $row['kh'] === hash('sha256', $key) && !isset($row['key']), 'an id, and only the HASH of the customer\'s secret');
check($row['each'] === 650 && $row['monthly'] === 3250 && m365_money($row['monthly']) === '£32.50', '5 x £6.50 = £32.50 a month, kept in pence');
check($row['agreed']['at'] === 1791000000 && $row['agreed']['ip'] === '203.0.113.9' && strpos($row['agreed']['ua'], "\x01") === false, 'the agreement: when, from where, the browser (control characters dropped)');
check($row['prefix'] === 'smithbuilders' && m365_state($row) === 'waiting', 'a suggested Microsoft account name; it starts waiting');
check(m365_key_ok($row, $key) && !m365_key_ok($row, str_repeat('cd', 16)) && !m365_key_ok($row, ''), 'only the right secret opens it');
$pub = m365_public($row);
check(!isset($pub['person']) && !isset($pub['biz']['street']) && $pub['biz'] === 'Smith Builders Ltd' && $pub['monthly'] === '£32.50', 'the customer\'s view: no address, no history', json_encode($pub));
$row2 = $row; $row2['dd'] = array('state' => 'waiting', 'url' => 'https://pay.gocardless.com/billing/static/flow?id=BRF1', 'br' => 'BR1');
$st = m365_staff($row2);
check(!isset($st['kh']) && !isset($st['dd']['url']) && $st['dd']['br'] === 'BR1' && $st['monthly_txt'] === '£32.50', 'staff: everything but the secret\'s hash and the customer\'s own Direct Debit page');

echo "D  where an order is\n";
$r = $row; $r['dd']['state'] = 'ready'; check(m365_state($r) === 'ready', 'Direct Debit set up -> ready to order');
$r['pax8']['state'] = 'ordered'; check(m365_state($r) === 'ordered', 'ordered in Pax8 -> ordered');
$r['pay']['state'] = 'started'; check(m365_state($r) === 'done', 'and payments started -> done');
$r['cancelled'] = 1; check(m365_state($r) === 'cancelled', 'cancelled wins');
$r = $row; $r['pax8']['state'] = 'failed'; $r['dd']['state'] = 'ready'; check(m365_state($r) === 'ready', 'a Pax8 attempt that stopped is still ready to try again');

echo "E  the Slack card, read by the inbox and the lead reminders\n";
$row['dd'] = array('state' => 'waiting');
$row['notes'] = "Ring after 2pm\nplease";
$c = m365_card($row, 1791000000);
check($c['text'] === 'Microsoft 365 order from Jane Smith (Smith Builders Ltd)', 'the first line', $c['text']);
$all = json_encode($c, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
check(strpos($all, 'https://365techies.co.uk/portal/#m365order=' . $row['id']) !== false && strpos($all, '£32.50') !== false && strpos($all, '5 x Microsoft 365 Business Basic') !== false, 'it links to the order in the portal, with what and how much');
$m = array('ts' => '1791000000.000100', 'bot_id' => 'B1', 'text' => $c['text'], 'blocks' => $c['blocks']);
$L = lc_lead($m);
check(is_array($L) && $L['kind'] === 'web' && $L['label'] === 'Microsoft 365 order' && $L['who'] === 'Jane Smith', 'lc_lead: a "Microsoft 365 order" lead', json_encode($L));
check(lc_lead(array('ts' => '1', 'text' => $c['text'])) === null, 'a person typing the same words is not a lead');
$P = comms_lead_from_post($m);
check(is_array($P) && $P['name'] === 'Jane Smith' && $P['email'] === 'jane@smith-builders.co.uk' && $P['company'] === 'Smith Builders Ltd' && $P['phone'] === '01202 775566', 'the inbox item: name, email, company, phone', json_encode($P));
check(strpos($P['topic'], 'Microsoft 365 order: 5 x Microsoft 365 Business Basic') === 0 && strpos($P['body'], '#m365order=' . $row['id']) !== false && strpos($P['body'], 'Ring after 2pm') !== false && $P['page'] === '/order-microsoft-365/', 'the inbox item: what they ordered, their message and the order link', json_encode($P));
$ex = $row; $ex['email_now'] = 'microsoft';
check(strpos(json_encode(m365_card($ex)), 'GDAP') !== false, 'someone already on Microsoft 365: the card says Pax8 must take it over (GDAP), by hand');

echo "F  what Pax8 is asked\n";
// the questions exactly as Pax8 sent them for Business Basic on 9 Oct 2026 (GET /products/{id}/provision-details)
$Q = array(
    array('key' => 'msCustExists', 'valueType' => 'Single-Value', 'possibleValues' => array('No, the customer does not have a Microsoft account', 'Yes, the customer has and can log into their Microsoft account')),
    array('key' => 'msDomain'), array('key' => 'msMPNidval', 'valueType' => 'Input'), array('key' => 'msTenantId', 'valueType' => 'Input'),
    array('key' => 'mca2020FirstName', 'valueType' => 'Input'), array('key' => 'mca2020LastName', 'valueType' => 'Input'), array('key' => 'mca2020Email', 'valueType' => 'Input'),
    array('key' => 'msftContactFirstName', 'valueType' => 'Input'), array('key' => 'msftContactLastName', 'valueType' => 'Input'), array('key' => 'msftContactEmail', 'valueType' => 'Input'),
    array('key' => 'companyRegistrationNumber', 'valueType' => 'Input'),
    array('key' => 'microsoftCancelPolicyAcknowledgement', 'valueType' => 'Single-Value', 'possibleValues' => array('I understand, and acknowledge that I will have a 7 calendar day window ...')),
    array('key' => 'microsoftGDAPDirect', 'possibleValues' => array('<p>For the most effective support ...</p>')),
    array('key' => 'somethingNewNextYear', 'valueType' => 'Input'));
$A = array(); foreach (m365_pax8_answers($row, 'smithbuilders', $Q) as $a) $A[$a['key']] = $a['values'];
check($A['msCustExists'] === array('No, the customer does not have a Microsoft account'), 'a NEW Microsoft account (their exact wording)');
check($A['msDomain'] === array('smithbuilders') && $A['msMPNidval'] === array('5190646'), 'our Microsoft account name and our Location MPN ID 5190646');
check($A['mca2020FirstName'] === array('Jane') && $A['mca2020Email'] === array('jane@smith-builders.co.uk') && $A['msftContactLastName'] === array('Smith'), 'the person who agreed signs Microsoft\'s agreement and is Microsoft\'s contact');
check($A['companyRegistrationNumber'] === array('01234567') && strpos($A['microsoftCancelPolicyAcknowledgement'][0], '7 calendar day') !== false, 'the company number; the 7-day window acknowledged (they agreed to it on our page)');
check(!isset($A['msTenantId']) && !isset($A['microsoftGDAPDirect']) && !isset($A['somethingNewNextYear']), 'nothing invented: no tenant id, the GDAP note and an unknown question are left for Pax8\'s check to raise');
$nr = $row; $nr['biz']['crn'] = '';
$A2 = array(); foreach (m365_pax8_answers($nr, 'x1x', $Q) as $a) $A2[$a['key']] = 1;
check(!isset($A2['companyRegistrationNumber']), 'no company number: the question is left out, not sent empty');
$ob = m365_pax8_order_body($row, $PLANS['m365-basic'], 'co-1', m365_pax8_answers($row, 'smithbuilders', $Q));
$li = $ob['lineItems'][0];
check($ob['companyId'] === 'co-1' && $li['productId'] === $PLANS['m365-basic']['pax8'] && $li['commitmentTermId'] === $PLANS['m365-basic']['commit'] && $li['quantity'] === 5 && $li['billingTerm'] === 'Monthly', 'the order: our product, 5 of them, the 1-year term billed monthly');
$cb = m365_pax8_company_body($row);
check($cb['address']['country'] === 'GB' && $cb['address']['postalCode'] === 'BH1 2AB' && $cb['billOnBehalfOfEnabled'] === false && $cb['contacts'][0]['email'] === 'jane@smith-builders.co.uk' && $cb['website'] === 'smith-builders.co.uk', 'the company: UK address, we are billed (not them), a contact so it is Active at once');
check(m365_pax8_why(array('message' => 'Validation failed', 'details' => array('msDomain is taken', array('field' => 'quantity', 'message' => 'too many')))) === 'Validation failed; msDomain is taken; quantity too many', 'Pax8\'s reasons are passed on to the person pressing the button');

echo "G  the store\n";
$s = m365_store_locked(function ($d) use ($row) { $d['orders'][] = $row; return array('ok' => true, 'data' => $d); });
check(!empty($s['ok']) && m365_find($row['id'])['biz']['name'] === 'Smith Builders Ltd', 'saved and found again');
$u = m365_update($row['id'], function (&$r) { $r['dd']['state'] = 'ready'; m365_add_log($r, 'test', 'Direct Debit set up', 1791000100); return ''; });
check(!empty($u['ok']) && m365_find($row['id'])['dd']['state'] === 'ready' && end(m365_find($row['id'])['log'])['what'] === 'Direct Debit set up', 'changed under the lock, with its history');
$u2 = m365_update($row['id'], function (&$r) { $r['dd']['state'] = 'broken'; return 'nope'; });
check(empty($u2['ok']) && $u2['error'] === 'nope' && m365_find($row['id'])['dd']['state'] === 'ready', 'a refused change leaves it as it was');
check(m365_update('ffffffffff', function (&$r) { return ''; })['error'] === 'unknown_order', 'an unknown order');
check(m365_event_match(array('links' => array('billing_request' => 'BRnotours'))) === '' && m365_event_match(array('links' => array())) === '', 'a GoCardless event about someone else\'s billing request matches nothing');
m365_update($row['id'], function (&$r) { $r['dd']['br'] = 'BR123'; $r['dd']['mandate'] = 'MD9'; return ''; });
check(m365_event_match(array('links' => array('billing_request' => 'BR123'))) === $row['id'] && m365_event_match(array('links' => array('mandate' => 'MD9'))) === $row['id'], '...and one about ours finds the order (by billing request or mandate)');
check(m365_gc_token() === '' && m365_pax8_creds() === null, 'no keys in the test folder: GoCardless and Pax8 are "not connected", never called');
$w = $row; list($okDd, $url, $why) = m365_dd_start($w, $key);
check(!$okDd && $why === 'no_gocardless' && $w['dd']['state'] === 'failed', 'with no GoCardless token the order is kept and the Direct Debit marked not set up');
check(m365_flow_ok('https://pay.gocardless.com/billing/static/flow?id=BRF000123') && !m365_flow_ok('https://evil.example/flow?id=BRF1') && !m365_flow_ok('https://pay.gocardless.com/billing/static/flow?id=BRF1" onclick=x'), 'only GoCardless\'s own page is ever handed to a browser');

echo "H  never a URL, never in git\n";
$HT = (string)file_get_contents(__DIR__ . '/../.htaccess');
foreach (array('m365-orders.json', 'm365-orders.json.lock', 'm365-orders.log', 'm365-order-lib.php', 'm365-order-plans.php', 'm365-order-test.php', 'pax8-key.php', 'pax8-token.json') as $fn) {
    $hit = false;
    if (preg_match_all('/<FilesMatch "([^"]+)">\s*Require all denied/', $HT, $mm)) foreach ($mm[1] as $re) if (@preg_match('~' . $re . '~', $fn)) $hit = true;
    check($hit, $fn . ' is denied over HTTP');
}
check(!preg_match('~m365-order\.php~', implode(' ', $mm[1])) || !preg_match('~^\^?\(?m365-order\.php~', implode(' ', $mm[1])), 'm365-order.php itself stays a URL');
$GI = (string)file_get_contents(__DIR__ . '/../.gitignore');
foreach (array('api/m365-orders.json', 'api/m365-orders.log', 'api/pax8-key.php', 'api/pax8-token.json') as $g) check(strpos($GI, $g) !== false, $g . ' is gitignored');
check(strpos($GI, 'm365-order-plans') === false, 'the plans file is NOT ignored (the server needs it; it holds no secret)');

foreach ((array)glob($TMP . '/*') as $x) @unlink($x);
@rmdir($TMP);
echo $fails ? "\n$fails FAILED\n" : "\nall passed\n";
exit($fails ? 1 : 0);
