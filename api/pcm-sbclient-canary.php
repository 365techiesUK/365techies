<?php
/**
 * Does editing a SimplyBook client REPLACE the record or MERGE the fields sent?
 *
 *   php api/pcm-sbclient-canary.php                 <- READ ONLY: premise + account state
 *   php api/pcm-sbclient-canary.php --probe         <- shows exactly what it would create
 *   php api/pcm-sbclient-canary.php --probe --live  <- creates 2 SYNTHETIC clients and probes
 *   php api/pcm-sbclient-canary.php --ui-confirmed  <- after a human checks the SimplyBook UI
 *
 * WHY THIS EXISTS. api/pcm-sbphone-push.php wants to put a customer's phone
 * number into their SimplyBook client record. SimplyBook documents its edit
 * method as nothing more than "Edits client's record. See addClient method
 * description for list of available fields." It does not say whether a partial
 * payload merges or replaces, and that single question decides whether the
 * feature is safe. Their own staff have said of the sibling editBook that "you
 * need to pass all data, there is no way to provide changed fields only".
 *
 * Guessing is not an option when the loser is the owner's live booking system,
 * so this establishes the answer EMPIRICALLY, on this account, using synthetic
 * clients only. It never touches a real customer.
 *
 * ⚠️ ECHOING THE RECORD BACK IS NOT ENOUGH ON ITS OWN. JSON-RPC can WRITE custom
 * client fields but reportedly cannot READ them, and the consent flags are
 * write-only under one name and readable under another, inverted. Write-capable
 * and read-blind is exactly how an echo-back destroys the half you cannot see -
 * on this account that includes fields named Hardware, Support Package, Payment
 * Method and one called Passwords. So the probe checks four channels, and the
 * final word is a human looking at the client card in the UI.
 *
 * SAFETY:
 *  1. CLI only - a web request exits.
 *  2. READ ONLY by default. Nothing is created without --probe --live.
 *  3. Only ever writes to clients IT created, named "API CANARY ... - delete me".
 *  4. Writes the verdict file only when every check passes.
 *  5. Never includes pcm-booking.php: that file dispatches at include time.
 */
if (php_sapi_name() !== 'cli') { http_response_code(404); exit; }

$BASE = __DIR__;
$CFG  = $BASE . '/pcm-simplybook.php';
$DATA = $BASE . '/pcm-data.json';
$OKF  = $BASE . '/pcm-sbwrite-ok.php';
$LOG  = $BASE . '/pcm-sbwrite-log.php';

require_once $BASE . '/pcm-sbwrite-lib.php';
require_once $BASE . '/pcm-phone-lib.php';

$PROBE = in_array('--probe', $argv, true);
$LIVE  = in_array('--live', $argv, true);
$UICON = in_array('--ui-confirmed', $argv, true);

if (!is_readable($CFG)) { fwrite(STDERR, "no api/pcm-simplybook.php - run this on the server\n"); exit(2); }
require $CFG;   // $SB_COMPANY, $SB_API_USER, $SB_API_USER_KEY
if (empty($SB_COMPANY) || empty($SB_API_USER) || empty($SB_API_USER_KEY)) {
    fwrite(STDERR, "admin API credentials missing\n"); exit(2);
}

/* ---- mode 2: a human has checked the client card in the UI ---------------- */
if ($UICON) {
    if (!is_readable($OKF)) { fwrite(STDERR, "no verdict file yet - run --probe --live first\n"); exit(2); }
    $v = @include $OKF;
    if (!is_array($v)) { fwrite(STDERR, "verdict file unreadable\n"); exit(2); }
    $v['ui_checked'] = true;
    $v['ui_ts'] = time();
    @file_put_contents($OKF, "<?php return " . var_export($v, true) . ";\n", LOCK_EX);
    echo "Recorded: the canary clients were checked in the SimplyBook UI.\n";
    echo "api/pcm-sbphone-push.php will now run.\n";
    exit(0);
}

/* ---- transport: our own, so we never include pcm-booking.php ------------- */
function rpc($url, $method, $params, $headers = array()) {
    $ch = curl_init($url);
    curl_setopt_array($ch, array(
        CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true, CURLOPT_TIMEOUT => 25,
        CURLOPT_HTTPHEADER => array_merge(array('Content-Type: application/json'), $headers),
        CURLOPT_POSTFIELDS => json_encode(array('jsonrpc' => '2.0', 'id' => 1, 'method' => $method, 'params' => $params))));
    $r = curl_exec($ch); $err = curl_error($ch); curl_close($ch);
    if ($r === false) return array('_net' => $err !== '' ? $err : 'no response');
    $j = json_decode((string)$r, true);
    return is_array($j) ? $j : array('_net' => 'unparseable response');
}
function why($r) {
    if (isset($r['_net'])) return 'network: ' . substr((string)$r['_net'], 0, 80);
    if (isset($r['error']['message'])) return substr(preg_replace('/[^\x20-\x7E]/', '', (string)$r['error']['message']), 0, 140)
        . (isset($r['error']['code']) ? ' [' . (int)$r['error']['code'] . ']' : '');
    return 'no result';
}
/** getClient with the getClientInfo fallback. null when neither answers. */
function sb_read_client($cid, $H) {
    $r = rpc('https://user-api.simplybook.me/admin/', 'getClient', array($cid), $H);
    if (!isset($r['_net']) && !empty($r['result']) && is_array($r['result'])) return $r['result'];
    $r2 = rpc('https://user-api.simplybook.me/admin/', 'getClientInfo', array($cid), $H);
    if (!isset($r2['_net']) && !empty($r2['result']) && is_array($r2['result'])) return $r2['result'];
    return null;
}
function mask_phone($p) {
    $p = (string)$p;
    if (strlen($p) < 6) return str_repeat('*', strlen($p));
    return substr($p, 0, 4) . str_repeat('*', max(0, strlen($p) - 6)) . substr($p, -2);
}

$t = rpc('https://user-api.simplybook.me/login/', 'getUserToken', array($SB_COMPANY, $SB_API_USER, $SB_API_USER_KEY));
$token = isset($t['result']) ? (string)$t['result'] : '';
if ($token === '') { fwrite(STDERR, "could not get an admin token: " . why($t) . "\n"); exit(2); }
$H = array('X-Company-Login: ' . $SB_COMPANY, 'X-User-Token: ' . $token);

echo "SimplyBook company: $SB_COMPANY\n\n";

/* ---- account state -------------------------------------------------------- */
echo "-- what this account requires of a client record\n";
$rf = rpc('https://user-api.simplybook.me/admin/', 'getCompanyParam', array('require_fields'), $H);
echo "   require_fields: " . (isset($rf['result']) ? substr(preg_replace('/[^\x20-\x7E]/', '', json_encode($rf['result'])), 0, 200) : why($rf)) . "\n";
$cf = rpc('https://user-api.simplybook.me/admin/', 'getCompanyParam', array('client_fields'), $H);
$cfIds = array();
if (isset($cf['result']) && is_array($cf['result'])) {
    foreach ($cf['result'] as $k => $v) {
        $id = is_array($v) && isset($v['id']) ? (string)$v['id'] : (string)$k;
        $nm = is_array($v) && isset($v['title']) ? (string)$v['title'] : (is_array($v) ? json_encode($v) : (string)$v);
        if (preg_match('/^[a-f0-9]{32}$/', $id)) $cfIds[$id] = $nm;
    }
}
echo "   custom client fields: " . count($cfIds) . (count($cfIds) ? ' (' . substr(implode(', ', array_slice(array_values($cfIds), 0, 6)), 0, 120) . ')' : '') . "\n";
if (count($cfIds)) echo "     ^ these are the fields JSON-RPC can write but reportedly cannot read. They are the risk.\n";

echo "\n-- v2 REST (the only way to read custom field values back)\n";
list($rtok, $rvar) = sbw_rest_token($SB_COMPANY, $SB_API_USER, $SB_API_USER_KEY);
if ($rtok === '') {
    echo "   rest: UNAVAILABLE - without it a write has no complete undo, so the push script will refuse to run.\n";
} else {
    echo "   rest: ok (authenticated with '$rvar')\n";
    $wh = sbw_rest_get($rtok, $SB_COMPANY, '/admin/webhooks');
    if ($wh === null) echo "   webhooks: COULD NOT CHECK - confirm in Settings that nothing fires on client change before writing\n";
    else {
        $hits = array();
        foreach ((is_array($wh) && isset($wh['data']) ? $wh['data'] : (array)$wh) as $w) {
            if (!is_array($w)) continue;
            $ev = (string)(isset($w['event']) ? $w['event'] : '');
            if (stripos($ev, 'client') !== false) $hits[] = $ev;
        }
        echo "   webhooks on client change: " . ($hits ? implode(', ', $hits) . '  <- CHECK WHAT THESE DO' : 'none') . "\n";
    }
}

/* ---- the premise: is the diary label even telling the truth? ------------- */
echo "\n-- the premise: when the diary says \"not in SimplyBook\", is the client record really blank?\n";
$ag = rpc('https://user-api.simplybook.me/admin/', 'getBookings',
    array(array('booking_type' => 'non_cancelled', 'date_from' => date('Y-m-d'),
                'date_to' => date('Y-m-d', time() + 86400 * 30), 'order' => 'date_start_asc')), $H);
$rows = isset($ag['result']) && is_array($ag['result']) ? $ag['result'] : array();
$noRow = 0; $genuinelyBlank = 0; $sbHasIt = 0; $checked = 0; $samples = array();
foreach ($rows as $b) {
    $ph = '';
    foreach (array('client_phone', 'phone', 'client_mobile') as $pk) if (!empty($b[$pk])) { $ph = (string)$b[$pk]; break; }
    if ($ph === '' && isset($b['client']) && is_array($b['client']) && !empty($b['client']['phone'])) $ph = (string)$b['client']['phone'];
    if ($ph !== '') { if (count($samples) < 3) $samples[] = mask_phone($ph); continue; }
    $cid = (int)(isset($b['client_id']) ? $b['client_id'] : 0);
    if (!$cid) continue;
    $noRow++;
    if ($checked >= 40) continue;
    $checked++;
    $c = sb_read_client($cid, $H);
    if ($c === null) continue;
    $cp = isset($c['phone']) ? preg_replace('/[^0-9+]/', '', (string)$c['phone']) : '';
    if ($cp === '') $genuinelyBlank++; else $sbHasIt++;
}
echo "   bookings with no phone on the row: $noRow  (checked the client record for $checked)\n";
echo "     ... and the SimplyBook CLIENT record is genuinely blank: $genuinelyBlank\n";
echo "     ... but SimplyBook DOES hold a number, the row just omitted it: $sbHasIt\n";
if ($samples) echo "   phone format this account actually stores: " . implode(', ', $samples) . "\n";
if ($genuinelyBlank === 0 && $checked > 0) {
    echo "\n   *** STOP. Nothing is genuinely missing from SimplyBook. The diary label is a read\n";
    echo "       artefact of getBookings, not missing data, and this feature should NOT be built. ***\n";
}

/* ---- how many of ours could be pushed ------------------------------------ */
$cands = 0;
if (is_readable($DATA)) {
    $db = json_decode((string)@file_get_contents($DATA), true);
    if (is_array($db) && isset($db['customers']) && is_array($db['customers'])) {
        foreach ($db['customers'] as $c) {
            list($f, $raw) = sbw_source_phone($c);
            if ($f !== '') $cands++;
        }
    }
}
echo "\n   customers of ours holding a portal-typed mobile/landline: $cands\n";

if (!$PROBE) {
    echo "\nRead-only pass done. Nothing was written.\n";
    echo "Next: php api/pcm-sbclient-canary.php --probe --live\n";
    exit(0);
}

/* ---- the probe ------------------------------------------------------------ */
$stamp = date('His');
$plan = array(
    array('key' => 'A', 'naive' => true,
          'name' => 'API CANARY A - delete me', 'email' => 'apitest+canaryA' . $stamp . '@365techies.co.uk'),
    array('key' => 'B', 'naive' => false,
          'name' => 'API CANARY B - delete me', 'email' => 'apitest+canaryB' . $stamp . '@365techies.co.uk'),
);
echo "\n-- the probe\n";
foreach ($plan as $p) {
    echo "   would create: {$p['name']}  <{$p['email']}>  phone 01202775566, address, both consent flags set,\n";
    echo "                 and every custom field seeded with a CANARY- marker\n";
}
echo "   then: A gets a NAIVE edit (phone only). B gets the PRODUCTION echo-back payload.\n";
echo "   both are then re-read on four channels and diffed.\n";
if (!$LIVE) { echo "\nDRY RUN. Re-run with --probe --live to actually create and probe.\n"; exit(0); }

/** addClient, satisfying required custom fields the way sb_add_client_smart does. */
function canary_create($cd, $cfIds, $H) {
    $cf = array();
    foreach ($cfIds as $id => $nm) $cf[$id] = 'CANARY-' . substr($id, 0, 6);
    for ($i = 0; $i < 8; $i++) {
        $p = $cd; if (count($cf)) $p['client_fields'] = $cf;
        $r = rpc('https://user-api.simplybook.me/admin/', 'addClient', array($p, false), $H);
        if (isset($r['_net']) || !empty($r['result'])) return $r;
        $f = isset($r['error']['data']['field']) ? (string)$r['error']['data']['field'] : '';
        if (preg_match('#^client_fields/([a-f0-9]{32})$#', $f, $m) && !isset($cf[$m[1]])) { $cf[$m[1]] = 'CANARY-' . substr($m[1], 0, 6); continue; }
        return $r;
    }
    return array('error' => array('message' => 'gave up after 8 attempts'));
}
function four_channel($cid, $H, $rtok, $company) {
    return array(
        'getClient'     => sb_read_client($cid, $H),
        'rest'          => $rtok ? sbw_rest_get($rtok, $company, '/admin/clients/' . (int)$cid) : null,
        'rest_fields'   => $rtok ? sbw_rest_get($rtok, $company, '/admin/clients/field-values/' . (int)$cid) : null,
    );
}

$made = array();
foreach ($plan as $p) {
    $cd = array('name' => $p['name'], 'email' => $p['email'], 'phone' => '01202775566',
                'address1' => '1 Canary Street', 'address2' => 'Testville', 'city' => 'Bournemouth', 'zip' => 'BH1 1AA',
                'is_email_unsubscribed' => true, 'is_sms_unsubscribed' => true);
    $r = canary_create($cd, $cfIds, $H);
    $cid = isset($r['result']) ? (int)(is_array($r['result']) && isset($r['result']['id']) ? $r['result']['id'] : $r['result']) : 0;
    if (!$cid) { fwrite(STDERR, "could not create canary {$p['key']}: " . why($r) . "\n"); exit(2); }
    echo "   created canary {$p['key']}: client #$cid\n";
    $p['cid'] = $cid;
    $p['before'] = four_channel($cid, $H, $rtok, $SB_COMPANY);
    sbw_log_append($LOG, array('ts' => time(), 'cid' => $cid, 'canary' => $p['key'],
                               'email' => $p['email'], 'before' => $p['before']));
    $made[] = $p;
}

$NEW = '07520 615332';
$results = array();
foreach ($made as $p) {
    $before = $p['before']['getClient'];
    if ($p['naive']) {
        $payload = array('phone' => $NEW);            // the dangerous shape, on a throwaway record
    } else {
        $payload = sbw_push_payload($before, $NEW);   // exactly what production will send
    }
    $w = rpc('https://user-api.simplybook.me/admin/', 'editClient', array($p['cid'], $payload), $H);
    $after = four_channel($p['cid'], $H, $rtok, $SB_COMPANY);
    $results[$p['key']] = array('p' => $p, 'w' => $w, 'after' => $after, 'payload' => $payload);
    echo "\n   canary {$p['key']} (" . ($p['naive'] ? 'NAIVE phone-only' : 'production echo-back') . ") -> "
       . (isset($w['result']) ? 'accepted' : why($w)) . "\n";
    $lost = sbw_diff($before, $after['getClient']);
    echo "     standard fields changed besides phone: " . ($lost ? implode(', ', $lost) . '  <-- LOST' : 'none') . "\n";
    $gotPhone = isset($after['getClient']['phone']) ? (string)$after['getClient']['phone'] : '';
    echo "     phone now reads: " . ($gotPhone === '' ? '(blank)' : $gotPhone) . "\n";
    $bf = $p['before']['rest_fields']; $af = $after['rest_fields'];
    if ($bf === null || $af === null) echo "     custom fields: COULD NOT READ (no REST) - cannot clear this check\n";
    else echo "     custom fields: " . (json_encode($bf) === json_encode($af) ? 'unchanged' : 'CHANGED <-- LOST') . "\n";
    $bc = $p['before']['rest']; $ac = $after['rest'];
    if ($bc === null || $ac === null) echo "     consent flags: COULD NOT READ (no REST)\n";
    else {
        $ck = array();
        foreach (array('email_promo_subscribed', 'sms_promo_subscribed', 'is_email_unsubscribed', 'is_sms_unsubscribed') as $k)
            if (array_key_exists($k, (array)$bc) || array_key_exists($k, (array)$ac))
                $ck[$k] = array(isset($bc[$k]) ? $bc[$k] : null, isset($ac[$k]) ? $ac[$k] : null);
        $moved = array();
        foreach ($ck as $k => $pair) if (json_encode($pair[0]) !== json_encode($pair[1])) $moved[] = $k;
        echo "     consent flags: " . ($moved ? implode(', ', $moved) . '  <-- CHANGED' : 'unchanged') . "\n";
        $results[$p['key']]['consent_moved'] = $moved;
    }
    $results[$p['key']]['lost'] = $lost;
    $results[$p['key']]['phone_ok'] = (preg_replace('/[^0-9]/', '', $gotPhone) === preg_replace('/[^0-9]/', '', $NEW));
    $results[$p['key']]['custom_ok'] = ($bf !== null && $af !== null && json_encode($bf) === json_encode($af));
}

/* re-send B's identical payload, to see whether an unchanged email trips the
   once-per-day email-change limiter */
$B = $results['B'];
$w2 = rpc('https://user-api.simplybook.me/admin/', 'editClient', array($B['p']['cid'], $B['payload']), $H);
$emailRerun = isset($w2['result']) ? 'ok' : (stripos(why($w2), 'often') !== false ? 'rate-limited' : 'refused: ' . why($w2));
echo "\n   re-sending B's identical payload: $emailRerun\n";

$stdOK     = empty($results['B']['lost']);
$customOK  = !empty($results['B']['custom_ok']);
$consentOK = empty($results['B']['consent_moved']);
$phoneOK   = !empty($results['B']['phone_ok']);
$passOK    = ($stdOK && $customOK && $consentOK && $phoneOK);

echo "\n================ VERDICT ================\n";
echo "  naive phone-only edit lost: " . (empty($results['A']['lost']) ? 'nothing (it MERGES)' : implode(', ', $results['A']['lost']) . '  (it REPLACES)') . "\n";
echo "  production echo-back  ->  standard: " . ($stdOK ? 'safe' : 'LOST FIELDS')
   . " | custom: " . ($customOK ? 'safe' : 'NOT PROVEN SAFE')
   . " | consent: " . ($consentOK ? 'safe' : 'MOVED')
   . " | phone landed: " . ($phoneOK ? 'yes' : 'NO') . "\n";
echo "  overall: " . ($passOK ? 'PASS' : 'FAIL - do not write to real customers') . "\n";

if ($passOK) {
    $v = array('ts' => time(), 'company' => (string)$SB_COMPANY, 'shape' => SBW_SHAPE,
               'rest' => $rvar, 'standard' => true, 'custom_fields' => true, 'consent' => true,
               'phone_landed' => true, 'email_rerun' => $emailRerun, 'premise_blank' => $genuinelyBlank,
               'ui_checked' => false);
    @file_put_contents($OKF, "<?php return " . var_export($v, true) . ";\n", LOCK_EX);
    echo "\n  Wrote " . basename($OKF) . ".\n";
    echo "  NOW GO AND LOOK at both canary clients in the SimplyBook UI: their custom fields\n";
    echo "  (CANARY- markers) and the newsletter/consent tick must be exactly as created.\n";
    echo "  Then run:  php api/pcm-sbclient-canary.php --ui-confirmed\n";
} else {
    echo "\n  No verdict file written. api/pcm-sbphone-push.php will keep refusing to run.\n";
}
echo "\n  DELETE these test clients in the SimplyBook UI - JSON-RPC has no deleteClient:\n";
foreach ($made as $p) echo "    #{$p['cid']}  {$p['name']}\n";
exit($passOK ? 0 : 1);
