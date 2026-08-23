<?php
/**
 * signal-export.php - the crowd signal store as open data.
 *
 * VERIFIED SQUARES ONLY, as CSV: every row is a median that meets the same
 * floor the site itself publishes at (8 readings inland, 5 on the finer
 * seafront grid). Cell centres only - real coordinates never reach the store
 * (see signal-check.php). NO per-network figures, ever: this file is the
 * citable dataset, and a network column here would build the league table
 * we refuse to build. Licence: CC BY 4.0, credit 365 Techies.
 *
 * Kept standalone on purpose: including signal-check.php would run its
 * router. The four constants below MUST stay in step with it.
 */
const DATA_FILE   = __DIR__ . '/signal-check-data.json';   // gitignored, server-only
const PLACES_FILE = __DIR__ . '/../signal-places.json';    // built by refresh_signal_areas.py
const MIN_INLAND  = 8;     // = MIN_FOR_COMPARE in signal-check.php
const MIN_COAST   = 5;     // = COAST_MIN       in signal-check.php

header('Content-Type: text/csv; charset=UTF-8');
header('Content-Disposition: inline; filename="365techies-mobile-signal-verified-squares.csv"');
header('Cache-Control: no-store');                 // SiteGround's proxy held un-versioned files for a month
header('Access-Control-Allow-Origin: *');          // a dataset that can't be fetched isn't open

function median_of(array $a) {
    sort($a); $n = count($a); $m = intdiv($n, 2);
    return $n % 2 ? $a[$m] : ($a[$m - 1] + $a[$m]) / 2;
}

$rows = is_file(DATA_FILE) ? (json_decode((string)file_get_contents(DATA_FILE), true) ?: []) : [];
$places = is_file(PLACES_FILE) ? ((json_decode((string)file_get_contents(PLACES_FILE), true)['places'] ?? [])) : [];

$cells = [];
foreach ($rows as $r) {
    if (!isset($r['cla'], $r['clo'], $r['dl'])) continue;
    $g = $r['g'] ?? 'i';
    $k = $g . ':' . $r['cla'] . ',' . $r['clo'];
    $cells[$k]['lat'] = (float)$r['cla']; $cells[$k]['lon'] = (float)$r['clo']; $cells[$k]['g'] = $g;
    $cells[$k]['dl'][] = (float)$r['dl'];
    $t = (int)($r['t'] ?? 0);
    if ($t && (!isset($cells[$k]['t0']) || $t < $cells[$k]['t0'])) $cells[$k]['t0'] = $t;
}

$out = fopen('php://output', 'w');
fputcsv($out, ['cell_lat', 'cell_lon', 'grid', 'cell_size_m', 'readings',
               'median_download_mbps', 'place', 'first_reading_utc', 'snapshot_utc']);
$snap = gmdate('Y-m-d\TH:i:s\Z');
ksort($cells);
foreach ($cells as $c) {
    $n = count($c['dl']);
    if ($n < ($c['g'] === 'c' ? MIN_COAST : MIN_INLAND)) continue;   // verified only
    $key = sprintf('%.4f,%.4f', $c['lat'], $c['lon']);
    fputcsv($out, [sprintf('%.4f', $c['lat']), sprintf('%.4f', $c['lon']),
                   $c['g'] === 'c' ? 'seafront_140m' : 'inland_500m',
                   $c['g'] === 'c' ? 140 : 550, $n, round(median_of($c['dl']), 1),
                   $places[$key] ?? '', isset($c['t0']) ? gmdate('Y-m-d', $c['t0']) : '', $snap]);
}
fclose($out);
