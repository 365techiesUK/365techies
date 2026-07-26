<?php
/**
 * 365 Techies - private draft review feedback.
 * Receives notes/approvals from invitation-only draft pages under /drafts/<token-slug>/
 * and relays them to Slack + a server-only log. The draft URL itself is the invitation:
 * unguessable, noindex, unlinked, sent to one person. This endpoint therefore accepts
 * only known draft ids, is rate-limited per IP, and stores nothing but the note text.
 *
 * HONESTY NOTE (public repo): the draft pages and this file live in a public GitHub
 * repo, so "private" here means practically-private (unindexed, unlinked, unguessable
 * URL) - fine for an article draft, never for anything sensitive.
 */
header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');

$KNOWN = array('r510' => 'RUCKUS R510/R550 access-point guide');
$LOG = __DIR__ . '/pcm-draftfb.json';
$RATE = __DIR__ . '/pcm-draftfb-rate.json';

function out($a) { echo json_encode($a); exit; }

$in = json_decode((string)file_get_contents('php://input'), true);
if (!is_array($in)) out(array('ok' => false, 'error' => 'bad_request'));
if (!empty($in['hp'])) out(array('ok' => true));   // honeypot: pretend success, do nothing

$d = isset($in['d']) ? preg_replace('/[^a-z0-9]/', '', (string)$in['d']) : '';
if ($d === '' || !isset($KNOWN[$d])) out(array('ok' => false, 'error' => 'unknown_draft'));
$kind = (isset($in['kind']) && $in['kind'] === 'approve') ? 'approve' : 'note';
$quote = trim(preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]+/', ' ', (string)(isset($in['quote']) ? $in['quote'] : '')));
$note = trim(preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]+/', ' ', (string)(isset($in['note']) ? $in['note'] : '')));
$quote = substr($quote, 0, 300);
$note = substr($note, 0, 1500);
if ($kind === 'note' && $note === '' && $quote === '') out(array('ok' => false, 'error' => 'empty'));

// per-IP rate limit: 20 posts / 10 min (a reviewer sends a handful; a bot sends hundreds)
$ip = isset($_SERVER['REMOTE_ADDR']) ? (string)$_SERVER['REMOTE_ADDR'] : '';
$k = sha1('dfb|' . $ip);
$lk = @fopen($RATE . '.lock', 'c'); if ($lk) @flock($lk, LOCK_EX);
$rt = file_exists($RATE) ? json_decode((string)@file_get_contents($RATE), true) : array();
if (!is_array($rt)) $rt = array();
foreach ($rt as $rk => $rv) if ((isset($rv['ts']) ? $rv['ts'] : 0) < time() - 600) unset($rt[$rk]);
$rec = isset($rt[$k]) ? $rt[$k] : array('n' => 0, 'ts' => time());
$rec['n']++; $rt[$k] = $rec;
@file_put_contents($RATE, json_encode($rt), LOCK_EX);
if ($lk) { @flock($lk, LOCK_UN); @fclose($lk); }
if ($rec['n'] > 20) out(array('ok' => false, 'error' => 'slow_down'));

// append to the server-only log (best effort)
$llk = @fopen($LOG . '.lock', 'c'); if ($llk) @flock($llk, LOCK_EX);
$log = file_exists($LOG) ? json_decode((string)@file_get_contents($LOG), true) : array();
if (!is_array($log)) $log = array();
$log[] = array('d' => $d, 'kind' => $kind, 'quote' => $quote, 'note' => $note, 'ts' => time());
if (count($log) > 500) $log = array_slice($log, -500);
@file_put_contents($LOG, json_encode($log), LOCK_EX);
if ($llk) { @flock($llk, LOCK_UN); @fclose($llk); }

// Slack relay (same loader pattern as the rest of the api/ - never echo the config)
$wh = ''; $swf = __DIR__ . '/slack-webhook.php';
if (file_exists($swf)) {
    $SLACK_WEBHOOK = '';
    ob_start(); include $swf; ob_end_clean();
    if (!empty($SLACK_WEBHOOK)) $wh = $SLACK_WEBHOOK;
    else { $raw = (string)@file_get_contents($swf); if (preg_match('#https://hooks\.slack\.com/\S+#', $raw, $m)) $wh = trim($m[0]); }
}
if ($wh !== '') {
    $title = $KNOWN[$d];
    $txt = ($kind === 'approve')
        ? ":tada: *DRAFT APPROVED for publication* - {$title}" . ($note !== '' ? "\n> " . $note : '')
        : ":memo: *Draft review note* - {$title}"
          . ($quote !== '' ? "\n> On: _\"" . $quote . "\"_" : '')
          . ($note !== '' ? "\n> " . $note : '');
    $ch = curl_init($wh);
    curl_setopt_array($ch, array(CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 6,
        CURLOPT_HTTPHEADER => array('Content-Type: application/json'),
        CURLOPT_POSTFIELDS => json_encode(array('text' => $txt))));
    @curl_exec($ch); curl_close($ch);
}
out(array('ok' => true));
