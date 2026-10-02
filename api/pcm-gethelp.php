<?php
/*
 * The 365 Get Help browser add-on (2 Oct 2026): "Ring me back" from any web page.
 *
 * The add-on POSTs JSON {install, name, phone, what, message?, page?, ver, test?} (as text/plain, so no preflight - an
 * OPTIONS preflight is answered all the same). We check it, then post ONE card to Slack #365-job-tracker so a techie
 * rings them back. Reply: {"ok":true} or {"ok":false,"error":"<code>"} - codes: method, bad request, install, name,
 * phone, rate, busy, unavailable, send. "test":1 checks everything except the rate and posts nothing ({"ok":true,
 * "test":true}) - for checking the live endpoint from the add-on without a card.
 *
 * STORES NOTHING about the person. The only write is the day's rate counter shared with the Virgin email tools
 * (pcm-mailmove-lib.php): 5 requests per add-on install (a random id it makes for itself), 10 per caller IP (a daily
 * hash, never the address) and 300 in all per UTC day. A filled-in honeypot field ("website") gets {"ok":true} and
 * nothing else happens.
 *
 * The add-on has no host permissions (so Chrome shows no "read and change your data" warning when it is added): this
 * reply carries Access-Control-Allow-Origin for a chrome-extension:// origin instead. NO closing tag in this file.
 */
@ini_set('display_errors', '0');
error_reporting(0);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');

require __DIR__ . '/pcm-mailmove-lib.php';   // top-level scope on purpose (functions only)
require __DIR__ . '/pcm-gethelp-lib.php';

$origin = isset($_SERVER['HTTP_ORIGIN']) ? (string)$_SERVER['HTTP_ORIGIN'] : '';
$allow = gh_cors_origin($origin);
if ($allow !== '') { header('Access-Control-Allow-Origin: ' . $allow); header('Vary: Origin'); }

function gh_out($a) { echo json_encode($a, JSON_UNESCAPED_SLASHES); exit; }
function gh_fail($e) { gh_out(array('ok' => false, 'error' => $e)); }

$method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : '';
if ($method === 'OPTIONS') {
    if ($allow !== '') { header('Access-Control-Allow-Methods: POST'); header('Access-Control-Allow-Headers: Content-Type'); header('Access-Control-Max-Age: 86400'); }
    http_response_code(204); exit;
}
if ($method !== 'POST') { http_response_code(405); gh_fail('method'); }
// the add-on's own origin, our site, or none (a test from the command line); never another web page
if ($origin !== '' && $allow === '' && !preg_match('#^https://(www\.)?365techies\.co\.uk$#', $origin)) { http_response_code(403); gh_fail('bad request'); }

$raw = (string)file_get_contents('php://input', false, null, 0, 16384);
$in = json_decode($raw, true);
if (!is_array($in) && $raw !== '' && !preg_match('//u', $raw)) $in = json_decode(mm_latin1_to_utf8($raw), true);
if (!is_array($in)) gh_fail('bad request');

if (!empty($in['website'])) gh_out(array('ok' => true));   // honeypot: a person never fills it

$f = array();
$f['install'] = mm_machine(isset($in['install']) ? $in['install'] : '');
if ($f['install'] === '') gh_fail('install');
$f['name'] = mm_clean(isset($in['name']) ? $in['name'] : '');
if ($f['name'] === '' || mm_len($f['name']) > 60) gh_fail('name');
$f['phone'] = mm_uk_phone(isset($in['phone']) ? $in['phone'] : '');
if ($f['phone'] === '') gh_fail('phone');
$f['what'] = gh_what(isset($in['what']) ? $in['what'] : '');
$f['message'] = gh_message(isset($in['message']) ? $in['message'] : '');
$f['page'] = gh_page(isset($in['page']) ? $in['page'] : '');
$f['ver'] = (isset($in['ver']) && is_scalar($in['ver']) && preg_match('/^\d{1,3}(\.\d{1,3}){0,3}$/', (string)$in['ver'])) ? (string)$in['ver'] : '';

$hook = mm_hook(__DIR__);
if ($hook === '') gh_fail('unavailable');   // nowhere to send it: the add-on then says "ring us" instead
if (!empty($in['test'])) gh_out(array('ok' => true, 'test' => true));

$rt = mm_rate_take(mm_rate_file(__DIR__), array(array('gh:' . $f['install'], 5), array('ghi:' . mm_ip_key(), 10), array('ghn', 300)));
if ($rt === 'busy') gh_fail('busy');
if ($rt !== true) gh_fail('rate');

gh_out(mm_post_slack($hook, gh_card($f)) ? array('ok' => true) : array('ok' => false, 'error' => 'send'));
