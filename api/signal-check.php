<?php
/**
 * api/signal-check.php - store for the PUBLIC mobile signal check.
 *
 *   POST  {dl, latency, lat, lon, net, conn}   → record one reading
 *   GET   ?cell=<lat>,<lon>                    → "how does my area compare"
 *
 * ⚠️ THIS IS NOT THE VAN DATASET AND MUST NEVER TOUCH IT.
 * The van map (signal-log.php) is one instrument, one method, one network -
 * that purity is why its ranked places are citable and why the press pitch
 * exists. This store is the crowd: every phone, every network, every operator,
 * indoors and out. Different data, different file, different rules. Nothing
 * here is ever pooled into signal-data.json, the ranked spots or the CSV.
 *
 * WHAT IS STORED, AND WHAT IS NOT
 *  - the reading, binned to a ~500 m CELL, never a precise point. A public
 *    "here's my exact reading" map is a "here's my house" map. We keep the
 *    cell centre only; the phone's real coordinates are discarded on arrival.
 *  - the network name the phone reported (shown back to THAT user - it is
 *    their result), an hour bucket, and download / latency.
 *  - NOT: IP address, user agent, any id, any name. Rate limiting uses a
 *    salted, truncated hash of the IP that is thrown away with the day.
 *
 * WHAT IT WILL NOT SHOW
 *  - any network-vs-network table, ranking or average. Ever. The compare is
 *    "you vs your area", where "your area" pools everyone regardless of
 *    network. Publishing "EE 45 / Three 12 on your street" is the operator
 *    scorecard the whole project has agreed not to build. Do not add it.
 *  - a comparison for a cell with fewer than MIN_FOR_COMPARE readings. Two
 *    people is not "typical for your area"; it is two people.
 *
 * ABUSE
 *  - one reading per hashed IP per RATE_S seconds; per-cell daily cap.
 *  - readings on WiFi are refused client-side AND flagged here (conn must be
 *    'cellular'); anything else is dropped. Otherwise half the readings are
 *    people's home broadband wearing a mobile badge.
 *  - hard bounds on every number. Anything absurd is dropped, not clamped.
 */
const DATA_FILE   = __DIR__ . '/signal-check-data.json';    // gitignored
const RATE_FILE   = __DIR__ . '/signal-check-rate.json';    // gitignored
const MAX_ROWS    = 50000;
const RATE_S      = 600;      // one reading per device per 10 min
const CELL_DAY_MAX= 200;      // per cell per day - a busy town centre, not a bot
const MIN_FOR_COMPARE = 8;    // below this we say "not enough readings yet"
const CELL_LAT    = 200;      // ~550 m; a district, not a doorway
const CELL_LON    = 125;
const KEEP_DAYS   = 400;      // a year of seasons, then roll off

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex');

function jload(string $f): array {
    if (!is_file($f)) return [];
    $d = json_decode((string)file_get_contents($f), true);
    return is_array($d) ? $d : [];
}
function jsave(string $f, array $d): void {
    $tmp = $f . '.tmp';
    if (file_put_contents($tmp, json_encode($d), LOCK_EX) !== false) @rename($tmp, $f);
}
function cell_of(float $lat, float $lon): array {
    return [round(round($lat * CELL_LAT) / CELL_LAT, 4), round(round($lon * CELL_LON) / CELL_LON, 4)];
}
function num($v, float $lo, float $hi) {
    if (!is_numeric($v)) return null;
    $v = (float)$v;
    return ($v >= $lo && $v <= $hi) ? $v : null;
}
function median(array $a) {
    if (!$a) return null;
    sort($a); $n = count($a); $m = intdiv($n, 2);
    return $n % 2 ? $a[$m] : ($a[$m - 1] + $a[$m]) / 2;
}
function compare_for(array $rows, array $cell): array {
    $here = array_values(array_filter($rows, fn($r) => $r['cla'] == $cell[0] && $r['clo'] == $cell[1]));
    $n = count($here);
    if ($n < MIN_FOR_COMPARE) {
        return ['ok' => true, 'enough' => false, 'n' => $n, 'need' => MIN_FOR_COMPARE];
    }
    $dl = array_column($here, 'dl');
    sort($dl);
    return [
        'ok'      => true,
        'enough'  => true,
        'n'       => $n,
        'median'  => round(median($dl), 1),
        'p25'     => round($dl[(int)floor(($n - 1) * .25)], 1),
        'p75'     => round($dl[(int)floor(($n - 1) * .75)], 1),
        'best'    => round(max($dl), 1),
        // hour-of-day spread, so "it's slow at 6pm here" is answerable
        'by_hour' => (function () use ($here) {
            $h = [];
            foreach ($here as $r) { $h[$r['h']][] = $r['dl']; }
            $o = [];
            foreach ($h as $k => $v) if (count($v) >= 3) $o[(int)$k] = round(median($v), 1);
            ksort($o); return $o;
        })(),
    ];
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    if (empty($_GET['cell'])) { echo json_encode(['ok' => false, 'error' => 'cell required']); exit; }
    [$la, $lo] = array_map('floatval', explode(',', $_GET['cell']) + [0, 0]);
    if (!$la || !$lo) { echo json_encode(['ok' => false, 'error' => 'bad cell']); exit; }
    $rows = jload(DATA_FILE);
    echo json_encode(compare_for($rows, cell_of($la, $lo)));
    exit;
}

if ($method === 'POST') {
    $in = json_decode((string)file_get_contents('php://input'), true);
    if (!is_array($in)) { http_response_code(400); echo json_encode(['ok' => false]); exit; }

    // Cellular only. The client refuses WiFi; we refuse it again here.
    if (($in['conn'] ?? '') !== 'cellular') {
        echo json_encode(['ok' => false, 'error' => 'mobile data only']); exit;
    }
    $dl  = num($in['dl'] ?? null, 0.05, 2000);
    $ms  = num($in['latency'] ?? null, 1, 5000);
    $lat = num($in['lat'] ?? null, 49.5, 61.0);      // UK only - it's a local tool
    $lon = num($in['lon'] ?? null, -8.5, 2.0);
    if ($dl === null || $lat === null || $lon === null) {
        echo json_encode(['ok' => false, 'error' => 'reading out of range']); exit;
    }
    // network name: short, printable, no markup. Shown back to the user only.
    $net = preg_replace('/[^A-Za-z0-9 +&\-]/', '', substr((string)($in['net'] ?? ''), 0, 20));
    if ($net === '') $net = 'unknown';

    // Rate limit: salted, truncated hash of the IP, forgotten with the day.
    $day  = gmdate('Y-m-d');
    $salt = $day . '|' . php_uname('n');
    $who  = substr(hash('sha256', $salt . '|' . ($_SERVER['REMOTE_ADDR'] ?? '')), 0, 16);
    $rate = jload(RATE_FILE);
    if (($rate['day'] ?? '') !== $day) $rate = ['day' => $day, 'ip' => [], 'cell' => []];
    $now = time();
    if (isset($rate['ip'][$who]) && ($now - $rate['ip'][$who]) < RATE_S) {
        echo json_encode(['ok' => false, 'error' => 'one reading per 10 minutes']); exit;
    }
    [$cla, $clo] = cell_of($lat, $lon);
    $ck = "$cla,$clo";
    if (($rate['cell'][$ck] ?? 0) >= CELL_DAY_MAX) {
        echo json_encode(['ok' => false, 'error' => 'this area has enough readings for today']); exit;
    }
    $rate['ip'][$who] = $now;
    $rate['cell'][$ck] = ($rate['cell'][$ck] ?? 0) + 1;
    jsave(RATE_FILE, $rate);

    // Store: cell centre only. Real coordinates end here.
    $rows = jload(DATA_FILE);
    $rows[] = ['t' => $now, 'cla' => $cla, 'clo' => $clo, 'dl' => round($dl, 1),
               'ms' => $ms !== null ? (int)round($ms) : null,
               'net' => $net, 'h' => (int)gmdate('G', $now)];
    // roll off old rows, cap size
    $cut = $now - KEEP_DAYS * 86400;
    $rows = array_values(array_filter($rows, fn($r) => ($r['t'] ?? 0) > $cut));
    if (count($rows) > MAX_ROWS) $rows = array_slice($rows, -MAX_ROWS);
    jsave(DATA_FILE, $rows);

    $cmp = compare_for($rows, [$cla, $clo]);
    $cmp['you'] = ['dl' => round($dl, 1), 'ms' => $ms !== null ? (int)round($ms) : null, 'net' => $net];
    echo json_encode($cmp);
    exit;
}

http_response_code(405);
echo json_encode(['ok' => false, 'error' => 'method not allowed']);
