<?php
/*
 * Bournemouth weather: today against the record books (22 Sep 2026).
 *
 * WHY
 * "The warmest 22 September here since 1985" is a sentence people stop for. It
 * needs, for today's calendar date, every year's daily maximum at one station
 * with a long record - Hurn, Bournemouth Airport, the station whose METAR
 * readings the page already shows. tools/bm-records/build_records.py turns the
 * Met Office's MIDAS Open daily files (Open Government Licence) into
 * api/bm-records.json: per MM-DD the record high with its year, the lowest
 * maximum, the mean, and every year's value. This file reads that and says
 * where today stands.
 *
 * HONESTY RULES, because these lines are written to be quoted:
 *  - "on record" means at that station since its records began (the year is
 *    always stated), never "in history".
 *  - Until late afternoon the day is not over, so the comparison uses the
 *    forecast high and says "on course for"; from 17:00 it uses the measured
 *    maximum and says it plainly. The measured figure is METAR, whole degrees.
 *  - "warmest since YYYY" is only said when YYYY is at least five years back;
 *    otherwise it is just "above average". A record is claimed only when the
 *    value clears the old one, not ties it.
 *  - No records file, or no entry for the date, means nothing is shown.
 *
 * Pure functions (bmr_*) take arrays and return arrays, so bm-records-test.php
 * can pin every sentence. bm_records_public() is the one that reads files.
 * NO closing tag in this file.
 */

define('BMR_FILE', __DIR__ . '/bm-records.json');
define('BMR_TZ', 'Europe/London');
define('BMR_SINCE_MIN_YEARS', 5);     // "warmest since YYYY" needs YYYY this far back to be worth saying
define('BMR_EVENING_HOUR', 17);       // from this local hour the measured maximum stands for the day

function bmr_load($path = BMR_FILE) {
    $j = @json_decode((string)@file_get_contents($path), true);
    return (is_array($j) && isset($j['days']) && is_array($j['days'])) ? $j : null;
}

/* 'MM-DD' and "22 September" for a timestamp in the site's timezone. */
function bmr_md($ts, $tz = BMR_TZ) {
    $d = new DateTime('@' . (int)$ts); $d->setTimezone(new DateTimeZone($tz));
    return array($d->format('m-d'), (int)$d->format('j') . ' ' . $d->format('F'), (int)$d->format('Y'), (int)$d->format('G'));
}

/* The most recent past year whose maximum was above (or, $above=false, below)
   $value. null when no year was. Ties do not count either way. */
function bmr_since($hiy, $value, $currentYear, $above = true) {
    $best = null;
    foreach ((array)$hiy as $p) {
        if (!is_array($p) || count($p) < 2) continue;
        $y = (int)$p[0]; $v = (float)$p[1];
        if ($y >= $currentYear) continue;
        if (($above && $v > $value + 0.05) || (!$above && $v < $value - 0.05)) { if ($best === null || $y > $best) $best = $y; }
    }
    return $best;
}

function bmr_deg($v) { return (abs($v - round($v)) < 0.05 ? (string)(int)round($v) : number_format($v, 1)) . "\xC2\xB0C"; }

/* Where $value (today's maximum, measured or forecast) stands for this date.
   $mode 'obs' = the day is done and this was measured; 'fc' = forecast, so "on
   course for". $ctx: date (22 September), year, from (first year of records),
   station. Returns tier, the sentence, and the numbers the caller may show. */
function bmr_verdict($day, $value, $mode, $ctx) {
    $hi = (float)$day['hi'][0]; $hiY = (int)$day['hi'][1];
    $lohi = isset($day['lohi']) ? (float)$day['lohi'][0] : null; $lohiY = isset($day['lohi']) ? (int)$day['lohi'][1] : null;
    $avg = (float)$day['avg_hi']; $year = (int)$ctx['year']; $date = $ctx['date']; $from = (int)$ctx['from']; $st = $ctx['station'];
    $fc = ($mode === 'fc');
    $ws = bmr_since(isset($day['hiy']) ? $day['hiy'] : array(), $value, $year, true);
    $cs = bmr_since(isset($day['hiy']) ? $day['hiy'] : array(), $value, $year, false);
    $delta = round($value - $avg, 1);
    $out = array('tier' => 'normal', 'line' => '', 'delta_avg' => $delta, 'warmest_since' => $ws, 'coldest_since' => $cs);
    if ($value >= $hi + 0.05) {
        $out['tier'] = 'record';
        $out['line'] = ($fc ? 'On course for the warmest ' : 'The warmest ') . $date . ' at ' . $st . ' since records began in ' . $from . " \xE2\x80\x94 the old record was " . bmr_deg($hi) . ' in ' . $hiY . '.';
    } elseif ($lohi !== null && $value <= $lohi - 0.05) {
        $out['tier'] = 'record_cold';
        $out['line'] = ($fc ? 'On course for the coldest ' : 'The coldest ') . $date . ' at ' . $st . ' since records began in ' . $from . " \xE2\x80\x94 the lowest daytime maximum before today was " . bmr_deg($lohi) . ' in ' . $lohiY . '.';
    } elseif ($value >= $hi - 1.0) {
        $out['tier'] = 'near';
        $out['line'] = ($fc ? 'Forecast to come within ' : 'Within ') . bmr_deg(round($hi - $value, 1)) . ' of the ' . $date . ' record, ' . bmr_deg($hi) . ' in ' . $hiY . '.';
    } elseif ($ws !== null && $year - $ws >= BMR_SINCE_MIN_YEARS) {
        $out['tier'] = 'warmest_since';
        $out['line'] = ($fc ? 'On course for the warmest ' : 'The warmest ') . $date . ' since ' . $ws . '.';
    } elseif ($cs !== null && $year - $cs >= BMR_SINCE_MIN_YEARS) {
        $out['tier'] = 'coolest_since';
        $out['line'] = ($fc ? 'On course for the coolest ' : 'The coolest ') . $date . ' since ' . $cs . '.';
    } elseif (abs($delta) < 1.0) {
        $out['line'] = 'About average for the date.';
    } else {
        $out['tier'] = $delta > 0 ? 'above' : 'below';
        $out['line'] = bmr_deg(abs($delta)) . ($delta > 0 ? ' above' : ' below') . ' the average for the date.';
    }
    return $out;
}

/* The caption for a post (read from the feed by whoever writes the post - it is
   not offered to visitors). The date and the record each appear ONCE: the verdict
   line usually carries both, so the prefix and the record tail are added only
   when it does not. */
function bmr_caption($ctx, $day, $value, $mode, $line, $tier = '') {
    $what = $mode === 'fc' ? 'forecast high today' : 'the high today';
    $prefix = (strpos($line, $ctx['date']) === false) ? 'Bournemouth, ' . $ctx['date'] . ': ' : 'Bournemouth: ';
    // ONE year per caption (owner, 23 Sep): the verdict's own year is the only one; no record tail
    return $prefix . bmr_deg($value) . ' ' . $what . '. ' . $line . ' Average for the date ' . bmr_deg((float)$day['avg_hi']) . '.'
        . ' Records: Met Office, ' . $ctx['station'] . ', since ' . (int)$ctx['from'] . '.';
}

/* Tomorrow in one sentence with ONE year in it: the forecast against the date's
   record, and nothing else (owner, 23 Sep 2026: "why two dates?"). */
function bmr_tomorrow_line($date, $fcHi, $day) {
    $hi = (float)$day['hi'][0]; $hiY = (int)$day['hi'][1];
    $head = 'Tomorrow: forecast high ' . bmr_deg($fcHi);
    if ($fcHi >= $hi + 0.05) return $head . ', which would beat the ' . $date . ' record of ' . bmr_deg($hi) . ' (' . $hiY . ').';
    if ($fcHi >= $hi - 1.0)  return $head . ', within ' . bmr_deg(round($hi - $fcHi, 1)) . ' of the ' . $date . ' record, ' . bmr_deg($hi) . ' (' . $hiY . ').';
    return $head . '. The ' . $date . ' record is ' . bmr_deg($hi) . ' (' . $hiY . ').';
}

/* The measured maximum so far on the given local date, from the METAR series
   (whole degrees). null when there are no readings for that date. */
function bmr_obs_max($series, $ymd, $tz = BMR_TZ) {
    $max = null; $n = 0;
    foreach ((array)$series as $r) {
        if (!is_array($r) || !isset($r['t']) || !isset($r['temp']) || $r['temp'] === null) continue;
        $t = strtotime($r['t']); if ($t === false) continue;
        $d = new DateTime('@' . $t); $d->setTimezone(new DateTimeZone($tz));
        if ($d->format('Y-m-d') !== $ymd) continue;
        $n++; $v = (float)$r['temp'];
        if ($max === null || $v > $max) $max = $v;
    }
    return array($max, $n);
}

/* ---- the one impure function: today and tomorrow, for bm-wx.php ---------- */
function bm_records_public($now = null) {
    $now = $now === null ? time() : $now;
    $R = bmr_load();
    if (!$R) return array('ok' => false, 'why' => 'no records file yet');
    list($md, $date, $year, $hour) = bmr_md($now);
    $day = isset($R['days'][$md]) ? $R['days'][$md] : null;
    if (!$day || empty($day['hi'])) return array('ok' => false, 'why' => 'no entry for ' . $md);
    $ctx = array('date' => $date, 'year' => $year, 'from' => (int)$R['from'], 'station' => (string)$R['station']);
    $tzd = new DateTime('@' . $now); $tzd->setTimezone(new DateTimeZone(BMR_TZ)); $ymd = $tzd->format('Y-m-d');
    // measured so far today (all of today's readings, not the public 36)
    $obs = function_exists('bmwx_json_load') ? bmwx_json_load('obs.json') : null;
    list($obsMax, $obsN) = bmr_obs_max(isset($obs['series']) ? $obs['series'] : array(), $ymd);
    // forecast highs for today and tomorrow
    $fcHi = null; $fcTom = null; $tomYmd = date('Y-m-d', strtotime($ymd . ' +1 day'));
    if (function_exists('bm_weather_public_full')) {
        $f = bm_weather_public_full();
        foreach ((array)(isset($f['days']) ? $f['days'] : array()) as $dd) {
            if (!is_array($dd) || !isset($dd['d'])) continue;
            if ($dd['d'] === $ymd && isset($dd['hi'])) $fcHi = (float)$dd['hi'];
            if ($dd['d'] === $tomYmd && isset($dd['hi'])) $fcTom = (float)$dd['hi'];
        }
    }
    // which number stands for today
    $mode = null; $value = null;
    if ($hour >= BMR_EVENING_HOUR && $obsMax !== null) { $mode = 'obs'; $value = $obsMax; }
    elseif ($fcHi !== null) { $mode = 'fc'; $value = ($obsMax !== null && $obsMax > $fcHi) ? $obsMax : $fcHi; }
    elseif ($obsMax !== null) { $mode = 'obs'; $value = $obsMax; }
    $today = array(
        'date' => $date, 'md' => $md, 'hi' => $day['hi'], 'lohi' => isset($day['lohi']) ? $day['lohi'] : null, 'lo' => isset($day['lo']) ? $day['lo'] : null,
        'avg_hi' => $day['avg_hi'], 'n' => $day['n'], 'obs_max' => $obsMax, 'obs_n' => $obsN, 'fc_hi' => $fcHi, 'mode' => $mode, 'value' => $value,
    );
    if ($mode !== null) {
        $v = bmr_verdict($day, $value, $mode, $ctx);
        $today['verdict'] = $v;
        $today['caption'] = bmr_caption($ctx, $day, $value, $mode, $v['line'], $v['tier']);
    }
    $out = array('ok' => true, 'station' => $R['station'], 'source' => $R['source'], 'licence' => $R['licence'], 'from' => (int)$R['from'], 'to' => (int)$R['to'], 'today' => $today);
    // tomorrow: the forecast against its date's record
    list($md2, $date2) = bmr_md(strtotime($tomYmd . ' 12:00:00 ' . BMR_TZ));
    if (isset($R['days'][$md2]) && !empty($R['days'][$md2]['hi'])) {
        $d2 = $R['days'][$md2];
        $tom = array('date' => $date2, 'md' => $md2, 'hi' => $d2['hi'], 'avg_hi' => $d2['avg_hi'], 'fc_hi' => $fcTom);
        if ($fcTom !== null) {
            $v2 = bmr_verdict($d2, $fcTom, 'fc', array_merge($ctx, array('date' => $date2)));
            $tom['verdict'] = $v2;
            $tom['line'] = bmr_tomorrow_line($date2, $fcTom, $d2);
        }
        $out['tomorrow'] = $tom;
    }
    return $out;
}
