<?php
/**
 * Solar-forecast maths for the off-grid dashboard (api/vrm-weather.php). Library only - include, never a URL
 * (denied in .htaccess). Pure functions except vw_power_fetch(), which is the one network call.
 *
 * WHY (17 Sep 2026): the dashboard used Open-Meteo's free API, which is for non-commercial use only, for its
 * forecast AND its sunshine figures. MET Norway (CC BY 4.0, commercial use allowed) replaced the forecast, but it
 * publishes no solar radiation - so the day's sunshine is ESTIMATED here, and the page says so:
 *   1. clear-sky sunshine from the sun's position (NOAA solar geometry + Haurwitz 1945);
 *   2. scaled to NASA POWER's own clear-sky figures for the spot (Haurwitz ran ~11% high in Bournemouth: 7.11 vs
 *      6.25 kWh/m2 on 15 Aug 2026, 6.65 vs 6.09 on 23 Aug, 6.35 vs 5.73 on 28 Aug);
 *   3. reduced by MET Norway's forecast total cloud cover with Kasten & Czeplak (1980, Solar Energy 24:177):
 *      sunshine = clear sky x (1 - 0.75 x cloud^3.4), a quarter of clear sky under full cloud. Chosen over the
 *      linear pvlib model on evidence (17 Sep 2026): against the Open-Meteo figures the old feed served that morning,
 *      Kasten-Czeplak came to 98% over the 7 days and linear to 76%; and NASA POWER's recorded sunshine in Bournemouth
 *      averaged ~73% of clear sky over the previous month, which ~70% cloud gives under Kasten-Czeplak (78%) but not
 *      linear (55%). Single days still differ by a fair margin either way - the page says it is an estimate.
 * The page turns sunshine into kWh with the van's OWN factor: its real daily yield from VRM divided by NASA POWER's
 * recorded all-sky sunshine on the same dates. NASA POWER: public, no key, no use restrictions, about 5 days behind.
 */

/* cosine of the solar zenith angle at unix time $t (NOAA general solar position, well under a degree) */
function vw_sun_cosz($t, $lat, $lon) {
    $doy = (int)gmdate('z', $t) + 1;
    $hour = (int)gmdate('G', $t) + (int)gmdate('i', $t) / 60 + (int)gmdate('s', $t) / 3600;
    $g = 2 * M_PI / 365 * ($doy - 1 + ($hour - 12) / 24);
    $eot = 229.18 * (0.000075 + 0.001868 * cos($g) - 0.032077 * sin($g) - 0.014615 * cos(2 * $g) - 0.040849 * sin(2 * $g));
    $decl = 0.006918 - 0.399912 * cos($g) + 0.070257 * sin($g) - 0.006758 * cos(2 * $g) + 0.000907 * sin(2 * $g)
          - 0.002697 * cos(3 * $g) + 0.00148 * sin(3 * $g);
    $ha = deg2rad(($hour * 60 + $eot + 4 * $lon) / 4 - 180);
    $la = deg2rad($lat);
    return sin($la) * sin($decl) + cos($la) * cos($decl) * cos($ha);
}

/* Haurwitz clear-sky global horizontal irradiance, W/m2 */
function vw_clear_ghi($cz) { return $cz <= 0 ? 0.0 : 1098 * $cz * exp(-0.057 / $cz); }

/* model clear-sky total for the local calendar day starting at $t0 (unix), kWh/m2, 10-minute steps */
function vw_clear_day_kwh($t0, $t1, $lat, $lon) {
    $wh = 0.0;
    for ($t = $t0; $t < $t1; $t += 600) $wh += vw_clear_ghi(vw_sun_cosz($t + 300, $lat, $lon)) / 6;
    return $wh / 1000;
}

/* cloud cover points [unix, percent] from a bmwx_parse()-shaped model (hourly steps, then 6-hourly), sorted */
function vw_cloud_points($model) {
    $pts = array();
    foreach (array('hours', 'six') as $k) {
        foreach ((array)(isset($model[$k]) ? $model[$k] : array()) as $s) {
            if (!isset($s['t'], $s['cloud']) || $s['cloud'] === null) continue;
            $t = strtotime($s['t']);
            if ($t) $pts[$t] = array($t, max(0.0, min(100.0, (float)$s['cloud'])));
        }
    }
    ksort($pts);
    return array_values($pts);
}

/* cloud cover at $t: straight line between the forecast's instants; before the first or after the last, the nearest */
function vw_cloud_at($pts, $t) {
    $n = count($pts);
    if (!$n) return null;
    if ($t <= $pts[0][0]) return $pts[0][1];
    if ($t >= $pts[$n - 1][0]) return $pts[$n - 1][1];
    for ($i = 1; $i < $n; $i++) {
        if ($t <= $pts[$i][0]) {
            $a = $pts[$i - 1]; $b = $pts[$i];
            return $a[1] + ($b[1] - $a[1]) * ($t - $a[0]) / max(1, $b[0] - $a[0]);
        }
    }
    return $pts[$n - 1][1];
}

/* estimated sunshine for a local day, MJ/m2: clear sky x scale x Kasten-Czeplak cloud factor */
function vw_day_mj($t0, $t1, $lat, $lon, $pts, $scale) {
    $j = 0.0;
    for ($t = $t0; $t < $t1; $t += 600) {
        $mid = $t + 300;
        $cz = vw_sun_cosz($mid, $lat, $lon);
        if ($cz <= 0) continue;
        $cc = vw_cloud_at($pts, $mid);
        if ($cc === null) return null;
        $j += vw_clear_ghi($cz) * $scale * (1 - 0.75 * pow($cc / 100, 3.4)) * 600;
    }
    return round($j / 1e6, 1);
}

/* NASA POWER daily sunshine, rows[Y-m-d] = array(all-sky kWh/m2 or null, clear-sky kWh/m2 or null) */
function vw_power_fetch($lat, $lon, $days, $ua) {
    $end = new DateTime('now', new DateTimeZone('Europe/London'));
    $start = clone $end; $start->modify('-' . (int)$days . ' days');
    $url = 'https://power.larc.nasa.gov/api/temporal/daily/point?parameters=ALLSKY_SFC_SW_DWN,CLRSKY_SFC_SW_DWN&community=RE'
         . '&longitude=' . $lon . '&latitude=' . $lat . '&start=' . $start->format('Ymd') . '&end=' . $end->format('Ymd') . '&format=JSON';
    $ch = curl_init($url);
    curl_setopt_array($ch, array(CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 25, CURLOPT_CONNECTTIMEOUT => 8,
        CURLOPT_PROTOCOLS => CURLPROTO_HTTPS, CURLOPT_USERAGENT => $ua, CURLOPT_ENCODING => ''));
    $body = curl_exec($ch);
    curl_close($ch);
    return vw_power_rows($body ? json_decode($body, true) : null);
}
function vw_power_rows($j) {
    if (!isset($j['properties']['parameter']['ALLSKY_SFC_SW_DWN']) || !is_array($j['properties']['parameter']['ALLSKY_SFC_SW_DWN'])) return null;
    $p = $j['properties']['parameter'];
    $rows = array();
    foreach ($p['ALLSKY_SFC_SW_DWN'] as $k => $v) {
        if (!preg_match('/^(\d{4})(\d{2})(\d{2})$/', (string)$k, $m)) continue;
        $c = isset($p['CLRSKY_SFC_SW_DWN'][$k]) ? $p['CLRSKY_SFC_SW_DWN'][$k] : -999;
        $rows[$m[1] . '-' . $m[2] . '-' . $m[3]] = array($v >= 0 ? (float)$v : null, $c >= 0 ? (float)$c : null);
    }
    return $rows;
}

/* how much to scale the Haurwitz clear sky: NASA POWER clear sky / ours, median over the days it published */
function vw_clear_scale($rows, $lat, $lon) {
    $tz = new DateTimeZone('Europe/London');
    $r = array();
    foreach ((array)$rows as $d => $v) {
        if ($v[1] === null) continue;
        $a = new DateTime($d . ' 00:00:00', $tz); $b = clone $a; $b->modify('+1 day');
        $m = vw_clear_day_kwh($a->getTimestamp(), $b->getTimestamp(), $lat, $lon);
        if ($m > 0.5) $r[] = $v[1] / $m;
    }
    if (count($r) < 2) return 0.9;   // about what it measured in Bournemouth, Aug 2026
    sort($r);
    $mid = $r[(int)floor((count($r) - 1) / 2)];
    return max(0.75, min(1.05, $mid));
}

/* the days the page draws: 7 local days from today, each with its estimated sunshine */
function vw_days($model, $lat, $lon, $scale, $now) {
    $tz = new DateTimeZone('Europe/London');
    $pts = vw_cloud_points($model);
    $today = (new DateTime('@' . $now))->setTimezone($tz)->format('Y-m-d');
    $out = array();
    foreach ((array)$model['days'] as $D) {
        if (!isset($D['d']) || $D['d'] < $today) continue;
        $a = new DateTime($D['d'] . ' 00:00:00', $tz); $b = clone $a; $b->modify('+1 day');
        $out[] = array(
            'd' => $D['d'],
            'part' => !empty($D['part']),
            // rounded the way the weather page rounds (Math.round), so the two pages print the same number
            'tmax' => isset($D['hi']) ? (int)floor((float)$D['hi'] + 0.5) : null,
            'tmin' => isset($D['lo']) ? (int)floor((float)$D['lo'] + 0.5) : null,
            'sym' => isset($D['sym']) ? (string)$D['sym'] : '',
            'rad' => count($pts) ? vw_day_mj($a->getTimestamp(), $b->getTimestamp(), $lat, $lon, $pts, $scale) : null,
        );
        if (count($out) >= 7) break;
    }
    return $out;
}
