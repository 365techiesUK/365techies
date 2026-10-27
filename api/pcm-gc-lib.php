<?php
/*
 * GoCardless customer lookup by email, shared by pcm.php (the portal's "Your plan" card), pcm-invoice.php
 * (the monthly QuickBooks run) and pcm-invite-lib.php (the Plans tab). 27 Oct 2026.
 *
 * GoCardless's GET /customers has NO email filter: its schema lists after, before, created_at, currency,
 * limit, sort_direction, sort_field and action_required, with additionalProperties:false. pcm.php and
 * pcm-invoice.php used to pass it an email= filter, which GoCardless either refuses (nobody found, for
 * everyone) or ignores (customers[0], the NEWEST customer - a different person - for everyone). So the
 * customer list is read in pages of 500 and matched on the lower-cased email here.
 *
 * One email can have several customer records (an abandoned sign-up leaves an empty one and the next link
 * makes another), so every id is kept and every record is read.
 *
 * READ-ONLY: every call is a GET through the $get callable the caller passes in, which returns the decoded
 * JSON or null. Nothing here creates, changes or cancels anything. The index keeps sha1(email) only - no
 * plain email addresses at rest.
 *
 * Include-only (.htaccess denies it as a URL). Constants and functions only - no top-level variables, so it
 * is safe to include from inside a function. Store, gitignored and denied over HTTP:
 *   pcm-gc-custidx.json - sha1(email) -> GoCardless customer ids, 10-minute cache
 * NO closing tag.
 */

if (!defined('GCL_DIR')) define('GCL_DIR', __DIR__);
if (!defined('GCL_TTL')) define('GCL_TTL', 600);      // the index is re-read after this long (seconds)
if (!defined('GCL_PAGES')) define('GCL_PAGES', 20);   // pages of 500; past this the list would be partial

function gcl_ek($email) { return sha1(strtolower(trim((string)$email))); }

// sha1(email) -> array of customer ids. null = could not read it. $fresh skips the cache. On a failed read
// $stale_ok hands back the last good index (fine for the portal card and the Plans tab); the invoice run
// passes false, because a stale index would quietly leave out anyone who joined since. A partial list is
// a failed read: it is never cached or used as if it were the whole list.
function gcl_index($get, $fresh = false, $stale_ok = true) {
    $p = GCL_DIR . '/pcm-gc-custidx.json';
    $c = @json_decode((string)@file_get_contents($p), true);
    $old = (is_array($c) && isset($c['idx']) && is_array($c['idx'])) ? $c['idx'] : null;
    if (!$fresh && $old !== null && isset($c['at']) && (int)$c['at'] > time() - GCL_TTL) return $old;
    $idx = array(); $after = ''; $pages = 0;
    do {
        if (++$pages > GCL_PAGES) return $stale_ok ? $old : null;
        $j = call_user_func($get, '/customers?limit=500' . ($after !== '' ? '&after=' . rawurlencode($after) : ''));
        if (!is_array($j) || !isset($j['customers']) || !is_array($j['customers'])) return $stale_ok ? $old : null;
        foreach ($j['customers'] as $cu) {
            if (empty($cu['id']) || empty($cu['email'])) continue;
            $idx[gcl_ek($cu['email'])][] = (string)$cu['id'];
        }
        $after = isset($j['meta']['cursors']['after']) ? (string)$j['meta']['cursors']['after'] : '';
    } while ($after !== '');
    $tmp = $p . '.' . getmypid() . '.tmp';
    if (@file_put_contents($tmp, json_encode(array('at' => time(), 'idx' => $idx), JSON_UNESCAPED_SLASHES), LOCK_EX) !== false) @rename($tmp, $p);
    return $idx;
}

// The customer ids for one email; empty when GoCardless has no customer with it.
function gcl_ids($idx, $email) {
    $k = gcl_ek($email);
    return (trim((string)$email) !== '' && is_array($idx) && isset($idx[$k])) ? array_values((array)$idx[$k]) : array();
}

// The monthly invoice's lines for one email: each active plan on any of their customer records, as
// [{name, amount}] in pounds, zero-amount plans left out. null = could not read GoCardless.
function gcl_lines($get, $ids) {
    $lines = array();
    foreach ($ids as $cid) {
        $subs = call_user_func($get, '/subscriptions?customer=' . rawurlencode($cid) . '&status=active');
        if (!is_array($subs)) return null;
        foreach ((isset($subs['subscriptions']) ? $subs['subscriptions'] : array()) as $s) {
            $amt = round(intval($s['amount'] ?? 0) / 100.0, 2);
            if ($amt > 0) $lines[] = array('name' => (string)($s['name'] ?? 'Support plan'), 'amount' => $amt);
        }
    }
    return $lines;
}

// The portal's plan card for one email: every active plan across all their customer records added up, and
// the newest payment on any of them. null = no GoCardless customer with this email; false = could not read
// GoCardless (the caller must not cache a made-up "no plan").
function gcl_summary($get, $ids) {
    if (!$ids) return null;
    $subs = array(); $p = null;
    foreach ($ids as $cid) {
        $s = call_user_func($get, '/subscriptions?customer=' . rawurlencode($cid) . '&status=active');
        if (!is_array($s)) return false;
        foreach ((isset($s['subscriptions']) ? $s['subscriptions'] : array()) as $x) $subs[] = $x;
        $pays = call_user_func($get, '/payments?customer=' . rawurlencode($cid) . '&limit=1');
        $x = (is_array($pays) && !empty($pays['payments'][0])) ? $pays['payments'][0] : null;
        if ($x && (!$p || strcmp((string)($x['created_at'] ?? ''), (string)($p['created_at'] ?? '')) > 0)) $p = $x;
    }
    // sum ALL active subscriptions (some customers pay per-PC on separate plans)
    $tot = 0.0; $names = array(); $nextchg = '';
    foreach ($subs as $s) {
        $tot += intval($s['amount'] ?? 0) / 100.0;
        $names[] = (string)($s['name'] ?? 'Support plan');
        $nc = !empty($s['upcoming_payments'][0]['charge_date']) ? (string)$s['upcoming_payments'][0]['charge_date'] : '';
        if ($nc !== '' && ($nextchg === '' || $nc < $nextchg)) $nextchg = $nc;
    }
    return array(
        'active' => count($names) > 0,
        'amount' => round($tot, 2),
        'name'   => count($names) === 1 ? $names[0] : (count($names) > 1 ? 'Support plans (' . count($names) . ' Direct Debits)' : ''),
        'nextchg'=> $nextchg,
        'lastamt'=> $p ? round(intval($p['amount'] ?? 0) / 100, 2) : 0,
        'lastdate'=> $p ? (string)($p['charge_date'] ?? '') : '',
        'laststatus'=> $p ? (string)($p['status'] ?? '') : '');
}
