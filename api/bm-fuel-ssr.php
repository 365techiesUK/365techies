<?php
/**
 * Today's fuel prices written into the fuel pages' HTML on the server (4 Oct 2026), for search engines and AI answer
 * engines that do not run JavaScript - the B365 weather page's pattern (api/bm-wx-ssr.php).
 *
 * WHY (SERP read, 4 Oct): searches like "average petrol price UK today", "cost to fill up a car / van / HGV" and
 * "cheapest area for fuel UK" were answered by news articles from 2022; even "fuel prices UK today" was summarised from
 * figures two months old. These pages hold today's prices from every UK forecourt - but only in JavaScript, which most
 * crawlers never see. Served through fuel-prices/index.php and bournemouth/fuel-prices/index.php.
 *
 * Fills, in the built index.html:
 *   <!--ssr:today-->   UK page: the four fuels, the four nations, the cheapest and dearest areas.
 *                      Bournemouth page: the cheapest in Bournemouth, Poole and Christchurch, against the UK.
 *   <!--ssr:fill-->    the "what it costs to fill up" rows (+ the line above the table), at the UK or local average
 *   meta description / og / twitter  - with today's figures;  "dateModified" - today
 * The vehicles and area names are read from the page's own data-vehicles / data-areas (fuel_finder_ui.py): one list.
 * Anything missing or failing leaves that part of the page as built; index.php serves the plain page on any error.
 */

function bmfssr_esc($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
function bmfssr_p($v) { return number_format((float)$v, 1) . 'p'; }
function bmfssr_gbp($pence, $litres) { return '&pound;' . number_format($pence * $litres / 100, 2); }

function bmfssr_attr($html, $name) {
    if (!preg_match('/' . preg_quote($name, '/') . '="([^"]*)"/', $html, $m)) return null;
    $v = json_decode(html_entity_decode($m[1], ENT_QUOTES, 'UTF-8'), true);
    return is_array($v) ? $v : null;
}

function bmfssr_fits($v, $f) {
    if ($v['fuel'] === 'any') return true;
    return $v['fuel'] === 'petrol' ? in_array($f, array('E10', 'E5'), true) : in_array($f, array('B7', 'SDV'), true);
}

/* The forecourts within $r miles of an exact point (server side: no rounding needed), cheapest first. */
function bmfssr_local($la, $lo, $r, $f) {
    $n = bm_fuel_near($la, $lo, $r, $f);
    if (empty($n['ok'])) return array();
    $out = array();
    foreach ($n['stations'] as $s) {
        if (!isset($s['p'][$f])) continue;
        $d = bmfuel_miles($la, $lo, $s['la'], $s['lo']);
        if ($d <= $r) $out[] = array($s['p'][$f], $d, $s);
    }
    usort($out, function ($a, $b) { return $a[0] == $b[0] ? ($a[1] < $b[1] ? -1 : 1) : ($a[0] < $b[0] ? -1 : 1); });
    return $out;
}

function bmfssr_med_of($list) { $v = array(); foreach ($list as $x) $v[] = $x[0]; return bmfuel_median($v); }

function bmfssr_station($s) {
    $a = explode(', ', (string)$s['a']);
    return bmfssr_esc($s['b']) . ', ' . bmfssr_esc(trim($a[0] . (count($a) > 1 && preg_match('/^\d/', $a[0]) ? '' : (isset($a[1]) ? ', ' . $a[1] : ''))));
}

function bmfssr_when($t) { return date('H:i', $t) . ' on ' . date('l j F Y', $t); }

/* When the forecourt set that price: a cheapest-in-the-country figure set weeks ago should say so. */
function bmfssr_set($s, $f) {
    if (empty($s['pt'][$f])) return '';
    $t = (int)$s['pt'][$f];
    return ', price set ' . (date('Y-m-d', $t) === date('Y-m-d') ? 'at ' . date('H:i', $t) . ' today' : date('j F', $t));
}

function bmfssr_fill_rows($vehicles, $e10, $b7) {
    $h = '';
    foreach ($vehicles as $v) {
        $c = function ($f, $p) use ($v) { return (bmfssr_fits($v, $f) && $p !== null) ? '<td>' . bmfssr_gbp($p, $v['l']) . '</td>' : '<td class="ff-na">&ndash;</td>'; };
        $h .= '<tr' . ($v['k'] === 'family' ? ' class="mine"' : '') . '><th scope="row">' . bmfssr_esc($v['name']) . '</th><td>' . (int)$v['l'] . '&nbsp;L</td>'
            . $c('E10', $e10) . $c('B7', $b7) . '</tr>';
    }
    return $h;
}

function bmfssr_fill_sub($e10, $b7, $where) {
    return '<p class="ff-note" id="ff-fill-sub" style="margin-top:0">A full tank from empty at the average price ' . $where . ': unleaded <b>'
        . ($e10 !== null ? bmfssr_p($e10) : 'not known') . '</b>, diesel <b>' . ($b7 !== null ? bmfssr_p($b7) : 'not known') . '</b> a litre.</p>';
}

/* ---------- the UK page ---------- */
function bmfssr_uk($stats, $meta, $areas) {
    $F = $stats['fuels']; $when = bmfssr_when($meta['fetched_at']);
    $name = array('E10' => 'Unleaded (E10)', 'B7' => 'Diesel (B7)', 'E5' => 'Super unleaded (E5)', 'SDV' => 'Premium diesel');
    $e = $F['E10']; $b = $F['B7'];
    $cheapE = isset($e['top'][0]) ? $e['top'][0] : null; $cheapB = isset($b['top'][0]) ? $b['top'][0] : null;
    $h = '<h2 id="ff-today-h">UK fuel prices today</h2>'
       . '<p class="ff-stamp">Updated ' . bmfssr_esc($when) . ' &middot; ' . number_format($meta['n']) . ' forecourts &middot; the government&rsquo;s Fuel Finder data</p>'
       . '<p>Across ' . number_format($e['uk']['n']) . ' UK forecourts reporting to the government&rsquo;s Fuel Finder service, the average (median) price of '
       . 'unleaded petrol at ' . date('H:i', $meta['fetched_at']) . ' today was <b>' . bmfssr_p($e['uk']['med']) . '</b> a litre and diesel <b>' . bmfssr_p($b['uk']['med']) . '</b>'
       . (isset($F['E5']) ? '; super unleaded averaged ' . bmfssr_p($F['E5']['uk']['med']) : '') . (isset($F['SDV']) ? ' and premium diesel ' . bmfssr_p($F['SDV']['uk']['med']) : '') . '.'
       . ($cheapE ? ' The cheapest unleaded in the UK was ' . bmfssr_p($cheapE['p']['E10']) . ' at ' . bmfssr_station($cheapE) . ' (' . ($cheapE['pc'] ? bmfssr_esc($cheapE['pc']) : '') . bmfssr_set($cheapE, 'E10') . ')' : '')
       . ($cheapB ? '; the cheapest diesel ' . bmfssr_p($cheapB['p']['B7']) . ' at ' . bmfssr_station($cheapB) . ' (' . ($cheapB['pc'] ? bmfssr_esc($cheapB['pc']) : '') . bmfssr_set($cheapB, 'B7') . ').' : '.')
       . '</p>';
    $h .= '<div class="ff-tablewrap"><table class="ff-table"><caption class="sr-only">UK average and cheapest fuel prices today</caption>'
        . '<thead><tr><th scope="col">Fuel</th><th scope="col">UK average</th><th scope="col">Cheapest</th><th scope="col">Forecourts</th></tr></thead><tbody>';
    foreach (array('E10', 'B7', 'E5', 'SDV') as $f) {
        if (!isset($F[$f])) continue;
        $h .= '<tr><th scope="row">' . $name[$f] . '</th><td>' . bmfssr_p($F[$f]['uk']['med']) . '</td><td>' . bmfssr_p($F[$f]['uk']['min']) . '</td><td>' . number_format($F[$f]['uk']['n']) . '</td></tr>';
    }
    $h .= '</tbody></table></div>';
    // the four nations
    $nat = array('E' => 'England', 'S' => 'Scotland', 'W' => 'Wales', 'N' => 'Northern Ireland');
    $h .= '<div class="ff-twocol"><div><h3>England, Scotland, Wales and Northern Ireland</h3><div class="ff-tablewrap"><table class="ff-table">'
        . '<thead><tr><th scope="col">Nation</th><th scope="col">Unleaded</th><th scope="col">Diesel</th></tr></thead><tbody>';
    foreach ($nat as $k => $label) {
        if (!isset($e['co'][$k]) && !isset($b['co'][$k])) continue;
        $h .= '<tr><th scope="row">' . $label . '</th><td>' . (isset($e['co'][$k]) ? bmfssr_p($e['co'][$k]['med']) : '&ndash;') . '</td><td>'
            . (isset($b['co'][$k]) ? bmfssr_p($b['co'][$k]['med']) : '&ndash;') . '</td></tr>';
    }
    $h .= '</tbody></table></div><p class="ff-note">Average (median) price a litre.</p></div>';
    // cheapest and dearest areas, unleaded
    $ar = $e['areas']; uasort($ar, function ($x, $y) { return $x[1] == $y[1] ? 0 : ($x[1] < $y[1] ? -1 : 1); });
    $keys = array_keys($ar);
    $row = function ($k) use ($ar, $areas) {
        return '<tr><th scope="row">' . bmfssr_esc((isset($areas[$k]) ? $areas[$k] : $k) . ' (' . $k . ')') . '</th><td>' . bmfssr_p($ar[$k][1]) . '</td><td>' . (int)$ar[$k][0] . '</td></tr>';
    };
    $h .= '<div><h3>Cheapest and dearest areas for unleaded</h3><div class="ff-tablewrap"><table class="ff-table">'
        . '<thead><tr><th scope="col">Postcode area</th><th scope="col">Average</th><th scope="col">Forecourts</th></tr></thead><tbody>';
    foreach (array_slice($keys, 0, 5) as $k) $h .= $row($k);
    $h .= '<tr><td colspan="3" class="ff-na">&hellip;</td></tr>';
    foreach (array_reverse(array_slice($keys, -5)) as $k) $h .= $row($k);
    $h .= '</tbody></table></div><p class="ff-note">Postcode areas with at least three forecourts reporting.</p></div></div>';
    $h .= '<p>Looking for Dorset? See <a href="/bournemouth/fuel-prices/">fuel prices in Bournemouth, Poole and Christchurch</a>.</p>';
    $desc = 'UK fuel prices today: unleaded averages ' . bmfssr_p($e['uk']['med']) . ' and diesel ' . bmfssr_p($b['uk']['med']) . ' a litre across '
          . number_format($e['uk']['n']) . ' forecourts. Find the cheapest near you, and what a tank costs for a car, van or HGV.';
    return array($h, $desc, $e['uk']['med'], $b['uk']['med'], 'across the UK');
}

/* ---------- the Bournemouth page ---------- */
function bmfssr_b365($stats, $meta) {
    $towns = array(array('Bournemouth', 50.7208, -1.8794), array('Poole', 50.7189, -1.9800), array('Christchurch', 50.7353, -1.7781));
    $F = $stats['fuels']; $when = bmfssr_when($meta['fetched_at']);
    $bmE = bmfssr_local(50.7208, -1.8794, 6, 'E10'); $bmB = bmfssr_local(50.7208, -1.8794, 6, 'B7');
    if (!$bmE || !$bmB) return null;
    $medE = bmfssr_med_of($bmE); $medB = bmfssr_med_of($bmB);
    $ukE = $F['E10']['uk']['med']; $ukB = $F['B7']['uk']['med'];
    $vs = function ($a, $u) { $d = round($a - $u, 1); return abs($d) < 0.05 ? 'the same as the UK average' : number_format(abs($d), 1) . 'p ' . ($d < 0 ? 'below' : 'above') . ' the UK average of ' . bmfssr_p($u); };
    $h = '<h2 id="ff-today-h">Fuel prices in Bournemouth, Poole and Christchurch today</h2>'
       . '<p class="ff-stamp">Updated ' . bmfssr_esc($when) . ' &middot; the government&rsquo;s Fuel Finder data</p>'
       . '<p>At ' . date('H:i', $meta['fetched_at']) . ' today the cheapest unleaded within six miles of Bournemouth town centre was <b>' . bmfssr_p($bmE[0][0]) . '</b> at '
       . bmfssr_station($bmE[0][2]) . ' (' . ltrim(bmfssr_set($bmE[0][2], 'E10'), ', ') . '), and the cheapest diesel <b>' . bmfssr_p($bmB[0][0]) . '</b> at '
       . bmfssr_station($bmB[0][2]) . ' (' . ltrim(bmfssr_set($bmB[0][2], 'B7'), ', ') . '). '
       . 'Across ' . count($bmE) . ' forecourts the average unleaded was ' . bmfssr_p($medE) . ', ' . $vs($medE, $ukE) . '; diesel averaged ' . bmfssr_p($medB) . ', ' . $vs($medB, $ukB) . '.</p>';
    $h .= '<div class="ff-tablewrap"><table class="ff-table"><caption class="sr-only">The cheapest fuel in Bournemouth, Poole and Christchurch today</caption>'
        . '<thead><tr><th scope="col">Within 3 miles of</th><th scope="col">Cheapest unleaded</th><th scope="col">Cheapest diesel</th></tr></thead><tbody>';
    foreach ($towns as $t) {
        $e = bmfssr_local($t[1], $t[2], 3, 'E10'); $b = bmfssr_local($t[1], $t[2], 3, 'B7');
        $cell = function ($x) { return $x ? '<td>' . bmfssr_p($x[0][0]) . '<small>' . bmfssr_station($x[0][2]) . '</small></td>' : '<td class="ff-na">&ndash;</td>'; };
        $h .= '<tr><th scope="row">' . $t[0] . ' town centre</th>' . $cell($e) . $cell($b) . '</tr>';
    }
    $h .= '</tbody></table></div>'
        . '<p>Prices for the rest of the country, the four nations and the cheapest areas are on our <a href="/fuel-prices/">UK fuel prices</a> page.</p>';
    $desc = 'Cheapest fuel in Bournemouth today: unleaded ' . bmfssr_p($bmE[0][0]) . ' at ' . $bmE[0][2]['b'] . ', diesel ' . bmfssr_p($bmB[0][0]) . ' at '
          . $bmB[0][2]['b'] . '. Live prices for Bournemouth, Poole and Christchurch, and what a tank costs.';
    return array($h, $desc, $medE, $medB, 'within six miles of Bournemouth town centre');
}

/* The whole page. Returns array(html, parts filled). */
function bmfssr_page($html) {
    $meta = bm_fuel_meta();
    if (empty($meta['ok']) || $meta['mode'] !== 'official') return array($html, 0);
    $stats = bm_fuel_stats();
    if (empty($stats['ok']) || empty($stats['fuels']['E10']) || empty($stats['fuels']['B7'])) return array($html, 0);
    $mode = preg_match('/data-mode="local"/', $html) ? 'local' : 'uk';
    $vehicles = bmfssr_attr($html, 'data-vehicles'); $areas = bmfssr_attr($html, 'data-areas');
    if (!$vehicles) return array($html, 0);
    $r = $mode === 'uk' ? bmfssr_uk($stats, $meta, $areas ?: array()) : bmfssr_b365($stats, $meta);
    if (!$r) return array($html, 0);
    list($today, $desc, $e10, $b7, $where) = $r;
    $n = 0;
    $html = str_replace('<!--ssr:today-->', $today, $html, $c); $n += $c;
    $html = str_replace('<!--ssr:fill-->', bmfssr_fill_rows($vehicles, $e10, $b7), $html, $c); $n += $c;
    $html = preg_replace('#<p class="ff-note" id="ff-fill-sub"[^>]*>.*?</p>#s', bmfssr_fill_sub($e10, $b7, $where), $html, 1, $c); $n += $c;
    $d = bmfssr_esc($desc);
    $html = preg_replace('#(<meta (?:name="description"|property="og:description"|name="twitter:description") content=")[^"]*(")#', '${1}' . $d . '${2}', $html);
    $html = preg_replace('#"dateModified": *"[^"]*"#', '"dateModified": "' . date('c', $meta['fetched_at']) . '"', $html);
    return array($html, $n);
}
