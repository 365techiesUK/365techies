<?php
/*
 * 365 PC Manager - a PC whose key no longer opens a customer record finds its way home (8 Oct 2026).
 *
 * Alex Simons' PC said "Signed in as ..." while every booking call said "Please sign in first": the key in its
 * licence no longer opened a record here, and a check-in for an unknown key was answered plain "free", so the app
 * never found out. The app cannot sign itself in again (the password is never stored) and the owner cannot visit
 * every PC, so the server puts it right on the PC's next call - but ONLY where it holds proof of who it belongs to:
 *   - merged:   the record was retired by "approve" (merged_into) - the plan moved to the linked record, so follow it
 *               (a PC activated with the old key was quietly downgraded to free before this);
 *   - alias:    a key re-homed before (key_alias), or a deleted record's SimplyBook client (its tombstone in 'gone')
 *               that another record is linked to - sign-in's own step 2: "a record already linked to THIS verified
 *               SimplyBook client";
 *   - restored: a sign-in record deleted while a plan record still waits to be linked to it (pending_signin.link)
 *               comes back as the FREE record it was - it never grants the plan; the owner still approves that.
 * Nothing is guessed: no email matching (SimplyBook accounts can be registered with anyone's email), no machine
 * matching. A truly unknown key stays unknown, and PC Manager v36+ says so and signs out.
 * Include-only: the callers hold the data lock and save. Unlock-everything keys (UNLK-...) are never customers -
 * callers skip them.
 */
if (!function_exists('rehome_resolve')) {

/** Follow merged_into from an existing record; '' when $k isn't a record. */
function rehome_follow(array $db, $k) {
    $k = (string)$k;
    for ($i = 0; $i < 4; $i++) {
        if ($k === '' || !isset($db['customers'][$k])) return '';
        $m = isset($db['customers'][$k]['merged_into']) ? (string)$db['customers'][$k]['merged_into'] : '';
        if ($m === '' || $m === $k || !isset($db['customers'][$m])) return $k;
        $k = $m;
    }
    return $k;
}

/** Read only: where $key leads now - array(record key or '', how), how = '' (as it is), 'merged' or 'alias'. */
function rehome_lookup(array $db, $key) {
    $key = (string)$key;
    if ($key === '') return array('', '');
    if (isset($db['customers'][$key])) { $t = rehome_follow($db, $key); return array($t, $t !== $key ? 'merged' : ''); }
    if (isset($db['key_alias'][$key])) { $t = rehome_follow($db, (string)$db['key_alias'][$key]); if ($t !== '') return array($t, 'alias'); }
    return array('', '');
}

/** Resolve $key and repair where there is proof. Returns array(record key or '', how, changed); how = '' (as it is),
 *  'merged', 'alias', 'restored' or 'unknown'. The PC ($machine) is put on the record it leads to: it held a key we
 *  issued, which is what activate / check-in ask for. */
function rehome_resolve(array &$db, $key, $machine, $mname = '', $now = null) {
    $now = $now === null ? time() : (int)$now;
    $key = (string)$key; $machine = (string)$machine;
    if ($key === '') return array('', '', false);
    if (!isset($db['customers']) || !is_array($db['customers'])) $db['customers'] = array();
    list($t, $how) = rehome_lookup($db, $key);
    $changed = false;
    if ($t === '') {
        $cid = isset($db['gone'][$key]['cid']) ? (int)$db['gone'][$key]['cid'] : 0;
        $pend = '';
        foreach ($db['customers'] as $k2 => $c2)
            if (isset($c2['pending_signin']['link']) && (string)$c2['pending_signin']['link'] === $key) {
                $pend = (string)$k2;
                if ($cid <= 0 && !empty($c2['pending_signin']['cid'])) $cid = (int)$c2['pending_signin']['cid'];
                break;
            }
        if ($cid > 0)
            foreach ($db['customers'] as $k2 => $c2)
                if (isset($c2['sb_client_id']) && (int)$c2['sb_client_id'] === $cid) { $t = rehome_follow($db, $k2); if ($t !== '') break; }
        if ($t !== '') {
            if (!isset($db['key_alias']) || !is_array($db['key_alias'])) $db['key_alias'] = array();
            $db['key_alias'][$key] = $t; $how = 'alias'; $changed = true;
        } elseif ($pend !== '') {
            $ps = $db['customers'][$pend]['pending_signin'];
            $em = strtolower(trim((string)(isset($ps['email']) ? $ps['email'] : '')));
            $nm = trim((string)(isset($ps['sbname']) ? $ps['sbname'] : ''));
            $stamp = gmdate('Y-m-d H:i', $now);
            $rec = array('name' => ($nm !== '' ? $nm : $em), 'email' => $em, 'tier' => 'free', 'next' => '', 'created' => $stamp,
                         'via' => 'signin', 'restored' => $stamp, 'machines' => array());
            if ($cid > 0) $rec['sb_client_id'] = $cid;
            if ($nm !== '') $rec['sb_name'] = $nm;
            if ($em !== '') $rec['sb_email'] = $em;
            $db['customers'][$key] = $rec;
            unset($db['gone'][$key]);
            $t = $key; $how = 'restored'; $changed = true;
        } else {
            return array('', 'unknown', false);
        }
    }
    if ($how !== '' && $machine !== '') {
        if (!isset($db['customers'][$t]['machines']) || !is_array($db['customers'][$t]['machines'])) $db['customers'][$t]['machines'] = array();
        if (!isset($db['customers'][$t]['machines'][$machine]) && count($db['customers'][$t]['machines']) < 25) {
            $stamp = gmdate('Y-m-d H:i', $now);
            $db['customers'][$t]['machines'][$machine] = array('name' => substr((string)$mname, 0, 60), 'score' => 0, 'verdict' => '',
                'seen' => $stamp, 'activated' => $stamp, 'rehomed' => $how);
            $changed = true;
        }
    }
    return array($t, $how, $changed);
}

/** Before a record is deleted: keep ONLY its SimplyBook client id (no name, no email), a year, so a PC still holding
 *  its key can find the same client's other record (rehome_resolve). Aliases that led to it go. */
function rehome_tombstone(array &$db, $key, $now = null) {
    $now = $now === null ? time() : (int)$now;
    $key = (string)$key;
    if (!isset($db['gone']) || !is_array($db['gone'])) $db['gone'] = array();
    foreach ($db['gone'] as $k2 => $g) if ((isset($g['ts']) ? (int)$g['ts'] : 0) < $now - 31536000) unset($db['gone'][$k2]);
    $cid = isset($db['customers'][$key]['sb_client_id']) ? (int)$db['customers'][$key]['sb_client_id'] : 0;
    if ($cid > 0) $db['gone'][$key] = array('ts' => $now, 'cid' => $cid);
    if (isset($db['key_alias']) && is_array($db['key_alias']))
        foreach ($db['key_alias'] as $a => $to) if ((string)$to === $key) unset($db['key_alias'][$a]);
    if (empty($db['gone'])) unset($db['gone']);
}

/** The Slack line for a PC that re-homed (no keys in it). '' when there is nothing worth saying. */
function rehome_note(array $db, $t, $how, $mname) {
    if ($how !== 'alias' && $how !== 'restored' && $how !== 'merged') return '';
    $who = isset($db['customers'][$t]['name']) ? trim((string)$db['customers'][$t]['name']) : '';
    $who = str_replace(array('*', '_', '`', '<', '>', '&'), '', $who !== '' ? $who : 'a customer');
    $pc = str_replace(array('*', '_', '`', '<', '>', '&'), '', trim((string)$mname));
    $pc = $pc !== '' ? 'PC "' . substr($pc, 0, 40) . '"' : 'A PC';
    if ($how === 'restored')
        return ':link: *A PC found its way back* - ' . $pc . ' was signed in to ' . $who . "'s sign-in record, which had been deleted while it waited for approval."
             . ' It is back as the FREE record it was. If ' . $who . ' is on a plan, approve the link (pcm-admin) and the PC switches over.';
    if ($how === 'merged')
        return ':link: *A PC found its way back* - ' . $pc . " still held the key of a record merged into " . $who . "'s; it now checks in on " . $who . "'s record.";
    return ':link: *A PC found its way back* - ' . $pc . " held the key of a deleted record; the same SimplyBook client's record is " . $who . "'s, so it checks in there now.";
}

/** Post $text to Slack once the reply has gone and the caller's data lock is released ($lock: the flock handle, or null). */
function rehome_slack_later($text, $lock = null) {
    if ($text === '') return;
    register_shutdown_function(function () use ($text, $lock) {
        if ($lock) { @flock($lock, LOCK_UN); }
        if (function_exists('fastcgi_finish_request')) @fastcgi_finish_request();
        $f = __DIR__ . '/slack-webhook.php';
        if (!file_exists($f)) return;
        $SLACK_WEBHOOK = '';
        ob_start(); include $f; ob_end_clean();   // never echo the file: it may be a bare URL (see pcm_slack_webhook)
        if (empty($SLACK_WEBHOOK) && preg_match('#https://hooks\.slack\.com/\S+#', (string)@file_get_contents($f), $m)) $SLACK_WEBHOOK = trim($m[0]);
        if (empty($SLACK_WEBHOOK) || !function_exists('curl_init')) return;
        $ch = curl_init($SLACK_WEBHOOK);
        curl_setopt_array($ch, array(CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 6,
            CURLOPT_HTTPHEADER => array('Content-Type: application/json'), CURLOPT_POSTFIELDS => json_encode(array('text' => $text))));
        @curl_exec($ch); curl_close($ch);
    });
}
}
