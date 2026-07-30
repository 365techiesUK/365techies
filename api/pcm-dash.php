<?php
/**
 * 365 Dashboard Studio <-> customer portal bridge.
 *
 * The studio is a PLAYABLE DEMO that runs on sample data in the customer's
 * browser. The only thing that ever reaches this endpoint is the LAYOUT they
 * arranged - which tiles, in what order, how wide, on which property preset.
 * No readings, no telemetry, nothing from any real device: there is nothing
 * connected to read. Keeping it that way is what lets the portal call it a
 * demo honestly.
 *
 *  action=get  {wtoken, machine}         -> {ok, layout|null}
 *  action=save {wtoken, machine, layout} -> {ok}
 *  action=del  {wtoken, machine}         -> {ok}
 *
 * Auth mirrors pcm-wifi.php / pcm.php portal actions: wtoken -> websessions
 * (expiry + machine soft-binding). The layout is a few hundred bytes, so it
 * lives inline on the customer record in pcm-data.json rather than in its own
 * file - one saved layout per account, replaced on each save.
 *
 * Everything below is whitelist validation, not sanitising: a key that is not
 * in TILES is dropped, not escaped. The stored blob is re-rendered into the
 * portal on every visit, so an unknown value must never survive the round
 * trip (a stored-XSS class of bug the WiFi packs avoid by staying opaque).
 */
header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');

$DATA = __DIR__ . '/pcm-data.json';
$MAX_RAW = 20000;      // a layout is ~400 bytes; 20KB is a generous ceiling
$MAX_TILES = 16;

// Must match the catalogue in the portal's studio (build_extra.py, ovDash).
// Adding a tile there means adding its key here, or saves silently drop it.
$TILES = array(
    // read the customer's own account
    'pcs','backup','disk','secure','visit','reports','survey',
    // business plan only
    'fleet','patch','wifi','servers','sites','alerts','machine',
    // sample tiles - a build we quote for
    'cctv','energy','cost','broadband','freezer','leak','door','weather','heating','water','bilge',
    // trackers: where things are, and what they are doing
    'vehicle','fence','trip','ecu','assets','pet',
    // what GPS and the engine only know together
    'journey','fillup','charge','sitecost',
    // coast and sky - feeds we license, not the customer's kit
    'tide','sunset','uv','wind','storm','aurora');
$PROPS = array('home','business','boat','camper','holiday');

function out($a){ echo json_encode($a); exit; }
function db_lock($f){ $lk = @fopen($f . '.lock', 'c'); if ($lk) @flock($lk, LOCK_EX); return $lk; }
function load($f){
    if (!file_exists($f)) return array('customers'=>array());
    $raw = (string)@file_get_contents($f);
    if ($raw === '') return array('customers'=>array());
    $d = json_decode($raw, true);
    if (!is_array($d)) { http_response_code(503); exit(json_encode(array('ok'=>false,'error'=>'db_unavailable'))); }
    if (!isset($d['customers'])) $d['customers'] = array();
    return $d;
}
function save_db($f,$d){
    $tmp = $f . '.' . getmypid() . '.tmp';
    if (@file_put_contents($tmp, json_encode($d, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES), LOCK_EX) !== false) @rename($tmp, $f);
}
// caller must release the shared DB lock first - a slow webhook must never stall
// app check-ins / portal loads that queue on the same lock
function slack_note($text){
    $wh = __DIR__ . '/slack-webhook.php'; $SLACK_WEBHOOK = '';
    if (file_exists($wh)) { ob_start(); include $wh; ob_end_clean(); }
    if (empty($SLACK_WEBHOOK) && file_exists($wh)) {
        $rawWh = (string)@file_get_contents($wh);
        if (preg_match('#https://hooks\.slack\.com/\S+#', $rawWh, $mWh)) $SLACK_WEBHOOK = trim($mWh[0]);
    }
    if (empty($SLACK_WEBHOOK)) return;
    $ch = curl_init($SLACK_WEBHOOK);
    curl_setopt_array($ch, array(CURLOPT_POST=>true, CURLOPT_RETURNTRANSFER=>true, CURLOPT_CONNECTTIMEOUT=>3, CURLOPT_TIMEOUT=>6,
        CURLOPT_HTTPHEADER=>array('Content-Type: application/json'),
        CURLOPT_POSTFIELDS=>json_encode(array('text'=>$text))));
    curl_exec($ch); curl_close($ch);
}
function plain($s, $len){
    if (!is_scalar($s)) return '';          // a JSON array cast to string is a warning + "Array"
    $s = (string)preg_replace('/[\x00-\x1f\x7f<>&"\']/', ' ', (string)$s);
    if (!mb_check_encoding($s, 'UTF-8')) return '';
    return trim(mb_substr($s, 0, $len));
}

$raw = file_get_contents('php://input');
if (strlen($raw) > $MAX_RAW) out(array('ok'=>false,'error'=>'too_big'));
$in = json_decode($raw, true);
if (!is_array($in)) out(array('ok'=>false,'error'=>'bad_request'));

$action  = isset($in['action'])  ? preg_replace('/[^a-z]/','',$in['action']) : '';
$machine = isset($in['machine']) ? preg_replace('/[^a-f0-9]/','',substr((string)$in['machine'],0,32)) : '';
$wt      = isset($in['wtoken'])  ? preg_replace('/[^a-f0-9]/','',(string)$in['wtoken']) : '';
if ($wt === '') out(array('ok'=>false,'error'=>'expired'));

$db_lock = db_lock($DATA);
$db = load($DATA);

// session check - identical rules to pcm-wifi.php (read side: no ts slide, the
// portal's own overview call is what keeps the session alive)
$ws = isset($db['websessions'][$wt]) ? $db['websessions'][$wt] : null;
if ($ws) {
    if (!empty($ws['forever'])) { $slide = 31536000; $cap = PHP_INT_MAX; }
    else { $slide = !empty($ws['long']) ? 5184000 : 43200; $cap = !empty($ws['long']) ? 7776000 : 86400; }
    $fresh = intval($ws['ts'] ?? 0) > time() - $slide && ($cap === PHP_INT_MAX || intval($ws['iat'] ?? 0) > time() - $cap);
    if ($fresh && !empty($ws['machine']) && $ws['machine'] !== $machine) $fresh = false;
    if (!$fresh) $ws = null;
}
if (!$ws) out(array('ok'=>false,'error'=>'expired'));
$key = (string)$ws['key'];
if ($key === '' || !isset($db['customers'][$key])) out(array('ok'=>false,'error'=>'unknown_key'));
$c =& $db['customers'][$key];

// A company team member gets their OWN saved layout, stored on their member
// record. Without this, the first employee to press save would overwrite the
// director's dashboard - and then wonder why theirs kept changing.
$member = isset($ws['member']) ? strtolower((string)$ws['member']) : '';
if ($member !== '') {
    if (!isset($c['org']['members'][$member])) out(array('ok'=>false,'error'=>'not_a_member'));
    $slot =& $c['org']['members'][$member];
} else {
    $slot =& $c;
}

if ($action === 'get') {
    $l = isset($slot['dash']) && is_array($slot['dash']) ? $slot['dash'] : null;
    out(array('ok'=>true, 'layout'=>$l));
}

if ($action === 'save') {
    $l = isset($in['layout']) && is_array($in['layout']) ? $in['layout'] : null;
    if (!$l) out(array('ok'=>false,'error'=>'bad_layout'));

    // one save per 3s per account: a scripted loop must not hold the shared DB
    // lock hot behind app check-ins and portal loads
    $prev = isset($slot['dash']) && is_array($slot['dash']) ? $slot['dash'] : null;
    if ($prev && intval($prev['t'] ?? 0) > time() - 3) out(array('ok'=>false,'error'=>'slow_down'));

    $prop = isset($l['prop']) ? (string)$l['prop'] : 'home';
    if (!in_array($prop, $PROPS, true)) $prop = 'home';

    // the name is the one free-text field: strip markup characters and control
    // codes outright rather than escaping, so what comes back out is always
    // plain text whatever renders it
    $name = isset($l['name']) ? (string)$l['name'] : '';
    // no /u modifier on purpose: on invalid UTF-8 a unicode pattern returns null,
    // and a null flowing into mb_substr is a deprecation + a lost name. Byte-wise
    // stripping of the same characters is safe here because every one of them is
    // ASCII and so cannot appear inside a multi-byte sequence.
    $name = (string)preg_replace('/[\x00-\x1f\x7f<>&"\']/', '', $name);
    if (!mb_check_encoding($name, 'UTF-8')) $name = '';
    $name = trim(mb_substr($name, 0, 40));
    if ($name === '') $name = 'My dashboard';

    $tiles = array(); $seen = array();
    $rawTiles = isset($l['tiles']) && is_array($l['tiles']) ? $l['tiles'] : array();
    foreach ($rawTiles as $t) {
        if (count($tiles) >= $MAX_TILES) break;
        if (!is_array($t)) continue;
        $k = isset($t['k']) ? (string)$t['k'] : '';
        if (!in_array($k, $TILES, true) || isset($seen[$k])) continue;   // no duplicates
        $seen[$k] = 1;
        $w = intval($t['w'] ?? 1);
        $tiles[] = array('k'=>$k, 'w'=>($w === 2 ? 2 : 1));
    }
    if (!count($tiles)) out(array('ok'=>false,'error'=>'empty_layout'));

    $slot['dash'] = array('v'=>1, 'prop'=>$prop, 'name'=>$name, 'tiles'=>$tiles, 't'=>time());
    save_db($DATA, $db);
    // Deliberately no Slack ping. A customer moving tiles around a demo is not an
    // event anyone needs told about, and a notification per drag would be noise.
    out(array('ok'=>true, 'layout'=>$slot['dash']));
}

if ($action === 'del') {
    if (isset($slot['dash'])) { unset($slot['dash']); save_db($DATA, $db); }
    out(array('ok'=>true));
}

// "Can we make this one live?" / "quote for this design". A named, specific job in
// front of the team beats a vague enquiry - and it is the only honest way to answer
// a sample tile, because making it real needs someone to check what the equipment
// actually publishes before anyone quotes a price.
if ($action === 'quote') {
    // 5s, not longer: asking about two tiles in quick succession is a customer using
    // the thing properly, and being told to wait for that would be daft. This exists
    // only to stop a scripted loop holding the shared DB lock hot.
    $last = intval($slot['dash_ask_t'] ?? 0);
    if ($last > time() - 5) out(array('ok'=>false,'error'=>'slow_down'));

    $prop = isset($in['prop']) ? (string)$in['prop'] : 'home';
    if (!in_array($prop, $PROPS, true)) $prop = 'home';
    $one = isset($in['one']) ? (string)$in['one'] : '';
    if (!in_array($one, $TILES, true)) $one = '';
    $note = plain($in['note'] ?? '', 120);

    $want = array();
    foreach ((isset($in['tiles']) && is_array($in['tiles']) ? $in['tiles'] : array()) as $t) {
        if (count($want) >= 30) break;
        if (!is_string($t)) continue;
        if (in_array($t, $TILES, true) && !in_array($t, $want, true)) $want[] = $t;
    }
    if (!count($want)) out(array('ok'=>false,'error'=>'empty'));

    $slot['dash_ask_t'] = time();
    $asks = isset($slot['dash_asks']) && is_array($slot['dash_asks']) ? $slot['dash_asks'] : array();
    $asks[] = array('t'=>time(), 'prop'=>$prop, 'one'=>$one, 'tiles'=>$want, 'note'=>$note);
    while (count($asks) > 10) array_shift($asks);
    $slot['dash_asks'] = $asks;
    save_db($DATA, $db);

    // release the shared lock BEFORE the webhook
    if ($db_lock) { @flock($db_lock, LOCK_UN); @fclose($db_lock); $db_lock = null; }
    $nm = plain($c['name'] ?? '', 60);
    $em = plain($c['email'] ?? '', 80);
    $msg = $one !== ''
        ? ":satellite: *Dashboard tile request* - *".$nm."* asked whether we can make the *".$one."* tile live on their own kit."
        : ":art: *Custom dashboard design* - *".$nm."* designed a ".$prop." dashboard and asked for a quote: ".implode(', ', $want).".";
    if ($em !== '') $msg .= "\n".$em;
    if ($note !== '') $msg .= "\nThey added: \"".$note."\"";
    $msg .= "\nRemember: check what their equipment actually publishes before quoting.";
    slack_note($msg);
    out(array('ok'=>true));
}

out(array('ok'=>false,'error'=>'bad_action'));
