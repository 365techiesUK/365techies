<?php
/*
 * 365 PC Manager - the paid app for people abroad: "Unlock everything" (8 Oct 2026). SWITCHED OFF until the owner says go.
 *
 * WHY (owner, 7-8 Oct): "could we ... because it detects they're in America ... give them an option to pay so much per
 * month ... or buy it outright ... to activate it all" - then "yes do both". Agreed on 1 Oct: an app-only tier of its own
 * ('plus', separate from 'pro'), sold through a merchant of record (Paddle or Lemon Squeezy - the owner chooses and sets
 * the price) so tax, cards, PayPal, refunds and cancellations are theirs; NEVER shown or sellable to a PC linked to a
 * customer record (support customers must not see a cheaper option). The free app keeps the "do it for me" tools locked
 * behind a support plan; outside the UK the lock offers "Unlock everything" instead: the tools, no visits, email support.
 *
 * WHO IS OFFERED IT (plus_offer_out, added to a KEYLESS check-in's answer only):
 *   switched off ($BUY_ON false or no https checkout link in api/pcm-buy-config.php, or api/pcm-buy.off exists on the
 *   server) -> nothing added: the app behaves exactly as before. On: the country of the check-in's address (pcm-geoip-lib.php) - the UK and the Crown dependencies
 *   (GB, IM, JE, GG) or not known -> offer 'plan' (our support plans, as now); anywhere else -> offer 'buy' with the
 *   checkout link and the price as the owner wrote it. A PC with a customer key never reaches this (pcm.php).
 *
 * KEYS ("UNLK-XXXX-XXXX-XXXX", never like a customer key): issued by staff in the portal (testing, or a sale made by
 * hand) and, once the owner picks the payment company, by its webhook. Kept as a one-way hash only (the key is shown once,
 * to whoever issues it); email (to find a buyer's key), when, until when (0 = lifetime), status, up to PLUS_MAX_PCS PCs
 * (hashed machine ids, like the install count). Store api/pcm-plus.json (+ .lock): .htaccess-denied, gitignored.
 *
 * Config (in git - nothing secret in it - and .htaccess-denied): api/pcm-buy-config.php. The PRICES ($BUY_PRICE, $BUY_USD,
 * the $BUY_LOW_ three, $UK_GBP, $UK_PRICE) are in api/pcm-buy-prices.php beside it: server-only, because the config is
 * public on GitHub (29 Oct 2026). plus_config() reads the prices file first, so its lines win; no price, nothing on sale.
 *   $BUY_ON = false;                 the switch (the owner's go -> true, deployed)
 *   $BUY_URL = 'https://...';        the checkout page; "{id}" in it is replaced with the install's anonymous id
 *   $BUY_PRICE = '$29 a year';       shown as written, beside the button
 *   $BUY_PROVIDER = 'paddle';        or 'lemonsqueezy' - recorded with keys its webhook issues (later)
 *   $BUY_USD = '12.34';              the price in US dollars: adds "about €10" in the buyer's money (PLUS_FX_FILE)
 *   $BUY_LOW_USD / $BUY_LOW_PRICE / $BUY_LOW_CODE   the lower price in PLUS_LOW_PRICE's countries: the checkout link
 *                                    carries the Lemon Squeezy discount code that makes it so (all three, or no lower price)
 * Stop at once, without a deploy: create api/pcm-buy.off on the server (gitignored).
 *
 * Library only - constants and functions (no globals). NO closing tag in this file.
 */
require_once __DIR__ . '/pcm-geoip-lib.php';

if (!defined('PLUS_FILE')) define('PLUS_FILE', __DIR__ . '/pcm-plus.json');
if (!defined('PLUS_OFF')) define('PLUS_OFF', __DIR__ . '/pcm-buy.off');
if (!defined('PLUS_CONFIG')) define('PLUS_CONFIG', __DIR__ . '/pcm-buy-config.php');
if (!defined('PLUS_MAX_PCS')) define('PLUS_MAX_PCS', 3);
if (!defined('PLUS_FX_FILE')) define('PLUS_FX_FILE', __DIR__ . '/pcm-fx.json');   // the day's exchange rates (gitignored)
define('PLUS_ALPHA', '23456789ABCDEFGHJKMNPQRSTUVWXYZ');   // no 0/O, 1/I/L: read over the phone or copied by hand

function plus_cut($s, $n) { $s = (string)$s; return function_exists('mb_substr') ? mb_substr($s, 0, $n) : substr($s, 0, $n); }
function plus_is_key($key) { return (bool)preg_match('/^UNLK(-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}){3}$/', strtoupper(trim((string)$key))); }
function plus_hash($key) { return hash('sha256', '365plus|' . strtoupper(trim((string)$key))); }
function plus_mhash($machine) { $m = preg_replace('/[^a-f0-9]/', '', strtolower((string)$machine)); return strlen($m) >= 8 ? substr(sha1('365inst|' . $m), 0, 16) : ''; }

/* ---------------- the switch and the offer ---------------- */
// 29 Oct 2026 (owner: "move the prices off GitHub"): the prices file sits beside whichever config is read (a test's too)
function plus_prices_file($config = null) { return dirname($config !== null ? $config : PLUS_CONFIG) . '/pcm-buy-prices.php'; }
function plus_config($file = null) {
    $cf = $file !== null ? $file : PLUS_CONFIG;
    // the server-only prices first: the first line naming a setting is the one read, so a price there wins
    $src = (string)@file_get_contents(plus_prices_file($cf)) . "\n" . (string)@file_get_contents($cf);
    // a setting is a line of its own: words in the file's comments never count (its doc comment says "$BUY_ON = true;")
    $g = function ($n) use ($src) { return preg_match('/^[ \t]*\$' . $n . '\s*=\s*([\'"])(.*?)\1\s*;/m', $src, $m) ? $m[2] : ''; };
    $url = $g('BUY_URL');
    $usd = function ($n) use ($g) { $v = trim($g($n)); return preg_match('/^\d{1,4}(\.\d{1,2})?$/', $v) && (float)$v > 0 ? $v : ''; };
    // 12 Oct 2026: PayPal - where we may sell as the seller ourselves (pcm-plus-pp-lib.php)
    $pp = array(); foreach (preg_split('/[\s,]+/', strtoupper($g('PP_COUNTRIES'))) as $cc) if (preg_match('/^[A-Z]{2}$/', $cc)) $pp[] = $cc;
    // 12 Oct 2026: FastSpring (merchant of record) sells everywhere else (pcm-plus-fs-lib.php). Its popup checkout is
    // "<store>.test.onfastspring.com/<popup>" while testing and "<store>.onfastspring.com/<popup>" when live.
    $fsf = strtolower($g('FS_STOREFRONT')); $fsp = function ($n) use ($g) { $v = strtolower($g($n)); return preg_match('/^[a-z0-9][a-z0-9-]{0,59}$/', $v) ? $v : ''; };
    return array('on' => (bool)preg_match('/^[ \t]*\$BUY_ON\s*=\s*true\s*;/mi', $src), 'url' => preg_match('#^https://[^\s<>"\']+$#', $url) ? $url : '', 'price' => plus_cut($g('BUY_PRICE'), 40), 'provider' => preg_replace('/[^a-z]/', '', strtolower($g('BUY_PROVIDER'))),
        'usd' => $usd('BUY_USD'), 'low_usd' => $usd('BUY_LOW_USD'), 'low_price' => plus_cut($g('BUY_LOW_PRICE'), 40), 'low_code' => preg_match('/^[A-Za-z0-9_-]{3,40}$/', $g('BUY_LOW_CODE')) ? $g('BUY_LOW_CODE') : '',
        'pp_countries' => $pp,
        // 13 Oct 2026: the UK key ('off' | 'page' | 'on'), its price in pounds, and the automatic free month's start date
        'uk' => in_array(strtolower($g('BUY_UK')), array('page', 'on'), true) ? strtolower($g('BUY_UK')) : 'off',
        'uk_gbp' => $usd('UK_GBP'), 'uk_price' => plus_cut($g('UK_PRICE'), 40),
        'trial_uk_from' => preg_match('/^\d{4}-\d{2}-\d{2}$/', $g('TRIAL_AUTO_UK_FROM')) ? $g('TRIAL_AUTO_UK_FROM') : '',
        // 18 Oct 2026: the same automatic free month outside the UK, from its own start date ('' = off)
        'trial_abroad_from' => preg_match('/^\d{4}-\d{2}-\d{2}$/', $g('TRIAL_AUTO_ABROAD_FROM')) ? $g('TRIAL_AUTO_ABROAD_FROM') : '',
        'fs_storefront' => preg_match('#^[a-z0-9-]+(\.test)?\.onfastspring\.com/[a-z0-9-]+$#', $fsf) ? $fsf : '', 'fs_product' => $fsp('FS_PRODUCT'), 'fs_product_low' => $fsp('FS_PRODUCT_LOW'));
}
// FastSpring's mode from the storefront: '' (not set up) | 'test' (pretend money) | 'live'
function plus_fs_mode($cfg) {
    if (!is_array($cfg) || ($cfg['fs_storefront'] ?? '') === '' || ($cfg['fs_product'] ?? '') === '') return '';
    return strpos($cfg['fs_storefront'], '.test.onfastspring.com/') !== false ? 'test' : 'live';
}
function plus_enabled($off = null, $config = null) {
    $c = plus_config($config);
    // 29 Oct 2026: and a price - without the server-only prices file nothing is on sale (never a Buy button with no price)
    return $c['on'] && $c['url'] !== '' && $c['price'] !== '' && !file_exists($off !== null ? $off : PLUS_OFF);
}
// 11 Oct 2026 (owner: "do everything"): the countries Lemon Squeezy will not sell to (docs.lemonsqueezy.com, Supported
// countries, read 11 Oct 2026 - its page lists North Korea twice, so 17). A PC there is never offered Buy (the checkout
// could not take the money) and staff never give it a free month (the plan's simplest rule; UK sanctions not researched).
define('PLUS_NO_SALE', 'CF,CU,KP,CD,ER,GW,IR,IQ,LB,LY,ML,RU,SO,SS,SD,SY,YE');
function plus_no_sale($country) { $c = strtoupper(trim((string)$country)); return $c !== '' && in_array($c, explode(',', PLUS_NO_SALE), true); }
function plus_is_uk($country) { return in_array(strtoupper(trim((string)$country)), array('GB', 'IM', 'JE', 'GG'), true); }
// 13 Oct 2026: the UK key - sellable on our buy page ('page' or 'on', with a price), or offered in the app as well ('on')
function plus_uk_sells($cfg) { return is_array($cfg) && in_array($cfg['uk'] ?? 'off', array('page', 'on'), true) && ($cfg['uk_gbp'] ?? '') !== '' && ($cfg['uk_price'] ?? '') !== ''; }
function plus_uk_offered($cfg) { return plus_uk_sells($cfg) && $cfg['uk'] === 'on'; }
// What a keyless check-in's answer gains. $country: the check-in's country ('' = not known). $id: the install's anonymous id.
//   13 Oct 2026: in the UK with $BUY_UK 'on' -> offer 'both': our plans AND the key. An app older than build 39 knows only
//   'plan' and 'buy', so it treats 'both' as neither and keeps showing the plans, exactly as before.
function plus_offer_out($country, $id = '', $off = null, $config = null) {
    if (!plus_enabled($off, $config)) return array();
    $c = strtoupper((string)$country);
    if (plus_is_uk($c)) {
        $cfg = plus_config($config);
        if (plus_uk_offered($cfg) && $cfg['provider'] === 'paypal')
            return array('offer' => 'both', 'buy_url' => str_replace('{id}', rawurlencode((string)$id), $cfg['url']), 'buy_price' => $cfg['uk_price']);
        return array('offer' => 'plan');
    }
    if ($c === '') return array('offer' => 'plan');   // where we can't tell, our plans, as before - never a sale
    if (plus_no_sale($c)) return array();   // nothing to buy there: the free app, as if the paid app were switched off
    $cfg = plus_config($config);
    $paypal = $cfg['provider'] === 'paypal';
    // 12 Oct 2026, PayPal: we are the seller, so only in the countries pcm-buy-config.php $PP_COUNTRIES lists (no tax to register).
    // Everywhere else FastSpring sells it (it is the seller and pays the tax) - but only once its checkout is LIVE: while it
    // is testing, a buyer abroad would land on a checkout that cannot take real money.
    if ($paypal && !in_array($c, $cfg['pp_countries'], true) && plus_fs_mode($cfg) !== 'live') return array();
    $url = str_replace('{id}', rawurlencode((string)$id), $cfg['url']);
    // the lower price: with PayPal our own buy page charges it (pcm-plus-pp-lib.php pp_offer); with Lemon Squeezy, its
    // discount code, already filled in at its checkout (checkout[discount_code])
    // (FastSpring: its own cheaper product, pcm-buy-config.php $FS_PRODUCT_LOW)
    $viaFs = $paypal && !in_array($c, $cfg['pp_countries'], true);
    $low = plus_low_price($c) && $cfg['low_usd'] !== '' && $cfg['low_price'] !== '' && ($viaFs ? $cfg['fs_product_low'] !== '' : ($paypal || $cfg['low_code'] !== ''));
    if ($low && !$paypal) $url .= (strpos($url, '?') === false ? '?' : '&') . 'checkout[discount_code]=' . rawurlencode($cfg['low_code']);
    $line = $low ? $cfg['low_price'] : $cfg['price'];
    $usd = $low ? $cfg['low_usd'] : $cfg['usd'];
    // (no "about €18" where FastSpring sells it: its checkout adds any tax and shows the real amount in their money)
    $local = $usd !== '' && !$viaFs ? plus_local_amount($c, (float)$usd) : '';
    return array('offer' => 'buy', 'buy_url' => $url, 'buy_price' => $local !== '' ? plus_price_line($usd, $local, $line) : $line);
}

// 11 Oct 2026 (owner: "do $9.99 for those countries"): the lower price. The World Bank's low- and lower-middle-income
// economies (FY2027 list, read 11 Oct 2026 at datahelpdesk.worldbank.org/knowledgebase/articles/906519) plus Indonesia and
// the Philippines, which the owner named (both upper-middle now). Its no-sale countries (CF, CD, ER, GW, KP, LB, ML, SO, SS,
// SD, SY, YE) are left out: they are never offered anything.
define('PLUS_LOW_PRICE', 'AF,BF,BI,TD,ET,GM,LR,MG,MW,MZ,NE,RW,SL,UG,'
    . 'AO,BD,BJ,BT,BO,KH,CM,KM,CG,CI,DJ,EG,SZ,GH,GN,HT,HN,IN,KE,KI,KG,LA,LS,MR,MA,MM,NA,NP,NI,NG,PK,PG,ST,SN,SB,TJ,TZ,TL,TG,TN,UZ,VU,VE,PS,ZM,ZW,'
    . 'ID,PH');
function plus_low_price($country) { $c = strtoupper(trim((string)$country)); return $c !== '' && in_array($c, explode(',', PLUS_LOW_PRICE), true); }

// "About €17": what the US-dollar price comes to in the buyer's own money, so they needn't work it out. Shown only - Lemon
// Squeezy charges everyone in US dollars ("processes all transactions in US dollars (USD)", its Currencies doc, 11 Oct 2026)
// and their bank converts. Countries whose money the European Central Bank's daily rates cover; anywhere else, US$ alone.
function plus_currency($country) {
    static $map = null;
    if ($map === null) {
        $map = array();
        // the euro area (Bulgaria from 1 Jan 2026) and the places that use the euro
        foreach (explode(',', 'AT,BE,BG,HR,CY,EE,FI,FR,DE,GR,IE,IT,LV,LT,LU,MT,NL,PT,SK,SI,ES,AD,MC,SM,VA,ME,XK,GP,MQ,GF,RE,YT') as $cc) $map[$cc] = array('EUR', "\u{20AC}", '');
        $o = array('CA' => array('CAD', 'C$', ''), 'AU' => array('AUD', 'A$', ''), 'NZ' => array('NZD', 'NZ$', ''), 'JP' => array('JPY', "\u{00A5}", ''),
            'CH' => array('CHF', 'CHF ', ''), 'LI' => array('CHF', 'CHF ', ''), 'NO' => array('NOK', '', ' kr'), 'SE' => array('SEK', '', ' kr'),
            'DK' => array('DKK', '', ' kr'), 'FO' => array('DKK', '', ' kr'), 'GL' => array('DKK', '', ' kr'), 'IS' => array('ISK', '', ' kr'),
            'CZ' => array('CZK', '', " K\u{010D}"), 'PL' => array('PLN', '', " z\u{0142}"), 'HU' => array('HUF', '', ' Ft'), 'RO' => array('RON', '', ' lei'),
            'TR' => array('TRY', "\u{20BA}", ''), 'BR' => array('BRL', 'R$', ''), 'CN' => array('CNY', "CN\u{00A5}", ''), 'HK' => array('HKD', 'HK$', ''),
            'ID' => array('IDR', 'Rp', ''), 'IL' => array('ILS', "\u{20AA}", ''), 'IN' => array('INR', "\u{20B9}", ''), 'KR' => array('KRW', "\u{20A9}", ''),
            'MX' => array('MXN', 'MX$', ''), 'MY' => array('MYR', 'RM', ''), 'PH' => array('PHP', "\u{20B1}", ''), 'SG' => array('SGD', 'S$', ''),
            'TH' => array('THB', "\u{0E3F}", ''), 'ZA' => array('ZAR', 'R', ''));
        $map += $o;
    }
    $c = strtoupper(trim((string)$country));
    return isset($map[$c]) ? $map[$c] : null;
}
// rounded the way a person would say it: €17, ₹880, ¥3,000, Rp166,000
function plus_about($a) {
    $r = $a < 100 ? round($a) : ($a < 1000 ? round($a / 10) * 10 : ($a < 10000 ? round($a / 100) * 100 : round($a / 1000) * 1000));
    return number_format($r, 0, '.', ',');
}
function plus_local_amount($country, $usd, $now = null) {
    $cur = plus_currency($country);
    if ($cur === null || $usd <= 0) return '';
    $fx = plus_fx($now);
    if (!isset($fx[$cur[0]]) || $fx[$cur[0]] <= 0) return '';
    return $cur[1] . plus_about($usd * $fx[$cur[0]]) . $cur[2];
}
// the app shows 40 characters at most: the fullest wording that fits, else the price as the owner wrote it
function plus_price_line($usd, $local, $fallback) {
    $u = 'US$' . $usd;
    foreach (array($u . ' (about ' . $local . ') a year, no renewal', $u . '/yr (about ' . $local . '), no renewal', $u . ' a year (about ' . $local . ')') as $s)
        if (preg_match_all('/./us', $s) <= 40) return $s;
    return $fallback;
}
// The European Central Bank's euro reference rates, turned into "per US dollar": fetched at most once a day (a failed try
// waits an hour), kept in PLUS_FX_FILE, and not used once more than 10 days old. Never fetched when PLUS_FX_NOFETCH is
// defined (the tests). $fetch: a function returning the ECB's XML (tests).
function plus_fx($now = null, $fetch = null) {
    $now = $now === null ? time() : (int)$now;
    $d = json_decode((string)@file_get_contents(PLUS_FX_FILE), true);
    if (!is_array($d)) $d = array();
    $at = (int)($d['at'] ?? 0); $tried = (int)($d['tried'] ?? 0);
    if (($fetch !== null || !defined('PLUS_FX_NOFETCH')) && $now - $at > 20 * 3600 && $now - $tried > 3600) {
        $lk = @fopen(PLUS_FX_FILE . '.lock', 'c');
        if ($lk && flock($lk, LOCK_EX | LOCK_NB)) {   // one refresh at a time; anyone else uses what is there
            $xml = $fetch !== null ? (string)call_user_func($fetch) : plus_fx_ecb();
            $fresh = plus_fx_parse($xml);
            $d = $fresh !== null ? array('at' => $now, 'tried' => $now, 'date' => $fresh['date'], 'per_usd' => $fresh['per_usd']) : array('tried' => $now) + $d;
            $tmp = PLUS_FX_FILE . '.tmp' . getmypid();
            if (@file_put_contents($tmp, json_encode($d)) !== false) @rename($tmp, PLUS_FX_FILE);
            flock($lk, LOCK_UN);
        }
        if ($lk) fclose($lk);
        $at = (int)($d['at'] ?? 0);
    }
    return $at > 0 && $now - $at <= 10 * 86400 && isset($d['per_usd']) && is_array($d['per_usd']) ? $d['per_usd'] : array();
}
function plus_fx_ecb() {
    if (!function_exists('curl_init')) return '';
    $ch = curl_init('https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml');
    curl_setopt_array($ch, array(CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 6, CURLOPT_CONNECTTIMEOUT => 4, CURLOPT_FOLLOWLOCATION => true, CURLOPT_USERAGENT => '365techies.co.uk exchange rates (daily)'));
    $x = curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
    return $code === 200 && is_string($x) ? $x : '';
}
// <Cube time='2026-10-09'> <Cube currency='USD' rate='1.0812'/> ... (euros) -> per US dollar, the euro included
function plus_fx_parse($xml) {
    if (!preg_match("/time=['\"](\d{4}-\d\d-\d\d)['\"]/", (string)$xml, $t)) return null;
    if (!preg_match_all("/currency=['\"]([A-Z]{3})['\"]\s+rate=['\"]([0-9.]+)['\"]/", (string)$xml, $m, PREG_SET_ORDER)) return null;
    $eur = array(); foreach ($m as $x) if ((float)$x[2] > 0) $eur[$x[1]] = (float)$x[2];
    if (!isset($eur['USD']) || $eur['USD'] < 0.5 || $eur['USD'] > 2 || count($eur) < 20) return null;
    $per = array('EUR' => round(1 / $eur['USD'], 6));
    foreach ($eur as $cur => $r) if ($cur !== 'USD') $per[$cur] = round($r / $eur['USD'], 6);
    return array('date' => $t[1], 'per_usd' => $per);
}

/* ---------------- the keys ---------------- */
function plus_load($file = null) {
    $raw = @file_get_contents($file !== null ? $file : PLUS_FILE);
    if ($raw === false || $raw === '') return array('v' => 1, 'keys' => array());
    $d = json_decode($raw, true);
    return (is_array($d) && isset($d['keys']) && is_array($d['keys'])) ? $d : null;   // null = unreadable: never overwrite it
}
// Run $fn(&$d) under the lock; saved only when it returns exactly true. Returns its result, or false (busy / unreadable /
// not saved).
function plus_locked($fn, $file = null) {
    $file = $file !== null ? $file : PLUS_FILE;
    $lk = @fopen($file . '.lock', 'c');
    if (!$lk) return false;
    if (!@flock($lk, LOCK_EX)) { fclose($lk); return false; }
    $res = false;
    try {
        $d = plus_load($file);
        if ($d === null) return false;
        $res = $fn($d);
        if ($res === true) {
            $tmp = $file . '.' . getmypid() . '.tmp';
            $ok = @file_put_contents($tmp, json_encode($d, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)) !== false;
            if ($ok) { $ok = @rename($tmp, $file); if (!$ok && DIRECTORY_SEPARATOR === '\\') { @unlink($file); $ok = @rename($tmp, $file); } }
            if (!$ok) { @unlink($tmp); $res = false; }
        }
    } finally {
        @flock($lk, LOCK_UN); fclose($lk);
    }
    return $res;
}
function plus_new_key() {
    $a = PLUS_ALPHA; $k = 'UNLK';
    for ($g = 0; $g < 3; $g++) { $k .= '-'; for ($i = 0; $i < 4; $i++) $k .= $a[random_int(0, strlen($a) - 1)]; }
    return $k;
}
// A new key. $years 0 = lifetime. Returns array(key, id) - the key itself only here, never again - or null.
function plus_issue($email, $years, $by, $provider = 'staff', $order = '', $note = '', $now = null, $file = null) {
    $now = $now === null ? time() : (int)$now;
    $email = strtolower(trim((string)$email));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) return null;
    $years = max(0, min(10, (int)$years));
    $out = null;
    $ok = plus_locked(function (&$d) use ($email, $years, $by, $provider, $order, $note, $now, &$out) {
        do { $key = plus_new_key(); $h = plus_hash($key); } while (isset($d['keys'][$h]));
        $id = bin2hex(random_bytes(5));
        $d['keys'][$h] = array('id' => $id, 'last4' => substr($key, -4), 'email' => $email, 'created' => $now,
            'expires' => $years ? strtotime('+' . $years . ' year', $now) : 0, 'status' => 'active',
            'provider' => substr(preg_replace('/[^a-z]/', '', (string)$provider), 0, 20), 'order' => substr((string)$order, 0, 60),
            'note' => plus_cut($note, 120), 'by' => plus_cut($by, 30), 'pcs' => array());
        $out = array($key, $id);
        return true;
    }, $file);
    return $ok ? $out : null;
}
// Is this key good for this PC? $bind: activation - add the PC if there is room. -> {ok, error?, expires}
//   error: unknown | revoked | expired | too_many_pcs | not_this_pc | busy
function plus_check($key, $machine, $bind, $now = null, $file = null) {
    $now = $now === null ? time() : (int)$now;
    if (!plus_is_key($key)) return array('ok' => false, 'error' => 'unknown');
    $h = plus_hash($key); $mh = plus_mhash($machine);
    $d = plus_load($file);
    if ($d === null) return array('ok' => false, 'error' => 'busy');
    if (!isset($d['keys'][$h])) return array('ok' => false, 'error' => 'unknown');
    $e = $d['keys'][$h];
    if (($e['status'] ?? '') !== 'active') return array('ok' => false, 'error' => 'revoked');
    if ((int)$e['expires'] && (int)$e['expires'] < $now) return array('ok' => false, 'error' => 'expired', 'expires' => (int)$e['expires']);
    if ($mh === '') return array('ok' => false, 'error' => 'not_this_pc');
    $day = gmdate('Y-m-d', $now);
    $max = isset($e['max']) ? max(1, (int)$e['max']) : PLUS_MAX_PCS;   // (a free month: its own PC only)
    if (isset($e['pcs'][$mh])) {
        if ((string)($e['pcs'][$mh]['last'] ?? '') !== $day)   // seen: at most one write a day
            plus_locked(function (&$d) use ($h, $mh, $day) { if (!isset($d['keys'][$h]['pcs'][$mh])) return false; $d['keys'][$h]['pcs'][$mh]['last'] = $day; return true; }, $file);
        return array('ok' => true, 'expires' => (int)$e['expires']);
    }
    if (!$bind) return array('ok' => false, 'error' => 'not_this_pc');
    $r = plus_locked(function (&$d) use ($h, $mh, $day, $max) {
        if (!isset($d['keys'][$h])) return false;
        if (count($d['keys'][$h]['pcs']) >= $max) return 'full';
        $d['keys'][$h]['pcs'][$mh] = array('first' => $day, 'last' => $day);
        return true;
    }, $file);
    if ($r === 'full') return array('ok' => false, 'error' => 'too_many_pcs');
    return $r === true ? array('ok' => true, 'expires' => (int)$e['expires']) : array('ok' => false, 'error' => 'busy');
}
// ---- keys bought through the payment company (8 Oct 2026: Lemon Squeezy, chosen by the owner) ----
// One key per order, whatever the webhook's retries: an order already holding a key gets nothing new. Returns
// array(key or '' when it already had one, id, is_new) or null (busy / unreadable / no email).
function plus_issue_for_order($email, $years, $provider, $order, $note, $extra = array(), $now = null, $file = null) {
    $now = $now === null ? time() : (int)$now;
    $email = strtolower(trim((string)$email));
    $provider = substr(preg_replace('/[^a-z]/', '', (string)$provider), 0, 20); $order = substr((string)$order, 0, 60);
    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $provider === '' || $order === '') return null;
    $years = max(0, min(10, (int)$years));
    $out = null;
    $ok = plus_locked(function (&$d) use ($email, $years, $provider, $order, $note, $extra, $now, &$out) {
        foreach ($d['keys'] as $e) if (($e['provider'] ?? '') === $provider && (string)($e['order'] ?? '') === $order) { $out = array('', $e['id'], false); return 'have'; }
        do { $key = plus_new_key(); $h = plus_hash($key); } while (isset($d['keys'][$h]));
        $id = bin2hex(random_bytes(5));
        $d['keys'][$h] = array('id' => $id, 'last4' => substr($key, -4), 'email' => $email, 'created' => $now,
            'expires' => $years ? strtotime('+' . $years . ' year', $now) : 0, 'status' => 'active', 'provider' => $provider, 'order' => $order,
            'note' => plus_cut($note, 120), 'by' => 'checkout', 'pcs' => array(),
            'install' => preg_replace('/[^a-f0-9]/', '', substr((string)($extra['install'] ?? ''), 0, 16)), 'test' => !empty($extra['test']))
            // 13 Oct 2026: a key bought in the UK, in pounds (it may ask us for a report look-over, like a free month)
            + (!empty($extra['uk']) ? array('uk' => true) : array());
        $out = array($key, $id, true);
        return true;
    }, $file);
    return ($ok === true || $ok === 'have') ? $out : null;
}
function plus_find_order($provider, $order, $file = null) {
    $d = plus_load($file);
    foreach (($d ? $d['keys'] : array()) as $e) if (($e['provider'] ?? '') === (string)$provider && (string)($e['order'] ?? '') === (string)$order) return (string)$e['id'];
    return '';
}
// A subscription's paid-up date moved (renewal, cancellation, expiry): the key now ends then (0 = never).
function plus_set_expires($id, $expires, $file = null) {
    return plus_locked(function (&$d) use ($id, $expires) {
        foreach ($d['keys'] as $h => $e) if (($e['id'] ?? '') === (string)$id) { if ((int)$e['expires'] === (int)$expires) return false; $d['keys'][$h]['expires'] = (int)$expires; return true; }
        return false;
    }, $file) === true;
}
// Staff: a buyer lost the email - a NEW key for the same buyer and order (the old one stops working; keys are kept only as
// hashes, so the old one cannot be shown again). Returns array(key, id) or null.
function plus_reissue($id, $by, $now = null, $file = null) {
    $now = $now === null ? time() : (int)$now;
    $out = null;
    $ok = plus_locked(function (&$d) use ($id, $by, $now, &$out) {
        foreach ($d['keys'] as $h => $e) {
            if (($e['id'] ?? '') !== (string)$id) continue;
            do { $key = plus_new_key(); $h2 = plus_hash($key); } while (isset($d['keys'][$h2]));
            $nid = bin2hex(random_bytes(5));
            $d['keys'][$h2] = array_merge($e, array('id' => $nid, 'last4' => substr($key, -4), 'created' => $now, 'status' => 'active', 'pcs' => array(), 'runs' => 0, 'last_run' => 0,
                'by' => plus_cut($by, 30), 'note' => plus_cut(trim(($e['note'] ?? '') . ' (new key for ...' . ($e['last4'] ?? '') . ')'), 120)));
            $d['keys'][$h]['status'] = 'revoked';
            $d['keys'][$h]['order'] = (string)($e['order'] ?? '') !== '' ? $e['order'] . '#replaced' : '';   // the order now belongs to the new key
            $out = array($key, $nid);
            return true;
        }
        return false;
    }, $file);
    return $ok === true ? $out : null;
}
// The email with the key (from info@, through the website's own sender - the caller has loaded pcm-review.php with RV_LIB).
function plus_key_email($key, $expires) {
    $until = (int)$expires ? 'It works until ' . gmdate('j F Y', (int)$expires) . '.' : 'It never runs out.';
    return array('Your 365 PC Manager key: Unlock everything',
        "Hello,\n\nThank you for buying Unlock everything for 365 PC Manager.\n\nYour key:  " . $key . "\n\n"
        . "To use it: open 365 PC Manager, click \"Unlock everything\" at the top, type the key and click Unlock.\n"
        . "One key works on up to " . PLUS_MAX_PCS . " PCs. " . $until . "\n\n"
        . "Haven't got the app yet? It's free: https://365techies.co.uk/free-pc-health-check/\n\n"
        . "Any questions, just reply to this email - a real person will answer.\n\n365 Techies\nhttps://365techies.co.uk\n");
}
function plus_send_key($to, $key, $expires) {
    if (!function_exists('rv_send_raw')) return false;
    list($subj, $body) = plus_key_email($key, $expires);
    return (bool)rv_send_raw($to, $subj, $body);
}

// ---- Lemon Squeezy's webhook (api/pcm-plus-ls.php) ----
// The request is genuine only if X-Signature is the HMAC-SHA256 hex of the RAW body with the signing secret the owner set
// in Lemon Squeezy and in api/pcm-ls-secret.php ($LS_WEBHOOK_SECRET - server-only, never in git).
// The file may be one line (<?php $LS_WEBHOOK_SECRET = '...';, as the owner's steps show it) or several, with or without a BOM.
function plus_ls_secret($file = null) {
    $src = (string)@file_get_contents($file !== null ? $file : __DIR__ . '/pcm-ls-secret.php');
    return preg_match('/^(?:\xEF\xBB\xBF)?[ \t]*(?:<\?php\s+)?\$LS_WEBHOOK_SECRET\s*=\s*([\'"])(.+?)\1\s*;/m', $src, $m) ? $m[2] : '';
}
function plus_ls_signed($raw, $sig, $secret) {
    return $secret !== '' && is_string($sig) && $sig !== '' && hash_equals(hash_hmac('sha256', (string)$raw, $secret), strtolower(trim($sig)));
}
// "12345:year, 67890:life" (pcm-buy-config.php $LS_VARIANTS) -> years for this variant: 1 by default, 0 for a lifetime one
function plus_ls_years($variant, $config = null) {
    $src = (string)@file_get_contents($config !== null ? $config : PLUS_CONFIG);
    $map = preg_match('/^[ \t]*\$LS_VARIANTS\s*=\s*([\'"])(.*?)\1\s*;/m', $src, $m) ? $m[2] : '';
    foreach (preg_split('/\s*,\s*/', $map) as $pair) if (preg_match('/^(\d+)\s*:\s*(year|life)$/', trim($pair), $p) && $p[1] === (string)$variant) return $p[2] === 'life' ? 0 : 1;
    return 1;
}
// One webhook delivery. $mail($to, $key, $expires) sends the key. -> array(http status, short answer for the log)
//   200 = done or deliberately ignored; 401 = not signed by our secret; 503 = no secret on the server yet (Lemon Squeezy
//   tries again); 409 = a subscription arrived before its order (it tries again - by then the order has its key).
function plus_ls_handle($raw, $sig, $secret, $mail, $now = null, $file = null, $config = null) {
    $now = $now === null ? time() : (int)$now;
    if ($secret === '') return array(503, 'no signing secret on the server yet');
    if (!plus_ls_signed($raw, $sig, $secret)) return array(401, 'bad signature');
    $j = json_decode((string)$raw, true);
    if (!is_array($j) || !isset($j['meta']['event_name'], $j['data']['id'])) return array(200, 'not an event we read');
    $ev = (string)$j['meta']['event_name']; $a = isset($j['data']['attributes']) && is_array($j['data']['attributes']) ? $j['data']['attributes'] : array();
    $test = !empty($j['meta']['test_mode']) || !empty($a['test_mode']);
    $custom = isset($j['meta']['custom_data']) && is_array($j['meta']['custom_data']) ? $j['meta']['custom_data'] : array();
    $iso = function ($s) { $t = $s ? strtotime((string)$s) : false; return $t ? (int)$t : 0; };
    if ($ev === 'order_created') {
        if (($a['status'] ?? '') !== 'paid') return array(200, 'order not paid (' . ($a['status'] ?? '?') . ')');
        $years = plus_ls_years($a['first_order_item']['variant_id'] ?? '', $config);
        $note = 'Lemon Squeezy order #' . (int)($a['order_number'] ?? 0) . ($test ? ' (TEST)' : '') . (isset($a['currency'], $a['total']) ? ' ' . preg_replace('/[^A-Z]/', '', (string)$a['currency']) . ' ' . number_format(((int)$a['total']) / 100, 2) : '')
            // the variant's number, so the owner can list a lifetime option in $LS_VARIANTS after one test purchase
            . ((int)($a['first_order_item']['variant_id'] ?? 0) ? ', variant ' . (int)$a['first_order_item']['variant_id'] . ($years === 0 ? ' (lifetime)' : ' (a year)') : '');
        $r = plus_issue_for_order($a['user_email'] ?? '', $years, 'lemonsqueezy', (string)$j['data']['id'], $note, array('install' => $custom['install'] ?? '', 'test' => $test), $now, $file);
        if ($r === null) return array(500, 'could not store the key - try again');
        if (!$r[2]) return array(200, 'order already has its key');
        $d = plus_load($file); $exp = 0; foreach (($d ? $d['keys'] : array()) as $e) if ($e['id'] === $r[1]) $exp = (int)$e['expires'];
        $sent = (bool)call_user_func($mail, strtolower(trim((string)$a['user_email'])), $r[0], $exp);
        return array(200, 'key ' . $r[1] . ' made' . ($sent ? ' and emailed' : ' - EMAIL FAILED: send a new key from the card'));
    }
    if ($ev === 'order_refunded') {
        $id = plus_find_order('lemonsqueezy', (string)$j['data']['id'], $file);
        if ($id === '') return array(200, 'refund for an order with no key');
        if (empty($a['refunded']) && ($a['status'] ?? '') !== 'refunded') return array(200, 'partial refund - key kept');
        plus_set_status($id, 'revoked', $file);
        return array(200, 'key ' . $id . ' switched off (refunded)');
    }
    if (strpos($ev, 'subscription_') === 0 && isset($a['order_id'])) {
        $id = plus_find_order('lemonsqueezy', (string)$a['order_id'], $file);
        if ($id === '') return array(409, 'subscription before its order - try again');
        $st = (string)($a['status'] ?? '');
        if (in_array($st, array('active', 'on_trial', 'past_due'), true)) { $ren = $iso($a['renews_at'] ?? ''); if (!$ren) return array(200, 'no renewal date'); $exp = $ren + 7 * 86400; }   // a week's grace for a late payment
        elseif ($st === 'cancelled') { $exp = $iso($a['ends_at'] ?? '') ?: $now; }   // paid up to the end of the period
        elseif (in_array($st, array('expired', 'unpaid', 'paused'), true)) { $exp = min($now, $iso($a['ends_at'] ?? '') ?: $now); }
        else return array(200, 'subscription status ' . $st . ' - nothing to do');
        plus_set_expires($id, $exp, $file);
        return array(200, 'key ' . $id . ' now runs to ' . gmdate('Y-m-d', $exp) . ' (' . $st . ')');
    }
    return array(200, 'event ' . $ev . ' - nothing to do');
}

// A full service served to this key (pcm-service.php): counted for the staff card. Best effort - never in the service's way.
function plus_note_run($key, $now = null, $file = null) {
    $now = $now === null ? time() : (int)$now;
    if (!plus_is_key($key)) return false;
    $h = plus_hash($key);
    return plus_locked(function (&$d) use ($h, $now) {
        if (!isset($d['keys'][$h])) return false;
        $d['keys'][$h]['runs'] = (int)($d['keys'][$h]['runs'] ?? 0) + 1;
        $d['keys'][$h]['last_run'] = $now;
        return true;
    }, $file) === true;
}
// Staff: switch a key off (refund, abuse) or back on; free a PC slot.
function plus_set_status($id, $status, $file = null) {
    if (!in_array($status, array('active', 'revoked'), true)) return false;
    return plus_locked(function (&$d) use ($id, $status) {
        foreach ($d['keys'] as $h => $e) if (($e['id'] ?? '') === (string)$id) { if ($e['status'] === $status) return false; $d['keys'][$h]['status'] = $status; return true; }
        return false;
    }, $file) === true;
}
function plus_free_pcs($id, $file = null) {
    return plus_locked(function (&$d) use ($id) {
        foreach ($d['keys'] as $h => $e) if (($e['id'] ?? '') === (string)$id) { if (!$e['pcs']) return false; $d['keys'][$h]['pcs'] = array(); return true; }
        return false;
    }, $file) === true;
}
// For the portal: newest first, never a key or a hash.
function plus_list($file = null) {
    $d = plus_load($file); $o = array();
    foreach (($d ? $d['keys'] : array()) as $e) $o[] = array('id' => $e['id'], 'last4' => $e['last4'], 'email' => $e['email'], 'created' => (int)$e['created'],
        'expires' => (int)$e['expires'], 'status' => $e['status'], 'provider' => $e['provider'], 'note' => $e['note'], 'by' => $e['by'], 'pcs' => count($e['pcs']),
        'runs' => (int)($e['runs'] ?? 0), 'last_run' => (int)($e['last_run'] ?? 0), 'test' => !empty($e['test']), 'trial' => ($e['provider'] ?? '') === 'trial');
    usort($o, function ($a, $b) { return $b['created'] - $a['created']; });
    return $o;
}

/* ---------------- a free month (9 Oct 2026) ----------------
 * Owner: "people that have got the free version ... offer them like a 30-day trial ... activate their license and say
 * that they've been specially approved ... fully featured ... so they can service their computers and get the proper
 * reports". Staff choose installs in the portal's "PC Manager installs" card; each gets an Unlock key of its own:
 * PLUS_TRIAL_DAYS long, for that one PC only (bound to it now, 'max' 1), provider 'trial', no email (we don't know who
 * they are). The PC is handed the key at its next keyless check-in (pcm.php) - an app that knows what to do with one
 * (build 37, "36.1", on) - and from then on checks in with it like any Unlock key: the full service self-run, its report
 * on the PC unless they choose to send it to us for a free look-over (pcm-lookover.php). One free month per PC, ever.
 * $d['trials'][install id] = {id (the key's record), at, by, until, key (the key itself - kept ONLY so the PC can be
 * handed it again, e.g. after a reinstall, and dropped when the month is over), sent (first handed over), got (first
 * check-in with it)}.
 */
if (!defined('PLUS_TRIAL_DAYS')) define('PLUS_TRIAL_DAYS', 30);
if (!defined('PLUS_TRIAL_MIN_VER')) define('PLUS_TRIAL_MIN_VER', 37);   // the first build that takes a key from a check-in
function plus_is_mhash($m) { return (bool)preg_match('/^[a-f0-9]{16}$/', (string)$m); }
// Give one install its free month. -> {ok, until} | {ok:false, error: bad | already | busy}
function plus_trial_give($mhash, $by, $now = null, $file = null) {
    $now = $now === null ? time() : (int)$now;
    if (!plus_is_mhash($mhash)) return array('ok' => false, 'error' => 'bad');
    $res = array('ok' => false, 'error' => 'busy');
    plus_locked(function (&$d) use ($mhash, $by, $now, &$res) {
        if (!isset($d['trials']) || !is_array($d['trials'])) $d['trials'] = array();
        if (isset($d['trials'][$mhash])) { $res = array('ok' => false, 'error' => 'already', 'until' => (int)$d['trials'][$mhash]['until']); return false; }
        do { $key = plus_new_key(); $h = plus_hash($key); } while (isset($d['keys'][$h]));
        $id = bin2hex(random_bytes(5)); $until = $now + PLUS_TRIAL_DAYS * 86400; $day = gmdate('Y-m-d', $now);
        $d['keys'][$h] = array('id' => $id, 'last4' => substr($key, -4), 'email' => '', 'created' => $now, 'expires' => $until, 'status' => 'active',
            'provider' => 'trial', 'order' => '', 'note' => 'Free ' . PLUS_TRIAL_DAYS . ' days for install ' . $mhash, 'by' => plus_cut($by, 30),
            'pcs' => array($mhash => array('first' => $day, 'last' => $day)), 'max' => 1, 'install' => $mhash);
        $d['trials'][$mhash] = array('id' => $id, 'at' => $now, 'by' => plus_cut($by, 30), 'until' => $until, 'key' => $key, 'sent' => 0, 'got' => 0);
        $res = array('ok' => true, 'until' => $until);
        return true;
    }, $file);
    return $res;
}
// 13 Oct 2026 (owner: "Yes, automatic"): a NEW UK install that isn't linked to a customer is given its free month by
// itself, so people see the full service and its report before anyone asks them to pay. pcm.php calls this on a keyless
// check-in; $inst is the install's row in pcm-installs.json (f = first day seen, o = one of our own PCs). Only installs
// first seen on or after pcm-buy-config.php $TRIAL_AUTO_UK_FROM, only a build that can take the key, one month per PC ever
// (plus_trial_give). -> {ok, until} when it gave one now, else null.
function plus_trial_auto_uk($mhash, $country, $ver, $inst, $now = null, $file = null, $config = null) {
    if (!plus_is_mhash($mhash) || !plus_is_uk($country) || (int)$ver < PLUS_TRIAL_MIN_VER || !is_array($inst)) return null;
    $from = plus_config($config)['trial_uk_from'];
    if ($from === '' || !empty($inst['o']) || !empty($inst['k']) || !empty($inst['p'])) return null;
    $f = (string)($inst['f'] ?? '');
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $f) || strcmp($f, $from) < 0) return null;
    $d = plus_load($file);
    if ($d && isset($d['trials'][$mhash])) return null;   // had one already - the usual case, and no lock taken for it
    $r = plus_trial_give($mhash, 'auto (UK)', $now, $file);
    return !empty($r['ok']) ? $r : null;
}
// 18 Oct 2026 (owner: "can we extend it so it's for the people abroad as well ... they get the 30 days and then they can
// share it out to their friends"): the same automatic free month for a NEW install OUTSIDE the UK - first seen on or after
// $TRIAL_AUTO_ABROAD_FROM, country known, never where we can't sell at all (PLUS_NO_SALE), never ours / linked / on a plan,
// one month per PC ever. Abroad it is software only: no report look-over (pcm-lookover.php), as the owner chose.
function plus_trial_auto_abroad($mhash, $country, $ver, $inst, $now = null, $file = null, $config = null) {
    $c = strtoupper(trim((string)$country));
    if (!plus_is_mhash($mhash) || $c === '' || plus_is_uk($c) || plus_no_sale($c) || (int)$ver < PLUS_TRIAL_MIN_VER || !is_array($inst)) return null;
    $from = plus_config($config)['trial_abroad_from'];
    if ($from === '' || !empty($inst['o']) || !empty($inst['k']) || !empty($inst['p'])) return null;
    $f = (string)($inst['f'] ?? '');
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $f) || strcmp($f, $from) < 0) return null;
    $d = plus_load($file);
    if ($d && isset($d['trials'][$mhash])) return null;   // had one already
    $r = plus_trial_give($mhash, 'auto (abroad)', $now, $file);
    return !empty($r['ok']) ? $r : null;
}
// For a keyless check-in from this install (app build $ver): the key to hand over now, or null. Handing it over is
// noted (the first time, and again at most daily) - never in the check-in's way.
function plus_trial_handover($mhash, $ver, $now = null, $file = null) {
    $now = $now === null ? time() : (int)$now;
    if (!plus_is_mhash($mhash) || (int)$ver < PLUS_TRIAL_MIN_VER) return null;
    $d = plus_load($file);
    if (!$d || !isset($d['trials'][$mhash])) return null;
    $t = $d['trials'][$mhash];
    if (empty($t['key']) || (int)$t['until'] <= $now) return null;
    $h = plus_hash($t['key']);
    if (!isset($d['keys'][$h]) || ($d['keys'][$h]['status'] ?? '') !== 'active') return null;   // switched off by staff
    if (!(int)$t['sent'] || gmdate('Y-m-d', (int)$t['sent']) !== gmdate('Y-m-d', $now))
        plus_locked(function (&$d) use ($mhash, $now) { if (!isset($d['trials'][$mhash])) return false; if (!(int)$d['trials'][$mhash]['sent']) $d['trials'][$mhash]['first_sent'] = $now; $d['trials'][$mhash]['sent'] = $now; return true; }, $file);
    return array('key' => $t['key'], 'until' => (int)$t['until'], 'days' => PLUS_TRIAL_DAYS);
}
// A check-in WITH an Unlock key: is it a free month? -> {until, install} or null. The first one also notes 'got'.
function plus_trial_of($key, $now = null, $file = null) {
    $now = $now === null ? time() : (int)$now;
    if (!plus_is_key($key)) return null;
    $d = plus_load($file); $h = plus_hash($key);
    if (!$d || !isset($d['keys'][$h]) || ($d['keys'][$h]['provider'] ?? '') !== 'trial') return null;
    $mh = (string)($d['keys'][$h]['install'] ?? '');
    if ($mh !== '' && isset($d['trials'][$mh]) && !(int)$d['trials'][$mh]['got'])
        plus_locked(function (&$d) use ($mh, $now) { if (!isset($d['trials'][$mh]) || (int)$d['trials'][$mh]['got']) return false; $d['trials'][$mh]['got'] = $now; return true; }, $file);
    return array('until' => (int)$d['keys'][$h]['expires'], 'install' => $mh);
}
// 13 Oct 2026: a key bought in the UK (pp_keep marks it 'uk') -> {expires, id} or null. pcm-lookover.php lets it ask too.
function plus_uk_key_of($key, $file = null) {
    if (!plus_is_key($key)) return null;
    $d = plus_load($file); $h = plus_hash($key);
    if (!$d || !isset($d['keys'][$h]) || empty($d['keys'][$h]['uk']) || ($d['keys'][$h]['provider'] ?? '') === 'trial') return null;
    return array('expires' => (int)$d['keys'][$h]['expires'], 'id' => (string)$d['keys'][$h]['id']);
}
// Tidy: a month that is over no longer needs its key kept (the record stays - one free month per PC, ever).
function plus_trial_tidy($now = null, $file = null) {
    $now = $now === null ? time() : (int)$now;
    return plus_locked(function (&$d) use ($now) {
        $ch = false;
        foreach ((isset($d['trials']) && is_array($d['trials'])) ? $d['trials'] : array() as $mh => $t)
            if (!empty($t['key']) && (int)$t['until'] + 86400 < $now) { $d['trials'][$mh]['key'] = ''; $ch = true; }
        return $ch;
    }, $file) === true;
}
// For the portal's installs list: install id => {state: waiting | has_it | ended | off, until, at, by}
function plus_trial_states($now = null, $file = null) {
    $now = $now === null ? time() : (int)$now;
    $d = plus_load($file); $o = array();
    foreach (($d && isset($d['trials']) && is_array($d['trials'])) ? $d['trials'] : array() as $mh => $t) {
        $off = false;
        foreach ($d['keys'] as $e) if (($e['id'] ?? '') === ($t['id'] ?? '-')) $off = ($e['status'] ?? '') !== 'active';
        $state = $off ? 'off' : ((int)$t['until'] <= $now ? 'ended' : ((int)$t['got'] ? 'has_it' : 'waiting'));
        $o[$mh] = array('state' => $state, 'until' => (int)$t['until'], 'at' => (int)$t['at'], 'by' => (string)$t['by'], 'sent' => (int)$t['sent'], 'got' => (int)$t['got'], 'id' => (string)$t['id'],
            'ext' => (int)($t['ext'] ?? 0), 'ctl' => (int)($t['ctl'] ?? 0));   // 29 Oct 2026: the extra-week test (below)
    }
    return $o;
}
/* 29 Oct 2026 (owner: "[buy] page and the extra week test"): one more week, free, for a KEEN user whose free month is about
   to end without paying - for half of them (the install id's last digit even), so the installs card can compare the halves
   (pcm-installs-lib.php inst_trial_summary). Keen = used on PLUS_EXTRA_MIN_DAYS or more different days and seen in the last
   3 days; about to end = within 2 days. The other half are marked 'ctl' at the same moment, so like is compared with like.
   Once per PC; never a PC that is ours, linked, on a plan, bought a key, or whose month staff switched off. The PC hears of it
   at its next check-in (the key's own end date moves too): the app's end date moves, and its last-days reminders come round
   again. tm-cron.php runs it every 15 minutes; $inst = pcm-installs.json. -> {extended, control} */
if (!defined('PLUS_EXTRA_DAYS')) define('PLUS_EXTRA_DAYS', 7);
if (!defined('PLUS_EXTRA_MIN_DAYS')) define('PLUS_EXTRA_MIN_DAYS', 4);
function plus_trial_extra_week($inst, $now = null, $file = null) {
    $now = $now === null ? time() : (int)$now;
    $res = array('extended' => 0, 'control' => 0);
    if (!is_array($inst) || !isset($inst['m']) || !is_array($inst['m'])) return $res;
    $seen = gmdate('Y-m-d', $now - 3 * 86400);
    $bought = plus_bought_installs($file);
    plus_locked(function (&$d) use ($inst, $now, $seen, $bought, &$res) {
        $ch = false;
        foreach ((isset($d['trials']) && is_array($d['trials'])) ? $d['trials'] : array() as $mh => $t) {
            if (!empty($t['ext']) || !empty($t['ctl']) || !(int)($t['got'] ?? 0)) continue;
            $until = (int)$t['until'];
            if ($until <= $now || $until > $now + 2 * 86400) continue;
            $e = (isset($inst['m'][$mh]) && is_array($inst['m'][$mh])) ? $inst['m'][$mh] : null;
            if (!$e || !empty($e['o']) || !empty($e['k']) || !empty($e['p']) || isset($bought[$mh])) continue;
            if ((int)($e['n'] ?? 0) < PLUS_EXTRA_MIN_DAYS || (string)($e['l'] ?? '') < $seen) continue;
            $h = '';
            foreach ($d['keys'] as $kh => $k) if (($k['id'] ?? '') === ($t['id'] ?? '-')) { $h = $kh; break; }
            if ($h === '' || ($d['keys'][$h]['status'] ?? '') !== 'active') continue;
            if (hexdec(substr($mh, -1)) % 2 === 0) {
                $d['trials'][$mh]['until'] = $until + PLUS_EXTRA_DAYS * 86400;
                $d['trials'][$mh]['ext'] = $now;
                $d['keys'][$h]['expires'] = $until + PLUS_EXTRA_DAYS * 86400;
                $res['extended']++;
            } else {
                $d['trials'][$mh]['ctl'] = $now;
                $res['control']++;
            }
            $ch = true;
        }
        return $ch;
    }, $file);
    return $res;
}
// 29 Oct 2026 (owner: "build the trial count on the installs card"): the PCs an Unlock key that was NOT a free month has been
// used on -> install id => {provider, at}. A refunded (revoked) key doesn't count; one that has since run out still does -
// it was paid for. For pcm-installs-lib.php inst_trial_summary: which free months turned into a sale.
function plus_bought_installs($file = null) {
    $d = plus_load($file); $o = array();
    foreach (($d && isset($d['keys']) && is_array($d['keys'])) ? $d['keys'] : array() as $e) {
        if (!is_array($e) || ($e['provider'] ?? '') === 'trial' || ($e['status'] ?? '') === 'revoked') continue;
        foreach ((isset($e['pcs']) && is_array($e['pcs'])) ? $e['pcs'] : array() as $mh => $x)
            if (plus_is_mhash($mh) && (!isset($o[$mh]) || (int)($e['created'] ?? 0) > $o[$mh]['at']))
                $o[$mh] = array('provider' => (string)($e['provider'] ?? ''), 'at' => (int)($e['created'] ?? 0));
    }
    return $o;
}
