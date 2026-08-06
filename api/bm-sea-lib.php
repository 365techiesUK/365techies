<?php
/**
 * Bournemouth365 sea-conditions data layer.
 *
 * Feeds /bournemouth/sea-today/ - the page whose entire pitch is MEASURED
 * data with timestamps, against the "estimated model" aggregator sites that
 * own the SERP. That pitch dies the first time this layer lies, so:
 *
 * THE DEGRADED-STATE DOCTRINE (non-negotiable, applies to every block):
 *   - Every reading carries the time IT WAS MEASURED (`read_at`), not the
 *     time we fetched it.
 *   - A block that cannot be refreshed keeps its last good data but gets
 *     `stale: true` once the reading is older than its honesty window. The
 *     page then SAYS "last reading HH:MM" instead of presenting it as now.
 *   - A block with no good data at all is `ok: false` with a plain reason.
 *     The page renders "buoy offline" - it never invents, never guesses,
 *     and never renders old data as fresh. Silence looks identical to
 *     failure, which is exactly how the portal beacon hid for a month -
 *     hence the beat file below.
 *
 * WIRING: refreshed from tm-cron.php (the bkpend pattern - ABOVE the SMS
 * gate, nothing here may echo or exit); served to the page by bm-sea.php
 * (same-origin fetch - the SiteGround WAF 202s cross-origin scripts but
 * leaves same-origin browser fetches alone, proven by the booking app).
 *
 * SECURITY: bm-sea-cache.json + the beat file hold nothing sensitive, but
 * they are working files, not documents - both are in the root .htaccess
 * deny list (the pcm-bkpoll lesson: every new api/ write goes in the list),
 * and gitignored. The public surface is the bm-sea.php endpoint only.
 *
 * UPSTREAMS are registered in bm_sea_sources(). Each fetcher returns either
 *   array('ok' => true, 'read_at' => <ISO8601 of the MEASUREMENT>, ...data)
 * or
 *   array('ok' => false, 'error' => '<short reason>')
 * and never throws. Attribution: the feed carries station/source labels only;
 * the mandated CCO/Cefas/EA/Wessex attribution SENTENCES are rendered by the
 * page itself (bournemouth_data.py) - they are licence conditions, and the
 * page, not this feed, is the licensed display surface.
 */

if (!defined('BMSEA_TTL'))   define('BMSEA_TTL', 20 * 60);    // refresh cadence
if (!defined('BMSEA_STALE')) define('BMSEA_STALE', 2 * 3600); // reading older than this = stale

function bmsea_file() { return __DIR__ . '/bm-sea-cache.json'; }

function bmsea_load() {
    $c = file_exists(bmsea_file()) ? json_decode((string)@file_get_contents(bmsea_file()), true) : null;
    return is_array($c) ? $c : array();
}

function bmsea_save($c) {
    $tmp = bmsea_file() . '.' . getmypid() . '.tmp';
    if (@file_put_contents($tmp, json_encode($c), LOCK_EX) !== false) @rename($tmp, bmsea_file());
}

function bmsea_http_json($url, $timeout = 20, $headers = array()) {
    // One retry: the EA endpoints were observed answering 503 then 502 then
    // succeeding during research - a single-shot fetch would mark blocks
    // offline on what is really a hiccup. Cron context, so the extra seconds
    // cost nobody.
    for ($attempt = 0; $attempt < 2; $attempt++) {
        $ch = @curl_init($url);
        if (!$ch) return null;
        @curl_setopt_array($ch, array(
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => $timeout,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS => 3,
            CURLOPT_HTTPHEADER => array_merge(array('Accept: application/json'), $headers),
            CURLOPT_USERAGENT => '365techies-bournemouth365/1.0 (+https://365techies.co.uk/bournemouth/sea-today/)',
        ));
        $body = @curl_exec($ch);
        $code = (int)@curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        @curl_close($ch);
        if ($body !== false && $code >= 200 && $code < 300) {
            $j = json_decode($body, true);
            if (is_array($j)) return $j;
        }
        if ($attempt === 0) sleep(2);
    }
    return null;
}

/**
 * Source registry. Every endpoint below was probed live on 2026-08-02 with its
 * real response shape recorded in seo-research/sea-today-sources.md. Licences:
 * CCO = OGL v3 with a MANDATORY verbatim attribution sentence; EA = OGL v3
 * with their documented attribution lines; Wessex = CC BY 4.0. The page
 * renders all of them - they are licence conditions, not courtesy credits.
 */
function bm_sea_sources() {
    return array(
        'sea'      => 'bmsea_fetch_buoy',      // measured waves + sea temp
        'bathing'  => 'bmsea_fetch_bathing',   // EA classification + pollution risk
        'overflow' => 'bmsea_fetch_overflow',  // Wessex storm-overflow live status
        'tide'     => 'bmsea_fetch_tide',      // EA gauge ON the pier - measured level
    );
}

/**
 * CCO API key for 365techies.co.uk - server-only file, gitignored and
 * .htaccess-denied, read by pattern like every other secret here (never
 * require()d). Free registration: coastalmonitoring.org/ccoresources/api/
 * (reCAPTCHA form - the owner does it once). File content: the key on its
 * own line, nothing else needed.
 */
function bmsea_cco_key() {
    $f = __DIR__ . '/bm-sea-key.php';
    if (!file_exists($f)) return '';
    if (preg_match('/([a-f0-9]{24,40})/i', (string)@file_get_contents($f), $m)) return $m[1];
    return '';
}

/**
 * Waves + sea temperature, MEASURED.
 * Primary: CCO's Boscombe Datawell buoy (needs our key; Referer must match
 * the key's registered domain - we send it from curl).
 * Fallback until the key exists: Cefas's own Poole Bay WaveNet buoy
 * (POOLEBAYWN, ~11 km SSE of Boscombe, OGL per its own licence download,
 * acknowledgement given on the page). The block names its station so the
 * page never implies Boscombe when serving Poole Bay.
 * ⚠️ Do NOT "simplify" to WaveNet's Boscombe (208/EXT) feed: it is display-
 * restricted AND its sea temperature is demonstrably wrong (11.95°C vs the
 * buoy's real 21.6°C, caught live during research).
 */
function bmsea_fetch_buoy() {
    $key = bmsea_cco_key();
    if ($key !== '') {
        // duration=25h -> ~50 half-hourly readings in one call: the newest is
        // the headline, the rest become the measured 24h trend series.
        $j = bmsea_http_json(
            'https://coastalmonitoring.org/observations/waves/latest.geojson?key=' . rawurlencode($key) . '&sensor=Boscombe&duration=25',
            15, array('Referer: https://365techies.co.uk/'));
        $feats = (is_array($j) && isset($j['features']) && is_array($j['features'])) ? $j['features'] : array();
        $reads = array();
        foreach ($feats as $f) {
            $p = isset($f['properties']) ? $f['properties'] : null;
            if (!is_array($p) || !isset($p['date']) || !isset($p['sst']) || !isset($p['hs'])) continue;
            if (!preg_match('/^(\d{4})(\d{2})(\d{2})#(\d{2})(\d{2})(\d{2})$/', $p['date'], $m)) continue;
            $t = gmmktime((int)$m[4], (int)$m[5], (int)$m[6], (int)$m[2], (int)$m[3], (int)$m[1]);
            $reads[$t] = $p;
        }
        if ($reads) {
            ksort($reads);
            $times = array_keys($reads);
            $tN = end($times);
            $p = $reads[$tN];
            $series = array();
            foreach (array_slice($times, -48) as $t) {
                $r = $reads[$t];
                $series[] = array(gmdate('c', $t), round((float)$r['sst'], 2), round((float)$r['hs'], 2));
            }
            return array('ok' => true, 'read_at' => gmdate('c', $tN),
                'tempC' => round((float)$p['sst'], 1), 'hs' => round((float)$p['hs'], 2),
                'hmax' => isset($p['hmax']) ? round((float)$p['hmax'], 2) : null,
                'tp' => isset($p['tp']) ? round((float)$p['tp'], 1) : null,
                'tz' => isset($p['tz']) ? round((float)$p['tz'], 1) : null,
                'dirFromMag' => isset($p['pdir']) ? (int)round((float)$p['pdir']) : null,
                'series' => $series,
                'station' => 'Boscombe wave buoy', 'source' => 'cco');
        }
        // fall through to the fallback buoy rather than dying with a key present
    }

    // Cefas Poole Bay buoy. The response is already an array of recent
    // readings; :00 rows sometimes carry only Hm0/TEMP/Tz (hasSpectra false,
    // empty strings elsewhere). Newest valid row = headline; every valid row
    // with height + temperature joins the measured trend series.
    $j = bmsea_http_json('https://wavenet-api.cefas.co.uk/api/Detail/Results/POOLEBAYWN/INT?showForecast=false');
    if (is_array($j)) {
        $reads = array();
        foreach ($j as $row) {
            if (!is_array($row) || empty($row['timestamp']) || !empty($row['isForecast'])) continue;
            $vals = array();
            foreach ((isset($row['results']) && is_array($row['results'])) ? $row['results'] : array() as $r) {
                if (isset($r['identifier']) && isset($r['value']) && $r['value'] !== '') {
                    $vals[$r['identifier']] = (float)$r['value'];
                }
            }
            if (!isset($vals['Hm0']) || !isset($vals['TEMP'])) continue;
            $t = strtotime($row['timestamp'] . ' UTC');
            if ($t) $reads[$t] = $vals;
        }
        if ($reads) {
            ksort($reads);
            $times = array_keys($reads);
            $tN = end($times);
            $vals = $reads[$tN];
            $series = array();
            foreach (array_slice($times, -48) as $t) {
                $v = $reads[$t];
                $series[] = array(gmdate('c', $t), round($v['TEMP'], 2), round($v['Hm0'], 2));
            }
            return array('ok' => true,
                'read_at' => gmdate('c', $tN),
                'tempC' => round($vals['TEMP'], 1), 'hs' => round($vals['Hm0'], 2),
                'hmax' => null,
                'tp' => isset($vals['Tpeak']) ? round($vals['Tpeak'], 1) : null,
                'tz' => isset($vals['Tz']) ? round($vals['Tz'], 1) : null,
                'dirFromMag' => isset($vals['W_PDIR']) ? (int)round($vals['W_PDIR']) : null,
                'series' => $series,
                'station' => 'Poole Bay wave buoy', 'source' => 'cefas');
        }
    }
    return array('ok' => false, 'error' => 'buoy unreachable');
}

/** Unwrap the EA Linked-Data-API style: values as {_value}, single-or-array. */
function bmsea_lda($v, $path) {
    foreach ($path as $k) {
        if (is_array($v) && isset($v[0]) && !isset($v[$k])) $v = $v[0];   // array-of-one
        if (!is_array($v) || !isset($v[$k])) return null;
        $v = $v[$k];
    }
    if (is_array($v) && isset($v[0]) && !isset($v['_value'])) $v = $v[0];
    if (is_array($v) && isset($v['_value'])) return $v['_value'];
    return is_scalar($v) ? $v : null;
}

/**
 * EA Bathing Water: the seven Bournemouth sites, west to east. One GET per
 * site gives classification + the live pollution-risk forecast (PRF).
 * ⚠️ PRF carries its own expiry (daily ~08:29 in season) - the page renders
 * it ONLY while now < expires; an expired forecast displays as "no current
 * forecast", never as today's. Enforced at read time in bm_sea_public.
 */
function bmsea_fetch_bathing() {
    $sites = array(
        // id => display name (official names, incl. the backtick in Fisherman`s Walk, displayed apostrophised)
        'ukk2101-19160' => 'Alum Chine',
        'ukk2101-19150' => 'Durley Chine',
        'ukk2101-19100' => 'Bournemouth Pier',
        'ukk2101-19060' => 'Boscombe Pier',
        'ukk2101-19050' => 'Manor Steps',
        'ukk2101-19030' => "Fisherman's Walk",
        'ukk2101-19020' => 'Southbourne',
    );
    $out = array();
    foreach ($sites as $id => $name) {
        $j = bmsea_http_json('https://environment.data.gov.uk/doc/bathing-water/' . $id . '.json');
        $p = is_array($j) && isset($j['result']['primaryTopic']) ? $j['result']['primaryTopic'] : null;
        if (!$p) continue;
        $cls = bmsea_lda($p, array('latestComplianceAssessment', 'complianceClassification', 'name'));
        // classification year lives in the assessment URI (...year/2025)
        $yr = null;
        if (isset($p['latestComplianceAssessment'])) {
            $uri = bmsea_lda($p, array('latestComplianceAssessment', '_about'));
            if (!$uri && isset($p['latestComplianceAssessment']['_about'])) $uri = $p['latestComplianceAssessment']['_about'];
            if (is_string($uri) && preg_match('#/year/(\d{4})#', $uri, $m)) $yr = (int)$m[1];
        }
        $site = array('name' => $name, 'id' => $id,
                      'class' => is_string($cls) ? $cls : null, 'classYear' => $yr,
                      'heavyRain' => (bool)bmsea_lda($p, array('waterQualityImpactedByHeavyRain')));
        $lvl = bmsea_lda($p, array('latestRiskPrediction', 'riskLevel', 'name'));
        $exp = bmsea_lda($p, array('latestRiskPrediction', 'expiresAt'));
        if (is_string($lvl) && is_string($exp)) {
            $site['prf'] = array('level' => $lvl, 'expires' => $exp);
        }
        $out[] = $site;
    }
    if (!$out) return array('ok' => false, 'error' => 'EA bathing API unreachable');
    return array('ok' => true, 'read_at' => gmdate('c'), 'sites' => $out);
}

/**
 * Wessex Water storm-overflow monitors on the seafront (CC BY 4.0, 5-min
 * refresh, powers the national Storm Overflow Hub). Status domain verified on
 * the layer: 1 = discharging, 0 = stopped, -1 = monitor offline.
 */
function bmsea_fetch_overflow() {
    $u = 'https://services.arcgis.com/3SZ6e0uCvPROr4mS/arcgis/rest/services/Wessex_Water_Storm_Overflow_Activity/FeatureServer/0/query'
       . '?where=1%3D1&geometry=-1.92,50.70,-1.74,50.74&geometryType=esriGeometryEnvelope&inSR=4326&outFields=*&outSR=4326&f=json';
    $j = bmsea_http_json($u);
    if (!is_array($j) || !isset($j['features']) || !is_array($j['features'])) {
        return array('ok' => false, 'error' => 'overflow feed unreachable');
    }
    $mons = array(); $discharging = 0; $offline = 0; $newest = 0;
    foreach ($j['features'] as $f) {
        $a = isset($f['attributes']) ? $f['attributes'] : null;
        if (!is_array($a) || !isset($a['Status'])) continue;
        $st = (int)$a['Status'];
        if ($st === 1) $discharging++;
        if ($st === -1) $offline++;
        $since = isset($a['StatusStart']) ? (int)($a['StatusStart'] / 1000) : 0;
        $upd = isset($a['LastUpdated']) ? (int)($a['LastUpdated'] / 1000) : 0;
        if ($upd > $newest) $newest = $upd;
        $mons[] = array('id' => isset($a['Id']) ? $a['Id'] : '?', 'status' => $st,
                        'since' => $since ? gmdate('c', $since) : null);
    }
    if (!$mons) return array('ok' => false, 'error' => 'no monitors in range');
    return array('ok' => true, 'read_at' => $newest ? gmdate('c', $newest) : gmdate('c'),
                 'monitors' => $mons, 'discharging' => $discharging, 'offline' => $offline,
                 'total' => count($mons));
}

/**
 * The EA tide gauge physically at Bournemouth Pier (E71939): MEASURED water
 * level every 15 min, in metres above Ordnance Datum. Every competitor tide
 * widget is a harmonic prediction; this is a gauge. Two newest readings give
 * the trend. EA documented guidance: not for safety-critical use - the page
 * carries that caveat.
 */
function bmsea_fetch_tide() {
    // 100 x 15-min readings = the last ~25 hours: headline + trend + a full
    // measured tide curve for the chart (a curve every competitor fakes with
    // harmonic predictions; ours is the gauge on the pier).
    $j = bmsea_http_json('https://environment.data.gov.uk/flood-monitoring/id/measures/E71939-level-tidal_level-Mean-15_min-mAOD/readings?_sorted&_limit=100');
    $items = is_array($j) && isset($j['items']) && is_array($j['items']) ? $j['items'] : array();
    $reads = array();
    foreach ($items as $it) {
        if (isset($it['dateTime']) && isset($it['value']) && is_numeric($it['value'])) {
            $reads[] = array('t' => $it['dateTime'], 'v' => (float)$it['value']);
        }
    }
    if (!$reads) return array('ok' => false, 'error' => 'tide gauge unreachable');
    $trend = 'steady';
    if (count($reads) >= 2) {
        $d = $reads[0]['v'] - $reads[1]['v'];
        if ($d > 0.03) $trend = 'rising';
        elseif ($d < -0.03) $trend = 'falling';
    }
    $series = array();
    foreach (array_reverse(array_slice($reads, 0, 96)) as $r) {   // ascending for drawing
        $series[] = array($r['t'], round($r['v'], 2));
    }
    return array('ok' => true, 'read_at' => gmdate('c', strtotime($reads[0]['t'])),
                 'levelMAOD' => round($reads[0]['v'], 2), 'trend' => $trend,
                 'series' => $series,
                 'station' => 'Bournemouth Pier tide gauge');
}

/**
 * Refresh every source whose data is older than BMSEA_TTL. Failures keep the
 * last good block and mark it honestly. Called from cron; never echoes.
 */
function bm_sea_refresh() {
    $lk = @fopen(__DIR__ . '/bm-sea.lock', 'c');
    if (!$lk || !@flock($lk, LOCK_EX | LOCK_NB)) return array('busy' => true);

    $c = bmsea_load();
    $now = time();
    $did = array();

    foreach (bm_sea_sources() as $key => $fn) {
        $blk = isset($c[$key]) ? $c[$key] : array();
        $fetched_at = isset($blk['fetched_at']) ? (int)$blk['fetched_at'] : 0;
        if ($now - $fetched_at < BMSEA_TTL) continue;

        $r = is_callable($fn) ? call_user_func($fn) : array('ok' => false, 'error' => 'no fetcher');

        if (is_array($r) && !empty($r['ok'])) {
            $r['fetched_at'] = $now;
            $r['fail_since'] = 0;
            $c[$key] = $r;
            $did[] = $key;
        } else {
            // keep the last good reading, but record when refreshing started
            // failing so the endpoint can mark it stale/offline honestly
            if (!isset($blk['fail_since']) || !$blk['fail_since']) $blk['fail_since'] = $now;
            $blk['fetched_at'] = $now;   // don't hammer a down upstream every tick
            $blk['last_error'] = is_array($r) && isset($r['error']) ? $r['error'] : 'fetch failed';
            $c[$key] = $blk;
            $did[] = $key . ':FAIL';
        }
    }
    bmsea_save($c);

    /* Proof of life - same reasoning as the bkpend beat: "refreshed fine" and
       "cron never ran" must not look identical from outside. */
    $beat = __DIR__ . '/bm-sea-beat.json';
    $tmp = $beat . '.tmp';
    if (@file_put_contents($tmp, json_encode(array(
            't' => $now, 'at' => date('Y-m-d H:i'), 'did' => $did))) !== false) {
        @rename($tmp, $beat);
    }

    @flock($lk, LOCK_UN); @fclose($lk);
    return array('refreshed' => $did);
}

/**
 * The public JSON blob for the page. Applies the staleness doctrine at READ
 * time so honesty does not depend on the cron having run recently.
 */
function bm_sea_public() {
    $c = bmsea_load();
    $now = time();
    $out = array('at' => date('c', $now));

    foreach (array_keys(bm_sea_sources()) as $key) {
        $blk = isset($c[$key]) ? $c[$key] : null;
        if (!is_array($blk) || empty($blk['ok'])) {
            $out[$key] = array('ok' => false,
                'error' => is_array($blk) && isset($blk['last_error']) ? $blk['last_error'] : 'no data');
            continue;
        }
        $pub = $blk;
        unset($pub['fetched_at'], $pub['fail_since'], $pub['last_error']);
        $read = isset($blk['read_at']) ? strtotime($blk['read_at']) : 0;
        $pub['stale'] = ($read > 0) ? (($now - $read) > BMSEA_STALE) : true;
        // A pollution-risk forecast past its own expiry must never reach the
        // page. The page JS also checks - this is defence in depth, and makes
        // the comment at the prf fetcher true on the server as well.
        if ($key === 'bathing' && isset($pub['sites']) && is_array($pub['sites'])) {
            foreach ($pub['sites'] as $si => $sv) {
                if (isset($sv['prf']['expires']) && strtotime($sv['prf']['expires']) <= $now) {
                    unset($pub['sites'][$si]['prf']);
                }
            }
        }
        if (!empty($blk['fail_since'])) $pub['failing_since'] = date('c', $blk['fail_since']);
        $out[$key] = $pub;
    }
    return $out;
}
