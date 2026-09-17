<?php
/**
 * Server-rendered first paint for /bournemouth/sunrise-sunset/ (17 Sep 2026). Library only: included by
 * bournemouth/sunrise-sunset/index.php, never a URL (denied in .htaccess). No echo, no exit, no headers.
 *
 * WHY: the page computed today's sunrise and sunset in the browser, so anything reading the raw HTML - Google's
 * first pass, the ChatGPT, Claude and Perplexity fetchers - got a dash where the answer should be. This writes the
 * same times into the HTML on the server, and dates the FAQ answer "What time is sunset in Bournemouth today?".
 *
 * MIRRORS THE PAGE SCRIPT in bournemouth_data.py (_SS_PANEL, sunUT): the same sunrise equation, the same seafront
 * point, the same UK calendar date, minutes rounded like Math.round. Change one, change the other:
 * D:\claude\tools\playwright-check\sun-ssr-check.mjs compares this text with the script's.
 *
 * Pure arithmetic: reads no file and fetches nothing, so it cannot go stale or fail on a missing store.
 * Uses bmssr_swap, bmssr_prefix_anchor and bmssr_round from bm-wx-ssr.php, which index.php loads first.
 */

/* Sunrise (true) or sunset (false) for the UK calendar day $y-$m-$d as a Unix timestamp, whole minutes; null if the
   sun never rises or sets that day (never at this latitude). */
function bmsun_event($y, $m, $d, $rise) {
    $lat = 50.7166; $lon = -1.8757;
    $day0 = gmmktime(0, 0, 0, $m, $d, $y);
    $n = (int)floor(($day0 - gmmktime(0, 0, 0, 1, 0, $y)) / 86400);
    $lngHour = $lon / 15; $rad = M_PI / 180;
    $t = $n + ((($rise ? 6 : 18) - $lngHour) / 24);
    $M = (0.9856 * $t) - 3.289;
    $L = $M + (1.916 * sin($M * $rad)) + (0.020 * sin(2 * $M * $rad)) + 282.634;
    $L = fmod(fmod($L, 360) + 360, 360);
    $RA = atan(0.91764 * tan($L * $rad)) / $rad;
    $RA = fmod(fmod($RA, 360) + 360, 360);
    $RA += (floor($L / 90) * 90) - (floor($RA / 90) * 90);
    $RA /= 15;
    $sinDec = 0.39782 * sin($L * $rad); $cosDec = cos(asin($sinDec));
    $cosH = (cos(90.833 * $rad) - ($sinDec * sin($lat * $rad))) / ($cosDec * cos($lat * $rad));
    if ($cosH > 1 || $cosH < -1) return null;
    $H = acos($cosH) / $rad;
    if ($rise) $H = 360 - $H;
    $T = ($H / 15) + $RA - (0.06571 * $t) - 6.622;
    $UT = fmod(fmod($T - $lngHour, 24) + 24, 24);
    return $day0 + bmssr_round($UT * 60) * 60;
}

/* Returns array(html, number of blocks filled). $now is for tests; the page passes nothing. */
function bmsun_page($html, $now = null) {
    date_default_timezone_set('Europe/London');
    if ($now === null) $now = time();
    $y = (int)date('Y', $now); $m = (int)date('n', $now); $d = (int)date('j', $now);
    $rise = bmsun_event($y, $m, $d, true);
    $set = bmsun_event($y, $m, $d, false);
    if ($rise === null || $set === null) return array($html, 0);

    $riseHm = date('H:i', $rise);
    $setHm = date('H:i', $set);
    $mins = (int)round(($set - $rise) / 60);
    $len = intdiv($mins, 60) . 'h ' . ($mins % 60) . 'm';
    // the page script's toLocaleDateString('en-GB', ...) of the same UK day
    $day = strtoupper($d . ' ' . date('F', $now));
    $long = date('l j F Y', $now);

    $blocks = array(
        'risechip' => 'SUNRISE &middot; ' . $day,
        'rise' => $riseHm,
        'setchip' => 'SUNSET &middot; ' . $day,
        'set' => $setHm,
        'len' => $len,
        'lensub' => 'Computed for the seafront for ' . $long . ' (NOAA solar position, &plusmn;2 minutes). Nothing here is fetched or forecast.',
        'answer' => '<strong>Bournemouth sunset today: ' . $setHm . '</strong>, sunrise ' . $riseHm . ' (' . $long . ', ' . $len . ' of daylight). ',
    );
    $done = 0;
    foreach ($blocks as $name => $inner) {
        $html = bmssr_swap($html, $name, $inner, $hit);
        $done += $hit;
    }
    // the FAQ "What time is sunset in Bournemouth today?" starts with today's dated times (visible FAQ and JSON-LD)
    $faq = 'Today, ' . $long . ', sunset on Bournemouth seafront is at ' . $setHm . ' and sunrise is at ' . $riseHm
         . ', giving ' . $len . ' of daylight. ';
    $html = bmssr_prefix_anchor($html, 'The panel at the top of this page computes it for the seafront every day', $faq, $hitA);
    $done += $hitA ? 1 : 0;
    return array($html, $done);
}
