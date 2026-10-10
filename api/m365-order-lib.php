<?php
/*
 * Microsoft 365 orders taken on our own website - the library (9 Oct 2026).
 *
 * WHY (owner, 9 Oct 2026: "I thought the customers could buy it directly on our website", then "yes build it with
 * option B"). A business picks a plan and how many people on /order-microsoft-365/, gives its address and who signs for
 * it, agrees to the Microsoft Customer Agreement and the 12-month term, and sets up a Direct Debit on GoCardless's own
 * page. The order then waits in the staff portal (Today > Microsoft 365 orders) until a person presses "Order in Pax8".
 * We buy from Pax8 only after a human has looked at the order, so a mistyped domain or a prank can never cost a
 * 12-month commitment.
 *
 * Three outside parties, each with its own rule:
 *  - GoCardless ($GC_TOKEN in api/pcm-gocardless.php): for ONE new order we create a mandate request and its hosted
 *    flow; on a staff press, a monthly subscription on THAT order's own mandate. Nothing here reads, changes or cancels
 *    any other mandate or subscription - the existing Direct Debits are never touched.
 *  - Pax8 (api/pax8-key.php, server-only, made by the owner): on a staff press, a company and an order, with
 *    ?isMock=true first so Pax8's own validation passes before the real order goes in.
 *  - Slack #365-job-tracker (mm_hook): one card per new order - the portal inbox and the lead reminders read it
 *    (lc_lead "Microsoft 365 order") - and one line when its Direct Debit is set up or the order is placed.
 *
 * Include-only (.htaccess denies it as a URL); no top-level side effects. NO closing tag in this file.
 */
require_once __DIR__ . '/pcm-mailmove-lib.php';   // mm_clean, mm_len, mm_email_ok, mm_uk_phone, mm_esc, mm_hook, mm_post_slack, mm_rate_*

if (!defined('M365_DIR'))    define('M365_DIR', __DIR__);
if (!defined('M365_STORE'))  define('M365_STORE', M365_DIR . '/m365-orders.json');        // denied + gitignored: names, addresses
if (!defined('M365_LOG'))    define('M365_LOG', M365_DIR . '/m365-orders.log');           // denied + gitignored
if (!defined('M365_PAX8F'))  define('M365_PAX8F', M365_DIR . '/pax8-key.php');            // server-only: $PAX8_CLIENT_ID / $PAX8_CLIENT_SECRET
if (!defined('M365_PAX8T'))  define('M365_PAX8T', M365_DIR . '/pax8-token.json');         // denied + gitignored: a 24-hour token
if (!defined('M365_GCF'))    define('M365_GCF', M365_DIR . '/pcm-gocardless.php');        // server-only: $GC_TOKEN
if (!defined('M365_PLANSF')) define('M365_PLANSF', __DIR__ . '/m365-order-plans.php');    // written by the build from software_offers.py
define('M365_PAGE', '/order-microsoft-365/');
define('M365_MPN', '5190646');           // our Location MPN ID (Partner Center > Identifiers > CSP), what Pax8 asks for
define('M365_MAX_QTY', 300);             // Microsoft's limit for the Business plans
define('M365_MAX_ROWS', 2000);
define('M365_WAIT_DAYS', 14);            // the cron stops asking GoCardless about a Direct Debit nobody finished after this
define('M365_MIN_AGE', 180);             // seconds: the webhook's head start before the cron asks
define('M365_RECHECK', 600);
define('M365_GC_VER', '2015-07-06');

/* ---- where things are. The test overrides work ONLY from the command line or PHP's own test server, never on the
   live site's PHP (the same rule as mm_hook). ---------------------------------------------------------------------- */
function m365_test_env($k) { return (PHP_SAPI === 'cli' || PHP_SAPI === 'cli-server') ? (string)getenv($k) : ''; }
function m365_site() { $u = m365_test_env('M365_SITE_URL'); return $u !== '' ? rtrim($u, '/') : 'https://365techies.co.uk'; }
function m365_gc_base() { $u = m365_test_env('M365_FAKE_GC'); return $u !== '' ? rtrim($u, '/') : 'https://api.gocardless.com'; }
function m365_pax8_base() { $u = m365_test_env('M365_FAKE_PAX8'); return $u !== '' ? rtrim($u, '/') : 'https://api.pax8.com/v1'; }

function m365_log($m) { @file_put_contents(M365_LOG, '[' . gmdate('Y-m-d H:i:s') . 'Z] ' . str_replace("\n", ' ', (string)$m) . "\n", FILE_APPEND | LOCK_EX); }

function m365_plans() {
    static $p = null;
    if ($p === null) { $p = is_readable(M365_PLANSF) ? include M365_PLANSF : array(); if (!is_array($p)) $p = array(); }
    return $p;
}
function m365_money($pence) { return '£' . number_format(((int)$pence) / 100, 2); }
function m365_pence($price) { return (int)round(((float)$price) * 100); }

/* ---- tidying what people type ----------------------------------------------------------------------------------- */
function m365_text($v, $max) {
    $s = mm_clean($v);
    return mm_len($s) > $max ? false : $s;
}
/* A UK postcode tidied ("bh1 2ab" -> "BH1 2AB"); anything else is kept as typed, never refused (customer-address-capture
   rule - BFPO and odd ones exist). */
function m365_postcode($v) {
    $s = strtoupper(preg_replace('/\s+/', '', mm_clean($v)));
    if (preg_match('/^([A-Z]{1,2}[0-9][0-9A-Z]?)([0-9][A-Z]{2})$/', $s, $m)) return $m[1] . ' ' . $m[2];
    return strtoupper(mm_clean($v));
}
/* "https://www.Smith-Builders.co.uk/contact" or "jane@smith-builders.co.uk" -> "smith-builders.co.uk"; '' when there is
   nothing; false when it can't be a domain. */
function m365_domain($v) {
    $s = strtolower(mm_clean($v));
    if ($s === '') return '';
    if (strpos($s, '@') !== false) $s = substr($s, strrpos($s, '@') + 1);
    $s = preg_replace('#^[a-z]+://#', '', $s);
    $s = preg_replace('#[/?\#:].*$#', '', $s);
    if (strpos($s, 'www.') === 0) $s = substr($s, 4);
    $s = rtrim($s, '.');
    if (strlen($s) > 100 || !preg_match('/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/', $s)) return false;
    return $s;
}
/* The ".onmicrosoft.com" name Microsoft gives a new account: letters and digits only. From their domain, else their
   business name. Staff can change it in the portal before ordering. */
function m365_prefix($domain, $biz) {
    $base = $domain !== '' ? substr($domain, 0, strpos($domain . '.', '.')) : $biz;
    $base = preg_replace('/\b(ltd|limited|llp|plc)\b\.?/i', '', (string)$base);
    $p = substr(preg_replace('/[^a-z0-9]/', '', strtolower($base)), 0, 27);
    return strlen($p) >= 3 ? $p : '';
}
function m365_prefix_ok($p) { return (bool)preg_match('/^[a-z0-9]{3,40}$/', (string)$p); }
function m365_crn($v) {   // Companies House number, optional: "sc123456", "01234567"
    $s = strtoupper(preg_replace('/\s+/', '', mm_clean($v)));
    if ($s === '') return '';
    return preg_match('/^[A-Z0-9]{6,10}$/', $s) ? $s : false;
}
/* A phone number we can ring. A UK number is tidied; anything else is kept (never refused for its shape - the phones
   rule) as long as it has enough digits to be one. */
function m365_phone($v) {
    $uk = mm_uk_phone($v);
    if ($uk !== '') return $uk;
    $s = mm_clean($v);
    return (strlen(preg_replace('/\D/', '', $s)) >= 7 && mm_len($s) <= 30) ? $s : false;
}

/* What they use for email today -> whether Microsoft already knows them. 'microsoft' = they have a Microsoft 365
   account already, so Pax8 must take it over (GDAP) rather than make a new one - that is done by hand in Pax8. */
function m365_email_now_words($k) {
    $w = array('none' => 'No business email yet', 'host' => 'Email from our web host or internet provider',
               'google' => 'Google Workspace (Gmail for business)', 'microsoft' => 'Already on Microsoft 365', 'other' => 'Something else');
    return isset($w[$k]) ? $w[$k] : '';
}

/* ---- checking an order --------------------------------------------------------------------------------------------
   Returns array('ok' => bool, 'errors' => array(field => code), 'f' => the cleaned fields). Codes are short and the
   page turns them into words. */
function m365_validate($in, $plans = null, $now = null) {
    $plans = $plans === null ? m365_plans() : $plans;
    $e = array(); $f = array();
    $g = function ($k) use ($in) { return isset($in[$k]) && is_scalar($in[$k]) ? (string)$in[$k] : ''; };
    $f['plan'] = preg_replace('/[^a-z0-9-]/', '', $g('plan'));
    if (!isset($plans[$f['plan']])) $e['plan'] = 'plan';
    $q = trim($g('qty'));
    $f['qty'] = ctype_digit($q) ? (int)$q : 0;
    if ($f['qty'] < 1 || $f['qty'] > M365_MAX_QTY) $e['qty'] = 'qty';
    foreach (array('biz' => array(2, 120, true), 'street' => array(3, 120, true), 'street2' => array(0, 120, false),
                   'city' => array(2, 60, true), 'first' => array(1, 60, true), 'last' => array(1, 60, true),
                   'now_with' => array(0, 80, false), 'notes' => array(0, 1000, false)) as $k => $r) {
        $v = m365_text($g($k), $r[1]);
        if ($v === false) { $e[$k] = 'long'; $f[$k] = ''; continue; }
        if ($r[2] && mm_len($v) < $r[0]) $e[$k] = 'required';
        $f[$k] = $v;
    }
    $f['postcode'] = m365_postcode($g('postcode'));
    if ($f['postcode'] === '' ) $e['postcode'] = 'required';
    elseif (mm_len($f['postcode']) > 12) $e['postcode'] = 'long';
    $f['crn'] = m365_crn($g('crn'));
    if ($f['crn'] === false) { $e['crn'] = 'crn'; $f['crn'] = ''; }
    $f['domain'] = m365_domain($g('domain'));
    if ($f['domain'] === false) { $e['domain'] = 'domain'; $f['domain'] = ''; }
    $f['email'] = strtolower(trim($g('email')));
    if (!mm_email_ok($f['email'])) $e['email'] = 'email';
    $ph = m365_phone($g('phone'));
    if ($ph === false) { $e['phone'] = trim($g('phone')) === '' ? 'required' : 'phone'; $f['phone'] = ''; } else $f['phone'] = $ph;
    $f['email_now'] = $g('email_now');
    if (m365_email_now_words($f['email_now']) === '') $e['email_now'] = 'required';
    foreach (array('signatory', 'mca', 'term', 'terms') as $k) {
        $v = isset($in[$k]) ? $in[$k] : false;
        if ($v !== true && $v !== 1 && $v !== '1' && $v !== 'true' && $v !== 'on') $e[$k] = 'agree';
    }
    return array('ok' => !$e, 'errors' => $e, 'f' => $f);
}

/* A new order row. 'kh' is the hash of the secret the customer's browser (and their email) holds: it lets that person
   - and only them - see the order's state and get back to the Direct Debit page. */
function m365_new_row($f, $plans, $key, $ip, $ua, $now = null) {
    $now = $now === null ? time() : (int)$now;
    $p = $plans[$f['plan']];
    $each = m365_pence($p['price']);
    return array(
        'id' => bin2hex(random_bytes(5)), 'kh' => hash('sha256', (string)$key), 'at' => $now,
        'plan' => $f['plan'], 'plan_name' => (string)$p['name'], 'qty' => (int)$f['qty'],
        'each' => $each, 'monthly' => $each * (int)$f['qty'],
        'biz' => array('name' => $f['biz'], 'crn' => $f['crn'], 'street' => $f['street'], 'street2' => $f['street2'],
                       'city' => $f['city'], 'postcode' => $f['postcode']),
        'domain' => $f['domain'], 'email_now' => $f['email_now'], 'now_with' => $f['now_with'],
        'person' => array('first' => $f['first'], 'last' => $f['last'], 'email' => $f['email'], 'phone' => $f['phone']),
        'notes' => $f['notes'],
        // what they agreed to, when and from where - the record Microsoft's Customer Agreement attestation rests on
        'agreed' => array('at' => $now, 'mca' => 1, 'term' => 1, 'terms' => 1, 'signatory' => 1,
                          'ip' => substr((string)$ip, 0, 45), 'ua' => substr(preg_replace('/[^\x20-\x7E]/', '', (string)$ua), 0, 200)),
        'prefix' => m365_prefix($f['domain'], $f['biz']),
        'dd' => array('state' => 'none'), 'pax8' => array('state' => 'none'), 'pay' => array('state' => 'none'),
        'log' => array(array('at' => $now, 'by' => 'website', 'what' => 'Ordered on the website')),
    );
}

/* One word for where an order is. Cancelled wins; then the furthest step reached. */
function m365_state($r) {
    if (!empty($r['cancelled'])) return 'cancelled';
    $pax = (string)($r['pax8']['state'] ?? 'none');
    $pay = (string)($r['pay']['state'] ?? 'none');
    if ($pax === 'ordered' && $pay === 'started') return 'done';
    if ($pax === 'ordered') return 'ordered';
    if ((string)($r['dd']['state'] ?? '') === 'ready') return 'ready';
    return 'waiting';
}
function m365_add_log(&$r, $by, $what, $now = null) {
    if (!isset($r['log']) || !is_array($r['log'])) $r['log'] = array();
    $r['log'][] = array('at' => $now === null ? time() : (int)$now, 'by' => substr((string)$by, 0, 60), 'what' => substr((string)$what, 0, 300));
    if (count($r['log']) > 60) $r['log'] = array_slice($r['log'], -60);
}

/* ---- the store: flock + atomic rename, the pay-link pattern ---------------------------------------------------- */
function m365_store_read() {
    $j = @json_decode((string)@file_get_contents(M365_STORE), true);
    if (!is_array($j) || !isset($j['orders']) || !is_array($j['orders'])) $j = array('orders' => array());
    return $j;
}
function m365_store_locked($fn) {
    $lh = @fopen(M365_STORE . '.lock', 'c');
    if (!$lh) return array('ok' => false, 'error' => 'lock_open');
    if (!flock($lh, LOCK_EX)) { fclose($lh); return array('ok' => false, 'error' => 'lock'); }
    $data = m365_store_read();
    $r = $fn($data);
    if (!empty($r['ok']) && isset($r['data'])) {
        $d = $r['data'];
        if (count($d['orders']) > M365_MAX_ROWS) $d['orders'] = array_slice($d['orders'], -M365_MAX_ROWS);
        $tmp = M365_STORE . '.' . getmypid() . '.tmp';
        if (@file_put_contents($tmp, json_encode($d, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE), LOCK_EX) === false
            || !@rename($tmp, M365_STORE)) { @unlink($tmp); $r = array('ok' => false, 'error' => 'store_write'); }
    }
    flock($lh, LOCK_UN); fclose($lh);
    return $r;
}
function m365_find($id) {
    foreach (m365_store_read()['orders'] as $r) if ((string)$r['id'] === (string)$id) return $r;
    return null;
}
/* Change one order under the lock. $fn(&$row) returns '' to save or an error code to leave it alone. */
function m365_update($id, $fn) {
    $out = array('ok' => false, 'error' => 'unknown_order');
    $res = m365_store_locked(function ($data) use ($id, $fn, &$out) {
        foreach ($data['orders'] as $i => $r) {
            if ((string)$r['id'] !== (string)$id) continue;
            $err = $fn($r);
            if ($err !== '') { $out = array('ok' => false, 'error' => $err, 'row' => $r); return array('ok' => false); }
            $data['orders'][$i] = $r;
            $out = array('ok' => true, 'row' => $r);
            return array('ok' => true, 'data' => $data);
        }
        return array('ok' => false);
    });
    if (!empty($out['ok']) && empty($res['ok'])) return array('ok' => false, 'error' => isset($res['error']) ? $res['error'] : 'store');
    return $out;
}
function m365_key_ok($row, $key) {
    $key = preg_replace('/[^a-f0-9]/', '', (string)$key);
    return is_array($row) && strlen($key) === 32 && hash_equals((string)$row['kh'], hash('sha256', $key));
}

/* ---- HTTP ------------------------------------------------------------------------------------------------------- */
function m365_http($method, $url, $headers, $body = null, $timeout = 25) {
    if (!function_exists('curl_init')) return array(0, null);
    $ch = curl_init($url);
    $opt = array(CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => $timeout, CURLOPT_CONNECTTIMEOUT => 6,
                 CURLOPT_CUSTOMREQUEST => $method, CURLOPT_HTTPHEADER => $headers);
    if ($body !== null) $opt[CURLOPT_POSTFIELDS] = json_encode($body, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    curl_setopt_array($ch, $opt);
    $r = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
    return array($code, json_decode((string)$r, true));
}

/* ---- GoCardless -------------------------------------------------------------------------------------------------- */
function m365_gc_token() {   // read by pattern, so a File Manager paste can't fatal us; never returned or logged
    $src = (string)@file_get_contents(M365_GCF);
    return preg_match('/\$GC_TOKEN\s*=\s*[\'"]([^\'"]+)[\'"]/', $src, $m) ? $m[1] : '';
}
function m365_gc($method, $path, $body = null, $idem = '') {
    $tok = m365_gc_token();
    if ($tok === '') return array(0, null);
    $h = array('Authorization: Bearer ' . $tok, 'GoCardless-Version: ' . M365_GC_VER, 'Accept: application/json');
    if ($body !== null) $h[] = 'Content-Type: application/json';
    if ($idem !== '') $h[] = 'Idempotency-Key: ' . $idem;
    return m365_http($method, m365_gc_base() . $path, $h, $body, 15);
}
function m365_gc_why($j) {
    if (!is_array($j) || !isset($j['error'])) return '';
    $e = $j['error'];
    $m = isset($e['errors'][0]['message']) ? $e['errors'][0]['message'] : (isset($e['message']) ? $e['message'] : '');
    return substr(mm_clean($m), 0, 160);
}
/* The single-use page GoCardless makes for one customer. The only link shape we hand to a browser or put in an email. */
function m365_flow_ok($u) {
    $u = (string)$u;
    return strpos($u, 'https://pay.gocardless.com/billing/static/flow?id=BRF') === 0 && !preg_match('/[\s"\'<>]/', $u);
}
/* A new Direct Debit request for this order, and the page that collects it. Changes $r['dd']; the caller saves.
   Returns array(ok, url, why). */
function m365_dd_start(&$r, $key, $now = null) {
    $now = $now === null ? time() : (int)$now;
    if (m365_gc_token() === '') { $r['dd'] = array('state' => 'failed', 'why' => 'GoCardless is not connected on the server', 'at' => $now); return array(false, '', 'no_gocardless'); }
    $p = $r['person']; $b = $r['biz'];
    list($c1, $j1) = m365_gc('POST', '/billing_requests', array('billing_requests' => array(
        'mandate_request' => array('scheme' => 'bacs', 'currency' => 'GBP'),
        'metadata' => array('m365' => (string)$r['id'], 'src' => 'order-microsoft-365'),
    )));
    $br = (string)($j1['billing_requests']['id'] ?? '');
    if ($c1 < 200 || $c1 >= 300 || $br === '') {
        $why = m365_gc_why($j1);
        $r['dd'] = array('state' => 'failed', 'why' => 'GoCardless refused the request (' . $c1 . ($why !== '' ? ': ' . $why : '') . ')', 'at' => $now);
        m365_log('dd start FAILED br http ' . $c1 . ' order ' . $r['id']);
        return array(false, '', 'gc_failed');
    }
    $back = m365_site() . M365_PAGE . '?order=' . rawurlencode((string)$r['id']) . '&k=' . rawurlencode((string)$key);
    $pre = array('given_name' => $p['first'], 'family_name' => $p['last'], 'email' => $p['email'], 'company_name' => $b['name'],
                 'address_line1' => $b['street'], 'city' => $b['city'], 'postal_code' => $b['postcode'], 'country_code' => 'GB');
    if ($b['street2'] !== '') $pre['address_line2'] = $b['street2'];
    list($c2, $j2) = m365_gc('POST', '/billing_request_flows', array('billing_request_flows' => array(
        'links' => array('billing_request' => $br),
        'redirect_uri' => $back . '&dd=done', 'exit_uri' => $back . '&dd=left',
        'prefilled_customer' => $pre,
    )));
    $url = (string)($j2['billing_request_flows']['authorisation_url'] ?? '');
    if ($c2 < 200 || $c2 >= 300 || !m365_flow_ok($url)) {
        $why = m365_gc_why($j2);
        $r['dd'] = array('state' => 'failed', 'br' => $br, 'why' => 'GoCardless could not make the page (' . $c2 . ($why !== '' ? ': ' . $why : '') . ')', 'at' => $now);
        m365_log('dd start FAILED flow http ' . $c2 . ' order ' . $r['id']);
        return array(false, '', 'gc_failed');
    }
    $r['dd'] = array('state' => 'waiting', 'br' => $br, 'url' => $url, 'at' => $now,
                     'expires' => isset($j2['billing_request_flows']['expires_at']) ? (int)strtotime($j2['billing_request_flows']['expires_at']) : 0);
    return array(true, $url, '');
}
/* GoCardless billing request + mandate -> our Direct Debit state. Changes $r['dd']; returns the change ('' when none).
   Anything unexpected leaves the state as it was - believing nothing beats believing the wrong thing. */
function m365_dd_check(&$r, $now = null) {
    $now = $now === null ? time() : (int)$now;
    $dd = isset($r['dd']) && is_array($r['dd']) ? $r['dd'] : array('state' => 'none');
    $br = (string)($dd['br'] ?? '');
    if ($br === '' || m365_gc_token() === '') return '';
    $before = (string)($dd['state'] ?? '');
    $dd['checked_at'] = $now;
    list($c, $j) = m365_gc('GET', '/billing_requests/' . rawurlencode($br));
    if ($c < 200 || $c >= 300 || !isset($j['billing_requests'])) { $r['dd'] = $dd; return ''; }
    $b = $j['billing_requests'];
    $s = strtolower((string)($b['status'] ?? ''));
    $mandate = (string)($b['mandate_request']['links']['mandate'] ?? ($b['links']['mandate_request_mandate'] ?? ''));
    if ($s === 'fulfilled' || $mandate !== '') {
        if ($mandate !== '') $dd['mandate'] = $mandate;
        $dd['state'] = 'ready';
        if (empty($dd['ready_at'])) $dd['ready_at'] = $now;
        if ($mandate !== '') {
            list($cm, $jm) = m365_gc('GET', '/mandates/' . rawurlencode($mandate));
            if ($cm >= 200 && $cm < 300 && isset($jm['mandates']['status'])) {
                $ms = strtolower((string)$jm['mandates']['status']);
                $dd['mstatus'] = $ms;
                if (in_array($ms, array('failed', 'cancelled', 'expired', 'blocked', 'consumed'), true)) {
                    $dd['state'] = 'failed'; $dd['why'] = 'The Direct Debit is ' . $ms . ' at GoCardless';
                }
            }
        }
    } elseif ($s === 'cancelled' || $s === 'failed') {
        $dd['state'] = 'failed'; $dd['why'] = 'They left the Direct Debit page (' . $s . ')';
    }
    if ($dd['state'] !== 'waiting') unset($dd['url']);   // a finished flow's page is no use to anyone (a waiting one still is)
    if ($dd['state'] === 'waiting' && !empty($dd['expires']) && $dd['expires'] <= $now) { $dd['why'] = 'The Direct Debit page expired before they finished'; unset($dd['url']); }
    $r['dd'] = $dd;
    return $dd['state'] !== $before ? $dd['state'] : '';
}
/* Monthly payments on this order's own mandate. Changes $r['pay']; returns array(ok, why). */
function m365_pay_start(&$r, $by, $now = null) {
    $now = $now === null ? time() : (int)$now;
    $mandate = (string)($r['dd']['mandate'] ?? '');
    if ($mandate === '' || ($r['dd']['state'] ?? '') !== 'ready') return array(false, 'no_mandate');
    if (($r['pay']['state'] ?? '') === 'started') return array(false, 'already');
    $name = substr('Microsoft 365: ' . (int)$r['qty'] . ' x ' . preg_replace('/^Microsoft 365 /', '', (string)$r['plan_name']), 0, 255);
    $body = array('subscriptions' => array('amount' => (string)(int)$r['monthly'], 'currency' => 'GBP', 'name' => $name,
        'interval_unit' => 'monthly', 'metadata' => array('m365' => (string)$r['id']), 'links' => array('mandate' => $mandate)));
    list($c, $j) = m365_gc('POST', '/subscriptions', $body, 'm365sub-' . $r['id']);
    if ($c === 409 && isset($j['error']['errors'][0]['links']['conflicting_resource_id'])) {   // pressed before: read the one we made
        list($c, $j) = m365_gc('GET', '/subscriptions/' . rawurlencode((string)$j['error']['errors'][0]['links']['conflicting_resource_id']));
    }
    $sub = $j['subscriptions'] ?? null;
    if ($c < 200 || $c >= 300 || !is_array($sub) || empty($sub['id'])) {
        $why = m365_gc_why($j);
        return array(false, 'GoCardless refused it (' . $c . ($why !== '' ? ': ' . $why : '') . ')');
    }
    $first = (string)($sub['upcoming_payments'][0]['charge_date'] ?? ($sub['start_date'] ?? ''));
    $r['pay'] = array('state' => 'started', 'sub' => (string)$sub['id'], 'amount' => (int)$r['monthly'], 'first' => $first, 'at' => $now, 'by' => $by);
    return array(true, '');
}

/* ---- Pax8 ------------------------------------------------------------------------------------------------------- */
function m365_pax8_creds() {
    $src = (string)@file_get_contents(M365_PAX8F);
    $id = preg_match('/\$PAX8_CLIENT_ID\s*=\s*[\'"]([^\'"]+)[\'"]/', $src, $a) ? $a[1] : '';
    $se = preg_match('/\$PAX8_CLIENT_SECRET\s*=\s*[\'"]([^\'"]+)[\'"]/', $src, $b) ? $b[1] : '';
    return ($id !== '' && $se !== '') ? array($id, $se) : null;
}
function m365_pax8_ready() { return m365_pax8_creds() !== null; }
function m365_pax8_token($fresh = false) {
    $cr = m365_pax8_creds();
    if (!$cr) return '';
    $c = @json_decode((string)@file_get_contents(M365_PAX8T), true);
    if (!$fresh && is_array($c) && !empty($c['t']) && (int)($c['exp'] ?? 0) > time() + 300) return (string)$c['t'];
    list($code, $j) = m365_http('POST', m365_pax8_base() . '/token', array('Content-Type: application/json', 'Accept: application/json'),
        array('client_id' => $cr[0], 'client_secret' => $cr[1], 'audience' => 'https://api.pax8.com', 'grant_type' => 'client_credentials'), 20);
    $t = (string)($j['access_token'] ?? '');
    if ($code < 200 || $code >= 300 || $t === '') { m365_log('pax8 token FAILED http ' . $code); return ''; }
    $exp = time() + max(600, (int)($j['expires_in'] ?? 3600));
    @file_put_contents(M365_PAX8T, json_encode(array('t' => $t, 'exp' => $exp)), LOCK_EX);
    return $t;
}
function m365_pax8($method, $path, $body = null) {
    $t = m365_pax8_token();
    if ($t === '') return array(0, null);
    $h = array('Authorization: Bearer ' . $t, 'Accept: application/json');
    if ($body !== null) $h[] = 'Content-Type: application/json';
    list($c, $j) = m365_http($method, m365_pax8_base() . $path, $h, $body, 45);
    if ($c === 401) {   // a token Pax8 has stopped honouring: one fresh try
        $t = m365_pax8_token(true);
        if ($t === '') return array(401, $j);
        $h[0] = 'Authorization: Bearer ' . $t;
        list($c, $j) = m365_http($method, m365_pax8_base() . $path, $h, $body, 45);
    }
    return array($c, $j);
}
function m365_pax8_why($j) {
    if (!is_array($j)) return '';
    $bits = array();
    if (!empty($j['message'])) $bits[] = (string)$j['message'];
    foreach ((array)($j['details'] ?? array()) as $d) {
        if (is_string($d)) $bits[] = $d;
        elseif (is_array($d)) $bits[] = trim((string)($d['field'] ?? $d['key'] ?? '') . ' ' . (string)($d['message'] ?? $d['detail'] ?? json_encode($d)));
    }
    if (!$bits && !empty($j['error_description'])) $bits[] = (string)$j['error_description'];
    return substr(mm_clean(implode('; ', $bits)), 0, 400);
}
function m365_pax8_company_body($r) {
    $b = $r['biz']; $p = $r['person'];
    $addr = array('street' => $b['street'], 'city' => $b['city'], 'postalCode' => $b['postcode'], 'country' => 'GB');
    if ($b['street2'] !== '') $addr['street2'] = $b['street2'];
    return array('name' => $b['name'], 'address' => $addr, 'phone' => $p['phone'],
        'website' => $r['domain'] !== '' ? $r['domain'] : 'none',
        'externalId' => 'm365-' . $r['id'],
        'billOnBehalfOfEnabled' => false, 'selfServiceAllowed' => false, 'orderApprovalRequired' => false,
        'contacts' => array(array('firstName' => $p['first'], 'lastName' => $p['last'], 'email' => $p['email'], 'phone' => $p['phone'],
                                  'types' => array(array('type' => 'Admin', 'primary' => true)))));
}
/* The answers Pax8 asks for when ordering a Microsoft product (GET /products/{id}/provision-details, read on 9 Oct
   2026: msCustExists, msDomain, msMPNidval, msTenantId, mca2020FirstName/LastName/Email, msftContact*,
   companyRegistrationNumber, microsoftCancelPolicyAcknowledgement, microsoftGDAPDirect). Built from the questions Pax8
   sends at order time, so a wording change on their side is picked up; a question we cannot answer is left out and the
   ?isMock=true check says so before anything is bought. */
function m365_pax8_answers($r, $prefix, $details) {
    $p = $r['person'];
    $want = array('msDomain' => $prefix, 'msMPNidval' => M365_MPN,
        'mca2020FirstName' => $p['first'], 'mca2020LastName' => $p['last'], 'mca2020Email' => $p['email'],
        'mca2020EffectiveDate' => gmdate('Y-m-d', (int)($r['agreed']['at'] ?? time())),
        'msftContactFirstName' => $p['first'], 'msftContactLastName' => $p['last'], 'msftContactEmail' => $p['email'],
        'companyRegistrationNumber' => (string)($r['biz']['crn'] ?? ''));
    $out = array();
    foreach ((array)$details as $d) {
        $k = (string)($d['key'] ?? '');
        if ($k === '') continue;
        $pv = (isset($d['possibleValues']) && is_array($d['possibleValues'])) ? array_values($d['possibleValues']) : array();
        if ($k === 'msCustExists') {   // a NEW Microsoft account: existing ones are taken over by hand in Pax8 (GDAP)
            foreach ($pv as $v) if (preg_match('/^\s*No\b/i', (string)$v)) { $out[] = array('key' => $k, 'values' => array((string)$v)); break; }
            continue;
        }
        if (isset($want[$k])) { if ($want[$k] !== '') $out[] = array('key' => $k, 'values' => array((string)$want[$k])); continue; }
        // a one-answer acknowledgement (the 7-day cancellation window) - the customer agreed to the same thing on our page
        if ($k === 'microsoftCancelPolicyAcknowledgement' && count($pv) >= 1) $out[] = array('key' => $k, 'values' => array((string)$pv[0]));
    }
    return $out;
}
function m365_pax8_order_body($r, $plan, $companyId, $answers) {
    return array('companyId' => $companyId, 'orderedBy' => 'Pax8 Partner', 'lineItems' => array(array(
        'lineItemNumber' => 1, 'productId' => (string)$plan['pax8'], 'quantity' => (int)$r['qty'],
        'billingTerm' => 'Monthly', 'commitmentTermId' => (string)$plan['commit'], 'provisioningDetails' => $answers)));
}

/* ---- words ------------------------------------------------------------------------------------------------------ */
function m365_what($r) { return (int)$r['qty'] . ' x ' . $r['plan_name']; }
function m365_portal_link($id) { return 'https://365techies.co.uk/portal/#m365order=' . $id; }
/* The Slack card for a new order. Its plain first line is what lc_lead recognises ("Microsoft 365 order from ...") -
   keep the two in step (m365-order-test.php checks). */
function m365_card($r, $now = null) {
    $p = $r['person']; $b = $r['biz'];
    $name = trim($p['first'] . ' ' . $p['last']);
    $ddw = array('waiting' => 'Sent to the Direct Debit page', 'ready' => 'Set up', 'failed' => 'Not set up: ' . (string)($r['dd']['why'] ?? ''), 'none' => 'Not started');
    $fields = array(
        array('type' => 'mrkdwn', 'text' => "*Name:*\n" . mm_esc($name)),
        array('type' => 'mrkdwn', 'text' => "*Company:*\n" . mm_esc($b['name'])),
        array('type' => 'mrkdwn', 'text' => "*Email:*\n" . mm_esc($p['email'])),
        array('type' => 'mrkdwn', 'text' => "*Phone:*\n" . mm_esc($p['phone'])),
        array('type' => 'mrkdwn', 'text' => "*Order:*\n" . mm_esc(m365_what($r))),
        array('type' => 'mrkdwn', 'text' => "*Monthly:*\n" . m365_money($r['monthly']) . ' (12-month term)'),
        array('type' => 'mrkdwn', 'text' => "*Email today:*\n" . mm_esc(m365_email_now_words($r['email_now']) . ($r['now_with'] !== '' ? ' (' . $r['now_with'] . ')' : ''))),
        array('type' => 'mrkdwn', 'text' => "*Direct Debit:*\n" . mm_esc($ddw[$r['dd']['state'] ?? 'none'] ?? '')),
    );
    $next = $r['email_now'] === 'microsoft'
        ? 'They already have Microsoft 365, so Pax8 must take it over (their admin approves the GDAP link) - order it by hand in Pax8.'
        : 'It waits in the portal for *Order in Pax8* once the Direct Debit is set up.';
    $blocks = array(
        array('type' => 'header', 'text' => array('type' => 'plain_text', 'text' => "\xF0\x9F\x9B\x92 Microsoft 365 order: " . (preg_match('/^.{0,100}/us', $b['name'], $hm) ? $hm[0] : ''), 'emoji' => true)),
        array('type' => 'section', 'fields' => $fields),
        array('type' => 'section', 'text' => array('type' => 'mrkdwn', 'text' => $next . ' <' . m365_portal_link($r['id']) . '|Open the order> (staff sign-in).')),
    );
    if ($r['notes'] !== '') $blocks[] = array('type' => 'section', 'text' => array('type' => 'mrkdwn', 'text' => "*Message:*\n>" . str_replace("\n", "\n>", mm_esc($r['notes']))));
    $tz = new DateTimeZone('Europe/London');
    $when = (new DateTime('@' . ($now === null ? time() : (int)$now)))->setTimezone($tz)->format('H:i, D j M');
    $blocks[] = array('type' => 'context', 'elements' => array(array('type' => 'mrkdwn', 'text' => 'via ' . M365_PAGE . " \xC2\xB7 " . $when)));
    return array('text' => 'Microsoft 365 order from ' . mm_esc($name) . ' (' . mm_esc($b['name']) . ')', 'blocks' => $blocks, 'unfurl_links' => false);
}
function m365_note($text) {
    $hook = mm_hook(M365_DIR);
    return $hook !== '' && mm_post_slack($hook, array('text' => $text, 'unfurl_links' => false));
}
function m365_tag($r) { return '*' . mm_esc($r['biz']['name']) . '* (' . mm_esc(m365_what($r)) . ')'; }

/* The customer's own copy: what they ordered and agreed to, and the way back to the Direct Debit if they left it. */
function m365_email($r, $key) {
    $p = $r['person'];
    $site = m365_site();
    $link = $site . M365_PAGE . '?order=' . $r['id'] . '&k=' . $key;
    $tz = new DateTimeZone('Europe/London');
    $when = (new DateTime('@' . (int)$r['agreed']['at']))->setTimezone($tz)->format('j F Y \a\t H:i');
    $ddDone = ($r['dd']['state'] ?? '') === 'ready';
    $lines = array(
        'Hello ' . $p['first'] . ',', '',
        'Thank you for your order. Here is what you asked for:', '',
        '  ' . m365_what($r), '  ' . m365_money($r['monthly']) . ' a month (' . m365_money($r['each']) . ' per person), on a 12-month term', '  For ' . $r['biz']['name'], '',
        'On ' . $when . ' you told us you can agree this for the business, and you agreed to the Microsoft Customer Agreement, the 12-month term (cancel or reduce within 7 days of the order, then it runs for the 12 months and renews each year unless you tell us) and our terms.', '',
        $ddDone ? 'Your Direct Debit is set up.' : 'Your Direct Debit is not set up yet. You can finish it here: ' . $link, '',
        'What happens next: a member of our team checks your order and places it with Microsoft within one working day, then rings you to set up your email and your people. We take nothing until your licences are in place, and GoCardless emails you the date before each payment.', '',
        'Questions? Reply to this email or ring 01202 775566.', '', '365 Techies',
    );
    $text = implode("\n", $lines);
    $e = function ($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); };
    $html = '<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.55;color:#1d2433;max-width:560px">'
        . '<p>Hello ' . $e($p['first']) . ',</p><p>Thank you for your order. Here is what you asked for:</p>'
        . '<table style="border-collapse:collapse;margin:0 0 14px"><tr><td style="padding:2px 14px 2px 0;color:#5b6475">Licences</td><td><b>' . $e(m365_what($r)) . '</b></td></tr>'
        . '<tr><td style="padding:2px 14px 2px 0;color:#5b6475">Price</td><td>' . $e(m365_money($r['monthly'])) . ' a month (' . $e(m365_money($r['each'])) . ' per person), 12-month term</td></tr>'
        . '<tr><td style="padding:2px 14px 2px 0;color:#5b6475">For</td><td>' . $e($r['biz']['name']) . '</td></tr></table>'
        . '<p style="color:#5b6475;font-size:13px">On ' . $e($when) . ' you told us you can agree this for the business, and you agreed to the <a href="https://www.microsoft.com/licensing/docs/customeragreement">Microsoft Customer Agreement</a>, the 12-month term (cancel or reduce within 7 days of the order, then it runs for the 12 months and renews each year unless you tell us) and <a href="https://365techies.co.uk/terms/">our terms</a>.</p>'
        . ($ddDone ? '<p><b>Your Direct Debit is set up.</b></p>' : '<p><b>Your Direct Debit is not set up yet.</b> <a href="' . $e($link) . '">Finish setting it up</a>.</p>')
        . '<p>What happens next: a member of our team checks your order and places it with Microsoft within one working day, then rings you to set up your email and your people. We take nothing until your licences are in place, and GoCardless emails you the date before each payment.</p>'
        . '<p>Questions? Reply to this email or ring <a href="tel:+441202775566">01202 775566</a>.</p><p>365 Techies</p></div>';
    return array('Your Microsoft 365 order with 365 Techies', $text, $html);
}
function m365_ddlink_email($r, $url) {
    $p = $r['person'];
    $text = "Hello " . $p['first'] . ",\n\nHere is a fresh link to set up the Direct Debit for your Microsoft 365 order (" . m365_what($r) . ", " . m365_money($r['monthly'])
        . " a month):\n\n" . $url . "\n\nIt opens GoCardless's secure page, where you enter your bank details. We never see them. The link is for you only and works once.\n\nQuestions? Ring 01202 775566.\n\n365 Techies";
    $e = function ($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); };
    $html = '<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.55;color:#1d2433;max-width:560px"><p>Hello ' . $e($p['first']) . ',</p>'
        . '<p>Here is a fresh link to set up the Direct Debit for your Microsoft 365 order (' . $e(m365_what($r)) . ', ' . $e(m365_money($r['monthly'])) . ' a month):</p>'
        . '<p><a href="' . $e($url) . '" style="display:inline-block;padding:10px 18px;background:#1a73e8;color:#fff;border-radius:8px;text-decoration:none">Set up the Direct Debit</a></p>'
        . '<p style="color:#5b6475;font-size:13px">It opens GoCardless&rsquo;s secure page, where you enter your bank details. We never see them. The link is for you only and works once.</p>'
        . '<p>Questions? Ring <a href="tel:+441202775566">01202 775566</a>.</p><p>365 Techies</p></div>';
    return array('Set up the Direct Debit for your Microsoft 365 order', $text, $html);
}

/* What the customer's own browser may see about their order: no address, no history. */
function m365_public($r) {
    return array('id' => (string)$r['id'], 'state' => m365_state($r), 'dd' => (string)($r['dd']['state'] ?? 'none'),
        'plan' => (string)$r['plan_name'], 'qty' => (int)$r['qty'], 'monthly' => m365_money($r['monthly']), 'each' => m365_money($r['each']),
        'biz' => (string)$r['biz']['name'], 'first' => (string)$r['person']['first'], 'email' => (string)$r['person']['email']);
}
/* Everything for staff, minus the secret's hash and a still-live Direct Debit page (single-use, the customer's). */
function m365_staff($r) {
    $o = $r;
    unset($o['kh']);
    if (isset($o['dd']['url'])) unset($o['dd']['url']);
    $o['state'] = m365_state($r);
    $o['monthly_txt'] = m365_money($r['monthly']);
    $o['each_txt'] = m365_money($r['each']);
    $o['email_now_txt'] = m365_email_now_words($r['email_now']);
    return $o;
}

/* ---- the cron and the webhook ----------------------------------------------------------------------------------- */
/* One order's Direct Debit asked about directly and written down; says so in Slack once when it changes. Used by the
   cron, the webhook and the staff "Check" button. Returns the new dd state ('' if the order is unknown). */
function m365_dd_refresh($id, $now = null) {
    $now = $now === null ? time() : (int)$now;
    $row = m365_find($id);
    if (!$row || empty($row['dd']['br'])) return '';
    $tmp = $row;
    $change = m365_dd_check($tmp, $now);               // network, with no lock held
    $res = m365_update($id, function (&$r) use ($tmp, $change, $now) {
        if ((string)($r['dd']['br'] ?? '') !== (string)($tmp['dd']['br'] ?? '')) return 'moved';   // a new link was made meanwhile
        $r['dd'] = $tmp['dd'];
        if ($change === 'ready') m365_add_log($r, 'GoCardless', 'Direct Debit set up', $now);
        if ($change === 'failed') m365_add_log($r, 'GoCardless', 'Direct Debit not set up: ' . (string)($tmp['dd']['why'] ?? ''), $now);
        return '';
    });
    if (empty($res['ok'])) return (string)($row['dd']['state'] ?? '');
    $r = $res['row'];
    if ($change === 'ready') {
        m365_note(':white_check_mark: Microsoft 365 order ' . m365_tag($r) . ': the Direct Debit is set up. '
            . ($r['email_now'] === 'microsoft' ? 'They already have Microsoft 365 - order it by hand in Pax8.' : 'Ready to order in Pax8.')
            . ' <' . m365_portal_link($r['id']) . '|Open it>');
    } elseif ($change === 'failed') {
        m365_note(':warning: Microsoft 365 order ' . m365_tag($r) . ': the Direct Debit was not set up (' . mm_esc((string)($r['dd']['why'] ?? '')) . '). <' . m365_portal_link($r['id']) . '|Open it>');
    }
    return (string)$r['dd']['state'];
}
/* A GoCardless event about one of OUR orders' billing requests or mandates -> ask GoCardless directly. The event itself
   is never taken at its word for the state; it only says which order to look at. Returns the order id or ''. */
function m365_event_match($ev) {   // no network: which of our orders, if any
    $l = (isset($ev['links']) && is_array($ev['links'])) ? $ev['links'] : array();
    $br = (string)($l['billing_request'] ?? ''); $md = (string)($l['mandate'] ?? '');
    if (($br === '' && $md === '') || !is_file(M365_STORE)) return '';
    foreach (m365_store_read()['orders'] as $r) {
        $hit = ($br !== '' && (string)($r['dd']['br'] ?? '') === $br) || ($md !== '' && (string)($r['dd']['mandate'] ?? '') === $md);
        if ($hit) return (string)$r['id'];
    }
    return '';
}
function m365_event($ev) {
    $id = m365_event_match($ev);
    if ($id !== '') m365_dd_refresh($id);
    return $id;
}
/* The cron tick: orders whose Direct Debit is still waiting, after the webhook's head start, not asked about recently,
   younger than M365_WAIT_DAYS. Oldest first, a few calls a tick. */
function m365_sweep($limit = 5, $now = null) {
    $now = $now === null ? time() : (int)$now;
    $out = array('waiting' => 0, 'checked' => 0, 'ready' => 0);
    if (!is_file(M365_STORE) || m365_gc_token() === '') return $out;
    $due = array();
    foreach (m365_store_read()['orders'] as $r) {
        if (!empty($r['cancelled']) || ($r['dd']['state'] ?? '') !== 'waiting') continue;
        $out['waiting']++;
        $age = $now - (int)($r['dd']['at'] ?? $r['at']);
        if ($age < M365_MIN_AGE || $age > M365_WAIT_DAYS * 86400) continue;
        if ((int)($r['dd']['checked_at'] ?? 0) > $now - M365_RECHECK) continue;
        $due[] = $r;
    }
    usort($due, function ($a, $b) { return (int)$a['at'] - (int)$b['at']; });
    foreach (array_slice($due, 0, $limit) as $r) {
        $s = m365_dd_refresh($r['id'], $now);
        $out['checked']++;
        if ($s === 'ready') $out['ready']++;
        // stamp the attempt whatever the answer, so one order GoCardless won't answer for cannot eat every tick
        m365_update($r['id'], function (&$x) use ($now) { $x['dd']['checked_at'] = $now; return ''; });
    }
    return $out;
}
