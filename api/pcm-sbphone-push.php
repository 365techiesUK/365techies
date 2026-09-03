<?php
/**
 * Put a customer's phone number INTO their SimplyBook client record.
 *
 *   php api/pcm-sbphone-push.php --email=a@b.co.uk            <- DRY RUN, one customer
 *   php api/pcm-sbphone-push.php --email=a@b.co.uk --live     <- writes that one
 *   php api/pcm-sbphone-push.php --all                        <- DRY RUN, lists candidates
 *   php api/pcm-sbphone-push.php --all --live --confirm=3     <- writes at most 5
 *   php api/pcm-sbphone-push.php --restore=<snapshot id>      <- DRY RUN of the undo
 *   php api/pcm-sbphone-push.php --restore=<snapshot id> --live
 *
 * WHY THIS EXISTS. The staff diary falls back to the number in our own customer
 * file when SimplyBook's booking row carries none, and labels it "from our
 * records - not in SimplyBook". That label is honest but it is also a standing
 * job: SimplyBook still lacks the number, so anything reading SimplyBook - the
 * booking confirmations, the reminder texts, a member of staff looking at the
 * client card - still cannot see it. This closes that, one customer at a time.
 *
 * SAFETY:
 *  1. CLI only - a web request exits.
 *  2. DRY RUN by default. Nothing is written without --live, and --all --live
 *     additionally needs --confirm=<the number the dry run printed>.
 *  3. FILL ONLY WHERE EMPTY, judged on a fresh read of that client record - not
 *     on a booking row and not on a paged list.
 *  4. Matches on EXACT email only, and must be unique on BOTH sides. Never on
 *     name: two Smiths must not be merged.
 *  5. Refuses to write if the customer file will not parse, and takes the same
 *     lock every other writer takes - never across a network call.
 *  6. Reads the SimplyBook client back FIRST and re-sends every standard field it
 *     returns. SimplyBook's edit family is documented to replace, not merge.
 *  7. Writes only where SimplyBook's phone is EMPTY, judged on that fresh read.
 *  8. Refuses to run at all until api/pcm-sbclient-canary.php has proved, on this
 *     account, that the echo-back preserves custom fields and marketing consent.
 *  9. Snapshots the whole record on three channels BEFORE each write. --restore
 *     puts it back.
 * 10. Sources ONLY the numbers the customer typed themselves (mobile, tel).
 */
if (php_sapi_name() !== 'cli') { http_response_code(404); exit; }

$BASE = __DIR__;
$CFG  = $BASE . '/pcm-simplybook.php';
$DATA = $BASE . '/pcm-data.json';
$OKF  = $BASE . '/pcm-sbwrite-ok.php';
$LOG  = $BASE . '/pcm-sbwrite-log.php';

require_once $BASE . '/pcm-phone-lib.php';
require_once $BASE . '/pcm-sbwrite-lib.php';

$LIVE = in_array('--live', $argv, true);
$ONE = ''; $ALL = in_array('--all', $argv, true); $RESTORE = ''; $CONFIRM = -1;
foreach ($argv as $a) {
    if (strpos($a, '--email=') === 0)   $ONE = strtolower(trim(substr($a, 8)));
    if (strpos($a, '--restore=') === 0) $RESTORE = trim(substr($a, 10));
    if (strpos($a, '--confirm=') === 0) $CONFIRM = (int)substr($a, 10);
}
$modes = ($ONE !== '' ? 1 : 0) + ($ALL ? 1 : 0) + ($RESTORE !== '' ? 1 : 0);
if ($modes !== 1) {
    fwrite(STDERR, "give exactly one of --email=<address>, --all, or --restore=<snapshot id>\n");
    fwrite(STDERR, "  php api/pcm-sbphone-push.php --email=a@b.co.uk\n");
    exit(2);
}

if (!is_readable($CFG)) { fwrite(STDERR, "no api/pcm-simplybook.php - run this on the server\n"); exit(2); }
require $CFG;
if (empty($SB_COMPANY) || empty($SB_API_USER) || empty($SB_API_USER_KEY)) {
    fwrite(STDERR, "admin API credentials missing\n"); exit(2);
}

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
    if (isset($r['error']['message'])) return substr(preg_replace('/[^\x20-\x7E]/', '', (string)$r['error']['message']), 0, 140);
    return 'no result';
}
function err_code($r) { return isset($r['error']['code']) ? (int)$r['error']['code'] : 0; }
function sb_read_client($cid, $H) {
    $r = rpc('https://user-api.simplybook.me/admin/', 'getClient', array($cid), $H);
    if (!isset($r['_net']) && !empty($r['result']) && is_array($r['result'])) return $r['result'];
    $r2 = rpc('https://user-api.simplybook.me/admin/', 'getClientInfo', array($cid), $H);
    if (!isset($r2['_net']) && !empty($r2['result']) && is_array($r2['result'])) return $r2['result'];
    return null;
}

$tk = rpc('https://user-api.simplybook.me/login/', 'getUserToken', array($SB_COMPANY, $SB_API_USER, $SB_API_USER_KEY));
$token = isset($tk['result']) ? (string)$tk['result'] : '';
if ($token === '') { fwrite(STDERR, "could not get an admin token: " . why($tk) . "\n"); exit(2); }
$H = array('X-Company-Login: ' . $SB_COMPANY, 'X-User-Token: ' . $token);

/* ---- --restore runs BEFORE the probe gate ---------------------------------
   The undo must work when the verdict file is missing, expired or dirty. Being
   locked out of the emergency exit by the safety system would be absurd. */
if ($RESTORE !== '') {
    $rec = null;
    foreach (sbw_log_read($LOG) as $r) if (isset($r['snap']) && $r['snap'] === $RESTORE) $rec = $r;
    if (!$rec) { fwrite(STDERR, "no snapshot '$RESTORE' in " . basename($LOG) . "\n"); exit(2); }
    $cid = (int)$rec['cid'];
    $before = isset($rec['before']['getClient']) && is_array($rec['before']['getClient']) ? $rec['before']['getClient'] : null;
    if (!$before) { fwrite(STDERR, "snapshot $RESTORE has no readable getClient record\n"); exit(2); }
    echo "Restoring SimplyBook client #$cid from snapshot $RESTORE\n";
    foreach (array('name', 'email', 'phone', 'address1', 'address2', 'city', 'zip') as $k)
        if (array_key_exists($k, $before)) echo "   $k: " . (is_scalar($before[$k]) ? (string)$before[$k] : json_encode($before[$k])) . "\n";
    if (!$LIVE) { echo "\nDRY RUN. Re-run with --live to send it back.\n"; exit(0); }
    $payload = sbw_push_payload($before, isset($before['phone']) ? (string)$before['phone'] : '');
    $w = rpc('https://user-api.simplybook.me/admin/', 'editClient', array($cid, $payload), $H);
    if (!isset($w['result'])) { fwrite(STDERR, "restore refused: " . why($w) . "\n"); exit(1); }
    $after = sb_read_client($cid, $H);
    $d = sbw_diff($before, $after, array());
    echo "RESTORED. " . ($d ? "still differs on: " . implode(', ', $d) : "record matches the snapshot") . "\n";
    if (!empty($rec['before']['rest_fields']))
        echo "NOTE: custom field values are NOT restored by this - compare them in the UI against the snapshot.\n";
    exit($d ? 1 : 0);
}

/* ---- the probe gate ------------------------------------------------------- */
list($passOK, $passWhy) = sbw_pass_ok($OKF, $SB_COMPANY);
if (!$passOK) {
    fwrite(STDERR, "REFUSING TO RUN: $passWhy\n");
    fwrite(STDERR, "SimplyBook does not document whether editing a client replaces or merges the\n");
    fwrite(STDERR, "record, so that has to be proved on this account before touching a real customer.\n");
    fwrite(STDERR, "  run: php api/pcm-sbclient-canary.php --probe --live\n");
    exit(2);
}

/* REST is how the snapshot captures custom field values. Without it there is no
   complete undo, so the run refuses rather than writing something it cannot put back. */
list($rtok, $rvar) = sbw_rest_token($SB_COMPANY, $SB_API_USER, $SB_API_USER_KEY);
if ($LIVE && $rtok === '') {
    fwrite(STDERR, "REFUSING TO RUN: v2 REST auth failed, so a before-write snapshot would be\n");
    fwrite(STDERR, "incomplete (JSON-RPC cannot read custom client fields) and the undo would not work.\n");
    exit(2);
}

/* ---- daily cap ------------------------------------------------------------ */
$today = 0;
foreach (sbw_log_read($LOG) as $r) if (isset($r['wrote']) && $r['wrote'] && isset($r['ts']) && $r['ts'] > time() - 86400) $today++;
if ($LIVE && $today >= SBW_MAX_PER_DAY) {
    fwrite(STDERR, "daily cap reached (" . SBW_MAX_PER_DAY . " writes in the last 24h). Try tomorrow.\n"); exit(2);
}

/* ---- our customer file ---------------------------------------------------- */
$lk = @fopen($DATA . '.lock', 'c'); if ($lk) @flock($lk, LOCK_EX);
$raw = (string)@file_get_contents($DATA);
$db = json_decode($raw, true);
if ($lk) { @flock($lk, LOCK_UN); @fclose($lk); }   // released before any network call
if (!is_array($db) || !isset($db['customers']) || !is_array($db['customers'])) {
    fwrite(STDERR, "customer file unreadable - refusing to touch anything\n"); exit(2);
}

$byEmail = array();
foreach ($db['customers'] as $k => $c) {
    if (!is_array($c)) continue;
    $em = strtolower(trim((string)(isset($c['email']) ? $c['email'] : '')));
    if ($em === '') continue;
    $byEmail[$em][] = $k;
}

$cands = array();
foreach ($db['customers'] as $k => $c) {
    if (!is_array($c)) continue;
    $em = strtolower(trim((string)(isset($c['email']) ? $c['email'] : '')));
    if ($em === '') continue;
    if ($ONE !== '' && $em !== $ONE) continue;
    list($f, $rawp) = sbw_source_phone($c);
    if ($f === '') continue;
    if (count($byEmail[$em]) > 1) { $cands[] = array('key' => $k, 'em' => $em, 'skip' => 'we hold two customers with that email'); continue; }
    $cands[] = array('key' => $k, 'em' => $em, 'src' => $f, 'raw' => $rawp, 'c' => $c);
}
if ($ONE !== '' && !$cands) { fwrite(STDERR, "no customer of ours with a portal-typed number for $ONE\n"); exit(2); }

/* ---- find them in SimplyBook ---------------------------------------------- */
$sbIds = array();
if ($ONE !== '') {
    $r = rpc('https://user-api.simplybook.me/admin/', 'getClientList', array($ONE, 20), $H);
    foreach ((isset($r['result']) && is_array($r['result']) ? $r['result'] : array()) as $cl) {
        if (!is_array($cl)) continue;
        if (strtolower(trim((string)(isset($cl['email']) ? $cl['email'] : ''))) === $ONE) $sbIds[$ONE][] = (int)$cl['id'];
    }
} else {
    $page = 1;
    while ($page <= 40) {
        $r = rpc('https://user-api.simplybook.me/admin/', 'getClientList', array('', 100, $page), $H);
        $rows = isset($r['result']) && is_array($r['result']) ? $r['result'] : array();
        if (!$rows) break;
        foreach ($rows as $cl) {
            if (!is_array($cl)) continue;
            $em = strtolower(trim((string)(isset($cl['email']) ? $cl['email'] : '')));
            if ($em !== '') $sbIds[$em][] = (int)$cl['id'];
        }
        if (count($rows) < 100) break;
        $page++;
    }
}

/* ---- pass 1: build the plan. Reads only, no writes, whatever the mode. -----
   Done as its own pass so that --confirm can be checked against the very number
   the dry run printed, rather than against a count taken before we knew which
   candidates SimplyBook would actually accept. */
$plan = array();
$wrote = 0; $already = 0; $noClient = 0; $ambiguous = 0; $badNumber = 0;
$readFailed = 0; $refused = 0; $notWritable = array(); $emailMismatch = 0; $ourDup = 0;

foreach ($cands as $cand) {
    if (isset($cand['skip'])) { $ourDup++; continue; }
    $em = $cand['em']; $our = $cand['c'];

    $ids = isset($sbIds[$em]) ? array_values(array_unique($sbIds[$em])) : array();
    $held = isset($our['sb_client_id']) ? (int)$our['sb_client_id'] : 0;
    if ($held > 0) {
        if ($ids && !in_array($held, $ids, true)) { $ambiguous++; continue; }   // our id disagrees with the lookup
        $cid = $held;
    } else {
        if (count($ids) === 0) { $noClient++; continue; }
        if (count($ids) > 1)  { $ambiguous++; continue; }
        $cid = $ids[0];
    }

    $sb = sb_read_client($cid, $H);
    if ($sb === null) { $readFailed++; continue; }
    if (strtolower(trim((string)(isset($sb['email']) ? $sb['email'] : ''))) !== $em) { $emailMismatch++; continue; }

    list($okw, $whyNot) = sbw_writable($sb);
    if (!$okw) {
        if ($whyNot === 'SimplyBook already has a number') $already++;
        else { $notWritable[$whyNot] = (isset($notWritable[$whyNot]) ? $notWritable[$whyNot] : 0) + 1; }
        continue;
    }

    $norm = pcm_phone_norm($cand['raw']);
    if ($norm === '') { $badNumber++; continue; }
    $send = pcm_phone_display($norm);
    $nm = isset($sb['name']) ? (string)$sb['name'] : '';
    $plan[] = array('cand' => $cand, 'cid' => $cid, 'sb' => $sb, 'send' => $send, 'norm' => $norm, 'nm' => $nm);
    echo "  would set  " . str_pad($em, 34) . " (SB client #$cid \"" . substr($nm, 0, 28) . "\", phone: blank)  ->  $send  [{$cand['src']}]\n";
}

$would = count($plan);

/* ---- pass 2: write ---------------------------------------------------------
   --all --live must name the number it saw, so a candidate set that moved
   between reading and writing stops the run instead of surprising anyone. */
if ($LIVE && $ALL && $CONFIRM !== $would) {
    fwrite(STDERR, "\nREFUSING TO WRITE: --all --live needs --confirm=$would (you gave "
                 . ($CONFIRM < 0 ? 'nothing' : $CONFIRM) . ").\n");
    fwrite(STDERR, "That number is what this run just planned; if it is not what you expected, stop.\n");
    exit(2);
}

foreach ($LIVE ? $plan : array() as $row) {
    $cand = $row['cand']; $cid = $row['cid']; $sb = $row['sb'];
    $send = $row['send']; $norm = $row['norm']; $em = $cand['em'];

    if ($wrote >= SBW_MAX_PER_RUN) { echo "  -- per-run cap of " . SBW_MAX_PER_RUN . " reached; run again for the rest\n"; break; }
    if ($today + $wrote >= SBW_MAX_PER_DAY) { echo "  -- daily cap reached\n"; break; }

    $rc = sbw_rest_get($rtok, $SB_COMPANY, '/admin/clients/' . $cid);
    $rf = sbw_rest_get($rtok, $SB_COMPANY, '/admin/clients/field-values/' . $cid);
    if ($rc === null || $rf === null) {
        echo "  SKIP       $em - could not snapshot custom fields over REST, so there would be no undo\n";
        $refused++; continue;
    }

    $payload = sbw_push_payload($sb, $send);
    $snap = sbw_log_append($LOG, array(
        'ts' => time(), 'cid' => $cid, 'email' => (string)$sb['email'], 'our_key' => $cand['key'],
        'src' => $cand['src'], 'send' => $send, 'payload' => $payload, 'wrote' => false,
        'before' => array('getClient' => $sb, 'rest' => $rc, 'rest_fields' => $rf)));
    if ($snap === '') { fwrite(STDERR, "could not write the snapshot log - ABORTING before any write\n"); exit(2); }

    $w = rpc('https://user-api.simplybook.me/admin/', 'editClient', array($cid, $payload), $H);
    if (!isset($w['result']) && err_code($w) === -32063 && !preg_match('/required|empty|mandator/i', why($w))) {
        $payload['phone'] = $norm;                       // one retry, E.164 instead of the display form
        $w = rpc('https://user-api.simplybook.me/admin/', 'editClient', array($cid, $payload), $H);
    }
    if (!isset($w['result'])) { echo "  REFUSED    $em (#$cid): " . why($w) . "\n"; $refused++; continue; }

    $after = sb_read_client($cid, $H);
    $moved = $after === null ? array('(could not re-read the record)') : sbw_diff($sb, $after);
    $landed = $after !== null && isset($after['phone'])
        && preg_replace('/[^0-9]/', '', (string)$after['phone']) === preg_replace('/[^0-9]/', '', $send);
    if ($moved || !$landed) {
        fwrite(STDERR, "\n*** ABORTING THE WHOLE RUN ***\n");
        fwrite(STDERR, "client #$cid: " . ($moved ? "these fields changed besides the phone: " . implode(', ', $moved) : "the phone did not land") . "\n");
        fwrite(STDERR, "put it back with:\n  php api/pcm-sbphone-push.php --restore=$snap --live\n");
        exit(1);
    }
    sbw_log_append($LOG, array('ts' => time(), 'cid' => $cid, 'snap_of' => $snap, 'wrote' => true, 'send' => $send));
    $wrote++;
    echo "  SET        " . str_pad($em, 34) . " (SB client #$cid)  ->  $send  [{$cand['src']}]  snapshot $snap\n";
    echo "             verified: phone landed, " . count($sb) . " other fields unchanged\n";

    /* Stamp our side, so a later booking callback storing this number back as
       sb_phone can never be mistaken for SimplyBook having known it all along. */
    $lk2 = @fopen($DATA . '.lock', 'c'); if ($lk2) @flock($lk2, LOCK_EX);
    $raw2 = (string)@file_get_contents($DATA);
    $db2 = json_decode($raw2, true);
    if (is_array($db2) && isset($db2['customers'][$cand['key']])) {
        $db2['customers'][$cand['key']]['sb_push_ts'] = time();
        $db2['customers'][$cand['key']]['sb_push_phone'] = $send;
        $db2['customers'][$cand['key']]['sb_push_src'] = $cand['src'];
        $tmp = $DATA . '.push.tmp';
        if (@file_put_contents($tmp, json_encode($db2, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), LOCK_EX) !== false) @rename($tmp, $DATA);
        else fwrite(STDERR, "  STAMP FAILED for {$cand['key']} - the SimplyBook write landed; the log holds the truth\n");
    }
    if ($lk2) { @flock($lk2, LOCK_UN); @fclose($lk2); }
}

echo "\n" . ($LIVE ? "WROTE $wrote" : "DRY RUN: would set $would")
   . ", SimplyBook already has a number $already, no SimplyBook client $noClient,\n"
   . "ambiguous match $ambiguous, we hold a duplicate email $ourDup, email mismatch $emailMismatch,\n"
   . "unusable number $badNumber, read failed $readFailed, refused $refused";
foreach ($notWritable as $k => $n) echo ", $k $n";
echo "\n";
if (!$LIVE && $would > 0) {
    echo $ONE !== '' ? "Re-run with --live to write.\n"
                     : "Re-run with --live --confirm=$would to write (at most " . SBW_MAX_PER_RUN . " per run).\n";
}
exit(0);
