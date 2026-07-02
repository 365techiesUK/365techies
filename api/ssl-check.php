<?php
/*
 * SSL certificate checker endpoint for /ssl-checker/.
 * GET ?domain=example.com -> connects to the host on 443, reads its certificate and
 * returns a safe JSON summary (issued-to, issuer, expiry, days left, trusted or not).
 * No secrets involved. Rate-limited; refuses private/internal addresses (no SSRF).
 */
error_reporting(0);
ini_set('serialize_precision', '-1');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function fail($err, $code = 200) { http_response_code($code); echo json_encode(['ok' => false, 'error' => $err]); exit; }

/* shared rate limit for the lookup tools: 12/min site-wide */
$RATEF = __DIR__ . '/tools-rate.json';
$min = (int)floor(time() / 60);
$rate = @json_decode((string)@file_get_contents($RATEF), true);
if (!is_array($rate) || !isset($rate['min']) || $rate['min'] !== $min) $rate = ['min' => $min, 'n' => 0];
if ($rate['n'] >= 12) fail('rate', 429);
$rate['n']++;
@file_put_contents($RATEF, json_encode($rate), LOCK_EX);

$d = isset($_GET['domain']) ? strtolower(trim((string)$_GET['domain'])) : '';
$d = preg_replace('#^[a-z][a-z0-9+.\-]*://#', '', $d);
$d = preg_replace('#[/?\#].*$#', '', $d);
$d = rtrim($d, '.');
if ($d === '' || strlen($d) > 253 || !preg_match('/^[a-z0-9]([a-z0-9\-.]*[a-z0-9])?$/', $d) || strpos($d, '.') === false) fail('bad-domain');

/* SSRF guard: never connect to private/reserved addresses */
$ip = gethostbyname($d);
if ($ip === $d && !filter_var($d, FILTER_VALIDATE_IP)) fail('no-dns');
if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) fail('bad-domain');

function grab_cert($host, $verify) {
    $ctx = stream_context_create(['ssl' => [
        'capture_peer_cert' => true, 'SNI_enabled' => true, 'peer_name' => $host,
        'verify_peer' => $verify, 'verify_peer_name' => $verify, 'allow_self_signed' => !$verify,
    ]]);
    $fp = @stream_socket_client('tls://' . $host . ':443', $en, $es, 10, STREAM_CLIENT_CONNECT, $ctx);
    if (!$fp) return null;
    $params = stream_context_get_params($fp);
    fclose($fp);
    return isset($params['options']['ssl']['peer_certificate']) ? $params['options']['ssl']['peer_certificate'] : null;
}

$trusted = true;
$cert = grab_cert($d, true);
if (!$cert) { $trusted = false; $cert = grab_cert($d, false); }
if (!$cert) fail('unreachable');

$p = openssl_x509_parse($cert);
if (!is_array($p)) fail('parse');

$now = time();
$from = isset($p['validFrom_time_t']) ? (int)$p['validFrom_time_t'] : 0;
$to   = isset($p['validTo_time_t']) ? (int)$p['validTo_time_t'] : 0;
$days = (int)floor(($to - $now) / 86400);

$sans = [];
if (isset($p['extensions']['subjectAltName'])) {
    foreach (explode(',', $p['extensions']['subjectAltName']) as $s) {
        $s = trim($s);
        if (stripos($s, 'DNS:') === 0) $sans[] = substr($s, 4);
    }
}
function host_matches($host, $sans, $cn) {
    $cands = $sans; if ($cn !== '') $cands[] = $cn;
    foreach ($cands as $c) {
        $c = strtolower($c);
        if ($c === $host) return true;
        if (strpos($c, '*.') === 0 && substr_count($host, '.') >= substr_count($c, '.')) {
            $suffix = substr($c, 1);                        // ".example.com"
            $hs = substr($host, strpos($host, '.'));        // strip leftmost label
            if ($hs === $suffix) return true;
        }
    }
    return false;
}
$subjCN = isset($p['subject']['CN']) ? (string)$p['subject']['CN'] : '';
$issuer = trim(((isset($p['issuer']['O']) ? $p['issuer']['O'] . ' ' : '')) . (isset($p['issuer']['CN']) ? $p['issuer']['CN'] : ''));
$selfSigned = (isset($p['subject'], $p['issuer']) && $p['subject'] == $p['issuer']);

echo json_encode([
    'ok'        => true,
    'host'      => $d,
    'subject'   => $subjCN !== '' ? $subjCN : (count($sans) ? $sans[0] : $d),
    'issuer'    => $issuer !== '' ? $issuer : 'Unknown',
    'validFrom' => $from ? gmdate('j M Y', $from) : null,
    'validTo'   => $to ? gmdate('j M Y', $to) : null,
    'daysLeft'  => $days,
    'expired'   => ($to > 0 && $to < $now),
    'notYet'    => ($from > 0 && $from > $now),
    'trusted'   => $trusted,
    'selfSigned'=> $selfSigned,
    'matches'   => host_matches($d, $sans, $subjCN),
    'sanCount'  => count($sans),
]);
