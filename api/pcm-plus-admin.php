<?php
/*
 * The paid app abroad - "Unlock everything" (8 Oct 2026): the staff portal's card (Setup tab). Staff session only.
 * POST {stoken, machine, do, ...}:
 *   do=list (default)                     -> {ok, on, why_off, url_set, price, keys: [{id, last4, email, created, expires,
 *                                            status, provider, note, by, pcs}]}
 *   do=issue {email, years (0 = lifetime, 1..10), note} -> + key: the new key, shown ONCE (only its hash is kept)
 *   do=revoke | do=restore {id}           -> a key stops / starts working at the PC's next check-in (a refund, a mistake)
 *   do=freepcs {id}                       -> its PC slots emptied (a buyer changed computer)
 * The switch itself is NOT here: api/pcm-buy-config.php ($BUY_ON, deployed on the owner's go) and api/pcm-buy.off (stop).
 * NO closing tag in this file.
 */
error_reporting(0);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');
require_once __DIR__ . '/visitors-tally-lib.php';   // vis_staff_ok(); top-level scope on purpose
require_once __DIR__ . '/pcm-plus-lib.php';

function pa_out($a, $code = 200) { http_response_code($code); echo json_encode($a, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') pa_out(array('ok' => false, 'error' => 'method'), 405);
$in = json_decode((string)file_get_contents('php://input', false, null, 0, 20000), true);
if (!is_array($in)) $in = array();
if (!vis_staff_ok($in, __DIR__)) pa_out(array('ok' => false, 'error' => 'auth'), 403);

// who: the staff session's sign-in name ("steve@..." -> "Steve")
$tok = preg_replace('/[^a-f0-9]/', '', (string)(isset($in['stoken']) ? $in['stoken'] : ''));
$db = $tok !== '' ? @json_decode((string)@file_get_contents(__DIR__ . '/pcm-data.json'), true) : null;
$rec = (is_array($db) && isset($db['staff'][$tok]) && is_array($db['staff'][$tok])) ? $db['staff'][$tok] : array();
$login = (string)(isset($rec['login']) ? $rec['login'] : (isset($rec['email']) ? $rec['email'] : ''));
$by = ucfirst(strtolower(preg_replace('/[^A-Za-z]/', '', (string)strstr($login . '@', '@', true))));
$by = $by !== '' ? $by : 'Staff';

$do = (string)(isset($in['do']) ? $in['do'] : 'list');
$id = preg_replace('/[^a-f0-9]/', '', (string)(isset($in['id']) ? $in['id'] : ''));
$out = array('ok' => true, 'note' => '', 'err' => '');
if ($do === 'issue') {
    $email = (string)(isset($in['email']) ? $in['email'] : '');
    $years = (int)(isset($in['years']) ? $in['years'] : 1);
    if (!filter_var(strtolower(trim($email)), FILTER_VALIDATE_EMAIL)) $out['err'] = 'Type the buyer\'s email address - it is how we find their key later.';
    else {
        $r = plus_issue($email, $years, $by, 'staff', '', (string)(isset($in['note']) ? $in['note'] : ''));
        if ($r) { $out['key'] = $r[0]; $out['note'] = 'Key made - copy it now: only its last four characters are kept.'; }
        else $out['err'] = 'The key list was busy or unreadable - nothing was made. Try again.';
    }
} elseif ($do === 'revoke' || $do === 'restore') {
    $okS = plus_set_status($id, $do === 'revoke' ? 'revoked' : 'active');
    $out['note'] = $okS ? ($do === 'revoke' ? 'Switched off - it stops working at that PC\'s next check-in (within the hour).' : 'Switched back on.') : 'Nothing changed.';
} elseif ($do === 'freepcs') {
    $out['note'] = plus_free_pcs($id) ? 'Its PCs are cleared - the key can be activated on new PCs.' : 'Nothing to clear.';
}
$cfg = plus_config();
$on = plus_enabled();
$out['on'] = $on;
$out['why_off'] = $on ? '' : (file_exists(PLUS_OFF) ? 'stopped (api/pcm-buy.off is on the server)' : (!$cfg['on'] ? 'switched off in api/pcm-buy-config.php' : 'no checkout link yet'));
$out['url_set'] = $cfg['url'] !== '';
$out['price'] = $cfg['price'];
$out['max_pcs'] = PLUS_MAX_PCS;
$out['keys'] = plus_list();
pa_out($out);
