<?php
/*
 * 365 PC Manager installs - the staff portal's figures. 1 Oct 2026.
 * POST {stoken, machine, who} (a valid 12h portal staff session, as visitors.php) -> inst_stats() over
 * api/pcm-installs.json (see pcm-installs-lib.php), plus the download clicks the live view counted
 * (visitors-stats.json, page /~dl/pcm/) for the same 7 and 30 days, so the two sit side by side.
 * who: free (the default - everyone not on a plan) | unlinked | plan | all. NO closing tag in this file.
 * 7 Oct 2026: do=ours marks the internet connection the staff member is on as ours (our own PCs on it are left out of the
 * figures from their next hourly check-in), do=notours unmarks it; otherwise read-only, except that opening the card from
 * a marked connection re-confirms it (at most once a day) so it does not lapse. The answer carries ours: {nets, here,
 * hereBy, hereSince} - never an address.
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
$ip = (string)(isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '');
$do = (string)(isset($in['do']) ? $in['do'] : '');
$note = '';
if ($do === 'ours' || $do === 'notours') {
    // who pressed it: the staff session's own sign-in name ("steve@..." -> "Steve")
    $tok = preg_replace('/[^a-f0-9]/', '', (string)(isset($in['stoken']) ? $in['stoken'] : ''));
    $db = $tok !== '' ? @json_decode((string)@file_get_contents(__DIR__ . '/pcm-data.json'), true) : null;
    $rec = (is_array($db) && isset($db['staff'][$tok]) && is_array($db['staff'][$tok])) ? $db['staff'][$tok] : array();
    $login = (string)(isset($rec['login']) ? $rec['login'] : (isset($rec['email']) ? $rec['email'] : ''));
    $by = ucfirst(strtolower(preg_replace('/[^A-Za-z]/', '', (string)strstr($login . '@', '@', true))));
    $okM = inst_mark_ours($ip, $by !== '' ? $by : 'Staff', $do === 'ours');
    $note = $do === 'ours' ? ($okM ? 'Done - PCs on this connection are left out from their next check-in (within the hour).' : 'That did not save - try again.')
        : ($okM ? 'Done - PCs on this connection count again from their next check-in.' : 'This connection was not marked.');
} else {
    inst_mark_ours($ip, '', true, null, true);   // opened from a marked connection: keep it from lapsing (once a day)
}
$d = @json_decode((string)@file_get_contents(inst_file()), true);
$out = inst_stats(is_array($d) ? $d : array(), $who);
$out['ours_info'] = inst_ours_info(is_array($d) ? $d : array(), $ip);
$out['note'] = $note;

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
