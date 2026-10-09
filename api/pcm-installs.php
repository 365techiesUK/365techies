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
 * 9 Oct 2026 (owner: "people that have got the free version ... a 30-day trial ... fully featured"): the answer also carries
 * rows: each install in the chosen group (newest seen first, up to 400) - its anonymous id, country, version, Windows 10,
 * first / last seen, days used, how it's doing (using | once | stopped | soon) and its free month (pcm-plus-lib.php
 * plus_trial_states). do=trial {ids: [...]} gives each a free month: only installs never linked to us (a customer's PC is
 * looked after through their record), not our own, and never twice.
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
require_once __DIR__ . '/pcm-plus-lib.php';   // 9 Oct 2026: free months (top-level scope on purpose)
require_once __DIR__ . '/pcm-vname-lib.php';   // the version as people see it ("36.1")
// who pressed it: the staff session's own sign-in name ("steve@..." -> "Steve")
$tok = preg_replace('/[^a-f0-9]/', '', (string)(isset($in['stoken']) ? $in['stoken'] : ''));
$sdb = $tok !== '' ? @json_decode((string)@file_get_contents(__DIR__ . '/pcm-data.json'), true) : null;
$srec = (is_array($sdb) && isset($sdb['staff'][$tok]) && is_array($sdb['staff'][$tok])) ? $sdb['staff'][$tok] : array();
$slogin = (string)(isset($srec['login']) ? $srec['login'] : (isset($srec['email']) ? $srec['email'] : ''));
$by = ucfirst(strtolower(preg_replace('/[^A-Za-z]/', '', (string)strstr($slogin . '@', '@', true))));
unset($sdb);
$given = array();
if ($do === 'trial') {
    $d0 = @json_decode((string)@file_get_contents(inst_file()), true);
    $ids = isset($in['ids']) && is_array($in['ids']) ? array_slice($in['ids'], 0, 200) : array();
    $n = 0; $skip = 0; $busy = 0;
    foreach ($ids as $iid) {
        $iid = (string)$iid;
        $e = (is_array($d0) && plus_is_mhash($iid) && isset($d0['m'][$iid]) && is_array($d0['m'][$iid])) ? $d0['m'][$iid] : null;
        if (!$e || !empty($e['k']) || !empty($e['p']) || !empty($e['o'])) { $skip++; continue; }   // linked, on a plan, ours, or unknown
        $r = plus_trial_give($iid, $by !== '' ? $by : 'Staff');
        if (!empty($r['ok'])) { $n++; $given[] = $iid; } elseif (($r['error'] ?? '') === 'busy') $busy++; else $skip++;
    }
    $note = $n ? ($n === 1 ? 'Given: 30 days free.' : 'Given to ' . $n . ' PCs: 30 days free each.') . ' Each PC is told within the hour, once it is on 36.1 (older copies update themselves first).'
        : ($busy ? 'That did not save - try again.' : 'Nothing given - those PCs have had a free month already, or are linked to a customer.');
    if ($n && $skip) $note .= ' ' . $skip . ' left out (had one already, or linked to a customer).';
} elseif ($do === 'ours' || $do === 'notours') {
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
$out['given'] = $given;
// 9 Oct 2026: the installs themselves (for "Give 30 days free"), with each one's free month
plus_trial_tidy();
$out['rows'] = inst_rows(is_array($d) ? $d : array(), $who, plus_trial_states());
$out['trial_days'] = PLUS_TRIAL_DAYS;
$out['trial_min_ver'] = PLUS_TRIAL_MIN_VER;

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
