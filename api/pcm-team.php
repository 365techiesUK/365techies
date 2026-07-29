<?php
/**
 * 365 business team management - the multi-user layer for a company account.
 *
 * THE PROBLEM THIS SOLVES. A business customer is ONE record: one SimplyBook
 * client (the director), one set of machines, one email. Their staff had no way
 * in at all - and worse, a staff member signing in with their work address would
 * have been given their own brand-new free account AND their own SimplyBook
 * client, fragmenting the business and filling the diary with a client per
 * employee. So membership is a PORTAL-side concept only: SimplyBook keeps
 * exactly one client per business, and everything a staff member books goes
 * through it with their name and machine recorded on the booking.
 *
 * THE SHAPE, on the business customer record:
 *   org => [ name, domains[], members{ email => {name, role, pcs[], ts, seen, via} } ]
 *   role: 'manager' sees the whole fleet, 'staff' sees only their own machines.
 *   The account holder (a session with no 'member') is the director and sees all.
 *
 * WHO SEES WHAT (owner's decision, 2026-07-29): a staff member sees the health of
 * the computers assigned to them and nothing else - not a colleague's machine and
 * not a penny of billing. That is the answer that survives an employee asking
 * "what can my boss see about me?", and the honest answer stays "the health of
 * the computer, not your files".
 *
 * HOW PEOPLE GET IN (owner's decision): anyone with an email at the company's
 * registered domain is admitted automatically. Two guards make that safe rather
 * than reckless:
 *   1. PUBLIC_DOMAINS below can never be registered as a company domain. Without
 *      that, one typo ("outlook.com") would hand a customer's account to the
 *      entire internet. This is the single most important line in the file.
 *   2. Auto-joiners arrive with NO computers assigned, so they see nothing until
 *      the director links a machine to them. A leaver with a live mailbox gets a
 *      polite empty screen, and the director is told each time someone new joins.
 *
 * Actions (all require the DIRECTOR or a manager, except 'me'):
 *   list, add, del, role, pcs, domain, me
 */
header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');

$DATA = __DIR__ . '/pcm-data.json';
$MAX_RAW = 40000;
$MAX_MEMBERS = 60;

// $PUBLIC_DOMAINS, team_domain_ok(), team_find_org(), team_visible_pcs() - shared
// with the sign-in path in pcm-booking.php, so they live in a side-effect-free lib
require_once __DIR__ . '/pcm-team-lib.php';

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
function tplain($s, $len){
    if (!is_scalar($s)) return '';
    $s = (string)preg_replace('/[\x00-\x1f\x7f<>&"\']/', ' ', (string)$s);
    if (!mb_check_encoding($s, 'UTF-8')) return '';
    return trim(mb_substr($s, 0, $len));
}

$raw = file_get_contents('php://input');
if (strlen($raw) > $MAX_RAW) out(array('ok'=>false,'error'=>'too_big'));
$in = json_decode($raw, true);
if (!is_array($in)) out(array('ok'=>false,'error'=>'bad_request'));

$action  = isset($in['action'])  ? preg_replace('/[^a-z]/','',$in['action']) : '';
$machine = isset($in['machine']) ? preg_replace('/[^a-f0-9]/','',substr((string)$in['machine'],0,32)) : '';
$wt      = isset($in['wtoken'])  ? preg_replace('/[^a-f0-9]/','',(string)$in['wtoken']) : '';
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
if (!isset($c['org']) || !is_array($c['org'])) $c['org'] = array('name'=>'', 'domains'=>array(), 'members'=>array());
if (!isset($c['org']['members']) || !is_array($c['org']['members'])) $c['org']['members'] = array();
if (!isset($c['org']['domains']) || !is_array($c['org']['domains'])) $c['org']['domains'] = array();

// Who is asking. No 'member' on the session = the account holder, i.e. the director.
$meEmail = isset($ws['member']) ? strtolower((string)$ws['member']) : '';
$meRole  = 'director';
if ($meEmail !== '') {
    $m = isset($c['org']['members'][$meEmail]) ? $c['org']['members'][$meEmail] : null;
    if (!$m) out(array('ok'=>false,'error'=>'not_a_member'));
    $meRole = (($m['role'] ?? 'staff') === 'manager') ? 'manager' : 'staff';
}
$boss = ($meRole === 'director' || $meRole === 'manager');
$isBiz = ((string)($c['plan'] ?? '') === 'business') && (($c['tier'] ?? 'free') === 'pro');

// 'me' answers "what am I, and what am I allowed to see" - the only action a
// staff member may call, and the one the portal uses to decide what to render.
if ($action === 'me') {
    out(array('ok'=>true, 'role'=>$meRole, 'email'=>$meEmail, 'org'=>(string)($c['org']['name'] ?? ''),
        'business'=>$isBiz, 'pcs'=>team_visible_pcs($c, $meEmail)));
}

if (!$boss) out(array('ok'=>false,'error'=>'not_allowed'));

// ---- everything below is director/manager only -----------------------------

if ($action === 'list') {
    $ms = array();
    foreach ($c['org']['members'] as $em => $m) {
        $ms[] = array('email'=>(string)$em, 'name'=>(string)($m['name'] ?? ''),
            'role'=>(($m['role'] ?? 'staff') === 'manager' ? 'manager' : 'staff'),
            'pcs'=>array_values(array_map('strval', (isset($m['pcs']) && is_array($m['pcs'])) ? $m['pcs'] : array())),
            'ts'=>intval($m['ts'] ?? 0), 'seen'=>intval($m['seen'] ?? 0), 'via'=>(string)($m['via'] ?? 'added'));
    }
    // the machines the director can hand out, so the portal need not guess
    $pcs = array();
    foreach ((isset($c['machines']) && is_array($c['machines']) ? $c['machines'] : array()) as $id => $mm) {
        $pcs[] = array('id'=>(string)$id, 'name'=>(string)($mm['name'] ?? 'PC'), 'seen'=>(string)($mm['seen'] ?? ''));
    }
    out(array('ok'=>true, 'members'=>$ms, 'machines'=>$pcs, 'domains'=>array_values($c['org']['domains']),
        'org'=>(string)($c['org']['name'] ?? ''), 'role'=>$meRole, 'business'=>$isBiz));
}

if ($action === 'add') {
    $em = strtolower(tplain($in['email'] ?? '', 100));
    if ($em === '' || !filter_var($em, FILTER_VALIDATE_EMAIL)) out(array('ok'=>false,'error'=>'bad_email'));
    // The account holder must never appear in their own team list: the sign-in path
    // matches a member address BEFORE the normal customer lookup, so a director who
    // added their own address would come back next time as a member of themselves -
    // and, if that member were 'staff', locked out of their own billing.
    $own = strtolower(trim((string)($c['email'] ?? '')));
    $ownSb = strtolower(trim((string)($c['sb_email'] ?? '')));
    if ($em === $own || $em === $ownSb) out(array('ok'=>false,'error'=>'thats_you'));
    if (count($c['org']['members']) >= $MAX_MEMBERS) out(array('ok'=>false,'error'=>'too_many'));
    // never let one company claim an address that already belongs to another
    foreach ($db['customers'] as $k2 => $c2) {
        if ($k2 === $key) continue;
        if (!empty($c2['org']['members'][$em])) out(array('ok'=>false,'error'=>'elsewhere'));
    }
    $nm = tplain($in['name'] ?? '', 60);
    $role = (($in['role'] ?? 'staff') === 'manager') ? 'manager' : 'staff';
    if (isset($c['org']['members'][$em])) {
        if ($nm !== '') $c['org']['members'][$em]['name'] = $nm;
        $c['org']['members'][$em]['role'] = $role;
    } else {
        $c['org']['members'][$em] = array('name'=>$nm, 'role'=>$role, 'pcs'=>array(), 'ts'=>time(), 'seen'=>0, 'via'=>'added');
    }
    save_db($DATA, $db);
    out(array('ok'=>true));
}

if ($action === 'del') {
    $em = strtolower(tplain($in['email'] ?? '', 100));
    if (!isset($c['org']['members'][$em])) out(array('ok'=>false,'error'=>'missing'));
    if ($em === $meEmail) out(array('ok'=>false,'error'=>'not_yourself'));
    unset($c['org']['members'][$em]);
    // Removing somebody has to actually remove them: their live sessions die here,
    // or a leaver keeps the portal open on their phone until the token ages out.
    foreach ($db['websessions'] as $wk => $wv) {
        if ((string)($wv['key'] ?? '') === $key && strtolower((string)($wv['member'] ?? '')) === $em) unset($db['websessions'][$wk]);
    }
    save_db($DATA, $db);
    out(array('ok'=>true));
}

if ($action === 'role') {
    $em = strtolower(tplain($in['email'] ?? '', 100));
    if (!isset($c['org']['members'][$em])) out(array('ok'=>false,'error'=>'missing'));
    if ($em === $meEmail) out(array('ok'=>false,'error'=>'not_yourself'));
    $c['org']['members'][$em]['role'] = (($in['role'] ?? 'staff') === 'manager') ? 'manager' : 'staff';
    save_db($DATA, $db);
    out(array('ok'=>true));
}

if ($action === 'pcs') {
    $em = strtolower(tplain($in['email'] ?? '', 100));
    if (!isset($c['org']['members'][$em])) out(array('ok'=>false,'error'=>'missing'));
    $have = isset($c['machines']) && is_array($c['machines']) ? $c['machines'] : array();
    $want = array();
    foreach ((isset($in['pcs']) && is_array($in['pcs']) ? $in['pcs'] : array()) as $p) {
        if (!is_string($p) || !isset($have[$p]) || in_array($p, $want, true)) continue;
        $want[] = $p;
    }
    $c['org']['members'][$em]['pcs'] = $want;
    save_db($DATA, $db);
    out(array('ok'=>true, 'pcs'=>$want));
}

// The company domain. This is the one that admits people automatically, so it is
// validated hard and only the DIRECTOR may set it - a manager cannot widen the
// door they were let through.
if ($action === 'domain') {
    if ($meRole !== 'director') out(array('ok'=>false,'error'=>'not_allowed'));
    $d = team_domain_ok($in['domain'] ?? '', $PUBLIC_DOMAINS);
    $off = !empty($in['off']);
    if ($off) { $c['org']['domains'] = array(); save_db($DATA, $db); out(array('ok'=>true, 'domains'=>array())); }
    if ($d === '') out(array('ok'=>false,'error'=>'bad_domain'));
    // and nobody else may already be using it
    foreach ($db['customers'] as $k2 => $c2) {
        if ($k2 === $key || empty($c2['org']['domains']) || !is_array($c2['org']['domains'])) continue;
        foreach ($c2['org']['domains'] as $d2) if (strtolower((string)$d2) === $d) out(array('ok'=>false,'error'=>'taken'));
    }
    $c['org']['domains'] = array($d);
    if (!empty($in['orgname'])) $c['org']['name'] = tplain($in['orgname'], 60);
    save_db($DATA, $db);
    if ($db_lock) { @flock($db_lock, LOCK_UN); @fclose($db_lock); $db_lock = null; }
    slack_note(":office: *Company domain set* - *".tplain($c['name'] ?? '', 60)."* will now auto-admit anyone with an @".$d." address to their portal. New joiners get NO computers until someone assigns them.");
    out(array('ok'=>true, 'domains'=>array($d)));
}

out(array('ok'=>false,'error'=>'bad_action'));
