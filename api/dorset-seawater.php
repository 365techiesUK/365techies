<?php
/*
 * Sea water quality for the conurbation's beaches: two published facts, relayed.
 *
 *   1. The Environment Agency's bathing-water status for every designated
 *      beach in the box - today's pollution-risk forecast (normal / increased,
 *      with the time it expires), the latest annual classification, and
 *      whether the EA flags the beach as affected by heavy rain.
 *      Keyless. Open Government Licence v3.0.
 *   2. Storm overflow activity from the water companies' near-real-time Event
 *      Duration Monitoring feeds - Wessex Water for almost all of BCP, Southern
 *      Water for the eastern edge past Highcliffe - as published to Water UK's
 *      National Storm Overflow Hub through Stream. CC BY 4.0. Wessex says its
 *      feed refreshes every 5 minutes and reflects a start/stop within an hour.
 *
 * ⚠️ THIS ENDPOINT NEVER SAYS "SAFE". It carries what the EA and the companies
 * state, with their timestamps, and the map names them as the source. A
 * "safe to swim" verdict from us would be the same uninsurable claim as
 * "safe to drive" (CRA 2015 s.65: liability for personal injury cannot be
 * excluded by any notice). Relay, attribute, date. Nothing else.
 *
 * ⚠️ THE EA LISTING CANNOT BE FILTERED BY AREA (lat/long/dist answers 400) and
 * `_properties` does not shrink it: the national listing is ~1.7 MB however it
 * is asked for, and takes about 1.5 s. So, exactly as dorset-water.php does
 * with the EA readings, it is refreshed under a lock by whoever arrives first
 * after it expires and everyone else is served the box-filtered copy already
 * on disk. Forecasts change once a day (~08:30), so a 15-minute cache loses
 * nothing. Times from the EA carry no zone and are UK local.
 *
 * ⚠️ OVERFLOW STATUS CODES follow the National Storm Overflow Hub convention:
 * 1 = discharging, 0 = not discharging, -1 = monitor offline. Anything else is
 * passed through as 'unknown' - never guessed into one of the three. On the
 * day this was written the live Wessex feed held only 0 and -1.
 *
 * For a guaranteed-warm cache, call from the existing 5-minute cron:
 *     php /home/.../api/dorset-seawater.php refresh
 *
 * NO closing tag in this file.
 */
error_reporting(0);
require __DIR__ . '/dorset-lib.php';

$CACHE = __DIR__ . '/dorset-seawater-cache.json';      // assembled GeoJSON
$EA    = __DIR__ . '/dorset-seawater-ea-cache.json';   // EA beaches, box-filtered
$RATE  = __DIR__ . '/dorset-seawater-rate.json';
$LOCK  = __DIR__ . '/dorset-seawater-ea.lock';

$OUTPUT_TTL   = 300;      // same as the other layers; the overflow feeds move every 5 min
$EA_TTL       = 900;      // a forecast changes once a day
$EA_STALE_MAX = 86400;    // an old forecast is still shown WITH its expiry; the client withholds past it

define('WESSEX_BASE', 'https://services.arcgis.com/3SZ6e0uCvPROr4mS/arcgis/rest/services/Wessex_Water_Storm_Overflow_Activity/FeatureServer');
define('WESSEX_PAGE', 'https://www.streamwaterdata.co.uk/datasets/632885799ff946cd86200f07b7f175fb_0/explore');
define('SOUTHERN_BASE', 'https://services-eu1.arcgis.com/6qJmARkS2dt2IjVA/arcgis/rest/services/SouthernWater_StormOverflowActivity_PROD_view/FeatureServer');
define('SOUTHERN_PAGE', 'https://www.streamwaterdata.co.uk/datasets/7f5ee61ab15d4c79a3f708ccf448a810_0/explore');

$CLI   = (PHP_SAPI === 'cli');
$FORCE = $CLI && isset($argv[1]) && $argv[1] === 'refresh';

$EMPTY = array('ok' => false, 'type' => 'FeatureCollection', 'features' => array());

if (!$FORCE) {
    $fresh = dorset_cache_get($CACHE, $OUTPUT_TTL);
    if ($fresh !== null) dorset_send($fresh);
    if (!dorset_rate_ok($RATE, 12)) dorset_degrade($CACHE, 'rate', $EMPTY);
}

/* ---------------------------------------------------------------- helpers */

/** The EA's linked-data JSON wraps text three ways: a string, {_value}, or a list of those. */
function sw_txt($v) {
    if (is_string($v) || is_numeric($v)) return (string)$v;
    if (!is_array($v)) return null;
    if (isset($v['_value'])) return (string)$v['_value'];
    if (isset($v['name']))   return sw_txt($v['name']);
    if (isset($v['label']))  return sw_txt($v['label']);
    if (array_key_exists(0, $v)) return sw_txt($v[0]);
    return null;
}

/** ArcGIS times are epoch milliseconds. */
function sw_iso_ms($ms) {
    return (is_numeric($ms) && $ms > 0) ? gmdate('c', (int)floor($ms / 1000)) : null;
}

function sw_status($s) {
    if (!is_numeric($s)) return 'unknown';
    $s = (int)$s;
    if ($s === 1)  return 'discharging';
    if ($s === 0)  return 'not-discharging';
    if ($s === -1) return 'offline';
    return 'unknown';
}

/* ------------------------------------------------------------ EA beaches */

/**
 * Refresh the box-filtered beach list, but only if this process can take the
 * lock. A second caller arriving mid-refresh serves the older copy rather
 * than starting a second 1.7 MB download.
 */
function sw_refresh_ea($file, $lock, $force) {
    $fh = @fopen($lock, 'c');
    if (!$fh) return;
    if (!@flock($fh, LOCK_EX | LOCK_NB)) { @fclose($fh); return; }
    if (!$force && dorset_cache_get($file, 900) !== null) {
        @flock($fh, LOCK_UN); @fclose($fh); return;
    }

    $url = 'https://environment.data.gov.uk/doc/bathing-water.json?_pageSize=500'
         . '&_properties=samplingPoint.lat,samplingPoint.long,'
         . 'latestRiskPrediction.riskLevel.name,latestRiskPrediction.expiresAt,'
         . 'latestComplianceAssessment.complianceClassification.name,'
         . 'waterQualityImpactedByHeavyRain,appointedSewerageUndertaker.name';
    $j = dorset_http_json($url, 40);

    if (is_array($j) && isset($j['result']['items']) && is_array($j['result']['items'])) {
        $beaches = array();
        foreach ($j['result']['items'] as $it) {
            if (!is_array($it) || !isset($it['_about']) || !is_string($it['_about'])) continue;
            $sp = (isset($it['samplingPoint']) && is_array($it['samplingPoint'])) ? $it['samplingPoint'] : array();
            $la = (isset($sp['lat'])  && is_numeric($sp['lat']))  ? (float)$sp['lat']  : null;
            $lo = (isset($sp['long']) && is_numeric($sp['long'])) ? (float)$sp['long'] : null;
            if ($la === null || $lo === null || !dorset_in_box($lo, $la)) continue;

            $id = substr(strrchr($it['_about'], '/'), 1);
            if ($id === false || $id === '') continue;

            $rp   = (isset($it['latestRiskPrediction']) && is_array($it['latestRiskPrediction'])) ? $it['latestRiskPrediction'] : array();
            $risk = isset($rp['riskLevel']) ? sw_txt($rp['riskLevel']) : null;
            $risk = ($risk === null) ? null : strtolower(trim($risk));
            $exp  = isset($rp['expiresAt']) ? sw_txt($rp['expiresAt']) : null;
            $cls  = isset($it['latestComplianceAssessment']['complianceClassification'])
                  ? sw_txt($it['latestComplianceAssessment']['complianceClassification']) : null;
            $name = sw_txt(isset($it['name']) ? $it['name'] : (isset($it['label']) ? $it['label'] : null));

            $beaches[] = array(
                'id'             => $id,
                'name'           => $name !== null ? $name : $id,
                'lat'            => round($la, 5),
                'lon'            => round($lo, 5),
                'risk'           => $risk,                 // 'normal' | 'increased' | null
                'riskExpires'    => $exp,                  // UK local, no zone - as the EA sends it
                'classification' => $cls,                  // Excellent / Good / Sufficient / Poor
                'rainAffected'   => isset($it['waterQualityImpactedByHeavyRain']) ? (bool)$it['waterQualityImpactedByHeavyRain'] : null,
                'sewerage'       => isset($it['appointedSewerageUndertaker']) ? sw_txt($it['appointedSewerageUndertaker']) : null,
            );
        }
        if (count($beaches)) dorset_cache_put($file, array('fetched' => gmdate('c'), 'beaches' => $beaches));
    }
    @flock($fh, LOCK_UN);
    @fclose($fh);
}

if ($FORCE || dorset_cache_get($EA, $EA_TTL) === null) {
    sw_refresh_ea($EA, $LOCK, $FORCE);
}
$ea = dorset_cache_stale($EA, $EA_STALE_MAX);
$beaches   = (is_array($ea) && isset($ea['beaches']) && is_array($ea['beaches'])) ? $ea['beaches'] : array();
$eaFetched = (is_array($ea) && isset($ea['fetched'])) ? $ea['fetched'] : null;

/* --------------------------------------------------------- overflows */

/**
 * One company's monitored outfalls inside the box, straight from its Stream
 * feature service. A failed company is recorded in $partial and returns
 * nothing - the other company and the beaches still go out, honestly labelled.
 */
function sw_fetch_overflows($base, $company, $page, &$partial) {
    $q = http_build_query(array(
        'where'             => '1=1',
        'geometry'          => DORSET_W . ',' . DORSET_S . ',' . DORSET_E . ',' . DORSET_N,
        'geometryType'      => 'esriGeometryEnvelope',
        'inSR'              => 4326,
        'outSR'             => 4326,
        'spatialRel'        => 'esriSpatialRelIntersects',
        'outFields'         => 'Id,Company,Status,StatusStart,LatestEventStart,LatestEventEnd,ReceivingWaterCourse,LastUpdated',
        'returnGeometry'    => 'true',
        'resultRecordCount' => 2000,
        'f'                 => 'json',
    ));
    $j = dorset_http_json($base . '/0/query?' . $q, 25);
    if (!is_array($j) || isset($j['error']) || !isset($j['features']) || !is_array($j['features'])) {
        $partial[] = $company;
        return array();
    }
    $out = array();
    foreach ($j['features'] as $f) {
        if (!is_array($f)) continue;
        $a = (isset($f['attributes']) && is_array($f['attributes'])) ? $f['attributes'] : array();
        $g = (isset($f['geometry'])   && is_array($f['geometry']))   ? $f['geometry']   : array();
        $lo = (isset($g['x']) && is_numeric($g['x'])) ? (float)$g['x']
            : ((isset($a['Longitude']) && is_numeric($a['Longitude'])) ? (float)$a['Longitude'] : null);
        $la = (isset($g['y']) && is_numeric($g['y'])) ? (float)$g['y']
            : ((isset($a['Latitude']) && is_numeric($a['Latitude'])) ? (float)$a['Latitude'] : null);
        if ($lo === null || $la === null || !dorset_in_box($lo, $la)) continue;
        $id = isset($a['Id']) ? trim((string)$a['Id']) : '';
        if ($id === '') continue;

        $out[] = array(
            'type'     => 'Feature',
            'id'       => 'overflow:' . $id,
            'geometry' => array('type' => 'Point', 'coordinates' => array(round($lo, 5), round($la, 5))),
            'properties' => array(
                'kind'             => 'overflow',
                'name'             => $id,
                'company'          => (isset($a['Company']) && $a['Company'] !== '') ? (string)$a['Company'] : $company,
                'status'           => sw_status(isset($a['Status']) ? $a['Status'] : null),
                'statusStart'      => sw_iso_ms(isset($a['StatusStart']) ? $a['StatusStart'] : null),
                'latestEventStart' => sw_iso_ms(isset($a['LatestEventStart']) ? $a['LatestEventStart'] : null),
                'latestEventEnd'   => sw_iso_ms(isset($a['LatestEventEnd']) ? $a['LatestEventEnd'] : null),
                'receivingWater'   => isset($a['ReceivingWaterCourse']) ? (string)$a['ReceivingWaterCourse'] : null,
                'lastUpdated'      => sw_iso_ms(isset($a['LastUpdated']) ? $a['LastUpdated'] : null),
                'provenance' => array(
                    'provider'  => $company,
                    'dataset'   => 'Storm Overflow Activity (near real-time EDM) via Stream / National Storm Overflow Hub',
                    'sourceUrl' => $page,
                    'licence'   => 'CC BY 4.0',
                ),
            ),
        );
    }
    return $out;
}

$partial   = array();
$overflows = array_merge(
    sw_fetch_overflows(WESSEX_BASE,   'Wessex Water',   WESSEX_PAGE,   $partial),
    sw_fetch_overflows(SOUTHERN_BASE, 'Southern Water', SOUTHERN_PAGE, $partial)
);
if (!count($beaches)) $partial[] = 'Environment Agency';

if (!count($beaches) && !count($overflows)) {
    if ($CLI) { echo "nothing fetched from any source\n"; exit(1); }
    dorset_degrade($CACHE, 'upstream', $EMPTY);
}

/* ---------------------------------------------------------- assemble */

$features = array();
foreach ($beaches as $b) {
    $features[] = array(
        'type'     => 'Feature',
        'id'       => 'beach:' . $b['id'],
        'geometry' => array('type' => 'Point', 'coordinates' => array($b['lon'], $b['lat'])),
        'properties' => array(
            'kind'           => 'beach',
            'name'           => $b['name'],
            'risk'           => $b['risk'],
            'riskExpires'    => $b['riskExpires'],
            'classification' => $b['classification'],
            'rainAffected'   => $b['rainAffected'],
            'sewerage'       => $b['sewerage'],
            'eaFetched'      => $eaFetched,
            'profileUrl'     => 'https://environment.data.gov.uk/bwq/profiles/profile.html?site=' . rawurlencode($b['id']),
            'provenance' => array(
                'provider'  => 'Environment Agency',
                'dataset'   => 'Bathing water quality (Swimfo) API',
                'sourceUrl' => 'https://environment.data.gov.uk/bwq/profiles/',
                'licence'   => 'Open Government Licence v3.0',
            ),
        ),
    );
}
foreach ($overflows as $f) $features[] = $f;

$now = time();
$discharging = 0; $offline = 0; $recent = 0;
$increased = 0;
foreach ($beaches as $b) { if ($b['risk'] === 'increased') $increased++; }
foreach ($overflows as $f) {
    $p = $f['properties'];
    if ($p['status'] === 'discharging') $discharging++;
    elseif ($p['status'] === 'offline') $offline++;
    $end = $p['latestEventEnd'] ? strtotime($p['latestEventEnd']) : false;
    if ($end !== false && ($now - $end) <= 172800) $recent++;
}

$body = array(
    'ok'                  => true,
    'type'                => 'FeatureCollection',
    'generated'           => gmdate('c'),
    'count'               => count($features),
    'beaches'             => count($beaches),
    'overflows'           => count($overflows),
    'discharging'         => $discharging,
    'recentDischarges48h' => $recent,
    'monitorsOffline'     => $offline,
    'increasedRisk'       => $increased,
    // Which sources did NOT answer this time. Empty when everything did.
    'partial'             => $partial,
    'eaFetched'           => $eaFetched,
    'sources' => array(
        array('provider' => 'Environment Agency', 'dataset' => 'Bathing water quality (Swimfo) API',
              'licence' => 'Open Government Licence v3.0', 'url' => 'https://environment.data.gov.uk/bwq/profiles/'),
        array('provider' => 'Wessex Water', 'dataset' => 'Storm Overflow Activity (near real-time EDM), via Stream',
              'licence' => 'CC BY 4.0', 'url' => WESSEX_PAGE),
        array('provider' => 'Southern Water', 'dataset' => 'Storm Overflow Activity (near real-time EDM), via Stream',
              'licence' => 'CC BY 4.0', 'url' => SOUTHERN_PAGE),
    ),
    'features' => $features,
);
dorset_cache_put($CACHE, $body);

if ($CLI) {
    echo 'ok: ' . count($beaches) . ' beaches, ' . count($overflows) . ' monitored overflows, '
       . $discharging . ' discharging, ' . $offline . ' offline'
       . (count($partial) ? ' (missing: ' . implode(', ', $partial) . ')' : '') . "\n";
    exit(0);
}
dorset_send($body);
