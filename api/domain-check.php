<?php
/*
 * Domain expiry checker endpoint for /domain-expiry-checker/.
 * GET ?domain=example.co.uk -> looks the domain up via RDAP (the registries' own
 * free, official successor to WHOIS, via the rdap.org bootstrap) and returns
 * expiry date, days left, registrar and status. Results cached 6h per domain.
 * No secrets involved; only ever talks to rdap.org + registry redirects (https).
 */
error_reporting(0);
ini_set('serialize_precision', '-1');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function fail($err, $code = 200) { http_response_code($code); echo json_encode(['ok' => false, 'error' => $err]); exit; }

$d = isset($_GET['domain']) ? strtolower(trim((string)$_GET['domain'])) : '';
$d = preg_replace('#^[a-z][a-z0-9+.\-]*://#', '', $d);
$d = preg_replace('#[/?\#].*$#', '', $d);
$d = preg_replace('/^www\./', '', rtrim($d, '.'));
if ($d === '' || strlen($d) > 253 || !preg_match('/^[a-z0-9]([a-z0-9\-.]*[a-z0-9])?$/', $d) || strpos($d, '.') === false) fail('bad-domain');

/* per-domain cache (6h), single capped file */
$CACHEF = __DIR__ . '/domain-cache.json';
$cache = @json_decode((string)@file_get_contents($CACHEF), true);
if (!is_array($cache)) $cache = [];
if (isset($cache[$d]) && (time() - $cache[$d]['t']) < 21600) { echo json_encode($cache[$d]['r']); exit; }

/* shared rate limit for the lookup tools: 12/min site-wide */
$RATEF = __DIR__ . '/tools-rate.json';
$min = (int)floor(time() / 60);
$rate = @json_decode((string)@file_get_contents($RATEF), true);
if (!is_array($rate) || !isset($rate['min']) || $rate['min'] !== $min) $rate = ['min' => $min, 'n' => 0];
if ($rate['n'] >= 12) fail('rate', 429);
$rate['n']++;
@file_put_contents($RATEF, json_encode($rate), LOCK_EX);

function rdap_get($domain) {
    $ch = curl_init('https://rdap.org/domain/' . rawurlencode($domain));
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS      => 5,
        CURLOPT_REDIR_PROTOCOLS => CURLPROTO_HTTPS,
        CURLOPT_TIMEOUT        => 18,
        CURLOPT_HTTPHEADER     => ['Accept: application/rdap+json'],
        CURLOPT_USERAGENT      => '365techies-domain-checker',
    ]);
    $body = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
    if ($code !== 200 || !$body) return null;
    $j = json_decode($body, true);
    return is_array($j) ? $j : null;
}

/* try as entered, then strip subdomain labels (www.shop.foo.co.uk -> shop.foo.co.uk -> foo.co.uk) */
$try = $d; $j = null; $guard = 0;
while ($try !== null && $guard < 4) {
    $j = rdap_get($try);
    if ($j) break;
    $pos = strpos($try, '.');
    $rest = substr($try, $pos + 1);
    $try = (substr_count($rest, '.') >= 1) ? $rest : null;   // keep at least two labels
    $guard++;
}
if (!$j) fail('not-found');

$expires = null; $created = null; $changed = null;
foreach ((isset($j['events']) && is_array($j['events'])) ? $j['events'] : [] as $e) {
    if (!isset($e['eventAction'], $e['eventDate'])) continue;
    if ($e['eventAction'] === 'expiration') $expires = $e['eventDate'];
    if ($e['eventAction'] === 'registration') $created = $e['eventDate'];
    if ($e['eventAction'] === 'last changed') $changed = $e['eventDate'];
}
$registrar = null;
foreach ((isset($j['entities']) && is_array($j['entities'])) ? $j['entities'] : [] as $ent) {
    if (isset($ent['roles']) && in_array('registrar', $ent['roles'], true) && isset($ent['vcardArray'][1])) {
        foreach ($ent['vcardArray'][1] as $v) { if (isset($v[0]) && $v[0] === 'fn' && isset($v[3])) { $registrar = (string)$v[3]; break; } }
    }
    if ($registrar) break;
}
$expTs = $expires ? strtotime($expires) : 0;
$out = [
    'ok'        => true,
    'domain'    => $try,
    'expires'   => $expTs ? gmdate('j M Y', $expTs) : null,
    'daysLeft'  => $expTs ? (int)floor(($expTs - time()) / 86400) : null,
    'created'   => $created ? gmdate('j M Y', strtotime($created)) : null,
    'registrar' => $registrar,
    'statuses'  => (isset($j['status']) && is_array($j['status'])) ? array_slice($j['status'], 0, 6) : [],
];

/* cache (cap ~200 entries, drop stale) */
foreach ($cache as $k => $v) { if (time() - $v['t'] > 86400) unset($cache[$k]); }
if (count($cache) > 200) $cache = array_slice($cache, -100, null, true);
$cache[$d] = ['t' => time(), 'r' => $out];
@file_put_contents($CACHEF, json_encode($cache), LOCK_EX);

echo json_encode($out);
