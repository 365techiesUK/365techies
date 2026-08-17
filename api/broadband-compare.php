<?php
/**
 * api/broadband-compare.php - "how does my broadband compare with my area".
 *
 *   POST {dl, ul, ping, district, kind, conn, [people]} → record + compare
 *   GET  ?district=BH8&kind=home&conn=wired              → compare only
 *
 * A memory for the existing /broadband-speed-checker/. The test itself is
 * unchanged and still measures against Cloudflare; this stores what a visitor
 * CHOOSES to submit afterwards, and answers one question: how does that sit
 * against other homes (or businesses) in the same postcode district?
 *
 * THE TRAP THIS IS BUILT AROUND
 * A home broadband reading is dominated by the WiFi, not the line. 900 Mbps
 * full fibre tested from a phone in the garden reads 40 Mbps, and a naive
 * compare then says "you: 40, area: 300" - i.e. "your ISP is rubbish" when it
 * is their router. So every reading carries HOW it was taken (wired / WiFi
 * same room / WiFi elsewhere) and is ONLY compared like with like. That is
 * both the honest answer and, not by accident, exactly the conversation a
 * local WiFi installer wants to have.
 *
 * WHAT IS STORED, AND WHAT IS NOT
 *  - postcode DISTRICT only (BH8, BH12, DT1). Never a full postcode, never a
 *    coordinate: a district is thousands of homes; a full postcode is fifteen.
 *  - kind (home/business), conn (wired/wifi_near/wifi_far), for a business
 *    optionally how many people share the line (banded, not exact).
 *  - dl / ul / ping, an hour bucket. NOT: IP, user agent, id, ISP, name.
 *  - rate limiting uses a salted, day-scoped, truncated hash of the IP.
 *
 * WHAT IT WILL NOT SHOW
 *  - any comparison for a pool under MIN_FOR_COMPARE readings. Two neighbours
 *    is not "typical for BH8"; it is two neighbours.
 *  - any ISP-vs-ISP table. We don't collect the ISP, so we can't. Deliberate:
 *    the same reasoning that keeps the mobile check off operator league
 *    tables applies here, and the fix for slow broadband is usually the WiFi
 *    anyway.
 *
 * Own file. Never pooled with the van dataset or the mobile signal check.
 */
const DATA_FILE = __DIR__ . '/broadband-compare-data.json';   // gitignored
const RATE_FILE = __DIR__ . '/broadband-compare-rate.json';   // gitignored
const MAX_ROWS  = 50000;
const RATE_S    = 900;                // one submission per device per 15 min
const MIN_FOR_COMPARE = 8;
const KEEP_DAYS = 400;
const KINDS = ['home', 'business'];
const CONNS = ['wired', 'wifi_near', 'wifi_far'];

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
/** UK outward code: 1-2 letters, 1-2 digits, optional trailing letter. BH8, BH12, DT1, SO16, EC1A. */
function district_of($s) {
    $s = strtoupper(preg_replace('/\s+/', '', (string)$s));
    // accept a full postcode and keep only the outward part
    if (preg_match('/^([A-Z]{1,2}\d[A-Z\d]?)\s*\d[A-Z]{2}$/', $s, $m)) $s = $m[1];
    return preg_match('/^[A-Z]{1,2}\d[A-Z\d]?$/', $s) ? $s : null;
}
function people_band($v) {
    $v = (int)$v;
    if ($v <= 0) return null;
    return $v <= 3 ? '1-3' : ($v <= 10 ? '4-10' : ($v <= 25 ? '11-25' : '26+'));
}
function compare_for(array $rows, string $district, string $kind, string $conn, ?float $you = null): array {
    $pool = array_values(array_filter($rows, fn($r) =>
        $r['d'] === $district && $r['k'] === $kind && $r['c'] === $conn));
    $n = count($pool);
    if ($n < MIN_FOR_COMPARE) {
        return ['ok' => true, 'enough' => false, 'n' => $n, 'need' => MIN_FOR_COMPARE,
                'district' => $district, 'kind' => $kind, 'conn' => $conn];
    }
    $dl = array_column($pool, 'dl'); sort($dl);
    $ul = array_column($pool, 'ul');
    $out = [
        'ok' => true, 'enough' => true, 'n' => $n,
        'district' => $district, 'kind' => $kind, 'conn' => $conn,
        'median' => round(median($dl), 1),
        'p25'    => round($dl[(int)floor(($n - 1) * .25)], 1),
        'p75'    => round($dl[(int)floor(($n - 1) * .75)], 1),
        'best'   => round(max($dl), 1),
        'ul_median' => $ul ? round(median($ul), 1) : null,
    ];
    if ($you !== null) {
        $below = count(array_filter($dl, fn($x) => $x < $you));
        $out['you_pct'] = (int)round(100 * $below / $n);   // "faster than N% of readings here"
    }
    return $out;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $d = district_of($_GET['district'] ?? '');
    $k = in_array($_GET['kind'] ?? '', KINDS, true) ? $_GET['kind'] : 'home';
    $c = in_array($_GET['conn'] ?? '', CONNS, true) ? $_GET['conn'] : 'wired';
    if (!$d) { echo json_encode(['ok' => false, 'error' => 'postcode district required']); exit; }
    echo json_encode(compare_for(jload(DATA_FILE), $d, $k, $c));
    exit;
}

if ($method === 'POST') {
    $in = json_decode((string)file_get_contents('php://input'), true);
    if (!is_array($in)) { http_response_code(400); echo json_encode(['ok' => false]); exit; }

    $d  = district_of($in['district'] ?? '');
    $k  = in_array($in['kind'] ?? '', KINDS, true) ? $in['kind'] : null;
    $c  = in_array($in['conn'] ?? '', CONNS, true) ? $in['conn'] : null;
    $dl = num($in['dl'] ?? null, 0.1, 10000);
    $ul = num($in['ul'] ?? null, 0.0, 10000);
    $pg = num($in['ping'] ?? null, 0, 5000);
    if (!$d || !$k || !$c || $dl === null) {
        echo json_encode(['ok' => false, 'error' => 'need postcode district, home/business, how connected, and a download figure']); exit;
    }
    $pb = ($k === 'business') ? people_band($in['people'] ?? 0) : null;

    // rate limit: salted, day-scoped hash - forgotten with the day
    $day  = gmdate('Y-m-d');
    $who  = substr(hash('sha256', $day . '|' . php_uname('n') . '|' . ($_SERVER['REMOTE_ADDR'] ?? '')), 0, 16);
    $rate = jload(RATE_FILE);
    if (($rate['day'] ?? '') !== $day) $rate = ['day' => $day, 'ip' => []];
    $now = time();
    if (isset($rate['ip'][$who]) && ($now - $rate['ip'][$who]) < RATE_S) {
        echo json_encode(['ok' => false, 'error' => 'one submission per 15 minutes']); exit;
    }
    $rate['ip'][$who] = $now;
    jsave(RATE_FILE, $rate);

    $rows = jload(DATA_FILE);
    $rows[] = ['t' => $now, 'd' => $d, 'k' => $k, 'c' => $c, 'p' => $pb,
               'dl' => round($dl, 1), 'ul' => $ul !== null ? round($ul, 1) : null,
               'ms' => $pg !== null ? (int)round($pg) : null, 'h' => (int)gmdate('G', $now)];
    $cut = $now - KEEP_DAYS * 86400;
    $rows = array_values(array_filter($rows, fn($r) => ($r['t'] ?? 0) > $cut));
    if (count($rows) > MAX_ROWS) $rows = array_slice($rows, -MAX_ROWS);
    jsave(DATA_FILE, $rows);

    $cmp = compare_for($rows, $d, $k, $c, $dl);
    $cmp['you'] = ['dl' => round($dl, 1), 'ul' => $ul !== null ? round($ul, 1) : null,
                   'ping' => $pg !== null ? (int)round($pg) : null];
    echo json_encode($cmp);
    exit;
}

http_response_code(405);
echo json_encode(['ok' => false, 'error' => 'method not allowed']);
