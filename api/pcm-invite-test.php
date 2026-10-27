<?php
// pcm-invite-lib.php (the Plans tab: who we invited, and where each has got to on GoCardless) with
// GoCardless stubbed - nothing leaves this PC (27 Oct 2026).
// CLI only: php api/pcm-invite-test.php   (.htaccess denies it as a URL)
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
$ROOT = isset($argv[1]) ? $argv[1] : dirname(__DIR__);
$tmp = sys_get_temp_dir() . '/invite-test-' . getmypid();
@mkdir($tmp);
define('INV_DIR', $tmp);
require $ROOT . '/api/pcm-invite-lib.php';

$pass = 0; $fail = 0;
function ok($c, $m) { global $pass, $fail; if ($c) { $pass++; } else { $fail++; echo "FAIL: $m\n"; } }
function reset_store() { global $tmp; foreach (glob($tmp . '/*') as $f) @unlink($f); }

// ---- the GoCardless stub: canned pages, and every path asked for ----------------
$GC = array('calls' => array(), 'down' => false, 'customers' => array(), 'mandates' => array(), 'subscriptions' => array(), 'payments' => array());
function gc_stub($path) {
    $G =& $GLOBALS['GC'];
    $G['calls'][] = $path;
    if ($G['down']) return null;
    if (strpos($path, '/customers?') === 0) {
        // two pages of 2 so the cursor is followed
        parse_str(substr($path, 11), $q);
        $all = $G['customers']; $start = 0;
        if (!empty($q['after'])) foreach ($all as $i => $c) if ($c['id'] === $q['after']) $start = $i + 1;
        $page = array_slice($all, $start, 2);
        $after = ($start + 2 < count($all) && $page) ? $page[count($page) - 1]['id'] : null;
        return array('customers' => $page, 'meta' => array('cursors' => array('after' => $after, 'before' => null), 'limit' => 2));
    }
    foreach (array('mandates', 'subscriptions', 'payments') as $kind) {
        if (strpos($path, '/' . $kind . '?') === 0) {
            parse_str(substr($path, strlen($kind) + 2), $q);
            $cid = isset($q['customer']) ? $q['customer'] : '';
            if (isset($G['broken'][$kind][$cid])) return null;
            return array($kind => isset($G[$kind][$cid]) ? $G[$kind][$cid] : array());
        }
    }
    return null;
}

$now = time(); $day = 86400;
$past = gmdate('Y-m-d\TH:i:s.000\Z', $now - 30 * $day);
$recent = gmdate('Y-m-d\TH:i:s.000\Z', $now - $day);

// ---- 1. the record and the history ---------------------------------------------
reset_store();
ok(inv_record('Megan@Example.co.uk', 'Megan H', 'BRT1', 'Business Rollover', '24.38', 'Steve', $now - 5 * $day), 'record saved');
ok(inv_record('megan@example.co.uk', '', 'BRT2', 'Business Rollover (6 weeks)', '24.38', 'David', $now - 2 * $day), 'second record saved');
$log = $tmp . '/pcm-invite.log';
file_put_contents($log,
    '[' . gmdate('Y-m-d H:i:s', $now - 9 * $day) . 'Z] invite: sent home-support to old@example.com by Steve' . "\n" .
    '[' . gmdate('Y-m-d H:i:s', $now - 5 * $day + 1) . 'Z] invite: sent BRT1 to megan@example.co.uk by Steve' . "\n" .   // the same send as the first record
    '[' . gmdate('Y-m-d H:i:s', $now - 8 * $day) . 'Z] invite: FAILED BRT1 to bounce@example.com by Steve' . "\n" .
    '[' . gmdate('Y-m-d H:i:s', $now - 200 * $day) . 'Z] invite: sent BRT1 to ancient@example.com by Steve' . "\n");
$h = inv_history($log, array('home-support' => 'Home Computer Support (1 PC)', 'BRT1' => 'Business Rollover'), $now);
$by = array(); foreach ($h as $r) $by[$r['email']] = $r;
ok(count($h) === 2, 'one row per email, failed + 120-day-old sends left out (got ' . count($h) . ')');
ok(isset($by['megan@example.co.uk']) && $by['megan@example.co.uk']['count'] === 2, 'the log line of a recorded send is not counted twice');
ok($by['megan@example.co.uk']['label'] === 'Business Rollover (6 weeks)' && $by['megan@example.co.uk']['by'] === 'David', 'the latest invite wins');
ok($by['megan@example.co.uk']['name'] === 'Megan H', 'a name from an earlier invite is kept');
ok($by['megan@example.co.uk']['first'] === $now - 5 * $day, 'first invite time kept');
ok($by['old@example.com']['label'] === 'Home Computer Support (1 PC)' && $by['old@example.com']['name'] === '', 'a log-only invite gets its label from the plan key');
ok($h[0]['email'] === 'megan@example.co.uk', 'newest first');

// ---- 2. the customer index: paged, case-insensitive, hashed ----------------------
reset_store();
$GC['customers'] = array(
    array('id' => 'CU1', 'email' => 'Megan@Example.co.uk'), array('id' => 'CU2', 'email' => 'paid@example.com'),
    array('id' => 'CU3', 'email' => null), array('id' => 'CU4', 'email' => 'megan@example.co.uk'), array('id' => 'CU5', 'email' => 'x@example.com'));
$GC['calls'] = array();
$idx = inv_gc_index('gc_stub');
ok(count($GC['calls']) === 3, 'followed the cursor over 3 pages (' . count($GC['calls']) . ')');
ok(isset($idx[inv_ek('megan@example.co.uk')]) && $idx[inv_ek('megan@example.co.uk')] === array('CU1', 'CU4'), 'both of her customer records found, case-insensitively');
ok(strpos((string)file_get_contents($tmp . '/pcm-gc-custidx.json'), '@') === false, 'no plain email address in the index file');
$GC['calls'] = array(); inv_gc_index('gc_stub');
ok(count($GC['calls']) === 0, 'index served from its 10-minute cache');
$GC['down'] = true; $idx2 = inv_gc_index('gc_stub', true); $GC['down'] = false;
ok(is_array($idx2) && isset($idx2[inv_ek('paid@example.com')]), 'a GoCardless blip serves the last good index');

// ---- 3. statuses -------------------------------------------------------------
$sub = function ($amt, $next, $st = 'active') { return array('status' => $st, 'amount' => $amt, 'name' => 'Business Rollover', 'upcoming_payments' => $next ? array(array('charge_date' => $next)) : array()); };
$st = inv_gc_status('gc_stub', array(), $now);
ok($st['status'] === 'invited', 'no customer -> invited');

$GC['mandates'] = array('C_started' => array());
$st = inv_gc_status('gc_stub', array('C_started'), $now);
ok($st['status'] === 'started', 'customer but no mandate -> started');

$GC['mandates']['C_setup'] = array(array('status' => 'pending_submission', 'created_at' => $recent));
$GC['subscriptions']['C_setup'] = array($sub(2438, '2026-11-05'));
$st = inv_gc_status('gc_stub', array('C_setup'), $now - 2 * $day);
ok($st['status'] === 'setup' && strpos($st['words'], '£24.38 a month') !== false && strpos($st['words'], '5 Nov') !== false, 'pending mandate -> being set up, with amount and date: ' . $st['words']);
ok($st['before'] === false, 'a mandate made after the invite is not "before"');

$GC['mandates']['C_active'] = array(array('status' => 'active', 'created_at' => $recent));
$GC['subscriptions']['C_active'] = array($sub(2438, '2026-11-05'), $sub(999, '', 'cancelled'));
$st = inv_gc_status('gc_stub', array('C_active'), $now - 2 * $day);
ok($st['status'] === 'active' && $st['amount'] == 24.38, 'active mandate, no payment yet -> active, cancelled plan not added: ' . $st['words']);

$GC['mandates']['C_coll'] = array(array('status' => 'active', 'created_at' => $recent));
$GC['payments']['C_coll'] = array(array('status' => 'pending_submission', 'amount' => 2438, 'charge_date' => '2026-11-05'));
$st = inv_gc_status('gc_stub', array('C_coll'), $now - 2 * $day);
ok($st['status'] === 'collecting' && strpos($st['words'], '5 Nov') !== false, 'first payment pending -> on its way');

$GC['mandates']['C_paid'] = array(array('status' => 'active', 'created_at' => $recent));
$GC['subscriptions']['C_paid'] = array($sub(2438, '2026-12-05'));
$GC['payments']['C_paid'] = array(array('status' => 'pending_submission', 'amount' => 2438, 'charge_date' => '2026-12-05'),
                                  array('status' => 'paid_out', 'amount' => 2438, 'charge_date' => '2026-11-05'));
$st = inv_gc_status('gc_stub', array('C_paid'), $now - 40 * $day);
ok($st['status'] === 'paid' && $st['paid'] === '2026-11-05' && strpos($st['words'], 'next 5 Dec') !== false, 'a paid payment -> paying: ' . $st['words']);

$GC['mandates']['C_fail'] = array(array('status' => 'active', 'created_at' => $recent));
$GC['payments']['C_fail'] = array(array('status' => 'paid_out', 'amount' => 2438, 'charge_date' => '2026-10-05'),
                                  array('status' => 'failed', 'amount' => 2438, 'charge_date' => '2026-11-05'));
$st = inv_gc_status('gc_stub', array('C_fail'), $now - 40 * $day);
ok($st['status'] === 'problem' && strpos($st['words'], 'failed') !== false, 'latest payment failed -> problem, even after an earlier paid one');

$GC['mandates']['C_canc'] = array(array('status' => 'cancelled', 'created_at' => $recent));
$st = inv_gc_status('gc_stub', array('C_canc'), $now - 2 * $day);
ok($st['status'] === 'problem' && strpos($st['words'], 'cancelled') !== false, 'only a cancelled mandate -> problem');

$GC['mandates']['C_old'] = array(array('status' => 'active', 'created_at' => $past));
$st = inv_gc_status('gc_stub', array('C_old'), $now - 2 * $day);
ok($st['before'] === true, 'a Direct Debit from well before the invite is flagged');

$GC['broken']['payments']['C_broke'] = true;
ok(inv_gc_status('gc_stub', array('C_broke'), $now) === null, 'a GoCardless failure is null, never a made-up status');

// two customer records for one email are read together
$st = inv_gc_status('gc_stub', array('C_started', 'C_active'), $now - 2 * $day);
ok($st['status'] === 'active', 'both customer records counted');

// ---- 4. the rows with status: cache, budget, chase ------------------------------
reset_store();
$GC['customers'] = array(array('id' => 'C_active', 'email' => 'act@example.com'));
$GC['calls'] = array();
$rows = array(
    array('email' => 'new@example.com', 'at' => $now - 1 * $day, 'first' => $now - 1 * $day),
    array('email' => 'slow@example.com', 'at' => $now - 4 * $day, 'first' => $now - 4 * $day),
    array('email' => 'act@example.com', 'at' => $now - 6 * $day, 'first' => $now - 6 * $day));
$out = inv_with_status($rows, 'gc_stub', false, $now);
ok($out[0]['gc']['status'] === 'invited' && $out[0]['chase'] === false, 'invited yesterday: no chase yet');
ok($out[1]['gc']['status'] === 'invited' && $out[1]['chase'] === true && $out[1]['days'] === 4, 'invited 4 days ago with nothing set up: chase');
ok($out[2]['gc']['status'] === 'active' && $out[2]['chase'] === false, 'set up: no chase');
$n = count($GC['calls']);
inv_with_status($rows, 'gc_stub', false, $now);
ok(count($GC['calls']) === $n, 'second look inside 10 minutes reads GoCardless not at all');
inv_with_status($rows, 'gc_stub', true, $now);
ok(count($GC['calls']) > $n, 're-check reads GoCardless again');

// the budget: only INV_LOOKUPS customers looked up per request
reset_store();
$GC['customers'] = array(); $rows = array();
for ($i = 0; $i < INV_LOOKUPS + 3; $i++) { $GC['customers'][] = array('id' => "CB$i", 'email' => "c$i@example.com"); $rows[] = array('email' => "c$i@example.com", 'at' => $now - $day); }
$out = inv_with_status($rows, 'gc_stub', false, $now);
$unk = 0; foreach ($out as $r) if ($r['gc']['status'] === 'unknown') $unk++;
ok($unk === 3, 'only ' . INV_LOOKUPS . ' looked up per request, the rest say not checked yet (' . $unk . ')');
$out = inv_with_status($rows, 'gc_stub', false, $now);
$unk = 0; foreach ($out as $r) if ($r['gc']['status'] === 'unknown') $unk++;
ok($unk === 0, 'the next look finishes the rest');

// GoCardless down on a first look: unknown, not cached
reset_store();
$GC['down'] = true;
$out = inv_with_status(array(array('email' => 'z@example.com', 'at' => $now)), 'gc_stub', false, $now);
$GC['down'] = false;
ok($out[0]['gc']['status'] === 'unknown', 'GoCardless down -> unknown');
ok(!is_file($tmp . '/pcm-gc-invstatus.json'), 'an unknown is never cached');

// no token at all
$out = inv_with_status(array(array('email' => 'z@example.com', 'at' => $now)), null, false, $now);
ok($out[0]['gc'] === null, 'no GoCardless token -> no status, no calls');

// ---- 5. read-only, and never served ----------------------------------------------
$bad = 0; foreach ($GC['calls'] as $p) if (!preg_match('#^/(customers|mandates|subscriptions|payments)\?#', $p)) $bad++;
ok($bad === 0 && count($GC['calls']) > 0, 'only ever asks GoCardless to list customers, mandates, plans and payments');
$lib = (string)file_get_contents($ROOT . '/api/pcm-invite-lib.php');
ok(strpos($lib, 'curl_') === false, 'the library makes no requests of its own (all through the GET callable)');
$inv = (string)file_get_contents($ROOT . '/api/pcm-invite.php');
ok(preg_match('/function inv_gc_get\(.*?\n\}/s', $inv, $fm) && !preg_match('/CURLOPT_POST|CUSTOMREQUEST|CURLOPT_PUT/', $fm[0]), 'inv_gc_get is a plain GET');
$ht = (string)file_get_contents($ROOT . '/.htaccess');
foreach (array('pcm-invite-lib.php', 'pcm-invite-test.php', 'pcm-invite-sent.json', 'pcm-invite-sent.json.lock', 'pcm-gc-custidx.json', 'pcm-gc-invstatus.json', 'pcm-gc-custidx.json.123.tmp') as $f) {
    $den = false;
    if (preg_match_all('/<FilesMatch "([^"]+)">\s*Require all denied/', $ht, $mm)) foreach ($mm[1] as $re) if (preg_match('#' . $re . '#', $f)) $den = true;
    ok($den, $f . ' is denied over HTTP');
}
$gi = (string)file_get_contents($ROOT . '/.gitignore');
foreach (array('api/pcm-invite-sent.json', 'api/pcm-gc-custidx.json', 'api/pcm-gc-invstatus.json') as $f) ok(strpos($gi, $f) !== false, $f . ' is gitignored');

reset_store(); @rmdir($tmp);
echo "pcm-invite-lib: $pass passed, $fail failed\n";
exit($fail ? 1 : 0);
