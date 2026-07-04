<?php
/*
 * REALTIME Victron VRM bridge (MQTT -> Server-Sent Events) for the 365 Crafter dashboards.
 *
 * Connects server-side to Victron's VRM MQTT broker farm (the same realtime stream the
 * official apps use), subscribes to a small whitelist of hot values (SOC, volts, amps,
 * battery W, solar W, DC load, time-to-go, MPPT stage/panel volts, engine-charger input)
 * and streams them to the browser as SSE — per-second liveness.
 *
 * SECURITY: credentials never leave the server. Requires api/vrm-token.php (NOT in git):
 *     <?php $VRM_TOKEN = '...'; $VRM_EMAIL = 'you@example.com';
 * TLS to the broker is pinned to Victron's own CA (api/venus-ca.crt, public).
 *
 * Each connection runs for up to ~50s then closes; the browser's EventSource reconnects
 * automatically. ?probe=1 returns one-shot JSON diagnostics instead of a stream.
 */
error_reporting(0);
@ini_set('serialize_precision', '-1');   // clean float output (78.6, not 78.5999999...)
ignore_user_abort(false);
@set_time_limit(75);

if (isset($_GET['probe'])) {   // debug mode: surface fatals as JSON so failures are diagnosable remotely
    error_reporting(E_ALL);
    @ini_set('display_errors', '1');
    set_exception_handler(function ($e) { echo json_encode(['ok' => false, 'fatal' => $e->getMessage() . ' @line ' . $e->getLine()]); exit; });
    register_shutdown_function(function () {
        $e = error_get_last();
        if ($e && in_array($e['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
            echo json_encode(['ok' => false, 'fatal' => $e['message'] . ' @line ' . $e['line']]);
        }
    });
}

$PORTAL = 'c0619ab63a61';
$TOKENF = __DIR__ . '/vrm-token.php';
$CAF    = __DIR__ . '/venus-ca.crt';
$PROBE  = isset($_GET['probe']);
$RUNSEC = 50;

/* broker index = sum of portal-id char codes mod 128 */
$idx = 0;
foreach (str_split(strtolower($PORTAL)) as $ch) $idx += ord($ch);
$HOST = 'mqtt' . ($idx % 128) . '.victronenergy.com';

function out_json($arr) { header('Content-Type: application/json'); echo json_encode($arr); exit; }

if (!is_file($TOKENF)) { out_json(['ok' => false, 'error' => 'not-configured']); }
/* Extract credentials by pattern rather than executing the file — immune to formatting mistakes */
$cfgsrc = (string)@file_get_contents($TOKENF);
$VRM_TOKEN = preg_match('/\$VRM_TOKEN\s*=\s*[\'"]([^\'"]+)[\'"]/', $cfgsrc, $mm) ? $mm[1] : '';
$VRM_EMAIL = preg_match('/\$VRM_EMAIL\s*=\s*[\'"]([^\'"]+)[\'"]/', $cfgsrc, $mm) ? $mm[1] : '';
if ($VRM_TOKEN === '') { out_json(['ok' => false, 'error' => 'not-configured']); }
if ($VRM_EMAIL === '') { out_json(['ok' => false, 'error' => 'no-email']); }

/* ---------------- minimal MQTT 3.1.1 ---------------- */
function mq_str($s) { return pack('n', strlen($s)) . $s; }
function mq_remlen($n) { $o = ''; do { $d = $n % 128; $n = intdiv($n, 128); if ($n > 0) $d |= 0x80; $o .= chr($d); } while ($n > 0); return $o; }
function mq_connect($cid, $user, $pass) {
    $vh = mq_str('MQTT') . chr(4) . chr(0xC2) . pack('n', 60);           // user+pass+clean, keepalive 60
    $pl = mq_str($cid) . mq_str($user) . mq_str($pass);
    return chr(0x10) . mq_remlen(strlen($vh . $pl)) . $vh . $pl;
}
function mq_subscribe($topics) {
    $pl = pack('n', 1);
    foreach ($topics as $t) $pl .= mq_str($t) . chr(0);
    return chr(0x82) . mq_remlen(strlen($pl)) . $pl;
}
function mq_publish($topic, $msg) { $pl = mq_str($topic) . $msg; return chr(0x30) . mq_remlen(strlen($pl)) . $pl; }

$diag = ['broker' => $HOST, 'tls' => null, 'connack' => null, 'firstMsgMs' => null, 'msgs' => 0];

$ctx = stream_context_create(['ssl' => [
    'cafile' => $CAF, 'verify_peer' => true, 'verify_peer_name' => true, 'SNI_enabled' => true,
]]);
$fp = @stream_socket_client('tls://' . $HOST . ':8883', $errno, $errstr, 12, STREAM_CLIENT_CONNECT, $ctx);
if (!$fp) {
    $diag['tls'] = 'fail: ' . $errno . ' ' . $errstr;
    if ($PROBE) out_json(['ok' => false, 'diag' => $diag]);
    out_json(['ok' => false, 'error' => 'mqtt-unreachable']);
}
$diag['tls'] = 'ok';
stream_set_blocking($fp, true);
stream_set_timeout($fp, 0, 250000); // 250ms read slices

$cid = 'tt365-' . substr(md5(uniqid('', true)), 0, 8);
fwrite($fp, mq_connect($cid, $VRM_EMAIL, 'Token ' . $VRM_TOKEN));

/* buffered packet reader */
$buf = '';
function mq_read(&$buf, $fp) {
    // returns [type, payload] or null if no complete packet yet
    while (true) {
        $len = strlen($buf);
        if ($len >= 2) {
            $rem = 0; $mult = 1; $pos = 1; $okLen = false;
            while ($pos < min(5, $len)) {
                $d = ord($buf[$pos]);
                $rem += ($d & 0x7F) * $mult;
                $mult *= 128; $pos++;
                if (($d & 0x80) === 0) { $okLen = true; break; }
            }
            if ($okLen && $len >= $pos + $rem) {
                $type = ord($buf[0]) >> 4;
                $pl = substr($buf, $pos, $rem);
                $buf = substr($buf, $pos + $rem);
                return [$type, $pl];
            }
        }
        $chunk = fread($fp, 8192);
        if ($chunk === false || $chunk === '') return null;
        $buf .= $chunk;
    }
}

/* wait for CONNACK (type 2) */
$deadline = microtime(true) + 8;
$connected = false;
while (microtime(true) < $deadline) {
    $p = mq_read($buf, $fp);
    if ($p === null) continue;
    if ($p[0] === 2) { $diag['connack'] = ord(substr($p[1], 1, 1)); $connected = ($diag['connack'] === 0); break; }
}
if (!$connected) {
    fclose($fp);
    if ($PROBE) out_json(['ok' => false, 'diag' => $diag]);
    out_json(['ok' => false, 'error' => 'mqtt-auth']);
}

/* subscribe hot topics + kick the device awake */
$N = 'N/' . $PORTAL . '/';
$TOPICS = [
    $N . 'system/0/Dc/Battery/Soc'      => 'soc',
    $N . 'system/0/Dc/Battery/Voltage'  => 'battV',
    $N . 'system/0/Dc/Battery/Current'  => 'battA',
    $N . 'system/0/Dc/Battery/Power'    => 'battW',
    $N . 'system/0/Dc/Pv/Power'         => 'pvW',
    /* verified live on this system 2026-07-04 (instances hardcoded for our own van) */
    $N . 'system/0/Dc/System/Power'     => 'dcW',       // real DC load — per-second, like the official app
    $N . 'system/0/Dc/Battery/TimeToGo' => 'ttgS',      // seconds; 864000 = the 10-day cap
    $N . 'solarcharger/277/State'       => 'mpptState', // 3=Bulk 4=Absorption 5=Float
    $N . 'solarcharger/277/Pv/V'        => 'pvV',       // panel volts
    $N . 'alternator/279/Dc/In/P'       => 'orionInW',  // engine charge power (Orion XS input)
    $N . 'alternator/279/Dc/In/V'       => 'orionInV',  // starter battery volts
    /* both null until a probe is wired in — the dashboard shows "no sensor yet" until then */
    $N . 'temperature/24/Temperature'   => 'battT',     // Cerbo Temperature Input 1 (configured type: Battery)
    $N . 'battery/279/Dc/0/Temperature' => 'battT',     // SmartShunt aux alternative
];
fwrite($fp, mq_subscribe(array_keys($TOPICS)));
fwrite($fp, mq_publish('R/' . $PORTAL . '/keepalive', ''));

if (!$PROBE) {
    header('Content-Type: text/event-stream; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Accel-Buffering: no');
    @ini_set('zlib.output_compression', '0');
    while (ob_get_level() > 0) @ob_end_flush();
    echo 'retry: 2000' . "\n";
    echo ':' . str_repeat(' ', 2048) . "\n\n";   // defeat proxy buffering
    @flush();
}

$vals = []; $dirty = false; $t0 = microtime(true); $first = null;
$lastKa = $t0; $lastPing = $t0; $lastEmit = 0;
$roundmap = ['soc' => 1, 'battV' => 2, 'battA' => 1, 'battW' => 1, 'pvW' => 0,
             'dcW' => 0, 'ttgS' => 0, 'mpptState' => 0, 'pvV' => 1, 'orionInW' => 0, 'orionInV' => 2, 'battT' => 1];

while (true) {
    $now = microtime(true);
    if ($now - $t0 > ($PROBE ? 6 : $RUNSEC)) break;
    if (connection_aborted()) break;

    $p = mq_read($buf, $fp);
    if ($p !== null && $p[0] === 3) { // PUBLISH (QoS0)
        $tl = unpack('n', substr($p[1], 0, 2))[1];
        $topic = substr($p[1], 2, $tl);
        $payload = substr($p[1], 2 + $tl);
        if (isset($TOPICS[$topic])) {
            $j = json_decode($payload, true);
            if (is_array($j) && array_key_exists('value', $j)) {
                $key = $TOPICS[$topic];
                $v = null;
                if ($j['value'] !== null) $v = round((float)$j['value'], $roundmap[$key]);
                elseif ($key === 'ttgS') $v = -1;   // Venus publishes null TTG while charging = infinite; -1 sentinel
                if ($v !== null) {
                    if (!isset($vals[$key]) || $vals[$key] !== $v) { $vals[$key] = $v; $dirty = true; }
                    $diag['msgs']++;
                    if ($first === null) { $first = $now; $diag['firstMsgMs'] = (int)round(($now - $t0) * 1000); }
                }
            }
        }
    }

    if ($now - $lastKa > 15) { fwrite($fp, mq_publish('R/' . $PORTAL . '/keepalive', '')); $lastKa = $now; }
    if ($now - $lastPing > 20) { fwrite($fp, chr(0xC0) . chr(0)); $lastPing = $now; }

    if (!$PROBE && $dirty && ($now - $lastEmit) > 0.4) {
        $vals['live'] = 1;
        echo 'data: ' . json_encode($vals) . "\n\n";
        @flush();
        $dirty = false; $lastEmit = $now;
    }
    if (!$PROBE && ($now - $lastEmit) > 10) { echo ": hb\n\n"; @flush(); $lastEmit = $now; }
}
fclose($fp);
if ($PROBE) out_json(['ok' => ($diag['msgs'] > 0), 'diag' => $diag, 'vals' => $vals]);
