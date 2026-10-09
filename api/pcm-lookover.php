<?php
/*
 * PC Manager's free month: "Send my report to 365 Techies for a free look-over" (9 Oct 2026).
 *
 * WHY (owner, 9 Oct: "offer them like a 30-day trial ... so they can service their computers and get the proper reports",
 * then yes to "an optional box: send my report to 365 Techies for a free look-over, with their email"). A PC on a free
 * month (pcm-plus-lib.php plus_trial_*) runs the full service and its report stays on the PC - unless the person asks us
 * to look it over. Then, and only then, the app sends it here with the name and email they typed and their tick.
 *
 * POST from the app {key (the PC's free-month key), machine, name, email, phone (optional), html (base64 report), kind
 * (service | health), consent: true, ver}:
 *   - only a FREE-MONTH key that is good for THIS PC (never a bought Unlock key: that is sold as software, not a service -
 *     see pcm-plus-lib.php), and only with the tick;
 *   - the report kept in api/pcm-lookover/ (denied, gitignored) for LO_DAYS days with who sent it, for staff only;
 *   - ONE post to Slack #365-job-tracker ("Report look-over: please email <name> at <email>"), which the portal inbox and the
 *     lead reminders pick up like any website enquiry (pcm-leadchase-lib.php lc_lead, comms-lib.php);
 *   - rate-limited per PC, per address and overall.
 * Staff POST {stoken, machine, do: 'view', id} -> {ok, html (base64), meta} for the portal (#lookover=<id> opens it).
 * NO closing tag in this file.
 */
error_reporting(0);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');
require_once __DIR__ . '/pcm-mailmove-lib.php';   // mm_hook, mm_post_slack, mm_rate_take, mm_clean, mm_len, mm_email_ok, mm_uk_phone, mm_esc
require_once __DIR__ . '/pcm-plus-lib.php';
if (!defined('LO_DIR')) define('LO_DIR', isset($GLOBALS['PCM_LOOKOVER_DIR']) ? $GLOBALS['PCM_LOOKOVER_DIR'] : __DIR__ . '/pcm-lookover');

function lo_out($a, $code = 200) { http_response_code($code); echo json_encode($a, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE); exit; }
function lo_fail($e, $code = 200) { lo_out(array('ok' => false, 'error' => $e), $code); }

require_once __DIR__ . '/pcm-lookover-lib.php';   // lo_card (the Slack card), lo_tidy

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') lo_fail('method', 405);
$raw = (string)file_get_contents('php://input', false, null, 0, 700000);
$in = json_decode($raw, true);
if (!is_array($in)) lo_fail('bad request');

// ---- staff: open one ----
if (($in['do'] ?? '') === 'view') {
    require_once __DIR__ . '/visitors-tally-lib.php';
    if (!vis_staff_ok($in, __DIR__)) lo_fail('auth', 403);
    $id = preg_replace('/[^a-f0-9]/', '', (string)($in['id'] ?? ''));
    if (strlen($id) !== 16 || !is_file(LO_DIR . '/' . $id . '.html')) lo_fail('gone');
    $meta = @json_decode((string)@file_get_contents(LO_DIR . '/' . $id . '.json'), true);
    lo_out(array('ok' => true, 'html' => base64_encode((string)file_get_contents(LO_DIR . '/' . $id . '.html')), 'meta' => is_array($meta) ? $meta : array()));
}

// ---- the app: send one ----
if (!empty($in['website'])) lo_out(array('ok' => true));   // (a form field a person never fills)
$key = strtoupper(trim((string)($in['key'] ?? '')));
$machine = preg_replace('/[^a-f0-9]/', '', strtolower(substr((string)($in['machine'] ?? ''), 0, 64)));
if (!plus_is_key($key) || $machine === '') lo_fail('not_trial');
$tri = plus_trial_of($key);
if (!$tri) lo_fail('not_trial');   // a bought Unlock key: no look-overs (software, not a service)
$pr = plus_check($key, $machine, false);
if (empty($pr['ok'])) lo_fail($pr['error'] === 'expired' ? 'trial_ended' : 'not_trial');
if (empty($in['consent'])) lo_fail('consent');
$f = array();
$f['name'] = mm_clean($in['name'] ?? '');
if ($f['name'] === '' || mm_len($f['name']) > 60) lo_fail('name');
$f['email'] = strtolower(trim((string)($in['email'] ?? '')));
if (!mm_email_ok($f['email'])) lo_fail('email');
$f['phone'] = trim((string)($in['phone'] ?? '')) === '' ? '' : mm_uk_phone($in['phone']);   // (optional; a number we can't read is left off)
$f['kind'] = ((string)($in['kind'] ?? '')) === 'health' ? 'health' : 'service';
$f['ver'] = (isset($in['ver']) && is_scalar($in['ver']) && preg_match('/^\d{1,3}(\.\d{1,3}){0,2}$/', (string)$in['ver'])) ? (string)$in['ver'] : '';
$f['cc'] = geo_cc((string)($_SERVER['REMOTE_ADDR'] ?? ''));
$b = base64_decode(substr((string)($in['html'] ?? ''), 0, 600000), true);
if ($b === false || strlen($b) < 500 || strlen($b) > 420000) lo_fail('bad_report');
if (stripos(substr($b, 0, 300), '<html') === false && stripos(substr($b, 0, 300), '<!doctype') === false) lo_fail('bad_report');

$hook = mm_hook(__DIR__);
if ($hook === '') lo_fail('unavailable');
$rt = mm_rate_take(mm_rate_file(__DIR__), array(array('lo:' . plus_mhash($machine), 3), array('loi:' . mm_ip_key(), 6), array('lon', 200)));
if ($rt === 'busy') lo_fail('busy');
if ($rt !== true) lo_fail('rate');

$now = time();
if (!is_dir(LO_DIR)) @mkdir(LO_DIR, 0755, true);
lo_tidy(LO_DIR, $now);
$id = bin2hex(random_bytes(8));
$meta = array('at' => $now, 'name' => $f['name'], 'email' => $f['email'], 'phone' => $f['phone'], 'kind' => $f['kind'], 'cc' => $f['cc'],
    'install' => plus_mhash($machine), 'key4' => substr($key, -4), 'until' => (int)$tri['until'], 'ver' => $f['ver'], 'consent' => gmdate('c', $now));
if (@file_put_contents(LO_DIR . '/' . $id . '.html', $b) === false || @file_put_contents(LO_DIR . '/' . $id . '.json', json_encode($meta, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)) === false) {
    @unlink(LO_DIR . '/' . $id . '.html'); lo_fail('unavailable');
}
if (!mm_post_slack($hook, lo_card($f, $id, (int)$tri['until'], $now))) { @unlink(LO_DIR . '/' . $id . '.html'); @unlink(LO_DIR . '/' . $id . '.json'); lo_fail('send'); }
lo_out(array('ok' => true));
