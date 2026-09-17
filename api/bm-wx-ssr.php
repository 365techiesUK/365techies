<?php
/**
 * Server-rendered first paint for /bournemouth/weather/ (17 Sep 2026). Library only: included by
 * bournemouth/weather/index.php, never a URL (denied in .htaccess). No echo, no exit, no headers.
 *
 * WHY: the page drew every number with JavaScript, so anything reading the raw HTML - the ChatGPT, Claude and
 * Perplexity crawlers and their live page fetches, none of which run scripts - got "Loading the tide..." and no
 * tide time, sea temperature or forecast at all. index.php reads the built index.html and swaps each marked
 * skeleton (<!--ssr:NAME--> ... <!--/ssr:NAME-->) for these renders, from the same cron-filled stores that
 * /api/bm-wx.php serves. The page's JavaScript then redraws every block from the API exactly as before, so a person
 * with scripts sees no difference except real numbers instead of a shimmer while it loads.
 *
 * MIRRORS THE PAGE JS in bournemouth_weather_page.py - renderGlance, renderVitals (wind, sea, tide), groupTides,
 * evChip and renderTides: the same words, the same provenance labels (predicted tides never wear chip-m) and the
 * same freshness rules (airport report 90 min, buoy 3 h, pier gauge 20 min / 2 h). Change one, change the other:
 * D:\claude\tools\playwright-check\wxp-ssr-check.mjs compares this text with the script's for the same data.
 * Rounding copies JavaScript's toFixed and Math.round rather than PHP's round(), so a height never flips from 2.0
 * to 1.9 the moment the script takes over.
 *
 * Never fetches anything upstream - a page view only reads files. A block whose data is missing returns null and
 * keeps its skeleton; the script then says "not available" as it always did.
 */

function bmssr_get($a, $k) { return (is_array($a) && isset($a[$k])) ? $a[$k] : null; }
function bmssr_has($v) { return $v !== null && is_numeric($v); }
function bmssr_ts($iso) { if (is_int($iso)) return $iso; $t = strtotime((string)$iso); return $t ? $t : 0; }
function bmssr_hhmm($iso) { return date('H:i', bmssr_ts($iso)); }
function bmssr_ymd($ts) { return date('Y-m-d', $ts); }
function bmssr_esc($s) { return htmlspecialchars((string)$s, ENT_COMPAT, 'UTF-8'); }

/* Math.round */
function bmssr_round($v) { return (int)floor((float)$v + 0.5); }

/* Number.prototype.toFixed: rounded from the double's exact value, like sprintf - except that an exact tie (only
   values like 1.25 or 0.125 are exact) goes away from zero in JavaScript and to even in sprintf. */
function bmssr_fixed($v, $n) {
    $v = (float)$v;
    $a = abs($v);
    $q = $a * pow(2, $n + 1);
    $tie = ($q == floor($q)) && fmod($q, 2) == 1;
    return ($v < 0 ? '-' : '') . sprintf('%.' . $n . 'f', $tie ? $a + pow(10, -($n + 1)) : $a);
}

function bmssr_deg($t) { return bmssr_round($t) . "\u{00B0}"; }
function bmssr_mph($ms) { return bmssr_round($ms * 2.23694); }
function bmssr_ktmph($kt) { return bmssr_round($kt * 1.15078); }

function bmssr_compass($d) {
    if (!bmssr_has($d)) return '';
    $c = array('N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW');
    return $c[bmssr_round($d / 22.5) % 16];
}

function bmssr_ago($iso, $now) {
    $m = bmssr_round(($now - bmssr_ts($iso)) / 60);
    return $m < 1 ? 'just now' : ($m < 60 ? $m . ' min ago' : bmssr_round($m / 60) . ' h ago');
}

/* "Today", "Tomorrow", else the browser's en-GB short date - which writes September as "Sept" */
function bmssr_day_label($iso, $now) {
    $ts = bmssr_ts($iso);
    $d = bmssr_ymd($ts);
    if ($d === bmssr_ymd($now)) return 'Today';
    if ($d === bmssr_ymd($now + 86400)) return 'Tomorrow';
    $m = array('Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec');
    return date('D j ', $ts) . $m[(int)date('n', $ts) - 1];
}

/* MET Norway symbol code -> the page's words (JS kind() + words()) */
function bmssr_words($code) {
    $c = (string)$code;
    $parts = explode('_', $c);
    $base = $parts[0];
    $night = (bool)preg_match('/_night|_polartwilight/', $c);
    if (strpos($base, 'thunder') !== false) $k = 'thunder';
    elseif (strpos($base, 'snow') !== false) $k = 'snow';
    elseif (strpos($base, 'sleet') !== false) $k = 'sleet';
    elseif (strpos($base, 'rain') !== false) $k = strpos($base, 'showers') !== false ? 'showers' : 'rain';
    elseif ($base === 'fog') $k = 'fog';
    elseif ($base === 'cloudy') $k = 'cloudy';
    elseif ($base === 'partlycloudy') $k = 'partly';
    elseif ($base === 'fair') $k = 'fair';
    elseif ($base === 'clearsky') $k = 'clear';
    else $k = 'cloudy';
    $q = strpos($base, 'heavy') !== false ? 'Heavy ' : (strpos($base, 'light') !== false ? 'Light ' : '');
    switch ($k) {
        case 'clear': return $night ? 'Clear' : 'Sunny';
        case 'fair': return $night ? 'Mostly clear' : 'Mostly sunny';
        case 'partly': return $night ? 'Partly cloudy' : 'Sunny spells';
        case 'fog': return 'Fog';
        case 'rain': return $q ? $q . 'rain' : 'Rain';
        case 'showers': return $q ? $q . 'showers' : 'Showers';
        case 'sleet': return $q ? $q . 'sleet' : 'Sleet';
        case 'snow': return $q ? $q . 'snow' : 'Snow';
        case 'thunder': return 'Thundery rain';
    }
    return 'Cloudy';
}

/* Bournemouth beach faces the sea at about 160 degrees (SSE). Wind FROM the sea = onshore. */
function bmssr_shore($dir) {
    if (!bmssr_has($dir)) return null;
    $diff = abs(fmod($dir - 160 + 540, 360) - 180);
    return $diff <= 60 ? 'on' : ($diff >= 120 ? 'off' : 'cross');
}
function bmssr_shore_word($sh) { $w = array('on' => 'Onshore', 'off' => 'Offshore', 'cross' => 'Along the shore'); return isset($w[$sh]) ? $w[$sh] : ''; }
function bmssr_shore_col($sh) { $c = array('on' => '#7fd8a8', 'off' => '#ff9f5a', 'cross' => '#79b8ff'); return isset($c[$sh]) ? $c[$sh] : 'inherit'; }

/* the script swings its arrows into place; this one is drawn already pointing the right way */
function bmssr_arrow($d) {
    if (!bmssr_has($d)) return '';
    $rot = fmod($d + 180, 360);
    return '<svg class="wxp-arrow" viewBox="0 0 16 16" aria-hidden="true" data-rot="' . $rot . '" style="transform:rotate(' . $rot . 'deg)"><path d="M8 1 13 13 8 10 3 13z"/></svg>';
}

function bmssr_wind_words($dir, $sh) {
    return ($dir === null ? 'Variable' : 'From the ' . bmssr_compass($dir)) . ($sh ? ' &middot; ' . strtolower(bmssr_shore_word($sh)) : '');
}

function bmssr_obs_old($o, $now) { return !empty($o['stale']) || ($now - bmssr_ts($o['latest']['t'])) > 90 * 60; }

/* ---------------- the glance card: forecast for this hour + the airport's measured air ---------------- */
function bmssr_now($d, $now) {
    $f = $d['forecast'];
    $o = $d['obs'];
    if (empty($f['ok']) || empty($f['hours'])) return null;
    $obsLine = '';
    if (!empty($o['ok']) && isset($o['latest']) && bmssr_has(bmssr_get($o['latest'], 'temp'))) {
        $oo = bmssr_obs_old($o, $now);
        $obsLine = '<p class="wxp-sub wxp-obs"><span class="' . ($oo ? 'chip-f' : 'chip-m') . '">'
            . ($oo ? 'LAST HEARD ' . strtoupper(bmssr_ago($o['latest']['t'], $now)) : 'MEASURED ' . bmssr_hhmm($o['latest']['t']))
            . ' &middot; <span class="wxp-long">BOURNEMOUTH </span>AIRPORT</span><span><b>' . bmssr_deg($o['latest']['temp'])
            . '</b> in the air<span class="wxp-long">, 7 km inland</span></span></p>';
    }
    $h0 = $f['hours'][0];
    $t0 = isset($f['days'][0]) ? $f['days'][0] : null;
    $facts = array();
    if (bmssr_has(bmssr_get($h0, 'feels')) && abs($h0['feels'] - $h0['temp']) >= 1) $facts[] = 'Feels like <b>' . bmssr_deg($h0['feels']) . '</b>';
    $facts[] = (bmssr_has(bmssr_get($h0, 'rain')) && $h0['rain'] > 0) ? '<b>' . bmssr_fixed($h0['rain'], 1) . ' mm</b> of rain this hour' : '<b>Dry</b> this hour';
    if (bmssr_has(bmssr_get($h0, 'rh'))) $facts[] = 'Humidity <b>' . $h0['rh'] . '%</b>';
    if (bmssr_has(bmssr_get($h0, 'pres'))) $facts[] = 'Pressure <b>' . $h0['pres'] . ' hPa</b>';
    // an empty icon box the script's animated icon drops into, so nothing below it moves
    return '<span class="chip-f">FORECAST FOR ' . bmssr_hhmm($h0['t']) . ' &middot; MET NORWAY<span class="wxp-long"> &middot; ISSUED ' . bmssr_hhmm($f['issued']) . '</span>'
        . (!empty($f['stale']) ? ' &middot; OLDER THAN USUAL' : '') . '</span>'
        . '<div class="wxp-now-top"><svg class="wx-ic" viewBox="0 0 64 64" aria-hidden="true" focusable="false"></svg><div><p class="wxp-num">' . bmssr_deg($h0['temp'])
        . '</p><p class="wxp-now-w">' . bmssr_esc(bmssr_words(bmssr_get($h0, 'sym'))) . '</p></div></div>'
        . ($t0 ? '<p class="wxp-sub wxp-hilo">' . (!empty($t0['part']) ? 'Rest of today' : 'Today') . ' up to <b>' . bmssr_deg($t0['hi']) . '</b>, down to <b>' . bmssr_deg($t0['lo']) . '</b></p>' : '')
        . '<p class="wxp-sub">' . implode(' &middot; ', $facts) . '</p>' . $obsLine;
}

/* ---------------- the vitals (the sun one stays with the script: it is computed in the browser) ---------------- */
function bmssr_vital($id, $cls, $chip, $value, $cap, $go) {
    return '<span class="' . $cls . '" id="' . $id . '-chip">' . $chip . '</span><span class="v">' . $value . '</span><span class="c">' . $cap . '</span><span class="go">' . $go . ' &rarr;</span>';
}

function bmssr_wind($d, $now) {
    $o = $d['obs'];
    $f = $d['forecast'];
    if (!empty($o['ok']) && isset($o['latest']) && bmssr_has(bmssr_get($o['latest'], 'wspd'))) {
        $L = $o['latest'];
        $oo = bmssr_obs_old($o, $now);
        $calm = $L['wspd'] < 1;
        $wd = bmssr_get($L, 'wdir');
        $dir = ($calm || $wd === 'VRB' || !bmssr_has($wd)) ? null : (float)$wd;
        $sh = bmssr_shore($dir);
        return bmssr_vital('wxp-v-wind', $oo ? 'chip-f' : 'chip-m', $oo ? 'LAST HEARD ' . strtoupper(bmssr_ago($L['t'], $now)) : 'MEASURED ' . bmssr_hhmm($L['t']),
            $calm ? 'Calm' : (($dir === null ? '' : '<span class="wxp-sway" style="color:' . bmssr_shore_col($sh) . '">' . bmssr_arrow($dir) . '</span>') . bmssr_ktmph($L['wspd']) . ' mph'),
            ($calm ? 'Barely a breath of wind' : bmssr_wind_words($dir, $sh)) . '<br>Bournemouth Airport', 'Wind');
    }
    if (!empty($f['ok']) && !empty($f['hours']) && bmssr_has(bmssr_get($f['hours'][0], 'wind'))) {
        $h = $f['hours'][0];
        $dir = bmssr_has(bmssr_get($h, 'dir')) ? (float)$h['dir'] : null;
        $s2 = bmssr_shore($dir);
        return bmssr_vital('wxp-v-wind', 'chip-f', 'FORECAST ' . bmssr_hhmm($h['t']),
            '<span class="wxp-sway" style="color:' . bmssr_shore_col($s2) . '">' . bmssr_arrow($dir) . '</span>' . bmssr_mph($h['wind']) . ' mph',
            bmssr_wind_words($dir, $s2) . '<br>MET Norway, the pier', 'Wind');
    }
    return null;
}

function bmssr_sea_vital($d, $now) {
    $sea = $d['sea'];
    if (empty($sea['ok']) || !bmssr_has(bmssr_get($sea, 'tempC')) || !bmssr_has(bmssr_get($sea, 'hs'))) return null;
    $so = !empty($sea['stale']) || ($now - bmssr_ts(bmssr_get($sea, 'read_at'))) > 3 * 3600;
    return bmssr_vital('wxp-v-sea', $so ? 'chip-f' : 'chip-m', $so ? 'LAST HEARD ' . strtoupper(bmssr_ago(bmssr_get($sea, 'read_at'), $now)) : 'MEASURED ' . bmssr_hhmm($sea['read_at']),
        bmssr_fixed($sea['tempC'], 1) . "\u{00B0}C sea", 'Waves ' . bmssr_fixed($sea['hs'], 1) . ' m<br>' . bmssr_esc(bmssr_get($sea, 'station')), 'Sea &amp; beaches');
}

/* H, D, H -> one double high water */
function bmssr_group_tides($e) {
    $e = is_array($e) ? array_values($e) : array();
    $evs = array();
    $n = count($e);
    for ($i = 0; $i < $n; $i++) {
        if ($e[$i]['type'] === 'H' && isset($e[$i + 1], $e[$i + 2]) && $e[$i + 1]['type'] === 'D' && $e[$i + 2]['type'] === 'H') {
            $evs[] = array('type' => 'HH', 't' => $e[$i]['t'], 'h' => $e[$i]['h'], 't2' => $e[$i + 2]['t'], 'h2' => $e[$i + 2]['h']);
            $i += 2;
        } elseif ($e[$i]['type'] !== 'D') {
            $evs[] = $e[$i];
        }
    }
    return $evs;
}
function bmssr_ev_end($x) { return bmssr_ts($x['type'] === 'HH' ? $x['t2'] : $x['t']); }
function bmssr_upcoming($evs, $now) { $out = array(); foreach ($evs as $x) if (bmssr_ev_end($x) > $now) $out[] = $x; return $out; }

function bmssr_ev_chip($x) {
    if ($x['type'] === 'HH') {
        return '<span class="wxp-ev hi"><span class="wxp-long">High</span><span class="wxp-short">Double high</span> <span class="nw"><b>' . bmssr_hhmm($x['t']) . '</b> ' . bmssr_fixed($x['h'], 1)
            . 'm</span> &amp; <span class="nw"><b>' . bmssr_hhmm($x['t2']) . '</b> ' . bmssr_fixed($x['h2'], 1) . 'm</span> <small class="wxp-long">double high water</small></span>';
    }
    return '<span class="wxp-ev ' . ($x['type'] === 'H' ? 'hi' : 'lo') . '">' . ($x['type'] === 'H' ? 'High' : 'Low') . ' <span class="nw"><b>' . bmssr_hhmm($x['t']) . '</b> ' . bmssr_fixed($x['h'], 1) . 'm</span></span>';
}

function bmssr_tide_vital($d, $now) {
    $t = $d['tide'];
    if (empty($t['ok'])) return null;
    $next = bmssr_upcoming(bmssr_group_tides(bmssr_get($t, 'events')), $now);
    if (!$next) return null;
    $a = $next[0];
    $b2 = isset($next[1]) ? $next[1] : null;
    // a double high water keeps its second time in the caption, so the value never outgrows a phone-width button
    $cap = $a['type'] === 'HH' ? '&amp; ' . bmssr_hhmm($a['t2']) . ', double high &middot; ' . bmssr_fixed($a['h'], 1) . ' m'
        : bmssr_fixed($a['h'], 1) . ' m' . ($b2 ? ' &middot; then ' . ($b2['type'] === 'L' ? 'low ' : 'high ') . bmssr_hhmm($b2['t']) : '');
    return bmssr_vital('wxp-v-tide', 'chip-f', 'PREDICTED<span class="wxp-long"> &middot; PIER</span>', ($a['type'] === 'L' ? 'Low ' : 'High ') . bmssr_hhmm($a['t']), $cap . '<br>Not for navigation', 'All tides');
}

/* ---------------- the tides panel: gauge line, next two tides, the seven-day table, accuracy ---------------- */
function bmssr_tides($d, $now) {
    $t = $d['tide'];
    if (empty($t['ok']) || empty($t['events'])) return null;
    $out = array('tidechip' => 'PREDICTED &middot; CHECKED AGAINST THE PIER GAUGE');
    $evs = bmssr_group_tides($t['events']);

    $n = is_array(bmssr_get($t, 'now')) ? $t['now'] : array();
    $trend = bmssr_get($n, 'trend');
    $rising = $trend ? $trend === 'rising' : null;
    $res = bmssr_get($n, 'residual_cm');
    $resTxt = '';
    if (is_int($res) || is_float($res)) {
        $resTxt = abs($res) < 6 ? 'That is <b>right on the prediction</b>.' : 'That is <b>' . abs($res) . ' cm ' . ($res > 0 ? 'higher' : 'lower') . '</b> than predicted &mdash; weather at work.';
    }
    $mAt = bmssr_get($n, 'measured_at');
    $mOld = $mAt ? ($now - bmssr_ts($mAt)) > 20 * 60 : true;
    $mGone = $mAt ? ($now - bmssr_ts($mAt)) > 2 * 3600 : true;
    $meas = bmssr_get($n, 'measured');
    $out['tidenow'] = (is_int($meas) || is_float($meas))
        ? '<span class="' . ($mGone ? 'chip-f">LAST READING ' : 'chip-m">MEASURED ') . bmssr_hhmm($mAt) . ' &middot; PIER GAUGE</span> The sea ' . ($mOld ? 'was' : 'is') . ' at <b>' . bmssr_fixed($meas, 2) . ' m</b>'
            . ($trend === 'steady' ? ', steady' : ($rising === null ? '' : ' and <b>' . ($rising ? 'rising' : 'falling') . '</b>')) . '. ' . $resTxt
        : '<span class="chip-f">PIER GAUGE &middot; NOT REPORTING</span> The gauge isn&rsquo;t reporting just now, so the chart shows the prediction only.';

    $bits = array();
    foreach (array_slice(bmssr_upcoming($evs, $now), 0, 2) as $k => $x) {
        $bits[] = ($k ? 'Then ' : 'Next: ') . ($x['type'] === 'L' ? 'low water' : 'high water') . ' <b>'
            . ($x['type'] === 'HH' ? bmssr_hhmm($x['t']) . ' &amp; ' . bmssr_hhmm($x['t2']) : bmssr_hhmm($x['t'])) . '</b>' . ($x['type'] === 'HH' ? ' (double high water)' : '') . '.';
    }
    $out['tidenext'] = $bits ? '<span class="chip-f">PREDICTED &middot; PIER</span> ' . implode(' ', $bits) : '';

    // table: the next seven days; phones show three and a button
    $range = array();
    foreach ((array)bmssr_get($t, 'days') as $dd) if (isset($dd['d'])) $range[$dd['d']] = $dd;
    $byDay = array();
    $order = array();
    foreach ($evs as $x) {
        if (bmssr_ev_end($x) < $now - 3 * 3600) continue;
        $key = bmssr_ymd(bmssr_ts($x['t']));
        if (!isset($byDay[$key])) { $byDay[$key] = array('label' => bmssr_day_label($x['t'], $now), 'items' => array()); $order[] = $key; }
        $byDay[$key]['items'][] = $x;
    }
    $rows = '';
    foreach (array_slice($order, 0, 7) as $i => $key) {
        $day = $byDay[$key];
        $rg = isset($range[$key]) ? $range[$key] : null;
        $flat = $rg && $rg['range'] < 0.55;
        $rows .= '<li style="--i:' . $i . '" class="' . ($flat ? 'flat ' : '') . ($i >= 3 ? 'wxp-more' : '') . '"><h3>' . bmssr_esc($day['label'])
            . ($rg ? '<span>Rise &amp; fall ' . bmssr_fixed($rg['range'], 1) . ' m</span>' : '') . '</h3><div class="wxp-evs">'
            . ($flat ? '<span class="wxp-neap">Neap: the sea only moves between ' . bmssr_fixed($rg['lo'], 1) . ' and ' . bmssr_fixed($rg['hi'], 1) . ' m, so the times mean little &mdash; the curve is the better guide.</span>' : '')
            . implode('', array_map('bmssr_ev_chip', $day['items'])) . '</div></li>';
    }
    $out['tidetable'] = $rows;
    $cnt = count($order);
    $out['tidemore'] = '<button type="button" class="wxp-more-btn" id="wxp-tide-more" aria-expanded="false" aria-controls="wxp-tide-table"' . ($cnt > 3 ? '' : ' hidden') . '>'
        . ($cnt > 3 ? 'Show the next ' . (min($cnt, 7) - 3) . ' days' : 'Show the next 4 days') . '</button>';

    $a = bmssr_get($t, 'accuracy');
    if (is_array($a) && bmssr_has(bmssr_get($a, 'hw_time_median_min')) && bmssr_has(bmssr_get($a, 'hw_height_median_cm'))) {
        $out['tideaccsum'] = 'How accurate? Typically within <b>' . $a['hw_time_median_min'] . ' minutes</b> and <b>' . bmssr_round($a['hw_height_median_cm']) . ' cm</b>';
        $out['tideacc'] = 'We fitted the prediction without the ' . bmssr_esc(date('j F', bmssr_ts(bmssr_get($a, 'from')))) . '&ndash;' . bmssr_esc(date('j F', bmssr_ts(bmssr_get($a, 'to'))))
            . ' readings, then compared it with what the gauge measured over those days: high and low water times were typically within <b>' . $a['hw_time_median_min']
            . ' minutes</b>, and heights within <b>' . bmssr_round($a['hw_height_median_cm']) . ' cm</b> (' . bmssr_get($a, 'events_compared') . ' tides compared). ' . bmssr_esc(bmssr_get($t, 'method'));
    }
    return $out;
}

/* ---------------- stitching ---------------- */
function bmssr_swap($html, $name, $inner, &$hit) {
    $a = '<!--ssr:' . $name . '-->';
    $b = '<!--/ssr:' . $name . '-->';
    $i = strpos($html, $a);
    $j = $i === false ? false : strpos($html, $b, $i);
    if ($j === false) { $hit = 0; return $html; }
    $hit = 1;
    return substr($html, 0, $i + strlen($a)) . $inner . substr($html, $j);
}

function bmssr_mark($html, $needle) {
    $i = strpos($html, $needle);
    return $i === false ? $html : substr_replace($html, $needle . ' data-ssr', $i, strlen($needle));
}

/* Returns array(html, number of blocks filled). The caller serves the original file if this throws. */
function bmssr_page($html) {
    date_default_timezone_set('Europe/London');
    $now = time();
    $sea = bm_sea_public();
    $d = array(
        'forecast' => bm_weather_public(2),
        'obs' => bm_obs_public(),
        'tide' => bm_tide_public(isset($sea['tide']) ? $sea['tide'] : null),
        'sea' => isset($sea['sea']) ? $sea['sea'] : array(),
    );
    $parts = array(
        'now' => bmssr_now($d, $now),
        'wind' => bmssr_wind($d, $now),
        'sea' => bmssr_sea_vital($d, $now),
        'tide' => bmssr_tide_vital($d, $now),
    );
    $tides = bmssr_tides($d, $now);
    if (is_array($tides)) $parts = array_merge($parts, $tides);

    $done = 0;
    foreach ($parts as $name => $inner) {
        if ($inner === null) continue;
        $html = bmssr_swap($html, $name, $inner, $hit);
        $done += $hit;
    }
    // markers the page's no-JavaScript styles use to show the filled blocks instead of hiding the skeletons
    if ($parts['now'] !== null) $html = bmssr_mark($html, 'id="wxp-nowcard"');
    if ($parts['wind'] !== null || $parts['sea'] !== null || $parts['tide'] !== null) $html = bmssr_mark($html, 'id="wxp-vitals"');
    if ($done) {
        $html = bmssr_swap($html, 'noscript', '<noscript><p class="wxp-sub">Without JavaScript you see the readings as they stood when this page loaded. The charts, the 10-day forecast, radar and satellite need JavaScript.</p></noscript>', $hit);
    }
    return array($html, $done);
}
