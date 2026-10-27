<?php
// pcm-gc-lib.php (GoCardless customer lookup by email) and its three callers - pcm.php's portal plan card,
// pcm-invoice.php's monthly invoice lines and pcm-invite-lib.php's Plans tab - with GoCardless stubbed.
// Nothing leaves this PC (27 Oct 2026).
// CLI only: php api/pcm-gc-test.php   (.htaccess denies it as a URL)
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
$ROOT = isset($argv[1]) ? $argv[1] : dirname(__DIR__);
$tmp = sys_get_temp_dir() . '/gc-test-' . getmypid();
@mkdir($tmp);
define('GCL_DIR', $tmp);
define('GCL_PAGES', 4);            // 4 pages of 2 in the stub: room for the 3 used, and a list that runs past it
define('INV_DIR', $tmp);
require $ROOT . '/api/pcm-gc-lib.php';
require $ROOT . '/api/pcm-invite-lib.php';

$pass = 0; $fail = 0;
function ok($c, $m) { global $pass, $fail; if ($c) { $pass++; } else { $fail++; echo "FAIL: $m\n"; } }
function reset_store() { global $tmp; foreach (glob($tmp . '/*') as $f) @unlink($f); }
function custcalls() { $n = 0; foreach ($GLOBALS['GC']['calls'] as $p) if (strpos($p, '/customers?') === 0) $n++; return $n; }

// ---- the GoCardless stub ------------------------------------------------------------
// Newest customer first, as GoCardless lists them. Two per page so the cursor is followed. An email= filter
// is IGNORED, the worst case for the old code: customers[0] would be the newest customer, a different person.
$GC = array('calls' => array(), 'all' => array(), 'down' => false, 'nokey' => false, 'brokenpage' => '', 'customers' => array(),
            'subscriptions' => array(), 'payments' => array(), 'broken' => array());
function gc_stub($path) {
    $G =& $GLOBALS['GC'];
    $G['calls'][] = $path; $G['all'][] = $path;
    if ($G['down']) return null;
    if (strpos($path, '/customers?') === 0) {
        parse_str(substr($path, 11), $q);
        if ($G['nokey']) return array('meta' => array('cursors' => array('after' => null)));
        if (!empty($q['after']) && $q['after'] === $G['brokenpage']) return null;
        $all = $G['customers']; $start = 0;
        if (!empty($q['after'])) foreach ($all as $i => $c) if ($c['id'] === $q['after']) $start = $i + 1;
        $page = array_slice($all, $start, 2);
        $after = ($start + 2 < count($all) && $page) ? $page[count($page) - 1]['id'] : null;
        return array('customers' => $page, 'meta' => array('cursors' => array('after' => $after, 'before' => null), 'limit' => 2));
    }
    foreach (array('subscriptions', 'payments') as $kind) {
        if (strpos($path, '/' . $kind . '?') === 0) {
            parse_str(substr($path, strlen($kind) + 2), $q);
            $cid = isset($q['customer']) ? $q['customer'] : '';
            if (isset($G['broken'][$kind][$cid])) return null;
            $rows = isset($G[$kind][$cid]) ? $G[$kind][$cid] : array();
            if ($kind === 'subscriptions' && isset($q['status'])) $rows = array_values(array_filter($rows, function ($s) use ($q) { return $s['status'] === $q['status']; }));
            if (isset($q['limit'])) $rows = array_slice($rows, 0, (int)$q['limit']);
            return array($kind => $rows, 'meta' => array('cursors' => array('after' => null, 'before' => null)));
        }
    }
    return null;
}
function gc_get($path) { return gc_stub($path); }   // pcm-invoice.php's GET, for its gc_lines() below

function sub($amount, $name, $next, $status = 'active') {
    return array('amount' => $amount, 'name' => $name, 'status' => $status, 'upcoming_payments' => ($next !== '' ? array(array('charge_date' => $next, 'amount' => $amount)) : array()));
}
$GC['customers'] = array(
    array('id' => 'CU9', 'email' => 'newest@example.com'),        // the newest: what an ignored ?email= hands everyone
    array('id' => 'CU4', 'email' => 'megan@example.co.uk'),       // her second record, made when she used a new link
    array('id' => 'CU5', 'email' => 'x@example.com'),             // a customer with no plan
    array('id' => 'CU3', 'email' => null),
    array('id' => 'CU2', 'email' => 'paid@example.com'),
    array('id' => 'CU1', 'email' => 'Megan@Example.co.uk'));      // her first record
$GC['subscriptions'] = array(
    'CU9' => array(sub(3000, 'Someone Else Business 1 PC', '2026-11-03')),
    'CU1' => array(sub(1825, 'Home 1 PC', '2026-11-15'), sub(1825, 'Home 1 PC (old)', '', 'cancelled')),
    'CU4' => array(sub(2438, 'Business 1 PC', '2026-11-28')),
    'CU2' => array(sub(1999, 'Home 1 PC + 365', '2026-11-20'), sub(0, 'Free month', '2026-11-01')));
$GC['payments'] = array(
    'CU1' => array(array('created_at' => '2026-09-01T09:00:00.000Z', 'charge_date' => '2026-09-05', 'amount' => 1825, 'status' => 'paid_out')),
    'CU4' => array(array('created_at' => '2026-10-20T09:00:00.000Z', 'charge_date' => '2026-10-28', 'amount' => 2438, 'status' => 'confirmed')),
    'CU9' => array(array('created_at' => '2026-10-26T09:00:00.000Z', 'charge_date' => '2026-11-03', 'amount' => 3000, 'status' => 'pending_submission')));
$megan = ' MEGAN@example.co.uk ';

// ---- 1. the customer index: paged, case-insensitive, hashed, every record ----------------
reset_store(); $GC['calls'] = array();
$idx = gcl_index('gc_stub');
ok(custcalls() === 3, 'followed the cursor over 3 pages (' . custcalls() . ')');
ok(count($GC['calls']) === 3 && strpos($GC['calls'][0], '/customers?limit=500') === 0, 'asks for pages of 500');
ok(gcl_ids($idx, $megan) === array('CU4', 'CU1'), 'both of her customer records found, whatever the case and spaces');
ok(gcl_ids($idx, 'paid@example.com') === array('CU2'), 'one record, one id');
ok(gcl_ids($idx, 'stranger@example.com') === array() && gcl_ids($idx, '') === array() && gcl_ids(null, $megan) === array(), 'an unknown or blank email finds nobody');
$raw = (string)file_get_contents($tmp . '/pcm-gc-custidx.json');
ok($raw !== '' && strpos($raw, '@') === false, 'no plain email address in the index file');
$GC['calls'] = array(); gcl_index('gc_stub');
ok(count($GC['calls']) === 0, 'index served from its 10-minute cache');
$GC['calls'] = array(); gcl_index('gc_stub', true);
ok(custcalls() === 3, 'fresh = read the list again');

$GC['down'] = true;
$i2 = gcl_index('gc_stub', true);
ok(is_array($i2) && gcl_ids($i2, 'paid@example.com') === array('CU2'), 'a GoCardless blip serves the last good index by default');
ok(gcl_index('gc_stub', true, false) === null, '... but not when the caller asks for a fresh one only (the invoice run)');
$GC['down'] = false;

$GC['nokey'] = true;
ok(gcl_index('gc_stub', true, false) === null, 'a reply with no customers list is a failed read, not an empty one');
$GC['nokey'] = false;

$before = (string)file_get_contents($tmp . '/pcm-gc-custidx.json');
$GC['brokenpage'] = 'CU4';
ok(gcl_index('gc_stub', true, false) === null, 'a page failing part-way is a failed read');
ok((string)file_get_contents($tmp . '/pcm-gc-custidx.json') === $before, '... and the half-read list is never cached');
$GC['brokenpage'] = '';

$keep = $GC['customers'];
for ($n = 10; $n <= 13; $n++) $GC['customers'][] = array('id' => 'CU' . $n, 'email' => 'later' . $n . '@example.com');
ok(gcl_index('gc_stub', true, false) === null, 'a list longer than GCL_PAGES pages is a failed read, never a partial index');
ok((string)file_get_contents($tmp . '/pcm-gc-custidx.json') === $before, '... and is not cached either');
$GC['customers'] = $keep;
$idx = gcl_index('gc_stub', true);

// ---- 2. the monthly invoice lines ------------------------------------------------------
$GC['calls'] = array();
$l = gcl_lines('gc_stub', gcl_ids($idx, $megan));
ok(is_array($l) && count($l) === 2, 'an active plan on each of her two records = two lines (' . count((array)$l) . ')');
$tot = 0.0; $names = array(); foreach ((array)$l as $x) { $tot += $x['amount']; $names[] = $x['name']; }
ok(round($tot, 2) === 42.63 && $names === array('Business 1 PC', 'Home 1 PC'), 'her lines: £24.38 + £18.25, the cancelled plan left out');
ok(count($GC['calls']) === 2 && strpos($GC['calls'][0], 'status=active') !== false, 'one GET of active plans per record');
$l = gcl_lines('gc_stub', gcl_ids($idx, 'paid@example.com'));
ok($l === array(array('name' => 'Home 1 PC + 365', 'amount' => 19.99)), 'pence to pounds, and a £0 plan is left out');
ok(gcl_lines('gc_stub', gcl_ids($idx, 'x@example.com')) === array(), 'a customer with no plan has no lines');
ok(gcl_lines('gc_stub', array()) === array(), 'nobody = no lines');
$GC['broken']['subscriptions']['CU1'] = true;
ok(gcl_lines('gc_stub', gcl_ids($idx, $megan)) === null, 'one record unreadable = a transport failure, never a short invoice');
unset($GC['broken']['subscriptions']['CU1']);

// ---- 3. the portal's plan card --------------------------------------------------------
$s = gcl_summary('gc_stub', gcl_ids($idx, $megan));
ok($s['active'] === true && $s['amount'] === 42.63 && $s['name'] === 'Support plans (2 Direct Debits)', 'both records added up on the card');
ok($s['nextchg'] === '2026-11-15', 'next collection = the earliest across her plans');
ok($s['lastamt'] === 24.38 && $s['lastdate'] === '2026-10-28' && $s['laststatus'] === 'confirmed', 'last payment = the newest on any record');
$s = gcl_summary('gc_stub', gcl_ids($idx, 'x@example.com'));
ok($s['active'] === false && $s['amount'] === 0.0 && $s['name'] === '' && $s['lastdate'] === '', 'a customer with no plan: an honest "no active Direct Debit"');
ok(gcl_summary('gc_stub', array()) === null, 'nobody = null (the card says nothing)');
$GC['broken']['subscriptions']['CU4'] = true;
ok(gcl_summary('gc_stub', gcl_ids($idx, $megan)) === false, 'a plan read failing = false, so the caller does not cache it');
unset($GC['broken']['subscriptions']['CU4']);
$GC['broken']['payments']['CU4'] = true;
$s = gcl_summary('gc_stub', gcl_ids($idx, $megan));
ok($s['amount'] === 42.63 && $s['lastdate'] === '2026-09-05', 'a payments read failing still shows the plans (as before)');
unset($GC['broken']['payments']['CU4']);

// ---- 4. the bug itself: never somebody else's plan ---------------------------------------
$s = gcl_summary('gc_stub', gcl_ids($idx, 'stranger@example.com'));
$l = gcl_lines('gc_stub', gcl_ids($idx, 'stranger@example.com'));
ok($s === null && $l === array(), 'an email GoCardless does not know gets nothing - not the newest customer\'s £30 plan');

// ---- 5. pcm-invoice.php gc_lines(): the real function, against the stub ------------------
$src = (string)file_get_contents($ROOT . '/api/pcm-invoice.php');
ok(preg_match('/\nfunction gc_lines\(\$email\)\{.*?\n\}/s', $src, $fm) === 1, 'found gc_lines() in pcm-invoice.php');
eval($fm[0]);
// a fresh-looking cache that is WRONG: the run must not trust it
file_put_contents($tmp . '/pcm-gc-custidx.json', json_encode(array('at' => time(), 'idx' => array(gcl_ek($megan) => array('CU9')))));
$GC_IDX = null; $GC['calls'] = array();
$l = gc_lines($megan);
ok(is_array($l) && count($l) === 2 && $l[0]['amount'] === 24.38, 'the run reads the customer list fresh, never the cache');
ok(custcalls() === 3, 'one paged read of the list (' . custcalls() . ' pages)');
$GC['calls'] = array();
ok(gc_lines('paid@example.com') === array(array('name' => 'Home 1 PC + 365', 'amount' => 19.99)), 'the next customer in the run');
ok(custcalls() === 0, '... uses the same list: read once per run');
ok(gc_lines('stranger@example.com') === array() && gc_lines('x@example.com') === array(), 'not on GoCardless / no plan = nothing to invoice');
$GC_IDX = null; $GC['down'] = true; $GC['calls'] = array();
ok(gc_lines($megan) === null && gc_lines('paid@example.com') === null, 'list unreadable = every customer is a transport failure, even with a cached copy');
ok(custcalls() === 1, '... after one try, not one per customer (' . custcalls() . ')');
$GC['down'] = false; $GC_IDX = null;
ok(strpos($src, '$lines = gc_lines($email);') !== false && strpos($src, 'if ($lines === null) { $errors++;') !== false, 'the run still skips and counts a transport failure');

// ---- 6. pcm.php pcm_gc_summary(): the real function, files in the temp dir ----------------
$src = (string)file_get_contents($ROOT . '/api/pcm.php');
ok(preg_match('/\nfunction pcm_gc_summary\(.*?\n\}/s', $src, $fm) === 1, 'found pcm_gc_summary() in pcm.php');
$fn = str_replace(array("__DIR__ . '/pcm-gocardless.php'", "__DIR__ . '/pcm-gc-cache.json'", "__DIR__ . '/pcm-gc-lib.php'"),
                  array(var_export($tmp . '/pcm-gocardless.php', true), var_export($tmp . '/pcm-gc-cache.json', true), var_export(realpath($ROOT . '/api/pcm-gc-lib.php'), true)), $fm[0]);
ok(strpos($fn, '__DIR__') === false, 'every file it touches pointed at the temp dir');
eval($fn);
reset_store(); $GC['calls'] = array();
ok(pcm_gc_summary('megan@example.co.uk', 'gc_stub') === null && count($GC['calls']) === 0, 'no token file = no card, no calls');
file_put_contents($tmp . '/pcm-gocardless.php', '<?php $GC_TOKEN = \'test-not-a-token\';');
$GC['calls'] = array();
$s = pcm_gc_summary('Megan@Example.co.uk', 'gc_stub');
ok(is_array($s) && $s['amount'] === 42.63 && $s['name'] === 'Support plans (2 Direct Debits)', 'her card shows her two plans');
$ck = json_decode((string)file_get_contents($tmp . '/pcm-gc-cache.json'), true);
ok(isset($ck[sha1('megan@example.co.uk')]['data']['amount']), 'cached under sha1(email), as before');
ok(strpos((string)file_get_contents($tmp . '/pcm-gc-cache.json'), '@') === false, 'no plain email address in the card cache');
$GC['calls'] = array();
ok(pcm_gc_summary('Megan@Example.co.uk', 'gc_stub') === $s && count($GC['calls']) === 0, 'the card is served from its cache');
$s = pcm_gc_summary('stranger@example.com', 'gc_stub');
ok($s === null, 'a customer GoCardless does not know: no card - never the newest customer\'s plan');
@unlink($tmp . '/pcm-gc-custidx.json');
$GC['down'] = true;
ok(pcm_gc_summary('paid@example.com', 'gc_stub') === null, 'GoCardless down and no index: no card');
$GC['down'] = false;
$ck = json_decode((string)file_get_contents($tmp . '/pcm-gc-cache.json'), true);
ok(!array_key_exists(sha1('paid@example.com'), $ck), '... and nothing cached, so it is asked again next time');
$GC['broken']['subscriptions']['CU2'] = true;
ok(pcm_gc_summary('paid@example.com', 'gc_stub') === null, 'a plan read failing: no card');
$ck = json_decode((string)file_get_contents($tmp . '/pcm-gc-cache.json'), true);
ok(!array_key_exists(sha1('paid@example.com'), $ck), '... and not cached');
unset($GC['broken']['subscriptions']['CU2']);

// ---- 7. the Plans tab uses the same index -------------------------------------------------
ok(inv_ek(' A@B.com ') === sha1('a@b.com') && inv_ek('x@example.com') === gcl_ek('x@example.com'), 'inv_ek is the same sha1(email) as before');
$GC['calls'] = array();
ok(inv_gc_index('gc_stub', true) === gcl_index('gc_stub') && custcalls() === 3, 'inv_gc_index reads through the shared index (and its cache)');

// ---- 8. read-only, wired in, and never served --------------------------------------------
$bad = 0; foreach ($GC['all'] as $p) if (!preg_match('#^/(customers|subscriptions|payments)\?#', $p)) $bad++;
ok($bad === 0 && count($GC['all']) > 30, 'only ever asks GoCardless to list customers, plans and payments (' . count($GC['all']) . ' calls)');
$email = 0; foreach ($GC['all'] as $p) if (stripos($p, 'email') !== false) $email++;
ok($email === 0, 'never sends GoCardless an email filter');
$lib = (string)file_get_contents($ROOT . '/api/pcm-gc-lib.php');
ok(strpos($lib, 'curl_') === false, 'the library makes no requests of its own (all through the GET callable)');
ok(preg_match('/^\$/m', $lib) === 0, 'no top-level variables in the library, so including it inside a function is safe');
$left = array();
foreach (glob($ROOT . '/api/*.php') as $f) if (preg_match('/customers\?email/i', (string)file_get_contents($f)) && basename($f) !== 'pcm-gc-test.php') $left[] = basename($f);
ok(!$left, 'no file in api/ asks GoCardless for /customers?email= (' . implode(', ', $left) . ')');
foreach (array('pcm.php', 'pcm-invoice.php', 'pcm-invite-lib.php') as $f) ok(strpos((string)file_get_contents($ROOT . '/api/' . $f), "/pcm-gc-lib.php'") !== false, $f . ' uses the shared lookup');
$ht = (string)file_get_contents($ROOT . '/.htaccess');
foreach (array('pcm-gc-lib.php', 'pcm-gc-test.php', 'pcm-gc-custidx.json', 'pcm-gc-custidx.json.123.tmp', 'pcm-gc-cache.json') as $f) {
    $den = false;
    if (preg_match_all('/<FilesMatch "([^"]+)">\s*Require all denied/', $ht, $mm)) foreach ($mm[1] as $re) if (preg_match('#' . $re . '#', $f)) $den = true;
    if (preg_match_all('/<Files "([^"]+)">\s*Require all denied/', $ht, $mm)) foreach ($mm[1] as $n) if ($n === $f) $den = true;
    ok($den, $f . ' is denied over HTTP');
}
$gi = (string)file_get_contents($ROOT . '/.gitignore');
foreach (array('api/pcm-gc-custidx.json', 'api/pcm-gc-cache.json') as $f) ok(strpos($gi, $f) !== false, $f . ' is gitignored');

reset_store(); @rmdir($tmp);
echo "pcm-gc-lib: $pass passed, $fail failed\n";
exit($fail ? 1 : 0);
