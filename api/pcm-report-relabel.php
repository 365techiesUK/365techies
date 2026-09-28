<?php
/**
 * ONE-OFF (28 Sep 2026): put right the heading on the #service-reports copies that pcm-report-move.php (27 Sep, since
 * removed) wrongly headed "Self-run full service".
 *
 * Why they were wrong: a six-weekly visit run from the customer's own app over Splashtop wrote its report file as a
 * self-run ("SELF-RUN SERVICE REPORT"), and pcm.php reportup then corrected it to a visit from the booked-visit list -
 * so the store's type (repk) says 'service' and the ORIGINAL Slack post said "6-weekly Service Report". The copy job
 * believed the file's own marking over the store's type. The owner: "yes fix the labels".
 *
 * What it does: for every stored report whose type is 'service' but whose file says self-run, it finds the copied post
 * in #service-reports by the date and time the copy printed ("the service was on Thu 24 Sep 2026 at 12:21") and, as the
 * 365 techies app, edits just the heading: "*Self-run full service* (the customer ran it from the app) - " becomes
 * "*6-weekly Service Report* - ". Nothing else in the post changes, the report file stays attached, nothing is deleted.
 * It only ever touches the app's own copied posts that still carry the wrong heading, so a second run changes nothing.
 *
 *   ?plan=1 - counts only (how many reports are affected, how many posts found, how many still to edit). No names.
 *   ?run=1  - unauthenticated BY DESIGN like pcm-review.php ?run=1: an exclusive lock, MIN_GAP seconds between runs,
 *             at most PER_RUN edits a run. The worst a stranger can do is finish it sooner.
 * Delete this file once ?plan=1 reports to_edit:0.
 */
header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');
date_default_timezone_set('Europe/London');   // the copies printed London time

const CHAN     = 'C0C4T7GEW2E';   // #service-reports
const PER_RUN  = 20;
const MIN_GAP  = 30;
const WRONG    = '*Self-run full service* (the customer ran it from the app) - ';
const RIGHT    = '*6-weekly Service Report* - ';
const MARK     = '_Earlier service report, copied into this channel';

function rl_out($a) { echo json_encode($a); exit; }

// the stored reports whose type is 'service' but whose file says self-run: the ones the copy mislabelled
function rl_wrong() {
    $db = json_decode((string)@file_get_contents(__DIR__ . '/pcm-data.json'), true);
    if (!is_array($db) || !isset($db['customers'])) return null;
    $w = array();
    foreach ($db['customers'] as $key => $c) {
        if (!is_array($c) || empty($c['machines']) || !is_array($c['machines'])) continue;
        $kh = substr(hash('sha256', (string)$key), 0, 12);
        foreach ($c['machines'] as $mid => $m) {
            $repk = isset($m['repk']) && is_array($m['repk']) ? $m['repk'] : array();
            foreach ((isset($m['reps']) && is_array($m['reps']) ? $m['reps'] : array()) as $ts) {
                $ts = (int)$ts;
                if (($repk[(string)$ts] ?? '') !== 'service') continue;
                $f = __DIR__ . '/pcm-rep-' . $kh . '-' . $mid . '-' . $ts . '.html';
                if (!is_file($f)) continue;
                $h = (string)@file_get_contents($f);
                if (strpos($h, 'SELF-RUN SERVICE REPORT') === false) continue;
                // the copy's own printed date - the key to its post
                $w[date('D j M Y \a\t H:i', $ts)][] = trim((string)($m['name'] ?? ''));
            }
        }
    }
    return $w;
}

// the app's copied posts in #service-reports that still carry the wrong heading
function rl_posts() {
    $out = array(); $cursor = ''; $pages = 0;
    do {
        $args = array('channel' => CHAN, 'limit' => 200);
        if ($cursor !== '') $args['cursor'] = $cursor;
        $r = slk_call_form('conversations.history', $args, 15);
        if (empty($r['ok'])) return array('error' => (string)($r['error'] ?? 'unknown'));
        foreach ((array)($r['messages'] ?? array()) as $m) {
            $t = (string)($m['text'] ?? '');
            if (empty($m['bot_id']) || strpos($t, MARK) === false || strpos($t, WRONG) !== 0) continue;
            if (!preg_match('/the service was on (.+? at \d{2}:\d{2})\._/', $t, $mm)) continue;
            $mname = preg_match('/Service reports on (.+?) \(staff:/', $t, $mn) ? $mn[1] : '';
            $out[] = array('ts' => (string)$m['ts'], 'text' => $t, 'when' => $mm[1], 'mname' => $mname);
        }
        $cursor = (string)($r['response_metadata']['next_cursor'] ?? '');
    } while ($cursor !== '' && ++$pages < 10);
    return array('posts' => $out);
}

$wrong = rl_wrong();
if ($wrong === null) rl_out(array('ok' => false, 'error' => 'db_unavailable'));
require_once __DIR__ . '/pcm-slack-lib.php';   // top-level scope on purpose (php-include-scope-trap)
if (!slk_ready()) rl_out(array('ok' => false, 'error' => 'slack_not_configured'));

$isRun = isset($_GET['run']);
if (!$isRun && !isset($_GET['plan'])) rl_out(array('ok' => true, 'use' => '?plan=1 or ?run=1'));
if ($isRun) {
    $STATE = __DIR__ . '/pcm-report-move.json';   // reuses the move job's store name: already in the .htaccess deny list
    $lk = @fopen($STATE . '.relabel.lock', 'c');
    if (!$lk || !flock($lk, LOCK_EX | LOCK_NB)) rl_out(array('ok' => true, 'busy' => true));
    $st = json_decode((string)@file_get_contents($STATE), true); if (!is_array($st)) $st = array();
    if (time() - (int)($st['relabel_last'] ?? 0) < MIN_GAP) rl_out(array('ok' => true, 'wait' => MIN_GAP - (time() - (int)($st['relabel_last'] ?? 0))));
    $st['relabel_last'] = time();
    $tmp = $STATE . '.' . getmypid() . '.tmp'; if (@file_put_contents($tmp, json_encode($st)) !== false) @rename($tmp, $STATE);
}

$p = rl_posts();
if (isset($p['error'])) rl_out(array('ok' => false, 'error' => 'history:' . $p['error']));
$todo = array();
foreach ($p['posts'] as $post) {
    if (!isset($wrong[$post['when']])) continue;                       // a genuine self-run, or not ours to change
    $names = $wrong[$post['when']];
    if (count($names) > 1 && $post['mname'] !== '' && !in_array($post['mname'], $names, true)) continue;
    $todo[] = $post;
}
$affected = 0; foreach ($wrong as $n) $affected += count($n);
if (!$isRun) rl_out(array('ok' => true, 'reports_mislabelled' => $affected, 'posts_with_wrong_heading' => count($p['posts']), 'to_edit' => count($todo)));

$done = 0; $errors = array();
foreach ($todo as $post) {
    if ($done >= PER_RUN) break;
    $new = RIGHT . substr($post['text'], strlen(WRONG));
    $r = slk_call('chat.update', array('channel' => CHAN, 'ts' => $post['ts'], 'text' => $new), 10);
    if (empty($r['ok'])) { $errors[] = (string)($r['error'] ?? 'unknown'); break; }
    $done++;
}
flock($lk, LOCK_UN); fclose($lk);
rl_out(array('ok' => true, 'edited' => $done, 'left' => count($todo) - $done, 'errors' => $errors));
