<?php
/**
 * 365 PC Manager - broadband readings (the six-weekly service speed test).
 *
 * The technician (or the app on service day) runs a speed test from inside 365 PC
 * Manager and POSTs it here; the customer's portal reads the trend back. Over time
 * this is the only systematic panel of REAL in-home broadband in Dorset - technician-
 * measured, on a schedule - and it feeds (a) the customer's own Service Report
 * ("your line was 68 in March, 21 today - that's your line, not your PC"), (b) our
 * advice, and (c) an ANONYMISED public map, later, once there is enough to be honest.
 *
 *  action=save  {key, machine, down, up, ping, wired, isp, isp_auto, ipv, note}
 *               app-side (licence key + registered machine, Pro only - same gate as
 *               pcm-service.php). Stores one reading; returns the customer's trend.
 *  action=list  {wtoken, machine}   portal-side (websession, same as pcm-wifi.php):
 *               the account's readings, newest first, for the trend panel.
 *  action=agg   {}                  PUBLIC, anonymised: per outward-postcode-district
 *               medians by ISP, k-anonymity >= 5 readings per cell AND per ISP row,
 *               no timestamps finer than the month, never a customer key. This is
 *               what the future public map reads. Until enough data exists it
 *               simply returns few or no cells - honest, not padded.
 *
 * PRIVACY (design rule, not a setting): a home's speed + ISP + location is personal
 * data about an identifiable household. So:
 *   - readings are keyed to the customer INTERNALLY (it's part of their service record)
 *   - only the OUTWARD postcode (BH9, not BH9 2BG) is ever stored alongside a reading;
 *     the full address of record stays where it lives (pcm.php) and is never copied
 *   - the public agg never emits a cell/row with fewer than K readings
 *   - ISP is normalised to a fixed list; free text never reaches the aggregate
 * Storage: readings live OUTSIDE pcm-data.json (the hot DB) as api/pcm-bb-<24hex>.json,
 * denied by .htaccess (api/ denies pcm-* data files); only a compact 'latest' lives in
 * the customer record.
 */
header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');

$DATA = __DIR__ . '/pcm-data.json';
$K_ANON = 5;
$KEEP = 60;               // ~7 years of six-weekly readings per account
$MAX_RAW = 6000;

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
function bb_path($id){ return __DIR__ . '/pcm-bb-' . $id . '.json'; }
function bb_load($id){
    $p = bb_path($id);
    if (!file_exists($p)) return array();
    $d = json_decode((string)@file_get_contents($p), true);
    return is_array($d) ? $d : array();
}
function bb_save($id, $rows){
    $p = bb_path($id); $tmp = $p . '.' . getmypid() . '.tmp';
    if (@file_put_contents($tmp, json_encode($rows, JSON_UNESCAPED_SLASHES), LOCK_EX) !== false) @rename($tmp, $p);
}
// Fixed ISP list. Anything else -> 'other' (kept honestly in the customer record as
// note text if the tech typed it, but never as an aggregate row of its own).
$ISPS = array('bt','sky','virgin','talktalk','ee','vodafone','plusnet','now','zen','shell','hyperoptic','gigaclear','wessex','starlink','three','o2','other');
function norm_isp($s){
    global $ISPS;
    $s = strtolower(trim((string)$s));
    $map = array('virgin media'=>'virgin','virginmedia'=>'virgin','british telecom'=>'bt','bt business'=>'bt','talk talk'=>'talktalk','now broadband'=>'now','now tv'=>'now','shell energy'=>'shell','wessex internet'=>'wessex','three broadband'=>'three','3'=>'three','o2 broadband'=>'o2','ee broadband'=>'ee','vodafone broadband'=>'vodafone','sky broadband'=>'sky','plus net'=>'plusnet','zen internet'=>'zen');
    if (isset($map[$s])) $s = $map[$s];
    $s = preg_replace('/[^a-z0-9]/', '', $s);
    return in_array($s, $ISPS, true) ? $s : 'other';
}
// Outward postcode district: "BH9 2BG" -> "BH9"; "bh102ab" -> "BH10". Anything odd -> ''.
function outward($pc){
    $pc = strtoupper(preg_replace('/\s+/', '', (string)$pc));
    if (preg_match('/^([A-Z]{1,2}[0-9][A-Z0-9]?)[0-9][A-Z]{2}$/', $pc, $m)) return $m[1];
    if (preg_match('/^([A-Z]{1,2}[0-9][A-Z0-9]?)$/', $pc, $m)) return $m[1];
    return '';
}
function median($a){ sort($a); $n = count($a); if (!$n) return null; return $n % 2 ? $a[intdiv($n,2)] : round(($a[$n/2-1] + $a[$n/2]) / 2, 1); }

// ---------------------------------------------------------------- upload SINK (public, stateless)
// The app's upload test POSTs random bytes here for ~5s. We read them from the socket in
// chunks (that IS the measurement - the client times its own writes) and discard. No auth:
// nothing is stored, nothing is returned but ok. Bounded at 64MB per request so it can't
// be turned into a free bandwidth sink, and it never touches the DB or its lock.
if ((isset($_GET['action']) && $_GET['action'] === 'sink') && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $in = fopen('php://input', 'rb'); $n = 0; $cap = 64 * 1024 * 1024;
    if ($in) { while (!feof($in) && $n < $cap) { $c = fread($in, 262144); if ($c === false || $c === '') break; $n += strlen($c); } fclose($in); }
    out(array('ok'=>true, 'bytes'=>$n));
}
if ((isset($_GET['action']) && $_GET['action'] === 'sink')) { header('Allow: POST, HEAD'); out(array('ok'=>true)); }   // HEAD/GET: cheap 200 for the latency probe

$raw = file_get_contents('php://input');
if (strlen($raw) > $MAX_RAW) out(array('ok'=>false,'error'=>'too_big'));
$in = json_decode($raw, true);
if (!is_array($in)) $in = array();
$action = isset($in['action']) ? preg_replace('/[^a-z]/', '', $in['action']) : (isset($_GET['action']) ? preg_replace('/[^a-z]/', '', $_GET['action']) : '');

// ---------------------------------------------------------------- PUBLIC aggregate
if ($action === 'agg') {
    // Reads every sidecar via the compact index in the DB (no directory scan of a
    // possibly-large api/ folder). K-anonymity enforced per cell and per ISP row.
    $db_lock = db_lock($DATA);
    $db = load($DATA);
    $cells = array();   // outward => isp => [downs]
    foreach ($db['customers'] as $c) {
        if (empty($c['bb']) || empty($c['bb']['id'])) continue;
        $rows = bb_load($c['bb']['id']);
        $seen = array();
        foreach ($rows as $r) {
            if (empty($r['ow']) || !isset($r['down'])) continue;
            // one reading per customer per month per cell, so a frequently-visited home
            // can't dominate a district's median
            $mk = $r['ow'] . '|' . substr((string)$r['t'], 0, 7);
            if (isset($seen[$mk])) continue;
            $seen[$mk] = true;
            $isp = isset($r['isp']) ? $r['isp'] : 'other';
            $cells[$r['ow']][$isp][] = floatval($r['down']);
        }
    }
    if ($db_lock) @flock($db_lock, LOCK_UN);
    $outc = array();
    ksort($cells);
    foreach ($cells as $ow => $byIsp) {
        $all = array(); foreach ($byIsp as $arr) foreach ($arr as $v) $all[] = $v;
        if (count($all) < $K_ANON) continue;                        // cell too small: omit entirely
        $cell = array('district'=>$ow, 'n'=>count($all), 'median_down'=>median($all), 'isps'=>array());
        ksort($byIsp);
        foreach ($byIsp as $isp => $arr) {
            if (count($arr) < $K_ANON) continue;                    // ISP row too small: omit the row
            $cell['isps'][] = array('isp'=>$isp, 'n'=>count($arr), 'median_down'=>median($arr));
        }
        $outc[] = $cell;
    }
    header('Cache-Control: public, max-age=3600');
    out(array('ok'=>true, 'k'=>$K_ANON, 'unit'=>'Mbps download, technician-measured in customers\' homes; medians; one reading per home per month; districts/ISP rows under k omitted', 'cells'=>$outc, 'generated'=>gmdate('Y-m-d')));
}

$machine = isset($in['machine']) ? preg_replace('/[^a-f0-9]/', '', substr((string)$in['machine'], 0, 32)) : '';

// ---------------------------------------------------------------- APP save (Pro, registered machine)
if ($action === 'save') {
    $key = isset($in['key']) ? strtoupper(preg_replace('/[^A-Za-z0-9\-]/', '', (string)$in['key'])) : '';
    if ($key === '' || $machine === '') out(array('ok'=>false,'error'=>'missing'));
    $db_lock = db_lock($DATA);
    $db = load($DATA);
    if (!isset($db['customers'][$key])) out(array('ok'=>false,'error'=>'unknown_key'));
    $c =& $db['customers'][$key];
    if ((isset($c['tier']) ? $c['tier'] : 'free') !== 'pro') out(array('ok'=>false,'error'=>'not_on_support'));
    $machines = isset($c['machines']) && is_array($c['machines']) ? $c['machines'] : array();
    if (!isset($machines[$machine])) out(array('ok'=>false,'error'=>'activate_first'));

    $down = isset($in['down']) ? floatval($in['down']) : -1;
    $up   = isset($in['up'])   ? floatval($in['up'])   : -1;
    $ping = isset($in['ping']) ? floatval($in['ping']) : -1;
    if ($down < 0 || $down > 20000 || $up < 0 || $up > 20000 || $ping < 0 || $ping > 5000) out(array('ok'=>false,'error'=>'bad_reading'));
    $wired = !empty($in['wired']) ? 1 : 0;
    $isp = norm_isp(isset($in['isp']) ? $in['isp'] : '');
    $ispAuto = norm_isp(isset($in['isp_auto']) ? $in['isp_auto'] : '');
    $ipv = isset($in['ipv']) && $in['ipv'] === '6' ? '6' : '4';
    $note = isset($in['note']) ? substr(preg_replace('/[^\x20-\x7E]/', '', (string)$in['note']), 0, 80) : '';
    // outward district from the ADDRESS OF RECORD (never sent by the app; never the full postcode)
    $ow = '';
    if (!empty($c['address']) && is_array($c['address']) && !empty($c['address']['postcode'])) $ow = outward($c['address']['postcode']);
    elseif (!empty($c['postcode'])) $ow = outward($c['postcode']);

    if (!isset($c['bb']) || !is_array($c['bb'])) $c['bb'] = array();
    if (empty($c['bb']['id'])) $c['bb']['id'] = bin2hex(random_bytes(12));
    $rows = bb_load($c['bb']['id']);
    // one reading per machine per 10 minutes: a re-run replaces, it doesn't pile up
    $last = count($rows) ? $rows[count($rows)-1] : null;
    if ($last && $last['m'] === substr($machine, 0, 8) && intval($last['ts']) > time() - 600) array_pop($rows);
    $rows[] = array('t'=>gmdate('Y-m-d H:i'), 'ts'=>time(), 'm'=>substr($machine, 0, 8), 'down'=>round($down, 1), 'up'=>round($up, 1), 'ping'=>round($ping), 'wired'=>$wired, 'isp'=>$isp, 'isp_auto'=>$ispAuto, 'ipv'=>$ipv, 'ow'=>$ow, 'note'=>$note);
    while (count($rows) > $KEEP) array_shift($rows);
    bb_save($c['bb']['id'], $rows);
    // compact 'latest' in the hot record for the portal overview + the technician
    $c['bb']['latest'] = array('t'=>gmdate('Y-m-d H:i'), 'down'=>round($down, 1), 'up'=>round($up, 1), 'ping'=>round($ping), 'wired'=>$wired, 'isp'=>$isp);
    $c['bb']['n'] = count($rows);
    save_db($DATA, $db);
    if ($db_lock) @flock($db_lock, LOCK_UN);
    // hand the trend straight back so the app can show "vs last visit" without a second call
    $prev = count($rows) >= 2 ? $rows[count($rows)-2] : null;
    out(array('ok'=>true, 'n'=>count($rows), 'prev'=>$prev ? array('t'=>$prev['t'],'down'=>$prev['down'],'up'=>$prev['up'],'ping'=>$prev['ping'],'wired'=>$prev['wired'],'isp'=>$prev['isp']) : null, 'isp'=>$isp, 'district'=>$ow));
}

// ---------------------------------------------------------------- PORTAL list (websession)
if ($action === 'list') {
    $wt = isset($in['wtoken']) ? preg_replace('/[^a-f0-9]/', '', (string)$in['wtoken']) : '';
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
    $c = $db['customers'][$key];
    // team members see the account's readings (a line speed is a property of the
    // premises, not of a person) - same visibility as the machine list
    require_once __DIR__ . '/pcm-team-lib.php';
    if ($db_lock) @flock($db_lock, LOCK_UN);
    if (empty($c['bb']['id'])) out(array('ok'=>true, 'readings'=>array()));
    $rows = array_reverse(bb_load($c['bb']['id']));
    $outr = array();
    foreach ($rows as $r) $outr[] = array('t'=>$r['t'], 'down'=>$r['down'], 'up'=>$r['up'], 'ping'=>$r['ping'], 'wired'=>$r['wired'], 'isp'=>$r['isp'], 'note'=>$r['note']);
    out(array('ok'=>true, 'readings'=>$outr));
}

out(array('ok'=>false,'error'=>'bad_action'));
