<?php
/*
 * Upload-speed sink for the WiFi survey game mode and Signal Hunter.
 * The browser POSTs ~4MB of zeros; we read and discard, returning the byte count.
 * Nothing is stored. Cross-site POSTs to Cloudflare's __up endpoint proved
 * unreliable (CORS), so upload is measured against this same-origin endpoint.
 */
error_reporting(0);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('Access-Control-Allow-Origin: https://365techies.co.uk');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo '{"ok":false}'; exit; }

$len = 0;
$in = fopen('php://input', 'rb');
if ($in) {
    while (!feof($in)) {
        $c = fread($in, 65536);
        if ($c === false) break;
        $len += strlen($c);
        if ($len > 20000000) break;   /* hard cap: nobody needs to "upload" more than 20MB here */
    }
    fclose($in);
}
echo json_encode(array('ok' => true, 'bytes' => $len));
