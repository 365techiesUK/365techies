<?php
/**
 * api/signal-press-lib.php - counts-only summaries of the crowd signal store, by council area (17 Sep 2026).
 * Library only: included by api/signal-check.php for ?press=1, never a URL (denied in .htaccess).
 *
 * WHY: the press page for the crowd map (/mobile-signal-check/data/) has to quote figures a journalist can check
 * and a council can recognise: how many readings inside Bournemouth, Christchurch and Poole, how many were taken
 * outdoors, over how many days, at what times of day. The public ?map=1 feed carries none of that (no dates, no
 * indoor/outdoor), on purpose. This computes those totals on the server and returns totals only.
 *
 * WHAT IT WILL NEVER RETURN: anything per network (no league table, ever - see the header of signal-check.php),
 * anything per reading, any date or time tied to a square, or any square at all. Areas are whole councils or
 * former boroughs, tens of thousands of homes each.
 *
 * AREA RULES (the press page states them): a square counts in an area when its CENTRE is inside that area's
 * boundary (api/signal-areas.json: ONS Local Authority Districts, full extent to the low-water line). Seafront
 * squares on the fine grid exist only between Sandbanks and Hengistbury Head, so they always count in BCP, even
 * at the end of a pier. A coarse square whose centre falls just outside every council (the sea, or a gap in the
 * simplified line) counts in BCP when BCP is the nearest council and within 400 m. The town is the former
 * borough (December 2018 boundaries) that contains the centre, or the nearest one.
 */

function sigpress_in_rings(float $lat, float $lon, array $rings): bool {
    $in = false;
    foreach ($rings as $ring) {
        $n = count($ring);
        for ($i = 0, $j = $n - 1; $i < $n; $j = $i++) {
            $yi = $ring[$i][0]; $xi = $ring[$i][1]; $yj = $ring[$j][0]; $xj = $ring[$j][1];
            if ((($yi > $lat) !== ($yj > $lat)) && ($lon < ($xj - $xi) * ($lat - $yi) / (($yj - $yi) ?: 1e-12) + $xi)) $in = !$in;
        }
    }
    return $in;
}

/* metres from a point to the nearest edge of any ring (local flat approximation - fine at this scale) */
function sigpress_dist_m(float $lat, float $lon, array $rings): float {
    $ky = 111320.0; $kx = 111320.0 * cos(deg2rad($lat)); $best = INF;
    foreach ($rings as $ring) {
        $n = count($ring);
        for ($i = 0, $j = $n - 1; $i < $n; $j = $i++) {
            $ax = ($ring[$j][1] - $lon) * $kx; $ay = ($ring[$j][0] - $lat) * $ky;
            $bx = ($ring[$i][1] - $lon) * $kx; $by = ($ring[$i][0] - $lat) * $ky;
            $dx = $bx - $ax; $dy = $by - $ay; $l2 = $dx * $dx + $dy * $dy;
            $t = $l2 > 0 ? max(0.0, min(1.0, -($ax * $dx + $ay * $dy) / $l2)) : 0.0;
            $d = hypot($ax + $t * $dx, $ay + $t * $dy);
            if ($d < $best) $best = $d;
        }
    }
    return $best;
}

function sigpress_bbox(array $rings): array {
    $b = [INF, INF, -INF, -INF];
    foreach ($rings as $ring) foreach ($ring as $p) {
        $b[0] = min($b[0], $p[0]); $b[1] = min($b[1], $p[1]); $b[2] = max($b[2], $p[0]); $b[3] = max($b[3], $p[1]);
    }
    return $b;
}

/** Which area keys a square belongs to: [] or ['bcp', '<town>']. */
function sigpress_areas_of(float $lat, float $lon, string $grid, array $A, array $bbox): array {
    // quick reject: nowhere near BCP (2 km margin)
    if ($lat < $bbox[0] - 0.02 || $lat > $bbox[2] + 0.02 || $lon < $bbox[1] - 0.03 || $lon > $bbox[3] + 0.03) return [];
    $inBcp = ($grid === 'c') || sigpress_in_rings($lat, $lon, $A['bcp']);
    if (!$inBcp) {
        if (sigpress_in_rings($lat, $lon, $A['dorset']) || sigpress_in_rings($lat, $lon, $A['new_forest'])) return [];
        $dB = sigpress_dist_m($lat, $lon, $A['bcp']);
        if ($dB > 400 || $dB > sigpress_dist_m($lat, $lon, $A['dorset']) || $dB > sigpress_dist_m($lat, $lon, $A['new_forest'])) return [];
    }
    $town = null; $bestD = INF;
    foreach (['bournemouth', 'christchurch', 'poole'] as $t) {
        if (sigpress_in_rings($lat, $lon, $A[$t])) { $town = $t; break; }
        $d = sigpress_dist_m($lat, $lon, $A[$t]);
        if ($d < $bestD) { $bestD = $d; $town = $t; }
    }
    return ['bcp', $town];
}

function sigpress_median(array $a) {
    if (!$a) return null;
    sort($a); $n = count($a); $m = intdiv($n, 2);
    return $n % 2 ? $a[$m] : ($a[$m - 1] + $a[$m]) / 2;
}

/* the crowd map's own bands (build_extra.py: col()/band()): under 10 struggles, 10-25 fine for calls, 25+ great for working */
function sigpress_band($mbps): string { return $mbps >= 25 ? 'work' : ($mbps >= 10 ? 'calls' : 'struggles'); }

/**
 * $rows: the store (signal-check-data.json). $areasDoc: decoded signal-areas.json. $floor: callable grid -> readings
 * needed for a verified square. Returns ['areas' => [key => totals]] for bcp, bournemouth, christchurch, poole and all.
 */
function sigpress_summary(array $rows, array $areasDoc, callable $floor): array {
    $A = $areasDoc['areas'];
    $bbox = sigpress_bbox($A['bcp']);
    $tz = new DateTimeZone('Europe/London');
    $keys = ['all', 'bcp', 'bournemouth', 'christchurch', 'poole'];
    $acc = [];
    foreach ($keys as $k) {
        $acc[$k] = ['readings' => 0, 'outdoor' => 0, 'indoor' => 0, 'place_unrecorded' => 0,
                    'mobile_detected' => 0, 'mobile_confirmed' => 0, 'first' => null, 'last' => null, 'days' => [],
                    'time_of_day' => ['morning' => 0, 'afternoon' => 0, 'evening' => 0, 'night' => 0],
                    'weekday' => 0, 'weekend' => 0, 'cells' => []];
    }
    $memo = [];
    foreach ($rows as $r) {
        if (!isset($r['cla'], $r['clo'], $r['t'], $r['dl'])) continue;
        $g = $r['g'] ?? 'i';
        $ck = $g . ':' . $r['cla'] . ',' . $r['clo'];
        if (!isset($memo[$ck])) $memo[$ck] = sigpress_areas_of((float)$r['cla'], (float)$r['clo'], $g, $A, $bbox);
        $dt = (new DateTime('@' . (int)$r['t']))->setTimezone($tz);
        $day = $dt->format('Y-m-d'); $hour = (int)$dt->format('G'); $dow = (int)$dt->format('N');
        $tod = $hour < 6 ? 'night' : ($hour < 12 ? 'morning' : ($hour < 18 ? 'afternoon' : 'evening'));
        $place = $r['p'] ?? '';
        foreach (array_merge(['all'], $memo[$ck]) as $k) {
            $a = &$acc[$k];
            $a['readings']++;
            if ($place === 'out') $a['outdoor']++; elseif ($place === 'in') $a['indoor']++; else $a['place_unrecorded']++;
            if (($r['cs'] ?? 'c') === 'd') $a['mobile_detected']++; else $a['mobile_confirmed']++;
            if ($a['first'] === null || $r['t'] < $a['first']) $a['first'] = (int)$r['t'];
            if ($a['last'] === null || $r['t'] > $a['last']) $a['last'] = (int)$r['t'];
            $a['days'][$day] = true;
            $a['time_of_day'][$tod]++;
            if ($dow >= 6) $a['weekend']++; else $a['weekday']++;
            if (!isset($a['cells'][$ck])) $a['cells'][$ck] = ['g' => $g, 'all' => [], 'out' => []];
            $a['cells'][$ck]['all'][] = (float)$r['dl'];
            if ($place === 'out') $a['cells'][$ck]['out'][] = (float)$r['dl'];
            unset($a);
        }
    }
    $out = [];
    foreach ($keys as $k) {
        $a = $acc[$k];
        $sq = ['started' => count($a['cells']), 'seafront_grid' => 0, 'verified' => 0, 'verified_outdoor' => 0,
               'verified_by_band' => ['struggles' => 0, 'calls' => 0, 'work' => 0],
               'verified_outdoor_by_band' => ['struggles' => 0, 'calls' => 0, 'work' => 0]];
        foreach ($a['cells'] as $c) {
            if ($c['g'] === 'c') $sq['seafront_grid']++;
            $need = $floor($c['g']);
            if (count($c['all']) >= $need) { $sq['verified']++; $sq['verified_by_band'][sigpress_band(sigpress_median($c['all']))]++; }
            if (count($c['out']) >= $need) { $sq['verified_outdoor']++; $sq['verified_outdoor_by_band'][sigpress_band(sigpress_median($c['out']))]++; }
        }
        $fmt = function ($t) use ($tz) { return $t === null ? null : (new DateTime('@' . $t))->setTimezone($tz)->format('Y-m-d'); };
        $out[$k] = ['readings' => $a['readings'], 'outdoor' => $a['outdoor'], 'indoor' => $a['indoor'],
                    'place_unrecorded' => $a['place_unrecorded'], 'mobile_detected' => $a['mobile_detected'],
                    'mobile_confirmed' => $a['mobile_confirmed'], 'first_day' => $fmt($a['first']), 'last_day' => $fmt($a['last']),
                    'days_with_readings' => count($a['days']), 'time_of_day' => $a['time_of_day'],
                    'weekday' => $a['weekday'], 'weekend' => $a['weekend'], 'squares' => $sq];
    }
    return ['areas' => $out];
}
