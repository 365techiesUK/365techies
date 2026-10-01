<?php
/*
 * The staff portal's "Calls & texts" card (1 Oct 2026). Owner: "rather than being behind a passphrase ... couldn't the
 * voicemails and the text messages be in the portal, where it says Worth a call today ... so we can see what's coming
 * in as we're doing the jobs."
 *
 * POST JSON {stoken, machine, do}: the portal's own staff session (vis_staff_ok - the same check as the Live view and
 * the installs card; a console session works too).
 *   do=list   -> {ok, threads: [{n, who, cust, mobile, open, last, items: [{id, type, at, body, dur, audio, why, done,
 *                review}]}], open, total}   (comms_threads: newest caller first, last 4 items each)
 *   do=check  -> runs the comms sweep now (new texts from Textmagic, new voicemails from the mailbox), then the list
 *   do=reply  {n, text} -> a text from the 365 Techies number (comms_send_sms: marks that caller's texts and voicemails
 *                answered), then the list
 *   do=done   {n} -> every text and voicemail from that number marked handled, then the list
 * GET ?a=<recording>&e=<expiry>&s=<signature> -> the recording itself (comms_stream_audio), for the card's players.
 *   The link is signed with the server-only admin secret and lasts 3 hours, so an <audio> element needs no cookie.
 *
 * Same store and rules as the comms inbox (comms.php): nothing here sends anything except a reply a person typed.
 * NO closing tag in this file.
 */
header('X-Robots-Tag: noindex, nofollow');
$SECRET = __DIR__ . '/pcm-admin-secret.php';
if (!file_exists($SECRET)) { http_response_code(503); header('Content-Type: application/json'); echo json_encode(array('ok' => false, 'error' => 'not-configured')); exit; }
require $SECRET;   // $PCM_ADMIN_PASS - also the key the play links are signed with
require __DIR__ . '/comms-lib.php';
require_once __DIR__ . '/visitors-tally-lib.php';   // vis_staff_ok()

/* the recording: a signed, unexpired link only */
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['a'])) {
    $a = (string)$_GET['a']; $e = (int)($_GET['e'] ?? 0); $s = (string)($_GET['s'] ?? '');
    if (!preg_match('/^vm-audio-[A-Za-z0-9\-]+\.(mp3|wav)$/', $a) || $e < time() || !hash_equals(comms_audio_sig($a, $e, $PCM_ADMIN_PASS), $s)) {
        http_response_code(403); exit('expired - reload the portal');
    }
    comms_stream_audio(__DIR__ . '/' . $a, !empty($_GET['dl']));
}

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
function ca_out($a) { echo json_encode($a, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); ca_out(array('ok' => false, 'error' => 'post')); }
$in = json_decode((string)file_get_contents('php://input', false, null, 0, 20000), true);
if (!is_array($in)) $in = array();
if (!vis_staff_ok($in, __DIR__)) { http_response_code(403); ca_out(array('ok' => false, 'error' => 'auth')); }

$do = (string)($in['do'] ?? 'list');
$note = ''; $err = '';
$num = function ($raw) { $r = (string)$raw; if ($r !== '' && $r[0] === ' ') $r = '+' . ltrim($r); return substr(preg_replace('/[^0-9+]/', '', $r), 0, 20); };
if ($do === 'check') {
    $sw = comms_sweep();
    $nt = (int)($sw['sms']['new'] ?? 0); $nv = (int)($sw['vm']['new'] ?? 0);
    $note = ($nt || $nv) ? trim(($nv ? $nv . ' new voicemail' . ($nv === 1 ? '' : 's') : '') . ($nt && $nv ? ', ' : '') . ($nt ? $nt . ' new text' . ($nt === 1 ? '' : 's') : '')) : 'Nothing new.';
    if (!empty($sw['vm']['error'])) $err = 'Voicemail mailbox: ' . $sw['vm']['error'];
} elseif ($do === 'reply') {
    $n = $num($in['n'] ?? ''); $text = trim((string)($in['text'] ?? ''));
    if ($text === '') $err = 'Nothing to send.';
    elseif (!tm_is_mobile(tm_number($n))) $err = 'Texts can only go to a UK mobile - ring this one instead.';
    else {
        $r = comms_send_sms($n, mb_substr($text, 0, 600), 'portal');
        if (!empty($r['ok'])) $note = 'Text sent' . (!empty($r['dry']) ? ' (dry run)' : '') . '.';
        else $err = 'The text did not send: ' . (string)($r['error'] ?? 'unknown') . '.';
    }
} elseif ($do === 'done') {
    $n = $num($in['n'] ?? '');
    $k = $n !== '' ? comms_handle_number($n, 'portal') : 0;
    $note = $k ? 'Marked done.' : 'Nothing left to mark.';
}
list($ok, $items) = comms_locked(function ($d) { return array('__result' => $d['items']); });
if (!$ok) ca_out(array('ok' => false, 'error' => 'busy'));
$t = comms_threads($items, $PCM_ADMIN_PASS);
ca_out(array('ok' => true, 'threads' => $t['threads'], 'open' => $t['open'], 'total' => $t['total'], 'note' => $note, 'err' => $err, 'at' => time()));
