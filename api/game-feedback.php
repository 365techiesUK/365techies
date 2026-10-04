<?php
/*
 * 365 Games: feedback and game requests (4 Oct 2026). The Feedback button in every game and "Request a game" on the
 * Games page (games/common/social.js) post here. Owner, 4 Oct: "each game is in development ... if they request a game
 * that they would like, then we could build what they like" - with the owner's picks: messages go to a #365-games
 * Slack channel; a built feature may credit the player's first name and town ONLY if they ticked the box; a player
 * who leaves an email and ticks "tell me" is emailed when it is ready (by hand, from the store - nothing automatic).
 *
 * Contract (as ai-lead.php): the message is DURABLY stored before the player sees "Thank you". Slack is posted
 * afterwards by the portal's own bot (pcm-slack-lib.php, token in the owner's pcm-slack-bot.php - never in this repo);
 * its result is written onto the record, and a Slack failure never loses the message.
 *
 * Input (JSON): kind feedback|request, game (a games.json id, or "games" for the Games page), mood love|ok|no|"",
 * text, name, town, email, credit (may mention name + town), notify (email me when it is ready), website (honeypot).
 * Needs a mood or some words (a request needs words). Email optional, checked when given.
 * Limits: 8 messages a day from one visitor (a scrambled daily code made from the internet address - the address
 * itself is never kept, and the codes are thrown away the next day) and 200 a day in all.
 * Kept 12 months (older records are dropped on every write) - the privacy policy says so.
 * NO closing tag in this file.
 */
error_reporting(0);
date_default_timezone_set('Europe/London');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$GF_CHANNEL = '#365-games';                    // the Slack channel (the portal's bot must be in it)
$GF_STORE   = __DIR__ . '/game-feedback.json';
$GF_RATE    = __DIR__ . '/game-feedback-rate.json';
$GF_LOCK    = __DIR__ . '/game-feedback.lock';
$GF_KEEP    = 365 * 86400;
$GF_MAX     = 5000;

function gf_out($code, $a) { http_response_code($code); echo json_encode($a); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') gf_out(405, array('ok' => false, 'error' => 'method'));

// soft same-site check (as slack-lead.php / ai-lead.php); a local test copy of the site is allowed too
$src = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : (isset($_SERVER['HTTP_REFERER']) ? $_SERVER['HTTP_REFERER'] : '');
if ($src !== '' && strpos($src, '365techies.co.uk') === false && !preg_match('#^https?://(localhost|127\.0\.0\.1)(:\d+)?(/|$)#', $src)) {
    gf_out(403, array('ok' => false, 'error' => 'origin'));
}

$raw = (string)file_get_contents('php://input', false, null, 0, 8192);
$in = json_decode($raw, true);
if (!is_array($in)) $in = $_POST;
if (!is_array($in)) gf_out(400, array('ok' => false, 'error' => 'bad-input'));

// honeypot: a real player never fills this hidden field - say thank you and keep nothing
if (trim((string)(isset($in['website']) ? $in['website'] : '')) !== '') gf_out(200, array('ok' => true));

function gf_clean($v, $max, $lines = false) {
    $v = trim(str_replace("\r", '', (string)$v));
    $v = preg_replace($lines ? '/[^\P{C}\n]/u' : '/\p{C}/u', '', $v);
    if ($lines) $v = preg_replace("/\n{3,}/", "\n\n", $v);
    return function_exists('mb_substr') ? mb_substr($v, 0, $max) : substr($v, 0, $max);
}

// the games, from the same list PC Manager and the Games page read
$games = array('games' => 'the Games page');
$gl = @json_decode((string)@file_get_contents(dirname(__DIR__) . '/games/games.json'), true);
if (is_array($gl) && isset($gl['games']) && is_array($gl['games'])) {
    foreach ($gl['games'] as $g) if (isset($g['id'], $g['title']) && preg_match('/^[a-z0-9-]{1,30}$/', $g['id'])) $games[$g['id']] = (string)$g['title'];
}

$kind  = (isset($in['kind']) && $in['kind'] === 'request') ? 'request' : 'feedback';
$game  = isset($in['game']) ? (string)$in['game'] : '';
if (!isset($games[$game])) gf_out(400, array('ok' => false, 'error' => 'game'));
$mood  = isset($in['mood']) && in_array($in['mood'], array('love', 'ok', 'no'), true) ? $in['mood'] : '';
$text  = gf_clean(isset($in['text']) ? $in['text'] : '', 1000, true);
$name  = gf_clean(isset($in['name']) ? $in['name'] : '', 40);
$town  = gf_clean(isset($in['town']) ? $in['town'] : '', 40);
$email = gf_clean(isset($in['email']) ? $in['email'] : '', 120);
if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) gf_out(400, array('ok' => false, 'error' => 'email'));
if ($kind === 'request' ? $text === '' : ($text === '' && $mood === '')) gf_out(400, array('ok' => false, 'error' => 'empty'));
$credit = !empty($in['credit']) && $name !== '';      // a credit needs a name to credit
$notify = !empty($in['notify']) && $email !== '';     // a "tell me" needs somewhere to tell

$lk = @fopen($GF_LOCK, 'c');
if ($lk) @flock($lk, LOCK_EX);

// ---- limits: per visitor per day, and in all per day
$day = date('Y-m-d');
$ip = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '';
$who = substr(hash('sha256', $ip . '|' . $day . '|365-games-feedback'), 0, 16);
$rate = @json_decode((string)@file_get_contents($GF_RATE), true);
if (!is_array($rate) || !isset($rate['day']) || $rate['day'] !== $day) $rate = array('day' => $day, 'all' => 0, 'v' => array());
$mine = isset($rate['v'][$who]) ? (int)$rate['v'][$who] : 0;
if ($mine >= 8 || (int)$rate['all'] >= 200) {
    if ($lk) { @flock($lk, LOCK_UN); @fclose($lk); }
    gf_out(429, array('ok' => false, 'error' => 'rate'));
}
$rate['v'][$who] = $mine + 1;
$rate['all'] = (int)$rate['all'] + 1;
@file_put_contents($GF_RATE, json_encode($rate), LOCK_EX);

// ---- store first
function gf_save($file, $all) {
    $tmp = $file . '.' . getmypid() . '.tmp';
    if (@file_put_contents($tmp, json_encode($all, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)) === false) return false;
    if (!@rename($tmp, $file)) { @unlink($file); if (!@rename($tmp, $file)) { @unlink($tmp); return false; } }   // Windows test copies cannot rename over
    return true;
}
$all = @json_decode((string)@file_get_contents($GF_STORE), true);
if (!is_array($all)) $all = array();
$cut = time() - $GF_KEEP;
$all = array_values(array_filter($all, function ($r) use ($cut) { return is_array($r) && isset($r['t']) && (int)$r['t'] >= $cut; }));
$rec = array(
    'id' => substr(bin2hex(random_bytes(6)), 0, 12), 't' => time(), 'at' => date('c'),
    'kind' => $kind, 'game' => $game, 'mood' => $mood, 'text' => $text,
    'name' => $name, 'town' => $town, 'email' => $email, 'credit' => $credit, 'notify' => $notify,
    'slack' => 'pending',
);
$all[] = $rec;
if (count($all) > $GF_MAX) $all = array_slice($all, -$GF_MAX);
$ok = gf_save($GF_STORE, $all);
if ($lk) { @flock($lk, LOCK_UN); @fclose($lk); }
if (!$ok) gf_out(500, array('ok' => false, 'error' => 'store'));

// the player is answered now; Slack happens after
echo json_encode(array('ok' => true));
if (function_exists('fastcgi_finish_request')) @fastcgi_finish_request();

// ---- tell the team in Slack
function gf_mrk($s) { return str_replace(array('&', '<', '>'), array('&amp;', '&lt;', '&gt;'), $s); }
function gf_text($r, $games) {   // one record as a Slack message
    $moods = array('love' => ':grinning: Love it', 'ok' => ':slightly_smiling_face: It\'s OK', 'no' => ':slightly_frowning_face: Not for me');
    $title = isset($games[$r['game']]) ? $games[$r['game']] : $r['game'];
    $head = $r['kind'] === 'request'
        ? ':video_game: *Game request*' . ($r['game'] !== 'games' ? ' (from ' . gf_mrk($title) . ')' : '')
        : ':video_game: *Feedback on ' . gf_mrk($title) . '*' . ($r['mood'] !== '' ? '  ' . $moods[$r['mood']] : '');
    $body = $r['text'] !== '' ? "\n>" . str_replace("\n", "\n>", gf_mrk($r['text'])) : '';
    $who = trim($r['name'] . ($r['name'] !== '' && $r['town'] !== '' ? ', ' : '') . $r['town']);
    return $head . $body . "\n" . ($who !== '' ? 'From ' . gf_mrk($who) : 'No name given')
        . ($r['credit'] ? ' · happy to be mentioned' : '')
        . ($r['email'] !== '' ? ' · ' . gf_mrk($r['email']) . ($r['notify'] ? ' (email them when it\'s ready)' : ' (wants a reply)') : ' · no email')
        . (isset($r['late']) ? "\n_(sent " . gf_mrk($r['late']) . ' - Slack could not take it then)_' : '');
}
$send = array($rec);
// anything that could not reach Slack earlier (the channel not made yet, Slack down) goes again now - up to three, from the last week
$all = @json_decode((string)@file_get_contents($GF_STORE), true);
if (is_array($all)) foreach ($all as $r) {
    if (count($send) >= 4) break;
    if (is_array($r) && $r['id'] !== $rec['id'] && isset($r['slack']) && $r['slack'] !== 'sent' && (int)$r['t'] > time() - 7 * 86400 && (int)$r['t'] < time() - 60) {
        $r['late'] = date('j M, H:i', (int)$r['t']); $send[] = $r;
    }
}
$done = array();
if (file_exists(__DIR__ . '/pcm-slack-lib.php')) require_once __DIR__ . '/pcm-slack-lib.php';
foreach ($send as $r) {
    $res = function_exists('slk_call')
        ? slk_call('chat.postMessage', array('channel' => $GF_CHANNEL, 'text' => gf_text($r, $games), 'unfurl_links' => false, 'unfurl_media' => false), 5)
        : array('ok' => false, 'error' => 'no_lib');
    $done[$r['id']] = !empty($res['ok']) ? 'sent' : ('failed: ' . (isset($res['error']) ? (string)$res['error'] : 'unknown'));
    if (empty($res['ok'])) break;   // Slack said no: the rest can wait for the next message
}

// write the Slack results onto the records (a second short write; the messages themselves are already safe)
$lk = @fopen($GF_LOCK, 'c');
if ($lk) @flock($lk, LOCK_EX);
$all = @json_decode((string)@file_get_contents($GF_STORE), true);
if (is_array($all)) {
    foreach ($all as $i => $r) if (is_array($r) && isset($r['id'], $done[$r['id']])) $all[$i]['slack'] = $done[$r['id']];
    gf_save($GF_STORE, $all);
}
if ($lk) { @flock($lk, LOCK_UN); @fclose($lk); }
