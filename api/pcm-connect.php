<?php
/**
 * "Connect something to my dashboard" - the customer's side of wiring a real
 * source up to a 365 dashboard.
 *
 * THE RULE THIS FILE EXISTS TO ENFORCE: **no customer secret is ever stored
 * here.** Not a token, not a password, not an API key. pcm-data.json lives on
 * shared hosting and this repo is PUBLIC; a customer's Victron token or camera
 * password sitting in it would be a breach waiting to happen, and it would be
 * OUR fault, not theirs. So this endpoint stores a REQUEST - what they want to
 * connect, which identifiers are safe to hold (an installation number, a model
 * name), and what they want to see - and nothing else.
 *
 * Anything that looks like a credential is REFUSED, not stored and not
 * truncated: see looks_secret(). The portal warns before submitting too, but
 * the server is the guard - a customer who pastes a token into the "what do you
 * want to see" box has done nothing wrong, and it is our job to catch it.
 *
 * The three honest routes a source can take (the portal explains these):
 *   invite - they add a read-only user of ours to their platform. Best by far:
 *            no secret moves, they see us in their user list, they revoke in
 *            two taps. Victron VRM, UniFi Protect and Slack all support this.
 *   key    - a READ-ONLY key is needed. It is handed over out of band and
 *            installed server-side by us, exactly like our own vrm-token.php
 *            (server-only file, gitignored, .htaccess-denied). Never typed into
 *            a web form that stores it.
 *   onsite - the data only exists on their LAN (RTSP/ONVIF cameras, Modbus,
 *            MQTT). Something on site has to do the talking, making OUTBOUND
 *            connections only. That is a visit, and a quote.
 *
 *  action=list {wtoken, machine}                  -> {ok, connections[]}
 *  action=add  {wtoken, machine, src, fields{}, want}  -> {ok, connection}
 *  action=del  {wtoken, machine, id}              -> {ok}
 */
header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');

$DATA = __DIR__ . '/pcm-data.json';
$MAX_RAW = 30000;
$MAX_CONN = 24;

// Must match DSSRC in the portal studio (build_extra.py).
$SOURCES = array('victron','camera','wifi','energy','iot','vehicle','ev','tracker','pet','slack','machine','api','other');

function out($a){ echo json_encode($a); exit; }
function db_lock($f){ $lk = @fopen($f . '.lock', 'c'); if ($lk) @flock($lk, LOCK_EX); return $lk; }
function load($f){
    if (!file_exists($f)) return array('customers'=>array());
    $raw = (string)@file_get_contents($f);
    if ($raw === '') return array('customers'=>array());
    $d = json_decode($raw, true);
    if (!is_array($d)) { http_response_code(503); exit(json_encode(array('ok'=>false,'error'=>'db_unavailable'))); }
    if (!isset($d['customers'])) $d['customers'] = array();
    return $d;
}
function save_db($f,$d){
    $tmp = $f . '.' . getmypid() . '.tmp';
    if (@file_put_contents($tmp, json_encode($d, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES), LOCK_EX) !== false) @rename($tmp, $f);
}
function slack_note($text){
    $wh = __DIR__ . '/slack-webhook.php'; $SLACK_WEBHOOK = '';
    if (file_exists($wh)) { ob_start(); include $wh; ob_end_clean(); }
    if (empty($SLACK_WEBHOOK) && file_exists($wh)) {
        $rawWh = (string)@file_get_contents($wh);
        if (preg_match('#https://hooks\.slack\.com/\S+#', $rawWh, $mWh)) $SLACK_WEBHOOK = trim($mWh[0]);
    }
    if (empty($SLACK_WEBHOOK)) return;
    $ch = curl_init($SLACK_WEBHOOK);
    curl_setopt_array($ch, array(CURLOPT_POST=>true, CURLOPT_RETURNTRANSFER=>true, CURLOPT_CONNECTTIMEOUT=>3, CURLOPT_TIMEOUT=>6,
        CURLOPT_HTTPHEADER=>array('Content-Type: application/json'),
        CURLOPT_POSTFIELDS=>json_encode(array('text'=>$text))));
    curl_exec($ch); curl_close($ch);
}
function cplain($s, $len){
    if (!is_scalar($s)) return '';
    $s = (string)preg_replace('/[\x00-\x1f\x7f<>&"\']/', ' ', (string)$s);
    if (!mb_check_encoding($s, 'UTF-8')) return '';
    return trim(mb_substr($s, 0, $len));
}

/**
 * Does this look like a credential? Deliberately trigger-happy: a false
 * positive costs the customer one rephrased sentence, a false negative puts
 * somebody's live API token in a JSON file on shared hosting.
 *
 * Real answers here are short and human - "458482", "Reolink RLN8-410",
 * "the freezer in the garage". None of them trip these.
 */
function looks_secret($s){
    $s = (string)$s;
    if ($s === '') return false;
    // named giveaways
    if (preg_match('/\b(password|passwd|pwd|api[\s_-]?key|secret|bearer|authorization|access[\s_-]?token|client[\s_-]?secret)\b/i', $s)) return true;
    // JWTs and common key prefixes
    if (preg_match('/\beyJ[A-Za-z0-9_\-]{10,}/', $s)) return true;
    if (preg_match('/\b(sk|pk|ghp|gho|xox[baprs]|AKIA)[-_][A-Za-z0-9]{12,}/', $s)) return true;
    // long hex - the shape of most tokens, including Victron's
    if (preg_match('/\b[a-f0-9]{32,}\b/i', $s)) return true;
    // long high-entropy run: 24+ chars of mixed case AND digits with no spaces
    if (preg_match('/[A-Za-z0-9_\-\.]{24,}/', $s, $m)) {
        $t = $m[0];
        if (preg_match('/[a-z]/', $t) && preg_match('/[A-Z0-9]/', $t) && preg_match('/[0-9]/', $t)) return true;
    }
    return false;
}

$raw = file_get_contents('php://input');
if (strlen($raw) > $MAX_RAW) out(array('ok'=>false,'error'=>'too_big'));
$in = json_decode($raw, true);
if (!is_array($in)) out(array('ok'=>false,'error'=>'bad_request'));

$action  = isset($in['action'])  ? preg_replace('/[^a-z]/','',$in['action']) : '';
$machine = isset($in['machine']) ? preg_replace('/[^a-f0-9]/','',substr((string)$in['machine'],0,32)) : '';
$wt      = isset($in['wtoken'])  ? preg_replace('/[^a-f0-9]/','',(string)$in['wtoken']) : '';
$cid     = isset($in['id'])      ? preg_replace('/[^a-f0-9]/','',substr((string)$in['id'],0,24)) : '';
if ($wt === '') out(array('ok'=>false,'error'=>'expired'));

$db_lock = db_lock($DATA);
$db = load($DATA);

$ws = isset($db['websessions'][$wt]) ? $db['websessions'][$wt] : null;
if ($ws) {
    if (!empty($ws['forever'])) { $slide = 31536000; $cap = PHP_INT_MAX; }
    else { $slide = !empty($ws['long']) ? 5184000 : 43200; $cap = !empty($ws['long']) ? 7776000 : 86400; }
    $fresh = intval($ws['ts'] ?? 0) > time() - $slide && ($cap === PHP_INT_MAX || intval($ws['iat'] ?? 0) > time() - $cap);
    if ($fresh && !empty($ws['machine']) && $ws['machine'] !== $machine) $fresh = false;
    if (!$fresh) $ws = null;
}
if (!$ws) out(array('ok'=>false,'error'=>'expired'));
$key = (string)$ws['key'];
if ($key === '' || !isset($db['customers'][$key])) out(array('ok'=>false,'error'=>'unknown_key'));
$c =& $db['customers'][$key];
if (!isset($c['conns']) || !is_array($c['conns'])) $c['conns'] = array();

// Connections belong to the account. A company staff member can see what is
// wired up but cannot start or cancel one - that is the account holder's call,
// same rule as the firm's bookings.
require_once __DIR__ . '/pcm-team-lib.php';
$member = isset($ws['member']) ? strtolower((string)$ws['member']) : '';
$readOnly = ($member !== '' && team_visible_pcs($c, $member) !== null);

if ($action === 'list') {
    $ls = array();
    foreach ($c['conns'] as $cn) {
        $ls[] = array('id'=>(string)($cn['id'] ?? ''), 'src'=>(string)($cn['src'] ?? ''),
            'state'=>(string)($cn['state'] ?? 'asked'), 'note'=>(string)($cn['note'] ?? ''),
            'want'=>(string)($cn['want'] ?? ''), 't'=>intval($cn['t'] ?? 0));
    }
    out(array('ok'=>true, 'connections'=>$ls, 'readonly'=>$readOnly));
}

if ($readOnly) out(array('ok'=>false,'error'=>'ask_your_manager'));

if ($action === 'add') {
    $src = isset($in['src']) ? (string)$in['src'] : '';
    if (!in_array($src, $SOURCES, true)) out(array('ok'=>false,'error'=>'bad_source'));
    if (count($c['conns']) >= $MAX_CONN) out(array('ok'=>false,'error'=>'too_many'));
    $last = count($c['conns']) ? end($c['conns']) : null;
    if ($last && intval($last['t'] ?? 0) > time() - 5) out(array('ok'=>false,'error'=>'slow_down'));

    // every field the customer typed, checked for credentials BEFORE anything
    // is written anywhere
    $want = cplain($in['want'] ?? '', 200);
    $fields = array();
    foreach ((isset($in['fields']) && is_array($in['fields']) ? $in['fields'] : array()) as $fk => $fv) {
        if (count($fields) >= 6) break;
        $fk = preg_replace('/[^a-z0-9_]/', '', strtolower((string)$fk));
        if ($fk === '') continue;
        $fields[$fk] = cplain($fv, 120);
    }
    foreach (array_merge(array_values($fields), array($want)) as $v) {
        if (looks_secret($v)) out(array('ok'=>false, 'error'=>'looks_secret'));
    }

    $id = bin2hex(random_bytes(8));
    $note = '';
    foreach ($fields as $fk => $fv) if ($fv !== '') $note .= ($note === '' ? '' : ' · ') . $fk . ': ' . $fv;
    $c['conns'][] = array('id'=>$id, 'src'=>$src, 'state'=>'asked', 'note'=>$note, 'want'=>$want, 't'=>time());
    save_db($DATA, $db);

    if ($db_lock) { @flock($db_lock, LOCK_UN); @fclose($db_lock); $db_lock = null; }
    $nm = cplain($c['name'] ?? '', 60);
    slack_note(":electric_plug: *Connection request* - *" . $nm . "* wants to connect *" . $src . "* to their dashboard."
        . ($note !== '' ? "\n" . $note : '')
        . ($want !== '' ? "\nThey want to see: " . $want : '')
        . "\nCheck what their kit actually publishes before quoting. Never ask them to email a token - read-only user, or hand it over on the phone.");
    out(array('ok'=>true, 'connection'=>array('id'=>$id, 'src'=>$src, 'state'=>'asked', 'note'=>$note, 'want'=>$want, 't'=>time())));
}

if ($action === 'del') {
    $kept = array(); $found = false;
    foreach ($c['conns'] as $cn) {
        if (!$found && hash_equals((string)($cn['id'] ?? ''), $cid)) { $found = true; continue; }
        $kept[] = $cn;
    }
    if ($found) { $c['conns'] = $kept; save_db($DATA, $db); }
    out(array('ok'=>$found));
}

out(array('ok'=>false,'error'=>'bad_action'));
