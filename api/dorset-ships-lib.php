<?php
/*
 * Ships and ferries for the Bournemouth365 live map — the shared half.
 *
 * Two files use this and nothing else should:
 *   dorset-ships-poll.php  the CRON job. Connects to AISStream's websocket for
 *                          about a minute, folds every position report into the
 *                          snapshot store, and exits. PHP on shared hosting
 *                          cannot hold a socket open, so "live" here means a
 *                          fresh snapshot every minute, honestly labelled.
 *   dorset-ships.php       the PUBLIC endpoint. Reads the snapshot and answers
 *                          in exactly the shape the map's vessel layer already
 *                          understands (its dev server speaks the same JSON).
 *
 * Data: AIS position reports relayed by aisstream.io. AIS is broadcast in the
 * clear by ferries, cargo ships, tankers, fishing boats over 15 m and any yacht
 * that fits a transponder. Nothing without a transponder exists in this feed,
 * and the feed is not a picture of everything at sea.
 *
 * The store is api/dorset-ships-cache.json: denied by .htaccess (the
 * dorset-*-cache.json rule) and gitignored. It holds the last 30 minutes of
 * vessels, their static data (name, type, destination), a short recent-path
 * ring per vessel for the selected-vessel trail, and the poller's own health.
 *
 * Include-only: never a URL (.htaccess denies it). NO closing tag.
 */
if (!defined('DORSET_SHIPS_LIB')) {
    define('DORSET_SHIPS_LIB', 1);

    // west, south, east, north: Portland Bill to Selsey, the Cotentin to the New Forest.
    define('SHIPS_W', -2.65);
    define('SHIPS_S', 49.65);
    define('SHIPS_E', -0.80);
    define('SHIPS_N', 51.00);
    define('SHIPS_STALE_MS', 30 * 60 * 1000);   // a vessel silent this long leaves the snapshot (dev-proxy parity)
    define('SHIPS_SILENCE_MS', 180 * 1000);     // no AIS message for this long reads as 'stale'
    define('SHIPS_POLL_DEAD_MS', 5 * 60 * 1000); // no poll for this long reads as 'down' (the cron is not running)
    define('SHIPS_TRACK_SAMPLES', 64);
    define('SHIPS_TRACK_MIN_GAP_SEC', 30);
    define('SHIPS_TRACK_MIN_MOVE_M', 25);
    define('SHIPS_SOURCE', 'AISStream');
    define('SHIPS_COVERAGE', 'Poole Bay, the Solent and the Channel crossings to the Cotentin');
    define('SHIPS_WS_HOST', 'stream.aisstream.io');
    define('SHIPS_WS_PATH', '/v0/stream');

    function ships_message_types() {
        return array('PositionReport', 'StandardClassBPositionReport', 'ExtendedClassBPositionReport', 'ShipStaticData', 'StaticDataReport');
    }

    /* ------------------------------------------------------------------ store */

    function ships_store_path() { return __DIR__ . '/dorset-ships-cache.json'; }

    function ships_empty_store() {
        return array(
            'v' => 1,
            'vessels' => array(),   // mmsi => row (+ _updatedAt ms)
            'static'  => array(),   // mmsi => name/type/destination/imo from static reports
            'tracks'  => array(),   // mmsi => list of [lat, lon, epochSec], newest last, capped
            'pending' => array(),   // mmsi => first fix, held until a second distinct fix arrives
            'poll'    => array('lastPollAt' => null, 'lastMessageAt' => null, 'failures' => 0,
                               'lastError' => null, 'lastStatus' => null, 'nextAttemptAt' => null, 'authFailed' => false),
        );
    }

    function ships_load_store() {
        $f = ships_store_path();
        if (!is_file($f)) return null;
        $j = json_decode(@file_get_contents($f), true);
        return (is_array($j) && isset($j['vessels']) && is_array($j['vessels'])) ? $j : null;
    }

    function ships_save_store($store) {
        $f = ships_store_path();
        $tmp = $f . '.' . getmypid() . '.tmp';
        if (@file_put_contents($tmp, json_encode($store)) === false) return false;
        return @rename($tmp, $f);
    }

    /* --------------------------------------------------------------- values */

    function ships_str($v) {
        if ($v === null || is_array($v) || is_object($v)) return '';
        $s = trim((string)$v);
        $s = trim(rtrim($s, '@'));   // AIS pads names with '@'
        return $s;
    }

    function ships_num($v) {
        if ($v === null || $v === '' || is_array($v) || is_bool($v)) return null;
        if (!is_numeric($v)) return null;
        $n = (float)$v;
        return is_finite($n) ? $n : null;
    }

    function ships_heading($v) {
        $h = ships_num($v);
        return ($h !== null && $h >= 0 && $h <= 360) ? $h : null;
    }

    /** aisstream's time_utc ("2026-09-12 19:20:33.123456789 +0000 UTC") -> ISO 8601 Z. Falls back to now. */
    function ships_iso($v, $nowMs) {
        $t = ships_str($v);
        if ($t !== '' && preg_match('/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/', $t, $m)) {
            $ts = strtotime($m[1] . 'T' . $m[2] . 'Z');
            if ($ts !== false) return gmdate('Y-m-d\TH:i:s\Z', $ts);
        }
        return gmdate('Y-m-d\TH:i:s\Z', (int)floor($nowMs / 1000));
    }

    function ships_in_box($lon, $lat) {
        return $lon >= SHIPS_W && $lon <= SHIPS_E && $lat >= SHIPS_S && $lat <= SHIPS_N;
    }

    /** Equirectangular metres — plenty for 25 m thinning. */
    function ships_metres($lat1, $lon1, $lat2, $lon2) {
        $dLat = ($lat2 - $lat1) * 111320.0;
        $dLon = ($lon2 - $lon1) * 111320.0 * cos((($lat1 + $lat2) / 2.0) * M_PI / 180.0);
        return sqrt($dLat * $dLat + $dLon * $dLon);
    }

    /** AIS ship-type code -> a word for the card. The numeric code is kept alongside for the layer's colouring. */
    function ships_type_word($code) {
        $c = ships_num($code);
        if ($c === null) return '';
        $c = (int)$c;
        $specials = array(30 => 'Fishing', 31 => 'Tug', 32 => 'Tug', 33 => 'Dredger', 34 => 'Diving support', 35 => 'Military',
                          36 => 'Sailing', 37 => 'Pleasure craft', 50 => 'Pilot boat', 51 => 'Search and rescue', 52 => 'Tug',
                          53 => 'Port tender', 54 => 'Anti-pollution', 55 => 'Law enforcement', 58 => 'Medical transport');
        if (isset($specials[$c])) return $specials[$c];
        $fam = (int)floor($c / 10);
        $families = array(2 => 'Wing in ground', 4 => 'High-speed craft', 6 => 'Passenger', 7 => 'Cargo', 8 => 'Tanker', 9 => 'Other');
        return isset($families[$fam]) ? $families[$fam] : '';
    }

    /* ------------------------------------------------------------- merging */

    /**
     * Fold one aisstream envelope into the store. Returns true when the message
     * was recognised AIS traffic (liveness), false otherwise. A port of the map
     * dev server's applyAisMessage, so both halves agree on every field.
     */
    function ships_apply(&$store, $env, $nowMs) {
        if (!is_array($env)) return false;
        $type = isset($env['MessageType']) ? $env['MessageType'] : null;
        if (!is_string($type) || $type === '') return false;
        $msg  = (isset($env['Message'][$type]) && is_array($env['Message'][$type])) ? $env['Message'][$type] : array();
        $meta = (isset($env['MetaData']) && is_array($env['MetaData'])) ? $env['MetaData']
              : ((isset($env['Metadata']) && is_array($env['Metadata'])) ? $env['Metadata'] : array());
        $mmsi = ships_str(isset($meta['MMSI']) ? $meta['MMSI'] : (isset($msg['UserID']) ? $msg['UserID'] : (isset($msg['UserId']) ? $msg['UserId'] : (isset($msg['Mmsi']) ? $msg['Mmsi'] : null))));
        if ($mmsi === '' || !preg_match('/^\d{5,10}$/', $mmsi)) return false;

        if ($type === 'ShipStaticData' || $type === 'StaticDataReport') {
            $prev = isset($store['static'][$mmsi]) ? $store['static'][$mmsi] : array();
            $st = array(
                'name'        => ships_name($meta, $msg, $prev),
                'type'        => ships_type($msg, $prev),
                'destination' => ships_str(isset($msg['Destination']) ? $msg['Destination'] : (isset($prev['destination']) ? $prev['destination'] : '')),
                'imo'         => ships_str(isset($msg['ImoNumber']) ? $msg['ImoNumber'] : (isset($msg['IMO']) ? $msg['IMO'] : (isset($prev['imo']) ? $prev['imo'] : ''))),
            );
            $store['static'][$mmsi] = $st;
            if (isset($store['vessels'][$mmsi])) {
                $row =& $store['vessels'][$mmsi];
                if ($st['name'] !== '' && ($row['name'] === '' || $row['name'] === 'MMSI ' . $mmsi)) $row['name'] = $st['name'];
                if ($st['type'] !== '' && $row['type'] === '') { $row['type'] = $st['type']; $row['type_specific'] = ships_type_word($st['type']); }
                if ($st['destination'] !== '' && $row['destination'] === '') $row['destination'] = $st['destination'];
                if ($st['imo'] !== '' && $row['imo'] === '') $row['imo'] = $st['imo'];
                unset($row);
            }
        }

        $lat = ships_num(isset($meta['latitude']) ? $meta['latitude'] : (isset($meta['Latitude']) ? $meta['Latitude'] : (isset($msg['Latitude']) ? $msg['Latitude'] : null)));
        $lon = ships_num(isset($meta['longitude']) ? $meta['longitude'] : (isset($meta['Longitude']) ? $meta['Longitude'] : (isset($msg['Longitude']) ? $msg['Longitude'] : null)));
        // A well-formed record without a position (static data) is still the feed delivering.
        if ($lat === null || $lon === null) return true;
        if (abs($lat) > 90 || abs($lon) > 180) return true;
        if (!ships_in_box($lon, $lat)) return true;

        $st = isset($store['static'][$mmsi]) ? $store['static'][$mmsi] : array();
        $name = ships_name($meta, $msg, $st);
        $typeCode = ships_type($msg, $st);
        $timeRaw = isset($meta['time_utc']) ? $meta['time_utc'] : (isset($meta['TimeUtc']) ? $meta['TimeUtc'] : null);
        $iso = ships_iso($timeRaw, $nowMs);
        $epoch = strtotime($iso);
        $store['vessels'][$mmsi] = array(
            'lat' => $lat, 'lon' => $lon,
            'name' => $name !== '' ? $name : 'MMSI ' . $mmsi,
            'mmsi' => $mmsi,
            'imo'  => ships_str(isset($msg['ImoNumber']) ? $msg['ImoNumber'] : (isset($msg['IMO']) ? $msg['IMO'] : (isset($st['imo']) ? $st['imo'] : ''))),
            'type' => $typeCode,
            'type_specific' => ships_type_word($typeCode),
            'destination' => ships_str(isset($msg['Destination']) ? $msg['Destination'] : (isset($st['destination']) ? $st['destination'] : '')),
            'speed'   => ships_num(isset($msg['Sog']) ? $msg['Sog'] : (isset($msg['SOG']) ? $msg['SOG'] : null)),
            'course'  => ships_num(isset($msg['Cog']) ? $msg['Cog'] : (isset($msg['COG']) ? $msg['COG'] : null)),
            'heading' => ships_heading(isset($msg['TrueHeading']) ? $msg['TrueHeading'] : (isset($msg['Heading']) ? $msg['Heading'] : null)),
            'last_position_UTC'   => $iso,
            'last_position_epoch' => $epoch,
            '_updatedAt' => $nowMs,
        );
        ships_track_append($store, $mmsi, $lat, $lon, $epoch);
        return true;
    }

    function ships_name($meta, $msg, $st) {
        foreach (array(isset($meta['ShipName']) ? $meta['ShipName'] : null, isset($msg['Name']) ? $msg['Name'] : null,
                       isset($msg['ShipName']) ? $msg['ShipName'] : null,
                       isset($msg['ReportA']['Name']) ? $msg['ReportA']['Name'] : null,
                       isset($st['name']) ? $st['name'] : null) as $cand) {
            $s = ships_str($cand);
            if ($s !== '') return $s;
        }
        return '';
    }

    function ships_type($msg, $st) {
        foreach (array(isset($msg['Type']) ? $msg['Type'] : null, isset($msg['ShipType']) ? $msg['ShipType'] : null,
                       isset($msg['ReportB']['ShipType']) ? $msg['ReportB']['ShipType'] : null,
                       isset($st['type']) ? $st['type'] : null) as $cand) {
            $s = ships_str($cand);
            if ($s !== '' && $s !== '0') return $s;
        }
        return '';
    }

    /** Recent-path ring: a sample every 30 s and 25 m, 64 deep; a lone first fix is held back until a second one confirms movement. */
    function ships_track_append(&$store, $mmsi, $lat, $lon, $epoch) {
        if (!isset($store['tracks'][$mmsi])) {
            if (!isset($store['pending'][$mmsi])) { $store['pending'][$mmsi] = array($lat, $lon, $epoch); return; }
            $p = $store['pending'][$mmsi];
            if ($epoch - $p[2] < SHIPS_TRACK_MIN_GAP_SEC) return;
            if (ships_metres($p[0], $p[1], $lat, $lon) < SHIPS_TRACK_MIN_MOVE_M) return;
            $store['tracks'][$mmsi] = array($p, array($lat, $lon, $epoch));
            unset($store['pending'][$mmsi]);
            return;
        }
        $t =& $store['tracks'][$mmsi];
        $last = $t[count($t) - 1];
        if ($epoch - $last[2] < SHIPS_TRACK_MIN_GAP_SEC) { unset($t); return; }
        if (ships_metres($last[0], $last[1], $lat, $lon) < SHIPS_TRACK_MIN_MOVE_M) { unset($t); return; }
        $t[] = array($lat, $lon, $epoch);
        if (count($t) > SHIPS_TRACK_SAMPLES) $t = array_slice($t, -SHIPS_TRACK_SAMPLES);
        unset($t);
    }

    function ships_prune(&$store, $nowMs) {
        $cutoff = $nowMs - SHIPS_STALE_MS;
        foreach (array_keys($store['vessels']) as $mmsi) {
            if (!isset($store['vessels'][$mmsi]['_updatedAt']) || $store['vessels'][$mmsi]['_updatedAt'] < $cutoff) {
                unset($store['vessels'][$mmsi], $store['tracks'][$mmsi], $store['pending'][$mmsi]);
            }
        }
        $pendingCutoff = (int)floor($cutoff / 1000);
        foreach (array_keys($store['pending']) as $mmsi) {
            if ($store['pending'][$mmsi][2] < $pendingCutoff) unset($store['pending'][$mmsi]);
        }
        // static data for vessels not seen in 24 h is not worth keeping
        $staticCutoff = $nowMs - 24 * 3600 * 1000;
        foreach (array_keys($store['static']) as $mmsi) {
            if (!isset($store['vessels'][$mmsi]) && count($store['static']) > 5000) unset($store['static'][$mmsi]);
        }
    }

    /* ------------------------------------------------------------- reading */

    function ships_rows($store, $maxRows, $nowMs) {
        $cutoff = $nowMs - SHIPS_STALE_MS;
        $rows = array();
        foreach ($store['vessels'] as $row) {
            if (isset($row['_updatedAt']) && $row['_updatedAt'] >= $cutoff) $rows[] = $row;
        }
        usort($rows, function ($a, $b) { return $b['_updatedAt'] <=> $a['_updatedAt']; });
        $rows = array_slice($rows, 0, max(1, (int)$maxRows));
        foreach ($rows as &$r) unset($r['_updatedAt']);
        unset($r);
        return $rows;
    }

    function ships_track($store, $mmsi) {
        $out = array();
        if (isset($store['tracks'][$mmsi])) {
            foreach ($store['tracks'][$mmsi] as $s) $out[] = array('lat' => $s[0], 'lon' => $s[1], 't' => $s[2]);
        }
        return $out;
    }

    function ships_newest_position_at($rows) {
        $max = null;
        foreach ($rows as $r) {
            if (isset($r['last_position_epoch']) && ($max === null || $r['last_position_epoch'] > $max)) $max = $r['last_position_epoch'];
        }
        return $max === null ? null : gmdate('Y-m-d\TH:i:s\Z', (int)$max);
    }

    /**
     * Health as the map's layer reads it. Statuses the layer knows: live | stale |
     * down | auth-failed | missing-key | idle (see aisLiveVessels.js). Cached
     * vessels stay drawn while degraded, but the chip must say so.
     */
    function ships_status($store, $nowMs, $hasKey) {
        $p = isset($store['poll']) ? $store['poll'] : array();
        $lastPoll = isset($p['lastPollAt']) ? $p['lastPollAt'] : null;
        $lastMsg  = isset($p['lastMessageAt']) ? $p['lastMessageAt'] : null;
        $fail = isset($p['failures']) ? (int)$p['failures'] : 0;
        $out = array('lastMessageAt' => $lastMsg, 'silentForMs' => null, 'reconnectAttempt' => $fail,
                     'nextAttemptAt' => isset($p['nextAttemptAt']) ? $p['nextAttemptAt'] : null,
                     'staleAfterMs' => SHIPS_SILENCE_MS, 'watchdog' => 'cron');
        if (!$hasKey) return $out + array('status' => 'missing-key', 'error' => 'AISSTREAM_API_KEY is not set');
        if (!empty($p['authFailed'])) return $out + array('status' => 'auth-failed', 'error' => 'API key rejected by AISStream');
        if ($lastPoll === null) return $out + array('status' => 'idle', 'error' => 'waiting for the first poll');
        if ($nowMs - $lastPoll > SHIPS_POLL_DEAD_MS) {
            $out['silentForMs'] = $lastMsg !== null ? $nowMs - $lastMsg : null;
            return $out + array('status' => 'down', 'error' => 'poller has not run for ' . (int)round(($nowMs - $lastPoll) / 60000) . ' min');
        }
        if ($lastMsg === null || $nowMs - $lastMsg > SHIPS_SILENCE_MS) {
            $out['silentForMs'] = $lastMsg !== null ? $nowMs - $lastMsg : $nowMs - $lastPoll;
            return $out + array('status' => 'stale', 'error' => isset($p['lastError']) && $p['lastError'] ? $p['lastError'] : 'no AIS message received');
        }
        return $out + array('status' => 'live', 'error' => null);
    }

    function ships_payload($store, $maxRows, $nowMs, $hasKey) {
        $rows = ships_rows($store, $maxRows, $nowMs);
        $h = ships_status($store, $nowMs, $hasKey);
        return array(
            'rows' => $rows,
            'source' => SHIPS_SOURCE,
            'coverage' => SHIPS_COVERAGE,
            'generated' => gmdate('Y-m-d\TH:i:s\Z', (int)floor($nowMs / 1000)),
            'status' => $h['status'],
            'error' => $h['error'],
            'refreshing' => $h['status'] !== 'live',
            'newestPositionAt' => ships_newest_position_at($rows),
            'lastMessageAt' => $h['lastMessageAt'],
            'silentForMs' => $h['silentForMs'],
            'reconnectAttempt' => $h['reconnectAttempt'],
            'nextAttemptAt' => $h['nextAttemptAt'],
            'staleAfterMs' => $h['staleAfterMs'],
            'watchdog' => $h['watchdog'],
            'count' => count($rows),
        );
    }

    /* ------------------------------------------------------- websocket client */

    /** Client frames are masked (RFC 6455 5.3); the server's are not. */
    function ships_ws_frame($opcode, $payload) {
        $len = strlen($payload);
        $head = chr(0x80 | ($opcode & 0x0F));
        if ($len < 126) $head .= chr(0x80 | $len);
        elseif ($len < 65536) $head .= chr(0x80 | 126) . pack('n', $len);
        else $head .= chr(0x80 | 127) . pack('J', $len);
        $mask = random_bytes(4);
        $out = '';
        for ($i = 0; $i < $len; $i++) $out .= $payload[$i] ^ $mask[$i % 4];
        return $head . $mask . $out;
    }

    /** Read exactly $n bytes or give up at the deadline (returns null on EOF/timeout). */
    function ships_read_exact($fp, $n, $deadline) {
        $buf = '';
        while (strlen($buf) < $n) {
            if (microtime(true) > $deadline) return null;
            $chunk = @fread($fp, $n - strlen($buf));
            if ($chunk === false || $chunk === '') {
                if (feof($fp)) return null;
                $info = stream_get_meta_data($fp);
                if (!empty($info['timed_out'])) return null;
                usleep(20000);
                continue;
            }
            $buf .= $chunk;
        }
        return $buf;
    }

    /** One frame: array(opcode, payload, fin) or null. Handles server (unmasked) and masked frames alike. */
    function ships_ws_read($fp, $deadline) {
        $h = ships_read_exact($fp, 2, $deadline);
        if ($h === null) return null;
        $b0 = ord($h[0]); $b1 = ord($h[1]);
        $fin = ($b0 & 0x80) !== 0; $op = $b0 & 0x0F; $masked = ($b1 & 0x80) !== 0; $len = $b1 & 0x7F;
        if ($len === 126) { $x = ships_read_exact($fp, 2, $deadline); if ($x === null) return null; $len = unpack('n', $x)[1]; }
        elseif ($len === 127) { $x = ships_read_exact($fp, 8, $deadline); if ($x === null) return null; $len = unpack('J', $x)[1]; }
        $mask = null;
        if ($masked) { $mask = ships_read_exact($fp, 4, $deadline); if ($mask === null) return null; }
        $data = '';
        if ($len > 0) { $data = ships_read_exact($fp, $len, $deadline); if ($data === null) return null; }
        if ($mask !== null) {
            $u = '';
            for ($i = 0; $i < $len; $i++) $u .= $data[$i] ^ $mask[$i % 4];
            $data = $u;
        }
        return array($op, $data, $fin);
    }

    function ships_ws_connect($host, $path, $timeout, &$err) {
        $err = null;
        $ctx = stream_context_create(array('ssl' => array('verify_peer' => true, 'verify_peer_name' => true, 'SNI_enabled' => true, 'peer_name' => $host)));
        $fp = @stream_socket_client('ssl://' . $host . ':443', $errno, $errstr, $timeout, STREAM_CLIENT_CONNECT, $ctx);
        if (!$fp) { $err = 'connect: ' . $errstr . ' (' . $errno . ')'; return null; }
        stream_set_timeout($fp, 5);
        $key = base64_encode(random_bytes(16));
        $req = "GET " . $path . " HTTP/1.1\r\nHost: " . $host . "\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n"
             . "Sec-WebSocket-Key: " . $key . "\r\nSec-WebSocket-Version: 13\r\n"
             . "User-Agent: 365techies-bournemouth365/1.0 (+https://365techies.co.uk/)\r\n\r\n";
        if (@fwrite($fp, $req) === false) { $err = 'handshake: write failed'; fclose($fp); return null; }
        $hdr = '';
        $deadline = microtime(true) + $timeout;
        while (microtime(true) < $deadline) {
            $line = @fgets($fp);
            if ($line === false) { if (feof($fp)) break; continue; }
            $hdr .= $line;
            if ($line === "\r\n") break;
        }
        if (!preg_match('#^HTTP/1\.1 101#', $hdr)) {
            $first = strtok($hdr, "\r\n");
            $err = 'handshake: ' . ($first === false ? 'no response' : $first);
            fclose($fp);
            return null;
        }
        return $fp;
    }

    /**
     * Capture for $seconds and fold everything into $store. Returns a report:
     * ok, error, messages (recognised AIS envelopes), frames, authFailed.
     */
    function ships_capture($apiKey, $seconds, &$store, $nowFn = null) {
        $now = $nowFn ? $nowFn : function () { return (int)round(microtime(true) * 1000); };
        $report = array('ok' => false, 'error' => null, 'messages' => 0, 'frames' => 0, 'authFailed' => false);
        $err = null;
        $fp = ships_ws_connect(SHIPS_WS_HOST, SHIPS_WS_PATH, 15, $err);
        if (!$fp) { $report['error'] = $err; return $report; }
        $sub = json_encode(array(
            'APIKey' => $apiKey,
            'BoundingBoxes' => array(array(array(SHIPS_S, SHIPS_W), array(SHIPS_N, SHIPS_E))),   // [lat, lon] pairs
            'FilterMessageTypes' => ships_message_types(),
        ));
        if (@fwrite($fp, ships_ws_frame(1, $sub)) === false) { $report['error'] = 'subscribe: write failed'; fclose($fp); return $report; }
        $deadline = microtime(true) + $seconds;
        $fragment = '';
        while (microtime(true) < $deadline) {
            $frame = ships_ws_read($fp, $deadline);
            if ($frame === null) {
                if (feof($fp)) { $report['error'] = $report['messages'] ? null : 'connection closed by the server'; }
                break;
            }
            list($op, $data, $fin) = $frame;
            $report['frames']++;
            if ($op === 8) { $report['error'] = $report['messages'] ? null : 'server sent close: ' . substr(bin2hex($data), 0, 8); break; }
            if ($op === 9) { @fwrite($fp, ships_ws_frame(10, $data)); continue; }
            if ($op === 10) continue;
            if ($op === 0) { $fragment .= $data; if (!$fin) continue; $data = $fragment; $fragment = ''; }
            elseif (!$fin) { $fragment = $data; continue; }
            if ($op !== 1 && $op !== 0) continue;
            $env = json_decode($data, true);
            if (!is_array($env)) continue;
            if (isset($env['error'])) {
                $e = ships_str($env['error']);
                $report['error'] = 'AISStream: ' . $e;
                if (stripos($e, 'key') !== false) $report['authFailed'] = true;
                break;
            }
            if (ships_apply($store, $env, $now())) {
                $report['messages']++;
                $store['poll']['lastMessageAt'] = $now();
            }
        }
        @fwrite($fp, ships_ws_frame(8, pack('n', 1000)));
        fclose($fp);
        $report['ok'] = $report['error'] === null;
        return $report;
    }
}
