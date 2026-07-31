<?php
/**
 * Saved website-checker results <-> customer portal.
 *
 * A signed-in customer runs any site through /website-checker/ and can keep the
 * result. The portal then shows their history, so a second check months later
 * reads as a trend rather than a number with nothing to compare it to.
 *
 *  action=list {wtoken, machine}          -> {ok, checks:[...]}
 *  action=save {wtoken, machine, check}   -> {ok, checks:[...]}
 *  action=del  {wtoken, machine, at}      -> {ok, checks:[...]}
 *
 * Auth is copied verbatim from pcm-dash.php: wtoken -> websessions, sliding
 * expiry, machine binding that FAILS CLOSED. Do not "helpfully" skip the
 * machine check when it is empty - that is the stolen-token replay hole
 * web_snapshot() exists to close.
 *
 * WHAT GOES IN, AND WHY IT IS ALL WHITELISTED
 * -------------------------------------------
 * Everything stored here is re-rendered into the portal's DOM on every visit.
 * So nothing arrives as free text that survives unfiltered: scores are cast to
 * int and clamped, the strategy and the vitals verdicts are whitelists, and the
 * two genuinely free-text fields (the tested address and the issue titles) have
 * markup characters STRIPPED rather than escaped - as pcm-dash.php puts it, a
 * value that is not recognised must never survive the round trip.
 *
 * The client sends only what it already displays. It would be easy to POST the
 * whole Lighthouse payload and sort it out later; that would put megabytes of
 * attacker-controlled JSON into the one shared flat-file database, behind the
 * one lock that every app check-in and portal load queues on.
 */
header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');

$DATA     = __DIR__ . '/pcm-data.json';
$MAX_RAW  = 8000;    // a saved check is ~700 bytes
$MAX_KEEP = 20;      // per account; oldest dropped first
$MAX_CWV  = 4;
$MAX_ISS  = 5;

$STRATS = array('mobile', 'desktop');
$VERD   = array('FAST', 'AVERAGE', 'SLOW');

function out($a){ echo json_encode($a); exit; }
function db_lock($f){ $lk = @fopen($f . '.lock', 'c'); if ($lk) @flock($lk, LOCK_EX); return $lk; }
function load($f){
    if (!file_exists($f)) return array('customers'=>array());
    $raw = (string)@file_get_contents($f);
    if ($raw === '') return array('customers'=>array());
    $d = json_decode($raw, true);
    // a present-but-unparseable DB is a 503, never an empty overwrite
    if (!is_array($d)) { http_response_code(503); exit(json_encode(array('ok'=>false,'error'=>'db_unavailable'))); }
    if (!isset($d['customers'])) $d['customers'] = array();
    return $d;
}
function save_db($f,$d){
    $tmp = $f . '.' . getmypid() . '.tmp';
    if (@file_put_contents($tmp, json_encode($d, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES), LOCK_EX) !== false) @rename($tmp, $f);
}
// Strip, do not escape. No /u modifier on purpose: on invalid UTF-8 a unicode
// pattern returns null, and a null flowing onward is a deprecation plus a lost
// value. Every character removed is ASCII, so byte-wise stripping cannot break
// a multi-byte sequence (same reasoning as pcm-dash.php's name handling).
function plain($s, $len){
    if (!is_scalar($s)) return '';
    $s = (string)preg_replace('/[\x00-\x1f\x7f<>&"\']/', ' ', (string)$s);
    if (!mb_check_encoding($s, 'UTF-8')) return '';
    return trim(mb_substr($s, 0, $len));
}
// Lighthouse issue titles are Google's own copy and LEGITIMATELY contain
// markup characters: "Document doesn't have a <title> element", "Lists contain
// only <li> elements", '[user-scalable="no"] is used in the <meta name=
// "viewport"> element'. plain()'s strip would turn those into broken English
// on the customer's dashboard - the same check they just read correctly on
// /website-checker/. So control characters go, the rest stays, and the portal's
// chkRow() escapes on output, which is where escaping belongs. Verified inert
// against injected markup by the render tests.
function title_text($s, $len){
    if (!is_scalar($s)) return '';
    $s = (string)preg_replace('/[\x00-\x1f\x7f]/', ' ', (string)$s);
    if (!mb_check_encoding($s, 'UTF-8')) return '';
    $s = (string)preg_replace('/\s+/', ' ', $s);
    return trim(mb_substr($s, 0, $len));
}
// 0-100 or null. Lighthouse gives ints; anything else is not a score.
function score($v){
    if ($v === null || $v === '') return null;
    if (!is_numeric($v)) return null;
    $n = intval($v);
    if ($n < 0) $n = 0;
    if ($n > 100) $n = 100;
    return $n;
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

// session check - identical rules to pcm-dash.php (read side: no ts slide, the
// portal's own overview call is what keeps the session alive)
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

// A company team member keeps their own saved checks, exactly as they keep
// their own dashboard layout - otherwise the first employee to save would
// bury the director's history.
$member = isset($ws['member']) ? strtolower((string)$ws['member']) : '';
if ($member !== '') {
    if (!isset($c['org']['members'][$member])) out(array('ok'=>false,'error'=>'not_a_member'));
    $slot =& $c['org']['members'][$member];
} else {
    $slot =& $c;
}

function checks_of(&$slot){
    return isset($slot['wchecks']) && is_array($slot['wchecks']) ? array_values($slot['wchecks']) : array();
}

if ($action === 'list') {
    out(array('ok'=>true, 'checks'=>checks_of($slot)));
}

if ($action === 'save') {
    // (no `global` needed - this block is file scope, same as the config above)
    $ck = isset($in['check']) && is_array($in['check']) ? $in['check'] : null;
    if (!$ck) out(array('ok'=>false,'error'=>'bad_check'));

    $list = checks_of($slot);

    // 5s per account. Not a security control - it exists so a scripted loop
    // cannot hold the shared DB lock hot behind app check-ins and portal loads.
    $lastT = 0;
    foreach ($list as $x) { $t = intval($x['t'] ?? 0); if ($t > $lastT) $lastT = $t; }
    if ($lastT > time() - 5) out(array('ok'=>false,'error'=>'slow_down'));

    $url = plain($ck['url'] ?? '', 120);
    if ($url === '') out(array('ok'=>false,'error'=>'bad_url'));

    $strat = isset($ck['strat']) ? (string)$ck['strat'] : '';
    if (!in_array($strat, $STRATS, true)) $strat = 'mobile';

    $s = isset($ck['s']) && is_array($ck['s']) ? $ck['s'] : array();
    $scores = array(
        'p' => score($s['p'] ?? null),   // performance
        's' => score($s['s'] ?? null),   // seo
        'a' => score($s['a'] ?? null),   // accessibility
        'b' => score($s['b'] ?? null),   // best practices
    );
    // a result with no scores at all is not a result
    if ($scores['p'] === null && $scores['s'] === null && $scores['a'] === null && $scores['b'] === null) {
        out(array('ok'=>false,'error'=>'no_scores'));
    }

    $cwv = array();
    foreach ((isset($ck['cwv']) && is_array($ck['cwv']) ? $ck['cwv'] : array()) as $m) {
        if (count($cwv) >= $MAX_CWV) break;
        if (!is_array($m)) continue;
        $l = plain($m['l'] ?? '', 40);
        $v = plain($m['v'] ?? '', 20);
        if ($l === '' || $v === '') continue;
        $verd = isset($m['c']) ? strtoupper(preg_replace('/[^A-Za-z]/','',(string)$m['c'])) : '';
        if (!in_array($verd, $VERD, true)) $verd = '';
        $cwv[] = array('l'=>$l, 'v'=>$v, 'c'=>$verd);
    }

    $iss = array();
    foreach ((isset($ck['iss']) && is_array($ck['iss']) ? $ck['iss'] : array()) as $t) {
        if (count($iss) >= $MAX_ISS) break;
        $t = title_text($t, 120);   // NOT plain() - see the note above title_text()
        if ($t !== '') $iss[] = $t;
    }

    $rec = array('t'=>time(), 'url'=>$url, 'strat'=>$strat, 's'=>$scores, 'cwv'=>$cwv, 'iss'=>$iss);

    // Re-checking the same address on the same strategy REPLACES the previous
    // entry rather than stacking: what a customer wants is "how is my site
    // doing", and five entries for one site would push every other site they
    // look after off the end of the list. The keep-cap is per account.
    $kept = array();
    foreach ($list as $x) {
        if (strcasecmp((string)($x['url'] ?? ''), $url) === 0 && (string)($x['strat'] ?? '') === $strat) continue;
        $kept[] = $x;
    }
    $kept[] = $rec;
    while (count($kept) > $MAX_KEEP) array_shift($kept);

    $slot['wchecks'] = $kept;
    save_db($DATA, $db);
    // Deliberately no Slack ping: someone checking a website is not an event the
    // team needs waking for, and one message per check would be noise.
    out(array('ok'=>true, 'checks'=>$kept));
}

if ($action === 'del') {
    $at = intval($in['at'] ?? 0);
    if ($at <= 0) out(array('ok'=>false,'error'=>'bad_at'));
    $list = checks_of($slot);
    $kept = array();
    foreach ($list as $x) { if (intval($x['t'] ?? 0) !== $at) $kept[] = $x; }
    if (count($kept) !== count($list)) { $slot['wchecks'] = $kept; save_db($DATA, $db); }
    out(array('ok'=>true, 'checks'=>$kept));
}

out(array('ok'=>false,'error'=>'bad_action'));
