<?php
/*
 * Staff-only: where our customers are, counted by postcode district (21 Sep 2026).
 *
 *   action=tally -> counts per district (BH21, DT11...) with a town label, a
 *                   plan/other split, a coarser per-area view, and how many
 *                   records have no postcode at all - the coverage caveat the
 *                   owner needs in the same breath as the numbers.
 *
 * Reads customers[].addr.postcode from pcm-data.json, the field the portal's
 * "Your details" card and the booking step write. Counts ONLY: no name, email,
 * phone or street ever leaves this endpoint, and nothing is written - there is
 * no store, no cache, no log. Staff token only, re-implemented locally (same
 * rules as pcm-jobs.php / pcm-qbo.php / pcm-invite.php / pcm-paylink.php - keep
 * them in step). Fails closed. NO closing tag in this file.
 */

@ini_set('display_errors', '0');
header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');

require_once __DIR__ . '/pcm-geo-lib.php';

$DATA = __DIR__ . '/pcm-data.json';

function out($a) { echo json_encode($a, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE); exit; }
function fail($e) { out(array('ok' => false, 'error' => $e)); }

$raw = file_get_contents('php://input');
$in  = json_decode((string)$raw, true);
if (!is_array($in)) $in = $_POST;
$action  = isset($in['action']) ? preg_replace('/[^a-z]/', '', (string)$in['action']) : '';
$machine = isset($in['machine']) ? preg_replace('/[^A-Za-z0-9._-]/', '', (string)$in['machine']) : '';

// ---- staff auth (mirror of pcm-invite.php / pcm-jobs.php / pcm-qbo.php) -----
function db_read($f) { $j = @json_decode((string)@file_get_contents($f), true); return is_array($j) ? $j : null; }
function need_staff() {
    global $in, $machine, $DATA;
    $tok = isset($in['stoken']) ? preg_replace('/[^a-f0-9]/', '', (string)$in['stoken']) : '';
    if ($tok === '') fail('not_staff');
    $db = db_read($DATA);
    if (!$db) fail('db_unavailable');
    $s = isset($db['staff'][$tok]) ? $db['staff'][$tok] : null;
    $slide = !empty($s['trust']) ? 2592000 : 43200;
    $cap   = !empty($s['trust']) ? 7776000 : 43200;
    $ok = $s
        && (isset($s['ts'])  ? $s['ts']  : 0) > time() - $slide
        && (isset($s['iat']) ? $s['iat'] : 0) > time() - $cap
        && !empty($s['machine']) && $s['machine'] === $machine;
    if (!$ok) fail('not_staff');
    return array($db, $s);
}
list($db, $staff) = need_staff();

// ===========================================================================
if ($action === 'tally') {
    $customers = (isset($db['customers']) && is_array($db['customers'])) ? $db['customers'] : array();
    $t = geo_tally($customers);
    $t['ok'] = true;
    $t['as_of'] = gmdate('Y-m-d H:i') . ' UTC';
    out($t);
}

fail('bad_action');
