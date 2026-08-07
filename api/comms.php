<?php
/*
 * Comms inbox - staff console: voicemails + two-way SMS, threaded by number,
 * matched to customers. Same auth as pcm-admin/ai-admin (shared passphrase or
 * 12h portal staff token), CSRF on mutations. Voicemail audio is streamed ONLY
 * through this authed page (the files themselves are .htaccess-denied).
 * NO closing tag in this file.
 */
session_start();
header('X-Robots-Tag: noindex, nofollow');
$SECRET = __DIR__ . '/pcm-admin-secret.php';
$PCMDATA = __DIR__ . '/pcm-data.json';
if (!file_exists($SECRET)) { http_response_code(503); exit('Not configured: create api/pcm-admin-secret.php'); }
require $SECRET; // $PCM_ADMIN_PASS
require __DIR__ . '/comms-lib.php';

function h($s) { return htmlspecialchars((string)$s, ENT_QUOTES); }

if (isset($_POST['pass'])) { if (hash_equals($PCM_ADMIN_PASS, $_POST['pass'])) { session_regenerate_id(true); $_SESSION['pcm_ok'] = 1; } }
if (isset($_POST['stoken']) && empty($_SESSION['pcm_ok'])) {
    $tokS = preg_replace('/[^a-f0-9]/', '', (string)$_POST['stoken']);
    $macS = preg_replace('/[^a-f0-9]/', '', substr((string)(isset($_POST['machine']) ? $_POST['machine'] : ''), 0, 32));
    if ($tokS !== '') {
        $dbT = @json_decode((string)@file_get_contents($PCMDATA), true);
        $sS = (is_array($dbT) && isset($dbT['staff'][$tokS])) ? $dbT['staff'][$tokS] : null;
        if ($sS && (time() - intval(isset($sS['ts']) ? $sS['ts'] : 0)) < 43200 && (time() - intval(isset($sS['iat']) ? $sS['iat'] : 0)) < 43200
            && (empty($sS['machine']) || $sS['machine'] === $macS)) {
            session_regenerate_id(true); $_SESSION['pcm_ok'] = 1;
        }
    }
    header('Location: comms.php'); exit;
}
if (isset($_GET['logout'])) { session_destroy(); header('Location: comms.php'); exit; }
if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(16));
$CSRF = $_SESSION['csrf'];
if ((isset($_POST['do']) ? $_POST['do'] : '') !== '' && !hash_equals($CSRF, (string)(isset($_POST['csrf']) ? $_POST['csrf'] : ''))) { http_response_code(403); exit('bad token'); }
if (empty($_SESSION['pcm_ok'])) {
    echo '<!doctype html><meta name=viewport content="width=device-width,initial-scale=1"><title>365 comms inbox</title>';
    echo '<body style="font-family:system-ui;background:#0b1226;color:#eef;display:grid;place-items:center;height:100vh;margin:0">';
    echo '<form method=post style="background:#0d1530;padding:2rem;border-radius:14px;border:1px solid #2a3b63;min-width:300px">';
    echo '<h2 style="margin:0 0 1rem">365 comms inbox</h2><input type=password name=pass placeholder=Passphrase autofocus style="width:100%;padding:.7rem;border-radius:8px;border:1px solid #2a3b63;background:#0b1226;color:#fff;box-sizing:border-box">';
    echo '<button style="margin-top:1rem;width:100%;padding:.7rem;border:0;border-radius:8px;background:#1d97e3;color:#fff;font-size:1rem;cursor:pointer">Sign in</button></form>';
    exit;
}

/* authed voicemail audio streaming - the ONLY route to the denied files */
if (isset($_GET['audio'])) {
    $f = (string)$_GET['audio'];
    if (!preg_match('/^vm-audio-[A-Za-z0-9\-]+\.(mp3|wav)$/', $f) || !is_file(__DIR__ . '/' . $f)) { http_response_code(404); exit('no'); }
    header('Content-Type: ' . (substr($f, -3) === 'wav' ? 'audio/wav' : 'audio/mpeg'));
    header('Cache-Control: no-store');
    header('Content-Length: ' . filesize(__DIR__ . '/' . $f));
    readfile(__DIR__ . '/' . $f);
    exit;
}

header('Cache-Control: no-store');
$msg = ''; $err = '';
if ((isset($_POST['do']) ? $_POST['do'] : '') === 'reply') {
    $to = (string)(isset($_POST['to']) ? $_POST['to'] : '');
    $text = trim((string)(isset($_POST['text']) ? $_POST['text'] : ''));
    if ($text === '') { $err = 'Nothing to send.'; }
    else {
        $r = comms_send_sms($to, $text, 'staff');
        if (!empty($r['ok'])) $msg = 'Text sent' . (!empty($r['dry']) ? ' (dry run)' : '') . '.';
        else $err = 'Send failed: ' . h(isset($r['error']) ? $r['error'] : '?');
    }
}
if ((isset($_POST['do']) ? $_POST['do'] : '') === 'handled') {
    comms_set_handled((string)(isset($_POST['id']) ? $_POST['id'] : ''), !empty($_POST['on']), 'staff');
    $msg = 'Updated.';
}
if ((isset($_POST['do']) ? $_POST['do'] : '') === 'sweep') {
    $sw = comms_sweep();
    $msg = 'Sweep: ' . h(json_encode($sw));
}

list($okAll, $items) = comms_locked(function ($d) { return array('__result' => $d['items']); });
if (!$okAll) $items = array();

/* thread by number */
$threads = array();
foreach ($items as $it) {
    $threads[$it['number']][] = $it;
}
uasort($threads, function ($a, $b) { return strcmp(end($b)['at'], end($a)['at']); });

$sel = isset($_GET['n']) ? preg_replace('/[^0-9+a-z]/i', '', (string)$_GET['n']) : '';

echo '<!doctype html><meta name=viewport content="width=device-width,initial-scale=1"><title>365 comms inbox</title>';
echo '<body style="font-family:system-ui;background:#0b1226;color:#eef;margin:0;padding:1.2rem 1.5rem">';
echo '<style>a{color:#6fc7ff}.card{background:#0d1530;border:1px solid #2a3b63;border-radius:12px;padding:1rem 1.2rem;margin:0 0 1rem}
.tag{display:inline-block;padding:.1rem .5rem;border-radius:999px;border:1px solid #2a3b63;font-size:.78rem;color:#bcd}
.tag--new{border-color:#e3b71d;color:#ffe9a8}.tag--match{border-color:#2a8f5b;color:#9fe7bf}
input,textarea{background:#0b1226;color:#fff;border:1px solid #2a3b63;border-radius:8px;padding:.5rem;font:inherit;box-sizing:border-box;width:100%}
button{padding:.5rem .9rem;border:0;border-radius:8px;background:#1d97e3;color:#fff;font-size:.9rem;cursor:pointer}
.ok{color:#7de3a0}.bad{color:#ffb3b3}.mono{font-family:ui-monospace,monospace}
.bub{border:1px solid #223258;border-radius:10px;padding:.6rem .8rem;margin:.45rem 0;max-width:640px}
.bub--out{border-color:#1d97e3;margin-left:2.5rem}.bub--vm{border-color:#8a5de3}
.meta{font-size:.76rem;color:#9fb3dd;margin-bottom:.25rem}</style>';
echo '<h1 style="margin:.2rem 0 1rem;font-size:1.3rem">365 comms inbox <span class=tag>' . count($threads) . ' threads</span>'
   . '<form method=post style="display:inline;margin-left:.7rem"><input type=hidden name=do value=sweep><input type=hidden name=csrf value="' . $CSRF . '"><button style="background:#223258">Check now</button></form>'
   . ' <a style="float:right;font-size:.85rem" href="?logout=1">sign out</a></h1>';
if ($msg) echo '<p class=ok>' . $msg . '</p>';
if ($err) echo '<p class=bad>' . $err . '</p>';

if ($sel !== '' && isset($threads[$sel])) {
    $th = $threads[$sel];
    $match = end($th)['match'];
    $who = ($match['status'] === 'MATCH') ? $match['name'] : (($match['status'] === 'MULTIPLE') ? 'Possible: ' . $match['name'] : 'Unknown caller');
    echo '<div class=card><h2 style="margin:0 0 .4rem;font-size:1.05rem">' . h($who) . ' <span class=mono style="font-size:.85rem">' . h($sel) . '</span></h2>';
    echo '<p style="margin:.2rem 0 .8rem"><a href="tel:' . h($sel) . '"><button>&#128222; Call back</button></a>'
       . ($match['status'] === 'MATCH' ? ' <span class="tag tag--match">customer: ' . h($match['name']) . '</span>' : '')
       . ($match['status'] === 'MULTIPLE' ? ' <span class=tag>multiple possible matches &mdash; verify before assuming</span>' : '') . '</p>';
    foreach ($th as $it) {
        $cls = $it['type'] === 'sms_out' ? 'bub bub--out' : ($it['type'] === 'voicemail' ? 'bub bub--vm' : 'bub');
        echo '<div class="' . $cls . '"><div class=meta>' . h(substr($it['at'], 0, 16)) . ' &middot; ' . h($it['type'])
           . ($it['duration'] !== '' ? ' &middot; ' . h($it['duration']) : '')
           . (!empty($it['handled']) ? ' &middot; handled' : '') . '</div>';
        echo nl2br(h($it['body']));
        if ($it['type'] === 'voicemail' && $it['audio'] !== '') {
            echo '<div style="margin-top:.45rem"><audio controls preload=none style="width:100%;max-width:420px" src="comms.php?audio=' . h($it['audio']) . '"></audio></div>';
        }
        if (empty($it['handled']) && $it['type'] !== 'sms_out') {
            echo '<form method=post style="margin-top:.4rem"><input type=hidden name=do value=handled><input type=hidden name=csrf value="' . $CSRF . '">'
               . '<input type=hidden name=id value="' . h($it['id']) . '"><input type=hidden name=on value=1>'
               . '<button style="background:#223258">Mark handled</button></form>';
        }
        echo '</div>';
    }
    if (preg_match('/^\+447\d{9}$/', $sel)) {
        echo '<form method=post style="margin-top:.8rem;display:grid;gap:.5rem;max-width:640px">'
           . '<input type=hidden name=do value=reply><input type=hidden name=csrf value="' . $CSRF . '"><input type=hidden name=to value="' . h($sel) . '">'
           . '<textarea name=text rows=3 placeholder="Reply by text from the 365 Techies number&hellip;"></textarea>'
           . '<button>Send text</button></form>';
    } else {
        echo '<p class=meta style="margin-top:.8rem">Replies by text need a UK mobile &mdash; this number isn&rsquo;t one, so it&rsquo;s call-back only.</p>';
    }
    echo '<p style="margin-top: .8rem"><a href="comms.php">&larr; back to the inbox</a></p></div>';
} else {
    echo '<div class=card><table style="border-collapse:collapse;width:100%;font-size:.9rem">';
    echo '<tr><th style="text-align:left;padding:.4rem .6rem;color:#9fb3dd">Who</th><th style="text-align:left;padding:.4rem .6rem;color:#9fb3dd">Last</th><th style="text-align:left;padding:.4rem .6rem;color:#9fb3dd">Latest item</th><th></th></tr>';
    foreach ($threads as $num => $th) {
        $lastIt = end($th);
        $match = $lastIt['match'];
        $unhandled = 0;
        foreach ($th as $it) if (empty($it['handled']) && $it['type'] !== 'sms_out') $unhandled++;
        $who = $match['status'] === 'MATCH' ? $match['name'] : $num;
        echo '<tr style="border-top:1px solid #223258"><td style="padding:.45rem .6rem"><a href="?n=' . h($num) . '">' . h($who) . '</a>'
           . ($match['status'] === 'MATCH' ? ' <span class="tag tag--match">customer</span>' : '')
           . ($unhandled ? ' <span class="tag tag--new">' . $unhandled . ' new</span>' : '') . '</td>';
        echo '<td class=mono style="padding:.45rem .6rem;white-space:nowrap">' . h(substr($lastIt['at'], 0, 16)) . '</td>';
        echo '<td style="padding:.45rem .6rem">' . h($lastIt['type']) . ': ' . h(mb_substr(preg_replace('/\s+/', ' ', $lastIt['body']), 0, 70)) . '</td>';
        echo '<td style="padding:.45rem .6rem"><a href="tel:' . h($num) . '">call</a></td></tr>';
    }
    if (!$threads) echo '<tr><td style="padding:.6rem" colspan=4>Nothing yet &mdash; voicemails and texts appear here as the crons pick them up.</td></tr>';
    echo '</table></div>';
}
