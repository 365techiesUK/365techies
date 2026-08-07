<?php
/*
 * AI opportunity pipeline - staff console (blueprint doc 06-B minimum).
 * Same auth as pcm-admin.php: the shared admin passphrase (server-only secret
 * file) or a valid 12h portal staff session token. CSRF on every mutation.
 *
 * List -> detail -> audited updates: stage (doc-06 transition rules enforced in
 * ai-lead-lib.php: off-map moves and DEFERRED/LOST/CLOSED/WON entries demand a
 * written reason), work state, owner, next action, notes. The audit trail on
 * each record is append-only and shown in full. NO closing tag in this file.
 */
session_start();
header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');
$SECRET = __DIR__ . '/pcm-admin-secret.php';
$PCMDATA = __DIR__ . '/pcm-data.json';
if (!file_exists($SECRET)) { http_response_code(503); exit('Not configured: create api/pcm-admin-secret.php'); }
require $SECRET; // $PCM_ADMIN_PASS
require __DIR__ . '/ai-lead-lib.php';

function h($s) { return htmlspecialchars((string)$s, ENT_QUOTES); }

// auth - passphrase, or the portal staff token (same rules as pcm-admin.php)
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
    // expired/unknown token -> say so, instead of a mute passphrase prompt
    header('Location: ai-admin.php' . (empty($_SESSION['pcm_ok']) ? '?sso=expired' : '')); exit;
}
if (isset($_GET['logout'])) { session_destroy(); header('Location: ai-admin.php'); exit; }
if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(16));
$CSRF = $_SESSION['csrf'];
if ((isset($_POST['do']) ? $_POST['do'] : '') !== '' && !hash_equals($CSRF, (string)(isset($_POST['csrf']) ? $_POST['csrf'] : ''))) { http_response_code(403); exit('bad token'); }
if (empty($_SESSION['pcm_ok'])) {
    echo '<!doctype html><meta name=viewport content="width=device-width,initial-scale=1"><title>365 AI pipeline</title>';
    echo '<body style="font-family:system-ui;background:#0b1226;color:#eef;display:grid;place-items:center;height:100vh;margin:0">';
    echo '<form method=post style="background:#0d1530;padding:2rem;border-radius:14px;border:1px solid #2a3b63;min-width:300px">';
    echo '<h2 style="margin:0 0 1rem">365 AI pipeline</h2>';
    if (isset($_GET['sso'])) {
        echo '<p style="margin:0 0 1rem;padding:.6rem .8rem;border:1px solid #e3b71d;border-radius:8px;color:#ffe9a8;font-size:.88rem">'
           . 'Your portal staff session has expired (they last 12 hours). '
           . '<a href="/portal/" style="color:#6fc7ff">Open the portal</a>, sign in as staff again, and the button will bring you straight here &mdash; or use the passphrase below.</p>';
    }
    echo '<input type=password name=pass placeholder=Passphrase autofocus style="width:100%;padding:.7rem;border-radius:8px;border:1px solid #2a3b63;background:#0b1226;color:#fff;box-sizing:border-box">';
    echo '<button style="margin-top:1rem;width:100%;padding:.7rem;border:0;border-radius:8px;background:#1d97e3;color:#fff;font-size:1rem;cursor:pointer">Sign in</button></form>';
    exit;
}

$msg = ''; $err = '';
if ((isset($_POST['do']) ? $_POST['do'] : '') === 'update') {
    $id = preg_replace('/[^A-Z0-9\-]/', '', (string)(isset($_POST['id']) ? $_POST['id'] : ''));
    $chg = [
        'stage'       => (string)(isset($_POST['stage']) ? $_POST['stage'] : ''),
        'work_state'  => (string)(isset($_POST['work_state']) ? $_POST['work_state'] : ''),
        'owner'       => trim((string)(isset($_POST['owner']) ? $_POST['owner'] : '')),
        'next_action' => trim((string)(isset($_POST['next_action']) ? $_POST['next_action'] : '')),
        'note'        => trim((string)(isset($_POST['note']) ? $_POST['note'] : '')),
    ];
    list($ok, $res) = ai_pipe_update($id, $chg, 'staff-console');
    if ($ok) { $msg = 'Updated ' . $id; } else { $err = $res; }
}

$detail = null;
if (isset($_GET['id'])) {
    $id = preg_replace('/[^A-Z0-9\-]/', '', (string)$_GET['id']);
    list($ok, $detail) = ai_pipe_get($id);
    if (!$ok) $detail = null;
}

list($okAll, $all) = ai_pipe_locked(function ($d) { return ['__result' => $d['opportunities']]; });
$ops = $okAll && is_array($all) ? array_reverse($all) : [];
$filter = preg_replace('/[^A-Z_]/', '', (string)(isset($_GET['stage']) ? $_GET['stage'] : ''));
$stages = ai_pipe_stages();

echo '<!doctype html><meta name=viewport content="width=device-width,initial-scale=1"><title>365 AI pipeline</title>';
echo '<body style="font-family:system-ui;background:#0b1226;color:#eef;margin:0;padding:1.2rem 1.5rem">';
echo '<style>a{color:#6fc7ff}table{border-collapse:collapse;width:100%;font-size:.88rem}th,td{padding:.45rem .6rem;border-bottom:1px solid #223258;text-align:left;vertical-align:top}th{color:#9fb3dd;font-weight:600}
.card{background:#0d1530;border:1px solid #2a3b63;border-radius:12px;padding:1.1rem 1.3rem;margin:0 0 1.1rem}
.tag{display:inline-block;padding:.1rem .5rem;border-radius:999px;border:1px solid #2a3b63;font-size:.78rem;color:#bcd}
input,select,textarea{background:#0b1226;color:#fff;border:1px solid #2a3b63;border-radius:8px;padding:.5rem;font:inherit;box-sizing:border-box}
button{padding:.55rem 1rem;border:0;border-radius:8px;background:#1d97e3;color:#fff;font-size:.95rem;cursor:pointer}
.ok{color:#7de3a0}.bad{color:#ffb3b3}.mono{font-family:ui-monospace,monospace}</style>';
echo '<h1 style="margin:.2rem 0 1rem;font-size:1.3rem">365 AI pipeline <span class=tag>' . count($ops) . ' opportunities</span> <a style="float:right;font-size:.85rem" href="?logout=1">sign out</a></h1>';
if ($msg) echo '<p class=ok>' . h($msg) . '</p>';
if ($err) echo '<p class=bad>' . h($err) . '</p>';

if ($detail) {
    $o = $detail;
    echo '<div class=card><h2 style="margin:0 0 .6rem;font-size:1.05rem">' . h($o['id']) . ' &middot; ' . h($o['contact']['company']) . '</h2>';
    echo '<p><span class=tag>' . h($o['stage']) . '</span> <span class=tag>' . h($o['work_state']) . '</span> <span class=tag>created ' . h(substr($o['created_at'], 0, 16)) . 'Z</span>';
    if ($o['contact']['existing_customer'] === 'YES') echo ' <span class=tag>existing customer</span>';
    echo '</p>';
    echo '<p><strong>Problem:</strong><br>' . nl2br(h($o['problem'])) . '</p>';
    foreach ([['category','Category'],['outcome','Desired outcome'],['systems','Systems'],['frequency','Frequency'],['team_size','Team size'],['timeline','Timeline']] as $ff) {
        if ((string)$o[$ff[0]] !== '') echo '<p><strong>' . $ff[1] . ':</strong> ' . h($o[$ff[0]]) . '</p>';
    }
    echo '<p><strong>Contact:</strong> ' . h($o['contact']['name']) . ' &middot; <a href="mailto:' . h($o['contact']['email']) . '">' . h($o['contact']['email']) . '</a>';
    if ($o['contact']['phone'] !== '') echo ' &middot; <a href="tel:' . h($o['contact']['phone']) . '">' . h($o['contact']['phone']) . '</a>';
    echo '</p>';
    echo '<p class=mono style="font-size:.8rem;color:#9fb3dd">via ' . h($o['attribution']['page']) . ($o['attribution']['ref'] !== '' ? ' &larr; ' . h($o['attribution']['ref']) : '') . ' &middot; slack sync: ' . h(isset($o['sync']['slack']) ? $o['sync']['slack'] : '-') . '</p>';

    $cur = $o['stage']; $next = isset($stages[$cur]) ? $stages[$cur] : [];
    echo '<form method=post style="margin-top: .9rem;display:grid;gap:.6rem;max-width:640px">';
    echo '<input type=hidden name=do value=update><input type=hidden name=csrf value="' . $CSRF . '"><input type=hidden name=id value="' . h($o['id']) . '">';
    echo '<label>Stage <select name=stage><option value="">' . h($cur) . ' (keep)</option>';
    foreach (array_keys($stages) as $st) { if ($st === $cur) continue;
        $mark = in_array($st, $next, true) ? '' : ' *';
        echo '<option value="' . $st . '">' . $st . $mark . '</option>'; }
    echo '</select> <span style="font-size:.78rem;color:#9fb3dd">* = off the normal map, needs a note</span></label>';
    echo '<label>Work state <select name=work_state><option value="">' . h($o['work_state']) . ' (keep)</option>';
    foreach (ai_pipe_work_states() as $ws) { if ($ws !== $o['work_state']) echo '<option>' . $ws . '</option>'; }
    echo '</select></label>';
    echo '<label>Owner <input name=owner value="' . h($o['owner']) . '" placeholder="who is driving this"></label>';
    echo '<label>Next action <input name=next_action value="' . h($o['next_action']) . '"></label>';
    echo '<label>Note <textarea name=note rows=2 placeholder="reason / evidence / call summary (required for DEFERRED, LOST, CLOSED, WON and off-map moves)"></textarea></label>';
    echo '<button>Save</button></form>';

    echo '<h3 style="margin:1.1rem 0 .4rem;font-size:.95rem">Audit trail</h3><table>';
    foreach (array_reverse($o['audit']) as $a) {
        echo '<tr><td class=mono style="white-space:nowrap">' . h(substr($a['t'], 0, 16)) . 'Z</td><td>' . h(isset($a['by']) ? $a['by'] : 'system') . '</td><td>' . h($a['ev']) . '</td></tr>';
    }
    echo '</table><p><a href="ai-admin.php">&larr; back to the board</a></p></div>';
} else {
    echo '<p style="margin:.2rem 0 .8rem">Filter: <a href="ai-admin.php">all</a>';
    foreach (array_keys($stages) as $st) echo ' &middot; <a href="?stage=' . $st . '">' . $st . '</a>';
    echo '</p><div class=card><table><tr><th>Ref</th><th>Created</th><th>Stage</th><th>Waiting on</th><th>Company</th><th>Owner</th><th>Next action</th><th>Problem</th></tr>';
    foreach ($ops as $o) {
        if ($filter !== '' && $o['stage'] !== $filter) continue;
        echo '<tr><td class=mono><a href="?id=' . h($o['id']) . '">' . h($o['id']) . '</a></td>';
        echo '<td class=mono style="white-space:nowrap">' . h(substr($o['created_at'], 0, 10)) . '</td>';
        echo '<td><span class=tag>' . h($o['stage']) . '</span></td><td style="font-size:.8rem">' . h(str_replace('_', ' ', strtolower($o['work_state']))) . '</td>';
        echo '<td>' . h($o['contact']['company']) . '</td><td>' . h($o['owner']) . '</td><td>' . h($o['next_action']) . '</td>';
        echo '<td style="max-width:340px">' . h(mb_substr(preg_replace('/\s+/', ' ', $o['problem']), 0, 90)) . '&hellip;</td></tr>';
    }
    echo '</table></div>';
}
