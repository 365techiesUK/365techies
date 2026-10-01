<?php
/*
 * 365 PC Manager installs - the staff portal's figures. 1 Oct 2026.
 * POST {stoken, machine, who} (a valid 12h portal staff session, as visitors.php) -> inst_stats() over
 * api/pcm-installs.json (see pcm-installs-lib.php), plus the download clicks the live view counted
 * (visitors-stats.json, page /~dl/pcm/) for the same 7 and 30 days, so the two sit side by side.
 * who: free (the default - everyone not on a plan) | unlinked | plan | all. Read-only. NO closing tag in this file.
 */
error_reporting(0);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');
require_once __DIR__ . '/visitors-tally-lib.php';   // the staff check (vis_staff_ok); top-level scope on purpose
require_once __DIR__ . '/pcm-installs-lib.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(array('ok' => false, 'error' => 'method')); exit; }
$in = json_decode((string)file_get_contents('php://input'), true);
if (!is_array($in)) $in = $_POST;
if (!vis_staff_ok($in, __DIR__)) { http_response_code(403); echo json_encode(array('ok' => false, 'error' => 'auth')); exit; }

$who = (string)(isset($in['who']) ? $in['who'] : 'free');
if (!in_array($who, array('free', 'unlinked', 'plan', 'all'), true)) $who = 'free';
$d = @json_decode((string)@file_get_contents(inst_file()), true);
$out = inst_stats(is_array($d) ? $d : array(), $who);

// download clicks (the live view's tally): each visitor once a day, by country
$vs = @json_decode((string)@file_get_contents(__DIR__ . '/visitors-stats.json'), true);
$dl = array('d7' => 0, 'd30' => 0, 'countries' => array());
if (is_array($vs) && isset($vs['days']) && is_array($vs['days'])) {
    $cut7 = gmdate('Y-m-d', time() - 6 * 86400); $cut30 = gmdate('Y-m-d', time() - 29 * 86400); $cc = array();
    foreach ($vs['days'] as $day => $sites) {
        if ($day < $cut30 || !isset($sites['t365']) || !is_array($sites['t365'])) continue;
        $t = $sites['t365'];
        $n = (int)(isset($t['pages']['/~dl/pcm/']) ? $t['pages']['/~dl/pcm/'] : 0);
        $dl['d30'] += $n; if ($day >= $cut7) $dl['d7'] += $n;
        foreach ((isset($t['byCountry']) && is_array($t['byCountry'])) ? $t['byCountry'] : array() as $c => $b)
            if (isset($b['pages']['/~dl/pcm/'])) $cc[$c] = (isset($cc[$c]) ? $cc[$c] : 0) + (int)$b['pages']['/~dl/pcm/'];
    }
    arsort($cc);
    foreach (array_slice($cc, 0, 10, true) as $c => $n) $dl['countries'][] = array('k' => (string)$c, 'n' => $n);
}
$out['downloads'] = $dl;
echo json_encode($out);
