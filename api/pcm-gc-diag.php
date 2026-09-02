<?php
/*
 * TEMPORARY read-only GoCardless template diagnostic. Guarded by ?k=<QBO_GUARD>
 * (server-only value, reused so no guard is exposed in the public repo). Prints
 * the Billing Request Templates so we can see where each plan's amount lives.
 * Read-only: lists templates, moves no money. Delete after use.
 */
@ini_set('display_errors', '0');
header('Content-Type: text/plain; charset=utf-8');
header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');

$BASE = __DIR__;
$CFG  = $BASE . '/pcm-quickbooks.php';   // reused only for its server-only $QBO_GUARD
$GCF  = $BASE . '/pcm-gocardless.php';   // $GC_TOKEN

if (!is_readable($CFG)) { echo "no guard config\n"; exit; }
require $CFG;
$guard = isset($_GET['k']) ? (string)$_GET['k'] : '';
if (empty($QBO_GUARD) || !hash_equals((string)$QBO_GUARD, $guard)) { http_response_code(403); echo "guard mismatch\n"; exit; }

if (!is_readable($GCF)) { echo "pcm-gocardless.php not on server\n"; exit; }
include $GCF;
if (empty($GC_TOKEN)) { echo "no \$GC_TOKEN\n"; exit; }

$ch = curl_init('https://api.gocardless.com/billing_request_templates?limit=200');
curl_setopt_array($ch, array(CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 15,
    CURLOPT_HTTPHEADER => array('Authorization: Bearer ' . $GC_TOKEN, 'GoCardless-Version: 2015-07-06', 'Accept: application/json')));
$r = curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
echo "HTTP: " . $code . "\n\n";
$j = json_decode((string)$r, true);
$tpls = (is_array($j) && isset($j['billing_request_templates'])) ? $j['billing_request_templates'] : array();
echo "templates found: " . count($tpls) . "\n";
echo str_repeat('=', 60) . "\n";

foreach ((array)$tpls as $i => $t) {
    if (!is_array($t)) continue;
    echo "NAME: " . (isset($t['name']) ? $t['name'] : '?') . "\n";
    echo "  id:                      " . (isset($t['id']) ? $t['id'] : '?') . "\n";
    echo "  authorisation_url set:   " . (!empty($t['authorisation_url']) ? 'yes' : 'NO') . "\n";
    echo "  payment_request_amount:  " . (isset($t['payment_request_amount']) ? var_export($t['payment_request_amount'], true) : '(none)') . "\n";
    echo "  mandate_request_desc:    " . (isset($t['mandate_request_description']) ? $t['mandate_request_description'] : '(none)') . "\n";
    echo "  metadata:                " . (isset($t['metadata']) ? json_encode($t['metadata']) : '(none)') . "\n";
    if ($i === 0) {
        echo "  --- FULL raw fields of this first template (to find the amount) ---\n";
        foreach ($t as $k => $v) echo "    " . $k . " = " . (is_scalar($v) ? $v : json_encode($v)) . "\n";
    }
    echo str_repeat('-', 60) . "\n";
}
