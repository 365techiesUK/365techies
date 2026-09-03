<?php
/**
 * Shared library for writing a phone number back INTO a SimplyBook client record.
 * Declaration-only, no side effects, no closing tag: safe to include anywhere -
 * the same contract as pcm-phone-lib.php.
 *
 * WHY THIS EXISTS. The staff diary now falls back to the number in our own
 * customer file when SimplyBook's booking row carries none, and labels it
 * "from our records - not in SimplyBook". This library backs the tooling that
 * heals those cases by putting the number into SimplyBook.
 *
 * ⚠️ THE HAZARD THIS LIBRARY IS SHAPED AROUND. SimplyBook's edit family is
 * documented only as "Edits client's record. See addClient method description
 * for list of available fields." - it does NOT say whether a partial payload
 * MERGES or REPLACES. The evidence points at replace: SimplyBook's own staff
 * have said of the sibling editBook that "you need to pass all data, there is no
 * way to provide changed fields only", and this repo already works around the
 * same shape in staffmove, which re-reads a booking purely to echo client_id
 * back. So every write here is read-modify-write.
 *
 * ⚠️ AND ECHO-BACK IS NOT A COMPLETE DEFENCE. JSON-RPC can WRITE custom client
 * fields (sb_add_client_smart proves it, live) but reportedly cannot READ them.
 * Write-capable and read-blind is exactly the shape in which echoing a record
 * back destroys the half you could not see. That is why the snapshot taken
 * before every write also reads the v2 REST endpoints, and why nothing here
 * runs until api/pcm-sbclient-canary.php has settled the question empirically
 * against this account.
 *
 * Nothing in this file talks to SimplyBook by itself. It builds payloads,
 * decides eligibility, diffs records and manages the snapshot log; the callers
 * own the transport.
 */

if (!defined('SBW_SHAPE')) {
    /* Pinned into the probe's verdict file and re-checked before every write, so
       that changing the payload shape below can never silently reuse a probe
       that tested a different shape. */
    define('SBW_SHAPE', 'echoback-v1:name,email,address1,address2,city,zip+phone');
    /* Deliberately small. A dry run cannot see the two failure modes that would
       actually hurt - custom fields and consent flags - so "it looked fine in the
       dry run" is not evidence. Five at a time buys everything ninety would. */
    define('SBW_MAX_PER_RUN', 5);
    define('SBW_MAX_PER_DAY', 20);
}

if (!function_exists('sbw_push_payload')) {

/**
 * The ONE payload builder. The probe and the production write both use it, so
 * what was proved safe is byte-for-byte what gets sent later.
 *
 * Echoes back every standard field the read returned, verbatim - no trim, no
 * case change, no normalisation - then overrides the phone. A key absent from
 * the read stays absent: we never invent a blank field, because under replace
 * semantics an invented blank is a deletion.
 *
 * Never emits id, client_fields, the promo/consent flags, is_deleted,
 * can_be_edited or is_blocked. Some of those cannot be read back reliably, and
 * a field you cannot read is a field you must not send.
 */
function sbw_push_payload($sb, $phoneDisplay) {
    $p = array();
    foreach (array('name', 'email', 'address1', 'address2', 'city', 'zip') as $k) {
        if (!is_array($sb) || !array_key_exists($k, $sb)) continue;
        if (!is_scalar($sb[$k])) continue;
        $p[$k] = $sb[$k];
    }
    $p['phone'] = (string)$phoneDisplay;
    return $p;
}

/**
 * Which of OUR numbers may be pushed, and from which field.
 *
 * ONLY the two the customer typed themselves in their own portal. sb_phone is
 * excluded because it came FROM SimplyBook and pushing it back is a round trip;
 * the legacy `phone` field is excluded because it is unattested and this writes
 * into the system that dials customers. A customer whose only number is the
 * legacy field is deliberately not healed by this feature.
 */
function sbw_source_phone($c) {
    if (!is_array($c)) return array('', '');
    foreach (array('mobile', 'tel') as $f) {
        if (!empty($c[$f]) && is_scalar($c[$f])) return array($f, (string)$c[$f]);
    }
    return array('', '');
}

/**
 * May this SimplyBook record be written to at all? Judged on a FRESH per-client
 * read - never on a paged list and never on a getBookings row, because a blank
 * phone on a booking row is not proof the client record is blank.
 *
 * Returns array(bool $ok, string $why).
 */
function sbw_writable($sb) {
    if (!is_array($sb)) return array(false, 'no record read');
    $ph = isset($sb['phone']) ? preg_replace('/[^0-9+]/', '', (string)$sb['phone']) : '';
    if ($ph !== '') return array(false, 'SimplyBook already has a number');
    if (!empty($sb['is_blocked'])) return array(false, 'blocked in SimplyBook');
    if (array_key_exists('can_be_edited', $sb) && !$sb['can_be_edited']) return array(false, 'not editable');
    $nm = isset($sb['name']) ? trim((string)$sb['name']) : '';
    if ($nm === '') return array(false, 'client record has no name');
    return array(true, '');
}

/**
 * Keys whose value changed, appeared or vanished between two reads. Used to
 * prove a write moved the phone AND NOTHING ELSE - the response body is not
 * evidence of either.
 */
function sbw_diff($before, $after, $ignore = array('phone')) {
    $out = array();
    $before = is_array($before) ? $before : array();
    $after  = is_array($after)  ? $after  : array();
    $keys = array_unique(array_merge(array_keys($before), array_keys($after)));
    foreach ($keys as $k) {
        if (in_array($k, $ignore, true)) continue;
        $hb = array_key_exists($k, $before);
        $ha = array_key_exists($k, $after);
        if ($hb !== $ha) { $out[] = $k; continue; }
        if (!$hb) continue;
        $a = $before[$k]; $b = $after[$k];
        if (is_scalar($a) && is_scalar($b)) { if ((string)$a !== (string)$b) $out[] = $k; }
        else if (json_encode($a) !== json_encode($b)) $out[] = $k;
    }
    sort($out);
    return $out;
}

/**
 * Append one snapshot record and return its id, or '' on failure.
 *
 * ⚠️ The caller MUST NOT proceed to write if this returns '' - the snapshot is
 * the only undo. Written and flushed BEFORE the network call, never after, so a
 * process that dies mid-write still leaves a record of what was there.
 *
 * The file is a .php that exits on line 1: api/ has no .htaccess in this repo
 * and gitignored has twice turned out not to mean unserved.
 */
function sbw_log_append($file, $rec) {
    $id = date('Ymd-His') . '-' . (isset($rec['cid']) ? (int)$rec['cid'] : 0)
        . '-' . substr(md5(uniqid('', true)), 0, 4);
    $rec['snap'] = $id;
    if (!file_exists($file)) {
        if (@file_put_contents($file, "<?php exit; ?>\n", LOCK_EX) === false) return '';
    }
    $line = json_encode($rec, JSON_UNESCAPED_SLASHES);
    if ($line === false) return '';
    $fh = @fopen($file, 'a');
    if (!$fh) return '';
    $okw = false;
    if (@flock($fh, LOCK_EX)) {
        $okw = (@fwrite($fh, $line . "\n") !== false);
        @fflush($fh);
        /* fsync where the build has it: a snapshot still in the OS cache when the
           box dies is a snapshot that never existed. */
        if ($okw && function_exists('fsync')) { @fsync($fh); }
        @flock($fh, LOCK_UN);
    }
    @fclose($fh);
    return $okw ? $id : '';
}

/** Every snapshot record, newest last. Line 1 is the exit guard, not data. */
function sbw_log_read($file) {
    $out = array();
    if (!is_readable($file)) return $out;
    $raw = (string)@file_get_contents($file);
    if ($raw === '') return $out;
    foreach (explode("\n", $raw) as $i => $ln) {
        if ($i === 0) continue;
        $ln = trim($ln);
        if ($ln === '') continue;
        $j = json_decode($ln, true);
        if (is_array($j)) $out[] = $j;
    }
    return $out;
}

/**
 * v2 REST auth, READ-ONLY use. JSON-RPC cannot read custom client fields, so the
 * before-write snapshot has to come from here or it is incomplete.
 * Returns array($token, $variant) or array('', '').
 */
function sbw_rest_token($company, $login, $key) {
    foreach (array('password', 'api_key') as $variant) {
        $body = json_encode(array('company' => $company, 'login' => $login, $variant => $key));
        $ch = curl_init('https://user-api-v2.simplybook.me/admin/auth');
        curl_setopt_array($ch, array(
            CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true, CURLOPT_TIMEOUT => 25,
            CURLOPT_HTTPHEADER => array('Content-Type: application/json'),
            CURLOPT_POSTFIELDS => $body));
        $r = curl_exec($ch); curl_close($ch);
        $j = json_decode((string)$r, true);
        if (is_array($j) && !empty($j['token'])) return array((string)$j['token'], $variant);
    }
    return array('', '');
}

/**
 * One v2 REST GET.
 * ⚠️ The header is X-Token, NOT X-User-Token. X-User-Token is the JSON-RPC one;
 * sending it here fails in a way that reads like a permissions problem and is not.
 */
function sbw_rest_get($token, $company, $path) {
    $ch = curl_init('https://user-api-v2.simplybook.me' . $path);
    curl_setopt_array($ch, array(
        CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 25,
        CURLOPT_HTTPHEADER => array('Content-Type: application/json',
                                    'X-Company-Login: ' . $company,
                                    'X-Token: ' . $token)));
    $r = curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
    if ($code < 200 || $code >= 300) return null;
    $j = json_decode((string)$r, true);
    return is_array($j) ? $j : null;
}

/**
 * The probe gate. No write may proceed unless the canary has PROVED, on THIS
 * account and for THIS payload shape, that the echo-back preserves everything it
 * does not mean to touch. Returns array(bool $ok, string $why).
 */
function sbw_pass_ok($file, $company) {
    if (!is_readable($file)) return array(false, 'the canary has not been run on this server');
    $v = @include $file;
    if (!is_array($v)) return array(false, 'the canary verdict file is unreadable');
    if (!isset($v['company']) || (string)$v['company'] !== (string)$company)
        return array(false, 'the canary verdict is for a different SimplyBook company');
    if (!isset($v['shape']) || (string)$v['shape'] !== SBW_SHAPE)
        return array(false, 'the payload shape has changed since the canary ran - re-run it');
    if (!isset($v['ts']) || (time() - (int)$v['ts']) > 90 * 86400)
        return array(false, 'the canary verdict is over 90 days old - re-run it');
    if (empty($v['ui_checked']))
        return array(false, 'nobody has confirmed the canary clients in the SimplyBook UI yet'
                          . ' - check them, then run: php api/pcm-sbclient-canary.php --ui-confirmed');
    foreach (array('standard', 'custom_fields', 'consent', 'phone_landed') as $k) {
        if (empty($v[$k])) return array(false, 'the canary FAILED on ' . $k . ' - do not write');
    }
    return array(true, '');
}

}
