<?php
/*
 * 365 Games - "My code" (6 Oct 2026). Owner: carry Hall of Fame names, scores and streaks between phones or browsers -
 * picked "a 'My code' to type in" over a code sent by text or email: no sign-in, no email, no phone number.
 *
 * A player asks for a code (e.g. 7K3P-9QXA) and the games keep a copy of their progress under it: each game's scores,
 * settings and Journey stars, the daily streak, trophies, card backs, and their Hall of Fame player (initials, town and
 * the browser's own key - so the Hall of Fame knows them on the new phone). Typing the code on another phone, or in
 * Chrome after Samsung's browser, brings it all across. Never stored: anything about the person - no name, email,
 * phone number or address; the games in progress are left out.
 * The code IS the key: anyone who has it can copy or update that progress (it says so beside the code). A wrong code
 * gets nothing; guesses are limited per address (20 an hour), so a code can't be found by trying.
 *
 * Actions (POST JSON): new {data} -> {code};  save {code, data} -> {ok};  load {code} -> {data, at};  forget {code}.
 * Store: api/games-code-store/<CODE>.json (its own deny-all .htaccess; gitignored), kept 2 years from the last save.
 * NO closing tag in this file.
 */
error_reporting(0);
date_default_timezone_set('Europe/London');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');

$GC_DIR = __DIR__ . '/games-code-store';
$GC_MAX = 64 * 1024;            // one player's progress is a few KB; this is a ceiling, not a target
$GC_ABC = '3479ACDEFGHJKMNPQRTUVWXY';   // no 0/O, 1/I/L, 2/Z, 5/S, 6/B, 8 - easy to read back and type
// the games' own storage: every key under these prefixes travels, except a game in progress (:game)
$GC_KEYS = '/^(sol365|fc365|sp365|tp365|py365|he365|gr365|cr365|wh365|inv365|bb365|ecl365|coast365|cards365|games365):[a-z0-9:_-]{1,40}$|^hof365:player$/';

function gc_out($a, $code = 200) { http_response_code($code); echo json_encode($a); exit; }
function gc_norm($c) { $c = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', (string)$c)); return strlen($c) === 8 ? $c : ''; }
function gc_valid($c) { global $GC_ABC; return $c !== '' && strspn($c, $GC_ABC) === 8; }
function gc_path($c) { global $GC_DIR; return $GC_DIR . '/' . $c . '.json'; }
function gc_pretty($c) { return substr($c, 0, 4) . '-' . substr($c, 4, 4); }

// only the games' own keys, strings, within size - anything else is dropped
function gc_clean($data) {
    global $GC_KEYS, $GC_MAX;
    if (!is_array($data)) return null;
    $out = array(); $n = 0;
    foreach ($data as $k => $v) {
        if (!is_string($k) || !is_string($v) || !preg_match($GC_KEYS, $k) || substr($k, -5) === ':game') continue;
        $n += strlen($k) + strlen($v); if ($n > $GC_MAX) return null;
        $out[$k] = $v;
    }
    return $out;
}

// guesses and writes per address per hour (a small file, rewritten whole; old hours drop off)
function gc_rate($kind, $max) {
    global $GC_DIR;
    $ip = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '0';
    $f = $GC_DIR . '/rate.json'; $h = date('YmdH'); $key = $kind . '|' . hash('sha256', $ip . '|365games');
    $fp = @fopen($f, 'c+'); if (!$fp) return true;
    flock($fp, LOCK_EX);
    $r = json_decode(stream_get_contents($fp), true); if (!is_array($r) || !isset($r['h']) || $r['h'] !== $h) $r = array('h' => $h, 'n' => array());
    $n = isset($r['n'][$key]) ? $r['n'][$key] + 1 : 1; $r['n'][$key] = $n;
    ftruncate($fp, 0); rewind($fp); fwrite($fp, json_encode($r)); fflush($fp); flock($fp, LOCK_UN); fclose($fp);
    return $n <= $max;
}

function gc_write($c, $data) {
    $f = gc_path($c); $tmp = $f . '.' . getmypid() . '.tmp';
    if (@file_put_contents($tmp, json_encode(array('at' => time(), 'data' => $data))) === false) return false;
    return @rename($tmp, $f);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') gc_out(array('error' => 'post_only'), 405);
$in = json_decode(file_get_contents('php://input'), true);
if (!is_array($in)) gc_out(array('error' => 'bad_request'), 400);
if (!is_dir($GC_DIR)) { @mkdir($GC_DIR, 0755, true); }
if (!file_exists($GC_DIR . '/.htaccess')) @file_put_contents($GC_DIR . '/.htaccess', "# 365 Games - My code: players' saved progress. Never served directly; api/games-code.php reads it.\nRequire all denied\n");
$act = isset($in['action']) ? (string)$in['action'] : '';

if ($act === 'new') {
    if (!gc_rate('new', 10)) gc_out(array('error' => 'too_many'), 429);
    // now and then, codes not updated for two years go (the privacy policy promises it)
    if (random_int(1, 50) === 1) foreach ((array)glob($GC_DIR . '/*.json') as $old) { if (basename($old) !== 'rate.json' && filemtime($old) < time() - 2 * 365 * 86400) @unlink($old); }
    $data = gc_clean(isset($in['data']) ? $in['data'] : null);
    if ($data === null) gc_out(array('error' => 'too_big'), 413);
    for ($i = 0; $i < 20; $i++) {
        $c = ''; for ($j = 0; $j < 8; $j++) $c .= $GC_ABC[random_int(0, strlen($GC_ABC) - 1)];
        if (!file_exists(gc_path($c))) break;
    }
    if (!gc_write($c, $data)) gc_out(array('error' => 'store'), 500);
    gc_out(array('ok' => true, 'code' => gc_pretty($c)));
}
if ($act === 'save') {
    $c = gc_norm(isset($in['code']) ? $in['code'] : '');
    if (!gc_valid($c)) gc_out(array('error' => 'bad_code'), 400);
    if (!gc_rate('save', 120)) gc_out(array('error' => 'too_many'), 429);
    if (!file_exists(gc_path($c))) gc_out(array('error' => 'no_such_code'), 404);   // a save never makes a code
    $data = gc_clean(isset($in['data']) ? $in['data'] : null);
    if ($data === null) gc_out(array('error' => 'too_big'), 413);
    if (!gc_write($c, $data)) gc_out(array('error' => 'store'), 500);
    gc_out(array('ok' => true));
}
if ($act === 'load') {
    if (!gc_rate('load', 20)) gc_out(array('error' => 'too_many'), 429);
    $c = gc_norm(isset($in['code']) ? $in['code'] : '');
    if (!gc_valid($c) || !file_exists(gc_path($c))) gc_out(array('error' => 'no_such_code'), 404);
    $j = json_decode((string)@file_get_contents(gc_path($c)), true);
    if (!is_array($j) || !isset($j['data']) || !is_array($j['data'])) gc_out(array('error' => 'no_such_code'), 404);
    if (isset($j['at']) && time() - (int)$j['at'] > 2 * 365 * 86400) { @unlink(gc_path($c)); gc_out(array('error' => 'no_such_code'), 404); }
    gc_out(array('ok' => true, 'code' => gc_pretty($c), 'at' => (int)$j['at'], 'data' => $j['data']));
}
if ($act === 'forget') {   // "Stop using this code": the copy here goes
    if (!gc_rate('load', 20)) gc_out(array('error' => 'too_many'), 429);
    $c = gc_norm(isset($in['code']) ? $in['code'] : '');
    if (gc_valid($c) && file_exists(gc_path($c))) @unlink(gc_path($c));
    gc_out(array('ok' => true));
}
gc_out(array('error' => 'bad_request'), 400);
