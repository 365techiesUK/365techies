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
            $bodyText = '';
            $struct = @imap_fetchstructure($im, $msgno);
            $audioFile = ''; $duration = '';
            if ($struct && isset($struct->parts) && is_array($struct->parts)) {
                foreach ($struct->parts as $pi => $part) {
                    $sec = (string)($pi + 1);
                    $isAudio = (isset($part->subtype) && preg_match('/^(MPEG|MP3|WAV|X-WAV|OGG)$/i', $part->subtype))
                        || (isset($part->dparameters) && is_array($part->dparameters) && array_filter($part->dparameters,
                            function ($p) { return isset($p->value) && preg_match('/\.(mp3|wav)$/i', $p->value); }));
                    if ($isAudio && $audioFile === '') {
                        $raw = (string)@imap_fetchbody($im, $msgno, $sec);
                        $enc = isset($part->encoding) ? (int)$part->encoding : 0;
                        if ($enc === 3) $raw = base64_decode($raw);
                        elseif ($enc === 4) $raw = quoted_printable_decode($raw);
                        $ext = (isset($part->subtype) && preg_match('/wav/i', $part->subtype)) ? 'wav' : 'mp3';
                        if (strlen($raw) > 200) {
                            $name = 'vm-audio-VM' . $uid . '.' . $ext;
                            if (@file_put_contents(__DIR__ . '/' . $name, $raw, LOCK_EX) !== false) $audioFile = $name;
                        }
                    } elseif (isset($part->subtype) && strtoupper($part->subtype) === 'PLAIN' && $bodyText === '') {
                        $raw = (string)@imap_fetchbody($im, $msgno, $sec);
                        $enc = isset($part->encoding) ? (int)$part->encoding : 0;
                        if ($enc === 3) $raw = base64_decode($raw);
                        elseif ($enc === 4) $raw = quoted_printable_decode($raw);
                        $bodyText = $raw;
                    }
                }
            } else {
                $bodyText = (string)@imap_body($im, $msgno);
            }
            if ($caller === '' && preg_match('/(\+?44\d{9,10}|0\d{9,10})/', preg_replace('/[\s\-()]/', '', $bodyText), $m2)) $caller = $m2[1];
            if (preg_match('/duration[^0-9]{0,5}([0-9]{1,2}:[0-9]{2}|\d{1,3}\s*sec)/i', $bodyText, $m3)) $duration = $m3[1];

            $e164 = tm_number($caller);
            $match = comms_match_customer($e164);
            list($ok, $res) = comms_add_item(array(
                'type' => 'voicemail', 'ext_id' => 'vm-' . $validity . '-' . $uid, 'at' => $when,
                'number' => $e164 !== '' ? $e164 : ($caller !== '' ? $caller : 'unknown'),
                'body' => 'Voicemail' . ($subject !== '' ? ' - ' . mb_substr($subject, 0, 120) : ''),
                'audio' => $audioFile, 'duration' => $duration,
                'match' => $match, 'handled' => false, 'handled_by' => '', 'handled_at' => '',
            ));
            if ($uid > $maxUid) $maxUid = $uid;
            if ($ok && empty($res['duplicate'])) {
                $new++;
                $who = $match['status'] === 'MATCH' ? $match['name'] . ' (' . $e164 . ')' : ($e164 !== '' ? $e164 : 'unknown caller');
                comms_slack("\xF0\x9F\x93\x9E Voicemail from " . $who . ($duration !== '' ? ' (' . $duration . ')' : '')
                    . "\nListen + call back from the portal comms inbox (/api/comms.php).");
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

/* Staff reply: send the SMS through the guarded tm_send and thread the copy. */
function comms_send_sms($to, $text, $actor) {
    $e164 = tm_number($to);
    $r = tm_send($e164, $text, 'comms:' . $actor);
    if (!empty($r['ok'])) {
        comms_add_item(array(
            'type' => 'sms_out', 'ext_id' => 'out-' . (isset($r['id']) ? $r['id'] : uniqid()), 'at' => gmdate('c'),
            'number' => $e164, 'body' => (string)$text, 'audio' => '', 'duration' => '',
            'match' => comms_match_customer($e164),
            'handled' => true, 'handled_by' => $actor, 'handled_at' => gmdate('c'),
        ));
    }
    return $r;
}

/* The cron entry point - each poller isolated so one failure never stops the other. */
function comms_sweep() {
    $out = array();
    $out['sms'] = comms_sms_poll();
    $out['vm'] = comms_vm_poll();
    return $out;
}
