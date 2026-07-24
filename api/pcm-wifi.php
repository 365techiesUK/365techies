<?php
/**
 * 365 WiFi Optimizer <-> customer portal bridge.
 *
 * A visitor's survey lives in their browser (IndexedDB). When they become a 365
 * member, this endpoint lets the SIGNED-IN customer keep surveys on their account:
 *
 *  action=save {wtoken, machine, pack} -> stores the tool's export pack (incl. any
 *              room photos) as an opaque per-survey file; keeps the newest 5
 *  action=list {wtoken, machine}       -> [{id, site, rooms, avg, t, size}]
 *  action=get  {wtoken, machine, id}   -> returns the stored pack (the tool re-runs
 *              its full hostile-import sanitiser on restore, so the blob is never
 *              trusted client-side either)
 *  action=del  {wtoken, machine, id}   -> removes one survey
 *
 * Auth mirrors pcm.php portal actions: wtoken -> websessions (expiry + machine
 * soft-binding). Survey packs are stored OUTSIDE pcm-data.json (photos would bloat
 * the hot DB) as api/pcm-wifi-<24hex>.json, denied by .htaccess; only compact
 * metadata lives in the customer record.
 */
header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');

$DATA = __DIR__ . '/pcm-data.json';
$MAX_RAW = 7000000;    // ~7MB: 9 rooms + 12 downscaled photos fits well inside
$KEEP = 5;             // newest surveys kept per account
$BUDGET = 1500000000;  // ~1.5GB pool across ALL accounts' packs: per-account usage is
                       // bounded (KEEP x MAX_RAW) but free self-serve sign-up count isn't

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
function wifi_path($id){ return __DIR__ . '/pcm-wifi-' . $id . '.json'; }
// caller must release the shared DB lock first - a slow webhook must never stall
// app check-ins / portal loads that queue on the same lock
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

$raw = file_get_contents('php://input');
if (strlen($raw) > $MAX_RAW) out(array('ok'=>false,'error'=>'too_big'));
$in = json_decode($raw, true);
if (!is_array($in)) out(array('ok'=>false,'error'=>'bad_request'));

$action  = isset($in['action'])  ? preg_replace('/[^a-z]/','',$in['action']) : '';
$machine = isset($in['machine']) ? preg_replace('/[^a-f0-9]/','',substr((string)$in['machine'],0,32)) : '';
$wt      = isset($in['wtoken'])  ? preg_replace('/[^a-f0-9]/','',(string)$in['wtoken']) : '';
$sid     = isset($in['id'])      ? preg_replace('/[^a-f0-9]/','',substr((string)$in['id'],0,24)) : '';
if ($wt === '') out(array('ok'=>false,'error'=>'expired'));
if (($action === 'get' || $action === 'del') && $sid === '') out(array('ok'=>false,'error'=>'missing'));

$db_lock = db_lock($DATA);
$db = load($DATA);

// session check - same freshness rules as pcm.php overview (read-side: no ts slide,
// the portal's own overview call keeps the session alive)
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
if (!isset($c['wifi']) || !is_array($c['wifi'])) $c['wifi'] = array();

if ($action === 'save') {
    $pack = isset($in['pack']) && is_array($in['pack']) ? $in['pack'] : null;
    if (!$pack || ($pack['app'] ?? '') !== '365-wifi-survey' || !isset($pack['survey']) || !is_array($pack['survey'])) {
        out(array('ok'=>false,'error'=>'bad_pack'));
    }
    $sv = $pack['survey'];
    // compact honest metadata for the portal list (the pack itself stays opaque)
    $site = substr((string)($sv['siteName'] ?? 'My site'), 0, 40);
    $rooms = isset($sv['rooms']) && is_array($sv['rooms']) ? count($sv['rooms']) : 0;
    $sum = 0; $n = 0;
    foreach ((isset($sv['rooms']) && is_array($sv['rooms']) ? $sv['rooms'] : array()) as $r) {
        if (is_array($r) && isset($r['s'])) { $sum += max(0, min(100, intval($r['s']))); $n++; }
    }
    $avg = $n ? intval(round($sum / $n)) : 0;
    if ($rooms === 0) out(array('ok'=>false,'error'=>'empty_survey'));
    // gentle per-account rate limit: one save per 30s stops a scripted loop from
    // holding the shared DB lock hot and flooding Slack
    $lastW = count($c['wifi']) ? end($c['wifi']) : null;
    if ($lastW && intval($lastW['t'] ?? 0) > time() - 30) out(array('ok'=>false,'error'=>'slow_down'));
    $id = bin2hex(random_bytes(12));
    $body = json_encode($pack, JSON_UNESCAPED_SLASHES);
    if ($body === false || strlen($body) > $MAX_RAW) out(array('ok'=>false,'error'=>'too_big'));
    // site-wide disk budget: sum the compact index (no dir scan). Bytes this save will
    // rotate out of THIS account are credited, so a full pool never blocks someone
    // merely replacing their own oldest survey.
    $total = 0;
    foreach ($db['customers'] as $cu) {
        if (empty($cu['wifi']) || !is_array($cu['wifi'])) continue;
        foreach ($cu['wifi'] as $wx) $total += max(0, intval($wx['size'] ?? 0));
    }
    for ($i = 0, $ev = count($c['wifi']) + 1 - $KEEP; $i < $ev; $i++) $total -= max(0, intval($c['wifi'][$i]['size'] ?? 0));
    if ($total + strlen($body) > $BUDGET) {
        // tell the team (at most once a day, not per attempt) - saves are being refused
        if (intval($db['wifi_full_ping'] ?? 0) < time() - 86400) {
            $db['wifi_full_ping'] = time(); save_db($DATA, $db);
            if ($db_lock) { @flock($db_lock, LOCK_UN); @fclose($db_lock); $db_lock = null; }
            slack_note(':floppy_disk: *WiFi survey storage pool is full* - a customer save was just refused. Prune old packs or raise $BUDGET in api/pcm-wifi.php.');
        }
        out(array('ok'=>false,'error'=>'storage_full'));
    }
    // tmp+rename so a crash mid-write can't leave a torn pack behind a live index entry
    $ptmp = wifi_path($id) . '.' . getmypid() . '.tmp';
    if (@file_put_contents($ptmp, $body, LOCK_EX) === false || !@rename($ptmp, wifi_path($id))) {
        @unlink($ptmp);
        out(array('ok'=>false,'error'=>'store_failed'));
    }
    $nm = str_replace(array("\r","\n",'<','>','&'), ' ', (string)($c['name'] ?? ''));
    $c['wifi'][] = array('id'=>$id, 'site'=>$site, 'rooms'=>$rooms, 'avg'=>$avg, 't'=>time(), 'size'=>strlen($body));
    while (count($c['wifi']) > $KEEP) {
        $old = array_shift($c['wifi']);
        if (!empty($old['id'])) @unlink(wifi_path($old['id']));
    }
    save_db($DATA, $db);
    // release the shared DB lock BEFORE the Slack call - a slow webhook must never
    // stall app check-ins / portal loads that queue on the same lock
    if ($db_lock) { @flock($db_lock, LOCK_UN); @fclose($db_lock); $db_lock = null; }
    // let the team know (text only - the photos stay in the stored pack)
    $st = str_replace(array("\r","\n",'<','>','&'), ' ', $site);
    slack_note(":signal_strength: *WiFi survey saved to portal* by *".$nm."* - site \"".$st."\", ".$rooms." rooms, avg ".$avg."/100. It's on their account - open it together from their device, or view-as in the portal.");
    out(array('ok'=>true, 'id'=>$id));
}

if ($action === 'list') {
    $ls = array();
    foreach (array_reverse($c['wifi']) as $w) {
        $ls[] = array('id'=>(string)($w['id'] ?? ''), 'site'=>(string)($w['site'] ?? ''),
            'rooms'=>intval($w['rooms'] ?? 0), 'avg'=>intval($w['avg'] ?? 0),
            't'=>intval($w['t'] ?? 0), 'size'=>intval($w['size'] ?? 0));
    }
    out(array('ok'=>true, 'surveys'=>$ls));
}

if ($action === 'get') {
    foreach ($c['wifi'] as $w) {
        if (hash_equals((string)($w['id'] ?? ''), $sid)) {
            $body = (string)@file_get_contents(wifi_path($sid));
            $pack = $body !== '' ? json_decode($body, true) : null;
            if (!is_array($pack)) out(array('ok'=>false,'error'=>'missing'));
            out(array('ok'=>true, 'pack'=>$pack));
        }
    }
    out(array('ok'=>false,'error'=>'missing'));
}

if ($action === 'del') {
    $kept = array(); $found = false;
    foreach ($c['wifi'] as $w) {
        if (!$found && hash_equals((string)($w['id'] ?? ''), $sid)) { $found = true; @unlink(wifi_path($sid)); continue; }
        $kept[] = $w;
    }
    if ($found) { $c['wifi'] = $kept; save_db($DATA, $db); }
    out(array('ok'=>$found));
}

out(array('ok'=>false,'error'=>'bad_action'));
