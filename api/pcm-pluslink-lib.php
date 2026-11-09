<?php
/**
 * 365 PC Manager - a free month's key that signed in to book (9 Nov 2026).
 *
 * Found on a customer's laptop (owner: "When a customer tries to sign in, it doesn't work"): since 13 Oct 2026 a new UK
 * install starts on its free month, which is an "Unlock" key (UNLK-..., pcm-plus-lib.php). Signing in to book hands the
 * app the customer's own record key, but the app (36.8 and earlier) keeps the Unlock key it already has - never lose what
 * the PC has - so every booking call then arrived with a key no customer record holds. The Book page said "Signed in as
 * ..." over "Please sign in first" twice, and a portal "-> Pro" on the customer never reached the PC.
 *
 * The proof kept here is the one the sign-in itself gave: the SAME request presented a verified SimplyBook login AND
 * this PC's Unlock key, so the pair (Unlock key, this PC) is remembered as leading to the record that sign-in landed on.
 * Nothing else ever creates a link - never a match on email or on the PC alone (the re-home proof rules,
 * pcm-rehome-lib.php). The Unlock key is stored hashed, as pcm-plus-lib.php keeps it.
 *   - pcm-booking.php signin  -> pl_remember (app sign-ins only, never the web portal's)
 *   - pcm-booking.php customer_snapshot -> pl_lookup: booking with the Unlock key works as the customer it signed in as
 *   - pcm.php check-in of an Unlock key -> pl_cust_out: tells the app (build 49 on) its customer record and that record's
 *     plan, so a record staff switch to Pro, or the end of the free month, moves the PC onto the customer's own key.
 * Include-only: the callers hold the data lock and save.
 */
if (!function_exists('pl_remember')) {

function pl_is_unlk($key) { return (bool)preg_match('/^UNLK(-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}){3}$/', strtoupper(trim((string)$key))); }

/** The map's id for an Unlock key on one PC ('' when either is missing). */
function pl_id($key, $machine) {
    $machine = preg_replace('/[^a-f0-9]/', '', strtolower((string)$machine));
    if (!pl_is_unlk($key) || strlen($machine) < 8) return '';
    return hash('sha256', '365plus|' . strtoupper(trim((string)$key))) . '|' . $machine;
}

/** At a verified app sign-in: this PC's Unlock key leads to $target from now on. True when something changed. */
function pl_remember(array &$db, $key, $machine, $target, $now = null) {
    $id = pl_id($key, $machine);
    $target = (string)$target;
    if ($id === '' || $target === '' || !isset($db['customers'][$target])) return false;
    if (!isset($db['pluslink']) || !is_array($db['pluslink'])) $db['pluslink'] = array();
    if (isset($db['pluslink'][$id]['key']) && (string)$db['pluslink'][$id]['key'] === $target) return false;
    $db['pluslink'][$id] = array('key' => $target, 'ts' => gmdate('Y-m-d H:i', $now === null ? time() : (int)$now));
    return true;
}

/** The record key this PC's Unlock key signed in as, or ''. The caller re-homes it as it would any key it was sent. */
function pl_lookup(array $db, $key, $machine) {
    $id = pl_id($key, $machine);
    if ($id === '' || !isset($db['pluslink'][$id]['key'])) return '';
    return (string)$db['pluslink'][$id]['key'];
}

/** For the check-in of an Unlock key: array('cust_key' => record, 'cust_tier' => pro|free) when the PC is still on the
 *  record it signed in as (merges followed), else array(). The app was handed this same key by that sign-in. */
function pl_cust_out(array $db, $key, $machine) {
    $t = pl_lookup($db, $key, $machine);
    if ($t === '') return array();
    if (function_exists('rehome_follow')) $t = rehome_follow($db, $t);
    if ($t === '' || !isset($db['customers'][$t]['machines'][(string)$machine])) return array();
    return array('cust_key' => $t, 'cust_tier' => (($db['customers'][$t]['tier'] ?? 'free') === 'pro') ? 'pro' : 'free');
}

}
