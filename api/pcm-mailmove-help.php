<?php
/*
 * 365 PC Manager v30 - "Stuck? We'll do it for you" in the free Virgin email tools.
 *
 * The app POSTs JSON {machine, name, phone, email?, virgin?, count, mb, phase, ver}. We check it, then post ONE card to
 * Slack #365-job-tracker so a techie rings them back to agree the GBP 60-per-address move (which includes a full PC
 * service with a written report). Reply: {"ok":true} or {"ok":false,"error":"<code>"} - codes: method, bad request,
 * machine, name, phone, email, rate, busy, unavailable, send.
 *
 * STORES NOTHING about the person. The only write is the day's rate counter (pcm-mailmove-lib.php): 5 requests per
 * machine, 10 per caller IP (a daily hash, never the address) and 300 in all per UTC day, so the channel cannot be
 * flooded. A filled-in honeypot field ("website") gets {"ok":true} and nothing else happens.
 *
 * WEBHOOK: the #365-job-tracker Incoming Webhook in api/slack-webhook.php (server-only, gitignored, .htaccess-denied),
 * read by pattern exactly as slack-lead.php does. It is never printed. NO closing tag in this file.
 */
@ini_set('display_errors', '0');
error_reporting(0);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');

function mmh_out($a) { echo json_encode($a, JSON_UNESCAPED_SLASHES); exit; }
function mmh_fail($e) { mmh_out(array('ok' => false, 'error' => $e)); }

if (!isset($_SERVER['REQUEST_METHOD']) || $_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); mmh_fail('method'); }
// the app sends no Origin; a browser that does must be on our own site
$src = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : (isset($_SERVER['HTTP_REFERER']) ? $_SERVER['HTTP_REFERER'] : '');
if ($src !== '' && strpos($src, '365techies.co.uk') === false) { http_response_code(403); mmh_fail('bad request'); }

require __DIR__ . '/pcm-mailmove-lib.php';   // top-level scope on purpose (functions only)

$raw = (string)file_get_contents('php://input', false, null, 0, 16384);
$in = json_decode($raw, true);
if (!is_array($in) && $raw !== '' && !preg_match('//u', $raw)) $in = json_decode(mm_latin1_to_utf8($raw), true);
if (!is_array($in)) mmh_fail('bad request');

if (!empty($in['website'])) mmh_out(array('ok' => true));   // honeypot: a person never fills it

$f = array();
$f['machine'] = mm_machine(isset($in['machine']) ? $in['machine'] : '');
if ($f['machine'] === '') mmh_fail('machine');
$f['name'] = mm_clean(isset($in['name']) ? $in['name'] : '');
if ($f['name'] === '' || mm_len($f['name']) > 60) mmh_fail('name');
$f['phone'] = mm_uk_phone(isset($in['phone']) ? $in['phone'] : '');
if ($f['phone'] === '') mmh_fail('phone');
$f['email'] = strtolower(mm_clean(isset($in['email']) ? $in['email'] : ''));
if ($f['email'] !== '' && !mm_email_ok($f['email'])) mmh_fail('email');
$f['virgin'] = strtolower(mm_clean(isset($in['virgin']) ? $in['virgin'] : ''));
if ($f['virgin'] !== '' && !mm_email_ok($f['virgin'])) $f['virgin'] = '';   // read by the app, not typed: drop a bad one, keep the request
$f['count'] = (isset($in['count']) && is_numeric($in['count'])) ? max(0, min(10000000, (int)$in['count'])) : 0;
$f['mb']    = (isset($in['mb']) && is_numeric($in['mb'])) ? max(0.0, min(1000000.0, round((float)$in['mb'], 1))) : 0.0;
$f['phase'] = substr(preg_replace('/[^a-z_\-]/', '', strtolower(isset($in['phase']) && is_scalar($in['phase']) ? (string)$in['phase'] : '')), 0, 20);
$f['ver']   = (isset($in['ver']) && is_numeric($in['ver'])) ? max(0, min(999, (int)$in['ver'])) : 0;

$hook = mm_hook(__DIR__);
if ($hook === '') mmh_fail('unavailable');   // nowhere to send it: the app then says "ring us" instead

$rt = mm_rate_take(mm_rate_file(__DIR__), array(array('h:' . $f['machine'], 5), array('hi:' . mm_ip_key(), 10), array('hn', 300)));
if ($rt === 'busy') mmh_fail('busy');
if ($rt !== true) mmh_fail('rate');

mmh_out(mm_post_slack($hook, mm_help_card($f)) ? array('ok' => true) : array('ok' => false, 'error' => 'send'));
