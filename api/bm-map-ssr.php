<?php
/**
 * Server-rendered first paint for /bournemouth/live-map/ (17 Sep 2026). Library only: included by
 * bournemouth/live-map/index.php, never a URL (denied in .htaccess). No echo, no exit, no headers.
 *
 * WHY: the page's live counts were drawn by JavaScript from /api/dorset-*.php, so anything reading the raw HTML -
 * the ChatGPT, Claude and Perplexity fetchers, Google's first pass - got eight dashes. This fills the same tiles
 * from the caches those endpoints write, and adds one dated sentence of what the feeds reported, the form an
 * answer engine can quote without it going false later.
 *
 * MIRRORS THE PAGE SCRIPT in bournemouth_data.py (_LM_JS paint): the same numbers and the same words, so nothing
 * changes when the script takes over. Change one, change the other:
 * D:\claude\tools\playwright-check\map-ssr-check.mjs compares this text with the script's.
 *
 * Reads files only - a page view never asks an upstream feed anything. Bus, flight and road caches refresh only
 * when someone opens the page or the map (the cron warms rivers, floods and the sea), so every reading carries its
 * own time, a reading older than its window is left out rather than shown, and "no closures" is only ever said as
 * "none signed" (see api/dorset-roads.php: an empty feed means nothing signed, not roads clear).
 * The 3D-views counter is left to the script: reading it takes a lock, which a page view should not.
 */

/* A cache written by an /api/dorset-*.php endpoint: array(payload, generated timestamp) or null when missing,
   unreadable, not ok, or older than $maxAge seconds. */
function bmmap_cache($file, $maxAge, $now, $shape = null) {
    if (!is_file($file)) return null;
    $j = json_decode((string)@file_get_contents($file), true);
    if (!is_array($j) || empty($j['ok'])) return null;
    if ($shape !== null && (!isset($j['v']) || $j['v'] !== $shape)) return null;
    $t = isset($j['generated']) ? strtotime((string)$j['generated']) : false;
    if (!$t || $now - $t > $maxAge || $t - $now > 300) return null;
    return array($j, $t);
}

/* en-GB short date as the page script writes it: "5 Sept 2026" */
function bmmap_dmy($ts) {
    $m = array('Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec');
    return date('j ', $ts) . $m[(int)date('n', $ts) - 1] . date(' Y', $ts);
}

/* Returns array(html, number of blocks filled). $now is for tests; the page passes nothing. */
function bmmap_page($html, $now = null) {
    date_default_timezone_set('Europe/London');
    if ($now === null) $now = time();
    $api = __DIR__;
    $H3 = 3 * 3600;
    $feeds = array(
        'buses' => bmmap_cache($api . '/dorset-buses-cache.json', $H3, $now),
        'gauges' => bmmap_cache($api . '/dorset-water-cache.json', $H3, $now),
        'warn' => bmmap_cache($api . '/dorset-floods-cache.json', $H3, $now),
        'sea' => bmmap_cache($api . '/dorset-seawater-cache.json', $H3, $now),
        'roads' => bmmap_cache($api . '/dorset-roads-cache.json', $H3, $now),
        'air' => bmmap_cache($api . '/dorset-flights-cache.json', $H3, $now),
        'sat' => bmmap_cache($api . '/dorset-satellite-cache.json', 7 * 86400, $now, 3),
    );
    $blocks = array();   // name => inner html
    $says = array();     // clauses of the dated sentence
    // " as of 15:43" when a reading is more than ten minutes older than the page
    $asof = function ($t) use ($now) { return ($now - $t > 600) ? ' as of ' . date('H:i', $t) : ''; };

    if ($f = $feeds['buses']) {
        list($d, $t) = $f;
        $n = (int)$d['count'];
        $blocks['busesnum'] = (string)$n;
        $blocks['busessub'] = 'Buses reporting a position in and around Bournemouth, Christchurch and Poole. Our server re-reads the feed every 12 seconds; the map moves them every 15.';
        $blocks['busesupd'] = 'updated ' . date('H:i', $t);
        $says[] = $n . ' bus' . ($n === 1 ? '' : 'es') . ' sending positions in and around Bournemouth, Christchurch and Poole' . $asof($t) . ' (DfT Bus Open Data Service)';
    }
    if ($f = $feeds['warn']) {
        list($d, $t) = $f;
        $n = (isset($d['inForce']) && $d['inForce'] !== null) ? (int)$d['inForce'] : (int)$d['count'];
        $blocks['warnnum'] = (string)$n;
        $blocks['warnupd'] = 'updated ' . date('H:i', $t);
        $says[] = ($n ? $n . ' Environment Agency flood warning' . ($n === 1 ? ' or alert' : 's or alerts') : 'no Environment Agency flood warnings or alerts')
                . ' in force' . $asof($t) . ($n ? '' : ', which is not the same as no flood risk');
    }
    if ($f = $feeds['gauges']) {
        list($d, $t) = $f;
        $blocks['gaugesnum'] = (int)$d['withValues'] . '<small>of ' . (int)$d['count'] . '</small>';
        $blocks['gaugessub'] = 'River and tide gauges in the area with a reading; the Environment Agency publishes on roughly a 15-minute cycle.';
        $blocks['gaugesupd'] = 'updated ' . date('H:i', $t);
        $says[] = (int)$d['withValues'] . ' of ' . (int)$d['count'] . ' Environment Agency river and tide gauges reporting' . $asof($t);
    }
    if ($f = $feeds['sea']) {
        list($d, $t) = $f;
        $dis = (int)$d['discharging']; $ovf = (int)$d['overflows']; $bea = (int)$d['beaches'];
        $inc = isset($d['increasedRisk']) ? (int)$d['increasedRisk'] : 0; $rec = (int)$d['recentDischarges48h'];
        $blocks['seanum'] = $dis . '<small>of ' . $ovf . ' monitored overflows discharging</small>';
        $blocks['seasub'] = $bea . ' designated beaches from Poole Harbour to Christchurch Bay: '
            . ($inc ? $inc . ' with an increased pollution-risk forecast from the Environment Agency today, ' . ($bea - $inc) . ' normal'
                    : 'all on a normal pollution-risk forecast from the Environment Agency today')
            . '. ' . $rec . ' overflow' . ($rec === 1 ? '' : 's') . ' discharged in the last 48 hours. <strong>Their published status, not a verdict on swimming</strong> &mdash; the map links each beach to its Swimfo page.';
        $blocks['seaupd'] = 'updated ' . date('H:i', $t);
        $partial = isset($d['partial']) && is_array($d['partial']) ? $d['partial'] : array();
        $water = !in_array('Wessex Water', $partial, true) && !in_array('Southern Water', $partial, true);
        $eaOk = !in_array('Environment Agency', $partial, true) && $bea > 0;
        if ($water) {
            $says[] = $dis . ' of ' . $ovf . ' monitored storm overflows discharging' . $asof($t) . ' (Wessex Water and Southern Water monitors)'
                    . ($eaOk ? ($inc ? ', with ' . $inc . ' of ' . $bea . ' designated beaches on an increased pollution-risk forecast (Environment Agency)'
                                     : ', with all ' . $bea . ' designated beaches on a normal pollution-risk forecast (Environment Agency)') : '');
        }
    }
    if ($f = $feeds['roads']) {
        list($d, $t) = $f;
        $n = (int)$d['count'];
        $blocks['roadsnum'] = (string)$n;
        $blocks['roadssub'] = 'Closures signed on the National Highways network nearby, which here means the A31, read every minute. Council roads, including the A338 Wessex Way, are not in this feed.';
        $blocks['roadsupd'] = 'updated ' . date('H:i', $t);
        $says[] = ($n ? $n . ' closure' . ($n === 1 ? '' : 's') : 'no closures') . ' signed on the A31' . $asof($t) . ' (National Highways)';
    }
    if ($f = $feeds['air']) {
        list($d, $t) = $f;
        $n = (int)$d['count']; $r = (int)$d['radiusNm'];
        $blocks['airnum'] = (string)$n;
        $blocks['airsub'] = 'Aircraft transmitting ADS-B within ' . $r . ' nautical miles of the centre of the map &mdash; what is being received, not a schedule.';
        $blocks['airupd'] = 'updated ' . date('H:i', $t);
        $says[] = $n . ' aircraft transmitting within ' . $r . ' nautical miles' . $asof($t) . ' (adsb.lol)';
    }
    if ($f = $feeds['sat']) {
        list($d, $t) = $f;
        $cap = !empty($d['captured']) ? strtotime((string)$d['captured']) : false;
        if ($cap) {
            $hasCc = isset($d['cloudCover']) && is_numeric($d['cloudCover']);
            $cc = $hasCc ? bmssr_round($d['cloudCover']) . '% cloud cover' : 'cloud cover not reported';
            $blocks['satnum'] = bmmap_dmy($cap);
            $blocks['satsub'] = 'Most recent Sentinel-2 scene over the area, captured ' . date('H:i', $cap) . ' on that date &mdash; ' . $cc
                . '. Contains modified Copernicus Sentinel data ' . gmdate('Y', $cap) . '.';
            $blocks['satupd'] = 'updated ' . date('H:i', $t);
            $says[] = 'the latest Sentinel-2 satellite pass on ' . date('j F Y', $cap) . ($hasCc ? ' (' . bmssr_round($d['cloudCover']) . '% cloud)' : '');
        }
    }

    $done = 0;
    foreach ($blocks as $name => $inner) {
        $html = bmssr_swap($html, $name, $inner, $hit);
        $done += $hit;
    }
    if (count($says) >= 2) {
        $last = array_pop($says);
        $sentence = 'What the feeds reported when this page was served, at ' . date('H:i', $now) . ' on ' . date('l j F Y', $now) . ': '
                  . implode('; ', $says) . '; and ' . $last . '.';
        $html = bmssr_swap($html, 'summary', '<p class="b365-sub" id="lm-summary" style="margin:0 0 1rem">' . bmssr_esc($sentence) . '</p>', $hit);
        $done += $hit;
    }
    // the FAQ "Is the Bournemouth live map really live?" opens with a dated reading (visible FAQ and JSON-LD)
    if ($f = $feeds['buses']) {
        $n = (int)$f[0]['count'];
        $faq = 'At ' . date('H:i', $f[1]) . ' on ' . date('l j F Y', $f[1]) . ' the bus feed was reporting ' . $n . ' bus' . ($n === 1 ? '' : 'es')
             . ' in and around Bournemouth, Christchurch and Poole. ';
        $html = bmssr_prefix_anchor($html, 'Every layer polls a named public feed while the map is open', $faq, $hitA);
        $done += $hitA ? 1 : 0;
    }
    return array($html, $done);
}
