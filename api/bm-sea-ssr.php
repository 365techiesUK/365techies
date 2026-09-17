<?php
/**
 * Server-rendered first paint for /bournemouth/sea-today/ (17 Sep 2026). Library only: included by
 * bournemouth/sea-today/index.php, never a URL (denied in .htaccess). No echo, no exit, no headers.
 * Borrows the helpers in bm-wx-ssr.php (JavaScript-exact rounding, escaping, marker swapping).
 *
 * WHY: readers that don't run JavaScript - AI crawlers and live page fetches - got "Waiting for the buoy..." where
 * the measured sea temperature, waves and tide should be, and a beach table and sewage answer frozen at the last site
 * build (bournemouth_sea_bake.py). index.php fills the <!--ssr:NAME--> markers at request time from bm_sea_public(),
 * the same assembly /api/bm-sea.php serves; the page script then redraws everything exactly as before.
 *
 * MIRRORS THE PAGE SCRIPT (_ST_JS in bournemouth_data.py): the same words, chips, tile states and freshness rules.
 * Change one, change the other; D:\claude\tools\playwright-check\sea-ssr-check.mjs compares them block by block.
 * Deliberate differences: the dated "Statuses as read at..." note (the script swaps in "Live - ..."), and the sun
 * tile, sparklines, tide curve, the "why the sea is like this" paragraph and the highlight strips stay with the script.
 */

/* the sea page's own ago(): "1 hour 5 min ago", unlike the weather page's "1 h ago" */
function bmst_ago($iso, $now) {
    $mins = bmssr_round(($now - bmssr_ts($iso)) / 60);
    if ($mins < 1) return 'just now';
    if ($mins < 60) return $mins . ' min ago';
    $h = (int)floor($mins / 60);
    return $h . ($h === 1 ? ' hour ' : ' hours ') . ($mins % 60) . ' min ago';
}
function bmst_read_at($iso, $now) { return bmssr_hhmm($iso) . ' (' . bmst_ago($iso, $now) . ')'; }

/* Outdoor Swimming Society bands - anecdotal, not scientific, and the page says so */
function bmst_band($t) {
    if ($t >= 21) return array("\u{201C}Warm\u{201D}", 'comfortable swimming for most people');
    if ($t >= 17) return array("\u{201C}Summer swimming\u{201D}", 'fresh on entry, then comfortable');
    if ($t >= 12) return array("\u{201C}Fresh\u{201D}", 'doable for the brave without a wetsuit; triathlon wetsuit territory');
    if ($t >= 6) return array("\u{201C}Freezing\u{201D}", 'experienced cold-water swimmers only');
    return array("\u{201C}Baltic\u{201D}", 'a few minutes is an achievement, even for the experienced');
}

function bmst_verdict($hs, $temp) {
    if ($hs >= 1.5) return array('ROUGH', 'v-rough');
    if ($hs >= 0.75) return array('CHOPPY', 'v-choppy');
    if ($hs >= 0.25) return $temp < 12 ? array('BRACING', 'v-bracing') : array('FRESH', 'v-fresh');
    return array('CALM', 'v-calm');
}

/* same expression, same order as the script's havKm, so the distances round the same */
function bmst_hav($la1, $lo1, $la2, $lo2) {
    $R = 6371;
    $dLa = ($la2 - $la1) * M_PI / 180;
    $dLo = ($lo2 - $lo1) * M_PI / 180;
    $h = sin($dLa / 2) * sin($dLa / 2) + cos($la1 * M_PI / 180) * cos($la2 * M_PI / 180) * sin($dLo / 2) * sin($dLo / 2);
    return 2 * $R * asin(sqrt($h));
}

function bmst_tile($id, $state) { return '<div class="' . trim('b365-tile ' . $state) . '" id="' . $id . '">'; }

/* Returns array(html, number of blocks filled). The caller serves the original file if this throws. */
function bmst_page($html) {
    date_default_timezone_set('Europe/London');
    $now = time();
    $d = bm_sea_public();
    $sea = bmssr_get($d, 'sea');
    $tide = bmssr_get($d, 'tide');
    $bath = bmssr_get($d, 'bathing');
    $ov = bmssr_get($d, 'overflow');
    // nothing cached at all (a fresh server): leave the page exactly as built
    if (empty($sea['ok']) && empty($tide['ok']) && empty($bath['ok']) && empty($ov['ok'])) return array($html, 0);
    $p = array();

    // Wessex monitors split by receiving water: seafront outfalls vs river monitors on the Stour/Avon
    $seaM = array(); $rivM = array(); $seaDis = 0; $rivDis = 0;
    if (!empty($ov['ok']) && is_array(bmssr_get($ov, 'monitors'))) {
        foreach ($ov['monitors'] as $m) {
            $isSea = (bool)preg_match('/POOLE BAY|ENGLISH CHANNEL/', strtoupper((string)bmssr_get($m, 'water')));
            if ($isSea) $seaM[] = $m; else $rivM[] = $m;
            if (bmssr_get($m, 'status') === 1) { if ($isSea) $seaDis++; else $rivDis++; }
        }
    }

    /* ---- the buoy: temperature and waves ---- */
    $line = null;
    if (!empty($sea['ok']) && bmssr_has(bmssr_get($sea, 'tempC')) && bmssr_has(bmssr_get($sea, 'hs'))) {
        $stale = !empty($sea['stale']);
        $ageMin = bmssr_round(($now - bmssr_ts(bmssr_get($sea, 'read_at'))) / 60);
        $state = $stale ? 'b365-stale' : ($ageMin <= 105 ? 'b365-fresh' : '');
        $p['tiletemp'] = bmst_tile('st-tile-temp', $state);
        $p['tilewaves'] = bmst_tile('st-tile-waves', $state);
        $chip = bmssr_esc(($stale ? 'LAST HEARD ' : 'MEASURED ') . strtoupper(bmst_ago($sea['read_at'], $now)) . " \u{00B7} " . strtoupper((string)bmssr_get($sea, 'station')));
        $p['tempchip'] = $chip;
        $p['waveschip'] = $chip;
        $p['temp'] = bmssr_fixed($sea['tempC'], 1) . "<small>\u{00B0}C</small>";
        $p['waves'] = bmssr_fixed($sea['hs'], 2) . '<small>m</small>';
        $band = bmst_band($sea['tempC']);
        $p['tempsub'] = bmssr_esc($stale
            ? 'The buoy has not reported since ' . bmst_read_at($sea['read_at'], $now) . " \u{2014} this is its last reading, not a current one."
            : $band[0] . " on the swimmers\u{2019} scale \u{2014} " . $band[1] . '.');
        $w = 'Significant height, measured. ';
        if (bmssr_get($sea, 'tz')) $w .= 'Mean period ' . bmssr_fixed($sea['tz'], 1) . 's. ';
        if (bmssr_get($sea, 'dirFromMag') !== null) $w .= 'From ' . $sea['dirFromMag'] . "\u{00B0} magnetic. ";
        $p['wavessub'] = bmssr_esc($w);
        if (!$stale) {
            // verdict: sea-state words only, and never on stale data
            $v = bmst_verdict($sea['hs'], $sea['tempC']);
            $p['verdict'] = '<p class="b365-verdict ' . $v[1] . '" id="st-verdict" data-reveal>' . $v[0] . " \u{00B7} SEA STATE \u{00B7} BANDED FROM MEASURED READINGS</p>";
            $line = 'Computed from the latest readings: ' . bmssr_fixed($sea['tempC'], 1) . "\u{00B0} water, " . bmssr_fixed($sea['hs'], 2) . "m waves \u{2014} measured " . bmst_ago($sea['read_at'], $now) . '.';
            $p['bandnote'] = bmssr_esc('At ' . bmssr_fixed($sea['tempC'], 1) . "\u{00B0}C measured now: " . str_replace(array("\u{201C}", "\u{201D}"), '', $band[0]) . " \u{2014} " . $band[1]
                . ". Bands: the Outdoor Swimming Society\u{2019}s guide (anecdotal, as the OSS itself says).");
            // thermal lag: live reading vs this month's long-term average (Cefas station 23)
            $norms = array(7.4, 6.8, 7.4, 8.9, 11.8, 14.9, 17.4, 18.4, 16.8, 14.2, 11.2, 8.7);
            $dlt = $sea['tempC'] - $norms[(int)date('n', $now) - 1];
            $p['lagnote'] = bmssr_esc('Measured now: ' . bmssr_fixed($sea['tempC'], 1) . "\u{00B0} \u{2014} " . bmssr_fixed(abs($dlt), 1) . "\u{00B0} " . ($dlt >= 0 ? 'above' : 'below') . ' the ' . date('F', $now)
                . " long-term average (Cefas station 23, 1971\u{2013}2000). The sea lags the air by about two months \u{2014} September beats June.");
        }
        // the attribution follows whichever buoy served the reading (a licence condition)
        if (bmssr_get($sea, 'source') === 'cco') {
            $p['attrib'] = 'Real time data displayed on this page are from the <a href="https://coastalmonitoring.org/" target="_blank" rel="noopener">Regional Coastal Monitoring Programme</a>, made freely available under the terms of the <a href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/" target="_blank" rel="noopener">Open Government Licence</a>. Please note that these are real-time data and are not quality-controlled. Full source list at the foot of the page.';
        } elseif (bmssr_get($sea, 'source') === 'cefas') {
            $p['attrib'] = 'Wave and temperature data: Cefas Poole Bay wave buoy (Open Government Licence, acknowledgement to Cefas). Full source list at the foot of the page.';
        }
    } elseif (is_array($sea) && empty($sea['ok'])) {
        $p['tiletemp'] = bmst_tile('st-tile-temp', 'b365-down');
        $p['tilewaves'] = bmst_tile('st-tile-waves', 'b365-down');
        $p['tempchip'] = 'BUOY OFFLINE';
        $p['waveschip'] = 'BUOY OFFLINE';
        $p['tempsub'] = bmssr_esc("The wave buoy is not reporting right now \u{2014} no reading is better than a guessed one. Try again in half an hour.");
        $p['wavessub'] = bmssr_esc("No current wave data \u{2014} the buoy feed is down.");
    }

    /* ---- the pier gauge ---- */
    if (!empty($tide['ok']) && bmssr_get($tide, 'trend') && bmssr_has(bmssr_get($tide, 'levelMAOD'))) {
        $stale = !empty($tide['stale']);
        $tAge = bmssr_round(($now - bmssr_ts(bmssr_get($tide, 'read_at'))) / 60);
        $p['tiletide'] = bmst_tile('st-tile-tide', $stale ? 'b365-stale' : ($tAge <= 75 ? 'b365-fresh' : ''));
        $tr = (string)$tide['trend'];
        $p['tide'] = bmssr_esc(strtoupper(substr($tr, 0, 1)) . substr($tr, 1));
        $p['tidechip'] = bmssr_esc(($stale ? 'LAST HEARD ' : 'MEASURED ') . strtoupper(bmst_ago($tide['read_at'], $now)) . " \u{00B7} GAUGE ON THE PIER");
        $p['tidesub'] = bmssr_esc('Water level ' . bmssr_fixed($tide['levelMAOD'], 2) . " m (vs Ordnance Datum) \u{2014} a real instrument on Bournemouth Pier, not a prediction. Not for navigation or safety-critical use.");
    } elseif (is_array($tide) && empty($tide['ok'])) {
        $p['tiletide'] = bmst_tile('st-tile-tide', 'b365-down');
        $p['tidechip'] = 'GAUGE OFFLINE';
        $p['tidesub'] = 'The pier tide gauge is not reporting right now.';
    }

    /* ---- bathing water: the tile and the beach-by-beach table ---- */
    $prfLevel = null;
    $sites = is_array(bmssr_get($bath, 'sites')) ? array_values($bath['sites']) : array();
    if (!empty($bath['ok']) && count($sites)) {
        $exc = 0; $prfUp = 0; $n = count($sites);
        $yr = bmssr_get($sites[0], 'classYear');
        foreach ($sites as $st) {
            if (bmssr_get($st, 'class') === 'Excellent') $exc++;
            $pf = bmssr_get($st, 'prf');
            if (is_array($pf) && bmssr_get($pf, 'expires') && bmssr_ts($pf['expires']) > $now) {
                $prfUp++;
                if (bmssr_get($pf, 'level') !== 'normal') $prfLevel = bmssr_get($pf, 'level');
            }
        }
        $p['quality'] = bmssr_esc($exc === $n ? 'All ' . $n . ' beaches: Excellent' : $exc . ' of ' . $n . ' beaches Excellent');
        $q = $yr ? '(' . $yr . ' Environment Agency classification.) ' : '';
        if ($prfUp > 0) {
            $q .= $prfLevel ? "Today\u{2019}s pollution risk forecast: " . $prfLevel . " at one or more beaches \u{2014} details below."
                            : "Today\u{2019}s pollution risk forecast: normal at all forecast beaches.";
        } else {
            $q .= "Pollution risk forecasts are issued daily May\u{2013}September; none is in force right now.";
        }
        $p['qualitysub'] = bmssr_esc($q);
        $p['qualitychip'] = bmssr_esc("EA SERVICE \u{00B7} CHECKED " . strtoupper(bmst_ago(bmssr_get($bath, 'read_at'), $now)));
        $rows = '';
        foreach ($sites as $st) {
            $pf = bmssr_get($st, 'prf');
            $prfTxt = "\u{2014}";
            if (is_array($pf) && bmssr_get($pf, 'expires') && bmssr_ts($pf['expires']) > $now) $prfTxt = (string)bmssr_get($pf, 'level');
            $ovTxt = "\u{2014}";
            $lat = bmssr_get($st, 'lat');
            $lng = bmssr_get($st, 'lng');
            if ($lat !== null && $lng !== null && count($seaM)) {
                $best = null; $bd = 1e9;
                foreach ($seaM as $m) {
                    if (bmssr_get($m, 'lat') === null || bmssr_get($m, 'lng') === null) continue;
                    $dk = bmst_hav($lat, $lng, $m['lat'], $m['lng']);
                    if ($dk < $bd) { $bd = $dk; $best = $m; }
                }
                if ($best) {
                    $stt = bmssr_get($best, 'status');
                    $ovTxt = ($stt === 1 ? "\u{26A0} discharging" : ($stt === -1 ? 'monitor offline' : 'no discharge')) . " \u{00B7} " . bmssr_fixed($bd, 1) . ' km away';
                }
            }
            $cls = (bmssr_get($st, 'class') ? $st['class'] : '?') . (bmssr_get($st, 'classYear') ? ' (' . $st['classYear'] . ')' : '');
            $rows .= '<tr>';
            foreach (array(bmssr_get($st, 'name'), $cls, $prfTxt, bmssr_get($st, 'heavyRain') ? 'yes' : 'no', $ovTxt) as $c) $rows .= '<td>' . bmssr_esc($c) . '</td>';
            $rows .= '<td>' . (($lat !== null && $lng !== null)
                ? '<a href="/bournemouth/live-map/app/#lat=' . bmssr_fixed($lat, 4) . '&amp;lon=' . bmssr_fixed($lng, 4) . '&amp;alt=2500&amp;v=2&amp;l=v">Show on map</a>'
                : "\u{2014}") . '</td></tr>';
        }
        $p['sites'] = $rows;
    } elseif (is_array($bath)) {
        $p['qualitysub'] = 'The Environment Agency feed is not responding right now.';
        $p['qualitychip'] = 'EA FEED DOWN';
    }

    /* ---- storm overflows: the tile, and the sewage question in the article ---- */
    if (!empty($ov['ok'])) {
        $when = bmst_ago(bmssr_get($ov, 'read_at'), $now);
        $ra = bmst_read_at(bmssr_get($ov, 'read_at'), $now);
        $p['overflowchip'] = bmssr_esc("WESSEX MONITORS \u{00B7} CHECKED " . strtoupper($when));
        if ($seaDis > 0) {
            $p['overflow'] = $seaDis . ' seafront outfall' . ($seaDis > 1 ? 's' : '') . ' discharging';
            $p['overflowsub'] = bmssr_esc('Of ' . count($seaM) . ' monitored outfalls along the front, ' . $seaDis . ' ' . ($seaDis > 1 ? 'are' : 'is') . ' reporting a discharge into the bay. Monitor reported ' . $ra
                . '. After heavy rain, consider swimming another day.' . ($rivDis > 0 ? ' ' . $rivDis . ' river monitor' . ($rivDis > 1 ? 's' : '') . ' upstream also reporting.' : ''));
            $p['sewage'] = bmssr_esc("Yes \u{2014} " . $seaDis . ' seafront outfall' . ($seaDis > 1 ? 's are' : ' is') . ' reporting a discharge into the sea (Wessex Water monitors, checked ' . $when . ').');
        } elseif ($rivDis > 0) {
            $p['overflow'] = 'River monitor' . ($rivDis > 1 ? 's' : '') . ' discharging upstream';
            $p['overflowsub'] = bmssr_esc('No seafront outfall is reporting a discharge. ' . $rivDis . ' monitor' . ($rivDis > 1 ? 's' : '') . ' upstream on the Stour or Avon ' . ($rivDis > 1 ? 'are' : 'is')
                . " \u{2014} river discharges reach the sea at Christchurch Harbour, not at these beaches directly. Monitor reported " . $ra . '.');
            $p['sewage'] = bmssr_esc("Not into the sea at these beaches \u{2014} no seafront outfall is discharging; " . $rivDis . ' monitor' . ($rivDis > 1 ? 's' : '') . ' upstream on the Stour or Avon '
                . ($rivDis > 1 ? 'are' : 'is') . ' (Wessex Water, checked ' . $when . ').');
        } else {
            $off = (int)bmssr_get($ov, 'offline');
            $p['overflow'] = 'No overflows discharging';
            $p['overflowsub'] = bmssr_esc('All ' . bmssr_get($ov, 'total') . ' monitored storm overflows (' . count($seaM) . ' seafront outfalls, ' . count($rivM) . ' river monitors upstream) are reporting no discharge'
                . ($off > 0 ? ' (' . $off . ' monitor' . ($off > 1 ? 's' : '') . ' offline)' : '') . '. Checked ' . $ra . '.');
            $p['sewage'] = bmssr_esc("No \u{2014} none of the " . bmssr_get($ov, 'total') . ' monitored storm overflows around Bournemouth is reporting a discharge (Wessex Water monitors, checked ' . $when . ').');
        }
    } elseif (is_array($ov)) {
        $p['overflowsub'] = 'The storm-overflow monitor feed is not responding right now.';
        $p['overflowchip'] = 'MONITOR FEED DOWN';
        $p['sewage'] = bmssr_esc("The storm-overflow monitor feed is not responding right now, so this page cannot say. Check Wessex Water\u{2019}s own map before you go in.");
    }
    // Dated, for anyone reading a saved copy later; the script replaces it with "Live - checked N min ago".
    $stamp = bmssr_ts(!empty($ov['ok']) ? bmssr_get($ov, 'read_at') : bmssr_get($bath, 'read_at'));
    if (!$stamp) $stamp = $now;
    $p['bakednote'] = 'Statuses as read at ' . date('H:i', $stamp) . ' on ' . date('j F Y', $stamp) . '; they refresh live when this page opens.';

    /* ---- official warnings outrank every derived element ---- */
    $warns = array();
    if ($prfLevel) $warns[] = "Official warning \u{2014} today\u{2019}s Environment Agency pollution-risk forecast is \u{201C}" . $prfLevel . "\u{201D} at one or more beaches. See water quality below.";
    if ($seaDis > 0) $warns[] = 'A seafront storm-overflow outfall is reporting a discharge into the bay. See storm overflows below.';
    elseif ($rivDis > 0) $warns[] = "A monitor upstream on the Stour or Avon is reporting a discharge \u{2014} not at these beaches directly. See storm overflows below.";
    if ($warns) $p['warn'] = '<div class="b365-warn" id="st-warn">' . bmssr_esc(implode(' ', $warns)) . '</div>';
    if ($line !== null) $p['line'] = bmssr_esc($line . ($warns ? " \u{2014} official warning in force, see below." : ''));

    if (bmssr_get($d, 'at')) $p['asof'] = bmssr_esc('Feed assembled ' . bmst_read_at($d['at'], $now) . " \u{00B7} refreshes every 20 minutes \u{00B7} readings show their own measurement times");

    $done = 0;
    foreach ($p as $name => $inner) {
        $html = bmssr_swap($html, $name, $inner, $hit);
        $done += $hit;
    }
    return array($html, $done);
}
