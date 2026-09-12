<?php
/**
 * Ships and ferries — test suite.   Run:  php api/dorset-ships-test.php
 * Pins: the aisstream envelope merge (position, class B, static data, names padded with '@',
 * out-of-box positions ignored), the recent-path thinning, the 30-minute prune, every health
 * status the map's layer knows, the payload shape, and the websocket frame codec including
 * the 126 and 127 length forms, masking, ping and close frames.
 */
if (PHP_SAPI !== 'cli') { http_response_code(403); exit('cli only'); }
require __DIR__ . '/dorset-ships-lib.php';
$fails = 0;
function ok($cond, $what, $detail = '') { global $fails; echo ($cond ? '  PASS  ' : '  FAIL  ') . $what . ($cond || $detail === '' ? '' : '   [' . $detail . ']') . "\n"; if (!$cond) $fails++; }

$T0 = 1789200000000; // a fixed "now" in ms
function env_pos($mmsi, $lat, $lon, $extra = array(), $meta = array(), $type = 'PositionReport') {
    return array('MessageType' => $type,
        'MetaData' => array_merge(array('MMSI' => $mmsi, 'ShipName' => 'BARFLEUR       ', 'latitude' => $lat, 'longitude' => $lon,
                                        'time_utc' => '2026-09-12 19:20:33.123456789 +0000 UTC'), $meta),
        'Message' => array($type => array_merge(array('UserID' => $mmsi, 'Sog' => 18.2, 'Cog' => 171.4, 'TrueHeading' => 170, 'NavigationalStatus' => 0), $extra)));
}

echo "-- merging\n";
$s = ships_empty_store();
ok(ships_apply($s, env_pos(232003456, 50.65, -1.95), $T0), 'a position report is recognised');
$r = $s['vessels']['232003456'];
ok($r['name'] === 'BARFLEUR' && $r['lat'] === 50.65 && $r['lon'] === -1.95 && $r['speed'] === 18.2 && $r['course'] === 171.4 && $r['heading'] === 170.0,
   'row carries name (trimmed), position, speed, course, heading', json_encode($r));
ok($r['last_position_UTC'] === '2026-09-12T19:20:33Z' && $r['last_position_epoch'] === strtotime('2026-09-12T19:20:33Z'), 'aisstream time_utc parsed to ISO and epoch', $r['last_position_UTC']);
ok($r['type'] === '' && $r['type_specific'] === '' && $r['mmsi'] === '232003456', 'no type until static data arrives');
ok(ships_apply($s, array('MessageType' => 'ShipStaticData', 'MetaData' => array('MMSI' => 232003456, 'ShipName' => 'BARFLEUR@@@@'),
   'Message' => array('ShipStaticData' => array('Type' => 60, 'Destination' => 'CHERBOURG', 'ImoNumber' => 9007130))), $T0 + 1000), 'static data is recognised');
$r = $s['vessels']['232003456'];
ok($r['type'] === '60' && $r['type_specific'] === 'Passenger' && $r['destination'] === 'CHERBOURG' && $r['imo'] === '9007130', 'static data merged into the live row', json_encode($r));
ok(isset($s['static']['232003456']) && $s['static']['232003456']['name'] === 'BARFLEUR', "'@' padding stripped from the static name");
ok(ships_apply($s, env_pos(999000001, 50.70, -1.90, array(), array('ShipName' => ''), 'StandardClassBPositionReport'), $T0 + 2000), 'class B report recognised');
ok($s['vessels']['999000001']['name'] === 'MMSI 999000001', 'nameless vessel gets its MMSI as a name');
ok(ships_apply($s, env_pos(111111111, 55.0, 5.0), $T0 + 3000) && !isset($s['vessels']['111111111']), 'a position outside the Dorset box is liveness but not a row');
ok(!ships_apply($s, array('foo' => 'bar'), $T0) && !ships_apply($s, array('MessageType' => 'PositionReport', 'MetaData' => array('MMSI' => 'abc')), $T0), 'junk envelopes are not liveness');
ok(ships_apply($s, array('MessageType' => 'PositionReport', 'MetaData' => array('MMSI' => 232003456), 'Message' => array('PositionReport' => array('UserID' => 232003456))), $T0 + 4000)
   && $s['vessels']['232003456']['lat'] === 50.65, 'a positionless report counts as liveness and leaves the row alone');
ok(ships_type_word(70) === 'Cargo' && ships_type_word(36) === 'Sailing' && ships_type_word(51) === 'Search and rescue' && ships_type_word('') === '' && ships_type_word(95) === 'Other', 'type words');
ok(ships_heading(511) === null && ships_heading(0) === 0.0 && ships_heading(360) === 360.0, 'heading 511 (not available) is null');

echo "-- tracks\n";
$s = ships_empty_store();
$e = strtotime('2026-09-12T19:20:33Z');
ships_apply($s, env_pos(100001, 50.65, -1.95), $T0);
ok(!isset($s['tracks']['100001']) && isset($s['pending']['100001']), 'first fix is held pending');
ships_apply($s, env_pos(100001, 50.6501, -1.95, array(), array('time_utc' => '2026-09-12 19:20:40 +0000 UTC')), $T0 + 7000);
ok(!isset($s['tracks']['100001']), 'a fix 7 s and 11 m later does not start a track');
ships_apply($s, env_pos(100001, 50.655, -1.95, array(), array('time_utc' => '2026-09-12 19:21:33 +0000 UTC')), $T0 + 60000);
ok(isset($s['tracks']['100001']) && count($s['tracks']['100001']) === 2 && !isset($s['pending']['100001']), 'a fix 60 s and 550 m later starts a two-sample track');
for ($i = 0; $i < 80; $i++) ships_apply($s, env_pos(100001, 50.66 + $i * 0.001, -1.95, array(), array('time_utc' => gmdate('Y-m-d H:i:s', $e + 120 + $i * 40) . ' +0000 UTC')), $T0 + 120000 + $i * 40000);
ok(count($s['tracks']['100001']) === SHIPS_TRACK_SAMPLES, 'track ring capped at ' . SHIPS_TRACK_SAMPLES, (string)count($s['tracks']['100001']));
$tr = ships_track($s, '100001');
ok(count($tr) === SHIPS_TRACK_SAMPLES && isset($tr[0]['lat'], $tr[0]['lon'], $tr[0]['t']) && $tr[63]['t'] > $tr[0]['t'], 'track samples are {lat, lon, t}, oldest first');

echo "-- prune and rows\n";
$s = ships_empty_store();
ships_apply($s, env_pos(100001, 50.65, -1.95), $T0);
ships_apply($s, env_pos(100002, 50.66, -1.90), $T0 + 29 * 60000);
ships_apply($s, env_pos(100003, 50.67, -1.85), $T0 + 31 * 60000);
$rows = ships_rows($s, 100, $T0 + 31 * 60000);
ok(count($rows) === 2 && $rows[0]['mmsi'] === '100003' && $rows[1]['mmsi'] === '100002' && !isset($rows[0]['_updatedAt']), 'rows: newest first, 30-minute window, no _updatedAt', json_encode(array_map(function ($r) { return $r['mmsi']; }, $rows)));
ships_prune($s, $T0 + 31 * 60000);
ok(!isset($s['vessels']['100001']) && isset($s['vessels']['100002']) && isset($s['vessels']['100003']), 'prune drops the vessel older than 30 minutes');
ok(count(ships_rows($s, 1, $T0 + 31 * 60000)) === 1, 'maxRows honoured');

echo "-- health\n";
$s = ships_empty_store();
ok(ships_status($s, $T0, false)['status'] === 'missing-key', 'no key -> missing-key');
ok(ships_status($s, $T0, true)['status'] === 'idle', 'key but never polled -> idle');
$s['poll']['lastPollAt'] = $T0 - 30000; $s['poll']['lastMessageAt'] = $T0 - 40000;
ok(ships_status($s, $T0, true)['status'] === 'live', 'polled 30 s ago with a message 40 s ago -> live');
$s['poll']['lastMessageAt'] = $T0 - 4 * 60000;
$h = ships_status($s, $T0, true);
ok($h['status'] === 'stale' && $h['silentForMs'] === 4 * 60000, 'no message for 4 min -> stale with silentForMs', json_encode($h));
$s['poll']['lastPollAt'] = $T0 - 6 * 60000; $s['poll']['failures'] = 3;
$h = ships_status($s, $T0, true);
ok($h['status'] === 'down' && $h['reconnectAttempt'] === 3 && strpos($h['error'], 'poller has not run') === 0, 'no poll for 6 min -> down', json_encode($h));
$s['poll']['authFailed'] = true;
ok(ships_status($s, $T0, true)['status'] === 'auth-failed', 'rejected key -> auth-failed');

echo "-- payload shape\n";
$s = ships_empty_store(); ships_apply($s, env_pos(232003456, 50.65, -1.95), $T0); $s['poll']['lastPollAt'] = $T0; $s['poll']['lastMessageAt'] = $T0;
$p = ships_payload($s, 900, $T0 + 1000, true);
foreach (array('rows', 'source', 'coverage', 'generated', 'status', 'error', 'refreshing', 'newestPositionAt', 'lastMessageAt', 'silentForMs', 'reconnectAttempt', 'nextAttemptAt', 'staleAfterMs', 'watchdog', 'count') as $k) {
    if (!array_key_exists($k, $p)) { ok(false, 'payload field ' . $k); }
}
ok($p['status'] === 'live' && $p['refreshing'] === false && $p['count'] === 1 && $p['newestPositionAt'] === '2026-09-12T19:20:33Z' && $p['source'] === 'AISStream', 'live payload', json_encode($p));
$p2 = ships_payload($s, 900, $T0 + 1000, false);
ok($p2['status'] === 'missing-key' && $p2['refreshing'] === true && count($p2['rows']) === 1, 'missing-key payload still carries the cached rows, honestly labelled');
ok(json_encode($p) !== false, 'payload encodes as JSON');

echo "-- websocket frames\n";
function frames_stream($bytes) { $fp = fopen('php://memory', 'w+'); fwrite($fp, $bytes); rewind($fp); return $fp; }
$dl = microtime(true) + 5;
foreach (array(5, 300, 70000) as $n) {
    $payload = str_repeat('x', $n);
    $fp = frames_stream(ships_ws_frame(1, $payload));
    $f = ships_ws_read($fp, $dl);
    ok($f !== null && $f[0] === 1 && $f[2] === true && $f[1] === $payload, 'masked text frame round-trips at length ' . $n, $f === null ? 'null' : (string)strlen($f[1]));
}
$fp = frames_stream(chr(0x81) . chr(3) . 'abc' . chr(0x89) . chr(0) . chr(0x88) . chr(2) . pack('n', 1000));
$a = ships_ws_read($fp, $dl); $b = ships_ws_read($fp, $dl); $c = ships_ws_read($fp, $dl); $d = ships_ws_read($fp, $dl);
ok($a[0] === 1 && $a[1] === 'abc' && $b[0] === 9 && $c[0] === 8 && unpack('n', $c[1])[1] === 1000 && $d === null, 'unmasked server frames: text, ping, close, then EOF');
$sub = json_decode(json_encode(array('APIKey' => 'k', 'BoundingBoxes' => array(array(array(SHIPS_S, SHIPS_W), array(SHIPS_N, SHIPS_E))))), true);
ok($sub['BoundingBoxes'][0][0][0] === SHIPS_S && $sub['BoundingBoxes'][0][0][1] === SHIPS_W, 'subscription box is [lat, lon] pairs, south-west then north-east');

echo "\n" . ($fails ? $fails . ' FAILED' : 'all passed') . "\n";
exit($fails ? 1 : 0);
