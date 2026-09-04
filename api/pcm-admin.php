<?php
/**
 * 365 PC Manager - owner admin console. Password-gated (server-only secret file).
 * Add customers, generate licence keys, flip on/off support, set next-service date,
 * and see every machine's last health check-in.
 *
 * Setup: create api/pcm-admin-secret.php  ->  <?php $PCM_ADMIN_PASS = 'a-long-passphrase';
 * Visit /api/pcm-admin.php , enter the passphrase.  (gitignored: secret + pcm-data.json)
 */
session_start();
header('X-Robots-Tag: noindex, nofollow');
$SECRET = __DIR__ . '/pcm-admin-secret.php';
$DATA   = __DIR__ . '/pcm-data.json';
if (!file_exists($SECRET)) { http_response_code(503); exit('Not configured: create api/pcm-admin-secret.php'); }
require $SECRET; // $PCM_ADMIN_PASS

// Abort on a present-but-unparseable file rather than returning an empty DB - otherwise a torn
// concurrent read could make the next save() persist an empty set and wipe every customer.
function load($f){
    if (!file_exists($f)) return array('customers'=>array());
    $raw = (string)@file_get_contents($f);
    if ($raw === '') return array('customers'=>array());
    $d = json_decode($raw, true);
    if (!is_array($d)) { http_response_code(503); exit('Customer data is temporarily unavailable - please refresh in a moment.'); }
    if (!isset($d['customers'])) $d['customers'] = array();
    return $d;
}
// atomic write (temp + rename), matching pcm.php, so a crash mid-write can't leave a torn file
function save($f,$d){ $tmp=$f.'.'.getmypid().'.tmp'; if(@file_put_contents($tmp, json_encode($d, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES), LOCK_EX)!==false) @rename($tmp,$f); }
function h($s){ return htmlspecialchars((string)$s, ENT_QUOTES); }
function newkey(){ $a='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; $k=''; for($i=0;$i<12;$i++){ $k.=$a[random_int(0,strlen($a)-1)]; if($i==3||$i==7)$k.='-'; } return $k; }

// auth
if (isset($_POST['pass'])) { if (hash_equals($PCM_ADMIN_PASS, $_POST['pass'])) { session_regenerate_id(true); $_SESSION['pcm_ok']=1; } }
// staff single sign-on from the portal: a valid 12h staff session token (verified SimplyBook
// staff sign-in, machine-bound) signs the console in - no separate passphrase to remember
if (isset($_POST['stoken']) && empty($_SESSION['pcm_ok'])) {
    $tokS = preg_replace('/[^a-f0-9]/', '', (string)$_POST['stoken']);
    $macS = preg_replace('/[^a-f0-9]/', '', substr((string)($_POST['machine'] ?? ''), 0, 32));
    if ($tokS !== '') {
        $dbT = load($DATA);
        $sS = isset($dbT['staff'][$tokS]) ? $dbT['staff'][$tokS] : null;
        if ($sS && (time() - intval($sS['ts'] ?? 0)) < 43200 && (time() - intval($sS['iat'] ?? 0)) < 43200
            && (empty($sS['machine']) || $sS['machine'] === $macS)) {
            session_regenerate_id(true); $_SESSION['pcm_ok'] = 1;
        }
    }
    header('Location: pcm-admin.php'); exit;
}
if (isset($_GET['logout'])) { session_destroy(); header('Location: pcm-admin.php'); exit; }
if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(16));
$CSRF = $_SESSION['csrf'];
// every mutation must carry the CSRF token
if (($_POST['do'] ?? '') !== '' && !hash_equals($CSRF, (string)($_POST['csrf'] ?? ''))) { http_response_code(403); exit('bad token'); }
if (empty($_SESSION['pcm_ok'])) {
    echo '<!doctype html><meta name=viewport content="width=device-width,initial-scale=1"><title>365 PC Manager admin</title>';
    echo '<body style="font-family:system-ui;background:#0b1226;color:#eef;display:grid;place-items:center;height:100vh;margin:0">';
    echo '<form method=post style="background:#0d1530;padding:2rem;border-radius:14px;border:1px solid #2a3b63;min-width:300px">';
    echo '<h2 style="margin:0 0 1rem">365 PC Manager</h2><input type=password name=pass placeholder=Passphrase autofocus style="width:100%;padding:.7rem;border-radius:8px;border:1px solid #2a3b63;background:#0b1226;color:#fff;box-sizing:border-box">';
    echo '<button style="margin-top:1rem;width:100%;padding:.7rem;border:0;border-radius:8px;background:#1d97e3;color:#fff;font-size:1rem;cursor:pointer">Sign in</button></form>';
    exit;
}

/* ---- export: get the data OFF this machine ------------------------------
   Everything the business runs on - the customer file, the comms log, the job
   record, the review queue - exists in exactly one place: this server. There is
   no second copy anywhere, so a host failure, a bad deploy or a mistaken write
   is unrecoverable. This streams the lot as one zip.

   Deliberately AFTER the session gate above, so an unauthenticated request can
   never reach it, and it takes the same CSRF token as every other action.

   Caches and rate-limit counters are excluded on purpose: they rebuild
   themselves, they are the bulk of the bytes, and they contain nothing you
   would miss. */
if (($_GET['export'] ?? '') !== '') {
    if (!hash_equals($CSRF, (string)($_GET['csrf'] ?? ''))) { http_response_code(403); exit('bad token'); }
    $KEEP = array(
        'pcm-data.json',        // the customer file - the crown jewel
        'comms-data.json',      // inbound texts and voicemail
        'pcm-jobs.json',        // job / quote record
        'pcm-reviewq.json',     // the review-email queue
        'tm-sched.json',        // scheduled texts
        'ai-pipeline.json',
        'pcm-invite-plans.json', 'pcm-invite-allow.json',
        'pcm-gc-live.json', 'pcm-gc-templates.json',
        'broadband-compare-data.json',
    );
    $found = array();
    foreach ($KEEP as $f) {
        $fp = __DIR__ . '/' . $f;
        if (is_readable($fp)) $found[$f] = $fp;
    }
    // anything else holding customer data that the list above has not learned yet
    foreach (glob(__DIR__ . '/pcm-msg-*.json') ?: array() as $fp) {
        $b = basename($fp);
        if (!isset($found[$b])) $found[$b] = $fp;
    }
    if (!$found) { http_response_code(500); exit('nothing to export'); }

    $stamp = gmdate('Ymd-His');
    if (class_exists('ZipArchive')) {
        $tmp = tempnam(sys_get_temp_dir(), 'pcmx');
        $zip = new ZipArchive();
        if ($zip->open($tmp, ZipArchive::OVERWRITE) !== true) { http_response_code(500); exit('could not open zip'); }
        foreach ($found as $name => $fp) $zip->addFile($fp, $name);
        $zip->addFromString('EXPORTED.txt',
            "365 Techies data export\ntaken: " . gmdate('c') . " UTC\nfiles: " . count($found)
            . "\n\nThis is the only copy of this data that exists outside the server.\n"
            . "Keep it somewhere encrypted, and test that it restores.\n");
        $zip->close();
        header('Content-Type: application/zip');
        header('Content-Disposition: attachment; filename="365techies-data-' . $stamp . '.zip"');
        header('Content-Length: ' . filesize($tmp));
        readfile($tmp);
        @unlink($tmp);
        exit;
    }
    // no zip extension: one JSON envelope is still an off-site copy
    header('Content-Type: application/json');
    header('Content-Disposition: attachment; filename="365techies-data-' . $stamp . '.json"');
    $out = array('taken' => gmdate('c'), 'files' => array());
    foreach ($found as $name => $fp) $out['files'][$name] = json_decode((string)@file_get_contents($fp), true);
    echo json_encode($out, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

// hold the SAME lock pcm.php/pcm-booking use, so admin writes can't lost-update the app's check-ins
$db_lock = @fopen($DATA . '.lock', 'c'); if ($db_lock) @flock($db_lock, LOCK_EX);
$db = load($DATA);
$msg = '';

// mutations
if (($_POST['do'] ?? '') === 'add') {
    $name = trim(substr((string)($_POST['name']??''),0,60));
    if ($name !== '') {
        $key = newkey();
        $db['customers'][$key] = array('name'=>$name,'email'=>trim(substr((string)($_POST['email']??''),0,120)),
            'tier'=> (($_POST['tier']??'pro')==='pro'?'pro':'free'), 'next'=>trim(substr((string)($_POST['next']??''),0,40)),
            'created'=>gmdate('Y-m-d'), 'machines'=>array());
        save($DATA,$db); $msg = "Added {$name} — activation key: {$key}";
    }
}
if (($_POST['do'] ?? '') === 'tier') {
    $k=$_POST['key']??''; if (isset($db['customers'][$k])) { $db['customers'][$k]['tier'] = ($db['customers'][$k]['tier']==='pro'?'free':'pro'); save($DATA,$db); $msg="Updated {$db['customers'][$k]['name']} → {$db['customers'][$k]['tier']}"; }
}
// Home vs Business support. Drives which dashboard the customer's portal builds:
// business accounts get the advanced estate tiles, home accounts never see them.
if (($_POST['do'] ?? '') === 'plan') {
    $k=$_POST['key']??''; if (isset($db['customers'][$k])) {
        $db['customers'][$k]['plan'] = ((($db['customers'][$k]['plan'] ?? 'home')==='business') ? 'home' : 'business');
        save($DATA,$db); $msg="Updated {$db['customers'][$k]['name']} → {$db['customers'][$k]['plan']} plan";
    }
}
if (($_POST['do'] ?? '') === 'next') {
    $k=$_POST['key']??''; if (isset($db['customers'][$k])) { $db['customers'][$k]['next']=trim(substr((string)($_POST['next']??''),0,40)); save($DATA,$db); $msg="Next-service date updated."; }
}
if (($_POST['do'] ?? '') === 'del') {
    $k=$_POST['key']??'';
    if (isset($db['customers'][$k])) {
        $n=$db['customers'][$k]['name'];
        // GDPR: the record's wifi index is the only map to their stored survey packs
        // (room photos inside, api/pcm-wifi-<24hex>.json) - unlink them before the index
        // goes. Id re-validated so a tampered index can't reach outside the pattern.
        $wl = $db['customers'][$k]['wifi'] ?? array();
        foreach ((is_array($wl) ? $wl : array()) as $w) {
            $wid = (string)($w['id'] ?? '');
            if (preg_match('/^[a-f0-9]{24}$/', $wid)) @unlink(__DIR__ . '/pcm-wifi-' . $wid . '.json');
        }
        unset($db['customers'][$k]);
        // their web sessions and SOS screenshots go too, matching staffdel in pcm-booking.php
        if (isset($db['websessions'])) foreach ($db['websessions'] as $wk=>$wv) if (($wv['key'] ?? '') === $k) unset($db['websessions'][$wk]);
        save($DATA,$db);
        foreach ((glob(__DIR__ . '/pcm-sos-' . substr(hash('sha256', $k), 0, 12) . '-*.jpg') ?: array()) as $f) @unlink($f);
        $msg="Removed {$n}.";
    }
}
// approve a signed-in booking account as this Pro customer: promote the booking identity's
// record to Pro (that's the record the customer's app holds a key for), copy the customer's
// details onto it, and retire the old manual record so it stops re-matching.
if (($_POST['do'] ?? '') === 'approve') {
    $orig=$_POST['key']??''; $link=$_POST['link']??'';
    if (isset($db['customers'][$orig]) && isset($db['customers'][$link]) && $orig!==$link) {
        $o = $db['customers'][$orig];
        $db['customers'][$link]['tier']='pro';
        if (!empty($o['name'])) $db['customers'][$link]['name']=$o['name'];
        if (empty($db['customers'][$link]['next']) && !empty($o['next'])) { $db['customers'][$link]['next']=$o['next']; if(!empty($o['next_ts'])) $db['customers'][$link]['next_ts']=$o['next_ts']; }
        $db['customers'][$orig]['tier']='free'; $db['customers'][$orig]['email']=''; $db['customers'][$orig]['merged_into']=$link;
        unset($db['customers'][$orig]['pending_signin']);
        save($DATA,$db); $msg="Approved — {$db['customers'][$link]['name']} is now on support in the app.";
    }
}
if (($_POST['do'] ?? '') === 'dismiss') {
    $k=$_POST['key']??''; if (isset($db['customers'][$k])) { unset($db['customers'][$k]['pending_signin']); save($DATA,$db); $msg="Sign-in request dismissed."; }
}
// ask a customer's app to show a "confirm your PC is ready to connect" prompt (clears any old confirm)
if (($_POST['do'] ?? '') === 'readyask') {
    $k=$_POST['key']??''; if (isset($db['customers'][$k])) { $db['customers'][$k]['ready_ask']=gmdate('Y-m-d H:i'); unset($db['customers'][$k]['ready_confirm']); save($DATA,$db); $msg="Asked {$db['customers'][$k]['name']} to confirm their PC is ready — they'll see it in the app."; }
}
if (($_POST['do'] ?? '') === 'readyclear') {
    $k=$_POST['key']??''; if (isset($db['customers'][$k])) { unset($db['customers'][$k]['ready_ask']); unset($db['customers'][$k]['ready_confirm']); save($DATA,$db); $msg="Cleared."; }
}
if (($_POST['do'] ?? '') === 'famstop') {
    $k=$_POST['key']??''; if (isset($db['customers'][$k])) { unset($db['customers'][$k]['family']); save($DATA,$db); $msg="Family view revoked for {$db['customers'][$k]['name']}."; }
}
// Verified-Call Shield: about to ring this customer? Generate a one-off code their app
// shows them within a minute - "the caller will say code NNNN". Valid 15 minutes.
if (($_POST['do'] ?? '') === 'shield') {
    $k=$_POST['key']??''; if (isset($db['customers'][$k])) {
        $code = (string)random_int(1000, 9999);
        $db['customers'][$k]['shield_code'] = $code;
        $db['customers'][$k]['shield_ts'] = time();
        save($DATA,$db);
        $msg = "📞 Code {$code} set for {$db['customers'][$k]['name']} — give their app up to a minute to show it (it only appears while their PC is on with the app running). When they answer, SAY CODE {$code} to them FIRST — never ask them to read it to you. Valid 15 min.";
    }
}

/* ---------------------------------------------------------------------------
   PORTAL LAUNCH EMAIL - the one-off for customers who were already signed in.

   Lives here rather than behind an API password because this is the only thing
   that emails every customer at once, and it should take a login and a
   considered click - not a passphrase pasted into a browser console.

   Two steps on purpose. Preview counts and shows who; only then does the send
   button appear, with the number written on it. Nothing is written to disk by
   the preview.

   Customers who already have a portal session cannot be reached by the
   automatic welcome (that fires when a session is CREATED, and theirs already
   exists and slides for a year), which is the entire reason this exists.
   --------------------------------------------------------------------------- */
/* ---------------------------------------------------------------------------
   WELCOME QUEUE DIAGNOSTIC

   Built after an evening of guessing why two customers signed in and no email
   arrived. Guessing is the problem: the send path is a queue drained by cron,
   the cron writes to /dev/null, and every failure mode looks identical from
   the outside. This shows the queue itself - who is in it, what state they are
   in, and whether the flag is even on.

   Read-only. Answered from the session login, so no passphrase in a URL.
   --------------------------------------------------------------------------- */
$wcDiag = null;
if (($_POST['do'] ?? '') === 'wcdiag') {
    $qf = __DIR__ . '/pcm-reviewq.json';
    $q = is_readable($qf) ? json_decode((string)@file_get_contents($qf), true) : null;
    $live = null;
    $rv = __DIR__ . '/pcm-review.php';
    if (is_readable($rv)) {
        // read the flag without executing the file
        if (preg_match('/\$WC_LIVE\s*=\s*(true|false)/', (string)@file_get_contents($rv), $m)) $live = ($m[1] === 'true');
    }
    $beat = (is_array($q) && !empty($q['hb']['bkpoll'])) ? (time() - (int)$q['hb']['bkpoll']) : null;
    $wcDiag = array('file' => is_array($q), 'live' => $live, 'hour' => (int)date('G'),
                    'quiet' => ((int)date('G') < 9 || (int)date('G') >= 20),
                    'beat' => $beat,
                    'rows' => array(), 'counts' => array(), 'look' => null);

    // Look one customer up by email. This is the question that actually gets asked -
    // "why didn't SO-AND-SO get it" - and without it you are left inferring from counts.
    // The usual answer is the boring one: they already have 'welcomed' stamped, because
    // the backfill caught them earlier, and the system is correctly refusing to send twice.
    $look = strtolower(trim((string)($_POST['wcemail'] ?? '')));
    if ($look !== '') {
        $hit = null;
        foreach (($db['customers'] ?? array()) as $ck => $c) {
            foreach (array('sb_email', 'email') as $f) {
                if (strtolower(trim((string)($c[$f] ?? ''))) === $look) { $hit = array($ck, $c); break 2; }
            }
        }
        if (!$hit) $wcDiag['look'] = array('em' => $look, 'found' => false);
        else {
            list($ck, $c) = $hit;
            $sess = false;
            foreach (($db['websessions'] ?? array()) as $wv)
                if (is_array($wv) && empty($wv['viewas']) && ($wv['key'] ?? '') === $ck) { $sess = true; break; }
            $wcDiag['look'] = array('em' => $look, 'found' => true, 'name' => (string)($c['name'] ?? ''),
                'tier' => (string)($c['tier'] ?? 'free'), 'session' => $sess,
                'welcomed' => !empty($c['welcomed']) ? date('H:i, j M', (int)$c['welcomed']) : '',
                'inqueue' => (is_array($q) && isset($q['wc'][$ck])) ? (string)($q['wc'][$ck]['st'] ?? '?') : '');
        }
    }
    if (is_array($q) && !empty($q['wc'])) {
        foreach ($q['wc'] as $ck => $e) {
            $st = is_array($e) ? (string)($e['st'] ?? '?') : '?';
            $wcDiag['counts'][$st] = ($wcDiag['counts'][$st] ?? 0) + 1;
            $wcDiag['rows'][] = array('key' => $ck, 'st' => $st,
                'em' => is_array($e) ? (string)($e['em'] ?? '(cleared after sending)') : '',
                // once sent, the entry is reduced to a stub, so which copy went is no longer
                // recorded - say so rather than defaulting to "welcome" and misleading a reader
                'k'  => is_array($e) ? (string)($e['k'] ?? '(kind not kept)') : '',
                'ts' => is_array($e) && !empty($e['ts']) ? date('H:i, j M', (int)$e['ts']) : '',
                'tries' => is_array($e) ? (int)($e['tries'] ?? 0) : 0);
        }
        usort($wcDiag['rows'], function ($a, $b) { return strcmp($b['ts'], $a['ts']); });
    }
}

/* Send the welcome to ONE named customer, right now, bypassing the queue and the
   cron. Built because "it will arrive within five minutes" is no use when someone
   is sitting with a customer trying to finish a booking. Sends synchronously so the
   page can report success or failure immediately - which also settles whether the
   mail layer works at all, independently of the trigger and the dedup logic. */
$wcOne = null;
/* Mark an address as already emailed WITHOUT sending anything.
   -----------------------------------------------------------
   For anyone emailed by a route that left no queue record - by hand, or via
   "send it to them now" before 30 Jul 2026, when it wrote only a stamp. Since
   pcm_welcome_maybe and the repair tool both treat a stamp with no queue entry
   as the old bug, those people would otherwise be emailed a second time. */
if (($_POST['do'] ?? '') === 'wcmarksent') {
    $to = strtolower(trim((string)($_POST['wcemail'] ?? '')));
    if (!filter_var($to, FILTER_VALIDATE_EMAIL)) $wcOne = array('ok' => false, 'why' => 'That is not a valid email address.');
    else {
        $nm = ''; $ck = '';
        foreach (($db['customers'] ?? array()) as $k2 => $c2) {
            foreach (array('sb_email', 'email') as $f) {
                if (strtolower(trim((string)($c2[$f] ?? ''))) === $to) { $nm = (string)($c2['name'] ?? ''); $ck = $k2; break 2; }
            }
        }
        if ($ck === '') {
            $wcOne = array('ok' => false, 'why' => 'No customer record matches that address, so there is nothing to mark.');
        } elseif (!function_exists('wc_mark_sent')) {
            $wcOne = array('ok' => false, 'why' => 'Could not load the mail library (api/pcm-review.php).');
        } else {
            $okm = wc_mark_sent($ck);
            if ($okm && empty($db['customers'][$ck]['welcomed'])) { $db['customers'][$ck]['welcomed'] = time(); }
            if ($okm) save($DATA, $db);
            $wcOne = array('ok' => (bool)$okm, 'to' => $to, 'name' => $nm !== '' ? $nm : $to, 'known' => true,
                           'marked' => true,
                           'why' => $okm ? '' : 'Could not open the queue file to record it. Try again in a moment.');
        }
    }
}

if (($_POST['do'] ?? '') === 'wcsendone') {
    $to = strtolower(trim((string)($_POST['wcemail'] ?? '')));
    if (!filter_var($to, FILTER_VALIDATE_EMAIL)) $wcOne = array('ok' => false, 'why' => 'That is not a valid email address.');
    else {
        $nm = ''; $ck = '';
        foreach (($db['customers'] ?? array()) as $k2 => $c2) {
            foreach (array('sb_email', 'email') as $f) {
                if (strtolower(trim((string)($c2[$f] ?? ''))) === $to) { $nm = (string)($c2['name'] ?? ''); $ck = $k2; break 2; }
            }
        }
        if (!defined('RV_LIB')) define('RV_LIB', 1);
        @include_once __DIR__ . '/pcm-review.php';
        if (!function_exists('rv_send_raw') || !function_exists('wc_body_html')) {
            $wcOne = array('ok' => false, 'why' => 'Could not load the mail library (api/pcm-review.php).');
        } else {
            $first = function_exists('rv_first') ? rv_first($nm) : ($nm !== '' ? $nm : 'there');
            $sent = rv_send_raw($to, wc_subject(), wc_body($first), '', '', wc_body_html($first));
            if ($sent && $ck !== '') {
                // Record it in the QUEUE too, not just as a stamp. pcm_welcome_maybe
                // verifies stamps against the queue now, so a stamp with no entry
                // behind it reads as the old bug and would earn them a second copy.
                if (function_exists('wc_mark_sent')) wc_mark_sent($ck);
                if (empty($db['customers'][$ck]['welcomed'])) {
                    $db['customers'][$ck]['welcomed'] = time();
                    save($DATA, $db);
                }
            }
            $wcOne = array('ok' => (bool)$sent, 'to' => $to, 'name' => $first, 'known' => $ck !== '',
                           'why' => $sent ? '' : 'The mail layer refused the send. Check api/pcm-smtp.php on the server.');
        }
    }
}

$wcPrev = null;
if (in_array(($_POST['do'] ?? ''), array('wcpreview', 'wcsend', 'wcrepair', 'wcrepairsend'), true)) {
    $wcSend  = in_array(($_POST['do'] ?? ''), array('wcsend', 'wcrepairsend'), true);
    $wcAll   = !empty($_POST['wcall']);          // include free members too
    /* REPAIR MODE - for customers a broken write marked as done.
       -------------------------------------------------------
       Until 30 Jul 2026 the automatic welcome stamped 'welcomed' while writing
       nothing to the queue (the include-scope bug fixed in pcm-booking.php), so
       the stamp alone is not evidence anybody was emailed. The queue IS the
       evidence: wc_record keeps a stub for ever once an address is handled, so
       anyone genuinely emailed has an entry and is skipped below either way.
       That makes this safe to press twice. */
    $wcRepair = in_array(($_POST['do'] ?? ''), array('wcrepair', 'wcrepairsend'), true);
    $wcKnown  = array();
    if ($wcRepair) {
        if (!defined('RV_LIB')) define('RV_LIB', 1);
        @include_once __DIR__ . '/pcm-review.php';
        if (function_exists('rvq_open')) {
            list($qlk, $qq) = rvq_open();
            if ($qlk) { $wcKnown = (isset($qq['wc']) && is_array($qq['wc'])) ? $qq['wc'] : array(); rvq_close($qlk); }
        }
    }
    $signedIn = array();
    foreach (($db['websessions'] ?? array()) as $wv) {
        if (!is_array($wv) || !empty($wv['viewas'])) continue;   // staff impersonation is not a customer
        if (!empty($wv['key'])) $signedIn[(string)$wv['key']] = true;
    }
    $wcPrev = array('signed_in' => count($signedIn), 'eligible' => 0, 'queued' => 0,
                    'already' => 0, 'no_email' => 0, 'free' => 0, 'gone' => 0, 'who' => array(),
                    'repair' => $wcRepair, 'bogus' => 0);
    foreach (array_keys($signedIn) as $k) {
        if (!isset($db['customers'][$k])) { $wcPrev['gone']++; continue; }
        $c =& $db['customers'][$k];
        // a stamp with no queue entry behind it is not evidence of anything
        $wcBogus = $wcRepair && !empty($c['welcomed']) && !isset($wcKnown[$k]);
        if ($wcBogus) $wcPrev['bogus']++;
        if (!empty($c['welcomed']) && !$wcBogus) { $wcPrev['already']++; unset($c); continue; }
        if (!$wcAll && (($c['tier'] ?? '') !== 'pro')) { $wcPrev['free']++; unset($c); continue; }
        $em = '';
        foreach (array('sb_email', 'email') as $f) {
            if (!empty($c[$f]) && filter_var($c[$f], FILTER_VALIDATE_EMAIL)) { $em = strtolower(trim($c[$f])); break; }
        }
        if ($em === '') { $wcPrev['no_email']++; unset($c); continue; }
        $wcPrev['eligible']++;
        if (count($wcPrev['who']) < 60) $wcPrev['who'][] = ($c['name'] ?? '') . ' <' . $em . '>';
        if ($wcSend) {
            if (!defined('RV_LIB')) define('RV_LIB', 1);
            @include_once __DIR__ . '/pcm-review.php';
            if (function_exists('wc_record')) {
                // same rule as pcm_welcome_maybe: only claim they are done if they are
                // genuinely in the queue, or a failed write silently marks them for ever
                // The welcome copy says "set up just now", so it is only honest for a
                // recent sign-in; an older repair gets the launch copy, which makes no
                // claim about when.
                $wcAge  = !empty($c['welcomed']) ? (time() - (int)$c['welcomed']) : PHP_INT_MAX;
                $wcKind = ($wcBogus && $wcAge < 172800) ? 'welcome' : 'launch';
                $r = wc_record($k, $em, (string)($c['name'] ?? ''), $wcKind);
                if ($r === true || $r === 'exists') {
                    $c['welcomed'] = time();     // so they can never also get the "just now" welcome
                    $wcPrev['queued']++;
                }
            }
        }
        unset($c);
    }
    $wcPrev['all'] = $wcAll;
    if ($wcSend && $wcPrev['queued']) {
        save($DATA, $db);
        $mins = (int)ceil($wcPrev['queued'] / 5) * 5;
        $what = $wcRepair ? "the portal email" : "the launch email";
        $extra = $wcRepair
            ? "That includes {$wcPrev['bogus']} the old queue bug had marked as done without sending. "
              . "Recent sign-ins get the welcome wording, older ones the launch wording."
            : "Nobody gets it twice, and none of them will get the new-customer welcome later.";
        $msg = "\xF0\x9F\x93\xAB Queued {$what} for {$wcPrev['queued']} customer(s). "
             . "They go out 5 every 5 minutes (about {$mins} minutes in all) and each one pings Slack. "
             . $extra;
        $wcPrev = null;                      // the job is done; do not re-offer the button
    }
}

// authed SOS screenshot viewer: streams api/pcm-sos-<keyhash>-<machine>.jpg (direct access denied)
if (isset($_GET['shot'])) {
    $m = preg_replace('/[^a-f0-9\-]/','', substr((string)$_GET['shot'],0,48));
    $f = __DIR__ . '/pcm-sos-' . $m . '.jpg';
    if ($m !== '' && strpos($m,'-') !== false && is_readable($f)) { header('Content-Type: image/jpeg'); header('Cache-Control: no-store'); readfile($f); }
    else { http_response_code(404); echo 'no screenshot'; }
    exit;
}

if ($db_lock) { @flock($db_lock, LOCK_UN); @fclose($db_lock); } // mutations done; render from memory
$cust = $db['customers'] ?? array();

/* WHO IS SIGNED IN TO THE PORTAL.
   Every live session is in $db['websessions'], and its 'ts' slides forward each time
   the customer opens the portal - so it is a genuine "last seen", not just when they
   first signed in. Sessions are per-DEVICE, so one person can hold several; they are
   grouped here by customer, because "Reg on 2 devices" is the useful fact and a list
   of tokens is not. Staff view-as sessions are excluded: those are us, not them. */
$online = array(); $onlineNow = 0;
foreach (($db['websessions'] ?? array()) as $wv) {
    if (!is_array($wv) || !empty($wv['viewas'])) continue;
    $k = (string)($wv['key'] ?? ''); if ($k === '') continue;
    $ts = (int)($wv['ts'] ?? 0);
    if (!isset($online[$k])) $online[$k] = array('n' => 0, 'last' => 0);
    $online[$k]['n']++;
    if ($ts > $online[$k]['last']) $online[$k]['last'] = $ts;
}
foreach ($online as $k => $o) {
    $online[$k]['name'] = (string)($cust[$k]['name'] ?? $k);
    $online[$k]['tier'] = (string)($cust[$k]['tier'] ?? 'free');
    $online[$k]['gone'] = !isset($cust[$k]);            // session for a deleted customer
    $online[$k]['welcomed'] = !empty($cust[$k]['welcomed']);
    if ($o['last'] > time() - 900) $onlineNow++;        // active in the last 15 minutes
}
uasort($online, function ($a, $b) { return $b['last'] - $a['last']; });

// counts + build the proactive "needs a call" list
$pcs=0; $active=0; $today=gmdate('Y-m-d'); $calls=array();
foreach($cust as $key=>$c){
    foreach(($c['machines']??array()) as $id=>$m){
        $pcs++; if(substr($m['seen']??'',0,10)===$today)$active++;
        $reasons=array();
        if(($m['av']??'')==='OFF') $reasons[]='antivirus OFF';
        if(isset($m['backup']) && !$m['backup']) $reasons[]='no backup';
        if(intval($m['diskpct']??0)>=92) $reasons[]='disk '.$m['diskpct'].'% full';
        if(intval($m['score']??100)<55) $reasons[]='health '.$m['score'].'%';
        if(!empty($m['w10']) && ($c['tier']??'free')!=='pro') $reasons[]='still on Windows 10';
        if($reasons){
            $sev = (($m['av']??'')==='OFF'?100:0) + ((isset($m['backup'])&&!$m['backup'])?40:0) + (100-intval($m['score']??100));
            $calls[]=array('name'=>$c['name']??'','email'=>$c['email']??'','tier'=>$c['tier']??'free','pc'=>$m['name']?:$id,'why'=>implode(', ',$reasons),'sev'=>$sev,'seen'=>$m['seen']??'');
        }
    }
}
usort($calls, function($a,$b){ return $b['sev']-$a['sev']; });
// pending sign-in approvals: Pro records a booking account matched by email but was NOT auto-granted
$pendings=array();
foreach($cust as $key=>$c){
    if(!empty($c['pending_signin']) && is_array($c['pending_signin'])){
        $ps=$c['pending_signin']; $link=$ps['link']??'';
        if($link!=='' && isset($cust[$link])) // only if the booking identity record still exists
            $pendings[]=array('orig'=>$key,'name'=>$c['name']??'','email'=>$c['email']??($ps['email']??''),'link'=>$link,'sbname'=>$ps['sbname']??'','ts'=>$ps['ts']??'');
    }
}
?><!doctype html><html><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1">
<title>365 PC Manager — customers</title><style>
:root{color-scheme:dark}body{font-family:system-ui,Segoe UI,sans-serif;background:#0b1226;color:#eef2f8;margin:0;padding:1.5rem}
a{color:#86b6e8}h1{font-size:1.3rem;margin:0}.top{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;margin-bottom:1rem}
.kpis{display:flex;gap:1rem;flex-wrap:wrap;margin:.5rem 0 1.4rem}.kpi{background:#0d1530;border:1px solid #2a3b63;border-radius:12px;padding:.8rem 1.2rem;min-width:110px}
.kpi b{font-size:1.5rem;display:block}.kpi span{color:#9fb5d3;font-size:.8rem}
.msg{background:#0e2a17;border:1px solid #1e7a3a;color:#c6f6d5;padding:.7rem 1rem;border-radius:10px;margin-bottom:1rem;font-family:ui-monospace,monospace;font-size:.85rem}
form.inline{display:inline}input,select,button{font:inherit}input,select{background:#0b1226;color:#fff;border:1px solid #2a3b63;border-radius:8px;padding:.5rem}
button{background:#1d97e3;color:#fff;border:0;border-radius:8px;padding:.5rem .9rem;cursor:pointer}button.ghost{background:#22304f}button.warn{background:#7a2b2b}
table{width:100%;border-collapse:collapse;margin-top:.5rem}th,td{text-align:left;padding:.6rem .5rem;border-bottom:1px solid #1c2748;font-size:.9rem;vertical-align:top}
th{color:#9fb5d3;font-weight:600;font-size:.75rem;text-transform:uppercase;letter-spacing:.04em}
.key{font-family:ui-monospace,monospace;background:#0d1530;padding:.15rem .4rem;border-radius:6px;border:1px solid #2a3b63}
.pill{padding:.15rem .5rem;border-radius:99px;font-size:.72rem}.pro{background:rgba(0,206,27,.16);color:#39d353}.free{background:#22304f;color:#9fb5d3}
.mach{color:#9fb5d3;font-size:.8rem;margin-top:.3rem}.dot{display:inline-block;width:8px;height:8px;border-radius:99px;margin-right:.3rem}
.add{background:#0d1530;border:1px solid #2a3b63;border-radius:14px;padding:1rem 1.2rem;margin-bottom:1.5rem;display:grid;grid-template-columns:1fr 1fr auto auto auto;gap:.7rem;align-items:end}
.add label{display:block;font-size:.75rem;color:#9fb5d3;margin-bottom:.2rem}
@media(max-width:720px){.add{grid-template-columns:1fr 1fr}}
</style></head><body>
<div class=top><h1>365 PC Manager — customers</h1><div style="display:flex;gap:1rem;align-items:center"><a href="tm-admin.php">&#9993; Text messages</a><a href="?export=1&amp;csrf=<?= htmlspecialchars($CSRF) ?>" title="Download every customer store as one zip - keep it somewhere off this server">&#8681; Export data</a><a href="?logout=1">Sign out</a></div></div>
<div class=kpis>
 <div class=kpi><b><?=count($cust)?></b><span>customers</span></div>
 <div class=kpi><b><?=$pcs?></b><span>machines</span></div>
 <div class=kpi><b style="color:#39d353"><?=$active?></b><span>checked in today</span></div>
 <div class=kpi><b style="color:#1d97e3"><?=count($online)?></b><span>signed in to portal</span></div>
 <?php if($onlineNow): ?><div class=kpi><b style="color:#39d353"><?=$onlineNow?></b><span>using it right now</span></div><?php endif; ?>
</div>
<?php if($msg) echo '<div class=msg>'.h($msg).'</div>'; ?>

<?php if($online): ?>
<div style="background:#0d1a2e;border:1px solid #2a5b8f;border-radius:14px;padding:1rem 1.2rem;margin-bottom:1.5rem">
  <h2 style="margin:0 0 .3rem;font-size:1rem;color:#86b6e8">&#128100; Signed in to the portal &mdash; <?=count($online)?> customer(s)</h2>
  <p style="color:#9fb5d3;font-size:.82rem;margin:0 0 .7rem">
    Sessions last a year and renew every visit, so this is everyone who can open their portal
    without signing in again. &ldquo;Last opened&rdquo; is genuinely the last time they used it.
  </p>
  <table style="margin-top:0"><thead><tr><th>Customer</th><th>Plan</th><th>Devices</th><th>Last opened</th><th>Had the email?</th></tr></thead><tbody>
  <?php foreach($online as $ok => $o):
        $ago = $o['last'] ? time() - $o['last'] : 0;
        $lbl = !$o['last'] ? 'unknown'
             : ($ago < 900 ? 'now' : ($ago < 3600 ? round($ago/60).' min ago'
             : ($ago < 172800 ? round($ago/3600).' hr ago' : round($ago/86400).' days ago'))); ?>
    <tr>
      <td><strong><?=h($o['name'])?></strong><?php if($o['gone']): ?><div class=mach style="color:#e8637e">customer record deleted &mdash; stale session</div><?php endif; ?></td>
      <td><span class="pill <?=$o['tier']==='pro'?'pro">On support':'free">Free'?></span></td>
      <td><?=(int)$o['n']?></td>
      <td<?=$ago && $ago<900?' style="color:#39d353;font-weight:700"':''?>><?=h($lbl)?></td>
      <td class=mach><?=$o['welcomed']?'yes':'<span style="color:#e0b341">not yet</span>'?></td>
    </tr>
  <?php endforeach; ?>
  </tbody></table>
</div>
<?php endif; ?>

<div style="background:#0d1a2e;border:1px solid #2a5b8f;border-radius:14px;padding:1rem 1.2rem;margin-bottom:1.5rem">
  <h2 style="margin:0 0 .3rem;font-size:1rem;color:#86b6e8">&#128235; Portal launch email</h2>
  <p style="color:#9fb5d3;font-size:.82rem;margin:0 0 .7rem">
    A one&#8209;off for customers who were <strong>already signed in</strong> before the new portal existed &mdash;
    they never get the automatic welcome, because that only fires when a portal session is first created and
    theirs already exists. Everyone you sign in from now on is handled automatically.
    Preview first; nothing is sent until you press the second button.
  </p>
<?php if($wcPrev === null): ?>
  <form method=post class=inline>
    <input type=hidden name=csrf value="<?=h($CSRF)?>"><input type=hidden name=do value=wcpreview>
    <button>&#128065; Preview who would get it</button>
  </form>
  <form method=post class=inline>
    <input type=hidden name=csrf value="<?=h($CSRF)?>"><input type=hidden name=do value=wcpreview>
    <input type=hidden name=wcall value=1>
    <button class=ghost>preview including free members</button>
  </form>
  <form method=post class=inline>
    <input type=hidden name=csrf value="<?=h($CSRF)?>"><input type=hidden name=do value=wcrepair>
    <button class=ghost title="Finds customers marked as emailed who were never actually queued - the bug fixed on 30 Jul 2026. Safe to run more than once.">&#128295; Find customers the old bug missed</button>
  </form>
<?php endif; ?>
<?php /* THE SINGLE-ADDRESS SEND SITS OUTSIDE THE PREVIEW STATE, DELIBERATELY.
         It used to be inside the `if($wcPrev === null)` block with the preview
         buttons, so pressing Preview made it vanish. On 30 Jul 2026 Steve was
         sat with a customer whose email had never arrived, pressed Preview,
         got "0 would receive it" because everyone was wrongly stamped, and was
         left on a page with no way to send anything at all - for an hour.
         This is the break-glass tool. It is never hidden. */ ?>
  <div style="margin-top:.7rem;padding-top:.7rem;border-top:1px solid #2a3b63">
    <p class=mach style="margin:0 0 .45rem;color:#9fb5d3">Send to one person right now &mdash; goes
      straight out, no queue, no waiting, whatever the buttons above say.</p>
    <form method=post class=inline>
      <input type=hidden name=csrf value="<?=h($CSRF)?>">
      <input name=wcemail type=email placeholder="customer@email" style="padding:.45rem .6rem;border-radius:8px;border:1px solid #2a3b63;background:#0b1226;color:#f0f5fc;font-size:.82rem;min-width:210px">
      <!-- both buttons name themselves, so there is no hidden 'do' for one of them to
           silently override depending on document order -->
      <button class=ghost name=do value=wcdiag>&#129514; why hasn&rsquo;t an email arrived?</button>
      <button name=do value=wcsendone onclick="return confirm('Send the welcome email to this address now?')">&#9889; send it to them now</button>
      <button class=ghost name=do value=wcmarksent title="Records that they have had it, without sending anything. Use it for anyone you emailed by hand, or before 30 Jul 2026 when a direct send did not write a queue record." onclick="return confirm('Mark this address as already emailed? Nothing is sent, and they will be skipped from now on.')">&#9986; mark as already sent</button>
    </form>
  </div>
<?php if($wcOne !== null): ?>
  <div style="margin-top:.9rem;padding:.85rem 1rem;border-radius:10px;background:<?=$wcOne['ok']?'#0c2416':'#2a0f18'?>;border:1px solid <?=$wcOne['ok']?'#1e6b3a':'#7a2740'?>">
    <div style="font-size:.9rem;color:#f0f5fc">
    <?php if($wcOne['ok'] && !empty($wcOne['marked'])): ?>
      &#9986; <strong><?=h($wcOne['to'])?> marked as already emailed.</strong> Nothing was sent.
      They will be skipped by the automatic welcome and by the repair tool from now on.
    <?php elseif($wcOne['ok']): ?>
      &#9989; <strong>Sent to <?=h($wcOne['to'])?></strong> just now, addressed to <?=h($wcOne['name'])?>.
      <?php if(!$wcOne['known']): ?><br><span class=mach>Note: no customer record matches that address, so it was sent as a one-off and nothing was recorded against an account.</span><?php endif; ?>
    <?php else: ?>
      &#10060; <strong>Not sent.</strong> <?=h($wcOne['why'])?>
    <?php endif; ?>
    </div>
  </div>
<?php endif; ?>
<?php if($wcDiag !== null): ?>
  <div style="margin-top:.9rem;padding:.9rem 1rem;background:#0b1226;border:1px solid #2a3b63;border-radius:10px">
    <div style="font-size:.86rem;color:#f0f5fc;margin-bottom:.5rem"><strong>Welcome queue</strong></div>
    <p class=mach style="margin:0 0 .6rem;line-height:1.7">
      Sending switched on: <strong style="color:<?=$wcDiag['live']===true?'#39d353':'#e8637e'?>"><?=$wcDiag['live']===true?'YES':($wcDiag['live']===false?'NO — $WC_LIVE is false':'could not read the flag')?></strong><br>
      Server time: <?=$wcDiag['hour']?>:00 &mdash; <strong style="color:<?=$wcDiag['quiet']?'#e0b341':'#39d353'?>"><?=$wcDiag['quiet']?'QUIET HOURS, nothing sends before 9am':'inside sending hours (9am&ndash;8pm)'?></strong><br>
      Queue file readable: <strong><?=$wcDiag['file']?'yes':'NO — pcm-reviewq.json missing or unreadable'?></strong><br>
      5-minute mail cron:
      <?php if($wcDiag['beat'] === null): ?>
        <strong style="color:#e0b341">has never checked in &mdash; deploy the heartbeat, then re-check in 10 minutes</strong>
      <?php elseif($wcDiag['beat'] <= 900): ?>
        <strong style="color:#39d353">alive, last ran <?=(int)round($wcDiag['beat']/60)?> min ago</strong>
      <?php else: ?>
        <strong style="color:#e8637e">STOPPED &mdash; last ran <?=(int)round($wcDiag['beat']/60)?> minutes ago. Nothing is being sent.</strong>
      <?php endif; ?><br>
      <?php foreach($wcDiag['counts'] as $st=>$n) echo h($st).': <strong>'.(int)$n.'</strong> &nbsp; '; ?>
    </p>
    <?php if($wcDiag['look']): $L=$wcDiag['look']; ?>
    <div style="margin:0 0 .7rem;padding:.7rem .85rem;background:#0d1530;border-left:3px solid #1d97e3;border-radius:0 8px 8px 0">
      <div class=mach style="line-height:1.8">
      <?php if(!$L['found']): ?>
        <strong style="color:#e8637e"><?=h($L['em'])?> is not a customer record at all.</strong><br>
        Nothing can be queued for an address we do not hold. Check the spelling, or the sign-in used a different address.
      <?php else: ?>
        <strong style="color:#f0f5fc"><?=h($L['name'] ?: $L['em'])?></strong> &middot; <?=h($L['tier'])?><br>
        Has a portal session: <strong style="color:<?=$L['session']?'#39d353':'#e0b341'?>"><?=$L['session']?'yes':'NO — they have never signed in on this device'?></strong><br>
        Already emailed: <strong style="color:<?=$L['welcomed']?'#e0b341':'#39d353'?>"><?=$L['welcomed'] ? 'YES, at '.h($L['welcomed']).' — this is why nothing new was queued' : 'no'?></strong><br>
        In the queue now: <strong><?=$L['inqueue'] ? h($L['inqueue']) : 'no entry'?></strong>
      <?php endif; ?>
      </div>
    </div>
    <?php endif; ?>
    <?php if($wcDiag['rows']): ?>
    <div class=mach style="max-height:210px;overflow:auto;line-height:1.8">
      <?php foreach(array_slice($wcDiag['rows'],0,25) as $r): ?>
        <div><span style="color:<?=$r['st']==='sent'?'#39d353':($r['st']==='pending'?'#e0b341':'#e8637e')?>"><?=h($r['st'])?></span>
          &middot; <?=h($r['k'])?> &middot; <?=h($r['em'])?> &middot; <?=h($r['ts'])?><?=$r['tries']?' &middot; '.(int)$r['tries'].' attempt(s)':''?></div>
      <?php endforeach; ?>
    </div>
    <?php else: ?>
    <p class=mach style="margin:0">The queue is <strong>empty</strong> &mdash; nobody has been queued for a welcome email. That means the sign-in did not reach the trigger, not that sending failed.</p>
    <?php endif; ?>
  </div>
<?php endif; ?>
<?php if($wcPrev !== null): ?>
  <p style="color:#9fb5d3;font-size:.84rem;margin:0 0 .5rem">
    <strong style="color:#f0f5fc"><?=$wcPrev['eligible']?></strong> would receive it,
    out of <?=$wcPrev['signed_in']?> signed in.
    Skipped: <?=$wcPrev['already']?> already had it,
    <?=$wcPrev['free']?> free members<?=$wcPrev['all']?' (included this time)':''?>,
    <?=$wcPrev['no_email']?> without an email, <?=$wcPrev['gone']?> deleted.
  </p>
  <?php if(!empty($wcPrev['repair'])): ?>
  <p style="color:#9fb5d3;font-size:.84rem;margin:0 0 .5rem;padding:.6rem .8rem;border-left:3px solid #1d97e3;background:#0d1530;border-radius:0 8px 8px 0">
    <strong style="color:#f0f5fc">Repair mode.</strong>
    <strong style="color:#f0f5fc"><?=$wcPrev['bogus']?></strong>
    <?=$wcPrev['bogus']===1?'customer was':'customers were'?> marked as emailed with nothing
    actually in the queue behind it &mdash; the bug fixed on 30 July 2026. They are included
    above. Anyone genuinely emailed keeps a queue record for ever and is still skipped, so
    pressing this twice cannot email anybody twice.
  </p>
  <?php endif; ?>
  <?php if($wcPrev['who']): ?>
  <details style="margin:0 0 .7rem"><summary style="cursor:pointer;color:#86b6e8;font-size:.82rem">Show the list</summary>
    <div class=mach style="max-height:180px;overflow:auto;margin-top:.4rem;line-height:1.7">
      <?php foreach($wcPrev['who'] as $wl) echo h($wl).'<br>'; ?>
    </div>
  </details>
  <?php endif; ?>
  <?php if($wcPrev['eligible']): ?>
  <form method=post class=inline onsubmit="return confirm('Send the launch email to <?=$wcPrev['eligible']?> customers? This cannot be undone.')">
    <input type=hidden name=csrf value="<?=h($CSRF)?>"><input type=hidden name=do value="<?=!empty($wcPrev['repair'])?'wcrepairsend':'wcsend'?>">
    <?php if($wcPrev['all']): ?><input type=hidden name=wcall value=1><?php endif; ?>
    <button>&#128233; Send it to <?=$wcPrev['eligible']?> customer(s)</button>
  </form>
  <?php else: ?>
  <p style="color:#9fb5d3;font-size:.82rem;margin:0">Nobody is waiting &mdash; everyone signed in has already had it.</p>
  <?php endif; ?>
<?php endif; ?>
</div>

<?php if($pendings): ?>
<div style="background:#0d1a2e;border:1px solid #2a5b8f;border-radius:14px;padding:1rem 1.2rem;margin-bottom:1.5rem">
  <h2 style="margin:0 0 .3rem;font-size:1rem;color:#86b6e8">&#128273; Sign-in requests &mdash; <?=count($pendings)?> to confirm</h2>
  <p style="color:#9fb5d3;font-size:.82rem;margin:0 0 .6rem">Someone signed into the app with a booking account whose email matches one of your <strong>Pro</strong> customers. Approving switches their app to support mode. Only approve if you recognise them as that customer.</p>
  <table style="margin-top:0"><thead><tr><th>Signed in as</th><th>Matches your Pro customer</th><th>When</th><th></th></tr></thead><tbody>
  <?php foreach($pendings as $pn): ?>
    <tr>
      <td><strong><?=h($pn['sbname']?:$pn['email'])?></strong><div class=mach><?=h($pn['email'])?></div></td>
      <td><?=h($pn['name'])?></td>
      <td class=mach><?=h($pn['ts'])?></td>
      <td style="white-space:nowrap">
        <form method=post class=inline><input type=hidden name=csrf value="<?=h($CSRF)?>"><input type=hidden name=do value=approve><input type=hidden name=key value="<?=h($pn['orig'])?>"><input type=hidden name=link value="<?=h($pn['link'])?>"><button>&#10003; Approve as Pro</button></form>
        <form method=post class=inline onsubmit="return confirm('Dismiss this sign-in request? They keep free booking access.')"><input type=hidden name=csrf value="<?=h($CSRF)?>"><input type=hidden name=do value=dismiss><input type=hidden name=key value="<?=h($pn['orig'])?>"><button class=ghost>dismiss</button></form>
      </td>
    </tr>
  <?php endforeach; ?>
  </tbody></table>
</div>
<?php endif; ?>
<?php if($calls): ?>
<div style="background:#1a0e0e;border:1px solid #7a3b2b;border-radius:14px;padding:1rem 1.2rem;margin-bottom:1.5rem">
  <h2 style="margin:0 0 .6rem;font-size:1rem;color:#ffb4a2">&#9742; Worth a call today &mdash; <?=count($calls)?> machine(s) flagged something</h2>
  <table style="margin-top:0"><thead><tr><th>Customer</th><th>Plan</th><th>Machine</th><th>Why</th><th></th></tr></thead><tbody>
  <?php foreach($calls as $ca): ?>
    <tr>
      <td><strong><?=h($ca['name'])?></strong><?php if($ca['email'])echo '<div class=mach>'.h($ca['email']).'</div>';?></td>
      <td><span class="pill <?=$ca['tier']==='pro'?'pro':'free'?>"><?=$ca['tier']==='pro'?'On support':'Free'?></span></td>
      <td><?=h($ca['pc'])?></td>
      <td style="color:#ffb4a2"><?=h($ca['why'])?></td>
      <td><?php if($ca['email'])echo '<a href="mailto:'.h($ca['email']).'?subject=Your%20PC%20flagged%20something">email</a>';?></td>
    </tr>
  <?php endforeach; ?>
  </tbody></table>
  <p style="color:#c99;font-size:.78rem;margin:.6rem 0 0">Free-tier machines here are warm upsell leads &mdash; a quick call fixing the flag is the natural way into a support plan.</p>
</div>
<?php endif; ?>
<form method=post class=add>
  <div><label>Customer / business name</label><input name=name required placeholder="e.g. Mrs Wilson"></div>
  <div><label>Email (optional)</label><input name=email type=email placeholder="name@example.com"></div>
  <div><label>On support?</label><select name=tier><option value=pro>Pro (on support)</option><option value=free>Free</option></select></div>
  <div><label>Next service (optional)</label><input name=next placeholder="Fri 28 Aug 2026"></div>
  <div><input type=hidden name=csrf value="<?=h($CSRF)?>"><input type=hidden name=do value=add><button>+ Add &amp; make key</button></div>
</form>
<table><thead><tr><th>Customer</th><th>Key</th><th>Plan</th><th>Next service</th><th>Machines &amp; health</th><th></th></tr></thead><tbody>
<?php foreach($cust as $key=>$c): if(!empty($c['merged_into'])) continue; /* retired after approval */ ?>
<tr>
  <td><strong><?=h($c['name'])?></strong><?php if(!empty($c['via']) && $c['via']==='signin')echo ' <span class="pill free" style="font-size:.66rem">signed in</span>'; if(!empty($c['email']))echo '<div class=mach>'.h($c['email']).'</div>';?><div class=mach>since <?=h($c['created']??'')?></div></td>
  <td><span class=key><?=h($key)?></span>
    <div class=mach style="margin-top:.45rem">Activation link (send to customer):</div>
    <div style="display:flex;gap:.3rem;margin-top:.2rem;align-items:center">
      <input class=alink readonly value="365pcm://activate/<?=h($key)?>" onfocus="this.select()" style="width:190px;font-family:ui-monospace,monospace;font-size:.7rem;padding:.25rem .4rem">
      <button type=button class="ghost copybtn" data-link="365pcm://activate/<?=h($key)?>" style="padding:.3rem .6rem;font-size:.75rem">Copy</button>
      <?php if(!empty($c['email'])): ?><a class=ghost style="padding:.3rem .6rem;font-size:.75rem;text-decoration:none;border-radius:8px" href="mailto:<?=h($c['email'])?>?subject=<?=rawurlencode('Activate 365 PC Manager on your PC')?>&body=<?=rawurlencode("Hi,\n\nClick this link on the PC you'd like on support and it'll activate 365 PC Manager for you:\n\n365pcm://activate/".$key."\n\n(If nothing happens, open 365 PC Manager, go to Help & Shop, tap \"Go on support / enter key\" and paste this code: ".$key.")\n\nThanks,\n365 Techies · 01202 775566")?>">Email</a><?php endif; ?>
    </div>
  </td>
  <td><span class="pill <?=($c['tier']??'free')==='pro'?'pro':'free'?>"><?=($c['tier']??'free')==='pro'?'On support':'Free'?></span>
    <?php if(($c['tier']??'free')==='pro'): $pl=(($c['plan']??'home')==='business')?'business':'home'; ?>
    <div style="margin-top:.3rem"><span class=mach><?=$pl==='business'?'🏢 Business':'🏠 Home'?> dashboard</span></div>
    <?php endif; ?>
  </td>
  <td>
    <form method=post class=inline><input type=hidden name=csrf value="<?=h($CSRF)?>"><input type=hidden name=do value=next><input type=hidden name=key value="<?=h($key)?>">
    <input name=next value="<?=h($c['next']??'')?>" style="width:130px" placeholder="—"><button class=ghost>save</button></form>
  </td>
  <td>
    <?php $ms=$c['machines']??array(); if(!$ms) echo '<span class=mach>none activated yet</span>';
      $latestVer=0; $vj=@json_decode((string)@file_get_contents(__DIR__.'/../downloads/pcm/version.json'),true); if(is_array($vj)) $latestVer=intval($vj['ver']??0);
      foreach($ms as $id=>$m){ $sc=intval($m['score']??0); $col=$sc>=80?'#39d353':($sc>=55?'#e0b341':'#e8637e');
        $seen=$m['seen']??''; $fresh=substr($seen,0,10)===$today;
        $mv=intval($m['ver']??0);
        $vchip = $mv>0 ? ' · <span style="opacity:.75;color:'.(($latestVer>0&&$mv<$latestVer)?'#e0b341':'#8fa3bd').'">app v'.$mv.(($latestVer>0&&$mv<$latestVer)?' (v'.$latestVer.' out - updates itself)':'').'</span>' : '';
        $kh = substr(hash('sha256', $key), 0, 12);
        $shotLink = (!empty($m['shot']) && is_readable(__DIR__.'/pcm-sos-'.$kh.'-'.$id.'.jpg')) ? ' · <a href="pcm-admin.php?shot='.h($kh.'-'.$id).'" target=_blank style="color:#1d97e3">📸 their screen ('.h($m['shot']).')</a>' : '';
        echo '<div class=mach><span class=dot style="background:'.$col.'"></span><strong style="color:#eef">'.h($m['name']?:$id).'</strong> — '.$sc.'% '.h($m['verdict']??'').' <span style="opacity:.6">· seen '.h($seen).($fresh?' ✓':'').(!empty($m['help'])?' · 🆘 '.h($m['help']):'').'</span>'.$vchip.$shotLink.'</div>';
      } ?>
  </td>
  <td style="white-space:nowrap">
    <form method=post class=inline><input type=hidden name=csrf value="<?=h($CSRF)?>"><input type=hidden name=do value=tier><input type=hidden name=key value="<?=h($key)?>"><button class=ghost><?=($c['tier']??'free')==='pro'?'→ Free':'→ Support'?></button></form>
    <?php if(($c['tier']??'free')==='pro'): ?>
      <form method=post class=inline><input type=hidden name=csrf value="<?=h($CSRF)?>"><input type=hidden name=do value=plan><input type=hidden name=key value="<?=h($key)?>"><button class=ghost title="Which dashboard their portal builds: Business adds the estate tiles"><?=(($c['plan']??'home')==='business')?'→ 🏠 Home':'→ 🏢 Business'?></button></form>
    <?php endif; ?>
    <?php if(!empty($c['ready_confirm'])): ?>
      <span class="pill pro" title="confirmed <?=h($c['ready_confirm'])?>">✓ ready</span>
      <form method=post class=inline><input type=hidden name=csrf value="<?=h($CSRF)?>"><input type=hidden name=do value=readyclear><input type=hidden name=key value="<?=h($key)?>"><button class=ghost>clear</button></form>
    <?php elseif(!empty($c['ready_ask'])): ?>
      <span class="pill free" title="asked <?=h($c['ready_ask'])?>">…awaiting</span>
    <?php else: ?>
      <form method=post class=inline><input type=hidden name=csrf value="<?=h($CSRF)?>"><input type=hidden name=do value=readyask><input type=hidden name=key value="<?=h($key)?>"><button class=ghost title="Ask their app to confirm the PC is on and ready to connect">📶 ready?</button></form>
    <?php endif; ?>
    <?php if (!empty($c['family']['name'])): ?>
      <span class="pill free" title="family view active since <?=h($c['family']['created']??'')?>">👪 <?=h($c['family']['name'])?></span>
      <form method=post class=inline onsubmit="return confirm('Revoke family view? Their share link stops working immediately.')"><input type=hidden name=csrf value="<?=h($CSRF)?>"><input type=hidden name=do value=famstop><input type=hidden name=key value="<?=h($key)?>"><button class=ghost>revoke</button></form>
    <?php endif; ?>
    <?php $shOn = intval($c['shield_ts']??0) > 0 && (time()-intval($c['shield_ts']??0)) < 900; ?>
    <form method=post class=inline><input type=hidden name=csrf value="<?=h($CSRF)?>"><input type=hidden name=do value=shield><input type=hidden name=key value="<?=h($key)?>"><button class=ghost title="About to ring them? Their app will say to expect a caller with this code - proves it's really us"><?= $shOn ? '📞 code '.h($c['shield_code']??'') : '📞 verify call' ?></button></form>
    <form method=post class=inline onsubmit="return confirm('Remove this customer, all their machines, and their stored WiFi surveys and screenshots?')"><input type=hidden name=csrf value="<?=h($CSRF)?>"><input type=hidden name=do value=del><input type=hidden name=key value="<?=h($key)?>"><button class=warn>×</button></form>
  </td>
</tr>
<?php endforeach; if(!$cust) echo '<tr><td colspan=6 style="color:#9fb5d3;padding:2rem;text-align:center">No customers yet — add your first above.</td></tr>'; ?>
</tbody></table>
<p style="color:#9fb5d3;font-size:.8rem;margin-top:1.5rem">Easiest way to put a customer on support: copy their <strong>activation link</strong> above and send it (email button, or paste into a Splashtop chat / text). They click it on their PC and 365 PC Manager activates itself. Or they can open <em>Help &amp; Shop</em> in the app, tap <em>Go on support / enter key</em>, and paste the key. Toggle a customer to Free and their app quietly drops back to free mode on its next check-in.</p>
<script>
document.querySelectorAll('.copybtn').forEach(function(b){
  b.addEventListener('click', function(){
    var t = b.getAttribute('data-link');
    if (navigator.clipboard) { navigator.clipboard.writeText(t).then(function(){ b.textContent='Copied!'; setTimeout(function(){ b.textContent='Copy'; }, 1400); }); }
  });
});
</script>
</body></html>
