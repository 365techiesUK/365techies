<?php
/**
 * ONE-OFF (27 Sep 2026): copy every customer's earlier service reports into #service-reports.
 *
 * The owner, the day #service-reports was made: "can we move all the service reports from those other Slack
 * channels and just put them all into the service reports channel? Just to keep it all tidy" - full copies with the
 * files, our own test machines left out. Slack cannot move a message and this job deletes nothing. It re-posts,
 * oldest first, each service report the portal store holds (pcm-rep-<key hash>-<machine>-<ts>.html, kinds service
 * and selfrun) as the 365 techies app with the report file attached, in the shape pcm_service_report_to_slack gives a
 * live one, plus the date of the service. The Slack summary was never stored, so it is read back out of the report
 * itself - the same reading as PC Service Professional's Get-365SummaryFromReport. The old posts stay where they are
 * until the owner deletes them by hand.
 *
 *   ?run=1  - unauthenticated BY DESIGN, like pcm-review.php ?run=1: an exclusive lock, MIN_GAP seconds between
 *             runs, at most PER_RUN posts a run, and every report is posted once (its id is written to the state
 *             file straight after it goes). The worst a stranger can do is finish the job sooner. Answers counts only.
 *   ?plan=1 - how many would be posted and how many are left out, by date and kind - no names.
 *
 * Left out: a "Prepared for" name starting "365 " - the owner's own machines (365 DELL3520, 365 Workstation,
 * 365 360 Rig 2, 365 David 2025).
 *
 * The state file (pcm-report-move.json) is in the .htaccess deny list with the other pcm stores. Delete this file
 * and the state file once the job reports left:0 - it has nothing more to do.
 */
header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');
date_default_timezone_set('Europe/London');

const MOVE_TO  = 'C0C4T7GEW2E';   // #service-reports (made 27 Sep 2026)
const PER_RUN  = 6;
const MIN_GAP  = 50;
const MAX_TRIES = 3;               // then a text-only post, so one bad file cannot stall the rest

$STATE = __DIR__ . '/pcm-report-move.json';
function mv_out($a) { echo json_encode($a); exit; }

// ---- the reports, oldest first ------------------------------------------------------------------
function mv_reports() {
    $raw = (string)@file_get_contents(__DIR__ . '/pcm-data.json');
    $db = json_decode($raw, true);
    if (!is_array($db) || !isset($db['customers']) || !is_array($db['customers'])) return null;
    $items = array();
    foreach ($db['customers'] as $key => $c) {
        if (!is_array($c) || !isset($c['machines']) || !is_array($c['machines'])) continue;
        $kh = substr(hash('sha256', (string)$key), 0, 12);
        foreach ($c['machines'] as $mid => $m) {
            if (!is_array($m)) continue;
            $repk = isset($m['repk']) && is_array($m['repk']) ? $m['repk'] : array();
            foreach ((isset($m['reps']) && is_array($m['reps']) ? $m['reps'] : array()) as $ts) {
                $ts = (int)$ts;
                $kind = isset($repk[(string)$ts]) ? (string)$repk[(string)$ts] : '';
                if ($kind !== '' && $kind !== 'service' && $kind !== 'selfrun') continue;   // the app's own health checks
                $f = __DIR__ . '/pcm-rep-' . $kh . '-' . $mid . '-' . $ts . '.html';
                if (!is_file($f)) continue;
                $items[] = array('id' => $kh . '-' . $mid . '-' . $ts, 'ts' => $ts, 'file' => $f, 'kind' => $kind,
                                 'cust' => $c, 'mid' => (string)$mid);
            }
        }
    }
    usort($items, function ($a, $b) { return $a['ts'] - $b['ts']; });
    return $items;
}

// ---- what the Slack summary was built from, read back out of the report ----------------------------
function mv_plain($s) {
    $s = html_entity_decode(strip_tags((string)$s), ENT_QUOTES | ENT_HTML5, 'UTF-8');
    return trim(preg_replace('/\s+/u', ' ', $s));
}
function mv_summary($html) {
    $s = array('customer' => '', 'pc' => '', 'os' => '', 'score' => '', 'notes' => array(), 'selfrun' => false, 'service' => false);
    $s['selfrun'] = (strpos($html, 'SELF-RUN SERVICE REPORT') !== false);
    // the report's own header (the gold strapline and the product name) - not any mention of a service in the text
    $s['service'] = $s['selfrun'] || (strpos($html, 'SERVICE REPORT') !== false && strpos($html, 'PC Service Professional') !== false);
    if (preg_match('#Prepared for <strong>(.*?)</strong>#s', $html, $m)) $s['customer'] = mv_plain($m[1]);
    if (preg_match('#<tr><td>Make &amp; model</td><td>(.*?)</td></tr>#s', $html, $m)) $s['pc'] = mv_plain(preg_replace('/ &middot; serial .*$/s', '', $m[1]));
    if (preg_match('#<tr><td>Windows</td><td>(.*?)</td></tr>#s', $html, $m)) $s['os'] = mv_plain($m[1]);
    if (preg_match('/data-score="(\d{1,3})"/', $html, $m)) {
        $v = preg_match('/class="scoreverdict[^"]*">([^<]*)</', $html, $mv) ? mv_plain($mv[1]) : '';
        $s['score'] = $m[1] . '%' . ($v !== '' ? ' - ' . $v : '');
    }
    if (preg_match("#<h2>Honest recommendations</h2><ul class='recs'>(.*?)</ul>#s", $html, $m)
        && preg_match_all('#<li>(.*?)</li>#s', $m[1], $li)) {
        foreach (array_slice($li[1], 0, 3) as $n) { $n = mv_plain($n); if ($n !== '') $s['notes'][] = function_exists('mb_substr') ? mb_substr($n, 0, 160) : substr($n, 0, 160); }
    }
    return $s;
}
function mv_own($name) { return (bool)preg_match('/^365\s/i', trim((string)$name)); }
// A service report: the type pcm.php stored with it decides (service / selfrun). Only a report stored before types were
// kept (no type) is judged by its own header. The first plan run left out ten "untyped-looking" reports this way.
function mv_is_service($it, $s) { return $it['kind'] === 'service' || $it['kind'] === 'selfrun' || ($it['kind'] === '' && $s['service']); }

function mv_text($it, $s) {
    $c = $it['cust'];
    $name = $s['customer'] !== '' ? $s['customer'] : trim((string)($c['name'] ?? 'Customer'));
    $mname = trim((string)($c['machines'][$it['mid']]['name'] ?? ''));
    $oneoff = (($c['tier'] ?? '') === 'oneoff') || !empty($c['oneoff']);
    $selfrun = $s['selfrun'] || $it['kind'] === 'selfrun';
    $lead = $oneoff ? '*One-off service* (not on a support plan) - '
                    : ($selfrun ? '*Self-run full service* (the customer ran it from the app) - ' : '*6-weekly Service Report* - ');
    $t = $lead . slk_plain(substr($name, 0, 80)) . "\n"
       . ($s['pc'] !== '' ? 'PC: ' . slk_plain(substr($s['pc'], 0, 80)) . "\n" : '')
       . ($s['os'] !== '' ? 'OS: ' . slk_plain(substr($s['os'], 0, 80)) . "\n" : '')
       . ($s['score'] !== '' ? 'Score: ' . slk_plain(substr($s['score'], 0, 40)) . "\n" : '')
       . ($s['notes'] ? "Top notes:\n- " . implode("\n- ", array_map('slk_plain', $s['notes'])) . "\n" : '')
       . 'In the portal: Service reports' . ($mname !== '' ? ' on ' . slk_plain($mname) : '') . ' (staff: open the customer, view as, Service reports).' . "\n"
       . '_Earlier service report, copied into this channel on ' . date('j M Y') . ' - the service was on ' . date('D j M Y \a\t H:i', $it['ts']) . '._';
    return array($t, $name, $selfrun);
}

// ---- modes --------------------------------------------------------------------------------------
$items = mv_reports();
if ($items === null) mv_out(array('ok' => false, 'error' => 'db_unavailable'));

if (isset($_GET['plan'])) {
    $rows = array(); $post = 0; $own = 0; $notsvc = 0;
    foreach ($items as $it) {
        $s = mv_summary((string)@file_get_contents($it['file']));
        $why = !mv_is_service($it, $s) ? 'not a service report' : (mv_own($s['customer']) ? 'our own machine' : '');
        if ($why === '') $post++; elseif ($why === 'our own machine') $own++; else $notsvc++;
        $rows[] = date('Y-m-d H:i', $it['ts']) . ' ' . ($s['selfrun'] ? 'self-run' : 'visit') . ' [type ' . ($it['kind'] !== '' ? $it['kind'] : 'none')
                . ', header ' . ($s['service'] ? 'service' : 'other') . ', ' . ($s['score'] !== '' ? 'scored' : 'no score') . ']'
                . ($why !== '' ? ' - left out: ' . $why : '');
    }
    mv_out(array('ok' => true, 'to_post' => $post, 'own_left_out' => $own, 'not_service' => $notsvc, 'rows' => $rows));
}

if (!isset($_GET['run'])) mv_out(array('ok' => true, 'use' => '?plan=1 or ?run=1'));

$lk = @fopen($STATE . '.lock', 'c');
if (!$lk || !flock($lk, LOCK_EX | LOCK_NB)) mv_out(array('ok' => true, 'busy' => true));
$st = json_decode((string)@file_get_contents($STATE), true);
if (!is_array($st)) $st = array('done' => array(), 'tries' => array(), 'last' => 0);
if (time() - (int)$st['last'] < MIN_GAP) mv_out(array('ok' => true, 'wait' => MIN_GAP - (time() - (int)$st['last'])));
$st['last'] = time();
$save = function () use (&$st, $STATE) { $tmp = $STATE . '.' . getmypid() . '.tmp'; if (@file_put_contents($tmp, json_encode($st)) !== false) @rename($tmp, $STATE); };
$save();

require_once __DIR__ . '/pcm-slack-lib.php';   // top-level scope on purpose (php-include-scope-trap)
if (!slk_ready()) mv_out(array('ok' => false, 'error' => 'slack_not_configured'));

$posted = 0; $errors = array(); $own = 0; $todo = array();
foreach ($items as $it) {
    $html = (string)@file_get_contents($it['file']);
    $s = mv_summary($html);
    if (!mv_is_service($it, $s)) continue;
    if (mv_own($s['customer'])) { $own++; continue; }
    if (!isset($st['done'][$it['id']])) $todo[] = array($it, $html, $s);
}
foreach ($todo as $row) {
    list($it, $html, $s) = $row;
    if ($posted >= PER_RUN) break;
    list($text, $name, $selfrun) = mv_text($it, $s);
    $fname = 'Service-Report-' . trim(preg_replace('/[^A-Za-z0-9]+/', '-', $name), '-') . '-' . date('Y-m-d', $it['ts']) . '.html';
    $tries = (int)($st['tries'][$it['id']] ?? 0) + 1;
    $up = slk_upload_file(MOVE_TO, $html, $fname, ($selfrun ? 'Self-run full service - ' : '6-weekly Service Report - ') . $name, $text);
    if (empty($up['ok']) && $tries >= MAX_TRIES) {
        $p = slk_call('chat.postMessage', array('channel' => MOVE_TO, 'text' => $text . "\n_(report file not attached: " . (string)($up['error'] ?? 'unknown') . ")_"));
        if (!empty($p['ok'])) $up = array('ok' => true);
    }
    if (!empty($up['ok'])) { $st['done'][$it['id']] = time(); unset($st['tries'][$it['id']]); $posted++; $save(); continue; }
    $st['tries'][$it['id']] = $tries; $save();
    $errors[] = (string)($up['error'] ?? 'unknown');
    break;   // Slack said no: stop this run, the next one retries in order
}
flock($lk, LOCK_UN); fclose($lk);
mv_out(array('ok' => true, 'posted' => $posted, 'left' => count($todo) - $posted, 'own_left_out' => $own, 'done_total' => count($st['done']), 'errors' => $errors));
