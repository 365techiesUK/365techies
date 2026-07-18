<?php
/**
 * 365 PC Manager - Family View read endpoint.
 * GET ?c=<token>  ->  a read-only, minimal health glance for a family member the
 * customer explicitly shared with from inside the app (action=famshare in pcm.php).
 *
 * Data minimisation is the design: per machine we return ONLY name, health score,
 * verdict, last check-in, disk-used %, and backup yes/no. No files, no location,
 * no screenshots, no history. Revoking in the app (famstop) kills the token instantly.
 * Tokens are 24 hex chars (96 bits) - not guessable; compared with hash_equals.
 */
header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');

$DATA = __DIR__ . '/pcm-data.json';
$tok = isset($_GET['c']) ? preg_replace('/[^a-f0-9]/', '', substr((string)$_GET['c'], 0, 32)) : '';
if (strlen($tok) !== 24) { echo json_encode(array('ok' => false)); exit; }

$raw = (string)@file_get_contents($DATA);
$db = $raw !== '' ? json_decode($raw, true) : null;
if (!is_array($db) || !isset($db['customers'])) { echo json_encode(array('ok' => false)); exit; }

foreach ($db['customers'] as $c) {
    if (!isset($c['family']['token']) || !hash_equals((string)$c['family']['token'], $tok)) continue;
    $parts = explode(' ', trim((string)($c['name'] ?? '')));
    $first = $parts[0] !== '' ? $parts[0] : 'their';
    $ms = array();
    foreach (($c['machines'] ?? array()) as $m) {
        $ms[] = array(
            'name'    => (string)($m['name'] ?? 'PC'),
            'score'   => max(0, min(100, intval($m['score'] ?? 0))),
            'verdict' => (string)($m['verdict'] ?? ''),
            'seen'    => (string)($m['seen'] ?? ''),          // UTC "Y-m-d H:i" - humanised client-side
            'disk'    => max(0, min(100, intval($m['diskpct'] ?? 0))),
            'backup'  => !empty($m['backup']),
        );
    }
    echo json_encode(array('ok' => true, 'customer' => $first, 'fname' => (string)$c['family']['name'], 'machines' => $ms));
    exit;
}
echo json_encode(array('ok' => false));
