<?php
/**
 * PC benchmark community chart - the pure parts (validation + statistics), shared by
 * bench-submit.php, bench-stats.php and bench-test.php.
 *
 * WHAT IS STORED (one JSON line per opted-in run): time, overall score, the six sub-scores, thread
 * count, operating system, browser, the graphics-card name where the browser shares it, and a hashed
 * device nonce so one machine counts once. Nothing personal: no IP is kept with a result (the
 * submit endpoint keeps a salted, daily-rotating IP hash in a separate throttle file only to
 * rate-limit), no names, no account.
 *
 * WHY THE CHECKS: the score is computed in the visitor's browser, so anyone can POST anything.
 * A row must be internally consistent (the overall must equal the weighted sub-scores, same
 * weights as the page), every field is bounded and whitelisted, one device's latest run is the one
 * that counts, and nothing at all is published below BENCH_FLOOR results. There is no leaderboard.
 */
if (!defined('BENCH_LIB')) {
    define('BENCH_LIB', 1);

define('BENCH_VERSION', 2);          // the scoring scale of 12 Sep 2026; bump when the scale changes and old rows stop comparing
define('BENCH_FLOOR', 50);           // results needed before any chart is shown
define('BENCH_WINDOW_DAYS', 365);
define('BENCH_MAX_ROWS', 20000);

function bench_weights() {
    return array('single' => 0.22, 'multi' => 0.22, 'crypto' => 0.08, 'mem' => 0.13, 'gpu' => 0.20, 'store' => 0.15);
}
function bench_os_list()      { return array('Windows', 'macOS', 'Linux', 'ChromeOS', 'Android', 'iOS', 'other'); }
function bench_browser_list() { return array('Chrome', 'Edge', 'Firefox', 'Safari', 'Opera', 'Samsung Internet', 'other'); }

/** Validate one submission. Returns array('row' => ...) or array('err' => 'reason'). */
function bench_validate($in, $devHash, $now = null) {
    $now = $now ? (int)$now : time();
    if (!is_array($in)) return array('err' => 'bad_json');
    if (intval(isset($in['v']) ? $in['v'] : 0) !== BENCH_VERSION) return array('err' => 'version');
    $score = isset($in['score']) && is_numeric($in['score']) ? intval($in['score']) : -1;
    if ($score < 5 || $score > 100) return array('err' => 'score');
    $subIn = isset($in['sub']) && is_array($in['sub']) ? $in['sub'] : array();
    $sub = array(); $present = 0; $acc = 0.0; $tw = 0.0;
    foreach (bench_weights() as $k => $w) {
        $v = isset($subIn[$k]) ? $subIn[$k] : null;
        if ($v === null || $v === '') { $sub[$k] = null; continue; }
        if (!is_numeric($v)) return array('err' => 'sub');
        $v = intval($v); if ($v < 5 || $v > 100) return array('err' => 'sub');
        $sub[$k] = $v; $present++; $acc += $v * $w; $tw += $w;
    }
    if ($present < 3) return array('err' => 'too_few_tests');
    if (abs(round($acc / $tw) - $score) > 2) return array('err' => 'inconsistent');   // the page's own arithmetic, re-done here
    $th = isset($in['threads']) && is_numeric($in['threads']) ? intval($in['threads']) : 0;
    if ($th < 1 || $th > 256) return array('err' => 'threads');
    $os = isset($in['os']) ? (string)$in['os'] : 'other';   if (!in_array($os, bench_os_list(), true)) $os = 'other';
    $br = isset($in['browser']) ? (string)$in['browser'] : 'other'; if (!in_array($br, bench_browser_list(), true)) $br = 'other';
    $gpu = isset($in['gpu']) ? (string)$in['gpu'] : '';
    $gpu = trim(preg_replace('/[^ -~]/', '', $gpu));         // printable ASCII only
    if (strlen($gpu) > 60) $gpu = substr($gpu, 0, 60);
    if (!preg_match('/^[a-f0-9]{16}$/', (string)$devHash)) return array('err' => 'device');
    return array('row' => array('t' => $now, 'v' => BENCH_VERSION, 's' => $score, 'sub' => $sub, 'th' => $th,
                                'os' => $os, 'br' => $br, 'gpu' => $gpu, 'dev' => $devHash));
}

/** Aggregate rows (arrays as stored). One row per device (its latest), current scale, inside the window. */
function bench_stats($rows, $now = null) {
    $now = $now ? (int)$now : time();
    $cut = $now - BENCH_WINDOW_DAYS * 86400;
    $latest = array();
    foreach ((array)$rows as $r) {
        if (!is_array($r) || intval(isset($r['v']) ? $r['v'] : 0) !== BENCH_VERSION) continue;
        $t = intval(isset($r['t']) ? $r['t'] : 0); if ($t < $cut) continue;
        $s = intval(isset($r['s']) ? $r['s'] : 0); if ($s < 5 || $s > 100) continue;
        $d = isset($r['dev']) ? (string)$r['dev'] : ('anon' . count($latest));
        if (!isset($latest[$d]) || $latest[$d]['t'] <= $t) $latest[$d] = array('t' => $t, 's' => $s);
    }
    $n = count($latest);
    $out = array('computed' => $now, 'floor' => BENCH_FLOOR, 'count' => $n, 'enough' => ($n >= BENCH_FLOOR));
    if (!$out['enough']) return $out;
    $scores = array(); foreach ($latest as $l) $scores[] = $l['s'];
    sort($scores);
    $hist = array_fill(0, 20, 0);
    foreach ($scores as $s) $hist[min(19, intdiv($s, 5))]++;
    $cdf = array(); $i = 0;
    for ($s = 0; $s <= 100; $s++) { while ($i < $n && $scores[$i] <= $s) $i++; $cdf[$s] = round($i / $n, 3); }
    $out['hist']   = $hist;                       // 20 buckets of five points; 100 sits in the last one
    $out['cdf']    = $cdf;                        // cdf[s] = share of results scoring s or less
    $out['median'] = ($n % 2) ? $scores[intdiv($n, 2)] : (int)round(($scores[$n / 2 - 1] + $scores[$n / 2]) / 2);
    return $out;
}

/** Keep the newest BENCH_MAX_ROWS lines of a JSON-lines store. Returns the kept text. */
function bench_prune_text($text) {
    $lines = preg_split('/\r?\n/', trim((string)$text));
    if (count($lines) <= BENCH_MAX_ROWS) return implode("\n", $lines) . "\n";
    return implode("\n", array_slice($lines, -BENCH_MAX_ROWS)) . "\n";
}

}  // BENCH_LIB
