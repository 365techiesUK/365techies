<?php
/**
 * Bournemouth365 weather forecast - the data layer behind the forecast panel
 * on /bournemouth/ (the hub). Library only: included by bm-weather.php (the
 * public endpoint) and by tm-cron.php (the 15-minute cron), so nothing here may
 * echo or exit.
 *
 * SOURCE: MET Norway Locationforecast 2.0 "complete", for Bournemouth Pier.
 * Chosen 16 Sep 2026 on licence grounds:
 *  - MET Norway data is CC BY 4.0: commercial use allowed with attribution, a
 *    link to the licence, and a note that we changed it (we group steps into
 *    days, round, and draw our own symbols). The panel carries all three.
 *  - Open-Meteo's free API is NON-COMMERCIAL only - this is a company website.
 *  - The Met Office DataHub needs an owner account/key; revisit if one lands.
 * MET's terms (api.met.no/doc/TermsOfService) that this file obeys:
 *  - identify with a User-Agent naming the site;
 *  - don't ask again before the Expires header; send If-Modified-Since with the
 *    exact Last-Modified we were given (a 304 costs them nothing);
 *  - coordinates to at most 4 decimals;
 *  - browsers must not call api.met.no directly: we are the caching proxy.
 *
 * HONESTY RULES (the section's taxonomy, seo-research/bournemouth-10x-plan.md):
 *  - everything here is a FORECAST and must wear the forecast chip (chip-f),
 *    never the measured chip or the measured colour. The build guard checks.
 *  - no probability-of-rain: this product does not supply one for Dorset (the
 *    field only exists for the Nordic model area). We show forecast millimetres
 *    and never invent a percentage.
 *  - issued > BMWX_STALE ago -> shown but flagged; > BMWX_DEAD -> not shown.
 *
 * SECURITY: bm-weather-cache.json / bm-weather-beat.json / bm-weather.lock hold
 * nothing sensitive (a public forecast), but are gitignored and denied in
 * .htaccess anyway, per the api/ store rule. Public surface = bm-weather.php.
 */

if (!defined('BMWX_URL'))       define('BMWX_URL', 'https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=50.7163&lon=-1.8762&altitude=5');
if (!defined('BMWX_UA'))        define('BMWX_UA', '365techies-bournemouth365/1.0 (+https://365techies.co.uk/bournemouth/)');
if (!defined('BMWX_MIN_GAP'))   define('BMWX_MIN_GAP', 10 * 60);   // never ask more often than this, whatever Expires says
if (!defined('BMWX_MAX_AGE'))   define('BMWX_MAX_AGE', 60 * 60);   // ask again after an hour if Expires was missing
if (!defined('BMWX_STALE'))     define('BMWX_STALE', 6 * 3600);    // model run older than this: flagged on the page
if (!defined('BMWX_DEAD'))      define('BMWX_DEAD', 24 * 3600);    // older than this: not shown at all
if (!defined('BMWX_DAYS'))      define('BMWX_DAYS', 10);
if (!defined('BMWX_HOURS'))     define('BMWX_HOURS', 24);

function bmwx_file() { return __DIR__ . '/bm-weather-cache.json'; }

function bmwx_load() {
    $c = file_exists(bmwx_file()) ? json_decode((string)@file_get_contents(bmwx_file()), true) : null;
    return is_array($c) ? $c : array();
}

function bmwx_save($c) {
    $tmp = bmwx_file() . '.' . getmypid() . '.tmp';
    if (@file_put_contents($tmp, json_encode($c), LOCK_EX) !== false) @rename($tmp, bmwx_file());
}

/** One conditional GET. Returns code, body, and the two caching headers. */
function bmwx_http($last_modified) {
    $hdr = array('expires' => '', 'last_modified' => '');
    $ch = @curl_init(BMWX_URL);
    if (!$ch) return array('code' => 0, 'body' => '', 'hdr' => $hdr);
    $send = array('Accept: application/json');
    if ($last_modified !== '') $send[] = 'If-Modified-Since: ' . $last_modified;
    @curl_setopt_array($ch, array(
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 20,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_ENCODING => '',            // accept gzip - MET recommends it
        CURLOPT_HTTPHEADER => $send,
        CURLOPT_USERAGENT => BMWX_UA,
        CURLOPT_HEADERFUNCTION => function ($ch, $line) use (&$hdr) {
            $p = strpos($line, ':');
            if ($p !== false) {
                $k = strtolower(trim(substr($line, 0, $p)));
                $v = trim(substr($line, $p + 1));
                if ($k === 'expires') $hdr['expires'] = $v;
                if ($k === 'last-modified') $hdr['last_modified'] = $v;
            }
            return strlen($line);
        },
    ));
    $body = @curl_exec($ch);
    $code = (int)@curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    @curl_close($ch);
    return array('code' => $code, 'body' => ($body === false ? '' : $body), 'hdr' => $hdr);
}

/**
 * MET's timeseries -> what the panel draws: the next 24 hourly steps and up to
 * 10 days. Days are Europe/London calendar days. Rain is summed without double
 * counting (hourly buckets while they exist, then the 6-hour buckets). A day's
 * symbol is the 6-hour summary nearest local midday - the daytime weather,
 * which is what someone planning the beach means by "Saturday".
 */
function bmwx_parse($j) {
    if (!isset($j['properties']['timeseries']) || !is_array($j['properties']['timeseries'])) return null;
    $ts = $j['properties']['timeseries'];
    $issued = isset($j['properties']['meta']['updated_at']) ? $j['properties']['meta']['updated_at'] : '';
    if (!$issued || !count($ts)) return null;

    $tz = new DateTimeZone('Europe/London');
    $hours = array();
    $days = array();
    $covered = 0;

    foreach ($ts as $s) {
        if (!isset($s['time'], $s['data']['instant']['details'])) continue;
        $t = strtotime($s['time']);
        if (!$t) continue;
        $det = $s['data']['instant']['details'];
        if (!isset($det['air_temperature'])) continue;
        $n1 = isset($s['data']['next_1_hours']) ? $s['data']['next_1_hours'] : null;
        $n6 = isset($s['data']['next_6_hours']) ? $s['data']['next_6_hours'] : null;

        $dt = new DateTime('@' . $t);
        $dt->setTimezone($tz);
        $dkey = $dt->format('Y-m-d');
        $hr = (int)$dt->format('G');
        $temp = (float)$det['air_temperature'];
        $wind = isset($det['wind_speed']) ? (float)$det['wind_speed'] : 0.0;
        $dir = isset($det['wind_from_direction']) ? (int)round($det['wind_from_direction']) : null;

        // up to 50 hourly steps: the hub panel shows 24, the weather page's meteogram shows 48
        if ($n1 && isset($n1['summary']['symbol_code']) && count($hours) < 50) {
            $hours[] = array(
                't' => date('c', $t),
                'temp' => round($temp, 1),
                'feels' => isset($det['apparent_air_temperature']) ? round((float)$det['apparent_air_temperature'], 1) : null,
                'sym' => $n1['summary']['symbol_code'],
                'rain' => round(isset($n1['details']['precipitation_amount']) ? (float)$n1['details']['precipitation_amount'] : 0, 1),
                'wind' => round($wind, 1),
                'dir' => $dir,
                'cloud' => isset($det['cloud_area_fraction']) ? (int)round($det['cloud_area_fraction']) : null,
                // clear-sky UV: what the UV would be with no cloud - the page labels it that way
                'uv' => isset($det['ultraviolet_index_clear_sky']) ? round((float)$det['ultraviolet_index_clear_sky'], 1) : null,
                'rh' => isset($det['relative_humidity']) ? (int)round($det['relative_humidity']) : null,
                'pres' => isset($det['air_pressure_at_sea_level']) ? round((float)$det['air_pressure_at_sea_level']) : null,
                'dew' => isset($det['dew_point_temperature']) ? round((float)$det['dew_point_temperature'], 1) : null,
            );
        }

        if (!isset($days[$dkey])) {
            $days[$dkey] = array('d' => $dkey, 'hi' => -99.0, 'lo' => 99.0, 'rain' => 0.0,
                'wind' => 0.0, 'dir' => null, 'sym' => null, 'score' => 99, 'first' => $hr, 'steps' => 0);
        }
        $D =& $days[$dkey];
        $D['steps']++;
        if ($temp > $D['hi']) $D['hi'] = $temp;
        if ($temp < $D['lo']) $D['lo'] = $temp;
        if ($wind > $D['wind']) { $D['wind'] = $wind; $D['dir'] = $dir; }

        if ($n1 && $t >= $covered) {
            $D['rain'] += isset($n1['details']['precipitation_amount']) ? (float)$n1['details']['precipitation_amount'] : 0;
            $covered = $t + 3600;
        } elseif (!$n1 && $n6 && $t >= $covered) {
            $D['rain'] += isset($n6['details']['precipitation_amount']) ? (float)$n6['details']['precipitation_amount'] : 0;
            $covered = $t + 6 * 3600;
            // In the six-hourly part of the run the instants are 6 h apart, so
            // the block's own max/min carry the real daytime peak.
            if (isset($n6['details']['air_temperature_max']) && $n6['details']['air_temperature_max'] > $D['hi']) $D['hi'] = (float)$n6['details']['air_temperature_max'];
            if (isset($n6['details']['air_temperature_min']) && $n6['details']['air_temperature_min'] < $D['lo']) $D['lo'] = (float)$n6['details']['air_temperature_min'];
        }
        if ($n6 && isset($n6['summary']['symbol_code'])) {
            $score = abs($hr - 12);
            if ($score < $D['score']) { $D['score'] = $score; $D['sym'] = $n6['summary']['symbol_code']; }
        } elseif ($D['sym'] === null && $n1 && isset($n1['summary']['symbol_code'])) {
            $D['sym'] = $n1['summary']['symbol_code'];
        }
        unset($D);
    }

    $outDays = array();
    $i = 0;
    foreach ($days as $D) {
        // the run's last instant is usually a lone step just after midnight -
        // one reading is not a day, so it is dropped rather than drawn as one
        if ($i > 0 && $D['steps'] < 3) continue;
        if ($D['sym'] === null) continue;
        $outDays[] = array(
            'd' => $D['d'],
            'part' => ($i === 0 && $D['first'] >= 9),   // "rest of today"
            'hi' => round($D['hi'], 1), 'lo' => round($D['lo'], 1),
            'rain' => round($D['rain'], 1),
            'wind' => round($D['wind'], 1), 'dir' => $D['dir'],
            'sym' => $D['sym'],
        );
        $i++;
        if (count($outDays) >= BMWX_DAYS) break;
    }
    if (!count($hours) || !count($outDays)) return null;
    return array('issued' => $issued, 'hours' => $hours, 'days' => $outDays);
}

/** Cron + first-visitor refresh. Obeys Expires, a minimum gap, and a lock. */
function bm_weather_refresh($force = false) {
    $lk = @fopen(__DIR__ . '/bm-weather.lock', 'c');
    if (!$lk || !@flock($lk, LOCK_EX | LOCK_NB)) return array('busy' => true);

    $c = bmwx_load();
    $now = time();
    $expires = isset($c['expires_at']) ? (int)$c['expires_at'] : 0;
    $fetched = isset($c['fetched_at']) ? (int)$c['fetched_at'] : 0;
    $tried = isset($c['tried_at']) ? (int)$c['tried_at'] : 0;
    $due = empty($c['model']) || $now >= $expires || ($now - $fetched) >= BMWX_MAX_AGE;

    if (!$force && (!$due || ($now - $tried) < BMWX_MIN_GAP)) {
        @flock($lk, LOCK_UN); @fclose($lk);
        return array('skipped' => true);
    }
    $c['tried_at'] = $now;

    $lm = (!empty($c['model']) && isset($c['last_modified'])) ? (string)$c['last_modified'] : '';
    $r = bmwx_http($lm);
    $did = 'fail';

    if ($r['code'] === 304 && !empty($c['model'])) {
        $did = 'not-modified';
    } elseif (($r['code'] === 200 || $r['code'] === 203) && $r['body'] !== '') {
        $j = json_decode($r['body'], true);
        $m = is_array($j) ? bmwx_parse($j) : null;
        if ($m) {
            $c['model'] = $m;
            $c['last_modified'] = $r['hdr']['last_modified'];
            $did = ($r['code'] === 203) ? 'ok-deprecated' : 'ok';   // 203 = MET says this product version is being retired
        } else {
            $c['last_error'] = 'unreadable forecast';
        }
    } else {
        $c['last_error'] = 'http ' . $r['code'];   // 429 = too many requests: the gap above backs us off
    }

    if ($did !== 'fail') {
        $c['fetched_at'] = $now;
        $c['fail_since'] = 0;
        unset($c['last_error']);
        $e = $r['hdr']['expires'] !== '' ? strtotime($r['hdr']['expires']) : 0;
        $c['expires_at'] = ($e && $e > $now) ? $e : $now + BMWX_MAX_AGE;
    } elseif (empty($c['fail_since'])) {
        $c['fail_since'] = $now;
    }
    bmwx_save($c);

    $beat = __DIR__ . '/bm-weather-beat.json';
    $tmp = $beat . '.tmp';
    if (@file_put_contents($tmp, json_encode(array('t' => $now, 'at' => date('Y-m-d H:i'), 'did' => $did))) !== false) {
        @rename($tmp, $beat);
    }
    @flock($lk, LOCK_UN); @fclose($lk);
    return array('refreshed' => $did);
}

/** The weather page's version: the same honesty rules, 48 hourly steps instead of 24. */
function bm_weather_public_full() {
    return bm_weather_public(48);
}

/** The public JSON. Staleness is applied at READ time, so honesty does not depend on cron. */
function bm_weather_public($maxHours = BMWX_HOURS) {
    $c = bmwx_load();
    $now = time();
    $src = array(
        'name' => 'MET Norway (the Norwegian Meteorological Institute)',
        'product' => 'Locationforecast 2.0',
        'place' => 'Bournemouth Pier',
        'licence' => 'CC BY 4.0',
        'licence_url' => 'https://creativecommons.org/licenses/by/4.0/',
        'url' => 'https://www.met.no/en',
    );
    if (empty($c['model']['issued'])) {
        return array('ok' => false, 'error' => 'no forecast yet', 'source' => $src);
    }
    $issued = strtotime($c['model']['issued']);
    if (!$issued || ($now - $issued) > BMWX_DEAD) {
        return array('ok' => false, 'error' => 'forecast too old to show', 'source' => $src);
    }
    // hours already past drop off at read time (the cache can be up to an hour old)
    $hours = array();
    foreach ($c['model']['hours'] as $h) {
        if (strtotime($h['t']) + 3600 > $now) $hours[] = $h;
        if (count($hours) >= $maxHours) break;
    }
    $today = date('Y-m-d');   // Europe/London (set by the endpoint)
    $days = array();
    foreach ($c['model']['days'] as $d) {
        if ($d['d'] >= $today) $days[] = $d;
    }
    if (!count($hours) || !count($days)) {
        return array('ok' => false, 'error' => 'forecast has run out', 'source' => $src);
    }
    $out = array(
        'ok' => true,
        'issued' => date('c', $issued),
        'stale' => ($now - $issued) > BMWX_STALE,
        'served' => date('c', $now),
        'source' => $src,
        'hours' => $hours,
        'days' => $days,
    );
    if (!empty($c['fail_since'])) $out['failing_since'] = date('c', (int)$c['fail_since']);
    return $out;
}
