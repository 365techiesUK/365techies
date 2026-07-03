<?php
/* Live service-status aggregator for /is-it-down/.
   Upstreams are HARDCODED below (no user input reaches curl — no SSRF surface),
   HTTPS-only including redirects, and every response is size-capped.
   Whole-file cache with 120s TTL + a refresh-lock so only ONE request ever runs
   the upstream sweep (everyone else serves the cached file);
   per-service stale fallback for up to 30 min if an individual upstream fails. */
error_reporting(0);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$CACHE = __DIR__ . '/isitdown-cache.json';
$TTL   = 120;

if (is_file($CACHE) && (time() - filemtime($CACHE)) < $TTL) { readfile($CACHE); exit; }

/* Refresh ticket: exactly one request sweeps the upstreams; the rest serve stale.
   A lock older than 30s is from a crashed run — clear it. */
$LOCK = $CACHE . '.lock';
if (is_file($LOCK) && (time() - (int)@filemtime($LOCK)) > 30) @unlink($LOCK);
$lk = @fopen($LOCK, 'x');
if ($lk === false) {
    if (is_file($CACHE)) { readfile($CACHE); exit; }
    echo '{"ok":false,"warming":true}'; exit;
}
fclose($lk);
register_shutdown_function(function () use ($LOCK) { @unlink($LOCK); });

$old  = @json_decode((string)@file_get_contents($CACHE), true);
$oldS = (is_array($old) && isset($old['services']) && is_array($old['services'])) ? $old['services'] : [];
$oldT = (is_array($old) && isset($old['t'])) ? (int)$old['t'] : 0;

/* ---- upstream feeds (verified 2026-07-03) ---- */
$SP = [ // Statuspage-v2-compatible JSON: status.indicator = none|minor|major|critical
    'github'     => 'https://www.githubstatus.com/api/v2/status.json',
    'cloudflare' => 'https://www.cloudflarestatus.com/api/v2/status.json',
    'discord'    => 'https://discordstatus.com/api/v2/status.json',
    'dropbox'    => 'https://status.dropbox.com/api/v2/status.json',
    'zoom'       => 'https://www.zoomstatus.com/api/v2/status.json',
    'chatgpt'    => 'https://status.openai.com/api/v2/status.json',
    'claude'     => 'https://status.claude.com/api/v2/status.json',
    'reddit'     => 'https://www.redditstatus.com/api/v2/status.json',
    'twitch'     => 'https://status.twitch.com/api/v2/status.json',
    'epic'       => 'https://status.epicgames.com/api/v2/status.json',
    'spotify'    => 'https://spotify.statuspage.io/api/v2/status.json',
    'canva'      => 'https://www.canvastatus.com/api/v2/status.json',
];
$SPECIAL = [
    'slack'  => 'https://slack-status.com/api/v2.0.0/current',
    'google' => 'https://www.google.com/appsstatus/dashboard/incidents.json',
    'psn'    => 'https://status.playstation.com/data/statuses/region/SCEE.json',
    'xbox'   => 'https://xnotify.xboxlive.com/servicestatusv6/GB/en-GB',
    'm365'   => 'https://status.cloud.microsoft/api/posts/mac',
    'azure'  => 'https://azure.status.microsoft/en-gb/status/feed/',
    'meta'   => 'https://metastatus.com/data/orgs.json',
];
$PROBE = [ // no official public feed exists — reachability from our monitoring server
    'x'        => 'https://x.com/',
    'tiktok'   => 'https://www.tiktok.com/',
    'snapchat' => 'https://www.snapchat.com/',
    'youtube'  => 'https://www.youtube.com/',
    'netflix'  => 'https://www.netflix.com/gb/',
    'steam'    => 'https://store.steampowered.com/',
    'amazon'   => 'https://www.amazon.co.uk/',
    'bbc'      => 'https://www.bbc.co.uk/',
];

$bufs = [];
function mkh($url, $key, $cap, &$bufs) {
    $bufs[$key] = '';
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS      => 4,
        CURLOPT_PROTOCOLS      => CURLPROTO_HTTPS,
        CURLOPT_REDIR_PROTOCOLS => CURLPROTO_HTTPS,
        CURLOPT_CONNECTTIMEOUT => 4,
        CURLOPT_TIMEOUT        => ($cap > 2097152) ? 12 : 8,
        CURLOPT_ENCODING       => '',
        CURLOPT_USERAGENT      => 'Mozilla/5.0 (compatible; 365techies-status/1.0; +https://365techies.co.uk/is-it-down/)',
        CURLOPT_WRITEFUNCTION  => function ($c, $data) use (&$bufs, $key, $cap) {
            if (strlen($bufs[$key]) + strlen($data) > $cap) return -1; // abort oversized responses
            $bufs[$key] .= $data;
            return strlen($data);
        },
    ]);
    return $ch;
}

$mh = curl_multi_init();
$hs = [];
foreach ($SP as $k => $u)      { $hs[$k] = mkh($u, $k, 2097152, $bufs); curl_multi_add_handle($mh, $hs[$k]); }
foreach ($SPECIAL as $k => $u) { $hs[$k] = mkh($u, $k, ($k === 'google') ? 10485760 : 2097152, $bufs); curl_multi_add_handle($mh, $hs[$k]); }
foreach ($PROBE as $k => $u)   { $hs['p_' . $k] = mkh($u, 'p_' . $k, 1048576, $bufs); curl_multi_add_handle($mh, $hs['p_' . $k]); }

$run = null;
do {
    curl_multi_exec($mh, $run);
    if ($run > 0 && curl_multi_select($mh, 0.25) === -1) usleep(100000);
} while ($run > 0);

$body = []; $code = [];
foreach ($hs as $k => $ch) {
    $body[$k] = $bufs[$k];
    $code[$k] = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_multi_remove_handle($mh, $ch);
    curl_close($ch);
}
curl_multi_close($mh);

function clean($s, $n = 150) {
    $s = str_replace(['<![CDATA[', ']]>'], '', (string)$s);
    $s = trim(preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\s]+/', ' ', strip_tags($s)));
    if (function_exists('mb_convert_encoding')) $s = (string)mb_convert_encoding($s, 'UTF-8', 'UTF-8');
    if (function_exists('mb_strlen')) {
        return (mb_strlen($s, 'UTF-8') > $n) ? mb_substr($s, 0, $n - 1, 'UTF-8') . '…' : $s;
    }
    return (strlen($s) > $n) ? substr($s, 0, $n - 1) . '…' : $s;
}

$svc = [];
function put(&$svc, $id, $s, $d) { $svc[$id] = ['s' => $s, 'd' => $d]; }

/* Statuspage family */
$IND = ['none' => 'ok', 'minor' => 'warn', 'major' => 'down', 'critical' => 'down'];
foreach ($SP as $k => $u) {
    $j = json_decode($body[$k], true);
    if (!isset($j['status']['indicator'])) { put($svc, $k, 'unknown', ''); continue; }
    $ind = $j['status']['indicator'];
    put($svc, $k, isset($IND[$ind]) ? $IND[$ind] : 'warn', clean(isset($j['status']['description']) ? $j['status']['description'] : ''));
}

/* Slack (own API): status = ok | active */
$j = json_decode($body['slack'], true);
if (!isset($j['status'])) { put($svc, 'slack', 'unknown', ''); }
elseif ($j['status'] === 'ok') { put($svc, 'slack', 'ok', ''); }
else {
    $d = '';
    if (!empty($j['active_incidents'][0]['title'])) $d = clean($j['active_incidents'][0]['title']);
    $type = isset($j['active_incidents'][0]['type']) ? $j['active_incidents'][0]['type'] : '';
    put($svc, 'slack', ($type === 'outage') ? 'down' : 'warn', $d);
}

/* Google Workspace dashboard: ongoing incident = entry without "end" */
$j = json_decode($body['google'], true);
if (!is_array($j)) { put($svc, 'gmail', 'unknown', ''); put($svc, 'gworkspace', 'unknown', ''); }
else {
    $gm = ['s' => 'ok', 'd' => '']; $gw = ['s' => 'ok', 'd' => ''];
    foreach ($j as $inc) {
        if (!is_array($inc) || !empty($inc['end'])) continue;
        $st = isset($inc['most_recent_update']['status']) ? $inc['most_recent_update']['status'] : '';
        if ($st === 'AVAILABLE') continue;
        $sev  = ($st === 'SERVICE_OUTAGE') ? 'down' : 'warn';
        $desc = clean(isset($inc['external_desc']) ? $inc['external_desc'] : (isset($inc['service_name']) ? $inc['service_name'] : 'Ongoing incident'));
        $prods = '';
        if (isset($inc['affected_products']) && is_array($inc['affected_products'])) {
            foreach ($inc['affected_products'] as $p) if (isset($p['title'])) $prods .= '|' . $p['title'];
        }
        if (isset($inc['service_name'])) $prods .= '|' . $inc['service_name'];
        if (stripos($prods, 'Gmail') !== false) { if ($gm['s'] !== 'down') $gm = ['s' => $sev, 'd' => $desc]; }
        else { if ($gw['s'] !== 'down') $gw = ['s' => $sev, 'd' => $desc]; }
    }
    put($svc, 'gmail', $gm['s'], $gm['d']);
    put($svc, 'gworkspace', $gw['s'], $gw['d']);
}

/* PlayStation Network (Europe region): non-empty region status[] = problem */
$j = json_decode($body['psn'], true);
if (!is_array($j) || !array_key_exists('status', $j)) { put($svc, 'psn', 'unknown', ''); }
elseif (empty($j['status'])) { put($svc, 'psn', 'ok', ''); }
else {
    $e = $j['status'][0];
    $down = (isset($e['statusType']) && stripos($e['statusType'], 'outage') !== false);
    put($svc, 'psn', $down ? 'down' : 'warn', clean(isset($e['message']) ? $e['message'] : 'Some services affected'));
}

/* Xbox Live: XML, Overall State = None | Impacted | Unavailable */
$xb = $body['xbox'];
if ($xb === '' || stripos($xb, '<Overall') === false) { put($svc, 'xbox', 'unknown', ''); }
else {
    $state = '';
    if (preg_match('/<Overall>(.*?)<\/Overall>/s', $xb, $blk) && preg_match('/<State>\s*([A-Za-z]+)\s*<\/State>/', $blk[1], $m)) $state = $m[1];
    elseif (preg_match('/<Overall[^>]*State="([A-Za-z]+)"/', $xb, $m)) $state = $m[1];
    if ($state === 'None') put($svc, 'xbox', 'ok', '');
    elseif ($state === 'Impacted') put($svc, 'xbox', 'warn', 'Some Xbox services impacted');
    elseif ($state !== '') put($svc, 'xbox', 'down', 'Xbox services unavailable');
    else put($svc, 'xbox', 'unknown', '');
}

/* Microsoft 365 public fallback feed (widespread incidents only) */
$j = json_decode($body['m365'], true);
if (!isset($j['Status'])) { put($svc, 'm365', 'unknown', ''); }
elseif ($j['Status'] === 'Available') { put($svc, 'm365', 'ok', 'No widespread issues reported'); }
else {
    $sev = preg_match('/unavailable|outage|interruption/i', $j['Status']) ? 'down' : 'warn';
    put($svc, 'm365', $sev, clean(isset($j['Message']) ? $j['Message'] : 'Widespread service incident'));
}

/* Azure status RSS: <item> entries only exist during incidents */
$az = $body['azure'];
if ($code['azure'] !== 200 || stripos($az, '<rss') === false) { put($svc, 'azure', 'unknown', ''); }
elseif (stripos($az, '<item>') === false) { put($svc, 'azure', 'ok', ''); }
else {
    $t = 'Ongoing platform incident';
    if (preg_match('/<item>.*?<title>(.*?)<\/title>/s', $az, $m)) $t = clean($m[1]);
    put($svc, 'azure', 'warn', $t);
}

/* Meta business-platform signals (no official consumer feed exists) */
$j = json_decode($body['meta'], true);
$METAMAP = [
    'facebook'  => ['facebook-login', 'graph-api'],
    'instagram' => ['facebook-login', 'graph-api'],
    'messenger' => ['messenger'],
    'whatsapp'  => ['whatsapp-business-api'],
];
if (!is_array($j)) {
    foreach ($METAMAP as $id => $orgs) put($svc, $id, 'unknown', '');
} else {
    $orgStatus = [];
    foreach ($j as $org) {
        if (!isset($org['id'], $org['services']) || !is_array($org['services'])) continue;
        foreach ($org['services'] as $s) {
            $txt = isset($s['status']) ? trim((string)$s['status']) : '';
            if ($txt !== '' && strcasecmp($txt, 'No known issues') !== 0) {
                if (!isset($orgStatus[$org['id']])) $orgStatus[$org['id']] = clean($txt, 90);
            }
        }
        if (!isset($orgStatus[$org['id']])) $orgStatus[$org['id']] = '';
    }
    foreach ($METAMAP as $id => $orgs) {
        $bad = ''; $seen = false;
        foreach ($orgs as $o) {
            if (isset($orgStatus[$o])) { $seen = true; if ($orgStatus[$o] !== '') $bad = $orgStatus[$o]; }
        }
        if (!$seen) put($svc, $id, 'unknown', '');
        elseif ($bad !== '') put($svc, $id, 'warn', 'Platform signal: ' . $bad);
        else put($svc, $id, 'ok', '');
    }
}

/* Server-side reachability probes: any HTTP response = the service answered.
   Code 0 stays amber, not red — we can't tell a target outage from a local blip. */
foreach ($PROBE as $k => $u) {
    $c = $code['p_' . $k];
    if ($c === 0) put($svc, $k, 'warn', 'Didn\'t answer our monitoring server just now');
    elseif ($c >= 500) put($svc, $k, 'warn', 'Responding with server errors (HTTP ' . $c . ')');
    else put($svc, $k, 'ok', '');
}

/* Per-service stale fallback, capped at 30 min from when the reading was actually fetched */
foreach ($svc as $id => $v) {
    if ($v['s'] === 'unknown' && isset($oldS[$id]['s']) && $oldS[$id]['s'] !== 'unknown') {
        $ft = isset($oldS[$id]['ft']) ? (int)$oldS[$id]['ft'] : $oldT;
        if ($ft > 0 && (time() - $ft) < 1800) {
            $svc[$id] = $oldS[$id];
            $svc[$id]['stale'] = true;
            $svc[$id]['ft'] = $ft;
        }
    }
}

$out  = ['ok' => true, 't' => time(), 'ttl' => $TTL, 'services' => $svc];
$json = json_encode($out, JSON_INVALID_UTF8_SUBSTITUTE);
if (!is_string($json) || $json === '') {
    $json = '{"ok":false,"error":"encode"}';   // never cache a failed encode
} else {
    @file_put_contents($CACHE . '.tmp', $json, LOCK_EX);
    @rename($CACHE . '.tmp', $CACHE);          // atomic swap — readers never see a half-written file
}
echo $json;
