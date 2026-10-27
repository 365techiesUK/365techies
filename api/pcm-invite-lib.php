<?php
/*
 * Plan invites: who we invited to a support plan, and where each one has got to on GoCardless.
 * 27 Oct 2026 (owner: "Yeah, build both portal features" - a Plans tab listing who has been invited and
 * their GoCardless status, after a plan sign-up was raised as a one-off QuickBooks invoice instead).
 *
 * READ-ONLY against GoCardless: every call is a GET through the $get callable pcm-invite.php passes in.
 * Nothing here creates a billing request, touches a mandate or moves money.
 *
 * GoCardless's GET /customers has NO email filter (its schema is additionalProperties:false), so the
 * customer list is read in pages and matched on the email here. The index keeps sha1(email) only -
 * no plain email addresses at rest.
 *
 * Include-only (.htaccess denies it as a URL). Stores, all gitignored and denied over HTTP:
 *   pcm-invite-sent.json   - one record per invite sent (email, name, plan, who sent it)
 *   pcm-gc-custidx.json    - sha1(email) -> GoCardless customer ids, 10-minute cache
 *   pcm-gc-invstatus.json  - each invited email's status, 10-minute cache
 * NO closing tag.
 */

if (!defined('INV_DIR')) define('INV_DIR', __DIR__);
define('INV_TTL', 600);          // GoCardless reads are cached this long (seconds)
define('INV_KEEP', 400);         // invite records kept
define('INV_DAYS', 120);         // invites older than this are not shown
define('INV_CHASE_DAYS', 3);     // an invite with nothing set up after this long is worth a chase
define('INV_LOOKUPS', 10);       // fresh GoCardless status reads per request (3 GETs each)

function inv_path($f) { return INV_DIR . '/' . $f; }
function inv_read_json($f) { $j = @json_decode((string)@file_get_contents(inv_path($f)), true); return is_array($j) ? $j : array(); }
function inv_write_json($f, $data) {
    $p = inv_path($f); $tmp = $p . '.' . getmypid() . '.tmp';
    if (@file_put_contents($tmp, json_encode($data, JSON_UNESCAPED_SLASHES), LOCK_EX) === false) return false;
    return @rename($tmp, $p);
}
function inv_ek($email) { return sha1(strtolower(trim((string)$email))); }

// ---- the record of each invite sent ------------------------------------------
function inv_record($email, $name, $plan, $label, $amount, $by, $at = null) {
    $fh = @fopen(inv_path('pcm-invite-sent.json.lock'), 'c');
    if ($fh) @flock($fh, LOCK_EX);
    $all = inv_read_json('pcm-invite-sent.json');
    $all[] = array('at' => ($at === null ? time() : (int)$at), 'email' => strtolower(trim((string)$email)), 'name' => (string)$name,
                   'plan' => (string)$plan, 'label' => (string)$label, 'amount' => (string)$amount, 'by' => (string)$by);
    if (count($all) > INV_KEEP) $all = array_slice($all, -INV_KEEP);
    $ok = inv_write_json('pcm-invite-sent.json', $all);
    if ($fh) { @flock($fh, LOCK_UN); @fclose($fh); }
    return $ok;
}

// Every invite we know of: the record above, plus the "sent" lines in pcm-invite.log written before the
// record existed (those carry no name or label - the label comes from $labels by plan key). One row per
// email: the latest invite, with how many were sent and when the first went.
function inv_history($logf, $labels, $now = null) {
    $now = ($now === null) ? time() : (int)$now;
    $recs = inv_read_json('pcm-invite-sent.json');
    $seen = array();
    foreach ($recs as $r) $seen[$r['email'] . '|' . (int)$r['at']] = true;
    $src = is_readable($logf) ? (string)@file_get_contents($logf) : '';
    if ($src !== '' && preg_match_all('/^\[(\d{4}-\d\d-\d\d \d\d:\d\d:\d\d)Z\] invite: sent (\S+) to (\S+) by (.*)$/m', $src, $mm, PREG_SET_ORDER)) {
        foreach ($mm as $m) {
            $at = strtotime($m[1] . ' UTC'); $em = strtolower($m[3]);
            // the record and the log line of one send are written within a second or two of each other
            $dup = false; for ($d = -2; $d <= 2; $d++) if (isset($seen[$em . '|' . ($at + $d)])) $dup = true;
            if ($dup) continue;
            $recs[] = array('at' => $at, 'email' => $em, 'name' => '', 'plan' => $m[2],
                            'label' => isset($labels[$m[2]]) ? (string)$labels[$m[2]] : '', 'amount' => '', 'by' => trim($m[4]));
        }
    }
    $rows = array();
    foreach ($recs as $r) {
        if (empty($r['email']) || (int)$r['at'] < $now - INV_DAYS * 86400) continue;
        $k = $r['email'];
        if ($r['label'] === '' && isset($labels[$r['plan']])) $r['label'] = (string)$labels[$r['plan']];
        if (!isset($rows[$k])) { $rows[$k] = $r; $rows[$k]['count'] = 1; $rows[$k]['first'] = (int)$r['at']; continue; }
        $rows[$k]['count']++;
        $rows[$k]['first'] = min($rows[$k]['first'], (int)$r['at']);
        if ((int)$r['at'] >= (int)$rows[$k]['at']) {
            $keepName = $rows[$k]['name'];
            $c = $rows[$k]['count']; $f = $rows[$k]['first'];
            $rows[$k] = $r; $rows[$k]['count'] = $c; $rows[$k]['first'] = $f;
            if ($rows[$k]['name'] === '') $rows[$k]['name'] = $keepName;
        } elseif ($rows[$k]['name'] === '' && $r['name'] !== '') $rows[$k]['name'] = $r['name'];
    }
    $rows = array_values($rows);
    usort($rows, function ($a, $b) { return (int)$b['at'] - (int)$a['at']; });
    return $rows;
}

// ---- GoCardless (read-only) ----------------------------------------------------
// sha1(email) -> array of customer ids, from GET /customers in pages of 500. null = could not read.
function inv_gc_index($get, $fresh = false) {
    $c = inv_read_json('pcm-gc-custidx.json');
    if (!$fresh && isset($c['at'], $c['idx']) && (int)$c['at'] > time() - INV_TTL) return $c['idx'];
    $idx = array(); $after = ''; $pages = 0;
    do {
        $j = call_user_func($get, '/customers?limit=500' . ($after !== '' ? '&after=' . rawurlencode($after) : ''));
        if (!is_array($j)) return (isset($c['idx']) && is_array($c['idx'])) ? $c['idx'] : null;   // a blip: the last good index
        foreach ((array)(isset($j['customers']) ? $j['customers'] : array()) as $cu) {
            if (empty($cu['id']) || empty($cu['email'])) continue;
            $idx[inv_ek($cu['email'])][] = (string)$cu['id'];
        }
        $after = isset($j['meta']['cursors']['after']) ? (string)$j['meta']['cursors']['after'] : '';
    } while ($after !== '' && ++$pages < 20);
    inv_write_json('pcm-gc-custidx.json', array('at' => time(), 'idx' => $idx));
    return $idx;
}

function inv_money($n) { return '£' . number_format((float)$n, 2); }
function inv_day($ymd) { $t = strtotime((string)$ymd . ' 12:00 UTC'); return $t ? gmdate('j M', $t) : (string)$ymd; }

// Where one invited email has got to. $ids = their GoCardless customer ids (from the index); $since = when
// the first invite went. Returns array(status, words, ...) or null when GoCardless could not be read
// (never a made-up "not set up yet").
//   invited  - no GoCardless customer with this email yet
//   started  - a customer, but no Direct Debit yet (they stopped part-way through the form)
//   setup    - Direct Debit being set up (the bank takes a few working days)
//   active   - Direct Debit set up and the plan running; no payment taken yet
//   collecting - the first payment is on its way
//   paid     - a payment has been taken
//   problem  - Direct Debit failed / cancelled / expired, or the latest payment failed
function inv_gc_status($get, $ids, $since) {
    if (!$ids) return array('status' => 'invited', 'words' => 'Invited — not set up on GoCardless yet');
    $mand = array(); $subs = array(); $pays = array();
    foreach ($ids as $cid) {
        $q = 'customer=' . rawurlencode($cid) . '&limit=50';
        $m = call_user_func($get, '/mandates?' . $q);
        $s = call_user_func($get, '/subscriptions?' . $q);
        $p = call_user_func($get, '/payments?' . $q);
        if (!is_array($m) || !is_array($s) || !is_array($p)) return null;
        $mand = array_merge($mand, (array)(isset($m['mandates']) ? $m['mandates'] : array()));
        $subs = array_merge($subs, (array)(isset($s['subscriptions']) ? $s['subscriptions'] : array()));
        $pays = array_merge($pays, (array)(isset($p['payments']) ? $p['payments'] : array()));
    }
    // a Direct Debit made well before the first invite belongs to something else they already pay for
    $before = false;
    foreach ($mand as $x) { $t = strtotime((string)(isset($x['created_at']) ? $x['created_at'] : '')); if ($t && $t < (int)$since - 86400) $before = true; }

    $amt = 0.0; $next = ''; $plan = '';
    foreach ($subs as $x) {
        if ((isset($x['status']) ? $x['status'] : '') !== 'active') continue;
        $amt += intval(isset($x['amount']) ? $x['amount'] : 0) / 100.0;
        if ($plan === '') $plan = (string)(isset($x['name']) ? $x['name'] : '');
        $nc = !empty($x['upcoming_payments'][0]['charge_date']) ? (string)$x['upcoming_payments'][0]['charge_date'] : '';
        if ($nc !== '' && ($next === '' || $nc < $next)) $next = $nc;
    }
    $ms = array(); foreach ($mand as $x) $ms[] = (string)(isset($x['status']) ? $x['status'] : '');
    $live    = array_intersect($ms, array('active'));
    $pending = array_intersect($ms, array('pending_customer_approval', 'pending_submission', 'submitted'));
    $dead    = array_intersect($ms, array('failed', 'cancelled', 'expired', 'blocked', 'suspended_by_payer', 'consumed'));

    // payments, newest charge date first
    usort($pays, function ($a, $b) { return strcmp((string)(isset($b['charge_date']) ? $b['charge_date'] : ''), (string)(isset($a['charge_date']) ? $a['charge_date'] : '')); });
    $latest = $pays ? $pays[0] : null; $paid = null; $coming = null;
    foreach ($pays as $x) {
        $st = (string)(isset($x['status']) ? $x['status'] : '');
        if (!$paid && ($st === 'confirmed' || $st === 'paid_out')) $paid = $x;
        if (in_array($st, array('pending_submission', 'submitted', 'pending_customer_approval'), true)) $coming = $x;   // ends on the earliest
    }
    $out = array('amount' => round($amt, 2), 'next' => $next, 'plan' => $plan, 'before' => $before);
    $lst = $latest ? (string)$latest['status'] : '';
    $words = array('failed' => 'the latest payment failed', 'charged_back' => 'the latest payment was charged back',
                   'cancelled' => 'the latest payment was cancelled', 'customer_approval_denied' => 'the latest payment was refused');
    if ($latest && isset($words[$lst])) {
        return $out + array('status' => 'problem', 'words' => 'Problem — ' . $words[$lst] . ' (' . inv_day($latest['charge_date']) . ')');
    }
    if (!$live && !$pending && $dead) {
        $why = in_array('suspended_by_payer', $dead, true) ? 'suspended by their bank' : (in_array('failed', $dead, true) ? 'failed' : (in_array('expired', $dead, true) ? 'expired' : 'cancelled'));
        return $out + array('status' => 'problem', 'words' => 'Problem — the Direct Debit ' . $why);
    }
    if ($paid) {
        return $out + array('status' => 'paid', 'paid' => (string)$paid['charge_date'], 'paid_amt' => round(intval($paid['amount']) / 100.0, 2),
            'words' => 'Paying — ' . inv_money(intval($paid['amount']) / 100.0) . ' taken ' . inv_day($paid['charge_date'])
                       . ($amt > 0 ? ', ' . inv_money($amt) . ' a month' : '') . ($next !== '' ? ', next ' . inv_day($next) : ''));
    }
    if ($coming) {
        return $out + array('status' => 'collecting',
            'words' => 'First payment on its way — ' . inv_money(intval($coming['amount']) / 100.0) . ' on ' . inv_day($coming['charge_date']));
    }
    if ($live) {
        return $out + array('status' => 'active',
            'words' => 'Direct Debit set up' . ($amt > 0 ? ' — ' . inv_money($amt) . ' a month' : ' — no plan running on it yet') . ($next !== '' ? ', first collection ' . inv_day($next) : ''));
    }
    if ($pending) {
        return $out + array('status' => 'setup', 'words' => 'Direct Debit being set up' . ($amt > 0 ? ' — ' . inv_money($amt) . ' a month' : '') . ($next !== '' ? ', first collection ' . inv_day($next) : ''));
    }
    return $out + array('status' => 'started', 'words' => 'Started on GoCardless but no Direct Debit yet — they may have stopped part-way');
}

// The invite rows, each with its GoCardless status (cached INV_TTL). $get null = no GoCardless token.
function inv_with_status($rows, $get, $fresh = false, $now = null) {
    $now = ($now === null) ? time() : (int)$now;
    if ($get === null) { foreach ($rows as &$r) { $r['gc'] = null; } unset($r); return $rows; }
    $idx = inv_gc_index($get, $fresh);
    $cache = inv_read_json('pcm-gc-invstatus.json');
    $budget = INV_LOOKUPS; $dirty = false;
    foreach ($rows as &$r) {
        $ek = inv_ek($r['email']);
        $c = isset($cache[$ek]) ? $cache[$ek] : null;
        if (!$fresh && $c && (int)$c['at'] > $now - INV_TTL) { $r['gc'] = $c['data']; }
        elseif ($idx === null) { $r['gc'] = array('status' => 'unknown', 'words' => 'Couldn’t read GoCardless just now'); }
        else {
            $ids = isset($idx[$ek]) ? $idx[$ek] : array();
            if ($ids && $budget <= 0) { $r['gc'] = ($c ? $c['data'] : array('status' => 'unknown', 'words' => 'Not checked yet — press re-check')); }
            else {
                if ($ids) $budget--;
                $st = inv_gc_status($get, $ids, isset($r['first']) ? $r['first'] : $r['at']);
                if ($st === null) $r['gc'] = ($c ? $c['data'] : array('status' => 'unknown', 'words' => 'Couldn’t read GoCardless just now'));
                else { $r['gc'] = $st; $cache[$ek] = array('at' => $now, 'data' => $st); $dirty = true; }
            }
        }
        $r['days'] = (int)floor(($now - (int)$r['at']) / 86400);
        $r['chase'] = (isset($r['gc']['status']) && in_array($r['gc']['status'], array('invited', 'started'), true) && $r['days'] >= INV_CHASE_DAYS);
    }
    unset($r);
    if ($dirty) inv_write_json('pcm-gc-invstatus.json', $cache);
    return $rows;
}
