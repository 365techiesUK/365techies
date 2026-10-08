<?php
/*
 * Sign-ins waiting for approval (8 Oct 2026).
 *
 * A booking-account sign-in (pcm-booking.php signin, and the email-code join) whose email matches a PLAN (Pro) record is
 * never handed that plan: a SimplyBook client login can be self-registered with anyone's email, so an email match proves
 * nothing. Instead the customer's PC goes on a separate FREE record (via 'signin' / 'join') and the plan record is marked
 * pending_signin = {cid, email, link, sbname, ts}, where link is the key of that free record.
 *
 * Until now only the old console (pcm-admin.php) showed those marks, nothing told anyone, and the look-alike free record
 * sat in the staff portal's licence table next to the plan record. Found on Alex Simons' PC: his app said "Signed in as"
 * over "Please sign in first", because the free record it was signed in to had been deleted. So this file gives the mark
 * a Slack card (#365-job-tracker, once per sign-in), a place on the portal's Today with the console's Approve, and a
 * label on records that share an email with another, so they are not deleted as duplicates without thought.
 *
 * Never in the card or the portal list: licence keys (both records' keys are bearer credentials) or passwords. The
 * portal gets the same opaque ids as staffcustomers (ps_cid) and the server resolves them.
 *
 * Library only: pure functions over the customer DB array. pcm-booking.php opens, locks and saves. NO closing tag.
 */

define('PS_PORTAL', 'https://365techies.co.uk/portal/');

// the opaque id the staff portal knows a record by - the SAME formula as staffcustomers/stafftier/staffdel
function ps_cid($k) { return substr(sha1('365cid|' . $k), 0, 12); }

// one line of a Slack card: no control characters, capped, and Slack's own three escapes - a self-registered booking
// name like "<!channel>" must arrive as text, not as a ping
function ps_esc($s, $max = 80) {
    $s = trim(substr(preg_replace('/[\x00-\x1F\x7F]+/', ' ', (string)$s), 0, $max));
    return str_replace(array('&', '<', '>'), array('&amp;', '&lt;', '&gt;'), $s);
}

function ps_live($c) { return is_array($c) && empty($c['merged_into']); }

/* Mark each matched plan record, pointing at the free record the sign-in landed on. Returns the names of the plan
   records marked NOW - a record already marked for this same sign-in (same link, same booking client) is not news,
   so the Slack card goes once, not on every retry. */
function ps_flag(&$db, $pendingKeys, $target, $cid, $email, $sbname, $now) {
    $fresh = array();
    foreach ($pendingKeys as $pk) {
        if (!isset($db['customers'][$pk]) || $pk === $target) continue;
        $old = isset($db['customers'][$pk]['pending_signin']) ? $db['customers'][$pk]['pending_signin'] : null;
        $same = is_array($old) && (string)(isset($old['link']) ? $old['link'] : '') === (string)$target
            && (int)(isset($old['cid']) ? $old['cid'] : 0) === (int)$cid;
        $db['customers'][$pk]['pending_signin'] = array('cid' => $cid, 'email' => $email, 'link' => $target, 'sbname' => $sbname, 'ts' => $now);
        if (!$same) $fresh[] = (string)(isset($db['customers'][$pk]['name']) ? $db['customers'][$pk]['name'] : '');
    }
    return $fresh;
}

/* The Slack card. $how: 'app' (365 PC Manager, $pc = the PC's name), 'web' (the customer portal), 'join' (the portal's
   email code). $plans: the plan records' names. Says who, which plan the email matched, that they are on a separate free
   record until approved, and where to approve - nothing else. */
function ps_card($sbname, $email, $plans, $how, $pc = '') {
    $who = ps_esc($sbname) !== '' ? '*' . ps_esc($sbname) . '* (' . ps_esc($email, 120) . ')' : '*' . ps_esc($email, 120) . '*';
    $names = array();
    foreach ($plans as $p) $names[] = '*' . (ps_esc($p) !== '' ? ps_esc($p) : 'a plan customer') . '*';
    $names = array_values(array_unique($names));
    $pl = count($names) > 1 ? implode(', ', array_slice($names, 0, -1)) . ' and ' . end($names) : (count($names) ? $names[0] : '*a plan customer*');
    if ($how === 'app') $where = '365 PC Manager' . (ps_esc($pc, 60) !== '' ? ' on ' . ps_esc($pc, 60) : '');
    elseif ($how === 'join') $where = 'the customer portal (email code)';
    else $where = 'the customer portal';
    $what = $how === 'app' ? 'their PC is on a separate FREE record and the app shows Free' : 'their sign-in is on a separate FREE record';
    return ':hourglass_flowing_sand: *Sign-in waiting for approval* - ' . $who . ' signed in to ' . $where . ' with their booking account.'
        . "\n> Their email matches the plan record " . $pl . ', but a plan is never handed over on an email match alone - so for now '
        . $what . '.'
        . "\n> Approve it in the staff portal, Today > Sign-ins waiting for approval: " . PS_PORTAL
        . "\n> Please don't delete the new free record as a duplicate - the customer is signed in to it.";
}

/* Every plan record with a sign-in waiting, for the staff portal. 'gone' = the free record it points at has been
   deleted or merged since: nothing to approve, the customer has to sign in again - shown so it can be dismissed. */
function ps_list($customers) {
    $out = array();
    foreach ((is_array($customers) ? $customers : array()) as $k => $c) {
        if (!ps_live($c) || empty($c['pending_signin']) || !is_array($c['pending_signin'])) continue;
        $ps = $c['pending_signin']; $link = (string)(isset($ps['link']) ? $ps['link'] : '');
        $L = ($link !== '' && $link !== (string)$k && isset($customers[$link]) && ps_live($customers[$link])) ? $customers[$link] : null;
        $lm = $L && isset($L['machines']) && is_array($L['machines']) ? $L['machines'] : array();
        $pc = ''; $pcSeen = '';
        foreach ($lm as $m) {
            $s = (string)(isset($m['seen']) ? $m['seen'] : '');
            if ($pc === '' || strcmp($s, $pcSeen) > 0) { $pc = (string)(isset($m['name']) ? $m['name'] : ''); $pcSeen = $s; }
        }
        $out[] = array('id' => ps_cid($k), 'name' => (string)(isset($c['name']) ? $c['name'] : ''),
            'email' => (string)(isset($c['email']) && $c['email'] !== '' ? $c['email'] : (isset($ps['email']) ? $ps['email'] : '')),
            'next' => (string)(isset($c['next']) ? $c['next'] : ''),
            'pcs' => count(isset($c['machines']) && is_array($c['machines']) ? $c['machines'] : array()),
            'sbname' => (string)(isset($ps['sbname']) ? $ps['sbname'] : ''), 'sbemail' => (string)(isset($ps['email']) ? $ps['email'] : ''),
            'ts' => (string)(isset($ps['ts']) ? $ps['ts'] : ''),
            'gone' => $L === null,
            'lid' => $L ? ps_cid($link) : '', 'lname' => $L ? (string)(isset($L['name']) ? $L['name'] : '') : '',
            'lpcs' => count($lm), 'pc' => $pc);
    }
    usort($out, function ($a, $b) { return strcmp($b['ts'], $a['ts']); });
    return $out;
}

/* Records a sign-in made (via 'signin' or 'join') that share their email with another live record: key => the other
   records' names. These look like duplicates in the licence table and are exactly the ones a customer's app may be
   signed in to, so the portal labels them and asks before deleting one. */
function ps_twins($customers) {
    $byEm = array();
    foreach ((is_array($customers) ? $customers : array()) as $k => $c) {
        if (!ps_live($c)) continue;
        $e = strtolower(trim((string)(isset($c['email']) ? $c['email'] : '')));
        if ($e !== '') $byEm[$e][] = (string)$k;
    }
    $out = array();
    foreach ($byEm as $keys) {
        if (count($keys) < 2) continue;
        foreach ($keys as $k) {
            $via = (string)(isset($customers[$k]['via']) ? $customers[$k]['via'] : '');
            if ($via !== 'signin' && $via !== 'join') continue;
            $others = array();
            foreach ($keys as $k2) if ($k2 !== $k) $others[] = (string)(isset($customers[$k2]['name']) && $customers[$k2]['name'] !== '' ? $customers[$k2]['name'] : 'another record');
            $out[$k] = $others;
        }
    }
    return $out;
}

// the record a portal id names, among live records only ('' if none)
function ps_find($customers, $id) {
    foreach ((is_array($customers) ? $customers : array()) as $k => $c) if (ps_live($c) && ps_cid($k) === $id) return (string)$k;
    return '';
}

/* Approve: the old console's logic (pcm-admin.php do=approve), unchanged. The free record is the one the customer's app
   holds a key for, so IT becomes the plan: tier pro, the plan record's name, its next-service date if the free record
   has none. The plan record is retired - tier free, email cleared so it stops matching sign-ins, merged_into the free
   record (every staff list skips it) - and its mark goes. $lid must name the free record the portal showed, so a stale
   screen can never approve a different sign-in. signin_approved is an audit note only; nothing reads it.
   Inherited limit, reported back as 'oldpcs': a PC activated with the plan record's OWN key keeps that key, and pcm.php
   does not follow merged_into, so it shows Free afterwards until it is re-activated with the free record's key. */
function ps_approve(&$db, $orig, $lid, $by, $now) {
    if ($orig === '' || !isset($db['customers'][$orig]) || !ps_live($db['customers'][$orig])) return array('ok' => false, 'error' => 'unknown_customer');
    $ps = isset($db['customers'][$orig]['pending_signin']) ? $db['customers'][$orig]['pending_signin'] : null;
    if (!is_array($ps)) return array('ok' => false, 'error' => 'not_pending');
    $link = (string)(isset($ps['link']) ? $ps['link'] : '');
    if ($link === '' || $link === $orig || !isset($db['customers'][$link]) || !ps_live($db['customers'][$link])) return array('ok' => false, 'error' => 'link_gone');
    if (ps_cid($link) !== (string)$lid) return array('ok' => false, 'error' => 'stale');
    $o = $db['customers'][$orig];
    $L =& $db['customers'][$link];
    $L['tier'] = 'pro';
    if (!empty($o['name'])) $L['name'] = $o['name'];
    if (empty($L['next']) && !empty($o['next'])) { $L['next'] = $o['next']; if (!empty($o['next_ts'])) $L['next_ts'] = $o['next_ts']; }
    $L['signin_approved'] = array('from' => (string)(isset($o['name']) ? $o['name'] : ''), 'by' => (string)$by, 'at' => (string)$now);
    $name = (string)(isset($L['name']) ? $L['name'] : '');
    unset($L);
    $db['customers'][$orig]['tier'] = 'free'; $db['customers'][$orig]['email'] = ''; $db['customers'][$orig]['merged_into'] = $link;
    unset($db['customers'][$orig]['pending_signin']);
    return array('ok' => true, 'name' => $name,
        'oldpcs' => count(isset($o['machines']) && is_array($o['machines']) ? $o['machines'] : array()));
}

// Dismiss: the mark goes, nothing else changes - the customer stays on their free record
function ps_dismiss(&$db, $orig) {
    if ($orig === '' || !isset($db['customers'][$orig]) || !ps_live($db['customers'][$orig])) return array('ok' => false, 'error' => 'unknown_customer');
    if (!isset($db['customers'][$orig]['pending_signin'])) return array('ok' => false, 'error' => 'not_pending');
    $ps = $db['customers'][$orig]['pending_signin'];
    unset($db['customers'][$orig]['pending_signin']);
    return array('ok' => true, 'name' => (string)(isset($db['customers'][$orig]['name']) ? $db['customers'][$orig]['name'] : ''),
        'sbname' => (string)(is_array($ps) && isset($ps['sbname']) ? $ps['sbname'] : ''));
}
