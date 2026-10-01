<?php
/*
 * Unified comms hub - library (voicemails + two-way SMS in the staff portal).
 *
 * Store: comms-data.json (.htaccess-denied), flock + atomic tmp/rename like the
 * AI pipeline store. Items: voicemail / sms_in / sms_out, threaded by E.164
 * number, matched against pcm-data.json customers (phone / sb_phone) with the
 * doc-06 rule: possible matches are shown as possible, never silently merged.
 *
 * Sweeps (called from tm-cron.php ABOVE the SMS gate, failure-isolated like
 * the abandoned-bookings and sea-data sweeps):
 *   - comms_sms_poll(): polls Textmagic GET /api/v2/replies (inbound texts to
 *     the 07520 number) with a lastId checkpoint. Needs tm creds; no-ops clean
 *     when unconfigured.
 *   - comms_vm_poll(): polls the EXISTING voice-mail@365techies.co.uk mailbox
 *     over IMAP when api/vm-imap.php exists (server-only, gitignored):
 *         <?php $VM_HOST='...'; $VM_USER='voice-mail@365techies.co.uk'; $VM_PASS='...';
 *         // optional: $VM_FOLDER='INBOX';
 *     Voipfone's voicemail-to-email already lands there with the MP3/WAV
 *     attached. The poller is a PURE OBSERVER of that mailbox: staff actively
 *     use it and rely on unread state to spot new voicemails, so it NEVER
 *     changes flags - idempotency is a UIDVALIDITY+UID checkpoint plus the
 *     store's ext_id dedupe, and the first activation only looks back
 *     VM_LOOKBACK_DAYS so years of history cannot flood Slack. Audio is saved
 *     as api/vm-audio-<id>.<ext> (denied; streamed only via the staff console).
 *
 * Content note: unlike tm-log (masked, body-free), this store DOES hold
 * message bodies and full numbers - that is its purpose as an inbox. It is
 * denied + staff-authed only, capped at COMMS_MAX_ITEMS with audio unlinked on
 * prune. Formal retention policy = blueprint doc 10 (open owner decision).
 *
 * Library only - no top-level side effects, safe to include from any scope.
 * NO closing tag anywhere in this file.
 */

require_once __DIR__ . '/tm-lib.php';   // tm_number(), tm_send(), tm_creds()

define('COMMS_FILE', __DIR__ . '/comms-data.json');
define('COMMS_LOCK', __DIR__ . '/comms-data.json.lock');
define('COMMS_MAX_ITEMS', 800);

function comms_locked($fn) {
    $lh = @fopen(COMMS_LOCK, 'c');
    if (!$lh) return array(false, 'lock-open');
    if (!flock($lh, LOCK_EX)) { fclose($lh); return array(false, 'lock'); }
    $data = @json_decode((string)@file_get_contents(COMMS_FILE), true);
    if (!is_array($data) || !isset($data['items'])) {
        $data = array('items' => array(), 'checkpoints' => array());
    }
    $out = $fn($data);
    if (is_array($out) && isset($out['__data'])) {
        $tmp = COMMS_FILE . '.tmp';
        $json = json_encode($out['__data'], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        if ($json === false || @file_put_contents($tmp, $json) === false) {
            flock($lh, LOCK_UN); fclose($lh); return array(false, 'write');
        }
        if (!@rename($tmp, COMMS_FILE)) { @unlink($tmp); flock($lh, LOCK_UN); fclose($lh); return array(false, 'rename'); }
        $res = isset($out['__result']) ? $out['__result'] : true;
    } else {
        $res = (is_array($out) && array_key_exists('__result', $out)) ? $out['__result'] : $out;
    }
    flock($lh, LOCK_UN); fclose($lh);
    return array(true, $res);
}

function comms_new_id() {
    return 'CM-' . strtoupper(base_convert((string)time(), 10, 36)
        . substr(base_convert((string)mt_rand(46656, 1679615), 10, 36), 0, 4));
}

/*
 * Match an E.164 number against the customer base. Exact normalised equality
 * only. Returns ['status' => MATCH|MULTIPLE|NO_MATCH|NOT_CHECKED, 'name', 'cid'].
 */
/* Every field a customer's number has been known to land in. The booking flow, the
   portal join, the SimplyBook mirror and the team/org records all name it differently,
   and a number we hold but do not search is a name we fail to show. Additive by
   design: adding a field can only ever produce MORE matches. */
function comms_match_fields() {
    return array('phone', 'sb_phone', 'mobile', 'tel', 'telephone', 'bk_phone', 'sms', 'contact_phone');
}

function comms_match_customer($e164) {
    $f = __DIR__ . '/pcm-data.json';
    if ($e164 === '' || !is_file($f)) return array('status' => 'NOT_CHECKED', 'name' => '', 'cid' => '', 'why' => 'no customer file');
    $db = @json_decode((string)@file_get_contents($f), true);
    if (!is_array($db) || empty($db['customers'])) return array('status' => 'NOT_CHECKED', 'name' => '', 'cid' => '', 'why' => 'customer list unreadable or empty');
    $fields = comms_match_fields();
    $hits = array();
    foreach ($db['customers'] as $cid => $c) {
        if (!is_array($c)) continue;
        $nm = isset($c['name']) ? (string)$c['name'] : (string)$cid;
        foreach ($fields as $k) {
            if (!empty($c[$k]) && is_scalar($c[$k]) && tm_number((string)$c[$k]) === $e164) {
                $hits[$cid] = $nm;
                continue 2;
            }
        }
        /* A director's staff members have their own numbers on the org record - a text
           from one of them is still this customer, named as the member. */
        if (!empty($c['org']['members']) && is_array($c['org']['members'])) {
            foreach ($c['org']['members'] as $mk => $m) {
                if (!is_array($m)) continue;
                foreach ($fields as $k) {
                    if (!empty($m[$k]) && is_scalar($m[$k]) && tm_number((string)$m[$k]) === $e164) {
                        $who = !empty($m['name']) ? (string)$m['name'] : (string)$mk;
                        $hits[$cid . '/' . $mk] = $who . ' at ' . $nm;
                        continue 3;
                    }
                }
            }
        }
        /* Booking metadata keeps the number the customer actually typed, which is
           often the only place a one-off repair customer's mobile exists. */
        if (!empty($c['bkmeta']) && is_array($c['bkmeta'])) {
            foreach ($c['bkmeta'] as $bm) {
                if (!is_array($bm)) continue;
                foreach ($fields as $k) {
                    if (!empty($bm[$k]) && is_scalar($bm[$k]) && tm_number((string)$bm[$k]) === $e164) {
                        $hits[$cid] = $nm;
                        continue 3;
                    }
                }
            }
        }
    }
    if (count($hits) === 1) return array('status' => 'MATCH', 'name' => reset($hits), 'cid' => (string)key($hits), 'why' => '');
    if (count($hits) > 1)  return array('status' => 'MULTIPLE', 'name' => implode(' / ', array_slice(array_values($hits), 0, 3)), 'cid' => '', 'why' => 'more than one customer has this number');
    return array('status' => 'NO_MATCH', 'name' => '', 'cid' => '', 'why' => 'no customer record holds this number');
}

/* Add one item; dedupe on (type, ext_id). Returns [ok, id-or-'duplicate']. */
function comms_add_item($item) {
    return comms_locked(function ($data) use ($item) {
        foreach ($data['items'] as $it) {
            if ($it['type'] === $item['type'] && $it['ext_id'] !== '' && $it['ext_id'] === $item['ext_id']) {
                return array('__result' => array('id' => $it['id'], 'duplicate' => true));
            }
        }
        $item['id'] = comms_new_id();
        $item['stored_at'] = gmdate('c');
        $data['items'][] = $item;
        // prune oldest beyond the cap; unlink any pruned voicemail audio
        if (count($data['items']) > COMMS_MAX_ITEMS) {
            $cut = array_splice($data['items'], 0, count($data['items']) - COMMS_MAX_ITEMS);
            foreach ($cut as $old) {
                if (!empty($old['audio']) && preg_match('/^vm-audio-[A-Za-z0-9\-]+\.(mp3|wav)$/', $old['audio'])) {
                    @unlink(__DIR__ . '/' . $old['audio']);
                }
            }
        }
        return array('__data' => $data, '__result' => array('id' => $item['id'], 'duplicate' => false));
    });
}

function comms_set_handled($id, $handled, $actor) {
    return comms_locked(function ($data) use ($id, $handled, $actor) {
        foreach ($data['items'] as $i => $it) {
            if ($it['id'] === $id) {
                $data['items'][$i]['handled'] = (bool)$handled;
                $data['items'][$i]['handled_by'] = $handled ? $actor : '';
                $data['items'][$i]['handled_at'] = $handled ? gmdate('c') : '';
                return array('__data' => $data, '__result' => true);
            }
        }
        return array('__result' => false);
    });
}

/* Slack ping via the existing server-only webhook. Fire-and-forget. */
function comms_slack($text) {
    $cfgsrc = (string)@file_get_contents(__DIR__ . '/slack-webhook.php');
    if (!preg_match('#(https://hooks\.slack\.com/[^\'"\s]+)#', $cfgsrc, $mm)) return false;
    $ch = curl_init($mm[1]);
    curl_setopt_array($ch, array(CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10, CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => array('Content-Type: application/json'),
        CURLOPT_POSTFIELDS => json_encode(array('text' => $text, 'unfurl_links' => false))));
    curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
    return $code >= 200 && $code < 300;
}

/* ---------------- inbound SMS: poll Textmagic replies ---------------- */

function comms_sms_poll() {
    if (!tm_configured()) return array('skipped' => 'sms-not-configured');
    list($user, $key) = tm_creds();
    $ch = curl_init('https://rest.textmagic.com/api/v2/replies?limit=50&orderBy=id&direction=desc');
    curl_setopt_array($ch, array(
        CURLOPT_HTTPHEADER => array('X-TM-Username: ' . $user, 'X-TM-Key: ' . $key),
        CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 15, CURLOPT_CONNECTTIMEOUT => 8,
        CURLOPT_PROTOCOLS => CURLPROTO_HTTPS));
    $body = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($code < 200 || $code >= 300) return array('error' => 'http-' . $code);
    $j = json_decode((string)$body, true);
    $rows = (is_array($j) && isset($j['resources']) && is_array($j['resources'])) ? $j['resources'] : array();

    list($okc, $last) = comms_locked(function ($d) {
        return array('__result' => isset($d['checkpoints']['sms_last_id']) ? (int)$d['checkpoints']['sms_last_id'] : 0);
    });
    if (!$okc) return array('error' => 'checkpoint');

    $new = 0; $maxId = $last;
    foreach (array_reverse($rows) as $r) {   // oldest first
        $rid = (int)(isset($r['id']) ? $r['id'] : 0);
        if ($rid <= $last) continue;
        $from = tm_number(isset($r['sender']) ? $r['sender'] : '');
        $text = (string)(isset($r['text']) ? $r['text'] : '');
        $at   = (string)(isset($r['messageTime']) ? $r['messageTime'] : gmdate('c'));
        $match = comms_match_customer($from);
        /* Last resort: the name Textmagic already knows. Their own notification
           emails say "SMS from Maureen Drake", so when the sender is in the
           Textmagic address book the name is there for the asking - and we were
           throwing it away, reading only id/sender/text/messageTime.

           ⚠ THIS IS NOT A CUSTOMER MATCH and must never be dressed as one. It
           says who owns the handset per the SMS provider, not that we found them
           in our records, so it is labelled differently in Slack. The house rule
           stands: a wrong name is worse than no name, so this only ever fills a
           gap - it can never override or soften a real MATCH or a MULTIPLE. */
        if ($match['status'] !== 'MATCH' && $match['status'] !== 'MULTIPLE') {
            $tmName = trim((string)(isset($r['firstName']) ? $r['firstName'] : '')
                    . ' ' . (string)(isset($r['lastName']) ? $r['lastName'] : ''));
            if ($tmName === '' && !empty($r['contact']) && is_array($r['contact']))
                $tmName = trim((string)(isset($r['contact']['firstName']) ? $r['contact']['firstName'] : '')
                        . ' ' . (string)(isset($r['contact']['lastName']) ? $r['contact']['lastName'] : ''));
            $tmName = trim(preg_replace('/\s{2,}/', ' ', preg_replace('/[\x00-\x1F\x7F]+/', ' ', $tmName)));
            if ($tmName !== '') $match['tm_name'] = mb_substr($tmName, 0, 60);
        }
        list($ok, $res) = comms_add_item(array(
            'type' => 'sms_in', 'ext_id' => 'tm-' . $rid, 'at' => $at,
            'number' => $from !== '' ? $from : (string)(isset($r['sender']) ? $r['sender'] : 'unknown'),
            'body' => $text, 'audio' => '', 'duration' => '',
            'match' => $match, 'handled' => false, 'handled_by' => '', 'handled_at' => '',
        ));
        if ($ok && empty($res['duplicate'])) {
            $new++;
            /* Show the name whenever we have one. A MULTIPLE is labelled "possible" -
               doc-06 forbids silently MERGING identities, not telling a human what the
               candidates are - and an unknown number says WHY, so a broken matcher can
               never masquerade as an unrecognised caller. */
            if ($match['status'] === 'MATCH') {
                $who = $match['name'] . ' (' . $from . ')';
            } elseif ($match['status'] === 'MULTIPLE') {
                $who = $from . ' - possibly ' . $match['name'];
            } elseif ($match['status'] === 'NOT_CHECKED') {
                $who = $from . ' (not matched: ' . (isset($match['why']) ? $match['why'] : 'lookup unavailable') . ')';
            } elseif (!empty($match['tm_name'])) {
                // Named by the SMS provider's address book, NOT matched to a
                // customer record - said plainly, so nobody reads it as a match.
                $who = $match['tm_name'] . ' (' . $from . ') - from the Textmagic contact list, not matched to a customer record';
            } else {
                $who = $from . ' (not a number we hold)';
            }
            comms_slack("\xF0\x9F\x92\xAC Text from " . $who . ': ' . mb_substr($text, 0, 200)
                . "\nReply from the portal comms inbox (/api/comms.php).");
        }
        if ($rid > $maxId) $maxId = $rid;
    }
    if ($maxId > $last) {
        comms_locked(function ($d) use ($maxId) {
            $d['checkpoints']['sms_last_id'] = $maxId;
            return array('__data' => $d, '__result' => true);
        });
    }
    return array('new' => $new, 'seen' => count($rows));
}

/* ---------------- voicemail: poll the relay mailbox over IMAP ---------------- */

function comms_vm_config() {
    $f = __DIR__ . '/vm-imap.php';
    if (!is_file($f)) return null;
    $src = (string)@file_get_contents($f);
    $g = function ($name) use ($src) {
        return preg_match('/\$' . $name . '\s*=\s*[\'"]([^\'"]+)[\'"]/', $src, $m) ? $m[1] : '';
    };
    $host = $g('VM_HOST'); $user = $g('VM_USER'); $pass = $g('VM_PASS');
    $folder = $g('VM_FOLDER'); if ($folder === '') $folder = 'INBOX';
    if ($host === '' || $user === '' || $pass === '') return null;
    return array('host' => $host, 'user' => $user, 'pass' => $pass, 'folder' => $folder);
}

define('VM_LOOKBACK_DAYS', 7);   // first-activation flood guard
define('COMMS_SLACK_CHANNEL', 'C0B4TD439FB');   // #365-job-tracker, where the webhook posts (voicemail recordings go here too)

/* 1 Oct 2026: every leaf part of an email however deeply nested - a recording can sit inside a multipart/mixed under
   a multipart/alternative, where the first poller (one level only) never looked. [sec, type, sub, name, enc, bytes] */
function comms_vm_parts($s, $prefix = '') {
    $out = array();
    if (is_object($s) && isset($s->parts) && is_array($s->parts) && $s->parts) {
        foreach ($s->parts as $i => $p) {
            $sec = ($prefix === '' ? '' : $prefix . '.') . ($i + 1);
            if (isset($p->parts) && is_array($p->parts) && $p->parts) $out = array_merge($out, comms_vm_parts($p, $sec));
            else $out[] = comms_vm_part_info($p, $sec);
        }
    } elseif (is_object($s)) {
        $out[] = comms_vm_part_info($s, $prefix === '' ? '1' : $prefix);   // a single-part email: its body is section 1
    }
    return $out;
}
function comms_vm_part_info($p, $sec) {
    $name = '';
    foreach (array('dparameters', 'parameters') as $f) {
        if (isset($p->$f) && is_array($p->$f)) foreach ($p->$f as $x) {
            if (isset($x->attribute, $x->value) && preg_match('/^(filename|name)\*?$/i', (string)$x->attribute) && $name === '') $name = (string)$x->value;
        }
    }
    $types = array('TEXT', 'MULTIPART', 'MESSAGE', 'APPLICATION', 'AUDIO', 'IMAGE', 'VIDEO', 'MODEL', 'OTHER');
    $t = isset($p->type) ? (int)$p->type : 0;
    return array('sec' => (string)$sec, 'type' => isset($types[$t]) ? $types[$t] : 'OTHER', 'sub' => strtoupper((string)(isset($p->subtype) ? $p->subtype : '')),
        'name' => $name, 'enc' => isset($p->encoding) ? (int)$p->encoding : 0, 'bytes' => isset($p->bytes) ? (int)$p->bytes : 0);
}
/* Is this part the recording? 'mp3', 'wav' or '' (the inbox and its deny rule serve those two only). */
function comms_vm_audio_ext($pi) {
    if (preg_match('/\.(mp3|wav)$/i', (string)$pi['name'], $m)) return strtolower($m[1]);
    if ($pi['type'] === 'AUDIO' || $pi['type'] === 'APPLICATION') {
        if (preg_match('/^(MPEG|MP3|MPEG3|X-MPEG|X-MP3|MPG)$/', $pi['sub'])) return 'mp3';
        if (preg_match('/^(WAV|X-WAV|WAVE|VND\.WAVE|X-PN-WAV)$/', $pi['sub'])) return 'wav';
    }
    return '';
}
/* ---- 1 Oct 2026: what kind of WAV a recording is, and plain PCM out of the telephone ones ----
   Phone systems often send 8 kHz A-law or mu-law (G.711) WAVs. Browsers and Slack play PCM WAV; G.711 is turned
   into 16-bit PCM here (a lossless table look-up). GSM 6.10 and ADPCM cannot be played in a browser: the inbox says so
   and offers the download, which Windows plays. Returns null when $bytes is not a WAV. */
function comms_wav_info($bytes) {
    $b = (string)$bytes;
    if (strlen($b) < 28 || substr($b, 0, 4) !== 'RIFF' || substr($b, 8, 4) !== 'WAVE') return null;
    $pos = 12; $fmt = null; $dataSize = null; $dataOff = null;
    while ($pos + 8 <= strlen($b)) {
        $id = substr($b, $pos, 4); $sz = unpack('V', substr($b, $pos + 4, 4))[1];
        if ($id === 'fmt ' && $pos + 8 + 16 <= strlen($b)) {
            $f = unpack('vtag/vch/Vrate/Vbyterate/valign/vbits', substr($b, $pos + 8, 16));
            if ($f['tag'] === 0xFFFE && $sz >= 26 && $pos + 8 + 26 <= strlen($b)) $f['tag'] = unpack('v', substr($b, $pos + 8 + 24, 2))[1];   // WAVE_FORMAT_EXTENSIBLE
            $fmt = $f;
        } elseif ($id === 'data') { $dataSize = $sz; $dataOff = $pos + 8; break; }
        $pos += 8 + $sz + ($sz & 1);
    }
    if (!$fmt) return null;
    $names = array(1 => 'PCM', 3 => 'float', 6 => 'A-law', 7 => 'mu-law', 2 => 'MS ADPCM', 0x11 => 'IMA ADPCM', 0x31 => 'GSM 6.10', 0x55 => 'MP3');
    $tag = (int)$fmt['tag'];
    return array('tag' => $tag, 'codec' => (isset($names[$tag]) ? $names[$tag] : 'format ' . $tag) . ', ' . round($fmt['rate'] / 1000, 1) . ' kHz',
        'playable' => $tag === 1 || $tag === 3, 'g711' => $tag === 6 || $tag === 7, 'ch' => (int)$fmt['ch'], 'rate' => (int)$fmt['rate'],
        'bits' => (int)$fmt['bits'], 'data_off' => $dataOff, 'data_size' => $dataSize,
        'secs' => ($dataSize !== null && $fmt['byterate'] > 0) ? (int)round($dataSize / $fmt['byterate']) : null);
}
function comms_g711_sample($v, $alaw) {
    if ($alaw) {
        $v ^= 0x55; $t = ($v & 0x0F) << 4; $seg = ($v & 0x70) >> 4;
        if ($seg === 0) $t += 8; elseif ($seg === 1) $t += 0x108; else { $t += 0x108; $t <<= $seg - 1; }
        return ($v & 0x80) ? $t : -$t;
    }
    $v = ~$v & 0xFF; $t = (($v & 0x0F) << 3) + 0x84; $t <<= ($v & 0x70) >> 4;
    return ($v & 0x80) ? (0x84 - $t) : ($t - 0x84);
}
/* A G.711 WAV as a 16-bit PCM WAV (same rate and channels), or null when it is not one. */
function comms_wav_pcm16($bytes) {
    $i = comms_wav_info($bytes);
    if (!$i || !$i['g711'] || $i['data_off'] === null) return null;
    $data = substr((string)$bytes, $i['data_off'], $i['data_size'] !== null ? $i['data_size'] : PHP_INT_MAX);
    $map = array();
    for ($k = 0; $k < 256; $k++) $map[chr($k)] = pack('v', comms_g711_sample($k, $i['tag'] === 6) & 0xFFFF);
    $pcm = strtr($data, $map);
    $ch = max(1, $i['ch']); $rate = max(1, $i['rate']);
    return 'RIFF' . pack('V', 36 + strlen($pcm)) . 'WAVE' . 'fmt ' . pack('VvvVVvv', 16, 1, $ch, $rate, $rate * $ch * 2, $ch * 2, 16)
        . 'data' . pack('V', strlen($pcm)) . $pcm;
}
/* Rewrite a saved G.711 recording as PCM, once (later calls see PCM and do nothing). */
function comms_wav_fix_file($path) {
    $head = (string)@file_get_contents($path, false, null, 0, 4096);
    $i = comms_wav_info($head);
    if (!$i || !$i['g711']) return false;
    $pcm = comms_wav_pcm16((string)@file_get_contents($path));
    if ($pcm === null) return false;
    $tmp = $path . '.' . getmypid() . '.tmp';
    if (@file_put_contents($tmp, $pcm, LOCK_EX) === false) return false;
    if (!@rename($tmp, $path)) { @unlink($path); if (!@rename($tmp, $path)) { @unlink($tmp); return false; } }
    return true;
}

function comms_vm_decode($raw, $enc) {
    if ((int)$enc === 3) return (string)base64_decode($raw);
    if ((int)$enc === 4) return quoted_printable_decode($raw);
    return (string)$raw;
}
/* The recording, the text and the length from one voicemail email; $uid names the saved file. 'why' says what the
   email held when there was no recording (e.g. "text/plain, text/html" = Voipfone's Include attachment is off). */
function comms_vm_extract($im, $msgno, $uid) {
    $struct = @imap_fetchstructure($im, $msgno);
    $audio = ''; $plain = ''; $html = ''; $seen = array(); $wavSecs = null;
    foreach (comms_vm_parts($struct) as $pi) {
        $seen[] = strtolower($pi['type'] . '/' . $pi['sub']) . ($pi['name'] !== '' ? ' "' . $pi['name'] . '"' : '');
        $ext = comms_vm_audio_ext($pi);
        if ($ext !== '') {
            if ($audio !== '') continue;
            $raw = comms_vm_decode((string)@imap_fetchbody($im, $msgno, $pi['sec']), $pi['enc']);
            if ($ext === 'wav') {
                $wi = comms_wav_info($raw);
                if ($wi && $wi['g711']) { $pcm = comms_wav_pcm16($raw); if ($pcm !== null) $raw = $pcm; }   // playable everywhere
                if ($wi && $wi['secs'] !== null && $wi['secs'] > 0) $wavSecs = $wi['secs'];
            }
            if (strlen($raw) > 200) {
                $name = 'vm-audio-VM' . (int)$uid . '.' . $ext;
                if (@file_put_contents(__DIR__ . '/' . $name, $raw, LOCK_EX) !== false) $audio = $name;
            }
        } elseif ($pi['type'] === 'TEXT' && $pi['sub'] === 'PLAIN' && $plain === '') {
            $plain = comms_vm_decode((string)@imap_fetchbody($im, $msgno, $pi['sec']), $pi['enc']);
        } elseif ($pi['type'] === 'TEXT' && $pi['sub'] === 'HTML' && $html === '') {
            $h = comms_vm_decode((string)@imap_fetchbody($im, $msgno, $pi['sec']), $pi['enc']);
            $html = trim(html_entity_decode(strip_tags(preg_replace('/<(br|\/p|\/div|\/tr)\b[^>]*>/i', "\n", $h)), ENT_QUOTES, 'UTF-8'));
        }
    }
    $body = $plain !== '' ? $plain : $html;
    $dur = preg_match('/(?:duration|length)[^0-9]{0,8}([0-9]{1,2}:[0-9]{2}(?::[0-9]{2})?|\d{1,4}\s*s(?:ec(?:ond)?s?)?\b)/i', $body, $m) ? trim($m[1]) : '';
    if ($dur === '' && $wavSecs) $dur = intdiv((int)$wavSecs, 60) . ':' . str_pad((string)((int)$wavSecs % 60), 2, '0', STR_PAD_LEFT);   // the length, from the recording itself
    return array('audio' => $audio, 'body' => $body, 'duration' => $dur,
        'why' => $audio === '' ? 'no recording in the email (it holds: ' . ($seen ? implode(', ', array_slice($seen, 0, 6)) : 'nothing readable') . ')' : '');
}

/* Tell the team about a new voicemail: the recording itself into #365-job-tracker when there is one (Slack plays it
   inline, on a phone too), else - or if the upload is refused - one line with a link straight to that caller's thread. */
function comms_vm_announce($who, $e164, $duration, $audioFile, $why) {
    $link = 'https://365techies.co.uk/api/comms.php?n=' . rawurlencode($e164);
    $line = "\xF0\x9F\x93\x9E Voicemail from " . $who . ($duration !== '' ? ' (' . $duration . ')' : '');
    if ($audioFile !== '' && is_file(__DIR__ . '/' . $audioFile)) {
        if (!function_exists('slk_upload_file')) @include_once __DIR__ . '/pcm-slack-lib.php';
        if (function_exists('slk_upload_file')) {
            $bytes = (string)@file_get_contents(__DIR__ . '/' . $audioFile);
            $ext = pathinfo($audioFile, PATHINFO_EXTENSION);
            $r = slk_upload_file(COMMS_SLACK_CHANNEL, $bytes, 'voicemail-' . preg_replace('/[^0-9]/', '', $e164) . '.' . $ext,
                'Voicemail from ' . $who, $line . "\nPlay it above. Call back, or open the thread: <" . $link . '|comms inbox>');
            if (!empty($r['ok'])) return true;
        }
        return comms_slack($line . "\n<" . $link . '|Play it and call back> (comms inbox)');
    }
    return comms_slack($line . "\n<" . $link . '|Open the comms inbox thread> to call back.'
        . ($why !== '' ? "\n_No recording came with Voipfone's email - switch on Include attachment for this voicemail box in the Voipfone control panel._" : ''));
}

/* Voicemails stored without their recording (the first poller looked one level deep only): look again, once each,
   up to $limit a run. Nothing is posted to Slack for these - they are old news; the inbox gains the player. */
function comms_vm_refetch($limit = 15) {
    $cfg = comms_vm_config();
    if (!$cfg || !function_exists('imap_open')) return array('skipped' => 1);
    list($ok, $todo) = comms_locked(function ($d) {
        $t = array();
        foreach ($d['items'] as $it) {
            if (($it['type'] ?? '') !== 'voicemail' || ($it['audio'] ?? '') !== '' || !empty($it['audio_tried'])) continue;
            if (preg_match('/^vm-(\d+)-(\d+)$/', (string)($it['ext_id'] ?? ''), $m)) $t[] = array($it['id'], (int)$m[1], (int)$m[2]);
        }
        return array('__result' => $t);
    });
    if (!$ok || !$todo) return array('refetched' => 0);
    $mbox = '{' . $cfg['host'] . ':993/imap/ssl/novalidate-cert}' . $cfg['folder'];
    $im = @imap_open($mbox, $cfg['user'], $cfg['pass'], OP_READONLY, 1);
    if (!$im) return array('error' => 'imap-connect');
    $status = @imap_status($im, $mbox, SA_UIDVALIDITY);
    $validity = ($status && isset($status->uidvalidity)) ? (int)$status->uidvalidity : 0;
    $got = array();
    foreach (array_slice($todo, 0, $limit) as $t) {
        list($id, $val, $uid) = $t;
        if ($val !== $validity) { $got[$id] = array('audio' => '', 'duration' => '', 'why' => 'the mailbox was renumbered'); continue; }
        $msgno = (int)@imap_msgno($im, $uid);
        if ($msgno <= 0) { $got[$id] = array('audio' => '', 'duration' => '', 'why' => 'no longer in the voicemail mailbox'); continue; }
        $got[$id] = comms_vm_extract($im, $msgno, $uid);
    }
    @imap_close($im);
    $n = 0;
    comms_locked(function ($d) use ($got, &$n) {
        foreach ($d['items'] as $i => $it) {
            if (!isset($got[$it['id']])) continue;
            $x = $got[$it['id']];
            $d['items'][$i]['audio_tried'] = 1;
            if ($x['audio'] !== '') { $d['items'][$i]['audio'] = $x['audio']; $n++; }
            if (($it['duration'] ?? '') === '' && $x['duration'] !== '') $d['items'][$i]['duration'] = $x['duration'];
            $d['items'][$i]['audio_why'] = $x['why'];
        }
        return array('__data' => $d, '__result' => true);
    });
    return array('refetched' => count($got), 'with_audio' => $n);
}

function comms_vm_poll() {
    $cfg = comms_vm_config();
    if (!$cfg) return array('skipped' => 'vm-not-configured');
    if (!function_exists('imap_open')) return array('error' => 'imap-extension-missing');

    $mbox = '{' . $cfg['host'] . ':993/imap/ssl/novalidate-cert}' . $cfg['folder'];
    $im = @imap_open($mbox, $cfg['user'], $cfg['pass'], OP_READONLY, 1);
    if (!$im) return array('error' => 'imap-connect');

    // UIDVALIDITY guards the UID checkpoint: if the server renumbers the
    // mailbox, UIDs restart and the checkpoint must reset (ext_id still
    // carries validity+uid, so nothing can double-ingest even then).
    $status = @imap_status($im, $mbox, SA_UIDVALIDITY);
    $validity = ($status && isset($status->uidvalidity)) ? (int)$status->uidvalidity : 0;
    list($okc, $cp) = comms_locked(function ($d) {
        return array('__result' => isset($d['checkpoints']['vm']) ? $d['checkpoints']['vm'] : array('validity' => 0, 'uid' => 0));
    });
    if (!$okc) { @imap_close($im); return array('error' => 'checkpoint'); }
    $lastUid = ($validity !== 0 && (int)$cp['validity'] === $validity) ? (int)$cp['uid'] : 0;

    $since = date('j-M-Y', time() - VM_LOOKBACK_DAYS * 86400);
    $found = @imap_search($im, 'SINCE "' . $since . '"');
    $new = 0; $examined = 0; $maxUid = $lastUid;
    if (is_array($found)) {
        // oldest first; only UIDs above the checkpoint count against the
        // per-run cap (processed items, not skipped ones)
        sort($found);
        foreach ($found as $msgno) {
            $uid = (int)@imap_uid($im, $msgno);
            if ($uid <= $lastUid) continue;
            if ($examined >= 40) break;
            $examined++;
            $ov = @imap_headerinfo($im, $msgno);
            $subject = isset($ov->subject) ? @imap_utf8($ov->subject) : '';
            $when = isset($ov->udate) ? gmdate('c', (int)$ov->udate) : gmdate('c');

            // caller number: first UK-looking digit run in the subject, else body
            $caller = '';
            if (preg_match('/(\+?44\d{9,10}|0\d{9,10})/', preg_replace('/[\s\-()]/', '', $subject), $m)) $caller = $m[1];
            // 1 Oct 2026: the whole email, however nested (comms_vm_extract), and what it held when no recording came
            $x = comms_vm_extract($im, $msgno, $uid);
            $bodyText = $x['body']; $audioFile = $x['audio']; $duration = $x['duration'];
            if ($caller === '' && preg_match('/(\+?44\d{9,10}|0\d{9,10})/', preg_replace('/[\s\-()]/', '', $bodyText), $m2)) $caller = $m2[1];

            $e164 = tm_number($caller);
            $match = comms_match_customer($e164);
            list($ok, $res) = comms_add_item(array(
                'type' => 'voicemail', 'ext_id' => 'vm-' . $validity . '-' . $uid, 'at' => $when,
                'number' => $e164 !== '' ? $e164 : ($caller !== '' ? $caller : 'unknown'),
                'body' => 'Voicemail' . ($subject !== '' ? ' - ' . mb_substr($subject, 0, 120) : ''),
                'audio' => $audioFile, 'duration' => $duration, 'audio_tried' => 1, 'audio_why' => $x['why'],
                'match' => $match, 'handled' => false, 'handled_by' => '', 'handled_at' => '',
            ));
            if ($uid > $maxUid) $maxUid = $uid;
            if ($ok && empty($res['duplicate'])) {
                $new++;
                $who = $match['status'] === 'MATCH' ? $match['name'] . ' (' . $e164 . ')' : ($e164 !== '' ? $e164 : 'unknown caller');
                comms_vm_announce($who, $e164 !== '' ? $e164 : $caller, $duration, $audioFile, $x['why']);
            }
        }
    }
    @imap_close($im);
    if ($validity !== 0 && $maxUid > $lastUid) {
        comms_locked(function ($d) use ($validity, $maxUid) {
            $d['checkpoints']['vm'] = array('validity' => $validity, 'uid' => $maxUid);
            return array('__data' => $d, '__result' => true);
        });
    }
    return array('new' => $new, 'examined' => $examined);
}

/* Staff reply: send the SMS through the guarded tm_send and thread the copy. $tag marks a special send ('review').
   1 Oct 2026: a reply IS handling the conversation, so the number's earlier unhandled texts and voicemails are marked
   handled too (the lead reminders and the inbox's "new" count read that flag). */
function comms_send_sms($to, $text, $actor, $tag = '') {
    $e164 = tm_number($to);
    $r = tm_send($e164, $text, 'comms:' . $actor . ($tag !== '' ? ':' . $tag : ''));
    if (!empty($r['ok'])) {
        $item = array(
            'type' => 'sms_out', 'ext_id' => 'out-' . (isset($r['id']) ? $r['id'] : uniqid()), 'at' => gmdate('c'),
            'number' => $e164, 'body' => (string)$text, 'audio' => '', 'duration' => '',
            'match' => comms_match_customer($e164),
            'handled' => true, 'handled_by' => $actor, 'handled_at' => gmdate('c'),
        );
        if ($tag !== '') $item['tag'] = $tag;
        comms_add_item($item);
        if ($tag !== 'review') comms_handle_number($e164, $actor . ' (replied by text)');
    }
    return $r;
}

/* Mark every unhandled text and voicemail from one number handled. Returns how many. */
function comms_handle_number($e164, $actor) {
    $res = comms_locked(function ($data) use ($e164, $actor) {
        $n = 0;
        foreach ($data['items'] as $i => $it) {
            if ($it['number'] !== $e164 || !empty($it['handled'])) continue;
            if ($it['type'] !== 'sms_in' && $it['type'] !== 'voicemail') continue;
            $data['items'][$i]['handled'] = true;
            $data['items'][$i]['handled_by'] = $actor;
            $data['items'][$i]['handled_at'] = gmdate('c');
            $n++;
        }
        return $n ? array('__data' => $data, '__result' => $n) : array('__result' => 0);
    });
    return is_array($res) ? (int)$res[1] : 0;
}

/* ---- 1 Oct 2026: the review text ------------------------------------------------------------------------------
   For jobs SimplyBook never saw (phone, remote, Dell sales, email moves): staff press one button and this goes from
   the 365 Techies number. Same wording rules as the review email (pcm-review.php rv_body): UNCONDITIONAL - no "if you
   were happy" (Google bans selectively asking for good reviews), no incentive (unlawful). One text, 7-bit, under 160
   characters so it is one part. Google allows ONE review per person, so a number is sent it at most once a year. */
define('COMMS_REVIEW_TEXT', 'Thanks for choosing 365 Techies. Would you leave us a quick Google review? It takes 30 seconds and helps local people find us: 365techies.co.uk/review');
define('COMMS_REVIEW_COOLDOWN', 365 * 86400);

/* When this number was last sent the review text (unix time), or 0. */
function comms_review_sent_at($e164, $items) {
    $last = 0;
    foreach ((array)$items as $it) {
        if (!is_array($it) || ($it['type'] ?? '') !== 'sms_out' || ($it['tag'] ?? '') !== 'review' || ($it['number'] ?? '') !== $e164) continue;
        $t = strtotime((string)($it['at'] ?? ''));
        if ($t !== false && $t > $last) $last = $t;
    }
    return $last;
}

/* Send the review text, once a year per number. Returns array(ok, error|'', dry). */
function comms_send_review($to, $actor, $now = null) {
    $now = $now === null ? time() : (int)$now;
    $e164 = tm_number($to);
    if ($e164 === '' || !tm_is_mobile($e164)) return array('ok' => false, 'error' => 'That is not a UK mobile number.');
    list($ok, $items) = comms_locked(function ($d) { return array('__result' => $d['items']); });
    if (!$ok) return array('ok' => false, 'error' => 'The inbox is busy, try again in a moment.');
    $last = comms_review_sent_at($e164, $items);
    if ($last && $now - $last < COMMS_REVIEW_COOLDOWN) {
        return array('ok' => false, 'error' => 'Already sent to this number on ' . gmdate('j M Y', $last) . ' - Google allows one review per person, so it is not sent twice in a year.');
    }
    $r = comms_send_sms($e164, COMMS_REVIEW_TEXT, $actor, 'review');
    if (!empty($r['ok'])) comms_slack(":star: Review text sent to " . $e164 . (!empty($r['dry']) ? ' (dry run)' : '') . ' from the comms inbox.');
    return array('ok' => !empty($r['ok']), 'error' => !empty($r['ok']) ? '' : (string)($r['error'] ?? 'send failed'), 'dry' => !empty($r['dry']));
}

/* The cron entry point - each poller isolated so one failure never stops the other. */
function comms_sweep() {
    $out = array();
    $out['sms'] = comms_sms_poll();
    $out['vm'] = comms_vm_poll();
    // 1 Oct 2026: recordings the first poller missed (it looked one level into the email only)
    $out['vm_audio'] = comms_vm_refetch(15);
    return $out;
}
