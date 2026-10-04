<?php
/**
 * Bournemouth365 fuel prices - data layer for /bournemouth/fuel-prices/ (4 Oct 2026).
 *
 * SOURCES
 *   official  The government's Fuel Finder feed (DESNZ, Motor Fuel Price (Open Data) Regulations 2025): every UK
 *             forecourt must report a price change within 30 minutes. Open Government Licence v3.0. OAuth client
 *             (owner's GOV.UK One Login, www.developer.fuel-finder.service.gov.uk) saved on the SERVER ONLY as
 *             bm-fuel-store/fuelfinder-key.php:  <?php return array('client_id' => '...', 'client_secret' => '...');
 *             Wired 4 Oct 2026 from the portal's own OpenAPI files (/fuel-finder/api/openapi/info-recipent.en.json and
 *             access-token.en.json), and the host checked live with fake credentials (401 / 403). The guide pages also
 *             name auth./api.fuelfinder.service.gov.uk - those hosts do not exist; the OpenAPI host does.
 *               token   POST {BMFUEL_FF_BASE}oauth/generate_access_token  JSON {client_id, client_secret}
 *                       -> {success, data:{access_token, expires_in, ...}}  (cached in the store until near expiry)
 *               pfs     GET {BMFUEL_FF_BASE}pfs?batch-number=N            500 forecourts a batch
 *               prices  GET {BMFUEL_FF_BASE}pfs/fuel-prices?batch-number=N[&effective-start-timestamp=Y-m-d H:i:s]
 *             The spec shows responses both bare ([...]) and wrapped ({data:[...]}), prices as text and as numbers:
 *             both are accepted. Limits (dev guidelines): 100 requests/min, ONE at a time; a 429 stops the run.
 *             Load: forecourts and prices in full once a day; between those, only price CHANGES (one request, usually)
 *             with an hour's overlap because a forecourt has 30 minutes to report a change.
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
if (!defined('BMFUEL_FF_BASE')) define('BMFUEL_FF_BASE', 'https://www.fuel-finder.service.gov.uk/api/v1/');
if (!defined('BMFUEL_FF_FULL')) define('BMFUEL_FF_FULL', 24 * 3600);   // full forecourt + price download this often
if (!defined('BMFUEL_FF_OVERLAP')) define('BMFUEL_FF_OVERLAP', 3600);  // price-change look-back beyond the last fetch
if (!defined('BMFUEL_FF_GAP_US')) define('BMFUEL_FF_GAP_US', 700000);  // pause between requests: < 100 a minute
if (!defined('BMFUEL_FF_MAXAGE')) define('BMFUEL_FF_MAXAGE', 45 * 86400); // a price unconfirmed this long is left out
if (!defined('BMFUEL_FF_PARSE_V')) define('BMFUEL_FF_PARSE_V', 2);      // version of the stored forecourt list's tidying

function bmfuel_area() { return array(-2.98, 50.45, -0.90, 51.15); }   // W, S, E, N

function bmfuel_dir() { return defined('BMFUEL_DIR') ? BMFUEL_DIR : __DIR__ . '/bm-fuel-store/'; }   // BMFUEL_DIR: tests only

function bmfuel_json_load($name) {
    $f = bmfuel_dir() . $name;
    $c = file_exists($f) ? json_decode((string)@file_get_contents($f), true) : null;
    return is_array($c) ? $c : array();
}

/* SiteGround's PHP has serialize_precision = 17, so json_encode writes 178.9 as 178.900000000000005684...: correct to
   the eye after rounding, but the data was 2-3x the size (44 KB for 98 stations, measured 4 Oct). Shortest form here
   only; the setting is put back so the other cron jobs sharing the run are untouched. */
function bmfuel_json($v) {
    $was = ini_get('serialize_precision');
    @ini_set('serialize_precision', '-1');
    $s = json_encode($v);
    @ini_set('serialize_precision', $was);
    return $s;
}

function bmfuel_json_save($name, $data) {
    if (!is_dir(bmfuel_dir())) @mkdir(bmfuel_dir(), 0755, true);
    $f = bmfuel_dir() . $name;
    $tmp = $f . '.' . getmypid() . '.tmp';
    if (@file_put_contents($tmp, bmfuel_json($data), LOCK_EX) !== false) @rename($tmp, $f);
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
    if (strtolower($s) === $s) return ucwords($s);   // "lockerley motors ltd" -> "Lockerley Motors Ltd"
    // A SHOUTED word -> Title case, word by word ("Barrack RD, CHRISTCHURCH" -> "Barrack Rd, Christchurch"). Real codes
    // stay as they are: BP, MFG, EG, UK; road numbers (A31) and postcodes (BH23 2BJ) contain digits so never match.
    $s = preg_replace_callback("/\\b[A-Z][A-Z']+\\b/", function ($m) {
        return in_array($m[0], array('BP', 'MFG', 'EG', 'UK', 'BWOC'), true) ? $m[0] : ucfirst(strtolower($m[0]));
    }, $s);
    return preg_replace_callback('/(?<=\\S) (Of|And) (?=\\S)/', function ($m) { return ' ' . strtolower($m[1]) . ' '; }, $s);   // "Isle of Wight"
}

/* The brand a driver knows, from whatever the forecourt typed: "Asda Bournemouth Express Petrol" -> Asda,
   "St Michaels Garage Ltd (BP)" -> BP, "Sainsburys" -> Sainsbury's. Unknown brands are kept as typed (tidied). */
function bmfuel_brand($raw) {
    $b = bmfuel_tidy_case($raw);
    static $known = array(
        '/^asda\b/i' => 'Asda', "/^sainsbury'?s?\\b/i" => "Sainsbury's", '/^tesco\b/i' => 'Tesco', '/^morrisons?\b/i' => 'Morrisons',
        '/^esso\b/i' => 'Esso', '/^shell\b/i' => 'Shell', '/^texaco\b/i' => 'Texaco', '/^jet\b/i' => 'Jet', '/^murco\b/i' => 'Murco',
        '/^gulf\b/i' => 'Gulf', '/^valero\b/i' => 'Valero', '/^eg on the move\b/i' => 'EG On The Move', '/^bwoc$/i' => 'BWOC',
        '/^bp\b|\(bp\)$/i' => 'BP', '/^co-?op\b/i' => 'Co-op', '/^moto\b/i' => 'Moto', '/^applegreen\b/i' => 'Applegreen',
    );
    foreach ($known as $re => $name) if (preg_match($re, $b)) return $name;
    return $b;
}

/* An address from its parts: a company line ("Tesco Stores Ltd") is not where the forecourt is, so it is dropped, and a
   bare house number joins the street after it ("771, Castle Lane East" -> "771 Castle Lane East"). */
function bmfuel_address($parts) {
    $out = array();
    foreach ($parts as $p) {
        foreach (explode(',', (string)$p) as $seg) {
            $seg = bmfuel_tidy_case($seg);
            if ($seg === '' || preg_match('/\b(ltd|limited|plc)\b/i', $seg)) continue;
            $n = count($out);
            if ($n && preg_match('/^\d+[A-Za-z]?$/', $out[$n - 1])) $out[$n - 1] .= ' ' . $seg;
            elseif (!$n || strcasecmp($out[$n - 1], $seg) !== 0) $out[] = $seg;
        }
    }
    return implode(', ', $out);
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

/* An access token, reused from the store until two minutes before it expires. Never logged or echoed. */
function bmfuel_ff_token($key, $now, $fresh = false) {
    $t = bmfuel_json_load('ff-token.json');
    if (!$fresh && !empty($t['access_token']) && (int)$t['exp'] > $now + 120) return array($t['access_token'], null);
    list($code, $body) = bmfuel_http(BMFUEL_FF_BASE . 'oauth/generate_access_token', 20, array('Content-Type: application/json'),
                                     json_encode(array('client_id' => $key['client_id'], 'client_secret' => $key['client_secret'])));
    $j = $body ? json_decode($body, true) : null;
    $d = (is_array($j) && isset($j['data']) && is_array($j['data'])) ? $j['data'] : $j;
    if (!is_array($d) || empty($d['access_token'])) return array(null, 'token refused' . ($code ? ' (' . $code . ')' : ''));
    $exp = $now + (isset($d['expires_in']) ? max(300, (int)$d['expires_in']) : 3600);
    bmfuel_json_save('ff-token.json', array('access_token' => $d['access_token'], 'exp' => $exp));
    return array($d['access_token'], null);
}

/* The rows of one response, whether the API sends a bare list or wraps it in {data: [...]} (the spec shows both). */
function bmfuel_ff_rows($j) {
    if (!is_array($j)) return null;
    if (array_keys($j) === range(0, count($j) - 1) || $j === array()) return $j;
    if (isset($j['data']) && is_array($j['data'])) return bmfuel_ff_rows($j['data']);
    return null;
}

/* Every batch of one endpoint, one request at a time. Returns array(rows, error). */
function bmfuel_ff_all($path, $query, &$token, $key, $now) {
    $rows = array();
    for ($n = 1; $n <= 40; $n++) {                       // 40 x 500 = 20,000 forecourts: far beyond the UK's ~8,300
        if ($n > 1) usleep(BMFUEL_FF_GAP_US);
        $url = BMFUEL_FF_BASE . $path . '?batch-number=' . $n . $query;
        list($code, $body) = bmfuel_http($url, 30, array('Authorization: Bearer ' . $token));
        if ($code === 401 || $code === 403) {            // token expired early: one fresh token, then this batch again
            list($token, $err) = bmfuel_ff_token($key, $now, true);
            if (!$token) return array(null, $err);
            list($code, $body) = bmfuel_http($url, 30, array('Authorization: Bearer ' . $token));
        }
        if ($code === 429) return array(null, 'rate limited (429) at batch ' . $n);
        if ($code === 404 && $n > 1) break;              // past the last batch, if the API says so with a 404
        $page = $body ? bmfuel_ff_rows(json_decode($body, true)) : null;
        if ($page === null) return array(null, $path . ' batch ' . $n . ' failed' . ($code ? ' (' . $code . ')' : ''));
        foreach ($page as $r) $rows[] = $r;
        if (count($page) < 500) break;                   // a short batch is the last one
    }
    return array($rows, null);
}

function bmfuel_ff_time($s) {
    if (!is_string($s) || $s === '') return null;
    $t = strtotime($s);                                  // ISO 8601 with Z: UTC
    return $t ? $t : null;
}

/* Forecourts in our area, keyed by node_id. Closed ones (temporarily for 3+ days, or permanently) are dropped. */
function bmfuel_ff_stations($rows) {
    list($W, $S, $E, $N) = bmfuel_area();
    $out = array();
    foreach ($rows as $r) {
        if (!is_array($r) || empty($r['node_id']) || !isset($r['location']['latitude'], $r['location']['longitude'])) continue;
        $la = (float)$r['location']['latitude']; $lo = (float)$r['location']['longitude'];
        if ($lo < $W || $lo > $E || $la < $S || $la > $N) continue;
        if (!empty($r['temporary_closure']) || !empty($r['permanent_closure'])) continue;
        $l = $r['location'];
        $addr = array();
        foreach (array('address_line_1', 'address_line_2', 'city') as $k) if (!empty($l[$k])) $addr[] = trim($l[$k]);
        $rawBrand = !empty($r['brand_name']) ? $r['brand_name'] : (isset($r['trading_name']) ? $r['trading_name'] : '');
        $brand = bmfuel_brand($rawBrand);
        $name = bmfuel_tidy_case(!empty($r['trading_name']) ? $r['trading_name'] : $rawBrand);
        $out[(string)$r['node_id']] = array(
            'b' => $brand,
            'n' => (strcasecmp($name, $brand) === 0) ? '' : $name,
            'a' => bmfuel_address($addr),
            'pc' => strtoupper(trim(isset($l['postcode']) ? (string)$l['postcode'] : '')),
            'la' => round($la, 6), 'lo' => round($lo, 6),
        );
    }
    return $out;
}

/* Price rows merged into $prices[node_id][fuel] = [pence, effective unix time], for forecourts we keep only. */
function bmfuel_ff_merge_prices(&$prices, $rows, $keep) {
    static $map = array('E10' => 'E10', 'E5' => 'E5', 'B7_STANDARD' => 'B7', 'B7' => 'B7', 'B7_PREMIUM' => 'SDV');
    foreach ($rows as $r) {
        if (!is_array($r) || empty($r['node_id']) || !isset($keep[(string)$r['node_id']]) || empty($r['fuel_prices']) || !is_array($r['fuel_prices'])) continue;
        $id = (string)$r['node_id'];
        foreach ($r['fuel_prices'] as $f) {
            $ft = isset($f['fuel_type']) ? strtoupper((string)$f['fuel_type']) : '';
            if (!isset($map[$ft])) continue;                       // B10 and HVO: not shown on the page yet
            $p = bmfuel_price(isset($f['price']) ? $f['price'] : null);
            if ($p === null) continue;
            $t = bmfuel_ff_time(isset($f['price_change_effective_timestamp']) ? $f['price_change_effective_timestamp']
                                                                          : (isset($f['price_last_updated']) ? $f['price_last_updated'] : ''));
            $old = isset($prices[$id][$map[$ft]]) ? $prices[$id][$map[$ft]] : null;
            if ($old && $t && $old[1] && $old[1] > $t) continue;   // never let an older price replace a newer one
            $prices[$id][$map[$ft]] = array($p, $t);
        }
    }
}

function bmfuel_src_official($now) {
    $key = bmfuel_official_key();
    if (!$key) return array('ok' => false, 'error' => 'not configured', 'stations' => array());
    list($token, $err) = bmfuel_ff_token($key, $now);
    if (!$token) return array('ok' => false, 'error' => $err, 'stations' => array());

    $st = bmfuel_json_load('ff-stations.json');
    // BMFUEL_FF_PARSE_V: bump when bmfuel_ff_stations() changes how it tidies names/addresses, so the stored list is
    // rebuilt at the next run instead of waiting up to a day.
    if (empty($st['nodes']) || !isset($st['v']) || (int)$st['v'] !== BMFUEL_FF_PARSE_V || $now - (int)$st['t'] > BMFUEL_FF_FULL) {
        list($rows, $err) = bmfuel_ff_all('pfs', '', $token, $key, $now);
        if ($rows === null && empty($st['nodes'])) return array('ok' => false, 'error' => $err, 'stations' => array());
        if ($rows !== null) { $st = array('v' => BMFUEL_FF_PARSE_V, 't' => $now, 'nodes' => bmfuel_ff_stations($rows)); bmfuel_json_save('ff-stations.json', $st); }
        usleep(BMFUEL_FF_GAP_US);
    }
    $nodes = $st['nodes'];

    $pr = bmfuel_json_load('ff-prices.json');
    $prices = isset($pr['p']) && is_array($pr['p']) ? $pr['p'] : array();
    if (!$prices || $now - (int)(isset($pr['full']) ? $pr['full'] : 0) > BMFUEL_FF_FULL) {
        $prices = array();
        list($rows, $err) = bmfuel_ff_all('pfs/fuel-prices', '', $token, $key, $now);
        if ($rows === null) return array('ok' => false, 'error' => $err, 'stations' => array());
        bmfuel_ff_merge_prices($prices, $rows, $nodes);
        $pr = array('full' => $now, 'last' => $now, 'p' => $prices);
    } else {
        $since = gmdate('Y-m-d H:i:s', (int)$pr['last'] - BMFUEL_FF_OVERLAP);
        list($rows, $err) = bmfuel_ff_all('pfs/fuel-prices', '&effective-start-timestamp=' . rawurlencode($since), $token, $key, $now);
        if ($rows === null) return array('ok' => false, 'error' => $err, 'stations' => array());
        bmfuel_ff_merge_prices($prices, $rows, $nodes);
        $pr['last'] = $now; $pr['p'] = $prices;
    }
    bmfuel_json_save('ff-prices.json', $pr);

    $out = array();
    foreach ($nodes as $id => $s) {
        if (empty($prices[$id])) continue;
        $p = array(); $pt = array(); $t = null;
        foreach ($prices[$id] as $f => $v) {
            // A price not confirmed for BMFUEL_FF_MAXAGE is treated as not reported: on 4 Oct two village garages showed
            // prices 165 and 187 days old (apparently no longer reporting) - never let one top "cheapest near you".
            if ($v[1] && $now - $v[1] > BMFUEL_FF_MAXAGE) continue;
            $p[$f] = $v[0]; $pt[$f] = $v[1]; if ($v[1] && (!$t || $v[1] > $t)) $t = $v[1];
        }
        if (!$p) continue;
        $out[] = array('id' => 'ff:' . substr($id, 0, 16), 'b' => $s['b'], 'n' => $s['n'], 'a' => $s['a'], 'pc' => $s['pc'],
                       'la' => $s['la'], 'lo' => $s['lo'], 'p' => $p, 'pt' => $pt, 's' => 'official', 't' => $t);
    }
    return array('ok' => (bool)$out, 'error' => $out ? null : 'no priced forecourts in the area', 'updated' => $now,
                 'stations' => $out, 'n' => count($out), 'total' => count($nodes));
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
    // A key file saved or replaced since the last run makes this run due at once: uploading the key shows results at
    // the next cron tick, not up to half an hour later.
    $kf = bmfuel_dir() . 'fuelfinder-key.php';
    $keyNew = file_exists($kf) && !empty($beat['t']) && @filemtime($kf) > (int)$beat['t'];
    if (!$force && !$keyNew && !empty($beat['t']) && $now - (int)$beat['t'] < BMFUEL_TTL) return array('ok' => true, 'skipped' => 'ttl');
    if (!is_dir(bmfuel_dir())) @mkdir(bmfuel_dir(), 0755, true);
    $lk = @fopen(bmfuel_dir() . 'refresh.lock', 'c');
    if (!$lk || !@flock($lk, LOCK_EX | LOCK_NB)) return array('ok' => true, 'skipped' => 'locked');
    try {
        bmfuel_json_save('beat.json', array('t' => $now));   // claim the slot first so a slow run is not repeated
        $sources = array(); $all = array();
        $off = bmfuel_src_official($now);
        $sources[] = array('id' => 'official', 'label' => 'Fuel Finder (official)', 'ok' => $off['ok'], 'n' => count($off['stations']),
                           'total' => isset($off['total']) ? $off['total'] : 0,
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
