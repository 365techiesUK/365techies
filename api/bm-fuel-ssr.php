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
 *   <!--ssr:brands-->  which supermarket has the cheapest fuel: UK league / within 10 miles of Bournemouth (the section is
 *                      built hidden and shown only when filled)
 *   <!--ssr:trend-->   are fuel prices going up or down: the answer, the records and the tax share, from the government's
 *                      weekly series; then the chart (drawn by the script); then
 *   <!--ssr:trend2-->  our own day-on-day change from every forecourt, and the last eight weeks as a table
 *   meta description / og / twitter  - with today's figures;  "dateModified" - today
 * The vehicles and area names are read from the page's own data-vehicles / data-areas (fuel_finder_ui.py): one list.
 * Anything missing or failing leaves that part of the page as built; index.php serves the plain page on any error.
 */

function bmfssr_esc($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
function bmfssr_p($v) { return number_format((float)$v, 1) . 'p'; }
function bmfssr_gbp($pence, $litres) { return '&pound;' . number_format($pence * $litres / 100, 2); }
/* a small sum the way people say it: 83p, not £0.83 */
function bmfssr_say($pence, $litres) { $v = round($pence * $litres); return $v < 100 ? $v . 'p' : bmfssr_gbp($pence, $litres); }

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

/* ---------- which supermarket has the cheapest fuel (owner 4 Oct, "do two and three") ---------- */

function bmfssr_med($x, $f) { return isset($x[$f]) ? $x[$f][1] : null; }
function bmfssr_pc($v) { return $v === null ? '&ndash;' : bmfssr_p($v); }

/* "Tesco" / "Tesco and Asda" / "Tesco, Asda and Morrisons": every brand sharing the lowest median. */
function bmfssr_lowest($rows, $f) {
    $best = null; $who = array();
    foreach ($rows as $b => $x) {
        $m = bmfssr_med($x, $f);
        if ($m === null) continue;
        if ($best === null || $m < $best - 0.001) { $best = $m; $who = array($b); }
        elseif (abs($m - $best) < 0.001) $who[] = $b;
    }
    if ($best === null) return null;
    $last = array_pop($who);
    return array(($who ? implode(', ', $who) . ' and ' : '') . $last, $best, count($who) + 1);
}

function bmfssr_brand_rows($rows, $first) {
    $h = '';
    foreach ($rows as $b => $x) {
        $h .= '<tr><th scope="row">' . bmfssr_esc($b) . ($b === 'Costco' ? ' <small>members only</small>' : '') . '</th><td>' . bmfssr_pc(bmfssr_med($x, 'E10'))
            . '</td><td>' . bmfssr_pc(bmfssr_med($x, 'B7')) . '</td><td>' . number_format($x['n']) . '</td></tr>';
    }
    return '<div class="ff-tablewrap"><table class="ff-table"><thead><tr><th scope="col">' . $first . '</th><th scope="col">Unleaded</th><th scope="col">Diesel</th>'
         . '<th scope="col">Forecourts</th></tr></thead><tbody>' . $h . '</tbody></table></div>';
}

function bmfssr_by_e10($rows) {
    uasort($rows, function ($a, $b) {
        $x = bmfssr_med($a, 'E10'); $y = bmfssr_med($b, 'E10');
        if ($x === null || $y === null) return $x === null ? 1 : -1;
        return $x == $y ? $b['n'] - $a['n'] : ($x < $y ? -1 : 1);
    });
    return $rows;
}

/* The answer sentence, shared by both pages. $sup / $oth: brand rows; $gs / $go: the supermarkets together / the rest. */
function bmfssr_brand_answer($sup, $gs, $go, $where) {
    $big = $sup; unset($big['Costco']);
    $e = bmfssr_lowest($big, 'E10'); $d = bmfssr_lowest($big, 'B7');
    if (!$e) return '';
    $h = '<p class="ff-answer">' . ($e[2] > 1 ? $e[0] . ' share' : $e[0] . ' has') . ' the cheapest unleaded of the supermarkets ' . $where . ', at <b>' . bmfssr_p($e[1]) . '</b> a litre on average';
    if ($d) {
        if ($d[0] === $e[0]) $h .= ', and the cheapest diesel too at <b>' . bmfssr_p($d[1]) . '</b>';
        elseif ($d[2] > 1) $h .= '; for diesel, ' . $d[0] . ($d[2] === 2 ? ' both' : ' all') . ' average <b>' . bmfssr_p($d[1]) . '</b>';
        else $h .= '; for diesel it is ' . $d[0] . ' at <b>' . bmfssr_p($d[1]) . '</b>';
    }
    $h .= '.';
    if (isset($sup['Costco']) && bmfssr_med($sup['Costco'], 'E10') !== null && bmfssr_med($sup['Costco'], 'E10') < $e[1])
        $h .= ' Costco is cheaper still at ' . bmfssr_p(bmfssr_med($sup['Costco'], 'E10')) . ', but only for members.';
    $se = bmfssr_med($gs, 'E10'); $oe = bmfssr_med($go, 'E10');
    if ($se !== null && $oe !== null) {
        $gap = round($oe - $se, 1);
        $h .= ' Taken together, supermarket forecourts average ' . bmfssr_p($se) . ' for unleaded against ' . bmfssr_p($oe) . ' everywhere else'
            . ($gap >= 0.1 ? ': ' . number_format($gap, 1) . 'p a litre, or ' . bmfssr_say($gap, 55) . ' on a 55-litre family car tank.' : '.');
    }
    return $h . '</p>';
}

function bmfssr_brands_uk($stats) {
    if (empty($stats['brands']) || empty($stats['groups']['super']) || empty($stats['groups']['other'])) return null;
    $sup = array(); $oth = array();
    foreach ($stats['brands'] as $b => $x) {
        if (!empty($x['super'])) $sup[$b] = $x; elseif ($x['n'] >= 50) $oth[$b] = $x;
    }
    if (count($sup) < 3) return null;
    $sup = bmfssr_by_e10($sup); $oth = array_slice(bmfssr_by_e10($oth), 0, 10, true);
    $gs = $stats['groups']['super']; $go = $stats['groups']['other'];
    $h = '<h2 id="ff-brands-h">Which supermarket has the cheapest fuel?</h2>'
       . bmfssr_brand_answer($sup, $gs, $go, 'across the UK today')
       . bmfssr_brand_rows($sup, 'Supermarket')
       . ($oth ? '<h3>Against the big fuel brands</h3>' . bmfssr_brand_rows($oth, 'Brand') : '')
       . '<p class="ff-note">Average (median) price a litre at each brand&rsquo;s UK forecourts reporting to the government&rsquo;s Fuel Finder service today; '
       . 'brands with 50 or more forecourts. A brand&rsquo;s forecourts are often run by different companies, so prices vary from one to the next: the finder above shows each one.</p>';
    return $h;
}

function bmfssr_brands_local($la, $lo, $r, $place) {
    $by = array(); $grp = array('super' => array(), 'other' => array());
    foreach (array('E10', 'B7') as $f) {
        foreach (bmfssr_local($la, $lo, $r, $f) as $x) {
            $b = $x[2]['b']; $by[$b][$f][] = $x[0]; $by[$b]['ids'][$x[2]['id']] = true;
            $grp[bmfuel_is_super($b) ? 'super' : 'other'][$f][] = $x[0];
        }
    }
    $sup = array(); $oth = array();
    foreach ($by as $b => $v) {
        $x = array('n' => count($v['ids']));
        foreach (array('E10', 'B7') as $f) if (!empty($v[$f])) $x[$f] = array(count($v[$f]), bmfuel_median($v[$f]), min($v[$f]));
        if (bmfuel_is_super($b)) $sup[$b] = $x; elseif ($x['n'] >= 2) $oth[$b] = $x;
    }
    if (count($sup) < 2) return null;
    $g = function ($a) { $o = array(); foreach ($a as $f => $v) $o[$f] = array(count($v), bmfuel_median($v), min($v)); return $o; };
    $h = '<h2 id="ff-brands-h">Which supermarket has the cheapest fuel around ' . $place . '?</h2>'
       . bmfssr_brand_answer(bmfssr_by_e10($sup), $g($grp['super']), $g($grp['other']), 'within ' . $r . ' miles of ' . $place . ' town centre today')
       . bmfssr_brand_rows(bmfssr_by_e10($sup), 'Supermarket')
       . ($oth ? '<h3>Against the other brands nearby</h3>' . bmfssr_brand_rows(bmfssr_by_e10($oth), 'Brand') : '')
       . '<p class="ff-note">Average (median) price a litre at each brand&rsquo;s forecourts within ' . $r . ' miles of ' . $place . ' town centre; other brands with two or more forecourts here. '
       . 'The UK league is on our <a href="/fuel-prices/#ff-brands-sec">UK fuel prices</a> page.</p>';
    return $h;
}

/* ---------- are fuel prices going up or down ---------- */

function bmfssr_day($ymd, $year = true) { $t = strtotime($ymd . ' 12:00'); return date($year ? 'j F Y' : 'j F', $t); }
function bmfssr_chg($d) { $d = round($d, 2); return abs($d) < 0.005 ? 'unchanged' : ($d > 0 ? 'up ' : 'down ') . number_format(abs($d), 2) . 'p'; }
function bmfssr_way($d) { return abs($d) < 0.005 ? 'flat' : ($d > 0 ? 'up' : 'down'); }

/* weekly rises (or falls) in a row, counting back from the latest week */
function bmfssr_streak($rows, $i) {
    $n = count($rows); $dir = 0; $k = 0;
    for ($j = $n - 1; $j > 0; $j--) {
        $d = $rows[$j][$i] - $rows[$j - 1][$i];
        $s = $d > 0.004 ? 1 : ($d < -0.004 ? -1 : 0);
        if ($s === 0 || ($dir && $s !== $dir)) break;
        $dir = $s; $k++;
    }
    return array($dir, $k);
}

function bmfssr_ord($n) { $w = array(2 => 'second', 3 => 'third', 4 => 'fourth', 5 => 'fifth', 6 => 'sixth', 7 => 'seventh', 8 => 'eighth', 9 => 'ninth', 10 => 'tenth'); return isset($w[$n]) ? $w[$n] : $n . 'th'; }

function bmfssr_trend($stats, $mode) {
    $t = bm_fuel_trend();
    if (empty($t['ok']) || count($t['weeks']) < 60) return null;
    $w = $t['weeks']; $n = count($w); $L = $w[$n - 1]; $P = $w[$n - 2]; $F = $w[$n - 5]; $Y = $w[$n - 53];
    $du = $L[1] - $P[1]; $dd = $L[2] - $P[2];
    if (bmfssr_way($du) === bmfssr_way($dd)) {
        $lead = array('up' => 'Fuel prices are going up.', 'down' => 'Fuel prices are coming down.', 'flat' => 'Fuel prices held steady this week.');
        $lead = $lead[bmfssr_way($du)];
    } else {
        $say = array('up' => 'going up', 'down' => 'coming down', 'flat' => 'holding steady');
        $lead = 'Petrol is ' . $say[bmfssr_way($du)] . ' and diesel ' . $say[bmfssr_way($dd)] . '.';
    }
    list($sdir, $sk) = bmfssr_streak($w, 1);
    $run = ($sk >= 2) ? ' &mdash; the ' . bmfssr_ord($sk) . ' weekly ' . ($sdir > 0 ? 'rise' : 'fall') . ' in a row' : '';
    $h = '<p class="ff-answer"><b>' . $lead . '</b> The government&rsquo;s weekly UK average for unleaded petrol was <b>' . bmfssr_p2($L[1]) . '</b> a litre in the week of '
       . bmfssr_day($L[0]) . ', ' . bmfssr_chg($du) . ' on the week before and ' . bmfssr_chg($L[1] - $F[1]) . ' in four weeks' . $run . '. Diesel was <b>' . bmfssr_p2($L[2])
       . '</b>, ' . bmfssr_chg($dd) . ' on the week and ' . bmfssr_chg($L[2] - $F[2]) . ' in four weeks. A year earlier (week of ' . bmfssr_day($Y[0]) . ') petrol was '
       . bmfssr_p2($Y[1]) . ' and diesel ' . bmfssr_p2($Y[2]) . '.</p>';
    // the records, from the whole series (it starts in June 2003)
    $mu = $w[0]; $md = $w[0];
    foreach ($w as $r) { if ($r[1] > $mu[1]) $mu = $r; if ($r[2] > $md[2]) $md = $r; }
    $rec = function ($m, $i, $what) use ($L) {
        if ($m[0] === $L[0]) return 'This week&rsquo;s ' . $what . ' price is the highest on record.';
        return 'The record for ' . $what . ' is ' . bmfssr_p2($m[$i]) . ' (week of ' . bmfssr_day($m[0]) . '); this week is ' . number_format($m[$i] - $L[$i], 2) . 'p below it.';
    };
    $h .= '<p>' . $rec($mu, 1, 'petrol') . ' ' . $rec($md, 2, 'diesel') . ' The government&rsquo;s weekly figures go back to June 2003.';
    if (!empty($t['tax']) && $t['tax'][0] === $L[0]) {
        $vat = $L[1] * $t['tax'][3] / (100 + $t['tax'][3]); $tax = $t['tax'][1] + $vat;
        $h .= ' Of this week&rsquo;s ' . bmfssr_p2($L[1]) . ' for petrol, ' . bmfssr_p2($t['tax'][1]) . ' is fuel duty and ' . bmfssr_p2($vat) . ' is VAT: <b>'
            . round($tax / $L[1] * 100) . '% tax</b>.';
    }
    $h .= '</p>';
    $top = $h; $h = '';
    // our own daily figures from every forecourt, once there are two days to compare
    $days = $t['days']; $k = count($days);
    if ($k >= 2) {
        $a = $days[$k - 1]; $b = $days[$k - 2]; $i = $mode === 'local' ? 3 : 1;
        if ($a[$i] !== null && $b[$i] !== null && $a[$i + 1] !== null && $b[$i + 1] !== null) {
            $h .= '<p>Day by day, across every forecourt ' . ($mode === 'local' ? 'within six miles of Bournemouth town centre' : 'in the UK')
                . ' (our own record from the Fuel Finder data, kept since 4 October 2026): unleaded ' . bmfssr_p($a[$i]) . ', ' . bmfssr_chg1($a[$i] - $b[$i])
                . ' since ' . bmfssr_day($b[0], false) . ', and diesel ' . bmfssr_p($a[$i + 1]) . ', ' . bmfssr_chg1($a[$i + 1] - $b[$i + 1]) . '.</p>';
        }
    }
    // the last eight weeks, as a table
    $h .= '<div class="ff-tablewrap"><table class="ff-table ff-weeks"><caption class="sr-only">UK average pump prices, the last eight weeks</caption>'
        . '<thead><tr><th scope="col">Week of</th><th scope="col">Unleaded</th><th scope="col">Diesel</th></tr></thead><tbody>';
    for ($j = $n - 1; $j >= $n - 8; $j--) {
        $c = function ($i) use ($w, $j) { $d = round($w[$j][$i] - $w[$j - 1][$i], 2); return '<small class="' . ($d > 0 ? 'up' : ($d < 0 ? 'dn' : '')) . '">' . ($d > 0 ? '+' : ($d < 0 ? '&minus;' : '&plusmn;')) . number_format(abs($d), 2) . '</small>'; };
        $h .= '<tr><th scope="row">' . bmfssr_day($w[$j][0]) . '</th><td>' . bmfssr_p2($w[$j][1]) . ' ' . $c(1) . '</td><td>' . bmfssr_p2($w[$j][2]) . ' ' . $c(2) . '</td></tr>';
    }
    $h .= '</tbody></table></div>'
        . '<p class="ff-note">Weekly figures: the average UK pump price including duty and VAT, from the Department for Energy Security and Net Zero&rsquo;s '
        . '<a href="https://www.gov.uk/government/statistics/weekly-road-fuel-prices" rel="noopener">Weekly road fuel prices</a>'
        . (!empty($t['published']) ? ' (published ' . date('j F Y', strtotime($t['published'])) . ')' : '') . ', Open Government Licence. New figures come out every Tuesday.</p>';
    return array($top, $h);
}
function bmfssr_p2($v) { return number_format((float)$v, 2) . 'p'; }
function bmfssr_chg1($d) { $d = round($d, 1); return abs($d) < 0.05 ? 'unchanged' : ($d > 0 ? 'up ' : 'down ') . number_format(abs($d), 1) . 'p'; }

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
    // supermarkets: the section stays hidden unless there is something to put in it
    $br = $mode === 'uk' ? bmfssr_brands_uk($stats) : bmfssr_brands_local(50.7208, -1.8794, 10, 'Bournemouth');
    if ($br) {
        $html = str_replace('<!--ssr:brands-->', $br, $html, $c); $n += $c;
        $html = str_replace('id="ff-brands-sec" hidden', 'id="ff-brands-sec"', $html);
    }
    $tr = bmfssr_trend($stats, $mode);
    if ($tr) {
        $html = str_replace('<!--ssr:trend-->', $tr[0], $html, $c); $n += $c;
        $html = str_replace('<!--ssr:trend2-->', $tr[1], $html, $c); $n += $c;
    }
    $d = bmfssr_esc($desc);
    $html = preg_replace('#(<meta (?:name="description"|property="og:description"|name="twitter:description") content=")[^"]*(")#', '${1}' . $d . '${2}', $html);
    $html = preg_replace('#"dateModified": *"[^"]*"#', '"dateModified": "' . date('c', $meta['fetched_at']) . '"', $html);
    return array($html, $n);
}
