<?php
/**
 * PC benchmark community chart - opt-in submission. POST JSON:
 *   {v:2, score, sub:{single,multi,crypto,mem,gpu,store}, threads, os, browser, gpu, dev}
 * -> {ok:true, count, enough}  |  {ok:false, err}  (429 with retry_s when rate-limited)
 *
 * Anonymous by design: see bench-lib.php. Rate limiting uses a salted hash of the IP that rotates
 * daily and lives only in bench-throttle.json (denied to browsers, like every other api store);
 * it is never written next to a result. The device nonce is hashed before it is stored.
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');
require_once __DIR__ . '/bench-lib.php';

const RATE_IP_S  = 60;     // one submission per IP per minute
const RATE_IP_D  = 40;     // and at most this many per IP per day
const RATE_DEV_S = 600;    // one per device per ten minutes

$STORE    = __DIR__ . '/bench-results.json';       // JSON lines inside; the .json name keeps it under the deny rule
$THROTTLE = __DIR__ . '/bench-throttle.json';
$CACHE    = __DIR__ . '/bench-stats-cache.json';

function out($a, $code = 200) { http_response_code($code); echo json_encode($a); exit; }

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') out(array('ok' => false, 'err' => 'method'), 405);
$raw = (string)file_get_contents('php://input');
if (strlen($raw) > 4096) out(array('ok' => false, 'err' => 'too_big'), 413);
$in = json_decode($raw, true);
if (!is_array($in)) out(array('ok' => false, 'err' => 'bad_json'), 400);

$dev = isset($in['dev']) ? (string)$in['dev'] : '';
if (!preg_match('/^[A-Za-z0-9_-]{8,40}$/', $dev)) out(array('ok' => false, 'err' => 'device'), 400);
$devHash = substr(hash('sha256', 'bench-dev|' . php_uname('n') . '|' . $dev), 0, 16);

// ---- rate limit (salted daily IP hash + device hash), forgotten with the day
$now = time(); $day = gmdate('Y-m-d', $now);
$who = substr(hash('sha256', $day . '|' . php_uname('n') . '|' . ($_SERVER['REMOTE_ADDR'] ?? '')), 0, 16);
$tf = @fopen($THROTTLE, 'c+');
if ($tf) {
    @flock($tf, LOCK_EX);
    $th = json_decode((string)stream_get_contents($tf), true);
    if (!is_array($th) || (isset($th['day']) ? $th['day'] : '') !== $day) $th = array('day' => $day, 'ip' => array(), 'dev' => array());
    $ipRec = isset($th['ip'][$who]) ? $th['ip'][$who] : array('t' => 0, 'n' => 0);
    $devT  = isset($th['dev'][$devHash]) ? intval($th['dev'][$devHash]) : 0;
    $retry = 0;
    if ($now - intval($ipRec['t']) < RATE_IP_S) $retry = RATE_IP_S - ($now - intval($ipRec['t']));
    if (intval($ipRec['n']) >= RATE_IP_D)         $retry = max($retry, 3600);
    if ($now - $devT < RATE_DEV_S)                $retry = max($retry, RATE_DEV_S - ($now - $devT));
    if ($retry > 0) { @flock($tf, LOCK_UN); @fclose($tf); out(array('ok' => false, 'err' => 'rate', 'retry_s' => $retry), 429); }
    $th['ip'][$who] = array('t' => $now, 'n' => intval($ipRec['n']) + 1);
    $th['dev'][$devHash] = $now;
    ftruncate($tf, 0); rewind($tf); fwrite($tf, json_encode($th)); fflush($tf);
    @flock($tf, LOCK_UN); @fclose($tf);
}

// ---- validate and append
$v = bench_validate($in, $devHash, $now);
if (isset($v['err'])) out(array('ok' => false, 'err' => $v['err']), 400);
$line = json_encode($v['row']) . "\n";
$sf = @fopen($STORE, 'a');
if (!$sf) out(array('ok' => false, 'err' => 'store'), 500);
@flock($sf, LOCK_EX); fwrite($sf, $line); fflush($sf); @flock($sf, LOCK_UN); @fclose($sf);
clearstatcache(true, $STORE);
if (@filesize($STORE) > 4 * 1024 * 1024) {              // keep the newest BENCH_MAX_ROWS
    $lk = @fopen($STORE, 'r+');
    if ($lk && @flock($lk, LOCK_EX)) { $kept = bench_prune_text((string)stream_get_contents($lk)); ftruncate($lk, 0); rewind($lk); fwrite($lk, $kept); fflush($lk); @flock($lk, LOCK_UN); }
    if ($lk) @fclose($lk);
}
@unlink($CACHE);                                         // the next stats call recomputes

// a quick count so the page can say "N results so far" straight away
$n = 0; $rf = @fopen($STORE, 'r');
if ($rf) { @flock($rf, LOCK_SH); while (($l = fgets($rf)) !== false) if (trim($l) !== '') $n++; @flock($rf, LOCK_UN); @fclose($rf); }
out(array('ok' => true, 'count' => $n, 'enough' => ($n >= BENCH_FLOOR)));
