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

// a test suite may point these at a temp file before including this library (comms-mail-test.php, 2 Oct 2026)
if (!defined('COMMS_FILE')) define('COMMS_FILE', __DIR__ . '/comms-data.json');
if (!defined('COMMS_LOCK')) define('COMMS_LOCK', __DIR__ . '/comms-data.json.lock');
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
    $charset = '';   // 2 Oct 2026, for emails: the text's character set, and attachment vs inline
    if (isset($p->parameters) && is_array($p->parameters)) foreach ($p->parameters as $x) if (isset($x->attribute, $x->value) && strcasecmp((string)$x->attribute, 'charset') === 0) $charset = (string)$x->value;
    $disp = (!empty($p->ifdisposition) && isset($p->disposition)) ? strtoupper((string)$p->disposition) : '';
    return array('sec' => (string)$sec, 'type' => isset($types[$t]) ? $types[$t] : 'OTHER', 'sub' => strtoupper((string)(isset($p->subtype) ? $p->subtype : '')),
        'name' => $name, 'enc' => isset($p->encoding) ? (int)$p->encoding : 0, 'bytes' => isset($p->bytes) ? (int)$p->bytes : 0, 'charset' => $charset, 'disp' => $disp);
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
    // Asterisk's own wording ("a 0:42 long message"), which Voipfone's emails may keep
    if ($dur === '' && preg_match('/\ba (\d{1,2}:\d{2}) long message/i', $body, $m)) $dur = $m[1];
    if ($dur === '' && $wavSecs) $dur = intdiv((int)$wavSecs, 60) . ':' . str_pad((string)((int)$wavSecs % 60), 2, '0', STR_PAD_LEFT);   // the length, from the recording itself
    return array('audio' => $audio, 'body' => $body, 'duration' => $dur,
        'why' => $audio === '' ? 'no recording in the email (it holds: ' . ($seen ? implode(', ', array_slice($seen, 0, 6)) : 'nothing readable') . ')' : '');
}

/* Tell the team about a new voicemail: the recording itself into #365-job-tracker when there is one (Slack plays it
   inline, on a phone too), else - or if the upload is refused - one line with a link straight to that caller's thread. */
/* Returns array(ok, how: 'file'|'link', error: why a file was refused). $line overrides the opening line - a re-post of
   an old voicemail must not read "Voicemail from", or the lead reminders would chase it as new. */
function comms_vm_announce($who, $e164, $duration, $audioFile, $why, $line = '') {
    $link = 'https://365techies.co.uk/api/comms.php?n=' . rawurlencode($e164);
    if ($line === '') $line = "\xF0\x9F\x93\x9E Voicemail from " . $who . ($duration !== '' ? ' (' . $duration . ')' : '');
    $err = '';
    if ($audioFile !== '' && is_file(__DIR__ . '/' . $audioFile)) {
        if (substr($audioFile, -3) === 'wav') comms_wav_fix_file(__DIR__ . '/' . $audioFile);   // Slack plays PCM, not telephone A-law/mu-law
        if (!function_exists('slk_upload_file')) @include_once __DIR__ . '/pcm-slack-lib.php';
        if (function_exists('slk_upload_file')) {
            $bytes = (string)@file_get_contents(__DIR__ . '/' . $audioFile);
            $ext = pathinfo($audioFile, PATHINFO_EXTENSION);
            $r = slk_upload_file(COMMS_SLACK_CHANNEL, $bytes, 'voicemail-' . preg_replace('/[^0-9]/', '', $e164) . '.' . $ext,
                'Voicemail from ' . $who, $line . "\nPlay it above. Call back, or open the thread: <" . $link . '|comms inbox>');
            if (!empty($r['ok'])) return array('ok' => true, 'how' => 'file', 'error' => '');
            $err = (string)(isset($r['error']) ? $r['error'] : 'unknown');
        } else $err = 'no Slack library';
        $ok = comms_slack($line . "\n<" . $link . '|Play it and call back> (comms inbox)');
        return array('ok' => $ok, 'how' => 'link', 'error' => $err);
    }
    $ok = comms_slack($line . "\n<" . $link . '|Open the comms inbox thread> to call back.'
        . ($why !== '' ? "\n_No recording came with Voipfone's email - switch on Include attachment for this voicemail box in the Voipfone control panel._" : ''));
    return array('ok' => $ok, 'how' => 'link', 'error' => 'no recording');
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
            // 1 Oct 2026 (late): a caller name the phone system gave ("Ann Example" <07700...>), shown when we hold no better one
            if (preg_match('/"([^"<>]{2,40})"\s*<\+?\d[\d ]{8,15}>/', $subject . "\n" . $bodyText, $vn) && !preg_match('/^\d|mailbox|\*/i', trim($vn[1]))) $match['vm_name'] = mb_substr(trim($vn[1]), 0, 60);
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
function comms_handle_number($e164, $actor, $types = array('sms_in', 'voicemail')) {   // $types: 'Done' on the texts column clears texts only
    $res = comms_locked(function ($data) use ($e164, $actor, $types) {
        $n = 0;
        foreach ($data['items'] as $i => $it) {
            if ($it['number'] !== $e164 || !empty($it['handled'])) continue;
            if (!in_array($it['type'], $types, true)) continue;
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
/* ---- 1 Oct 2026: the portal's "Calls & texts" card (api/comms-api.php) and the console share these ---- */

/* Send a saved recording: telephone WAVs converted to PCM first, byte ranges answered (an iPhone will not play audio
   from a server that ignores them), and a download name when asked. Exits. */
function comms_stream_audio($path, $download = false) {
    $f = basename($path);
    if (!preg_match('/^vm-audio-[A-Za-z0-9\-]+\.(mp3|wav)$/', $f) || !is_file($path)) { http_response_code(404); exit('no'); }
    if (substr($f, -3) === 'wav') comms_wav_fix_file($path);
    clearstatcache(true, $path);
    $size = (int)filesize($path);
    header('Content-Type: ' . (substr($f, -3) === 'wav' ? 'audio/wav' : 'audio/mpeg'));
    header('Cache-Control: private, no-store');
    header('Accept-Ranges: bytes');
    header('X-Robots-Tag: noindex, nofollow');
    if ($download) header('Content-Disposition: attachment; filename="voicemail-' . preg_replace('/[^A-Za-z0-9]/', '', substr($f, 9, -4)) . '.' . substr($f, -3) . '"');
    $start = 0; $end = $size - 1;
    if (isset($_SERVER['HTTP_RANGE']) && preg_match('/^bytes=(\d*)-(\d*)$/', trim((string)$_SERVER['HTTP_RANGE']), $rm) && $size > 0) {
        if ($rm[1] === '' && $rm[2] !== '') { $start = max(0, $size - (int)$rm[2]); }
        else { $start = (int)$rm[1]; if ($rm[2] !== '') $end = min($end, (int)$rm[2]); }
        if ($start > $end || $start >= $size) { http_response_code(416); header('Content-Range: bytes */' . $size); exit; }
        http_response_code(206);
        header('Content-Range: bytes ' . $start . '-' . $end . '/' . $size);
    }
    header('Content-Length: ' . ($end - $start + 1));
    $fh = @fopen($path, 'rb');
    if ($fh) { fseek($fh, $start); $left = $end - $start + 1; while ($left > 0 && !feof($fh)) { $chunk = fread($fh, min(65536, $left)); echo $chunk; $left -= strlen($chunk); } fclose($fh); }
    exit;
}

/* A play link the portal can put straight into an <audio> element (no cookie, no POST): the file, an expiry and a
   signature keyed on the server-only admin secret. */
function comms_audio_sig($file, $exp, $key) {
    return substr(hash_hmac('sha256', (string)$file . '|' . (int)$exp, 'comms-audio|' . (string)$key), 0, 32);
}
function comms_audio_url($file, $key, $now = null) {
    $exp = ($now === null ? time() : (int)$now) + 3 * 3600;
    return '/api/comms-api.php?a=' . rawurlencode($file) . '&e=' . $exp . '&s=' . comms_audio_sig($file, $exp, $key);
}

/* ---- 1 Oct 2026 (late): a name for every number ----
   Our customer records first (comms_match_customer - re-run, because customers are added after their first text), then
   the Textmagic contact list (GET /api/v2/contacts/phone/{number}), then a caller name Voipfone put in its email.
   Cached in the store's checkpoints['names'] so the portal never waits on Textmagic: a name for 30 days, "nobody" for 7. */
function comms_tm_contact_name($e164) {   // -> array(answered, name); answered=false means try again later
    list($u, $k) = tm_creds();
    if ($u === '' || $k === '' || $e164 === '') return array(false, '');
    $ch = curl_init('https://rest.textmagic.com/api/v2/contacts/phone/' . preg_replace('/\D/', '', $e164));
    curl_setopt_array($ch, array(CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10, CURLOPT_CONNECTTIMEOUT => 6,
        CURLOPT_HTTPHEADER => array('X-TM-Username: ' . $u, 'X-TM-Key: ' . $k), CURLOPT_PROTOCOLS => CURLPROTO_HTTPS));
    $body = curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
    if ($code === 404) return array(true, '');
    if ($code < 200 || $code >= 300) return array(false, '');
    $j = json_decode((string)$body, true);
    if (!is_array($j)) return array(false, '');
    $nm = trim(preg_replace('/\s+/', ' ', (string)($j['firstName'] ?? '') . ' ' . (string)($j['lastName'] ?? '')));
    if ($nm === '' && !empty($j['companyName'])) $nm = (string)$j['companyName'];
    if (comms_is_phoneish($nm)) $nm = '';   // a contact saved under its own number has no name
    return array(true, mb_substr(trim(preg_replace('/[\x00-\x1F\x7F]+/', ' ', $nm)), 0, 60));
}
function comms_names_refresh($limit = 10, $now = null) {
    $now = $now === null ? time() : (int)$now;
    list($ok, $snap) = comms_locked(function ($d) { return array('__result' => array('items' => $d['items'], 'names' => $d['checkpoints']['names'] ?? array())); });
    if (!$ok) return array('error' => 'busy');
    $names = is_array($snap['names']) ? $snap['names'] : array();
    $todo = array();
    foreach (array_reverse((array)$snap['items']) as $it) {   // the newest callers first
        $n = (string)($it['number'] ?? '');
        if ($n === '' || $n[0] !== '+' || isset($todo[$n]) || ($it['match']['status'] ?? '') === 'MATCH') continue;
        $c = $names[$n] ?? null;
        if ($c && $now - (int)($c['at'] ?? 0) < ((string)($c['name'] ?? '') !== '' ? 30 : 7) * 86400) continue;
        $todo[$n] = 1;
        if (count($todo) >= $limit) break;
    }
    $got = array();
    foreach (array_keys($todo) as $n) {
        $m = comms_match_customer($n);
        if ($m['status'] === 'MATCH') { $got[$n] = array('name' => (string)$m['name'], 'src' => 'customer', 'at' => $now); continue; }
        list($answered, $nm) = comms_tm_contact_name($n);
        if ($answered) $got[$n] = array('name' => $nm, 'src' => $nm !== '' ? 'textmagic' : '', 'at' => $now);
    }
    if ($got) comms_locked(function ($d) use ($got) {
        if (!isset($d['checkpoints']['names']) || !is_array($d['checkpoints']['names'])) $d['checkpoints']['names'] = array();
        foreach ($got as $n => $v) $d['checkpoints']['names'][$n] = $v;
        return array('__data' => $d, '__result' => true);
    });
    return array('looked_up' => count($todo), 'named' => count(array_filter($got, function ($v) { return $v['name'] !== ''; })));
}
/* The name to show for a number, and where it came from: customer | textmagic | voipfone | possible | '' (none). */
function comms_name_for($n, $match, $names) {
    $m = is_array($match) ? $match : array();
    if (($m['status'] ?? '') === 'MATCH') return array((string)$m['name'], 'customer');
    if (is_array($names) && isset($names[$n]['name']) && (string)$names[$n]['name'] !== '' && !comms_is_phoneish($names[$n]['name'])) return array((string)$names[$n]['name'], (string)($names[$n]['src'] ?? 'textmagic'));
    if (!empty($m['tm_name']) && !comms_is_phoneish($m['tm_name'])) return array((string)$m['tm_name'], 'textmagic');
    if (!empty($m['vm_name'])) return array((string)$m['vm_name'], 'voipfone');
    if (($m['status'] ?? '') === 'MULTIPLE') return array('Possibly ' . (string)$m['name'], 'possible');
    return array('', '');
}

/* The inbox as the portal's two columns show it (1 Oct 2026, owner: "text messages down one side and the voicemails
   on the other"): 'texts' = one conversation per number (its last 4 texts, in and out), newest first; 'vms' = every
   voicemail, newest first, each on its own with the caller's name and number. Bodies trimmed; no audio file names
   leave, only signed links. open_texts = numbers with a text to answer; open_vms = voicemails not done; open = numbers
   with anything to answer (the Today tile). */
function comms_notes_out($notes) {   // the last 4, trimmed, for the card
    $o = array();
    foreach (array_slice((array)$notes, -4) as $nt) $o[] = array('by' => (string)($nt['by'] ?? ''), 'src' => (string)($nt['src'] ?? ''), 'at' => (string)($nt['at'] ?? ''), 'text' => mb_substr((string)($nt['text'] ?? ''), 0, 500));
    return $o;
}
function comms_board($items, $names, $key, $now = null, $limit = 30) {
    $now = $now === null ? time() : (int)$now;
    $mob = function ($n) { return (bool)preg_match('/^\+447\d{9}$/', (string)$n); };
    $byText = array(); $vms = array(); $openNums = array(); $lastMatch = array(); $webs = array(); $mails = array();
    foreach ((array)$items as $it) {
        if (!is_array($it) || !isset($it['number'], $it['type'])) continue;
        $n = (string)$it['number'];
        if ($it['type'] === 'web') {   // 2 Oct 2026: a website enquiry or call-back request; one with no number is its own person
            $webs[] = $it;
            if (empty($it['handled'])) $openNums[$n !== '' ? $n : 'web:' . (string)($it['id'] ?? '')] = 1;
            continue;
        }
        if ($it['type'] === 'email') {   // 2 Oct 2026: an email; the sender is the person when it carries no number
            $mails[] = $it;
            if (empty($it['handled'])) $openNums[$n !== '' ? $n : 'mail:' . (string)($it['mail']['from'] ?? $it['id'])] = 1;
            continue;
        }
        if (isset($it['match']) && is_array($it['match'])) $lastMatch[$n] = $it['match'];
        if (empty($it['handled']) && $it['type'] !== 'sms_out') $openNums[$n] = 1;
        if ($it['type'] === 'voicemail') $vms[] = $it;
        elseif ($it['type'] === 'sms_in' || $it['type'] === 'sms_out') $byText[$n][] = $it;
    }
    $texts = array(); $openTexts = 0;
    foreach ($byText as $n => $th) {
        usort($th, function ($a, $b) { return strcmp((string)($a['at'] ?? ''), (string)($b['at'] ?? '')); });
        $open = 0; foreach ($th as $it) if ($it['type'] === 'sms_in' && empty($it['handled'])) $open++;
        if ($open) $openTexts++;
        list($who, $src) = comms_name_for($n, $lastMatch[$n] ?? array(), $names);
        $rows = array();
        foreach (array_slice($th, -4) as $it) $rows[] = array('id' => (string)($it['id'] ?? ''), 'type' => (string)$it['type'], 'at' => (string)($it['at'] ?? ''),
            'body' => mb_substr((string)($it['body'] ?? ''), 0, 400), 'done' => !empty($it['handled']), 'review' => ($it['tag'] ?? '') === 'review');
        $notes = array(); $noteId = '';
        foreach ($th as $it) { foreach ((array)($it['notes'] ?? array()) as $nt) $notes[] = $nt; if ($it['type'] === 'sms_in') $noteId = (string)($it['id'] ?? ''); }
        usort($notes, function ($a, $b) { return strcmp((string)($a['at'] ?? ''), (string)($b['at'] ?? '')); });
        $texts[] = array('n' => (string)$n, 'who' => $who, 'src' => $src, 'mobile' => $mob($n), 'open' => $open, 'last' => (string)($th[count($th) - 1]['at'] ?? ''), 'items' => $rows,
            'notes' => comms_notes_out($notes), 'note_id' => $noteId);
    }
    usort($texts, function ($a, $b) { return strcmp($b['last'], $a['last']); });
    usort($vms, function ($a, $b) { return strcmp((string)($b['at'] ?? ''), (string)($a['at'] ?? '')); });
    $openVms = 0; $vout = array();
    foreach ($vms as $it) {
        if (empty($it['handled'])) $openVms++;
        if (count($vout) >= $limit) continue;
        $n = (string)$it['number'];
        list($who, $src) = comms_name_for($n, $it['match'] ?? array(), $names);
        $audio = (string)($it['audio'] ?? '');
        $vout[] = array('id' => (string)($it['id'] ?? ''), 'n' => $n, 'who' => $who, 'src' => $src, 'mobile' => $mob($n), 'at' => (string)($it['at'] ?? ''),
            'dur' => (string)($it['duration'] ?? ''), 'audio' => $audio !== '' ? comms_audio_url($audio, $key, $now) : '',
            'why' => $audio === '' ? (string)($it['audio_why'] ?? '') : '', 'done' => !empty($it['handled']),
            'notes' => comms_notes_out((array)($it['notes'] ?? array())), 'note_id' => (string)($it['id'] ?? ''));
    }
    // 2 Oct 2026: website enquiries and call-back requests, newest first, each on its own. The name is the one THEY typed;
    // "cust" says when the number is also a customer we hold (or a job we wrote up).
    usort($webs, function ($a, $b) { return strcmp((string)($b['at'] ?? ''), (string)($a['at'] ?? '')); });
    $openWebs = 0; $wout = array();
    foreach ($webs as $it) {
        if (empty($it['handled'])) $openWebs++;
        if (count($wout) >= $limit) continue;
        $n = (string)$it['number']; $L = is_array($it['lead'] ?? null) ? $it['lead'] : array();
        list($known, $ksrc) = $n !== '' ? comms_name_for($n, $it['match'] ?? array(), $names) : array('', '');
        $typed = (string)($L['name'] ?? '');
        $wout[] = array('id' => (string)($it['id'] ?? ''), 'kind' => (string)($L['kind'] ?? 'web'), 'label' => (string)($L['label'] ?? 'Website enquiry'),
            'who' => $typed !== '' ? $typed : $known, 'src' => $typed !== '' ? 'form' : $ksrc,
            'cust' => ($ksrc === 'customer' || $ksrc === 'job') ? $known : '', 'cust_src' => ($ksrc === 'customer' || $ksrc === 'job') ? $ksrc : '',
            'n' => $n, 'mobile' => $mob($n), 'email' => (string)($L['email'] ?? ''), 'phone' => (string)($L['phone'] ?? ''),
            'company' => (string)($L['company'] ?? ''), 'topic' => (string)($L['topic'] ?? ''), 'page' => (string)($L['page'] ?? ''),
            'body' => mb_substr((string)($it['body'] ?? ''), 0, 1200), 'at' => (string)($it['at'] ?? ''), 'done' => !empty($it['handled']),
            'notes' => comms_notes_out((array)($it['notes'] ?? array())), 'note_id' => (string)($it['id'] ?? ''));
    }
    // 2 Oct 2026: emails, newest first, each on its own: who (the name in their From line, else the address), the subject,
    // what they wrote, attachment names; "cust" when the address (or a number in it) is someone we hold
    usort($mails, function ($a, $b) { return strcmp((string)($b['at'] ?? ''), (string)($a['at'] ?? '')); });
    $openMails = 0; $mout = array();
    foreach ($mails as $it) {
        if (empty($it['handled'])) $openMails++;
        if (count($mout) >= $limit) continue;
        $M = is_array($it['mail'] ?? null) ? $it['mail'] : array(); $addr = (string)($M['from'] ?? ''); $n = (string)$it['number'];
        $k = $names['mail:' . $addr] ?? (is_array($M['known'] ?? null) ? $M['known'] : null);
        if (!$k && $n !== '') { list($kn, $ks) = comms_name_for($n, array(), $names); if ($ks === 'customer' || $ks === 'job') $k = array('name' => $kn, 'src' => $ks); }
        $mout[] = array('id' => (string)($it['id'] ?? ''), 'who' => (string)($M['name'] ?? '') !== '' ? (string)$M['name'] : $addr, 'addr' => $addr,
            'reply' => (string)($M['reply_to'] ?? '') !== '' ? (string)$M['reply_to'] : $addr, 'box' => (string)($M['box'] ?? ''),
            'subject' => (string)($M['subject'] ?? ''), 'attach' => array_values((array)($M['attach'] ?? array())),
            'cust' => $k ? (string)$k['name'] : '', 'cust_src' => $k ? (string)$k['src'] : '',
            'n' => $n, 'mobile' => $mob($n), 'body' => mb_substr((string)($it['body'] ?? ''), 0, 1500), 'at' => (string)($it['at'] ?? ''),
            'done' => !empty($it['handled']), 'done_by' => (string)($it['handled_by'] ?? ''),
            'notes' => comms_notes_out((array)($it['notes'] ?? array())), 'note_id' => (string)($it['id'] ?? ''));
    }
    return array('texts' => array_slice($texts, 0, $limit), 'vms' => $vout, 'webs' => $wout, 'mails' => $mout, 'open_texts' => $openTexts, 'open_vms' => $openVms,
        'open_webs' => $openWebs, 'open_mails' => $openMails,
        'open' => count($openNums), 'total_texts' => count($texts), 'total_vms' => count($vms), 'total_webs' => count($webs), 'total_mails' => count($mails));
}

/* Tonight's catch-up (and any voicemail whose Slack line went out without its recording): the recording goes into
   that line's own thread in #365-job-tracker, so the old posts play too. Up to $limit a run, once each. The lead
   reminders do not count the app's own thread replies as an answer (pcm-leadchase-lib lc_answered). */
function comms_vm_slack_backfill($limit = 8, $now = null) {
    $now = $now === null ? time() : (int)$now;
    list($ok, $items) = comms_locked(function ($d) { return array('__result' => $d['items']); });
    if (!$ok) return array('error' => 'busy');
    $todo = array();
    foreach ((array)$items as $it) {
        if (($it['type'] ?? '') !== 'voicemail' || (string)($it['audio'] ?? '') === '' || isset($it['slack_audio'])) continue;
        $st = strtotime((string)($it['stored_at'] ?? ''));
        if ($st === false || $now - $st > 10 * 86400) continue;
        $todo[] = $it;
    }
    if (!$todo) return array('posted' => 0);
    if (!function_exists('slk_upload_file')) @include_once __DIR__ . '/pcm-slack-lib.php';
    if (!function_exists('slk_call_form')) return array('error' => 'no Slack library');
    $r = slk_call_form('conversations.history', array('channel' => COMMS_SLACK_CHANNEL, 'oldest' => (string)($now - 11 * 86400), 'limit' => 200), 10);
    if (empty($r['ok'])) return array('error' => (string)($r['error'] ?? 'unknown'));
    $posts = (array)($r['messages'] ?? array());
    usort($todo, function ($a, $b) { return strcmp((string)$a['stored_at'], (string)$b['stored_at']); });
    $used = array(); $marks = array(); $posted = 0; $err = '';
    foreach ($todo as $it) {
        if ($posted >= $limit) break;
        $st = strtotime((string)$it['stored_at']); $best = null; $gap = 301;
        foreach ($posts as $p) {
            $ts = (string)($p['ts'] ?? ''); $t = (string)($p['text'] ?? '');
            if ($ts === '' || isset($used[$ts]) || strpos($t, 'Voicemail from') === false || strpos($t, (string)$it['number']) === false) continue;
            $g = abs((float)$ts - $st);
            if ($g < $gap) { $gap = $g; $best = $p; }
        }
        if (!$best) { $marks[$it['id']] = array('slack_audio' => -1); continue; }   // no line to attach to: leave it
        $used[(string)$best['ts']] = 1;
        if (!empty($best['files'])) { $marks[$it['id']] = array('slack_audio' => 1, 'slack_ts' => (string)$best['ts']); continue; }   // already a recording
        $path = __DIR__ . '/' . $it['audio'];
        if (!is_file($path)) { $marks[$it['id']] = array('slack_audio' => -1); continue; }
        if (substr($path, -3) === 'wav') comms_wav_fix_file($path);
        $who = (($it['match']['status'] ?? '') === 'MATCH' ? $it['match']['name'] . ' (' . $it['number'] . ')' : $it['number']);
        $up = slk_upload_file(COMMS_SLACK_CHANNEL, (string)@file_get_contents($path), 'voicemail-' . preg_replace('/[^0-9]/', '', $it['number']) . '.' . pathinfo($path, PATHINFO_EXTENSION),
            'Voicemail from ' . $who, "\xE2\x96\xB6 The recording" . ((string)($it['duration'] ?? '') !== '' ? ' (' . $it['duration'] . ')' : ''), (string)$best['ts']);
        if (!empty($up['ok'])) { $marks[$it['id']] = array('slack_audio' => 1, 'slack_ts' => (string)$best['ts']); $posted++; }
        else { $err = (string)($up['error'] ?? 'unknown'); break; }   // a missing permission will not fix itself this run
    }
    if ($marks) comms_locked(function ($d) use ($marks) {
        foreach ($d['items'] as $i => $x) if (isset($marks[$x['id']])) foreach ($marks[$x['id']] as $k => $v) $d['items'][$i][$k] = $v;
        return array('__data' => $d, '__result' => true);
    });
    return array('posted' => $posted, 'checked' => count($marks)) + ($err !== '' ? array('error' => $err) : array());
}

/* ---- 1 Oct 2026 (late): each text and voicemail shared between Slack and the portal ----
   Owner: "comment on them in the portal and it will appear in the same post in Slack ... then we've got history of it
   in Slack and we've got it in the portal as well." Each item learns its #365-job-tracker post (slack_ts: same kind,
   same number, posted within 5 minutes of when the item was stored). A note typed in the portal goes into that post's
   thread; replies typed in the thread come back as notes; Done in the portal puts a tick on the post; a tick on the
   post marks it done in the portal. Notes: item['notes'] = [{by, src: portal|slack, at, text, ts}]. */
define('COMMS_BOT_USER', 'U0BJCHP9G3W');   // the 365 techies app's own Slack user (its replies are recordings or portal notes)
function comms_is_phoneish($s) { return (bool)preg_match('/^[\s+()\-.\d]{6,}$/', trim((string)$s)); }
function comms_slack_people() { return array('UBQSJND44' => 'Steve', 'UBQ7UE0G4' => 'David'); }   // fallback when Slack will not say
function comms_staff_name($email) {   // steve@365techies.co.uk -> Steve; info@ (David's Slack account) -> David
    $l = strtolower((string)strstr((string)$email . '@', '@', true));
    if ($l === '' ) return 'Staff';
    if ($l === 'info') return 'David';
    return ucfirst(preg_replace('/[^a-z].*$/', '', $l)) ?: 'Staff';
}
function comms_slack_lib() {
    if (!function_exists('slk_call_form')) @include_once __DIR__ . '/pcm-slack-lib.php';
    return function_exists('slk_call_form') && function_exists('slk_call');
}
/* Who wrote a Slack reply: users.info (cached), else the team list, else "Slack". */
function comms_slack_name($uid, &$cache) {
    $uid = (string)$uid;
    if ($uid === '') return 'Slack';
    if (isset($cache[$uid])) return $cache[$uid];
    $people = comms_slack_people(); $nm = '';
    $r = slk_call_form('users.info', array('user' => $uid), 5);
    if (!empty($r['ok']) && !empty($r['user'])) {
        $pr = $r['user']['profile'] ?? array();
        $nm = trim((string)($pr['display_name'] ?? '')) ?: trim((string)($pr['real_name'] ?? '')) ?: trim((string)($r['user']['real_name'] ?? ''));
        if (strtolower($nm) === 'info') $nm = '';
    }
    if ($nm === '' && isset($people[$uid])) $nm = $people[$uid];
    return $cache[$uid] = ($nm !== '' ? mb_substr($nm, 0, 40) : 'Slack');
}
/* Which post is this item's: "Text from" / "Voicemail from" + the number (or "unknown caller"), nearest in time. */
function comms_post_kind($text) {
    $t = (string)$text;
    if (strpos($t, 'Voicemail from ') !== false) return 'voicemail';
    if (strpos($t, 'Text from ') !== false) return 'sms_in';
    if (strpos($t, 'Email from ') !== false) return 'email';   // 2 Oct 2026
    return '';
}
function comms_slack_sync($maxReplies = 12, $now = null) {
    $now = $now === null ? time() : (int)$now;
    if (!comms_slack_lib()) return array('error' => 'no Slack library');
    $posts = array(); $cursor = ''; $leads = array();
    for ($pg = 0; $pg < 2; $pg++) {
        $args = array('channel' => COMMS_SLACK_CHANNEL, 'oldest' => (string)($now - 8 * 86400), 'limit' => 200);
        if ($cursor !== '') $args['cursor'] = $cursor;
        $r = slk_call_form('conversations.history', $args, 10);
        if (empty($r['ok'])) return array('error' => (string)($r['error'] ?? 'unknown'));
        foreach ((array)($r['messages'] ?? array()) as $m) {
            if (comms_post_kind($m['text'] ?? '') !== '') $posts[(string)$m['ts']] = $m;
            elseif (($L = comms_lead_from_post($m)) !== null) { $posts[(string)$m['ts']] = $m; $leads[] = array($L, $m); }   // 2 Oct 2026: website enquiries etc.
        }
        $cursor = (string)($r['response_metadata']['next_cursor'] ?? '');
        if ($cursor === '' || empty($r['has_more'])) break;
    }
    // 2 Oct 2026: each lead post not yet in the inbox comes in now, linked to its post (comms_add_item dedupes on ext_id)
    $imported = 0;
    if ($leads) {
        list($okI, $have) = comms_locked(function ($d) { $x = array(); foreach ($d['items'] as $it) if (($it['type'] ?? '') === 'web') $x[(string)$it['ext_id']] = 1; return array('__result' => $x); });
        usort($leads, function ($a, $b) { return strcmp($a[0]['ts'], $b[0]['ts']); });   // oldest first, like every other import
        foreach ($okI ? $leads : array() as $pair) {
            if (isset($have['slack-' . $pair[0]['ts']])) continue;
            list($okA, $res) = comms_add_item(comms_lead_item($pair[0], $pair[1], $now));
            if ($okA && empty($res['duplicate'])) $imported++;
        }
    }
    list($ok, $snap) = comms_locked(function ($d) { return array('__result' => array('items' => $d['items'], 'users' => $d['checkpoints']['slack_users'] ?? array())); });
    if (!$ok) return array('error' => 'busy');
    $users = is_array($snap['users']) ? $snap['users'] : array();
    $used = array(); $set = array(); $fetch = array();
    foreach ((array)$snap['items'] as $it) if (!empty($it['slack_ts'])) $used[(string)$it['slack_ts']] = 1;
    foreach ((array)$snap['items'] as $it) {
        $type = (string)($it['type'] ?? '');
        if ($type !== 'sms_in' && $type !== 'voicemail' && $type !== 'web' && $type !== 'email') continue;   // web: linked when it came in
        $ts = (string)($it['slack_ts'] ?? '');
        if ($ts === '') {   // learn the post
            $st = strtotime((string)($it['stored_at'] ?? ''));
            if ($st === false || $now - $st > 8 * 86400) continue;
            $num = $type === 'email' ? (string)($it['mail']['from'] ?? '') : (string)($it['number'] ?? ''); $best = ''; $gap = 301;
            if ($num === '') continue;
            foreach ($posts as $pts => $p) {
                if (isset($used[$pts]) || comms_post_kind($p['text'] ?? '') !== $type) continue;
                $t = (string)($p['text'] ?? '');
                if (strpos($t, $num) === false && !($num === 'unknown' && strpos($t, 'unknown caller') !== false)) continue;
                $g = abs((float)$pts - $st);
                if ($g < $gap) { $gap = $g; $best = $pts; }
            }
            if ($best === '') continue;
            $used[$best] = 1; $ts = $best; $set[$it['id']]['slack_ts'] = $ts;
        }
        if (!isset($posts[$ts])) continue;
        $p = $posts[$ts];
        // a tick on the post (by a person) = done here too
        if (empty($it['handled'])) foreach ((array)($p['reactions'] ?? array()) as $rx) {
            if (!in_array((string)($rx['name'] ?? ''), array('white_check_mark', 'heavy_check_mark', 'ballot_box_with_check'), true)) continue;
            $by = array_diff((array)($rx['users'] ?? array()), array(COMMS_BOT_USER));
            if ($by) { $set[$it['id']]['handled'] = true; $set[$it['id']]['handled_by'] = 'Slack (' . comms_slack_name(reset($by), $users) . ')'; $set[$it['id']]['handled_at'] = gmdate('c', $now); break; }
        }
        $rc = (int)($p['reply_count'] ?? 0);
        if ($rc > (int)($it['slack_rc'] ?? 0) && count($fetch) < $maxReplies) $fetch[$it['id']] = array($ts, $rc, $it['notes'] ?? array());
    }
    $added = 0;
    foreach ($fetch as $id => $f) {
        list($ts, $rc, $have) = $f;
        $r = slk_call_form('conversations.replies', array('channel' => COMMS_SLACK_CHANNEL, 'ts' => $ts, 'limit' => 50), 10);
        if (empty($r['ok'])) continue;
        $seen = array(); foreach ((array)$have as $nt) if (!empty($nt['ts'])) $seen[(string)$nt['ts']] = 1;
        $notes = (array)$have;
        foreach ((array)($r['messages'] ?? array()) as $m) {
            $mts = (string)($m['ts'] ?? '');
            if ($mts === '' || $mts === $ts || isset($seen[$mts])) continue;
            if ((string)($m['user'] ?? '') === COMMS_BOT_USER || !empty($m['bot_id'])) continue;   // the app's own: recordings, portal notes
            $txt = function_exists('slk_plain') ? slk_plain((string)($m['text'] ?? '')) : (string)($m['text'] ?? '');
            if ($txt === '' && !empty($m['files'])) $txt = '(a file)';
            if ($txt === '') continue;
            $notes[] = array('by' => comms_slack_name((string)($m['user'] ?? ''), $users), 'src' => 'slack', 'at' => gmdate('c', (int)(float)$mts), 'text' => mb_substr($txt, 0, 1000), 'ts' => $mts);
            $added++;
        }
        $set[$id]['notes'] = array_slice($notes, -30);
        $set[$id]['slack_rc'] = $rc;
    }
    if ($set || $users !== ($snap['users'] ?? array())) comms_locked(function ($d) use ($set, $users) {
        foreach ($d['items'] as $i => $x) if (isset($set[$x['id']])) foreach ($set[$x['id']] as $k => $v) $d['items'][$i][$k] = $v;
        $d['checkpoints']['slack_users'] = $users;
        return array('__data' => $d, '__result' => true);
    });
    return array('linked' => count(array_filter($set, function ($v) { return isset($v['slack_ts']); })), 'notes' => $added,
        'ticked' => count(array_filter($set, function ($v) { return !empty($v['handled']); })), 'enquiries' => $imported);
}
/* A note from the portal: into the item's Slack thread (a new post if it never had one) and onto the item. */
function comms_add_note($id, $text, $by, $now = null) {
    $now = $now === null ? time() : (int)$now;
    $text = trim(preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', (string)$text));
    if ($text === '') return array('ok' => false, 'error' => 'Type the note first.');
    $text = mb_substr($text, 0, 1000);
    $find = function () use ($id) { list($ok, $it) = comms_locked(function ($d) use ($id) { foreach ($d['items'] as $x) if ($x['id'] === $id) return array('__result' => $x); return array('__result' => null); }); return $ok ? $it : null; };
    $it = $find();
    if (!$it) return array('ok' => false, 'error' => 'That message has gone - reload.');
    if (!comms_slack_lib()) return array('ok' => false, 'error' => 'Slack is not set up on the server.');
    if (empty($it['slack_ts'])) { comms_slack_sync(0, $now); $it = $find(); }
    $esc = function ($s) { return str_replace(array('&', '<', '>'), array('&amp;', '&lt;', '&gt;'), (string)$s); };
    $who = (($it['match']['status'] ?? '') === 'MATCH' ? $it['match']['name'] . ' (' . $it['number'] . ')' : (string)$it['number']);
    if (($it['type'] ?? '') === 'email') $who = trim((string)($it['mail']['name'] ?? '') . ' <' . (string)($it['mail']['from'] ?? '') . '>');
    $body = "\xF0\x9F\x93\x9D *" . $esc($by) . "* (portal): " . $esc($text);
    $args = array('channel' => COMMS_SLACK_CHANNEL, 'text' => $body, 'unfurl_links' => false);
    $newPost = empty($it['slack_ts']);
    if ($newPost) $args['text'] = "\xF0\x9F\x93\x9D Note on the " . ($it['type'] === 'voicemail' ? 'voicemail' : ($it['type'] === 'email' ? 'email' : 'text')) . ' from ' . $esc($who) . ' - *' . $esc($by) . '*: ' . $esc($text);
    else $args['thread_ts'] = (string)$it['slack_ts'];
    $r = slk_call('chat.postMessage', $args, 8);
    $ts = !empty($r['ok']) ? (string)($r['ts'] ?? '') : '';
    $note = array('by' => (string)$by, 'src' => 'portal', 'at' => gmdate('c', $now), 'text' => $text, 'ts' => $ts);
    comms_locked(function ($d) use ($id, $note, $newPost, $ts) {
        foreach ($d['items'] as $i => $x) if ($x['id'] === $id) {
            $n = isset($x['notes']) && is_array($x['notes']) ? $x['notes'] : array();
            $n[] = $note; $d['items'][$i]['notes'] = array_slice($n, -30);
            if ($newPost && $ts !== '') { $d['items'][$i]['slack_ts'] = $ts; $d['items'][$i]['slack_rc'] = 0; }
        }
        return array('__data' => $d, '__result' => true);
    });
    return array('ok' => true, 'slack' => $ts !== '', 'error' => $ts !== '' ? '' : 'Saved here, but Slack did not take it (' . (string)($r['error'] ?? 'no answer') . ').');
}
/* ---- 2 Oct 2026: website enquiries (and every other lead) in the same inbox ----
   Owner: "with inquiries that come in from the web page will they turn up in there as well? ... could it all be like a
   sort of inbox for everything, all communications that come in from everywhere, just turns up in there." They did not:
   a website enquiry went to HubSpot and to #365-job-tracker and was stored nowhere the portal reads. Every kind of lead
   already posts to that channel - the lead reminders' list (pcm-leadchase-lib lc_lead): the contact forms, the Dell
   picker and the Virgin GBP 60 ring-me-back (slack-lead.php), the no-JS fallback (form-relay.php), AI enquiries
   (ai-lead.php), PC Manager's "please ring" (pcm-mailmove-lib.php) and unfinished bookings (pcm-bkpend-lib.php) - and
   comms_slack_sync reads that channel every sweep. So the sweep takes each lead post in as an item of type 'web',
   linked to its post from the start: notes, thread replies and ticks then work exactly as they do for texts and
   voicemails. A post already answered in Slack (any reaction, or a reply from a person - lc_answered) arrives done.
   item['lead'] = {kind: web|callback, label, name, email, phone, company, topic, page}; body = what they wrote. */
require_once __DIR__ . '/pcm-leadchase-lib.php';   // lc_lead(), lc_all_text(), lc_answered()
require_once __DIR__ . '/comms-mail-lib.php';       // 2 Oct 2026: emails from the company mailboxes (comms_mail_poll)

function comms_lead_unwrap($s) {   // Slack's own wrapping and escaping, off
    $s = (string)$s;
    $s = preg_replace('/<mailto:([^|>]+)\|[^>]*>/i', '$1', $s);
    $s = preg_replace('/<mailto:([^>]+)>/i', '$1', $s);
    $s = preg_replace('/<tel:([^|>]+)\|[^>]*>/i', '$1', $s);
    $s = preg_replace('/<tel:([^>]+)>/i', '$1', $s);
    $s = preg_replace('/<(https?:[^|>]+)\|([^>]*)>/i', '$2', $s);
    $s = preg_replace('/<(https?:[^>|]+)>/i', '$1', $s);
    return str_replace(array('&lt;', '&gt;', '&amp;'), array('<', '>', '&'), $s);
}
/* A box: "*Label:*" with the answer on the next line (the Block Kit cards), or "Label: answer" on one line (the no-JS
   fallback and the Virgin card's plain lines). First label that has an answer wins. */
function comms_lead_field($all, $labels) {
    foreach ((array)$labels as $lb) {
        $q = preg_quote($lb, '/');
        if (preg_match('/\*' . $q . ':\*[ \t]*\n[ \t]*([^\n]+)/i', $all, $m) && trim(str_replace('*', '', $m[1])) !== '') return trim(str_replace('*', '', $m[1]));
        if (preg_match('/^[ \t>]*' . $q . ':[ \t]*([^\n]+)$/mi', $all, $m) && trim(str_replace('*', '', $m[1])) !== '') return trim(str_replace('*', '', $m[1]));
    }
    return '';
}
function comms_lead_quote($all, $label) {   // "*Message:*" then ">line" lines -> the lines
    if (!preg_match('/\*' . preg_quote($label, '/') . ':\*[ \t]*\n((?:[ \t]*>[^\n]*(?:\n|$))+)/i', $all, $m)) return '';
    return trim(preg_replace('/^[ \t]*>[ \t]?/m', '', $m[1]));
}
/* One #365-job-tracker message -> the lead's details, or null when it is not a web enquiry or call-back request. */
function comms_lead_from_post($m) {
    $lead = lc_lead($m);
    if (!$lead || ($lead['kind'] !== 'web' && $lead['kind'] !== 'callback') || empty($m['ts'])) return null;
    $all = comms_lead_unwrap(lc_all_text($m));
    $name = comms_lead_field($all, array('Name'));
    $email = comms_lead_field($all, array('Email'));
    $phone = comms_lead_field($all, array('Phone', 'Contact number'));
    $company = comms_lead_field($all, array('Company'));
    $topic = comms_lead_field($all, array('Needs help with', 'Topic', 'Category'));
    $body = comms_lead_quote($all, 'Message');
    if ($body === '') $body = comms_lead_quote($all, 'Problem');
    if ($body === '') $body = comms_lead_field($all, array('Message'));
    $page = preg_match('#\bvia (/[^\s\x{00B7}]*)#u', $all, $pm) ? $pm[1] : comms_lead_field($all, array('Page'));
    if (preg_match('~^https?://[^/]+(/[^\s?#]*)~i', $page, $pu)) $page = $pu[1];
    if ($lead['label'] === 'Unfinished booking') {
        // ":telephone_receiver: *Booking started but never finished* - Joan Baker on *07700 900123*\n> joan@x.com - wanted: ... - slot: ..."
        if (preg_match('/never finished\*?\s*-\s*([^\n]+)/', $all, $bm)) {
            $rest = trim(str_replace('*', '', $bm[1]));
            if (preg_match('/^(.*?)\s+on\s+([+0-9][0-9 ()+\-]{6,})$/', $rest, $x)) { $name = trim($x[1]); $phone = trim($x[2]); }
            else $name = trim(preg_replace('/\s*\(no phone given\)\s*$/', '', $rest));
        }
        if (preg_match('/\n>\s*([^\n]+)/', $all, $em)) {
            $l2 = trim($em[1]);
            if (preg_match('/^(\S+@\S+?)(?=\s+-\s|$)/', $l2, $ee)) $email = $ee[1];
            if (preg_match('/wanted:\s*(.+?)(?=\s+-\s+slot:|$)/', $l2, $ww)) $topic = 'Wanted: ' . trim($ww[1]);
            if (preg_match('/slot:\s*(.+)$/', $l2, $ss)) $body = 'Picked a slot: ' . trim($ss[1]) . '. Sent a code and never came back to finish.';
        }
        if ($body === '') $body = 'Started a booking and never finished it.';
        if (strpos($name, '@') !== false) { if ($email === '') $email = $name; $name = ''; }
    } elseif ($lead['label'] === 'Email move call-back') {
        $topic = 'Virgin email move - pressed "Stuck? We\'ll do it for you" in PC Manager';
        $bits = array();
        foreach (array('Virgin address', 'Mailbox', 'Got as far as') as $lb) { $x = comms_lead_field($all, array($lb)); if ($x !== '') $bits[] = $lb . ': ' . $x; }
        $body = $bits ? implode("\n", $bits) : 'Asked us to ring them about moving their Virgin email.';
    } elseif ($lead['label'] === 'Get Help button') {
        // the 365 Get Help add-on (pcm-gethelp-lib.php gh_card): the page they were on is another site's, so it goes in
        // the message as text - never the "via" page, which is one of ours
        $topic = 'Get Help button in their browser' . ($topic !== '' ? ' - ' . $topic : '');
        $on = trim(str_replace('`', '', comms_lead_field($all, array('Page they were on'))));
        if ($body === '') $body = 'Asked us to ring them back.';
        if ($on !== '') $body .= "\nThey were on: " . $on;
        $page = '';
    }
    $email = preg_match('/[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/', $email, $mm) ? strtolower($mm[0]) : '';
    $num = tm_number($phone);
    if ($num === '') $num = (string)$lead['number'];
    $cut = function ($s, $n) { return function_exists('mb_substr') ? mb_substr(trim((string)$s), 0, $n) : substr(trim((string)$s), 0, $n); };
    if ($name === '' && $lead['who'] !== 'no name given' && $lead['kind'] === 'web' && strpos($lead['who'], '@') === false) $name = $lead['who'];
    return array('kind' => $lead['kind'], 'label' => $lead['label'], 'name' => $cut($name, 90), 'email' => $cut($email, 160), 'phone' => $cut($phone, 40),
        'number' => $num, 'company' => $cut($company, 120), 'topic' => $cut($topic, 160), 'body' => $cut($body, 2500), 'page' => $cut($page, 200), 'ts' => (string)$m['ts']);
}
/* The inbox item for a lead post. */
function comms_lead_item($L, $m, $now = null) {
    $now = $now === null ? time() : (int)$now;
    $answered = lc_answered($m, array('kind' => $L['kind'], 'number' => $L['number']), null);
    $match = $L['number'] !== '' ? comms_match_customer($L['number']) : array('status' => 'NOT_CHECKED', 'name' => '', 'cid' => '', 'why' => 'no phone number given');
    return array('type' => 'web', 'ext_id' => 'slack-' . $L['ts'], 'at' => gmdate('c', (int)(float)$L['ts']), 'number' => $L['number'],
        'body' => $L['body'], 'audio' => '', 'duration' => '', 'match' => $match,
        'handled' => $answered, 'handled_by' => $answered ? 'Slack' : '', 'handled_at' => $answered ? gmdate('c', $now) : '',
        'slack_ts' => $L['ts'], 'slack_rc' => 0,
        'lead' => array('kind' => $L['kind'], 'label' => $L['label'], 'name' => $L['name'], 'email' => $L['email'], 'phone' => $L['phone'],
                        'company' => $L['company'], 'topic' => $L['topic'], 'page' => $L['page']));
}

/* ---- 2 Oct 2026: a name from the job list ----
   A customer written up with "New job in" (Slack or the portal's New customer) is a person we know: their texts and
   voicemails should carry the name. Number -> {name, src: job} from pcm-jobs.json (phone and mobile), the newest job
   winning. A name staff typed outranks the Textmagic address book; our customer records outrank both (comms_name_for). */
function comms_job_names($file = null) {
    $f = $file !== null ? $file : __DIR__ . '/pcm-jobs.json';
    $d = @json_decode((string)@file_get_contents($f), true);
    $jobs = (isset($d['jobs']) && is_array($d['jobs'])) ? $d['jobs'] : array();
    usort($jobs, function ($a, $b) { return (int)(is_array($a) && isset($a['ts']) ? $a['ts'] : 0) - (int)(is_array($b) && isset($b['ts']) ? $b['ts'] : 0); });
    $out = array();
    foreach ($jobs as $j) {
        if (!is_array($j)) continue;
        $nm = trim((string)(isset($j['name']) ? $j['name'] : ''));
        if ($nm === '' || comms_is_phoneish($nm)) continue;
        foreach (array('phone', 'mobile') as $k) {
            $n = tm_number((string)(isset($j[$k]) ? $j[$k] : ''));
            if ($n !== '') $out[$n] = array('name' => function_exists('mb_substr') ? mb_substr($nm, 0, 60) : substr($nm, 0, 60), 'src' => 'job');
        }
    }
    return $out;
}
function comms_names_with_jobs($names, $jobNames) {
    $names = is_array($names) ? $names : array();
    foreach ((array)$jobNames as $n => $v) {
        if (isset($names[$n]['src']) && $names[$n]['src'] === 'customer' && (string)($names[$n]['name'] ?? '') !== '') continue;
        $names[$n] = $v;
    }
    return $names;
}

/* Done in the portal -> a tick on the Slack post (best effort: needs the reactions:write permission). */
function comms_slack_tick($ts) {
    if ((string)$ts === '' || !comms_slack_lib()) return false;
    $r = slk_call_form('reactions.add', array('channel' => COMMS_SLACK_CHANNEL, 'timestamp' => (string)$ts, 'name' => 'white_check_mark'), 5);
    return !empty($r['ok']) || (($r['error'] ?? '') === 'already_reacted');
}
// 3 Oct 2026: Undo in the portal takes OUR tick back off the post. reactions.remove only ever removes the caller's own
// reaction, so a tick a person added stays (and the sweep still reads a person's tick as done).
function comms_slack_untick($ts) {
    if ((string)$ts === '' || !comms_slack_lib()) return false;
    $r = slk_call_form('reactions.remove', array('channel' => COMMS_SLACK_CHANNEL, 'timestamp' => (string)$ts, 'name' => 'white_check_mark'), 5);
    return !empty($r['ok']) || (($r['error'] ?? '') === 'no_reaction');
}

function comms_sweep() {
    $out = array();
    $out['sms'] = comms_sms_poll();
    $out['vm'] = comms_vm_poll();
    $out['mail'] = comms_mail_poll();   // 2 Oct 2026: emails from people, from mail-imap.php's mailboxes
    // 1 Oct 2026: recordings the first poller missed (it looked one level into the email only)
    $out['vm_audio'] = comms_vm_refetch(15);
    // 1 Oct 2026 (late): names from our records / Textmagic, and recordings under tonight's Slack lines
    $out['names'] = comms_names_refresh(10);
    $out['vm_slack'] = comms_vm_slack_backfill(8);
    $out['slack'] = comms_slack_sync(12);   // posts <-> items, thread replies -> notes, ticks -> done
    return $out;
}
