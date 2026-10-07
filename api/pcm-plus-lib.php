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
 * Config (in git - nothing secret in it - and .htaccess-denied): api/pcm-buy-config.php
 *   $BUY_ON = false;                 the switch (the owner's go -> true, deployed)
 *   $BUY_URL = 'https://...';        the checkout page; "{id}" in it is replaced with the install's anonymous id
 *   $BUY_PRICE = '$29 a year';       shown as written, beside the button
 *   $BUY_PROVIDER = 'paddle';        or 'lemonsqueezy' - recorded with keys its webhook issues (later)
 * Stop at once, without a deploy: create api/pcm-buy.off on the server (gitignored).
 *
 * Library only - constants and functions (no globals). NO closing tag in this file.
 */
require_once __DIR__ . '/pcm-geoip-lib.php';

if (!defined('PLUS_FILE')) define('PLUS_FILE', __DIR__ . '/pcm-plus.json');
if (!defined('PLUS_OFF')) define('PLUS_OFF', __DIR__ . '/pcm-buy.off');
if (!defined('PLUS_CONFIG')) define('PLUS_CONFIG', __DIR__ . '/pcm-buy-config.php');
if (!defined('PLUS_MAX_PCS')) define('PLUS_MAX_PCS', 3);
define('PLUS_ALPHA', '23456789ABCDEFGHJKMNPQRSTUVWXYZ');   // no 0/O, 1/I/L: read over the phone or copied by hand

function plus_cut($s, $n) { $s = (string)$s; return function_exists('mb_substr') ? mb_substr($s, 0, $n) : substr($s, 0, $n); }
function plus_is_key($key) { return (bool)preg_match('/^UNLK(-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}){3}$/', strtoupper(trim((string)$key))); }
function plus_hash($key) { return hash('sha256', '365plus|' . strtoupper(trim((string)$key))); }
function plus_mhash($machine) { $m = preg_replace('/[^a-f0-9]/', '', strtolower((string)$machine)); return strlen($m) >= 8 ? substr(sha1('365inst|' . $m), 0, 16) : ''; }

/* ---------------- the switch and the offer ---------------- */
function plus_config($file = null) {
    $src = (string)@file_get_contents($file !== null ? $file : PLUS_CONFIG);
    // a setting is a line of its own: words in the file's comments never count (its doc comment says "$BUY_ON = true;")
    $g = function ($n) use ($src) { return preg_match('/^[ \t]*\$' . $n . '\s*=\s*([\'"])(.*?)\1\s*;/m', $src, $m) ? $m[2] : ''; };
    $url = $g('BUY_URL');
    return array('on' => (bool)preg_match('/^[ \t]*\$BUY_ON\s*=\s*true\s*;/mi', $src), 'url' => preg_match('#^https://[^\s<>"\']+$#', $url) ? $url : '', 'price' => plus_cut($g('BUY_PRICE'), 40), 'provider' => preg_replace('/[^a-z]/', '', strtolower($g('BUY_PROVIDER'))));
}
function plus_enabled($off = null, $config = null) {
    $c = plus_config($config);
    return $c['on'] && $c['url'] !== '' && !file_exists($off !== null ? $off : PLUS_OFF);
}
// What a keyless check-in's answer gains. $country: the check-in's country ('' = not known). $id: the install's anonymous id.
function plus_offer_out($country, $id = '', $off = null, $config = null) {
    if (!plus_enabled($off, $config)) return array();
    $c = strtoupper((string)$country);
    if ($c === '' || in_array($c, array('GB', 'IM', 'JE', 'GG'), true)) return array('offer' => 'plan');
    $cfg = plus_config($config);
    return array('offer' => 'buy', 'buy_url' => str_replace('{id}', rawurlencode((string)$id), $cfg['url']), 'buy_price' => $cfg['price']);
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
    if (isset($e['pcs'][$mh])) {
        if ((string)($e['pcs'][$mh]['last'] ?? '') !== $day)   // seen: at most one write a day
            plus_locked(function (&$d) use ($h, $mh, $day) { if (!isset($d['keys'][$h]['pcs'][$mh])) return false; $d['keys'][$h]['pcs'][$mh]['last'] = $day; return true; }, $file);
        return array('ok' => true, 'expires' => (int)$e['expires']);
    }
    if (!$bind) return array('ok' => false, 'error' => 'not_this_pc');
    $r = plus_locked(function (&$d) use ($h, $mh, $day) {
        if (!isset($d['keys'][$h])) return false;
        if (count($d['keys'][$h]['pcs']) >= PLUS_MAX_PCS) return 'full';
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
            'install' => preg_replace('/[^a-f0-9]/', '', substr((string)($extra['install'] ?? ''), 0, 16)), 'test' => !empty($extra['test']));
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
function plus_ls_secret($file = null) {
    $src = (string)@file_get_contents($file !== null ? $file : __DIR__ . '/pcm-ls-secret.php');
    return preg_match('/^[ \t]*\$LS_WEBHOOK_SECRET\s*=\s*([\'"])(.+?)\1\s*;/m', $src, $m) ? $m[2] : '';
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
        'runs' => (int)($e['runs'] ?? 0), 'last_run' => (int)($e['last_run'] ?? 0), 'test' => !empty($e['test']));
    usort($o, function ($a, $b) { return $b['created'] - $a['created']; });
    return $o;
}
