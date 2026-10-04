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
 * bm-fuel.php answers the pages. The store folder has its own deny-all .htaccess and .gitignore.
 *
 * WHOLE UK (owner, 4 Oct 2026: "the 365 techies one ... for the whole of the UK"; the Bournemouth page keeps its own
 * focus with distances up to 100 miles and a Whole UK option). Every UK forecourt is kept; the pages never download
 * all ~8,300. bm_fuel_publish() writes, each run:
 *   cells/c_<lat>_<lon>.json  the forecourts in each 1-degree square (a "near me" answer reads only the squares it needs)
 *   top-<fuel>.json           the 200 cheapest in the UK for that fuel
 *   stats.json                per fuel: UK, the four nations and every postcode area (count, median, lowest) + top 10;
 *                             by brand (10+ forecourts, and every supermarket); supermarkets against the rest
 *   meta.json                 mode, when fetched, the source list
 *   history.json              one line a day from every forecourt (UK + around Bournemouth), from 4 Oct 2026
 *   desnz.json                the government's weekly UK averages since 2003 (bmfuel_desnz_refresh, every 6 hours)
 * A visitor's position reaches the server rounded to 0.1 degree (about 10 km); the page works out exact distances.
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
if (!defined('BMFUEL_FF_PARSE_V')) define('BMFUEL_FF_PARSE_V', 5);      // version of the stored lists (3: whole UK; 4: addresses de-duplicated; 5: Costco, Waitrose, Circle K, Maxol)
if (!defined('BMFUEL_KEEP_OFFICIAL')) define('BMFUEL_KEEP_OFFICIAL', 12 * 3600);  // official data kept through an outage
if (!defined('BMFUEL_TOP')) define('BMFUEL_TOP', 200);                  // forecourts in a "cheapest" answer

function bmfuel_area() { return array(-8.7, 49.8, 2.0, 61.0); }   // W, S, E, N: the UK, Northern Ireland and Shetland included

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
            CURLOPT_USERAGENT => '365techies-fuel-prices/1.0 (+https://365techies.co.uk/fuel-prices/)',
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
        '/^costco\b/i' => 'Costco', '/^waitrose\b/i' => 'Waitrose', '/^circle ?k\b/i' => 'Circle K', '/^maxol\b/i' => 'Maxol',
    );
    foreach ($known as $re => $name) if (preg_match($re, $b)) return $name;
    return $b;
}

/* The supermarkets, for "which supermarket has the cheapest fuel" (owner 4 Oct). Costco needs a membership card. */
function bmfuel_is_super($b) { return in_array($b, array('Asda', 'Tesco', "Sainsbury's", 'Morrisons', 'Costco', 'Waitrose'), true); }

/* An address from its parts: a company line ("Tesco Stores Ltd") is not where the forecourt is, so it is dropped, and a
   bare house number joins the street after it ("771, Castle Lane East" -> "771 Castle Lane East"). */
/* (4 Oct, whole UK) Forecourts also type their town and postcode into the address lines - "Banbridge, BT32 4ET,
   Banbridge, BT32 4ET" came through - so a postcode segment is dropped (the page adds the postcode once) and a segment
   already used anywhere is not repeated. */
function bmfuel_address($parts) {
    $out = array(); $seen = array();
    foreach ($parts as $p) {
        foreach (explode(',', (string)$p) as $seg) {
            $seg = bmfuel_tidy_case($seg);
            if ($seg === '' || preg_match('/\b(ltd|limited|plc)\b/i', $seg)) continue;
            if (preg_match('/^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i', $seg)) continue;
            $k = strtolower($seg);
            if (isset($seen[$k])) continue;
            $n = count($out);
            if ($n && preg_match('/^\d+[A-Za-z]?$/', $out[$n - 1])) $out[$n - 1] .= ' ' . $seg;
            else $out[] = $seg;
            $seen[$k] = true;
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
        $pc = strtoupper(trim(isset($s['postcode']) ? (string)$s['postcode'] : ''));
        $out[] = array(
            'id' => $id . ':' . (isset($s['site_id']) ? preg_replace('/[^A-Za-z0-9_-]/', '', (string)$s['site_id']) : count($out)),
            'b'  => bmfuel_brand(isset($s['brand']) ? $s['brand'] : $label),
            'n'  => '',
            'a'  => bmfuel_address(array(isset($s['address']) ? $s['address'] : '')),
            'pc' => $pc,
            'la' => round($la, 6), 'lo' => round($lo, 6),
            'p'  => $p,
            'co' => bmfuel_country('', $pc),
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

/* Every batch of one endpoint, one request at a time. Returns array(rows, error). With $each, each batch is handed to
   it as it arrives and not kept: the whole UK's raw forecourt records (opening hours, amenities...) held at once could
   meet shared hosting's memory limit, while one 500-row batch at a time cannot. Then returns array(array(), error). */
function bmfuel_ff_all($path, $query, &$token, $key, $now, $each = null) {
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
        $short = count($page) < 500;
        if ($each) $each($page); else foreach ($page as $r) $rows[] = $r;
        unset($page, $body);
        if ($short) break;                               // a short batch is the last one
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
        // A company name in the brand field ("Cscm Holdings Ltd") means nothing to a driver: show the forecourt's own name.
        if ($name !== '' && preg_match('/\b(ltd|limited|plc|holdings|llp)\b/i', $brand)) $brand = $name;
        $pc = strtoupper(trim(isset($l['postcode']) ? (string)$l['postcode'] : ''));
        $out[(string)$r['node_id']] = array(
            'b' => $brand,
            'n' => (strcasecmp($name, $brand) === 0) ? '' : $name,
            'a' => bmfuel_address($addr),
            'pc' => $pc,
            'la' => round($la, 6), 'lo' => round($lo, 6),
            'co' => bmfuel_country(isset($l['country']) ? $l['country'] : '', $pc),
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
        $fresh = array();
        list($rows, $err) = bmfuel_ff_all('pfs', '', $token, $key, $now, function ($page) use (&$fresh) { $fresh += bmfuel_ff_stations($page); });
        if ($rows === null && empty($st['nodes'])) return array('ok' => false, 'error' => $err, 'stations' => array());
        if ($rows !== null) { $st = array('v' => BMFUEL_FF_PARSE_V, 't' => $now, 'nodes' => $fresh); bmfuel_json_save('ff-stations.json', $st); }
        unset($fresh);
        usleep(BMFUEL_FF_GAP_US);
    }
    $nodes = $st['nodes'];

    $pr = bmfuel_json_load('ff-prices.json');
    $prices = isset($pr['p']) && is_array($pr['p']) ? $pr['p'] : array();
    if (!$prices || !isset($pr['v']) || (int)$pr['v'] !== BMFUEL_FF_PARSE_V || $now - (int)(isset($pr['full']) ? $pr['full'] : 0) > BMFUEL_FF_FULL) {
        $prices = array();
        list($rows, $err) = bmfuel_ff_all('pfs/fuel-prices', '', $token, $key, $now,
                                          function ($page) use (&$prices, $nodes) { bmfuel_ff_merge_prices($prices, $page, $nodes); });
        if ($rows === null) return array('ok' => false, 'error' => $err, 'stations' => array());
        $pr = array('v' => BMFUEL_FF_PARSE_V, 'full' => $now, 'last' => $now, 'p' => $prices);
    } else {
        $since = gmdate('Y-m-d H:i:s', (int)$pr['last'] - BMFUEL_FF_OVERLAP);
        list($rows, $err) = bmfuel_ff_all('pfs/fuel-prices', '&effective-start-timestamp=' . rawurlencode($since), $token, $key, $now,
                                          function ($page) use (&$prices, $nodes) { bmfuel_ff_merge_prices($prices, $page, $nodes); });
        if ($rows === null) return array('ok' => false, 'error' => $err, 'stations' => array());
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
                       'la' => $s['la'], 'lo' => $s['lo'], 'p' => $p, 'pt' => $pt, 'co' => isset($s['co']) ? $s['co'] : 'E', 't' => $t);
    }
    return array('ok' => (bool)$out, 'error' => $out ? null : 'no priced forecourts', 'updated' => $now,
                 'stations' => $out, 'n' => count($out), 'total' => count($nodes));
}

/* ---------- build ---------- */

function bmfuel_miles($la1, $lo1, $la2, $lo2) {
    $r = 3958.8; $a = deg2rad($la1); $b = deg2rad($la2);
    $x = sin(($b - $a) / 2) ** 2 + cos($a) * cos($b) * sin(deg2rad($lo2 - $lo1) / 2) ** 2;
    return 2 * $r * asin(min(1, sqrt($x)));
}

/* The same forecourt can sit in two retailer feeds (an MFG site branded Esso, say). Within 80 m and same brand = one
   station; the copy from the more recently updated feed wins. Bucketed (~0.5 km squares and their neighbours), so the
   whole UK's few thousand preview stations are not compared each with each. */
function bmfuel_dedupe($all) {
    usort($all, function ($x, $y) { return (int)$y['t'] - (int)$x['t']; });
    $kept = array(); $grid = array();
    foreach ($all as $s) {
        $gy = (int)floor($s['la'] * 200); $gx = (int)floor($s['lo'] * 130);
        $dup = false;
        for ($dy = -1; $dy <= 1 && !$dup; $dy++) for ($dx = -1; $dx <= 1 && !$dup; $dx++) {
            $k = ($gy + $dy) . ':' . ($gx + $dx);
            if (empty($grid[$k])) continue;
            foreach ($grid[$k] as $i) {
                $o = $kept[$i];
                if (strcasecmp($o['b'], $s['b']) === 0 && bmfuel_miles($o['la'], $o['lo'], $s['la'], $s['lo']) < 0.05) { $dup = true; break; }
            }
        }
        if ($dup) continue;
        $grid[$gy . ':' . $gx][] = count($kept);
        $kept[] = $s;
    }
    return $kept;
}

/* E, S, W or N(orthern Ireland): the forecourt's own country field first, else its postcode area. */
function bmfuel_country($field, $pc) {
    $f = strtolower((string)$field);
    if (strpos($f, 'scot') !== false) return 'S';
    if (strpos($f, 'wales') !== false || strpos($f, 'cymru') !== false) return 'W';
    if (strpos($f, 'northern') !== false) return 'N';
    if (strpos($f, 'england') !== false) return 'E';
    $a = bmfuel_pc_area($pc);
    if ($a === 'BT') return 'N';
    if (in_array($a, array('AB', 'DD', 'DG', 'EH', 'FK', 'G', 'HS', 'IV', 'KA', 'KW', 'KY', 'ML', 'PA', 'PH', 'TD', 'ZE'), true)) return 'S';
    if (in_array($a, array('CF', 'LD', 'LL', 'NP', 'SA'), true)) return 'W';
    return 'E';
}

/* "BH23 2BJ" -> "BH", "M1 1AA" -> "M" */
function bmfuel_pc_area($pc) {
    return preg_match('/^([A-Z]{1,2})\d/', strtoupper(trim((string)$pc)), $m) ? $m[1] : '';
}

function bmfuel_median($v) {
    $n = count($v);
    if (!$n) return null;
    sort($v);
    return round($n % 2 ? $v[($n - 1) / 2] : ($v[$n / 2 - 1] + $v[$n / 2]) / 2, 1);
}

/* ---------- publish: what the pages read ---------- */

function bmfuel_cell($la, $lo) { return 'c_' . (int)floor($la) . '_' . (int)floor($lo); }

/* A price far from the rest of the country is a typing mistake or a long-dead price, not a bargain: on 4 Oct the preview
   feeds listed BP forecourts at 131.9p unleaded against a UK median of 174.9p, and one would have topped "cheapest in the
   UK". More than 15% under or 30% over the UK median for that fuel is left out (the station keeps its other fuels). */
if (!defined('BMFUEL_LOW')) define('BMFUEL_LOW', 0.85);
if (!defined('BMFUEL_HIGH')) define('BMFUEL_HIGH', 1.30);
function bmfuel_sane($all, &$dropped) {
    $med = array();
    foreach (array('E10', 'E5', 'B7', 'SDV') as $f) {
        $v = array(); foreach ($all as $s) if (isset($s['p'][$f])) $v[] = $s['p'][$f];
        $med[$f] = bmfuel_median($v);
    }
    $out = array(); $dropped = 0;
    foreach ($all as $s) {
        foreach ($s['p'] as $f => $p) {
            if (!empty($med[$f]) && ($p < $med[$f] * BMFUEL_LOW || $p > $med[$f] * BMFUEL_HIGH)) {
                unset($s['p'][$f]); if (isset($s['pt'][$f])) unset($s['pt'][$f]); $dropped++;
            }
        }
        if ($s['p']) $out[] = $s;
    }
    return $out;
}

function bm_fuel_publish($all, $mode, $sources, $now) {
    $all = bmfuel_sane($all, $dropped);
    $dir = bmfuel_dir() . 'cells/';
    if (!is_dir($dir)) @mkdir($dir, 0755, true);
    $cells = array();
    foreach ($all as $s) $cells[bmfuel_cell($s['la'], $s['lo'])][] = $s;
    foreach ($cells as $c => $list) bmfuel_json_save('cells/' . $c . '.json', $list);
    foreach ((array)glob($dir . 'c_*.json') as $f) {                         // a square with no forecourts any more
        if (!isset($cells[basename($f, '.json')])) @unlink($f);
    }
    $stats = array('fetched_at' => $now, 'fuels' => array());
    foreach (array('E10', 'E5', 'B7', 'SDV') as $f) {
        $have = array(); $uk = array(); $co = array(); $ar = array();
        foreach ($all as $s) {
            if (!isset($s['p'][$f])) continue;
            $p = $s['p'][$f];
            $have[] = $s; $uk[] = $p;
            $co[isset($s['co']) ? $s['co'] : 'E'][] = $p;
            $a = bmfuel_pc_area($s['pc']);
            if ($a !== '') $ar[$a][] = $p;
        }
        if (!$uk) continue;
        usort($have, function ($x, $y) use ($f) {
            if ($x['p'][$f] != $y['p'][$f]) return $x['p'][$f] < $y['p'][$f] ? -1 : 1;
            $tx = isset($x['pt'][$f]) ? (int)$x['pt'][$f] : 0; $ty = isset($y['pt'][$f]) ? (int)$y['pt'][$f] : 0;
            return $ty - $tx;                                                   // same price: the most recently confirmed first
        });
        $top = array_slice($have, 0, BMFUEL_TOP);
        bmfuel_json_save('top-' . $f . '.json', $top);
        $cs = array();
        foreach ($co as $k => $v) $cs[$k] = array('n' => count($v), 'med' => bmfuel_median($v), 'min' => min($v));
        $as = array();
        foreach ($ar as $k => $v) if (count($v) >= 3) $as[$k] = array(count($v), bmfuel_median($v), min($v));
        $stats['fuels'][$f] = array(
            'uk' => array('n' => count($uk), 'med' => bmfuel_median($uk), 'min' => min($uk), 'max' => max($uk),
                          'avg' => round(array_sum($uk) / count($uk), 1)),
            'co' => $cs, 'areas' => $as, 'top' => array_slice($top, 0, 10),
        );
    }
    /* By brand (owner 4 Oct: "which supermarket has the cheapest fuel"): every brand with 10+ forecourts, and every
       supermarket however few; then the supermarkets taken together against every other forecourt. Per fuel:
       array(forecourts, median, lowest). */
    $bp = array(); $bn = array(); $gp = array();
    foreach ($all as $s) {
        $b = $s['b']; $bn[$b] = isset($bn[$b]) ? $bn[$b] + 1 : 1;
        $g = bmfuel_is_super($b) ? 'super' : 'other';
        foreach ($s['p'] as $f => $p) { $bp[$b][$f][] = $p; $gp[$g][$f][] = $p; }
    }
    $brands = array();
    foreach ($bn as $b => $n) {
        if ($n < 10 && !bmfuel_is_super($b)) continue;
        $row = array('n' => $n, 'super' => bmfuel_is_super($b));
        foreach ($bp[$b] as $f => $v) $row[$f] = array(count($v), bmfuel_median($v), min($v));
        $brands[$b] = $row;
    }
    $stats['brands'] = $brands;
    foreach ($gp as $g => $fs) foreach ($fs as $f => $v) $stats['groups'][$g][$f] = array(count($v), bmfuel_median($v), min($v));
    bmfuel_json_save('stats.json', $stats);
    if ($mode === 'official') bmfuel_history_add($all, $stats, $now);
    bmfuel_json_save('meta.json', array('v' => 2, 'mode' => $mode, 'partial' => $mode !== 'official', 'fetched_at' => $now,
                                        'sources' => $sources, 'n' => count($all), 'dropped' => $dropped));
    @unlink(bmfuel_dir() . 'stations.json');                                  // the south-coast-only file of 4 Oct
}

/* ---------- going up or down: our own daily record + the government's weekly series ---------- */

/* One line a day from every forecourt (owner 4 Oct: "keep a daily price history"): the UK median of each fuel, and
   unleaded and diesel within BMFUEL_HOME_MI of Bournemouth town centre. Rewritten at every publish, so a day ends
   holding its last prices. Starts on 4 Oct 2026 - nothing earlier exists, and nothing is back-filled. */
if (!defined('BMFUEL_HOME_MI')) define('BMFUEL_HOME_MI', 6);
function bmfuel_uk_day($t) {
    $d = new DateTime('@' . (int)$t); $d->setTimezone(new DateTimeZone('Europe/London'));
    return $d->format('Y-m-d');
}
function bmfuel_history_add($all, $stats, $now) {
    $day = array('t' => $now, 'uk' => array(), 'bm' => array());
    foreach ($stats['fuels'] as $f => $x) $day['uk'][$f] = array($x['uk']['n'], $x['uk']['med']);
    $loc = array();
    foreach ($all as $s) {
        if (abs($s['la'] - 50.7208) > 0.1 || abs($s['lo'] + 1.8794) > 0.15) continue;   // cheap box first
        if (bmfuel_miles(50.7208, -1.8794, $s['la'], $s['lo']) > BMFUEL_HOME_MI) continue;
        foreach ($s['p'] as $f => $p) $loc[$f][] = $p;
    }
    foreach ($loc as $f => $v) $day['bm'][$f] = array(count($v), bmfuel_median($v));
    $h = bmfuel_json_load('history.json');
    if (empty($h['days']) || !is_array($h['days'])) $h = array('v' => 1, 'days' => array());
    $h['days'][bmfuel_uk_day($now)] = $day;
    ksort($h['days']);
    bmfuel_json_save('history.json', $h);
}

/* The government's weekly UK average pump prices (DESNZ "Weekly road fuel prices", published each Tuesday for the
   Monday; OGL v3), June 2003 onwards. Found through GOV.UK's content API, which lists the current CSV files (their
   addresses change every week); a file is only downloaded when its address is new. Checked every BMFUEL_DESNZ_EVERY;
   anything odd keeps the last good copy. Stored as rows of array('Y-m-d', unleaded, diesel), and the latest week's fuel
   duty (pence a litre) and VAT (%) as 'tax' => array('Y-m-d', duty unleaded, duty diesel, VAT % unleaded, VAT % diesel). */
if (!defined('BMFUEL_DESNZ_EVERY')) define('BMFUEL_DESNZ_EVERY', 6 * 3600);
if (!defined('BMFUEL_DESNZ_API')) define('BMFUEL_DESNZ_API', 'https://www.gov.uk/api/content/government/statistics/weekly-road-fuel-prices');
function bmfuel_desnz_parse($csv) {
    $rows = array();
    $lines = preg_split('/\r\n|\n|\r/', preg_replace('/^\xEF\xBB\xBF/', '', (string)$csv));
    $head = str_getcsv(array_shift($lines));
    $iu = $id = $tu = $td = $vu = $vd = null;   // pump prices; duty (p a litre) and VAT (%) for each
    foreach ($head as $i => $c) {
        $u = stripos($c, 'ULSP') !== false; $d = stripos($c, 'ULSD') !== false;
        if (stripos($c, 'pump') !== false) { if ($u && $iu === null) $iu = $i; if ($d && $id === null) $id = $i; }
        if (stripos($c, 'duty') !== false) { if ($u && $tu === null) $tu = $i; if ($d && $td === null) $td = $i; }
        if (stripos($c, 'VAT') !== false) { if ($u && $vu === null) $vu = $i; if ($d && $vd === null) $vd = $i; }
    }
    if ($iu === null || $id === null) return array();
    $num = function ($x, $i) { return ($i !== null && isset($x[$i]) && is_numeric(trim($x[$i]))) ? (float)trim($x[$i]) : null; };
    foreach ($lines as $l) {
        if (trim($l) === '') continue;
        $x = str_getcsv($l);
        if (!isset($x[$iu], $x[$id]) || !preg_match('#^(\d{1,2})/(\d{1,2})/(\d{4})$#', trim($x[0]), $m)) continue;
        $u = (float)$x[$iu]; $d = (float)$x[$id];
        if ($u < 40 || $u > 400 || $d < 40 || $d > 400) continue;
        $rows[] = array(sprintf('%04d-%02d-%02d', $m[3], $m[2], $m[1]), round($u, 2), round($d, 2), $num($x, $tu), $num($x, $td), $num($x, $vu), $num($x, $vd));
    }
    return $rows;
}
function bmfuel_desnz_refresh($now) {
    $w = bmfuel_json_load('desnz.json');
    if (!empty($w['checked']) && $now - (int)$w['checked'] < BMFUEL_DESNZ_EVERY) return array('ok' => true, 'skipped' => 'ttl');
    $w['checked'] = $now;
    bmfuel_json_save('desnz.json', $w);                                   // claim the slot first (as beat.json does)
    list($code, $body) = bmfuel_http(BMFUEL_DESNZ_API, 15);
    $j = $body ? json_decode($body, true) : null;
    if (empty($j['details']['attachments'])) { $w['error'] = 'content API ' . $code; bmfuel_json_save('desnz.json', $w); return array('ok' => false, 'error' => $w['error']); }
    $files = bmfuel_json_load('desnz-files.json');   // url => rows: an unchanged address is never downloaded twice
    $want = array(); $changed = false;
    foreach ($j['details']['attachments'] as $a) {
        $url = isset($a['url']) ? (string)$a['url'] : '';
        if ((isset($a['content_type']) && stripos($a['content_type'], 'csv') === false) || !preg_match('#^https://assets\.publishing\.service\.gov\.uk/.+\.csv$#i', $url)) continue;
        $want[$url] = true;
        if (isset($files[$url])) continue;
        list($c2, $csv) = bmfuel_http($url, 20);
        $rows = $csv ? bmfuel_desnz_parse($csv) : array();
        if (count($rows) < 20) { $w['error'] = 'CSV ' . $c2 . ' unreadable'; bmfuel_json_save('desnz.json', $w); return array('ok' => false, 'error' => $w['error']); }
        $files[$url] = $rows; $changed = true;
    }
    if (!$want) { $w['error'] = 'no CSV listed'; bmfuel_json_save('desnz.json', $w); return array('ok' => false, 'error' => $w['error']); }
    foreach (array_keys($files) as $u) if (!isset($want[$u])) { unset($files[$u]); $changed = true; }   // last week's file
    if ($changed || empty($w['rows'])) {
        $by = array();
        foreach ($files as $rows) foreach ($rows as $r) $by[$r[0]] = $r;
        ksort($by);
        $rows = array_values($by);
        $last = end($rows);
        // a series that went backwards or lost most of its history is a bad download, not news
        if (count($rows) < 500 || (!empty($w['rows']) && $last[0] < $w['rows'][count($w['rows']) - 1][0])) {
            $w['error'] = 'series looked wrong (' . count($rows) . ' weeks)'; bmfuel_json_save('desnz.json', $w); return array('ok' => false, 'error' => $w['error']);
        }
        // the page needs date + the two prices a week; duty and VAT only for the latest week
        $w['rows'] = array_map(function ($r) { return array($r[0], $r[1], $r[2]); }, $rows);
        $w['tax'] = (isset($last[3], $last[4], $last[5], $last[6])) ? array($last[0], $last[3], $last[4], $last[5], $last[6]) : null;
        bmfuel_json_save('desnz-files.json', $files);
    }
    $w['published'] = isset($j['public_updated_at']) ? (string)$j['public_updated_at'] : null;
    $w['page'] = 'https://www.gov.uk/government/statistics/weekly-road-fuel-prices';
    unset($w['error']);
    bmfuel_json_save('desnz.json', $w);
    return array('ok' => true, 'weeks' => count($w['rows']));
}

/* What the "going up or down" section reads: the weekly series and our daily lines. */
function bm_fuel_trend() {
    $w = bmfuel_json_load('desnz.json');
    $h = bmfuel_json_load('history.json');
    if (empty($w['rows']) && empty($h['days'])) return array('ok' => false, 'error' => 'no data yet');
    $days = array();
    foreach ((isset($h['days']) ? $h['days'] : array()) as $d => $x) {
        $days[] = array($d, isset($x['uk']['E10']) ? $x['uk']['E10'][1] : null, isset($x['uk']['B7']) ? $x['uk']['B7'][1] : null,
                        isset($x['bm']['E10']) ? $x['bm']['E10'][1] : null, isset($x['bm']['B7']) ? $x['bm']['B7'][1] : null);
    }
    return array('ok' => true, 'weeks' => isset($w['rows']) ? $w['rows'] : array(), 'tax' => isset($w['tax']) ? $w['tax'] : null,
                 'published' => isset($w['published']) ? $w['published'] : null,
                 'source' => isset($w['page']) ? $w['page'] : null, 'days' => $days);
}

function bm_fuel_refresh($force = false) {
    $now = time();
    try { bmfuel_desnz_refresh($now); } catch (Throwable $e) {}   // its own 6-hour cadence; a few ms when not due
    $beat = bmfuel_json_load('beat.json');
    // A key file saved or replaced since the last run makes this run due at once: uploading the key shows results at
    // the next cron tick, not up to half an hour later.
    $kf = bmfuel_dir() . 'fuelfinder-key.php';
    $keyNew = file_exists($kf) && !empty($beat['t']) && @filemtime($kf) > (int)$beat['t'];
    $noMeta = !file_exists(bmfuel_dir() . 'meta.json');                // first run of a new store layout: do it now
    if (!$force && !$keyNew && !$noMeta && !empty($beat['t']) && $now - (int)$beat['t'] < BMFUEL_TTL) return array('ok' => true, 'skipped' => 'ttl');
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
        $meta = bmfuel_json_load('meta.json');
        if ($off['ok'] && $off['stations']) {
            $mode = 'official'; $all = $off['stations'];
        } elseif (bmfuel_official_key() && !empty($meta['mode']) && $meta['mode'] === 'official'
                  && $now - (int)$meta['fetched_at'] < BMFUEL_KEEP_OFFICIAL) {
            // The official feed had a bad moment: keep showing its last good prices (the page says how old they are)
            // rather than dropping to the partial retailer feeds and losing the supermarkets.
            $meta['sources'][0]['error'] = $off['error'];
            $meta['last_error'] = $off['error'] . ' at ' . date('H:i', $now);
            bmfuel_json_save('meta.json', $meta);
            return array('ok' => false, 'kept' => 'last official data', 'error' => $off['error']);
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
        if (!$all) {   // keep the last good files rather than replacing them with nothing
            if ($meta) { $meta['last_error'] = 'no source answered at ' . date('H:i', $now); bmfuel_json_save('meta.json', $meta); }
            return array('ok' => false, 'error' => 'no stations', 'sources' => $sources);
        }
        bm_fuel_publish(array_values($all), $mode, $sources, $now);
        return array('ok' => true, 'mode' => $mode, 'stations' => count($all));
    } finally {
        @flock($lk, LOCK_UN); @fclose($lk);
    }
}

/* ---------- what the pages ask ---------- */

/* When the prices were fetched and where from; every answer carries it. */
function bm_fuel_meta() {
    $m = bmfuel_json_load('meta.json');
    if (!$m) return array('ok' => false, 'error' => 'no data yet');
    return array('ok' => true, 'mode' => $m['mode'], 'partial' => !empty($m['partial']), 'fetched_at' => (int)$m['fetched_at'],
                 'stale' => (time() - (int)$m['fetched_at']) > BMFUEL_STALE, 'sources' => $m['sources'], 'n' => isset($m['n']) ? $m['n'] : 0);
}

function bmfuel_fuel($f) { return in_array($f, array('E10', 'E5', 'B7', 'SDV'), true) ? $f : 'E10'; }

/* The cheapest forecourts within $r miles of a point. The point is rounded to 0.1 degree HERE as well as in the page
   (about 10 km), and the search reaches BMFUEL_SLACK miles further so the page can trim to the exact distance from
   the visitor's real position. Also: how many, the median and the lowest within $r - "around you". */
if (!defined('BMFUEL_SLACK')) define('BMFUEL_SLACK', 5);
function bm_fuel_near($la, $lo, $r, $f) {
    $m = bm_fuel_meta();
    if (!$m['ok']) return $m;
    $f = bmfuel_fuel($f);
    $la = round((float)$la, 1); $lo = round((float)$lo, 1);
    $r = max(1, min(100, (int)$r));
    list($W, $S, $E, $N) = bmfuel_area();
    if ($lo < $W - 1 || $lo > $E + 1 || $la < $S - 1 || $la > $N + 1) return array('ok' => false, 'error' => 'outside the UK');
    $R = $r + BMFUEL_SLACK;
    $dLa = $R / 69; $dLo = $R / (69 * max(0.2, cos(deg2rad($la))));
    $cand = array(); $inR = array();
    for ($cy = (int)floor($la - $dLa); $cy <= (int)floor($la + $dLa); $cy++) {
        for ($cx = (int)floor($lo - $dLo); $cx <= (int)floor($lo + $dLo); $cx++) {
            foreach (bmfuel_json_load('cells/c_' . $cy . '_' . $cx . '.json') as $s) {
                if (!isset($s['p'][$f])) continue;
                $d = bmfuel_miles($la, $lo, $s['la'], $s['lo']);
                if ($d > $R) continue;
                $cand[] = array($s['p'][$f], $d, $s);
                if ($d <= $r) $inR[] = $s['p'][$f];
            }
        }
    }
    usort($cand, function ($x, $y) { return $x[0] == $y[0] ? ($x[1] < $y[1] ? -1 : 1) : ($x[0] < $y[0] ? -1 : 1); });
    $list = array();
    foreach (array_slice($cand, 0, BMFUEL_TOP) as $c) $list[] = $c[2];
    return $m + array('f' => $f, 'r' => $r, 'la' => $la, 'lo' => $lo, 'cut' => count($cand) > BMFUEL_TOP,
                      'around' => array('n' => count($inR), 'med' => bmfuel_median($inR), 'min' => $inR ? min($inR) : null),
                      'stations' => $list);
}

/* The cheapest in the whole UK for one fuel (written by bm_fuel_publish). */
function bm_fuel_top($f) {
    $m = bm_fuel_meta();
    if (!$m['ok']) return $m;
    $f = bmfuel_fuel($f);
    return $m + array('f' => $f, 'r' => 'uk', 'stations' => bmfuel_json_load('top-' . $f . '.json'));
}

/* The UK, the four nations and every postcode area, for every fuel; by brand; supermarkets against the rest. */
function bm_fuel_stats() {
    $m = bm_fuel_meta();
    if (!$m['ok']) return $m;
    $s = bmfuel_json_load('stats.json');
    return $m + array('fuels' => isset($s['fuels']) ? $s['fuels'] : array(), 'brands' => isset($s['brands']) ? $s['brands'] : array(),
                      'groups' => isset($s['groups']) ? $s['groups'] : array());
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
