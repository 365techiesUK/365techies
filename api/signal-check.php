<?php
/**
 * api/signal-check.php - store for the PUBLIC mobile signal check.
 *
 *   POST  {dl, latency, lat, lon, acc, net, place, conn}  → record one reading
 *   GET   ?cell=<lat>,<lon>[&acc=<m>]                     → "how does my area compare"
 *
 * ⚠️ THIS IS NOT THE VAN DATASET AND MUST NEVER TOUCH IT.
 * The van map (signal-log.php) is one instrument, one method, one network -
 * that purity is why its ranked places are citable and why the press pitch
 * exists. This store is the crowd: every phone, every network, every operator,
 * indoors and out. Different data, different file, different rules. Nothing
 * here is ever pooled into signal-data.json, the ranked spots or the CSV.
 *
 * WHAT IS STORED, AND WHAT IS NOT
 *  - the reading, binned to a CELL, never a precise point. A public "here's
 *    my exact reading" map is a "here's my house" map. We keep the cell centre
 *    only; the phone's real coordinates are discarded on arrival. Cells are
 *    ~500 m inland and ~140 m in the coastal band (see TWO GRIDS below) - the
 *    fine grid applies only where nobody lives.
 *  - the network the visitor told us (shown back to THAT user - it is their
 *    result), an hour bucket, and download / latency.
 *  - whether they were indoors or outdoors, which they tell us by which start
 *    button they press. Costs no extra tap and is the difference between "the
 *    network is poor here" and "this building is poor here".
 *  - the accuracy BAND of the position fix, never the metres. See the ACCURACY
 *    GATE below: a fix too vague for a cell is refused the fine grid, or
 *    refused outright.
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
const RATE_S      = 60;       // one reading per device per MINUTE (was 5 min; was 10) - owner, 2026-08-22
const CELL_DAY_MAX= 200;      // per cell per day - a busy town centre, not a bot
const MIN_FOR_COMPARE = 8;    // below this we say "not enough readings yet"
const CELL_LAT    = 200;      // ~550 m; a district, not a doorway
const CELL_LON    = 125;
const KEEP_DAYS   = 400;      // a year of seasons, then roll off

// ── TWO GRIDS: fine on the coast, coarse inland (2026-08-19) ────────────────
// The 500 m cell exists for ONE reason: a public reading must never be a
// house pin. That reason is about HOMES. On the beach, the piers, the prom,
// the chines and the Sandbanks spit nobody lives, and 500 m there swallowed
// the whole of Bournemouth Pier plus the beach either side - so "end of the
// pier: 5 Mbps" and "by the big wheel: 88 Mbps" were being averaged into one
// square that told the truth about neither. So precision follows land use:
//   inside the coastal band  -> ~140 m cells, solid at COAST_MIN readings
//   everywhere else          -> 500 m cells, solid at MIN_FOR_COMPARE, as now
// The band is a strip ~300 m inland from the water, Sandbanks to Hengistbury
// Head, plus the piers. Drawn conservatively: easier to widen than to explain
// why a residential street got fine cells. Homes stay exactly as protected.
// The precise coordinate exists for one instant on arrival; this is the only
// moment the decision can be made, and it is made per reading.
const COAST_CELL_LAT = 800;   // ~140 m
const COAST_CELL_LON = 500;
const COAST_MIN      = 5;     // still not one phone's opinion; reachable

// ── LOCATION ACCURACY GATE (2026-08-19) ────────────────────────────────────
// A phone reports how good its position fix is, and it varies enormously: a
// clear outdoor GPS lock is 5-20 m, while an indoor fix computed from WiFi and
// cell towers is routinely 40-150 m. Until now we binned both with equal
// confidence - so a +/-200 m fix could be dropped into a 140 m coastal cell as
// firmly as a +/-8 m one. On the fine grid that is not a rounding error, it is
// the wrong square, and the fine grid is precisely where we invited people to
// read a difference between one end of the pier and the other.
// So precision now has to be earned:
//   no fix better than COAST_MAX_ACC_M  -> the fine coastal grid is refused and
//                                          the reading falls back to 500 m
//   no fix better than MAX_ACC_M        -> the reading is refused outright; it
//                                          cannot be attributed to any cell
// Missing accuracy (an older cached client that does not send it) is treated
// as unknown and denied the fine grid. Conservative on purpose: we would
// rather under-claim precision than publish a square that is not where it says.
const MAX_ACC_M       = 1000;
const COAST_MAX_ACC_M = 50;
const COAST_BAND = [          // [lat, lon] ring, seaward W->E then inland E->W
    [50.6770,-1.9460],[50.6830,-1.9440],[50.6900,-1.9380],[50.6960,-1.9250],[50.7020,-1.9120],
    [50.7080,-1.8980],[50.7120,-1.8870],[50.7155,-1.8770],[50.7170,-1.8660],[50.7190,-1.8520],
    [50.7200,-1.8410],[50.7190,-1.8300],[50.7180,-1.8180],[50.7160,-1.8060],[50.7130,-1.7960],
    [50.7170,-1.7880],
    [50.7197,-1.7880],[50.7157,-1.7960],[50.7187,-1.8060],[50.7207,-1.8180],[50.7217,-1.8300],
    [50.7227,-1.8410],[50.7217,-1.8520],[50.7197,-1.8660],[50.7182,-1.8770],[50.7147,-1.8870],
    [50.7107,-1.8980],[50.7047,-1.9120],[50.6987,-1.9250],[50.6927,-1.9380],[50.6857,-1.9440],
    [50.6797,-1.9460],
];
const COAST_SANDBANKS = [[50.6740,-1.9500],[50.6740,-1.9400],[50.6830,-1.9380],[50.6860,-1.9460],[50.6800,-1.9520]];
const COAST_PIERS = [[50.7130,-1.8770],[50.7175,-1.8410]];   // centres; 260 m radius each

function point_in_ring(float $lat, float $lon, array $ring): bool {
    $in = false; $n = count($ring);
    for ($i = 0, $j = $n - 1; $i < $n; $j = $i++) {
        [$yi, $xi] = $ring[$i]; [$yj, $xj] = $ring[$j];
        if ((($yi > $lat) !== ($yj > $lat)) &&
            ($lon < ($xj - $xi) * ($lat - $yi) / (($yj - $yi) ?: 1e-12) + $xi)) $in = !$in;
    }
    return $in;
}
function is_coastal(float $lat, float $lon): bool {
    if (point_in_ring($lat, $lon, COAST_BAND)) return true;
    if (point_in_ring($lat, $lon, COAST_SANDBANKS)) return true;
    foreach (COAST_PIERS as [$pla, $plo]) {
        $d = hypot(($lat - $pla) * 111320, ($lon - $plo) * 111320 * cos(deg2rad($lat)));
        if ($d < 260) return true;
    }
    return false;
}

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
/** Cell centre for a coordinate. Returns [lat, lon, grid] where grid is
 *  'c' (coastal, fine) or 'i' (inland, coarse). The two grids never mix.
 *  $acc is the phone's reported accuracy in metres, or null if unknown; the
 *  fine coastal grid is granted only to a fix good enough to deserve it. */
function cell_of(float $lat, float $lon, ?float $acc = null): array {
    if ($acc !== null && $acc <= COAST_MAX_ACC_M && is_coastal($lat, $lon)) {
        return [round(round($lat * COAST_CELL_LAT) / COAST_CELL_LAT, 4),
                round(round($lon * COAST_CELL_LON) / COAST_CELL_LON, 4), 'c'];
    }
    return [round(round($lat * CELL_LAT) / CELL_LAT, 4), round(round($lon * CELL_LON) / CELL_LON, 4), 'i'];
}
function min_for(string $grid): int { return $grid === 'c' ? COAST_MIN : MIN_FOR_COMPARE; }
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
    // Match on cell centre AND grid: a coastal fine cell and an inland coarse
    // cell can never share a key, and rows stored before the coastal grid
    // existed carry no 'g' and are treated as inland ('i').
    $g = $cell[2] ?? 'i';
    $here = array_values(array_filter($rows, fn($r) =>
        $r['cla'] == $cell[0] && $r['clo'] == $cell[1] && (($r['g'] ?? 'i') === $g)));
    $n = count($here);
    $need = min_for($g);
    if ($n < $need) {
        return ['ok' => true, 'enough' => false, 'n' => $n, 'need' => $need, 'grid' => $g];
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
    // ?map=1 → every cell that has enough readings to show, for the crowd map.
    // CELLS ONLY, never points: each is a ~500 m square with a median and a
    // count. That is honest by construction (nobody's reading is a house pin)
    // and it is the same threshold as the compare - a cell with 2 readings is
    // not a result, so it is not drawn. NO per-network breakdown is emitted:
    // the map shows the crowd's median, not any operator's.
    if (isset($_GET['map']) && $_GET['map'] === '1') {
        $rows = jload(DATA_FILE);
        $cells = [];
        foreach ($rows as $r) {
            $g = $r['g'] ?? 'i';
            $k = $g . ':' . $r['cla'] . ',' . $r['clo'];      // grids never merge
            $cells[$k]['lat'] = $r['cla']; $cells[$k]['lon'] = $r['clo']; $cells[$k]['g'] = $g;
            $cells[$k]['dl'][] = $r['dl'];
        }
        // ⚠️ CHANGED 2026-08-17. Every cell is emitted from its FIRST reading.
        // The old rule (only cells with 8+) made the map look broken: people
        // tested, saw nothing appear, and stopped - the owner included. A blank
        // map is the one thing that kills a crowd tool. The 8-reading floor is
        // still right for the COMPARISON (a 3-reading median misleads) and it
        // still applies there; on the map, cells under the floor are emitted
        // with 'ready' => false and NO median, so the page can draw them as
        // "readings coming in here - N so far" without colouring a verdict it
        // can't stand behind. Honest AND rewarding for the first tester.
        // ⚠️ CHANGED AGAIN 2026-08-17: the median is now emitted from the FIRST
        // reading, so a square can be COLOURED at once - most people test once,
        // and a colour appearing is what makes them share. But one reading is
        // a picture of one phone, not of an area: a single indoor test must not
        // paint 500 m red for everyone. So 'ready' still marks the 8-reading
        // floor and the page draws under-floor squares faint + dashed, firming
        // up as readings arrive. Colour from one; conviction from eight.
        $out = [];
        $pending = 0;
        foreach ($cells as $c) {
            $n = count($c['dl']);
            $need = min_for($c['g']);
            $ready = $n >= $need;
            if (!$ready) $pending++;
            // 'g' tells the page which cell SIZE to draw; 'need' the floor for
            // that grid, so the N/need badge is right on both.
            $out[] = ['lat' => $c['lat'], 'lon' => $c['lon'], 'n' => $n, 'ready' => $ready,
                      'g' => $c['g'], 'need' => $need, 'dl' => round(median($c['dl']), 1)];
        }
        echo json_encode(['ok' => true, 'cells' => $out, 'pending' => $pending,
                          'total' => count($rows), 'need' => MIN_FOR_COMPARE,
                          'coast' => ['need' => COAST_MIN, 'cell_lat' => COAST_CELL_LAT, 'cell_lon' => COAST_CELL_LON],
                          'inland' => ['need' => MIN_FOR_COMPARE, 'cell_lat' => CELL_LAT, 'cell_lon' => CELL_LON]]);
        exit;
    }
    if (empty($_GET['cell'])) { echo json_encode(['ok' => false, 'error' => 'cell required']); exit; }
    [$la, $lo] = array_map('floatval', explode(',', $_GET['cell']) + [0, 0]);
    if (!$la || !$lo) { echo json_encode(['ok' => false, 'error' => 'bad cell']); exit; }
    $rows = jload(DATA_FILE);
    // Resolve the same cell the POST would have, accuracy and all - otherwise a
    // coastal visitor is compared against a square their reading never went in.
    $ga = num($_GET['acc'] ?? null, 0.0, 100000.0);
    echo json_encode(compare_for($rows, cell_of($la, $lo, $ga)));
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
    // How good the position fix is, in metres. Null when the client did not
    // send it (an older cached build) - that is 'unknown', not 'perfect'.
    $acc = num($in['acc'] ?? null, 0.0, 100000.0);
    if ($acc !== null && $acc > MAX_ACC_M) {
        echo json_encode(['ok' => false, 'error' => 'we could not pin down where you are well enough to use that reading - try again outside, or once your phone has a better fix']); exit;
    }
    // Indoors or outdoors. Asked as the start button itself, so it costs no
    // extra tap. This is the single biggest confounder in the whole dataset:
    // a slow reading through thick walls is the BUILDING, not the network, and
    // without this the two are indistinguishable. Stored per reading so the
    // headline figures can honestly say "outdoor readings only". '' = not asked
    // (an older client), and must never be silently counted as either.
    $place = in_array($in['place'] ?? '', ['in', 'out'], true) ? $in['place'] : '';
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
        // retry_s lets the page show a real countdown. NB this hash is per-IP,
        // and mobile carriers put many phones behind one address - so the
        // wording must never accuse; it may genuinely be their first test.
        echo json_encode(['ok' => false, 'error' => 'this connection tested in the last minute - your number is still shown; try again shortly',
                          'retry_s' => RATE_S - ($now - $rate['ip'][$who])]); exit;
    }
    [$cla, $clo, $grid] = cell_of($lat, $lon, $acc);
    $ck = "$grid:$cla,$clo";
    if (($rate['cell'][$ck] ?? 0) >= CELL_DAY_MAX) {
        echo json_encode(['ok' => false, 'error' => 'this area has enough readings for today']); exit;
    }
    $rate['ip'][$who] = $now;
    $rate['cell'][$ck] = ($rate['cell'][$ck] ?? 0) + 1;
    jsave(RATE_FILE, $rate);

    // Store: cell centre only. Real coordinates end here.
    $rows = jload(DATA_FILE);
    // How we knew this was mobile data: 'detected' (the browser told us) or
    // 'confirmed' (the visitor did, because iPhone/iPad Safari has no Network
    // Information API). Kept so a doubtful reading can be traced later, and so
    // we could weight or exclude confirmed-only rows if they ever look wrong.
    $csrc = (($in['conn_src'] ?? '') === 'detected') ? 'd' : 'c';
    // 'ac' is the accuracy BAND, not the raw metres: a precise accuracy figure
    // published alongside a cell centre would help narrow down where someone
    // actually stood, which is the one thing the cell exists to prevent.
    $accb = $acc === null ? null : ($acc <= 15 ? 'a' : ($acc <= 50 ? 'b' : ($acc <= 200 ? 'c' : 'd')));
    $rows[] = ['t' => $now, 'cla' => $cla, 'clo' => $clo, 'g' => $grid, 'cs' => $csrc, 'dl' => round($dl, 1),
               'ms' => $ms !== null ? (int)round($ms) : null,
               'net' => $net, 'p' => $place, 'ac' => $accb, 'h' => (int)gmdate('G', $now)];
    // roll off old rows, cap size
    $cut = $now - KEEP_DAYS * 86400;
    $rows = array_values(array_filter($rows, fn($r) => ($r['t'] ?? 0) > $cut));
    if (count($rows) > MAX_ROWS) $rows = array_slice($rows, -MAX_ROWS);
    jsave(DATA_FILE, $rows);

    $cmp = compare_for($rows, [$cla, $clo, $grid]);
    $cmp['you'] = ['dl' => round($dl, 1), 'ms' => $ms !== null ? (int)round($ms) : null, 'net' => $net];
    // the cell this reading landed in - centre + grid - so the page can light
    // up the RIGHT square (it must not re-derive the grid client-side)
    $cmp['cell'] = ['lat' => $cla, 'lon' => $clo, 'g' => $grid];
    $cmp['next_s'] = RATE_S;     // when the next test unlocks - keeps the client's countdown in sync if RATE_S ever changes
    echo json_encode($cmp);
    exit;
}

http_response_code(405);
echo json_encode(['ok' => false, 'error' => 'method not allowed']);
