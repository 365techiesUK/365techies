<?php
/*
 * Comms inbox - staff console: voicemails + two-way SMS, threaded by number,
 * matched to customers. Same auth as pcm-admin/ai-admin (shared passphrase or
 * 12h portal staff token), CSRF on mutations. Voicemail audio is streamed ONLY
 * through this authed page (the files themselves are .htaccess-denied).
 * NO closing tag in this file.
 */
/* Console sessions slide: any authed hit renews the 12-hour clock, and the
 * cookie/gc lifetime is raised to match so PHP's default ~24-minute garbage
 * collection cannot silently eat an open tab's session. Session NAME stays
 * default (PHPSESSID) - the SSO handoff depends on that, see pcm-admin.php. */
@ini_set('session.gc_maxlifetime', '43200');
@session_set_cookie_params(43200);
session_start();
if (!empty($_SESSION['pcm_ok'])) {
    if (isset($_SESSION['t']) && (time() - (int)$_SESSION['t']) > 43200) {
        session_unset(); session_destroy(); session_start();
    } else {
        $_SESSION['t'] = time();
    }
}
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
    // expired/unknown token -> say so, instead of a mute passphrase prompt; signed in -> the thread a Slack link asked for
    $wantN = (!empty($_SESSION['pcm_ok']) && !empty($_SESSION['comms_n'])) ? '?n=' . rawurlencode((string)$_SESSION['comms_n']) : '';
    unset($_SESSION['comms_n']);
    header('Location: comms.php' . (empty($_SESSION['pcm_ok']) ? '?sso=expired' : $wantN)); exit;
}
if (isset($_GET['logout'])) { session_destroy(); header('Location: comms.php'); exit; }
if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(16));
$CSRF = $_SESSION['csrf'];
if ((isset($_POST['do']) ? $_POST['do'] : '') !== '' && !hash_equals($CSRF, (string)(isset($_POST['csrf']) ? $_POST['csrf'] : ''))) { http_response_code(403); exit('bad token'); }
if (empty($_SESSION['pcm_ok'])) {
    // No session? Bounce through the portal: if the staff login there is live
    // (or once it is renewed), it posts us straight back in - no passphrase.
    // Only plain GETs bounce; ?sso=... (the explained-failure card) and
    // ?login=1 (deliberate passphrase entry) render the sign-in card instead.
    if ($_SERVER['REQUEST_METHOD'] === 'GET' && !isset($_GET['sso']) && !isset($_GET['login'])) {
        // 1 Oct 2026: a Slack voicemail link names one caller (?n=); remember it across the portal sign-in bounce
        if (isset($_GET['n'])) { $nb = (string)$_GET['n']; if ($nb !== '' && $nb[0] === ' ') $nb = '+' . ltrim($nb); $_SESSION['comms_n'] = substr(preg_replace('/[^0-9+]/', '', $nb), 0, 20); }
        header('Location: /portal/?console=comms'); exit;
    }
    echo '<!doctype html><meta name=viewport content="width=device-width,initial-scale=1"><title>365 comms inbox</title>';
    echo '<body style="font-family:system-ui;background:#0b1226;color:#eef;display:grid;place-items:center;height:100vh;margin:0">';
    echo '<form method=post style="background:#0d1530;padding:2rem;border-radius:14px;border:1px solid #2a3b63;min-width:300px;max-width:360px">';
    echo '<h2 style="margin:0 0 1rem">365 comms inbox</h2>';
    if (isset($_GET['sso'])) {
        echo '<p style="margin:0 0 1rem;padding:.6rem .8rem;border:1px solid #e3b71d;border-radius:8px;color:#ffe9a8;font-size:.88rem">'
           . 'Your portal staff session has expired (they last 12 hours). '
           . '<a href="/portal/?staffexpired=1&amp;console=comms" style="color:#6fc7ff">Sign in at the portal again</a> and you&rsquo;ll land straight back here &mdash; or use the passphrase below.</p>';
    }
    echo '<input type=password name=pass placeholder=Passphrase autofocus style="width:100%;padding:.7rem;border-radius:8px;border:1px solid #2a3b63;background:#0b1226;color:#fff;box-sizing:border-box">';
    echo '<button style="margin-top:1rem;width:100%;padding:.7rem;border:0;border-radius:8px;background:#1d97e3;color:#fff;font-size:1rem;cursor:pointer">Sign in</button></form>';
    exit;
}

/* authed voicemail audio streaming - the ONLY route to the denied files */
if (isset($_GET['audio'])) {
    $f = (string)$_GET['audio'];
    if (!preg_match('/^vm-audio-[A-Za-z0-9\-]+\.(mp3|wav)$/', $f) || !is_file(__DIR__ . '/' . $f)) { http_response_code(404); exit('no'); }
    // telephone WAV -> PCM, byte ranges (iPhones), download name: comms_stream_audio, shared with the portal card
    comms_stream_audio(__DIR__ . '/' . $f, !empty($_GET['dl']));
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
/* 1 Oct 2026: the review text, for any finished job (comms_send_review: once a year per number, unconditional wording) */
if ((isset($_POST['do']) ? $_POST['do'] : '') === 'review') {
    $rr = comms_send_review((string)(isset($_POST['to']) ? $_POST['to'] : ''), 'staff');
    if (!empty($rr['ok'])) $msg = 'Review text sent' . (!empty($rr['dry']) ? ' (dry run)' : '') . '.';
    else $err = h($rr['error']);
}
/* 1 Oct 2026: an older voicemail's recording into Slack on request (new ones go there by themselves). The line says
   "Recording", not "Voicemail from", so the lead reminders do not chase a re-post as a new voicemail. */
if ((isset($_POST['do']) ? $_POST['do'] : '') === 'vmslack') {
    $vid = (string)(isset($_POST['id']) ? $_POST['id'] : '');
    list($okV, $vit) = comms_locked(function ($d) use ($vid) { foreach ($d['items'] as $it) if ($it['id'] === $vid) return array('__result' => $it); return array('__result' => null); });
    if (!$okV || !$vit || $vit['type'] !== 'voicemail' || $vit['audio'] === '') { $err = 'That voicemail has no recording to post.'; }
    else {
        $vm = $vit['match'];
        $vwho = (isset($vm['status']) && $vm['status'] === 'MATCH') ? $vm['name'] . ' (' . $vit['number'] . ')' : $vit['number'];
        $vwhen = date('D j M H:i', (int)strtotime($vit['at']));
        $rv = comms_vm_announce($vwho, $vit['number'], $vit['duration'], $vit['audio'], '',
            "\xE2\x96\xB6 Recording of the voicemail from " . $vwho . ', left ' . $vwhen . ($vit['duration'] !== '' ? ' (' . $vit['duration'] . ')' : ''));
        if (!empty($rv['ok']) && $rv['how'] === 'file') $msg = 'Posted to Slack - it plays in #365-job-tracker.';
        elseif (!empty($rv['ok'])) $err = 'Slack would not take the file (' . h($rv['error']) . '), so a link to this thread went instead. If it says missing_scope, the 365 Slack app needs the files:write permission.';
        else $err = 'Slack did not answer - try again in a minute.';
    }
}
/* 1 Oct 2026: called them back? one press clears every text and voicemail from that number */
if ((isset($_POST['do']) ? $_POST['do'] : '') === 'handledall') {
    $nh = comms_handle_number(preg_replace('/[^0-9+]/', '', (string)(isset($_POST['n']) ? $_POST['n'] : '')), 'staff');
    $msg = $nh . ' marked handled.';
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

/* 1 Oct 2026: a "+" in a query string arrives as a space, so ?n=+447... (every list link until today) read as
   "447..." and no thread ever opened - the voicemail player lives in the thread. Links are encoded now, and a bare
   leading space is read back as the "+" it was. */
$rawN = isset($_GET['n']) ? (string)$_GET['n'] : '';
if ($rawN !== '' && $rawN[0] === ' ') $rawN = '+' . ltrim($rawN);
$sel = preg_replace('/[^0-9+a-z]/i', '', $rawN);

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
    $openN = 0;
    foreach ($th as $it0) if (empty($it0['handled']) && $it0['type'] !== 'sms_out') $openN++;
    echo '<p style="margin:.2rem 0 .8rem"><a href="tel:' . h($sel) . '"><button>&#128222; Call back</button></a>'
       . ($openN > 1 ? ' <form method=post style="display:inline"><input type=hidden name=do value=handledall><input type=hidden name=csrf value="' . $CSRF . '">'
          . '<input type=hidden name=n value="' . h($sel) . '"><button style="background:#223258">Mark all ' . $openN . ' handled</button></form>' : '')
       . ($match['status'] === 'MATCH' ? ' <span class="tag tag--match">customer: ' . h($match['name']) . '</span>' : '')
       . ($match['status'] === 'MULTIPLE' ? ' <span class=tag>multiple possible matches &mdash; verify before assuming</span>' : '') . '</p>';
    foreach ($th as $it) {
        $cls = $it['type'] === 'sms_out' ? 'bub bub--out' : ($it['type'] === 'voicemail' ? 'bub bub--vm' : 'bub');
        echo '<div class="' . $cls . '"><div class=meta>' . h(substr($it['at'], 0, 16)) . ' &middot; ' . h($it['type'])
           . ($it['duration'] !== '' ? ' &middot; ' . h($it['duration']) : '')
           . (!empty($it['handled']) ? ' &middot; handled' : '') . '</div>';
        echo nl2br(h($it['body']));
        if ($it['type'] === 'voicemail' && $it['audio'] !== '') {
            // the player, a download (plays in any media player whatever the format) and what the file is
            if (substr($it['audio'], -3) === 'wav') comms_wav_fix_file(__DIR__ . '/' . $it['audio']);   // telephone WAV -> PCM before it is described
            $wi = comms_wav_info((string)@file_get_contents(__DIR__ . '/' . $it['audio'], false, null, 0, 4096));
            echo '<div style="margin-top:.45rem"><audio controls preload=metadata style="width:100%;max-width:420px" src="comms.php?audio=' . h($it['audio']) . '"></audio>'
               . '<div class=meta style="margin-top:.2rem"><a href="comms.php?audio=' . h($it['audio']) . '&amp;dl=1">Download the recording</a>'
               . ' &middot; <form method=post style="display:inline"><input type=hidden name=do value=vmslack><input type=hidden name=csrf value="' . $CSRF . '">'
               . '<input type=hidden name=id value="' . h($it['id']) . '"><button style="background:none;border:0;padding:0;color:#6fc7ff;font-size:inherit;cursor:pointer;text-decoration:underline">Post the recording to Slack</button></form>'
               . ($wi ? ' &middot; WAV ' . h($wi['codec']) . ($wi['playable'] ? '' : ' &mdash; browsers cannot play this kind of WAV: use Download (Windows plays it), or set Voipfone to send MP3') : ' &middot; ' . h(strtoupper(pathinfo($it['audio'], PATHINFO_EXTENSION))))
               . '</div></div>';
        } elseif ($it['type'] === 'voicemail') {
            // 1 Oct 2026: say why there is nothing to play, instead of an empty bubble
            $why = (string)(isset($it['audio_why']) ? $it['audio_why'] : '');
            echo '<div class=meta style="margin-top:.45rem;color:#ffd38a">'
               . ($why === '' && empty($it['audio_tried']) ? 'Looking for the recording &mdash; press Check now in a moment.'
                  : 'No recording: ' . h($why !== '' ? $why : 'none came with the email')
                    . (strpos($why, 'no recording in the email') === 0 ? '. Switch on <b>Include attachment</b> for this voicemail box in the Voipfone control panel, and new voicemails will play here and in Slack.' : ''))
               . '</div>';
        }
        if (empty($it['handled']) && $it['type'] !== 'sms_out') {
            echo '<form method=post style="margin-top:.4rem"><input type=hidden name=do value=handled><input type=hidden name=csrf value="' . $CSRF . '">'
               . '<input type=hidden name=id value="' . h($it['id']) . '"><input type=hidden name=on value=1>'
               . '<button style="background:#223258">Mark handled</button></form>';
        }
        echo '</div>';
    }
    if (preg_match('/^\+447\d{9}$/', $sel)) {
        echo '<form method=post id=reply style="margin-top:.8rem;display:grid;gap:.5rem;max-width:640px">'
           . '<input type=hidden name=do value=reply><input type=hidden name=csrf value="' . $CSRF . '"><input type=hidden name=to value="' . h($sel) . '">'
           . '<textarea name=text rows=3' . (!empty($_GET['r']) ? ' autofocus' : '') . ' placeholder="Reply by text from the 365 Techies number (07520 615332)&hellip;"></textarea>'
           . '<button>Send text</button></form>';
        // the review text: once a year per number (Google allows one review per person)
        $rvAt = comms_review_sent_at($sel, $items);
        if ($rvAt && time() - $rvAt < COMMS_REVIEW_COOLDOWN) {
            echo '<p class=meta style="margin-top:.7rem">&#11088; Review text sent ' . h(gmdate('j M Y', $rvAt)) . ' &mdash; not sent again within a year.</p>';
        } else {
            echo '<form method=post style="margin-top:.7rem" onsubmit="return confirm(\'Send the Google review text to ' . h($sel) . '?\')">'
               . '<input type=hidden name=do value=review><input type=hidden name=csrf value="' . $CSRF . '"><input type=hidden name=to value="' . h($sel) . '">'
               . '<button style="background:#2a8f5b">&#11088; Ask for a Google review</button>'
               . '<span class=meta style="margin-left:.6rem">&ldquo;' . h(COMMS_REVIEW_TEXT) . '&rdquo;</span></form>';
        }
    } else {
        echo '<p class=meta style="margin-top:.8rem">Replies by text need a UK mobile &mdash; this number isn&rsquo;t one, so it&rsquo;s call-back only.</p>';
    }
    echo '<p style="margin-top: .8rem"><a href="comms.php">&larr; back to the inbox</a></p></div>';
} else {
    // 1 Oct 2026: ask any finished job for a review, even one that never texted us (phone, remote, Dell, email moves)
    echo '<div class=card><form method=post style="display:flex;flex-wrap:wrap;gap:.5rem;align-items:center" onsubmit="return confirm(\'Send the Google review text to \' + this.to.value + \'?\')">'
       . '<input type=hidden name=do value=review><input type=hidden name=csrf value="' . $CSRF . '">'
       . '<label for=rvto style="font-weight:600">&#11088; Finished a job? Ask for a Google review by text:</label>'
       . '<input id=rvto name=to type=tel inputmode=tel placeholder="07&hellip; mobile" required style="width:12rem">'
       . '<button style="background:#2a8f5b">Send review text</button>'
       . '<span class=meta style="flex-basis:100%">&ldquo;' . h(COMMS_REVIEW_TEXT) . '&rdquo; &middot; once a year per number</span></form></div>';
    echo '<div class=card><table style="border-collapse:collapse;width:100%;font-size:.9rem">';
    echo '<tr><th style="text-align:left;padding:.4rem .6rem;color:#9fb3dd">Who</th><th style="text-align:left;padding:.4rem .6rem;color:#9fb3dd">Last</th><th style="text-align:left;padding:.4rem .6rem;color:#9fb3dd">Latest item</th><th></th></tr>';
    foreach ($threads as $num => $th) {
        $lastIt = end($th);
        $match = $lastIt['match'];
        $unhandled = 0;
        foreach ($th as $it) if (empty($it['handled']) && $it['type'] !== 'sms_out') $unhandled++;
        $who = $match['status'] === 'MATCH' ? $match['name'] : $num;
        echo '<tr style="border-top:1px solid #223258"><td style="padding:.45rem .6rem"><a href="?n=' . rawurlencode($num) . '">' . h($who) . '</a>'
           . ($match['status'] === 'MATCH' ? ' <span class="tag tag--match">customer</span>' : '')
           . ($unhandled ? ' <span class="tag tag--new">' . $unhandled . ' new</span>' : '') . '</td>';
        echo '<td class=mono style="padding:.45rem .6rem;white-space:nowrap">' . h(substr($lastIt['at'], 0, 16)) . '</td>';
        // 1 Oct 2026: the newest voicemail plays right here in the list; otherwise the item, in words
        if ($lastIt['type'] === 'voicemail' && $lastIt['audio'] !== '') {
            echo '<td style="padding:.3rem .6rem"><span class=meta style="margin-right:.4rem">Voicemail' . ($lastIt['duration'] !== '' ? ' &middot; ' . h($lastIt['duration']) : '') . '</span>'
               . '<audio controls preload=none style="height:32px;vertical-align:middle;max-width:260px" src="comms.php?audio=' . h($lastIt['audio']) . '"></audio></td>';
        } else {
            $label = $lastIt['type'] === 'voicemail' ? 'Voicemail' . ($lastIt['duration'] !== '' ? ' (' . h($lastIt['duration']) . ')' : '') . ' &mdash; open to see why there is no recording'
                : h($lastIt['type'] === 'sms_in' ? 'Text' : ($lastIt['type'] === 'sms_out' ? 'We texted' : $lastIt['type'])) . ': ' . h(mb_substr(preg_replace('/\s+/', ' ', $lastIt['body']), 0, 70));
            echo '<td style="padding:.45rem .6rem">' . $label . '</td>';
        }
        // 1 Oct 2026: reply by text straight from the list (opens the thread with the reply box ready) - UK mobiles only
        echo '<td style="padding:.45rem .6rem;white-space:nowrap"><a href="tel:' . h($num) . '">call</a>'
           . (preg_match('/^\+447\d{9}$/', $num) ? ' &middot; <a href="?n=' . rawurlencode($num) . '&amp;r=1#reply">reply</a>' : '') . '</td></tr>';
    }
    if (!$threads) echo '<tr><td style="padding:.6rem" colspan=4>Nothing yet &mdash; voicemails and texts appear here as the crons pick them up.</td></tr>';
    echo '</table></div>';
}
