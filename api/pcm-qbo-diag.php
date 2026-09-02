<?php
/*
 * TEMPORARY QuickBooks token diagnostic. Guarded by ?k=<QBO_GUARD>.
 * Reports the EXACT reason Intuit rejects the refresh, without leaking secrets
 * (values are masked to first-8 + last-4 + length). Delete after use.
 */
@ini_set('display_errors', '0');
header('Content-Type: text/plain; charset=utf-8');
header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');

$BASE   = __DIR__;
$CFG    = $BASE . '/pcm-quickbooks.php';
$TOKENF = $BASE . '/pcm-qbo-token.json';

if (!is_readable($CFG)) { echo "no config file (pcm-quickbooks.php missing)\n"; exit; }
require $CFG;

$guard = isset($_GET['k']) ? (string)$_GET['k'] : '';
if (empty($QBO_GUARD) || !hash_equals((string)$QBO_GUARD, $guard)) { http_response_code(403); echo "guard mismatch\n"; exit; }

function mask($s) {
    $s = (string)$s; $n = strlen($s);
    if ($n === 0) return '(empty)';
    if ($n <= 12) return '(len ' . $n . ')';
    return substr($s, 0, 8) . '...' . substr($s, -4) . ' (len ' . $n . ')';
}

echo "=== config loaded ===\n";
echo "env:        " . (isset($QBO_ENV) ? $QBO_ENV : '?') . "\n";
echo "client_id:  " . mask(isset($QBO_CLIENT_ID) ? $QBO_CLIENT_ID : '') . "\n";
echo "  starts:   " . substr((string)(isset($QBO_CLIENT_ID) ? $QBO_CLIENT_ID : ''), 0, 7) . "  (dev=AB0Ffgs  prod=ABlzyhr)\n";
echo "secret:     " . (empty($QBO_CLIENT_SECRET) ? 'MISSING' : mask($QBO_CLIENT_SECRET)) . "\n";
echo "realm:      " . (isset($QBO_REALM_ID) ? $QBO_REALM_ID : '?') . "\n";
echo "item_id:    " . (isset($QBO_ITEM_ID) ? $QBO_ITEM_ID : '?') . "\n";

$t  = @json_decode((string)@file_get_contents($TOKENF), true);
$rt = (is_array($t) && isset($t['refresh_token'])) ? (string)$t['refresh_token'] : '';
echo "\n=== token file ===\n";
echo "refresh_token: " . ($rt !== '' ? mask($rt) : 'MISSING') . "\n";
echo "  starts:      " . substr($rt, 0, 4) . "\n";
if ($rt === '' || strpos($rt, "\xE2\x80\xA6") !== false || strpos($rt, '...') !== false || stripos($rt, 'PASTE') !== false || stripos($rt, 'YOURS') !== false) {
    echo "  !!! this looks like a PLACEHOLDER, not a real token\n";
}

echo "\n=== live refresh attempt against Intuit ===\n";
$base = (isset($QBO_ENV) && $QBO_ENV === 'sandbox') ? 'https://oauth.platform.intuit.com' : 'https://oauth.platform.intuit.com';
$ch = curl_init($base . '/oauth2/v1/tokens/bearer');
curl_setopt_array($ch, array(
    CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true, CURLOPT_TIMEOUT => 20,
    CURLOPT_HTTPHEADER => array('Accept: application/json', 'Content-Type: application/x-www-form-urlencoded',
        'Authorization: Basic ' . base64_encode($QBO_CLIENT_ID . ':' . $QBO_CLIENT_SECRET)),
    CURLOPT_POSTFIELDS => http_build_query(array('grant_type' => 'refresh_token', 'refresh_token' => $rt))));
$r = curl_exec($ch); $code = curl_getinfo($ch, CURLINFO_HTTP_CODE); $cerr = curl_error($ch); curl_close($ch);
echo "HTTP: " . $code . "\n";
if ($cerr) echo "curl error: " . $cerr . "\n";
$j = json_decode((string)$r, true);
if ($code < 200 || $code >= 300 || empty($j['access_token'])) {
    echo "Intuit says: " . substr((string)$r, 0, 300) . "\n";
    echo "\n(invalid_client = wrong Client ID/Secret.  invalid_grant = wrong/stale/expired refresh token.)\n";
    exit;
}
echo "refresh OK - token accepted.\n";

$ACCESS = (string)$j['access_token'];
$API = ((isset($QBO_ENV) && $QBO_ENV === 'sandbox') ? 'https://sandbox-quickbooks.api.intuit.com' : 'https://quickbooks.api.intuit.com')
     . '/v3/company/' . rawurlencode((string)$QBO_REALM_ID);
function qget($url, $access) {
    $ch = curl_init($url);
    curl_setopt_array($ch, array(CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 20,
        CURLOPT_HTTPHEADER => array('Accept: application/json', 'Authorization: Bearer ' . $access)));
    $r = curl_exec($ch); $c = curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
    return array($c, json_decode((string)$r, true), (string)$r);
}

echo "\n=== VAT / tax preferences ===\n";
list($pc, $pj) = qget($API . '/preferences?minorversion=70', $ACCESS);
if ($pc >= 200 && $pc < 300 && isset($pj['Preferences']['TaxPrefs'])) {
    $vat = !empty($pj['Preferences']['TaxPrefs']['UsingSalesTax']);
    echo "VAT enabled in this company: " . ($vat ? "YES" : "no") . "\n";
} else { echo "preferences HTTP " . $pc . "\n"; }

echo "\n=== active tax codes (for \$QBO_TAX_CODE_ID if VAT is on) ===\n";
list($tc, $tj) = qget($API . "/query?minorversion=70&query=" . rawurlencode("select Id, Name, Active from TaxCode maxresults 50"), $ACCESS);
if ($tc >= 200 && $tc < 300) {
    foreach ((array)(isset($tj['QueryResponse']['TaxCode']) ? $tj['QueryResponse']['TaxCode'] : array()) as $t2) {
        if (!is_array($t2)) continue;
        echo "  Id " . (isset($t2['Id']) ? $t2['Id'] : '?') . "  |  " . (isset($t2['Name']) ? $t2['Name'] : '?') . (empty($t2['Active']) ? "  (inactive)" : "") . "\n";
    }
} else { echo "taxcode query HTTP " . $tc . "\n"; }

echo "\n=== service items (for \$QBO_ITEM_ID - look for 'Remote support') ===\n";
list($ic, $ij) = qget($API . "/query?minorversion=70&query=" . rawurlencode("select Id, Name, Type from Item maxresults 100"), $ACCESS);
if ($ic >= 200 && $ic < 300) {
    foreach ((array)(isset($ij['QueryResponse']['Item']) ? $ij['QueryResponse']['Item'] : array()) as $it) {
        if (!is_array($it)) continue;
        echo "  Id " . (isset($it['Id']) ? $it['Id'] : '?') . "  |  " . (isset($it['Name']) ? $it['Name'] : '?') . "  (" . (isset($it['Type']) ? $it['Type'] : '?') . ")\n";
    }
} else { echo "item query HTTP " . $ic . "\n"; }
