<?php
/**
 * Staff preview of the asset register for one customer (READ-ONLY).
 *
 *   /api/pcm-asset.php?email=<customer email>&model=<make model>&s=<PC Manager admin pass>
 *   optional &drives=CT1000P3PSSD8:932,WD Blue:1863   (model:sizeGB, comma separated)
 *
 * Shows what the service-report email and the report would say for that customer -
 * which invoice named the PC, which named the drive, and why nothing matched when it
 * did not. Same QuickBooks path as the portal's invoice list; never writes to the books.
 */
header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');
$s = isset($_GET['s']) ? (string)$_GET['s'] : '';
$admin = false;
if ($s !== '' && is_readable(__DIR__ . '/pcm-admin-secret.php')) {
    require __DIR__ . '/pcm-admin-secret.php';   // $PCM_ADMIN_PASS
    if (!empty($PCM_ADMIN_PASS) && hash_equals($PCM_ADMIN_PASS, $s)) $admin = true;
}
if (!$admin) { http_response_code(403); echo json_encode(array('ok' => false, 'error' => 'denied')); exit; }
require __DIR__ . '/pcm-asset-lib.php';
$email = strtolower(trim((string)(isset($_GET['email']) ? $_GET['email'] : '')));
$model = trim((string)(isset($_GET['model']) ? $_GET['model'] : ''));
$drives = array();
foreach (explode(',', (string)(isset($_GET['drives']) ? $_GET['drives'] : '')) as $d) {
    $d = trim($d); if ($d === '') continue;
    $p = explode(':', $d);
    $drives[] = array('model' => trim($p[0]), 'sizeGB' => isset($p[1]) ? (int)$p[1] : 0);
}
$inv = pcm_asset_invoices($email);
$m = pcm_asset_match($inv['invoices'], $model, $drives, (int)(isset($_GET['machines']) ? $_GET['machines'] : 1), (int)(isset($_GET['same']) ? $_GET['same'] : 1));
echo json_encode(array('ok' => true, 'mode' => 'preview', 'email' => $email, 'model' => $model, 'drives' => $drives,
    'invoices' => array('ok' => !empty($inv['ok']), 'why' => (string)(isset($inv['why']) ? $inv['why'] : ''), 'cached' => !empty($inv['cached']), 'count' => count($inv['invoices'])),
    'lines_seen' => array_map(function ($i) { return array('date' => $i['date'], 'num' => $i['num'], 'lines' => $i['lines']); }, array_slice($inv['invoices'], 0, 12)),
    'match' => $m), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
