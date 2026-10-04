<?php
/**
 * Bournemouth365 fuel prices - data layer for /bournemouth/fuel-prices/ (4 Oct 2026).
 *
 * SOURCES
 *   official  The government's Fuel Finder feed (DESNZ, Motor Fuel Price (Open Data) Regulations 2025): every UK
 *             forecourt must report a price change within 30 minutes. Open Government Licence v3.0. Needs an OAuth
 *             client from developer.fuel-finder.service.gov.uk (owner's GOV.UK One Login) saved on the SERVER ONLY as
 *             bm-fuel-store/fuelfinder-key.php:  <?php return array('client_id' => '...', 'client_secret' => '...');
 *             Its endpoints and field names sit behind that sign-in, so the adapter is wired once the real response
 *             can be seen (the sea page's met-station rule: never code against a guessed shape).
 *   preview   The retailers' own JSON feeds from the CMA's 2023 interim scheme. Real prices, but PARTIAL: on 4 Oct 2026
 *             Tesco, Sainsbury's and BP refused, Morrisons listed one station (Gibraltar), Rontec had frozen in May.
 *             Used only until the official feed is wired, and the page says so in a banner - a "cheapest near you"
 *             that silently leaves out the supermarkets would be untrue.
 *
 * HONESTY
 *   - A feed whose own last_updated is older than BMFUEL_FROZEN is left out entirely and reported as frozen.
 *   - The page shows when we last fetched (fetched_at) and each feed's own time; past BMFUEL_STALE it says so.
 *   - No station is ever given a price it did not report; a fuel a station did not list is simply absent.
 *
 * WIRING: tm-cron.php calls bm_fuel_refresh() (rate-limited inside by BMFUEL_TTL; never echoes or exits);
 * bm-fuel.php serves the stored file. The store folder has its own deny-all .htaccess and .gitignore.
 *
 * AREA: the south-coast box the self-hosted street map covers (lon -2.98..-0.90, lat 50.45..51.15):
 * Weymouth and Dorchester to Chichester, up to Salisbury, and the Isle of Wight.
 */

if (!defined('BMFUEL_TTL'))    define('BMFUEL_TTL', 30 * 60);       // refresh cadence
if (!defined('BMFUEL_STALE'))  define('BMFUEL_STALE', 3 * 3600);    // our fetch older than this = say so on the page
if (!defined('BMFUEL_FROZEN')) define('BMFUEL_FROZEN', 72 * 3600);  // a feed not updated for this long is left out
if (!defined('BMFUEL_BACKOFF')) define('BMFUEL_BACKOFF', 6 * 3600); // a failed feed is not asked again for this long

function bmfuel_area() { return array(-2.98, 50.45, -0.90, 51.15); }   // W, S, E, N

function bmfuel_dir() { return __DIR__ . '/bm-fuel-store/'; }

function bmfuel_json_load($name) {
    $f = bmfuel_dir() . $name;
    $c = file_exists($f) ? json_decode((string)@file_get_contents($f), true) : null;
    return is_array($c) ? $c : array();
}

function bmfuel_json_save($name, $data) {
    if (!is_dir(bmfuel_dir())) @mkdir(bmfuel_dir(), 0755, true);
    $f = bmfuel_dir() . $name;
    $tmp = $f . '.' . getmypid() . '.tmp';
    if (@file_put_contents($tmp, json_encode($data), LOCK_EX) !== false) @rename($tmp, $f);
}

function bmfuel_http($url, $timeout = 15, $headers = array(), $post = null) {
    for ($attempt = 0; $attempt < 2; $attempt++) {
        $ch = @curl_init($url);
        if (!$ch) return array(0, null);
        $opt = array(
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => $timeout,
            CURLOPT_CONNECTTIMEOUT => 6,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS => 3,
            CURLOPT_ENCODING => '',
            CURLOPT_HTTPHEADER => array_merge(array('Accept: application/json'), $headers),
            CURLOPT_USERAGENT => '365techies-bournemouth365/1.0 (+https://365techies.co.uk/bournemouth/fuel-prices/)',
        );
        if ($post !== null) { $opt[CURLOPT_POST] = true; $opt[CURLOPT_POSTFIELDS] = $post; }
        @curl_setopt_array($ch, $opt);
        $body = @curl_exec($ch);
        $code = (int)@curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        @curl_close($ch);
        if ($body !== false && $code >= 200 && $code < 300) return array($code, $body);
        if ($code >= 400 && $code < 500) return array($code, null);   // a refusal will not change in two seconds
        if ($code === 0) return array(0, null);                       // no connection at all: retrying only burns time
        if ($attempt === 0) sleep(2);
    }
    return array(isset($code) ? $code : 0, null);
}

/* ---------- the retailers' own feeds (preview) ---------- */

function bmfuel_retailer_feeds() {
    return array(
        'asda'       => array('Asda', 'https://storelocator.asda.com/fuel_prices_data.json'),
        'bp'         => array("BP's own forecourts", 'https://www.bp.com/en_gb/united-kingdom/home/fuelprices/fuel_prices_data.json'),
        'esso'       => array('Esso', 'https://fuelprices.esso.co.uk/latestdata.json'),
        'jet'        => array('Jet', 'https://jetlocal.co.uk/fuel_prices_data.json'),
        'mfg'        => array('Motor Fuel Group', 'https://fuel.motorfuelgroup.com/fuel_prices_data.json'),
        'morrisons'  => array('Morrisons', 'https://www.morrisons.com/fuel-prices/fuel.json'),
        'moto'       => array('Moto', 'https://moto-way.com/fuel-price/fuel_prices.json'),
        'rontec'     => array('Rontec', 'https://www.rontec-servicestations.co.uk/fuel-prices/data/fuel_prices_data.json'),
        'sainsburys' => array("Sainsbury's", 'https://api.sainsburys.co.uk/v1/exports/latest/fuel_prices_data.json'),
        'sgn'        => array('SGN', 'https://www.sgnretail.uk/files/data/SGN_daily_fuel_prices.json'),
        'tesco'      => array('Tesco', 'https://www.tesco.com/fuel_prices/fuel_prices_data.json'),
    );
}

/* "04/10/2026 11:00:00" (UK local time) -> unix seconds, or null */
function bmfuel_parse_uk_time($s) {
    if (!is_string($s) || $s === '') return null;
    $tz = new DateTimeZone('Europe/London');
    foreach (array('d/m/Y H:i:s', 'd/m/Y H:i', 'Y-m-d\TH:i:sP', 'Y-m-d H:i:s') as $fmt) {
        $d = DateTime::createFromFormat($fmt, trim($s), $tz);
        if ($d) return $d->getTimestamp();
    }
    $t = strtotime($s);
    return $t ? $t : null;
}

function bmfuel_tidy_case($s) {
    $s = trim(preg_replace('/\s+/', ' ', (string)$s));
    if ($s === '') return '';
    // A SHOUTED word of four or more letters -> Title case, word by word ("Barrack Road, CHRISTCHURCH"); short codes
    // like BP, MFG and A31 and postcodes (BH23 2BJ - digits break the run) stay as they are.
    return preg_replace_callback("/\\b[A-Z][A-Z']{3,}\\b/", function ($m) { return ucfirst(strtolower($m[0])); }, $s);
}

function bmfuel_price($v) {
    if (!is_numeric($v)) return null;
    $p = (float)$v;
    if ($p > 0 && $p < 10) $p *= 100;          // a feed in pounds rather than pence
    if ($p < 80 || $p > 400) return null;      // not a believable pump price
    return round($p, 1);
}

function bmfuel_src_retailer($id, $label, $url, $now) {
    list($code, $body) = bmfuel_http($url);
    if ($body === null) return array('ok' => false, 'error' => $code ? ('refused (' . $code . ')') : 'no answer', 'stations' => array());
    $j = json_decode(preg_replace('/^\xEF\xBB\xBF/', '', $body), true);
    if (!is_array($j) || !isset($j['stations']) || !is_array($j['stations'])) return array('ok' => false, 'error' => 'not the expected format', 'stations' => array());
    $upd = bmfuel_parse_uk_time(isset($j['last_updated']) ? $j['last_updated'] : '');
    if ($upd && $now - $upd > BMFUEL_FROZEN) {
        return array('ok' => false, 'error' => 'frozen since ' . date('j M Y', $upd), 'updated' => $upd, 'stations' => array());
    }
    list($W, $S, $E, $N) = bmfuel_area();
    $out = array();
    foreach ($j['stations'] as $s) {
        if (!isset($s['location']['latitude'], $s['location']['longitude'])) continue;
        $la = (float)$s['location']['latitude']; $lo = (float)$s['location']['longitude'];
        if ($lo < $W || $lo > $E || $la < $S || $la > $N) continue;
        $p = array();
        foreach (array('E10', 'E5', 'B7', 'SDV') as $k) {
            if (isset($s['prices'][$k])) { $v = bmfuel_price($s['prices'][$k]); if ($v !== null) $p[$k] = $v; }
        }
        if (!$p) continue;
        $out[] = array(
            'id' => $id . ':' . (isset($s['site_id']) ? preg_replace('/[^A-Za-z0-9_-]/', '', (string)$s['site_id']) : count($out)),
            'b'  => bmfuel_tidy_case(isset($s['brand']) ? $s['brand'] : $label),
            'a'  => bmfuel_tidy_case(isset($s['address']) ? $s['address'] : ''),
            'pc' => strtoupper(trim(isset($s['postcode']) ? (string)$s['postcode'] : '')),
            'la' => round($la, 6), 'lo' => round($lo, 6),
            'p'  => $p,
            's'  => $id,
            't'  => $upd,
        );
    }
    return array('ok' => true, 'updated' => $upd, 'stations' => $out, 'n' => count($out), 'total' => count($j['stations']));
}

/* ---------- the official Fuel Finder feed ---------- */

function bmfuel_official_key() {
    $f = bmfuel_dir() . 'fuelfinder-key.php';
    if (!file_exists($f)) return null;
    $k = @include $f;
    return (is_array($k) && !empty($k['client_id']) && !empty($k['client_secret'])) ? $k : null;
}

function bmfuel_src_official($now) {
    if (!bmfuel_official_key()) return array('ok' => false, 'error' => 'not configured', 'stations' => array());
    // Deliberately not guessed: wired against the real token + forecourt + price responses once the key exists.
    return array('ok' => false, 'error' => 'key saved - adapter not wired yet', 'stations' => array());
}

/* ---------- build ---------- */

function bmfuel_miles($la1, $lo1, $la2, $lo2) {
    $r = 3958.8; $a = deg2rad($la1); $b = deg2rad($la2);
    $x = sin(($b - $a) / 2) ** 2 + cos($a) * cos($b) * sin(deg2rad($lo2 - $lo1) / 2) ** 2;
    return 2 * $r * asin(min(1, sqrt($x)));
}

/* The same forecourt can sit in two retailer feeds (an MFG site branded Esso, say). Within 80 m and same brand = one
   station; the copy from the more recently updated feed wins. */
function bmfuel_dedupe($all) {
    usort($all, function ($x, $y) { return (int)$y['t'] - (int)$x['t']; });
    $kept = array();
    foreach ($all as $s) {
        $dup = false;
        foreach ($kept as $k) {
            if (strcasecmp($k['b'], $s['b']) === 0 && bmfuel_miles($k['la'], $k['lo'], $s['la'], $s['lo']) < 0.05) { $dup = true; break; }
        }
        if (!$dup) $kept[] = $s;
    }
    return $kept;
}

function bm_fuel_refresh($force = false) {
    $now = time();
    $beat = bmfuel_json_load('beat.json');
    if (!$force && !empty($beat['t']) && $now - (int)$beat['t'] < BMFUEL_TTL) return array('ok' => true, 'skipped' => 'ttl');
    if (!is_dir(bmfuel_dir())) @mkdir(bmfuel_dir(), 0755, true);
    $lk = @fopen(bmfuel_dir() . 'refresh.lock', 'c');
    if (!$lk || !@flock($lk, LOCK_EX | LOCK_NB)) return array('ok' => true, 'skipped' => 'locked');
    try {
        bmfuel_json_save('beat.json', array('t' => $now));   // claim the slot first so a slow run is not repeated
        $sources = array(); $all = array();
        $off = bmfuel_src_official($now);
        $sources[] = array('id' => 'official', 'label' => 'Fuel Finder (official)', 'ok' => $off['ok'], 'n' => count($off['stations']),
                           'updated' => isset($off['updated']) ? $off['updated'] : null, 'error' => isset($off['error']) ? $off['error'] : null);
        if ($off['ok'] && $off['stations']) {
            $mode = 'official'; $all = $off['stations'];
        } else {
            $mode = 'preview';
            /* SiteGround bills connected seconds (siteground-cpu memory): a feed that refused, timed out or froze is
               left alone for BMFUEL_BACKOFF instead of being waited on every half hour. */
            $fails = bmfuel_json_load('fails.json');
            foreach (bmfuel_retailer_feeds() as $id => $f) {
                if (!empty($fails[$id]['until']) && $now < (int)$fails[$id]['until']) {
                    $sources[] = array('id' => $id, 'label' => $f[0], 'ok' => false, 'n' => 0, 'updated' => isset($fails[$id]['updated']) ? $fails[$id]['updated'] : null,
                                       'error' => $fails[$id]['error']);
                    continue;
                }
                $r = bmfuel_src_retailer($id, $f[0], $f[1], $now);
                $sources[] = array('id' => $id, 'label' => $f[0], 'ok' => $r['ok'], 'n' => count($r['stations']),
                                   'total' => isset($r['total']) ? $r['total'] : 0,   // UK-wide: a feed listing a handful is not really publishing
                                   'updated' => isset($r['updated']) ? $r['updated'] : null, 'error' => isset($r['error']) ? $r['error'] : null);
                if ($r['ok']) unset($fails[$id]);
                else $fails[$id] = array('until' => $now + BMFUEL_BACKOFF, 'error' => $r['error'], 'updated' => isset($r['updated']) ? $r['updated'] : null);
                foreach ($r['stations'] as $s) $all[] = $s;
            }
            bmfuel_json_save('fails.json', $fails);
            $all = bmfuel_dedupe($all);
        }
        if (!$all) {   // keep the last good file rather than replacing it with nothing
            $old = bmfuel_json_load('stations.json');
            if ($old) { $old['last_error'] = 'no source answered at ' . date('H:i', $now); bmfuel_json_save('stations.json', $old); }
            return array('ok' => false, 'error' => 'no stations', 'sources' => $sources);
        }
        bmfuel_json_save('stations.json', array(
            'v' => 1, 'mode' => $mode, 'partial' => $mode !== 'official', 'fetched_at' => $now,
            'area' => bmfuel_area(), 'sources' => $sources, 'stations' => array_values($all),
        ));
        return array('ok' => true, 'mode' => $mode, 'stations' => count($all));
    } finally {
        @flock($lk, LOCK_UN); @fclose($lk);
    }
}

function bm_fuel_public() {
    $c = bmfuel_json_load('stations.json');
    if (!$c) return array('ok' => false, 'error' => 'no data yet');
    $c['ok'] = true;
    $c['stale'] = (time() - (int)$c['fetched_at']) > BMFUEL_STALE;
    return $c;
}

/* Postcode -> map position through postcodes.io (ONS data, OGL). Full postcode first, then the district ("BH8").
   The visitor's postcode arrives in a POST body, so it is not in any access log, and nothing here keeps it. */
function bm_fuel_postcode($raw) {
    $pc = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', (string)$raw));
    if (preg_match('/^([A-Z]{1,2}\d[A-Z\d]?)(\d[A-Z]{2})$/', $pc, $m)) {
        list($code, $body) = bmfuel_http('https://api.postcodes.io/postcodes/' . rawurlencode($m[1] . $m[2]), 8);
        $j = $body ? json_decode($body, true) : null;
        if (!empty($j['result']['latitude'])) return bmfuel_pc_out($m[1] . ' ' . $m[2], $j['result']['latitude'], $j['result']['longitude']);
        $pc = $m[1];   // unknown or retired full postcode: fall back to its district
    }
    if (preg_match('/^[A-Z]{1,2}\d[A-Z\d]?$/', $pc)) {
        list($code, $body) = bmfuel_http('https://api.postcodes.io/outcodes/' . rawurlencode($pc), 8);
        $j = $body ? json_decode($body, true) : null;
        if (!empty($j['result']['latitude'])) return bmfuel_pc_out($pc, $j['result']['latitude'], $j['result']['longitude'], true);
        return array('ok' => false, 'error' => 'unknown');
    }
    return array('ok' => false, 'error' => 'format');
}

function bmfuel_pc_out($pc, $la, $lo, $district = false) {
    list($W, $S, $E, $N) = bmfuel_area();
    $la = (float)$la; $lo = (float)$lo;
    return array('ok' => true, 'pc' => $pc, 'la' => round($la, 5), 'lo' => round($lo, 5), 'district' => $district,
                 'in_area' => ($lo >= $W && $lo <= $E && $la >= $S && $la <= $N));
}
